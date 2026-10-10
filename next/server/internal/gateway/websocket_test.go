package gateway

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"net/http"
	"net/http/httptest"
	"strings"
	"sync"
	"sync/atomic"
	"testing"
	"time"

	"github.com/coder/websocket"
	"github.com/tidwall/gjson"

	pluginv1 "github.com/Sub2API-Devs/sup2api/next/sdk/gen/pluginv1"
	"github.com/Sub2API-Devs/sup2api/next/sdk/manifest"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/core"
)

const (
	wsModel     = "gpt-5-ws"
	wsInput     = 31
	wsOutput    = 9
	wsCacheRead = 4
)

// wsUpstream is a Responses WebSocket server: every response.create is
// answered with response.created, one delta and response.completed. The
// "input" of a message selects a misbehaviour.
type wsUpstream struct {
	srv *httptest.Server

	mu       sync.Mutex
	reject   map[string]int // api key -> handshake status
	keys     []string       // api key of every accepted handshake
	headers  []http.Header
	messages []string
	hold     chan struct{} // "hold": wait before completing
	open     atomic.Int64
}

func newWSUpstream(t *testing.T) *wsUpstream {
	u := &wsUpstream{reject: map[string]int{}}
	u.srv = httptest.NewServer(http.HandlerFunc(u.handle))
	t.Cleanup(u.srv.Close)
	return u
}

func (u *wsUpstream) handle(w http.ResponseWriter, r *http.Request) {
	key := strings.TrimPrefix(r.Header.Get("Authorization"), "Bearer ")
	u.mu.Lock()
	status := u.reject[key]
	u.mu.Unlock()
	if status != 0 {
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(status)
		_, _ = fmt.Fprintf(w, `{"error":{"type":"invalid_request_error","message":"rejected %d"}}`, status)
		return
	}
	conn, err := websocket.Accept(w, r, nil)
	if err != nil {
		return
	}
	conn.SetReadLimit(1 << 20)
	u.mu.Lock()
	u.keys = append(u.keys, key)
	u.headers = append(u.headers, r.Header.Clone())
	u.mu.Unlock()
	u.open.Add(1)
	defer u.open.Add(-1)
	defer conn.CloseNow()
	ctx := context.Background()
	send := func(v map[string]any) {
		b, _ := json.Marshal(v)
		_ = conn.Write(ctx, websocket.MessageText, b)
	}
	for n := 1; ; n++ {
		_, data, err := conn.Read(ctx)
		if err != nil {
			return
		}
		u.mu.Lock()
		u.messages = append(u.messages, string(data))
		hold := u.hold
		u.mu.Unlock()
		model := gjson.GetBytes(data, "model").String()
		id := fmt.Sprintf("resp_%d", n)
		switch gjson.GetBytes(data, "input").String() {
		case "drop":
			return
		case "rate-limit":
			send(map[string]any{"type": "error", "status": 429, "error": map[string]any{"type": "rate_limit_error", "message": "slow down"}})
			continue
		case "fail":
			send(map[string]any{"type": "response.failed", "response": map[string]any{"id": id, "model": model, "status": "failed",
				"error": map[string]any{"code": "server_error", "message": "boom"}}})
			continue
		case "hold":
			send(map[string]any{"type": "response.created", "response": map[string]any{"id": id, "model": model}})
			<-hold
		default:
			send(map[string]any{"type": "response.created", "response": map[string]any{"id": id, "model": model}})
		}
		send(map[string]any{"type": "response.output_text.delta", "delta": "hi"})
		send(map[string]any{"type": "response.completed", "response": map[string]any{"id": id, "model": model, "status": "completed",
			"usage": map[string]any{"input_tokens": wsInput, "output_tokens": wsOutput, "input_tokens_details": map[string]any{"cached_tokens": wsCacheRead}}}})
	}
}

func (u *wsUpstream) snapshot() (keys, messages []string) {
	u.mu.Lock()
	defer u.mu.Unlock()
	return append([]string(nil), u.keys...), append([]string(nil), u.messages...)
}

// wsPlatform is the openai plugin's account type as far as the gateway
// cares: it answers the Responses WebSocket protocol with a GET ws:// URL.
type wsPlatform struct {
	*fakePlatform
	up *wsUpstream
}

