package accounts

import (
	"context"
	"errors"
	"net"
	"net/http"
	"net/http/httptest"
	"net/netip"
	"path/filepath"
	"strconv"
	"strings"
	"sync"
	"testing"
	"time"

	"ccgateway/controller/internal/cliprofile"
	"ccgateway/controller/internal/clock"
	"ccgateway/controller/internal/config"
	"ccgateway/controller/internal/contract"
	"ccgateway/controller/internal/errs"
	"ccgateway/controller/internal/guardapi"
	"ccgateway/controller/internal/guardapi/fakeguard"
	"ccgateway/controller/internal/hoststate"
	"ccgateway/controller/internal/logx"
	"ccgateway/controller/internal/netplan"
	"ccgateway/controller/internal/pyjson"
	"ccgateway/controller/internal/rnd"
	"ccgateway/controller/internal/store"
	"ccgateway/controller/internal/workeradmin"
)

const (
	draftKey   = "d0123456789abcdef"
	otherDraft = "dfedcba9876543210"
	proxyIP    = "198.51.100.7"
)

var (
	rev  = strings.Repeat("a", 64)
	revB = strings.Repeat("b", 64)
	revC = strings.Repeat("c", 64)
	bg   = context.Background()
)

// resolver is a mutable test resolver (proxy host -> addresses).
type resolver struct {
	mu    sync.Mutex
	hosts map[string][]string
	calls int
}

func (r *resolver) set(host string, addrs ...string) {
	r.mu.Lock()
	defer r.mu.Unlock()
	if r.hosts == nil {
		r.hosts = map[string][]string{}
	}
	r.hosts[host] = addrs
}

func (r *resolver) LookupIPv4(_ context.Context, host string) ([]netip.Addr, error) {
	r.mu.Lock()
	defer r.mu.Unlock()
	r.calls++
	list, ok := r.hosts[host]
	if !ok {
		return nil, errors.New("no such host")
	}
	var out []netip.Addr
	for _, a := range list {
		out = append(out, netip.MustParseAddr(a))
	}
	return out, nil
}

// syncBuffer is a log sink safe for concurrent writes.
type syncBuffer struct {
	mu sync.Mutex
	b  strings.Builder
}

func (s *syncBuffer) Write(p []byte) (int, error) {
	s.mu.Lock()
	defer s.mu.Unlock()
	return s.b.Write(p)
}

func (s *syncBuffer) String() string {
	s.mu.Lock()
	defer s.mu.Unlock()
	return s.b.String()
}

// env is a Manager on a FakeGuard and a temporary data root.
type env struct {
	t        *testing.T
	g        *fakeguard.Guard
	dir      string
	st       *store.Store
	images   *hoststate.Images
	quota    *hoststate.DiskQuota
	clock    *clock.Fake
	resolver *resolver
	logs     *syncBuffer
	m        *Manager
	cfg      config.Config
	worker   *workeradmin.Client
}

func newEnv(t *testing.T) *env {
	t.Helper()
	g := fakeguard.New()
	g.AddImage("app:test", fakeguard.ImageSpec{})
	e := &env{t: t, g: g, dir: filepath.Join(t.TempDir(), "root"), quota: &hoststate.DiskQuota{},
		clock: clock.NewFake(time.Date(2026, 11, 1, 0, 0, 0, 0, time.UTC)), resolver: &resolver{}, logs: &syncBuffer{},
		cfg: config.Config{Prefix: "ccg", AccountDiskBytes: 10 << 30, ProbeURL: "http://probe.invalid/",
			AppImage: "app:test", EgressImage: "ccgateway-egress:test"},
		// No Worker listens unless a test starts one (never dial a real address).
		worker: &workeradmin.Client{Port: 1, HostOverride: "127.0.0.1"}}
	g.OnJob(e.defaultJob)
	e.open("app:test", "ccgateway-egress:test")
	t.Cleanup(func() { e.st.Close() })
	return e
}

// open (re)starts the controller on the same data root and guard.
func (e *env) open(appImage, egressImage string) {
	e.t.Helper()
	if e.st != nil {
		e.st.Close()
	}
	st, err := store.Open(e.dir)
	if err != nil {
		e.t.Fatal(err)
	}
	e.st = st
	if e.images, err = hoststate.NewImages(st, appImage, egressImage, e.clock); err != nil {
		e.t.Fatal(err)
	}
	opts := Options{Config: e.cfg, Store: st, Guard: e.g.Client(), Images: e.images, DiskQuota: e.quota,
		Clock: e.clock, Rand: rnd.Fixed(1), Resolver: e.resolver, Worker: e.worker,
		Log: logx.New(e.logs, "ccgateway.controller")}
	m, err := New(opts)
	if err != nil {
		e.t.Fatal(err)
	}
	e.m = m
}

// desired is a configuration with a proxy (an address literal: no lookup).
func desired(revision string, extra ...pyjson.KV) pyjson.Ordered {
	d := pyjson.Ordered{{Key: "revision", Value: revision}, {Key: "proxy", Value: proxyObj(proxyIP)}}
	for _, kv := range extra {
		d.Set(kv.Key, kv.Value)
	}
	return d
}

func proxyObj(host string) pyjson.Ordered {
	return pyjson.Ordered{{Key: "protocol", Value: "http"}, {Key: "host", Value: host}, {Key: "port", Value: int64(3128)}}
}

func obj(t *testing.T, s string) any {
	t.Helper()
	v, err := pyjson.Decode([]byte(s))
	if err != nil {
		t.Fatal(err)
	}
	return v
}

