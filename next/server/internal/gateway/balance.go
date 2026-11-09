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
	// byModel: the traffic balance compares the request's model's usage
	// (model limits on and the request names a model).
	byModel bool
	// recorded: the request's sched_decisions entry is written by the first
	// ordering only; entry is its index, -1 until an account changed.
	recorded bool
	entry    int
}

// accountUsage is one account's use and limit of the configured metric, those
// of the model list holding the request's model (0 = none), and the request's
// model's own use on the account (read when balancing by model).
type accountUsage struct{ used, limit, listUsed, listLimit, modelUsed float64 }

// traffic is the usage the traffic balance compares.
func (u accountUsage) traffic(byModel bool) float64 {
	if byModel {
		return u.modelUsed
	}
	return u.used
}

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
	sumW, sumU := sumOf(w), sumOf(used)
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
// when they are off or the request counts tokens. A later pick (failover)
// reuses the read and orders without adding to the sched_decisions entry.
func (c *call) readBalance(ctx context.Context, cands []core.AccountRef) {
	if c.balanceDone {
		if c.balance != nil {
			c.balance.recorded = true
		}
		return
	}
	c.balanceDone = true
	cfg := c.scheduling
	if !cfg.active() || c.tokenCounting() {
		return
	}
	refs := make([]core.AccountRef, 0, len(cands))
	for i := range cands {
		if c.routed(&cands[i]) {
			refs = append(refs, cands[i])
		}
	}
	byModel := cfg.Mode == balanceModeTraffic && cfg.ModelLimits && c.model != ""
	model := ""
	if byModel {
		model = c.model
	}
	usage, err := c.readUsage(ctx, cfg, refs, model)
	if err != nil {
		// Fail open: the request is scheduled by the plugins' values alone.
		slog.WarnContext(ctx, "gateway: read usage for balancing, using the plain weights", "err", err)
		usage = nil
	}
	c.balance = &balanceState{cfg: cfg, usage: usage, byModel: byModel, entry: -1}
}

// readUsage reads the configured metric of refs and, with model limits on, of
// the model list each account has for the request's model (limit load) and,
// when model is not "", of that model itself (traffic balance by model).
func (c *call) readUsage(ctx context.Context, cfg SchedulingSettings, refs []core.AccountRef, model string) (map[int64]accountUsage, error) {
	m := balanceMetricTable[cfg.Metric]
	lists := make([]int, len(refs))
	for i := range refs {
		lists[i] = -1
		if cfg.LimitLoad && cfg.ModelLimits {
			lists[i] = refs[i].ModelLimitIndex(c.model)
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
	var err error
	if m.rate == nil {
		err = c.readSlotUsage(ctx, refs, lists, model, out)
	} else {
		err = c.readRateUsage(ctx, m, refs, lists, model, out)
	}
	if err != nil {
		return nil, err
	}
	return out, nil
}

func (c *call) readRateUsage(ctx context.Context, m balanceMetric, refs []core.AccountRef, lists []int, model string, out map[int64]accountUsage) error {
	lim := c.g.d.Limiter
	if lim == nil {
		return nil
	}
	rates, err := lim.Usage(ctx, refs)
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
	if model == "" {
		return nil
	}
	rates, err = lim.ModelUsage(ctx, refs, model)
	if err != nil {
		return err
	}
	for i := range refs {
		id := refs[i].ID
		u := out[id]
		u.modelUsed = float64(m.rate(rates[id]))
		out[id] = u
	}
	return nil
}

func (c *call) readSlotUsage(ctx context.Context, refs []core.AccountRef, lists []int, model string, out map[int64]accountUsage) error {
	ids := make([]int64, len(refs))
	byList := map[string][]int64{}
	for i := range refs {
		ids[i] = refs[i].ID
		if l := lists[i]; l >= 0 {
			key := core.ModelLimitSlots(refs[i].ModelLimits[l].Key())
			byList[key] = append(byList[key], refs[i].ID)
		}
	}
	if err := c.readSlots(ctx, "account", ids, out, func(u *accountUsage, n float64) { u.used = n }); err != nil {
		return err
	}
	for kind, ids := range byList {
		if err := c.readSlots(ctx, kind, ids, out, func(u *accountUsage, n float64) { u.listUsed = n }); err != nil {
			return err
		}
	}
	if model == "" {
		return nil
	}
	return c.readSlots(ctx, core.ModelSlots(model), ids, out, func(u *accountUsage, n float64) { u.modelUsed = n })
}

// readSlots reads the slots of kind in use by ids into out through set.
func (c *call) readSlots(ctx context.Context, kind string, ids []int64, out map[int64]accountUsage, set func(*accountUsage, float64)) error {
	inUse, err := c.g.d.Slots.InUseMany(ctx, kind, ids)
	if err != nil {
		return err
	}
	for _, id := range ids {
		u := out[id]
		set(&u, float64(inUse[id]))
		out[id] = u
	}
	return nil
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
	for i := range tier {
		a := &tier[i]
		weight := float64(max(a.Weight, 1))
		loads[i] = float64(c.ranked[a.ID].load)
		base[i] = loadedWeight(weight, loads[i])
		if u, ok := b.usageOf(a.ID); ok && b.cfg.LimitLoad {
			loads[i] = max(loads[i], u.load())
		}
		w[i] = loadedWeight(weight, loads[i])
	}
	if b != nil && b.cfg.Mode == balanceModeTraffic {
		b.applyTraffic(tier, w)
	}
	c.recordBalance(tier, base, w, loads)
	return w
}

// usageOf is the read usage of account id; false when nothing was read for it
// (balancing off, failed read, or an account the read did not cover).
func (b *balanceState) usageOf(id int64) (accountUsage, bool) {
	if b == nil {
		return accountUsage{}, false
	}
	u, ok := b.usage[id]
	return u, ok
}

// applyTraffic balances the accounts of the tier the read covered among
// themselves; an account without a reading keeps its weight (fail open).
func (b *balanceState) applyTraffic(tier []core.AccountRef, w []float64) {
	var idx []int
	var known, used []float64
	for i := range tier {
		if u, ok := b.usage[tier[i].ID]; ok {
			idx, known, used = append(idx, i), append(known, w[i]), append(used, u.traffic(b.byModel))
		}
	}
	for k, v := range trafficWeights(known, used) {
		w[idx[k]] = v
	}
}

// recordBalance adds the accounts whose weight, and with it their share of the
// tier, the core balancing changed to the core's entry in usage_logs.sched_decisions: the effective
// weight ×100 (at least 1, as 0 reads as excluded) and the load. Only the
// first pick of a request records (readBalance).
func (c *call) recordBalance(tier []core.AccountRef, base, w, loads []float64) {
	b := c.balance
	if b == nil || b.recorded || c.rec == nil {
		return
	}
	sumBase, sumW := sumOf(base), sumOf(w)
	for i := range tier {
		if w[i] == base[i] || math.Abs(w[i]/sumW-base[i]/sumBase) < 1e-9 {
			continue // untouched, or scaled with the whole tier: same chance
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
			Weight: max(1, int(math.Round(w[i]*100))), Load: int(math.Round(loads[i]))})
	}
}

func sumOf(v []float64) float64 {
	t := 0.0
	for _, x := range v {
		t += x
	}
	return t
}
