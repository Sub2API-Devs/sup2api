package gateway

import (
	"bytes"
	"cmp"
	"context"
	"errors"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/ccgateway"
	"io"
	"log/slog"
	"net/http"
	"net/http/httptrace"
	"net/url"
	"slices"
	"strings"
	"sync/atomic"
	"time"

	pluginv1 "github.com/Sub2API-Devs/sup2api/next/sdk/gen/pluginv1"
	"github.com/tidwall/gjson"
	"github.com/tidwall/sjson"

	"github.com/Sub2API-Devs/sup2api/next/sdk/observation"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/core"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/gateway/convert"
)

type attemptKind int

const (
	attemptDone     attemptKind = iota // response delivered (or stream ended)
	attemptFailover                    // try another account
	attemptReturn                      // send the error to the client
	attemptCanceled                    // client went away
)

type attemptResult struct {
	kind attemptKind
	err  *gwError
}

// dispatch schedules accounts and forwards the request, failing over up to
// max_attempts times. Once bytes reached the client it never fails over.
func (c *call) dispatch(ctx context.Context) {
	all, err := c.g.d.Accounts.Candidates(ctx, c.principal.Group.ID, c.routeKeys)
	if err != nil {
		c.fail(fromCore(core.ErrUnavailable.WithCause(err), errTypeInternal))
		return
	}
	if len(all) == 0 {
		// No account of the group serves the endpoint, now or after any
		// cooldown: answer 404 rather than an overload the client retries.
		if has, err := c.g.d.Accounts.GroupHasType(ctx, c.principal.Group.ID, c.routeKeys); err == nil && !has {
			c.fail(errEndpointNotServed)
			return
		}
	}
	c.sched.candidates = len(all)
	cands := make([]core.AccountRef, 0, len(all))
	creditExcluded := false
	for i := range all {
		if reason, detail, ok := c.ineligibleReason(&all[i]); !ok {
			c.skipAccount(all[i].ID, reason, detail)
			creditExcluded = creditExcluded || detail == schedDetailCredit
			continue
		}
		cands = append(cands, all[i])
	}
	if len(cands) == 0 && creditExcluded && c.creditRequest != nil && c.creditRequest.lookupError != nil {
		c.fail(c.creditRequest.lookupError)
		return
	}
	eligible := cands
	cands, availabilityErr := c.filterAvailability(ctx, cands)
	c.noteDropped(eligible, cands, core.SchedAvailabilityBlocked)
	c.sched.eligible = len(cands)
	if availabilityErr != nil {
		c.fail(availabilityErr)
		return
	}
	c.sticky = c.resolveSticky(ctx)
	if c.failureState.stickyErr != nil {
		c.fail(fromCore(core.ErrUnavailable.WithMessage("sticky store unavailable"), errTypeInternal))
		return
	}
	c.session = c.sessionIdentity(core.RequestSession)
	excluded := map[int64]bool{}
	var last *gwError
	var lastAccount int64
	attempts := 0
	defer func() {
		c.rec.Attempts = attempts
	}()
	for attempts < c.attemptLimit() {
		available, err := c.policyCandidates(ctx, cands)
		if err != nil {
			c.fail(fromCore(core.ErrUnavailable.WithMessage("account selection unavailable"), errTypeInternal))
			return
		}
		ref, release, busy := c.pick(ctx, available, excluded)
		if ref == nil {
			c.endFailurePolicy("no_eligible_account")
			if last == nil {
				if ctx.Err() != nil {
					// The client left while queueing for an account.
					last = canceledErr()
				} else if busy {
					last = fromCore(core.ErrRateLimited.WithMessage("all accounts are busy or rate limited, please retry later"), errTypeNoAccount)
				} else if e := c.unsupportedConversion(); e != nil {
					// Every candidate was of a type the request does not
					// convert to, or refused by its loss policy (§88).
					last = e
				} else {
					last = fromCore(core.ErrNoAvailableAccount, errTypeNoAccount)
				}
			}
			break
		}
		defer release()
		if c.g.d.Limiter != nil {
			admitted, err := c.admitRate(ref)
			if err != nil {
				release()
				c.fail(fromCore(core.ErrUnavailable.WithMessage("account limits unavailable").WithCause(err), errTypeInternal))
				return
			}
			if !admitted {
				release()
				excluded[ref.ID] = true
				c.skipAccount(ref.ID, core.SchedRateLimited, "")
				if c.sticky != nil {
					c.sticky.hit = false
				}
				last = fromCore(core.ErrRateLimited.WithMessage("all accounts are busy or rate limited, please retry later"), errTypeNoAccount)
				continue
			}
		}
		// The account is chosen: plugins that decide per account (e.g. one
		// exempt from a check another is not) see it before anything is sent
		// to it, on every attempt (CONTRACTS §85).
		if e := c.runAttemptHooks(ctx, ref); e != nil {
			release()
			c.fail(e)
			c.finishSticky(ctx, 0, false)
			return
		}
		attempts++
		c.rec.Attempts = attempts
		stickyAttempt := c.sticky != nil && c.sticky.hit && c.sticky.bound == ref.ID
		c.startObservationAttempt(ref)
		c.beginFailureAttempt(ref)
		res := func() attemptResult { defer release(); return c.attempt(c.slotCtx, ref, attempts-1) }()
		res = c.planFailure(ctx, ref, res, attempts, excluded)
		c.observeAttemptResult(ref, res)
		lastAccount = ref.ID
		if res.kind != attemptDone {
			c.releaseAccountHold(ctx)
		}
		switch res.kind {
		case attemptDone:
			// An endpoint whose usage a plugin reports does not know its
			// token count yet (submit asks after the handler returns), so the
			// rate-limit window is updated there instead of here.
			if c.usage != nil {
				c.usage.accountID = ref.ID
			} else {
				c.countTokens(ctx, ref.ID)
			}
			c.finishSticky(ctx, ref.ID, c.rec.Success)
			if c.rec.Success {
				c.g.d.Accounts.TouchLastUsed(context.WithoutCancel(ctx), ref.ID)
			}
			if c.abortResponse {
				panic(http.ErrAbortHandler)
			}
			return
		case attemptCanceled:
			c.fail(res.err)
			c.finishSticky(ctx, ref.ID, false)
			return
		case attemptReturn:
			c.fail(res.err)
			c.finishSticky(ctx, ref.ID, false)
			return
		case attemptFailover:
			if c.failurePolicy != nil {
				last = res.err
				continue
			}
			if c.creditDispatched || c.helperWasDispatched() {
				c.fail(res.err)
				c.finishSticky(ctx, ref.ID, false)
				return
			}
			excluded[ref.ID] = true
			c.skipAccount(ref.ID, core.SchedAttemptFailed, attemptFailureDetail(res.err))
			last = res.err
			if stickyAttempt && c.sticky.rule.OnFailure == onFailureStick {
				// Protect the upstream cache: do not move the session.
				c.fail(last)
				c.finishSticky(ctx, ref.ID, false)
				return
			}
			if err := c.releaseBinding(ctx, ref.ID); err != nil {
				slog.WarnContext(ctx, "gateway: release sticky binding", "err", err)
			}
			c.releaseSession(ctx, ref)
		}
	}
	if last == nil || (last.RecordType != errTypeUpstream && last.RecordType != errTypeInvalidRequest && last.RecordType != errTypeModelAvailability &&
		last.Status != http.StatusTooManyRequests) {
		// Only upstream answers (and requests no upstream protocol can
		// express) are worth relaying; plugin or account problems surface
		// as "no available account".
		last = fromCore(core.ErrNoAvailableAccount, errTypeNoAccount)
	}
	if lastAccount != 0 && c.rec.AccountID == nil {
		id := lastAccount
		c.rec.AccountID = &id
	}
	c.fail(last)
	c.finishSticky(ctx, 0, false)
}

