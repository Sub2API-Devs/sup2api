package pkg

import (
	"archive/zip"
	"bytes"
	"errors"
	"io/fs"
	"strings"
	"testing"

	"github.com/Sub2API-Devs/sup2api/next/sdk/manifest"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/core"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/plugin/pkg/pkgtest"
)

type entry struct {
	name string
	body string
	mode fs.FileMode
}

func rawZip(t *testing.T, entries ...entry) []byte {
	t.Helper()
	var buf bytes.Buffer
	zw := zip.NewWriter(&buf)
	for _, e := range entries {
		h := &zip.FileHeader{Name: e.name, Method: zip.Deflate}
		if e.mode != 0 {
			h.SetMode(e.mode)
		}
		w, err := zw.CreateHeader(h)
		if err != nil {
			t.Fatal(err)
		}
		_, _ = w.Write([]byte(e.body))
	}
	if err := zw.Close(); err != nil {
		t.Fatal(err)
	}
	return buf.Bytes()
}

func TestUnpackRejectsUnsafeEntries(t *testing.T) {
	cases := map[string][]entry{
		"zip-slip":      {{name: "../evil", body: "x"}},
		"nested-slip":   {{name: "a/../../evil", body: "x"}},
		"absolute":      {{name: "/etc/passwd", body: "x"}},
		"drive":         {{name: "C:/x", body: "x"}},
		"backslash":     {{name: "a\\b", body: "x"}},
		"symlink":       {{name: "link", body: "/etc/passwd", mode: fs.ModeSymlink | 0o777}},
		"duplicate":     {{name: "a", body: "1"}, {name: "a", body: "2"}},
		"case-dup":      {{name: "A.txt", body: "1"}, {name: "a.txt", body: "2"}},
		"dot-segment":   {{name: "a/./b", body: "1"}},
		"empty-archive": {},
	}
	for name, entries := range cases {
		t.Run(name, func(t *testing.T) {
			_, err := Unpack(rawZip(t, entries...), Limits{})
			if err == nil {
				t.Fatal("expected error")
			}
			if core.AsError(err).Code != "invalid_argument" {
				t.Fatalf("code = %s", core.AsError(err).Code)
			}
		})
	}
}

func TestUnpackLimits(t *testing.T) {
	big := strings.Repeat("a", 1<<20) // compresses to almost nothing
	data := rawZip(t, entry{name: "a", body: big}, entry{name: "b", body: big})
	if _, err := Unpack(data, Limits{MaxUnpackedBytes: 1 << 20}); err == nil {
		t.Fatal("expected unpacked size error")
	}
	if _, err := Unpack(data, Limits{MaxPackageBytes: 10}); err == nil {
		t.Fatal("expected package size error")
	}
	if _, err := Unpack(data, Limits{MaxFiles: 1}); err == nil {
		t.Fatal("expected file count error")
	}
	files, err := Unpack(rawZip(t, entry{name: "dir/", mode: fs.ModeDir | 0o755}, entry{name: "dir/a", body: "x"}), Limits{})
	if err != nil {
		t.Fatal(err)
	}
	if string(files["dir/a"]) != "x" || len(files) != 1 {
		t.Fatalf("files = %v", files)
	}
	if _, err := Unpack([]byte("not a zip"), Limits{}); err == nil {
		t.Fatal("expected zip error")
	}
}

func opts() ValidateOptions {
	return ValidateOptions{HostVersion: "0.1.0-dev", MaxMemoryMB: 1024}
}

func fieldCodes(err error) map[string]string {
	out := map[string]string{}
	var e *core.Error
	if !errors.As(err, &e) {
		return out
	}
	fs, _ := e.Details["fields"].([]core.FieldError)
	for _, f := range fs {
		out[f.Field] = f.Code
	}
	return out
}

func TestValidateGuardOK(t *testing.T) {
	m := pkgtest.Guard("guard", "0.1.0", "sub2api")
	if err := Validate(m, pkgtest.Files(m), opts()); err != nil {
		t.Fatalf("validate: %v %v", err, fieldCodes(err))
	}
}

