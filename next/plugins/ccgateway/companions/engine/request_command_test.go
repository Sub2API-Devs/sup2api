package engine

import (
	"bytes"
	"encoding/json"
	"net/http/httptest"
	"os"
	"path/filepath"
	"runtime"
	"strings"
	"testing"
	"time"

	"github.com/Sub2API-Devs/sup2api/next/plugins/ccgateway/companions/contracts/features"
	"github.com/stretchr/testify/require"
)

func TestBuildAttachmentsReachCLIWithoutExtraGenerations(t *testing.T) {
	exe, err := lifecycleTestExecutable()
	require.NoError(t, err)
	sources := features.BuildAttachmentSources{"platform_name": "worker", "os_version": "worker"}
	facts, err := buildAttachmentEnvironment(sources)
	require.NoError(t, err)
	for _, mode := range []string{"build", "direct"} {
		t.Run(mode, func(t *testing.T) {
			root := t.TempDir()
			capture := filepath.Join(root, "requests.jsonl")
			g := &Gateway{RequestMode: mode, Key: "fixture",
				Runner: &Runner{CLI: exe, Version: "2.1.302", Work: root, Env: envWith(os.Environ(), map[string]string{
					"CCG_TEST_REQUEST_PEER": "capture", "CCG_TEST_REQUEST_READY": capture,
				})}, Slots: make(chan struct{}, 1), Timeout: 10 * time.Second}
			reminder := "<system-reminder>\n" + buildClientEnvironment + "</system-reminder>"
			rows := []any{Object{"role": "user", "content": reminder}}
			body := Object{"model": "fixture", "stream": true, "messages": rows}
			// Optional real-client capture, generated against a local mock.
			// The normal CI case remains self-contained.
			if fixture := os.Getenv("CCG_BUILD_ATTACHMENT_CAPTURE"); fixture != "" {
				raw, err := os.ReadFile(fixture)
				require.NoError(t, err)
				require.NoError(t, json.Unmarshal(raw, &body))
				rows = body["messages"].([]any)
			}
			for turn := 0; turn < 2; turn++ {
				body["messages"] = rows
				raw, _ := json.Marshal(body)
				req := httptest.NewRequest("POST", "/v1/messages", bytes.NewReader(raw))
				req.Header.Set("x-api-key", "fixture")
				req.Header.Set(policyHeader, `{"build_attachment_sources":{"platform_name":"worker","os_version":"worker"}}`)
				out := httptest.NewRecorder()
				g.ServeHTTP(out, req)
				require.Equal(t, 200, out.Code, out.Body.String())
				require.Equal(t, cancellationFirstEvent+"event: message_stop\ndata: {}\n\n", out.Body.String())
				captured, err := os.ReadFile(capture)
				require.NoError(t, err)
				lines := bytes.Split(bytes.TrimSpace(captured), []byte("\n"))
				require.Len(t, lines, turn+1, "exactly one CLI generation per client request")
				if mode == "direct" {
					require.Equal(t, raw, lines[turn])
				} else {
					expected, _, err := transformBuildAttachments(raw, sources, facts)
					require.NoError(t, err)
					expected, err = messagesBuildComponents(expected)
					require.NoError(t, err)
					require.JSONEq(t, string(expected), string(lines[turn]))
					require.Contains(t, string(lines[turn]), "PowerShell")
					require.Contains(t, string(lines[turn]), `D:\\`)
				}
				// The caller, not the Worker, supplies the next tool result.
				rows = append(rows, Object{"role": "assistant", "content": []any{Object{
					"type": "tool_use", "id": "t", "name": "Read", "input": Object{"file_path": "D:\\项目\\file"},
				}}}, Object{"role": "user", "content": []any{Object{"type": "tool_result", "tool_use_id": "t", "content": reminder}}})
			}
			require.Empty(t, g.Slots)
		})
	}
}

