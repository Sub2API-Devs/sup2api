package engine

import (
	"bytes"
	"encoding/json"
	"io"
	"net/http/httptest"
	"os"
	"path/filepath"
	"reflect"
	"runtime"
	"strings"
	"testing"
	"time"

	"github.com/Sub2API-Devs/sup2api/next/plugins/ccgateway/companions/contracts/features"
	"github.com/stretchr/testify/require"
)

func TestRequestCommandReportsContainerResourcesAndDisablesTelemetry(t *testing.T) {
	exe, err := lifecycleTestExecutable()
	require.NoError(t, err)
	for _, mode := range []string{"direct", "build"} {
		t.Run(mode, func(t *testing.T) {
			root := t.TempDir()
			target := filepath.Join(root, "child-env.json")
			g := &Gateway{RequestMode: mode, Key: "fixture", Slots: make(chan struct{}, 1), Timeout: 10 * time.Second, CLIInfo: buildCLI,
				Runner: &Runner{CLI: exe, Work: root, ReportContainerResources: true, Env: envWith(os.Environ(), map[string]string{
					"CCG_TEST_REQUEST_PEER": "capture", "CCG_TEST_REQUEST_READY": filepath.Join(root, "input.jsonl"),
					"CCG_TEST_REQUEST_ENV_CAPTURE": target, "CCG_HARDWARE_PROFILE_PATH": "untrusted-inherited.json",
					"CCG_REPORT_CONTAINER_RESOURCES":           "0",
					"CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC": "", "DISABLE_TELEMETRY": "",
					"DO_NOT_TRACK": "0", "DISABLE_ERROR_REPORTING": "", "CLAUDE_CODE_ENABLE_TELEMETRY": "1",
				})}}
			req := httptest.NewRequest("POST", "/v1/messages", strings.NewReader(`{"model":"fixture","messages":[{"role":"user","content":"hello"}],"max_tokens":16}`))
			req.Header.Set("x-api-key", "fixture")
			out := httptest.NewRecorder()
			g.ServeHTTP(out, req)
			require.Equal(t, 200, out.Code, out.Body.String())
			data, err := os.ReadFile(target)
			require.NoError(t, err)
			var child map[string]string
			require.NoError(t, json.Unmarshal(data, &child))
			for _, name := range []string{"CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC", "DISABLE_TELEMETRY", "DO_NOT_TRACK", "DISABLE_ERROR_REPORTING"} {
				require.Equal(t, "1", child[name], name)
			}
			require.Equal(t, "0", child["CLAUDE_CODE_ENABLE_TELEMETRY"])
			require.Equal(t, "1", child["CCG_REPORT_CONTAINER_RESOURCES"])
			require.Empty(t, child["CCG_HARDWARE_PROFILE_PATH"])
		})
	}
}

