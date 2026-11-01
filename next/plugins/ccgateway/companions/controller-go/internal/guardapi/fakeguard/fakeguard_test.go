package fakeguard_test

import (
	"archive/tar"
	"bytes"
	"context"
	"encoding/base64"
	"errors"
	"io"
	"net/http"
	"strings"
	"testing"

	"ccgateway/controller/internal/errs"
	"ccgateway/controller/internal/guardapi"
	"ccgateway/controller/internal/guardapi/fakeguard"
	"ccgateway/controller/internal/names"
)

var ctx = context.Background()

const subnet = "10.20.30.0/24"

func ready(t *testing.T) (*fakeguard.Guard, *guardapi.HTTPClient) {
	t.Helper()
	g := fakeguard.New()
	g.AddImage("app:1", fakeguard.ImageSpec{Files: map[string][]byte{"/usr/local/bin/worker": []byte("\x7fELF")}})
	c := g.Client()
	if _, err := c.CreateNetwork(ctx, "21", guardapi.NetworkRequest{Subnet: subnet, Gateway: "10.20.30.1", PolicyLabel: `{"allocation": "random", "pool": "10.0.0.0/8"}`}); err != nil {
		t.Fatal(err)
	}
	if _, err := c.EnsureVolume(ctx, "21", guardapi.VolumeRequest{SizeBytes: 10 << 30}); err != nil {
		t.Fatal(err)
	}
	if err := c.WriteResolv(ctx, "21", "10.20.30.5"); err != nil {
		t.Fatal(err)
	}
	return g, c
}

func appReq() guardapi.AppRequest {
	return guardapi.AppRequest{Image: "app:1", IPv4: "10.20.30.4", Env: map[string]string{"CCG_API_KEY": "k", "B": "2"},
		AuthLabel: strings.Repeat("a", 64), ImageLabel: "sha256:" + strings.Repeat("b", 64)}
}

