package moderation

import (
	"context"
	"encoding/json"
	"net/http"
	"slices"
	"strconv"
	"strings"
	"time"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"

	pluginv1 "github.com/Sub2API-Devs/sup2api/next/sdk/gen/pluginv1"
	"github.com/Sub2API-Devs/sup2api/next/sdk/pluginsdk"
)

// GET /watchlist like new-api ListModerationWatch: filters level, new_only,
// trend (none = never analysed), category, user_id / user_ids (the console
// resolves usernames to ids through the core), sort new | last_hit |
// severity | total, and per-row aggregates of the user's suspicious records.

// recentDays is the window of a watch row's groups (new-api moderationRecentDays).
const recentDays = 30

// severityCounts selects total, high, medium and low of suspicious records
// (with severitySuspicious in the WHERE clause).
const (
	severityCounts = `count(*) AS total, count(*) FILTER (WHERE severity = 'high') AS high,
	count(*) FILTER (WHERE severity = 'medium') AS medium, count(*) FILTER (WHERE severity = 'low') AS low`
	severitySuspicious = `result IN ('hit', 'block')`
)

// SeverityCounts counts suspicious records by severity.
type SeverityCounts struct {
	High   int64 `json:"high"`
	Medium int64 `json:"medium"`
	Low    int64 `json:"low"`
}

// WatchItem is one row of GET /watchlist.
type WatchItem struct {
	Watch
	GroupID         int64           `json:"group_id"` // group of the latest record
	OtherGroups     []int64         `json:"other_groups"`
	Flow            *FlowRef        `json:"flow"` // flow bound to group_id now
	SuspiciousTotal int64           `json:"suspicious_total"`
	BySeverity      SeverityCounts  `json:"by_severity"`
	TopCategories   []CategoryCount `json:"top_categories"`
	TopOther        int64           `json:"top_other"`
	AICounts        *VerdictCounts  `json:"ai_counts"`
}

// watchFilter builds the WHERE clause over watchlist w.
func watchFilter(req *pluginv1.HTTPRequest, now time.Time) (string, []any, pluginsdk.FieldErrors) {
	f := &sqlFilter{conds: []string{"(w.expires_at IS NULL OR w.expires_at > $1)"}, args: []any{now}}
	if v := pluginsdk.Query(req, "level"); v != "" {
		if v != LevelObserve && v != LevelEnforce {
			f.errs = f.errs.Add("level", "enum", "level must be observe or enforce / level 取值为 observe、enforce")
		} else {
			f.conds = append(f.conds, "w.level = "+f.arg(v))
		}
	}
	switch pluginsdk.Query(req, "new_only") {
	case "", "0", "false":
	case "1", "true":
		f.conds = append(f.conds, "w.hits_since_seen > 0")
	default:
		f.errs = f.errs.Add("new_only", "enum", "new_only must be true or false / new_only 取值为 true、false")
	}
	switch v := pluginsdk.Query(req, "trend"); {
	case v == "":
	case v == "none":
		f.conds = append(f.conds, "w.latest_trend = ''")
	case slices.Contains(trends, v):
		f.conds = append(f.conds, "w.latest_trend = "+f.arg(v))
	default:
		f.errs = f.errs.Add("trend", "enum", "trend is invalid / trend 取值无效")
	}
	if v := pluginsdk.Query(req, "category"); v != "" {
		if !jevCategoryRe.MatchString(v) && !categoryIDRe.MatchString(v) {
			f.errs = f.errs.Add("category", "invalid", "category is invalid / 分类格式无效")
		} else {
			f.conds = append(f.conds, "EXISTS (SELECT 1 FROM events e WHERE e.user_id = w.user_id AND e.result IN ('hit', 'block') AND "+f.arg(v)+" = ANY(e.hit_categories))")
		}
	}
	if id, ok := f.queryID(req, "user_id"); ok {
		f.conds = append(f.conds, "w.user_id = "+f.arg(id))
	}
	f.idList(req, "user_ids", "w.user_id")
	return f.where(), f.args, f.errs
}

