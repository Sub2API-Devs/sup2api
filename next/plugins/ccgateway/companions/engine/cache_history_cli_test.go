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

func TestRealCLICacheHistoryAndNativeToolCompatibility(t *testing.T) {
	cli := os.Getenv("CCG_REAL_CLI")
	if cli == "" {
		t.Skip("set CCG_REAL_CLI for cache history compatibility")
	}
	version, err := checkVersion(cli)
	if err != nil {
		t.Fatal(err)
	}
	native := verifiedNativeToolCatalogues[version]["Read"]
	if len(native) == 0 {
		t.Fatal("actual CLI version has no captured Read schema")
	}
	root := t.TempDir()
	plugin, err := extractMod(root)
	if err != nil {
		t.Fatal(err)
	}
	var mu sync.Mutex
	var wire Object
	fake := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if !strings.HasSuffix(r.URL.Path, "/messages") {
			fmt.Fprint(w, `{"input_tokens":20}`)
			return
		}
		raw, _ := io.ReadAll(r.Body)
		body, _ := decodeObject(raw)
		mu.Lock()
		wire = body
		mu.Unlock()
		writeDocumentProbeReply(w, str(body, "model"), false)
	}))
	defer fake.Close()
	runner := &Runner{CLI: cli, Version: version, Plugin: plugin, Work: root, Env: messageProbeEnv(root, fake.URL)}
	gateway := func() *Gateway {
		cache, err := newCache(filepath.Join(t.TempDir(), "cache"), 32<<20)
		if err != nil {
			t.Fatal(err)
		}
		return &Gateway{Runner: runner, Cache: cache, Timeout: 35 * time.Second, Slots: make(chan struct{}, 1)}
	}
	g := gateway()
	user := Object{"role": "user", "content": []any{Object{"type": "text", "text": "CACHE_HISTORY_A", "cache_control": Object{"type": "ephemeral", "ttl": "5m"}}, Object{"type": "text", "text": "CACHE_HISTORY_B"}}}
	body := Object{"model": "claude-opus-5-5", "max_tokens": 32,
		"tools":    []any{Object{"name": "Read", "description": native[0].Description, "input_schema": native[0].Schema, "cache_control": Object{"type": "ephemeral", "ttl": "1h"}}},
		"system":   []any{Object{"type": "text", "text": "CACHE_SYSTEM_A", "cache_control": Object{"type": "ephemeral", "ttl": "1h"}}, Object{"type": "text", "text": "CACHE_SYSTEM_B"}},
		"messages": []any{user}}
	post := func(label, mode string, g *Gateway) Object {
		t.Helper()
		raw, _ := json.Marshal(body)
		request := httptest.NewRequest("POST", "/v1/messages", bytes.NewReader(raw))
		setTestSession(t, request, "cache-history-fixture")
		response := httptest.NewRecorder()
		g.ServeHTTP(response, request)
		if response.Code != 200 {
			t.Fatalf("%s HTTP%d %s", label, response.Code, response.Body.String())
		}
		if got := response.Header().Get("X-CCGateway-History"); mode != "" && got != mode {
			t.Fatalf("%s history=%s want %s", label, got, mode)
		}
		mu.Lock()
		markers := cacheProbeMarkers(wire, "")
		mu.Unlock()
		if len(markers) != 3 {
			t.Fatalf("%s unexpected breakpoint count=%d", label, len(markers))
		}
		expected := map[string]string{"Read": "1h", "CACHE_SYSTEM_A": "1h", "CACHE_HISTORY_A": "5m"}
		for _, marker := range markers {
			identity := str(marker, "fixture_text")
			if identity == "" {
				identity = str(marker, "tool")
			}
			control, _ := marker["value"].(map[string]any)
			if expected[identity] == "" || expected[identity] != str(control, "ttl") {
				t.Fatalf("%s moved cache marker %s", label, identity)
			}
			delete(expected, identity)
		}
		if len(expected) != 0 {
			t.Fatal("breakpoint missing", label)
		}
		t.Logf("CLI=%s %s native Read+system+user exact mixed TTL, history=%s", version, label, response.Header().Get("X-CCGateway-History"))
		if body["stream"] == true {
			if !strings.Contains(response.Body.String(), "event: message_stop") {
				t.Fatal("SSE incomplete")
			}
			return nil
		}
		answer, err := decodeObject(response.Body.Bytes())
		if err != nil {
			t.Fatal(err)
		}
		return answer
	}
	first := post("new", "rebuild", g)
	body["messages"] = []any{user, Object{"role": "assistant", "content": first["content"]}, Object{"role": "user", "content": "CONTINUE"}}
	second := post("continue", "prefix-hit", g)
	body["messages"] = append(body["messages"].([]any), Object{"role": "assistant", "content": second["content"]}, Object{"role": "user", "content": "LATER"})
	post("later", "prefix-hit", g)
	body["messages"] = []any{user, Object{"role": "assistant", "content": first["content"]}, Object{"role": "user", "content": "ALTERNATE"}}
	post("rollback", "fork", g)
	post("new-runtime-cache-import", "rebuild", gateway())
	body["messages"] = []any{user}
	body["stream"] = true
	post("SSE", "", g)
}
