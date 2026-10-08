package ccgateway

import (
	"bytes"
	"encoding/json"
	"testing"
)

func TestLocalCredentialStatusSafeFacts(t *testing.T) {
	raw := []byte(`{"healthy":true,"logged_in":false,"auth_method":"claude.ai","status_source":"local_snapshot","online_verified":false,"selection_verified":false,"credential_present":true,"credential_sources":["stored_oauth"],"access_token_expired":true,"token":"secret_fixture","path":"private_fixture"}`)
	got, err := safeResult("/status", raw)
	if err != nil {
		t.Fatal(err)
	}
	out, _ := json.Marshal(got)
	if bytes.Contains(out, []byte("secret_fixture")) || bytes.Contains(out, []byte("private_fixture")) {
		t.Fatal("unsafe field leaked")
	}
	var v map[string]any
	json.Unmarshal(out, &v)
	if v["logged_in"] != true || v["online_verified"] != false || v["access_token_expired"] != true || v["auth_method"] != "claude.ai" {
		t.Fatalf("lost facts %s", out)
	}
	for _, pair := range [][2]string{{`"online_verified":false`, `"online_verified":true`}, {`"stored_oauth"`, `"secret_path"`}, {`"local_snapshot"`, `"profile_body"`}} {
		if _, err := safeResult("/status", bytes.Replace(raw, []byte(pair[0]), []byte(pair[1]), 1)); err == nil {
			t.Fatal("invalid snapshot accepted")
		}
	}
}
func TestLegacyCredentialStatusDoesNotInventOnlineVerification(t *testing.T) {
	got, err := safeResult("/status", []byte(`{"healthy":true,"logged_in":true,"auth_method":"oauth_token","token":"secret"}`))
	if err != nil {
		t.Fatal(err)
	}
	raw, _ := json.Marshal(got)
	if bytes.Contains(raw, []byte("online_verified")) || bytes.Contains(raw, []byte("credential_present")) || bytes.Contains(raw, []byte("secret")) {
		t.Fatal("legacy status invented facts or leaked data")
	}
}
