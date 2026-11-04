package ratelimit

import (
	"testing"
	"time"

	"github.com/alicebob/miniredis/v2"
	"github.com/redis/go-redis/v9"
)

func TestMinuteWindows(t *testing.T) {
	mr := miniredis.RunT(t)
	rdb := redis.NewClient(&redis.Options{Addr: mr.Addr()})
	t.Cleanup(func() { _ = rdb.Close() })
	mr.SetTime(time.Date(2026, 10, 26, 12, 0, 40, 0, time.UTC))
	ctx := t.Context()
	keys, accounts := NewMinute(rdb, "apikey"), NewMinute(rdb, "account")

	if ok, _, err := keys.Admit(ctx, 1, 2, 0); !ok || err != nil {
		t.Fatal(ok, err)
	}
	if ok, _, err := keys.Admit(ctx, 1, 2, 0); !ok || err != nil {
		t.Fatal(ok, err)
	}
	// The third request waits for the first to leave the last 60 seconds.
	ok, retry, err := keys.Admit(ctx, 1, 2, 0)
	if ok || err != nil || retry != time.Minute {
		t.Fatal("third request in the 60 seconds", ok, retry, err)
	}
	// Scopes do not share windows.
	if ok, _, _ := accounts.Admit(ctx, 1, 1, 0); !ok {
		t.Fatal("account 1 shares the window of key 1")
	}
	keys.AddTokens(ctx, 2, 50)
	if ok, _, _ := keys.Admit(ctx, 2, 0, 50); ok {
		t.Fatal("tokens over the cap admitted")
	}
	reached, err := keys.Reached(ctx, []Limits{{ID: 1, RPM: 2}, {ID: 2, TPM: 100}, {ID: 3}}, "")
	if err != nil || !reached[1] || reached[2] || reached[3] {
		t.Fatal(reached, err)
	}
	u, err := keys.Usage(ctx, []int64{1, 2})
	if err != nil || u[1].RPM != 2 || u[2].TPM != 50 {
		t.Fatal(u, err)
	}
	// Crossing a minute changes nothing: both requests are 39 seconds old.
	mr.SetTime(time.Date(2026, 10, 26, 12, 1, 19, 0, time.UTC))
	if ok, _, _ := keys.Admit(ctx, 1, 2, 0); ok {
		t.Fatal("the last 60 seconds still hold two requests")
	}
	if u, _ := keys.Usage(ctx, []int64{1}); u[1].RPM != 2 {
		t.Fatal("count is exact", u)
	}
	// Past 60 seconds they are gone.
	mr.SetTime(time.Date(2026, 10, 26, 12, 1, 41, 0, time.UTC))
	if u, _ := keys.Usage(ctx, []int64{1}); u[1].RPM != 0 {
		t.Fatal("requests older than 60 seconds still counted", u)
	}
	if ok, _, _ := keys.Admit(ctx, 1, 2, 0); !ok {
		t.Fatal("an empty window refused")
	}
	if ok, _, err := NewMinute(nil, "apikey").Admit(ctx, 1, 1, 1); !ok || err != nil {
		t.Fatal("without Redis everything is admitted", ok, err)
	}
}

func TestAdmitAllSubCounters(t *testing.T) {
	mr := miniredis.RunT(t)
	rdb := redis.NewClient(&redis.Options{Addr: mr.Addr()})
	t.Cleanup(func() { _ = rdb.Close() })
	mr.SetTime(time.Date(2026, 10, 26, 12, 0, 10, 0, time.UTC))
	ctx := t.Context()
	m := NewMinute(rdb, "account")

	own, list := Limits{ID: 7, RPM: 3}, Limits{ID: 7, Sub: "m:a", RPM: 1}
	if ok, _, err := m.AdmitAll(ctx, []Limits{own, list}, ""); !ok || err != nil {
		t.Fatal(ok, err)
	}
	// The list is at its cap: nothing is counted, not even on the account.
	if ok, _, _ := m.AdmitAll(ctx, []Limits{own, list}, ""); ok {
		t.Fatal("list cap ignored")
	}
	// Another list of the account is counted apart.
	if ok, _, _ := m.AdmitAll(ctx, []Limits{own, {ID: 7, Sub: "m:b", RPM: 1}}, ""); !ok {
		t.Fatal("lists share counters")
	}
	m.AddSubTokens(ctx, 7, "m:a", 40)
	m.AddTokens(ctx, 7, 40)
	u, err := m.UsageOf(ctx, []Limits{own, list, {ID: 7, Sub: "m:b"}})
	if err != nil || u[0].RPM != 2 || u[0].TPM != 40 || u[1].RPM != 1 || u[1].TPM != 40 || u[2].RPM != 1 || u[2].TPM != 0 {
		t.Fatal(u, err)
	}
	reached, _ := m.Reached(ctx, []Limits{{ID: 7, Sub: "m:a", TPM: 40}}, "")
	if !reached[7] {
		t.Fatal("list tokens cap not reached", reached)
	}
}

