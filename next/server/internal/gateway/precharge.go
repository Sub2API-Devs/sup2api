package gateway

import (
	"context"
	"fmt"
	"math"
	"time"

	pluginv1 "github.com/Sub2API-Devs/sup2api/next/sdk/gen/pluginv1"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/tokenizer"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/usagerules"
)

// precharge runs only after billing type admission and before scheduling.
// The plugin reports units; the core owns the price snapshot and ledger.
func (c *call) precharge(ctx context.Context) error {
	if c.price == nil {
		// Resolve returns nil only for the explicit missing_price_policy=free.
		return nil
	}
	gate := c.g.d.Balance
	if gate == nil {
		return fmt.Errorf("billing precharger unavailable")
	}
	floor, err := gate.PreConsumeTokens(ctx)
	if err != nil {
		return err
	}
	fields, omitted := usageRequestFields(c.ep.UsageRequestFields, c.body)
	prompt := c.promptText(tokenizer.MaxTextBytes + 1)
	if len(prompt) > tokenizer.MaxTextBytes {
		return fmt.Errorf("prompt exceeds local tokenizer limit")
	}
	in := &pluginv1.EstimateUsageRequest{Meta: c.meta(), Fields: fields, FieldsOmitted: omitted, PreConsumeTokens: floor, Prompt: prompt}
	var report *pluginv1.UsageReport
	if pb, exists := c.gen.Platform(c.platform); exists && pb.Client != nil {
		estimator, ok := pb.Client.(interface {
			EstimateUsage(context.Context, *pluginv1.EstimateUsageRequest) (*pluginv1.UsageReport, error)
		})
		if !ok {
			return fmt.Errorf("plugin does not implement EstimateUsage")
		}
		estctx, cancel := context.WithTimeout(ctx, c.gw.hotpathTimeout())
		defer cancel()
		report, err = estimator.EstimateUsage(estctx, in)
	} else {
		if c.ep.TaskSubmit() {
			return fmt.Errorf("task estimator unavailable")
		}
		var n int64
		n, _, err = tokenizer.Count(ctx, prompt, "")
		report = &pluginv1.UsageReport{Tokens: &pluginv1.UsageTokens{InputTokens: max(n, floor)}}
	}
	if err != nil {
		return err
	}
	if report == nil || report.Reserve != nil {
		return fmt.Errorf("invalid pre-upstream estimate")
	}
	t := report.GetTokens()
	for _, n := range []int64{t.GetInputTokens(), t.GetOutputTokens(), t.GetCacheReadTokens(), t.GetCacheCreationTokens(), t.GetCacheCreation_1HTokens()} {
		if n < 0 || n > 1_000_000_000_000 {
			return fmt.Errorf("invalid estimated token count")
		}
	}
	rec := *c.rec
	rec.Tokens = usagerules.Tokens(t.GetInputTokens(), t.GetOutputTokens(), t.GetCacheReadTokens(), t.GetCacheCreationTokens(), t.GetCacheCreation_1HTokens())
	rules := c.pf.Usage
	if c.ep.Usage != nil {
		rules = *c.ep.Usage
	}
	rec.UsageSemantics = rules.Semantics
	rec.Metrics = map[string]any{}
	for key, raw := range report.GetFacts() {
		fact, ok := rules.Facts[key]
		if !ok {
			return fmt.Errorf("undeclared estimated fact %q", key)
		}
		value, ok := usagerules.Fact(fact, raw)
		if !ok {
			return fmt.Errorf("invalid estimated fact %q", key)
		}
		if number, ok := value.(float64); ok && (math.IsNaN(number) || math.IsInf(number, 0)) {
			return fmt.Errorf("non-finite estimated fact %q", key)
		}
		rec.Metrics[key] = value
	}
	pctx, cancel := context.WithTimeout(ctx, 15*time.Second)
	defer cancel()
	return gate.Precharge(pctx, &rec)
}
