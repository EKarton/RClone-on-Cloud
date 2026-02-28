package rclone

import (
	"context"
	"fmt"

	"github.com/rclone/rclone/fs/config"
	"github.com/rclone/rclone/fs/rc"
	"github.com/rclone/rclone/fs/rc/rcserver"

	// Side-effect imports to register RC methods and backends
	_ "github.com/rclone/rclone/backend/all"
	_ "github.com/rclone/rclone/fs/operations"
)

// StartRCServer loads the provided rclone config storage
// and starts the internal RC server on the given address.
func StartRCServer(ctx context.Context, store config.Storage, rcAddr string) (*rcserver.Server, error) {
	config.SetData(store)

	// Internal RC server
	rc.Opt.Enabled = true
	rc.Opt.NoAuth = true
	rc.Opt.Serve = true
	rc.Opt.HTTP.ListenAddr = []string{rcAddr}

	srv, err := rcserver.Start(ctx, &rc.Opt)
	if err != nil {
		return nil, fmt.Errorf("start rc server: %w", err)
	}

	return srv, nil
}
