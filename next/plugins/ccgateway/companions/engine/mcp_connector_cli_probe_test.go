package engine

import (
	"bytes"
	"context"
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

// Raw CLI transport probe, not Worker admission or real remote MCP execution.
func TestRealCLIMCPConnectorBlocksProbe(t *testing.T) {
	cli := os.Getenv("CCG_REAL_CLI")
	if cli == "" {
		t.Skip("set CCG_REAL_CLI for isolated connector probe")
	}
	version, err := checkVersion(cli)
	if err != nil {
		t.Fatal(err)
	}
	for _, text := range []bool{true, false} {
		t.Run(map[bool]string{true: "with-text", false: "only-mcp"}[text], func(t *testing.T) {
			root := t.TempDir()
			blocks := []Object{
				{"type": "mcp_tool_listing", "mcp_server_name": "fixture", "tools": []any{Object{"name": "echo", "description": "Fixture", "input_schema": Object{"type": "object"}}}},
				{"type": "mcp_tool_use", "id": "mcptoolu_fixture", "name": "echo", "server_name": "fixture", "input": Object{"value": "hello"}},
				{"type": "mcp_tool_result", "tool_use_id": "mcptoolu_fixture", "is_error": false, "content": []any{Object{"type": "text", "text": "MCP_RESULT"}}},
			}
			if text {
				blocks = append(blocks, Object{"type": "text", "text": "MCP_DONE"})
			}
			var mu sync.Mutex
			var calls []Object
			fake := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
				if !strings.HasSuffix(r.URL.Path, "/messages") {
					w.Write([]byte(`{"input_tokens":1}`))
					return
				}
				raw, _ := io.ReadAll(r.Body)
				body, _ := decodeObject(raw)
				mu.Lock()
				calls = append(calls, body)
				n := len(calls)
				mu.Unlock()
				if n == 1 {
					writeSurfaceFixture(w, str(body, "model"), blocks)
				} else {
					writeSurfaceFixture(w, str(body, "model"), []Object{{"type": "text", "text": "CONTINUED"}})
				}
			}))
			defer fake.Close()
			ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
			defer cancel()
			env := messageProbeEnv(root, fake.URL)
			cmd := exec.CommandContext(ctx, cli, "-p", "MCP fixture", "--model", "claude-opus-5-5", "--output-format", "stream-json", "--verbose", "--include-partial-messages", "--tools", "", "--max-turns", "1", "--setting-sources", "")
			cmd.Dir = root
			cmd.Env = env
			out, err := cmd.CombinedOutput()
			if err != nil {
				t.Fatalf("initial CLI error=%v bytes=%d", err, len(out))
			}
			sid := ""
			for _, line := range bytes.Split(out, []byte{'\n'}) {
				frame, _ := decodeObject(line)
				if str(frame, "session_id") != "" {
					sid = str(frame, "session_id")
				}
			}
			if sid == "" {
				t.Fatal("no session id")
			}
			for _, kind := range []string{"mcp_tool_listing", "mcp_tool_use", "mcp_tool_result"} {
				if !bytes.Contains(out, []byte(`"type":"`+kind+`"`)) {
					t.Fatalf("CLI response dropped %s", kind)
				}
			}
			resume := exec.CommandContext(ctx, cli, "-p", "continue", "--resume", sid, "--model", "claude-opus-5-5", "--output-format", "stream-json", "--verbose", "--tools", "", "--max-turns", "1", "--setting-sources", "")
			resume.Dir = root
			resume.Env = env
			next, err := resume.CombinedOutput()
			if err != nil {
				t.Fatalf("resume CLI error=%v bytes=%d", err, len(next))
			}
			mu.Lock()
			last := calls[len(calls)-1]
			count := len(calls)
			mu.Unlock()
			for _, block := range blocks {
				t.Logf("CLI=%s calls=%d history type=%s exact=%t", version, count, str(block, "type"), messageProbeContainsBlock(last, block))
				if !messageProbeContainsBlock(last, block) {
					t.Fatal("CLI changed MCP history block")
				}
			}
		})
	}
}
