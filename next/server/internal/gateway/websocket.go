package gateway

import (
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"io"
	"log/slog"
	"net/http"
	"strings"
	"time"

	"github.com/coder/websocket"
	"github.com/tidwall/gjson"
	"github.com/tidwall/sjson"

	pluginv1 "github.com/Sub2API-Devs/sup2api/next/sdk/gen/pluginv1"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/core"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/httpapi"
)

// WebSocket endpoints (manifest kind "websocket", CONTRACTS §35,
// docs/OPENAI-RESPONSES-WEBSOCKET.md). The client upgrades once; every
// message carrying a model at request.modelPath is a turn, served on the one
// upstream WebSocket and account the first turn chose, metered with the
// usage.sse rules (matched by the message "type") and recorded and billed on
// its own, exactly like a streaming HTTP request.

// wsLimits are the session limits. They match the defaults of the session
// mode this was ported from and are fields only so tests can shorten them.
type wsLimits struct {
	firstMessage time.Duration // upgrade to the first client message
	idle         time.Duration // end of a turn to the next message
	maxPerKey    int           // open sessions per API key, cluster-wide
	slotWait     time.Duration // later turns wait this long for the account
	drainGrace   time.Duration // a turn in progress when draining starts
	handshake    time.Duration // upstream dial and handshake
	writeTimeout time.Duration // one message to a slow peer
	upstreamRead int64         // largest upstream message
	drainPoll    time.Duration
}

func defaultWSLimits() wsLimits {
	return wsLimits{firstMessage: 30 * time.Second, idle: 300 * time.Second, maxPerKey: 64, slotWait: 10 * time.Second,
		drainGrace: 30 * time.Second, handshake: 30 * time.Second, writeTimeout: time.Minute, upstreamRead: 64 << 20,
		drainPoll: 500 * time.Millisecond}
}

// Close codes of the client connection.
const (
	wsCloseRestart = websocket.StatusCode(1012) // Service Restart: reconnect
)

// terminalEvents end a turn.
var terminalEvents = map[string]bool{
	"response.completed": true, "response.incomplete": true, "response.failed": true, "error": true,
}

// serveWebSocket authenticates, upgrades and runs one session. Failures
// before the upgrade are ordinary HTTP errors in the endpoint's format.
func (g *Gateway) serveWebSocket(ctx context.Context, cl *call) {
	if !strings.EqualFold(cl.c.GetHeader("Upgrade"), "websocket") {
		writeError(cl.c, cl.format, &gwError{Status: http.StatusUpgradeRequired, Code: core.ErrInvalidArgument.Code,
			Message: "this endpoint requires a WebSocket upgrade"})
		return
	}
	key := cl.apiKey()
	if key == "" {
		writeError(cl.c, cl.format, fromCore(core.ErrUnauthenticated.WithMessage("missing api key"), ""))
		return
	}
	p, err := g.d.Auth.Authenticate(ctx, key)
	if err != nil {
		writeError(cl.c, cl.format, fromCore(core.AsError(err), ""))
		return
	}
	cl.principal = p
	if g.draining() {
		writeError(cl.c, cl.format, fromCore(core.ErrUnavailable.WithMessage("node is draining"), ""))
		return
	}
	ctx, release, ok, err := core.AcquireSlot(ctx, g.d.Slots, "ws", p.KeyID, g.ws.maxPerKey, cl.rid)
	if err != nil {
		writeError(cl.c, cl.format, fromCore(core.ErrUnavailable.WithCause(err), ""))
		return
	}
	if !ok {
		cl.c.Header("Retry-After", "5")
		writeError(cl.c, cl.format, fromCore(core.ErrRateLimited.WithMessage("too many open WebSocket connections for this API key"), ""))
		return
	}
	defer release()
	conn, err := websocket.Accept(cl.c.Writer, cl.c.Request, &websocket.AcceptOptions{CompressionMode: websocket.CompressionContextTakeover})
	if err != nil {
		slog.InfoContext(ctx, "gateway: websocket upgrade failed", "request_id", cl.rid, "err", err)
		return
	}
	limit := cl.ep.Request.MaxBodyBytes
	if limit <= 0 {
		limit = defaultMaxBodyBytes
	}
	conn.SetReadLimit(limit)
	s := &wsSession{g: g, base: cl, client: conn, id: cl.rid}
	s.run(ctx)
}

