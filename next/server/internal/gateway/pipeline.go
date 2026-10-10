package gateway

import (
	"context"
	"errors"
	"io"
	"log/slog"
	"net/http"
	"sort"
	"strings"
	"time"
	"unicode/utf8"

	"github.com/Sub2API-Devs/sup2api/next/plugins/ccgateway/companions/contracts/resources"

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

	gw          GatewaySettings
	stickyCfg   StickySettings
	autoDisable AutoDisableSettings

	principal *core.APIKeyPrincipal
	body      []byte
	model     string
	stream    bool

	promptCache map[int]string

	// scheduling: account types able to serve the endpoint protocol
	routes    map[core.AccountTypeKey]*typeRoute
	routeKeys []core.AccountTypeKey

	// billing: the model's global price (nil = free policy or free endpoint)
	price                *core.PriceRule
	modelRefs            []modelReference
	resourceRefs         []approvedResource
	resourceScans        resourceScanCache
	resourceInfo         resources.RequestInfo
	resourceVersions     []approvedSkillVersion
	resourceAccess       *modelResourceAccess
	diagnosticRequest    *diagnosticRequest
	diagnosticAccess     *diagnosticAccess
	creditRequest        *modelCreditRequest
	creditAccess         *modelCreditAccess
	creditDispatched     bool
	helperHistory        *helperHistoryRequest
	helperPersisted      bool
	upstreamRefs         map[string]core.PricedUsage
	upstreamPrimaryModel string

	sticky *stickySession
	// ranked holds the per-request priority/weight the scheduler.rank
	// plugins asked for (CONTRACTS §24); rankDone marks the single call, so
	// failover attempts reuse the same result. nil = the accounts' own values.
	ranked   map[int64]rankValues
	rankDone bool
	// session identifies the request for the limiter (sessionIdentity).
	session string
	rec     *core.UsageRecord

	// metaPathParams and metaQuery are the bounded maps handed to plugins in
	// RequestMeta; built once per request because meta() runs for every hook,
	// ranker and upstream attempt. nil when the pattern has no parameters /
	// the endpoint declares no request.queryParams.
	metaPathParams map[string]string
	metaQuery      map[string]string
	metaMapsDone   bool

	// modelResolved marks that ResolveModel already answered for the current
	// body (endpoints with request.modelSource "plugin" only). setBody clears
	// it, so the plugin is asked again exactly when a hook changed the body.
	modelResolved bool

	// usage is the armed PlatformService.ExtractUsage call for endpoints
	// declaring usage.source "plugin" (usageplugin.go); nil for every other
	// endpoint, which is how they pay nothing for the feature. It is filled
	// at the end of forwarding and consumed by submit, on its own goroutine,
	// after the handler returned.
	usage *pendingExtract
	// Context of the currently selected account's concurrency lease.
	slotCtx       context.Context
	task          *core.TaskSnapshot
	taskPublicID  string
	taskPersisted bool
}