func TestValidateConsistency(t *testing.T) {
	type mut func(m *manifest.Manifest, files map[string][]byte)
	dropPerm := func(id string) mut {
		return func(m *manifest.Manifest, _ map[string][]byte) {
			out := m.HostPermissions[:0]
			for _, p := range m.HostPermissions {
				if p.ID != id {
					out = append(out, p)
				}
			}
			m.HostPermissions = out
		}
	}
	cases := []struct {
		name  string
		mut   mut
		field string
		code  string
	}{
		{"bad key", func(m *manifest.Manifest, _ map[string][]byte) { m.Key = "Guard" }, "key", "invalid_format"},
		{"bad semver", func(m *manifest.Manifest, _ map[string][]byte) { m.Version = "1.0" }, "version", "invalid_semver"},
		{"runtime", func(m *manifest.Manifest, _ map[string][]byte) { m.Runtime = "js" }, "runtime", "unsupported"},
		{"missing arm64", func(_ *manifest.Manifest, f map[string][]byte) { delete(f, "runtimes/linux-arm64/plugin") }, "entry.grpc.binaries", "binary_missing"},
		{"host compat", func(m *manifest.Manifest, _ map[string][]byte) { m.HostCompat = ">=0.2.0" }, "hostCompat", "incompatible"},
		{"unknown cap", func(m *manifest.Manifest, _ map[string][]byte) {
			m.Capabilities = append(m.Capabilities, manifest.Capability{ID: "x.v1"})
		}, "capabilities[4]", "unknown"},
		{"hooks without perm", dropPerm("gateway.hook"), "hooks", "missing_host_permission"},
		{"hook needs exceed", func(m *manifest.Manifest, _ map[string][]byte) {
			m.Hooks[0].Needs = append(m.Hooks[0].Needs, "messages")
		}, "hooks[0].needs", "exceeds_scope"},
		{"events exceed", func(m *manifest.Manifest, _ map[string][]byte) {
			m.Events.Subscribe = append(m.Events.Subscribe, "balance.changed")
		}, "events.subscribe", "exceeds_scope"},
		{"jobs perm", dropPerm("jobs"), "jobs", "missing_host_permission"},
		{"bad cron", func(m *manifest.Manifest, _ map[string][]byte) { m.Jobs[0].Schedule = "every day" }, "jobs[0].schedule", "invalid"},
		{"db schema name", func(m *manifest.Manifest, _ map[string][]byte) { m.Database.Schema = "plg_other" }, "database.schema", "invalid"},
		{"db perm", dropPerm("db.schema"), "database", "missing_host_permission"},
		{"no migrations", func(_ *manifest.Manifest, f map[string][]byte) { delete(f, "migrations/0001_init.sql") }, "database.migrations", "file_missing"},
		{"routes perm", dropPerm("routes.admin"), "routes[0].scope", "missing_host_permission"},
		{"route unknown permission", func(m *manifest.Manifest, _ map[string][]byte) { m.Routes[0].Permission = "nope:x" }, "routes[0].permission", "unknown"},
		{"menu perm", dropPerm("ui.menu"), "ui", "missing_host_permission"},
		{"native perm", dropPerm("ui.native"), "ui.native", "missing_host_permission"},
		{"native ui compat", func(m *manifest.Manifest, _ map[string][]byte) { m.HostUICompat = "" }, "hostUICompat", "required"},
		{"native entry missing", func(_ *manifest.Manifest, f map[string][]byte) { delete(f, "ui/native/entry.js") }, "ui.native.entry", "file_missing"},
		{"settings schema missing", func(_ *manifest.Manifest, f map[string][]byte) { delete(f, "forms/settings.schema.json") }, "ui.settings.schema", "file_missing"},
		{"iframe page", func(m *manifest.Manifest, _ map[string][]byte) {
			m.UI.Pages["frame"] = manifest.Page{Type: "iframe", Src: "ui/iframe/index.html"}
		}, "ui.pages.frame", "missing_host_permission"},
		{"memory cap", func(m *manifest.Manifest, _ map[string][]byte) { m.Resources.MemoryMB = 4096 }, "resources.memoryMB", "out_of_range"},
		{"user perm key", func(m *manifest.Manifest, _ map[string][]byte) { m.UserPermissions[0].Key = "Rules" }, "userPermissions[0].key", "invalid_format"},
		{"icon missing", func(m *manifest.Manifest, _ map[string][]byte) { m.Icon = "icon.png" }, "icon", "file_missing"},
		{"gateway without perm", func(m *manifest.Manifest, _ map[string][]byte) {
			m.Gateway = &manifest.Gateway{Endpoints: []manifest.Endpoint{{ID: "msg", Method: "POST", Path: "/v1/messages", Protocol: "anthropic.messages", Kind: "proxy", Auth: manifest.EndpointAuth{Headers: []string{"x-api-key"}}}}}
		}, "gateway", "missing_host_permission"},
		{"reserved endpoint", func(m *manifest.Manifest, _ map[string][]byte) {
			m.HostPermissions = append(m.HostPermissions, manifest.HostPermission{ID: "gateway.endpoint"})
			m.Gateway = &manifest.Gateway{Endpoints: []manifest.Endpoint{{ID: "x", Method: "GET", Path: "/api/v1/x", Protocol: "p", Kind: "proxy", Auth: manifest.EndpointAuth{Headers: []string{"x"}}}}}
		}, "gateway.endpoints[0].path", "invalid_path"},
		{"platform perms", func(m *manifest.Manifest, _ map[string][]byte) {
			m.Capabilities = append(m.Capabilities, manifest.Capability{ID: manifest.CapPlatformAdapter})
			m.HostPermissions = append(m.HostPermissions, manifest.HostPermission{ID: "platform.register"})
			m.Platform = &manifest.Platform{ID: "anthropic", Protocols: []string{"anthropic.messages"},
				AccountTypes: []manifest.AccountType{{ID: "apikey", Label: manifest.LocalizedText{"en": "API key"}, Form: manifest.Form{Mode: "native", Component: "X"}}}}
		}, "platform", "missing_host_permission"},
		{"sticky plugin source", func(m *manifest.Manifest, _ map[string][]byte) {
			m.Capabilities = append(m.Capabilities, manifest.Capability{ID: manifest.CapPlatformAdapter}, manifest.Capability{ID: manifest.CapSchedulerAffinity})
			m.HostPermissions = append(m.HostPermissions, manifest.HostPermission{ID: "platform.register"}, manifest.HostPermission{ID: "accounts.credentials"})
			m.Platform = &manifest.Platform{ID: "anthropic", Protocols: []string{"anthropic.messages"},
				AccountTypes: []manifest.AccountType{{ID: "apikey", Label: manifest.LocalizedText{"en": "API key"}, Form: manifest.Form{Mode: "native", Component: "X"}}},
				StickyRules:  []manifest.StickyRule{{Name: "s", KeySources: []manifest.StickyKeySource{{Type: "plugin"}}}}}
		}, "platform.stickyRules[0].keySources[0]", "missing_host_permission"},
	}
	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			m := pkgtest.Guard("guard", "0.1.0", "sub2api")
			files := pkgtest.Files(m)
			tc.mut(m, files)
			err := Validate(m, files, opts())
			if err == nil {
				t.Fatal("expected error")
			}
			codes := fieldCodes(err)
			if codes[tc.field] != tc.code {
				t.Fatalf("want %s=%s, got %v", tc.field, tc.code, codes)
			}
		})
	}
}

