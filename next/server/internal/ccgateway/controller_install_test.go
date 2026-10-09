package ccgateway

import (
	"context"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net"
	"net/http"
	"net/http/httptest"
	"strconv"
	"strings"
	"sync"
	"testing"
	"time"

	"github.com/Sub2API-Devs/sup2api/next/server/internal/remotedocker"
)

// panelInstall is a controller installation over a fake Docker host; the
// gateway is an HTTPS server on 127.0.0.1 whose certificate the fake CA
// script returns, or a plain HTTP server for scheme http.
type panelInstall struct {
	f         *runtimeFixture
	host      *fakeHostOps
	srv       *httptest.Server
	ip        string
	port      int
	ca        string
	plainPort int
	mu        sync.Mutex
	features  []string
}

func newPanelInstall(t *testing.T) *panelInstall {
	t.Helper()
	cfg := sshConfig
	cfg.AdminKey = panelKey
	f, host := newRuntimeOpsFixture(t, cfg)
	p := &panelInstall{f: f, host: host, features: []string{"tunnel", "uploads"}}
	host.health = controllerHealth{Version: "v2", AppImage: AppImage, EgressImage: EgressImage, ControllerImage: ControllerImage, Features: []string{"tunnel"}}
	host.gateway = remotedocker.ScriptResult{Output: "CCG_RESULT=started\n"}
	handler := func(w http.ResponseWriter, r *http.Request) {
		if r.URL.Path != "/health" || r.Header.Get("Authorization") != "Bearer "+p.installedKey() {
			w.WriteHeader(401)
			return
		}
		p.mu.Lock()
		defer p.mu.Unlock()
		_ = json.NewEncoder(w).Encode(map[string]any{"version": "v2", "features": p.features})
	}
	p.srv, p.ip, p.port, p.ca = tlsPanel(t, handler)
	plain := httptest.NewServer(http.HandlerFunc(handler))
	t.Cleanup(plain.Close)
	p.plainPort = plain.Listener.Addr().(*net.TCPAddr).Port
	host.ca = remotedocker.ScriptResult{Output: p.ca + "CCG_RESULT=ok\n"}
	// Health checks of the controller being installed go to the fake host;
	// controller mode is the real HTTP(S) connection.
	fake := f.s.openController
	f.s.openController = func(ctx context.Context, c Config) (*http.Client, string, func() error, error) {
		if c.Mode == "controller" {
			return openControllerPanel(c)
		}
		return fake(ctx, c)
	}
	gatewayWait, gatewayEvery = 300*time.Millisecond, 50*time.Millisecond
	t.Cleanup(func() { gatewayWait, gatewayEvery = 120*time.Second, 3*time.Second })
	return p
}

// installedKey is the key of the last controller environment written, else
// the saved one.
func (p *panelInstall) installedKey() string {
	p.host.mu.Lock()
	defer p.host.mu.Unlock()
	key := panelKey
	for _, stdin := range p.host.stdins {
		for _, line := range strings.Split(string(stdin), "\n") {
			if k, ok := strings.CutPrefix(line, "CCG_CONTROLLER_KEY="); ok {
				key = k
			}
		}
	}
	return key
}

// stdinOf is the stdin of the last script of kind.
func (p *panelInstall) stdinOf(kind string) string {
	p.host.mu.Lock()
	defer p.host.mu.Unlock()
	for i := len(p.host.scripts) - 1; i >= 0; i-- {
		if p.host.scripts[i] == kind {
			return string(p.host.stdins[i])
		}
	}
	return ""
}

func (p *panelInstall) install(uid int64, body string) (int, map[string]any) {
	return p.f.request(uid, "POST", "/system/ccgateway/controller/install", body)
}

func (p *panelInstall) ipBody() string {
	return fmt.Sprintf(`{"host":%q,"port":%d}`, p.ip, p.port)
}

func (p *panelInstall) count(t *testing.T, query string, args ...any) int {
	t.Helper()
	var n int
	if err := p.f.db.Pool.QueryRow(context.Background(), query, args...).Scan(&n); err != nil {
		t.Fatal(err)
	}
	return n
}

func TestControllerInstallIPMode(t *testing.T) {
	// Without method: the saved legacy SSH connection (§53.9 compatibility).
	p := newPanelInstall(t)
	admin := p.f.user("admin@x")
	code, out := p.install(admin, p.ipBody())
	sum := sha256.Sum256(p.srv.Certificate().Raw)
	if code != 200 || data(out)["mode"] != "controller" || data(out)["scheme"] != "https" || data(out)["host"] != p.ip || data(out)["port"] != float64(p.port) ||
		data(out)["has_controller_ca"] != true || data(out)["controller_ca_fingerprint"] != hex.EncodeToString(sum[:]) || data(out)["user"] != "" || data(out)["warnings"] != nil {
		t.Fatalf("install: %d %v", code, out)
	}
	if got := p.host.kinds(); got != "port,inspect,install,finish,gateway,ca" {
		t.Fatalf("scripts: %s", got)
	}
	want, _ := caddyfile(p.ip, p.port, "")
	if got := p.stdinOf("gateway"); got != want {
		t.Fatalf("Caddyfile on stdin:\n%s", got)
	}
	if got := p.stdinOf("port"); got != strconv.Itoa(p.port)+" 18443 0\n" {
		t.Fatalf("port script stdin: %q", got)
	}
	if env := p.stdinOf("install"); !strings.Contains(env, "\nCCG_CONTROLLER_IMAGE="+ControllerImage+"\n") || !strings.Contains(env, "\nCCG_CONTROLLER_KEY="+panelKey+"\n") {
		t.Fatalf("controller environment: %s", env)
	}
	saved, err := p.f.s.Load(context.Background())
	if err != nil || saved.Mode != "controller" || saved.Scheme != "https" || saved.Host != p.ip || saved.Port != p.port || saved.ControllerCA != p.ca || saved.AdminKey != panelKey ||
		saved.User != "" || saved.AuthMode != "" || saved.Password != "" || saved.PrivateKey != "" || saved.HostKeyFingerprint != "" || !saved.AccountRuntimes {
		t.Fatalf("saved: %+v %v", saved, err)
	}
	if n := p.count(t, `SELECT count(*) FROM audit_logs WHERE action='ccgateway.controller.install'`); n != 1 {
		t.Fatalf("install audit: %d", n)
	}
	if n := p.count(t, `SELECT count(*) FROM audit_logs WHERE action='ccgateway.config.update' AND detail->'fields' = '["mode","scheme","host","port","controller_ca","ssh"]'::jsonb`); n != 1 {
		t.Fatalf("config audit: %d", n)
	}
	// Installed: the configuration is not SSH any more.
	if code, out = p.install(admin, p.ipBody()); code != 400 || reason(out) != "ssh_not_configured" {
		t.Fatalf("second install: %d %v", code, out)
	}
	if code, _ = p.f.request(admin, "GET", "/system/ccgateway/remote-config", ""); code != 200 {
		t.Fatalf("remote-config: %d", code)
	}
}

