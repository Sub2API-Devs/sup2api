package ratelimit

import (
	"testing"
	"time"

	"github.com/alicebob/miniredis/v2"
	"github.com/redis/go-redis/v9"
)

// base starts a segment of every window used here: 3 s for 60 s, 15 s for
// 300 s (12:00:00 UTC is a multiple of both since the Unix epoch).
var base = time.Date(2026, 10, 26, 12, 0, 0, 0, time.UTC)

// newMinute is a scope of a fresh miniredis whose clock at sets.
func newMinute(t *testing.T, scope string) (*Minute, *miniredis.Miniredis, redis.UniversalClient, func(time.Duration)) {
	t.Helper()
	mr := miniredis.RunT(t)
	rdb := redis.NewClient(&redis.Options{Addr: mr.Addr()})
	t.Cleanup(func() { _ = rdb.Close() })
	at := func(d time.Duration) { mr.SetTime(base.Add(d)) }
	at(0)
	return NewMinute(rdb, scope), mr, rdb, at
}

func TestMinuteWindows(t *testing.T) {
	keys, mr, rdb, at := newMinute(t, "apikey")
	ctx := t.Context()
	accounts := NewMinute(rdb, "account")

	for range 2 {
		if ok, _, err := keys.Admit(ctx, 1, 2, 0); !ok || err != nil {
			t.Fatal(ok, err)
		}
	}
	// The third request waits for the segment of the first two to leave:
	// a whole segment after their 60 seconds.
	ok, retry, err := keys.Admit(ctx, 1, 2, 0)
	if ok || err != nil || retry != 63*time.Second {
		t.Fatal("third request in the window", ok, retry, err)
	}
	// Scopes do not share windows.
	if ok, _, _ := accounts.Admit(ctx, 1, 1, 0); !ok {
		t.Fatal("account 1 shares the window of key 1")
	}
	keys.AddTokens(ctx, 2, 50)
	if ok, _, _ := keys.Admit(ctx, 2, 0, 50); ok {
		t.Fatal("tokens over the cap admitted")
	}
	reached, err := keys.Reached(ctx, []Limits{{ID: 1, RPM: 2}, {ID: 2, TPM: 100}, {ID: 3}}, Session{})
	if err != nil || !reached[1] || reached[2] || reached[3] {
		t.Fatal(reached, err)
	}
	u, err := keys.Usage(ctx, []int64{1, 2})
	if err != nil || u[1].RPM != 2 || u[2].TPM != 50 {
		t.Fatal(u, err)
	}
	// Keys live for the window and one segment.
	if ttl := mr.TTL(Key("apikey", 1, Requests)); ttl != 63*time.Second {
		t.Fatal("ttl", ttl)
	}
	// 59 seconds later both requests still count.
	at(59 * time.Second)
	if ok, _, _ := keys.Admit(ctx, 1, 2, 0); ok {
		t.Fatal("the window still holds two requests")
	}
	at(63 * time.Second)
	if u, _ := keys.Usage(ctx, []int64{1}); u[1].RPM != 0 {
		t.Fatal("requests of a segment that left still counted", u)
	}
	if ok, _, _ := keys.Admit(ctx, 1, 2, 0); !ok {
		t.Fatal("an empty window refused")
	}
	if ok, _, err := NewMinute(nil, "apikey").Admit(ctx, 1, 1, 1); !ok || err != nil {
		t.Fatal("without Redis everything is admitted", ok, err)
	}
}

// Strict: the oldest of the 21 segments counts until it has wholly left, so
// a request counts for 60 to 63 seconds and no 60 seconds pass more than the
// cap, wherever the requests fall.
func TestStrictWindowBoundary(t *testing.T) {
	m, _, _, at := newMinute(t, "account")
	ctx := t.Context()
	at(2900 * time.Millisecond) // the end of the first segment
	if ok, _, _ := m.Admit(ctx, 1, 1, 0); !ok {
		t.Fatal("first request refused")
	}
	// 60 seconds later the segment is the oldest of the window: still counted.
	at(62900 * time.Millisecond)
	if ok, retry, _ := m.Admit(ctx, 1, 1, 0); ok || retry != time.Second {
		t.Fatal("the 21st segment no longer counts", ok, retry)
	}
	at(63 * time.Second)
	if ok, _, _ := m.Admit(ctx, 1, 1, 0); !ok {
		t.Fatal("refused once the segment left")
	}
}

