package moderation

import (
	"encoding/json"
	"slices"
	"sync"
	"time"

	pluginv1 "github.com/Sub2API-Devs/sup2api/next/sdk/gen/pluginv1"
	"github.com/Sub2API-Devs/sup2api/next/sdk/manifest"
	"github.com/Sub2API-Devs/sup2api/next/sdk/pluginsdk"
	"google.golang.org/protobuf/proto"
)

// Flows bound to accounts (CONTRACTS §72.17). The account a request goes to
// is only known once the core has chosen it, so a group whose flow depends
// on the account (snapshot.perAccount) is moderated by the gateway.attempt
// hook, on every attempt; any other group stays with the gateway.request
// hook exactly as before, and that hook tells the core to skip the attempt
// hook for the request (skip_attempt_hooks, §85).

// attemptHookGranted reports whether the core calls the gateway.attempt
// hook: gateway.hook is granted for that point. Without it the account
// bindings are not applied and every request goes by its group.
func attemptHookGranted(cfg pluginsdk.Config) bool {
	g, ok := cfg.Grant("gateway.hook")
	if !ok {
		return false
	}
	var scope struct {
		Points *[]string `json:"points"`
	}
	if json.Unmarshal(g.Scope, &scope) != nil {
		return false
	}
	return scope.Points == nil || slices.Contains(*scope.Points, manifest.HookPointAttempt)
}

// settled marks a gateway.request answer as covering every attempt of the
// request (the shared responses are never modified).
func settled(r *pluginv1.GatewayRequestHookResponse) *pluginv1.GatewayRequestHookResponse {
	out := proto.Clone(r).(*pluginv1.GatewayRequestHookResponse)
	out.SkipAttemptHooks = true
	return out
}

// attemptFlow is the flow an attempt still has to run, nil when none: the
// request hook moderated the request (its group does not depend on the
// account), the account is not moderated, or an earlier attempt of the
// request ran the same flow (a failover moderates again only when the new
// account has another flow).
func (p *Plugin) attemptFlow(snap *snapshot, meta *pluginv1.RequestMeta) *liveFlow {
	rid, group := meta.GetRequestId(), meta.GetGroupId()
	done, left := p.attempts.get(rid)
	if !left && !snap.perAccount(group) {
		return nil
	}
	f := snap.flowForAccount(group, meta.GetAccountId())
	if f == nil || slices.Contains(done, f.ID) {
		return nil
	}
	p.attempts.add(rid, f.ID)
	return f
}

const (
	attemptRunsTTL = 10 * time.Minute
	attemptRunsCap = 100_000
)

// attemptRuns remembers the requests the request hook left to the attempts
// and the flows their attempts ran. Two generations of at most
// attemptRunsCap requests, each kept attemptRunsTTL to twice that: a request
// forgotten earlier is moderated again on a failover (the verdict cache makes
// that cheap), never skipped.
type attemptRuns struct {
	mu        sync.Mutex
	now       func() time.Time
	cur, prev map[string][]int64
	rotated   time.Time
}

func newAttemptRuns(now func() time.Time) *attemptRuns {
	return &attemptRuns{now: now, cur: map[string][]int64{}, prev: map[string][]int64{}, rotated: now()}
}

func (a *attemptRuns) rotate() {
	if len(a.cur) < attemptRunsCap && a.now().Sub(a.rotated) < attemptRunsTTL {
		return
	}
	a.prev, a.cur, a.rotated = a.cur, map[string][]int64{}, a.now()
}

// get returns the flows run for rid; left = the request hook left rid to
// the attempts (or an attempt ran).
func (a *attemptRuns) get(rid string) (flows []int64, left bool) {
	a.mu.Lock()
	defer a.mu.Unlock()
	if f, ok := a.cur[rid]; ok {
		return f, true
	}
	f, ok := a.prev[rid]
	return f, ok
}

// leave records that the attempts of rid moderate it.
func (a *attemptRuns) leave(rid string) { a.add(rid, 0) }

// add records that an attempt of rid runs flow (0 = none yet).
func (a *attemptRuns) add(rid string, flow int64) {
	a.mu.Lock()
	defer a.mu.Unlock()
	a.rotate()
	flows, ok := a.cur[rid]
	if !ok {
		flows = slices.Clone(a.prev[rid])
	}
	if flows == nil {
		flows = []int64{}
	}
	if flow != 0 && !slices.Contains(flows, flow) {
		flows = append(flows, flow)
	}
	a.cur[rid] = flows
}
