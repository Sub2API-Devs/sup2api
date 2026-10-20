package engine

import (
	"bytes"
	"encoding/json"
	"net/http/httptest"
	"os"
	"path/filepath"
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
		_, err := messagesBuildComponents([]byte(body))
		require.Error(t, err, body)
		_, err = messagesBuildComponentsPolicy([]byte(body), &buildRequestPolicy{ContractVersion: 2}, "/work")
		require.Error(t, err, body)
	}
}

func TestBuildV2PreservesOriginalMessagesAndTrustedPolicy(t *testing.T) {
	raw := []byte(`{"model":"m","system":"plain system","messages":[{"role":"user","content":"<system-reminder>unrelated</system-reminder>"},{"role":"assistant","content":[{"type":"tool_use","id":"t","name":"Bash","input":{"runtimeContext":{"workingDirectory":"/input-data"}}}]},{"role":"system","content":"context","lifecycle":"turn"},{"role":"user","content":[{"type":"tool_result","tool_use_id":"t","is_error":true,"content":[{"type":"text","text":" \n","cache_control":{"type":"ephemeral"}},{"type":"image","source":{"type":"base64","data":"AAAA","media_type":"image/png"}}]}]}]}`)
	policy := &buildRequestPolicy{ContractVersion: 2, Sources: features.BuildAttachmentSources{"shell": "erase"}, Billing: features.BuildBillingSources{"cc_version": "worker"}}
	out, err := messagesBuildComponentsPolicy(raw, policy, "/work")
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
	g := &Gateway{RequestMode: "build", Key: "fixture", CLIInfo: cliRequestInfo{Version: "2.1.304", Capabilities: []string{"request_build", "request_direct", features.BuildContentPreservationCapability, features.BuildAttachmentCapabilityV2, features.BuildBillingCapability}},
		Runner: &Runner{CLI: exe, Version: "2.1.304", Work: root, WorkingDirectory: root, Env: envWith(os.Environ(), map[string]string{"CCG_TEST_REQUEST_PEER": "capture", "CCG_TEST_REQUEST_READY": capture})},
		Slots:  make(chan struct{}, 1), Timeout: 10 * time.Second}
	raw := []byte(`{"model":"m","stream":true,"messages":[{"role":"user","content":"no environment"}]}`)
	for _, mode := range []string{"build", "direct"} {
		req := httptest.NewRequest("POST", "/v1/messages", bytes.NewReader(raw))
		req.Header.Set("x-api-key", "fixture")
		req.Header.Set(policyHeader, `{"relay_mode":"`+mode+`","cli_version":"2.1.304","build_attachment_sources":{"os_version":"worker","shell":"erase"},"build_billing_sources":{"cc_version":"worker"}}`)
		out := httptest.NewRecorder()
		g.ServeHTTP(out, req)
		require.Equal(t, 200, out.Code, out.Body.String())
	}
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
		req.Header.Set(policyHeader, policy)
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
	g.CLIInfo.Capabilities = []string{"request_build"}
	require.Equal(t, []string{features.BuildAttachmentCapability}, g.requestCapabilities())
	g.CLIInfo.Capabilities = []string{"request_build", features.BuildContentPreservationCapability}
	require.NotContains(t, g.requestCapabilities(), features.BuildAttachmentCapability,
		"v2 preserving path cannot promise an unimplemented environment adapter")
	g.CLIInfo.Capabilities = append(g.CLIInfo.Capabilities, "request_direct", features.BuildAttachmentCapabilityV2, features.BuildBillingCapability)
	require.Contains(t, g.requestCapabilities(), features.RequestPolicyModeCapability)
	require.Contains(t, g.requestCapabilities(), features.BuildAttachmentCapabilityV2)
	require.Contains(t, g.requestCapabilities(), features.BuildBillingCapability)
}
