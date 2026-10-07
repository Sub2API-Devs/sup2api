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

func writeCompactionFixture(w http.ResponseWriter, model, kind string) {
	w.Header().Set("Content-Type", "text/event-stream")
	send := func(e Object) {
		raw, _ := json.Marshal(e)
		fmt.Fprintf(w, "event: %s\ndata: %s\n\n", str(e, "type"), raw)
	}
	send(Object{"type": "message_start", "message": Object{"id": "msg_context_fixture", "type": "message", "role": "assistant", "model": model, "content": []any{}, "stop_reason": nil, "stop_sequence": nil, "usage": Object{"input_tokens": 0, "output_tokens": 0}}})
	reason := "compaction"
	switch kind {
	case "signed":
		send(Object{"type": "content_block_start", "index": 0, "content_block": Object{"type": "compaction", "content": "SUMMARY_FIXTURE", "signature": "opaque_fixture_signature", "encrypted_content": "opaque_fixture_metadata", "tool_changes": []any{}}})
		send(Object{"type": "content_block_stop", "index": 0})
	case "threshold":
		send(Object{"type": "content_block_start", "index": 0, "content_block": Object{"type": "compaction", "content": ""}})
		send(Object{"type": "content_block_delta", "index": 0, "delta": Object{"type": "compaction_delta", "content": "SUMMARY_FIXTURE"}})
		send(Object{"type": "content_block_stop", "index": 0})
	case "empty":
		reason = "max_tokens"
	case "noop":
		send(Object{"type": "content_block_start", "index": 0, "content_block": Object{"type": "compaction", "content": nil, "signature": nil, "encrypted_content": nil, "tool_changes": nil}})
		send(Object{"type": "content_block_stop", "index": 0})
	default:
		reason = "end_turn"
		send(Object{"type": "content_block_start", "index": 0, "content_block": Object{"type": "text", "text": "CONTEXT_REPLY"}})
		send(Object{"type": "content_block_stop", "index": 0})
	}
	send(Object{"type": "message_delta", "delta": Object{"stop_reason": reason, "stop_sequence": nil}, "usage": Object{"output_tokens": 0, "iterations": []any{Object{"type": "compaction", "input_tokens": 20, "output_tokens": 5}}}, "context_management": Object{"applied_edits": []any{Object{"type": "clear_tool_uses_20250919", "cleared_tool_uses": 1, "cleared_input_tokens": 12}}}})
	send(Object{"type": "message_stop"})
}

