package gateway

import (
	"encoding/json"
	"strings"
	"testing"
)

func TestHelperHistoryABCSessionContextRealDBCLI(t *testing.T) {
	runHelperHistoryABCRealDBCLI(t, false, abcHelperOptions{TailReminder: true, SessionContext: true})
}

func verifyABCToolResultContext(t *testing.T, messages []json.RawMessage) int {
	t.Helper()
	embedded := 0
	for _, raw := range messages {
		var m struct {
			Role    string
			Content json.RawMessage
		}
		if json.Unmarshal(raw, &m) != nil || m.Role != "user" {
			continue
		}
		var blocks []struct {
			Type    string
			ID      string `json:"tool_use_id"`
			Content json.RawMessage
		}
		if json.Unmarshal(m.Content, &blocks) != nil {
			continue
		}
		for _, b := range blocks {
			if b.Type != "tool_result" || b.ID != "external_weather" {
				continue
			}
			var text string
			if json.Unmarshal(b.Content, &text) != nil {
				t.Fatal("original client tool result string changed shape")
			}
			const original = "PUBLIC_WEATHER_RESULT\t"
			if text == original {
				continue
			}
			if !strings.HasPrefix(text, original+"\n\n<system-reminder>\n") || !strings.HasSuffix(text, "\n</system-reminder>") || strings.Count(text, "fixture@example.invalid") != 1 {
				t.Fatal("client tool result prefix, trailing TAB or unique trusted context changed")
			}
			embedded++
		}
	}
	return embedded
}
