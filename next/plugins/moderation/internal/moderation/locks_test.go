package moderation

import (
	"context"
	"encoding/json"
	"fmt"
	"log/slog"
	"strings"
	"testing"
	"time"

	"github.com/jackc/pgx/v5"

	"github.com/Sub2API-Devs/sup2api/next/sdk/pluginsdk/pluginsdktest"
)

// lockUser puts uid on list through the API.
func lockUser(t *testing.T, h *pluginsdktest.Harness, uid int64, list string) Watch {
	t.Helper()
	return decodeData[Watch](t, h.Do("PUT", fmt.Sprintf("/watchlist/%d/lock", uid), nil, map[string]any{"list": list}))
}

// PUT /watchlist/:user_id/lock makes the user's entry, or a new one, a
// locked entry of the list (no expiry, source manual), once; DELETE removes
// a locked entry. Every change is one history row by the caller.
func TestLockAPI(t *testing.T) {
	p, h, fh := startDB(t, map[string]any{"mode": ModeObserve})
	watchVersion := func() (v int64) {
		t.Helper()
		db, err := p.db(context.Background())
		if err == nil {
			err = db.QueryRow(context.Background(), `SELECT watch_version FROM config_state WHERE id = 1`).Scan(&v)
		}
		if err != nil {
			t.Fatal(err)
		}
		return v
	}
	decodeData[Watch](t, h.Do("POST", "/watchlist", nil, map[string]any{"user_id": 5, "level": LevelObserve, "days": 3}))
	if w := lockUser(t, h, 5, LockBlocklist); !w.Locked || w.Lock != LockBlocklist || w.Level != LevelEnforce || w.ExpiresAt != nil || w.Source != "manual" {
		t.Fatalf("locked entry = %+v", w)
	}
	version := watchVersion()
	if w := lockUser(t, h, 5, LockBlocklist); w.Lock != LockBlocklist || watchVersion() != version { // already one: nothing written
		t.Fatalf("unchanged lock = %+v, watch_version %d -> %d", w, version, watchVersion())
	}
	if w := lockUser(t, h, 5, LockAllowlist); w.Lock != LockAllowlist || w.Level != LevelObserve || w.ExpiresAt != nil {
		t.Fatalf("moved to the allowlist = %+v", w)
	}
	lockUser(t, h, 7, LockBlocklist)
	evs := historyOf(t, h, 5)
	if got := actions(evs); got != "add:>observe,lock:observe>enforce,lock:enforce>observe" {
		t.Fatalf("history of 5 = %s", got)
	}
	if last := evs[2]; last.Reason != lockLists[LockAllowlist].added || last.OperatorID == nil || *last.OperatorID != 1 {
		t.Fatalf("lock row = %+v", last)
	}
	if got := actions(historyOf(t, h, 7)); got != "lock:>enforce" {
		t.Fatalf("history of 7 = %s", got)
	}
	var counts struct {
		Counts WatchCounts `json:"counts"`
	}
	if err := json.Unmarshal(h.Do("GET", "/watchlist", nil, nil).GetBody(), &counts); err != nil || counts.Counts.Locked != 2 || counts.Counts.Blocking != 1 {
		t.Fatalf("counts = %+v (%v)", counts.Counts, err)
	}

	decodeData[Watch](t, h.Do("POST", "/watchlist", nil, map[string]any{"user_id": 6}))
	fh.Authz = func(uid int64, _ string) bool { return uid == 30 }
	for _, tc := range []struct {
		method, path string
		body         any
		status       int
		code         string
	}{
		{"PUT", "/watchlist/8/lock", map[string]any{"list": "watch"}, 400, `"enum"`},
		{"PUT", "/watchlist/8/lock", nil, 400, "invalid_argument"},
		{"PUT", "/watchlist/30/lock", map[string]any{"list": LockBlocklist}, 400, `"staff"`},
		{"PUT", "/watchlist/1000/lock", map[string]any{"list": LockBlocklist}, 404, "user_not_found"},
		{"DELETE", "/watchlist/6/lock", nil, 404, "not_locked"},
		{"DELETE", "/watchlist/8/lock", nil, 404, "not_locked"},
	} {
		if resp := h.Do(tc.method, tc.path, nil, tc.body); resp.GetStatus() != int32(tc.status) || !strings.Contains(string(resp.GetBody()), tc.code) {
			t.Errorf("%s %s %v = %d %s", tc.method, tc.path, tc.body, resp.GetStatus(), resp.GetBody())
		}
	}

	if got := decodeData[map[string]any](t, h.Do("DELETE", "/watchlist/7/lock", nil, nil)); got["removed"] != true {
		t.Fatalf("unlock = %v", got)
	}
	evs = historyOf(t, h, 7)
	if actions(evs) != "lock:>enforce,unlock:enforce>" || evs[1].Reason != lockLists[LockBlocklist].removed || evs[1].OperatorID == nil {
		t.Fatalf("history of 7 = %+v", evs)
	}
	if d := decodeData[UserDetail](t, h.Do("GET", "/users/7", nil, nil)); d.Watch != nil || d.Blocklisted {
		t.Fatalf("unlocked user = %+v", d.UserState)
	}
}

