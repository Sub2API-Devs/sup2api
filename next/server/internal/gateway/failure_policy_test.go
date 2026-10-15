package gateway

import (
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"strings"
	"sync/atomic"
	"testing"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/stretchr/testify/require"
	"github.com/tidwall/gjson"

	pluginv1 "github.com/Sub2API-Devs/sup2api/next/sdk/gen/pluginv1"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/core"
)

func testFailurePolicy() FailurePolicy {
	p := defaultFailurePolicy()
	p.Revision, p.RetryEnabled, p.BackoffMS, p.RespectRetryAfter = 1, true, 0, false
	p.RetryRules = []FailureRule{{ID: "retry", Name: "Retry HTTP", Enabled: true,
		Match: FailureMatch{Source: "upstream", StatusCodes: "429,500-599"}, Action: failureReset, Egress: "same_proxy"}}
	return p
}

func (e *env) setFailurePolicy(p FailurePolicy) {
	e.t.Helper()
	require.Empty(e.t, p.validate(e.t.Context()))
	e.gw.settings.mu.Lock()
	defer e.gw.settings.mu.Unlock()
	o := *e.gw.settings.override
	o.failurePolicy = &p
	e.gw.settings.override = &o
}

func TestFailurePolicyMatchConditions(t *testing.T) {
	for _, tc := range []struct {
		name, status, text, mode string
		keywords                 []string
		want                     bool
	}{
		{"status only", "429", "anything", "all", nil, true},
		{"blank keywords", "429", "anything", "all", []string{" ", ""}, true},
		{"and mismatch", "429", "anything", "all", []string{"quota"}, false},
		{"and match case", "429", "QUOTA exceeded", "all", []string{" quota "}, true},
		{"or status", "429", "anything", "any", []string{"quota"}, true},
		{"or keyword", "500-599", "quota exceeded", "any", []string{"quota"}, true},
		{"keyword only", "", "quota exceeded", "all", []string{"quota"}, true},
		{"range misses", "500-599", "anything", "all", nil, false},
	} {
		t.Run(tc.name, func(t *testing.T) {
			p := testFailurePolicy()
			p.RetryRules[0].Match.StatusCodes, p.RetryRules[0].Match.Keywords, p.RetryRules[0].Match.Mode = tc.status, tc.keywords, tc.mode
			require.Empty(t, p.validate(t.Context()))
			d := p.decide(FailureFacts{Source: "upstream", Status: 429, Text: tc.text})
			require.Equal(t, tc.want, d.Action == failureReset)
		})
	}
	p := testFailurePolicy()
	p.RetryRules[0].Match.StatusCodes = ""
	require.NotEmpty(t, p.validate(t.Context()))
	p.RetryRules[0].Match.Source = "transport"
	require.Empty(t, p.validate(t.Context()))
	require.Equal(t, failureReset, p.decide(FailureFacts{Source: "transport"}).Action)
	require.Equal(t, failureReturn, p.decide(FailureFacts{Source: "upstream", Status: 502}).Action)
}

func TestFailurePolicyPriorityAndScope(t *testing.T) {
	p := testFailurePolicy()
	exception := p.RetryRules[0]
	exception.ID, exception.Action = "exception", failureReturn
	exception.Match.Groups, exception.Match.Models, exception.Match.Protocols = []int64{7}, []string{"claude-*"}, []string{"anthropic"}
	p.RetryRules = append([]FailureRule{exception}, p.RetryRules...)
	require.Empty(t, p.validate(t.Context()))
	d := p.decide(FailureFacts{Source: "upstream", Status: 503, GroupID: 7, Model: "claude-test", Protocol: "anthropic"})
	require.Equal(t, "exception", d.RetryRule)
	d = p.decide(FailureFacts{Source: "upstream", Status: 503, GroupID: 8, Model: "claude-test", Protocol: "anthropic"})
	require.Equal(t, "retry", d.RetryRule)
}

func TestFailurePolicyCoreControlsRetries(t *testing.T) {
	for _, tc := range []struct {
		name     string
		enabled  bool
		max      int
		action   string
		expected []string
	}{
		{"off", false, 2, failureReset, []string{"acc-1"}},
		{"zero", true, 0, failureReset, []string{"acc-1"}},
		{"switch", true, 2, failureReset, []string{"acc-1", "acc-2"}},
		{"same then switch", true, 2, failureRetry, []string{"acc-1", "acc-1", "acc-2"}},
		{"budget shared", true, 1, failureRetry, []string{"acc-1", "acc-1"}},
	} {
		t.Run(tc.name, func(t *testing.T) {
			e := newEnv(t)
			p := testFailurePolicy()
			p.RetryEnabled, p.MaxRetries = tc.enabled, tc.max
			p.RetryRules[0].Action, p.RetryRules[0].SameAccountRetries, p.RetryRules[0].ExhaustedAction = tc.action, 1, failureReset
			e.setFailurePolicy(p)
			e.plat.classifyHook = func(*pluginv1.ClassifyErrorRequest, *pluginv1.ClassifyErrorResponse) {
				t.Error("core policy called plugin classifier")
			}
			e.up.set("acc-1", &upstreamRule{status: 503})
			r := e.messages(body(testModel, false))
			require.Equal(t, tc.expected, e.up.keys())
			want := 503
			if tc.expected[len(tc.expected)-1] == "acc-2" {
				want = 200
			}
			require.Equal(t, want, r.status)
			require.NotEmpty(t, e.record().FailurePolicy)
		})
	}
}

