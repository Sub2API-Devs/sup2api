package main

import (
	"bytes"
	"encoding/json"
	"fmt"
	"net/url"
	"os"
	"path/filepath"
	"reflect"
	"regexp"
	"slices"
	"sort"
	"strings"
	"testing"

	"github.com/tidwall/gjson"

	"github.com/Sub2API-Devs/sup2api/next/plugins/volcengine/internal/volcengine"
	"github.com/Sub2API-Devs/sup2api/next/sdk/manifest"
	"github.com/Sub2API-Devs/sup2api/next/sdk/manifest/check"
	"github.com/Sub2API-Devs/sup2api/next/sdk/platforms"
	"github.com/Sub2API-Devs/sup2api/next/sdk/pluginsdk"
	"github.com/Sub2API-Devs/sup2api/next/sdk/pluginsdk/pluginsdktest"
)

// decodeManifest decodes manifest.json into the SDK types, rejecting unknown
// fields (a typo in a field name must not pass silently).
func decodeManifest(t *testing.T) *manifest.Manifest {
	t.Helper()
	dec := json.NewDecoder(bytes.NewReader(manifestJSON))
	dec.DisallowUnknownFields()
	var m manifest.Manifest
	if err := dec.Decode(&m); err != nil {
		t.Fatalf("manifest.json: %v", err)
	}
	return &m
}