// sessionIdentity is the request's session for the limiter's session caps
// (CONTRACTS §71): the sticky session key when a rule matched, else a new
// session of the request alone (as new-api does), which own names from the
// request ID: RequestSession, or ConnectionSession for a WebSocket.
func (c *call) sessionIdentity(own func(requestID string) string) string {
	if c.sticky != nil {
		return c.sticky.key
	}
	return own(c.rid)
}

// pick chooses the next account: the sticky binding first (when usable),
// then by priority, higher first, and within a priority by route grade,
// native first (CONVERT-MATRIX §5.2), with weighted random order inside a
// (priority, grade) tier (CONTRACTS §18), over the priority/weight the
// scheduler.rank plugins left for this request (CONTRACTS §24). Accounts
// whose rate-limit window is exhausted are skipped, and a converting route
// converts the request only when one of its accounts comes up (usable). It
// returns busy when candidates exist but none could be used right now.
func (c *call) pick(ctx context.Context, cands []core.AccountRef, excluded map[int64]bool) (*core.AccountRef, func(), bool) {
	exhausted := c.exhausted(ctx, cands, excluded)
	if ref, release, _ := c.tryStickyBinding(ctx, cands, excluded, exhausted); ref != nil {
		return ref, release, false
	}
	// CONTRACTS §18.1: a stick rule does not leave a bound account that has no
	// room, it answers 429.
	if c.sticky != nil && c.sticky.refused {
		return nil, nil, true
	}
	// Plugins may rewrite the priority/weight of the candidates for this
	// request (CONTRACTS §24); everything below still gates them. A plugin's
	// weight 0 takes the account out of this request for good: the ranking is
	// computed once and reused by failover, so a zeroed account is not tried
	// when its tier's weighted accounts failed, are rate-limited or busy, the
	// request moves on to the next tier (§24.3). A plugin that
	// wants a tier it zeroed entirely split evenly gives each account 1.
	over := c.rankOverrides(ctx, cands)
	c.readBalance(ctx, cands)
	var pool, limited []core.AccountRef
	for i := range cands {
		if excluded[cands[i].ID] {
			continue
		}
		if !c.routed(&cands[i]) {
			c.skipAccount(cands[i].ID, core.SchedConversionRefused, "")
			continue
		}
		ref := cands[i]
		if o, ok := over[ref.ID]; ok {
			if o.weight == 0 {
				c.skipAccount(ref.ID, core.SchedRankExcluded, "")
				continue
			}
			ref.Priority, ref.Weight = o.priority, o.weight
		}
		if exhausted[ref.ID] {
			c.skipAccount(ref.ID, core.SchedRateLimited, "")
			limited = append(limited, ref)
			continue
		}
		pool = append(pool, ref)
	}
	c.orderPool(pool)
	queued := c.queuedAccounts(ctx, pool)
	for i := range pool {
		ref := pool[i]
		if queued[ref.ID] {
			c.skipAccount(ref.ID, core.SchedQueued, "")
			continue
		}
		if !c.usable(ctx, &ref) {
			c.skipAccount(ref.ID, core.SchedConversionRefused, "")
			continue
		}
		if release, ok := c.acquireAccount(ctx, &ref); ok {
			return c.finishPick(ctx, &ref, release, cands, excluded)
		}
		c.skipAccount(ref.ID, core.SchedConcurrencyFull, "")
	}
	// Busy only when an account that could serve the request is full or
	// rate limited, not when every one was refused for its conversion.
	usable := func(r core.AccountRef) bool { return c.usable(ctx, &r) }
	if pool = slices.DeleteFunc(pool, func(r core.AccountRef) bool { return !usable(r) }); len(pool) == 0 {
		return nil, nil, slices.ContainsFunc(limited, usable)
	}
	if ref := c.queueTarget(ctx, pool); ref != nil {
		if release, ok := c.waitForAccount(ctx, ref, c.gw.QueueFallbackMaxWaiting, c.gw.queueFallbackWait()); ok {
			return c.finishPick(ctx, ref, release, cands, excluded)
		}
	}
	return nil, nil, true
}

// orderPool sorts the pool by priority, higher first, then by route grade,
// better first, each (priority, grade) tier in weighted random order over the
// weights the loads and the core balancing give it (balance.go).
func (c *call) orderPool(pool []core.AccountRef) {
	grade := func(r *core.AccountRef) convert.Grade { return c.route(r).grade }
	slices.SortStableFunc(pool, func(a, b core.AccountRef) int {
		return cmp.Or(cmp.Compare(b.Priority, a.Priority), cmp.Compare(grade(&a), grade(&b)))
	})
	for i := 0; i < len(pool); {
		j := i + 1
		for j < len(pool) && pool[j].Priority == pool[i].Priority && grade(&pool[j]) == grade(&pool[i]) {
			j++
		}
		weightedOrder(pool[i:j], c.tierWeights(pool[i:j]), c.g.randFloat)
		i = j
	}
	if c.balance != nil {
		c.balance.recorded = true // failover orders again without recording
	}
}

// finishPick settles an account picked outside the binding: a session without
// one is bound to it now, and when a concurrent request of the session got
// there first this one follows that request instead.
func (c *call) finishPick(ctx context.Context, ref *core.AccountRef, release func(), cands []core.AccountRef, excluded map[int64]bool) (*core.AccountRef, func(), bool) {
	if s := c.sticky; s != nil {
		if winner := c.claimBinding(ctx, ref.ID); winner != 0 && winner != ref.ID {
			release()
			s.bound, s.tried = winner, false
			return c.pick(ctx, cands, excluded)
		}
	}
	return ref, release, false
}