func TestFailurePolicyDisableIsIndependent(t *testing.T) {
	for _, tc := range []struct {
		name                   string
		enabled, optOut, retry bool
		disabled               bool
		attempts               int
	}{
		{"disabled feature", false, false, false, false, 1},
		{"account opts out", true, true, false, false, 1},
		{"disable without retry", true, false, false, true, 1},
		{"retry without disable", false, false, true, false, 2},
		{"both", true, false, true, true, 2},
	} {
		t.Run(tc.name, func(t *testing.T) {
			e := newEnv(t)
			p := testFailurePolicy()
			p.AccountEnabled, p.RetryEnabled = tc.enabled, tc.retry
			p.AccountRules = []FailureRule{{ID: "disable", Name: "Disable", Enabled: true, Match: FailureMatch{Source: "upstream", StatusCodes: "429"}, Action: "disable"}}
			e.setFailurePolicy(p)
			e.accounts.noAutoDisable[1] = tc.optOut
			e.up.set("acc-1", &upstreamRule{status: 429})
			e.messages(body(testModel, false))
			_, disabled := e.accounts.disabled[1]
			require.Equal(t, tc.disabled, disabled)
			require.Empty(t, e.accounts.cooldowns, "disabled policy must not fall back to cooldown")
			require.Len(t, e.up.keys(), tc.attempts)
		})
	}
}

func TestFailurePolicyStickyResetAndPreserve(t *testing.T) {
	for _, action := range []string{failureSwitch, failureReset} {
		t.Run(action, func(t *testing.T) {
			e := newEnv(t)
			e.enableSticky(onFailureStick)
			p := testFailurePolicy()
			p.RetryRules[0].Action = action
			e.setFailurePolicy(p)
			sess := withSession(body(testModel, false), "user_test_account__session_policy")
			require.Equal(t, 200, e.messages(sess).status)
			e.record()
			var key string
			for _, k := range e.mr.Keys() {
				if strings.HasPrefix(k, "sticky:claude-code-session:") {
					key = k
				}
			}
			require.NotEmpty(t, key)
			before, err := e.rdb.Get(t.Context(), key).Result()
			require.NoError(t, err)
			require.Equal(t, int64(1), bindingAccount(before))
			e.up.set("acc-1", &upstreamRule{status: 503})
			require.Equal(t, 200, e.messages(sess).status)
			e.record()
			after, err := e.rdb.Get(t.Context(), key).Result()
			require.NoError(t, err)
			if action == failureSwitch {
				require.Equal(t, before, after)
			} else {
				require.Equal(t, int64(2), bindingAccount(after))
			}
		})
	}
}

func TestFailurePolicyStickyCAS(t *testing.T) {
	e := newEnv(t)
	p := testFailurePolicy()
	c := &call{g: e.gw, failurePolicy: &p}
	first := &stickySession{key: "policy-cas", ttl: time.Hour}
	require.NoError(t, c.readPolicyBinding(t.Context(), first))
	late := *first
	c.sticky = first
	require.NoError(t, c.resetPolicyBinding(t.Context()))
	require.NoError(t, c.writePolicyBinding(t.Context(), first, 2))
	require.Error(t, c.writePolicyBinding(t.Context(), &late, 1))
	raw, _ := e.rdb.Get(t.Context(), first.key).Result()
	require.Equal(t, int64(2), bindingAccount(raw))
	e.mr.FastForward(2 * time.Hour)
	require.Error(t, c.writePolicyBinding(t.Context(), first, 1), "expired generation must not resurrect")
}

func TestFailurePolicyEgressConstraint(t *testing.T) {
	for _, tc := range []struct {
		mode string
		want []string
	}{
		{"same_proxy", []string{"acc-1"}}, {"proxy_only", []string{"acc-1", "acc-3"}}, {"account_configured", []string{"acc-1", "acc-2"}},
	} {
		t.Run(tc.mode, func(t *testing.T) {
			e := newEnv(t)
			one, two := int64(10), int64(20)
			e.accounts.accounts[1].ProxyID, e.accounts.accounts[3].ProxyID = &one, &two
			p := testFailurePolicy()
			p.RetryRules[0].Egress = tc.mode
			e.setFailurePolicy(p)
			e.up.set("acc-1", &upstreamRule{status: 503})
			e.messages(body(testModel, false))
			require.Equal(t, tc.want, e.up.keys())
		})
	}
}

