package guard

import (
	"context"
	"net/http"
	"strings"
	"time"

	"github.com/jackc/pgx/v5"

	pluginv1 "github.com/Sub2API-Devs/sup2api/next/sdk/gen/pluginv1"
	"github.com/Sub2API-Devs/sup2api/next/sdk/pluginsdk"
)

// TrendPoint is one bucket of the stats trend.
type TrendPoint struct {
	TS      time.Time `json:"ts"`
	Blocked int64     `json:"blocked"`
	Total   int64     `json:"total"`
}

// TopRule is one row of the rule hit ranking.
type TopRule struct {
	RuleID  int64  `json:"rule_id"`
	Name    string `json:"name"`
	Kind    string `json:"kind"`
	Pattern string `json:"pattern"`
	Hits    int64  `json:"hits"`
}

// RecentBlock is one recently blocked request.
type RecentBlock struct {
	OccurredAt time.Time `json:"occurred_at"`
	RuleID     int64     `json:"rule_id"`
	RuleName   string    `json:"rule_name"`
	RequestID  string    `json:"request_id"`
	UserID     int64     `json:"user_id"`
	GroupID    int64     `json:"group_id"`
	Model      string    `json:"model"`
	Snippet    string    `json:"snippet,omitempty"`
}

// Stats is the GET /stats response data.
type Stats struct {
	From          time.Time     `json:"from"`
	To            time.Time     `json:"to"`
	Bucket        string        `json:"bucket"` // hour | day
	BlockedTotal  int64         `json:"blocked_total"`
	RequestsTotal int64         `json:"requests_total"`
	Trend         []TrendPoint  `json:"trend"`
	TopRules      []TopRule     `json:"top_rules"`
	Recent        []RecentBlock `json:"recent"`
}

// statsWindow resolves the query window.
//
//	range=today (default) | 24h | 7d | 30d, tz=<IANA zone, default UTC>,
//	from/to=RFC 3339 (override range).
func statsWindow(req *pluginv1.HTTPRequest, now time.Time) (from, to time.Time, loc *time.Location, errs pluginsdk.FieldErrors) {
	loc = time.UTC
	if tz := strings.TrimSpace(pluginsdk.Query(req, "tz")); tz != "" {
		l, err := time.LoadLocation(tz)
		if err != nil {
			errs = errs.Add("tz", "invalid", "unknown time zone / 未知时区")
		} else {
			loc = l
		}
	}
	to = now
	switch r := pluginsdk.Query(req, "range"); r {
	case "", "today":
		n := now.In(loc)
		from = time.Date(n.Year(), n.Month(), n.Day(), 0, 0, 0, 0, loc)
	case "24h":
		from = now.Add(-24 * time.Hour)
	case "7d":
		from = now.Add(-7 * 24 * time.Hour)
	case "30d":
		from = now.Add(-30 * 24 * time.Hour)
	default:
		errs = errs.Add("range", "enum", "range must be today, 24h, 7d or 30d / range 取值为 today、24h、7d、30d")
	}
	if v := pluginsdk.Query(req, "from"); v != "" {
		t, err := time.Parse(time.RFC3339, v)
		if err != nil {
			errs = errs.Add("from", "format", "from must be RFC 3339 / from 必须是 RFC 3339 时间")
		} else {
			from = t
		}
	}
	if v := pluginsdk.Query(req, "to"); v != "" {
		t, err := time.Parse(time.RFC3339, v)
		if err != nil {
			errs = errs.Add("to", "format", "to must be RFC 3339 / to 必须是 RFC 3339 时间")
		} else {
			to = t
		}
	}
	if len(errs) == 0 && !from.Before(to) {
		errs = errs.Add("from", "range", "from must be before to / from 必须早于 to")
	}
	if len(errs) == 0 && to.Sub(from) > 90*24*time.Hour {
		errs = errs.Add("from", "range", "window must not exceed 90 days / 时间范围不能超过 90 天")
	}
	return from.UTC(), to.UTC(), loc, errs
}

// bucketStart truncates t to its bucket start.
func bucketStart(t time.Time, bucket string, loc *time.Location) time.Time {
	if bucket == "day" {
		l := t.In(loc)
		return time.Date(l.Year(), l.Month(), l.Day(), 0, 0, 0, 0, loc).UTC()
	}
	return t.UTC().Truncate(time.Hour)
}

