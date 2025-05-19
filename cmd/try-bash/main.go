package main

import (
	// "bufio"
	// "bytes"
	"bufio"
	"fmt"
	"os/exec"
	// "time"
)

func main() {
	cmd := exec.Command("bash", "-i")
	stdin, err := cmd.StdinPipe()
	if err != nil {
		fmt.Println("Failed to create stdin pipe")
		return
	}
	stdout, err := cmd.StdoutPipe()
	if err != nil {
		fmt.Println("Failed to create stdout pipe")
		return
	}
	// stderr, err := cmd.StderrPipe()
	if err != nil {
		fmt.Println("Failed to create stderr pipe")
		return
	}

	if err := cmd.Start(); err != nil {
		fmt.Println("Failed to start bash process")
		return
	}


	stdin.Write([]byte("ls\n"))
	
	results := make([]string, 10)
	bufOut := bufio.NewReader(stdout)
	for i := 0; i < len(results); i++ {
        result, err := bufOut.ReadByte()
        fmt.Println(string(result))
        if err != nil {
            panic(err)
        }
        results[i] = string(result)
    }

    // See what was calculated
    for _, result := range results {
        fmt.Println(result)
    }
	// ttt := make([]byte,0)
	// stdout.Read(ttt)
	// fmt.Println(ttt)
	// stderr.Read(ttt)
	// fmt.Println(ttt)




	// // Wait for the command to finish
	// if err := cmd.Wait(); err != nil {
	// 	fmt.Println("Failed to wait for bash process:", err)
	// 	return
	// }

}