package engine

import (
	"net/http"
	"testing"
	"time"
)

func advisorTestBody() Object {
	body := webTestBody("advisor_20260301")
	tool := body["tools"].([]any)[0].(map[string]any)
	tool["model"] = "claude-opus-5-5"
	tool["caching"] = Object{"type": "ephemeral", "ttl": "1h"}
	tool["max_uses"] = 2
	tool["max_tokens"] = 2048
	return body
}

func advisorFixture(variant string) []Object {
	content := Object{"type": variant}
	switch variant {
	case "advisor_result":
		content["text"] = "opaque advice"
		content["stop_reason"] = "max_tokens"
	case "advisor_redacted_result":
		content["encrypted_content"] = "opaque_advisor_ciphertext"
		content["stop_reason"] = "end_turn"
	case "advisor_tool_result_error":
		content["error_code"] = "overloaded"
	}
	return []Object{{"type": "server_tool_use", "id": "srv_advisor", "name": "advisor", "input": Object{}}, {"type": "advisor_tool_result", "tool_use_id": "srv_advisor", "content": content}, {"type": "text", "text": "ADVISOR_DONE"}}
}

func TestAdvisorAdmissionAndHistoricalDefinition(t *testing.T) {
	body := advisorTestBody()
	h := http.Header{"Anthropic-Beta": []string{"advisor-tool-2026-03-01"}}
	r, err := parsePolicyRequest(mustServerJSON(body), h)
	if err != nil {
		t.Fatal(err)
	}
	if r.TTL != 5*time.Minute {
		t.Fatal("advisor caching changed executor cache TTL")
	}
	wire := Object{"tools": []any{}}
	if err := r.ApplyMainRequestFeatures(wire); err != nil {
		t.Fatal(err)
	}
	if digest(wire["tools"]) != digest(body["tools"]) {
		t.Fatal("advisor definition changed")
	}
	if _, err := parsePolicyRequest(mustServerJSON(body), nil); err == nil {
		t.Fatal("missing beta accepted")
	}
	for _, variant := range []string{"advisor_result", "advisor_redacted_result", "advisor_tool_result_error"} {
		b := advisorTestBody()
		b["messages"] = []any{Object{"role": "user", "content": "q"}, Object{"role": "assistant", "content": advisorFixture(variant)}, Object{"role": "user", "content": "next"}}
		delete(b, "tools")
		if _, err := parsePolicyRequest(mustServerJSON(b), h); err != nil {
			t.Fatal("completed advisor should not require definition", variant, err)
		}
		if _, err := parsePolicyRequest(mustServerJSON(b), nil); err == nil {
			t.Fatal("advisor history requires beta")
		}
	}
}
