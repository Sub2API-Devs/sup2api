package main

import (
	"archive/zip"
	"bytes"
	"context"
	"encoding/json"
	"os"
	"os/exec"
	"path/filepath"
	"runtime"
	"strings"
	"testing"

	"github.com/hashicorp/go-hclog"
	"github.com/hashicorp/go-plugin"

	pluginv1 "github.com/Sub2API-Devs/sup2api/next/sdk/gen/pluginv1"
	"github.com/Sub2API-Devs/sup2api/next/sdk/pkgsig"
	"github.com/Sub2API-Devs/sup2api/next/sdk/protocol"
)

func runOK(t *testing.T, args ...string) string {
	t.Helper()
	var out, errb bytes.Buffer
	if code := run(args, &out, &errb); code != 0 {
		t.Fatalf("%v: exit %d\nstdout: %s\nstderr: %s", args, code, out.String(), errb.String())
	}
	return out.String()
}

func runFail(t *testing.T, args ...string) string {
	t.Helper()
	var out, errb bytes.Buffer
	if code := run(args, &out, &errb); code == 0 {
		t.Fatalf("%v: expected failure\nstdout: %s", args, out.String())
	}
	return errb.String()
}

func writeFile(t *testing.T, p, content string) {
	t.Helper()
	if err := os.MkdirAll(filepath.Dir(p), 0o755); err != nil {
		t.Fatal(err)
	}
	if err := os.WriteFile(p, []byte(content), 0o644); err != nil {
		t.Fatal(err)
	}
}

const demoManifest = `{
  "apiVersion": 1, "key": "demo", "name": {"en": "Demo", "zh": "演示"}, "version": "0.1.0",
  "publisher": "tester", "runtime": "grpc", "entry": {"grpc": {"binaries": "runtimes/{os}-{arch}/plugin"}},
  "hostCompat": ">=0.1.0 <0.2.0", "capabilities": [{"id": "http.routes.v1"}],
  "database": {"schema": "plg_demo", "migrations": "migrations/"},
  "ui": {"native": {"entry": "ui/native/entry.js"}, "settings": {"mode": "schema", "schema": "forms/s.json"}}
}`

// demoPlugin creates a plugin directory with fake runtimes.
func demoPlugin(t *testing.T) string {
	t.Helper()
	dir := t.TempDir()
	writeFile(t, filepath.Join(dir, "manifest.json"), demoManifest)
	writeFile(t, filepath.Join(dir, "forms", "s.json"), `{}`)
	writeFile(t, filepath.Join(dir, "migrations", "0001_init.sql"), `CREATE TABLE t (id int);`)
	writeFile(t, filepath.Join(dir, "ui", "native", "src", "main.ts"), `source, not packed`)
	writeFile(t, filepath.Join(dir, "ui", "native", "dist", "entry.js"), `export function register() {}`)
	writeFile(t, filepath.Join(dir, "ui", "native", "dist", "assets", "a.css"), `.a{}`)
	writeFile(t, filepath.Join(dir, "ui", "iframe", "index.html"), `<html></html>`)
	writeFile(t, filepath.Join(dir, "i18n", "en.json"), `{}`)
	writeFile(t, filepath.Join(dir, "runtimes", "linux-amd64", "plugin"), "ELF-amd64")
	writeFile(t, filepath.Join(dir, "runtimes", "linux-arm64", "plugin"), "ELF-arm64")
	writeFile(t, filepath.Join(dir, ".hidden"), "skip me")
	writeFile(t, filepath.Join(dir, "testdata", "v2", "manifest.patch.json"), `{"version": "0.2.0", "name": {"zh": null}}`)
	writeFile(t, filepath.Join(dir, "testdata", "v2", "migrations", "0002_more.sql"), `ALTER TABLE t ADD COLUMN x int;`)
	return dir
}

