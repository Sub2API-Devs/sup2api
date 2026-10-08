package engine

import (
	"encoding/json"
	"os"
	"path/filepath"
	"strings"
	"testing"
)

func TestAuthSnapshotNeverSpawnsCLIOrClaimsOnlineValidity(t *testing.T) {
	config := t.TempDir()
	if err := os.WriteFile(filepath.Join(config, ".credentials.json"), []byte(`{"claudeAiOauth":{"accessToken":"secret-fixture","refreshToken":"secret-refresh","expiresAt":1}}`), 0600); err != nil {
		t.Fatal(err)
	}
	a := &authManager{cli: "must-not-execute", key: "fixture", env: []string{"CLAUDE_CONFIG_DIR=" + config}}
	w := authRequest(a, "GET", "/admin/status", "", "fixture")
	if w.Code != 200 {
		t.Fatal(w.Code, w.Body.String())
	}
	var got Object
	_ = json.Unmarshal(w.Body.Bytes(), &got)
	if got["online_verified"] != false || got["selection_verified"] != false || got["status_source"] != "local_snapshot" || got["access_token_expired"] != true || got["credential_present"] != true {
		t.Fatal(got)
	}
	if strings.Contains(w.Body.String(), "secret-") {
		t.Fatal("credential disclosed")
	}
	if _, err := os.Stat(filepath.Join(config, ".oauth_refresh.lock")); !os.IsNotExist(err) {
		t.Fatal("snapshot mutated auth state")
	}
}

func TestAuthSnapshotDoesNotGuessMixedOrHelperPrecedence(t *testing.T) {
	config := t.TempDir()
	if err := os.WriteFile(filepath.Join(config, "settings.json"), []byte(`{"apiKeyHelper":"must-not-execute"}`), 0600); err != nil {
		t.Fatal(err)
	}
	got, err := localAuthSnapshot([]string{"CLAUDE_CONFIG_DIR=" + config, "ANTHROPIC_API_KEY=fixture", "CLAUDE_CODE_OAUTH_TOKEN=fixture-oauth"})
	if err != nil || got["auth_method"] != "unresolved" || got["credential_source_unresolved"] != true {
		t.Fatal(got, err)
	}
	got, err = localAuthSnapshot([]string{"CLAUDE_CONFIG_DIR=" + config})
	if err != nil || got["credential_present"] != false || got["auth_method"] != "unresolved" {
		t.Fatal(got, err)
	}
}

func TestAuthSnapshotSecureStorageEmptyUsesConfiguredHome(t *testing.T) {
	home, config := t.TempDir(), t.TempDir()
	path := credentialsPathIn([]string{"HOME=" + home, "CLAUDE_CONFIG_DIR=" + config, "CLAUDE_SECURESTORAGE_CONFIG_DIR="})
	if path != filepath.Join(home, ".claude", ".credentials.json") {
		t.Fatal(path)
	}
}

func TestAuthSnapshotExternalSourcesRemainUnresolvedAndDeduplicated(t *testing.T) {
	config := t.TempDir()
	got, err := localAuthSnapshot([]string{"CLAUDE_CONFIG_DIR=" + config, "ANTHROPIC_IDENTITY_TOKEN_FILE=not-read", "ANTHROPIC_PROFILE=not-invoked", "CLAUDE_CODE_OAUTH_TOKEN_FILE_DESCRIPTOR=9"})
	if err != nil || got["credential_present"] != false || got["auth_method"] != "unresolved" {
		t.Fatal(got, err)
	}
	sources := got["credential_sources"].([]string)
	if len(sources) != 1 || sources[0] != "external_credential_source" {
		t.Fatal(sources)
	}
}

func TestAuthSnapshotDefaultGlobalConfig(t *testing.T) {
	for _, tc := range []struct {
		name, body, method string
		present            bool
	}{
		{"managed-key", `{"primaryApiKey":"secret-default-fixture"}`, "api_key", true},
		{"helper", `{"apiKeyHelper":"must-not-execute"}`, "unresolved", false},
	} {
		t.Run(tc.name, func(t *testing.T) {
			home := t.TempDir()
			if err := os.WriteFile(filepath.Join(home, ".claude.json"), []byte(tc.body), 0600); err != nil {
				t.Fatal(err)
			}
			got, err := localAuthSnapshot([]string{"HOME=" + home})
			if err != nil || got["auth_method"] != tc.method || got["credential_present"] != tc.present {
				t.Fatal(got, err)
			}
			raw, _ := json.Marshal(got)
			if strings.Contains(string(raw), "secret-default-fixture") || strings.Contains(string(raw), "must-not-execute") {
				t.Fatal("credential/config value disclosed")
			}
			config := t.TempDir()
			got, err = localAuthSnapshot([]string{"HOME=" + home, "CLAUDE_CONFIG_DIR=" + config})
			if err != nil || got["auth_method"] != "none" || got["credential_present"] != false {
				t.Fatal("custom config leaked default global config", got, err)
			}
			if err := os.WriteFile(filepath.Join(config, ".claude.json"), []byte(tc.body), 0600); err != nil {
				t.Fatal(err)
			}
			got, err = localAuthSnapshot([]string{"HOME=" + home, "CLAUDE_CONFIG_DIR=" + config})
			if err != nil || got["auth_method"] != tc.method || got["credential_present"] != tc.present {
				t.Fatal("custom global config missed", got, err)
			}
		})
	}
}
