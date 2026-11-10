package moderation

import (
	"context"
	"fmt"
	"net/http"
	"net/http/httptest"
	"strconv"
	"strings"
	"sync"
	"testing"
	"time"

	"github.com/Sub2API-Devs/sup2api/next/sdk/pluginsdk/pluginsdktest"
)

// Timing and the user lists (DESIGN-2026-11-10 §6): the default level, the
// allowlist and the blocklist.

// listConfig compiles settings with mode and the two user lists.
func listConfig(mode string, allow, block []string) *config {
	s := DefaultSettings()
	s.Mode, s.AllowlistUserIDs, s.BlocklistUserIDs = mode, allow, block
	return compile(s)
}

// Blocklisted users are always moderated first, allowlisted users never,
// everyone else at the enforce level: the level of their live watch entry,
// or the default level without one (new-api gate.go preModerated).
func TestPreModerated(t *testing.T) {
	p := New()
	now := time.Now()
	p.now = func() time.Time { return now }
	const (
		none, observed, enforced, expired = 1, 2, 3, 4 // users by watch entry
	)
	watch := map[int64]watchEntry{
		observed: {Level: LevelObserve, Expires: now.Add(time.Hour)},
		enforced: {Level: LevelEnforce},
		expired:  {Level: LevelEnforce, Expires: now.Add(-time.Second)},
	}
	p.watch.Store(&watch)
	entries := map[int64]string{none: "no entry", observed: "observe entry", enforced: "enforce entry", expired: "expired enforce entry"}
	lists := []struct {
		name         string
		allow, block bool
	}{{"unlisted", false, false}, {"allowlisted", true, false}, {"blocklisted", false, true}, {"on both lists", true, true}}
	// want[mode][entry] for an unlisted user; the lists override it.
	want := map[string]map[int64]bool{
		ModeObserve: {none: false, observed: false, enforced: true, expired: false},
		// The entry's own level wins over the default level.
		ModeEnforce: {none: true, observed: false, enforced: true, expired: true},
	}
	for mode, byEntry := range want {
		for uid, unlisted := range byEntry {
			for _, l := range lists {
				var allow, block []string
				if l.allow {
					allow = []string{strconv.FormatInt(uid, 10)}
				}
				if l.block {
					block = []string{strconv.FormatInt(uid, 10)}
				}
				c := listConfig(mode, allow, block)
				exp := unlisted
				switch {
				case l.block: // also when allowlisted
					exp = true
				case l.allow:
					exp = false
				}
				if got := p.preModerated(c, uid); got != exp {
					t.Errorf("default %s, %s, %s: preModerated = %v, want %v", mode, entries[uid], l.name, got, exp)
				}
			}
		}
	}
	// The rows the design names.
	for _, tc := range []struct {
		name string
		c    *config
		uid  int64
		want bool
	}{
		{"default enforce + observe entry", listConfig(ModeEnforce, nil, nil), observed, false},
		{"allowlisted + enforce entry", listConfig(ModeObserve, []string{"3"}, nil), enforced, false},
		{"blocklisted + observe entry", listConfig(ModeObserve, nil, []string{"2"}), observed, true},
		{"both lists", listConfig(ModeObserve, []string{"1"}, []string{"1"}), none, true},
	} {
		if got := p.preModerated(tc.c, tc.uid); got != tc.want {
			t.Errorf("%s: preModerated = %v", tc.name, got)
		}
	}
	c := listConfig(ModeEnforce, nil, nil)
	if p.effectiveLevel(c, none) != LevelEnforce || p.effectiveLevel(c, observed) != LevelObserve || p.effectiveLevel(c, expired) != LevelEnforce ||
		p.effectiveLevel(listConfig(ModeObserve, nil, nil), expired) != LevelObserve || p.effectiveLevel(listConfig(ModeOff, nil, nil), none) != LevelObserve {
		t.Error("effectiveLevel")
	}
	both := listConfig(ModeObserve, []string{"1", "5"}, []string{"1"})
	if both.allowlisted(1) || !both.blocklisted(1) || !both.allowlisted(5) || both.blocklisted(5) || both.allowlisted(6) {
		t.Error("a user on both lists is blocklisted")
	}
}

