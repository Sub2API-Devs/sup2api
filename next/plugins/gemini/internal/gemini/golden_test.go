package gemini

import (
	"testing"

	"github.com/Sub2API-Devs/sup2api/next/sdk/upstream/goldentest"
)

// TestGolden records what the plugin answers for the declarative upstream
// input matrix (run with -args -update-golden to rewrite the golden file).
func TestGolden(t *testing.T) {
	p := New()
	goldentest.Golden(t, goldentest.Matrix{
		Plugin:         "gemini",
		AccountType:    AccountTypeAPIKey,
		Protocols:      Protocols,
		ForwardHeaders: forwardHeaders,
		Errors:         goldentest.GeminiErrors,
	}, goldentest.FromPlugin(p, &p.now))
}