func TestAdmitSessions(t *testing.T) {
	mr := miniredis.RunT(t)
	rdb := redis.NewClient(&redis.Options{Addr: mr.Addr()})
	t.Cleanup(func() { _ = rdb.Close() })
	t0 := time.Date(2026, 10, 30, 12, 0, 10, 0, time.UTC)
	at := func(d time.Duration) { mr.SetTime(t0.Add(d)) }
	ctx := t.Context()
	m := NewMinute(rdb, "account")
	own := []Limits{{ID: 9, SPM: 2}}
	admit := func(sets []Limits, session string) (bool, time.Duration) {
		t.Helper()
		ok, retry, err := m.AdmitAll(ctx, sets, session)
		if err != nil {
			t.Fatal(err)
		}
		return ok, retry
	}

	at(0)
	if ok, _ := admit(own, "s1"); !ok {
		t.Fatal("first session refused")
	}
	at(10 * time.Second)
	if ok, _ := admit(own, "s2"); !ok {
		t.Fatal("second session refused")
	}
	// A new session over the cap waits for the oldest one to leave.
	at(20 * time.Second)
	if ok, retry := admit(own, "s3"); ok || retry != 40*time.Second {
		t.Fatal("third session", ok, retry)
	}
	// A session in the window is always admitted and refreshed.
	if ok, _ := admit(own, "s1"); !ok {
		t.Fatal("active session refused at the cap")
	}
	// Requests without a session are neither limited nor counted.
	if ok, _ := admit(own, ""); !ok {
		t.Fatal("request without a session limited")
	}
	if u, err := m.UsageOf(ctx, own); err != nil || u[0].Sessions != 2 || u[0].RPM != 4 {
		t.Fatal(u, err)
	}
	reached, err := m.Reached(ctx, own, "s1")
	if err != nil || reached[9] {
		t.Fatal("precheck refused an active session", reached, err)
	}
	if reached, _ = m.Reached(ctx, own, "s9"); !reached[9] {
		t.Fatal("precheck admitted a new session over the cap")
	}
	if reached, _ = m.Reached(ctx, own, ""); reached[9] {
		t.Fatal("precheck limited a request without a session")
	}
	// s2 (10 s) leaves the window at 70 s; s1 was refreshed at 20 s.
	at(65 * time.Second)
	if ok, retry := admit(own, "s3"); ok || retry != 5*time.Second {
		t.Fatal("s2 left the window early", ok, retry)
	}
	at(71 * time.Second)
	if ok, _ := admit(own, "s3"); !ok {
		t.Fatal("expired session still counted")
	}
	if u, _ := m.UsageOf(ctx, own); u[0].Sessions != 2 {
		t.Fatal("sessions in the window", u)
	}
	if n, _ := rdb.ZCard(ctx, SessionKey("account", 9, "")).Result(); n != 2 {
		t.Fatal("expired sessions not pruned", n)
	}
}

