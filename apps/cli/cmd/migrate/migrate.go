package migrate

import (
	"fmt"
	"log"
	"os"

	"github.com/rclone/rclone/fs/config"
	"github.com/rclone/rclone/fs/config/configfile"
)

// Migrate reads an rclone.conf file and copies all sections/keys into the
// global MongoDB-backed config (already set up by initConfig).
func Migrate(configPath string) {
	// 1. Read the source .conf file independently
	if err := config.SetConfigPath(configPath); err != nil {
		log.Fatalf("set config path: %v", err)
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
		log.Println("No sections found — nothing to migrate.")
		return
	}

	for _, section := range sections {
		keys := fileStore.GetKeyList(section)
		for _, key := range keys {
			value, _ := fileStore.GetValue(section, key)
			mongoStore.SetValue(section, key, value)
		}
		log.Printf("✓ %s (%d keys)", section, len(keys))
	}

	// 3. Flush to MongoDB
	if err := mongoStore.Save(); err != nil {
		log.Fatalf("save to mongodb: %v", err)
	}

	fmt.Printf("Done — %d remotes migrated.\n", len(sections))

	// 4. Restore the config path (undo the temporary change)
	_ = os.Setenv("RCLONE_CONFIG", "")
}
