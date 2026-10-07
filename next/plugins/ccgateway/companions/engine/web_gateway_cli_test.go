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
	"strings"
	"sync"
	"testing"
	"time"
)

// Actual Worker HTTP -> CLI/Mod -> relay with synthetic server tools. No URL
// is fetched and no real provider execution or entitlement is claimed.
func TestRealCLIWebGatewayCompatibility(t *testing.T) {
	cli := os.Getenv("CCG_REAL_CLI")
	if cli == "" {
		t.Skip("set CCG_REAL_CLI for isolated web gateway validation")
	}
	version, err := checkVersion(cli)
	if err != nil {
		t.Fatal(err)
	}
	for _, kind := range []string{"web_search_20250305", "web_search_20260209", "web_search_20260318", "web_fetch_20250910", "web_fetch_20260209", "web_fetch_20260309", "web_fetch_20260318"} {
		t.Run(kind, func(t *testing.T) {
			root := t.TempDir()
			plugin, err := extractMod(root)
			if err != nil {
				t.Fatal(err)
			}
			var mu sync.Mutex
			var requests []Object
			blocks := webFixture(serverToolName(kind))
			citation := Object{"type": "web_search_result_location", "url": "https://example.invalid/fixture", "title": "Fixture", "encrypted_index": "opaque_index", "cited_text": "fixture"}
			if serverToolName(kind) == "web_fetch" {
				citation = Object{"type": "char_location", "document_index": 0, "document_title": "Fixture", "start_char_index": 0, "end_char_index": 3, "cited_text": "web"}
			}
			blocks[2]["citations"] = []any{citation}
			fake := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
				if !strings.HasSuffix(r.URL.Path, "/messages") {
					fmt.Fprint(w, `{"input_tokens":20}`)
					return
				}
				raw, _ := io.ReadAll(r.Body)
				body, err := decodeObject(raw)
				if err != nil {
					http.Error(w, "bad", 400)
					return
				}
				if bytes.Contains(raw, []byte("<ccgateway-request:")) {
					t.Error("marker leaked")
				}
				mu.Lock()
				requests = append(requests, body)
				mu.Unlock()
				tools, _ := body["tools"].([]any)
				if len(tools) != 1 || str(tools[0].(map[string]any), "type") != kind {
					t.Error("server catalog changed")
				}
				history, _ := json.Marshal(body["messages"])
				if bytes.Contains(history, []byte("srv_web")) {
					writeSurfaceFixture(w, str(body, "model"), []Object{{"type": "text", "text": "WEB_CONTINUED"}})
					return
				}
				writeSurfaceFixture(w, str(body, "model"), blocks)
			}))
			defer fake.Close()
			runner := &Runner{CLI: cli, Version: version, Plugin: plugin, Work: root, Env: messageProbeEnv(root, fake.URL)}
			newGateway := func() *Gateway {
				cache, err := newCache(filepath.Join(t.TempDir(), "cache"), 32<<20)
				if err != nil {
					t.Fatal(err)
				}
				return &Gateway{Runner: runner, Cache: cache, Timeout: 35 * time.Second, Slots: make(chan struct{}, 2)}
			}
			g := newGateway()
			body := webTestBody(kind)
			post := func(label string, g *Gateway) (Object, Object, string) {
				t.Helper()
				raw, _ := json.Marshal(body)
				req := httptest.NewRequest("POST", "/v1/messages", bytes.NewReader(raw))
				req.Header.Set("X-CCGateway-Session-ID", "web-fixture")
				res := httptest.NewRecorder()
				g.ServeHTTP(res, req)
				if res.Code != 200 {
					t.Fatalf("%s HTTP%d %s", label, res.Code, res.Body.String())
				}
				answer, err := decodeObject(res.Body.Bytes())
				if err != nil {
					t.Fatal(err)
				}
				mu.Lock()
				wire := requests[len(requests)-1]
				mu.Unlock()
				return answer, wire, res.Header().Get("X-CCGateway-History")
			}
			first, _, _ := post("new", g)
			if digest(first["content"]) != digest(blocks) {
				t.Fatal("server results or citations changed", first)
			}
			body["messages"] = append(body["messages"].([]any), Object{"role": "assistant", "content": first["content"]}, Object{"role": "user", "content": "WEB_NEXT"})
			second, wire, mode := post("continue", g)
			if mode != "prefix-hit" {
				t.Fatal("expected prefix-hit", mode)
			}
			assertWebHistory(t, wire, blocks)
			body["messages"] = append(body["messages"].([]any), Object{"role": "assistant", "content": second["content"]}, Object{"role": "user", "content": "WEB_LATER"})
			post("later", g)
			body["messages"] = append(body["messages"].([]any)[:2], Object{"role": "user", "content": "WEB_BRANCH"})
			_, wire, mode = post("rollback", g)
			if mode != "fork" {
				t.Fatal("expected fork", mode)
			}
			assertWebHistory(t, wire, blocks)
			_, wire, mode = post("new-account-import", newGateway())
			if mode != "rebuild" {
				t.Fatal("expected rebuild", mode)
			}
			assertWebHistory(t, wire, blocks)
			body["messages"] = []any{Object{"role": "user", "content": "WEB_STREAM"}}
			body["stream"] = true
			raw, _ := json.Marshal(body)
			res := httptest.NewRecorder()
			g.ServeHTTP(res, httptest.NewRequest("POST", "/v1/messages", bytes.NewReader(raw)))
			if res.Code != 200 || !strings.Contains(res.Body.String(), serverResultType(serverToolName(kind))) || !strings.Contains(res.Body.String(), `"citations_delta"`) || strings.Count(res.Body.String(), "event: message_stop") != 1 {
				t.Fatalf("SSE not preserved: %d %s", res.Code, res.Body.String())
			}
			t.Logf("CLI=%s calls=%d", version, len(requests))
		})
	}
}

