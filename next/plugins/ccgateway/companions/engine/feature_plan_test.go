package engine

import (
	"encoding/json"
	"net/http"
	"reflect"
	"strings"
	"testing"
)

func plannedRequest(t *testing.T, extra Object) *Request {
	t.Helper()
	body := basic()
	for k, v := range extra {
		body[k] = v
	}
	raw, _ := json.Marshal(body)
	r, err := parsePolicyRequest(raw, http.Header{})
	if err != nil {
		t.Fatal(err)
	}
	return r
}

func TestGenerationPlanAppliesExactControlsWithoutAliasing(t *testing.T) {
	r := plannedRequest(t, Object{"temperature": 0.2, "top_p": 0.95, "top_k": 12, "stop_sequences": []any{"END", ""}, "service_tier": "standard_only", "metadata": Object{"user_id": "client-user"}})
	if !r.HasMainRequestFeatures() || len(r.Plan.FeatureDecisions()) != 7 {
		t.Fatal("missing generation decisions")
	}
	raw := r.Plan.RawRequest()
	raw[0] = 'x'
	if !json.Valid(r.Plan.RawRequest()) {
		t.Fatal("raw request is mutable")
	}
	view := r.Plan.MainRequestFields()
	view["stop_sequences"].([]any)[0] = "changed"
	wire := Object{"temperature": 1.0, "metadata": Object{"session_id": "cc-session"}, "messages": "untouched"}
	if err := r.ApplyMainRequestFeatures(wire); err != nil {
		t.Fatal(err)
	}
	if wire["temperature"] != json.Number("0.2") || wire["top_k"] != json.Number("12") || wire["messages"] != "untouched" {
		t.Fatal(wire)
	}
	if !reflect.DeepEqual(wire["metadata"], Object{"user_id": "client-user"}) {
		t.Fatal(wire)
	}
	wire["stop_sequences"].([]any)[0] = "mutated"
	next := Object{}
	if err := r.ApplyMainRequestFeatures(next); err != nil || next["stop_sequences"].([]any)[0] != "END" {
		t.Fatal("plan leaked mutation", err)
	}
}

func TestGenerationPlanClientMetadataReplacesCLIAttribution(t *testing.T) {
	r := plannedRequest(t, Object{"temperature": 0.1, "metadata": Object{"user_id": "client"}})
	wire := Object{"temperature": 1.0, "metadata": Object{"user_id": `{"account_uuid":"cc-account","session_id":"cc-session"}`}}
	err := r.ApplyMainRequestFeatures(wire)
	if err != nil || !reflect.DeepEqual(wire["metadata"], Object{"user_id": "client"}) || wire["temperature"] != json.Number("0.1") {
		t.Fatal("external attribution incorrectly rejected or changed", err, wire)
	}
}

func TestGenerationPlanValidationAndSemanticIgnore(t *testing.T) {
	p := defaultRequestPolicy()
	p.UnknownField = "ignore"
	for _, invalid := range []Object{
		{"temperature": -1}, {"temperature": 1.1}, {"top_p": "0.5"}, {"top_k": 1.5}, {"top_k": -1},
		{"stop_sequences": "stop"}, {"stop_sequences": []any{1}}, {"service_tier": "priority"},
		{"metadata": Object{"session_id": "impersonate"}}, {"metadata": Object{"user_id": strings.Repeat("a", 513)}},
		{"context_management": Object{}}, {"container": nil}, {"mcp_servers": []any{}},
		{"output_config": Object{"task_budget": Object{}}},
	} {
		v := basic()
		for key, value := range invalid {
			v[key] = value
		}
		raw, _ := json.Marshal(v)
		if _, err := parsePolicyRequest(raw, policyHeaders(p)); err == nil {
			t.Fatalf("invalid control accepted despite ignore: %v", invalid)
		}
	}
}

func TestForcedToolChoicePreservesWireNamesAndParallelControl(t *testing.T) {
	tool := Object{"name": "weather", "input_schema": Object{"type": "object"}}
	r := plannedRequest(t, Object{"tools": []any{tool}, "tool_choice": Object{"type": "tool", "name": "weather", "disable_parallel_tool_use": true}})
	wire := Object{}
	if err := r.ApplyMainRequestFeatures(wire); err != nil {
		t.Fatal(err)
	}
	choice := wire["tool_choice"].(map[string]any)
	if choice["name"] != "mcp__ccgateway__weather" || choice["disable_parallel_tool_use"] != true {
		t.Fatal(choice)
	}
	r.Native["weather"] = true
	if err := r.ApplyMainRequestFeatures(wire); err != nil || wire["tool_choice"].(map[string]any)["name"] != "weather" {
		t.Fatal(wire, err)
	}
	for _, choice := range []Object{{"type": "tool", "name": "missing"}, {"type": "none", "disable_parallel_tool_use": true}, {"type": "auto", "name": "weather"}} {
		v := basic()
		v["tools"] = []any{tool}
		v["tool_choice"] = choice
		raw, _ := json.Marshal(v)
		if _, err := parsePolicyRequest(raw, http.Header{}); err == nil {
			t.Fatal("invalid tool choice accepted", choice)
		}
	}
	v := basic()
	v["tools"] = []any{tool}
	v["tool_choice"] = Object{"type": "any"}
	v["max_tokens"] = 2048
	v["thinking"] = Object{"type": "enabled", "budget_tokens": 1024}
	raw, _ := json.Marshal(v)
	if _, err := parsePolicyRequest(raw, http.Header{}); err == nil {
		t.Fatal("forced manual thinking conflict accepted")
	}
}