func (g *Gateway) draining() bool { return g.d.Draining != nil && g.d.Draining() }

// wsSession is one client connection.
type wsSession struct {
	g      *Gateway
	base   *call // the upgrade request: endpoint, principal, headers
	client *websocket.Conn
	id     string

	// The upstream connection and the account the first turn chose; every
	// later turn of the session uses them.
	up      *websocket.Conn
	ref     *core.AccountRef
	rt      *typeRoute
	pacct   *pluginv1.Account
	routes  map[core.AccountTypeKey]*typeRoute
	session string
	upIn    chan wsMessage
}

type wsMessage struct {
	typ  websocket.MessageType
	data []byte
	err  error
}

// wsTurn is one response in progress.
type wsTurn struct {
	cl      *call
	usage   *usageAcc
	lease   context.Context // the account slot lease
	release func()          // account and user slots
}

func (s *wsSession) run(ctx context.Context) {
	sctx, cancel := context.WithCancel(context.WithoutCancel(ctx))
	defer cancel()
	in := make(chan wsMessage, 1)
	go s.read(sctx, s.client, in)
	defer func() {
		if s.up != nil {
			_ = s.up.CloseNow()
		}
		_ = s.client.CloseNow()
	}()

	var turn *wsTurn
	asked := false // a response.create arrived
	idle := time.NewTimer(s.g.ws.firstMessage)
	defer idle.Stop()
	poll := time.NewTicker(s.g.ws.drainPoll)
	defer poll.Stop()
	var drainDeadline time.Time
	end := func(code websocket.StatusCode, reason string) {
		_ = s.client.Close(code, reason)
	}
	for {
		var upIn chan wsMessage
		var lease <-chan struct{}
		if turn != nil {
			upIn = s.upIn
			lease = turn.lease.Done()
		} else if s.up != nil {
			upIn = s.upIn
		}
		select {
		case m := <-in:
			if m.err != nil {
				if turn != nil {
					s.finish(sctx, turn, wsOutcome{status: statusClientClosed, errType: errTypeClientCanceled, msg: "client canceled"})
				}
				return
			}
			if turn != nil {
				s.sendError(sctx, &gwError{Status: http.StatusConflict, Code: "response_in_progress", Type: "invalid_request_error",
					Message: "a response is already in progress on this connection; wait for it to finish"})
				continue
			}
			if s.g.draining() {
				end(wsCloseRestart, "node is draining; reconnect")
				return
			}
			asked = true
			var fatal bool
			if turn, fatal = s.begin(sctx, m); fatal {
				end(websocket.StatusInternalError, "upstream connection failed; reconnect")
				return
			}
			idle.Reset(s.g.ws.idle)
		case m := <-upIn:
			if m.err != nil {
				if turn != nil {
					s.finish(sctx, turn, wsOutcome{status: http.StatusBadGateway, errType: errTypeUpstream,
						msg: "upstream connection closed: " + truncateUTF8(m.err.Error(), 300)})
				}
				end(websocket.StatusInternalError, "upstream connection closed; reconnect")
				return
			}
			if err := s.write(sctx, m.typ, m.data); err != nil {
				if turn != nil {
					s.finish(sctx, turn, wsOutcome{status: statusClientClosed, errType: errTypeClientCanceled, msg: "client canceled"})
				}
				return
			}
			if turn == nil {
				continue
			}
			if done, out := s.observe(sctx, turn, m.data); done {
				s.finish(sctx, turn, out)
				turn = nil
				idle.Reset(s.g.ws.idle)
				if !drainDeadline.IsZero() {
					end(wsCloseRestart, "node is draining; reconnect")
					return
				}
			}
		case <-lease:
			s.finish(sctx, turn, wsOutcome{status: http.StatusServiceUnavailable, errType: errTypeInternal, msg: "account lease lost"})
			end(websocket.StatusTryAgainLater, "account lease lost; reconnect")
			return
		case <-idle.C:
			if turn != nil {
				continue
			}
			if !asked {
				end(websocket.StatusPolicyViolation, "no response.create received")
			} else {
				end(websocket.StatusNormalClosure, "idle timeout")
			}
			return
		case <-poll.C:
			if !s.g.draining() && ctx.Err() == nil {
				continue
			}
			if turn == nil {
				end(wsCloseRestart, "node is draining; reconnect")
				return
			}
			if drainDeadline.IsZero() {
				drainDeadline = time.Now().Add(s.g.ws.drainGrace)
			} else if time.Now().After(drainDeadline) {
				s.finish(sctx, turn, wsOutcome{status: http.StatusServiceUnavailable, errType: errTypeInternal, msg: "node drained before the response finished"})
				end(wsCloseRestart, "node is draining; reconnect")
				return
			}
		}
	}
}

