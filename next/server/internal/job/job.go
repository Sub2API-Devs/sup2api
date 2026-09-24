// Package job schedules plugin background jobs (manifest "jobs") and
// implements core.JobTrigger for manual runs.
//
// Every node computes the trigger times of every job in the current plugin
// generation. When a slot is due, nodes race for lock
// "job:{plugin}:{job}:{unix slot}"; the winner records a plugin_job_runs row
// and calls AppPlugin.RunJob. Missed slots are not caught up.
package job

import (
	"context"
	"errors"
	"fmt"
	"log/slog"
	"sync"
	"time"

	"github.com/robfig/cron/v3"

	pluginv1 "github.com/Sub2API-Devs/sup2api/next/sdk/gen/pluginv1"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/core"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/store"
)

// Run statuses stored in plugin_job_runs.status.
const (
	StatusRunning   = "running"
	StatusSucceeded = "succeeded"
	StatusFailed    = "failed"
	StatusTimeout   = "timeout"
)

const maxMessageLen = 2000

// Options tunes the scheduler; zero values take the defaults.
type Options struct {
	DefaultTimeout    time.Duration // when timeoutSec is 0 (60s)
	LockGrace         time.Duration // slot lock TTL = timeout + LockGrace (60s)
	KeepRuns          int           // runs kept per (plugin, job) (1000)
	RetentionInterval time.Duration // retention period (1h)
	// StaleAfter marks "running" rows older than this as failed during
	// retention (their node died). Must exceed the maximum job timeout (25h).
	StaleAfter time.Duration
}

func (o *Options) defaults() {
	if o.DefaultTimeout <= 0 {
		o.DefaultTimeout = 60 * time.Second
	}
	if o.LockGrace <= 0 {
		o.LockGrace = 60 * time.Second
	}
	if o.KeepRuns <= 0 {
		o.KeepRuns = 1000
	}
	if o.RetentionInterval <= 0 {
		o.RetentionInterval = time.Hour
	}
	if o.StaleAfter <= 0 {
		o.StaleAfter = 25 * time.Hour
	}
}

// Scheduler runs scheduled and manual plugin jobs. It implements
// core.JobTrigger.
type Scheduler struct {
	db       *store.DB
	locker   core.Locker
	registry core.PluginRegistry
	log      *slog.Logger
	nodeID   string
	opts     Options

	mu      sync.Mutex
	entries map[string]*entry // plugin/job -> schedule; owned by loop, read by NextRun
	ctx     context.Context
	cancel  context.CancelFunc
	wg      sync.WaitGroup
	changed chan struct{}
	unsub   func()
	started bool
}

var _ core.JobTrigger = (*Scheduler)(nil)

type entry struct {
	binding core.JobBinding
	spec    string
	sched   cron.Schedule
	next    time.Time
}

// New builds the scheduler. nodeID is written to plugin_job_runs.node_id.
func New(db *store.DB, locker core.Locker, registry core.PluginRegistry, logger *slog.Logger, nodeID string, opts Options) *Scheduler {
	if logger == nil {
		logger = slog.Default()
	}
	opts.defaults()
	return &Scheduler{
		db: db, locker: locker, registry: registry,
		log:     logger.With("component", "jobs", "node", nodeID),
		nodeID:  nodeID,
		opts:    opts,
		entries: map[string]*entry{},
		changed: make(chan struct{}, 1),
	}
}

// Start marks runs left "running" by a previous process of this node as
// failed, builds the schedule and follows generation changes until Stop.
func (s *Scheduler) Start(ctx context.Context) error {
	s.mu.Lock()
	defer s.mu.Unlock()
	if s.started {
		return nil
	}
	if _, err := s.db.Pool.Exec(ctx, `UPDATE plugin_job_runs
		SET status = $2, finished_at = now(), message = 'abandoned: node restarted before the run finished'
		WHERE node_id = $1 AND status = $3`, s.nodeID, StatusFailed, StatusRunning); err != nil {
		return fmt.Errorf("jobs: recover abandoned runs: %w", err)
	}
	s.started = true
	s.ctx, s.cancel = context.WithCancel(context.WithoutCancel(ctx))
	s.unsub = s.registry.OnChange(func(core.Generation) {
		select {
		case s.changed <- struct{}{}:
		default:
		}
	})
	s.rebuildLocked(s.registry.Current(), time.Now())
	s.wg.Add(2)
	go s.loop()
	go s.retentionLoop()
	return nil
}

// Stop halts scheduling, cancels running jobs (recorded as failed) and waits
// for them, bounded by ctx.
func (s *Scheduler) Stop(ctx context.Context) error {
	s.mu.Lock()
	if !s.started {
		s.mu.Unlock()
		return nil
	}
	s.started = false
	s.unsub()
	s.cancel()
	s.mu.Unlock()
	done := make(chan struct{})
	go func() { s.wg.Wait(); close(done) }()
	select {
	case <-done:
		return nil
	case <-ctx.Done():
		return ctx.Err()
	}
}

