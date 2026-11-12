package moderation

import (
	"encoding/json"
	"os"
	"path/filepath"
	"strings"
	"testing"
)

// An empty block_message reads as the default; a stored value is kept
// (trimmed, capped at 500 runes).
func TestBlockMessageDefault(t *testing.T) {
	long := strings.Repeat("字", 501)
	for _, tc := range []struct{ name, stored, want string }{
		{"unset", `{}`, DefaultBlockMessage},
		{"empty", `{"block_message": ""}`, DefaultBlockMessage},
		{"blank", `{"block_message": "  "}`, DefaultBlockMessage},
		{"wrong type", `{"block_message": 7}`, DefaultBlockMessage},
		{"custom", `{"block_message": " 请求被拒绝 "}`, "请求被拒绝"},
		{"too long", `{"block_message": "` + long + `"}`, long[:500*len("字")]},
	} {
		s, err := DecodeSettings([]byte(tc.stored))
		if err != nil || s.BlockMessage != tc.want {
			t.Errorf("%s: block_message = %q (%v), want %q", tc.name, s.BlockMessage, err, tc.want)
		}
	}
	if got := DefaultSettings().BlockMessage; got != DefaultBlockMessage {
		t.Fatalf("settings default = %q, want %q", got, DefaultBlockMessage)
	}
}

// The form shows the schema default (JSON cannot use the Go constant): the two
// stay the same.
func TestBlockMessageSchemaDefault(t *testing.T) {
	raw, err := os.ReadFile(filepath.Join("..", "..", "forms", "settings.schema.json"))
	if err != nil {
		t.Fatal(err)
	}
	var schema struct {
		Properties map[string]struct {
			Default any `json:"default"`
		} `json:"properties"`
	}
	if err := json.Unmarshal(raw, &schema); err != nil {
		t.Fatal(err)
	}
	if got := schema.Properties["block_message"].Default; got != DefaultBlockMessage {
		t.Fatalf("schema default = %q, want %q", got, DefaultBlockMessage)
	}
}
