package gateway

import (
	"context"
	"log/slog"
	"strings"
	"time"

	"github.com/Sub2API-Devs/sup2api/next/server/internal/core"
)

// Retry pace of a queueing request, as in the old gateway: frequent at first,
// never in step with the others.
const (
	queueInitialBackoff = 100 * time.Millisecond
	queueBackoffFactor  = 1.5
	queueMaxBackoff     = 2 * time.Second
)

// queueable says whether this request may wait for an account. A WebSocket
// turn holds up its connection's loop and a free endpoint (count_tokens) is
// not worth waiting for; a draining node gives way.
func (c *call) queueable() bool {
	return !c.ep.WebSocket() && !strings.EqualFold(c.ep.Billing, "free") && !c.g.draining()
}

// nextQueueBackoff grows the wait by half with ±20 % jitter, within bounds.
func (c *call) nextQueueBackoff(current time.Duration) time.Duration {
	next := min(time.Duration(float64(current)*queueBackoffFactor), queueMaxBackoff)
	jittered := time.Duration(float64(next) * (0.8 + c.g.randFloat()*0.4))
	return max(min(jittered, queueMaxBackoff), queueInitialBackoff)
}

// waitForAccount queues for ref's slot while the queue has room and until
// timeout (docs/GATEWAY-CONCURRENCY-DESIGN.md §3). A request in the queue holds
// a slot of kind AccountWaitSlots, so the count survives neither its release
// nor its node's death.
func (c *call) waitForAccount(ctx context.Context, ref *core.AccountRef, maxWaiting int, timeout time.Duration) (func(), bool) {
	if maxWaiting <= 0 || timeout <= 0 || c.queueWaited || !c.queueable() {
		return nil, false
	}
	_, leave, ok, err := core.AcquireSlot(ctx, c.g.d.Slots, core.AccountWaitSlots, ref.ID, maxWaiting, c.rid)
	if err != nil {
		slog.WarnContext(ctx, "gateway: join account queue", "account", ref.ID, "err", err)
		return nil, false
	}
	if !ok {
		return nil, false
	}
	defer leave()
	started := c.g.now()
	expired := time.NewTimer(timeout)
	defer expired.Stop()
	backoff := queueInitialBackoff
	retry := time.NewTimer(backoff)
	defer retry.Stop()
	for {
		select {
		case <-ctx.Done():
			return nil, false
		case <-expired.C:
			c.queueWaited = true
			return nil, false
		case <-retry.C:
		}
		if c.g.draining() {
			return nil, false
		}
		if release, ok := c.acquireAccount(ctx, ref); ok {
			// It may have started cooling down during the wait.
			if cooling, err := c.g.d.Accounts.IsCoolingDown(ctx, ref.ID); err == nil && cooling {
				release()
				return nil, false
			}
			slog.InfoContext(ctx, "gateway: queued for account", "request_id", c.rid, "account", ref.ID, "waited_ms", c.g.now().Sub(started).Milliseconds())
			return release, true
		}
		backoff = c.nextQueueBackoff(backoff)
		retry.Reset(backoff)
	}
}

// queueTarget chooses the account to queue for when every candidate in pool
// (ordered, all full) is: the least loaded of the first priority tier. Load is
// in use plus waiting over the account's cap.
func (c *call) queueTarget(ctx context.Context, pool []core.AccountRef, reserve map[int64]bool) *core.AccountRef {
	if len(pool) == 0 || c.gw.QueueFallbackMaxWaiting <= 0 || c.gw.QueueFallbackWaitSecond <= 0 || c.queueWaited || !c.queueable() {
		return nil
	}
	var tier []core.AccountRef
	for i := range pool {
		if pool[i].Priority == pool[0].Priority && !reserve[pool[i].ID] {
			tier = append(tier, pool[i])
		}
	}
	if len(tier) == 0 {
		tier = pool[:1]
	}
	ids := make([]int64, len(tier))
	for i := range tier {
		ids[i] = tier[i].ID
	}
	best := tier[0]
	inUse, err := c.g.d.Slots.InUseMany(ctx, "account", ids)
	if err != nil {
		return &best
	}
	waiting, err := c.g.d.Slots.InUseMany(ctx, core.AccountWaitSlots, ids)
	if err != nil {
		return &best
	}
	load := func(r *core.AccountRef) float64 {
		// An uncapped account here is full because of its model list.
		return float64(inUse[r.ID]+waiting[r.ID]) / float64(max(r.MaxConcurrency, 1))
	}
	lowest := load(&tier[0])
	for i := 1; i < len(tier); i++ {
		if l := load(&tier[i]); l < lowest {
			best, lowest = tier[i], l
		}
	}
	return &best
}