// read pumps one connection into ch until it fails.
func (s *wsSession) read(ctx context.Context, conn *websocket.Conn, ch chan<- wsMessage) {
	for {
		typ, data, err := conn.Read(ctx)
		select {
		case ch <- wsMessage{typ: typ, data: data, err: err}:
		case <-ctx.Done():
			return
		}
		if err != nil {
			return
		}
	}
}

func (s *wsSession) write(ctx context.Context, typ websocket.MessageType, data []byte) error {
	wctx, cancel := context.WithTimeout(ctx, s.g.ws.writeTimeout)
	defer cancel()
	return s.client.Write(wctx, typ, data)
}

// sendError tells the client that a turn could not run, in the Responses
// error event shape; the connection stays open.
func (s *wsSession) sendError(ctx context.Context, e *gwError) {
	status := e.Status
	if status <= 0 || status == statusClientClosed {
		status = http.StatusInternalServerError
	}
	t := e.Type
	if t == "" {
		t = openaiType(status)
	}
	code := e.Code
	if code == "" {
		code = defaultCode(status)
	}
	msg := e.Message
	if msg == "" {
		msg = http.StatusText(status)
	}
	body, _ := json.Marshal(map[string]any{"type": "error", "status": status,
		"error": map[string]any{"type": t, "code": code, "message": msg, "param": nil}})
	_ = s.write(ctx, websocket.MessageText, body)
}

// newCall is the per-turn request: a fresh request id (the usage and ledger
// idempotency key), the upgrade request's endpoint, headers and principal,
// and the message as the body.
func (s *wsSession) newCall(body []byte) *call {
	b := s.base
	cl := &call{g: s.g, c: b.c, gen: b.gen, ep: b.ep, plugin: b.plugin, platform: b.platform, pf: b.pf, params: b.params,
		format: b.format, rid: httpapi.NewRequestID(), clientRID: b.clientRID, start: s.g.now(), gw: b.gw, stickyCfg: b.stickyCfg,
		autoDisable: b.autoDisable, principal: b.principal, body: body, stream: true}
	cl.rec = cl.newRecord()
	cl.rec.Stream = true
	return cl
}

