package engine

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"github.com/Sub2API-Devs/sup2api/next/plugins/ccgateway/companions/contracts/credits"
	"io"
	"net/http"
	"net/http/httptest"
	"os"
	"path/filepath"
	"strings"
	"sync/atomic"
	"testing"
	"time"

	"github.com/Sub2API-Devs/sup2api/next/plugins/ccgateway/companions/contracts/helperhistory"
	"github.com/Sub2API-Devs/sup2api/next/plugins/ccgateway/companions/contracts/resources"
)

func helperHistoryGatewayFixture(t *testing.T, handler http.HandlerFunc) (string, resources.Identity) {
	t.Helper()
	cli := os.Getenv("CCG_REAL_CLI")
	if cli == "" {
		t.Skip("set CCG_REAL_CLI")
	}
	version, err := checkVersion(cli)
	if err != nil {
		t.Fatal(err)
	}
	root := t.TempDir()
	plugin, err := extractMod(root)
	if err != nil {
		t.Fatal(err)
	}
	up := httptest.NewServer(handler)
	t.Cleanup(up.Close)
	cache, err := newCache(filepath.Join(root, "cache"), 32<<20)
	if err != nil {
		t.Fatal(err)
	}
	env := envWith(messageProbeEnv(root, up.URL), map[string]string{"ENABLE_TOOL_SEARCH": "true", "CCG_RESOURCE_ISSUER_ID": "helper-fixture", "CCG_RESOURCE_ISSUER_GENERATION": "fixture-epoch"})
	g := &Gateway{Runner: &Runner{CLI: cli, Version: version, Plugin: plugin, Work: root, Env: env}, Cache: cache, Timeout: 30 * time.Second, Slots: make(chan struct{}, 1), RequestLogDir: filepath.Join(root, "request-logs")}
	g.resources = &resourceBroker{g: g, authority: &authManager{}, identityPath: filepath.Join(root, "identity.json")}
	id, err := g.resources.identity(context.Background())
	if err != nil {
		t.Fatal(err)
	}
	server := httptest.NewServer(g)
	t.Cleanup(server.Close)
	return server.URL, id
}

