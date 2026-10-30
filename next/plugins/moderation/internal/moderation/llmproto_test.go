package moderation

import (
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"net/http/httptest"
	"strings"
	"sync"
	"testing"
	"time"
)

// scriptTurn is one scripted model turn of fakeProto.
type scriptTurn struct {
	Text  string
	Calls []llmToolCall
	Usage llmUsage
}

// protoReq is one request fakeProto received.
type protoReq struct {
	Path   string
	Header http.Header
	Body   map[string]json.RawMessage
}

// fakeProto is an upstream speaking one LLM protocol, streaming or not as
// asked; respond scripts the n-th turn (1-based).
type fakeProto struct {
	srv     *httptest.Server
	proto   string
	mu      sync.Mutex
	reqs    []protoReq
	respond func(n int, req protoReq) (int, scriptTurn)
}

func newFakeProto(t *testing.T, proto string, respond func(n int, req protoReq) (int, scriptTurn)) *fakeProto {
	f := &fakeProto{proto: proto, respond: respond}
	f.srv = httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		raw, _ := io.ReadAll(r.Body)
		req := protoReq{Path: r.URL.Path, Header: r.Header.Clone()}
		_ = json.Unmarshal(raw, &req.Body)
		f.mu.Lock()
		f.reqs = append(f.reqs, req)
		n := len(f.reqs)
		f.mu.Unlock()
		status, turn := f.respond(n, req)
		if status != 200 {
			w.WriteHeader(status)
			_, _ = io.WriteString(w, `{"error":{"message":"scripted failure"}}`)
			return
		}
		stream := string(req.Body["stream"]) == "true"
		if !stream {
			w.Header().Set("Content-Type", "application/json")
			_ = json.NewEncoder(w).Encode(f.nonStream(turn))
			return
		}
		w.Header().Set("Content-Type", "text/event-stream")
		for _, ev := range f.events(turn) {
			if ev[0] != "" {
				fmt.Fprintf(w, "event: %s\n", ev[0])
			}
			fmt.Fprintf(w, "data: %s\n\n", ev[1])
		}
	}))
	t.Cleanup(f.srv.Close)
	return f
}

func (f *fakeProto) requests() []protoReq {
	f.mu.Lock()
	defer f.mu.Unlock()
	return append([]protoReq(nil), f.reqs...)
}

func js(v any) string {
	b, _ := json.Marshal(v)
	return string(b)
}

func (f *fakeProto) nonStream(t scriptTurn) any {
	switch f.proto {
	case ProtocolAnthropic:
		content := []any{}
		if t.Text != "" {
			content = append(content, map[string]any{"type": "text", "text": t.Text})
		}
		for _, c := range t.Calls {
			content = append(content, map[string]any{"type": "tool_use", "id": c.ID, "name": c.Name, "input": json.RawMessage(c.Args)})
		}
		return map[string]any{"model": "claude-mock", "content": content, "usage": map[string]any{"input_tokens": t.Usage.Input, "output_tokens": t.Usage.Output,
			"cache_read_input_tokens": t.Usage.CacheRead}}
	case ProtocolOpenAIResponses:
		out := []any{}
		if t.Text != "" {
			out = append(out, map[string]any{"type": "message", "content": []any{map[string]any{"type": "output_text", "text": t.Text}}})
		}
		for _, c := range t.Calls {
			out = append(out, map[string]any{"type": "function_call", "call_id": c.ID, "name": c.Name, "arguments": string(c.Args)})
		}
		return map[string]any{"model": "resp-mock", "output": out, "usage": map[string]any{"input_tokens": t.Usage.Input, "output_tokens": t.Usage.Output,
			"input_tokens_details": map[string]any{"cached_tokens": t.Usage.CacheRead}}}
	}
	msg := map[string]any{"role": "assistant", "content": t.Text}
	if len(t.Calls) > 0 {
		var calls []any
		for _, c := range t.Calls {
			calls = append(calls, map[string]any{"id": c.ID, "type": "function", "function": map[string]any{"name": c.Name, "arguments": string(c.Args)}})
		}
		msg["tool_calls"] = calls
	}
	return map[string]any{"model": "chat-mock", "choices": []any{map[string]any{"message": msg}},
		"usage": map[string]any{"prompt_tokens": t.Usage.Input, "completion_tokens": t.Usage.Output, "prompt_tokens_details": map[string]any{"cached_tokens": t.Usage.CacheRead}}}
}

