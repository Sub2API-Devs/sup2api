package registry_test

import (
	"context"
	"strings"
	"testing"

	pluginv1 "github.com/Sub2API-Devs/sup2api/next/sdk/gen/pluginv1"
	"github.com/Sub2API-Devs/sup2api/next/sdk/manifest"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/core"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/platforms"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/plugin/registry"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/plugin/registry/registrytest"
)

type ext struct {
	pkg        *registry.Package
	grants     registry.Grants
	noPlatform bool // plugin without platform.adapter.v1
}

type stub struct{}

func (stub) ValidateCredentials(context.Context, *pluginv1.ValidateCredentialsRequest) (*pluginv1.ValidateCredentialsResponse, error) {
	return &pluginv1.ValidateCredentialsResponse{}, nil
}
func (stub) BuildUpstreamRequest(context.Context, *pluginv1.BuildUpstreamRequestRequest) (*pluginv1.BuildUpstreamRequestResponse, error) {
	return nil, nil
}
func (stub) ClassifyError(context.Context, *pluginv1.ClassifyErrorRequest) (*pluginv1.ClassifyErrorResponse, error) {
	return nil, nil
}
func (stub) BuildTestRequest(context.Context, *pluginv1.BuildTestRequestRequest) (*pluginv1.BuildTestRequestResponse, error) {
	return nil, nil
}
func (stub) OnGatewayRequest(context.Context, *pluginv1.GatewayRequestHookRequest) (*pluginv1.GatewayRequestHookResponse, error) {
	return nil, nil
}
func (stub) RunJob(context.Context, *pluginv1.RunJobRequest) (*pluginv1.RunJobResponse, error) {
	return nil, nil
}
func (stub) OnEvents(context.Context, *pluginv1.OnEventsRequest) (*pluginv1.OnEventsResponse, error) {
	return nil, nil
}
func (stub) HandleHTTP(context.Context, *pluginv1.HTTPRequest) (*pluginv1.HTTPResponse, error) {
	return nil, nil
}

func (e ext) Package() *registry.Package { return e.pkg }
func (e ext) Grants() registry.Grants    { return e.grants }
func (e ext) Platform() core.PlatformPlugin {
	if e.noPlatform {
		return nil
	}
	return stub{}
}
func (e ext) Hook() core.HookPlugin           { return stub{} }
func (e ext) App() core.AppPlugin             { return stub{} }
func (e ext) HTTP() core.HTTPPlugin           { return stub{} }
func (e ext) Scheduler() core.SchedulerPlugin { return nil }

func load(t *testing.T, m *manifest.Manifest) *registry.Package {
	t.Helper()
	p, err := registry.LoadPackage(t.TempDir(), registrytest.Package(t, m, []byte("bin"), nil), "sub2api", "official")
	if err != nil {
		t.Fatal(err)
	}
	t.Cleanup(func() { _ = p.Close() })
	return p
}

