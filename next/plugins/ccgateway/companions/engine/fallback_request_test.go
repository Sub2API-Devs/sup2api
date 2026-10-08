package engine

import (
	"bytes"
	"compress/gzip"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"strings"
	"sync/atomic"
	"testing"
)

func explicitFallbackFixture(stream bool) Object {
	return Object{"model": "claude-opus-5-5", "max_tokens": 128, "stream": stream, "messages": []any{Object{"role": "user", "content": "isolated explicit fallback fixture"}}, "fallbacks": []any{Object{"model": "claude-opus-4-8", "max_tokens": 99, "thinking": Object{"type": "disabled"}, "speed": "standard"}}}
}
func TestFallbackRequestPlan(t *testing.T) {
	h := http.Header{"Anthropic-Beta": []string{"server-side-fallback-2026-07-01"}}
	raw, _ := json.Marshal(explicitFallbackFixture(false))
	req, e := parsePolicyRequest(raw, h)
	if e != nil {
		t.Fatal(e)
	}
	wire := Object{"model": req.Model, "messages": []any{}}
	if e = req.ApplyMainRequestFeatures(wire); e != nil {
		t.Fatal(e)
	}
	if digest(wire["fallbacks"]) != digest(explicitFallbackFixture(false)["fallbacks"]) {
		t.Fatal("override changed")
	}
	if !req.fallbackJSON() || !req.needsFreshNativeSession() {
		t.Fatal("JSON chain not isolated")
	}
	if e = req.validateRoutingProvider([]string{"CLAUDE_CODE_USE_BEDROCK=1"}); e == nil {
		t.Fatal("unsupported provider accepted")
	}
	for _, fallback := range []any{"default", []any{}, []any{Object{"model": "claude-opus-5-5"}}, []any{Object{"model": "x", "unknown": true}}, []any{Object{"model": "x", "max_tokens": 1.5}}} {
		body := explicitFallbackFixture(false)
		body["fallbacks"] = fallback
		raw, _ := json.Marshal(body)
		if _, e = parsePolicyRequest(raw, h); e == nil {
			t.Fatal("invalid chain accepted", fallback)
		}
	}
	if _, e = parsePolicyRequest(raw, http.Header{}); e == nil {
		t.Fatal("missing beta accepted")
	}
}

func TestRealCLIExplicitFallbackJSONAndSSE(t *testing.T) {
	for _, stream := range []bool{false, true} {
		t.Run(fmt.Sprintf("stream-%v", stream), func(t *testing.T) {
			var calls atomic.Int32
			handler := func(w http.ResponseWriter, r *http.Request) {
				if !strings.HasSuffix(r.URL.Path, "/messages") {
					fmt.Fprint(w, `{"input_tokens":1}`)
					return
				}
				raw, _ := io.ReadAll(r.Body)
				body, _ := decodeObject(raw)
				if body["fallbacks"] == nil {
					generationFixtureEvents(w, str(body, "model"), "end_turn", "aux", false)
					return
				}
				calls.Add(1)
				if body["stream"] != stream {
					t.Error("JSON/SSE upstream semantics changed")
				}
				if digest(body["fallbacks"]) != digest(explicitFallbackFixture(stream)["fallbacks"]) {
					t.Error("fallback override lost")
				}
				if !strings.Contains(r.Header.Get("Anthropic-Beta"), "server-side-fallback-2026-07-01") {
					t.Error("beta missing")
				}
				blocks := []Object{fallbackFixture(), {"type": "text", "text": "AFTER"}}
				if stream {
					writeFallbackFixture(w, "claude-opus-5-5", append([]Object{{"type": "text", "text": "DECLINED_PARTIAL"}}, blocks...))
					return
				}
				answer := Object{"id": "msg_fallback_json", "type": "message", "role": "assistant", "model": "claude-opus-4-8", "content": blocks, "stop_reason": "end_turn", "stop_sequence": nil, "stop_details": nil, "usage": Object{"input_tokens": 41, "output_tokens": 8, "iterations": fallbackUsageIterations()}, "input_transformations": []any{}}
				w.Header().Set("Content-Type", "application/json")
				w.Header().Set("Content-Encoding", "gzip")
				writer := gzip.NewWriter(w)
				json.NewEncoder(writer).Encode(answer)
				writer.Close()
			}
			endpoint, _ := newThinkingOutputFixture(t, handler)
			body := explicitFallbackFixture(stream)
			post := func() (Object, error) {
				raw, _ := json.Marshal(body)
				request, _ := http.NewRequest("POST", endpoint+"/v1/messages", bytes.NewReader(raw))
				request.Header.Set("Anthropic-Beta", "server-side-fallback-2026-07-01")
				response, e := http.DefaultClient.Do(request)
				if e != nil {
					return nil, e
				}
				defer response.Body.Close()
				answer, _ := io.ReadAll(response.Body)
				if response.StatusCode != 200 {
					return nil, fmt.Errorf("HTTP%d %s", response.StatusCode, answer)
				}
				if stream {
					if !bytes.Contains(answer, []byte("DECLINED_PARTIAL")) || !bytes.Contains(answer, []byte("AFTER")) {
						return nil, fmt.Errorf("stream partial content missing: %s", answer)
					}
					return nil, nil
				}
				parsed, e := decodeObject(answer)
				if e != nil {
					return nil, e
				}
				if bytes.Contains(answer, []byte("DECLINED_PARTIAL")) {
					return nil, fmt.Errorf("SSE partial leaked into JSON")
				}
				if str(parsed, "model") != "claude-opus-4-8" || digest(parsed["usage"].(Object)["iterations"]) != digest(fallbackUsageIterations()) {
					return nil, fmt.Errorf("original model/usage lost")
				}
				return parsed, nil
			}
			answer, e := post()
			if e != nil {
				t.Fatal(e)
			}
			if !stream {
				base := append(append([]any(nil), body["messages"].([]any)...), Object{"role": "assistant", "content": answer["content"]})
				for _, label := range []string{"continue", "rollback", "cold-import"} {
					body["messages"] = append(append([]any(nil), base...), Object{"role": "user", "content": label})
					if label == "cold-import" {
						endpoint, _ = newThinkingOutputFixture(t, handler)
					}
					if _, e = post(); e != nil {
						t.Fatal(label, e)
					}
				}
			}
			want := int32(1)
			if !stream {
				want = 4
			}
			if calls.Load() != want {
				t.Fatalf("implicit retry: %d", calls.Load())
			}
		})
	}
}