func TestValidateEndpointConflict(t *testing.T) {
	m := pkgtest.Guard("guard", "0.1.0", "sub2api")
	m.HostPermissions = append(m.HostPermissions, manifest.HostPermission{ID: "gateway.endpoint"})
	m.Gateway = &manifest.Gateway{Endpoints: []manifest.Endpoint{{ID: "msg", Method: "post", Path: "/v1/:kind/messages", Protocol: "anthropic.messages", Kind: "proxy", Auth: manifest.EndpointAuth{Headers: []string{"x-api-key"}}}}}
	o := opts()
	o.OtherEndpoints = []EndpointOwner{{PluginKey: "other", Method: "POST", Path: "/v1/:x/messages"}}
	codes := fieldCodes(Validate(m, pkgtest.Files(m), o))
	if codes["gateway.endpoints[0].path"] != "endpoint_conflict" {
		t.Fatalf("codes = %v", codes)
	}
	o.OtherEndpoints = []EndpointOwner{{PluginKey: "guard", Method: "POST", Path: "/v1/:x/messages"}}
	if err := Validate(m, pkgtest.Files(m), o); err != nil {
		t.Fatalf("own endpoint should not conflict: %v", fieldCodes(err))
	}
}

func TestValidateDevModeBinary(t *testing.T) {
	m := pkgtest.Minimal("mini", "0.1.0", "p")
	files := pkgtest.Files(m)
	o := opts()
	o.DevMode, o.GOOS, o.GOARCH = true, "windows", "amd64"
	if err := Validate(m, files, o); err == nil {
		t.Fatal("expected missing windows binary")
	}
	files["runtimes/windows-amd64/plugin.exe"] = []byte("MZ")
	if err := Validate(m, files, o); err != nil {
		t.Fatalf("dev mode: %v", fieldCodes(err))
	}
}

