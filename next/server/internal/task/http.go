package task

import (
	"context"
	"encoding/json"
	"errors"
	"net/http"
	"slices"
	"sort"
	"strconv"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/redis/go-redis/v9"

	"github.com/Sub2API-Devs/sup2api/next/server/internal/audit"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/core"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/httpapi"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/store"
)

// Console permissions (TASK-FRAMEWORK-DESIGN §10.1).
const (
	PermRead   = "task:read"
	PermRun    = "task:run"
	PermManage = "task:manage"
)

// Audit actions: a manual run, a plugin task switched on or off.
const (
	ActionRunManual = "task.run_manual"
	ActionSetEnable = "task.set_enabled"
)

// Console statuses beyond the run statuses: a cluster run not finished yet.
const (
	StatusRunning   = "running"
	StatusQueued    = "queued"
	StatusRetrying  = "retrying"
	StatusCancelled = "cancelled"
)

const (
	recentRuns   = 30
	runsPageMax  = 200
	runsPageSize = 50
)

var (
	errTaskNotFound = core.NewError(http.StatusNotFound, "task_not_found", "scheduled task not found")
	errNodeRequired = core.NewError(http.StatusBadRequest, "node_required", "node_id is required for a node task")
	errNodeOffline  = core.NewError(http.StatusConflict, "node_offline", "the node is not online")
	errTaskNotReady = core.NewError(http.StatusServiceUnavailable, "task_not_ready", "scheduled tasks are not running on this node")
	errNotEditable  = core.NewError(http.StatusBadRequest, "task_not_editable", "only plugin cluster tasks can be switched on and off")
)

// LiveNodes lists the nodes online now (cluster.Registry).
type LiveNodes interface {
	LiveNodes(ctx context.Context) ([]core.NodeStatus, error)
}

// RegisterRoutes mounts the console API (TASK-FRAMEWORK-DESIGN §10.2).
func (s *Service) RegisterRoutes(r *httpapi.Router, nodes LiveNodes) {
	h := &handlers{s: s, nodes: nodes}
	r.Perm(http.MethodGet, "/system/tasks", PermRead, h.overview)
	r.Perm(http.MethodGet, "/system/tasks/:name", PermRead, h.detail)
	r.Perm(http.MethodGet, "/system/tasks/:name/runs", PermRead, h.runs)
	r.Perm(http.MethodPost, "/system/tasks/:name/run", PermRun, h.run)
	r.Perm(http.MethodPatch, "/system/tasks/:name", PermManage, h.patch)
}

type handlers struct {
	s     *Service
	nodes LiveNodes
}

// ---------------------------------------------------------------- views

// RunSummary is the latest run of a task.
type RunSummary struct {
	Node       string     `json:"node,omitempty"`
	StartedAt  *time.Time `json:"started_at,omitempty"`
	FinishedAt *time.Time `json:"finished_at,omitempty"`
	DurationMS int64      `json:"duration_ms"`
	Status     string     `json:"status"`
	Count      int        `json:"count"`
	Message    string     `json:"message,omitempty"`
	Error      string     `json:"error,omitempty"`
}

// Stats24h aggregates the runs of the last 24 hours.
type Stats24h struct {
	Runs    int   `json:"runs"`
	Failed  int   `json:"failed"`
	Skipped int   `json:"skipped"`
	AvgMS   int64 `json:"avg_ms"`
	MaxMS   int64 `json:"max_ms"`
}

