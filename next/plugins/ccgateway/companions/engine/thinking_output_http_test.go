package engine

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"net/http/httptest"
	"os"
	"path/filepath"
	"reflect"
	"strings"
	"testing"
	"time"
)

func newThinkingOutputFixture(t *testing.T, handler http.HandlerFunc, tweaks ...func([]string) []string) (string, *HistoryCache) {
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
	base := []string{}
	for _, key := range []string{"PATH", "SystemRoot", "WINDIR", "COMSPEC", "TEMP", "TMP", "PATHEXT", "APPDATA", "LOCALAPPDATA"} {
		if v := os.Getenv(key); v != "" {
			base = append(base, key+"="+v)
		}
	}
	env := envWith(base, map[string]string{"HOME": root, "USERPROFILE": root, "CLAUDE_CONFIG_DIR": filepath.Join(root, "config"), "ANTHROPIC_API_KEY": "dummy-generation-fixture", "ANTHROPIC_BASE_URL": up.URL, "CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC": "1", "DISABLE_AUTOUPDATER": "1"})
	for _, tweak := range tweaks {
		env = tweak(env)
	}
	cache, err := newCache(filepath.Join(root, "cache"), 8<<20)
	if err != nil {
		t.Fatal(err)
	}
	gw := httptest.NewServer(fixtureClientSession(&Gateway{Runner: &Runner{CLI: cli, Version: version, Plugin: plugin, Work: root, Env: env}, Cache: cache, Timeout: 20 * time.Second, Slots: make(chan struct{}, 1), RequestLogDir: filepath.Join(root, "request-logs")}, "thinking-output-fixture"))
	t.Cleanup(gw.Close)
	return gw.URL, cache
}

func generationFixtureEvents(w http.ResponseWriter, model, stop, text string, signed bool) {
	w.Header().Set("Content-Type", "text/event-stream")
	send := func(event Object) {
		raw, _ := json.Marshal(event)
		fmt.Fprintf(w, "event: %s\ndata: %s\n\n", str(event, "type"), raw)
	}
	send(Object{"type": "message_start", "message": Object{"id": "msg_" + uuid(), "type": "message", "role": "assistant", "model": model, "content": []any{}, "stop_reason": nil, "usage": Object{"input_tokens": 2, "output_tokens": 0}}})
	index := 0
	if signed {
		send(Object{"type": "content_block_start", "index": index, "content_block": Object{"type": "thinking", "thinking": "", "signature": ""}})
		send(Object{"type": "content_block_delta", "index": index, "delta": Object{"type": "signature_delta", "signature": "fixture-signature-exact"}})
		send(Object{"type": "content_block_stop", "index": index})
		index++
	}
	send(Object{"type": "content_block_start", "index": index, "content_block": Object{"type": "text", "text": ""}})
	send(Object{"type": "content_block_delta", "index": index, "delta": Object{"type": "text_delta", "text": text}})
	send(Object{"type": "content_block_stop", "index": index})
	send(Object{"type": "message_delta", "delta": Object{"stop_reason": stop, "stop_sequence": nil}, "usage": Object{"output_tokens": 3}})
	send(Object{"type": "message_stop"})
}

