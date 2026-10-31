package moderation

import (
	"context"
	"encoding/json"
	"errors"
	"net/http"
	"strconv"
	"strings"
	"time"
	"unicode/utf8"

	"github.com/jackc/pgx/v5"

	pluginv1 "github.com/Sub2API-Devs/sup2api/next/sdk/gen/pluginv1"
	"github.com/Sub2API-Devs/sup2api/next/sdk/pluginsdk"
)

// Watch is one watch list entry (CONTRACTS §72.8).
type Watch struct {
	UserID         int64      `json:"user_id"`
	Level          string     `json:"level"`
	Source         string     `json:"source"`
	SinceAt        time.Time  `json:"since_at"`
	ExpiresAt      *time.Time `json:"expires_at"`
	HitCount       int        `json:"hit_count"`
	ViolationCount int        `json:"violation_count"`
	ViolationEpoch int64      `json:"-"`
	LastHitAt      *time.Time `json:"last_hit_at"`
	// HitsSinceSeen counts suspicious records since an administrator last
	// marked the entry seen (new-api hits_since_mark).
	HitsSinceSeen int       `json:"hits_since_seen"`
	Note          string    `json:"note"`
	UpdatedAt     time.Time `json:"updated_at"`
	// AI analysis (§72.13.4): queued, running, latest conclusion.
	AnalysisRequestedAt  *time.Time `json:"analysis_requested_at"`
	AnalysisSource       string     `json:"analysis_source"`
	AnalysisRunning      bool       `json:"analysis_running"`
	LatestAnalysisID     int64      `json:"latest_analysis_id"`
	LatestAnalysisStatus string     `json:"latest_analysis_status"`
	LatestTrend          string     `json:"latest_trend"`
	LatestSuggestion     string     `json:"latest_suggestion"`
	AnalyzedAt           *time.Time `json:"analyzed_at"`
	claimUntil           *time.Time
	analysisToken        int64
}

const watchColumns = `user_id, level, source, since_at, expires_at, hit_count, violation_count, violation_epoch, last_hit_at, hits_since_seen, note, updated_at,
	analysis_requested_at, analysis_source, analysis_claim_until, analysis_token, latest_analysis_id, latest_analysis_status,
	latest_trend, latest_suggestion, analyzed_at`

func scanWatch(r pgx.Row) (Watch, error) {
	var w Watch
	err := r.Scan(&w.UserID, &w.Level, &w.Source, &w.SinceAt, &w.ExpiresAt, &w.HitCount, &w.ViolationCount, &w.ViolationEpoch, &w.LastHitAt, &w.HitsSinceSeen, &w.Note, &w.UpdatedAt,
		&w.AnalysisRequestedAt, &w.AnalysisSource, &w.claimUntil, &w.analysisToken, &w.LatestAnalysisID, &w.LatestAnalysisStatus,
		&w.LatestTrend, &w.LatestSuggestion, &w.AnalyzedAt)
	w.SinceAt, w.UpdatedAt = w.SinceAt.UTC(), w.UpdatedAt.UTC()
	w.ExpiresAt, w.LastHitAt = utcPtr(w.ExpiresAt), utcPtr(w.LastHitAt)
	w.AnalysisRequestedAt, w.AnalyzedAt, w.claimUntil = utcPtr(w.AnalysisRequestedAt), utcPtr(w.AnalyzedAt), utcPtr(w.claimUntil)
	return w, err
}

// fillRunning sets AnalysisRunning from the claim.
func (w *Watch) fillRunning(now time.Time) {
	w.AnalysisRunning = w.claimUntil != nil && now.Before(*w.claimUntil)
}

func utcPtr(t *time.Time) *time.Time {
	if t == nil {
		return nil
	}
	u := t.UTC()
	return &u
}