// queuedAccounts are the accounts a new session must not be bound to because
// requests are queueing for them: it would only add to their queue while other
// accounts are free. Every account being queued for still takes it in
// queueTarget.
func (c *call) queuedAccounts(ctx context.Context, pool []core.AccountRef) map[int64]bool {
	if s := c.sticky; s == nil || s.bound != 0 || !c.queueable() {
		return nil
	}
	ids := make([]int64, len(pool))
	for i := range pool {
		ids[i] = pool[i].ID
	}
	waiting, err := c.g.d.Slots.InUseMany(ctx, core.AccountWaitSlots, ids)
	if err != nil {
		slog.WarnContext(ctx, "gateway: read account queues", "err", err)
		return nil
	}
	queued := map[int64]bool{}
	for id, n := range waiting {
		if n > 0 {
			queued[id] = true
		}
	}
	return queued
}

// tryStickyBinding honours this request's sticky binding once. ok reports
// that a sticky binding was handled (hit or missed); ref is non-nil only on a
// hit. A bound account that is absent from the schedulable set for this
// request loses the binding unless it is merely cooling down.
func (c *call) tryStickyBinding(ctx context.Context, cands []core.AccountRef, excluded map[int64]bool, exhausted map[int64]bool) (*core.AccountRef, func(), bool) {
	s := c.sticky
	if s == nil || s.tried {
		return nil, nil, false
	}
	s.tried = true
	if s.bound == 0 || excluded[s.bound] {
		return nil, nil, true
	}
	for i := range cands {
		if cands[i].ID != s.bound {
			continue
		}
		bound := &cands[i]
		// An unusable type (request not convertible, or refused by the
		// account's loss policy) keeps the binding; an exhausted rate window
		// counts as "no free slot".
		if c.usable(ctx, bound) {
			if !exhausted[bound.ID] {
				release, ok := c.acquireAccount(ctx, bound)
				if !ok {
					release, ok = c.waitForAccount(ctx, bound, c.gw.QueueStickyMaxWaiting, c.gw.queueStickyWait())
				}
				if ok {
					s.hit = true
					return bound, release, true
				}
				c.skipAccount(bound.ID, core.SchedConcurrencyFull, "")
			} else {
				c.skipAccount(bound.ID, core.SchedRateLimited, "")
			}
			s.refused = s.rule.OnFailure == onFailureStick
		}
		return nil, nil, true
	}
	if cooling, err := c.g.d.Accounts.IsCoolingDown(ctx, s.bound); err == nil && !cooling {
		// Not in the group's schedulable set for this request and
		// not merely cooling down: disabled, deleted, unschedulable,
		// moved, out of quota, or of a type that cannot serve this
		// endpoint. The next account takes the session; only the binding
		// keeps its requests from scattering, and a request that overflows
		// does not move it.
		c.dropBinding(ctx, s)
	}
	return nil, nil, true
}

// exhausted asks the limiter which candidates reached a rate limit. Limiter
// failures do not block scheduling.
func (c *call) exhausted(ctx context.Context, cands []core.AccountRef, excluded map[int64]bool) map[int64]bool {
	lim := c.g.d.Limiter
	if lim == nil || c.tokenCounting() {
		return nil
	}
	var limited []core.AccountRef
	for i := range cands {
		if cands[i].Limited() && !excluded[cands[i].ID] {
			limited = append(limited, cands[i])
		}
	}
	if len(limited) == 0 {
		return nil
	}
	out, err := lim.Exhausted(ctx, limited, c.model, c.session)
	if err != nil {
		slog.WarnContext(ctx, "gateway: read rate limits", "err", err)
		return nil
	}
	return out
}

// weightedOrder reorders grp by weighted random sampling without
// replacement: an account is drawn first with probability proportional to
// its weight w[i] (> 0, reordered along with grp). rnd yields [0,1).
func weightedOrder(grp []core.AccountRef, w []float64, rnd func() float64) {
	for i := 0; i < len(grp)-1; i++ {
		total := 0.0
		for j := i; j < len(grp); j++ {
			total += w[j]
		}
		r := rnd() * total
		for j := i; j < len(grp); j++ {
			r -= w[j]
			if r < 0 || j == len(grp)-1 {
				grp[i], grp[j] = grp[j], grp[i]
				w[i], w[j] = w[j], w[i]
				break
			}
		}
	}
}

// tokenCounting reports a token counting request. It generates nothing, so it
// consumes nothing: no key or account concurrency, no RPM or TPM, no quota, and
// a failed count says nothing about the account, which keeps its state
// (2026-11-04). An account that is cooling or disabled still does not serve it.
// It has nothing to do with sticky sessions: the account is picked by weight,
// and no binding is read or written (resolveSticky).
func (c *call) tokenCounting() bool {
	return strings.HasSuffix(c.ep.Protocol, ".count_tokens")
}

// slotSpec is one concurrency slot a request takes on an account.
type slotSpec struct {
	kind  string
	limit int // 0 = uncapped
}

// accountSlots are the slots a request for the call's model takes on ref:
// the account's, that of the model list holding the model (CONTRACTS §68),
// and the model's own, uncapped, which only counts it for the per-model
// breakdown of GET /accounts/:id/rate-models.
func (c *call) accountSlots(ref *core.AccountRef) []slotSpec {
	out := []slotSpec{{kind: "account", limit: ref.MaxConcurrency}}
	if l := ref.ModelLimitFor(c.model); l != nil {
		out = append(out, slotSpec{kind: core.ModelLimitSlots(l.Key()), limit: l.MaxConcurrency})
	}
	if c.model != "" {
		out = append(out, slotSpec{kind: core.ModelSlots(c.model)})
	}
	return out
}

// acquireAccount takes every slot of accountSlots, in order; one being full
// makes the account busy and gives back those already taken. The release
// gives them back in reverse order.
func (c *call) acquireAccount(ctx context.Context, ref *core.AccountRef) (func(), bool) {
	if c.tokenCounting() {
		c.slotCtx = ctx
		return func() {}, true
	}
	release := func() {}
	for _, spec := range c.accountSlots(ref) {
		leaseCtx, releaseSlot, ok, err := core.AcquireSlot(ctx, c.g.d.Slots, spec.kind, ref.ID, spec.limit, c.rid)
		if err != nil {
			slog.WarnContext(ctx, "gateway: acquire account slot", "account", ref.ID, "slot", spec.kind, "err", err)
		}
		if err != nil || !ok {
			release()
			return nil, false
		}
		releaseOuter := release
		ctx, release = leaseCtx, func() { releaseSlot(); releaseOuter() }
	}
	c.slotCtx = ctx
	return release, true
}

// admitRate asks the limiter to admit one request of the call's model and
// session on ref, reserving its estimated tokens where a TPM cap applies, and
// keeps the hold its tokens settle against.
func (c *call) admitRate(ref *core.AccountRef) (bool, error) {
	if c.tokenCounting() {
		return true, nil
	}
	c.releaseAccountHold(c.slotCtx)
	tokens := int64(0)
	if l := ref.ModelLimitFor(c.model); ref.TPMLimit > 0 || (l != nil && l.TPMLimit > 0) {
		tokens = c.rateTokens(c.slotCtx)
	}
	hold, ok, err := c.g.d.Limiter.Reserve(c.slotCtx, *ref, c.model, c.session, tokens)
	if ok && err == nil {
		c.accountHold, c.sessionAt = &hold, hold.At
	}
	return ok, err
}