func TestCheckTrust(t *testing.T) {
	m := pkgtest.Guard("guard", "0.1.0", "sub2api")
	if err := CheckTrust(m, TrustVerified); err != nil {
		t.Fatal(err)
	}
	codes := fieldCodes(CheckTrust(m, TrustCommunity))
	if codes["ui.native"] != "trust_insufficient" {
		t.Fatalf("codes = %v", codes)
	}
	if err := CheckTrust(pkgtest.Minimal("mini", "0.1.0", "p"), TrustUnsigned); err != nil {
		t.Fatal(err)
	}
}

func TestScopeWithin(t *testing.T) {
	req := map[string]any{"domains": []any{"a.com", "b.com"}, "max_usd": 10.0}
	cases := []struct {
		narrow map[string]any
		want   bool
	}{
		{map[string]any{"domains": []any{"a.com"}, "max_usd": 5.0}, true},
		{map[string]any{"domains": []any{"a.com", "b.com"}, "max_usd": 10.0}, true},
		{map[string]any{"domains": []any{"c.com"}, "max_usd": 5.0}, false},
		{map[string]any{"domains": []any{"a.com"}, "max_usd": 50.0}, false},
		{map[string]any{"domains": []any{"a.com"}}, false}, // unrestricted max_usd
		{map[string]any{"domains": []any{"a.com"}, "max_usd": 1.0, "extra": true}, true},
	}
	for i, tc := range cases {
		if got := ScopeWithin(tc.narrow, req); got != tc.want {
			t.Errorf("case %d: got %v", i, got)
		}
	}
	if !ScopeWithin(map[string]any{"subscribe": []any{"usage.recorded"}}, map[string]any{"subscribe": []any{"usage.*"}}) {
		t.Error("pattern should cover")
	}
	if !PatternCovers("*.example.com", "hooks.example.com") || PatternCovers("*.example.com", "example.com") {
		t.Error("domain wildcard")
	}
}

func TestOpenParsesSignature(t *testing.T) {
	k := pkgtest.NewKey("k1")
	m := pkgtest.Guard("guard", "0.1.0", "sub2api")
	p, err := Open(pkgtest.Build(m, k), Limits{})
	if err != nil {
		t.Fatal(err)
	}
	if p.Signature == nil || p.Signature.KeyID != "k1" || p.Manifest.Key != "guard" || len(p.SHA256) != 64 {
		t.Fatalf("package = %+v", p.Signature)
	}
	if _, err := Open(pkgtest.Zip(map[string][]byte{"x": []byte("1")}), Limits{}); err == nil {
		t.Fatal("expected missing manifest")
	}
}
