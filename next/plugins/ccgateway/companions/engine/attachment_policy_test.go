package engine

import (
	"encoding/json"
	"net/http"
	"testing"
)

func TestAttachmentPolicyFiltersOnlyExplicitClientAttachments(t *testing.T) {
	policy := defaultRequestPolicy()
	policy.AttachmentSource = "gateway"
	policy.AttachmentSources = map[string]string{"date": "client"}
	policy.UnknownClientAttachment = "ignore"
	encoded, _ := json.Marshal(policy)
	h := http.Header{policyHeader: []string{string(encoded)}}
	// Header.Set canonicalizes the internal header name.
	h.Set(policyHeader, string(encoded))
	v := basic()
	v["system"] = []any{
		Object{"type": "text", "text": "ordinary permissions and cwd instructions"},
		Object{"type": "text", "text": `<ccgateway-attachment type="environment">client cwd</ccgateway-attachment>`},
		Object{"type": "text", "text": `<ccgateway-attachment type="date">client date</ccgateway-attachment>`},
		Object{"type": "text", "text": `<ccgateway-attachment type="future_type">unknown</ccgateway-attachment>`},
		Object{"type": "text", "text": `<ccgateway-attachment type="hook_additional_context">permissions</ccgateway-attachment>`},
	}
	body, _ := json.Marshal(v)
	r, err := parsePolicyRequest(body, h)
	if err != nil {
		t.Fatal(err)
	}
	if len(r.System) != 3 || r.System[0] != "ordinary permissions and cwd instructions" {
		t.Fatalf("wrong retained system: %#v", r.System)
	}
	original := r.toolHistoryNamespace()
	r.UnknownGatewayAttachment = "ignore"
	if original == r.toolHistoryNamespace() {
		t.Fatal("policy change reused native history")
	}
	for _, bad := range []RequestPolicy{{AttachmentSources: map[string]string{"bogus": "client"}}, {UnknownClientAttachment: "delete"}, {AttachmentSources: map[string]string{"date": "invalid"}}} {
		if validateAttachmentPolicy(bad) == nil {
			t.Fatal("invalid policy accepted")
		}
	}
}