// covers: PV14 PV15 PV17 O3 A7 R21 R2 (the account lifecycle through the guard API)
func TestAccountLifecycle(t *testing.T) {
	g, c := ready(t)
	app, err := c.CreateApp(ctx, "21", appReq())
	if err != nil {
		t.Fatal(err)
	}
	if app.Status != "created" || app.Labels[names.LabelAccount] != "21" || app.User != "1000:1000" || app.IP("ccg-21-net") != "10.20.30.4" ||
		strings.Join(app.Env, ",") != "B=2,CCG_API_KEY=k" || app.Labels[names.LabelAuth] != strings.Repeat("a", 64) {
		t.Fatalf("%+v", app)
	}
	if _, err := c.CreateApp(ctx, "21", appReq()); guardapi.ReasonOf(err) != "" || !isStatus(err, 400) {
		t.Fatal("the guard checks the address before the container: the same address again is 400:", err)
	}
	again := appReq()
	again.IPv4 = "10.20.30.6"
	if _, err := c.CreateApp(ctx, "21", again); !errors.Is(err, guardapi.ErrExists) {
		t.Fatal("R21: a second create is exists:", err)
	}
	if err := c.AppAction(ctx, "21", guardapi.ActionStart, nil); err != nil {
		t.Fatal(err)
	}
	st, err := c.AccountState(ctx, "21")
	if err != nil || st.App == nil || st.App.Status != "running" || st.App.IP != "10.20.30.4" || st.Gateway != nil {
		t.Fatalf("%+v %v", st, err)
	}
	g.AddGateway(guardapi.ManagedByCompose)
	if err := c.ConnectGateway(ctx, "21", "10.20.30.2"); err != nil {
		t.Fatal(err)
	}
	if err := c.ConnectGateway(ctx, "21", "10.20.30.2"); err != nil {
		t.Fatal("the same address again is fine")
	}
	if err := c.ConnectGateway(ctx, "21", "10.20.30.3"); !errors.Is(err, guardapi.ErrExists) {
		t.Fatal("another address:", err)
	}
	st, _ = c.AccountState(ctx, "21")
	if st.Gateway == nil || st.Gateway.IP != "10.20.30.2" || st.Gateway.Status != "running" {
		t.Fatalf("%+v", st.Gateway)
	}
	rules := "table inet ccg_app {}\n"
	if err := c.InstallFirewall(ctx, "21", rules, "10.20.30.2"); err != nil {
		t.Fatal(err)
	}
	fw, _ := g.Firewall("21")
	gw, _ := c.Gateway(ctx)
	if fw.Rules != rules || fw.HelperImage != gw.Container.Image || fw.AppID != app.ID || gw.ManagedBy != "compose" {
		t.Fatalf("R12: helper image is the running gateway's: %+v", fw)
	}
	acct, err := c.Account(ctx, "21")
	if err != nil || acct.App == nil || acct.Network == nil || acct.Volume == nil || !acct.GatewayAttached ||
		len(acct.VolumeUsers) != 1 || len(acct.NetworkForeign) != 0 {
		t.Fatalf("%+v %v", acct, err)
	}
	if resolv, _ := g.Resolv("21"); resolv != "nameserver 10.20.30.5\noptions timeout:2 attempts:2\n" {
		t.Fatal(resolv)
	}
	before := st.App.StartedAt
	if err := c.AppAction(ctx, "21", guardapi.ActionRestart, nil); err != nil {
		t.Fatal(err)
	}
	if st, _ := c.AccountState(ctx, "21"); st.App.StartedAt == before {
		t.Fatal("a restart changes StartedAt")
	}
	timeout := 10
	if err := c.AppAction(ctx, "21", guardapi.ActionStop, &timeout); err != nil {
		t.Fatal(err)
	}
	if _, err := c.AppExec(ctx, "21", []string{"true"}, ""); !errors.Is(err, guardapi.ErrNotRunning) {
		t.Fatal("exec in a stopped container:", err)
	}
	// deletion order: the network and the volume are in use until the container goes
	if err := c.DeleteVolume(ctx, "21"); !errs.Is(err, errs.ResourceInUse) {
		t.Fatal(err)
	}
	if err := c.DeleteContainer(ctx, "21", "app"); err != nil {
		t.Fatal(err)
	}
	if err := c.DeleteContainer(ctx, "21", "app"); !guardapi.IsNotFound(err) {
		t.Fatal("R18:", err)
	}
	if err := c.DeleteNetwork(ctx, "21", "net"); err != nil {
		t.Fatal("the gateway is detached by the guard:", err)
	}
	if err := c.DeleteVolume(ctx, "21"); err != nil {
		t.Fatal(err)
	}
	if err := c.DisconnectGateway(ctx, "21"); err != nil {
		t.Fatal("disconnect of a missing network is 204")
	}
	routes := strings.Join(g.Routes(), "\n")
	for _, r := range []string{"PUT /v1/accounts/{aid}/network", "PUT /v1/accounts/{aid}/app", "POST /v1/accounts/{aid}/app/{action}",
		"GET /v1/accounts/{aid}?fields=state", "PUT /v1/gateway/networks/{aid}", "DELETE /v1/accounts/{aid}/volume"} {
		if !strings.Contains(routes, r) {
			t.Errorf("call %s not recorded", r)
		}
	}
}

