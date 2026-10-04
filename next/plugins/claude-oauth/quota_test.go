package main

import (
	"context"
	"encoding/json"
	"io/fs"
	"net/http"
	"os"
	"path/filepath"
	"strings"
	"testing"
	"time"

	"google.golang.org/grpc/codes"
	"google.golang.org/grpc/status"

	pluginv1 "github.com/Sub2API-Devs/sup2api/next/sdk/gen/pluginv1"
	"github.com/Sub2API-Devs/sup2api/next/sdk/manifest"
	"github.com/Sub2API-Devs/sup2api/next/sdk/manifest/check"
	"github.com/Sub2API-Devs/sup2api/next/sdk/pluginsdk"
	"github.com/Sub2API-Devs/sup2api/next/sdk/pluginsdk/pluginsdktest"
)

func startQuotaPlugin(t *testing.T) pluginv1.PlatformServiceClient {
	t.Helper()
	h := pluginsdktest.Start(t, newPlugin(), pluginsdktest.Options{SDK: []pluginsdk.Option{pluginsdk.WithManifest(manifestRaw)}})
	return h.Platform
}

// TestManifestPassesCoreChecks runs manifest.json through the checks the
// server runs before installing a plugin (sdk/manifest/check, tooling mode).
func TestManifestPassesCoreChecks(t *testing.T) {
	var m manifest.Manifest
	if err := json.Unmarshal(manifestRaw, &m); err != nil {
		t.Fatalf("manifest.json: %v", err)
	}
	files := map[string][]byte{}
	err := filepath.WalkDir(".", func(p string, d fs.DirEntry, err error) error {
		if err != nil || d.IsDir() || strings.HasSuffix(p, ".go") || strings.HasSuffix(p, ".exe") {
			return err
		}
		b, err := os.ReadFile(p)
		files[filepath.ToSlash(p)] = b
		return err
	})
	if err != nil {
		t.Fatal(err)
	}
	fields, _ := check.Fields(check.Validate(&m, files, check.ValidateOptions{Tooling: true}))
	for _, f := range fields {
		t.Errorf("%s: %s (%s)", f.Field, f.Message, f.Code)
	}
}

// Both types declare the unified rate-limit headers; only claude_oauth
// queries the usage API. The declarations read real header values the way
// sub2api samples them (utilization 0-1, reset in Unix seconds, 7d_oi =
// the Fable weekly window).
func TestManifestQuotaDeclarations(t *testing.T) {
	var m manifest.Manifest
	if err := json.Unmarshal(manifestRaw, &m); err != nil {
		t.Fatal(err)
	}
	reset := time.Now().Add(3 * time.Hour).Unix()
	h := http.Header{}
	h.Set("anthropic-ratelimit-unified-5h-utilization", "0.37")
	h.Set("anthropic-ratelimit-unified-5h-reset", itoa(reset))
	h.Set("anthropic-ratelimit-unified-5h-status", "allowed")
	h.Set("anthropic-ratelimit-unified-7d-utilization", "0.8")
	h.Set("anthropic-ratelimit-unified-7d-status", "allowed_warning")
	h.Set("anthropic-ratelimit-unified-7d_oi-utilization", "1.0")
	h.Set("anthropic-ratelimit-unified-7d_oi-reset", itoa(reset+86400))
	h.Set("anthropic-ratelimit-unified-7d_oi-status", "rejected")
	for _, at := range m.AccountTypes {
		q := at.Quota
		if !q.Supported() {
			t.Fatalf("%s: no quota declaration", at.ID)
		}
		if q.Query != (at.ID == typeOAuth) {
			t.Errorf("%s: query = %v", at.ID, q.Query)
		}
		got := manifest.ReadQuotaHeaders(q.Headers, h.Get, time.Now())
		if len(got) != 3 {
			t.Fatalf("%s: windows = %+v", at.ID, got)
		}
		byKey := map[string]manifest.QuotaReading{}
		for _, r := range got {
			byKey[r.Key] = r
		}
		if r := byKey["5h"]; r.Utilization < 36.99 || r.Utilization > 37.01 || r.ResetsAt.Unix() != reset || r.Status != "allowed" {
			t.Errorf("%s 5h = %+v", at.ID, r)
		}
		if r := byKey["7d"]; r.Utilization < 79.99 || r.Utilization > 80.01 || r.ResetsAt != nil || r.Status != "allowed_warning" {
			t.Errorf("%s 7d = %+v", at.ID, r)
		}
		if r := byKey["7d_fable"]; r.Utilization != 100 || r.ResetsAt.Unix() != reset+86400 || r.Status != "rejected" {
			t.Errorf("%s 7d_fable = %+v", at.ID, r)
		}
	}
}