// attempt runs one upstream attempt on account ref.
func (c *call) attempt(ctx context.Context, ref *core.AccountRef, n int) attemptResult {
	unavailable := func(msg string, err error) attemptResult {
		slog.WarnContext(ctx, "gateway: account unavailable", "account", ref.ID, "reason", msg, "err", err)
		return attemptResult{kind: attemptFailover,
			err: fromCore(core.ErrNoAvailableAccount.WithCause(err), errTypeNoAccount)}
	}
	acc, err := c.g.d.Accounts.Load(ctx, ref.ID)
	if err != nil {
		return unavailable("load account", err)
	}
	if c.failurePolicy != nil && proxyIdentity(acc.ProxyID) != proxyIdentity(ref.ProxyID) {
		return attemptResult{kind: attemptReturn, err: fromCore(core.ErrUnavailable.WithMessage("account proxy changed during selection"), errTypeInternal)}
	}
	rt := c.route(ref)
	if rt == nil || rt.binding.Client == nil {
		return unavailable("account type not enabled", errors.New(ref.PluginKey+"/"+ref.Type))
	}
	c.env = c.environment(&acc.AccountRef)
	id := acc.ID
	c.rec.AccountID = &id
	c.rec.PluginKey, c.rec.PluginVersion = rt.binding.Plugin.Key, rt.binding.Plugin.Version
	c.rec.AccountType = rt.binding.Type.ID
	c.rec.UpstreamProtocol = rt.upstream
	c.rec.UsageSemantics = rt.usage.Semantics
	if c.rec.UsageSemantics == "" {
		c.rec.UsageSemantics = "exclusive"
	}
	pacct := acc.PluginAccount(c.platform)

	c.serveRoute(rt, ref)
	if rt.local {
		return c.countLocally(ctx)
	}
	// The request was converted for the route when the account was picked;
	// the body is final by then, so this only reads that result.
	upBody := c.body
	if rt.conv != nil {
		if !c.prepareRoute(ctx, rt) {
			return unavailable("request conversion failed", rt.prepared.err)
		}
		upBody = rt.body
	}

	// The account's model mapping rewrites the model sent upstream
	// (CONTRACTS §18); billing and hooks saw the client model.
	upModel := ref.MapModel(c.model)
	if upModel != c.model {
		if rt.modelPath != "" && gjson.GetBytes(upBody, rt.modelPath).Exists() {
			if upBody, err = sjson.SetBytes(upBody, rt.modelPath, upModel); err != nil {
				return attemptResult{kind: attemptFailover, err: fromCore(core.ErrInternal.WithCause(err), errTypeInternal)}
			}
		}
		c.rec.UpstreamModel = upModel
	}

	// Build the upstream request (plugin declaring the account type).
	upBody, err = c.mapReferencedModels(upBody, ref, rt)
	if err != nil {
		return attemptResult{kind: attemptFailover, err: invalidModelReference(err.Error())}
	}
	upBody, err = c.mapResourceReferences(ctx, upBody, ref, rt)
	if err != nil {
		return attemptResult{kind: attemptReturn, err: fromCore(core.AsError(err), errTypeInvalidRequest)}
	}
	// An upstream that only streams (CONTRACTS §83) gets stream: true before
	// the plugin sees the request, so the fields it reads and the body its
	// patches apply to already say what goes upstream.
	if c.forcesStream(rt) {
		// The body here is the core's own (converted and mapped), not yet
		// touched by the plugin: failing to set the flag is an internal error.
		if upBody, err = forceStreamPath(upBody, rt.streamPath); err != nil {
			return attemptResult{kind: attemptFailover, err: fromCore(core.ErrInternal.WithCause(err), errTypeInternal)}
		}
	}
	// A declared type's own part of the body, then the account's request
	// parameter override (CONTRACTS §84), precede the build: the plugin
	// builds from, and may still patch, what the account decided
	// (param_override.go).
	upBody, upModel, failure := c.rewriteBody(ctx, acc, rt, pacct, upBody, upModel, n)
	if failure != nil {
		return *failure
	}
	fields := requestFieldValues(upBody, rt.requestFields)
	meta := c.metaFor(rt)
	meta.Model = upModel
	buildRequest := &pluginv1.BuildUpstreamRequestRequest{Meta: meta, Account: pacct, Fields: fields, InboundHeaders: c.passHeaders(rt.passHeaders), Attempt: int32(n)}
	if c.canExecute(rt) {
		if failure := c.guardAvailability(ctx, ref); failure != nil {
			return attemptResult{kind: attemptFailover, err: failure}
		}
		return c.executeAttempt(ctx, rt, acc, pacct, upBody, buildRequest)
	}
	bctx, cancel := context.WithTimeout(ctx, c.gw.platformTimeout())
	built, err := rt.binding.Client.BuildUpstreamRequest(bctx, buildRequest)
	cancel()
	if ctx.Err() != nil {
		return attemptResult{kind: attemptCanceled, err: canceledErr()}
	}
	if err == nil && built == nil {
		err = errors.New("empty response")
	}
	if err != nil {
		return attemptResult{kind: attemptFailover, err: fromCore(core.ErrPluginUnavailable.WithCause(err), errTypePluginUnavailable)}
	}
	return c.forwardBuilt(ctx, rt, acc, buildRequest, upBody, built, nil)
}

// splitHeaders separates built's headers into the declaration's and the
// plugin's; a code plugin's are all its own.
func splitHeaders(rt *typeRoute, in *pluginv1.BuildUpstreamRequestRequest, built *pluginv1.BuildUpstreamRequestResponse) (declared, plugin map[string]string) {
	if d, ok := rt.binding.Client.(core.DeclaredUpstream); ok {
		return d.SplitHeaders(in, built)
	}
	return nil, built.GetHeaders()
}

// setBuiltHeaders writes built headers onto req; host goes to req.Host and
// the framing headers stay the transport's (transparent gzip, framing).
func setBuiltHeaders(req *http.Request, h map[string]string) {
	for k, v := range h {
		switch strings.ToLower(k) {
		case "host":
			req.Host = v
		case "content-length", "accept-encoding", "connection", "transfer-encoding":
		default:
			req.Header.Set(k, v)
		}
	}
}

// passthroughHeaders fills in the client headers the account's passthrough
// (CONTRACTS §81) and the matched sticky rule (§5.6; the built-in Claude
// Code rule forwards the session and sub-agent headers) forward, where h
// has none yet.
func (c *call) passthroughHeaders(h http.Header, acc *core.Account) {
	if c.c == nil || c.c.Request == nil {
		return
	}
	var rules [][]string
	if acc != nil {
		rules = append(rules, acc.HeaderPassthrough)
	}
	if c.sticky != nil {
		rules = append(rules, c.sticky.rule.PassHeaders)
	}
	for _, r := range rules {
		for k, vs := range core.PassthroughHeaders(r, c.c.Request.Header) {
			if _, set := h[k]; !set {
				h[k] = vs
			}
		}
	}
}

