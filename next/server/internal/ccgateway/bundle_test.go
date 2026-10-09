package ccgateway

import (
	"archive/zip"
	"bytes"
	"context"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net/http"
	"os"
	"path/filepath"
	"strconv"
	"strings"
	"sync"
	"testing"
	"time"

	"github.com/Sub2API-Devs/sup2api/next/server/internal/remotedocker"
)

// Runtime images bundled in the ccgateway plugin package (CONTRACTS §53.10).

var testBundleRefs = map[string]string{
	"app":        "ccgateway-app:0.1.16",
	"egress":     "ccgateway-egress:0.1.16",
	"controller": "ccgateway-controller:0.1.16",
	"gateway":    "caddy:2.10.2-alpine",
}

// testImage is the fake archive of ref: its first line names the image (the
// fake controller "loads" it from there), then padding.
func testImage(ref string, size int) []byte {
	b := []byte("IMAGE " + ref + "\n")
	for len(b) < size {
		b = append(b, byte('a'+len(b)%26))
	}
	return b
}

type testBundle struct {
	pkg    BundlePackage
	images map[string][]byte
}

// makeBundle writes a plugin package with images/ (stored, like the build)
// to a temporary file. edit may change images.json before it is written.
func makeBundle(t *testing.T, version string, edit func(m map[string]any)) *testBundle {
	t.Helper()
	tb := &testBundle{images: map[string][]byte{}}
	entries := map[string]any{}
	for role, ref := range testBundleRefs {
		size := 1000
		if role == "app" {
			size = 2500 // several chunks once the chunk size is small
		}
		data := testImage(ref, size)
		tb.images[role] = data
		sum := sha256.Sum256(data)
		entries[role] = map[string]any{"ref": ref, "file": role + ".tar.gz", "sha256": hex.EncodeToString(sum[:]), "size": len(data)}
	}
	m := map[string]any{"version": 1, "images": entries}
	if edit != nil {
		edit(m)
	}
	manifest, _ := json.Marshal(m)
	var buf bytes.Buffer
	zw := zip.NewWriter(&buf)
	write := func(name string, data []byte, method uint16) {
		w, err := zw.CreateHeader(&zip.FileHeader{Name: name, Method: method})
		if err != nil {
			t.Fatal(err)
		}
		_, _ = w.Write(data)
	}
	write("manifest.json", []byte(`{"key":"ccgateway","version":"`+version+`"}`), zip.Deflate)
	if m["omit"] == nil {
		write(bundleManifestFile, manifest, zip.Deflate)
		for role, data := range tb.images {
			write("images/"+role+".tar.gz", data, zip.Store)
		}
	}
	if err := zw.Close(); err != nil {
		t.Fatal(err)
	}
	file := filepath.Join(t.TempDir(), "package.s2plugin")
	if err := os.WriteFile(file, buf.Bytes(), 0o644); err != nil {
		t.Fatal(err)
	}
	zr, err := zip.OpenReader(file)
	if err != nil {
		t.Fatal(err)
	}
	t.Cleanup(func() { zr.Close() })
	tb.pkg = BundlePackage{Version: version, File: file, FS: zr}
	return tb
}

func (tb *testBundle) use(s *Service) {
	s.Bundle = func() (BundlePackage, bool) { return tb.pkg, true }
}

