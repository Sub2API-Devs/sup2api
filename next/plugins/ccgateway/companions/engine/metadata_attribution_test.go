package engine

import (
	"bytes"
	"encoding/hex"
	"encoding/json"
	"os"
	"path/filepath"
	"regexp"
	"strings"
	"testing"

	"github.com/Sub2API-Devs/sup2api/next/plugins/ccgateway/companions/contracts/features"
	"github.com/stretchr/testify/require"
)

// mapReplace is the default source: the client's value, mapped one way.
func mapReplace(key, raw []byte) (requestIdentity, error) {
	return mapRequestIdentity(key, readClientIdentity(raw), "replace")
}

// mapWith maps the client's value of raw with one source.
func mapWith(key, raw []byte, mode string) (requestIdentity, error) {
	return mapRequestIdentity(key, readClientIdentity(raw), mode)
}

// accountEnv is one account's Claude configuration: the email the mapping is
// keyed with, and whether a Claude (OAuth) login is stored for it.
func accountEnv(t *testing.T, email string, oauth bool) []string {
	t.Helper()
	config := t.TempDir()
	require.NoError(t, os.WriteFile(filepath.Join(config, ".claude.json"), []byte(`{"oauthAccount":{"emailAddress":"`+email+`"}}`), 0600))
	credentials := `{}`
	if oauth {
		credentials = `{"claudeAiOauth":{"accessToken":"fixture-token","refreshToken":"fixture-refresh","expiresAt":4102444800000}}`
	}
	require.NoError(t, os.WriteFile(filepath.Join(config, ".credentials.json"), []byte(credentials), 0600))
	return []string{"HOME=" + config, "CLAUDE_CONFIG_DIR=" + config, "CLAUDE_SECURESTORAGE_CONFIG_DIR=" + config}
}

func TestRequestIdentityKeyFollowsTheSecretAndClaudeEmail(t *testing.T) {
	secret := bytes.Repeat([]byte{0x24}, 32)
	key := func(t *testing.T, secret []byte, env ...string) []byte {
		t.Helper()
		value, oauth := requestIdentityKey(secret, env)
		require.True(t, oauth, env)
		require.Len(t, value, 32)
		return value
	}
	// One account maps identically across restarts; case differences in the
	// stored address do not fork it.
	first := key(t, secret, accountEnv(t, "ops@example.invalid", true)...)
	require.Equal(t, first, key(t, secret, accountEnv(t, "ops@example.invalid", true)...))
	require.Equal(t, first, key(t, secret, accountEnv(t, "OPS@Example.Invalid", true)...))
	// Another Claude login, even on the same account volume, maps on its own.
	require.NotEqual(t, first, key(t, secret, accountEnv(t, "other@example.invalid", true)...))
	// Knowing the email is not enough: without the account secret the key, and
	// so every mapped identifier, cannot be recomputed.
	require.NotEqual(t, first, key(t, bytes.Repeat([]byte{0x25}, 32), accountEnv(t, "ops@example.invalid", true)...))
	// An explicit address wins over the stored account.
	env := append(accountEnv(t, "ops@example.invalid", true), "CLAUDE_CODE_USER_EMAIL=override@example.invalid")
	require.NotEqual(t, first, key(t, secret, env...))
	require.Equal(t, key(t, secret, env...), key(t, secret, env...))

	for name, env := range map[string][]string{
		"api key account":        append(accountEnv(t, "ops@example.invalid", true), "ANTHROPIC_API_KEY=fixture"),
		"no stored claude login": accountEnv(t, "ops@example.invalid", false),
	} {
		value, oauth := requestIdentityKey(secret, env)
		require.False(t, oauth, name)
		require.Nil(t, value, name)
	}
	// A Claude login whose email is unknown (absent or a corrupt account file)
	// is still an OAuth account, just one without a mapping key.
	config := t.TempDir()
	require.NoError(t, os.WriteFile(filepath.Join(config, ".claude.json"), []byte("{"), 0600))
	require.NoError(t, os.WriteFile(filepath.Join(config, ".credentials.json"), []byte(`{"claudeAiOauth":{"accessToken":"t"}}`), 0600))
	for name, env := range map[string][]string{
		"no email in the account": accountEnv(t, "", true),
		"corrupt account file":    {"CLAUDE_CONFIG_DIR=" + config, "CLAUDE_SECURESTORAGE_CONFIG_DIR=" + config},
	} {
		value, oauth := requestIdentityKey(secret, env)
		require.True(t, oauth, name)
		require.Nil(t, value, name)
	}
}

