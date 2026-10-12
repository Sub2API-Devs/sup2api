package engine

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"os"
	"path/filepath"
	"testing"

	"github.com/Sub2API-Devs/sup2api/next/plugins/ccgateway/companions/contracts/credits"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestNativeRejectsCreditParameterNullAndObject(t *testing.T) {
	for _, tc := range []struct {
		name  string
		value any
	}{
		{"null", nil},
		{"best-effort", Object{"token": "fixture", "mode": "best_effort"}},
	} {
		t.Run(tc.name, func(t *testing.T) {
			body := basic()
			body["fallback_credit_token"] = tc.value
			raw, err := json.Marshal(body)
			require.NoError(t, err)
			req, err := parsePolicyRequest(raw, http.Header{"Anthropic-Beta": {"fallback-credit-2026-07-01"}})
			require.ErrorContains(t, err, "fallback_credit_token is not supported by this gateway")
			assert.Nil(t, req)
		})
	}
}

func TestTrackedCreditRejectsNativeSearchBeforeIssuerLookup(t *testing.T) {
	for _, scoped := range []bool{false, true} {
		body := basic()
		body["tools"] = []any{Object{"type": "web_search_20250305", "name": "web_search"}}
		if scoped {
			body["messages"] = append(body["messages"].([]any), Object{"role": "system", "content": "turn-only", "clear_at": "next_user_message"})
		}
		raw, err := json.Marshal(body)
		require.NoError(t, err)
		h := http.Header{"Anthropic-Beta": {"fallback-credit-2026-07-01"}}
		req, err := parsePolicyRequest(raw, h)
		require.NoError(t, err)
		require.NotNil(t, req.webSearch)
		request := httptest.NewRequest(http.MethodPost, "/v1/messages", nil)
		request.Header = h
		request.Header.Set(credits.TrackingHeader, "1")
		x := &exchange{g: &Gateway{}, req: req, r: request}
		require.ErrorContains(t, x.admitCredit(raw), "without internal tool rounds")
		assert.Nil(t, req.credit)
		assert.Nil(t, x.resources)
	}
}

func TestBestEffortCannotDeferUnprovedToolContext(t *testing.T) {
	parameter, err := credits.ParseParameter(Object{"token": "fixture", "mode": "best_effort"})
	require.NoError(t, err)
	req := &Request{creditPTCDeferred: true, credit: &creditExecution{}, Plan: &RequestPlan{creditToken: "fixture", creditParameter: parameter}, Messages: []Message{{Role: "user", Content: []Object{{"type": "text", "text": "question"}}}, {Role: "assistant", Content: []Object{{"type": "tool_use", "id": "unpaired", "name": "lookup", "input": Object{}}}}}, origin: []int{0, 1}}
	require.Error(t, req.finalizeCreditPTCAdmission(), "best effort token must not authorize unpaired client tool echo")
	req.Messages = []Message{{Role: "user", Content: []Object{{"type": "text", "text": "question"}}}}
	req.origin = []int{0}
	require.NoError(t, req.finalizeCreditPTCAdmission(), "normal history must remain valid")
}
func TestCreditLookupDistinguishesMissingFromCorruption(t *testing.T) {
	registry, err := newCreditRegistry(t.TempDir(), "key", 1<<20)
	require.NoError(t, err)
	hash, err := credits.TokenHash("fixture")
	require.NoError(t, err)
	_, _, err = registry.lookup(hash)
	require.ErrorIs(t, err, errCreditSnapshotMissing)
	path := filepath.Join(registry.dir, hash+".credit")
	require.NoError(t, os.WriteFile(path, []byte("broken"), 0600))
	_, _, err = registry.lookup(hash)
	require.Error(t, err)
	assert.NotErrorIs(t, err, errCreditSnapshotMissing, "corruption must not be treated as an absent token")
}
func TestCreditObjectSecretEchoIsRedacted(t *testing.T) {
	d := &requestDiagnostic{directory: t.TempDir(), fields: Object{}}
	d.prepareSecrets([]byte(`{"fallback_credit_token":{"token":"OBJECT_SECRET_SENTINEL","mode":"best_effort"}}`))
	d.save("safe.json", []byte(`{"echo":"OBJECT_SECRET_SENTINEL","fallback_credit_token":{"token":"OBJECT_SECRET_SENTINEL"}}`))
	raw, err := os.ReadFile(filepath.Join(d.directory, "safe.json"))
	require.NoError(t, err)
	assert.NotContains(t, string(raw), "OBJECT_SECRET_SENTINEL", "object token must not leak into diagnostic echo")
}

func TestCreditOutcomeRestorationKeepsStatusAndShape(t *testing.T) {
	source := Object{"status": Object{"type": "redeemed"}, "counter": json.Number("9007199254740993")}
	target := Object{"usage": Object{"fallback_credit": Object{"status": Object{"type": "redeemed"}, "counter": json.Number("9007199254740992")}}}
	require.NoError(t, restoreCreditUsage(target, source))
	assert.Equal(t, source, target["usage"].(Object)["fallback_credit"], "source precision and shape must be restored exactly")
	target["usage"] = Object{"fallback_credit": Object{"status": Object{"type": "rejected"}, "counter": json.Number("9007199254740992")}}
	require.Error(t, restoreCreditUsage(target, source), "changed credit status must not be overwritten")
}
func TestBestEffortStillRequiresPendingParentContainer(t *testing.T) {
	parameter, err := credits.ParseParameter(Object{"token": "fixture", "mode": "best_effort"})
	require.NoError(t, err)
	parent := Object{"type": "server_tool_use", "id": "srv_exec", "name": "code_execution", "input": Object{}}
	call := Object{"type": "tool_use", "id": "tool_ptc", "name": "lookup", "input": Object{}, "caller": Object{"type": "code_execution_20260120", "tool_id": "srv_exec"}}
	req := &Request{credit: &creditExecution{}, Plan: &RequestPlan{creditToken: "fixture", creditParameter: parameter}, Messages: []Message{{Role: "user", Content: []Object{{"type": "text", "text": "question"}}}, {Role: "assistant", Content: []Object{parent, call}}, {Role: "user", Content: []Object{{"type": "tool_result", "tool_use_id": "tool_ptc", "content": "result"}}}}}
	require.Error(t, req.configureProviderExecution(), "unproved best effort must not bypass missing container context")
}