// ClusterTaskView is one cluster task on the console.
type ClusterTaskView struct {
	Name                string             `json:"name"`
	Title               core.LocalizedText `json:"title,omitempty"`
	Description         core.LocalizedText `json:"description,omitempty"`
	Source              string             `json:"source"`
	PluginKey           *string            `json:"plugin_key"`
	Schedule            string             `json:"schedule"`
	TimeoutMS           int64              `json:"timeout_ms"`
	MaxAttempts         int                `json:"max_attempts"`
	Enabled             bool               `json:"enabled"`
	Registered          bool               `json:"registered"` // known to the node that answered
	Running             bool               `json:"running"`
	LeaseNode           *string            `json:"lease_node"`
	Last                *RunSummary        `json:"last"`
	LastSuccessAt       *time.Time         `json:"last_success_at"`
	ConsecutiveFailures int                `json:"consecutive_failures"`
	NextRunAt           *time.Time         `json:"next_run_at"`
	Recent              []string           `json:"recent"`
	Stats24h            Stats24h           `json:"stats_24h"`
	Queued              int                `json:"queued"`
}

// NodeTaskView is one node task on one node.
type NodeTaskView struct {
	NodeTaskState
	Title       core.LocalizedText `json:"title,omitempty"`
	Description core.LocalizedText `json:"description,omitempty"`
	Recent      []string           `json:"recent"`
	Failed24h   int                `json:"failed_24h"`
}

// NodeView is the node tasks of one node.
type NodeView struct {
	NodeID string         `json:"node_id"`
	Alive  bool           `json:"alive"`
	Tasks  []NodeTaskView `json:"tasks"`
}

// Summary is the top of the console page.
type Summary struct {
	Total     int    `json:"total"`
	Running   int    `json:"running"`
	Failing   int    `json:"failing"`
	Failed24h int    `json:"failed_24h"`
	Leader    string `json:"leader"`
}

// Overview is GET /system/tasks.
type Overview struct {
	Summary Summary           `json:"summary"`
	Cluster []ClusterTaskView `json:"cluster"`
	Nodes   []NodeView        `json:"nodes"`
}

// ---------------------------------------------------------------- overview

func (h *handlers) overview(c *gin.Context) {
	httpapi.NoStore(c)
	ctx := c.Request.Context()
	if h.s.opts.DB == nil {
		httpapi.Fail(c, errTaskNotReady)
		return
	}
	cluster, err := h.s.clusterViews(ctx, "")
	if err != nil {
		httpapi.Fail(c, err)
		return
	}
	live, err := h.liveNodes(ctx)
	if err != nil {
		httpapi.Fail(c, err)
		return
	}
	nodes, err := h.s.nodeViews(ctx, live, "")
	if err != nil {
		httpapi.Fail(c, err)
		return
	}
	out := Overview{Cluster: cluster, Nodes: nodes}
	out.Summary.Leader = h.s.leader(ctx, live)
	names := map[string]bool{}
	for _, t := range cluster {
		names[t.Name] = true
		if t.Running {
			out.Summary.Running++
		}
		if t.ConsecutiveFailures > 0 {
			out.Summary.Failing++
		}
		out.Summary.Failed24h += t.Stats24h.Failed
	}
	for _, n := range nodes {
		for _, t := range n.Tasks {
			names[t.Name] = true
			if t.Running {
				out.Summary.Running++
			}
			if t.ConsecutiveFailures > 0 {
				out.Summary.Failing++
			}
			out.Summary.Failed24h += t.Failed24h
		}
	}
	out.Summary.Total = len(names)
	httpapi.OK(c, out)
}

func (h *handlers) liveNodes(ctx context.Context) (map[string]core.NodeStatus, error) {
	out := map[string]core.NodeStatus{}
	if h.nodes == nil {
		out[h.s.opts.NodeID] = core.NodeStatus{NodeID: h.s.opts.NodeID}
		return out, nil
	}
	nodes, err := h.nodes.LiveNodes(ctx)
	if err != nil {
		return nil, err
	}
	for _, n := range nodes {
		out[n.NodeID] = n
	}
	return out, nil
}

