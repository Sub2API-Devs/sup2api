package updates

import (
	"bytes"
	"context"
	"encoding/json"
	"io"
	"net/http"
	"net/http/httptest"
	"net/url"
	"path/filepath"
	"strconv"
	"strings"
	"sync"
	"testing"
	"time"

	"ccgateway/controller/internal/clock"
	"ccgateway/controller/internal/containerfs"
	"ccgateway/controller/internal/guardapi"
	"ccgateway/controller/internal/guardapi/fakeguard"
	"ccgateway/controller/internal/keylock"
	"ccgateway/controller/internal/logx"
	"ccgateway/controller/internal/names"
	"ccgateway/controller/internal/pyjson"
	"ccgateway/controller/internal/rnd"
	"ccgateway/controller/internal/scripts"
	"ccgateway/controller/internal/store"
	"ccgateway/controller/internal/workeradmin"
)

const (
	aid     = "21"
	appName = "ccg-21-app"
	worker  = "/usr/local/bin/worker"
	legacy  = "/usr/local/bin/ccgateway"
)

var (
	rev   = strings.Repeat("ab", 32)
	old   = bytes.Repeat([]byte("\x7fELF old worker program\x00"), 64)
	nw    = bytes.Repeat([]byte("\x7fELF new worker program\x01"), 64)
	bad   = bytes.Repeat([]byte("\x7fELF unhealthy worker\x02"), 64)
	crash = bytes.Repeat([]byte("\x7fELF crashing worker\x03"), 64)
)

// gw wraps the fake guard's client to script what FakeGuard cannot:
// restarts that fail or crash, process lists that change, archives.
type gw struct {
	guardapi.Client
	mu              sync.Mutex
	restarts        int
	tops            int
	onRestart       func(n int) error // before the restart; an error skips it
	afterRestart    func(n int)
	onTop           func(n int)
	archiveOverride []byte
}

func (w *gw) AppAction(ctx context.Context, aid, action string, timeout *int) error {
	w.mu.Lock()
	w.restarts++
	n, before, after := w.restarts, w.onRestart, w.afterRestart
	w.mu.Unlock()
	if action != guardapi.ActionRestart || timeout == nil || *timeout != RestartTimeout {
		panic("unexpected app action " + action)
	}
	if before != nil {
		if err := before(n); err != nil {
			return err
		}
	}
	err := w.Client.AppAction(ctx, aid, action, timeout)
	if after != nil {
		after(n)
	}
	return err
}

func (w *gw) AppTop(ctx context.Context, aid string) (*guardapi.Top, error) {
	w.mu.Lock()
	w.tops++
	n, hook := w.tops, w.onTop
	w.mu.Unlock()
	if hook != nil {
		hook(n)
	}
	return w.Client.AppTop(ctx, aid)
}

func (w *gw) AppArchiveGet(ctx context.Context, aid, path string) (io.ReadCloser, error) {
	w.mu.Lock()
	override := w.archiveOverride
	w.mu.Unlock()
	if override != nil {
		return io.NopCloser(bytes.NewReader(override)), nil
	}
	return w.Client.AppArchiveGet(ctx, aid, path)
}

func (w *gw) restartCount() int {
	w.mu.Lock()
	defer w.mu.Unlock()
	return w.restarts
}

func (w *gw) topCount() int {
	w.mu.Lock()
	defer w.mu.Unlock()
	return w.tops
}

// stubHost is a contract.UpdateHost over the fake guard and a real store.
type stubHost struct {
	guard   guardapi.Client
	st      *store.Store
	locks   *keylock.Locks
	mu      sync.Mutex
	online  map[string]string
	relabel bool
	events  []string

	firewallErr error
	reapplyErr  error
	ensured     []string
}

func (h *stubHost) Lock(ctx context.Context, aid string) (*keylock.Held, error) {
	return h.locks.Lock(ctx, aid)
}

