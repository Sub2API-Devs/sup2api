package moderation

import (
	"context"
	"encoding/json"
	"errors"
	"io"
	"net/http"
	"net/http/httptest"
	"strings"
	"sync"
	"sync/atomic"
	"testing"
	"time"
)

// fakeLLM is a scripted OpenAI-compatible chat completions server.
type fakeLLM struct {
	t   *testing.T
	srv *httptest.Server

	mu       sync.Mutex
	requests []llmRequest
	calls    atomic.Int64
	// respond returns (status, body) for the n-th call (1-based).
	respond func(req llmRequest, n int) (int, any)
	delay   time.Duration
}

type llmRequest struct {
	Path       string
	Auth       string
	Raw        map[string]json.RawMessage
	Messages   []map[string]any
	ToolChoice json.RawMessage
}

// lastUser returns the content of the last user message.
func (r llmRequest) lastUser() string {
	for i := len(r.Messages) - 1; i >= 0; i-- {
		if r.Messages[i]["role"] == "user" {
			s, _ := r.Messages[i]["content"].(string)
			return s
		}
	}
	return ""
}

func (r llmRequest) has(role string) bool {
	for _, m := range r.Messages {
		if m["role"] == role {
			return true
		}
	}
	return false
}

func newFakeLLM(t *testing.T, respond func(req llmRequest, n int) (int, any)) *fakeLLM {
	f := &fakeLLM{t: t, respond: respond}
	f.srv = httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		n := int(f.calls.Add(1))
		body, _ := io.ReadAll(r.Body)
		req := llmRequest{Path: r.URL.Path, Auth: r.Header.Get("Authorization")}
		_ = json.Unmarshal(body, &req.Raw)
		_ = json.Unmarshal(req.Raw["messages"], &req.Messages)
		req.ToolChoice = req.Raw["tool_choice"]
		f.mu.Lock()
		f.requests = append(f.requests, req)
		delay := f.delay
		f.mu.Unlock()
		if delay > 0 {
			select {
			case <-time.After(delay):
			case <-r.Context().Done():
				return
			}
		}
		status, out := f.respond(req, n)
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(status)
		switch b := out.(type) {
		case string:
			_, _ = io.WriteString(w, b)
		default:
			_ = json.NewEncoder(w).Encode(b)
		}
	}))
	t.Cleanup(f.srv.Close)
	return f
}

func (f *fakeLLM) reqs() []llmRequest {
	f.mu.Lock()
	defer f.mu.Unlock()
	return append([]llmRequest(nil), f.requests...)
}

func toolCallResp(id, name, args string) map[string]any {
	return map[string]any{
		"model": "mock-mod-1",
		"choices": []any{map[string]any{"message": map[string]any{
			"role": "assistant", "content": nil,
			"tool_calls": []any{map[string]any{"id": id, "type": "function", "function": map[string]any{"name": name, "arguments": args}}},
		}}},
		"usage": map[string]any{"prompt_tokens": 100, "completion_tokens": 10},
	}
}

func textResp(content string) map[string]any {
	return map[string]any{
		"choices": []any{map[string]any{"message": map[string]any{"role": "assistant", "content": content}}},
		"usage":   map[string]any{"prompt_tokens": 50, "completion_tokens": 5},
	}
}

// verdictFor mimics mock-upstream: MOD-BLOCK blocks, MOD-FLAG flags.
func verdictFor(text string) string {
	switch {
	case strings.Contains(text, "MOD-BLOCK"):
		return `{"verdict":"block","categories":["illegal"],"severity":"high","reason":"违法内容"}`
	case strings.Contains(text, "MOD-FLAG"):
		return `{"verdict":"flag","categories":["other"],"severity":"low","reason":"可疑"}`
	}
	return `{"verdict":"pass","categories":[],"severity":"none","reason":"正常"}`
}

func testConfig(base string, mut func(*Settings)) *config {
	s := DefaultSettings()
	s.Mode, s.BaseURL, s.APIKey, s.Model = ModeEnforce, base, "sk-test", "mod-model"
	if mut != nil {
		mut(&s)
	}
	return compile(s)
}

