package main

import (
	"bufio"
	"bytes"
	"context"
	"fmt"
	"io"
	"net"
	"net/http"
	"net/http/httptest"
	"os"
	"path/filepath"
	"strings"
	"sync"
	"testing"
	"time"

	"ccgateway/controller/internal/contract"
	"ccgateway/controller/internal/guardapi"
	"ccgateway/controller/internal/guardapi/fakeguard"
	"ccgateway/controller/internal/keylock"
	"ccgateway/controller/internal/pyjson"
	"ccgateway/controller/internal/store"
)

const testKey = "kkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkk"

type lockedBuffer struct {
	mu  sync.Mutex
	buf bytes.Buffer
}

func (b *lockedBuffer) Write(p []byte) (int, error) {
	b.mu.Lock()
	defer b.mu.Unlock()
	return b.buf.Write(p)
}

func (b *lockedBuffer) String() string {
	b.mu.Lock()
	defer b.mu.Unlock()
	return b.buf.String()
}

// env is a valid controller environment toward guardURL.
func env(t *testing.T, root, guardURL string, extra map[string]string) func(string) (string, bool) {
	vars := map[string]string{
		"CCG_CONTROLLER_KEY": testKey, "CCG_RUNTIME_ROOT": root, "CCG_APP_IMAGE": "app:test",
		"CCG_EGRESS_IMAGE": "egress:test", "CCG_GUARD_URL": guardURL, "CCG_GUARD_TOKEN": fakeguard.Token,
		"CCG_CONTROLLER_PORT": "1", "CCG_CONTROLLER_BIND": "127.0.0.1",
	}
	for k, v := range extra {
		if v == "" {
			delete(vars, k)
		} else {
			vars[k] = v
		}
	}
	return func(name string) (string, bool) {
		v, ok := vars[name]
		return v, ok
	}
}

// freePort is a loopback port free right now.
func freePort(t *testing.T) string {
	t.Helper()
	ln, err := net.Listen("tcp", "127.0.0.1:0")
	if err != nil {
		t.Fatal(err)
	}
	defer ln.Close()
	return fmt.Sprint(ln.Addr().(*net.TCPAddr).Port)
}

// fakeServices are business stubs: health answers, the background loop
// records its context, Connection points to a test upstream.
type fakeServices struct {
	mu         sync.Mutex
	background context.Context
	upstream   string
}

func (f *fakeServices) Runtimes(context.Context) (*contract.RuntimeList, error) {
	return &contract.RuntimeList{}, nil
}
func (f *fakeServices) Delete(context.Context, string, bool, bool) (*contract.DeleteResult, error) {
	return &contract.DeleteResult{}, nil
}
func (f *fakeServices) Apply(context.Context, string, any) (pyjson.Valuer, error) {
	return &contract.Blocked{AccountID: "1"}, nil
}
func (f *fakeServices) Public(context.Context, string) (*contract.Public, error) {
	return &contract.Public{Status: "pending"}, nil
}
func (f *fakeServices) Connection(_ context.Context, aid, rev string) (*contract.Connection, error) {
	host, port, _ := net.SplitHostPort(f.upstream)
	var p int
	fmt.Sscan(port, &p)
	return &contract.Connection{AppIP: host, Port: p, APIKey: "k", Revision: rev}, nil
}
func (f *fakeServices) ReadyState(context.Context, string, string) (*store.AccountState, error) {
	return nil, nil
}
func (f *fakeServices) EgressStatus(context.Context, string) (*contract.EgressStatus, error) {
	return &contract.EgressStatus{}, nil
}
func (f *fakeServices) RunBackground(ctx context.Context) {
	f.mu.Lock()
	f.background = ctx
	f.mu.Unlock()
}
func (f *fakeServices) UpdateWorker(context.Context, string, any) (pyjson.Ordered, error) {
	return nil, nil
}
func (f *fakeServices) UpdatePair(context.Context, string, any) (pyjson.Ordered, error) {
	return nil, nil
}
func (f *fakeServices) Create(context.Context, any, any) (pyjson.Ordered, error) { return nil, nil }
func (f *fakeServices) Status(context.Context, string) (pyjson.Ordered, error)   { return nil, nil }
func (f *fakeServices) Write(context.Context, string, int64, int64, io.Reader) (pyjson.Ordered, error) {
	return nil, nil
}
func (f *fakeServices) Load(context.Context, string) (pyjson.Ordered, error) { return nil, nil }
func (f *fakeServices) Inventory(context.Context) (pyjson.Ordered, error)    { return nil, nil }
func (f *fakeServices) Cleanup(context.Context, any) (pyjson.Ordered, error) { return nil, nil }
func (f *fakeServices) Health(context.Context) pyjson.Ordered {
	return pyjson.Ordered{{Key: "version", Value: "dev"}}
}
func (f *fakeServices) RuntimeImages(context.Context) pyjson.Ordered { return nil }
func (f *fakeServices) SetRuntimeImages(context.Context, any) (pyjson.Ordered, error) {
	return nil, nil
}
func (f *fakeServices) UpgradeController(context.Context, any) error { return nil }
func (f *fakeServices) RecreateEgress(context.Context, any) (pyjson.Ordered, error) {
	return nil, nil
}