func (h *stubHost) EnsureImage(ctx context.Context, ref string) (*guardapi.Image, error) {
	h.mu.Lock()
	h.ensured = append(h.ensured, ref)
	h.mu.Unlock()
	img, err := h.guard.ImageInspect(ctx, ref)
	if guardapi.IsNotFound(err) {
		if err := h.guard.ImagePull(ctx, ref); err != nil {
			return nil, err
		}
		img, err = h.guard.ImageInspect(ctx, ref)
	}
	return img, err
}

func (h *stubHost) App(ctx context.Context, aid string) (*guardapi.Container, error) {
	a, err := h.guard.Account(ctx, aid)
	if err != nil {
		return nil, err
	}
	if a.App == nil {
		return nil, &guardapi.Error{Status: 404, Code: guardapi.CodeNotFound, Reason: guardapi.ReasonContainer}
	}
	h.mu.Lock()
	relabel := h.relabel
	h.mu.Unlock()
	if relabel {
		return relabeled(a.App), nil
	}
	return a.App, nil
}

// relabeled is c with one more label (its identity differs).
func relabeled(c *guardapi.Container) *guardapi.Container {
	cp := *c
	raw := c.Raw.Clone()
	cv, _ := raw.Get("Config")
	cfg := cv.(pyjson.Ordered).Clone()
	lv, _ := cfg.Get("Labels")
	labels, _ := lv.(pyjson.Ordered)
	labels = labels.Clone()
	labels.Set("other", "x")
	cfg.Set("Labels", labels)
	raw.Set("Config", cfg)
	cp.Raw = raw
	return &cp
}

func (h *stubHost) setRelabel(v bool) {
	h.mu.Lock()
	h.relabel = v
	h.mu.Unlock()
}

func (h *stubHost) State(aid string) (*store.AccountState, error) { return h.st.LoadState(aid) }

func (h *stubHost) Save(held *keylock.Held, st *store.AccountState) error {
	held.Check(aid)
	return h.st.SaveState(aid, st)
}

func (h *stubHost) Readiness(ctx context.Context, aid string, st *store.AccountState) (string, error) {
	h.mu.Lock()
	defer h.mu.Unlock()
	return h.online[aid], nil
}

func (h *stubHost) GoOffline(aid string) string {
	h.mu.Lock()
	defer h.mu.Unlock()
	r := h.online[aid]
	delete(h.online, aid)
	return r
}

func (h *stubHost) OnlineAt(aid, revision string) bool {
	h.mu.Lock()
	defer h.mu.Unlock()
	return revision != "" && h.online[aid] == revision
}

func (h *stubHost) event(e string) {
	h.mu.Lock()
	h.events = append(h.events, e)
	h.mu.Unlock()
}

func (h *stubHost) BusinessFirewall(ctx context.Context, held *keylock.Held, gatewayIP string) error {
	held.Check(aid)
	h.event("firewall " + gatewayIP)
	return h.firewallErr
}

func (h *stubHost) Reapply(ctx context.Context, held *keylock.Held, st *store.AccountState) error {
	held.Check(aid)
	h.event("reapply")
	if h.reapplyErr != nil {
		return h.reapplyErr
	}
	h.mu.Lock()
	h.online[aid] = st.Revision
	h.mu.Unlock()
	return nil
}

func (h *stubHost) isOnline() (string, bool) {
	h.mu.Lock()
	defer h.mu.Unlock()
	r, ok := h.online[aid]
	return r, ok
}

func (h *stubHost) eventList() []string {
	h.mu.Lock()
	defer h.mu.Unlock()
	return append([]string(nil), h.events...)
}

// workerSrv is an account Worker's admin/runtime maintenance endpoint.
type workerSrv struct {
	mu         sync.Mutex
	calls      []pyjson.Ordered
	busy       map[string]bool
	lease      any
	onValidate func()
}