func (p *Plugin) listWatch(ctx context.Context, req *pluginv1.HTTPRequest) (*pluginv1.HTTPResponse, error) {
	page, size, errs := pagination(req)
	now := p.now().UTC()
	where, args, ferrs := watchFilter(req, now)
	errs = append(errs, ferrs...)
	order := "w.hits_since_seen DESC, w.last_hit_at DESC NULLS LAST, w.user_id"
	join := ""
	switch pluginsdk.Query(req, "sort") {
	case "", "new":
	case "last_hit":
		order = "w.last_hit_at DESC NULLS LAST, w.user_id"
	case "severity", "total":
		join = ` LEFT JOIN (SELECT user_id, ` + severityCounts + ` FROM events
			WHERE ` + severitySuspicious + ` AND user_id IN (SELECT w.user_id FROM watchlist w WHERE ` + where + `)
			GROUP BY user_id) r ON r.user_id = w.user_id`
		order = "coalesce(r.high, 0) DESC, coalesce(r.medium, 0) DESC, w.user_id"
		if pluginsdk.Query(req, "sort") == "total" {
			order = "coalesce(r.total, 0) DESC, w.user_id"
		}
	default:
		errs = errs.Add("sort", "enum", "sort must be new, last_hit, severity or total / sort 取值为 new、last_hit、severity、total")
	}
	if len(errs) > 0 {
		return pluginsdk.FieldErrorResponse("invalid query / 查询参数无效", errs), nil
	}
	db, err := p.db(ctx)
	if err != nil {
		return pluginsdk.Unavailable(err.Error()), nil
	}
	var total int64
	if err := db.QueryRow(ctx, `SELECT count(*) FROM watchlist w WHERE `+where, args...).Scan(&total); err != nil {
		return nil, err
	}
	n := len(args)
	args = append(args, size, (page-1)*size)
	cols := "w." + strings.ReplaceAll(watchColumns, ", ", ", w.")
	rows, err := db.Query(ctx, `SELECT `+cols+` FROM watchlist w`+join+` WHERE `+where+
		` ORDER BY `+order+` LIMIT $`+strconv.Itoa(n+1)+` OFFSET $`+strconv.Itoa(n+2), args...)
	if err != nil {
		return nil, err
	}
	list, err := pgx.CollectRows(rows, func(r pgx.CollectableRow) (Watch, error) { return scanWatch(r) })
	if err != nil {
		return nil, err
	}
	items, err := p.watchItems(ctx, db, list, now)
	if err != nil {
		return nil, err
	}
	counts, err := p.watchCounts(ctx, db)
	if err != nil {
		return nil, err
	}
	return pluginsdk.JSONResponse(http.StatusOK, map[string]any{
		"data": items, "page": pluginsdk.Page{Page: page, PageSize: size, Total: total},
		"counts": counts, "analysis_every_violations": p.cfg.Load().AnalysisEveryViolations,
	}), nil
}

