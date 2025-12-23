package main

import (
	"encoding/json"
	"fmt"
	"io"

	// "io"
	// "io"
	// "net"
	"net/http"
	"os"
	"os/exec"
	"path/filepath"
	"runtime"
	"strings"
	"time"

	"github.com/gin-contrib/cors"
	// "github.com/gin-contrib/gzip"
	"github.com/gin-gonic/gin"
	"github.com/vishvananda/netlink"

	"github.com/shirou/gopsutil/cpu"
	"github.com/shirou/gopsutil/host"
	"github.com/shirou/gopsutil/mem"
	// "github.com/shirou/gopsutil/net"
)

var (
	/* build time config, can be "dev" or "prod" */
	Mode = "dev"
)

func main() {
	if Mode == "prod" {
		gin.SetMode(gin.ReleaseMode)
	}

	r := gin.Default()
	r.Use(cors.Default())
	/* GZIP is extremely slow on V853, ~2x time if via eth */
	// r.Use(gzip.Gzip(gzip.DefaultCompression))
	// r.Use(gzip.Gzip(gzip.BestSpeed))

	/**
	 * Make sure server time is correct, or cache (If-Modified) will always be hit!
	 */
	apiGroup := r.Group("/api")
	{
		apiGroup.GET("/files", listFiles)
		apiGroup.GET("/files/read", readFile)
		apiGroup.POST("/files/write", writeFile)
		apiGroup.POST("/files/create", createFile)
		apiGroup.POST("/files/delete", deleteFile)
		apiGroup.GET("/files/download", downloadFile)
		apiGroup.POST("/files/upload", uploadFile)
		apiGroup.POST("/files/rename", renameFile)

		apiGroup.GET("/ipc/config", httpGet)
		apiGroup.POST("/ipc/config", httpPost)

		apiGroup.POST("/net/ip", modifyIp)
		apiGroup.POST("/systime", setSystime) /* UTC Time */
		apiGroup.GET("/status", deviceStatus)
		apiGroup.POST("/reboot", execReboot)

		apiGroup.GET("/ping", func(c *gin.Context) {
			c.JSON(http.StatusOK, gin.H{
				"message": "pong",
			})
		})
	}

	r.GET("/ws", serveWs)

	/**
	 * Must put after /api so the Cache-Control won't affect /api
	 * Make sure server time is correct, or cache won't be hit!
	 */
	setStaticWebRouter(r)

	if Mode == "prod" {
		/**
		 * must use sudo...
		 */
		r.Run(":80")
	} else {
		r.Run() // listen and serve on 0.0.0.0:8080 (for windows "localhost:8080")
	}
}
func listFiles(c *gin.Context) {
	path := c.DefaultQuery("path", ".") // Default to the current directory if no path is provided

	absPath, err := filepath.Abs(path)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid path"})
		return
	}

	entries, err := os.ReadDir(absPath)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to read directory"})
		return
	}

	/* this makes an empty slice instead of nil */
	results := make([]gin.H, 0, 10)
	for _, entry := range entries {
		info, err := entry.Info()
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to get file info"})
			return
		}
		results = append(results, gin.H{
			"name":    entry.Name(),
			"isdir":   entry.IsDir(),
			"size":    info.Size(),
			"modtime": info.ModTime().UnixMilli(),
			"perm":    info.Mode().String(),
		})
	}

	c.JSON(http.StatusOK, gin.H{
		"path":    absPath,
		"entries": results,
	})
}

func deviceStatus(c *gin.Context) {
	// Get CPU usage
	cpuPercent, _ := cpu.Percent(0, false)

	// Get memory usage
	memStats, _ := mem.VirtualMemory()

	// Get Linux version and hostname
	linuxVersion, _ := os.ReadFile("/proc/version")
	hostname, _ := os.Hostname()

	// Get uptime and device information
	hostStats, _ := host.Info()

	// Calculate uptime in human-readable format
	uptime := time.Duration(hostStats.Uptime) * time.Second
	uptimeStr := fmt.Sprintf("%dd %dh %dm %ds", int(uptime.Hours())/24, int(uptime.Hours())%24, int(uptime.Minutes())%60, int(uptime.Seconds())%60)

	// Prepare response
	response := gin.H{
		"deviceName":      hostname,
		"linuxVersion":    strings.TrimSpace(string(linuxVersion)),
		"cpuUsagePercent": cpuPercent[0],
		"memory": gin.H{
			"total": memStats.Total,
			"used":  memStats.Used,
			"free":  memStats.Available,
			"usage": memStats.UsedPercent,
		},
		"network": getConnectedNetworkInterfaces(),
		"uptime":  uptimeStr,
		"os": gin.H{
			"name":    runtime.GOOS,
			"arch":    runtime.GOARCH,
			"version": hostStats.PlatformVersion,
		},
		"time": time.Now(),
	}

	c.JSON(http.StatusOK, response)
}