func (s *workerSrv) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	body, _ := io.ReadAll(r.Body)
	req, _ := pyjson.DecodeObject(body)
	action, _ := req.Get("action")
	s.mu.Lock()
	s.calls = append(s.calls, req)
	busy, lease, hook := s.busy[action.(string)], s.lease, s.onValidate
	s.mu.Unlock()
	if r.URL.Path != "/admin/runtime" || r.Header.Get("Authorization") != "Bearer secret" {
		w.WriteHeader(404)
		return
	}
	if busy {
		w.WriteHeader(409)
		return
	}
	if action == "validate" && hook != nil {
		hook()
	}
	answer := pyjson.Ordered{{Key: "active_requests", Value: 0}}
	if action == "pause" {
		answer = pyjson.Ordered{{Key: "lease", Value: lease}, {Key: "active_requests", Value: 0}, {Key: "paused", Value: true}}
	}
	w.Write(pyjson.MustMarshal(answer))
}

// actions are the maintenance calls so far, "action" or "action:lease".
func (s *workerSrv) actions() []string {
	s.mu.Lock()
	defer s.mu.Unlock()
	var out []string
	for _, c := range s.calls {
		a, _ := c.Get("action")
		entry := a.(string)
		if l, ok := c.Get("lease"); ok {
			entry += ":" + l.(string)
		}
		out = append(out, entry)
	}
	return out
}

func (s *workerSrv) resumes() int {
	n := 0
	for _, a := range s.actions() {
		if strings.HasPrefix(a, "resume") {
			n++
		}
	}
	return n
}

type env struct {
	t   *testing.T
	g   *fakeguard.Guard
	w   *gw
	h   *stubHost
	st  *store.Store
	clk *clock.Fake
	u   *updater
	srv *workerSrv
	log *bytes.Buffer
}

// newEnv is runtime 21: a running app container with the old Worker,
// state at revision rev and online at it, images app:new/bad/crash/empty.
func newEnv(t *testing.T) *env {
	t.Helper()
	g := fakeguard.New()
	g.AddImage("app:test", fakeguard.ImageSpec{Files: map[string][]byte{worker: old}})
	g.AddImage("app:new", fakeguard.ImageSpec{Files: map[string][]byte{worker: nw}})
	g.AddImage("app:bad", fakeguard.ImageSpec{Files: map[string][]byte{worker: bad}})
	g.AddImage("app:crash", fakeguard.ImageSpec{Files: map[string][]byte{worker: crash}})
	g.AddImage("app:empty", fakeguard.ImageSpec{})
	addApp(g, appName, worker, []string{}, map[string]string{names.LabelAccount: aid}, nil)
	g.PutFile(appName, worker, old, 0o755)
	st, err := store.Open(filepath.Join(t.TempDir(), "r"))
	if err != nil {
		t.Fatal(err)
	}
	t.Cleanup(func() { st.Close() })
	state := store.NewAccountState("api-key", "secret", "127.0.0.1", "10.77.0.2", "2026-11-01T00:00:00Z")
	state.Revision, state.Status = rev, store.StatusReady
	if err := st.EnsureAccountDir(aid); err != nil {
		t.Fatal(err)
	}
	if err := st.SaveState(aid, state); err != nil {
		t.Fatal(err)
	}
	w := &gw{Client: g.Client()}
	h := &stubHost{guard: w, st: st, locks: keylock.New(), online: map[string]string{aid: rev}}
	srv := &workerSrv{busy: map[string]bool{}, lease: strings.Repeat("a", 48)}
	ts := httptest.NewServer(srv)
	t.Cleanup(ts.Close)
	u, _ := url.Parse(ts.URL)
	port, _ := strconv.Atoi(u.Port())
	clk := clock.NewFake(time.Date(2026, 11, 1, 12, 0, 0, 0, time.UTC))
	var buf bytes.Buffer
	up, err := New(Options{Host: h, Guard: w, Store: st, Worker: &workeradmin.Client{Port: port, HostOverride: "127.0.0.1"},
		Clock: clk, Rand: rnd.Fixed(7), Log: logx.New(&syncWriter{w: &buf}, "test")})
	if err != nil {
		t.Fatal(err)
	}
	return &env{t: t, g: g, w: w, h: h, st: st, clk: clk, u: up.(*updater), srv: srv, log: &buf}
}

type syncWriter struct {
	mu sync.Mutex
	w  io.Writer
}

func (s *syncWriter) Write(p []byte) (int, error) {
	s.mu.Lock()
	defer s.mu.Unlock()
	return s.w.Write(p)
}

