package classify

import (
	"net/http"
	"testing"
	"time"

	pluginv1 "github.com/Sub2API-Devs/sup2api/next/sdk/gen/pluginv1"
)

func TestEdgeBlock(t *testing.T) {
	now := time.Now()
	for _, tc := range []struct {
		name string
		in   *Input
		want bool
	}{
		{"cf-mitigated header", &Input{Status: 403, Headers: map[string]string{"cf-mitigated": "challenge"}}, true},
		{"html doctype", &Input{Status: 403, Body: []byte("<!doctype html><html>403</html>")}, true},
		{"html tag", &Input{Status: 403, Body: []byte("<html><body>Forbidden</body></html>")}, true},
		{"cloudflare 1010", &Input{Status: 403, Body: []byte("error code: 1010")}, true},
		{"cf challenge marker", &Input{Status: 403, Body: []byte("window._cf_chl_opt = {}")}, true},
		{"json error", &Input{Status: 403, Body: []byte(`{"error":{"message":"forbidden"}}`)}, false},
		{"json array", &Input{Status: 403, Body: []byte(`[{"error":"x"}]`)}, false},
		{"plain text no markers", &Input{Status: 403, Body: []byte("access denied")}, false},
		{"html content-type", &Input{Status: 403, Headers: map[string]string{"content-type": "text/html"}, Body: []byte("<html>x</html>")}, true},
	} {
		t.Run(tc.name, func(t *testing.T) {
			if got := EdgeBlocked(tc.in); got != tc.want {
				t.Errorf("got %v, want %v", got, tc.want)
			}
		})
	}

	// Edge block rule lets the account go through without penalty
	p := Policy{Rules: []Rule{EdgeBlock(), Credentials()}}
	req := &pluginv1.ClassifyErrorRequest{Status: 403, BodyPrefix: []byte("<!doctype html><html>403</html>")}
	resp := p.Classify(now, req)
	if resp.GetAction() != pluginv1.ClassifyErrorResponse_ACTION_FAILOVER ||
		resp.GetAccountEffect() != pluginv1.ClassifyErrorResponse_ACCOUNT_EFFECT_UNSPECIFIED {
		t.Errorf("edge block: %v %v, want failover with no account effect", resp.GetAction(), resp.GetAccountEffect())
	}

	// Real 403 hits the credentials rule
	req.BodyPrefix = []byte(`{"error":{"message":"invalid key"}}`)
	resp = p.Classify(now, req)
	if resp.GetAccountEffect() != pluginv1.ClassifyErrorResponse_ACCOUNT_EFFECT_DISABLE {
		t.Errorf("real 403: effect=%v, want DISABLE", resp.GetAccountEffect())
	}
}

func TestRetryAfter(t *testing.T) {
	now := time.Date(2026, 10, 4, 12, 0, 0, 0, time.UTC)
	for _, tc := range []struct {
		name    string
		headers map[string]string
		want    time.Duration
		wantSrc string
		wantOK  bool
	}{
		{"retry-after-ms", map[string]string{"retry-after-ms": "2500"}, 2*time.Second + 500*time.Millisecond, "retry-after-ms", true},
		{"retry-after seconds", map[string]string{"retry-after": "60"}, 60 * time.Second, "retry-after", true},
		{"retry-after date", map[string]string{"retry-after": now.Add(90 * time.Second).Format(http.TimeFormat)}, 90 * time.Second, "retry-after", true},
		{"both prefer ms", map[string]string{"retry-after-ms": "1500", "retry-after": "99"}, 1500 * time.Millisecond, "retry-after-ms", true},
		{"none", map[string]string{}, 0, "", false},
		{"invalid", map[string]string{"retry-after": "xyz"}, 0, "", false},
	} {
		t.Run(tc.name, func(t *testing.T) {
			in := &Input{Now: now, Headers: tc.headers}
			until, src, ok := RetryAfter(in)
			if ok != tc.wantOK || src != tc.wantSrc {
				t.Errorf("ok=%v src=%q, want %v %q", ok, src, tc.wantOK, tc.wantSrc)
			}
			if ok && until.Sub(now) != tc.want {
				t.Errorf("duration=%v, want %v", until.Sub(now), tc.want)
			}
		})
	}
}

