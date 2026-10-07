package main

import (
	"ccgateway/engine"
	"log"
	"os"
)

func main() {
	if err := engine.Serve(); err != nil {
		log.Print(err)
		os.Exit(1)
	}
}
