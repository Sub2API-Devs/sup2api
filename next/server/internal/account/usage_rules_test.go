package account

import (
	"errors"
	"testing"
	"time"

	"github.com/shopspring/decimal"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"

	pluginv1 "github.com/Sub2API-Devs/sup2api/next/sdk/gen/pluginv1"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/core"
)

// What a save accepts (CONTRACTS §73.3): a time zone is required and GET says
// whether one was ever saved; hours go up to 8784 (the 0064 constraint once
// said 1000 and turned 1001-8784 into a 500); a lifetime limit's period
// count is always 1; an amount may be cleared while the limit is off, has at
// most 8 decimals and must be a number; a constraint the validation misses
// is a field error, not a 500.
func TestUsageLimitSaveRules(t *testing.T) {
	e := setup(t)
	ctx := t.Context()
	id := e.mkRawAccount("anthropic", "apikey", "usage-rules", "sk-good-key-123", true)
	path := "/accounts/" + itoa(id) + "/usage-limit"
	get := func() map[string]any {
		t.Helper()
		code, out := e.do("GET", path, nil)
		require.Equal(t, 200, code, out)
		return data(out)
	}
	put := func(body map[string]any) (int, map[string]any) {
		t.Helper()
		return e.do("PUT", path, body)
	}

	g := get()
	assert.Equal(t, false, g["configured"], "never saved")
	assert.Equal(t, "", g["timezone"], "no zone until one is saved: the console fills in the browser's")
	assert.Equal(t, "month", g["period"])

	code, out := put(map[string]any{"enabled": false, "amount": "1", "period": "day", "period_count": 1})
	assert.Equal(t, 400, code, out)
	assert.Equal(t, []string{"timezone:invalid"}, fieldsOf(out), "a save names its time zone")

	code, out = put(map[string]any{"enabled": false, "amount": "1", "period": "hour", "period_count": 8784, "timezone": "Asia/Shanghai"})
	require.Equal(t, 200, code, out)
	g = get()
	assert.Equal(t, true, g["configured"])
	assert.Equal(t, "Asia/Shanghai", g["timezone"])
	assert.EqualValues(t, 8784, g["period_count"], "366 days of hours")
	code, out = put(map[string]any{"enabled": false, "amount": "1", "period": "hour", "period_count": 8785, "timezone": "UTC"})
	assert.Equal(t, 400, code, out)
	assert.Equal(t, []string{"period_count:invalid"}, fieldsOf(out))
	code, out = put(map[string]any{"enabled": false, "amount": "1", "period": "day", "period_count": 367, "timezone": "UTC"})
	assert.Equal(t, 400, code, out)
	assert.Equal(t, []string{"period_count:invalid"}, fieldsOf(out))

	code, out = put(map[string]any{"enabled": true, "amount": "1", "period": "none", "period_count": 5000, "timezone": "UTC"})
	require.Equal(t, 200, code, out)
	assert.EqualValues(t, 1, get()["period_count"], "a lifetime limit has no periods to count")
	code, out = put(map[string]any{"enabled": true, "amount": "1", "period": "none", "period_count": 0, "timezone": "UTC"})
	require.Equal(t, 200, code, out)

	for _, cleared := range []any{"", "  ", nil} {
		code, out = put(map[string]any{"enabled": false, "amount": cleared, "period": "day", "period_count": 1, "timezone": "UTC"})
		require.Equal(t, 200, code, "an amount cleared while the limit is off: %v", out)
		assert.Equal(t, "0", get()["amount"])
	}
	code, out = put(map[string]any{"enabled": false, "period": "day", "period_count": 1, "timezone": "UTC"})
	require.Equal(t, 200, code, "no amount at all: %v", out)
	code, out = put(map[string]any{"enabled": true, "amount": "", "period": "day", "period_count": 1, "timezone": "UTC"})
	assert.Equal(t, 400, code, out)
	assert.Equal(t, []string{"amount:invalid"}, fieldsOf(out), "turning it on needs an amount")
	for _, bad := range []any{"abc", true, map[string]any{}, "1.123456789", "-1"} {
		code, out = put(map[string]any{"enabled": false, "amount": bad, "period": "day", "period_count": 1, "timezone": "UTC"})
		assert.Equal(t, 400, code, "%v: %v", bad, out)
		assert.Equal(t, []string{"amount:invalid"}, fieldsOf(out), "%v", bad)
	}
	code, out = put(map[string]any{"enabled": true, "amount": 1.12345678, "period": "day", "period_count": 1, "timezone": "UTC"})
	require.Equal(t, 200, code, "a JSON number with 8 decimals: %v", out)
	assert.Equal(t, "1.12345678", get()["amount"])

	_, err := e.db.Pool.Exec(ctx, `UPDATE account_usage_limits SET period_count = 9000 WHERE account_id = $1`, id)
	require.Error(t, err, "the database bound is 1-8784")
	var mapped *core.Error
	require.True(t, errors.As(usageLimitWriteError(ctx, err), &mapped))
	assert.Equal(t, 400, mapped.Status)
	assert.Equal(t, []core.FieldError{{Field: "period_count", Code: "invalid", Message: "value out of range"}}, mapped.Details["fields"])
	_, err = e.db.Pool.Exec(ctx, `UPDATE account_usage_limits SET amount = -1 WHERE account_id = $1`, id)
	require.True(t, errors.As(usageLimitWriteError(ctx, err), &mapped))
	assert.Equal(t, "amount", mapped.Details["fields"].([]core.FieldError)[0].Field)
	other := errors.New("boom")
	assert.Same(t, other, usageLimitWriteError(ctx, other), "anything else passes through")
}

