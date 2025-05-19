package main

import "fmt"

func main() {
	a := func() int {
		if 1 > 2 {
			return 2
		} else {
			return 3
		}
	}()
	fmt.Println(a)
}