// Replace needs a key. Without one the request keeps a safe identity instead of
// failing: an API-key account forwards the client's value, an OAuth login with
// no known email uses the Worker's own.
func TestResolveRequestIdentityFallbacks(t *testing.T) {
	g := &Gateway{requestIdentitySecret: bytes.Repeat([]byte{0x24}, 32)}
	raw := []byte(`{"metadata":{"user_id":"{\"device_id\":\"client-device\",\"session_id\":\"3f2a1b0c-4d5e-4f70-8192-a3b4c5d6e7f8\"}"}}`)
	for name, tc := range map[string]struct {
		env      []string
		want     string
		rewrite  bool
		mapsUser bool
	}{
		"oauth replace":    {accountEnv(t, "ops@example.invalid", true), "replace", true, true},
		"api key replace":  {append(accountEnv(t, "ops@example.invalid", true), "ANTHROPIC_API_KEY=fixture"), "client", false, false},
		"no email replace": {accountEnv(t, "", true), "worker", true, false},
	} {
		value, err := g.resolveRequestIdentity(tc.env, readClientIdentity(raw))
		require.NoError(t, err, name)
		require.Equal(t, tc.want, value.Mode, name)
		require.Equal(t, tc.rewrite, value.Rewrite, name)
		require.Equal(t, tc.mapsUser, value.Device != "", name)
	}
}

// The account secret is created once in the data directory and reused; a
// damaged secret stops the Worker rather than silently changing every mapping.
func TestRequestIdentitySecretPersists(t *testing.T) {
	root := t.TempDir()
	path := filepath.Join(root, requestIdentitySecretFile)
	first, err := loadRequestIdentitySecret(path)
	require.NoError(t, err)
	require.Len(t, first, 32)
	again, err := loadRequestIdentitySecret(path)
	require.NoError(t, err)
	require.Equal(t, first, again)
	entries, err := os.ReadDir(root)
	require.NoError(t, err)
	require.Len(t, entries, 1, "the temporary secret file is removed")
	require.NoError(t, os.WriteFile(path, []byte("short"), 0600))
	_, err = loadRequestIdentitySecret(path)
	require.Error(t, err)
}