func (p *wsPlatform) BuildUpstreamRequest(_ context.Context, in *pluginv1.BuildUpstreamRequestRequest) (*pluginv1.BuildUpstreamRequestResponse, error) {
	p.mu.Lock()
	p.builds = append(p.builds, in)
	p.mu.Unlock()
	key := gjson.Get(in.GetAccount().GetCredentialsJson(), "api_key").String()
	return &pluginv1.BuildUpstreamRequestResponse{Method: "GET", Url: "ws" + strings.TrimPrefix(p.up.srv.URL, "http") + "/v1/responses",
		Headers: map[string]string{"authorization": "Bearer " + key, "openai-beta": "responses_websockets=2026-02-06"}}, nil
}

type wsEnv struct {
	*env
	wsUp     *wsUpstream
	wsPlat   *wsPlatform
	draining atomic.Bool
}

// newWSEnv adds an "openai" plugin whose apikey type serves the built-in
// openai platform and declares platform.websocket.v1, two of its accounts
// (11 first, then 12) and a price for wsModel.
func newWSEnv(t *testing.T, caps ...string) *wsEnv {
	if caps == nil {
		caps = []string{manifest.CapPlatformAdapter, manifest.CapPlatformWebSocket}
	}
	e := &wsEnv{env: newEnv(t)}
	e.wsUp = newWSUpstream(t)
	m := &manifest.Manifest{Key: "openai", Version: "0.3.0", AccountTypes: []manifest.AccountType{{ID: "apikey",
		Platforms: []manifest.AccountPlatform{{Platform: manifest.PlatformOpenAI}}}}}
	for _, c := range caps {
		m.Capabilities = append(m.Capabilities, manifest.Capability{ID: c})
	}
	info := core.PluginInfo{Key: "openai", Version: "0.3.0", Manifest: m}
	e.wsPlat = &wsPlatform{fakePlatform: &fakePlatform{}, up: e.wsUp}
	e.gen.plugins = append(e.gen.plugins, info)
	e.gen.accountTypes = append(e.gen.accountTypes, core.AccountTypeBinding{Plugin: info, Type: m.AccountTypes[0], Client: e.wsPlat})
	e.accounts.addTyped(testGroup, 11, 1, "oa-11", "openai", "apikey")
	e.accounts.addTyped(testGroup, 12, 2, "oa-12", "openai", "apikey")
	e.pricer.rules[wsModel] = &core.PriceRule{ID: 10, Model: wsModel, Mode: "per_token", Expression: "p*3", ExprHash: "w"}
	e.gw.d.Draining = e.draining.Load
	e.gw.ws.drainPoll = 20 * time.Millisecond
	return e
}

type wsClient struct {
	t    *testing.T
	conn *websocket.Conn
}

func (e *wsEnv) dial(header http.Header) (*wsClient, *http.Response, error) {
	if header == nil {
		header = http.Header{"Authorization": {"Bearer " + testKey}}
	}
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()
	conn, resp, err := websocket.Dial(ctx, "ws"+strings.TrimPrefix(e.srv.URL, "http")+"/v1/responses", &websocket.DialOptions{HTTPHeader: header})
	if err != nil {
		return nil, resp, err
	}
	e.t.Cleanup(func() { conn.CloseNow() })
	return &wsClient{t: e.t, conn: conn}, resp, nil
}

func (e *wsEnv) mustDial() *wsClient {
	e.t.Helper()
	c, _, err := e.dial(nil)
	if err != nil {
		e.t.Fatal(err)
	}
	return c
}

func (c *wsClient) send(v map[string]any) {
	c.t.Helper()
	b, _ := json.Marshal(v)
	if err := c.conn.Write(context.Background(), websocket.MessageText, b); err != nil {
		c.t.Fatal(err)
	}
}

func create(model, input string) map[string]any {
	return map[string]any{"type": "response.create", "model": model, "input": input, "store": false}
}

// next reads one event.
func (c *wsClient) next() (gjson.Result, error) {
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()
	_, data, err := c.conn.Read(ctx)
	if err != nil {
		return gjson.Result{}, err
	}
	return gjson.ParseBytes(data), nil
}

// until reads events up to and including one of type typ.
func (c *wsClient) until(typ string) []gjson.Result {
	c.t.Helper()
	var out []gjson.Result
	for {
		ev, err := c.next()
		if err != nil {
			c.t.Fatalf("waiting for %s after %d events: %v", typ, len(out), err)
		}
		out = append(out, ev)
		if ev.Get("type").String() == typ {
			return out
		}
	}
}

// closed waits for the server to close the connection and returns the code.
func (c *wsClient) closed() websocket.StatusCode {
	c.t.Helper()
	for {
		if _, err := c.next(); err != nil {
			code := websocket.CloseStatus(err)
			if code == -1 {
				c.t.Fatalf("connection ended without a close frame: %v", err)
			}
			return code
		}
	}
}

