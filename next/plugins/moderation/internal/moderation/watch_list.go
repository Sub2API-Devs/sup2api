package moderation

import (
	"context"
	"strconv"
	"strings"
	"time"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"

	pluginv1 "github.com/Sub2API-Devs/sup2api/next/sdk/gen/pluginv1"
	"github.com/Sub2API-Devs/sup2api/next/sdk/pluginsdk"
)

// GET /watchlist (CONTRACTS §72.14.3): filters and sorting of new-api's
// list, and per row the user's suspicious records of the last 30 days.

// watchSince is the window of the per-row aggregates.
const watchSince = 30 * 24 * time.Hour

// SeverityCounts counts suspicious records by severity.
type SeverityCounts struct {
	High   int64 `json:"high"`
	Medium int64 `json:"medium"`
	Low    int64 `json:"low"`
}

// WatchItem is a watch entry with its aggregates.
type WatchItem struct {
	Watch
	SuspiciousTotal int64           `json:"suspicious_total"`
	Severity        SeverityCounts  `json:"severity"`
	TopCategories   []CategoryCount `json:"top_categories"`
	OtherCategories int64           `json:"other_categories"`
	Groups          []int64         `json:"groups"`
	AICounts        *VerdictCounts  `json:"ai_counts"` // latest successful analysis
}

var watchSorts = map[string]string{
	"new":      `w.hits_since_seen DESC, w.last_hit_at DESC NULLS LAST, w.user_id`,
	"last_hit": `w.last_hit_at DESC NULLS LAST, w.user_id`,
	"severity": `coalesce(r.high, 0) DESC, coalesce(r.medium, 0) DESC, w.user_id`,
	"total":    `coalesce(r.total, 0) DESC, w.user_id`,
}

func (p *Plugin) listWatch(ctx context.Context, req *pluginv1.HTTPRequest) (*pluginv1.HTTPResponse, error) {
	page, size, errs := pagination(req)
	now := p.now().UTC()
	since := now.Add(-watchSince)
	f := &eventQuery{conds: []string{"(w.expires_at IS NULL OR w.expires_at > $1)"}, args: []any{now}}
	if v := pluginsdk.Query(req, "level"); v != "" {
		if v != LevelObserve && v != LevelEnforce {
			errs = errs.Add("level", "enum", "level must be observe or enforce / level 取值为 observe、enforce")
		} else {
			f.conds = append(f.conds, "w.level = "+f.arg(v))
		}
	}
	for _, name := range []string{"user_id", "q"} {
		if v := pluginsdk.Query(req, name); v != "" {
			id, err := strconv.ParseInt(v, 10, 64)
			if err != nil || id <= 0 {
				errs = errs.Add(name, "invalid", name+" must be a user id / "+name+" 必须是用户 id")
				continue
			}
			f.conds = append(f.conds, "w.user_id = "+f.arg(id))
		}
	}
	if v := pluginsdk.Query(req, "with_new"); v == "1" || v == "true" {
		f.conds = append(f.conds, "w.hits_since_seen > 0")
	}
	switch v := pluginsdk.Query(req, "trend"); v {
	case "":
	case "none":
		f.conds = append(f.conds, "w.latest_trend = ''")
	case TrendOccasional, TrendPersistent, TrendEscalating, TrendLikelyFalsePositive:
		f.conds = append(f.conds, "w.latest_trend = "+f.arg(v))
	default:
		errs = errs.Add("trend", "enum", "trend must be occasional, persistent, escalating, likely_false_positive or none / trend 取值无效")
	}
	if v := pluginsdk.Query(req, "category"); v != "" {
		if !jevCategoryRe.MatchString(v) && !categoryIDRe.MatchString(v) {
			errs = errs.Add("category", "invalid", "category is invalid / 分类格式无效")
		} else {
			f.conds = append(f.conds, `EXISTS (SELECT 1 FROM events e WHERE e.user_id = w.user_id AND e.created_at >= `+f.arg(since)+`
				AND e.result IN ('hit', 'block') AND `+f.arg(v)+` = ANY(e.hit_categories))`)
		}
	}
	sort := pluginsdk.Query(req, "sort")
	if sort == "" {
		sort = "new"
	}
	order, ok := watchSorts[sort]
	if !ok {
		errs = errs.Add("sort", "enum", "sort must be new, last_hit, severity or total / sort 取值为 new、last_hit、severity、total")
	}
	errs = append(errs, f.errs...)
	if len(errs) > 0 {
		return pluginsdk.FieldErrorResponse("invalid query / 查询参数无效", errs), nil
	}
	db, err := p.db(ctx)
	if err != nil {
		return pluginsdk.Unavailable(err.Error()), nil
	}
	where := strings.Join(f.conds, " AND ")
	var total int64
	if err := db.QueryRow(ctx, `SELECT count(*) FROM watchlist w WHERE `+where, f.args...).Scan(&total); err != nil {
		return nil, err
	}
	n := len(f.args)
	args := append(f.args, size, (page-1)*size, since)
	rows, err := db.Query(ctx, `SELECT `+prefixed("w.", watchColumns)+` FROM watchlist w
		LEFT JOIN LATERAL (SELECT count(*) AS total, count(*) FILTER (WHERE severity = 'high') AS high, count(*) FILTER (WHERE severity = 'medium') AS medium
			FROM events e WHERE e.user_id = w.user_id AND e.created_at >= $`+strconv.Itoa(n+3)+` AND e.result IN ('hit', 'block')) r ON true
		WHERE `+where+` ORDER BY `+order+` LIMIT $`+strconv.Itoa(n+1)+` OFFSET $`+strconv.Itoa(n+2), args...)
	if err != nil {
		return nil, err
	}
	list, err := pgx.CollectRows(rows, func(r pgx.CollectableRow) (WatchItem, error) {
		w, err := scanWatch(r)
		w.fillRunning(now)
		return WatchItem{Watch: w, TopCategories: []CategoryCount{}, Groups: []int64{}}, err
	})
	if err != nil {
		return nil, err
	}
	if list == nil {
		list = []WatchItem{}
	}
	if err := fillWatchAggregates(ctx, db, list, since); err != nil {
		return nil, err
	}
	return pluginsdk.ListResponse(list, pluginsdk.Page{Page: page, PageSize: size, Total: total}), nil
}