func TestFailurePolicyWaitAndUnsafeTransport(t *testing.T) {
	t.Run("Retry-After exceeds budget", func(t *testing.T) {
		e := newEnv(t)
		p := testFailurePolicy()
		p.RespectRetryAfter, p.MaxWaitMS = true, 1
		e.setFailurePolicy(p)
		e.up.set("acc-1", &upstreamRule{status: 429})
		require.Equal(t, 429, e.messages(body(testModel, false)).status)
		require.Len(t, e.up.keys(), 1)
		require.Contains(t, e.record().FailurePolicy, "wait_budget")
	})
	t.Run("received request without response is not replayed", func(t *testing.T) {
		var calls atomic.Int32
		up := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			calls.Add(1)
			conn, _, _ := w.(http.Hijacker).Hijack()
			conn.Close()
		}))
		defer up.Close()
		e := newEnv(t)
		e.plat.base = up.URL
		p := testFailurePolicy()
		p.RetryRules[0].Match.Source = "transport"
		p.RetryRules[0].Match.StatusCodes = ""
		e.setFailurePolicy(p)
		require.Equal(t, 502, e.messages(body(testModel, false)).status)
		require.Equal(t, int32(1), calls.Load())
		require.Contains(t, e.record().FailurePolicy, "outcome_uncertain")
	})
}

func TestFailurePolicyCommittedAndHardReturn(t *testing.T) {
	for _, committed := range []bool{false, true} {
		e := newEnv(t)
		p := testFailurePolicy()
		require.Empty(t, p.validate(t.Context()))
		w := httptest.NewRecorder()
		gc, _ := gin.CreateTestContext(w)
		gc.Request = httptest.NewRequest("POST", "/", nil)
		if committed {
			gc.Writer.WriteHeaderNow()
		}
		c := &call{g: e.gw, c: gc, failurePolicy: &p, rec: &core.UsageRecord{}}
		res := c.classifyFailure(t.Context(), 1, 503, nil, nil, "", false)
		if !committed {
			res.kind = attemptReturn
		}
		res = c.planFailure(t.Context(), &core.AccountRef{ID: 1}, res, 1, map[int64]bool{})
		require.Equal(t, attemptReturn, res.kind)
	}
}

func TestFailurePolicyAPI(t *testing.T) {
	e := newDBEnv(t)
	code, v := e.api("GET", "/settings/failure-policy", nil)
	require.Equal(t, 200, code)
	require.False(t, v.Get("data.configured").Bool())
	p := testFailurePolicy()
	p.Revision = 0
	p.RetryRules[0].Match.Keywords = []string{"", " "}
	code, v = e.api("PUT", "/settings/failure-policy", publishFailurePolicy{Policy: p})
	require.Equal(t, 200, code, v.Raw)
	require.Equal(t, int64(1), v.Get("data.policy.revision").Int())
	require.Empty(t, v.Get("data.policy.retry_rules.0.match.keywords").Array())
	code, _ = e.api("PUT", "/settings/failure-policy", publishFailurePolicy{Policy: p})
	require.Equal(t, 409, code)
	code, _ = e.api("PUT", "/settings/gateway", map[string]any{"max_attempts": 4})
	require.Equal(t, 409, code)
	code, _ = e.api("PUT", "/settings/gateway", map[string]any{"platform_call_timeout_ms": 3000})
	require.Equal(t, 200, code)
	code, _ = e.api("PUT", "/settings/auto-disable", map[string]any{"enabled": false})
	require.Equal(t, 409, code)
	code, v = e.api("POST", "/settings/failure-policy/preview", map[string]any{"policy": p, "facts": FailureFacts{Source: "upstream", Status: 503}})
	require.Equal(t, 200, code)
	require.Equal(t, failureReset, v.Get("data.decision.action").String())
	p.RetryEnabled = false
	code, v = e.api("PUT", "/settings/failure-policy", publishFailurePolicy{ExpectedRevision: 1, Policy: p})
	require.Equal(t, 200, code, v.Raw)
	code, v = e.api("GET", "/settings/failure-policy/history", nil)
	require.Equal(t, 200, code)
	require.Equal(t, int64(1), v.Get("data.policies.0.revision").Int())
	require.False(t, e.gw.settings.get(t.Context()).failurePolicy.RetryEnabled)
	_, err := e.db.Pool.Exec(t.Context(), `UPDATE settings SET value='{"revision":3,"schema_version":99}' WHERE key='failure_policy'`)
	require.NoError(t, err)
	e.gw.settings.invalidate()
	require.Error(t, e.gw.settings.get(t.Context()).failurePolicyErr)
}

