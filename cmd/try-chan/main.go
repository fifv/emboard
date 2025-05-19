package main

import (
	"fmt"
	"time"
)

func main() {
	doit := make(chan bool)

	go func() {
		count := 0
		for {
			<-doit
			count++
			fmt.Println("yes", count)
		}
	}()
	go func() {
		count := 0
		for {
			<-doit
			count++
			fmt.Println("yes2", count)
		}
	}()
	doit <- true
	time.Sleep(time.Millisecond * 500)
	doit <- true
	doit <- true
	doit <- true
	doit <- true
	doit <- true
	time.Sleep(time.Millisecond * 500)
	// done <- true
}
