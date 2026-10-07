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

func TestRealCLIAssistantTailContinuation(t *testing.T) {
	cli := os.Getenv("CCG_REAL_CLI")
	if cli == "" {
		t.Skip("set CCG_REAL_CLI")
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
	var seen []Object
	fake := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if !strings.HasSuffix(r.URL.Path, "/messages") {
			fmt.Fprint(w, `{}`)
			return
		}
		raw, _ := io.ReadAll(r.Body)
		body, _ := decodeObject(raw)
		mu.Lock()
		seen = append(seen, body)
		mu.Unlock()
		writeDocumentProbeReply(w, str(body, "model"), false)
	}))
	defer fake.Close()
	cache, err := newCache(filepath.Join(root, "cache"), 32<<20)
	if err != nil {
		t.Fatal(err)
	}
	g := &Gateway{Runner: &Runner{CLI: cli, Version: version, Plugin: plugin, Work: root, Env: messageProbeEnv(root, fake.URL)}, Cache: cache, Timeout: 20 * time.Second, Slots: make(chan struct{}, 1)}
	body := Object{"model": "claude-opus-5-5", "max_tokens": 32, "messages": []any{Object{"role": "user", "content": "Complete the phrase"}, Object{"role": "assistant", "content": "The answer is"}}}
	for _, stream := range []bool{false, true} {
		body["stream"] = stream
		raw, _ := json.Marshal(body)
		resp := httptest.NewRecorder()
		g.ServeHTTP(resp, httptest.NewRequest("POST", "/v1/messages", bytes.NewReader(raw)))
		if resp.Code != 200 {
			t.Fatalf("stream=%v HTTP%d %s", stream, resp.Code, resp.Body.String())
		}
		mu.Lock()
		capture := seen[len(seen)-1]
		count := len(seen)
		mu.Unlock()
		messages, _ := capture["messages"].([]any)
		last, _ := messages[len(messages)-1].(map[string]any)
		blocks, _ := historyContent(last["content"])
		if str(last, "role") != "assistant" || len(blocks) != 1 || str(blocks[0], "text") != "The answer is" {
			t.Fatalf("assistant prefill moved: %v", last)
		}
		wire, _ := json.Marshal(capture)
		if bytes.Contains(wire, []byte("ccgateway-continuation-")) {
			t.Fatal("transport marker leaked")
		}
		t.Logf("CLI=%s stream=%v assistant-tail exact, main requests=%d", version, stream, count)
	}
}
