package moderation

import (
	"cmp"
	"context"
	"maps"
	"slices"
	"strconv"
	"sync"
	"time"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"

	pluginv1 "github.com/Sub2API-Devs/sup2api/next/sdk/gen/pluginv1"
	"github.com/Sub2API-Devs/sup2api/next/sdk/pluginsdk"
)

// Statistics endpoints (CONTRACTS §72.14.2): GET /status, /stats/trend,
// /stats/performance and /stats/categories, and the per-row figures of the
// flow, auditor and channel lists. They read stats_hourly, costs and
// user_daily (stats.go writes them); field names follow new-api.

// suspiciousSQL selects the suspicious records (hits, refused or not).
const suspiciousSQL = `result IN ('hit', 'block')`

// minAlertSamples is the sample count below which an error rate is not
// flagged (new-api stats.go).
const minAlertSamples = 20

// maxStatsRange caps a trend or performance window.
const maxStatsRange = 93 * 24 * time.Hour

func flagged(errors, samples int64, alertPercent int) bool {
	return alertPercent > 0 && samples >= minAlertSamples && errors*100 > int64(alertPercent)*samples
}

func ratio(n, d int64) float64 {
	if d == 0 {
		return 0
	}
	return float64(n) / float64(d)
}

// ---------------------------------------------------------------- time

// parseTZ reads tz (minutes east of UTC) into a fixed zone; "today" and day
// buckets follow the browser's day.
func parseTZ(req *pluginv1.HTTPRequest) (*time.Location, pluginsdk.FieldErrors) {
	v := pluginsdk.Query(req, "tz")
	if v == "" {
		return time.UTC, nil
	}
	m, err := strconv.Atoi(v)
	if err != nil || m < -14*60 || m > 14*60 {
		return time.UTC, pluginsdk.FieldErrors{}.Add("tz", "invalid", "tz must be minutes east of UTC (-840..840) / tz 为相对 UTC 的分钟数（-840 到 840）")
	}
	return time.FixedZone("", m*60), nil
}

func startOfDay(t time.Time, loc *time.Location) time.Time {
	y, m, d := t.In(loc).Date()
	return time.Date(y, m, d, 0, 0, 0, 0, loc).UTC()
}

// lastHour is the start of the "last hour" window: the previous full hour.
func lastHour(now time.Time) time.Time { return now.Truncate(time.Hour).Add(-time.Hour) }

func earliest(a, b time.Time) time.Time {
	if a.Before(b) {
		return a
	}
	return b
}

// ---------------------------------------------------------------- rows

type rowKind int

const (
	kindRequest rowKind = iota
	kindFlow
	kindStage
	kindAuditor
)

// statRow is stats_hourly summed over groups.
type statRow struct {
	hour    time.Time
	flow    int64
	stage   int
	auditor int64
	timing  string
	c       counters
}

func (r *statRow) kind() rowKind {
	switch {
	case r.auditor != 0:
		return kindAuditor
	case r.stage != 0:
		return kindStage
	case r.flow != 0:
		return kindFlow
	}
	return kindRequest
}

const statSums = `sum(audited)::bigint, sum(hit)::bigint, sum(blocked)::bigint, sum(overturned)::bigint, sum(errors)::bigint,
	sum(cache_skipped)::bigint, sum(calls)::bigint, sum(tokens_in)::bigint, sum(tokens_out)::bigint, sum(latency_ms_sum)::bigint,
	ARRAY[sum(lat[1]), sum(lat[2]), sum(lat[3]), sum(lat[4]), sum(lat[5]), sum(lat[6]), sum(lat[7]), sum(lat[8]), sum(lat[9])]::bigint[],
	sum(cost)::text`

// statsFilter narrows stats_hourly; group < 0 = every group.
type statsFilter struct {
	from, to time.Time
	flow     int64
	group    int64
}

func queryStatRows(ctx context.Context, db *pgxpool.Pool, f statsFilter) ([]statRow, error) {
	where, args := `hour >= $1 AND hour <= $2`, []any{f.from, f.to}
	if f.flow > 0 {
		args = append(args, f.flow)
		where += ` AND flow_id = $` + strconv.Itoa(len(args))
	}
	if f.group >= 0 {
		args = append(args, f.group)
		where += ` AND group_id = $` + strconv.Itoa(len(args))
	}
	rows, err := db.Query(ctx, `SELECT hour, flow_id, stage, auditor_id, timing, `+statSums+`
		FROM stats_hourly WHERE `+where+` GROUP BY 1, 2, 3, 4, 5`, args...)
	if err != nil {
		return nil, err
	}
	return pgx.CollectRows(rows, func(row pgx.CollectableRow) (statRow, error) {
		var r statRow
		var lat []int64
		var cost string
		c := &r.c
		err := row.Scan(&r.hour, &r.flow, &r.stage, &r.auditor, &r.timing, &c.audited, &c.hit, &c.blocked, &c.overturned, &c.errors,
			&c.cacheSkipped, &c.calls, &c.tokensIn, &c.tokensOut, &c.latSum, &lat, &cost)
		copy(c.lat[:], lat)
		c.units, _ = parseCost(cost)
		r.hour = r.hour.UTC()
		return r, err
	})
}