func TestFailurePolicySnapshotFrozen(t *testing.T) {
	e := newEnv(t)
	p := testFailurePolicy()
	e.setFailurePolicy(p)
	old := e.gw.settings.get(context.Background())
	p.RetryEnabled = false
	p.Revision = 2
	e.setFailurePolicy(p)
	require.True(t, old.failurePolicy.RetryEnabled)
	raw, err := json.Marshal(old.failurePolicy)
	require.NoError(t, err)
	require.Equal(t, int64(1), gjson.GetBytes(raw, "revision").Int())
}

func TestFailurePolicyRechecksChangedCandidateModels(t *testing.T) {
	e := newEnv(t)
	e.setFailurePolicy(testFailurePolicy())
	e.up.set("acc-1", &upstreamRule{status: 503})
	e.plat.buildHook = func(_ context.Context, in *pluginv1.BuildUpstreamRequestRequest) error {
		if in.Account.Id == 1 {
			e.accounts.mu.Lock()
			e.accounts.accounts[2].Models = []string{"another-model"}
			e.accounts.mu.Unlock()
		}
		return nil
	}
	require.Equal(t, 200, e.messages(body(testModel, false)).status)
	require.Equal(t, []string{"acc-1", "acc-3"}, e.up.keys())
}

func TestFailurePolicyRejectsNullBudgets(t *testing.T) {
	for _, field := range []string{"max_retries", "backoff_ms", "max_wait_ms"} {
		raw, err := json.Marshal(testFailurePolicy())
		require.NoError(t, err)
		var fields map[string]any
		require.NoError(t, json.Unmarshal(raw, &fields))
		fields[field] = nil
		raw, err = json.Marshal(fields)
		require.NoError(t, err)
		var parsed FailurePolicy
		require.Error(t, json.Unmarshal(raw, &parsed))
	}
}

func TestFailurePolicyStickyAllAccountsFail(t *testing.T) {
	e := newEnv(t)
	e.enableSticky(onFailureStick)
	e.setFailurePolicy(testFailurePolicy())
	body := withSession(body(testModel, false), "user_test_account__session_allfail")
	require.Equal(t, 200, e.messages(body).status)
	e.record()
	for _, key := range []string{"acc-1", "acc-2", "acc-3"} {
		e.up.set(key, &upstreamRule{status: 503})
	}
	require.Equal(t, 503, e.messages(body).status)
	for _, key := range e.mr.Keys() {
		if strings.HasPrefix(key, "sticky:claude-code-session:") {
			raw, _ := e.rdb.Get(t.Context(), key).Result()
			require.Zero(t, bindingAccount(raw))
		}
	}
}

func TestFailurePolicyCannotRelaxEgressInLaterRules(t *testing.T) {
	e := newEnv(t)
	one, two := int64(10), int64(20)
	e.accounts.accounts[1].ProxyID, e.accounts.accounts[2].ProxyID, e.accounts.accounts[3].ProxyID = &one, &one, &two
	p := testFailurePolicy()
	p.RetryRules[0].Match.StatusCodes = "503"
	loose := p.RetryRules[0]
	loose.ID, loose.Match.StatusCodes, loose.Egress = "loose", "429", "account_configured"
	p.RetryRules = append(p.RetryRules, loose)
	e.setFailurePolicy(p)
	e.up.set("acc-1", &upstreamRule{status: 503})
	e.up.set("acc-2", &upstreamRule{status: 429})
	require.Equal(t, 429, e.messages(body(testModel, false)).status)
	require.Equal(t, []string{"acc-1", "acc-2"}, e.up.keys())
}

func TestFailurePolicyOldRequestCannotOverwriteNewBinding(t *testing.T) {
	e := newEnv(t)
	old := &stickySession{rule: &stickyRule{Name: "test"}, key: "policy-old", ttl: time.Hour, policyValue: "1", bound: 1}
	require.NoError(t, e.rdb.Set(t.Context(), old.key, "1", time.Hour).Err())
	p := testFailurePolicy()
	newCall := &call{g: e.gw, failurePolicy: &p}
	newBinding := &stickySession{key: old.key, ttl: time.Hour}
	require.NoError(t, newCall.readPolicyBinding(t.Context(), newBinding))
	require.NoError(t, newCall.writePolicyBinding(t.Context(), newBinding, 2))
	oldCall := &call{g: e.gw, sticky: old, rec: &core.UsageRecord{}}
	oldCall.finishSticky(t.Context(), 1, true)
	oldCall.dropBinding(t.Context(), old)
	raw, _ := e.rdb.Get(t.Context(), old.key).Result()
	require.Equal(t, int64(2), bindingAccount(raw))
}
