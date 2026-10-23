package engine

import (
	"encoding/json"
	"net/http/httptest"
	"os"
	"path/filepath"
	"strings"
	"testing"
	"time"

	"github.com/Sub2API-Devs/sup2api/next/plugins/ccgateway/companions/contracts/features"
	"github.com/stretchr/testify/require"
)

// Consumer half of the core → Worker contract: every policy header the core
// sends for the editor cases (server/internal/ccgateway/contract_fixture_test.go
// writes contracts/testdata/core-worker-policies.json) is read by this Worker,
// admitted by a CLI with every capability, and reaches the CLI envelope as the
// policy's CLI part. A header the Worker refuses fails this test, not
// production.
func TestCorePoliciesAreReadByTheWorker(t *testing.T) {
	raw, err := os.ReadFile(filepath.Join("..", "contracts", "testdata", "core-worker-policies.json"))
	require.NoError(t, err)
	var fixture struct {
		Cases []struct {
			Name string `json:"name"`
			Wire string `json:"wire"`
		} `json:"cases"`
	}
	require.NoError(t, json.Unmarshal(raw, &fixture))
	require.NotEmpty(t, fixture.Cases)
	exe, err := lifecycleTestExecutable()
	require.NoError(t, err)
	modes := map[string]bool{}
	for _, tc := range fixture.Cases {
		t.Run(tc.Name, func(t *testing.T) {
			policy, err := features.ParseWorkerPolicy([]byte(tc.Wire))
			require.NoError(t, err)
			require.NotEmpty(t, policy.RelayMode)
			require.NotEmpty(t, policy.CLIVersion)
			modes[policy.RelayMode] = true
			root := t.TempDir()
			envCapture := filepath.Join(root, "env.json")
			g := &Gateway{RequestMode: policy.RelayMode, Key: "fixture", Slots: make(chan struct{}, 1), Timeout: 10 * time.Second,
				CLIInfo: cliRequestInfo{Version: policy.CLIVersion, Capabilities: []string{"request_direct", "request_build", features.BuildContentPreservationCapability,
					features.BuildAttachmentCapabilityV2, features.BuildBillingCapability, features.BuildIdentityCapability, features.BuildInjectionCapability, features.RequestIdentityCapability, features.DirectBillingCapability, features.RequestLevelsCapability, features.RequestAgentContextCapability}},
				Runner: &Runner{CLI: exe, Version: policy.CLIVersion, Work: root, WorkingDirectory: root, Env: envWith(os.Environ(), map[string]string{
					"CCG_TEST_REQUEST_PEER": "capture", "CCG_TEST_REQUEST_READY": filepath.Join(root, "input.jsonl"), "CCG_TEST_REQUEST_ENV_CAPTURE": envCapture,
				})}}
			req := httptest.NewRequest("POST", "/v1/messages", strings.NewReader(`{"model":"fixture","system":"plain system","messages":[{"role":"user","content":"hello"}]}`))
			req.Header.Set("x-api-key", "fixture")
			req.Header.Set(features.PolicyHeader, tc.Wire)
			out := httptest.NewRecorder()
			g.ServeHTTP(out, req)
			require.Equal(t, 200, out.Code, out.Body.String())
			var env map[string]string
			data, err := os.ReadFile(envCapture)
			require.NoError(t, err)
			require.NoError(t, json.Unmarshal(data, &env))
			if policy.RelayMode == "direct" {
				// Direct hands the CLI the billing choices alone.
				var direct struct {
					Entrypoint string                       `json:"build_billing_entrypoint"`
					Billing    features.BuildBillingSources `json:"build_billing_sources"`
				}
				require.NoError(t, json.Unmarshal([]byte(env[directPolicyEnv]), &direct))
				require.Equal(t, policy.BuildBillingEntrypoint, direct.Entrypoint)
				require.Equal(t, policy.BuildBillingSources, direct.Billing)
				return
			}
			stdin, err := os.ReadFile(filepath.Join(root, "input.jsonl"))
			require.NoError(t, err)
			var envelope struct {
				RequestPolicy json.RawMessage `json:"requestPolicy"`
			}
			require.NoError(t, json.Unmarshal(stdin, &envelope))
			want, err := json.Marshal(policy.CLI())
			require.NoError(t, err)
			require.JSONEq(t, string(want), string(envelope.RequestPolicy), "the envelope carries the policy's CLI part")
		})
	}
	require.Equal(t, map[string]bool{"build": true, "direct": true}, modes, "the editor cases cover both relay modes")
}
