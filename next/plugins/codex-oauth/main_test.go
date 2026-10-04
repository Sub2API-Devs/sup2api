package main

import (
	"context"
	_ "embed"
	"encoding/json"
	"testing"

	pluginv1 "github.com/Sub2API-Devs/sup2api/next/sdk/gen/pluginv1"
	"github.com/Sub2API-Devs/sup2api/next/sdk/pluginsdk"
	"github.com/Sub2API-Devs/sup2api/next/sdk/pluginsdk/pluginsdktest"
)

//go:embed manifest.json
var manifestRaw []byte

func TestBuildUpstreamRequest(t *testing.T) {
	h := pluginsdktest.Start(t, newPlugin(), pluginsdktest.Options{
		SDK: []pluginsdk.Option{pluginsdk.WithManifest(manifestRaw)},
	})

	req := &pluginv1.BuildUpstreamRequestRequest{
		Meta: &pluginv1.RequestMeta{
			Protocol: "openai.chat.completions",
			Model:    "gpt-4",
		},
		Account: &pluginv1.Account{
			Type:            "codex_oauth",
			Platform:        "openai",
			CredentialsJson: `{"access_token":"test-token"}`,
		},
	}

	resp, err := h.Platform.BuildUpstreamRequest(context.Background(), req)
	if err != nil {
		t.Fatalf("BuildUpstreamRequest error: %v", err)
	}

	if resp.GetUrl() != "https://api.openai.com/v1/responses" {
		t.Errorf("url = %q, want https://api.openai.com/v1/responses", resp.GetUrl())
	}
	if resp.GetMethod() != "POST" {
		t.Errorf("method = %q, want POST", resp.GetMethod())
	}

	headers := resp.GetHeaders()
	auth := headers["authorization"]
	if auth != "Bearer test-token" {
		t.Errorf("authorization = %q, want Bearer test-token", auth)
	}
}

func TestBuildTestRequest(t *testing.T) {
	h := pluginsdktest.Start(t, newPlugin(), pluginsdktest.Options{
		SDK: []pluginsdk.Option{pluginsdk.WithManifest(manifestRaw)},
	})

	req := &pluginv1.BuildTestRequestRequest{
		Account: &pluginv1.Account{
			Type:            "codex_oauth",
			Platform:        "openai",
			CredentialsJson: `{"access_token":"test-token"}`,
		},
	}

	resp, err := h.Platform.BuildTestRequest(context.Background(), req)
	if err != nil {
		t.Fatalf("BuildTestRequest error: %v", err)
	}

	if resp.GetUrl() != "https://api.openai.com/v1/responses" {
		t.Errorf("url = %q, want https://api.openai.com/v1/responses", resp.GetUrl())
	}
	if resp.GetMethod() != "POST" {
		t.Errorf("method = %q, want POST", resp.GetMethod())
	}

	headers := resp.GetHeaders()
	if headers["authorization"] != "Bearer test-token" {
		t.Errorf("authorization header = %q", headers["authorization"])
	}
}

func TestClassifyError(t *testing.T) {
	h := pluginsdktest.Start(t, newPlugin(), pluginsdktest.Options{
		SDK: []pluginsdk.Option{pluginsdk.WithManifest(manifestRaw)},
	})

	tests := []struct {
		name              string
		statusCode        int32
		body              string
		wantAccountEffect pluginv1.ClassifyErrorResponse_AccountEffect
		wantAction        pluginv1.ClassifyErrorResponse_Action
	}{
		{
			name:              "401 unauthorized",
			statusCode:        401,
			body:              `{"error":{"message":"invalid token"}}`,
			wantAccountEffect: pluginv1.ClassifyErrorResponse_ACCOUNT_EFFECT_DISABLE,
		},
		{
			name:              "429 rate limit",
			statusCode:        429,
			body:              `{"error":{"message":"rate limit exceeded"}}`,
			wantAccountEffect: pluginv1.ClassifyErrorResponse_ACCOUNT_EFFECT_COOLDOWN,
		},
		{
			name:       "500 server error",
			statusCode: 500,
			body:       `{"error":{"message":"internal error"}}`,
			wantAction: pluginv1.ClassifyErrorResponse_ACTION_FAILOVER,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			req := &pluginv1.ClassifyErrorRequest{
				Status: tt.statusCode,
			}

			resp, err := h.Platform.ClassifyError(context.Background(), req)
			if err != nil {
				t.Fatalf("ClassifyError error: %v", err)
			}

			if tt.wantAccountEffect != 0 && resp.GetAccountEffect() != tt.wantAccountEffect {
				t.Errorf("account_effect = %v, want %v", resp.GetAccountEffect(), tt.wantAccountEffect)
			}
			if tt.wantAction != 0 && resp.GetAction() != tt.wantAction {
				t.Errorf("action = %v, want %v", resp.GetAction(), tt.wantAction)
			}
		})
	}
}

func TestValidateCredentials(t *testing.T) {
	h := pluginsdktest.Start(t, newPlugin(), pluginsdktest.Options{
		SDK: []pluginsdk.Option{pluginsdk.WithManifest(manifestRaw)},
	})

	tests := []struct {
		name        string
		credentials string
		wantErrors  int
	}{
		{
			name:        "valid credentials",
			credentials: `{"access_token":"test-token"}`,
			wantErrors:  0,
		},
		{
			name:        "missing access_token",
			credentials: `{}`,
			wantErrors:  1,
		},
		{
			name:        "invalid json",
			credentials: `{invalid}`,
			wantErrors:  1,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			req := &pluginv1.ValidateCredentialsRequest{
				CredentialsJson: tt.credentials,
			}

			resp, err := h.Platform.ValidateCredentials(context.Background(), req)
			if err != nil {
				t.Fatalf("ValidateCredentials error: %v", err)
			}

			if len(resp.GetErrors()) != tt.wantErrors {
				t.Errorf("errors count = %d, want %d; errors = %v", len(resp.GetErrors()), tt.wantErrors, resp.GetErrors())
			}
		})
	}
}

func TestCredentialsParsing(t *testing.T) {
	tests := []struct {
		name    string
		json    string
		wantErr bool
	}{
		{
			name:    "complete credentials",
			json:    `{"access_token":"token123","refresh_token":"refresh456","expires_at":1234567890}`,
			wantErr: false,
		},
		{
			name:    "minimal credentials",
			json:    `{"access_token":"token123"}`,
			wantErr: false,
		},
		{
			name:    "empty json",
			json:    `{}`,
			wantErr: false,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			var creds credentials
			err := json.Unmarshal([]byte(tt.json), &creds)
			if (err != nil) != tt.wantErr {
				t.Errorf("unmarshal error = %v, wantErr %v", err, tt.wantErr)
			}
			if !tt.wantErr && tt.json != `{}` && creds.AccessToken == "" {
				t.Error("access_token is empty")
			}
		})
	}
}
