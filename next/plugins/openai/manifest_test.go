package openai

import (
	"bytes"
	"encoding/json"
	"os"
	"path"
	"reflect"
	"testing"

	"github.com/Sub2API-Devs/sup2api/next/sdk/manifest"
	"github.com/Sub2API-Devs/sup2api/next/sdk/manifest/check"
	"github.com/Sub2API-Devs/sup2api/next/sdk/upstream"
)

// The package and its one account type. declaration is the type's upstream:
// sdk/upstream's golden replay (TestGolden) proves it answers exactly like
// the plugin code it replaced, so keep the two in step.
const (
	key         = "openai"
	version     = "0.4.0"
	platform    = "openai"
	declaration = `{"preset":"openai","filterFields":[]}`
)

// TestManifest runs manifest.json through the checks the core runs before
// it installs a package (sdk/manifest/check in tooling mode, which also
// resolves the upstream declaration with the core's engine) and pins what
// the move to runtime "none" keeps: the identity, the account type of the
// built-in platform and its replayed declaration.
func TestManifest(t *testing.T) {
	m := load(t)
	if m.Key != key || m.Version != version || m.Publisher != "sub2api" || m.Runtime != manifest.RuntimeNone {
		t.Fatalf("identity = %s %s %s %s", m.Key, m.Version, m.Publisher, m.Runtime)
	}
	if len(m.AccountTypes) != 1 {
		t.Fatalf("accountTypes = %+v", m.AccountTypes)
	}
	at := m.AccountTypes[0]
	if at.ID != "apikey" || len(at.Platforms) != 1 || at.Platforms[0].Platform != platform {
		t.Fatalf("account type %s platforms = %+v, want apikey on %s", at.ID, at.Platforms, platform)
	}
	assertJSON(t, at.Upstream.Layer(), declaration)
	p, err := upstream.Resolve(&at, nil, nil)
	if err != nil {
		t.Fatal(err)
	}
	// base_url is guarded (CONTRACTS §21.3): without account:settings:custom
	// only the default upstream may be used.
	if gs := at.GuardedSettings; len(gs) != 1 || gs[0].Field != "base_url" || len(gs[0].Allowed) != 1 || gs[0].Allowed[0] != p.Upstream().BaseURL.Default {
		t.Fatalf("guardedSettings = %+v, want base_url -> [%s]", gs, p.Upstream().BaseURL.Default)
	}
}

// load decodes manifest.json strictly and checks it with the files a
// package carries.
func load(t *testing.T) manifest.Manifest {
	t.Helper()
	raw, err := os.ReadFile("manifest.json")
	if err != nil {
		t.Fatal(err)
	}
	var m manifest.Manifest
	dec := json.NewDecoder(bytes.NewReader(raw))
	dec.DisallowUnknownFields()
	if err := dec.Decode(&m); err != nil {
		t.Fatalf("manifest.json: %v", err)
	}
	files := map[string][]byte{"manifest.json": raw}
	for _, dir := range []string{"forms", "assets"} {
		entries, _ := os.ReadDir(dir)
		for _, e := range entries {
			p := path.Join(dir, e.Name())
			if files[p], err = os.ReadFile(p); err != nil {
				t.Fatal(err)
			}
		}
	}
	if err := check.Validate(&m, files, check.ValidateOptions{Tooling: true}); err != nil {
		t.Fatal(err)
	}
	return m
}

// assertJSON compares two JSON documents by value.
func assertJSON(t *testing.T, got json.RawMessage, want string) {
	t.Helper()
	var g, w any
	_ = json.Unmarshal(got, &g)
	_ = json.Unmarshal([]byte(want), &w)
	if g == nil || !reflect.DeepEqual(g, w) {
		t.Fatalf("upstream = %s, want %s", got, want)
	}
}
