package gateway

import (
	"strings"
	"testing"

	"github.com/Sub2API-Devs/sup2api/next/sdk/manifest"
)

// The tools-used header of Claude Code 2.1.318 (x-claude-code-sandy-plover,
// SESSION-MEMORY-TOOLS-USED-DESIGN.md §8) may carry up to 8192 bytes. The
// core accepts it inbound (net/http's default 1 MiB header limit; the
// server sets no MaxHeaderBytes) and hands it to the plugin through
// passHeaders byte for byte: no length limit, no trimming, no re-encoding.
func TestPassHeaderOf8192BytesReachesThePluginUnchanged(t *testing.T) {
	const header = "x-claude-code-sandy-plover"
	var b strings.Builder
	b.WriteString(`[{"name":"unreadable-tools-used-before-summary"}`)
	for i := 0; b.Len() < 8192-40; i++ {
		b.WriteString(`,{"name":"mcp__server_` + strings.Repeat("x", 8) + `__tool.` + string(rune('a'+i%26)) + `:-"}`)
	}
	value := b.String()
	value += `,{"name":"` + strings.Repeat("Z", 8192-len(value)-len(`,{"name":""}]`)) + `"}]`
	if len(value) != 8192 {
		t.Fatalf("test value is %d bytes", len(value))
	}

	e := newEnv(t)
	cc := &fakePlatform{base: e.up.srv.URL}
	e.addAccountType("ccgateway", "cc_account", cc,
		manifest.AccountPlatform{Platform: "anthropic", PassHeaders: []string{"x-claude-code-session-id", header}})
	e.accounts.addTyped(testGroup, 4, 0, "cc-4", "ccgateway", "cc_account")

	r := e.do("/v1/messages", body(testModel, false), map[string]string{header: value, "X-Claude-Code-Session-Id": "s1"})
	if r.status != 200 {
		t.Fatalf("status %d: %s", r.status, r.body)
	}
	if len(cc.builds) == 0 {
		t.Fatal("the plugin built no request")
	}
	got := cc.builds[0].GetInboundHeaders()
	if got[header] != value {
		t.Fatalf("header reached the plugin as %d bytes, want the 8192 sent", len(got[header]))
	}
	if got["x-claude-code-session-id"] != "s1" {
		t.Fatalf("pass headers %v", got)
	}
}
