package moderation

import (
	"fmt"
	"net/http"
	"slices"
	"strings"
	"sync"
	"testing"
	"time"
)

// Timing and the user lists (DESIGN-2026-11-10 §6): the default level and
// the locked entries of the allowlist and the blocklist.

// watchLevel is the level of uid's live watch entry in memory ("" = not
// watched).
func (p *Plugin) watchLevel(uid int64) string {
	e, _ := p.liveWatch(uid)
	return e.Level
}

// handling010 is the decision of 0.10.0 (hook.go decideHandling at
// 48339b0668), when the settings lists decided and a locked entry only
// mirrored them: blocklisted users enforce, allowlisted users observe,
// everyone else the level of their unlocked live entry ("" = none), or the
// default level.
func handling010(defaultLevel string, allow, block bool, level string) handling {
	switch {
	case block:
		return handling{LevelEnforce, LevelSourceBlocklist}
	case allow:
		return handling{LevelObserve, LevelSourceAllowlist}
	case level != "":
		return handling{level, LevelSourceWatch}
	}
	return handling{defaultLevel, LevelSourceDefault}
}

// decideHandling (§72.5) decides from the watch entry alone: a locked entry
// at its list's level, an unlocked live one at its own, the default level
// without one - for every mode and entry the decision of 0.10.0 with the
// lists that the locked entries stand for.
func TestDecideHandling(t *testing.T) {
	p := New()
	now := time.Now()
	p.now = func() time.Time { return now }
	const (
		none, observed, enforced, expired, allowlisted, blocklisted = 1, 2, 3, 4, 5, 6 // users by watch entry
	)
	watch := map[int64]watchEntry{
		observed:    {Level: LevelObserve, Expires: now.Add(time.Hour)},
		enforced:    {Level: LevelEnforce},
		expired:     {Level: LevelEnforce, Expires: now.Add(-time.Second)},
		allowlisted: {Level: LevelObserve, Locked: true},
		blocklisted: {Level: LevelEnforce, Locked: true},
	}
	p.watch.Store(&watch)
	for _, mode := range []string{ModeOff, ModeObserve, ModeEnforce} {
		s := DefaultSettings()
		s.Mode = mode
		c := compile(s)
		for uid := int64(none); uid <= blocklisted; uid++ {
			level := p.watchLevel(uid)
			if uid == allowlisted || uid == blocklisted {
				level = "" // 0.10.0 ignored the locked entry
			}
			want := handling010(c.defaultLevel, uid == allowlisted, uid == blocklisted, level)
			if got := p.handlingOf(c, uid); got != want {
				t.Errorf("mode %s, user %d: %+v, 0.10.0 %+v", mode, uid, got, want)
			}
		}
	}
	if p.userLock(allowlisted) != LockAllowlist || p.userLock(blocklisted) != LockBlocklist || p.userLock(enforced) != "" || p.userLock(none) != "" {
		t.Error("the list of a locked entry is its level")
	}
}

