package check

import (
	"encoding/json"
	"testing"

	"github.com/Sub2API-Devs/sup2api/next/sdk/manifest"
)

func TestLifecycleExtensionBoundaries(t *testing.T) {
	for _, test := range []struct {
		schema string
		valid  bool
	}{
		{`{"type":"object","additionalProperties":false,"properties":{"region":{"type":"string"}}}`, true},
		{`{"type":"object","properties":{"region":{"type":"string"}}}`, false},
		{`{"type":"object","additionalProperties":false,"properties":{"rpm_limit":{"type":"integer"}}}`, false},
		{`{"type":"object","additionalProperties":false,"properties":{"api_key":{"type":"string"}}}`, false},
		{`{"type":"object","additionalProperties":false,"properties":{"region":{"$ref":"file:///private.json"}}}`, false},
	} {
		v := &validator{}
		v.accountLifecycle("accountTypes[0]", manifest.AccountType{SensitiveFields: []string{"api_key"}, ExtensionsSchema: json.RawMessage(test.schema)})
		if (len(v.errs) == 0) != test.valid {
			t.Fatalf("schema %s: %v", test.schema, v.errs)
		}
	}
}
