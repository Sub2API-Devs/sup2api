package pluginsdk

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"sync"
	"time"

	"google.golang.org/grpc/codes"
	"google.golang.org/grpc/status"

	pluginv1 "github.com/Sub2API-Devs/sup2api/next/sdk/gen/pluginv1"
)

// Background jobs ("app.jobs.v1", host permission "jobs").
//
// The manifest declares each job (jobs[]: id, schedule, timeoutSec, scope,
// title); the host calls RunJob when one is due. A cluster job (the default
// scope) runs once per slot on one node, a node job ("scope": "node") on
// every node, each on its own instance. Either may run again for the same
// slot (a retry, a rescued run, a rolling upgrade), so jobs are idempotent.

// JobRun describes the run RunJob is called for.
type JobRun struct {
	JobID       string
	ScheduledAt time.Time // the planned slot; the request time for a manual run
	Manual      bool      // started from the console
	// Scope, Attempt, RunID and Args are set by core 0.1.237 and later; an
	// older core leaves them empty (Attempt 0).
	Scope   string          // manifest.JobScopeCluster or manifest.JobScopeNode
	Attempt int             // from 1; always 1 for node jobs
	RunID   string          // the run's id on the console
	Args    json.RawMessage // the arguments of a one-off run; nil for a periodic run
}

// JobResult is what one run reports.
type JobResult struct {
	Message string // shown with the run; at most 2000 characters are kept
	Count   int    // items handled (core 0.1.237+)
	// RetryAfter > 0 says the run did nothing yet: a cluster job runs again
	// after it without counting as a failure, a node job is recorded as
	// skipped (core 0.1.237+; older cores record a success).
	RetryAfter time.Duration
	// ContinueAfter > 0 says the run did part of the work and has more: it
	// runs again after this delay with the same args, recorded as
	// "continued" (core 0.1.238+; older cores record a success and the next
	// scheduled run continues). Use it for work that may outlast the run's
	// timeout, see JobFunc.
	ContinueAfter time.Duration
}

// JobFunc runs one job. It must honor ctx: the job's timeout, shutdown and
// withdrawn admission all cancel it.
//
// A run lasts at most an hour (a cluster job; 10 minutes for a node job, see
// manifest.MaxClusterJobTimeoutSec), and a core release or plugin upgrade
// stops it after about 20 seconds, so do bounded batches instead of one long
// pass: read ctx.Deadline() rather than trusting the manifest timeout, stop
// a little before it, keep the progress in your own tables, and return
// ContinueAfter to go on (or let the next scheduled run go on). The
// moderation plugin's retention purge is the reference.
type JobFunc func(ctx context.Context, run JobRun) (JobResult, error)

// ErrUnknownJob is returned by JobMux for a job id without a handler.
var ErrUnknownJob = errors.New("pluginsdk: unknown job")

// JobMux dispatches RunJob by job id. Embed a *JobMux in the plugin to
// implement JobRunner:
//
//	p := &Plugin{JobMux: pluginsdk.NewJobMux()}
//	p.HandleJob("evaluate", p.evaluate)
//	p.HandleJob("cleanup", p.cleanup)
//
// A job without a handler fails with codes.NotFound, so a manifest job the
// binary forgot shows up as a failed run instead of a silent success.
type JobMux struct {
	mu       sync.RWMutex
	handlers map[string]JobFunc
}

// NewJobMux returns an empty mux.
func NewJobMux() *JobMux { return &JobMux{handlers: map[string]JobFunc{}} }

// HandleJob registers fn for job id, replacing any previous handler.
func (m *JobMux) HandleJob(id string, fn JobFunc) {
	if id == "" || fn == nil {
		panic("pluginsdk: HandleJob needs a job id and a function")
	}
	m.mu.Lock()
	defer m.mu.Unlock()
	if m.handlers == nil {
		m.handlers = map[string]JobFunc{}
	}
	m.handlers[id] = fn
}

// RunJob implements JobRunner.
func (m *JobMux) RunJob(ctx context.Context, in *pluginv1.RunJobRequest) (*pluginv1.RunJobResponse, error) {
	m.mu.RLock()
	fn := m.handlers[in.GetJobId()]
	m.mu.RUnlock()
	if fn == nil {
		return nil, status.Error(codes.NotFound, fmt.Sprintf("%v %q", ErrUnknownJob, in.GetJobId()))
	}
	run := JobRun{
		JobID:       in.GetJobId(),
		ScheduledAt: time.Unix(in.GetScheduledAtUnix(), 0).UTC(),
		Manual:      in.GetManual(),
		Scope:       in.GetScope(),
		Attempt:     int(in.GetAttempt()),
		RunID:       in.GetRunId(),
	}
	if len(in.GetArgs()) > 0 {
		run.Args = json.RawMessage(in.GetArgs())
	}
	res, err := fn(ctx, run)
	if err != nil {
		if _, ok := status.FromError(err); ok {
			return nil, err
		}
		if ctx.Err() != nil {
			return nil, status.FromContextError(ctx.Err()).Err()
		}
		return nil, status.Error(codes.Internal, err.Error())
	}
	out := &pluginv1.RunJobResponse{Message: res.Message, Count: int32(min(res.Count, int(^uint32(0)>>1)))}
	if res.RetryAfter > 0 {
		out.RetryAfterMs = max(res.RetryAfter.Milliseconds(), 1)
	}
	if res.ContinueAfter > 0 {
		out.ContinueAfterMs = max(res.ContinueAfter.Milliseconds(), 1)
	}
	return out, nil
}