// runStatusSQL is the console status of a river_job row of a task.
const runStatusSQL = `CASE j.state
	WHEN 'running' THEN 'running'
	WHEN 'available' THEN 'queued' WHEN 'scheduled' THEN 'queued' WHEN 'pending' THEN 'queued'
	WHEN 'retryable' THEN 'retrying'
	WHEN 'cancelled' THEN 'cancelled'
	ELSE COALESCE(j.metadata->'output'->>'status', CASE j.state WHEN 'completed' THEN 'succeeded' ELSE 'failed' END)
	END`

// clusterViews reads the cluster tasks (only one when name is set).
func (s *Service) clusterViews(ctx context.Context, name string) ([]ClusterTaskView, error) {
	pool := s.opts.DB.Pool
	rows, err := pool.Query(ctx, `SELECT name, source, plugin_key, schedule, timeout_ms, max_attempts, enabled,
			lease_node, lease_until > now() AND lease_job_id IS NOT NULL,
			last_node, last_started_at, last_finished_at, last_status, COALESCE(last_count, 0), COALESCE(last_message, ''),
			COALESCE(last_error, ''), last_success_at, consecutive_failures
		FROM scheduled_tasks WHERE $1 = '' OR name = $1 ORDER BY name`, name)
	if err != nil {
		return nil, err
	}
	var out []ClusterTaskView
	now := time.Now()
	for rows.Next() {
		var v ClusterTaskView
		var lastNode, lastStatus *string
		var running *bool
		var started, finished *time.Time
		var count int
		var msg, errText string
		if err := rows.Scan(&v.Name, &v.Source, &v.PluginKey, &v.Schedule, &v.TimeoutMS, &v.MaxAttempts, &v.Enabled,
			&v.LeaseNode, &running, &lastNode, &started, &finished, &lastStatus, &count, &msg, &errText,
			&v.LastSuccessAt, &v.ConsecutiveFailures); err != nil {
			rows.Close()
			return nil, err
		}
		v.Running = running != nil && *running
		if !v.Running {
			v.LeaseNode = nil
		}
		if lastStatus != nil {
			v.Last = &RunSummary{Status: *lastStatus, StartedAt: started, FinishedAt: finished, Count: count,
				Message: msg, Error: errText}
			if lastNode != nil {
				v.Last.Node = *lastNode
			}
			if started != nil && finished != nil && !finished.Before(*started) {
				v.Last.DurationMS = finished.Sub(*started).Milliseconds()
			}
		}
		if t, ok := s.reg.Get(v.Name); ok && t.Scope == core.TaskCluster {
			v.Registered, v.Title, v.Description = true, t.Title, t.Description
			if t.Schedule != nil && v.Enabled {
				next := t.Schedule.Next(now).UTC()
				v.NextRunAt = &next
			}
		}
		v.Recent = []string{}
		out = append(out, v)
	}
	rows.Close()
	if err := rows.Err(); err != nil {
		return nil, err
	}
	if len(out) == 0 {
		return []ClusterTaskView{}, nil
	}
	names := make([]string, len(out))
	index := make(map[string]int, len(out))
	for i, v := range out {
		names[i], index[v.Name] = v.Name, i
	}

	recent, err := pool.Query(ctx, `SELECT t.name, r.statuses FROM unnest($1::text[]) AS t(name)
		CROSS JOIN LATERAL (SELECT COALESCE(array_agg(st ORDER BY id DESC), '{}') AS statuses FROM (
			SELECT j.id, `+runStatusSQL+` AS st FROM river_job j
			WHERE j.kind = 'sup2api.task' AND j.args->>'name' = t.name ORDER BY j.id DESC LIMIT $2) x) r`,
		names, recentRuns)
	if err != nil {
		return nil, err
	}
	for recent.Next() {
		var n string
		var sts []string
		if err := recent.Scan(&n, &sts); err != nil {
			recent.Close()
			return nil, err
		}
		out[index[n]].Recent = sts
	}
	recent.Close()
	if err := recent.Err(); err != nil {
		return nil, err
	}

	stats, err := pool.Query(ctx, `SELECT name,
			count(*) FILTER (WHERE st IN ('succeeded', 'failed', 'timeout', 'skipped')),
			count(*) FILTER (WHERE st IN ('failed', 'timeout')),
			count(*) FILTER (WHERE st = 'skipped'),
			COALESCE(avg(ms) FILTER (WHERE st <> 'skipped'), 0)::bigint, COALESCE(max(ms), 0),
			count(*) FILTER (WHERE st IN ('queued', 'retrying'))
		FROM (SELECT j.args->>'name' AS name, `+runStatusSQL+` AS st, (j.metadata->'output'->>'duration_ms')::bigint AS ms
			FROM river_job j WHERE j.kind = 'sup2api.task' AND j.args->>'name' = ANY($1)
				AND (j.created_at > now() - interval '24 hours' OR j.state IN ('available', 'scheduled', 'pending', 'retryable'))) x
		GROUP BY name`, names)
	if err != nil {
		return nil, err
	}
	defer stats.Close()
	for stats.Next() {
		var n string
		var st Stats24h
		var queued int
		if err := stats.Scan(&n, &st.Runs, &st.Failed, &st.Skipped, &st.AvgMS, &st.MaxMS, &queued); err != nil {
			return nil, err
		}
		out[index[n]].Stats24h, out[index[n]].Queued = st, queued
	}
	return out, stats.Err()
}

