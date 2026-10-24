package engine

import (
	"bytes"
	"encoding/json"
	"net/http/httptest"
	"os"
	"path/filepath"
	"slices"
	"testing"
	"time"

	"github.com/Sub2API-Devs/sup2api/next/plugins/ccgateway/companions/contracts/features"
	"github.com/stretchr/testify/require"
)

func TestBuildContentRejectsNullAndReservedTypesEveryCarrier(t *testing.T) {
	for _, body := range []string{
		`{"model":"m","system":[{"type":"text","text":"previous"},{"type":"text","text":null}],"messages":[{"role":"user","content":"x"}]}`,
		`{"model":"m","messages":[{"role":"user","content":[{"type":"text","text":"<system-reminder>x</system-reminder>"},{"type":"text","text":null}]}]}`,
		`{"model":"m","messages":[{"role":"assistant","content":[{"type":"text","text":null}]}]}`,
		`{"model":"m","messages":[{"role":"system","content":[{"type":"text","text":null}]}]}`,
		`{"model":"m","messages":[{"role":"user","content":[{"type":"tool_result","content":[{"type":"text","text":null}]}]}]}`,
		`{"model":"m","messages":[{"role":"user","content":[{"type":"ccgateway_attachment","id":"x"}]}]}`,
		`{"model":"m","runtimeContext":{"workingDirectory":"/untrusted"},"messages":[{"role":"user","content":"x"}]}`,
	} {
		_, err := messagesBuildComponents([]byte(body), &features.CLIPolicy{ContractVersion: 2}, "/work")
		require.Error(t, err, body)
	}
}

func TestBuildV2PreservesOriginalMessagesAndTrustedPolicy(t *testing.T) {
	raw := []byte(`{"model":"m","system":"plain system","messages":[{"role":"user","content":"<system-reminder>unrelated</system-reminder>"},{"role":"assistant","content":[{"type":"tool_use","id":"t","name":"Bash","input":{"runtimeContext":{"workingDirectory":"/input-data"}}}]},{"role":"system","content":"context","lifecycle":"turn"},{"role":"user","content":[{"type":"tool_result","tool_use_id":"t","is_error":true,"content":[{"type":"text","text":" \n","cache_control":{"type":"ephemeral"}},{"type":"image","source":{"type":"base64","data":"AAAA","media_type":"image/png"}}]}]}]}`)
	policy := &features.CLIPolicy{ContractVersion: 2, BuildAttachmentSources: features.BuildAttachmentSources{"shell": "erase"}, BuildBillingSources: features.BuildBillingSources{"cc_version": "worker"}}
	out, err := messagesBuildComponents(raw, policy, "/work")
	require.NoError(t, err)
	var before, after map[string]json.RawMessage
	require.NoError(t, json.Unmarshal(raw, &before))
	require.NoError(t, json.Unmarshal(out, &after))
	require.JSONEq(t, string(before["messages"]), string(after["messages"]))
	require.JSONEq(t, `[]`, string(after["attachments"]))
	require.JSONEq(t, `{"workingDirectory":"/work","additionalWorkingDirectories":[]}`, string(after["runtimeContext"]))
	require.Contains(t, string(after["requestPolicy"]), `"contract_version":2`)
}

