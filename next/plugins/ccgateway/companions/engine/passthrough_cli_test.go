package engine

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"net/http/httptest"
	"os"
	"os/exec"
	"path/filepath"
	"strings"
	"sync"
	"testing"
	"time"
)

// passthroughWire is one request the fake upstream received.
type passthroughWire struct {
	header http.Header
	body   Object
	raw    []byte
}

// TestRealCLIRelayPassthrough runs the real CLI behind the passthrough relay
// (PASSTHROUGH-DESIGN.md): what upstream receives is what the CLI built, with
// the client's fields from CLAUDE_CODE_EXTRA_BODY, the CLI's own session U and
// subagent A', no retries, and upstream errors returned as sent.
func TestRealCLIRelayPassthrough(t *testing.T) {
	cli := os.Getenv("CCG_REAL_CLI")
	if cli == "" {
		t.Skip("set CCG_REAL_CLI for the real CLI passthrough test")
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
	// The engine refuses a hooks module its validator rejects, silently: the
	// run then fails with "Mod did not acknowledge loading".
	if out, err := exec.Command(cli, "plugin", "validate", plugin).CombinedOutput(); err != nil {
		t.Fatalf("Mod validation: %v: %s", err, out)
	}
	var mu sync.Mutex
	var wires []passthroughWire
	var answer func(w http.ResponseWriter, body Object, round int)
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
		wires = append(wires, passthroughWire{header: r.Header.Clone(), body: body, raw: raw})
		round := len(wires)
		handle := answer
		mu.Unlock()
		handle(w, body, round)
	}))
	defer fake.Close()
	base := []string{}
	for _, key := range []string{"PATH", "SystemRoot", "WINDIR", "COMSPEC", "TEMP", "TMP", "PATHEXT", "APPDATA", "LOCALAPPDATA", "CLAUDE_CODE_GIT_BASH_PATH"} {
		if value := os.Getenv(key); value != "" {
			base = append(base, key+"="+value)
		}
	}
	env := envWith(base, map[string]string{"HOME": root, "USERPROFILE": root, "CLAUDE_CONFIG_DIR": filepath.Join(root, "config"), "ANTHROPIC_API_KEY": "dummy-passthrough-fixture", "ANTHROPIC_BASE_URL": fake.URL, "CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC": "1"})
	runner := &Runner{CLI: cli, Version: version, Plugin: plugin, Work: root, Env: env}
	cache, err := newCache(filepath.Join(root, "cache"), 32<<20)
	if err != nil {
		t.Fatal(err)
	}
	g := &Gateway{Runner: runner, Cache: cache, Timeout: 60 * time.Second, Slots: make(chan struct{}, 2)}
	lookup := Object{"name": "lookup", "description": "Look up a fixture record.", "input_schema": Object{"type": "object", "properties": Object{"key": Object{"type": "string"}}, "required": []any{"key"}}}
	post := func(t *testing.T, body Object, session, agent string, betas ...string) *httptest.ResponseRecorder {
		t.Helper()
		raw, _ := json.Marshal(body)
		req := httptest.NewRequest("POST", "/v1/messages", bytes.NewReader(raw))
		req.Header.Set(policyHeader, `{"relay_mode":"passthrough"}`)
		if len(betas) > 0 {
			req.Header.Set("anthropic-beta", strings.Join(betas, ","))
		}
		if session != "" {
			setTestSession(t, req, session)
		}
		if agent != "" {
			req.Header.Set("X-Claude-Code-Agent-Id", agent)
		}
		res := httptest.NewRecorder()
		g.ServeHTTP(res, req)
		return res
	}
	start := func(handle func(w http.ResponseWriter, body Object, round int)) int {
		mu.Lock()
		defer mu.Unlock()
		answer = handle
		return len(wires)
	}
	since := func(n int) []passthroughWire {
		mu.Lock()
		defer mu.Unlock()
		return append([]passthroughWire(nil), wires[n:]...)
	}
	text := func(w http.ResponseWriter, body Object, _ int) {
		writeSurfaceFixture(w, str(body, "model"), []Object{{"type": "text", "text": "PASSTHROUGH_OK"}})
	}
	sessionOf := func(t *testing.T, wire passthroughWire) string {
		metadata, _ := wire.body["metadata"].(map[string]any)
		var user Object
		if err := json.Unmarshal([]byte(str(metadata, "user_id")), &user); err != nil {
			t.Fatalf("metadata.user_id: %v", wire.body["metadata"])
		}
		return str(user, "session_id")
	}

	t.Run("fields", func(t *testing.T) {
		n := start(func(w http.ResponseWriter, body Object, _ int) {
			writeSurfaceFixture(w, str(body, "model"), []Object{{"type": "tool_use", "id": "toolu_passthrough", "name": "mcp__ccgateway__lookup", "input": Object{"key": "k"}}})
		})
		format := Object{"type": "json_schema", "schema": Object{"type": "object", "properties": Object{"answer": Object{"type": "string"}}, "required": []any{"answer"}, "additionalProperties": false}}
		body := Object{"model": "claude-sonnet-4-6", "max_tokens": 3000, "temperature": 0.25, "top_k": 7, "stop_sequences": []any{"STOP_A"}, "service_tier": "auto",
			"thinking": Object{"type": "enabled", "budget_tokens": 1024, "display": "summarized"}, "output_config": Object{"format": format},
			"tools": []any{lookup}, "tool_choice": Object{"type": "tool", "name": "lookup"},
			"messages": []any{Object{"role": "user", "content": "FIELDS"}}}
		res := post(t, body, "passthrough-fields", "", "fixture-beta-2026-01-01")
		if res.Code != 200 || !strings.Contains(res.Body.String(), `"name":"lookup"`) || strings.Contains(res.Body.String(), "mcp__") {
			t.Fatalf("HTTP%d %s", res.Code, res.Body.String())
		}
		got := since(n)
		if len(got) != 1 {
			t.Fatalf("%d upstream requests", len(got))
		}
		wire := got[0]
		want := Object{"max_tokens": 3000, "temperature": 0.25, "top_k": 7, "stop_sequences": []any{"STOP_A"}, "service_tier": "auto", "thinking": body["thinking"], "tool_choice": Object{"type": "tool", "name": "mcp__ccgateway__lookup"}}
		for name, value := range want {
			if digest(normalizeJSON(t, wire.body[name])) != digest(normalizeJSON(t, value)) {
				t.Errorf("%s = %v, want %v", name, wire.body[name], value)
			}
		}
		output, _ := wire.body["output_config"].(map[string]any)
		if digest(normalizeJSON(t, output["format"])) != digest(normalizeJSON(t, format)) || output["effort"] != "high" {
			t.Errorf("output_config = %v", output)
		}
		if !strings.Contains(wire.header.Get("anthropic-beta"), "fixture-beta-2026-01-01") {
			t.Errorf("client beta missing: %q", wire.header.Get("anthropic-beta"))
		}
		if _, ok := wire.header["X-Forwarded-For"]; ok {
			t.Error("relay added X-Forwarded-For")
		}
		branch, _ := newSessionBranch(&Request{Plan: &RequestPlan{metadata: json.RawMessage(`{"user_id":"passthrough-fields"}`)}}, http.Header{})
		if wire.header.Get("X-Claude-Code-Session-Id") != branch.Upstream || sessionOf(t, wire) != branch.Upstream {
			t.Errorf("session %q / %q, want U %q", wire.header.Get("X-Claude-Code-Session-Id"), sessionOf(t, wire), branch.Upstream)
		}
		if wire.header.Get("X-Claude-Code-Agent-Id") != "" {
			t.Error("main thread carries an agent ID")
		}
	})

	t.Run("tool_choice first round only", func(t *testing.T) {
		n := start(func(w http.ResponseWriter, body Object, round int) {
			history, _ := json.Marshal(body["messages"])
			if !bytes.Contains(history, []byte("toolu_search_round")) {
				writeSurfaceFixture(w, str(body, "model"), []Object{{"type": "tool_use", "id": "toolu_search_round", "name": "ToolSearch", "input": Object{"query": "select:mcp__fixture__find"}}})
				return
			}
			writeSurfaceFixture(w, str(body, "model"), []Object{{"type": "text", "text": "PASSTHROUGH_OK"}})
		})
		deferred := Object{"name": "mcp__fixture__find", "description": "Find a fixture.", "input_schema": Object{"type": "object", "properties": Object{"q": Object{"type": "string"}}}, "defer_loading": true}
		body := Object{"model": "claude-sonnet-4-6", "max_tokens": 1024, "temperature": 0.5, "tools": []any{lookup, deferred}, "tool_choice": Object{"type": "any"},
			"messages": []any{Object{"role": "user", "content": "ROUNDS"}}}
		res := post(t, body, "passthrough-rounds", "")
		if res.Code != 200 || !strings.Contains(res.Body.String(), "PASSTHROUGH_OK") || strings.Contains(res.Body.String(), "ToolSearch") {
			t.Fatalf("HTTP%d %s", res.Code, res.Body.String())
		}
		got := since(n)
		if len(got) != 2 {
			t.Fatalf("%d upstream requests", len(got))
		}
		if choice, _ := got[0].body["tool_choice"].(map[string]any); str(choice, "type") != "any" {
			t.Errorf("first round tool_choice %v", got[0].body["tool_choice"])
		}
		if _, exists := got[1].body["tool_choice"]; exists {
			t.Errorf("internal round carries tool_choice %v", got[1].body["tool_choice"])
		}
		for i, wire := range got {
			if fmt.Sprint(wire.body["temperature"]) != "0.5" {
				t.Errorf("round %d temperature %v", i, wire.body["temperature"])
			}
		}
	})

	t.Run("safeguards and verdict", func(t *testing.T) {
		safeguards := []any{Object{"type": "dangerous_tool_use", "classifier_context": Object{"v": 1, "permission_mode": "auto", "fixture_only": true}}}
		n := start(func(w http.ResponseWriter, body Object, _ int) {
			recorder := httptest.NewRecorder()
			writeSurfaceFixture(recorder, str(body, "model"), []Object{{"type": "tool_use", "id": "toolu_guarded", "name": "Read", "input": Object{"file_path": "D:/fixture.txt"}}})
			w.Header().Set("Content-Type", "text/event-stream")
			w.Header().Set("Anthropic-Ratelimit-Unified-5h-Utilization", "0.42")
			w.Header().Set("Request-Id", "req_guarded")
			for _, line := range strings.Split(recorder.Body.String(), "\n") {
				if strings.HasPrefix(line, "data: ") {
					event, _ := decodeObject([]byte(strings.TrimPrefix(line, "data: ")))
					if str(event, "type") == "message_delta" {
						event["safeguard_results"] = []any{Object{"tool_use_id": "toolu_guarded", "decision": "allow", "synthetic_fixture": true}}
					}
					data, _ := json.Marshal(event)
					line = "data: " + string(data)
				}
				fmt.Fprintln(w, line)
			}
		})
		read := verifiedNativeToolCatalogues[version]["Read"][0]
		body := Object{"model": "claude-sonnet-4-6", "max_tokens": 512, "safeguards": safeguards, "tools": []any{Object{"name": "Read", "description": read.Description, "input_schema": read.Schema}},
			"messages": []any{Object{"role": "user", "content": "GUARDED"}}}
		for _, stream := range []bool{true, false} {
			body["stream"] = stream
			res := post(t, body, "", "", "dangerous-tool-use-2026-09-03")
			if res.Code != 200 || !strings.Contains(res.Body.String(), "synthetic_fixture") || !strings.Contains(res.Body.String(), `"name":"Read"`) {
				t.Fatalf("stream=%t: HTTP%d %s", stream, res.Code, res.Body.String())
			}
			if res.Header().Get("Request-Id") != "req_guarded" || res.Header().Get("Anthropic-Ratelimit-Unified-5h-Utilization") != "" {
				t.Fatalf("stream=%t: client headers %v", stream, res.Header())
			}
		}
		for _, wire := range since(n) {
			if digest(normalizeJSON(t, wire.body["safeguards"])) != digest(normalizeJSON(t, safeguards)) || !strings.Contains(wire.header.Get("anthropic-beta"), "dangerous-tool-use-2026-09-03") {
				t.Fatalf("safeguards not sent as the client's: %v %q", wire.body["safeguards"], wire.header.Get("anthropic-beta"))
			}
		}
	})

	t.Run("max_tokens 0", func(t *testing.T) {
		n := start(func(w http.ResponseWriter, body Object, _ int) {
			writeSurfaceFixture(w, str(body, "model"), nil)
		})
		res := post(t, Object{"model": "claude-sonnet-4-6", "max_tokens": 0, "messages": []any{Object{"role": "user", "content": "WARM"}}}, "", "")
		if res.Code != 200 || !strings.Contains(res.Body.String(), `"content":[]`) {
			t.Fatalf("HTTP%d %s", res.Code, res.Body.String())
		}
		if got := since(n); len(got) != 1 || fmt.Sprint(got[0].body["max_tokens"]) != "0" {
			t.Fatalf("%d upstream requests", len(got))
		}
	})

	t.Run("upstream error as sent without retry", func(t *testing.T) {
		const overloaded = `{"type":"error","error":{"type":"overloaded_error","message":"Overloaded fixture"},"request_id":"req_fixture_529"}`
		n := start(func(w http.ResponseWriter, _ Object, _ int) {
			w.Header().Set("Content-Type", "application/json")
			w.Header().Set("Anthropic-Ratelimit-Unified-5h-Status", "rejected")
			w.Header().Set("Request-Id", "req_fixture_529")
			w.WriteHeader(529)
			fmt.Fprint(w, overloaded)
		})
		res := post(t, Object{"model": "claude-sonnet-4-6", "max_tokens": 256, "messages": []any{Object{"role": "user", "content": "ERROR"}}}, "passthrough-error", "")
		if res.Code != 529 || res.Body.String() != overloaded || res.Header().Get("Request-Id") != "req_fixture_529" || res.Header().Get("Anthropic-Ratelimit-Unified-5h-Status") != "" {
			t.Fatalf("HTTP%d %s %v", res.Code, res.Body.String(), res.Header())
		}
		if got := since(n); len(got) != 1 {
			t.Fatalf("%d upstream requests: the CLI retried", len(got))
		}
	})

	t.Run("rejected request as sent", func(t *testing.T) {
		const invalid = `{"type":"error","error":{"type":"invalid_request_error","message":"temperature: fixture rejection"}}`
		n := start(func(w http.ResponseWriter, _ Object, _ int) {
			w.Header().Set("Content-Type", "application/json")
			w.WriteHeader(400)
			fmt.Fprint(w, invalid)
		})
		res := post(t, Object{"model": "claude-sonnet-4-6", "max_tokens": 256, "temperature": 0.1, "messages": []any{Object{"role": "user", "content": "INVALID"}}}, "passthrough-invalid", "")
		if res.Code != 400 || res.Body.String() != invalid {
			t.Fatalf("HTTP%d %s", res.Code, res.Body.String())
		}
		if got := since(n); len(got) != 1 {
			t.Fatalf("%d upstream requests", len(got))
		}
	})

	t.Run("fallbacks", func(t *testing.T) {
		n := start(func(w http.ResponseWriter, body Object, _ int) {
			if str(body, "model") == "claude-sonnet-4-6" {
				w.Header().Set("Content-Type", "application/json")
				w.WriteHeader(529)
				fmt.Fprint(w, `{"type":"error","error":{"type":"overloaded_error","message":"Overloaded"}}`)
				return
			}
			writeSurfaceFixture(w, str(body, "model"), []Object{{"type": "text", "text": "PASSTHROUGH_OK"}})
		})
		body := Object{"model": "claude-sonnet-4-6", "max_tokens": 512, "temperature": 0.2, "fallbacks": []any{Object{"model": "claude-haiku-4-5", "max_tokens": 300}},
			"messages": []any{Object{"role": "user", "content": "FALLBACK"}}}
		res := post(t, body, "passthrough-fallback", "", "server-side-fallback-2026-06-01")
		if res.Code != 200 || !strings.Contains(res.Body.String(), "PASSTHROUGH_OK") || !strings.Contains(res.Body.String(), "claude-haiku-4-5") {
			t.Fatalf("HTTP%d %s", res.Code, res.Body.String())
		}
		got := since(n)
		if len(got) != 2 || str(got[1].body, "model") != "claude-haiku-4-5" || fmt.Sprint(got[1].body["max_tokens"]) != "300" || fmt.Sprint(got[1].body["temperature"]) != "0.2" {
			t.Fatalf("attempts: %d", len(got))
		}
		if _, exists := got[0].body["fallbacks"]; exists {
			t.Error("fallbacks sent upstream")
		}
	})

	t.Run("subagent identity and resume", func(t *testing.T) {
		n := start(func(w http.ResponseWriter, body Object, _ int) {
			history, _ := json.Marshal(body["messages"])
			if bytes.Contains(history, []byte("SUB_RESULT")) {
				writeSurfaceFixture(w, str(body, "model"), []Object{{"type": "text", "text": "PASSTHROUGH_OK"}})
				return
			}
			writeSurfaceFixture(w, str(body, "model"), []Object{{"type": "tool_use", "id": "toolu_sub", "name": "mcp__ccgateway__lookup", "input": Object{"key": "k"}}})
		})
		body := Object{"model": "claude-sonnet-4-6", "max_tokens": 512, "tools": []any{lookup}, "messages": []any{Object{"role": "user", "content": "SUBAGENT"}}}
		res := post(t, body, "passthrough-sub", "a0123456789abcdef")
		if res.Code != 200 || !strings.Contains(res.Body.String(), "toolu_sub") {
			t.Fatalf("HTTP%d %s", res.Code, res.Body.String())
		}
		body["messages"] = append(body["messages"].([]any),
			Object{"role": "assistant", "content": []any{Object{"type": "tool_use", "id": "toolu_sub", "name": "lookup", "input": Object{"key": "k"}}}},
			Object{"role": "user", "content": []any{Object{"type": "tool_result", "tool_use_id": "toolu_sub", "content": "SUB_RESULT"}}})
		res = post(t, body, "passthrough-sub", "a0123456789abcdef")
		if res.Code != 200 || !strings.Contains(res.Body.String(), "PASSTHROUGH_OK") {
			t.Fatalf("HTTP%d %s", res.Code, res.Body.String())
		}
		// The branch file under its own ID resumes under U.
		if mode := res.Header().Get("X-CCGateway-History"); mode != "prefix-hit" {
			t.Fatalf("history %q, want prefix-hit", mode)
		}
		branch, _ := newSessionBranch(&Request{Plan: &RequestPlan{metadata: json.RawMessage(`{"user_id":"passthrough-sub"}`)}}, http.Header{"X-Claude-Code-Agent-Id": []string{"a0123456789abcdef"}})
		got := since(n)
		if len(got) != 2 {
			t.Fatalf("%d upstream requests", len(got))
		}
		for i, wire := range got {
			if agents := wire.header.Values("X-Claude-Code-Agent-Id"); len(agents) != 1 || agents[0] != branch.UpstreamAgent {
				t.Errorf("round %d agent IDs %v, want [%s]", i, agents, branch.UpstreamAgent)
			}
			if wire.header.Get("X-Claude-Code-Session-Id") != branch.Upstream || sessionOf(t, wire) != branch.Upstream {
				t.Errorf("round %d session %q, want U %q", i, wire.header.Get("X-Claude-Code-Session-Id"), branch.Upstream)
			}
			if bytes.Contains(wire.raw, []byte("a0123456789abcdef")) || bytes.Contains(wire.raw, []byte("passthrough-sub")) {
				t.Errorf("round %d leaks the client identity", i)
			}
		}
	})

	t.Run("pending image unchanged", func(t *testing.T) {
		// A 1x1 PNG.
		const png = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg=="
		image := Object{"type": "image", "source": Object{"type": "base64", "media_type": "image/png", "data": png}}
		for _, c := range []struct {
			name, session string
			messages      []any
		}{
			{"first turn", "", []any{Object{"role": "user", "content": []any{image, Object{"type": "text", "text": "IMAGE_FIRST"}}}}},
			{"history", "passthrough-image", []any{Object{"role": "user", "content": "hello"}, Object{"role": "assistant", "content": "hi"}, Object{"role": "user", "content": []any{Object{"type": "text", "text": "look"}, image, Object{"type": "text", "text": "IMAGE_LATER"}}}}},
		} {
			n := start(text)
			res := post(t, Object{"model": "claude-sonnet-4-6", "max_tokens": 128, "messages": c.messages}, c.session, "")
			if res.Code != 200 {
				t.Fatalf("%s: HTTP%d %s", c.name, res.Code, res.Body.String())
			}
			got := since(n)
			if len(got) != 1 {
				t.Fatalf("%s: %d upstream requests", c.name, len(got))
			}
			if bytes.Contains(got[0].raw, []byte("[Image: source:")) || !bytes.Contains(got[0].raw, []byte(png)) {
				t.Fatalf("%s: image changed by input processing: %s", c.name, got[0].raw)
			}
			messages := got[0].body["messages"].([]any)
			last := messages[len(messages)-1].(map[string]any)
			content, _ := last["content"].([]any)
			var kinds []string
			for _, block := range content {
				if kind := str(block.(map[string]any), "type"); kind != "text" || !strings.HasPrefix(str(block.(map[string]any), "text"), "<system-reminder>") {
					kinds = append(kinds, kind)
				}
			}
			want := "image,text"
			if c.name == "history" {
				want = "text,image,text"
			}
			if strings.Join(kinds, ",") != want {
				t.Fatalf("%s: last user message blocks %v, want %s", c.name, kinds, want)
			}
		}
	})

	t.Run("refused", func(t *testing.T) {
		n := start(text)
		for name, body := range map[string]Object{
			"prefill":     {"model": "claude-sonnet-4-6", "max_tokens": 64, "messages": []any{Object{"role": "user", "content": "x"}, Object{"role": "assistant", "content": "partial"}}},
			"web_fetch":   {"model": "claude-sonnet-4-6", "max_tokens": 64, "tools": []any{Object{"type": "web_fetch_20250910", "name": "web_fetch"}}, "messages": []any{Object{"role": "user", "content": "x"}}},
			"mcp_servers": {"model": "claude-sonnet-4-6", "max_tokens": 64, "mcp_servers": []any{Object{"type": "url", "url": "https://mcp.example.invalid/sse", "name": "fixture"}}, "messages": []any{Object{"role": "user", "content": "x"}}},
		} {
			if res := post(t, body, "", ""); res.Code != 400 || !strings.Contains(res.Body.String(), "not supported") {
				t.Errorf("%s: HTTP%d %s", name, res.Code, res.Body.String())
			}
		}
		raw, _ := json.Marshal(Object{"model": "claude-sonnet-4-6", "messages": []any{Object{"role": "user", "content": "x"}}})
		req := httptest.NewRequest("POST", "/v1/messages/count_tokens", bytes.NewReader(raw))
		req.Header.Set(policyHeader, `{"relay_mode":"passthrough"}`)
		res := httptest.NewRecorder()
		g.ServeHTTP(res, req)
		if res.Code != 400 {
			t.Errorf("count_tokens: HTTP%d", res.Code)
		}
		if got := since(n); len(got) != 0 {
			t.Fatalf("%d upstream requests for refused requests", len(got))
		}
	})
}

// normalizeJSON gives numbers one representation for comparison.
func normalizeJSON(t *testing.T, v any) any {
	raw, _ := json.Marshal(v)
	var out any
	if err := json.Unmarshal(raw, &out); err != nil {
		t.Fatal(err)
	}
	return out
}