// loadWatch reads (and locks) one entry; the caller holds the user's
// block_subjects lock.
func loadWatch(ctx context.Context, tx pgx.Tx, uid int64) (Watch, bool, error) {
	w, err := scanWatch(tx.QueryRow(ctx, `SELECT `+watchColumns+` FROM watchlist WHERE user_id = $1 FOR UPDATE`, uid))
	if errors.Is(err, pgx.ErrNoRows) {
		return Watch{}, false, nil
	}
	return w, err == nil, err
}

// watchChange is one row of the watch history: action from one level to
// another, by operator (nil = automatic), applying the suggestion of
// analysis (nil = none).
type watchChange struct {
	uid                int64
	action, from, to   string
	reason             string
	operator, analysis *int64
}

func watchEvent(ctx context.Context, tx pgx.Tx, c watchChange) error {
	_, err := tx.Exec(ctx, `INSERT INTO watch_events (user_id, action, from_level, to_level, reason, operator_id, analysis_id) VALUES ($1,$2,$3,$4,$5,$6,$7)`,
		c.uid, c.action, c.from, c.to, truncateRunes(c.reason, 500), c.operator, c.analysis)
	return err
}

// removeEntry deletes an entry and records c (c.from is the level it had).
func removeEntry(ctx context.Context, tx pgx.Tx, c watchChange) error {
	if _, err := tx.Exec(ctx, `DELETE FROM watchlist WHERE user_id = $1`, c.uid); err != nil {
		return err
	}
	if err := watchEvent(ctx, tx, c); err != nil {
		return err
	}
	return bumpWatch(ctx, tx)
}

// expireEntry removes an entry whose expiry has passed.
func expireEntry(ctx context.Context, tx pgx.Tx, w Watch) error {
	return removeEntry(ctx, tx, watchChange{uid: w.UserID, action: "expire", from: w.Level, reason: "expired"})
}

// WatchEvent is one row of the watch history.
type WatchEvent struct {
	ID         int64     `json:"id"`
	UserID     int64     `json:"user_id"`
	Action     string    `json:"action"`
	FromLevel  string    `json:"from_level"`
	ToLevel    string    `json:"to_level"`
	Reason     string    `json:"reason"`
	OperatorID *int64    `json:"operator_id"`
	AnalysisID *int64    `json:"analysis_id"`
	CreatedAt  time.Time `json:"created_at"`
}

func callerID(req *pluginv1.HTTPRequest) *int64 {
	if id := req.GetCaller().GetUserId(); id > 0 {
		return &id
	}
	return nil
}

// watchInput is the POST /watchlist and PATCH /watchlist/:user_id body.
// days 0 = no expiry; absent = keep (PATCH) or watch_days (POST);
// expires_at sets an absolute expiry instead ("" = none). reason goes to
// the history; analysis_id links the analysis whose suggestion is applied.
type watchInput struct {
	UserID     json.Number `json:"user_id"`
	Level      *string     `json:"level"`
	Days       *int        `json:"days"`
	ExpiresAt  *string     `json:"expires_at"`
	Note       *string     `json:"note"`
	Reason     *string     `json:"reason"`
	AnalysisID *int64      `json:"analysis_id"`
}

// watchValues are the parsed values of a watchInput.
type watchValues struct {
	uid        int64 // create only
	days       *int
	expires    *time.Time // expires_at (nil = none)
	hasExpires bool       // expires_at was sent
}

