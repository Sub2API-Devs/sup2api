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
	"strings"
	"sync"
	"testing"
	"time"
)

// Raw CLI surface probe, not a gateway compatibility claim. EXTRA_BODY is
// experiment-only. No built-in tools are enabled and no tool is executed.
func TestRealCLIClientToolsetSurfaceProbe(t *testing.T) {
	cli := os.Getenv("CCG_REAL_CLI")
	if cli == "" {
		t.Skip("set CCG_REAL_CLI")
	}
	version, err := checkVersion(cli)
	if err != nil {
		t.Fatal(err)
	}
	for _, tc := range []struct {
		name       string
		tool, call Object
	}{
		{"typed-bash", Object{"type": "bash_20250124", "name": "bash"}, Object{"type": "tool_use", "id": "tool_fixture", "name": "bash", "input": Object{"command": "echo FIXTURE_ONLY"}}},
		{"typed-editor", Object{"type": "text_editor_20250728", "name": "str_replace_based_edit_tool"}, Object{"type": "tool_use", "id": "tool_fixture", "name": "str_replace_based_edit_tool", "input": Object{"command": "view", "path": "/nonexistent/fixture"}}},
		{"computer-toolset", Object{"type": "computer_toolset_20260801"}, Object{"type": "tool_use", "id": "tool_fixture", "name": "screenshot", "toolset_name": "computer", "input": Object{}}},
		{"browser-toolset", Object{"type": "browser_toolset_20260801"}, Object{"type": "tool_use", "id": "tool_fixture", "name": "screenshot", "toolset_name": "browser", "input": Object{}}},
	} {
		t.Run(tc.name, func(t *testing.T) {
			root := t.TempDir()
			var mu sync.Mutex
			var requests []Object
			fake := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
				if !strings.HasSuffix(r.URL.Path, "/messages") {
					fmt.Fprint(w, `{}`)
					return
				}
				raw, _ := io.ReadAll(r.Body)
				body, _ := decodeObject(raw)
				mu.Lock()
				requests = append(requests, body)
				count := len(requests)
				mu.Unlock()
				if count > 1 {
					writeDocumentProbeReply(w, str(body, "model"), false)
					return
				}
				writeSurfaceFixture(w, str(body, "model"), []Object{tc.call})
			}))
			defer fake.Close()
			extra, _ := json.Marshal(Object{"tools": []any{tc.tool}})
			ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
			defer cancel()
			cmd := exec.CommandContext(ctx, cli, "-p", "FIXTURE_PROTOCOL_ONLY", "--model", "claude-opus-5-5", "--output-format", "stream-json", "--verbose", "--include-partial-messages", "--tools", "", "--max-turns", "1", "--thinking", "disabled", "--setting-sources", "", "--settings", `{"disableAllHooks":true}`)
			cmd.Dir = root
			cmd.Env = envWith(messageProbeEnv(root, fake.URL), map[string]string{"CLAUDE_CODE_EXTRA_BODY": string(extra)})
			out, runErr := cmd.CombinedOutput()
			mu.Lock()
			captured := append([]Object(nil), requests...)
			mu.Unlock()
			if len(captured) == 0 {
				t.Fatalf("no model request: %v", runErr)
			}
			if digest(captured[0]["tools"]) != digest([]any{tc.tool}) {
				t.Fatal("experiment tools changed")
			}
			matched := false
			for _, line := range bytes.Split(out, []byte{10}) {
				frame, _ := decodeObject(line)
				event, _ := frame["event"].(map[string]any)
				if str(event, "type") != "content_block_start" {
					continue
				}
				block, _ := event["content_block"].(map[string]any)
				if str(block, "id") != "tool_fixture" {
					continue
				}
				matched = str(block, "name") == str(tc.call, "name") && str(block, "toolset_name") == str(tc.call, "toolset_name")
			}
			if !matched {
				t.Fatal("CLI stream lost requested tool identity")
			}
			t.Logf("CLI=%s request definition preserved and stream member identity preserved; registered local tools=0; calls=%d; CLI exit error=%v (no dispatch compatibility claimed)", version, len(captured), runErr != nil)
		})
	}
}
