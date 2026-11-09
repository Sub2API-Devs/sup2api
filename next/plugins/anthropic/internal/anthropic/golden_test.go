package anthropic

import (
	"testing"

	"github.com/Sub2API-Devs/sup2api/next/sdk/upstream/goldentest"
)

// TestGolden records what the plugin answers for the declarative upstream
// input matrix (run with -args -update-golden to rewrite the golden file).
func TestGolden(t *testing.T) {
	p := New()
	goldentest.Golden(t, goldentest.Matrix{
		Plugin:         "anthropic",
		AccountType:    AccountTypeAPIKey,
		Protocols:      Protocols,
		ForwardHeaders: forwardHeaders,
		Errors:         goldentest.AnthropicErrors,
	}, goldentest.FromPlugin(p, &p.now))
}
