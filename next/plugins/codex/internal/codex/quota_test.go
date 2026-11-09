package codex

import (
	"context"
	"strings"
	"testing"

	"google.golang.org/grpc/codes"
	"google.golang.org/grpc/status"

	pluginv1 "github.com/Sub2API-Devs/sup2api/next/sdk/gen/pluginv1"
)

func TestWindowKey(t *testing.T) {
	for minutes, want := range map[int]string{
		300: "5h", 299: "5h", 310: "5h", 10080: "7d", 10000: "7d", 10200: "7d",
		1440: "1d", 43200: "30d", 480: "8h", 90: "90m", 60: "1h",
		0: "", -5: "", 600000: "",
	} {
		if got := windowKey(minutes); got != want {
			t.Errorf("windowKey(%d) = %q, want %q", minutes, got, want)
		}
	}
}

func TestHeaderWindows(t *testing.T) {
	now := testNow
	for _, tc := range []struct {
		name    string
		headers map[string]string
		want    []codexWindow
	}{
		{name: "primary 5h, secondary weekly, reset-after", headers: map[string]string{
			"x-codex-primary-used-percent": "42.5", "x-codex-primary-window-minutes": "300", "x-codex-primary-reset-after-seconds": "600",
			"x-codex-secondary-used-percent": "7", "x-codex-secondary-window-minutes": "10080", "x-codex-secondary-reset-after-seconds": "86400",
		}, want: []codexWindow{
			{Key: "5h", UsedPercent: 42.5, Known: true, ResetAt: now.Unix() + 600},
			{Key: "7d", UsedPercent: 7, Known: true, ResetAt: now.Unix() + 86400},
		}},
		{name: "primary weekly, secondary 5h, reset-at", headers: map[string]string{
			"x-codex-primary-used-percent": "100", "x-codex-primary-window-minutes": "10080", "x-codex-primary-reset-at": "1800500000",
			"x-codex-secondary-used-percent": "3", "x-codex-secondary-window-minutes": "300", "x-codex-secondary-reset-at": "1800010000",
		}, want: []codexWindow{
			{Key: "7d", UsedPercent: 100, Known: true, ResetAt: 1800500000},
			{Key: "5h", UsedPercent: 3, Known: true, ResetAt: 1800010000},
		}},
		{name: "reset-at wins over reset-after, milliseconds", headers: map[string]string{
			"x-codex-primary-used-percent": "1", "x-codex-primary-window-minutes": "300",
			"x-codex-primary-reset-at": "1800010000000", "x-codex-primary-reset-after-seconds": "5",
		}, want: []codexWindow{{Key: "5h", UsedPercent: 1, Known: true, ResetAt: 1800010000}}},
		{name: "no window-minutes: ignored", headers: map[string]string{
			"x-codex-primary-used-percent": "50", "x-codex-primary-reset-after-seconds": "60",
			"x-codex-secondary-used-percent": "10", "x-codex-secondary-window-minutes": "10080",
		}, want: []codexWindow{{Key: "7d", UsedPercent: 10, Known: true}}},
		{name: "missing used-percent: unknown", headers: map[string]string{
			"x-codex-primary-window-minutes": "300", "x-codex-primary-reset-after-seconds": "60",
		}, want: []codexWindow{{Key: "5h", ResetAt: now.Unix() + 60}}},
		{name: "minutes only: ignored", headers: map[string]string{"x-codex-primary-window-minutes": "300"}},
		{name: "unparsable values", headers: map[string]string{
			"x-codex-primary-used-percent": "lots", "x-codex-primary-window-minutes": "300", "x-codex-primary-reset-at": "soon",
			"x-codex-secondary-used-percent": "-3", "x-codex-secondary-window-minutes": "abc",
		}},
		{name: "other length keeps its own key", headers: map[string]string{
			"x-codex-primary-used-percent": "5", "x-codex-primary-window-minutes": "1440",
		}, want: []codexWindow{{Key: "1d", UsedPercent: 5, Known: true}}},
		{name: "same length twice keeps the more used", headers: map[string]string{
			"x-codex-primary-used-percent": "5", "x-codex-primary-window-minutes": "300",
			"x-codex-secondary-used-percent": "80", "x-codex-secondary-window-minutes": "301",
		}, want: []codexWindow{{Key: "5h", UsedPercent: 80, Known: true}}},
		{name: "none", headers: map[string]string{"content-type": "application/json"}},
	} {
		t.Run(tc.name, func(t *testing.T) {
			got := headerWindows(tc.headers, now)
			if len(got) != len(tc.want) {
				t.Fatalf("windows = %+v, want %+v", got, tc.want)
			}
			for i := range got {
				if got[i] != tc.want[i] {
					t.Fatalf("window %d = %+v, want %+v", i, got[i], tc.want[i])
				}
			}
		})
	}
}

