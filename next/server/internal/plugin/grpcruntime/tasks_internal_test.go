package grpcruntime

import (
	"context"
	"encoding/json"
	"testing"
	"time"

	"google.golang.org/grpc/codes"
	"google.golang.org/grpc/status"

	pluginv1 "github.com/Sub2API-Devs/sup2api/next/sdk/gen/pluginv1"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/core"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/plugin/registry"
)

type fakePluginTasks struct {
	key, version string
	synced       []core.PluginTask
	enqueued     core.EnqueueOpts
	err          error
}

func (f *fakePluginTasks) SyncPluginTasks(_ context.Context, key, version string, tasks []core.PluginTask) (bool, error) {
	f.key, f.version, f.synced = key, version, tasks
	return false, f.err
}
func (f *fakePluginTasks) UpsertPluginTask(_ context.Context, key, version string, t core.PluginTask) (bool, error) {
	f.key, f.version, f.synced = key, version, []core.PluginTask{t}
	return true, f.err
}
func (f *fakePluginTasks) DeletePluginTask(_ context.Context, key, version, _ string) (bool, bool, error) {
	f.key, f.version = key, version
	return false, true, f.err
}
func (f *fakePluginTasks) ListPluginTasks(context.Context, string) ([]core.PluginTask, error) {
	return []core.PluginTask{{ID: "a", Schedule: "@every 1m0s", TimeoutSec: 60, Enabled: true}}, f.err
}
func (f *fakePluginTasks) EnqueuePluginTask(_ context.Context, key, _ string, _ json.RawMessage, opts core.EnqueueOpts) error {
	f.key, f.enqueued = key, opts
	return f.err
}

func TestHostRuntimeTasks(t *testing.T) {
	ctx := context.Background()
	i, _ := testInstance(t, nil, nil, registry.Grants{})
	h := &hostServer{i: i}
	if _, err := h.SyncTasks(ctx, &pluginv1.SyncTasksRequest{}); status.Code(err) != codes.PermissionDenied {
		t.Fatalf("sync without the jobs grant: %v", err)
	}

	i, _ = testInstance(t, nil, nil, registry.Grants{"jobs": json.RawMessage(`{}`)})
	h = &hostServer{i: i}
	if _, err := h.ListTasks(ctx, &pluginv1.ListTasksRequest{}); status.Code(err) != codes.Unavailable {
		t.Fatalf("list without the task service: %v", err)
	}
	fake := &fakePluginTasks{}
	i.rt.o.Tasks = fake
	if _, err := h.SyncTasks(ctx, &pluginv1.SyncTasksRequest{Tasks: []*pluginv1.PluginTask{{Id: "a", Schedule: "@every 1m", TimeoutSec: 30, Args: []byte(`{}`)}}}); err != nil {
		t.Fatal(err)
	}
	if fake.key != i.pkg.Key || fake.version != i.pkg.Version || len(fake.synced) != 1 || fake.synced[0].TimeoutSec != 30 || string(fake.synced[0].Args) != `{}` {
		t.Fatalf("sync got %+v", fake)
	}
	resp, err := h.UpsertTask(ctx, &pluginv1.UpsertTaskRequest{Task: &pluginv1.PluginTask{Id: "b"}})
	if err != nil || !resp.GetIgnored() {
		t.Fatalf("upsert: %v %v", resp, err)
	}
	if _, err := h.UpsertTask(ctx, &pluginv1.UpsertTaskRequest{}); status.Code(err) != codes.InvalidArgument {
		t.Fatalf("upsert without a task: %v", err)
	}
	if d, err := h.DeleteTask(ctx, &pluginv1.DeleteTaskRequest{Id: "b"}); err != nil || !d.GetDeleted() {
		t.Fatalf("delete: %v %v", d, err)
	}
	list, err := h.ListTasks(ctx, &pluginv1.ListTasksRequest{})
	if err != nil || len(list.GetTasks()) != 1 || !list.GetTasks()[0].GetEnabled() {
		t.Fatalf("list: %v %v", list, err)
	}
	at := time.Unix(1_800_000_000, 0)
	if _, err := h.EnqueueTask(ctx, &pluginv1.EnqueueTaskRequest{Id: "a", RunAtUnix: at.Unix(), UniqueKey: "k"}); err != nil {
		t.Fatal(err)
	}
	if !fake.enqueued.RunAt.Equal(at) || fake.enqueued.UniqueKey != "k" {
		t.Fatalf("enqueue got %+v", fake.enqueued)
	}
	fake.err = core.ErrRateLimited.WithMessage("at most 200 runtime tasks")
	if _, err := h.SyncTasks(ctx, &pluginv1.SyncTasksRequest{}); status.Code(err) != codes.ResourceExhausted {
		t.Fatalf("limit: %v", err)
	}
	fake.err = core.ErrNotFound.WithMessage("no enabled cluster task")
	if _, err := h.EnqueueTask(ctx, &pluginv1.EnqueueTaskRequest{Id: "x"}); status.Code(err) != codes.NotFound {
		t.Fatalf("unknown task: %v", err)
	}
}

// A run is bounded by the deadline the task framework set: runtime tasks have
// no manifest job, so the manifest default (60 s) must not cut them.
func TestRunJobUsesTheRunDeadline(t *testing.T) {
	i, _ := testInstance(t, nil, nil, registry.Grants{})
	var left time.Duration
	rpc := &appRPC{job: func(ctx context.Context, _ *pluginv1.RunJobRequest) (*pluginv1.RunJobResponse, error) {
		d, _ := ctx.Deadline()
		left = time.Until(d)
		return &pluginv1.RunJobResponse{}, nil
	}}
	i.proc.Store(&proc{app: rpc, limits: limitsOf(i.launchSpec())})
	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Minute)
	defer cancel()
	if _, err := (appAdapter{i}).RunJob(ctx, &pluginv1.RunJobRequest{JobId: "runtime-task"}); err != nil {
		t.Fatal(err)
	}
	if left < 29*time.Minute {
		t.Fatalf("run cut to %s, want the caller's 30 minutes", left)
	}
	if _, err := (appAdapter{i}).RunJob(context.Background(), &pluginv1.RunJobRequest{JobId: "runtime-task"}); err != nil {
		t.Fatal(err)
	}
	if left > TimeoutJobDefault {
		t.Fatalf("without a deadline the default applies, got %s", left)
	}
}
