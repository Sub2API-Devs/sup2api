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

type EndpointBinding struct {
	Plugin   PluginInfo
	Endpoint manifest.Endpoint
}

type PlatformBinding struct {
	Plugin   PluginInfo
	Platform manifest.Platform
	Client   PlatformPlugin
}

type AccountTypeBinding struct {
	Plugin     PluginInfo
	Platform   string
	Type       manifest.AccountType
	FormSchema json.RawMessage // resolved from the package when form.mode=schema
	FormUI     json.RawMessage
	Validator  PlatformPlugin
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
	// PlatformsForProtocol lists enabled platforms claiming the protocol.
	PlatformsForProtocol(protocol string) []PlatformBinding
	Platform(platformID string) (PlatformBinding, bool)
	AccountTypes() []AccountTypeBinding
	AccountType(platform, accountType string) (AccountTypeBinding, bool)
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