func TestBuildQuotaRequest(t *testing.T) {
	p := newTestPlugin(testEndpoints("https://chatgpt.test/"))
	r, err := p.BuildQuotaRequest(context.Background(), &pluginv1.BuildQuotaRequestRequest{
		Account: account(TypeDevice, `{"access_token":" at-1 ","chatgpt_account_id":"acc-9","refresh_token":"rt"}`),
	})
	if err != nil {
		t.Fatal(err)
	}
	if r.GetMethod() != "GET" || r.GetUrl() != "https://chatgpt.test/backend-api/wham/usage" || r.GetBodyJson() != "" {
		t.Fatalf("request = %s %s %q", r.GetMethod(), r.GetUrl(), r.GetBodyJson())
	}
	want := map[string]string{
		"authorization": "Bearer at-1", "chatgpt-account-id": "acc-9", "originator": "sup2api",
		"user-agent": "sup2api-codex/" + Version, "accept": "application/json",
	}
	if len(r.GetHeaders()) != len(want) {
		t.Fatalf("headers = %v", r.GetHeaders())
	}
	for k, v := range want {
		if r.GetHeaders()[k] != v {
			t.Errorf("header %s = %q, want %q", k, r.GetHeaders()[k], v)
		}
	}
	// No Codex client imitation.
	for k, v := range r.GetHeaders() {
		if strings.HasPrefix(k, "x-codex") || strings.Contains(strings.ToLower(v), "codex_cli") || k == "openai-beta" {
			t.Errorf("unexpected header %s: %s", k, v)
		}
	}

	// Without a ChatGPT account id the header is left out.
	r, err = p.BuildQuotaRequest(context.Background(), &pluginv1.BuildQuotaRequestRequest{Account: account(TypeDevice, `{"access_token":"at"}`)})
	if err != nil || r.GetHeaders()["chatgpt-account-id"] != "" {
		t.Fatalf("no account id: %v %v", err, r.GetHeaders())
	}

	for _, tc := range []struct {
		name, typ, creds string
		code             codes.Code
	}{
		{"siwc", TypeSIWC, `{"access_token":"at","client_id":"c"}`, codes.Unimplemented},
		{"no token", TypeDevice, `{"refresh_token":"rt"}`, codes.FailedPrecondition},
		{"bad json", TypeDevice, `{`, codes.InvalidArgument},
	} {
		_, err := p.BuildQuotaRequest(context.Background(), &pluginv1.BuildQuotaRequestRequest{Account: account(tc.typ, tc.creds)})
		if status.Code(err) != tc.code {
			t.Errorf("%s: err = %v, want %v", tc.name, err, tc.code)
		}
	}
}