func TestGenerationBuildAndSwitch(t *testing.T) {
	a := registrytest.Manifest("alpha", "1.0.0")
	a.Hooks = append(a.Hooks, manifest.Hook{ID: "late", Point: "gateway.request", Order: 50, Needs: []string{"prompt_text"}})
	a.Jobs = []manifest.Job{{ID: "rollup", Schedule: "@every 5m"}}
	a.Events = &manifest.Events{Subscribe: []string{"usage.recorded", "account.created"}}
	b := registrytest.Manifest("beta", "2.0.0")
	b.Hooks[0].Order = 20

	reg := registry.New()
	var seen []uint64
	cancel := reg.OnChange(func(g core.Generation) { seen = append(seen, g.Number()) })
	defer cancel()
	if len(reg.Current().Plugins()) != 0 {
		t.Fatal("initial generation must be empty")
	}

	pa, pb := load(t, a), load(t, b)
	grantsA := registry.Grants{
		"gateway.hook":         []byte(`{"points":["gateway.request"],"fields":["model"]}`),
		"routes.admin":         []byte(`{}`),
		"routes.public":        []byte(`{}`),
		"jobs":                 []byte(`{}`),
		"events":               []byte(`{"subscribe":["usage.recorded"]}`),
		"accounts.credentials": []byte(`{"types":"own"}`),
	}
	g := reg.Publish([]registry.Extension{ext{pkg: pb, grants: registry.Grants{}}, ext{pkg: pa, grants: grantsA}})
	if g.Number() != 1 || len(seen) != 1 || reg.Current() != g {
		t.Fatalf("generation %d, listeners %v", g.Number(), seen)
	}
	if ps := g.Plugins(); len(ps) != 2 || ps[0].Key != "alpha" || ps[1].Key != "beta" {
		t.Fatalf("plugins = %+v", ps)
	}
	info, _ := g.Plugin("alpha")
	if info.AssetBase != "/plugin-ui/alpha/1.0.0-"+pa.Hash8() || info.Trust != "official" {
		t.Fatalf("info = %+v", info)
	}

	// Hooks: only alpha has the gateway.hook grant; needs are narrowed to the
	// granted fields; order is respected.
	hooks := g.Hooks("gateway.request")
	if len(hooks) != 2 || hooks[0].Hook.ID != "0" || hooks[1].Hook.ID != "late" {
		t.Fatalf("hooks = %+v", hooks)
	}
	if f := hooks[0].GrantedFields; len(f) != 1 || f[0] != "model" {
		t.Fatalf("granted fields = %v", f)
	}
	if len(hooks[1].GrantedFields) != 0 {
		t.Fatalf("prompt_text must not be granted: %v", hooks[1].GrantedFields)
	}

	// Routes are filtered by routes.<scope> grants.
	if rs := g.Routes("alpha"); len(rs) != 3 {
		t.Fatalf("alpha routes = %d", len(rs))
	}
	if rs := g.Routes("beta"); len(rs) != 0 {
		t.Fatalf("beta routes without grants = %d", len(rs))
	}
	if len(g.Jobs()) != 1 {
		t.Fatalf("jobs = %d", len(g.Jobs()))
	}
	if subs := g.Subscriptions(); len(subs) != 1 || len(subs[0].Events.Subscribe) != 1 || subs[0].Events.Subscribe[0] != "usage.recorded" {
		t.Fatalf("subscriptions = %+v", subs)
	}

	// Platforms and account types with forms read from the package.
	for _, key := range []string{"alpha", "beta"} {
		pb, ok := g.PlatformForProtocol("p_" + key + ".test")
		if !ok || pb.Builtin || pb.Plugin.Key != key || pb.Platform.ID != "p_"+key {
			t.Fatalf("platform for protocol of %s = %+v %v", key, pb, ok)
		}
	}
	at, ok := g.AccountType("alpha", "apikey")
	if !ok || len(at.FormSchema) == 0 || len(at.FormUI) == 0 || at.Client == nil || at.Key() != (core.AccountTypeKey{PluginKey: "alpha", Type: "apikey"}) {
		t.Fatalf("account type = %+v", at)
	}
	if _, ok := g.AccountType("p_alpha", "apikey"); ok {
		t.Fatal("account types are keyed by plugin, not platform")
	}

	// Assets.
	data, ct, err := g.ReadAsset("alpha", "ui/index.html")
	if err != nil || ct != "text/html; charset=utf-8" || len(data) == 0 {
		t.Fatalf("asset: %v %s", err, ct)
	}
	if _, _, err := g.ReadAsset("alpha", "../../etc/passwd"); err == nil {
		t.Fatal("path escape must fail")
	}
	if _, _, err := g.ReadAsset("gamma", "ui/index.html"); err == nil {
		t.Fatal("unknown plugin must fail")
	}

	// Switching keeps the old generation intact for pinned readers.
	g2 := reg.Publish([]registry.Extension{ext{pkg: pb, grants: registry.Grants{}}})
	if g2.Number() != 2 || len(seen) != 2 {
		t.Fatal("second publish")
	}
	if _, ok := g.Plugin("alpha"); !ok {
		t.Fatal("old generation must stay immutable")
	}
	if _, ok := reg.Current().Plugin("alpha"); ok {
		t.Fatal("alpha must be gone from the current generation")
	}
}

