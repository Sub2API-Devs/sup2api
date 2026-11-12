package moderation

import (
	"context"
	"time"

	"github.com/jackc/pgx/v5"

	pluginv1 "github.com/Sub2API-Devs/sup2api/next/sdk/gen/pluginv1"
	"github.com/Sub2API-Devs/sup2api/next/sdk/pluginsdk"
)

// Locked entries (CONTRACTS §72.8; the source of truth since 0.11.0): the
// background-only list (allowlist) and the always-check-first list
// (blocklist) are the locked entries of the watch list, and the level of a
// locked entry is its list - observe = allowlist, enforce = blocklist. A
// locked entry never expires, has source manual (the CHECK of
// watchlist.source has no value for it) and is changed only through PUT and
// DELETE /watchlist/:user_id/lock; the other watch routes answer 409 locked
// (writeWatch).

// Lock kinds (Watch.Lock): the list of a locked entry.
const (
	LockAllowlist = "allowlist"
	LockBlocklist = "blocklist"
)

// lockList is a list: the level of its entries and the history reasons.
type lockList struct {
	level                    string
	added, imported, removed string
}

var lockLists = map[string]lockList{
	LockAllowlist: {LevelObserve,
		"加入只后台审核名单 / added to the background-only list",
		"从设置导入只后台审核名单 / imported from the background-only list of the settings",
		"移出只后台审核名单 / removed from the background-only list"},
	LockBlocklist: {LevelEnforce,
		"加入总是先审名单 / added to the always-check-first list",
		"从设置导入总是先审名单 / imported from the always-check-first list of the settings",
		"移出总是先审名单 / removed from the always-check-first list"},
}

// lockOf names the list of an entry at level ("" = not locked).
func lockOf(locked bool, level string) string {
	switch {
	case !locked:
		return ""
	case level == LevelEnforce:
		return LockBlocklist
	}
	return LockAllowlist
}

// lockEntry makes w, uid's live entry (found = there is one), a locked
// entry of list, recorded as a lock with c's reason and operator. A new
// level opens a new counting window, as a level change by hand does
// (updateWatch). An entry that is one already is left alone (changed =
// false). The caller holds the user's lock and bumps watch_version.
func lockEntry(ctx context.Context, tx pgx.Tx, w Watch, found bool, list string, now time.Time, c watchChange) (Watch, bool, error) {
	if found && w.Lock == list && w.ExpiresAt == nil {
		return w, false, nil
	}
	c.action, c.from, c.to = "lock", "", lockLists[list].level
	if found {
		c.from = w.Level
	}
	w, err := scanWatch(tx.QueryRow(ctx, `INSERT INTO watchlist (user_id, level, source, since_at, expires_at, violation_epoch, locked, updated_at)
		VALUES ($1, $2, 'manual', $3, NULL, $4, true, $3)
		ON CONFLICT (user_id) DO UPDATE SET level = EXCLUDED.level, source = 'manual', expires_at = NULL, locked = true,
			updated_at = EXCLUDED.updated_at,
			since_at = CASE WHEN watchlist.level = EXCLUDED.level THEN watchlist.since_at ELSE EXCLUDED.since_at END,
			violation_count = CASE WHEN watchlist.level = EXCLUDED.level THEN watchlist.violation_count ELSE 0 END,
			violation_epoch = CASE WHEN watchlist.level = EXCLUDED.level THEN watchlist.violation_epoch ELSE EXCLUDED.violation_epoch END
		RETURNING `+watchColumns, c.uid, c.to, now, newEpoch()))
	if err != nil {
		return w, false, err
	}
	return w, true, watchEvent(ctx, tx, c)
}

// lockInput is the PUT /watchlist/:user_id/lock body.
type lockInput struct {
	List string `json:"list"`
}

// lockWatch puts a user on a list: the user's entry, or a new one, becomes
// a locked entry of the list. Moderators cannot be locked, as they cannot
// be watched.
func (p *Plugin) lockWatch(ctx context.Context, req *pluginv1.HTTPRequest) (*pluginv1.HTTPResponse, error) {
	uid, bad := parseID(req, "user_id")
	if bad != nil {
		return bad, nil
	}
	var in lockInput
	if bad := decodeBody(req, &in); bad != nil {
		return bad, nil
	}
	errs := p.staffUser(ctx, uid)
	if _, ok := lockLists[in.List]; !ok {
		errs = errs.Add("list", "enum", "list must be allowlist or blocklist / list 取值为 allowlist、blocklist")
	}
	if len(errs) > 0 {
		return pluginsdk.FieldErrorResponse("invalid lock / 锁定参数无效", errs), nil
	}
	if resp := p.missingUser(ctx, uid); resp != nil {
		return resp, nil
	}
	return p.changeWatch(ctx, req, uid, func(tx pgx.Tx, w Watch, found bool, now time.Time) (Watch, error) {
		w, _, err := lockEntry(ctx, tx, w, found, in.List, now, watchChange{uid: uid, reason: lockLists[in.List].added, operator: callerID(req)})
		return w, err
	})
}

// unlockWatch takes a user off their list: the locked entry is removed.
func (p *Plugin) unlockWatch(ctx context.Context, req *pluginv1.HTTPRequest) (*pluginv1.HTTPResponse, error) {
	uid, bad := parseID(req, "user_id")
	if bad != nil {
		return bad, nil
	}
	return p.changeWatch(ctx, req, uid, func(tx pgx.Tx, w Watch, found bool, _ time.Time) (Watch, error) {
		if !found || !w.Locked {
			return w, errNotLocked
		}
		return w, removeEntry(ctx, tx, watchChange{uid: uid, action: "unlock", from: w.Level, reason: lockLists[w.Lock].removed,
			operator: callerID(req)})
	})
}
