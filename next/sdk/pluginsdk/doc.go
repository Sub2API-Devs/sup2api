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
//	Executor   -> PlatformService.Execute ("platform.execute.v1")
//	TaskMonitor -> PlatformService.Monitor ("platform.monitor.v1")
//	Poller     -> PlatformService.Poll ("platform.poll.v1")
//	Hook       -> HookService       ("gateway.hook.v1")
//	JobRunner  -> AppService.RunJob ("app.jobs.v1")
//	EventHandler -> AppService.OnEvents ("app.events.v1")
//	BroadcastHandler -> AppService.OnBroadcast ("app.broadcast.v1", see BroadcastMux)
//	HTTP       -> HTTPService       ("http.routes.v1")
//	Scheduler  -> SchedulerService.ResolveAffinityKey ("scheduler.affinity.v1")
//	AccountRanker -> SchedulerService.RankAccounts ("scheduler.rank.v1")
//	Migration  -> MigrationService  ("migration.data.v1")
//
// The SDK implements PluginService itself. Optional lifecycle interfaces
// (Initializer, Configurer, HealthChecker, Shutdowner) let the plugin hook
// into InitHost, Configure, Health and Shutdown. After InitHost the plugin
// reaches the host through the Host interface (log, KV, database, authz,
// ledger, cluster broadcasts via Publish, cluster locks via Locks).
//
// # Running on several nodes
//
// Every node of a cluster runs its own process of the plugin; write the
// plugin for that from the start (CONTRACTS §27.4):
//
//   - Init runs once per process, i.e. on every node, and so does any
//     goroutine it starts. Declare periodic work as manifest jobs[]: each
//     trigger runs on one node for the whole cluster.
//   - Request execution uses Executor and ExecuteDefault: build, forward
//     through the host, then RecordUsage or ReserveAndWatch before returning.
//     Prices, attribution and all ledger writes remain host-owned.
//   - Upstream async work uses endpoint.task + TaskSubmissionParser +
//     TaskMonitor. The host records owner and original account before success,
//     coordinates polling and serves shared snapshots on every node. Do not
//     poll the same task from jobs[], Init or client query handlers.
//     In Monitor, call ExecuteHTTP and ReportTaskProgress with its context;
//     the host atomically records progress and settlement, and binds the request
//     to the account proxy and limits. Generic Egress is a separate permission
//     and does not inherit the polling execution's account limits.
//   - Host.Locks gives cross-node mutual exclusion for other work. The locks
//     are not fenced, so the guarded work must still be idempotent.
//   - KV has no compare-and-set: two nodes doing read-modify-write on one key
//     can lose an update. Use the database (a transaction) or a lock.
//   - Publish is best effort and the publishing node does not receive its
//     own message: apply a change locally, then publish it.
//   - OnEvents is delivered at least once (idempotent on Event.Id), and
//     MigrateData runs once per rollout (the host records it), but a
//     record lost after a successful call means it runs again; both must
//     be idempotent (CONTRACTS §11.7, §36). So must migrations/*.sql.
//
// The pluginsdktest sub-package runs a plugin in-process over bufconn with a
// fake host, for unit tests.
package pluginsdk