func TestBundleRead(t *testing.T) {
	tb := makeBundle(t, "0.1.16", nil)
	s := &Service{}
	if s.bundle() != nil {
		t.Fatal("bundle without a package")
	}
	tb.use(s)
	b := s.bundle()
	if b == nil || b.refs() != (RuntimeImages{App: testBundleRefs["app"], Egress: testBundleRefs["egress"], Controller: testBundleRefs["controller"], Gateway: testBundleRefs["gateway"]}) {
		t.Fatalf("bundle: %+v", b)
	}
	if v := b.view(); v.Version != "0.1.16" || len(v.Images) != 4 || v.Images["gateway"] != testBundleRefs["gateway"] {
		t.Fatalf("view: %+v", v)
	}
	for role, want := range tb.images {
		rc, img, err := b.open(role)
		if err != nil {
			t.Fatalf("%s: %v", role, err)
		}
		got, err := io.ReadAll(rc)
		rc.Close()
		if err != nil || !bytes.Equal(got, want) || img.Size != int64(len(want)) {
			t.Fatalf("%s: %d bytes, %v", role, len(got), err)
		}
	}
	// No package, or a package without images/: no bundled images.
	s.Bundle = func() (BundlePackage, bool) { return BundlePackage{}, false }
	if s.bundle() != nil {
		t.Fatal("bundle without a package")
	}
	makeBundle(t, "0.1.15", func(m map[string]any) { m["omit"] = true }).use(s)
	if s.bundle() != nil {
		t.Fatal("bundle of a package without images/")
	}
	// Invalid images.json: none, never a guess.
	for name, edit := range map[string]func(m map[string]any){
		"version":      func(m map[string]any) { m["version"] = 2 },
		"missing role": func(m map[string]any) { delete(m["images"].(map[string]any), "gateway") },
		"bad ref": func(m map[string]any) {
			m["images"].(map[string]any)["app"].(map[string]any)["ref"] = "ccgateway-app:0.1.16;rm -rf /"
		},
		"image id": func(m map[string]any) {
			m["images"].(map[string]any)["app"].(map[string]any)["ref"] = "sha256:" + strings.Repeat("a", 64)
		},
		"outside images/": func(m map[string]any) {
			m["images"].(map[string]any)["app"].(map[string]any)["file"] = "../bin/app.tar.gz"
		},
		"path instead of a file name": func(m map[string]any) {
			m["images"].(map[string]any)["app"].(map[string]any)["file"] = "images/app.tar.gz"
		},
		"same file twice": func(m map[string]any) {
			m["images"].(map[string]any)["app"].(map[string]any)["file"] = "egress.tar.gz"
		},
		"bad sha": func(m map[string]any) {
			m["images"].(map[string]any)["app"].(map[string]any)["sha256"] = "XYZ"
		},
		"size 0": func(m map[string]any) { m["images"].(map[string]any)["app"].(map[string]any)["size"] = 0 },
	} {
		s := &Service{}
		makeBundle(t, "0.1.16", edit).use(s)
		if s.bundle() != nil {
			t.Errorf("%s: accepted", name)
		}
	}
}

func TestBundleChecksums(t *testing.T) {
	// A file that does not match images.json is refused before any byte of
	// it is handed out.
	for name, edit := range map[string]func(m map[string]any){
		"sha256": func(m map[string]any) {
			m["images"].(map[string]any)["controller"].(map[string]any)["sha256"] = strings.Repeat("0", 64)
		},
		"size": func(m map[string]any) { m["images"].(map[string]any)["controller"].(map[string]any)["size"] = 999 },
	} {
		s := &Service{}
		makeBundle(t, "0.1.16", edit).use(s)
		b := s.bundle()
		if b == nil {
			t.Fatalf("%s: images.json refused", name)
		}
		if _, _, err := b.open("controller"); !errors.Is(err, errBundleChecksum) {
			t.Fatalf("%s: %v", name, err)
		}
		if rc, _, err := b.open("app"); err != nil {
			t.Fatalf("%s: other roles: %v", name, err)
		} else {
			rc.Close()
		}
	}
	// The second read is checked too: content that changed between the two
	// reads fails on its last read instead of ending cleanly.
	want := testImage("x:1", 100)
	sum := sha256.Sum256(want)
	changed := append([]byte(nil), want...)
	changed[50] ^= 1
	c := &checkedImage{r: io.NopCloser(bytes.NewReader(changed)), file: mustTemp(t), h: sha256.New(), want: hex.EncodeToString(sum[:]), size: 100}
	if _, err := io.ReadAll(c); !errors.Is(err, errBundleChecksum) {
		t.Fatalf("changed content: %v", err)
	}
	c = &checkedImage{r: io.NopCloser(bytes.NewReader(want)), file: mustTemp(t), h: sha256.New(), want: hex.EncodeToString(sum[:]), size: 100}
	if got, err := io.ReadAll(c); err != nil || !bytes.Equal(got, want) {
		t.Fatalf("unchanged content: %v", err)
	}
	c.Close()
}

func mustTemp(t *testing.T) *os.File {
	f, err := os.CreateTemp(t.TempDir(), "x")
	if err != nil {
		t.Fatal(err)
	}
	t.Cleanup(func() { f.Close() })
	return f
}

