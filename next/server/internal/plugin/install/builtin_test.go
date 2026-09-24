package install

import (
	"context"
	"log/slog"
	"os"
	"path/filepath"
	"testing"

	"github.com/Sub2API-Devs/sup2api/next/server/internal/core"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/plugin/pkg/pkgtest"
)

func TestEnsureBuiltinInstallsEnablesAndBlocksUninstall(t *testing.T) {
	e := newEnv(t)
	ctx := context.Background()
	dir := t.TempDir()
	m := pkgtest.Guard("guard", "0.1.0", "sub2api")
	if err := os.WriteFile(filepath.Join(dir, "guard-0.1.0.s2plugin"), pkgtest.Build(m, e.root), 0o644); err != nil {
		t.Fatal(err)
	}
	log := slog.New(slog.DiscardHandler)

	if err := e.svc.EnsureBuiltin(ctx, dir, log); err != nil {
		t.Fatal(err)
	}
	var status string
	var builtin bool
	var active *string
	if err := e.db.Pool.QueryRow(ctx, `SELECT status, builtin, active_version FROM plugins WHERE key = 'guard'`).
		Scan(&status, &builtin, &active); err != nil {
		t.Fatal(err)
	}
	if !builtin || status != StatusEnabled || active == nil || *active != "0.1.0" || len(e.rollout.enabled) != 1 {
		t.Fatalf("after ensure: status=%s builtin=%v active=%v enabled=%v", status, builtin, active, e.rollout.enabled)
	}
	// Every requested host permission is granted, including critical ones,
	// without an operator; new plugin permissions went to the admin role.
	grants, err := LoadGrants(ctx, e.db.Pool, "guard")
	if err != nil {
		t.Fatal(err)
	}
	for _, hp := range m.HostPermissions {
		if g, ok := grants[hp.ID]; !ok || g.Status != GrantGranted {
			t.Fatalf("grant %s = %+v", hp.ID, g)
		}
	}
	if last := e.perms.syncs[len(e.perms.syncs)-1]; len(last.roles) != 1 || last.roles[0] != "admin" {
		t.Fatalf("permission roles = %v", last.roles)
	}

	// Idempotent: a second start changes nothing.
	if err := e.svc.EnsureBuiltin(ctx, dir, log); err != nil {
		t.Fatal(err)
	}
	if len(e.rollout.enabled) != 1 {
		t.Fatalf("enabled twice: %v", e.rollout.enabled)
	}

	// Uninstall is refused, disabled or not; a disabled one stays disabled.
	if _, err := e.svc.Uninstall(ctx, "guard", UninstallOptions{Purge: true, PurgeAccounts: true}, e.admin); core.AsError(err).Code != core.ErrPermissionDenied.Code {
		t.Fatalf("uninstall enabled builtin: %v", err)
	}
	if _, err := e.rollout.Disable(ctx, "guard", e.admin, "test"); err != nil {
		t.Fatal(err)
	}
	if _, err := e.svc.Uninstall(ctx, "guard", UninstallOptions{}, e.admin); core.AsError(err).Code != core.ErrPermissionDenied.Code {
		t.Fatalf("uninstall disabled builtin: %v", err)
	}
	if len(e.accounts.purged) != 0 {
		t.Fatalf("builtin accounts purged: %v", e.accounts.purged)
	}
	if err := e.svc.EnsureBuiltin(ctx, dir, log); err != nil {
		t.Fatal(err)
	}
	_ = e.db.Pool.QueryRow(ctx, `SELECT status FROM plugins WHERE key = 'guard'`).Scan(&status)
	if status != StatusDisabled || len(e.rollout.enabled) != 1 || len(e.schemas.dropped) != 0 {
		t.Fatalf("after restart: status=%s enabled=%v dropped=%v", status, e.rollout.enabled, e.schemas.dropped)
	}
}