func TestBuildQuotaRequest(t *testing.T) {
	p := startQuotaPlugin(t)
	ctx := context.Background()
	r, err := p.BuildQuotaRequest(ctx, &pluginv1.BuildQuotaRequestRequest{Account: &pluginv1.Account{
		Id: 1, Type: "claude_oauth", CredentialsJson: `{"access_token":"tok-1"}`}})
	if err != nil {
		t.Fatal(err)
	}
	h := r.GetHeaders()
	if r.GetMethod() != "GET" || r.GetUrl() != "https://api.anthropic.com/api/oauth/usage" ||
		h["authorization"] != "Bearer tok-1" || h["anthropic-beta"] != "oauth-2025-04-20" ||
		h["user-agent"] != "claude-code/2.1.7" || h["accept"] != "application/json, text/plain, */*" {
		t.Fatalf("request = %+v", r)
	}
	// Setup tokens cannot read the usage API: Unimplemented keeps the host
	// on header samples.
	_, err = p.BuildQuotaRequest(ctx, &pluginv1.BuildQuotaRequestRequest{Account: &pluginv1.Account{
		Type: "claude_setup_token", CredentialsJson: `{"access_token":"tok-2"}`}})
	if status.Code(err) != codes.Unimplemented {
		t.Fatalf("setup token: %v", err)
	}
	if _, err = p.BuildQuotaRequest(ctx, &pluginv1.BuildQuotaRequestRequest{Account: &pluginv1.Account{
		Type: "claude_oauth", CredentialsJson: `{}`}}); err == nil {
		t.Fatal("missing token accepted")
	}
}

func TestParseQuotaResponse(t *testing.T) {
	p := startQuotaPlugin(t)
	ctx := context.Background()
	body := `{
	  "five_hour": {"utilization": 42.5, "resets_at": "2026-10-05T15:00:00.123456+00:00"},
	  "seven_day": {"utilization": 61, "resets_at": "2026-10-09T00:00:00Z"},
	  "seven_day_sonnet": {"utilization": 3, "resets_at": null},
	  "seven_day_overage_included": {"utilization": 88, "resets_at": "2026-10-10T08:00:00Z"},
	  "extra_usage": {"is_enabled": false}
	}`
	r, err := p.ParseQuotaResponse(ctx, &pluginv1.ParseQuotaResponseRequest{Status: 200, Body: []byte(body)})
	if err != nil {
		t.Fatal(err)
	}
	if r.GetErrorType() != pluginv1.QuotaResult_ERROR_TYPE_UNSPECIFIED {
		t.Fatalf("error: %v", r)
	}
	got := map[string]*pluginv1.QuotaWindow{}
	var keys []string
	for _, w := range r.GetWindows() {
		got[w.GetKey()] = w
		keys = append(keys, w.GetKey())
	}
	// seven_day_sonnet has no reset time: not reported (sub2api buildUsageInfo).
	if strings.Join(keys, ",") != "5h,7d,7d_fable" {
		t.Fatalf("windows: %v", keys)
	}
	if w := got["5h"]; w.GetUtilization() != 42.5 || w.GetResetsAtUnix() != time.Date(2026, 10, 5, 15, 0, 0, 0, time.UTC).Unix() {
		t.Fatalf("5h = %v", w)
	}
	if w := got["7d_fable"]; w.GetUtilization() != 88 || w.GetResetsAtUnix() != time.Date(2026, 10, 10, 8, 0, 0, 0, time.UTC).Unix() {
		t.Fatalf("7d_fable = %v", w)
	}
	// The 5-hour window is always reported, even when absent.
	r, _ = p.ParseQuotaResponse(ctx, &pluginv1.ParseQuotaResponseRequest{Status: 200, Body: []byte(`{}`)})
	if len(r.GetWindows()) != 1 || r.GetWindows()[0].GetKey() != "5h" || r.GetWindows()[0].GetResetsAtUnix() != 0 {
		t.Fatalf("empty body: %v", r)
	}

	for _, c := range []struct {
		in   *pluginv1.ParseQuotaResponseRequest
		want pluginv1.QuotaResult_ErrorType
	}{
		{&pluginv1.ParseQuotaResponseRequest{Status: 401, Body: []byte(`{"error":"invalid token"}`)}, pluginv1.QuotaResult_ERROR_TYPE_AUTH_REJECTED},
		{&pluginv1.ParseQuotaResponseRequest{Status: 403}, pluginv1.QuotaResult_ERROR_TYPE_AUTH_REJECTED},
		{&pluginv1.ParseQuotaResponseRequest{Status: 429}, pluginv1.QuotaResult_ERROR_TYPE_TRANSIENT},
		{&pluginv1.ParseQuotaResponseRequest{Status: 502}, pluginv1.QuotaResult_ERROR_TYPE_TRANSIENT},
		{&pluginv1.ParseQuotaResponseRequest{TransportError: "dial tcp: timeout"}, pluginv1.QuotaResult_ERROR_TYPE_TRANSIENT},
		{&pluginv1.ParseQuotaResponseRequest{Status: 200, Body: []byte(`{"five_hour":`)}, pluginv1.QuotaResult_ERROR_TYPE_TRANSIENT},
		{&pluginv1.ParseQuotaResponseRequest{Status: 200, Body: []byte(`{}`), Truncated: true}, pluginv1.QuotaResult_ERROR_TYPE_TRANSIENT},
	} {
		r, err := p.ParseQuotaResponse(ctx, c.in)
		if err != nil || r.GetErrorType() != c.want || r.GetErrorMessage() == "" || len(r.GetWindows()) != 0 {
			t.Errorf("status %d %q: %v %v", c.in.GetStatus(), c.in.GetTransportError(), r, err)
		}
	}
}

func itoa(n int64) string {
	b, _ := json.Marshal(n)
	return string(b)
}
