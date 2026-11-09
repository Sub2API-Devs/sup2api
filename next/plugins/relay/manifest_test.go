package relay

import (
	"bytes"
	"encoding/json"
	"os"
	"path"
	"reflect"
	"slices"
	"testing"

	"github.com/Sub2API-Devs/sup2api/next/sdk/manifest"
	"github.com/Sub2API-Devs/sup2api/next/sdk/manifest/check"
	"github.com/Sub2API-Devs/sup2api/next/sdk/upstream"
)

// declaration is the upstream of relay_key: the anthropic preset with a
// required base URL of its own wording and no default protocol.
// sdk/upstream's golden replay (TestGolden) proves it answers exactly like
// the plugin code it replaced, so keep the two in step.
const declaration = `{
	"preset": "anthropic",
	"baseURL": {"default": null, "required": true},
	"credentials": {"texts": {"baseURLRequired": "Base URL of the relay is required / 请填写中转站的 Base URL"}},
	"defaultProtocol": null,
	"filterFields": []
}`

// TestManifest runs manifest.json through the checks the core runs before
// it installs a package (sdk/manifest/check in tooling mode, which also
// resolves the upstream declaration with the core's engine) and pins what
// the move to runtime "none" keeps: an account-type-only package
// (ARCHITECTURE 6.6) whose relay_key serves the built-in anthropic platform
// with its own client headers and the replayed declaration.
func TestManifest(t *testing.T) {
	m := load(t)
	if m.Key != "relay" || m.Version != "0.3.0" || m.Publisher != "sub2api" || m.Runtime != manifest.RuntimeNone {
		t.Fatalf("identity = %s %s %s %s", m.Key, m.Version, m.Publisher, m.Runtime)
	}
	if len(m.Platforms) != 0 || len(m.AccountTypes) != 1 {
		t.Fatalf("platforms = %+v accountTypes = %+v, want one account type only", m.Platforms, m.AccountTypes)
	}
	at := m.AccountTypes[0]
	if at.ID != "relay_key" || len(at.Platforms) != 1 || at.Platforms[0].Platform != "anthropic" {
		t.Fatalf("account type %s platforms = %+v, want relay_key on anthropic", at.ID, at.Platforms)
	}
	passHeaders := at.Platforms[0].PassHeaders
	if !slices.Equal(passHeaders, []string{"anthropic-version", "anthropic-beta"}) {
		t.Fatalf("passHeaders = %v", passHeaders)
	}
	assertJSON(t, at.Upstream.Layer(), declaration)
	if _, err := upstream.Resolve(&at, passHeaders, nil); err != nil {
		t.Fatal(err)
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
