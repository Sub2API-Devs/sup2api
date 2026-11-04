package task

import (
	"context"
	"errors"
	"fmt"
	"log/slog"
	"strconv"
	"sync"
	"sync/atomic"
	"time"

	"github.com/go-co-op/gocron/v2"

	"github.com/Sub2API-Devs/sup2api/next/server/internal/core"
)

// nodeStopWait bounds how long Stop waits for running node tasks before it
// cancels them (TASK-FRAMEWORK-DESIGN §5.2).
var nodeStopWait = 20 * time.Second

// nodeBackend runs node tasks on this node with gocron (TASK-FRAMEWORK-DESIGN
// §6): no distributed lock, no leader. A task never overlaps itself here: a
// run that finds the previous one still going is recorded as skipped.
type nodeBackend struct {
	log     *slog.Logger
	nodeID  string
	canWork func() bool
	store   nodeStore
	sched   gocron.Scheduler

	runCtx     context.Context
	cancelRuns context.CancelFunc
	wg         sync.WaitGroup

	mu      sync.Mutex
	jobs    map[string]*nodeJob
	started bool
	stopped bool
	runSeq  atomic.Int64
	done    chan struct{}
}

type nodeJob struct {
	task    *Task
	job     gocron.Job
	running atomic.Bool
	mu      sync.Mutex
	state   NodeTaskState
}

func newNodeBackend(log *slog.Logger, nodeID string, canWork func() bool, store nodeStore) (*nodeBackend, error) {
	sched, err := gocron.NewScheduler(
		gocron.WithLocation(time.UTC),
		gocron.WithLogger(log),
		gocron.WithLimitConcurrentJobs(16, gocron.LimitModeReschedule),
	)
	if err != nil {
		return nil, err
	}
	ctx, cancel := context.WithCancel(context.Background())
	return &nodeBackend{log: log, nodeID: nodeID, canWork: canWork, store: store, sched: sched,
		runCtx: ctx, cancelRuns: cancel, jobs: map[string]*nodeJob{}, done: make(chan struct{})}, nil
}

func (b *nodeBackend) add(t *Task) error {
	nj := &nodeJob{task: t, state: NodeTaskState{Name: t.Name, Schedule: t.ScheduleText,
		TimeoutMS: t.Timeout.Milliseconds(), RequireWork: t.RequireWork}}
	var def gocron.JobDefinition
	if e, ok := t.Schedule.(Every); ok {
		def = gocron.DurationJob(time.Duration(e))
	} else {
		def = gocron.CronJob(t.Cron, false)
	}
	opts := []gocron.JobOption{gocron.WithName(t.Name)}
	if t.RunOnStart {
		opts = append(opts, gocron.WithStartAt(gocron.WithStartImmediately()))
	}
	b.mu.Lock()
	defer b.mu.Unlock()
	if b.stopped {
		return core.ErrTaskNotReady
	}
	job, err := b.sched.NewJob(def, gocron.NewTask(func() { b.run(nj, false) }), opts...)
	if err != nil {
		return fmt.Errorf("%w: %s: %v", core.ErrTaskInvalid, t.Name, err)
	}
	nj.job = job
	b.jobs[t.Name] = nj
	return nil
}

func (b *nodeBackend) remove(name string) {
	b.mu.Lock()
	nj := b.jobs[name]
	delete(b.jobs, name)
	b.mu.Unlock()
	if nj == nil {
		return
	}
	_ = b.sched.RemoveJob(nj.job.ID())
	if err := b.store.drop(b.runCtx, name); err != nil {
		b.log.Debug("task: drop node task state", "task", name, "err", err)
	}
}

func (b *nodeBackend) start(ctx context.Context) {
	b.mu.Lock()
	if b.started || b.stopped {
		b.mu.Unlock()
		return
	}
	b.started = true
	b.mu.Unlock()
	b.sched.Start()
	go b.refreshLoop()
}

