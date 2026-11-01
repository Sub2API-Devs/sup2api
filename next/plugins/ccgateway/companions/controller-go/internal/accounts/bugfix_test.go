package accounts

import (
	"errors"
	"io/fs"
	"os"
	"path/filepath"
	"testing"

	"ccgateway/controller/internal/errs"
	"ccgateway/controller/internal/guardapi"
	"ccgateway/controller/internal/guardapi/fakeguard"
	"ccgateway/controller/internal/names"
	"ccgateway/controller/internal/pyjson"
	"ccgateway/controller/internal/store"
)

func (e *env) desiredFile(aid string) string {
	e.t.Helper()
	b, err := os.ReadFile(filepath.Join(e.dir, aid, store.DesiredFile))
	if errors.Is(err, fs.ErrNotExist) {
		return ""
	}
	if err != nil {
		e.t.Fatal(err)
	}
	return string(b)
}

// covers: BUG-3(fixed) A3 S24 G15 RB2 (a refused configuration is never reported ready by the recovery)
func TestRefusedConfigurationIsNotActivatedByTheRecovery(t *testing.T) {
	e := newEnv(t)
	e.mustApply("21", desired(rev))
	before := e.desiredFile("21")
	if before != string(pyjson.MustMarshal(desired(rev))) {
		t.Fatal(before)
	}
	e.probe() // the requested CLI is not packaged: 409
	_, err := e.apply("21", desired(revB, kv("cli", profile("2.1.302", "direct"))))
	if !isKind(err, errs.InvalidCLIProfile) {
		t.Fatal(err)
	}
	if e.desiredFile("21") != before {
		t.Fatal("the refused configuration is not recorded")
	}
	e.clock.Advance(RecoverEvery)
	if err := e.m.recover(bg); err != nil {
		t.Fatal(err)
	}
	st := e.state("21")
	p, _ := e.m.Public(bg, "21")
	if st.Revision != rev || p.Revision != rev || e.desiredFile("21") != before {
		t.Fatalf("still the old revision: %s %s", st.Revision, p.Revision)
	}
	// The core sees the old revision and tries again: the same 409, not hidden.
	if _, err := e.apply("21", desired(revB, kv("cli", profile("2.1.302", "direct")))); !isKind(err, errs.InvalidCLIProfile) {
		t.Fatal(err)
	}
}

// covers: BUG-3(fixed) S24 (an activated configuration is recorded; a block records its configuration)
func TestDesiredIsRecordedAfterActivationAndBeforeABlock(t *testing.T) {
	e := newEnv(t)
	e.mustApply("21", desired(rev))
	withAuth := desired(revB, kv("proxy", proxyObj("198.51.100.8")), kv("auth", pyjson.Ordered{kv("mode", "oauth")}))
	e.mustApply("21", withAuth)
	want := withAuth.Clone()
	want.Delete("auth")
	if e.desiredFile("21") != string(pyjson.MustMarshal(want)) {
		t.Fatal("updated, without auth:", e.desiredFile("21"))
	}
	block := pyjson.Ordered{kv("revision", revC), kv("proxy", nil), kv("future", "x")}
	if _, err := e.apply("21", block); err != nil {
		t.Fatal(err)
	}
	if e.desiredFile("21") != string(pyjson.MustMarshal(block)) {
		t.Fatal("the block's configuration, unknown keys kept:", e.desiredFile("21"))
	}
}

// covers: BUG-3(fixed) A6 (a new account whose first configuration fails leaves no file)
func TestFirstFailedConfigurationLeavesNoDesiredFile(t *testing.T) {
	e := newEnv(t)
	e.g.OnExec("app:21", []string{"node", "-e"}, fakeguard.ExecReply(1, ""))
	if _, err := e.apply("21", desired(rev)); err == nil {
		t.Fatal("probe failure")
	}
	if e.desiredFile("21") != "" || e.state("21") == nil {
		t.Fatal("state exists, no desired file")
	}
}

