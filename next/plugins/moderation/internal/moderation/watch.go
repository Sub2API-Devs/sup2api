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
	Note           string     `json:"note"`
	UpdatedAt      time.Time  `json:"updated_at"`
}

const watchColumns = `user_id, level, source, since_at, expires_at, hit_count, violation_count, violation_epoch, last_hit_at, note, updated_at`

func scanWatch(r pgx.Row) (Watch, error) {
	var w Watch
	err := r.Scan(&w.UserID, &w.Level, &w.Source, &w.SinceAt, &w.ExpiresAt, &w.HitCount, &w.ViolationCount, &w.ViolationEpoch, &w.LastHitAt, &w.Note, &w.UpdatedAt)
	w.SinceAt, w.UpdatedAt = w.SinceAt.UTC(), w.UpdatedAt.UTC()
	w.ExpiresAt, w.LastHitAt = utcPtr(w.ExpiresAt), utcPtr(w.LastHitAt)
	return w, err
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

func watchEvent(ctx context.Context, tx pgx.Tx, uid int64, action, from, to, reason string, operator *int64) error {
	_, err := tx.Exec(ctx, `INSERT INTO watch_events (user_id, action, from_level, to_level, reason, operator_id) VALUES ($1,$2,$3,$4,$5,$6)`,
		uid, action, from, to, truncateRunes(reason, 500), operator)
	return err
}

func removeWatch(ctx context.Context, tx pgx.Tx, w Watch, action, reason string, operator *int64) error {
	if _, err := tx.Exec(ctx, `DELETE FROM watchlist WHERE user_id = $1`, w.UserID); err != nil {
		return err
	}
	if err := watchEvent(ctx, tx, w.UserID, action, w.Level, "", reason, operator); err != nil {
		return err
	}
	return bumpWatch(ctx, tx)
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

func (p *Plugin) listWatch(ctx context.Context, req *pluginv1.HTTPRequest) (*pluginv1.HTTPResponse, error) {
	page, size, errs := pagination(req)
	conds, args := []string{"(expires_at IS NULL OR expires_at > $1)"}, []any{p.now().UTC()}
	if v := pluginsdk.Query(req, "level"); v != "" {
		if v != LevelObserve && v != LevelEnforce {
			errs = errs.Add("level", "enum", "level must be observe or enforce / level 取值为 observe、enforce")
		} else {
			args = append(args, v)
			conds = append(conds, "level = $"+strconv.Itoa(len(args)))
		}
	}
	if v := pluginsdk.Query(req, "user_id"); v != "" {
		id, err := strconv.ParseInt(v, 10, 64)
		if err != nil || id <= 0 {
			errs = errs.Add("user_id", "invalid", "user_id must be a positive integer / user_id 必须是正整数")
		} else {
			args = append(args, id)
			conds = append(conds, "user_id = $"+strconv.Itoa(len(args)))
		}
	}
	if len(errs) > 0 {
		return pluginsdk.FieldErrorResponse("invalid query / 查询参数无效", errs), nil
	}
	db, err := p.db(ctx)
	if err != nil {
		return pluginsdk.Unavailable(err.Error()), nil
	}
	where := strings.Join(conds, " AND ")
	var total int64
	if err := db.QueryRow(ctx, `SELECT count(*) FROM watchlist WHERE `+where, args...).Scan(&total); err != nil {
		return nil, err
	}
	n := len(args)
	args = append(args, size, (page-1)*size)
	rows, err := db.Query(ctx, `SELECT `+watchColumns+` FROM watchlist WHERE `+where+
		` ORDER BY level, last_hit_at DESC NULLS LAST, user_id LIMIT $`+strconv.Itoa(n+1)+` OFFSET $`+strconv.Itoa(n+2), args...)
	if err != nil {
		return nil, err
	}
	list, err := pgx.CollectRows(rows, func(r pgx.CollectableRow) (Watch, error) { return scanWatch(r) })
	if err != nil {
		return nil, err
	}
	if list == nil {
		list = []Watch{}
	}
	return pluginsdk.ListResponse(list, pluginsdk.Page{Page: page, PageSize: size, Total: total}), nil
}

// watchInput is the POST /watchlist and PATCH /watchlist/:user_id body.
// days 0 = no expiry; absent = keep (PATCH) or watch_days (POST).
type watchInput struct {
	UserID json.Number `json:"user_id"`
	Level  *string     `json:"level"`
	Days   *int        `json:"days"`
	Note   *string     `json:"note"`
}

func (in watchInput) validate(c *config, create bool) (uid int64, errs pluginsdk.FieldErrors) {
	if create {
		var err error
		uid, err = strconv.ParseInt(in.UserID.String(), 10, 64)
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
	return uid, errs
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
	uid, errs := in.validate(c, true)
	if len(errs) > 0 {
		return pluginsdk.FieldErrorResponse("invalid watch entry / 名单参数无效", errs), nil
	}
	level := LevelObserve
	if in.Level != nil {
		level = *in.Level
	}
	return p.writeWatch(ctx, req, uid, func(tx pgx.Tx, w Watch, found bool, now time.Time) (Watch, error) {
		if found {
			return w, errConflict
		}
		w = Watch{UserID: uid, Level: level, Source: "manual", SinceAt: now, ViolationEpoch: newEpoch()}
		w.ExpiresAt = expiryOf(in.Days, c, now)
		if in.Note != nil {
			w.Note = strings.TrimSpace(*in.Note)
		}
		if _, err := tx.Exec(ctx, `INSERT INTO watchlist (user_id, level, source, since_at, expires_at, violation_epoch, note, updated_at)
			VALUES ($1,$2,$3,$4,$5,$6,$7,$4)`, uid, w.Level, w.Source, now, w.ExpiresAt, w.ViolationEpoch, w.Note); err != nil {
			return w, err
		}
		return w, watchEvent(ctx, tx, uid, "add", "", level, w.Note, callerID(req))
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
	if _, errs := in.validate(c, false); len(errs) > 0 {
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
		if in.Days != nil {
			w.ExpiresAt = expiryOf(in.Days, c, now)
		}
		if in.Note != nil {
			w.Note = strings.TrimSpace(*in.Note)
		}
		if _, err := tx.Exec(ctx, `UPDATE watchlist SET level = $2, expires_at = $3, note = $4, source = CASE WHEN $5 THEN 'manual' ELSE source END, updated_at = $6
			WHERE user_id = $1`, uid, w.Level, w.ExpiresAt, w.Note, from != w.Level, now); err != nil {
			return w, err
		}
		action := "update"
		if from != w.Level {
			action = "set_level"
		} else if in.Note != nil && in.Level == nil && in.Days == nil {
			action = "note"
		}
		return w, watchEvent(ctx, tx, uid, action, from, w.Level, w.Note, callerID(req))
	})
}

func (p *Plugin) deleteWatch(ctx context.Context, req *pluginv1.HTTPRequest) (*pluginv1.HTTPResponse, error) {
	uid, bad := parseID(req, "user_id")
	if bad != nil {
		return bad, nil
	}
	return p.writeWatch(ctx, req, uid, func(tx pgx.Tx, w Watch, found bool, _ time.Time) (Watch, error) {
		if !found {
			return w, errNotFound
		}
		return w, removeWatch(ctx, tx, w, "remove", "", callerID(req))
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
			if err := removeWatch(ctx, tx, w, "expire", "expired", nil); err != nil {
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
