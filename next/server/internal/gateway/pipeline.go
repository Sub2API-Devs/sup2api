package gateway

import (
	"context"
	"errors"
	"io"
	"net/http"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/tidwall/gjson"

	pluginv1 "github.com/Sub2API-Devs/sup2api/next/sdk/gen/pluginv1"
	"github.com/Sub2API-Devs/sup2api/next/sdk/manifest"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/core"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/httpapi"
)

// call is the state of one gateway request.
type call struct {
	g      *Gateway
	c      *gin.Context
	gen    core.Generation
	ep     manifest.Endpoint
	plugin core.PluginInfo // plugin declaring the endpoint's platform (zero for built-in platforms)
	// platform is the id of the platform owning the endpoint; pf is its
	// definition (zero when the generation no longer lists it).
	platform string
	pf       manifest.Platform
	// params are the path parameters of the matched endpoint pattern.
	params map[string]string
	format string
	rid    string
	// clientRID is the client's X-Request-Id (recorded only, CONTRACTS §11.6/§14.4).
	clientRID string
	start     time.Time

	gw        GatewaySettings
	stickyCfg StickySettings

	principal *core.APIKeyPrincipal
	body      []byte
	model     string
	stream    bool

	promptCache map[int]string

	// scheduling: account types able to serve the endpoint protocol
	routes    map[core.AccountTypeKey]*typeRoute
	routeKeys []core.AccountTypeKey

	// billing: the model's global price (nil = free policy or free endpoint)
	price *core.PriceRule

	sticky *stickySession
	rec    *core.UsageRecord
}

// serve runs the proxy pipeline (ARCHITECTURE 6.1) for one request.
func (g *Gateway) serve(c *gin.Context, gen core.Generation, b core.EndpointBinding, params map[string]string) {
	// The request id is always generated here: it is the usage_logs key and
	// the ledger idempotency key, so a client-chosen id could dodge billing.
	rid := httpapi.NewRequestID()
	clientRID := c.GetHeader("X-Request-Id")
	c.Header("X-Request-Id", rid)
	ctx := core.WithRequestID(c.Request.Context(), rid)
	c.Request = c.Request.WithContext(ctx)

	cl := &call{
		g: g, c: c, gen: gen, ep: b.Endpoint, plugin: b.Plugin, platform: b.Platform, params: params,
		format: b.Endpoint.ErrorFormat, rid: rid, clientRID: clientRequestID(clientRID), start: g.now(),
	}
	if pb, ok := gen.Platform(b.Platform); ok {
		cl.pf = pb.Platform
	}
	// A node that lost Redis/PG beyond the self-fencing window stops serving.
	if !g.healthy() {
		writeError(c, cl.format, fromCore(core.ErrUnavailable.WithMessage("node is fenced: not serving requests"), ""))
		return
	}
	cl.gw, cl.stickyCfg = g.settings.get(ctx)
	if kind := b.Endpoint.Kind; kind != "" && kind != "proxy" {
		writeError(c, cl.format, &gwError{Status: http.StatusNotImplemented, Code: "not_implemented",
			Message: "endpoint kind " + kind + " is not supported"})
		return
	}
	cl.run(ctx)
}

func (c *call) run(ctx context.Context) {
	// 1. API key.
	key := c.apiKey()
	if key == "" {
		c.fail(fromCore(core.ErrUnauthenticated.WithMessage("missing api key"), ""))
		return
	}
	p, err := c.g.d.Auth.Authenticate(ctx, key)
	if err != nil {
		c.fail(fromCore(core.AsError(err), ""))
		return
	}
	c.principal = p
	c.rec = c.newRecord()
	defer c.submit()

	// 2. Body, model, stream.
	if e := c.readBody(); e != nil {
		c.fail(e)
		return
	}
	if e := c.checkModel(); e != nil {
		c.fail(e)
		return
	}

	// 3. Hooks (may deny or patch the body).
	if e := c.runHooks(ctx); e != nil {
		c.fail(e)
		return
	}
	if e := c.checkModel(); e != nil { // hooks may have patched the model
		c.fail(e)
		return
	}

	// 4. Account types serving the protocol, billing gate.
	c.planRoutes()
	if len(c.routeKeys) == 0 {
		c.fail(fromCore(core.ErrNoAvailableAccount.WithMessage("no enabled account type serves this endpoint"), errTypeNoAccount))
		return
	}
	if e := c.prepareBilling(ctx); e != nil {
		c.fail(e)
		return
	}

	// 5. User concurrency slot.
	release, ok, err := c.g.d.Slots.Acquire(ctx, "user", p.UserID, p.UserMaxConcurrency, c.rid)
	if err != nil {
		c.fail(fromCore(core.ErrUnavailable.WithCause(err), errTypeInternal))
		return
	}
	if !ok {
		c.fail(fromCore(core.ErrRateLimited.WithMessage("too many concurrent requests for this user"), errTypeRateLimited))
		return
	}
	defer release()

	// 6. Schedule, forward, fail over.
	c.dispatch(ctx)
}