// TestManifest checks manifest.json against the SDK types (no unknown
// fields), the built-in openai platform and the files it references.
func TestManifest(t *testing.T) {
	dec := json.NewDecoder(bytes.NewReader(manifestJSON))
	dec.DisallowUnknownFields()
	var m manifest.Manifest
	if err := dec.Decode(&m); err != nil {
		t.Fatalf("manifest.json: %v", err)
	}
	if m.Key != "volcengine" || m.Version != "0.12.0" || m.Publisher != "sub2api" || m.APIVersion != manifest.APIVersion {
		t.Fatalf("identity = %s %s %s", m.Key, m.Version, m.Publisher)
	}
	if m.Name["en"] == "" || m.Name["zh"] == "" || m.Description["en"] == "" || m.Description["zh"] == "" {
		t.Fatal("name and description need en and zh")
	}
	if m.Runtime != "grpc" || m.Entry.GRPC == nil || m.Entry.GRPC.Binaries == "" || m.HostCompat == "" {
		t.Fatalf("runtime/entry/hostCompat = %s %+v %s", m.Runtime, m.Entry, m.HostCompat)
	}
	// Stages one to three: one account type, the plugin's own volcengine
	// platform, and the asset library (schema + admin routes + host-rendered
	// pages). Still no jobs, no hooks and no scheduler extension - and no
	// hostUICompat, because nothing here is a native page.
	if len(m.Jobs) != 0 || len(m.Hooks) != 0 || m.Scheduler != nil || m.HostUICompat != "" {
		t.Fatalf("stage three declares no jobs, hooks or scheduler extension: %+v", m)
	}
	if m.Database == nil || m.Database.Schema != "plg_volcengine" || m.Database.Migrations != "migrations/" {
		t.Fatalf("database = %+v", m.Database)
	}
	wantCaps := []string{manifest.CapPlatformAdapter, manifest.CapPlatformExecute, manifest.CapPlatformTasks, manifest.CapPlatformPoll, manifest.CapPlatformMonitor, manifest.CapHTTPRoutes}
	gotCaps := make([]string, 0, len(m.Capabilities))
	for _, c := range m.Capabilities {
		gotCaps = append(gotCaps, c.ID)
	}
	if !slices.Equal(gotCaps, wantCaps) {
		t.Fatalf("capabilities = %v, want %v", gotCaps, wantCaps)
	}

	// Two account types, split the way the upstreams are: apikey is Ark itself
	// (address pinned, protocol-specific official paths) and relay is an
	// Ark-compatible relay (address free, paths configurable, Anthropic
	// served). Looked up by ID, never by index.
	types := map[string]manifest.AccountType{}
	for _, at := range m.AccountTypes {
		types[at.ID] = at
	}
	if len(m.AccountTypes) != 2 || len(types) != 2 {
		t.Fatalf("accountTypes = %+v, want exactly apikey and relay", m.AccountTypes)
	}
	official, ok := types[volcengine.AccountTypeAPIKey]
	if !ok {
		t.Fatalf("no %s account type: %+v", volcengine.AccountTypeAPIKey, m.AccountTypes)
	}
	relay, ok := types[volcengine.AccountTypeRelay]
	if !ok {
		t.Fatalf("no %s account type: %+v", volcengine.AccountTypeRelay, m.AccountTypes)
	}
	for _, at := range m.AccountTypes {
		if at.Label["en"] == "" || at.Label["zh"] == "" || at.Description["en"] == "" || at.Description["zh"] == "" {
			t.Fatalf("account type %s needs an en and zh label and description", at.ID)
		}
		// secret_key is masked like the API key; access_key is NOT, because an
		// access key id identifies the Volcengine account and hiding it would
		// stop an operator from telling two accounts apart in the form. It is
		// still stored encrypted: everything outside settingsFields is
		// (server account/creds.go split()).
		if !slices.Equal(at.SensitiveFields, []string{"api_key", volcengine.FieldSecretKey}) {
			t.Fatalf("%s sensitiveFields = %v", at.ID, at.SensitiveFields)
		}
		if slices.Contains(at.SettingsFields, volcengine.FieldAccessKey) ||
			slices.Contains(at.SettingsFields, volcengine.FieldSecretKey) {
			t.Fatalf("%s: the AK/SK pair must not be plaintext settings: %v", at.ID, at.SettingsFields)
		}
		// Model mapping is a core account field (CONTRACTS §18).
		if slices.Contains(at.SettingsFields, "model_mapping") {
			t.Fatalf("%s: model_mapping must not be a settings field", at.ID)
		}
		// The two prefixes are paths, and guardedSettings is a URL allow-list
		// (check requires every allowed entry to be an absolute http(s) URL),
		// so they cannot be guarded that way. What keeps a prefix from moving a
		// request off its account's host is upstreamURL's origin check, on
		// every request.
		for _, g := range at.GuardedSettings {
			if g.Field == volcengine.FieldAPIPrefix || g.Field == volcengine.FieldVideoAPIPrefix {
				t.Fatalf("%s cannot be a guarded setting: guardedSettings only allow-lists absolute URLs", g.Field)
			}
		}
	}

	// ---- the official type: pinned address, protocol paths fixed by the plugin.
	if !slices.Equal(official.SettingsFields,
		[]string{"base_url", volcengine.FieldAssetBaseURL, volcengine.FieldAssetRegion}) {
		t.Fatalf("apikey settingsFields = %v", official.SettingsFields)
	}
	// The prefixes must NOT be offered here: Ark serves one layout, and a
	// prefix field on this type would be a setting that changes nothing
	// (prefixesOf reads none for it) while looking like it does.
	for _, f := range []string{volcengine.FieldAPIPrefix, volcengine.FieldVideoAPIPrefix} {
		if slices.Contains(official.SettingsFields, f) {
			t.Errorf("the apikey type must not offer %s: Ark has one path layout", f)
		}
	}
	// base_url and asset_base_url are both guarded (CONTRACTS §21.3):
	// without account:settings:custom only the official addresses (or an
	// empty value, which the plugin normalizes to the default) may be used.
	want := []string{volcengine.DefaultBaseURL, volcengine.BytePlusBaseURL}
	if len(official.GuardedSettings) != 2 || official.GuardedSettings[0].Field != "base_url" ||
		!slices.Equal(official.GuardedSettings[0].Allowed, want) {
		t.Fatalf("apikey guardedSettings = %+v, want base_url -> %v", official.GuardedSettings, want)
	}
	if g := official.GuardedSettings[1]; g.Field != volcengine.FieldAssetBaseURL ||
		!slices.Equal(g.Allowed, []string{volcengine.DefaultAssetBaseURL}) {
		t.Fatalf("apikey guardedSettings[1] = %+v, want %s -> %q", g, volcengine.FieldAssetBaseURL, volcengine.DefaultAssetBaseURL)
	}
	// The asset endpoint is the Ark CONTROL plane and a different host from
	// the API base URL. Conflating them yields a signed request to a host
	// that does not serve Action=..., so the two constants must not share a
	// host.
	if hostOf(t, volcengine.DefaultAssetBaseURL) == hostOf(t, volcengine.DefaultBaseURL) {
		t.Fatalf("the asset endpoint must not be the API host: %s", volcengine.DefaultAssetBaseURL)
	}

	// ---- the relay type: free address, both paths, Anthropic served.
	if !slices.Equal(relay.SettingsFields, []string{"base_url", "video_endpoint", "asset_endpoint", volcengine.FieldAPIPrefix,
		volcengine.FieldVideoAPIPrefix, volcengine.FieldAssetBaseURL, volcengine.FieldAssetRegion}) {
		t.Fatalf("relay settingsFields = %v", relay.SettingsFields)
	}
	// The two prefixes MUST be settings fields of this type. Nothing in the
	// core checks it: split() partitions on exactly this list, so a prefix left
	// out of it goes into the ENCRYPTED blob while prefixesOf reads the
	// plaintext one. The result is an operator who sets a prefix, gets no
	// error, and sees every request keep going to /v1.
	for _, f := range []string{volcengine.FieldAPIPrefix, volcengine.FieldVideoAPIPrefix} {
		if !slices.Contains(relay.SettingsFields, f) {
			t.Fatalf("%s must be a settings field or it is stored encrypted and never read: %v", f, relay.SettingsFields)
		}
	}
	// A relay's address is not an enumerable set, so it cannot be guarded -
	// which is exactly why it is a separate account type rather than a value of
	// the official one. Asserted so that nobody "fixes" it by adding a guard
	// with one example relay in it.
	if len(relay.GuardedSettings) != 0 {
		t.Fatalf("relay guardedSettings = %+v, want none: a relay's address cannot be an allow-list", relay.GuardedSettings)
	}

	// The form's length limit and the plugin's must agree. They are written in
	// two languages and nothing links them, so a change to one alone means the
	// form accepts a value the plugin then refuses on every request.
	var limits struct {
		Properties map[string]struct {
			MaxLength int `json:"maxLength"`
		} `json:"properties"`
	}
	if err := json.Unmarshal(mustJSONFile(t, relay.Form.Schema), &limits); err != nil {
		t.Fatal(err)
	}
	for _, f := range []string{volcengine.FieldAPIPrefix, volcengine.FieldVideoAPIPrefix} {
		if got := limits.Properties[f].MaxLength; got != volcengine.MaxPrefixLen {
			t.Errorf("form %s maxLength = %d, plugin MaxPrefixLen = %d", f, got, volcengine.MaxPrefixLen)
		}
	}

	// Both forms: the fields each type offers, and what each one requires.
	for _, c := range []struct {
		at       manifest.AccountType
		required []string
		fields   []string
		absent   []string
	}{
		{official, []string{"api_key"},
			[]string{"api_key", "base_url", volcengine.FieldAccessKey, volcengine.FieldSecretKey,
				volcengine.FieldAssetBaseURL, volcengine.FieldAssetRegion},
			[]string{volcengine.FieldAPIPrefix, volcengine.FieldVideoAPIPrefix, "video_endpoint", "asset_endpoint", "model_mapping"}},
		// base_url is required on the relay form because relaySpec has no
		// default: falling back to Ark's address would send a relay's key to
		// Ark, which answers 401 - an error that says nothing about the
		// missing setting.
		{relay, []string{"api_key", "base_url"},
			[]string{"api_key", "base_url", "video_endpoint", "asset_endpoint", volcengine.FieldAPIPrefix, volcengine.FieldVideoAPIPrefix,
				volcengine.FieldAccessKey, volcengine.FieldSecretKey,
				volcengine.FieldAssetBaseURL, volcengine.FieldAssetRegion},
			[]string{"model_mapping"}},
	} {
		var schema struct {
			Required   []string                   `json:"required"`
			Properties map[string]json.RawMessage `json:"properties"`
		}
		if err := json.Unmarshal(mustJSONFile(t, c.at.Form.Schema), &schema); err != nil {
			t.Fatal(err)
		}
		mustJSONFile(t, c.at.Form.UISchema)
		if !slices.Equal(schema.Required, c.required) {
			t.Fatalf("%s form: required %v, want %v", c.at.ID, schema.Required, c.required)
		}
		for _, f := range c.fields {
			if _, ok := schema.Properties[f]; !ok {
				t.Fatalf("%s form schema has no %s property", c.at.ID, f)
			}
		}
		for _, f := range c.absent {
			if _, bad := schema.Properties[f]; bad {
				t.Fatalf("%s form schema must not declare %s", c.at.ID, f)
			}
		}
		// The asset library is opt-in per account: neither half of the AK/SK
		// pair may be a required form field, or every account would suddenly
		// need one.
		for _, f := range []string{volcengine.FieldAccessKey, volcengine.FieldSecretKey} {
			if slices.Contains(schema.Required, f) {
				t.Fatalf("%s: %s must not be required: an account without an asset library is legal", c.at.ID, f)
			}
		}
		// ui:order must list every property, or a field the form offers has no
		// defined position.
		var ui struct {
			Order []string `json:"ui:order"`
		}
		if err := json.Unmarshal(mustJSONFile(t, c.at.Form.UISchema), &ui); err != nil {
			t.Fatal(err)
		}
		for f := range schema.Properties {
			if !slices.Contains(ui.Order, f) {
				t.Errorf("%s ui:order does not list %s", c.at.ID, f)
			}
		}
		if len(ui.Order) != len(schema.Properties) {
			t.Errorf("%s ui:order = %v, but the schema has %d properties", c.at.ID, ui.Order, len(schema.Properties))
		}
	}

	// Official Ark now serves Messages through its compatibility API. Existing
	// relay text integrations retain their platform declarations.
	//
	// Looked up by name, never by index: these lists have grown before, and an
	// index-based assertion silently starts checking a different platform when
	// they grow again.
	platformsOf := func(at manifest.AccountType) map[string]manifest.AccountPlatform {
		byName := map[string]manifest.AccountPlatform{}
		for _, ap := range at.Platforms {
			byName[ap.Platform] = ap
		}
		if len(at.Platforms) != len(byName) {
			t.Fatalf("%s lists a platform twice: %+v", at.ID, at.Platforms)
		}
		return byName
	}
	officialPlatforms, relayPlatforms := platformsOf(official), platformsOf(relay)
	for _, want := range []string{volcengine.PlatformID, volcengine.PlatformVolcengine, volcengine.PlatformAnthropic} {
		for id, byName := range map[string]map[string]manifest.AccountPlatform{
			volcengine.AccountTypeAPIKey: officialPlatforms, volcengine.AccountTypeRelay: relayPlatforms} {
			if _, ok := byName[want]; !ok {
				t.Fatalf("%s platforms = %v, want %s among them", id, byName, want)
			}
		}
	}
	if len(officialPlatforms) != 3 {
		t.Fatalf("apikey platforms = %+v, want openai, anthropic and volcengine", official.Platforms)
	}
	if len(relayPlatforms) != 3 {
		t.Fatalf("relay platforms = %+v, want exactly the three known ones", relay.Platforms)
	}
	if _, ok := relayPlatforms[volcengine.PlatformAnthropic]; !ok {
		t.Fatalf("the relay type must declare the %s platform: that is what it exists for", volcengine.PlatformAnthropic)
	}

	// The own platform inherits everything from platforms[] (no override), on
	// both types.
	for id, byName := range map[string]map[string]manifest.AccountPlatform{
		volcengine.AccountTypeAPIKey: officialPlatforms, volcengine.AccountTypeRelay: relayPlatforms} {
		own := byName[volcengine.PlatformVolcengine]
		if len(own.PassHeaders) != 0 || len(own.RequestFields) != 0 || len(own.Usage) != 0 {
			t.Fatalf("%s own platform entry = %+v", id, own)
		}
	}
	// anthropic's passHeaders must be narrowed the same way openai's is, and
	// must match what upstreamHeaders forwards: passHeaders REPLACES the
	// platform's list rather than merging, so a header named on one side and
	// not the other is dropped at whichever side forgot it. anthropic-version
	// and anthropic-beta are in both because they change how the upstream
	// reads the body.
	anth := relayPlatforms[volcengine.PlatformAnthropic]
	if !reflect.DeepEqual(officialPlatforms[volcengine.PlatformAnthropic], anth) {
		t.Fatal("official and relay Messages must share exclusive usage and header declarations")
	}
	if !slices.Equal(anth.PassHeaders, volcengine.AnthropicForwardHeaders()) || len(anth.RequestFields) != 0 {
		t.Fatalf("anthropic platform entry = %+v, want passHeaders %v", anth, volcengine.AnthropicForwardHeaders())
	}
	// The usage override exists for ONE measured reason, and the test below
	// proves it adds nothing else.
	//
	// Measured 2026-09-30 against an Ark-compatible relay: on a streaming
	// Anthropic request the same fixed prompt reports input_tokens 34 in
	// message_start and 54 in message_delta, and 54 non-streaming - twice,
	// identically. The platform reads input from message_start, so every
	// streaming request through that upstream under-counted input by 37%.
	//
	// Reading it from message_delta as well is safe in both directions
	// because Acc.set OVERWRITES and SKIPS A MISSING PATH: on that relay the
	// later 54 replaces 34, and on Anthropic itself, whose message_delta
	// carries no usage.input_tokens at all, nothing is overwritten and
	// message_start's own value stands.
	over, ok := anth.Usage[volcengine.ProtocolMessages]
	if !ok || len(anth.Usage) != 1 {
		t.Fatalf("anthropic usage override = %+v, want exactly %s", anth.Usage, volcengine.ProtocolMessages)
	}
	if b := builtinNamed(t, volcengine.PlatformAnthropic); b != nil {
		// An AccountPlatform usage override REPLACES the platform's whole
		// block, so a field left out of it is a field nobody reads - and a
		// forgotten SSE list bills every streaming request at zero, silently.
		// Rather than trust a hand copy, diff it: the override must equal the
		// platform's rules EXCEPT for the one key it exists to add.
		diffs := usageDiff(b.Usage, over)
		want := []string{`sse[message_delta].map[input_tokens]: "" -> "usage.input_tokens"`}
		if !slices.Equal(diffs, want) {
			t.Errorf("the anthropic usage override differs from the platform's by:\n  %s\nwant exactly:\n  %s",
				strings.Join(diffs, "\n  "), strings.Join(want, "\n  "))
		}
	}
	// Ark ignores OpenAI's org/project and x-stainless-* headers, so both
	// account types narrow the built-in platform's passHeaders; the usage
	// rules and requestFields are inherited (Ark is OpenAI-compatible and
	// its token counts are inclusive, like the built-in platform's).
	for id, byName := range map[string]map[string]manifest.AccountPlatform{
		volcengine.AccountTypeAPIKey: officialPlatforms, volcengine.AccountTypeRelay: relayPlatforms} {
		ap := byName[volcengine.PlatformID]
		if !slices.Equal(ap.PassHeaders, volcengine.ForwardHeaders()) {
			t.Errorf("%s openai passHeaders = %v, want %v", id, ap.PassHeaders, volcengine.ForwardHeaders())
		}
		if len(ap.RequestFields) != 0 || len(ap.Usage) != 0 {
			t.Errorf("%s: requestFields/usage must stay inherited: %+v", id, ap)
		}
	}
	if b := builtin(t); b != nil {
		// WebSocket endpoints are only routed to plugins declaring
		// platform.websocket.v1, which this one does not.
		var got []string
		for _, p := range b.Protocols() {
			if !slices.ContainsFunc(b.Endpoints, func(e manifest.Endpoint) bool { return e.Protocol == p && e.WebSocket() }) {
				got = append(got, p)
			}
		}
		if !slices.Equal(got, volcengine.Protocols) {
			t.Fatalf("built-in openai protocols %v, implemented %v", got, volcengine.Protocols)
		}
		for _, h := range volcengine.ForwardHeaders() {
			if !slices.Contains(b.PassHeaders, h) {
				t.Errorf("forwarded header %q is not in the built-in platform's passHeaders %v", h, b.PassHeaders)
			}
		}
		if b.Usage.Semantics != "inclusive" {
			t.Errorf("built-in openai usage semantics = %q; Ark is inclusive too, check the override", b.Usage.Semantics)
		}
	}

	perms := map[string]manifest.HostPermission{}
	for _, p := range m.HostPermissions {
		if _, ok := manifest.HostPermissionRisk[p.ID]; !ok {
			t.Errorf("unknown host permission %q", p.ID)
		}
		if p.Reason["en"] == "" || p.Reason["zh"] == "" {
			t.Errorf("host permission %s needs an en and zh reason", p.ID)
		}
		perms[p.ID] = p
	}
	// Stage three adds exactly five permissions, and every one of them is
	// what the administrator sees on the consent screen. Notably absent:
	// ui.native (Critical) - the asset pages are rendered by the host from
	// the manifest instead.
	wantPerms := []string{
		"platform.register", "gateway.endpoint", "accounts.credentials",
		"accounts.read", "db.schema", "routes.admin", "ui.menu", "net",
	}
	if len(perms) != len(wantPerms) {
		t.Fatalf("host permissions = %v, want %v", perms, wantPerms)
	}
	for _, id := range wantPerms {
		if _, ok := perms[id]; !ok {
			t.Fatalf("missing host permission %q", id)
		}
	}
	if _, bad := perms["ui.native"]; bad {
		t.Error("the asset library uses host-rendered pages; ui.native (Critical) must not be requested")
	}
	if c, ok := perms["accounts.credentials"]; !ok || c.Scope["types"] != "own" || len(c.Scope) != 1 {
		t.Fatalf("accounts.credentials scope = %v", c.Scope)
	}
	// accounts.read is what lets the plugin list its own accounts without
	// touching credentials (CONTRACTS §26.6); it carries no scope.
	if c := perms["accounts.read"]; len(c.Scope) != 0 {
		t.Errorf("accounts.read scope = %v, want none", c.Scope)
	}
	// The net allowlist has to cover the default asset endpoint, or the
	// asset library is dead on a node whose egress policy is an allowlist.
	doms, _ := check.StringList(perms["net"].Scope, "domains")
	if !hostAllowed(doms, hostOf(t, volcengine.DefaultAssetBaseURL)) {
		t.Errorf("net domains %v do not cover the default asset endpoint %q", doms, volcengine.DefaultAssetBaseURL)
	}
	// The addresses shown on the consent screen must be the ones the plugin
	// can actually reach by default - the two API hosts and the asset
	// endpoint, which is a third host.
	if !slices.Equal(m.ExternalServices, []string{
		"ark.cn-beijing.volces.com", "ark.ap-southeast.bytepluses.com", "ark.cn-beijing.volcengineapi.com"}) {
		t.Errorf("externalServices = %v", m.ExternalServices)
	}
}

