package check

import "testing"

func TestBillingTypesMustBeDeclared(t *testing.T) {
	for _, types := range [][]string{nil, {}, {"unknown"}, {"per_token", "per_token"}, {"video"}} {
		p := validPlatform()
		p.Endpoints[0].BillingTypes = types
		if got := platformCodes(p); got["endpoints[0].billingTypes"] == "" {
			t.Fatalf("accepted types %v", types)
		}
		if types == nil && p.Endpoints[0].SupportsBillingType("per_token") {
			t.Fatal("undeclared type allowed")
		}
	}
	p := taskPlatform()
	p.Endpoints[0].BillingTypes = []string{"video"}
	if got := platformCodes(p); len(got) != 0 {
		t.Fatalf("video rejected: %v", got)
	}
	if !p.Endpoints[0].SupportsBillingType("video") || p.Endpoints[0].SupportsBillingType("per_token") {
		t.Fatal("declaration not enforced")
	}
}
