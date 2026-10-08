package gateway

import (
	"bytes"
	"encoding/json"
	wire "github.com/Sub2API-Devs/sup2api/next/plugins/ccgateway/companions/contracts/helperhistory"
	"testing"
)

func TestHelperHistoryABCTailReminderRealDBCLI(t *testing.T) {
	runHelperHistoryABCRealDBCLI(t, false, abcHelperOptions{TailReminder: true})
}

func verifyABCTailReminder(t *testing.T, messages []json.RawMessage, original *string) {
	t.Helper()
	for i, raw := range messages {
		if !bytes.Contains(raw, []byte(`"id":"helper_source_call"`)) {
			continue
		}
		if i+2 >= len(messages) {
			t.Fatal("hidden pair lost its trailing budget system")
		}
		var m struct {
			Role    string
			Content json.RawMessage
		}
		if json.Unmarshal(messages[i+2], &m) != nil || m.Role != "system" || !bytes.Contains(m.Content, []byte("<total_tokens>")) {
			t.Fatal("budget system moved from immediately after its hidden pair")
		}
		d, err := wire.CanonicalDigest(messages[i+2])
		if err != nil {
			t.Fatal(err)
		}
		if *original == "" {
			*original = d
		} else if *original != d {
			t.Fatal("persisted hidden budget system changed across restore")
		}
	}
}
