package usage

import (
	"context"
	"fmt"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/core"
	"github.com/shopspring/decimal"
)

type AdditionalBillingDetail struct {
	Kind           string        `json:"kind"`
	Model          string        `json:"model"`
	PriceID        int64         `json:"price_id"`
	ExpressionHash string        `json:"expression_hash"`
	Detail         BillingDetail `json:"detail"`
}

func (s *Service) priceOf(ctx context.Context, p *pending) (decimal.Decimal, BillingDetail, string, error) {
	return priceComponents(p, func(part *pending) (decimal.Decimal, BillingDetail, string, error) { return s.priceOne(ctx, part) })
}

func priceOf(p *pending) (decimal.Decimal, BillingDetail, string, error) {
	return priceComponents(p, priceOne)
}

func priceComponents(p *pending, price func(*pending) (decimal.Decimal, BillingDetail, string, error)) (decimal.Decimal, BillingDetail, string, error) {
	if p.Inputs.BillingError != "" {
		return decimal.Zero, BillingDetail{}, "", fmt.Errorf("usage settlement blocked: %s", p.Inputs.BillingError)
	}
	if len(p.Inputs.Additional) > 128 {
		return decimal.Zero, BillingDetail{}, "", fmt.Errorf("additional usage exceeds limit")
	}
	if len(p.Inputs.Additional) == 0 {
		return price(p)
	}
	primary := *p
	primary.Inputs.Additional = nil
	total := decimal.Zero
	detail := BillingDetail{Inputs: p.Inputs, Attempts: p.Attempts + 1}
	hash := ""
	if p.Expression != "" {
		var err error
		total, detail, hash, err = price(&primary)
		if err != nil {
			return decimal.Zero, BillingDetail{}, "", err
		}
	}
	detail.Inputs = p.Inputs
	for _, item := range p.Inputs.Additional {
		if err := core.ValidatePricedUsage(item); err != nil {
			return decimal.Zero, BillingDetail{}, "", err
		}
		if item.Price == nil {
			continue
		}
		part := &pending{Model: item.Model, Tokens: item.Tokens, Metrics: item.Metrics, CreatedAt: p.CreatedAt, Rate: item.RateMultiplier, Expression: item.Price.Expression, PriceID: item.Price.ID, Mode: item.Price.Mode, Attempts: p.Attempts, Inputs: pendingInputs{Semantics: item.UsageSemantics, Params: item.PriceParams, Headers: item.PriceHeaders}}
		amount, sub, exprHash, err := price(part)
		if err != nil {
			return decimal.Zero, BillingDetail{}, "", fmt.Errorf("additional usage %s/%s: %w", item.Kind, item.Model, err)
		}
		if amount.IsNegative() {
			return decimal.Zero, BillingDetail{}, "", fmt.Errorf("negative additional usage charge")
		}
		total = total.Add(amount)
		detail.Cost = detail.Cost.Add(sub.Cost)
		detail.Additional = append(detail.Additional, AdditionalBillingDetail{Kind: item.Kind, Model: item.Model, PriceID: item.Price.ID, ExpressionHash: exprHash, Detail: sub})
	}
	detail.TotalCost = total
	return total, detail, hash, nil
}