// Only an OAuth build request maps the client's identity; direct is a pure
// passthrough. Build always tells the CLI which metadata to keep, because its
// native builder would otherwise invent one.
func TestRequestCommandAppliesAccountIdentityOnlyForOAuth(t *testing.T) {
	exe, err := lifecycleTestExecutable()
	require.NoError(t, err)
	for _, mode := range []string{"direct", "build"} {
		for _, apiKey := range []bool{false, true} {
			name := mode
			if apiKey {
				name += "/api-key"
			}
			t.Run(name, func(t *testing.T) {
				root := t.TempDir()
				target := filepath.Join(root, "identity-env.json")
				config := t.TempDir()
				require.NoError(t, os.WriteFile(filepath.Join(config, ".claude.json"), []byte(`{"oauthAccount":{"emailAddress":"account@example.invalid"}}`), 0600))
				require.NoError(t, os.WriteFile(filepath.Join(config, ".credentials.json"), []byte(`{"claudeAiOauth":{"accessToken":"fixture"}}`), 0600))
				account := map[string]string{
					"CCG_TEST_REQUEST_PEER": "capture", "CCG_TEST_REQUEST_READY": filepath.Join(root, "input.jsonl"),
					"CCG_TEST_REQUEST_ENV_CAPTURE": target, requestIdentityEnv: "untrusted",
					"CLAUDE_CODE_REMOTE_SESSION_ID": "untrusted",
					"HOME":                          config, "CLAUDE_CONFIG_DIR": config, "CLAUDE_SECURESTORAGE_CONFIG_DIR": config,
				}
				remove := []string{"CLAUDE_CODE_USER_EMAIL"}
				if apiKey {
					account["ANTHROPIC_API_KEY"] = "fixture"
				} else {
					remove = append(remove, "ANTHROPIC_API_KEY")
				}
				g := &Gateway{RequestMode: mode, Key: "fixture", Slots: make(chan struct{}, 1), Timeout: 10 * time.Second,
					CLIInfo: cliRequestInfo{Version: "2.1.304", Capabilities: []string{"request_direct", "request_build", features.RequestIdentityCapability, features.BuildContentPreservationCapability}},
					Runner:  &Runner{CLI: exe, Work: root, Env: envWith(os.Environ(), account, remove...)}}
				require.NoError(t, g.configureRequestIdentity(root))
				body := `{"model":"fixture","messages":[{"role":"user","content":"hello"}],"metadata":{"user_id":"{\"device_id\":\"source-device\",\"session_id\":\"source-session\"}"}}`
				request := httptest.NewRequest("POST", "/v1/messages", strings.NewReader(body))
				request.Header.Set("x-api-key", "fixture")
				response := httptest.NewRecorder()
				g.ServeHTTP(response, request)
				require.Equal(t, 200, response.Code, response.Body.String())
				data, err := os.ReadFile(target)
				require.NoError(t, err)
				var env map[string]string
				require.NoError(t, json.Unmarshal(data, &env))
				if mode == "direct" {
					// Direct is a pure passthrough: no identity context, so the CLI
					// forwards the client's identifiers byte for byte.
					require.Empty(t, env[requestIdentityEnv], "direct keeps the client's identifiers")
					return
				}
				if apiKey {
					// An API-key account forwards the client's value: build is told
					// to keep the client's metadata.
					var identity requestIdentity
					require.NoError(t, json.Unmarshal([]byte(env[requestIdentityEnv]), &identity))
					require.Equal(t, requestIdentity{Version: 2, Mode: "client", Carrier: "json"}, identity)
					return
				}
				var identity requestIdentity
				require.NoError(t, json.Unmarshal([]byte(env[requestIdentityEnv]), &identity))
				require.Empty(t, env["CLAUDE_CODE_REMOTE_SESSION_ID"], "the native remote-session override would hash the ID again")
				require.NotContains(t, env[requestIdentityEnv], "source-device")
				require.NotContains(t, env[requestIdentityEnv], "source-session")
				require.Len(t, identity.Device, 64)
				require.True(t, identity.Rewrite)
				// A request that carries no identity starts the CLI natively.
				request = httptest.NewRequest("POST", "/v1/messages", strings.NewReader(`{"model":"fixture","messages":[{"role":"user","content":"hello"}]}`))
				request.Header.Set("x-api-key", "fixture")
				response = httptest.NewRecorder()
				g.ServeHTTP(response, request)
				require.Equal(t, 200, response.Code, response.Body.String())
				data, err = os.ReadFile(target)
				require.NoError(t, err)
				env = nil
				require.NoError(t, json.Unmarshal(data, &env))
				// Build carries no rewrite: the CLI drops the metadata its native
				// builder would invent instead of giving the request an identity.
				identity = requestIdentity{}
				require.NoError(t, json.Unmarshal([]byte(env[requestIdentityEnv]), &identity))
				require.Equal(t, requestIdentity{Version: 2, Mode: "replace"}, identity)
			})
		}
	}
}

