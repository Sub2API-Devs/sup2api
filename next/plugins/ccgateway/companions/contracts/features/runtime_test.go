package features

import (
	"encoding/json"
	"strings"
	"testing"
)

func TestPolicySchemaCompatibility(t *testing.T) {
	for _, raw := range []string{`{}`, `{"schema_version":1}`} {
		if err := ValidatePolicySchemaJSON([]byte(raw)); err != nil {
			t.Fatal(raw, err)
		}
	}
	for _, raw := range []string{`null`, `[]`, `{"schema_version":null}`, `{"schema_version":0}`, `{"schema_version":2}`, `{"schema_version":"1"}`, `{"schema_version":1.5}`} {
		if ValidatePolicySchemaJSON([]byte(raw)) == nil {
			t.Fatal("accepted", raw)
		}
	}
}

func TestRuntimeCapabilitiesProjection(t *testing.T) {
	want := RuntimeCapabilities{ProtocolVersion: 1, Build: BuildInfo{Version: "dev", Revision: "unknown"}, Catalog: RequestRuntimeCatalog(nil), PolicySchemaVersions: []int{1}, Probes: []RuntimeProbe{{Name: "cli_version", Status: "unavailable"}}, ModelProviderVerification: "not_run"}
	raw, _ := json.Marshal(want)
	var object map[string]any
	_ = json.Unmarshal(raw, &object)
	object["private_key"] = "must-not-leak"
	raw, _ = json.Marshal(object)
	got, err := DecodeRuntimeCapabilities(raw)
	if err != nil {
		t.Fatal(err)
	}
	encoded, _ := json.Marshal(got)
	if strings.Contains(string(encoded), "must-not-leak") {
		t.Fatal("unknown fields leaked")
	}
	for _, key := range []string{"protocol_version", "model_provider_verification", "policy_schema_versions"} {
		mutated := map[string]any{}
		_ = json.Unmarshal(raw, &mutated)
		delete(mutated, key)
		bad, _ := json.Marshal(mutated)
		if _, err := DecodeRuntimeCapabilities(bad); err == nil {
			t.Fatal("accepted missing", key)
		}
	}
	if got.ExecutionModes != nil {
		t.Fatal("legacy Worker document claimed execution modes")
	}
	for _, modes := range [][]string{{"native"}, {"request_direct"}, {"request_build"}, {}, nil} {
		object["execution_modes"] = modes
		body, err := json.Marshal(object)
		if err != nil {
			t.Fatal(err)
		}
		decoded, err := DecodeRuntimeCapabilities(body)
		if err != nil || strings.Join(decoded.ExecutionModes, ",") != strings.Join(modes, ",") || decoded.ModelProviderVerification != "not_run" || decoded.Catalog.RuntimeVerified {
			t.Fatalf("execution modes lost or promoted to verification: %+v, %v", decoded, err)
		}
	}
	for _, modes := range []any{[]string{"legacy"}, []string{"passthrough"}, []string{"legacy", "passthrough", "native"}, []string{"unknown"}, []string{"native", "native"}, []string{"Native"}, []string{""}, "native", []int{1}} {
		object["execution_modes"] = modes
		body, err := json.Marshal(object)
		if err != nil {
			t.Fatal(err)
		}
		if _, err := DecodeRuntimeCapabilities(body); err == nil {
			t.Fatalf("invalid execution modes accepted: %v", modes)
		}
	}
	delete(object, "execution_modes")
	object["model_provider_verification"] = "verified"
	raw, _ = json.Marshal(object)
	if _, err := DecodeRuntimeCapabilities(raw); err == nil {
		t.Fatal("unscoped verification claim accepted")
	}
}