// apiKey reads the key from the endpoint's auth headers or query parameter.
func (c *call) apiKey() string {
	headers := c.ep.Auth.Headers
	if len(headers) == 0 && c.ep.Auth.Query == "" {
		headers = []string{"authorization"}
	}
	for _, h := range headers {
		v := strings.TrimSpace(c.c.GetHeader(h))
		if v == "" {
			continue
		}
		if strings.EqualFold(h, "authorization") {
			if len(v) > 7 && strings.EqualFold(v[:7], "bearer ") {
				v = strings.TrimSpace(v[7:])
			} else {
				continue
			}
		}
		if v != "" {
			return v
		}
	}
	if q := c.ep.Auth.Query; q != "" {
		return strings.TrimSpace(c.c.Query(q))
	}
	return ""
}

func (c *call) newRecord() *core.UsageRecord {
	p := c.principal
	return &core.UsageRecord{
		RequestID:       c.rid,
		ClientRequestID: c.clientRID,
		UserID:          p.UserID,
		APIKeyID:        p.KeyID,
		GroupID:         p.Group.ID,
		PluginKey:       c.plugin.Key,
		PluginVersion:   c.plugin.Version,
		Platform:        c.platform,
		Protocol:        c.ep.Protocol,
		Endpoint:        c.ep.Path,
		RateMultiplier:  p.Group.RateMultiplier,
		ClientIP:        c.c.ClientIP(),
		UserAgent:       truncateUTF8(c.c.Request.UserAgent(), 500),
		NodeID:          c.g.nodeID(),
		CreatedAt:       c.start,
		HookDecisions:   []core.HookDecision{},
	}
}

func (c *call) readBody() *gwError {
	limit := c.ep.Request.MaxBodyBytes
	if limit <= 0 {
		limit = defaultMaxBodyBytes
	}
	if c.c.Request.Body != nil {
		body, err := io.ReadAll(http.MaxBytesReader(c.c.Writer, c.c.Request.Body, limit))
		if err != nil {
			var tooBig *http.MaxBytesError
			if errors.As(err, &tooBig) {
				return &gwError{Status: http.StatusRequestEntityTooLarge, Code: "request_too_large",
					Message: "request body is too large", RecordType: errTypeInvalidRequest}
			}
			if c.c.Request.Context().Err() != nil {
				return &gwError{Status: statusClientClosed, Message: "client canceled", RecordType: errTypeClientCanceled}
			}
			return &gwError{Status: http.StatusBadRequest, Code: core.ErrInvalidArgument.Code,
				Message: "failed to read request body", RecordType: errTypeInvalidRequest}
		}
		c.body = body
	}
	if len(c.body) > 0 && !gjson.ValidBytes(c.body) {
		return &gwError{Status: http.StatusBadRequest, Code: core.ErrInvalidArgument.Code,
			Message: "request body is not valid JSON", RecordType: errTypeInvalidRequest}
	}
	return nil
}

// checkModel (re)reads model and stream and applies the group allowlist.
// The model comes from the path parameter request.modelParam when declared
// (e.g. Gemini's /v1beta/models/:model:generateContent), else from the body
// at request.modelPath. request.stream marks endpoints that always stream.
func (c *call) checkModel() *gwError {
	req := c.ep.Request
	switch {
	case req.ModelParam != "":
		c.model = strings.TrimSpace(c.params[req.ModelParam])
	case req.ModelPath != "":
		c.model = gjson.GetBytes(c.body, req.ModelPath).String()
	}
	if (req.ModelParam != "" || req.ModelPath != "") && c.model == "" {
		return &gwError{Status: http.StatusBadRequest, Code: core.ErrInvalidArgument.Code,
			Message: "model is required", RecordType: errTypeInvalidRequest}
	}
	switch {
	case req.Stream:
		c.stream = true
	case req.StreamPath != "":
		c.stream = gjson.GetBytes(c.body, req.StreamPath).Bool()
	}
	c.rec.Model = c.model
	c.rec.Stream = c.stream
	if allow := c.principal.Group.ModelAllowlist; len(allow) > 0 && !anyGlob(allow, c.model) {
		return fromCore(core.ErrModelNotAllowed.WithDetails(map[string]any{"model": c.model}), errTypeModelNotAllowed)
	}
	return nil
}

