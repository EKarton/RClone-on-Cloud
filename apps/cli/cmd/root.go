package cmd

import (
	"context"
	"errors"
	"fmt"
	"os"
	"runtime/pprof"

	"github.com/ekarton/RClone-Cloud/apps/web-api/rclone/configs/mongodb"
	"github.com/rclone/rclone/fs"
	"github.com/rclone/rclone/fs/accounting"
	"github.com/rclone/rclone/fs/config"
	"github.com/rclone/rclone/fs/config/configflags"
	"github.com/rclone/rclone/fs/config/flags"
	"github.com/rclone/rclone/fs/fserrors"
	fslog "github.com/rclone/rclone/fs/log"
	"github.com/rclone/rclone/fs/rc"
	"github.com/rclone/rclone/fs/rc/rcserver"
	fssync "github.com/rclone/rclone/fs/sync"
	"github.com/rclone/rclone/lib/atexit"
	"github.com/rclone/rclone/lib/exitcode"
	"github.com/rclone/rclone/lib/terminal"
	"github.com/spf13/pflag"
	"go.mongodb.org/mongo-driver/v2/mongo"
	"go.mongodb.org/mongo-driver/v2/mongo/options"
)

// // Globals
var (
	// Errors
	errorCommandNotFound    = errors.New("command not found")
	errorNotEnoughArguments = errors.New("not enough arguments")
	errorTooManyArguments   = errors.New("too many arguments")
)

// MongoDB connection flags
var (
	mongoURL  string
	mongoKey  string
	mongoDB   string
	mongoColl string
)

// Shared utilities are used from rclonecmd directly

// initConfig is run by cobra after initialising the flags
func initConfig() {
	// Set the global options from the flags
	err := fs.GlobalOptionsInit()
	if err != nil {
		fs.Fatalf(nil, "Failed to initialise global options: %v", err)
	}

	ctx := context.Background()
	ci := fs.GetConfig(ctx)

	// Start the logger
	fslog.InitLogging()

	// Finish parsing any command line flags
	configflags.SetFlags(ci)

	// Load the config from MongoDB
	// Flag takes precedence over env var
	mongoURI := mongoURL
	if mongoURI == "" {
		mongoURI = os.Getenv("MONGO_URL")
	}
	if mongoURI == "" {
		fs.Fatalf(nil, "MongoDB URI is not set; use --mongo-url or MONGO_URL")
	}
	encKey := mongoKey
	if encKey == "" {
		encKey = os.Getenv("MONGO_KEY")
	}
	if encKey == "" {
		fs.Fatalf(nil, "MongoDB encryption key is not set; use --mongo-key or MONGO_KEY")
	}

	mongoClient, err := mongo.Connect(options.Client().ApplyURI(mongoURI))
	if err != nil {
		fs.Fatalf(nil, "Failed to connect to MongoDB: %v", err)
	}

	mongoStore, err := mongodb.New(
		mongoClient.Database(mongoDB).Collection(mongoColl),
		encKey,
	)
	if err != nil {
		fs.Fatalf(nil, "Failed to initialize MongoDB config storage: %v", err)
	}
	if err := mongoStore.Load(); err != nil {
		fs.Fatalf(nil, "Failed to load config from MongoDB: %v", err)
	}
	config.SetData(mongoStore)

	// Start watching for external config changes
	if err := mongoStore.StartWatching(ctx); err != nil {
		fs.Logf(nil, "Warning: could not start config change stream: %v", err)
	}

	// Register cleanup for MongoDB resources
	atexit.Register(func() {
		mongoStore.StopWatching()
		if err := mongoClient.Disconnect(context.Background()); err != nil {
			fs.Logf(nil, "mongo disconnect: %v", err)
		}
	})

	// Start accounting
	accounting.Start(ctx)

	// Configure console
	if ci.NoConsole {
		// Hide the console window
		terminal.HideConsole()
	} else {
		// Enable color support on stdout if possible.
		// This enables virtual terminal processing on Windows 10,
		// adding native support for ANSI/VT100 escape sequences.
		terminal.EnableColorsStdout()
	}

	// Write the args for debug purposes
	fs.Debugf("rclone-cloud", "Version %q starting with parameters %q", fs.Version, os.Args)

	// Inform user about systemd log support now that we have a logger
	if fslog.Opt.LogSystemdSupport {
		fs.Debugf("rclone-cloud", "systemd logging support activated")
	}

	// Start the remote control server if configured
	_, err = rcserver.Start(ctx, &rc.Opt)
	if err != nil {
		fs.Fatalf(nil, "Failed to start remote control: %v", err)
	}

	// Start the metrics server if configured and not running the "rc" command
	if len(os.Args) >= 2 && os.Args[1] != "rc" {
		_, err = rcserver.MetricsStart(ctx, &rc.Opt)
		if err != nil {
			fs.Fatalf(nil, "Failed to start metrics server: %v", err)
		}
	}

	// Setup CPU profiling if desired
	cpuProfileFlag := pflag.Lookup("cpuprofile")
	if cpuProfileFlag != nil && cpuProfileFlag.Value.String() != "" {
		cpuProfile := cpuProfileFlag.Value.String()
		fs.Infof(nil, "Creating CPU profile %q\n", cpuProfile)
		f, err := os.Create(cpuProfile)
		if err != nil {
			err = fs.CountError(ctx, err)
			fs.Fatal(nil, fmt.Sprint(err))
		}
		err = pprof.StartCPUProfile(f)
		if err != nil {
			err = fs.CountError(ctx, err)
			fs.Fatal(nil, fmt.Sprint(err))
		}
		atexit.Register(func() {
			pprof.StopCPUProfile()
			err := f.Close()
			if err != nil {
				err = fs.CountError(ctx, err)
				fs.Fatal(nil, fmt.Sprint(err))
			}
		})
	}

	// Setup memory profiling if desired
	memProfileFlag := pflag.Lookup("memprofile")
	if memProfileFlag != nil && memProfileFlag.Value.String() != "" {
		memProfile := memProfileFlag.Value.String()
		atexit.Register(func() {
			fs.Infof(nil, "Saving Memory profile %q\n", memProfile)
			f, err := os.Create(memProfile)
			if err != nil {
				err = fs.CountError(ctx, err)
				fs.Fatal(nil, fmt.Sprint(err))
			}
			err = pprof.WriteHeapProfile(f)
			if err != nil {
				err = fs.CountError(ctx, err)
				fs.Fatal(nil, fmt.Sprint(err))
			}
			err = f.Close()
			if err != nil {
				err = fs.CountError(ctx, err)
				fs.Fatal(nil, fmt.Sprint(err))
			}
		})
	}
}

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

var backendFlags map[string]struct{}

// AddBackendFlags creates flags for all the backend options
func AddBackendFlags() {
	backendFlags = map[string]struct{}{}
	for _, fsInfo := range fs.Registry {
		flags.AddFlagsFromOptions(pflag.CommandLine, fsInfo.Prefix, fsInfo.Options)
		// Store the backend flag names for the help generator
		for i := range fsInfo.Options {
			opt := &fsInfo.Options[i]
			name := opt.FlagName(fsInfo.Prefix)
			backendFlags[name] = struct{}{}
		}
	}
}

// Main runs rclone interpreting flags and commands out of os.Args
func Main() {
	setupRootCommand(Root)
	AddBackendFlags()
	if err := Root.Execute(); err != nil {
		fs.Logf(nil, "Fatal error: %v", err)
		os.Exit(exitcode.UsageError)
	}
}
