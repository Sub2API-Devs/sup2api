package task

import (
	"context"
	"encoding/json"
	"errors"
	"sync"
	"sync/atomic"
	"testing"
	"time"

	"github.com/riverqueue/river"
	"github.com/stretchr/testify/require"

	"github.com/Sub2API-Devs/sup2api/next/server/internal/background"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/core"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/store"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/testutil"
)

func init() {
	// Shorter waits for every test in this package; they never change after.
	admissionPoll = 50 * time.Millisecond
	snoozeBusy = 300 * time.Millisecond
	snoozeElsewhere = 300 * time.Millisecond
	unknownGrace = 0
	retryDelay = func(int, time.Duration) time.Duration { return 50 * time.Millisecond }
}

type clusterEnv struct {
	nodeEnv
	db *store.DB
}

func newClusterEnv(t *testing.T) clusterEnv {
	return clusterEnv{nodeEnv: newNodeEnv(t), db: testutil.DB(t)}
}

// service starts a node of the cluster with specs registered before
// StartCluster.
func (e clusterEnv) service(t *testing.T, nodeID string, canWork func() bool, specs ...core.TaskSpec) *Service {
	t.Helper()
	exec := background.New(8)
	exec.Admitted = canWork
	s, err := New(Options{NodeID: nodeID, Version: "test", Redis: e.rdb, Bus: e.bus, CanWork: canWork,
		DB: e.db, Executor: exec})
	require.NoError(t, err)
	for _, spec := range specs {
		require.NoError(t, s.Register(spec))
	}
	require.NoError(t, s.StartCluster(t.Context()))
	t.Cleanup(func() { s.Stop(context.Background()) })
	return s
}

func clusterSpec(name string, h core.TaskHandler) core.TaskSpec {
	return core.TaskSpec{Name: name, Title: core.LocalizedText{"en": "Test", "zh": "测试"}, Scope: core.TaskCluster,
		Timeout: 10 * time.Second, Handler: h}
}

// runLog records the runs a handler saw.
type runLog struct {
	mu   sync.Mutex
	runs []core.TaskRun
}

func (l *runLog) add(run core.TaskRun) int {
	l.mu.Lock()
	defer l.mu.Unlock()
	l.runs = append(l.runs, run)
	return len(l.runs)
}

func (l *runLog) list() []core.TaskRun {
	l.mu.Lock()
	defer l.mu.Unlock()
	return append([]core.TaskRun(nil), l.runs...)
}

func (l *runLog) len() int { return len(l.list()) }

func (l *runLog) handler() core.TaskHandler {
	return func(_ context.Context, run core.TaskRun) (core.TaskResult, error) {
		l.add(run)
		return core.TaskResult{Count: 1, Message: "ok"}, nil
	}
}

type jobRow struct {
	State   string
	Attempt int
	Output  *runOutput
}

func jobRows(t *testing.T, db *store.DB, name string) []jobRow {
	t.Helper()
	rows, err := db.Pool.Query(context.Background(), `SELECT state::text, attempt, metadata->'output'
		FROM river_job WHERE kind = 'sup2api.task' AND args->>'name' = $1 ORDER BY id`, name)
	require.NoError(t, err)
	defer rows.Close()
	var out []jobRow
	for rows.Next() {
		var r jobRow
		var raw []byte
		require.NoError(t, rows.Scan(&r.State, &r.Attempt, &raw))
		if len(raw) > 0 && string(raw) != "null" {
			r.Output = &runOutput{}
			require.NoError(t, json.Unmarshal(raw, r.Output))
		}
		out = append(out, r)
	}
	require.NoError(t, rows.Err())
	return out
}

type taskRow struct {
	Status      *string
	Count       *int
	Failures    int
	LastNode    *string
	LeaseJob    *int64
	Schedule    *string
	MaxAttempts int
	LastSuccess *time.Time
}

func readTaskRow(t *testing.T, db *store.DB, name string) taskRow {
	t.Helper()
	var r taskRow
	require.NoError(t, db.Pool.QueryRow(context.Background(), `SELECT last_status, last_count, consecutive_failures,
		last_node, lease_job_id, schedule, max_attempts, last_success_at FROM scheduled_tasks WHERE name = $1`, name).
		Scan(&r.Status, &r.Count, &r.Failures, &r.LastNode, &r.LeaseJob, &r.Schedule, &r.MaxAttempts, &r.LastSuccess))
	return r
}