func TestEffectiveImagesPriority(t *testing.T) {
	bundled := &RuntimeImages{App: testBundleRefs["app"], Egress: testBundleRefs["egress"], Controller: testBundleRefs["controller"], Gateway: testBundleRefs["gateway"]}
	// Nothing bundled: the pinned references.
	if eff := (Config{}).EffectiveImages(); eff != (RuntimeImages{App: AppImage, Egress: EgressImage, Controller: ControllerImage, Gateway: GatewayImage}) {
		t.Fatalf("pinned: %+v", eff)
	}
	// Bundled refs beat the pinned ones (the gateway's Caddy too).
	if eff := (Config{bundled: bundled}).EffectiveImages(); eff != *bundled {
		t.Fatalf("bundled: %+v", eff)
	}
	// A configured override beats the bundled ref, per role.
	c := Config{bundled: bundled, Images: &RuntimeImages{App: "ccgateway:manual", Gateway: "caddy:2.8-alpine"}}
	eff := c.EffectiveImages()
	if eff.App != "ccgateway:manual" || eff.Gateway != "caddy:2.8-alpine" || eff.Egress != bundled.Egress || eff.Controller != bundled.Controller {
		t.Fatalf("override: %+v", eff)
	}
	// Never saved.
	raw, _ := json.Marshal(c)
	if strings.Contains(string(raw), bundled.Egress) {
		t.Fatalf("bundled refs serialized: %s", raw)
	}
}

func TestBundledImagesInTheConfiguration(t *testing.T) {
	f, _ := newPanelFixture(t)
	tb := makeBundle(t, "0.1.16", nil)
	// Without a package: pinned, and runtime.bundled is null.
	code, out := f.request(1, "GET", "/system/ccgateway/runtime", "")
	if _, present := data(out)["bundled"]; code != 200 || !present || data(out)["bundled"] != nil {
		t.Fatalf("runtime without a bundle: %d %v", code, out)
	}
	tb.use(f.s)
	cfg, err := f.s.Load(context.Background())
	if err != nil || cfg.EffectiveImages().App != testBundleRefs["app"] || cfg.EffectiveImages().Gateway != testBundleRefs["gateway"] {
		t.Fatalf("loaded: %+v %v", cfg.EffectiveImages(), err)
	}
	code, out = f.request(1, "GET", "/system/ccgateway/remote-config", "")
	if eff, _ := data(out)["effective_images"].(map[string]any); code != 200 || eff["controller"] != testBundleRefs["controller"] {
		t.Fatalf("remote-config: %d %v", code, out)
	}
	code, out = f.request(1, "GET", "/system/ccgateway/runtime", "")
	bundled, _ := data(out)["bundled"].(map[string]any)
	images, _ := bundled["images"].(map[string]any)
	expected, _ := data(out)["expected"].(map[string]any)
	if code != 200 || bundled["version"] != "0.1.16" || images["app"] != testBundleRefs["app"] || images["gateway"] != testBundleRefs["gateway"] ||
		expected["egress"] != testBundleRefs["egress"] {
		t.Fatalf("runtime: %d %v", code, out)
	}
	// Saving keeps the bundled refs effective in the answer.
	code, out = f.request(f.user("admin@x"), "PUT", "/system/ccgateway/remote-config", `{"mode":"disabled"}`)
	if eff, _ := data(out)["effective_images"].(map[string]any); code != 200 || eff["app"] != testBundleRefs["app"] {
		t.Fatalf("save: %d %v", code, out)
	}
}

func mustJSON(v any) []byte {
	raw, _ := json.Marshal(v)
	return raw
}

// loadStdins are the stdins of the load scripts, by the reference in each.
func (h *fakeHostOps) loads(t *testing.T, scripts []string) map[string][]byte {
	h.mu.Lock()
	defer h.mu.Unlock()
	out := map[string][]byte{}
	for i, kind := range h.scripts {
		if kind != "load" {
			continue
		}
		for _, ref := range testBundleRefs {
			if strings.Contains(scripts[i], "REF='"+ref+"'") {
				out[ref] = h.stdins[i]
			}
		}
	}
	return out
}

// recordScripts keeps the text of every script run on host.
func recordScripts(f *runtimeFixture, host *fakeHostOps) *[]string {
	var mu sync.Mutex
	scripts := &[]string{}
	run, local := f.s.runScript, f.s.runLocalScript
	f.s.runScript = func(ctx context.Context, cfg remotedocker.Config, script string, stdin []byte, limit time.Duration) (remotedocker.ScriptResult, error) {
		mu.Lock()
		*scripts = append(*scripts, script)
		mu.Unlock()
		return run(ctx, cfg, script, stdin, limit)
	}
	f.s.runLocalScript = func(ctx context.Context, script string, stdin []byte, limit time.Duration) (remotedocker.ScriptResult, error) {
		mu.Lock()
		*scripts = append(*scripts, script)
		mu.Unlock()
		return local(ctx, script, stdin, limit)
	}
	return scripts
}

