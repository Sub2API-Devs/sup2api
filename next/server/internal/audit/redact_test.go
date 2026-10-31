package audit

import (
	"encoding/json"
	"testing"

	"github.com/stretchr/testify/assert"
)

func TestSecretNameMoreNames(t *testing.T) {
	for _, n := range []string{"jwt", "id_jwt", "JWTToken", "license_key_value", "signingKeyData", "api_key_id", "API-Key-Primary",
		"apikey2", "x_apikey_list", "bearer_header", "Cookie", "set-cookie", "session", "SessionCookie", "api_keys"} {
		assert.True(t, secretName(n), n)
	}
	for _, n := range []string{"name", "monkey_name", "keyboard", "key_id", "author", "compass", "keynote", "access_key_id", "description"} {
		assert.False(t, secretName(n), n)
	}
}

// Values are checked whatever the field is called (CONTRACTS §75.2).
func TestBodySummaryRedactsValues(t *testing.T) {
	const jwt = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.dozjgNryP4J3jVmNHl0w5N_XgL0n3I9PlFUP0THsR8U"
	cases := []struct{ body, want string }{
		// Webhook hosts keep only scheme and host, even in a field not named
		// like a URL; inside free text too.
		{`{"target":"https://hooks.slack.com/services/T000/B000/XXXXXXXXXXXXXXXX"}`, `{"target":"https://hooks.slack.com"}`},
		{`{"dest":"https://discord.com/api/webhooks/123456/abcDEF-ghi"}`, `{"dest":"https://discord.com"}`},
		{`{"dest":"https://discord.com/channels/1/2"}`, `{"dest":"https://discord.com/channels/1/2"}`},
		{`{"dest":"https://acme.webhook.office.com/webhookb2/abc"}`, `{"dest":"https://acme.webhook.office.com"}`},
		{`{"note":"post to https://hooks.slack.com/services/T0/B0/zzz then stop"}`, `{"note":"post to https://hooks.slack.com then stop"}`},
		// Queries (token=, key=, sig=, …) are always dropped; token-looking
		// path segments are masked.
		{`{"dest":"https://api.example.com/v1/send?access_token=abc&x=1"}`, `{"dest":"https://api.example.com/v1/send"}`},
		{`{"dest":"https://x.example.com/hook/a1b2c3d4e5f6a7b8c9d0e1f2a3b4/run"}`, `{"dest":"https://x.example.com/hook/[REDACTED]/run"}`},
		{`{"note":"see https://example.com/docs/getting-started-with-the-api"}`, `{"note":"see https://example.com/docs/getting-started-with-the-api"}`},
		// JWTs, Bearer values and well-known key formats.
		{`{"blob":"` + jwt + `"}`, `{"blob":"[REDACTED]"}`},
		{`{"note":"header Bearer abcdefgh12345678 was sent"}`, `{"note":"header Bearer [REDACTED] was sent"}`},
		{`{"note":"the bearer of bad news"}`, `{"note":"the bearer of bad news"}`},
		{`{"v":"sk-ant-api03-abcdefghijklmnopqrstuvwxyz"}`, `{"v":"[REDACTED]"}`},
		{`{"v":"xoxb-1234567890-abcdefghij"}`, `{"v":"[REDACTED]"}`},
		{`{"v":"ghp_abcdefghijklmnopqrstuvwxyz0123456789"}`, `{"v":"[REDACTED]"}`},
		{`{"v":"AKIAIOSFODNN7EXAMPLE"}`, `{"v":"[REDACTED]"}`},
		{`{"items":["a","` + jwt + `"]}`, `{"items":["a","[REDACTED]"]}`},
		// Ordinary values stay.
		{`{"name":"api.example.com","version":"1.2.3","model":"claude-x"}`, `{"model":"claude-x","name":"api.example.com","version":"1.2.3"}`},
	}
	for _, c := range cases {
		got, _ := json.Marshal(bodySummary([]byte(c.body)))
		assert.Equal(t, c.want, string(got), c.body)
	}
}
