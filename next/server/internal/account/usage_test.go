package account

import (
	"strings"
	"testing"
	"time"

	"github.com/shopspring/decimal"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

// Periods are counted from the anchor (default: 2024-01-01 00:00, a Monday,
// local time), in multiples of period_count; months follow the calendar.
func TestUsageLimitWindow(t *testing.T) {
	local := func(y int, m time.Month, d, h int) time.Time { return time.Date(y, m, d, h, 0, 0, 0, time.Local) }
	anchor := local(2026, 1, 31, 8)
	for _, tc := range []struct {
		name       string
		limit      UsageLimit
		now        time.Time
		start, end time.Time
	}{
		{"day, default anchor", UsageLimit{Period: usagePeriodDay, PeriodCount: 1}, local(2026, 10, 31, 15), local(2026, 10, 31, 0), local(2026, 11, 1, 0)},
		{"week starts on Monday", UsageLimit{Period: usagePeriodWeek, PeriodCount: 1}, local(2026, 10, 31, 15), local(2026, 10, 26, 0), local(2026, 11, 2, 0)},
		{"month", UsageLimit{Period: usagePeriodMonth, PeriodCount: 1}, local(2026, 10, 31, 15), local(2026, 10, 1, 0), local(2026, 11, 1, 0)},
		{"two months from an anchor", UsageLimit{Period: usagePeriodMonth, PeriodCount: 2, Anchor: &anchor}, local(2026, 6, 15, 0), local(2026, 5, 31, 8), local(2026, 7, 31, 8)},
		{"six hours, before the anchor", UsageLimit{Period: usagePeriodHour, PeriodCount: 6, Anchor: &anchor}, local(2026, 1, 31, 3), local(2026, 1, 31, 2), local(2026, 1, 31, 8)},
	} {
		t.Run(tc.name, func(t *testing.T) {
			start, end := tc.limit.window(tc.now)
			assert.True(t, tc.start.Equal(start), "start %s, want %s", start, tc.start)
			require.NotNil(t, end)
			assert.True(t, tc.end.Equal(*end), "end %s, want %s", *end, tc.end)
		})
	}
	start, end := UsageLimit{Period: usagePeriodNone, PeriodCount: 1}.window(time.Now())
	assert.Equal(t, int64(0), start.Unix(), "a lifetime limit counts everything")
	assert.Nil(t, end, "and never resets")
}

// A usage limit auto-disables the account until the period ends, in the basis
// the raw-ratio switch picks; raising the limit brings it back, "reset status"
// lets it run for the rest of the period, and a lifetime limit has no release.
func TestUsageLimitDisablesAndRecovers(t *testing.T) {
	e := setup(t)
	ctx := t.Context()
	id := e.mkRawAccount("anthropic", "apikey", "usage", "sk-good-key-123", true)
	_, err := e.db.Pool.Exec(ctx, `INSERT INTO usage_logs (request_id, user_id, api_key_id, group_id, account_id, protocol, endpoint, status_code, success,
		total_cost, billing_status, billing_detail, rate_multiplier, input_tokens, output_tokens)
		VALUES ('u1', 1, 1, 1, $1, 'anthropic.messages', '/v1/messages', 200, true, 6, 'billed', '{"cost":"5"}', 1.2, 100, 20)`, id)
	require.NoError(t, err)
	account := func() map[string]any {
		t.Helper()
		code, body := e.do("GET", "/accounts/"+itoa(id), nil)
		require.Equal(t, 200, code, body)
		return data(body)
	}
	putLimit := func(body map[string]any) map[string]any {
		t.Helper()
		code, out := e.do("PUT", "/accounts/"+itoa(id)+"/usage-limit", body)
		require.Equal(t, 200, code, out)
		return data(out)
	}
	num := func(v any) string {
		t.Helper()
		d, err := decimal.NewFromString(v.(string))
		require.NoError(t, err)
		return d.String()
	}

	usage := account()["usage"].(map[string]any)
	total := usage["total"].(map[string]any)
	assert.Equal(t, "6", num(total["cost"]))
	assert.Equal(t, "5", num(total["raw_cost"]))
	assert.EqualValues(t, 1, total["requests"])
	assert.EqualValues(t, 120, total["tokens"])
	assert.Nil(t, usage["limit"])

	detail := putLimit(map[string]any{"raw_cost_accounting": true, "enabled": true, "amount": "5", "period": "day", "period_count": 1})
	assert.Equal(t, "5", num(detail["limit"].(map[string]any)["used"]), "raw cost: billing_detail.cost")
	a := account()
	assert.Equal(t, "auto_disabled", a["status"])
	assert.True(t, strings.HasPrefix(a["status_reason"].(string), usageLimitReason), a["status_reason"])
	_, end := UsageLimit{Period: usagePeriodDay, PeriodCount: 1}.window(time.Now())
	until, err := time.Parse(time.RFC3339, a["auto_disabled_until"].(string))
	require.NoError(t, err)
	assert.True(t, end.Equal(until), "released when the day ends: %s, want %s", until, *end)

	putLimit(map[string]any{"raw_cost_accounting": true, "enabled": true, "amount": "5.5", "period": "day", "period_count": 1})
	assert.Equal(t, "active", account()["status"], "raw 5 is under 5.5")
	putLimit(map[string]any{"raw_cost_accounting": false, "enabled": true, "amount": "5.5", "period": "day", "period_count": 1})
	assert.Equal(t, "auto_disabled", account()["status"], "charged 6 is over 5.5")

	code, _ := e.do("POST", "/accounts/"+itoa(id)+"/reset-status", nil)
	require.Equal(t, 200, code)
	require.NoError(t, e.svc.EnforceUsageLimits(ctx, nil))
	assert.Equal(t, "active", account()["status"], "released by hand for the rest of the period")

	putLimit(map[string]any{"enabled": true, "amount": "6", "period": "none", "period_count": 1})
	a = account()
	assert.Equal(t, "auto_disabled", a["status"], "saving ends the early release; a lifetime limit of 6 is reached")
	assert.Nil(t, a["auto_disabled_until"], "a lifetime limit has no release time")
	putLimit(map[string]any{"enabled": false, "amount": "6", "period": "none", "period_count": 1})
	assert.Equal(t, "active", account()["status"], "turned off")

	code, out := e.do("PUT", "/accounts/"+itoa(id)+"/usage-limit", map[string]any{"enabled": true, "amount": "0", "period": "year", "period_count": 0})
	assert.Equal(t, 400, code, out)

	_, err = e.db.Pool.Exec(ctx, `UPDATE accounts SET status = 'auto_disabled', status_reason = 'upstream says no' WHERE id = $1`, id)
	require.NoError(t, err)
	require.NoError(t, e.svc.EnforceUsageLimits(ctx, nil))
	assert.Equal(t, "upstream says no", account()["status_reason"], "never touches another auto-disable")
}
