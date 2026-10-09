package engine

import (
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"net/http/httptest"
	"os"
	"path/filepath"
	"runtime"
	"strings"
	"sync"
	"testing"
	"time"
)

// Opt-in smoke test against the installed CLI, with synthetic credentials and
// a local mock upstream only. No live provider or user messages are involved.
// The runner forces system turns for requests with client system messages, so
// the mock (no first-party endpoint) sees them as on the Claude API; the relay
// must deliver exactly the client's system messages.
func TestSystemMessagesRealCLI(t *testing.T) {
	cli := os.Getenv("CCG_REAL_CLI")
	if cli == "" {
		t.Skip("set CCG_REAL_CLI for native recovery verification")
	}
	version, err := checkVersion(cli)
	if err != nil {
		t.Fatal(err)
	}
	for _, auth := range []string{"ANTHROPIC_API_KEY", "CLAUDE_CODE_OAUTH_TOKEN"} {
		for _, history := range []bool{false, true} {
			t.Run(fmt.Sprintf("%s/history=%v", auth, history), func(t *testing.T) {
				root := t.TempDir()
				plugin, err := extractMod(root)
				if err != nil {
					t.Fatal(err)
				}
				var mu sync.Mutex
				var captured []Object
				var authPresent bool
				fake := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
					if r.Method != "POST" || !strings.HasSuffix(r.URL.Path, "/messages") {
						w.Header().Set("Content-Type", "application/json")
						_, _ = io.WriteString(w, `{"input_tokens":20}`)
						return
					}
					raw, _ := io.ReadAll(r.Body)
					v, err := decodeObject(raw)
					if err != nil {
						http.Error(w, "bad", 400)
						return
					}
					wireMessages := v["messages"].([]any)
					for i, value := range wireMessages {
						message := value.(Object)
						if str(message, "role") != "system" {
							continue
						}
						content, _ := json.Marshal(message["content"])
						if string(content) == "[]" {
							continue
						}
						for j := i + 1; j < len(wireMessages); j++ {
							next := wireMessages[j].(Object)
							if str(next, "role") == "system" {
								continue
							}
							if str(next, "role") != "assistant" {
								t.Errorf("text system at %d precedes %s at %d", i, str(next, "role"), j)
								http.Error(w, "invalid system placement", 400)
								return
							}
							break
						}
					}
					mu.Lock()
					captured = append(captured, v)
					authPresent = r.Header.Get("X-Api-Key") != ""
					if auth == "CLAUDE_CODE_OAUTH_TOKEN" {
						authPresent = strings.HasPrefix(r.Header.Get("Authorization"), "Bearer ")
					}
					mu.Unlock()
					w.Header().Set("Content-Type", "text/event-stream")
					event := func(v Object) {
						b, _ := json.Marshal(v)
						fmt.Fprintf(w, "event: %s\ndata: %s\n\n", str(v, "type"), b)
						w.(http.Flusher).Flush()
					}
					event(Object{"type": "message_start", "message": Object{"id": "msg_fixture", "type": "message", "role": "assistant", "model": v["model"], "content": []any{}, "stop_reason": nil, "stop_sequence": nil, "usage": Object{"input_tokens": 20, "output_tokens": 0}}})
					event(Object{"type": "content_block_start", "index": 0, "content_block": Object{"type": "text", "text": ""}})
					event(Object{"type": "content_block_delta", "index": 0, "delta": Object{"type": "text_delta", "text": "TURN_ANSWER"}})
					event(Object{"type": "content_block_stop", "index": 0})
					event(Object{"type": "message_delta", "delta": Object{"stop_reason": "end_turn", "stop_sequence": nil}, "usage": Object{"output_tokens": 1}})
					event(Object{"type": "message_stop"})
				}))
				defer fake.Close()
				base := []string{}
				for _, k := range []string{"PATH", "SystemRoot", "WINDIR", "COMSPEC", "TEMP", "TMP", "PATHEXT", "APPDATA", "LOCALAPPDATA", "CCGATEWAY_ATTACHMENT_TRACE"} {
					if v := os.Getenv(k); v != "" {
						base = append(base, k+"="+v)
					}
				}
				env := envWith(base, map[string]string{"HOME": root, "USERPROFILE": root, "CLAUDE_CONFIG_DIR": filepath.Join(root, "config"), auth: "dummy-local-fixture", "ANTHROPIC_BASE_URL": fake.URL, "CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC": "1"})
				runner := &Runner{CLI: cli, Version: version, Plugin: plugin, Work: root, Env: env}
				gateway := httptest.NewServer(&Gateway{})
				defer gateway.Close()
				runner.InternalBaseURL = gateway.URL
				cache, err := newCache(filepath.Join(root, "cache"), 32<<20)
				if err != nil {
					t.Fatal(err)
				}
				// Client system messages as the client wrote them; the second ones
				// have several blocks, one with a blank line of its own.
				clientSystems := map[string]string{}
				system := func(marker string, content any) Object {
					m := Object{"role": "system", "content": content}
					if text, ok := content.(string); ok {
						content = []any{Object{"type": "text", "text": text}}
					}
					clientSystems[marker] = canonical(t, content)
					return m
				}
				messages := []any{Object{"role": "user", "content": "USER_FIRST"}}
				if history {
					messages = append(messages, system("MID_SYSTEM_A", "MID_SYSTEM_A"), system("HISTORY_SECOND", []any{Object{"type": "text", "text": "HISTORY_SECOND one\n\npara"}, Object{"type": "text", "text": "two"}}), Object{"role": "assistant", "content": []any{Object{"type": "thinking", "thinking": "", "signature": strings.Repeat("f", 1616)}, Object{"type": "tool_use", "id": "toolu_fixture", "name": "Bash", "input": Object{"command": "PREVIOUS_ANSWER"}}}}, Object{"role": "user", "content": []any{Object{"type": "tool_result", "tool_use_id": "toolu_fixture", "content": "USER_SECOND"}}})
				}
				messages = append(messages, system("MID_SYSTEM_B", []any{Object{"type": "text", "text": "MID_SYSTEM_B"}}), system("PENDING_SECOND", []any{Object{"type": "text", "text": "PENDING_SECOND a"}, Object{"type": "text", "text": "b\n"}}))
				req := parsed(t, Object{"model": "claude-opus-5-5", "max_tokens": 64, "thinking": Object{"type": "adaptive", "display": "omitted"}, "system": "TOP_SYSTEM", "messages": messages})
				if history {
					req.Native["Bash"] = false
					req.Thinking = Object{"type": "adaptive", "display": "omitted"}
					req.Tools = []Tool{verifiedNativeTools["Bash"]}
				}
				p, err := prepareHistory(req, cache, testBranch("fixture"), root, version)
				if err != nil {
					t.Fatal(err)
				}
				ctx, cancel := context.WithTimeout(context.Background(), 25*time.Second)
				defer cancel()
				events := 0
				answer, err := runner.run(ctx, req, p, root, func(Object) error { events++; return nil })
				if err != nil {
					t.Fatal(err)
				}
				if events == 0 {
					t.Fatal("stream events missing")
				}
				if err = p.commit(req, answer, cache, "fixture", root, version, time.Now()); err != nil {
					t.Fatal(err)
				}
				messages = append(messages, Object{"role": "assistant", "content": "TURN_ANSWER"}, Object{"role": "user", "content": "NEXT_USER"})
				nextReq := parsed(t, Object{"model": "claude-opus-5-5", "max_tokens": 64, "system": "TOP_SYSTEM", "messages": messages})
				if history {
					nextReq.Native["Bash"] = false
					nextReq.Thinking = Object{"type": "adaptive", "display": "omitted"}
					nextReq.Tools = []Tool{verifiedNativeTools["Bash"]}
				}
				nextPrepared, err := prepareHistory(nextReq, cache, testBranch("fixture"), root, version)
				if err != nil {
					t.Fatal(err)
				}
				if nextPrepared.Mode != "prefix-hit" {
					t.Fatalf("next turn mode %s, want prefix-hit", nextPrepared.Mode)
				}
				if _, err = runner.run(ctx, nextReq, nextPrepared, root, func(Object) error { return nil }); err != nil {
					t.Fatal(err)
				}
				mu.Lock()
				defer mu.Unlock()
				if len(captured) != 2 || !authPresent {
					t.Fatalf("upstream requests=%d, auth present=%v", len(captured), authPresent)
				}
				for turn, capture := range captured {
					if turn == 0 {
						thinking, _ := capture["thinking"].(Object)
						if str(thinking, "display") != "omitted" {
							t.Fatalf("thinking display not forwarded: %v", thinking)
						}
					}
					wire := capture["messages"].([]any)
					found := []string{}
					for _, value := range wire {
						m := value.(Object)
						data, _ := json.Marshal(m["content"])
						var markers []string
						for _, marker := range []string{"USER_FIRST", "MID_SYSTEM_A", "HISTORY_SECOND", "PREVIOUS_ANSWER", "USER_SECOND", "MID_SYSTEM_B", "PENDING_SECOND", "TURN_ANSWER", "NEXT_USER"} {
							if strings.Contains(string(data), marker) {
								markers = append(markers, marker)
								found = append(found, str(m, "role")+":"+marker)
							}
						}
						// Each client system message is its own wire message with the
						// client's blocks; the CLI's own system text carries none of them.
						if str(m, "role") == "system" && len(markers) > 0 {
							content := m["content"].([]any)
							last := content[len(content)-1].(Object)
							delete(last, "cache_control") // the CLI's breakpoint, kept at the run's end
							if len(markers) != 1 || canonical(t, content) != clientSystems[markers[0]] || len(m) != 2 {
								t.Fatalf("system message changed upstream: %s, want %s", canonical(t, m), clientSystems[markers[0]])
							}
						}
					}
					want := "user:USER_FIRST/system:MID_SYSTEM_B/system:PENDING_SECOND"
					if history {
						want = "user:USER_FIRST/system:MID_SYSTEM_A/system:HISTORY_SECOND/assistant:PREVIOUS_ANSWER/user:USER_SECOND/system:MID_SYSTEM_B/system:PENDING_SECOND"
					}
					if turn == 1 {
						want += "/assistant:TURN_ANSWER/user:NEXT_USER"
					}
					if strings.Join(found, "/") != want {
						t.Fatalf("role order=%v, want %s", found, want)
					}
					data, _ := json.Marshal(capture)
					if strings.Contains(string(data), "hook additional context") || strings.Count(string(data), "MID_SYSTEM_B") != 1 {
						t.Fatal("system text relabelled or repeated upstream")
					}
				}
			})
		}
	}
}