// covers: BUG-3(fixed) W11 (Reapply uses the last activated configuration)
func TestReapplyUsesTheLastActivatedConfiguration(t *testing.T) {
	e := newEnv(t)
	e.mustApply("21", desired(rev))
	h, _ := e.m.Lock(bg, "21")
	defer h.Release()
	st, _ := e.m.State("21")
	e.g.RestartContainer("ccg-21-app")
	e.m.GoOffline("21")
	if err := e.m.Reapply(bg, h, st); err != nil {
		t.Fatal(err)
	}
	if !e.m.OnlineAt("21", rev) {
		t.Fatal("ready at the old revision")
	}
	if err := e.m.Reapply(bg, h, nilDesired(e, "21")); err == nil {
		t.Fatal("no desired file")
	}
}

func nilDesired(e *env, aid string) *store.AccountState {
	os.Remove(filepath.Join(e.dir, aid, store.DesiredFile))
	return e.state(aid)
}

// covers: BUG-5(fixed) V10 N5 (proxy errors are 400 at the entry and build nothing)
func TestInvalidProxyIsRejectedAtTheEntry(t *testing.T) {
	e := newEnv(t)
	for _, proxy := range []string{
		`{"protocol": "http", "port": 3128}`,
		`{"protocol": "http", "host": "", "port": 3128}`,
		`{"protocol": "http", "host": "p.test", "port": 0}`,
		`{"protocol": "http", "host": "p.test", "port": 65536}`,
		`{"protocol": "http", "host": "p.test"}`,
		`{"protocol": "ftp", "host": "p.test", "port": 21}`,
		`"http://p.test:3128"`,
	} {
		_, err := e.apply("21", pyjson.Ordered{kv("revision", rev), kv("proxy", obj(t, proxy))})
		if status, code, _ := errs.Answer(err, errs.Request); status != 400 || code != "invalid_request" {
			t.Fatal(proxy, err)
		}
	}
	if len(e.g.ContainerNames()) != 0 || len(e.g.VolumeNames()) != 0 || len(e.g.NetworkNames()) != 0 {
		t.Fatal("nothing built")
	}
	// int() semantics of the port, and a disabled configuration is a block whatever the proxy.
	e.mustApply("21", pyjson.Ordered{kv("revision", rev), kv("proxy", obj(t, `{"protocol": "socks5", "host": "`+proxyIP+`", "port": "1080"}`))})
	if out, err := e.apply("21", pyjson.Ordered{kv("revision", rev), kv("enabled", false), kv("proxy", obj(t, `{"protocol": "x"}`))}); err != nil {
		t.Fatal(out, err)
	}
}

// covers: A2 V2 H6 (validation order and messages: not an object, bad revision)
func TestConfigurationValidation(t *testing.T) {
	e := newEnv(t)
	for _, raw := range []any{nil, "x", []any{}, pyjson.Ordered{kv("revision", "A")}, pyjson.Ordered{}} {
		if _, err := e.m.Apply(bg, "21", raw); !isKind(err, errs.BadRequest) {
			t.Fatal(raw, err)
		}
	}
	if e.state("21") != nil {
		t.Fatal("nothing written")
	}
}

// covers: 02-§3 contract (UpdateHost: App, EnsureImage, State, Save, Readiness, OnlineAt, BusinessFirewall)
func TestUpdateHostMethods(t *testing.T) {
	e := newEnv(t)
	if _, err := e.m.App(bg, "21"); !guardapi.IsNotFound(err) {
		t.Fatal(err)
	}
	e.g.AddContainer(fakeguard.ContainerSpec{Name: "ccg-20-app", Image: "app:test", Labels: map[string]string{names.LabelAccount: "x"}})
	if _, err := e.m.App(bg, "20"); !isKind(err, errs.OwnershipMismatch) {
		t.Fatal(err)
	}
	e.mustApply("21", desired(rev))
	app, err := e.m.App(bg, "21")
	if err != nil || app.ID != e.appID("21") {
		t.Fatal(err)
	}
	e.g.AddPullable("ghcr.io/x/y:1", fakeguard.ImageSpec{})
	if img, err := e.m.EnsureImage(bg, "ghcr.io/x/y:1"); err != nil || img.ID == "" {
		t.Fatal(err)
	}
	if _, err := e.m.EnsureImage(bg, "ghcr.io/x/missing:1"); !isKind(err, errs.ImagePullFailed) {
		t.Fatal(err)
	}
	h, _ := e.m.Lock(bg, "21")
	st, _ := e.m.State("21")
	if r, err := e.m.Readiness(bg, "21", st); r != rev || err != nil || !e.m.OnlineAt("21", rev) || e.m.OnlineAt("21", "") {
		t.Fatal(r, err)
	}
	st.Extra.Set("note", "x")
	if err := e.m.Save(h, st); err != nil || !e.state("21").Extra.Has("note") {
		t.Fatal(err)
	}
	if err := e.m.BusinessFirewall(bg, h, st.GatewayIP); err != nil {
		t.Fatal(err)
	}
	h.Release()
	if e.m.GoOffline("21") != rev || e.m.GoOffline("21") != "" {
		t.Fatal("GoOffline returns the revision once")
	}
}