// No boundary burst: a cap of one passes one request in any 60 seconds.
func TestNoBurstAcrossAMinute(t *testing.T) {
	m, _, _, at := newMinute(t, "account")
	ctx := t.Context()
	at(59900 * time.Millisecond) // segment 19, ends at 60 s
	if ok, _, _ := m.Admit(ctx, 1, 1, 0); !ok {
		t.Fatal("first request refused")
	}
	at(60100 * time.Millisecond)
	if ok, retry, _ := m.Admit(ctx, 1, 1, 0); ok || retry != time.Minute {
		t.Fatal("second request passed across the minute", ok, retry)
	}
	at(time.Minute + 59900*time.Millisecond)
	if ok, _, _ := m.Admit(ctx, 1, 1, 0); ok {
		t.Fatal("admitted 60 seconds after the first while its segment counts")
	}
	at(2 * time.Minute)
	if ok, _, _ := m.Admit(ctx, 1, 1, 0); !ok {
		t.Fatal("refused after the segment left")
	}
}

// The segment that frees enough room decides when a refused request can
// retry, rounded up to the second.
func TestRetryAfterRequests(t *testing.T) {
	m, _, _, at := newMinute(t, "account")
	ctx := t.Context()
	m.Admit(ctx, 1, 0, 0)
	at(20 * time.Second) // segment 6, leaves at 81 s
	m.Admit(ctx, 1, 0, 0)
	at(30500 * time.Millisecond)
	if ok, retry, _ := m.Admit(ctx, 1, 2, 0); ok || retry != 33*time.Second {
		t.Fatal("cap 2", ok, retry)
	}
	if ok, retry, _ := m.Admit(ctx, 1, 1, 0); ok || retry != 51*time.Second {
		t.Fatal("cap 1 waits for both", ok, retry)
	}
}

func TestRetryAfterTokens(t *testing.T) {
	m, _, _, at := newMinute(t, "account")
	ctx := t.Context()
	m.AddTokens(ctx, 1, 50)
	at(20 * time.Second)
	m.AddTokens(ctx, 1, 50)
	at(30 * time.Second)
	if _, ok, retry, _ := m.Reserve(ctx, 1, 0, 100, 40); ok || retry != 33*time.Second {
		t.Fatal(ok, retry)
	}
	if _, ok, retry, _ := m.Reserve(ctx, 1, 0, 100, 60); ok || retry != 51*time.Second {
		t.Fatal(ok, retry)
	}
}

// However many requests a window admits, a count is at most 21 segments.
func TestCountsStaySmall(t *testing.T) {
	m, _, rdb, at := newMinute(t, "account")
	ctx := t.Context()
	for i := range 600 {
		at(time.Duration(i) * 500 * time.Millisecond)
		if ok, _, err := m.AdmitAll(ctx, []Limits{{ID: 1, RPM: 1000, SPM: 1000}}, Session{Key: "s"}); !ok || err != nil {
			t.Fatal(i, ok, err)
		}
		m.AddTokens(ctx, 1, 10)
	}
	counts, members := SessionKeys("account", 1, "", 60)
	for _, k := range []string{Key("account", 1, Requests), Key("account", 1, Tokens), counts} {
		if n, _ := rdb.HLen(ctx, k).Result(); n > Segments+1 {
			t.Fatal("stale segments kept", k, n)
		}
	}
	if n, _ := rdb.ZCard(ctx, members).Result(); n != 1 {
		t.Fatal("members", n)
	}
	u, _ := m.UsageOf(ctx, []Limits{{ID: 1}})
	// 299.5 s: segments 79 to 99, from 237 s, hold 126 requests.
	if u[0].RPM != 126 || u[0].TPM != 1260 || u[0].Sessions != 1 {
		t.Fatal(u)
	}
}

