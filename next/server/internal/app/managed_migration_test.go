package app

import (
	"context"
	"strings"
	"testing"
	"testing/fstest"

	rc "github.com/Sub2API-Devs/sup2api/next/runtime-contract"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/testutil"
)

func TestMigrationPermitOnlyAllowsApprovedAppendOnlyHistory(t *testing.T) {
	inventory, err := migrationInventory(fstest.MapFS{
		"0001.sql": {Data: []byte("CREATE TABLE old_data (id bigint);")},
		"0002.sql": {Data: []byte("ALTER TABLE old_data ADD COLUMN flag boolean;")},
		"0003.sql": {Data: []byte("CREATE INDEX ON old_data(id);")},
	})
	if err != nil {
		t.Fatal(err)
	}
	for n := 1; n <= 3; n++ {
		applied := map[string]string{}
		for _, m := range inventory[:n] {
			applied[m.name] = m.checksum
		}
		p := rc.PrepareRequest{AllowMigration: true, ExpectedSchemaBefore: inventoryContract(inventory[:1]), ExpectedSchemaAfter: inventoryContract(inventory)}
		if err := validateMigrationPermit(inventory, applied, p); err != nil {
			t.Fatalf("legal migration restart at prefix %d: %v", n, err)
		}
	}
	cases := []struct {
		name    string
		applied map[string]string
		permit  rc.PrepareRequest
	}{
		{"missing source", map[string]string{inventory[0].name: inventory[0].checksum}, rc.PrepareRequest{AllowMigration: true}},
		{"wrong source", map[string]string{inventory[0].name: inventory[0].checksum}, rc.PrepareRequest{ExpectedSchemaBefore: "wrong"}},
		{"wrong target", map[string]string{inventory[0].name: inventory[0].checksum}, rc.PrepareRequest{ExpectedSchemaBefore: inventoryContract(inventory[:1]), ExpectedSchemaAfter: "wrong"}},
		{"older than source", map[string]string{}, rc.PrepareRequest{ExpectedSchemaBefore: inventoryContract(inventory[:1])}},
		{"unknown future migration", map[string]string{"9999.sql": "future"}, rc.PrepareRequest{Bootstrap: true}},
		{"changed history", map[string]string{inventory[0].name: "changed"}, rc.PrepareRequest{Bootstrap: true}},
		{"gap", map[string]string{inventory[1].name: inventory[1].checksum}, rc.PrepareRequest{Bootstrap: true}},
	}
	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			if err := validateMigrationPermit(inventory, tc.applied, tc.permit); err == nil {
				t.Fatal("unsafe migration admitted")
			}
		})
	}
	if err := validateMigrationPermit(inventory, map[string]string{}, rc.PrepareRequest{Bootstrap: true, AllowMigration: true}); err != nil {
		t.Fatal(err)
	}
}

func TestManagedSchemaRejectsUnknownFutureMigration(t *testing.T) {
	db := testutil.DB(t)
	ctx := context.Background()
	if _, err := db.Pool.Exec(ctx, `INSERT INTO schema_migrations(id,checksum) VALUES('9999_future.sql','unknown')`); err != nil {
		t.Fatal(err)
	}
	if err := verifyCoreSchema(ctx, db); err == nil || !strings.Contains(err.Error(), "unknown") {
		t.Fatalf("older core accepted future schema: %v", err)
	}
	contract, err := SchemaContract()
	if err != nil {
		t.Fatal(err)
	}
	if _, err = prepareCoreSchema(ctx, db, rc.PrepareRequest{AllowMigration: true, ExpectedSchemaBefore: contract}); err == nil {
		t.Fatal("migration permit bypassed future schema rejection")
	}
}

func TestMigrationAndPluginPreparationDoNotAdmitBusiness(t *testing.T) {
	for _, mode := range []string{"preparing", "prepared", "draining", "drained"} {
		m := &managedCore{mode: mode, prepare: rc.PrepareRequest{AllowMigration: true, CoordinatePlugins: true}}
		want := mode == "preparing" || mode == "prepared"
		if m.coordinateAllowed() != want {
			t.Fatalf("mode %s wrong plugin admission", mode)
		}
		if m.backgroundAllowed() || m.status(context.Background()).Ready {
			t.Fatalf("mode %s migration admitted business", mode)
		}
	}
	m := &managedCore{mode: "prepared", prepare: rc.PrepareRequest{AllowMigration: true}}
	if m.coordinateAllowed() {
		t.Fatal("schema permit silently granted plugin coordination")
	}
}
