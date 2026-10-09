package engine

import (
	"encoding/json"
	"testing"
	"time"
)

func TestCompletedHistorySafeguardsUseActualWireIdentity(t *testing.T) {
	body := completedHistoryBody("bash")
	body["safeguards"] = []any{Object{"fixture": "opaque"}}
	raw, _ := json.Marshal(body)
	r, e := parsePolicyRequest(raw, nil)
	if e != nil {
		t.Fatal(e)
	}
	if e = r.ApplyMainRequestFeatures(Object{"tools": []any{}}); e != nil {
		t.Fatal(e)
	}
	r.completedClientHistory = nil
	if e = r.ApplyMainRequestFeatures(Object{"tools": []any{}}); e == nil {
		t.Fatal("unproven historical rename accepted")
	}
}
func TestTaskBudgetForcedEagerZeroRoundAdmission(t *testing.T) {
	for _, kind := range []string{"tool", "any"} {
		b := basic()
		choice := Object{"type": kind}
		if kind == "tool" {
			choice["name"] = "fixture"
		}
		b["tool_choice"] = choice
		b["tools"] = []any{Object{"name": "fixture", "defer_loading": false, "input_schema": Object{"type": "object"}}}
		b["output_config"] = Object{"task_budget": Object{"type": "tokens", "total": 64000, "remaining": 0}}
		raw, _ := json.Marshal(b)
		p := defaultRequestPolicy()
		p.ToolSearch = "true"
		h := policyHeaders(p)
		h.Set("anthropic-beta", taskBudgetBeta)
		r, e := parsePolicyRequest(raw, h)
		if e != nil {
			t.Fatal(e)
		}
		if !r.forcedLoadedClientCatalog() || r.maxTurns() != "1" {
			t.Fatal("not zero-round")
		}
	}
}

func TestZeroRoundBudgetNamespaceAndGeneralGate(t *testing.T) {
	r := forcedLoadedFixture(t)
	r.Plan.taskBudget = json.RawMessage(`{"type":"tokens","total":64000}`)
	r.Betas = append(r.Betas, taskBudgetBeta)
	key := r.toolHistoryNamespace()
	r.Plan.fields["tool_choice"] = json.RawMessage(`{"type":"auto"}`)
	if key == r.toolHistoryNamespace() {
		t.Fatal("old internal-search native namespace reused")
	}
	if r.Plan.validateTaskBudget(r) == nil {
		t.Fatal("general internal search budget admitted")
	}
	r.Plan.fields["tool_choice"] = json.RawMessage(`{"type":"tool","name":"chosen"}`)
	r.Plan.taskBudget = json.RawMessage(`{"type":"tokens","total":80000,"remaining":32000}`)
	if key != r.toolHistoryNamespace() {
		t.Fatal("budget number unnecessarily invalidated stable namespace")
	}
	deferred := true
	r.Tools[0].DeferLoading = &deferred
	if r.Plan.validateTaskBudget(r) == nil {
		t.Fatal("deferred discovery budget admitted")
	}
}

func TestCompletedHistoryOldIndexCannotResume(t *testing.T) {
	raw, _ := json.Marshal(completedHistoryBody("bash"))
	r, e := parsePolicyRequest(raw, nil)
	if e != nil {
		t.Fatal(e)
	}
	c, e := newCache(t.TempDir(), 1<<20)
	if e != nil {
		t.Fatal(e)
	}
	legacy := *r
	legacy.completedClientHistory = nil
	hashes := fingerprints(r.Messages)
	pending := r.pendingStart()
	snapshot := &Snapshot{Format: 2, Hashes: hashes[:4], Expires: time.Now().Add(time.Hour)}
	c.entries[cacheKey("fixture", legacy.toolHistoryNamespace(), hashes[3])] = snapshot
	if findPriorSnapshot(&legacy, c, "fixture", hashes, pending) == nil {
		t.Fatal("legacy index fixture not readable")
	}
	p, e := prepareHistory(r, c, testBranch("fixture"), t.TempDir(), "2.1.292")
	if e != nil {
		t.Fatal(e)
	}
	if p.Mode != "rebuild" {
		t.Fatalf("old renamed snapshot selected: %s", p.Mode)
	}
}