// The sweep reads limits and usage outside a transaction; its write goes
// ahead only while the limit is still the configuration it read. An
// administrator raising the limit in between (another node) must not see the
// account disabled by the old figure.
func TestUsageLimitEnforcesOnlyTheConfigurationItRead(t *testing.T) {
	e := setup(t)
	ctx := t.Context()
	id := e.mkRawAccount("anthropic", "apikey", "usage-stale", "sk-good-key-123", true)
	_, err := e.db.Pool.Exec(ctx, `INSERT INTO usage_logs (request_id, user_id, api_key_id, group_id, account_id, protocol, endpoint, status_code, success,
		total_cost, billing_status, rate_multiplier, input_tokens, output_tokens)
		VALUES ('st1', 1, 1, 1, $1, 'anthropic.messages', '/v1/messages', 200, true, 6, 'billed', 1, 1, 1)`, id)
	require.NoError(t, err)
	require.NoError(t, foldUsage(ctx, e.db.Pool))
	code, out := e.do("PUT", "/accounts/"+itoa(id)+"/usage-limit", map[string]any{"enabled": true, "amount": "10", "period": "day", "period_count": 1, "timezone": "UTC"})
	require.Equal(t, 200, code, out)
	status := func() string {
		t.Helper()
		var s string
		require.NoError(t, e.db.Pool.QueryRow(ctx, `SELECT status FROM accounts WHERE id = $1`, id).Scan(&s))
		return s
	}
	require.Equal(t, "active", status())

	var saved time.Time
	require.NoError(t, e.db.Pool.QueryRow(ctx, `SELECT updated_at FROM account_usage_limits WHERE account_id = $1`, id).Scan(&saved))
	read := UsageLimit{Enabled: true, Amount: decimal.NewFromInt(5), Period: usagePeriodDay, PeriodCount: 1, Timezone: "UTC"}
	states, err := limitStates(ctx, e.db.Pool, map[int64]UsageLimit{id: read}, nil, time.Now())
	require.NoError(t, err)
	require.True(t, states[id].reached(), "6 is over the 5 the sweep read")
	before := saved.Add(-time.Second)
	c := usageCandidate{id: id, name: "usage-stale", pluginKey: "anthropic", typ: "apikey", status: "active", limit: read, limitSaved: &before}
	require.NoError(t, e.svc.enforceUsageLimit(ctx, c, states[id]))
	assert.Equal(t, "active", status(), "the limit was saved again since it was read")

	c.limitSaved = &saved
	require.NoError(t, e.svc.enforceUsageLimit(ctx, c, states[id]))
	assert.Equal(t, "auto_disabled", status(), "control: the same write on the configuration it read goes ahead")
	require.NoError(t, e.svc.EnforceUsageLimits(ctx, nil))
	assert.Equal(t, "active", status(), "and the saved 10 applies again")
}

