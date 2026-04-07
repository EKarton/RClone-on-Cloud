package migrate

import (
	"github.com/spf13/cobra"
)

var MigrateCmd = &cobra.Command{
	Use:   "migrate",
	Short: "Migrate an existing rclone.conf to MongoDB",
	Long:  "Migrate an existing rclone.conf to MongoDB",
	RunE: func(cmd *cobra.Command, args []string) error {
		filePath, _ := cmd.Flags().GetString("from-file")
		return Migrate(cmd.OutOrStdout(), filePath)
	},
}

func init() {
	MigrateCmd.Flags().String("from-file", "", "Path to rclone.conf (required)")
	if err := MigrateCmd.MarkFlagRequired("from-file"); err != nil {
		panic(err)
	}
}