// An allowlisted user is not exempt: a violating request passes and is
// recorded. The user is only moderated in the background, so auto_watch
// does not add the user (P8): the user's entry is the locked observe entry
// (locks.go), which counts the violations. The user is never
// banned, nor watched by hand.
func TestAllowlistIsRecordedNotWatched(t *testing.T) {
	for _, mode := range []string{ModeObserve, ModeEnforce} {
		t.Run(mode, func(t *testing.T) {
			mod := newFakeMod(t)
			p, h, _ := startDB(t, map[string]any{"mode": mode, "ban_threshold": 2})
			setupFlow(t, h, mod.srv.URL, []int64{9}, CombineAny, []string{AuditorOpenAI})
			lockUser(t, h, 8, LockAllowlist)
			for i := 1; i <= 3; i++ {
				rid := fmt.Sprintf("allow-%d", i)
				if r := mustHook(t, h, hookReqAs(8, rid, fmt.Sprintf("MOD-HIT-sexual allowlisted %d", i))); denied(r) || r.GetNote() != queuedNote {
					t.Fatalf("request %d of the allowlisted user = %+v", i, r)
				}
				ev := waitEvents(t, h, map[string]string{"request_id": rid, "result": "hit"}, 1)
				if ev[0].Timing != TimingPost {
					t.Fatalf("record %d = %+v", i, ev[0].Event)
				}
			}
			if n := len(decodeData[[]EventListItem](t, h.Do("GET", "/events", map[string]string{"user_id": "8", "result": "block"}, nil))); n != 0 {
				t.Fatalf("%d refusals of the allowlisted user", n)
			}
			// Three violations with ban_threshold 2: no ban. An ordinary user
			// with the same history is banned and watched; the records are
			// handled in order, so the allowlisted user's are done by then.
			for i := 1; i <= 2; i++ {
				mustHook(t, h, hookReqAs(3, "", fmt.Sprintf("MOD-HIT-sexual ordinary %d", i)))
			}
			waitFor(t, "ban of the ordinary user", func() bool { return p.isBlocked(3) })
			if p.isBlocked(8) {
				t.Fatal("allowlisted user banned")
			}
			if b := decodeData[[]Block](t, h.Do("GET", "/blocks", nil, nil)); len(b) != 1 || b[0].UserID != 3 {
				t.Fatalf("blocks = %+v", b)
			}
			w := decodeData[[]WatchItem](t, h.Do("GET", "/watchlist", map[string]string{"locked": "false"}, nil))
			if len(w) != 1 || w[0].UserID != 3 || w[0].Source != "auto" {
				t.Fatalf("watch list = %+v", w)
			}
			waitFor(t, "hits on the locked entry", func() bool {
				w := decodeData[UserDetail](t, h.Do("GET", "/users/8", nil, nil)).Watch
				return w != nil && w.HitCount == 3
			})
			d := decodeData[UserDetail](t, h.Do("GET", "/users/8", nil, nil))
			if !d.Allowlisted || d.Blocklisted || d.Blocked || !d.Watch.Locked || d.Watch.Lock != LockAllowlist ||
				d.Watch.Level != LevelObserve || d.Watch.ExpiresAt != nil || d.Watch.ViolationCount != 3 {
				t.Fatalf("user state = %+v, entry %+v", d.UserState, d.Watch)
			}
			if resp := h.Do("POST", "/blocks", nil, map[string]any{"user_id": 8}); resp.GetStatus() != 400 ||
				!strings.Contains(string(resp.GetBody()), `"user_id"`) || !strings.Contains(string(resp.GetBody()), `"allowlisted"`) {
				t.Fatalf("manual ban of an allowlisted user = %d %s", resp.GetStatus(), resp.GetBody())
			}
			if resp := h.Do("POST", "/watchlist", nil, map[string]any{"user_id": 8, "level": LevelObserve}); resp.GetStatus() != 409 ||
				!strings.Contains(string(resp.GetBody()), `"locked"`) {
				t.Fatalf("watching an allowlisted user by hand = %d %s", resp.GetStatus(), resp.GetBody())
			}
		})
	}
}

// Under default enforce a user's first suspicious record adds the user at
// the enforce level for watch_days; later hits count violations without
// extending the expiry.
func TestAutoWatchUsesDefaultLevel(t *testing.T) {
	mod := newFakeMod(t)
	var mu sync.Mutex
	now := time.Now().UTC().Truncate(time.Second)
	clock := func() time.Time {
		mu.Lock()
		defer mu.Unlock()
		return now
	}
	_, h, _ := startDB(t, map[string]any{"mode": ModeEnforce, "watch_days": 10}, func(n *node) { n.now = clock })
	setupFlow(t, h, mod.srv.URL, []int64{9}, CombineAny, []string{AuditorOpenAI})
	entry := func(hits int) Watch {
		t.Helper()
		var w *Watch
		waitFor(t, fmt.Sprintf("%d hits", hits), func() bool {
			w = decodeData[UserDetail](t, h.Do("GET", "/users/3", nil, nil)).Watch
			return w != nil && w.HitCount == hits
		})
		return *w
	}
	if r := mustHook(t, h, hookReqAs(3, "", "MOD-HIT-sexual first")); !denied(r) {
		t.Fatalf("default enforce, no entry: %+v", r)
	}
	w := entry(1)
	expires := now.Add(10 * 24 * time.Hour)
	if w.Level != LevelEnforce || w.Source != "auto" || w.ExpiresAt == nil || !w.ExpiresAt.Equal(expires) || w.ViolationCount != 1 {
		t.Fatalf("automatic entry = %+v (expires %v, want %v)", w, w.ExpiresAt, expires)
	}
	if evs := decodeData[[]WatchEvent](t, h.Do("GET", "/watchlist/3/events", nil, nil)); len(evs) != 1 || evs[0].Action != "auto_add" || evs[0].ToLevel != LevelEnforce {
		t.Fatalf("history = %+v", evs)
	}
	// A day later: the violation counts, the expiry stays (an observe entry
	// would move to now + watch_days).
	mu.Lock()
	now = now.Add(24 * time.Hour)
	mu.Unlock()
	if r := mustHook(t, h, hookReqAs(3, "", "MOD-HIT-sexual second")); !denied(r) {
		t.Fatalf("enforce entry: %+v", r)
	}
	if w = entry(2); w.ViolationCount != 2 || !w.ExpiresAt.Equal(expires) || w.Level != LevelEnforce {
		t.Fatalf("after the second hit = %+v", w)
	}
}

