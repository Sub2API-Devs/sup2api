package pluginsdk

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"strings"
	"time"

	pluginv1 "github.com/Sub2API-Devs/sup2api/next/sdk/gen/pluginv1"
	"github.com/Sub2API-Devs/sup2api/next/sdk/protocol"
)

// Runtime tasks (grant "jobs", Host API 9, CONTRACTS §77.8).
//
// A runtime task is a cluster task the plugin registers while it runs,
// besides the jobs its manifest declares: the host stores it, schedules it
// on the cluster (one run per slot) and calls RunJob with its id, scope
// "cluster" and its Args, like a manifest job, so the same JobMux serves
// both. Every node's instance may call Sync on start: only the instance of
// the plugin's active version changes anything, the calls of other versions
// during a rollout succeed and change nothing. An operator can stop a
// runtime task on the console; Sync and Upsert keep that switch.
//
//	tasks := host.Tasks()
//	err := tasks.Sync(ctx, []pluginsdk.Task{{ID: "evaluate", Every: 10 * time.Second, Timeout: time.Minute}})
//	if errors.Is(err, pluginsdk.ErrTasksUnimplemented) { /* older core: fall back */ }
//	err = tasks.Enqueue(ctx, "review", args, pluginsdk.RunAt(t), pluginsdk.UniqueKey(id))

// ErrTasksUnimplemented is returned by Tasks on a core before Host API 9
// (core 0.1.237). Treat it as non-fatal.
var ErrTasksUnimplemented = errors.New("pluginsdk: runtime tasks need host API 9 (core 0.1.237 or later)")

// Task is one runtime task.
type Task struct {
	// ID is ^[a-z0-9][a-z0-9_.-]{0,63}$ and not a manifest job id.
	ID string
	// Every (at least 10s) or Cron (5 fields, UTC) is the schedule; with
	// neither the task only runs what Enqueue submits.
	Every time.Duration
	Cron  string
	// Args is JSON passed to every periodic run (at most 64 KiB).
	Args json.RawMessage
	// Timeout bounds one run: 0 is 60s, at most 1 hour (whole seconds).
	Timeout time.Duration
	// Enabled is the console switch, read only (List).
	Enabled bool
}

// Tasks manages the runtime tasks of the plugin.
type Tasks interface {
	// Sync replaces all runtime tasks of the plugin with tasks (at most 200).
	Sync(ctx context.Context, tasks []Task) error
	// Upsert adds or changes one runtime task.
	Upsert(ctx context.Context, t Task) error
	// Delete removes one runtime task; runs already queued do not run.
	Delete(ctx context.Context, id string) error
	// List returns the runtime tasks of the plugin.
	List(ctx context.Context) ([]Task, error)
	// Enqueue submits one run of a runtime task or a cluster manifest job.
	// args is JSON-encoded (a json.RawMessage or []byte is sent as is).
	Enqueue(ctx context.Context, id string, args any, opts ...EnqueueOption) error
}

// EnqueueOption tunes one Enqueue.
type EnqueueOption func(*pluginv1.EnqueueTaskRequest)

// RunAt runs the enqueued run at t instead of now.
func RunAt(t time.Time) EnqueueOption {
	return func(r *pluginv1.EnqueueTaskRequest) { r.RunAtUnix = t.Unix() }
}

// UniqueKey keeps one unfinished run per task and key: a second Enqueue with
// the same key while one waits or runs submits nothing.
func UniqueKey(key string) EnqueueOption {
	return func(r *pluginv1.EnqueueTaskRequest) { r.UniqueKey = key }
}

type hostTasks struct{ h *host }

func (h *host) Tasks() Tasks { return hostTasks{h} }

func (t hostTasks) client() (pluginv1.HostServiceClient, error) {
	if t.h == nil || t.h.client == nil {
		return nil, ErrHostNotReady
	}
	if t.h.info.HostAPIVersion < protocol.TasksHostAPIVersion {
		return nil, ErrTasksUnimplemented
	}
	return t.h.client, nil
}

func toProtoTask(t Task) (*pluginv1.PluginTask, error) {
	if t.Every > 0 && t.Cron != "" {
		return nil, fmt.Errorf("pluginsdk: task %q: Every and Cron are exclusive", t.ID)
	}
	if t.Timeout%time.Second != 0 || t.Every%time.Second != 0 {
		return nil, fmt.Errorf("pluginsdk: task %q: Every and Timeout are whole seconds", t.ID)
	}
	p := &pluginv1.PluginTask{Id: t.ID, Schedule: t.Cron, Args: t.Args, TimeoutSec: int32(t.Timeout / time.Second)}
	if t.Every > 0 {
		p.Schedule = "@every " + t.Every.String()
	}
	return p, nil
}

func fromProtoTask(p *pluginv1.PluginTask) Task {
	t := Task{ID: p.GetId(), Timeout: time.Duration(p.GetTimeoutSec()) * time.Second, Enabled: p.GetEnabled()}
	if len(p.GetArgs()) > 0 {
		t.Args = json.RawMessage(p.GetArgs())
	}
	if rest, ok := strings.CutPrefix(p.GetSchedule(), "@every "); ok {
		t.Every, _ = time.ParseDuration(rest)
	} else {
		t.Cron = p.GetSchedule()
	}
	return t
}

func (t hostTasks) Sync(ctx context.Context, tasks []Task) error {
	c, err := t.client()
	if err != nil {
		return err
	}
	req := &pluginv1.SyncTasksRequest{}
	for _, task := range tasks {
		p, err := toProtoTask(task)
		if err != nil {
			return err
		}
		req.Tasks = append(req.Tasks, p)
	}
	_, err = c.SyncTasks(ctx, req)
	return err
}

func (t hostTasks) Upsert(ctx context.Context, task Task) error {
	c, err := t.client()
	if err != nil {
		return err
	}
	p, err := toProtoTask(task)
	if err != nil {
		return err
	}
	_, err = c.UpsertTask(ctx, &pluginv1.UpsertTaskRequest{Task: p})
	return err
}

func (t hostTasks) Delete(ctx context.Context, id string) error {
	c, err := t.client()
	if err != nil {
		return err
	}
	_, err = c.DeleteTask(ctx, &pluginv1.DeleteTaskRequest{Id: id})
	return err
}

func (t hostTasks) List(ctx context.Context) ([]Task, error) {
	c, err := t.client()
	if err != nil {
		return nil, err
	}
	resp, err := c.ListTasks(ctx, &pluginv1.ListTasksRequest{})
	if err != nil {
		return nil, err
	}
	out := make([]Task, 0, len(resp.GetTasks()))
	for _, p := range resp.GetTasks() {
		out = append(out, fromProtoTask(p))
	}
	return out, nil
}

func (t hostTasks) Enqueue(ctx context.Context, id string, args any, opts ...EnqueueOption) error {
	c, err := t.client()
	if err != nil {
		return err
	}
	req := &pluginv1.EnqueueTaskRequest{Id: id}
	switch v := args.(type) {
	case nil:
	case json.RawMessage:
		req.Args = v
	case []byte:
		req.Args = v
	default:
		if req.Args, err = json.Marshal(v); err != nil {
			return fmt.Errorf("pluginsdk: encode args of %q: %w", id, err)
		}
	}
	for _, o := range opts {
		o(req)
	}
	_, err = c.EnqueueTask(ctx, req)
	return err
}
