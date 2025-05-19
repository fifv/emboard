package main

import (
	"embed"
	"io/fs"
	"net/http"

	"github.com/gin-contrib/static"
	"github.com/gin-gonic/gin"
)

//go:embed web/dist
var buildFS embed.FS

//go:embed web/dist/index.html
var indexPage []byte

func setStaticWebRouter(router *gin.Engine) {

	// staticGroup := router.Group("/")

	// router.Use(middleware.GlobalWebRateLimit())
	// fileDownloadRoute := router.Group("/")
	// fileDownloadRoute.GET("/upload/:file", middleware.DownloadRateLimit(), controller.DownloadFile)
	router.Use(Cache(), static.Serve("/", EmbedFolder(buildFS, "web/dist")))
	// staticGroup.Use(Cache())
	// staticGroup.StaticFS("/", EmbedFolder(buildFS, "web/dist"))
	router.NoRoute(Cache(), func(c *gin.Context) {
		c.Data(http.StatusOK, "text/html; charset=utf-8", indexPage)
	})
}

type embedFileSystem struct {
	http.FileSystem
}
type ServeFileSystem interface {
	http.FileSystem
	Exists(prefix string, path string) bool
}

func EmbedFolder(fsEmbed embed.FS, targetPath string) static.ServeFileSystem {
	efs, err := fs.Sub(fsEmbed, targetPath)
	if err != nil {
		panic(err)
	}
	return embedFileSystem{
		FileSystem: http.FS(efs),
	}
}
func (e embedFileSystem) Exists(prefix string, path string) bool {
	_, err := e.Open(path)
	return err == nil
}
func Cache() func(c *gin.Context) {
	return func(c *gin.Context) {
		c.Header("Cache-Control", "max-age=604800") // one week
		c.Next()
	}
}
