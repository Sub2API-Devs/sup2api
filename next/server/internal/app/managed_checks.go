package app

import (
	"context"
	"crypto/sha256"
	"encoding/hex"
	"errors"
	"fmt"
	"io/fs"
	"sort"
	"strings"

	runtimecontract "github.com/Sub2API-Devs/sup2api/next/runtime-contract"
	"github.com/Sub2API-Devs/sup2api/next/sdk/manifest/check"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/core"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/migrations"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/store"
	"github.com/jackc/pgx/v5/pgconn"
)

type coreMigration struct {
	name, checksum string
	body           []byte
}

func migrationInventory(fsys fs.FS) ([]coreMigration, error) {
	names, err := fs.Glob(fsys, "*.sql")
	if err != nil {
		return nil, err
	}
	sort.Strings(names)
	var out []coreMigration
	for _, name := range names {
		b, err := fs.ReadFile(fsys, name)
		if err != nil {
			return nil, err
		}
		sum := sha256.Sum256(b)
		out = append(out, coreMigration{name: name, checksum: hex.EncodeToString(sum[:]), body: b})
	}
	return out, nil
}

func inventoryContract(inventory []coreMigration) string {
	h := sha256.New()
	for _, m := range inventory {
		fmt.Fprintf(h, "%s\x00%d\x00", m.name, len(m.body))
		_, _ = h.Write(m.body)
	}
	return hex.EncodeToString(h.Sum(nil))
}

// appliedPrefix refuses unknown, changed, or non-contiguous migration history.
// An older binary must not interpret a database after a newer schema change.
func appliedPrefix(inventory []coreMigration, applied map[string]string) (int, error) {
	n := 0
	for _, m := range inventory {
		checksum, ok := applied[m.name]
		if !ok {
			continue
		}
		if checksum != m.checksum {
			return 0, fmt.Errorf("migration %s has a different checksum", m.name)
		}
		if n >= len(inventory) || inventory[n].name != m.name {
			return 0, fmt.Errorf("migration history has a gap before %s", m.name)
		}
		n++
	}
	if n != len(applied) {
		return 0, fmt.Errorf("database includes migrations unknown to this core")
	}
	return n, nil
}

func validateMigrationPermit(inventory []coreMigration, applied map[string]string, p runtimecontract.PrepareRequest) error {
	if p.ExpectedSchemaAfter != "" && p.ExpectedSchemaAfter != inventoryContract(inventory) {
		return fmt.Errorf("target schema differs from embedded migrations")
	}
	n, err := appliedPrefix(inventory, applied)
	if err != nil {
		return err
	}
	if p.ExpectedSchemaBefore == "" {
		if p.Bootstrap {
			return nil
		}
		return fmt.Errorf("non-bootstrap migration requires expected_schema_before")
	}
	before := -1
	for i := 0; i <= len(inventory); i++ {
		if inventoryContract(inventory[:i]) == p.ExpectedSchemaBefore {
			before = i
			break
		}
	}
	if before < 0 {
		return fmt.Errorf("approved source schema is not a compatible prefix of embedded migrations")
	}
	if n < before {
		return fmt.Errorf("database schema is older than the approved source schema")
	}
	return nil
}

type permittedCoreTracker struct {
	store.CoreTracker
	inventory []coreMigration
	permit    runtimecontract.PrepareRequest
}

func (t permittedCoreTracker) Applied(ctx context.Context, q store.Querier) (map[string]string, error) {
	applied, err := t.CoreTracker.Applied(ctx, q)
	if err != nil {
		return nil, err
	}
	// Store.Migrate calls Applied after taking its existing database migration
	// lock, so another migration cannot change the precondition in between.
	if err = validateMigrationPermit(t.inventory, applied, t.permit); err != nil {
		return nil, err
	}
	return applied, nil
}

func prepareCoreSchema(ctx context.Context, db *store.DB, p runtimecontract.PrepareRequest) ([]string, error) {
	inventory, err := migrationInventory(migrations.FS)
	if err != nil {
		return nil, err
	}
	if p.ExpectedSchemaAfter != "" && p.ExpectedSchemaAfter != inventoryContract(inventory) {
		return nil, fmt.Errorf("target schema differs from embedded migrations")
	}
	if !p.AllowMigration {
		return nil, verifyCoreSchema(ctx, db)
	}
	applied, err := (store.CoreTracker{}).Applied(ctx, db.Pool)
	if err != nil {
		var pgerr *pgconn.PgError
		if !p.Bootstrap || !errors.As(err, &pgerr) || pgerr.Code != "42P01" {
			return nil, err
		}
		applied = map[string]string{}
	}
	if err = validateMigrationPermit(inventory, applied, p); err != nil {
		return nil, err
	}
	tracker := permittedCoreTracker{inventory: inventory, permit: p}
	names, err := store.Migrate(ctx, db, migrations.FS, tracker, store.MigrateOptions{LockKey: store.CoreMigrationLockKey})
	if err != nil {
		return names, err
	}
	return names, verifyCoreSchema(ctx, db)
}

// SchemaContract identifies the exact embedded migration inventory. It is
// available before any configuration, database connection or initialization.
func SchemaContract() (string, error) {
	inventory, err := migrationInventory(migrations.FS)
	if err != nil {
		return "", err
	}
	return inventoryContract(inventory), nil
}

// verifyCoreSchema never creates a tracker or runs SQL migrations. A prepared
// candidate requires exactly its known migrations. Once a maintenance upgrade
// changes the database, an older binary cannot safely infer compatibility.
func verifyCoreSchema(ctx context.Context, db *store.DB) error {
	applied, err := (store.CoreTracker{}).Applied(ctx, db.Pool)
	if err != nil {
		return err
	}
	inventory, err := migrationInventory(migrations.FS)
	if err != nil {
		return err
	}
	n, err := appliedPrefix(inventory, applied)
	if err != nil {
		return err
	}
	if n != len(inventory) {
		return fmt.Errorf("core schema is missing %d migrations; explicit migration approval required", len(inventory)-n)
	}
	return nil
}

