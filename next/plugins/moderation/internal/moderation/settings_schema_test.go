package moderation

import (
	"encoding/json"
	"os"
	"path/filepath"
	"regexp"
	"strings"
	"testing"
)

// P12: a string the decoder cuts or drops is refused on save by the same
// limit in the schema (the core validates every save), so a value is never
// changed silently; the decoder keeps the cut as a backstop for stored
// values.
func TestSchemaLimitsMatchDecoding(t *testing.T) {
	raw, err := os.ReadFile(filepath.Join("..", "..", "forms", "settings.schema.json"))
	if err != nil {
		t.Fatal(err)
	}
	var schema struct {
		Properties map[string]struct {
			MaxLength int    `json:"maxLength"`
			Pattern   string `json:"pattern"`
		} `json:"properties"`
	}
	if err := json.Unmarshal(raw, &schema); err != nil {
		t.Fatal(err)
	}
	decode := func(key, value string) Settings {
		t.Helper()
		b, _ := json.Marshal(map[string]string{key: value})
		s, err := DecodeSettings(b)
		if err != nil {
			t.Fatal(err)
		}
		return s
	}
	for key, get := range map[string]func(Settings) string{
		"block_message":         func(s Settings) string { return s.BlockMessage },
		"notify_webhook_secret": func(s Settings) string { return s.NotifyWebhookSecret },
		"notify_webhook_url":    func(s Settings) string { return s.NotifyWebhookURL },
	} {
		limit := schema.Properties[key].MaxLength
		if limit == 0 {
			t.Fatalf("%s: no maxLength", key)
		}
		prefix := ""
		if key == "notify_webhook_url" {
			prefix = "https://例.example/"
		}
		at := prefix + strings.Repeat("é", limit-len([]rune(prefix)))
		if got := get(decode(key, at)); got != at {
			t.Errorf("%s: a value of maxLength (%d characters) is changed by the decoder", key, limit)
		}
		if got := get(decode(key, at+"é")); got == at+"é" {
			t.Errorf("%s: the decoder keeps a value beyond maxLength", key)
		}
	}
	re := regexp.MustCompile(schema.Properties["notify_webhook_url"].Pattern)
	for _, u := range []string{"", "https://x", "http://x/y", "ftp://x", "https://a b", " https://x"} {
		s := decode("notify_webhook_url", u)
		if kept := s.NotifyWebhookURL == u; kept != re.MatchString(u) && strings.TrimSpace(u) == u {
			t.Errorf("notify_webhook_url %q: decoder keeps %v, schema accepts %v", u, kept, re.MatchString(u))
		}
	}
}
