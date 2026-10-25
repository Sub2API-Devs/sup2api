package apikey

import (
	"context"
	"encoding/json"
	"testing"
	"time"

	"github.com/shopspring/decimal"
	"github.com/stretchr/testify/require"
)

type fixedBalance decimal.Decimal

func (b fixedBalance) Balance(context.Context, int64) (decimal.Decimal, error) {
	return decimal.Decimal(b), nil
}

// GET /v1/usage reports what a key may still spend (its owner's balance, no
// more than its quota leaves), its caps and its usage (CONTRACTS §62).
func TestKeyUsageReport(t *testing.T) {
	e := setup(t)
	e.svc.Balances = fixedBalance(decimal.RequireFromString("8.5"))
	group := e.exec1(`INSERT INTO groups (name) VALUES ('team') RETURNING id`)
	status, out := e.do(e.user, "POST", "/me/api-keys", map[string]any{"name": "ci", "group_id": group, "quota_limit": "10", "rpm_limit": 60})
	require.Equal(t, 201, status, out)
	raw := out["data"].(map[string]any)["key"].(string)
	id := int64(out["data"].(map[string]any)["id"].(float64))
	usage := func(rid string, at time.Time, cost string) {
		e.exec(`INSERT INTO usage_logs (request_id, user_id, api_key_id, group_id, protocol, endpoint, status_code, success,
				input_tokens, output_tokens, cache_read_tokens, total_cost, billing_status, created_at)
			VALUES ($1, $2, $3, $4, 'anthropic.messages', '/v1/messages', 200, true, 100, 20, 5, $5::numeric, 'billed', $6)`, rid, e.user, id, group, cost, at)
	}
	usage("today", time.Now(), "1.5")
	usage("earlier", time.Now().AddDate(0, 0, -3), "2")

	report := func() map[string]any {
		t.Helper()
		p, err := e.svc.Authenticate(t.Context(), raw)
		require.NoError(t, err)
		r, err := e.svc.KeyUsage(t.Context(), p)
		require.NoError(t, err)
		b, _ := json.Marshal(r)
		var m map[string]any
		require.NoError(t, json.Unmarshal(b, &m))
		return m
	}
	r := report()
	require.Equal(t, "quota_limited", r["mode"])
	require.Equal(t, true, r["isValid"])
	require.Equal(t, "team", r["planName"])
	require.Equal(t, 6.5, r["remaining"], "the quota leaves 10 - 3.5, below the balance")
	require.Equal(t, 8.5, r["balance"])
	require.Equal(t, map[string]any{"limit": 10.0, "used": 3.5, "remaining": 6.5, "unit": "USD"}, r["quota"])
	require.Equal(t, []any{map[string]any{"type": "rpm", "window": "1m", "limit": 60.0, "used": 0.0, "remaining": 60.0}}, r["rate_limits"])
	u := r["usage"].(map[string]any)
	require.Equal(t, map[string]any{"requests": 1.0, "input_tokens": 100.0, "output_tokens": 20.0, "cache_creation_tokens": 0.0, "cache_read_tokens": 5.0, "total_tokens": 125.0, "cost": 1.5}, u["today"])
	require.Equal(t, 2.0, u["total"].(map[string]any)["requests"])
	require.Equal(t, 3.5, u["total"].(map[string]any)["cost"])

	// Without caps the balance is what remains; a spent quota leaves 0 but the key stays valid.
	e.exec(`UPDATE api_keys SET quota_limit = 0, rpm_limit = 0 WHERE id = $1`, id)
	r = report()
	require.Equal(t, "unrestricted", r["mode"])
	require.Equal(t, 8.5, r["remaining"])
	require.NotContains(t, r, "quota")
	e.exec(`UPDATE api_keys SET quota_limit = 3 WHERE id = $1`, id)
	r = report()
	require.Equal(t, 0.0, r["remaining"])
	require.Equal(t, true, r["isValid"])
}
