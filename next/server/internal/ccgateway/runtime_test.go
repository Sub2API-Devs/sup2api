package ccgateway

import (
	"context"
	"encoding/json"
	"errors"
	"net/http"
	"net/http/httptest"
	"regexp"
	"strings"
	"sync"
	"testing"
	"time"

	"github.com/Sub2API-Devs/sup2api/next/server/internal/remotedocker"
)

func TestPinnedImages(t *testing.T) {
	strict := regexp.MustCompile(`^ghcr\.io/sub2api-devs/ccgateway-(app|egress|controller)@sha256:[0-9a-f]{64}$`)
	for role, ref := range map[string]string{"app": AppImage, "egress": EgressImage, "controller": ControllerImage} {
		m := strict.FindStringSubmatch(ref)
		if m == nil || m[1] != role || !validImage(ref) {
			t.Errorf("%s image %q is not ghcr.io/sub2api-devs/ccgateway-%s@sha256:<64 hex>", role, ref, role)
		}
	}
}

func TestRuntimeImageOverrides(t *testing.T) {
	id := "sha256:" + strings.Repeat("ab", 32)
	for ref, ok := range map[string]bool{
		"ccgateway:22cfdb5":              true,
		"ccg-egress:1.12.14":             true,
		id:                               true,
		AppImage:                         true,
		"registry.example/x/y:tag@" + id: true,
		"Ccgateway:tag":                  false,
		"ccgateway:tag;rm -rf /":         false,
		"ccgateway:'x'":                  false,
		"ccgateway tag":                  false,
		"ccgateway:$(id)":                false,
		"-ccgateway":                     false,
	} {
		if validImage(ref) != ok {
			t.Errorf("validImage(%q) = %v, want %v", ref, !ok, ok)
		}
	}
	old := Config{Mode: "local", Images: &RuntimeImages{App: "ccgateway:old"}}
	c, err := mergeConfig(Config{Mode: "local"}, old)
	if err != nil || c.Images == nil || c.Images.App != "ccgateway:old" {
		t.Fatalf("omitted images not kept: %+v %v", c.Images, err)
	}
	if c, err = mergeConfig(Config{Mode: "local", Images: &RuntimeImages{}}, old); err != nil || c.Images != nil {
		t.Fatalf("{} did not reset: %+v %v", c.Images, err)
	}
	if _, err = mergeConfig(Config{Mode: "local", Images: &RuntimeImages{Egress: "bad image"}}, old); err == nil {
		t.Fatal("invalid image accepted")
	}
	c, _ = mergeConfig(Config{Mode: "local", Images: &RuntimeImages{Controller: "ccg-controller:abc"}}, Config{})
	eff := c.EffectiveImages()
	if eff.Controller != "ccg-controller:abc" || eff.App != AppImage || eff.Egress != EgressImage {
		t.Fatalf("effective images: %+v", eff)
	}
	if pub, _ := c.Public()["images"].(RuntimeImages); pub.Controller != "ccg-controller:abc" || pub.App != "" {
		t.Fatalf("public images: %+v", c.Public()["images"])
	}
}

// fakeHostOps answers the runtime scripts and serves the controller's
// GET /health.
type fakeHostOps struct {
	t        *testing.T
	mu       sync.Mutex
	scripts  []string
	stdins   [][]byte
	inspect  string
	install  remotedocker.ScriptResult
	sshErr   bool
	health   controllerHealth
	healthy  bool
	keySeen  string
	rollback string
}

func (h *fakeHostOps) kind(script string) string {
	switch {
	case script == inspectScript:
		return "inspect"
	case script == finishScript:
		return "finish"
	case script == rollbackScript:
		return "rollback"
	case strings.Contains(script, "docker run -d --name ccg-controller"):
		return "install"
	}
	return "unknown"
}