func verifyAdmission(ctx context.Context, db *store.DB, node string, a runtimecontract.Admission) error {
	var approved bool
	err := db.Pool.QueryRow(ctx, `SELECT EXISTS(SELECT 1 FROM updater.node_admissions
		WHERE node_id=$1 AND core_boot_id=$2 AND release_digest=$3 AND revision=$4
		AND serve_http=$5 AND claim_background=$6 AND coordinate_plugins=$7)`, node, a.BootID, a.ReleaseDigest, a.Revision, a.ServeHTTP, a.ClaimBackground, a.CoordinatePlugins).Scan(&approved)
	if err != nil {
		return err
	}
	if !approved {
		return fmt.Errorf("admission not approved")
	}
	return nil
}

// A supervisor can refresh a serving boot's permit before posting the new
// revision to its socket. This is not a revocation if identity and all already
// granted roles remain valid. New roles still require exact ApplyAdmission.
func verifyLiveAdmission(ctx context.Context, db *store.DB, node string, a runtimecontract.Admission) error {
	var valid bool
	err := db.Pool.QueryRow(ctx, `SELECT EXISTS(SELECT 1 FROM updater.node_admissions
		WHERE node_id=$1 AND core_boot_id=$2 AND release_digest=$3 AND revision >= $4
		AND (NOT $5 OR serve_http) AND (NOT $6 OR claim_background) AND (NOT $7 OR coordinate_plugins))`, node, a.BootID, a.ReleaseDigest, a.Revision, a.ServeHTTP, a.ClaimBackground, a.CoordinatePlugins).Scan(&valid)
	if err != nil {
		return err
	}
	if !valid {
		return fmt.Errorf("running admission revoked")
	}
	return nil
}

// Readiness follows the actual approved plugin catalog, including third-party
// plugins. Bundled versions do not impose a minimum or resurrect removed rows.
// During a live rollout either approved generation is allowed to keep serving.
func approvedPluginsReady(ctx context.Context, db *store.DB, reg core.PluginRegistry, hostVersion string) (string, error) {
	gen := reg.Current()
	rows, err := db.Pool.Query(ctx, `SELECT p.key,p.status,COALESCE(p.active_version,''),p.row_version,
		COALESCE(r.from_version,''),COALESCE(r.target_version,'')
		FROM plugins p LEFT JOIN plugin_rollouts r ON r.plugin_key=p.key AND r.phase IN ('preparing','activating') ORDER BY p.key`)
	if err != nil {
		return "", err
	}
	type row struct {
		key, status, active, from, target string
		revision                          int64
	}
	var plugins []row
	for rows.Next() {
		var p row
		if err = rows.Scan(&p.key, &p.status, &p.active, &p.revision, &p.from, &p.target); err != nil {
			rows.Close()
			return "", err
		}
		plugins = append(plugins, p)
	}
	err = rows.Err()
	rows.Close()
	if err != nil {
		return "", err
	}
	var evidence []string
	for _, p := range plugins {
		evidence = append(evidence, fmt.Sprintf("%s:%d", p.key, p.revision))
		if p.status != "enabled" && p.status != "upgrading" {
			continue
		}
		if gen == nil {
			return "", fmt.Errorf("plugin %s has not loaded", p.key)
		}
		local, ok := gen.Plugin(p.key)
		if !ok || (local.Version != p.active && local.Version != p.from && local.Version != p.target) {
			return "", fmt.Errorf("plugin %s has not converged to an approved version", p.key)
		}
		var approved bool
		if err = db.Pool.QueryRow(ctx, `SELECT EXISTS(SELECT 1 FROM plugin_versions WHERE plugin_key=$1 AND version=$2 AND consent_status='approved')`, p.key, local.Version).Scan(&approved); err != nil {
			return "", err
		}
		if !approved {
			return "", fmt.Errorf("plugin %s approval is missing", p.key)
		}
		if local.Manifest == nil {
			return "", fmt.Errorf("plugin %s manifest is missing", p.key)
		}
		grantRows, err := db.Pool.Query(ctx, `SELECT permission FROM plugin_permission_grants WHERE plugin_key=$1 AND status='granted' ORDER BY permission`, p.key)
		if err != nil {
			return "", err
		}
		granted := map[string]bool{}
		for grantRows.Next() {
			var permission string
			if err = grantRows.Scan(&permission); err != nil {
				grantRows.Close()
				return "", err
			}
			granted[permission] = true
		}
		err = grantRows.Err()
		grantRows.Close()
		if err != nil {
			return "", err
		}
		for _, permission := range local.GrantedPermissions {
			if !granted[permission] {
				return "", fmt.Errorf("plugin %s permission revocation has not converged", p.key)
			}
		}
		for _, permission := range local.Manifest.HostPermissions {
			if !permission.Optional && !granted[permission.ID] {
				return "", fmt.Errorf("plugin %s required permission %s is not granted", p.key, permission.ID)
			}
		}
		compatible, err := check.HostCompatible(local.Manifest.HostCompat, hostVersion)
		if err != nil || !compatible {
			return "", fmt.Errorf("plugin %s is incompatible with core %s", p.key, hostVersion)
		}
	}
	sort.Strings(evidence)
	sum := sha256.Sum256([]byte(strings.Join(evidence, "\n")))
	return hex.EncodeToString(sum[:]), nil
}