func TestRuntimeInstallLoadsBundledImages(t *testing.T) {
	cfg := sshConfig
	cfg.AdminKey = panelKey
	f, host := newRuntimeOpsFixture(t, cfg)
	tb := makeBundle(t, "0.1.16", nil)
	tb.use(f.s)
	scripts := recordScripts(f, host)
	host.health = controllerHealth{Version: "0.1.16", AppImage: testBundleRefs["app"], EgressImage: testBundleRefs["egress"]}
	host.missing = []string{"app", "controller", "gateway"}
	host.inspect = "CCG_RESULT=not_installed\n"
	code, out := f.request(f.user("admin@x"), "POST", "/system/ccgateway/runtime/install", "")
	if code != 200 {
		t.Fatalf("install: %d %v", code, out)
	}
	// One check, then one docker load per missing image (the egress image is
	// on the host), each with the archive itself on stdin, before the
	// controller is replaced with the bundled references.
	if got := host.kinds(); got != "missing,load,load,install,finish,inspect" {
		t.Fatalf("scripts: %s", got)
	}
	check := (*scripts)[0]
	for _, role := range []string{"app", "egress", "controller"} {
		if !strings.Contains(check, "docker image inspect '"+testBundleRefs[role]+"' >/dev/null 2>&1 || echo CCG_MISSING="+role+"\n") {
			t.Fatalf("check script:\n%s", check)
		}
	}
	if strings.Contains(check, "CCG_MISSING=gateway") {
		t.Fatalf("the runtime install checks the gateway image:\n%s", check)
	}
	loads := host.loads(t, *scripts)
	if len(loads) != 2 || !bytes.Equal(loads[testBundleRefs["app"]], tb.images["app"]) || !bytes.Equal(loads[testBundleRefs["controller"]], tb.images["controller"]) {
		t.Fatalf("docker load stdins: %d", len(loads))
	}
	host.mu.Lock()
	env := string(host.stdins[3])
	host.mu.Unlock()
	if !strings.Contains(env, "\nCCG_CONTROLLER_IMAGE="+testBundleRefs["controller"]+"\n") || !strings.Contains(env, "CCG_APP_IMAGE="+testBundleRefs["app"]+"\n") {
		t.Fatalf("controller environment: %s", env)
	}
	// docker load failing for the required controller image: nothing is
	// replaced.
	g, host2 := newRuntimeOpsFixture(t, cfg)
	tb.use(g.s)
	host2.missing, host2.loadExit = []string{"controller"}, 1
	if code, out := g.request(g.user("admin@x"), "POST", "/system/ccgateway/runtime/install", ""); code != 503 || reason(out) != "image_load_failed" {
		t.Fatalf("load failed: %d %v", code, out)
	}
	if got := host2.kinds(); got != "missing,load" {
		t.Fatalf("scripts after a failed load: %s", got)
	}
	// An override is not the bundled image: it is pulled as before.
	h, host3 := newRuntimeOpsFixture(t, Config{Mode: "ssh", Host: cfg.Host, Port: 22, User: cfg.User, AuthMode: "password", Password: "ssh-secret",
		HostKeyFingerprint: cfg.HostKeyFingerprint, AccountRuntimes: true, AdminKey: panelKey,
		Images: &RuntimeImages{App: "ccgateway:manual", Egress: "ccg-egress:manual", Controller: "ccg-controller:manual"}})
	tb.use(h.s)
	host3.health = controllerHealth{AppImage: "ccgateway:manual", EgressImage: "ccg-egress:manual"}
	host3.missing = []string{"app", "egress", "controller"}
	if code, out := h.request(h.user("admin@x"), "POST", "/system/ccgateway/runtime/install", ""); code != 200 || !strings.HasPrefix(host3.kinds(), "install,finish") {
		t.Fatalf("overrides: %d %v %s", code, out, host3.kinds())
	}
}