// hostOf returns the host of an absolute URL.
func hostOf(t *testing.T, raw string) string {
	t.Helper()
	u, err := url.Parse(raw)
	if err != nil || u.Host == "" {
		t.Fatalf("not an absolute URL: %q", raw)
	}
	return u.Host
}

// hostAllowed mirrors the core's egress allowlist matching (server
// plugin/egress AllowedHost): an exact host or a "*.suffix" wildcard.
func hostAllowed(domains []string, host string) bool {
	for _, d := range domains {
		if d == "*" || d == host {
			return true
		}
		if suffix, ok := strings.CutPrefix(d, "*."); ok && strings.HasSuffix(host, "."+suffix) {
			return true
		}
	}
	return false
}

// TestAssetRoutesAndPages pins the asset library's declared surface: every
// route is an admin route behind one of the plugin's two permissions, and
// every host-rendered page reads a route that actually exists.
func TestAssetRoutesAndPages(t *testing.T) {
	m := decodeManifest(t)
	if len(m.Routes) == 0 {
		t.Fatal("stage three declares the asset library routes")
	}
	declared := map[string]bool{}
	for _, r := range m.Routes {
		if r.Scope != "admin" {
			t.Errorf("route %s %s scope = %q; the asset library is administrator-only", r.Method, r.Path, r.Scope)
		}
		switch r.Permission {
		case volcengine.PermAssetsRead:
			if r.Method != "GET" {
				t.Errorf("route %s %s is a mutation behind the read permission", r.Method, r.Path)
			}
		case volcengine.PermAssetsManage:
			if r.Method == "GET" {
				t.Errorf("route %s %s is a read behind the manage permission", r.Method, r.Path)
			}
		default:
			t.Errorf("route %s %s permission = %q", r.Method, r.Path, r.Permission)
		}
		declared[r.Method+" "+r.Path] = true
	}
	if m.UI == nil || len(m.UI.Pages) == 0 {
		t.Fatal("stage three declares the asset library pages")
	}
	for id, pg := range m.UI.Pages {
		switch pg.Type {
		case "table":
			if pg.Source == "" {
				t.Fatalf("page %s has no source", id)
			}
			if !declared[pg.Source] {
				t.Errorf("page %s reads %q, which is not a declared route", id, pg.Source)
			}
			if len(pg.Columns) == 0 {
				t.Errorf("page %s has no columns", id)
			}
			// Both index tables are searchable, and the name they declare has
			// to be the one the route reads. The console renders a search box
			// only for a page that declares one and sends the text under that
			// name, so a mismatch here is a box that filters nothing while
			// looking like it does - which is what these two pages shipped
			// with, and why the front end deleted the box.
			if pg.Search != volcengine.SearchParam {
				t.Errorf("page %s declares search %q, but the route reads %q",
					id, pg.Search, volcengine.SearchParam)
			}
			for _, c := range pg.Columns {
				switch c.Format {
				case "text", "number", "datetime", "badge", "currency":
				default:
					// The console silently falls back to plain text for an
					// unknown format, so a typo would never be noticed.
					t.Errorf("page %s column %s: unsupported format %q", id, c.Key, c.Format)
				}
				if c.Label["en"] == "" || c.Label["zh"] == "" {
					t.Errorf("page %s column %s needs an en and zh label", id, c.Key)
				}
			}
		case "form":
			if !declared[pg.Submit] {
				t.Errorf("page %s submits to %q, which is not a declared route", id, pg.Submit)
			}
			mustJSONFile(t, pg.Schema)
			// DeclarativeForm loads "<name>.ui.json" next to the schema.
			mustJSONFile(t, strings.TrimSuffix(pg.Schema, ".schema.json")+".ui.json")
		default:
			t.Errorf("page %s type = %q; stage three only uses host-rendered pages", id, pg.Type)
		}
	}
	// Every menu points at a declared page and carries the permission of the
	// route behind it.
	for _, mn := range m.UI.Menus {
		if _, ok := m.UI.Pages[mn.Page]; !ok {
			t.Errorf("menu %s points at unknown page %q", mn.ID, mn.Page)
		}
		if mn.Permission != volcengine.PermAssetsRead && mn.Permission != volcengine.PermAssetsManage {
			t.Errorf("menu %s permission = %q", mn.ID, mn.Permission)
		}
	}
}

