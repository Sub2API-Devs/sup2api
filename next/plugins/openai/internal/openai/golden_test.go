package openai

import (
	"testing"

	"github.com/Sub2API-Devs/sup2api/next/sdk/upstream/goldentest"
)

// TestGolden records what the plugin answers for the declarative upstream
// input matrix (run with -args -update-golden to rewrite the golden file).
func TestGolden(t *testing.T) {
	p := New()
	goldentest.Golden(t, goldentest.Matrix{
		Plugin:         "openai",
		AccountType:    AccountTypeAPIKey,
		Protocols:      Protocols,
		ForwardHeaders: forwardHeaders,
		Errors:         goldentest.OpenAIErrors,
		Inbound: []goldentest.Variant[goldentest.Headers]{
			{Name: "openai-beta other", Value: goldentest.Headers{"openai-beta": "assistants=v2"}},
			{Name: "openai-beta websocket version", Value: goldentest.Headers{"openai-beta": "responses_websockets=2026-02-04"}},
			{Name: "openai-beta websocket version among others", Value: goldentest.Headers{"openai-beta": "assistants=v2,responses_websockets=2026-02-04"}},
		},
	}, goldentest.FromPlugin(p, &p.now))
}