func TestControllerInstallLoadsBundledImages(t *testing.T) {
	// Local install (§53.9): the workload images are optional, the
	// controller and the gateway required; each load runs on this machine.
	p := newPanelInstall(t)
	tb := makeBundle(t, "0.1.16", nil)
	tb.use(p.f.s)
	scripts := recordScripts(p.f, p.host)
	p.host.health = controllerHealth{Version: "0.1.16", AppImage: testBundleRefs["app"], EgressImage: testBundleRefs["egress"], Features: []string{"tunnel"}}
	p.host.missing = []string{"egress", "controller", "gateway"}
	code, out := p.install(p.f.user("admin@x"), `{"method":"local","scheme":"http","host":"127.0.0.1","port":`+strconv.Itoa(p.plainPort)+`}`)
	if code != 200 {
		t.Fatalf("install: %d %v (%s)", code, out, p.host.kinds())
	}
	if got := p.host.kinds(); got != "port,missing,load,load,install,finish,missing,load,gateway" {
		t.Fatalf("scripts: %s", got)
	}
	p.host.mu.Lock()
	for i, target := range p.host.targets {
		if target != "local" {
			t.Fatalf("script %d ran on %s", i, target)
		}
	}
	p.host.mu.Unlock()
	loads := p.host.loads(t, *scripts)
	for _, role := range []string{"egress", "controller", "gateway"} {
		if !bytes.Equal(loads[testBundleRefs[role]], tb.images[role]) {
			t.Fatalf("%s: docker load stdin is not the bundled file", role)
		}
	}
	if gw := (*scripts)[len(*scripts)-1]; !strings.Contains(gw, "GW='"+testBundleRefs["gateway"]+"'") {
		t.Fatalf("gateway script does not use the bundled Caddy:\n%s", gw)
	}
	// An optional workload image that cannot be loaded does not stop the
	// install (the install script then tries to pull it).
	q := newPanelInstall(t)
	tb.use(q.f.s)
	q.host.health = p.host.health
	q.host.missing, q.host.loadExit = []string{"app"}, 1
	if code, out := q.install(q.f.user("admin@x"), `{"method":"local","scheme":"http","host":"127.0.0.1","port":`+strconv.Itoa(q.plainPort)+`}`); code != 200 || q.host.kinds() != "port,missing,load,install,finish,missing,gateway" {
		t.Fatalf("optional image: %d %v %s", code, out, q.host.kinds())
	}
}

// bundlePanel is a controller (§53.5) that knows which images its host has:
// uploads are loaded from the fake archive's first line, PUT /runtime/images
// and the self-upgrade fail with image_pull_failed for images it lacks.
type bundlePanel struct {
	mu       sync.Mutex
	health   controllerHealth
	local    map[string]bool
	uploads  map[string]*bundleUpload
	next     int
	calls    []string
	chunks   []int64
	received map[string][]byte // ref -> uploaded archive
	failLoad map[string]bool   // ref -> load answers 400 load_failed
	failPut  int               // PUT chunk answers 503 this often first
	runtimes []string
	workers  []string
}

type bundleUpload struct {
	size int64
	sum  string
	data []byte
}

