// Package job runs plugin background jobs (manifest "jobs") on the scheduled
// task framework (internal/task, TASK-FRAMEWORK-DESIGN §11) and implements
// core.JobTrigger for manual runs from the plugin page.
//
// A cluster job (the default scope) is the cluster task plugin.<key>.<id>.
// Its scheduled_tasks row (source plugin_manifest) is written from the
// manifest of the plugin's active version by every node running that
// version, and every node registers the cluster tasks of all enabled plugins
// from those rows, so the River leader enqueues them even when it does not
// run the plugin itself. A run calls the plugin instance of the node that
// picked it up; a node without one puts the run off until the job's timeout.
//
// A node job ("scope": "node") is the node task plugin.<key>.<id> on every
// node running the plugin.
//
// Every run is also a plugin_job_runs row for the plugin page. A scheduled
// cluster run claims its slot there (plugin_job_runs_slot_uniq), which also
// keeps a slot from running twice while cores before 0.1.237, which still
// schedule jobs themselves, serve next to this one.
package job

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"log/slog"
	"maps"
	"strconv"
	"strings"
	"sync"
	"time"

	pluginv1 "github.com/Sub2API-Devs/sup2api/next/sdk/gen/pluginv1"
	"github.com/Sub2API-Devs/sup2api/next/sdk/manifest"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/core"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/plugin/install"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/store"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/task"
)

// Run statuses stored in plugin_job_runs.status.
const (
	StatusRunning   = "running"
	StatusSucceeded = "succeeded"
	StatusFailed    = "failed"
	StatusTimeout   = "timeout"
	StatusSkipped   = "skipped"
)

const maxMessageLen = 2000

// slotUniqueIndex allows one scheduled (non-manual) run per slot (migration
// 0015).
const slotUniqueIndex = "plugin_job_runs_slot_uniq"

// Limits applied to manifest jobs (TASK-FRAMEWORK-DESIGN §11.1, §17 item 3):
// older manifests may declare longer timeouts or shorter intervals than the
// framework runs; they are cut to these with a warning.
const (
	minEvery = 5 * time.Second
	// notLoadedRetry is how soon a cluster run is put off on a node that does
	// not run the plugin, until the run is older than the job's timeout.
	notLoadedRetry = 5 * time.Second
)

// Tasks is the part of the task service the bridge uses (*task.Service).
type Tasks interface {
	RegisterPlugin(spec core.TaskSpec, source task.Source, pluginKey string) error
	Unregister(name string) bool
	Trigger(ctx context.Context, name string) error
	RunOnNodes(ctx context.Context, name, nodeID string) error
	Enqueue(ctx context.Context, name string, args any, opts core.EnqueueOpts) error
}

// Options tunes the bridge; zero values take the defaults.
type Options struct {
	Version           string        // the core version, recorded on the rows it writes
	DefaultTimeout    time.Duration // when timeoutSec is 0 (60s)
	Resync            time.Duration // full reconcile period besides change signals (60s)
	KeepRuns          int           // runs kept per (plugin, job) (1000)
	RetentionInterval time.Duration // the schedule of core.jobs.retention (1h)
	// StaleAfter marks "running" rows older than this as failed during
	// retention (their node died). Must exceed the maximum job timeout.
	StaleAfter time.Duration
}

