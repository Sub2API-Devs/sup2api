package ccgateway

import (
	"encoding/json"
	"strings"
	"testing"
)

func TestRequestLogLimitsProjection(t *testing.T) {
	for _, tc := range []struct {
		name, raw string
		wantError bool
	}{
		{"legacy", `{"enabled":true,"private_data":"hidden"}`, false},
		{"current", `{"enabled":false,"per_request_limit_bytes":67108864,"retention_hours":24,"storage_budget_bytes":536870912,"overflow_behavior":"retain_partial_with_metadata","private_data":"hidden"}`, false},
		{"partial", `{"enabled":true,"retention_hours":48}`, false},
		{"null optional", `{"enabled":true,"retention_hours":null}`, false},
		{"future behavior", `{"enabled":true,"overflow_behavior":"private_unknown_value"}`, false},
		{"zero", `{"enabled":true,"retention_hours":0}`, true},
		{"negative", `{"enabled":true,"per_request_limit_bytes":-1}`, true},
		{"wrong type", `{"enabled":true,"storage_budget_bytes":"huge"}`, true},
		{"unsafe precision", `{"enabled":true,"storage_budget_bytes":9007199254740992}`, true},
		{"missing enabled", `{"retention_hours":24}`, true},
	} {
		t.Run(tc.name, func(t *testing.T) {
			out, err := decodeRequestLogState([]byte(tc.raw))
			if (err != nil) != tc.wantError {
				t.Fatalf("unexpected error: %v", err)
			}
			if err != nil {
				return
			}
			encoded, err := json.Marshal(out)
			if err != nil || strings.Contains(string(encoded), "private_") || strings.Contains(string(encoded), "hidden") {
				t.Fatalf("unprojected Worker data leaked: %s %v", encoded, err)
			}
			if tc.name == "legacy" && string(encoded) != `{"enabled":true}` {
				t.Fatal("legacy response invented limits", string(encoded))
			}
			if tc.name == "current" && (out.RetentionHours == nil || *out.RetentionHours != 24 || out.OverflowBehavior != "retain_partial_with_metadata") {
				t.Fatal("Worker limits lost", string(encoded))
			}
		})
	}
}
