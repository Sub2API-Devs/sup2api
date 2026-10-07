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

// This transport probe deliberately uses EXTRA_BODY only as an experiment.
// Production plans must instead apply scoped, validated main-request fields.
func TestRealCLITokenLimitSurface(t *testing.T) {
	cli := os.Getenv("CCG_REAL_CLI")
	if cli == "" {
		t.Skip("set CCG_REAL_CLI")
	}
	version, err := checkVersion(cli)
	if err != nil {
		t.Fatal(err)
	}
	for _, scenario := range []struct{ name, limit, extra string }{{"zero-env", "0", ""}, {"one-env", "1", ""}, {"large-env", "1000000", ""}, {"zero-extra-body", "1", `{"max_tokens":0}`}} {
		t.Run(scenario.name, func(t *testing.T) {
			root := t.TempDir()
			var mu sync.Mutex
			var limits []any
			server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
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
				limits = append(limits, body["max_tokens"])
				mu.Unlock()
				w.Header().Set("Content-Type", "text/event-stream")
				send := func(event Object) {
					raw, _ := json.Marshal(event)
					fmt.Fprintf(w, "event: %s\ndata: %s\n\n", str(event, "type"), raw)
				}
				send(Object{"type": "message_start", "message": Object{"id": "msg_zero_limit_fixture", "role": "assistant", "type": "message", "model": body["model"], "content": []any{}, "stop_reason": nil, "stop_sequence": nil, "usage": Object{"input_tokens": 0, "cache_creation_input_tokens": 2048, "output_tokens": 0}}})
				send(Object{"type": "message_delta", "delta": Object{"stop_reason": "max_tokens", "stop_sequence": nil}, "usage": Object{"output_tokens": 0}})
				send(Object{"type": "message_stop"})
			}))
			defer server.Close()
			base := []string{}
			for _, key := range []string{"PATH", "SystemRoot", "WINDIR", "COMSPEC", "TEMP", "TMP", "PATHEXT", "APPDATA", "LOCALAPPDATA"} {
				if value := os.Getenv(key); value != "" {
					base = append(base, key+"="+value)
				}
			}
			ctx, cancel := context.WithTimeout(context.Background(), 20*time.Second)
			defer cancel()
			cmd := exec.CommandContext(ctx, cli, "-p", "Token limit fixture", "--model", "claude-opus-5-5", "--output-format", "stream-json", "--verbose", "--include-partial-messages", "--tools", "", "--max-turns", "1", "--thinking", "disabled", "--setting-sources", "", "--settings", `{"disableAllHooks":true}`)
			cmd.Dir = root
			cmd.Env = envWith(base, map[string]string{"HOME": root, "USERPROFILE": root, "CLAUDE_CONFIG_DIR": filepath.Join(root, "config"), "ANTHROPIC_API_KEY": "dummy-limit-fixture", "ANTHROPIC_BASE_URL": server.URL, "CLAUDE_CODE_MAX_OUTPUT_TOKENS": scenario.limit, "CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC": "1", "DISABLE_AUTOUPDATER": "1", "CLAUDE_CODE_EXTRA_BODY": scenario.extra})
			out, runErr := cmd.CombinedOutput()
			paths, _ := filepath.Glob(filepath.Join(root, "config", "projects", "*", "*.jsonl"))
			nativeHasAssistant := false
			for _, path := range paths {
				raw, _ := os.ReadFile(path)
				if bytes.Contains(raw, []byte("msg_zero_limit_fixture")) {
					nativeHasAssistant = true
				}
			}
			mu.Lock()
			defer mu.Unlock()
			t.Logf("CLI %s requested_env=%s extra_zero=%t wire_limits=%v stream_max_tokens=%t stream_stop=%t native_assistant=%t process_error=%v", version, scenario.limit, scenario.extra != "", limits, bytes.Contains(out, []byte(`"stop_reason":"max_tokens"`)), bytes.Contains(out, []byte(`"type":"message_stop"`)), nativeHasAssistant, runErr)
			if len(limits) == 0 {
				t.Fatal("CLI did not reach isolated upstream")
			}
			if scenario.extra != "" && limits[0] != json.Number("0") {
				t.Fatal("experimental zero body override did not reach upstream")
			}
		})
	}
}
