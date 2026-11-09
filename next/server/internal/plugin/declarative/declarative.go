// Package declarative serves the account types that declare their upstream
// (manifest accountTypes[].upstream, docs/UPSTREAM-DECLARATIVE.md §4.1): it
// implements core.PlatformPlugin locally with the sdk/upstream engine, so
// credential validation, request building, error classification and the
// test and model listing requests need no plugin process. In extend mode the
// plugin still amends each built request.
package declarative

import (
	"context"
	"crypto/sha256"
	"strings"
	"sync"
	"time"

	"google.golang.org/grpc/codes"
	"google.golang.org/grpc/status"

	pluginv1 "github.com/Sub2API-Devs/sup2api/next/sdk/gen/pluginv1"
	"github.com/Sub2API-Devs/sup2api/next/sdk/manifest"
	"github.com/Sub2API-Devs/sup2api/next/sdk/upstream"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/core"
)

// platform names the embedded fallback of Client: an alias keeps the
// embedded field unexported.
type platform = core.PlatformPlugin

// Client is the core.PlatformPlugin of one declared account type. The five
// entry points the declaration covers come from its profile; every other
// one (quota, refresh, reconcile, and the optional account lifecycle and
// model availability) goes to the declaring plugin's platform service when
// the type has one, else answers gRPC Unimplemented. It does not implement
// core.ExecutePlugin: the gateway sends what BuildUpstreamRequest built.
type Client struct {
	platform
	profile *upstream.Profile
	// plugin amends the built request in extend mode; nil otherwise.
	plugin   core.PlatformPlugin
	accounts profileCache
}

var (
	_ core.PlatformPlugin                 = (*Client)(nil)
	_ core.DeclaredUpstream               = (*Client)(nil)
	_ core.AccountLifecyclePlugin         = (*Client)(nil)
	_ core.AccountModelAvailabilityPlugin = (*Client)(nil)
)

// New returns the client of the account type profile was resolved for
// (without an account layer). plugin is the declaring plugin's platform
// service, nil when it has none or may not see credentials: it serves the
// entry points the declaration does not cover and, when the declaration says
// extend, amends every built request (the registry only binds an extend type
// that has one).
func New(profile *upstream.Profile, plugin core.PlatformPlugin) *Client {
	c := &Client{platform: plugin, profile: profile}
	if plugin == nil {
		c.platform = pluginv1.UnimplementedPlatformServiceServer{}
	}
	if profile.Upstream().Extend {
		c.plugin = plugin
	}
	return c
}

// OnAccountLifecycle goes to the plugin like the other entry points the
// declaration does not cover: the core calls it only for a type declaring
// lifecycle. Unimplemented when the plugin has no such hook.
func (c *Client) OnAccountLifecycle(ctx context.Context, in *pluginv1.AccountLifecycleRequest) (*pluginv1.AccountLifecycleResponse, error) {
	if p, ok := c.platform.(core.AccountLifecyclePlugin); ok {
		return p.OnAccountLifecycle(ctx, in)
	}
	return nil, status.Error(codes.Unimplemented, "the plugin has no account lifecycle hook")
}

// CheckModelAvailability goes to the plugin as OnAccountLifecycle does (a
// type declaring modelAvailability).
func (c *Client) CheckModelAvailability(ctx context.Context, in *pluginv1.CheckModelAvailabilityRequest) (*pluginv1.CheckModelAvailabilityResponse, error) {
	if p, ok := c.platform.(core.AccountModelAvailabilityPlugin); ok {
		return p.CheckModelAvailability(ctx, in)
	}
	return nil, status.Error(codes.Unimplemented, "the plugin has no model availability check")
}

// Upstream implements core.DeclaredUpstream.
func (c *Client) Upstream() manifest.Upstream { return c.profile.Upstream() }

// ValidateCredentials checks the key and base URL, and an account layer in
// settings "upstream" for types taking one.
func (c *Client) ValidateCredentials(_ context.Context, in *pluginv1.ValidateCredentialsRequest) (*pluginv1.ValidateCredentialsResponse, error) {
	return c.profile.Validate(in), nil
}

// BuildUpstreamRequest builds the request from the declaration; in extend
// mode the plugin then amends it (merge).
func (c *Client) BuildUpstreamRequest(ctx context.Context, in *pluginv1.BuildUpstreamRequestRequest) (*pluginv1.BuildUpstreamRequestResponse, error) {
	p, err := c.forAccount(in.GetAccount())
	if err != nil {
		return nil, err
	}
	base, err := p.Build(in)
	if err != nil || c.plugin == nil {
		return base, err
	}
	amended, err := c.plugin.BuildUpstreamRequest(ctx, &pluginv1.BuildUpstreamRequestRequest{Meta: in.GetMeta(), Account: in.GetAccount(),
		Fields: in.GetFields(), InboundHeaders: in.GetInboundHeaders(), Attempt: in.GetAttempt(), Base: base})
	if err != nil || amended == nil {
		return amended, err
	}
	return merge(base, amended, p.AuthHeader(in.GetAccount())), nil
}

