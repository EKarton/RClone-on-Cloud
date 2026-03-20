package dump

import (
	"github.com/spf13/cobra"
)

var DumpCmd = &cobra.Command{
	Use:   "dump",
	Short: "Dump MongoDB configs to an INI file",
	Run: func(cmd *cobra.Command, args []string) {
		mongoURI, _ := cmd.Flags().GetString("from-mongodb-uri")
		filePath, _ := cmd.Flags().GetString("to-file")
		Dump(mongoURI, filePath)
	},
}

func init() {
	DumpCmd.Flags().String("from-mongodb-uri", "", "MongoDB connection URI (required)")
	DumpCmd.Flags().String("to-file", "", "Output file path (required)")
	if err := DumpCmd.MarkFlagRequired("from-mongodb-uri"); err != nil {
		panic(err)
	}
	if err := DumpCmd.MarkFlagRequired("to-file"); err != nil {
		panic(err)
	}
}