// costRow is one costs row (hour, channel, source).
type costRow struct {
	hour    time.Time
	channel int64
	source  string
	errors  int64
	sum     CostSummary
}

func queryCostHours(ctx context.Context, db *pgxpool.Pool, from time.Time) ([]costRow, error) {
	rows, err := db.Query(ctx, `SELECT hour, channel_id, source, coalesce(sum(errors), 0), `+costSums+`
		FROM costs WHERE hour >= $1 GROUP BY 1, 2, 3`, from)
	if err != nil {
		return nil, err
	}
	return pgx.CollectRows(rows, func(row pgx.CollectableRow) (costRow, error) {
		var r costRow
		err := row.Scan(append([]any{&r.hour, &r.channel, &r.source, &r.errors}, r.sum.targets()...)...)
		r.sum.normalize()
		r.hour = r.hour.UTC()
		return r, err
	})
}

// add sums o into s (Cost stays a normalized decimal).
func (s *CostSummary) add(o CostSummary) {
	a, _ := parseCost(s.Cost)
	b, _ := parseCost(o.Cost)
	s.Cost = formatCost(a + b)
	s.Calls += o.Calls
	s.PricedCalls += o.PricedCalls
	s.UnpricedCalls += o.UnpricedCalls
	s.UnpricedTokens += o.UnpricedTokens
	s.FreeCalls += o.FreeCalls
	s.TokensIn += o.TokensIn
	s.TokensOut += o.TokensOut
}

func zeroCost() CostSummary { return CostSummary{Cost: formatCost(0)} }

func mergeInto[K comparable](m map[K]*counters, k K, c *counters) {
	if m[k] == nil {
		m[k] = &counters{}
	}
	m[k].merge(c)
}

// ---------------------------------------------------------------- latency

// LatencySummary is a latency distribution; percentiles are bucket estimates.
type LatencySummary struct {
	Count   int64   `json:"count"`
	AvgMs   float64 `json:"avg_ms"`
	P50Ms   float64 `json:"p50_ms"`
	P95Ms   float64 `json:"p95_ms"`
	P99Ms   float64 `json:"p99_ms"`
	Buckets Latency `json:"buckets"`
}

func summaryOf(c *counters) LatencySummary {
	n := c.lat.count()
	return LatencySummary{Count: n, AvgMs: ratio(c.latSum, n), P50Ms: c.lat.Percentile(0.5), P95Ms: c.lat.Percentile(0.95),
		P99Ms: c.lat.Percentile(0.99), Buckets: c.lat}
}

// ---------------------------------------------------------------- GET /status

// HealthRow is the last-hour health of an auditor or a channel.
type HealthRow struct {
	ID        int64   `json:"id"`
	Audited   int64   `json:"audited"`
	Calls     int64   `json:"calls"`
	Hits      int64   `json:"hits"`
	Errors    int64   `json:"errors"`
	ErrorRate float64 `json:"error_rate"`
	HitRate   float64 `json:"hit_rate"`
	Flagged   bool    `json:"flagged"`
	// SkippedNoText (auditors): judgings with nothing to send.
	SkippedNoText int64 `json:"skipped_no_text,omitempty"`
}

// TodayCounts are today's figures of the overview.
type TodayCounts struct {
	Audited           int64 `json:"audited"`
	Suspicious        int64 `json:"suspicious"`
	Blocked           int64 `json:"blocked"`
	Overturned        int64 `json:"overturned"`
	Errors            int64 `json:"errors"`
	CacheSkipped      int64 `json:"cache_skipped"`
	AuditorCalls      int64 `json:"auditor_calls"`
	TokensIn          int64 `json:"tokens_in"`
	TokensOut         int64 `json:"tokens_out"`
	Analyses          int64 `json:"analyses"`
	AnalysesFailed    int64 `json:"analyses_failed"`
	AnalysisTokensIn  int64 `json:"analysis_tokens_in"`
	AnalysisTokensOut int64 `json:"analysis_tokens_out"`
}

// AIReviewCounts sums the record verdicts of today's analyses.
type AIReviewCounts struct {
	Reviewed      int64 `json:"reviewed"`
	Violation     int64 `json:"violation"`
	FalsePositive int64 `json:"false_positive"`
	Unsure        int64 `json:"unsure"`
}

// WatchCounts are the watch list header counts.
type WatchCounts struct {
	Watching                int64 `json:"watching"`
	WatchingWithNew         int64 `json:"watching_with_new"`
	Blocking                int64 `json:"blocking"`
	AnalysisEveryViolations int   `json:"analysis_every_violations"`
}