// events renders a turn as the protocol's SSE events, arguments split in two
// fragments to exercise the joining.
func (f *fakeProto) events(t scriptTurn) [][2]string {
	var evs [][2]string
	half := func(s string) (string, string) { return s[:len(s)/2], s[len(s)/2:] }
	switch f.proto {
	case ProtocolAnthropic:
		evs = append(evs, [2]string{"message_start", js(map[string]any{"type": "message_start", "message": map[string]any{"model": "claude-mock",
			"usage": map[string]any{"input_tokens": t.Usage.Input, "cache_read_input_tokens": t.Usage.CacheRead}}})})
		i := 0
		if t.Text != "" {
			evs = append(evs, [2]string{"content_block_start", js(map[string]any{"index": i, "content_block": map[string]any{"type": "text", "text": ""}})},
				[2]string{"content_block_delta", js(map[string]any{"index": i, "delta": map[string]any{"type": "text_delta", "text": t.Text}})})
			i++
		}
		for _, c := range t.Calls {
			a, b := half(string(c.Args))
			evs = append(evs, [2]string{"content_block_start", js(map[string]any{"index": i, "content_block": map[string]any{"type": "tool_use", "id": c.ID, "name": c.Name}})},
				[2]string{"content_block_delta", js(map[string]any{"index": i, "delta": map[string]any{"type": "input_json_delta", "partial_json": a}})},
				[2]string{"content_block_delta", js(map[string]any{"index": i, "delta": map[string]any{"type": "input_json_delta", "partial_json": b}})})
			i++
		}
		evs = append(evs, [2]string{"message_delta", js(map[string]any{"usage": map[string]any{"output_tokens": t.Usage.Output}})}, [2]string{"message_stop", `{}`})
	case ProtocolOpenAIResponses:
		if t.Text != "" {
			evs = append(evs, [2]string{"response.output_text.delta", js(map[string]any{"delta": t.Text})})
		}
		var out []any
		for i, c := range t.Calls {
			a, b := half(string(c.Args))
			evs = append(evs, [2]string{"response.output_item.added", js(map[string]any{"output_index": i, "item": map[string]any{"type": "function_call", "call_id": c.ID, "name": c.Name}})},
				[2]string{"response.function_call_arguments.delta", js(map[string]any{"output_index": i, "delta": a})},
				[2]string{"response.function_call_arguments.delta", js(map[string]any{"output_index": i, "delta": b})})
			out = append(out, map[string]any{"type": "function_call", "call_id": c.ID, "name": c.Name})
		}
		evs = append(evs, [2]string{"response.completed", js(map[string]any{"response": map[string]any{"model": "resp-mock", "output": out,
			"usage": map[string]any{"input_tokens": t.Usage.Input, "output_tokens": t.Usage.Output, "input_tokens_details": map[string]any{"cached_tokens": t.Usage.CacheRead}}}})})
	default:
		chunk := func(delta map[string]any, finish any) string {
			return js(map[string]any{"model": "chat-mock", "choices": []any{map[string]any{"index": 0, "delta": delta, "finish_reason": finish}}, "error": nil})
		}
		if t.Text != "" {
			evs = append(evs, [2]string{"", chunk(map[string]any{"content": t.Text}, nil)})
		}
		for i, c := range t.Calls {
			a, b := half(string(c.Args))
			evs = append(evs, [2]string{"", chunk(map[string]any{"tool_calls": []any{map[string]any{"index": i, "id": c.ID, "function": map[string]any{"name": c.Name, "arguments": a}}}}, nil)},
				[2]string{"", chunk(map[string]any{"tool_calls": []any{map[string]any{"index": i, "function": map[string]any{"arguments": b}}}}, nil)})
		}
		evs = append(evs, [2]string{"", chunk(map[string]any{}, "stop")},
			[2]string{"", js(map[string]any{"choices": []any{}, "usage": map[string]any{"prompt_tokens": t.Usage.Input, "completion_tokens": t.Usage.Output,
				"prompt_tokens_details": map[string]any{"cached_tokens": t.Usage.CacheRead}}})},
			[2]string{"", "[DONE]"})
	}
	return evs
}