// begin starts a turn, or answers why it cannot run and records that.
// fatal means the upstream connection broke and the session must end.
func (s *wsSession) begin(ctx context.Context, m wsMessage) (_ *wsTurn, fatal bool) {
	reject := func(cl *call, e *gwError) (*wsTurn, bool) {
		if cl != nil {
			cl.fail(e)
			cl.submit()
		}
		s.sendError(ctx, e)
		return nil, false
	}
	if !gjson.ValidBytes(m.data) || !gjson.ParseBytes(m.data).IsObject() {
		return reject(nil, &gwError{Status: http.StatusBadRequest, Code: core.ErrInvalidArgument.Code, Message: "message is not a JSON object"})
	}
	if typ := gjson.GetBytes(m.data, "type").String(); typ != "response.create" {
		return reject(nil, &gwError{Status: http.StatusBadRequest, Code: core.ErrInvalidArgument.Code,
			Message: "unsupported message type " + strconvQuote(typ) + ": only response.create is accepted"})
	}
	cl := s.newCall(m.data)
	if e := cl.checkModel(ctx); e != nil {
		return reject(cl, e)
	}
	if e := cl.runHooks(ctx); e != nil {
		return reject(cl, e)
	}
	if e := cl.checkModel(ctx); e != nil {
		return reject(cl, e)
	}
	if e := cl.prepareBilling(ctx); e != nil {
		return reject(cl, e)
	}
	p := cl.principal
	_, releaseUser, ok, err := core.AcquireSlot(ctx, s.g.d.Slots, "user", p.UserID, p.UserMaxConcurrency, cl.rid)
	if err != nil {
		return reject(cl, fromCore(core.ErrUnavailable.WithCause(err), errTypeInternal))
	}
	if !ok {
		return reject(cl, fromCore(core.ErrRateLimited.WithMessage("too many concurrent requests for this user"), errTypeRateLimited))
	}
	var releaseAccount func()
	var e *gwError
	if s.up == nil {
		releaseAccount, e = s.connect(ctx, cl)
	} else {
		releaseAccount, e = s.reuse(ctx, cl)
	}
	if e != nil {
		releaseUser()
		return reject(cl, e)
	}
	t := &wsTurn{cl: cl, lease: cl.slotCtx, release: func() { releaseAccount(); releaseUser() }}
	if t.lease == nil {
		t.lease = ctx
	}
	t.usage = newUsageAcc(s.rt.usage).WithLog("request_id", cl.rid, "plugin", s.rt.binding.Plugin.Key,
		"platform", s.rt.platform, "protocol", s.rt.upstream)
	payload := cl.body
	if up := s.ref.MapModel(cl.model); up != cl.model {
		if payload, err = sjson.SetBytes(payload, s.rt.modelPath, up); err != nil {
			s.finish(ctx, t, wsOutcome{status: http.StatusInternalServerError, errType: errTypeInternal, msg: err.Error()})
			s.sendError(ctx, fromCore(core.ErrInternal, errTypeInternal))
			return nil, false
		}
		cl.rec.UpstreamModel = up
	}
	wctx, cancel := context.WithTimeout(ctx, s.g.ws.writeTimeout)
	err = s.up.Write(wctx, websocket.MessageText, payload)
	cancel()
	if err != nil {
		s.finish(ctx, t, wsOutcome{status: http.StatusBadGateway, errType: errTypeUpstream, msg: "upstream write failed: " + err.Error()})
		s.sendError(ctx, &gwError{Status: http.StatusBadGateway, Code: codeUpstreamError, Message: "upstream connection failed"})
		return nil, true
	}
	return t, false
}

// connect is the first turn: schedule like an HTTP request (candidates,
// sticky binding, rankers, rate limits, account slots) and open the upstream
// WebSocket, failing over on handshake errors the plugin classifies so.
func (s *wsSession) connect(ctx context.Context, cl *call) (func(), *gwError) {
	cl.planRoutes()
	if len(cl.routeKeys) == 0 {
		return nil, fromCore(core.ErrNoAvailableAccount.WithMessage("no enabled account type serves this endpoint"), errTypeNoAccount)
	}
	all, err := s.g.d.Accounts.Candidates(ctx, cl.principal.Group.ID, cl.routeKeys)
	if err != nil {
		return nil, fromCore(core.ErrUnavailable.WithCause(err), errTypeInternal)
	}
	cands := make([]core.AccountRef, 0, len(all))
	for i := range all {
		if cl.route(&all[i]) != nil && all[i].ServesModel(cl.model) {
			cands = append(cands, all[i])
		}
	}
	cl.sticky = cl.resolveSticky(ctx)
	cl.session = "ws:" + s.id
	if cl.sticky != nil && cl.sticky.key != "" {
		cl.session = cl.sticky.key
	}
	excluded := map[int64]bool{}
	var last *gwError
	for cl.rec.Attempts < cl.gw.MaxAttempts {
		ref, release, busy := cl.pick(ctx, cands, excluded)
		if ref == nil {
			if last == nil {
				last = fromCore(core.ErrNoAvailableAccount, errTypeNoAccount)
				if busy {
					last = fromCore(core.ErrRateLimited.WithMessage("all accounts are busy or rate limited, please retry later"), errTypeNoAccount)
				}
			}
			break
		}
		if lim := s.g.d.Limiter; lim != nil {
			admitted, err := lim.TryHit(cl.slotCtx, *ref, cl.session)
			if err != nil || !admitted {
				release()
				excluded[ref.ID] = true
				last = fromCore(core.ErrRateLimited.WithMessage("all accounts are busy or rate limited, please retry later"), errTypeNoAccount)
				continue
			}
		}
		cl.rec.Attempts++
		res := s.dial(ctx, cl, ref)
		if res.kind == attemptDone {
			s.ref = ref
			s.routes = cl.routes
			s.session = cl.session
			cl.finishSticky(ctx, ref.ID, true)
			return release, nil
		}
		release()
		switch res.kind {
		case attemptFailover:
			excluded[ref.ID] = true
			last = res.err
			if cl.sticky != nil && cl.sticky.hit && cl.sticky.bound == ref.ID && cl.sticky.rule.OnFailure == onFailureStick {
				cl.finishSticky(ctx, ref.ID, false)
				return nil, last
			}
		default:
			cl.finishSticky(ctx, ref.ID, false)
			return nil, res.err
		}
	}
	if last == nil || (last.RecordType != errTypeUpstream && last.Status != http.StatusTooManyRequests) {
		last = fromCore(core.ErrNoAvailableAccount, errTypeNoAccount)
	}
	cl.finishSticky(ctx, 0, false)
	return nil, last
}