// merge applies the plugin's amendment to base (§4.1): its headers are
// written over base's except auth (the declaration alone decides the
// credential sent), its patches run after base's, a non-empty url or
// upstream model replaces base's.
func merge(base, amended *pluginv1.BuildUpstreamRequestResponse, auth string) *pluginv1.BuildUpstreamRequestResponse {
	out := &pluginv1.BuildUpstreamRequestResponse{Method: base.GetMethod(), Url: base.GetUrl(), UpstreamModel: base.GetUpstreamModel(),
		Headers: make(map[string]string, len(base.GetHeaders())+len(amended.GetHeaders())),
		Patches: append(append([]*pluginv1.BodyPatch(nil), base.GetPatches()...), amended.GetPatches()...)}
	for k, v := range base.GetHeaders() {
		out.Headers[strings.ToLower(k)] = v
	}
	for k, v := range amended.GetHeaders() {
		if k = strings.ToLower(k); k != auth || auth == "" {
			out.Headers[k] = v
		}
	}
	if u := amended.GetUrl(); u != "" {
		out.Url = u
	}
	if m := amended.GetUpstreamModel(); m != "" {
		out.UpstreamModel = m
	}
	return out
}

// ClassifyError classifies with the declared provider policy (an account
// layer cannot change it).
func (c *Client) ClassifyError(_ context.Context, in *pluginv1.ClassifyErrorRequest) (*pluginv1.ClassifyErrorResponse, error) {
	return c.profile.Classify(time.Now(), in), nil
}

// BuildTestRequest builds the console's account test.
func (c *Client) BuildTestRequest(_ context.Context, in *pluginv1.BuildTestRequestRequest) (*pluginv1.BuildTestRequestResponse, error) {
	p, err := c.forAccount(in.GetAccount())
	if err != nil {
		return nil, err
	}
	return p.Test(in)
}

// BuildModelsRequest builds the model listing request (Unimplemented when
// the declaration has none).
func (c *Client) BuildModelsRequest(_ context.Context, in *pluginv1.BuildModelsRequestRequest) (*pluginv1.BuildModelsRequestResponse, error) {
	p, err := c.forAccount(in.GetAccount())
	if err != nil {
		return nil, err
	}
	return p.Models(in)
}

// PrepareBody implements core.DeclaredUpstream.
func (c *Client) PrepareBody(acc *pluginv1.Account, body []byte, in *core.ParamOverrideContext) (core.ParamOverrideResult, error) {
	p, err := c.forAccount(acc)
	if err != nil {
		return core.ParamOverrideResult{}, err
	}
	return p.PrepareBody(acc, body, in)
}

// UpstreamURL implements core.DeclaredUpstream. built's URL is the
// declaration's when rendering it for built's upstream model gives it back;
// otherwise the plugin replaced it and it is kept, as a code plugin's is.
func (c *Client) UpstreamURL(in *pluginv1.BuildUpstreamRequestRequest, built *pluginv1.BuildUpstreamRequestResponse, model string) (string, error) {
	p, err := c.forAccount(in.GetAccount())
	if err != nil {
		return "", err
	}
	if c.plugin != nil {
		if own, err := p.URL(in, built.GetUpstreamModel()); err != nil || own != built.GetUrl() {
			return built.GetUrl(), err
		}
	}
	return p.URL(in, model)
}

// AuthHeader implements core.DeclaredUpstream.
func (c *Client) AuthHeader(acc *pluginv1.Account) string {
	p, err := c.forAccount(acc)
	if err != nil {
		return ""
	}
	return p.AuthHeader(acc)
}

// forAccount is the profile of acc: the type's own unless the declaration
// takes an account layer, then one cached per account settings.
func (c *Client) forAccount(acc *pluginv1.Account) (*upstream.Profile, error) {
	if acc == nil || !c.profile.Upstream().AccountConfig {
		return c.profile, nil
	}
	return c.accounts.get(c.profile, acc)
}

// maxCachedProfiles bounds profileCache; past it the cache starts over.
const maxCachedProfiles = 1024

// profileCache keeps the profiles of accounts with an account layer, keyed
// by a hash of the settings and credentials the layer is read from, so a
// request does not merge and check the layer again on every call. A changed
// account has another key; the client, and with it the cache, is rebuilt
// with every registry generation.
type profileCache struct {
	mu sync.Mutex
	m  map[[sha256.Size]byte]*upstream.Profile
}

func (pc *profileCache) get(base *upstream.Profile, acc *pluginv1.Account) (*upstream.Profile, error) {
	h := sha256.New()
	h.Write([]byte(acc.GetSettingsJson()))
	h.Write([]byte{0})
	h.Write([]byte(acc.GetCredentialsJson()))
	var key [sha256.Size]byte
	h.Sum(key[:0])
	pc.mu.Lock()
	p := pc.m[key]
	pc.mu.Unlock()
	if p != nil {
		return p, nil
	}
	p, err := base.ForAccount(acc)
	if err != nil {
		return nil, err
	}
	pc.mu.Lock()
	if pc.m == nil || len(pc.m) >= maxCachedProfiles {
		pc.m = map[[sha256.Size]byte]*upstream.Profile{}
	}
	pc.m[key] = p
	pc.mu.Unlock()
	return p, nil
}
