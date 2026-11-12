package moderation

import (
	"context"
	"encoding/json"
	"fmt"
	"strings"
	"testing"
	"time"

	pluginv1 "github.com/Sub2API-Devs/sup2api/next/sdk/gen/pluginv1"
)

// The user lists are mirrored into the watch list as locked entries
// (locks.go): existing entries are taken over, a second node changes
// nothing again, what a 0.9.3 node changes is restored, users who move
// between the lists or leave them are relocked or removed - each change
// with one history row. The nodes reconcile only when kicked (a settings
// change, or by the test), as the core configures every node.
func TestReconcileLocks(t *testing.T) {
	p, h, fh := startDB(t, nil, map[string]any{"mode": ModeObserve}, noRefreshTicks)
	ctx := context.Background()
	decodeData[Watch](t, h.Do("POST", "/watchlist", nil, map[string]any{"user_id": 5, "level": LevelObserve}))
	decodeData[Watch](t, h.Do("POST", "/watchlist", nil, map[string]any{"user_id": 6, "level": LevelEnforce, "days": 3}))
	settings := map[string]any{"mode": ModeObserve, "allowlist_user_ids": []string{"5"}, "blocklist_user_ids": []string{"6", "7"}}
	if errs := h.Configure(settings, nil); len(errs) > 0 {
		t.Fatal(errs)
	}
	history := func(uid int64) string {
		t.Helper()
		evs := decodeData[[]WatchEvent](t, h.Do("GET", fmt.Sprintf("/watchlist/%d/events", uid), nil, nil))
		out := make([]string, len(evs))
		for i, ev := range evs { // newest first
			out[len(evs)-1-i] = ev.Action + ":" + ev.FromLevel + ">" + ev.ToLevel
		}
		return strings.Join(out, ",")
	}
	lockedAt := func(uid int64, level string) bool {
		e, ok := p.liveWatch(uid)
		return ok && e.Locked && e.Level == level && e.Expires.IsZero()
	}
	waitFor(t, "locked entries", func() bool {
		return lockedAt(5, LevelObserve) && lockedAt(6, LevelEnforce) && lockedAt(7, LevelEnforce)
	})
	want := map[int64]string{5: "add:>observe,lock:observe>observe", 6: "add:>enforce,lock:enforce>enforce", 7: "lock:>enforce"}
	check := func(when string) {
		t.Helper()
		for uid, h := range want {
			if got := history(uid); got != h {
				t.Fatalf("%s: history of %d = %s, want %s", when, uid, got, h)
			}
		}
	}
	check("first reconcile")
	if w := decodeData[UserDetail](t, h.Do("GET", "/users/7", nil, nil)).Watch; w.Source != "manual" || w.ExpiresAt != nil || w.Lock != LockBlocklist {
		t.Fatalf("new locked entry = %+v", w)
	}
	evs := decodeData[[]WatchEvent](t, h.Do("GET", "/watchlist/7/events", nil, nil))
	if evs[0].Reason != lockReasons[LockBlocklist] || evs[0].OperatorID != nil {
		t.Fatalf("lock row = %+v", evs[0])
	}
	// A second node on the same database finds nothing to change.
	p2, h2 := startNode(t, fh, settings, noRefreshTicks)
	waitFor(t, "the second node's reconcile", func() bool {
		s := p2.locks.Load()
		return s != nil && s.cfg == p2.cfg.Load()
	})
	if err := p.reconcileLocks(ctx); err != nil {
		t.Fatal(err)
	}
	check("second node")

	// A 0.9.3 node lowers entry 6 by hand and removes entry 7 (its
	// statements, migration_0012_test.go); the next reconcile restores both.
	db, err := p.db(ctx)
	if err != nil {
		t.Fatal(err)
	}
	now := time.Now().UTC()
	exp := now.Add(time.Hour)
	for _, q := range []struct {
		sql  string
		args []any
	}{
		{updateWatch093, []any{int64(6), LevelObserve, &exp, "", true, now, int64(1)}},
		{`DELETE FROM watchlist WHERE user_id = $1`, []any{int64(7)}},                   // watch.go:104
		{`UPDATE config_state SET watch_version = watch_version + 1 WHERE id = 1`, nil}, // snapshot.go:530
	} {
		if _, err := db.Exec(ctx, q.sql, q.args...); err != nil {
			t.Fatal(err)
		}
	}
	p.kickRefresh()
	waitFor(t, "restored entries", func() bool {
		return lockedAt(6, LevelEnforce) && lockedAt(7, LevelEnforce) && history(7) == "lock:>enforce,lock:>enforce"
	})
	want[6] += ",lock:observe>enforce"
	want[7] += ",lock:>enforce"
	check("restore")

	// 5 moves to the blocklist, 7 leaves the lists.
	settings = map[string]any{"mode": ModeObserve, "blocklist_user_ids": []string{"5", "6"}}
	for _, node := range []interface {
		Configure(any, []*pluginv1.Grant) []*pluginv1.FieldError
	}{h, h2} {
		if errs := node.Configure(settings, nil); len(errs) > 0 {
			t.Fatal(errs)
		}
	}
	waitFor(t, "relocked and unlocked", func() bool {
		_, watched := p.liveWatch(7)
		return lockedAt(5, LevelEnforce) && !watched
	})
	want[5] += ",lock:observe>enforce"
	want[7] += ",unlock:enforce>"
	check("lists changed")
	waitFor(t, "the second node's reconcile", func() bool { return p2.locks.Load().cfg == p2.cfg.Load() })
	check("both nodes reconciled")
	var counts struct {
		Counts WatchCounts `json:"counts"`
	}
	if err := json.Unmarshal(h.Do("GET", "/watchlist", nil, nil).GetBody(), &counts); err != nil || counts.Counts.Locked != 2 || counts.Counts.Blocking != 2 {
		t.Fatalf("counts = %+v (%v)", counts.Counts, err)
	}
}