// An allowlisted user is not exempt: a violating request passes, is
// recorded and puts the user on the watch list at the default level. Under
// default enforce that is an enforce entry, and the user is still only
// moderated after the request. The user is never banned.
func TestAllowlistIsObservedNotExempt(t *testing.T) {
	for _, mode := range []string{ModeObserve, ModeEnforce} {
		t.Run(mode, func(t *testing.T) {
			mod := newFakeMod(t)
			p, h, _ := startDB(t, nil, map[string]any{"mode": mode, "allowlist_user_ids": []string{"8"}, "ban_threshold": 2})
			setupFlow(t, h, mod.srv.URL, []int64{9}, CombineAny, []string{AuditorOpenAI})
			level := map[string]string{ModeObserve: LevelObserve, ModeEnforce: LevelEnforce}[mode]
			for i := 1; i <= 3; i++ {
				rid := fmt.Sprintf("allow-%d", i)
				if r := mustHook(t, h, hookReqAs(8, rid, fmt.Sprintf("MOD-HIT-sexual allowlisted %d", i))); denied(r) || r.GetNote() != notePrefix+"queued" {
					t.Fatalf("request %d of the allowlisted user = %+v", i, r)
				}
				ev := waitEvents(t, h, map[string]string{"request_id": rid, "result": "hit"}, 1)
				if ev[0].Timing != TimingPost {
					t.Fatalf("record %d = %+v", i, ev[0].Event)
				}
				// The entry is live in the hook before the next request.
				waitFor(t, "watch entry in the hook", func() bool { return p.watchLevel(8) == level })
			}
			var w []WatchItem
			waitFor(t, "three hits on the entry", func() bool {
				w = decodeData[[]WatchItem](t, h.Do("GET", "/watchlist", map[string]string{"user_id": "8"}, nil))
				return len(w) == 1 && w[0].HitCount == 3
			})
			if w[0].Level != level || w[0].Source != "auto" || !w[0].Allowlisted || w[0].Blocklisted || w[0].ViolationCount != 3 {
				t.Fatalf("watch entry = %+v", w[0])
			}
			if n := len(decodeData[[]EventListItem](t, h.Do("GET", "/events", map[string]string{"user_id": "8", "result": "block"}, nil))); n != 0 {
				t.Fatalf("%d refusals of the allowlisted user", n)
			}
			// Three violations with ban_threshold 2: no ban. An ordinary user
			// with the same history is banned.
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
			d := decodeData[UserDetail](t, h.Do("GET", "/users/8", nil, nil))
			if !d.Allowlisted || d.Blocklisted || d.Blocked || d.Watch == nil || d.Watch.Level != level {
				t.Fatalf("user state = %+v", d.UserState)
			}
			if resp := h.Do("POST", "/blocks", nil, map[string]any{"user_id": 8}); resp.GetStatus() != 400 ||
				!strings.Contains(string(resp.GetBody()), `"user_id"`) || !strings.Contains(string(resp.GetBody()), `"allowlisted"`) {
				t.Fatalf("manual ban of an allowlisted user = %d %s", resp.GetStatus(), resp.GetBody())
			}
		})
	}
}

// Under default enforce a user's first suspicious record adds the user at
// the enforce level for watch_days; later hits count violations without
// extending the expiry, and the count queues an analysis like at observe.
func TestAutoWatchUsesDefaultLevel(t *testing.T) {
	mod := newFakeMod(t)
	// The analysis channel holds its call until the test ends, so a queued
	// analysis stays queued.
	release := make(chan struct{})
	llm := httptest.NewServer(http.HandlerFunc(func(_ http.ResponseWriter, r *http.Request) {
		select {
		case <-release:
		case <-r.Context().Done():
		}
	}))
	t.Cleanup(llm.Close)
	t.Cleanup(func() { close(release) })
	var mu sync.Mutex
	now := time.Now().UTC().Truncate(time.Second)
	clock := func() time.Time {
		mu.Lock()
		defer mu.Unlock()
		return now
	}
	p, h, _ := startDB(t, nil, map[string]any{"mode": ModeEnforce, "watch_days": 10, "analysis_every_violations": 3, "analysis_channel_id": 2},
		func(p *Plugin) { p.now = clock })
	setupFlow(t, h, mod.srv.URL, []int64{9}, CombineAny, []string{AuditorOpenAI})
	decodeData[ChannelView](t, h.Do("POST", "/channels", nil, map[string]any{"type": "llm", "protocol": "anthropic", "name": "ana",
		"base_url": llm.URL, "api_key": "sk-a", "model": "m"}))
	waitFor(t, "analysis channel", p.analysisChannelUsable)
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
	if w = entry(2); w.ViolationCount != 2 || !w.ExpiresAt.Equal(expires) || w.AnalysisRequestedAt != nil {
		t.Fatalf("after the second hit = %+v", w)
	}
	// The third violation reaches analysis_every_violations: the analysis is
	// queued and the count restarts.
	if r := mustHook(t, h, hookReqAs(3, "", "MOD-HIT-sexual third")); !denied(r) {
		t.Fatalf("enforce entry: %+v", r)
	}
	if w = entry(3); w.ViolationCount != 0 || w.AnalysisRequestedAt == nil || w.AnalysisSource != AnalysisSourceAuto || !w.ExpiresAt.Equal(expires) ||
		w.Level != LevelEnforce {
		t.Fatalf("after the third hit = %+v", w)
	}
}