func TestPackSignVerifyIndex(t *testing.T) {
	dir := demoPlugin(t)
	keys := t.TempDir()
	market := t.TempDir()

	out := runOK(t, "keygen", "--key-id", "dev-1", "--out", keys)
	if !strings.Contains(out, "public_key:") {
		t.Fatalf("keygen output: %s", out)
	}
	runFail(t, "keygen", "--key-id", "dev-1", "--out", keys) // no overwrite
	priv := filepath.Join(keys, "dev-1.key")
	pub := filepath.Join(keys, "dev-1.pub")

	pkg1 := strings.TrimSpace(runOK(t, "pack", "--dir", dir, "--out-dir", market))
	if filepath.Base(pkg1) != "demo-0.1.0.s2plugin" {
		t.Fatalf("pkg1 = %s", pkg1)
	}
	files, err := readPackage(pkg1)
	if err != nil {
		t.Fatal(err)
	}
	for _, want := range []string{"manifest.json", "forms/s.json", "migrations/0001_init.sql", "ui/native/entry.js",
		"ui/native/assets/a.css", "ui/iframe/index.html", "i18n/en.json", "runtimes/linux-amd64/plugin", "runtimes/linux-arm64/plugin"} {
		if _, ok := files[want]; !ok {
			t.Errorf("missing %s", want)
		}
	}
	for p := range files {
		if strings.Contains(p, "src/") || strings.Contains(p, ".hidden") || strings.HasPrefix(p, "testdata") || strings.Contains(p, "dist/") {
			t.Errorf("unexpected %s", p)
		}
	}
	zr, _ := zip.OpenReader(pkg1)
	for _, f := range zr.File {
		if f.Name == "runtimes/linux-amd64/plugin" && f.Mode().Perm() != 0o755 {
			t.Errorf("runtime mode = %v", f.Mode())
		}
	}
	zr.Close()

	// Deterministic output.
	again := filepath.Join(t.TempDir(), "again.s2plugin")
	runOK(t, "pack", "--dir", dir, "--out", again)
	a, _ := os.ReadFile(pkg1)
	b, _ := os.ReadFile(again)
	if !bytes.Equal(a, b) {
		t.Error("pack output is not deterministic")
	}

	// Overlay: 0.2.0 with an extra migration and a patched manifest.
	pkg2 := strings.TrimSpace(runOK(t, "pack", "--dir", dir, "--overlay", "testdata/v2", "--out-dir", market))
	files2, _ := readPackage(pkg2)
	if _, ok := files2["migrations/0002_more.sql"]; !ok || filepath.Base(pkg2) != "demo-0.2.0.s2plugin" {
		t.Fatalf("overlay package %s: %v", pkg2, keysOf(files2))
	}
	var m2 map[string]any
	_ = json.Unmarshal(files2["manifest.json"], &m2)
	if m2["version"] != "0.2.0" || m2["name"].(map[string]any)["zh"] != nil || m2["key"] != "demo" {
		t.Fatalf("patched manifest = %v", m2)
	}

	// Unsigned verify fails; sign; verify ok.
	runFail(t, "verify", "--pub", pub, pkg1)
	runOK(t, "sign", pkg1, pkg2, "--key", priv, "--key-id", "dev-1")
	out = runOK(t, "verify", "--pub", pub, pkg1, pkg2)
	if strings.Count(out, "OK ") != 2 {
		t.Fatalf("verify output: %s", out)
	}
	files, _ = readPackage(pkg1)
	var sig pkgsig.Signature
	_ = json.Unmarshal(files[pkgsig.SignatureFile], &sig)
	if sig.Publisher != "tester" || sig.KeyID != "dev-1" || sig.Algorithm != "ed25519" {
		t.Fatalf("signature = %+v", sig)
	}
	// Re-signing replaces the signature.
	runOK(t, "sign", "--key", priv, "--key-id", "dev-1", pkg1)
	runOK(t, "verify", "--pub", pub, pkg1)

	// Tampering is detected.
	files["runtimes/linux-amd64/plugin"] = []byte("evil")
	tampered := filepath.Join(t.TempDir(), "tampered.s2plugin")
	if err := writePackage(tampered, files); err != nil {
		t.Fatal(err)
	}
	if msg := runFail(t, "verify", "--pub", pub, tampered); !strings.Contains(msg, "digest mismatch") {
		t.Fatalf("tamper message: %s", msg)
	}
	// Wrong key.
	other := t.TempDir()
	runOK(t, "keygen", "--key-id", "other", "--out", other)
	runFail(t, "verify", "--pub", filepath.Join(other, "other.pub"), pkg1)

	// Index.
	runOK(t, "index", "--dir", market, "--key", priv)
	raw, err := os.ReadFile(filepath.Join(market, "index.json"))
	if err != nil {
		t.Fatal(err)
	}
	sigLine, _ := os.ReadFile(filepath.Join(market, "index.json.sig"))
	pubKey, err := loadPublicKey(pub)
	if err != nil {
		t.Fatal(err)
	}
	if !verifyIndex(raw, string(sigLine), pubKey) || strings.Contains(string(sigLine), "\n") {
		t.Fatal("index signature invalid")
	}
	var idx marketIndex
	if err := json.Unmarshal(raw, &idx); err != nil {
		t.Fatal(err)
	}
	if idx.Version != 1 || len(idx.Plugins) != 1 || len(idx.Plugins[0].Versions) != 2 {
		t.Fatalf("index = %s", raw)
	}
	p := idx.Plugins[0]
	if p.Key != "demo" || p.Publisher != "tester" || p.Versions[0].Version != "0.1.0" || p.Versions[1].Version != "0.2.0" ||
		p.Versions[0].URL != "demo-0.1.0.s2plugin" || len(p.Versions[0].SHA256) != 64 || p.Versions[0].HostCompat != ">=0.1.0 <0.2.0" {
		t.Fatalf("index plugin = %+v", p)
	}
	st, _ := os.Stat(pkg1)
	if p.Versions[0].Size != st.Size() {
		t.Fatalf("size = %d, want %d", p.Versions[0].Size, st.Size())
	}
	runOK(t, "index", "--dir", market, "--key", priv, "--base-url", "https://example.com/m/")
	raw, _ = os.ReadFile(filepath.Join(market, "index.json"))
	if !strings.Contains(string(raw), `"url": "https://example.com/m/demo-0.1.0.s2plugin"`) {
		t.Fatalf("base url index = %s", raw)
	}
}

