package cmd

import (
	"context"
	"fmt"
	"os"
	"runtime/pprof"

	"github.com/ekarton/RClone-Cloud/apps/web-api/rclone/configs/mongodb"
	"github.com/rclone/rclone/fs"
	"github.com/rclone/rclone/fs/accounting"
	"github.com/rclone/rclone/fs/config"
	"github.com/rclone/rclone/fs/config/configflags"
	fslog "github.com/rclone/rclone/fs/log"
	"github.com/rclone/rclone/fs/rc"
	"github.com/rclone/rclone/fs/rc/rcserver"
	"github.com/rclone/rclone/lib/atexit"
	"github.com/rclone/rclone/lib/terminal"
	"github.com/spf13/pflag"
	"go.mongodb.org/mongo-driver/v2/mongo"
	"go.mongodb.org/mongo-driver/v2/mongo/options"
)

type MongoConfig struct {
	URL        string
	Key        string
	DB         string
	Collection string
}

type Runtime struct {
	Init func(ctx context.Context, cfg MongoConfig) error
}

func defaultRuntime() Runtime {
	return Runtime{
		Init: initRuntime,
	}
}

func initRuntime(ctx context.Context, cfg MongoConfig) error {
	if err := fs.GlobalOptionsInit(); err != nil {
		return fmt.Errorf("failed to initialise global options: %w", err)
	}

	ci := fs.GetConfig(ctx)

	fslog.InitLogging()
	configflags.SetFlags(ci)

	mongoURI := cfg.URL
	if mongoURI == "" {
		mongoURI = os.Getenv("MONGO_URL")
	}
	if mongoURI == "" {
		return fmt.Errorf("MongoDB URI is not set; use --mongo-url or MONGO_URL")
	}

	encKey := cfg.Key
	if encKey == "" {
		encKey = os.Getenv("MONGO_KEY")
	}
	if encKey == "" {
		return fmt.Errorf("MongoDB encryption key is not set; use --mongo-key or MONGO_KEY")
	}

	mongoClient, err := mongo.Connect(options.Client().ApplyURI(mongoURI))
	if err != nil {
		return fmt.Errorf("failed to connect to MongoDB: %w", err)
	}

	mongoStore, err := mongodb.New(
		mongoClient.Database(cfg.DB).Collection(cfg.Collection),
		encKey,
	)
	if err != nil {
		_ = mongoClient.Disconnect(context.Background())
		return fmt.Errorf("failed to initialize MongoDB config storage: %w", err)
	}

	if err := mongoStore.Load(); err != nil {
		_ = mongoClient.Disconnect(context.Background())
		return fmt.Errorf("failed to load config from MongoDB: %w", err)
	}
	config.SetData(mongoStore)

	if err := mongoStore.StartWatching(ctx); err != nil {
		fs.Logf(nil, "Warning: could not start config change stream: %v", err)
	}

	atexit.Register(func() {
		mongoStore.StopWatching()
		if err := mongoClient.Disconnect(context.Background()); err != nil {
			fs.Logf(nil, "mongo disconnect: %v", err)
		}
	})

	accounting.Start(ctx)

	if ci.NoConsole {
		terminal.HideConsole()
	} else {
		terminal.EnableColorsStdout()
	}

	fs.Debugf("rclone-cloud", "Version %q starting with parameters %q", fs.Version, os.Args)

	if fslog.Opt.LogSystemdSupport {
		fs.Debugf("rclone-cloud", "systemd logging support activated")
	}

	if _, err = rcserver.Start(ctx, &rc.Opt); err != nil {
		return fmt.Errorf("failed to start remote control: %w", err)
	}

	if len(os.Args) >= 2 && os.Args[1] != "rc" {
		if _, err = rcserver.MetricsStart(ctx, &rc.Opt); err != nil {
			return fmt.Errorf("failed to start metrics server: %w", err)
		}
	}

	cpuProfileFlag := pflag.Lookup("cpuprofile")
	if cpuProfileFlag != nil && cpuProfileFlag.Value.String() != "" {
		cpuProfile := cpuProfileFlag.Value.String()
		f, err := os.Create(cpuProfile)
		if err != nil {
			return err
		}
		if err := pprof.StartCPUProfile(f); err != nil {
			_ = f.Close()
			return err
		}
		atexit.Register(func() {
			pprof.StopCPUProfile()
			_ = f.Close()
		})
	}

	memProfileFlag := pflag.Lookup("memprofile")
	if memProfileFlag != nil && memProfileFlag.Value.String() != "" {
		memProfile := memProfileFlag.Value.String()
		atexit.Register(func() {
			f, err := os.Create(memProfile)
			if err != nil {
				fs.Errorf(nil, "memory profile create error: %v", err)
				return
			}
			defer func() { _ = f.Close() }()
			if err := pprof.WriteHeapProfile(f); err != nil {
				fs.Errorf(nil, "memory profile write error: %v", err)
			}
		})
	}

	return nil
}
