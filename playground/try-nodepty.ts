const WebSocket = require('ws')
const pty = require('node-pty')

const wss = new WebSocket.Server({ port: 8080 })

wss.on('connection', (ws) => {
    // Spawn a shell process
    const shell = pty.spawn('bash', [], {
        name: 'xterm-256color',
        cols: 80,
        rows: 24,
        cwd: process.env.HOME,
        env: process.env
    })

    // Handle data from shell
    shell.on('data', (data) => {
        console.log("[out]", JSON.stringify(data))
        ws.send(JSON.stringify({
            event: "sh-out",
            data: data,
        })) // Send raw data to xterm.js
    })

    // Handle data from xterm.js
    ws.on('message', (message) => {
        const req = JSON.parse(message)
        console.log("[in]", req)
        if (req.event === 'sh-in') {
            shell.write(req.data) // Write raw input from xterm.js to shell
        }
    })

    ws.on('close', () => {
        shell.kill() // Cleanup on connection close
    })
})