func TestAccountRequestIdentitySemantics(t *testing.T) {
	key := bytes.Repeat([]byte{0x42}, 32)
	body := func(id any) []byte {
		raw, err := json.Marshal(Object{"model": "fixture", "metadata": Object{"user_id": id}})
		require.NoError(t, err)
		return raw
	}
	parent, err := mapReplace(key, body(`{"device_id":"client","account_uuid":"client-account","session_id":"parent"}`))
	require.NoError(t, err)
	child, err := mapReplace(key, body(`{"session_id":"child", "parent_session_id":"parent", "device_id":"client"}`))
	require.NoError(t, err)
	require.Equal(t, parent.Session, child.Parent)
	require.Equal(t, parent.Device, child.Device)
	again, err := mapReplace(key, body(`{ "session_id": "parent", "account_uuid": "different", "device_id": "client" }`))
	require.NoError(t, err)
	require.Equal(t, parent, again, "JSON layout and unused client account attribution do not change the logical session")
	otherDevice, err := mapReplace(key, body(`{"device_id":"other-device","session_id":"parent"}`))
	require.NoError(t, err)
	require.Equal(t, parent.Session, otherDevice.Session, "session identity is independent of device changes")
	require.NotEqual(t, parent.Device, otherDevice.Device)
	noDevice, err := mapReplace(key, body(`{"session_id":"child","parent_session_id":"parent"}`))
	require.NoError(t, err)
	require.Equal(t, parent.Session, noDevice.Parent)
	different, err := mapReplace(bytes.Repeat([]byte{0x43}, 32), body(`{"device_id":"client","session_id":"parent"}`))
	require.NoError(t, err)
	require.NotEqual(t, parent.Device, different.Device)
	require.NotEqual(t, parent.Session, different.Session)
	require.Regexp(t, `^[a-f0-9]{64}$`, parent.Device)
	require.Regexp(t, `^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$`, parent.Session)
	require.True(t, parent.Rewrite)
	require.NotContains(t, parent.Device+parent.Session, "client")
	for _, id := range []any{nil, ""} {
		a, err := mapReplace(key, body(id))
		require.NoError(t, err)
		b, err := mapReplace(key, body(id))
		require.NoError(t, err)
		require.False(t, a.Rewrite)
		require.Empty(t, a.Device)
		// No identity at all: the CLI keeps its own native session.
		require.Empty(t, a.Session)
		require.Equal(t, a, b)
	}
	a, err := mapReplace(key, body("opaque-user"))
	require.NoError(t, err)
	b, err := mapReplace(key, body("opaque-user"))
	require.NoError(t, err)
	require.Equal(t, a.Device, b.Device)
	require.NotEqual(t, a.Session, b.Session, "a user identifier alone does not establish a conversation")
	for _, raw := range []string{
		`{"metadata":{},"metadata":{"user_id":"x"}}`,
		`{"metadata":{"user_id":"x","user_\u0069d":"y"}}`,
		`{"metadata":{"user_id":"{\"device_id\":\"a\",\"device_id\":\"b\"}"}}`,
		`{"metadata":{"user_id":123}}`, `{"metadata":[]}`,
	} {
		_, err := mapReplace(key, []byte(raw))
		require.Error(t, err, raw)
	}
}

// metadata.user_id reaches the Worker as an object, as a JSON string, or as the
// legacy flat user_<hex>_account_<uuid>_session_<uuid> string.
func TestAccountRequestIdentityCarriers(t *testing.T) {
	key := bytes.Repeat([]byte{0x42}, 32)
	hexID := strings.Repeat("ab", 32)
	session := "3f2a1b0c-4d5e-4f70-8192-a3b4c5d6e7f8"
	account := "e9316e9d-aed1-4cff-9a93-e936d862e161"
	body := func(id any) []byte {
		raw, err := json.Marshal(Object{"model": "fixture", "metadata": Object{"user_id": id}})
		require.NoError(t, err)
		return raw
	}
	// The legacy flat carrier splits into its three segments.
	flat, err := mapReplace(key, body("user_"+hexID+"_account_"+account+"_session_"+session))
	require.NoError(t, err)
	require.Equal(t, "flat", flat.Carrier)

	require.True(t, flat.Rewrite)
	require.Equal(t, digestUUID(identityDigest(key, "session", session)), flat.Session)
	sum := identityDigest(key, "device", hexID)
	require.Equal(t, hex.EncodeToString(sum[:]), flat.Device)
	// The account segment may be empty or absent; the session is still the last.
	for _, carrier := range []string{
		"user_" + hexID + "_account__session_" + session,
		"user_" + hexID + "_session_" + session,
	} {
		value, err := mapReplace(key, body(carrier))
		require.NoError(t, err, carrier)
		require.Equal(t, "flat", value.Carrier, carrier)
		require.Equal(t, flat.Session, value.Session, carrier)
		require.Equal(t, flat.Device, value.Device, carrier)
	}
	// The object carrier is read directly and stays an object.
	object, err := mapReplace(key, body(Object{"device_id": hexID, "account_uuid": account, "session_id": session}))
	require.NoError(t, err)
	require.Equal(t, "object", object.Carrier)

	require.Equal(t, [3]string{flat.Device, flat.Session, flat.Parent}, [3]string{object.Device, object.Session, object.Parent}, "the same identity maps the same way in either carrier")
	// The JSON string carrier maps identically, and keeps its own shape.
	quoted, err := mapReplace(key, body(`{"device_id":"`+hexID+`","account_uuid":"`+account+`","session_id":"`+session+`"}`))
	require.NoError(t, err)
	require.Equal(t, "json", quoted.Carrier)

	require.Equal(t, [3]string{flat.Device, flat.Session, flat.Parent}, [3]string{quoted.Device, quoted.Session, quoted.Parent})
	// An empty object carries nothing to rewrite.
	empty, err := mapReplace(key, body(Object{}))
	require.NoError(t, err)
	require.Empty(t, empty.Carrier, "nothing to map leaves no carrier")
	require.False(t, empty.Rewrite)
	require.Empty(t, empty.Device)
	// Ambiguous or malformed carriers never reach the model.
	for _, raw := range []string{
		`{"metadata":{"user_id":{"device_id":"a","device_id":"b"}}}`,
		`{"metadata":{"user_id":{"device_id":1}}}`,
		`{"metadata":{"user_id":123}}`,
		`{"metadata":{"user_id":true}}`,
		`{"metadata":{"user_id":[]}}`,
	} {
		_, err := mapReplace(key, []byte(raw))
		require.Error(t, err, raw)
	}
}

