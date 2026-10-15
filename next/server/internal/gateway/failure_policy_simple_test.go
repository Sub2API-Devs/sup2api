package gateway

import (
	"context"
	"encoding/json"
	"testing"
	"time"

	"github.com/stretchr/testify/require"
)

func simpleTestPolicy() FailurePolicy {
	p := unifiedTestPolicy()
	p.SchemaVersion = 3
	return p
}

func TestSimpleFailurePolicyRemovedControls(t *testing.T) {
	e := newEnv(t)
	p := simpleTestPolicy()
	p.ResetSticky, p.Egress, p.MaxWaitMS, p.RespectRetryAfter = false, "same_proxy", 1, true
	p.BackoffMS = 2
	require.Empty(t, p.validate(t.Context()))
	require.True(t, p.ResetSticky)
	require.Equal(t, "account_configured", p.Egress)
	c := &call{g: e.gw, failurePolicy: &p}
	c.failureState.retryAfter = "3600"
	ctx, cancel := context.WithTimeout(t.Context(), time.Second)
	defer cancel()
	require.Empty(t, c.waitForRetry(ctx, 1), "removed Retry-After and wait budget must not stop retries")
	require.Empty(t, c.waitForRetry(ctx, 2))
	canceled, stop := context.WithCancel(t.Context())
	stop()
	require.Equal(t, "canceled", c.waitForRetry(canceled, 1))
	deadline, done := context.WithTimeout(t.Context(), time.Nanosecond)
	defer done()
	require.Equal(t, "deadline", c.waitForRetry(deadline, 1))
}

func TestSimpleFailurePolicyUsesEachAccountsConfiguredProxy(t *testing.T) {
	e := newEnv(t)
	p := simpleTestPolicy()
	p.RetriesPerAccount = 0
	one, two := int64(10), int64(20)
	e.accounts.accounts[1].ProxyID, e.accounts.accounts[2].ProxyID = &one, &two
	e.setFailurePolicy(p)
	e.up.set("acc-1", &upstreamRule{status: 503})
	require.Equal(t, 200, e.messages(body(testModel, false)).status)
	require.Equal(t, []string{"acc-1", "acc-2"}, e.up.keys())
	require.Equal(t, &one, e.accounts.accounts[1].ProxyID)
	require.Equal(t, &two, e.accounts.accounts[2].ProxyID)
}

func TestSimpleFailurePolicyAlwaysDisablesMatchedAccounts(t *testing.T) {
	e := newEnv(t)
	p := simpleTestPolicy()
	p.RetryEnabled, p.AccountEnabled = false, true
	p.AccountRules = []FailureRule{{ID: "disable", Name: "Disable", Enabled: false, Action: "cooldown",
		Match: FailureMatch{Source: "upstream", StatusCodes: "401，403,429,500-599"}}}
	e.setFailurePolicy(p)
	e.up.set("acc-1", &upstreamRule{status: 403})
	require.Equal(t, 403, e.messages(body(testModel, false)).status)
	require.Contains(t, e.accounts.disabled, int64(1))
	require.Empty(t, e.accounts.cooldowns)
	require.Equal(t, []string{"acc-1"}, e.up.keys())
}

func TestSimpleFailurePolicyOptionalInactiveCount(t *testing.T) {
	var p FailurePolicy
	require.NoError(t, json.Unmarshal([]byte(`{"schema_version":3,"switch_account":false,"retries_per_account":null,"max_wait_ms":null}`), &p))
	require.Empty(t, p.validate(t.Context()))
	require.Zero(t, p.RetriesPerAccount)
}