// NextRun reports the next scheduled trigger of a job on this node.
func (s *Scheduler) NextRun(pluginKey, jobID string) (time.Time, bool) {
	s.mu.Lock()
	defer s.mu.Unlock()
	e, ok := s.entries[pluginKey+"/"+jobID]
	if !ok {
		return time.Time{}, false
	}
	return e.next, true
}

func (s *Scheduler) loop() {
	defer s.wg.Done()
	for {
		s.mu.Lock()
		var earliest time.Time
		for _, e := range s.entries {
			if earliest.IsZero() || e.next.Before(earliest) {
				earliest = e.next
			}
		}
		s.mu.Unlock()
		wait := time.Hour
		if !earliest.IsZero() {
			wait = max(time.Until(earliest), 0)
		}
		t := time.NewTimer(wait)
		select {
		case <-s.ctx.Done():
			t.Stop()
			return
		case <-s.changed:
			t.Stop()
			s.mu.Lock()
			s.rebuildLocked(s.registry.Current(), time.Now())
			s.mu.Unlock()
		case <-t.C:
			s.fireDue(time.Now())
		}
	}
}

// fireDue starts every entry whose slot has come. Only the latest due slot
// fires; slots missed while the node was busy or asleep are skipped.
func (s *Scheduler) fireDue(now time.Time) {
	s.mu.Lock()
	defer s.mu.Unlock()
	for _, e := range s.entries {
		if e.next.After(now) {
			continue
		}
		b, slot := e.binding, e.next
		e.next = e.sched.Next(now)
		s.wg.Add(1)
		go func() {
			defer s.wg.Done()
			s.runScheduled(b, slot)
		}()
	}
}

// rebuildLocked replaces the schedule with the jobs of gen, keeping the next
// trigger of jobs whose schedule did not change.
func (s *Scheduler) rebuildLocked(gen core.Generation, now time.Time) {
	next := map[string]*entry{}
	if gen != nil {
		for _, b := range gen.Jobs() {
			if b.Client == nil {
				continue
			}
			key := b.Plugin.Key + "/" + b.Job.ID
			if old, ok := s.entries[key]; ok && old.spec == b.Job.Schedule {
				old.binding = b
				next[key] = old
				continue
			}
			sched, err := ParseSchedule(b.Job.Schedule)
			if err != nil {
				s.log.Warn("invalid job schedule", "plugin", b.Plugin.Key, "job", b.Job.ID, "schedule", b.Job.Schedule, "err", err)
				continue
			}
			next[key] = &entry{binding: b, spec: b.Job.Schedule, sched: sched, next: sched.Next(now)}
		}
	}
	s.entries = next
}

func (s *Scheduler) timeout(b core.JobBinding) time.Duration {
	if b.Job.TimeoutSec > 0 {
		return time.Duration(b.Job.TimeoutSec) * time.Second
	}
	return s.opts.DefaultTimeout
}

// runScheduled executes one slot if this node wins its lock. The lock is not
// released: it keeps other nodes (even ones with a lagging clock) from
// running the same slot until it expires, and the NOT EXISTS insert guards
// the slot after that.
func (s *Scheduler) runScheduled(b core.JobBinding, slot time.Time) {
	timeout := s.timeout(b)
	key := fmt.Sprintf("job:%s:%s:%d", b.Plugin.Key, b.Job.ID, slot.Unix())
	_, ok, err := s.locker.TryLock(s.ctx, key, timeout+s.opts.LockGrace)
	if err != nil {
		if s.ctx.Err() == nil {
			s.log.Warn("job lock failed", "plugin", b.Plugin.Key, "job", b.Job.ID, "err", err)
		}
		return
	}
	if !ok {
		return
	}
	var id int64
	err = s.db.Pool.QueryRow(s.ctx, `INSERT INTO plugin_job_runs (plugin_key, job_id, node_id, scheduled_at, started_at, status, manual)
		SELECT $1::varchar, $2::varchar, $3::varchar, $4::timestamptz, now(), $5::varchar, false
		WHERE NOT EXISTS (SELECT 1 FROM plugin_job_runs
			WHERE plugin_key = $1 AND job_id = $2 AND scheduled_at = $4 AND NOT manual)
		RETURNING id`, b.Plugin.Key, b.Job.ID, s.nodeID, slot, StatusRunning).Scan(&id)
	if store.IsNoRows(err) {
		return
	}
	if err != nil {
		if s.ctx.Err() == nil {
			s.log.Warn("job run insert failed", "plugin", b.Plugin.Key, "job", b.Job.ID, "err", err)
		}
		return
	}
	s.execute(b, id, slot, false, timeout)
}