// covers: 03-§3.3 03-§4 (the guard's policy rules: the fake rejects what the guard rejects)
func TestPolicyRejections(t *testing.T) {
	g, c := ready(t)
	bad := func(name string, err error, status int) {
		t.Helper()
		e, ok := guardapi.AsError(err)
		if !ok || e.Status != status {
			t.Errorf("%s: %v, want %d", name, err, status)
		}
	}
	netReq := func(sub, gw string) guardapi.NetworkRequest {
		return guardapi.NetworkRequest{Subnet: sub, Gateway: gw, PolicyLabel: "{}"}
	}
	_, err := c.CreateNetwork(ctx, "22", netReq("8.8.8.0/24", "8.8.8.1"))
	bad("public subnet", err, 400)
	_, err = c.CreateNetwork(ctx, "22", netReq("10.0.0.0/16", "10.0.0.1"))
	bad("prefix shorter than /24", err, 400)
	_, err = c.CreateNetwork(ctx, "22", netReq("10.21.0.0/24", "10.21.0.2"))
	bad("gateway not .1", err, 400)
	_, err = c.CreateNetwork(ctx, "22", netReq("10.20.30.0/25", "10.20.30.1"))
	if !errors.Is(err, guardapi.ErrSubnetOverlap) {
		t.Errorf("overlap: %v", err)
	}
	_, err = c.CreateNetwork(ctx, "22", guardapi.NetworkRequest{Subnet: "10.21.0.0/24", Gateway: "10.21.0.1", PolicyLabel: "[]"})
	bad("label not an object", err, 400)
	_, err = c.CreateNetwork(ctx, names.UplinkKey, netReq("10.21.0.0/24", "10.21.0.1"))
	bad("uplink through the account endpoint", err, 403)
	g.AddNetwork("ccg-23-net", "10.23.0.0/24", true, map[string]string{names.LabelAccount: "99"})
	_, err = c.CreateNetwork(ctx, "23", netReq("10.24.0.0/24", "10.24.0.1"))
	if !errs.Is(err, errs.OwnershipMismatch) {
		t.Errorf("someone else's network: %v", err)
	}
	if _, err := c.Account(ctx, "23"); !errs.Is(err, errs.OwnershipMismatch) {
		t.Errorf("account query reports a mismatch at once: %v", err)
	}
	for name, mutate := range map[string]func(*guardapi.AppRequest){
		"ip outside":        func(r *guardapi.AppRequest) { r.IPv4 = "10.9.9.9" },
		"ip .1":             func(r *guardapi.AppRequest) { r.IPv4 = "10.20.30.1" },
		"ip broadcast":      func(r *guardapi.AppRequest) { r.IPv4 = "10.20.30.255" },
		"ip leading zero":   func(r *guardapi.AppRequest) { r.IPv4 = "10.20.30.04" },
		"env name":          func(r *guardapi.AppRequest) { r.Env = map[string]string{"BAD\nNAME": "x"} },
		"env NUL":           func(r *guardapi.AppRequest) { r.Env = map[string]string{"A": "x\x00"} },
		"env too large":     func(r *guardapi.AppRequest) { r.Env = map[string]string{"A": strings.Repeat("x", 70<<10)} },
		"auth label":        func(r *guardapi.AppRequest) { r.AuthLabel = "é" },
		"image label":       func(r *guardapi.AppRequest) { r.ImageLabel = "app:1" },
		"memory":            func(r *guardapi.AppRequest) { r.MemoryBytes = 1 << 20 },
		"cpus":              func(r *guardapi.AppRequest) { r.NanoCPUs = 9e9 },
		"image ref invalid": func(r *guardapi.AppRequest) { r.Image = "App!" },
	} {
		req := appReq()
		mutate(&req)
		_, err := c.CreateApp(ctx, "21", req)
		bad(name, err, 400)
	}
	many := map[string]string{}
	for i := 0; i < 129; i++ {
		many["V"+strings.Repeat("x", i)] = "1"
	}
	req := appReq()
	req.Env = many
	_, err = c.CreateApp(ctx, "21", req)
	bad("129 variables", err, 400)
	req = appReq()
	req.Image = "missing:1"
	if _, err := c.CreateApp(ctx, "21", req); !guardapi.IsNotFound(err) {
		t.Errorf("image must be local: %v", err)
	}
	if _, err := c.CreateApp(ctx, "24", appReq()); !guardapi.IsNotFound(err) {
		t.Errorf("no network: %v", err)
	}
	// jobs: capability whitelist and volume rules
	job := guardapi.Job{Image: "app:1", Entrypoint: []string{"sh", "-ec"}, Argv: []string{"x"}, User: "0", Volume: "rw",
		Caps: []string{"CHOWN", "DAC_OVERRIDE"}}
	if _, err := c.RunJob(ctx, "21", job); err != nil {
		t.Fatal(err)
	}
	for name, mutate := range map[string]func(*guardapi.Job){
		"NET_ADMIN":       func(j *guardapi.Job) { j.Caps = []string{"NET_ADMIN"} },
		"FOWNER (D5)":     func(j *guardapi.Job) { j.Caps = []string{"FOWNER"} },
		"duplicate cap":   func(j *guardapi.Job) { j.Caps = []string{"CHOWN", "CHOWN"} },
		"caps without rw": func(j *guardapi.Job) { j.Volume = "ro" },
	} {
		j := job
		mutate(&j)
		_, err := c.RunJob(ctx, "21", j)
		bad(name, err, 400)
	}
	for name, mutate := range map[string]func(*guardapi.Job){
		"user":       func(j *guardapi.Job) { j.User = "1000" },
		"volume":     func(j *guardapi.Job) { j.Volume = "host" },
		"entrypoint": func(j *guardapi.Job) { j.Entrypoint = nil },
		"memory":     func(j *guardapi.Job) { j.MemoryBytes = 3 << 30 },
	} {
		j := job
		mutate(&j)
		_, err := c.RunJob(ctx, "21", j)
		bad(name, err, 400)
	}
	err = c.WriteGatewayFile(ctx, "state.json", []byte("{}"))
	bad("gateway file whitelist", err, 400)
	err = c.WriteResolv(ctx, "21", "10.9.9.9")
	bad("resolv outside the subnet", err, 400)
	_, err = c.AppExec(ctx, "21", []string{"x"}, "root")
	bad("exec user", err, 400)
	err = c.DeleteContainer(ctx, "21", "../x")
	if e, ok := guardapi.AsError(err); !ok || (e.Status != 400 && e.Status != 404) {
		t.Errorf("suffix traversal: %v", err)
	}
	if _, err := c.Account(ctx, "../21"); err == nil {
		t.Error("bad aid accepted")
	}
	if _, err := c.ImageInspect(ctx, "Bad Ref"); err == nil {
		t.Error("bad image ref accepted")
	}
	if len(g.Jobs()) != 1 {
		t.Fatal("refused jobs must not run")
	}
}