func TestRealCLIAPIOutputIsConstrainedWithoutSyntheticTools(t *testing.T) {
	for _, stop := range []string{"end_turn", "refusal", "max_tokens"} {
		for _, stream := range []bool{false, true} {
			t.Run(fmt.Sprintf("%s/stream=%t", stop, stream), func(t *testing.T) {
				calls := make(chan Object, 8)
				url, cache := newThinkingOutputFixture(t, func(w http.ResponseWriter, r *http.Request) {
					if !strings.HasSuffix(r.URL.Path, "/messages") {
						fmt.Fprint(w, `{"input_tokens":1}`)
						return
					}
					raw, _ := io.ReadAll(r.Body)
					body, _ := decodeObject(raw)
					calls <- body
					text := `{"ok":true}`
					if stop == "refusal" {
						text = "fixture refusal"
					}
					if stop == "max_tokens" {
						text = `{"ok":`
					}
					generationFixtureEvents(w, str(body, "model"), stop, text, false)
				})
				format := Object{"type": "json_schema", "schema": Object{"type": "object", "properties": Object{"ok": Object{"type": "boolean"}}, "required": []any{"ok"}, "additionalProperties": false}}
				body := Object{"model": "claude-opus-5-5", "max_tokens": 128, "stream": stream, "output_config": Object{"format": format}, "messages": []any{Object{"role": "user", "content": "API format fixture"}}}
				raw, _ := json.Marshal(body)
				client := &http.Client{Timeout: 25 * time.Second}
				res, err := client.Post(url+"/v1/messages", "application/json", bytes.NewReader(raw))
				if err != nil {
					t.Fatal(err)
				}
				out, _ := io.ReadAll(res.Body)
				res.Body.Close()
				if res.StatusCode != 200 || bytes.Contains(out, []byte(`"type":"error"`)) || !bytes.Contains(out, []byte(`"stop_reason":"`+stop+`"`)) {
					t.Fatalf("API terminal response changed: %d %s", res.StatusCode, out)
				}
				if len(calls) != 1 {
					t.Fatalf("implicit model retries: %d", len(calls))
				}
				wire := <-calls
				output, _ := wire["output_config"].(map[string]any)
				if !reflect.DeepEqual(output["format"], format) {
					t.Fatal("actual API format missing", output)
				}
				tools, _ := json.Marshal(wire["tools"])
				if bytes.Contains(tools, []byte("StructuredOutput")) {
					t.Fatal("synthetic formatting tool injected")
				}
				cache.mu.Lock()
				entries := len(cache.entries)
				native := false
				for _, snapshot := range cache.entries {
					native = native || !snapshot.ResponseOnly
				}
				cache.mu.Unlock()
				if entries != 1 {
					t.Fatal("completed API response not persisted", entries)
				}
				if stop == "end_turn" && !native {
					t.Fatal("normal JSON output did not retain native checkpoint")
				}
				restarted, err := newCache(cache.dir, cache.limit)
				if err != nil || len(restarted.entries) != 1 {
					t.Fatal("terminal checkpoint lost on reload", err)
				}
				if !stream {
					answer, _ := decodeObject(out)
					body["messages"] = append(body["messages"].([]any), Object{"role": "assistant", "content": answer["content"]}, Object{"role": "user", "content": "next API format turn"})
					raw, _ = json.Marshal(body)
					res, err = client.Post(url+"/v1/messages", "application/json", bytes.NewReader(raw))
					if err != nil {
						t.Fatal(err)
					}
					out, _ = io.ReadAll(res.Body)
					res.Body.Close()
					if res.StatusCode != 200 {
						t.Fatalf("API format continuation: %d %s", res.StatusCode, out)
					}
					if len(calls) != 1 {
						t.Fatal("continuation implicitly retried")
					}
					next := <-calls
					messages, _ := next["messages"].([]any)
					assistantCount := 0
					for _, value := range messages {
						message, _ := value.(Object)
						if str(message, "role") == "assistant" {
							assistantCount++
						}
					}
					if assistantCount != 1 {
						t.Fatal("response-only/native continuation replayed prior output more than once", assistantCount)
					}
				}
			})
		}
	}
}