func TestAdmitAllSubCounters(t *testing.T) {
	m, _, _, _ := newMinute(t, "account")
	ctx := t.Context()
	own, list := Limits{ID: 7, RPM: 3}, Limits{ID: 7, Sub: "m:a", RPM: 1}
	if ok, _, err := m.AdmitAll(ctx, []Limits{own, list}, Session{}); !ok || err != nil {
		t.Fatal(ok, err)
	}
	// The list is at its cap: nothing is counted, not even on the account.
	if ok, _, _ := m.AdmitAll(ctx, []Limits{own, list}, Session{}); ok {
		t.Fatal("list cap ignored")
	}
	// Another list of the account is counted apart.
	if ok, _, _ := m.AdmitAll(ctx, []Limits{own, {ID: 7, Sub: "m:b", RPM: 1}}, Session{}); !ok {
		t.Fatal("lists share counters")
	}
	m.AddSubTokens(ctx, 7, "m:a", 40)
	m.AddTokens(ctx, 7, 40)
	u, err := m.UsageOf(ctx, []Limits{own, list, {ID: 7, Sub: "m:b"}})
	if err != nil || u[0].RPM != 2 || u[0].TPM != 40 || u[1].RPM != 1 || u[1].TPM != 40 || u[2].RPM != 1 || u[2].TPM != 0 {
		t.Fatal(u, err)
	}
	reached, _ := m.Reached(ctx, []Limits{{ID: 7, Sub: "m:a", TPM: 40}}, Session{})
	if !reached[7] {
		t.Fatal("list tokens cap not reached", reached)
	}
}

func TestAdmitSessions(t *testing.T) {
	m, mr, rdb, at := newMinute(t, "account")
	ctx := t.Context()
	own := []Limits{{ID: 9, SPM: 2}}
	admit := func(sets []Limits, session Session) (bool, time.Duration) {
		t.Helper()
		ok, retry, err := m.AdmitAll(ctx, sets, session)
		if err != nil {
			t.Fatal(err)
		}
		return ok, retry
	}
	counts, members := SessionKeys("account", 9, "", 60)
	segments := func() int64 {
		t.Helper()
		n, _ := rdb.HLen(ctx, counts).Result()
		return n
	}

	if ok, _ := admit(own, Session{Key: "s1"}); !ok {
		t.Fatal("first session refused")
	}
	at(10 * time.Second) // segment 3
	if ok, _ := admit(own, Session{Key: "s2"}); !ok {
		t.Fatal("second session refused")
	}
	// A new session over the cap waits for the oldest segment to leave.
	at(20 * time.Second) // segment 6
	if ok, retry := admit(own, Session{Key: "s3"}); ok || retry != 43*time.Second {
		t.Fatal("third session", ok, retry)
	}
	// A session in the window is always admitted and moves to the current
	// segment: it is counted once.
	if ok, _ := admit(own, Session{Key: "s1"}); !ok {
		t.Fatal("held session refused at the cap")
	}
	if u, _ := m.UsageOf(ctx, own); u[0].Sessions != 2 || segments() != 2 {
		t.Fatal("a session that moved is counted twice", u, segments())
	}
	// A request that is its own session is a new session.
	if ok, _ := admit(own, Session{Key: "req:1", Once: true}); ok {
		t.Fatal("a request alone passed the cap")
	}
	// Requests without a session are neither limited nor counted.
	if ok, _ := admit(own, Session{}); !ok {
		t.Fatal("request without a session limited")
	}
	if u, err := m.UsageOf(ctx, own); err != nil || u[0].Sessions != 2 || u[0].RPM != 4 {
		t.Fatal(u, err)
	}
	reached, err := m.Reached(ctx, own, Session{Key: "s1"})
	if err != nil || reached[9] {
		t.Fatal("precheck refused a held session", reached, err)
	}
	if reached, _ = m.Reached(ctx, own, Session{Key: "s9"}); !reached[9] {
		t.Fatal("precheck admitted a new session over the cap")
	}
	if reached, _ = m.Reached(ctx, own, Session{Key: "s1", Once: true}); !reached[9] {
		t.Fatal("precheck let a request alone hold a remembered session")
	}
	if reached, _ = m.Reached(ctx, own, Session{}); reached[9] {
		t.Fatal("precheck limited a request without a session")
	}
	if ttl := mr.TTL(members); ttl != 63*time.Second {
		t.Fatal("ttl", ttl)
	}
	// s2 (segment 3) leaves at 72 s; s1 moved to segment 6.
	at(70 * time.Second)
	if ok, retry := admit(own, Session{Key: "s3"}); ok || retry != 2*time.Second {
		t.Fatal("s2 left the window early", ok, retry)
	}
	at(72 * time.Second)
	if ok, _ := admit(own, Session{Key: "s3"}); !ok {
		t.Fatal("expired session still counted")
	}
	if u, _ := m.UsageOf(ctx, own); u[0].Sessions != 2 {
		t.Fatal("sessions in the window", u)
	}
	if n, _ := rdb.ZCard(ctx, members).Result(); n != 2 {
		t.Fatal("expired sessions not pruned", n)
	}
}

