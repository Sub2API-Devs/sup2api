package engine

import (
	"encoding/json"
	"os"
	"path/filepath"
	"strings"
	"testing"
)

func TestReviewSnapshotStoragePriorityAndSafeErrors(t *testing.T) {
	home, profile, config, secure := t.TempDir(), t.TempDir(), t.TempDir(), t.TempDir()
	base := []string{"HOME=" + home, "USERPROFILE=" + profile, "CLAUDE_CONFIG_DIR=" + config}
	for _, tc := range []struct {
		name string
		env  []string
		want string
	}{
		{"default", []string{"HOME=" + home, "USERPROFILE=" + profile}, filepath.Join(home, ".claude", ".credentials.json")},
		{"config", base, filepath.Join(config, ".credentials.json")},
		{"secure-empty", append(append([]string{}, base...), "CLAUDE_SECURESTORAGE_CONFIG_DIR="), filepath.Join(home, ".claude", ".credentials.json")},
		{"secure", append(append([]string{}, base...), "CLAUDE_SECURESTORAGE_CONFIG_DIR="+secure), filepath.Join(secure, ".credentials.json")},
	} {
		t.Run(tc.name, func(t *testing.T) {
			if got := credentialsPathIn(tc.env); got != tc.want {
				t.Fatalf("wrong directory precedence")
			}
		})
	}
	if err := os.WriteFile(filepath.Join(config, "settings.json"), []byte("invalid private-config-fixture"), 0600); err != nil {
		t.Fatal(err)
	}
	got, err := localAuthSnapshot(base)
	if err == nil || got != nil {
		t.Fatal("invalid config was accepted")
	}
	if strings.Contains(err.Error(), config) || strings.Contains(err.Error(), "private-config-fixture") {
		t.Fatal("private path or content leaked")
	}
}

func TestReviewSnapshotDeduplicatesMultipleExternalAndHelperSources(t *testing.T) {
	config := t.TempDir()
	for _, name := range []string{"settings.json", "settings.local.json", ".claude.json"} {
		if err := os.WriteFile(filepath.Join(config, name), []byte(`{"apiKeyHelper":"private-helper-fixture","primaryApiKey":"private-key-fixture"}`), 0600); err != nil {
			t.Fatal(err)
		}
	}
	got, err := localAuthSnapshot([]string{"CLAUDE_CONFIG_DIR=" + config, "CLAUDE_CODE_OAUTH_TOKEN_FILE_DESCRIPTOR=999999", "ANTHROPIC_IDENTITY_TOKEN_FILE=private-file-fixture", "ANTHROPIC_PROFILE=private-profile-fixture"})
	if err != nil {
		t.Fatal(err)
	}
	if got["credential_source_unresolved"] != true || got["auth_method"] != "unresolved" || got["credential_present"] != true || got["selection_verified"] != false || got["online_verified"] != false {
		t.Fatal("incorrect local facts")
	}
	sources := got["credential_sources"].([]string)
	if len(sources) != 3 {
		t.Fatal("multiple source declarations not deduplicated")
	}
	raw, _ := json.Marshal(got)
	if strings.Contains(string(raw), "private-") || strings.Contains(string(raw), config) {
		t.Fatal("private metadata leaked")
	}
}
