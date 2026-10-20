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

// mapReplace is the default source: the client's value, mapped one way.
func mapReplace(key, raw []byte) (requestIdentity, error) {
	return mapRequestIdentity(key, raw, "replace")
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

func TestAccountIdentityKeyFollowsTheClaudeEmail(t *testing.T) {
	key := func(t *testing.T, env ...string) []byte {
		t.Helper()
		value, ok := accountIdentityKey(env)
		require.True(t, ok, env)
		require.Len(t, value, 32)
		return value
	}
	// The same account maps identically on every Worker; case differences in
	// the stored address do not fork it.
	first := key(t, accountEnv(t, "ops@example.invalid", true)...)
	require.Equal(t, first, key(t, accountEnv(t, "ops@example.invalid", true)...))
	require.Equal(t, first, key(t, accountEnv(t, "OPS@Example.Invalid", true)...))
	require.NotEqual(t, first, key(t, accountEnv(t, "other@example.invalid", true)...))
	// An explicit address wins over the stored account.
	env := append(accountEnv(t, "ops@example.invalid", true), "CLAUDE_CODE_USER_EMAIL=override@example.invalid")
	require.NotEqual(t, first, key(t, env...))
	require.Equal(t, key(t, env...), key(t, env...))

	for name, env := range map[string][]string{
		"api key account":         append(accountEnv(t, "ops@example.invalid", true), "ANTHROPIC_API_KEY=fixture"),
		"no stored claude login":  accountEnv(t, "ops@example.invalid", false),
		"no email in the account": accountEnv(t, "", true),
	} {
		value, ok := accountIdentityKey(env)
		require.False(t, ok, name)
		require.Nil(t, value, name)
	}
	// A corrupt account file is not an identity: it neither maps nor blocks.
	config := t.TempDir()
	require.NoError(t, os.WriteFile(filepath.Join(config, ".claude.json"), []byte("{"), 0600))
	require.NoError(t, os.WriteFile(filepath.Join(config, ".credentials.json"), []byte(`{"claudeAiOauth":{"accessToken":"t"}}`), 0600))
	_, ok := accountIdentityKey([]string{"CLAUDE_CONFIG_DIR=" + config, "CLAUDE_SECURESTORAGE_CONFIG_DIR=" + config})
	require.False(t, ok)
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
	client, err := mapRequestIdentity(key, raw, "client")
	require.NoError(t, err)
	require.False(t, client.Rewrite, "the client value is forwarded, not replaced")
	require.Empty(t, client.Device)
	require.Equal(t, "3f2a1b0c-4d5e-4f70-8192-a3b4c5d6e7f8", client.Session, "the CLI session follows the client's own")
	require.Equal(t, "json", client.Carrier)

	worker, err := mapRequestIdentity(key, raw, "worker")
	require.NoError(t, err)
	require.True(t, worker.Rewrite)
	require.Empty(t, worker.Device, "the Worker's own device is used, not a mapped one")
	require.Empty(t, worker.Session)

	replace, err := mapRequestIdentity(key, raw, "replace")
	require.NoError(t, err)
	require.True(t, replace.Rewrite)
	require.NotEmpty(t, replace.Device)
	require.NotEqual(t, client.Session, replace.Session)
	// A request without an identity is never given one, whatever the source.
	for _, mode := range []string{"client", "worker", "replace"} {
		absent, err := mapRequestIdentity(key, []byte(`{"model":"fixture"}`), mode)
		require.NoError(t, err)
		require.False(t, absent.Rewrite, mode)
		require.Empty(t, absent.Session, mode)
	}
	// Sources are a closed vocabulary; the empty set is the default replace.
	require.Equal(t, "replace", features.RequestIdentitySources{}.Mode())
	require.Equal(t, "client", features.RequestIdentitySources{"user_id": "client"}.Mode())
	require.Equal(t, "worker", features.RequestIdentitySources{"user_id": "worker"}.Mode())
	require.NoError(t, features.RequestIdentitySources{"user_id": "replace"}.Validate())
	for _, invalid := range []features.RequestIdentitySources{{"user_id": "erase"}, {"user_id": ""}, {"session_id": "client"}} {
		require.Error(t, invalid.Validate())
	}
}

func TestRequestIdentityCapabilityIsNotInferred(t *testing.T) {
	g := &Gateway{RequestMode: "build"}
	g.configureRequestIdentity()
	require.False(t, g.requestIdentityEnabled)
	g.CLIInfo.Capabilities = []string{"request_build", features.RequestIdentityCapability}
	g.configureRequestIdentity()
	require.True(t, g.requestIdentityEnabled)
	require.Contains(t, g.requestCapabilities(), features.RequestIdentityCapability)
	g.MaintenanceOnly = true
	g.configureRequestIdentity()
	require.False(t, g.requestIdentityEnabled)
	require.NotContains(t, g.requestCapabilities(), features.RequestIdentityCapability)
	// The legacy native agent loop keeps its own session handling.
	g.MaintenanceOnly, g.RequestMode = false, ""
	g.configureRequestIdentity()
	require.False(t, g.requestIdentityEnabled)
	require.True(t, regexp.MustCompile(`^[a-f0-9-]{36}$`).MatchString(uuid()))
}
