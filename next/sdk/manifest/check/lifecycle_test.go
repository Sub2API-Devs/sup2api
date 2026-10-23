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

func TestLifecycleDeletionRetentionBounds(t *testing.T) {
	for days, valid := range map[int]bool{0: false, 1: true, 3: true, manifest.MaxRetentionDays: true, manifest.MaxRetentionDays + 1: false, -1: false} {
		v := &validator{m: &manifest.Manifest{Capabilities: []manifest.Capability{{ID: manifest.CapAccountLifecycle}}}}
		v.accountLifecycle("accountTypes[0]", manifest.AccountType{Lifecycle: &manifest.AccountLifecycle{Deletion: &manifest.AccountDeletion{RetentionDays: days}}})
		bad := false
		for _, e := range v.errs {
			bad = bad || e.Field == "accountTypes[0].lifecycle.deletion.retentionDays"
		}
		if bad == valid {
			t.Fatalf("%d days: %v", days, v.errs)
		}
	}
}