// Under default observe an enforce entry only counts its hits, not
// violations.
func TestEnforceEntriesCountOnlyUnderDefaultEnforce(t *testing.T) {
	mod := newFakeMod(t)
	_, h, _ := startDB(t, map[string]any{"mode": ModeObserve})
	setupFlow(t, h, mod.srv.URL, []int64{9}, CombineAny, []string{AuditorOpenAI})
	added := decodeData[Watch](t, h.Do("POST", "/watchlist", nil, map[string]any{"user_id": 4, "level": LevelEnforce, "days": 5}))
	for i := 1; i <= 2; i++ {
		if r := mustHook(t, h, hookReqAs(4, "", fmt.Sprintf("MOD-HIT-sexual %d", i))); !denied(r) {
			t.Fatalf("enforce entry not refused: %+v", r)
		}
	}
	var w *Watch
	waitFor(t, "two hits", func() bool {
		w = decodeData[UserDetail](t, h.Do("GET", "/users/4", nil, nil)).Watch
		return w != nil && w.HitCount == 2
	})
	if w.ViolationCount != 0 || w.HitsSinceSeen != 2 || w.ExpiresAt == nil ||
		w.ExpiresAt.Sub(*added.ExpiresAt).Abs() > time.Millisecond {
		t.Fatalf("enforce entry under default observe = %+v", w)
	}
	evs := waitEvents(t, h, map[string]string{"user_id": "4", "result": "block"}, 2)
	for _, e := range evs {
		if e.Counted {
			t.Fatalf("record counted as a violation: %+v", e.Event)
		}
	}
}

// A locked entry refuses every change through the watch routes (409
// locked), and the list shows which list locks each.
func TestLockedEntriesRefuseWatchAPI(t *testing.T) {
	_, h, _ := startDB(t, map[string]any{"mode": ModeObserve})
	lockUser(t, h, 8, LockAllowlist)
	lockUser(t, h, 9, LockBlocklist)
	locked := func(what string, method, path string, body map[string]any) {
		t.Helper()
		resp := h.Do(method, path, nil, body)
		if resp.GetStatus() != 409 || !strings.Contains(string(resp.GetBody()), `"locked"`) {
			t.Fatalf("%s = %d %s", what, resp.GetStatus(), resp.GetBody())
		}
	}
	for _, uid := range []int{8, 9} {
		locked("add", "POST", "/watchlist", map[string]any{"user_id": uid, "level": LevelEnforce})
		locked("set the level", "PATCH", fmt.Sprintf("/watchlist/%d", uid), map[string]any{"level": LevelObserve})
		locked("note", "PATCH", fmt.Sprintf("/watchlist/%d", uid), map[string]any{"note": "x"})
		locked("remove", "DELETE", fmt.Sprintf("/watchlist/%d", uid), nil)
	}
	marks := map[int64]string{}
	for _, it := range decodeData[[]WatchItem](t, h.Do("GET", "/watchlist", map[string]string{"locked": "true"}, nil)) {
		marks[it.UserID] = fmt.Sprintf("%v %v %v %s %s %s %v", it.Allowlisted, it.Blocklisted, it.Locked, it.Lock, it.Level, it.Source, it.ExpiresAt == nil)
	}
	if len(marks) != 2 || marks[8] != "true false true allowlist observe manual true" || marks[9] != "false true true blocklist enforce manual true" {
		t.Fatalf("locked entries = %v", marks)
	}
	if resp := h.Do("GET", "/watchlist", map[string]string{"locked": "x"}, nil); resp.GetStatus() != 400 {
		t.Fatalf("bad locked filter = %d", resp.GetStatus())
	}
	if d := decodeData[UserDetail](t, h.Do("GET", "/users/9", nil, nil)); d.Allowlisted || !d.Blocklisted || d.Watch.Lock != LockBlocklist {
		t.Fatalf("user state = %+v", d.UserState)
	}
	// A blocklisted user can be banned by hand.
	if resp := h.Do("POST", "/blocks", nil, map[string]any{"user_id": 9}); resp.GetStatus() != 200 {
		t.Fatalf("ban of a blocklisted user = %d %s", resp.GetStatus(), resp.GetBody())
	}
}