// TestManifestServes runs the plugin with its embedded manifest.
func TestManifestServes(t *testing.T) {
	h := pluginsdktest.Start(t, volcengine.New(), pluginsdktest.Options{SDK: []pluginsdk.Option{pluginsdk.WithManifest(manifestJSON)}})
	want := []string{manifest.CapPlatformAdapter, manifest.CapPlatformExecute, manifest.CapPlatformTasks, manifest.CapPlatformPoll, manifest.CapPlatformMonitor, manifest.CapHTTPRoutes}
	got := h.Info.GetCapabilities()
	slices.Sort(got)
	slices.Sort(want)
	if h.Info.GetPluginKey() != "volcengine" || !slices.Equal(got, want) {
		t.Fatalf("info = %v", h.Info)
	}
}

// TestValidate runs the host's own static manifest validation (the package
// in sdk/manifest/check that the server and the packaging CLI both call) on
// this package, so a rule the core enforces at install time fails here first.
func TestValidate(t *testing.T) {
	files := map[string][]byte{
		"manifest.json":                   manifestJSON,
		"runtimes/linux-amd64/plugin":     []byte("elf"),
		"runtimes/linux-arm64/plugin":     []byte("elf"),
		"forms/apikey.schema.json":        mustJSONFile(t, "forms/apikey.schema.json"),
		"forms/apikey.ui.json":            mustJSONFile(t, "forms/apikey.ui.json"),
		"forms/relay.schema.json":         mustJSONFile(t, "forms/relay.schema.json"),
		"forms/relay.ui.json":             mustJSONFile(t, "forms/relay.ui.json"),
		"forms/asset-group.schema.json":   mustJSONFile(t, "forms/asset-group.schema.json"),
		"forms/asset-group.ui.json":       mustJSONFile(t, "forms/asset-group.ui.json"),
		"forms/asset.schema.json":         mustJSONFile(t, "forms/asset.schema.json"),
		"forms/asset.ui.json":             mustJSONFile(t, "forms/asset.ui.json"),
		"migrations/0001_init.sql":        mustFile(t, "migrations/0001_init.sql"),
		"migrations/0002_video_tasks.sql": mustFile(t, "migrations/0002_video_tasks.sql"),
	}
	if err := check.Validate(decodeManifest(t), files, check.ValidateOptions{HostVersion: "0.1.0"}); err != nil {
		t.Fatalf("core manifest validation: %v", err)
	}
}