// serve runs the proxy pipeline (ARCHITECTURE 6.1) for one request.
func (g *Gateway) serve(c *gin.Context, gen core.Generation, b core.EndpointBinding, params map[string]string) {
	stripHelperHistoryHeaders(c.Request.Header)
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
	set := g.settings.get(ctx)
	cl.gw, cl.stickyCfg, cl.autoDisable = set.gateway, set.sticky, set.autoDisable
	if b.Endpoint.WebSocket() {
		g.serveWebSocket(ctx, cl)
		return
	}
	if kind := b.Endpoint.Kind; kind != "" && kind != manifest.EndpointKindProxy {
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
	defer c.finishHelperHistory()

	// 2. Body, model, stream.
	if e := c.readBody(); e != nil {
		c.fail(e)
		return
	}
	if e := c.checkModel(ctx); e != nil {
		c.fail(e)
		return
	}

	// 3. Hooks (may deny or patch the body).
	if e := c.runHooks(ctx); e != nil {
		c.fail(e)
		return
	}
	if e := c.checkModel(ctx); e != nil { // hooks may have patched the model
		c.fail(e)
		return
	}
	if c.ep.TaskQuery() {
		c.serveTaskSnapshot()
		return
	}
	if e := c.discoverHelperHistory(ctx); e != nil {
		c.fail(e)
		return
	}

	// Check the final model against the plugin's billing declaration before
	// route planning, account scheduling or any upstream request.
	if e := c.prepareBilling(ctx); e != nil {
		c.fail(e)
		return
	}
	// 4. Account types serving the protocol.
	c.planRoutes()
	if len(c.routeKeys) == 0 {
		c.fail(errEndpointNotServed)
		return
	}

	// 5. User concurrency slot.
	ctx, release, ok, err := core.AcquireSlot(ctx, c.g.d.Slots, "user", p.UserID, p.UserMaxConcurrency, c.rid)
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
	// JSON text is UTF-8 (RFC 8259 §8.1) and gjson's validator does not check
	// that, so a body with a stray byte inside a string would pass here and
	// then poison every proto string it is copied into - RequestMeta.model
	// from request.modelPath, the fields of BuildUpstreamRequest / ResolveModel
	// / ExtractUsage, price params - and proto.Marshal refuses invalid UTF-8,
	// which makes every plugin call of the request fail: one curl, a stable
	// 5xx, and a usage row PostgreSQL refuses as well (CONTRACTS §25.1). It is
	// not valid JSON; say so, once, here.
	if len(c.body) > 0 && (!utf8.Valid(c.body) || !gjson.ValidBytes(c.body)) {
		return &gwError{Status: http.StatusBadRequest, Code: core.ErrInvalidArgument.Code,
			Message: "request body is not valid JSON", RecordType: errTypeInvalidRequest}
	}
	return nil
}

// checkModel (re)reads model and stream and applies the group allowlist.
// The model comes from the path parameter request.modelParam when declared
// (e.g. Gemini's /v1beta/models/:model:generateContent), from the body at
// request.modelPath, or from the platform plugin when the endpoint declares
// request.modelSource "plugin" (resolveModelFromPlugin).
// request.stream marks endpoints that always stream.
//
// It runs before hooks and again after them, and it must stay there: the
// model decides hook matching, the group allowlist, pricing and the `models`
// filter on the candidate accounts, so every one of those needs it already
// resolved.
func (c *call) checkModel(ctx context.Context) *gwError {
	req := c.ep.Request
	switch {
	case c.ep.TaskQuery():
		if e := c.resolveTask(ctx); e != nil {
			return e
		}
	case req.ModelSource == manifest.ModelSourcePlugin:
		if e := c.resolveModelFromPlugin(ctx); e != nil {
			return e
		}
	case req.ModelParam != "":
		c.model = strings.TrimSpace(c.params[req.ModelParam])
	case req.ModelPath != "":
		c.model = gjson.GetBytes(c.body, req.ModelPath).String()
	}
	if (req.ModelParam != "" || req.ModelPath != "") && c.model == "" {
		return &gwError{Status: http.StatusBadRequest, Code: core.ErrInvalidArgument.Code,
			Message: "model is required", RecordType: errTypeInvalidRequest}
	}
	// request.stream is an endpoint-level fact ("this endpoint only streams")
	// and always wins, including over a plugin: a plugin answering false would
	// have the host read an SSE response as JSON. Otherwise the plugin's
	// answer replaces request.streamPath, which such an endpoint may not
	// declare (manifest validation).
	switch {
	case req.Stream:
		c.stream = true
	case req.ModelSource == manifest.ModelSourcePlugin:
		// c.stream was set by resolveModelFromPlugin.
	case req.StreamPath != "":
		c.stream = gjson.GetBytes(c.body, req.StreamPath).Bool()
	}
	c.rec.Model = c.model
	c.rec.Stream = c.stream
	if !c.principal.Group.AllowsModel(c.model) {
		return fromCore(core.ErrModelNotFound.WithDetails(map[string]any{"model": c.model}), errTypeModelNotAllowed)
	}
	if err := c.checkReferencedModels(); err != nil {
		return err
	}
	if err := c.checkResourceReferences(ctx); err != nil {
		return err
	}
	if err := c.checkFallbackCredit(ctx); err != nil {
		return err
	}
	return c.checkMessageDiagnostics(ctx)
}

// resolveModelFromPlugin asks PlatformService.ResolveModel of the plugin
// declaring the endpoint's platform for the model and the stream flag
// (CONTRACTS §25.2). Endpoints that do not declare request.modelSource
// "plugin" never reach it, so nothing existing pays for this.
//
// Every failure is a 400 "model is required" — a timeout, a transport error,
// an UNIMPLEMENTED from a plugin that never wrote the method, an empty
// answer. Without a model the host cannot resolve a price, apply the group
// allowlist or filter the candidate accounts, so letting the request through
// would serve it for free.
//
// The one exception is a nil Client: the plugin declared the platform without
// declaring platform.adapter.v1 (legal per §13, and rejected at install time
// since B, but a package installed earlier or a built-in platform can still
// get here). That is a host-side misconfiguration, not a client mistake, so
// it is a 500 with a log naming the plugin.
func (c *call) resolveModelFromPlugin(ctx context.Context) *gwError {
	if c.modelResolved {
		return nil // same body as the last call: the answer cannot have changed
	}
	pb, ok := c.gen.Platform(c.platform)
	if !ok || pb.Client == nil {
		slog.ErrorContext(ctx, "gateway: endpoint declares modelSource \"plugin\" but its platform has no plugin client",
			"platform", c.platform, "plugin", c.plugin.Key, "endpoint", c.ep.Path, "protocol", c.ep.Protocol,
			"builtin", pb.Builtin, "found", ok)
		return fromCore(core.ErrInternal.WithMessage("the platform of this endpoint cannot resolve models"), errTypeInternal)
	}
	fields := map[string]string{}
	for _, p := range c.pf.RequestFields {
		if r := getJSON(c.body, p); r != "" {
			fields[p] = r
		}
	}
	rctx, cancel := context.WithTimeout(ctx, c.gw.hotpathTimeout())
	resp, err := pb.Client.ResolveModel(rctx, &pluginv1.ResolveModelRequest{
		Meta: c.meta(), Fields: fields, InboundHeaders: c.passHeaders(c.pf.PassHeaders)})
	cancel()
	if err != nil || resp.GetModel() == "" {
		slog.InfoContext(ctx, "gateway: resolve model failed", "plugin", pb.Plugin.Key,
			"platform", c.platform, "protocol", c.ep.Protocol, "err", err)
		return &gwError{Status: http.StatusBadRequest, Code: core.ErrInvalidArgument.Code,
			Message: "model is required", RecordType: errTypeInvalidRequest}
	}
	c.model, c.stream, c.modelResolved = resp.GetModel(), resp.GetStream(), true
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
	if rule != nil {
		kind := rule.Mode
		if rule.VideoOnly {
			kind = "video"
		}
		if !c.ep.SupportsBillingType(kind) {
			return &gwError{Status: http.StatusBadRequest, Code: "billing_type_not_supported",
				Message:    "endpoint " + c.ep.Protocol + " does not support " + kind + " pricing for model " + c.model,
				RecordType: errTypeInvalidRequest}
		}
	}
	c.price = rule
	c.rec.Price = rule
	c.capturePriceInputs(c.price)
	if e := c.prepareReferencedPrices(ctx); e != nil {
		return e
	}
	if c.g.d.Balance == nil {
		return fromCore(core.AsError(errors.New("billing precharger unavailable")), errTypeInternal)
	}
	if err := c.g.d.Balance.CheckBalance(ctx, c.principal.UserID); err != nil {
		e := core.AsError(err)
		rt := errTypeInsufficientBalance
		if e.Code != core.ErrInsufficientBalance.Code {
			rt = errTypeInternal
		}
		return fromCore(e, rt)
	}
	if err := c.precharge(ctx); err != nil {
		e := core.AsError(err)
		kind := errTypeInternal
		if e.Code == core.ErrInsufficientBalance.Code {
			kind = errTypeInsufficientBalance
		}
		return fromCore(e, kind)
	}
	return nil
}

// capturePriceInputs records the param()/header() values the price
// expression reads, from the final (post-hook) request.
func (c *call) capturePriceInputs(rule *core.PriceRule) {
	c.rec.PriceParams, c.rec.PriceHeaders = c.priceInputs(rule)
}

func (c *call) priceInputs(rule *core.PriceRule) (params map[string]string, values map[string]string) {
	return c.priceInputsFrom(rule, c.body)
}

func (c *call) priceInputsFrom(rule *core.PriceRule, body []byte) (params map[string]string, values map[string]string) {
	if rule == nil {
		return nil, nil
	}
	paths, headers := c.g.d.Pricer.Inputs(rule)
	if len(paths) > 0 {
		params = map[string]string{}
		for _, p := range paths {
			if r := gjson.GetBytes(body, p); r.Exists() {
				params[p] = r.Raw
			}
		}
	}
	if len(headers) > 0 {
		values = map[string]string{}
		for _, h := range headers {
			if v := c.c.GetHeader(h); v != "" {
				values[headerLower(h)] = v
			}
		}
	}
	return params, values
}

// meta describes the request to plugins. Protocol is the endpoint protocol;
// attempts on a converting route override it with the upstream protocol
// (metaFor).
func (c *call) meta() *pluginv1.RequestMeta {
	if !c.metaMapsDone {
		c.metaPathParams = boundMeta(c.params)
		c.metaQuery = boundMeta(c.declaredQuery())
		c.metaMapsDone = true
	}
	m := &pluginv1.RequestMeta{
		RequestId: c.rid, Protocol: c.ep.Protocol, ClientProtocol: c.ep.Protocol,
		Model: c.model, Stream: c.stream, ClientIp: c.c.ClientIP(),
		PathParams: c.metaPathParams, Query: c.metaQuery,
	}
	if p := c.principal; p != nil {
		m.UserId, m.ApiKeyId, m.GroupId = p.UserID, p.KeyID, p.Group.ID
	}
	return m
}

// declaredQuery returns the query parameters the endpoint listed in
// request.queryParams, and nothing else. The query string can carry
// credentials — the endpoint's auth.query parameter, and whatever the next
// upstream invents — so the host never hands over the whole thing and never
// tries to guess which names are secret: an allow-list is wrong in the safe
// direction, a deny-list in the unsafe one.
//
// Matching is case-insensitive in both directions, because url.Values is a
// case-sensitive map and HTTP clients are not: "?Alt=sse" must satisfy a
// declared "alt", and "?Key=sk-..." must still be excluded by auth.query
// "key". Install-time validation guarantees no declared name equals
// auth.query under EqualFold, so the exclusion can never be overridden here.
func (c *call) declaredQuery() map[string]string {
	names := c.ep.Request.QueryParams
	if len(names) == 0 || c.c.Request == nil || c.c.Request.URL == nil {
		return nil
	}
	values := c.c.Request.URL.Query()
	if len(values) == 0 {
		return nil
	}
	// Sorted, so a client sending both "?alt=" and "?Alt=" gets the same
	// answer on every node and every attempt.
	sent := make([]string, 0, len(values))
	for k := range values {
		sent = append(sent, k)
	}
	sort.Strings(sent)
	out := make(map[string]string, len(names))
	for _, name := range names {
		if auth := c.ep.Auth.Query; auth != "" && strings.EqualFold(name, auth) {
			continue
		}
		for _, k := range sent {
			vs := values[k]
			if !strings.EqualFold(k, name) || len(vs) == 0 {
				continue
			}
			// The key is the name as the client sent it; only the first value
			// of a repeated parameter travels.
			out[k] = vs[0]
			break
		}
	}
	if len(out) == 0 {
		return nil
	}
	return out
}

// metaMapMaxKeys, metaMapMaxKeyBytes and metaMapMaxValueBytes bound the
// RequestMeta path_params and query maps: both come straight from the client.
const (
	metaMapMaxKeys       = 32
	metaMapMaxKeyBytes   = 64
	metaMapMaxValueBytes = 512
)

// boundMeta caps in to metaMapMaxKeys entries (lowest key names first, so the
// choice is stable) and truncates keys and values on a UTF-8 boundary. It
// returns nil for an empty map: the field is optional and a nil map costs no
// allocation on the hot path.
//
// The map comes straight off the wire, so invalid UTF-8 is dropped first:
// proto3 string fields must be valid UTF-8 and marshalling a RequestMeta with
// a stray byte would fail every plugin call of the request.
func boundMeta(in map[string]string) map[string]string {
	if len(in) == 0 {
		return nil
	}
	keys := make([]string, 0, len(in))
	for k := range in {
		keys = append(keys, k)
	}
	if len(keys) > metaMapMaxKeys {
		sort.Strings(keys)
		keys = keys[:metaMapMaxKeys]
	}
	out := make(map[string]string, len(keys))
	for _, k := range keys {
		name := truncateUTF8(strings.ToValidUTF8(k, ""), metaMapMaxKeyBytes)
		if name == "" {
			continue
		}
		out[name] = truncateUTF8(strings.ToValidUTF8(in[k], ""), metaMapMaxValueBytes)
	}
	if len(out) == 0 {
		return nil
	}
	return out
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
		c.rec.StatusCode = clientError(c.format, e).Status
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
//
// For an endpoint whose usage a plugin reports, the plugin is asked here
// rather than in forward(): the handler returns as soon as submit does, so
// the response is terminated for the client before a remote call is made. The
// record is finished on that goroutine instead (finishSubmit), which is the
// one thing that was always allowed to be late - it goes to an asynchronous
// settler either way.
func (c *call) submit() {
	rec := c.rec
	if rec == nil || c.g.d.Settler == nil || c.taskPersisted || c.helperWasDispatched() {
		return
	}
	rec.LatencyMs = int(c.g.now().Sub(c.start) / time.Millisecond)
	if rec.StatusCode == 0 {
		rec.StatusCode = c.c.Writer.Status()
	}
	// Read off the gin context here: it is pooled and reused once the handler
	// returns, so nothing below this point may touch it.
	billing := c.ep.Billing
	if p := c.usage; p != nil {
		c.usage = nil
		// The goroutine below captures c, and with it the request body (and
		// its converted copies) - possibly megabytes of base64 for exactly
		// the endpoints this path serves. Nothing after this point reads
		// them: ExtractUsage was armed with the few request fields it is
		// shown, so let the body go before the handler returns rather than
		// keep it for the length of a plugin round trip.
		c.releaseBodies()
		// g.wg is the gateway's own group, so Close waits for the extraction
		// instead of dropping the record. Add is safe here because it happens
		// inside the handler: app.go shuts the HTTP server down (every handler
		// returned) before it calls Gateway.Close.
		c.g.wg.Add(1)
		go func() {
			defer c.g.wg.Done()
			ctx := context.Background()
			c.extractUsage(ctx, p)
			// Rate limits count what was really used, so they are updated
			// with the plugin's answer rather than the rules' guess.
			c.countTokens(ctx, p.accountID)
			c.finishSubmit(ctx, rec, billing)
		}()
		return
	}
	c.finishSubmit(context.Background(), rec, billing)
}

// releaseBodies drops every reference the call holds to the request body.
// Only for the asynchronous submit path, once nothing will read them again.
func (c *call) releaseBodies() {
	c.body = nil
	c.promptCache = nil
	for _, rt := range c.routes {
		rt.body = nil
	}
}

func (c *call) finishSubmit(ctx context.Context, rec *core.UsageRecord, billing string) {
	c.finalizeBillability(ctx, rec, billing)
	c.g.d.Settler.Submit(rec)
}

func (c *call) finalizeBillability(ctx context.Context, rec *core.UsageRecord, billing string) {
	hasUsage := rec.Tokens != (core.UsageTokens{}) || len(rec.Metrics) > 0
	priced := rec.Price != nil && (hasUsage || (rec.Success && rec.Price.Mode == "per_request"))
	for _, item := range append(append([]core.PricedUsage(nil), rec.Additional...), rec.Replacement...) {
		itemUsage := item.Tokens != (core.UsageTokens{}) || len(item.Metrics) > 0
		hasUsage = hasUsage || itemUsage
		priced = priced || (item.Price != nil && (itemUsage || (rec.Success && item.Price.Mode == "per_request")))
	}
	rec.Billable = !strings.EqualFold(billing, "free") && (priced || rec.BillingError != "")
	if !rec.Billable {
		c.dropReservation(ctx, rec, billing, hasUsage)
		rec.Price = nil
	}
}

// dropReservation clears a Reservation from a record that turned out not to
// be billable, and says so - in the log, naming the plugin and the endpoint,
// and on the record, under usage_logs.anomalies.
//
// The settler would have dropped it anyway (initialStatus reads Billable
// first), silently: no pre-charge, no pending_settlements entry, no reconcile,
// for a job the upstream really started - the shape CONTRACTS §25.5 found in
// the first plugin to reserve, where the submit endpoint had been marked
// billing "free" because "the submit itself has no final usage". The manifest
// check now refuses that combination; this is what stands for packages
// installed before it did, and for the other two ways here: a price the
// request did not resolve, and an estimate with no tokens and no facts on a
// per-token price, which is a plugin bug the plugin author has to hear about.
func (c *call) dropReservation(ctx context.Context, rec *core.UsageRecord, billing string, hasUsage bool) {
	rv := rec.Reservation
	if rv == nil {
		return
	}
	var why string
	switch {
	case strings.EqualFold(billing, "free"):
		why = "endpoint billing is \"free\""
	case rec.Price == nil:
		why = "no price was resolved for the request"
	case !hasUsage:
		why = "the estimate has no tokens and no facts, and the price is not per-request"
	default:
		why = "record is not billable"
	}
	rec.Reservation = nil
	rec.ReservationDropped = why
	slog.WarnContext(ctx, "gateway: plugin reserved a pre-charge the request cannot carry; the reservation is DROPPED - "+
		"nothing is charged now and nothing will be reconciled",
		"request_id", c.rid, "plugin", rv.PluginKey, "platform", c.platform, "endpoint", c.ep.Path,
		"protocol", c.ep.Protocol, "ref_id", rv.RefID, "billing", billing, "reason", why)
}

// countTokens adds this request's tokens to the account's rate-limit window.
func (c *call) countTokens(ctx context.Context, accountID int64) {
	lim := c.g.d.Limiter
	if lim == nil || accountID == 0 {
		return
	}
	n := c.rec.Tokens.Total()
	if len(c.rec.Replacement) > 0 {
		n = 0
		for _, item := range c.rec.Replacement {
			n += item.Tokens.Total()
		}
	}
	for _, item := range c.rec.Additional {
		n += item.Tokens.Total()
	}
	if n > 0 {
		lim.AddTokens(context.WithoutCancel(ctx), accountID, n)
	}
}