// TestAttachmentSourcePolicy verifies that the attachment_source policy
// controls which side's environment attachments reach the upstream.
func TestAttachmentSourcePolicy(t *testing.T) {
	cli := os.Getenv("CCG_REAL_CLI")
	if cli == "" {
		t.Skip("set CCG_REAL_CLI for attachment source verification")
	}
	version, err := checkVersion(cli)
	if err != nil {
		t.Fatal(err)
	}
	for _, source := range []string{"client", "gateway", "both", "fields_cc", "fields_cg", "fields_gc", "fields_gg", "fields_cc_history", "fields_cg_history", "fields_gc_history", "fields_gg_history"} {
		t.Run(source, func(t *testing.T) {
			root, err := os.MkdirTemp("", "ccg-attachment-test-"+source+"-")
			if err != nil {
				t.Fatal(err)
			}
			t.Logf("Test root: %s", root)
			// Don't defer cleanup so we can inspect files after failure
			plugin, err := extractMod(root)
			if err != nil {
				t.Fatal(err)
			}
			var mu sync.Mutex
			var captured []byte
			fake := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
				if r.Method != "POST" || !strings.HasSuffix(r.URL.Path, "/messages") {
					w.Header().Set("Content-Type", "application/json")
					_, _ = io.WriteString(w, `{"input_tokens":20}`)
					return
				}
				raw, _ := io.ReadAll(r.Body)
				mu.Lock()
				captured = raw
				mu.Unlock()
				w.Header().Set("Content-Type", "text/event-stream")
				event := func(v Object) {
					b, _ := json.Marshal(v)
					fmt.Fprintf(w, "event: %s\ndata: %s\n\n", str(v, "type"), b)
					w.(http.Flusher).Flush()
				}
				event(Object{"type": "message_start", "message": Object{"id": "msg_fixture", "type": "message", "role": "assistant", "model": "claude-opus-5-5", "content": []any{}, "stop_reason": nil, "stop_sequence": nil, "usage": Object{"input_tokens": 20, "output_tokens": 0}}})
				event(Object{"type": "content_block_start", "index": 0, "content_block": Object{"type": "text", "text": ""}})
				event(Object{"type": "content_block_delta", "index": 0, "delta": Object{"type": "text_delta", "text": "ok"}})
				event(Object{"type": "content_block_stop", "index": 0})
				event(Object{"type": "message_delta", "delta": Object{"stop_reason": "end_turn", "stop_sequence": nil}, "usage": Object{"output_tokens": 1}})
				event(Object{"type": "message_stop"})
			}))
			defer fake.Close()
			base := []string{}
			for _, k := range []string{"PATH", "SystemRoot", "WINDIR", "COMSPEC", "TEMP", "TMP", "PATHEXT", "APPDATA", "LOCALAPPDATA"} {
				if v := os.Getenv(k); v != "" {
					base = append(base, k+"="+v)
				}
			}
			traceDir := filepath.Join(root, "attachment-trace")
			os.MkdirAll(traceDir, 0700)
			env := envWith(base, map[string]string{"HOME": root, "USERPROFILE": root, "CLAUDE_CONFIG_DIR": filepath.Join(root, "config"), "ANTHROPIC_API_KEY": "dummy-local-fixture", "ANTHROPIC_BASE_URL": fake.URL, "CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC": "1", "CCGATEWAY_ATTACHMENT_TRACE": traceDir})
			runner := &Runner{CLI: cli, Version: version, Plugin: plugin, Work: root, Env: env}
			gateway := httptest.NewServer(&Gateway{})
			defer gateway.Close()
			runner.InternalBaseURL = gateway.URL
			cache, err := newCache(filepath.Join(root, "cache"), 32<<20)
			if err != nil {
				t.Fatal(err)
			}
			req := parsed(t, Object{"model": "claude-opus-5-5", "max_tokens": 64, "system": "CLIENT_SYSTEM", "messages": []any{Object{"role": "user", "content": "test"}, Object{"role": "system", "content": []any{Object{"type": "text", "text": "INLINE_CLIENT_MARKER"}}}}})
			req.AttachmentSource = source
			fieldCase := strings.HasPrefix(source, "fields_")
			clientPlatform := "linux"
			if runtime.GOOS == "linux" {
				clientPlatform = "win32"
			}
			if fieldCase {
				req.AttachmentSource = "both"
				choices := map[byte]string{'c': "client", 'g': "gateway"}
				req.EnvironmentFields = map[string]string{"workingDirectory": choices[source[7]], "platform": choices[source[8]]}
				req.System = append(req.System, "# Environment\nYou have been invoked in the following environment: \n - Primary working directory: /fixture/client-directory\n - Platform: "+clientPlatform+"\n")
				if strings.HasSuffix(source, "_history") {
					// A cold Worker must import the client's completed history.
					environment := req.System[len(req.System)-1]
					req.System = req.System[:len(req.System)-1]
					req.Messages = append([]Message{
						{Role: "user", Content: []Object{{"type": "text", "text": "previous question"}}},
						{Role: "system", Content: []Object{{"type": "text", "text": environment}}},
						{Role: "assistant", Content: []Object{{"type": "text", "text": "previous answer"}}},
					}, req.Messages...)
				}
				req.filterClientAttachments()
			}
			diagnostic := newRequestDiagnostic(httptest.NewRecorder(), httptest.NewRequest("POST", "/v1/messages", nil))
			diagnostic.store = &requestLogStore{root: filepath.Join(root, "request-logs"), enabled: true, active: map[*requestDiagnostic]bool{}}
			diagnostic.capture(httptest.NewRecorder(), httptest.NewRequest("POST", "/v1/messages", nil), "")
			req.diagnostic = diagnostic
			defer diagnostic.finish()
			p, err := prepareHistory(req, cache, testBranch("fixture"), root, version)
			if err != nil {
				t.Fatal(err)
			}
			ctx, cancel := context.WithTimeout(context.Background(), 25*time.Second)
			defer cancel()
			_, err = runner.run(ctx, req, p, root, func(Object) error { return nil })
			if err != nil {
				t.Fatal(err)
			}
			trace, err := os.ReadFile(filepath.Join(diagnostic.directory, "events.jsonl"))
			if err != nil {
				t.Fatal(err)
			}
			for _, event := range []string{"mod_ready", "mod_system", "mod_attachment", "cli_input", "cli_output", "upstream_response", "cli_finished"} {
				if !strings.Contains(string(trace), `"event":"`+event+`"`) {
					t.Fatal("missing trace event", event)
				}
			}
			mu.Lock()
			wire := string(captured)
			mu.Unlock()
			hasClient := strings.Contains(wire, "CLIENT_SYSTEM")
			if fieldCase {
				if strings.Contains(wire, "/fixture/client-directory") != (source[7] == 'c') || strings.Contains(wire, " - Platform: "+clientPlatform) != (source[8] == 'c') {
					t.Fatalf("field selection mismatch %s: %s", source, wire)
				}
				if strings.Count(wire, " - Primary working directory:") != 1 || strings.Count(wire, " - Platform:") != 1 {
					t.Fatalf("duplicate or missing environment field %s: %s", source, wire)
				}
			}
			hasInline := strings.Contains(wire, "INLINE_CLIENT_MARKER")
			if !hasInline {
				t.Fatalf("inline system policy mismatch: source=%s present=%v", source, hasInline)
			}
			hasGateway := strings.Contains(wire, "Today's date is") || strings.Contains(wire, "total_tokens") || strings.Contains(wire, "session_context")
			switch source {
			case "client":
				if !hasClient {
					t.Fatal("client system missing under attachment_source=client")
				}
				if hasGateway {
					t.Fatal("gateway attachments present under attachment_source=client")
				}
			case "gateway":
				if !hasClient {
					t.Logf("Request body: %s", wire)
					t.Fatal("client business system missing under attachment_source=gateway")
				}
				if !hasGateway {
					t.Fatal("gateway attachments missing under attachment_source=gateway")
				}
			case "both":
				if !hasClient {
					t.Fatal("client system missing under attachment_source=both")
				}
				if !hasGateway {
					t.Fatal("gateway attachments missing under attachment_source=both")
				}
			}
		})
	}
}
