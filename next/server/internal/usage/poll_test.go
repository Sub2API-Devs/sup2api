package usage

import (
	"context"
	"net/http"
	"net/http/httptest"
	"strings"
	"sync/atomic"
	"testing"

	pluginv1 "github.com/Sub2API-Devs/sup2api/next/sdk/gen/pluginv1"
	"github.com/Sub2API-Devs/sup2api/next/sdk/manifest"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/core"
)

type boundPollProxy struct {
	core.ProxyDirectory
	client *http.Client
	id     int64
}

func (p *boundPollProxy) HTTPClient(_ context.Context, id *int64) (*http.Client, error) {
	if id != nil {
		p.id = *id
	}
	return p.client, nil
}

func TestPollHTTPBoundsRedirectsAndPreservesProxyClient(t *testing.T) {
	var destinationHits, admitted atomic.Int32
	dst := httptest.NewServer(http.HandlerFunc(func(http.ResponseWriter, *http.Request) { destinationHits.Add(1) }))
	defer dst.Close()
	up := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.URL.Path == "/large" {
			_, _ = w.Write([]byte(strings.Repeat("x", maxReconcileBody+1)))
			return
		}
		http.Redirect(w, r, dst.URL, http.StatusFound)
	}))
	defer up.Close()
	var sharedRedirect atomic.Int32
	client := &http.Client{CheckRedirect: func(*http.Request, []*http.Request) error { sharedRedirect.Add(1); return nil }}
	proxy := &boundPollProxy{client: client}
	s := &Service{rec: &reconciler{ReconcileDeps: ReconcileDeps{Proxies: proxy, AllowPrivateUpstream: true}}}
	id := int64(42)
	admit := func(context.Context) error { admitted.Add(1); return nil }
	out, err := s.fetchExecutionHTTP(context.Background(), &pluginv1.ExecutionHTTPRequest{Url: up.URL}, &id, admit)
	if err != nil || out.GetStatus() != 302 || destinationHits.Load() != 0 || sharedRedirect.Load() != 0 || proxy.id != 42 {
		t.Fatalf("redirect/proxy boundary: %+v %v destination=%d proxy=%d", out, err, destinationHits.Load(), proxy.id)
	}
	if client.CheckRedirect == nil {
		t.Fatal("shared client mutated")
	}
	_ = client.CheckRedirect(nil, nil)
	if sharedRedirect.Load() != 1 {
		t.Fatal("shared redirect policy changed")
	}
	out, err = s.fetchExecutionHTTP(context.Background(), &pluginv1.ExecutionHTTPRequest{Url: up.URL + "/large"}, &id, admit)
	if err != nil || !out.GetTruncated() || len(out.GetBody()) != maxReconcileBody {
		t.Fatalf("body bound: %d %v %v", len(out.GetBody()), out.GetTruncated(), err)
	}
	for _, req := range []*pluginv1.ExecutionHTTPRequest{
		{Url: up.URL, Method: "CONNECT"}, {Url: up.URL, Headers: map[string]string{"Upgrade": "websocket"}},
		{Url: up.URL, Headers: map[string]string{"Proxy-Authorization": "secret"}}, {Url: up.URL, Body: make([]byte, maxReconcileBody+1)},
	} {
		out, err := s.fetchExecutionHTTP(context.Background(), req, &id, admit)
		if err != nil || out.GetTransportError() == "" {
			t.Fatalf("invalid request accepted: %+v %v", out, err)
		}
	}
	if admitted.Load() != 2 {
		t.Fatalf("invalid request consumed admission: %d", admitted.Load())
	}
	s.rec.AllowPrivateUpstream = false
	out, err = s.fetchExecutionHTTP(context.Background(), &pluginv1.ExecutionHTTPRequest{Url: up.URL}, &id, admit)
	if err != nil || out.GetTransportError() == "" || admitted.Load() != 2 {
		t.Fatal("private destination accepted")
	}
}

