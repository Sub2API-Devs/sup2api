package cluster

import (
	"context"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/testutil"
	"testing"
)

func TestCoreUpdateBusy(t *testing.T) {
	db := testutil.DB(t)
	ctx := context.Background()
	if busy, err := CoreUpdateBusy(ctx, db.Pool); err != nil || busy {
		t.Fatal(busy, err)
	}
	if _, err := db.Pool.Exec(ctx, `CREATE SCHEMA updater; CREATE TABLE updater.upgrades(status text); INSERT INTO updater.upgrades VALUES('running')`); err != nil {
		t.Fatal(err)
	}
	for _, state := range []string{"running", "paused", "completed", "cancelled", "failed", "superseded"} {
		if _, err := db.Pool.Exec(ctx, `UPDATE updater.upgrades SET status=$1`, state); err != nil {
			t.Fatal(err)
		}
		if busy, err := CoreUpdateBusy(ctx, db.Pool); err != nil || busy != (state == "running" || state == "paused") {
			t.Fatal(state, busy, err)
		}
	}
	cancelled, cancel := context.WithCancel(ctx)
	cancel()
	if _, err := CoreUpdateBusy(cancelled, db.Pool); err == nil {
		t.Fatal("database read failure hidden")
	}
}