// A request alone is counted where it is admitted, every time, and never
// remembered: releasing it takes it off the segment of its hold's time, once
// that segment is still in the window.
func TestAdmitOnceSessions(t *testing.T) {
	m, mr, _, at := newMinute(t, "account")
	ctx := t.Context()
	own := []Limits{{ID: 4, SPM: 3}}
	holds := map[string]time.Time{}
	for i, s := range []string{"req:a", "req:b", "req:a"} {
		at(time.Duration(i) * 10 * time.Second)
		hold, ok, _, _ := m.ReserveAll(ctx, own, Session{Key: s, Once: true}, 0)
		if !ok {
			t.Fatal("refused", s)
		}
		holds[s] = hold.At
	}
	if ok, _, _ := m.AdmitAll(ctx, own, Session{Key: "req:c", Once: true}); ok {
		t.Fatal("a fourth session admitted")
	}
	if u, _ := m.UsageOf(ctx, own); u[0].Sessions != 3 {
		t.Fatal(u)
	}
	counts, members := SessionKeys("account", 4, "", 60)
	if !mr.Exists(counts) || mr.Exists(members) {
		t.Fatal("requests alone remembered", mr.Keys())
	}
	m.ReleaseSession(ctx, own, Session{Key: "req:a", Once: true}, time.Time{})
	if u, _ := m.UsageOf(ctx, own); u[0].Sessions != 3 {
		t.Fatal("released without its admission time", u)
	}
	// req:a's second admission (20 s) leaves its segment; the first (0 s)
	// and req:b (10 s) stay.
	m.ReleaseSession(ctx, own, Session{Key: "req:a", Once: true}, holds["req:a"])
	if n, _ := mr.HKeys(counts); len(n) != 2 {
		t.Fatal("segments after the release", n)
	}
	if ok, _, _ := m.AdmitAll(ctx, own, Session{Key: "req:c", Once: true}); !ok {
		t.Fatal("released slot not free")
	}
	// A segment that left the window is not taken off again: req:b's (10 s)
	// left at 72 s; req:c (20 s) stays counted.
	at(75 * time.Second)
	m.ReleaseSession(ctx, own, Session{Key: "req:b", Once: true}, holds["req:b"])
	if u, _ := m.UsageOf(ctx, own); u[0].Sessions != 1 {
		t.Fatal("released a segment out of the window", u)
	}
}

func TestAdmitSessionLevelsAreIndependent(t *testing.T) {
	m, _, _, _ := newMinute(t, "account")
	ctx := t.Context()
	own, listA, listB := Limits{ID: 5, SPM: 5}, Limits{ID: 5, Sub: "m:a", SPM: 1}, Limits{ID: 5, Sub: "m:b", SPM: 1}
	a, c := Session{Key: "a"}, Session{Key: "c"}
	if ok, _, _ := m.AdmitAll(ctx, []Limits{own, listA}, a); !ok {
		t.Fatal("first session refused")
	}
	// c holds a slot of the account, not of list a: the list still refuses it.
	if ok, _, _ := m.AdmitAll(ctx, []Limits{own}, c); !ok {
		t.Fatal("account session refused")
	}
	if ok, retry, _ := m.AdmitAll(ctx, []Limits{own, listA}, c); ok || retry != 63*time.Second {
		t.Fatal("holding the account's slot passed the list's cap", ok, retry)
	}
	if ok, _, _ := m.AdmitAll(ctx, []Limits{own, listB}, c); !ok {
		t.Fatal("lists share sessions")
	}
	u, err := m.UsageOf(ctx, []Limits{own, listA, listB})
	if err != nil || u[0].Sessions != 2 || u[1].Sessions != 1 || u[2].Sessions != 1 || u[0].RPM != 3 {
		t.Fatal("a refused request was counted", u, err)
	}
	reached, _ := m.Reached(ctx, []Limits{own, listA}, c)
	if !reached[5] {
		t.Fatal("precheck ignored the list's cap")
	}
	if reached, _ = m.Reached(ctx, []Limits{own, listA}, a); reached[5] {
		t.Fatal("precheck refused the list's own session")
	}
}