// AttentionUser is one of the users most worth a look.
type AttentionUser struct {
	UserID        int64      `json:"user_id"`
	Level         string     `json:"level"`
	HitsSinceSeen int64      `json:"hits_since_seen"`
	HitCount      int64      `json:"hit_count"`
	LastHitAt     *time.Time `json:"last_hit_at"`
	LatestTrend   string     `json:"latest_trend"`
}

// FunnelStage is one stage of a flow's funnel.
type FunnelStage struct {
	Stage    int   `json:"stage"`
	Received int64 `json:"received"`
	Hit      int64 `json:"hit"`
	Passed   int64 `json:"passed"`
}

// Funnel is today's path of one flow's runs through its stages.
type Funnel struct {
	FlowID     int64         `json:"flow_id"`
	Name       string        `json:"name"`
	Stages     []FunnelStage `json:"stages"`
	Suspicious int64         `json:"suspicious"`
	Blocked    int64         `json:"blocked"`
}

// QueueStats are this node's queues.
type QueueStats struct {
	PostQueue           int   `json:"post_queue"`
	PostQueueCap        int   `json:"post_queue_cap"`
	DroppedPostFull     int64 `json:"dropped_post_full"`
	PriceQueue          int   `json:"price_queue"`
	PriceQueueCap       int   `json:"price_queue_cap"`
	DroppedCosts        int64 `json:"dropped_costs"`
	AnalysisPending     int64 `json:"analysis_pending"`
	AnalysisRunning     int64 `json:"analysis_running"`
	AnalysisConcurrency int   `json:"analysis_concurrency"`
}

// CostRef is the cost of one channel or auditor.
type CostRef struct {
	ID   int64       `json:"id"`
	Cost CostSummary `json:"cost"`
}

// OverviewCosts is today's cost by source; Manual = test, try and simulate.
type OverviewCosts struct {
	Total    CostSummary `json:"total"`
	Audit    CostSummary `json:"audit"`
	Analysis CostSummary `json:"analysis"`
	Manual   CostSummary `json:"manual"`
	Channels []CostRef   `json:"channels"`
	Auditors []CostRef   `json:"auditors"`
}

// StatusLine is the configuration summary of the status bar.
type StatusLine struct {
	EnabledFlows     int     `json:"enabled_flows"`
	BoundGroups      []int64 `json:"bound_groups"`
	StaleGroups      []int64 `json:"stale_groups"` // bound to a disabled or unpublished flow
	DisabledChannels int64   `json:"disabled_channels"`
	AnalysisChannel  bool    `json:"analysis_channel"`
}

// Status is GET /status.
type Status struct {
	Mode         string          `json:"mode"`
	Enabled      bool            `json:"enabled"`
	AlertPercent int             `json:"error_rate_alert_percent"`
	Runtime      Runtime         `json:"runtime"`
	StatusLine   StatusLine      `json:"status_line"`
	Today        TodayCounts     `json:"today"`
	AIReview     AIReviewCounts  `json:"ai_review"`
	Watch        WatchCounts     `json:"watch"`
	Attention    []AttentionUser `json:"attention"`
	Auditors     []HealthRow     `json:"auditors"`
	Channels     []HealthRow     `json:"channels"`
	Funnels      []Funnel        `json:"funnels"`
	Queue        QueueStats      `json:"queue"`
	Costs        OverviewCosts   `json:"costs"`
}

