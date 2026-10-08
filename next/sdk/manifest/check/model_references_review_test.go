package check

import (
	"github.com/Sub2API-Devs/sup2api/next/sdk/manifest"
	"testing"
)

func TestReviewReferenceLocationCannotDuplicateByRenaming(t *testing.T) {
	p := validPlatform()
	p.Endpoints[0].Billing = "free"
	p.Endpoints[0].BillingTypes = nil
	p.Endpoints[0].Request.ModelReferences = []manifest.RequestModelReference{{Name: "a", ArrayPath: "tools", ModelPath: "model"}, {Name: "b", ArrayPath: "tools", ModelPath: "model"}}
	if got := platformCodes(p); len(got) == 0 {
		t.Fatal("identical location registered twice under different usage kinds")
	}
	p.Endpoints[0].Request.ModelReferences[1] = manifest.RequestModelReference{Name: "a", ArrayPath: "messages[].content", ModelPath: "model"}
	if got := platformCodes(p); len(got) != 0 {
		t.Fatal("same usage kind at a distinct location must be allowed", got)
	}
}