// prefixed qualifies a column list with a table alias.
func prefixed(alias, columns string) string {
	parts := strings.Split(columns, ",")
	for i, c := range parts {
		parts[i] = alias + strings.TrimSpace(c)
	}
	return strings.Join(parts, ", ")
}

// fillWatchAggregates adds the 30-day counts, categories, groups and the AI
// counts of the latest analysis to a page of entries.
func fillWatchAggregates(ctx context.Context, db *pgxpool.Pool, list []WatchItem, since time.Time) error {
	if len(list) == 0 {
		return nil
	}
	byUser := make(map[int64]*WatchItem, len(list))
	ids, analyses := make([]int64, 0, len(list)), []int64{}
	for i := range list {
		byUser[list[i].UserID] = &list[i]
		ids = append(ids, list[i].UserID)
		if list[i].LatestAnalysisID > 0 {
			analyses = append(analyses, list[i].LatestAnalysisID)
		}
	}
	rows, err := db.Query(ctx, `SELECT user_id, count(*), count(*) FILTER (WHERE severity = 'high'), count(*) FILTER (WHERE severity = 'medium'),
			count(*) FILTER (WHERE severity = 'low'), array_agg(DISTINCT group_id ORDER BY group_id)
		FROM events WHERE user_id = ANY($1) AND created_at >= $2 AND result IN ('hit', 'block') GROUP BY user_id`, ids, since)
	if err != nil {
		return err
	}
	var uid, total int64
	var sev SeverityCounts
	var groups []int64
	if _, err := pgx.ForEachRow(rows, []any{&uid, &total, &sev.High, &sev.Medium, &sev.Low, &groups}, func() error {
		it := byUser[uid]
		it.SuspiciousTotal, it.Severity, it.Groups = total, sev, groups
		return nil
	}); err != nil {
		return err
	}
	rows, err = db.Query(ctx, `SELECT user_id, c, count(*) FROM events, unnest(hit_categories) AS c
		WHERE user_id = ANY($1) AND created_at >= $2 AND result IN ('hit', 'block') GROUP BY 1, 2 ORDER BY 1, 3 DESC, 2`, ids, since)
	if err != nil {
		return err
	}
	var cc CategoryCount
	if _, err := pgx.ForEachRow(rows, []any{&uid, &cc.Category, &cc.Count}, func() error {
		it := byUser[uid]
		if len(it.TopCategories) < 3 {
			it.TopCategories = append(it.TopCategories, cc)
		} else {
			it.OtherCategories++
		}
		return nil
	}); err != nil {
		return err
	}
	rows, err = db.Query(ctx, `SELECT user_id, verdict_counts FROM user_analyses WHERE id = ANY($1) AND status = $2`, analyses, AnalysisStatusOK)
	if err != nil {
		return err
	}
	var vc VerdictCounts
	_, err = pgx.ForEachRow(rows, []any{&uid, &vc}, func() error {
		c := vc
		byUser[uid].AICounts = &c
		return nil
	})
	return err
}