func TestControllerInstallLegacyWithoutKey(t *testing.T) {
	// A saved SSH configuration without a key: the key is saved first, and
	// that own write is not taken for a concurrent change.
	p := newPanelInstall(t)
	p.f.writeConfig(sshConfig)
	code, out := p.install(p.f.user("admin@x"), p.ipBody())
	saved, _ := p.f.s.Load(context.Background())
	if code != 200 || saved.Mode != "controller" || len(saved.AdminKey) != 64 || saved.AdminKey != p.installedKey() || saved.Password != "" {
		t.Fatalf("%d %v %+v", code, out, saved)
	}
	// A shared-container SSH configuration (account_runtimes off) migrates
	// too: account runtimes are the only mode (§53.9).
	q := newPanelInstall(t)
	shared := sshConfig
	shared.AccountRuntimes, shared.AdminKey = false, panelKey
	q.f.writeConfig(shared)
	code, out = q.install(q.f.user("admin@x"), q.ipBody())
	if saved, _ = q.f.s.Load(context.Background()); code != 200 || saved.Mode != "controller" || !saved.AccountRuntimes || data(out)["account_runtimes"] != true {
		t.Fatalf("shared ssh: %d %v %+v", code, out, saved)
	}
}

func TestControllerInstallSkipsACurrentController(t *testing.T) {
	p := newPanelInstall(t)
	admin := p.f.user("admin@x")
	p.host.inspect = `"` + ControllerImage + `"` + "\nCCG_APP_IMAGE=" + AppImage + "\nCCG_EGRESS_IMAGE=" + EgressImage + "\n"
	if code, out := p.install(admin, p.ipBody()); code != 200 || p.host.kinds() != "port,inspect,gateway,ca" {
		t.Fatalf("%d %v %s", code, out, p.host.kinds())
	}
	// A current controller without tunnels is replaced.
	q := newPanelInstall(t)
	q.host.inspect = p.host.inspect
	q.host.health.Features = nil
	if code, out := q.install(q.f.user("admin@x"), q.ipBody()); code != 200 || q.host.kinds() != "port,inspect,install,finish,gateway,ca" {
		t.Fatalf("%d %v %s", code, out, q.host.kinds())
	}
}

func TestControllerInstallDomainMode(t *testing.T) {
	p := newPanelInstall(t)
	admin := p.f.user("admin@x")
	p.host.inspect = `"` + ControllerImage + `"` + "\nCCG_APP_IMAGE=" + AppImage + "\nCCG_EGRESS_IMAGE=" + EgressImage + "\n"
	// No DNS here: the domain's health check goes to the fake host, after
	// checking it uses the system roots.
	plain := p.f.s.openController
	p.f.s.openController = func(ctx context.Context, c Config) (*http.Client, string, func() error, error) {
		if c.Mode == "controller" && (c.Host != "panel.example.com" || c.Port != 18443 || c.ControllerCA != "" || c.Scheme != "https") {
			t.Errorf("domain panel config: %+v", c)
		}
		if c.Mode == "controller" {
			c.Mode = "ssh"
		}
		return plain(ctx, c)
	}
	// The domain resolves to another address than the SSH host: a warning.
	var lookups []string
	p.f.s.lookupIP = func(_ context.Context, host string) ([]net.IPAddr, error) {
		lookups = append(lookups, host)
		if host == "panel.example.com" {
			return []net.IPAddr{{IP: net.ParseIP("198.51.100.9")}}, nil
		}
		return []net.IPAddr{{IP: net.ParseIP("203.0.113.7")}}, nil
	}
	// Automatic port (§53.9: 18443 for HTTPS).
	code, out := p.install(admin, `{"host":"Panel.Example.com","email":"ops@example.com"}`)
	if code != 200 || data(out)["host"] != "panel.example.com" || data(out)["port"] != float64(18443) || data(out)["has_controller_ca"] != false ||
		fmt.Sprint(data(out)["warnings"]) != "[dns_mismatch]" {
		t.Fatalf("%d %v", code, out)
	}
	if fmt.Sprint(lookups) != "[docker.example panel.example.com]" {
		t.Fatalf("lookups: %v", lookups)
	}
	// No CA script: the certificate is automatic, nothing is pinned.
	if got := p.host.kinds(); got != "port,inspect,gateway" {
		t.Fatalf("scripts: %s", got)
	}
	if got := p.stdinOf("port"); got != "0 18443 1\n" {
		t.Fatalf("port script stdin (ACME check): %q", got)
	}
	want, _ := caddyfile("panel.example.com", 18443, "ops@example.com")
	if got := p.stdinOf("gateway"); got != want || strings.Contains(got, "tls internal") {
		t.Fatalf("Caddyfile:\n%s", got)
	}
	if saved, _ := p.f.s.Load(context.Background()); saved.ControllerCA != "" || saved.Scheme != "https" || saved.Port != 18443 {
		t.Fatalf("saved: %+v", saved)
	}
	if n := p.count(t, `SELECT count(*) FROM settings WHERE key=$1 AND value::text LIKE '%warnings%'`, settingKey); n != 0 {
		t.Fatal("warning saved")
	}
	// A matching record: no warning.
	q := newPanelInstall(t)
	q.host.inspect = p.host.inspect
	q.f.s.openController = p.f.s.openController
	q.f.s.lookupIP = func(_ context.Context, host string) ([]net.IPAddr, error) {
		return []net.IPAddr{{IP: net.ParseIP("2001:db8::7")}, {IP: net.ParseIP("203.0.113.7")}}, nil
	}
	if code, out := q.install(q.f.user("admin@x"), `{"host":"panel.example.com"}`); code != 200 || data(out)["warnings"] != nil {
		t.Fatalf("matching DNS: %d %v", code, out)
	}
	// A domain that does not resolve: a warning, not a failure.
	r := newPanelInstall(t)
	r.host.inspect = p.host.inspect
	r.f.s.openController = p.f.s.openController
	r.f.s.lookupIP = func(_ context.Context, host string) ([]net.IPAddr, error) {
		if host == "panel.example.com" {
			return nil, errors.New("no such host")
		}
		return []net.IPAddr{{IP: net.ParseIP("203.0.113.7")}}, nil
	}
	if code, out := r.install(r.f.user("admin@x"), `{"host":"panel.example.com"}`); code != 200 || fmt.Sprint(data(out)["warnings"]) != "[dns_mismatch]" {
		t.Fatalf("unresolved domain: %d %v", code, out)
	}
	// ACME ports taken: 409 before anything is replaced.
	a := newPanelInstall(t)
	a.host.port = &remotedocker.ScriptResult{Output: "CCG_RESULT=acme_ports_unavailable\n", ExitStatus: 1}
	if code, out := a.install(a.f.user("admin@x"), `{"host":"panel.example.com"}`); code != 409 || reason(out) != "acme_ports_unavailable" || a.host.kinds() != "port" {
		t.Fatalf("acme ports: %d %v %s", code, out, a.host.kinds())
	}
}

