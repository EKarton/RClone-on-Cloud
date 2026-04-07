package dump

import (
	"fmt"
	"io"
	"os"
	"sort"
	"strings"

	"github.com/rclone/rclone/fs/config"
)

// Dump serializes the global rclone config (already loaded from MongoDB by
// initConfig) to an INI-style file at filePath.
func Dump(out io.Writer, filePath string) error {
	store := config.Data()

	sections := store.GetSectionList()
	sort.Strings(sections)

	var b strings.Builder
	for _, section := range sections {
		if _, err := fmt.Fprintf(&b, "[%s]\n", section); err != nil {
			return err
		}
		keys := store.GetKeyList(section)
		sort.Strings(keys)
		for _, key := range keys {
			value, _ := store.GetValue(section, key)
			if _, err := fmt.Fprintf(&b, "%s = %s\n", key, value); err != nil {
				return err
			}
		}
		b.WriteString("\n")
	}

	if err := os.WriteFile(filePath, []byte(b.String()), 0600); err != nil {
		return fmt.Errorf("write file: %w", err)
	}

	if _, err := fmt.Fprintf(out, "✓ Config dumped to %s (%d remotes)\n", filePath, len(sections)); err != nil {
		return err
	}
	return nil
}
