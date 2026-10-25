package engine

import (
	"os"
	"path/filepath"
	"testing"
)

// The snapshot reports the email of the signed-in login as Claude Code stored
// it at login (oauthAccount.emailAddress), only when a login is stored and the
// value is one address (CONTRACTS §59); CLAUDE_CODE_USER_EMAIL is not the
// login's and is not reported.
func TestAuthSnapshotReportsStoredAccountEmail(t *testing.T) {
	config := t.TempDir()
	env := []string{"CLAUDE_CONFIG_DIR=" + config, "CLAUDE_CODE_USER_EMAIL=override@example.invalid"}
	login := func(credentials string) {
		t.Helper()
		if err := os.WriteFile(filepath.Join(config, ".credentials.json"), []byte(credentials), 0600); err != nil {
			t.Fatal(err)
		}
	}
	global := func(body string) {
		t.Helper()
		if err := os.WriteFile(snapshotGlobalConfigPath(env), []byte(body), 0600); err != nil {
			t.Fatal(err)
		}
	}
	login(`{"claudeAiOauth":{"accessToken":"secret-fixture","subscriptionType":"pro"}}`)
	for body, want := range map[string]any{
		`{"oauthAccount":{"emailAddress":"ops@example.invalid"}}`:       "ops@example.invalid",
		`{"oauthAccount":{"emailAddress":" ops@example.invalid "}}`:     "ops@example.invalid",
		`{"oauthAccount":{"emailAddress":"two words@example.invalid"}}`: nil,
		`{"oauthAccount":{"emailAddress":7}}`:                           nil,
		`{"oauthAccount":{}}`:                                           nil,
		`{}`:                                                            nil,
	} {
		global(body)
		got, err := localAuthSnapshot(env)
		if err != nil || got["account_email"] != want {
			t.Errorf("%s: %v %v", body, got["account_email"], err)
		}
	}
	// No Claude login stored: nothing reported.
	global(`{"oauthAccount":{"emailAddress":"ops@example.invalid"}}`)
	login(`{"claudeAiOauth":{}}`)
	if got, err := localAuthSnapshot(env); err != nil || got["account_email"] != nil {
		t.Fatal(got, err)
	}
	if path := filepath.Dir(snapshotGlobalConfigPath(env)); path != config {
		t.Fatalf("global config read from %s", path)
	}
}