func TestAgentToolCall(t *testing.T) {
	llm := newFakeLLM(t, func(req llmRequest, _ int) (int, any) {
		return 200, toolCallResp("c1", ToolName, verdictFor(req.lastUser()))
	})
	c := testConfig(llm.srv.URL, nil)
	res, err := newAgent().run(context.Background(), c, "please MOD-BLOCK", true)
	if err != nil {
		t.Fatal(err)
	}
	if res.Verdict.Verdict != VerdictBlock || strings.Join(res.Categories, ",") != "illegal" || res.Severity != "high" ||
		res.Turns != 1 || res.Usage.PromptTokens != 100 || res.Usage.CompletionTokens != 10 || res.LLMModel != "mock-mod-1" {
		t.Fatalf("res = %+v", res)
	}
	if len(res.Transcript) != 3 { // system, user, final assistant
		t.Fatalf("transcript = %d", len(res.Transcript))
	}
	r := llm.reqs()[0]
	if r.Path != "/v1/chat/completions" || r.Auth != "Bearer sk-test" || string(r.ToolChoice) != `"required"` {
		t.Fatalf("request = %+v", r)
	}
	var body struct {
		Model       string            `json:"model"`
		Temperature *float64          `json:"temperature"`
		MaxTokens   int               `json:"max_tokens"`
		Stream      *bool             `json:"stream"`
		Tools       []json.RawMessage `json:"tools"`
	}
	raw, _ := json.Marshal(r.Raw)
	_ = json.Unmarshal(raw, &body)
	if body.Model != "mod-model" || body.Temperature == nil || *body.Temperature != 0 || body.MaxTokens != 512 ||
		body.Stream == nil || *body.Stream || len(body.Tools) != 1 || !strings.Contains(string(body.Tools[0]), `"submit_verdict"`) {
		t.Fatalf("body = %s", raw)
	}
	if r.Messages[0]["role"] != "system" || !strings.Contains(r.Messages[0]["content"].(string), "- illegal：") {
		t.Fatalf("system message = %v", r.Messages[0])
	}
	user := r.lastUser()
	if !strings.HasPrefix(user, userPreamble) || !strings.Contains(user, "please MOD-BLOCK") || !isSelfRequest(c.markerKey, user) {
		t.Fatalf("user message = %q", user)
	}
}

func TestAgentBadArgsThenOK(t *testing.T) {
	llm := newFakeLLM(t, func(req llmRequest, _ int) (int, any) {
		if !req.has("tool") {
			return 200, toolCallResp("c1", ToolName, `{"verdict":"maybe"}`)
		}
		return 200, toolCallResp("c2", ToolName, verdictFor(req.lastUser()))
	})
	res, err := newAgent().run(context.Background(), testConfig(llm.srv.URL, nil), "MOD-BADARGS check", true)
	if err != nil || res.Verdict.Verdict != VerdictPass || res.Turns != 2 || res.Usage.PromptTokens != 200 {
		t.Fatalf("res = %+v %v", res, err)
	}
	// system, user, assistant(bad), tool feedback, assistant(ok)
	if len(res.Transcript) != 5 {
		t.Fatalf("transcript = %d", len(res.Transcript))
	}
	second := llm.reqs()[1].Messages
	if second[2]["role"] != "assistant" || second[2]["tool_calls"] == nil || second[3]["role"] != "tool" ||
		second[3]["tool_call_id"] != "c1" || !strings.Contains(second[3]["content"].(string), "参数不合法") {
		t.Fatalf("second request = %v", second)
	}
	calls := second[2]["tool_calls"].([]any)
	fn := calls[0].(map[string]any)["function"].(map[string]any)
	if fn["arguments"] != `{"verdict":"maybe"}` {
		t.Fatalf("tool_calls not echoed verbatim: %v", calls)
	}
}

func TestAgentUnknownToolThenOK(t *testing.T) {
	llm := newFakeLLM(t, func(req llmRequest, n int) (int, any) {
		if n == 1 {
			return 200, toolCallResp("c1", "web_search", `{}`)
		}
		return 200, toolCallResp("c2", ToolName, verdictFor("MOD-FLAG"))
	})
	res, err := newAgent().run(context.Background(), testConfig(llm.srv.URL, nil), "x", false)
	if err != nil || res.Verdict.Verdict != VerdictFlag || res.Turns != 2 || res.Transcript != nil {
		t.Fatalf("res = %+v %v", res, err)
	}
	if m := llm.reqs()[1].Messages[3]; m["role"] != "tool" || !strings.Contains(m["content"].(string), "未知工具") {
		t.Fatalf("feedback = %v", m)
	}
}

func TestAgentNoToolThenOK(t *testing.T) {
	llm := newFakeLLM(t, func(req llmRequest, _ int) (int, any) {
		if !req.has("assistant") {
			return 200, textResp("我认为这段内容没有问题。")
		}
		return 200, toolCallResp("c1", ToolName, verdictFor(req.Messages[1]["content"].(string)))
	})
	res, err := newAgent().run(context.Background(), testConfig(llm.srv.URL, nil), "MOD-NOTOOL please", true)
	if err != nil || res.Verdict.Verdict != VerdictPass || res.Turns != 2 || len(res.Transcript) != 5 {
		t.Fatalf("res = %+v %v", res, err)
	}
	second := llm.reqs()[1].Messages
	if second[2]["role"] != "assistant" || second[3]["role"] != "user" || second[3]["content"] != "请调用 submit_verdict 工具提交审核结论。" {
		t.Fatalf("follow-up = %v", second)
	}
}

