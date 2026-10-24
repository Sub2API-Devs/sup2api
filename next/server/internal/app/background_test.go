package app

import (
	"context"
	"io"
	"log/slog"
	"strings"
	"testing"

	"github.com/alicebob/miniredis/v2"

	"github.com/Sub2API-Devs/sup2api/next/server/internal/background"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/cluster"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/config"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/plugin/registry"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/testutil"
)

// A managed core builds the job scheduler and the delivery loop once and hands
// them to the console (plugin/api Deps). Admission runs the same callback
// again; it must start those instances, not build new ones the console does
// not know about (a manual job run reached an unstarted scheduler and always
// answered "job scheduler is not running").
func TestBackgroundBuiltOnceForAdmission(t *testing.T) {
	db := testutil.DB(t)
	mr := miniredis.RunT(t)
	ctx := context.Background()
	rdb, err := cluster.OpenRedis(ctx, "redis://"+mr.Addr())
	if err != nil {
		t.Fatal(err)
	}
	log := slog.New(slog.NewTextHandler(io.Discard, nil))
	b := &boot{
		ctx:     ctx,
		cfg:     &config.Config{NodeID: "background-test"},
		log:     log,
		managed: &managedCore{mode: "prepared"},
		stopper: newTeardown(),
		db:      db,
		reg:     registry.New(),
		cl:      cluster.New(rdb, db.Pool, cluster.Options{NodeID: "background-test", Logger: log}),
		work:    background.New(2),
	}
	t.Cleanup(func() {
		if b.jobs != nil {
			_ = b.jobs.Stop(context.Background())
		}
		if b.dlv != nil {
			_ = b.dlv.Stop(context.Background())
		}
	})
	// The boot path builds them (a managed core does not start them yet).
	if err := b.startBackground(); err != nil {
		t.Fatal(err)
	}
	// The console is handed these; admission runs the same callback.
	console := b.jobs
	if err := b.startBackground(); err != nil {
		t.Fatal(err)
	}
	if b.jobs != console {
		t.Fatal("admission rebuilt the scheduler the console holds")
	}
	// The scheduler the console holds is the one that started: it no longer
	// answers "not running" (an unknown job is a lookup failure instead).
	if err := console.RunNow(ctx, "missing-plugin", "missing-job", 0); err == nil || strings.Contains(err.Error(), "not running") {
		t.Fatalf("the console's scheduler was not started: %v", err)
	}
}
