package moderation

import (
	"encoding/json"
	"fmt"
	"net/http"
	"os"
	"path/filepath"
	"regexp"
	"slices"
	"strconv"
	"strings"
	"sync"
	"testing"
	"time"
)

// Timing and the user lists (DESIGN-2026-11-10 §6): the default level, the
// allowlist and the blocklist.

// listConfig compiles settings with mode and the two user lists.
func listConfig(mode string, allow, block []string) *config {
	s := DefaultSettings()
	s.Mode, s.AllowlistUserIDs, s.BlocklistUserIDs = mode, allow, block
	return compile(s)
}

// watchLevel is the level of uid's live watch entry in memory ("" = not
// watched).
func (p *Plugin) watchLevel(uid int64) string {
	e, _ := p.liveWatch(uid)
	return e.Level
}

// preModerated093 is the decision of 0.9.3 (hook.go preModerated and
// effectiveLevel at 2dc20f2363), the reference decideHandling keeps for
// every input without a locked entry.
func preModerated093(c *config, level string, uid int64) bool {
	switch {
	case c.blocklisted(uid):
		return true
	case c.allowlisted(uid):
		return false
	}
	if level == "" {
		level = c.defaultLevel
	}
	return level == LevelEnforce
}

// decideHandling (§72.5): blocklisted users enforce, allowlisted users
// observe, everyone else the level of their live watch entry or the default
// level without one - the decisions of 0.9.3 for every mode, entry and list,
// now with their source. A locked entry never decides by itself.
func TestDecideHandling(t *testing.T) {
	p := New()
	now := time.Now()
	p.now = func() time.Time { return now }
	const (
		none, observed, enforced, expired, lockedObs, lockedEnf = 1, 2, 3, 4, 5, 6 // users by watch entry
	)
	watch := map[int64]watchEntry{
		observed:  {Level: LevelObserve, Expires: now.Add(time.Hour)},
		enforced:  {Level: LevelEnforce},
		expired:   {Level: LevelEnforce, Expires: now.Add(-time.Second)},
		lockedObs: {Level: LevelObserve, Locked: true},
		lockedEnf: {Level: LevelEnforce, Locked: true},
	}
	p.watch.Store(&watch)
	lists := []struct {
		name         string
		allow, block bool
		source       string
	}{{"unlisted", false, false, ""}, {"allowlisted", true, false, LevelSourceAllowlist},
		{"blocklisted", false, true, LevelSourceBlocklist}, {"on both lists", true, true, LevelSourceBlocklist}}
	for _, mode := range []string{ModeOff, ModeObserve, ModeEnforce} {
		for uid := int64(none); uid <= lockedEnf; uid++ {
			for _, l := range lists {
				var allow, block []string
				if l.allow {
					allow = []string{strconv.FormatInt(uid, 10)}
				}
				if l.block {
					block = []string{strconv.FormatInt(uid, 10)}
				}
				c := listConfig(mode, allow, block)
				got := p.handlingOf(c, uid)
				name := fmt.Sprintf("mode %s, user %d, %s", mode, uid, l.name)
				wantSource := l.source
				if wantSource == "" {
					wantSource = LevelSourceDefault
					if uid == observed || uid == enforced {
						wantSource = LevelSourceWatch
					}
				}
				if got.source != wantSource {
					t.Errorf("%s: source %s, want %s", name, got.source, wantSource)
				}
				level := p.watchLevel(uid)
				if uid == lockedObs || uid == lockedEnf {
					level = "" // locked: the lists decide, as on a 0.9.3 node without the entry
				}
				if want := preModerated093(c, level, uid); got.pre() != want || (got.level == LevelEnforce) != want {
					t.Errorf("%s: %+v, 0.9.3 pre = %v", name, got, want)
				}
			}
		}
	}
	// The rows the design names.
	for _, tc := range []struct {
		name string
		c    *config
		uid  int64
		want handling
	}{
		{"default enforce + observe entry", listConfig(ModeEnforce, nil, nil), observed, handling{LevelObserve, LevelSourceWatch}},
		{"default enforce, no entry", listConfig(ModeEnforce, nil, nil), none, handling{LevelEnforce, LevelSourceDefault}},
		{"default enforce, expired entry", listConfig(ModeEnforce, nil, nil), expired, handling{LevelEnforce, LevelSourceDefault}},
		{"allowlisted + enforce entry", listConfig(ModeObserve, []string{"3"}, nil), enforced, handling{LevelObserve, LevelSourceAllowlist}},
		{"blocklisted + observe entry", listConfig(ModeObserve, nil, []string{"2"}), observed, handling{LevelEnforce, LevelSourceBlocklist}},
		{"both lists", listConfig(ModeObserve, []string{"1"}, []string{"1"}), none, handling{LevelEnforce, LevelSourceBlocklist}},
		{"locked enforce entry of a user who left the blocklist", listConfig(ModeObserve, nil, nil), lockedEnf, handling{LevelObserve, LevelSourceDefault}},
	} {
		if got := p.handlingOf(tc.c, tc.uid); got != tc.want {
			t.Errorf("%s: %+v, want %+v", tc.name, got, tc.want)
		}
	}
	both := listConfig(ModeObserve, []string{"1", "5"}, []string{"1"})
	if both.allowlisted(1) || !both.blocklisted(1) || !both.allowlisted(5) || both.blocklisted(5) || both.allowlisted(6) ||
		both.lockKind(1) != LockBlocklist || both.lockKind(5) != LockAllowlist || both.lockKind(6) != "" {
		t.Error("a user on both lists is blocklisted")
	}
}