// The CLI envelope accepts exactly the keys of validateRequestPolicy in
// cli-mods/request-policy.js. Host-only fields (mode, version, identity) must be
// removed first, or the CLI refuses every build request.
func TestBuildEnvelopeCarriesOnlyCLIPolicyKeys(t *testing.T) {
	exe, err := lifecycleTestExecutable()
	require.NoError(t, err)
	root := t.TempDir()
	capture := filepath.Join(root, "requests.jsonl")
	g := &Gateway{RequestMode: "build", Key: "fixture", Slots: make(chan struct{}, 1), Timeout: 10 * time.Second,
		CLIInfo: cliRequestInfo{Version: "2.1.304", Capabilities: []string{"request_build", features.BuildContentPreservationCapability,
			features.BuildAttachmentCapabilityV2, features.BuildBillingCapability, features.RequestIdentityCapability, features.RequestLevelsCapability}},
		Runner: &Runner{CLI: exe, Version: "2.1.304", Work: root, WorkingDirectory: root, Env: envWith(os.Environ(), map[string]string{
			"CCG_TEST_REQUEST_PEER": "capture", "CCG_TEST_REQUEST_READY": capture,
		})}}
	require.NoError(t, g.configureRequestIdentity(root))
	for i, policy := range []string{
		`{"schema_version":1,"relay_mode":"build","cli_version":"2.1.304","request_identity_sources":{"user_id":"worker"},"build_billing_sources":{"cc_version":"worker"}}`,
		`{"relay_mode":"build","request_identity_sources":{"user_id":"client"}}`,
		`{"relay_mode":"build"}`,
	} {
		req := httptest.NewRequest("POST", "/v1/messages", strings.NewReader(`{"model":"fixture","messages":[{"role":"user","content":"hello"}],"metadata":{"user_id":"opaque"}}`))
		req.Header.Set("x-api-key", "fixture")
		req.Header.Set(features.PolicyHeader, policy)
		out := httptest.NewRecorder()
		g.ServeHTTP(out, req)
		require.Equal(t, 200, out.Code, out.Body.String())
		captured, err := os.ReadFile(capture)
		require.NoError(t, err)
		lines := bytes.Split(bytes.TrimSpace(captured), []byte("\n"))
		require.Len(t, lines, i+1)
		var envelope struct {
			RequestPolicy map[string]json.RawMessage `json:"requestPolicy"`
		}
		require.NoError(t, json.Unmarshal(lines[i], &envelope))
		require.Equal(t, json.RawMessage("2"), envelope.RequestPolicy["contract_version"], policy)
		for key := range envelope.RequestPolicy {
			require.Contains(t, []string{"contract_version", "build_attachment_sources", "build_billing_sources"}, key, policy)
		}
	}
}

// buildCLI preserves the client's build content, as every packaged CLI does.
var buildCLI = cliRequestInfo{Capabilities: []string{features.BuildContentPreservationCapability}}

// No CLI process gets the Worker's own keys, whether or not an egress
// controller runs the Worker (audit C16): the request command, the login and
// management processes and the startup questions alike.
func TestCLIProcessesNeverGetTheWorkerKeys(t *testing.T) {
	exe, err := lifecycleTestExecutable()
	require.NoError(t, err)
	for _, egress := range []string{"", "1"} {
		t.Run("egress="+egress, func(t *testing.T) {
			t.Setenv("CCG_EXTERNAL_EGRESS", egress)
			root := t.TempDir()
			target := filepath.Join(root, "child-env.json")
			secrets := map[string]string{"CCG_API_KEY": "worker-gateway-key", "CCG_ADMIN_KEY": "worker-admin-key", "ccg_api_key": "lower"}
			env := envWith(os.Environ(), map[string]string{
				"CCG_TEST_REQUEST_PEER": "capture", "CCG_TEST_REQUEST_READY": filepath.Join(root, "input.jsonl"), "CCG_TEST_REQUEST_ENV_CAPTURE": target,
				"CCG_ACCOUNT_DISK_QUOTA_BYTES": "1024",
			})
			for k, v := range secrets {
				env = append(env, k+"="+v)
			}
			g := &Gateway{RequestMode: "direct", Key: "worker-gateway-key", Slots: make(chan struct{}, 1), Timeout: 10 * time.Second, CLIInfo: buildCLI,
				Runner: &Runner{CLI: exe, Work: root, Env: env}}
			req := httptest.NewRequest("POST", "/v1/messages", strings.NewReader(`{"model":"fixture","messages":[{"role":"user","content":"hello"}]}`))
			req.Header.Set("x-api-key", "worker-gateway-key")
			out := httptest.NewRecorder()
			g.ServeHTTP(out, req)
			require.Equal(t, 200, out.Code, out.Body.String())
			data, err := os.ReadFile(target)
			require.NoError(t, err)
			var child map[string]string
			require.NoError(t, json.Unmarshal(data, &child))
			for name := range child {
				require.False(t, strings.EqualFold(name, "CCG_API_KEY") || strings.EqualFold(name, "CCG_ADMIN_KEY"), name)
			}
			require.Equal(t, "1024", child["CCG_ACCOUNT_DISK_QUOTA_BYTES"], "the rest is inherited")
			auth := &authManager{env: env, overrides: NewEnvironmentOverrides(root)}
			for _, item := range append(auth.environment(), withoutWorkerSecrets(env)...) {
				key, _, _ := strings.Cut(item, "=")
				require.False(t, strings.EqualFold(key, "CCG_API_KEY") || strings.EqualFold(key, "CCG_ADMIN_KEY"), key)
			}
		})
	}
}