func TestRealCLIExplicitFallbackProviderErrorsAreNotRetried(t *testing.T) {
	for _, stream := range []bool{false, true} {
		t.Run(fmt.Sprint(stream), func(t *testing.T) {
			var calls atomic.Int32
			endpoint, _ := newThinkingOutputFixture(t, func(w http.ResponseWriter, r *http.Request) {
				raw, _ := io.ReadAll(r.Body)
				body, _ := decodeObject(raw)
				if body["fallbacks"] == nil {
					fmt.Fprint(w, `{"input_tokens":1}`)
					return
				}
				calls.Add(1)
				w.Header().Set("Content-Type", "application/json")
				w.Header().Set("Retry-After", "9")
				w.Header().Set("request-id", "fallback-error-fixture")
				w.WriteHeader(429)
				fmt.Fprint(w, `{"type":"error","error":{"type":"rate_limit_error","message":"fixture"}}`)
			})
			raw, _ := json.Marshal(explicitFallbackFixture(stream))
			request, _ := http.NewRequest("POST", endpoint+"/v1/messages", bytes.NewReader(raw))
			request.Header.Set("Anthropic-Beta", "server-side-fallback-2026-07-01")
			response, e := http.DefaultClient.Do(request)
			if e != nil {
				t.Fatal(e)
			}
			defer response.Body.Close()
			body, _ := io.ReadAll(response.Body)
			if response.StatusCode != 429 || response.Header.Get("Retry-After") != "9" || !bytes.Contains(body, []byte("rate_limit_error")) {
				t.Fatal(response.StatusCode, response.Header, string(body))
			}
			if calls.Load() != 1 {
				t.Fatal("chain retried", calls.Load())
			}
		})
	}
}

func TestRealCLIExplicitFallbackAllRefusalRemains200(t *testing.T) {
	var calls atomic.Int32
	endpoint, _ := newThinkingOutputFixture(t, func(w http.ResponseWriter, r *http.Request) {
		raw, _ := io.ReadAll(r.Body)
		body, _ := decodeObject(raw)
		if body["fallbacks"] == nil {
			fmt.Fprint(w, `{"input_tokens":1}`)
			return
		}
		calls.Add(1)
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(Object{"id": "msg_fallback_refusal", "type": "message", "role": "assistant", "model": "claude-opus-4-8", "content": []any{fallbackFixture()}, "stop_reason": "refusal", "stop_details": Object{"type": "refusal", "category": "bio", "explanation": "synthetic classifier"}, "usage": Object{"input_tokens": 5, "output_tokens": 0, "iterations": []any{Object{"type": "message", "model": "claude-opus-5-5", "input_tokens": 5, "output_tokens": 0}, Object{"type": "fallback_message", "model": "claude-opus-4-8", "input_tokens": 5, "output_tokens": 0}}}})
	})
	raw, _ := json.Marshal(explicitFallbackFixture(false))
	request, _ := http.NewRequest("POST", endpoint+"/v1/messages", bytes.NewReader(raw))
	request.Header.Set("Anthropic-Beta", "server-side-fallback-2026-07-01")
	response, e := http.DefaultClient.Do(request)
	if e != nil {
		t.Fatal(e)
	}
	defer response.Body.Close()
	answer, _ := io.ReadAll(response.Body)
	parsed, e := decodeObject(answer)
	if e != nil || response.StatusCode != 200 || str(parsed, "stop_reason") != "refusal" {
		t.Fatal(response.StatusCode, string(answer), e)
	}
	if calls.Load() != 1 {
		t.Fatal("refusal retried", calls.Load())
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
		if _, e := parsePolicyRequest(raw, h); e == nil {
			t.Fatal("compaction chain admitted without ownership")
		}
	}
	body := explicitFallbackFixture(false)
	body["compaction"] = nil
	body["context_management"] = Object{"edits": []any{Object{"type": "clear_tool_uses_20250919"}}}
	raw, _ := json.Marshal(body)
	if _, e := parsePolicyRequest(raw, h); e != nil {
		t.Fatal("ordinary context clearing rejected", e)
	}
}
