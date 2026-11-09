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

	// maxRankLoad is the maximum load percentage a plugin may return (CONTRACTS §67).
	maxRankLoad = 100
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
// The plugins are called once per request, at the first pick the sticky
// binding does not serve (including the failover after a failed bound
// attempt), and the result is reused by every later failover attempt. They
// run serially in binding order, each seeing the values left by the previous
// one. Every failure is fail open: a plugin that times out, errors or answers
// nonsense is skipped, and a run that excluded every candidate is discarded
// entirely, back to the accounts' own priority and weight.
func (c *call) rankOverrides(ctx context.Context, cands []core.AccountRef) map[int64]rankValues {
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
	loads := map[int64]int{}
	for i := range cands {
		a := &cands[i]
		if !c.routed(a) {
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
	ids := make([]int64, len(list))
	for i, rc := range list {
		ids[i] = rc.AccountId
	}
	quota := c.readQuota(ctx, ids, c.g.availabilitySnapshotBudget())
	for _, rc := range list {
		rc.Quota = quota.snapshots[rc.AccountId]
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
			// The plugin's returned weight is the baseline and the next plugin
			// sees it; the load is applied once all have answered (CONTRACTS §67).
			load := clampRank(ctx, rb.Plugin.Key, "load", rc.AccountId, ra.GetLoad(), maxRankLoad)
			if load > loads[rc.AccountId] {
				loads[rc.AccountId] = load
			}
			if int32(p) == rc.Priority && int32(w) == rc.Weight && load == 0 {
				continue // nothing moved: not worth a row in sched_decisions
			}
			rc.Priority, rc.Weight = int32(p), int32(w)
			if len(changed) < maxRankChanges {
				changed = append(changed, core.RankChange{AccountID: rc.AccountId, Priority: p, Weight: w, Load: load})
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
		weight := int(rc.Weight)
		// Scaled by 100 for every candidate, so a default weight of 1 still
		// divides in proportion to the load. A load lowers an account's chance
		// and never takes it out; a plugin's weight 0 does that.
		if len(loads) > 0 && weight > 0 {
			weight = max(1, weight*(maxRankLoad-loads[rc.AccountId]))
		}
		out[rc.AccountId] = rankValues{priority: int(rc.Priority), weight: weight}
	}
	c.ranked = out
	return out
}
