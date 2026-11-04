package ccgateway

import (
	"context"
	"math"

	pluginv1 "github.com/Sub2API-Devs/sup2api/next/sdk/gen/pluginv1"
)

// RankAccounts lowers the chance of accounts that used much of their weekly
// quota: new sessions and account switches go to the ones with the most left. A
// session's bound account is not ranked. It only lowers a chance; the
// availability check and the 429 handling deal with a quota that is used up
// (docs/audits/2026-11-04-sticky-load-tier.md §5).
func (p *Plugin) RankAccounts(_ context.Context, in *pluginv1.RankAccountsRequest) (*pluginv1.RankAccountsResponse, error) {
	resp := &pluginv1.RankAccountsResponse{}
	now := p.now().Unix()
	model := in.GetMeta().GetModel()
	for _, c := range in.GetCandidates() {
		if c.GetTypePluginKey() != pluginKey || c.GetWeight() <= 0 {
			continue
		}
		if load := weeklyLoad(c.GetQuota(), model, now); load > 0 {
			resp.Accounts = append(resp.Accounts, &pluginv1.RankedAccount{AccountId: c.GetAccountId(),
				Priority: c.GetPriority(), Weight: c.GetWeight(), Load: load})
		}
	}
	return resp, nil
}

// weeklyLoad is the used share of the weekly window that limits model: the
// Fable window for a Fable model, falling back to the shared one when it is not
// known, and the shared one for every other model. No window known is no load.
func weeklyLoad(quota *pluginv1.AccountQuotaSnapshot, model string, now int64) int32 {
	if quotaApplies(quota7dFable, model) {
		if load, ok := windowLoad(quota, quota7dFable, now); ok {
			return load
		}
	}
	load, _ := windowLoad(quota, quota7d, now)
	return load
}

// windowLoad is a window's used percent, unknown when it is missing or its
// reset has passed.
func windowLoad(quota *pluginv1.AccountQuotaSnapshot, key string, now int64) (int32, bool) {
	for _, w := range quota.GetWindows() {
		if w.GetKey() != key {
			continue
		}
		if reset := w.GetResetsAtUnix(); reset > 0 && reset <= now {
			return 0, false
		}
		return int32(math.Round(min(max(w.GetUtilization(), 0), 100))), true
	}
	return 0, false
}
