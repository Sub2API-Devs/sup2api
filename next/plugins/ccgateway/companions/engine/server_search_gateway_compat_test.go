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

func TestRealCLIServerSearchGatewayCompatibility(t *testing.T) {
	cli := os.Getenv("CCG_REAL_CLI")
	if cli == "" {
		t.Skip("set CCG_REAL_CLI for isolated server search gateway test")
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
	var mu sync.Mutex
	var captured []Object
	fake := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if !strings.HasSuffix(r.URL.Path, "/messages") {
			fmt.Fprint(w, `{"input_tokens":20}`)
			return
		}
		raw, _ := io.ReadAll(r.Body)
		body, _ := decodeObject(raw)
		if bytes.Contains(raw, []byte("<ccgateway-request:")) {
			t.Error("attribution marker leaked")
		}
		mu.Lock()
		captured = append(captured, body)
		mu.Unlock()
		tools, _ := body["tools"].([]any)
		searchName := ""
		for _, v := range tools {
			tool := v.(map[string]any)
			if serverSearchName(str(tool, "type")) != "" {
				searchName = str(tool, "name")
				if tool["strict"] != true || digest(tool["allowed_callers"]) != digest([]any{"direct"}) {
					t.Error("server tool metadata lost")
				}
			}
			if str(tool, "name") == "ToolSearch" {
				t.Error("CC internal search must be disabled")
			}
			if str(tool, "name") == "mcp__ccgateway__weather" && tool["defer_loading"] != true {
				t.Error("defer_loading missing")
			}
		}
		if searchName == "" {
			t.Error("server search definition missing")
		}
		blocks := []Object{{"type": "text", "text": "SEARCH_CONTINUED"}}
		messages, _ := json.Marshal(body["messages"])
		if !bytes.Contains(messages, []byte("srvtoolu_api_search")) {
			blocks = []Object{{"type": "server_tool_use", "id": "srvtoolu_api_search", "name": searchName, "input": Object{"pattern": "weather"}}, {"type": "tool_search_tool_result", "tool_use_id": "srvtoolu_api_search", "content": Object{"type": "tool_search_tool_search_result", "tool_references": []any{Object{"type": "tool_reference", "tool_name": "mcp__ccgateway__weather"}}}}, {"type": "tool_use", "id": "toolu_weather", "name": "mcp__ccgateway__weather", "input": Object{"city": "Paris"}}}
		}
		if searchName == "tool_search_tool_bm25" && str(blocks[0], "type") == "server_tool_use" {
			blocks[0]["input"] = Object{"query": "weather"}
		}
		writeSurfaceFixture(w, str(body, "model"), blocks)
	}))
	defer fake.Close()
	base := []string{}
	for _, key := range []string{"PATH", "SystemRoot", "WINDIR", "COMSPEC", "TEMP", "TMP", "PATHEXT", "APPDATA", "LOCALAPPDATA"} {
		if value := os.Getenv(key); value != "" {
			base = append(base, key+"="+value)
		}
	}
	env := envWith(base, map[string]string{"HOME": root, "USERPROFILE": root, "CLAUDE_CONFIG_DIR": filepath.Join(root, "config"), "ANTHROPIC_API_KEY": "dummy-search-fixture", "ANTHROPIC_BASE_URL": fake.URL, "CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC": "1"})
	runner := &Runner{CLI: cli, Version: version, Plugin: plugin, Work: root, Env: env}
	newGateway := func() *Gateway {
		cache, err := newCache(filepath.Join(t.TempDir(), "cache"), 32<<20)
		if err != nil {
			t.Fatal(err)
		}
		return &Gateway{Runner: runner, Cache: cache, Timeout: 35 * time.Second, Slots: make(chan struct{}, 2)}
	}
	gateway := newGateway()
	body := Object{"model": "claude-sonnet-4-6", "max_tokens": 256, "thinking": Object{"type": "disabled"}, "messages": []any{Object{"role": "user", "content": "SEARCH_START"}}, "tools": []any{Object{"type": "tool_search_tool_regex_20251119", "name": "tool_search_tool_regex"}, Object{"name": "weather", "description": "weather lookup", "input_schema": Object{"type": "object", "properties": Object{"city": Object{"type": "string"}}}, "defer_loading": true}}}
	body["tools"].([]any)[0].(map[string]any)["strict"] = true
	body["tools"].([]any)[0].(map[string]any)["allowed_callers"] = []any{"direct"}
	post := func(label string, g *Gateway) (Object, string, Object) {
		t.Helper()
		raw, _ := json.Marshal(body)
		req := httptest.NewRequest("POST", "/v1/messages", bytes.NewReader(raw))
		req.Header.Set("X-CCGateway-Session-ID", "api-search-history")
		res := httptest.NewRecorder()
		g.ServeHTTP(res, req)
		if res.Code != 200 {
			t.Fatalf("%s HTTP%d %s", label, res.Code, res.Body.String())
		}
		result, err := decodeObject(res.Body.Bytes())
		if err != nil {
			t.Fatalf("%s: %v %s", label, err, res.Body.String())
		}
		mu.Lock()
		wire := captured[len(captured)-1]
		mu.Unlock()
		t.Logf("%s history=%s", label, res.Header().Get("X-CCGateway-History"))
		return result, res.Header().Get("X-CCGateway-History"), wire
	}
	first, _, _ := post("new", gateway)
	content := first["content"].([]any)
	if len(content) != 3 || content[2].(map[string]any)["name"] != "weather" {
		t.Fatalf("bad search handoff: %v", first)
	}
	refs := content[1].(map[string]any)["content"].(map[string]any)["tool_references"].([]any)
	if refs[0].(map[string]any)["tool_name"] != "weather" {
		t.Fatal("wire reference not restored")
	}
	body["messages"] = append(body["messages"].([]any), Object{"role": "assistant", "content": content}, Object{"role": "user", "content": []any{Object{"type": "tool_result", "tool_use_id": "toolu_weather", "content": "PARIS_17"}}})
	branch := append([]any(nil), body["messages"].([]any)...)
	second, mode, wire := post("tool-result", gateway)
	if mode != "prefix-hit" {
		t.Fatalf("want prefix-hit got %s", mode)
	}
	encoded, _ := json.Marshal(wire["messages"])
	if !bytes.Contains(encoded, []byte("PARIS_17")) || !bytes.Contains(encoded, []byte("mcp__ccgateway__weather")) {
		t.Fatal("search history or tool result missing")
	}
	body["messages"] = append(body["messages"].([]any), Object{"role": "assistant", "content": second["content"]}, Object{"role": "user", "content": "SEARCH_LATER"})
	post("continue", gateway)
	body["messages"] = append(branch, Object{"role": "assistant", "content": second["content"]}, Object{"role": "user", "content": "SEARCH_ALTERNATE"})
	_, mode, wire = post("rollback", gateway)
	if mode != "fork" {
		t.Fatalf("want fork got %s", mode)
	}
	encoded, _ = json.Marshal(wire["messages"])
	if bytes.Contains(encoded, []byte("SEARCH_LATER")) {
		t.Fatal("fork retained abandoned branch")
	}
	_, mode, _ = post("new-cache-import", newGateway())
	if mode != "rebuild" {
		t.Fatalf("want rebuild got %s", mode)
	}
	body["messages"] = []any{Object{"role": "user", "content": "BM25_STREAM"}}
	body["tools"].([]any)[0] = Object{"type": "tool_search_tool_bm25_20251119", "name": "tool_search_tool_bm25"}
	body["tools"].([]any)[0].(map[string]any)["strict"] = true
	body["tools"].([]any)[0].(map[string]any)["allowed_callers"] = []any{"direct"}
	body["stream"] = true
	raw, _ := json.Marshal(body)
	req := httptest.NewRequest("POST", "/v1/messages", bytes.NewReader(raw))
	res := httptest.NewRecorder()
	gateway.ServeHTTP(res, req)
	stream := res.Body.String()
	if res.Code != 200 || !strings.Contains(stream, `"type":"server_tool_use"`) || !strings.Contains(stream, `"type":"tool_search_tool_result"`) || !strings.Contains(stream, `"tool_name":"weather"`) || !strings.Contains(stream, "event: message_stop") || strings.Contains(stream, "mcp__ccgateway__weather") {
		t.Fatalf("BM25 SSE mismatch: HTTP%d %s", res.Code, stream)
	}
	t.Logf("CLI=%s synthetic upstream calls=%d", version, len(captured))
}