func TestRealCLIThinkingPlanPreservesExplicitAndAbsent(t *testing.T) {
	for _, thinking := range []Object{nil, {"type": "disabled"}, {"type": "enabled", "budget_tokens": json.Number("1024")}, {"type": "enabled", "budget_tokens": json.Number("4096")}, {"type": "adaptive", "display": "updates"}, {"type": "between_tools"}, {"type": "adaptive", "block_binding": Object{"prefix_mismatch_behavior": "error"}}} {
		name := str(thinking, "type") + str(thinking, "display")
		if thinking["block_binding"] != nil {
			name += "binding"
		}
		t.Run(name, func(t *testing.T) {
			calls := make(chan Object, 8)
			url, _ := newThinkingOutputFixture(t, func(w http.ResponseWriter, r *http.Request) {
				if !strings.HasSuffix(r.URL.Path, "/messages") {
					fmt.Fprint(w, `{"input_tokens":1}`)
					return
				}
				raw, _ := io.ReadAll(r.Body)
				body, _ := decodeObject(raw)
				calls <- body
				generationFixtureEvents(w, str(body, "model"), "end_turn", "THINKING_OK", true)
			})
			body := Object{"model": "claude-sonnet-5-5", "max_tokens": 2048, "messages": []any{Object{"role": "user", "content": "thinking fixture"}}}
			if str(thinking, "type") == "enabled" {
				body["model"] = "claude-sonnet-4-6"
			}
			if thinking != nil {
				body["thinking"] = thinking
			}
			raw, _ := json.Marshal(body)
			req, _ := http.NewRequest("POST", url+"/v1/messages", bytes.NewReader(raw))
			req.Header.Set("Content-Type", "application/json")
			req.Header.Set("anthropic-beta", "thinking-display-updates-2026-08-18,thinking-binding-controls-2026-08-01")
			if thinking["budget_tokens"] == json.Number("4096") {
				req.Header.Add("anthropic-beta", "interleaved-thinking-2025-05-14")
			}
			res, err := (&http.Client{Timeout: 25 * time.Second}).Do(req)
			if err != nil {
				t.Fatal(err)
			}
			out, _ := io.ReadAll(res.Body)
			res.Body.Close()
			if res.StatusCode != 200 {
				t.Fatalf("%d %s", res.StatusCode, out)
			}
			if !bytes.Contains(out, []byte("fixture-signature-exact")) {
				t.Fatal("signature lost")
			}
			wire := <-calls
			if !reflect.DeepEqual(wire["thinking"], any(thinking)) && !(thinking == nil && wire["thinking"] == nil) {
				t.Fatal("thinking changed", wire["thinking"], thinking)
			}
			if _, ok := wire["output_config"]; ok {
				t.Fatal("CLI default effort leaked into API request")
			}
			answer, _ := decodeObject(out)
			body["messages"] = append(body["messages"].([]any), Object{"role": "assistant", "content": answer["content"]}, Object{"role": "user", "content": "next signed turn"})
			raw, _ = json.Marshal(body)
			next, _ := http.NewRequest("POST", url+"/v1/messages", bytes.NewReader(raw))
			next.Header = req.Header.Clone()
			res, err = (&http.Client{Timeout: 25 * time.Second}).Do(next)
			if err != nil {
				t.Fatal(err)
			}
			out, _ = io.ReadAll(res.Body)
			res.Body.Close()
			if res.StatusCode != 200 {
				t.Fatalf("signed continuation %d %s", res.StatusCode, out)
			}
			continued := <-calls
			history, _ := json.Marshal(continued["messages"])
			if !bytes.Contains(history, []byte("fixture-signature-exact")) {
				t.Fatalf("signed history was silently dropped: %s", history)
			}
		})
	}
}

func TestRealCLIAPIFormatPreservesUpstreamSchemaMismatch(t *testing.T) {
	for _, stream := range []bool{false, true} {
		t.Run(fmt.Sprint(stream), func(t *testing.T) {
			url, _ := newThinkingOutputFixture(t, func(w http.ResponseWriter, r *http.Request) {
				if !strings.HasSuffix(r.URL.Path, "/messages") {
					fmt.Fprint(w, `{"input_tokens":1}`)
					return
				}
				generationFixtureEvents(w, "claude-opus-5-5", "end_turn", `{"category":"Greeting"}`, false)
			})
			body := Object{"model": "claude-opus-5-5", "max_tokens": 128, "stream": stream, "messages": []any{Object{"role": "user", "content": "schema capitalization fixture"}}, "output_config": Object{"format": Object{"type": "json_schema", "schema": Object{"type": "object", "properties": Object{"category": Object{"type": "string", "enum": []any{"greeting"}}}, "required": []any{"category"}, "additionalProperties": false}}}}
			raw, _ := json.Marshal(body)
			res, err := (&http.Client{Timeout: 25 * time.Second}).Post(url+"/v1/messages", "application/json", bytes.NewReader(raw))
			if err != nil {
				t.Fatal(err)
			}
			out, _ := io.ReadAll(res.Body)
			res.Body.Close()
			if res.StatusCode != 200 || bytes.Contains(out, []byte(`"type":"error"`)) || !bytes.Contains(out, []byte("Greeting")) {
				t.Fatalf("upstream schema capitalization became gateway error: %d %s", res.StatusCode, out)
			}
		})
	}
}
