package gateway

import (
	"bytes"
	"context"
	"errors"
	"io"
	"log/slog"
	"net/http"
	"sort"
	"strings"
	"time"

	pluginv1 "github.com/Sub2API-Devs/sup2api/next/sdk/gen/pluginv1"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/core"
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
func (c *call) dispatch(ctx context.Context, platforms []core.PlatformBinding) {
	ids := make([]string, 0, len(platforms))
	for _, pb := range platforms {
		ids = append(ids, pb.Platform.ID)
	}
	cands, err := c.g.d.Accounts.Candidates(ctx, c.principal.Group.ID, ids)
	if err != nil {
		c.fail(fromCore(core.ErrUnavailable.WithCause(err), errTypeInternal))
		return
	}
	c.sticky = c.resolveSticky(ctx)
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
					last = fromCore(core.ErrRateLimited.WithMessage("all accounts are busy, please retry later"), errTypeNoAccount)
				} else {
					last = fromCore(core.ErrNoAvailableAccount, errTypeNoAccount)
				}
			}
			break
		}
		attempts++
		stickyAttempt := c.sticky != nil && c.sticky.hit && c.sticky.bound == ref.ID
		res := c.attempt(ctx, ref, attempts-1)
		release()
		lastAccount = ref.ID
		switch res.kind {
		case attemptDone:
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
	if last == nil || (last.RecordType != errTypeUpstream && last.Status != http.StatusTooManyRequests) {
		// Only upstream answers are worth relaying; plugin or account
		// problems surface as "no available account".
		last = fromCore(core.ErrNoAvailableAccount, errTypeNoAccount)
	}
	if lastAccount != 0 && c.rec.AccountID == nil {
		id := lastAccount
		c.rec.AccountID = &id
	}
	c.fail(last)
	c.finishSticky(ctx, 0, false)
}

