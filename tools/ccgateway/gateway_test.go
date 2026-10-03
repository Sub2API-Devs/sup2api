package main

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
	"sync"
	"testing"
	"time"
)

func parsed(t *testing.T, v any) *Request {
	t.Helper()
	b, _ := json.Marshal(v)
	r, e := parseRequest(b)
	if e != nil {
		t.Fatal(e)
	}
	return r
}
func basic() Object {
	return Object{"model": "claude-sonnet-4-6", "max_tokens": 128, "system": "Test system body", "messages": []any{Object{"role": "user", "content": "Earlier question"}, Object{"role": "assistant", "content": "Earlier answer"}, Object{"role": "user", "content": "Next question"}}}
}
func TestValidation(t *testing.T) {
	cases := []struct {
		name  string
		patch func(Object)
	}{
		{"unknown", func(v Object) { v["temperature"] = 0.5 }},
		{"unpaired", func(v Object) {
			v["messages"] = []any{Object{"role": "user", "content": []any{Object{"type": "tool_result", "tool_use_id": "missing", "content": "x"}}}}
		}},
		{"prefill", func(v Object) { v["messages"] = []any{Object{"role": "assistant", "content": "hello"}} }},
		{"tool-choice", func(v Object) { v["tool_choice"] = Object{"type": "any"} }},
		{"bad-ttl", func(v Object) { v["cache_control"] = Object{"type": "ephemeral", "ttl": "2h"} }},
	}
	for _, c := range cases {
		t.Run(c.name, func(t *testing.T) {
			v := basic()
			c.patch(v)
			b, _ := json.Marshal(v)
			if _, e := parseRequest(b); e == nil {
				t.Fatal("accepted invalid request")
			}
		})
	}
	v := basic()
	v["cache_control"] = Object{"type": "ephemeral", "ttl": "1h"}
	if parsed(t, v).TTL != time.Hour {
		t.Fatal("TTL not extracted")
	}
}
func TestHistorySnapshotAndToolPair(t *testing.T) {
	dir := t.TempDir()
	cache, e := newCache(filepath.Join(dir, "cache"), 8<<20)
	if e != nil {
		t.Fatal(e)
	}
	r := parsed(t, basic())
	p, e := prepareHistory(r, cache, "logical", dir, "2.1.288")
	if e != nil {
		t.Fatal(e)
	}
	content := []Object{{"type": "tool_use", "id": "toolu_one", "name": "weather", "input": Object{"city": "Paris"}}}
	answer := Object{"content": content}
	if e = p.commit(r, answer, cache, "logical", dir, "2.1.288", time.Now()); e != nil {
		t.Fatal(e)
	}
	r.Messages = append(r.Messages, Message{"assistant", content}, Message{"user", []Object{{"type": "tool_result", "tool_use_id": "toolu_one", "content": "sunny"}}})
	p2, e := prepareHistory(r, cache, "logical", dir, "2.1.288")
	if e != nil {
		t.Fatal(e)
	}
	if p2.Mode != "prefix-hit" {
		t.Fatal(p2.Mode)
	}
	b, _ := os.ReadFile(p2.Path)
	if !bytes.Contains(b, []byte("tool_result")) || !bytes.Contains(b, []byte("mcp__messages__weather")) {
		t.Fatal("complete tool pair missing from recovery file")
	}
	if p2.Anchor == p2.LastUUID {
		t.Fatal("must replay final user after assistant anchor")
	}
	r.Messages[0].Content[0]["text"] = "Changed"
	p3, e := prepareHistory(r, cache, "logical", dir, "2.1.288")
	if e != nil {
		t.Fatal(e)
	}
	if p3.Mode != "rebuild" {
		t.Fatal("modified history incorrectly reused")
	}
	reloaded, e := newCache(filepath.Join(dir, "cache"), 8<<20)
	if e != nil || len(reloaded.entries) != 1 {
		t.Fatalf("persistent cache: %v %d", e, len(reloaded.entries))
	}
}
func TestStreamRejectsTruncationAndUndeclaredTools(t *testing.T) {
	r := parsed(t, basic())
	a := &Accumulator{}
	if e := a.push(Object{"type": "message_start", "message": Object{"id": "msg_x", "role": "assistant"}}, r); e != nil {
		t.Fatal(e)
	}
	if e := a.push(Object{"type": "message_stop"}, r); e == nil {
		t.Fatal("accepted truncated response")
	}
	if e := a.push(Object{"type": "content_block_start", "index": 0, "content_block": Object{"type": "tool_use", "name": "Bash", "id": "toolu_x", "input": Object{}}}, r); e == nil {
		t.Fatal("accepted undeclared tool")
	}
}
func TestPermissionCallbacksAlwaysDeny(t *testing.T) {
	r := parsed(t, basic())
	f := controlReply(Object{"type": "control_request", "request_id": "x", "request": Object{"subtype": "can_use_tool", "tool_name": "Read", "tool_use_id": "a"}}, r)
	b, _ := json.Marshal(f)
	if !bytes.Contains(b, []byte(`"behavior":"deny"`)) {
		t.Fatal(string(b))
	}
}

