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
)

func TestRealCLIToolResultSessionContextRoundtrip(t *testing.T) {
	for _, stream := range []bool{false, true} {
		t.Run(fmt.Sprint(stream), func(t *testing.T) {
			var embedded atomic.Int32
			handler := func(w http.ResponseWriter, r *http.Request) {
				if !strings.HasSuffix(r.URL.Path, "/messages") {
					fmt.Fprint(w, `{"input_tokens":1}`)
					return
				}
				raw, _ := io.ReadAll(r.Body)
				wire, _ := decodeObject(raw)
				messages, _ := json.Marshal(wire["messages"])
				blocks := []Object{{"type": "tool_use", "id": "tool_empty_args", "name": "mcp__ccgateway__lookup_fixture", "input": Object{}, "caller": Object{"type": "direct"}}}
				if bytes.Contains(messages, []byte("tool_result")) {
					found := 0
					for _, rawMessage := range wire["messages"].([]any) {
						m := rawMessage.(Object)
						content, _ := historyContent(m["content"])
						for _, block := range content {
							if str(block, "type") != "tool_result" {
								continue
							}
							text := str(block, "content")
							if text != "done" && (!strings.HasPrefix(text, "done\n\n<system-reminder>\n") || !strings.HasSuffix(text, "\n</system-reminder>") || strings.Count(text, "fixture@example.invalid") != 1) {
								t.Errorf("tool result context boundary mismatch length=%d", len(text))
							}
							if text != "done" {
								embedded.Add(1)
							}
							found++
						}
					}
					if bytes.Count(messages, []byte("fixture@example.invalid")) != 1 {
						t.Error("context lost or duplicated")
					}
					if found != 1 {
						t.Errorf("result count=%d", found)
					}
					blocks = []Object{{"type": "text", "text": "EMPTY_ARGS_DONE"}}
				}
				rec := httptest.NewRecorder()
				writeSurfaceFixture(rec, str(wire, "model"), blocks)
				data := bytes.ReplaceAll(rec.Body.Bytes(), []byte("msg_surface_probe"), []byte("msg_"+uuid()))
				if str(blocks[0], "type") == "tool_use" {
					extra := []byte("event: ping\ndata: {\"type\":\"ping\"}\n\nevent: content_block_delta\ndata: {\"type\":\"content_block_delta\",\"index\":0,\"delta\":{\"type\":\"input_json_delta\",\"partial_json\":\"\"}}\n\n")
					data = bytes.Replace(data, []byte("event: content_block_stop"), append(extra, []byte("event: content_block_stop")...), 1)
				}
				w.Header().Set("Content-Type", "text/event-stream")
				w.Write(data)
			}
			endpoint, _ := newThinkingOutputFixture(t, handler, func(env []string) []string {
				for _, entry := range env {
					if strings.HasPrefix(entry, "CLAUDE_CONFIG_DIR=") {
						dir := strings.TrimPrefix(entry, "CLAUDE_CONFIG_DIR=")
						if err := os.MkdirAll(dir, 0700); err != nil {
							t.Fatal(err)
						}
						if err := os.WriteFile(filepath.Join(dir, ".claude.json"), []byte(`{"oauthAccount":{"emailAddress":"fixture@example.invalid","accountUuid":"fixture-account","organizationUuid":"fixture-org"}}`), 0600); err != nil {
							t.Fatal(err)
						}
					}
				}
				return envWith(env, map[string]string{"ANTHROPIC_API_KEY": "", "CLAUDE_CODE_OAUTH_TOKEN": "dummy-session-context-fixture", "CLAUDE_CODE_USER_EMAIL": "fixture@example.invalid"})
			})
			user := Object{"role": "user", "content": "invoke lookup fixture"}
			body := Object{"model": "claude-opus-5-5", "max_tokens": 64, "stream": stream, "tools": []any{Object{"name": "lookup_fixture", "input_schema": Object{"type": "object", "properties": Object{}}}}, "messages": []any{user}}
			post := func(url, expected string) {
				t.Helper()
				raw, _ := json.Marshal(body)
				request, _ := http.NewRequest("POST", url+"/v1/messages", bytes.NewReader(raw))
				request.Header.Set("Content-Type", "application/json")
				request.Header.Set(policyHeader, `{"attachment_source":"gateway"}`)
				resp, err := http.DefaultClient.Do(request)
				if err != nil {
					t.Fatal(err)
				}
				out, _ := io.ReadAll(resp.Body)
				resp.Body.Close()
				if resp.StatusCode != 200 || !bytes.Contains(out, []byte(expected)) {
					t.Fatalf("HTTP%d %s", resp.StatusCode, out)
				}
			}
			post(endpoint, "tool_empty_args")
			body["messages"] = []any{user, Object{"role": "assistant", "content": []any{Object{"type": "tool_use", "id": "tool_empty_args", "name": "lookup_fixture", "input": Object{}, "caller": Object{"type": "direct"}}}}, Object{"role": "user", "content": []any{Object{"type": "tool_result", "tool_use_id": "tool_empty_args", "content": "done"}}}}
			post(endpoint, "EMPTY_ARGS_DONE")
			cold, _ := newThinkingOutputFixture(t, handler, func(env []string) []string {
				for _, entry := range env {
					if strings.HasPrefix(entry, "CLAUDE_CONFIG_DIR=") {
						dir := strings.TrimPrefix(entry, "CLAUDE_CONFIG_DIR=")
						if err := os.MkdirAll(dir, 0700); err != nil {
							t.Fatal(err)
						}
						if err := os.WriteFile(filepath.Join(dir, ".claude.json"), []byte(`{"oauthAccount":{"emailAddress":"fixture@example.invalid","accountUuid":"fixture-account","organizationUuid":"fixture-org"}}`), 0600); err != nil {
							t.Fatal(err)
						}
					}
				}
				return envWith(env, map[string]string{"ANTHROPIC_API_KEY": "", "CLAUDE_CODE_OAUTH_TOKEN": "dummy-session-context-fixture", "CLAUDE_CODE_USER_EMAIL": "fixture@example.invalid"})
			})
			post(cold, "EMPTY_ARGS_DONE")
			body["messages"] = []any{user}
			post(endpoint, "tool_empty_args")
			if embedded.Load() == 0 {
				t.Fatal("CLI never embedded session context inside tool result")
			}
		})
	}
}