func (in watchInput) validate(c *config, create bool) (v watchValues, errs pluginsdk.FieldErrors) {
	v.days = in.Days
	if create {
		uid, err := strconv.ParseInt(in.UserID.String(), 10, 64)
		v.uid = uid
		if err != nil || uid <= 0 {
			errs = errs.Add("user_id", "invalid", "user_id must be a positive integer / user_id 必须是正整数")
		} else if c.exempt[uid] {
			errs = errs.Add("user_id", "exempt", "the user is exempt from moderation / 该用户在豁免名单中")
		}
	}
	if in.Level != nil && *in.Level != LevelObserve && *in.Level != LevelEnforce {
		errs = errs.Add("level", "enum", "level must be observe or enforce / level 取值为 observe、enforce")
	}
	if in.Days != nil && (*in.Days < 0 || *in.Days > 3650) {
		errs = errs.Add("days", "out_of_range", "days must be between 0 and 3650 / days 取值 0–3650")
	}
	if in.Note != nil && utf8.RuneCountInString(*in.Note) > 500 {
		errs = errs.Add("note", "too_long", "note must be at most 500 characters / 备注最多 500 字")
	}
	if in.Reason != nil && utf8.RuneCountInString(*in.Reason) > 500 {
		errs = errs.Add("reason", "too_long", "reason must be at most 500 characters / 原因最多 500 字")
	}
	if in.AnalysisID != nil && *in.AnalysisID <= 0 {
		errs = errs.Add("analysis_id", "invalid", "analysis_id must be a positive integer / analysis_id 必须是正整数")
	}
	if in.ExpiresAt != nil {
		v.hasExpires = true
		if s := strings.TrimSpace(*in.ExpiresAt); s != "" {
			t, err := time.Parse(time.RFC3339, s)
			if err != nil {
				errs = errs.Add("expires_at", "format", "expires_at must be RFC 3339 / expires_at 必须是 RFC 3339 时间")
			} else {
				t = t.UTC()
				v.expires = &t
			}
		}
	}
	return v, errs
}

// expiry applies days or expires_at; ok = one of them was given.
func (v watchValues) expiry(c *config, now time.Time) (*time.Time, bool) {
	if v.hasExpires {
		return v.expires, true
	}
	if v.days != nil {
		return expiryOf(v.days, c, now), true
	}
	return nil, false
}

// historyReason is the reason written to the history (reason, else note).
func (in watchInput) historyReason(note string) string {
	if in.Reason != nil {
		return strings.TrimSpace(*in.Reason)
	}
	return note
}

func decodeBody(req *pluginv1.HTTPRequest, v any) *pluginv1.HTTPResponse {
	dec := json.NewDecoder(strings.NewReader(string(req.GetBody())))
	dec.UseNumber()
	if err := dec.Decode(v); err != nil {
		return pluginsdk.ErrorResponse(http.StatusBadRequest, "invalid_argument", "invalid JSON body / 请求体不是合法 JSON")
	}
	return nil
}

func (p *Plugin) createWatch(ctx context.Context, req *pluginv1.HTTPRequest) (*pluginv1.HTTPResponse, error) {
	var in watchInput
	if bad := decodeBody(req, &in); bad != nil {
		return bad, nil
	}
	c := p.cfg.Load()
	v, errs := in.validate(c, true)
	if len(errs) > 0 {
		return pluginsdk.FieldErrorResponse("invalid watch entry / 名单参数无效", errs), nil
	}
	uid := v.uid
	if p.isStaff(ctx, uid) {
		return pluginsdk.FieldErrorResponse("invalid watch entry / 名单参数无效",
			pluginsdk.FieldErrors{}.Add("user_id", "staff", "moderators are not put on the watch list / 审核管理员不进入观察名单")), nil
	}
	level := LevelObserve
	if in.Level != nil {
		level = *in.Level
	}
	return p.writeWatch(ctx, req, uid, func(tx pgx.Tx, w Watch, found bool, now time.Time) (Watch, error) {
		if found {
			return w, errConflict
		}
		w = Watch{UserID: uid, Level: level, Source: "manual", SinceAt: now, UpdatedAt: now, ViolationEpoch: newEpoch()}
		// Without days or expires_at an observe entry expires after
		// watch_days and an enforce entry never (new-api addModerationWatch).
		var ok bool
		if w.ExpiresAt, ok = v.expiry(c, now); !ok && level == LevelObserve {
			w.ExpiresAt = expiryOf(nil, c, now)
		}
		if in.Note != nil {
			w.Note = strings.TrimSpace(*in.Note)
		}
		if _, err := tx.Exec(ctx, `INSERT INTO watchlist (user_id, level, source, since_at, expires_at, violation_epoch, note, updated_at)
			VALUES ($1,$2,$3,$4,$5,$6,$7,$4)`, uid, w.Level, w.Source, now, w.ExpiresAt, w.ViolationEpoch, w.Note); err != nil {
			return w, err
		}
		return w, watchEvent(ctx, tx, watchChange{uid: uid, action: "add", to: level, reason: in.historyReason(w.Note),
			operator: callerID(req), analysis: in.AnalysisID})
	})
}

