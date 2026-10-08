package engine

import (
	"bytes"
	"io"
	"net/http"
	"net/http/httptest"
	"os"
	"path/filepath"
	"strings"
	"sync"
	"testing"
)

func TestRealCLIMCPConnectorGateway(t *testing.T) {
	for _, listing := range []bool{true, false} {
		t.Run(map[bool]string{true: "listing-beta", false: "classic-beta"}[listing], func(t *testing.T) { runMCPConnectorGateway(t, listing) })
	}
}

func runMCPConnectorGateway(t *testing.T, listing bool) {
	beta := mcpConnectorBeta
	if listing {
		beta = mcpListingBeta
	}
	var mu sync.Mutex
	var requests []Object
	blocks := []Object{
		{"type": "mcp_tool_listing", "mcp_server_name": "one", "tools": []any{Object{"name": "echo", "input_schema": Object{"type": "object"}}}},
		{"type": "mcp_tool_use", "id": "mcptoolu_one", "name": "echo", "server_name": "one", "input": Object{"hello": "world"}},
		{"type": "mcp_tool_result", "tool_use_id": "mcptoolu_one", "is_error": false, "content": []any{Object{"type": "text", "text": "MCP_RESULT"}}},
	}
	if !listing {
		blocks = blocks[1:]
	}
	handler := func(w http.ResponseWriter, r *http.Request) {
		if !strings.HasSuffix(r.URL.Path, "/messages") {
			w.Write([]byte(`{"input_tokens":1}`))
			return
		}
		raw, _ := io.ReadAll(r.Body)
		body, _ := decodeObject(raw)
		mu.Lock()
		requests = append(requests, body)
		mu.Unlock()
		servers, _ := body["mcp_servers"].([]any)
		if len(servers) != 2 {
			t.Error("MCP server list changed")
		} else {
			for i, name := range []string{"one", "two"} {
				server := servers[i].(map[string]any)
				if str(server, "name") != name || str(server, "authorization_token") != "fixture-secret-"+name {
					t.Error("MCP credential binding changed")
				}
			}
		}
		if bytes.Contains(mustMCPJSON(body["messages"]), []byte("mcptoolu_one")) {
			if !bytes.Contains(mustMCPJSON(body["messages"]), []byte("MCP_RESULT")) {
				writeSurfaceFixture(w, str(body, "model"), []Object{blocks[len(blocks)-1], {"type": "text", "text": "PAUSE_FINISHED"}})
				return
			}
			writeSurfaceFixture(w, str(body, "model"), []Object{{"type": "text", "text": "MCP_CONTINUED"}})
		} else {
			if bytes.Contains(mustMCPJSON(body["messages"]), []byte("MCP_PAUSE")) {
				rec := httptest.NewRecorder()
				writeSurfaceFixture(rec, str(body, "model"), blocks[:len(blocks)-1])
				w.Header().Set("Content-Type", "text/event-stream")
				w.Write(bytes.ReplaceAll(rec.Body.Bytes(), []byte(`"stop_reason":"end_turn"`), []byte(`"stop_reason":"pause_turn"`)))
				return
			}
			writeSurfaceFixture(w, str(body, "model"), blocks)
		}
	}
	endpoint, cache := newThinkingOutputFixture(t, handler)
	body := mcpPlanFixture()
	body["model"] = "claude-opus-5-5"
	body["max_tokens"] = 64
	body["messages"] = []any{Object{"role": "user", "content": "MCP fixture"}}
	body["tools"].([]any)[0].(map[string]any)["cache_control"] = Object{"type": "ephemeral"}
	post := func(endpoint string) (Object, Object) {
		t.Helper()
		req, _ := http.NewRequest("POST", endpoint+"/v1/messages", bytes.NewReader(mustMCPJSON(body)))
		req.Header.Set("Anthropic-Beta", beta)
		res, err := http.DefaultClient.Do(req)
		if err != nil {
			t.Fatal(err)
		}
		defer res.Body.Close()
		raw, _ := io.ReadAll(res.Body)
		if res.StatusCode != 200 {
			_ = filepath.WalkDir(filepath.Dir(cache.dir), func(path string, entry os.DirEntry, walkErr error) error {
				if walkErr == nil && !entry.IsDir() && strings.HasPrefix(entry.Name(), "upstream-refused-") {
					data, _ := os.ReadFile(path)
					refused, _ := decodeObject(data)
					t.Logf("refused fixture messages %s", mustMCPJSON(refused["messages"]))
				}
				return nil
			})
			t.Fatalf("HTTP%d %s", res.StatusCode, raw)
		}
		answer, err := decodeObject(raw)
		if err != nil {
			t.Fatal(err)
		}
		mu.Lock()
		wire := requests[len(requests)-1]
		mu.Unlock()
		return answer, wire
	}
	first, _ := post(endpoint)
	if digest(first["content"]) != digest(blocks) {
		t.Fatal("MCP response changed", first)
	}
	body["messages"] = append(body["messages"].([]any), Object{"role": "assistant", "content": first["content"]}, Object{"role": "user", "content": "MCP next"})
	second, wire := post(endpoint)
	for _, block := range blocks {
		if !messageProbeContainsBlock(wire, block) {
			t.Fatal("MCP history lost")
		}
	}
	body["messages"] = append(body["messages"].([]any), Object{"role": "assistant", "content": second["content"]}, Object{"role": "user", "content": "MCP later"})
	post(endpoint)
	body["messages"] = append(body["messages"].([]any)[:2], Object{"role": "user", "content": "MCP rollback"})
	post(endpoint)
	cold, _ := newThinkingOutputFixture(t, handler)
	post(cold)
	body["messages"] = []any{Object{"role": "user", "content": "MCP_PAUSE"}}
	paused, _ := post(endpoint)
	if str(paused, "stop_reason") != "pause_turn" {
		t.Fatal("MCP pause reason changed")
	}
	body["messages"] = append(body["messages"].([]any), Object{"role": "assistant", "content": paused["content"]})
	finished, _ := post(endpoint)
	if str(finished, "stop_reason") != "end_turn" {
		t.Fatal("MCP pause continuation did not finish")
	}
	body["messages"] = []any{Object{"role": "user", "content": "MCP stream"}}
	body["stream"] = true
	req, _ := http.NewRequest("POST", endpoint+"/v1/messages", bytes.NewReader(mustMCPJSON(body)))
	req.Header.Set("Anthropic-Beta", beta)
	res, err := http.DefaultClient.Do(req)
	if err != nil {
		t.Fatal(err)
	}
	raw, _ := io.ReadAll(res.Body)
	res.Body.Close()
	if res.StatusCode != 200 || !bytes.Contains(raw, []byte(`"type":"mcp_tool_result"`)) || strings.Count(string(raw), "event: message_stop") != 1 {
		t.Fatalf("MCP SSE failed HTTP%d %s", res.StatusCode, raw)
	}
	mu.Lock()
	count := len(requests)
	mu.Unlock()
	if count != 8 {
		t.Fatalf("expected one provider call per API request, got %d", count)
	}
	_ = filepath.WalkDir(filepath.Dir(cache.dir), func(path string, entry os.DirEntry, err error) error {
		if err != nil || entry.IsDir() {
			return nil
		}
		data, _ := os.ReadFile(path)
		if bytes.Contains(data, []byte("fixture-secret-one")) || bytes.Contains(data, []byte("fixture-secret-two")) {
			t.Errorf("credential persisted in %s", filepath.Base(path))
		}
		return nil
	})
}

