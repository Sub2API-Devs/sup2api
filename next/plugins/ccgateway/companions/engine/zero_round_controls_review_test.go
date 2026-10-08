package engine

import (
	"encoding/json"
	"testing"
)

func TestReviewZeroRoundBudgetKeepsAdvancedGates(t *testing.T) {
	for _, mode := range []string{"auto", "none", "implicit", "deferred", "synthetic", "mcp", "server", "inline", "safeguards", "absent-target", "missing-beta"} {
		t.Run(mode, func(t *testing.T) {
			r := forcedLoadedFixture(t)
			r.Plan.taskBudget = json.RawMessage(`{"type":"tokens","total":64000,"remaining":0}`)
			r.Betas = []string{taskBudgetBeta}
			switch mode {
			case "auto", "none":
				r.Plan.fields["tool_choice"] = json.RawMessage(`{"type":"` + mode + `"}`)
			case "implicit":
				r.Tools[0].DeferLoading = nil
			case "deferred":
				v := true
				r.Tools[0].DeferLoading = &v
			case "synthetic":
				r.JSONSchema = Object{"type": "object"}
			case "mcp":
				r.MCP = &MCPConnectorPlan{}
			case "server":
				r.ServerTools = []Object{{"name": "web_search"}}
			case "inline":
				r.InlineTools = &inlineToolTimeline{}
			case "safeguards":
				r.Plan.fields["safeguards"] = json.RawMessage(`[{"fixture":true}]`)
			case "absent-target":
				r.Plan.fields["tool_choice"] = json.RawMessage(`{"type":"tool","name":"absent"}`)
			case "missing-beta":
				r.Betas = nil
			}
			if err := r.Plan.validateTaskBudget(r); err == nil {
				t.Fatal("advanced or invalid request borrowed zero-helper admission")
			}
		})
	}
}

func TestReviewCompletedSafeguardIdentityStillRejectsChangedInput(t *testing.T) {
	b := completedHistoryBody("bash")
	b["safeguards"] = []any{Object{"fixture": "opaque"}}
	raw, _ := json.Marshal(b)
	r, err := parsePolicyRequest(raw, nil)
	if err != nil {
		t.Fatal(err)
	}
	r.Messages[1].Content[0]["input"] = Object{"changed": true}
	if err := r.ApplyMainRequestFeatures(Object{"tools": []any{}}); err == nil {
		t.Fatal("stale completion evidence authorized changed history")
	}
}
