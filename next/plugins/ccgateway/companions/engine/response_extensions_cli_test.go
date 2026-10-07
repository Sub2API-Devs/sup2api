package engine

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"net/http/httptest"
	"os"
	"os/exec"
	"path/filepath"
	"strings"
	"testing"
	"time"
)

// Synthetic upstream observations test CLI transport/persistence, not whether
// an account is entitled to any feature or a real safeguard verdict is valid.
func TestRealCLIResponseEnvelopePersistence(t *testing.T) {
	cli := os.Getenv("CCG_REAL_CLI")
	if cli == "" {
		t.Skip("set CCG_REAL_CLI for isolated response envelope probe")
	}
	version, err := checkVersion(cli)
	if err != nil {
		t.Fatal(err)
	}
	root := t.TempDir()
	ext := Object{"safeguard_results": []any{}, "input_transformations": []any{Object{"type": "thinking_dropped", "reason": "fixture", "path": []any{"messages", 0}}}, "stop_details": Object{"type": "fixture"}, "context_management": Object{"applied_edits": []any{}}, "container": Object{"id": "container_fixture"}, "diagnostics": Object{"fixture": true}}
	upstream := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if !strings.HasSuffix(r.URL.Path, "/messages") {
			w.Header().Set("Content-Type", "application/json")
			fmt.Fprint(w, `{"input_tokens":1}`)
			return
		}
		w.Header().Set("Content-Type", "text/event-stream")
		send := func(event Object) {
			raw, _ := json.Marshal(event)
			fmt.Fprintf(w, "event: %s\ndata: %s\n\n", str(event, "type"), raw)
		}
		send(Object{"type": "message_start", "message": Object{"id": "msg_envelope_fixture", "type": "message", "role": "assistant", "model": "claude-opus-5-5", "content": []any{}, "stop_reason": nil, "stop_sequence": nil, "usage": Object{"input_tokens": 1, "output_tokens": 0}}})
		send(Object{"type": "content_block_start", "index": 0, "content_block": Object{"type": "text", "text": ""}})
		send(Object{"type": "content_block_delta", "index": 0, "delta": Object{"type": "text_delta", "text": "ENVELOPE_FIXTURE_OK"}})
		send(Object{"type": "content_block_stop", "index": 0})
		delta := Object{"stop_reason": "end_turn", "stop_sequence": nil}
		for k, v := range ext {
			delta[k] = v
		}
		send(Object{"type": "message_delta", "delta": delta, "usage": Object{"output_tokens": 3}})
		send(Object{"type": "message_stop"})
	}))
	defer upstream.Close()
	base := []string{}
	for _, k := range []string{"PATH", "SystemRoot", "WINDIR", "COMSPEC", "TEMP", "TMP", "PATHEXT", "APPDATA", "LOCALAPPDATA"} {
		if v := os.Getenv(k); v != "" {
			base = append(base, k+"="+v)
		}
	}
	ctx, cancel := context.WithTimeout(context.Background(), 35*time.Second)
	defer cancel()
	cmd := exec.CommandContext(ctx, cli, "-p", "ENVELOPE_PROBE", "--model", "claude-opus-5-5", "--output-format", "stream-json", "--verbose", "--include-partial-messages", "--tools", "", "--max-turns", "1", "--setting-sources", "", "--settings", `{"disableAllHooks":true}`)
	cmd.Dir = root
	cmd.Env = envWith(base, map[string]string{"HOME": root, "USERPROFILE": root, "CLAUDE_CONFIG_DIR": filepath.Join(root, "config"), "ANTHROPIC_API_KEY": "dummy-envelope-fixture", "ANTHROPIC_BASE_URL": upstream.URL, "CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC": "1", "DISABLE_AUTOUPDATER": "1"})
	out, err := cmd.CombinedOutput()
	if err != nil {
		t.Fatalf("CLI %s: %v (%d output bytes)", version, err, len(out))
	}
	paths, _ := filepath.Glob(filepath.Join(root, "config", "projects", "*", "*.jsonl"))
	var native []byte
	for _, path := range paths {
		b, err := os.ReadFile(path)
		if err != nil {
			t.Fatal(err)
		}
		native = append(native, b...)
	}
	if !bytes.Contains(out, []byte("ENVELOPE_FIXTURE_OK")) || len(native) == 0 {
		t.Fatal("missing fixture response or native transcript")
	}
	for _, field := range responseEnvelopeExtensions {
		key := []byte(`"` + field + `"`)
		streamPresent, nativePresent := bytes.Contains(out, key), bytes.Contains(native, key)
		t.Logf("CLI %s field=%s stream=%t native=%t", version, field, streamPresent, nativePresent)
		if !streamPresent {
			t.Errorf("CLI lost response field %s before Worker could forward it", field)
		}
	}
}
