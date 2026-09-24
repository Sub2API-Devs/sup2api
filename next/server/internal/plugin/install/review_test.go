package install

import (
	"encoding/json"
	"testing"

	"github.com/Sub2API-Devs/sup2api/next/server/internal/plugin/pkg"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/plugin/pkg/pkgtest"
)

// The review lists account types at the top level (CONTRACTS §12); the
// platform summary no longer carries them.
func TestBuildReviewAccountTypes(t *testing.T) {
	m := pkgtest.Platform("anthropic", "0.1.0", "sub2api")
	r := buildReview(m, pkgtest.Files(m), &pkg.Verification{Publisher: "sub2api", Trust: "official"}, "0.1.0", nil)
	raw, err := json.Marshal(r)
	if err != nil {
		t.Fatal(err)
	}
	var out struct {
		Platform     map[string]any `json:"platform"`
		AccountTypes []struct {
			ID        string            `json:"id"`
			Label     map[string]string `json:"label"`
			Protocols []string          `json:"protocols"`
		} `json:"account_types"`
	}
	if err := json.Unmarshal(raw, &out); err != nil {
		t.Fatal(err)
	}
	if _, ok := out.Platform["account_types"]; ok || out.Platform["id"] != "anthropic" {
		t.Fatalf("platform = %v", out.Platform)
	}
	if len(out.AccountTypes) != 1 {
		t.Fatalf("account_types = %+v", out.AccountTypes)
	}
	at := out.AccountTypes[0]
	if at.ID != "apikey" || at.Label["en"] != "API Key" || len(at.Protocols) != 2 ||
		at.Protocols[0] != "anthropic.messages" || at.Protocols[1] != "anthropic.count_tokens" {
		t.Fatalf("account type = %+v", at)
	}

	// Plugins without account types report an empty list, not null.
	g := pkgtest.Guard("guard", "0.1.0", "sub2api")
	raw, _ = json.Marshal(buildReview(g, pkgtest.Files(g), &pkg.Verification{}, "0.1.0", nil))
	var gout map[string]any
	_ = json.Unmarshal(raw, &gout)
	if list, ok := gout["account_types"].([]any); !ok || len(list) != 0 {
		t.Fatalf("guard account_types = %v", gout["account_types"])
	}
}
