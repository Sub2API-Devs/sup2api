package api

import (
	"encoding/json"
	"errors"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"

	"github.com/Sub2API-Devs/sup2api/next/sdk/manifest"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/core"
)

// The moderation shape: an x-sensitive webhook URL next to its writeOnly
// signing secret, plus a nested object with its own credential and address.
const settingsSchema = `{
  "type": "object",
  "properties": {
    "threshold": {"type": "number"},
    "notify_webhook_url": {"type": "string", "x-sensitive": true},
    "notify_webhook_secret": {"type": "string", "writeOnly": true},
    "smtp_password": {"type": "string", "format": "password"},
    "both": {"type": "string", "writeOnly": true, "x-sensitive": true},
    "upstream": {
      "type": "object",
      "properties": {
        "base_url": {"type": "string", "x-sensitive": true},
        "api/key": {"type": "string", "writeOnly": true},
        "name": {"type": "string"}
      }
    }
  }
}`

// schemaFields is what the settings form of schema masks.
func schemaFields(schema string) []manifest.SecretField {
	fields, _ := schemaSecrets([]byte(schema))
	return fields
}

func TestMaskValuesNested(t *testing.T) {
	fields := schemaFields(settingsSchema)
	v := map[string]any{
		"threshold":             3.0,
		"notify_webhook_url":    "https://hooks.example/x",
		"notify_webhook_secret": "",
		"upstream":              map[string]any{"base_url": "https://u", "api/key": "k", "name": "n"},
	}
	maskValues(fields, v)
	assert.Equal(t, Mask, v["notify_webhook_url"])
	assert.Equal(t, "", v["notify_webhook_secret"], "empty values stay empty")
	assert.Equal(t, map[string]any{"base_url": Mask, "api/key": Mask, "name": "n"}, v["upstream"])
	assert.Equal(t, 3.0, v["threshold"])
}

func stored() map[string]any {
	return map[string]any{
		"threshold":             3.0,
		"notify_webhook_url":    "https://hooks.example/x",
		"notify_webhook_secret": "whsec",
		"smtp_password":         "pw",
		"upstream":              map[string]any{"base_url": "https://u", "api/key": "k", "name": "n"},
	}
}

// in builds a request copying the stored values, credentials and addresses
// masked as GET returns them, then applies edits.
func in(edit func(map[string]any)) map[string]any {
	v := stored()
	maskValues(schemaFields(settingsSchema), v)
	if edit != nil {
		edit(v)
	}
	return v
}

func reenterFields(t *testing.T, err error) []string {
	t.Helper()
	var ae *core.Error
	require.True(t, errors.As(err, &ae), "err = %v", err)
	fields, _ := ae.Details["fields"].([]core.FieldError)
	var out []string
	for _, f := range fields {
		assert.Equal(t, "reenter", f.Code)
		out = append(out, f.Field)
	}
	return out
}