func TestControllerInstallFailures(t *testing.T) {
	stage := func(out map[string]any) any {
		e, _ := out["error"].(map[string]any)
		d, _ := e["details"].(map[string]any)
		return d["stage"]
	}
	stillSSH := func(t *testing.T, p *panelInstall) {
		t.Helper()
		if c, _ := p.f.s.Load(context.Background()); c.Mode != "ssh" || c.Password == "" {
			t.Fatalf("configuration changed: %+v", c)
		}
	}
	for _, tc := range []struct {
		name   string
		setup  func(*panelInstall)
		body   func(*panelInstall) string
		code   int
		reason string
		stage  string
	}{
		{name: "not ssh", setup: func(p *panelInstall) { p.f.writeConfig(Config{Mode: "local", AdminKey: "k", AccountRuntimes: true}) }, code: 400, reason: "ssh_not_configured"},
		{name: "host", body: func(*panelInstall) string { return `{"host":"bad_host.example.com"}` }, code: 400, reason: "invalid_host"},
		{name: "saved ssh host as default", setup: func(p *panelInstall) {
			c := sshConfig
			c.Host = "docker_host"
			p.f.writeConfig(c)
		}, body: func(*panelInstall) string { return `` }, code: 400, reason: "invalid_host"},
		{name: "email", body: func(p *panelInstall) string { return `{"host":"panel.example.com","email":"a{b@example.com"}` }, code: 400, reason: "invalid_email"},
		{name: "ssh", setup: func(p *panelInstall) { p.host.sshErr = true }, code: 503, reason: "ssh_failed"},
		{name: "gateway pull", setup: func(p *panelInstall) {
			p.host.gateway = remotedocker.ScriptResult{Output: "CCG_RESULT=image_pull_failed\n", ExitStatus: 1}
		}, code: 503, reason: "image_pull_failed"},
		{name: "gateway start", setup: func(p *panelInstall) {
			p.host.gateway = remotedocker.ScriptResult{Output: "CCG_RESULT=gateway_failed\n", ExitStatus: 1}
		}, code: 503, reason: "gateway_failed"},
		{name: "gateway garbage", setup: func(p *panelInstall) {
			p.host.gateway = remotedocker.ScriptResult{Output: "CCG_RESULT=started\n", ExitStatus: 2}
		}, code: 503, reason: "gateway_failed"},
		{name: "ca script", setup: func(p *panelInstall) {
			p.host.ca = remotedocker.ScriptResult{Output: "CCG_RESULT=ca_unavailable\n", ExitStatus: 1}
		}, code: 503, reason: "ca_unavailable"},
		{name: "ca not a certificate", setup: func(p *panelInstall) { p.host.ca = remotedocker.ScriptResult{Output: "nothing\nCCG_RESULT=ok\n"} }, code: 503, reason: "ca_unavailable"},
		{name: "wrong root", setup: func(p *panelInstall) {
			p.host.ca = remotedocker.ScriptResult{Output: otherCA(t) + "CCG_RESULT=ok\n"}
		}, code: 503, reason: "gateway_unreachable", stage: "tls"},
		{name: "no tunnel feature", setup: func(p *panelInstall) { p.features = []string{"uploads"} }, code: 503, reason: "gateway_unreachable", stage: "http"},
		{name: "nothing listening", body: func(p *panelInstall) string {
			l, _ := net.Listen("tcp", "127.0.0.1:0")
			port := l.Addr().(*net.TCPAddr).Port
			l.Close()
			return `{"host":"127.0.0.1","port":` + strconv.Itoa(port) + `}`
		}, code: 503, reason: "gateway_unreachable", stage: "connect"},
		{name: "changed meanwhile", setup: func(p *panelInstall) {
			p.host.onGateway = func() { p.f.writeConfig(Config{Mode: "local", AdminKey: panelKey, AccountRuntimes: true}) }
		}, code: 409, reason: "config_changed"},
		{name: "saved meanwhile, same content", setup: func(p *panelInstall) {
			// Rewritten unchanged: still a save by someone else.
			c := sshConfig
			c.AdminKey = panelKey
			p.host.onGateway = func() { p.f.writeConfig(c) }
		}, code: 409, reason: "config_changed"},
		{name: "port in use", setup: func(p *panelInstall) {
			p.host.port = &remotedocker.ScriptResult{Output: "CCG_RESULT=port_in_use\n", ExitStatus: 1}
		}, code: 409, reason: "port_in_use"},
		{name: "no free port", setup: func(p *panelInstall) {
			p.host.port = &remotedocker.ScriptResult{Output: "CCG_RESULT=no_free_port\n", ExitStatus: 1}
		}, body: func(*panelInstall) string { return `{"host":"127.0.0.1"}` }, code: 409, reason: "no_free_port"},
		{name: "docker missing", setup: func(p *panelInstall) {
			p.host.port = &remotedocker.ScriptResult{Output: "CCG_RESULT=docker_not_installed\n", ExitStatus: 1}
		}, code: 400, reason: "docker_not_installed"},
		{name: "docker stopped", setup: func(p *panelInstall) {
			p.host.port = &remotedocker.ScriptResult{Output: "CCG_RESULT=docker_not_running\n", ExitStatus: 1}
		}, code: 503, reason: "docker_not_running"},
		{name: "another port reported", setup: func(p *panelInstall) {
			p.host.port = &remotedocker.ScriptResult{Output: "CCG_PORT=1\nCCG_RESULT=ok\n"}
		}, code: 503, reason: "install_failed"},
		{name: "automatic port out of range", setup: func(p *panelInstall) {
			p.host.port = &remotedocker.ScriptResult{Output: "CCG_PORT=18543\nCCG_RESULT=ok\n"}
		}, body: func(*panelInstall) string { return `{"host":"127.0.0.1"}` }, code: 503, reason: "install_failed"},
		{name: "two ports reported", setup: func(p *panelInstall) {
			p.host.port = &remotedocker.ScriptResult{Output: "CCG_PORT=18443\nCCG_PORT=18444\nCCG_RESULT=ok\n"}
		}, body: func(*panelInstall) string { return `{"host":"127.0.0.1"}` }, code: 503, reason: "install_failed"},
	} {
		t.Run(tc.name, func(t *testing.T) {
			p := newPanelInstall(t)
			if tc.setup != nil {
				tc.setup(p)
			}
			body := p.ipBody()
			if tc.body != nil {
				body = tc.body(p)
			}
			code, out := p.install(1, body)
			if code != tc.code || reason(out) != tc.reason || (tc.stage != "" && stage(out) != tc.stage) {
				t.Fatalf("%d %v", code, out)
			}
			if tc.code == 503 {
				stillSSH(t, p)
			}
		})
	}
	t.Run("in progress", func(t *testing.T) {
		p := newPanelInstall(t)
		p.f.s.installMu.Lock()
		defer p.f.s.installMu.Unlock()
		if code, out := p.install(1, p.ipBody()); code != 409 || reason(out) != "install_in_progress" || p.host.kinds() != "" {
			t.Fatalf("%d %v", code, out)
		}
	})
	t.Run("port", func(t *testing.T) {
		p := newPanelInstall(t)
		for _, body := range []string{`{"port":70000}`, `{"port":-1}`} {
			if code, _ := p.install(1, body); code != 400 || p.host.kinds() != "" {
				t.Fatalf("%s: %d", body, code)
			}
		}
	})
	t.Run("permission", func(t *testing.T) {
		p := newPanelInstall(t)
		p.f.auth.keys[2] = []string{"settings:read"}
		if code, _ := p.install(2, p.ipBody()); code != 403 {
			t.Fatalf("%d", code)
		}
	})
}

// sshBody is an install request over SSH with credentials (§53.9).
func (p *panelInstall) sshBody(extra string) string {
	return `{"method":"ssh","ssh":{"host":"docker2.example","port":2222,"user":"root","auth_mode":"password","password":"request-only-secret",` +
		`"host_key_fingerprint":"SHA256:` + strings.Repeat("B", 43) + `"},"host":"127.0.0.1","port":` + strconv.Itoa(p.port) + extra + `}`
}

