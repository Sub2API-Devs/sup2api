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

// Synthetic opaque context/verdict transport, not a classifier correctness or
// real-provider authorization test. No client tool executes in the container.
func TestRealCLISafeguardsGatewayCompatibility(t *testing.T) {
	cli := os.Getenv("CCG_REAL_CLI")
	if cli == "" {
		t.Skip("set CCG_REAL_CLI for isolated safeguards compatibility")
	}
	version, err := checkVersion(cli)
	if err != nil {
		t.Fatal(err)
	}
	variants := verifiedNativeToolCatalogues[version]["Read"]
	if len(variants) == 0 {
		t.Fatalf("no verified Read catalogue for CLI %s", version)
	}
	native := variants[0]
	root := t.TempDir()
	plugin, err := extractMod(root)
	if err != nil {
		t.Fatal(err)
	}
	context, err := decodeObject([]byte(`{"safeguards":[{"type":"dangerous_tool_use","classifier_context":{"live_cwd":"D:/synthetic-client-project","platform":"win32","fixture_only":true,"future":{"sequence":9007199254740993}}}]}`))
	if err != nil {
		t.Fatal(err)
	}
	verdict := []any{Object{"tool_use_id": "toolu_safeguard_fixture", "decision": "deny", "synthetic_fixture": true, "unknown_detail": Object{"preserve": true}}}
	var mu sync.Mutex
	var captured []Object
	fake := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if !strings.HasSuffix(r.URL.Path, "/messages") {
			fmt.Fprint(w, `{"input_tokens":20}`)
			return
		}
		raw, _ := io.ReadAll(r.Body)
		body, err := decodeObject(raw)
		if err != nil {
			t.Error(err)
			return
		}
		if digest(body["safeguards"]) != digest(context["safeguards"]) {
			t.Error("opaque client safeguards changed")
		}
		if bytes.Contains(raw, []byte("<ccgateway-request:")) {
			t.Error("attribution marker leaked")
		}
		if !strings.Contains(r.Header.Get("anthropic-beta"), "dangerous-tool-use-2026-09-03") {
			t.Error("safeguards beta missing")
		}
		tools, _ := body["tools"].([]any)
		if len(tools) != 1 || str(tools[0].(map[string]any), "name") != "Read" || digest(tools[0].(map[string]any)["input_schema"]) != digest(native.Schema) {
			t.Error("safeguards tool identity/schema changed")
		}
		mu.Lock()
		captured = append(captured, body)
		mu.Unlock()
		content := []Object{{"type": "tool_use", "id": "toolu_safeguard_fixture", "name": "Read", "input": Object{"file_path": "D:/synthetic-client-project/fixture.txt"}, "caller": Object{"type": "direct"}}}
		history, _ := json.Marshal(body["messages"])
		if bytes.Contains(history, []byte("CLIENT_SAFE_RESULT")) {
			content = []Object{{"type": "text", "text": "SAFE_RESULT_USED"}}
		}
		recorder := httptest.NewRecorder()
		writeSurfaceFixture(recorder, str(body, "model"), content)
		w.Header().Set("Content-Type", "text/event-stream")
		for _, line := range strings.Split(recorder.Body.String(), "\n") {
			if strings.HasPrefix(line, "data: ") {
				event, _ := decodeObject([]byte(strings.TrimPrefix(line, "data: ")))
				if str(event, "type") == "message_delta" {
					event["safeguard_results"] = verdict
				}
				data, _ := json.Marshal(event)
				line = "data: " + string(data)
			}
			fmt.Fprintln(w, line)
		}
	}))
	defer fake.Close()
	base := []string{}
	for _, key := range []string{"PATH", "SystemRoot", "WINDIR", "COMSPEC", "TEMP", "TMP", "PATHEXT", "APPDATA", "LOCALAPPDATA"} {
		if value := os.Getenv(key); value != "" {
			base = append(base, key+"="+value)
		}
	}
	env := envWith(base, map[string]string{"HOME": root, "USERPROFILE": root, "CLAUDE_CONFIG_DIR": filepath.Join(root, "config"), "ANTHROPIC_API_KEY": "dummy-safeguards-fixture", "ANTHROPIC_BASE_URL": fake.URL, "CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC": "1"})
	runner := &Runner{CLI: cli, Version: version, Plugin: plugin, Work: root, Env: env}
	for _, stream := range []bool{false, true} {
		t.Run(fmt.Sprintf("stream=%t", stream), func(t *testing.T) {
			cache, err := newCache(filepath.Join(t.TempDir(), "cache"), 32<<20)
			if err != nil {
				t.Fatal(err)
			}
			g := &Gateway{Runner: runner, Cache: cache, Timeout: 35 * time.Second, Slots: make(chan struct{}, 2)}
			body := Object{"model": "claude-sonnet-4-6", "max_tokens": 128, "stream": stream, "thinking": Object{"type": "disabled"}, "tools": []any{native}, "safeguards": context["safeguards"], "messages": []any{Object{"role": "user", "content": "READ_SYNTHETIC_FILE"}}}
			post := func() (*httptest.ResponseRecorder, Object) {
				raw, _ := json.Marshal(body)
				req := httptest.NewRequest("POST", "/v1/messages", bytes.NewReader(raw))
				req.Header.Set("anthropic-beta", "dangerous-tool-use-2026-09-03")
				setTestSession(t, req, "safeguards-fixture")
				res := httptest.NewRecorder()
				g.ServeHTTP(res, req)
				if res.Code != 200 {
					t.Fatalf("HTTP%d %s", res.Code, res.Body.String())
				}
				answer := Object{}
				if !stream {
					answer, err = decodeObject(res.Body.Bytes())
					if err != nil {
						t.Fatal(err)
					}
					if digest(answer["safeguard_results"]) != digest(verdict) {
						t.Fatal("JSON verdict changed")
					}
				} else {
					found := false
					for _, line := range strings.Split(res.Body.String(), "\n") {
						if !strings.HasPrefix(line, "data: ") {
							continue
						}
						event, e := decodeObject([]byte(strings.TrimPrefix(line, "data: ")))
						if e != nil {
							continue
						}
						if value, ok := event["safeguard_results"]; ok {
							found = true
							if digest(value) != digest(verdict) {
								t.Fatal("SSE verdict changed")
							}
						}
					}
					if !found || !strings.Contains(res.Body.String(), "event: message_stop") {
						t.Fatalf("missing SSE verdict/stop %s", res.Body.String())
					}
				}
				return res, answer
			}
			first, answer := post()
			var content any
			if stream {
				if !strings.Contains(first.Body.String(), `"id":"toolu_safeguard_fixture"`) || !strings.Contains(first.Body.String(), `"name":"Read"`) {
					t.Fatal("SSE tool ID/name changed")
				}
				content = []any{Object{"type": "tool_use", "id": "toolu_safeguard_fixture", "name": "Read", "input": Object{"file_path": "D:/synthetic-client-project/fixture.txt"}, "caller": Object{"type": "direct"}}}
			} else {
				content = answer["content"]
				if str(content.([]any)[0].(map[string]any), "id") != "toolu_safeguard_fixture" {
					t.Fatal("JSON tool ID changed")
				}
			}
			body["messages"] = append(body["messages"].([]any), Object{"role": "assistant", "content": content}, Object{"role": "user", "content": []any{Object{"type": "tool_result", "tool_use_id": "toolu_safeguard_fixture", "content": "CLIENT_SAFE_RESULT"}}})
			next, _ := post()
			if next.Header().Get("X-CCGateway-History") != "prefix-hit" {
				t.Fatalf("safeguards continuation=%s", next.Header().Get("X-CCGateway-History"))
			}
			mu.Lock()
			wire := captured[len(captured)-1]
			mu.Unlock()
			history, _ := json.Marshal(wire["messages"])
			if !bytes.Contains(history, []byte(`"tool_use_id":"toolu_safeguard_fixture"`)) || !bytes.Contains(history, []byte("CLIENT_SAFE_RESULT")) {
				t.Fatal("tool history IDs/results changed")
			}
		})
	}
	t.Logf("CLI=%s isolated safeguard requests=%d; synthetic verdict transport only", version, len(captured))
}