// writeDeclaredAuth writes a declared account type's auth header once more,
// last of the request's own headers (docs/UPSTREAM-DECLARATIVE.md §4.3): only
// the declaration decides the credential the upstream receives, so neither
// the plugin (extend), the passthrough (§81) nor the account's override
// (§84) can replace or remove it under a custom header name.
func writeDeclaredAuth(h http.Header, rt *typeRoute, pacct *pluginv1.Account, built *pluginv1.BuildUpstreamRequestResponse) {
	d, ok := rt.binding.Client.(core.DeclaredUpstream)
	if !ok {
		return
	}
	name := d.AuthHeader(pacct)
	if name == "" {
		return
	}
	if v := built.GetHeaders()[name]; v != "" {
		h.Set(name, v)
	} else {
		h.Del(name)
	}
}

// validatePatches runs the guards that a plugin-built upstream request must
// pass before it is sent: the plugin's patches (upBody to body) must keep
// resource and model references consistent with the original body, and the
// account's usage rules must be able to meter the operation and attempts of
// body, the one that goes upstream.
// The kind differs per guard on purpose: an unaddressable resource reference
// is the client's mistake and is returned (attemptReturn), everything else
// fails over.
func (c *call) validatePatches(rt *typeRoute, upBody, body []byte) (attemptKind, *gwError) {
	// applyPatches returns upBody itself when the plugin asked for no patch,
	// and then the three comparisons below compare the request with itself:
	// they cannot fail, yet each walks the whole body (four scans and two
	// hashes). Compare the bytes instead — never with a substring pre-check,
	// which a \u escape would defeat — and run the guards only when they differ.
	if !bytes.Equal(upBody, body) {
		if err := c.validateResourceReferencePatches(rt.upstream, upBody, body); err != nil {
			return attemptReturn, invalidModelReference(err.Error())
		}
		// The body is the one this call already parsed; the patched copy is
		// parsed once and both rule sets read it.
		before, after := c.rootFor(upBody), c.rootFor(body)
		if err := modelReferencePatches(before, after, c.ep.Request.ModelReferences); err != nil {
			return attemptFailover, invalidModelReference(err.Error())
		}
		if err := modelReferencePatches(before, after, rt.modelReferences); err != nil {
			return attemptFailover, invalidModelReference(err.Error())
		}
	}
	if c.ep.Billing != "free" && !c.routeHasRequiredPrimaryUsageFor(rt, body) {
		return attemptFailover, invalidModelReference("account usage rules cannot meter the requested operation")
	}
	if c.ep.Billing != "free" && !c.routeHasRequiredAttempts(rt, body) {
		return attemptFailover, invalidModelReference("account usage rules cannot meter the requested attempts")
	}
	return attemptDone, nil
}