func TestControllerInstallSSHCredentialsAreNeverSaved(t *testing.T) {
	p := newPanelInstall(t)
	admin := p.f.user("admin@x")
	// Not configured yet: the install is the first step.
	p.f.writeConfig(Config{Mode: "disabled", Images: &RuntimeImages{Gateway: "caddy:2.8-alpine"}})
	code, out := p.install(admin, p.sshBody(""))
	if code != 200 || data(out)["mode"] != "controller" || data(out)["host"] != "127.0.0.1" || data(out)["port"] != float64(p.port) || data(out)["has_controller_ca"] != true {
		t.Fatalf("install: %d %v", code, out)
	}
	// Every script ran over the request's SSH connection, none locally; no
	// state check of an older controller (a new key needs a new one).
	if got := p.host.kinds(); got != "port,install,finish,gateway,ca" {
		t.Fatalf("scripts: %s", got)
	}
	p.host.mu.Lock()
	for i, seen := range p.host.sshSeen {
		if p.host.targets[i] != "ssh" || seen.Host != "docker2.example" || seen.Port != 2222 || seen.User != "root" || seen.Password != "request-only-secret" {
			t.Errorf("script %d ran over %s %+v", i, p.host.targets[i], seen)
		}
	}
	p.host.mu.Unlock()
	saved, err := p.f.s.Load(context.Background())
	key := p.installedKey()
	if err != nil || saved.Mode != "controller" || saved.Host != "127.0.0.1" || saved.Port != p.port || saved.ControllerCA != p.ca || saved.AdminKey != key || len(key) != 64 ||
		saved.User != "" || saved.AuthMode != "" || saved.Password != "" || saved.PrivateKey != "" || saved.Passphrase != "" || saved.HostKeyFingerprint != "" ||
		!saved.AccountRuntimes || saved.Images == nil || saved.Images.Gateway != "caddy:2.8-alpine" {
		t.Fatalf("saved: %+v %v", saved, err)
	}
	// Nothing anywhere holds the SSH credentials or user.
	var plain []byte
	var raw []byte
	if err := p.f.db.Pool.QueryRow(context.Background(), `SELECT value FROM settings WHERE key=$1`, settingKey).Scan(&raw); err != nil {
		t.Fatal(err)
	}
	var envelope struct {
		Cipher []byte `json:"cipher"`
	}
	_ = json.Unmarshal(raw, &envelope)
	if plain, err = p.f.cipher.Decrypt(envelope.Cipher, configAAD); err != nil {
		t.Fatal(err)
	}
	var audits string
	_ = p.f.db.Pool.QueryRow(context.Background(), `SELECT coalesce(string_agg(action || ' ' || coalesce(detail::text, ''), ';'), '') FROM audit_logs`).Scan(&audits)
	response, _ := json.Marshal(out)
	for name, text := range map[string]string{"configuration": string(plain), "audit": audits, "response": string(response)} {
		for _, secret := range []string{"request-only-secret", "docker2.example", `"root"`, strings.Repeat("B", 43)} {
			if strings.Contains(text, secret) {
				t.Errorf("%s holds %q: %s", name, secret, text)
			}
		}
	}
	if !strings.Contains(audits, `ccgateway.config.update {"fields": ["mode", "scheme", "host", "port", "controller_ca", "admin_key", "ssh"]}`) || !strings.Contains(audits, "ccgateway.controller.install") {
		t.Fatalf("audit: %s", audits)
	}
	// Installing again elsewhere (now connected): a new key again.
	if code, out = p.install(admin, p.sshBody("")); code != 200 {
		t.Fatalf("reinstall: %d %v", code, out)
	}
	if again, _ := p.f.s.Load(context.Background()); again.AdminKey == key || again.AdminKey != p.installedKey() {
		t.Fatal("reinstall kept the old key")
	}
}

func TestControllerInstallLocal(t *testing.T) {
	p := newPanelInstall(t)
	admin := p.f.user("admin@x")
	// Reinstalling over a controller behind a path prefix: the installed
	// gateway serves it at the root.
	prefixed := testPanelConfig("panel.example.com", 443, "")
	prefixed.BasePath = "/controller"
	p.f.writeConfig(prefixed)
	// Host defaults to 127.0.0.1 (core and controller on one machine).
	code, out := p.install(admin, `{"method":"local","port":`+strconv.Itoa(p.port)+`}`)
	if code != 200 || data(out)["host"] != "127.0.0.1" || data(out)["has_controller_ca"] != true || data(out)["base_path"] != "" {
		t.Fatalf("install: %d %v", code, out)
	}
	p.host.mu.Lock()
	targets := strings.Join(p.host.targets, ",")
	p.host.mu.Unlock()
	if got := p.host.kinds(); got != "port,install,finish,gateway,ca" || targets != "local,local,local,local,local" {
		t.Fatalf("scripts: %s over %s", got, targets)
	}
	if saved, _ := p.f.s.Load(context.Background()); saved.Mode != "controller" || saved.AdminKey != p.installedKey() || saved.Host != "127.0.0.1" {
		t.Fatalf("saved: %+v", saved)
	}
	// A local script that cannot run is install_failed, never ssh_failed.
	q := newPanelInstall(t)
	q.host.sshErr = true
	if code, out := q.install(q.f.user("admin@x"), `{"method":"local"}`); code != 503 || reason(out) != "install_failed" {
		t.Fatalf("local runner failure: %d %v", code, out)
	}
	// The local target is never a saved mode, and runs nothing over SSH.
	if open, _, _, err := (&Service{}).open(context.Background(), Config{Mode: localInstallMode}); err != nil || open == nil {
		t.Fatalf("local controller client: %v", err)
	}
}

func TestControllerInstallHTTP(t *testing.T) {
	p := newPanelInstall(t)
	admin := p.f.user("admin@x")
	code, out := p.install(admin, `{"method":"local","scheme":"http","host":"127.0.0.1","port":`+strconv.Itoa(p.plainPort)+`}`)
	if code != 200 || data(out)["scheme"] != "http" || data(out)["port"] != float64(p.plainPort) || data(out)["has_controller_ca"] != false {
		t.Fatalf("install: %d %v", code, out)
	}
	// No certificate to fetch; a plain HTTP Caddyfile.
	if got := p.host.kinds(); got != "port,install,finish,gateway" {
		t.Fatalf("scripts: %s", got)
	}
	want, _ := caddyfileHTTP(p.plainPort)
	if got := p.stdinOf("gateway"); got != want {
		t.Fatalf("Caddyfile:\n%s", got)
	}
	if got := p.stdinOf("port"); got != strconv.Itoa(p.plainPort)+" 18080 0\n" {
		t.Fatalf("port stdin: %q", got)
	}
	saved, _ := p.f.s.Load(context.Background())
	if saved.Scheme != "http" || saved.ControllerCA != "" || saved.Port != p.plainPort {
		t.Fatalf("saved: %+v", saved)
	}
	// The saved HTTP connection works.
	if h, err := p.f.s.health(context.Background(), saved); err != nil || !h.has("tunnel") {
		t.Fatalf("health over http: %v", err)
	}
	// Automatic HTTP ports start at 18080; a domain over HTTP has no ACME check.
	q := newPanelInstall(t)
	q.f.s.openController = func(ctx context.Context, c Config) (*http.Client, string, func() error, error) {
		if c.Mode == "controller" {
			if c.Port != 18080 || c.Scheme != "http" {
				t.Errorf("http panel config: %+v", c)
			}
			c.Port = q.plainPort
			return openControllerPanel(c)
		}
		return p.f.s.openController(ctx, c)
	}
	if code, out := q.install(q.f.user("admin@x"), `{"method":"local","scheme":"http","host":"127.0.0.1"}`); code != 200 || data(out)["port"] != float64(18080) {
		t.Fatalf("automatic http port: %d %v", code, out)
	}
	if got := q.stdinOf("port"); got != "0 18080 0\n" {
		t.Fatalf("port stdin: %q", got)
	}
}

