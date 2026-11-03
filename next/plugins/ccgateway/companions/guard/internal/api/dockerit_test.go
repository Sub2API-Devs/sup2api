//go:build dockerit

// L5 (05 §7): the guard's real handlers against the real dockerd, every
// resource under the prefix given by CCG_GUARD_IT_PREFIX (must be ccg-gtu).
// Environment (all required; a missing one fails the test):
//
//	CCG_GUARD_IT_PREFIX=ccg-gtu
//	CCG_GTU_RUNTIME   runtime root on the host, root 0755, same path in the test container
//	CCG_GTU_STATE     state dir on the host, root 0700
//	CCG_GTU_IMAGE     test image (sh, sleep, nft, ip), e.g. ccg-gtu-test:1
//	CCG_GTU_IMAGE_TAR `docker save` of that image
//
// Run in a container with /var/run/docker.sock and both directories
// mounted at the same paths:
//
//	go test -tags dockerit -count=1 -v ./internal/api/ -run Dockerit
package api

import (
	"archive/tar"
	"bytes"
	"context"
	"encoding/base64"
	"encoding/json"
	"fmt"
	"io"
	"net/http/httptest"
	"net/netip"
	"os"
	"regexp"
	"sort"
	"strings"
	"testing"
	"time"

	"ccgateway/guard/internal/compose"
	"ccgateway/guard/internal/config"
	"ccgateway/guard/internal/dockerapi"
	"ccgateway/guard/internal/files"
	"ccgateway/guard/internal/gateway"
	"ccgateway/guard/internal/names"
	"ccgateway/guard/internal/policy"
)

type itEnv struct {
	prefix, runtime, state, image, imageTar string
}

func itRequire(t *testing.T) itEnv {
	e := itEnv{os.Getenv("CCG_GUARD_IT_PREFIX"), os.Getenv("CCG_GTU_RUNTIME"), os.Getenv("CCG_GTU_STATE"),
		os.Getenv("CCG_GTU_IMAGE"), os.Getenv("CCG_GTU_IMAGE_TAR")}
	if e.prefix != "ccg-gtu" {
		t.Fatalf("CCG_GUARD_IT_PREFIX must be ccg-gtu (got %q): never run against another prefix", e.prefix)
	}
	if e.runtime == "" || e.state == "" || e.image == "" || e.imageTar == "" {
		t.Fatal("CCG_GTU_RUNTIME, CCG_GTU_STATE, CCG_GTU_IMAGE and CCG_GTU_IMAGE_TAR are required")
	}
	return e
}

// itCleanup removes every container, network and volume of the prefix that
// the guard itself names (the test runner container is not one of them).
func itCleanup(t *testing.T, d *dockerapi.Client, prefix string) {
	ctx := context.Background()
	n := names.Names{Prefix: prefix}
	cs, _ := d.ContainerList(ctx, dockerapi.Filters{"name": {prefix + "-"}}, true)
	for _, c := range cs {
		if _, _, ok := n.ParseContainer(c.Name()); ok || c.Name() == n.Gateway() || n.IsOneshot(c.Name()) {
			_ = d.ContainerRemove(ctx, c.ID, true, true)
		}
	}
	_, nets, _ := d.NetworkList(ctx, nil)
	for _, nw := range nets {
		if _, _, ok := n.ParseNetwork(nw.Name); ok {
			_ = d.NetworkRemove(ctx, nw.ID)
		}
	}
	_, vols, _ := d.VolumeList(ctx, nil)
	for _, v := range vols {
		if _, ok := n.ParseVolume(v.Name); ok {
			_ = d.VolumeRemove(ctx, v.Name)
		}
	}
}

func freeSubnet(t *testing.T, h *harness, second int) netip.Prefix {
	w := h.do(req{method: "GET", path: "/v1/subnets"})
	var s Subnets
	if err := json.Unmarshal(w.Body.Bytes(), &s); err != nil {
		t.Fatal(err)
	}
	var used []netip.Prefix
	for _, r := range s.HostRoutes {
		used = append(used, netip.MustParsePrefix(r))
	}
	for _, n := range s.Networks {
		for _, x := range n.Subnets {
			used = append(used, netip.MustParsePrefix(x))
		}
	}
	for third := 0; third < 256; third++ {
		p := netip.MustParsePrefix(fmt.Sprintf("10.%d.%d.0/24", second, third))
		ok := true
		for _, u := range used {
			if u.Overlaps(p) {
				ok = false
			}
		}
		if ok {
			return p
		}
	}
	t.Fatal("no free subnet")
	return netip.Prefix{}
}