// covers: 03-§3.2 (token check; unknown routes; methods)
func TestAuthAndRouting(t *testing.T) {
	g := fakeguard.New()
	wrong, _ := guardapi.New("http://172.29.255.1:8790", strings.Repeat("0", 64), guardapi.WithTransport(g.Transport()))
	if _, err := wrong.Health(ctx); !errors.Is(err, guardapi.ErrUnauthorized) {
		t.Fatal(err)
	}
	rec := httpDo(t, g, "PATCH", "/v1/health")
	if rec.StatusCode != 405 {
		t.Fatal(rec.StatusCode)
	}
	if rec := httpDo(t, g, "GET", "/v1/nope"); rec.StatusCode != 404 {
		t.Fatal(rec.StatusCode)
	}
	h, err := g.Client().Health(ctx)
	if err != nil || len(h.Missing(guardapi.RequiredFeatures)) != 0 || h.Prefix != "ccg" {
		t.Fatal(h, err)
	}
	g.SetHealth(guardapi.Health{Features: []string{"jobs-v1"}})
	h, _ = g.Client().Health(ctx)
	if len(h.Missing(guardapi.RequiredFeatures)) != 4 {
		t.Fatal(h.Missing(guardapi.RequiredFeatures))
	}
}

func httpDo(t *testing.T, g *fakeguard.Guard, method, path string) *http.Response {
	req, _ := http.NewRequest(method, "http://172.29.255.1:8790"+path, nil)
	req.Header.Set("Authorization", "Bearer "+fakeguard.Token)
	resp, err := g.Transport().RoundTrip(req)
	if err != nil {
		t.Fatal(err)
	}
	return resp
}

// covers: 02-§8.2 IT-X09 (fault injection: Nth call, transport failure, per account)
func TestFaults(t *testing.T) {
	g, c := ready(t)
	g.Fail("GET /v1/accounts/{aid}?fields=state", fakeguard.Fault{Nth: 2, Status: 503, Code: "busy", Reason: "lock_timeout"})
	if _, err := c.AccountState(ctx, "21"); err != nil {
		t.Fatal("first call passes")
	}
	if _, err := c.AccountState(ctx, "21"); !errs.Is(err, errs.RuntimeBusy) {
		t.Fatal("second call fails:", err)
	}
	if _, err := c.AccountState(ctx, "21"); err != nil {
		t.Fatal("third call passes")
	}
	g.Fail("*", fakeguard.Fault{Times: 2})
	if _, err := c.Subnets(ctx); !errors.Is(err, guardapi.ErrUnavailable) {
		t.Fatal("transport fault:", err)
	}
	if _, err := c.Health(ctx); !errors.Is(err, guardapi.ErrUnavailable) {
		t.Fatal("second transport fault:", err)
	}
	if _, err := c.Health(ctx); err != nil {
		t.Fatal("faults end")
	}
	g.ClearFaults()
	g.Fail("POST /v1/accounts/{aid}/app/exec", fakeguard.Fault{AID: "22", Status: 409, Code: "conflict", Reason: "not_running"})
	c.CreateApp(ctx, "21", appReq())
	c.AppAction(ctx, "21", "start", nil)
	if _, err := c.AppExec(ctx, "21", []string{"true"}, ""); err != nil {
		t.Fatal("other accounts are unaffected:", err)
	}
	if g.Count("POST /v1/accounts/{aid}/app/exec") != 1 {
		t.Fatal(g.Count("POST /v1/accounts/{aid}/app/exec"))
	}
	g.ResetCalls()
	if len(g.Calls()) != 0 {
		t.Fatal("reset")
	}
}

