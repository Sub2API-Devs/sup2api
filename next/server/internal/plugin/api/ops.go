package api

import (
	"context"
	"encoding/json"
	"log/slog"
	"strings"
	"time"

	"github.com/gin-gonic/gin"

	"github.com/Sub2API-Devs/sup2api/next/sdk/manifest"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/core"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/httpapi"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/plugin/install"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/plugin/pkg"
)

// ---------------------------------------------------------------- nodes

func (a *API) liveNodes(ctx context.Context) []core.NodeStatus {
	if a.d.Nodes == nil {
		return nil
	}
	nodes, err := a.d.Nodes.LiveNodes(ctx)
	if err != nil {
		slog.WarnContext(ctx, "list live nodes", "err", err)
		return nil
	}
	return nodes
}

func stateJSON(s string) json.RawMessage {
	if json.Valid([]byte(s)) {
		return json.RawMessage(s)
	}
	b, _ := json.Marshal(s)
	return b
}

func summarizeNodes(nodes []core.NodeStatus, key string) NodeSummary {
	out := NodeSummary{Total: len(nodes), States: map[string]int{}}
	for _, n := range nodes {
		raw, ok := n.Plugins[key]
		if !ok {
			out.States["absent"]++
			continue
		}
		var st struct {
			State string `json:"state"`
		}
		if json.Unmarshal([]byte(raw), &st) != nil || st.State == "" {
			st.State = "unknown"
		}
		out.States[st.State]++
	}
	return out
}

func nodeStates(nodes []core.NodeStatus, key string) []NodeState {
	out := []NodeState{}
	for _, n := range nodes {
		raw, ok := n.Plugins[key]
		if !ok {
			continue
		}
		out = append(out, NodeState{NodeID: n.NodeID, BootID: n.BootID, Addr: n.Addr, LastHeartbeat: n.LastHeartbeat, State: stateJSON(raw)})
	}
	return out
}

// NodeView is one row of GET /nodes (plugin states decoded as JSON).
type NodeView struct {
	NodeID        string                     `json:"node_id"`
	BootID        string                     `json:"boot_id"`
	Addr          string                     `json:"addr"`
	HostVersion   string                     `json:"host_version"`
	StartedAt     time.Time                  `json:"started_at"`
	LastHeartbeat time.Time                  `json:"last_heartbeat"`
	Plugins       map[string]json.RawMessage `json:"plugins"`
}

func (a *API) nodes(c *gin.Context) {
	if a.d.Nodes == nil {
		httpapi.OK(c, []NodeView{})
		return
	}
	nodes, err := a.d.Nodes.LiveNodes(c.Request.Context())
	if err != nil {
		httpapi.Fail(c, err)
		return
	}
	out := make([]NodeView, 0, len(nodes))
	for _, n := range nodes {
		v := NodeView{NodeID: n.NodeID, BootID: n.BootID, Addr: n.Addr, HostVersion: n.HostVersion, StartedAt: n.StartedAt,
			LastHeartbeat: n.LastHeartbeat, Plugins: map[string]json.RawMessage{}}
		for k, s := range n.Plugins {
			v.Plugins[k] = stateJSON(s)
		}
		out = append(out, v)
	}
	httpapi.OK(c, out)
}

// ---------------------------------------------------------------- jobs

// JobInfo is a manifest job with its latest run.
type JobInfo struct {
	ID         string     `json:"id"`
	Schedule   string     `json:"schedule"`
	TimeoutSec int        `json:"timeout_sec"`
	NextRunAt  *time.Time `json:"next_run_at"`
	LastRun    *JobRun    `json:"last_run"`
}

// JobRun is a plugin_job_runs row.
type JobRun struct {
	ID          int64      `json:"id"`
	JobID       string     `json:"job_id"`
	NodeID      string     `json:"node_id"`
	ScheduledAt time.Time  `json:"scheduled_at"`
	StartedAt   time.Time  `json:"started_at"`
	FinishedAt  *time.Time `json:"finished_at"`
	Status      string     `json:"status"`
	Manual      bool       `json:"manual"`
	Message     string     `json:"message"`
}

const jobRunCols = `id, job_id, node_id, scheduled_at, started_at, finished_at, status, manual, message`