// forwardBuilt sends built, the plugin's answer to request (from
// BuildUpstreamRequest, or forwarded by a plugin executing request,
// execution set), with upBody, the body the plugin built from (already
// rewritten by the declaration and the account's override): its patches
// apply to upBody.
func (c *call) forwardBuilt(ctx context.Context, rt *typeRoute, acc *core.Account, request *pluginv1.BuildUpstreamRequestRequest, upBody []byte, built *pluginv1.BuildUpstreamRequestResponse, execution *gatewayExecution) attemptResult {
	pacct := request.GetAccount()
	prepareCtx := ctx
	if execution != nil {
		var cancel context.CancelFunc
		prepareCtx, cancel = context.WithTimeout(ctx, 15*time.Second)
		defer cancel()
	}
	if built.GetUpstreamModel() != "" {
		c.rec.UpstreamModel = built.GetUpstreamModel()
	}
	patched, err := applyPatches(upBody, built.GetPatches())
	if err != nil {
		return attemptResult{kind: attemptFailover, err: fromCore(core.ErrPluginUnavailable.WithCause(err), errTypePluginUnavailable)}
	}
	body, builtModel := patched, built.GetUpstreamModel()
	rawURL, failure := c.declaredTarget(rt, request, built, body)
	if failure != nil {
		return *failure
	}
	managedCCG := ccgateway.IsManaged(acc.PluginKey, acc.Type, rawURL) && c.g.d.CCGateway != nil
	var target *url.URL
	if managedCCG {
		target, err = url.Parse(rawURL)
	} else {
		target, err = c.g.checkUpstreamURL(prepareCtx, rawURL)
	}
	if err != nil {
		slog.WarnContext(ctx, "gateway: upstream url rejected", "plugin", rt.binding.Plugin.Key, "account", acc.ID, "err", err)
		return attemptResult{kind: attemptFailover, err: fromCore(core.ErrUnavailable.WithMessage("upstream address rejected"), errTypeInternal)}
	}
	// Whatever the plugin patched, a stream-only upstream gets stream: true.
	// The body is the plugin's patched one now: when the flag cannot be set
	// on it (a patch replaced the parent of streamPath with a non-object),
	// the plugin produced the invalid body, so it is charged to the plugin
	// like a patch that cannot be applied, unlike the ErrInternal before
	// BuildUpstreamRequest in attempt.
	forced := c.forcesStream(rt)
	if forced {
		if body, err = forceStreamPath(body, rt.streamPath); err != nil {
			return attemptResult{kind: attemptFailover, err: fromCore(core.ErrPluginUnavailable.WithCause(err), errTypePluginUnavailable)}
		}
	}
	if kind, err := c.validatePatches(rt, upBody, body); err != nil {
		return attemptResult{kind: kind, err: err}
	}
	var client *http.Client
	if managedCCG {
		client = c.g.d.CCGateway.ModelClientForRequest(ccgateway.ModelRequestContext{AccountID: acc.ID, ProxyID: acc.ProxyID, GroupID: c.principal.Group.ID})
	} else {
		client, err = c.g.d.Proxies.HTTPClient(prepareCtx, acc.ProxyID)
	}
	if err != nil || client == nil {
		return attemptResult{kind: attemptFailover, err: fromCore(core.ErrUnavailable.WithCause(err), errTypeInternal)}
	}

	// Send. Canceling ctx (client gone) cancels the upstream request.
	// The cause names the timeout that cut the request (forward records it).
	uctx, ucancel := context.WithCancelCause(ctx)
	defer ucancel(nil)
	method := strings.ToUpper(built.GetMethod())
	if method == "" {
		method = http.MethodPost
	}
	var reqBody io.Reader
	if method != http.MethodGet && method != http.MethodHead {
		reqBody = bytes.NewReader(body)
	}
	req, err := http.NewRequestWithContext(uctx, method, target.String(), reqBody)
	if err != nil {
		return attemptResult{kind: attemptFailover, err: fromCore(core.ErrInternal.WithCause(err), errTypeInternal)}
	}
	// Headers in layers (CONTRACTS §86.5), each over the one before: the
	// declaration's and its paramOverride's, the passthrough (fills only
	// what is unset), the account's parameter override, the plugin's (it
	// knows the override ran and may change its result), then the declared
	// auth header and the core's own below.
	declared, plugin := splitHeaders(rt, request, built)
	setBuiltHeaders(req, declared)
	c.paramOverride.declared.Apply(req.Header)
	c.passthroughHeaders(req.Header, acc)
	c.paramOverride.headers.Apply(req.Header)
	setBuiltHeaders(req, plugin)
	writeDeclaredAuth(req.Header, rt, pacct, built)
	if req.Header.Get("Content-Type") == "" && reqBody != nil {
		req.Header.Set("Content-Type", "application/json")
	}
	if err := c.applyResourceHeaders(prepareCtx, req, acc, body); err != nil {
		if res, ok := c.accountRefused(ctx, rt, pacct, execution, err); ok {
			return res
		}
		return c.resourcePreparationFailure(err)
	}
	if err := c.applyCreditHeaders(prepareCtx, req, acc, body); err != nil {
		if res, ok := c.accountRefused(ctx, rt, pacct, execution, err); ok {
			return res
		}
		return c.resourcePreparationFailure(err)
	}
	if err := c.wrapHelperHistoryRequest(prepareCtx, req, acc, rt, body); err != nil {
		if res, ok := c.accountRefused(ctx, rt, pacct, execution, err); ok {
			return res
		}
		var eligibility *resourceEligibilityError
		if errors.As(err, &eligibility) {
			return c.resourcePreparationFailure(err)
		}
		var typed *core.Error
		if errors.As(err, &typed) && typed.Code == core.ErrUnavailable.Code {
			return attemptResult{kind: attemptReturn, err: fromCore(typed, errTypeInternal)}
		}
		return attemptResult{kind: attemptReturn, err: invalidModelReference(err.Error())}
	}

	if failure := c.guardAvailability(prepareCtx, &acc.AccountRef); failure != nil {
		return attemptResult{kind: attemptFailover, err: failure}
	}
	if rt.binding.Type.ModelAvailability {
		expected := c.upstreamModel(acc)
		if builtModel != "" && builtModel != expected {
			return attemptResult{kind: attemptFailover, err: c.availabilityMismatch(ctx, &acc.AccountRef, expected, builtModel)}
		}
		if rt.modelPath != "" {
			actual := gjson.GetBytes(body, rt.modelPath)
			if (actual.Exists() || gjson.GetBytes(upBody, rt.modelPath).Exists()) && (actual.Type != gjson.String || actual.Str != expected) {
				return attemptResult{kind: attemptFailover, err: c.availabilityMismatch(ctx, &acc.AccountRef, expected, actual.String())}
			}
		}
	}
	hc := *client
	hc.CheckRedirect = func(*http.Request, []*http.Request) error { return http.ErrUseLastResponse }
	hc.Timeout = 0
	if c.ep.TaskSubmit() {
		if err := c.beginTask(prepareCtx); err != nil {
			return attemptResult{kind: attemptReturn, err: fromCore(core.ErrUnavailable.WithMessage("task registration unavailable").WithCause(err), errTypeInternal)}
		}
	}

	headerWait := c.g.headerWait(c.stream || forced)
	if d := c.env.Duration(core.EnvVarResponseHeaderTimeoutSeconds); d > 0 {
		headerWait = d
	}
	// The relay timeout covers the upstream exchange, not the local
	// preparation above, so it starts with the header timer.
	if total := c.env.Duration(core.EnvVarRelayTimeoutSeconds); total > 0 {
		relayTimer := time.AfterFunc(total, func() { ucancel(errRelayTimeout) })
		defer relayTimer.Stop()
	}
	timer := time.AfterFunc(headerWait, func() { ucancel(errHeaderTimeout) })
	if execution != nil {
		execution.sent = true
	}
	if c.creditRequest != nil && c.creditRequest.tokenPresent {
		c.creditDispatched = true
	}
	var requestWritten atomic.Bool
	if c.failurePolicy != nil {
		req = req.WithContext(httptrace.WithClientTrace(req.Context(), &httptrace.ClientTrace{WroteRequest: func(httptrace.WroteRequestInfo) { requestWritten.Store(true) }}))
	}
	resp, err := hc.Do(req)
	timer.Stop()
	if err != nil {
		if c.failurePolicy != nil {
			c.failureState.unsafeTransport = requestWritten.Load()
		}
		if c.ep.TaskSubmit() {
			return c.taskFailure(ctx, "task submission outcome is uncertain", err)
		}
		if ctx.Err() != nil {
			return attemptResult{kind: attemptCanceled, err: canceledErr()}
		}
		msg := err.Error()
		if cause := context.Cause(uctx); errors.Is(cause, errRelayTimeout) || errors.Is(cause, errHeaderTimeout) {
			msg = cause.Error()
		}
		if execution != nil {
			return execution.classify(ctx, 0, nil, nil, msg)
		}
		return c.classify(ctx, rt, pacct, 0, nil, nil, msg)
	}
	if c.stream || forced {
		resp.Body = newIdleBody(resp.Body, c.streamIdle(), ucancel)
	}
	defer resp.Body.Close()
	if c.g.d.Observations != nil {
		rec := *c.rec
		rec.StatusCode = resp.StatusCode
		c.observeRequest(observation.ResponseStarted, &rec)
	}
	if err := c.unwrapHelperHistoryResponse(resp, rt); err != nil {
		return attemptResult{kind: attemptReturn, err: fromCore(core.ErrUnavailable.WithMessage("helper history response could not be verified").WithCause(err), errTypeInternal)}
	}
	c.g.observeQuota(rt, acc.ID, resp.StatusCode, resp.Header)

	if resp.StatusCode < 200 || resp.StatusCode > 299 {
		body, readErr := c.readUpstreamError(resp.Body)
		if readErr != nil {
			if ctx.Err() != nil {
				return attemptResult{kind: attemptCanceled, err: canceledErr()}
			}
			e := &gwError{Status: http.StatusBadGateway, Code: "upstream_response_incomplete", RecordType: errTypeUpstream, Message: "Could not read the complete upstream error response"}
			if execution != nil {
				execution.unclassified = e
			}
			return attemptResult{kind: attemptReturn, err: e}
		}
		return c.upstreamFailure(ctx, rt, acc, pacct, execution, resp.StatusCode, resp.Header, body)
	}
	if forced {
		if res, failed := c.collectStreamOnly(ctx, uctx, rt, acc, pacct, execution, resp); failed {
			return res
		}
	}
	if execution != nil {
		return execution.forward(ctx, resp)
	}
	if c.ep.TaskSubmit() {
		return c.forwardTask(ctx, rt, pacct, resp, upBody)
	}
	return c.forward(ctx, rt, pacct, resp, upBody)
}

