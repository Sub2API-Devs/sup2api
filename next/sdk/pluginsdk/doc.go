// Package pluginsdk is the Go SDK for sub2api-next gRPC process plugins.
//
// A plugin is a normal Go binary whose main calls Serve with a value that
// implements one or more capability interfaces:
//
//	//go:embed manifest.json
//	var manifestJSON []byte
//
//	func main() {
//		pluginsdk.Serve(&myPlugin{}, pluginsdk.WithManifest(manifestJSON))
//	}
//
// Capability interfaces mirror the generated pluginv1.XxxServiceServer
// interfaces (without the mustEmbed method):
//
//	Platform   -> PlatformService   ("platform.adapter.v1")
//	Hook       -> HookService       ("gateway.hook.v1")
//	JobRunner  -> AppService.RunJob ("app.jobs.v1")
//	EventHandler -> AppService.OnEvents ("app.events.v1")
//	BroadcastHandler -> AppService.OnBroadcast ("app.broadcast.v1", see BroadcastMux)
//	HTTP       -> HTTPService       ("http.routes.v1")
//	Scheduler  -> SchedulerService  ("scheduler.affinity.v1")
//	Migration  -> MigrationService  ("migration.data.v1")
//
// The SDK implements PluginService itself. Optional lifecycle interfaces
// (Initializer, Configurer, HealthChecker, Shutdowner) let the plugin hook
// into InitHost, Configure, Health and Shutdown. After InitHost the plugin
// reaches the host through the Host interface (log, KV, database, authz,
// ledger, cluster broadcasts via Publish).
//
// The pluginsdktest sub-package runs a plugin in-process over bufconn with a
// fake host, for unit tests.
package pluginsdk
