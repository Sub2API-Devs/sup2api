package guard

import (
	"context"
	"strconv"
	"sync"
	"time"

	"google.golang.org/grpc/codes"
	"google.golang.org/grpc/status"

	"github.com/Sub2API-Devs/sup2api/next/sdk/pluginsdk"
)

// Webhook alert throttling: per rule, at most one alert every
// alert_cooldown_sec seconds across the whole cluster.
//
// The cluster-wide part is a lock per rule (host permission "lock", optional)
// taken with ttl = cooldown and never released: while it is held - by
// whichever node sent the last alert - nobody sends, and when it lapses the
// next alert may go out. The lock is the cooldown window, the same use as the
// core's job slot locks. Locks are not fenced, so a stalled node can overlap
// a window now and then; for alerts that only means an extra message.
//
// The ttl of a lock is bounded by pluginsdk.MaxLockTTL (5 minutes), hence
// maxAlertCooldownSec. Longer windows would need the holder to keep renewing
// the lock for hours (lost on every restart or upgrade, so not a real bound)
// or state outside the lock; a 5 minute ceiling is enough for alerts.
//
// Without the lock (permission not granted, Redis down, outcome unknown) each
// node throttles on its own with lastSent: up to one alert per node per
// window, never fewer than one per window - we would rather send twice than
// miss one. lastSent is also consulted first in cluster mode: a node that
// took the lock knows nobody may send until its window ends, which keeps the
// hook from queueing (and the sender from asking the host about) alerts that
// cannot go out.

const (
	defaultAlertCooldownSec = 60
	maxAlertCooldownSec     = int(pluginsdk.MaxLockTTL / time.Second)
	// alertLockTimeout bounds one TryAcquire; on timeout the outcome is
	// unknown and the node falls back to its own cooldown.
	alertLockTimeout = 2 * time.Second
	// lastSentPrune: past this many entries, forget windows that are over.
	lastSentPrune = 1024
)

// Lock-state values for alertThrottle.state (logged on change only).
const (
	throttleCluster     = "cluster"
	throttleDenied      = "permission_denied"
	throttleUnavailable = "unavailable"
)

// alertLockName is the lock that holds a rule's cooldown window.
func alertLockName(ruleID int64) string { return "alert:rule:" + strconv.FormatInt(ruleID, 10) }

// alertThrottle is the node-local half of the throttling.
type alertThrottle struct {
	mu       sync.Mutex
	lastSent map[int64]time.Time // rule id -> start of this node's current window
	// state is only touched by the alertSender goroutine.
	state string
}

// cooling reports whether rule is inside a window this node knows about.
// Called from the hook, so it must stay cheap (no RPC).
func (t *alertThrottle) cooling(ruleID int64, now time.Time, cooldown time.Duration) bool {
	t.mu.Lock()
	defer t.mu.Unlock()
	last, ok := t.lastSent[ruleID]
	return ok && now.Sub(last) < cooldown
}

// mark starts a window for rule at now.
func (t *alertThrottle) mark(ruleID int64, now time.Time) {
	t.mu.Lock()
	defer t.mu.Unlock()
	if t.lastSent == nil {
		t.lastSent = map[int64]time.Time{}
	}
	if len(t.lastSent) >= lastSentPrune {
		for id, last := range t.lastSent {
			if now.Sub(last) >= time.Duration(maxAlertCooldownSec)*time.Second {
				delete(t.lastSent, id)
			}
		}
	}
	t.lastSent[ruleID] = now
}

// claimAlert decides whether the alert for ruleID may be sent now (cooldown >
// 0). Runs in alertSender, never in the hook: it may call the host.
func (p *Plugin) claimAlert(ctx context.Context, ruleID int64, cooldown time.Duration) bool {
	now := p.now()
	if p.throttle.cooling(ruleID, now, cooldown) {
		return false
	}
	lctx, cancel := context.WithTimeout(ctx, alertLockTimeout)
	// The lock is deliberately not released: it expires after cooldown, and
	// that is the window.
	_, ok, err := p.host.Locks().TryAcquire(lctx, alertLockName(ruleID), cooldown)
	cancel()
	p.setThrottleState(err)
	if err == nil && !ok {
		return false // another node sent within the window
	}
	// Taken, or no answer we can trust: in the latter case this node's own
	// cooldown (checked above) decides.
	p.throttle.mark(ruleID, now)
	return true
}

// setThrottleState logs when throttling switches between cluster-wide and
// per-node, once per change.
func (p *Plugin) setThrottleState(err error) {
	state := throttleCluster
	switch {
	case err == nil:
	case status.Code(err) == codes.PermissionDenied:
		state = throttleDenied
	default:
		state = throttleUnavailable
	}
	prev := p.throttle.state
	if prev == "" {
		prev = throttleCluster
	}
	if state == prev {
		return
	}
	p.throttle.state = state
	switch state {
	case throttleCluster:
		p.log.Info("guard: webhook alert throttling is cluster-wide again")
	case throttleDenied:
		p.log.Warn("guard: webhook alerts are throttled per node: the optional \"lock\" permission is not granted; each node may send one alert per rule per cooldown")
	default:
		p.log.Warn("guard: webhook alerts are throttled per node: cluster locks are unavailable; each node may send one alert per rule per cooldown", "error", err.Error())
	}
}
