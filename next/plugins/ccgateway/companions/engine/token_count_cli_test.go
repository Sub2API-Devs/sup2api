package engine

import (
	"bytes"
	"compress/gzip"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"strings"
	"testing"
	"time"
)

func TestRealCLITokenCountUsesCountEndpointAndInnerAuth(t *testing.T) {
	for _, auth := range []string{"apikey", "oauth"} {
		for _, failure := range []bool{false, true} {
			t.Run(fmt.Sprintf("%s/error=%t", auth, failure), func(t *testing.T) {
				calls := make(chan Object, 8)
				url, cache := newThinkingOutputFixture(t, func(w http.ResponseWriter, r *http.Request) {
					if !strings.HasSuffix(r.URL.Path, "/messages/count_tokens") {
						t.Errorf("token count attempted unexpected endpoint: %s", r.URL.Path)
						http.Error(w, "generation forbidden", 500)
						return
					}
					if auth == "apikey" && r.Header.Get("X-Api-Key") != "dummy-generation-fixture" {
						t.Error("inner API key not preserved")
					}
					if auth == "oauth" && r.Header.Get("Authorization") != "Bearer dummy-count-oauth" {
						t.Error("inner OAuth not preserved")
					}
					raw, _ := io.ReadAll(r.Body)
					body, _ := decodeObject(raw)
					calls <- body
					w.Header().Set("Content-Type", "application/json")
					if failure {
						w.WriteHeader(429)
						fmt.Fprint(w, `{"type":"error","error":{"type":"rate_limit_error","message":"count fixture limit"}}`)
						return
					}
					w.Header().Set("Content-Encoding", "gzip")
					zip := gzip.NewWriter(w)
					fmt.Fprint(zip, `{"input_tokens":1234}`)
					zip.Close()
				}, func(env []string) []string {
					if auth == "oauth" {
						return envWith(env, map[string]string{"ANTHROPIC_API_KEY": "", "CLAUDE_CODE_OAUTH_TOKEN": "dummy-count-oauth"})
					}
					return env
				})
				body := Object{"model": "claude-opus-5-5", "messages": []any{Object{"role": "user", "content": "CLIENT_COUNT_ONLY"}}, "system": "count system", "tools": []any{Object{"name": "fixture_tool", "input_schema": Object{"type": "object"}}}}
				raw, _ := json.Marshal(body)
				req, _ := http.NewRequest("POST", url+"/v1/messages/count_tokens", bytes.NewReader(raw))
				req.Header.Set("x-api-key", "dummy-outer-platform-key")
				req.Header.Set("Content-Type", "application/json")
				res, err := (&http.Client{Timeout: 25 * time.Second}).Do(req)
				if err != nil {
					t.Fatal(err)
				}
				out, _ := io.ReadAll(res.Body)
				res.Body.Close()
				if failure {
					if res.StatusCode != 429 || !bytes.Contains(out, []byte("count fixture limit")) {
						t.Fatalf("upstream count error changed: %d %s", res.StatusCode, out)
					}
				} else if res.StatusCode != 200 || strings.TrimSpace(string(out)) != `{"input_tokens":1234}` {
					t.Fatalf("real count response changed: %d %s", res.StatusCode, out)
				}
				if len(calls) != 1 {
					t.Fatal("count retry or missing count", len(calls))
				}
				wire := <-calls
				want, _ := decodeObject(raw)
				if digest(wire) != digest(want) {
					t.Fatalf("count input is not the original client body: %v", wire)
				}
				for _, field := range []string{"stream", "max_tokens", "metadata", "service_tier", "temperature", "top_p", "stop_sequences", "safeguards"} {
					if _, ok := wire[field]; ok {
						t.Errorf("count sent illegal generation field %s", field)
					}
				}
				history, _ := json.Marshal(wire["messages"])
				if !bytes.Contains(history, []byte("CLIENT_COUNT_ONLY")) {
					t.Fatal("input disappeared")
				}
				cache.mu.Lock()
				entries := len(cache.entries)
				cache.mu.Unlock()
				if entries != 0 {
					t.Fatal("count committed a generation history snapshot")
				}
			})
		}
	}
}

