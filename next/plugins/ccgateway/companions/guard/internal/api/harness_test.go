package api

import (
	"context"
	"encoding/json"
	"io"
	"net/http"
	"net/http/httptest"
	"net/netip"
	"os"
	"path/filepath"
	"strings"
	"sync"
	"testing"
	"time"

	"ccgateway/guard/internal/compose"
	"ccgateway/guard/internal/config"
	"ccgateway/guard/internal/controller"
	"ccgateway/guard/internal/dockerapi"
	"ccgateway/guard/internal/dockerapi/fakedocker"
	"ccgateway/guard/internal/files"
	"ccgateway/guard/internal/gateway"
	"ccgateway/guard/internal/names"
	"ccgateway/guard/internal/obs"
)

const testToken = "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef"

// memFiles is RuntimeFiles in memory; bad marks rejected mount sources.
type memFiles struct {
	mu     sync.Mutex
	files  map[string][]byte
	bad    map[string]string
	writes []string
}

func newMemFiles() *memFiles { return &memFiles{files: map[string][]byte{}, bad: map[string]string{}} }

func (m *memFiles) WriteResolv(aid string, data []byte) (bool, error) {
	m.mu.Lock()
	defer m.mu.Unlock()
	rel := aid + "/resolv.conf"
	m.writes = append(m.writes, rel)
	_, wasBad := m.bad[rel]
	delete(m.bad, rel)
	m.files[rel] = append([]byte(nil), data...)
	return wasBad, nil
}

func (m *memFiles) VerifyResolv(aid string) error {
	m.mu.Lock()
	defer m.mu.Unlock()
	rel := aid + "/resolv.conf"
	if why, ok := m.bad[rel]; ok {
		return &files.Error{Rel: rel, Why: why}
	}
	if _, ok := m.files[rel]; !ok {
		return &files.Error{Rel: rel, Why: "missing"}
	}
	return nil
}

func (m *memFiles) WriteAppNFT(aid string, data []byte) error {
	m.mu.Lock()
	defer m.mu.Unlock()
	m.writes = append(m.writes, aid+"/app.nft")
	m.files[aid+"/app.nft"] = append([]byte(nil), data...)
	return nil
}

func (m *memFiles) WriteGatewayFile(name string, data []byte) error {
	if !files.GatewayFiles[name] {
		return &files.Error{Rel: name, Why: "name"}
	}
	m.mu.Lock()
	defer m.mu.Unlock()
	m.writes = append(m.writes, "shared-egress/"+name)
	m.files["shared-egress/"+name] = append([]byte(nil), data...)
	return nil
}

func (m *memFiles) EnsureGatewayDir() error { return nil }

func (m *memFiles) VerifyGatewayDir() error {
	m.mu.Lock()
	defer m.mu.Unlock()
	if why, ok := m.bad["shared-egress"]; ok {
		return &files.Error{Rel: "shared-egress", Why: why}
	}
	return nil
}

func (m *memFiles) get(rel string) string {
	m.mu.Lock()
	defer m.mu.Unlock()
	return string(m.files[rel])
}

type tmpState struct{ dir string }

func (s tmpState) CreateLoad() (*os.File, string, error) {
	f, err := os.CreateTemp(s.dir, "*.part")
	if err != nil {
		return nil, "", err
	}
	return f, filepath.Base(f.Name()), nil
}
func (s tmpState) RemoveLoad(name string) error { return os.Remove(filepath.Join(s.dir, name)) }
func (s tmpState) FreeBytes() (uint64, error)   { return 100 << 30, nil }

type recFW struct {
	mu     sync.Mutex
	calls  []string
	routes []string
}

func (r *recFW) Recompute(reason string, aids ...string) {
	r.mu.Lock()
	defer r.mu.Unlock()
	r.calls = append(r.calls, reason+":"+strings.Join(aids, ","))
}
func (r *recFW) InvalidateRoute(aid string) {
	r.mu.Lock()
	r.routes = append(r.routes, aid)
	r.mu.Unlock()
}
func (r *recFW) Status() string { return "ok" }
func (r *recFW) count() int     { r.mu.Lock(); defer r.mu.Unlock(); return len(r.calls) }

type ctlState struct{ ok bool }

func (c *ctlState) ControllerOK() bool { return c.ok }

