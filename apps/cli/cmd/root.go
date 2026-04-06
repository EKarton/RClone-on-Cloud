package cmd

import (
	"context"
	"errors"
	"fmt"
	"os"

	"github.com/rclone/rclone/fs"
	"github.com/rclone/rclone/fs/accounting"
	"github.com/rclone/rclone/fs/fserrors"
	fssync "github.com/rclone/rclone/fs/sync"
	"github.com/rclone/rclone/lib/atexit"
	"github.com/rclone/rclone/lib/exitcode"
)

// // Globals
var (
	// Errors
	errorCommandNotFound    = errors.New("command not found")
	errorNotEnoughArguments = errors.New("not enough arguments")
	errorTooManyArguments   = errors.New("too many arguments")
)

func resolveExitCode(err error) {
	ctx := context.Background()
	ci := fs.GetConfig(ctx)
	atexit.Run()

	if err == nil {
		if ci.ErrorOnNoTransfer {
			if accounting.GlobalStats().GetTransfers() == 0 {
				os.Exit(exitcode.NoFilesTransferred)
			}
		}
		os.Exit(exitcode.Success)
	}

	// Print the error to stderr
	fmt.Fprintf(os.Stderr, "Error: %v\n", err)

	switch {
	case errors.Is(err, fs.ErrorDirNotFound):
		os.Exit(exitcode.DirNotFound)
	case errors.Is(err, fs.ErrorObjectNotFound):
		os.Exit(exitcode.FileNotFound)
	case errors.Is(err, accounting.ErrorMaxTransferLimitReached):
		os.Exit(exitcode.TransferExceeded)
	case errors.Is(err, fssync.ErrorMaxDurationReached):
		os.Exit(exitcode.DurationExceeded)
	case fserrors.ShouldRetry(err):
		os.Exit(exitcode.RetryError)
	case fserrors.IsNoRetryError(err), fserrors.IsNoLowLevelRetryError(err):
		os.Exit(exitcode.NoRetryError)
	case fserrors.IsFatalError(err):
		os.Exit(exitcode.FatalError)
	case errors.Is(err, errorCommandNotFound), errors.Is(err, errorNotEnoughArguments), errors.Is(err, errorTooManyArguments):
		os.Exit(exitcode.UsageError)
	default:
		os.Exit(exitcode.UncategorizedError)
	}
}

// Main runs rclone interpreting flags and commands out of os.Args
func Main() {
	setupRootCommand(Root)
	err := Root.Execute()
	resolveExitCode(err)
}