func TestRealCLIMCPProviderCredentialEchoBlocked(t *testing.T) {
	endpoint, cache := newThinkingOutputFixture(t, func(w http.ResponseWriter, r *http.Request) {
		raw, _ := io.ReadAll(r.Body)
		body, _ := decodeObject(raw)
		writeSurfaceFixture(w, str(body, "model"), []Object{
			{"type": "mcp_tool_use", "id": "mcptoolu_echo", "name": "echo", "server_name": "one", "input": Object{}},
			{"type": "mcp_tool_result", "tool_use_id": "mcptoolu_echo", "is_error": false, "content": "fixture-secret-one"},
		})
	})
	body := mcpPlanFixture()
	body["model"] = "claude-opus-5-5"
	body["max_tokens"] = 64
	body["messages"] = []any{Object{"role": "user", "content": "fixture"}}
	req, _ := http.NewRequest("POST", endpoint+"/v1/messages", bytes.NewReader(mustMCPJSON(body)))
	req.Header.Set("Anthropic-Beta", mcpConnectorBeta)
	res, err := http.DefaultClient.Do(req)
	if err != nil {
		t.Fatal(err)
	}
	raw, _ := io.ReadAll(res.Body)
	res.Body.Close()
	if res.StatusCode != 502 || !bytes.Contains(raw, []byte("credential isolation")) || bytes.Contains(raw, []byte("fixture-secret-one")) {
		t.Fatalf("credential echo not safely rejected: HTTP%d %s", res.StatusCode, raw)
	}
	err = filepath.WalkDir(filepath.Dir(cache.dir), func(path string, entry os.DirEntry, err error) error {
		if err != nil {
			return err
		}
		if entry.IsDir() {
			return nil
		}
		data, err := os.ReadFile(path)
		if err != nil {
			return err
		}
		if bytes.Contains(data, []byte("fixture-secret-one")) || bytes.Contains(data, []byte("fixture-secret-two")) {
			t.Errorf("credential echo persisted in %s", filepath.Base(path))
		}
		return nil
	})
	if err != nil {
		t.Fatal(err)
	}
}