// TestPlatformDeclaration checks platforms[]: the volcengine platform and its
// one gateway endpoint (ARCHITECTURE 6.4). Ark's image generation has no
// built-in platform, so this is the plugin's own.
func TestPlatformDeclaration(t *testing.T) {
	m := decodeManifest(t)
	if len(m.Platforms) != 1 {
		t.Fatalf("platforms = %+v, want exactly one", m.Platforms)
	}
	p := m.Platforms[0]
	if p.ID != volcengine.PlatformVolcengine || platforms.IsBuiltin(p.ID) {
		t.Fatalf("platform id = %q (builtin=%v)", p.ID, platforms.IsBuiltin(p.ID))
	}
	if p.Label["en"] == "" || p.Label["zh"] == "" {
		t.Errorf("platform label = %v", p.Label)
	}
	// Ark's image response carries the token counts the same way OpenAI's
	// does (usage.*, no separate cache figures), so the semantics are
	// inclusive like every other Ark surface.
	if p.Usage.Semantics != "inclusive" {
		t.Errorf("platform usage semantics = %q", p.Usage.Semantics)
	}
	if !slices.Equal(p.Protocols(), volcengine.OwnProtocols) {
		t.Fatalf("protocols = %v, want %v", p.Protocols(), volcengine.OwnProtocols)
	}
	// Stage two's image endpoint plus stage five's two video endpoints.
	if len(p.Endpoints) != 3 {
		t.Fatalf("endpoints = %+v, want images, video_submit, video_query", p.Endpoints)
	}
	e := p.Endpoints[0]
	if e.ID != "images" || e.Method != "POST" || e.Path != "/ark/v3/images/generations" {
		t.Fatalf("endpoint = %s %s %s", e.ID, e.Method, e.Path)
	}
	// Ark's own prefix is /api/v3, but "api" is a core route segment: the
	// client points the Ark SDK's base_url at https://<host>/ark/v3 instead.
	// (BuildUpstreamRequest still sends /api/v3 upstream.)
	if manifest.ReservedFirstSegment(e.Path) {
		t.Fatalf("path %q starts with a core route segment %v", e.Path, manifest.CoreRouteSegments)
	}
	if strings.HasPrefix(e.Path, volcengine.APIPrefix) {
		t.Fatalf("path %q must not be Ark's own %s prefix", e.Path, volcengine.APIPrefix)
	}
	// The generic OpenAI image path stays free for a future built-in openai
	// endpoint; binding it to one vendor's plugin would block that.
	if e.Path == "/v1/images/generations" {
		t.Fatal("the generic /v1/images/generations path is deliberately not claimed")
	}
	if e.Protocol != volcengine.ProtocolImages || !strings.HasPrefix(e.Protocol, p.ID+".") {
		t.Fatalf("protocol = %q, want %q under %q.", e.Protocol, volcengine.ProtocolImages, p.ID)
	}
	if e.Kind != "proxy" || e.ErrorFormat != "openai" || e.Billing != "usage" {
		t.Fatalf("kind/errorFormat/billing = %q %q %q", e.Kind, e.ErrorFormat, e.Billing)
	}
	if !slices.Equal(e.Auth.Headers, []string{"authorization"}) || e.Auth.Query != "" {
		t.Fatalf("auth = %+v", e.Auth)
	}
	// Ark images are synchronous JSON; the model is a body field.
	if e.Request.ModelPath != "model" || e.Request.ModelParam != "" || e.Request.Stream || e.Request.StreamPath != "" {
		t.Fatalf("request = %+v", e.Request)
	}
	if e.Response.NonStream != "json" || e.Response.Stream != "" {
		t.Fatalf("response = %+v", e.Response)
	}
	// No endpoint of a built-in platform may be shadowed (the host refuses
	// the package otherwise).
	for _, bp := range platforms.Builtin() {
		for _, be := range bp.Endpoints {
			for _, ee := range p.Endpoints {
				if check.EndpointsConflict(be, ee) {
					t.Errorf("endpoint %s %s conflicts with built-in %q (%s %s)", ee.Method, ee.Path, bp.ID, be.Method, be.Path)
				}
			}
		}
	}
}

