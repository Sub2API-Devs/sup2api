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
	"os/exec"
	"path/filepath"
	"strings"
	"sync"
	"testing"
	"time"
)

// Native-history feasibility gate for the API's server-side search protocol.
// It deliberately bypasses gateway codecs and uses synthetic responses only.
func TestRealCLIServerSearchHistoryCompatibility(t *testing.T) {
	cli := os.Getenv("CCG_REAL_CLI")
	if cli == "" {
		t.Skip("set CCG_REAL_CLI for isolated server-search history probe")
	}
	version, err := checkVersion(cli)
	if err != nil {
		t.Fatal(err)
	}
	root := t.TempDir()
	search := []Object{
		{"type": "server_tool_use", "id": "srvtoolu_search_history", "name": "tool_search_tool_regex", "input": Object{"pattern": "weather"}},
		{"type": "tool_search_tool_result", "tool_use_id": "srvtoolu_search_history", "content": Object{"type": "tool_search_tool_search_result", "tool_references": []any{Object{"type": "tool_reference", "tool_name": "mcp__ccgateway__weather"}}}},
		{"type": "text", "text": "SEARCH_HISTORY_FIRST"},
	}
	var mu sync.Mutex
	var requests []Object
	fake := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if !strings.HasSuffix(r.URL.Path, "/messages") {
			w.Header().Set("Content-Type", "application/json")
			fmt.Fprint(w, `{"input_tokens":20}`)
			return
		}
		body, _ := io.ReadAll(r.Body)
		request, err := decodeObject(body)
		if err != nil {
			http.Error(w, "bad", 400)
			return
		}
		mu.Lock()
		requests = append(requests, request)
		index := len(requests)
		mu.Unlock()
		blocks := search
		if index > 1 {
			blocks = []Object{{"type": "text", "text": "SEARCH_HISTORY_NEXT"}}
		}
		writeSurfaceFixture(w, str(request, "model"), blocks)
	}))
	defer fake.Close()
	base := []string{}
	for _, key := range []string{"PATH", "SystemRoot", "WINDIR", "COMSPEC", "TEMP", "TMP", "PATHEXT", "APPDATA", "LOCALAPPDATA"} {
		if value := os.Getenv(key); value != "" {
			base = append(base, key+"="+value)
		}
	}
	env := envWith(base, map[string]string{"HOME": root, "USERPROFILE": root, "CLAUDE_CONFIG_DIR": filepath.Join(root, "config"), "ANTHROPIC_API_KEY": "dummy-server-history", "ANTHROPIC_BASE_URL": fake.URL, "CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC": "1", "DISABLE_AUTOUPDATER": "1", "ENABLE_TOOL_SEARCH": "false"})
	run := func(prompt string, extra ...string) []byte {
		t.Helper()
		ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
		defer cancel()
		args := []string{"-p", prompt, "--model", "claude-opus-5-5", "--output-format", "stream-json", "--verbose", "--tools", "", "--max-turns", "1", "--setting-sources", ""}
		args = append(args, extra...)
		cmd := exec.CommandContext(ctx, cli, args...)
		cmd.Dir = root
		cmd.Env = env
		out, err := cmd.CombinedOutput()
		if err != nil {
			t.Fatalf("raw CLI failed: %v (output bytes=%d)", err, len(out))
		}
		return out
	}
	first := run("SERVER_HISTORY_START")
	sessionID, anchor := "", ""
	for _, line := range bytes.Split(first, []byte{'\n'}) {
		frame, _ := decodeObject(line)
		if str(frame, "session_id") != "" {
			sessionID = str(frame, "session_id")
		}
		if str(frame, "type") == "assistant" {
			anchor = str(frame, "uuid")
		}
	}
	if sessionID == "" || anchor == "" {
		t.Fatal("CLI did not expose session/assistant anchor")
	}
	if !bytes.Contains(first, []byte("tool_search_tool_result")) || !bytes.Contains(first, []byte("tool_reference")) {
		t.Fatal("initial assistant output lost server-search blocks")
	}
	nativePaths, err := filepath.Glob(filepath.Join(root, "config", "projects", "*", sessionID+".jsonl"))
	if err != nil || len(nativePaths) != 1 {
		t.Fatal("initial native transcript not found")
	}
	initialRows, err := os.ReadFile(nativePaths[0])
	if err != nil {
		t.Fatal(err)
	}
	run("SERVER_HISTORY_CONTINUE", "--resume", sessionID)
	run("SERVER_HISTORY_BRANCH", "--resume", sessionID, "--resume-session-at", anchor, "--fork-session")
	importRoot := t.TempDir()
	importPath := filepath.Join(importRoot, "import.jsonl")
	if err := os.WriteFile(importPath, initialRows, 0600); err != nil {
		t.Fatal(err)
	}
	env = envWith(env, map[string]string{"HOME": importRoot, "USERPROFILE": importRoot, "CLAUDE_CONFIG_DIR": filepath.Join(importRoot, "config")})
	run("SERVER_HISTORY_IMPORTED", "--resume", importPath, "--fork-session")
	mu.Lock()
	defer mu.Unlock()
	if len(requests) != 4 {
		t.Fatalf("requests=%d want4; CLI may have tried internal continuation/execution", len(requests))
	}
	for i, request := range requests[1:] {
		var found []Object
		messages, _ := request["messages"].([]any)
		for _, value := range messages {
			message, _ := value.(map[string]any)
			blocks, _ := message["content"].([]any)
			for _, value := range blocks {
				block, _ := value.(map[string]any)
				if str(block, "type") == "server_tool_use" || str(block, "type") == "tool_search_tool_result" {
					delete(block, "cache_control")
					found = append(found, block)
				}
				if str(block, "type") == "tool_result" && str(block, "tool_use_id") == "srvtoolu_search_history" {
					t.Error("CLI synthesized client result for server-owned search")
				}
			}
		}
		if digest(found) != digest(search[:2]) {
			encoded, _ := json.Marshal(found)
			t.Errorf("continuation %d changed server-search protocol blocks: %s", i, encoded)
		}
		if i >= 1 {
			encoded, _ := json.Marshal(messages)
			if bytes.Contains(encoded, []byte("SERVER_HISTORY_CONTINUE")) {
				t.Error("branch included later continuation")
			}
		}
		t.Logf("CLI=%s step=%d preserved_server_blocks=%d", version, i+1, len(found))
	}
}