// nodeViews reads the node task states of every live node (one node and one
// task when set).
func (s *Service) nodeViews(ctx context.Context, live map[string]core.NodeStatus, name string) ([]NodeView, error) {
	ids := make([]string, 0, len(live))
	for id := range live {
		ids = append(ids, id)
	}
	sort.Strings(ids)
	out := make([]NodeView, 0, len(ids))
	rdb := s.opts.Redis
	since := time.Now().Add(-24 * time.Hour)
	for _, id := range ids {
		nv := NodeView{NodeID: id, Alive: true, Tasks: []NodeTaskView{}}
		var states map[string]NodeTaskState
		if rdb == nil {
			if id == s.opts.NodeID {
				states = map[string]NodeTaskState{}
				for _, st := range s.node.states() {
					states[st.Name] = st
				}
			}
		} else {
			var err error
			if states, err = ReadNodeStates(ctx, rdb, id); err != nil {
				return nil, err
			}
		}
		taskNames := make([]string, 0, len(states))
		for n := range states {
			if name == "" || n == name {
				taskNames = append(taskNames, n)
			}
		}
		sort.Strings(taskNames)
		histories, err := readHistories(ctx, rdb, id, taskNames)
		if err != nil {
			return nil, err
		}
		for i, n := range taskNames {
			tv := NodeTaskView{NodeTaskState: states[n], Recent: []string{}}
			if t, ok := s.reg.Get(n); ok {
				tv.Title, tv.Description = t.Title, t.Description
			}
			for j, run := range histories[i] {
				if j < recentRuns {
					tv.Recent = append(tv.Recent, run.Status)
				}
				if (run.Status == StatusFailed || run.Status == StatusTimeout) && run.FinishedAt.After(since) {
					tv.Failed24h++
				}
			}
			nv.Tasks = append(nv.Tasks, tv)
		}
		out = append(out, nv)
	}
	return out, nil
}

// readHistories reads the run histories of names on one node in one round
// trip.
func readHistories(ctx context.Context, rdb redis.UniversalClient, nodeID string, names []string) ([][]NodeTaskRun, error) {
	out := make([][]NodeTaskRun, len(names))
	if rdb == nil || len(names) == 0 {
		return out, nil
	}
	pipe := rdb.Pipeline()
	cmds := make([]*redis.StringSliceCmd, len(names))
	for i, n := range names {
		cmds[i] = pipe.LRange(ctx, nodeRunsKey(nodeID, n), 0, nodeRunsKeep-1)
	}
	if _, err := pipe.Exec(ctx); err != nil && !errors.Is(err, redis.Nil) {
		return nil, err
	}
	for i, cmd := range cmds {
		out[i] = decodeRuns(cmd.Val())
	}
	return out, nil
}

