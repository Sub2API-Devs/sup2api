package moderation

import (
	"context"
	"fmt"
	"slices"
	"strings"
	"sync/atomic"
	"testing"
	"time"

	"github.com/Sub2API-Devs/sup2api/next/sdk/pluginsdk/pluginsdktest"
)

// Automatic escalation to enforce (escalate_violations, CONTRACTS §72.8).

func TestEscalateSettings(t *testing.T) {
	s, _ := DecodeSettings([]byte(`{}`))
	if c := compile(s); s.EscalateViolations != 0 || s.EscalateWindowSeconds != 3600 || c.escalateWindow != time.Hour {
		t.Fatalf("defaults: %d / %d", s.EscalateViolations, s.EscalateWindowSeconds)
	}
	s, _ = DecodeSettings([]byte(`{"escalate_violations":5000,"escalate_window_seconds":0}`))
	if s.EscalateViolations != 1000 || s.EscalateWindowSeconds != 1 {
		t.Fatalf("clamped: %d / %d", s.EscalateViolations, s.EscalateWindowSeconds)
	}
	for sec, want := range map[int]string{1: "1s / 1 秒", 90: "90s / 90 秒", 120: "2m / 2 分钟", 600: "10m / 10 分钟",
		3600: "1h / 1 小时", 5400: "90m / 90 分钟", 86400: "24h / 24 小时", 3661: "3661s / 3661 秒"} {
		if en, zh := windowText(sec); en+" / "+zh != want {
			t.Errorf("%d s: %s / %s, want %s", sec, en, zh, want)
		}
	}
}

// escalation is a node with a clock the test moves (ahead) and helpers to
// store violations and read a user's entry and history.
type escalation struct {
	t     *testing.T
	p     *Plugin
	h     *pluginsdktest.Harness
	fh    *pluginsdktest.FakeHost
	ahead *atomic.Int64
}

func startEscalation(t *testing.T, settings map[string]any) *escalation {
	ahead := &atomic.Int64{}
	p, h, fh := startDB(t, settings, withClock(ahead), noRefreshTicks)
	return &escalation{t: t, p: p, h: h, fh: fh, ahead: ahead}
}

func (e *escalation) configure(settings map[string]any) {
	e.t.Helper()
	if errs := e.h.Configure(settings, nil); len(errs) > 0 {
		e.t.Fatal(errs)
	}
}

// violate stores a suspicious record of uid made ago before now and
// applies it to the watch list and the bans, like the event writer.
func (e *escalation) violate(uid int64, ago time.Duration) {
	e.t.Helper()
	rec := testRec(uid, fmt.Sprintf("r-%d-%d", uid, time.Now().UnixNano()), ResultHit, "violence", "violence")
	rec.FlowID, rec.At = 1, e.p.now().UTC().Add(-ago)
	if err := e.p.storeEvents(context.Background(), []eventRec{rec}); err != nil {
		e.t.Fatal(err)
	}
}

func (e *escalation) entry(uid int64) *Watch {
	e.t.Helper()
	return decodeData[UserDetail](e.t, e.h.Do("GET", fmt.Sprintf("/users/%d", uid), nil, nil)).Watch
}

// history lists the actions of uid's watch history, oldest first.
func (e *escalation) history(uid int64) []WatchEvent {
	e.t.Helper()
	return historyOf(e.t, e.h, uid)
}

// historyOf is uid's watch history, oldest first.
func historyOf(t *testing.T, h *pluginsdktest.Harness, uid int64) []WatchEvent {
	t.Helper()
	evs := decodeData[[]WatchEvent](t, h.Do("GET", fmt.Sprintf("/watchlist/%d/events", uid), nil, nil))
	slices.Reverse(evs)
	return evs
}

func actions(evs []WatchEvent) string {
	out := make([]string, len(evs))
	for i, ev := range evs {
		out[i] = ev.Action + ":" + ev.FromLevel + ">" + ev.ToLevel
	}
	return strings.Join(out, ",")
}

// A user who is not on the list reaches N at once: one enforce entry for
// watch_days and one history row, also with auto_watch on. Violations just
// inside the window count, just outside not; an observe entry is raised.
func TestEscalateNewUserAndWindow(t *testing.T) {
	e := startEscalation(t, map[string]any{"mode": ModeObserve, "escalate_violations": 1, "escalate_window_seconds": 600, "watch_days": 10})
	now := e.p.now().UTC()
	e.violate(20, 0)
	w := e.entry(20)
	if w == nil || w.Level != LevelEnforce || w.Source != "auto" || w.ExpiresAt == nil || w.ExpiresAt.Sub(now.Add(10*24*time.Hour)).Abs() > time.Millisecond || w.HitCount != 1 {
		t.Fatalf("entry = %+v", w)
	}
	h := e.history(20)
	if actions(h) != "auto_escalate:>enforce" || h[0].Reason != "1 violations within 10m / 10 分钟内违规 1 次" || h[0].OperatorID != nil {
		t.Fatalf("history = %+v", h)
	}
	if !e.p.handlingOf(e.p.cfg.Load(), 20).pre() {
		t.Fatal("the escalated user is not moderated first")
	}

	e.configure(map[string]any{"mode": ModeObserve, "escalate_violations": 2, "escalate_window_seconds": 600, "watch_days": 10})
	// Just inside: 600 s ago and now.
	e.violate(21, 600*time.Second)
	if w := e.entry(21); w == nil || w.Level != LevelObserve {
		t.Fatalf("after one violation = %+v", w)
	}
	e.violate(21, 0)
	if w := e.entry(21); w.Level != LevelEnforce || w.Source != "auto" || w.ViolationCount != 0 {
		t.Fatalf("raised entry = %+v", w)
	}
	if h := e.history(21); actions(h) != "auto_add:>observe,auto_escalate:observe>enforce" || h[1].Reason != "2 violations within 10m / 10 分钟内违规 2 次" {
		t.Fatalf("history = %+v", h)
	}
	// Just outside: 601 s ago and now.
	e.violate(22, 601*time.Second)
	e.violate(22, 0)
	if w := e.entry(22); w.Level != LevelObserve || actions(e.history(22)) != "auto_add:>observe" {
		t.Fatalf("outside the window = %+v", w)
	}
	// The escalated entry is undone by hand like any other.
	if w := decodeData[Watch](t, e.h.Do("PATCH", "/watchlist/21", nil, map[string]any{"level": LevelObserve})); w.Level != LevelObserve || w.Source != "manual" {
		t.Fatalf("manual downgrade = %+v", w)
	}
	decodeData[map[string]any](t, e.h.Do("DELETE", "/watchlist/20", nil, nil))
	if h := e.history(20); actions(h) != "auto_escalate:>enforce,remove:enforce>" || h[1].OperatorID == nil {
		t.Fatalf("history after the removal = %+v", h)
	}
}

