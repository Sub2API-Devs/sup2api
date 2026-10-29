package gateway

import (
	"context"
	"strings"
	"testing"
	"time"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"

	pluginv1 "github.com/Sub2API-Devs/sup2api/next/sdk/gen/pluginv1"
)

// CONTRACTS §42: only administrator rules can disable an account for good;
// a plugin may disable it until a release time (§69). The global switch and
// the account's auto_disable still decide.

type automaticStateAccounts struct {
	*fakeAccounts
	received *pluginv1.AccountAutomaticState
}

func (a *automaticStateAccounts) ApplyAccountAutomaticState(ctx context.Context, id int64, state *pluginv1.AccountAutomaticState) (*pluginv1.SetAccountAutomaticStateResponse, error) {
	a.received = state
	blocked, err := a.AutoDisable(ctx, id, state.GetReason())
	out := &pluginv1.SetAccountAutomaticStateResponse{Status: "active"}
	if blocked {
		out.Status = "auto_disabled"
	}
	return out, err
}

func (a *automaticStateAccounts) ApplyPluginAccountAutomaticState(ctx context.Context, _ string, id int64, state *pluginv1.AccountAutomaticState) (*pluginv1.SetAccountAutomaticStateResponse, error) {
	return a.ApplyAccountAutomaticState(ctx, id, state)
}

func TestPluginDisableIsTemporaryOrNeedsAdministratorRule(t *testing.T) {
	for _, tc := range []struct {
		name   string
		status int
		effect pluginv1.ClassifyErrorResponse_AccountEffect
		timed  bool
	}{
		{"legacy rate limit", 429, pluginv1.ClassifyErrorResponse_ACCOUNT_EFFECT_DISABLE, false},
		{"legacy permission error", 403, pluginv1.ClassifyErrorResponse_ACCOUNT_EFFECT_DISABLE, false},
		{"automatic state", 429, pluginv1.ClassifyErrorResponse_ACCOUNT_EFFECT_UNSPECIFIED, true},
		{"managed rate limit", 429, pluginv1.ClassifyErrorResponse_ACCOUNT_EFFECT_DISABLE, true},
	} {
		t.Run(tc.name, func(t *testing.T) {
			e := newEnv(t)
			accounts := &automaticStateAccounts{fakeAccounts: e.accounts}
			e.gw.d.Accounts = accounts
			c := &call{g: e.gw, autoDisable: defaultAutoDisableSettings()}
			cls := &pluginv1.ClassifyErrorResponse{AccountEffect: tc.effect, Reason: "plugin refusal", CooldownUntilUnix: time.Now().Add(time.Minute).Unix()}
			if tc.timed {
				cls.AutomaticState = &pluginv1.AccountAutomaticState{Action: pluginv1.AccountAutomaticState_ACTION_DISABLE, Reason: "quota exhausted", Release: &pluginv1.AccountAutomaticState_UntilUnix{UntilUnix: time.Now().Add(time.Hour).Unix()}}
			}
			c.applyAccountEffect(t.Context(), &pluginv1.Account{Id: 1}, tc.status, nil, "", cls)
			assert.Nil(t, accounts.received)
			if tc.timed {
				// Disabled until the plugin's release time, not cooled down.
				assert.Equal(t, "quota exhausted", e.accounts.disabled[1])
				assert.WithinDuration(t, time.Now().Add(time.Hour), e.accounts.releases[1], 2*time.Second)
				assert.Empty(t, e.accounts.cooldowns)
				return
			}
			assert.Empty(t, e.accounts.disabled)
			assert.Equal(t, []int64{1}, e.accounts.cooldowns)
		})
	}
}

func TestAutoDisableRulesExcludeLocalFailuresAndIgnorePluginDeadline(t *testing.T) {
	for _, tc := range []struct {
		status  int
		local   bool
		timed   bool
		expired bool
	}{
		{0, false, false, false}, {429, true, false, false}, {429, false, true, false}, {429, false, true, true},
	} {
		e := newEnv(t)
		accounts := &automaticStateAccounts{fakeAccounts: e.accounts}
		e.gw.d.Accounts = accounts
		c := &call{g: e.gw, autoDisable: AutoDisableSettings{Enabled: true, StatusCodes: "429", Keywords: []string{"rate limit"}}.compiled()}
		cls := &pluginv1.ClassifyErrorResponse{AccountEffect: pluginv1.ClassifyErrorResponse_ACCOUNT_EFFECT_COOLDOWN,
			CooldownUntilUnix: time.Now().Add(time.Second).Unix(), LocalFailure: tc.local}
		if tc.timed {
			cls.AutomaticState = &pluginv1.AccountAutomaticState{Action: pluginv1.AccountAutomaticState_ACTION_DISABLE, Reason: "rate limit",
				Release: &pluginv1.AccountAutomaticState_DurationSeconds{DurationSeconds: 3600}}
		}
		if tc.expired {
			require.NotNil(t, cls.AutomaticState)
			cls.AutomaticState.Release = &pluginv1.AccountAutomaticState_UntilUnix{UntilUnix: 1}
		}
		c.applyAccountEffect(t.Context(), &pluginv1.Account{Id: 1}, tc.status, []byte("rate limit"), "rate limit", cls)
		_, disabled := e.accounts.disabled[1]
		assert.Equal(t, tc.timed, disabled)
		assert.Nil(t, accounts.received)
		if tc.timed {
			assert.Equal(t, "matched auto-disable rule: status 429", e.accounts.disabled[1])
		}
	}
}

