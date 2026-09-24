package pluginsdk

import (
	"context"

	pluginv1 "github.com/Sub2API-Devs/sup2api/next/sdk/gen/pluginv1"
)

// Platform mirrors pluginv1.PlatformServiceServer ("platform.adapter.v1").
type Platform interface {
	ValidateCredentials(context.Context, *pluginv1.ValidateCredentialsRequest) (*pluginv1.ValidateCredentialsResponse, error)
	BuildUpstreamRequest(context.Context, *pluginv1.BuildUpstreamRequestRequest) (*pluginv1.BuildUpstreamRequestResponse, error)
	ClassifyError(context.Context, *pluginv1.ClassifyErrorRequest) (*pluginv1.ClassifyErrorResponse, error)
	BuildTestRequest(context.Context, *pluginv1.BuildTestRequestRequest) (*pluginv1.BuildTestRequestResponse, error)
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
