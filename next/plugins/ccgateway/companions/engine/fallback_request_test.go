package engine

import (
	"encoding/json"
	"net/http"
	"testing"
)

func explicitFallbackFixture(stream bool) Object {
	return Object{"model": "claude-opus-5-5", "max_tokens": 128, "stream": stream, "messages": []any{Object{"role": "user", "content": "isolated explicit fallback fixture"}}, "fallbacks": []any{Object{"model": "claude-opus-4-8", "max_tokens": 99, "thinking": Object{"type": "disabled"}, "speed": "standard"}}}
}

func TestFallbackRequestPlan(t *testing.T) {
	h := http.Header{"Anthropic-Beta": []string{"server-side-fallback-2026-07-01"}}
	for _, stream := range []bool{false, true} {
		raw, _ := json.Marshal(explicitFallbackFixture(stream))
		req, err := parsePolicyRequest(raw, h)
		if err != nil {
			t.Fatal(err)
		}
		cfg, err := req.passthroughBodies()
		if err != nil {
			t.Fatal(err)
		}
		if len(cfg.Fallbacks) != 1 || cfg.Fallbacks[0].Model != "claude-opus-4-8" || string(cfg.Fallbacks[0].Body["max_tokens"]) != "99" || string(cfg.Fallbacks[0].Body["thinking"]) != `{"type":"disabled"}` || string(cfg.Fallbacks[0].Body["speed"]) != `"standard"` {
			t.Fatal("native fallback overrides changed", cfg)
		}
		if cfg.First["fallbacks"] != nil || cfg.Rest["fallbacks"] != nil {
			t.Fatal("native fallback acquired the removed server-chain adapter")
		}
		next, err := req.nativeFallback(cfg.Fallbacks[0])
		if err != nil {
			t.Fatal(err)
		}
		if next.Model != "claude-opus-4-8" || next.MaxTokens != 99 || next.Stream != stream || next.hasFallbacks() || str(next.Thinking, "type") != "disabled" || next.Fast == nil || *next.Fast {
			t.Fatal("native fallback did not apply exactly one attempt")
		}
		if req.Model != "claude-opus-5-5" || req.MaxTokens != 128 || string(req.Plan.RawRequest()) != string(raw) {
			t.Fatal("fallback mutated original request")
		}
		if err = req.validateRoutingProvider([]string{"CLAUDE_CODE_USE_BEDROCK=1"}); err == nil {
			t.Fatal("unsupported provider accepted")
		}
		if _, err = parsePolicyRequest(raw, http.Header{}); err == nil {
			t.Fatal("missing beta accepted")
		}
	}
	for _, fallback := range []any{"default", []any{}, []any{Object{"model": "claude-opus-5-5"}}, []any{Object{"model": "x", "unknown": true}}, []any{Object{"model": "x", "max_tokens": 1.5}}} {
		body := explicitFallbackFixture(false)
		body["fallbacks"] = fallback
		raw, _ := json.Marshal(body)
		if _, err := parsePolicyRequest(raw, h); err == nil {
			t.Fatal("invalid chain accepted", fallback)
		}
	}
}

func TestFallbackCompactionNeedsAttemptAttribution(t *testing.T) {
	h := http.Header{"Anthropic-Beta": []string{"server-side-fallback-2026-07-01,compact-2026-09-04,context-management-2025-06-27,compact-2026-01-12"}}
	for _, fields := range []Object{{"compaction": Object{}}, {"context_management": Object{"edits": []any{Object{"type": "compact_20260112"}}}}} {
		body := explicitFallbackFixture(false)
		for k, v := range fields {
			body[k] = v
		}
		raw, _ := json.Marshal(body)
		if _, err := parsePolicyRequest(raw, h); err == nil {
			t.Fatal("compaction chain admitted without ownership")
		}
	}
	body := explicitFallbackFixture(false)
	body["compaction"] = nil
	body["context_management"] = Object{"edits": []any{Object{"type": "clear_tool_uses_20250919"}}}
	raw, _ := json.Marshal(body)
	if _, err := parsePolicyRequest(raw, h); err != nil {
		t.Fatal("ordinary context clearing rejected", err)
	}
}
