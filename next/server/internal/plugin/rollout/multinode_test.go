package rollout

import (
	"context"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/testutil"
	"testing"
)

func TestDisabledPluginDoesNotAcknowledgeWhileDraining(t *testing.T) {
	c := newTestController(t, &stubRuntime{}, nil, t.TempDir())
	inst := newStub(loadPkg(t, t.TempDir(), "drain", "1.0.0"))
	inst.block = make(chan struct{})
	c.serveForTest(inst)
	row := &pluginRow{key: "drain", status: "disabled", rowVersion: 2, uninstalling: true}
	st := c.reconcileKey(context.Background(), c.slotFor("drain"), row)
	if st.State != "draining" {
		t.Fatalf("premature stop ack: %+v", st)
	}
	close(inst.block)
	c.wg.Wait()
	st = c.reconcileKey(context.Background(), c.slotFor("drain"), row)
	if st.State != "stopped" {
		t.Fatalf("drained state: %+v", st)
	}
}

func TestOldCoordinatorCannotFailTakenOverRollout(t *testing.T) {
	db := testutil.DB(t)
	ctx := context.Background()
	if _, err := db.Pool.Exec(ctx, `INSERT INTO plugins(key,name,status) VALUES('fenced','{}','enabling')`); err != nil {
		t.Fatal(err)
	}
	var id int64
	if err := db.Pool.QueryRow(ctx, `INSERT INTO plugin_rollouts(plugin_key,action,phase,coordinator_boot_id,coordinator_lease_until,row_version)
 VALUES('fenced','enable','preparing','new-boot',now()+interval '1 minute',2) RETURNING id`).Scan(&id); err != nil {
		t.Fatal(err)
	}
	c := &Controller{o: Options{DB: db, Node: memNode{"old-boot"}}}
	ok, err := c.finishFailed(ctx, &rolloutRow{id: id, key: "fenced", action: "enable", rowVersion: 1}, PhaseFailed, "late failure", true)
	if err != nil || ok {
		t.Fatalf("stale coordinator changed new rollout: ok=%v err=%v", ok, err)
	}
	var phase, status string
	if err := db.Pool.QueryRow(ctx, `SELECT phase,p.status FROM plugin_rollouts r JOIN plugins p ON p.key=r.plugin_key WHERE r.id=$1`, id).Scan(&phase, &status); err != nil {
		t.Fatal(err)
	}
	if phase != "preparing" || status != "enabling" {
		t.Fatal(phase, status)
	}
}