// refreshLoop republishes every state (next run times) and keeps the Redis
// key alive while the node runs.
func (b *nodeBackend) refreshLoop() {
	t := time.NewTicker(nodeStateRefresh)
	defer t.Stop()
	for {
		select {
		case <-b.done:
			return
		case <-t.C:
			if err := b.store.refresh(b.runCtx, b.states()); err != nil {
				b.log.Debug("task: refresh node task states", "err", err)
			}
		}
	}
}

// states returns a snapshot of every node task's state.
func (b *nodeBackend) states() []NodeTaskState {
	b.mu.Lock()
	jobs := make([]*nodeJob, 0, len(b.jobs))
	for _, nj := range b.jobs {
		jobs = append(jobs, nj)
	}
	b.mu.Unlock()
	out := make([]NodeTaskState, 0, len(jobs))
	for _, nj := range jobs {
		out = append(out, nj.snapshot())
	}
	return out
}

func (nj *nodeJob) snapshot() NodeTaskState {
	nj.mu.Lock()
	st := nj.state
	nj.mu.Unlock()
	st.Running = nj.running.Load()
	if nj.job != nil {
		if next, err := nj.job.NextRun(); err == nil && !next.IsZero() {
			next = next.UTC()
			st.NextRunAt = &next
		}
	}
	return st
}

// trigger runs name once now on this node, outside its schedule.
func (b *nodeBackend) trigger(name string) error {
	b.mu.Lock()
	nj := b.jobs[name]
	stopped := b.stopped
	b.mu.Unlock()
	if nj == nil {
		return core.ErrTaskUnknown
	}
	if stopped {
		return core.ErrTaskNotReady
	}
	go b.run(nj, true)
	return nil
}

func (b *nodeBackend) run(nj *nodeJob, manual bool) {
	t := nj.task
	b.mu.Lock()
	if b.stopped {
		b.mu.Unlock()
		return
	}
	b.wg.Add(1)
	b.mu.Unlock()
	defer b.wg.Done()

	if !nj.running.CompareAndSwap(false, true) {
		now := time.Now().UTC()
		b.finish(nj, NodeTaskRun{StartedAt: now, FinishedAt: now, Status: StatusSkipped, Manual: manual,
			Message: "the previous run is still going"}, true)
		return
	}
	defer nj.running.Store(false)
	if t.RequireWork && b.canWork != nil && !b.canWork() {
		// Not a history entry: a node waiting for admission would fill the
		// history with these every few seconds.
		now := time.Now().UTC()
		b.finish(nj, NodeTaskRun{StartedAt: now, FinishedAt: now, Status: StatusSkipped, Manual: manual,
			Message: "this node may not do background work"}, false)
		return
	}

	started := time.Now().UTC()
	nj.mu.Lock()
	nj.state.LastStartedAt = &started
	nj.mu.Unlock()
	runID := b.runID(started)
	ctx, cancel := context.WithTimeout(b.runCtx, t.Timeout)
	res, err := callHandler(ctx, t, core.TaskRun{Name: t.Name, ScheduledAt: started, Attempt: 1, Manual: manual, NodeID: b.nodeID, RunID: runID,
		QueuedAt: started})
	timedOut := ctx.Err() == context.DeadlineExceeded
	cancel()
	finished := time.Now().UTC()
	run := NodeTaskRun{ID: runID, StartedAt: started, FinishedAt: finished, Manual: manual, Count: res.Count, Message: truncate(res.Message)}
	var retry *core.TaskRetryAfterError
	var skip *core.TaskSkippedError
	var cont *core.TaskContinueError
	switch {
	case err == nil:
		run.Status = StatusSucceeded
	case errors.As(err, &cont):
		run.Status = StatusContinued
		b.continueRun(nj, cont.Delay)
	case errors.As(err, &retry):
		run.Status = StatusSkipped
		run.Message = truncate(err.Error())
	case errors.As(err, &skip):
		run.Status = StatusSkipped
		run.Message = truncate(skip.Reason)
	case timedOut:
		run.Status, run.Error = StatusTimeout, truncate(err.Error())
	default:
		run.Status, run.Error = StatusFailed, truncate(err.Error())
	}
	b.finish(nj, run, true)
}

