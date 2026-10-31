package gateway

import (
	"bytes"
	"context"
	"errors"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/ccgateway"
	"io"
	"log/slog"
	"net/http"
	"net/http/httptrace"
	"net/url"
	"sort"
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
	cands := make([]core.AccountRef, 0, len(all))
	creditExcluded := false
	for i := range all {
		if !c.candidateEligible(&all[i]) {
			continue
		}
		if !c.creditAccountAllowed(&all[i]) {
			creditExcluded = true
			continue
		}
		cands = append(cands, all[i])
	}
	if len(cands) == 0 && creditExcluded && c.creditRequest != nil && c.creditRequest.lookupError != nil {
		c.fail(c.creditRequest.lookupError)
		return
	}
	cands, availabilityErr := c.filterAvailability(ctx, cands)
	if availabilityErr != nil {
		c.fail(availabilityErr)
		return
	}
	c.sticky = c.resolveSticky(ctx)
	if c.failureState.stickyErr != nil {
		c.fail(fromCore(core.ErrUnavailable.WithMessage("sticky store unavailable"), errTypeInternal))
		return
	}
	c.session = c.sessionIdentity()
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
				if busy {
					last = fromCore(core.ErrRateLimited.WithMessage("all accounts are busy or rate limited, please retry later"), errTypeNoAccount)
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
				last = fromCore(core.ErrRateLimited.WithMessage("all accounts are busy or rate limited, please retry later"), errTypeNoAccount)
				continue
			}
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
			last = res.err
			if stickyAttempt && c.sticky.rule.OnFailure == onFailureStick {
				// Protect the upstream cache: do not move the session.
				c.fail(last)
				c.finishSticky(ctx, ref.ID, false)
				return
			}
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

// sessionIdentity is the request's session for the limiter's
// sessions-per-minute caps (CONTRACTS §71): the sticky session key when a
// rule matched, else the request itself is a new session (as new-api does).
func (c *call) sessionIdentity() string {
	if c.sticky != nil {
		return c.sticky.key
	}
	return "req:" + c.rid
}

// pick chooses the next account: the sticky binding first (when usable),
// then by priority with weighted random order inside a priority (CONTRACTS
// §18), over the priority/weight the scheduler.rank plugins left for this
// request (CONTRACTS §24). Accounts whose rate-limit window is exhausted are
// skipped. It returns busy when candidates exist but none could be used
// right now.
func (c *call) pick(ctx context.Context, cands []core.AccountRef, excluded map[int64]bool) (*core.AccountRef, func(), bool) {
	exhausted := c.exhausted(ctx, cands, excluded)
	if ref, release, _ := c.tryStickyBinding(ctx, cands, excluded, exhausted); ref != nil {
		return ref, release, false
	}
	// Plugins may rewrite the priority/weight of the candidates for this
	// request (CONTRACTS §24); everything below still gates them.
	over := c.rankOverrides(ctx, cands)
	var pool []core.AccountRef
	limited := false
	for i := range cands {
		if excluded[cands[i].ID] || !c.usable(&cands[i]) {
			continue
		}
		if exhausted[cands[i].ID] {
			limited = true
			continue
		}
		ref := cands[i]
		if o, ok := over[ref.ID]; ok {
			if o.weight == 0 {
				continue // a plugin took the account out of this request
			}
			ref.Priority, ref.Weight = o.priority, o.weight
		}
		pool = append(pool, ref)
	}
	if len(pool) == 0 {
		return nil, nil, limited
	}
	sort.SliceStable(pool, func(i, j int) bool { return pool[i].Priority < pool[j].Priority })
	for i := 0; i < len(pool); {
		j := i
		for j < len(pool) && pool[j].Priority == pool[i].Priority {
			j++
		}
		weightedOrder(pool[i:j], c.g.randFloat)
		i = j
	}
	for i := range pool {
		ref := pool[i]
		if release, ok := c.acquireAccount(ctx, &ref); ok {
			return &ref, release, false
		}
	}
	return nil, nil, true
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
		// An unusable type (request not convertible) keeps the binding; an
		// exhausted rate window counts as "no free slot".
		if c.usable(bound) && !exhausted[bound.ID] {
			if release, ok := c.acquireAccount(ctx, bound); ok {
				s.hit = true
				return bound, release, true
			}
		}
		return nil, nil, true
	}
	if cooling, err := c.g.d.Accounts.IsCoolingDown(ctx, s.bound); c.failurePolicy == nil && err == nil && !cooling {
		// Not in the group's schedulable set for this request and
		// not merely cooling down: disabled, deleted, unschedulable,
		// moved, or of a type that cannot serve this endpoint.
		c.dropBinding(ctx, s)
	}
	return nil, nil, true
}

