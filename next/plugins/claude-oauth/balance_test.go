package main

import (
	"context"
	"testing"

	pluginv1 "github.com/Sub2API-Devs/sup2api/next/sdk/gen/pluginv1"
)

func TestBuildBalanceRequest(t *testing.T) {
	p := newPlugin()
	ctx := context.Background()

	req := &pluginv1.BuildBalanceRequestRequest{
		Account: &pluginv1.Account{
			CredentialsJson: `{"access_token":"test_token"}`,
		},
	}

	resp, err := p.BuildBalanceRequest(ctx, req)
	if err != nil {
		t.Fatalf("BuildBalanceRequest failed: %v", err)
	}

	if resp.GetMethod() != "GET" {
		t.Errorf("expected method GET, got %s", resp.GetMethod())
	}
	if resp.GetUrl() != "https://platform.claude.com/v1/organization/usage" {
		t.Errorf("unexpected URL: %s", resp.GetUrl())
	}
	if resp.GetHeaders()["authorization"] != "Bearer test_token" {
		t.Errorf("unexpected authorization header: %s", resp.GetHeaders()["authorization"])
	}
}

func TestParseBalanceResponse(t *testing.T) {
	p := newPlugin()
	ctx := context.Background()

	tests := []struct {
		name          string
		status        int32
		body          string
		wantErrorType pluginv1.BalanceResult_ErrorType
		wantAmount    int64
		wantCurrency  string
	}{
		{
			name:         "success",
			status:       200,
			body:         `{"account_balance":{"amount":12.34,"currency":"USD"}}`,
			wantAmount:   12340000,
			wantCurrency: "USD",
		},
		{
			name:          "auth_rejected_401",
			status:        401,
			body:          `{}`,
			wantErrorType: pluginv1.BalanceResult_ERROR_TYPE_AUTH_REJECTED,
		},
		{
			name:          "no_balance_field",
			status:        200,
			body:          `{}`,
			wantErrorType: pluginv1.BalanceResult_ERROR_TYPE_TRANSIENT,
		},
		{
			name:          "invalid_json",
			status:        200,
			body:          `not json`,
			wantErrorType: pluginv1.BalanceResult_ERROR_TYPE_TRANSIENT,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			req := &pluginv1.ParseBalanceResponseRequest{
				Account: &pluginv1.Account{},
				Status:  tt.status,
				Body:    []byte(tt.body),
			}

			resp, err := p.ParseBalanceResponse(ctx, req)
			if err != nil {
				t.Fatalf("ParseBalanceResponse failed: %v", err)
			}

			result := resp.GetResult()
			if result == nil {
				t.Fatal("result is nil")
			}

			if tt.wantErrorType != pluginv1.BalanceResult_ERROR_TYPE_UNSPECIFIED {
				if result.GetErrorType() != tt.wantErrorType {
					t.Errorf("expected error type %v, got %v", tt.wantErrorType, result.GetErrorType())
				}
			} else {
				if result.GetErrorType() != pluginv1.BalanceResult_ERROR_TYPE_UNSPECIFIED {
					t.Errorf("expected success, got error type %v: %s", result.GetErrorType(), result.GetErrorMessage())
				}
				if result.GetAmountMicros() != tt.wantAmount {
					t.Errorf("expected amount %d, got %d", tt.wantAmount, result.GetAmountMicros())
				}
				if result.GetCurrency() != tt.wantCurrency {
					t.Errorf("expected currency %s, got %s", tt.wantCurrency, result.GetCurrency())
				}
			}
		})
	}
}