// Nobody is escalated with N = 0 (the default), nor the users of the lists
// (locked entries), nor moderators; the ban wins over the escalation.
func TestEscalateSkips(t *testing.T) {
	settings := map[string]any{"mode": ModeObserve, "escalate_window_seconds": 3600}
	e := startEscalation(t, settings)
	lockUser(t, e.h, 23, LockAllowlist)
	lockUser(t, e.h, 24, LockBlocklist)
	for i := 0; i < 3; i++ {
		e.violate(27, 0)
	}
	if w := e.entry(27); w == nil || w.Level != LevelObserve || actions(e.history(27)) != "auto_add:>observe" {
		t.Fatalf("N = 0: %+v", w)
	}
	settings["escalate_violations"] = 2
	e.configure(settings)
	e.fh.Authz = func(uid int64, _ string) bool { return uid == 25 }
	for _, uid := range []int64{23, 24, 25} {
		for i := 0; i < 3; i++ {
			e.violate(uid, 0)
		}
	}
	for _, uid := range []int64{23, 24} {
		if w, h := e.entry(uid), actions(e.history(uid)); !w.Locked || w.HitCount != 3 || strings.Contains(h, "escalate") {
			t.Fatalf("user %d of the lists: %+v, history %s", uid, w, h)
		}
	}
	if w := e.entry(25); w != nil {
		t.Fatalf("moderator watched: %+v", w)
	}
	// The ban threshold is reached by the same violations: banned, not
	// escalated (the entry stays at observe).
	settings["ban_threshold"] = 2
	e.configure(settings)
	e.violate(26, 0)
	e.violate(26, 0)
	if !e.p.isBlocked(26) {
		t.Fatal("not banned")
	}
	if w := e.entry(26); w.Level != LevelObserve || actions(e.history(26)) != "auto_add:>observe" {
		t.Fatalf("banned user escalated: %+v %s", w, actions(e.history(26)))
	}
}

// A manual decision restarts the count: the violations it judged do not
// escalate the user again, new ones do.
func TestEscalateAfterManualDecision(t *testing.T) {
	e := startEscalation(t, map[string]any{"mode": ModeObserve, "escalate_violations": 2, "escalate_window_seconds": 7200})
	e.violate(28, 0)
	e.violate(28, 0)
	if w := e.entry(28); w.Level != LevelEnforce {
		t.Fatalf("not escalated: %+v", w)
	}
	decodeData[Watch](t, e.h.Do("PATCH", "/watchlist/28", nil, map[string]any{"level": LevelObserve}))
	e.ahead.Add(int64(time.Hour)) // after the manual change (the database clock)
	e.violate(28, 0)
	if w := e.entry(28); w.Level != LevelObserve {
		t.Fatalf("re-escalated by the judged violations: %+v", w)
	}
	e.violate(28, 0)
	if w := e.entry(28); w.Level != LevelEnforce {
		t.Fatalf("not escalated by two new violations: %+v", w)
	}
	if h := actions(e.history(28)); h != "auto_add:>observe,auto_escalate:observe>enforce,set_level:enforce>observe,auto_escalate:observe>enforce" {
		t.Fatalf("history = %s", h)
	}
}

// An unlock is a manual decision too: violations counted while the user was
// locked do not escalate them after it.
func TestEscalateAfterUnlock(t *testing.T) {
	e := startEscalation(t, map[string]any{"mode": ModeObserve, "escalate_violations": 2, "escalate_window_seconds": 7200})
	lockUser(t, e.h, 29, LockBlocklist)
	e.violate(29, 0)
	e.violate(29, 0)
	decodeData[map[string]any](t, e.h.Do("DELETE", "/watchlist/29/lock", nil, nil))
	if w := e.entry(29); w != nil {
		t.Fatalf("unlocked entry = %+v", w)
	}
	e.ahead.Add(int64(time.Hour)) // after the unlock (the database clock)
	e.violate(29, 0)
	if w := e.entry(29); w == nil || w.Level != LevelObserve {
		t.Fatalf("escalated by the violations of the locked time: %+v", w)
	}
	e.violate(29, 0)
	if w := e.entry(29); w.Level != LevelEnforce {
		t.Fatalf("not escalated by two new violations: %+v", w)
	}
}
