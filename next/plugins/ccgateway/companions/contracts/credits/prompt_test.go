package credits

import (
	"encoding/json"
	"strings"
	"testing"
)

func TestCreditPromptBoundaries(t *testing.T) {
	original := []byte(`{"model":"primary","max_tokens":10,"temperature":0.2,"messages":[{"role":"user","content":"original"}],"tools":[{"name":"a","input_schema":{"minimum":9007199254740993}}],"thinking":{"type":"enabled","budget_tokens":1},"container":"old","new_prompt_feature":{"opaque":true}}`)
	digest, err := Digest(original, []string{"fallback-credit-2026-07-01,x-fixture"})
	if err != nil {
		t.Fatal(err)
	}
	body, _ := Object(original)
	body["model"] = "fallback"
	body["max_tokens"] = 999
	body["temperature"] = 0.9
	body["stream"] = true
	body["metadata"] = map[string]any{"user_id": "new"}
	body["fallback_credit_token"] = "synthetic-fixture-token"
	raw, _ := json.Marshal(body)
	changed, err := Digest(raw, []string{"x-fixture,fallback-credit-2026-06-01"})
	if err != nil || changed != digest {
		t.Fatal("allowed retry controls changed prompt claim", err)
	}
	for _, field := range []string{"thinking", "container", "tools", "new_prompt_feature", "messages"} {
		copy, _ := Object(raw)
		delete(copy, field)
		next, _ := json.Marshal(copy)
		got, _ := Digest(next, []string{"x-fixture"})
		if got == digest {
			t.Fatalf("prompt field %s omitted without mismatch", field)
		}
	}
	if got, _ := Digest(raw, []string{"another-beta"}); got == digest {
		t.Fatal("non-exempt beta mismatch ignored")
	}
	if got, _ := Digest([]byte(strings.ReplaceAll(string(original), "9007199254740993", "9007199254740992")), []string{"x-fixture"}); got == digest {
		t.Fatal("integer prompt identity rounded")
	}
}

func TestCreditContinuationClaim(t *testing.T) {
	body := []byte(`{"model":"primary","messages":[{"role":"user","content":"question"}]}`)
	response := []byte(`{"model":"primary","stop_reason":"refusal","stop_details":{"fallback_credit_token":"synthetic-credit","fallback_has_prefill_claim":true},"content":[{"type":"thinking","thinking":"opaque","signature":"sig"},{"type":"fallback","from":{"model":"a"},"to":{"model":"b"}},{"type":"text","text":"partial \n"},{"type":"tool_use","id":"uncompleted","name":"lookup","input":{}}]}`)
	claim, err := ClaimForResponse(body, response, nil)
	if err != nil || len(claim.Digests) != 3 {
		t.Fatal("base/raw/adjusted claims", claim, err)
	}
	obj, _ := Object(response)
	source, _ := Object(body)
	content := obj["content"].([]any)
	adjusted := ContinuationContent(content)
	if len(adjusted) != 3 || adjusted[2].(map[string]any)["text"] != "partial" || content[2].(map[string]any)["text"] != "partial \n" {
		t.Fatal("echo adjustment mutated source or retained unresolved client call")
	}
	source["messages"] = append(source["messages"].([]any), map[string]any{"role": "assistant", "content": adjusted})
	raw, _ := json.Marshal(source)
	hash, _ := Digest(raw, nil)
	if claim.Digests[2] != hash {
		t.Fatal("adjusted continuation not matched")
	}
	obj["stop_details"].(map[string]any)["fallback_has_prefill_claim"] = false
	raw, _ = json.Marshal(obj)
	claim, err = ClaimForResponse(body, raw, nil)
	if err != nil || len(claim.Digests) != 1 {
		t.Fatal("false prefill admitted appended assistant", err)
	}
	obj["stop_reason"] = "end_turn"
	raw, _ = json.Marshal(obj)
	if _, err = ClaimForResponse(body, raw, nil); err == nil {
		t.Fatal("non-refusal minted a credit")
	}
}