// covers: G2 G3 G14 G15 02-§7.2 02-§7.3 (gateway ensure, Xray emulation, recreation)
func TestGatewayLifecycle(t *testing.T) {
	g, c := ready(t)
	if gw, err := c.Gateway(ctx); err != nil || gw.Container != nil {
		t.Fatal("no gateway yet", err)
	}
	if _, err := c.EnsureGateway(ctx, nil); !errors.Is(err, guardapi.ErrUplinkMissing) {
		t.Fatal(err)
	}
	if err := c.WriteGatewayFile(ctx, "boot.json", []byte("{}")); err != nil {
		t.Fatal("files before the gateway exists (R13)")
	}
	res, err := c.EnsureGateway(ctx, &guardapi.UplinkRequest{Subnet: "10.250.1.0/24", Gateway: "10.250.1.1", PolicyLabel: "{}"})
	if err != nil || res.Action != "created" || !res.Gateway.Running() || res.Gateway.Labels[names.LabelSharedOwner] != "ccg" {
		t.Fatal(res, err)
	}
	if res, _ := c.EnsureGateway(ctx, nil); res.Action != "none" {
		t.Fatal("running gateway: none")
	}
	g.SetXrayReadyAfter(2)
	for i := 0; i < 2; i++ {
		if r, _ := c.GatewayExec(ctx, []string{"xray", "api", "lso", "--server=127.0.0.1:10085"}); r.ExitCode == 0 {
			t.Fatal("Xray not ready yet")
		}
	}
	c.WriteGatewayFile(ctx, "operation.json", []byte(`{"outbounds": [{"tag": "proxy-1", "protocol": "freedom"}]}`))
	if r, _ := c.GatewayExec(ctx, []string{"xray", "api", "ado", "--server=127.0.0.1:10085", "/config/operation.json"}); r.ExitCode != 0 {
		t.Fatal("ado")
	}
	if r, _ := c.GatewayExec(ctx, []string{"xray", "api", "ado", "--server=127.0.0.1:10085", "/config/operation.json"}); r.ExitCode == 0 {
		t.Fatal("a duplicate tag fails")
	}
	r, _ := c.GatewayExec(ctx, []string{"xray", "api", "lso", "--server=127.0.0.1:10085"})
	if !strings.Contains(string(r.Output), "proxy-1") {
		t.Fatal(string(r.Output))
	}
	c.CreateApp(ctx, "21", appReq())
	c.ConnectGateway(ctx, "21", "10.20.30.2")
	r, _ = c.GatewayExec(ctx, []string{"ip", "-j", "-4", "addr"})
	if !strings.Contains(string(r.Output), `"local": "10.20.30.2"`) || !strings.Contains(string(r.Output), `"ifname": "eth1"`) {
		t.Fatal(string(r.Output))
	}
	c.WriteGatewayFile(ctx, "active.nft", []byte("table x"))
	c.GatewayExec(ctx, []string{"sh", "-ec", "{ if nft list table inet ccg_shared >/dev/null 2>&1; then echo x; fi; cat /config/active.nft; } | nft -f -"})
	if g.AppliedNFT() != "table x" {
		t.Fatal("nft applied")
	}
	old, _ := c.Gateway(ctx)
	g.RecreateGatewayNow()
	now, _ := c.Gateway(ctx)
	if now.Container.ID == old.Container.ID || now.Container.IP("ccg-21-net") != "" {
		t.Fatal("recreation: new ID, account networks lost")
	}
	if out, _, _ := g.Xray(); len(out) != 0 {
		t.Fatal("Xray state lost")
	}
	g.AddImage("egress:2", fakeguard.ImageSpec{Labels: map[string]string{names.LabelSharedSchema: "1"}})
	g.AddImage("plain:1", fakeguard.ImageSpec{})
	if _, err := c.RecreateGateway(ctx, "plain:1"); err == nil {
		t.Fatal("image_not_gateway")
	}
	gw, err := c.RecreateGateway(ctx, "egress:2")
	if err != nil || gw.ConfigImage != "egress:2" {
		t.Fatal(gw, err)
	}
	g.SetUpgradeState("running")
	if _, err := c.RecreateGateway(ctx, "egress:2"); !errs.Is(err, errs.UpgradeInProgress) {
		t.Fatal(err)
	}
	g.SetUpgradeState("idle")
	g.StopContainer("ccg-shared-egress")
	if _, err := c.GatewayExec(ctx, []string{"true"}); !errors.Is(err, guardapi.ErrNotRunning) {
		t.Fatal(err)
	}
	if res, _ := c.EnsureGateway(ctx, nil); res.Action != "started" {
		t.Fatal("a stopped gateway is started")
	}
	g2 := fakeguard.New()
	g2.AddGateway(guardapi.ManagedByLegacy)
	if _, err := g2.Client().RecreateGateway(ctx, "ccgateway-egress:test"); guardapi.ReasonOf(err) != "gateway_not_compose" {
		t.Fatal("D4: a docker-py gateway is never recreated:", err)
	}
}