// A request without an identity, or with an identity field that holds nothing,
// is passed through untouched: no mapping, no injected session.
func TestAccountRequestIdentitySkipsAbsentFields(t *testing.T) {
	key := bytes.Repeat([]byte{0x42}, 32)
	for _, raw := range []string{
		`{"model":"fixture"}`,
		`{"model":"fixture","metadata":null}`,
		`{"model":"fixture","metadata":{}}`,
		`{"model":"fixture","metadata":{"user_id":null}}`,
		`{"model":"fixture","metadata":{"user_id":""}}`,
		`{"model":"fixture","metadata":{"user_id":{}}}`,
		`{"model":"fixture","metadata":{"user_id":{"device_id":null,"session_id":null}}}`,
		`{"model":"fixture","metadata":{"user_id":{"device_id":"","account_uuid":""}}}`,
	} {
		value, err := mapReplace(key, []byte(raw))
		require.NoError(t, err, raw)
		require.False(t, value.Rewrite, raw)
		require.Empty(t, value.Device, raw)
		require.Empty(t, value.Parent, raw)
	}
	// One usable field is enough to map, and only that field is derived.
	partial, err := mapReplace(key, []byte(`{"metadata":{"user_id":{"session_id":"3f2a1b0c-4d5e-4f70-8192-a3b4c5d6e7f8"}}}`))
	require.NoError(t, err)
	require.True(t, partial.Rewrite)
	require.Equal(t, digestUUID(identityDigest(key, "session", "3f2a1b0c-4d5e-4f70-8192-a3b4c5d6e7f8")), partial.Session)
	require.Empty(t, partial.Device, "the client sent no device, so none is derived")
	accountOnly, err := mapReplace(key, []byte(`{"metadata":{"user_id":{"account_uuid":"e9316e9d-aed1-4cff-9a93-e936d862e161"}}}`))
	require.NoError(t, err)
	require.True(t, accountOnly.Rewrite)
	require.NotEmpty(t, accountOnly.Device, "the client account is the user mapping input when no device is sent")
}