// pick chooses the next account: the sticky binding first (when usable),
// then by priority with random order inside a priority. It returns busy when
// candidates exist but none had a free concurrency slot.
func (c *call) pick(ctx context.Context, cands []core.AccountRef, excluded map[int64]bool) (*core.AccountRef, func(), bool) {
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
				if release, ok := c.acquireAccount(ctx, bound); ok {
					s.hit = true
					return bound, release, false
				}
			} else if cooling, err := c.g.d.Accounts.IsCoolingDown(ctx, s.bound); err == nil && !cooling {
				// Not in the group's schedulable set and not merely cooling
				// down: disabled, deleted, unschedulable or moved.
				c.dropBinding(ctx, s)
			}
		}
	}
	var pool []core.AccountRef
	for _, a := range cands {
		if !excluded[a.ID] {
			pool = append(pool, a)
		}
	}
	if len(pool) == 0 {
		return nil, nil, false
	}
	sort.SliceStable(pool, func(i, j int) bool { return pool[i].Priority < pool[j].Priority })
	for i := 0; i < len(pool); {
		j := i
		for j < len(pool) && pool[j].Priority == pool[i].Priority {
			j++
		}
		grp := pool[i:j]
		c.g.shuffle(len(grp), func(a, b int) { grp[a], grp[b] = grp[b], grp[a] })
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

func (c *call) acquireAccount(ctx context.Context, ref *core.AccountRef) (func(), bool) {
	release, ok, err := c.g.d.Slots.Acquire(ctx, "account", ref.ID, ref.MaxConcurrency, c.rid)
	if err != nil {
		slog.WarnContext(ctx, "gateway: acquire account slot", "account", ref.ID, "err", err)
		return nil, false
	}
	if !ok {
		return nil, false
	}
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
	pb, ok := c.gen.Platform(acc.Platform)
	if !ok || pb.Client == nil {
		return unavailable("platform not enabled", errors.New(acc.Platform))
	}
	id := acc.ID
	c.rec.AccountID = &id
	c.rec.Platform = acc.Platform
	c.rec.PluginKey, c.rec.PluginVersion = pb.Plugin.Key, pb.Plugin.Version
	c.rec.UsageSemantics = pb.Platform.Usage.Semantics
	if c.rec.UsageSemantics == "" {
		c.rec.UsageSemantics = "exclusive"
	}
	if c.prices != nil {
		c.rec.Price = c.prices[acc.Platform]
		c.capturePriceInputs(c.rec.Price)
	}
	pacct := &pluginv1.Account{Id: acc.ID, Name: acc.Name, Platform: acc.Platform, Type: acc.Type,
		CredentialsJson: string(acc.Credentials), SettingsJson: string(acc.Settings)}

	// Build the upstream request (platform plugin).
	fields := map[string]string{}
	for _, p := range pb.Platform.RequestFields {
		if r := getJSON(c.body, p); r != "" {
			fields[p] = r
		}
	}
	bctx, cancel := context.WithTimeout(ctx, c.gw.platformTimeout())
	built, err := pb.Client.BuildUpstreamRequest(bctx, &pluginv1.BuildUpstreamRequestRequest{
		Meta: c.meta(), Account: pacct, Fields: fields,
		InboundHeaders: c.passHeaders(pb.Platform.PassHeaders), Attempt: int32(n),
	})
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
	if built.GetUpstreamModel() != "" {
		c.rec.UpstreamModel = built.GetUpstreamModel()
	}
	target, err := c.g.checkUpstreamURL(ctx, built.GetUrl())
	if err != nil {
		slog.WarnContext(ctx, "gateway: upstream url rejected", "plugin", pb.Plugin.Key, "account", acc.ID, "err", err)
		return attemptResult{kind: attemptFailover, err: fromCore(core.ErrUnavailable.WithMessage("upstream address rejected"), errTypeInternal)}
	}
	body, err := applyPatches(c.body, built.GetPatches())
	if err != nil {
		return attemptResult{kind: attemptFailover, err: fromCore(core.ErrPluginUnavailable.WithCause(err), errTypePluginUnavailable)}
	}
	client, err := c.g.d.Proxies.HTTPClient(ctx, acc.ProxyID)
	if err != nil || client == nil {
		return unavailable("proxy", err)
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
	hc := *client
	hc.CheckRedirect = func(*http.Request, []*http.Request) error { return http.ErrUseLastResponse }
	hc.Timeout = 0

	timer := time.AfterFunc(c.g.headerWait(c.stream), ucancel)
	resp, err := hc.Do(req)
	headerTimedOut := !timer.Stop()
	if err != nil {
		if ctx.Err() != nil {
			return attemptResult{kind: attemptCanceled, err: canceledErr()}
		}
		msg := err.Error()
		if headerTimedOut {
			msg = "timeout waiting for upstream response headers"
		}
		return c.classify(ctx, pb, pacct, 0, nil, nil, msg)
	}
	defer resp.Body.Close()

	if resp.StatusCode < 200 || resp.StatusCode > 299 {
		raw, _ := readPrefix(resp.Body, maxErrorBody)
		ct := resp.Header.Get("Content-Type")
		res := c.classify(ctx, pb, pacct, resp.StatusCode, resp.Header, raw, "")
		if res.err != nil && res.err.Raw != nil {
			res.err.ContentType = ct
		}
		return res
	}
	return c.forward(ctx, pb, resp)
}

func canceledErr() *gwError {
	return &gwError{Status: statusClientClosed, Message: "client canceled", RecordType: errTypeClientCanceled}
}

const (
	maxErrorBody    = 64 << 10
	classifyPrefix  = 4 << 10
	defaultCooldown = 60 * time.Second
)

// classify asks the platform plugin what an upstream failure means, applies
// the account effect and decides between failover and returning the error.
func (c *call) classify(ctx context.Context, pb core.PlatformBinding, acct *pluginv1.Account,
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
	cls, err := pb.Client.ClassifyError(cctx, &pluginv1.ClassifyErrorRequest{
		Meta: c.meta(), Account: acct, Status: int32(status), Headers: headers, BodyPrefix: prefix, TransportError: transportErr,
	})
	cancel()
	if err != nil || cls == nil {
		slog.WarnContext(ctx, "gateway: classify error failed, using defaults", "plugin", pb.Plugin.Key, "err", err)
		cls = defaultClassification(status)
	}

	switch cls.GetAccountEffect() {
	case pluginv1.ClassifyErrorResponse_ACCOUNT_EFFECT_COOLDOWN:
		until := time.Unix(cls.GetCooldownUntilUnix(), 0)
		if cls.GetCooldownUntilUnix() <= 0 || !until.After(c.g.now()) {
			until = c.g.now().Add(defaultCooldown)
		}
		if err := c.g.d.Accounts.SetCooldown(context.WithoutCancel(ctx), acct.Id, until, cls.GetReason()); err != nil {
			slog.WarnContext(ctx, "gateway: set cooldown", "account", acct.Id, "err", err)
		}
	case pluginv1.ClassifyErrorResponse_ACCOUNT_EFFECT_DISABLE:
		if err := c.g.d.Accounts.Disable(context.WithoutCancel(ctx), acct.Id, cls.GetReason()); err != nil {
			slog.WarnContext(ctx, "gateway: disable account", "account", acct.Id, "err", err)
		}
		if s := c.sticky; s != nil && s.bound == acct.Id {
			c.dropBinding(ctx, s)
		}
	}

	clientStatus := int(cls.GetClientStatus())
	if clientStatus == 0 {
		clientStatus = status
	}
	if clientStatus < 400 || clientStatus > 599 {
		clientStatus = http.StatusBadGateway
	}
	e := &gwError{Status: clientStatus, Type: cls.GetClientErrorType(), Message: cls.GetClientMessage(),
		RecordType: errTypeUpstream, Code: "upstream_error"}
	if e.Type == "" && e.Message == "" && len(body) > 0 {
		e.Raw = body
	}
	if e.Message == "" {
		if transportErr != "" {
			e.Message = "upstream request failed"
		} else {
			e.Message = "upstream returned HTTP " + itoa(int64(status))
		}
	}
	c.rec.ErrorMessage = truncateUTF8(firstNonEmpty(cls.GetReason(), transportErr, e.Message), 1000)
	if cls.GetAction() == pluginv1.ClassifyErrorResponse_ACTION_RETURN_TO_CLIENT {
		return attemptResult{kind: attemptReturn, err: e}
	}
	return attemptResult{kind: attemptFailover, err: e}
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