// An allowlisted user is not exempt: a violating request passes and is
// recorded. The user is only moderated in the background, so auto_watch
// does not add the user (P8): the user's entry is the locked observe entry
// of the list (locks.go), which counts the violations. The user is never
// banned, nor watched by hand.
func TestAllowlistIsRecordedNotWatched(t *testing.T) {
	for _, mode := range []string{ModeObserve, ModeEnforce} {
		t.Run(mode, func(t *testing.T) {
			mod := newFakeMod(t)
			p, h, _ := startDB(t, nil, map[string]any{"mode": mode, "allowlist_user_ids": []string{"8"}, "ban_threshold": 2})
			setupFlow(t, h, mod.srv.URL, []int64{9}, CombineAny, []string{AuditorOpenAI})
			waitFor(t, "locked entry", func() bool { return p.watchLevel(8) == LevelObserve })
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
	_, h, _ := startDB(t, nil, map[string]any{"mode": ModeEnforce, "watch_days": 10}, func(n *node) { n.now = clock })
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
	_, h, _ := startDB(t, nil, map[string]any{"mode": ModeObserve})
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

// The entries of the user lists are locked: the watch API refuses every
// change of them (409 locked) - also of a user listed before the reconcile
// made the entry - and the list shows which list locks each. A user on both
// lists is blocklisted.
func TestLockedEntriesRefuseWatchAPI(t *testing.T) {
	p, h, _ := startDB(t, nil, map[string]any{"mode": ModeObserve, "allowlist_user_ids": []string{"8", "9"}, "blocklist_user_ids": []string{"9", "10"}})
	waitFor(t, "locked entries", func() bool {
		return p.watchLevel(8) == LevelObserve && p.watchLevel(9) == LevelEnforce && p.watchLevel(10) == LevelEnforce
	})
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
	if len(marks) != 3 || marks[8] != "true false true allowlist observe manual true" || marks[9] != "false true true blocklist enforce manual true" ||
		marks[10] != "false true true blocklist enforce manual true" {
		t.Fatalf("locked entries = %v", marks)
	}
	if resp := h.Do("GET", "/watchlist", map[string]string{"locked": "x"}, nil); resp.GetStatus() != 400 {
		t.Fatalf("bad locked filter = %d", resp.GetStatus())
	}
	if d := decodeData[UserDetail](t, h.Do("GET", "/users/9", nil, nil)); d.Allowlisted || !d.Blocklisted || d.Watch.Lock != LockBlocklist {
		t.Fatalf("user state = %+v", d.UserState)
	}
	// A user listed while the reconcile has not run yet is refused too.
	c := *p.cfg.Load()
	c.block = map[int64]bool{9: true, 10: true, 11: true}
	p.cfg.Store(&c)
	locked("add before the reconcile", "POST", "/watchlist", map[string]any{"user_id": 11})
	// A blocklisted user can be banned by hand.
	if resp := h.Do("POST", "/blocks", nil, map[string]any{"user_id": 10}); resp.GetStatus() != 200 {
		t.Fatalf("ban of a blocklisted user = %d %s", resp.GetStatus(), resp.GetBody())
	}
}

// Beyond max_inflight_mb the hook answers at once: under fail_policy =
// close_pre 503 for a user who is moderated first, a pass for everyone else.
func TestBusyUsesHandling(t *testing.T) {
	mod := newFakeMod(t)
	lists := map[string]any{"max_inflight_mb": 16, "allowlist_user_ids": []string{"8"}, "blocklist_user_ids": []string{"9"}, "fail_policy": FailClosePre}
	settings := func(mode string) map[string]any {
		m := map[string]any{"mode": mode}
		for k, v := range lists {
			m[k] = v
		}
		return m
	}
	p, h, _ := startDB(t, nil, settings(ModeEnforce))
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

// exempt_user_ids is the retired name of the allowlist: read while the
// settings have no allowlist_user_ids, ignored once they have.
func TestExemptBecomesAllowlist(t *testing.T) {
	ids := func(raw string) (allow, block string, s Settings) {
		t.Helper()
		s, err := DecodeSettings([]byte(raw))
		if err != nil {
			t.Fatal(err)
		}
		return strings.Join(s.AllowlistUserIDs, ","), strings.Join(s.BlocklistUserIDs, ","), s
	}
	// Only the retired key: it is the allowlist. Entries are written and
	// checked as before (strings or numbers, anything else dropped).
	allow, block, s := ids(`{"exempt_user_ids":["7",8," 9 ","x","",1.5]}`)
	if allow != "7,8,9" || block != "" {
		t.Fatalf("exempt only: allow %q block %q", allow, block)
	}
	if c := compile(s); !c.allowlisted(7) || !c.allowlisted(9) || c.allowlisted(1) || c.blocklisted(7) {
		t.Fatal("exempt users are not allowlisted")
	}
	// Both keys: the new one wins, also when it is empty.
	if allow, _, _ = ids(`{"exempt_user_ids":["7"],"allowlist_user_ids":["11","12"]}`); allow != "11,12" {
		t.Fatalf("both keys: allow %q", allow)
	}
	if allow, _, s = ids(`{"exempt_user_ids":["7"],"allowlist_user_ids":[]}`); allow != "" || compile(s).allowlisted(7) {
		t.Fatalf("empty allowlist: allow %q", allow)
	}
	// A value that is no list is ignored like everywhere else.
	if allow, _, _ = ids(`{"exempt_user_ids":["7"],"allowlist_user_ids":null}`); allow != "7" {
		t.Fatalf("null allowlist: allow %q", allow)
	}
	if allow, block, _ = ids(`{"allowlist_user_ids":["3"],"blocklist_user_ids":["4",5,"y"]}`); allow != "3" || block != "4,5" {
		t.Fatalf("new keys: allow %q block %q", allow, block)
	}
	if allow, block, _ = ids(`{}`); allow != "" || block != "" {
		t.Fatalf("defaults: allow %q block %q", allow, block)
	}
	// Beyond 1000 entries a list is cut (the core refuses longer ones on
	// save) and Configure is told.
	long := make([]string, 1005)
	for i := range long {
		long[i] = strconv.Quote(strconv.Itoa(i + 1))
	}
	list := "[" + strings.Join(long, ",") + "]"
	for _, tc := range []struct {
		raw       string
		truncated string
	}{
		{`{"exempt_user_ids":` + list + `}`, "allowlist_user_ids"},
		{`{"allowlist_user_ids":` + list + `}`, "allowlist_user_ids"},
		{`{"blocklist_user_ids":` + list + `}`, "blocklist_user_ids"},
		{`{"allowlist_user_ids":` + list + `,"blocklist_user_ids":` + list + `}`, "allowlist_user_ids,blocklist_user_ids"},
	} {
		_, _, s := ids(tc.raw)
		if len(s.AllowlistUserIDs) > maxUserList || len(s.BlocklistUserIDs) > maxUserList || len(s.AllowlistUserIDs)+len(s.BlocklistUserIDs) < maxUserList ||
			strings.Join(s.truncated, ",") != tc.truncated {
			t.Fatalf("%.40s…: allow %d block %d truncated %v", tc.raw, len(s.AllowlistUserIDs), len(s.BlocklistUserIDs), s.truncated)
		}
		c := compile(s)
		if in := c.allowlisted(1000) || c.blocklisted(1000); !in || c.allowlisted(1001) || c.blocklisted(1001) {
			t.Fatalf("%.40s…: the first 1000 entries are kept", tc.raw)
		}
	}
	if _, _, s = ids(`{"allowlist_user_ids":["1"]}`); len(s.truncated) != 0 {
		t.Fatalf("short list reported as cut: %v", s.truncated)
	}
}

// A simulation without a user state follows the default level; an explicit
// state decides itself.
func TestSimulateNoneFollowsDefaultLevel(t *testing.T) {
	mod := newFakeMod(t)
	_, h, _ := startDB(t, nil, map[string]any{"mode": ModeEnforce})
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

// The user id lists take ids of up to 18 digits in the form, and the decoder
// reports what it drops.
func TestUserIDListsPatternAndDrops(t *testing.T) {
	raw, err := os.ReadFile(filepath.Join("..", "..", "forms", "settings.schema.json"))
	if err != nil {
		t.Fatal(err)
	}
	var schema struct {
		Properties map[string]struct {
			Items struct {
				Pattern string `json:"pattern"`
			} `json:"items"`
		} `json:"properties"`
	}
	if err := json.Unmarshal(raw, &schema); err != nil {
		t.Fatal(err)
	}
	const long = "12345678901234567890" // 20 digits: no int64
	for _, key := range []string{"allowlist_user_ids", "blocklist_user_ids", "exempt_user_ids"} {
		pattern := schema.Properties[key].Items.Pattern
		re, err := regexp.Compile(pattern)
		if err != nil || pattern == "" {
			t.Fatalf("%s: pattern %q: %v", key, pattern, err)
		}
		if re.MatchString(long) || re.MatchString("1234567890123456789") || !re.MatchString("123456789012345678") || !re.MatchString("7") ||
			re.MatchString("") || re.MatchString("-7") {
			t.Errorf("%s: pattern %q does not take exactly 1 to 18 digits", key, pattern)
		}
	}
	// Whatever reaches the decoder all the same is dropped and counted.
	s, err := DecodeSettings([]byte(`{"allowlist_user_ids": ["8", "` + long + `", "x"], "blocklist_user_ids": ["` + long + `", "9"], "exempt_user_ids": ["` + long + `"]}`))
	if err != nil {
		t.Fatal(err)
	}
	if !slices.Equal(s.AllowlistUserIDs, []string{"8"}) || !slices.Equal(s.BlocklistUserIDs, []string{"9"}) ||
		fmt.Sprint(s.droppedIDs) != fmt.Sprint(map[string]int{"allowlist_user_ids": 2, "blocklist_user_ids": 1}) {
		t.Fatalf("lists = %v %v, dropped = %v", s.AllowlistUserIDs, s.BlocklistUserIDs, s.droppedIDs)
	}
	// The retired list counts while it is the allowlist.
	s, err = DecodeSettings([]byte(`{"exempt_user_ids": ["8", "` + long + `"]}`))
	if err != nil || !slices.Equal(s.AllowlistUserIDs, []string{"8"}) || s.droppedIDs["exempt_user_ids"] != 1 {
		t.Fatalf("retired list: %v, dropped = %v (%v)", s.AllowlistUserIDs, s.droppedIDs, err)
	}
	if s, err = DecodeSettings([]byte(`{"allowlist_user_ids": ["8"], "blocklist_user_ids": []}`)); err != nil || s.droppedIDs != nil {
		t.Fatalf("clean lists: dropped = %v (%v)", s.droppedIDs, err)
	}
}
