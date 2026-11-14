package authz

import (
	"context"
	"testing"

	"github.com/Sub2API-Devs/sup2api/next/server/internal/testutil"
)

// Version is the authz version the node knows: the database's from the
// start, raised by every change it commits or hears of, without a query.
func TestVersion(t *testing.T) {
	t.Parallel()
	db := testutil.DB(t)
	bus := newMemBus()
	s := newService(t, db, bus, nil)
	stored := func() int64 {
		t.Helper()
		var v int64
		if err := db.Pool.QueryRow(context.Background(), `SELECT version FROM authz_meta WHERE id = 1`).Scan(&v); err != nil {
			t.Fatal(err)
		}
		return v
	}
	start := s.Version()
	if start == 0 || start != stored() {
		t.Fatalf("version after start: %d, stored %d", start, stored())
	}
	// A node starting on a synced database knows the version before any change.
	other := newService(t, db, bus, nil)
	if got := other.Version(); got != start {
		t.Fatalf("second node's version: %d, want %d", got, start)
	}

	uid := addUser(t, s, "v@example.com", RoleUser)
	changed := s.Version()
	if changed <= start || changed != stored() {
		t.Fatalf("version after a role change: %d (was %d, stored %d)", changed, start, stored())
	}
	if got := other.Version(); got != changed {
		t.Fatalf("the other node heard %d, want %d", got, changed)
	}
	set, err := s.PermissionSet(context.Background(), uid)
	if err != nil || set.Version != changed {
		t.Fatalf("permission set version: %d %v, want %d", set.Version, err, changed)
	}
}