func TestRealCLIHelperHistoryCarrier(t *testing.T)    { runHelperHistoryCarrier(t, false) }
func TestRealCLIHelperHistoryTaskBudget(t *testing.T) { runHelperHistoryCarrier(t, true) }
func runHelperHistoryCarrier(t *testing.T, budget bool) {
	runHelperHistoryScenario(t, budget, false)
}
func runHelperHistoryScenario(t *testing.T, budget, inline bool) {
	for _, stream := range []bool{false, true} {
		t.Run(map[bool]string{false: "json", true: "sse"}[stream], func(t *testing.T) {
			var calls atomic.Int32
			var capturedSystem atomic.Value
			handler := func(w http.ResponseWriter, r *http.Request) {
				raw, _ := io.ReadAll(r.Body)
				wire, err := decodeObject(raw)
				if err != nil {
					t.Error(err)
					return
				}
				calls.Add(1)
				if inline {
					verifyHelperInlineFixtureWire(t, wire)
				}
				if budget {
					config, _ := wire["output_config"].(Object)
					raw, _ := json.Marshal(config["task_budget"])
					if string(raw) != `{"remaining":11000,"total":20000,"type":"tokens"}` {
						t.Errorf("original advisory budget changed: %s", raw)
					}
				}
				if bytes.Contains(raw, []byte(`"attempt_id"`)) {
					t.Error("private carrier leaked")
				}
				messages, _ := json.Marshal(wire["messages"])
				if !bytes.Contains(messages, []byte("helper_source_call")) {
					emit := writeHelperHistoryFixture
					if os.Getenv("CCG_PROBE_INITIAL_THINKING") == "1" {
						emit = writeInternalCacheFixture
					}
					emit(w, str(wire, "model"), []Object{{"type": "thinking", "thinking": "PRIVATE_THINKING", "signature": "fixture-original-signature"}, {"type": "text", "text": "PRIVATE_PLANNING"}, {"type": "tool_use", "id": "helper_source_call", "name": "ToolSearch", "input": Object{"query": "select:mcp__ccgateway__weather"}}})
					return
				}
				// Every replay must retain the catalogue at the exact original
				// boundary, before the hidden assistant, with its current shape.
				rows := wire["messages"].([]any)
				found := false
				for i, row := range rows {
					m, _ := row.(Object)
					if str(m, "role") != "assistant" {
						continue
					}
					bs, _ := historyContent(m["content"])
					for _, block := range bs {
						if str(block, "id") != "helper_source_call" {
							continue
						}
						found = true
						if i == 0 {
							t.Error("hidden helper missing preceding system")
							continue
						}
						catalogueAt := i - 1
						if inline {
							catalogueAt--
							if catalogueAt < 1 {
								t.Error("interleaved catalogue missing")
								continue
							}
							user, _ := rows[catalogueAt-1].(Object)
							if str(user, "role") != "user" {
								t.Error("catalogue crossed original user boundary")
							}
						}
						previous, _ := rows[catalogueAt].(Object)
						if str(previous, "role") != "system" {
							t.Error("hidden system moved across boundary")
							continue
						}
						hash := digest(previous)
						if old := capturedSystem.Load(); old == nil {
							capturedSystem.Store(hash)
						} else if old.(string) != hash {
							t.Error("saved system representation changed on replay")
						}
					}
				}
				if !found {
					t.Error("hidden helper missing")
				}
				if !bytes.Contains(messages, []byte("PUBLIC_WEATHER_RESULT")) {
					writeInternalCacheFixture(w, str(wire, "model"), []Object{{"type": "tool_use", "id": "external_weather", "name": "mcp__ccgateway__weather", "input": Object{}}})
					return
				}
				writeInternalCacheFixture(w, str(wire, "model"), []Object{{"type": "text", "text": "PUBLIC_DONE"}})
			}
			endpoint, id := helperHistoryGatewayFixture(t, handler)
			body := Object{"model": "claude-opus-5-5", "thinking": Object{"type": "adaptive"}, "max_tokens": 128, "stream": stream, "messages": []any{Object{"role": "user", "content": "public weather fixture"}}, "tools": []any{Object{"name": "weather", "defer_loading": true, "input_schema": Object{"type": "object", "properties": Object{}}}}}
			if inline {
				body["messages"] = append(body["messages"].([]any), Object{"role": "system", "content": []any{Object{"type": "tool_addition", "tool": Object{"type": "tool_definition", "definition": Object{"name": "spare", "description": "precise fixture", "defer_loading": true, "input_schema": Object{"type": "object", "properties": Object{"n": Object{"const": json.Number("9007199254740993")}}}}}}}})
			}
			if budget {
				body["output_config"] = Object{"task_budget": Object{"type": "tokens", "total": 20000, "remaining": 11000}}
			}
			post := func(history []json.RawMessage) helperhistory.ResponseEnvelope {
				t.Helper()
				raw, _ := json.Marshal(body)
				hash, err := helperhistory.CanonicalDigest(raw)
				if err != nil {
					t.Fatal(err)
				}
				namespace, err := helperhistory.Namespace(str(body, "model"), "2.1.292", json.RawMessage(`{}`))
				if err != nil {
					t.Fatal(err)
				}
				env := helperhistory.RequestEnvelope{Version: 1, AttemptID: uuid(), RequestDigest: hash, Namespace: namespace, Identity: id, Request: raw, History: history}
				if inline {
					env.PayloadVersion = helperhistory.PayloadVersion2
				}
				data, _ := json.Marshal(env)
				req, _ := http.NewRequest("POST", endpoint+"/v1/messages", bytes.NewReader(data))
				req.Header.Set(helperhistory.Header, "1")
				req.Header.Set("X-CCGateway-Request-Policy", `{}`)
				if budget {
					req.Header.Set("anthropic-beta", taskBudgetBeta)
				}
				if inline {
					req.Header.Set("anthropic-beta", taskBudgetBeta+",inline-tools-2026-09-15")
				}
				res, err := http.DefaultClient.Do(req)
				if err != nil {
					t.Fatal(err)
				}
				data, _ = io.ReadAll(res.Body)
				res.Body.Close()
				if res.StatusCode != 200 {
					t.Fatalf("HTTP%d %s", res.StatusCode, data)
				}
				answer, err := helperhistory.DecodeResponse(data)
				if err != nil {
					t.Fatalf("decode %v %s", err, data)
				}
				if answer.StatusCode != 200 || answer.Failure != "" || bytes.Contains(answer.Body, []byte("PRIVATE_PLANNING")) {
					t.Fatalf("invalid public result status%d failure%s body%s", answer.StatusCode, answer.Failure, answer.Body)
				}
				return answer
			}
			first := post(nil)
			if !bytes.Contains(first.Delta, []byte("PRIVATE_PLANNING")) || !bytes.Contains(first.Delta, []byte("fixture-original-signature")) {
				t.Fatal("whole hidden planning lost")
			}
			decodePublic := func(answer helperhistory.ResponseEnvelope) Object {
				t.Helper()
				raw := answer.Body
				if stream {
					var events [][]byte
					for _, line := range strings.Split(string(raw), "\n") {
						if strings.HasPrefix(line, "data:") {
							events = append(events, []byte(strings.TrimSpace(line[5:])))
						}
					}
					var err error
					raw, err = credits.MessageFromEvents(events)
					if err != nil {
						t.Fatal(err)
					}
				}
				result, err := decodeObject(raw)
				if err != nil {
					t.Fatal(err)
				}
				return result
			}
			toolAnswer := decodePublic(first)
			resultHistory := append(append([]any{}, body["messages"].([]any)...), Object{"role": "assistant", "content": toolAnswer["content"]}, Object{"role": "user", "content": []Object{{"type": "tool_result", "tool_use_id": "external_weather", "content": "PUBLIC_WEATHER_RESULT"}}})
			if inline {
				resultHistory = append(resultHistory, Object{"role": "system", "content": []any{Object{"type": "tool_removal", "tool": Object{"type": "tool_reference", "name": "weather"}}}})
			}
			body["messages"] = resultHistory
			second := post([]json.RawMessage{first.Delta})
			final := decodePublic(second)
			body["messages"] = append(append([]any{}, resultHistory...), Object{"role": "assistant", "content": final["content"]}, Object{"role": "user", "content": "continue public fixture"})
			post([]json.RawMessage{first.Delta})
			endpoint, id = helperHistoryGatewayFixture(t, handler)
			post([]json.RawMessage{first.Delta})
			if inline {
				body["messages"] = append(append([]any{}, resultHistory...), Object{"role": "assistant", "content": final["content"]}, Object{"role": "user", "content": "readd fixture"}, Object{"role": "system", "content": []any{Object{"type": "tool_addition", "tool": Object{"type": "tool_definition", "definition": Object{"name": "weather", "description": "readded fixture", "defer_loading": true, "input_schema": Object{"type": "object", "properties": Object{"n": Object{"const": json.Number("9007199254740995")}}}}}}}})
				post([]json.RawMessage{first.Delta})
				body["messages"] = resultHistory[:len(resultHistory)-1]
				post([]json.RawMessage{first.Delta})
			}
			body["messages"] = resultHistory
			post([]json.RawMessage{first.Delta})
			wantCalls := int32(6)
			if inline {
				wantCalls = 8
			}
			if calls.Load() != wantCalls {
				t.Fatalf("unexpected generation calls %d", calls.Load())
			}

		})
	}
}