func (p *Plugin) getStatus(ctx context.Context, req *pluginv1.HTTPRequest) (*pluginv1.HTTPResponse, error) {
	loc, errs := parseTZ(req)
	if len(errs) > 0 {
		return pluginsdk.FieldErrorResponse("invalid query / 查询参数无效", errs), nil
	}
	db, err := p.db(ctx)
	if err != nil {
		return pluginsdk.Unavailable(err.Error()), nil
	}
	p.freshStats(ctx) // this node's latest counts are included at once
	c := p.cfg.Load()
	now := p.now().UTC()
	today, hour := startOfDay(now, loc), lastHour(now)
	from := earliest(today, hour)
	out := &Status{Mode: c.Mode, Enabled: c.enabled, AlertPercent: c.ErrorRateAlertPercent, Runtime: p.runtimeState(ctx),
		Attention: []AttentionUser{}, Auditors: []HealthRow{}, Funnels: []Funnel{}}
	rows, err := queryStatRows(ctx, db, statsFilter{from: from, to: now, group: -1})
	if err != nil {
		return nil, err
	}
	costs, err := queryCostHours(ctx, db, from)
	if err != nil {
		return nil, err
	}
	names, err := flowNames(ctx, db)
	if err != nil {
		return nil, err
	}
	auditors, flows := map[int64]*counters{}, map[int64]*counters{}
	funnels := map[int64]map[int]*counters{}
	for i := range rows {
		r := &rows[i]
		kind := r.kind()
		if kind == kindAuditor && !r.hour.Before(hour) {
			mergeInto(auditors, r.auditor, &r.c)
		}
		if r.hour.Before(today) {
			continue
		}
		t := &out.Today
		switch kind {
		case kindRequest:
			t.Blocked += r.c.blocked
		case kindFlow:
			t.Audited += r.c.audited + r.c.cacheSkipped
			t.CacheSkipped += r.c.cacheSkipped
			t.Suspicious += r.c.hit
			t.Overturned += r.c.overturned
			t.Errors += r.c.errors
			mergeInto(flows, r.flow, &r.c)
		case kindStage:
			if funnels[r.flow] == nil {
				funnels[r.flow] = map[int]*counters{}
			}
			mergeInto(funnels[r.flow], r.stage, &r.c)
		case kindAuditor:
			t.AuditorCalls += r.c.calls
			t.TokensIn += r.c.tokensIn
			t.TokensOut += r.c.tokensOut
		}
	}
	for _, id := range slices.Sorted(maps.Keys(auditors)) {
		a := auditors[id]
		out.Auditors = append(out.Auditors, HealthRow{ID: id, Audited: a.audited, Calls: a.calls, Hits: a.hit, Errors: a.errors,
			ErrorRate: ratio(a.errors, a.audited), HitRate: ratio(a.hit, a.audited), Flagged: flagged(a.errors, a.audited, c.ErrorRateAlertPercent),
			SkippedNoText: a.cacheSkipped})
	}
	for _, id := range slices.Sorted(maps.Keys(flows)) {
		f := Funnel{FlowID: id, Name: names[id], Suspicious: flows[id].hit, Blocked: flows[id].blocked, Stages: []FunnelStage{}}
		for _, st := range slices.Sorted(maps.Keys(funnels[id])) {
			s := funnels[id][st]
			f.Stages = append(f.Stages, FunnelStage{Stage: st, Received: s.audited, Hit: s.hit, Passed: s.audited - s.hit})
		}
		out.Funnels = append(out.Funnels, f)
	}
	out.Channels, out.Costs = statusChannels(aggregateChannels(costs, hour, today), c.ErrorRateAlertPercent)
	byAuditor, err := auditorsToday(ctx, db, today, now)
	if err != nil {
		return nil, err
	}
	for _, id := range slices.Sorted(maps.Keys(byAuditor)) {
		out.Costs.Auditors = append(out.Costs.Auditors, CostRef{ID: id, Cost: byAuditor[id].Cost})
	}
	if err := p.statusDB(ctx, db, out, today); err != nil {
		return nil, err
	}
	return pluginsdk.DataResponse(out), nil
}

// statusChannels turns the channel sums into the health rows and today's
// cost of /status.
func statusChannels(agg map[int64]*ChannelHealth, alertPercent int) ([]HealthRow, OverviewCosts) {
	costs := OverviewCosts{Total: zeroCost(), Audit: zeroCost(), Analysis: zeroCost(), Manual: zeroCost(), Channels: []CostRef{}, Auditors: []CostRef{}}
	health := []HealthRow{}
	for _, id := range slices.Sorted(maps.Keys(agg)) {
		h := agg[id]
		if h.Calls1h > 0 || h.errors1h > 0 {
			health = append(health, HealthRow{ID: id, Calls: h.Calls1h, Errors: h.errors1h, ErrorRate: h.ErrorRate1h,
				Flagged: flagged(h.errors1h, h.Calls1h, alertPercent)})
		}
		if len(h.CostTodaySources) == 0 {
			continue
		}
		costs.Total.add(h.CostToday)
		costs.Channels = append(costs.Channels, CostRef{ID: id, Cost: h.CostToday})
		for src, c := range h.CostTodaySources {
			switch src {
			case SourceAudit:
				costs.Audit.add(c)
			case SourceAnalysis:
				costs.Analysis.add(c)
			default:
				costs.Manual.add(c)
			}
		}
	}
	return health, costs
}

