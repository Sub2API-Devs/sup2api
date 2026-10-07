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

// Raw CLI experiment only; EXTRA_BODY is not a production adapter.
func TestRealCLIContextCompactionSurface(t *testing.T) {
	cli := os.Getenv("CCG_REAL_CLI")
	if cli == "" {
		t.Skip("set CCG_REAL_CLI")
	}
	version, err := checkVersion(cli)
	if err != nil {
		t.Fatal(err)
	}
	for _, tc := range []struct {
		name, beta string
		extra      Object
	}{
		{"context-edits", "context-management-2025-06-27", Object{"context_management": Object{"edits": []any{Object{"type": "clear_thinking_20251015", "keep": "all"}, Object{"type": "clear_tool_uses_20250919", "keep": Object{"type": "tool_uses", "value": 3}, "exclude_tools": []string{"fixture"}}}}}},
		{"signed-compaction", "compact-2026-09-04", Object{"compaction": Object{"type": "summarize"}}},
		{"empty-compaction", "compact-2026-09-04", Object{"compaction": Object{"type": "summarize"}}},
		{"threshold-compaction", "compact-2026-01-12", Object{"context_management": Object{"edits": []any{Object{"type": "compact_20260112", "trigger": Object{"type": "input_tokens", "value": 100000}, "pause_after_compaction": true}}}}},
	} {
		t.Run(tc.name, func(t *testing.T) {
			root := t.TempDir()
			var mu sync.Mutex
			var captures []Object
			fake := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
				if !strings.HasSuffix(r.URL.Path, "/messages") {
					fmt.Fprint(w, "{}")
					return
				}
				raw, _ := io.ReadAll(r.Body)
				body, _ := decodeObject(raw)
				mu.Lock()
				captures = append(captures, body)
				n := len(captures)
				mu.Unlock()
				if n > 1 {
					writeDocumentProbeReply(w, str(body, "model"), false)
					return
				}
				w.Header().Set("Content-Type", "text/event-stream")
				send := func(event Object) {
					raw, _ := json.Marshal(event)
					fmt.Fprintln(w, "event: "+str(event, "type"))
					fmt.Fprintln(w, "data: "+string(raw))
					fmt.Fprintln(w)
				}
				send(Object{"type": "message_start", "message": Object{"id": "msg_compaction_probe", "type": "message", "role": "assistant", "model": body["model"], "content": []any{}, "stop_reason": nil, "stop_sequence": nil, "usage": Object{"input_tokens": 0, "output_tokens": 0}}})
				reason := "compaction"
				switch tc.name {
				case "signed-compaction":
					send(Object{"type": "content_block_start", "index": 0, "content_block": Object{"type": "compaction", "content": "COMPACTION_FIXTURE_SUMMARY", "signature": "opaque_fixture_signature"}})
					send(Object{"type": "content_block_stop", "index": 0})
				case "threshold-compaction":
					send(Object{"type": "content_block_start", "index": 0, "content_block": Object{"type": "compaction", "content": ""}})
					send(Object{"type": "content_block_delta", "index": 0, "delta": Object{"type": "compaction_delta", "content": "COMPACTION_FIXTURE_SUMMARY"}})
					send(Object{"type": "content_block_stop", "index": 0})
				case "empty-compaction":
					reason = "max_tokens"
				case "context-edits":
					reason = "end_turn"
					send(Object{"type": "content_block_start", "index": 0, "content_block": Object{"type": "text", "text": ""}})
					send(Object{"type": "content_block_delta", "index": 0, "delta": Object{"type": "text_delta", "text": "CONTEXT_FIXTURE_REPLY"}})
					send(Object{"type": "content_block_stop", "index": 0})
				}
				send(Object{"type": "message_delta", "delta": Object{"stop_reason": reason, "stop_sequence": nil}, "usage": Object{"output_tokens": 0, "iterations": []any{Object{"type": "compaction", "input_tokens": 20, "output_tokens": 5}}}, "context_management": Object{"applied_edits": []any{Object{"type": "clear_tool_uses_20250919", "cleared_tool_uses": 1, "cleared_input_tokens": 12}}}})
				send(Object{"type": "message_stop"})
			}))
			defer fake.Close()
			ctx, cancel := context.WithTimeout(context.Background(), 12*time.Second)
			defer cancel()
			settings, _ := json.Marshal(Object{"disableAllHooks": true})
			extra, _ := json.Marshal(tc.extra)
			cmd := exec.CommandContext(ctx, cli, "-p", "CONTEXT_FIXTURE_INPUT", "--model", "claude-opus-5-5", "--output-format", "stream-json", "--verbose", "--include-partial-messages", "--tools", "", "--max-turns", "1", "--thinking", "disabled", "--setting-sources", "", "--settings", string(settings), "--betas", tc.beta)
			cmd.Dir = root
			cmd.Env = envWith(messageProbeEnv(root, fake.URL), map[string]string{"CLAUDE_CODE_EXTRA_BODY": string(extra), "DISABLE_AUTO_COMPACT": "1"})
			output, runErr := cmd.CombinedOutput()
			replayPreserved := false
			if tc.name == "signed-compaction" {
				session := ""
				for _, line := range bytes.Split(output, []byte{10}) {
					frame, _ := decodeObject(line)
					if str(frame, "session_id") != "" {
						session = str(frame, "session_id")
					}
				}
				if session != "" {
					resume := exec.CommandContext(ctx, cli, "-p", "CONTINUE_AFTER_COMPACTION", "--resume", session, "--model", "claude-opus-5-5", "--output-format", "stream-json", "--verbose", "--include-partial-messages", "--tools", "", "--max-turns", "1", "--thinking", "disabled", "--setting-sources", "", "--settings", string(settings), "--betas", tc.beta)
					resume.Dir = root
					resume.Env = envWith(cmd.Env, map[string]string{"CLAUDE_CODE_EXTRA_BODY": ""})
					_, _ = resume.CombinedOutput()
					mu.Lock()
					if len(captures) > 1 {
						history, _ := json.Marshal(captures[len(captures)-1]["messages"])
						replayPreserved = bytes.Contains(history, []byte("COMPACTION_FIXTURE_SUMMARY")) && bytes.Contains(history, []byte("opaque_fixture_signature"))
					}
					mu.Unlock()
				}
			}
			paths, _ := filepath.Glob(filepath.Join(root, "config", "projects", "*", "*.jsonl"))
			native := []byte{}
			for _, path := range paths {
				raw, _ := os.ReadFile(path)
				native = append(native, raw...)
			}
			mu.Lock()
			defer mu.Unlock()
			if len(captures) == 0 {
				t.Fatal("no request reached isolated upstream")
			}
			preserved := true
			for key, value := range tc.extra {
				preserved = preserved && digest(value) == digest(captures[0][key])
			}
			t.Logf("CLI=%s scenario=%s request_fields_exact=%t requests=%d stream_summary=%t stream_signature=%t applied_edits=%t iterations=%t native_summary=%t native_signature=%t signed_replay=%t exit_error=%v timeout=%t",
				version, tc.name, preserved, len(captures), bytes.Contains(output, []byte("COMPACTION_FIXTURE_SUMMARY")), bytes.Contains(output, []byte("opaque_fixture_signature")), bytes.Contains(output, []byte("cleared_tool_uses")), bytes.Contains(output, []byte("iterations")), bytes.Contains(native, []byte("COMPACTION_FIXTURE_SUMMARY")), bytes.Contains(native, []byte("opaque_fixture_signature")), replayPreserved, runErr, ctx.Err() != nil)
		})
	}
}