func waitLong(t *testing.T, what string, d time.Duration, cond func() bool) {
	t.Helper()
	deadline := time.Now().Add(d)
	for !cond() {
		if time.Now().After(deadline) {
			t.Fatalf("timed out waiting for %s", what)
		}
		time.Sleep(25 * time.Millisecond)
	}
}

func TestClusterPeriodicRunsOncePerSlotAcrossNodes(t *testing.T) {
	t.Parallel()
	env := newClusterEnv(t)
	var log runLog
	spec := clusterSpec("core.test.periodic", log.handler())
	spec.Every = 5 * time.Second
	env.service(t, "node-a", nil, spec)
	env.service(t, "node-b", nil, spec)

	waitLong(t, "three runs", 25*time.Second, func() bool { return log.len() >= 3 })
	slots := map[time.Time]bool{}
	for _, run := range log.list() {
		require.False(t, run.Manual)
		require.Equal(t, 1, run.Attempt)
		slot := run.ScheduledAt.Truncate(5 * time.Second)
		require.False(t, slots[slot], "slot %s ran twice", slot)
		slots[slot] = true
	}

	row := readTaskRow(t, env.db, "core.test.periodic")
	require.Equal(t, StatusSucceeded, *row.Status)
	require.Equal(t, 1, *row.Count)
	require.Equal(t, "@every 5s", *row.Schedule)
	require.Equal(t, 1, row.MaxAttempts) // periodic under 10 minutes: the next slot is the retry
	require.NotNil(t, row.LastSuccess)
	waitLong(t, "recorded output", 5*time.Second, func() bool {
		for _, j := range jobRows(t, env.db, "core.test.periodic") {
			if j.State == "completed" && j.Output != nil {
				return j.Output.Status == StatusSucceeded && j.Output.Count == 1 && j.Output.Node != ""
			}
		}
		return false
	})
}

func TestClusterLeaderFailover(t *testing.T) {
	t.Parallel()
	env := newClusterEnv(t)
	var log runLog
	spec := clusterSpec("core.test.failover", log.handler())
	spec.Every = 5 * time.Second
	a := env.service(t, "node-a", nil, spec)
	waitLong(t, "a first run", 15*time.Second, func() bool { return log.len() >= 1 })
	env.service(t, "node-b", nil, spec)
	a.Stop(context.Background())
	n := log.len()
	waitLong(t, "a run after node a stopped", 30*time.Second, func() bool {
		runs := log.list()
		return len(runs) > n && runs[len(runs)-1].NodeID == "node-b"
	})
}

func TestClusterLeaseKeepsRunsFromOverlapping(t *testing.T) {
	t.Parallel()
	env := newClusterEnv(t)
	release := make(chan struct{})
	var calls atomic.Int32
	spec := clusterSpec("core.test.slow", func(ctx context.Context, _ core.TaskRun) (core.TaskResult, error) {
		if calls.Add(1) == 1 {
			select {
			case <-release:
			case <-ctx.Done():
				return core.TaskResult{}, ctx.Err()
			}
		}
		return core.TaskResult{}, nil
	})
	spec.Every = 5 * time.Second
	env.service(t, "node-a", nil, spec)
	env.service(t, "node-b", nil, spec)

	waitLong(t, "a skipped slot", 20*time.Second, func() bool {
		for _, j := range jobRows(t, env.db, "core.test.slow") {
			if j.Output != nil && j.Output.Status == StatusSkipped {
				return true
			}
		}
		return false
	})
	require.EqualValues(t, 1, calls.Load(), "a slot ran while the previous run was still going")
	close(release)
	waitLong(t, "the slow run to finish", 10*time.Second, func() bool {
		r := readTaskRow(t, env.db, "core.test.slow")
		return r.LeaseJob == nil && r.Status != nil && *r.Status == StatusSucceeded
	})
}