// upstreamFailure classifies an upstream error answer - an HTTP error status,
// or the error event of a stream-only upstream (CONTRACTS §83) - and keeps
// its body for the client.
func (c *call) upstreamFailure(ctx context.Context, rt *typeRoute, acc *core.Account, pacct *pluginv1.Account, execution *gatewayExecution,
	status int, header http.Header, body *upstreamErrorBody) attemptResult {
	raw := body.prefix
	ct := header.Get("Content-Type")
	if status >= 500 {
		// A server error names no cause in the usage log; who answered
		// (a proxy on the way or the upstream itself) is in these.
		slog.WarnContext(ctx, "gateway: upstream server error", "request_id", c.rid, "plugin", rt.binding.Plugin.Key,
			"account", acc.ID, "status", status, "content_type", ct, "server", header.Get("Server"),
			"upstream_request_id", header.Get("Request-Id"), "body", truncateUTF8(string(raw), 300))
	}
	var res attemptResult
	if execution != nil {
		execution.errorBody = body
		res = execution.classify(ctx, status, header, raw, "")
	} else {
		res = c.classify(ctx, rt, pacct, status, header, raw, "")
	}
	if c.ep.TaskSubmit() {
		c.recordTaskFailure(ctx, status, raw, "upstream rejected task submission")
		res.kind = attemptReturn
	}
	c.preserveHTTPError(res.err, status, header, body)
	return res
}

// observeQuota hands the response headers to the quota observer when the
// account type declares quota headers (CONTRACTS §44). The observer reads a
// few headers and queues the write; types without the declaration (API keys)
// cost one nil check.
func (g *Gateway) observeQuota(rt *typeRoute, accountID int64, status int, h http.Header) {
	if g.d.Quota == nil || rt == nil {
		return
	}
	if q := rt.binding.Type.Quota; q != nil && len(q.Headers) > 0 {
		g.d.Quota.ObserveQuotaHeaders(accountID, q.Headers, status, h)
	}
}

func canceledErr() *gwError {
	return &gwError{Status: statusClientClosed, Message: "client canceled", RecordType: errTypeClientCanceled}
}

const (
	maxErrorBody    = 64 << 10
	classifyPrefix  = 4 << 10
	defaultCooldown = 60 * time.Second
)

// classify asks the account type's plugin what an upstream failure means
// and applies the answer. Under a failure policy a transport error (no
// status) is the policy's alone: there is no answer for the plugin to read.
func (c *call) classify(ctx context.Context, rt *typeRoute, acct *pluginv1.Account,
	status int, header http.Header, body []byte, transportErr string) attemptResult {
	var cls *pluginv1.ClassifyErrorResponse
	if status > 0 || c.failurePolicy == nil {
		cls = c.classifyWithPlugin(ctx, rt, acct, status, header, body, transportErr)
	}
	return c.applyClassification(ctx, rt, acct, status, header, body, transportErr, cls)
}

// classifyWithPlugin asks the account type's plugin what an upstream failure
// means; defaults when the call fails.
func (c *call) classifyWithPlugin(ctx context.Context, rt *typeRoute, acct *pluginv1.Account,
	status int, header http.Header, body []byte, transportErr string) *pluginv1.ClassifyErrorResponse {
	headers := map[string]string{}
	for k, v := range header {
		if len(v) > 0 {
			headers[strings.ToLower(k)] = v[0]
		}
	}
	prefix := body
	if len(prefix) > classifyPrefix {
		prefix = prefix[:classifyPrefix]
	}
	cctx, cancel := context.WithTimeout(context.WithoutCancel(ctx), c.gw.platformTimeout())
	cls, err := rt.binding.Client.ClassifyError(cctx, &pluginv1.ClassifyErrorRequest{
		Meta: c.metaFor(rt), Account: acct, Status: int32(status), Headers: headers, BodyPrefix: prefix, TransportError: transportErr,
	})
	cancel()
	if err != nil || cls == nil {
		slog.WarnContext(ctx, "gateway: classify error failed, using defaults", "plugin", rt.binding.Plugin.Key, "err", err)
		cls = defaultClassification(status)
	}
	return cls
}

// applyClassification turns the plugin's classification of an upstream
// failure into the attempt's result: under a failure policy the policy
// decides retries and the reply, and the plugin still tells what the answer
// means for the account (CONTRACTS §69); otherwise the plugin decides.
func (c *call) applyClassification(ctx context.Context, rt *typeRoute, acct *pluginv1.Account, status int, header http.Header,
	body []byte, transportErr string, cls *pluginv1.ClassifyErrorResponse) attemptResult {
	if c.failurePolicy != nil && !c.tokenCounting() {
		res := c.classifyFailure(ctx, acct.GetId(), status, header, body, transportErr, rt.conv != nil)
		if res.err != nil {
			res.err.LocalFailure = cls.GetLocalFailure()
		}
		if status > 0 {
			c.applyPluginAccountState(ctx, acct.GetId(), cls)
		}
		return res
	}
	reason, failover := cls.GetReason(), false
	if !c.tokenCounting() {
		c.applyQuotaObservation(ctx, acct.GetId(), cls.GetQuota())
		reason, failover = c.applyAccountEffect(ctx, acct, status, body, transportErr, cls)
	}

	clientStatus := int(cls.GetClientStatus())
	if clientStatus == 0 {
		clientStatus = status
	}
	if clientStatus < 400 || clientStatus > 599 {
		clientStatus = http.StatusBadGateway
	}
	e := &gwError{Status: clientStatus, Type: cls.GetClientErrorType(), Message: cls.GetClientMessage(), LocalFailure: cls.GetLocalFailure(),
		RecordType: errTypeUpstream, Code: clientErrorCode(ctx, cls.GetClientErrorCode(), rt.binding.Plugin.Key)}
	if rt.conv != nil {
		// The upstream speaks another protocol: its error body and error
		// types do not fit the endpoint's errorFormat, which always wins.
		e.Type = ""
	} else if e.Type == "" && e.Message == "" && e.Code == codeUpstreamError && len(body) > 0 {
		// Nothing the plugin said would survive rendering, so the upstream
		// body is returned verbatim. A plugin that did name a code is asking
		// for the rendered envelope instead - passing the body through would
		// throw that code away, which is the very thing client_error_code
		// exists to stop. (A rejected code leaves e.Code generic and the old
		// passthrough applies, as before this field existed.)
		e.Raw = body
	}
	if e.Message == "" {
		if transportErr != "" {
			e.Message = "upstream request failed"
		} else {
			e.Message = "upstream returned HTTP " + itoa(int64(status))
		}
	}
	c.rec.ErrorMessage = truncateUTF8(firstNonEmpty(reason, transportErr, e.Message), 1000)
	if !failover && cls.GetAction() == pluginv1.ClassifyErrorResponse_ACTION_RETURN_TO_CLIENT {
		return attemptResult{kind: attemptReturn, err: e}
	}
	return attemptResult{kind: attemptFailover, err: e}
}

