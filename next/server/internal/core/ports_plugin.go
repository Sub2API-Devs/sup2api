package core

import (
	"context"
	"encoding/json"

	pluginv1 "github.com/Sub2API-Devs/sup2api/next/sdk/gen/pluginv1"
	"github.com/Sub2API-Devs/sup2api/next/sdk/manifest"
)

// ============================================================ plugin extension points (registry owner: C plugin-runtime)
//
// Capability interfaces are runtime-agnostic: the gRPC runtime implements them
// over go-plugin today; a JS runtime would implement the same interfaces.
// Implementations apply per-plugin concurrency limits and call timeouts, and
// return ErrPluginUnavailable when the plugin instance is down.

type PlatformPlugin interface {
	ValidateCredentials(ctx context.Context, in *pluginv1.ValidateCredentialsRequest) (*pluginv1.ValidateCredentialsResponse, error)
	BuildUpstreamRequest(ctx context.Context, in *pluginv1.BuildUpstreamRequestRequest) (*pluginv1.BuildUpstreamRequestResponse, error)
	ClassifyError(ctx context.Context, in *pluginv1.ClassifyErrorRequest) (*pluginv1.ClassifyErrorResponse, error)
	BuildTestRequest(ctx context.Context, in *pluginv1.BuildTestRequestRequest) (*pluginv1.BuildTestRequestResponse, error)
	// BuildModelsRequest is optional for plugins: a plugin without it answers
	// gRPC Unimplemented (CONTRACTS §19).
	BuildModelsRequest(ctx context.Context, in *pluginv1.BuildModelsRequestRequest) (*pluginv1.BuildModelsRequestResponse, error)
}

type HookPlugin interface {
	OnGatewayRequest(ctx context.Context, in *pluginv1.GatewayRequestHookRequest) (*pluginv1.GatewayRequestHookResponse, error)
}

type AppPlugin interface {
	RunJob(ctx context.Context, in *pluginv1.RunJobRequest) (*pluginv1.RunJobResponse, error)
	OnEvents(ctx context.Context, in *pluginv1.OnEventsRequest) (*pluginv1.OnEventsResponse, error)
}

type HTTPPlugin interface {
	HandleHTTP(ctx context.Context, in *pluginv1.HTTPRequest) (*pluginv1.HTTPResponse, error)
}

type SchedulerPlugin interface {
	ResolveAffinityKey(ctx context.Context, in *pluginv1.ResolveAffinityKeyRequest) (*pluginv1.ResolveAffinityKeyResponse, error)
}

// PluginInfo identifies one active plugin version on this node.
type PluginInfo struct {
	Key       string
	Version   string
	Manifest  *manifest.Manifest
	Publisher string
	Trust     string // official | verified | community | unsigned
	// AssetBase is the public URL prefix for package assets, e.g.
	// "/plugin-ui/guard/0.1.0-3fa9c1" (version + package hash for caching).
	AssetBase string
}

// EndpointBinding is one gateway endpoint of an available platform. Plugin
// is the declaring plugin (zero for built-in platforms).
type EndpointBinding struct {
	Plugin   PluginInfo
	Platform string // platform id
	Endpoint manifest.Endpoint
}

// PlatformBinding is a built-in platform (Builtin, zero Plugin) or one
// declared by an enabled plugin (ARCHITECTURE 6.6).
type PlatformBinding struct {
	Plugin   PluginInfo
	Builtin  bool
	Platform manifest.Platform
}

// AccountTypeKey identifies an account type: the declaring plugin and the
// type id (ARCHITECTURE 6.6).
type AccountTypeKey struct {
	PluginKey string
	Type      string
}

// AccountTypeBinding is one account type of an enabled plugin. Client is the
// declaring plugin: it validates credentials, builds upstream requests and
// classifies errors for accounts of this type.
type AccountTypeBinding struct {
	Plugin     PluginInfo
	Type       manifest.AccountType
	FormSchema json.RawMessage // resolved from the package when form.mode=schema
	FormUI     json.RawMessage
	Client     PlatformPlugin
}

// Key returns the account type key.
func (b AccountTypeBinding) Key() AccountTypeKey {
	return AccountTypeKey{PluginKey: b.Plugin.Key, Type: b.Type.ID}
}

// Supports returns the account type's entry for platform, if it serves it.
func (b AccountTypeBinding) Supports(platformID string) (manifest.AccountPlatform, bool) {
	for _, p := range b.Type.Platforms {
		if p.Platform == platformID {
			return p, true
		}
	}
	return manifest.AccountPlatform{}, false
}

type HookBinding struct {
	Plugin        PluginInfo
	Hook          manifest.Hook
	GrantedFields []string // hook needs ∩ approved gateway.hook scope
	Client        HookPlugin
}

type RouteBinding struct {
	Plugin PluginInfo
	Route  manifest.Route
	Client HTTPPlugin
}

type JobBinding struct {
	Plugin PluginInfo
	Job    manifest.Job
	Client AppPlugin
}

type SubscriptionBinding struct {
	Plugin PluginInfo
	Events manifest.Events
	Client AppPlugin
}

// Generation is an immutable snapshot of every active extension on this
// node. A request pins one generation for its whole lifetime.
type Generation interface {
	Number() uint64
	Plugins() []PluginInfo
	Plugin(key string) (PluginInfo, bool)
	Endpoints() []EndpointBinding
	// Platforms lists the built-in platforms and those of enabled plugins.
	Platforms() []PlatformBinding
	Platform(platformID string) (PlatformBinding, bool)
	// PlatformForProtocol returns the platform owning an endpoint protocol
	// (protocols are "<platform id>.<name>", unique across platforms).
	PlatformForProtocol(protocol string) (PlatformBinding, bool)
	AccountTypes() []AccountTypeBinding
	AccountType(pluginKey, typeID string) (AccountTypeBinding, bool)
	// AccountTypesForPlatform lists account types serving the platform
	// natively (conversion is decided by the gateway).
	AccountTypesForPlatform(platformID string) []AccountTypeBinding
	Hooks(point string) []HookBinding // sorted by order
	Scheduler(pluginKey string) (SchedulerPlugin, bool)
	Routes(pluginKey string) []RouteBinding
	Jobs() []JobBinding
	Subscriptions() []SubscriptionBinding
	// ReadAsset reads a file from the active package of a plugin.
	ReadAsset(pluginKey, path string) (data []byte, contentType string, err error)
}

// PluginRegistry exposes the current generation and change notifications.
type PluginRegistry interface {
	Current() Generation
	// OnChange is invoked (synchronously, in order) after each switch.
	OnChange(fn func(Generation)) (cancel func())
}

// ProtocolConverters (owner: gateway) reports which protocol pairs the core
// can convert (ARCHITECTURE 6.6): a client endpoint speaking clientProtocol
// can be served by an account type whose upstream speaks upstreamProtocol.
type ProtocolConverters interface {
	CanConvert(clientProtocol, upstreamProtocol string) bool
}