// Under default observe an enforce entry only counts its hits: no
// violations, no analysis.
func TestEnforceEntriesCountOnlyUnderDefaultEnforce(t *testing.T) {
	mod := newFakeMod(t)
	_, h, _ := startDB(t, nil, map[string]any{"mode": ModeObserve, "analysis_every_violations": 1})
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
	if w.ViolationCount != 0 || w.HitsSinceSeen != 2 || w.AnalysisRequestedAt != nil || w.ExpiresAt == nil ||
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

// By hand an allowlisted user can be watched at observe but not set to
// enforce (new-api: "Allowlisted users can only be observed"). A user who is
// also blocklisted is not allowlisted.
func TestAllowlistedCannotBeEnforcedByHand(t *testing.T) {
	_, h, _ := startDB(t, nil, map[string]any{"mode": ModeObserve, "allowlist_user_ids": []string{"8", "9"}, "blocklist_user_ids": []string{"9", "10"}})
	refused := func(what string, method, path string, body map[string]any) {
		t.Helper()
		resp := h.Do(method, path, nil, body)
		if resp.GetStatus() != 400 || !strings.Contains(string(resp.GetBody()), `"level"`) || !strings.Contains(string(resp.GetBody()), `"allowlisted"`) {
			t.Fatalf("%s = %d %s", what, resp.GetStatus(), resp.GetBody())
		}
	}
	refused("add at enforce", "POST", "/watchlist", map[string]any{"user_id": 8, "level": LevelEnforce})
	if n := len(decodeData[[]WatchItem](t, h.Do("GET", "/watchlist", nil, nil))); n != 0 {
		t.Fatalf("%d entries after the refused add", n)
	}
	if w := decodeData[Watch](t, h.Do("POST", "/watchlist", nil, map[string]any{"user_id": 8, "level": LevelObserve})); w.Level != LevelObserve {
		t.Fatalf("add at observe = %+v", w)
	}
	refused("set to enforce", "PATCH", "/watchlist/8", map[string]any{"level": LevelEnforce})
	if w := decodeData[Watch](t, h.Do("PATCH", "/watchlist/8", nil, map[string]any{"level": LevelObserve, "note": "kept at observe"})); w.Level != LevelObserve || w.Note != "kept at observe" {
		t.Fatalf("update at observe = %+v", w)
	}
	// The default level of a new entry is observe.
	decodeData[map[string]any](t, h.Do("DELETE", "/watchlist/8", nil, nil))
	if w := decodeData[Watch](t, h.Do("POST", "/watchlist", nil, map[string]any{"user_id": 8})); w.Level != LevelObserve {
		t.Fatalf("add without level = %+v", w)
	}
	// On both lists = blocklisted; a blocklisted user takes any level.
	for _, uid := range []int{9, 10} {
		if w := decodeData[Watch](t, h.Do("POST", "/watchlist", nil, map[string]any{"user_id": uid, "level": LevelEnforce})); w.Level != LevelEnforce {
			t.Fatalf("user %d at enforce = %+v", uid, w)
		}
		if w := decodeData[Watch](t, h.Do("PATCH", fmt.Sprintf("/watchlist/%d", uid), nil, map[string]any{"level": LevelObserve})); w.Level != LevelObserve {
			t.Fatalf("user %d at observe = %+v", uid, w)
		}
	}
	marks := map[int64][2]bool{}
	for _, it := range decodeData[[]WatchItem](t, h.Do("GET", "/watchlist", nil, nil)) {
		marks[it.UserID] = [2]bool{it.Allowlisted, it.Blocklisted}
	}
	if len(marks) != 3 || marks[8] != [2]bool{true, false} || marks[9] != [2]bool{false, true} || marks[10] != [2]bool{false, true} {
		t.Fatalf("list marks = %v", marks)
	}
	if d := decodeData[UserDetail](t, h.Do("GET", "/users/9", nil, nil)); d.Allowlisted || !d.Blocklisted {
		t.Fatalf("user state = %+v", d.UserState)
	}
	// A blocklisted user can be banned by hand.
	if resp := h.Do("POST", "/blocks", nil, map[string]any{"user_id": 10}); resp.GetStatus() != 200 {
		t.Fatalf("ban of a blocklisted user = %d %s", resp.GetStatus(), resp.GetBody())
	}
}

// The user lists override the permission switches of the AI conclusion: an
// allowlisted user is never upgraded, a blocklisted one never downgraded or
// removed (new-api applyAnalysisResult).
func TestAnalysisRespectsLists(t *testing.T) {
	s := DefaultSettings()
	s.AnalysisAllowUpgrade, s.AnalysisAllowDowngrade, s.AnalysisAllowRemove = true, true, true
	s.AllowlistUserIDs, s.BlocklistUserIDs = []string{"8", "10"}, []string{"9", "10"}
	c := compile(s)
	const plain, allowed, blocked, both = 3, 8, 9, 10
	upgrade := func(uid int64) (string, string) {
		return decideEscalation(c, uid, LevelObserve, TrendPersistent, SuggestBlock, 2)
	}
	downgrade := func(uid int64) (string, string) {
		return decideEscalation(c, uid, LevelEnforce, TrendOccasional, SuggestObserve, 0)
	}
	remove := func(uid int64) (string, string) {
		return decideEscalation(c, uid, LevelObserve, TrendOccasional, SuggestRelease, 0)
	}
	for _, tc := range []struct {
		name         string
		decide       func(int64) (string, string)
		uid          int64
		want, denied string
	}{
		{"upgrade", upgrade, plain, ActionAutoUpgrade, ""},
		{"upgrade of an allowlisted user", upgrade, allowed, ActionAutoNotAllowed, ActionAutoUpgrade},
		{"upgrade of a blocklisted user", upgrade, blocked, ActionAutoUpgrade, ""},
		{"upgrade of a user on both lists", upgrade, both, ActionAutoUpgrade, ""},
		{"downgrade", downgrade, plain, ActionAutoDowngrade, ""},
		{"downgrade of an allowlisted user", downgrade, allowed, ActionAutoDowngrade, ""},
		{"downgrade of a blocklisted user", downgrade, blocked, ActionAutoNotAllowed, ActionAutoDowngrade},
		{"downgrade of a user on both lists", downgrade, both, ActionAutoNotAllowed, ActionAutoDowngrade},
		{"removal", remove, plain, ActionAutoRemove, ""},
		{"removal of an allowlisted user", remove, allowed, ActionAutoRemove, ""},
		{"removal of a blocklisted user", remove, blocked, ActionAutoNotAllowed, ActionAutoRemove},
		{"removal of a user on both lists", remove, both, ActionAutoNotAllowed, ActionAutoRemove},
	} {
		if got, denied := tc.decide(tc.uid); got != tc.want || denied != tc.denied {
			t.Errorf("%s: %q (denied %q), want %q (denied %q)", tc.name, got, denied, tc.want, tc.denied)
		}
	}
	// Off the lists the switches decide, as before.
	c.AnalysisAllowUpgrade, c.AnalysisAllowDowngrade, c.AnalysisAllowRemove = false, false, false
	for name, decide := range map[string]func(int64) (string, string){ActionAutoUpgrade: upgrade, ActionAutoDowngrade: downgrade, ActionAutoRemove: remove} {
		if got, denied := decide(plain); got != ActionAutoNotAllowed || denied != name {
			t.Errorf("%s with its switch off: %q (denied %q)", name, got, denied)
		}
	}
	// A conclusion that changes nothing is not turned into a refusal.
	if got, denied := decideEscalation(c, blocked, LevelObserve, TrendOccasional, SuggestObserve, 0); got != "" || denied != "" {
		t.Errorf("no action: %q %q", got, denied)
	}
}

// Beyond max_inflight_mb the hook answers at once: 503 for a user who is
// moderated first, a pass for everyone else.
func TestBusyUsesPreModerated(t *testing.T) {
	mod := newFakeMod(t)
	lists := map[string]any{"max_inflight_mb": 16, "allowlist_user_ids": []string{"8"}, "blocklist_user_ids": []string{"9"}}
	settings := func(mode string) map[string]any {
		m := map[string]any{"mode": mode}
		for k, v := range lists {
			m[k] = v
		}
		return m
	}
	p, h, _ := startDB(t, nil, settings(ModeEnforce))
	b := &flowBuilder{t: t, h: h, base: mod.srv.URL}
	b.publish(Spec{Stages: []Stage{stageOf(false, b.auditor(AuditorOpenAI))}}, 9)
	// Group 10: a flow for gpt models only (the requests are claude-opus-5).
	b.publish(Spec{ModelFilter: ModelFilter{Type: FilterOnly, Models: []string{"gpt-*"}}, Stages: []Stage{stageOf(false, b.auditor(AuditorOpenAI))}}, 10)
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
	ids := func(raw string) (allow, block, exempt string, s Settings) {
		t.Helper()
		s, err := DecodeSettings([]byte(raw))
		if err != nil {
			t.Fatal(err)
		}
		return strings.Join(s.AllowlistUserIDs, ","), strings.Join(s.BlocklistUserIDs, ","), strings.Join(s.ExemptUserIDs, ","), s
	}
	// Only the retired key: it is the allowlist. Entries are written and
	// checked as before (strings or numbers, anything else dropped).
	allow, block, exempt, s := ids(`{"exempt_user_ids":["7",8," 9 ","x","",1.5]}`)
	if allow != "7,8,9" || block != "" || exempt != "7,8,9" {
		t.Fatalf("exempt only: allow %q block %q exempt %q", allow, block, exempt)
	}
	if c := compile(s); !c.allowlisted(7) || !c.allowlisted(9) || c.allowlisted(1) || c.blocklisted(7) {
		t.Fatal("exempt users are not allowlisted")
	}
	// Both keys: the new one wins, also when it is empty.
	if allow, _, exempt, _ = ids(`{"exempt_user_ids":["7"],"allowlist_user_ids":["11","12"]}`); allow != "11,12" || exempt != "7" {
		t.Fatalf("both keys: allow %q exempt %q", allow, exempt)
	}
	if allow, _, _, s = ids(`{"exempt_user_ids":["7"],"allowlist_user_ids":[]}`); allow != "" || compile(s).allowlisted(7) {
		t.Fatalf("empty allowlist: allow %q", allow)
	}
	// A value that is no list is ignored like everywhere else.
	if allow, _, _, _ = ids(`{"exempt_user_ids":["7"],"allowlist_user_ids":null}`); allow != "7" {
		t.Fatalf("null allowlist: allow %q", allow)
	}
	if allow, block, _, _ = ids(`{"allowlist_user_ids":["3"],"blocklist_user_ids":["4",5,"y"]}`); allow != "3" || block != "4,5" {
		t.Fatalf("new keys: allow %q block %q", allow, block)
	}
	if allow, block, _, _ = ids(`{}`); allow != "" || block != "" {
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
		_, _, _, s := ids(tc.raw)
		if len(s.AllowlistUserIDs) > maxUserList || len(s.BlocklistUserIDs) > maxUserList || len(s.AllowlistUserIDs)+len(s.BlocklistUserIDs) < maxUserList ||
			strings.Join(s.truncated, ",") != tc.truncated {
			t.Fatalf("%.40s…: allow %d block %d truncated %v", tc.raw, len(s.AllowlistUserIDs), len(s.BlocklistUserIDs), s.truncated)
		}
		c := compile(s)
		if in := c.allowlisted(1000) || c.blocklisted(1000); !in || c.allowlisted(1001) || c.blocklisted(1001) {
			t.Fatalf("%.40s…: the first 1000 entries are kept", tc.raw)
		}
	}
	if _, _, _, s = ids(`{"allowlist_user_ids":["1"]}`); len(s.truncated) != 0 {
		t.Fatalf("short list reported as cut: %v", s.truncated)
	}
}

// The one-time 0.8.0 conversion: under mode = enforce the live automatic
// observe entries become enforce entries with a history row each; manual
// and AI entries, expired entries and enforce entries stay. It runs once per
// installation, on one node.
func TestParityConversionOnce(t *testing.T) {
	ctx := context.Background()
	prepare := func(t *testing.T, p *Plugin, rows string) {
		t.Helper()
		// The start already ran the conversion on the empty list.
		waitFor(t, "conversion at start", p.parityDone.Load)
		db, _ := p.db(ctx)
		if _, err := db.Exec(ctx, `INSERT INTO watchlist (user_id, level, source, expires_at, violation_count) VALUES `+rows); err != nil {
			t.Fatal(err)
		}
		if _, err := db.Exec(ctx, `UPDATE config_state SET parity_converted = false, parity_converted_at = NULL WHERE id = 1`); err != nil {
			t.Fatal(err)
		}
	}
	levels := func(t *testing.T, p *Plugin) map[int64]string {
		t.Helper()
		db, _ := p.db(ctx)
		out := map[int64]string{}
		rows, err := db.Query(ctx, `SELECT user_id, level || '/' || source || '/' || violation_count FROM watchlist`)
		if err != nil {
			t.Fatal(err)
		}
		defer rows.Close()
		for rows.Next() {
			var uid int64
			var v string
			if err := rows.Scan(&uid, &v); err != nil {
				t.Fatal(err)
			}
			out[uid] = v
		}
		return out
	}
	converted := func(t *testing.T, p *Plugin) bool {
		t.Helper()
		db, _ := p.db(ctx)
		var done bool
		if err := db.QueryRow(ctx, `SELECT parity_converted FROM config_state WHERE id = 1`).Scan(&done); err != nil {
			t.Fatal(err)
		}
		return done
	}
	const rows = `(21, 'observe', 'auto', now() + interval '5 days', 4),
		(22, 'observe', 'auto', NULL, 0),
		(23, 'observe', 'manual', now() + interval '5 days', 1),
		(24, 'observe', 'analysis', now() + interval '5 days', 2),
		(25, 'observe', 'auto', now() - interval '1 minute', 3),
		(26, 'enforce', 'auto', now() + interval '5 days', 6)`

	t.Run("mode enforce, two nodes", func(t *testing.T) {
		p, h, fh := startDB(t, nil, map[string]any{"mode": ModeEnforce})
		fh2 := pluginsdktest.NewFakeHost()
		fh2.SetDSN(fh.DSNValue, fh.SchemaValue)
		p2 := New()
		pluginsdktest.Start(t, p2, pluginsdktest.Options{Host: fh2, SDK: sdkOpts(), Config: map[string]any{"mode": ModeEnforce}})
		waitFor(t, "conversion at start of the second node", p2.parityDone.Load)
		prepare(t, p, rows)
		db, _ := p.db(ctx)
		var expires time.Time
		if err := db.QueryRow(ctx, `SELECT expires_at FROM watchlist WHERE user_id = 21`).Scan(&expires); err != nil {
			t.Fatal(err)
		}
		// Both nodes convert at the same time: the row lock lets one do it.
		p.parityDone.Store(false)
		p2.parityDone.Store(false)
		var wg sync.WaitGroup
		for _, node := range []*Plugin{p, p2, p, p2} {
			wg.Add(1)
			go func() {
				defer wg.Done()
				node.convertParityOnce(ctx)
			}()
		}
		wg.Wait()
		want := map[int64]string{21: "enforce/auto/4", 22: "enforce/auto/0", 23: "observe/manual/1", 24: "observe/analysis/2",
			25: "observe/auto/3", 26: "enforce/auto/6"}
		if got := levels(t, p); fmt.Sprint(got) != fmt.Sprint(want) {
			t.Fatalf("watch list = %v, want %v", got, want)
		}
		if !converted(t, p) || !p.parityDone.Load() || !p2.parityDone.Load() {
			t.Fatal("conversion not marked done")
		}
		// One history row for each converted entry, without an operator; the
		// expiry is untouched.
		history := func() string {
			t.Helper()
			var out []string
			rows, err := db.Query(ctx, `SELECT user_id, action, from_level, to_level, operator_id IS NULL, reason FROM watch_events ORDER BY user_id, id`)
			if err != nil {
				t.Fatal(err)
			}
			defer rows.Close()
			for rows.Next() {
				var uid int64
				var action, from, to, reason string
				var auto bool
				if err := rows.Scan(&uid, &action, &from, &to, &auto, &reason); err != nil {
					t.Fatal(err)
				}
				if reason != parityReason {
					t.Fatalf("reason = %q", reason)
				}
				out = append(out, fmt.Sprintf("%d %s %s>%s %v", uid, action, from, to, auto))
			}
			return strings.Join(out, "; ")
		}
		const wantHistory = "21 set_level observe>enforce true; 22 set_level observe>enforce true"
		if got := history(); got != wantHistory {
			t.Fatalf("history = %s", got)
		}
		var after time.Time
		if err := db.QueryRow(ctx, `SELECT expires_at FROM watchlist WHERE user_id = 21`).Scan(&after); err != nil || !after.Equal(expires) {
			t.Fatalf("expiry %v -> %v (%v)", expires, after, err)
		}
		// The hooks of both nodes see the new levels.
		for _, node := range []*Plugin{p, p2} {
			waitFor(t, "converted levels in the hook", func() bool {
				_ = node.pollVersions(ctx)
				return node.watchLevel(21) == LevelEnforce && node.watchLevel(22) == LevelEnforce && node.watchLevel(23) == LevelObserve
			})
		}
		if ev := decodeData[[]WatchEvent](t, h.Do("GET", "/watchlist/21/events", nil, nil)); len(ev) != 1 || ev[0].OperatorID != nil {
			t.Fatalf("history of user 21 = %+v", ev)
		}
		// Once the day after the conversion is over (TestParityConversionWindow)
		// it never runs again: a later automatic observe entry stays, also
		// after a restart (parityDone cleared).
		if _, err := db.Exec(ctx, `UPDATE config_state SET parity_converted_at = now() - interval '25 hours' WHERE id = 1`); err != nil {
			t.Fatal(err)
		}
		if _, err := db.Exec(ctx, `INSERT INTO watchlist (user_id, level, source, expires_at) VALUES (27, 'observe', 'auto', now() + interval '5 days')`); err != nil {
			t.Fatal(err)
		}
		p.parityDone.Store(false)
		p.convertParityOnce(ctx)
		want[27] = "observe/auto/0"
		if got := levels(t, p); fmt.Sprint(got) != fmt.Sprint(want) || history() != wantHistory || !p.parityDone.Load() {
			t.Fatalf("second run changed the list: %v; history %s", got, history())
		}
	})

	t.Run("mode observe", func(t *testing.T) {
		p, h, _ := startDB(t, nil, map[string]any{"mode": ModeObserve})
		prepare(t, p, rows)
		p.parityDone.Store(false)
		p.convertParityOnce(ctx)
		want := map[int64]string{21: "observe/auto/4", 22: "observe/auto/0", 23: "observe/manual/1", 24: "observe/analysis/2",
			25: "observe/auto/3", 26: "enforce/auto/6"}
		if got := levels(t, p); fmt.Sprint(got) != fmt.Sprint(want) {
			t.Fatalf("watch list = %v, want %v", got, want)
		}
		if !converted(t, p) || !p.parityDone.Load() {
			t.Fatal("conversion not marked done")
		}
		// The mode is only looked at once: switching to enforce later
		// converts nothing.
		if errs := h.Configure(map[string]any{"mode": ModeEnforce}, nil); len(errs) > 0 {
			t.Fatal(errs)
		}
		p.parityDone.Store(false)
		p.convertParityOnce(ctx)
		if got := levels(t, p); fmt.Sprint(got) != fmt.Sprint(want) {
			t.Fatalf("watch list after the mode change = %v, want %v", got, want)
		}
		db, _ := p.db(ctx)
		var n int
		if err := db.QueryRow(ctx, `SELECT count(*) FROM watch_events`).Scan(&n); err != nil || n != 0 {
			t.Fatalf("history rows = %d %v", n, err)
		}
	})
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
