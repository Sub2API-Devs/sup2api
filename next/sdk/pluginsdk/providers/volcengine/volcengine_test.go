package volcengine

import (
	"net/http"
	"testing"
	"time"

	pluginv1 "github.com/Sub2API-Devs/sup2api/next/sdk/gen/pluginv1"
	"github.com/Sub2API-Devs/sup2api/next/sdk/platforms"
	"github.com/Sub2API-Devs/sup2api/next/sdk/pluginsdk/providers/anthropic"
)

// TestAnthropicSurfaceProtocolIDs pins the protocol ids of Ark's Anthropic
// surface to the anthropic plugin's: the plugin compares
// RequestMeta.protocol against these constants to pick PolicyAnthropic, so a
// spelling like "anthropic-messages" would silently leave Ark's Anthropic
// errors on the OpenAI vocabulary.
func TestAnthropicSurfaceProtocolIDs(t *testing.T) {
	if ProtocolMessages != anthropic.ProtocolMessages || ProtocolCountTokens != anthropic.ProtocolCountTokens {
		t.Fatalf("volcengine protocols = %q/%q, anthropic = %q/%q",
			ProtocolMessages, ProtocolCountTokens, anthropic.ProtocolMessages, anthropic.ProtocolCountTokens)
	}
	if ProtocolMessages != "anthropic.messages" || ProtocolCountTokens != "anthropic.count_tokens" {
		t.Fatalf("protocol ids = %q/%q", ProtocolMessages, ProtocolCountTokens)
	}
	var declared []string
	for _, p := range platforms.Builtin() {
		if p.ID == "anthropic" {
			declared = p.Protocols()
		}
	}
	if len(declared) != 2 || declared[0] != ProtocolMessages || declared[1] != ProtocolCountTokens {
		t.Fatalf("built-in anthropic platform protocols = %v", declared)
	}
}

// TestPolicyAnthropicVocabulary asserts the Anthropic error vocabulary Ark's
// Anthropic surface must use (relay and anthropic plugins share it).
func TestPolicyAnthropicVocabulary(t *testing.T) {
	now := time.Now()
	classify := func(status int) *pluginv1.ClassifyErrorResponse {
		return PolicyAnthropic.Classify(now, &pluginv1.ClassifyErrorRequest{Status: int32(status)})
	}
	if got := classify(http.StatusNotFound).GetClientErrorType(); got != "not_found_error" {
		t.Errorf("404 client error type = %q, want not_found_error", got)
	}
	if got := classify(http.StatusInternalServerError).GetClientErrorType(); got != "api_error" {
		t.Errorf("500 client error type = %q, want api_error", got)
	}
	if got := Policy.Classify(now, &pluginv1.ClassifyErrorRequest{Status: http.StatusNotFound}).GetClientErrorType(); got != "invalid_request_error" {
		t.Errorf("OpenAI-surface 404 = %q, want invalid_request_error", got)
	}
}