// continueRun runs nj again on this node after delay, unless the backend
// stopped or the task was unregistered or registered again meanwhile.
func (b *nodeBackend) continueRun(nj *nodeJob, delay time.Duration) {
	time.AfterFunc(delay, func() {
		b.mu.Lock()
		current := b.jobs[nj.task.Name] == nj && !b.stopped
		b.mu.Unlock()
		if current {
			b.run(nj, false)
		}
	})
}

// runID is the history id of a run started at started.
func (b *nodeBackend) runID(started time.Time) string {
	return strconv.FormatInt(b.runSeq.Add(1), 10) + "-" + strconv.FormatInt(started.UnixMilli(), 10)
}

// finish records one run in the task's state and, with history, its history.
func (b *nodeBackend) finish(nj *nodeJob, run NodeTaskRun, history bool) {
	if run.ID == "" {
		run.ID = b.runID(run.StartedAt)
	}
	run.DurationMS = run.FinishedAt.Sub(run.StartedAt).Milliseconds()
	nj.mu.Lock()
	st := &nj.state
	st.Status, st.Count, st.Message, st.Error = run.Status, run.Count, run.Message, run.Error
	st.DurationMS = run.DurationMS
	if run.Status != StatusSkipped || st.LastStartedAt == nil {
		started, finished := run.StartedAt, run.FinishedAt
		st.LastStartedAt, st.LastFinishedAt = &started, &finished
	}
	switch run.Status {
	case StatusSucceeded, StatusContinued:
		st.ConsecutiveFailures = 0
		at := run.FinishedAt
		st.LastSuccessAt = &at
	case StatusFailed, StatusTimeout:
		st.ConsecutiveFailures++
	case StatusSkipped:
		st.Skipped++
	}
	failures := st.ConsecutiveFailures
	nj.mu.Unlock()
	if run.Status == StatusFailed || run.Status == StatusTimeout {
		b.log.Warn("task: node task failed", "task", nj.task.Name, "status", run.Status, "err", run.Error,
			"consecutive_failures", failures, "duration_ms", run.DurationMS)
	}
	var entry *NodeTaskRun
	if history {
		entry = &run
	}
	if err := b.store.put(b.runCtx, nj.snapshot(), entry); err != nil {
		b.log.Debug("task: write node task state", "task", nj.task.Name, "err", err)
	}
}

// stop ends scheduling, waits for running tasks up to nodeStopWait (or ctx),
// then cancels them and removes this node's state.
func (b *nodeBackend) stop(ctx context.Context) {
	b.mu.Lock()
	if b.stopped {
		b.mu.Unlock()
		return
	}
	b.stopped = true
	started := b.started
	b.mu.Unlock()
	if started {
		close(b.done)
	}
	_ = b.sched.StopJobs()
	waited := make(chan struct{})
	go func() { b.wg.Wait(); close(waited) }()
	wait, cancel := context.WithTimeout(ctx, nodeStopWait)
	select {
	case <-waited:
	case <-wait.Done():
		b.cancelRuns()
		select {
		case <-waited:
		case <-ctx.Done():
		}
	}
	cancel()
	b.cancelRuns()
	_ = b.sched.Shutdown()
	if err := b.store.drop(context.Background()); err != nil {
		b.log.Debug("task: drop node task states", "err", err)
	}
}

// callHandler runs the task's handler, turning a panic into an error.
func callHandler(ctx context.Context, t *Task, run core.TaskRun) (res core.TaskResult, err error) {
	defer func() {
		if p := recover(); p != nil {
			err = fmt.Errorf("panic: %v", p)
		}
	}()
	return t.Handler(ctx, run)
}
