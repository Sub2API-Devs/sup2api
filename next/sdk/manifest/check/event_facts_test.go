package check

import (
	"testing"

	"github.com/Sub2API-Devs/sup2api/next/sdk/manifest"
)

func TestEventUsageMapsRequireDeclaredFacts(t *testing.T) {
	p := validPlatform()
	p.Usage.SSE[0].Map["speed"] = "message.usage.speed"
	if got := platformCodes(p); got["usage.sse[0].map.speed"] != "unknown_field" {
		t.Fatalf("undeclared metric admitted: %v", got)
	}
	p.Usage.Facts["speed"] = manifest.UsageFact{Type: "enum", Enum: []string{"standard", "fast"}, Path: "usage.speed"}
	if got := platformCodes(p); len(got) != 0 {
		t.Fatal(got)
	}
	p.Usage.SSE[0].Map["speed"] = "@unsafe"
	if got := platformCodes(p); got["usage.sse[0].map.speed"] != "invalid_path" {
		t.Fatalf("declared metric bypassed path validation: %v", got)
	}
}