func TestParseQuotaResponse(t *testing.T) {
	p := newTestPlugin(DefaultEndpoints)
	now := testNow.Unix()
	parse := func(status int32, body string, transport string, truncated bool) *pluginv1.QuotaResult {
		t.Helper()
		r, err := p.ParseQuotaResponse(context.Background(), &pluginv1.ParseQuotaResponseRequest{
			Account: account(TypeDevice, `{}`), Status: status, Body: []byte(body), TransportError: transport, Truncated: truncated,
		})
		if err != nil {
			t.Fatal(err)
		}
		return r
	}
	type win struct {
		key     string
		util    float64
		unknown bool
		reset   int64
		status  string
	}
	check := func(t *testing.T, r *pluginv1.QuotaResult, want ...win) {
		t.Helper()
		if r.GetErrorType() != pluginv1.QuotaResult_ERROR_TYPE_UNSPECIFIED {
			t.Fatalf("error = %v %s", r.GetErrorType(), r.GetErrorMessage())
		}
		if len(r.GetWindows()) != len(want) {
			t.Fatalf("windows = %+v, want %+v", r.GetWindows(), want)
		}
		for i, w := range r.GetWindows() {
			got := win{w.GetKey(), w.GetUtilization(), w.GetUtilizationUnknown(), w.GetResetsAtUnix(), w.GetStatus()}
			if got != want[i] {
				t.Fatalf("window %d = %+v, want %+v", i, got, want[i])
			}
		}
	}

	t.Run("primary 5h, secondary weekly", func(t *testing.T) {
		r := parse(200, `{"plan_type":"plus","rate_limit":{"allowed":true,"limit_reached":false,
			"primary_window":{"used_percent":12,"limit_window_seconds":18000,"reset_after_seconds":3600,"reset_at":1800003600},
			"secondary_window":{"used_percent":40.5,"limit_window_seconds":604800,"reset_after_seconds":500000,"reset_at":1800500000}},
			"credits":{"has_credits":false,"unlimited":false,"balance":null}}`, "", false)
		check(t, r, win{"5h", 12, false, 1800003600, ""}, win{"7d", 40.5, false, 1800500000, ""})
		// The 5-hour reset is an hour away, past the core's 30-minute period: no suggestion.
		if r.GetNextCheckAtUnix() != 0 {
			t.Fatalf("next check = %d", r.GetNextCheckAtUnix())
		}
	})
	t.Run("primary weekly, secondary 5h, full", func(t *testing.T) {
		r := parse(200, `{"rate_limit":{"allowed":false,"limit_reached":true,
			"primary_window":{"used_percent":100,"limit_window_seconds":604800,"reset_at":1800400000},
			"secondary_window":{"used_percent":55,"limit_window_seconds":18000,"reset_after_seconds":600}}}`, "", false)
		check(t, r, win{"7d", 100, false, 1800400000, "rejected"}, win{"5h", 55, false, now + 600, ""})
		if r.GetNextCheckAtUnix() != now+600+60 {
			t.Fatalf("next check = %d, want %d", r.GetNextCheckAtUnix(), now+660)
		}
	})
	t.Run("null windows", func(t *testing.T) {
		check(t, parse(200, `{"rate_limit":{"allowed":true,"primary_window":{"used_percent":3,"limit_window_seconds":18000,"reset_at":1800001000},"secondary_window":null}}`, "", false),
			win{"5h", 3, false, 1800001000, ""})
		check(t, parse(200, `{"rate_limit":{"primary_window":null,"secondary_window":null}}`, "", false))
		check(t, parse(200, `{"rate_limit":null}`, "", false))
		check(t, parse(200, `{}`, "", false))
	})
	t.Run("missing fields", func(t *testing.T) {
		// No window length: ignored. No used_percent: unknown. No reset: 0.
		check(t, parse(200, `{"rate_limit":{"primary_window":{"used_percent":9,"reset_at":1800001000},
			"secondary_window":{"limit_window_seconds":604800}}}`, "", false),
			win{"7d", 0, true, 0, ""})
	})
	t.Run("errors", func(t *testing.T) {
		for _, tc := range []struct {
			name      string
			status    int32
			body      string
			transport string
			truncated bool
			want      pluginv1.QuotaResult_ErrorType
		}{
			{"401", 401, `{"detail":"Unauthorized"}`, "", false, pluginv1.QuotaResult_ERROR_TYPE_AUTH_REJECTED},
			{"403", 403, `{}`, "", false, pluginv1.QuotaResult_ERROR_TYPE_AUTH_REJECTED},
			{"429", 429, `{}`, "", false, pluginv1.QuotaResult_ERROR_TYPE_TRANSIENT},
			{"502", 502, `bad gateway`, "", false, pluginv1.QuotaResult_ERROR_TYPE_TRANSIENT},
			{"transport", 0, ``, "connection reset", false, pluginv1.QuotaResult_ERROR_TYPE_TRANSIENT},
			{"truncated", 200, `{"rate_limit":`, "", true, pluginv1.QuotaResult_ERROR_TYPE_TRANSIENT},
			{"bad json", 200, `<html>`, "", false, pluginv1.QuotaResult_ERROR_TYPE_TRANSIENT},
		} {
			r := parse(tc.status, tc.body, tc.transport, tc.truncated)
			if r.GetErrorType() != tc.want || r.GetErrorMessage() == "" || len(r.GetWindows()) != 0 {
				t.Errorf("%s: %v %q %v", tc.name, r.GetErrorType(), r.GetErrorMessage(), r.GetWindows())
			}
		}
	})
}

// TestQuotaThroughHarness runs the quota RPCs through the SDK server (the
// plugin implements pluginsdk.QuotaReader).
func TestQuotaThroughHarness(t *testing.T) {
	h := startPlugin(t, newTestPlugin(DefaultEndpoints))
	r, err := h.Platform.BuildQuotaRequest(context.Background(), &pluginv1.BuildQuotaRequestRequest{Account: account(TypeDevice, `{"access_token":"at"}`)})
	if err != nil || r.GetUrl() != DefaultChatGPTBase+"/backend-api/wham/usage" {
		t.Fatalf("build = %v %v", r, err)
	}
	q, err := h.Platform.ParseQuotaResponse(context.Background(), &pluginv1.ParseQuotaResponseRequest{Status: 200,
		Body: []byte(`{"rate_limit":{"primary_window":{"used_percent":1,"limit_window_seconds":18000}}}`)})
	if err != nil || len(q.GetWindows()) != 1 || q.GetWindows()[0].GetKey() != "5h" {
		t.Fatalf("parse = %v %v", q, err)
	}
}
