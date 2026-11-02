package admin

import (
	"bytes"
	"context"
	"encoding/json"
	"path/filepath"
	"strings"
	"sync"
	"testing"
	"time"

	"ccgateway/controller/internal/clock"
	"ccgateway/controller/internal/config"
	"ccgateway/controller/internal/errs"
	"ccgateway/controller/internal/guardapi"
	"ccgateway/controller/internal/guardapi/fakeguard"
	"ccgateway/controller/internal/hoststate"
	"ccgateway/controller/internal/logx"
	"ccgateway/controller/internal/names"
	"ccgateway/controller/internal/pyjson"
	"ccgateway/controller/internal/store"
)

const (
	app2 = "ghcr.io/sub2api-devs/ccgateway-app@sha256:bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb"
	ctl2 = "ghcr.io/sub2api-devs/ccgateway-controller:v2"
	egr2 = "ghcr.io/sub2api-devs/ccgateway-egress:0.1.119"
)

// stubHost is a contract.AdminHost.
type stubHost struct {
	mu        sync.Mutex
	bindings  bool
	op        sync.Mutex
	inOp      bool
	ops       int
	recreated int
	events    []string
}

func (h *stubHost) HasSharedBindings() bool {
	h.mu.Lock()
	defer h.mu.Unlock()
	return h.bindings
}

func (h *stubHost) WithSharedOp(ctx context.Context, fn func(ctx context.Context) error) error {
	h.op.Lock()
	defer h.op.Unlock()
	h.mu.Lock()
	h.inOp, h.ops = true, h.ops+1
	h.mu.Unlock()
	defer func() {
		h.mu.Lock()
		h.inOp = false
		h.mu.Unlock()
	}()
	return fn(ctx)
}

func (h *stubHost) GatewayRecreated() {
	h.mu.Lock()
	defer h.mu.Unlock()
	h.recreated++
	h.events = append(h.events, "recreated in-op="+map[bool]string{true: "yes", false: "no"}[h.inOp])
}

type env struct {
	t   *testing.T
	g   *fakeguard.Guard
	h   *stubHost
	st  *store.Store
	im  *hoststate.Images
	clk *clock.Fake
	a   *admin
	cfg config.Config
	dir string
}

func newEnv(t *testing.T) *env {
	t.Helper()
	g := fakeguard.New()
	g.AddImage("app:test", fakeguard.ImageSpec{})
	g.AddImage("egress:test", fakeguard.ImageSpec{Labels: map[string]string{names.LabelSharedSchema: "1"}})
	dir := filepath.Join(t.TempDir(), "r")
	e := &env{t: t, g: g, h: &stubHost{}, dir: dir, clk: clock.NewFake(time.Date(2026, 11, 1, 0, 0, 0, 0, time.UTC)),
		cfg: config.Config{Version: "0.1.119", ControllerImage: "", AccountDiskBytes: 10 << 30}}
	e.open("app:test", "egress:test")
	return e
}

// open (re)starts the controller's admin over the same data root.
func (e *env) open(envApp, envEgress string) {
	e.t.Helper()
	if e.st != nil {
		e.st.Close()
	}
	st, err := store.Open(e.dir)
	if err != nil {
		e.t.Fatal(err)
	}
	e.t.Cleanup(func() { st.Close() })
	im, err := hoststate.NewImages(st, envApp, envEgress, e.clk)
	if err != nil {
		e.t.Fatal(err)
	}
	a, err := New(Options{Config: e.cfg, Host: e.h, Guard: e.g.Client(), Store: st, Images: im, Clock: e.clk,
		Log: logx.New(&bytes.Buffer{}, "admin")})
	if err != nil {
		e.t.Fatal(err)
	}
	e.st, e.im, e.a = st, im, a.(*admin)
}

func js(v any) string { return string(pyjson.MustMarshal(v)) }

func get(o pyjson.Ordered, k string) any {
	v, _ := o.Get(k)
	return v
}

func answer(err error) string {
	st, code, _ := errs.Answer(err, errs.Management)
	b, _ := json.Marshal([]any{st, code})
	return string(b)
}

func obj(pairs ...any) pyjson.Ordered {
	var o pyjson.Ordered
	for i := 0; i < len(pairs); i += 2 {
		o = append(o, pyjson.KV{Key: pairs[i].(string), Value: pairs[i+1]})
	}
	return o
}