// covers: U4 U5 R16 C1 R19 (images: pull whitelist, load, controller upgrade labels)
func TestImagesAndUpgrade(t *testing.T) {
	g := fakeguard.New()
	c := g.Client()
	g.AddPullable("ccgateway-app:2", fakeguard.ImageSpec{Env: []string{"PATH=/bin"}})
	if _, err := c.ImageInspect(ctx, "ccgateway-app:2"); !guardapi.IsNotFound(err) {
		t.Fatal("not local yet")
	}
	if err := c.ImagePull(ctx, "ccgateway-app:2"); err != nil {
		t.Fatal(err)
	}
	img, err := c.ImageInspect(ctx, "ccgateway-app:2")
	if err != nil || img.Config.Env[0] != "PATH=/bin" || img.RepoTags[0] != "ccgateway-app:2" {
		t.Fatal(img, err)
	}
	g.SetPullRepos("ccgateway-app")
	g.AddPullable("caddy:latest", fakeguard.ImageSpec{})
	if err := c.ImagePull(ctx, "caddy:latest"); !errs.Is(err, errs.ImagePullFailed) {
		t.Fatal("IT-S08:", err)
	}
	if err := c.ImagePull(ctx, "missing:1"); !errs.Is(err, errs.ImagePullFailed) {
		t.Fatal(err)
	}
	g.SetLoadRepos("ccgateway-*")
	archive := saveArchive(t, "ccgateway-app:9")
	id := "sha256:" + strings.Repeat("1", 64)
	g.OnLoad(func(data []byte) ([]guardapi.LoadedImage, error) {
		if !bytes.Equal(data, archive) {
			t.Error("the hook gets the archive")
		}
		return []guardapi.LoadedImage{{ID: id, Tags: []string{"ccgateway-app:9"}}}, nil
	})
	got, err := c.ImageLoad(ctx, bytes.NewReader(archive), int64(len(archive)))
	if err != nil || len(got) != 1 || got[0].ID != id || got[0].Tags[0] != "ccgateway-app:9" || g.ImageID("ccgateway-app:9") != id {
		t.Fatal(got, err)
	}
	if _, err := c.ImageLoad(ctx, strings.NewReader("x:1"), 3); guardapi.ReasonOf(err) != "load_forbidden" {
		t.Fatal("not an image archive:", err)
	}
	foreign := saveArchive(t, "caddy:latest")
	if _, err := c.ImageLoad(ctx, bytes.NewReader(foreign), int64(len(foreign))); !errors.Is(err, guardapi.ErrLoadForbidden) {
		t.Fatal("R9: a name outside the load whitelist:", err)
	}
	g.OnLoad(func([]byte) ([]guardapi.LoadedImage, error) {
		return []guardapi.LoadedImage{{ID: id, Tags: []string{"ccgateway-other:1"}}}, nil
	})
	if _, err := c.ImageLoad(ctx, bytes.NewReader(archive), int64(len(archive))); guardapi.ReasonOf(err) != "load_failed" {
		t.Fatal("a loaded name the archive does not give:", err)
	}
	g.AddImage("ctl:py", fakeguard.ImageSpec{Labels: map[string]string{names.LabelSharedSchema: "1"}})
	g.AddImage("ctl:go", fakeguard.ImageSpec{Labels: map[string]string{names.LabelSharedSchema: "1", names.LabelGuardAPI: "1"}})
	if err := c.UpgradeController(ctx, "ctl:py"); !errs.Is(err, errs.InvalidImage) {
		t.Fatal(err)
	}
	if err := c.UpgradeController(ctx, "ctl:go"); err != nil {
		t.Fatal(err)
	}
	if s, _ := c.UpgradeStatus(ctx); s.Image != "ctl:go" {
		t.Fatal(s)
	}
	g.SetUpgradeState("running")
	if err := c.UpgradeController(ctx, "ctl:go"); !errs.Is(err, errs.UpgradeInProgress) {
		t.Fatal(err)
	}
}