func scanRuns(rows interface {
	Next() bool
	Scan(...any) error
	Err() error
	Close()
}) ([]JobRun, error) {
	defer rows.Close()
	out := []JobRun{}
	for rows.Next() {
		var r JobRun
		if err := rows.Scan(&r.ID, &r.JobID, &r.NodeID, &r.ScheduledAt, &r.StartedAt, &r.FinishedAt, &r.Status, &r.Manual, &r.Message); err != nil {
			return nil, err
		}
		out = append(out, r)
	}
	return out, rows.Err()
}

func (a *API) jobInfos(ctx context.Context, key string, m *manifest.Manifest) ([]JobInfo, error) {
	rows, err := a.d.DB.Pool.Query(ctx, `SELECT DISTINCT ON (job_id) `+jobRunCols+`
		FROM plugin_job_runs WHERE plugin_key = $1 ORDER BY job_id, id DESC`, key)
	if err != nil {
		return nil, err
	}
	runs, err := scanRuns(rows)
	if err != nil {
		return nil, err
	}
	last := map[string]JobRun{}
	for _, r := range runs {
		last[r.JobID] = r
	}
	out := []JobInfo{}
	now := time.Now().UTC()
	for _, j := range m.Jobs {
		ji := JobInfo{ID: j.ID, Schedule: j.Schedule, TimeoutSec: j.TimeoutSec}
		if sch, err := pkg.ParseSchedule(j.Schedule); err == nil {
			next := sch.Next(now)
			ji.NextRunAt = &next
		}
		if r, ok := last[j.ID]; ok {
			r := r
			ji.LastRun = &r
		}
		out = append(out, ji)
	}
	return out, nil
}

func (a *API) currentManifest(c *gin.Context, key string) (*manifest.Manifest, string, bool) {
	rc := c.Request.Context()
	if _, ok := a.pluginStatus(c, key); !ok {
		return nil, "", false
	}
	v, err := install.CurrentVersion(rc, a.d.DB.Pool, key)
	if err != nil {
		httpapi.Fail(c, err)
		return nil, "", false
	}
	if v == "" {
		httpapi.Fail(c, core.ErrNotFound.WithMessage("plugin has no version"))
		return nil, "", false
	}
	m, err := install.LoadManifest(rc, a.d.DB.Pool, key, v)
	if err != nil {
		httpapi.Fail(c, err)
		return nil, "", false
	}
	return m, v, true
}

func (a *API) jobs(c *gin.Context) {
	key := c.Param("key")
	m, _, ok := a.currentManifest(c, key)
	if !ok {
		return
	}
	rc := c.Request.Context()
	jobs, err := a.jobInfos(rc, key, m)
	if err != nil {
		httpapi.Fail(c, err)
		return
	}
	rows, err := a.d.DB.Pool.Query(rc, `SELECT `+jobRunCols+` FROM plugin_job_runs WHERE plugin_key = $1 ORDER BY id DESC LIMIT 50`, key)
	if err != nil {
		httpapi.Fail(c, err)
		return
	}
	runs, err := scanRuns(rows)
	if err != nil {
		httpapi.Fail(c, err)
		return
	}
	httpapi.OK(c, gin.H{"jobs": jobs, "recent_runs": runs})
}

func (a *API) runJob(c *gin.Context) {
	key, jobID := c.Param("key"), c.Param("job_id")
	m, _, ok := a.currentManifest(c, key)
	if !ok {
		return
	}
	found := false
	for _, j := range m.Jobs {
		found = found || j.ID == jobID
	}
	if !found {
		httpapi.Fail(c, core.ErrNotFound.WithMessage("job not found"))
		return
	}
	if a.d.Jobs == nil {
		httpapi.Fail(c, core.ErrUnavailable.WithMessage("job runner unavailable"))
		return
	}
	if err := a.d.Jobs.RunNow(ctx(c), key, jobID, actor(c)); err != nil {
		httpapi.Fail(c, err)
		return
	}
	a.audit(c, "plugin.job.run", key, map[string]any{"job_id": jobID})
	httpapi.NoContent(c)
}

// ---------------------------------------------------------------- events

// EventsInfo is the event subscription state of a plugin.
type EventsInfo struct {
	Subscribe       []string     `json:"subscribe"`
	BatchSize       int          `json:"batch_size"`
	Cursor          *EventCursor `json:"cursor"`
	Backlog         int64        `json:"backlog"`
	BacklogCapped   bool         `json:"backlog_capped"`
	DeadletterCount int64        `json:"deadletter_count"`
	Deadletters     []Deadletter `json:"deadletters"`
}