func (e *env) runtimeJSON() string {
	b, err := e.st.ReadFile(store.RuntimeFile)
	if err != nil {
		return ""
	}
	return string(b)
}

func (e *env) targets() string {
	a, eg := e.im.Targets()
	return a + " " + eg
}

// covers: R1 (the health answer: Python's fields and order, the features, the gateway fields last)
func TestHealthShape(t *testing.T) {
	e := newEnv(t)
	e.cfg.ControllerImage = "ccgateway-controller:0.1.119"
	e.open("app:test", "egress:test")
	e.h.bindings = true
	got := js(e.a.Health(context.Background()))
	want := `{"version": "0.1.119", "app_image": "app:test", "egress_image": "egress:test", ` +
		`"controller_image": "ccgateway-controller:0.1.119", "network_policy_version": 1, ` +
		`"features": ["tunnel", "uploads", "runtime-images", "self-upgrade", "worker-update", "runtime-pair-update-v1", ` +
		`"shared-egress-v1", "cli-profile-v1", "runtime-cleanup-v1", "account-disk-quota-v1", "runtime-purge-v2", ` +
		`"guard-api-v1", "egress-recreate-v1", "cli-from-image-v1"], "disk_quota": {"default_bytes": 10737418240, "support": "unknown"}, ` +
		`"egress_gateway": {"status": "absent", "image_id": "", "target_image": "egress:test", "target_id": "` +
		e.g.ImageID("egress:test") + `", "update_available": false}}`
	if got != want {
		t.Fatalf("got  %s\nwant %s", got, want)
	}
	e.a.o.DiskQuota.Set(hoststate.QuotaAvailable)
	if q := js(get(e.a.Health(context.Background()), "disk_quota")); q != `{"default_bytes": 10737418240, "support": "available"}` {
		t.Fatal(q)
	}
}

// covers: I4 02-§7.4 (egress_gateway: running image against the target; update available; stopped; guard down is unknown)
func TestHealthReportsGatewayUpdate(t *testing.T) {
	e := newEnv(t)
	e.g.SetGatewayImage("egress:test")
	e.g.AddGateway(guardapi.ManagedByCompose)
	gw := func() string { return js(get(e.a.Health(context.Background()), "egress_gateway")) }
	id := e.g.ImageID("egress:test")
	if got := gw(); got != `{"status": "running", "image_id": "`+id+`", "target_image": "egress:test", "target_id": "`+id+`", "update_available": false}` {
		t.Fatal(got)
	}
	e.g.AddPullable(egr2, fakeguard.ImageSpec{Labels: map[string]string{names.LabelSharedSchema: "1"}})
	if _, err := e.a.SetRuntimeImages(context.Background(), obj("egress", egr2)); err != nil {
		t.Fatal(err)
	}
	id2 := e.g.ImageID(egr2)
	if got := gw(); got != `{"status": "running", "image_id": "`+id+`", "target_image": "`+egr2+`", "target_id": "`+id2+`", "update_available": true}` {
		t.Fatal(got)
	}
	// Recorded only: the gateway was neither recreated nor started (02 §7.4).
	if e.g.Count("POST /v1/gateway/recreate")+e.g.Count("POST /v1/gateway/ensure") != 0 {
		t.Fatal(e.g.Routes())
	}
	e.g.StopContainer("ccg-shared-egress")
	e.clk.Advance(GatewayCacheTTL)
	if got := gw(); !strings.HasPrefix(got, `{"status": "stopped", "image_id": "`+id+`"`) {
		t.Fatal(got)
	}
	e.g.Fail("GET /v1/gateway", fakeguard.Fault{Status: 0, Times: 100})
	e.clk.Advance(GatewayCacheTTL)
	h := e.a.Health(context.Background())
	if got := js(get(h, "egress_gateway")); got != `{"status": "unknown", "image_id": "", "target_image": "", "target_id": "", "update_available": false}` {
		t.Fatal(got)
	}
	if get(h, "egress_image") != egr2 {
		t.Fatal(js(h)) // egress_image stays the target, not the running image
	}
}

