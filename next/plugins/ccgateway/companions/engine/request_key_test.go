package engine

import (
	"bytes"
	"os"
	"path/filepath"
	"testing"

	"github.com/stretchr/testify/require"
)

// accountFiles writes the two files the mapping key reads: the login's email
// in .claude.json and the stored OAuth token in .credentials.json.
func accountFiles(t *testing.T, email, token string) []string {
	t.Helper()
	dir := t.TempDir()
	config := `{"oauthAccount":{"emailAddress":"` + email + `"}}`
	credentials := `{"claudeAiOauth":{"accessToken":"` + token + `","refreshToken":"r","expiresAt":4102444800000}}`
	require.NoError(t, os.WriteFile(filepath.Join(dir, ".claude.json"), []byte(config), 0600))
	require.NoError(t, os.WriteFile(filepath.Join(dir, ".credentials.json"), []byte(credentials), 0600))
	return []string{"HOME=" + dir, "CLAUDE_CONFIG_DIR=" + dir, "CLAUDE_SECURESTORAGE_CONFIG_DIR=" + dir}
}

// One request reads the credentials and .claude.json once, for the identity
// and the agent context alike; the next request reads them again rather than
// keeping a credential in memory between requests.
func TestRequestReadsAccountFilesOnce(t *testing.T) {
	secret := bytes.Repeat([]byte{0x24}, 32)
	env := accountFiles(t, "first@example.invalid", "first-token")
	plan := &requestPlan{env: env, mode: "build"}
	key, oauth := plan.mapping.load(secret, plan.env)
	require.True(t, oauth)
	require.Len(t, key, 32)

	// The login behind those paths changes: the key first read is what this
	// request keeps using.
	env = accountFiles(t, "second@example.invalid", "second-token")
	plan.env = env
	again, oauth := plan.mapping.load(secret, plan.env)
	require.True(t, oauth)
	require.Equal(t, key, again, "the request read the files twice")

	// A request of its own reads them, and sees the new login.
	next := &requestPlan{env: env, mode: "build"}
	fresh, oauth := next.mapping.load(secret, next.env)
	require.True(t, oauth)
	require.NotEqual(t, key, fresh, "a credential was kept between requests")
}

// An API-key account reads once too, and answers that it is not one to map.
func TestRequestKeyReadsOnceForAPIKeyAccount(t *testing.T) {
	secret := bytes.Repeat([]byte{0x24}, 32)
	env := append(accountFiles(t, "ops@example.invalid", "token"), "ANTHROPIC_API_KEY=fixture")
	plan := &requestPlan{env: env, mode: "direct"}
	key, oauth := plan.mapping.load(secret, plan.env)
	require.Nil(t, key)
	require.False(t, oauth)
	plan.env = append(accountFiles(t, "other@example.invalid", "other"), "ANTHROPIC_API_KEY=other")
	again, oauth := plan.mapping.load(secret, plan.env)
	require.Nil(t, again)
	require.False(t, oauth)
}