// TestVideoEndpoints pins the two Seedance endpoints (stage five): a submit
// whose usage the plugin reads and pre-charges, and a poll whose model the
// plugin resolves and which is never billed.
func TestVideoEndpoints(t *testing.T) {
	p := decodeManifest(t).Platforms[0]
	byID := map[string]manifest.Endpoint{}
	for _, e := range p.Endpoints {
		byID[e.ID] = e
	}

	submit, ok := byID["video_submit"]
	if !ok {
		t.Fatal("no video_submit endpoint")
	}
	if submit.Method != "POST" || submit.Path != "/ark/v3/contents/generations/tasks" {
		t.Fatalf("video_submit = %s %s", submit.Method, submit.Path)
	}
	if submit.Protocol != volcengine.ProtocolVideoSubmit || submit.Kind != "proxy" {
		t.Fatalf("video_submit protocol/kind = %q %q", submit.Protocol, submit.Kind)
	}
	// The submit body carries the model; the response carries only the task
	// id, so usage comes from the plugin (ExtractUsage) and billing is usage
	// (the estimate is charged - "free" would drop the reservation entirely).
	if submit.Request.ModelPath != "model" || submit.Request.ModelSource != "" {
		t.Fatalf("video_submit request = %+v", submit.Request)
	}
	if !submit.PluginUsage() || submit.UsageSource != manifest.UsageSourcePlugin {
		t.Fatalf("video_submit usageSource = %q, want plugin", submit.UsageSource)
	}
	if submit.Billing != "usage" {
		t.Fatalf("video_submit billing = %q; the estimate is only charged when billing is usage", submit.Billing)
	}
	if submit.ErrorFormat != "openai" || submit.Response.NonStream != "json" || submit.Response.Stream != "" {
		t.Fatalf("video_submit errorFormat/response = %q %+v", submit.ErrorFormat, submit.Response)
	}
	// usageRequestFields is what makes the pre-charge a reading instead of a
	// guess. The manifest and the estimate have to agree EXACTLY, including the
	// order: a path the manifest does not declare is never delivered, and the
	// estimate would then silently fall back to a default - the request would
	// succeed and the wrong amount would be charged, with nothing to see. The
	// order matters because the host spends its total byte budget in
	// declaration order, so the five short scalars have to come before the
	// prompt texts (CONTRACTS §25.6).
	if !slices.Equal(submit.UsageRequestFields, volcengine.UsageRequestFields) {
		t.Fatalf("video_submit usageRequestFields = %v, want exactly %v (same order)",
			submit.UsageRequestFields, volcengine.UsageRequestFields)
	}
	for i, p := range submit.UsageRequestFields {
		if !check.ValidUsageRequestPath(p) {
			t.Errorf("usageRequestFields[%d] = %q is not a path that reads one value", i, p)
		}
		if i < 5 && strings.Contains(p, "text") {
			t.Errorf("usageRequestFields[%d] = %q: a prompt text must not come before the scalars", i, p)
		}
	}
	if n := len(submit.UsageRequestFields); n > check.MaxUsageRequestFields {
		t.Fatalf("usageRequestFields declares %d paths, over the SDK cap of %d", n, check.MaxUsageRequestFields)
	}
	// Only the submit endpoint declares them: the query endpoint reads no
	// usage at all, and the checker refuses the field outside usageSource
	// "plugin".
	for _, e := range p.Endpoints {
		if e.ID != "video_submit" && len(e.UsageRequestFields) != 0 {
			t.Errorf("endpoint %q declares usageRequestFields: %v", e.ID, e.UsageRequestFields)
		}
	}
	// The resolution fact is the estimate's tier and the real tier after
	// reconcile; declared as an enum so a bad upstream value is dropped.
	if submit.Usage == nil {
		t.Fatal("video_submit has no usage block for the resolution fact")
	}
	rf, ok := submit.Usage.Facts[volcengine.FactResolution]
	if !ok || rf.Type != "enum" || !slices.Equal(rf.Enum, volcengine.VideoResolutions) {
		t.Fatalf("resolution fact = %+v, want enum %v", rf, volcengine.VideoResolutions)
	}
	// source "plugin" allows an empty path (the plugin supplies the value),
	// but the fact must still declare its type.
	if rf.Path != "" {
		t.Errorf("resolution fact path = %q; the plugin supplies the value, not a gjson path", rf.Path)
	}

	query, ok := byID["video_query"]
	if !ok {
		t.Fatal("no video_query endpoint")
	}
	if query.Method != "GET" || query.Path != "/ark/v3/contents/generations/tasks/:"+volcengine.TaskIDParam {
		t.Fatalf("video_query = %s %s", query.Method, query.Path)
	}
	if query.Protocol != volcengine.ProtocolVideoQuery {
		t.Fatalf("video_query protocol = %q", query.Protocol)
	}
	// The core resolves owner, model and original account from its task record.
	if query.Request.ModelSource != "" ||
		query.Request.ModelPath != "" || query.Request.ModelParam != "" {
		t.Fatalf("video_query request = %+v, want core task lookup", query.Request)
	}
	if !submit.TaskSubmit() || !query.TaskQuery() || submit.Task.Kind != "video" || query.Task.Kind != "video" ||
		query.Task.IDParam != volcengine.TaskIDParam || !slices.Equal(submit.Task.IDPaths, []string{"id", "task_id", "data.id", "result.id"}) ||
		!slices.Equal(query.Task.IDPaths, submit.Task.IDPaths) {
		t.Fatalf("video task contract: submit=%+v query=%+v", submit.Task, query.Task)
	}
	// modelSource "plugin" must not also declare streamPath (ResolveModel
	// answers stream); this endpoint never streams anyway.
	if query.Request.StreamPath != "" || query.Request.Stream {
		t.Fatalf("video_query stream = %+v", query.Request)
	}
	// Polling is free, however many times a client does it - charging is the
	// reconcile loop's job.
	if query.Billing != "free" {
		t.Fatalf("video_query billing = %q, want free", query.Billing)
	}
	// The task id is the one path parameter, and the constant the plugin reads
	// it by must match the pattern.
	if params := check.PathParams(query.Path); !slices.Equal(params, []string{volcengine.TaskIDParam}) {
		t.Fatalf("video_query path params = %v", params)
	}
	// Neither video path may be Ark's own /api/v3 prefix or a reserved core
	// segment.
	for _, e := range []manifest.Endpoint{submit, query} {
		if manifest.ReservedFirstSegment(e.Path) || strings.HasPrefix(e.Path, volcengine.APIPrefix) {
			t.Errorf("video path %q is reserved or uses the /api prefix", e.Path)
		}
	}
}

