package cmd

import (
	"fmt"
	"os"

	"github.com/ekarton/RClone-Cloud/apps/cli/cmd/dump"
	"github.com/ekarton/RClone-Cloud/apps/cli/cmd/migrate"
	"github.com/spf13/cobra"
)

var rootCmd = &cobra.Command{
	Use:   "rclone-cmd",
	Short: "RClone-on-Cloud CLI tool",
	Long:  "A CLI tool to manage RClone-on-Cloud configurations, migration, and token generation.",
}

func init() {
	rootCmd.AddCommand(migrate.MigrateCmd)
	rootCmd.AddCommand(dump.DumpCmd)
}

// Execute adds all child commands to the root command and sets flags appropriately.
func Execute() {
	if err := rootCmd.Execute(); err != nil {
		fmt.Fprintln(os.Stderr, err)
		os.Exit(1)
	}
}