func TestV2PolicyPassesToSingleCLIWithoutGoTransform(t *testing.T) {
	exe, err := lifecycleTestExecutable()
	require.NoError(t, err)
	root := t.TempDir()
	capture := filepath.Join(root, "requests.jsonl")
	g := &Gateway{RequestMode: "build", Key: "fixture", CLIInfo: cliRequestInfo{Version: "2.1.304", Capabilities: []string{"request_build", "request_direct", features.BuildContentPreservationCapability, features.BuildAttachmentCapabilityV2, features.BuildBillingCapability, features.RequestLevelsCapability}},
		Runner: &Runner{CLI: exe, Version: "2.1.304", Work: root, WorkingDirectory: root, Env: envWith(os.Environ(), map[string]string{"CCG_TEST_REQUEST_PEER": "capture", "CCG_TEST_REQUEST_READY": capture})},
		Slots:  make(chan struct{}, 1), Timeout: 10 * time.Second}
	raw := []byte(`{"model":"m","stream":true,"messages":[{"role":"user","content":"no environment"}]}`)
	send := func(policy string) *httptest.ResponseRecorder {
		req := httptest.NewRequest("POST", "/v1/messages", bytes.NewReader(raw))
		req.Header.Set("x-api-key", "fixture")
		req.Header.Set(features.PolicyHeader, policy)
		out := httptest.NewRecorder()
		g.ServeHTTP(out, req)
		return out
	}
	// The environment is build's; direct ignores its sources. Billing sources
	// belong to direct too since the request levels (2026-10-23), so this CLI,
	// without direct_billing_v1, refuses them in direct instead of dropping them.
	for _, policy := range []string{
		`{"relay_mode":"build","cli_version":"2.1.304","build_attachment_sources":{"os_version":"worker","shell":"erase"},"build_billing_sources":{"cc_version":"worker"}}`,
		`{"relay_mode":"direct","cli_version":"2.1.304","build_attachment_sources":{"os_version":"worker","shell":"erase"}}`,
	} {
		out := send(policy)
		require.Equal(t, 200, out.Code, out.Body.String())
	}
	require.Equal(t, 409, send(`{"relay_mode":"direct","cli_version":"2.1.304","build_billing_sources":{"cc_version":"worker"}}`).Code)
	data, err := os.ReadFile(capture)
	require.NoError(t, err)
	lines := bytes.Split(bytes.TrimSpace(data), []byte("\n"))
	require.Len(t, lines, 2)
	require.Contains(t, string(lines[0]), `"contract_version":2`)
	encodedRoot, _ := json.Marshal(root)
	require.Contains(t, string(lines[0]), `"workingDirectory":`+string(encodedRoot))
	require.NotContains(t, string(lines[0]), `ccg-context`)
	require.Equal(t, raw, lines[1], "direct must ignore content policy and preserve body")
}

func TestUnsupportedContentPolicyFailsBeforeCLI(t *testing.T) {
	g := &Gateway{RequestMode: "build", Runner: &Runner{Version: "2.1.304"}, Slots: make(chan struct{}, 1)}
	for _, policy := range []string{`{"build_attachment_sources":{"shell":"erase"}}`, `{"build_billing_sources":{"cc_version":"worker"}}`, `{"relay_mode":"direct"}`} {
		req := httptest.NewRequest("POST", "/v1/messages", bytes.NewBufferString(`{"model":"m","messages":[{"role":"user","content":"x"}]}`))
		req.Header.Set(features.PolicyHeader, policy)
		out := httptest.NewRecorder()
		g.ServeHTTP(out, req)
		require.Equal(t, 409, out.Code, out.Body.String())
	}
}

func TestContentDiagnosticIsBoundedAndDoesNotBecomeError(t *testing.T) {
	p := &requestErrorReader{}
	for i := 0; i < 140; i++ {
		_, err := p.Write([]byte(requestContentDiagnosticPrefix + `{"protocol":"ccgateway.content.diagnostic.v1","field":"cc_version","status":"replaced","carrier":"system","text":"secret"}` + "\n"))
		require.NoError(t, err)
	}
	require.Equal(t, 128, p.diagnosticCount)
	require.Nil(t, p.result())
	require.False(t, p.invalid)
}

func TestRequestCapabilitiesRequireCompatibleObservedCLI(t *testing.T) {
	g := &Gateway{RequestMode: "build"}
	require.Empty(t, g.requestCapabilities(), "configured mode must not manufacture CLI evidence")
	// v1 is only v2's alias (W2): a CLI the build gate refuses (no
	// preservation) or one without the content adapter is not offered to an
	// older core's v1 preflight.
	for _, capabilities := range [][]string{{"request_build"}, {"request_build", features.BuildContentPreservationCapability}} {
		g.CLIInfo.Capabilities = capabilities
		require.NotContains(t, g.requestCapabilities(), features.BuildAttachmentCapability, capabilities)
	}
	g.CLIInfo.Capabilities = append(g.CLIInfo.Capabilities, "request_direct", features.BuildAttachmentCapabilityV2, features.BuildBillingCapability)
	require.Contains(t, g.requestCapabilities(), features.RequestPolicyModeCapability)
	require.Contains(t, g.requestCapabilities(), features.BuildAttachmentCapabilityV2)
	require.Contains(t, g.requestCapabilities(), features.BuildAttachmentCapability, "an older core preflights the platform sources as v1")
	require.Contains(t, g.requestCapabilities(), features.BuildBillingCapability)
}