func (p *bundlePanel) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	p.mu.Lock()
	defer p.mu.Unlock()
	if r.Header.Get("Authorization") != "Bearer "+panelKey {
		w.WriteHeader(401)
		return
	}
	body, _ := io.ReadAll(r.Body)
	call := r.Method + " " + r.URL.Path
	p.calls = append(p.calls, call)
	reply := func(code int, v any) {
		w.WriteHeader(code)
		_ = json.NewEncoder(w).Encode(v)
	}
	id, rest, _ := strings.Cut(strings.TrimPrefix(r.URL.Path, "/images/uploads/"), "/")
	switch {
	case call == "GET /health":
		reply(200, p.health)
	case call == "POST /images/uploads":
		var in struct {
			Size   int64  `json:"size"`
			SHA256 string `json:"sha256"`
		}
		_ = json.Unmarshal(body, &in)
		p.next++
		id := strings.Repeat("u", 21) + strconv.Itoa(p.next%10)
		p.uploads[id] = &bundleUpload{size: in.Size, sum: in.SHA256}
		reply(200, map[string]any{"upload_id": id, "offset": 0, "size": in.Size})
	case r.Method == "PUT" && strings.HasPrefix(r.URL.Path, "/images/uploads/"):
		u := p.uploads[id]
		if p.failPut > 0 {
			p.failPut--
			reply(503, map[string]string{"error": "busy"})
			return
		}
		p.chunks = append(p.chunks, r.ContentLength)
		if off, _ := strconv.ParseInt(r.Header.Get("X-CCG-Offset"), 10, 64); off != int64(len(u.data)) {
			reply(409, map[string]any{"error": "offset_mismatch", "offset": len(u.data)})
			return
		}
		u.data = append(u.data, body...)
		reply(200, map[string]any{"offset": len(u.data), "size": u.size})
	case r.Method == "DELETE" && strings.HasPrefix(r.URL.Path, "/images/uploads/"):
		delete(p.uploads, id)
		reply(200, map[string]any{"deleted": true})
	case r.Method == "POST" && rest == "load":
		u := p.uploads[id]
		delete(p.uploads, id)
		sum := sha256.Sum256(u.data)
		if int64(len(u.data)) != u.size || hex.EncodeToString(sum[:]) != u.sum {
			reply(400, map[string]string{"error": "checksum_mismatch"})
			return
		}
		line, _, _ := strings.Cut(string(u.data), "\n")
		ref := strings.TrimPrefix(line, "IMAGE ")
		if p.failLoad[ref] {
			reply(400, map[string]string{"error": "load_failed"})
			return
		}
		p.local[ref] = true
		p.received[ref] = u.data
		reply(200, map[string]any{"sha256": u.sum, "images": []map[string]any{{"id": "sha256:" + strings.Repeat("d", 64), "tags": []string{ref}}}})
	case call == "PUT /runtime/images":
		var in map[string]string
		_ = json.Unmarshal(body, &in)
		for _, ref := range in {
			if !p.local[ref] {
				reply(503, map[string]string{"error": "image_pull_failed"})
				return
			}
		}
		if v, ok := in["app"]; ok {
			p.health.AppImage = v
		}
		if v, ok := in["egress"]; ok {
			p.health.EgressImage = v
		}
		reply(200, p.health)
	case call == "POST /runtime/controller":
		var in map[string]string
		_ = json.Unmarshal(body, &in)
		if !p.local[in["image"]] {
			reply(503, map[string]string{"error": "image_pull_failed"})
			return
		}
		p.health.ControllerImage = in["image"]
		reply(202, map[string]any{"accepted": true})
	case call == "GET /accounts":
		list := []map[string]string{}
		for _, key := range p.runtimes {
			list = append(list, map[string]string{"key": key, "status": "ready"})
		}
		reply(200, map[string]any{"runtimes": list})
	case r.Method == "POST" && strings.HasPrefix(r.URL.Path, "/accounts/") && strings.HasSuffix(r.URL.Path, "/worker"):
		var in map[string]string
		_ = json.Unmarshal(body, &in)
		p.workers = append(p.workers, strings.TrimSuffix(strings.TrimPrefix(r.URL.Path, "/accounts/"), "/worker")+" "+in["image"])
		reply(200, map[string]string{"status": "updated", "sha256": strings.Repeat("1", 64)})
	default:
		reply(404, map[string]string{"error": "not_found"})
	}
}

func (p *bundlePanel) seen() string {
	p.mu.Lock()
	defer p.mu.Unlock()
	return strings.Join(p.calls, ",")
}

func newBundlePanel(t *testing.T) (*runtimeFixture, *bundlePanel, *testBundle) {
	t.Helper()
	f := newRuntimeFixture(t, newFakeController(t).ServeHTTP)
	panel := &bundlePanel{local: map[string]bool{"ccgateway:old": true, "ccg-controller:old": true}, uploads: map[string]*bundleUpload{},
		received: map[string][]byte{}, failLoad: map[string]bool{},
		health: controllerHealth{Version: "old", AppImage: "ccgateway:old", EgressImage: testBundleRefs["egress"], ControllerImage: "ccg-controller:old",
			Features: []string{"tunnel", "uploads", "runtime-images", "self-upgrade", "worker-update"}}}
	panel.local[testBundleRefs["egress"]] = true
	_, host, port, ca := tlsPanel(t, panel.ServeHTTP)
	f.writeConfig(testPanelConfig(host, port, ca))
	tb := makeBundle(t, "0.1.16", nil)
	tb.use(f.s)
	controllerUpgradeWait, controllerUpgradeEvery = 2*time.Second, 50*time.Millisecond
	bundleChunk, bundleRetryDelay = 1000, 10*time.Millisecond
	t.Cleanup(func() {
		controllerUpgradeWait, controllerUpgradeEvery = 90*time.Second, 3*time.Second
		bundleChunk, bundleRetryDelay = 16<<20, 2*time.Second
	})
	return f, panel, tb
}

