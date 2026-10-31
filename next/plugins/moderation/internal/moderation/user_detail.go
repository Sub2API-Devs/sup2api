package moderation

import (
	"context"
	"errors"
	"time"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"

	pluginv1 "github.com/Sub2API-Devs/sup2api/next/sdk/gen/pluginv1"
	"github.com/Sub2API-Devs/sup2api/next/sdk/pluginsdk"
)

// GET /users/:user_id is the user detail drawer (new-api
// GetModerationWatchDetail): it answers for any user id, on the watch list
// or not. The username, role and status come from the core (/users/:id),
// which the console reads itself; the timeline and the watch history are
// GET /events?user_id= and GET /watchlist/:user_id/events.

// AIVerdictCounts counts suspicious records by AI verdict (none = not
// analysed yet).
type AIVerdictCounts struct {
	VerdictTally
	None int64 `json:"none"`
}

// UserSummary counts all suspicious records of a user.
type UserSummary struct {
	Total         int64           `json:"total"`
	Pending       int64           `json:"pending"`
	Confirmed     int64           `json:"confirmed"`
	FalsePositive int64           `json:"false_positive"`
	BySeverity    SeverityCounts  `json:"by_severity"`
	AIVerdicts    AIVerdictCounts `json:"ai_verdicts"`
}

// ContextSource is one "group → flow@version" the user's records of the
// last recentDays came through.
type ContextSource struct {
	GroupID    int64           `json:"group_id"`
	FlowID     int64           `json:"flow_id"`
	FlowName   string          `json:"flow_name"`
	Version    int             `json:"version"`
	Count      int64           `json:"count"`
	AIVerdicts AIVerdictCounts `json:"ai_verdicts"`
	Current    bool            `json:"current"`
}

// UserContext is the context bar: the group of the latest record, the flow
// bound to it now and the recent sources.
type UserContext struct {
	GroupID *int64          `json:"group_id"`
	Flow    *FlowRef        `json:"flow"`
	Sources []ContextSource `json:"sources"`
}

// UserDay is one user_daily row.
type UserDay struct {
	Day        string     `json:"day"` // UTC, 2006-01-02
	GroupID    int64      `json:"group_id"`
	Audited    int64      `json:"audited"`
	Suspicious int64      `json:"suspicious"`
	High       int64      `json:"high"`
	Errors     int64      `json:"errors"`
	LastHitAt  *time.Time `json:"last_hit_at"`
}

// AnalysisProgress is how far the user is from the next automatic analysis.
type AnalysisProgress struct {
	Running                 bool `json:"running"`
	Queued                  bool `json:"queued"`
	ViolationsSinceAnalysis int  `json:"violations_since_analysis"`
	Every                   int  `json:"every"`
}

// UserDetail is GET /users/:user_id.
type UserDetail struct {
	UserID int64 `json:"user_id"`
	UserState
	Summary        UserSummary      `json:"summary"`
	Context        UserContext      `json:"context"`
	Daily          []UserDay        `json:"daily"`
	LatestAnalysis *AnalysisView    `json:"latest_analysis"`
	Analysis       AnalysisProgress `json:"analysis"`
}

func (p *Plugin) getUserDetail(ctx context.Context, req *pluginv1.HTTPRequest) (*pluginv1.HTTPResponse, error) {
	uid, bad := parseID(req, "user_id")
	if bad != nil {
		return bad, nil
	}
	db, err := p.db(ctx)
	if err != nil {
		return pluginsdk.Unavailable(err.Error()), nil
	}
	now := p.now().UTC()
	d := &UserDetail{UserID: uid, Analysis: AnalysisProgress{Every: p.cfg.Load().AnalysisEveryViolations}}
	if d.UserState, err = p.userState(ctx, db, uid); err != nil {
		return nil, err
	}
	if w := d.Watch; w != nil {
		d.Analysis.Running, d.Analysis.Queued, d.Analysis.ViolationsSinceAnalysis = w.AnalysisRunning, w.AnalysisRequestedAt != nil, w.ViolationCount
	}
	for _, load := range []func(context.Context, *pgxpool.Pool, *UserDetail, time.Time) error{
		loadUserSummary, p.loadUserContext, p.loadUserDaily, loadLatestAnalysis,
	} {
		if err := load(ctx, db, d, now); err != nil {
			return nil, err
		}
	}
	return pluginsdk.DataResponse(d), nil
}

// aiVerdictSums selects AIVerdictCounts (scanned by targets) of suspicious records.
const aiVerdictSums = `count(*) FILTER (WHERE ai_verdict = 'violation'), count(*) FILTER (WHERE ai_verdict = 'false_positive'),
	count(*) FILTER (WHERE ai_verdict = 'unsure'), count(*) FILTER (WHERE ai_verdict = '')`

func (v *AIVerdictCounts) targets() []any {
	return []any{&v.Violation, &v.FalsePositive, &v.Unsure, &v.None}
}