// What the Worker offers an older core's v1 preflight (a platform or OS
// source from the Worker) it also serves: the build gate takes the request.
func TestAttachmentV1PreflightMatchesTheBuildGate(t *testing.T) {
	policy := features.WorkerPolicy{RelayMode: "build", BuildAttachmentSources: features.BuildAttachmentSources{"platform_name": "worker"}}
	require.False(t, policy.BuildAttachmentSources.RequiresV2())
	for _, capabilities := range [][]string{
		{"request_build", features.BuildContentPreservationCapability, features.RequestLevelsCapability},
		{"request_build", features.BuildContentPreservationCapability, features.RequestLevelsCapability, features.BuildAttachmentCapabilityV2},
	} {
		g := &Gateway{RequestMode: "build", CLIInfo: cliRequestInfo{Version: "2.1.304", Capabilities: capabilities}}
		offered := slices.Contains(g.requestCapabilities(), features.BuildAttachmentCapability)
		plan := &requestPlan{mode: "build", fromCore: true, cli: policy.CLI()}
		require.Equal(t, offered, g.checkCapabilities(plan) == nil, capabilities)
	}
}

// The entrypoint reaches the CLI envelope only on a CLI that declares the
// identity line capability; elsewhere the request is refused, not sent without
// it. Identity lines are not on the wire any more (2026-10-23 audit A1/C4): a
// key an older core still sends is ignored, valid or not.
func TestIdentityLinePolicyNeedsTheCapability(t *testing.T) {
	exe, err := lifecycleTestExecutable()
	require.NoError(t, err)
	root := t.TempDir()
	capture := filepath.Join(root, "requests.jsonl")
	capabilities := []string{"request_build", "request_direct", features.BuildContentPreservationCapability, features.BuildAttachmentCapabilityV2, features.BuildBillingCapability, features.RequestLevelsCapability}
	g := &Gateway{RequestMode: "build", Key: "fixture", CLIInfo: cliRequestInfo{Version: "2.1.304", Capabilities: capabilities},
		Runner: &Runner{CLI: exe, Version: "2.1.304", Work: root, WorkingDirectory: root, Env: envWith(os.Environ(), map[string]string{"CCG_TEST_REQUEST_PEER": "capture", "CCG_TEST_REQUEST_READY": capture})},
		Slots:  make(chan struct{}, 1), Timeout: 10 * time.Second}
	send := func(policy string) *httptest.ResponseRecorder {
		req := httptest.NewRequest("POST", "/v1/messages", bytes.NewBufferString(`{"model":"m","messages":[{"role":"user","content":"x"}]}`))
		req.Header.Set("x-api-key", "fixture")
		req.Header.Set(features.PolicyHeader, policy)
		out := httptest.NewRecorder()
		g.ServeHTTP(out, req)
		return out
	}
	policy := `{"relay_mode":"build","cli_version":"2.1.304","build_billing_entrypoint":"claude-vscode","build_identity_lines":{"cli":"none","sdk-cli":"official_cli_sdk"}}`
	for _, p := range []string{policy, `{"build_billing_entrypoint":"cli"}`} {
		require.Equal(t, 409, send(p).Code, p)
	}
	for _, p := range []string{`{"build_identity_lines":{"claude-desktop":"agent_sdk"}}`, `{"build_identity_lines":{"cli":"agent_sdk"}}`, `{"build_identity_lines":{"remote":"none"}}`} {
		require.Equal(t, 200, send(p).Code, p)
	}
	require.Equal(t, 400, send(`{"build_billing_entrypoint":"claude-desktop-3p"}`).Code)
	g.CLIInfo.Capabilities = append(capabilities, features.BuildIdentityCapability)
	require.Contains(t, g.requestCapabilities(), features.BuildIdentityCapability)
	out := send(policy)
	require.Equal(t, 200, out.Code, out.Body.String())
	data, err := os.ReadFile(capture)
	require.NoError(t, err)
	var components struct {
		RequestPolicy map[string]json.RawMessage `json:"requestPolicy"`
	}
	lines := bytes.Split(bytes.TrimSpace(data), []byte("\n"))
	require.NoError(t, json.Unmarshal(lines[len(lines)-1], &components))
	require.JSONEq(t, `"claude-vscode"`, string(components.RequestPolicy["build_billing_entrypoint"]))
	require.NotContains(t, components.RequestPolicy, "build_identity_lines")
}

