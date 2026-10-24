package features

import (
	"encoding/json"
	"fmt"
	"strings"
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
	ProtocolVersion              int            `json:"protocol_version"`
	Build                        BuildInfo      `json:"build"`
	Catalog                      Document       `json:"code_catalog"`
	PolicySchemaVersions         []int          `json:"policy_schema_versions"`
	ExecutionModes               []string       `json:"execution_modes,omitempty"`
	HelperHistorySchemaVersions  []int          `json:"helper_history_schema_versions,omitempty"`
	HelperHistoryPayloadVersions []int          `json:"helper_history_payload_versions,omitempty"`
	Probes                       []RuntimeProbe `json:"runtime_probes"`
	ModelProviderVerification    string         `json:"model_provider_verification"`
}

// DecodeRuntimeCapabilities validates and decodes one Worker capability
// document. Unknown fields are dropped; every boundary is checked here because
// the document crosses a host/Worker trust boundary.
func DecodeRuntimeCapabilities(raw []byte) (RuntimeCapabilities, error) {
	var out RuntimeCapabilities
	if err := rejectExplicitHelperPayload(raw); err != nil {
		return out, err
	}
	if err := json.Unmarshal(raw, &out); err != nil {
		return out, err
	}
	if err := validateEnvelope(raw, out); err != nil {
		return out, err
	}
	if err := validateModes(out.ExecutionModes); err != nil {
		return out, err
	}
	for _, v := range out.PolicySchemaVersions {
		if v < 1 || v > 1024 {
			return out, fmt.Errorf("invalid policy schema version")
		}
	}
	if err := validateUniqueRange(out.HelperHistorySchemaVersions, "helper history"); err != nil {
		return out, err
	}
	if err := validateUniqueRange(out.HelperHistoryPayloadVersions, "helper payload"); err != nil {
		return out, err
	}
	if err := validateProbes(out.Probes); err != nil {
		return out, err
	}
	if err := validateCatalog(out.Catalog.Features); err != nil {
		return out, err
	}
	return out, nil
}

// rejectExplicitHelperPayload keeps an explicit null or empty
// helper_history_payload_versions distinguishable from an omitted legacy field.
func rejectExplicitHelperPayload(raw []byte) error {
	var fields map[string]json.RawMessage
	if err := json.Unmarshal(raw, &fields); err != nil {
		return err
	}
	for key, value := range fields {
		if !strings.EqualFold(key, "helper_history_payload_versions") {
			continue
		}
		var versions []int
		if key != "helper_history_payload_versions" || json.Unmarshal(value, &versions) != nil || len(versions) == 0 {
			return fmt.Errorf("invalid explicit helper payload capabilities")
		}
	}
	return nil
}

// validateEnvelope checks the outer document and the catalog envelope that the
// typed unmarshal cannot distinguish (presence of runtime_verified).
func validateEnvelope(raw []byte, out RuntimeCapabilities) error {
	var envelope struct {
		Catalog struct {
			RuntimeVerified *bool `json:"runtime_verified"`
		} `json:"code_catalog"`
	}
	if err := json.Unmarshal(raw, &envelope); err != nil || envelope.Catalog.RuntimeVerified == nil || *envelope.Catalog.RuntimeVerified || out.Probes == nil || len(out.Catalog.Features) == 0 || out.Build.Revision == "" {
		return fmt.Errorf("incomplete Worker capability document")
	}
	if out.ProtocolVersion != CapabilityProtocolVersion || out.Catalog.RuntimeVerified || out.Catalog.CatalogVersion == "" || len(out.Catalog.CatalogVersion) > 128 || out.Catalog.PolicySchemaVersion < 1 || len(out.Catalog.Features) > 256 || len(out.Build.Version) > 128 || out.Build.Version == "" || len(out.Build.Revision) > 128 || len(out.PolicySchemaVersions) == 0 || len(out.PolicySchemaVersions) > 16 || len(out.Probes) > 16 || out.ModelProviderVerification != "not_run" {
		return fmt.Errorf("invalid or unsupported Worker capability document")
	}
	return nil
}

func validateModes(modes []string) error {
	seen := map[string]bool{}
	for _, mode := range modes {
		if (mode != "native" && mode != "request_direct" && mode != "request_build") || seen[mode] {
			return fmt.Errorf("invalid execution mode capability")
		}
		seen[mode] = true
	}
	return nil
}

// validateUniqueRange bounds one version list: at most 16 entries, each in
// 1..1024 and appearing once.
func validateUniqueRange(list []int, name string) error {
	if len(list) > 16 {
		return fmt.Errorf("oversized %s capabilities", name)
	}
	seen := map[int]bool{}
	for _, v := range list {
		if v < 1 || v > 1024 || seen[v] {
			return fmt.Errorf("invalid %s capability", name)
		}
		seen[v] = true
	}
	return nil
}

func validateProbes(probes []RuntimeProbe) error {
	for _, p := range probes {
		if p.Name != "cli_version" || (p.Status != "observed" && p.Status != "unavailable") || len(p.Value) > 128 {
			return fmt.Errorf("invalid runtime probe")
		}
	}
	return nil
}

func validateCatalog(features []Feature) error {
	seen := map[string]bool{}
	for _, f := range features {
		if len(f.ID) > 64 || f.ID == "" || seen[f.ID] || (f.Scope != "api" && f.Scope != "cc") || (f.Status != "supported" && f.Status != "partial" && f.Status != "unsupported" && f.Status != "unverified") || len(f.Reason) > 4096 || len(f.Title) > 256 || len(f.Category) > 128 {
			return fmt.Errorf("invalid source catalog feature")
		}
		seen[f.ID] = true
		for _, list := range [][]string{f.BodyPaths, f.BetaHeaders, f.Mechanisms, f.Requirements} {
			if len(list) > 128 {
				return fmt.Errorf("oversized catalog field")
			}
			for _, value := range list {
				if len(value) > 4096 {
					return fmt.Errorf("oversized catalog value")
				}
			}
		}
	}
	return nil
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