func TestRuntimeBundled(t *testing.T) {
	f, panel, tb := newBundlePanel(t)
	admin := f.user("admin@x")
	panel.runtimes = []string{"5"}
	// A manual override of the app image: pushing the bundled one removes it
	// so later plugin versions are not hidden behind it.
	cfg, _ := f.s.Load(context.Background())
	cfg.Images = &RuntimeImages{App: "ccgateway:old"}
	f.writeConfig(cfg)
	panel.mu.Lock()
	panel.failPut = 1 // the first chunk is retried
	panel.mu.Unlock()
	code, out := f.request(admin, "POST", "/system/ccgateway/runtime/bundled", "")
	if code != 200 {
		t.Fatalf("bundled: %d %v", code, out)
	}
	results := string(mustJSON(data(out)["results"]))
	want := `[{"ref":"` + testBundleRefs["controller"] + `","role":"controller","status":"loaded"},` +
		`{"ref":"` + testBundleRefs["egress"] + `","role":"egress","status":"present"},` +
		`{"ref":"` + testBundleRefs["app"] + `","role":"app","status":"loaded"}]`
	if results != want {
		t.Fatalf("results: %s", results)
	}
	panel.mu.Lock()
	gotApp, gotCtl, chunks := panel.received[testBundleRefs["app"]], panel.received[testBundleRefs["controller"]], append([]int64(nil), panel.chunks...)
	_, egressSent := panel.received[testBundleRefs["egress"]]
	health, workers, left := panel.health, strings.Join(panel.workers, ","), len(panel.uploads)
	panel.mu.Unlock()
	if !bytes.Equal(gotApp, tb.images["app"]) || !bytes.Equal(gotCtl, tb.images["controller"]) || egressSent {
		t.Fatalf("uploaded archives differ (egress sent: %v)", egressSent)
	}
	// 1000-byte chunks: controller 1000; app 1000, 1000, 500.
	if s := fmt.Sprint(chunks); s != "[1000 1000 1000 500]" {
		t.Fatalf("chunks: %s", s)
	}
	if health.ControllerImage != testBundleRefs["controller"] || health.AppImage != testBundleRefs["app"] || left != 0 {
		t.Fatalf("controller: %+v, %d uploads left", health, left)
	}
	calls := panel.seen()
	if strings.Index(calls, "POST /runtime/controller") > strings.Index(calls, "PUT /runtime/images") ||
		strings.Index(calls, "PUT /runtime/images") > strings.Index(calls, "POST /accounts/5/worker") {
		t.Fatalf("order: %s", calls)
	}
	if workers != "5 "+testBundleRefs["app"] {
		t.Fatalf("workers: %s", workers)
	}
	w, _ := data(out)["workers"].(map[string]any)
	if w["image"] != testBundleRefs["app"] {
		t.Fatalf("workers report: %v", out)
	}
	rt, _ := data(out)["runtime"].(map[string]any)
	if rt["up_to_date"] != true || rt["bundled"] == nil {
		t.Fatalf("runtime: %v", rt)
	}
	if saved, _ := f.s.Load(context.Background()); saved.Images != nil || saved.EffectiveImages().App != testBundleRefs["app"] {
		t.Fatalf("override kept: %+v", saved.Images)
	}
	var n int
	_ = f.db.Pool.QueryRow(context.Background(), `SELECT count(*) FROM audit_logs WHERE action='ccgateway.runtime.bundled' AND detail->>'version'='0.1.16'`).Scan(&n)
	if n != 1 {
		t.Fatalf("audit: %d", n)
	}
	// Everything present now: nothing is sent.
	before := panel.seen()
	code, out = f.request(admin, "POST", "/system/ccgateway/runtime/bundled", `{"roles":["app","controller"]}`)
	if code != 200 || strings.Count(string(mustJSON(data(out)["results"])), `"present"`) != 2 || data(out)["workers"] != nil {
		t.Fatalf("present: %d %v", code, out)
	}
	if after := panel.seen(); strings.Contains(strings.TrimPrefix(after, before), "/images/uploads") {
		t.Fatalf("uploaded again: %s", after)
	}
}

