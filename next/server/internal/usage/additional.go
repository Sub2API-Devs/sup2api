package usage

import (
	"context"
	"fmt"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/core"
	"github.com/shopspring/decimal"
)

type AdditionalBillingDetail struct {
	Free           bool          `json:"free,omitempty"`
	BillingReason  string        `json:"billing_reason,omitempty"`
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
	if len(p.Inputs.Additional)+len(p.Inputs.Replacement) > 128 {
		return decimal.Zero, BillingDetail{}, "", fmt.Errorf("additional usage exceeds limit")
	}
	if len(p.Inputs.Additional) == 0 && len(p.Inputs.Replacement) == 0 {
		return price(p)
	}
	primary := *p
	primary.Inputs.Additional = nil
	primary.Inputs.Replacement = nil
	total := decimal.Zero
	detail := BillingDetail{Inputs: p.Inputs, Attempts: p.Attempts + 1}
	hash := ""
	if p.Expression != "" && len(p.Inputs.Replacement) == 0 {
		var err error
		total, detail, hash, err = price(&primary)
		if err != nil {
			return decimal.Zero, BillingDetail{}, "", err
		}
	}
	detail.Inputs = p.Inputs
	items := append(append([]core.PricedUsage(nil), p.Inputs.Replacement...), p.Inputs.Additional...)
	for index, item := range items {
		if err := core.ValidatePricedUsage(item); err != nil {
			return decimal.Zero, BillingDetail{}, "", err
		}
		if item.Price == nil || item.Free {
			d := AdditionalBillingDetail{Kind: item.Kind, Model: item.Model, Free: item.Free, BillingReason: item.BillingReason}
			if item.Price != nil {
				d.PriceID = item.Price.ID
			}
			if index < len(p.Inputs.Replacement) {
				detail.Replacement = append(detail.Replacement, d)
			} else {
				detail.Additional = append(detail.Additional, d)
			}
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
		d := AdditionalBillingDetail{Kind: item.Kind, Model: item.Model, PriceID: item.Price.ID, ExpressionHash: exprHash, Detail: sub, BillingReason: item.BillingReason}
		if index < len(p.Inputs.Replacement) {
			detail.Replacement = append(detail.Replacement, d)
		} else {
			detail.Additional = append(detail.Additional, d)
		}
	}
	detail.TotalCost = total
	return total, detail, hash, nil
}
