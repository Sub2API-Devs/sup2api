package engine

import (
	"encoding/json"
	"strings"
	"testing"
)

// The client's metadata selects a session, never CLAUDE_CODE_EXTRA_BODY.
func TestMetadataClientObjectNeverReplacesCLIMetadata(t *testing.T) {
	for _, metadata := range []Object{nil, {}, {"user_id": nil}, {"user_id": strings.Repeat("界", 512)}, {"user_id": `{ "device_id": "client", "account_uuid": "", "session_id": "client-session" }`}} {
		body := basic()
		if metadata != nil {
			body["metadata"] = metadata
		}
		r, err := parsePolicyRequest(mustMCPJSON(body), nil)
		if err != nil {
			t.Fatal(err)
		}
		cfg, err := r.passthroughBodies()
		if err != nil {
			t.Fatal(err)
		}
		for _, fields := range []map[string]json.RawMessage{cfg.First, cfg.Rest} {
			if _, exists := fields["metadata"]; exists {
				t.Fatal("client attribution entered native generation fields")
			}
		}
		found := false
		for _, decision := range r.Plan.FeatureDecisions() {
			if decision["field"] == "metadata" {
				found = true
				if decision["action"] != "select_session_only" {
					t.Fatal("metadata decision changed", decision)
				}
			}
		}
		if found != (metadata != nil) {
			t.Fatal("metadata attribution presence changed")
		}
	}
}