// watchItems adds the aggregates of each entry's suspicious records, its
// recent groups, the flow of its current group and the AI counts of its
// latest successful analysis.
func (p *Plugin) watchItems(ctx context.Context, db *pgxpool.Pool, list []Watch, now time.Time) ([]WatchItem, error) {
	items := make([]WatchItem, len(list))
	if len(list) == 0 {
		return items, nil
	}
	ids := make([]int64, len(list))
	byID := map[int64]*WatchItem{}
	var analyses []int64
	for i, w := range list {
		w.fillRunning(now)
		items[i] = WatchItem{Watch: w, OtherGroups: []int64{}, TopCategories: []CategoryCount{}}
		ids[i] = w.UserID
		byID[w.UserID] = &items[i]
		if w.LatestAnalysisStatus == AnalysisStatusOK && w.LatestAnalysisID > 0 {
			analyses = append(analyses, w.LatestAnalysisID)
		}
	}
	rows, err := db.Query(ctx, `SELECT user_id, `+severityCounts+` FROM events WHERE `+severitySuspicious+` AND user_id = ANY($1) GROUP BY user_id`, ids)
	if err != nil {
		return nil, err
	}
	var uid, total, high, medium, low int64
	if _, err := pgx.ForEachRow(rows, []any{&uid, &total, &high, &medium, &low}, func() error {
		it := byID[uid]
		it.SuspiciousTotal, it.BySeverity = total, SeverityCounts{High: high, Medium: medium, Low: low}
		return nil
	}); err != nil {
		return nil, err
	}
	rows, err = db.Query(ctx, `SELECT user_id, c, count(*) FROM events, unnest(hit_categories) AS c
		WHERE result IN ('hit', 'block') AND user_id = ANY($1) GROUP BY user_id, c ORDER BY user_id, count(*) DESC, c`, ids)
	if err != nil {
		return nil, err
	}
	labels := p.snap.Load().categoryLabels()
	var cat string
	var cnt int64
	if _, err := pgx.ForEachRow(rows, []any{&uid, &cat, &cnt}, func() error {
		it := byID[uid]
		if len(it.TopCategories) < 3 {
			it.TopCategories = append(it.TopCategories, CategoryCount{Category: cat, Label: labels[cat], Count: cnt})
		} else {
			it.TopOther += cnt
		}
		return nil
	}); err != nil {
		return nil, err
	}
	// Groups of the last recentDays, newest first: the first is the current one.
	rows, err = db.Query(ctx, `SELECT user_id, group_id, max(created_at) FROM events WHERE user_id = ANY($1) AND created_at >= $2
		GROUP BY user_id, group_id ORDER BY user_id, max(created_at) DESC`, ids, now.Add(-recentDays*24*time.Hour))
	if err != nil {
		return nil, err
	}
	seen := map[int64]bool{}
	var group int64
	var last time.Time
	if _, err := pgx.ForEachRow(rows, []any{&uid, &group, &last}, func() error {
		it := byID[uid]
		if !seen[uid] {
			seen[uid], it.GroupID = true, group
		} else {
			it.OtherGroups = append(it.OtherGroups, group)
		}
		return nil
	}); err != nil {
		return nil, err
	}
	snap := p.snap.Load()
	for i := range items {
		if !seen[items[i].UserID] {
			continue
		}
		if f := snap.flowFor(items[i].GroupID); f != nil {
			items[i].Flow = &FlowRef{FlowID: f.ID, Name: f.Name, Version: f.Version}
		}
	}
	if len(analyses) > 0 {
		rows, err = db.Query(ctx, `SELECT id, user_id, verdict_counts FROM user_analyses WHERE id = ANY($1)`, analyses)
		if err != nil {
			return nil, err
		}
		var id int64
		var raw []byte
		if _, err := pgx.ForEachRow(rows, []any{&id, &uid, &raw}, func() error {
			var vc VerdictCounts
			if it := byID[uid]; it != nil && it.LatestAnalysisID == id && json.Unmarshal(raw, &vc) == nil {
				it.AICounts = &vc
			}
			return nil
		}); err != nil {
			return nil, err
		}
	}
	return items, nil
}

// markWatchSeen resets hits_since_seen of an active entry (new-api "mark as seen").
func (p *Plugin) markWatchSeen(ctx context.Context, req *pluginv1.HTTPRequest) (*pluginv1.HTTPResponse, error) {
	uid, bad := parseID(req, "user_id")
	if bad != nil {
		return bad, nil
	}
	db, err := p.db(ctx)
	if err != nil {
		return pluginsdk.Unavailable(err.Error()), nil
	}
	tag, err := db.Exec(ctx, `UPDATE watchlist SET hits_since_seen = 0 WHERE user_id = $1 AND (expires_at IS NULL OR expires_at > $2)`, uid, p.now().UTC())
	if err != nil {
		return nil, err
	}
	if tag.RowsAffected() == 0 {
		return pluginsdk.ErrorResponse(http.StatusNotFound, "not_found", "user is not on the watch list / 该用户不在观察名单中"), nil
	}
	return pluginsdk.DataResponse(map[string]any{"user_id": uid, "hits_since_seen": 0}), nil
}
