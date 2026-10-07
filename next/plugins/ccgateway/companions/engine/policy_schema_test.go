package engine

import (
	"net/http"
	"testing"
)

func TestPolicySchemaLegacyAndUnknownVersion(t *testing.T) {
	for _, raw := range []string{"", `{}`, `{"schema_version":1}`} {
		h := http.Header{}
		h.Set(policyHeader, raw)
		p, err := requestPolicy(h)
		if err != nil || p.SchemaVersion != 1 {
			t.Fatal(raw, p.SchemaVersion, err)
		}
	}
	for _, raw := range []string{`{"schema_version":0}`, `{"schema_version":null}`, `{"schema_version":2}`} {
		h := http.Header{}
		h.Set(policyHeader, raw)
		if _, err := requestPolicy(h); err == nil {
			t.Fatal("accepted", raw)
		}
	}
}
