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

// EXTRA_BODY here is a transport research fixture, never a production setting.
func TestRealCLIThinkingAndAPIOutputSurface(t *testing.T) {
	cli := os.Getenv("CCG_REAL_CLI")
	if cli == "" {
		t.Skip("set CCG_REAL_CLI")
	}
	version, err := checkVersion(cli)
	if err != nil {
		t.Fatal(err)
	}
	schema := Object{"type": "json_schema", "schema": Object{"type": "object", "properties": Object{"ok": Object{"type": "boolean"}}, "required": []any{"ok"}, "additionalProperties": false}}
	for _, test := range []struct {
		name       string
		args       []string
		extra      Object
		stop, text string
	}{
		{name: "thinking-absent"},
		{name: "thinking-disabled", args: []string{"--thinking", "disabled"}},
		{name: "thinking-adaptive", args: []string{"--thinking", "adaptive"}},
		{name: "thinking-updates-flag", args: []string{"--thinking", "adaptive", "--thinking-display", "updates"}},
		{name: "thinking-between-tools-flag", args: []string{"--thinking", "between_tools"}},
		{name: "thinking-binding-wire", extra: Object{"thinking": Object{"type": "adaptive", "display": "updates", "block_binding": Object{"prefix_mismatch_behavior": "error"}}}},
		{name: "api-schema-text", extra: Object{"output_config": Object{"format": schema}}, text: `{"ok":true}`},
		{name: "api-schema-refusal", extra: Object{"output_config": Object{"format": schema}}, stop: "refusal", text: "fixture refusal"},
		{name: "api-schema-truncation", extra: Object{"output_config": Object{"format": schema}}, stop: "max_tokens", text: `{"ok":`},
	} {
		t.Run(test.name, func(t *testing.T) {
			root := t.TempDir()
			var mu sync.Mutex
			var requests []Object
			server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
				if !strings.HasSuffix(r.URL.Path, "/messages") {
					fmt.Fprint(w, `{"input_tokens":1}`)
					return
				}
				raw, _ := io.ReadAll(r.Body)
				body, err := decodeObject(raw)
				if err != nil {
					http.Error(w, "fixture", 400)
					return
				}
				mu.Lock()
				requests = append(requests, body)
				mu.Unlock()
				stop := test.stop
				if stop == "" {
					stop = "end_turn"
				}
				content := test.text
				if content == "" {
					content = "FIXTURE_OUTPUT"
				}
				w.Header().Set("Content-Type", "text/event-stream")
				for _, event := range []Object{
					{"type": "message_start", "message": Object{"id": "msg_thinking_output_probe", "type": "message", "role": "assistant", "model": body["model"], "content": []any{}, "stop_reason": nil, "stop_sequence": nil, "usage": Object{"input_tokens": 2, "output_tokens": 0}}},
					{"type": "content_block_start", "index": 0, "content_block": Object{"type": "text", "text": ""}},
					{"type": "content_block_delta", "index": 0, "delta": Object{"type": "text_delta", "text": content}},
					{"type": "content_block_stop", "index": 0},
					{"type": "message_delta", "delta": Object{"stop_reason": stop, "stop_sequence": nil}, "usage": Object{"output_tokens": 3}},
					{"type": "message_stop"},
				} {
					raw, _ := json.Marshal(event)
					fmt.Fprintf(w, "event: %s\ndata: %s\n\n", str(event, "type"), raw)
				}
			}))
			defer server.Close()
			base := []string{}
			for _, key := range []string{"PATH", "SystemRoot", "WINDIR", "COMSPEC", "TEMP", "TMP", "PATHEXT", "APPDATA", "LOCALAPPDATA"} {
				if v := os.Getenv(key); v != "" {
					base = append(base, key+"="+v)
				}
			}
			ctx, cancel := context.WithTimeout(context.Background(), 12*time.Second)
			defer cancel()
			args := []string{"-p", "Isolated API output fixture", "--model", "claude-opus-5-5", "--output-format", "stream-json", "--verbose", "--include-partial-messages", "--tools", "", "--max-turns", "1", "--setting-sources", "", "--settings", `{"disableAllHooks":true}`}
			args = append(args, test.args...)
			extra := ""
			if test.extra != nil {
				raw, _ := json.Marshal(test.extra)
				extra = string(raw)
			}
			cmd := exec.CommandContext(ctx, cli, args...)
			cmd.Dir = root
			cmd.Env = envWith(base, map[string]string{"HOME": root, "USERPROFILE": root, "CLAUDE_CONFIG_DIR": filepath.Join(root, "config"), "ANTHROPIC_API_KEY": "dummy-thinking-output-fixture", "ANTHROPIC_BASE_URL": server.URL, "CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC": "1", "DISABLE_AUTOUPDATER": "1", "CLAUDE_CODE_EXTRA_BODY": extra})
			out, runErr := cmd.CombinedOutput()
			paths, _ := filepath.Glob(filepath.Join(root, "config", "projects", "*", "*.jsonl"))
			native := false
			for _, path := range paths {
				data, _ := os.ReadFile(path)
				native = native || bytes.Contains(data, []byte("msg_thinking_output_probe"))
			}
			mu.Lock()
			defer mu.Unlock()
			var thinking, output any
			synthetic := false
			if len(requests) > 0 {
				thinking = requests[0]["thinking"]
				output = requests[0]["output_config"]
				data, _ := json.Marshal(requests[0]["tools"])
				synthetic = bytes.Contains(data, []byte("StructuredOutput"))
			}
			tv, _ := json.Marshal(thinking)
			ov, _ := json.Marshal(output)
			t.Logf("CLI=%s requests=%d thinking=%s output_config=%s synthetic_tool=%t stream_stop=%t native=%t exit=%v", version, len(requests), tv, ov, synthetic, bytes.Contains(out, []byte(`"type":"message_stop"`)), native, runErr)
			if len(requests) == 0 {
				t.Logf("CLI rejected args: %s", out)
				return
			}
			if test.extra != nil && test.extra["output_config"] != nil {
				if synthetic || output == nil || !bytes.Contains(out, []byte(`"type":"message_stop"`)) || !native {
					t.Fatal("API schema transport did not preserve normal response path")
				}
			}
		})
	}
}