func ipIn(p netip.Prefix, n int) string {
	a := p.Addr().As4()
	a[3] = byte(n)
	return netip.AddrFrom4(a).String()
}

func mustStatus(t *testing.T, w *httptest.ResponseRecorder, status int) map[string]any {
	t.Helper()
	if w.Code != status {
		t.Fatalf("status %d, want %d: %s", w.Code, status, w.Body.String())
	}
	var m map[string]any
	_ = json.Unmarshal(w.Body.Bytes(), &m)
	return m
}

// renamed rewrites manifest.json (and index.json) of a docker save tar so
// the archive names the image as name.
func renamed(t *testing.T, data []byte, name string) []byte {
	tr := tar.NewReader(bytes.NewReader(data))
	var out bytes.Buffer
	tw := tar.NewWriter(&out)
	for {
		h, err := tr.Next()
		if err == io.EOF {
			break
		}
		if err != nil {
			t.Fatal(err)
		}
		b, _ := io.ReadAll(tr)
		switch strings.TrimPrefix(h.Name, "./") {
		case "manifest.json":
			var m []map[string]any
			_ = json.Unmarshal(b, &m)
			for _, e := range m {
				e["RepoTags"] = []string{name}
			}
			b, _ = json.Marshal(m)
		case "index.json":
			var idx map[string]any
			_ = json.Unmarshal(b, &idx)
			if ms, ok := idx["manifests"].([]any); ok {
				for _, x := range ms {
					if mm, ok := x.(map[string]any); ok {
						mm["annotations"] = map[string]any{"io.containerd.image.name": config.Qualify(name), "org.opencontainers.image.ref.name": "1"}
					}
				}
			}
			b, _ = json.Marshal(idx)
		case "repositories":
			continue
		}
		h.Size = int64(len(b))
		_ = tw.WriteHeader(h)
		_, _ = tw.Write(b)
	}
	_ = tw.Close()
	return out.Bytes()
}

