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
	mr.SetTime(time.Date(2026, 10, 26, 12, 1, 0, 0, time.UTC))
	if ok, _, _ := keys.Admit(ctx, 1, 2, 0); !ok {
		t.Fatal("next minute still refused")
	}
	if ok, _, err := NewMinute(nil, "apikey").Admit(ctx, 1, 1, 1); !ok || err != nil {
		t.Fatal("without Redis everything is admitted", ok, err)
	}
}
