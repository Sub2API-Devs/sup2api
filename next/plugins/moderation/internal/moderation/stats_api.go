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

// Statistics API (CONTRACTS §72.14), shaped like new-api service/moderation
// stats.go: GET /status, /stats/trend, /stats/performance, /stats/categories
// and the 24 h / today columns of the flow, auditor and channel lists. Rows
// are UTC hours; "today" starts at local midnight of the caller
// (tz_offset_minutes, default UTC).

// minAlertSamples is the sample size below which an error rate is not
// flagged (new-api stats.go).
const minAlertSamples = 20

// flagged reports an error rate above alertPercent (0 = alerts off).
func flagged(errors, samples int64, alertPercent int) bool {
	return alertPercent > 0 && samples >= minAlertSamples && errors*100 > int64(alertPercent)*samples
}

func ratio(n, d int64) float64 {
	if d == 0 {
		return 0
	}
	return float64(n) / float64(d)
}

// Row kinds of stats_hourly.
const (
	kindRequest = iota
	kindFlow
	kindStage
	kindAuditor
)

// statRow is one stats_hourly row read back.
type statRow struct {
	statKey
	counters
}

func (r *statRow) kind() int {
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

// statFilter narrows the rows read; zero values match everything.
type statFilter struct {
	from, to time.Time
	group    *int64
	flow     int64
}

// costUnits selects a numeric cost column as 1e-8 USD units.
func costUnits(col string) string { return `round(` + col + ` * 100000000)::bigint` }

// loadStats reads stats_hourly rows, this node's pending counters included.
func (p *Plugin) loadStats(ctx context.Context, db *pgxpool.Pool, sf statFilter) ([]statRow, error) {
	p.flushStats(ctx)
	f := &sqlFilter{}
	f.cond("hour >= ", sf.from)
	f.cond("hour < ", sf.to)
	if sf.group != nil {
		f.cond("group_id = ", *sf.group)
	}
	if sf.flow != 0 {
		f.cond("flow_id = ", sf.flow)
	}
	rows, err := db.Query(ctx, `SELECT hour, group_id, flow_id, stage, auditor_id, timing, audited, hit, blocked, overturned, errors, cache_skipped,
			calls, tokens_in, tokens_out, latency_ms_sum, lat, `+costUnits("cost")+`, priced_calls, unpriced_calls, unpriced_tokens, free_calls
		FROM stats_hourly WHERE `+f.where(), f.args...)
	if err != nil {
		return nil, err
	}
	return pgx.CollectRows(rows, func(r pgx.CollectableRow) (statRow, error) {
		var s statRow
		var lat []int64
		err := r.Scan(&s.hour, &s.group, &s.flow, &s.stage, &s.auditor, &s.timing, &s.audited, &s.hit, &s.blocked, &s.overturned,
			&s.errors, &s.cacheSkipped, &s.calls, &s.tokensIn, &s.tokensOut, &s.latSum, &lat, &s.units, &s.priced, &s.unpriced,
			&s.unpricedTokens, &s.free)
		s.hour = s.hour.UTC()
		copy(s.lat[:], lat)
		return s, err
	})
}

// channelStat is one costs row read back (channel health and cost).
type channelStat struct {
	hour    time.Time
	channel int64
	source  string
	channelRow
}

func (r *statRow) costSummary() CostSummary { return r.callPrices.summary(r.tokensIn, r.tokensOut) }

func (r *channelStat) costSummary() CostSummary { return r.callPrices.summary(r.in, r.out) }

// addSummary adds s to the summary of k.
func addSummary[K comparable](m map[K]CostSummary, k K, s CostSummary) {
	sum := m[k]
	sum.add(s)
	m[k] = sum
}

// loadChannelStats reads the costs rows since from of the channels (nil =
// all), this node's pending counters included.
func (p *Plugin) loadChannelStats(ctx context.Context, db *pgxpool.Pool, from time.Time, channels []int64) ([]channelStat, error) {
	p.flushStats(ctx)
	f := &sqlFilter{}
	f.cond("hour >= ", from)
	if channels != nil {
		f.conds = append(f.conds, "channel_id = ANY("+f.arg(channels)+")")
	}
	rows, err := db.Query(ctx, `SELECT hour, channel_id, source, calls, errors, latency_ms_sum, lat, priced_calls, unpriced_calls,
			unpriced_tokens, free_calls, tokens_in, tokens_out, `+costUnits("cost")+` FROM costs WHERE `+f.where(), f.args...)
	if err != nil {
		return nil, err
	}
	return pgx.CollectRows(rows, func(r pgx.CollectableRow) (channelStat, error) {
		var s channelStat
		var lat []int64
		err := r.Scan(&s.hour, &s.channel, &s.source, &s.calls, &s.errors, &s.latSum, &lat, &s.priced, &s.unpriced,
			&s.unpricedTokens, &s.free, &s.in, &s.out, &s.units)
		s.hour = s.hour.UTC()
		copy(s.lat[:], lat)
		return s, err
	})
}

// clock is the time frame of a statistics request.
type clock struct {
	now    time.Time
	offset time.Duration // caller's offset from UTC
}

// clockOf reads tz_offset_minutes (-840..840); invalid values are UTC.
// Rows are whole UTC hours, so the offset is rounded to the nearest hour
// (a +5:30 "today" starts at the hour closest to local midnight).
func (p *Plugin) clockOf(req *pluginv1.HTTPRequest) clock {
	c := clock{now: p.now().UTC()}
	if v, err := strconv.Atoi(pluginsdk.Query(req, "tz_offset_minutes")); err == nil && v >= -840 && v <= 840 {
		c.offset = (time.Duration(v) * time.Minute).Round(time.Hour)
	}
	return c
}

// dayStart is the caller's local midnight (as UTC) of t.
func (c clock) dayStart(t time.Time) time.Time {
	l := t.Add(c.offset)
	return time.Date(l.Year(), l.Month(), l.Day(), 0, 0, 0, 0, time.UTC).Add(-c.offset)
}

func (c clock) today() time.Time { return c.dayStart(c.now) }

// lastHour is the previous hour bucket up to now (new-api lastHourFrom).
func (c clock) lastHour() time.Time { return c.now.Truncate(time.Hour).Add(-time.Hour) }

// bucket maps an hour to its point: the hour, or the caller's day.
func (c clock) bucket(hour time.Time, granularity string) time.Time {
	if granularity == "day" {
		return c.dayStart(hour)
	}
	return hour
}

func earliest(a, b time.Time) time.Time {
	if a.Before(b) {
		return a
	}
	return b
}

// entry returns m[k], storing mk() first when it is missing.
func entry[K comparable, V any](m map[K]V, k K, mk func() V) V {
	v, ok := m[k]
	if !ok {
		v = mk()
		m[k] = v
	}
	return v
}

func mergeInto[K comparable](m map[K]*counters, k K, c *counters) {
	entry(m, k, func() *counters { return new(counters) }).merge(c)
}

// flowCounters sums the flow rows from since on by flow: all runs, and the
// pre runs alone.
func flowCounters(rows []statRow, since time.Time) (all, pre map[int64]*counters) {
	all, pre = map[int64]*counters{}, map[int64]*counters{}
	for i := range rows {
		r := &rows[i]
		if r.kind() != kindFlow || r.hour.Before(since) {
			continue
		}
		mergeInto(all, r.flow, &r.counters)
		if r.timing == TimingPre {
			mergeInto(pre, r.flow, &r.counters)
		}
	}
	return all, pre
}

// ---------------------------------------------------------------- GET /status

// TodayCounts are today's totals of the overview.
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

// AIReviewCounts add up the record verdicts of today's analyses.
type AIReviewCounts struct {
	Reviewed int64 `json:"reviewed"`
	VerdictTally
}

// WatchCounts are the watch list header counts.
type WatchCounts struct {
	Watching        int64 `json:"watching"`
	WatchingWithNew int64 `json:"watching_with_new"`
	Blocking        int64 `json:"blocking"`
}

// HealthRow is the last-hour health of an auditor or a channel.
type HealthRow struct {
	ID            int64   `json:"id"`
	Audited       int64   `json:"audited"`
	Calls         int64   `json:"calls"`
	Hits          int64   `json:"hits"`
	Errors        int64   `json:"errors"`
	ErrorRate     float64 `json:"error_rate"`
	HitRate       float64 `json:"hit_rate"`
	Flagged       bool    `json:"flagged"`
	SkippedNoText int64   `json:"skipped_no_text"`
}

// FunnelStage is one stage of today's funnel.
type FunnelStage struct {
	Stage    int   `json:"stage"`
	Received int64 `json:"received"`
	Hit      int64 `json:"hit"`
	Passed   int64 `json:"passed"`
}

// Funnel is a flow's stages today.
type Funnel struct {
	FlowID     int64         `json:"flow_id"`
	Name       string        `json:"name"`
	Stages     []FunnelStage `json:"stages"`
	Suspicious int64         `json:"suspicious"`
	Blocked    int64         `json:"blocked"`
}

// QueueStatus is this node's background queue.
type QueueStatus struct {
	Name     string `json:"name"`
	Length   int    `json:"length"`
	Capacity int    `json:"capacity"`
	Dropped  int64  `json:"dropped"`
}

// CostRef is the cost of one channel or auditor.
type CostRef struct {
	ID   int64       `json:"id"`
	Cost CostSummary `json:"cost"`
}

// StatusCosts are today's costs by source, channel and auditor.
type StatusCosts struct {
	Total    CostSummary `json:"total"`
	Audit    CostSummary `json:"audit"`
	Analysis CostSummary `json:"analysis"`
	Manual   CostSummary `json:"manual"`
	Channels []CostRef   `json:"channels"`
	Auditors []CostRef   `json:"auditors"`
}

// Status is GET /status.
type Status struct {
	Enabled      bool           `json:"enabled"`
	Running      bool           `json:"running"`
	Mode         string         `json:"mode"`
	AlertPercent int            `json:"error_rate_alert_percent"`
	Today        TodayCounts    `json:"today"`
	TodayFrom    time.Time      `json:"today_from"`
	AIReview     AIReviewCounts `json:"ai_review"`
	Watch        WatchCounts    `json:"watch"`
	Auditors     []HealthRow    `json:"auditors"`
	Channels     []HealthRow    `json:"channels"`
	Funnels      []Funnel       `json:"funnels"`
	Queue        []QueueStatus  `json:"queue"`
	Costs        StatusCosts    `json:"costs"`
	Runtime      Runtime        `json:"runtime"`
}

func (p *Plugin) getStatus(ctx context.Context, req *pluginv1.HTTPRequest) (*pluginv1.HTTPResponse, error) {
	db, err := p.db(ctx)
	if err != nil {
		return pluginsdk.Unavailable(err.Error()), nil
	}
	out, err := p.status(ctx, db, p.clockOf(req))
	if err != nil {
		return nil, err
	}
	return pluginsdk.DataResponse(out), nil
}

func (p *Plugin) status(ctx context.Context, db *pgxpool.Pool, ck clock) (*Status, error) {
	c := p.cfg.Load()
	today, lastHour := ck.today(), ck.lastHour()
	from := earliest(today, lastHour)
	rows, err := p.loadStats(ctx, db, statFilter{from: from, to: ck.now.Add(time.Hour)})
	if err != nil {
		return nil, err
	}
	names, err := p.flowNames(ctx, db)
	if err != nil {
		return nil, err
	}
	sum := sumStatusRows(rows, today, lastHour)
	out := &Status{Enabled: c.enabled, Running: p.host != nil, Mode: c.Mode, AlertPercent: c.ErrorRateAlertPercent, TodayFrom: today,
		Today: sum.today, Auditors: sum.health(c.ErrorRateAlertPercent), Funnels: sum.funnels(names), Queue: p.queues(), Runtime: p.runtimeState(ctx),
		Costs: StatusCosts{Channels: []CostRef{}, Auditors: costRefs(sum.auditorCosts)}, Channels: []HealthRow{}}
	if err := p.addChannelStatus(ctx, db, out, from, today, lastHour, c.ErrorRateAlertPercent); err != nil {
		return nil, err
	}
	if err := addAnalysisCounts(ctx, db, out, today); err != nil {
		return nil, err
	}
	out.Watch, err = p.watchCounts(ctx, db)
	return out, err
}

// statusRows is what GET /status adds up from the stats_hourly rows.
type statusRows struct {
	today        TodayCounts
	auditors     map[int64]*counters         // auditor rows of the last hour
	flows        map[int64]*counters         // flow rows of today
	stages       map[int64]map[int]*counters // stage rows of today by flow
	auditorCosts map[int64]CostSummary       // auditor rows of today
}

func sumStatusRows(rows []statRow, today, lastHour time.Time) statusRows {
	sum := statusRows{auditors: map[int64]*counters{}, stages: map[int64]map[int]*counters{}, auditorCosts: map[int64]CostSummary{}}
	sum.flows, _ = flowCounters(rows, today)
	for _, f := range sum.flows {
		sum.today.Audited += f.audited + f.cacheSkipped
		sum.today.CacheSkipped += f.cacheSkipped
		sum.today.Suspicious += f.hit
		sum.today.Overturned += f.overturned
		sum.today.Errors += f.errors
	}
	for i := range rows {
		r := &rows[i]
		kind := r.kind()
		if kind == kindAuditor && !r.hour.Before(lastHour) {
			mergeInto(sum.auditors, r.auditor, &r.counters)
		}
		if r.hour.Before(today) {
			continue
		}
		switch kind {
		case kindRequest:
			sum.today.Blocked += r.blocked
		case kindStage:
			stages := entry(sum.stages, r.flow, func() map[int]*counters { return map[int]*counters{} })
			mergeInto(stages, r.stage, &r.counters)
		case kindAuditor:
			sum.today.AuditorCalls += r.calls
			sum.today.TokensIn += r.tokensIn
			sum.today.TokensOut += r.tokensOut
			addSummary(sum.auditorCosts, r.auditor, r.costSummary())
		}
	}
	return sum
}

// health renders the last-hour auditor health.
func (sum statusRows) health(alertPercent int) []HealthRow {
	out := []HealthRow{}
	for _, id := range slices.Sorted(maps.Keys(sum.auditors)) {
		a := sum.auditors[id]
		out = append(out, HealthRow{ID: id, Audited: a.audited, Calls: a.calls, Hits: a.hit, Errors: a.errors,
			ErrorRate: ratio(a.errors, a.audited), HitRate: ratio(a.hit, a.audited), Flagged: flagged(a.errors, a.audited, alertPercent),
			SkippedNoText: a.cacheSkipped})
	}
	return out
}

// funnels renders today's funnel of each flow.
func (sum statusRows) funnels(names map[int64]string) []Funnel {
	out := []Funnel{}
	for _, id := range slices.Sorted(maps.Keys(sum.flows)) {
		f := Funnel{FlowID: id, Name: names[id], Suspicious: sum.flows[id].hit, Blocked: sum.flows[id].blocked, Stages: []FunnelStage{}}
		for _, st := range slices.Sorted(maps.Keys(sum.stages[id])) {
			c := sum.stages[id][st]
			f.Stages = append(f.Stages, FunnelStage{Stage: st, Received: c.audited, Hit: c.hit, Passed: c.audited - c.hit})
		}
		out = append(out, f)
	}
	return out
}

func costRefs(m map[int64]CostSummary) []CostRef {
	out := make([]CostRef, 0, len(m))
	for _, id := range slices.Sorted(maps.Keys(m)) {
		out = append(out, CostRef{ID: id, Cost: m[id]})
	}
	return out
}

// addChannelStatus adds the last-hour channel health and today's costs.
func (p *Plugin) addChannelStatus(ctx context.Context, db *pgxpool.Pool, out *Status, from, today, lastHour time.Time, alert int) error {
	rows, err := p.loadChannelStats(ctx, db, from, nil)
	if err != nil {
		return err
	}
	health := map[int64]*channelRow{}
	costs := map[int64]CostSummary{}
	for i := range rows {
		r := &rows[i]
		if !r.hour.Before(lastHour) && r.health() {
			entry(health, r.channel, func() *channelRow { return new(channelRow) }).merge(&r.channelRow)
		}
		if r.hour.Before(today) {
			continue
		}
		cost := r.costSummary()
		addSummary(costs, r.channel, cost)
		out.Costs.Total.add(cost)
		switch r.source {
		case SourceAudit:
			out.Costs.Audit.add(cost)
		case SourceAnalysis:
			out.Costs.Analysis.add(cost)
		default:
			out.Costs.Manual.add(cost)
		}
	}
	for _, id := range slices.Sorted(maps.Keys(health)) {
		h := health[id]
		out.Channels = append(out.Channels, HealthRow{ID: id, Calls: h.calls, Errors: h.errors, ErrorRate: ratio(h.errors, h.calls),
			Flagged: flagged(h.errors, h.calls, alert)})
	}
	out.Costs.Channels = costRefs(costs)
	return nil
}

// health reports whether the row counts in a channel's health: audit and
// analysis calls (manual calls are left out, CONTRACTS §72.14).
func (r *channelStat) health() bool { return r.source == SourceAudit || r.source == SourceAnalysis }

// addAnalysisCounts adds today's analyses, their tokens and the AI review
// counts (verdict_counts of today's successful analyses).
func addAnalysisCounts(ctx context.Context, db *pgxpool.Pool, out *Status, today time.Time) error {
	ai := &out.AIReview
	err := db.QueryRow(ctx, `SELECT count(*), count(*) FILTER (WHERE status <> 'ok'), coalesce(sum(tokens_in), 0), coalesce(sum(tokens_out), 0),
			coalesce(sum((verdict_counts->>'violation')::bigint) FILTER (WHERE status = 'ok'), 0),
			coalesce(sum((verdict_counts->>'false_positive')::bigint) FILTER (WHERE status = 'ok'), 0),
			coalesce(sum((verdict_counts->>'unsure')::bigint) FILTER (WHERE status = 'ok'), 0)
		FROM user_analyses WHERE created_at >= $1`, today).Scan(&out.Today.Analyses, &out.Today.AnalysesFailed,
		&out.Today.AnalysisTokensIn, &out.Today.AnalysisTokensOut, &ai.Violation, &ai.FalsePositive, &ai.Unsure)
	ai.Reviewed = ai.Violation + ai.FalsePositive + ai.Unsure
	return err
}

// watchCounts: watching and watching_with_new count the observe level,
// blocking the enforce level (new-api CountModerationWatch).
func (p *Plugin) watchCounts(ctx context.Context, db *pgxpool.Pool) (WatchCounts, error) {
	var w WatchCounts
	err := db.QueryRow(ctx, `SELECT count(*) FILTER (WHERE level = 'observe'), count(*) FILTER (WHERE level = 'observe' AND hits_since_seen > 0),
			count(*) FILTER (WHERE level = 'enforce')
		FROM watchlist WHERE expires_at IS NULL OR expires_at > $1`, p.now().UTC()).Scan(&w.Watching, &w.WatchingWithNew, &w.Blocking)
	return w, err
}

// flowNames maps flow ids (deleted ones too) to their names.
func (p *Plugin) flowNames(ctx context.Context, db *pgxpool.Pool) (map[int64]string, error) {
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

// queues lists this node's queues: the post queue, the pricing queue and the
// event writer.
func (p *Plugin) queues() []QueueStatus {
	qlen, qcap := p.queueLen()
	return []QueueStatus{
		{Name: "post", Length: qlen, Capacity: qcap, Dropped: p.stats.dropped.Load()},
		{Name: "pricing", Length: len(p.hourly.queue), Capacity: cap(p.hourly.queue), Dropped: p.hourly.dropped.Load()},
		{Name: "records", Dropped: p.stats.droppedEvents.Load()},
	}
}

// ---------------------------------------------------------------- trend & performance

// statsQuery is the query of /stats/trend and /stats/performance.
type statsQuery struct {
	clock
	granularity string
	from, to    time.Time
	flow        int64
	group       *int64
}

// parseStatsQuery reads granularity (hour | day), from, to (RFC 3339),
// flow_id and group_id. Defaults: hour = today, day = the last 14 days.
func (p *Plugin) parseStatsQuery(req *pluginv1.HTTPRequest, defGranularity string) (statsQuery, pluginsdk.FieldErrors) {
	q := statsQuery{clock: p.clockOf(req), granularity: cmp.Or(pluginsdk.Query(req, "granularity"), defGranularity)}
	var errs pluginsdk.FieldErrors
	if q.granularity != "hour" && q.granularity != "day" {
		errs = errs.Add("granularity", "enum", "granularity must be hour or day / granularity 取值为 hour、day")
	}
	defFrom := q.today()
	if q.granularity == "day" {
		defFrom = q.today().Add(-13 * 24 * time.Hour)
	}
	f := &sqlFilter{errs: errs}
	q.from = cmp.Or(f.queryTime(req, "from"), defFrom)
	q.to = cmp.Or(f.queryTime(req, "to"), q.now.Add(time.Hour))
	if !q.from.Before(q.to) {
		f.errs = f.errs.Add("from", "range", "from must be before to / from 必须早于 to")
	} else if q.to.Sub(q.from) > 400*24*time.Hour {
		f.errs = f.errs.Add("from", "range", "the range is at most 400 days / 时间范围最多 400 天")
	}
	q.flow, _ = f.queryID(req, "flow_id")
	if id, ok := f.queryID(req, "group_id"); ok {
		q.group = &id
	}
	return q, f.errs
}

// LatencySummary is a latency distribution (bucket approximations).
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

// FlowPoint is one bucket of a flow's trend. Audited counts the requests
// the flow received, cache_skipped included (as in today's counts).
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

// FlowTrend is a flow's points.
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
	Granularity  string         `json:"granularity"`
	From         time.Time      `json:"from"`
	To           time.Time      `json:"to"`
	AlertPercent int            `json:"error_rate_alert_percent"`
	Flows        []FlowTrend    `json:"flows"`
	Auditors     []AuditorTrend `json:"auditors"`
}

func (p *Plugin) getTrend(ctx context.Context, req *pluginv1.HTTPRequest) (*pluginv1.HTTPResponse, error) {
	q, errs := p.parseStatsQuery(req, "day")
	if len(errs) > 0 {
		return pluginsdk.FieldErrorResponse("invalid query / 查询参数无效", errs), nil
	}
	db, err := p.db(ctx)
	if err != nil {
		return pluginsdk.Unavailable(err.Error()), nil
	}
	rows, err := p.loadStats(ctx, db, statFilter{from: q.from, to: q.to, group: q.group, flow: q.flow})
	if err != nil {
		return nil, err
	}
	names, err := p.flowNames(ctx, db)
	if err != nil {
		return nil, err
	}
	sum := sumTrendRows(rows, q)
	return pluginsdk.DataResponse(TrendResult{Granularity: q.granularity, From: q.from, To: q.to, AlertPercent: p.cfg.Load().ErrorRateAlertPercent,
		Flows: sum.flowTrends(names), Auditors: sum.auditorTrends()}), nil
}

// trendAcc is one flow bucket: all runs, pre runs, post runs.
type trendAcc struct{ all, pre, post counters }

type auditorKey struct {
	flow    int64
	stage   int
	auditor int64
}

// trendRows is what GET /stats/trend adds up from the rows: the flow and
// the auditor rows by bucket.
type trendRows struct {
	flows    map[int64]map[time.Time]*trendAcc
	auditors map[auditorKey]map[time.Time]*counters
}

func sumTrendRows(rows []statRow, q statsQuery) trendRows {
	sum := trendRows{flows: map[int64]map[time.Time]*trendAcc{}, auditors: map[auditorKey]map[time.Time]*counters{}}
	for i := range rows {
		r := &rows[i]
		ts := q.bucket(r.hour, q.granularity)
		switch r.kind() {
		case kindFlow:
			buckets := entry(sum.flows, r.flow, func() map[time.Time]*trendAcc { return map[time.Time]*trendAcc{} })
			acc := entry(buckets, ts, func() *trendAcc { return new(trendAcc) })
			acc.all.merge(&r.counters)
			if r.timing == TimingPre {
				acc.pre.merge(&r.counters)
			} else {
				acc.post.merge(&r.counters)
			}
		case kindAuditor:
			buckets := entry(sum.auditors, auditorKey{r.flow, r.stage, r.auditor}, func() map[time.Time]*counters { return map[time.Time]*counters{} })
			mergeInto(buckets, ts, &r.counters)
		}
	}
	return sum
}

func (sum trendRows) flowTrends(names map[int64]string) []FlowTrend {
	out := []FlowTrend{}
	for _, id := range slices.Sorted(maps.Keys(sum.flows)) {
		ft := FlowTrend{FlowID: id, Name: names[id], Points: []FlowPoint{}}
		for _, ts := range slices.SortedFunc(maps.Keys(sum.flows[id]), time.Time.Compare) {
			a := sum.flows[id][ts]
			pre, post := summaryOf(&a.pre), summaryOf(&a.post)
			ft.Points = append(ft.Points, FlowPoint{Ts: ts, Audited: a.all.audited + a.all.cacheSkipped, CacheSkipped: a.all.cacheSkipped, Hit: a.all.hit,
				Blocked: a.all.blocked, Overturned: a.all.overturned, Errors: a.all.errors,
				SuspiciousRate: ratio(a.all.hit, a.all.audited+a.all.cacheSkipped),
				PreAvgMs:       pre.AvgMs, PreP95Ms: pre.P95Ms, PostAvgMs: post.AvgMs, PostP95Ms: post.P95Ms})
		}
		out = append(out, ft)
	}
	return out
}

func (sum trendRows) auditorTrends() []AuditorTrend {
	out := []AuditorTrend{}
	keys := slices.SortedFunc(maps.Keys(sum.auditors), func(a, b auditorKey) int {
		return cmp.Or(cmp.Compare(a.flow, b.flow), cmp.Compare(a.stage, b.stage), cmp.Compare(a.auditor, b.auditor))
	})
	for _, k := range keys {
		at := AuditorTrend{FlowID: k.flow, Stage: k.stage, AuditorID: k.auditor, Points: []AuditorPoint{}}
		for _, ts := range slices.SortedFunc(maps.Keys(sum.auditors[k]), time.Time.Compare) {
			c := sum.auditors[k][ts]
			at.Points = append(at.Points, AuditorPoint{Ts: ts, Audited: c.audited, Hit: c.hit, Errors: c.errors,
				HitRate: ratio(c.hit, c.audited), ErrorRate: ratio(c.errors, c.audited)})
		}
		out = append(out, at)
	}
	return out
}

// LatencyPoint is one bucket of the performance chart.
type LatencyPoint struct {
	Ts time.Time `json:"ts"`
	LatencySummary
}

// AuditorLatency is an auditor's call latency.
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

// getPerformance: the latency pre moderation adds to requests (request rows,
// or the flow's pre rows when a flow is chosen) and each auditor's latency.
func (p *Plugin) getPerformance(ctx context.Context, req *pluginv1.HTTPRequest) (*pluginv1.HTTPResponse, error) {
	q, errs := p.parseStatsQuery(req, "hour")
	if len(errs) > 0 {
		return pluginsdk.FieldErrorResponse("invalid query / 查询参数无效", errs), nil
	}
	db, err := p.db(ctx)
	if err != nil {
		return pluginsdk.Unavailable(err.Error()), nil
	}
	rows, err := p.loadStats(ctx, db, statFilter{from: q.from, to: q.to, group: q.group, flow: q.flow})
	if err != nil {
		return nil, err
	}
	want := kindRequest
	if q.flow != 0 {
		want = kindFlow
	}
	var total counters
	points := map[time.Time]*counters{}
	auditors := map[int64]*counters{}
	for i := range rows {
		r := &rows[i]
		kind := r.kind()
		if kind == kindAuditor {
			mergeInto(auditors, r.auditor, &r.counters)
			continue
		}
		if kind != want || r.timing != TimingPre {
			continue
		}
		total.merge(&r.counters)
		mergeInto(points, q.bucket(r.hour, q.granularity), &r.counters)
	}
	out := PerformanceResult{Granularity: q.granularity, From: q.from, To: q.to, Summary: summaryOf(&total),
		Points: []LatencyPoint{}, Auditors: []AuditorLatency{}}
	for _, ts := range slices.SortedFunc(maps.Keys(points), time.Time.Compare) {
		out.Points = append(out.Points, LatencyPoint{Ts: ts, LatencySummary: summaryOf(points[ts])})
	}
	for _, id := range slices.Sorted(maps.Keys(auditors)) {
		out.Auditors = append(out.Auditors, AuditorLatency{AuditorID: id, LatencySummary: summaryOf(auditors[id])})
	}
	return pluginsdk.DataResponse(out), nil
}

// ---------------------------------------------------------------- categories

const (
	maxCategoryScan = 50000
	categoryTTL     = time.Minute
)

// CategoryCount is one category of a ranking.
type CategoryCount struct {
	Category string `json:"category"`
	Label    string `json:"label,omitempty"`
	Count    int64  `json:"count"`
}

// CategoryStats is GET /stats/categories.
type CategoryStats struct {
	From               time.Time       `json:"from"`
	SuspiciousRequests int             `json:"suspicious_requests"`
	CategoryHits       int             `json:"category_hits"`
	Truncated          bool            `json:"truncated"`
	Items              []CategoryCount `json:"items"`
}

// categoryCache keeps the last result per "today" start for categoryTTL.
type categoryCache struct {
	mu      sync.Mutex
	entries map[time.Time]categoryEntry
}

type categoryEntry struct {
	at   time.Time
	data *CategoryStats
}

func (c *categoryCache) get(from, now time.Time) *CategoryStats {
	c.mu.Lock()
	defer c.mu.Unlock()
	if e, ok := c.entries[from]; ok && now.Sub(e.at) < categoryTTL {
		return e.data
	}
	return nil
}

func (c *categoryCache) put(from, now time.Time, data *CategoryStats) {
	c.mu.Lock()
	defer c.mu.Unlock()
	if c.entries == nil {
		c.entries = map[time.Time]categoryEntry{}
	}
	maps.DeleteFunc(c.entries, func(_ time.Time, e categoryEntry) bool { return now.Sub(e.at) >= categoryTTL })
	c.entries[from] = categoryEntry{at: now, data: data}
}

// getCategories counts today's suspicious requests by hit category: each
// request counts once per category, at most 50 000 records, cached 60 s
// (concurrent misses share one query).
func (p *Plugin) getCategories(ctx context.Context, req *pluginv1.HTTPRequest) (*pluginv1.HTTPResponse, error) {
	from := p.clockOf(req).today()
	if data := p.categories.get(from, p.now()); data != nil {
		return pluginsdk.DataResponse(data), nil
	}
	db, err := p.db(ctx)
	if err != nil {
		return pluginsdk.Unavailable(err.Error()), nil
	}
	v, err, _ := p.sf.Do("categories:"+from.Format(time.RFC3339), func() (any, error) {
		data, err := p.categoryStats(context.WithoutCancel(ctx), db, from)
		if err == nil {
			p.categories.put(from, p.now(), data)
		}
		return data, err
	})
	if err != nil {
		return nil, err
	}
	return pluginsdk.DataResponse(v), nil
}

func (p *Plugin) categoryStats(ctx context.Context, db *pgxpool.Pool, from time.Time) (*CategoryStats, error) {
	rows, err := db.Query(ctx, `SELECT id, request_id, hit_categories FROM events
		WHERE created_at >= $1 AND `+suspiciousResult+` ORDER BY created_at DESC LIMIT $2`, from, maxCategoryScan)
	if err != nil {
		return nil, err
	}
	requests := map[string]map[string]bool{}
	n := 0
	var id int64
	var rid string
	var cats []string
	if _, err := pgx.ForEachRow(rows, []any{&id, &rid, &cats}, func() error {
		n++
		key := cmp.Or(rid, "#"+strconv.FormatInt(id, 10))
		if requests[key] == nil {
			requests[key] = map[string]bool{}
		}
		for _, c := range cats {
			requests[key][c] = true
		}
		return nil
	}); err != nil {
		return nil, err
	}
	counts := map[string]int64{}
	out := &CategoryStats{From: from, SuspiciousRequests: len(requests), Truncated: n >= maxCategoryScan, Items: []CategoryCount{}}
	for _, set := range requests {
		for c := range set {
			counts[c]++
			out.CategoryHits++
		}
	}
	labels := p.snap.Load().categoryLabels()
	for c, k := range counts {
		out.Items = append(out.Items, CategoryCount{Category: c, Label: labels[c], Count: k})
	}
	slices.SortFunc(out.Items, func(a, b CategoryCount) int {
		return cmp.Or(cmp.Compare(b.Count, a.Count), cmp.Compare(a.Category, b.Category))
	})
	return out, nil
}

// ---------------------------------------------------------------- list columns

// FlowStats is the flow list's last-24-hour columns.
type FlowStats struct {
	Audited        int64   `json:"audited"`
	Suspicious     int64   `json:"suspicious"`
	SuspiciousRate float64 `json:"suspicious_rate"`
	PreAvgMs       float64 `json:"pre_avg_ms"`
}

func (p *Plugin) flowStats24h(ctx context.Context, db *pgxpool.Pool) (map[int64]FlowStats, error) {
	now := p.now().UTC()
	rows, err := p.loadStats(ctx, db, statFilter{from: now.Add(-24 * time.Hour).Truncate(time.Hour), to: now.Add(time.Hour)})
	if err != nil {
		return nil, err
	}
	all, pre := flowCounters(rows, time.Time{})
	out := make(map[int64]FlowStats, len(all))
	for id, c := range all {
		st := FlowStats{Audited: c.audited + c.cacheSkipped, Suspicious: c.hit, SuspiciousRate: ratio(c.hit, c.audited+c.cacheSkipped)}
		if pc := pre[id]; pc != nil {
			st.PreAvgMs = summaryOf(pc).AvgMs
		}
		out[id] = st
	}
	return out, nil
}

// AuditorToday is the auditor list's upstream calls and cost today (hook
// runs only; try-outs are on the channel rows).
type AuditorToday struct {
	Calls int64       `json:"calls"`
	Cost  CostSummary `json:"cost"`
}

func (p *Plugin) auditorsToday(ctx context.Context, db *pgxpool.Pool, ck clock) (map[int64]AuditorToday, error) {
	rows, err := p.loadStats(ctx, db, statFilter{from: ck.today(), to: ck.now.Add(time.Hour)})
	if err != nil {
		return nil, err
	}
	out := map[int64]AuditorToday{}
	for i := range rows {
		r := &rows[i]
		if r.kind() != kindAuditor {
			continue
		}
		st := out[r.auditor]
		st.Calls += r.calls
		st.Cost.add(r.costSummary())
		out[r.auditor] = st
	}
	return out, nil
}

// ChannelStat is the channel list's health and cost columns.
type ChannelStat struct {
	Calls1h          int64                  `json:"calls_1h"`
	Errors1h         int64                  `json:"errors_1h"`
	ErrorRate1h      float64                `json:"error_rate_1h"`
	TokensToday      int64                  `json:"tokens_today"`
	Cost1h           CostSummary            `json:"cost_1h"`
	CostToday        CostSummary            `json:"cost_today"`
	CostTodaySources map[string]CostSummary `json:"cost_today_sources"`
}

func newChannelStat() *ChannelStat { return &ChannelStat{CostTodaySources: map[string]CostSummary{}} }

func (p *Plugin) channelStats(ctx context.Context, db *pgxpool.Pool, ck clock, channels []int64) (map[int64]*ChannelStat, error) {
	today, lastHour := ck.today(), ck.lastHour()
	rows, err := p.loadChannelStats(ctx, db, earliest(today, lastHour), channels)
	if err != nil {
		return nil, err
	}
	out := map[int64]*ChannelStat{}
	for i := range rows {
		r := &rows[i]
		st := entry(out, r.channel, newChannelStat)
		cost := r.costSummary()
		if !r.hour.Before(lastHour) {
			if r.health() {
				st.Calls1h += r.calls
				st.Errors1h += r.errors
			}
			st.Cost1h.add(cost)
		}
		if !r.hour.Before(today) {
			st.TokensToday += r.in + r.out
			st.CostToday.add(cost)
			addSummary(st.CostTodaySources, r.source, cost)
		}
	}
	for _, st := range out {
		st.ErrorRate1h = ratio(st.Errors1h, st.Calls1h)
	}
	return out, nil
}

// ---------------------------------------------------------------- cleanup

// cleanupStats deletes statistics older than stats_retention_days, in batches.
func (p *Plugin) cleanupStats(ctx context.Context, db *pgxpool.Pool, now time.Time) error {
	cut := now.Add(-time.Duration(p.cfg.Load().StatsRetentionDays) * 24 * time.Hour)
	if _, err := deleteBatches(ctx, db, "stats_hourly", `SELECT ctid FROM stats_hourly WHERE hour < $1`, cut); err != nil {
		return err
	}
	_, err := deleteBatches(ctx, db, "user_daily", `SELECT ctid FROM user_daily WHERE day < $1`, cut.Truncate(24*time.Hour))
	return err
}
