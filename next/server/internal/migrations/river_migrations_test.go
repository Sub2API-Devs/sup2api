package migrations

import (
	"crypto/sha256"
	"encoding/hex"
	"fmt"
	"io/fs"
	"os"
	"regexp"
	"strings"
	"testing"

	"github.com/riverqueue/river/riverdriver/riverpgxv5"
)

// River's own schema is applied as ordinary core migrations, one file per
// River version (TASK-FRAMEWORK-DESIGN §9.1): store.Migrate runs each file in
// its own transaction under the cross-node migration lock, which is what
// River requires, and the managed core's schema contract covers it like any
// other table. The files are River's SQL for the pinned driver version with
// the schema template removed (the tables live in public), plus the version
// row rivermigrate reads, so a later rivermigrate validation or upgrade
// recognizes the database.
//
// riverMigrationFirst is the core migration number of River version 1;
// version N is riverMigrationFirst+N-1.
const (
	riverModule         = "github.com/riverqueue/river/riverdriver/riverpgxv5"
	riverVersion        = "v0.49.0"
	riverMigrationFirst = 76
	riverSchemaTemplate = "/* TEMPLATE: schema */"
)

// riverMigrationFiles renders the expected core migration file of every River
// version: name -> content.
func riverMigrationFiles(t *testing.T) map[string]string {
	t.Helper()
	src := (&riverpgxv5.Driver{}).GetMigrationFS("main")
	ups, err := fs.Glob(src, "migration/main/*.up.sql")
	if err != nil || len(ups) == 0 {
		t.Fatalf("river migrations: %v (%d files)", err, len(ups))
	}
	nameRe := regexp.MustCompile(`^migration/main/(\d{3})_([a-z0-9_]+)\.up\.sql$`)
	out := map[string]string{}
	for _, path := range ups {
		m := nameRe.FindStringSubmatch(path)
		if m == nil {
			t.Fatalf("unexpected river migration file %s", path)
		}
		var version int
		fmt.Sscanf(m[1], "%d", &version)
		body, err := fs.ReadFile(src, path)
		if err != nil {
			t.Fatal(err)
		}
		sum := sha256.Sum256(body)
		record := fmt.Sprintf("INSERT INTO river_migration (version) VALUES (%d) ON CONFLICT DO NOTHING", version)
		if version >= 5 { // version 5 rebuilds river_migration keyed by (line, version)
			record = fmt.Sprintf("INSERT INTO river_migration (line, version) VALUES ('main', %d) ON CONFLICT DO NOTHING", version)
		}
		tag := fmt.Sprintf("$river_v%03d$", version)
		var b strings.Builder
		fmt.Fprintf(&b, "-- River schema, migration line main, version %d (%s).\n", version, m[2])
		fmt.Fprintf(&b, "-- Generated from %s@%s %s\n", riverModule, riverVersion, strings.TrimPrefix(path, "migration/main/"))
		fmt.Fprintf(&b, "-- (sha256 %s) with the schema template removed.\n", hex.EncodeToString(sum[:]))
		b.WriteString("-- Do not edit: TestRiverMigrationsMatchModule compares this file with the\n")
		b.WriteString("-- module (TASK-FRAMEWORK-DESIGN §9.1). To upgrade River, add the new versions as\n")
		b.WriteString("-- new core migrations first, then raise the dependency.\n")
		b.WriteString("--\n")
		b.WriteString("-- River's SQL is not written to run twice, and core migrations from\n")
		b.WriteString("-- FirstIdempotentMigration on must be, so it runs only while the version row\n")
		b.WriteString("-- rivermigrate reads is missing, and records that row.\n")
		b.WriteString("DO $river_guard$\nDECLARE\n    done boolean := false;\nBEGIN\n")
		b.WriteString("    IF to_regclass('river_migration') IS NOT NULL THEN\n")
		fmt.Fprintf(&b, "        EXECUTE 'SELECT EXISTS (SELECT 1 FROM river_migration WHERE version = %d)' INTO done;\n", version)
		b.WriteString("    END IF;\n    IF done THEN\n        RETURN;\n    END IF;\n")
		fmt.Fprintf(&b, "    EXECUTE %s\n", tag)
		b.WriteString(strings.TrimRight(strings.ReplaceAll(string(body), riverSchemaTemplate, ""), "\n"))
		fmt.Fprintf(&b, "\n%s;\n", tag)
		fmt.Fprintf(&b, "    EXECUTE %s;\n", quoteLiteral(record))
		b.WriteString("END\n$river_guard$;\n")
		out[fmt.Sprintf("%04d_river_v%03d.sql", riverMigrationFirst+version-1, version)] = b.String()
	}
	return out
}

// TestRiverMigrationsMatchModule fails when the River migrations in this
// directory differ from the pinned module's (for instance after a dependency
// upgrade without new migrations). SUB2API_WRITE_RIVER_MIGRATIONS=1 writes
// them instead.
func TestRiverMigrationsMatchModule(t *testing.T) {
	gomod, err := os.ReadFile("../../go.mod")
	if err != nil {
		t.Fatal(err)
	}
	if !regexp.MustCompile(`(?m)^\s*` + regexp.QuoteMeta(riverModule) + `\s+` + regexp.QuoteMeta(riverVersion) + `(\s*//.*)?$`).Match(gomod) {
		t.Fatalf("go.mod must require %s %s; add the new River versions as core migrations before upgrading", riverModule, riverVersion)
	}
	want := riverMigrationFiles(t)
	if os.Getenv("SUB2API_WRITE_RIVER_MIGRATIONS") == "1" {
		for name, body := range want {
			if err := os.WriteFile(name, []byte(body), 0o644); err != nil {
				t.Fatal(err)
			}
		}
	}
	got, _ := fs.Glob(FS, "*_river_v*.sql")
	if len(got) != len(want) {
		t.Errorf("have %d River migrations %v, the module has %d versions", len(got), got, len(want))
	}
	for name, body := range want {
		have, err := fs.ReadFile(FS, name)
		if err != nil {
			t.Errorf("%s: %v (SUB2API_WRITE_RIVER_MIGRATIONS=1 go test -run TestRiverMigrationsMatchModule writes it)", name, err)
			continue
		}
		if string(have) != body {
			t.Errorf("%s differs from %s@%s", name, riverModule, riverVersion)
		}
	}
}

func quoteLiteral(s string) string { return "'" + strings.ReplaceAll(s, "'", "''") + "'" }