// Beyond max_inflight_mb the hook answers at once: under fail_policy =
// close_pre 503 for a user who is moderated first, a pass for everyone else.
func TestBusyUsesHandling(t *testing.T) {
	mod := newFakeMod(t)
	settings := func(mode string) map[string]any {
		return map[string]any{"mode": mode, "max_inflight_mb": 16, "fail_policy": FailClosePre}
	}
	p, h, _ := startDB(t, settings(ModeEnforce))
	lockUser(t, h, 8, LockAllowlist)
	lockUser(t, h, 9, LockBlocklist)
	channels := map[string]int64{}
	auditor := func() int64 { return newAuditor(t, h, mod.srv.URL, AuditorOpenAI, channels) }
	publishFlow(t, h, Spec{Stages: []Stage{stageOf(false, auditor())}}, 9)
	// Group 10: a flow for gpt models only (the requests are claude-opus-5).
	publishFlow(t, h, Spec{ModelFilter: ModelFilter{Type: FilterOnly, Models: []string{"gpt-*"}}, Stages: []Stage{stageOf(false, auditor())}}, 10)
	decodeData[Watch](t, h.Do("POST", "/watchlist", nil, map[string]any{"user_id": 5, "level": LevelObserve}))
	waitFor(t, "watch entry in the hook", func() bool { return p.watchLevel(5) == LevelObserve })
	p.inflightBytes.Store(17 << 20) // others in progress
	busy := func(uid int64, refused bool) {
		t.Helper()
		r := mustHook(t, h, hookReqAs(uid, "", "MOD-HIT-sexual while busy"))
		if refused && (!denied(r) || r.GetDenyCode() != DenyBusy || r.GetDenyStatus() != http.StatusServiceUnavailable) {
			t.Fatalf("%s, user %d: %+v, want 503", p.cfg.Load().Mode, uid, r)
		}
		if !refused && (denied(r) || r.GetNote() != notePrefix+"busy") {
			t.Fatalf("%s, user %d: %+v, want a pass", p.cfg.Load().Mode, uid, r)
		}
	}
	// Default enforce: ordinary and blocklisted users are refused; the
	// allowlisted user and the user at the observe level pass.
	busy(3, true)
	busy(9, true)
	busy(8, false)
	busy(5, false)
	if errs := h.Configure(settings(ModeObserve), nil); len(errs) > 0 {
		t.Fatal(errs)
	}
	// Default observe: only the blocklisted user is moderated first.
	busy(3, false)
	busy(9, true)
	busy(8, false)
	busy(5, false)
	// Requests that would not be moderated anyway are never answered busy,
	// whoever sends them: a group no flow moderates, and a model the flow's
	// filter leaves out. The same request with a model the flow moderates
	// is refused.
	if errs := h.Configure(settings(ModeEnforce), nil); len(errs) > 0 {
		t.Fatal(errs)
	}
	counted := p.stats.busy.Load()
	for _, uid := range []int64{3, 9} {
		for _, group := range []int64{10, 77} {
			in := hookReqAs(uid, "", "MOD-HIT-sexual while busy")
			in.Meta.GroupId = group
			if r := mustHook(t, h, in); denied(r) || r.GetNote() != "" {
				t.Fatalf("user %d, group %d (not moderated): %+v, want a plain pass", uid, group, r)
			}
		}
	}
	if got := p.stats.busy.Load(); got != counted {
		t.Fatalf("%d requests that are not moderated counted as busy", got-counted)
	}
	in := hookReqAs(3, "", "MOD-HIT-sexual while busy")
	in.Meta.GroupId, in.Meta.Model, in.Fields[FieldModel] = 10, "gpt-5", `"gpt-5"`
	if r := mustHook(t, h, in); !denied(r) || r.GetDenyCode() != DenyBusy {
		t.Fatalf("a model the flow moderates: %+v, want 503", r)
	}
	if p.inflightBytes.Load() != 17<<20 {
		t.Fatalf("in flight = %d after the busy answers", p.inflightBytes.Load())
	}
	p.inflightBytes.Store(0)
}