// The layers a request without a billing header is given reach the CLI only
// on a CLI that injects them, in canonical form; adding nothing needs no such
// CLI, and an unknown layer is refused (2026-10-23).
func TestInjectionPolicyNeedsTheCapability(t *testing.T) {
	exe, err := lifecycleTestExecutable()
	require.NoError(t, err)
	root := t.TempDir()
	capture := filepath.Join(root, "requests.jsonl")
	capabilities := []string{"request_build", "request_direct", features.BuildContentPreservationCapability, features.BuildAttachmentCapabilityV2, features.BuildBillingCapability, features.RequestLevelsCapability}
	g := &Gateway{RequestMode: "build", Key: "fixture", CLIInfo: cliRequestInfo{Version: "2.1.304", Capabilities: capabilities},
		Runner: &Runner{CLI: exe, Version: "2.1.304", Work: root, WorkingDirectory: root, Env: envWith(os.Environ(), map[string]string{"CCG_TEST_REQUEST_PEER": "capture", "CCG_TEST_REQUEST_READY": capture})},
		Slots:  make(chan struct{}, 1), Timeout: 10 * time.Second}
	send := func(policy string) *httptest.ResponseRecorder {
		req := httptest.NewRequest("POST", "/v1/messages", bytes.NewBufferString(`{"model":"m","messages":[{"role":"user","content":"x"}]}`))
		req.Header.Set("x-api-key", "fixture")
		req.Header.Set(features.PolicyHeader, policy)
		out := httptest.NewRecorder()
		g.ServeHTTP(out, req)
		return out
	}
	policy := `{"relay_mode":"build","cli_version":"2.1.304","build_injection":{"system_prompt":true,"attachments":{"date":true,"environment":true,"model":false},"tools":{"Read":true,"Bash":true,"NotebookEdit":true,"WebSearch":false}}}`
	require.Equal(t, 409, send(policy).Code)
	// Only Bash, Read, Edit, Write, Agent, WebSearch and NotebookEdit may be
	// added (request levels): the rest of the CLI's pool, and tools 2.1.304
	// does not have, are refused before the CLI runs.
	for _, p := range []string{`{"build_injection":{"attachments":{"skills":true}}}`, `{"build_injection":{"tools":{"Glob":true}}}`,
		`{"build_injection":{"tools":{"ToolSearch":true}}}`, `{"build_injection":{"tools":{"Skill":true}}}`, `{"build_injection":{"tools":{"Bash":true,"CronCreate":true}}}`} {
		require.Equal(t, 400, send(p).Code, p)
	}
	out := send(`{"relay_mode":"build","build_injection":{"system_prompt":false,"attachments":{"date":false},"tools":{}}}`)
	require.Equal(t, 200, out.Code, out.Body.String())
	g.CLIInfo.Capabilities = append(capabilities, features.BuildInjectionCapability)
	require.Contains(t, g.requestCapabilities(), features.BuildInjectionCapability)
	require.NoError(t, os.Remove(capture))
	out = send(policy)
	require.Equal(t, 200, out.Code, out.Body.String())
	data, err := os.ReadFile(capture)
	require.NoError(t, err)
	var components struct {
		RequestPolicy map[string]json.RawMessage `json:"requestPolicy"`
	}
	require.NoError(t, json.Unmarshal(bytes.TrimSpace(data), &components))
	require.JSONEq(t, `{"system_prompt":true,"attachments":{"environment":true,"date":true},"tools":{"Read":true,"Bash":true,"NotebookEdit":true}}`, string(components.RequestPolicy["build_injection"]))
}