func TestMessagesBuildComponentsPreservesHistoryAndSchemas(t *testing.T) {
	raw := []byte(`{"model":"m","system":[{"type":"text","text":"policy","cache_control":{"type":"ephemeral"}}],"messages":[{"role":"assistant","content":[{"type":"tool_use","id":"t","name":"Bash","input":{"custom":9007199254740993}}]},{"role":"user","content":[{"type":"tool_result","tool_use_id":"t","content":"ok"},{"type":"text","text":"<system-reminder>keep position</system-reminder>"},{"type":"image","source":{"type":"base64","media_type":"image/png","data":"AAAA"}}]}],"tools":[{"name":"Bash","description":"custom","input_schema":{"type":"object","properties":{"custom":{"type":"integer"}}},"strict":true},{"type":"web_search_20250305","name":"web_search"}],"max_tokens":128,"stream":true,"unknown_generation_field":{"value":9007199254740993}}`)
	// Build rejects numbers the native JS runtime cannot exactly represent.
	if _, err := messagesBuildComponents(raw, &features.CLIPolicy{ContractVersion: 2}, ""); err == nil {
		t.Fatal("unsafe integer accepted")
	}
	raw = []byte(strings.ReplaceAll(string(raw), "9007199254740993", "9007199254740991"))
	got, err := messagesBuildComponents(raw, &features.CLIPolicy{ContractVersion: 2}, "")
	if err != nil {
		t.Fatal(err)
	}
	var before, after map[string]json.RawMessage
	_ = json.Unmarshal(raw, &before)
	_ = json.Unmarshal(got, &after)
	if string(before["system"]) != string(after["systemPrompt"]) {
		t.Fatal("system cache fields lost")
	}
	if string(after["attachments"]) != `[]` {
		t.Fatal("the Worker extracted attachments", string(after["attachments"]))
	}
	var sent, kept any
	_ = json.Unmarshal(before["messages"], &sent)
	_ = json.Unmarshal(after["messages"], &kept)
	if !reflect.DeepEqual(sent, kept) {
		t.Fatal("messages were changed", string(after["messages"]))
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

// The envelope carries what the client sent and nothing in its place (audit
// C10): no stream and no system when the client sent none; the CLI reads
// them as false and none.
func TestMessagesBuildComponentsLeaveOutWhatTheClientDidNotSend(t *testing.T) {
	out, err := messagesBuildComponents([]byte(`{"model":"m","messages":[{"role":"user","content":"x"}]}`), &features.CLIPolicy{ContractVersion: 2}, "/w")
	require.NoError(t, err)
	var components map[string]json.RawMessage
	require.NoError(t, json.Unmarshal(out, &components))
	for _, key := range []string{"stream", "systemPrompt", "tools"} {
		require.NotContains(t, components, key)
	}
	out, err = messagesBuildComponents([]byte(`{"model":"m","system":[],"stream":false,"tools":[],"messages":[{"role":"user","content":"x"}]}`), &features.CLIPolicy{ContractVersion: 2}, "/w")
	require.NoError(t, err)
	require.NoError(t, json.Unmarshal(out, &components))
	require.Equal(t, `[]`, string(components["systemPrompt"]))
	require.Equal(t, `false`, string(components["stream"]))
	require.Equal(t, `[]`, string(components["tools"]))
}

func TestMessagesBuildComponentsRejectsUnrepresentableSystem(t *testing.T) {
	for _, raw := range []string{`null`, `{}`, `{"model":"m","messages":[]}`, `{"model":"m","messages":[{}],"system":[{"type":"image"}]}`, `{"model":"m","messages":[{}],"system":[{"type":"text","text":"x","unknown_semantic":true}]}`} {
		if _, err := messagesBuildComponents([]byte(raw), &features.CLIPolicy{ContractVersion: 2}, ""); err == nil {
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
			g := &Gateway{RequestMode: mode, Key: "gateway", CLIInfo: buildCLI, Runner: &Runner{CLI: cli, Work: root, Env: append(os.Environ(), "FIXTURE="+root)}, Slots: make(chan struct{}, 1), Timeout: time.Second}
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
	r.Header.Set(features.PolicyHeader, `{"relay_mode":"native"}`)
	out := httptest.NewRecorder()
	rt.gateway.ServeHTTP(out, r)
	// The wire policy knows build and direct only (features.WorkerPolicy):
	// a retired mode is an invalid policy.
	if out.Code != 400 {
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

// unreadBody fails the test when the handler reads it.
type unreadBody struct{ t *testing.T }

func (b unreadBody) Read([]byte) (int, error) {
	b.t.Error("the body was read")
	return 0, io.EOF
}

// A Worker at its limit refuses before it reads or checks the body (audit
// C3); what the headers alone decide keeps its own answer. /healthz reports
// the slots.
func TestRequestSlotIsTakenBeforeTheBody(t *testing.T) {
	cli := cliRequestInfo{Version: "2.1.304", Capabilities: []string{"request_build", features.BuildContentPreservationCapability, features.RequestLevelsCapability}}
	g := &Gateway{RequestMode: "build", Key: "secret", CLIInfo: cli, Runner: &Runner{Version: "2.1.304"}, Slots: make(chan struct{}, 3)}
	for range 3 {
		g.Slots <- struct{}{}
	}
	for _, path := range []string{"/v1/messages", "/v1/ccgateway/probe"} {
		r := httptest.NewRequest("POST", path, unreadBody{t})
		r.Header.Set("x-api-key", "secret")
		r.Header.Set(features.PolicyHeader, `{"relay_mode":"build","cli_version":"2.1.304"}`)
		out := httptest.NewRecorder()
		g.ServeHTTP(out, r)
		require.Equal(t, 429, out.Code, path)
		require.Equal(t, "1", out.Header().Get("Retry-After"))
	}
	r := httptest.NewRequest("POST", "/v1/messages", unreadBody{t})
	r.Header.Set("x-api-key", "secret")
	r.Header.Set(features.PolicyHeader, `{"relay_mode":"build","cli_version":"2.1.302"}`)
	out := httptest.NewRecorder()
	g.ServeHTTP(out, r)
	require.Equal(t, 409, out.Code, "a policy for another CLI is not a full Worker")
	r = httptest.NewRequest("POST", "/v1/messages", unreadBody{t})
	out = httptest.NewRecorder()
	g.ServeHTTP(out, r)
	require.Equal(t, 401, out.Code, "authentication comes first")
	out = httptest.NewRecorder()
	g.ServeHTTP(out, httptest.NewRequest("GET", "/healthz", nil))
	var health struct {
		Slots int `json:"slots"`
	}
	require.NoError(t, json.Unmarshal(out.Body.Bytes(), &health))
	require.Equal(t, 3, health.Slots)
}

func TestMessagesBuildComponentsRejectsMalformedTools(t *testing.T) {
	for _, tools := range []string{`[null]`, `[{}]`, `[{"name":"x"}]`, `[{"name":"x","input_schema":null}]`, `[{"name":"x","input_schema":[]}]`, `[{"name":"x","type":17}]`} {
		if _, err := messagesBuildComponents([]byte(`{"model":"m","messages":[{"role":"user","content":"x"}],"tools":`+tools+`}`), &features.CLIPolicy{ContractVersion: 2}, ""); err == nil {
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
