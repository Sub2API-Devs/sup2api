package gateway

import (
	"strings"
	"testing"

	"github.com/stretchr/testify/require"
)

func TestUnifiedFailurePolicyStickyAcrossRetryGroups(t *testing.T) {
	for _, reset := range []bool{false, true} {
		t.Run(map[bool]string{true: "reset", false: "preserve"}[reset], func(t *testing.T) {
			e := newEnv(t)
			e.enableSticky(onFailureStick)
			p := unifiedTestPolicy()
			p.ResetSticky = reset
			e.setFailurePolicy(p)
			session := withSession(body(testModel, false), "user_test_account__session_unified")
			require.Equal(t, 200, e.messages(session).status)
			e.record()
			e.up.set("acc-1", &upstreamRule{status: 503})
			e.up.set("acc-2", &upstreamRule{status: 503})
			require.Equal(t, 200, e.messages(session).status)
			require.Equal(t, []string{"acc-1", "acc-1", "acc-1", "acc-1", "acc-2", "acc-2", "acc-3"}, e.up.keys())
			var key string
			for _, candidate := range e.mr.Keys() {
				if strings.HasPrefix(candidate, "sticky:claude-code-session:") {
					key = candidate
				}
			}
			require.NotEmpty(t, key)
			raw, err := e.rdb.Get(t.Context(), key).Result()
			require.NoError(t, err)
			want := int64(1)
			if reset {
				want = 3
			}
			require.Equal(t, want, bindingAccount(raw))
		})
	}
}

func unifiedTestPolicy() FailurePolicy {
	p := testFailurePolicy()
	p.SchemaVersion = 2
	p.MaxRetries, p.RetriesPerAccount = 5, 2
	p.RetryRules[0].Action = failureRetry
	return p
}

func TestUnifiedFailurePolicyRetrySequence(t *testing.T) {
	for _, tc := range []struct {
		name            string
		max, perAccount int
		switchAccount   bool
		want            []string
	}{
		{"five retries in pairs", 5, 2, true, []string{"acc-1", "acc-1", "acc-1", "acc-2", "acc-2", "acc-3"}},
		{"immediate switching", 5, 0, true, []string{"acc-1", "acc-2", "acc-3"}},
		{"no switching", 5, 2, false, []string{"acc-1", "acc-1", "acc-1", "acc-1", "acc-1", "acc-1"}},
		{"zero retries", 0, 2, true, []string{"acc-1"}},
		{"budget before switching", 1, 2, true, []string{"acc-1", "acc-1"}},
		{"maximum budget", 9, 5, true, []string{"acc-1", "acc-1", "acc-1", "acc-1", "acc-1", "acc-1", "acc-2", "acc-2", "acc-2", "acc-2"}},
	} {
		t.Run(tc.name, func(t *testing.T) {
			e := newEnv(t)
			p := unifiedTestPolicy()
			p.MaxRetries, p.RetriesPerAccount, p.SwitchAccount = tc.max, tc.perAccount, tc.switchAccount
			// Old per-rule fields must not override the global plan.
			p.RetryRules[0].SameAccountRetries, p.RetryRules[0].ExhaustedAction = 9, failureReturn
			e.setFailurePolicy(p)
			for _, key := range []string{"acc-1", "acc-2", "acc-3"} {
				e.up.set(key, &upstreamRule{status: 503})
			}
			require.Equal(t, 503, e.messages(body(testModel, false)).status)
			require.Equal(t, tc.want, e.up.keys())
		})
	}
}

func TestUnifiedFailurePolicyBlockedAccount(t *testing.T) {
	for _, action := range []string{"cooldown", "disable"} {
		for _, switching := range []bool{true, false} {
			t.Run(action+map[bool]string{true: "/switch", false: "/stop"}[switching], func(t *testing.T) {
				e := newEnv(t)
				p := unifiedTestPolicy()
				p.AccountEnabled, p.SwitchAccount = true, switching
				p.AccountRules = []FailureRule{{ID: "account", Name: "Account", Enabled: true,
					Match: FailureMatch{Source: "upstream", StatusCodes: "503"}, Action: action, CooldownSeconds: 60}}
				e.setFailurePolicy(p)
				e.up.set("acc-1", &upstreamRule{status: 503})
				e.messages(body(testModel, false))
				want := []string{"acc-1"}
				if switching {
					want = append(want, "acc-2")
				}
				require.Equal(t, want, e.up.keys())
			})
		}
	}
}

func TestUnifiedFailurePolicyOptionalConditions(t *testing.T) {
	for _, match := range []FailureMatch{
		{Source: "upstream", StatusCodes: "429", Keywords: []string{" ", ""}},
		{Source: "upstream", Keywords: []string{" Quota "}},
		{Source: "upstream", StatusCodes: "503", Keywords: []string{"quota"}, Mode: "any"},
		{Source: "upstream", StatusCodes: "429", Keywords: []string{"quota"}, Mode: "all"},
	} {
		p := unifiedTestPolicy()
		p.AccountEnabled = true
		p.RetryRules[0].Match = match
		p.AccountRules = []FailureRule{{ID: "account", Name: "Account", Enabled: true, Match: match, Action: "disable"}}
		require.Empty(t, p.validate(t.Context()))
		d := p.decide(FailureFacts{Source: "upstream", Status: 429, Text: "QUOTA exceeded"})
		require.Equal(t, failureRetry, d.Action)
		require.Equal(t, "disable", d.AccountAction)
	}
}

func TestUnifiedFailurePolicyValidation(t *testing.T) {
	p := unifiedTestPolicy()
	require.Empty(t, p.validate(t.Context()))
	p.RetriesPerAccount = -1
	require.NotEmpty(t, p.validate(t.Context()))
	p.RetriesPerAccount = 10
	require.NotEmpty(t, p.validate(t.Context()))
	p.RetriesPerAccount = 2
	p.RetryRules[0].Action = failureReset
	require.NotEmpty(t, p.validate(t.Context()), "v2 only allows return or the shared retry plan")
}
