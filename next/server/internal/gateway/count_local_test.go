package gateway

import (
	"context"
	"fmt"
	"strings"
	"testing"

	"github.com/Sub2API-Devs/sup2api/next/server/internal/tokenizer"
)

func tokens(t *testing.T, lines ...string) int64 {
	t.Helper()
	n, _, err := tokenizer.Count(context.Background(), strings.Join(lines, "\n"), "o200k_base")
	if err != nil {
		t.Fatal(err)
	}
	return n
}

func estimate(t *testing.T, protocol, body string) int64 {
	t.Helper()
	n, err := estimateTokens(context.Background(), protocol, []byte(body))
	if err != nil {
		t.Fatalf("%s: %v", body, err)
	}
	return n
}

func TestEstimateAnthropicTokens(t *testing.T) {
	body := `{"model":"m","system":[{"type":"text","text":"Be brief."}],
		"tools":[{"name":"get_weather","description":"Weather","input_schema":{"type":"object"}},
			{"type":"web_search_20250305","name":"web_search","user_location":{"city":"Paris"}}],
		"messages":[{"role":"user","content":[{"type":"text","text":"Hi"},{"type":"image","source":{"type":"url","url":"u"}},
			{"type":"document","source":{"type":"base64","media_type":"application/pdf","data":"x"}}]},
		{"role":"assistant","content":[{"type":"tool_use","id":"t1","name":"get_weather","input":{"city": "Paris"}}]},
		{"role":"user","content":[{"type":"tool_result","tool_use_id":"t1","content":[{"type":"text","text":"18C"},
			{"type":"image","source":{"type":"base64","media_type":"image/png","data":"x"}}]}]}]}`
	want := tokens(t, "Be brief.", "user", "Hi", "assistant", "get_weather", `{"city":"Paris"}`, "user", "18C",
		"get_weather", "Weather", `{"type":"object"}`, "web_search", `{"city":"Paris"}`) + 2*anthropicImageTokens + fileTokens
	if got := estimate(t, "anthropic.count_tokens", body); got != want {
		t.Fatalf("got %d, want %d", got, want)
	}
	if got, want := estimate(t, "anthropic.count_tokens", `{"system":"S","messages":[{"role":"user","content":"Hello"}]}`),
		tokens(t, "S", "user", "Hello"); got != want {
		t.Fatalf("string content: got %d, want %d", got, want)
	}
}

func TestEstimateGeminiTokens(t *testing.T) {
	req := `{"systemInstruction":{"parts":[{"text":"Be brief."}]},"tools":[{"functionDeclarations":[{"name":"f"}]}],
		"contents":[{"role":"user","parts":[{"text":"Hi"},{"inlineData":{"mimeType":"image/png","data":"x"}},
			{"fileData":{"mimeType":"application/pdf","fileUri":"files/a"}},{"inlineData":{"mimeType":"audio/wav","data":"x"}},
			{"fileData":{"mimeType":"video/mp4","fileUri":"files/v"}}]},
		{"role":"model","parts":[{"functionCall":{"name":"f","args":{"a": 1}}}]},
		{"role":"user","parts":[{"functionResponse":{"name":"f","response":{"output":"ok"}}}]}]}`
	want := tokens(t, "Be brief.", "user", "Hi", "model", "f", `{"a":1}`, "user",
		`{"name":"f","response":{"output":"ok"}}`, `[{"name":"f"}]`) + geminiImageTokens + fileTokens + audioTokens + videoTokens
	snake := strings.NewReplacer("systemInstruction", "system_instruction", "functionDeclarations", "function_declarations",
		"inlineData", "inline_data", "mimeType", "mime_type", "fileData", "file_data", "functionCall", "function_call").Replace(req)
	for name, body := range map[string]string{"plain": req, "wrapped": `{"generateContentRequest":` + req + `}`,
		"snake_case": `{"generate_content_request":` + snake + `}`} {
		if got := estimate(t, "gemini.count_tokens", body); got != want {
			t.Errorf("%s: got %d, want %d", name, got, want)
		}
	}
	if _, err := estimateTokens(context.Background(), "gemini.count_tokens", []byte("{")); err == nil {
		t.Error("invalid JSON estimated")
	}
}

func TestCountReply(t *testing.T) {
	if got := string(countReply("anthropic.count_tokens", 12)); got != `{"input_tokens":12}` {
		t.Errorf("anthropic %s", got)
	}
	if got := string(countReply("gemini.count_tokens", 12)); got != `{"totalTokens":12}` {
		t.Errorf("gemini %s", got)
	}
}

// An account type without a count_tokens endpoint answers it locally:
// no upstream request, no slot, only the count in the reply (§8).
func TestLocalCountTokens(t *testing.T) {
	e := newEnv(t, func(e *env) { e.man.AccountTypes[0].Platforms[0].Endpoints = []string{"messages"} })
	e.accounts.accounts[1].MaxConcurrency = 1
	e.slots.inUse["account:1"] = 1
	r := e.do("/v1/messages/count_tokens", body(testModel, false), nil)
	if want := fmt.Sprintf(`{"input_tokens":%d}`, tokens(t, "user", "hello there")); r.status != 200 || string(r.body) != want {
		t.Fatalf("%d %s, want %s", r.status, r.body, want)
	}
	for k := range r.header {
		if k != "Content-Type" && k != "Content-Length" && k != "Date" && k != "X-Request-Id" {
			t.Errorf("extra response header %s", k)
		}
	}
	rec := e.record()
	if rec.UpstreamProtocol != upstreamLocal || rec.AccountID == nil || !rec.Success || rec.StatusCode != 200 {
		t.Fatalf("record %+v", rec)
	}
	if rec.Conversion == nil || rec.Conversion.Grade != "local" {
		t.Errorf("conversion trace %+v", rec.Conversion)
	}
	if len(e.up.calls) != 0 || e.slots.inUse["account:1"] != 1 {
		t.Fatalf("upstream calls %d, slots %v", len(e.up.calls), e.slots.inUse)
	}

	r = e.do("/v1/messages/count_tokens", "not an object", nil)
	if r.status != 400 {
		t.Fatalf("invalid body: %d %s", r.status, r.body)
	}
}