func TestWebSocketTurnsShareOneUpstreamAndAreBilledEach(t *testing.T) {
	e := newWSEnv(t)
	c := e.mustDial()
	var ids []string
	for i := 0; i < 2; i++ {
		c.send(create(wsModel, fmt.Sprint("turn ", i)))
		evs := c.until("response.completed")
		if len(evs) != 3 || evs[0].Get("type").String() != "response.created" {
			t.Fatalf("turn %d events: %v", i, evs)
		}
		r := e.record()
		ids = append(ids, r.RequestID)
		if !r.Success || r.StatusCode != 200 || r.Protocol != "openai.responses_ws" || !r.Stream || r.Model != wsModel ||
			r.AccountID == nil || *r.AccountID != 11 || r.PluginKey != "openai" || r.UsageSemantics != "inclusive" {
			t.Fatalf("turn %d record: %+v", i, r)
		}
		if r.Tokens.Input != wsInput || r.Tokens.Output != wsOutput || r.Tokens.CacheRead != wsCacheRead || r.Price == nil || !r.Billable {
			t.Fatalf("turn %d usage: %+v billable %v", i, r.Tokens, r.Billable)
		}
	}
	if ids[0] == ids[1] {
		t.Fatal("turns share a request id, the ledger would bill them once")
	}
	keys, msgs := e.wsUp.snapshot()
	if len(keys) != 1 || keys[0] != "oa-11" || len(msgs) != 2 {
		t.Fatalf("one upstream connection for both turns: keys %v messages %d", keys, len(msgs))
	}
	if h := e.wsUp.headers[0]; h.Get("Openai-Beta") != "responses_websockets=2026-02-06" || h.Get("Authorization") != "Bearer oa-11" {
		t.Fatalf("handshake headers %v", h)
	}
	if gjson.Get(msgs[0], "type").String() != "response.create" || gjson.Get(msgs[0], "store").Bool() {
		t.Fatalf("message not relayed as sent: %s", msgs[0])
	}
	if b := e.wsPlat.builds; len(b) != 1 || b[0].GetMeta().GetProtocol() != "openai.responses_ws" || !b[0].GetMeta().GetStream() {
		t.Fatalf("plugin asked %d times: %v", len(b), b)
	}
	// Every slot is free between turns.
	if n, _ := e.slots.InUse(context.Background(), "account", 11); n != 0 {
		t.Fatalf("account slot held between turns: %d", n)
	}
	if n, _ := e.slots.InUse(context.Background(), "ws", 5); n != 1 {
		t.Fatalf("connection slot: %d", n)
	}
	c.conn.Close(websocket.StatusNormalClosure, "")
	waitFor(t, func() bool {
		n, _ := e.slots.InUse(context.Background(), "ws", 5)
		return n == 0 && e.wsUp.open.Load() == 0
	})
}

func TestWebSocketHandshakeFailoverDisablesTheAccount(t *testing.T) {
	e := newWSEnv(t)
	e.wsUp.reject["oa-11"] = http.StatusUnauthorized
	c := e.mustDial()
	c.send(create(wsModel, "hello"))
	c.until("response.completed")
	r := e.record()
	if *r.AccountID != 12 || r.Attempts != 2 || !r.Success {
		t.Fatalf("record after failover: %+v", r)
	}
	if _, disabled := e.accounts.disabled[11]; !disabled {
		t.Fatal("the account whose key was rejected is still enabled")
	}
	// Every account rejected: the turn fails, the connection stays.
	e.wsUp.reject["oa-12"] = http.StatusUnauthorized
	c2 := e.mustDial()
	c2.send(create(wsModel, "hello"))
	if ev := c2.until("error"); ev[0].Get("status").Int() != 401 || ev[0].Get("error.type").String() != "authentication_error" {
		t.Fatalf("every key rejected: %v", ev)
	}
	if r := e.record(); r.Success || r.ErrorType != errTypeUpstream || r.Attempts != 1 {
		t.Fatalf("failed turn record: %+v", r)
	}
}