func TestRealCLITokenCountHistoricalPrefillAndMalformedResponse(t *testing.T) {
	for _, malformed := range []bool{false, true} {
		t.Run(fmt.Sprintf("malformed=%t", malformed), func(t *testing.T) {
			calls := make(chan Object, 4)
			url, cache := newThinkingOutputFixture(t, func(w http.ResponseWriter, r *http.Request) {
				if !strings.HasSuffix(r.URL.Path, "/messages/count_tokens") {
					t.Errorf("count generated instead: %s", r.URL.Path)
				}
				raw, _ := io.ReadAll(r.Body)
				body, _ := decodeObject(raw)
				calls <- body
				w.Header().Set("Content-Type", "application/json")
				if malformed {
					fmt.Fprint(w, `{"input_tokens":-1}`)
				} else {
					fmt.Fprint(w, `{"input_tokens":0,"context_management":{"original_input_tokens":45}}`)
				}
			})
			body := Object{"model": "claude-sonnet-4-6", "messages": []any{
				Object{"role": "user", "content": "count historical turn"},
				Object{"role": "assistant", "content": "partial prefill"},
			}}
			raw, _ := json.Marshal(body)
			res, err := (&http.Client{Timeout: 25 * time.Second}).Post(url+"/v1/messages/count_tokens", "application/json", bytes.NewReader(raw))
			if err != nil {
				t.Fatal(err)
			}
			out, _ := io.ReadAll(res.Body)
			res.Body.Close()
			if malformed && res.StatusCode != 502 {
				t.Fatalf("invalid count accepted: %d %s", res.StatusCode, out)
			}
			if !malformed && (res.StatusCode != 200 || !bytes.Contains(out, []byte(`"original_input_tokens":45`))) {
				t.Fatalf("actual response lost: %d %s", res.StatusCode, out)
			}
			if len(calls) != 1 {
				t.Fatalf("calls=%d", len(calls))
			}
			wire := <-calls
			want, _ := decodeObject(raw)
			if digest(wire) != digest(want) {
				t.Fatal("count prefill is not original input")
			}
			messages := wire["messages"].([]any)
			if len(messages) != 2 || str(messages[1].(Object), "role") != "assistant" {
				t.Fatalf("count prefill altered: %v", messages)
			}
			tail, _ := json.Marshal(messages[1])
			if !bytes.Contains(tail, []byte("partial prefill")) {
				t.Fatal("prefill content lost")
			}
			cache.mu.Lock()
			entries := len(cache.entries)
			cache.mu.Unlock()
			if entries != 0 {
				t.Fatal("count wrote history")
			}
		})
	}
}

func TestRealCLITokenCountLongClientInputIsExact(t *testing.T) {
	var messages []any
	for i := 0; i < 40; i++ {
		messages = append(messages, Object{"role": "user", "content": fmt.Sprintf("turn %d %s", i, strings.Repeat("client history text ", 200))})
		if i == 19 {
			messages = append(messages, Object{"role": "system", "content": "CLIENT_MID_SYSTEM_UNMOVED"})
		}
		messages = append(messages, Object{"role": "assistant", "content": fmt.Sprintf("answer %d", i)})
	}
	messages = append(messages, Object{"role": "user", "content": []any{Object{"type": "text", "text": "pending count input", "cache_control": Object{"type": "ephemeral"}}}})
	body := Object{"model": "claude-opus-5-5", "messages": messages, "system": []any{Object{"type": "text", "text": "CLIENT_TOP_SYSTEM_ONLY"}}, "tools": []any{
		Object{"name": "Read", "description": "exact client Read description", "input_schema": Object{"type": "object", "properties": Object{"file_path": Object{"type": "string"}}, "required": []any{"file_path"}}},
		Object{"name": "mcp__client__lookup", "description": "original MCP tool", "input_schema": Object{"type": "object", "properties": Object{"query": Object{"type": "string"}}}},
	}, "thinking": Object{"type": "disabled"}, "output_config": Object{"effort": "high"}}
	raw, _ := json.Marshal(body)
	calls := make(chan []byte, 2)
	url, cache := newThinkingOutputFixture(t, func(w http.ResponseWriter, r *http.Request) {
		if !strings.HasSuffix(r.URL.Path, "/messages/count_tokens") {
			t.Errorf("generation attempted %s", r.URL.Path)
		}
		wire, _ := io.ReadAll(r.Body)
		calls <- wire
		w.Header().Set("Content-Type", "application/json")
		fmt.Fprint(w, `{"input_tokens":98765}`)
	})
	res, err := (&http.Client{Timeout: 25 * time.Second}).Post(url+"/v1/messages/count_tokens", "application/json", bytes.NewReader(raw))
	if err != nil {
		t.Fatal(err)
	}
	out, _ := io.ReadAll(res.Body)
	res.Body.Close()
	if res.StatusCode != 200 {
		t.Fatalf("%d %s", res.StatusCode, out)
	}
	if len(calls) != 1 {
		t.Fatalf("count calls=%d", len(calls))
	}
	if !bytes.Equal(<-calls, raw) {
		t.Fatal("long standard count input changed: CC context/tool namespace must not enter count")
	}
	cache.mu.Lock()
	entries := len(cache.entries)
	cache.mu.Unlock()
	if entries != 0 {
		t.Fatal("count committed history")
	}
}