// expiryOf: days nil = watch_days, 0 = none.
func expiryOf(days *int, c *config, now time.Time) *time.Time {
	d := c.WatchDays
	if days != nil {
		d = *days
	}
	if d == 0 {
		return nil
	}
	t := now.Add(time.Duration(d) * 24 * time.Hour)
	return &t
}

func (p *Plugin) updateWatch(ctx context.Context, req *pluginv1.HTTPRequest) (*pluginv1.HTTPResponse, error) {
	uid, bad := parseID(req, "user_id")
	if bad != nil {
		return bad, nil
	}
	var in watchInput
	if bad := decodeBody(req, &in); bad != nil {
		return bad, nil
	}
	c := p.cfg.Load()
	v, errs := in.validate(c, false)
	if len(errs) > 0 {
		return pluginsdk.FieldErrorResponse("invalid watch entry / 名单参数无效", errs), nil
	}
	return p.writeWatch(ctx, req, uid, func(tx pgx.Tx, w Watch, found bool, now time.Time) (Watch, error) {
		if !found {
			return w, errNotFound
		}
		from := w.Level
		if in.Level != nil {
			w.Level = *in.Level
		}
		changed := from != w.Level
		if changed {
			// A new level opens a new counting window (new-api
			// updateModerationWatch): violations, epoch, since and the new
			// hits restart; back at observe the entry expires after
			// watch_days again, at enforce never, unless days or expires_at
			// says otherwise.
			w.ViolationEpoch, w.ViolationCount, w.SinceAt = newEpoch(), 0, now
			w.Source, w.HitsSinceSeen, w.ExpiresAt = "manual", 0, nil
			if w.Level == LevelObserve {
				w.ExpiresAt = expiryOf(nil, c, now)
			}
		}
		if exp, ok := v.expiry(c, now); ok {
			w.ExpiresAt = exp
		}
		if in.Note != nil {
			w.Note = strings.TrimSpace(*in.Note)
		}
		w.UpdatedAt = now
		if _, err := tx.Exec(ctx, `UPDATE watchlist SET level = $2, expires_at = $3, note = $4, updated_at = $6,
			source = CASE WHEN $5 THEN 'manual' ELSE source END,
			since_at = CASE WHEN $5 THEN $6 ELSE since_at END,
			violation_count = CASE WHEN $5 THEN 0 ELSE violation_count END,
			violation_epoch = CASE WHEN $5 THEN $7 ELSE violation_epoch END,
			hits_since_seen = CASE WHEN $5 THEN 0 ELSE hits_since_seen END
			WHERE user_id = $1`, uid, w.Level, w.ExpiresAt, w.Note, changed, now, w.ViolationEpoch); err != nil {
			return w, err
		}
		action := "update"
		if changed {
			action = "set_level"
		} else if in.Note != nil && in.Level == nil && in.Days == nil && !v.hasExpires {
			action = "note"
		}
		return w, watchEvent(ctx, tx, watchChange{uid: uid, action: action, from: from, to: w.Level, reason: in.historyReason(w.Note),
			operator: callerID(req), analysis: in.AnalysisID})
	})
}