// covers: 02-§7.4 (the gateway fields are cached for 30 s; a new target drops the cache)
func TestHealthCachesGatewayFields(t *testing.T) {
	e := newEnv(t)
	for i := 0; i < 5; i++ {
		e.a.Health(context.Background())
	}
	if n := e.g.Count("GET /v1/gateway"); n != 1 {
		t.Fatal(n)
	}
	e.clk.Advance(GatewayCacheTTL - time.Second)
	e.a.Health(context.Background())
	if n := e.g.Count("GET /v1/gateway"); n != 1 {
		t.Fatal(n)
	}
	e.clk.Advance(time.Second)
	e.a.Health(context.Background())
	if n := e.g.Count("GET /v1/gateway"); n != 2 {
		t.Fatal(n)
	}
	e.g.AddImage("egress:new", fakeguard.ImageSpec{Labels: map[string]string{names.LabelSharedSchema: "1"}})
	if _, err := e.a.SetRuntimeImages(context.Background(), obj("egress", "egress:new")); err != nil {
		t.Fatal(err)
	}
	if n := e.g.Count("GET /v1/gateway"); n != 3 {
		t.Fatal(n)
	}
}

// covers: 02-§7.4 (CCG_XRAY_IMAGE pins the gateway target; egress_image still reports the egress target)
func TestPinnedGatewayImage(t *testing.T) {
	e := newEnv(t)
	e.cfg.XrayImage = "ccgateway-egress:test"
	e.open("app:test", "egress:test")
	h := e.a.Health(context.Background())
	if get(h, "egress_image") != "egress:test" || get(get(h, "egress_gateway").(pyjson.Ordered), "target_image") != "ccgateway-egress:test" {
		t.Fatal(js(h))
	}
}

// covers: I1 I2 I3 S4 R17 R18 (GET and PUT; the targets persist across a restart; the ID cache is dropped)
func TestGetAndPutPersistAcrossRestart(t *testing.T) {
	e := newEnv(t)
	if got := js(e.a.RuntimeImages(context.Background())); got != `{"app": "app:test", "egress": "egress:test", "controller": ""}` {
		t.Fatal(got)
	}
	e.g.AddPullable(app2, fakeguard.ImageSpec{ID: "sha256:" + strings.Repeat("b", 64)})
	inspects := 0
	inspect := func(ctx context.Context, ref string) (string, error) { inspects++; return "id-of-" + ref, nil }
	if id, _ := e.im.AppImageID(context.Background(), inspect); id != "id-of-app:test" {
		t.Fatal(id)
	}
	health, err := e.a.SetRuntimeImages(context.Background(), obj("app", app2))
	if err != nil {
		t.Fatal(err)
	}
	if get(health, "app_image") != app2 || get(health, "egress_image") != "egress:test" {
		t.Fatal(js(health))
	}
	if e.g.Count("POST /v1/images/pull") != 1 {
		t.Fatal(e.g.Routes())
	}
	if id, _ := e.im.AppImageID(context.Background(), inspect); id != "id-of-"+app2 || inspects != 2 {
		t.Fatal(id, inspects) // the target ID cache was dropped
	}
	if got := e.runtimeJSON(); got != `{"app": "`+app2+`", "egress": "egress:test", "env": {"app": "app:test", "egress": "egress:test"}}` {
		t.Fatal(got)
	}
	e.open("app:test", "egress:test")
	if e.targets() != app2+" egress:test" || e.runtimeJSON() == "" {
		t.Fatal(e.targets())
	}
}

// covers: S4 I3 (a reinstall that changed the environment discards the override)
func TestChangedEnvironmentDiscardsOverride(t *testing.T) {
	e := newEnv(t)
	e.g.AddPullable(app2, fakeguard.ImageSpec{})
	for _, envs := range [][2]string{{"app:new", "egress:test"}, {"app:test", "egress:new"}} {
		e.open("app:test", "egress:test")
		if _, err := e.a.SetRuntimeImages(context.Background(), obj("app", app2)); err != nil {
			t.Fatal(err)
		}
		e.open(envs[0], envs[1])
		if e.targets() != envs[0]+" "+envs[1] || e.runtimeJSON() != "" {
			t.Fatal(e.targets(), e.runtimeJSON())
		}
		e.open(envs[0], envs[1])
		if e.targets() != envs[0]+" "+envs[1] {
			t.Fatal(e.targets())
		}
	}
}

