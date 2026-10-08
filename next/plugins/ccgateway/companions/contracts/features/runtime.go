package features

import (
	"encoding/json"
	"fmt"
)

const CapabilityProtocolVersion = 1

type BuildInfo struct {
	Version  string `json:"version"`
	Revision string `json:"revision"`
	Modified bool   `json:"modified"`
}

type RuntimeProbe struct {
	Name   string `json:"name"`
	Status string `json:"status"`
	Value  string `json:"value,omitempty"`
}

// RuntimeCapabilities separates running-binary declarations, local probes and
// real provider verification. A health check cannot promote any feature.
type RuntimeCapabilities struct {
	ProtocolVersion             int            `json:"protocol_version"`
	Build                       BuildInfo      `json:"build"`
	Catalog                     Document       `json:"code_catalog"`
	PolicySchemaVersions        []int          `json:"policy_schema_versions"`
	HelperHistorySchemaVersions []int          `json:"helper_history_schema_versions,omitempty"`
	Probes                      []RuntimeProbe `json:"runtime_probes"`
	ModelProviderVerification   string         `json:"model_provider_verification"`
}

func DecodeRuntimeCapabilities(raw []byte) (RuntimeCapabilities, error) {
	var out RuntimeCapabilities
	if err := json.Unmarshal(raw, &out); err != nil {
		return out, err
	}
	var envelope struct {
		Catalog struct {
			RuntimeVerified *bool `json:"runtime_verified"`
		} `json:"code_catalog"`
	}
	if err := json.Unmarshal(raw, &envelope); err != nil || envelope.Catalog.RuntimeVerified == nil || *envelope.Catalog.RuntimeVerified || out.Probes == nil || len(out.Catalog.Features) == 0 || out.Build.Revision == "" {
		return out, fmt.Errorf("incomplete Worker capability document")
	}
	if out.ProtocolVersion != CapabilityProtocolVersion || out.Catalog.RuntimeVerified || out.Catalog.CatalogVersion == "" || len(out.Catalog.CatalogVersion) > 128 || out.Catalog.PolicySchemaVersion < 1 || len(out.Catalog.Features) > 256 || len(out.Build.Version) > 128 || out.Build.Version == "" || len(out.Build.Revision) > 128 || len(out.PolicySchemaVersions) == 0 || len(out.PolicySchemaVersions) > 16 || len(out.Probes) > 16 || out.ModelProviderVerification != "not_run" {
		return out, fmt.Errorf("invalid or unsupported Worker capability document")
	}
	for _, v := range out.PolicySchemaVersions {
		if v < 1 || v > 1024 {
			return out, fmt.Errorf("invalid policy schema version")
		}
	}
	if len(out.HelperHistorySchemaVersions) > 16 {
		return out, fmt.Errorf("oversized helper history capabilities")
	}
	helperSeen := map[int]bool{}
	for _, v := range out.HelperHistorySchemaVersions {
		if v < 1 || v > 1024 || helperSeen[v] {
			return out, fmt.Errorf("invalid helper history capability")
		}
		helperSeen[v] = true
	}
	for _, p := range out.Probes {
		if p.Name != "cli_version" || (p.Status != "observed" && p.Status != "unavailable") || len(p.Value) > 128 {
			return out, fmt.Errorf("invalid runtime probe")
		}
	}
	seen := map[string]bool{}
	for _, f := range out.Catalog.Features {
		if len(f.ID) > 64 || f.ID == "" || seen[f.ID] || (f.Scope != "api" && f.Scope != "cc") || (f.Status != "supported" && f.Status != "partial" && f.Status != "unsupported" && f.Status != "unverified") || len(f.Reason) > 4096 || len(f.Title) > 256 || len(f.Category) > 128 {
			return out, fmt.Errorf("invalid source catalog feature")
		}
		seen[f.ID] = true
		for _, list := range [][]string{f.BodyPaths, f.BetaHeaders, f.Mechanisms, f.Requirements} {
			if len(list) > 128 {
				return out, fmt.Errorf("oversized catalog field")
			}
			for _, value := range list {
				if len(value) > 4096 {
					return out, fmt.Errorf("oversized catalog value")
				}
			}
		}
	}
	return out, nil
}

// Missing schema_version is the legacy v1 contract. Explicit null/zero and
// future versions are not silently reinterpreted as the current version.
func ValidatePolicySchemaJSON(raw []byte) error {
	var fields map[string]json.RawMessage
	if err := json.Unmarshal(raw, &fields); err != nil || fields == nil {
		return fmt.Errorf("invalid request policy")
	}
	value, present := fields["schema_version"]
	if !present {
		return nil
	}
	var version int
	if err := json.Unmarshal(value, &version); err != nil || string(value) == "null" || version != PolicySchemaVersion {
		return fmt.Errorf("unsupported request policy schema_version")
	}
	return nil
}