// Account types are declared at the top level by any plugin and served by
// the declaring plugin; the platform index lists the types declaring it.
func TestAccountTypesManyToMany(t *testing.T) {
	platform := registrytest.Manifest("anth", "1.0.0")
	platform.AccountTypes = append(platform.AccountTypes, manifest.AccountType{
		ID: "oauth", Label: manifest.LocalizedText{"en": "OAuth"}, Form: manifest.Form{Mode: "native", Component: "X"},
		Platforms: []manifest.AccountPlatform{{Platform: "p_anth"}, {Platform: manifest.PlatformAnthropic}},
	})
	// A relay plugin declaring only account types (no platform, no endpoints).
	relay := registrytest.Manifest("relay", "1.0.0")
	relay.Platforms = nil
	relay.AccountTypes = []manifest.AccountType{
		{ID: "zkey", Label: manifest.LocalizedText{"en": "Z"}, Form: manifest.Form{Mode: "native", Component: "Z"},
			Platforms: []manifest.AccountPlatform{{Platform: "p_anth"}, {Platform: "p_anth"}}},
		{ID: "akey", Label: manifest.LocalizedText{"en": "A"}, Form: manifest.Form{Mode: "native", Component: "A"},
			Platforms: []manifest.AccountPlatform{{Platform: manifest.PlatformAnthropic}}},
	}
	// Without platform.adapter.v1 the account types are not registered.
	noAdapter := registrytest.Manifest("noadapter", "1.0.0")

	reg := registry.New()
	creds := registry.Grants{"accounts.credentials": []byte(`{"types":"own"}`)}
	// Without the accounts.credentials grant the account types are not
	// registered either (the plugin would never receive credentials).
	noGrant := registrytest.Manifest("nogrant", "1.0.0")
	g := reg.Publish([]registry.Extension{
		ext{pkg: load(t, relay), grants: creds}, ext{pkg: load(t, noAdapter), noPlatform: true, grants: creds},
		ext{pkg: load(t, platform), grants: creds}, ext{pkg: load(t, noGrant)},
	})

	var keys []string
	for _, b := range g.AccountTypes() {
		keys = append(keys, b.Plugin.Key+"/"+b.Type.ID)
		if b.Client == nil {
			t.Fatalf("%v: client is nil", b.Key())
		}
	}
	if want := "anth/apikey anth/oauth relay/akey relay/zkey"; strings.Join(keys, " ") != want {
		t.Fatalf("account types = %v, want %s", keys, want)
	}
	if _, ok := g.AccountType("noadapter", "apikey"); ok {
		t.Fatal("account types of a plugin without platform.adapter.v1 must not be registered")
	}
	if _, ok := g.AccountType("nogrant", "apikey"); ok {
		t.Fatal("account types of a plugin without the accounts.credentials grant must not be registered")
	}
	if b, ok := g.AccountType("relay", "zkey"); !ok || b.Plugin.Key != "relay" {
		t.Fatalf("relay/zkey = %+v %v", b, ok)
	}
	if _, ok := g.Platform("p_relay"); ok {
		t.Fatal("relay declares no platform")
	}
	// Platforms of plugins whose account types are not registered still
	// exist (a platform needs no adapter).
	if _, ok := g.Platform("p_noadapter"); !ok {
		t.Fatal("p_noadapter must exist")
	}

	typesFor := func(platformID string) string {
		var out []string
		for _, b := range g.AccountTypesForPlatform(platformID) {
			out = append(out, b.Plugin.Key+"/"+b.Type.ID)
		}
		return strings.Join(out, " ")
	}
	if got, want := typesFor("p_anth"), "anth/apikey anth/oauth relay/zkey"; got != want {
		t.Fatalf("p_anth types = %v, want %s", got, want)
	}
	// Account types supporting the built-in anthropic platform.
	if got, want := typesFor(manifest.PlatformAnthropic), "anth/oauth relay/akey"; got != want {
		t.Fatalf("anthropic types = %v, want %s", got, want)
	}
	oauth := g.AccountTypesForPlatform(manifest.PlatformAnthropic)[0]
	if p, ok := oauth.Supports(manifest.PlatformAnthropic); !ok || p.Platform != manifest.PlatformAnthropic {
		t.Fatal("binding platform lookup")
	}
	if _, ok := oauth.Supports("p_relay"); ok {
		t.Fatal("oauth does not support p_relay")
	}
	if got := typesFor("nope"); got != "" {
		t.Fatalf("unknown platform = %v", got)
	}
}

