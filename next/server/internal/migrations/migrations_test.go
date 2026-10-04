package migrations

import (
	"io/fs"
	"regexp"
	"strings"
	"testing"
)

// store.Migrate runs every migration file inside one transaction, so a
// statement PostgreSQL refuses in a transaction block fails the migration on
// every fresh install and every upgrade (0028 shipped CREATE INDEX
// CONCURRENTLY this way, and nothing caught it because the PG tests skip
// without TEST_DATABASE_URL). This check needs no database.
var nonTransactional = regexp.MustCompile(`(?i)\b(?:CONCURRENTLY|VACUUM|CREATE\s+DATABASE|DROP\s+DATABASE|ALTER\s+SYSTEM|CREATE\s+TABLESPACE)\b`)

func TestMigrationsRunInsideATransaction(t *testing.T) {
	files, err := fs.Glob(FS, "*.sql")
	if err != nil || len(files) == 0 {
		t.Fatalf("no migrations: %v", err)
	}
	for _, name := range files {
		body, err := fs.ReadFile(FS, name)
		if err != nil {
			t.Fatal(err)
		}
		for i, line := range strings.Split(string(body), "\n") {
			code, _, _ := strings.Cut(line, "--")
			if m := nonTransactional.FindString(code); m != "" {
				t.Errorf("%s:%d: %q cannot run inside the migration transaction", name, i+1, m)
			}
		}
	}
}

// Migration ids are ordered by their numeric prefix; two files sharing one
// (0027 had two before the stage 2 merge) apply in an order that depends on
// the rest of the name.
func TestMigrationNumbersAreUnique(t *testing.T) {
	files, _ := fs.Glob(FS, "*.sql")
	seen := map[string]string{}
	for _, name := range files {
		num, _, ok := strings.Cut(name, "_")
		if !ok || len(num) != 4 {
			t.Errorf("%s: want NNNN_name.sql", name)
			continue
		}
		if prev, dup := seen[num]; dup {
			t.Errorf("%s and %s share number %s", prev, name, num)
		}
		seen[num] = name
	}
}
