package features

import (
	"encoding/json"
	"testing"
)

func TestHelperPayloadCapabilityIsIndependent(t *testing.T) {
	base := RuntimeCapabilities{ProtocolVersion: 1, Build: BuildInfo{Version: "fixture", Revision: "fixture"}, Catalog: Catalog(), PolicySchemaVersions: []int{1}, HelperHistorySchemaVersions: []int{1}, Probes: []RuntimeProbe{}, ModelProviderVerification: "not_run"}
	for _, tc := range []struct {
		versions []int
		fail     bool
	}{{nil, false}, {[]int{1, 2}, false}, {[]int{999}, false}, {[]int{2, 2}, true}, {[]int{0}, true}, {[]int{1025}, true}} {
		base.HelperHistoryPayloadVersions = tc.versions
		raw, _ := json.Marshal(base)
		v, err := DecodeRuntimeCapabilities(raw)
		if (err != nil) != tc.fail {
			t.Fatalf("versions%v: %v", tc.versions, err)
		}
		if err == nil && (len(v.HelperHistorySchemaVersions) != 1 || v.HelperHistorySchemaVersions[0] != 1) {
			t.Fatal("payload capability changed transport schema")
		}
	}
}