// Direct hands the CLI its billing context only on a CLI that applies it; a
// choice an older CLI cannot honour refuses the request, while the default
// leaves that CLI a pure passthrough (2026-10-22). Direct is the billing header
// alone (request levels, 2026-10-23): every policy the core sends names a
// level, so it needs request_levels_v1 as the core's preflight does (audit
// C11), and an identity line never reaches the CLI.
func TestDirectPolicyReachesOnlyACapableCLI(t *testing.T) {
	exe, err := lifecycleTestExecutable()
	require.NoError(t, err)
	root := t.TempDir()
	envCapture := filepath.Join(root, "env.json")
	capabilities := []string{"request_build", "request_direct", features.BuildContentPreservationCapability, features.RequestLevelsCapability}
	g := &Gateway{RequestMode: "direct", Key: "fixture", CLIInfo: cliRequestInfo{Version: "2.1.304", Capabilities: capabilities},
		Runner: &Runner{CLI: exe, Version: "2.1.304", Work: root, WorkingDirectory: root, Env: envWith(os.Environ(), map[string]string{
			"CCG_TEST_REQUEST_PEER": "capture", "CCG_TEST_REQUEST_READY": filepath.Join(root, "requests.jsonl"), "CCG_TEST_REQUEST_ENV_CAPTURE": envCapture,
			directPolicyEnv: "inherited"})},
		Slots: make(chan struct{}, 1), Timeout: 10 * time.Second}
	send := func(policy string) (int, map[string]string) {
		_ = os.Remove(envCapture)
		req := httptest.NewRequest("POST", "/v1/messages", bytes.NewBufferString(`{"model":"m","messages":[{"role":"user","content":"x"}]}`))
		req.Header.Set("x-api-key", "fixture")
		if policy != "" {
			req.Header.Set(features.PolicyHeader, policy)
		}
		out := httptest.NewRecorder()
		g.ServeHTTP(out, req)
		env := map[string]string{}
		if raw, err := os.ReadFile(envCapture); err == nil {
			require.NoError(t, json.Unmarshal(raw, &env))
		}
		return out.Code, env
	}
	choices := `{"relay_mode":"direct","cli_version":"2.1.304","build_billing_entrypoint":"cli","build_identity_lines":{"cli":"none"}}`
	sources := `{"relay_mode":"direct","cli_version":"2.1.304","build_billing_entrypoint":"claude-desktop","build_billing_sources":{"cc_version":"worker","cc_entrypoint":"client"},"build_identity_lines":{"claude-desktop":"agent_sdk"}}`
	for _, p := range []string{choices, sources, `{"relay_mode":"direct","build_billing_sources":{"cc_version":"client"}}`} {
		code, _ := send(p)
		require.Equal(t, 409, code, p)
	}
	code, env := send(`{"relay_mode":"direct","cli_version":"2.1.304"}`)
	require.Equal(t, 200, code)
	require.Empty(t, env[directPolicyEnv], "an inherited value never reaches the CLI")
	// Direct has no identity line (level none): lines an older core still
	// sends are ignored, so they need no capable CLI.
	code, env = send(`{"relay_mode":"direct","build_identity_lines":{"cli":"none"}}`)
	require.Equal(t, 200, code)
	require.Empty(t, env[directPolicyEnv])
	require.NotContains(t, g.requestCapabilities(), features.DirectBillingCapability)

	// A CLI that does not follow the request levels takes no policy from the
	// core, whatever it asks; run by hand (no policy) it still serves its mode.
	g.CLIInfo.Capabilities = []string{"request_build", "request_direct", features.BuildContentPreservationCapability, features.DirectBillingCapability}
	require.Contains(t, g.requestCapabilities(), features.DirectBillingCapability)
	require.NotContains(t, g.requestCapabilities(), features.RequestLevelsCapability)
	for _, p := range []string{`{"relay_mode":"direct","cli_version":"2.1.304"}`, choices, sources, `{"relay_mode":"direct","build_identity_lines":{"cli":"agent_sdk"}}`} {
		code, _ = send(p)
		require.Equal(t, 409, code, p)
	}
	code, env = send("")
	require.Equal(t, 200, code)
	require.JSONEq(t, `{}`, env[directPolicyEnv])
	// An invalid policy is refused as such before any capability.
	for _, p := range []string{`{"relay_mode":"direct","build_billing_sources":{"cc_version":"erase"}}`, `{"relay_mode":"direct","build_billing_entrypoint":"claude-desktop-3p"}`} {
		code, _ = send(p)
		require.Equal(t, 400, code, p)
	}

	g.CLIInfo.Capabilities = append(capabilities, features.DirectBillingCapability)
	require.Contains(t, g.requestCapabilities(), features.RequestLevelsCapability)
	code, env = send(`{"relay_mode":"direct","cli_version":"2.1.304"}`)
	require.Equal(t, 200, code)
	require.JSONEq(t, `{}`, env[directPolicyEnv])
	code, env = send(choices)
	require.Equal(t, 200, code)
	require.JSONEq(t, `{"build_billing_entrypoint":"cli"}`, env[directPolicyEnv], "never an identity line in direct")
	code, _ = send(`{"relay_mode":"direct","build_identity_lines":{"cli":"agent_sdk"}}`)
	require.Equal(t, 200, code, "direct ignores identity lines, valid or not")
	code, env = send(sources)
	require.Equal(t, 200, code)
	require.JSONEq(t, `{"build_billing_entrypoint":"claude-desktop","build_billing_sources":{"cc_version":"worker","cc_entrypoint":"client"}}`, env[directPolicyEnv])
	code, env = send(`{"relay_mode":"direct","build_billing_sources":{"cc_version":"client"}}`)
	require.Equal(t, 200, code)
	require.JSONEq(t, `{"build_billing_sources":{"cc_version":"client"}}`, env[directPolicyEnv])
	// The level capability alone does not carry the direct context.
	g.CLIInfo.Capabilities = capabilities
	code, _ = send(sources)
	require.Equal(t, 409, code)
}