func TestAgentJSONContentFallback(t *testing.T) {
	llm := newFakeLLM(t, func(llmRequest, int) (int, any) {
		return 200, textResp("```json\n{\"verdict\":\"block\",\"categories\":[\"violence\",\"nope\"],\"reason\":\"暴力\"}\n```")
	})
	res, err := newAgent().run(context.Background(), testConfig(llm.srv.URL, nil), "x", false)
	if err != nil || res.Verdict.Verdict != VerdictBlock || strings.Join(res.Categories, ",") != "violence" || res.Turns != 1 {
		t.Fatalf("res = %+v %v", res, err)
	}
	// Content given as an array of text parts.
	llm2 := newFakeLLM(t, func(llmRequest, int) (int, any) {
		return 200, map[string]any{"choices": []any{map[string]any{"message": map[string]any{"role": "assistant",
			"content": []any{map[string]any{"type": "text", "text": `{"verdict":"pass","categories":[],"reason":"ok"}`}}}}}}
	})
	if res, err := newAgent().run(context.Background(), testConfig(llm2.srv.URL, nil), "x", false); err != nil || res.Verdict.Verdict != VerdictPass {
		t.Fatalf("parts: %+v %v", res, err)
	}
}

func TestAgentNoVerdict(t *testing.T) {
	llm := newFakeLLM(t, func(llmRequest, int) (int, any) { return 200, textResp("hmm") })
	c := testConfig(llm.srv.URL, func(s *Settings) { s.MaxTurns = 2 })
	res, err := newAgent().run(context.Background(), c, "x", true)
	if !errors.Is(err, ErrNoVerdict) || res.Turns != 2 || llm.calls.Load() != 2 || len(res.Transcript) != 6 {
		t.Fatalf("res = %+v err = %v calls = %d", res, err, llm.calls.Load())
	}
}

func TestAgentUpstreamErrors(t *testing.T) {
	llm := newFakeLLM(t, func(llmRequest, int) (int, any) {
		return 500, `{"error":{"message":"boom"}}`
	})
	_, err := newAgent().run(context.Background(), testConfig(llm.srv.URL, nil), "x", false)
	if err == nil || !strings.Contains(err.Error(), "upstream HTTP 500") || !strings.Contains(err.Error(), "boom") || llm.calls.Load() != 1 {
		t.Fatalf("err = %v calls = %d", err, llm.calls.Load())
	}
	bad := newFakeLLM(t, func(llmRequest, int) (int, any) { return 200, "not json" })
	if _, err := newAgent().run(context.Background(), testConfig(bad.srv.URL, nil), "x", false); err == nil || !strings.Contains(err.Error(), "invalid upstream JSON") {
		t.Fatalf("err = %v", err)
	}
	empty := newFakeLLM(t, func(llmRequest, int) (int, any) { return 200, `{"choices":[]}` })
	if _, err := newAgent().run(context.Background(), testConfig(empty.srv.URL, nil), "x", false); err == nil {
		t.Fatal("no choices must fail")
	}
	huge := newFakeLLM(t, func(llmRequest, int) (int, any) {
		return 200, `{"choices":[],"pad":"` + strings.Repeat("x", maxResponseBytes) + `"}`
	})
	if _, err := newAgent().run(context.Background(), testConfig(huge.srv.URL, nil), "x", false); err == nil || !strings.Contains(err.Error(), "1 MiB") {
		t.Fatalf("huge: %v", err)
	}
	slow := newFakeLLM(t, func(llmRequest, int) (int, any) { return 200, textResp("late") })
	slow.delay = 2 * time.Second
	ctx, cancel := context.WithTimeout(context.Background(), 100*time.Millisecond)
	defer cancel()
	if _, err := newAgent().run(ctx, testConfig(slow.srv.URL, nil), "x", false); err == nil || !strings.Contains(err.Error(), "timeout") {
		t.Fatalf("slow: %v", err)
	}
}

func TestAgentToolChoiceVariants(t *testing.T) {
	llm := newFakeLLM(t, func(llmRequest, int) (int, any) { return 200, toolCallResp("c", ToolName, verdictFor("")) })
	for mode, want := range map[string]string{
		"required": `"required"`, "auto": `"auto"`, "function": `{"type":"function","function":{"name":"submit_verdict"}}`,
	} {
		before := len(llm.reqs())
		c := testConfig(llm.srv.URL+"/v1", func(s *Settings) { s.ToolChoice = mode; s.Temperature = 0.5; s.MaxTokens = 100 })
		if _, err := newAgent().run(context.Background(), c, "x", false); err != nil {
			t.Fatal(err)
		}
		r := llm.reqs()[before]
		if string(r.ToolChoice) != want || r.Path != "/v1/chat/completions" || string(r.Raw["temperature"]) != "0.5" || string(r.Raw["max_tokens"]) != "100" {
			t.Fatalf("%s: tool_choice %s path %s body %v", mode, r.ToolChoice, r.Path, r.Raw)
		}
	}
}