type EventCursor struct {
	LastEventID         int64      `json:"last_event_id"`
	ConsecutiveFailures int        `json:"consecutive_failures"`
	NextRetryAt         *time.Time `json:"next_retry_at"`
	LastError           string     `json:"last_error"`
	UpdatedAt           time.Time  `json:"updated_at"`
}

type Deadletter struct {
	ID           int64     `json:"id"`
	FirstEventID int64     `json:"first_event_id"`
	LastEventID  int64     `json:"last_event_id"`
	Error        string    `json:"error"`
	CreatedAt    time.Time `json:"created_at"`
}

const backlogCap = 100000

// likePatterns converts subscribe patterns to exact types and LIKE patterns.
func likePatterns(subs []string) (exact, like []string) {
	esc := strings.NewReplacer(`\`, `\\`, `%`, `\%`, `_`, `\_`)
	for _, s := range subs {
		if strings.HasSuffix(s, "*") {
			like = append(like, esc.Replace(strings.TrimSuffix(s, "*"))+"%")
		} else {
			exact = append(exact, s)
		}
	}
	return exact, like
}

func (a *API) eventsInfo(ctx context.Context, key string, m *manifest.Manifest) (*EventsInfo, error) {
	info := &EventsInfo{Subscribe: []string{}, Deadletters: []Deadletter{}}
	if m.Events != nil {
		info.Subscribe, info.BatchSize = m.Events.Subscribe, m.Events.BatchSize
	}
	var cur EventCursor
	err := a.d.DB.Pool.QueryRow(ctx, `SELECT last_event_id, consecutive_failures, next_retry_at, last_error, updated_at
		FROM plugin_event_cursors WHERE plugin_key = $1`, key).
		Scan(&cur.LastEventID, &cur.ConsecutiveFailures, &cur.NextRetryAt, &cur.LastError, &cur.UpdatedAt)
	switch {
	case err == nil:
		info.Cursor = &cur
	case !isNoRows(err):
		return nil, err
	}
	if len(info.Subscribe) > 0 && info.Cursor != nil {
		exact, like := likePatterns(info.Subscribe)
		if exact == nil {
			exact = []string{}
		}
		if like == nil {
			like = []string{}
		}
		if err := a.d.DB.Pool.QueryRow(ctx, `SELECT count(*) FROM (
			SELECT 1 FROM events WHERE id > $1 AND (type = ANY($2) OR type LIKE ANY($3)) LIMIT $4) t`,
			cur.LastEventID, exact, like, backlogCap+1).Scan(&info.Backlog); err != nil {
			return nil, err
		}
		if info.Backlog > backlogCap {
			info.Backlog, info.BacklogCapped = backlogCap, true
		}
	}
	if err := a.d.DB.Pool.QueryRow(ctx, `SELECT count(*) FROM plugin_event_deadletters WHERE plugin_key = $1`, key).
		Scan(&info.DeadletterCount); err != nil {
		return nil, err
	}
	rows, err := a.d.DB.Pool.Query(ctx, `SELECT id, first_event_id, last_event_id, error, created_at
		FROM plugin_event_deadletters WHERE plugin_key = $1 ORDER BY id DESC LIMIT 50`, key)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	for rows.Next() {
		var d Deadletter
		if err := rows.Scan(&d.ID, &d.FirstEventID, &d.LastEventID, &d.Error, &d.CreatedAt); err != nil {
			return nil, err
		}
		info.Deadletters = append(info.Deadletters, d)
	}
	return info, rows.Err()
}

func (a *API) events(c *gin.Context) {
	key := c.Param("key")
	m, _, ok := a.currentManifest(c, key)
	if !ok {
		return
	}
	info, err := a.eventsInfo(c.Request.Context(), key, m)
	if err != nil {
		httpapi.Fail(c, err)
		return
	}
	httpapi.OK(c, info)
}

// ---------------------------------------------------------------- resources & egress policy

// Resources are resource limits in API form.
type Resources struct {
	MemoryMB     int     `json:"memory_mb"`
	CPU          float64 `json:"cpu"`
	MaxThreads   int     `json:"max_threads"`
	MaxOpenFiles int     `json:"max_open_files"`
}

// ResourcesInfo shows manifest requests, admin overrides and the result.
type ResourcesInfo struct {
	Requested Resources `json:"requested"`
	Overrides Resources `json:"overrides"`
	Effective Resources `json:"effective"`
	MaxMemory int       `json:"max_memory_mb"`
}

func (a *API) resourcesInfo(ctx context.Context, key string, m *manifest.Manifest) (ResourcesInfo, error) {
	var ri ResourcesInfo
	ri.MaxMemory = a.d.Plugins.MaxMemoryMB
	if m.Resources != nil {
		ri.Requested = Resources{MemoryMB: m.Resources.MemoryMB, CPU: m.Resources.CPU, MaxThreads: m.Resources.MaxThreads, MaxOpenFiles: m.Resources.MaxOpenFiles}
	}
	var raw []byte
	if err := a.d.DB.Pool.QueryRow(ctx, `SELECT resource_limits FROM plugins WHERE key = $1`, key).Scan(&raw); err != nil {
		return ri, err
	}
	_ = json.Unmarshal(raw, &ri.Overrides)
	ri.Effective = ri.Requested
	if ri.Overrides.MemoryMB > 0 {
		ri.Effective.MemoryMB = ri.Overrides.MemoryMB
	}
	if ri.Overrides.CPU > 0 {
		ri.Effective.CPU = ri.Overrides.CPU
	}
	if ri.Overrides.MaxThreads > 0 {
		ri.Effective.MaxThreads = ri.Overrides.MaxThreads
	}
	if ri.Overrides.MaxOpenFiles > 0 {
		ri.Effective.MaxOpenFiles = ri.Overrides.MaxOpenFiles
	}
	return ri, nil
}

func (a *API) putResources(c *gin.Context) {
	key := c.Param("key")
	var in Resources
	if !httpapi.BindJSON(c, &in) {
		return
	}
	var errs []core.FieldError
	if in.MemoryMB < 0 || (a.d.Plugins.MaxMemoryMB > 0 && in.MemoryMB > a.d.Plugins.MaxMemoryMB) {
		errs = append(errs, core.FieldError{Field: "memory_mb", Code: "out_of_range", Message: "memory_mb exceeds the global limit"})
	}
	if in.CPU < 0 || in.CPU > pkg.MaxCPU {
		errs = append(errs, core.FieldError{Field: "cpu", Code: "out_of_range", Message: "cpu is out of range"})
	}
	if in.MaxThreads < 0 || in.MaxThreads > pkg.MaxThreads {
		errs = append(errs, core.FieldError{Field: "max_threads", Code: "out_of_range", Message: "max_threads is out of range"})
	}
	if in.MaxOpenFiles < 0 || in.MaxOpenFiles > pkg.MaxOpenFiles {
		errs = append(errs, core.FieldError{Field: "max_open_files", Code: "out_of_range", Message: "max_open_files is out of range"})
	}
	if len(errs) > 0 {
		httpapi.Fail(c, core.InvalidFields(errs...))
		return
	}
	m, _, ok := a.currentManifest(c, key)
	if !ok {
		return
	}
	b, _ := json.Marshal(in)
	if _, err := a.d.DB.Pool.Exec(c.Request.Context(), `UPDATE plugins SET resource_limits = $2, updated_at = now(),
		row_version = row_version + 1 WHERE key = $1`, key, b); err != nil {
		httpapi.Fail(c, err)
		return
	}
	a.audit(c, "plugin.resources.update", key, in)
	install.Notify(c.Request.Context(), a.d.Bus, key)
	ri, err := a.resourcesInfo(c.Request.Context(), key, m)
	if err != nil {
		httpapi.Fail(c, err)
		return
	}
	httpapi.OK(c, ri)
}

func (a *API) putEgressPolicy(c *gin.Context) {
	key := c.Param("key")
	var in struct {
		Policy string `json:"policy"`
	}
	if !httpapi.BindJSON(c, &in) {
		return
	}
	if in.Policy != "allow_all" && in.Policy != "allowlist" {
		httpapi.Fail(c, core.InvalidFields(core.FieldError{Field: "policy", Code: "invalid", Message: "policy must be allow_all or allowlist"}))
		return
	}
	tag, err := a.d.DB.Pool.Exec(c.Request.Context(), `UPDATE plugins SET egress_policy = $2, updated_at = now(),
		row_version = row_version + 1 WHERE key = $1`, key, in.Policy)
	if err != nil {
		httpapi.Fail(c, err)
		return
	}
	if tag.RowsAffected() == 0 {
		httpapi.Fail(c, core.ErrNotFound.WithMessage("plugin not found"))
		return
	}
	a.audit(c, "plugin.egress_policy.update", key, in)
	install.Notify(c.Request.Context(), a.d.Bus, key)
	httpapi.OK(c, gin.H{"policy": in.Policy})
}

// ---------------------------------------------------------------- egress logs

// EgressSummary aggregates egress logs per destination.
type EgressSummary struct {
	Host     string    `json:"host"`
	Port     int       `json:"port"`
	Count    int64     `json:"count"`
	OK       int64     `json:"ok"`
	Denied   int64     `json:"denied"`
	Errors   int64     `json:"errors"`
	BytesIn  int64     `json:"bytes_in"`
	BytesOut int64     `json:"bytes_out"`
	LastAt   time.Time `json:"last_at"`
}

// EgressLog is one plugin_egress_logs row.
type EgressLog struct {
	ID         int64     `json:"id"`
	NodeID     string    `json:"node_id"`
	Network    string    `json:"network"`
	Host       string    `json:"host"`
	Port       int       `json:"port"`
	StartedAt  time.Time `json:"started_at"`
	DurationMs int       `json:"duration_ms"`
	BytesIn    int64     `json:"bytes_in"`
	BytesOut   int64     `json:"bytes_out"`
	Result     string    `json:"result"`
	Error      string    `json:"error"`
}

func parseTime(c *gin.Context, name string, def time.Time) (time.Time, bool) {
	s := c.Query(name)
	if s == "" {
		return def, true
	}
	t, err := time.Parse(time.RFC3339, s)
	if err != nil {
		httpapi.Fail(c, core.InvalidFields(core.FieldError{Field: name, Code: "invalid", Message: "expected an RFC 3339 time"}))
		return t, false
	}
	return t, true
}

func (a *API) egress(c *gin.Context) {
	key := c.Param("key")
	if _, ok := a.pluginStatus(c, key); !ok {
		return
	}
	now := time.Now().UTC()
	from, ok := parseTime(c, "from", now.Add(-24*time.Hour))
	if !ok {
		return
	}
	to, ok := parseTime(c, "to", now)
	if !ok {
		return
	}
	rc := c.Request.Context()
	rows, err := a.d.DB.Pool.Query(rc, `
		SELECT host, port, count(*),
		       count(*) FILTER (WHERE result = 'ok'), count(*) FILTER (WHERE result = 'denied'),
		       count(*) FILTER (WHERE result NOT IN ('ok', 'denied')),
		       COALESCE(sum(bytes_in), 0), COALESCE(sum(bytes_out), 0), max(started_at)
		FROM plugin_egress_logs
		WHERE plugin_key = $1 AND started_at >= $2 AND started_at < $3
		GROUP BY host, port ORDER BY count(*) DESC LIMIT 200`, key, from, to)
	if err != nil {
		httpapi.Fail(c, err)
		return
	}
	summary := []EgressSummary{}
	for rows.Next() {
		var s EgressSummary
		if err := rows.Scan(&s.Host, &s.Port, &s.Count, &s.OK, &s.Denied, &s.Errors, &s.BytesIn, &s.BytesOut, &s.LastAt); err != nil {
			rows.Close()
			httpapi.Fail(c, err)
			return
		}
		summary = append(summary, s)
	}
	rows.Close()
	page, size := httpapi.Pagination(c)
	var total int64
	if err := a.d.DB.Pool.QueryRow(rc, `SELECT count(*) FROM plugin_egress_logs
		WHERE plugin_key = $1 AND started_at >= $2 AND started_at < $3`, key, from, to).Scan(&total); err != nil {
		httpapi.Fail(c, err)
		return
	}
	rows, err = a.d.DB.Pool.Query(rc, `
		SELECT id, node_id, network, host, port, started_at, duration_ms, bytes_in, bytes_out, result, error
		FROM plugin_egress_logs WHERE plugin_key = $1 AND started_at >= $2 AND started_at < $3
		ORDER BY started_at DESC, id DESC LIMIT $4 OFFSET $5`, key, from, to, size, (page-1)*size)
	if err != nil {
		httpapi.Fail(c, err)
		return
	}
	defer rows.Close()
	items := []EgressLog{}
	for rows.Next() {
		var l EgressLog
		if err := rows.Scan(&l.ID, &l.NodeID, &l.Network, &l.Host, &l.Port, &l.StartedAt, &l.DurationMs, &l.BytesIn, &l.BytesOut, &l.Result, &l.Error); err != nil {
			httpapi.Fail(c, err)
			return
		}
		items = append(items, l)
	}
	httpapi.OK(c, gin.H{"from": from, "to": to, "summary": summary, "items": items,
		"page": httpapi.Page{Page: page, PageSize: size, Total: total}})
}