// dial asks the account type's plugin for the upstream handshake and opens
// it through the account's proxy.
func (s *wsSession) dial(ctx context.Context, cl *call, ref *core.AccountRef) attemptResult {
	unavailable := func(msg string, err error) attemptResult {
		slog.WarnContext(ctx, "gateway: websocket account unavailable", "account", ref.ID, "reason", msg, "err", err)
		return attemptResult{kind: attemptFailover, err: fromCore(core.ErrNoAvailableAccount.WithCause(err), errTypeNoAccount)}
	}
	acc, err := s.g.d.Accounts.Load(ctx, ref.ID)
	if err != nil {
		return unavailable("load account", err)
	}
	rt := cl.route(ref)
	if rt == nil || rt.binding.Client == nil {
		return unavailable("account type not enabled", errors.New(ref.PluginKey+"/"+ref.Type))
	}
	s.recordAccount(cl, acc.ID, rt)
	pacct := &pluginv1.Account{Id: acc.ID, Name: acc.Name, Platform: cl.platform, Type: rt.binding.Type.ID,
		CredentialsJson: string(acc.Credentials), SettingsJson: string(acc.Settings)}
	body := cl.body
	upModel := ref.MapModel(cl.model)
	if upModel != cl.model && rt.modelPath != "" {
		body, _ = sjson.SetBytes(body, rt.modelPath, upModel)
	}
	fields := map[string]string{}
	for _, p := range rt.requestFields {
		if r := getJSON(body, p); r != "" {
			fields[p] = r
		}
	}
	meta := cl.metaFor(rt)
	meta.Model = upModel
	bctx, cancel := context.WithTimeout(ctx, cl.gw.platformTimeout())
	built, err := rt.binding.Client.BuildUpstreamRequest(bctx, &pluginv1.BuildUpstreamRequestRequest{Meta: meta, Account: pacct,
		Fields: fields, InboundHeaders: cl.passHeaders(rt.passHeaders), Attempt: int32(cl.rec.Attempts - 1)})
	cancel()
	if err == nil && built == nil {
		err = errors.New("empty response")
	}
	if err != nil {
		return attemptResult{kind: attemptFailover, err: fromCore(core.ErrPluginUnavailable.WithCause(err), errTypePluginUnavailable)}
	}
	if built.GetUpstreamModel() != "" && built.GetUpstreamModel() != cl.model {
		cl.rec.UpstreamModel = built.GetUpstreamModel()
	}
	target, err := s.checkURL(ctx, built)
	if err != nil {
		slog.WarnContext(ctx, "gateway: upstream websocket url rejected", "plugin", rt.binding.Plugin.Key, "account", acc.ID, "err", err)
		return attemptResult{kind: attemptFailover, err: fromCore(core.ErrUnavailable.WithMessage("upstream address rejected"), errTypeInternal)}
	}
	client, err := s.g.d.Proxies.HTTPClient(ctx, acc.ProxyID)
	if err != nil || client == nil {
		return attemptResult{kind: attemptFailover, err: fromCore(core.ErrUnavailable.WithCause(err), errTypeInternal)}
	}
	hc := *client
	hc.CheckRedirect = func(*http.Request, []*http.Request) error { return http.ErrUseLastResponse }
	hc.Timeout = 0
	header := http.Header{}
	for k, v := range built.GetHeaders() {
		switch strings.ToLower(k) {
		case "host", "content-length", "content-type", "accept-encoding", "connection", "transfer-encoding", "upgrade",
			"sec-websocket-key", "sec-websocket-version", "sec-websocket-extensions", "sec-websocket-accept":
		default:
			header.Set(k, v)
		}
	}
	if h := built.GetHeaders()["host"]; h != "" {
		header.Set("Host", h)
	}
	// The handshake gets its own deadline; the connection itself lives as
	// long as the session.
	dctx, dcancel := context.WithTimeout(context.WithoutCancel(ctx), s.g.ws.handshake)
	stop := context.AfterFunc(ctx, dcancel)
	up, resp, err := websocket.Dial(dctx, target, &websocket.DialOptions{HTTPClient: &hc, HTTPHeader: header,
		CompressionMode: websocket.CompressionContextTakeover})
	stop()
	dcancel()
	if resp != nil {
		s.g.observeQuota(rt, acc.ID, resp.StatusCode, resp.Header)
	}
	if err != nil {
		if ctx.Err() != nil {
			return attemptResult{kind: attemptCanceled, err: canceledErr()}
		}
		if resp != nil && resp.StatusCode != http.StatusSwitchingProtocols {
			var raw []byte
			if resp.Body != nil {
				raw, _ = io.ReadAll(io.LimitReader(resp.Body, maxErrorBody))
			}
			return cl.classify(ctx, rt, pacct, resp.StatusCode, resp.Header, raw, "")
		}
		return cl.classify(ctx, rt, pacct, 0, nil, nil, err.Error())
	}
	up.SetReadLimit(s.g.ws.upstreamRead)
	s.up, s.rt, s.pacct = up, rt, pacct
	s.upIn = make(chan wsMessage, 1)
	go s.read(ctx, up, s.upIn)
	return attemptResult{kind: attemptDone}
}

