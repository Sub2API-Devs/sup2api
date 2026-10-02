package rollout

import (
	"context"
	"testing"

	"github.com/Sub2API-Devs/sup2api/next/server/internal/testutil"
)

// A reconcile pass reads the plugins row and the active rollouts with two
// queries. An Enable committing between them hands the pass the new
// preparing rollout together with the old row_version; the standby must be
// reported pending and started by the next pass, not fail the rollout.
func TestStaleReconcileReadDefersStandbyInsteadOfFailingRollout(t *testing.T) {
	db := testutil.DB(t)
	ctx := context.Background()
	dir := t.TempDir()
	rt := &stubRuntime{}
	c := newTestController(t, rt, nil, dir)
	c.o.DB = db
	c.o.Packages.Adopt(loadPkg(t, dir, "stale", "2.0.0"))
	// Committed state after Enable: generation 5 and a preparing rollout.
	if _, err := db.Pool.Exec(ctx, `INSERT INTO plugins(key,name,status,row_version) VALUES('stale','{}','enabling',5)`); err != nil {
		t.Fatal(err)
	}
	var id int64
	if err := db.Pool.QueryRow(ctx, `INSERT INTO plugin_rollouts(plugin_key,action,target_version,phase) VALUES('stale','enable','2.0.0','preparing') RETURNING id`).Scan(&id); err != nil {
		t.Fatal(err)
	}
	target := "2.0.0"
	ro := &rolloutRow{id: id, key: "stale", action: "enable", target: &target, phase: PhasePreparing}
	s := c.slotFor("stale")

	// The torn read: plugins row from before the Enable, rollout from after.
	st := c.reconcileKey(ctx, s, &pluginRow{key: "stale", status: "disabled", rowVersion: 4, ro: ro})
	if st.Rollout != NodePending || st.RolloutID != id || rt.loads != 0 {
		t.Fatalf("stale read reported %q (%s) after %d loads; want pending without a start", st.Rollout, st.Error, rt.loads)
	}
	// The next pass reads the current generation and prepares the standby.
	st = c.reconcileKey(ctx, s, &pluginRow{key: "stale", status: "enabling", rowVersion: 5, ro: ro})
	if st.Rollout != NodeReady || rt.loads != 1 {
		t.Fatalf("current read reported %q (%s) after %d loads; want ready", st.Rollout, st.Error, rt.loads)
	}
}