func getConnectedNetworkInterfaces() []gin.H {
	connected := make([]gin.H, 0)

	// interfaces, err := net.Interfaces()
	// if err != nil {
	// 	return connected
	// }

	// for _, iface := range interfaces {
	// 	addrs, err := iface.Addrs()
	// 	if err != nil {
	// 		return connected
	// 	}
	// 	for _, addr := range addrs {
	// 		ip, _, err := net.ParseCIDR(addr.String())
	// 		if err != nil || ip.IsLoopback() {
	// 			continue
	// 		}

	// 		// Only include IPv4 and IPv6 addresses
	// 		if ip.To4() != nil || ip.To16() != nil {
	// 			connected = append(connected, gin.H{
	// 				"interface": iface.Name,
	// 				"mac":       iface.HardwareAddr.String(),
	// 				"ip":        addr.String(),
	// 			})
	// 			break
	// 		}
	// 	}
	// }

	links, err := netlink.LinkList()
	// lo, err := netlink.LinkByName("enp0s8t")
	if err != nil {
		fmt.Println("Error:", err)
		return connected
	} else {
		for _, link := range links {
			if link.Attrs().Name == "lo" {
				continue
			}

			// fmt.Println(link.Type(), link.Attrs().Name, link.Attrs().HardwareAddr)
			addrs, err := netlink.AddrList(link, netlink.FAMILY_V4 /* |netlink.FAMILY_V6 */)
			if err != nil {
				fmt.Println(err)
			}
			ips := make([]string, 0)
			for _, addr := range addrs {
				ips = append(ips, addr.IPNet.String())
				// fmt.Println(addr.IP, addr.IPNet.String())
			}
			connected = append(connected, gin.H{
				"interface": link.Attrs().Name,
				"type":      link.Type(),
				"mac":       link.Attrs().HardwareAddr.String(),
				"ips":       ips,
			})
		}
	}

	return connected
}

func readFile(c *gin.Context) {
	path := c.Query("path")
	if path == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Path parameter is required"})
		return
	}

	content, err := os.ReadFile(filepath.Clean(path))
	if err != nil {
		if os.IsNotExist(err) {
			c.JSON(http.StatusNotFound, gin.H{"error": "File not found"})
		} else {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to read file"})
		}
		return
	}

	c.JSON(http.StatusOK, gin.H{"path": path, "content": string(content)})
}

// Write to a text file
func writeFile(c *gin.Context) {
	var req struct {
		Path    string `json:"path" binding:"required"`
		Content string `json:"content"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request body"})
		return
	}

	err := os.WriteFile(filepath.Clean(req.Path), []byte(req.Content), 0644)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to write to file"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "File written successfully"})
}

// Create a new text file
func createFile(c *gin.Context) {
	var req struct {
		Path string `json:"path" binding:"required"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request body"})
		return
	}

	// Check if file exists
	if _, err := os.Stat(req.Path); err == nil {
		c.JSON(http.StatusConflict, gin.H{"error": "File already exists"})
		return
	}

	// Create empty file
	file, err := os.Create(filepath.Clean(req.Path))
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create file"})
		return
	}
	file.Close()

	c.JSON(http.StatusCreated, gin.H{"message": "File created successfully"})
}

// Delete a text file
func deleteFile(c *gin.Context) {
	path := c.Query("path")
	if path == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Path parameter is required"})
		return
	}

	err := os.Remove(filepath.Clean(path))
	if err != nil {
		if os.IsNotExist(err) {
			c.JSON(http.StatusNotFound, gin.H{"error": "File not found"})
		} else {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to delete file"})
		}
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "File deleted successfully"})
}

func uploadFile(c *gin.Context) {
	// Single file
	file, _ := c.FormFile("file")
	path := c.Query("path")
	if path == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Path parameter is required"})
		return
	}

	os.Remove(filepath.Clean(path))

	c.SaveUploadedFile(file, path)
	os.Chmod(path, 0755)
	c.String(http.StatusOK, fmt.Sprintf("'%s' uploaded!", file.Filename))

	// Upload the file to specific dst.
}

func downloadFile(c *gin.Context) {
	path := c.Query("path")
	if path == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Path parameter is required"})
		return
	}
	c.FileAttachment(path, filepath.Base(path))
}