// covers: PV9 PV10 (volumes: quota, fallback, existing volume kept)
func TestVolumes(t *testing.T) {
	g := fakeguard.New()
	c := g.Client()
	r, err := c.EnsureVolume(ctx, "21", guardapi.VolumeRequest{SizeBytes: 10 << 30})
	if err != nil || !r.Created || r.QuotaSupported == nil || !*r.QuotaSupported || r.Volume.Options["size"] != "10737418240" ||
		r.Volume.Labels[names.LabelDiskQuota] != "10737418240" {
		t.Fatal(r, err)
	}
	r, _ = c.EnsureVolume(ctx, "21", guardapi.VolumeRequest{SizeBytes: 20 << 30})
	if r.Created || r.QuotaSupported != nil || r.Volume.Options["size"] != "10737418240" {
		t.Fatal("an existing volume is returned as is")
	}
	g.SetQuotaSupported(false)
	if _, err := c.EnsureVolume(ctx, "22", guardapi.VolumeRequest{SizeBytes: 10 << 30}); !errs.Is(err, errs.DiskQuotaUnavailable) {
		t.Fatal(err)
	}
	r, err = c.EnsureVolume(ctx, "22", guardapi.VolumeRequest{SizeBytes: 10 << 30, AllowUnbounded: true})
	if err != nil || *r.QuotaSupported || len(r.Volume.Options) != 0 || r.Volume.Labels[names.LabelDiskQuota] != "" {
		t.Fatal(r, err)
	}
	if _, err := c.EnsureVolume(ctx, "23", guardapi.VolumeRequest{SizeBytes: 1}); err == nil {
		t.Fatal("size range")
	}
	var job guardapi.Job
	g.OnJob(func(aid string, j guardapi.Job) (int, []byte) { job = j; return 42, []byte("out") })
	res, err := c.RunJob(ctx, "21", guardapi.Job{Image: "ccgateway-egress:test", Entrypoint: []string{"node"}, Argv: []string{"-e", "x"},
		User: "1000:1000", Volume: "ro"})
	if err != nil || res.ExitCode != 42 || string(res.Stdout) != "out" || job.User != "1000:1000" || len(job.Caps) != 0 {
		t.Fatal(res, err)
	}
	if _, err := c.RunJob(ctx, "24", guardapi.Job{Image: "ccgateway-egress:test", Entrypoint: []string{"node"}, User: "0", Volume: "ro"}); !guardapi.IsNotFound(err) {
		t.Fatal("job on a missing volume:", err)
	}
}