func TestMergeSettingsPluginPermission(t *testing.T) {
	fields := schemaFields(settingsSchema)
	allCreds := []string{"values/notify_webhook_secret", "values/smtp_password", "values/upstream/api~1key"}

	t.Run("nothing changed keeps everything", func(t *testing.T) {
		v := in(nil)
		changed, err := mergeSettings(fields, stored(), v, false, nil)
		require.NoError(t, err)
		assert.Empty(t, changed)
		assert.Equal(t, stored(), v)
	})
	t.Run("plain change needs every kept credential", func(t *testing.T) {
		_, err := mergeSettings(fields, stored(), in(func(v map[string]any) { v["threshold"] = 4.0 }), false, nil)
		assert.Equal(t, allCreds, reenterFields(t, err))
	})
	t.Run("redirecting the webhook needs its secret", func(t *testing.T) {
		// The reported attack: point the x-sensitive URL elsewhere and keep
		// the signing secret through the mask.
		_, err := mergeSettings(fields, stored(), in(func(v map[string]any) { v["notify_webhook_url"] = "https://evil.example/" }), false, nil)
		assert.Equal(t, allCreds, reenterFields(t, err))
	})
	t.Run("nested address change needs credentials", func(t *testing.T) {
		_, err := mergeSettings(fields, stored(), in(func(v map[string]any) {
			v["upstream"].(map[string]any)["base_url"] = "https://evil.example/"
		}), false, nil)
		assert.Equal(t, allCreds, reenterFields(t, err))
	})
	t.Run("re-entering one credential does not keep the others", func(t *testing.T) {
		_, err := mergeSettings(fields, stored(), in(func(v map[string]any) { v["notify_webhook_secret"] = "new" }), false, nil)
		assert.Equal(t, []string{"values/smtp_password", "values/upstream/api~1key"}, reenterFields(t, err))
	})
	t.Run("every credential re-entered, addresses kept masked", func(t *testing.T) {
		v := in(func(v map[string]any) {
			v["threshold"] = 4.0
			v["notify_webhook_secret"] = "whsec2"
			v["smtp_password"] = "pw2"
			v["upstream"].(map[string]any)["api/key"] = "k2"
		})
		changed, err := mergeSettings(fields, stored(), v, false, nil)
		require.NoError(t, err)
		assert.Equal(t, []string{"notify_webhook_secret", "smtp_password", "threshold", "upstream"}, changed)
		assert.Equal(t, "https://hooks.example/x", v["notify_webhook_url"], "masked address keeps the stored value")
		assert.Equal(t, "https://u", v["upstream"].(map[string]any)["base_url"])
	})
	t.Run("credentials re-entered and address changed", func(t *testing.T) {
		v := in(func(v map[string]any) {
			v["notify_webhook_url"] = "https://new.example/"
			v["notify_webhook_secret"] = "whsec2"
			v["smtp_password"] = "pw2"
			v["upstream"].(map[string]any)["api/key"] = "k2"
		})
		_, err := mergeSettings(fields, stored(), v, false, nil)
		require.NoError(t, err)
	})
	t.Run("removed setting counts as a change", func(t *testing.T) {
		_, err := mergeSettings(fields, stored(), in(func(v map[string]any) { delete(v, "threshold") }), false, nil)
		assert.Equal(t, allCreds, reenterFields(t, err))
	})
	t.Run("masked secret with nothing stored is dropped", func(t *testing.T) {
		old := stored()
		delete(old, "smtp_password")
		v := in(func(v map[string]any) { v["smtp_password"] = Mask })
		changed, err := mergeSettings(fields, old, v, false, nil)
		require.NoError(t, err)
		assert.Empty(t, changed)
		_, ok := v["smtp_password"]
		assert.False(t, ok)
	})
}

func TestMergeSettingsManagerKeepsSecrets(t *testing.T) {
	fields := schemaFields(settingsSchema)
	v := in(func(v map[string]any) { v["notify_webhook_url"] = "https://new.example/" })
	changed, err := mergeSettings(fields, stored(), v, true, nil)
	require.NoError(t, err)
	assert.Equal(t, []string{"notify_webhook_url"}, changed)
	assert.Equal(t, "whsec", v["notify_webhook_secret"])
	assert.Equal(t, "k", v["upstream"].(map[string]any)["api/key"])
}

func TestMergeSettingsValidatesResolvedValues(t *testing.T) {
	fields := schemaFields(settingsSchema)
	var seen map[string]any
	_, err := mergeSettings(fields, stored(), in(nil), false, func(v map[string]any) error {
		b, _ := json.Marshal(v)
		_ = json.Unmarshal(b, &seen)
		return nil
	})
	require.NoError(t, err)
	assert.Equal(t, "whsec", seen["notify_webhook_secret"], "validation sees stored values, not the mask")
}