func TestWebSocketTurnErrorsKeepTheConnection(t *testing.T) {
	e := newWSEnv(t)
	e.auth.keys[testKey].Group.ModelAllowlist = []string{"gpt-*"}
	c := e.mustDial()
	for _, tc := range []struct {
		msg    map[string]any
		status int64
		record string
	}{
		{map[string]any{"type": "response.append", "model": wsModel}, 400, ""},
		{create("claude-x", "hi"), 404, errTypeModelNotAllowed},
		{create("gpt-unpriced", "hi"), 403, errTypePriceNotConfigured},
	} {
		c.send(tc.msg)
		ev := c.until("error")
		if ev[0].Get("status").Int() != tc.status {
			t.Fatalf("%v: %v", tc.msg, ev)
		}
		if tc.record != "" {
			if r := e.record(); r.ErrorType != tc.record || r.Success {
				t.Fatalf("%v record: %+v", tc.msg, r)
			}
		}
	}
	e.balance.broke[testUser] = true
	c.send(create(wsModel, "hi"))
	if ev := c.until("error"); ev[0].Get("status").Int() != 402 {
		t.Fatalf("broke user: %v", ev)
	}
	e.record()
	e.balance.broke[testUser] = false
	// One response at a time per connection.
	hold := make(chan struct{})
	e.wsUp.hold = hold
	c.send(create(wsModel, "hold"))
	c.until("response.created")
	c.send(create(wsModel, "second"))
	if ev := c.until("error"); ev[0].Get("error.code").String() != "response_in_progress" {
		t.Fatalf("second response.create during a turn: %v", ev)
	}
	close(hold)
	c.until("response.completed")
	if r := e.record(); !r.Success {
		t.Fatalf("held turn: %+v", r)
	}
	if _, msgs := e.wsUp.snapshot(); len(msgs) != 1 {
		t.Fatalf("rejected turns reached the upstream: %v", msgs)
	}
}

func TestWebSocketUpstreamEventsDecideTheTurn(t *testing.T) {
	e := newWSEnv(t)
	c := e.mustDial()
	c.send(create(wsModel, "rate-limit"))
	if ev := c.until("error"); ev[0].Get("error.type").String() != "rate_limit_error" {
		t.Fatalf("upstream error event not relayed: %v", ev)
	}
	r := e.record()
	if r.Success || r.StatusCode != 429 || r.ErrorType != errTypeUpstream {
		t.Fatalf("rate limited turn: %+v", r)
	}
	if !time.Now().Before(e.accounts.cooldown[11]) {
		t.Fatal("rate limited account not cooled down")
	}
	c.send(create(wsModel, "fail"))
	c.until("response.failed")
	if r := e.record(); r.Success || !strings.Contains(r.ErrorMessage, "boom") {
		t.Fatalf("failed response: %+v", r)
	}
	// The session goes on on the same connection.
	c.send(create(wsModel, "ok"))
	c.until("response.completed")
	if r := e.record(); !r.Success {
		t.Fatalf("turn after errors: %+v", r)
	}
	// The upstream connection dropping ends the session.
	c.send(create(wsModel, "drop"))
	if code := c.closed(); code != websocket.StatusInternalError {
		t.Fatalf("close after upstream drop: %d", code)
	}
	if r := e.record(); r.Success || r.ErrorType != errTypeUpstream {
		t.Fatalf("dropped turn: %+v", r)
	}
}

func TestWebSocketClientLeavingCancelsTheTurn(t *testing.T) {
	e := newWSEnv(t)
	hold := make(chan struct{})
	defer close(hold)
	e.wsUp.hold = hold
	c := e.mustDial()
	c.send(create(wsModel, "hold"))
	c.until("response.created")
	c.conn.CloseNow()
	r := e.record()
	if r.Success || r.ErrorType != errTypeClientCanceled || r.StatusCode != statusClientClosed {
		t.Fatalf("canceled turn: %+v", r)
	}
	waitFor(t, func() bool { n, _ := e.slots.InUse(context.Background(), "account", 11); return n == 0 })
}

func TestWebSocketDrainClosesWithServiceRestart(t *testing.T) {
	e := newWSEnv(t)
	idle := e.mustDial()
	idle.send(create(wsModel, "hi"))
	idle.until("response.completed")
	e.record()
	hold := make(chan struct{})
	e.wsUp.hold = hold
	busy := e.mustDial()
	busy.send(create(wsModel, "hold"))
	busy.until("response.created")

	e.draining.Store(true)
	if code := idle.closed(); code != wsCloseRestart {
		t.Fatalf("idle session closed with %d", code)
	}
	// The turn in progress finishes, then the session closes.
	time.Sleep(100 * time.Millisecond)
	close(hold)
	busy.until("response.completed")
	if code := busy.closed(); code != wsCloseRestart {
		t.Fatalf("busy session closed with %d", code)
	}
	if r := e.record(); !r.Success {
		t.Fatalf("turn finished during drain: %+v", r)
	}
	if _, resp, err := e.dial(nil); err == nil || resp == nil || resp.StatusCode != 503 {
		t.Fatalf("new session while draining: %v %v", resp, err)
	}
}