func TestClamp(t *testing.T) {
	now := time.Date(2026, 10, 4, 12, 0, 0, 0, time.UTC)
	if got := Clamp(now, now.Add(-10*time.Second)); got != now.Add(time.Second) {
		t.Errorf("past clamped to %v, want now+1s", got.Sub(now))
	}
	if got := Clamp(now, now.Add(500*time.Millisecond)); got != now.Add(time.Second) {
		t.Errorf("near future clamped to %v, want now+1s", got.Sub(now))
	}
	if got := Clamp(now, now.Add(10*24*time.Hour)); got != now.Add(MaxCooldown) {
		t.Errorf("far future clamped to %v, want MaxCooldown", got.Sub(now))
	}
	if got := Clamp(now, now.Add(2*time.Minute)); got != now.Add(2*time.Minute) {
		t.Errorf("reasonable time changed to %v", got.Sub(now))
	}
}

func TestClassifyBasics(t *testing.T) {
	now := time.Date(2026, 10, 4, 12, 0, 0, 0, time.UTC)
	p := Policy{
		Parse: func(body []byte) Error {
			return Error{Message: string(body), Code: "TEST"}
		},
		ErrorType: func(in *Input) string {
			if in.Status == 429 {
				return "rate_limit_error"
			}
			return "server_error"
		},
		Rules: []Rule{
			{When: Status(401), Effect: Disable, Reason: "auth fail"},
			{When: Status(429), Effect: Cooldown, Cooldown: 30 * time.Second, Reason: "throttled"},
			ServerErrors(10 * time.Second),
		},
	}

	// Transport error
	req := &pluginv1.ClassifyErrorRequest{Status: 0, TransportError: "dial timeout"}
	resp := p.Classify(now, req)
	if resp.GetAction() != pluginv1.ClassifyErrorResponse_ACTION_FAILOVER ||
		resp.GetAccountEffect() != pluginv1.ClassifyErrorResponse_ACCOUNT_EFFECT_COOLDOWN ||
		resp.GetClientStatus() != http.StatusBadGateway {
		t.Errorf("transport: %+v", resp)
	}

	// 401 disable
	req = &pluginv1.ClassifyErrorRequest{Status: 401, BodyPrefix: []byte("unauthorized")}
	resp = p.Classify(now, req)
	if resp.GetAccountEffect() != pluginv1.ClassifyErrorResponse_ACCOUNT_EFFECT_DISABLE ||
		resp.GetClientMessage() != "unauthorized" || !containsString(resp.GetReason(), "auth fail") {
		t.Errorf("401: %+v", resp)
	}

	// 429 cooldown
	req = &pluginv1.ClassifyErrorRequest{Status: 429}
	resp = p.Classify(now, req)
	if resp.GetAccountEffect() != pluginv1.ClassifyErrorResponse_ACCOUNT_EFFECT_COOLDOWN ||
		time.Unix(resp.GetCooldownUntilUnix(), 0).Sub(now) != 30*time.Second ||
		resp.GetClientErrorType() != "rate_limit_error" {
		t.Errorf("429: %+v", resp)
	}

	// 500 server error
	req = &pluginv1.ClassifyErrorRequest{Status: 500}
	resp = p.Classify(now, req)
	if resp.GetAction() != pluginv1.ClassifyErrorResponse_ACTION_FAILOVER ||
		resp.GetAccountEffect() != pluginv1.ClassifyErrorResponse_ACCOUNT_EFFECT_COOLDOWN ||
		time.Unix(resp.GetCooldownUntilUnix(), 0).Sub(now) != 10*time.Second {
		t.Errorf("500: %+v", resp)
	}

	// 400 no rule = return to client
	req = &pluginv1.ClassifyErrorRequest{Status: 400, BodyPrefix: []byte("bad param")}
	resp = p.Classify(now, req)
	if resp.GetAction() != pluginv1.ClassifyErrorResponse_ACTION_RETURN_TO_CLIENT ||
		resp.GetAccountEffect() != pluginv1.ClassifyErrorResponse_ACCOUNT_EFFECT_UNSPECIFIED {
		t.Errorf("400: %+v", resp)
	}
}

func containsString(s, sub string) bool {
	return len(s) > 0 && len(sub) > 0 && (s == sub || len(s) >= len(sub) && (s[:len(sub)] == sub || s[len(s)-len(sub):] == sub || len(s) > len(sub) && stringContains(s, sub)))
}

func stringContains(s, sub string) bool {
	for i := 0; i <= len(s)-len(sub); i++ {
		if s[i:i+len(sub)] == sub {
			return true
		}
	}
	return false
}