// statusDB fills the parts of /status read from the configuration, the
// analyses and the watch list.
func (p *Plugin) statusDB(ctx context.Context, db *pgxpool.Pool, out *Status, today time.Time) error {
	s := p.snap.Load()
	c := p.cfg.Load()
	sl := &out.StatusLine
	sl.EnabledFlows, sl.BoundGroups, sl.StaleGroups = len(s.flows), []int64{}, []int64{}
	for _, g := range slices.Sorted(maps.Keys(s.byGroup)) {
		if s.byGroup[g] != nil {
			sl.BoundGroups = append(sl.BoundGroups, g)
		} else {
			sl.StaleGroups = append(sl.StaleGroups, g)
		}
	}
	sl.AnalysisChannel = p.analysisChannelUsable()
	if err := db.QueryRow(ctx, `SELECT count(*) FROM channels WHERE deleted_at IS NULL AND NOT enabled`).Scan(&sl.DisabledChannels); err != nil {
		return err
	}

	t, ai := &out.Today, &out.AIReview
	if err := db.QueryRow(ctx, `SELECT count(*), count(*) FILTER (WHERE status <> $2), coalesce(sum(tokens_in), 0), coalesce(sum(tokens_out), 0),
			coalesce(sum((verdict_counts->>'violation')::bigint) FILTER (WHERE status = $2), 0),
			coalesce(sum((verdict_counts->>'false_positive')::bigint) FILTER (WHERE status = $2), 0),
			coalesce(sum((verdict_counts->>'unsure')::bigint) FILTER (WHERE status = $2), 0)
		FROM user_analyses WHERE created_at >= $1`, today, AnalysisStatusOK).
		Scan(&t.Analyses, &t.AnalysesFailed, &t.AnalysisTokensIn, &t.AnalysisTokensOut, &ai.Violation, &ai.FalsePositive, &ai.Unsure); err != nil {
		return err
	}
	ai.Reviewed = ai.Violation + ai.FalsePositive + ai.Unsure

	now := p.now().UTC()
	w := &out.Watch
	w.AnalysisEveryViolations = c.AnalysisEveryViolations
	if err := db.QueryRow(ctx, `SELECT count(*) FILTER (WHERE level = $3), count(*) FILTER (WHERE level = $3 AND hits_since_seen > 0), count(*) FILTER (WHERE level = $2)
		FROM watchlist WHERE expires_at IS NULL OR expires_at > $1`, now, LevelEnforce, LevelObserve).Scan(&w.Watching, &w.WatchingWithNew, &w.Blocking); err != nil {
		return err
	}
	rows, err := db.Query(ctx, `SELECT user_id, level, hits_since_seen, hit_count, last_hit_at, latest_trend FROM watchlist
		WHERE expires_at IS NULL OR expires_at > $1 ORDER BY hits_since_seen DESC, last_hit_at DESC NULLS LAST, user_id LIMIT 6`, now)
	if err != nil {
		return err
	}
	if out.Attention, err = pgx.CollectRows(rows, func(r pgx.CollectableRow) (AttentionUser, error) {
		var a AttentionUser
		err := r.Scan(&a.UserID, &a.Level, &a.HitsSinceSeen, &a.HitCount, &a.LastHitAt, &a.LatestTrend)
		a.LastHitAt = utcPtr(a.LastHitAt)
		return a, err
	}); err != nil {
		return err
	}
	if out.Attention == nil {
		out.Attention = []AttentionUser{}
	}

	q := &out.Queue
	q.PostQueue, q.PostQueueCap = p.queueLen()
	q.DroppedPostFull = p.stats.dropped.Load()
	q.PriceQueue, q.PriceQueueCap, q.DroppedCosts = len(p.hourly.queue), cap(p.hourly.queue), p.hourly.dropped.Load()
	q.AnalysisPending, q.AnalysisRunning = out.Runtime.Analysis.Pending, out.Runtime.Analysis.Running
	q.AnalysisConcurrency = c.AnalysisConcurrency
	return nil
}

// flowNames maps every flow, deleted ones included, to its name.
func flowNames(ctx context.Context, db *pgxpool.Pool) (map[int64]string, error) {
	rows, err := db.Query(ctx, `SELECT id, name FROM flows`)
	if err != nil {
		return nil, err
	}
	out := map[int64]string{}
	var id int64
	var name string
	_, err = pgx.ForEachRow(rows, []any{&id, &name}, func() error {
		out[id] = name
		return nil
	})
	return out, err
}

// ---------------------------------------------------------------- windows

// statsWindow is the parsed query of /stats/trend and /stats/performance.
type statsWindow struct {
	granularity string // hour | day
	from, to    time.Time
	loc         *time.Location
	filter      statsFilter
}

