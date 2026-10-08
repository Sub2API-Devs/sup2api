package core

import (
	"fmt"
	"maps"
	"strings"
)

func ValidatePricedUsage(item PricedUsage) error {
	if len(item.BillingReason) > 256 || strings.ContainsAny(item.BillingReason, "\r\n\x00") || item.Free && item.BillingReason == "" {
		return fmt.Errorf("invalid usage billing disposition")
	}
	if item.Kind == "" || len(item.Kind) > 64 || item.Model == "" || len(item.Model) > 256 || strings.ContainsAny(item.Model+item.Kind, "\r\n\x00") {
		return fmt.Errorf("invalid additional usage identity")
	}
	if item.UsageSemantics != "inclusive" && item.UsageSemantics != "exclusive" {
		return fmt.Errorf("invalid additional usage semantics")
	}
	if item.RateMultiplier.IsNegative() {
		return fmt.Errorf("invalid additional usage rate")
	}
	for _, n := range []int64{item.Tokens.Input, item.Tokens.Output, item.Tokens.CacheRead, item.Tokens.CacheCreation, item.Tokens.CacheCreation1h} {
		if n < 0 || n > 1_000_000_000_000 {
			return fmt.Errorf("invalid additional token count")
		}
	}
	return nil
}

func ClonePricedUsage(items []PricedUsage) []PricedUsage {
	if items == nil {
		return nil
	}
	out := append([]PricedUsage(nil), items...)
	for i := range out {
		if out[i].Price != nil {
			price := *out[i].Price
			out[i].Price = &price
		}
		out[i].Metrics = maps.Clone(out[i].Metrics)
		out[i].PriceParams = maps.Clone(out[i].PriceParams)
		out[i].PriceHeaders = maps.Clone(out[i].PriceHeaders)
	}
	return out
}
