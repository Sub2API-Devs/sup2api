package billing

import (
	"context"
	"testing"
	"time"

	"github.com/Sub2API-Devs/sup2api/next/server/internal/core"
)

// client_disconnect_policy / client_disconnect_wait_seconds of the billing
// settings (CONTRACTS §8, §25.8).
func TestClientDisconnectSettings(t *testing.T) {
	e := newEnv(t)
	admin := e.user("admin@example.com")
	ctx := context.Background()
	policy := func() core.ClientDisconnect {
		t.Helper()
		e.svc.invalidate()
		v, err := e.svc.ClientDisconnect(ctx)
		if err != nil {
			t.Fatal(err)
		}
		return v
	}

	// No row: the defaults.
	st := data(e.mustCall(admin, 200, "GET", "/settings/billing", nil))
	if st["client_disconnect_policy"] != "continue" || st["client_disconnect_wait_seconds"] != float64(120) {
		t.Fatalf("defaults: %v", st)
	}
	if got := policy(); got != (core.ClientDisconnect{Policy: core.DisconnectContinue, Wait: 120 * time.Second}) {
		t.Fatalf("default policy: %+v", got)
	}

	// A row written before the fields existed reads as the defaults too.
	e.exec(`INSERT INTO settings (key, value) VALUES ('billing', '{"missing_price_policy":"reject","min_balance":"1"}')
		ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value`)
	if got := policy(); got.Policy != core.DisconnectContinue || got.Wait != 120*time.Second {
		t.Fatalf("policy of a row without the fields: %+v", got)
	}

	st = data(e.mustCall(admin, 200, "PUT", "/settings/billing",
		map[string]any{"client_disconnect_policy": "free", "client_disconnect_wait_seconds": 30}))
	if st["client_disconnect_policy"] != "free" || st["client_disconnect_wait_seconds"] != float64(30) || st["min_balance"] != "1" {
		t.Fatalf("after update: %v", st)
	}
	if got := policy(); got != (core.ClientDisconnect{Policy: core.DisconnectFree, Wait: 30 * time.Second}) {
		t.Fatalf("updated policy: %+v", got)
	}

	for name, patch := range map[string]map[string]any{
		"unknown policy": {"client_disconnect_policy": "maybe"},
		"wait too short": {"client_disconnect_wait_seconds": 4},
		"wait too long":  {"client_disconnect_wait_seconds": 1801},
	} {
		if _, resp := e.call(admin, "PUT", "/settings/billing", patch); errCode(resp) != "invalid_argument" {
			t.Fatalf("%s: %v", name, resp)
		}
	}
	if got := policy(); got.Policy != core.DisconnectFree || got.Wait != 30*time.Second {
		t.Fatalf("a rejected update changed the policy: %+v", got)
	}

	// A stored value nobody could have chosen keeps the default.
	e.exec(`UPDATE settings SET value = value || '{"client_disconnect_policy":"later","client_disconnect_wait_seconds":999999}' WHERE key = 'billing'`)
	if got := policy(); got.Policy != core.DisconnectContinue || got.Wait != 1800*time.Second {
		t.Fatalf("policy of an out-of-range row: %+v", got)
	}
	// Updating another field answers with the same usable values GET gives.
	st = data(e.mustCall(admin, 200, "PUT", "/settings/billing", map[string]any{"min_balance": "2"}))
	if st["client_disconnect_policy"] != "continue" || st["client_disconnect_wait_seconds"] != float64(1800) {
		t.Fatalf("update over an out-of-range row: %v", st)
	}
}