// leader is the node whose River client leads now ("" when none does).
func (s *Service) leader(ctx context.Context, live map[string]core.NodeStatus) string {
	var id string
	err := s.opts.DB.Pool.QueryRow(ctx, `SELECT leader_id FROM river_leader WHERE expires_at > now() LIMIT 1`).Scan(&id)
	if err != nil {
		return ""
	}
	for _, n := range live {
		if n.BootID != "" && id == n.NodeID+"-"+n.BootID {
			return n.NodeID
		}
	}
	if s.opts.ClientID != "" && id == s.opts.ClientID {
		return s.opts.NodeID
	}
	return id
}

// ---------------------------------------------------------------- detail

// TaskDetail is GET /system/tasks/:name.
type TaskDetail struct {
	Name        string             `json:"name"`
	Scope       core.TaskScope     `json:"scope"`
	Title       core.LocalizedText `json:"title,omitempty"`
	Description core.LocalizedText `json:"description,omitempty"`
	Schedule    string             `json:"schedule"`
	TimeoutMS   int64              `json:"timeout_ms"`
	MaxAttempts int                `json:"max_attempts,omitempty"`
	RequireWork bool               `json:"require_work,omitempty"`
	RunOnStart  bool               `json:"run_on_start,omitempty"`
	Cluster     *ClusterTaskView   `json:"cluster,omitempty"`
	Nodes       []NodeView         `json:"nodes,omitempty"`
}

func (h *handlers) detail(c *gin.Context) {
	httpapi.NoStore(c)
	ctx := c.Request.Context()
	name := c.Param("name")
	if h.s.opts.DB == nil {
		httpapi.Fail(c, errTaskNotReady)
		return
	}
	d := TaskDetail{Name: name}
	t, registered := h.s.reg.Get(name)
	if registered {
		d.Scope, d.Title, d.Description, d.Schedule = t.Scope, t.Title, t.Description, t.ScheduleText
		d.TimeoutMS, d.RequireWork, d.RunOnStart = t.Timeout.Milliseconds(), t.RequireWork, t.RunOnStart
		if t.Scope == core.TaskCluster {
			d.MaxAttempts = t.Attempts()
		}
	}
	if !registered || t.Scope == core.TaskCluster {
		views, err := h.s.clusterViews(ctx, name)
		if err != nil {
			httpapi.Fail(c, err)
			return
		}
		if len(views) == 1 {
			v := views[0]
			d.Cluster, d.Scope = &v, core.TaskCluster
			if !registered {
				d.Schedule, d.TimeoutMS, d.MaxAttempts = v.Schedule, v.TimeoutMS, v.MaxAttempts
			}
			httpapi.OK(c, d)
			return
		}
	}
	live, err := h.liveNodes(ctx)
	if err != nil {
		httpapi.Fail(c, err)
		return
	}
	nodes, err := h.s.nodeViews(ctx, live, name)
	if err != nil {
		httpapi.Fail(c, err)
		return
	}
	found := registered
	for _, n := range nodes {
		if len(n.Tasks) > 0 {
			found = true
			if !registered {
				st := n.Tasks[0]
				d.Schedule, d.TimeoutMS, d.RequireWork = st.Schedule, st.TimeoutMS, st.RequireWork
			}
		}
	}
	if !found {
		httpapi.Fail(c, errTaskNotFound)
		return
	}
	d.Scope, d.Nodes = core.TaskNode, nodes
	httpapi.OK(c, d)
}

// ---------------------------------------------------------------- runs

