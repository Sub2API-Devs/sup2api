package codex

import (
	"encoding/base64"
	"encoding/json"
	"testing"
	"time"

	pluginv1 "github.com/Sub2API-Devs/sup2api/next/sdk/gen/pluginv1"
	"github.com/Sub2API-Devs/sup2api/next/sdk/pluginsdk"
	"github.com/Sub2API-Devs/sup2api/next/sdk/pluginsdk/pluginsdktest"
)

// testNow is the fixed clock of the tests.
var testNow = time.Unix(1_800_000_000, 0)

// fakeJWT builds an unsigned JWT with the given claims (the plugin never
// verifies signatures).
func fakeJWT(claims map[string]any) string {
	b, _ := json.Marshal(claims)
	enc := base64.RawURLEncoding
	return enc.EncodeToString([]byte(`{"alg":"none"}`)) + "." + enc.EncodeToString(b) + ".sig"
}

// idToken is an id_token with email, account id and plan.
func idToken(email, accountID, plan string) string {
	return fakeJWT(map[string]any{
		"email": email,
		authClaim: map[string]any{
			"chatgpt_account_id": accountID,
			"chatgpt_plan_type":  plan,
		},
	})
}

// testEndpoints point every service root at base.
func testEndpoints(base string) Endpoints { return Endpoints{Auth: base, ChatGPT: base, API: base} }

// startPlugin runs p in the SDK harness with a fake host (in-memory KV).
func startPlugin(t *testing.T, p *Plugin) *pluginsdktest.Harness {
	t.Helper()
	return pluginsdktest.Start(t, p, pluginsdktest.Options{SDK: []pluginsdk.Option{pluginsdk.WithInfo("codex", Version)}})
}

// newTestPlugin is a plugin with the fixed clock and the given roots.
func newTestPlugin(ep Endpoints) *Plugin {
	p := NewWithEndpoints(ep)
	p.now = func() time.Time { return testNow }
	return p
}

func account(typ, creds string) *pluginv1.Account {
	return &pluginv1.Account{Id: 7, Platform: PlatformID, Type: typ, CredentialsJson: creds}
}

func mustJSON(t *testing.T, raw []byte, v any) {
	t.Helper()
	if err := json.Unmarshal(raw, v); err != nil {
		t.Fatalf("unmarshal %s: %v", raw, err)
	}
}
