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
		{"null levels is legacy", `{"enabled":true,"levels":null}`, false},
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
			st, ok := out.(requestLogState)
			if !ok {
				t.Fatalf("legacy Worker got the levels shape: %T", out)
			}
			encoded, err := json.Marshal(st)
			if err != nil || strings.Contains(string(encoded), "private_") || strings.Contains(string(encoded), "hidden") {
				t.Fatalf("unprojected Worker data leaked: %s %v", encoded, err)
			}
			if (tc.name == "legacy" || tc.name == "null levels is legacy") && string(encoded) != `{"enabled":true}` {
				t.Fatal("legacy response invented limits", string(encoded))
			}
			if tc.name == "current" && (st.RetentionHours == nil || *st.RetentionHours != 24 || st.OverflowBehavior != "retain_partial_with_metadata") {
				t.Fatal("Worker limits lost", string(encoded))
			}
		})
	}
}

func TestRequestLogLevelsProjection(t *testing.T) {
	const limits = `"limits":{"summary":{"retention_hours":168,"storage_budget_bytes":134217728,"per_request_limit_bytes":262144},"full":{"retention_hours":24,"storage_budget_bytes":536870912,"per_request_limit_bytes":67108864}}`
	const levels = `"levels":["off","summary","full"]`
	ok := func(fields string) string {
		return `{` + fields + `,` + levels + `,` + limits + `,"private_data":"hidden"}`
	}
	for _, tc := range []struct {
		name, raw string
		wantError bool
	}{
		{"summary", ok(`"enabled":true,"level":"summary","full_until":null,"usage":{"summary_bytes":10,"full_bytes":0,"requests":2}`), false},
		{"off", ok(`"enabled":false,"level":"off","full_until":null`), false},
		{"full", ok(`"enabled":true,"level":"full","full_until":"2026-10-23T12:00:00Z","usage":{"summary_bytes":0,"full_bytes":5,"requests":1}`), false},
		{"full with offset and fraction", ok(`"enabled":true,"level":"full","full_until":"2026-10-23T20:00:00.5+08:00"`), false},
		{"stale expiry ignored below full", ok(`"enabled":true,"level":"summary","full_until":"2026-10-23T12:00:00Z"`), false},
		{"subset of levels", `{"enabled":true,"level":"summary","levels":["off","summary"]}`, false},
		{"no limits or usage", `{"enabled":true,"level":"summary","levels":["off","summary","full"]}`, false},
		{"full without expiry", ok(`"enabled":true,"level":"full","full_until":null`), true},
		{"bad expiry", ok(`"enabled":true,"level":"full","full_until":"tomorrow"`), true},
		{"expiry not a string", ok(`"enabled":true,"level":"full","full_until":12`), true},
		{"unknown level", ok(`"enabled":true,"level":"debug"`), true},
		{"missing level", ok(`"enabled":true`), true},
		{"level not offered", `{"enabled":true,"level":"full","full_until":"2026-10-23T12:00:00Z","levels":["off","summary"]}`, true},
		{"unknown level in list", `{"enabled":true,"level":"summary","levels":["off","summary","debug"]}`, true},
		{"duplicate level in list", `{"enabled":true,"level":"summary","levels":["summary","summary"]}`, true},
		{"empty levels", `{"enabled":true,"level":"summary","levels":[]}`, true},
		{"levels not a list", `{"enabled":true,"level":"summary","levels":"all"}`, true},
		{"enabled disagrees", ok(`"enabled":false,"level":"summary"`), true},
		{"off but enabled", ok(`"enabled":true,"level":"off"`), true},
		{"negative usage", ok(`"enabled":true,"level":"summary","usage":{"summary_bytes":-1}`), true},
		{"unsafe usage", ok(`"enabled":true,"level":"summary","usage":{"full_bytes":9007199254740992}`), true},
		{"fractional usage", ok(`"enabled":true,"level":"summary","usage":{"requests":1.5}`), true},
		{"zero tier limit", `{"enabled":true,"level":"summary",` + levels + `,"limits":{"summary":{"retention_hours":0}}}`, true},
		{"unsafe tier limit", `{"enabled":true,"level":"summary",` + levels + `,"limits":{"full":{"storage_budget_bytes":9007199254740992}}}`, true},
	} {
		t.Run(tc.name, func(t *testing.T) {
			out, err := decodeRequestLogState([]byte(tc.raw))
			if (err != nil) != tc.wantError {
				t.Fatalf("unexpected error: %v", err)
			}
			if err != nil {
				return
			}
			st, isLevels := out.(requestLogLevelState)
			if !isLevels {
				t.Fatalf("levels Worker got the legacy shape: %T", out)
			}
			encoded, _ := json.Marshal(st)
			if strings.Contains(string(encoded), "hidden") {
				t.Fatal("unprojected Worker data leaked", string(encoded))
			}
			var m map[string]any
			_ = json.Unmarshal(encoded, &m)
			if _, present := m["full_until"]; !present {
				t.Fatal("full_until must always be present", string(encoded))
			}
			switch tc.name {
			case "full":
				if *st.FullUntil != "2026-10-23T12:00:00Z" || st.Limits.Summary == nil || *st.Limits.Summary.RetentionHours != 168 || *st.Usage.FullBytes != 5 || *st.Usage.SummaryBytes != 0 {
					t.Fatal("full state lost", string(encoded))
				}
				if !strings.Contains(string(encoded), `"summary_bytes":0`) {
					t.Fatal("zero usage dropped", string(encoded))
				}
			case "full with offset and fraction":
				if *st.FullUntil != "2026-10-23T12:00:00Z" {
					t.Fatal("expiry not normalised", *st.FullUntil)
				}
			case "stale expiry ignored below full", "summary", "off":
				if st.FullUntil != nil {
					t.Fatal("expiry reported below the full level", string(encoded))
				}
			}
		})
	}
}
