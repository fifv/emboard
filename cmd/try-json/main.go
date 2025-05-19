package main

import (
	"encoding/json"
	"fmt"
	// "unicode/utf8"
)
func main() {
	mapD := map[string]int{"apple": 5, "lettuce": 7}
    mapB, _ := json.Marshal(mapD)
	fmt.Println(string(mapB))
	
	

}