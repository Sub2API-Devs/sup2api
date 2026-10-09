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

// A real CLI, isolated credentials and fake upstream: ask it to write a file,
// together with an MCP call, and prove neither is executed inside the Worker.
func TestMixedNativeHandoffRealCLI(t *testing.T) {
	cli := os.Getenv("CCG_REAL_CLI")
	if cli == "" {
		t.Skip("set CCG_REAL_CLI")
	}
	version, err := checkVersion(cli)
	if err != nil {
		t.Fatal(err)
	}
	nativeCatalogue := verifiedNativeToolCatalogues[version]
	if nativeCatalogue == nil {
		t.Skip("no captured native catalogue for this CLI version")
	}
	root := t.TempDir()
	// A catalogued tool can be absent under the current CLI's feature gates.
	missing := Tool{Name: "FixtureNativeMissing", Description: "Unavailable native fixture", Schema: Object{"type": "object", "properties": Object{}}}
	nativeCatalogue[missing.Name] = []Tool{missing}
	defer delete(nativeCatalogue, missing.Name)
	plugin, err := extractMod(root)
	if err != nil {
		t.Fatal(err)
	}
	sentinel := filepath.Join(root, "must-not-be-created.txt")
	shellSentinel := filepath.Join(root, "must-not-be-created-by-shell.txt")
	var mu sync.Mutex
	var captures []Object
	fake := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if !strings.HasSuffix(r.URL.Path, "/messages") {
			fmt.Fprint(w, `{"input_tokens":20}`)
			return
		}
		data, _ := io.ReadAll(r.Body)
		v, err := decodeObject(data)
		if err != nil {
			http.Error(w, "invalid", 400)
			return
		}
		mu.Lock()
		captures = append(captures, v)
		index := len(captures)
		mu.Unlock()
		w.Header().Set("Content-Type", "text/event-stream")
		event := func(v Object) {
			b, _ := json.Marshal(v)
			fmt.Fprintf(w, "event: %s\ndata: %s\n\n", str(v, "type"), b)
			w.(http.Flusher).Flush()
		}
		event(Object{"type": "message_start", "message": Object{"id": fmt.Sprintf("msg_mixed_%d", index), "type": "message", "role": "assistant", "model": v["model"], "content": []any{}, "stop_reason": nil, "stop_sequence": nil, "usage": Object{"input_tokens": 20, "output_tokens": 0}}})
		messages, _ := json.Marshal(v["messages"])
		stop := "tool_use"
		if bytes.Contains(messages, []byte("CLIENT_RESULT")) {
			stop = "end_turn"
			event(Object{"type": "content_block_start", "index": 0, "content_block": Object{"type": "text", "text": ""}})
			event(Object{"type": "content_block_delta", "index": 0, "delta": Object{"type": "text_delta", "text": "RESULT_ACCEPTED"}})
			event(Object{"type": "content_block_stop", "index": 0})
		} else {
			for i, name := range []string{"Write", "Read", "Bash", "mcp__fixture__lookup", "mcp__clienttools__lookup_custom", "mcp__clienttools__FixtureNativeMissing"} {
				input := Object{"query": "probe"}
				if i == 0 {
					input = Object{"file_path": sentinel, "content": "LOCAL_EXECUTION_BUG"}
				} else if name == "Read" {
					input = Object{"file_path": sentinel}
				} else if name == "Bash" {
					input = Object{"command": fmt.Sprintf("echo LOCAL_EXECUTION_BUG > %q", shellSentinel), "description": "Fixture command must be handed to the API client"}
				}
				args, _ := json.Marshal(input)
				event(Object{"type": "content_block_start", "index": i, "content_block": Object{"type": "tool_use", "id": fmt.Sprintf("toolu_mixed_%d_%d", index, i), "name": name, "input": Object{}}})
				event(Object{"type": "content_block_delta", "index": i, "delta": Object{"type": "input_json_delta", "partial_json": string(args)}})
				event(Object{"type": "content_block_stop", "index": i})
			}
		}
		event(Object{"type": "message_delta", "delta": Object{"stop_reason": stop, "stop_sequence": nil}, "usage": Object{"output_tokens": 8}})
		event(Object{"type": "message_stop"})
	}))
	defer fake.Close()
	base := []string{}
	for _, k := range []string{"PATH", "SystemRoot", "WINDIR", "COMSPEC", "TEMP", "TMP", "PATHEXT", "APPDATA", "LOCALAPPDATA"} {
		if v := os.Getenv(k); v != "" {
			base = append(base, k+"="+v)
		}
	}
	env := envWith(base, map[string]string{"HOME": root, "USERPROFILE": root, "CLAUDE_CONFIG_DIR": filepath.Join(root, "config"), "ANTHROPIC_API_KEY": "dummy-local-fixture", "ANTHROPIC_BASE_URL": fake.URL, "CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC": "1"})
	cache, err := newCache(filepath.Join(root, "cache"), 32<<20)
	if err != nil {
		t.Fatal(err)
	}
	logs := filepath.Join(root, "request-logs")
	g := httptest.NewServer(&Gateway{Runner: &Runner{CLI: cli, Version: version, Plugin: plugin, Work: root, Env: env}, Cache: cache, Timeout: 30 * time.Second, Slots: make(chan struct{}, 2), RequestLogs: &requestLogStore{root: logs, enabled: true, active: map[*requestDiagnostic]bool{}}})
	defer g.Close()
	post := func(body Object) (Object, string, string) {
		t.Helper()
		data, _ := json.Marshal(body)
		r, _ := http.NewRequest("POST", g.URL+"/v1/messages", bytes.NewReader(data))
		r.Header.Set("Content-Type", "application/json")
		setTestSession(t, r, "mixed-native")
		r.Header.Set(policyHeader, `{"custom_tool_prefix":"clienttools"}`)
		resp, err := http.DefaultClient.Do(r)
		if err != nil {
			t.Fatal(err)
		}
		defer resp.Body.Close()
		out, _ := io.ReadAll(resp.Body)
		if resp.StatusCode != 200 {
			mu.Lock()
			var names []string
			if len(captures) > 0 {
				for _, v := range captures[len(captures)-1]["tools"].([]any) {
					names = append(names, str(v.(map[string]any), "name"))
				}
			}
			mu.Unlock()
			t.Fatalf("HTTP %d %s; actual fixture tool names=%v", resp.StatusCode, out, names)
		}
		obj, _ := decodeObject(out)
		return obj, string(out), resp.Header.Get("X-CCGateway-History")
	}
	request := basic()
	writeTool := nativeCatalogue["Write"][0]
	writeTool.Description = "Client-owned file writer with a different description."
	request["tools"] = []any{writeTool, Tool{Name: "mcp__fixture__lookup", Description: "Lookup fixture", Schema: Object{"type": "object", "properties": Object{"query": Object{"type": "string"}}, "required": []any{"query"}}}}
	request["tools"] = append(request["tools"].([]any), nativeCatalogue["Read"][0], capturedSDKNativeTool(t, version, "Bash"))
	request["tools"] = append(request["tools"].([]any), Tool{Name: "lookup_custom", Description: "Custom lookup", Schema: Object{"type": "object", "properties": Object{"query": Object{"type": "string"}}, "required": []any{"query"}}})
	request["tools"] = append(request["tools"].([]any), missing)
	user := Object{"role": "user", "content": "MIXED_NATIVE_PROBE"}
	request["messages"] = []any{user}
	answer, _, _ := post(request)
	if str(answer, "stop_reason") != "tool_use" {
		t.Fatal(answer)
	}
	blocks := answer["content"].([]any)
	if len(blocks) != 6 || str(blocks[0].(Object), "name") != "Write" || str(blocks[1].(Object), "name") != "Read" || str(blocks[2].(Object), "name") != "Bash" || str(blocks[3].(Object), "name") != "mcp__fixture__lookup" || str(blocks[4].(Object), "name") != "lookup_custom" || str(blocks[5].(Object), "name") != missing.Name {
		t.Fatal("tool names changed", blocks)
	}
	results := []any{}
	for _, b := range blocks {
		results = append(results, Object{"type": "tool_result", "tool_use_id": b.(Object)["id"], "content": "CLIENT_RESULT"})
	}
	request["messages"] = []any{user, Object{"role": "assistant", "content": blocks}, Object{"role": "user", "content": results}}
	_, out, mode := post(request)
	if mode != "prefix-hit" || !strings.Contains(out, "RESULT_ACCEPTED") {
		t.Fatalf("continuation %s %s", mode, out)
	}
	// Roll back to the original user message, exercising a fork and SSE handoff.
	request["messages"] = []any{user}
	request["stream"] = true
	_, out, _ = post(request)
	if !strings.Contains(out, "event: message_stop") || strings.Contains(out, "event: error") || !strings.Contains(out, `"name":"Write"`) {
		t.Fatal(out)
	}
	if _, err := os.Stat(sentinel); !os.IsNotExist(err) {
		t.Fatalf("native Write executed: %v", err)
	}
	if _, err := os.Stat(shellSentinel); !os.IsNotExist(err) {
		t.Fatalf("native Bash executed: %v", err)
	}
	entries, _ := os.ReadDir(logs)
	seen := map[string]bool{}
	fallbackSeen := false
	for _, entry := range entries {
		data, _ := os.ReadFile(filepath.Join(logs, entry.Name(), "events.jsonl"))
		for _, line := range bytes.Split(data, []byte("\n")) {
			v, err := decodeObject(line)
			if err == nil && str(v, "event") == "native_tools_mcp_fallback" {
				fallbackSeen = true
			}
			if err != nil || str(v, "event") != "mod_tool_call" {
				continue
			}
			detail := v["detail"].(Object)
			call := detail["call"].(Object)
			if detail["local_execution"] != false || str(detail, "decision") != "client_handoff" {
				t.Fatal("client tool ran locally", detail)
			}
			seen[str(call, "tool")] = true
		}
	}
	if !seen["Write"] || !seen["Read"] || !seen["Bash"] || !seen["mcp__fixture__lookup"] || !seen["mcp__clienttools__lookup_custom"] || !seen["mcp__clienttools__FixtureNativeMissing"] {
		t.Fatal("missing unified Mod handoff logs", seen)
	}
	if !fallbackSeen {
		t.Fatal("runtime native fallback not exercised")
	}
	mu.Lock()
	defer mu.Unlock()
	if len(captures) != 3 {
		t.Fatalf("unexpected internal continuation: %d requests", len(captures))
	}
	for _, capture := range captures {
		for _, value := range capture["tools"].([]any) {
			tool := value.(Object)
			if str(tool, "name") == "Write" && str(tool, "description") != writeTool.Description {
				t.Fatal("native tool lost client description", tool)
			}
		}
		data, _ := json.Marshal(capture["messages"])
		if bytes.Contains(data, []byte("execution belongs")) {
			t.Fatal("internal denial leaked into history")
		}
	}
}

// A headless -p catalogue can differ from SDK/stdin mode. Select the schema
// actually captured for the Worker-style mode, not a guessed SDK declaration.
func capturedSDKNativeTool(t *testing.T, version, name string) Tool {
	t.Helper()
	variants := verifiedNativeToolCatalogues[version][name]
	if len(variants) == 0 {
		t.Fatalf("missing native %s catalogue for %s", name, version)
	}
	if len(variants) == 1 {
		return variants[0]
	}
	data, err := os.ReadFile(filepath.Join("..", "catalog", "claude-"+version+".capture.json"))
	if err != nil {
		t.Fatal(err)
	}
	evidence, err := decodeObject(data)
	if err != nil {
		t.Fatal(err)
	}
	for _, raw := range evidence["scenarios"].([]any) {
		scenario := raw.(map[string]any)
		if str(scenario, "scenario") != "sdk-explicit" {
			continue
		}
		hashes := scenario["schema_hashes"].(map[string]any)
		for _, variant := range variants {
			if digest(variant.Schema) == str(hashes, name) {
				return variant
			}
		}
	}
	t.Fatalf("no SDK capture for native %s in CLI %s", name, version)
	return Tool{}
}
