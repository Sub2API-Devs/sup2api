package app

import (
	"context"
	"io"
	"log/slog"
	"sync/atomic"
	"testing"
	"time"

	"github.com/alicebob/miniredis/v2"

	"github.com/Sub2API-Devs/sup2api/next/server/internal/background"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/cluster"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/config"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/core"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/plugin/registry"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/testutil"
)

func taskBoot(t *testing.T, canWork func() bool) *boot {
	t.Helper()
	db := testutil.DB(t)
	mr := miniredis.RunT(t)
	ctx := context.Background()
	rdb, err := cluster.OpenRedis(ctx, "redis://"+mr.Addr())
	if err != nil {
		t.Fatal(err)
	}
	log := slog.New(slog.NewTextHandler(io.Discard, nil))
	b := &boot{ctx: ctx, cfg: &config.Config{NodeID: "tasks-test"}, version: "test", log: log, stopper: newTeardown(),
		db: db, rdb: rdb, reg: registry.New(), canWork: canWork,
		cl:   cluster.New(rdb, db.Pool, cluster.Options{NodeID: "tasks-test", Logger: log}),
		work: background.New(2)}
	b.work.Admitted = canWork
	t.Cleanup(func() {
		if b.tasks != nil {
			b.tasks.Stop(context.Background())
		}
		if b.jobs != nil {
			_ = b.jobs.Stop(context.Background())
		}
		if b.dlv != nil {
			_ = b.dlv.Stop(context.Background())
		}
	})
	if err := b.buildTasks(); err != nil {
		t.Fatal(err)
	}
	return b
}

func eventually(t *testing.T, what string, cond func() bool) {
	t.Helper()
	deadline := time.Now().Add(10 * time.Second)
	for !cond() {
		if time.Now().After(deadline) {
			t.Fatalf("timed out waiting for %s", what)
		}
		time.Sleep(20 * time.Millisecond)
	}
}

// A standalone core runs node tasks from boot and cluster tasks once the
// background phase starts.
func TestTasksStandalone(t *testing.T) {
	b := taskBoot(t, nil)
	var nodeRuns atomic.Int32
	if err := b.tasks.Register(core.TaskSpec{Name: "core.test.node", Title: core.LocalizedText{"en": "Node", "zh": "节点"},
		Scope: core.TaskNode, Every: time.Hour, Timeout: time.Second, RunOnStart: true,
		Handler: func(context.Context, core.TaskRun) (core.TaskResult, error) {
			nodeRuns.Add(1)
			return core.TaskResult{}, nil
		},
	}); err != nil {
		t.Fatal(err)
	}
	eventually(t, "the node task's first run", func() bool { return nodeRuns.Load() == 1 })
	if b.tasks.ClusterRunning() {
		t.Fatal("cluster tasks run before the background phase")
	}
	if err := b.startBackground(); err != nil {
		t.Fatal(err)
	}
	eventually(t, "the cluster backend", b.tasks.ClusterRunning)
}

// A managed core starts River only while admission allows background work.
func TestTasksFollowManagedAdmission(t *testing.T) {
	var admitted atomic.Bool
	b := taskBoot(t, admitted.Load)
	if err := b.startBackground(); err != nil {
		t.Fatal(err)
	}
	time.Sleep(1500 * time.Millisecond)
	if b.tasks.ClusterRunning() {
		t.Fatal("River started before admission")
	}
	admitted.Store(true)
	eventually(t, "River started on admission", b.tasks.ClusterRunning)
	admitted.Store(false)
	eventually(t, "River stopped on drain", func() bool { return !b.tasks.ClusterRunning() })
}
