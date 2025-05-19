package main

import (
	"log"
	"net/http"
	"os/exec"
	"strconv"
	"time"

	"github.com/creack/pty"
	"github.com/gin-gonic/gin"
	"github.com/gorilla/websocket"
)

type WsMessage struct {
	Event string      `json:"event"`
	Data  interface{} `json:"data"`
}

var upgrader = websocket.Upgrader{
	CheckOrigin: func(r *http.Request) bool {
		return true // Allow all connections (in a real application, add proper checks)
	},
}

func serveWs(r *gin.Context) {
	// Upgrade the HTTP request to a WebSocket connection
	ws, err := upgrader.Upgrade(r.Writer, r.Request, nil)
	if err != nil {
		log.Printf("Error upgrading to WebSocket: %v", err)
		return
	}
	defer ws.Close()

	var cmd *exec.Cmd
	t1 := time.Now().UnixMilli()
	for _, v := range []string{"zsh", "bash", "sh"} {
		if _, err := exec.LookPath(v); err == nil {
			cmd = exec.Command(v)
			break
		}
	}
	log.Println("Look Path Takes:", time.Now().UnixMilli()-t1)
	// Spawn a terminal process (bash in this case)
	ptySh, err := pty.Start(cmd)
	if err != nil {
		log.Printf("Error starting pty: %v", err)
		ws.Close()
		return
	}
	defer ptySh.Close()

	// Handle data coming from the terminal (bash) and send it to the WebSocket
	go func() {
		buf := make([]byte, 8192)
		for {
			n, err := ptySh.Read(buf)
			if err != nil {
				log.Printf("Error reading from pty: %v", err)
				ws.Close()
				return
			}
			log.Println("Read", n, "from sh:", strconv.Quote(string(buf[:n])))
			if n > 0 {
				err := ws.WriteJSON(WsMessage{
					Event: "sh-out",
					Data:  string(buf[:n]),
				})
				// err := ws.WriteMessage(websocket.BinaryMessage, buf[:n])
				if err != nil {
					log.Printf("Error sending data to WebSocket: %v", err)
					ws.Close()
					return
				}
			}
		}
	}()

	// Handle data coming from the WebSocket and send it to the terminal
	for {
		var msg WsMessage
		err := ws.ReadJSON(&msg)
		if err != nil {
			log.Printf("Error reading from WebSocket: %v", err)
			return
		}

		// log.Println("Received From WS:", msg)
		// Write the raw message to the terminal process
		switch msg.Event {
		case "sh-in":
			{
				log.Println("Received From WS sh-in:", strconv.Quote(msg.Data.(string)))
				_, err = ptySh.Write([]byte(msg.Data.(string)))

			}
		case "sh-connect":
			{
				// err := ws.WriteJSON(WsMessage{
				// 	Event: "sh-out",
				// 	Data:  string(historyBuf),
				// })
				// if err != nil {
				// 	log.Printf("Error sending data to WebSocket: %v", err)
				// 	ws.Close()
				// 	return
				// }

			}
		case "sh-resize":
			{
				resizeInfo := msg.Data.(map[string]interface{})
				pty.Setsize(ptySh, &pty.Winsize{
					Rows: uint16(resizeInfo["rows"].(float64)),
					Cols: uint16(resizeInfo["cols"].(float64)),
					X:    uint16(resizeInfo["width"].(float64)),
					Y:    uint16(resizeInfo["height"].(float64)),
				})
			}

		}
		if err != nil {
			log.Printf("Error writing to pty: %v", err)
			return
		}
	}

}
