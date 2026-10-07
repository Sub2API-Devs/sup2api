package usagerules

import (
	"testing"

	"github.com/Sub2API-Devs/sup2api/next/sdk/manifest"
)

func TestEventFactUsesDeclaredEnumAndRetainsLastValidValue(t *testing.T) {
	captureLogs(t)
	rules := factRules(manifest.UsageFact{Type: "enum", Enum: []string{"standard", "fast"}, Path: "usage.speed"})
	rules.SSE = []manifest.SSEUsageMap{{Event: "message_start", Map: map[string]string{"quality": "message.usage.speed"}}}
	u := New(rules)
	u.ApplySSE("message_start", []byte(`{"message":{"usage":{"speed":"fast"}}}`))
	u.ApplySSE("message_start", []byte(`{"message":{"usage":{"speed":"unrecognized"}}}`))
	if u.Metrics["quality"] != "fast" {
		t.Fatal("event map bypassed fact validation", u.Metrics)
	}
	u.ApplySSE("message_delta", []byte(`{"usage":{"speed":"standard"}}`))
	if u.Metrics["quality"] != "standard" {
		t.Fatal("final actual speed did not replace start", u.Metrics)
	}
}