// A released session frees its slot in every set at once, from the segment
// it was last seen in; requests stay counted.
func TestReleaseSession(t *testing.T) {
	m, _, _, at := newMinute(t, "account")
	ctx := t.Context()
	sets := []Limits{{ID: 3, SPM: 2}, {ID: 3, Sub: "m:a", SPM: 1}}
	if ok, _, _ := m.AdmitAll(ctx, sets[:1], Session{Key: "stays"}); !ok {
		t.Fatal("first session refused")
	}
	at(10 * time.Second)
	if ok, _, _ := m.AdmitAll(ctx, sets, Session{Key: "moved"}); !ok {
		t.Fatal("second session refused")
	}
	at(20 * time.Second)
	if ok, _, _ := m.AdmitAll(ctx, sets, Session{Key: "next"}); ok {
		t.Fatal("third session admitted over the cap")
	}
	m.ReleaseSession(ctx, sets, Session{Key: "moved"}, time.Time{})
	u, err := m.UsageOf(ctx, sets)
	if err != nil || u[0].Sessions != 1 || u[1].Sessions != 0 || u[0].RPM != 2 {
		t.Fatal("released session still counted", u, err)
	}
	if ok, _, _ := m.AdmitAll(ctx, sets, Session{Key: "next"}); !ok {
		t.Fatal("released slot not free")
	}
}

// The window is part of the session keys: changing it counts anew, and a
// window of 5 minutes holds a session for 5 minutes.
func TestSessionWindows(t *testing.T) {
	m, mr, _, at := newMinute(t, "account")
	ctx := t.Context()
	minute, five := []Limits{{ID: 2, SPM: 1}}, []Limits{{ID: 2, SPM: 1, SPMWindow: 300}}
	if ok, _, _ := m.AdmitAll(ctx, minute, Session{Key: "s1"}); !ok {
		t.Fatal("first session refused")
	}
	if u, _ := m.UsageOf(ctx, five); u[0].Sessions != 0 {
		t.Fatal("windows share counts", u)
	}
	if ok, _, _ := m.AdmitAll(ctx, five, Session{Key: "s1"}); !ok {
		t.Fatal("first session of the 5-minute window refused")
	}
	counts, members := SessionKeys("account", 2, "", 300)
	if ttl := mr.TTL(counts); ttl != 315*time.Second || mr.TTL(members) != ttl {
		t.Fatal("ttl", ttl)
	}
	// Segments are 15 s: s1's first segment leaves at 315 s.
	at(200 * time.Second)
	if ok, retry, _ := m.AdmitAll(ctx, five, Session{Key: "s2"}); ok || retry != 115*time.Second {
		t.Fatal("s2 within 5 minutes of s1", ok, retry)
	}
	// The 60-second window forgot s1 long ago.
	if ok, _, _ := m.AdmitAll(ctx, minute, Session{Key: "s2"}); !ok {
		t.Fatal("the minute window still holds s1")
	}
	at(290 * time.Second) // segment 19
	if ok, _, _ := m.AdmitAll(ctx, five, Session{Key: "s1"}); !ok {
		t.Fatal("held session refused")
	}
	at(316 * time.Second)
	if ok, retry, _ := m.AdmitAll(ctx, five, Session{Key: "s2"}); ok || retry != 284*time.Second {
		t.Fatal("s1 seen again at 290 s holds its slot until 600 s", ok, retry)
	}
	if r, _ := m.Reached(ctx, five, Session{Key: "s1"}); r[2] {
		t.Fatal("precheck: s1 is held within the 5 minutes")
	}
	at(600 * time.Second)
	if ok, _, _ := m.AdmitAll(ctx, five, Session{Key: "s2"}); !ok {
		t.Fatal("s1 left the window")
	}
	if u, _ := m.UsageOf(ctx, five); u[0].Sessions != 1 {
		t.Fatal(u)
	}
}

// Three requests at the end of a minute still show as three 40 seconds later.
func TestUsageForBurstyTraffic(t *testing.T) {
	m, _, _, at := newMinute(t, "account")
	ctx := t.Context()
	at(59 * time.Second)
	for range 3 {
		if ok, _, _ := m.Admit(ctx, 1, 0, 0); !ok {
			t.Fatal("refused")
		}
	}
	at(time.Minute + 40*time.Second)
	if u, _ := m.Usage(ctx, []int64{1}); u[1].RPM != 3 {
		t.Fatal(u)
	}
}

