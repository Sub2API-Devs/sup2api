package engine

import (
	"net/http/httptest"
	"strings"
	"testing"
)

func TestResourceRoutesAreFixedAndCredentialFree(t *testing.T) {
	for _, path := range []string{"/v1/files", "/v1/files/file_fixture", "/v1/files/file_fixture/content", "/v1/skills", "/v1/skills/skill_fixture/versions", "/v1/skills/skill_fixture/versions/version_fixture"} {
		r := httptest.NewRequest("GET", resourcePrefix+path, nil)
		if _, err := parseResourceRoute(r); err != nil {
			t.Fatalf("%s: %v", path, err)
		}
	}
	for _, path := range []string{"/v1/messages", "/api/oauth/profile", "/v1/files/../models", "/v1/files/a%2Fb", "/v1/files?target=https://example.test", "/v1/files/file_id/other", "/v1/skills/a/versions/v/other"} {
		if _, err := parseResourceRoute(httptest.NewRequest("GET", resourcePrefix+path, nil)); err == nil {
			t.Fatalf("unregistered route accepted %s", path)
		}
	}
	upload := httptest.NewRequest("POST", resourcePrefix+"/v1/files", strings.NewReader("binary fixture"))
	if _, err := parseResourceRoute(upload); err == nil {
		t.Fatal("unframed upload accepted")
	}
	upload.Header.Set("Content-Type", "multipart/form-data; boundary=fixture")
	if _, err := parseResourceRoute(upload); err != nil {
		t.Fatal(err)
	}
}
