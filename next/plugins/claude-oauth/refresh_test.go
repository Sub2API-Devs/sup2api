package main

import (
	"context"
	"encoding/json"
	"strings"
	"testing"
	"time"

	"google.golang.org/grpc/codes"
	"google.golang.org/grpc/status"

	pluginv1 "github.com/Sub2API-Devs/sup2api/next/sdk/gen/pluginv1"
	"github.com/Sub2API-Devs/sup2api/next/sdk/manifest"
)

// Both account types declare refresh with the defaults (expires_at, 30
// minutes ahead), and nothing in the manifest still asks for the old job.
func TestManifestRefreshDeclarations(t *testing.T) {
	var m manifest.Manifest
	if err := json.Unmarshal(manifestRaw, &m); err != nil {
		t.Fatal(err)
	}
	for _, at := range m.AccountTypes {
		if at.Refresh == nil || at.Refresh.Field() != "expires_at" || at.Refresh.Before() != 30*time.Minute {
			t.Errorf("%s: refresh = %+v", at.ID, at.Refresh)
		}
	}
	for _, c := range m.Capabilities {
		if c.ID == manifest.CapAppJobs {
			t.Error("app.jobs.v1 still declared")
		}
	}
	if len(m.Jobs) != 0 {
		t.Errorf("the refresh job is gone; jobs = %v", m.Jobs)
	}
	for _, hp := range m.HostPermissions {
		if hp.ID == "jobs" {
			t.Error("jobs host permission still requested")
		}
	}
}

func TestBuildRefreshRequest(t *testing.T) {
	plat := startQuotaPlugin(t)
	ctx := context.Background()
	r, err := plat.BuildRefreshRequest(ctx, &pluginv1.BuildRefreshRequestRequest{Account: &pluginv1.Account{
		Type: "claude_oauth", CredentialsJson: `{"access_token":"at","refresh_token":" rt-1 ","expires_at":"1791147940"}`}})
	if err != nil {
		t.Fatal(err)
	}
	var body map[string]string
	_ = json.Unmarshal([]byte(r.GetBodyJson()), &body)
	if r.GetMethod() != "POST" || r.GetUrl() != TokenURL || body["grant_type"] != "refresh_token" ||
		body["refresh_token"] != "rt-1" || body["client_id"] != ClientID || r.GetHeaders()["User-Agent"] != refreshUserAgent {
		t.Fatalf("request: %+v body %v", r, body)
	}
	// No refresh token: cannot be renewed, said so the host stops asking.
	_, err = plat.BuildRefreshRequest(ctx, &pluginv1.BuildRefreshRequestRequest{Account: &pluginv1.Account{
		Type: "claude_setup_token", CredentialsJson: `{"access_token":"sk-ant-oat01-x"}`}})
	if status.Code(err) != codes.FailedPrecondition {
		t.Fatalf("without refresh_token: %v", err)
	}
}

func TestParseRefreshResponse(t *testing.T) {
	plat := startQuotaPlugin(t)
	ctx := context.Background()
	parse := func(in *pluginv1.ParseRefreshResponseRequest) *pluginv1.RefreshResult {
		t.Helper()
		r, err := plat.ParseRefreshResponse(ctx, in)
		if err != nil {
			t.Fatal(err)
		}
		return r
	}
	before := time.Now().Unix()
	r := parse(&pluginv1.ParseRefreshResponseRequest{Status: 200,
		Body: []byte(`{"access_token":"at-2","refresh_token":"rt-2","expires_in":28800,"scope":"user:inference","token_type":"Bearer"}`)})
	var patch map[string]any
	if err := json.Unmarshal([]byte(r.GetCredentialsPatchJson()), &patch); err != nil || r.GetErrorType() != pluginv1.RefreshResult_ERROR_TYPE_UNSPECIFIED {
		t.Fatalf("success: %v %v", r, err)
	}
	exp, _ := patch["expires_at"].(float64)
	if patch["access_token"] != "at-2" || patch["refresh_token"] != "rt-2" || patch["scope"] != "user:inference" ||
		int64(exp) < before+28800 || int64(exp) > time.Now().Unix()+28800 || len(patch) != 4 {
		t.Fatalf("patch: %v", patch)
	}
	// Not rotated: the stored refresh token is kept (not in the patch).
	r = parse(&pluginv1.ParseRefreshResponseRequest{Status: 200, Body: []byte(`{"access_token":"at-3","expires_in":60}`)})
	if strings.Contains(r.GetCredentialsPatchJson(), "refresh_token") {
		t.Fatalf("unrotated patch: %s", r.GetCredentialsPatchJson())
	}
	for _, c := range []struct {
		in   *pluginv1.ParseRefreshResponseRequest
		want pluginv1.RefreshResult_ErrorType
	}{
		{&pluginv1.ParseRefreshResponseRequest{Status: 400, Body: []byte(`{"error":"invalid_grant","error_description":"Refresh token not found or invalid"}`)}, pluginv1.RefreshResult_ERROR_TYPE_AUTH_REJECTED},
		{&pluginv1.ParseRefreshResponseRequest{Status: 401}, pluginv1.RefreshResult_ERROR_TYPE_AUTH_REJECTED},
		{&pluginv1.ParseRefreshResponseRequest{Status: 403}, pluginv1.RefreshResult_ERROR_TYPE_AUTH_REJECTED},
		{&pluginv1.ParseRefreshResponseRequest{Status: 400, Body: []byte(`{"error":"invalid_request"}`)}, pluginv1.RefreshResult_ERROR_TYPE_TRANSIENT},
		{&pluginv1.ParseRefreshResponseRequest{Status: 429}, pluginv1.RefreshResult_ERROR_TYPE_TRANSIENT},
		{&pluginv1.ParseRefreshResponseRequest{Status: 503}, pluginv1.RefreshResult_ERROR_TYPE_TRANSIENT},
		{&pluginv1.ParseRefreshResponseRequest{TransportError: "dial tcp: i/o timeout"}, pluginv1.RefreshResult_ERROR_TYPE_TRANSIENT},
		{&pluginv1.ParseRefreshResponseRequest{Status: 200, Body: []byte(`{"token_type":"Bearer"}`)}, pluginv1.RefreshResult_ERROR_TYPE_TRANSIENT},
		{&pluginv1.ParseRefreshResponseRequest{Status: 200, Body: []byte(`not json`)}, pluginv1.RefreshResult_ERROR_TYPE_TRANSIENT},
		{&pluginv1.ParseRefreshResponseRequest{Status: 200, Truncated: true, Body: []byte(`{"access_token":"x"`)}, pluginv1.RefreshResult_ERROR_TYPE_TRANSIENT},
	} {
		if r := parse(c.in); r.GetErrorType() != c.want || r.GetErrorMessage() == "" || r.GetCredentialsPatchJson() != "" {
			t.Errorf("status %d %q: %v, want %v", c.in.GetStatus(), c.in.GetBody(), r, c.want)
		}
	}
}

// Accounts imported from sub2api keep expires_at as a numeric string; the
// credentials must still parse.
func TestCredentialsExpiresAtString(t *testing.T) {
	var c credentials
	for _, raw := range []string{`{"access_token":"a","expires_at":"1791147940"}`, `{"access_token":"a","expires_at":1791147940}`, `{"access_token":"a"}`} {
		if err := json.Unmarshal([]byte(raw), &c); err != nil {
			t.Errorf("%s: %v", raw, err)
		}
	}
}