func TestAdmitSessionLevelsAreIndependent(t *testing.T) {
	mr := miniredis.RunT(t)
	rdb := redis.NewClient(&redis.Options{Addr: mr.Addr()})
	t.Cleanup(func() { _ = rdb.Close() })
	mr.SetTime(time.Date(2026, 10, 30, 12, 0, 10, 0, time.UTC))
	ctx := t.Context()
	m := NewMinute(rdb, "account")
	own, listA, listB := Limits{ID: 5, SPM: 5}, Limits{ID: 5, Sub: "m:a", SPM: 1}, Limits{ID: 5, Sub: "m:b", SPM: 1}

	if ok, _, _ := m.AdmitAll(ctx, []Limits{own, listA}, "a"); !ok {
		t.Fatal("first session refused")
	}
	// c holds a slot of the account, not of list a: the list still refuses it.
	if ok, _, _ := m.AdmitAll(ctx, []Limits{own}, "c"); !ok {
		t.Fatal("account session refused")
	}
	if ok, retry, _ := m.AdmitAll(ctx, []Limits{own, listA}, "c"); ok || retry != time.Minute {
		t.Fatal("holding the account's slot passed the list's cap", ok, retry)
	}
	if ok, _, _ := m.AdmitAll(ctx, []Limits{own, listB}, "c"); !ok {
		t.Fatal("lists share sessions")
	}
	u, err := m.UsageOf(ctx, []Limits{own, listA, listB})
	if err != nil || u[0].Sessions != 2 || u[1].Sessions != 1 || u[2].Sessions != 1 || u[0].RPM != 3 {
		t.Fatal("a refused request was counted", u, err)
	}
	reached, _ := m.Reached(ctx, []Limits{own, listA}, "c")
	if !reached[5] {
		t.Fatal("precheck ignored the list's cap")
	}
	if reached, _ = m.Reached(ctx, []Limits{own, listA}, "a"); reached[5] {
		t.Fatal("precheck refused the list's own session")
	}
}

// A released session frees its slot in every set at once; requests stay
// counted.
func TestReleaseSession(t *testing.T) {
	mr := miniredis.RunT(t)
	rdb := redis.NewClient(&redis.Options{Addr: mr.Addr()})
	t.Cleanup(func() { _ = rdb.Close() })
	mr.SetTime(time.Date(2026, 11, 1, 12, 0, 10, 0, time.UTC))
	ctx := t.Context()
	m := NewMinute(rdb, "account")
	sets := []Limits{{ID: 3, SPM: 1}, {ID: 3, Sub: "m:a", SPM: 1}}
	if ok, _, _ := m.AdmitAll(ctx, sets, "moved"); !ok {
		t.Fatal("first session refused")
	}
	if ok, _, _ := m.AdmitAll(ctx, sets, "next"); ok {
		t.Fatal("second session admitted over the cap")
	}
	m.ReleaseSession(ctx, sets, "moved")
	u, err := m.UsageOf(ctx, sets)
	if err != nil || u[0].Sessions != 0 || u[1].Sessions != 0 || u[0].RPM != 1 {
		t.Fatal("released session still counted", u, err)
	}
	if ok, _, _ := m.AdmitAll(ctx, sets, "next"); !ok {
		t.Fatal("released slot not free")
	}
}

// No boundary burst: a cap of one passes one request in any 60 seconds, wherever
// the requests fall around a minute.
func TestNoBurstAcrossAMinute(t *testing.T) {
	mr := miniredis.RunT(t)
	rdb := redis.NewClient(&redis.Options{Addr: mr.Addr()})
	t.Cleanup(func() { _ = rdb.Close() })
	ctx := t.Context()
	m := NewMinute(rdb, "account")
	start := time.Date(2026, 10, 26, 12, 0, 59, 900_000_000, time.UTC)
	mr.SetTime(start)
	if ok, _, _ := m.Admit(ctx, 1, 1, 0); !ok {
		t.Fatal("first request refused")
	}
	mr.SetTime(start.Add(200 * time.Millisecond))
	if ok, retry, _ := m.Admit(ctx, 1, 1, 0); ok || retry != time.Minute {
		t.Fatal("second request passed across the minute", ok, retry)
	}
	mr.SetTime(start.Add(time.Minute + time.Millisecond))
	if ok, _, _ := m.Admit(ctx, 1, 1, 0); !ok {
		t.Fatal("refused after 60 seconds")
	}
}