// uploads.Delete clashes with accounts.Delete: a separate type.
type fakeUploads struct{ *fakeServices }

func (fakeUploads) Delete(context.Context, string) (pyjson.Ordered, error) { return nil, nil }

func (f *fakeServices) builder(seen *deps) builder {
	return func(d deps) (*services, error) {
		*seen = d
		return &services{Accounts: f, Updates: f, Uploads: fakeUploads{f}, Cleanup: f, Admin: f}, nil
	}
}

// covers: E1, EV, 02 §4.5 step 1 (an invalid environment exits 2 before anything is opened)
func TestServeConfigErrorExits2(t *testing.T) {
	root := filepath.Join(t.TempDir(), "data")
	for name, extra := range map[string]map[string]string{
		"no key":        {"CCG_CONTROLLER_KEY": ""},
		"short key":     {"CCG_CONTROLLER_KEY": "short"},
		"no guard url":  {"CCG_GUARD_URL": ""},
		"bad token":     {"CCG_GUARD_TOKEN": "x"},
		"bad bind":      {"CCG_CONTROLLER_BIND": "localhost"},
		"bad port":      {"CCG_CONTROLLER_PORT": "70000"},
		"no app image":  {"CCG_APP_IMAGE": ""},
		"bad disk size": {"CCG_ACCOUNT_DISK_GIB": "0"},
	} {
		var stderr lockedBuffer
		code := serve(context.Background(), env(t, root, "http://127.0.0.1:9", extra), &stderr,
			func(deps) (*services, error) { t.Fatal("built"); return nil, nil }, nil)
		if code != exitConfig || !strings.HasPrefix(stderr.String(), "ccg-controller: ") {
			t.Fatalf("%s: exit %d %q", name, code, stderr.String())
		}
		if _, err := os.Stat(root); !os.IsNotExist(err) {
			t.Fatalf("%s: the data root was created", name)
		}
	}
}

// startServe runs serve in the background; it returns the listener
// address, a stop function and the exit code channel.
func startServe(t *testing.T, lookup func(string) (string, bool), b builder, stderr io.Writer) (string, context.CancelFunc, chan int) {
	t.Helper()
	ctx, cancel := context.WithCancel(context.Background())
	addr := make(chan net.Addr, 1)
	code := make(chan int, 1)
	go func() { code <- serve(ctx, lookup, stderr, b, func(a net.Addr) { addr <- a }) }()
	select {
	case a := <-addr:
		t.Cleanup(cancel)
		return a.String(), cancel, code
	case c := <-code:
		cancel()
		t.Fatalf("serve exited %d", c)
	case <-time.After(10 * time.Second):
		cancel()
		t.Fatal("serve did not listen")
	}
	return "", nil, nil
}