// deleteWatch removes an entry; the optional query reason and analysis_id
// (an applied "release" suggestion) go to the history.
func (p *Plugin) deleteWatch(ctx context.Context, req *pluginv1.HTTPRequest) (*pluginv1.HTTPResponse, error) {
	uid, bad := parseID(req, "user_id")
	if bad != nil {
		return bad, nil
	}
	var analysis *int64
	id, ok, ferr := queryID(req, "analysis_id")
	if ok && id == 0 {
		ferr = &pluginv1.FieldError{Field: "analysis_id", Code: "invalid", Message: "analysis_id must be a positive integer / analysis_id 必须是正整数"}
	}
	if ferr != nil {
		return pluginsdk.FieldErrorResponse("invalid query / 查询参数无效", pluginsdk.FieldErrors{ferr}), nil
	}
	if ok {
		analysis = &id
	}
	reason := strings.TrimSpace(pluginsdk.Query(req, "reason"))
	return p.writeWatch(ctx, req, uid, func(tx pgx.Tx, w Watch, found bool, _ time.Time) (Watch, error) {
		if !found {
			return w, errNotFound
		}
		return w, removeEntry(ctx, tx, watchChange{uid: uid, action: "remove", from: w.Level, reason: reason,
			operator: callerID(req), analysis: analysis})
	})
}

var errConflict = errors.New("conflict")

// writeWatch runs one manual watch change under the user's lock, then
// reloads and broadcasts.
func (p *Plugin) writeWatch(ctx context.Context, req *pluginv1.HTTPRequest, uid int64, fn func(pgx.Tx, Watch, bool, time.Time) (Watch, error)) (*pluginv1.HTTPResponse, error) {
	db, err := p.db(ctx)
	if err != nil {
		return pluginsdk.Unavailable(err.Error()), nil
	}
	now := p.now().UTC()
	var out Watch
	err = pgx.BeginFunc(ctx, db, func(tx pgx.Tx) error {
		if err := lockBlockSubject(ctx, tx, uid); err != nil {
			return err
		}
		w, found, err := loadWatch(ctx, tx, uid)
		if err != nil {
			return err
		}
		if found && w.ExpiresAt != nil && !now.Before(*w.ExpiresAt) {
			if err := expireEntry(ctx, tx, w); err != nil {
				return err
			}
			found = false
		}
		if out, err = fn(tx, w, found, now); err != nil {
			return err
		}
		return bumpWatch(ctx, tx)
	})
	switch {
	case errors.Is(err, errNotFound):
		return pluginsdk.ErrorResponse(http.StatusNotFound, "not_found", "user is not on the watch list / 该用户不在观察名单中"), nil
	case errors.Is(err, errConflict):
		return pluginsdk.ErrorResponse(http.StatusConflict, "already_watched", "user is already on the watch list / 该用户已在观察名单中"), nil
	case err != nil:
		return nil, err
	}
	p.watchChanged(ctx)
	if req.GetMethod() == http.MethodDelete {
		return pluginsdk.DataResponse(map[string]any{"user_id": uid, "removed": true}), nil
	}
	return pluginsdk.DataResponse(out), nil
}

func (p *Plugin) listWatchEvents(ctx context.Context, req *pluginv1.HTTPRequest) (*pluginv1.HTTPResponse, error) {
	uid, bad := parseID(req, "user_id")
	if bad != nil {
		return bad, nil
	}
	db, err := p.db(ctx)
	if err != nil {
		return pluginsdk.Unavailable(err.Error()), nil
	}
	rows, err := db.Query(ctx, `SELECT id, user_id, action, from_level, to_level, reason, operator_id, analysis_id, created_at
		FROM watch_events WHERE user_id = $1 ORDER BY id DESC LIMIT 200`, uid)
	if err != nil {
		return nil, err
	}
	list, err := pgx.CollectRows(rows, func(r pgx.CollectableRow) (WatchEvent, error) {
		var e WatchEvent
		err := r.Scan(&e.ID, &e.UserID, &e.Action, &e.FromLevel, &e.ToLevel, &e.Reason, &e.OperatorID, &e.AnalysisID, &e.CreatedAt)
		e.CreatedAt = e.CreatedAt.UTC()
		return e, err
	})
	if err != nil {
		return nil, err
	}
	if list == nil {
		list = []WatchEvent{}
	}
	return pluginsdk.DataResponse(list), nil
}