// checkURL applies the gateway's SSRF guard to the ws(s) address the plugin
// returned, judged as the http(s) address the handshake really goes to.
func (s *wsSession) checkURL(ctx context.Context, built *pluginv1.BuildUpstreamRequestResponse) (string, error) {
	if m := strings.ToUpper(built.GetMethod()); m != "" && m != http.MethodGet {
		return "", errors.New("a websocket handshake is a GET, plugin returned " + m)
	}
	raw := strings.TrimSpace(built.GetUrl())
	var httpURL string
	switch {
	case strings.HasPrefix(strings.ToLower(raw), "wss://"):
		httpURL = "https://" + raw[len("wss://"):]
	case strings.HasPrefix(strings.ToLower(raw), "ws://"):
		httpURL = "http://" + raw[len("ws://"):]
	default:
		return "", errors.New("upstream websocket url must be ws:// or wss://")
	}
	u, err := s.g.checkUpstreamURL(ctx, httpURL)
	if err != nil {
		return "", err
	}
	return u.String(), nil
}

// reuse admits a later turn on the session's account: it must still serve
// the turn's model, and its slot and rate limits must allow the turn, after
// waiting a little for them.
func (s *wsSession) reuse(ctx context.Context, cl *call) (func(), *gwError) {
	cl.routes = s.routes
	cl.session = s.session
	cl.rec.Attempts = 1
	s.recordAccount(cl, s.ref.ID, s.rt)
	if !s.ref.ServesModel(cl.model) {
		return nil, &gwError{Status: http.StatusBadRequest, Code: core.ErrInvalidArgument.Code, RecordType: errTypeInvalidRequest,
			Message: "the account of this connection does not serve model " + strconvQuote(cl.model) + "; open a new connection for it"}
	}
	deadline := time.Now().Add(s.g.ws.slotWait)
	for {
		release, ok := cl.acquireAccount(ctx, s.ref)
		if ok {
			if lim := s.g.d.Limiter; lim != nil {
				admitted, err := lim.TryHit(cl.slotCtx, *s.ref, cl.session)
				if err != nil || !admitted {
					release()
					ok = false
				}
			}
		}
		if ok {
			return release, nil
		}
		if time.Now().After(deadline) {
			return nil, fromCore(core.ErrRateLimited.WithMessage("the account of this connection is busy or rate limited, please retry later"), errTypeRateLimited)
		}
		select {
		case <-ctx.Done():
			return nil, canceledErr()
		case <-time.After(200 * time.Millisecond):
		}
	}
}

