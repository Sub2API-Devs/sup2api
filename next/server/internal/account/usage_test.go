package account

import (
	"strings"
	"testing"
	"time"

	"github.com/shopspring/decimal"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"

	pluginv1 "github.com/Sub2API-Devs/sup2api/next/sdk/gen/pluginv1"
)

// Periods are counted from the anchor (default: 2024-01-01 00:00, a Monday)
// on the wall clock of the limit's time zone, in multiples of period_count:
// days keep midnight across daylight saving, months follow the calendar and
// clamp a day the month lacks.
func TestUsageLimitWindow(t *testing.T) {
	zone := func(name string) func(y int, m time.Month, d, h, min int) time.Time {
		loc, err := time.LoadLocation(name)
		require.NoError(t, err)
		return func(y int, m time.Month, d, h, min int) time.Time { return time.Date(y, m, d, h, min, 0, 0, loc) }
	}
	sh, ny, in := zone("Asia/Shanghai"), zone("America/New_York"), zone("Asia/Kolkata")
	anchor, inAnchor := sh(2026, 1, 31, 8, 0), in(2026, 10, 1, 8, 0)
	limit := func(tz, period string, count int, anchor *time.Time) UsageLimit {
		return UsageLimit{Timezone: tz, Period: period, PeriodCount: count, Anchor: anchor}
	}
	for _, tc := range []struct {
		name       string
		limit      UsageLimit
		now        time.Time
		start, end time.Time
	}{
		{"day, default anchor", limit("Asia/Shanghai", usagePeriodDay, 1, nil), sh(2026, 10, 31, 15, 0), sh(2026, 10, 31, 0, 0), sh(2026, 11, 1, 0, 0)},
		{"week starts on Monday", limit("Asia/Shanghai", usagePeriodWeek, 1, nil), sh(2026, 10, 31, 15, 0), sh(2026, 10, 26, 0, 0), sh(2026, 11, 2, 0, 0)},
		{"month", limit("Asia/Shanghai", usagePeriodMonth, 1, nil), sh(2026, 10, 31, 15, 0), sh(2026, 10, 1, 0, 0), sh(2026, 11, 1, 0, 0)},
		{"two months from an anchor", limit("Asia/Shanghai", usagePeriodMonth, 2, &anchor), sh(2026, 6, 15, 0, 0), sh(2026, 5, 31, 8, 0), sh(2026, 7, 31, 8, 0)},
		{"the 31st falls on Feb 28", limit("Asia/Shanghai", usagePeriodMonth, 1, &anchor), sh(2026, 3, 1, 0, 0), sh(2026, 2, 28, 8, 0), sh(2026, 3, 31, 8, 0)},
		{"six hours, before the anchor", limit("Asia/Shanghai", usagePeriodHour, 6, &anchor), sh(2026, 1, 31, 3, 0), sh(2026, 1, 31, 2, 0), sh(2026, 1, 31, 8, 0)},
		{"day across daylight saving", limit("America/New_York", usagePeriodDay, 1, nil), ny(2026, 7, 1, 0, 30), ny(2026, 7, 1, 0, 0), ny(2026, 7, 2, 0, 0)},
		{"week across daylight saving", limit("America/New_York", usagePeriodWeek, 1, nil), ny(2026, 11, 3, 12, 0), ny(2026, 11, 2, 0, 0), ny(2026, 11, 9, 0, 0)},
		{"half-hour zone", limit("Asia/Kolkata", usagePeriodDay, 1, nil), in(2026, 10, 31, 0, 10), in(2026, 10, 31, 0, 0), in(2026, 11, 1, 0, 0)},
		{"half-hour zone, day from an anchor", limit("Asia/Kolkata", usagePeriodDay, 1, &inAnchor), in(2026, 10, 31, 8, 10), in(2026, 10, 31, 8, 0), in(2026, 11, 1, 8, 0)},
		// Usage is summed in UTC hours: hourly periods start on one.
		{"hours of a half-hour zone follow UTC hours", limit("Asia/Kolkata", usagePeriodHour, 6, &inAnchor), in(2026, 10, 1, 13, 40), in(2026, 10, 1, 13, 30), in(2026, 10, 1, 19, 30)},
		{"unknown zone reads as UTC", limit("", usagePeriodDay, 1, nil), time.Date(2026, 10, 31, 15, 0, 0, 0, time.UTC),
			time.Date(2026, 10, 31, 0, 0, 0, 0, time.UTC), time.Date(2026, 11, 1, 0, 0, 0, 0, time.UTC)},
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
	require.NoError(t, foldUsage(ctx, e.db.Pool), "the trigger journals, the sweep folds")
	account := func() map[string]any {
		t.Helper()
		code, body := e.do("GET", "/accounts/"+itoa(id), nil)
		require.Equal(t, 200, code, body)
		return data(body)
	}
	putLimit := func(body map[string]any) map[string]any {
		t.Helper()
		if _, ok := body["timezone"]; !ok {
			body["timezone"] = "UTC" // required on save (§73.3)
		}
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

	putLimit(map[string]any{"enabled": true, "amount": "5.5", "period": "day", "period_count": 1})
	require.Equal(t, "auto_disabled", account()["status"])
	putLimit(map[string]any{"enabled": true, "amount": "5.5", "period": "week", "period_count": 1})
	a = account()
	assert.True(t, strings.HasSuffix(a["status_reason"].(string), "(per week)"), "still over a changed limit: the reason follows it, %v", a["status_reason"])
	_, end = UsageLimit{Period: usagePeriodWeek, PeriodCount: 1}.window(time.Now())
	until, err = time.Parse(time.RFC3339, a["auto_disabled_until"].(string))
	require.NoError(t, err)
	assert.True(t, end.Equal(until), "and so does the release time: %s, want %s", until, *end)
	assert.Equal(t, true, a["usage"].(map[string]any)["limit_disabled"])

	clear := &pluginv1.AccountAutomaticState{Action: pluginv1.AccountAutomaticState_ACTION_CLEAR}
	_, err = e.svc.ApplyPluginAccountAutomaticState(ctx, "anthropic", id, clear)
	require.NoError(t, err)
	assert.Equal(t, "auto_disabled", account()["status"], "a plugin's clear does not lift the limit's disable")

	code, out := e.do("PATCH", "/accounts/"+itoa(id), map[string]any{"status": "active"})
	require.Equal(t, 200, code, out)
	require.NoError(t, e.svc.EnforceUsageLimits(ctx, nil))
	assert.Equal(t, "active", account()["status"], "enabled by hand: released for the rest of the period")

	for _, bad := range []map[string]any{
		{"enabled": true, "amount": "0", "period": "year", "period_count": 0, "timezone": "UTC"},
		{"enabled": true, "amount": "1", "period": "month", "period_count": 13, "timezone": "UTC"},
		{"enabled": true, "amount": "1", "period": "day", "period_count": 1, "anchor": "1900-01-01T00:00:00Z", "timezone": "UTC"},
		{"enabled": true, "amount": "1", "period": "day", "period_count": 1, "timezone": "Local"},
	} {
		code, out = e.do("PUT", "/accounts/"+itoa(id)+"/usage-limit", bad)
		assert.Equal(t, 400, code, out)
	}
	code, out = e.do("PUT", "/accounts/"+itoa(id)+"/usage-limit", map[string]any{"enabled": false, "amount": "5.000000000", "period": "day", "period_count": 1, "timezone": "UTC"})
	assert.Equal(t, 200, code, "trailing zeros are not decimals: %s", out)

	_, err = e.db.Pool.Exec(ctx, `UPDATE accounts SET status = 'auto_disabled', status_reason = 'upstream says no' WHERE id = $1`, id)
	require.NoError(t, err)
	require.NoError(t, e.svc.EnforceUsageLimits(ctx, nil))
	assert.Equal(t, "upstream says no", account()["status_reason"], "never touches another auto-disable")
}

// The limit knows its own disable by auto_disabled_source, not by the reason
// text: a plugin's look-alike reason stays the plugin's, another disable only
// replaces the limit's when it lasts longer, a manual release waives the
// period that caused the disable, and anchors keep their wall-clock hour.
func TestUsageLimitOwnsItsDisable(t *testing.T) {
	e := setup(t)
	ctx := t.Context()
	id := e.mkRawAccount("anthropic", "apikey", "usage-source", "sk-good-key-123", true)
	_, err := e.db.Pool.Exec(ctx, `INSERT INTO usage_logs (request_id, user_id, api_key_id, group_id, account_id, protocol, endpoint, status_code, success,
		total_cost, billing_status, billing_detail, rate_multiplier, input_tokens, output_tokens)
		VALUES ('s1', 1, 1, 1, $1, 'anthropic.messages', '/v1/messages', 200, true, 6, 'billed', '{"cost":"-3"}', 1.2, 100, 20)`, id)
	require.NoError(t, err)
	require.NoError(t, foldUsage(ctx, e.db.Pool))
	account := func() map[string]any {
		t.Helper()
		code, body := e.do("GET", "/accounts/"+itoa(id), nil)
		require.Equal(t, 200, code, body)
		return data(body)
	}
	putLimit := func(body map[string]any) map[string]any {
		t.Helper()
		if _, ok := body["timezone"]; !ok {
			body["timezone"] = "UTC" // required on save (§73.3)
		}
		code, out := e.do("PUT", "/accounts/"+itoa(id)+"/usage-limit", body)
		require.Equal(t, 200, code, out)
		return data(out)
	}
	apply := func(state *pluginv1.AccountAutomaticState) {
		t.Helper()
		_, err := e.svc.ApplyAccountAutomaticState(ctx, id, state)
		require.NoError(t, err)
	}
	disable := func(reason string, seconds int64) *pluginv1.AccountAutomaticState {
		st := &pluginv1.AccountAutomaticState{Action: pluginv1.AccountAutomaticState_ACTION_DISABLE, Reason: reason}
		if seconds > 0 {
			st.Release = &pluginv1.AccountAutomaticState_DurationSeconds{DurationSeconds: seconds}
		}
		return st
	}
	clear := &pluginv1.AccountAutomaticState{Action: pluginv1.AccountAutomaticState_ACTION_CLEAR}

	total := account()["usage"].(map[string]any)["total"].(map[string]any)
	assert.Equal(t, "5", strings.TrimRight(strings.TrimRight(total["raw_cost"].(string), "0"), "."), "a negative billing_detail.cost falls back to cost / multiplier")

	apply(disable(usageLimitReason+": a plugin's words", 0))
	require.NoError(t, e.svc.EnforceUsageLimits(ctx, nil))
	a := account()
	assert.Equal(t, "auto_disabled", a["status"])
	assert.Equal(t, false, a["usage"].(map[string]any)["limit_disabled"], "the reason text does not make it the limit's")
	apply(clear)
	assert.Equal(t, "active", account()["status"], "and the plugin can clear it")

	putLimit(map[string]any{"enabled": true, "amount": "5.5", "period": "day", "period_count": 1})
	a = account()
	require.Equal(t, "auto_disabled", a["status"])
	assert.Equal(t, true, a["usage"].(map[string]any)["limit_disabled"])
	limitReason := a["status_reason"]
	apply(disable("quota exhausted", 60))
	assert.Equal(t, limitReason, account()["status_reason"], "a shorter disable does not replace the limit's")
	apply(disable("banned", 0))
	a = account()
	assert.Equal(t, "banned", a["status_reason"], "a longer one does")
	assert.Equal(t, false, a["usage"].(map[string]any)["limit_disabled"])
	apply(clear)
	require.NoError(t, e.svc.EnforceUsageLimits(ctx, nil))
	assert.Equal(t, limitReason, account()["status_reason"], "and once it ends the limit applies again")

	// Released after its period ended (the sweep had not run yet): the
	// waiver covers the period that disabled it, not the current one.
	_, err = e.db.Pool.Exec(ctx, `UPDATE accounts SET auto_disabled_until = auto_disabled_until - interval '1 day' WHERE id = $1`, id)
	require.NoError(t, err)
	code, out := e.do("POST", "/accounts/"+itoa(id)+"/reset-status", nil)
	require.Equal(t, 200, code, out)
	require.NoError(t, e.svc.EnforceUsageLimits(ctx, nil))
	assert.Equal(t, "auto_disabled", account()["status"], "this period is still over the limit")
	code, out = e.do("POST", "/accounts/"+itoa(id)+"/reset-status", nil)
	require.Equal(t, 200, code, out)
	require.NoError(t, e.svc.EnforceUsageLimits(ctx, nil))
	a = account()
	assert.Equal(t, "active", a["status"], "released for the rest of this period")
	assert.Equal(t, true, a["usage"].(map[string]any)["limit"].(map[string]any)["waived"])

	anchor := func(body map[string]any) string {
		t.Helper()
		putLimit(body)
		code, out := e.do("GET", "/accounts/"+itoa(id)+"/usage-limit", nil)
		require.Equal(t, 200, code, out)
		at, err := time.Parse(time.RFC3339, data(out)["anchor"].(string))
		require.NoError(t, err)
		return at.UTC().Format(time.RFC3339)
	}
	assert.Equal(t, "2026-09-30T18:30:00Z", anchor(map[string]any{"enabled": false, "amount": "0", "period": "day", "period_count": 1,
		"anchor": "2026-10-01T00:20:00+05:30", "timezone": "Asia/Kolkata"}), "floored to the wall-clock hour, not the UTC one")
	assert.Equal(t, "2026-10-01T02:00:00Z", anchor(map[string]any{"enabled": false, "amount": "0", "period": "hour", "period_count": 1,
		"anchor": "2026-10-01T08:00:00+05:30", "timezone": "Asia/Kolkata"}), "hourly periods start on a UTC hour")
}
