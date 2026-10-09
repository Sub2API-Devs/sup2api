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
	"strings"
	"sync"
	"testing"
	"time"
)

func TestCwdModProbe(t *testing.T) {
	cli := os.Getenv("CCG_REAL_CLI")
	if cli == "" {
		t.Skip("set CCG_REAL_CLI for attachment source verification")
	}
	version, err := checkVersion(cli)
	if err != nil {
		t.Fatal(err)
	}
	for _, source := range []string{"start_result", "start_input", "environment"} {
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
			modPath := filepath.Join(plugin, "hooks", "register.js")
			modSource, err := os.ReadFile(modPath)
			if err != nil {
				t.Fatal(err)
			}
			code := strings.ReplaceAll(string(modSource), "\r\n", "\n")
			virtual := "/client-only/project-does-not-exist"
			ending := "return next(e);\n  });\n  // Pending"
			if source == "start_result" {
				code = strings.Replace(code, ending, "return { ...(await next(e)), cwd: '"+virtual+"' };\n  });\n  // Pending", 1)
			}
			if source == "start_input" {
				code = strings.Replace(code, ending, "return next({ ...e, cwd: '"+virtual+"' });\n  });\n  // Pending", 1)
			}
			audit := "if (e.type === 'environment') { const internal = await $.session.cwd(); return { ...result, text: result.text + '\nCWD_PROBE_INTERNAL=' + internal }; }\n    "
			if source == "environment" {
				audit = "if (e.type === 'environment') { const internal = await $.session.cwd(); return { ...result, text: ' - Primary working directory: " + virtual + "\n - Platform: linux\nCWD_PROBE_INTERNAL=' + internal }; }\n    "
			}
			// JSON quoting is supplied by Go below for embedded JS newline escapes.
			audit = strings.ReplaceAll(audit, "\n", "\\n")
			audit = strings.ReplaceAll(audit, "}\\n    ", "}\n    ")
			code = strings.Replace(code, "const label = 'prompt.submit hook additional context: ';", audit+"const label = 'prompt.submit hook additional context: ';", 1)
			if err := os.WriteFile(modPath, []byte(code), 0600); err != nil {
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
			req.AttachmentSource = "both"
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
			var request Object
			if err := json.Unmarshal(captured, &request); err != nil {
				t.Fatal(err)
			}
			raw, _ := json.Marshal(request)
			t.Logf("mode=%s actual_work=%s virtual_visible=%v", source, p.Work, strings.Contains(string(raw), virtual))
			var walk func(any)
			walk = func(v any) {
				switch x := v.(type) {
				case map[string]any:
					for _, y := range x {
						walk(y)
					}
				case []any:
					for _, y := range x {
						walk(y)
					}
				case string:
					for _, line := range strings.Split(x, "\n") {
						if strings.Contains(line, "Primary working directory") || strings.Contains(line, "CWD_PROBE_INTERNAL=") {
							t.Log(line)
						}
					}
				}
			}
			walk(request)
			if (source == "environment") != strings.Contains(wire, virtual) {
				t.Fatal("unexpected virtual cwd behavior")
			}
		})
	}
}
