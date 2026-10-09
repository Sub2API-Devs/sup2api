package check

import (
	"testing"

	"github.com/Sub2API-Devs/sup2api/next/sdk/manifest"
)

// Gateway paths the core serves itself (provider resources) and console
// paths (GET/HEAD) cannot be claimed by a plugin endpoint (audit 2026-10-09
// P1-6).
func TestEndpointCoreAndConsolePaths(t *testing.T) {
	cases := []struct {
		method, path string
		reserved     bool
	}{
		{"POST", "/v1/files", true},
		{"GET", "/v1/files/:id/content", true},
		{"POST", "/V1/Skills", true},
		{"POST", "/v1/:kind", true}, // would serve /v1/files
		{"GET", "/v1/filesystem", false},
		{"GET", "/assets/*rest", true},
		{"HEAD", "/login", true},
		{"GET", "/dashboard/x", true},
		{"GET", "/index.html", true},
		{"POST", "/login", false}, // the console only serves GET and HEAD
		{"POST", "/assets/upload", false},
		{"GET", "/loginx", false},
		{"GET", "/video/v1/tasks/:id", false},
	}
	for _, c := range cases {
		ep := validPlatform().Endpoints[0]
		ep.Method, ep.Path = c.method, c.path
		got := codes(Validate(pluginPlatformManifest(ep), nil, ValidateOptions{Tooling: true}))
		if (got["platforms[0].endpoints[0].path"] == "invalid_path") != c.reserved {
			t.Errorf("%s %s: reserved=%v, got %v", c.method, c.path, c.reserved, got)
		}
	}
}

// Conflicts reports only what other plugins hold.
func TestConflictsOnlyOtherPlugins(t *testing.T) {
	m := pluginPlatformManifest(validPlatform().Endpoints[0])
	m.Key = "mine"
	if got := Conflicts(m, nil, nil); len(got) != 0 {
		t.Fatalf("no others: %v", got)
	}
	other := &manifest.Manifest{Key: "other", Platforms: []manifest.Platform{validPlatform()}}
	pfs, eps := OthersFromManifests([]*manifest.Manifest{other})
	got := map[string]string{}
	for _, e := range Conflicts(m, pfs, eps) {
		got[e.Field] = e.Code
	}
	if got["platforms[0].id"] != "platform_conflict" || got["platforms[0].endpoints[0].path"] != "endpoint_conflict" || len(got) != 2 {
		t.Fatalf("conflicts: %v", got)
	}
	// Its own earlier versions are not conflicts.
	pfs, eps = OthersFromManifests([]*manifest.Manifest{{Key: "mine", Platforms: []manifest.Platform{validPlatform()}}})
	if got := Conflicts(m, pfs, eps); len(got) != 0 {
		t.Fatalf("own versions: %v", got)
	}
}

// A stored manifest is checked against what the current core holds: a path
// a newer core reserved, or a platform id it now ships, is a conflict.
func TestConflictsWithTheCore(t *testing.T) {
	ep := validPlatform().Endpoints[0]
	ep.Method, ep.Path = "GET", "/dashboard/x"
	got := map[string]string{}
	for _, e := range Conflicts(pluginPlatformManifest(ep), nil, nil) {
		got[e.Field] = e.Code
	}
	if got["platforms[0].endpoints[0].path"] != "invalid_path" {
		t.Fatalf("console path: %v", got)
	}
	m := pluginPlatformManifest(validPlatform().Endpoints[0])
	m.Platforms[0].ID = "anthropic"
	got = map[string]string{}
	for _, e := range Conflicts(m, nil, nil) {
		got[e.Field] = e.Code
	}
	if got["platforms[0].id"] != "builtin_platform" {
		t.Fatalf("built-in platform id: %v", got)
	}
}
