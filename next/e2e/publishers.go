package e2e

import (
	"fmt"
	"net/http"
	"os"
	"os/exec"
	"path/filepath"
	"runtime"
	"strings"
	"testing"
)

// RegisterPublisher creates a publisher with trust level (verified|community)
// and registers key for it. Returns the publisher id.
func (e *Env) RegisterPublisher(admin *Session, key *SigningKey, trust string) int64 {
	e.T.Helper()
	d := admin.OK(e.T, http.MethodPost, "/publishers", map[string]any{"name": key.Publisher, "trust_level": trust}, admin.StepUp(e.T))
	id := d.Get("id").Int()
	if id == 0 {
		e.T.Fatalf("POST /publishers returned no id: %s", d.Raw)
	}
	admin.OK(e.T, http.MethodPost, fmt.Sprintf("/publishers/%d/keys", id),
		map[string]any{"key_id": key.KeyID, "public_key": key.PublicB64()}, admin.StepUp(e.T))
	return id
}

// DerivedGuardPackage builds a third-party package from the official guard
// package: new plugin key and schema, publisher = key.Publisher, signed with
// key. Unless keepNative, everything requiring ui.native is stripped so the
// package is acceptable for community/verified publishers.
func (e *Env) DerivedGuardPackage(pluginKey string, key *SigningKey, keepNative bool) Package {
	e.T.Helper()
	pkg := ReadPackage(e.T, e.MarketPackage("guard", e.defaultVersion("guard")))
	m := pkg.Manifest(e.T)
	m["key"] = pluginKey
	m["publisher"] = key.Publisher
	m["name"] = map[string]any{"en": "E2E " + pluginKey, "zh": "E2E " + pluginKey}
	if db, ok := m["database"].(map[string]any); ok {
		db["schema"] = "plg_" + pluginKey
	}
	if !keepNative {
		delete(m, "hostUICompat")
		if ui, ok := m["ui"].(map[string]any); ok {
			delete(ui, "native")
			delete(ui, "slots")
			pages, _ := ui["pages"].(map[string]any)
			for id, p := range pages {
				if pm, ok := p.(map[string]any); ok && pm["type"] == "native" {
					delete(pages, id)
				}
			}
			if menus, ok := ui["menus"].([]any); ok {
				var keep []any
				for _, mn := range menus {
					if mm, ok := mn.(map[string]any); ok {
						if _, still := pages[fmt.Sprint(mm["page"])]; !still {
							continue
						}
					}
					keep = append(keep, mn)
				}
				ui["menus"] = keep
			}
		}
		if hps, ok := m["hostPermissions"].([]any); ok {
			var keep []any
			for _, hp := range hps {
				if hm, ok := hp.(map[string]any); ok && hm["id"] == "ui.native" {
					continue
				}
				keep = append(keep, hp)
			}
			m["hostPermissions"] = keep
		}
		for p := range pkg {
			if strings.HasPrefix(p, "ui/native/") {
				delete(pkg, p)
			}
		}
	}
	// The host checks GetInfo against the package, so the binaries must
	// report the new key: rebuild them with the SDK build-time key.
	for p := range pkg {
		if rest, ok := strings.CutPrefix(p, "runtimes/"); ok {
			osArch, _, _ := strings.Cut(rest, "/")
			goos, goarch, _ := strings.Cut(osArch, "-")
			pkg[p] = buildGuardBinary(e.T, goos, goarch, pluginKey, fmt.Sprint(m["version"]))
		}
	}
	pkg.SetManifest(e.T, m)
	pkg.Sign(e.T, key)
	return pkg
}

// buildGuardBinary compiles plugins/guard with an overridden plugin key.
func buildGuardBinary(t testing.TB, goos, goarch, key, version string) []byte {
	t.Helper()
	_, self, _, _ := runtime.Caller(0)
	dir := filepath.Join(filepath.Dir(self), "..", "plugins", "guard")
	out := filepath.Join(t.TempDir(), "plugin")
	sdk := "github.com/Sub2API-Devs/sup2api/next/sdk/pluginsdk"
	cmd := exec.Command("go", "build", "-trimpath", "-o", out,
		"-ldflags", fmt.Sprintf("-s -w -X %s.buildKey=%s -X %s.buildVersion=%s", sdk, key, sdk, version), ".")
	cmd.Dir = dir
	cmd.Env = append(os.Environ(), "GOOS="+goos, "GOARCH="+goarch, "CGO_ENABLED=0")
	if b, err := cmd.CombinedOutput(); err != nil {
		t.Fatalf("build guard for %s: %v\n%s", key, err, b)
	}
	b, err := os.ReadFile(out)
	if err != nil {
		t.Fatal(err)
	}
	return b
}