func TestLLMProtocols(t *testing.T) {
	turn := scriptTurn{Text: "thinking", Calls: []llmToolCall{{ID: "c1", Name: "get_record", Args: []byte(`{"id":42,"offset":0}`)}},
		Usage: llmUsage{Input: 100, Output: 20, CacheRead: 30}}
	for _, proto := range []string{ProtocolOpenAIChat, ProtocolOpenAIResponses, ProtocolAnthropic} {
		for _, stream := range []bool{false, true} {
			t.Run(fmt.Sprintf("%s/stream=%v", proto, stream), func(t *testing.T) {
				f := newFakeProto(t, proto, func(int, protoReq) (int, scriptTurn) { return 200, turn })
				ch := &liveChannel{Type: ChannelLLM, Protocol: proto, BaseURL: f.srv.URL + "/v1", Key: "sk-x", Model: "m1"}
				temp := 0.0
				got, err := protocolOf(ch).call(context.Background(), ch, llmRequest{System: "sys", Messages: []any{llmUserMessage("hi")},
					Tools: []LLMTool{{Name: "get_record", Description: "d", Schema: map[string]any{"type": "object"}}}, ToolChoice: ChoiceRequired,
					Temperature: &temp, Stream: stream, HeaderTimeout: time.Second})
				if err != nil {
					t.Fatal(err)
				}
				if got.Text != "thinking" || len(got.ToolCalls) != 1 || got.ToolCalls[0].ID != "c1" || got.ToolCalls[0].Name != "get_record" ||
					string(got.ToolCalls[0].Args) != `{"id":42,"offset":0}` {
					t.Fatalf("turn = %+v", got)
				}
				wantSem := SemanticsInclusive
				if proto == ProtocolAnthropic {
					wantSem = SemanticsExclusive
				}
				if got.Usage != (llmUsage{Input: 100, Output: 20, CacheRead: 30, Semantics: wantSem}) {
					t.Fatalf("usage = %+v", got.Usage)
				}
				r := f.requests()[0]
				switch proto {
				case ProtocolAnthropic:
					if r.Path != "/v1/messages" || r.Header.Get("x-api-key") != "sk-x" || r.Header.Get("anthropic-version") == "" ||
						string(r.Body["tool_choice"]) != `{"type":"any"}` || !strings.Contains(string(r.Body["system"]), `"sys"`) {
						t.Fatalf("anthropic request %s %v %s", r.Path, r.Header, r.Body["tool_choice"])
					}
				case ProtocolOpenAIResponses:
					if r.Path != "/v1/responses" || r.Header.Get("Authorization") != "Bearer sk-x" || string(r.Body["tool_choice"]) != `"required"` ||
						string(r.Body["instructions"]) != `"sys"` || string(r.Body["store"]) != "false" {
						t.Fatalf("responses request %s %s", r.Path, r.Body)
					}
				default:
					if r.Path != "/v1/chat/completions" || r.Header.Get("Authorization") != "Bearer sk-x" || string(r.Body["tool_choice"]) != `"required"` {
						t.Fatalf("chat request %s %s", r.Path, r.Body)
					}
				}
				// The turn renders back in the protocol's shape.
				msgs := append(protocolOf(ch).assistant(got), protocolOf(ch).toolResults([]toolResult{{CallID: "c1", Content: "{}"}})...)
				if s := js(msgs); !strings.Contains(s, "c1") || !strings.Contains(s, `\"id\":42`) && !strings.Contains(s, `"id":42`) {
					t.Fatalf("rendered %s", s)
				}
			})
		}
	}
}