func TestRealCLIContextCompactionGateway(t *testing.T) {
	cli := os.Getenv("CCG_REAL_CLI")
	if cli == "" {
		t.Skip("set CCG_REAL_CLI")
	}
	version, err := checkVersion(cli)
	if err != nil {
		t.Fatal(err)
	}
	for _, kind := range []string{"context", "signed", "threshold", "empty", "noop", "noop-history", "signed-replay", "signed-user-replay", "threshold-replay"} {
		t.Run(kind, func(t *testing.T) {
			root := t.TempDir()
			plugin, err := extractMod(root)
			if err != nil {
				t.Fatal(err)
			}
			var mu sync.Mutex
			var captures []Object
			fake := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
				if !strings.HasSuffix(r.URL.Path, "/messages") {
					fmt.Fprint(w, `{}`)
					return
				}
				raw, _ := io.ReadAll(r.Body)
				o, _ := decodeObject(raw)
				mu.Lock()
				captures = append(captures, o)
				mu.Unlock()
				writeCompactionFixture(w, str(o, "model"), kind)
			}))
			defer fake.Close()
			cache, err := newCache(filepath.Join(root, "cache"), 32<<20)
			if err != nil {
				t.Fatal(err)
			}
			g := &Gateway{Runner: &Runner{CLI: cli, Version: version, Plugin: plugin, Work: root, Env: messageProbeEnv(root, fake.URL)}, Cache: cache, Timeout: 20 * time.Second, Slots: make(chan struct{}, 1)}
			body := Object{"model": "claude-opus-5-5", "max_tokens": 32, "messages": []any{Object{"role": "user", "content": "summarize"}, Object{"role": "assistant", "content": "prior answer"}}}
			beta := signedCompactionBeta
			switch kind {
			case "signed", "empty", "noop":
				body["compaction"] = Object{"type": "summarize"}
			case "context":
				beta = contextBeta
				body["context_management"] = Object{"edits": []any{Object{"type": "clear_thinking_20251015", "keep": "all"}, Object{"type": "clear_tool_uses_20250919"}}}
			case "threshold":
				beta = thresholdCompactionBeta
				body["context_management"] = Object{"edits": []any{Object{"type": "compact_20260112", "pause_after_compaction": true}}}
			case "signed-replay":
				body["messages"] = []any{Object{"role": "assistant", "content": []any{Object{"type": "compaction", "content": "SUMMARY_FIXTURE", "signature": "opaque_fixture_signature", "encrypted_content": "opaque_fixture_metadata", "tool_changes": []any{}}}}, Object{"role": "user", "content": "continue"}}
			case "noop-history":
				body["messages"] = []any{Object{"role": "assistant", "content": []any{Object{"type": "compaction", "content": nil, "signature": nil, "encrypted_content": nil, "tool_changes": nil}}}, Object{"role": "user", "content": "continue"}}
			case "signed-user-replay":
				body["messages"] = []any{Object{"role": "user", "content": []any{Object{"type": "compaction", "content": "SUMMARY_FIXTURE", "signature": "opaque_fixture_signature", "encrypted_content": "opaque_fixture_metadata", "tool_changes": []any{}}, Object{"type": "text", "text": "continue"}}}}
			case "threshold-replay":
				beta = thresholdCompactionBeta
				body["messages"] = []any{Object{"role": "user", "content": "original"}, Object{"role": "assistant", "content": []any{Object{"type": "compaction", "content": "SUMMARY_FIXTURE"}}}}
			}
			for _, stream := range []bool{false, true} {
				body["stream"] = stream
				raw, _ := json.Marshal(body)
				req := httptest.NewRequest("POST", "/v1/messages", bytes.NewReader(raw))
				req.Header.Set("anthropic-beta", beta)
				resp := httptest.NewRecorder()
				g.ServeHTTP(resp, req)
				if resp.Code != 200 {
					t.Fatalf("stream=%v HTTP%d %s", stream, resp.Code, resp.Body.String())
				}
				mu.Lock()
				count := len(captures)
				wire := captures[count-1]
				mu.Unlock()
				wantCount := 1
				if stream {
					wantCount = 2
				}
				if count != wantCount {
					t.Fatalf("implicit retries: %d", count)
				}
				for _, key := range []string{"context_management", "compaction"} {
					if value, ok := body[key]; ok && digest(value) != digest(wire[key]) {
						t.Fatalf("%s changed", key)
					}
				}
				if strings.HasSuffix(kind, "replay") {
					wireRaw, _ := json.Marshal(wire["messages"])
					if !bytes.Contains(wireRaw, []byte("SUMMARY_FIXTURE")) {
						t.Fatal("summary lost")
					}
					if kind == "signed-replay" && !bytes.Contains(wireRaw, []byte("opaque_fixture_signature")) {
						t.Fatal("signature lost")
					}
				}
				if !strings.Contains(resp.Body.String(), "applied_edits") || !strings.Contains(resp.Body.String(), "iterations") {
					t.Fatal("response metadata lost")
				}
				if kind == "signed" && (!strings.Contains(resp.Body.String(), "opaque_fixture_signature") || !strings.Contains(resp.Body.String(), "opaque_fixture_metadata") || !strings.Contains(resp.Body.String(), `"tool_changes":[]`)) {
					t.Fatal("response signature lost")
				}
				if !stream && kind == "empty" {
					answer, _ := decodeObject(resp.Body.Bytes())
					blocks, _ := answer["content"].([]any)
					if len(blocks) != 0 || str(answer, "stop_reason") != "max_tokens" {
						t.Fatal("empty terminal changed")
					}
				}
				t.Logf("CLI=%s stream=%v exact request/terminal/metadata; calls=%d", version, stream, count)
			}
		})
	}
}