func TestPackChecks(t *testing.T) {
	dir := demoPlugin(t)
	out := t.TempDir()
	if err := os.RemoveAll(filepath.Join(dir, "ui", "native", "dist")); err != nil {
		t.Fatal(err)
	}
	if msg := runFail(t, "pack", "--dir", dir, "--out-dir", out); !strings.Contains(msg, "native UI entry") {
		t.Fatalf("msg = %s", msg)
	}
	runOK(t, "pack", "--dir", dir, "--out-dir", out, "--allow-missing-ui")

	if err := os.RemoveAll(filepath.Join(dir, "migrations")); err != nil {
		t.Fatal(err)
	}
	if msg := runFail(t, "pack", "--dir", dir, "--out-dir", out, "--allow-missing-ui"); !strings.Contains(msg, "migrations") {
		t.Fatalf("msg = %s", msg)
	}
	writeFile(t, filepath.Join(dir, "manifest.json"), strings.Replace(demoManifest, `"runtime"`, `"runtme"`, 1))
	if msg := runFail(t, "pack", "--dir", dir, "--out-dir", out); !strings.Contains(msg, "unknown field") {
		t.Fatalf("msg = %s", msg)
	}
	runFail(t, "pack", "--dir", dir)
	runFail(t, "nope")
}

// Account types are top-level (ARCHITECTURE 6.6): their form files are
// packed, and they need protocols and the platform adapter capability.
func TestPackAccountTypes(t *testing.T) {
	const m = `{
  "apiVersion": 1, "key": "relayx", "name": {"en": "Relay"}, "version": "0.1.0",
  "publisher": "tester", "runtime": "grpc", "entry": {"grpc": {"binaries": "runtimes/{os}-{arch}/plugin"}},
  "hostCompat": ">=0.1.0 <0.2.0", "capabilities": [{"id": "platform.adapter.v1"}],
  "accountTypes": [{"id": "relay_key", "label": {"en": "Relay key"},
    "form": {"mode": "schema", "schema": "forms/k.schema.json", "uiSchema": "forms/k.ui.json"},
    "sensitiveFields": ["api_key"], "protocols": [{"protocol": "anthropic.messages"}]}]
}`
	dir := t.TempDir()
	out := t.TempDir()
	writeFile(t, filepath.Join(dir, "manifest.json"), m)
	writeFile(t, filepath.Join(dir, "runtimes", "linux-amd64", "plugin"), "ELF-amd64")
	writeFile(t, filepath.Join(dir, "runtimes", "linux-arm64", "plugin"), "ELF-arm64")
	if msg := runFail(t, "pack", "--dir", dir, "--out-dir", out); !strings.Contains(msg, "forms/k.schema.json") || !strings.Contains(msg, "forms/k.ui.json") {
		t.Fatalf("msg = %s", msg)
	}
	writeFile(t, filepath.Join(dir, "forms", "k.schema.json"), `{}`)
	writeFile(t, filepath.Join(dir, "forms", "k.ui.json"), `{}`)
	pkg := strings.TrimSpace(runOK(t, "pack", "--dir", dir, "--out-dir", out))
	files, err := readPackage(pkg)
	if err != nil {
		t.Fatal(err)
	}
	if _, ok := files["forms/k.schema.json"]; !ok {
		t.Fatalf("form not packed: %v", keysOf(files))
	}

	writeFile(t, filepath.Join(dir, "manifest.json"), strings.Replace(m, `[{"protocol": "anthropic.messages"}]`, `[]`, 1))
	if msg := runFail(t, "pack", "--dir", dir, "--out-dir", out); !strings.Contains(msg, "no protocols") {
		t.Fatalf("msg = %s", msg)
	}
	writeFile(t, filepath.Join(dir, "manifest.json"), strings.Replace(m, `"platform.adapter.v1"`, `"http.routes.v1"`, 1))
	if msg := runFail(t, "pack", "--dir", dir, "--out-dir", out); !strings.Contains(msg, "platform.adapter.v1") {
		t.Fatalf("msg = %s", msg)
	}
	// The pre-6.6 layout (account types inside platform) is rejected.
	writeFile(t, filepath.Join(dir, "manifest.json"), strings.Replace(m, `"accountTypes": [`, `"platform": {"id": "x", "protocols": [], "accountTypes": []}, "x": [`, 1))
	if msg := runFail(t, "pack", "--dir", dir, "--out-dir", out); !strings.Contains(msg, "unknown field") {
		t.Fatalf("msg = %s", msg)
	}
}

