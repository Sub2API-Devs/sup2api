package pluginsdk

import (
	"context"
	"encoding/json"
	"errors"
	"testing"
	"time"

	"google.golang.org/grpc"

	pluginv1 "github.com/Sub2API-Devs/sup2api/next/sdk/gen/pluginv1"
)

type taskHost struct {
	pluginv1.HostServiceClient
	sync    *pluginv1.SyncTasksRequest
	upsert  *pluginv1.UpsertTaskRequest
	enqueue *pluginv1.EnqueueTaskRequest
	list    []*pluginv1.PluginTask
}

func (h *taskHost) SyncTasks(_ context.Context, in *pluginv1.SyncTasksRequest, _ ...grpc.CallOption) (*pluginv1.SyncTasksResponse, error) {
	h.sync = in
	return &pluginv1.SyncTasksResponse{}, nil
}

func (h *taskHost) UpsertTask(_ context.Context, in *pluginv1.UpsertTaskRequest, _ ...grpc.CallOption) (*pluginv1.UpsertTaskResponse, error) {
	h.upsert = in
	return &pluginv1.UpsertTaskResponse{}, nil
}

func (h *taskHost) EnqueueTask(_ context.Context, in *pluginv1.EnqueueTaskRequest, _ ...grpc.CallOption) (*pluginv1.EnqueueTaskResponse, error) {
	h.enqueue = in
	return &pluginv1.EnqueueTaskResponse{}, nil
}

func (h *taskHost) ListTasks(context.Context, *pluginv1.ListTasksRequest, ...grpc.CallOption) (*pluginv1.ListTasksResponse, error) {
	return &pluginv1.ListTasksResponse{Tasks: h.list}, nil
}

func TestTasksClient(t *testing.T) {
	fake := &taskHost{}
	h := newHost(HostInfo{HostAPIVersion: 9}, fake, nil, false, 0)
	ctx := context.Background()
	err := h.Tasks().Sync(ctx, []Task{
		{ID: "evaluate", Every: 10 * time.Second, Timeout: time.Minute, Args: json.RawMessage(`{"window":10}`)},
		{ID: "nightly", Cron: "0 3 * * *"},
		{ID: "review"},
	})
	if err != nil {
		t.Fatal(err)
	}
	got := fake.sync.GetTasks()
	if len(got) != 3 || got[0].GetSchedule() != "@every 10s" || got[0].GetTimeoutSec() != 60 || string(got[0].GetArgs()) != `{"window":10}` ||
		got[1].GetSchedule() != "0 3 * * *" || got[2].GetSchedule() != "" {
		t.Fatalf("sync request %v", got)
	}
	if err := h.Tasks().Upsert(ctx, Task{ID: "x", Every: 1500 * time.Millisecond}); err == nil {
		t.Fatal("a fractional interval must be rejected")
	}
	if err := h.Tasks().Upsert(ctx, Task{ID: "x", Every: time.Minute, Cron: "* * * * *"}); err == nil {
		t.Fatal("Every and Cron together must be rejected")
	}

	at := time.Unix(1_800_000_000, 0)
	if err := h.Tasks().Enqueue(ctx, "review", map[string]int{"id": 7}, RunAt(at), UniqueKey("review:7")); err != nil {
		t.Fatal(err)
	}
	if e := fake.enqueue; e.GetId() != "review" || string(e.GetArgs()) != `{"id":7}` || e.GetRunAtUnix() != at.Unix() || e.GetUniqueKey() != "review:7" {
		t.Fatalf("enqueue request %v", e)
	}
	if err := h.Tasks().Enqueue(ctx, "review", json.RawMessage(`[1]`)); err != nil || string(fake.enqueue.GetArgs()) != `[1]` {
		t.Fatalf("raw args: %v %v", err, fake.enqueue)
	}

	fake.list = []*pluginv1.PluginTask{{Id: "evaluate", Schedule: "@every 10s", TimeoutSec: 60, Enabled: true}, {Id: "nightly", Schedule: "0 3 * * *"}}
	list, err := h.Tasks().List(ctx)
	if err != nil {
		t.Fatal(err)
	}
	if len(list) != 2 || list[0].Every != 10*time.Second || list[0].Timeout != time.Minute || !list[0].Enabled || list[1].Cron != "0 3 * * *" || list[1].Enabled {
		t.Fatalf("list %+v", list)
	}
}

func TestTasksNeedHostAPI9(t *testing.T) {
	h := newHost(HostInfo{HostAPIVersion: 8}, &taskHost{}, nil, false, 0)
	if err := h.Tasks().Sync(context.Background(), nil); !errors.Is(err, ErrTasksUnimplemented) {
		t.Fatalf("host API 8: %v", err)
	}
	if err := h.Tasks().Enqueue(context.Background(), "a", nil); !errors.Is(err, ErrTasksUnimplemented) {
		t.Fatalf("host API 8: %v", err)
	}
}