func loadUserSummary(ctx context.Context, db *pgxpool.Pool, d *UserDetail, _ time.Time) error {
	s := &d.Summary
	return db.QueryRow(ctx, `SELECT `+severityCounts+`, count(*) FILTER (WHERE review_status = 'pending'),
			count(*) FILTER (WHERE review_status = 'confirmed'), count(*) FILTER (WHERE review_status = 'false_positive'), `+aiVerdictSums+`
		FROM events WHERE user_id = $1 AND `+suspiciousResult, d.UserID).
		Scan(append([]any{&s.Total, &s.BySeverity.High, &s.BySeverity.Medium, &s.BySeverity.Low, &s.Pending, &s.Confirmed, &s.FalsePositive},
			s.AIVerdicts.targets()...)...)
}

// loadUserContext: the group of the latest record (the plugin cannot read
// the user's group from the core), its flow now, and the suspicious records
// of the last recentDays by group, flow and version.
func (p *Plugin) loadUserContext(ctx context.Context, db *pgxpool.Pool, d *UserDetail, now time.Time) error {
	uc := &d.Context
	var group int64
	err := db.QueryRow(ctx, `SELECT group_id FROM events WHERE user_id = $1 ORDER BY created_at DESC LIMIT 1`, d.UserID).Scan(&group)
	switch {
	case err == nil:
		uc.GroupID = &group
	case !errors.Is(err, pgx.ErrNoRows):
		return err
	}
	snap := p.snap.Load()
	if f := snap.flowFor(group); uc.GroupID != nil && f != nil {
		uc.Flow = &FlowRef{FlowID: f.ID, Name: f.Name, Version: f.Version}
	}
	uc.Sources, err = p.loadSources(ctx, db, d.UserID, now.Add(-recentDays*24*time.Hour), uc.GroupID, uc.Flow)
	return err
}

// loadSources returns the user's suspicious records since `since` by group,
// flow and version ("group → flow@version"), latest first, at most 50, with
// their AI verdicts. current marks the source of group through flow, the
// flow bound to that group now (both may be nil).
func (p *Plugin) loadSources(ctx context.Context, db *pgxpool.Pool, uid int64, since time.Time, group *int64, flow *FlowRef) ([]ContextSource, error) {
	names, err := p.flowNames(ctx, db)
	if err != nil {
		return nil, err
	}
	rows, err := db.Query(ctx, `SELECT group_id, flow_id, flow_version, count(*), `+aiVerdictSums+`
		FROM events WHERE user_id = $1 AND created_at >= $2 AND `+suspiciousResult+`
		GROUP BY group_id, flow_id, flow_version ORDER BY max(created_at) DESC LIMIT 50`, uid, since)
	if err != nil {
		return nil, err
	}
	sources := []ContextSource{}
	var s ContextSource
	_, err = pgx.ForEachRow(rows, append([]any{&s.GroupID, &s.FlowID, &s.Version, &s.Count}, s.AIVerdicts.targets()...), func() error {
		src := s
		src.FlowName = names[s.FlowID]
		src.Current = group != nil && flow != nil && s.GroupID == *group && s.FlowID == flow.FlowID && s.Version == flow.Version
		sources = append(sources, src)
		return nil
	})
	return sources, err
}

// loadUserDaily reads the user's user_daily rows, this node's pending
// counts included.
func (p *Plugin) loadUserDaily(ctx context.Context, db *pgxpool.Pool, d *UserDetail, now time.Time) error {
	p.flushStats(ctx)
	rows, err := db.Query(ctx, `SELECT day, group_id, audited, suspicious, high, errors, last_hit_at FROM user_daily
		WHERE user_id = $1 AND day >= $2 ORDER BY day`, d.UserID, now.Add(-recentDays*24*time.Hour).Truncate(24*time.Hour))
	if err != nil {
		return err
	}
	d.Daily, err = pgx.CollectRows(rows, func(r pgx.CollectableRow) (UserDay, error) {
		var u UserDay
		var day time.Time
		err := r.Scan(&day, &u.GroupID, &u.Audited, &u.Suspicious, &u.High, &u.Errors, &u.LastHitAt)
		u.Day, u.LastHitAt = day.Format(time.DateOnly), utcPtr(u.LastHitAt)
		return u, err
	})
	if d.Daily == nil {
		d.Daily = []UserDay{}
	}
	return err
}

func loadLatestAnalysis(ctx context.Context, db *pgxpool.Pool, d *UserDetail, _ time.Time) error {
	var v AnalysisView
	err := db.QueryRow(ctx, `SELECT `+analysisColumns+` FROM user_analyses WHERE user_id = $1 ORDER BY id DESC LIMIT 1`, d.UserID).Scan(v.targets()...)
	if errors.Is(err, pgx.ErrNoRows) {
		return nil
	}
	if err != nil {
		return err
	}
	v.normalize()
	d.LatestAnalysis = &v
	return nil
}
