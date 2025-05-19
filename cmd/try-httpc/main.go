package main

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
)

func main() {
	
	sendPost()
	sendGet()
}

func sendGet() {
	resp, err := http.Get(fmt.Sprintf("%s?key=%s", "http://localhost:9999/config", "aaa.c"))
	if err != nil {
		panic(err)
	}
	
	fmt.Println("Status:", resp.Status)
	
	defer resp.Body.Close()
	body, err := io.ReadAll(resp.Body)
	if err != nil {
		panic(err)
	}
	fmt.Println("Body:", string(body))
}
func sendPost() {
	jsonBytes, _:=json.Marshal("a123sdf")
	// fmt.Println(string(jsonBytes))

	resp, err := http.Post(
		fmt.Sprintf("%s?key=%s", "http://localhost:9999/config", "aaa.c"),
		"application/json",
		bytes.NewBuffer(jsonBytes),
	)
	if err != nil {
		panic(err)
	}
	defer resp.Body.Close()

	fmt.Println("Status:", resp.Status)

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		panic(err)
	}
	fmt.Println("Body:", string(body))
}
