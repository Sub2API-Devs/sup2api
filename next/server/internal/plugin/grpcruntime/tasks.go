package grpcruntime

import (
	"context"
	"time"

	"google.golang.org/grpc/codes"
	"google.golang.org/grpc/status"

	pluginv1 "github.com/Sub2API-Devs/sup2api/next/sdk/gen/pluginv1"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/core"
)

// Runtime tasks (grant "jobs", Host API 9, CONTRACTS §77.8). The core half
// lives in internal/job; this file only checks the grant and converts.

func (h *hostServer) pluginTasks(ctx context.Context) (core.PluginTasks, error) {
	if err := h.require(ctx, "jobs"); err != nil {
		return nil, err
	}
	if h.i.rt.o.Tasks == nil {
		return nil, status.Error(codes.Unavailable, "scheduled tasks unavailable")
	}
	return h.i.rt.o.Tasks, nil
}

func fromPluginTask(t *pluginv1.PluginTask) core.PluginTask {
	return core.PluginTask{ID: t.GetId(), Schedule: t.GetSchedule(), Args: t.GetArgs(), TimeoutSec: int(t.GetTimeoutSec())}
}

func (h *hostServer) SyncTasks(ctx context.Context, in *pluginv1.SyncTasksRequest) (*pluginv1.SyncTasksResponse, error) {
	tasks, err := h.pluginTasks(ctx)
	if err != nil {
		return nil, err
	}
	list := make([]core.PluginTask, 0, len(in.GetTasks()))
	for _, t := range in.GetTasks() {
		list = append(list, fromPluginTask(t))
	}
	ignored, err := tasks.SyncPluginTasks(ctx, h.key(), h.i.pkg.Version, list)
	if err != nil {
		return nil, toStatus(err)
	}
	return &pluginv1.SyncTasksResponse{Ignored: ignored}, nil
}

func (h *hostServer) UpsertTask(ctx context.Context, in *pluginv1.UpsertTaskRequest) (*pluginv1.UpsertTaskResponse, error) {
	tasks, err := h.pluginTasks(ctx)
	if err != nil {
		return nil, err
	}
	if in.GetTask() == nil {
		return nil, status.Error(codes.InvalidArgument, "task is required")
	}
	ignored, err := tasks.UpsertPluginTask(ctx, h.key(), h.i.pkg.Version, fromPluginTask(in.GetTask()))
	if err != nil {
		return nil, toStatus(err)
	}
	return &pluginv1.UpsertTaskResponse{Ignored: ignored}, nil
}

func (h *hostServer) DeleteTask(ctx context.Context, in *pluginv1.DeleteTaskRequest) (*pluginv1.DeleteTaskResponse, error) {
	tasks, err := h.pluginTasks(ctx)
	if err != nil {
		return nil, err
	}
	ignored, deleted, err := tasks.DeletePluginTask(ctx, h.key(), h.i.pkg.Version, in.GetId())
	if err != nil {
		return nil, toStatus(err)
	}
	return &pluginv1.DeleteTaskResponse{Ignored: ignored, Deleted: deleted}, nil
}

func (h *hostServer) ListTasks(ctx context.Context, _ *pluginv1.ListTasksRequest) (*pluginv1.ListTasksResponse, error) {
	tasks, err := h.pluginTasks(ctx)
	if err != nil {
		return nil, err
	}
	list, err := tasks.ListPluginTasks(ctx, h.key())
	if err != nil {
		return nil, toStatus(err)
	}
	out := &pluginv1.ListTasksResponse{}
	for _, t := range list {
		out.Tasks = append(out.Tasks, &pluginv1.PluginTask{Id: t.ID, Schedule: t.Schedule, Args: t.Args,
			TimeoutSec: int32(t.TimeoutSec), Enabled: t.Enabled})
	}
	return out, nil
}

func (h *hostServer) EnqueueTask(ctx context.Context, in *pluginv1.EnqueueTaskRequest) (*pluginv1.EnqueueTaskResponse, error) {
	tasks, err := h.pluginTasks(ctx)
	if err != nil {
		return nil, err
	}
	opts := core.EnqueueOpts{UniqueKey: in.GetUniqueKey()}
	if in.GetRunAtUnix() > 0 {
		opts.RunAt = time.Unix(in.GetRunAtUnix(), 0)
	}
	if err := tasks.EnqueuePluginTask(ctx, h.key(), in.GetId(), in.GetArgs(), opts); err != nil {
		return nil, toStatus(err)
	}
	return &pluginv1.EnqueueTaskResponse{}, nil
}
