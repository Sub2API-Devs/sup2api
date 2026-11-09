package gateway

import (
	"context"
	"log/slog"
	"math"
	"slices"

	"github.com/Sub2API-Devs/sup2api/next/server/internal/core"
)

// trafficSmoothing keeps an idle account's weight finite in the traffic
// balance: w ÷ (r + trafficSmoothing)², with r its usage over its weight's
// share of the tier (CONTRACTS §89). With weights 1:1 an RPM of 40 to 0 sends
// 98.8% of the new sessions to the idle account, 100 to 90 sends 54% to the
// lighter one, and usage already in the weight ratio keeps the weight ratio.
const trafficSmoothing = 0.25

// minLoadedWeight is the share a fully loaded account keeps: a load lowers an
// account's chance and never takes it out (CONTRACTS §67: max(1, w×(100−load))
// over the ×100 scale).
const minLoadedWeight = 0.01

// balanceMetric reads one metric of the scheduling settings: the account's
// and its model list's limits and, for the rate metrics, the usage the
// limiter reports. rate is nil for concurrency, read from the slots.
type balanceMetric struct {
	limit     func(*core.AccountRef) float64
	listLimit func(*core.ModelLimit) float64
	rate      func(core.RateUsage) int64
	listRate  func(core.ModelRateUsage) int64
}

var balanceMetricTable = map[string]balanceMetric{
	balanceMetricRPM: {
		limit:     func(a *core.AccountRef) float64 { return float64(a.RPMLimit) },
		listLimit: func(l *core.ModelLimit) float64 { return float64(l.RPMLimit) },
		rate:      func(u core.RateUsage) int64 { return u.RPM },
		listRate:  func(u core.ModelRateUsage) int64 { return u.RPM },
	},
	balanceMetricTPM: {
		limit:     func(a *core.AccountRef) float64 { return float64(a.TPMLimit) },
		listLimit: func(l *core.ModelLimit) float64 { return float64(l.TPMLimit) },
		rate:      func(u core.RateUsage) int64 { return u.TPM },
		listRate:  func(u core.ModelRateUsage) int64 { return u.TPM },
	},
	balanceMetricConcurrency: {
		limit:     func(a *core.AccountRef) float64 { return float64(a.MaxConcurrency) },
		listLimit: func(l *core.ModelLimit) float64 { return float64(l.MaxConcurrency) },
	},
}

// balanceState is what the core balancing read for one request: the settings
// and each candidate's usage. A failed read leaves usage nil, which balances
// by the plugins' values alone.
type balanceState struct {
	cfg   SchedulingSettings
	usage map[int64]accountUsage
	// recorded: the request's sched_decisions entry is written by the first
	// ordering only; entry is its index, -1 until an account changed.
	recorded bool
	entry    int
}

// accountUsage is one account's use and limit of the configured metric, and
// those of the model list holding the request's model (0 = none).
type accountUsage struct{ used, limit, listUsed, listLimit float64 }

// load is the account's use of its limits in percent, the higher of the
// account's own and its model list's; a limit of 0 adds nothing.
func (u accountUsage) load() float64 {
	return max(percentOf(u.used, u.limit), percentOf(u.listUsed, u.listLimit))
}

func percentOf(used, limit float64) float64 {
	if limit <= 0 {
		return 0
	}
	return min(100, used/limit*100)
}

// loadedWeight applies a load (0-100) to a weight (CONTRACTS §67).
func loadedWeight(w, load float64) float64 {
	if load <= 0 {
		return w
	}
	return max(minLoadedWeight, w*(100-load)/100)
}

// trafficWeights divides each weight by the square of its account's usage
// over the share its weight gives it of the tier's usage (plus
// trafficSmoothing). An idle tier keeps the weights.
func trafficWeights(w, used []float64) []float64 {
	var sumW, sumU float64
	for i := range w {
		sumW, sumU = sumW+w[i], sumU+used[i]
	}
	out := slices.Clone(w)
	if sumU <= 0 || sumW <= 0 {
		return out
	}
	for i := range out {
		r := used[i] / (sumU * w[i] / sumW)
		out[i] /= (r + trafficSmoothing) * (r + trafficSmoothing)
	}
	return out
}

// readBalance reads, once per request and at the first pick the binding does
// not serve, the usage the scheduling settings balance on. Nothing is read
// when they are off or the request counts tokens.
func (c *call) readBalance(ctx context.Context, cands []core.AccountRef) {
	if c.balanceDone {
		return
	}
	c.balanceDone = true
	cfg := c.scheduling.normalized()
	if !cfg.active() || c.tokenCounting() {
		return
	}
	refs := make([]core.AccountRef, 0, len(cands))
	for i := range cands {
		if c.routed(&cands[i]) {
			refs = append(refs, cands[i])
		}
	}
	usage, err := c.readUsage(ctx, cfg, refs)
	if err != nil {
		// Fail open: the request is scheduled by the plugins' values alone.
		slog.WarnContext(ctx, "gateway: read usage for balancing, using the plain weights", "err", err)
		usage = nil
	}
	c.balance = &balanceState{cfg: cfg, usage: usage, entry: -1}
}

