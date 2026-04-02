package main

import (
	"github.com/ekarton/RClone-Cloud/apps/cli/cmd"
	_ "github.com/rclone/rclone/backend/all" // import all backends
	_ "github.com/rclone/rclone/cmd/all"     // import all commands
	_ "github.com/rclone/rclone/lib/plugin"  // import plugins
)

func main() {
	cmd.Main()
}