func TestControllerInstallRequestErrors(t *testing.T) {
	for _, tc := range []struct {
		name, body string
		code       int
		reason     string
	}{
		{"ssh without credentials", `{"method":"ssh"}`, 400, "invalid_ssh"},
		{"ssh without fingerprint", `{"method":"ssh","ssh":{"host":"h.example","user":"u","auth_mode":"password","password":"p"}}`, 400, "invalid_ssh"},
		{"ssh bad host", `{"method":"ssh","ssh":{"host":"bad host","user":"u","auth_mode":"password","password":"p","host_key_fingerprint":"SHA256:` + strings.Repeat("A", 43) + `"}}`, 400, "invalid_ssh"},
		{"ssh bad key", `{"method":"ssh","ssh":{"host":"h.example","user":"u","auth_mode":"private_key","private_key":"x","host_key_fingerprint":"SHA256:` + strings.Repeat("A", 43) + `"}}`, 400, "invalid_ssh"},
		{"ssh host is no panel host", `{"method":"ssh","ssh":{"host":"docker","user":"u","auth_mode":"password","password":"p","host_key_fingerprint":"SHA256:` + strings.Repeat("A", 43) + `"}}`, 400, "invalid_host"},
		{"method", `{"method":"docker"}`, 400, ""},
		{"scheme", `{"method":"local","scheme":"ftp"}`, 400, ""},
		{"host", `{"method":"local","host":"*.example.com"}`, 400, "invalid_host"},
		{"email", `{"method":"local","host":"panel.example.com","email":"a b@example.com"}`, 400, "invalid_email"},
		{"body", `{"method":`, 400, ""},
		{"base path", `{"method":"local","base_path":"/controller"}`, 400, ""},
	} {
		t.Run(tc.name, func(t *testing.T) {
			p := newPanelInstall(t)
			code, out := p.install(1, tc.body)
			var want any = tc.reason
			if tc.reason == "" {
				want = nil
			}
			if code != tc.code || reason(out) != want || p.host.kinds() != "" {
				t.Fatalf("%d %v %s", code, out, p.host.kinds())
			}
			if strings.Contains(fmt.Sprint(out), `"p"`) {
				t.Fatal("credentials echoed")
			}
		})
	}
	// Failures over the request's SSH connection keep the configuration.
	p := newPanelInstall(t)
	p.f.writeConfig(Config{Mode: "disabled"})
	p.host.sshErr = true
	if code, out := p.install(1, p.sshBody("")); code != 503 || reason(out) != "ssh_failed" {
		t.Fatalf("ssh failure: %d %v", code, out)
	}
	if c, _ := p.f.s.Load(context.Background()); c.Mode != "disabled" || c.AdminKey != "" {
		t.Fatalf("configuration changed: %+v", c)
	}
	// Saved by someone else while installing.
	q := newPanelInstall(t)
	q.f.writeConfig(Config{Mode: "disabled"})
	q.host.onGateway = func() { q.f.writeConfig(Config{Mode: "disabled"}) }
	if code, out := q.install(1, q.sshBody("")); code != 409 || reason(out) != "config_changed" {
		t.Fatalf("changed meanwhile: %d %v", code, out)
	}
}

// fakePanel mimics the controller API of §53.5 behind HTTPS.
type fakePanel struct {
	mu         sync.Mutex
	health     controllerHealth
	healthFail bool
	uploaded   []byte
	size       int64
	lengths    []int64
	chunked    bool
	calls      []string
	bodies     []string
	upgrade    bool
	loadStatus int
	load       string
	// Worker updates in place (§53.7): the listed runtimes and the
	// images each POST /accounts/<key>/worker asked for.
	runtimes []string
	workers  []string
	listFail bool
}

const testUploadID = "abcdefghijklmnopqrstuv"

func (p *fakePanel) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	p.mu.Lock()
	defer p.mu.Unlock()
	if r.Header.Get("Authorization") != "Bearer "+panelKey {
		w.WriteHeader(401)
		_, _ = w.Write([]byte(`{"error":"unauthorized"}`))
		return
	}
	body, err := io.ReadAll(r.Body)
	call := r.Method + " " + r.URL.Path
	p.calls = append(p.calls, call)
	reply := func(code int, v any) {
		w.WriteHeader(code)
		_ = json.NewEncoder(w).Encode(v)
	}
	if err != nil {
		// A body cut before its Content-Length is never stored.
		reply(400, map[string]string{"error": "invalid_request"})
		return
	}
	switch call {
	case "GET /health":
		if p.healthFail {
			w.WriteHeader(502)
			return
		}
		reply(200, p.health)
	case "POST /images/uploads":
		var in struct {
			Size int64 `json:"size"`
		}
		_ = json.Unmarshal(body, &in)
		p.bodies = append(p.bodies, string(body))
		p.size, p.uploaded = in.Size, nil
		reply(200, map[string]any{"upload_id": testUploadID, "offset": 0, "size": in.Size})
	case "PUT /images/uploads/" + testUploadID:
		p.lengths = append(p.lengths, r.ContentLength)
		if len(r.TransferEncoding) > 0 {
			p.chunked = true
		}
		if off, _ := strconv.ParseInt(r.Header.Get("X-CCG-Offset"), 10, 64); off != int64(len(p.uploaded)) {
			reply(409, map[string]any{"error": "offset_mismatch", "offset": len(p.uploaded)})
			return
		}
		p.uploaded = append(p.uploaded, body...)
		reply(200, map[string]any{"offset": len(p.uploaded), "size": p.size})
	case "GET /images/uploads/" + testUploadID:
		reply(200, map[string]any{"offset": len(p.uploaded), "size": p.size})
	case "DELETE /images/uploads/" + testUploadID:
		reply(200, map[string]any{"deleted": true})
	case "POST /images/uploads/" + testUploadID + "/load":
		if p.loadStatus != 0 {
			w.WriteHeader(p.loadStatus)
		}
		_, _ = w.Write([]byte(p.load))
	case "PUT /runtime/images":
		p.bodies = append(p.bodies, string(body))
		var in map[string]string
		_ = json.Unmarshal(body, &in)
		if v, ok := in["app"]; ok {
			p.health.AppImage = v
		}
		if v, ok := in["egress"]; ok {
			p.health.EgressImage = v
		}
		reply(200, p.health)
	case "POST /runtime/controller":
		p.bodies = append(p.bodies, string(body))
		var in map[string]string
		_ = json.Unmarshal(body, &in)
		if p.upgrade {
			p.health.ControllerImage = in["image"]
		}
		reply(202, map[string]any{"accepted": true})
	case "GET /accounts":
		if p.listFail {
			reply(503, map[string]string{"error": "docker_unavailable"})
			return
		}
		list := []map[string]string{}
		for _, key := range p.runtimes {
			list = append(list, map[string]string{"key": key, "status": "ready"})
		}
		reply(200, map[string]any{"runtimes": list})
	default:
		if key, ok := strings.CutSuffix(strings.TrimPrefix(call, "POST /accounts/"), "/worker"); ok && strings.HasPrefix(call, "POST /accounts/") {
			var in map[string]string
			_ = json.Unmarshal(body, &in)
			p.workers = append(p.workers, key+" "+in["image"])
			reply(200, map[string]string{"status": "updated", "sha256": strings.Repeat("1", 64), "previous_sha256": strings.Repeat("2", 64)})
			return
		}
		reply(404, map[string]string{"error": "not_found"})
	}
}