type memStore struct {
	mu sync.Mutex
	m  map[string][]byte
}

func (s *memStore) Read(n string) ([]byte, error) {
	s.mu.Lock()
	defer s.mu.Unlock()
	if b, ok := s.m[n]; ok {
		return b, nil
	}
	return nil, os.ErrNotExist
}
func (s *memStore) Write(n string, d []byte) error {
	s.mu.Lock()
	s.m[n] = d
	s.mu.Unlock()
	return nil
}
func (s *memStore) Remove(n string) error { s.mu.Lock(); delete(s.m, n); s.mu.Unlock(); return nil }

// composeSim plays `docker compose up` against the fake daemon.
type composeSim struct {
	f      *fakedocker.Fake
	env    *compose.MemEnv
	health map[string]string // controller image → health
	fail   map[string]bool   // image → up fails
	ups    []string
}

func (c *composeSim) Run(ctx context.Context, argv, env []string) (string, error) {
	if argv[len(argv)-1] == "-q" {
		return "", nil
	}
	service := argv[len(argv)-1]
	data, _ := c.env.Read()
	key := map[string]string{"egress": "CCG_GATEWAY_IMAGE", "controller": "CCG_CONTROLLER_IMAGE"}[service]
	image := compose.Value(data, key)
	c.ups = append(c.ups, service+"="+image)
	if c.fail[image] {
		return "service failed", &compose.Error{Step: "up", Err: io.ErrUnexpectedEOF}
	}
	n := names.Names{Prefix: "ccg"}
	var name string
	labels := map[string]string{names.LabelComposeProject: "ccgateway", names.LabelComposeService: service}
	var nets map[string]string
	var mounts []fakedocker.Mount
	health := ""
	switch service {
	case "egress":
		name = n.Gateway()
		labels[names.LabelShared] = "ccg"
		nets = map[string]string{n.GatewayUplink(): ""}
		mounts = []fakedocker.Mount{{Type: "bind", Source: "/opt/ccgateway-runtime/shared-egress", Destination: "/config", Mode: "ro"}}
	case "controller":
		name = n.Controller()
		nets = map[string]string{"ccg-control": "172.29.255.2"}
		health = c.health[image]
		if health == "" {
			health = "healthy"
		}
	}
	force := strings.Contains(strings.Join(argv, " "), "--force-recreate")
	var imgID string
	c.f.Do(func() {
		for _, img := range c.f.Images {
			for _, t := range img.RepoTags {
				if t == image {
					imgID = img.ID
				}
			}
			if img.ID == image {
				imgID = img.ID
			}
		}
	})
	if old := c.f.Container(name); old != nil {
		if !force && old.ConfigImage == image {
			return "", nil
		}
		c.f.Do(func() { delete(c.f.Containers, old.ID) })
	}
	c.f.AddContainer(&fakedocker.Container{Name: name, Image: imgID, ConfigImage: image, Status: "running", Labels: labels,
		Networks: nets, Mounts: mounts, Health: health})
	return "", nil
}

type harness struct {
	t     *testing.T
	f     *fakedocker.Fake
	srv   *Server
	h     http.Handler
	files *memFiles
	fw    *recFW
	ctl   *ctlState
	cs    *composeSim
	env   *compose.MemEnv
	store *memStore
}