// arkImageResponse is a documented Ark image generation response
// (docs.volcengine.com/docs/ark/image-generation-api): three images from one
// request, with reference images. usage carries generated_images,
// output_tokens and total_tokens - and no input_tokens, which is why the
// usage map declares none.
const arkImageResponse = `{
  "model": "doubao-seedream-4-5-251128",
  "created": 1757323224,
  "data": [
    {"url": "https://example.invalid/a.jpeg", "size": "2848x1600"},
    {"url": "https://example.invalid/b.jpeg", "size": "2848x1600"},
    {"url": "https://example.invalid/c.jpeg", "size": "2848x1600"}
  ],
  "usage": {"generated_images": 3, "input_images": 2, "output_tokens": 53400, "total_tokens": 53400}
}`

// TestImageUsageRules applies the declared usage rules to that response, the
// way server/internal/usagerules does: every declared path must resolve, and
// the images fact is the metering key an administrator writes a price
// expression against, e.g. u("images") * 0.03 (ARCHITECTURE 7.3).
func TestImageUsageRules(t *testing.T) {
	e := decodeManifest(t).Platforms[0].Endpoints[0]
	u := e.Usage
	if u == nil || u.Semantics != "inclusive" {
		t.Fatalf("endpoint usage = %+v", u)
	}
	if len(u.SSE) != 0 {
		t.Errorf("Ark image generation is synchronous JSON; sse rules = %+v", u.SSE)
	}
	if u.JSON == nil {
		t.Fatal("endpoint usage has no json rules")
	}
	// Only the fields Ark actually reports: there is no input_tokens and no
	// cache accounting on image generation.
	want := map[string]string{
		manifest.UsageModel:        "model",
		manifest.UsageOutputTokens: "usage.output_tokens",
	}
	if len(u.JSON.Map) != len(want) {
		t.Fatalf("json map = %v, want %v", u.JSON.Map, want)
	}
	for field, path := range want {
		if u.JSON.Map[field] != path {
			t.Fatalf("json map[%s] = %q, want %q", field, u.JSON.Map[field], path)
		}
	}
	for field, path := range u.JSON.Map {
		if r := gjson.Get(arkImageResponse, path); !r.Exists() {
			t.Errorf("json map[%s]: path %q is not in a documented Ark image response", field, path)
		}
	}
	if got := gjson.Get(arkImageResponse, u.JSON.Map[manifest.UsageOutputTokens]).Int(); got != 53400 {
		t.Errorf("output tokens = %d, want 53400", got)
	}

	// The metering key. Prices belong to the core and are set per model by an
	// administrator (CONTRACTS §17), so the manifest declares the key only.
	if len(u.Facts) != 1 {
		t.Fatalf("facts = %v, want exactly \"images\"", u.Facts)
	}
	f, ok := u.Facts["images"]
	if !ok || f.Type != "number" || f.Path != "usage.generated_images" {
		t.Fatalf("facts[images] = %+v", f)
	}
	if f.Description["en"] == "" || f.Description["zh"] == "" {
		t.Errorf("facts[images] needs an en and zh description: %v", f.Description)
	}
	r := gjson.Get(arkImageResponse, f.Path)
	if !r.Exists() || r.Int() != 3 {
		t.Errorf("facts[images] resolved to %v, want 3", r.Value())
	}
	if len(gjson.Get(arkImageResponse, "data").Array()) != int(r.Int()) {
		t.Error("usage.generated_images must count the delivered images")
	}
}