func (p *fakePanel) seen() (calls, bodies []string) {
	p.mu.Lock()
	defer p.mu.Unlock()
	return append([]string(nil), p.calls...), append([]string(nil), p.bodies...)
}

func newPanelFixture(t *testing.T) (*runtimeFixture, *fakePanel) {
	t.Helper()
	f := newRuntimeFixture(t, newFakeController(t).ServeHTTP)
	panel := &fakePanel{health: controllerHealth{Version: "v3", AppImage: AppImage, EgressImage: EgressImage, ControllerImage: ControllerImage, Features: []string{"tunnel", "uploads"}},
		load: `{"sha256":"` + strings.Repeat("c", 64) + `","images":[{"id":"sha256:` + strings.Repeat("d", 64) + `","tags":["ccgateway:up1","bad tag"]}]}`}
	_, host, port, ca := tlsPanel(t, panel.ServeHTTP)
	f.writeConfig(testPanelConfig(host, port, ca))
	controllerUpgradeWait, controllerUpgradeEvery = 300*time.Millisecond, 50*time.Millisecond
	t.Cleanup(func() { controllerUpgradeWait, controllerUpgradeEvery = 90*time.Second, 3*time.Second })
	return f, panel
}

// raw sends a request with an exact body length (-1: chunked) and headers.
func (f *runtimeFixture) raw(uid int64, method, path, body string, length int64, header map[string]string) (int, map[string]any) {
	f.t.Helper()
	req := httptest.NewRequest(method, "/api/v1"+path, strings.NewReader(body))
	req.ContentLength = length
	if length < 0 {
		req.TransferEncoding = []string{"chunked"}
	}
	req.Header.Set("Authorization", "Bearer u"+strconv.FormatInt(uid, 10))
	for k, v := range header {
		req.Header.Set(k, v)
	}
	w := httptest.NewRecorder()
	f.engine.ServeHTTP(w, req)
	var out map[string]any
	_ = json.Unmarshal(w.Body.Bytes(), &out)
	return w.Code, out
}

func TestControllerUploads(t *testing.T) {
	f, panel := newPanelFixture(t)
	admin := f.user("admin@x")
	base := "/system/ccgateway/runtime/uploads"
	code, out := f.request(admin, "POST", base, `{"size":10,"sha256":"`+strings.Repeat("e", 64)+`"}`)
	if code != 200 || data(out)["upload_id"] != testUploadID || data(out)["size"] != float64(10) {
		t.Fatalf("create: %d %v", code, out)
	}
	put := func(offset, body string, length int64) (int, map[string]any) {
		return f.raw(admin, "PUT", base+"/"+testUploadID, body, length, map[string]string{"X-CCG-Offset": offset})
	}
	if code, out = put("0", "hello", 5); code != 200 || data(out)["offset"] != float64(5) {
		t.Fatalf("chunk: %d %v", code, out)
	}
	errObj := func(out map[string]any) map[string]any {
		e, _ := out["error"].(map[string]any)
		d, _ := e["details"].(map[string]any)
		return d
	}
	if code, out = put("0", "again", 5); code != 409 || reason(out) != "offset_mismatch" || errObj(out)["offset"] != float64(5) {
		t.Fatalf("offset mismatch: %d %v", code, out)
	}
	for name, try := range map[string]func() (int, map[string]any){
		"negative offset": func() (int, map[string]any) { return put("-1", "x", 1) },
		"text offset":     func() (int, map[string]any) { return put("5x", "x", 1) },
		"no offset":       func() (int, map[string]any) { return put("", "x", 1) },
		"chunked":         func() (int, map[string]any) { return put("5", "world", -1) },
		"empty":           func() (int, map[string]any) { return put("5", "", 0) },
		"too large":       func() (int, map[string]any) { return put("5", "x", maxUploadChunk+1) },
		"short body":      func() (int, map[string]any) { return put("5", "wor", 5) },
		"invalid id": func() (int, map[string]any) {
			return f.raw(admin, "PUT", base+"/short", "x", 1, map[string]string{"X-CCG-Offset": "5"})
		},
		"invalid id (get)": func() (int, map[string]any) { return f.request(admin, "GET", base+"/abc.defghijklmnopqrstuv", "") },
	} {
		if code, out := try(); code != 400 {
			t.Errorf("%s: %d %v", name, code, out)
		}
	}
	if code, out = put("5", "world", 5); code != 200 || data(out)["offset"] != float64(10) {
		t.Fatalf("second chunk: %d %v", code, out)
	}
	panel.mu.Lock()
	uploaded, lengths, chunked, created := string(panel.uploaded), panel.lengths, panel.chunked, panel.bodies[0]
	panel.mu.Unlock()
	if uploaded != "helloworld" || chunked || created != `{"sha256":"`+strings.Repeat("e", 64)+`","size":10}` {
		t.Fatalf("controller saw %q chunked=%v lengths=%v created=%s", uploaded, chunked, lengths, created)
	}
	for _, n := range lengths {
		if n != 5 {
			t.Fatalf("Content-Length forwarded: %v", lengths)
		}
	}
	if code, out = f.request(admin, "GET", base+"/"+testUploadID, ""); code != 200 || data(out)["offset"] != float64(10) {
		t.Fatalf("get: %d %v", code, out)
	}
	if code, out = f.request(admin, "GET", base+"/zzzzzzzzzzzzzzzzzzzzzz", ""); code != 404 || reason(out) != "not_found" {
		t.Fatalf("unknown upload: %d %v", code, out)
	}
	if code, out = f.request(admin, "DELETE", base+"/"+testUploadID, ""); code != 200 || data(out)["deleted"] != true {
		t.Fatalf("delete: %d %v", code, out)
	}
	for name, body := range map[string]string{"size 0": `{"size":0}`, "too big": `{"size":4294967297}`, "checksum": `{"size":1,"sha256":"XYZ"}`} {
		if code, _ := f.request(admin, "POST", base, body); code != 400 {
			t.Errorf("%s: %d", name, code)
		}
	}
	// Permissions and mode.
	f.auth.keys[2] = []string{"settings:read"}
	if code, _ = f.request(2, "POST", base, `{"size":1}`); code != 403 {
		t.Fatalf("settings:read only: %d", code)
	}
	if code, _ = f.request(2, "GET", base+"/"+testUploadID, ""); code != 403 {
		t.Fatalf("settings:read only (get): %d", code)
	}
	f.writeConfig(sshConfig)
	if code, out = f.request(admin, "POST", base, `{"size":1}`); code != 400 || reason(out) != "controller_not_configured" {
		t.Fatalf("ssh mode: %d %v", code, out)
	}
}

