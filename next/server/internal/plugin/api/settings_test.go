package api

import (
	"encoding/json"
	"errors"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"

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

func TestSecretFieldsClassifiesAndNests(t *testing.T) {
	got := map[string]bool{}
	for _, f := range secretFields([]byte(settingsSchema)) {
		got[f.pointer()] = f.Credential
	}
	assert.Equal(t, map[string]bool{
		"notify_webhook_url":    false,
		"notify_webhook_secret": true,
		"smtp_password":         true,
		"both":                  true, // writeOnly wins over x-sensitive
		"upstream/base_url":     false,
		"upstream/api~1key":     true,
	}, got)
	assert.Empty(t, secretFields([]byte(`null`)))
	assert.Empty(t, secretFields([]byte(`not json`)))
}

func TestMaskValuesNested(t *testing.T) {
	fields := secretFields([]byte(settingsSchema))
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
	maskValues(secretFields([]byte(settingsSchema)), v)
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
	fields := secretFields([]byte(settingsSchema))
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
	fields := secretFields([]byte(settingsSchema))
	v := in(func(v map[string]any) { v["notify_webhook_url"] = "https://new.example/" })
	changed, err := mergeSettings(fields, stored(), v, true, nil)
	require.NoError(t, err)
	assert.Equal(t, []string{"notify_webhook_url"}, changed)
	assert.Equal(t, "whsec", v["notify_webhook_secret"])
	assert.Equal(t, "k", v["upstream"].(map[string]any)["api/key"])
}

func TestMergeSettingsValidatesResolvedValues(t *testing.T) {
	fields := secretFields([]byte(settingsSchema))
	var seen map[string]any
	_, err := mergeSettings(fields, stored(), in(nil), false, func(v map[string]any) error {
		b, _ := json.Marshal(v)
		_ = json.Unmarshal(b, &seen)
		return nil
	})
	require.NoError(t, err)
	assert.Equal(t, "whsec", seen["notify_webhook_secret"], "validation sees stored values, not the mask")
}
