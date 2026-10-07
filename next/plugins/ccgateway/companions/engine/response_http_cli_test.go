package engine

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"net/http/httptest"
	"os"
	"path/filepath"
	"strings"
	"testing"
	"time"
)

func responseHTTPFixtureExtensions() Object {
	return Object{"safeguard_results": []any{}, "input_transformations": []any{}, "stop_details": Object{"type": "fixture"}, "context_management": Object{"applied_edits": []any{}}, "container": Object{"id": "container_fixture"}, "diagnostics": Object{"fixture": true}}
}

func writeResponseHTTPFixture(w http.ResponseWriter, model, location string, structured bool) {
	w.Header().Set("Content-Type", "text/event-stream")
	send := func(event Object) {
		raw, _ := json.Marshal(event)
		fmt.Fprintf(w, "event: %s\ndata: %s\n\n", str(event, "type"), raw)
	}
	start := Object{"id": "msg_http_envelope", "type": "message", "role": "assistant", "model": model, "content": []any{}, "stop_reason": nil, "stop_sequence": nil, "usage": Object{"input_tokens": 1, "output_tokens": 0}}
	if location == "start" {
		for key, value := range responseHTTPFixtureExtensions() {
			start[key] = value
		}
	}
	send(Object{"type": "message_start", "message": start})
	stopReason := "end_turn"
	if structured {
		stopReason = "tool_use"
		send(Object{"type": "content_block_start", "index": 0, "content_block": Object{"type": "tool_use", "id": "toolu_format_fixture", "name": "StructuredOutput", "input": Object{}}})
		send(Object{"type": "content_block_delta", "index": 0, "delta": Object{"type": "input_json_delta", "partial_json": `{"ok":true}`}})
	} else {
		send(Object{"type": "content_block_start", "index": 0, "content_block": Object{"type": "text", "text": ""}})
		send(Object{"type": "content_block_delta", "index": 0, "delta": Object{"type": "text_delta", "text": "HTTP_ENVELOPE_OK"}})
	}
	send(Object{"type": "content_block_stop", "index": 0})
	delta := Object{"type": "message_delta", "delta": Object{"stop_reason": stopReason, "stop_sequence": nil}, "usage": Object{"output_tokens": 3}}
	if location == "delta" {
		for key, value := range responseHTTPFixtureExtensions() {
			delta[key] = value
		}
	}
	send(delta)
	stop := Object{"type": "message_stop"}
	if location == "stop" {
		for key, value := range responseHTTPFixtureExtensions() {
			stop[key] = value
		}
	}
	send(stop)
}

func TestRealCLIHTTPResponseEnvelopeLocations(t *testing.T) {
	cli := os.Getenv("CCG_REAL_CLI")
	if cli == "" {
		t.Skip("set CCG_REAL_CLI for isolated CLI plus Worker HTTP test")
	}
	version, err := checkVersion(cli)
	if err != nil {
		t.Fatal(err)
	}
	for _, structured := range []bool{false, true} {
		for _, location := range []string{"start", "delta", "stop"} {
			for _, stream := range []bool{false, true} {
				t.Run(fmt.Sprintf("structured=%t/%s/stream=%t", structured, location, stream), func(t *testing.T) {
					root := t.TempDir()
					plugin, err := extractMod(root)
					if err != nil {
						t.Fatal(err)
					}
					upstream := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
						if !strings.HasSuffix(r.URL.Path, "/messages") {
							w.Header().Set("Content-Type", "application/json")
							fmt.Fprint(w, `{"input_tokens":1}`)
							return
						}
						body, _ := io.ReadAll(r.Body)
						message, err := decodeObject(body)
						if err != nil {
							http.Error(w, "invalid fixture body", 400)
							return
						}
						writeResponseHTTPFixture(w, str(message, "model"), location, structured)
					}))
					defer upstream.Close()
					base := []string{}
					for _, key := range []string{"PATH", "SystemRoot", "WINDIR", "COMSPEC", "TEMP", "TMP", "PATHEXT", "APPDATA", "LOCALAPPDATA"} {
						if value := os.Getenv(key); value != "" {
							base = append(base, key+"="+value)
						}
					}
					env := envWith(base, map[string]string{"HOME": root, "USERPROFILE": root, "CLAUDE_CONFIG_DIR": filepath.Join(root, "config"), "ANTHROPIC_API_KEY": "dummy-http-envelope", "ANTHROPIC_BASE_URL": upstream.URL, "CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC": "1", "DISABLE_AUTOUPDATER": "1"})
					cache, err := newCache(filepath.Join(root, "cache"), 8<<20)
					if err != nil {
						t.Fatal(err)
					}
					gateway := httptest.NewServer(&Gateway{Runner: &Runner{CLI: cli, Version: version, Plugin: plugin, Work: root, Env: env}, Cache: cache, Timeout: 25 * time.Second, Slots: make(chan struct{}, 1)})
					defer gateway.Close()
					body := Object{"model": "claude-opus-5-5", "max_tokens": 128, "stream": stream, "messages": []any{Object{"role": "user", "content": "response envelope fixture"}}}
					if structured {
						body["output_config"] = Object{"format": Object{"type": "json_schema", "schema": Object{"type": "object", "properties": Object{"ok": Object{"type": "boolean"}}, "required": []any{"ok"}, "additionalProperties": false}}}
					}
					raw, _ := json.Marshal(body)
					ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
					defer cancel()
					request, _ := http.NewRequestWithContext(ctx, "POST", gateway.URL+"/v1/messages", bytes.NewReader(raw))
					request.Header.Set("Content-Type", "application/json")
					response, err := http.DefaultClient.Do(request)
					if err != nil {
						t.Fatal(err)
					}
					defer response.Body.Close()
					out, _ := io.ReadAll(response.Body)
					if response.StatusCode != 200 {
						t.Fatalf("HTTP %d: %s", response.StatusCode, out)
					}
					if !stream {
						message, err := decodeObject(out)
						if err != nil {
							t.Fatal(err)
						}
						for _, field := range responseEnvelopeExtensions {
							if _, ok := message[field]; !ok {
								t.Errorf("JSON lost %s", field)
							}
						}
						return
					}
					var target Object
					stops := 0
					for _, line := range strings.Split(string(out), "\n") {
						if !strings.HasPrefix(line, "data: ") {
							continue
						}
						event, err := decodeObject([]byte(strings.TrimPrefix(line, "data: ")))
						if err != nil {
							t.Fatal(err)
						}
						if str(event, "type") == "error" {
							t.Fatalf("SSE error: %s", line)
						}
						if str(event, "type") == "message_stop" {
							stops++
						}
						switch {
						case location == "start" && str(event, "type") == "message_start":
							target, _ = event["message"].(map[string]any)
						case location == "delta" && str(event, "type") == "message_delta":
							if _, ok := event["safeguard_results"]; ok {
								target = event
							}
						case location == "stop" && str(event, "type") == "message_stop":
							target = event
						}
					}
					if stops != 1 {
						t.Errorf("got %d message_stop events", stops)
					}
					for _, field := range responseEnvelopeExtensions {
						if _, ok := target[field]; !ok {
							t.Errorf("SSE lost/moved %s from %s", field, location)
						}
					}
				})
			}
		}
	}
}
