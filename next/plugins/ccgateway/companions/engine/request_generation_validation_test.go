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

var invalidBuildGeneration = []struct {
	name, fields string
}{
	{"zero_tokens", `"max_tokens":0`},
	{"negative_tokens", `"max_tokens":-1`},
	{"fraction_tokens", `"max_tokens":1.5`},
	{"null_tokens", `"max_tokens":null`},
	{"string_tokens", `"max_tokens":"128"`},
	{"boolean_tokens", `"max_tokens":true`},
	{"unsafe_tokens", `"max_tokens":9007199254740992`},
	{"rounded_fraction_tokens", `"max_tokens":9007199254740991.1`},
	{"null_thinking", `"thinking":null`},
	{"array_thinking", `"thinking":[]`},
	{"missing_thinking_type", `"thinking":{}`},
	{"null_thinking_type", `"thinking":{"type":null}`},
	{"unknown_thinking_type", `"thinking":{"type":"invalid-fixture"}`},
	{"case_thinking_type", `"thinking":{"type":"ENABLED"}`},
	{"enabled_missing_budget", `"thinking":{"type":"enabled"}`},
	{"disabled_budget", `"thinking":{"type":"disabled","budget_tokens":1024}`},
	{"adaptive_budget", `"thinking":{"type":"adaptive","budget_tokens":1024}`},
	{"null_budget", `"thinking":{"type":"enabled","budget_tokens":null}`},
	{"string_budget", `"thinking":{"type":"enabled","budget_tokens":"1024"}`},
	{"zero_budget", `"thinking":{"type":"enabled","budget_tokens":0}`},
	{"negative_budget", `"thinking":{"type":"enabled","budget_tokens":-1}`},
	{"fraction_budget", `"thinking":{"type":"enabled","budget_tokens":1024.5}`},
	{"unsafe_budget", `"thinking":{"type":"enabled","budget_tokens":9007199254740992}`},
	{"rounded_fraction_budget", `"thinking":{"type":"enabled","budget_tokens":9007199254740991.1}`},
	{"null_stream", `"stream":null`},
	{"string_stream", `"stream":"true"`},
}

func generationRequest(fields string) []byte {
	if fields != "" {
		fields = "," + fields
	}
	return []byte(`{"model":"fixture","messages":[{"role":"user","content":"validation"}]` + fields + `}`)
}

func TestBuildGenerationRejectsMalformedExplicitControls(t *testing.T) {
	for _, tc := range invalidBuildGeneration {
		t.Run(tc.name, func(t *testing.T) {
			raw := generationRequest(tc.fields)
			_, err := messagesBuildComponents(raw)
			require.Error(t, err)
			_, err = messagesBuildComponentsPolicy(raw, &features.CLIPolicy{ContractVersion: 2}, "/work")
			require.Error(t, err)
		})
	}
}

func TestBuildGenerationKeepsNativeDefaultsAndBudgetAdjustment(t *testing.T) {
	for _, fields := range []string{
		``,
		`"max_tokens":1`,
		`"max_tokens":1e3`,
		`"max_tokens":9007199254740991`,
		`"thinking":{"type":"disabled"}`,
		`"thinking":{"type":"adaptive"}`,
		`"thinking":{"type":"enabled","budget_tokens":1024}`,
		// Native rules decide the lower bound and model-specific budget clamp.
		`"max_tokens":128,"thinking":{"type":"enabled","budget_tokens":1}`,
		`"max_tokens":128,"thinking":{"type":"enabled","budget_tokens":2048}`,
		`"stream":false,"thinking":{"type":"adaptive","display":"omitted"}`,
		`"stream":true`,
	} {
		t.Run(fields, func(t *testing.T) {
			raw := generationRequest(fields)
			out, err := messagesBuildComponentsPolicy(raw, &features.CLIPolicy{ContractVersion: 2}, "/work")
			require.NoError(t, err)
			var before, after map[string]json.RawMessage
			require.NoError(t, json.Unmarshal(raw, &before))
			require.NoError(t, json.Unmarshal(out, &after))
			var parameters map[string]json.RawMessage
			require.NoError(t, json.Unmarshal(after["parameters"], &parameters))
			for _, field := range []string{"max_tokens", "thinking"} {
				require.Equal(t, before[field], parameters[field], field)
			}
		})
	}
}

func TestInvalidBuildGenerationNeverStartsCLIAndDirectKeepsBytes(t *testing.T) {
	exe, err := lifecycleTestExecutable()
	require.NoError(t, err)
	root := t.TempDir()
	capture := filepath.Join(root, "requests.jsonl")
	g := &Gateway{
		RequestMode: "build", Key: "fixture",
		CLIInfo: cliRequestInfo{Version: "2.1.304", Capabilities: []string{
			"request_build", "request_direct", features.BuildContentPreservationCapability,
		}},
		Runner: &Runner{CLI: exe, Version: "2.1.304", Work: root, WorkingDirectory: root,
			Env: envWith(os.Environ(), map[string]string{"CCG_TEST_REQUEST_PEER": "capture", "CCG_TEST_REQUEST_READY": capture})},
		Slots: make(chan struct{}, 1), Timeout: 10 * time.Second,
	}
	for _, tc := range invalidBuildGeneration {
		t.Run("build/"+tc.name, func(t *testing.T) {
			req := httptest.NewRequest("POST", "/v1/messages", bytes.NewReader(generationRequest(tc.fields)))
			req.Header.Set("x-api-key", "fixture")
			out := httptest.NewRecorder()
			g.ServeHTTP(out, req)
			require.Equal(t, 400, out.Code, out.Body.String())
			require.Contains(t, out.Body.String(), "invalid_request_error")
			_, err := os.Stat(capture)
			require.True(t, os.IsNotExist(err), "invalid build must not start the request CLI")
		})
	}
	// The same semantically invalid upstream fields are opaque in direct mode.
	// This test verifies transport preservation, not model acceptance.
	raw := []byte("{\n  \"model\":\"fixture\", \"max_tokens\":0,\n \"thinking\":{\"type\":\"invalid-fixture\"}, \"messages\":[{\"role\":\"user\",\"content\":\"direct\"}]\n}\n")
	req := httptest.NewRequest("POST", "/v1/messages", bytes.NewReader(raw))
	req.Header.Set("x-api-key", "fixture")
	req.Header.Set(policyHeader, `{"relay_mode":"direct","cli_version":"2.1.304"}`)
	out := httptest.NewRecorder()
	g.ServeHTTP(out, req)
	require.Equal(t, 200, out.Code, out.Body.String())
	actual, err := os.ReadFile(capture)
	require.NoError(t, err)
	require.Equal(t, append(append([]byte{}, raw...), '\n'), actual, "peer must receive exactly one unchanged direct body")
}