func TestMessagesBuildComponentsPreservesHistoryAndSchemas(t *testing.T) {
	raw := []byte(`{"model":"m","system":[{"type":"text","text":"policy","cache_control":{"type":"ephemeral"}}],"messages":[{"role":"assistant","content":[{"type":"tool_use","id":"t","name":"Bash","input":{"custom":9007199254740993}}]},{"role":"user","content":[{"type":"tool_result","tool_use_id":"t","content":"ok"},{"type":"text","text":"<system-reminder>keep position</system-reminder>"},{"type":"image","source":{"type":"base64","media_type":"image/png","data":"AAAA"}}]}],"tools":[{"name":"Bash","description":"custom","input_schema":{"type":"object","properties":{"custom":{"type":"integer"}}},"strict":true},{"type":"web_search_20250305","name":"web_search"}],"max_tokens":128,"stream":true,"unknown_generation_field":{"value":9007199254740993}}`)
	// Build rejects numbers the native JS runtime cannot exactly represent.
	if _, err := messagesBuildComponents(raw); err == nil {
		t.Fatal("unsafe integer accepted")
	}
	raw = []byte(strings.ReplaceAll(string(raw), "9007199254740993", "9007199254740991"))
	got, err := messagesBuildComponents(raw)
	if err != nil {
		t.Fatal(err)
	}
	var before, after map[string]json.RawMessage
	_ = json.Unmarshal(raw, &before)
	_ = json.Unmarshal(got, &after)
	if string(before["system"]) != string(after["systemPrompt"]) {
		t.Fatal("system cache fields lost")
	}
	var attachments []map[string]json.RawMessage
	_ = json.Unmarshal(after["attachments"], &attachments)
	if len(attachments) != 1 || string(attachments[0]["kind"]) != `"reminder"` {
		t.Fatal("reminder was not extracted", string(after["attachments"]))
	}
	var rows []map[string]json.RawMessage
	_ = json.Unmarshal(after["messages"], &rows)
	if len(rows) != 2 || !strings.Contains(string(rows[1]["content"]), `"ccgateway_text"`) || !strings.Contains(string(rows[1]["content"]), `"image"`) {
		t.Fatal("message positions lost")
	}
	if !strings.Contains(string(got), `9007199254740991`) || strings.Contains(string(got), `9007199254740992`) {
		t.Fatal("number precision lost")
	}
	var tools []map[string]json.RawMessage
	_ = json.Unmarshal(after["tools"], &tools)
	if string(tools[0]["inputSchema"]) != `{"type":"object","properties":{"custom":{"type":"integer"}}}` || string(tools[0]["strict"]) != "true" || tools[0]["input_schema"] != nil {
		t.Fatal(string(after["tools"]))
	}
	if string(tools[1]["type"]) != `"web_search_20250305"` {
		t.Fatal("server tool lost")
	}
	var parameters map[string]json.RawMessage
	_ = json.Unmarshal(after["parameters"], &parameters)
	if parameters["messages"] != nil || string(parameters["max_tokens"]) != "128" {
		t.Fatal(string(after["parameters"]))
	}
}

func TestMessagesBuildComponentsRejectsUnrepresentableSystem(t *testing.T) {
	for _, raw := range []string{`null`, `{}`, `{"model":"m","messages":[]}`, `{"model":"m","messages":[{}],"system":[{"type":"image"}]}`, `{"model":"m","messages":[{}],"system":[{"type":"text","text":"x","unknown_semantic":true}]}`} {
		if _, err := messagesBuildComponents([]byte(raw)); err == nil {
			t.Fatal("accepted", raw)
		}
	}
}

func TestRequestCommandForwardsThroughExecutable(t *testing.T) {
	if runtime.GOOS == "windows" {
		t.Skip("shell fixture; executed on Linux release host")
	}
	for _, mode := range []string{"direct", "build"} {
		t.Run(mode, func(t *testing.T) {
			root := t.TempDir()
			cli := filepath.Join(root, "claude")
			script := `#!/bin/sh
printf '%s\n' "$@" > "$FIXTURE/args"
while [ "$#" -gt 0 ]; do
  if [ "$1" = "--response-meta" ]; then shift; meta="$1"; fi
  shift
done
cat > "$FIXTURE/input"
printf '%s' '{"status":429,"headers":{"content-type":"application/json","retry-after":"7","content-encoding":"gzip","content-length":"999","set-cookie":"private"}}' > "$meta"
printf '%s' '{"type":"error","error":{"type":"rate_limit_error","message":"test"}}'
exit 2
`
			if err := os.WriteFile(cli, []byte(script), 0700); err != nil {
				t.Fatal(err)
			}
			g := &Gateway{RequestMode: mode, Key: "gateway", Runner: &Runner{CLI: cli, Work: root, Env: append(os.Environ(), "FIXTURE="+root)}, Slots: make(chan struct{}, 1), Timeout: time.Second}
			raw := "{ \"model\":\"m\", \"messages\":[{\"role\":\"user\",\"content\":\"hi\"}],\"max_tokens\":16 }\n"
			r := httptest.NewRequest("POST", "/v1/messages", strings.NewReader(raw))
			r.Header.Set("x-api-key", "gateway")
			r.Header.Set("anthropic-beta", "test-beta")
			out := httptest.NewRecorder()
			g.ServeHTTP(out, r)
			if out.Code != 429 || out.Header().Get("Retry-After") != "7" || out.Header().Get("Content-Encoding") != "" || out.Header().Get("Set-Cookie") != "" || !strings.Contains(out.Body.String(), `"rate_limit_error"`) {
				t.Fatalf("%d %v %s", out.Code, out.Header(), out.Body.String())
			}
			input, _ := os.ReadFile(filepath.Join(root, "input"))
			args, _ := os.ReadFile(filepath.Join(root, "args"))
			if mode == "direct" && string(input) != raw {
				t.Fatal("direct altered raw JSON")
			}
			if mode == "build" && !strings.Contains(string(input), `"systemPrompt"`) {
				t.Fatal("build received HTTP body")
			}
			if !strings.HasPrefix(string(args), "request\n--"+mode+"\n") || strings.Contains(string(args), "gateway") {
				t.Fatal("wrong command or leaked inbound credential", string(args))
			}
			if !strings.Contains(string(args), "--betas\ntest-beta\n") {
				t.Fatal("client beta was not passed independently")
			}
		})
	}
}