// RunNow implements core.JobTrigger: the job starts on this node right away
// and runs in the background; the outcome is recorded in plugin_job_runs.
// A second manual run of the same job while one is in progress (on any
// node) is rejected with ErrConflict.
func (s *Scheduler) RunNow(ctx context.Context, pluginKey, jobID string, actorID int64) error {
	s.mu.Lock()
	started := s.started
	s.mu.Unlock()
	if !started {
		return core.ErrUnavailable.WithMessage("job scheduler is not running")
	}
	b, err := s.lookup(ctx, pluginKey, jobID)
	if err != nil {
		return err
	}
	timeout := s.timeout(b)
	release, ok, err := s.locker.TryLock(ctx, fmt.Sprintf("job:%s:%s:manual", pluginKey, jobID), timeout+s.opts.LockGrace)
	if err != nil {
		return core.ErrUnavailable.WithCause(err)
	}
	if !ok {
		return core.ErrConflict.WithMessage("a manual run of this job is already in progress")
	}
	now := time.Now()
	var id int64
	if err := s.db.Pool.QueryRow(ctx, `INSERT INTO plugin_job_runs (plugin_key, job_id, node_id, scheduled_at, started_at, status, manual)
		VALUES ($1, $2, $3, $4, now(), $5, true) RETURNING id`,
		pluginKey, jobID, s.nodeID, now, StatusRunning).Scan(&id); err != nil {
		release()
		return fmt.Errorf("jobs: record manual run: %w", err)
	}
	s.log.Info("manual job run", "plugin", pluginKey, "job", jobID, "run_id", id, "actor_id", actorID)
	s.wg.Add(1)
	go func() {
		defer s.wg.Done()
		defer release()
		s.execute(b, id, now, true, timeout)
	}()
	return nil
}

func (s *Scheduler) lookup(ctx context.Context, pluginKey, jobID string) (core.JobBinding, error) {
	gen := s.registry.Current()
	if gen != nil {
		for _, b := range gen.Jobs() {
			if b.Plugin.Key == pluginKey && b.Job.ID == jobID {
				if b.Client == nil {
					return b, core.ErrPluginUnavailable
				}
				return b, nil
			}
		}
		if _, ok := gen.Plugin(pluginKey); ok {
			return core.JobBinding{}, core.ErrNotFound.WithMessage("job not found")
		}
	}
	var exists bool
	if err := s.db.Pool.QueryRow(ctx, `SELECT EXISTS (SELECT 1 FROM plugins WHERE key = $1)`, pluginKey).Scan(&exists); err != nil {
		return core.JobBinding{}, err
	}
	if exists {
		return core.JobBinding{}, core.ErrPluginUnavailable
	}
	return core.JobBinding{}, core.ErrNotFound.WithMessage("plugin not found")
}

// execute calls the plugin and records the outcome of run id.
func (s *Scheduler) execute(b core.JobBinding, id int64, slot time.Time, manual bool, timeout time.Duration) {
	ctx, cancel := context.WithTimeout(s.ctx, timeout)
	started := time.Now()
	resp, err := b.Client.RunJob(ctx, &pluginv1.RunJobRequest{
		JobId:           b.Job.ID,
		ScheduledAtUnix: slot.Unix(),
		Manual:          manual,
	})
	ctxErr := ctx.Err()
	cancel()

	status, msg := StatusSucceeded, resp.GetMessage()
	switch {
	case s.ctx.Err() != nil:
		status, msg = StatusFailed, "canceled: node shutting down"
	case errors.Is(ctxErr, context.DeadlineExceeded):
		status, msg = StatusTimeout, fmt.Sprintf("timed out after %s", timeout)
	case err != nil:
		status, msg = StatusFailed, err.Error()
	}
	if len(msg) > maxMessageLen {
		msg = msg[:maxMessageLen]
	}
	level := slog.LevelInfo
	if status != StatusSucceeded {
		level = slog.LevelWarn
	}
	s.log.Log(context.Background(), level, "job finished", "plugin", b.Plugin.Key, "job", b.Job.ID,
		"run_id", id, "manual", manual, "status", status, "duration", time.Since(started), "message", msg)

	uctx, ucancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer ucancel()
	if _, err := s.db.Pool.Exec(uctx, `UPDATE plugin_job_runs SET status = $2, message = $3, finished_at = now() WHERE id = $1`,
		id, status, msg); err != nil {
		s.log.Warn("job run update failed", "run_id", id, "err", err)
	}
}

// ParseSchedule parses a 5-field cron expression (evaluated in UTC unless it
// starts with CRON_TZ=) or "@every <duration>". "@every" slots are aligned
// to multiples of the duration so all nodes compute the same trigger times.
func ParseSchedule(spec string) (cron.Schedule, error) {
	sched, err := cronParser.Parse(spec)
	if err != nil {
		return nil, err
	}
	switch v := sched.(type) {
	case cron.ConstantDelaySchedule:
		return everySchedule{d: v.Delay}, nil
	case *cron.SpecSchedule:
		return utcSchedule{s: v}, nil
	}
	return sched, nil
}

var cronParser = cron.NewParser(cron.Minute | cron.Hour | cron.Dom | cron.Month | cron.Dow | cron.Descriptor)

type everySchedule struct{ d time.Duration }

func (e everySchedule) Next(t time.Time) time.Time { return t.Truncate(e.d).Add(e.d) }

type utcSchedule struct{ s *cron.SpecSchedule }

// Next evaluates the spec in UTC; an explicit CRON_TZ keeps its location.
func (u utcSchedule) Next(t time.Time) time.Time { return u.s.Next(t.UTC()) }
