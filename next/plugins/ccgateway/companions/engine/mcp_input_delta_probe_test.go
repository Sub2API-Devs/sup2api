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
	"sync/atomic"
	"testing"
	"time"
)

func TestRealCLIMCPInputDeltaTransportProbe(t *testing.T) {
	cli := os.Getenv("CCG_REAL_CLI")
	if cli == "" {
		t.Skip("set CCG_REAL_CLI")
	}
	for _, mode := range []string{"initial", "empty", "nonempty", "empty_then_nonempty", "initial_sse", "empty_sse", "nonempty_sse", "empty_then_nonempty_sse"} {
		t.Run(mode, func(t *testing.T) {
			stream := strings.HasSuffix(mode, "_sse")
			mode = strings.TrimSuffix(mode, "_sse")
			var canceled atomic.Bool
			up := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
				if !strings.HasSuffix(r.URL.Path, "/messages") {
					fmt.Fprint(w, `{"input_tokens":1}`)
					return
				}
				w.Header().Set("Content-Type", "text/event-stream")
				send := func(e Object) {
					b, _ := json.Marshal(e)
					fmt.Fprintf(w, "event: %s\ndata: %s\n\n", str(e, "type"), b)
					w.(http.Flusher).Flush()
				}
				send(Object{"type": "message_start", "message": Object{"id": "msg_fixture_delta", "type": "message", "role": "assistant", "model": "claude-opus-5-5", "content": []any{}, "stop_reason": nil, "usage": Object{"input_tokens": 1, "output_tokens": 1}}})
				input := Object{}
				if mode == "initial" {
					input["repoName"] = "modelcontextprotocol/python-sdk"
				}
				send(Object{"type": "content_block_start", "index": 0, "content_block": Object{"type": "mcp_tool_use", "id": "mcp_fixture", "server_name": "one", "name": "read_wiki_structure", "input": input}})
				if strings.Contains(mode, "empty") && !strings.HasPrefix(mode, "nonempty") {
					send(Object{"type": "content_block_delta", "index": 0, "delta": Object{"type": "input_json_delta", "partial_json": ""}})
				}
				if strings.Contains(mode, "nonempty") {
					send(Object{"type": "content_block_delta", "index": 0, "delta": Object{"type": "input_json_delta", "partial_json": `{"repoName":"modelcontextprotocol/python-sdk"}`}})
				}
				select {
				case <-r.Context().Done():
					canceled.Store(true)
					return
				case <-time.After(300 * time.Millisecond):
				}
				send(Object{"type": "content_block_stop", "index": 0})
				send(Object{"type": "content_block_start", "index": 1, "content_block": Object{"type": "mcp_tool_result", "tool_use_id": "mcp_fixture", "content": []any{Object{"type": "text", "text": "public topics"}}, "is_error": false}})
				send(Object{"type": "content_block_stop", "index": 1})
				send(Object{"type": "message_delta", "delta": Object{"stop_reason": "end_turn", "stop_sequence": nil}, "usage": Object{"output_tokens": 2}})
				send(Object{"type": "message_stop"})
			}))
			defer up.Close()
			root := t.TempDir()
			plugin, err := extractMod(root)
			if err != nil {
				t.Fatal(err)
			}
			version, err := checkVersion(cli)
			if err != nil {
				t.Fatal(err)
			}
			cache, err := newCache(filepath.Join(root, "cache"), 8<<20)
			if err != nil {
				t.Fatal(err)
			}
			var stderr bytes.Buffer
			g := &Gateway{Runner: &Runner{CLI: cli, Version: version, Plugin: plugin, Work: root, Env: messageProbeEnv(root, up.URL), Stderr: &stderr}, Cache: cache, Timeout: 10 * time.Second, Slots: make(chan struct{}, 1), RequestLogDir: filepath.Join(root, "logs")}
			body := Object{"model": "claude-opus-5-5", "max_tokens": 128, "messages": []any{Object{"role": "user", "content": "public fixture"}}, "mcp_servers": []any{Object{"type": "url", "url": "https://one.example.test/mcp", "name": "one"}}, "tools": []any{Object{"type": "mcp_toolset", "mcp_server_name": "one"}}}
			body["stream"] = stream
			if mode == "nonempty" {
				body["mcp_servers"].([]any)[0].(Object)["authorization_token"] = "fixture-mcp-guard-token"
			}
			raw, _ := json.Marshal(body)
			req := httptest.NewRequest("POST", "/v1/messages", bytes.NewReader(raw))
			req.Header.Set("anthropic-beta", mcpConnectorBeta)
			rec := httptest.NewRecorder()
			g.ServeHTTP(rec, req)
			b, _ := io.ReadAll(rec.Result().Body)
			t.Logf("mode=%s status=%d canceledBeforeTerminal=%t stderr=%q body=%s", mode, rec.Code, canceled.Load(), stderr.String(), b)
			if rec.Code != 200 || canceled.Load() || !bytes.Contains(b, []byte("mcp_tool_result")) {
				t.Errorf("MCP input transport failed")
			}
		})
	}
}