func TestClusterLease(t *testing.T) {
	t.Parallel()
	env := newClusterEnv(t)
	var log runLog
	s := env.service(t, "node-a", nil, clusterSpec("core.test.lease", log.handler()))
	ctx := context.Background()

	// Another run holds the lease: a manual run waits for it.
	_, err := env.db.Pool.Exec(ctx, `UPDATE scheduled_tasks SET lease_job_id = -1, lease_node = 'elsewhere',
		lease_until = now() + interval '1 hour' WHERE name = 'core.test.lease'`)
	require.NoError(t, err)
	require.NoError(t, s.Trigger(ctx, "core.test.lease"))
	time.Sleep(time.Second)
	require.Zero(t, log.len())

	// The lease expired (its holder died): the run takes it over.
	_, err = env.db.Pool.Exec(ctx, `UPDATE scheduled_tasks SET lease_until = now() - interval '1 second'
		WHERE name = 'core.test.lease'`)
	require.NoError(t, err)
	waitLong(t, "the manual run", 10*time.Second, func() bool { return log.len() == 1 })
	require.True(t, log.list()[0].Manual)
	waitLong(t, "the lease released", 5*time.Second, func() bool {
		return readTaskRow(t, env.db, "core.test.lease").LeaseJob == nil
	})
}

func TestClusterManualRunsAreDeduplicated(t *testing.T) {
	t.Parallel()
	env := newClusterEnv(t)
	var admitted atomic.Bool
	var log runLog
	s := env.service(t, "node-a", admitted.Load, clusterSpec("core.test.manual", log.handler()))
	ctx := context.Background()
	require.NoError(t, s.Trigger(ctx, "core.test.manual"))
	require.NoError(t, s.Trigger(ctx, "core.test.manual"))
	require.Len(t, jobRows(t, env.db, "core.test.manual"), 1)
	require.ErrorIs(t, s.Trigger(ctx, "core.test.missing"), core.ErrTaskUnknown)

	admitted.Store(true)
	waitLong(t, "the manual run", 10*time.Second, func() bool { return log.len() == 1 })
	waitLong(t, "the run completed", 5*time.Second, func() bool {
		return jobRows(t, env.db, "core.test.manual")[0].State == "completed"
	})
	// A finished manual run does not block the next one.
	require.NoError(t, s.Trigger(ctx, "core.test.manual"))
	waitLong(t, "the second manual run", 10*time.Second, func() bool { return log.len() == 2 })
}

func TestClusterAdmission(t *testing.T) {
	t.Parallel()
	env := newClusterEnv(t)
	var admitted atomic.Bool
	var log runLog
	s := env.service(t, "node-a", admitted.Load, clusterSpec("core.test.admission", log.handler()))
	ctx := context.Background()

	require.NoError(t, s.Enqueue(ctx, "core.test.admission", nil, core.EnqueueOpts{}))
	time.Sleep(time.Second)
	require.Zero(t, log.len(), "ran without background admission")

	admitted.Store(true)
	waitLong(t, "the run once admitted", 10*time.Second, func() bool { return log.len() == 1 })

	admitted.Store(false)
	waitLong(t, "River stopped", 30*time.Second, func() bool {
		c := s.clusterBackend()
		c.mu.Lock()
		defer c.mu.Unlock()
		return !c.running
	})
	require.NoError(t, s.Enqueue(ctx, "core.test.admission", nil, core.EnqueueOpts{}))
	time.Sleep(time.Second)
	require.Equal(t, 1, log.len(), "ran after admission was withdrawn")

	admitted.Store(true)
	waitLong(t, "the run once admitted again", 10*time.Second, func() bool { return log.len() == 2 })
}

