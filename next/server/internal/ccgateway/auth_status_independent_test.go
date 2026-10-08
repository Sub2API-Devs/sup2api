package ccgateway

import (
	"encoding/json"
	"strings"
	"testing"
)

func TestIndependentSnapshotBoundary(t *testing.T) {
	base := `{"healthy":true,"logged_in":true,"auth_method":"fixture-secret","status_source":"local_snapshot","online_verified":false,"selection_verified":false,"credential_present":false,"credential_sources":["credential_helper_configured"],"credential_source_unresolved":true,"helper":"fixture-secret","path":"fixture-secret"}`
	got, err := safeAuthStatus([]byte(base))
	if err != nil {
		t.Fatal(err)
	}
	raw, err := json.Marshal(got)
	if err != nil {
		t.Fatal(err)
	}
	if strings.Contains(string(raw), "fixture-secret") {
		t.Fatal("untrusted string leaked")
	}
	var result map[string]any
	if err := json.Unmarshal(raw, &result); err != nil {
		t.Fatal(err)
	}
	if result["logged_in"] != false || result["credential_source_unresolved"] != true || result["auth_method"] != "unknown" {
		t.Fatalf("incorrect safe facts: %s", raw)
	}
	for _, change := range [][2]string{
		{`"selection_verified":false`, `"selection_verified":true`},
		{`"selection_verified":false`, `"selection_verified":null`},
		{`"online_verified":false`, `"online_verified":null`},
		{`"credential_present":false`, `"credential_present":null`},
		{`["credential_helper_configured"]`, `["stored_oauth","stored_oauth"]`},
		{`["credential_helper_configured"]`, `["fixture-secret"]`},
	} {
		if _, err := safeAuthStatus([]byte(strings.Replace(base, change[0], change[1], 1))); err == nil {
			t.Errorf("accepted invalid field replacement %s", change[1])
		}
	}
}