// A schema of a package installed before the packaging check may mark
// secrets where no value path leads: the top-level settings holding them are
// masked whole, as credentials.
func TestSchemaSecretsLegacyUnreachable(t *testing.T) {
	const legacy = `{"properties":{
		"threshold":{"type":"number"},
		"token":{"type":"string","writeOnly":true},
		"hooks":{"type":"array","items":{"type":"object","properties":{"url":{"type":"string"},"secret":{"type":"string","writeOnly":true}}}},
		"upstream":{"type":"object","properties":{"key":{"writeOnly":true},"extra":{"additionalProperties":{"x-sensitive":true}}}}}}`
	fields, maskAll := schemaSecrets([]byte(legacy))
	require.False(t, maskAll)
	got := map[string]bool{}
	for _, f := range fields {
		got[f.Pointer()] = f.Credential
	}
	// upstream/key is covered by the whole of upstream.
	assert.Equal(t, map[string]bool{"token": true, "hooks": true, "upstream": true}, got)

	hooks := []any{map[string]any{"url": "https://a.example", "secret": "s1"}}
	old := map[string]any{"threshold": 3.0, "token": "t", "hooks": hooks, "upstream": map[string]any{"key": "k", "extra": map[string]any{"x": "y"}}}
	shown := map[string]any{"threshold": 3.0, "token": "t", "hooks": hooks, "upstream": map[string]any{"key": "k", "extra": map[string]any{"x": "y"}}}
	maskValues(fields, shown)
	assert.Equal(t, map[string]any{"threshold": 3.0, "token": Mask, "hooks": Mask, "upstream": Mask}, shown)

	// Sending the masks back keeps the stored blocks.
	changed, err := mergeSettings(fields, old, shown, false, nil)
	require.NoError(t, err)
	assert.Empty(t, changed)
	assert.Equal(t, old, shown)

	// A schema that cannot be read as an object masks them all.
	for _, schema := range []string{`true`, `not json`, `null`, `[]`} {
		_, maskAll = schemaSecrets([]byte(schema))
		assert.True(t, maskAll, schema)
	}
	// So does a reference at the root of a schema with secrets.
	_, maskAll = schemaSecrets([]byte(`{"$ref":"#/$defs/s","$defs":{"s":{"properties":{"k":{"writeOnly":true}}}}}`))
	assert.True(t, maskAll)

	// A marker belonging to no single setting masks them all.
	_, maskAll = schemaSecrets([]byte(`{"properties":{"a":{"type":"string"}},"additionalProperties":{"writeOnly":true}}`))
	assert.True(t, maskAll)
}

// Without a schema nothing says which stored values are secret: every
// top-level setting is a credential, of the stored and of the submitted values.
func TestSecretsWithoutSchema(t *testing.T) {
	v := &SettingsView{maskAll: true}
	old := map[string]any{"api_key": "k", "opts": map[string]any{"a": 1.0}, "empty": ""}
	fields := v.secrets(old, map[string]any{"api_key": Mask, "fresh": "x"})
	var names []string
	for _, f := range fields {
		require.True(t, f.Credential)
		names = append(names, f.Pointer())
	}
	assert.Equal(t, []string{"api_key", "empty", "fresh", "opts"}, names)

	shown := map[string]any{"api_key": "k", "opts": map[string]any{"a": 1.0}, "empty": ""}
	maskValues(v.secrets(shown), shown)
	assert.Equal(t, map[string]any{"api_key": Mask, "opts": Mask, "empty": ""}, shown)

	// The plugin-permission holder changing anything re-enters what it keeps.
	_, err := mergeSettings(fields, old, map[string]any{"api_key": Mask, "opts": Mask, "empty": "", "fresh": "x"}, false, nil)
	assert.ElementsMatch(t, []string{"values/api_key", "values/opts"}, reenterFields(t, err))

	// A schema form keeps to its own fields.
	assert.Empty(t, (&SettingsView{}).secrets(old))
}