func TestReserveAndSettle(t *testing.T) {
	m, _, _, at := newMinute(t, "account")
	ctx := t.Context()
	tpm := func() int64 {
		t.Helper()
		u, err := m.Usage(ctx, []int64{1})
		if err != nil {
			t.Fatal(err)
		}
		return u[1].TPM
	}

	// Concurrent requests see each other's reservation.
	first, ok, _, err := m.Reserve(ctx, 1, 0, 100, 60)
	if !ok || err != nil || tpm() != 60 || !first.At.Equal(base) {
		t.Fatal(ok, err, tpm(), first)
	}
	if _, ok, retry, _ := m.Reserve(ctx, 1, 0, 100, 60); ok || retry != 63*time.Second {
		t.Fatal("reservation over the cap passed", ok, retry)
	}
	// Settling swaps the amount in the request's segment.
	at(10 * time.Second)
	m.Settle(ctx, first, 10)
	if tpm() != 10 {
		t.Fatal("settled", tpm())
	}
	second, ok, _, _ := m.Reserve(ctx, 1, 0, 100, 60)
	if !ok {
		t.Fatal("room left by the settlement not usable")
	}
	// A failure returns the reservation; the request stays counted.
	m.Settle(ctx, second, 0)
	u, _ := m.Usage(ctx, []int64{1})
	if u[1].TPM != 10 || u[1].RPM != 2 {
		t.Fatal(u)
	}
	at(63 * time.Second)
	if tpm() != 0 {
		t.Fatal("settled tokens are dated from the request's start", tpm())
	}

	// A reservation larger than the cap passes an empty window, alone.
	big, ok, _, _ := m.Reserve(ctx, 2, 0, 100, 500)
	if !ok || big.Items[0].Tokens != 100 {
		t.Fatal(ok, big)
	}
	if _, ok, _, _ := m.Reserve(ctx, 2, 0, 100, 1); ok {
		t.Fatal("cap full of a reservation still admits")
	}
	if ok, _, _ := m.Admit(ctx, 2, 0, 100); ok {
		t.Fatal("full cap admits a request reserving nothing")
	}
}

// A segment never counts less than nothing, even if a hold settles twice.
func TestSettleNeverNegative(t *testing.T) {
	m, _, rdb, _ := newMinute(t, "account")
	ctx := t.Context()
	hold, _, _, _ := m.Reserve(ctx, 1, 0, 100, 60)
	m.Settle(ctx, hold, 0)
	m.Settle(ctx, hold, 0)
	if n, _ := rdb.HLen(ctx, Key("account", 1, Tokens)).Result(); n != 0 {
		t.Fatal("empty segment kept", n)
	}
	if _, ok, _, _ := m.Reserve(ctx, 1, 0, 100, 100); !ok {
		t.Fatal("a negative segment")
	}
	if u, _ := m.Usage(ctx, []int64{1}); u[1].TPM != 100 {
		t.Fatal(u)
	}
}

func TestSettleAfterTheReservationLeftTheWindow(t *testing.T) {
	m, _, rdb, at := newMinute(t, "account")
	ctx := t.Context()
	over, _, _, _ := m.Reserve(ctx, 1, 0, 1000, 100)
	under, _, _, _ := m.Reserve(ctx, 1, 0, 1000, 100)
	// A stream of three minutes: only what exceeds the reservation still
	// counts, in the current segment.
	at(3 * time.Minute)
	m.Settle(ctx, over, 150)
	m.Settle(ctx, under, 20)
	if u, _ := m.Usage(ctx, []int64{1}); u[1].TPM != 50 {
		t.Fatal(u)
	}
	if n, _ := rdb.HLen(ctx, Key("account", 1, Tokens)).Result(); n != 1 {
		t.Fatal("old reservations left behind", n)
	}
}

func TestReserveOnlyWhereATPMCapApplies(t *testing.T) {
	m, _, _, _ := newMinute(t, "account")
	ctx := t.Context()
	sets := []Limits{{ID: 1}, {ID: 1, Sub: "m:a", TPM: 100}}
	hold, ok, _, _ := m.ReserveAll(ctx, sets, Session{}, 40)
	if !ok || hold.Items[0].Tokens != 0 || hold.Items[1].Tokens != 40 {
		t.Fatal(ok, hold)
	}
	u, _ := m.UsageOf(ctx, sets)
	if u[0].TPM != 0 || u[1].TPM != 40 {
		t.Fatal(u)
	}
	m.Settle(ctx, hold, 30)
	u, _ = m.UsageOf(ctx, sets)
	if u[0].TPM != 30 || u[1].TPM != 30 {
		t.Fatal(u)
	}
}