func TestClusterEnqueue(t *testing.T) {
	t.Parallel()
	env := newClusterEnv(t)
	var admitted atomic.Bool
	admitted.Store(true)
	var log runLog
	s := env.service(t, "node-a", admitted.Load, clusterSpec("core.test.enqueue", log.handler()))
	ctx := context.Background()

	type args struct {
		Account int64 `json:"account"`
	}
	runAt := time.Now().Add(2 * time.Second)
	require.NoError(t, s.Enqueue(ctx, "core.test.enqueue", args{Account: 7}, core.EnqueueOpts{RunAt: runAt}))
	waitLong(t, "the delayed run", 15*time.Second, func() bool { return log.len() == 1 })
	run := log.list()[0]
	require.False(t, time.Now().Before(runAt))
	require.JSONEq(t, `{"account":7}`, string(run.Args))
	require.False(t, run.Manual)

	// Rolled back: nothing is submitted; committed: it runs.
	tx, err := env.db.Pool.Begin(ctx)
	require.NoError(t, err)
	require.NoError(t, s.EnqueueTx(ctx, tx, "core.test.enqueue", args{Account: 8}, core.EnqueueOpts{}))
	require.NoError(t, tx.Rollback(ctx))
	tx, err = env.db.Pool.Begin(ctx)
	require.NoError(t, err)
	require.NoError(t, s.EnqueueTx(ctx, tx, "core.test.enqueue", args{Account: 9}, core.EnqueueOpts{}))
	require.NoError(t, tx.Commit(ctx))
	waitLong(t, "the committed run", 10*time.Second, func() bool { return log.len() == 2 })
	require.JSONEq(t, `{"account":9}`, string(log.list()[1].Args))

	// One unfinished run per unique key.
	admitted.Store(false)
	waitLong(t, "River stopped", 30*time.Second, func() bool {
		c := s.clusterBackend()
		c.mu.Lock()
		defer c.mu.Unlock()
		return !c.running
	})
	before := len(jobRows(t, env.db, "core.test.enqueue"))
	for range 3 {
		require.NoError(t, s.Enqueue(ctx, "core.test.enqueue", args{Account: 10}, core.EnqueueOpts{UniqueKey: "account:10"}))
	}
	require.NoError(t, s.Enqueue(ctx, "core.test.enqueue", args{Account: 11}, core.EnqueueOpts{UniqueKey: "account:11"}))
	require.Len(t, jobRows(t, env.db, "core.test.enqueue"), before+2)

	require.ErrorIs(t, s.Enqueue(ctx, "core.test.missing", nil, core.EnqueueOpts{}), core.ErrTaskUnknown)
	big := make([]byte, maxArgsBytes)
	require.Error(t, s.Enqueue(ctx, "core.test.enqueue", string(big), core.EnqueueOpts{}))
}

func TestClusterRetries(t *testing.T) {
	t.Parallel()
	env := newClusterEnv(t)
	var calls atomic.Int32
	flaky := clusterSpec("core.test.flaky", func(_ context.Context, run core.TaskRun) (core.TaskResult, error) {
		calls.Add(1)
		if run.Attempt < 3 {
			return core.TaskResult{}, errors.New("upstream down")
		}
		return core.TaskResult{Count: 2}, nil
	})
	var broken atomic.Int32
	failing := clusterSpec("core.test.failing", func(context.Context, core.TaskRun) (core.TaskResult, error) {
		broken.Add(1)
		return core.TaskResult{}, errors.New("always down")
	})
	failing.MaxAttempts = 2
	s := env.service(t, "node-a", nil, flaky, failing)
	ctx := context.Background()

	require.NoError(t, s.Enqueue(ctx, "core.test.flaky", nil, core.EnqueueOpts{}))
	waitLong(t, "the third attempt", 20*time.Second, func() bool {
		r := readTaskRow(t, env.db, "core.test.flaky")
		return r.Status != nil && *r.Status == StatusSucceeded
	})
	require.EqualValues(t, 3, calls.Load())
	require.Zero(t, readTaskRow(t, env.db, "core.test.flaky").Failures)

	require.NoError(t, s.Enqueue(ctx, "core.test.failing", nil, core.EnqueueOpts{}))
	waitLong(t, "the run discarded", 20*time.Second, func() bool {
		rows := jobRows(t, env.db, "core.test.failing")
		return len(rows) == 1 && rows[0].State == "discarded"
	})
	require.EqualValues(t, 2, broken.Load())
	r := readTaskRow(t, env.db, "core.test.failing")
	require.Equal(t, StatusFailed, *r.Status)
	require.Equal(t, 2, r.Failures)
}

func TestClusterRetryAfterAndPanics(t *testing.T) {
	t.Parallel()
	env := newClusterEnv(t)
	var calls atomic.Int32
	later := clusterSpec("core.test.later", func(context.Context, core.TaskRun) (core.TaskResult, error) {
		if calls.Add(1) == 1 {
			return core.TaskResult{}, core.TaskRetryAfter(200 * time.Millisecond)
		}
		return core.TaskResult{}, nil
	})
	panics := clusterSpec("core.test.panics", func(context.Context, core.TaskRun) (core.TaskResult, error) {
		panic("boom")
	})
	panics.MaxAttempts = 1
	s := env.service(t, "node-a", nil, later, panics)
	ctx := context.Background()

	require.NoError(t, s.Enqueue(ctx, "core.test.later", nil, core.EnqueueOpts{}))
	waitLong(t, "the run after its delay", 10*time.Second, func() bool {
		r := readTaskRow(t, env.db, "core.test.later")
		return r.Status != nil && *r.Status == StatusSucceeded
	})
	require.EqualValues(t, 2, calls.Load())
	require.Zero(t, readTaskRow(t, env.db, "core.test.later").Failures, "a put-off run counted as a failure")

	require.NoError(t, s.Enqueue(ctx, "core.test.panics", nil, core.EnqueueOpts{}))
	waitLong(t, "the panic recorded", 10*time.Second, func() bool {
		r := readTaskRow(t, env.db, "core.test.panics")
		return r.Status != nil && *r.Status == StatusFailed
	})
}