func TestAutoDisableGlobalSwitchOffCoolsDownInstead(t *testing.T) {
	e := newEnv(t)
	ad := defaultAutoDisableSettings()
	ad.Enabled = false
	e.setAutoDisable(ad)
	e.up.set("acc-1", &upstreamRule{status: 401})
	if r := e.messages(body(testModel, false)); r.status != 200 {
		t.Fatalf("status %d %s", r.status, r.body)
	}
	if _, disabled := e.accounts.disabled[1]; disabled {
		t.Fatal("account disabled with the global switch off")
	}
	if len(e.accounts.cooldowns) != 1 || e.accounts.cooldowns[0] != 1 {
		t.Fatalf("cooldowns %v", e.accounts.cooldowns)
	}
}

func TestAutoDisableAccountOptOutCoolsDownInstead(t *testing.T) {
	e := newEnv(t)
	e.accounts.noAutoDisable[1] = true
	e.up.set("acc-1", &upstreamRule{status: 401})
	if r := e.messages(body(testModel, false)); r.status != 200 {
		t.Fatalf("status %d %s", r.status, r.body)
	}
	if _, disabled := e.accounts.disabled[1]; disabled {
		t.Fatal("opted-out account disabled")
	}
	if len(e.accounts.cooldowns) != 1 || e.accounts.cooldowns[0] != 1 {
		t.Fatalf("cooldowns %v", e.accounts.cooldowns)
	}
	if k := e.up.keys(); strings.Join(k, ",") != "acc-1,acc-2" {
		t.Fatalf("upstream order %v", k)
	}
}

func TestAutoDisableStatusRuleOverridesPluginReturn(t *testing.T) {
	e := newEnv(t)
	ad := defaultAutoDisableSettings()
	ad.StatusCodes = "401,403"
	e.setAutoDisable(ad)
	// The fake plugin returns 403 to the client; the rule disables the
	// account and fails over.
	e.up.set("acc-1", &upstreamRule{status: 403})
	if r := e.messages(body(testModel, false)); r.status != 200 {
		t.Fatalf("status %d %s", r.status, r.body)
	}
	if reason := e.accounts.disabled[1]; reason != "matched auto-disable rule: status 403" {
		t.Fatalf("reason %q", reason)
	}
}

func TestAutoDisableKeywordRule(t *testing.T) {
	e := newEnv(t)
	e.up.set("acc-1", &upstreamRule{status: 400,
		body: `{"type":"error","error":{"type":"invalid_request_error","message":"Your credit balance is too low to access the API"}}`})
	if r := e.messages(body(testModel, false)); r.status != 200 {
		t.Fatalf("status %d %s", r.status, r.body)
	}
	if reason := e.accounts.disabled[1]; !strings.Contains(reason, `keyword "your credit balance is too low"`) {
		t.Fatalf("reason %q", reason)
	}
}

func TestAutoDisableNoRuleKeepsClientError(t *testing.T) {
	e := newEnv(t)
	e.setAutoDisable(AutoDisableSettings{Enabled: true})
	e.up.set("acc-1", &upstreamRule{status: 400,
		body: `{"type":"error","error":{"type":"invalid_request_error","message":"Your credit balance is too low"}}`})
	if r := e.messages(body(testModel, false)); r.status != 400 {
		t.Fatalf("status %d %s", r.status, r.body)
	}
	if len(e.accounts.disabled) != 0 {
		t.Fatalf("disabled %v", e.accounts.disabled)
	}
}

func TestParseStatusRanges(t *testing.T) {
	rs, err := parseStatusRanges(" 503, 401 ,500-502,403, 402 ")
	if err != nil || formatStatusRanges(rs) != "401-403,500-503" {
		t.Fatalf("%v %q", err, formatStatusRanges(rs))
	}
	if rs, err := parseStatusRanges(""); err != nil || len(rs) != 0 {
		t.Fatalf("empty: %v %v", rs, err)
	}
	for _, bad := range []string{"99", "600", "abc", "503-500", "401-"} {
		if _, err := parseStatusRanges(bad); err == nil {
			t.Errorf("%q accepted", bad)
		}
	}
}

func TestAutoDisableInputValidation(t *testing.T) {
	codes, kws := " 403,401 ", []string{" Permission Denied ", "permission denied", "", strings.Repeat("x", 201)}
	in := autoDisableInput{StatusCodes: &codes, Keywords: &kws}
	fe := in.validate(t.Context())
	if len(fe) != 1 || fe[0].Field != "keywords[3]" {
		t.Fatalf("fields %+v", fe)
	}
	if *in.StatusCodes != "401,403" || len(*in.Keywords) != 2 || (*in.Keywords)[0] != "permission denied" {
		t.Fatalf("normalised %q %q", *in.StatusCodes, *in.Keywords)
	}
	bad := "401,abc"
	if fe := (&autoDisableInput{StatusCodes: &bad}).validate(t.Context()); len(fe) != 1 || fe[0].Field != "status_codes" {
		t.Fatalf("fields %+v", fe)
	}
}