func kv(k string, v any) pyjson.KV { return pyjson.KV{Key: k, Value: v} }

func (e *env) apply(aid string, d pyjson.Ordered) (pyjson.Valuer, error) {
	return e.m.Apply(bg, aid, d)
}

// mustApply applies a ready configuration and returns the public status.
func (e *env) mustApply(aid string, d pyjson.Ordered) *contract.Public {
	e.t.Helper()
	out, err := e.apply(aid, d)
	if err != nil {
		e.t.Fatalf("apply %s: %v", aid, err)
	}
	p, ok := out.(*contract.Public)
	if !ok {
		e.t.Fatalf("apply %s: %#v", aid, out)
	}
	return p
}

func (e *env) status(aid string) string {
	e.t.Helper()
	p, err := e.m.Public(bg, aid)
	if err != nil {
		e.t.Fatal(err)
	}
	return p.Status
}

func (e *env) state(aid string) *store.AccountState {
	e.t.Helper()
	st, err := e.m.State(aid)
	if err != nil {
		e.t.Fatal(err)
	}
	return st
}

func (e *env) save(aid string, st *store.AccountState) {
	e.t.Helper()
	if err := e.st.SaveState(aid, st); err != nil {
		e.t.Fatal(err)
	}
}

// app is the account container's inspect (nil when absent).
func (e *env) app(aid string) *guardapi.Container {
	raw := e.g.Inspect("ccg-" + aid + "-app")
	if raw == nil {
		return nil
	}
	c, err := guardapi.ParseContainer(raw)
	if err != nil {
		e.t.Fatal(err)
	}
	return c
}

func (e *env) appID(aid string) string {
	if c := e.app(aid); c != nil {
		return c.ID
	}
	return ""
}

func (e *env) appEnv(aid string) map[string]string { return e.app(aid).EnvMap() }

func (e *env) provision(aid string, authRaw any) (*store.AccountState, error) {
	return e.m.provision(bg, aid, authRaw, defaultPolicy(), nil)
}

func defaultPolicy() netplan.Policy { return netplan.Policy{Pool: "10.0.0.0/8", Allocation: "random"} }

func apiKeyAuth() any {
	return pyjson.Ordered{{Key: "mode", Value: "api_key"}, {Key: "api_key", Value: "fixture-key"},
		{Key: "base_url", Value: "https://api.example.test"}}
}

func isKind(err error, k errs.Kind) bool { return errs.Is(err, k) }

// workerServer is an account Worker admin port (PUT admin/environment).
type workerServer struct {
	mu     sync.Mutex
	status int
	view   func(body []byte) []byte
	calls  []workerCall
	srv    *httptest.Server
}

type workerCall struct {
	Method, Path, Auth string
	Body               []byte
}

func (e *env) startWorker(status int) *workerServer {
	w := &workerServer{status: status}
	w.srv = httptest.NewServer(http.HandlerFunc(func(rw http.ResponseWriter, r *http.Request) {
		body := make([]byte, r.ContentLength)
		if r.ContentLength > 0 {
			r.Body.Read(body)
		}
		w.mu.Lock()
		w.calls = append(w.calls, workerCall{Method: r.Method, Path: r.URL.Path, Auth: r.Header.Get("Authorization"), Body: body})
		status, view := w.status, w.view
		w.mu.Unlock()
		rw.WriteHeader(status)
		if view != nil {
			rw.Write(view(body))
		} else {
			rw.Write(body)
		}
	}))
	e.t.Cleanup(w.srv.Close)
	_, port, _ := net.SplitHostPort(strings.TrimPrefix(w.srv.URL, "http://"))
	p, _ := strconv.Atoi(port)
	e.worker = &workeradmin.Client{Port: p, HostOverride: "127.0.0.1"}
	e.m.worker = e.worker
	return w
}

func (w *workerServer) set(status int, view func([]byte) []byte) {
	w.mu.Lock()
	defer w.mu.Unlock()
	w.status, w.view, w.calls = status, view, nil
}

func (w *workerServer) count() int {
	w.mu.Lock()
	defer w.mu.Unlock()
	return len(w.calls)
}

func (w *workerServer) last() workerCall {
	w.mu.Lock()
	defer w.mu.Unlock()
	return w.calls[len(w.calls)-1]
}

// packagedCLI is the one CLI every image packages unless a test says
// otherwise (prober).
const packagedCLI = "2.1.312"

// probeAnswer is the CLI probe's answer for version.
func probeAnswer(version string) []byte {
	return pyjson.MustMarshal(pyjson.Ordered{kv("path", "/opt/ccgateway/cli/"+version+"/claude"), kv("version", version),
		kv("sha256", strings.Repeat("a", 64)), kv("patch", "ccgateway-v7-request-modes")})
}

// defaultJob answers the CLI jobs as for an image packaging packagedCLI;
// every other job exits 0 without output.
func (e *env) defaultJob(aid string, job guardapi.Job) (int, []byte) {
	if len(job.Argv) >= 2 && job.Argv[1] == cliprofile.PackagedScript {
		return 0, []byte(`["` + packagedCLI + `"]`)
	}
	if len(job.Argv) >= 3 && job.Argv[1] == cliprofile.ProbeScript {
		if job.Argv[2] != packagedCLI {
			return 1, []byte("requested CLI version/mode is not packaged in this image")
		}
		return 0, probeAnswer(packagedCLI)
	}
	return 0, nil
}
