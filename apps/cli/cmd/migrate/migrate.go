package migrate

import (
	"fmt"
	"os"

	"github.com/rclone/rclone/fs/config"
	"github.com/rclone/rclone/fs/config/configfile"
)

// Migrate reads an rclone.conf file and copies all sections/keys into the
// global MongoDB-backed config (already set up by initConfig).
func Migrate(configPath string) error {
	// 1. Read the source .conf file independently
	if err := config.SetConfigPath(configPath); err != nil {
		return fmt.Errorf("set config path: %w", err)
	}

	// Temporarily install file-based storage to parse the .conf,
	// then grab a reference before restoring the MongoDB-backed store.
	mongoStore := config.Data() // save current (MongoDB) store
	configfile.Install()
	fileStore := config.Data() // file-based store
	config.SetData(mongoStore) // restore MongoDB store

	// 2. Copy every section + key from file → global config
	sections := fileStore.GetSectionList()
	if len(sections) == 0 {
		return fmt.Errorf("no sections found in %s — nothing to migrate", configPath)
	}

	for _, section := range sections {
		keys := fileStore.GetKeyList(section)
		for _, key := range keys {
			value, _ := fileStore.GetValue(section, key)
			mongoStore.SetValue(section, key, value)
		}
		fmt.Printf("✓ %s (%d keys)\n", section, len(keys))
	}

	// 3. Flush to MongoDB
	if err := mongoStore.Save(); err != nil {
		return fmt.Errorf("save to mongodb: %w", err)
	}

	fmt.Printf("Done — %d remotes migrated.\n", len(sections))

	// 4. Restore the config path (undo the temporary change)
	_ = os.Setenv("RCLONE_CONFIG", "")
	return nil
}
