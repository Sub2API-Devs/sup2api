package pluginsdk

import (
	"context"

	pluginv1 "github.com/Sub2API-Devs/sup2api/next/sdk/gen/pluginv1"
)

// Platform mirrors pluginv1.PlatformServiceServer ("platform.adapter.v1").
//
// A plugin implements it for the account types it declares in the
// top-level manifest accountTypes (ARCHITECTURE 6.6). Platforms own the
// gateway endpoints: the core provides the built-in platforms (anthropic,
// openai, gemini) and a plugin may declare new ones in manifest platforms[];
// an account type lists the platforms it serves in accountTypes[].platforms
// (built-in or plugin platforms), so a plugin may declare account types
// without declaring any platform or endpoint.
//
// The host calls it only for accounts of the plugin's own types:
//   - Account.type is the account type id;
//   - Account.platform is the platform the client endpoint belongs to;
//   - RequestMeta.protocol is the upstream protocol BuildUpstreamRequest must
//     speak, a protocol of one of the platforms the account type serves;
//   - RequestMeta.client_protocol is the client endpoint's protocol; it
//     differs from protocol only when the core converts the request and
//     response between the two.
type Platform interface {
	ValidateCredentials(context.Context, *pluginv1.ValidateCredentialsRequest) (*pluginv1.ValidateCredentialsResponse, error)
	BuildUpstreamRequest(context.Context, *pluginv1.BuildUpstreamRequestRequest) (*pluginv1.BuildUpstreamRequestResponse, error)
	ClassifyError(context.Context, *pluginv1.ClassifyErrorRequest) (*pluginv1.ClassifyErrorResponse, error)
	BuildTestRequest(context.Context, *pluginv1.BuildTestRequestRequest) (*pluginv1.BuildTestRequestResponse, error)
}

// ModelLister is implemented by platforms whose upstream can list the models
// an account may use (console "fetch models", CONTRACTS §19). Optional: a
// Platform without it answers BuildModelsRequest with UNIMPLEMENTED.
type ModelLister interface {
	BuildModelsRequest(context.Context, *pluginv1.BuildModelsRequestRequest) (*pluginv1.BuildModelsRequestResponse, error)
}

// ModelResolver is implemented by platforms with endpoints whose model is not
// in the request (manifest request.modelSource: "plugin"). The host calls it
// before scheduling — no account exists yet — so it is the plugin declaring
// the PLATFORM that answers, not the one owning the account type. Optional: a
// Platform without it answers ResolveModel with UNIMPLEMENTED, which the host
// turns into 400 "model is required" like any other failure.
type ModelResolver interface {
	ResolveModel(context.Context, *pluginv1.ResolveModelRequest) (*pluginv1.ResolveModelResponse, error)
}

// UsageExtractor is implemented by platforms with endpoints whose token usage
// the declarative manifest rules cannot express (manifest usage.source:
// "plugin"). Like ModelResolver it is answered by the plugin declaring the
// PLATFORM, and it runs after the response has been forwarded in full, so it
// adds nothing to what the client waits for.
//
// It is handed the whole body of a non-streaming response, or - for a stream -
// only the events the endpoint listed in usage.streamEvents; the host never
// buffers a whole stream. Optional: a Platform without it answers
// ExtractUsage with UNIMPLEMENTED, and the host falls back to the declarative
// rules rather than failing a request whose response already reached the
// client.
type UsageExtractor interface {
	ExtractUsage(context.Context, *pluginv1.ExtractUsageRequest) (*pluginv1.UsageReport, error)
}

// Reconciler is implemented by platforms whose ExtractUsage returns a
// Reservation: work that only STARTS during the gateway request and whose
// real usage arrives later (CONTRACTS §25.4). The host charges the estimate
// straight away and then drives the checking itself - backoff, deadline,
// one node at a time - calling these two methods each round.
//
// The division of labour is the point. The plugin describes the request and
// reads the answer; the HOST sends it, through the account's proxy and behind
// its SSRF guard, with the account (credentials included, when the account
// type is this plugin's) handed in. A plugin that reconciles therefore needs
// no "net" permission, no way to enumerate accounts and no scheduled job of
// its own.
//
// Optional: a Platform without it answers both with UNIMPLEMENTED. Returning
// a Reservation without implementing this leaves the entries to be retried
// until their deadline and then abandoned, with the estimate as the final
// charge.
type Reconciler interface {
	BuildReconcileRequest(context.Context, *pluginv1.BuildReconcileRequestRequest) (*pluginv1.BuildReconcileRequestResponse, error)
	ParseReconcileResponse(context.Context, *pluginv1.ParseReconcileResponseRequest) (*pluginv1.ReconcileResult, error)
}

// Hook mirrors pluginv1.HookServiceServer ("gateway.hook.v1").
type Hook interface {
	OnGatewayRequest(context.Context, *pluginv1.GatewayRequestHookRequest) (*pluginv1.GatewayRequestHookResponse, error)
}

// JobRunner is the job half of pluginv1.AppServiceServer ("app.jobs.v1").
type JobRunner interface {
	RunJob(context.Context, *pluginv1.RunJobRequest) (*pluginv1.RunJobResponse, error)
}

// EventHandler is the event half of pluginv1.AppServiceServer
// ("app.events.v1"). Handlers must be idempotent on Event.Id.
type EventHandler interface {
	OnEvents(context.Context, *pluginv1.OnEventsRequest) (*pluginv1.OnEventsResponse, error)
}

// App mirrors pluginv1.AppServiceServer (jobs and events).
type App interface {
	JobRunner
	EventHandler
}

// HTTP mirrors pluginv1.HTTPServiceServer ("http.routes.v1"). See Router for
// a small dispatcher.
type HTTP interface {
	HandleHTTP(context.Context, *pluginv1.HTTPRequest) (*pluginv1.HTTPResponse, error)
}

// Scheduler mirrors pluginv1.SchedulerServiceServer ("scheduler.affinity.v1").
type Scheduler interface {
	ResolveAffinityKey(context.Context, *pluginv1.ResolveAffinityKeyRequest) (*pluginv1.ResolveAffinityKeyResponse, error)
}

// AccountRanker is implemented by schedulers that also rewrite the
// priority/weight of the candidate accounts of a request
// ("scheduler.rank.v1", declared in manifest scheduler.rank). Optional: a
// Scheduler without it answers RankAccounts with UNIMPLEMENTED.
type AccountRanker interface {
	RankAccounts(context.Context, *pluginv1.RankAccountsRequest) (*pluginv1.RankAccountsResponse, error)
}

// Migration mirrors pluginv1.MigrationServiceServer ("migration.data.v1").
type Migration interface {
	MigrateData(context.Context, *pluginv1.MigrateDataRequest) (*pluginv1.MigrateDataResponse, error)
}

// ---------------------------------------------------------------- lifecycle

// Initializer is called once after InitHost succeeded, before the first
// Configure. Use it to open the database, start background workers, etc.
type Initializer interface {
	Init(ctx context.Context, host Host) error
}

// Configurer receives the plugin settings and approved grants. It is called
// after Init and again whenever the administrator changes settings or
// grants. Return a FieldErrors value to reject the configuration field by
// field; any other error rejects it as a whole.
type Configurer interface {
	Configure(ctx context.Context, cfg Config) error
}

// HealthChecker overrides the default health report (always healthy once
// InitHost succeeded).
type HealthChecker interface {
	Health(ctx context.Context) (*pluginv1.HealthResponse, error)
}

// Shutdowner is called when the host asks the plugin to stop. The SDK closes
// the database pool afterwards.
type Shutdowner interface {
	Shutdown(ctx context.Context) error
}
