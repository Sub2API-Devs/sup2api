package core

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"time"

	"github.com/jackc/pgx/v5"
)

// ============================================================ scheduled tasks (TASK-FRAMEWORK-DESIGN §4)
//
// Not to be confused with AsyncTasks (ports_tasks.go), the durable identities
// of plugins' asynchronous upstream tasks.

// TaskScope says where a scheduled task runs.
type TaskScope string

const (
	// TaskNode runs on every node, each on its own schedule (gocron).
	TaskNode TaskScope = "node"
	// TaskCluster runs once per cluster per slot, on one node allowed to do
	// background work (River).
	TaskCluster TaskScope = "cluster"
)

// Scheduled task broadcast channels.
const (
	// ChannelTaskRun asks nodes to run a node task now:
	// {"name": ..., "node_id": ...} (no node_id: every node).
	ChannelTaskRun = "task:run"
	// ChannelTaskChanged announces a change of the cluster task registry
	// (plugin runtime tasks); nodes rebuild their periodic configuration.
	ChannelTaskChanged = "task:changed"
)

// TaskSpec registers one scheduled task.
type TaskSpec struct {
	// Name is unique: core.<package>.<task> (plugin.<key>.<id> for plugin
	// tasks, prefixed by the framework).
	Name string
	// Title and Description are shown on the console; Title needs en and zh.
	Title       LocalizedText
	Description LocalizedText
	Scope       TaskScope
	// Every or Cron (5 fields, UTC) is the schedule; a cluster task with
	// neither only runs what Enqueue submits. "@every" slots are aligned to
	// multiples of the interval.
	Every time.Duration
	Cron  string
	// Timeout bounds one run: at most 1 hour for a cluster task, 10 minutes
	// for a node task.
	Timeout time.Duration
	// RunOnStart: a node task runs once as soon as it is registered; a cluster
	// task is enqueued once when a new leader takes over (the slot it falls
	// in is still enqueued only once).
	RunOnStart bool
	// RequireWork (node tasks only) skips runs while this node may not do
	// background work. By default a node task runs on every node from start.
	RequireWork bool
	// MaxAttempts (cluster tasks only): 0 takes the default, 1 for a periodic
	// task more frequent than every 10 minutes (the next slot is its retry),
	// 5 otherwise.
	MaxAttempts int
	Handler     TaskHandler
}

// TaskHandler runs one run of a task. It must be idempotent and honor ctx
// (timeout, shutdown and withdrawn admission all cancel it); it does not
// check admission, lock or recover panics itself.
type TaskHandler func(ctx context.Context, run TaskRun) (TaskResult, error)

// TaskRun describes the run a handler is called for.
type TaskRun struct {
	Name        string
	ScheduledAt time.Time       // the planned time; for a manual run, the request time
	Attempt     int             // from 1; always 1 for node tasks
	Args        json.RawMessage // the arguments of an enqueued run; nil for a periodic one
	Manual      bool
	NodeID      string // the node running it
}

// TaskResult is what one run reports to its run record.
type TaskResult struct {
	Count   int    // items handled
	Message string // at most 2000 characters are kept
}

// Tasks registers and triggers scheduled tasks. Business code depends on this
// port only, never on gocron or River.
type Tasks interface {
	// Register adds a task; a duplicate name or an invalid spec is an error
	// wrapping ErrTaskInvalid. It may be called before or after start.
	Register(TaskSpec) error
	// Trigger runs a task once now: a node task on this node (skipped while
	// its previous run is still going), a cluster task as a manual run
	// (only one manual run waits at a time).
	Trigger(ctx context.Context, name string) error
	// Enqueue submits one run of a cluster task; EnqueueTx does so inside
	// the caller's transaction, so a rollback submits nothing.
	Enqueue(ctx context.Context, name string, args any, opts EnqueueOpts) error
	EnqueueTx(ctx context.Context, tx pgx.Tx, name string, args any, opts EnqueueOpts) error
}

// EnqueueOpts tunes one Enqueue.
type EnqueueOpts struct {
	RunAt     time.Time // zero: now
	UniqueKey string    // keep one unfinished run per task and key
}

var (
	ErrTaskUnknown  = errors.New("task: unknown task")
	ErrTaskInvalid  = errors.New("task: invalid spec")
	ErrTaskNotReady = errors.New("task: backend not ready")
)

// TaskRetryAfterError asks for the run to be retried after Delay without
// counting as a failure (River JobSnooze). For a node task it is a skip.
type TaskRetryAfterError struct{ Delay time.Duration }

func (e *TaskRetryAfterError) Error() string {
	return fmt.Sprintf("task: retry after %s", e.Delay)
}

// TaskRetryAfter returns a TaskRetryAfterError for d.
func TaskRetryAfter(d time.Duration) error { return &TaskRetryAfterError{Delay: d} }