// applyAccountEffect cools down or disables the account as the plugin and the
// administrator's auto-disable rules ask (CONTRACTS §42.1). It returns the
// reason recorded for the attempt and whether the attempt must fail over
// regardless of the plugin's action (an administrator rule disabled the
// account).
func (c *call) applyAccountEffect(ctx context.Context, acct *pluginv1.Account, status int, body []byte,
	transportErr string, cls *pluginv1.ClassifyErrorResponse) (reason string, failover bool) {
	ctx = context.WithoutCancel(ctx)
	effect, reason := cls.GetAccountEffect(), cls.GetReason()
	automatic := cls.GetAutomaticState()
	if automatic != nil && automatic.GetAction() != pluginv1.AccountAutomaticState_ACTION_DISABLE {
		automatic = nil
	}
	if automatic != nil {
		effect, reason = pluginv1.ClassifyErrorResponse_ACCOUNT_EFFECT_COOLDOWN, automatic.GetReason()
		// A disable with a release time is applied as such; without one, or
		// when the account may not be disabled, it stays a cooldown.
		if c.pluginAutoDisable(ctx, acct.GetId(), automatic) {
			effect = pluginv1.ClassifyErrorResponse_ACCOUNT_EFFECT_UNSPECIFIED
		}
	}
	if effect == pluginv1.ClassifyErrorResponse_ACCOUNT_EFFECT_DISABLE {
		effect = pluginv1.ClassifyErrorResponse_ACCOUNT_EFFECT_COOLDOWN
	}
	if status > 0 && !cls.GetLocalFailure() {
		if rule := c.autoDisable.rule(status, body, transportErr); rule != "" {
			effect, reason, failover = pluginv1.ClassifyErrorResponse_ACCOUNT_EFFECT_DISABLE, rule, true
		}
	}
	switch effect {
	case pluginv1.ClassifyErrorResponse_ACCOUNT_EFFECT_COOLDOWN:
		c.cooldown(ctx, acct.Id, time.Unix(cls.GetCooldownUntilUnix(), 0), reason)
	case pluginv1.ClassifyErrorResponse_ACCOUNT_EFFECT_DISABLE:
		if !c.autoDisableAccount(ctx, acct.Id, reason) {
			c.cooldown(ctx, acct.Id, time.Time{}, "auto-disable off, cooling down: "+reason)
		}
	}
	return reason, failover
}

// pluginAutoDisable applies a plugin's temporary disable (automatic_state
// DISABLE with a release time, e.g. CCGateway's 429 until the quota resets):
// the account is auto_disabled until then, so neither another attempt of this
// request nor a sticky session picks it, and the core's sweep makes it active
// again at the release time (CONTRACTS §69). A disable without a release time
// or with one already past is not applied here. It reports whether the
// account is disabled now.
func (c *call) pluginAutoDisable(ctx context.Context, id int64, st *pluginv1.AccountAutomaticState) bool {
	if st == nil || st.GetAction() != pluginv1.AccountAutomaticState_ACTION_DISABLE {
		return false
	}
	now := c.g.now()
	var release time.Time
	switch r := st.GetRelease().(type) {
	case *pluginv1.AccountAutomaticState_UntilUnix:
		release = time.Unix(r.UntilUnix, 0)
	case *pluginv1.AccountAutomaticState_DurationSeconds:
		release = now.Add(time.Duration(r.DurationSeconds) * time.Second)
	}
	if !release.After(now) {
		return false
	}
	ctx, cancel := context.WithTimeout(context.WithoutCancel(ctx), 2*time.Second)
	defer cancel()
	reason := st.GetReason()
	if reason == "" {
		reason = "disabled by the account plugin until " + release.UTC().Format(time.RFC3339)
	}
	disabled, err := c.g.d.Accounts.AutoDisableUntil(ctx, id, reason, release)
	if err != nil {
		slog.WarnContext(ctx, "gateway: disable account until release", "account", id, "err", err)
		return false
	}
	if s := c.sticky; disabled && s != nil && s.bound == id {
		if c.failurePolicy != nil {
			if !s.keep {
				c.failureState.stickyErr = c.releaseBinding(ctx, id)
			}
		} else {
			c.dropBinding(ctx, s)
		}
	}
	return disabled
}

// applyPluginAccountState is the part of a plugin's classification a
// published failure policy still takes (CONTRACTS §69): the quota the answer
// names and a temporary disable. Retries, cooldowns and the client reply stay
// the policy's.
func (c *call) applyPluginAccountState(ctx context.Context, id int64, cls *pluginv1.ClassifyErrorResponse) {
	c.applyQuotaObservation(ctx, id, cls.GetQuota())
	s := &c.failureState
	if s.blocked {
		return
	}
	if c.pluginAutoDisable(ctx, id, cls.GetAutomaticState()) {
		s.blocked, s.accountResult = true, "disabled_by_plugin"
		if n := len(s.events); n > 0 && s.events[n-1].AccountID == id {
			s.events[n-1].AccountResult = s.accountResult
		}
	}
}

// autoDisableAccount disables the account when both the global switch and
// the account allow it, dropping a sticky binding to it. It reports whether
// the account is disabled.
func (c *call) autoDisableAccount(ctx context.Context, id int64, reason string) bool {
	if !c.autoDisable.Enabled {
		return false
	}
	disabled, err := c.g.d.Accounts.AutoDisable(ctx, id, reason)
	if err != nil {
		slog.WarnContext(ctx, "gateway: disable account", "account", id, "err", err)
		return false
	}
	if s := c.sticky; disabled && s != nil && s.bound == id {
		c.dropBinding(ctx, s)
	}
	return disabled
}

// cooldown excludes the account until the given time, or for defaultCooldown
// when it is not in the future.
func (c *call) cooldown(ctx context.Context, id int64, until time.Time, reason string) {
	if !until.After(c.g.now()) {
		until = c.g.now().Add(defaultCooldown)
	}
	if err := c.g.d.Accounts.SetCooldown(ctx, id, until, reason); err != nil {
		slog.WarnContext(ctx, "gateway: set cooldown", "account", id, "err", err)
	}
}

// defaultClassification is used when ClassifyError itself fails.
func defaultClassification(status int) *pluginv1.ClassifyErrorResponse {
	r := &pluginv1.ClassifyErrorResponse{}
	if status == 0 || status == http.StatusTooManyRequests || status == http.StatusRequestTimeout || status >= 500 {
		r.Action = pluginv1.ClassifyErrorResponse_ACTION_FAILOVER
	} else {
		r.Action = pluginv1.ClassifyErrorResponse_ACTION_RETURN_TO_CLIENT
	}
	return r
}

func firstNonEmpty(s ...string) string {
	for _, v := range s {
		if v != "" {
			return v
		}
	}
	return ""
}
