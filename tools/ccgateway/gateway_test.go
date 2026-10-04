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
	row, id := transcriptRow(r.wireMessage(Message{"assistant", content}), p.LastUUID, p.SessionID, p.Work, "2.1.288", r.Model)
	p.NativeRows = append(p.Rows, row)
	p.NativeAnchor = id
	p.NativePath = filepath.Join(dir, "native.jsonl")
	if e = writeNative(p.NativePath, p.NativeRows); e != nil {
		t.Fatal(e)
	}
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
	defer p2.release()
	concurrent, err := prepareHistory(r, cache, "logical", t.TempDir(), "2.1.288")
	if err != nil {
		t.Fatal(err)
	}
	defer concurrent.release()
	if !concurrent.Fork || concurrent.SessionID == p2.SessionID {
		t.Fatal("concurrent branches share a native writer")
	}
	b, _ := os.ReadFile(p2.Path)
	if !bytes.Contains(b, []byte("tool_result")) || !bytes.Contains(b, []byte("mcp__ccgateway__weather")) {
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
		if (bytes.Contains(raw, []byte("CALL_TOOL")) || bytes.Contains(raw, []byte("CALL_PARALLEL"))) && !bytes.Contains(raw, []byte("tool_result")) {
			tools, _ := v["tools"].([]any)
			name := ""
			for _, x := range tools {
				tool, _ := x.(map[string]any)
				if str(tool, "name") == "mcp__ccgateway__weather" || str(tool, "name") == "Read" || str(tool, "name") == "mcp__ccgateway__Read" {
					name = str(tool, "name")
					break
				}
			}
			if name == "" {
				http.Error(w, "expected tool missing", 500)
				return
			}
			input := Object{"city": "Paris"}
			if name == "Read" || name == "mcp__ccgateway__Read" {
				input = Object{"file_path": filepath.Join(root, "does-not-exist.txt")}
			}
			content = []Object{{"type": "tool_use", "id": "toolu_fixture", "name": name, "input": input, "caller": Object{"type": "direct"}}}
			if name == "mcp__ccgateway__Read" {
				content[0]["id"] = fmt.Sprintf("toolu_custom_read_%d", captureIndex)
			}
			if bytes.Contains(raw, []byte("CALL_PARALLEL")) {
				content = append(content, Object{"type": "tool_use", "id": "toolu_parallel", "name": name, "input": input})
			}
		}
		if bytes.Contains(raw, []byte("SDK_MIXED_CALL")) && !bytes.Contains(raw, []byte("tool_result")) {
			content = nil
			for i, name := range []string{"mcp__files__lookup", "mcp__other__lookup", "mcp__ccgateway__foo", "mcp__ccgateway__bar"} {
				content = append(content, Object{"type": "tool_use", "id": fmt.Sprintf("toolu_sdk_%d_%d", captureIndex, i), "name": name, "input": Object{"query": "fixture"}})
			}
		}
		w.Header().Set("Content-Type", "text/event-stream")
		event := func(v Object) {
			b, _ := json.Marshal(v)
			fmt.Fprintf(w, "event: %s\ndata: %s\n\n", str(v, "type"), b)
			if f, ok := w.(http.Flusher); ok {
				f.Flush()
			}
		}
		event(Object{"type": "message_start", "message": Object{"id": fmt.Sprintf("msg_fixture_%d", captureIndex), "type": "message", "role": "assistant", "model": v["model"], "content": []any{}, "stop_reason": nil, "stop_sequence": nil, "usage": Object{"input_tokens": 20, "output_tokens": 0}}})
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
		if bytes.Contains(raw, []byte("OUTPUT_LIMIT")) {
			stop = "max_tokens"
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
	sessionHeader, scopeHeader := "test-session", ""
	post := func(v Object, native string) (Object, string, http.Header) {
		t.Helper()
		b, _ := json.Marshal(v)
		ctx, cancel := context.WithTimeout(context.Background(), 50*time.Second)
		defer cancel()
		req, _ := http.NewRequestWithContext(ctx, "POST", gateway.URL+"/v1/messages", bytes.NewReader(b))
		req.Header.Set("Content-Type", "application/json")
		req.Header.Set("X-CCGateway-Session-ID", sessionHeader)
		req.Header.Set("X-CCGateway-Session-Scope", scopeHeader)
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
	// A restored prefix must match what the CLI actually sent. Request-local
	// environment/model/date reminders used to move into each new user turn,
	// invalidating provider caching even when our transcript was a prefix-hit.
	mu.Lock()
	toolFirst := requests[1]
	mu.Unlock()
	firstMessage := toolFirst["messages"].([]any)[0].(map[string]any)
	resumedMessage := up["messages"].([]any)[0].(map[string]any)
	firstBlocks := firstMessage["content"].([]any)
	resumedBlocks := resumedMessage["content"].([]any)
	for _, b := range firstBlocks {
		delete(b.(map[string]any), "cache_control")
	}
	for _, b := range resumedBlocks {
		delete(b.(map[string]any), "cache_control")
	}
	aPrefix, _ := json.Marshal(firstBlocks)
	bPrefix, _ := json.Marshal(resumedBlocks)
	if !bytes.Equal(aPrefix, bPrefix) || !bytes.Contains(aPrefix, []byte("CALL_TOOL")) {
		t.Fatal("CLI changed the cached user-message prefix")
	}
	lastMessage := up["messages"].([]any)[2].(map[string]any)
	resultBlock := lastMessage["content"].([]any)[0].(map[string]any)
	if !strings.Contains(str(resultBlock, "content"), "sunny") {
		t.Fatal("CLI added local context to the client tool result")
	}
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
	verifiedRead := verifiedNativeTools["Read"]
	native["tools"] = []any{verifiedRead}
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
	nativeDefinition := nativeTools[0].(map[string]any)
	if str(nativeDefinition, "description") != verifiedRead.Description || digest(nativeDefinition["input_schema"]) != digest(verifiedRead.Schema) {
		t.Fatal("actual native Read definition differs from verified catalogue")
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
	nativeHistory := append([]any(nil), native["messages"].([]any)...)
	native["tool_choice"] = Object{"type": "none"}
	native["messages"] = []any{Object{"role": "user", "content": "No tools"}}
	post(native, "Read")
	// Tools must remain correct beyond the immediate result round.
	v["messages"] = append(v["messages"].([]any), Object{"role": "assistant", "content": []any{Object{"type": "text", "text": "fixture answer"}}}, Object{"role": "user", "content": "AFTER_CLIENT_TOOL"})
	followAnswer, _, followHeaders := post(v, "")
	if followHeaders.Get("X-CCGateway-History") != "prefix-hit" {
		t.Fatal("tool follow-up did not resume")
	}
	mu.Lock()
	followBody, _ := json.Marshal(requests[len(requests)-1]["messages"])
	mu.Unlock()
	if !bytes.Contains(followBody, []byte("sunny")) || bytes.Contains(followBody, []byte("execution belongs")) {
		t.Fatal("old denial returned after tool continuation")
	}
	v["messages"] = append(v["messages"].([]any), Object{"role": "assistant", "content": followAnswer["content"]}, Object{"role": "user", "content": "TOOLS_REMOVED"})
	delete(v, "tools")
	_, _, removedHeaders := post(v, "")
	if removedHeaders.Get("X-CCGateway-History") != "prefix-hit" {
		t.Fatal("removing tools rebuilt history")
	}
	mu.Lock()
	removed := requests[len(requests)-1]
	mu.Unlock()
	removedBody, _ := json.Marshal(removed["messages"])
	if !bytes.Contains(removedBody, []byte("sunny")) || len(removed["tools"].([]any)) != 0 {
		t.Fatal("removing tools lost history or retained subscriptions")
	}

	delete(native, "tool_choice")
	native["messages"] = append(nativeHistory, Object{"role": "assistant", "content": []any{Object{"type": "text", "text": "fixture answer"}}}, Object{"role": "user", "content": "AFTER_NATIVE_TOOL"})
	nativeFollowAnswer, _, nativeFollow := post(native, "Read")
	if nativeFollow.Get("X-CCGateway-History") != "prefix-hit" {
		t.Fatal("native tool follow-up rebuilt")
	}
	mu.Lock()
	nativeFollowBody, _ := json.Marshal(requests[len(requests)-1]["messages"])
	mu.Unlock()
	if !bytes.Contains(nativeFollowBody, []byte("CLIENT_FILE_CONTENT")) || bytes.Contains(nativeFollowBody, []byte("execution belongs")) {
		t.Fatal("native tool result lost on later turn")
	}
	// A same-named declaration is custom if either description or schema
	// differs, even with explicit native opt-in. Results still belong to the client.
	for _, scenario := range []string{"description", "native-to-custom-schema"} {
		fallback := basic()
		customRead := verifiedRead
		fallback["messages"] = []any{Object{"role": "user", "content": "CALL_TOOL_CUSTOM_READ"}}
		if scenario == "description" {
			customRead.Description = "Client-owned Read implementation"
		} else {
			customRead.Schema = Object{"type": "object", "properties": Object{"file_path": Object{"type": "string", "description": "Client filesystem path"}}, "required": []string{"file_path"}}
			fallback["messages"] = append(append([]any(nil), native["messages"].([]any)...), Object{"role": "assistant", "content": nativeFollowAnswer["content"]}, Object{"role": "user", "content": "CALL_TOOL_CHANGED_SCHEMA"})
		}
		fallback["tools"] = []any{customRead}
		fallbackAnswer, _, fallbackHeaders := post(fallback, "Read")
		if scenario == "native-to-custom-schema" && fallbackHeaders.Get("X-CCGateway-History") != "prefix-hit" {
			t.Fatal("native-to-custom transition rebuilt history")
		}
		blocks, _ := fallbackAnswer["content"].([]any)
		if len(blocks) != 1 || str(blocks[0].(map[string]any), "name") != "Read" {
			t.Fatalf("custom fallback did not restore client tool name: %v", blocks)
		}
		mu.Lock()
		fallbackUpstream := requests[len(requests)-1]
		mu.Unlock()
		definitions, _ := fallbackUpstream["tools"].([]any)
		if len(definitions) != 1 || str(definitions[0].(map[string]any), "name") != "mcp__ccgateway__Read" {
			t.Fatalf("mismatched native definition did not use SDK tool: %v", definitions)
		}
		definition := definitions[0].(map[string]any)
		if str(definition, "description") != customRead.Description || digest(definition["input_schema"]) != digest(customRead.Schema) {
			t.Fatal("custom fallback changed the caller's definition")
		}
		fallback["messages"] = append(fallback["messages"].([]any), Object{"role": "assistant", "content": fallbackAnswer["content"]}, Object{"role": "user", "content": []any{Object{"type": "tool_result", "tool_use_id": blocks[0].(map[string]any)["id"], "content": "CUSTOM_READ_CLIENT_RESULT"}}})
		_, _, resultHeaders := post(fallback, "Read")
		if resultHeaders.Get("X-CCGateway-History") != "prefix-hit" {
			t.Fatal("custom Read result did not resume")
		}
		mu.Lock()
		resultBody, _ := json.Marshal(requests[len(requests)-1]["messages"])
		mu.Unlock()
		if !bytes.Contains(resultBody, []byte("CUSTOM_READ_CLIENT_RESULT")) || bytes.Contains(resultBody, []byte("execution belongs")) {
			t.Fatal("custom Read result lost or replaced with denial")
		}
		if scenario == "native-to-custom-schema" && !bytes.Contains(resultBody, []byte("CLIENT_FILE_CONTENT")) {
			t.Fatal("native-to-custom transition lost prior native tool result")
		}
	}
	parallel := basic()
	parallel["tools"] = []any{tool}
	parallel["messages"] = []any{Object{"role": "user", "content": "CALL_PARALLEL"}}
	parallelAnswer, _, _ := post(parallel, "")
	if len(parallelAnswer["content"].([]any)) != 2 {
		t.Fatal("parallel tool calls lost")
	}
	parallel["messages"] = append(parallel["messages"].([]any), Object{"role": "assistant", "content": parallelAnswer["content"]}, Object{"role": "user", "content": []any{Object{"type": "tool_result", "tool_use_id": "toolu_fixture", "content": "RESULT_ONE"}, Object{"type": "tool_result", "tool_use_id": "toolu_parallel", "content": "RESULT_TWO"}}})
	parallelAnswer, _, _ = post(parallel, "")
	parallel["messages"] = append(parallel["messages"].([]any), Object{"role": "assistant", "content": parallelAnswer["content"]}, Object{"role": "user", "content": "AFTER_PARALLEL"})
	_, _, _ = post(parallel, "")
	mu.Lock()
	parallelBody, _ := json.Marshal(requests[len(requests)-1]["messages"])
	mu.Unlock()
	if !bytes.Contains(parallelBody, []byte("RESULT_ONE")) || !bytes.Contains(parallelBody, []byte("RESULT_TWO")) || bytes.Contains(parallelBody, []byte("execution belongs")) {
		t.Fatalf("parallel results corrupted: %s", parallelBody)
	}
	// Changing system and MCP definitions must update the actual upstream request
	// while retaining the same native session and full client history.
	configReq := basic()
	configReq["messages"] = []any{Object{"role": "user", "content": "CONFIG_START"}}
	configReq["tools"] = []any{tool}
	configAnswer, _, _ := post(configReq, "")
	configReq["messages"] = append(configReq["messages"].([]any), Object{"role": "assistant", "content": configAnswer["content"]}, Object{"role": "user", "content": "CONFIG_NEXT"})
	lookup := func(v Object) *Snapshot {
		rr := parsed(t, v)
		hh := fingerprints(rr.Messages)
		return cache.get(cacheKey(digest([]string{"", "test-session"}), "", hh[len(hh)-2]))
	}
	beforeConfig := lookup(configReq)
	configReq["system"] = "NEW_SYSTEM_BODY"
	configReq["tools"] = []any{Object{"name": "weather_v2", "description": "new definition", "input_schema": Object{"type": "object", "properties": Object{}}}}
	configAnswer, _, configHeaders := post(configReq, "")
	if configHeaders.Get("X-CCGateway-History") != "prefix-hit" {
		t.Fatal("configuration change rebuilt history")
	}
	mu.Lock()
	changed := requests[len(requests)-1]
	mu.Unlock()
	systemJSON, _ := json.Marshal(changed["system"])
	toolsJSON, _ := json.Marshal(changed["tools"])
	if !bytes.Contains(systemJSON, []byte("NEW_SYSTEM_BODY")) || bytes.Contains(systemJSON, []byte("Test system body")) || !bytes.Contains(toolsJSON, []byte("weather_v2")) {
		t.Fatal("resume ignored current system or MCP tools")
	}
	parentMessages := append([]any(nil), configReq["messages"].([]any)...)
	configReq["messages"] = append(configReq["messages"].([]any), Object{"role": "assistant", "content": configAnswer["content"]}, Object{"role": "user", "content": "LATEST_BRANCH"})
	afterConfig := lookup(configReq)
	if beforeConfig == nil || afterConfig == nil || beforeConfig.SessionID != afterConfig.SessionID {
		t.Fatal("normal continuation changed native session")
	}
	restarted, err := newCache(cache.dir, 32<<20)
	if err != nil {
		t.Fatal(err)
	}
	cache.mu.Lock()
	cache.entries = restarted.entries
	cache.bytes = restarted.bytes
	cache.mu.Unlock()
	configAnswer, _, restartHeaders := post(configReq, "")
	if restartHeaders.Get("X-CCGateway-History") != "prefix-hit" {
		t.Fatal("restart did not restore native history")
	}
	// Branch from the first answer, preserving the existing main transcript.
	mainFile, _ := os.ReadFile(afterConfig.NativePath)
	branch := basic()
	branch["messages"] = append(parentMessages[:2:2], Object{"role": "user", "content": "ALTERNATE_BRANCH"})
	_, _, branchHeaders := post(branch, "")
	if branchHeaders.Get("X-CCGateway-History") != "fork" {
		t.Fatal("older node did not fork")
	}
	currentFile, _ := os.ReadFile(afterConfig.NativePath)
	if !bytes.Equal(mainFile, currentFile) {
		t.Fatal("fork changed parent transcript")
	}
	mu.Lock()
	branchBody, _ := json.Marshal(requests[len(requests)-1]["messages"])
	mu.Unlock()
	if bytes.Contains(branchBody, []byte("CONFIG_NEXT")) || bytes.Contains(branchBody, []byte("LATEST_BRANCH")) {
		t.Fatal("fork included later parent messages")
	}
	// Editing the middle imports only the suffix after the common native node.
	encoded, _ := json.Marshal(configReq)
	edited, _ := decodeObject(encoded)
	edited["messages"].([]any)[2].(map[string]any)["content"] = "EDITED_MIDDLE"
	_, _, editedHeaders := post(edited, "")
	if editedHeaders.Get("X-CCGateway-History") != "fork" {
		t.Fatal("middle edit did not fork")
	}
	mu.Lock()
	editedBody, _ := json.Marshal(requests[len(requests)-1]["messages"])
	mu.Unlock()
	if !bytes.Contains(editedBody, []byte("EDITED_MIDDLE")) || bytes.Contains(editedBody, []byte("CONFIG_NEXT")) {
		t.Fatal("middle edit restored stale history")
	}
	edited["messages"].([]any)[0].(map[string]any)["content"] = "FIRST_CHANGED"
	_, _, rebuiltHeaders := post(edited, "")
	if rebuiltHeaders.Get("X-CCGateway-History") != "rebuild" {
		t.Fatal("unrelated history reused old session")
	}
	// Reuse the same MCP name while changing its schema: checking only names
	// would miss a stale native prompt snapshot restoring the old definition.
	schemaReq := basic()
	schemaReq["messages"] = []any{Object{"role": "user", "content": "SCHEMA_START"}}
	for i, schemaType := range []string{"string", "number", "number"} {
		schemaReq["tools"] = []any{Object{"name": "weather", "description": "Weather", "input_schema": Object{"type": "object", "properties": Object{"city": Object{"type": schemaType}}, "required": []string{"city"}}}}
		schemaAnswer, _, schemaHeaders := post(schemaReq, "")
		if i > 0 && schemaHeaders.Get("X-CCGateway-History") != "prefix-hit" {
			t.Fatal("MCP schema update rebuilt the native session")
		}
		mu.Lock()
		upstreamTools, _ := requests[len(requests)-1]["tools"].([]any)
		mu.Unlock()
		found := false
		for _, rawTool := range upstreamTools {
			definition, _ := rawTool.(map[string]any)
			if str(definition, "name") != "mcp__ccgateway__weather" {
				continue
			}
			found = true
			schema, _ := definition["input_schema"].(map[string]any)
			properties, _ := schema["properties"].(map[string]any)
			city, _ := properties["city"].(map[string]any)
			if str(city, "type") != schemaType {
				t.Fatalf("MCP schema turn %d retained stale city type: %v", i, city)
			}
		}
		if !found {
			t.Fatal("MCP tool disappeared after schema update")
		}
		schemaReq["messages"] = append(schemaReq["messages"].([]any), Object{"role": "assistant", "content": schemaAnswer["content"]}, Object{"role": "user", "content": fmt.Sprintf("SCHEMA_NEXT_%d", i)})
	}
	// Enabling an unchanged A snapshot must not cause A to reappear on the
	// second B request. Compare the actual upstream prompt on every turn.
	promptReq := basic()
	promptReq["messages"] = []any{Object{"role": "user", "content": "SNAPSHOT_START"}}
	for i, step := range []struct {
		system  string
		enabled bool
	}{{"SNAPSHOT_SYSTEM_A", false}, {"SNAPSHOT_SYSTEM_A", true}, {"SNAPSHOT_SYSTEM_B", false}, {"SNAPSHOT_SYSTEM_B", false}} {
		promptReq["system"] = step.system
		preparedPrompt, err := prepareHistory(parsed(t, promptReq), cache, digest([]string{"", "test-session"}), t.TempDir(), version)
		if err != nil {
			t.Fatal(err)
		}
		enabled := preparedPrompt.SnapshotEnabled
		preparedPrompt.release()
		if enabled != step.enabled {
			t.Fatalf("prompt turn %d snapshot enabled=%v, want %v", i, enabled, step.enabled)
		}
		promptAnswer, _, promptHeaders := post(promptReq, "")
		if i > 0 && promptHeaders.Get("X-CCGateway-History") != "prefix-hit" {
			t.Fatal("system update rebuilt the native session")
		}
		mu.Lock()
		actualSystem, _ := json.Marshal(requests[len(requests)-1]["system"])
		mu.Unlock()
		other := "SNAPSHOT_SYSTEM_A"
		if step.system == other {
			other = "SNAPSHOT_SYSTEM_B"
		}
		if !bytes.Contains(actualSystem, []byte(step.system)) || bytes.Contains(actualSystem, []byte(other)) {
			t.Fatalf("prompt turn %d restored the wrong system: %s", i, actualSystem)
		}
		promptReq["messages"] = append(promptReq["messages"].([]any), Object{"role": "assistant", "content": promptAnswer["content"]}, Object{"role": "user", "content": fmt.Sprintf("SNAPSHOT_NEXT_%d", i)})
	}
	// Existing MCP names stay intact; two servers may expose the same short
	// name alongside an ordinary SDK tool. Every result is supplied by the client.
	sdkReq := basic()
	sdkReq["messages"] = []any{Object{"role": "user", "content": "SDK_MIXED_CALL"}}
	sdkDefinition := func(name, typ string) Object {
		return Object{"name": name, "description": "Client lookup " + name, "input_schema": Object{"type": "object", "properties": Object{"query": Object{"type": typ}}, "required": []string{"query"}}}
	}
	for turn := 0; turn < 4; turn++ {
		queryType := "string"
		if turn >= 2 {
			queryType = "number"
		}
		declared := []any{sdkDefinition("mcp__other__lookup", "string"), sdkDefinition("foo", "string"), sdkDefinition("mcp__ccgateway__bar", "string")}
		if turn < 3 {
			declared = append(declared, sdkDefinition("mcp__files__lookup", queryType))
		}
		sdkReq["tools"] = declared
		sdkAnswer, _, sdkHeaders := post(sdkReq, "")
		if turn > 0 && sdkHeaders.Get("X-CCGateway-History") != "prefix-hit" {
			t.Fatal("SDK MCP continuation rebuilt native history")
		}
		mu.Lock()
		sdkUpstream := requests[len(requests)-1]
		mu.Unlock()
		actualTools, _ := sdkUpstream["tools"].([]any)
		if len(actualTools) != len(declared) {
			t.Fatalf("SDK mixed turn %d exposed wrong tool count: %v", turn, actualTools)
		}
		actualByName := map[string]Object{}
		for _, raw := range actualTools {
			definition := raw.(map[string]any)
			actualByName[str(definition, "name")] = definition
		}
		for _, raw := range declared {
			definition := raw.(map[string]any)
			wire := str(definition, "name")
			if wire == "foo" {
				wire = "mcp__ccgateway__foo"
			}
			actual := actualByName[wire]
			if actual == nil || str(actual, "description") != str(definition, "description") || digest(actual["input_schema"]) != digest(definition["input_schema"]) {
				t.Fatalf("SDK mixed turn %d changed name or definition for %s: %v", turn, wire, actual)
			}
		}
		if turn > 0 {
			body, _ := json.Marshal(sdkUpstream["messages"])
			for _, marker := range []string{"SDK_FILES_RESULT", "SDK_OTHER_RESULT", "SDK_ORDINARY_RESULT", "SDK_SHARED_NAMESPACE_RESULT"} {
				if !bytes.Contains(body, []byte(marker)) {
					t.Fatalf("SDK mixed turn %d lost %s", turn, marker)
				}
			}
			if bytes.Contains(body, []byte("execution belongs")) {
				t.Fatal("SDK mixed history contains an internal denial")
			}
		}
		nextContent := any(fmt.Sprintf("SDK_MIXED_NEXT_%d", turn))
		if turn == 0 {
			blocks, _ := sdkAnswer["content"].([]any)
			if len(blocks) != 4 {
				t.Fatalf("SDK mixed calls missing: %v", blocks)
			}
			results := []any{}
			for i, expected := range []string{"mcp__files__lookup", "mcp__other__lookup", "foo", "mcp__ccgateway__bar"} {
				block := blocks[i].(map[string]any)
				if str(block, "name") != expected {
					t.Fatalf("SDK response name %q, want %q", str(block, "name"), expected)
				}
				results = append(results, Object{"type": "tool_result", "tool_use_id": block["id"], "content": []string{"SDK_FILES_RESULT", "SDK_OTHER_RESULT", "SDK_ORDINARY_RESULT", "SDK_SHARED_NAMESPACE_RESULT"}[i]})
			}
			nextContent = results
		}
		sdkReq["messages"] = append(sdkReq["messages"].([]any), Object{"role": "assistant", "content": sdkAnswer["content"]}, Object{"role": "user", "content": nextContent})
	}
	collision := basic()
	collision["tools"] = []any{sdkDefinition("foo", "string"), sdkDefinition("mcp__ccgateway__foo", "string")}
	collisionBody, _ := json.Marshal(collision)
	collisionResponse, err := http.Post(gateway.URL+"/v1/messages", "application/json", bytes.NewReader(collisionBody))
	if err != nil {
		t.Fatal(err)
	}
	_, _ = io.Copy(io.Discard, collisionResponse.Body)
	collisionResponse.Body.Close()
	if collisionResponse.StatusCode != http.StatusBadRequest {
		t.Fatalf("colliding SDK name accepted: HTTP %d", collisionResponse.StatusCode)
	}
	// No custom session header is required, but caller scopes cannot share history.
	sessionHeader = ""
	scopeHeader = "caller-a"
	autoReq := basic()
	autoReq["messages"] = []any{Object{"role": "user", "content": "AUTOMATIC_SESSION"}}
	autoAnswer, _, _ := post(autoReq, "")
	autoReq["messages"] = append(autoReq["messages"].([]any), Object{"role": "assistant", "content": autoAnswer["content"]}, Object{"role": "user", "content": "AUTO_NEXT"})
	_, _, autoHeaders := post(autoReq, "")
	if autoHeaders.Get("X-CCGateway-History") != "prefix-hit" {
		t.Fatal("headerless continuation missed")
	}
	scopeHeader = "caller-b"
	_, _, otherHeaders := post(autoReq, "")
	if otherHeaders.Get("X-CCGateway-History") != "rebuild" {
		t.Fatal("caller scopes shared a native transcript")
	}
	sessionHeader = "test-session"
	scopeHeader = ""
	// Token-limit auto recovery must not make an extra model call.
	limited := basic()
	limited["messages"] = []any{Object{"role": "user", "content": "OUTPUT_LIMIT"}}
	limitedAnswer, _, _ := post(limited, "")
	if str(limitedAnswer, "stop_reason") != "max_tokens" {
		t.Fatal("output limit changed")
	}
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
	if len(requests) != 38 {
		t.Fatalf("expected 38 model requests, got %d", len(requests))
	}
	last := requests[6]
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
