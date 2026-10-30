package grpcruntime

import (
	"context"
	"encoding/json"
	"errors"
	"testing"

	"github.com/shopspring/decimal"
	"google.golang.org/grpc/codes"
	"google.golang.org/grpc/status"

	pluginv1 "github.com/Sub2API-Devs/sup2api/next/sdk/gen/pluginv1"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/billing/expr"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/plugin/registry"
)

type fakePricer struct {
	got expr.Tokens
	sem string
	err error
}

func (f *fakePricer) PriceModelUsage(_ context.Context, model, semantics string, t expr.Tokens) (bool, decimal.Decimal, string, error) {
	f.got, f.sem = t, semantics
	if f.err != nil {
		return false, decimal.Zero, "", f.err
	}
	if model != "m" {
		return false, decimal.Zero, "no_price", nil
	}
	return true, decimal.RequireFromString("0.0000123"), "", nil
}

func TestHostPriceUsage(t *testing.T) {
	ctx := context.Background()
	fp := &fakePricer{}
	i, _ := testInstance(t, nil, nil, registry.Grants{})
	i.rt.o.Prices = fp
	h := &hostServer{i: i}
	if _, err := h.PriceUsage(ctx, &pluginv1.PriceUsageRequest{Model: "m"}); status.Code(err) != codes.PermissionDenied {
		t.Fatalf("without grant: %v", err)
	}
	i, _ = testInstance(t, nil, nil, registry.Grants{PermPrices: json.RawMessage(`{}`)})
	i.rt.o.Prices = fp
	h = &hostServer{i: i}
	r, err := h.PriceUsage(ctx, &pluginv1.PriceUsageRequest{Model: "m", Semantics: "inclusive", Input: 10, Output: 2, CacheRead: 3, CacheCreation_1H: 4})
	if err != nil || !r.GetPriced() || r.GetCost() != "0.00001230" {
		t.Fatalf("priced: %+v %v", r, err)
	}
	if fp.sem != "inclusive" || fp.got != (expr.Tokens{Input: 10, Output: 2, CacheRead: 3, CacheCreation1h: 4}) {
		t.Fatalf("passed %q %+v", fp.sem, fp.got)
	}
	if r, err := h.PriceUsage(ctx, &pluginv1.PriceUsageRequest{Model: "x"}); err != nil || r.GetPriced() || r.GetReason() != "no_price" || r.GetCost() != "" {
		t.Fatalf("unpriced: %+v %v", r, err)
	}
	for _, bad := range []*pluginv1.PriceUsageRequest{{}, {Model: "m", Semantics: "other"}, {Model: "m", Input: -1}} {
		if _, err := h.PriceUsage(ctx, bad); status.Code(err) != codes.InvalidArgument {
			t.Fatalf("%+v: %v", bad, err)
		}
	}
	fp.err = errors.New("db down")
	if _, err := h.PriceUsage(ctx, &pluginv1.PriceUsageRequest{Model: "m"}); status.Code(err) != codes.Unavailable {
		t.Fatalf("db error: %v", err)
	}
	i.rt.o.Prices = nil
	if _, err := h.PriceUsage(ctx, &pluginv1.PriceUsageRequest{Model: "m"}); status.Code(err) != codes.Unavailable {
		t.Fatalf("no pricer: %v", err)
	}
}
