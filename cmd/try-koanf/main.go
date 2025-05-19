package main

import (
	"fmt"
	"errors"
	"log"
	"os"

	"github.com/knadh/koanf/parsers/json"
	"github.com/knadh/koanf/providers/file"
	"github.com/knadh/koanf/v2"
)

var k = koanf.New(".")

const configFileName = "ttt.json"

func main() {
	if _, err := os.Stat(configFileName); errors.Is(err, os.ErrNotExist) {
		os.WriteFile(configFileName, []byte("{}"), 0o666)
	}
	if err := k.Load(file.Provider(configFileName), json.Parser()); err != nil {
		log.Fatalf("error loading config: %v", err)
	}
	k.Set("a.b", 123)
	fmt.Println(k.Int("a.b"))
}
