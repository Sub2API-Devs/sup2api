package gateway

import (
	"context"
	"errors"
	"log/slog"
	"time"

	pluginv1 "github.com/Sub2API-Devs/sup2api/next/sdk/gen/pluginv1"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/core"
)

var errEmptyRankResponse = errors.New("empty rank response")

const (
	// rankTimeout is the host default for one RankAccounts call (manifest
	// scheduler.rank.timeoutMs = 0); maxRankTimeout caps any declared value.
	// The runtime enforces the same bounds; the gateway keeps its own
	// deadline so a stalling plugin never holds the hot path.
	rankTimeout    = 200 * time.Millisecond
	maxRankTimeout = time.Second

	// Bounds of the rewritten values (CONTRACTS §24.3): out-of-range values
	// are clamped, never a reason to drop the whole answer.
	maxRankPriority = 1000000
	maxRankWeight   = 1000

	// maxRankChanges bounds one plugin's entry in usage_logs.sched_decisions.
	maxRankChanges = 100
)

// rankValues is the priority/weight one candidate account has for this
// request after the scheduler.rank plugins ran. Weight 0 means the account is
// not used for this request.
type rankValues struct{ priority, weight int }

// normWeight is the weight the plugins see and the gateway schedules with:
// weightedOrder counts weight <= 0 as 1, and the documented range is 1-1000.
func normWeight(w int) int {
	switch {
	case w <= 0:
		return 1
	case w > maxRankWeight:
		return maxRankWeight
	}
	return w
}

func clampRank(ctx context.Context, plugin, field string, id int64, v, max int32) int {
	switch {
	case v < 0:
		slog.WarnContext(ctx, "gateway: rank value out of range, clamped", "plugin", plugin,
			"field", field, "account", id, "value", v, "clamped", 0)
		return 0
	case v > max:
		slog.WarnContext(ctx, "gateway: rank value out of range, clamped", "plugin", plugin,
			"field", field, "account", id, "value", v, "clamped", max)
		return int(max)
	}
	return int(v)
}

// rankOverrides returns the priority/weight the scheduler.rank plugins gave
// the candidates of this request (CONTRACTS §24), nil when nothing changed.
//
// The plugins are called once per request, only when the request did not hit
// a sticky binding, and the result is reused by every failover attempt. They
// run serially in binding order, each seeing the values left by the previous
// one. Every failure is fail open: a plugin that times out, errors or answers
// nonsense is skipped, and a run that excluded every candidate is discarded
// entirely, back to the accounts' own priority and weight.
func (c *call) rankOverrides(ctx context.Context, cands []core.AccountRef) map[int64]rankValues {
	if s := c.sticky; s != nil && s.hit {
		return nil // the binding served this request: never call the plugins
	}
	if c.rankDone {
		return c.ranked
	}
	c.rankDone = true

	var rankers []core.AccountRankerBinding
	for _, rb := range c.gen.AccountRankers() {
		if rb.Client != nil && c.matchesRequest(rb.Rank.Match) {
			rankers = append(rankers, rb)
		}
	}
	if len(rankers) == 0 {
		return nil // no cost at all for the requests no plugin asked for
	}

	// The request candidates carry the current values; each plugin rewrites
	// them in place so the next one sees its result.
	list := make([]*pluginv1.RankCandidate, 0, len(cands))
	byID := make(map[int64]*pluginv1.RankCandidate, len(cands))
	for i := range cands {
		a := &cands[i]
		if !c.usable(a) {
			continue // cannot serve this request anyway
		}
		rc := &pluginv1.RankCandidate{AccountId: a.ID, Name: a.Name, AccountType: a.Type, TypePluginKey: a.PluginKey,
			Priority: int32(min(max(a.Priority, 0), maxRankPriority)), Weight: int32(normWeight(a.Weight))}
		list = append(list, rc)
		byID[a.ID] = rc
	}
	if len(list) == 0 {
		return nil
	}

	changedAny := false
	for _, rb := range rankers {
		timeout := rankTimeout
		if rb.Rank.TimeoutMs > 0 {
			timeout = time.Duration(rb.Rank.TimeoutMs) * time.Millisecond
		}
		if timeout > maxRankTimeout {
			timeout = maxRankTimeout
		}
		rctx, cancel := context.WithTimeout(ctx, timeout)
		resp, err := rb.Client.RankAccounts(rctx, &pluginv1.RankAccountsRequest{Meta: c.meta(), Candidates: list})
		cancel()
		if err == nil && resp == nil {
			err = errEmptyRankResponse
		}
		if err != nil {
			// Fail open: keep what the previous plugins left and go on.
			slog.WarnContext(ctx, "gateway: rank accounts failed, keeping the current values",
				"plugin", rb.Plugin.Key, "timeout", timeout, "err", err)
			continue
		}
		var changed []core.RankChange
		for _, ra := range resp.GetAccounts() {
			rc := byID[ra.GetAccountId()]
			if rc == nil {
				slog.WarnContext(ctx, "gateway: rank accounts named an account outside the candidates, ignored",
					"plugin", rb.Plugin.Key, "account", ra.GetAccountId())
				continue
			}
			p := clampRank(ctx, rb.Plugin.Key, "priority", rc.AccountId, ra.GetPriority(), maxRankPriority)
			w := clampRank(ctx, rb.Plugin.Key, "weight", rc.AccountId, ra.GetWeight(), maxRankWeight)
			if int32(p) == rc.Priority && int32(w) == rc.Weight {
				continue // nothing moved: not worth a row in sched_decisions
			}
			rc.Priority, rc.Weight = int32(p), int32(w)
			if len(changed) < maxRankChanges {
				changed = append(changed, core.RankChange{AccountID: rc.AccountId, Priority: p, Weight: w})
			}
		}
		if len(changed) > 0 {
			changedAny = true
			c.rec.SchedDecisions = append(c.rec.SchedDecisions,
				core.SchedDecision{PluginKey: rb.Plugin.Key, Changed: changed})
		}
	}
	if !changedAny {
		return nil
	}

	// A plugin must never leave the gateway without an account.
	used := false
	for _, rc := range list {
		if rc.Weight > 0 {
			used = true
			break
		}
	}
	if !used {
		slog.WarnContext(ctx, "gateway: scheduler.rank excluded every candidate, using the accounts' own priority and weight",
			"candidates", len(list))
		c.rec.SchedDecisions = nil
		return nil
	}

	out := make(map[int64]rankValues, len(list))
	for _, rc := range list {
		out[rc.AccountId] = rankValues{priority: int(rc.Priority), weight: int(rc.Weight)}
	}
	c.ranked = out
	return out
}