func TestRuntimeBundledFailures(t *testing.T) {
	f, panel, _ := newBundlePanel(t)
	admin := f.user("admin@x")
	// A role the controller cannot load fails alone.
	panel.mu.Lock()
	panel.failLoad[testBundleRefs["controller"]] = true
	panel.mu.Unlock()
	code, out := f.request(admin, "POST", "/system/ccgateway/runtime/bundled", `{"roles":["controller","app"]}`)
	results := string(mustJSON(data(out)["results"]))
	if code != 200 || !strings.Contains(results, `{"reason":"load_failed","ref":"`+testBundleRefs["controller"]+`","role":"controller","status":"failed"}`) ||
		!strings.Contains(results, `{"ref":"`+testBundleRefs["app"]+`","role":"app","status":"loaded"}`) {
		t.Fatalf("partial: %d %v", code, out)
	}
	panel.mu.Lock()
	left := len(panel.uploads)
	panel.mu.Unlock()
	if left != 0 {
		t.Fatalf("%d uploads left behind", left)
	}
	for name, body := range map[string]string{"gateway": `{"roles":["gateway"]}`, "empty": `{"roles":[]}`, "json": `{`} {
		if code, out := f.request(admin, "POST", "/system/ccgateway/runtime/bundled", body); code != 400 || reason(out) != "invalid_request" {
			t.Errorf("%s: %d %v", name, code, out)
		}
	}
	f.auth.keys[2] = []string{"settings:read"}
	if code, _ := f.request(2, "POST", "/system/ccgateway/runtime/bundled", ""); code != 403 {
		t.Fatalf("settings:read: %d", code)
	}
	f.s.installMu.Lock()
	code, out = f.request(admin, "POST", "/system/ccgateway/runtime/bundled", "")
	f.s.installMu.Unlock()
	if code != 409 || reason(out) != "install_in_progress" {
		t.Fatalf("locked: %d %v", code, out)
	}
	// A package without images, or a wrong file: refused / failed.
	f.s.Bundle = func() (BundlePackage, bool) { return BundlePackage{}, false }
	if code, out = f.request(admin, "POST", "/system/ccgateway/runtime/bundled", ""); code != 400 || reason(out) != "no_bundled_images" {
		t.Fatalf("no bundle: %d %v", code, out)
	}
	makeBundle(t, "0.1.17", func(m map[string]any) {
		m["images"].(map[string]any)["egress"].(map[string]any)["sha256"] = strings.Repeat("0", 64)
	}).use(f.s)
	panel.mu.Lock()
	panel.health.EgressImage = "ccg-egress:other"
	panel.mu.Unlock()
	before := panel.seen()
	code, out = f.request(admin, "POST", "/system/ccgateway/runtime/bundled", `{"roles":["egress"]}`)
	if code != 200 || string(mustJSON(data(out)["results"])) != `[{"reason":"bundle_invalid","ref":"`+testBundleRefs["egress"]+`","role":"egress","status":"failed"}]` {
		t.Fatalf("checksum: %d %v", code, out)
	}
	if strings.Contains(strings.TrimPrefix(panel.seen(), before), "/images/uploads") {
		t.Fatal("a mismatching archive was sent")
	}
	f.writeConfig(sshConfig)
	if code, out = f.request(admin, "POST", "/system/ccgateway/runtime/bundled", ""); code != 400 || reason(out) != "controller_not_configured" {
		t.Fatalf("ssh mode: %d %v", code, out)
	}
}

func TestOneClickUpgradePushesBundledImages(t *testing.T) {
	f, panel, tb := newBundlePanel(t)
	admin := f.user("admin@x")
	code, out := f.request(admin, "POST", "/system/ccgateway/runtime/install", "")
	if code != 200 || data(out)["up_to_date"] != true {
		t.Fatalf("upgrade: %d %v", code, out)
	}
	panel.mu.Lock()
	gotApp, gotCtl := panel.received[testBundleRefs["app"]], panel.received[testBundleRefs["controller"]]
	_, egressSent := panel.received[testBundleRefs["egress"]]
	health := panel.health
	panel.mu.Unlock()
	if !bytes.Equal(gotApp, tb.images["app"]) || !bytes.Equal(gotCtl, tb.images["controller"]) || egressSent {
		t.Fatalf("pushed: app %d, controller %d, egress %v", len(gotApp), len(gotCtl), egressSent)
	}
	if health.AppImage != testBundleRefs["app"] || health.ControllerImage != testBundleRefs["controller"] {
		t.Fatalf("controller: %+v", health)
	}
	// Images the controller has (or pulls) are never pushed.
	before := panel.seen()
	if code, _ := f.request(admin, "POST", "/system/ccgateway/runtime/install", ""); code != 200 || strings.Contains(strings.TrimPrefix(panel.seen(), before), "/images/uploads") {
		t.Fatalf("second upgrade: %d %s", code, panel.seen())
	}
}
