package gateway

import (
	"context"
	"testing"

	"github.com/Sub2API-Devs/sup2api/next/server/internal/core"
)

// A client that hangs up before the usage event pays the pre-upstream
// estimate (CONTRACTS §25.8); every other outcome is billed as before.
func TestFinalizeBillabilityCanceledStreamBillsPrecharge(t *testing.T) {
	est := &prechargeEstimate{tokens: core.UsageTokens{Input: 120, Output: 4000}, semantics: "exclusive"}
	perToken := &core.PriceRule{Mode: "per_token"}
	canceled := func() *core.UsageRecord {
		return &core.UsageRecord{ErrorType: errTypeClientCanceled, StatusCode: statusClientClosed, Price: perToken}
	}

	t.Run("cut before any usage", func(t *testing.T) {
		c := &call{precharged: est, upstreamResponded: true}
		rec := canceled()
		c.finalizeBillability(context.Background(), rec, "paid")
		if !rec.Billable || rec.Price == nil {
			t.Fatalf("not billable: %+v", rec)
		}
		if rec.Tokens != est.tokens || rec.UsageSemantics != "exclusive" || rec.UsageExtract != core.UsageExtractPrecharge {
			t.Fatalf("tokens = %+v semantics = %q extract = %q", rec.Tokens, rec.UsageSemantics, rec.UsageExtract)
		}
	})
	t.Run("cut after message_start keeps the larger counts", func(t *testing.T) {
		c := &call{precharged: est, upstreamResponded: true}
		rec := canceled()
		rec.Tokens = core.UsageTokens{Input: 150, Output: 1, CacheRead: 50}
		rec.UsageSemantics = "inclusive"
		c.finalizeBillability(context.Background(), rec, "paid")
		want := core.UsageTokens{Input: 150, Output: 4000, CacheRead: 50}
		if !rec.Billable || rec.Tokens != want || rec.UsageSemantics != "inclusive" {
			t.Fatalf("billable = %v tokens = %+v semantics = %q", rec.Billable, rec.Tokens, rec.UsageSemantics)
		}
	})
	t.Run("per_request price is owed", func(t *testing.T) {
		c := &call{precharged: &prechargeEstimate{}, upstreamResponded: true}
		rec := canceled()
		rec.Price = &core.PriceRule{Mode: "per_request"}
		c.finalizeBillability(context.Background(), rec, "paid")
		if !rec.Billable {
			t.Fatalf("not billable: %+v", rec)
		}
	})
	t.Run("left while queueing: nothing consumed", func(t *testing.T) {
		c := &call{precharged: est}
		rec := canceled()
		c.finalizeBillability(context.Background(), rec, "paid")
		if rec.Billable || rec.Tokens != (core.UsageTokens{}) || rec.UsageExtract != "" {
			t.Fatalf("billed a request no upstream saw: %+v", rec)
		}
	})
	t.Run("free endpoint", func(t *testing.T) {
		c := &call{precharged: est, upstreamResponded: true}
		rec := canceled()
		c.finalizeBillability(context.Background(), rec, "free")
		if rec.Billable || rec.Price != nil {
			t.Fatalf("billed a free endpoint: %+v", rec)
		}
	})
	t.Run("upstream failure is not a hang-up", func(t *testing.T) {
		c := &call{precharged: est, upstreamResponded: true}
		rec := &core.UsageRecord{ErrorType: errTypeUpstream, StatusCode: 502, Price: perToken}
		c.finalizeBillability(context.Background(), rec, "paid")
		if rec.Billable || rec.Tokens != (core.UsageTokens{}) {
			t.Fatalf("billed an upstream failure: %+v", rec)
		}
	})
	t.Run("a plugin's own accounting stands", func(t *testing.T) {
		c := &call{precharged: est, upstreamResponded: true}
		rec := canceled()
		rec.Replacement = []core.PricedUsage{{Price: perToken, Tokens: core.UsageTokens{Input: 10}}}
		c.finalizeBillability(context.Background(), rec, "paid")
		if rec.Tokens != (core.UsageTokens{}) || rec.UsageExtract != "" {
			t.Fatalf("estimate overrode the plugin's attempts: %+v", rec)
		}
	})
}
