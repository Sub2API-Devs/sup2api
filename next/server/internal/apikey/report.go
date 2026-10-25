package apikey

import (
	"context"
	"encoding/json"
	"time"

	"github.com/shopspring/decimal"

	"github.com/Sub2API-Devs/sup2api/next/server/internal/core"
)

// Balances reads a user's balance (the billing service).
type Balances interface {
	Balance(ctx context.Context, userID int64) (decimal.Decimal, error)
}

var _ core.KeyUsageReporter = (*Service)(nil)

// UsageReport is the answer of GET /v1/usage (CONTRACTS §62), shaped like
// sub2api's so clients reading it (CC Switch's usage script) work unchanged.
// Remaining is what the key can still spend: the owner's balance, and no
// more than what is left of the key's quota.
type UsageReport struct {
	// Mode is quota_limited when the key has a quota or a cap, else unrestricted.
	Mode       string       `json:"mode"`
	IsValid    bool         `json:"isValid"`
	Status     string       `json:"status"`
	PlanName   string       `json:"planName"`
	Remaining  json.Number  `json:"remaining"`
	Unit       string       `json:"unit"`
	Balance    json.Number  `json:"balance"`
	Quota      *QuotaReport `json:"quota,omitempty"`
	RateLimits []RateReport `json:"rate_limits,omitempty"`
	ExpiresAt  *time.Time   `json:"expires_at,omitempty"`
	Usage      struct {
		Today UsageTotals `json:"today"`
		Total UsageTotals `json:"total"`
	} `json:"usage"`
}

type QuotaReport struct {
	Limit     json.Number `json:"limit"`
	Used      json.Number `json:"used"`
	Remaining json.Number `json:"remaining"`
	Unit      string      `json:"unit"`
}

// RateReport is one capped limit: requests or tokens of the current minute,
// or requests in flight (window "now").
type RateReport struct {
	Type      string `json:"type"`
	Window    string `json:"window"`
	Limit     int64  `json:"limit"`
	Used      int64  `json:"used"`
	Remaining int64  `json:"remaining"`
}

// UsageTotals counts the key's requests; cost is what they were charged.
type UsageTotals struct {
	Requests            int64       `json:"requests"`
	InputTokens         int64       `json:"input_tokens"`
	OutputTokens        int64       `json:"output_tokens"`
	CacheCreationTokens int64       `json:"cache_creation_tokens"`
	CacheReadTokens     int64       `json:"cache_read_tokens"`
	TotalTokens         int64       `json:"total_tokens"`
	Cost                json.Number `json:"cost"`
}

func number(d decimal.Decimal) json.Number { return json.Number(d.String()) }

// KeyUsage reports on the authenticated key p (today is the UTC day).
func (s *Service) KeyUsage(ctx context.Context, p *core.APIKeyPrincipal) (any, error) {
	k, err := s.loadKey(ctx, p.KeyID, p.UserID)
	if err != nil {
		return nil, err
	}
	balance := decimal.Zero
	if s.Balances != nil {
		if balance, err = s.Balances.Balance(ctx, p.UserID); err != nil {
			return nil, err
		}
	}
	r := &UsageReport{Mode: "unrestricted", Status: k.Status, PlanName: k.GroupName, Unit: "USD", Balance: number(balance), ExpiresAt: k.ExpiresAt,
		IsValid: k.Status == "active" && (k.ExpiresAt == nil || k.ExpiresAt.After(time.Now()))}
	remaining := decimal.Max(balance, decimal.Zero)
	if k.Limit.IsPositive() {
		left := decimal.Max(k.Limit.Sub(k.Used), decimal.Zero)
		remaining = decimal.Min(remaining, left)
		r.Quota = &QuotaReport{Limit: number(k.Limit), Used: number(k.Used), Remaining: number(left), Unit: "USD"}
	}
	r.Remaining = number(remaining)
	r.RateLimits = rateReports(k)
	if r.Quota != nil || len(r.RateLimits) > 0 {
		r.Mode = "quota_limited"
	}
	if err := s.usageTotals(ctx, k.ID, r); err != nil {
		return nil, err
	}
	return r, nil
}

func rateReports(k *APIKey) []RateReport {
	var live KeyLive
	if k.Live != nil {
		live = *k.Live
	}
	var out []RateReport
	for _, c := range []struct {
		kind, window string
		limit, used  int64
	}{{"rpm", "1m", int64(k.RPM), live.RPM}, {"tpm", "1m", k.TPM, live.TPM}, {"concurrency", "now", int64(k.Concurrency), int64(live.Concurrency)}} {
		if c.limit > 0 {
			out = append(out, RateReport{Type: c.kind, Window: c.window, Limit: c.limit, Used: c.used, Remaining: max(c.limit-c.used, 0)})
		}
	}
	return out
}

// usageTotals sums the key's usage records today and in total; the cost is
// what the quota counts (apikey_quota_charge, migration 0059).
func (s *Service) usageTotals(ctx context.Context, keyID int64, r *UsageReport) error {
	today := time.Now().UTC().Truncate(24 * time.Hour)
	var cost [2]decimal.Decimal
	t, a := &r.Usage.Today, &r.Usage.Total
	err := s.db.Pool.QueryRow(ctx, `SELECT
			count(*) FILTER (WHERE created_at >= $2), count(*),
			COALESCE(sum(input_tokens) FILTER (WHERE created_at >= $2), 0), COALESCE(sum(input_tokens), 0),
			COALESCE(sum(output_tokens) FILTER (WHERE created_at >= $2), 0), COALESCE(sum(output_tokens), 0),
			COALESCE(sum(cache_creation_tokens + cache_creation_1h_tokens) FILTER (WHERE created_at >= $2), 0),
			COALESCE(sum(cache_creation_tokens + cache_creation_1h_tokens), 0),
			COALESCE(sum(cache_read_tokens) FILTER (WHERE created_at >= $2), 0), COALESCE(sum(cache_read_tokens), 0),
			COALESCE(sum(apikey_quota_charge(billing_status, total_cost)) FILTER (WHERE created_at >= $2), 0),
			COALESCE(sum(apikey_quota_charge(billing_status, total_cost)), 0)
		FROM usage_logs WHERE api_key_id = $1`, keyID, today).Scan(
		&t.Requests, &a.Requests, &t.InputTokens, &a.InputTokens, &t.OutputTokens, &a.OutputTokens,
		&t.CacheCreationTokens, &a.CacheCreationTokens, &t.CacheReadTokens, &a.CacheReadTokens, &cost[0], &cost[1])
	if err != nil {
		return err
	}
	for i, u := range []*UsageTotals{t, a} {
		u.TotalTokens = u.InputTokens + u.OutputTokens + u.CacheCreationTokens + u.CacheReadTokens
		u.Cost = number(cost[i])
	}
	return nil
}
