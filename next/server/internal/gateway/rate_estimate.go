package gateway

import (
	"context"
	"strings"

	"github.com/tidwall/gjson"

	"github.com/Sub2API-Devs/sup2api/next/server/internal/tokenizer"
)

// rateDefaultOutputTokens is reserved for the output of a request that does
// not declare a maximum; it equals the default output_reserve_tokens billing
// reserves against concurrent overdraft (CONTRACTS §25.8).
const rateDefaultOutputTokens = 4000

// rateMaxOutputPaths are where the request formats declare their maximum
// output.
var rateMaxOutputPaths = []string{"max_tokens", "max_completion_tokens", "max_output_tokens", "generationConfig.maxOutputTokens"}

// rateEstimate is what a TPM cap reserves for one body version. Its prompt
// stays 0 when no cap asked, so nothing is counted on a guess.
type rateEstimate struct {
	valid   bool
	version uint64
	prompt  int64
	total   int64
}

// rateTokens estimates the tokens of the request to reserve against a TPM cap:
// the prompt plus the declared maximum output (CONTRACTS §78). It only runs
// where a TPM cap applies, since counting a large prompt takes tens of
// milliseconds. A free endpoint (count_tokens) generates nothing to reserve.
func (c *call) rateTokens(ctx context.Context) int64 {
	if strings.EqualFold(c.ep.Billing, "free") {
		return 0
	}
	e := &c.rateEstimate
	if e.valid && e.version == c.bodyVersion {
		return e.total
	}
	prompt, _, err := tokenizer.Count(ctx, c.promptText(tokenizer.MaxTextBytes), "")
	if err != nil || prompt <= 0 {
		prompt = int64(len(c.body) / 4)
	}
	output := int64(rateDefaultOutputTokens)
	for _, path := range rateMaxOutputPaths {
		if n := gjson.GetBytes(c.body, path).Int(); n > 0 {
			output = n
			break
		}
	}
	e.valid, e.version, e.prompt, e.total = true, c.bodyVersion, prompt, prompt+output
	return e.total
}
