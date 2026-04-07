package dump

import (
	"github.com/spf13/cobra"
)

var DumpCmd = &cobra.Command{
	Use:   "dump",
	Short: "Dump MongoDB configs to an INI file",
	Long:  "Dump MongoDB configs to an INI file",
	RunE: func(cmd *cobra.Command, args []string) error {
		filePath, _ := cmd.Flags().GetString("to-file")
		return Dump(cmd.OutOrStdout(), filePath)
	},
}

func init() {
	DumpCmd.Flags().String("to-file", "", "Output file path (required)")
	if err := DumpCmd.MarkFlagRequired("to-file"); err != nil {
		panic(err)
	}
}