// parseWindow reads granularity, from, to, flow_id, group_id and tz. The
// default window is today (hour) or the last 14 days (day).
func (p *Plugin) parseWindow(req *pluginv1.HTTPRequest, defaultGranularity string) (statsWindow, pluginsdk.FieldErrors) {
	loc, errs := parseTZ(req)
	now := p.now().UTC()
	w := statsWindow{granularity: cmp.Or(pluginsdk.Query(req, "granularity"), defaultGranularity), to: now, loc: loc}
	today := startOfDay(now, loc)
	switch w.granularity {
	case "hour":
		w.from = today
	case "day":
		w.from = startOfDay(today.In(loc).AddDate(0, 0, -13), loc)
	default:
		errs = errs.Add("granularity", "enum", "granularity must be hour or day / granularity 取值为 hour、day")
	}
	for _, f := range []struct {
		name string
		dst  *time.Time
	}{{"from", &w.from}, {"to", &w.to}} {
		if v := pluginsdk.Query(req, f.name); v != "" {
			t, err := time.Parse(time.RFC3339, v)
			if err != nil {
				errs = errs.Add(f.name, "invalid", f.name+" must be RFC3339 / "+f.name+" 必须是 RFC3339 时间")
				continue
			}
			*f.dst = t.UTC()
		}
	}
	if w.to.After(now) {
		w.to = now
	}
	if !w.from.Before(w.to) || w.to.Sub(w.from) > maxStatsRange {
		errs = errs.Add("from", "range", "from must be before to, at most 93 days / from 必须早于 to，范围最长 93 天")
	}
	w.filter = statsFilter{from: w.from.Truncate(time.Hour), to: w.to, group: -1}
	if v := pluginsdk.Query(req, "flow_id"); v != "" {
		id, err := strconv.ParseInt(v, 10, 64)
		if err != nil || id <= 0 {
			errs = errs.Add("flow_id", "invalid", "flow_id must be a positive integer / flow_id 必须是正整数")
		}
		w.filter.flow = id
	}
	if v := pluginsdk.Query(req, "group_id"); v != "" {
		id, err := strconv.ParseInt(v, 10, 64)
		if err != nil || id < 0 {
			errs = errs.Add("group_id", "invalid", "group_id must be a non-negative integer / group_id 必须是非负整数")
		}
		w.filter.group = id
	}
	return w, errs
}

// bucket maps an hour to the start of its point.
func (w statsWindow) bucket(h time.Time) time.Time {
	if w.granularity == "day" {
		return startOfDay(h, w.loc)
	}
	return h
}

// buckets lists every point of the window, oldest first.
func (w statsWindow) buckets() []time.Time {
	var out []time.Time
	for b := w.bucket(w.from); !b.After(w.to); {
		out = append(out, b)
		if w.granularity == "day" {
			b = startOfDay(b.In(w.loc).AddDate(0, 0, 1), w.loc)
		} else {
			b = b.Add(time.Hour)
		}
	}
	return out
}

// windowRows parses the window and reads its rows (this node's counts
// flushed first).
func (p *Plugin) windowRows(ctx context.Context, req *pluginv1.HTTPRequest, defaultGranularity string) (statsWindow, []statRow, map[int64]string, *pluginv1.HTTPResponse, error) {
	w, errs := p.parseWindow(req, defaultGranularity)
	if len(errs) > 0 {
		return w, nil, nil, pluginsdk.FieldErrorResponse("invalid query / 查询参数无效", errs), nil
	}
	db, err := p.db(ctx)
	if err != nil {
		return w, nil, nil, pluginsdk.Unavailable(err.Error()), nil
	}
	p.freshStats(ctx)
	rows, err := queryStatRows(ctx, db, w.filter)
	if err != nil {
		return w, nil, nil, nil, err
	}
	names, err := flowNames(ctx, db)
	return w, rows, names, nil, err
}

// ---------------------------------------------------------------- GET /stats/trend

// FlowPoint is one bucket of a flow's trend.
type FlowPoint struct {
	Ts             time.Time `json:"ts"`
	Audited        int64     `json:"audited"`
	CacheSkipped   int64     `json:"cache_skipped"`
	Hit            int64     `json:"hit"`
	Blocked        int64     `json:"blocked"`
	Overturned     int64     `json:"overturned"`
	Errors         int64     `json:"errors"`
	SuspiciousRate float64   `json:"suspicious_rate"`
	PreAvgMs       float64   `json:"pre_avg_ms"`
	PreP95Ms       float64   `json:"pre_p95_ms"`
	PostAvgMs      float64   `json:"post_avg_ms"`
	PostP95Ms      float64   `json:"post_p95_ms"`
}

// FlowTrend is one flow's points.
type FlowTrend struct {
	FlowID int64       `json:"flow_id"`
	Name   string      `json:"name"`
	Points []FlowPoint `json:"points"`
}

// AuditorPoint is one bucket of an auditor node's trend.
type AuditorPoint struct {
	Ts        time.Time `json:"ts"`
	Audited   int64     `json:"audited"`
	Hit       int64     `json:"hit"`
	Errors    int64     `json:"errors"`
	HitRate   float64   `json:"hit_rate"`
	ErrorRate float64   `json:"error_rate"`
}

// AuditorTrend is one auditor node (flow, stage, auditor).
type AuditorTrend struct {
	FlowID    int64          `json:"flow_id"`
	Stage     int            `json:"stage"`
	AuditorID int64          `json:"auditor_id"`
	Points    []AuditorPoint `json:"points"`
}