// covers: L5 O1 O7 R1 R5 R6 R7 R11 R12 R15 D4 D5 BUG-20(fixed) the guard against the real dockerd
func TestDockeritAccountLifecycle(t *testing.T) {
	env := itRequire(t)
	d := dockerapi.New("/var/run/docker.sock")
	if _, err := d.Version(context.Background()); err != nil {
		t.Fatalf("docker: %v", err)
	}
	itCleanup(t, d, env.prefix)
	t.Cleanup(func() { itCleanup(t, d, env.prefix) })

	cfg, err := config.Load(func(k string) string {
		return map[string]string{"CCG_GUARD_TOKEN": testToken, "CCG_GUARD_PREFIX": env.prefix, "CCG_GUARD_CHAIN_PREFIX": "CCG-GTU",
			"CCG_GUARD_RUNTIME_ROOT": env.runtime, "CCG_GUARD_STATE_DIR": env.state, "CCG_GUARD_LOAD_REPOS": "ccg-gtu-*",
			"CCG_GUARD_PROJECT": "ccgateway-gtu", "CCG_GUARD_PULL_REPOS": "ghcr.io/sub2api-devs/ccgateway-*"}[k]
	}, config.Options{RequireToken: true})
	if err != nil {
		t.Fatal(err)
	}
	rtRoot, err := files.OpenRoot(env.runtime)
	if err != nil {
		t.Fatalf("runtime root: %v", err)
	}
	stRoot, err := files.OpenRoot(env.state)
	if err != nil {
		t.Fatalf("state root: %v", err)
	}
	rt, st := files.Runtime{R: rtRoot}, files.State{R: stRoot}
	n := cfg.Names()
	fw := &recFW{}
	srv := &Server{Cfg: cfg, D: d, Files: rt, State: st, FW: fw, Control: &ctlState{ok: true}, Version: "it",
		HostRoutes: HostRoutesFile("/proc/net/route")}
	life := &compose.Lifecycle{}
	runner := &compose.Runner{Docker: "/usr/bin/docker", Project: cfg.Project, Dir: cfg.ProjectDir, Socket: cfg.DockerSocket,
		X: compose.CmdExec{}, Env: &compose.MemEnv{}, L: &compose.MutexLocker{}}
	srv.Gateway = &gateway.Manager{N: n, Project: cfg.Project, Root: cfg.RuntimeRoot, D: d, F: rt, Nets: srv, C: runner,
		CLock: runner.L, Life: life, Locks: srv, FW: fw, Store: st, Stable: 500 * time.Millisecond}
	h := &harness{t: t, srv: srv, h: srv.Handler(), fw: fw}
	ctx := context.Background()
	aid := "d00000000000a0001"
	sub := freeSubnet(t, h, 249)
	upSub := freeSubnet(t, h, 248)
	appIP, gwIP := ipIn(sub, 5), ipIn(sub, 2)

	evctx, evcancel := context.WithCancel(ctx)
	defer evcancel()
	evs, _ := d.Events(evctx, time.Now(), dockerapi.Filters{"type": {"container", "network"}})
	seen := make(chan string, 256)
	go func() {
		for e := range evs {
			seen <- e.Type + ":" + e.Action + ":" + e.Actor.Attributes["name"]
		}
	}()

	// Load the test image through the guard (whitelisted name).
	imgTar, err := os.ReadFile(env.imageTar)
	if err != nil {
		t.Fatal(err)
	}
	t.Run("images/load allowed", func(t *testing.T) {
		h.t = t
		b := mustStatus(t, h.do(req{method: "POST", path: "/v1/images/load", raw: imgTar, ctype: "application/x-tar"}), 200)
		imgs := b["images"].([]any)
		if len(imgs) != 1 || !strings.Contains(fmt.Sprint(imgs[0]), env.image) {
			t.Fatalf("%v", b)
		}
	})
	t.Run("images/load forbidden name leaves no tag", func(t *testing.T) {
		h.t = t
		bad := renamed(t, imgTar, "ccgtu-not-allowed:1")
		mustStatus(t, h.do(req{method: "POST", path: "/v1/images/load", raw: bad, ctype: "application/x-tar"}), 403)
		if _, _, err := d.ImageInspect(ctx, "ccgtu-not-allowed:1"); !dockerapi.IsNotFound(err) {
			t.Fatalf("tag created: %v", err)
		}
	})
	t.Run("images/load broken layers", func(t *testing.T) {
		h.t = t
		var buf bytes.Buffer
		tw := tar.NewWriter(&buf)
		m := `[{"Config":"blobs/sha256/` + strings.Repeat("0", 64) + `","RepoTags":["ccg-gtu-broken:1"],"Layers":["blobs/sha256/` + strings.Repeat("1", 64) + `"]}]`
		_ = tw.WriteHeader(&tar.Header{Name: "manifest.json", Mode: 0o644, Size: int64(len(m))})
		_, _ = tw.Write([]byte(m))
		_ = tw.Close()
		b := mustStatus(t, h.do(req{method: "POST", path: "/v1/images/load", raw: buf.Bytes(), ctype: "application/x-tar"}), 502)
		if b["reason"] != "load_failed" {
			t.Fatal(b)
		}
	})
	t.Run("images/pull missing", func(t *testing.T) {
		h.t = t
		b := mustStatus(t, h.do(req{method: "POST", path: "/v1/images/pull", body: map[string]any{"ref": "ghcr.io/sub2api-devs/ccgateway-gtu-missing:1"}}), 502)
		if b["reason"] != "pull_failed" {
			t.Fatal(b)
		}
	})
	t.Run("images/inspect and file", func(t *testing.T) {
		h.t = t
		mustStatus(t, h.do(req{method: "GET", path: "/v1/images/inspect?ref=" + env.image}), 200)
		w := h.do(req{method: "GET", path: "/v1/images/file?ref=" + env.image + "&path=/etc/debian_version&limit=64"})
		if w.Code != 200 || !regexp.MustCompile(`^[0-9a-z]`).Match(w.Body.Bytes()) {
			t.Fatalf("%d %q", w.Code, w.Body.String())
		}
		mustStatus(t, h.do(req{method: "GET", path: "/v1/images/file?ref=" + env.image + "&path=/etc&limit=64"}), 422)
		cs, _ := d.ContainerList(ctx, dockerapi.Filters{"name": {env.prefix + "-oneshot-"}}, true)
		if len(cs) != 0 {
			t.Fatal("image reader not removed")
		}
	})

	t.Run("network", func(t *testing.T) {
		h.t = t
		b := mustStatus(t, h.do(req{method: "PUT", path: "/v1/accounts/" + aid + "/network",
			body: map[string]any{"subnet": sub.String(), "gateway": ipIn(sub, 1), "policy_label": `{"allocation": "random", "pool": "10.0.0.0/8"}`}}), 201)
		if b["Name"] != n.Net(aid) || b["Internal"] != true || b["Driver"] != "bridge" ||
			b["Labels"].(map[string]any)["io.sup2api.ccgateway.network"] != `{"allocation": "random", "pool": "10.0.0.0/8"}` {
			t.Fatal(b)
		}
		mustStatus(t, h.do(req{method: "PUT", path: "/v1/accounts/" + aid + "/network",
			body: map[string]any{"subnet": sub.String(), "gateway": ipIn(sub, 1), "policy_label": `{}`}}), 409)
	})
	t.Run("volume", func(t *testing.T) {
		h.t = t
		b := mustStatus(t, h.do(req{method: "PUT", path: "/v1/accounts/" + aid + "/volume", body: map[string]any{"size_bytes": 1 << 30, "allow_unbounded": true}}), 201)
		vol := b["volume"].(map[string]any)
		labels := vol["Labels"].(map[string]any)
		if b["quota_supported"] == true && labels["io.sup2api.ccgateway.disk-quota-bytes"] != "1073741824" {
			t.Fatal(b)
		}
		if b["quota_supported"] == false && len(labels) != 1 {
			t.Fatal(b)
		}
	})
	t.Run("resolv", func(t *testing.T) {
		h.t = t
		mustStatus(t, h.do(req{method: "PUT", path: "/v1/accounts/" + aid + "/resolv", body: map[string]any{"nameserver": gwIP}}), 204)
		got, _ := os.ReadFile(env.runtime + "/" + aid + "/resolv.conf")
		if string(got) != "nameserver "+gwIP+"\noptions timeout:2 attempts:2\n" {
			t.Fatalf("%q", got)
		}
	})
	t.Run("jobs: prepare volume with CHOWN and DAC_OVERRIDE only (D5)", func(t *testing.T) {
		h.t = t
		prep := "mkdir -p /work/config /work/data; rm -f /work/data/environment.json; printf '{\"auto_update\":false,\"channel\":\"stable\"}\\n' > /work/data/cli-update.json; chown -R 1000:1000 /work; grep -E '^(CapEff|NoNewPrivs)' /proc/self/status"
		b := mustStatus(t, h.do(req{method: "POST", path: "/v1/accounts/" + aid + "/jobs", body: map[string]any{
			"image": env.image, "entrypoint": []string{"sh", "-ec"}, "argv": []string{prep}, "user": "0", "volume": "rw", "caps": []string{"CHOWN", "DAC_OVERRIDE"}}}), 200)
		out, _ := base64.StdEncoding.DecodeString(b["stdout"].(string))
		if b["exit_code"].(float64) != 0 || !strings.Contains(string(out), "CapEff:\t0000000000000003") || !strings.Contains(string(out), "NoNewPrivs:\t1") {
			t.Fatalf("%v %q", b, out)
		}
		b = mustStatus(t, h.do(req{method: "POST", path: "/v1/accounts/" + aid + "/jobs", body: map[string]any{
			"image": env.image, "entrypoint": []string{"sh", "-c"}, "argv": []string{"stat -c %u:%g /work/data; grep CapEff /proc/self/status; cat /sys/class/net/*/operstate 2>/dev/null | wc -l; echo err >&2; exit 4"},
			"user": "1000:1000", "volume": "ro", "caps": []string{}}}), 200)
		out, _ = base64.StdEncoding.DecodeString(b["stdout"].(string))
		if b["exit_code"].(float64) != 4 || !strings.HasPrefix(string(out), "1000:1000\nCapEff:\t0000000000000000\n") || strings.Contains(string(out), "err") {
			t.Fatalf("%v %q", b, out)
		}
		cs, _ := d.ContainerList(ctx, dockerapi.Filters{"name": {env.prefix + "-oneshot-"}}, true)
		if len(cs) != 0 {
			t.Fatal("job containers not removed")
		}
	})

	t.Run("app create: every security field from policy", func(t *testing.T) {
		h.t = t
		_, img, err := d.ImageInspect(ctx, env.image)
		if err != nil {
			t.Fatal(err)
		}
		b := mustStatus(t, h.do(req{method: "PUT", path: "/v1/accounts/" + aid + "/app", body: map[string]any{
			"image": env.image, "ipv4": appIP, "env": map[string]string{"TZ": "UTC", "A": "1"}, "auth_label": "fp-it", "image_label": img.ID}}), 201)
		var c struct {
			State  struct{ Status string }
			Config struct {
				User   string
				Env    []string
				Labels map[string]string
			}
			HostConfig struct {
				CapDrop, CapAdd, SecurityOpt, Binds []string
				Privileged                          bool
				Memory, MemorySwap, NanoCpus        int64
				PidsLimit                           *int64
				Init                                *bool
				NetworkMode                         string
				RestartPolicy                       struct{ Name string }
				LogConfig                           struct {
					Type   string
					Config map[string]string
				}
			}
			Mounts []struct {
				Type, Source, Destination, Mode, Name string
				RW                                    bool
			}
		}
		raw, _ := json.Marshal(b)
		_ = json.Unmarshal(raw, &c)
		hc := c.HostConfig
		if c.State.Status != "created" || c.Config.User != "1000:1000" || fmt.Sprint(hc.CapDrop) != "[ALL]" || len(hc.CapAdd) != 0 ||
			fmt.Sprint(hc.SecurityOpt) != "[no-new-privileges:true]" || hc.Privileged || hc.Memory != 1<<30 || hc.MemorySwap != -1 || hc.NanoCpus != 2e9 ||
			hc.PidsLimit == nil || *hc.PidsLimit != 256 || hc.Init == nil || !*hc.Init || hc.NetworkMode != n.Net(aid) ||
			hc.RestartPolicy.Name != "no" && hc.RestartPolicy.Name != "" || hc.LogConfig.Type != "json-file" ||
			hc.LogConfig.Config["max-size"] != "20m" || hc.LogConfig.Config["max-file"] != "3" ||
			fmt.Sprint(hc.Binds) != "["+n.Volume(aid)+":/work:rw "+env.runtime+"/"+aid+"/resolv.conf:/etc/resolv.conf:ro]" ||
			c.Config.Labels["io.sup2api.ccgateway.account"] != aid || c.Config.Labels["io.sup2api.ccgateway.auth"] != "fp-it" ||
			len(c.Mounts) != 2 {
			t.Fatalf("%s", raw)
		}
		env := append([]string(nil), c.Config.Env...)
		sort.Strings(env)
		if !strings.Contains(strings.Join(env, ","), "A=1") || !strings.Contains(strings.Join(env, ","), "TZ=UTC") {
			t.Fatal(env)
		}
	})
	t.Run("app start, exec, top, archive", func(t *testing.T) {
		h.t = t
		mustStatus(t, h.do(req{method: "POST", path: "/v1/accounts/" + aid + "/app/start"}), 204)
		b := mustStatus(t, h.do(req{method: "POST", path: "/v1/accounts/" + aid + "/app/exec", body: map[string]any{
			"argv": []string{"sh", "-c", "echo out; sleep 0.2; echo err >&2; sleep 0.2; echo out2; exit 3"}, "user": "1000"}}), 200)
		out, _ := base64.StdEncoding.DecodeString(b["output"].(string))
		if b["exit_code"].(float64) != 3 || string(out) != "out\nerr\nout2\n" {
			t.Fatalf("%v %q", b, out)
		}
		b = mustStatus(t, h.do(req{method: "POST", path: "/v1/accounts/" + aid + "/app/exec", body: map[string]any{"argv": []string{"id", "-u"}, "user": ""}}), 200)
		if out, _ := base64.StdEncoding.DecodeString(b["output"].(string)); string(out) != "1000\n" {
			t.Fatalf("%q", out)
		}
		b = mustStatus(t, h.do(req{method: "GET", path: "/v1/accounts/" + aid + "/app/top"}), 200)
		if !strings.Contains(fmt.Sprint(b["Titles"]), "PID") {
			t.Fatal(b)
		}
		var tb bytes.Buffer
		tw := tar.NewWriter(&tb)
		_ = tw.WriteHeader(&tar.Header{Name: "it.txt", Mode: 0o644, Size: 5})
		_, _ = tw.Write([]byte("hello"))
		_ = tw.Close()
		mustStatus(t, h.do(req{method: "PUT", path: "/v1/accounts/" + aid + "/app/archive?path=/tmp", raw: tb.Bytes(), ctype: "application/x-tar"}), 204)
		w := h.do(req{method: "GET", path: "/v1/accounts/" + aid + "/app/archive?path=/tmp/it.txt"})
		if w.Code != 200 || w.Header().Get("X-Docker-Container-Path-Stat") == "" {
			t.Fatal(w.Code)
		}
		tr := tar.NewReader(w.Body)
		if hd, err := tr.Next(); err != nil || hd.Name != "it.txt" {
			t.Fatal(err)
		}
		if b, _ := io.ReadAll(tr); string(b) != "hello" {
			t.Fatal(string(b))
		}
		mustStatus(t, h.do(req{method: "GET", path: "/v1/accounts/" + aid + "/app/archive?path=/nope"}), 404)
		// The resolv.conf mount is read-only for Docker's extraction too.
		mustStatus(t, h.do(req{method: "POST", path: "/v1/accounts/" + aid + "/app/exec", body: map[string]any{"argv": []string{"sh", "-c", "cat /etc/resolv.conf"}, "user": "0"}}), 200)
	})
	t.Run("raw inspect is Docker's bytes", func(t *testing.T) {
		h.t = t
		w := h.do(req{method: "GET", path: "/v1/accounts/" + aid})
		var a struct{ App json.RawMessage }
		_ = json.Unmarshal(w.Body.Bytes(), &a)
		raw, _, _ := d.ContainerInspect(ctx, n.App(aid))
		var x, y map[string]any
		_ = json.Unmarshal(a.App, &x)
		_ = json.Unmarshal(raw, &y)
		// ExecIDs changes while dockerd prunes the execs run above, and
		// dockerd returns Mounts in no fixed order (container_identity sorts
		// them, dockerfs.py).
		delete(x, "ExecIDs")
		delete(y, "ExecIDs")
		for _, m := range []map[string]any{x, y} {
			ms, _ := m["Mounts"].([]any)
			sort.Slice(ms, func(i, j int) bool { return fmt.Sprint(ms[i]) < fmt.Sprint(ms[j]) })
		}
		if !jsonEqual(x, y) {
			for k := range y {
				if !jsonEqual(x[k], y[k]) {
					t.Logf("%s: guard %v / docker %v", k, x[k], y[k])
				}
			}
			t.Fatal("inspect differs")
		}
		var m map[string]any
		_ = json.Unmarshal(a.App, &m)
		if _, ok := m["Args"]; !ok {
			t.Fatal("Args missing")
		}
	})

	// A legacy (docker-py style) shared gateway with nft and ip.
	t.Run("gateway setup (legacy)", func(t *testing.T) {
		h.t = t
		spec, err := policy.GatewayUplink(n, policy.NetworkInput{Subnet: upSub.String(), Gateway: ipIn(upSub, 1), PolicyLabel: "{}"})
		if err != nil {
			t.Fatal(err)
		}
		if _, err := srv.CreateNetwork(ctx, spec); err != nil {
			t.Fatal(err)
		}
		if err := rt.WriteGatewayFile("boot.json", []byte("{}")); err != nil {
			t.Fatal(err)
		}
		gw := policy.ContainerSpec{Image: env.image, Entrypoint: []string{"sleep", "infinity"},
			Labels: map[string]string{names.LabelShared: env.prefix},
			HostConfig: policy.HostConfig{NetworkMode: n.GatewayUplink(), Binds: []string{env.runtime + "/shared-egress:/config:ro"},
				CapDrop: []string{"ALL"}, SecurityOpt: []string{"no-new-privileges:true"}, LogConfig: policy.LogConfig{Type: "json-file"}}}
		id, err := d.ContainerCreate(ctx, n.Gateway(), gw)
		if err != nil {
			t.Fatal(err)
		}
		if err := d.ContainerStart(ctx, id); err != nil {
			t.Fatal(err)
		}
		b := mustStatus(t, h.do(req{method: "GET", path: "/v1/gateway"}), 200)
		if b["managed_by"] != "legacy" {
			t.Fatal(b)
		}
		b = mustStatus(t, h.do(req{method: "POST", path: "/v1/gateway/ensure"}), 200)
		if b["action"] != "none" {
			t.Fatal(b)
		}
		b = mustStatus(t, h.do(req{method: "POST", path: "/v1/gateway/recreate", body: map[string]any{"image": env.image}}), 403)
		if b["reason"] != "image_not_gateway" {
			t.Fatal(b)
		}
	})
	t.Run("gateway attach, files, exec, firewall helper", func(t *testing.T) {
		h.t = t
		mustStatus(t, h.do(req{method: "PUT", path: "/v1/gateway/networks/" + aid, body: map[string]any{"ipv4": gwIP}}), 204)
		mustStatus(t, h.do(req{method: "PUT", path: "/v1/gateway/networks/" + aid, body: map[string]any{"ipv4": gwIP}}), 204)
		mustStatus(t, h.do(req{method: "PUT", path: "/v1/gateway/networks/" + aid, body: map[string]any{"ipv4": ipIn(sub, 9)}}), 409)
		b := mustStatus(t, h.do(req{method: "GET", path: "/v1/accounts/" + aid + "?fields=state"}), 200)
		if b["app"].(map[string]any)["ip"] != appIP || b["gateway"].(map[string]any)["ip"] != gwIP {
			t.Fatal(b)
		}
		mustStatus(t, h.do(req{method: "PUT", path: "/v1/gateway/files/dns.json", raw: []byte(`{"x":1}`), ctype: "application/octet-stream"}), 204)
		b = mustStatus(t, h.do(req{method: "POST", path: "/v1/gateway/exec", body: map[string]any{"argv": []string{"cat", "/config/dns.json"}}}), 200)
		if out, _ := base64.StdEncoding.DecodeString(b["output"].(string)); string(out) != `{"x":1}` {
			t.Fatalf("%q", out)
		}
		mustStatus(t, h.do(req{method: "PUT", path: "/v1/accounts/" + aid + "/firewall", body: map[string]any{
			"rules": "table inet ccg_app {\n  chain output { type filter hook output priority 0; policy accept; }\n}\n", "default_gateway": gwIP}}), 204)
		b = mustStatus(t, h.do(req{method: "POST", path: "/v1/accounts/" + aid + "/app/exec", body: map[string]any{"argv": []string{"ip", "route", "show", "default"}, "user": ""}}), 200)
		if out, _ := base64.StdEncoding.DecodeString(b["output"].(string)); !strings.HasPrefix(string(out), "default via "+gwIP) {
			t.Fatalf("%q", out)
		}
		// Run again: the existing table is replaced (NFT_REPLACE branch).
		mustStatus(t, h.do(req{method: "PUT", path: "/v1/accounts/" + aid + "/firewall", body: map[string]any{
			"rules": "table inet ccg_app {\n}\n", "default_gateway": gwIP}}), 204)
		b = mustStatus(t, h.do(req{method: "PUT", path: "/v1/accounts/" + aid + "/firewall", body: map[string]any{
			"rules": "this is not nft\n", "default_gateway": gwIP}}), 502)
		if b["reason"] != "helper_failed" {
			t.Fatal(b)
		}
		cs, _ := d.ContainerList(ctx, dockerapi.Filters{"name": {env.prefix + "-oneshot-"}}, true)
		if len(cs) != 0 {
			t.Fatal("helpers not removed")
		}
	})
	t.Run("gateway stopped: ensure starts it through the Docker API", func(t *testing.T) {
		h.t = t
		_, gw, _ := d.ContainerInspect(ctx, n.Gateway())
		if err := d.ContainerStop(ctx, gw.ID, 1); err != nil {
			t.Fatal(err)
		}
		b := mustStatus(t, h.do(req{method: "POST", path: "/v1/gateway/ensure", body: map[string]any{}}), 200)
		if b["action"] != "started" {
			t.Fatal(b)
		}
		_, gw2, _ := d.ContainerInspect(ctx, n.Gateway())
		if gw2.ID != gw.ID || !gw2.State.Running {
			t.Fatal("gateway recreated")
		}
	})
	t.Run("restart and stop", func(t *testing.T) {
		h.t = t
		mustStatus(t, h.do(req{method: "POST", path: "/v1/accounts/" + aid + "/app/restart", body: map[string]any{"timeout": 1}}), 204)
		mustStatus(t, h.do(req{method: "POST", path: "/v1/accounts/" + aid + "/app/stop", body: map[string]any{"timeout": 1}}), 204)
		mustStatus(t, h.do(req{method: "POST", path: "/v1/accounts/" + aid + "/app/exec", body: map[string]any{"argv": []string{"true"}, "user": ""}}), 409)
		mustStatus(t, h.do(req{method: "GET", path: "/v1/accounts/" + aid + "/app/archive?path=/tmp/it.txt"}), 200)
		mustStatus(t, h.do(req{method: "POST", path: "/v1/accounts/" + aid + "/app/start"}), 204)
	})
	t.Run("inventory", func(t *testing.T) {
		h.t = t
		b := mustStatus(t, h.do(req{method: "GET", path: "/v1/inventory"}), 200)
		if len(b["containers"].([]any)) != 1 || len(b["networks"].([]any)) != 1 || len(b["volumes"].([]any)) != 1 {
			t.Fatalf("%d %d %d", len(b["containers"].([]any)), len(b["networks"].([]any)), len(b["volumes"].([]any)))
		}
	})
	t.Run("delete in order", func(t *testing.T) {
		h.t = t
		b := mustStatus(t, h.do(req{method: "DELETE", path: "/v1/accounts/" + aid + "/network?role=net"}), 409)
		if fmt.Sprint(b["names"]) != "["+n.App(aid)+"]" {
			t.Fatal(b)
		}
		mustStatus(t, h.do(req{method: "DELETE", path: "/v1/accounts/" + aid + "/volume"}), 409)
		mustStatus(t, h.do(req{method: "DELETE", path: "/v1/accounts/" + aid + "/containers/app"}), 204)
		mustStatus(t, h.do(req{method: "DELETE", path: "/v1/accounts/" + aid + "/network?role=net"}), 204)
		mustStatus(t, h.do(req{method: "DELETE", path: "/v1/gateway/networks/" + aid}), 204)
		mustStatus(t, h.do(req{method: "DELETE", path: "/v1/accounts/" + aid + "/volume"}), 204)
		mustStatus(t, h.do(req{method: "DELETE", path: "/v1/accounts/" + aid + "/volume"}), 404)
		b = mustStatus(t, h.do(req{method: "GET", path: "/v1/accounts/" + aid}), 200)
		if b["app"] != nil || b["network"] != nil || b["volume"] != nil {
			t.Fatal(b)
		}
	})
	t.Run("events arrived", func(t *testing.T) {
		h.t = t
		want := map[string]bool{"container:create:" + n.App(aid): false, "container:start:" + n.App(aid): false,
			"container:destroy:" + n.App(aid): false, "network:connect:" + n.Net(aid): false, "network:destroy:" + n.Net(aid): false}
		deadline := time.After(5 * time.Second)
		for {
			missing := 0
			for _, ok := range want {
				if !ok {
					missing++
				}
			}
			if missing == 0 {
				return
			}
			select {
			case e := <-seen:
				if _, ok := want[e]; ok {
					want[e] = true
				}
			case <-deadline:
				t.Fatalf("missing events: %v", want)
			}
		}
	})
}