/* rename === mv */
func renameFile(c *gin.Context) {
	oldPath := c.Query("oldpath")
	newPath := c.Query("newpath")
	if oldPath == "" || newPath == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "`oldpath` and `newpath` parameter are required"})
		return
	}

	if err := os.Rename(oldPath, newPath); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "rename failed"})
		fmt.Println(err.Error())
		return
	}

}

func execReboot(c *gin.Context) {
	cmd := exec.Command("reboot")
	output, err := cmd.CombinedOutput()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": string(output)})
		fmt.Println(string(output))
	}
}

/**
 * /api/net/ip?link=eth0&ip=192.168.2.121/24
 *
 * set a interface's ipv4 address
 * - assume only ONE ipv4 address per interface
 * if
 *
 */
func modifyIp(c *gin.Context) {
	link := c.Query("link")
	oldIp := c.Query("oldip")
	newIp := c.Query("ip")
	if link == "" || newIp == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "link and ip parameter is required"})
		return
	}

	if oldIp != "" {
		cmd := exec.Command("ip", "addr", "del", oldIp, "dev", link)
		out, err := cmd.CombinedOutput()
		if err != nil {
			fmt.Println(string(out))
		}
		fmt.Println("oldIp", oldIp)
		// out, err := cmd.CombinedOutput()
		// if err != nil {
		// 	c.JSON(http.StatusInternalServerError, gin.H{"error": string(out)})
		// 	return
		// }
	}

	{
		cmd := exec.Command("ip", "addr", "add", newIp, "dev", link)
		out, err := cmd.CombinedOutput()
		fmt.Println(string(out))
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": string(out)})
			return
		}
	}
	fmt.Println("newIp", newIp)
	c.JSON(http.StatusOK, gin.H{"message": "Add ip address successfully"})

	// link, err := netlink.LinkByName(iface)
	// if err != nil {
	// 	c.JSON(http.StatusInternalServerError, gin.H{"error": "no such interface"})
	// 	return
	// }
	// addrs, _ := netlink.AddrList(link, netlink.FAMILY_V4)
	// for _, addr := range addrs {
	// 	if addr. {

	// 	}
	// }
	// netlink.AddrReplace(link)

}

func httpGet(c *gin.Context) {
	key := c.Query("key")
	if key == "" {
		c.JSON(400, gin.H{"error": "query key `key` is required"})
		return
	}

	resp, err := http.Get(fmt.Sprintf("%s?key=%s", "http://127.0.0.1:9999/config", key))
	if err != nil {
		c.JSON(404, gin.H{"error": "failed to send to upstream"})
		return
	}

	defer resp.Body.Close()
	body, err := io.ReadAll(resp.Body)
	if err != nil {
		c.JSON(404, gin.H{"error": "failed to read upsteam"})
		return
	}
	var value struct {
		Value interface{} `json:"value"`
	}
	err = json.Unmarshal(body, &value)
	if err != nil {
		c.JSON(404, gin.H{"error": "failed to read upsteam"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"key":   key,
		"value": value.Value,
	})

}
func httpPost(c *gin.Context) {

	key := c.Query("key")
	if key == "" {
		c.JSON(400, gin.H{"error": "query key `key` is required"})
		return
	}

	resp, err := http.Post(
		/**
		 * wtf v853有的时候nslookup localhost 要用5s????
		 */
		fmt.Sprintf("%s?key=%s", "http://127.0.0.1:9999/config", key),
		"application/json",
		c.Request.Body,
		// bytes.NewBuffer(jsonBytes),
	)
	if err != nil || resp.StatusCode != http.StatusOK {
		c.JSON(404, gin.H{"error": "failed to send to upstream"})
		return
	}
	defer resp.Body.Close()

	c.JSON(http.StatusOK, gin.H{
		"key": key,
	})

}

func setSystime(c *gin.Context) {
	timeStr := c.Query("time")
	if timeStr == "" {
		c.JSON(400, gin.H{"error": "query key `time` is required"})
		return
	}

	/**
	 * the time from client is in UTC
	 * we set the system time in UTC
	 * we also need set hwclock to UTC
	 * and set /etc/localtime to Aisa/Shanghai
	 * so the system time will be correct after reboot
	 */
	output, err := exec.Command("date", "-u", "-s", timeStr).CombinedOutput()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": string(output)})
		fmt.Println(string(output))
		return
	}

	/**
	 * RTC clock also in UTC
	 * and after reboot, linux get UTC time from RTC and set system time to UTC
	 */
	exec.Command("hwclock", "-u", "-w").Run()

	c.JSON(http.StatusOK, gin.H{"message": "Sync time successfully"})

}