// TrendResult is GET /stats/trend.
type TrendResult struct {
	Granularity string         `json:"granularity"`
	From        time.Time      `json:"from"`
	To          time.Time      `json:"to"`
	Flows       []FlowTrend    `json:"flows"`
	Auditors    []AuditorTrend `json:"auditors"`
}

func (p *Plugin) getTrend(ctx context.Context, req *pluginv1.HTTPRequest) (*pluginv1.HTTPResponse, error) {
	w, rows, names, bad, err := p.windowRows(ctx, req, "day")
	if bad != nil || err != nil {
		return bad, err
	}
	type flowAcc struct{ all, pre, post counters }
	type nodeKey struct {
		flow    int64
		stage   int
		auditor int64
	}
	flows := map[int64]map[time.Time]*flowAcc{}
	nodes := map[nodeKey]map[time.Time]*counters{}
	for i := range rows {
		r := &rows[i]
		ts := w.bucket(r.hour)
		switch r.kind() {
		case kindFlow:
			if flows[r.flow] == nil {
				flows[r.flow] = map[time.Time]*flowAcc{}
			}
			acc := flows[r.flow][ts]
			if acc == nil {
				acc = &flowAcc{}
				flows[r.flow][ts] = acc
			}
			acc.all.merge(&r.c)
			if r.timing == TimingPre {
				acc.pre.merge(&r.c)
			} else {
				acc.post.merge(&r.c)
			}
		case kindAuditor:
			k := nodeKey{r.flow, r.stage, r.auditor}
			if nodes[k] == nil {
				nodes[k] = map[time.Time]*counters{}
			}
			mergeInto(nodes[k], ts, &r.c)
		}
	}
	buckets := w.buckets()
	out := TrendResult{Granularity: w.granularity, From: w.from, To: w.to, Flows: []FlowTrend{}, Auditors: []AuditorTrend{}}
	for _, id := range slices.Sorted(maps.Keys(flows)) {
		ft := FlowTrend{FlowID: id, Name: names[id], Points: make([]FlowPoint, 0, len(buckets))}
		for _, ts := range buckets {
			acc := flows[id][ts]
			if acc == nil {
				acc = &flowAcc{}
			}
			a := &acc.all
			pre, post := summaryOf(&acc.pre), summaryOf(&acc.post)
			ft.Points = append(ft.Points, FlowPoint{Ts: ts, Audited: a.audited, CacheSkipped: a.cacheSkipped, Hit: a.hit, Blocked: a.blocked,
				Overturned: a.overturned, Errors: a.errors, SuspiciousRate: ratio(a.hit, a.audited+a.cacheSkipped),
				PreAvgMs: pre.AvgMs, PreP95Ms: pre.P95Ms, PostAvgMs: post.AvgMs, PostP95Ms: post.P95Ms})
		}
		out.Flows = append(out.Flows, ft)
	}
	keys := slices.SortedFunc(maps.Keys(nodes), func(a, b nodeKey) int {
		return cmp.Or(cmp.Compare(a.flow, b.flow), cmp.Compare(a.stage, b.stage), cmp.Compare(a.auditor, b.auditor))
	})
	for _, k := range keys {
		at := AuditorTrend{FlowID: k.flow, Stage: k.stage, AuditorID: k.auditor, Points: make([]AuditorPoint, 0, len(buckets))}
		for _, ts := range buckets {
			c := nodes[k][ts]
			if c == nil {
				c = &counters{}
			}
			at.Points = append(at.Points, AuditorPoint{Ts: ts, Audited: c.audited, Hit: c.hit, Errors: c.errors,
				HitRate: ratio(c.hit, c.audited), ErrorRate: ratio(c.errors, c.audited)})
		}
		out.Auditors = append(out.Auditors, at)
	}
	return pluginsdk.DataResponse(out), nil
}

// ---------------------------------------------------------------- GET /stats/performance

// LatencyPoint is one bucket of the added latency.
type LatencyPoint struct {
	Ts time.Time `json:"ts"`
	LatencySummary
}

// AuditorLatency is one auditor's call latency.
type AuditorLatency struct {
	AuditorID int64 `json:"auditor_id"`
	LatencySummary
}

// PerformanceResult is GET /stats/performance.
type PerformanceResult struct {
	Granularity string           `json:"granularity"`
	From        time.Time        `json:"from"`
	To          time.Time        `json:"to"`
	Summary     LatencySummary   `json:"summary"`
	Points      []LatencyPoint   `json:"points"`
	Auditors    []AuditorLatency `json:"auditors"`
}

