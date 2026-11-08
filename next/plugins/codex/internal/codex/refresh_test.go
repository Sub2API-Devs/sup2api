package codex

import (
	"context"
	"net/url"
	"strings"
	"testing"

	"google.golang.org/grpc/codes"
	"google.golang.org/grpc/status"

	pluginv1 "github.com/Sub2API-Devs/sup2api/next/sdk/gen/pluginv1"
)

func TestBuildRefreshRequest(t *testing.T) {
	h := startPlugin(t, newTestPlugin(DefaultEndpoints))
	ctx := context.Background()

	r, err := h.Platform.BuildRefreshRequest(ctx, &pluginv1.BuildRefreshRequestRequest{Account: account(TypeDevice, deviceCreds)})
	if err != nil {
		t.Fatal(err)
	}
	var body map[string]string
	mustJSON(t, []byte(r.GetBodyJson()), &body)
	if r.GetMethod() != "POST" || r.GetUrl() != "https://auth.openai.com/oauth/token" || r.GetHeaders()["Content-Type"] != "application/json" ||
		r.GetHeaders()["User-Agent"] != UserAgent {
		t.Fatalf("device refresh = %v", r)
	}
	if body["client_id"] != CodexClientID || body["grant_type"] != "refresh_token" || body["refresh_token"] != "rt-device" ||
		body["scope"] != "openid profile email" || len(body) != 4 {
		t.Fatalf("device body = %v", body)
	}

	r, err = h.Platform.BuildRefreshRequest(ctx, &pluginv1.BuildRefreshRequestRequest{Account: account(TypeSIWC, siwcCreds)})
	if err != nil {
		t.Fatal(err)
	}
	form, err := url.ParseQuery(r.GetBodyJson())
	if err != nil {
		t.Fatal(err)
	}
	if r.GetUrl() != "https://auth.openai.com/api/accounts/oauth/token" || r.GetHeaders()["Content-Type"] != "application/x-www-form-urlencoded" {
		t.Fatalf("siwc refresh = %v", r)
	}
	if form.Get("grant_type") != "refresh_token" || form.Get("client_id") != "client-9" || form.Get("refresh_token") != "rt-siwc" ||
		form.Get("resource") != SIWCResource || form.Has("scope") || len(form) != 4 {
		t.Fatalf("siwc form = %v", form)
	}

	for _, tc := range []struct {
		acc  *pluginv1.Account
		code codes.Code
	}{
		{account(TypeDevice, `{"access_token":"x"}`), codes.FailedPrecondition},
		{account(TypeSIWC, `{"access_token":"x","refresh_token":"r"}`), codes.FailedPrecondition},
		{account("apikey", deviceCreds), codes.InvalidArgument},
		{account(TypeDevice, `{`), codes.InvalidArgument},
	} {
		if _, err := h.Platform.BuildRefreshRequest(ctx, &pluginv1.BuildRefreshRequestRequest{Account: tc.acc}); status.Code(err) != tc.code {
			t.Errorf("%s %s: %v, want %v", tc.acc.GetType(), tc.acc.GetCredentialsJson(), err, tc.code)
		}
	}
}