// A plugin's or failure policy's disable that does not outlast the usage
// limit's is held back, not dropped: once the limit lets the account go
// (raised, turned off, or changed to end first) while that disable still
// runs, the account passes to it. A clear, an expiry or a manual reset drops
// it; a core older than 0070 writing a disable over the limit's (rolling
// upgrade) takes the account from the limit.
func TestUsageLimitHoldsBackShorterDisables(t *testing.T) {
	e := setup(t)
	ctx := t.Context()
	id := e.mkRawAccount("anthropic", "apikey", "usage-deferred", "sk-good-key-123", true)
	_, err := e.db.Pool.Exec(ctx, `INSERT INTO usage_logs (request_id, user_id, api_key_id, group_id, account_id, protocol, endpoint, status_code, success,
		total_cost, billing_status, rate_multiplier, input_tokens, output_tokens)
		VALUES ('d1', 1, 1, 1, $1, 'anthropic.messages', '/v1/messages', 200, true, 6, 'billed', 1, 1, 1)`, id)
	require.NoError(t, err)
	require.NoError(t, foldUsage(ctx, e.db.Pool))
	account := func() map[string]any {
		t.Helper()
		code, body := e.do("GET", "/accounts/"+itoa(id), nil)
		require.Equal(t, 200, code, body)
		return data(body)
	}
	limited := func(a map[string]any) bool { return a["usage"].(map[string]any)["limit_disabled"].(bool) }
	putLimit := func(amount, period string) {
		t.Helper()
		code, out := e.do("PUT", "/accounts/"+itoa(id)+"/usage-limit", map[string]any{"enabled": true, "amount": amount, "period": period, "period_count": 1, "timezone": "UTC"})
		require.Equal(t, 200, code, out)
	}
	reset := func() {
		t.Helper()
		code, out := e.do("POST", "/accounts/"+itoa(id)+"/reset-status", nil)
		require.Equal(t, 200, code, out)
		require.Equal(t, "active", account()["status"])
	}
	disable := func(reason string, seconds int64) {
		t.Helper()
		_, err := e.svc.ApplyAccountAutomaticState(ctx, id, &pluginv1.AccountAutomaticState{Action: pluginv1.AccountAutomaticState_ACTION_DISABLE, Reason: reason,
			Release: &pluginv1.AccountAutomaticState_DurationSeconds{DurationSeconds: seconds}})
		require.NoError(t, err)
	}
	clear := func() {
		t.Helper()
		_, err := e.svc.ApplyAccountAutomaticState(ctx, id, &pluginv1.AccountAutomaticState{Action: pluginv1.AccountAutomaticState_ACTION_CLEAR})
		require.NoError(t, err)
	}
	deferred := func() (bool, string) {
		t.Helper()
		var set bool
		var reason string
		require.NoError(t, e.db.Pool.QueryRow(ctx, `SELECT deferred_auto_disable, deferred_auto_disable_reason FROM accounts WHERE id = $1`, id).Scan(&set, &reason))
		return set, reason
	}

	// A lifetime limit outlasts every timed disable.
	putLimit("5.5", "none")
	a := account()
	require.True(t, limited(a))
	limitReason := a["status_reason"]
	disable("cooldown", 3600)
	a = account()
	assert.Equal(t, limitReason, a["status_reason"], "the limit keeps the account")
	set, reason := deferred()
	assert.True(t, set)
	assert.Equal(t, "cooldown", reason, "and holds the shorter disable back")
	putLimit("100", "none")
	a = account()
	assert.Equal(t, "auto_disabled", a["status"], "raised: the account passes to the disable still running")
	assert.Equal(t, "cooldown", a["status_reason"])
	assert.False(t, limited(a))
	until, err := time.Parse(time.RFC3339, a["auto_disabled_until"].(string))
	require.NoError(t, err)
	assert.WithinDuration(t, time.Now().Add(time.Hour), until, time.Minute)
	set, _ = deferred()
	assert.False(t, set, "no longer held back")
	clear()
	require.Equal(t, "active", account()["status"])

	// A clear drops what the limit held back.
	putLimit("5.5", "none")
	disable("cooldown", 3600)
	clear()
	a = account()
	assert.True(t, limited(a), "a clear does not lift the limit's disable")
	set, _ = deferred()
	assert.False(t, set, "but drops the held-back one")
	putLimit("100", "none")
	assert.Equal(t, "active", account()["status"])

	// One that ended while held back is gone.
	putLimit("5.5", "none")
	disable("cooldown", 3600)
	_, err = e.db.Pool.Exec(ctx, `UPDATE accounts SET deferred_auto_disabled_until = clock_timestamp() - interval '1 second' WHERE id = $1`, id)
	require.NoError(t, err)
	putLimit("100", "none")
	assert.Equal(t, "active", account()["status"], "ended while the limit held the account")

	// A changed limit that now ends before it hands the account over.
	putLimit("5.5", "none")
	disable("cooldown", 7200)
	putLimit("5.5", "hour")
	a = account()
	assert.Equal(t, "cooldown", a["status_reason"], "the hour ends before the cooldown")
	assert.False(t, limited(a))
	clear()

	// A manual reset drops it with the limit's disable.
	putLimit("5.5", "none")
	disable("cooldown", 3600)
	reset()
	set, _ = deferred()
	assert.False(t, set)

	// A core before 0070 (rolling upgrade) writes a disable over the
	// limit's without the source: the account is no longer the limit's.
	putLimit("5.5", "none")
	require.True(t, limited(account()))
	_, err = e.db.Pool.Exec(ctx, `UPDATE accounts SET status_reason = 'old core: banned', auto_disabled_until = clock_timestamp() + interval '1 hour' WHERE id = $1`, id)
	require.NoError(t, err)
	a = account()
	assert.False(t, limited(a), "the old core's disable is not the limit's")
	putLimit("100", "none")
	a = account()
	assert.Equal(t, "auto_disabled", a["status"], "raising the limit does not lift it")
	assert.Equal(t, "old core: banned", a["status_reason"])
}
