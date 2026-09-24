package registry_test

import (
	"context"
	"strings"
	"testing"

	pluginv1 "github.com/Sub2API-Devs/sup2api/next/sdk/gen/pluginv1"
	"github.com/Sub2API-Devs/sup2api/next/sdk/manifest"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/core"
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
		"gateway.hook":  []byte(`{"points":["gateway.request"],"fields":["model"]}`),
		"routes.admin":  []byte(`{}`),
		"routes.public": []byte(`{}`),
		"jobs":          []byte(`{}`),
		"events":        []byte(`{"subscribe":["usage.recorded"]}`),
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
	if ps := g.PlatformsForProtocol("test.proto"); len(ps) != 2 {
		t.Fatalf("platforms for protocol = %d", len(ps))
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
// the declaring plugin; the protocol index lists native types only.
func TestAccountTypesManyToMany(t *testing.T) {
	platform := registrytest.Manifest("anth", "1.0.0")
	platform.AccountTypes = append(platform.AccountTypes, manifest.AccountType{
		ID: "oauth", Label: manifest.LocalizedText{"en": "OAuth"}, Form: manifest.Form{Mode: "native", Component: "X"},
		Protocols: []manifest.AccountProtocol{{Protocol: "test.proto"}, {Protocol: "test.count"}},
	})
	// A relay plugin declaring only account types (no platform, no endpoints).
	relay := registrytest.Manifest("relay", "1.0.0")
	relay.Platform = nil
	relay.AccountTypes = []manifest.AccountType{
		{ID: "zkey", Label: manifest.LocalizedText{"en": "Z"}, Form: manifest.Form{Mode: "native", Component: "Z"},
			Protocols: []manifest.AccountProtocol{{Protocol: "test.proto"}}},
		{ID: "akey", Label: manifest.LocalizedText{"en": "A"}, Form: manifest.Form{Mode: "native", Component: "A"},
			Protocols: []manifest.AccountProtocol{{Protocol: "other.proto"}}},
	}
	// Without platform.adapter.v1 the account types are not registered.
	noAdapter := registrytest.Manifest("noadapter", "1.0.0")
	noAdapter.Platform = nil

	reg := registry.New()
	g := reg.Publish([]registry.Extension{
		ext{pkg: load(t, relay)}, ext{pkg: load(t, noAdapter), noPlatform: true}, ext{pkg: load(t, platform)},
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
	if b, ok := g.AccountType("relay", "zkey"); !ok || b.Plugin.Key != "relay" {
		t.Fatalf("relay/zkey = %+v %v", b, ok)
	}
	if _, ok := g.Platform("p_relay"); ok {
		t.Fatal("relay declares no platform")
	}

	var native []string
	for _, b := range g.AccountTypesForProtocol("test.proto") {
		native = append(native, b.Plugin.Key+"/"+b.Type.ID)
	}
	if want := "anth/apikey anth/oauth relay/zkey"; strings.Join(native, " ") != want {
		t.Fatalf("test.proto types = %v, want %s", native, want)
	}
	count := g.AccountTypesForProtocol("test.count")
	if len(count) != 1 || count[0].Type.ID != "oauth" {
		t.Fatalf("test.count types = %+v", count)
	}
	if p, ok := count[0].Protocol("test.count"); !ok || p.Protocol != "test.count" {
		t.Fatal("binding protocol lookup")
	}
	if bs := g.AccountTypesForProtocol("nope"); len(bs) != 0 {
		t.Fatalf("unknown protocol = %+v", bs)
	}
}
