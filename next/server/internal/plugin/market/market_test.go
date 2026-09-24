package market

import (
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/Sub2API-Devs/sup2api/next/server/internal/core"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/plugin/install"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/plugin/pkg"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/plugin/pkg/pkgtest"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/testutil"
)

type fakeInstaller struct {
	got  []byte
	opts install.UploadOptions
}

func (f *fakeInstaller) Upload(_ context.Context, data []byte, _ int64, opt install.UploadOptions) (*install.Review, error) {
	f.got, f.opts = data, opt
	return &install.Review{PluginKey: opt.ExpectKey, Version: opt.ExpectVersion}, nil
}
func (f *fakeInstaller) HostVersion() string { return "0.1.0" }

func TestMarket(t *testing.T) {
	db := testutil.DB(t)
	ctx := context.Background()
	mk := pkgtest.NewKey("market")
	pkgBytes := pkgtest.Build(pkgtest.Minimal("tool", "1.1.0", "acme"), pkgtest.NewKey("acme-1"))

	idx := Index{Version: 1, Plugins: []IndexPlugin{{
		Key: "tool", Name: core.LocalizedText{"en": "Tool"}, Publisher: "acme",
		Versions: []IndexVersion{
			{Version: "1.0.0", URL: "pkgs/tool-1.0.0.s2plugin", SHA256: "00", Size: 1, HostCompat: ">=0.1.0"},
			{Version: "1.1.0", URL: "pkgs/tool-1.1.0.s2plugin", SHA256: pkg.SHA256Hex(pkgBytes), Size: int64(len(pkgBytes)), HostCompat: ">=0.1.0"},
			{Version: "2.0.0", URL: "pkgs/tool-2.0.0.s2plugin", SHA256: "00", Size: 1, HostCompat: ">=0.2.0"},
		},
	}}}
	raw, _ := json.Marshal(idx)
	sig := SignIndex(raw, mk.Priv)
	hits := 0
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		switch r.URL.Path {
		case "/m/index.json":
			hits++
			_, _ = w.Write(raw)
		case "/m/index.json.sig":
			_, _ = w.Write(sig)
		case "/m/pkgs/tool-1.1.0.s2plugin":
			_, _ = w.Write(pkgBytes)
		case "/m/pkgs/tool-1.0.0.s2plugin":
			_, _ = w.Write([]byte("x"))
		default:
			http.NotFound(w, r)
		}
	}))
	defer srv.Close()

	inst := &fakeInstaller{}
	s := New(db, inst, srv.Client(), 1<<20)
	seed := fmt.Sprintf(`[{"name":"official","url":%q,"public_key":%q}]`, srv.URL+"/m/", mk.PubB64())
	if err := s.SeedSources(ctx, seed); err != nil {
		t.Fatal(err)
	}
	if err := s.SeedSources(ctx, seed); err != nil { // idempotent
		t.Fatal(err)
	}
	srcs, err := s.ListSources(ctx)
	if err != nil || len(srcs) != 1 {
		t.Fatalf("sources: %v %v", err, srcs)
	}
	list, err := s.ListPlugins(ctx, srcs[0].ID, false)
	if err != nil {
		t.Fatal(err)
	}
	if len(list) != 1 || list[0].LatestVersion != "1.1.0" || len(list[0].Versions) != 3 || list[0].Versions[0].Compatible {
		t.Fatalf("list = %+v", list)
	}
	// Cached.
	if _, err := s.ListPlugins(ctx, 0, false); err != nil || hits != 1 {
		t.Fatalf("cache: hits=%d err=%v", hits, err)
	}

	r, err := s.Install(ctx, srcs[0].ID, "tool", "1.1.0", 0)
	if err != nil {
		t.Fatal(err)
	}
	if r.PluginKey != "tool" || len(inst.got) != len(pkgBytes) || inst.opts.ExpectVersion != "1.1.0" {
		t.Fatalf("install = %+v opts=%+v", r, inst.opts)
	}
	if _, err := s.Install(ctx, srcs[0].ID, "tool", "1.0.0", 0); core.AsError(err).Code != "invalid_argument" {
		t.Fatalf("sha mismatch: %v", err)
	}
	if _, err := s.Install(ctx, srcs[0].ID, "tool", "9.9.9", 0); core.AsError(err).Code != "not_found" {
		t.Fatalf("missing version: %v", err)
	}

	// Tampered index is rejected.
	other := pkgtest.NewKey("other")
	if _, err := VerifyIndex(raw, SignIndex(raw, other.Priv), mk.PubB64()); err == nil {
		t.Fatal("wrong key accepted")
	}
	if _, err := VerifyIndex(append(raw, ' '), sig, mk.PubB64()); err == nil {
		t.Fatal("modified index accepted")
	}
}