type pollPlugin struct {
	*recPlugin
	calls int
	run   func(context.Context, *pluginv1.PollRequest, core.ExecutionHTTP) (*pluginv1.ReconcileResult, error)
}

func (p *pollPlugin) Poll(ctx context.Context, in *pluginv1.PollRequest, http core.ExecutionHTTP) (*pluginv1.ReconcileResult, error) {
	p.calls++
	return p.run(ctx, in, http)
}

type pollLimiter struct {
	core.AccountLimiter
	allow   bool
	calls   int
	account int64
}

func (l *pollLimiter) TryHit(_ context.Context, a core.AccountRef, _ string) (bool, error) {
	l.calls++
	l.account = a.ID
	return l.allow, nil
}

func TestLegacyPollUsesBoundAccountAndDefersWithoutBurningAttempts(t *testing.T) {
	proxyID := int64(42)
	rf := reconcileFixtureWith(t, &core.Account{AccountRef: core.AccountRef{ID: 7, PluginKey: "vid", Type: "vid_key", ProxyID: &proxyID}, Status: "active"})
	f := rf.fixture
	gen := f.svc.rec.Registry.Current().(*recGen)
	gen.info.Manifest = &manifest.Manifest{Capabilities: []manifest.Capability{{ID: manifest.CapPlatformPoll}}}
	pp := &pollPlugin{recPlugin: rf.plugin}
	pp.run = func(ctx context.Context, in *pluginv1.PollRequest, execute core.ExecutionHTTP) (*pluginv1.ReconcileResult, error) {
		if in.GetEntry().GetRefId() != "legacy-poll" || in.GetAccount().GetId() != 7 {
			t.Errorf("wrong bound identity: %+v", in)
		}
		_, err := execute(ctx, &pluginv1.ExecutionHTTPRequest{Url: rf.up.URL})
		return &pluginv1.ReconcileResult{State: pluginv1.ReconcileResult_FAILED, Reason: "upstream failure"}, err
	}
	gen.client = pp
	proxy := &boundPollProxy{client: rf.up.Client()}
	f.svc.rec.Proxies = proxy
	slots := &taskTestSlots{allow: false}
	f.svc.rec.Slots = slots
	limits := &pollLimiter{allow: false}
	f.svc.rec.Limiter = limits
	r := f.reserved("req-legacy-poll", "legacy-poll", core.UsageTokens{Input: 1000, Output: 100})
	f.svc.process(context.Background(), []*core.UsageRecord{r})
	check := func() {
		t.Helper()
		if a := f.scalar(`SELECT attempts FROM pending_settlements WHERE ref_id='legacy-poll'`); a != "0" {
			t.Fatalf("deferred attempt consumed: %s", a)
		}
	}
	f.due()
	f.svc.ReconcileDue(context.Background())
	check()
	if pp.calls != 0 || rf.hits.Load() != 0 {
		t.Fatal("busy account was polled")
	}
	slots.allow = true
	f.due()
	f.svc.ReconcileDue(context.Background())
	check()
	if pp.calls != 1 || rf.hits.Load() != 0 || limits.account != 7 {
		t.Fatal("rate-limit boundary not applied")
	}
	limits.allow = true
	f.due()
	f.svc.ReconcileDue(context.Background())
	if pp.calls != 2 || rf.hits.Load() != 1 || proxy.id != 42 || rf.plugin.builds.Load() != 0 || rf.plugin.parses.Load() != 0 {
		t.Fatalf("Poll routing: calls=%d HTTP=%d proxy=%d", pp.calls, rf.hits.Load(), proxy.id)
	}
	if f.scalar(`SELECT billing_status FROM usage_logs WHERE request_id='req-legacy-poll'`) != StatusFree {
		t.Fatal("Poll outcome did not settle original reservation")
	}
	if f.cost("req-legacy-poll").Sign() != 0 {
		t.Fatal("failed task did not refund")
	}
}