func (s *wsSession) recordAccount(cl *call, id int64, rt *typeRoute) {
	cl.rec.AccountID = &id
	cl.rec.PluginKey, cl.rec.PluginVersion = rt.binding.Plugin.Key, rt.binding.Plugin.Version
	cl.rec.AccountType = rt.binding.Type.ID
	cl.rec.UpstreamProtocol = rt.upstream
	cl.rec.UsageSemantics = rt.usage.Semantics
	if cl.rec.UsageSemantics == "" {
		cl.rec.UsageSemantics = "exclusive"
	}
}

// observe meters one upstream message of a turn and reports whether it ended
// the turn.
func (s *wsSession) observe(ctx context.Context, t *wsTurn, data []byte) (bool, wsOutcome) {
	cl := t.cl
	if cl.rec.FirstTokenMs == 0 {
		cl.rec.FirstTokenMs = max(1, int(s.g.now().Sub(cl.start)/time.Millisecond))
	}
	t.usage.ApplySSE("", data)
	name := gjson.GetBytes(data, "type").String()
	if !terminalEvents[name] {
		return false, wsOutcome{}
	}
	switch name {
	case "response.completed", "response.incomplete":
		return true, wsOutcome{ok: true}
	case "response.failed":
		msg := gjson.GetBytes(data, "response.error.message").String()
		if msg == "" {
			msg = "response failed"
		}
		return true, wsOutcome{status: http.StatusBadGateway, errType: errTypeUpstream, msg: "upstream response failed: " + msg}
	}
	// An error event. One with an HTTP status (rate limit, quota, auth) says
	// something about the account; the plugin decides what.
	status := int(gjson.GetBytes(data, "status").Int())
	if status >= 400 {
		cl.classify(ctx, s.rt, s.pacct, status, nil, data, "")
	} else {
		status = http.StatusBadGateway
	}
	msg := gjson.GetBytes(data, "error.message").String()
	if msg == "" {
		msg = "upstream error event"
	}
	return true, wsOutcome{status: status, errType: errTypeUpstream, msg: "upstream stream error: " + msg}
}

type wsOutcome struct {
	ok      bool
	status  int
	errType string
	msg     string
}

// finish records and bills a turn and releases its slots.
func (s *wsSession) finish(ctx context.Context, t *wsTurn, out wsOutcome) {
	cl := t.cl
	rec := cl.rec
	rec.Tokens = t.usage.Tokens()
	if len(t.usage.Metrics) > 0 {
		rec.Metrics = t.usage.Metrics
	}
	if rec.UpstreamModel == "" && t.usage.Model != "" && t.usage.Model != cl.model {
		rec.UpstreamModel = t.usage.Model
	}
	if out.ok {
		rec.Success, rec.StatusCode, rec.ErrorType, rec.ErrorMessage = true, http.StatusOK, "", ""
	} else {
		rec.Success, rec.StatusCode, rec.ErrorType = false, out.status, out.errType
		if rec.ErrorMessage == "" {
			rec.ErrorMessage = truncateUTF8(out.msg, 1000)
		}
	}
	t.release()
	if id := s.ref; id != nil {
		cl.countTokens(ctx, id.ID)
		if rec.Success {
			s.g.d.Accounts.TouchLastUsed(context.WithoutCancel(ctx), id.ID)
		}
	}
	cl.submit()
}

func strconvQuote(s string) string {
	b, _ := json.Marshal(truncateUTF8(s, 100))
	return string(bytes.TrimSpace(b))
}