// Three requests at the end of a minute still show as three 40 seconds later.
func TestUsageIsExactForBurstyTraffic(t *testing.T) {
	mr := miniredis.RunT(t)
	rdb := redis.NewClient(&redis.Options{Addr: mr.Addr()})
	t.Cleanup(func() { _ = rdb.Close() })
	ctx := t.Context()
	m := NewMinute(rdb, "account")
	mr.SetTime(time.Date(2026, 10, 26, 12, 0, 59, 0, time.UTC))
	for range 3 {
		if ok, _, _ := m.Admit(ctx, 1, 0, 0); !ok {
			t.Fatal("refused")
		}
	}
	mr.SetTime(time.Date(2026, 10, 26, 12, 1, 40, 0, time.UTC))
	if u, _ := m.Usage(ctx, []int64{1}); u[1].RPM != 3 {
		t.Fatal(u)
	}
}

func TestReserveAndSettle(t *testing.T) {
	mr := miniredis.RunT(t)
	rdb := redis.NewClient(&redis.Options{Addr: mr.Addr()})
	t.Cleanup(func() { _ = rdb.Close() })
	ctx := t.Context()
	m := NewMinute(rdb, "account")
	start := time.Date(2026, 10, 26, 12, 0, 10, 0, time.UTC)
	mr.SetTime(start)
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
	if !ok || err != nil || tpm() != 60 {
		t.Fatal(ok, err, tpm())
	}
	if _, ok, retry, _ := m.Reserve(ctx, 1, 0, 100, 60); ok || retry != time.Minute {
		t.Fatal("reservation over the cap passed", ok, retry)
	}
	// Settling swaps the amount and keeps the request's time.
	mr.SetTime(start.Add(10 * time.Second))
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
	mr.SetTime(start.Add(61 * time.Second))
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

func TestSettleAfterTheReservationLeftTheWindow(t *testing.T) {
	mr := miniredis.RunT(t)
	rdb := redis.NewClient(&redis.Options{Addr: mr.Addr()})
	t.Cleanup(func() { _ = rdb.Close() })
	ctx := t.Context()
	m := NewMinute(rdb, "account")
	start := time.Date(2026, 10, 26, 12, 0, 10, 0, time.UTC)
	mr.SetTime(start)
	over, _, _, _ := m.Reserve(ctx, 1, 0, 1000, 100)
	under, _, _, _ := m.Reserve(ctx, 1, 0, 1000, 100)
	// A stream of three minutes: only what exceeds the reservation still counts.
	mr.SetTime(start.Add(3 * time.Minute))
	m.Settle(ctx, over, 150)
	m.Settle(ctx, under, 20)
	if u, _ := m.Usage(ctx, []int64{1}); u[1].TPM != 50 {
		t.Fatal(u)
	}
	if n, _ := rdb.ZCard(ctx, Key("account", 1, "tpm")).Result(); n != 1 {
		t.Fatal("old reservations left behind", n)
	}
}

func TestReserveOnlyWhereATPMCapApplies(t *testing.T) {
	mr := miniredis.RunT(t)
	rdb := redis.NewClient(&redis.Options{Addr: mr.Addr()})
	t.Cleanup(func() { _ = rdb.Close() })
	ctx := t.Context()
	mr.SetTime(time.Date(2026, 10, 26, 12, 0, 10, 0, time.UTC))
	m := NewMinute(rdb, "account")
	sets := []Limits{{ID: 1}, {ID: 1, Sub: "m:a", TPM: 100}}
	hold, ok, _, _ := m.ReserveAll(ctx, sets, "", 40)
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

// The tokens that free room decide when a refused request can retry.
func TestRetryAfterTokens(t *testing.T) {
	mr := miniredis.RunT(t)
	rdb := redis.NewClient(&redis.Options{Addr: mr.Addr()})
	t.Cleanup(func() { _ = rdb.Close() })
	ctx := t.Context()
	m := NewMinute(rdb, "account")
	start := time.Date(2026, 10, 26, 12, 0, 10, 0, time.UTC)
	mr.SetTime(start)
	m.AddTokens(ctx, 1, 50)
	mr.SetTime(start.Add(20 * time.Second))
	m.AddTokens(ctx, 1, 50)
	mr.SetTime(start.Add(30 * time.Second))
	if _, ok, retry, _ := m.Reserve(ctx, 1, 0, 100, 40); ok || retry != 30*time.Second {
		t.Fatal(ok, retry)
	}
	if _, ok, retry, _ := m.Reserve(ctx, 1, 0, 100, 60); ok || retry != 50*time.Second {
		t.Fatal(ok, retry)
	}
}
