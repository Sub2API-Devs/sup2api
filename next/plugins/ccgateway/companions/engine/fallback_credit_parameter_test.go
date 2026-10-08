package engine

import (
	"encoding/json"
	"errors"
	"github.com/Sub2API-Devs/sup2api/next/plugins/ccgateway/companions/contracts/credits"
	"net/http"
	"os"
	"path/filepath"
	"strings"
	"testing"
)

func TestCreditParameterNullAndObjectAdmission(t *testing.T) {
	for _, value := range []any{nil, Object{"token": "fixture"}, Object{"token": "fixture", "mode": "strict"}, Object{"token": "fixture", "mode": "best_effort"}} {
		body := basic()
		body["fallback_credit_token"] = value
		req, err := parsePolicyRequest(mustMCPJSON(body), http.Header{"Anthropic-Beta": {"fallback-credit-2026-07-01"}})
		if err != nil {
			t.Fatal(err)
		}
		if value == nil {
			if req.Plan.creditToken != "" || string(req.Plan.fields["fallback_credit_token"]) != "null" {
				t.Fatal("null gained redemption semantics")
			}
		} else if digest(req.Plan.creditParameter.Raw) != digest(json.RawMessage(mustMCPJSON(value))) {
			t.Fatal("parameter shape changed")
		}
	}
	body := basic()
	body["fallback_credit_token"] = Object{"token": "fixture"}
	if _, err := parsePolicyRequest(mustMCPJSON(body), http.Header{"Anthropic-Beta": {"fallback-credit-2026-06-01"}}); err == nil {
		t.Fatal("object accepted without July beta")
	}
}
func TestBestEffortCannotDeferUnprovedToolContext(t *testing.T) {
	parameter, _ := credits.ParseParameter(Object{"token": "fixture", "mode": "best_effort"})
	req := &Request{creditPTCDeferred: true, credit: &creditExecution{}, Plan: &RequestPlan{creditToken: "fixture", creditParameter: parameter}, Messages: []Message{{Role: "user", Content: []Object{{"type": "text", "text": "question"}}}, {Role: "assistant", Content: []Object{{"type": "tool_use", "id": "unpaired", "name": "lookup", "input": Object{}}}}}, origin: []int{0, 1}}
	if req.finalizeCreditPTCAdmission() == nil {
		t.Fatal("best effort token authorized unpaired client tool echo")
	}
	req.Messages = []Message{{Role: "user", Content: []Object{{"type": "text", "text": "question"}}}}
	req.origin = []int{0}
	if err := req.finalizeCreditPTCAdmission(); err != nil {
		t.Fatal("normal history rejected", err)
	}
}
func TestCreditLookupDistinguishesMissingFromCorruption(t *testing.T) {
	registry, err := newCreditRegistry(t.TempDir(), "key", 1<<20)
	if err != nil {
		t.Fatal(err)
	}
	hash, _ := credits.TokenHash("fixture")
	if _, _, err := registry.lookup(hash); !errors.Is(err, errCreditSnapshotMissing) {
		t.Fatal("missing snapshot not distinguished", err)
	}
	path := filepath.Join(registry.dir, hash+".credit")
	os.WriteFile(path, []byte("broken"), 0600)
	if _, _, err := registry.lookup(hash); err == nil || errors.Is(err, errCreditSnapshotMissing) {
		t.Fatal("corruption treated as absent token")
	}
}
func TestCreditObjectSecretEchoIsRedacted(t *testing.T) {
	d := &requestDiagnostic{directory: t.TempDir(), fields: Object{}}
	d.prepareSecrets([]byte(`{"fallback_credit_token":{"token":"OBJECT_SECRET_SENTINEL","mode":"best_effort"}}`))
	d.save("safe.json", []byte(`{"echo":"OBJECT_SECRET_SENTINEL","fallback_credit_token":{"token":"OBJECT_SECRET_SENTINEL"}}`))
	raw, _ := os.ReadFile(filepath.Join(d.directory, "safe.json"))
	if strings.Contains(string(raw), "OBJECT_SECRET_SENTINEL") {
		t.Fatal("object token leaked into diagnostic echo")
	}
}

func TestCreditOutcomeRestorationKeepsStatusAndShape(t *testing.T) {
	source := Object{"status": Object{"type": "redeemed"}, "counter": json.Number("9007199254740993")}
	target := Object{"usage": Object{"fallback_credit": Object{"status": Object{"type": "redeemed"}, "counter": json.Number("9007199254740992")}}}
	if err := restoreCreditUsage(target, source); err != nil {
		t.Fatal(err)
	}
	if !strings.Contains(string(mustMCPJSON(target)), "9007199254740993") {
		t.Fatal("source precision not restored")
	}
	target["usage"] = Object{"fallback_credit": Object{"status": Object{"type": "rejected"}, "counter": json.Number("9007199254740992")}}
	if restoreCreditUsage(target, source) == nil {
		t.Fatal("changed credit status was overwritten")
	}
}
func TestBestEffortStillRequiresPendingParentContainer(t *testing.T) {
	parameter, _ := credits.ParseParameter(Object{"token": "fixture", "mode": "best_effort"})
	parent := Object{"type": "server_tool_use", "id": "srv_exec", "name": "code_execution", "input": Object{}}
	call := Object{"type": "tool_use", "id": "tool_ptc", "name": "lookup", "input": Object{}, "caller": Object{"type": "code_execution_20260120", "tool_id": "srv_exec"}}
	req := &Request{credit: &creditExecution{}, Plan: &RequestPlan{creditToken: "fixture", creditParameter: parameter}, Messages: []Message{{Role: "user", Content: []Object{{"type": "text", "text": "question"}}}, {Role: "assistant", Content: []Object{parent, call}}, {Role: "user", Content: []Object{{"type": "tool_result", "tool_use_id": "tool_ptc", "content": "result"}}}}}
	if err := req.configureProviderExecution(); err == nil {
		t.Fatal("unproved best effort bypassed missing container context")
	}
}
