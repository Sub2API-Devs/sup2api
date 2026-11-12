package gateway

import (
	"context"
	"log/slog"
	"math"
	"slices"

	"golang.org/x/sync/errgroup"

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
	balanceMetricSessions: {
		limit:     func(a *core.AccountRef) float64 { return float64(a.SPMLimit) },
		listLimit: func(l *core.ModelLimit) float64 { return float64(l.SPMLimit) },
		rate:      func(u core.RateUsage) int64 { return u.Sessions },
		listRate:  func(u core.ModelRateUsage) int64 { return u.Sessions },
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
// reuses the read.
func (c *call) readBalance(ctx context.Context, cands []core.AccountRef) {
	if c.balanceDone {
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
	trafficModel := ""
	if byModel {
		trafficModel = c.model
	}
	usage, err := c.readUsage(ctx, cfg, refs, trafficModel)
	if err != nil {
		// Fail open: the request is scheduled by the plugins' values alone.
		slog.WarnContext(ctx, "gateway: read usage for balancing, using the plain weights", "err", err)
	}
	c.balance = &balanceState{cfg: cfg, usage: usage, byModel: byModel, entry: -1}
}

// usageQuery is what readUsage asks of the limiter or the slots: the metric
// of refs, the account's own use when account is set, that of the model list
// lists[i] (-1 = none) and, when trafficModel is not "", that model's own use.
type usageQuery struct {
	metric       balanceMetric
	refs         []core.AccountRef
	lists        []int
	account      bool
	trafficModel string
}

// readUsage reads what the settings balance on: the account's own use (limit
// load, or the traffic balance by account), with model limits on that of the
// model list each account has for the request's model (limit load) and, when
// trafficModel is not "", that model's own use (traffic balance by model).
func (c *call) readUsage(ctx context.Context, cfg SchedulingSettings, refs []core.AccountRef, trafficModel string) (map[int64]accountUsage, error) {
	metric, ok := balanceMetricTable[cfg.Metric]
	if !ok { // settings are normalized; a stray value must not take the request down
		metric = balanceMetricTable[balanceMetricRPM]
	}
	q := usageQuery{metric: metric, refs: refs, lists: make([]int, len(refs)),
		account: cfg.LimitLoad || trafficModel == "", trafficModel: trafficModel}
	out := make(map[int64]accountUsage, len(refs))
	for i := range refs {
		q.lists[i] = -1
		if cfg.LimitLoad && cfg.ModelLimits {
			q.lists[i] = refs[i].ModelLimitIndex(c.model)
		}
		u := accountUsage{limit: q.metric.limit(&refs[i])}
		if l := q.lists[i]; l >= 0 {
			u.listLimit = q.metric.listLimit(&refs[i].ModelLimits[l])
		}
		out[refs[i].ID] = u
	}
	read := c.readRateUsage
	if q.metric.rate == nil {
		read = c.readSlotUsage
	}
	if err := read(ctx, q, out); err != nil {
		return nil, err
	}
	return out, nil
}

func (c *call) readRateUsage(ctx context.Context, q usageQuery, out map[int64]accountUsage) error {
	lim := c.g.d.Limiter
	if lim == nil {
		return nil
	}
	if q.account {
		// Only the model list that counts is read: Models[0] when there is one.
		refs := make([]core.AccountRef, len(q.refs))
		for i, r := range q.refs {
			r.ModelLimits = nil
			if l := q.lists[i]; l >= 0 {
				r.ModelLimits = q.refs[i].ModelLimits[l : l+1]
			}
			refs[i] = r
		}
		rates, err := lim.Usage(ctx, refs)
		if err != nil {
			return err
		}
		for i := range refs {
			r, u := rates[refs[i].ID], out[refs[i].ID]
			u.used = float64(q.metric.rate(r))
			if q.lists[i] >= 0 && len(r.Models) > 0 {
				u.listUsed = float64(q.metric.listRate(r.Models[0]))
			}
			out[refs[i].ID] = u
		}
	}
	if q.trafficModel == "" {
		return nil
	}
	rates, err := lim.ModelUsage(ctx, q.refs, q.trafficModel)
	if err != nil {
		return err
	}
	for i := range q.refs {
		id := q.refs[i].ID
		u := out[id]
		u.modelUsed = float64(q.metric.rate(rates[id]))
		out[id] = u
	}
	return nil
}

// slotRead is one Slots.InUseMany read of readSlotUsage and where it goes.
type slotRead struct {
	kind string
	ids  []int64
	set  func(*accountUsage, float64)
}

// readSlotUsage reads the slots in use of the accounts, of their model lists
// and of the traffic model, all at once.
func (c *call) readSlotUsage(ctx context.Context, q usageQuery, out map[int64]accountUsage) error {
	ids := make([]int64, len(q.refs))
	byList := map[string][]int64{}
	for i := range q.refs {
		ids[i] = q.refs[i].ID
		if l := q.lists[i]; l >= 0 {
			key := core.ModelLimitSlots(q.refs[i].ModelLimits[l].Key())
			byList[key] = append(byList[key], q.refs[i].ID)
		}
	}
	var reads []slotRead
	if q.account {
		reads = append(reads, slotRead{"account", ids, func(u *accountUsage, n float64) { u.used = n }})
	}
	for kind, ids := range byList {
		reads = append(reads, slotRead{kind, ids, func(u *accountUsage, n float64) { u.listUsed = n }})
	}
	if q.trafficModel != "" {
		reads = append(reads, slotRead{core.ModelSlots(q.trafficModel), ids, func(u *accountUsage, n float64) { u.modelUsed = n }})
	}
	inUse := make([]map[int64]int, len(reads))
	g, gctx := errgroup.WithContext(ctx)
	for i, r := range reads {
		g.Go(func() (err error) {
			inUse[i], err = c.g.d.Slots.InUseMany(gctx, r.kind, r.ids)
			return err
		})
	}
	if err := g.Wait(); err != nil {
		return err
	}
	for i, r := range reads {
		for _, id := range r.ids {
			u := out[id]
			r.set(&u, float64(inUse[i][id]))
			out[id] = u
		}
	}
	return nil
}

// tierWeights are the weights one (priority, grade) tier is drawn with: the
// scheduler.rank plugins' weight with the higher of their load and the core's
// limit load applied, then the traffic balance (CONTRACTS §67, §89). Without
// loads and with the settings off they are the accounts' weights.
func (c *call) tierWeights(tier []core.AccountRef) []float64 {
	b := c.balance
	if b == nil && c.ranked == nil {
		w := make([]float64, len(tier))
		for i := range tier {
			w[i] = float64(max(tier[i].Weight, 1))
		}
		return w
	}
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

// recordBalance records, in the core's usage_logs.sched_decisions entry, each
// account whose weight the core changed and whose share of the tier changed
// with it: the effective weight ×100 (at least 1, as 0 reads as excluded) and
// the load. Only the first ordering of a request records (orderPool).
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