// covers: I2 (an empty PUT writes and pulls nothing)
func TestEmptyPutWritesNothing(t *testing.T) {
	e := newEnv(t)
	health, err := e.a.SetRuntimeImages(context.Background(), obj())
	if err != nil {
		t.Fatal(err)
	}
	if get(health, "app_image") != "app:test" || e.runtimeJSON() != "" || e.g.Count("POST /v1/images/pull") != 0 {
		t.Fatal(js(health), e.runtimeJSON())
	}
}

// covers: I2 V3 (both roles; a local image ID as a target, no pull)
func TestPutBothAndLocalImageID(t *testing.T) {
	e := newEnv(t)
	id := "sha256:" + strings.Repeat("c", 64)
	e.g.AddImage("local/egress:dev", fakeguard.ImageSpec{ID: id, Labels: map[string]string{names.LabelSharedSchema: "1"}})
	health, err := e.a.SetRuntimeImages(context.Background(), obj("app", "app:test", "egress", id))
	if err != nil {
		t.Fatal(err)
	}
	if get(health, "app_image") != "app:test" || get(health, "egress_image") != id || e.g.Count("POST /v1/images/pull") != 0 {
		t.Fatal(js(health))
	}
}

// covers: I2 R18 V3 V9 BUG-6 (rejections leave the targets unchanged and write nothing)
func TestRejectionsLeaveTargetsUnchanged(t *testing.T) {
	e := newEnv(t)
	for _, body := range []any{obj("app", "App:Bad"), obj("app", ""), obj("app", "x y"), obj("controller", ctl2),
		obj("app", 5), []any{}, "x", nil} {
		if _, err := e.a.SetRuntimeImages(context.Background(), body); answer(err) != `[400,"invalid_request"]` {
			t.Fatal(js(body), err)
		}
	}
	e.g.AddImage("app:proxy", fakeguard.ImageSpec{Env: []string{"HTTPS_PROXY=http://proxy"}})
	if _, err := e.a.SetRuntimeImages(context.Background(), obj("app", "app:proxy")); answer(err) != `[400,"invalid_image"]` {
		t.Fatal(err)
	}
	// The egress image runs the shared Xray gateway: an old sing-box image is refused.
	e.g.AddImage("ccgateway-egress:0.1.117", fakeguard.ImageSpec{})
	if _, err := e.a.SetRuntimeImages(context.Background(), obj("egress", "ccgateway-egress:0.1.117")); answer(err) != `[400,"invalid_image"]` {
		t.Fatal(err)
	}
	if _, err := e.a.SetRuntimeImages(context.Background(), obj("egress", "missing:tag")); answer(err) != `[503,"image_pull_failed"]` {
		t.Fatal(err)
	}
	// One bad role fails the whole request: the good one is not recorded either.
	if _, err := e.a.SetRuntimeImages(context.Background(), obj("app", app2, "egress", "egress:test")); answer(err) != `[503,"image_pull_failed"]` {
		t.Fatal(err)
	}
	if e.targets() != "app:test egress:test" || e.runtimeJSON() != "" {
		t.Fatal(e.targets(), e.runtimeJSON())
	}
}

// covers: S4 I3 (old-format, invalid or broken runtime.json files are discarded at start)
func TestOldFormatOrInvalidFilesAreDiscarded(t *testing.T) {
	e := newEnv(t)
	env := `{"app": "app:test", "egress": "egress:test"}`
	for _, content := range []string{`{"app": "` + app2 + `", "egress": "egress:new"}`,
		`{"app": "Bad Ref", "egress": "egress:new", "env": ` + env + `}`,
		`{"app": "` + app2 + `", "env": ` + env + `}`, `[1]`, `not json`} {
		if err := e.st.WriteAtomic(store.RuntimeFile, []byte(content)); err != nil {
			t.Fatal(err)
		}
		e.open("app:test", "egress:test")
		if e.targets() != "app:test egress:test" || e.runtimeJSON() != "" {
			t.Fatal(content, e.targets())
		}
	}
}

func controllerImage(g *fakeguard.Guard, ref string, labels ...string) {
	l := map[string]string{}
	for _, k := range labels {
		l[k] = "1"
	}
	g.AddImage(ref, fakeguard.ImageSpec{Labels: l})
}