// The retired user lists are read for the one-time import only:
// exempt_user_ids while allowlist_user_ids is absent (null counts as
// absent), entries that are no user id counted.
func TestRetiredListsDecoding(t *testing.T) {
	for _, tc := range []struct {
		raw          string
		allow, block []int64
		invalid      int
	}{
		{`{"exempt_user_ids":["7",8," 9 ","x","",1.5,"0"]}`, []int64{7, 8, 9}, nil, 3},
		{`{"exempt_user_ids":["7"],"allowlist_user_ids":["11","12"]}`, []int64{11, 12}, nil, 0},
		{`{"exempt_user_ids":["7"],"allowlist_user_ids":[]}`, nil, nil, 0},
		{`{"exempt_user_ids":["7"],"allowlist_user_ids":null}`, []int64{7}, nil, 0},
		{`{"allowlist_user_ids":["3"],"blocklist_user_ids":["4",5,"y","12345678901234567890"]}`, []int64{3}, []int64{4, 5}, 2},
		{`{}`, nil, nil, 0},
	} {
		s, err := DecodeSettings([]byte(tc.raw))
		if err != nil {
			t.Fatal(err)
		}
		if !slices.Equal(s.lists.allow, tc.allow) || !slices.Equal(s.lists.block, tc.block) || s.lists.invalid != tc.invalid {
			t.Errorf("%s: %+v", tc.raw, s.lists)
		}
	}
}

// A simulation without a user state follows the default level; an explicit
// state decides itself.
func TestSimulateNoneFollowsDefaultLevel(t *testing.T) {
	mod := newFakeMod(t)
	_, h, _ := startDB(t, map[string]any{"mode": ModeEnforce})
	flow := setupFlow(t, h, mod.srv.URL, []int64{9}, CombineAny, []string{AuditorOpenAI})
	path := fmt.Sprintf("/flows/%d/simulate", flow)
	simulate := func(state string) TestResult {
		t.Helper()
		body := map[string]any{"text": "MOD-HIT-sexual", "source": "published"}
		if state != "" {
			body["user_state"] = state
		}
		return decodeData[TestResult](t, h.Do("POST", path, nil, body))
	}
	for _, tc := range []struct {
		mode, state, timing string
	}{
		{ModeEnforce, "", TimingPre}, {ModeEnforce, "none", TimingPre}, {ModeEnforce, LevelObserve, TimingPost}, {ModeEnforce, LevelEnforce, TimingPre},
		{ModeObserve, "", TimingPost}, {ModeObserve, "none", TimingPost}, {ModeObserve, LevelObserve, TimingPost}, {ModeObserve, LevelEnforce, TimingPre},
	} {
		if errs := h.Configure(map[string]any{"mode": tc.mode}, nil); len(errs) > 0 {
			t.Fatal(errs)
		}
		if got := simulate(tc.state); got.Timing != tc.timing || got.Refused != (tc.timing == TimingPre) || got.Result != ResultHit {
			t.Errorf("default %s, user_state %q: timing %s refused %v result %s", tc.mode, tc.state, got.Timing, got.Refused, got.Result)
		}
	}
	if resp := h.Do("POST", path, nil, map[string]any{"text": "x", "user_state": "blocked"}); resp.GetStatus() != 400 {
		t.Fatalf("bad user_state = %d", resp.GetStatus())
	}
}
