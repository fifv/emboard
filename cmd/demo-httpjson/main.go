package main

import (
	"encoding/json"
	"errors"
	// "io"
	"log"
	"os"
	"sync"

	"github.com/gin-contrib/cors"
	"github.com/gin-gonic/gin"
)

const configFile = "config.json"

// Config holds the configuration data
type Config struct {
	data map[string]interface{}
	mu   sync.RWMutex
}

// Load loads the configuration from a JSON file
func (c *Config) Load(filename string) error {
	c.mu.Lock()
	defer c.mu.Unlock()

	file, err := os.ReadFile(filename)
	if err != nil {
		return err
	}

	if err := json.Unmarshal(file, &c.data); err != nil {
		return err
	}

	return nil
}

// Save saves the configuration to a JSON file
func (c *Config) Save(filename string) error {
	c.mu.RLock()
	defer c.mu.RUnlock()

	file, err := json.MarshalIndent(c.data, "", "  ")
	if err != nil {
		return err
	}

	return os.WriteFile(filename, file, 0644)
}

// Get retrieves a value by key
func (c *Config) Get(key string) (interface{}, error) {
	c.mu.RLock()
	defer c.mu.RUnlock()

	value, exists := c.data[key]
	if !exists {
		return nil, errors.New("key not found")
	}

	return value, nil
}

// Set updates or adds a key-value pair
func (c *Config) Set(key string, value interface{}) {
	c.mu.Lock()
	defer c.mu.Unlock()

	c.data[key] = value
}

func main() {
	// Initialize Gin and Config
	r := gin.Default()
	r.Use(cors.Default())

	config := &Config{data: make(map[string]interface{})}

	// Load config file
	if _, err := os.Stat(configFile); err == nil {
		if err := config.Load(configFile); err != nil {
			log.Fatalf("Failed to load config: %v", err)
		}
	} else {
		// Create a default config file if not exists
		if err := config.Save(configFile); err != nil {
			log.Fatalf("Failed to create config file: %v", err)
		}
	}

	// GET endpoint to retrieve a value by key
	r.GET("/config", func(c *gin.Context) {
		key := c.Query("key")
		if key == "" {
			c.JSON(400, gin.H{"error": "query key `key` is required"})
			return
		}
		if err := config.Load(configFile); err != nil {
			c.JSON(400, gin.H{"error": "Failed to load config"})
			log.Fatalf("Failed to load config: %v", err)
			return
		}
		value, err := config.Get(key)
		if err != nil {
			c.JSON(404, gin.H{"error": err.Error()})
			return
		}
		c.JSON(200, gin.H{"key": key, "value": value})
	})

	// POST endpoint to update a key-value pair
	/**
	 * /config?key=abc  body: "myvalue"
	 * Must a valid json, e.g. strings are quoted in ""
	 */
	r.POST("/config", func(c *gin.Context) {
		key := c.Query("key")
		if key == "" {
			c.JSON(400, gin.H{"error": "query key `key` is required"})
			return
		}
		// var body struct {
		// 	Value interface{} `json:"value" binding:"required"`
		// }
		var value interface{}
		if err := c.ShouldBindJSON(&value); err != nil {
			c.JSON(400, gin.H{"error": "Invalid input"})
			return
		}
		// body, err := io.ReadAll(c.Request.Body)
		// if err != nil || string(body) == "" {
		// 	panic(err)
		// }
		// if err := json.Unmarshal(body, &value); err != nil {
		// 	panic(err)
		// }

		config.Set(key, value)

		if err := config.Save(configFile); err != nil {
			c.JSON(500, gin.H{"error": "Failed to save configuration"})
			return
		}

		c.JSON(200, gin.H{"message": "Configuration updated", "key": key, "value": value})
	})

	// Start the server
	if err := r.Run(":9999"); err != nil {
		log.Fatalf("Failed to start server: %v", err)
	}
}