// covers: C1 R19 02-§7.5 (the upgrade is handed to the guard with only the image)
func TestUpgradeIsHandedToTheGuard(t *testing.T) {
	e := newEnv(t)
	e.g.AddPullable(ctl2, fakeguard.ImageSpec{Labels: map[string]string{names.LabelSharedSchema: "1", names.LabelGuardAPI: "1"}})
	e.h.bindings = true
	if err := e.a.UpgradeController(context.Background(), obj("image", ctl2)); err != nil {
		t.Fatal(err)
	}
	calls := e.g.CallsTo("POST /v1/controller/upgrade")
	if len(calls) != 1 || string(calls[0].Body) != `{"image":"`+ctl2+`"}` || e.g.UpgradeRequested().Image != ctl2 {
		t.Fatal(calls)
	}
	if e.g.Count("POST /v1/images/pull") != 1 {
		t.Fatal(e.g.Routes())
	}
}

// covers: C2 02-§7.5 (downgrade check and the guard-api label)
func TestUpgradeChecksLabels(t *testing.T) {
	e := newEnv(t)
	controllerImage(e.g, "ccgateway-controller:0.1.118") // Python: neither label
	controllerImage(e.g, "ccgateway-controller:guardonly", names.LabelGuardAPI)
	controllerImage(e.g, "ccgateway-controller:shared", names.LabelSharedSchema)
	e.h.bindings = true
	if err := e.a.UpgradeController(context.Background(), obj("image", "ccgateway-controller:0.1.118")); answer(err) != `[400,"invalid_request"]` {
		t.Fatal(err)
	}
	if err := e.a.UpgradeController(context.Background(), obj("image", "ccgateway-controller:guardonly")); answer(err) != `[400,"invalid_request"]` {
		t.Fatal(err)
	}
	if err := e.a.UpgradeController(context.Background(), obj("image", "ccgateway-controller:shared")); answer(err) != `[400,"invalid_image"]` {
		t.Fatal(err)
	}
	e.h.bindings = false
	if err := e.a.UpgradeController(context.Background(), obj("image", "ccgateway-controller:0.1.118")); answer(err) != `[400,"invalid_image"]` {
		t.Fatal(err)
	}
	// Without bindings the shared label is the guard's check: its 403 is invalid_image.
	if err := e.a.UpgradeController(context.Background(), obj("image", "ccgateway-controller:guardonly")); answer(err) != `[400,"invalid_image"]` {
		t.Fatal(err)
	}
	if n := e.g.Count("POST /v1/controller/upgrade"); n != 1 {
		t.Fatal(n)
	}
}

// covers: C1 R19 (an upgrade or recreation in progress is 409 upgrade_in_progress)
func TestUpgradeInProgressConflicts(t *testing.T) {
	e := newEnv(t)
	controllerImage(e.g, ctl2, names.LabelSharedSchema, names.LabelGuardAPI)
	e.g.SetUpgradeState("running")
	if err := e.a.UpgradeController(context.Background(), obj("image", ctl2)); answer(err) != `[409,"upgrade_in_progress"]` {
		t.Fatal(err)
	}
	e.g.SetUpgradeState("done")
	if err := e.a.UpgradeController(context.Background(), obj("image", ctl2)); err != nil {
		t.Fatal(err)
	}
}

// covers: C1 R19 V3 (invalid requests and an image that cannot be pulled)
func TestUpgradeRejections(t *testing.T) {
	e := newEnv(t)
	for _, body := range []any{obj("image", "Bad"), obj("image", ctl2, "x", 1), obj(), obj("image", nil), nil, []any{}} {
		if err := e.a.UpgradeController(context.Background(), body); answer(err) != `[400,"invalid_request"]` {
			t.Fatal(js(body), err)
		}
	}
	if err := e.a.UpgradeController(context.Background(), obj("image", "missing:tag")); answer(err) != `[503,"image_pull_failed"]` {
		t.Fatal(err)
	}
	if e.g.Count("POST /v1/controller/upgrade") != 0 {
		t.Fatal(e.g.Routes())
	}
}

