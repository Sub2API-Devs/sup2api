package main

import (
	"bytes"
	"encoding/json"
	"os"
	"path/filepath"
	"slices"
	"testing"

	"github.com/Sub2API-Devs/sup2api/next/plugins/guard/internal/guard"
	"github.com/Sub2API-Devs/sup2api/next/sdk/manifest"
	"github.com/Sub2API-Devs/sup2api/next/sdk/pluginsdk"
	"github.com/Sub2API-Devs/sup2api/next/sdk/pluginsdk/pluginsdktest"
)

// TestManifestServes starts the plugin with its embedded manifest: the SDK
// checks the declared capabilities (app.broadcast.v1 needs OnBroadcast and
// the host permission "broadcast") and reports them.
func TestManifestServes(t *testing.T) {
	h := pluginsdktest.Start(t, guard.New(), pluginsdktest.Options{SDK: []pluginsdk.Option{pluginsdk.WithManifest(manifestJSON)}})
	if !slices.Contains(h.Info.GetCapabilities(), manifest.CapAppBroadcast) {
		t.Fatalf("capabilities = %v", h.Info.GetCapabilities())
	}
}

// TestManifest checks manifest.json against the SDK types (no unknown
// fields) and its internal consistency.
func TestManifest(t *testing.T) {
	dec := json.NewDecoder(bytes.NewReader(manifestJSON))
	dec.DisallowUnknownFields()
	var m manifest.Manifest
	if err := dec.Decode(&m); err != nil {
		t.Fatalf("manifest.json: %v", err)
	}
	if m.Key != "guard" || m.Version != "0.1.0" || m.HostUICompat == "" || m.UI == nil || m.UI.Native == nil {
		t.Fatalf("manifest = %+v", m)
	}
	perms := map[string]bool{}
	for _, up := range m.UserPermissions {
		perms[up.Key] = true
	}
	for _, r := range m.Routes {
		if !perms[r.Permission] {
			t.Errorf("route %s %s: undeclared permission %q", r.Method, r.Path, r.Permission)
		}
	}
	granted := map[string]bool{}
	for _, hp := range m.HostPermissions {
		if _, ok := manifest.HostPermissionRisk[hp.ID]; !ok {
			t.Errorf("unknown host permission %q", hp.ID)
		}
		granted[hp.ID] = true
	}
	for _, need := range []string{"gateway.hook", "events", "jobs", "db.schema", "routes.admin", "ui.native", "ui.menu", "broadcast"} {
		if !granted[need] {
			t.Errorf("missing host permission %s", need)
		}
	}
	hasBroadcast := false
	for _, c := range m.Capabilities {
		hasBroadcast = hasBroadcast || c.ID == manifest.CapAppBroadcast
	}
	if !hasBroadcast {
		t.Error("guard must declare capability app.broadcast.v1 (rules.changed)")
	}
	for _, p := range []string{m.UI.Settings.Schema, m.UI.Settings.UISchema} {
		b, err := os.ReadFile(filepath.FromSlash(p))
		if err != nil || !json.Valid(b) {
			t.Errorf("settings form %s: %v", p, err)
		}
	}
	var patch map[string]any
	b, err := os.ReadFile(filepath.Join("testdata", "guardtest", "manifest.patch.json"))
	if err != nil || json.Unmarshal(b, &patch) != nil || patch["version"] != "0.1.1-test" {
		t.Fatalf("guardtest patch: %v %v", err, patch["version"])
	}
}