func (h *fakeHostOps) run(_ context.Context, _ remotedocker.Config, script string, stdin []byte, _ time.Duration) (remotedocker.ScriptResult, error) {
	h.mu.Lock()
	defer h.mu.Unlock()
	h.scripts = append(h.scripts, h.kind(script))
	h.stdins = append(h.stdins, stdin)
	if h.sshErr {
		return remotedocker.ScriptResult{}, errors.New("SSH connection failed")
	}
	switch h.kind(script) {
	case "inspect":
		return remotedocker.ScriptResult{Output: h.inspect}, nil
	case "install":
		return h.install, nil
	case "rollback":
		return remotedocker.ScriptResult{Output: "CCG_RESULT=" + h.rollback + "\n"}, nil
	case "finish":
		return remotedocker.ScriptResult{Output: "CCG_RESULT=done\n"}, nil
	}
	h.t.Errorf("unexpected script %q", script)
	return remotedocker.ScriptResult{ExitStatus: 127}, nil
}

func (h *fakeHostOps) kinds() string {
	h.mu.Lock()
	defer h.mu.Unlock()
	return strings.Join(h.scripts, ",")
}

func newRuntimeOpsFixture(t *testing.T, cfg Config) (*runtimeFixture, *fakeHostOps) {
	t.Helper()
	f := newRuntimeFixture(t, newFakeController(t).ServeHTTP)
	host := &fakeHostOps{t: t, healthy: true, rollback: "restored",
		install: remotedocker.ScriptResult{Output: "CCG_RESULT=started\n"}}
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		host.mu.Lock()
		defer host.mu.Unlock()
		host.keySeen = strings.TrimPrefix(r.Header.Get("Authorization"), "Bearer ")
		if r.URL.Path != "/health" || !host.healthy {
			w.WriteHeader(503)
			return
		}
		_ = json.NewEncoder(w).Encode(host.health)
	}))
	t.Cleanup(srv.Close)
	f.s.runScript = host.run
	f.s.openController = func(context.Context, Config) (*http.Client, string, func() error, error) {
		return srv.Client(), srv.URL, func() error { return nil }, nil
	}
	healthWait, healthEvery = 300*time.Millisecond, 50*time.Millisecond
	t.Cleanup(func() { healthWait, healthEvery = 60*time.Second, 2*time.Second })
	f.writeConfig(cfg)
	return f, host
}

func (f *runtimeFixture) writeConfig(cfg Config) {
	f.t.Helper()
	plain, _ := json.Marshal(cfg)
	encrypted, _ := f.cipher.Encrypt(plain, configAAD)
	envelope, _ := json.Marshal(map[string]any{"cipher": encrypted})
	if _, e := f.db.Pool.Exec(context.Background(), `INSERT INTO settings(key,value) VALUES($1,$2) ON CONFLICT(key) DO UPDATE SET value=excluded.value`, settingKey, envelope); e != nil {
		f.t.Fatal(e)
	}
}

var sshConfig = Config{Mode: "ssh", Host: "docker.example", Port: 22, User: "ops", AuthMode: "password", Password: "ssh-secret",
	HostKeyFingerprint: "SHA256:" + strings.Repeat("A", 43), AccountRuntimes: true}

