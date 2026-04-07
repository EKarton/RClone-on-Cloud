package cmd

import (
	"context"
	"errors"
	"fmt"
	"os"

	"github.com/ekarton/RClone-Cloud/apps/cli/cmd/dump"
	"github.com/ekarton/RClone-Cloud/apps/cli/cmd/migrate"
	rclonecmd "github.com/rclone/rclone/cmd"
	"github.com/rclone/rclone/fs"
	"github.com/rclone/rclone/fs/accounting"
	"github.com/rclone/rclone/fs/config/configflags"
	"github.com/rclone/rclone/fs/config/flags"
	"github.com/rclone/rclone/fs/filter/filterflags"
	"github.com/rclone/rclone/fs/fserrors"
	"github.com/rclone/rclone/fs/log/logflags"
	"github.com/rclone/rclone/fs/rc/rcflags"
	fssync "github.com/rclone/rclone/fs/sync"
	"github.com/rclone/rclone/lib/atexit"
	"github.com/rclone/rclone/lib/exitcode"
	"github.com/spf13/cobra"
)

type rootOptions struct {
	version   bool
	mongoURL  string
	mongoKey  string
	mongoDB   string
	mongoColl string
}

func Execute(args []string) error {
	cmd := NewRootCommand(defaultRuntime())
	cmd.SetArgs(args)
	return cmd.Execute()
}

func NewRootCommand(rt Runtime) *cobra.Command {
	opts := &rootOptions{
		mongoDB:   "rclone",
		mongoColl: "configs",
	}

	root := &cobra.Command{
		Use:   "rclone-cloud",
		Short: "Show help for Rclone on Cloud commands, flags and backends.",
		Long: `Rclone on Cloud syncs files to and from cloud storage providers as well as
mounting them, listing them in lots of different ways.

See the home page (https://rclone.org/) for installation, usage,
documentation, changelog and configuration walkthroughs.`,
		Args:              cobra.NoArgs,
		DisableAutoGenTag: true,
		SilenceUsage:      true,
		SilenceErrors:     true,
		PersistentPreRunE: func(cmd *cobra.Command, args []string) error {
			cfg := MongoConfig{
				URL:        opts.mongoURL,
				Key:        opts.mongoKey,
				DB:         opts.mongoDB,
				Collection: opts.mongoColl,
			}
			return rt.Init(cmd.Context(), cfg)
		},
		PersistentPostRun: func(cmd *cobra.Command, args []string) {
			fs.Debugf("rclone-cloud", "Version %q finishing with parameters %q", fs.Version, os.Args)
			atexit.Run()
		},
		RunE: func(cmd *cobra.Command, args []string) error {
			if opts.version {
				rclonecmd.ShowVersion()
				return nil
			}
			return cmd.Usage()
		},
	}

	setupRootCommand(root, opts)
	return root
}

func setupRootCommand(root *cobra.Command, opts *rootOptions) {
	ci := fs.GetConfig(context.Background())

	configflags.AddFlags(ci, root.PersistentFlags())
	filterflags.AddFlags(root.PersistentFlags())
	rcflags.AddFlags(root.PersistentFlags())
	logflags.AddFlags(root.PersistentFlags())
	for _, fsInfo := range fs.Registry {
		flags.AddFlagsFromOptions(root.PersistentFlags(), fsInfo.Prefix, fsInfo.Options)
	}

	root.Flags().BoolVarP(&opts.version, "version", "V", false, "Print the version number")
	root.PersistentFlags().StringVar(&opts.mongoURL, "mongo-url", "", "MongoDB connection URI (env: MONGO_URL)")
	root.PersistentFlags().StringVar(&opts.mongoKey, "mongo-key", "", "MongoDB encryption key (env: MONGO_KEY)")
	root.PersistentFlags().StringVar(&opts.mongoDB, "mongo-db", "rclone", "MongoDB database name")
	root.PersistentFlags().StringVar(&opts.mongoColl, "mongo-col", "configs", "MongoDB collection name")

	root.AddCommand(migrate.MigrateCmd)
	root.AddCommand(dump.DumpCmd)

	for _, rcloneCmd := range rclonecmd.Root.Commands() {
		if rcloneCmd.Name() == "migrate" || rcloneCmd.Name() == "dump" {
			continue
		}
		root.AddCommand(rcloneCmd)
	}
}

func ResolveExitCode(err error) int {
	ctx := context.Background()
	ci := fs.GetConfig(ctx)
	atexit.Run()

	if err == nil {
		if ci.ErrorOnNoTransfer && accounting.GlobalStats().GetTransfers() == 0 {
			return exitcode.NoFilesTransferred
		}
		return exitcode.Success
	}

	switch {
	case errors.Is(err, fs.ErrorDirNotFound):
		return exitcode.DirNotFound
	case errors.Is(err, fs.ErrorObjectNotFound):
		return exitcode.FileNotFound
	case errors.Is(err, accounting.ErrorMaxTransferLimitReached):
		return exitcode.TransferExceeded
	case errors.Is(err, fssync.ErrorMaxDurationReached):
		return exitcode.DurationExceeded
	case fserrors.ShouldRetry(err):
		return exitcode.RetryError
	case fserrors.IsNoRetryError(err), fserrors.IsNoLowLevelRetryError(err):
		return exitcode.NoRetryError
	case fserrors.IsFatalError(err):
		return exitcode.FatalError
	default:
		return exitcode.UsageError
	}
}

func Main() {
	err := Execute(os.Args[1:])
	if err != nil {
		fmt.Fprintf(os.Stderr, "Error: %v\n", err)
	}
	os.Exit(ResolveExitCode(err))
}