func TestLLMProtocolErrors(t *testing.T) {
	f := newFakeProto(t, ProtocolAnthropic, func(int, protoReq) (int, scriptTurn) { return 429, scriptTurn{} })
	ch := &liveChannel{Type: ChannelLLM, Protocol: ProtocolAnthropic, BaseURL: f.srv.URL, Key: "k", Model: "m"}
	_, err := protocolOf(ch).call(context.Background(), ch, llmRequest{Messages: []any{llmUserMessage("x")}, Stream: true})
	if upstreamStatus(err) != 429 || !retryableStepError(err) {
		t.Fatalf("429: %v", err)
	}
	// A stream that ends without its final event is cut (retryable).
	cut := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "text/event-stream")
		_, _ = io.WriteString(w, "event: message_start\ndata: {\"message\":{\"usage\":{\"input_tokens\":5}}}\n\n")
	}))
	defer cut.Close()
	ch.BaseURL = cut.URL
	turn, err := protocolOf(ch).call(context.Background(), ch, llmRequest{Messages: []any{llmUserMessage("x")}, Stream: true})
	if !retryableStepError(err) || turn.Usage.Input != 5 {
		t.Fatalf("cut: %v %+v", err, turn.Usage)
	}
	// An error event inside a chat stream.
	ev := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		_, _ = io.WriteString(w, "data: {\"error\":{\"message\":\"x\"}}\n\n")
	}))
	defer ev.Close()
	ch2 := &liveChannel{Type: ChannelLLM, Protocol: ProtocolOpenAIChat, BaseURL: ev.URL, Model: "m"}
	if _, err := protocolOf(ch2).call(context.Background(), ch2, llmRequest{Messages: []any{llmUserMessage("x")}, Stream: true}); err != errStreamError {
		t.Fatalf("error event: %v", err)
	}
}

// The §20 verdict agent works over every protocol.
func TestVerdictAgentProtocols(t *testing.T) {
	for _, proto := range []string{ProtocolOpenAIResponses, ProtocolAnthropic} {
		t.Run(proto, func(t *testing.T) {
			f := newFakeProto(t, proto, func(n int, req protoReq) (int, scriptTurn) {
				if n == 1 {
					return 200, scriptTurn{Calls: []llmToolCall{{ID: "a", Name: ToolName, Args: []byte(`{"verdict":"maybe"}`)}}, Usage: llmUsage{Input: 10, Output: 1}}
				}
				return 200, scriptTurn{Calls: []llmToolCall{{ID: "b", Name: ToolName, Args: []byte(verdictFor("MOD-BLOCK"))}}, Usage: llmUsage{Input: 20, Output: 2}}
			})
			ch := &liveChannel{Type: ChannelLLM, Protocol: proto, BaseURL: f.srv.URL, Key: "k", Model: "m"}
			ch.markerKey = markerKey(ch.Key)
			res, err := newAgent().run(context.Background(), compileJudge(AuditorConfig{}, ch), "text", false)
			if err != nil || res.Verdict.Verdict != VerdictBlock || res.Turns != 2 || res.Billing.Input != 30 || res.Billing.Output != 3 {
				t.Fatalf("res = %+v %v", res, err)
			}
			second := string(f.requests()[1].Body["messages"]) + string(f.requests()[1].Body["input"])
			if !strings.Contains(second, "参数不合法") {
				t.Fatalf("feedback not sent back: %s", second)
			}
		})
	}
}

func TestEscalationOf(t *testing.T) {
	for _, tc := range []struct {
		level, trend, suggestion string
		v                        int
		want                     string
	}{
		{LevelObserve, TrendPersistent, SuggestBlock, 1, ActionAutoUpgrade},
		{LevelObserve, TrendEscalating, SuggestBlock, 0, ActionUpgradeSkipped},
		{LevelObserve, TrendOccasional, SuggestBlock, 3, ""},
		{LevelEnforce, TrendPersistent, SuggestBlock, 3, ""},
		{LevelObserve, TrendOccasional, SuggestRelease, 0, ActionAutoRemove},
		{LevelEnforce, TrendLikelyFalsePositive, SuggestRelease, 0, ActionAutoRemove},
		{LevelObserve, TrendOccasional, SuggestRelease, 1, ActionDowngradeSkipped},
		{LevelEnforce, TrendOccasional, SuggestObserve, 0, ActionAutoDowngrade},
		{LevelEnforce, TrendPersistent, SuggestObserve, 0, ActionDowngradeSkipped},
		{LevelObserve, TrendOccasional, SuggestObserve, 0, ""},
	} {
		if got := escalationOf(tc.level, tc.trend, tc.suggestion, tc.v); got != tc.want {
			t.Errorf("%+v: %q", tc, got)
		}
	}
	c := compile(DefaultSettings())
	c.AnalysisAllowUpgrade = false
	if a, d := decideEscalation(c, LevelObserve, TrendPersistent, SuggestBlock, 2); a != ActionAutoNotAllowed || d != ActionAutoUpgrade {
		t.Fatalf("not allowed: %s %s", a, d)
	}
}