func TestRealCLIHelperHistoryInlineBudget(t *testing.T) { runHelperHistoryScenario(t, true, true) }

func writeHelperHistoryFixture(w http.ResponseWriter, model string, blocks []Object) {
	recorder := httptest.NewRecorder()
	writeInternalCacheFixture(recorder, model, blocks)
	w.Header().Set("Content-Type", "text/event-stream")
	emit := func(e Object) {
		raw, _ := json.Marshal(e)
		fmt.Fprintf(w, "event: %s\ndata: %s\n\n", str(e, "type"), raw)
	}
	for _, line := range strings.Split(recorder.Body.String(), "\n") {
		if !strings.HasPrefix(line, "data:") {
			continue
		}
		e, _ := decodeObject([]byte(strings.TrimSpace(line[5:])))
		b, _ := e["content_block"].(Object)
		if str(e, "type") != "content_block_start" || str(b, "type") != "thinking" {
			emit(e)
			continue
		}
		thinking, signature := b["thinking"], b["signature"]
		e["content_block"] = Object{"type": "thinking", "thinking": "", "signature": ""}
		emit(e)
		emit(Object{"type": "content_block_delta", "index": e["index"], "delta": Object{"type": "thinking_delta", "thinking": thinking}})
		emit(Object{"type": "content_block_delta", "index": e["index"], "delta": Object{"type": "signature_delta", "signature": signature}})
	}
}

// Opt-in durable red probe for the separate CLI initial-thinking transport gap.
// Standard delta/signature_delta coverage remains in TestRealCLIHelperHistoryCarrier.
func TestProbeHelperInitialThinking(t *testing.T) {
	if os.Getenv("CCG_PROBE_INITIAL_THINKING") != "1" {
		t.Skip("known initial thinking/signature CLI transport gap; set CCG_PROBE_INITIAL_THINKING=1 to reproduce")
	}
	TestRealCLIHelperHistoryCarrier(t)
}