func (o *Options) defaults() {
	if o.DefaultTimeout <= 0 {
		o.DefaultTimeout = 60 * time.Second
	}
	if o.Resync <= 0 {
		o.Resync = time.Minute
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

// Bridge registers plugin jobs as scheduled tasks and runs them. It
// implements core.JobTrigger.
type Bridge struct {
	db       *store.DB
	registry core.PluginRegistry
	bus      core.Bus
	log      *slog.Logger
	nodeID   string
	opts     Options

	// reconcileMu serializes reconcile and Stop; manifests and warned belong
	// to it. mu guards the rest, held briefly.
	reconcileMu sync.Mutex
	manifests   map[string]*manifest.Manifest
	warned      map[string]string // task name -> last limit warning

	mu         sync.Mutex
	tasks      Tasks
	registered map[string]registration // task name -> what this node registered
	ctx        context.Context
	cancel     context.CancelFunc
	wg         sync.WaitGroup
	changed    chan struct{}
	unsubs     []func()
	started    bool
	stopped    bool
}

var (
	_ core.JobTrigger  = (*Bridge)(nil)
	_ core.PluginTasks = (*Bridge)(nil)
)

type registration struct {
	scope core.TaskScope
	sig   string
}

// New builds the bridge; nothing runs before Start.
func New(db *store.DB, registry core.PluginRegistry, bus core.Bus, logger *slog.Logger, nodeID string, opts Options) *Bridge {
	if logger == nil {
		logger = slog.Default()
	}
	opts.defaults()
	return &Bridge{
		db: db, registry: registry, bus: bus,
		log:        logger.With("component", "jobs", "node", nodeID),
		nodeID:     nodeID,
		opts:       opts,
		registered: map[string]registration{},
		manifests:  map[string]*manifest.Manifest{},
		warned:     map[string]string{},
		changed:    make(chan struct{}, 1),
	}
}

// TaskName is the scheduled task of a plugin job.
func TaskName(pluginKey, jobID string) string { return "plugin." + pluginKey + "." + jobID }

// Start marks runs left "running" by a previous process of this node as
// failed, registers the plugin jobs with tasks and follows plugin and task
// changes until Stop.
func (b *Bridge) Start(ctx context.Context, tasks Tasks) error {
	b.mu.Lock()
	if b.started {
		b.mu.Unlock()
		return nil
	}
	if b.stopped {
		b.mu.Unlock()
		return errors.New("job bridge cannot restart after Stop")
	}
	if tasks == nil {
		b.mu.Unlock()
		return errors.New("job bridge needs the task service")
	}
	if _, err := b.db.Pool.Exec(ctx, `UPDATE plugin_job_runs
		SET status = $2, finished_at = now(), message = 'abandoned: node restarted before the run finished'
		WHERE node_id = $1 AND status = $3`, b.nodeID, StatusFailed, StatusRunning); err != nil {
		b.mu.Unlock()
		return fmt.Errorf("jobs: recover abandoned runs: %w", err)
	}
	b.tasks = tasks
	b.started = true
	b.ctx, b.cancel = context.WithCancel(context.WithoutCancel(ctx))
	signal := func() {
		select {
		case b.changed <- struct{}{}:
		default:
		}
	}
	b.unsubs = append(b.unsubs, b.registry.OnChange(func(core.Generation) { signal() }))
	if b.bus != nil {
		b.unsubs = append(b.unsubs, b.bus.Subscribe(core.ChannelTaskChanged, func([]byte) { signal() }))
	}
	b.wg.Add(1)
	b.mu.Unlock()
	if err := b.reconcile(ctx); err != nil {
		b.log.Warn("jobs: register plugin jobs", "err", err)
	}
	go b.loop()
	return nil
}

// Stop ends the reconcile loop and unregisters every plugin job of this
// node. Runs in progress belong to the task service, which stops them.
func (b *Bridge) Stop(ctx context.Context) error {
	b.mu.Lock()
	if !b.started || b.stopped {
		b.stopped = true
		b.mu.Unlock()
		return nil
	}
	b.stopped = true
	for _, u := range b.unsubs {
		u()
	}
	b.cancel()
	b.mu.Unlock()
	done := make(chan struct{})
	go func() { b.wg.Wait(); close(done) }()
	select {
	case <-done:
	case <-ctx.Done():
		return ctx.Err()
	}
	b.reconcileMu.Lock()
	defer b.reconcileMu.Unlock()
	b.mu.Lock()
	names := b.registered
	b.registered = map[string]registration{}
	b.mu.Unlock()
	for name := range names {
		b.tasks.Unregister(name)
	}
	return nil
}

func (b *Bridge) loop() {
	defer b.wg.Done()
	tick := time.NewTicker(b.opts.Resync)
	defer tick.Stop()
	for {
		select {
		case <-b.ctx.Done():
			return
		case <-b.changed:
		case <-tick.C:
		}
		ctx, cancel := context.WithTimeout(b.ctx, 30*time.Second)
		err := b.reconcile(ctx)
		cancel()
		if err != nil && b.ctx.Err() == nil {
			b.log.Warn("jobs: register plugin jobs", "err", err)
		}
	}
}

// ---------------------------------------------------------------- reconcile

// pluginState is a plugins row.
type pluginState struct {
	status string
	active string
}

// serving reports whether the plugin's jobs should run: it is enabled (or
// upgrading) with an active version.
func (p pluginState) serving() bool {
	return (p.status == "enabled" || p.status == "upgrading") && p.active != ""
}

// taskRow is a scheduled_tasks row of a plugin task.
type taskRow struct {
	name, source, pluginKey, schedule string
	timeoutMS                         int64
	maxAttempts                       int
	enabled                           bool
	args                              []byte // runtime tasks: the args of every periodic run
}

// desired is one task this node should have registered.
type desired struct {
	spec   core.TaskSpec
	source task.Source
	key    string
	sig    string
}

// reconcile writes the scheduled_tasks rows of the cluster jobs of the
// plugins this node runs at their active version, then makes this node's
// registered plugin tasks match the rows (cluster) and its generation
// (node).
func (b *Bridge) reconcile(ctx context.Context) error {
	b.reconcileMu.Lock()
	defer b.reconcileMu.Unlock()
	b.mu.Lock()
	stopped, tasks := b.stopped, b.tasks
	registered := maps.Clone(b.registered)
	b.mu.Unlock()
	// Before Start (the plugin runtime serves task calls earlier) only the
	// rows are written; Start registers them.
	if stopped || tasks == nil {
		return nil
	}
	gen := b.registry.Current()
	plugins, err := b.loadPlugins(ctx)
	if err != nil {
		return err
	}
	wrote, err := b.writeManifestRows(ctx, gen, plugins)
	if err != nil {
		return err
	}
	if wrote && b.bus != nil {
		if err := b.bus.Publish(ctx, core.ChannelTaskChanged, []byte(`{}`)); err != nil {
			b.log.Debug("jobs: announce task change", "err", err)
		}
	}
	rows, err := b.loadRows(ctx)
	if err != nil {
		return err
	}

	want := map[string]desired{}
	for _, r := range rows {
		p := plugins[r.pluginKey]
		if !r.enabled || !p.serving() {
			continue
		}
		m := b.manifestFor(ctx, gen, r.pluginKey, p.active)
		jobID := strings.TrimPrefix(r.name, "plugin."+r.pluginKey+".")
		d, ok := b.clusterTask(r, jobID, m)
		if ok {
			want[r.name] = d
		}
	}
	if gen != nil {
		for _, jb := range gen.Jobs() {
			if !jb.Job.NodeScope() || jb.Client == nil {
				continue
			}
			name := TaskName(jb.Plugin.Key, jb.Job.ID)
			if _, clash := want[name]; clash {
				continue // the active version still declares it a cluster job
			}
			if d, ok := b.nodeTask(jb); ok {
				want[name] = d
			}
		}
	}

	for name, reg := range registered {
		if d, ok := want[name]; !ok || d.sig != reg.sig {
			tasks.Unregister(name)
			delete(registered, name)
		}
	}
	for name, d := range want {
		if _, ok := registered[name]; ok {
			continue
		}
		if err := tasks.RegisterPlugin(d.spec, d.source, d.key); err != nil {
			b.log.Warn("jobs: register plugin job", "task", name, "err", err)
			continue
		}
		registered[name] = registration{scope: d.spec.Scope, sig: d.sig}
	}
	b.mu.Lock()
	b.registered = registered
	b.mu.Unlock()
	return nil
}

func (b *Bridge) loadPlugins(ctx context.Context) (map[string]pluginState, error) {
	rows, err := b.db.Pool.Query(ctx, `SELECT key, status, COALESCE(active_version, '') FROM plugins`)
	if err != nil {
		return nil, fmt.Errorf("jobs: read plugins: %w", err)
	}
	defer rows.Close()
	out := map[string]pluginState{}
	for rows.Next() {
		var key string
		var p pluginState
		if err := rows.Scan(&key, &p.status, &p.active); err != nil {
			return nil, err
		}
		out[key] = p
	}
	return out, rows.Err()
}

func (b *Bridge) loadRows(ctx context.Context) ([]taskRow, error) {
	rows, err := b.db.Pool.Query(ctx, `SELECT name, source, plugin_key, schedule, timeout_ms, max_attempts, enabled, args
		FROM scheduled_tasks WHERE source IN ($1, $2) AND plugin_key IS NOT NULL ORDER BY name`,
		string(task.SourcePluginManifest), string(task.SourcePluginRuntime))
	if err != nil {
		return nil, fmt.Errorf("jobs: read plugin tasks: %w", err)
	}
	defer rows.Close()
	var out []taskRow
	for rows.Next() {
		var r taskRow
		if err := rows.Scan(&r.name, &r.source, &r.pluginKey, &r.schedule, &r.timeoutMS, &r.maxAttempts, &r.enabled, &r.args); err != nil {
			return nil, err
		}
		out = append(out, r)
	}
	return out, rows.Err()
}

// writeManifestRows makes the plugin_manifest rows match: for every plugin
// this node runs at its active version, the cluster jobs of that version;
// none for a plugin that is not serving. It reports whether it changed any.
func (b *Bridge) writeManifestRows(ctx context.Context, gen core.Generation, plugins map[string]pluginState) (bool, error) {
	own := map[string]bool{}
	want := map[string]*task.Task{}
	if gen != nil {
		for _, p := range gen.Plugins() {
			if st := plugins[p.Key]; st.serving() && st.active == p.Version {
				own[p.Key] = true
			}
		}
		for _, jb := range gen.Jobs() {
			if !own[jb.Plugin.Key] || jb.Job.NodeScope() {
				continue
			}
			spec, ok := b.jobSpec(jb.Plugin.Key, jb.Job, jb.Plugin.Manifest, core.TaskCluster)
			if !ok {
				continue
			}
			t, err := task.Describe(spec, task.SourcePluginManifest, jb.Plugin.Key)
			if err != nil {
				b.log.Warn("jobs: invalid plugin job", "plugin", jb.Plugin.Key, "job", jb.Job.ID, "err", err)
				continue
			}
			want[t.Name] = t
		}
	}
	rows, err := b.db.Pool.Query(ctx, `SELECT name, plugin_key, schedule, timeout_ms, max_attempts
		FROM scheduled_tasks WHERE source = $1`, string(task.SourcePluginManifest))
	if err != nil {
		return false, fmt.Errorf("jobs: read plugin job rows: %w", err)
	}
	type row struct {
		key, schedule string
		timeoutMS     int64
		attempts      int
	}
	have := map[string]row{}
	for rows.Next() {
		var name string
		var r row
		var key *string
		if err := rows.Scan(&name, &key, &r.schedule, &r.timeoutMS, &r.attempts); err != nil {
			rows.Close()
			return false, err
		}
		if key != nil {
			r.key = *key
		}
		have[name] = r
	}
	rows.Close()
	if err := rows.Err(); err != nil {
		return false, err
	}

	changed := false
	keys := make([]string, 0, len(plugins))
	for k := range plugins {
		keys = append(keys, k)
	}
	// The runtime tasks of an uninstalled plugin go with it; a disabled one
	// keeps them for when it is enabled again.
	tag, err := b.db.Pool.Exec(ctx, `DELETE FROM scheduled_tasks WHERE source = $1 AND NOT (plugin_key = ANY($2))`,
		string(task.SourcePluginRuntime), keys)
	if err != nil {
		return false, fmt.Errorf("jobs: remove the runtime tasks of uninstalled plugins: %w", err)
	}
	changed = tag.RowsAffected() > 0
	for name, r := range have {
		_, wanted := want[name]
		if plugins[r.key].serving() && (!own[r.key] || wanted) {
			continue
		}
		if _, err := b.db.Pool.Exec(ctx, `DELETE FROM scheduled_tasks WHERE name = $1 AND source = $2`,
			name, string(task.SourcePluginManifest)); err != nil {
			return changed, fmt.Errorf("jobs: remove plugin job row %s: %w", name, err)
		}
		changed = true
	}
	for name, t := range want {
		if r, ok := have[name]; ok && r.schedule == t.ScheduleText && r.timeoutMS == t.Timeout.Milliseconds() && r.attempts == t.Attempts() {
			continue
		}
		// A runtime task of the same name keeps its row.
		tag, err := b.db.Pool.Exec(ctx, `INSERT INTO scheduled_tasks (name, source, plugin_key, schedule, timeout_ms, max_attempts, seen_version, seen_at)
			VALUES ($1, $2, $3, $4, $5, $6, $7, now())
			ON CONFLICT (name) DO UPDATE SET plugin_key = EXCLUDED.plugin_key, schedule = EXCLUDED.schedule,
				timeout_ms = EXCLUDED.timeout_ms, max_attempts = EXCLUDED.max_attempts, seen_version = EXCLUDED.seen_version,
				seen_at = now(), updated_at = now()
			WHERE scheduled_tasks.source = EXCLUDED.source`,
			name, string(task.SourcePluginManifest), t.PluginKey, t.ScheduleText, t.Timeout.Milliseconds(), t.Attempts(), b.opts.Version)
		if err != nil {
			return changed, fmt.Errorf("jobs: record plugin job %s: %w", name, err)
		}
		changed = changed || tag.RowsAffected() > 0
	}
	return changed, nil
}

// manifestFor returns the manifest of a plugin version: the generation's
// when this node runs that version, else from plugin_versions (cached).
func (b *Bridge) manifestFor(ctx context.Context, gen core.Generation, key, version string) *manifest.Manifest {
	if gen != nil {
		if p, ok := gen.Plugin(key); ok && p.Version == version && p.Manifest != nil {
			return p.Manifest
		}
	}
	ck := key + "@" + version
	if m, ok := b.manifests[ck]; ok {
		return m
	}
	m, err := install.LoadManifest(ctx, b.db.Pool, key, version)
	if err != nil {
		b.log.Debug("jobs: load plugin manifest", "plugin", key, "version", version, "err", err)
		return nil
	}
	b.manifests[ck] = m
	return m
}

// clusterTask builds the cluster task of a row.
func (b *Bridge) clusterTask(r taskRow, jobID string, m *manifest.Manifest) (desired, bool) {
	job := manifest.Job{ID: jobID}
	if m != nil {
		for _, j := range m.Jobs {
			if j.ID == jobID {
				job = j
			}
		}
	}
	every, cron, err := splitSchedule(r.schedule)
	if err != nil {
		b.log.Warn("jobs: invalid plugin task schedule", "task", r.name, "schedule", r.schedule, "err", err)
		return desired{}, false
	}
	timeout := time.Duration(r.timeoutMS) * time.Millisecond
	spec := core.TaskSpec{
		Name: r.name, Title: jobTitle(m, job), Scope: core.TaskCluster, Every: every, Cron: cron,
		Timeout: timeout, MaxAttempts: r.maxAttempts,
		Handler: b.handler(r.pluginKey, jobID, core.TaskCluster, timeout, r.source == string(task.SourcePluginRuntime), r.args),
	}
	return desired{spec: spec, source: task.Source(r.source), key: r.pluginKey,
		sig: signature(r.source, spec) + "|" + string(r.args)}, true
}

// nodeTask builds the node task of a node job of this node's generation.
func (b *Bridge) nodeTask(jb core.JobBinding) (desired, bool) {
	spec, ok := b.jobSpec(jb.Plugin.Key, jb.Job, jb.Plugin.Manifest, core.TaskNode)
	if !ok {
		return desired{}, false
	}
	return desired{spec: spec, source: task.SourcePluginManifest, key: jb.Plugin.Key,
		sig: signature(string(task.SourcePluginManifest), spec) + "|" + jb.Plugin.Version}, true
}

// jobSpec turns a manifest job into a task spec, cutting what the framework
// does not run (with one warning per change).
func (b *Bridge) jobSpec(key string, j manifest.Job, m *manifest.Manifest, scope core.TaskScope) (core.TaskSpec, bool) {
	name := TaskName(key, j.ID)
	every, cron, err := splitSchedule(j.Schedule)
	if err != nil {
		b.log.Warn("jobs: invalid plugin job schedule", "plugin", key, "job", j.ID, "schedule", j.Schedule, "err", err)
		return core.TaskSpec{}, false
	}
	timeout := b.opts.DefaultTimeout
	if j.TimeoutSec > 0 {
		timeout = time.Duration(j.TimeoutSec) * time.Second
	}
	limit := task.MaxClusterTimeout
	if scope == core.TaskNode {
		limit = task.MaxNodeTimeout
	}
	var cut []string
	if timeout > limit {
		cut = append(cut, fmt.Sprintf("timeout %s cut to %s", timeout, limit))
		timeout = limit
	}
	if every > 0 && every < minEvery {
		cut = append(cut, fmt.Sprintf("interval %s raised to %s", every, minEvery))
		every = minEvery
	}
	if note := strings.Join(cut, ", "); note != b.warned[name] {
		if note != "" {
			b.log.Warn("jobs: plugin job adjusted to the task limits", "task", name, "adjusted", note)
		}
		b.warned[name] = note
	}
	spec := core.TaskSpec{Name: name, Title: jobTitle(m, j), Scope: scope, Every: every, Cron: cron, Timeout: timeout}
	if scope == core.TaskNode {
		// Jobs ran only on admitted nodes before the framework; node jobs
		// keep that.
		spec.RequireWork = true
	}
	spec.Handler = b.handler(key, j.ID, scope, timeout, false, nil)
	return spec, true
}

// splitSchedule turns a schedule into Every or Cron; "" (a runtime task that
// only runs enqueued work) is neither.
func splitSchedule(s string) (time.Duration, string, error) {
	if s == "" {
		return 0, "", nil
	}
	if rest, ok := strings.CutPrefix(s, "@every "); ok {
		d, err := time.ParseDuration(strings.TrimSpace(rest))
		if err != nil || d <= 0 {
			return 0, "", fmt.Errorf("invalid interval %q", rest)
		}
		return d.Truncate(time.Second), "", nil
	}
	if _, err := task.ParseSchedule(s); err != nil {
		return 0, "", err
	}
	return 0, s, nil
}

// jobTitle is the manifest title of a job, else "<plugin name> · <id>".
func jobTitle(m *manifest.Manifest, j manifest.Job) core.LocalizedText {
	if len(j.Title) > 0 {
		return core.LocalizedText(maps.Clone(j.Title))
	}
	out := core.LocalizedText{}
	if m != nil {
		for lang, n := range m.Name {
			if n != "" {
				out[lang] = n + " · " + j.ID
			}
		}
	}
	if len(out) == 0 {
		out["en"] = j.ID
	}
	return out
}

// signature identifies what a registration depends on: a change re-registers
// the task.
func signature(source string, s core.TaskSpec) string {
	title, _ := json.Marshal(s.Title)
	return strings.Join([]string{source, string(s.Scope), s.Every.String(), s.Cron, s.Timeout.String(),
		strconv.Itoa(s.MaxAttempts), strconv.FormatBool(s.RequireWork), string(title)}, "|")
}

// ---------------------------------------------------------------- runs

// handler runs plugin job jobID, a runtime task when runtime;
// periodicArgs are the args of a periodic run of a runtime task (an enqueued
// run brings its own).
func (b *Bridge) handler(key, jobID string, scope core.TaskScope, timeout time.Duration, runtime bool, periodicArgs []byte) core.TaskHandler {
	return func(ctx context.Context, run core.TaskRun) (core.TaskResult, error) {
		if run.Args == nil && len(periodicArgs) > 0 {
			run.Args = periodicArgs
		}
		return b.run(ctx, key, jobID, scope, timeout, runtime, run)
	}
}

// runner finds what runs the job on this node's generation: the binding of
// a manifest job, the plugin's job runner for a runtime task.
func (b *Bridge) runner(key, jobID string, runtime bool) (core.AppPlugin, bool) {
	gen := b.registry.Current()
	if gen == nil {
		return nil, false
	}
	if runtime {
		app, ok := gen.JobRunner(key)
		return app, ok && app != nil
	}
	for _, jb := range gen.Jobs() {
		if jb.Plugin.Key == key && jb.Job.ID == jobID && jb.Client != nil {
			return jb.Client, true
		}
	}
	return nil, false
}

// run is one run of a plugin job.
func (b *Bridge) run(ctx context.Context, key, jobID string, scope core.TaskScope, timeout time.Duration, runtime bool, run core.TaskRun) (core.TaskResult, error) {
	app, ok := b.runner(key, jobID, runtime)
	if !ok {
		return core.TaskResult{}, b.notHere(ctx, key, scope, timeout, run)
	}
	id, err := b.insertRun(ctx, key, jobID, scope, run)
	if errors.Is(err, errSlotTaken) {
		return core.TaskResult{}, core.TaskSkipped("another node already ran this slot")
	}
	if err != nil {
		return core.TaskResult{}, fmt.Errorf("record the run: %w", err)
	}
	started := time.Now()
	resp, err := app.RunJob(ctx, &pluginv1.RunJobRequest{
		JobId: jobID, ScheduledAtUnix: run.ScheduledAt.Unix(), Manual: run.Manual,
		Args: run.Args, Scope: string(scope), Attempt: int32(run.Attempt), RunId: run.RunID,
	})
	status, msg := StatusSucceeded, resp.GetMessage()
	var retry time.Duration
	switch {
	case ctx.Err() == context.DeadlineExceeded:
		status, msg = StatusTimeout, fmt.Sprintf("timed out after %s", timeout)
	case ctx.Err() != nil:
		status, msg = StatusFailed, "canceled: node shutting down"
	case err != nil:
		status, msg = StatusFailed, err.Error()
	case resp.GetRetryAfterMs() > 0:
		retry = time.Duration(resp.GetRetryAfterMs()) * time.Millisecond
		status = StatusSkipped
		if msg == "" {
			msg = fmt.Sprintf("put off by the plugin for %s", retry)
		}
	}
	msg = truncate(msg)
	if status != StatusSucceeded && status != StatusSkipped {
		b.log.Warn("job finished", "plugin", key, "job", jobID, "scope", scope, "run_id", id, "manual", run.Manual,
			"status", status, "duration", time.Since(started), "message", msg)
	}
	b.finishRun(id, status, msg)
	res := core.TaskResult{Count: int(resp.GetCount()), Message: msg}
	switch {
	case err != nil:
		return res, err
	case status == StatusTimeout || status == StatusFailed:
		return res, ctx.Err()
	case retry > 0:
		return res, core.TaskRetryAfter(retry)
	}
	return res, nil
}

// notHere is the outcome of a run on a node without the plugin's job.
func (b *Bridge) notHere(ctx context.Context, key string, scope core.TaskScope, timeout time.Duration, run core.TaskRun) error {
	if scope == core.TaskNode {
		return core.TaskSkipped("the plugin is not running on this node")
	}
	var p pluginState
	err := b.db.Pool.QueryRow(ctx, `SELECT status, COALESCE(active_version, '') FROM plugins WHERE key = $1`, key).Scan(&p.status, &p.active)
	if store.IsNoRows(err) || (err == nil && !p.serving()) {
		return core.TaskSkipped("the plugin is not enabled")
	}
	if err != nil {
		return err
	}
	if time.Since(run.QueuedAt) < timeout {
		return core.TaskRetryAfter(notLoadedRetry)
	}
	return fmt.Errorf("plugin %s is not running on node %s (nor on any node that picked the run up within %s)", key, b.nodeID, timeout)
}

var errSlotTaken = errors.New("jobs: slot already ran")

// insertRun records the start of a run. A scheduled cluster run claims its
// slot: errSlotTaken when the slot already has a run.
func (b *Bridge) insertRun(ctx context.Context, key, jobID string, scope core.TaskScope, run core.TaskRun) (int64, error) {
	var id int64
	if scope == core.TaskCluster && !run.Manual {
		err := b.db.Pool.QueryRow(ctx, `INSERT INTO plugin_job_runs (plugin_key, job_id, node_id, scheduled_at, started_at, status, manual, scope)
			SELECT $1::varchar, $2::varchar, $3::varchar, $4::timestamptz, now(), $5::varchar, false, $6
			WHERE NOT EXISTS (SELECT 1 FROM plugin_job_runs
				WHERE plugin_key = $1 AND job_id = $2 AND scheduled_at = $4 AND NOT manual)
			RETURNING id`, key, jobID, b.nodeID, run.ScheduledAt, StatusRunning, string(scope)).Scan(&id)
		if store.IsNoRows(err) || store.IsUniqueViolation(err, slotUniqueIndex) {
			return 0, errSlotTaken
		}
		return id, err
	}
	err := b.db.Pool.QueryRow(ctx, `INSERT INTO plugin_job_runs (plugin_key, job_id, node_id, scheduled_at, started_at, status, manual, scope)
		VALUES ($1, $2, $3, $4, now(), $5, $6, $7) RETURNING id`,
		key, jobID, b.nodeID, run.ScheduledAt, StatusRunning, run.Manual, string(scope)).Scan(&id)
	if store.IsUniqueViolation(err, slotUniqueIndex) {
		// Two nodes started the same node job in the same microsecond: the
		// run goes ahead without a row of its own.
		return 0, nil
	}
	return id, err
}

func (b *Bridge) finishRun(id int64, status, msg string) {
	if id == 0 {
		return
	}
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()
	if _, err := b.db.Pool.Exec(ctx, `UPDATE plugin_job_runs SET status = $2, message = $3, finished_at = now() WHERE id = $1`,
		id, status, msg); err != nil {
		b.log.Warn("job run update failed", "run_id", id, "err", err)
	}
}

func truncate(s string) string {
	if len(s) <= maxMessageLen {
		return s
	}
	cut := maxMessageLen
	for cut > 0 && s[cut]&0xC0 == 0x80 {
		cut--
	}
	return s[:cut]
}

// ---------------------------------------------------------------- manual runs

// RunNow implements core.JobTrigger: a cluster job gets one manual run on
// some node (one waits at a time), a node job runs now on every node. The
// outcome is recorded like any run.
func (b *Bridge) RunNow(ctx context.Context, pluginKey, jobID string, actorID int64) error {
	b.mu.Lock()
	tasks, started := b.tasks, b.started && !b.stopped
	reg, ok := b.registered[TaskName(pluginKey, jobID)]
	b.mu.Unlock()
	if !started {
		return core.ErrUnavailable.WithMessage("job scheduler is not running")
	}
	if !ok {
		return b.missing(ctx, pluginKey, jobID)
	}
	name := TaskName(pluginKey, jobID)
	var err error
	if reg.scope == core.TaskNode {
		err = tasks.RunOnNodes(ctx, name, "")
	} else {
		err = tasks.Trigger(ctx, name)
	}
	switch {
	case errors.Is(err, core.ErrTaskUnknown):
		return core.ErrPluginUnavailable
	case errors.Is(err, core.ErrTaskNotReady):
		return core.ErrUnavailable.WithMessage("scheduled tasks are not running on this node").WithCause(err)
	case err != nil:
		return err
	}
	b.log.Info("manual job run", "plugin", pluginKey, "job", jobID, "scope", reg.scope, "actor_id", actorID)
	return nil
}

// missing explains why a job is not registered here.
func (b *Bridge) missing(ctx context.Context, pluginKey, jobID string) error {
	if gen := b.registry.Current(); gen != nil {
		if p, ok := gen.Plugin(pluginKey); ok {
			if p.Manifest != nil {
				for _, j := range p.Manifest.Jobs {
					if j.ID == jobID {
						return core.ErrPluginUnavailable
					}
				}
			}
			return core.ErrNotFound.WithMessage("job not found")
		}
	}
	var exists bool
	if err := b.db.Pool.QueryRow(ctx, `SELECT EXISTS (SELECT 1 FROM plugins WHERE key = $1)`, pluginKey).Scan(&exists); err != nil {
		return err
	}
	if exists {
		return core.ErrPluginUnavailable
	}
	return core.ErrNotFound.WithMessage("plugin not found")
}