func TestControllerUploadLoad(t *testing.T) {
	f, panel := newPanelFixture(t)
	admin := f.user("admin@x")
	load := func(body string) (int, map[string]any) {
		return f.request(admin, "POST", "/system/ccgateway/runtime/uploads/"+testUploadID+"/load", body)
	}
	// Without apply: loaded and reported only.
	code, out := load(`{"role":"app"}`)
	images, _ := data(out)["images"].([]any)
	first, _ := images[0].(map[string]any)
	if code != 200 || data(out)["ref"] != "ccgateway:up1" || data(out)["sha256"] != strings.Repeat("c", 64) || len(images) != 1 ||
		fmt.Sprint(first["tags"]) != "[ccgateway:up1]" || data(out)["runtime"] == nil {
		t.Fatalf("load: %d %v", code, out)
	}
	if c, _ := f.s.Load(context.Background()); c.Images != nil {
		t.Fatalf("configuration changed without apply: %+v", c.Images)
	}
	// Apply to app: configuration first, then the controller.
	code, out = load(`{"role":"app","apply":true}`)
	runtime, _ := data(out)["runtime"].(map[string]any)
	installed, _ := runtime["installed"].(map[string]any)
	if code != 200 || installed["app_image"] != "ccgateway:up1" || runtime["up_to_date"] != true {
		t.Fatalf("apply app: %d %v", code, out)
	}
	if c, _ := f.s.Load(context.Background()); c.Images == nil || c.Images.App != "ccgateway:up1" || c.Mode != "controller" || c.ControllerCA == "" {
		t.Fatalf("saved images: %+v", c.Images)
	}
	if _, bodies := panel.seen(); bodies[len(bodies)-1] != `{"app":"ccgateway:up1"}` {
		t.Fatalf("runtime images: %v", bodies)
	}
	var n int
	_ = f.db.Pool.QueryRow(context.Background(), `SELECT count(*) FROM audit_logs WHERE action='ccgateway.config.update' AND detail->'fields' = '["images"]'::jsonb`).Scan(&n)
	var uploads int
	_ = f.db.Pool.QueryRow(context.Background(), `SELECT count(*) FROM audit_logs WHERE action='ccgateway.runtime.upload'`).Scan(&uploads)
	if n != 1 || uploads != 2 {
		t.Fatalf("audit: %d config updates, %d uploads", n, uploads)
	}
	// Apply to the controller: self-upgrade, then wait for the new image.
	panel.mu.Lock()
	panel.upgrade = true
	panel.load = `{"sha256":"` + strings.Repeat("c", 64) + `","images":[{"id":"sha256:` + strings.Repeat("f", 64) + `","tags":[]}]}`
	panel.mu.Unlock()
	code, out = load(`{"role":"controller","apply":true}`)
	ref := "sha256:" + strings.Repeat("f", 64)
	if code != 200 || data(out)["ref"] != ref {
		t.Fatalf("apply controller: %d %v", code, out)
	}
	if calls, bodies := panel.seen(); !strings.Contains(strings.Join(calls, ","), "POST /runtime/controller") || bodies[len(bodies)-1] != `{"image":"`+ref+`"}` {
		t.Fatalf("self-upgrade: %v %v", calls, bodies)
	}
	if c, _ := f.s.Load(context.Background()); c.Images.Controller != ref || c.Images.App != "ccgateway:up1" {
		t.Fatalf("saved images: %+v", c.Images)
	}
	// A controller that never reports the new image.
	panel.mu.Lock()
	panel.upgrade = false
	panel.load = `{"sha256":"` + strings.Repeat("c", 64) + `","images":[{"id":"sha256:` + strings.Repeat("d", 64) + `","tags":["ccg-controller:up3"]}]}`
	panel.mu.Unlock()
	if code, out = load(`{"role":"controller","apply":true}`); code != 503 || reason(out) != "controller_unhealthy" {
		t.Fatalf("upgrade not reported: %d %v", code, out)
	}
	// Controller errors keep their code.
	panel.mu.Lock()
	panel.loadStatus, panel.load = 400, `{"error":"checksum_mismatch"}`
	panel.mu.Unlock()
	if code, out = load(`{"role":"egress","apply":true}`); code != 400 || reason(out) != "checksum_mismatch" {
		t.Fatalf("checksum: %d %v", code, out)
	}
	panel.mu.Lock()
	panel.loadStatus, panel.load = 409, `{"error":"incomplete"}`
	panel.mu.Unlock()
	if code, out = load(`{"role":"egress"}`); code != 409 || reason(out) != "incomplete" {
		t.Fatalf("incomplete: %d %v", code, out)
	}
	if code, _ = load(`{"role":"gateway"}`); code != 400 {
		t.Fatalf("role: %d", code)
	}
	f.s.installMu.Lock()
	code, out = load(`{"role":"app","apply":true}`)
	f.s.installMu.Unlock()
	if code != 409 || reason(out) != "install_in_progress" {
		t.Fatalf("apply during an install: %d %v", code, out)
	}
}

func TestControllerUploadLoadUpdatesWorkers(t *testing.T) {
	f, panel := newPanelFixture(t)
	admin := f.user("admin@x")
	load := func(body string) (int, map[string]any) {
		return f.request(admin, "POST", "/system/ccgateway/runtime/uploads/"+testUploadID+"/load", body)
	}
	panel.mu.Lock()
	panel.runtimes = []string{"5", "6"}
	panel.health.Features = append(panel.health.Features, "worker-update")
	panel.mu.Unlock()
	// Loaded only: no worker is touched.
	if code, out := load(`{"role":"app"}`); code != 200 || data(out)["workers"] != nil {
		t.Fatalf("load: %d %v", code, out)
	}
	// Egress applied: account containers keep running as they are.
	if code, out := load(`{"role":"egress","apply":true}`); code != 200 || data(out)["workers"] != nil {
		t.Fatalf("apply egress: %d %v", code, out)
	}
	panel.mu.Lock()
	n := len(panel.workers)
	panel.mu.Unlock()
	if n != 0 {
		t.Fatalf("workers updated without an app image: %v", panel.workers)
	}
	// App applied: the target image first, then every worker in place.
	code, out := load(`{"role":"app","apply":true}`)
	workers, _ := data(out)["workers"].(map[string]any)
	results, _ := workers["results"].([]any)
	if code != 200 || workers["image"] != "ccgateway:up1" || len(results) != 2 {
		t.Fatalf("apply app: %d %v", code, out)
	}
	first, _ := results[0].(map[string]any)
	if first["key"] != "5" || first["account_id"] != float64(5) || first["status"] != "updated" || first["sha256"] != strings.Repeat("1", 64) ||
		first["previous_sha256"] != strings.Repeat("2", 64) {
		t.Fatalf("result: %v", first)
	}
	calls, _ := panel.seen()
	joined := strings.Join(calls, ",")
	if strings.Index(joined, "PUT /runtime/images") > strings.Index(joined, "POST /accounts/5/worker") {
		t.Fatalf("workers updated before the target image: %v", calls)
	}
	panel.mu.Lock()
	got := strings.Join(panel.workers, ",")
	panel.mu.Unlock()
	if got != "5 ccgateway:up1,6 ccgateway:up1" {
		t.Fatalf("worker calls: %s", got)
	}
	// A controller that cannot list its runtimes: the image is applied all
	// the same, the report says why no worker was updated.
	panel.mu.Lock()
	panel.listFail = true
	panel.mu.Unlock()
	code, out = load(`{"role":"app","apply":true}`)
	workers, _ = data(out)["workers"].(map[string]any)
	results, _ = workers["results"].([]any)
	if code != 200 || workers["reason"] != "controller_unhealthy" || results == nil || len(results) != 0 {
		t.Fatalf("listing failed: %d %v", code, out)
	}
	// An older controller without the worker update: no container is
	// touched, the report says so.
	panel.mu.Lock()
	panel.listFail = false
	panel.workers = nil
	panel.health.Features = []string{"tunnel", "uploads"}
	panel.mu.Unlock()
	code, out = load(`{"role":"app","apply":true}`)
	workers, _ = data(out)["workers"].(map[string]any)
	panel.mu.Lock()
	touched := len(panel.workers)
	panel.mu.Unlock()
	if code != 200 || workers["reason"] != "controller_outdated" || touched != 0 {
		t.Fatalf("outdated controller: %d %v (%d worker calls)", code, out, touched)
	}
}

