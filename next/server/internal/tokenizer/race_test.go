//go:build race

package tokenizer

// The race detector slows the tokenizer loop roughly tenfold; a quadratic
// regression still blows far past the widened budget.
func init() { linearTimeBudget *= 10 }
