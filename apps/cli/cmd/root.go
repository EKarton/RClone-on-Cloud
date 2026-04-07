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