// Build takes the core's policy only on a CLI that follows the request
// levels, as the core's preflight requires (audit C11): one capability table
// serves both modes. Without a policy (the CLI run by hand) the container's
// own mode needs no level.
func TestBuildPolicyNeedsTheRequestLevels(t *testing.T) {
	exe, err := lifecycleTestExecutable()
	require.NoError(t, err)
	root := t.TempDir()
	g := &Gateway{RequestMode: "build", Key: "fixture", CLIInfo: cliRequestInfo{Version: "2.1.304", Capabilities: []string{"request_build", "request_direct", features.BuildContentPreservationCapability}},
		Runner: &Runner{CLI: exe, Version: "2.1.304", Work: root, WorkingDirectory: root, Env: envWith(os.Environ(), map[string]string{"CCG_TEST_REQUEST_PEER": "capture", "CCG_TEST_REQUEST_READY": filepath.Join(root, "requests.jsonl")})},
		Slots:  make(chan struct{}, 1), Timeout: 10 * time.Second}
	send := func(path, policy string) *httptest.ResponseRecorder {
		req := httptest.NewRequest("POST", path, bytes.NewBufferString(`{"model":"m","messages":[{"role":"user","content":"x"}]}`))
		req.Header.Set("x-api-key", "fixture")
		if policy != "" {
			req.Header.Set(features.PolicyHeader, policy)
		}
		out := httptest.NewRecorder()
		g.ServeHTTP(out, req)
		return out
	}
	for _, path := range []string{"/v1/messages", "/v1/ccgateway/probe"} {
		out := send(path, `{"schema_version":1,"relay_mode":"build","cli_version":"2.1.304"}`)
		require.Equal(t, 409, out.Code, path)
		require.Contains(t, out.Body.String(), "request levels")
		require.Equal(t, 200, send(path, "").Code, path)
	}
	g.CLIInfo.Capabilities = append(g.CLIInfo.Capabilities, features.RequestLevelsCapability)
	require.Equal(t, 200, send("/v1/messages", `{"schema_version":1,"relay_mode":"build","cli_version":"2.1.304"}`).Code)
}