func TestRealCLIMCPMixedClientHandoff(t *testing.T) {
	endpoint, _ := newThinkingOutputFixture(t, func(w http.ResponseWriter, r *http.Request) {
		raw, _ := io.ReadAll(r.Body)
		body, _ := decodeObject(raw)
		if bytes.Contains(mustMCPJSON(body["messages"]), []byte("CLIENT_RESULT")) {
			if !bytes.Contains(mustMCPJSON(body["messages"]), []byte("mcptoolu_pending")) {
				t.Error("pending MCP call disappeared before mixed client result")
			}
			writeSurfaceFixture(w, str(body, "model"), []Object{{"type": "mcp_tool_result", "tool_use_id": "mcptoolu_pending", "is_error": false, "content": "REMOTE_RESULT"}, {"type": "text", "text": "DONE"}})
			return
		}
		writeSurfaceFixture(w, str(body, "model"), []Object{{"type": "mcp_tool_use", "id": "mcptoolu_pending", "name": "remote", "server_name": "one", "input": Object{}}, {"type": "tool_use", "id": "tool_local", "name": "mcp__ccgateway__local", "input": Object{}}})
	})
	body := mcpPlanFixture()
	body["model"] = "claude-opus-5-5"
	body["max_tokens"] = 64
	body["messages"] = []any{Object{"role": "user", "content": "mixed tools"}}
	body["tools"] = append(body["tools"].([]any), Object{"name": "local", "input_schema": Object{"type": "object"}})
	post := func() Object {
		t.Helper()
		req, _ := http.NewRequest("POST", endpoint+"/v1/messages", bytes.NewReader(mustMCPJSON(body)))
		req.Header.Set("Anthropic-Beta", mcpConnectorBeta)
		res, err := http.DefaultClient.Do(req)
		if err != nil {
			t.Fatal(err)
		}
		raw, _ := io.ReadAll(res.Body)
		res.Body.Close()
		if res.StatusCode != 200 {
			t.Fatalf("HTTP%d %s", res.StatusCode, raw)
		}
		answer, _ := decodeObject(raw)
		return answer
	}
	first := post()
	body["messages"] = append(body["messages"].([]any), Object{"role": "assistant", "content": first["content"]}, Object{"role": "user", "content": []any{Object{"type": "tool_result", "tool_use_id": "tool_local", "content": "CLIENT_RESULT"}}})
	post()
}
