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
	"reflect"
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
func TestUnsupportedRoleReportsMessagePosition(t *testing.T) {
	for _, role := range []any{"tool", "developer", "", nil, 42} {
		t.Run(fmt.Sprint(role), func(t *testing.T) {
			v := basic()
			messages := v["messages"].([]any)
			messages[1].(Object)["role"] = role
			b, _ := json.Marshal(v)
			_, err := parseRequest(b)
			expectedRole, _ := role.(string)
			want := fmt.Sprintf("messages[1].role: unsupported role %q; expected user, assistant or system", expectedRole)
			if err == nil || err.Error() != want {
				t.Fatalf("error = %v, want %q", err, want)
			}
			if strings.Contains(err.Error(), "Earlier answer") {
				t.Fatal("error exposes message content")
			}
		})
	}
}

func TestHistorySnapshotAndToolPair(t *testing.T) {
	dir := t.TempDir()
	cache, e := newCache(filepath.Join(dir, "cache"), 8<<20)
	if e != nil {
		t.Fatal(e)
	}
	r := parsed(t, basic())
	p, e := prepareHistory(r, cache, testBranch("logical"), dir, "2.1.288")
	if e != nil {
		t.Fatal(e)
	}
	content := []Object{{"type": "tool_use", "id": "toolu_one", "name": "weather", "input": Object{"city": "Paris"}}}
	answer := Object{"id": "msg_tool_checkpoint", "role": "assistant", "stop_reason": "tool_use", "content": content}
	row, id := transcriptRow(r.wireMessage(Message{Role: "assistant", Content: content}), p.LastUUID, p.SessionID, p.Work, "2.1.288", r.Model)
	p.NativeRows = append(p.Rows, row)
	p.NativeAll = p.NativeRows
	p.NativeAnchor = id
	p.NativePath = filepath.Join(dir, "native.jsonl")
	if e = writeNative(p.NativePath, p.NativeRows); e != nil {
		t.Fatal(e)
	}
	if e = p.commit(r, answer, cache, "logical", dir, "2.1.288", time.Now()); e != nil {
		t.Fatal(e)
	}
	r.Messages = append(r.Messages, Message{Role: "assistant", Content: content}, Message{Role: "user", Content: []Object{{"type": "tool_result", "tool_use_id": "toolu_one", "content": "sunny"}}})
	p2, e := prepareHistory(r, cache, testBranch("logical"), t.TempDir(), "2.1.288")
	if e != nil {
		t.Fatal(e)
	}
	if p2.Mode != "prefix-hit" {
		t.Fatal(p2.Mode)
	}
	// A concurrent request of the same branch does not wait and keeps the
	// session ID; it runs on its own private copy (§53.12).
	concurrent, err := prepareHistory(r, cache, testBranch("logical"), t.TempDir(), "2.1.288")
	if err != nil {
		t.Fatal(err)
	}
	if concurrent.SessionID != p2.SessionID || concurrent.Path == p2.Path || filepath.Base(concurrent.Path) != concurrent.SessionID+".jsonl" {
		t.Fatal("concurrent branches share a native writer")
	}
	b, _ := os.ReadFile(p2.Path)
	if !bytes.Contains(b, []byte("tool_result")) || !bytes.Contains(b, []byte("mcp__ccgateway__weather")) {
		t.Fatal("complete tool pair missing from recovery file")
	}
	if p2.Anchor == p2.LastUUID {
		t.Fatal("must replay final user after assistant anchor")
	}
	r.CustomToolPrefix = "new_namespace"
	changed, err := prepareHistory(r, cache, testBranch("logical"), t.TempDir(), "2.1.288")
	if err != nil {
		t.Fatal(err)
	}
	if changed.Mode != "rebuild" || bytes.Contains(nativeBytes(changed.Rows), []byte("mcp__ccgateway__weather")) || !bytes.Contains(nativeBytes(changed.Rows), []byte("mcp__new_namespace__weather")) {
		t.Fatal("namespace change reused old tool history")
	}
	r.CustomToolPrefix = ""
	r.Messages[0].Content[0]["text"] = "Changed"
	p3, e := prepareHistory(r, cache, testBranch("logical"), t.TempDir(), "2.1.288")
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
	a := Message{Role: "assistant", Content: []Object{{"type": "tool_use", "id": "x", "name": "test", "input": Object{"a": 1, "b": 2}}}}
	b := Message{Role: "assistant", Content: []Object{{"input": Object{"b": 2, "a": 1}, "name": "test", "id": "x", "type": "tool_use"}}}
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
const upstreamRejection = `{"type":"error","error":{"type":"invalid_request_error","message":"messages.1: role 'system' must precede an 'assistant' message or end the array; the directive-only form (content: [] with output_config) is accepted at any position"},"request_id":"req_fixture"}`
const upstreamStreamError = `{"type":"error","error":{"type":"overloaded_error","message":"Overloaded"},"request_id":"req_stream_fixture"}`

func upstreamStatusBody(status int) string {
	kind := "rate_limit_error"
	if status == 529 {
		kind = "overloaded_error"
	}
	return fmt.Sprintf(`{"type":"error","error":{"type":"%s","message":"fixture %d"},"request_id":"req_%d"}`, kind, status, status)
}

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
	var requestBetas []string
	rateLimited := map[string]bool{}
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
		requestBetas = append(requestBetas, r.Header.Get("anthropic-beta"))
		captureIndex := len(requests)
		mu.Unlock()
		if bytes.Contains(b, []byte("UPSTREAM_REJECT")) {
			// Wording that Claude Code answers by turning system turns off.
			w.Header().Set("Content-Type", "application/json")
			w.WriteHeader(400)
			fmt.Fprint(w, upstreamRejection)
			return
		}
		for _, status := range []int{429, 529} {
			if bytes.Contains(b, []byte(fmt.Sprintf("UPSTREAM_STATUS_%d", status))) {
				// Claude Code would back off and retry these itself.
				w.Header().Set("Content-Type", "application/json")
				w.Header().Set("Retry-After", "0")
				w.WriteHeader(status)
				fmt.Fprint(w, upstreamStatusBody(status))
				return
			}
		}
		if at := bytes.Index(b, []byte("UPSTREAM_429_ONCE_")); at >= 0 {
			marker := string(b[at : at+len("UPSTREAM_429_ONCE_")+5])
			mu.Lock()
			first := !rateLimited[marker]
			rateLimited[marker] = true
			mu.Unlock()
			if first {
				w.Header().Set("Content-Type", "application/json")
				w.Header().Set("Retry-After", "0")
				w.WriteHeader(429)
				fmt.Fprint(w, upstreamStatusBody(429))
				return
			}
		}
		if bytes.Contains(b, []byte("UPSTREAM_SSE_ERROR")) {
			w.Header().Set("Content-Type", "text/event-stream")
			start, _ := json.Marshal(Object{"type": "message_start", "message": Object{"id": "msg_sse_error", "type": "message", "role": "assistant", "model": v["model"], "content": []any{}, "stop_reason": nil, "stop_sequence": nil, "usage": Object{"input_tokens": 20, "output_tokens": 0}}})
			fmt.Fprintf(w, "event: message_start\ndata: %s\n\n", start)
			fmt.Fprint(w, "event: content_block_start\ndata: {\"type\":\"content_block_start\",\"index\":0,\"content_block\":{\"type\":\"text\",\"text\":\"\"}}\n\n")
			fmt.Fprint(w, "event: content_block_delta\ndata: {\"type\":\"content_block_delta\",\"index\":0,\"delta\":{\"type\":\"text_delta\",\"text\":\"partial\"}}\n\n")
			w.(http.Flusher).Flush()
			time.Sleep(time.Second) // a streaming client has its first events by now
			fmt.Fprintf(w, "event: error\ndata: %s\n\n", upstreamStreamError)
			return
		}
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
		output, _ := v["output_config"].(map[string]any)
		apiFormat := output["format"] != nil
		if apiFormat {
			content = []Object{{"type": "text", "text": `{"ok":true}`}}
		}
		for _, value := range v["tools"].([]any) {
			tool, _ := value.(map[string]any)
			if str(tool, "name") == "StructuredOutput" {
				content = []Object{{"type": "tool_use", "id": "toolu_format", "name": "StructuredOutput", "input": Object{"ok": true}}}
				break
			}
		}
		if !apiFormat && bytes.Contains(raw, []byte("FORMAT_AFTER_TEXT")) {
			content = []Object{{"type": "text", "text": "The result is true."}}
		}
		if bytes.Contains(raw, []byte("SEARCH_TOOL")) && !bytes.Contains(raw, []byte("tool_result")) {
			content = []Object{{"type": "tool_use", "id": "toolu_search", "name": "ToolSearch", "input": Object{"query": "select:mcp__ccgateway__weather"}}}
		}
		allMessages, _ := json.Marshal(ms)
		if bytes.Contains(allMessages, []byte("SYSTEM_SEARCH_TOOL")) && !bytes.Contains(allMessages, []byte("tool_result")) {
			content = []Object{{"type": "tool_use", "id": "toolu_inline_search", "name": "ToolSearch", "input": Object{"query": "select:mcp__ccgateway__weather"}}}
		}
		if !apiFormat && bytes.Contains(allMessages, []byte("SYSTEM_FORMAT_AFTER_TEXT")) && !bytes.Contains(allMessages, []byte("tool_result")) {
			mu.Lock()
			formatCalls := 0
			for _, previous := range requests {
				data, _ := json.Marshal(previous["messages"])
				if bytes.Contains(data, []byte("SYSTEM_FORMAT_AFTER_TEXT")) {
					formatCalls++
				}
			}
			mu.Unlock()
			if formatCalls == 1 {
				content = []Object{{"type": "text", "text": "The result is true."}}
			}
		}
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
	for _, k := range []string{"PATH", "SystemRoot", "WINDIR", "COMSPEC", "TEMP", "TMP", "PATHEXT", "APPDATA", "LOCALAPPDATA", "CCGATEWAY_ATTACHMENT_TRACE"} {
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
	betaHeader, policyJSON := "", ""
	// Cache inspection must use the same policy normalization and namespace as
	// the HTTP handler. Bare parseRequest omits the default attachment policy.
	parseHTTP := func(v Object) *Request {
		t.Helper()
		b, err := json.Marshal(v)
		if err != nil {
			t.Fatal(err)
		}
		h := http.Header{}
		h.Set("anthropic-beta", betaHeader)
		h.Set(policyHeader, policyJSON)
		r, err := parsePolicyRequest(b, h)
		if err != nil {
			t.Fatal(err)
		}
		return r
	}
	// The session branch the HTTP handler resolves for the current session.
	branchFor := func(v Object) (*Request, sessionBranch) {
		t.Helper()
		if sessionHeader != "" {
			encoded, _ := json.Marshal(v)
			v, _ = decodeObject(encoded)
			v["metadata"] = Object{"user_id": sessionHeader}
		}
		r := parseHTTP(v)
		h := http.Header{}
		h.Set("X-CCGateway-Session-Scope", scopeHeader)
		b, err := newSessionBranch(r, h)
		if err != nil {
			t.Fatal(err)
		}
		return r, b
	}
	post := func(v Object, native string) (Object, string, http.Header) {
		t.Helper()
		b, _ := json.Marshal(v)
		ctx, cancel := context.WithTimeout(context.Background(), 50*time.Second)
		defer cancel()
		req, _ := http.NewRequestWithContext(ctx, "POST", gateway.URL+"/v1/messages", bytes.NewReader(b))
		req.Header.Set("Content-Type", "application/json")
		if sessionHeader != "" {
			setTestSession(t, req, sessionHeader)
		}
		req.Header.Set("X-CCGateway-Session-Scope", scopeHeader)
		req.Header.Set("X-CCGateway-Native-Tools", native)
		req.Header.Set("anthropic-beta", betaHeader)
		req.Header.Set(policyHeader, policyJSON)
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
	// CC 自带的附件（environment/model/date/total_tokens 等）被拦截，不出现在上游请求里
	for _, forbidden := range []string{"# Environment", "You are powered by", "Today's date", "<total_tokens>"} {
		if bytes.Contains(sys, []byte(forbidden)) {
			t.Fatalf("upstream request contains CLI attachment text: %s", forbidden)
		}
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
	if variants := verifiedNativeToolCatalogues[version]["Read"]; len(variants) > 0 {
		verifiedRead = variants[0]
	}
	native["tools"] = []any{verifiedRead}
	answer, _, _ = post(native, "") // exact definitions work without legacy opt-in
	if str(answer, "stop_reason") != "tool_use" {
		t.Fatal(answer)
	}
	mu.Lock()
	nativeUp := requests[len(requests)-1]
	mu.Unlock()
	nativeTools, _ := nativeUp["tools"].([]any)
	wantRead := "Read"
	if len(verifiedNativeToolCatalogues[version]["Read"]) == 0 {
		wantRead = "mcp__ccgateway__Read"
	}
	if len(nativeTools) != 1 || str(nativeTools[0].(map[string]any), "name") != wantRead {
		t.Fatalf("native whitelist leaked tools: %v", nativeTools)
	}
	nativeDefinition := nativeTools[0].(map[string]any)
	if str(nativeDefinition, "description") != verifiedRead.Description || digest(nativeDefinition["input_schema"]) != digest(verifiedRead.Schema) {
		t.Fatal("actual native Read definition differs from verified catalogue")
	}

	// Returning a native result on the next HTTP request must restore the
	// client result, never the Mod's internal denial from the previous process.
	nativeContent := answer["content"].([]any)
	native["messages"] = []any{user, Object{"role": "assistant", "content": nativeContent}, Object{"role": "user", "content": []any{Object{"type": "tool_result", "tool_use_id": nativeContent[0].(Object)["id"], "content": "CLIENT_FILE_CONTENT"}}}}
	_, _, headers = post(native, "")
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
	mu.Lock()
	noneRequest := requests[len(requests)-1]
	mu.Unlock()
	// none disables calls, not the caller's declared catalog or its cache prefix.
	if digest(noneRequest["tools"]) != digest([]any{Object{"name": wantRead, "description": verifiedRead.Description, "input_schema": verifiedRead.Schema}}) {
		t.Fatal("tool_choice none changed the explicit native tool catalog")
	}
	if digest(noneRequest["tool_choice"]) != digest(Object{"type": "none"}) {
		t.Fatal("tool_choice none was not preserved")
	}
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
	// A different description keeps native identity; a different input schema
	// is a custom tool. Both preserve the client's description and results.
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
		wantName := "mcp__ccgateway__Read"
		if scenario == "description" && len(verifiedNativeToolCatalogues[version]["Read"]) > 0 {
			wantName = "Read"
		}
		if len(definitions) != 1 || str(definitions[0].(map[string]any), "name") != wantName {
			t.Fatalf("mismatched native definition did not use SDK tool: %v", definitions)
		}
		definition := definitions[0].(map[string]any)
		if str(definition, "description") != customRead.Description || digest(definition["input_schema"]) != digest(customRead.Schema) {
			t.Fatalf("custom fallback changed the caller's definition: scenario=%s description_equal=%t schema_equal=%t actual_description_length=%d expected_description_length=%d", scenario, str(definition, "description") == customRead.Description, digest(definition["input_schema"]) == digest(customRead.Schema), len(str(definition, "description")), len(customRead.Description))
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
		rr, b := branchFor(v)
		hh := fingerprints(rr.Messages)
		return cache.get(cacheKey(b.Logical, rr.toolHistoryNamespace(), hh[len(hh)-2]))
	}
	beforeConfig := lookup(configReq)
	if beforeConfig == nil {
		t.Fatal("configuration-start snapshot missing from HTTP policy namespace")
	}
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
	if afterConfig == nil {
		t.Fatal("configuration-continuation snapshot missing from HTTP policy namespace")
	}
	if beforeConfig.SessionID != afterConfig.SessionID {
		t.Fatalf("normal continuation changed native session: before=%s after=%s", beforeConfig.SessionID, afterConfig.SessionID)
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
	// Branch from the first answer: the sibling is appended to the same
	// canonical file, whose existing records stay byte-for-byte (§53.12).
	mainFile, _ := os.ReadFile(afterConfig.NativePath)
	branch := basic()
	branch["messages"] = append(parentMessages[:2:2], Object{"role": "user", "content": "ALTERNATE_BRANCH"})
	_, _, branchHeaders := post(branch, "")
	if branchHeaders.Get("X-CCGateway-History") != "fork" {
		t.Fatal("older node did not fork")
	}
	currentFile, _ := os.ReadFile(afterConfig.NativePath)
	if !bytes.HasPrefix(currentFile, mainFile) || len(currentFile) == len(mainFile) || !bytes.Contains(currentFile[len(mainFile):], []byte("ALTERNATE_BRANCH")) {
		t.Fatal("fork rewrote the parent transcript or was not appended as a sibling")
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
	// A cached A prompt must not reappear after switching to B. Compare the
	// actual upstream prompt on every turn with scoped snapshots disabled.
	promptReq := basic()
	promptReq["messages"] = []any{Object{"role": "user", "content": "SNAPSHOT_START"}}
	for i, system := range []string{"SNAPSHOT_SYSTEM_A", "SNAPSHOT_SYSTEM_A", "SNAPSHOT_SYSTEM_B", "SNAPSHOT_SYSTEM_B"} {
		promptReq["system"] = system
		promptParsed, promptBranch := branchFor(promptReq)
		preparedPrompt, err := prepareHistory(promptParsed, cache, promptBranch, t.TempDir(), version)
		if err != nil {
			t.Fatal(err)
		}
		// Every admitted request preserves max_tokens through a nonce-scoped
		// plan, so CLI snapshots must remain off regardless of cache metadata.
		args := cliArgs(promptParsed, preparedPrompt, "fixture")
		enabled := false
		for i, arg := range args {
			if arg == "--system-prompt-snapshot" && i+1 < len(args) {
				enabled = args[i+1] == "on"
			}
		}
		if enabled {
			t.Fatalf("prompt turn %d snapshot enabled with a scoped feature plan", i)
		}
		promptAnswer, _, promptHeaders := post(promptReq, "")
		if i > 0 && promptHeaders.Get("X-CCGateway-History") != "prefix-hit" {
			t.Fatal("system update rebuilt the native session")
		}
		mu.Lock()
		actualSystem, _ := json.Marshal(requests[len(requests)-1]["system"])
		mu.Unlock()
		other := "SNAPSHOT_SYSTEM_A"
		if system == other {
			other = "SNAPSHOT_SYSTEM_B"
		}
		if !bytes.Contains(actualSystem, []byte(system)) || bytes.Contains(actualSystem, []byte(other)) {
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
	// One session's history is never shared across caller scopes. (A request
	// without any session is a new session every time, §53.12; covered in
	// session_branch_test.go.)
	sessionHeader = "scoped-session"
	scopeHeader = "caller-a"
	autoReq := basic()
	autoReq["messages"] = []any{Object{"role": "user", "content": "AUTOMATIC_SESSION"}}
	autoAnswer, _, _ := post(autoReq, "")
	autoReq["messages"] = append(autoReq["messages"].([]any), Object{"role": "assistant", "content": autoAnswer["content"]}, Object{"role": "user", "content": "AUTO_NEXT"})
	_, _, autoHeaders := post(autoReq, "")
	if autoHeaders.Get("X-CCGateway-History") != "prefix-hit" {
		t.Fatal("scoped continuation missed")
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
	prepared, err := prepareHistory(cancelReq, cache, testBranch("cancel-test"), dir, version)
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
	mu.Unlock()
	// Verify the actual model request produced by the installed CLI, using the local fake upstream only.
	policy := defaultRequestPolicy()
	policy.AllowFast = true
	rawPolicy, _ := json.Marshal(policy)
	policyJSON = string(rawPolicy)
	betaHeader = "fine-grained-tool-streaming-2025-05-14,fast-mode-2026-02-01,ignored-client-beta"
	sessionHeader = "capability-test"
	capability := basic()
	capability["model"] = "claude-opus-5-5"
	capability["speed"] = "fast"
	capability["output_config"] = Object{"effort": "low"}
	post(capability, "")
	mu.Lock()
	mapped := requests[len(requests)-1]
	mappedBetas := requestBetas[len(requestBetas)-1]
	mu.Unlock()
	cfg, _ := mapped["output_config"].(map[string]any)
	if mapped["speed"] != "fast" || cfg["effort"] != "low" || !strings.Contains(mappedBetas, "fine-grained-tool-streaming-2025-05-14") || strings.Contains(mappedBetas, "ignored-client-beta") {
		t.Fatalf("actual CLI mapping mismatch: speed=%v effort=%v betas=%s", mapped["speed"], cfg["effort"], mappedBetas)
	}
	policy.AllowFast = false
	rawPolicy, _ = json.Marshal(policy)
	policyJSON = string(rawPolicy)
	mu.Lock()
	beforeDeniedFast := len(requests)
	mu.Unlock()
	deniedFastBody, _ := json.Marshal(capability)
	deniedFastRequest, _ := http.NewRequest("POST", gateway.URL+"/v1/messages", bytes.NewReader(deniedFastBody))
	deniedFastRequest.Header.Set("Content-Type", "application/json")
	deniedFastRequest.Header.Set("anthropic-beta", betaHeader)
	deniedFastRequest.Header.Set(policyHeader, policyJSON)
	deniedFastResponse, err := http.DefaultClient.Do(deniedFastRequest)
	if err != nil {
		t.Fatal(err)
	}
	deniedFastResult, _ := io.ReadAll(deniedFastResponse.Body)
	deniedFastResponse.Body.Close()
	if deniedFastResponse.StatusCode != http.StatusBadRequest || !bytes.Contains(deniedFastResult, []byte("speed fast is disabled")) {
		t.Fatalf("disabled Fast silently downgraded: HTTP%d %s", deniedFastResponse.StatusCode, deniedFastResult)
	}
	mu.Lock()
	afterDeniedFast := len(requests)
	mu.Unlock()
	if afterDeniedFast != beforeDeniedFast {
		t.Fatal("disabled Fast made an upstream request")
	}
	betaHeader = ""
	policyJSON = ""
	sessionHeader = "schema-cache-test"
	structured := basic()
	structured["output_config"] = Object{"format": Object{"type": "json_schema", "schema": Object{"type": "object", "properties": Object{"ok": Object{"type": "boolean"}}, "required": []string{"ok"}, "additionalProperties": false}}}
	structured["cache_control"] = Object{"type": "ephemeral", "ttl": "1h"}
	formatted, _, _ := post(structured, "")
	blocks, _ := formatted["content"].([]any)
	if len(blocks) != 1 || str(blocks[0].(map[string]any), "type") != "text" || str(blocks[0].(map[string]any), "text") != `{"ok":true}` {
		t.Fatalf("structured response leaked internal tool: %v", formatted)
	}
	structured["stream"] = true
	_, formattedStream, _ := post(structured, "")
	if strings.Contains(formattedStream, "StructuredOutput") || !strings.Contains(formattedStream, "text_delta") {
		t.Fatalf("invalid structured SSE: %s", formattedStream)
	}
	mu.Lock()
	actual := requests[len(requests)-1]
	mu.Unlock()
	actualConfig, _ := actual["output_config"].(map[string]any)
	hasSchema := actualConfig["format"] != nil
	for _, value := range actual["tools"].([]any) {
		tool, _ := value.(map[string]any)
		if str(tool, "name") == "StructuredOutput" {
			t.Fatal("API format injected a synthetic tool")
		}
	}
	if !hasSchema {
		t.Fatal("CLI did not receive structured output schema")
	}
	structured["messages"] = []any{Object{"role": "user", "content": "FORMAT_AFTER_TEXT"}}
	_, delayedFormat, _ := post(structured, "")
	if strings.Contains(delayedFormat, "The result is true") || !strings.Contains(delayedFormat, `\"ok\"`) {
		t.Fatalf("unvalidated prose escaped the format continuation: %s", delayedFormat)
	}
	sessionHeader = "tool-search-test"
	searchRequest := basic()
	searchRequest["messages"] = []any{Object{"role": "user", "content": "SEARCH_TOOL"}}
	searchRequest["tools"] = []any{Object{"name": "weather", "description": "weather lookup", "input_schema": Object{"type": "object", "properties": Object{"city": Object{"type": "string"}}}, "defer_loading": true}}
	searched, _, _ := post(searchRequest, "")
	encodedSearch, _ := json.Marshal(searched)
	if bytes.Contains(encodedSearch, []byte("ToolSearch")) || !bytes.Contains(encodedSearch, []byte("fixture answer")) {
		t.Fatalf("internal discovery leaked: %s", encodedSearch)
	}
	searchRequest["stream"] = true
	_, searchStream, _ := post(searchRequest, "")
	if strings.Contains(searchStream, "ToolSearch") || !strings.Contains(searchStream, "fixture answer") {
		t.Fatalf("internal discovery leaked in SSE: %s", searchStream)
	}
	searchTokens, _ := searched["usage"].(map[string]any)
	if tokenCount(searchTokens["input_tokens"]) != 40 || tokenCount(searchTokens["output_tokens"]) != 16 {
		t.Fatalf("tool discovery usage was lost or double counted: %v", searchTokens)
	}
	for _, kind := range []string{"search", "format"} {
		t.Run("inline-system-continuation-"+kind, func(t *testing.T) {
			request := basic()
			marker := "SYSTEM_SEARCH_TOOL"
			if kind == "format" {
				request["output_config"] = structured["output_config"]
				marker = "SYSTEM_FORMAT_AFTER_TEXT"
			} else {
				request["tools"] = searchRequest["tools"]
			}
			request["messages"] = []any{Object{"role": "user", "content": "first"}, Object{"role": "assistant", "content": "prior answer"}, Object{"role": "user", "content": "second"}, Object{"role": "system", "content": marker}}
			request["stream"] = true
			mu.Lock()
			before := len(requests)
			mu.Unlock()
			_, stream, _ := post(request, "")
			if !strings.Contains(stream, "text_delta") {
				t.Fatal("continuation SSE missing")
			}
			mu.Lock()
			defer mu.Unlock()
			if kind == "search" && len(requests)-before < 2 {
				t.Fatal("native continuation was not exercised")
			}
			if kind == "format" && len(requests)-before != 1 {
				t.Fatal("API format triggered an implicit continuation")
			}
			for _, wire := range requests[before:] {
				found := 0
				for _, value := range wire["messages"].([]any) {
					message := value.(Object)
					data, _ := json.Marshal(message["content"])
					if !bytes.Contains(data, []byte(marker)) {
						continue
					}
					// The client's message itself, in every continuation round.
					content, _ := message["content"].([]any)
					if len(content) == 1 {
						delete(content[0].(Object), "cache_control")
					}
					if str(message, "role") != "system" || canonical(t, message) != canonical(t, Object{"role": "system", "content": []any{Object{"type": "text", "text": marker}}}) {
						t.Fatalf("client system message changed upstream: %s", canonical(t, message))
					}
					found++
				}
				if found != 1 {
					t.Fatalf("inline system sent %d times in a CLI continuation request", found)
				}
				data, _ := json.Marshal(wire)
				if bytes.Contains(data, []byte("hook additional context")) {
					t.Fatal("system text relabelled")
				}
			}
		})
	}
	// A later turn resumes the native session whose history holds the internal
	// discovery round; the client's systems still align with their turns.
	t.Run("inline-system-after-search-history", func(t *testing.T) {
		request := basic()
		request["tools"] = searchRequest["tools"]
		first := []any{Object{"role": "user", "content": "first"}, Object{"role": "assistant", "content": "prior answer"}, Object{"role": "user", "content": "second"}, Object{"role": "system", "content": "SYSTEM_SEARCH_TOOL history"}}
		request["messages"] = first
		answered, _, _ := post(request, "")
		request["messages"] = append(append([]any(nil), first...), Object{"role": "assistant", "content": answered["content"]}, Object{"role": "user", "content": "third"}, Object{"role": "system", "content": "SYSTEM_AFTER_SEARCH"})
		mu.Lock()
		before := len(requests)
		mu.Unlock()
		_, _, headers := post(request, "")
		if headers.Get("X-CCGateway-History") != "prefix-hit" {
			t.Fatalf("history mode %s", headers.Get("X-CCGateway-History"))
		}
		mu.Lock()
		defer mu.Unlock()
		wire := requests[len(requests)-1]
		if len(requests)-before != 1 {
			t.Fatalf("follow-up made %d model requests", len(requests)-before)
		}
		var shape []string
		for _, value := range wire["messages"].([]any) {
			message := value.(Object)
			label := str(message, "role")
			data, _ := json.Marshal(message["content"])
			if str(message, "role") == "assistant" && internalAssistant(message) {
				label += ":ToolSearch"
			}
			for _, marker := range []string{"SYSTEM_SEARCH_TOOL history", "SYSTEM_AFTER_SEARCH"} {
				if bytes.Contains(data, []byte(marker)) {
					label += ":" + marker
					content, _ := message["content"].([]any)
					if len(content) > 0 {
						delete(content[len(content)-1].(Object), "cache_control")
					}
					if canonical(t, message) != canonical(t, Object{"role": "system", "content": []any{Object{"type": "text", "text": marker}}}) {
						t.Fatalf("client system message changed upstream: %s", canonical(t, message))
					}
				}
			}
			shape = append(shape, label)
		}
		// The client's turns: first / prior answer / second + system / final
		// answer (after the native discovery round) / third + system.
		// Claude Code's deferred_tools_delta (when ToolSearch fires) precedes
		// the client's system message as a separate system message.
		want := "user assistant user system:SYSTEM_SEARCH_TOOL history assistant:ToolSearch user assistant user system:SYSTEM_AFTER_SEARCH"
		withDeferred := "user assistant user system system:SYSTEM_SEARCH_TOOL history assistant:ToolSearch user assistant user system:SYSTEM_AFTER_SEARCH"
		got := strings.Join(shape, " ")
		if got != want && got != strings.Replace(want, "assistant:ToolSearch user assistant", "assistant:ToolSearch user system assistant", 1) && got != withDeferred && got != strings.Replace(withDeferred, "assistant:ToolSearch user assistant", "assistant:ToolSearch user system assistant", 1) {
			t.Fatalf("wire shape: %s", got)
		}
	})
	// Regression: client system text identical to Claude Code's own attachment
	// text (the 502 seen with a Claude Code client sending total_tokens).
	t.Run("client-system-identical-to-engine-attachment", func(t *testing.T) {
		const tokens = "<total_tokens>15000000 tokens left</total_tokens>"
		const date = "Today's date is 2026-10-06."
		request := Object{
			"model":      "claude-opus-4-20240229",
			"max_tokens": 100,
			"messages": []any{
				Object{"role": "user", "content": "first"},
				Object{"role": "system", "content": tokens},
			},
		}
		answered, _, _ := post(request, "")
		followUp := Object{
			"model":      "claude-opus-4-20240229",
			"max_tokens": 100,
			"messages": []any{
				Object{"role": "user", "content": "first"},
				Object{"role": "system", "content": tokens},
				Object{"role": "assistant", "content": answered["content"]},
				Object{"role": "user", "content": "second"},
				Object{"role": "system", "content": date},
			},
		}
		mu.Lock()
		before := len(requests)
		mu.Unlock()
		_, _, headers := post(followUp, "")
		if headers.Get("X-CCGateway-History") != "prefix-hit" {
			t.Fatalf("history mode %s", headers.Get("X-CCGateway-History"))
		}
		mu.Lock()
		defer mu.Unlock()
		if len(requests)-before != 1 {
			t.Fatalf("follow-up made %d model requests", len(requests)-before)
		}
		wire := requests[len(requests)-1]
		var clientSystems []string
		for _, value := range wire["messages"].([]any) {
			message := value.(Object)
			if str(message, "role") != "system" {
				continue
			}
			// content can be string or []Object
			switch c := message["content"].(type) {
			case string:
				if strings.Contains(c, tokens) {
					clientSystems = append(clientSystems, "tokens")
				} else if strings.Contains(c, date) {
					clientSystems = append(clientSystems, "date")
				}
			case []any:
				for _, block := range c {
					if b, ok := block.(Object); ok && str(b, "type") == "text" {
						text := str(b, "text")
						if strings.Contains(text, tokens) {
							clientSystems = append(clientSystems, "tokens")
						} else if strings.Contains(text, date) {
							clientSystems = append(clientSystems, "date")
						}
					}
				}
			}
		}
		if want := []string{"tokens", "date"}; !reflect.DeepEqual(clientSystems, want) {
			t.Fatalf("client system markers: %v, want %v", clientSystems, want)
		}
	})
	// Upstream errors under the pass_upstream_errors policy (opt-in).
	rawPost := func(t *testing.T, request Object, policy string) (*http.Response, []byte) {
		t.Helper()
		b, _ := json.Marshal(request)
		httpRequest, _ := http.NewRequest("POST", gateway.URL+"/v1/messages", bytes.NewReader(b))
		httpRequest.Header.Set("Content-Type", "application/json")
		if policy != "" {
			httpRequest.Header.Set(policyHeader, policy)
		}
		resp, err := http.DefaultClient.Do(httpRequest)
		if err != nil {
			t.Fatal(err)
		}
		defer resp.Body.Close()
		out, _ := io.ReadAll(resp.Body)
		return resp, out
	}
	passing := `{"unknown_beta":"ignore","unknown_field":"reject","allow_effort":true,"pass_upstream_errors":true}`
	// The API's 400 for a restored request reaches the client as sent, and the
	// CLI does not answer it with a reshaped retry.
	for _, stream := range []bool{false, true} {
		t.Run(fmt.Sprintf("upstream-error-stream=%v", stream), func(t *testing.T) {
			request := basic()
			request["messages"] = []any{Object{"role": "user", "content": "q"}, Object{"role": "system", "content": "UPSTREAM_REJECT"}}
			request["stream"] = stream
			mu.Lock()
			before := len(requests)
			mu.Unlock()
			resp, out := rawPost(t, request, passing)
			if resp.StatusCode != 400 || string(out) != upstreamRejection || !strings.HasPrefix(resp.Header.Get("Content-Type"), "application/json") {
				t.Fatalf("client received %d %s", resp.StatusCode, out)
			}
			mu.Lock()
			defer mu.Unlock()
			if len(requests)-before != 1 {
				t.Fatalf("CLI retried the rejected request %d times", len(requests)-before-1)
			}
		})
	}
	// Requests without client system messages: statuses Claude Code would back
	// off on, and an error event inside a 200 stream, reach the client as the
	// API sent them, after a single upstream request.
	type upstreamCase struct {
		marker, want string
		status       int
	}
	for _, tc := range []upstreamCase{{"UPSTREAM_STATUS_429", upstreamStatusBody(429), 429}, {"UPSTREAM_STATUS_529", upstreamStatusBody(529), 529}, {"UPSTREAM_SSE_ERROR", upstreamStreamError, 529}} {
		for _, stream := range []bool{false, true} {
			t.Run(fmt.Sprintf("%s-stream=%v", strings.ToLower(tc.marker), stream), func(t *testing.T) {
				request := basic()
				request["messages"] = []any{Object{"role": "user", "content": tc.marker}}
				request["stream"] = stream
				mu.Lock()
				before := len(requests)
				mu.Unlock()
				resp, out := rawPost(t, request, passing)
				var official Object
				_ = json.Unmarshal([]byte(tc.want), &official)
				switch {
				case resp.StatusCode == tc.status && string(out) == tc.want && !(stream && tc.marker == "UPSTREAM_SSE_ERROR"):
					// Not yet streaming: the API's status and body.
				case stream && resp.StatusCode == 200 && tc.marker == "UPSTREAM_SSE_ERROR":
					// Streaming had begun: the API's error object as the error event.
					errorEvent, _ := json.Marshal(Object{"type": "error", "error": official["error"]})
					if !strings.Contains(string(out), "partial") || !strings.HasSuffix(string(out), "event: error\ndata: "+string(errorEvent)+"\n\n") || strings.Contains(string(out), "message_stop") {
						t.Fatalf("stream ended with %s", out)
					}
				default:
					t.Fatalf("client received %d %s", resp.StatusCode, out)
				}
				mu.Lock()
				defer mu.Unlock()
				if len(requests)-before != 1 {
					t.Fatalf("upstream received %d requests", len(requests)-before)
				}
			})
		}
	}
	// Default policy: Claude Code handles upstream errors itself. A 429 is
	// retried by the CLI and the client gets the later success.
	for _, stream := range []bool{false, true} {
		t.Run(fmt.Sprintf("cli-handles-429-stream=%v", stream), func(t *testing.T) {
			request := basic()
			request["messages"] = []any{Object{"role": "user", "content": fmt.Sprintf("UPSTREAM_429_ONCE_%v", stream)}}
			request["stream"] = stream
			mu.Lock()
			before := len(requests)
			mu.Unlock()
			resp, out := rawPost(t, request, "")
			if resp.StatusCode != 200 || !strings.Contains(string(out), "fixture answer") {
				t.Fatalf("client received %d %s", resp.StatusCode, out)
			}
			mu.Lock()
			defer mu.Unlock()
			if len(requests)-before != 2 {
				t.Fatalf("upstream received %d requests, want the 429 and the retry", len(requests)-before)
			}
		})
	}
	// Default policy, a client system message, and a 400 whose wording makes
	// Claude Code turn system turns off and resend: the reshaped request
	// cannot be restored, the relay refuses it and the client gets a 502 that
	// names the cause, not the API's 400.
	t.Run("cli-handles-400-with-system", func(t *testing.T) {
		request := basic()
		request["messages"] = []any{Object{"role": "user", "content": "q"}, Object{"role": "system", "content": "UPSTREAM_REJECT default"}}
		mu.Lock()
		before := len(requests)
		mu.Unlock()
		resp, out := rawPost(t, request, "")
		mu.Lock()
		forwarded := len(requests) - before
		mu.Unlock()
		t.Logf("client received %d %s; upstream received %d", resp.StatusCode, out, forwarded)
		if resp.StatusCode != 502 || !strings.Contains(string(out), "cannot restore the client's system messages") || forwarded != 1 {
			t.Fatalf("client received %d %s; upstream received %d", resp.StatusCode, out, forwarded)
		}
	})
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