func get(t *testing.T, addr, path string) (int, string) {
	t.Helper()
	req, _ := http.NewRequest("GET", "http://"+addr+path, nil)
	req.Header.Set("Authorization", "Bearer "+testKey)
	res, err := (&http.Client{Timeout: 5 * time.Second}).Do(req)
	if err != nil {
		t.Fatal(err)
	}
	defer res.Body.Close()
	b, _ := io.ReadAll(res.Body)
	return res.StatusCode, string(b)
}

// covers: E1, E2, E4, 02 §4.5 (wiring: bind and port from the environment,
// the data root locked, the guard checked, the background started; a
// cancelled context stops the background, closes the tunnels and exits 0)
func TestServeWiresAndExitsGracefully(t *testing.T) {
	fg := fakeguard.New()
	g := httptest.NewServer(fg.Handler())
	defer g.Close()
	up, err := net.Listen("tcp", "127.0.0.1:0")
	if err != nil {
		t.Fatal(err)
	}
	defer up.Close()
	accepted := make(chan net.Conn, 1)
	go func() {
		if c, err := up.Accept(); err == nil {
			accepted <- c
		}
	}()
	root := filepath.Join(t.TempDir(), "data")
	port := freePort(t)
	f := &fakeServices{upstream: up.Addr().String()}
	var d deps
	var stderr lockedBuffer
	addr, stop, code := startServe(t, env(t, root, g.URL, map[string]string{"CCG_CONTROLLER_PORT": port,
		"CCG_CONTROLLER_VERSION": "9.9.9"}), f.builder(&d), &stderr)
	if addr != "127.0.0.1:"+port {
		t.Fatal(addr)
	}
	if d.Config.Version != "9.9.9" || d.Store == nil || d.Guard == nil || d.Images == nil || d.DiskQuota == nil || d.Worker == nil {
		t.Fatalf("%+v", d)
	}
	if app, egress := d.Images.Targets(); app != "app:test" || egress != "egress:test" {
		t.Fatal(app, egress)
	}
	if fg.Count("GET /v1/health") != 1 {
		t.Fatal(fg.Routes())
	}
	if s, b := get(t, addr, "/health"); s != 200 || b != `{"version": "dev"}` {
		t.Fatal(s, b)
	}
	// The data root is taken: a second controller cannot start on it.
	var second lockedBuffer
	if c := serve(context.Background(), env(t, root, g.URL, map[string]string{"CCG_CONTROLLER_PORT": freePort(t)}), &second,
		f.builder(new(deps)), nil); c != exitStartup || !strings.Contains(second.String(), "cannot open the data root") {
		t.Fatal(c, second.String())
	}
	// An open tunnel is closed by the graceful exit.
	conn, err := net.Dial("tcp", addr)
	if err != nil {
		t.Fatal(err)
	}
	defer conn.Close()
	fmt.Fprintf(conn, "GET /accounts/7/tunnel HTTP/1.1\r\nHost: x\r\nAuthorization: Bearer %s\r\nX-CCG-Revision: r\r\n"+
		"Connection: Upgrade\r\nUpgrade: ccg-tunnel\r\n\r\n", testKey)
	br := bufio.NewReader(conn)
	if line, _ := br.ReadString('\n'); !strings.Contains(line, " 101 ") {
		t.Fatal(line)
	}
	upstream := <-accepted
	defer upstream.Close()
	f.mu.Lock()
	bg := f.background
	f.mu.Unlock()
	if bg == nil || bg.Err() != nil {
		t.Fatal("background not running")
	}
	stop()
	select {
	case c := <-code:
		if c != 0 {
			t.Fatalf("exit %d: %s", c, stderr.String())
		}
	case <-time.After(15 * time.Second):
		t.Fatal("serve did not exit")
	}
	if bg.Err() == nil {
		t.Fatal("the background loops were not stopped")
	}
	conn.SetReadDeadline(time.Now().Add(5 * time.Second))
	if _, err := io.Copy(io.Discard, br); err != nil {
		t.Fatalf("tunnel not closed: %v", err)
	}
	upstream.SetReadDeadline(time.Now().Add(5 * time.Second))
	if _, err := io.Copy(io.Discard, upstream); err != nil {
		t.Fatalf("upstream not closed: %v", err)
	}
	log := stderr.String()
	for _, part := range []string{"INFO ccgateway.controller controller 9.9.9 listening on 127.0.0.1:" + port,
		"INFO ccgateway.controller controller stopped"} {
		if !strings.Contains(log, part) {
			t.Fatalf("%q lacks %q", log, part)
		}
	}
	// The root is free again.
	st, err := store.Open(root)
	if err != nil {
		t.Fatal(err)
	}
	st.Close()
	_ = keylock.RequestWait
}

