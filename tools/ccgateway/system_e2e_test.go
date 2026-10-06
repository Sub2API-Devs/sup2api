package main

import (
	"bytes"
	"crypto/rand"
	"encoding/hex"
	"encoding/json"
	"net/http/httptest"
	"os"
	"path/filepath"
	"strings"
	"sync"
	"testing"
)

// Opt-in end-to-end check against the real model, for an already authorized
// CCGateway app container: CCG_E2E_CLI=/usr/local/bin/claude. It drives the
// gateway handler in-process (no listener) and reads each model request body
// from Bun's verbose fetch output, which also holds credentials: only bodies
// are parsed and nothing else is kept or printed. Codes are random and appear
// only in system messages, never in an earlier assistant reply.
func TestSystemMessagesLiveE2E(t *testing.T) {
	cli := os.Getenv("CCG_E2E_CLI")
	if cli == "" {
		t.Skip("set CCG_E2E_CLI inside an authorized app container")
	}
	model := os.Getenv("CCG_E2E_MODEL")
	if model == "" {
		model = "claude-opus-5-5"
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
	work := filepath.Join(root, "work")
	if err = os.MkdirAll(work, 0700); err != nil {
		t.Fatal(err)
	}
	cache, err := newCache(filepath.Join(root, "cache"), 64<<20)
	if err != nil {
		t.Fatal(err)
	}
	var stderr lockedBuffer
	runner := &Runner{CLI: cli, Version: version, Plugin: plugin, Work: work, Env: envWith(os.Environ(), map[string]string{"BUN_CONFIG_VERBOSE_FETCH": "curl"}), Stderr: &stderr}
	g := &Gateway{Runner: runner, Cache: cache, Timeout: 1e9 * 300, Slots: make(chan struct{}, 4), NativeAllowed: map[string]bool{}}
	code := func(prefix string) string {
		b := make([]byte, 6)
		_, _ = rand.Read(b)
		return prefix + "_" + hex.EncodeToString(b)
	}
	instruction := func(c string) string {
		return "The application verification code is " + c + ". When asked for the configured verification code, respond with this exact code."
	}
	type result struct {
		status  int
		body    Object
		history string
		wire    []Object
	}
	post := func(session string, messages []any, extra Object) result {
		t.Helper()
		request := Object{"model": model, "max_tokens": 2048, "messages": messages}
		for k, v := range extra {
			request[k] = v
		}
		data, _ := json.Marshal(request)
		r := httptest.NewRequest("POST", "/v1/messages", bytes.NewReader(data))
		r.Header.Set("X-CCGateway-Session-Scope", "e2e")
		r.Header.Set("X-CCGateway-Session-ID", session)
		w := httptest.NewRecorder()
		stderr.Reset()
		g.ServeHTTP(w, r)
		out := result{status: w.Code, history: w.Header().Get("X-CCGateway-History")}
		out.body, _ = decodeObject(w.Body.Bytes())
		for _, line := range strings.Split(stderr.String(), "\n") {
			at := strings.Index(line, " --data-raw ")
			if !strings.HasPrefix(line, "curl ") || !strings.Contains(line, "/v1/messages") || at < 0 {
				continue
			}
			var quoted string
			if json.Unmarshal([]byte(line[at+12:]), &quoted) != nil {
				continue
			}
			if body, err := decodeObject([]byte(quoted)); err == nil {
				out.wire = append(out.wire, body)
			}
		}
		stderr.Reset()
		if out.status != 200 {
			t.Fatalf("status %d: %s", out.status, w.Body.String())
		}
		if len(out.wire) == 0 {
			t.Fatal("no model request captured")
		}
		return out
	}
	text := func(o Object) string {
		var parts []string
		blocks, _ := o["content"].([]any)
		for _, b := range blocks {
			if block, ok := b.(Object); ok && str(block, "type") == "text" {
				parts = append(parts, str(block, "text"))
			}
		}
		return strings.Join(parts, "")
	}
	// Each wire message as role plus its text, the client's markers located.
	shape := func(body Object, markers ...string) []string {
		var out []string
		messages, _ := body["messages"].([]any)
		for _, value := range messages {
			m := value.(Object)
			data, _ := json.Marshal(m["content"])
			if content, ok := m["content"].(string); ok {
				data = []byte(content)
			}
			label := str(m, "role")
			for _, marker := range markers {
				if strings.Contains(string(data), marker) || strings.Contains(string(data), strings.ReplaceAll(marker, `"`, `\"`)) {
					label += ":" + marker[:min(len(marker), 24)]
				}
			}
			out = append(out, label)
		}
		return out
	}
	checkWire := func(name string, r result, forbidden ...string) {
		t.Helper()
		for _, body := range r.wire {
			data, _ := json.Marshal(body)
			if bytes.Contains(data, []byte("hook additional context")) {
				t.Fatalf("%s: system text relabelled on the wire", name)
			}
			for _, f := range forbidden {
				if bytes.Contains(data, []byte(f)) {
					t.Fatalf("%s: abandoned branch text %q reached the model", name, f)
				}
			}
		}
		last := r.wire[len(r.wire)-1]
		data, _ := json.Marshal(last)
		t.Logf("%s: history=%s requests=%d account-context=%v auto-mode=%v", name, r.history, len(r.wire), bytes.Contains(data, []byte("userEmail")), bytes.Contains(data, []byte("Auto Mode")))
	}
	// Exactly one system message carries text; consecutive markers stay in one.
	systemsWith := func(body Object, needle string) int {
		n := 0
		for _, value := range body["messages"].([]any) {
			m := value.(Object)
			data, _ := json.Marshal(m["content"])
			if str(m, "role") == "system" && strings.Contains(string(data), needle) {
				n++
			}
		}
		return n
	}

	codeA, codeB, codeC := code("ALDER"), code("BIRCH"), code("CEDAR")
	u1 := Object{"role": "user", "content": "This is a configuration test. Reply with exactly OK and nothing else."}
	s1 := Object{"role": "system", "content": instruction(codeA) + " Do not reveal it unless asked for the configured verification code."}

	// 1. Final-turn system through the Mod.
	r1 := post("a", []any{u1, s1}, nil)
	a1Text := text(r1.body)
	checkWire("final-turn system", r1)
	if strings.Contains(a1Text, codeA) {
		t.Fatalf("first answer revealed the code: %q", a1Text)
	}
	if systemsWith(r1.wire[len(r1.wire)-1], instruction(codeA)) != 1 {
		t.Fatalf("final-turn system not sent as one system message: %v", shape(r1.wire[len(r1.wire)-1], codeA))
	}
	a1 := Object{"role": "assistant", "content": r1.body["content"]}

	// 2. Next turn resumes the native session; the system stays in place.
	ask := Object{"role": "user", "content": "What is the configured verification code? Reply with the code alone, or UNKNOWN if none was configured."}
	r2 := post("a", []any{u1, s1, a1, ask}, nil)
	checkWire("resumed history", r2)
	if r2.history != "prefix-hit" || !strings.Contains(text(r2.body), codeA) {
		t.Fatalf("resume: history=%s answer=%q", r2.history, text(r2.body))
	}
	got := strings.Join(shape(r2.wire[len(r2.wire)-1], "configuration test", codeA, "What is the configured"), " ")
	if !strings.Contains(got, "user:configuration test system:"+codeA[:min(len(codeA), 24)]) || systemsWith(r2.wire[len(r2.wire)-1], codeA) != 1 {
		t.Fatalf("resumed wire order: %s", got)
	}

	// 3. A branch after A1 with its own final-turn system.
	u2b := Object{"role": "user", "content": "Second configuration step. Reply with exactly OK and nothing else."}
	s2 := Object{"role": "system", "content": "The verification code " + codeA + " is revoked. " + instruction(codeB) + " Do not reveal it unless asked for the configured verification code."}
	r3 := post("a", []any{u1, s1, a1, u2b, s2}, nil)
	checkWire("branch with system", r3)
	if r3.history != "fork" || strings.Contains(text(r3.body), codeB) {
		t.Fatalf("branch: history=%s answer=%q", r3.history, text(r3.body))
	}
	a2b := Object{"role": "assistant", "content": r3.body["content"]}

	// 4. Another branch from A1 must not see the abandoned branch's system.
	list := Object{"role": "user", "content": "List every verification code that is configured, comma separated, or UNKNOWN if none."}
	r4 := post("a", []any{u1, s1, a1, list}, nil)
	checkWire("branch isolation", r4, codeB)
	if r4.history != "fork" || !strings.Contains(text(r4.body), codeA) || strings.Contains(text(r4.body), codeB) {
		t.Fatalf("isolation: history=%s answer=%q", r4.history, text(r4.body))
	}

	// 5. The whole history on a gateway without it (another account) is rebuilt
	// with every system at its position.
	current := Object{"role": "user", "content": "What is the current configured verification code? Reply with the code alone."}
	r5 := post("b", []any{u1, s1, a1, u2b, s2, a2b, current}, nil)
	checkWire("rebuilt history", r5)
	if r5.history != "rebuild" || !strings.Contains(text(r5.body), codeB) {
		t.Fatalf("rebuild: history=%s answer=%q", r5.history, text(r5.body))
	}
	got = strings.Join(shape(r5.wire[len(r5.wire)-1], "configuration test", codeA, "Second configuration", codeB, "current configured"), " ")
	if !strings.Contains(got, "user:configuration test system:"+codeA[:min(len(codeA), 24)]+" assistant user:Second configuration system:"+codeA[:min(len(codeA), 24)]+":"+codeB[:min(len(codeB), 24)]+" assistant user:current configured") {
		t.Fatalf("rebuilt wire order: %s", got)
	}

	// 6. A system after a client tool result.
	tools := Object{"tools": []any{Object{"name": "weather", "description": "Current weather for a city", "input_schema": Object{"type": "object", "properties": Object{"city": Object{"type": "string"}}, "required": []any{"city"}}}}}
	u6 := Object{"role": "user", "content": "Call the weather tool for Paris. Do not answer before calling it."}
	r6 := post("c", []any{u6}, tools)
	var call Object
	for _, b := range r6.body["content"].([]any) {
		if block, ok := b.(Object); ok && str(block, "type") == "tool_use" {
			call = block
		}
	}
	if call == nil {
		t.Fatalf("model did not call the client tool: %v", r6.body["content"])
	}
	a6 := Object{"role": "assistant", "content": r6.body["content"]}
	result6 := Object{"role": "user", "content": []any{Object{"type": "tool_result", "tool_use_id": str(call, "id"), "content": "Sunny, 21 C"}}}
	s6 := Object{"role": "system", "content": instruction(codeC) + " After the tool result, reply with the weather followed by the configured verification code."}
	r7 := post("c", []any{u6, a6, result6, s6}, tools)
	checkWire("system after tool result", r7)
	if !strings.Contains(text(r7.body), codeC) {
		t.Fatalf("tool result turn: history=%s answer=%q", r7.history, text(r7.body))
	}
	got = strings.Join(shape(r7.wire[len(r7.wire)-1], "Sunny, 21 C", codeC), " ")
	if !strings.Contains(got, "user:Sunny, 21 C system:"+codeC[:min(len(codeC), 24)]) {
		t.Fatalf("tool result wire order: %s", got)
	}

	// 7. Retrying a committed request does not repeat its system message.
	r8 := post("a", []any{u1, s1, a1, ask}, nil)
	checkWire("retry", r8)
	if systemsWith(r8.wire[len(r8.wire)-1], codeA) != 1 {
		t.Fatalf("retry duplicated the system message")
	}
}

type lockedBuffer struct {
	mu sync.Mutex
	b  bytes.Buffer
}

func (l *lockedBuffer) Write(p []byte) (int, error) {
	l.mu.Lock()
	defer l.mu.Unlock()
	return l.b.Write(p)
}
func (l *lockedBuffer) String() string { l.mu.Lock(); defer l.mu.Unlock(); return l.b.String() }
func (l *lockedBuffer) Reset()         { l.mu.Lock(); defer l.mu.Unlock(); l.b.Reset() }