func TestRuntimeInstallGeneratesTheKeyAndSendsItOnlyOnStdin(t *testing.T) {
	f, host := newRuntimeOpsFixture(t, sshConfig)
	admin := f.user("admin@x") // audit rows reference the user
	host.health = controllerHealth{Version: "22cfdb5", AppImage: AppImage, EgressImage: EgressImage}
	host.inspect = `"` + ControllerImage + `"` + "\nCCG_APP_IMAGE=" + AppImage + "\nCCG_EGRESS_IMAGE=" + EgressImage + "\nCCG_CONTROLLER_KEY=leaked\n"
	code, out := f.request(admin, "POST", "/system/ccgateway/runtime/install", "")
	if code != 200 || data(out)["up_to_date"] != true {
		t.Fatalf("install: %d %v", code, out)
	}
	saved, err := f.s.Load(context.Background())
	if err != nil || len(saved.AdminKey) != 64 {
		t.Fatalf("controller key not saved: %d %v", len(saved.AdminKey), err)
	}
	if got := host.kinds(); got != "install,finish,inspect" {
		t.Fatalf("scripts: %s", got)
	}
	host.mu.Lock()
	stdin := string(host.stdins[0])
	keySeen := host.keySeen
	host.mu.Unlock()
	want := "CCG_RUNTIME_ROOT=/opt/ccgateway-runtime\nCCG_APP_IMAGE=" + AppImage + "\nCCG_EGRESS_IMAGE=" + EgressImage +
		"\nCCG_CONTROLLER_KEY=" + saved.AdminKey + "\nCCG_CONTROLLER_PORT=8787\n"
	if stdin != want {
		t.Fatalf("environment on stdin:\n%s", stdin)
	}
	if keySeen != saved.AdminKey {
		t.Fatal("health check did not use the controller key")
	}
	raw, _ := json.Marshal(out)
	if strings.Contains(string(raw), saved.AdminKey) || strings.Contains(string(raw), "leaked") {
		t.Fatalf("response leaks a key: %s", raw)
	}
	inst := data(out)["installed"].(map[string]any)
	if inst["version"] != "22cfdb5" || inst["controller_image"] != ControllerImage {
		t.Fatalf("installed: %v", inst)
	}
	var n int
	if err := f.db.Pool.QueryRow(context.Background(), `SELECT count(*) FROM audit_logs WHERE action='ccgateway.runtime.install'`).Scan(&n); err != nil || n != 1 {
		t.Fatalf("audit: %d %v", n, err)
	}
	// A configured key is reused, not replaced.
	if code, _ = f.request(admin, "POST", "/system/ccgateway/runtime/install", ""); code != 200 {
		t.Fatalf("second install: %d", code)
	}
	if again, _ := f.s.Load(context.Background()); again.AdminKey != saved.AdminKey {
		t.Fatal("controller key replaced")
	}
}

func TestInstallScriptContainsNoInput(t *testing.T) {
	img := Config{Images: &RuntimeImages{App: "ccgateway:22cfdb5"}}.EffectiveImages()
	script, err := installScript(img)
	if err != nil {
		t.Fatal(err)
	}
	// Everything but the three references is fixed text.
	fixed := strings.NewReplacer(img.App, "<APP>", img.Egress, "<EGRESS>", img.Controller, "<CTL>").Replace(script)
	again, _ := installScript(RuntimeImages{App: "a:1", Egress: "b:1", Controller: "c:1"})
	if strings.NewReplacer("a:1", "<APP>", "b:1", "<EGRESS>", "c:1", "<CTL>").Replace(again) != fixed {
		t.Fatal("install script depends on more than the image references")
	}
	for _, s := range []string{"CCG_CONTROLLER_KEY", "ssh-secret"} {
		if strings.Contains(script, s) {
			t.Fatalf("script contains %q", s)
		}
	}
	if !strings.Contains(script, `docker image inspect "$img" >/dev/null 2>&1 || docker pull`) {
		t.Fatal("present images are pulled again")
	}
	if _, err = installScript(RuntimeImages{App: "x'; rm -rf / #", Egress: "b", Controller: "c"}); err == nil {
		t.Fatal("unsafe reference accepted")
	}
	if strings.Contains(inspectScript, "CCG_CONTROLLER_KEY") || !strings.Contains(inspectScript, `grep -E '^("|CCG_APP_IMAGE=|CCG_EGRESS_IMAGE=)'`) {
		t.Fatal("inspect script does not filter the environment on the host")
	}
}

