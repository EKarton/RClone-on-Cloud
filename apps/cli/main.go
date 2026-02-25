package main

import (
	"fmt"
	"os"

	"github.com/ekarton/RClone-Cloud/apps/cli/cmd"
)

func main() {
	if len(os.Args) < 2 {
		fmt.Println("Usage: go run . <command> [arguments]")
		fmt.Println("\nCommands:")
		fmt.Println("  migrate <path/to/rclone.conf>   Migrate an existing rclone.conf to MongoDB")
		os.Exit(1)
	}

	command := os.Args[1]

	switch command {
	case "migrate":
		if len(os.Args) < 3 {
			fmt.Println("Usage: go run . migrate <path/to/rclone.conf>")
			os.Exit(1)
		}
		configPath := os.Args[2]
		cmd.Migrate(configPath)
	default:
		fmt.Printf("Unknown command: %s\n", command)
		os.Exit(1)
	}
}