// RunView is one run of a task.
type RunView struct {
	ID          string       `json:"id"`
	Node        string       `json:"node,omitempty"`
	ScheduledAt *time.Time   `json:"scheduled_at,omitempty"`
	StartedAt   *time.Time   `json:"started_at,omitempty"`
	FinishedAt  *time.Time   `json:"finished_at,omitempty"`
	DurationMS  int64        `json:"duration_ms"`
	Attempt     int          `json:"attempt"`
	MaxAttempts int          `json:"max_attempts"`
	Status      string       `json:"status"`
	Manual      bool         `json:"manual"`
	Count       int          `json:"count"`
	Message     string       `json:"message,omitempty"`
	Error       string       `json:"error,omitempty"`
	Errors      []AttemptErr `json:"errors,omitempty"`
}

// AttemptErr is the error of one failed attempt.
type AttemptErr struct {
	Attempt int       `json:"attempt"`
	At      time.Time `json:"at"`
	Error   string    `json:"error"`
}

// RunsPage is GET /system/tasks/:name/runs.
type RunsPage struct {
	Runs         []RunView `json:"runs"`
	NextBeforeID *int64    `json:"next_before_id"`
}

var runFilters = map[string][]string{
	"":              {},
	StatusSucceeded: {StatusSucceeded},
	StatusFailed:    {StatusFailed, StatusTimeout},
	StatusTimeout:   {StatusTimeout},
	StatusSkipped:   {StatusSkipped},
	StatusQueued:    {StatusQueued, StatusRetrying},
	StatusRetrying:  {StatusRetrying},
	StatusRunning:   {StatusRunning},
	StatusCancelled: {StatusCancelled},
}

func (h *handlers) runs(c *gin.Context) {
	httpapi.NoStore(c)
	ctx := c.Request.Context()
	name := c.Param("name")
	statuses, ok := runFilters[c.Query("status")]
	if !ok {
		httpapi.Fail(c, core.ErrInvalidArgument.WithMessage("unknown status filter"))
		return
	}
	scope, known := h.s.scopeOf(ctx, name)
	if !known {
		httpapi.Fail(c, errTaskNotFound)
		return
	}
	if scope == core.TaskNode {
		nodeID := c.Query("node_id")
		if nodeID == "" {
			httpapi.Fail(c, errNodeRequired)
			return
		}
		runs, err := h.s.nodeRuns(ctx, nodeID, name)
		if err != nil {
			httpapi.Fail(c, err)
			return
		}
		out := RunsPage{Runs: []RunView{}}
		for _, r := range runs {
			if len(statuses) > 0 && !slices.Contains(statuses, r.Status) {
				continue
			}
			started, finished := r.StartedAt, r.FinishedAt
			out.Runs = append(out.Runs, RunView{ID: r.ID, Node: nodeID, ScheduledAt: &started, StartedAt: &started,
				FinishedAt: &finished, DurationMS: r.DurationMS, Attempt: 1, MaxAttempts: 1, Status: r.Status,
				Manual: r.Manual, Count: r.Count, Message: r.Message, Error: r.Error})
		}
		httpapi.OK(c, out)
		return
	}

	limit := runsPageSize
	if v := c.Query("limit"); v != "" {
		n, err := strconv.Atoi(v)
		if err != nil || n < 1 {
			httpapi.Fail(c, core.ErrInvalidArgument.WithMessage("invalid limit"))
			return
		}
		limit = min(n, runsPageMax)
	}
	var before int64
	if v := c.Query("before_id"); v != "" {
		n, err := strconv.ParseInt(v, 10, 64)
		if err != nil || n < 1 {
			httpapi.Fail(c, core.ErrInvalidArgument.WithMessage("invalid before_id"))
			return
		}
		before = n
	}
	page, err := h.s.clusterRuns(ctx, name, statuses, before, limit)
	if err != nil {
		httpapi.Fail(c, err)
		return
	}
	httpapi.OK(c, page)
}

