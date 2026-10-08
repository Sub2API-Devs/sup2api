package features

import (
	"encoding/json"
	"testing"
)

func TestReviewPayloadCapabilitiesExplicitEmptyIsNotLegacyOmission(t *testing.T) {
	base := RuntimeCapabilities{ProtocolVersion: 1, Build: BuildInfo{Version: "test", Revision: "fixture"}, Catalog: Catalog(), PolicySchemaVersions: []int{1}, Probes: []RuntimeProbe{}, ModelProviderVerification: "not_run"}
	raw, _ := json.Marshal(base)
	for _, v := range []string{"null", "[]"} {
		body := append([]byte(`{"helper_history_payload_versions":`+v+`,`), raw[1:]...)
		if _, err := DecodeRuntimeCapabilities(body); err == nil {
			t.Errorf("explicit %s treated as omitted legacy capability", v)
		}
	}
}
