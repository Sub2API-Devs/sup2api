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

// Claude Code 2.1.292 with the server classifier (auto mode) sends its first
// request with safeguards, the dangerous-tool-use beta and the
// DeferredToolPlaceholder that keeps deferred loading on (2026-10-10, seen
// against the OVH gateway). A 400 makes the CLI drop the classifier for the
// rest of the conversation, so every auto-mode tool use is then denied: the
// combination must be served, with the client's context sent unchanged on
// every upstream round and the verdict of the answer relayed.
func TestRealCLISafeguardsWithDeferredLoading(t *testing.T) {
	cli := os.Getenv("CCG_REAL_CLI")
	if cli == "" {
		t.Skip("set CCG_REAL_CLI for isolated safeguards compatibility")
	}
	version, err := checkVersion(cli)
	if err != nil {
		t.Fatal(err)
	}
	var tools []any
	for _, name := range []string{"Glob", "Grep", "Read"} {
		variants := verifiedNativeToolCatalogues[version][name]
		if len(variants) == 0 {
			t.Fatalf("no verified %s catalogue for CLI %s", name, version)
		}
		tools = append(tools, Object{"name": variants[0].Name, "description": variants[0].Description, "input_schema": variants[0].Schema})
	}
	// The agent teams Agent (CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS on the client).
	var teamsAgent Object
	for _, variant := range verifiedNativeToolCatalogues[version]["Agent"] {
		if properties, _ := variant.Schema["properties"].(map[string]any); properties["team_name"] != nil {
			teamsAgent = Object{"name": variant.Name, "description": variant.Description, "input_schema": variant.Schema}
		}
	}
	if teamsAgent == nil {
		t.Fatalf("no verified agent teams Agent for CLI %s", version)
	}
	tools = append(tools, Object{"name": "DeferredToolPlaceholder", "description": "Reserved placeholder that keeps deferred tool loading active; never call this tool.", "input_schema": Object{"type": "object", "properties": Object{}}, "defer_loading": true})
	root := t.TempDir()
	plugin, err := extractMod(root)
	if err != nil {
		t.Fatal(err)
	}
	context, err := decodeObject([]byte(`{"safeguards":[{"type":"dangerous_tool_use","classifier_context":{"v":1,"permission_mode":"auto","platform":"win32","live_cwd":"D:/synthetic-client-project","fixture_only":true}}]}`))
	if err != nil {
		t.Fatal(err)
	}
	verdict := []any{Object{"tool_use_id": "toolu_deferred_fixture", "decision": "allow", "synthetic_fixture": true}}
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
		mu.Lock()
		captured = append(captured, body)
		mu.Unlock()
		if _, ok := body["safeguards"]; ok && digest(body["safeguards"]) != digest(context["safeguards"]) {
			t.Error("opaque client safeguards changed")
		}
		content := []Object{{"type": "tool_use", "id": "toolu_deferred_fixture", "name": "Read", "input": Object{"file_path": "D:/synthetic-client-project/fixture.txt"}, "caller": Object{"type": "direct"}}}
		history, _ := json.Marshal(body["messages"])
		if bytes.Contains(history, []byte("SEARCH_FIRST")) && !bytes.Contains(history, []byte("toolu_search_fixture")) {
			// An internal ToolSearch round, never shown to the client.
			content = []Object{{"type": "tool_use", "id": "toolu_search_fixture", "name": "ToolSearch", "input": Object{"query": "select:mcp__fixture__lookup"}}}
		}
		if bytes.Contains(history, []byte("CLIENT_SAFE_RESULT")) {
			content = []Object{{"type": "text", "text": "SAFE_RESULT_USED"}}
			if bytes.Contains(history, []byte("HANDBACK")) {
				// The subagent ends with its report through SubagentHandback,
				// offered upstream under the inner CLI's name for it.
				for _, item := range body["tools"].([]any) {
					if name := str(item.(map[string]any), "name"); strings.HasSuffix(name, "SubagentHandback") {
						content = []Object{{"type": "tool_use", "id": "toolu_handback_fixture", "name": name, "input": Object{"message": "SAFE_RESULT_USED"}}}
					}
				}
			}
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
	for _, c := range []struct {
		stream bool
		prompt string
	}{{true, "READ_SYNTHETIC_FILE"}, {false, "READ_SYNTHETIC_FILE"}, {true, "SEARCH_FIRST"}, {false, "SEARCH_FIRST"}, {true, "HANDBACK"}, {false, "HANDBACK"}, {true, "TEAMS"}, {false, "TEAMS"}} {
		stream := c.stream
		t.Run(fmt.Sprintf("stream=%t/%s", stream, c.prompt), func(t *testing.T) {
			cache, err := newCache(filepath.Join(t.TempDir(), "cache"), 32<<20)
			if err != nil {
				t.Fatal(err)
			}
			g := &Gateway{Runner: runner, Cache: cache, Timeout: 35 * time.Second, Slots: make(chan struct{}, 2)}
			body := Object{"model": "claude-sonnet-4-6", "max_tokens": 1024, "stream": stream, "thinking": Object{"type": "adaptive"}, "tools": tools, "safeguards": context["safeguards"],
				"context_management": Object{"edits": []any{Object{"type": "clear_thinking_20251015", "keep": "all"}}},
				"messages":           []any{Object{"role": "user", "content": c.prompt}}}
			if c.prompt == "SEARCH_FIRST" {
				// A deferred MCP tool, as CC defers them: loaded by ToolSearch first.
				body["tools"] = append(append([]any{}, tools...), Object{"name": "mcp__fixture__lookup", "description": "Look up a fixture record.", "input_schema": Object{"type": "object", "properties": Object{"key": Object{"type": "string"}}, "required": []any{"key"}}, "defer_loading": true})
			}
			if c.prompt == "TEAMS" {
				body["tools"] = append([]any{teamsAgent}, tools...)
			}
			if c.prompt == "HANDBACK" {
				// A subagent request: CC 2.1.292 adds SubagentHandback and
				// sends the safeguards of the conversation too.
				var handbackSchema Object
				_ = json.Unmarshal([]byte(subagentHandbackSchema), &handbackSchema)
				body["tools"] = append(append([]any{}, tools[:3]...), Object{"name": "SubagentHandback", "description": "Deliver your final report to the agent that spawned you (your caller).", "input_schema": handbackSchema})
			}
			post := func() string {
				raw, _ := json.Marshal(body)
				req := httptest.NewRequest("POST", "/v1/messages", bytes.NewReader(raw))
				req.Header.Set("anthropic-beta", "context-management-2025-06-27,dangerous-tool-use-2026-09-03")
				setTestSession(t, req, fmt.Sprintf("safeguards-deferred-%t-%s", stream, c.prompt))
				if c.prompt == "HANDBACK" {
					req.Header.Set("X-Claude-Code-Agent-Id", "a0123456789abcdef")
				}
				res := httptest.NewRecorder()
				g.ServeHTTP(res, req)
				if res.Code != 200 {
					t.Fatalf("HTTP%d %s", res.Code, res.Body.String())
				}
				return res.Body.String()
			}
			mu.Lock()
			before := len(captured)
			mu.Unlock()
			first := post()
			if !strings.Contains(first, "toolu_deferred_fixture") || !strings.Contains(first, "synthetic_fixture") {
				t.Fatalf("tool use or verdict lost: %s", first)
			}
			mu.Lock()
			rounds := captured[before:]
			mu.Unlock()
			main := 0
			for _, wire := range rounds {
				if _, ok := wire["safeguards"]; ok {
					main++
				}
			}
			if main == 0 {
				t.Fatal("client safeguards not sent upstream")
			}
			if c.prompt == "SEARCH_FIRST" {
				if main < 2 || strings.Contains(first, "toolu_search_fixture") || strings.Contains(first, "ToolSearch") {
					t.Fatalf("internal search round: %d rounds with safeguards; %s", main, first)
				}
			}
			content := []any{Object{"type": "tool_use", "id": "toolu_deferred_fixture", "name": "Read", "input": Object{"file_path": "D:/synthetic-client-project/fixture.txt"}}}
			body["messages"] = append(body["messages"].([]any), Object{"role": "assistant", "content": content}, Object{"role": "user", "content": []any{Object{"type": "tool_result", "tool_use_id": "toolu_deferred_fixture", "content": "CLIENT_SAFE_RESULT"}}})
			next := post()
			if !strings.Contains(next, "SAFE_RESULT_USED") {
				t.Fatalf("continuation: %s", next)
			}
			if c.prompt == "HANDBACK" && (!strings.Contains(next, `"name":"SubagentHandback"`) || !strings.Contains(next, "toolu_handback_fixture") || strings.Contains(next, "mcp__")) {
				t.Fatalf("handback identity: %s", next)
			}
		})
	}
}