// readUsage reads the configured metric of refs and, with model limits on,
// of the model list each account has for the request's model.
func (c *call) readUsage(ctx context.Context, cfg SchedulingSettings, refs []core.AccountRef) (map[int64]accountUsage, error) {
	m := balanceMetricTable[cfg.Metric]
	lists := make([]int, len(refs))
	for i := range refs {
		lists[i] = -1
		if cfg.LimitLoad && cfg.ModelLimits {
			lists[i] = modelListIndex(&refs[i], c.model)
		}
	}
	out := make(map[int64]accountUsage, len(refs))
	for i := range refs {
		u := accountUsage{limit: m.limit(&refs[i])}
		if l := lists[i]; l >= 0 {
			u.listLimit = m.listLimit(&refs[i].ModelLimits[l])
		}
		out[refs[i].ID] = u
	}
	if m.rate == nil {
		return out, c.readSlotUsage(ctx, refs, lists, out)
	}
	return out, c.readRateUsage(ctx, m, refs, lists, out)
}

func (c *call) readRateUsage(ctx context.Context, m balanceMetric, refs []core.AccountRef, lists []int, out map[int64]accountUsage) error {
	if c.g.d.Limiter == nil {
		return nil
	}
	rates, err := c.g.d.Limiter.Usage(ctx, refs)
	if err != nil {
		return err
	}
	for i := range refs {
		r, u := rates[refs[i].ID], out[refs[i].ID]
		u.used = float64(m.rate(r))
		if l := lists[i]; l >= 0 && l < len(r.Models) {
			u.listUsed = float64(m.listRate(r.Models[l]))
		}
		out[refs[i].ID] = u
	}
	return nil
}

func (c *call) readSlotUsage(ctx context.Context, refs []core.AccountRef, lists []int, out map[int64]accountUsage) error {
	ids := make([]int64, len(refs))
	byList := map[string][]int64{}
	for i := range refs {
		ids[i] = refs[i].ID
		if l := lists[i]; l >= 0 {
			key := core.ModelLimitSlots(refs[i].ModelLimits[l].Key())
			byList[key] = append(byList[key], refs[i].ID)
		}
	}
	inUse, err := c.g.d.Slots.InUseMany(ctx, "account", ids)
	if err != nil {
		return err
	}
	for id, n := range inUse {
		u := out[id]
		u.used = float64(n)
		out[id] = u
	}
	for kind, ids := range byList {
		inUse, err := c.g.d.Slots.InUseMany(ctx, kind, ids)
		if err != nil {
			return err
		}
		for id, n := range inUse {
			u := out[id]
			u.listUsed = float64(n)
			out[id] = u
		}
	}
	return nil
}

// modelListIndex is the index of the account's model list holding model, or -1.
func modelListIndex(a *core.AccountRef, model string) int {
	if model == "" {
		return -1
	}
	return slices.IndexFunc(a.ModelLimits, func(l core.ModelLimit) bool { return slices.Contains(l.Models, model) })
}

// tierWeights are the weights one (priority, grade) tier is drawn with: the
// scheduler.rank plugins' weight with the higher of their load and the core's
// limit load applied, then the traffic balance (CONTRACTS §67, §89). Without
// loads and with the settings off they are the accounts' weights.
func (c *call) tierWeights(tier []core.AccountRef) []float64 {
	b := c.balance
	base := make([]float64, len(tier)) // with the plugins' load only
	w := make([]float64, len(tier))
	loads := make([]float64, len(tier))
	used := make([]float64, len(tier))
	for i := range tier {
		a := &tier[i]
		weight := float64(max(a.Weight, 1))
		loads[i] = float64(c.ranked[a.ID].load)
		base[i] = loadedWeight(weight, loads[i])
		if b != nil {
			u := b.usage[a.ID]
			used[i] = u.used
			if b.cfg.LimitLoad {
				loads[i] = max(loads[i], u.load())
			}
		}
		w[i] = loadedWeight(weight, loads[i])
	}
	if b != nil && b.cfg.Mode == balanceModeTraffic {
		w = trafficWeights(w, used)
	}
	c.recordBalance(tier, base, w, loads)
	return w
}

// recordBalance adds the accounts whose weight the core balancing changed to
// the core's entry in usage_logs.sched_decisions: the effective weight ×100
// and the load. Only the first ordering of a request records (sealRecord).
func (c *call) recordBalance(tier []core.AccountRef, base, w, loads []float64) {
	b := c.balance
	if b == nil || b.recorded || c.rec == nil {
		return
	}
	for i := range tier {
		if w[i] == base[i] {
			continue
		}
		if b.entry < 0 {
			c.rec.SchedDecisions = append(c.rec.SchedDecisions, core.SchedDecision{PluginKey: "core"})
			b.entry = len(c.rec.SchedDecisions) - 1
		}
		d := &c.rec.SchedDecisions[b.entry]
		if len(d.Changed) == maxRankChanges {
			return
		}
		d.Changed = append(d.Changed, core.RankChange{AccountID: tier[i].ID, Priority: tier[i].Priority,
			Weight: int(math.Round(w[i] * 100)), Load: int(math.Round(loads[i]))})
	}
}

// sealRecord ends the recording after the first ordering: failover orders
// the remaining accounts again without adding to the entry.
func (b *balanceState) sealRecord() {
	if b != nil {
		b.recorded = true
	}
}