func TestHTTPAdmission(t *testing.T) {
	g := &Gateway{Key: "secret", Runner: &Runner{}, Slots: make(chan struct{}, 1), NativeAllowed: map[string]bool{"Read": true}}
	b, _ := json.Marshal(basic())
	cases := []struct {
		name, key, native string
		status            int
	}{{"unauthorized", "wrong", "", 401}, {"forbidden native", "secret", "Bash", 400}, {"undeclared native", "secret", "Read", 400}, {"capacity", "secret", "", 429}}
	g.Slots <- struct{}{}
	for _, c := range cases {
		t.Run(c.name, func(t *testing.T) {
			req := httptest.NewRequest("POST", "/v1/messages", bytes.NewReader(b))
			req.Header.Set("x-api-key", c.key)
			req.Header.Set("X-CCGateway-Native-Tools", c.native)
			w := httptest.NewRecorder()
			g.ServeHTTP(w, req)
			if w.Code != c.status {
				t.Fatalf("got %d: %s", w.Code, w.Body.String())
			}
		})
	}
}

func TestCacheExpiryAndCanonicalKeys(t *testing.T) {
	a := Message{"assistant", []Object{{"type": "tool_use", "id": "x", "name": "test", "input": Object{"a": 1, "b": 2}}}}
	b := Message{"assistant", []Object{{"input": Object{"b": 2, "a": 1}, "name": "test", "id": "x", "type": "tool_use"}}}
	if fingerprints([]Message{a})[0] != fingerprints([]Message{b})[0] {
		t.Fatal("object key order affected fingerprint")
	}
	c, e := newCache(t.TempDir(), 1<<20)
	if e != nil {
		t.Fatal(e)
	}
	k := digest("expired")
	s := &Snapshot{Rows: []json.RawMessage{json.RawMessage(`{}`)}, Hashes: []string{"h"}, LastUUID: "a", Expires: time.Now().Add(-time.Second)}
	if e = c.put(k, s); e != nil {
		t.Fatal(e)
	}
	if c.get(k) != nil {
		t.Fatal("expired snapshot reused")
	}
}