// Built-in platforms exist in every generation, even the initial one; plugin
// platforms and their endpoints exist only while the plugin is enabled.
func TestBuiltinAndPluginPlatforms(t *testing.T) {
	builtin := platforms.Builtin()
	if len(builtin) == 0 {
		t.Fatal("no built-in platforms")
	}
	var builtinEndpoints int
	for _, p := range builtin {
		builtinEndpoints += len(p.Endpoints)
	}
	check := func(g core.Generation, plugins ...string) {
		t.Helper()
		ps := g.Platforms()
		if len(ps) != len(builtin)+len(plugins) {
			t.Fatalf("platforms = %d, want %d", len(ps), len(builtin)+len(plugins))
		}
		for i, bp := range builtin {
			b, ok := g.Platform(bp.ID)
			if !ok || !b.Builtin || b.Plugin.Key != "" || ps[i].Platform.ID != bp.ID {
				t.Fatalf("built-in %s = %+v %v", bp.ID, b, ok)
			}
			for _, proto := range bp.Protocols() {
				if pb, ok := g.PlatformForProtocol(proto); !ok || pb.Platform.ID != bp.ID {
					t.Fatalf("protocol %s -> %+v %v", proto, pb, ok)
				}
			}
		}
		eps := g.Endpoints()
		if len(eps) != builtinEndpoints+len(plugins) {
			t.Fatalf("endpoints = %d, want %d", len(eps), builtinEndpoints+len(plugins))
		}
		for _, eb := range eps[:builtinEndpoints] {
			if eb.Plugin.Key != "" || !platforms.IsBuiltin(eb.Platform) {
				t.Fatalf("built-in endpoint = %+v", eb)
			}
		}
		for i, key := range plugins {
			eb := eps[builtinEndpoints+i]
			if eb.Plugin.Key != key || eb.Platform != "p_"+key || eb.Endpoint.Path != "/p_"+key+"/v1/test" {
				t.Fatalf("plugin endpoint = %+v", eb)
			}
			pb, ok := g.Platform("p_" + key)
			if !ok || pb.Builtin || pb.Plugin.Key != key {
				t.Fatalf("platform p_%s = %+v %v", key, pb, ok)
			}
		}
	}

	reg := registry.New()
	check(reg.Current())
	if _, ok := reg.Current().Platform(manifest.PlatformAnthropic); !ok {
		t.Fatal("anthropic must be built in")
	}

	a := ext{pkg: load(t, registrytest.Manifest("alpha", "1.0.0")), grants: registry.Grants{}}
	b := ext{pkg: load(t, registrytest.Manifest("beta", "1.0.0")), grants: registry.Grants{}}
	check(reg.Publish([]registry.Extension{b, a}), "alpha", "beta")
	// Disabling beta removes its platform and endpoint.
	g := reg.Publish([]registry.Extension{a})
	check(g, "alpha")
	if _, ok := g.Platform("p_beta"); ok {
		t.Fatal("p_beta must be gone")
	}
	if _, ok := g.PlatformForProtocol("p_beta.test"); ok {
		t.Fatal("p_beta.test must be gone")
	}
	check(reg.Publish(nil))
}