func newHarness(t *testing.T) *harness {
	t.Helper()
	f := fakedocker.New()
	f.Start()
	t.Cleanup(f.Close)
	cfg, err := config.Load(func(k string) string {
		if k == "CCG_GUARD_TOKEN" {
			return testToken
		}
		return ""
	}, config.Options{RequireToken: true})
	if err != nil {
		t.Fatal(err)
	}
	d := dockerapi.NewDialer(f.Dial)
	env := &compose.MemEnv{Data: []byte("CCG_GUARD_TOKEN=x\nCCG_CONTROLLER_IMAGE=ccgateway-controller:1\nCCG_GATEWAY_IMAGE=ccgateway-xray:1\n")}
	cs := &composeSim{f: f, env: env, health: map[string]string{}, fail: map[string]bool{}}
	runner := &compose.Runner{Docker: "/usr/bin/docker", Project: "ccgateway", Dir: "/opt/ccgateway", Socket: "/var/run/docker.sock",
		X: cs, Env: env, L: &compose.MutexLocker{}}
	h := &harness{t: t, f: f, files: newMemFiles(), fw: &recFW{}, ctl: &ctlState{ok: true}, cs: cs, env: env,
		store: &memStore{m: map[string][]byte{}}}
	life := &compose.Lifecycle{}
	srv := &Server{Cfg: cfg, D: d, Files: h.files, State: tmpState{dir: t.TempDir()}, FW: h.fw, Control: h.ctl,
		Version: "test", DockerVersion: "29.5.2", ExecTimeout: 500 * time.Millisecond, JobTimeout: 500 * time.Millisecond,
		HelperTimeout: 500 * time.Millisecond, LockWait: 2 * time.Second, IdleTimeout: 5 * time.Second,
		HostRoutes: func() ([]netip.Prefix, error) {
			return []netip.Prefix{netip.MustParsePrefix("192.168.100.0/24"), netip.MustParsePrefix("172.17.0.0/16")}, nil
		}}
	n := cfg.Names()
	srv.Upgrader = &controller.Upgrader{N: n, D: d, C: runner, Lock: runner.L, Life: life, Store: h.store,
		Poll: 5 * time.Millisecond, Wait: 300 * time.Millisecond}
	srv.Gateway = &gateway.Manager{N: n, Project: "ccgateway", Root: cfg.RuntimeRoot, D: d, F: h.files, Nets: srv, C: runner,
		CLock: runner.L, Life: life, Locks: srv, FW: h.fw, Store: h.store, Wait: 2 * time.Second, Stable: 30 * time.Millisecond,
		Poll: 5 * time.Millisecond}
	h.srv = srv
	h.h = srv.Handler()
	return h
}

// req is one API call as the controller makes it.
type req struct {
	method, path   string
	body           any    // JSON encoded
	raw            []byte // used when body is nil
	ctype          string
	auth           string // "" = valid
	remote         string // "" = controller
	headers        map[string][]string
	noLength       bool
	lengthOverride *int64
}

type timeDur = time.Duration

func newTestLogger(w io.Writer) *obs.Logger { return obs.New(w, false) }

func rewriteEnv(env *compose.MemEnv, k, v string) ([]byte, error) {
	data, _ := env.Read()
	out, err := compose.Rewrite(data, k, v)
	if err != nil {
		return nil, err
	}
	return out, env.Write(out)
}

func (h *harness) do(r req) *httptest.ResponseRecorder {
	h.t.Helper()
	var body io.Reader
	ctype := r.ctype
	n := int64(0)
	switch {
	case r.body != nil:
		b, _ := json.Marshal(r.body)
		body, n = strings.NewReader(string(b)), int64(len(b))
		if ctype == "" {
			ctype = "application/json"
		}
	case r.raw != nil:
		body, n = strings.NewReader(string(r.raw)), int64(len(r.raw))
	}
	hr := httptest.NewRequest(r.method, r.path, body)
	hr.ContentLength = n
	if r.noLength {
		hr.ContentLength = -1
		hr.TransferEncoding = []string{"chunked"}
	}
	if r.lengthOverride != nil {
		hr.ContentLength = *r.lengthOverride
	}
	if ctype != "" {
		hr.Header.Set("Content-Type", ctype)
	}
	switch r.auth {
	case "":
		hr.Header.Set("Authorization", "Bearer "+testToken)
	case "none":
	default:
		hr.Header.Set("Authorization", r.auth)
	}
	for k, vs := range r.headers {
		hr.Header.Del(k)
		for _, v := range vs {
			hr.Header.Add(k, v)
		}
	}
	hr.RemoteAddr = "172.29.255.2:40000"
	if r.remote != "" {
		hr.RemoteAddr = r.remote
	}
	w := httptest.NewRecorder()
	func() {
		defer func() {
			if v := recover(); v != nil && v != http.ErrAbortHandler {
				panic(v)
			}
		}()
		h.h.ServeHTTP(w, hr)
	}()
	return w
}

func decodeBody(t *testing.T, w *httptest.ResponseRecorder) map[string]any {
	t.Helper()
	var m map[string]any
	if err := json.Unmarshal(w.Body.Bytes(), &m); err != nil {
		t.Fatalf("not JSON (%d): %q", w.Code, w.Body.String())
	}
	return m
}
