package features

import (
	"strings"
	"testing"
)

func TestCreditMCPSourceCatalogConstraints(t *testing.T) {
	doc := Catalog()
	if doc.CatalogVersion != CatalogVersion || doc.RuntimeVerified {
		t.Fatal("wrong catalog or runtime claim")
	}
	byID := map[string]Feature{}
	for _, feature := range doc.Features {
		byID[feature.ID] = feature
	}
	for _, id := range []string{"F-MCP", "F-INLINE-TOOLS", "F-SAFEGUARDS", "F-FALLBACK", "F-TOOL-SEARCH"} {
		feature := byID[id]
		if feature.Status != "partial" || len(feature.Mechanisms) == 0 {
			t.Fatal("conditional support lost", id)
		}
	}
	if byID["F-SAFEGUARDS"].Scope != "cc" || byID["F-FALLBACK"].Scope != "api" {
		t.Fatal("API/CC scopes mixed")
	}
	fallback := byID["F-FALLBACK"]
	for _, path := range []string{"fallback_credit_token.mode", "stop_details.fallback_credit_token", "usage.fallback_credit"} {
		found := false
		for _, actual := range fallback.BodyPaths {
			found = found || actual == path
		}
		if !found {
			t.Error("credit request/response contract missing", path)
		}
	}
	for _, constraint := range []string{"strict/best_effort", "null", "issuer", "SSE", "有界缓冲", "未验证"} {
		if !strings.Contains(fallback.Reason, constraint) {
			t.Error("credit qualification missing", constraint)
		}
	}
	rules := map[string]string{}
	for _, rule := range BetaRules() {
		rules[rule.Name] = rule.Mapping
	}
	for _, beta := range fallback.BetaHeaders {
		if rules[beta] != "forward" {
			t.Error("advertised beta is not admitted", beta)
		}
	}
	if !strings.Contains(byID["F-MCP"].Reason, "deferred MCP") || !strings.Contains(byID["F-MCP"].Reason, "尚未确认") {
		t.Fatal("unverified MCP encoding presented as supported")
	}
}