func nextBucket(t time.Time, bucket string, loc *time.Location) time.Time {
	if bucket == "day" {
		l := t.In(loc)
		return time.Date(l.Year(), l.Month(), l.Day()+1, 0, 0, 0, 0, loc).UTC()
	}
	return t.Add(time.Hour)
}

// getStats serves GET /stats.
func (p *Plugin) getStats(ctx context.Context, req *pluginv1.HTTPRequest) (*pluginv1.HTTPResponse, error) {
	now := p.now().UTC()
	from, to, loc, errs := statsWindow(req, now)
	if len(errs) > 0 {
		return pluginsdk.FieldErrorResponse("invalid query / 查询参数无效", errs), nil
	}
	db, err := p.db(ctx)
	if err != nil {
		return pluginsdk.ErrorResponse(http.StatusServiceUnavailable, "unavailable", err.Error()), nil
	}
	st := Stats{From: from, To: to, Bucket: "hour", Trend: []TrendPoint{}, TopRules: []TopRule{}, Recent: []RecentBlock{}}
	if to.Sub(from) > 8*24*time.Hour {
		st.Bucket = "day"
	}
	// Minutely rows are kept 8 days; older windows read the hourly rollup.
	table, col := "stats_minutely", "minute"
	if from.Before(now.Add(-7 * 24 * time.Hour)) {
		table, col = "stats_hourly", "hour"
	}
	bucketExpr := "date_trunc('hour', " + col + ", 'UTC')"
	if st.Bucket == "day" {
		bucketExpr = "date_trunc('day', " + col + ", $3)"
	}
	rows, err := db.Query(ctx, `SELECT `+bucketExpr+` AS ts, sum(blocked)::bigint, sum(requests)::bigint
		FROM `+table+` WHERE `+col+` >= $1 AND `+col+` < $2 AND $3::text IS NOT NULL
		GROUP BY 1 ORDER BY 1`, from, to, loc.String())
	if err != nil {
		return nil, err
	}
	points, err := pgx.CollectRows(rows, func(r pgx.CollectableRow) (TrendPoint, error) {
		var tp TrendPoint
		err := r.Scan(&tp.TS, &tp.Blocked, &tp.Total)
		return tp, err
	})
	if err != nil {
		return nil, err
	}
	byTS := make(map[int64]TrendPoint, len(points))
	for _, tp := range points {
		byTS[tp.TS.Unix()] = tp
		st.BlockedTotal += tp.Blocked
		st.RequestsTotal += tp.Total
	}
	for b := bucketStart(from, st.Bucket, loc); b.Before(to); b = nextBucket(b, st.Bucket, loc) {
		tp, ok := byTS[b.Unix()]
		if !ok {
			tp = TrendPoint{TS: b}
		}
		tp.TS = tp.TS.UTC()
		st.Trend = append(st.Trend, tp)
	}

	rows, err = db.Query(ctx, `SELECT b.rule_id, coalesce(r.name, max(b.rule_name)), coalesce(r.kind, ''), coalesce(r.pattern, ''), count(*)
		FROM block_log b LEFT JOIN rules r ON r.id = b.rule_id
		WHERE b.occurred_at >= $1 AND b.occurred_at < $2
		GROUP BY b.rule_id, r.name, r.kind, r.pattern
		ORDER BY count(*) DESC, b.rule_id LIMIT 10`, from, to)
	if err != nil {
		return nil, err
	}
	if st.TopRules, err = pgx.CollectRows(rows, func(r pgx.CollectableRow) (TopRule, error) {
		var tr TopRule
		err := r.Scan(&tr.RuleID, &tr.Name, &tr.Kind, &tr.Pattern, &tr.Hits)
		return tr, err
	}); err != nil {
		return nil, err
	}

	rows, err = db.Query(ctx, `SELECT occurred_at, rule_id, rule_name, request_id, user_id, group_id, model, coalesce(snippet, '')
		FROM block_log WHERE occurred_at >= $1 AND occurred_at < $2
		ORDER BY occurred_at DESC, id DESC LIMIT 20`, from, to)
	if err != nil {
		return nil, err
	}
	if st.Recent, err = pgx.CollectRows(rows, func(r pgx.CollectableRow) (RecentBlock, error) {
		var rb RecentBlock
		err := r.Scan(&rb.OccurredAt, &rb.RuleID, &rb.RuleName, &rb.RequestID, &rb.UserID, &rb.GroupID, &rb.Model, &rb.Snippet)
		return rb, err
	}); err != nil {
		return nil, err
	}
	return pluginsdk.DataResponse(st), nil
}
