package service

import (
	"context"
	"strings"
	"testing"
)

func TestDataPlaneControlUpstreamValidationUsesSecureDefault(t *testing.T) {
	tests := []struct {
		name     string
		validate func(string) (string, error)
	}{
		{
			name:     "anthropic and gemini gateway",
			validate: (&GatewayService{}).ValidateDataPlaneUpstreamBaseURL,
		},
		{
			name:     "openai gateway",
			validate: (&OpenAIGatewayService{}).ValidateDataPlaneUpstreamBaseURL,
		},
	}

	for _, test := range tests {
		t.Run(test.name, func(t *testing.T) {
			normalized, err := test.validate("https://example.com")
			if err != nil {
				t.Fatalf("validate HTTPS: %v", err)
			}
			if normalized != "https://example.com" {
				t.Fatalf("normalized URL = %q", normalized)
			}
			if _, err := test.validate("http://example.com"); err == nil {
				t.Fatal("expected insecure HTTP to be rejected without configuration")
			}
		})
	}
}

func TestResolveDataPlaneTLSFingerprintFallsBackToBuiltInProfile(t *testing.T) {
	account := &Account{
		Platform: PlatformAnthropic,
		Type:     AccountTypeOAuth,
		Extra:    map[string]any{"enable_tls_fingerprint": true},
	}
	profile := (&GatewayService{}).ResolveDataPlaneTLSFingerprint(account)
	if profile == nil || profile.ProfileKey != "Built-in Default (Node.js 24.x)" {
		t.Fatalf("profile = %+v", profile)
	}
	if got := (&GatewayService{}).ResolveDataPlaneTLSFingerprint(&Account{Platform: PlatformAnthropic, Type: AccountTypeAPIKey}); got != nil {
		t.Fatalf("disabled account profile = %+v", got)
	}
}

func TestIsDataPlaneClaudeCodeRequestRequiresStructuralSignal(t *testing.T) {
	valid := "user_0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef_account__session_12345678-1234-1234-1234-123456789abc"
	if !IsDataPlaneClaudeCodeRequest("claude-cli/2.1.220 (external, cli)", valid, false) {
		t.Fatal("valid Claude Code request was rejected")
	}
	if IsDataPlaneClaudeCodeRequest("claude-cli/2.1.220 (external, cli)", "spoofed", false) {
		t.Fatal("invalid metadata user id was accepted")
	}
	if !IsDataPlaneClaudeCodeRequest("Go-http-client/1.1", "", true) {
		t.Fatal("trusted billing attribution relay was rejected")
	}
}

func TestSignDataPlaneBedrockRequestUsesDigestWithoutExposingSecret(t *testing.T) {
	account := Account{
		ID: 501, Platform: PlatformAnthropic, Type: AccountTypeBedrock,
		Credentials: map[string]any{
			"aws_access_key_id": "AKIDEXAMPLE", "aws_secret_access_key": "secret-example",
			"aws_session_token": "session-example", "aws_region": "eu-west-1",
		},
	}
	service := &GatewayService{accountRepo: stubOpenAIAccountRepo{accounts: []Account{account}}}
	digest := strings.Repeat("a", 64)
	signed, err := service.SignDataPlaneBedrockRequest(
		context.Background(), account.ID, "POST",
		"https://bedrock-runtime.eu-west-1.amazonaws.com/model/eu.anthropic.claude-opus-4-7-v1/invoke",
		digest, map[string]string{"Content-Type": "application/json", "Accept": "application/json", "X-Untrusted": "drop"},
	)
	if err != nil {
		t.Fatalf("SignDataPlaneBedrockRequest: %v", err)
	}
	if !strings.HasPrefix(signed["Authorization"], "AWS4-HMAC-SHA256 Credential=AKIDEXAMPLE/") || !strings.Contains(signed["Authorization"], "/eu-west-1/bedrock/aws4_request") {
		t.Fatalf("Authorization = %q", signed["Authorization"])
	}
	if signed["X-Amz-Date"] == "" || signed["X-Amz-Security-Token"] != "session-example" {
		t.Fatalf("signed headers = %+v", signed)
	}
	if _, leaked := signed["X-Untrusted"]; leaked {
		t.Fatalf("untrusted header was signed: %+v", signed)
	}
}

func TestSignDataPlaneBedrockRequestRejectsInvalidDigestAndTarget(t *testing.T) {
	account := Account{
		ID: 502, Platform: PlatformAnthropic, Type: AccountTypeBedrock,
		Credentials: map[string]any{"aws_access_key_id": "AKID", "aws_secret_access_key": "secret"},
	}
	service := &GatewayService{accountRepo: stubOpenAIAccountRepo{accounts: []Account{account}}}
	if _, err := service.SignDataPlaneBedrockRequest(context.Background(), account.ID, "POST", "https://bedrock-runtime.us-east-1.amazonaws.com/model/x/invoke", "not-a-digest", nil); err == nil {
		t.Fatal("invalid digest was accepted")
	}
	if _, err := service.SignDataPlaneBedrockRequest(context.Background(), account.ID, "POST", "http://bedrock-runtime.us-east-1.amazonaws.com/model/x/invoke", strings.Repeat("a", 64), nil); err == nil {
		t.Fatal("insecure signing target was accepted")
	}
}
