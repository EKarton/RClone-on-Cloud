package migrate

import (
	"github.com/spf13/cobra"
)

var MigrateCmd = &cobra.Command{
	Use:   "migrate",
	Short: "Migrate an existing rclone.conf to MongoDB",
	Run: func(cmd *cobra.Command, args []string) {
		filePath, _ := cmd.Flags().GetString("from-file")
		Migrate(filePath)
	},
}

func init() {
	MigrateCmd.Flags().String("from-file", "", "Path to rclone.conf (required)")
	if err := MigrateCmd.MarkFlagRequired("from-file"); err != nil {
		panic(err)
	}
}
