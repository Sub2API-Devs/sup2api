package main

import (
	"bytes"
	"encoding/json"
	"os"
	"path/filepath"
	"slices"
	"testing"

	"github.com/Sub2API-Devs/sup2api/next/plugins/moderation/internal/moderation"
	"github.com/Sub2API-Devs/sup2api/next/sdk/manifest"
	"github.com/Sub2API-Devs/sup2api/next/sdk/pluginsdk"
	"github.com/Sub2API-Devs/sup2api/next/sdk/pluginsdk/pluginsdktest"
)

// TestManifestServes starts the plugin with its embedded manifest: the SDK
// checks the declared capabilities (app.broadcast.v1 needs OnBroadcast and
// the host permission "broadcast") and reports them.
func TestManifestServes(t *testing.T) {
	h := pluginsdktest.Start(t, moderation.New(), pluginsdktest.Options{SDK: []pluginsdk.Option{pluginsdk.WithManifest(manifestJSON)}})
	caps := h.Info.GetCapabilities()
	for _, c := range []string{manifest.CapGatewayHook, manifest.CapAppJobs, manifest.CapAppBroadcast, manifest.CapHTTPRoutes} {
		if !slices.Contains(caps, c) {
			t.Fatalf("capability %s missing: %v", c, caps)
		}
	}
	if slices.Contains(caps, manifest.CapAppEvents) {
		t.Fatalf("app.events.v1 must not be reported: %v", caps)
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
	if m.Key != "moderation" || m.Version != "0.1.0" || m.HostUICompat == "" || m.UI == nil || m.UI.Native == nil ||
		m.UI.Native.Entry != "ui/native/entry.js" || m.Database == nil || m.Database.Schema != "plg_moderation" {
		t.Fatalf("manifest = %+v", m)
	}
	perms := map[string]bool{}
	for _, up := range m.UserPermissions {
		perms[up.Key] = true
	}
	if !perms["moderation:read"] || !perms["moderation:manage"] || len(perms) != 2 {
		t.Fatalf("user permissions = %v", perms)
	}
	routes := map[string]string{}
	for _, r := range m.Routes {
		if !perms[r.Permission] {
			t.Errorf("route %s %s: undeclared permission %q", r.Method, r.Path, r.Permission)
		}
		if r.Scope != "admin" {
			t.Errorf("route %s %s: scope %q", r.Method, r.Path, r.Scope)
		}
		routes[r.Method+" "+r.Path] = r.Permission
	}
	for route, perm := range map[string]string{
		"GET /overview": "moderation:read", "GET /events": "moderation:read", "GET /events/:id": "moderation:read",
		"DELETE /events/:id": "moderation:manage", "GET /blocks": "moderation:read", "POST /blocks": "moderation:manage",
		"DELETE /blocks/:user_id": "moderation:manage", "POST /test": "moderation:manage", "GET /defaults": "moderation:read",
	} {
		if routes[route] != perm {
			t.Errorf("route %s: permission %q, want %q", route, routes[route], perm)
		}
	}
	if len(routes) != 9 {
		t.Errorf("routes = %v", routes)
	}
	granted := map[string]*manifest.HostPermission{}
	for i, hp := range m.HostPermissions {
		if _, ok := manifest.HostPermissionRisk[hp.ID]; !ok {
			t.Errorf("unknown host permission %q", hp.ID)
		}
		if hp.Reason["en"] == "" || hp.Reason["zh"] == "" {
			t.Errorf("host permission %s: reason needs en and zh", hp.ID)
		}
		granted[hp.ID] = &m.HostPermissions[i]
	}
	for _, need := range []string{"kv", "db.schema", "gateway.hook", "jobs", "broadcast", "routes.admin", "ui.menu", "ui.native", "net"} {
		if granted[need] == nil {
			t.Errorf("missing host permission %s", need)
		}
	}
	if n := granted["net"]; n == nil || !n.Optional {
		t.Error("net must be optional")
	}
	if len(m.Hooks) != 1 {
		t.Fatalf("hooks = %+v", m.Hooks)
	}
	hook := m.Hooks[0]
	wantNeeds := []string{moderation.FieldModel, moderation.FieldMessages, moderation.FieldInput, moderation.FieldInputString, moderation.FieldGeminiContent}
	if hook.ID != "moderation" || hook.Point != "gateway.request" || hook.Order != 200 || hook.TimeoutMs != 30000 ||
		hook.Failure != "open" || !slices.Equal(hook.Needs, wantNeeds) || len(hook.Match.Protocols) != 5 {
		t.Fatalf("hook = %+v", hook)
	}
	fields, _ := granted["gateway.hook"].Scope["fields"].([]any)
	if len(fields) != len(wantNeeds) {
		t.Fatalf("gateway.hook scope.fields = %v", fields)
	}
	for i, f := range fields {
		if f != wantNeeds[i] {
			t.Errorf("scope.fields[%d] = %v, want %s", i, f, wantNeeds[i])
		}
	}
	if len(m.Jobs) != 1 || m.Jobs[0].ID != moderation.JobCleanup || m.Jobs[0].Schedule != "0 4 * * *" {
		t.Fatalf("jobs = %+v", m.Jobs)
	}
	caps := map[string]bool{}
	for _, c := range m.Capabilities {
		caps[c.ID] = true
	}
	for _, c := range []string{manifest.CapGatewayHook, manifest.CapAppJobs, manifest.CapAppBroadcast, manifest.CapHTTPRoutes} {
		if !caps[c] {
			t.Errorf("capability %s not declared", c)
		}
	}
	menu := m.UI.Menus
	if len(menu) != 1 || menu[0].ID != "moderation" || menu[0].Permission != "moderation:read" || menu[0].Page != "dashboard" ||
		m.UI.Pages["dashboard"].Component != "ModerationDashboard" || m.UI.Pages["dashboard"].Type != "native" {
		t.Fatalf("ui = %+v", m.UI)
	}
}

// TestSettingsForms checks that the schema and the ui schema cover exactly
// the same fields and that the schema defaults decode to DefaultSettings.
func TestSettingsForms(t *testing.T) {
	var m manifest.Manifest
	if err := json.Unmarshal(manifestJSON, &m); err != nil {
		t.Fatal(err)
	}
	var schema struct {
		AdditionalProperties *bool                     `json:"additionalProperties"`
		Properties           map[string]map[string]any `json:"properties"`
		Required             []string                  `json:"required"`
	}
	b, err := os.ReadFile(filepath.FromSlash(m.UI.Settings.Schema))
	if err != nil || json.Unmarshal(b, &schema) != nil {
		t.Fatalf("schema: %v", err)
	}
	if schema.AdditionalProperties == nil || *schema.AdditionalProperties || len(schema.Required) != 0 {
		t.Fatal("schema must set additionalProperties:false and require nothing ({\"mode\":\"off\"} alone is valid)")
	}
	var ui map[string]json.RawMessage
	b, err = os.ReadFile(filepath.FromSlash(m.UI.Settings.UISchema))
	if err != nil || json.Unmarshal(b, &ui) != nil {
		t.Fatalf("ui schema: %v", err)
	}
	var order []string
	_ = json.Unmarshal(ui["ui:order"], &order)
	if len(order) != len(schema.Properties) {
		t.Fatalf("ui:order has %d fields, schema %d", len(order), len(schema.Properties))
	}
	defaults := map[string]any{}
	for _, k := range order {
		prop, ok := schema.Properties[k]
		if !ok {
			t.Errorf("ui:order field %s not in schema", k)
			continue
		}
		if _, ok := prop["default"]; !ok {
			t.Errorf("field %s has no default", k)
		}
		defaults[k] = prop["default"]
		var fu map[string]json.RawMessage
		if json.Unmarshal(ui[k], &fu) != nil || fu["ui:title"] == nil {
			t.Errorf("field %s has no ui:title", k)
		}
	}
	for _, k := range []string{"api_key"} {
		if schema.Properties[k]["writeOnly"] != true {
			t.Errorf("%s must be writeOnly", k)
		}
	}
	raw, _ := json.Marshal(defaults)
	got, err := moderation.DecodeSettings(raw)
	if err != nil {
		t.Fatal(err)
	}
	want := moderation.DefaultSettings()
	gb, _ := json.Marshal(got)
	wb, _ := json.Marshal(want)
	if !bytes.Equal(gb, wb) {
		t.Fatalf("schema defaults decode to\n%s\nwant\n%s", gb, wb)
	}
}