func addApp(g *fakeguard.Guard, name, path string, args []string, labels map[string]string, env []string) {
	g.AddContainer(fakeguard.ContainerSpec{Name: name, Image: "app:test", User: "1000:1000", Labels: labels,
		Path: path, Args: args, Env: env, Volumes: map[string]string{"ccg-21-data": "/work"}})
}

// replaceApp recreates the app container (a new ID) with another command.
func (e *env) replaceApp(path string, args []string, env []string) {
	e.t.Helper()
	files := map[string][]byte{}
	for _, p := range e.g.Files(appName) {
		files[p], _ = e.g.File(appName, p)
	}
	if err := e.g.Client().DeleteContainer(context.Background(), aid, "app"); err != nil {
		e.t.Fatal(err)
	}
	addApp(e.g, appName, path, args, map[string]string{names.LabelAccount: aid}, env)
	for p, data := range files {
		e.g.PutFile(appName, p, data, 0o755)
	}
}

func (e *env) update(image string) (pyjson.Ordered, error) {
	return e.u.UpdateWorker(context.Background(), aid, pyjson.Ordered{{Key: "image", Value: image}})
}

func (e *env) file(p string) []byte {
	b, _ := e.g.File(appName, p)
	return b
}

// files is the app container's file system, path -> content.
func (e *env) files() map[string]string {
	out := map[string]string{}
	for _, p := range e.g.Files(appName) {
		b, _ := e.g.File(appName, p)
		out[p] = string(b)
	}
	return out
}

func (e *env) staged() []string {
	var out []string
	for _, p := range e.g.Files(appName) {
		if strings.Contains(p, ".next-") {
			out = append(out, p)
		}
	}
	return out
}

func (e *env) backups() []string {
	list, err := e.st.WorkerBackups(aid)
	if err != nil {
		e.t.Fatal(err)
	}
	return list
}

// unhealthy makes the Worker health check fail while the target holds one of programs.
func (e *env) unhealthy(target string, programs ...[]byte) {
	e.g.OnExec("app:"+aid, []string{"node", "-e", scripts.WorkerHealth}, func([]string, string) (int, []byte) {
		cur, _ := e.g.File(appName, target)
		for _, p := range programs {
			if bytes.Equal(cur, p) {
				return 1, nil
			}
		}
		return 0, nil
	})
}

// crashing stops the container right after a restart while the target holds program.
func (e *env) crashing(target string, program []byte) {
	e.w.afterRestart = func(int) {
		if cur, _ := e.g.File(appName, target); bytes.Equal(cur, program) {
			e.g.StopContainer(appName)
		}
	}
}

type execCall struct {
	Argv []string `json:"argv"`
	User string   `json:"user"`
}

func (e *env) execs() []execCall {
	var out []execCall
	for _, c := range e.g.CallsTo("POST /v1/accounts/{aid}/app/exec") {
		var x execCall
		if err := json.Unmarshal(c.Body, &x); err != nil {
			e.t.Fatal(err)
		}
		out = append(out, x)
	}
	return out
}

// mvTargets are the targets of every mv -f in the app container, in order.
func (e *env) mvTargets() []string {
	var out []string
	for _, x := range e.execs() {
		if len(x.Argv) == 4 && x.Argv[0] == "mv" {
			out = append(out, x.Argv[3])
		}
	}
	return out
}

func (e *env) state() *store.AccountState {
	st, err := e.st.LoadState(aid)
	if err != nil || st == nil {
		e.t.Fatal(st, err)
	}
	return st
}

func (e *env) appID() string {
	raw := e.g.Inspect(appName)
	id, _ := raw.Get("Id")
	return id.(string)
}

func eq(t *testing.T, got, want any) {
	t.Helper()
	g, err1 := pyjson.Marshal(got)
	w, err2 := pyjson.Marshal(want)
	if err1 != nil || err2 != nil || !bytes.Equal(g, w) {
		t.Fatalf("got  %s\nwant %s", g, w)
	}
}

func sha(b []byte) string {
	return containerfs.Digest(b)
}
