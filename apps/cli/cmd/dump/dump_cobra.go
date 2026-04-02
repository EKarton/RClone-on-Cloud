package dump

import (
	"github.com/spf13/cobra"
)

var DumpCmd = &cobra.Command{
	Use:   "dump",
	Short: "Dump MongoDB configs to an INI file",
	Run: func(cmd *cobra.Command, args []string) {
		filePath, _ := cmd.Flags().GetString("to-file")
		Dump(filePath)
	},
}

func init() {
	DumpCmd.Flags().String("to-file", "", "Output file path (required)")
	if err := DumpCmd.MarkFlagRequired("to-file"); err != nil {
		panic(err)
	}
}