// scopeOf says whether name is a cluster or a node task, by this node's
// registry first, then by scheduled_tasks (cluster tasks of other versions).
func (s *Service) scopeOf(ctx context.Context, name string) (core.TaskScope, bool) {
	if t, ok := s.reg.Get(name); ok {
		return t.Scope, true
	}
	if s.opts.DB == nil {
		return "", false
	}
	var exists bool
	if err := s.opts.DB.Pool.QueryRow(ctx, `SELECT EXISTS (SELECT 1 FROM scheduled_tasks WHERE name = $1)`, name).Scan(&exists); err == nil && exists {
		return core.TaskCluster, true
	}
	return "", false
}

func (s *Service) nodeRuns(ctx context.Context, nodeID, name string) ([]NodeTaskRun, error) {
	if s.opts.Redis == nil {
		return []NodeTaskRun{}, nil
	}
	return ReadNodeRuns(ctx, s.opts.Redis, nodeID, name)
}

type riverError struct {
	At      time.Time `json:"at"`
	Attempt int       `json:"attempt"`
	Error   string    `json:"error"`
}

func (s *Service) clusterRuns(ctx context.Context, name string, statuses []string, before int64, limit int) (RunsPage, error) {
	rows, err := s.opts.DB.Pool.Query(ctx, `SELECT id, st, scheduled_at, attempted_at, finalized_at, attempt, max_attempts,
			COALESCE((args->>'manual')::boolean, false), metadata->'output', errors, attempted_by
		FROM (SELECT j.*, `+runStatusSQL+` AS st FROM river_job j
			WHERE j.kind = 'sup2api.task' AND j.args->>'name' = $1 AND ($2 = 0 OR j.id < $2) ORDER BY j.id DESC) x
		WHERE cardinality($3::text[]) = 0 OR st = ANY($3)
		ORDER BY id DESC LIMIT $4`, name, before, statuses, limit+1)
	if err != nil {
		return RunsPage{}, err
	}
	defer rows.Close()
	out := RunsPage{Runs: []RunView{}}
	var lastID int64
	for rows.Next() {
		var v RunView
		var id int64
		var scheduled time.Time
		var attempted, finalized *time.Time
		var output *runOutput
		var errs []riverError
		var attemptedBy []string
		if err := rows.Scan(&id, &v.Status, &scheduled, &attempted, &finalized, &v.Attempt, &v.MaxAttempts, &v.Manual,
			&output, &errs, &attemptedBy); err != nil {
			return RunsPage{}, err
		}
		if len(out.Runs) == limit {
			out.NextBeforeID = &lastID
			break
		}
		lastID = id
		v.ID = strconv.FormatInt(id, 10)
		v.ScheduledAt, v.StartedAt, v.FinishedAt = &scheduled, attempted, finalized
		if output != nil {
			v.Node, v.DurationMS, v.Count = output.Node, output.DurationMS, output.Count
			v.Message, v.Error = output.Message, output.Error
		} else if len(attemptedBy) > 0 {
			v.Node = attemptedBy[len(attemptedBy)-1]
		}
		for _, e := range errs {
			v.Errors = append(v.Errors, AttemptErr{Attempt: e.Attempt, At: e.At, Error: truncate(e.Error)})
		}
		if v.Error == "" && len(errs) > 0 && v.Status != StatusSucceeded {
			v.Error = truncate(errs[len(errs)-1].Error)
		}
		out.Runs = append(out.Runs, v)
	}
	return out, rows.Err()
}

// ---------------------------------------------------------------- run

type runBody struct {
	NodeID string `json:"node_id"`
}

