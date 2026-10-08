package gateway

import (
	"bytes"
	"context"
	"errors"
	"github.com/Sub2API-Devs/sup2api/next/plugins/ccgateway/companions/contracts/httpfacts"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/ccgateway"
	"io"
	"log/slog"
	"net/http"
	"net/url"
	"sort"
	"strings"
	"time"

	pluginv1 "github.com/Sub2API-Devs/sup2api/next/sdk/gen/pluginv1"
	"github.com/tidwall/gjson"
	"github.com/tidwall/sjson"

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
	cands := make([]core.AccountRef, 0, len(all))
	creditExcluded := false
	diagnosticExcluded := false
	for i := range all {
		if c.route(&all[i]) == nil || !c.servesAllModels(&all[i]) || !c.resourceAccountAllowed(&all[i]) {
			continue
		}
		if !c.diagnosticAccountAllowed(&all[i]) {
			diagnosticExcluded = true
			continue
		}
		if !c.creditAccountAllowed(&all[i]) {
			creditExcluded = true
			continue
		}
		cands = append(cands, all[i])
	}
	if len(cands) == 0 && diagnosticExcluded && c.diagnosticRequest != nil && c.diagnosticRequest.lookupError != nil {
		c.fail(c.diagnosticRequest.lookupError)
		return
	}
	if len(cands) == 0 && creditExcluded && c.creditRequest != nil && c.creditRequest.lookupError != nil {
		c.fail(c.creditRequest.lookupError)
		return
	}
	c.sticky = c.resolveSticky(ctx)
	c.session = c.sessionIdentity()
	excluded := map[int64]bool{}
	var last *gwError
	var lastAccount int64
	attempts := 0
	defer func() {
		c.rec.Attempts = attempts
	}()
	for attempts < c.gw.MaxAttempts {
		ref, release, busy := c.pick(ctx, cands, excluded)
		if ref == nil {
			if last == nil {
				if busy {
					last = fromCore(core.ErrRateLimited.WithMessage("all accounts are busy or rate limited, please retry later"), errTypeNoAccount)
				} else {
					last = fromCore(core.ErrNoAvailableAccount, errTypeNoAccount)
				}
			}
			break
		}
		if lim := c.g.d.Limiter; lim != nil {
			admitted, err := lim.TryHit(c.slotCtx, *ref, c.session)
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
		res := func() attemptResult { defer release(); return c.attempt(c.slotCtx, ref, attempts-1) }()
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
			if c.creditDispatched {
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
	if last == nil || (last.RecordType != errTypeUpstream && last.RecordType != errTypeInvalidRequest &&
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

// sessionIdentity is the request's session for the limiter: the sticky
// session key when a rule matched, else a per-request identity.
func (c *call) sessionIdentity() string {
	if c.sticky != nil && c.sticky.key != "" {
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
	if s := c.sticky; s != nil && !s.tried {
		s.tried = true
		if s.bound != 0 && !excluded[s.bound] {
			var bound *core.AccountRef
			for i := range cands {
				if cands[i].ID == s.bound {
					bound = &cands[i]
					break
				}
			}
			if bound != nil {
				// An unusable type (request not convertible) keeps the binding;
				// an exhausted rate window counts as "no free slot".
				if c.usable(bound) && !exhausted[bound.ID] {
					if release, ok := c.acquireAccount(ctx, bound); ok {
						s.hit = true
						return bound, release, false
					}
				}
			} else if cooling, err := c.g.d.Accounts.IsCoolingDown(ctx, s.bound); err == nil && !cooling {
				// Not in the group's schedulable set for this request and
				// not merely cooling down: disabled, deleted, unschedulable,
				// moved, or of a type that cannot serve this endpoint.
				c.dropBinding(ctx, s)
			}
		}
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
	out, err := lim.Exhausted(ctx, limited, c.session)
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

func (c *call) acquireAccount(ctx context.Context, ref *core.AccountRef) (func(), bool) {
	leaseCtx, release, ok, err := core.AcquireSlot(ctx, c.g.d.Slots, "account", ref.ID, ref.MaxConcurrency, c.rid)
	if err != nil {
		slog.WarnContext(ctx, "gateway: acquire account slot", "account", ref.ID, "err", err)
		return nil, false
	}
	if !ok {
		return nil, false
	}
	c.slotCtx = leaseCtx
	return release, true
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
	pacct := &pluginv1.Account{Id: acc.ID, Name: acc.Name, Platform: c.platform, Type: rt.binding.Type.ID,
		CredentialsJson: string(acc.Credentials), SettingsJson: string(acc.Settings)}

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
	meta := c.metaFor(rt)
	meta.Model = upModel
	buildRequest := &pluginv1.BuildUpstreamRequestRequest{Meta: meta, Account: pacct, Fields: fields, InboundHeaders: c.passHeaders(rt.passHeaders), Attempt: int32(n)}
	if c.canExecute(rt) {
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
	if err := c.validateResourceReferencePatches(rt.upstream, upBody, body); err != nil {
		return attemptResult{kind: attemptReturn, err: invalidModelReference(err.Error())}
	}
	if err := c.validatePatchedModelReferences(upBody, body); err != nil {
		return attemptResult{kind: attemptFailover, err: invalidModelReference(err.Error())}
	}
	if err := validateModelReferencePatches(upBody, body, rt.modelReferences); err != nil {
		return attemptResult{kind: attemptFailover, err: invalidModelReference(err.Error())}
	}
	if c.ep.Billing != "free" && !c.routeHasRequiredPrimaryUsageFor(rt, body) {
		return attemptResult{kind: attemptFailover, err: invalidModelReference("account usage rules cannot meter the requested operation")}
	}
	if c.ep.Billing != "free" && !c.routeHasRequiredAttempts(rt, body) {
		return attemptResult{kind: attemptFailover, err: invalidModelReference("account usage rules cannot meter the requested attempts")}
	}
	var client *http.Client
	if managedCCG {
		client = c.g.d.CCGateway.ModelClientFor(acc.ID, acc.ProxyID)
	} else {
		client, err = c.g.d.Proxies.HTTPClient(prepareCtx, acc.ProxyID)
	}
	if err != nil || client == nil {
		return attemptResult{kind: attemptFailover, err: fromCore(core.ErrUnavailable.WithCause(err), errTypeInternal)}
	}

	// Send. Canceling ctx (client gone) cancels the upstream request.
	uctx, ucancel := context.WithCancel(ctx)
	defer ucancel()
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
	if err := c.applyDiagnosticHeaders(prepareCtx, req, acc, body); err != nil {
		return c.resourcePreparationFailure(err)
	}

	hc := *client
	hc.CheckRedirect = func(*http.Request, []*http.Request) error { return http.ErrUseLastResponse }
	hc.Timeout = 0
	if c.ep.TaskSubmit() {
		if err := c.beginTask(prepareCtx); err != nil {
			return attemptResult{kind: attemptReturn, err: fromCore(core.ErrUnavailable.WithMessage("task registration unavailable").WithCause(err), errTypeInternal)}
		}
	}

	timer := time.AfterFunc(c.g.headerWait(c.stream), ucancel)
	if execution != nil {
		execution.sent = true
	}
	if c.creditRequest != nil && c.creditRequest.tokenPresent {
		c.creditDispatched = true
	}
	resp, err := hc.Do(req)
	headerTimedOut := !timer.Stop()
	if err != nil {
		if c.ep.TaskSubmit() {
			return c.taskFailure(ctx, "task submission outcome is uncertain", err)
		}
		if ctx.Err() != nil {
			return attemptResult{kind: attemptCanceled, err: canceledErr()}
		}
		msg := err.Error()
		if headerTimedOut {
			msg = "timeout waiting for upstream response headers"
		}
		if execution != nil {
			return execution.classify(ctx, 0, nil, nil, msg)
		}
		return c.classify(ctx, rt, pacct, 0, nil, nil, msg)
	}
	defer resp.Body.Close()
	c.g.observeQuota(rt, acc.ID, resp.StatusCode, resp.Header)

	if resp.StatusCode < 200 || resp.StatusCode > 299 {
		raw, _ := readPrefix(resp.Body, maxErrorBody)
		ct := resp.Header.Get("Content-Type")
		var res attemptResult
		if execution != nil {
			res = execution.classify(ctx, resp.StatusCode, resp.Header, raw, "")
		} else {
			res = c.classify(ctx, rt, pacct, resp.StatusCode, resp.Header, raw, "")
		}
		if c.ep.TaskSubmit() {
			c.recordTaskFailure(ctx, resp.StatusCode, raw, "upstream rejected task submission")
			res.kind = attemptReturn
		}
		if res.err != nil && res.err.Raw != nil {
			res.err.ContentType = ct
		}
		if res.err != nil {
			res.err.Headers = httpfacts.Select(resp.Header)
		}
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

	return c.applyClassification(ctx, rt, acct, status, body, transportErr, cls)
}

func (c *call) applyClassification(ctx context.Context, rt *typeRoute, acct *pluginv1.Account, status int, body []byte, transportErr string, cls *pluginv1.ClassifyErrorResponse) attemptResult {
	reason, failover := c.applyAccountEffect(ctx, acct, status, body, transportErr, cls)

	clientStatus := int(cls.GetClientStatus())
	if clientStatus == 0 {
		clientStatus = status
	}
	if clientStatus < 400 || clientStatus > 599 {
		clientStatus = http.StatusBadGateway
	}
	e := &gwError{Status: clientStatus, Type: cls.GetClientErrorType(), Message: cls.GetClientMessage(),
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
	if effect != pluginv1.ClassifyErrorResponse_ACCOUNT_EFFECT_DISABLE {
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
