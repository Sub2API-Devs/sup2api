package moderation

import (
	"os"
	"path/filepath"
	"testing"
)

// migrationDir copies the migrations whose names keep accepts into a
// directory of their own (the migration rolling tests).
func migrationDir(t *testing.T, keep func(name string) bool) string {
	t.Helper()
	src := filepath.Join("..", "..", "migrations")
	files, err := os.ReadDir(src)
	if err != nil {
		t.Fatal(err)
	}
	dir := t.TempDir()
	for _, f := range files {
		if !keep(f.Name()) {
			continue
		}
		raw, err := os.ReadFile(filepath.Join(src, f.Name()))
		if err != nil {
			t.Fatal(err)
		}
		if err := os.WriteFile(filepath.Join(dir, f.Name()), raw, 0o600); err != nil {
			t.Fatal(err)
		}
	}
	return dir
}
