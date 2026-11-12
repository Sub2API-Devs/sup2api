package moderation

import (
	"context"
	"maps"
	"slices"
	"time"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

// Locked entries (CONTRACTS §72.8, 0.10.0): the users of allowlist_user_ids
// and blocklist_user_ids are mirrored into the watch list as locked entries
// - blocklist at enforce, allowlist at observe, no expiry, source manual (the
// CHECK of watchlist.source has no value for them). The settings lists stay
// the source of truth: 0.9.x nodes still read them during a rolling upgrade,
// so the lists keep deciding (decideHandling) and the locked entries only
// show them in the watch list. Each node reconciles after the settings or
// the watch list changed: a listed user gets a locked entry at the list's
// level (replacing whatever entry the user had), and a locked entry whose
// user left the lists is removed (not restored to an earlier state); every
// change writes a history row (lock / unlock). Locked entries are changed
// through the lists only (writeWatch); a 0.9.x node may still change or
// remove one, and the next reconcile restores it.

// Lock kinds (Watch.Lock): the list that locks an entry.
const (
	LockAllowlist = "allowlist"
	LockBlocklist = "blocklist"
)

// lockLevels is the level of a locked entry by its list.
var lockLevels = map[string]string{LockAllowlist: LevelObserve, LockBlocklist: LevelEnforce}

// lockReasons names the list in the history; unlockReason is the reason of
// a removal.
var lockReasons = map[string]string{
	LockAllowlist: "只后台审核名单 / background-only list (allowlist_user_ids)",
	LockBlocklist: "总是先审名单 / always-check-first list (blocklist_user_ids)",
}

const unlockReason = "已移出固定名单 / removed from the background-only and always-check-first lists"

// lockKind is the list that locks uid's entry ("" = none); the blocklist
// wins.
func (c *config) lockKind(uid int64) string {
	switch {
	case c.blocklisted(uid):
		return LockBlocklist
	case c.allowlisted(uid):
		return LockAllowlist
	}
	return ""
}

// withLock names the list of a locked entry.
func (c *config) withLock(w Watch) Watch {
	if w.Locked {
		w.Lock = c.lockKind(w.UserID)
	}
	return w
}

// locksState is what the last complete reconcile saw.
type locksState struct {
	cfg   *config
	watch int64 // watch_version
}

// reconcileLocks brings the locked entries in line with the lists of c. It
// compares the watch list in memory, so it only writes what differs, and
// skips the comparison while neither the settings nor the watch list
// changed since the last complete run. Every user is changed in their own
// transaction under the user's lock after reading the row again, so nodes
// running it at the same time change each entry once.
func (p *Plugin) reconcileLocks(ctx context.Context) error {
	if !p.configured.Load() {
		return nil // the defaults have no lists: never unlock with them
	}
	c := p.cfg.Load()
	seen := locksState{cfg: c, watch: p.watchVersion.Load()}
	if last := p.locks.Load(); last != nil && *last == seen {
		return nil
	}
	var err error
	if users := lockDiff(c, *p.watch.Load()); len(users) > 0 {
		err = p.reconcileUsers(ctx, c, users)
	}
	if err == nil {
		p.locks.Store(&seen)
	}
	return err
}

// reconcileUsers reconciles the entries of users, then reloads and
// broadcasts if one changed (which changes watch_version: the next run
// compares again and finds nothing to do).
func (p *Plugin) reconcileUsers(ctx context.Context, c *config, users []int64) error {
	db, err := p.db(ctx)
	if err != nil {
		return err
	}
	now := p.now().UTC()
	changed := false
	for _, uid := range users {
		var ok bool
		if ok, err = reconcileLock(ctx, db, c, uid, now); err != nil {
			break
		}
		changed = changed || ok
	}
	if changed {
		p.watchChanged(ctx)
	}
	return err
}

// lockDiff lists the users whose entry in m differs from the lists of c:
// listed users without a live locked entry at the list's level and without
// expiry, and locked entries of users who left the lists.
func lockDiff(c *config, m map[int64]watchEntry) []int64 {
	var users []int64
	for uid := range c.block {
		users = appendLockDiff(users, c, m, uid)
	}
	for uid := range c.allow {
		if !c.block[uid] {
			users = appendLockDiff(users, c, m, uid)
		}
	}
	for uid, e := range m {
		if e.Locked && c.lockKind(uid) == "" {
			users = append(users, uid)
		}
	}
	slices.Sort(users)
	return users
}

func appendLockDiff(users []int64, c *config, m map[int64]watchEntry, uid int64) []int64 {
	e, ok := m[uid]
	if ok && e.Locked && e.Level == lockLevels[c.lockKind(uid)] && e.Expires.IsZero() {
		return users
	}
	return append(users, uid)
}

// reconcileLock locks or unlocks one user's entry; changed = it wrote.
func reconcileLock(ctx context.Context, db *pgxpool.Pool, c *config, uid int64, now time.Time) (changed bool, err error) {
	err = pgx.BeginFunc(ctx, db, func(tx pgx.Tx) error {
		changed = false
		if err := lockBlockSubject(ctx, tx, uid); err != nil {
			return err
		}
		w, found, err := loadWatch(ctx, tx, uid)
		if err != nil {
			return err
		}
		kind := c.lockKind(uid)
		level := lockLevels[kind]
		switch {
		case kind == "" && found && w.Locked:
			changed = true
			return removeEntry(ctx, tx, watchChange{uid: uid, action: "unlock", from: w.Level, reason: unlockReason})
		case kind == "" || (found && w.Locked && w.Level == level && w.ExpiresAt == nil):
			return nil
		}
		from := ""
		if found && (w.ExpiresAt == nil || now.Before(*w.ExpiresAt)) {
			from = w.Level
		}
		// A new level opens a new counting window, as a manual level change
		// does (updateWatch).
		if _, err := tx.Exec(ctx, `INSERT INTO watchlist (user_id, level, source, since_at, expires_at, violation_epoch, locked, updated_at)
			VALUES ($1, $2, 'manual', $3, NULL, $4, true, $3)
			ON CONFLICT (user_id) DO UPDATE SET level = EXCLUDED.level, source = 'manual', expires_at = NULL, locked = true,
				updated_at = EXCLUDED.updated_at,
				since_at = CASE WHEN watchlist.level = EXCLUDED.level THEN watchlist.since_at ELSE EXCLUDED.since_at END,
				violation_count = CASE WHEN watchlist.level = EXCLUDED.level THEN watchlist.violation_count ELSE 0 END,
				violation_epoch = CASE WHEN watchlist.level = EXCLUDED.level THEN watchlist.violation_epoch ELSE EXCLUDED.violation_epoch END`,
			uid, level, now, newEpoch()); err != nil {
			return err
		}
		if err := watchEvent(ctx, tx, watchChange{uid: uid, action: "lock", from: from, to: level, reason: lockReasons[kind]}); err != nil {
			return err
		}
		changed = true
		return bumpWatch(ctx, tx)
	})
	return changed && err == nil, err
}

// listsChanged reports whether the user lists differ between old and c.
func listsChanged(old, c *config) bool {
	return old == nil || !maps.Equal(old.allow, c.allow) || !maps.Equal(old.block, c.block)
}