func TestWebSocketDrainGraceEndsALongTurn(t *testing.T) {
	e := newWSEnv(t)
	e.gw.ws.drainGrace = 200 * time.Millisecond
	hold := make(chan struct{})
	defer close(hold)
	e.wsUp.hold = hold
	c := e.mustDial()
	c.send(create(wsModel, "hold"))
	c.until("response.created")
	e.draining.Store(true)
	if code := c.closed(); code != wsCloseRestart {
		t.Fatalf("long turn closed with %d", code)
	}
	if r := e.record(); r.Success || r.StatusCode != 503 {
		t.Fatalf("turn cut by drain: %+v", r)
	}
}

func TestWebSocketConnectionLimits(t *testing.T) {
	e := newWSEnv(t)
	if _, resp, err := e.dial(http.Header{}); err == nil || resp == nil || resp.StatusCode != 401 {
		t.Fatalf("no key: %v %v", resp, err)
	}
	resp, err := http.Get(e.srv.URL + "/v1/responses")
	if err != nil || resp.StatusCode != http.StatusUpgradeRequired {
		t.Fatalf("plain GET: %v %v", resp, err)
	}
	resp.Body.Close()
	e.gw.ws.maxPerKey = 1
	e.gw.ws.firstMessage = 200 * time.Millisecond
	first := e.mustDial()
	if _, resp, err := e.dial(nil); err == nil || resp == nil || resp.StatusCode != 429 {
		t.Fatalf("second connection over the limit: %v %v", resp, err)
	}
	if code := first.closed(); code != websocket.StatusPolicyViolation {
		t.Fatalf("no first message: %d", code)
	}
	waitFor(t, func() bool { n, _ := e.slots.InUse(context.Background(), "ws", 5); return n == 0 })
	e.gw.ws.idle = 200 * time.Millisecond
	c := e.mustDial()
	c.send(create(wsModel, "hi"))
	c.until("response.completed")
	e.record()
	if code := c.closed(); code != websocket.StatusNormalClosure {
		t.Fatalf("idle session: %d", code)
	}
}

func TestWebSocketNeedsAPluginThatBuildsWebSockets(t *testing.T) {
	e := newWSEnv(t, manifest.CapPlatformAdapter)
	c := e.mustDial()
	c.send(create(wsModel, "hi"))
	if ev := c.until("error"); ev[0].Get("status").Int() != 404 {
		t.Fatalf("no websocket-capable account type: %v", ev)
	}
	if r := e.record(); r.ErrorType != errTypeNoAccount {
		t.Fatalf("record: %+v", r)
	}
	if len(e.wsPlat.builds) != 0 {
		t.Fatal("a plugin without platform.websocket.v1 was asked for a handshake")
	}
}

func waitFor(t *testing.T, fn func() bool) {
	t.Helper()
	deadline := time.Now().Add(5 * time.Second)
	for !fn() {
		if time.Now().After(deadline) {
			t.Fatal(errors.New("condition not reached"))
		}
		time.Sleep(10 * time.Millisecond)
	}
}

// The upstream connection outlives its handshake deadline, and the account's
// model mapping applies to every turn sent on it.
func TestWebSocketUpstreamOutlivesTheHandshakeAndMapsModels(t *testing.T) {
	e := newWSEnv(t)
	e.gw.ws.handshake = 100 * time.Millisecond
	e.accounts.mu.Lock()
	e.accounts.accounts[11].ModelMapping = map[string]string{wsModel: "gpt-5-upstream"}
	e.accounts.mu.Unlock()
	c := e.mustDial()
	for i := 0; i < 2; i++ {
		c.send(create(wsModel, "hi"))
		c.until("response.completed")
		if r := e.record(); !r.Success || r.Model != wsModel || r.UpstreamModel != "gpt-5-upstream" {
			t.Fatalf("turn %d: %+v", i, r)
		}
		time.Sleep(300 * time.Millisecond)
	}
	keys, msgs := e.wsUp.snapshot()
	if len(keys) != 1 || len(msgs) != 2 || gjson.Get(msgs[1], "model").String() != "gpt-5-upstream" {
		t.Fatalf("upstream connections %v, messages %v", keys, msgs)
	}
}