// exhausted asks the limiter which candidates reached a rate limit. Limiter
// failures do not block scheduling.
func (c *call) exhausted(ctx context.Context, cands []core.AccountRef, excluded map[int64]bool) map[int64]bool {
	lim := c.g.d.Limiter
	if lim == nil {
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
// its weight (weight <= 0 counts as 1). rnd yields [0,1).
func weightedOrder(grp []core.AccountRef, rnd func() float64) {
	w := func(a *core.AccountRef) float64 {
		if a.Weight <= 0 {
			return 1
		}
		return float64(a.Weight)
	}
	for i := 0; i < len(grp)-1; i++ {
		total := 0.0
		for j := i; j < len(grp); j++ {
			total += w(&grp[j])
		}
		r := rnd() * total
		for j := i; j < len(grp); j++ {
			r -= w(&grp[j])
			if r < 0 || j == len(grp)-1 {
				grp[i], grp[j] = grp[j], grp[i]
				break
			}
		}
	}
}

// acquireAccount takes a concurrency slot of the account and, when the
// request's model is in one of the account's model lists, one of that list
// (CONTRACTS §68); either being full makes the account busy.
func (c *call) acquireAccount(ctx context.Context, ref *core.AccountRef) (func(), bool) {
	leaseCtx, release, ok, err := core.AcquireSlot(ctx, c.g.d.Slots, "account", ref.ID, ref.MaxConcurrency, c.rid)
	if err != nil {
		slog.WarnContext(ctx, "gateway: acquire account slot", "account", ref.ID, "err", err)
		return nil, false
	}
	if !ok {
		return nil, false
	}
	if l := ref.ModelLimitFor(c.model); l != nil {
		listCtx, releaseList, ok, err := core.AcquireSlot(leaseCtx, c.g.d.Slots, core.ModelLimitSlots(l.Key()), ref.ID, l.MaxConcurrency, c.rid)
		if err != nil {
			slog.WarnContext(ctx, "gateway: acquire model list slot", "account", ref.ID, "err", err)
		}
		if err != nil || !ok {
			release()
			return nil, false
		}
		releaseAccount := release
		leaseCtx, release = listCtx, func() { releaseList(); releaseAccount() }
	}
	c.slotCtx = leaseCtx
	return release, true
}

// admitRate asks the limiter to admit one request of the call's model and
// session on ref and remembers the model list its tokens are counted in.
func (c *call) admitRate(ref *core.AccountRef) (bool, error) {
	ok, err := c.g.d.Limiter.TryHit(c.slotCtx, *ref, c.model, c.session)
	if ok && err == nil {
		c.rateList.id, c.rateList.key = ref.ID, ""
		if l := ref.ModelLimitFor(c.model); l != nil {
			c.rateList.key = l.Key()
		}
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

	// Convert the request body to the upstream protocol when needed.
	upBody, err := rt.upstreamBody(c.body)
	if err != nil {
		slog.InfoContext(ctx, "gateway: request conversion failed", "from", c.ep.Protocol, "to", rt.upstream, "err", err)
		kind, code := attemptFailover, core.ErrInvalidArgument.Code
		var admission *convert.RequestError
		if errors.As(err, &admission) {
			kind, code = attemptReturn, "unsupported_conversion"
		}
		return attemptResult{kind: kind, err: &gwError{Status: http.StatusBadRequest, Code: code,
			Message: "request cannot be converted to " + rt.upstream + ": " + err.Error(), RecordType: errTypeInvalidRequest}}
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
	fields := map[string]string{}
	for _, p := range rt.requestFields {
		if r := getJSON(upBody, p); r != "" {
			fields[p] = r
		}
	}
	env := c.environment(ref)
	meta := c.metaFor(rt)
	meta.Model, meta.Environment = upModel, env
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
	return c.forwardBuilt(ctx, rt, acc, pacct, upBody, built, nil)
}

// validatePatches runs the guards that a plugin-built upstream request must
// pass before it is sent: resource and model references must stay consistent
// with the original body, and the account's usage rules must be able to meter
// the operation and its attempts. The kind differs per guard on purpose: an
// unaddressable resource reference is the client's mistake and is returned
// (attemptReturn), everything else fails over.
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

func (c *call) forwardBuilt(ctx context.Context, rt *typeRoute, acc *core.Account, pacct *pluginv1.Account, upBody []byte, built *pluginv1.BuildUpstreamRequestResponse, execution *gatewayExecution) attemptResult {
	prepareCtx := ctx
	if execution != nil {
		var cancel context.CancelFunc
		prepareCtx, cancel = context.WithTimeout(ctx, 15*time.Second)
		defer cancel()
	}
	if built.GetUpstreamModel() != "" {
		c.rec.UpstreamModel = built.GetUpstreamModel()
	}
	managedCCG := ccgateway.IsManaged(acc.PluginKey, acc.Type, built.GetUrl()) && c.g.d.CCGateway != nil
	var target *url.URL
	var err error
	if managedCCG {
		target, err = url.Parse(built.GetUrl())
	} else {
		target, err = c.g.checkUpstreamURL(prepareCtx, built.GetUrl())
	}
	if err != nil {
		slog.WarnContext(ctx, "gateway: upstream url rejected", "plugin", rt.binding.Plugin.Key, "account", acc.ID, "err", err)
		return attemptResult{kind: attemptFailover, err: fromCore(core.ErrUnavailable.WithMessage("upstream address rejected"), errTypeInternal)}
	}
	body, err := applyPatches(upBody, built.GetPatches())
	if err != nil {
		return attemptResult{kind: attemptFailover, err: fromCore(core.ErrPluginUnavailable.WithCause(err), errTypePluginUnavailable)}
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
	uctx, ucancel := context.WithCancel(ctx)
	defer ucancel()
	env := c.environment(&acc.AccountRef)
	var relayTimedOut atomic.Bool
	if total := env.Duration(core.EnvRelayTimeoutSeconds); total > 0 {
		relayTimer := time.AfterFunc(total, func() {
			relayTimedOut.Store(true)
			ucancel()
		})
		defer relayTimer.Stop()
	}
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
	for k, v := range built.GetHeaders() {
		switch strings.ToLower(k) {
		case "host":
			req.Host = v
		case "content-length", "accept-encoding", "connection", "transfer-encoding":
			// Managed by the transport (transparent gzip, framing).
		default:
			req.Header.Set(k, v)
		}
	}
	if req.Header.Get("Content-Type") == "" && reqBody != nil {
		req.Header.Set("Content-Type", "application/json")
	}
	if err := c.applyResourceHeaders(prepareCtx, req, acc, body); err != nil {
		return c.resourcePreparationFailure(err)
	}
	if err := c.applyCreditHeaders(prepareCtx, req, acc, body); err != nil {
		return c.resourcePreparationFailure(err)
	}
	if err := c.wrapHelperHistoryRequest(prepareCtx, req, acc, rt, body); err != nil {
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
		expected := acc.MapModel(c.model)
		if built.GetUpstreamModel() != "" && built.GetUpstreamModel() != expected {
			return attemptResult{kind: attemptFailover, err: availabilityFailure(false)}
		}
		if rt.modelPath != "" {
			actual := gjson.GetBytes(body, rt.modelPath)
			if (actual.Exists() || gjson.GetBytes(upBody, rt.modelPath).Exists()) && (actual.Type != gjson.String || actual.Str != expected) {
				return attemptResult{kind: attemptFailover, err: availabilityFailure(false)}
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

	headerWait := c.g.headerWait(c.stream)
	if d := env.Duration(core.EnvResponseHeaderTimeoutSeconds); d > 0 {
		headerWait = d
	}
	timer := time.AfterFunc(headerWait, ucancel)
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
	headerTimedOut := !timer.Stop()
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
		switch {
		case relayTimedOut.Load():
			msg = "upstream request exceeded relay_timeout_seconds"
		case headerTimedOut:
			msg = "timeout waiting for upstream response headers"
		}
		if execution != nil {
			return execution.classify(ctx, 0, nil, nil, msg)
		}
		return c.classify(ctx, rt, pacct, 0, nil, nil, msg)
	}
	if idle := env.Duration(core.EnvStreamingIdleTimeoutSeconds); idle > 0 && c.stream {
		resp.Body = newIdleBody(resp.Body, idle, ucancel)
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
			e := &gwError{Status: http.StatusBadGateway, Code: "upstream_response_incomplete", RecordType: errTypeUpstream, Message: "Could not read the complete upstream error response", LocalFailure: true}
			if execution != nil {
				execution.localFailure = e
			}
			return attemptResult{kind: attemptReturn, err: e}
		}
		raw := body.prefix
		ct := resp.Header.Get("Content-Type")
		if resp.StatusCode >= 500 {
			// A server error names no cause in the usage log; who answered
			// (a proxy on the way or the upstream itself) is in these.
			slog.WarnContext(ctx, "gateway: upstream server error", "request_id", c.rid, "plugin", rt.binding.Plugin.Key,
				"account", acc.ID, "status", resp.StatusCode, "content_type", ct, "server", resp.Header.Get("Server"),
				"upstream_request_id", resp.Header.Get("Request-Id"), "body", truncateUTF8(string(raw), 300))
		}
		var res attemptResult
		if execution != nil {
			execution.errorBody = body
			res = execution.classify(ctx, resp.StatusCode, resp.Header, raw, "")
		} else {
			res = c.classify(ctx, rt, pacct, resp.StatusCode, resp.Header, raw, "")
		}
		if c.ep.TaskSubmit() {
			c.recordTaskFailure(ctx, resp.StatusCode, raw, "upstream rejected task submission")
			res.kind = attemptReturn
		}
		c.preserveHTTPError(res.err, resp.StatusCode, resp.Header, body)
		return res
	}
	if execution != nil {
		return execution.forward(ctx, resp)
	}
	if c.ep.TaskSubmit() {
		return c.forwardTask(ctx, rt, pacct, resp, upBody)
	}
	return c.forward(ctx, rt, pacct, resp, upBody)
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

// classify asks the account type's plugin what an upstream failure means,
// applies the account effect and decides between failover and returning the
// error.
func (c *call) classify(ctx context.Context, rt *typeRoute, acct *pluginv1.Account,
	status int, header http.Header, body []byte, transportErr string) attemptResult {
	if c.failurePolicy != nil {
		res := c.classifyFailure(ctx, acct.GetId(), status, header, body, transportErr, rt.conv != nil)
		if status > 0 {
			// The policy decides retries and the reply; the plugin still
			// tells what the answer means for the account (CONTRACTS §69).
			c.applyPluginAccountState(ctx, acct.GetId(), c.classifyWithPlugin(ctx, rt, acct, status, header, body, transportErr))
		}
		return res
	}
	return c.applyClassification(ctx, rt, acct, status, body, transportErr, c.classifyWithPlugin(ctx, rt, acct, status, header, body, transportErr))
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

func (c *call) applyClassification(ctx context.Context, rt *typeRoute, acct *pluginv1.Account, status int, body []byte, transportErr string, cls *pluginv1.ClassifyErrorResponse) attemptResult {
	if c.failurePolicy != nil {
		res := c.classifyFailure(ctx, acct.GetId(), status, nil, body, transportErr, rt.conv != nil)
		if res.err != nil {
			res.err.LocalFailure = cls.GetLocalFailure()
		}
		if status > 0 {
			c.applyPluginAccountState(ctx, acct.GetId(), cls)
		}
		return res
	}
	c.applyQuotaObservation(ctx, acct.GetId(), cls.GetQuota())
	reason, failover := c.applyAccountEffect(ctx, acct, status, body, transportErr, cls)

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
				c.failureState.stickyErr = c.writePolicyBinding(ctx, s, 0)
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
