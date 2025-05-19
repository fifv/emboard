package main

import (
	// "fmt"

	"errors"
	"fmt"
	"os"

	"github.com/spf13/viper"
)

const configFileName = "ttt.json"

func main() {
	viper.AddConfigPath(".")
	viper.SetConfigName("ttt")
	viper.SetConfigType("json")
	if _, err := os.Stat(configFileName); errors.Is(err, os.ErrNotExist) {
		os.WriteFile(configFileName, []byte("{}"), 0o666)
	}
	// viper.SafeWriteConfig()
	err := viper.ReadInConfig() // Find and read the config file
	if err != nil {             // Handle errors reading the config file
		panic(fmt.Errorf("fatal error config file: %w", err))
	}
	viper.Set("a", 1)
	viper.Set("a.b", 2)
	viper.Set("a.b.c", 3)
	fmt.Printf("viper.Get(\"a\"): %v\n", viper.Get("a"))
	fmt.Printf("viper.Get(\"a.b.c\"): %v\n", viper.Get("a.b.c"))

	err = viper.WriteConfig()
	if err != nil {             // Handle errors reading the config file
		panic(fmt.Errorf("fatal error config file: %w", err))
	}
} 
