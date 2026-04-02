package dump

import (
	"fmt"
	"log"
	"os"
	"sort"
	"strings"

	"github.com/rclone/rclone/fs/config"
)

// Dump serializes the global rclone config (already loaded from MongoDB by
// initConfig) to an INI-style file at filePath.
func Dump(filePath string) {
	store := config.Data()

	sections := store.GetSectionList()
	sort.Strings(sections)

	var b strings.Builder
	for _, section := range sections {
		fmt.Fprintf(&b, "[%s]\n", section)
		keys := store.GetKeyList(section)
		sort.Strings(keys)
		for _, key := range keys {
			value, _ := store.GetValue(section, key)
			fmt.Fprintf(&b, "%s = %s\n", key, value)
		}
		b.WriteString("\n")
	}

	if err := os.WriteFile(filePath, []byte(b.String()), 0600); err != nil {
		log.Fatalf("write file: %v", err)
	}

	fmt.Printf("✓ Config dumped to %s (%d remotes)\n", filePath, len(sections))
}