func TestRuntimeInstallFailures(t *testing.T) {
	cfg := sshConfig
	cfg.AdminKey = "configured-controller-key"
	cfg.Images = &RuntimeImages{App: "ccgateway:22cfdb5", Egress: "ccg-egress:1.12.14", Controller: "ccg-controller:22cfdb5"}

	t.Run("pull", func(t *testing.T) {
		f, host := newRuntimeOpsFixture(t, cfg)
		host.install = remotedocker.ScriptResult{Output: "CCG_RESULT=image_pull_failed\n", ExitStatus: 1}
		code, out := f.request(1, "POST", "/system/ccgateway/runtime/install", "")
		if code != 503 || reason(out) != "image_pull_failed" || host.kinds() != "install" {
			t.Fatalf("%d %v %s", code, out, host.kinds())
		}
		if !strings.Contains(string(host.stdins[0]), "CCG_APP_IMAGE=ccgateway:22cfdb5\n") {
			t.Fatalf("override not installed: %s", host.stdins[0])
		}
	})
	t.Run("unhealthy rolls back", func(t *testing.T) {
		f, host := newRuntimeOpsFixture(t, cfg)
		host.health = controllerHealth{AppImage: "ccgateway:other", EgressImage: "ccg-egress:1.12.14"}
		code, out := f.request(1, "POST", "/system/ccgateway/runtime/install", "")
		errObj, _ := out["error"].(map[string]any)
		details, _ := errObj["details"].(map[string]any)
		if code != 503 || reason(out) != "controller_unhealthy" || details["rollback"] != "restored" || host.kinds() != "install,rollback" {
			t.Fatalf("%d %v %s", code, out, host.kinds())
		}
		if host.keySeen != "configured-controller-key" {
			t.Fatalf("health key %q", host.keySeen)
		}
	})
	t.Run("ssh", func(t *testing.T) {
		f, host := newRuntimeOpsFixture(t, cfg)
		host.sshErr = true
		if code, out := f.request(1, "POST", "/system/ccgateway/runtime/install", ""); code != 503 || reason(out) != "ssh_failed" {
			t.Fatalf("%d %v", code, out)
		}
		if code, out := f.request(1, "GET", "/system/ccgateway/runtime", ""); code != 200 || data(out)["reason"] != "ssh_failed" {
			t.Fatalf("status: %d %v", code, out)
		}
	})
	t.Run("in progress", func(t *testing.T) {
		f, _ := newRuntimeOpsFixture(t, cfg)
		f.s.installMu.Lock()
		defer f.s.installMu.Unlock()
		if code, out := f.request(1, "POST", "/system/ccgateway/runtime/install", ""); code != 409 || reason(out) != "install_in_progress" {
			t.Fatalf("%d %v", code, out)
		}
	})
	t.Run("not ssh", func(t *testing.T) {
		f, host := newRuntimeOpsFixture(t, Config{Mode: "local", AdminKey: "k"})
		if code, out := f.request(1, "POST", "/system/ccgateway/runtime/install", ""); code != 400 || reason(out) != "ssh_not_configured" || host.kinds() != "" {
			t.Fatalf("%d %v", code, out)
		}
	})
}

func TestRuntimeStatus(t *testing.T) {
	cfg := sshConfig
	cfg.AdminKey = "configured-controller-key"
	f, host := newRuntimeOpsFixture(t, cfg)
	host.inspect = "CCG_RESULT=not_installed\n"
	code, out := f.request(1, "GET", "/system/ccgateway/runtime", "")
	exp, _ := data(out)["expected"].(map[string]any)
	if code != 200 || data(out)["reason"] != nil || data(out)["installed"] != nil || exp["controller"] != ControllerImage {
		t.Fatalf("not installed: %d %v", code, out)
	}
	// An older controller: installed, healthy, not up to date.
	host.inspect = "\"ccg-controller:accounts\"\nCCG_APP_IMAGE=ccgateway:accounts\nCCG_EGRESS_IMAGE=ccg-egress:1.12.14\n"
	host.health = controllerHealth{Version: "dev", AppImage: "ccgateway:accounts", EgressImage: "ccg-egress:1.12.14"}
	code, out = f.request(1, "GET", "/system/ccgateway/runtime", "")
	inst, _ := data(out)["installed"].(map[string]any)
	if code != 200 || data(out)["up_to_date"] != false || data(out)["reason"] != nil || inst["app_image"] != "ccgateway:accounts" || inst["version"] != "dev" {
		t.Fatalf("outdated: %d %v", code, out)
	}
	host.healthy = false
	if code, out = f.request(1, "GET", "/system/ccgateway/runtime", ""); data(out)["reason"] != "controller_unhealthy" || data(out)["installed"] == nil {
		t.Fatalf("unhealthy: %d %v", code, out)
	}
	f.auth.keys[2] = []string{"account:read"}
	if code, _ = f.request(2, "GET", "/system/ccgateway/runtime", ""); code != 403 {
		t.Fatalf("without settings:read: %d", code)
	}
	if code, _ = f.request(2, "POST", "/system/ccgateway/runtime/install", ""); code != 403 {
		t.Fatalf("install without settings:manage: %d", code)
	}
}
