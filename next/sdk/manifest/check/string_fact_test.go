package check

import (
	"github.com/Sub2API-Devs/sup2api/next/sdk/manifest"
	"testing"
)

func TestUsageStringFactContract(t *testing.T) {
	p := validPlatform()
	p.Usage.Facts["region"] = manifest.UsageFact{Type: "string", Path: "usage.region"}
	if got := platformCodes(p); len(got) > 0 {
		t.Fatal(got)
	}
	p.Usage.Facts["region"] = manifest.UsageFact{Type: "string", Path: "usage.region", Enum: []string{"us"}}
	if platformCodes(p)["usage.facts.region.enum"] != "unsupported" {
		t.Fatal("string silently accepted a closed enum")
	}
}
