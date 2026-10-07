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

func TestRealCLIClientToolDescriptionsAreExact(t *testing.T) {
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
	description := "Client … ellipsis, — dash, 中文, \"quotes\", and exact\nline break."
	var mu sync.Mutex
	var captured Object
	upstream := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if !strings.HasSuffix(r.URL.Path, "/messages") {
			fmt.Fprint(w, `{"input_tokens":1}`)
			return
		}
		data, _ := io.ReadAll(r.Body)
		body, err := decodeObject(data)
		if err != nil {
			http.Error(w, "fixture", 400)
			return
		}
		mu.Lock()
		captured = body
		mu.Unlock()
		writeSurfaceFixture(w, str(body, "model"), []Object{{"type": "text", "text": "DESCRIPTION_OK"}})
	}))
	defer upstream.Close()
	base := []string{}
	for _, key := range []string{"PATH", "SystemRoot", "WINDIR", "COMSPEC", "TEMP", "TMP", "PATHEXT", "APPDATA", "LOCALAPPDATA"} {
		if value := os.Getenv(key); value != "" {
			base = append(base, key+"="+value)
		}
	}
	env := envWith(base, map[string]string{"HOME": root, "USERPROFILE": root, "CLAUDE_CONFIG_DIR": filepath.Join(root, "config"), "ANTHROPIC_API_KEY": "dummy-description-fixture", "ANTHROPIC_BASE_URL": upstream.URL, "CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC": "1"})
	cache, err := newCache(filepath.Join(root, "cache"), 8<<20)
	if err != nil {
		t.Fatal(err)
	}
	gateway := httptest.NewServer(&Gateway{Runner: &Runner{CLI: cli, Version: version, Plugin: plugin, Work: root, Env: env}, Cache: cache, Timeout: 25 * time.Second, Slots: make(chan struct{}, 1)})
	defer gateway.Close()
	tools := []Tool{{Name: "Read", Description: description, Schema: Object{"type": "object", "properties": Object{"different_client_argument": Object{"type": "string"}}}}, {Name: "mcp__client__lookup", Description: description, Schema: Object{"type": "object"}}, {Name: "plain", Description: description, Schema: Object{"type": "object"}}}
	if variants := verifiedNativeToolCatalogues[version]["Write"]; len(variants) > 0 {
		native := variants[0]
		native.Description = description
		tools = append(tools, native)
	}
	request := Object{"model": "claude-opus-5-5", "max_tokens": 64, "messages": []any{Object{"role": "user", "content": "Tool description fidelity fixture"}}, "tools": tools}
	data, _ := json.Marshal(request)
	response, err := http.Post(gateway.URL+"/v1/messages", "application/json", bytes.NewReader(data))
	if err != nil {
		t.Fatal(err)
	}
	defer response.Body.Close()
	out, _ := io.ReadAll(response.Body)
	if response.StatusCode != 200 || !bytes.Contains(out, []byte("DESCRIPTION_OK")) {
		t.Fatalf("HTTP %d %s", response.StatusCode, out)
	}
	mu.Lock()
	defer mu.Unlock()
	definitions, _ := captured["tools"].([]any)
	if len(definitions) != len(tools) {
		t.Fatal("tool definitions lost")
	}
	seen := map[string]bool{}
	for _, raw := range definitions {
		tool := raw.(map[string]any)
		seen[str(tool, "name")] = true
		if str(tool, "description") != description {
			t.Fatalf("CLI changed client description for %s", str(tool, "name"))
		}
	}
	for _, name := range []string{"mcp__ccgateway__Read", "mcp__client__lookup", "mcp__ccgateway__plain"} {
		if !seen[name] {
			t.Fatal("tool mapping changed", name)
		}
	}
}