func TestControllerUpgradeRequestCut(t *testing.T) {
	// The helper container may stop the old controller before the 202: a
	// cut connection counts as accepted, an explicit error does not.
	var mu sync.Mutex
	mode, image := "cut", ""
	_, host, port, ca := tlsPanel(t, func(w http.ResponseWriter, r *http.Request) {
		mu.Lock()
		defer mu.Unlock()
		switch r.URL.Path {
		case "/runtime/controller":
			switch mode {
			case "cut":
				image = "ccg-controller:new"
				conn, _, _ := w.(http.Hijacker).Hijack()
				conn.Close()
			case "bad gateway":
				image = "ccg-controller:new"
				w.WriteHeader(502)
			case "busy":
				w.WriteHeader(409)
				_, _ = w.Write([]byte(`{"error":"upgrade_in_progress"}`))
			}
		case "/health":
			_ = json.NewEncoder(w).Encode(controllerHealth{ControllerImage: image})
		}
	})
	controllerUpgradeWait, controllerUpgradeEvery = 300*time.Millisecond, 50*time.Millisecond
	t.Cleanup(func() { controllerUpgradeWait, controllerUpgradeEvery = 90*time.Second, 3*time.Second })
	s := &Service{}
	cfg := testPanelConfig(host, port, ca)
	for _, m := range []string{"cut", "bad gateway"} {
		mu.Lock()
		mode, image = m, ""
		mu.Unlock()
		if err := s.upgradeController(context.Background(), cfg, "ccg-controller:new"); err != nil {
			t.Fatalf("%s: %v", m, err)
		}
	}
	mu.Lock()
	mode, image = "busy", ""
	mu.Unlock()
	if err := s.upgradeController(context.Background(), cfg, "ccg-controller:new"); err == nil || err.Status != 409 || err.Details["reason"] != "upgrade_in_progress" {
		t.Fatalf("busy: %v", err)
	}
	cfg.ControllerCA = otherCA(t)
	if err := s.upgradeController(context.Background(), cfg, "ccg-controller:new"); err == nil || err.Details["reason"] != "controller_unhealthy" {
		t.Fatalf("unreachable: %v", err)
	}
}

func TestControllerRuntimeAndOneClickUpgrade(t *testing.T) {
	f, panel := newPanelFixture(t)
	admin := f.user("admin@x")
	panel.mu.Lock()
	panel.health = controllerHealth{Version: "v3", AppImage: "ccgateway:old", EgressImage: EgressImage, ControllerImage: "ccg-controller:old", Features: []string{"tunnel"}}
	panel.mu.Unlock()
	code, out := f.request(admin, "GET", "/system/ccgateway/runtime", "")
	installed, _ := data(out)["installed"].(map[string]any)
	if code != 200 || data(out)["up_to_date"] != false || data(out)["reason"] != nil || installed["app_image"] != "ccgateway:old" ||
		installed["controller_image"] != "ccg-controller:old" || installed["version"] != "v3" {
		t.Fatalf("runtime: %d %v", code, out)
	}
	panel.mu.Lock()
	panel.upgrade = true
	panel.mu.Unlock()
	code, out = f.request(admin, "POST", "/system/ccgateway/runtime/install", "")
	if code != 200 || data(out)["up_to_date"] != true {
		t.Fatalf("one-click upgrade: %d %v", code, out)
	}
	calls, bodies := panel.seen()
	joined := strings.Join(calls, ",")
	if !strings.Contains(joined, "PUT /runtime/images") || !strings.Contains(joined, "POST /runtime/controller") ||
		bodies[0] != `{"app":"`+AppImage+`","egress":"`+EgressImage+`"}` || bodies[1] != `{"image":"`+ControllerImage+`"}` {
		t.Fatalf("calls: %v %v", calls, bodies)
	}
	var n int
	_ = f.db.Pool.QueryRow(context.Background(), `SELECT count(*) FROM audit_logs WHERE action='ccgateway.runtime.install'`).Scan(&n)
	if n != 1 {
		t.Fatalf("audit: %d", n)
	}
	// Current already: no self-upgrade.
	if code, _ = f.request(admin, "POST", "/system/ccgateway/runtime/install", ""); code != 200 {
		t.Fatalf("second upgrade: %d", code)
	}
	if calls, _ = panel.seen(); strings.Count(strings.Join(calls, ","), "POST /runtime/controller") != 1 {
		t.Fatalf("needless self-upgrade: %v", calls)
	}
	panel.mu.Lock()
	panel.healthFail = true
	panel.mu.Unlock()
	if code, out = f.request(admin, "GET", "/system/ccgateway/runtime", ""); code != 200 || data(out)["installed"] != nil || data(out)["reason"] != "controller_unhealthy" {
		t.Fatalf("unhealthy: %d %v", code, out)
	}
}

func TestControllerRemoteTest(t *testing.T) {
	f, _ := newPanelFixture(t)
	admin := f.user("admin@x")
	code, out := f.request(admin, "POST", "/system/ccgateway/remote-test", "")
	text, _ := data(out)["output"].(string)
	if code != 200 || !strings.Contains(text, "controller v3\n") || !strings.Contains(text, "app_image "+AppImage+"\n") ||
		!strings.Contains(text, "controller_image "+ControllerImage+"\n") || !strings.Contains(text, "features tunnel, uploads\n") {
		t.Fatalf("remote-test: %d %v", code, out)
	}
	// remote-action is gone (§53.9); remote-test needs a connected controller.
	if code, _ = f.request(admin, "POST", "/system/ccgateway/remote-action", `{"action":"test"}`); code != 404 {
		t.Fatalf("remote-action: %d", code)
	}
	for _, cfg := range []Config{sshConfig, {Mode: "local", AdminKey: "k"}, {Mode: "disabled"}} {
		f.writeConfig(cfg)
		if code, out = f.request(admin, "POST", "/system/ccgateway/remote-test", ""); code != 400 || reason(out) != "controller_not_configured" {
			t.Fatalf("remote-test in %s mode: %d %v", cfg.Mode, code, out)
		}
	}
}
