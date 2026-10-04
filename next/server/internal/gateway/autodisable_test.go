package gateway

import (
	"strings"
	"testing"
)

// CONTRACTS §42: plugin verdicts and administrator rules ask to disable an
// account; the global switch and the account's auto_disable decide.

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