func assertWebHistory(t *testing.T, wire Object, blocks []Object) {
	t.Helper()
	for _, v := range wire["messages"].([]any) {
		m := v.(map[string]any)
		if str(m, "role") != "assistant" {
			continue
		}
		content, _ := historyContent(m["content"])
		if len(content) != len(blocks) || str(content[0], "id") != "srv_web" {
			continue
		}
		for _, b := range content {
			delete(b, "cache_control")
		}
		if digest(content) != digest(blocks) {
			t.Fatal("opaque web history/citation changed", content)
		}
		return
	}
	t.Fatal("web history missing")
}

func TestRealCLIWebDelayedResultCompatibility(t *testing.T) {
	for _, kind := range []string{"web_search_20250305", "web_fetch_20250910"} {
		t.Run(kind, func(t *testing.T) {
			var mu sync.Mutex
			var requests []Object
			blocks := webFixture(serverToolName(kind))
			handler := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
				if !strings.HasSuffix(r.URL.Path, "/messages") {
					fmt.Fprint(w, `{"input_tokens":20}`)
					return
				}
				raw, _ := io.ReadAll(r.Body)
				body, _ := decodeObject(raw)
				mu.Lock()
				requests = append(requests, body)
				mu.Unlock()
				history, _ := json.Marshal(body["messages"])
				switch {
				case bytes.Contains(history, []byte("DELAYED_DONE")):
					writeSurfaceFixture(w, str(body, "model"), []Object{{"type": "text", "text": "CONTINUED_DONE"}})
				case bytes.Contains(history, []byte("CLIENT_RESULT")):
					writeSurfaceFixture(w, str(body, "model"), []Object{blocks[1], {"type": "text", "text": "DELAYED_DONE"}})
				default:
					writeSurfaceFixture(w, str(body, "model"), []Object{blocks[0], {"type": "tool_use", "id": "tool_client", "name": "mcp__ccgateway__weather", "input": Object{}}})
				}
			})
			endpoint, _ := newThinkingOutputFixture(t, handler)
			body := webTestBody(kind)
			body["tools"] = append(body["tools"].([]any), Object{"name": "weather", "input_schema": Object{"type": "object", "properties": Object{}}})
			post := func(label, endpoint string) Object {
				t.Helper()
				raw, _ := json.Marshal(body)
				res, err := http.Post(endpoint+"/v1/messages", "application/json", bytes.NewReader(raw))
				if err != nil {
					t.Fatal(err)
				}
				out, _ := io.ReadAll(res.Body)
				res.Body.Close()
				if res.StatusCode != 200 {
					t.Fatalf("%s: HTTP%d %s", label, res.StatusCode, out)
				}
				answer, err := decodeObject(out)
				if err != nil {
					t.Fatal(err)
				}
				return answer
			}
			first := post("mixed-handoff", endpoint)
			if str(first, "stop_reason") != "tool_use" {
				t.Fatal("client handoff changed")
			}
			content := first["content"].([]any)
			if len(content) != 2 || str(content[1].(map[string]any), "name") != "weather" {
				t.Fatal("wrong client handoff")
			}
			body["messages"] = append(body["messages"].([]any), Object{"role": "assistant", "content": content}, Object{"role": "user", "content": []any{Object{"type": "tool_result", "tool_use_id": "tool_client", "content": "CLIENT_RESULT"}}})
			second := post("delayed-server-result", endpoint)
			content = second["content"].([]any)
			if digest(content[0]) != digest(blocks[1]) {
				t.Fatal("delayed result changed")
			}
			body["messages"] = append(body["messages"].([]any), Object{"role": "assistant", "content": content}, Object{"role": "user", "content": "continue after delayed result"})
			post("continued", endpoint)
			imported, _ := newThinkingOutputFixture(t, handler)
			post("new-cache-import", imported)
			if len(requests) != 4 {
				t.Fatalf("unexpected internal cloud calls=%d", len(requests))
			}
		})
	}
}