// getPerformance reports the latency pre-moderation added to requests
// (request rows, or the flow's pre rows when a flow is chosen) and each
// auditor's latency.
func (p *Plugin) getPerformance(ctx context.Context, req *pluginv1.HTTPRequest) (*pluginv1.HTTPResponse, error) {
	w, rows, _, bad, err := p.windowRows(ctx, req, "hour")
	if bad != nil || err != nil {
		return bad, err
	}
	want := kindRequest
	if w.filter.flow != 0 {
		want = kindFlow
	}
	var total counters
	points, auditors := map[time.Time]*counters{}, map[int64]*counters{}
	for i := range rows {
		r := &rows[i]
		kind := r.kind()
		if kind == kindAuditor {
			mergeInto(auditors, r.auditor, &r.c)
			continue
		}
		if kind != want || r.timing != TimingPre {
			continue
		}
		total.merge(&r.c)
		mergeInto(points, w.bucket(r.hour), &r.c)
	}
	out := PerformanceResult{Granularity: w.granularity, From: w.from, To: w.to, Summary: summaryOf(&total),
		Points: []LatencyPoint{}, Auditors: []AuditorLatency{}}
	for _, ts := range w.buckets() {
		c := points[ts]
		if c == nil {
			c = &counters{}
		}
		out.Points = append(out.Points, LatencyPoint{Ts: ts, LatencySummary: summaryOf(c)})
	}
	for _, id := range slices.Sorted(maps.Keys(auditors)) {
		out.Auditors = append(out.Auditors, AuditorLatency{AuditorID: id, LatencySummary: summaryOf(auditors[id])})
	}
	return pluginsdk.DataResponse(out), nil
}

// ---------------------------------------------------------------- GET /stats/categories

const maxCategoryScan = 50000

// CategoryStats is GET /stats/categories.
type CategoryStats struct {
	SuspiciousRequests int64           `json:"suspicious_requests"`
	CategoryHits       int64           `json:"category_hits"`
	Truncated          bool            `json:"truncated"`
	Items              []CategoryCount `json:"items"`
}

// categoryCache keeps /stats/categories for a minute per start of "today".
type categoryCache struct {
	mu sync.Mutex
	m  map[time.Time]categoryEntry
}

type categoryEntry struct {
	at   time.Time
	data *CategoryStats
}

func (c *categoryCache) get(today, now time.Time) *CategoryStats {
	c.mu.Lock()
	defer c.mu.Unlock()
	if e, ok := c.m[today]; ok && now.Sub(e.at) < time.Minute {
		return e.data
	}
	return nil
}

func (c *categoryCache) put(today, now time.Time, data *CategoryStats) {
	c.mu.Lock()
	defer c.mu.Unlock()
	if c.m == nil {
		c.m = map[time.Time]categoryEntry{}
	}
	for k, e := range c.m {
		if now.Sub(e.at) >= time.Minute {
			delete(c.m, k)
		}
	}
	c.m[today] = categoryEntry{at: now, data: data}
}

// getCategories counts today's suspicious requests by category: a request
// counts once per category, at most maxCategoryScan records are read.
func (p *Plugin) getCategories(ctx context.Context, req *pluginv1.HTTPRequest) (*pluginv1.HTTPResponse, error) {
	loc, errs := parseTZ(req)
	if len(errs) > 0 {
		return pluginsdk.FieldErrorResponse("invalid query / 查询参数无效", errs), nil
	}
	now := p.now().UTC()
	today := startOfDay(now, loc)
	cc := &p.categories
	if data := cc.get(today, now); data != nil {
		return pluginsdk.DataResponse(data), nil
	}
	db, err := p.db(ctx)
	if err != nil {
		return pluginsdk.Unavailable(err.Error()), nil
	}
	rows, err := db.Query(ctx, `WITH e AS (SELECT id, coalesce(nullif(request_id, ''), '#' || id) AS rq, hit_categories FROM events
			WHERE created_at >= $1 AND `+suspiciousSQL+` ORDER BY id DESC LIMIT $2),
		r AS (SELECT DISTINCT rq, c FROM e, unnest(hit_categories) AS c)
		SELECT t.scanned, t.requests, g.c, coalesce(g.n, 0)
		FROM (SELECT (SELECT count(*) FROM e) AS scanned, (SELECT count(DISTINCT rq) FROM e) AS requests) t
		LEFT JOIN (SELECT c, count(*) AS n FROM r GROUP BY c) g ON true ORDER BY g.n DESC NULLS LAST, g.c`, today, maxCategoryScan)
	if err != nil {
		return nil, err
	}
	out := &CategoryStats{Items: []CategoryCount{}}
	var scanned int64
	var cat *string
	var n int64
	if _, err := pgx.ForEachRow(rows, []any{&scanned, &out.SuspiciousRequests, &cat, &n}, func() error {
		if cat != nil {
			out.Items = append(out.Items, CategoryCount{Category: *cat, Count: n})
			out.CategoryHits += n
		}
		return nil
	}); err != nil {
		return nil, err
	}
	out.Truncated = scanned >= maxCategoryScan
	cc.put(today, now, out)
	return pluginsdk.DataResponse(out), nil
}