// covers: X1 R19 R15 D4 (inventory, others, legacy helpers, foreign users)
func TestInventoryAndForeignUsers(t *testing.T) {
	g, c := ready(t)
	c.CreateApp(ctx, "21", appReq())
	g.AddImage("x:1", fakeguard.ImageSpec{})
	g.AddContainer(fakeguard.ContainerSpec{Name: "ccg-21-app-rollback-1", Image: "x:1", Labels: map[string]string{names.LabelAccount: "21"}, Status: "exited"})
	g.AddContainer(fakeguard.ContainerSpec{Name: "ccg-oneshot-0011223344556677", Image: "x:1", Status: "exited",
		Volumes: map[string]string{"ccg-21-data": "/work"}})
	g.AddContainer(fakeguard.ContainerSpec{Name: "intruder", Image: "x:1", Networks: map[string]string{"ccg-21-net": "10.20.30.9"},
		Volumes: map[string]string{"ccg-21-data": "/w"}})
	g.AddContainer(fakeguard.ContainerSpec{Name: "other-21-app", Image: "x:1", Labels: map[string]string{names.LabelAccount: "21"}})
	acct, err := c.Account(ctx, "21")
	if err != nil {
		t.Fatal(err)
	}
	if len(acct.Others) != 1 || acct.Others[0].Name != "ccg-21-app-rollback-1" {
		t.Fatalf("others: %+v", acct.Others)
	}
	var users []string
	for _, u := range acct.VolumeUsers {
		users = append(users, u.Name)
	}
	if strings.Join(users, ",") != "ccg-21-app,intruder" {
		t.Fatal("ended legacy helpers are not volume users:", users)
	}
	if len(acct.NetworkForeign) != 1 || acct.NetworkForeign[0].Name != "intruder" {
		t.Fatal(acct.NetworkForeign)
	}
	inv, err := c.Inventory(ctx)
	if err != nil || len(inv.Containers) != 2 || len(inv.Networks) != 1 || len(inv.Volumes) != 1 {
		t.Fatal(len(inv.Containers), len(inv.Networks), len(inv.Volumes), err)
	}
	sn, _ := c.Subnets(ctx)
	nets, own, routes := sn.Prefixes("21")
	if len(own) != 1 || len(nets) != 0 || len(routes) != 0 {
		t.Fatal(nets, own, routes)
	}
	g.SetHostRoutes("192.168.1.0/24")
	sn, _ = c.Subnets(ctx)
	if _, _, routes := sn.Prefixes(""); len(routes) != 1 {
		t.Fatal(routes)
	}
	c.DeleteContainer(ctx, "21", "app")
	c.DeleteContainer(ctx, "21", "app-rollback-1")
	if err := c.DeleteVolume(ctx, "21"); !errs.Is(err, errs.ResourceInUse) {
		t.Fatal("intruder still uses it:", err)
	}
	if g.Exists("ccg-oneshot-0011223344556677") {
		t.Fatal("R15: an ended legacy helper is removed before deleting the volume")
	}
}

// covers: P2 W1 (archive put and get round trip through the guard wire format)
func TestArchiveRoundTrip(t *testing.T) {
	g, c := ready(t)
	c.CreateApp(ctx, "21", appReq())
	if b, ok := g.File("ccg-21-app", "/usr/local/bin/worker"); !ok || string(b) != "\x7fELF" {
		t.Fatal("image files are copied into the container")
	}
	rc, err := c.AppArchiveGet(ctx, "21", "/usr/local/bin/worker")
	if err != nil {
		t.Fatal(err)
	}
	raw, _ := io.ReadAll(rc)
	rc.Close()
	if len(raw) < 1024 {
		t.Fatal("tar stream")
	}
	if top, err := c.AppTop(ctx, "21"); err == nil {
		t.Fatal("top of a created container:", top)
	}
	c.AppAction(ctx, "21", "start", nil)
	top, err := c.AppTop(ctx, "21")
	if err != nil || top.Titles[1] != "COMMAND" {
		t.Fatal(top, err)
	}
	g.OnExec("app:21", []string{"node"}, func(argv []string, user string) (int, []byte) { return 7, []byte(user) })
	r, _ := c.AppExec(ctx, "21", []string{"node", "-e", "x"}, "0")
	if r.ExitCode != 7 || string(r.Output) != "0" {
		t.Fatal(r)
	}
	_ = base64.StdEncoding
}

func isStatus(err error, status int) bool {
	e, ok := guardapi.AsError(err)
	return ok && e.Status == status
}

// saveArchive is a minimal `docker save` archive naming ref.
func saveArchive(t *testing.T, ref string) []byte {
	t.Helper()
	var buf bytes.Buffer
	tw := tar.NewWriter(&buf)
	manifest := `[{"Config":"blobs/sha256/` + strings.Repeat("1", 64) + `","RepoTags":["` + ref + `"],"Layers":[]}]`
	if err := tw.WriteHeader(&tar.Header{Name: "manifest.json", Mode: 0o644, Size: int64(len(manifest)), Typeflag: tar.TypeReg}); err != nil {
		t.Fatal(err)
	}
	tw.Write([]byte(manifest))
	tw.Close()
	return buf.Bytes()
}