// covers: 02-§7.4 02-§7.3 (recreate: the target under the shared lock, everything offline, recover kicked)
func TestRecreateEgress(t *testing.T) {
	e := newEnv(t)
	e.g.SetGatewayImage("egress:test")
	e.g.AddGateway(guardapi.ManagedByCompose)
	before := e.g.Inspect("ccg-shared-egress")
	e.g.AddImage(egr2, fakeguard.ImageSpec{Labels: map[string]string{names.LabelSharedSchema: "1"}})
	if _, err := e.a.SetRuntimeImages(context.Background(), obj("egress", egr2)); err != nil {
		t.Fatal(err)
	}
	e.a.Health(context.Background()) // cached: update available
	res, err := e.a.RecreateEgress(context.Background(), obj())
	if err != nil {
		t.Fatal(err)
	}
	if js(res) != `{"recreated": true, "image": "`+egr2+`"}` {
		t.Fatal(js(res))
	}
	after := e.g.Inspect("ccg-shared-egress")
	if get(after, "Id") == get(before, "Id") || get(after, "Image") != e.g.ImageID(egr2) {
		t.Fatal(js(after))
	}
	if strings.Join(e.h.events, ",") != "recreated in-op=yes" || e.h.ops != 1 {
		t.Fatal(e.h.events)
	}
	gw := get(e.a.Health(context.Background()), "egress_gateway").(pyjson.Ordered)
	if get(gw, "update_available") != false || get(gw, "image_id") != e.g.ImageID(egr2) {
		t.Fatal(js(gw))
	}
}

// covers: 02-§7.4 D4 (recreate refusals: body, label, legacy gateway, an upgrade in progress)
func TestRecreateEgressRefusals(t *testing.T) {
	e := newEnv(t)
	for _, body := range []any{obj("image", egr2), nil, []any{}, "x"} {
		if _, err := e.a.RecreateEgress(context.Background(), body); answer(err) != `[400,"invalid_request"]` {
			t.Fatal(js(body), err)
		}
	}
	e.g.SetGatewayImage("egress:test")
	e.g.AddGateway(guardapi.ManagedByLegacy)
	if _, err := e.a.RecreateEgress(context.Background(), obj()); answer(err) != `[503,"runtime_unavailable"]` ||
		guardapi.ReasonOf(err) != guardapi.ReasonGatewayNotCompose {
		t.Fatal(err)
	}
	e.cfg.XrayImage = "ccgateway-egress:plain"
	e.open("app:test", "egress:test")
	e.g.AddImage("ccgateway-egress:plain", fakeguard.ImageSpec{})
	if _, err := e.a.RecreateEgress(context.Background(), obj()); answer(err) != `[400,"invalid_image"]` {
		t.Fatal(err)
	}
	e.cfg.XrayImage = ""
	e.open("app:test", "egress:test")
	e.g.AddGateway(guardapi.ManagedByCompose)
	e.g.SetUpgradeState("running")
	if _, err := e.a.RecreateEgress(context.Background(), obj()); answer(err) != `[409,"upgrade_in_progress"]` {
		t.Fatal(err)
	}
	if e.h.recreated != 0 || e.g.Count("POST /v1/gateway/recreate") != 2 {
		t.Fatal(e.h.recreated, e.g.Routes())
	}
}

// covers: 02-§7.3 (a guard failure after compose ran still takes the runtimes offline)
func TestRecreateFailureAfterComposeStillRecovers(t *testing.T) {
	e := newEnv(t)
	e.g.Fail("POST /v1/gateway/recreate", fakeguard.Fault{Status: 502, Code: "docker_error", Reason: "compose_failed"})
	_, err := e.a.RecreateEgress(context.Background(), obj())
	if answer(err) != `[503,"runtime_unavailable"]` || e.h.recreated != 1 {
		t.Fatal(err, e.h.recreated)
	}
}

// covers: K6 (target updates are serialised; upgrade and recreate share one lock)
func TestAdminLocksSerialise(t *testing.T) {
	e := newEnv(t)
	e.a.upgradeMu.Lock()
	done := make(chan error, 1)
	go func() {
		_, err := e.a.RecreateEgress(context.Background(), obj())
		done <- err
	}()
	select {
	case <-done:
		t.Fatal("recreate ran during an upgrade")
	case <-time.After(50 * time.Millisecond):
	}
	e.a.upgradeMu.Unlock()
	<-done
	e.a.runtimeMu.Lock()
	go func() {
		_, err := e.a.SetRuntimeImages(context.Background(), obj("app", "app:test"))
		done <- err
	}()
	select {
	case <-done:
		t.Fatal("PUT ran under the runtime lock")
	case <-time.After(50 * time.Millisecond):
	}
	e.a.runtimeMu.Unlock()
	if err := <-done; err != nil {
		t.Fatal(err)
	}
}