// covers: 02 §4.5 step 5, R17 (an unreachable guard or one without the
// required features is a warning; the controller still serves /health)
func TestServeStartsWithoutTheGuard(t *testing.T) {
	f := &fakeServices{}
	var stderr lockedBuffer
	addr, stop, code := startServe(t, env(t, t.TempDir(), "http://127.0.0.1:"+freePort(t),
		map[string]string{"CCG_CONTROLLER_PORT": freePort(t)}), f.builder(new(deps)), &stderr)
	if s, _ := get(t, addr, "/health"); s != 200 {
		t.Fatal(s)
	}
	stop()
	if c := <-code; c != 0 {
		t.Fatal(c)
	}
	if !strings.Contains(stderr.String(), "WARNING ccgateway.controller guard not reachable at start: ") {
		t.Fatal(stderr.String())
	}

	fg := fakeguard.New()
	fg.SetHealth(guardapi.Health{Version: "0.0.1", Features: []string{"account-state-v1"}})
	g := httptest.NewServer(fg.Handler())
	defer g.Close()
	stderr = lockedBuffer{}
	_, stop, code = startServe(t, env(t, t.TempDir(), g.URL, map[string]string{"CCG_CONTROLLER_PORT": freePort(t)}),
		f.builder(new(deps)), &stderr)
	stop()
	<-code
	if !strings.Contains(stderr.String(), "WARNING ccgateway.controller guard 0.0.1 lacks required features: exec-combined-v1, ") {
		t.Fatal(stderr.String())
	}
}

// covers: E1 (a port already taken fails the start with exit 1)
func TestServeListenFailure(t *testing.T) {
	ln, err := net.Listen("tcp", "127.0.0.1:0")
	if err != nil {
		t.Fatal(err)
	}
	defer ln.Close()
	port := fmt.Sprint(ln.Addr().(*net.TCPAddr).Port)
	var stderr lockedBuffer
	code := serve(context.Background(), env(t, t.TempDir(), "http://127.0.0.1:"+freePort(t),
		map[string]string{"CCG_CONTROLLER_PORT": port}), &stderr, (&fakeServices{}).builder(new(deps)), nil)
	if code != exitStartup || !strings.Contains(stderr.String(), "cannot listen") {
		t.Fatal(code, stderr.String())
	}
}

// covers: EV (the subcommands: version prints, unknown is usage exit 2)
func TestRunSubcommands(t *testing.T) {
	var out, errOut bytes.Buffer
	if code := run([]string{"version"}, &out, &errOut); code != 0 || strings.TrimSpace(out.String()) == "" {
		t.Fatal(code, out.String())
	}
	if code := run([]string{"bogus"}, &out, &errOut); code != 2 || !strings.Contains(errOut.String(), "usage: ccg-controller") {
		t.Fatal(code, errOut.String())
	}
}