// Conflicting plugin platforms are skipped as a whole (install-time
// validation normally rejects them first).
func TestPlatformConflictsSkipped(t *testing.T) {
	// Same id as a built-in platform.
	builtinID := registrytest.Manifest("aaa", "1.0.0")
	builtinID.Platforms[0].ID = manifest.PlatformAnthropic
	// Endpoint overlapping a built-in endpoint.
	overlap := registrytest.Manifest("bbb", "1.0.0")
	ep := platforms.Builtin()[0].Endpoints[0]
	overlap.Platforms[0].Endpoints[0].Method = ep.Method
	overlap.Platforms[0].Endpoints[0].Path = "/" + strings.Split(strings.TrimPrefix(ep.Path, "/"), "/")[0] + "/*rest"
	// Same id as the platform of an earlier plugin (by key): ccc wins.
	first := registrytest.Manifest("ccc", "1.0.0")
	dupID := registrytest.Manifest("ddd", "1.0.0")
	dupID.Platforms[0].ID = "p_ccc"
	dupID.Platforms[0].Endpoints[0].Path = "/p_ddd/other"
	// Endpoint overlapping an earlier plugin's endpoint (parameter segment).
	dupPath := registrytest.Manifest("eee", "1.0.0")
	dupPath.Platforms[0].Endpoints[0].Path = "/p_ccc/:ver/test"
	// Two endpoints of one platform overlapping each other.
	selfOverlap := registrytest.Manifest("fff", "1.0.0")
	e2 := registrytest.TestEndpoint("fff")
	e2.ID, e2.Path, e2.Protocol = "t2", "/p_fff/v1/:x", "p_fff.t2"
	selfOverlap.Platforms[0].Endpoints = append(selfOverlap.Platforms[0].Endpoints, e2)
	// A second platform of a plugin can still register when the first one
	// is skipped.
	partial := registrytest.Manifest("ggg", "1.0.0")
	partial.Platforms = append([]manifest.Platform{{ID: "p_ccc", Endpoints: []manifest.Endpoint{e2}}}, partial.Platforms...)

	var exts []registry.Extension
	for _, m := range []*manifest.Manifest{builtinID, overlap, first, dupID, dupPath, selfOverlap, partial} {
		exts = append(exts, ext{pkg: load(t, m), grants: registry.Grants{}})
	}
	g := registry.New().Publish(exts)

	anth, ok := g.Platform(manifest.PlatformAnthropic)
	if !ok || !anth.Builtin {
		t.Fatalf("anthropic = %+v", anth)
	}
	for _, id := range []string{"p_bbb", "p_ddd", "p_eee", "p_fff"} {
		if _, ok := g.Platform(id); ok {
			t.Fatalf("%s must be skipped", id)
		}
	}
	if pb, ok := g.Platform("p_ccc"); !ok || pb.Plugin.Key != "ccc" {
		t.Fatalf("p_ccc = %+v %v", pb, ok)
	}
	if pb, ok := g.Platform("p_ggg"); !ok || pb.Plugin.Key != "ggg" {
		t.Fatalf("p_ggg = %+v %v", pb, ok)
	}
	var plugins []string
	for _, eb := range g.Endpoints() {
		if eb.Plugin.Key != "" {
			plugins = append(plugins, eb.Plugin.Key+":"+eb.Platform)
		}
	}
	if got, want := strings.Join(plugins, " "), "ccc:p_ccc ggg:p_ggg"; got != want {
		t.Fatalf("plugin endpoints = %s, want %s", got, want)
	}
	// Skipped platforms do not affect the rest of the plugin.
	if len(g.Plugins()) != 7 {
		t.Fatalf("plugins = %d", len(g.Plugins()))
	}
}