// The configured source decides what the request carries: the client's value
// untouched, the Worker's own identity, or the client's value mapped.
func TestAccountRequestIdentitySources(t *testing.T) {
	key := bytes.Repeat([]byte{0x42}, 32)
	raw := []byte(`{"metadata":{"user_id":"{\"device_id\":\"client-device\",\"session_id\":\"3f2a1b0c-4d5e-4f70-8192-a3b4c5d6e7f8\"}"}}`)
	client, err := mapWith(key, raw, "client")
	require.NoError(t, err)
	require.False(t, client.Rewrite, "the client value is forwarded, not replaced")
	require.Empty(t, client.Device)
	require.Equal(t, "3f2a1b0c-4d5e-4f70-8192-a3b4c5d6e7f8", client.Session, "the CLI session follows the client's own")
	require.Equal(t, "json", client.Carrier)
	// The CLI adopts only a lowercase version 4 session (cli-mods
	// request-identity.js): any other UUID is not handed over (audit C6).
	for _, session := range []string{"3F2A1B0C-4D5E-4F70-8192-A3B4C5D6E7F8", "3f2a1b0c-4d5e-1f70-8192-a3b4c5d6e7f8", "3f2a1b0c-4d5e-4f70-c192-a3b4c5d6e7f8", "not-a-session"} {
		other, err := mapWith(key, []byte(`{"metadata":{"user_id":{"device_id":"client-device","session_id":"`+session+`"}}}`), "client")
		require.NoError(t, err)
		require.Empty(t, other.Session, session)
		require.False(t, other.Rewrite)
		require.Equal(t, "object", other.Carrier, "the client's value still goes as sent")
	}
	for _, mapped := range []string{uuid(), digestUUID(identityDigest(key, "session", "x"))} {
		require.True(t, cliSessionPattern.MatchString(mapped), mapped)
	}

	worker, err := mapWith(key, raw, "worker")
	require.NoError(t, err)
	require.True(t, worker.Rewrite)
	require.Empty(t, worker.Device, "the Worker's own device is used, not a mapped one")
	require.Empty(t, worker.Session)

	replace, err := mapWith(key, raw, "replace")
	require.NoError(t, err)
	require.True(t, replace.Rewrite)
	require.NotEmpty(t, replace.Device)
	require.NotEqual(t, client.Session, replace.Session)
	// A request without an identity is never given one, whatever the source.
	for _, mode := range []string{"client", "worker", "replace"} {
		absent, err := mapWith(key, []byte(`{"model":"fixture"}`), mode)
		require.NoError(t, err)
		require.False(t, absent.Rewrite, mode)
		require.Empty(t, absent.Session, mode)
	}
	// Sources are a closed vocabulary (the core still validates stored ones).
	require.NoError(t, features.RequestIdentitySources{"user_id": "replace"}.Validate())
	for _, invalid := range []features.RequestIdentitySources{{"user_id": "erase"}, {"user_id": ""}, {"session_id": "client"}} {
		require.Error(t, invalid.Validate())
	}
}

func TestRequestIdentityCapabilityIsNotInferred(t *testing.T) {
	root := t.TempDir()
	g := &Gateway{RequestMode: "build"}
	require.NoError(t, g.configureRequestIdentity(root))
	require.False(t, g.requestIdentityEnabled)
	require.NoFileExists(t, filepath.Join(root, requestIdentitySecretFile), "no secret without the capability")
	g.CLIInfo.Capabilities = []string{"request_build", features.RequestIdentityCapability}
	require.NoError(t, g.configureRequestIdentity(root))
	require.True(t, g.requestIdentityEnabled)
	require.Len(t, g.requestIdentitySecret, 32)
	require.Contains(t, g.requestCapabilities(), features.RequestIdentityCapability)
	g.MaintenanceOnly = true
	require.NoError(t, g.configureRequestIdentity(root))
	require.False(t, g.requestIdentityEnabled)
	require.NotContains(t, g.requestCapabilities(), features.RequestIdentityCapability)
	require.True(t, regexp.MustCompile(`^[a-f0-9-]{36}$`).MatchString(uuid()))
}