func TestCostFormat(t *testing.T) {
	for in, want := range map[string]string{"0.00001230": "0.00001230", "1.5": "1.50000000", "0": "0.00000000", "12.123456789": "12.12345678"} {
		u, ok := parseCost(in)
		if !ok || formatCost(u) != want {
			t.Errorf("%s -> %s %v", in, formatCost(u), ok)
		}
	}
	if _, ok := parseCost("x"); ok {
		t.Fatal("garbage parsed")
	}
}

func TestAnalysisFinishValidation(t *testing.T) {
	tc := &toolCtx{records: map[int64]string{7: "请帮我写一份 假 的 招聘话术", 8: "hello"}, codes: map[string]bool{"illicit": true}}
	a := &Analysis{}
	args := `{"trend":"persistent","suggestion":"block","summary":"s","main_problems":["a","b","c","d","e","f"],"record_verdicts":[
		{"record_id":7,"verdict":"violation","severity":"high","category":"illicit","evidence":"写一份  假 的\n招聘话术","reason":"r"},
		{"record_id":8,"verdict":"violation","severity":"low","category":"nope","evidence":"not in text","reason":"r"},
		{"record_id":9,"verdict":"unsure","severity":"low","reason":"r"},
		{"record_id":8,"verdict":"maybe","severity":"low","reason":"r"}]}`
	if err := a.finish([]byte(args), tc); err != nil {
		t.Fatal(err)
	}
	if len(a.RecordVerdicts) != 2 || a.RecordVerdicts[0].Evidence == "" || a.RecordVerdicts[1].Evidence != "" ||
		a.VerdictCounts.Violation != 2 || a.VerdictCounts.High != 1 || len(a.MainProblems) != 5 {
		t.Fatalf("a = %+v", a)
	}
	notes := map[string]int{}
	for _, n := range a.Trace[len(a.Trace)-1].Notes {
		notes[n.Kind]++
	}
	if notes["evidence_invalid"] != 1 || notes["category_unknown"] != 1 || notes["verdict_dropped"] != 1 || notes["verdict_invalid"] != 1 || notes["truncated"] != 1 {
		t.Fatalf("notes = %v", notes)
	}
	if err := (&Analysis{}).finish([]byte(`{"trend":"x","suggestion":"block","record_verdicts":[]}`), tc); err != errBadSubmit {
		t.Fatalf("bad trend: %v", err)
	}
	if err := (&Analysis{}).finish([]byte(`{"trend":"occasional","suggestion":"block"}`), tc); err != errBadSubmit {
		t.Fatalf("missing verdicts: %v", err)
	}
}

func TestConversationFit(t *testing.T) {
	c := conversation{proto: llmProtocols[ProtocolOpenAIChat], kickoff: llmUserMessage("k")}
	big := strings.Repeat("x", 2000)
	for i := range 3 {
		c.add(llmTurn{ToolCalls: []llmToolCall{{ID: fmt.Sprint(i), Name: "t", Args: []byte("{}")}}}, []toolResult{{CallID: fmt.Sprint(i), Content: big}})
	}
	c.fit(3500)
	if c.budgetSpent || c.turns[0].results[0].Content != removedResult || c.turns[2].results[0].Content != big {
		t.Fatalf("fit: spent=%v", c.budgetSpent)
	}
	c.fit(100)
	if !c.budgetSpent || c.turns[2].results[0].Content != big {
		t.Fatal("the latest results must stay; the budget is spent")
	}
}