func TestAdaptiveThinkingForcedToolChoiceDefersModelConstraint(t *testing.T) {
	for _, model := range []string{"claude-opus-5", "claude-opus-5-5", "custom-claude-alias"} {
		for _, choice := range []Object{{"type": "any"}, {"type": "tool", "name": "weather"}} {
			r := plannedRequest(t, Object{
				"model": model, "thinking": Object{"type": "adaptive"},
				"tools":       []any{Object{"name": "weather", "input_schema": Object{"type": "object"}}},
				"tool_choice": choice,
			})
			wire := Object{}
			if err := r.ApplyMainRequestFeatures(wire); err != nil {
				t.Fatal(err)
			}
			got := wire["tool_choice"].(map[string]any)
			if got["type"] != choice["type"] {
				t.Fatal("forced choice was changed", got)
			}
		}
	}
}

func TestMetadataUserIDOfficialCharacterLimit(t *testing.T) {
	for _, count := range []int{256, 257, 512} {
		value := strings.Repeat("界", count)
		r := plannedRequest(t, Object{"metadata": Object{"user_id": value}})
		wire := Object{}
		if err := r.ApplyMainRequestFeatures(wire); err != nil {
			t.Fatal(err)
		}
		if wire["metadata"].(map[string]any)["user_id"] != value {
			t.Fatal("metadata identifier changed")
		}
	}
	if err := validateGenerationField("metadata", Object{"user_id": strings.Repeat("界", 513)}); err == nil {
		t.Fatal("metadata character limit exceeded")
	}
}

func TestForcedToolChoiceInternalRoundConflicts(t *testing.T) {
	for _, structured := range []bool{false, true} {
		v := basic()
		tool := Object{"name": "weather", "input_schema": Object{"type": "object"}}
		if structured {
			v["output_config"] = Object{"format": Object{"type": "json_schema", "schema": Object{"type": "object"}}}
		} else {
			tool["defer_loading"] = true
		}
		v["tools"] = []any{tool}
		v["tool_choice"] = Object{"type": "any"}
		raw, _ := json.Marshal(v)
		_, err := parsePolicyRequest(raw, http.Header{})
		if structured {
			if err != nil {
				t.Fatal("API constrained output has no synthetic continuation", err)
			}
		} else if err == nil || !strings.Contains(err.Error(), "continuation-phase") {
			t.Fatal("internal rounds would change forced semantics", err)
		}
	}
}

func TestGenerationPlanKeepsIntegerPrecision(t *testing.T) {
	r := plannedRequest(t, Object{"top_k": json.Number("9007199254740993")})
	wire := Object{}
	if err := r.ApplyMainRequestFeatures(wire); err != nil {
		t.Fatal(err)
	}
	raw, _ := json.Marshal(wire)
	if string(raw) != `{"max_tokens":128,"top_k":9007199254740993}` {
		t.Fatal("JSON number changed", string(raw))
	}
}

func TestGenerationPlanNumericBoundaryPrecision(t *testing.T) {
	for _, name := range []string{"temperature", "top_p"} {
		for _, value := range []string{"-1e-9999", "1.00000000000000000001", "1e9999"} {
			if err := validateGenerationField(name, json.Number(value)); err == nil {
				t.Errorf("%s accepted out-of-range JSON number %s", name, value)
			}
		}
		for _, value := range []string{"0", "-0", "-0e999", "1e-9999", "0.99999999999999999999", "1", "0.2"} {
			if err := validateGenerationField(name, json.Number(value)); err != nil {
				t.Errorf("%s rejected valid API range %s: %v", name, value, err)
			}
		}
	}
	for _, value := range []string{"9223372036854775808", "1e9999", "-1", "1.5"} {
		if err := validateGenerationField("top_k", json.Number(value)); err == nil {
			t.Errorf("top_k accepted invalid integer %s", value)
		}
	}
}

func TestGenerationPlanRejectsWrongTypesWithoutPanic(t *testing.T) {
	for _, name := range []string{"temperature", "top_p", "top_k", "metadata", "service_tier", "tool_choice", "stop_sequences"} {
		for _, value := range []any{nil, true, Object{"unexpected": []any{}}, []any{Object{}}} {
			body := basic()
			body[name] = value
			raw, err := json.Marshal(body)
			if err != nil {
				t.Fatal(err)
			}
			if _, err := parsePolicyRequest(raw, http.Header{}); err == nil {
				t.Errorf("invalid %s type %T accepted", name, value)
			}
		}
	}
	// Nullable user_id is different from a null metadata object.
	r := plannedRequest(t, Object{"metadata": Object{"user_id": nil}})
	message := Object{}
	if err := r.ApplyMainRequestFeatures(message); err != nil {
		t.Fatal(err)
	}
	if value, exists := message["metadata"].(map[string]any)["user_id"]; !exists || value != nil {
		t.Fatal("explicit null user_id was lost", message)
	}
}