// Opt in with CCG_REAL_CLI=<absolute executable path>. All inference goes to
// the local fixture with dummy credentials and a private configuration dir.
func TestRealCLI(t *testing.T) {
	cli := os.Getenv("CCG_REAL_CLI")
	if cli == "" {
		t.Skip("set CCG_REAL_CLI for isolated real CLI test")
	}
	root := t.TempDir()
	plugin, e := extractMod(root)
	if e != nil {
		t.Fatal(e)
	}
	version, e := checkVersion(cli)
	if e != nil {
		t.Fatal(e)
	}
	var mu sync.Mutex
	var requests []Object
	fake := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.Method != "POST" || !strings.HasSuffix(r.URL.Path, "/messages") {
			w.Header().Set("Content-Type", "application/json")
			fmt.Fprint(w, `{"input_tokens":20}`)
			return
		}
		b, _ := io.ReadAll(r.Body)
		v, e := decodeObject(b)
		if e != nil {
			http.Error(w, "bad", 400)
			return
		}
		mu.Lock()
		requests = append(requests, v)
		captureIndex := len(requests)
		mu.Unlock()
		if capture := os.Getenv("CCG_CAPTURE_DIR"); capture != "" {
			if err := os.MkdirAll(capture, 0700); err != nil {
				t.Error(err)
			}
			encoded, _ := json.MarshalIndent(v, "", "  ")
			if err := os.WriteFile(filepath.Join(capture, fmt.Sprintf("request-%02d.json", captureIndex)), encoded, 0600); err != nil {
				t.Error(err)
			}
		}
		ms, _ := v["messages"].([]any)
		last, _ := ms[len(ms)-1].(map[string]any)
		raw, _ := json.Marshal(last)
		content := []Object{{"type": "text", "text": "fixture answer"}}
		if bytes.Contains(raw, []byte("CALL_TOOL")) && !bytes.Contains(raw, []byte("tool_result")) {
			tools, _ := v["tools"].([]any)
			name := ""
			for _, x := range tools {
				tool, _ := x.(map[string]any)
				if str(tool, "name") == "mcp__messages__weather" || str(tool, "name") == "Read" {
					name = str(tool, "name")
					break
				}
			}
			if name == "" {
				http.Error(w, "expected tool missing", 500)
				return
			}
			input := Object{"city": "Paris"}
			if name == "Read" {
				input = Object{"file_path": filepath.Join(root, "does-not-exist.txt")}
			}
			content = []Object{{"type": "tool_use", "id": "toolu_fixture", "name": name, "input": input, "caller": Object{"type": "direct"}}}
		}
		w.Header().Set("Content-Type", "text/event-stream")
		event := func(v Object) {
			b, _ := json.Marshal(v)
			fmt.Fprintf(w, "event: %s\ndata: %s\n\n", str(v, "type"), b)
			if f, ok := w.(http.Flusher); ok {
				f.Flush()
			}
		}
		event(Object{"type": "message_start", "message": Object{"id": "msg_fixture", "type": "message", "role": "assistant", "model": v["model"], "content": []any{}, "stop_reason": nil, "stop_sequence": nil, "usage": Object{"input_tokens": 20, "output_tokens": 0}}})
		stop := "end_turn"
		for i, b := range content {
			start := Object{}
			for k, v := range b {
				start[k] = v
			}
			var delta Object
			if str(b, "type") == "tool_use" {
				stop = "tool_use"
				start["input"] = Object{}
				s, _ := json.Marshal(b["input"])
				delta = Object{"type": "input_json_delta", "partial_json": string(s)}
			} else {
				start["text"] = ""
				delta = Object{"type": "text_delta", "text": b["text"]}
			}
			event(Object{"type": "content_block_start", "index": i, "content_block": start})
			event(Object{"type": "content_block_delta", "index": i, "delta": delta})
			event(Object{"type": "content_block_stop", "index": i})
		}
		event(Object{"type": "message_delta", "delta": Object{"stop_reason": stop, "stop_sequence": nil}, "usage": Object{"output_tokens": 8}})
		event(Object{"type": "message_stop"})
	}))
	defer fake.Close()
	baseEnv := []string{}
	for _, k := range []string{"PATH", "SystemRoot", "WINDIR", "COMSPEC", "TEMP", "TMP", "PATHEXT", "APPDATA", "LOCALAPPDATA"} {
		if v := os.Getenv(k); v != "" {
			baseEnv = append(baseEnv, k+"="+v)
		}
	}
	env := envWith(baseEnv, map[string]string{"HOME": root, "USERPROFILE": root, "CLAUDE_CONFIG_DIR": filepath.Join(root, "config"), "ANTHROPIC_API_KEY": "dummy-local-fixture", "ANTHROPIC_BASE_URL": fake.URL, "CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC": "1"})
	runner := &Runner{CLI: cli, Version: version, Plugin: plugin, Work: root, Env: env}
	cache, e := newCache(filepath.Join(root, "cache"), 32<<20)
	if e != nil {
		t.Fatal(e)
	}
	gateway := httptest.NewServer(&Gateway{Runner: runner, Cache: cache, Timeout: 45 * time.Second, Slots: make(chan struct{}, 2), NativeAllowed: map[string]bool{"Read": true}})
	defer gateway.Close()
	post := func(v Object, native string) (Object, string, http.Header) {
		t.Helper()
		b, _ := json.Marshal(v)
		ctx, cancel := context.WithTimeout(context.Background(), 50*time.Second)
		defer cancel()
		req, _ := http.NewRequestWithContext(ctx, "POST", gateway.URL+"/v1/messages", bytes.NewReader(b))
		req.Header.Set("Content-Type", "application/json")
		req.Header.Set("X-CCGateway-Session-ID", "test-session")
		req.Header.Set("X-CCGateway-Native-Tools", native)
		resp, e := http.DefaultClient.Do(req)
		if e != nil {
			t.Fatal(e)
		}
		defer resp.Body.Close()
		out, _ := io.ReadAll(resp.Body)
		if resp.StatusCode != 200 {
			t.Fatalf("HTTP %d: %s", resp.StatusCode, out)
		}
		var obj Object
		_ = json.Unmarshal(out, &obj)
		return obj, string(out), resp.Header
	}
	answer, _, _ := post(basic(), "")
	if str(answer, "stop_reason") != "end_turn" {
		t.Fatalf("bad answer: %v", answer)
	}
	mu.Lock()
	first := requests[0]
	mu.Unlock()
	ms := first["messages"].([]any)
	if len(ms) != 3 {
		t.Fatalf("expected 3 messages, got %d", len(ms))
	}
	for i, role := range []string{"user", "assistant", "user"} {
		m := ms[i].(map[string]any)
		if str(m, "role") != role {
			t.Fatal("roles changed")
		}
	}
	tools, _ := first["tools"].([]any)
	if len(tools) != 0 {
		t.Fatalf("unexpected tools: %v", tools)
	}
	sys, _ := json.Marshal(first["system"])
	if !bytes.Contains(sys, []byte("Test system body")) {
		t.Fatal("system body missing")
	}
	user := Object{"role": "user", "content": "CALL_TOOL"}
	tool := Object{"name": "weather", "description": "Weather", "input_schema": Object{"type": "object", "properties": Object{"city": Object{"type": "string"}}, "required": []string{"city"}}}
	v := basic()
	v["messages"] = []any{user}
	v["tools"] = []any{tool}
	answer, _, _ = post(v, "")
	if str(answer, "stop_reason") != "tool_use" {
		t.Fatal(answer)
	}
	bs := answer["content"].([]any)
	if str(bs[0].(map[string]any), "name") != "weather" {
		t.Fatal("name not restored")
	}
	v["messages"] = []any{user, Object{"role": "assistant", "content": bs}, Object{"role": "user", "content": []any{Object{"type": "tool_result", "tool_use_id": "toolu_fixture", "content": "sunny"}}}}
	_, _, headers := post(v, "")
	if headers.Get("X-CCGateway-History") != "prefix-hit" {
		t.Fatal("tool history cache missed")
	}
	mu.Lock()
	up := requests[len(requests)-1]
	mu.Unlock()
	b, _ := json.Marshal(up["messages"])
	if !bytes.Contains(b, []byte("sunny")) || !bytes.Contains(b, []byte("toolu_fixture")) {
		t.Fatal("tool results lost")
	}
	stream := basic()
	stream["stream"] = true
	_, s, _ := post(stream, "")
	if !strings.Contains(s, "event: message_stop") || strings.Contains(s, "event: error") {
		t.Fatal(s)
	}
	native := basic()
	native["messages"] = []any{user}
	native["tools"] = []any{Object{"name": "Read", "input_schema": Object{"type": "object", "properties": Object{"file_path": Object{"type": "string"}}, "required": []string{"file_path"}}}}
	answer, _, _ = post(native, "Read")
	if str(answer, "stop_reason") != "tool_use" {
		t.Fatal(answer)
	}
	mu.Lock()
	nativeUp := requests[len(requests)-1]
	mu.Unlock()
	nativeTools, _ := nativeUp["tools"].([]any)
	if len(nativeTools) != 1 || str(nativeTools[0].(map[string]any), "name") != "Read" {
		t.Fatalf("native whitelist leaked tools: %v", nativeTools)
	}

	// Returning a native result on the next HTTP request must restore the
	// client result, never the Mod's internal denial from the previous process.
	nativeContent := answer["content"].([]any)
	native["messages"] = []any{user, Object{"role": "assistant", "content": nativeContent}, Object{"role": "user", "content": []any{Object{"type": "tool_result", "tool_use_id": "toolu_fixture", "content": "CLIENT_FILE_CONTENT"}}}}
	_, _, headers = post(native, "Read")
	if headers.Get("X-CCGateway-History") != "prefix-hit" {
		t.Fatal("native tool cache missed")
	}
	mu.Lock()
	nativeResult := requests[len(requests)-1]
	mu.Unlock()
	nativeBody, _ := json.Marshal(nativeResult["messages"])
	if !bytes.Contains(nativeBody, []byte("CLIENT_FILE_CONTENT")) || bytes.Contains(nativeBody, []byte("execution belongs")) {
		t.Fatal("native result replaced or polluted")
	}
	native["tool_choice"] = Object{"type": "none"}
	native["messages"] = []any{Object{"role": "user", "content": "No tools"}}
	post(native, "Read")
	// A cancelled request must terminate its child without starting inference.
	dir := t.TempDir()
	cancelReq := parsed(t, basic())
	prepared, err := prepareHistory(cancelReq, cache, "cancel-test", dir, version)
	if err != nil {
		t.Fatal(err)
	}
	cancelCtx, cancel := context.WithCancel(context.Background())
	cancel()
	if _, err = runner.run(cancelCtx, cancelReq, prepared, dir, func(Object) error { return nil }); err == nil {
		t.Fatal("cancelled request succeeded")
	}
	mu.Lock()
	if len(requests) != 7 {
		t.Fatalf("expected 7 model requests, got %d", len(requests))
	}
	last := requests[len(requests)-1]
	mu.Unlock()
	if ts, _ := last["tools"].([]any); len(ts) != 0 {
		t.Fatalf("tool_choice none exposed tools: %v", ts)
	}
	if os.Getenv("CCG_CAPTURE_DIR") != "" {
		hi := Object{"model": "claude-sonnet-4-6", "max_tokens": 128, "messages": []any{Object{"role": "user", "content": "hi"}}}
		post(hi, "")
		hi["system"] = "Respond concisely in Chinese. Follow the requested exact output format."
		post(hi, "")
	}
	mu.Lock()
	requestCount := len(requests)
	mu.Unlock()
	t.Logf("Claude Code %s: %d local model requests, 0 cloud model calls; history, system, MCP/native roundtrip, SSE, native whitelist and none passed", version, requestCount)
}