func TestMergePatch(t *testing.T) {
	out, err := applyMergePatch([]byte(`{"a":1,"b":{"c":2,"d":3},"e":[1,2]}`), []byte(`{"a":null,"b":{"c":5},"e":[3],"f":"x"}`))
	if err != nil {
		t.Fatal(err)
	}
	var got map[string]any
	_ = json.Unmarshal(out, &got)
	want := `{"b":{"c":5,"d":3},"e":[3],"f":"x"}`
	gb, _ := json.Marshal(got)
	if string(gb) != want {
		t.Fatalf("got %s want %s", gb, want)
	}
}

func TestBuildRealPlugin(t *testing.T) {
	if testing.Short() {
		t.Skip("compiles a plugin")
	}
	dir := filepath.Join("..", "..", "plugins", "anthropic")
	out := t.TempDir()
	res := runOK(t, "build", "--dir", dir, "--out", out, "--platforms", "linux/amd64", "--dev", "--overlay", "testdata/v0.2.0")
	bin := filepath.Join(out, "runtimes", "linux-amd64", "plugin")
	if !strings.Contains(res, bin) {
		t.Fatalf("build output = %q", res)
	}
	b, err := os.ReadFile(bin)
	if err != nil || !bytes.HasPrefix(b, []byte("\x7fELF")) {
		t.Fatalf("binary: %v", err)
	}

	// Run the local (--dev) binary under go-plugin: the effective manifest
	// version must be reported (injected with -ldflags -X).
	local := filepath.Join(out, "runtimes", runtime.GOOS+"-"+runtime.GOARCH, binaryName(runtime.GOOS))
	client := plugin.NewClient(&plugin.ClientConfig{
		HandshakeConfig:  protocol.Handshake,
		Plugins:          protocol.PluginMap(&protocol.GRPCPlugin{}),
		Cmd:              exec.Command(local),
		AllowedProtocols: []plugin.Protocol{plugin.ProtocolGRPC},
		Logger:           hclog.NewNullLogger(),
	})
	defer client.Kill()
	rpc, err := client.Client()
	if err != nil {
		t.Fatalf("start plugin: %v", err)
	}
	raw, err := rpc.Dispense(protocol.PluginName)
	if err != nil {
		t.Fatal(err)
	}
	info, err := pluginv1.NewPluginServiceClient(raw.(*protocol.Client).Conn).GetInfo(context.Background(), &pluginv1.GetInfoRequest{})
	if err != nil || info.GetPluginKey() != "anthropic" || info.GetVersion() != "0.2.0" {
		t.Fatalf("GetInfo = %v %v", info, err)
	}
}

func keysOf(m map[string][]byte) []string {
	var out []string
	for k := range m {
		out = append(out, k)
	}
	return out
}
