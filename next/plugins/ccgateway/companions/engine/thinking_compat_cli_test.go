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

// thinking_disabled_compat omit: the upstream request carries no thinking,
// exactly as for a client that sent none, and nothing else changes; pass
// forwards disabled as sent. The same in relay passthrough (2026-10-11: Claude
// Code's title requests got the API's 400 there).
func TestRealCLIThinkingDisabledCompat(t *testing.T) {
	for _, mode := range []string{"legacy", "passthrough"} {
		t.Run(mode, func(t *testing.T) { testRealCLIThinkingDisabledCompat(t, mode) })
	}
}

func testRealCLIThinkingDisabledCompat(t *testing.T, mode string) {
	cli := os.Getenv("CCG_REAL_CLI")
	if cli == "" {
		t.Skip("set CCG_REAL_CLI for the thinking compatibility test")
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
		body, err := decodeObject(raw)
		if err != nil {
			t.Error(err)
			return
		}
		mu.Lock()
		captured = append(captured, body)
		mu.Unlock()
		writeSurfaceFixture(w, str(body, "model"), []Object{{"type": "text", "text": "yes"}})
	}))
	defer fake.Close()
	base := []string{}
	for _, key := range []string{"PATH", "SystemRoot", "WINDIR", "COMSPEC", "TEMP", "TMP", "PATHEXT", "APPDATA", "LOCALAPPDATA", "CLAUDE_CODE_GIT_BASH_PATH"} {
		if value := os.Getenv(key); value != "" {
			base = append(base, key+"="+value)
		}
	}
	env := envWith(base, map[string]string{"HOME": root, "USERPROFILE": root, "CLAUDE_CONFIG_DIR": filepath.Join(root, "config"), "ANTHROPIC_API_KEY": "dummy-thinking-fixture", "ANTHROPIC_BASE_URL": fake.URL, "CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC": "1"})
	runner := &Runner{CLI: cli, Version: version, Plugin: plugin, Work: root, Env: env}
	cache, err := newCache(filepath.Join(t.TempDir(), "cache"), 32<<20)
	if err != nil {
		t.Fatal(err)
	}
	g := &Gateway{Runner: runner, Cache: cache, Timeout: 35 * time.Second, Slots: make(chan struct{}, 2)}
	send := func(label, compat string, thinking Object) Object {
		p := defaultRequestPolicy()
		p.ThinkingDisabledCompat = compat
		p.RelayMode = mode
		body := Object{"model": "claude-opus-5-5", "max_tokens": 64, "messages": []any{Object{"role": "user", "content": "Answer yes or no: is 1 < 2?"}}}
		if thinking != nil {
			body["thinking"] = thinking
		}
		raw, _ := json.Marshal(body)
		req := httptest.NewRequest("POST", "/v1/messages", bytes.NewReader(raw))
		req.Header = policyHeaders(p)
		req.Header.Set("Content-Type", "application/json")
		setTestSession(t, req, "thinking-compat-"+mode+"-"+label)
		res := httptest.NewRecorder()
		mu.Lock()
		before := len(captured)
		mu.Unlock()
		g.ServeHTTP(res, req)
		if res.Code != 200 || !strings.Contains(res.Body.String(), "yes") {
			t.Fatalf("%s: HTTP%d %s", label, res.Code, res.Body.String())
		}
		mu.Lock()
		defer mu.Unlock()
		if len(captured) != before+1 {
			t.Fatalf("%s: %d upstream requests", label, len(captured)-before)
		}
		return captured[before]
	}
	// Everything but the per-session parts: the billing header (its suffix
	// follows the prompt and session) and metadata.
	shape := func(body Object) string {
		copy := Object{}
		for k, v := range body {
			if k != "metadata" {
				copy[k] = v
			}
		}
		var system []any
		for _, block := range body["system"].([]any) {
			if !strings.HasPrefix(str(block.(map[string]any), "text"), "x-anthropic-billing-header:") {
				system = append(system, block)
			}
		}
		copy["system"] = system
		raw, _ := json.Marshal(copy)
		return string(raw)
	}
	omitted := send("omit", "omit", Object{"type": "disabled"})
	baseline := send("absent", "pass", nil)
	passed := send("pass", "pass", Object{"type": "disabled"})
	if _, ok := omitted["thinking"]; ok {
		t.Fatalf("omit sent thinking: %v", omitted["thinking"])
	}
	if shape(omitted) != shape(baseline) {
		t.Fatalf("omit changed the request:\n%s\n%s", shape(omitted), shape(baseline))
	}
	if digest(passed["thinking"]) != digest(Object{"type": "disabled"}) {
		t.Fatalf("pass changed thinking: %v", passed["thinking"])
	}
}
