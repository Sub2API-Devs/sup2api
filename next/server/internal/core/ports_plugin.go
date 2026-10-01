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
	// ResolveModel answers the model (and whether the response streams) of a
	// request to an endpoint declaring request.modelSource "plugin"
	// (CONTRACTS §25.2). It is called on the PlatformBinding.Client of the
	// endpoint's platform, before any account is picked. Optional for
	// plugins: one without it answers gRPC Unimplemented, and the gateway
	// turns any failure into 400 "model is required".
	ResolveModel(ctx context.Context, in *pluginv1.ResolveModelRequest) (*pluginv1.ResolveModelResponse, error)
	// ExtractUsage reads the token usage of a finished upstream response for
	// endpoints whose usage rules declare usage.source "plugin" (CONTRACTS
	// §25.3). Like ResolveModel it is called on the PlatformBinding.Client of
	// the response's platform, but after the response has been forwarded in
	// full, so it costs the client nothing. Optional for plugins: one without
	// it answers gRPC Unimplemented, and the gateway then keeps what the
	// declarative rules produced.
	ExtractUsage(ctx context.Context, in *pluginv1.ExtractUsageRequest) (*pluginv1.UsageReport, error)
	ParseTaskSubmission(ctx context.Context, in *pluginv1.ExtractUsageRequest) (*pluginv1.TaskSubmission, error)
	// BuildReconcileRequest and ParseReconcileResponse check one pre-charged
	// entry (CONTRACTS §25.4): the plugin describes the request and reads the
	// answer, the core sends it through the account's proxy behind its SSRF
	// guard. Called on the PlatformBinding.Client of the platform whose
	// ExtractUsage returned the Reservation, from the offline reconcile loop.
	// Optional for plugins: one without them answers gRPC Unimplemented, and
	// its entries are retried until their deadline and then abandoned.
	BuildReconcileRequest(ctx context.Context, in *pluginv1.BuildReconcileRequestRequest) (*pluginv1.BuildReconcileRequestResponse, error)
	ParseReconcileResponse(ctx context.Context, in *pluginv1.ParseReconcileResponseRequest) (*pluginv1.ReconcileResult, error)
}

// ExecutionHTTP is the one-request network capability supplied by the current
// offline execution. The closure binds the account, proxy, limits and lifetime.
type ExecutionHTTP func(context.Context, *pluginv1.ExecutionHTTPRequest) (*pluginv1.ExecutionHTTPResponse, error)

// PollPlugin is optional and selected only for platform.poll.v1. Runtime
// adapters bind the callback to the exact process and discard it after Poll.
type PollPlugin interface {
	Poll(context.Context, *pluginv1.PollRequest, ExecutionHTTP) (*pluginv1.ReconcileResult, error)
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
	// RankAccounts is optional for plugins: one that does not declare
	// scheduler.rank answers gRPC Unimplemented.
	RankAccounts(ctx context.Context, in *pluginv1.RankAccountsRequest) (*pluginv1.RankAccountsResponse, error)
}

// PluginInfo identifies one active plugin version on this node.
type PluginInfo struct {
	// GrantedPermissions is the local generation's authority snapshot. It is
	// checked against PG before a managed node is declared ready.
	GrantedPermissions []string `json:"-"`
	Key                string
	Version            string
	Manifest           *manifest.Manifest
	Publisher          string
	Trust              string // official | verified | community | unsigned
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
	// Client is the declaring plugin's PlatformService; nil for built-in
	// platforms and for plugins that do not implement platform.adapter.v1.
	// Every caller must check it.
	Client PlatformPlugin
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

// AccountRankerBinding is one plugin taking part in account scheduling
// through manifest scheduler.rank ("scheduler.rank.v1"). The gateway calls
// Client.RankAccounts for requests Rank.Match covers that did not hit a
// sticky binding, and falls back to the accounts' own priority and weight on
// error (rank is always fail open).
type AccountRankerBinding struct {
	Plugin PluginInfo
	Rank   manifest.SchedulerRank
	Client SchedulerPlugin
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
	// AccountRankers lists the plugins declaring scheduler.rank, sorted by
	// declared order then plugin key; the gateway calls them in that order.
	AccountRankers() []AccountRankerBinding
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

// ActivePluginKeys lists the plugins of the current generation, for SQL
// filters that hide accounts of disabled or uninstalled plugins
// (`plugin_key = ANY($n)`). It is nil — meaning "do not filter" — when reg is
// nil or no generation is loaded yet.
func ActivePluginKeys(reg PluginRegistry) []string {
	if reg == nil {
		return nil
	}
	g := reg.Current()
	if g == nil {
		return nil
	}
	ps := g.Plugins()
	keys := make([]string, 0, len(ps))
	for _, p := range ps {
		keys = append(keys, p.Key)
	}
	return keys
}

// ProtocolConverters (owner: gateway) reports which protocol pairs the core
// can convert (ARCHITECTURE 6.6): a client endpoint speaking clientProtocol
// can be served by an account type whose upstream speaks upstreamProtocol.
type ProtocolConverters interface {
	CanConvert(clientProtocol, upstreamProtocol string) bool
}