func TestRuntimeDefaultsToBuildAndRefusesRetiredHostMode(t *testing.T) {
	if runtime.GOOS == "windows" {
		t.Skip("Linux shell fixture")
	}
	root := t.TempDir()
	cli := filepath.Join(root, "claude")
	if err := os.WriteFile(cli, []byte("#!/bin/sh\nif [ \"$1\" = \"--version\" ]; then echo '2.1.302 (Claude Code)'; exit 0; fi\nexit 1\n"), 0700); err != nil {
		t.Fatal(err)
	}
	rt, err := NewRuntime(Options{CLI: cli, DataDir: root, Key: "fixture", AdminKey: "fixture-admin"})
	if err != nil {
		t.Fatal(err)
	}
	defer rt.Close()
	if rt.gateway.RequestMode != "build" {
		t.Fatalf("default mode: %s", rt.gateway.RequestMode)
	}
	r := httptest.NewRequest("POST", "/v1/messages", strings.NewReader(`{"model":"m","messages":[{"role":"user","content":"hi"}]}`))
	r.Header.Set("x-api-key", "fixture")
	r.Header.Set(policyHeader, `{"relay_mode":"native"}`)
	out := httptest.NewRecorder()
	rt.gateway.ServeHTTP(out, r)
	if out.Code != 409 {
		t.Fatalf("retired mode accepted: %d %s", out.Code, out.Body.String())
	}
	if _, err := NewRuntime(Options{RequestMode: "native"}); err == nil {
		t.Fatal("explicit native mode accepted")
	}
}

func TestRequestCommandAdmission(t *testing.T) {
	g := &Gateway{RequestMode: "direct", Key: "secret", Runner: &Runner{}, Slots: make(chan struct{}, 1)}
	r := httptest.NewRequest("POST", "/v1/messages", strings.NewReader(`{}`))
	out := httptest.NewRecorder()
	g.ServeHTTP(out, r)
	if out.Code != 401 {
		t.Fatal(out.Code)
	}
	r = httptest.NewRequest("POST", "/v1/messages", strings.NewReader(`{"model":"m"}`))
	r.Header.Set("x-api-key", "secret")
	g.Slots <- struct{}{}
	out = httptest.NewRecorder()
	g.ServeHTTP(out, r)
	if out.Code != 429 {
		t.Fatal(out.Code)
	}
}

func TestMessagesBuildComponentsRejectsMalformedTools(t *testing.T) {
	for _, tools := range []string{`[null]`, `[{}]`, `[{"name":"x"}]`, `[{"name":"x","input_schema":null}]`, `[{"name":"x","input_schema":[]}]`, `[{"name":"x","type":17}]`} {
		if _, err := messagesBuildComponents([]byte(`{"model":"m","messages":[{"role":"user","content":"x"}],"tools":` + tools + `}`)); err == nil {
			t.Fatal("accepted malformed tool", tools)
		}
	}
}

func TestRequestCommandCancelsNativeProcess(t *testing.T) {
	if runtime.GOOS == "windows" {
		t.Skip("shell fixture; executed on Linux release host")
	}
	root := t.TempDir()
	cli := filepath.Join(root, "claude")
	if err := os.WriteFile(cli, []byte("#!/bin/sh\nexec sleep 20\n"), 0700); err != nil {
		t.Fatal(err)
	}
	g := &Gateway{RequestMode: "direct", Key: "gateway", Runner: &Runner{CLI: cli, Work: root}, Slots: make(chan struct{}, 1), Timeout: 50 * time.Millisecond}
	r := httptest.NewRequest("POST", "/v1/messages", strings.NewReader(`{"model":"m"}`))
	r.Header.Set("x-api-key", "gateway")
	out := httptest.NewRecorder()
	start := time.Now()
	g.ServeHTTP(out, r)
	if out.Code != 504 || time.Since(start) > 3*time.Second || len(g.Slots) != 0 {
		t.Fatalf("status=%d elapsed=%s slots=%d", out.Code, time.Since(start), len(g.Slots))
	}
}