// GET /watchlist marks the entries of moderators (made before the user
// became one): the console offers no lock for them.
func TestWatchListStaff(t *testing.T) {
	p, h, fh := startDB(t, map[string]any{"mode": ModeObserve})
	lockUser(t, h, 5, LockBlocklist)
	fh.Authz = func(uid int64, _ string) bool { return uid == 6 }
	ctx := context.Background()
	db, err := p.db(ctx)
	if err == nil {
		_, err = db.Exec(ctx, `INSERT INTO watchlist (user_id, level, source, since_at, violation_epoch, locked, updated_at)
			VALUES (6, 'observe', 'manual', now(), 1, true, now())`)
	}
	if err != nil {
		t.Fatal(err)
	}
	var out struct {
		Data []WatchItem `json:"data"`
	}
	if err := json.Unmarshal(h.Do("GET", "/watchlist", nil, nil).GetBody(), &out); err != nil {
		t.Fatal(err)
	}
	staff := map[int64]bool{}
	for _, it := range out.Data {
		staff[it.UserID] = it.Staff
	}
	if len(staff) != 2 || !staff[6] || staff[5] {
		t.Fatalf("staff = %v", staff)
	}
}

// The first start of 0.11.0 imports the user lists of the settings into
// locked entries, once per installation: missing or differing entries are
// fixed (the blocklist wins), each once with one history row however many
// nodes import at the same time, and locked entries of users on neither
// list are removed (unlock). Afterwards the lists of the settings are never
// read.
func TestListsImport(t *testing.T) {
	fh := newDBHost(t)
	ctx := context.Background()
	conn, err := pgx.Connect(ctx, fh.DSNValue)
	if err != nil {
		t.Fatal(err)
	}
	defer conn.Close(ctx)
	now := time.Now().UTC()
	// What 0.10.0 left, and entries changed since (the lists below).
	for _, e := range []struct {
		uid     int64
		level   string
		expires *time.Time
		locked  bool
	}{
		{5, LevelObserve, ptr(now.Add(time.Hour)), false}, // allowlisted: a plain entry
		{6, LevelEnforce, nil, true},                      // blocklisted, as it should be
		{7, LevelObserve, nil, true},                      // moved to the blocklist
		{9, LevelObserve, nil, true},                      // on neither list: unlocked
		{12, LevelEnforce, nil, true},                     // on neither list: unlocked
		{13, LevelObserve, nil, false},                    // on neither list, not locked
	} {
		if _, err := conn.Exec(ctx, `INSERT INTO `+pgx.Identifier{fh.SchemaValue, "watchlist"}.Sanitize()+`
			(user_id, level, source, since_at, expires_at, violation_epoch, locked, updated_at) VALUES ($1, $2, 'manual', $3, $4, 1, $5, $3)`,
			e.uid, e.level, now, e.expires, e.locked); err != nil {
			t.Fatal(err)
		}
	}
	settings := map[string]any{"mode": ModeObserve, "allowlist_user_ids": []string{"5", "8"}, "blocklist_user_ids": []string{"6", "7", "8"},
		"exempt_user_ids": []string{"10"}, "base_url": "https://x.example", "model": "m"}
	var logged lockedBuffer
	log := withLog(slog.New(slog.NewTextHandler(&logged, nil)))
	p1, h := startNode(t, fh, settings, log)
	p2, _ := startNode(t, fh, settings, log)
	waitFor(t, "the import of both nodes", func() bool { return p1.upgraded.Load() && p2.upgraded.Load() })
	want := map[int64]string{5: "lock:observe>observe", 6: "", 7: "lock:observe>enforce", 8: "lock:>enforce", 9: "unlock:observe>",
		10: "", 12: "unlock:enforce>", 13: ""}
	check := func(when string) {
		t.Helper()
		for uid, h1 := range want {
			if got := actions(historyOf(t, h, uid)); got != h1 {
				t.Errorf("%s: history of %d = %s, want %s", when, uid, got, h1)
			}
		}
	}
	check("import")
	for uid, lock := range map[int64]string{5: LockAllowlist, 6: LockBlocklist, 7: LockBlocklist, 8: LockBlocklist, 9: "", 10: "", 12: "", 13: ""} {
		if p1.userLock(uid) != lock {
			t.Errorf("user %d: lock %q, want %q", uid, p1.userLock(uid), lock)
		}
	}
	if evs := historyOf(t, h, 8); evs[0].Reason != lockLists[LockBlocklist].imported || evs[0].OperatorID != nil {
		t.Fatalf("import row = %+v", evs[0])
	}
	if evs := historyOf(t, h, 12); evs[0].Reason != lockLists[LockBlocklist].unlisted || evs[0].OperatorID != nil {
		t.Fatalf("unlock row = %+v", evs[0])
	}
	if _, ok := p1.liveWatch(13); !ok {
		t.Fatal("the plain entry of 13 was removed")
	}
	// Each fix is logged once, by the node that made it.
	for line, n := range map[string]int{`list import fixed a watch entry" user_id=8 list=blocklist was=none`: 1,
		`user_id=7 list=blocklist was="locked observe"`: 1, `user_id=5 list=allowlist was="observe until`: 1, "user_id=6": 0,
		`user_id=9 list=none was="locked observe"`: 1, `user_id=12 list=none was="locked enforce"`: 1, "user_id=13": 0,
		"0.1 single-model setup that was never converted": 2} {
		if got := strings.Count(logged.String(), line); got != n {
			t.Errorf("log has %q %d times, want %d:\n%s", line, got, n, logged.String())
		}
	}
	// A later start with other lists changes nothing.
	p3, _ := startNode(t, fh, map[string]any{"mode": ModeObserve, "blocklist_user_ids": []string{"9", "11"}})
	waitFor(t, "the third node", func() bool { return p3.upgraded.Load() })
	check("later start")
	if p3.userLock(11) != "" || p3.userLock(9) != "" {
		t.Fatal("the lists were read again")
	}
	// GET /status reports the flag, which the console waits for before it
	// saves the settings.
	listsImported := func() bool { return decodeData[Status](t, h.Do("GET", "/status", nil, nil)).ListsImported }
	if !listsImported() {
		t.Fatal("status: lists_imported = false after the import")
	}
	if _, err := conn.Exec(ctx, `UPDATE `+pgx.Identifier{fh.SchemaValue, "config_state"}.Sanitize()+` SET lists_imported = false`); err != nil {
		t.Fatal(err)
	}
	if listsImported() {
		t.Fatal("status: lists_imported = true before the import")
	}
}

func ptr[T any](v T) *T { return &v }