func (h *handlers) run(c *gin.Context) {
	ctx := audit.Context(c)
	name := c.Param("name")
	var body runBody
	if c.Request.ContentLength != 0 && !httpapi.BindJSON(c, &body) {
		return
	}
	scope, known := h.s.scopeOf(ctx, name)
	if !known {
		httpapi.Fail(c, errTaskNotFound)
		return
	}
	var err error
	switch scope {
	case core.TaskNode:
		if body.NodeID != "" {
			live, lerr := h.liveNodes(ctx)
			if lerr != nil {
				httpapi.Fail(c, lerr)
				return
			}
			if _, ok := live[body.NodeID]; !ok {
				httpapi.Fail(c, errNodeOffline)
				return
			}
		}
		err = h.s.RunOnNodes(ctx, name, body.NodeID)
	default:
		body.NodeID = ""
		err = h.s.Trigger(ctx, name)
	}
	switch {
	case errors.Is(err, core.ErrTaskUnknown):
		// A cluster task only another version registers: this node cannot
		// submit it (its handler and attempts are not known here).
		httpapi.Fail(c, errTaskNotFound)
		return
	case errors.Is(err, core.ErrTaskNotReady):
		httpapi.Fail(c, errTaskNotReady)
		return
	case err != nil:
		httpapi.Fail(c, err)
		return
	}
	uid, _ := core.UserID(ctx)
	detail := map[string]any{"scope": string(scope)}
	if scope == core.TaskNode {
		detail["node_id"] = body.NodeID
	}
	if h.s.opts.DB != nil {
		if aerr := audit.Audit(ctx, h.s.opts.DB.Pool, uid, ActionRunManual, "task", name, detail); aerr != nil {
			h.s.log.Warn("task: audit manual run", "task", name, "err", aerr)
		}
	}
	httpapi.Accepted(c, gin.H{"submitted": true})
}

// decodeRuns decodes a Redis history list, newest first.
func decodeRuns(raw []string) []NodeTaskRun {
	out := make([]NodeTaskRun, 0, len(raw))
	for _, v := range raw {
		var r NodeTaskRun
		if json.Unmarshal([]byte(v), &r) == nil {
			out = append(out, r)
		}
	}
	return out
}

// ---------------------------------------------------------------- patch

type patchBody struct {
	Enabled *bool `json:"enabled"`
}

// patch switches a plugin cluster task on or off. The plugin task bridge
// (internal/job) of every node follows the row on task:changed: a stopped
// task is unregistered, so it is neither enqueued nor run.
func (h *handlers) patch(c *gin.Context) {
	ctx := audit.Context(c)
	name := c.Param("name")
	var body patchBody
	if !httpapi.BindJSON(c, &body) {
		return
	}
	if body.Enabled == nil {
		httpapi.Fail(c, core.ErrInvalidArgument.WithMessage("enabled is required"))
		return
	}
	if h.s.opts.DB == nil {
		httpapi.Fail(c, errTaskNotReady)
		return
	}
	var source string
	err := h.s.opts.DB.Pool.QueryRow(ctx, `UPDATE scheduled_tasks SET enabled = $2, updated_at = now()
		WHERE name = $1 AND source IN ($3, $4) RETURNING source`, name, *body.Enabled,
		string(SourcePluginManifest), string(SourcePluginRuntime)).Scan(&source)
	if store.IsNoRows(err) {
		if _, known := h.s.scopeOf(ctx, name); known {
			httpapi.Fail(c, errNotEditable)
			return
		}
		httpapi.Fail(c, errTaskNotFound)
		return
	}
	if err != nil {
		httpapi.Fail(c, err)
		return
	}
	if h.s.opts.Bus != nil {
		if perr := h.s.opts.Bus.Publish(ctx, core.ChannelTaskChanged, []byte(`{}`)); perr != nil {
			h.s.log.Warn("task: announce task change", "task", name, "err", perr)
		}
	}
	uid, _ := core.UserID(ctx)
	if aerr := audit.Audit(ctx, h.s.opts.DB.Pool, uid, ActionSetEnable, "task", name,
		map[string]any{"enabled": *body.Enabled, "source": source}); aerr != nil {
		h.s.log.Warn("task: audit task switch", "task", name, "err", aerr)
	}
	httpapi.OK(c, gin.H{"name": name, "enabled": *body.Enabled})
}