func TestParseRefreshResponse(t *testing.T) {
	h := startPlugin(t, newTestPlugin(DefaultEndpoints))
	ctx := context.Background()
	parse := func(acc *pluginv1.Account, st int32, body, transport string, truncated bool) *pluginv1.RefreshResult {
		t.Helper()
		r, err := h.Platform.ParseRefreshResponse(ctx, &pluginv1.ParseRefreshResponseRequest{
			Account: acc, Status: st, Body: []byte(body), TransportError: transport, Truncated: truncated,
		})
		if err != nil {
			t.Fatal(err)
		}
		return r
	}

	// Device: rotated refresh token, new id_token and identity fields.
	tok := idToken("me@example.com", "acct-2", "pro")
	r := parse(account(TypeDevice, deviceCreds), 200,
		`{"access_token":"at-new","refresh_token":"rt-new","id_token":"`+tok+`","expires_in":3600,"scope":"openid"}`, "", false)
	if r.GetErrorType() != pluginv1.RefreshResult_ERROR_TYPE_UNSPECIFIED {
		t.Fatalf("result = %v", r)
	}
	var patch map[string]any
	mustJSON(t, []byte(r.GetCredentialsPatchJson()), &patch)
	if patch["access_token"] != "at-new" || patch["refresh_token"] != "rt-new" || patch["id_token"] != tok ||
		patch["expires_at"] != float64(testNow.Unix()+3600) || patch["email"] != "me@example.com" ||
		patch["chatgpt_account_id"] != "acct-2" || patch["plan_type"] != "pro" || patch["scopes"] != nil {
		t.Fatalf("device patch = %v", patch)
	}

	// SIWC: no rotation, expiry from the JWT, scopes saved, no account id.
	at := fakeJWT(map[string]any{"exp": 1800009999, authClaim: map[string]any{"chatgpt_account_id": "acct-x"}})
	r = parse(account(TypeSIWC, siwcCreds), 200, `{"access_token":"`+at+`","scope":"openid chatgpt.tokens.use.direct"}`, "", false)
	patch = nil
	mustJSON(t, []byte(r.GetCredentialsPatchJson()), &patch)
	if patch["access_token"] != at || patch["expires_at"] != float64(1800009999) || patch["scopes"] != "openid chatgpt.tokens.use.direct" ||
		patch["refresh_token"] != nil || patch["chatgpt_account_id"] != nil {
		t.Fatalf("siwc patch = %v", patch)
	}

	rejected := pluginv1.RefreshResult_ERROR_TYPE_AUTH_REJECTED
	transient := pluginv1.RefreshResult_ERROR_TYPE_TRANSIENT
	for _, tc := range []struct {
		name      string
		typ       string
		status    int32
		body      string
		transport string
		truncated bool
		want      pluginv1.RefreshResult_ErrorType
		msg       string
	}{
		{"oauth invalid_grant", TypeSIWC, 400, `{"error":"invalid_grant","error_description":"revoked"}`, "", false, rejected, "authorize the account again"},
		{"openai refresh_token_reused", TypeDevice, 401, `{"error":{"code":"refresh_token_reused","message":"already used"}}`, "", false, rejected, "refresh_token_reused"},
		{"refresh_token_expired", TypeDevice, 400, `{"error":{"message":"x","type":"invalid_request_error","code":"refresh_token_expired"}}`, "", false, rejected, ""},
		{"refresh_token_invalidated", TypeSIWC, 400, `{"error":"refresh_token_invalidated"}`, "", false, rejected, ""},
		{"invalid_refresh_token", TypeSIWC, 400, `{"error":"invalid_refresh_token"}`, "", false, rejected, ""},
		{"token_expired", TypeSIWC, 400, `{"error":"token_expired"}`, "", false, rejected, ""},
		{"invalid_client", TypeSIWC, 401, `{"error":"invalid_client"}`, "", false, rejected, "configuration error"},
		{"plain 401", TypeDevice, 401, `{"detail":"nope"}`, "", false, rejected, ""},
		{"server error", TypeDevice, 503, `upstream down`, "", false, transient, "503"},
		{"rate limited", TypeSIWC, 429, `{"error":"slow_down"}`, "", false, transient, ""},
		{"400 other", TypeSIWC, 400, `{"error":"invalid_request"}`, "", false, transient, ""},
		{"transport", TypeDevice, 0, ``, "dial tcp: timeout", false, transient, "timeout"},
		{"truncated", TypeDevice, 200, `{"access_token":"x"`, "", true, transient, "too large"},
		{"unreadable", TypeDevice, 200, `not json`, "", false, transient, "unreadable"},
		{"no access token", TypeDevice, 200, `{"refresh_token":"r"}`, "", false, transient, "no access_token"},
	} {
		t.Run(tc.name, func(t *testing.T) {
			creds := deviceCreds
			if tc.typ == TypeSIWC {
				creds = siwcCreds
			}
			r := parse(account(tc.typ, creds), tc.status, tc.body, tc.transport, tc.truncated)
			if r.GetErrorType() != tc.want || r.GetCredentialsPatchJson() != "" || !strings.Contains(r.GetErrorMessage(), tc.msg) {
				t.Fatalf("result = %v, want %v containing %q", r, tc.want, tc.msg)
			}
		})
	}
}
