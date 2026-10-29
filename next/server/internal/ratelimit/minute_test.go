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
	// The estimate spreads a window evenly: right after 12:01 the previous
	// window counts a little under two requests.
	ok, retry, err := keys.Admit(ctx, 1, 2, 0)
	if ok || err != nil || retry != 20*time.Second {
		t.Fatal("third request in the minute", ok, retry, err)
	}
	// Scopes do not share windows.
	if ok, _, _ := accounts.Admit(ctx, 1, 1, 0); !ok {
		t.Fatal("account 1 shares the window of key 1")
	}
	keys.AddTokens(ctx, 2, 50)
	if ok, _, _ := keys.Admit(ctx, 2, 0, 50); ok {
		t.Fatal("tokens over the cap admitted")
	}
	reached, err := keys.Reached(ctx, []Limits{{ID: 1, RPM: 2}, {ID: 2, TPM: 100}, {ID: 3}})
	if err != nil || !reached[1] || reached[2] || reached[3] {
		t.Fatal(reached, err)
	}
	u, err := keys.Usage(ctx, []int64{1, 2})
	if err != nil || u[1].RPM != 2 || u[2].TPM != 50 {
		t.Fatal(u, err)
	}
	// Right after the minute the previous window still counts in full.
	mr.SetTime(time.Date(2026, 10, 26, 12, 1, 0, 0, time.UTC))
	if ok, _, _ := keys.Admit(ctx, 1, 2, 0); ok {
		t.Fatal("the last 60 seconds still hold two requests")
	}
	// Half way through, half of the previous window is left: 2 x 0.5 = 1.
	mr.SetTime(time.Date(2026, 10, 26, 12, 1, 30, 0, time.UTC))
	if u, _ := keys.Usage(ctx, []int64{1}); u[1].RPM != 1 {
		t.Fatal("sliding estimate", u)
	}
	if ok, _, _ := keys.Admit(ctx, 1, 2, 0); !ok {
		t.Fatal("one request in the last 60 seconds still refused")
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
	if ok, _, err := m.AdmitAll(ctx, []Limits{own, list}); !ok || err != nil {
		t.Fatal(ok, err)
	}
	// The list is at its cap: nothing is counted, not even on the account.
	if ok, _, _ := m.AdmitAll(ctx, []Limits{own, list}); ok {
		t.Fatal("list cap ignored")
	}
	// Another list of the account is counted apart.
	if ok, _, _ := m.AdmitAll(ctx, []Limits{own, {ID: 7, Sub: "m:b", RPM: 1}}); !ok {
		t.Fatal("lists share counters")
	}
	m.AddSubTokens(ctx, 7, "m:a", 40)
	m.AddTokens(ctx, 7, 40)
	u, err := m.UsageOf(ctx, []Limits{own, list, {ID: 7, Sub: "m:b"}})
	if err != nil || u[0].RPM != 2 || u[0].TPM != 40 || u[1].RPM != 1 || u[1].TPM != 40 || u[2].RPM != 1 || u[2].TPM != 0 {
		t.Fatal(u, err)
	}
	reached, _ := m.Reached(ctx, []Limits{{ID: 7, Sub: "m:a", TPM: 40}})
	if !reached[7] {
		t.Fatal("list tokens cap not reached", reached)
	}
}
