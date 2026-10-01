package rollout

import (
	"context"
	"testing"

	"github.com/Sub2API-Devs/sup2api/next/server/internal/core"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/migrations"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/testutil"
)

type deniedMutations struct{}

func (deniedMutations) Begin(ctx context.Context) (context.Context, func(), error) {
	return ctx, func() {}, core.ErrConflict.WithMessage("core update paused")
}

func TestRolloutEntryPointsRespectCoreUpdate(t *testing.T) {
	c := &Controller{o: Options{Mutations: deniedMutations{}}}
	ctx := context.Background()
	for _, fn := range []func() error{
		func() error { _, err := c.Enable(ctx, "plugin", 1); return err },
		func() error { _, err := c.Upgrade(ctx, "plugin", "2.0.0", 1); return err },
		func() error { _, err := c.Disable(ctx, "plugin", 1, ""); return err },
	} {
		if err := fn(); err == nil {
			t.Fatal("mutation passed core update barrier")
		}
	}
}

func TestTerminalRolloutCleanupRequiresCurrentGenerationAndFinishedDrain(t *testing.T) {
	db := testutil.DB(t)
	ctx := context.Background()
	c := newTestController(t, &stubRuntime{}, nil, t.TempDir())
	c.o.DB = db
	if _, err := db.Pool.Exec(ctx, `INSERT INTO plugins(key,name,status,row_version) VALUES('cleanup','{}','enabling',4);
		INSERT INTO plugin_runtime_nodes(plugin_key,boot_id)VALUES('cleanup','boot-self'),('cleanup','disconnected')`); err != nil {
		t.Fatal(err)
	}
	var id int64
	if err := db.Pool.QueryRow(ctx, `INSERT INTO plugin_rollouts(plugin_key,action,phase)VALUES('cleanup','enable','preparing')RETURNING id`).Scan(&id); err != nil {
		t.Fatal(err)
	}
	r := &rolloutRow{id: id, key: "cleanup", action: "enable"}
	if ok, err := c.finishFailed(ctx, r, PhaseFailed, "failed", false); err != nil || !ok {
		t.Fatal(ok, err)
	}
	count := func() int {
		var n int
		if err := db.Pool.QueryRow(ctx, `SELECT count(*)FROM plugin_rollout_cleanup WHERE state='cleanup_pending'`).Scan(&n); err != nil {
			t.Fatal(err)
		}
		return n
	}
	if count() != 2 {
		t.Fatal("disconnected boot lost its durable barrier")
	}
	c.acknowledgeCleanup(ctx, &pluginRow{key: "cleanup", rowVersion: 4})
	if count() != 2 {
		t.Fatal("stale reconciliation acknowledged newer failure")
	}
	c.draining["cleanup@2.0.0"] = 1
	c.acknowledgeCleanup(ctx, &pluginRow{key: "cleanup", rowVersion: 5})
	if count() != 2 {
		t.Fatal("unfinished drain acknowledged")
	}
	delete(c.draining, "cleanup@2.0.0")
	c.acknowledgeCleanup(ctx, &pluginRow{key: "cleanup", rowVersion: 5})
	if count() != 1 {
		t.Fatal("local drain failed to clear only its own barrier")
	}
	if err := c.registerRuntime(ctx, "cleanup", pVersionEpoch{"2.0.0", 4}); err == nil {
		t.Fatal("stale failed target restarted after cleanup")
	}
}

func TestCleanupMigrationKeepsOutcomeAndMovesDevelopmentBarrier(t *testing.T) {
	db := testutil.DB(t)
	ctx := context.Background()
	migration, err := migrations.FS.ReadFile("0021_plugin_rollout_cleanup.sql")
	if err != nil {
		t.Fatal(err)
	}
	// Rewind to the development layout, where the barrier overwrote outcomes.
	if _, err = db.Pool.Exec(ctx, `DROP TABLE plugin_rollout_cleanup;
		INSERT INTO plugins(key,name,status) VALUES('moved','{}','enabled');
		INSERT INTO plugin_rollouts(id,plugin_key,action,phase) VALUES(9001,'moved','enable','active');
		INSERT INTO plugin_rollout_nodes(rollout_id,node_id,boot_id,state) VALUES
			(9001,'node-a','boot-a','active'),(9001,'','boot-b','cleanup_pending'),(9001,'','boot-c','cleaned')`); err != nil {
		t.Fatal(err)
	}
	if _, err = db.Pool.Exec(ctx, string(migration)); err != nil {
		t.Fatal(err)
	}
	var outcomes, remaining, pending int
	if err = db.Pool.QueryRow(ctx, `SELECT (SELECT count(*) FROM plugin_rollout_nodes WHERE rollout_id=9001 AND state='active'),
		(SELECT count(*) FROM plugin_rollout_nodes WHERE rollout_id=9001),
		(SELECT count(*) FROM plugin_rollout_cleanup WHERE rollout_id=9001 AND state='cleanup_pending')`).Scan(&outcomes, &remaining, &pending); err != nil {
		t.Fatal(err)
	}
	if outcomes != 1 || remaining != 1 || pending != 1 {
		t.Fatalf("outcomes=%d remaining rows=%d moved pending=%d", outcomes, remaining, pending)
	}
}