// prepareBilling resolves the model's global price (ARCHITECTURE 7.3),
// captures the price inputs and checks the balance. Free endpoints skip it.
func (c *call) prepareBilling(ctx context.Context) *gwError {
	if strings.EqualFold(c.ep.Billing, "free") {
		return nil
	}
	rule, err := c.g.d.Pricer.Resolve(ctx, c.model)
	if err != nil {
		e := core.AsError(err)
		rt := errTypePriceNotConfigured
		if e.Code != core.ErrPriceNotConfigured.Code {
			rt = errTypeInternal
		}
		return fromCore(e, rt)
	}
	c.price = rule
	c.rec.Price = rule
	c.capturePriceInputs(rule)
	if err := c.g.d.Balance.CheckBalance(ctx, c.principal.UserID); err != nil {
		e := core.AsError(err)
		rt := errTypeInsufficientBalance
		if e.Code != core.ErrInsufficientBalance.Code {
			rt = errTypeInternal
		}
		return fromCore(e, rt)
	}
	return nil
}

// capturePriceInputs records the param()/header() values the price
// expression reads, from the final (post-hook) request.
func (c *call) capturePriceInputs(rule *core.PriceRule) {
	if rule == nil {
		return
	}
	paths, headers := c.g.d.Pricer.Inputs(rule)
	if len(paths) > 0 {
		c.rec.PriceParams = map[string]string{}
		for _, p := range paths {
			if r := gjson.GetBytes(c.body, p); r.Exists() {
				c.rec.PriceParams[p] = r.Raw
			}
		}
	}
	if len(headers) > 0 {
		c.rec.PriceHeaders = map[string]string{}
		for _, h := range headers {
			if v := c.c.GetHeader(h); v != "" {
				c.rec.PriceHeaders[headerLower(h)] = v
			}
		}
	}
}

// meta describes the request to plugins. Protocol is the endpoint protocol;
// attempts on a converting route override it with the upstream protocol
// (metaFor).
func (c *call) meta() *pluginv1.RequestMeta {
	m := &pluginv1.RequestMeta{
		RequestId: c.rid, Protocol: c.ep.Protocol, ClientProtocol: c.ep.Protocol,
		Model: c.model, Stream: c.stream, ClientIp: c.c.ClientIP(),
	}
	if p := c.principal; p != nil {
		m.UserId, m.ApiKeyId, m.GroupId = p.UserID, p.KeyID, p.Group.ID
	}
	return m
}

// metaFor is meta for an upstream attempt on rt.
func (c *call) metaFor(rt *typeRoute) *pluginv1.RequestMeta {
	m := c.meta()
	m.Protocol = rt.upstream
	return m
}

func (c *call) passHeaders(names []string) map[string]string {
	out := make(map[string]string, len(names))
	for _, n := range names {
		if v := c.c.GetHeader(n); v != "" {
			out[headerLower(n)] = v
		}
	}
	return out
}

// fail renders err (if nothing was written yet) and records it.
func (c *call) fail(e *gwError) {
	if c.rec != nil {
		c.rec.Success = false
		c.rec.StatusCode = e.Status
		if e.RecordType != "" {
			c.rec.ErrorType = e.RecordType
		} else if c.rec.ErrorType == "" {
			c.rec.ErrorType = errTypeInternal
		}
		if c.rec.ErrorMessage == "" {
			c.rec.ErrorMessage = truncateUTF8(e.Message, 1000)
		}
	}
	if e.Status == statusClientClosed || c.c.Writer.Written() {
		return
	}
	writeError(c.c, c.format, e)
}

// submit finalizes the usage record and hands it to the settler.
func (c *call) submit() {
	rec := c.rec
	if rec == nil || c.g.d.Settler == nil {
		return
	}
	rec.LatencyMs = int(c.g.now().Sub(c.start) / time.Millisecond)
	if rec.StatusCode == 0 {
		rec.StatusCode = c.c.Writer.Status()
	}
	hasUsage := rec.Tokens != (core.UsageTokens{}) || len(rec.Metrics) > 0
	rec.Billable = !strings.EqualFold(c.ep.Billing, "free") && rec.Price != nil &&
		(hasUsage || (rec.Success && rec.Price.Mode == "per_request"))
	if !rec.Billable {
		rec.Price = nil
	}
	c.g.d.Settler.Submit(rec)
}