func TestClusterTimeout(t *testing.T) {
	t.Parallel()
	env := newClusterEnv(t)
	spec := clusterSpec("core.test.timeout", func(ctx context.Context, _ core.TaskRun) (core.TaskResult, error) {
		<-ctx.Done()
		return core.TaskResult{}, ctx.Err()
	})
	spec.Timeout = 300 * time.Millisecond
	spec.MaxAttempts = 1
	s := env.service(t, "node-a", nil, spec)
	require.NoError(t, s.Enqueue(context.Background(), "core.test.timeout", nil, core.EnqueueOpts{}))
	waitLong(t, "the timeout recorded", 10*time.Second, func() bool {
		r := readTaskRow(t, env.db, "core.test.timeout")
		return r.Status != nil && *r.Status == StatusTimeout
	})
}

func TestClusterUnknownTaskIsCancelled(t *testing.T) {
	t.Parallel()
	env := newClusterEnv(t)
	s := env.service(t, "node-a", nil)
	// A run of a task no node registers (an old version enqueued it).
	_, err := s.clusterBackend().client.Insert(context.Background(), taskArgs{Name: "core.test.gone"}, &river.InsertOpts{Queue: queueCore})
	require.NoError(t, err)
	waitLong(t, "the unknown run cancelled", 10*time.Second, func() bool {
		rows := jobRows(t, env.db, "core.test.gone")
		return len(rows) == 1 && rows[0].State == "cancelled"
	})
}

func TestClusterRegisterAfterStartAndHousekeeping(t *testing.T) {
	t.Parallel()
	env := newClusterEnv(t)
	s := env.service(t, "node-a", nil)
	ctx := context.Background()

	var log runLog
	require.NoError(t, s.Register(clusterSpec("core.test.late", log.handler())))
	require.NoError(t, s.Enqueue(ctx, "core.test.late", nil, core.EnqueueOpts{}))
	waitLong(t, "the late task's run", 10*time.Second, func() bool { return log.len() == 1 })

	// A core task no node registers any more, a fresh one and an expired lease.
	_, err := env.db.Pool.Exec(ctx, `INSERT INTO scheduled_tasks (name, source, schedule, timeout_ms, max_attempts, seen_at)
		VALUES ('core.test.removed', 'core', '@every 1h0m0s', 1000, 5, now() - interval '8 days'),
		       ('core.test.recent', 'core', '@every 1h0m0s', 1000, 5, now() - interval '1 day')`)
	require.NoError(t, err)
	_, err = env.db.Pool.Exec(ctx, `UPDATE scheduled_tasks SET seen_at = now() - interval '30 days',
		lease_job_id = -1, lease_node = 'dead', lease_until = now() - interval '1 minute' WHERE name = 'core.test.late'`)
	require.NoError(t, err)

	require.NoError(t, s.Trigger(ctx, HousekeepingTask))
	waitLong(t, "housekeeping", 10*time.Second, func() bool {
		r := readTaskRow(t, env.db, HousekeepingTask)
		return r.Status != nil && *r.Status == StatusSucceeded
	})
	var names []string
	rows, err := env.db.Pool.Query(ctx, `SELECT name FROM scheduled_tasks ORDER BY name`)
	require.NoError(t, err)
	for rows.Next() {
		var n string
		require.NoError(t, rows.Scan(&n))
		names = append(names, n)
	}
	require.NoError(t, rows.Err())
	require.Equal(t, []string{HousekeepingTask, "core.test.late", "core.test.recent"}, names)
	late := readTaskRow(t, env.db, "core.test.late")
	require.Nil(t, late.LeaseJob)
}

func TestRetryDelayDefault(t *testing.T) {
	require.Equal(t, time.Second, defaultRetryDelay(1, 0))
	require.Equal(t, 16*time.Second, defaultRetryDelay(2, time.Hour))
	require.Equal(t, 10*time.Second, defaultRetryDelay(3, 20*time.Second))
	require.Equal(t, 10*time.Minute, defaultRetryDelay(20, 24*time.Hour))
}
