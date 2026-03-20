package migrate

import (
	"github.com/spf13/cobra"
)

var MigrateCmd = &cobra.Command{
	Use:   "migrate",
	Short: "Migrate an existing rclone.conf to MongoDB",
	Run: func(cmd *cobra.Command, args []string) {
		filePath, _ := cmd.Flags().GetString("from-file")
		mongoURI, _ := cmd.Flags().GetString("to-mongodb-uri")
		Migrate(filePath, mongoURI)
	},
}

func init() {
	MigrateCmd.Flags().String("from-file", "", "Path to rclone.conf (required)")
	MigrateCmd.Flags().String("to-mongodb-uri", "", "MongoDB connection URI (required)")
	if err := MigrateCmd.MarkFlagRequired("from-file"); err != nil {
		panic(err)
	}
	if err := MigrateCmd.MarkFlagRequired("to-mongodb-uri"); err != nil {
		panic(err)
	}
}