// covers: X1 X2 C2 02-§3 contract (CleanupHost and AdminHost views of the shared bindings)
func TestCleanupAndAdminHostViews(t *testing.T) {
	e := newEnv(t)
	if e.m.HasSharedBindings() || len(e.m.SharedBindingKeys()) != 0 {
		t.Fatal("no bindings")
	}
	if _, ok := e.m.SharedBinding("21"); ok {
		t.Fatal("none")
	}
	e.mustApply("22", desired(rev))
	e.mustApply("21", desired(rev))
	if !e.m.HasSharedBindings() || pyjson.Equal(e.m.SharedBindingKeys(), []string{"21", "22"}) {
		t.Fatal("insertion order: 22, 21")
	}
	b, ok := e.m.SharedBinding("21")
	if !ok || !pyjson.Equal(field(b, "ip"), e.state("21").AppIP) || !pyjson.Truthy(field(b, "active")) {
		t.Fatal(b)
	}
	b.Set("active", false)
	if b2, _ := e.m.SharedBinding("21"); !pyjson.Truthy(field(b2, "active")) {
		t.Fatal("a copy")
	}
}

// covers: E3 S30 RB5 02-§6.3 (the shared state: legacy path moved, conflict refused, schema checked, salt kept)
func TestSharedStateLoading(t *testing.T) {
	e := newEnv(t)
	e.mustApply("21", desired(rev))
	salt := e.m.shared.data.Salt
	if len(salt) != 64 {
		t.Fatal(salt)
	}
	data, _ := os.ReadFile(filepath.Join(e.dir, store.SharedFile))
	e.open("app:test", "ccgateway-egress:test")
	if e.m.shared.data.Salt != salt || !e.m.HasSharedBindings() {
		t.Fatal("reloaded")
	}
	os.MkdirAll(filepath.Join(e.dir, store.LegacySharedDir), 0o700)
	os.WriteFile(filepath.Join(e.dir, store.LegacySharedFile), data, 0o600)
	e.st.Close()
	st, _ := store.Open(e.dir)
	defer func() { e.st = st }()
	_, err := New(Options{Config: e.cfg, Store: st, Guard: e.g.Client(), Images: e.images})
	if !errors.Is(err, store.ErrSharedConflict) {
		t.Fatal(err)
	}
	os.Remove(filepath.Join(e.dir, store.SharedFile))
	m, err := New(Options{Config: e.cfg, Store: st, Guard: e.g.Client(), Images: e.images})
	if err != nil || m.shared.data.Salt != salt {
		t.Fatal("legacy path moved", err)
	}
	os.WriteFile(filepath.Join(e.dir, store.SharedFile), []byte(`{"schema": 2, "salt": "x", "bindings": {}, "nodes": {}}`), 0o600)
	if _, err := New(Options{Config: e.cfg, Store: st, Guard: e.g.Client(), Images: e.images}); !errors.Is(err, store.ErrSchema) {
		t.Fatal(err)
	}
	if _, err := New(Options{Config: e.cfg, Guard: e.g.Client(), Images: e.images}); err == nil {
		t.Fatal("Store is required")
	}
}