// builtin returns the core's built-in openai platform. The definitions live
// in the SDK (sdk/platforms) precisely so a plugin can check itself against
// them (CONTRACTS §13).
func builtin(t *testing.T) *manifest.Platform {
	t.Helper()
	for _, p := range platforms.Builtin() {
		if p.ID == volcengine.PlatformID {
			return &p
		}
	}
	t.Fatalf("no built-in platform %q", volcengine.PlatformID)
	return nil
}

func mustJSONFile(t *testing.T, p string) []byte {
	t.Helper()
	b := mustFile(t, p)
	if !json.Valid(b) {
		t.Fatalf("%s is not valid JSON", p)
	}
	return b
}

func mustFile(t *testing.T, p string) []byte {
	t.Helper()
	b, err := os.ReadFile(filepath.FromSlash(p))
	if err != nil {
		t.Fatalf("read %s: %v", p, err)
	}
	return b
}

// builtinNamed returns one built-in platform by id.
func builtinNamed(t *testing.T, id string) *manifest.Platform {
	t.Helper()
	for _, p := range platforms.Builtin() {
		if p.ID == id {
			return &p
		}
	}
	t.Fatalf("no built-in platform %q", id)
	return nil
}

// usageDiff lists every way b differs from a, as sorted "where: old -> new"
// lines. It exists so an account-type usage override can be asserted to differ
// from the platform's rules in exactly the ways it means to: the override
// replaces the whole block, so a hand copy that drops a field silently stops
// counting it, and comparing the two structures is the only way to notice.
func usageDiff(a, b manifest.UsageRules) []string {
	var out []string
	if a.Semantics != b.Semantics {
		out = append(out, fmt.Sprintf("semantics: %q -> %q", a.Semantics, b.Semantics))
	}
	sse := func(u manifest.UsageRules) map[string]map[string]string {
		m := map[string]map[string]string{}
		for _, s := range u.SSE {
			m[s.Event] = s.Map
		}
		return m
	}
	as, bs := sse(a), sse(b)
	for _, ev := range union(keys(as), keys(bs)) {
		for _, f := range union(keys(as[ev]), keys(bs[ev])) {
			if as[ev][f] != bs[ev][f] {
				out = append(out, fmt.Sprintf("sse[%s].map[%s]: %q -> %q", ev, f, as[ev][f], bs[ev][f]))
			}
		}
	}
	for _, f := range union(keys(a.JSON.Map), keys(b.JSON.Map)) {
		if a.JSON.Map[f] != b.JSON.Map[f] {
			out = append(out, fmt.Sprintf("json.map[%s]: %q -> %q", f, a.JSON.Map[f], b.JSON.Map[f]))
		}
	}
	// Facts are part of the block too: an override that dropped them would
	// stop every u("key") price expression from resolving.
	if len(a.Facts) != len(b.Facts) {
		out = append(out, fmt.Sprintf("facts: %d -> %d", len(a.Facts), len(b.Facts)))
	}
	sort.Strings(out)
	return out
}

func keys[V any](m map[string]V) []string {
	out := make([]string, 0, len(m))
	for k := range m {
		out = append(out, k)
	}
	return out
}

func union(a, b []string) []string {
	seen := map[string]bool{}
	var out []string
	for _, s := range append(append([]string{}, a...), b...) {
		if !seen[s] {
			seen[s] = true
			out = append(out, s)
		}
	}
	sort.Strings(out)
	return out
}

// New endpoint settings are optional and have no defaults: merely editing an
// old account must not override its existing video prefix or asset URL.
func TestEndpointFormsPreserveLegacyAccounts(t *testing.T) {
	raw := mustJSONFile(t, "forms/relay.schema.json")
	var schema struct {
		Properties map[string]struct {
			Pattern   string          `json:"pattern"`
			Default   json.RawMessage `json:"default"`
			MaxLength int             `json:"maxLength"`
		} `json:"properties"`
	}
	if err := json.Unmarshal(raw, &schema); err != nil {
		t.Fatal(err)
	}
	for _, field := range []string{"video_endpoint", "asset_endpoint"} {
		property, ok := schema.Properties[field]
		if !ok || len(property.Default) != 0 || property.MaxLength != 2048 {
			t.Fatalf("%s needs bounded optional endpoint without a default", field)
		}
		pattern, err := regexp.Compile(property.Pattern)
		if err != nil {
			t.Fatal(err)
		}
		for _, value := range []string{"", "/api/v3/contents/generations/tasks", "/api/support/v1/asset", "https://relay.example.com/tasks", "http://relay.example.com/assets"} {
			if !pattern.MatchString(value) {
				t.Errorf("%s rejected %q", field, value)
			}
		}
		for _, value := range []string{"//other.example.com/tasks", "relative/path", "https://relay.example.com/tasks?query=1", "https://relay.example.com/tasks#fragment", "/a b"} {
			if pattern.MatchString(value) {
				t.Errorf("%s accepted malformed endpoint %q", field, value)
			}
		}
	}
	m := decodeManifest(t)
	for _, at := range m.AccountTypes {
		if at.ID == "apikey" && at.Label["zh"] != "字节火山方舟 · 官方通用" || at.ID == "relay" && at.Label["zh"] != "豆包视频" {
			t.Fatalf("unexpected account label: %+v", at.Label)
		}
	}
}
