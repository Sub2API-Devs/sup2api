/**
 * @opentelemetry/semantic-conventions/build/src/stable_metrics.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: @opentelemetry/semantic-conventions@1.37.0..1.39.0
 * pieces: chunk-bwbq4xvm.js (1)
 * attribution: cjs-fingerprint 1
 */
import { __commonJS } from "../../../../../runtime/bun-runtime.js";

//@ chunk-bwbq4xvm.js:109762-115334 cjs-fingerprint
var require_stable_metrics = __commonJS(function (cjsExports) {
  Object.defineProperty(cjsExports, "__esModule", {
    value: true,
  });
  cjsExports.METRIC_SIGNALR_SERVER_ACTIVE_CONNECTIONS =
    cjsExports.METRIC_KESTREL_UPGRADED_CONNECTIONS =
    cjsExports.METRIC_KESTREL_TLS_HANDSHAKE_DURATION =
    cjsExports.METRIC_KESTREL_REJECTED_CONNECTIONS =
    cjsExports.METRIC_KESTREL_QUEUED_REQUESTS =
    cjsExports.METRIC_KESTREL_QUEUED_CONNECTIONS =
    cjsExports.METRIC_KESTREL_CONNECTION_DURATION =
    cjsExports.METRIC_KESTREL_ACTIVE_TLS_HANDSHAKES =
    cjsExports.METRIC_KESTREL_ACTIVE_CONNECTIONS =
    cjsExports.METRIC_JVM_THREAD_COUNT =
    cjsExports.METRIC_JVM_MEMORY_USED_AFTER_LAST_GC =
    cjsExports.METRIC_JVM_MEMORY_USED =
    cjsExports.METRIC_JVM_MEMORY_LIMIT =
    cjsExports.METRIC_JVM_MEMORY_COMMITTED =
    cjsExports.METRIC_JVM_GC_DURATION =
    cjsExports.METRIC_JVM_CPU_TIME =
    cjsExports.METRIC_JVM_CPU_RECENT_UTILIZATION =
    cjsExports.METRIC_JVM_CPU_COUNT =
    cjsExports.METRIC_JVM_CLASS_UNLOADED =
    cjsExports.METRIC_JVM_CLASS_LOADED =
    cjsExports.METRIC_JVM_CLASS_COUNT =
    cjsExports.METRIC_HTTP_SERVER_REQUEST_DURATION =
    cjsExports.METRIC_HTTP_CLIENT_REQUEST_DURATION =
    cjsExports.METRIC_DOTNET_TIMER_COUNT =
    cjsExports.METRIC_DOTNET_THREAD_POOL_WORK_ITEM_COUNT =
    cjsExports.METRIC_DOTNET_THREAD_POOL_THREAD_COUNT =
    cjsExports.METRIC_DOTNET_THREAD_POOL_QUEUE_LENGTH =
    cjsExports.METRIC_DOTNET_PROCESS_MEMORY_WORKING_SET =
    cjsExports.METRIC_DOTNET_PROCESS_CPU_TIME =
    cjsExports.METRIC_DOTNET_PROCESS_CPU_COUNT =
    cjsExports.METRIC_DOTNET_MONITOR_LOCK_CONTENTIONS =
    cjsExports.METRIC_DOTNET_JIT_COMPILED_METHODS =
    cjsExports.METRIC_DOTNET_JIT_COMPILED_IL_SIZE =
    cjsExports.METRIC_DOTNET_JIT_COMPILATION_TIME =
    cjsExports.METRIC_DOTNET_GC_PAUSE_TIME =
    cjsExports.METRIC_DOTNET_GC_LAST_COLLECTION_MEMORY_COMMITTED_SIZE =
    cjsExports.METRIC_DOTNET_GC_LAST_COLLECTION_HEAP_SIZE =
    cjsExports.METRIC_DOTNET_GC_LAST_COLLECTION_HEAP_FRAGMENTATION_SIZE =
    cjsExports.METRIC_DOTNET_GC_HEAP_TOTAL_ALLOCATED =
    cjsExports.METRIC_DOTNET_GC_COLLECTIONS =
    cjsExports.METRIC_DOTNET_EXCEPTIONS =
    cjsExports.METRIC_DOTNET_ASSEMBLY_COUNT =
    cjsExports.METRIC_DB_CLIENT_OPERATION_DURATION =
    cjsExports.METRIC_ASPNETCORE_ROUTING_MATCH_ATTEMPTS =
    cjsExports.METRIC_ASPNETCORE_RATE_LIMITING_REQUESTS =
    cjsExports.METRIC_ASPNETCORE_RATE_LIMITING_REQUEST_LEASE_DURATION =
    cjsExports.METRIC_ASPNETCORE_RATE_LIMITING_REQUEST_TIME_IN_QUEUE =
    cjsExports.METRIC_ASPNETCORE_RATE_LIMITING_QUEUED_REQUESTS =
    cjsExports.METRIC_ASPNETCORE_RATE_LIMITING_ACTIVE_REQUEST_LEASES =
    cjsExports.METRIC_ASPNETCORE_DIAGNOSTICS_EXCEPTIONS =
      undefined;
  cjsExports.METRIC_SIGNALR_SERVER_CONNECTION_DURATION = undefined;
  cjsExports.METRIC_ASPNETCORE_DIAGNOSTICS_EXCEPTIONS = "aspnetcore.diagnostics.exceptions";
  cjsExports.METRIC_ASPNETCORE_RATE_LIMITING_ACTIVE_REQUEST_LEASES =
    "aspnetcore.rate_limiting.active_request_leases";
  cjsExports.METRIC_ASPNETCORE_RATE_LIMITING_QUEUED_REQUESTS = "aspnetcore.rate_limiting.queued_requests";
  cjsExports.METRIC_ASPNETCORE_RATE_LIMITING_REQUEST_TIME_IN_QUEUE =
    "aspnetcore.rate_limiting.request.time_in_queue";
  cjsExports.METRIC_ASPNETCORE_RATE_LIMITING_REQUEST_LEASE_DURATION =
    "aspnetcore.rate_limiting.request_lease.duration";
  cjsExports.METRIC_ASPNETCORE_RATE_LIMITING_REQUESTS = "aspnetcore.rate_limiting.requests";
  cjsExports.METRIC_ASPNETCORE_ROUTING_MATCH_ATTEMPTS = "aspnetcore.routing.match_attempts";
  cjsExports.METRIC_DB_CLIENT_OPERATION_DURATION = "db.client.operation.duration";
  cjsExports.METRIC_DOTNET_ASSEMBLY_COUNT = "dotnet.assembly.count";
  cjsExports.METRIC_DOTNET_EXCEPTIONS = "dotnet.exceptions";
  cjsExports.METRIC_DOTNET_GC_COLLECTIONS = "dotnet.gc.collections";
  cjsExports.METRIC_DOTNET_GC_HEAP_TOTAL_ALLOCATED = "dotnet.gc.heap.total_allocated";
  cjsExports.METRIC_DOTNET_GC_LAST_COLLECTION_HEAP_FRAGMENTATION_SIZE =
    "dotnet.gc.last_collection.heap.fragmentation.size";
  cjsExports.METRIC_DOTNET_GC_LAST_COLLECTION_HEAP_SIZE = "dotnet.gc.last_collection.heap.size";
  cjsExports.METRIC_DOTNET_GC_LAST_COLLECTION_MEMORY_COMMITTED_SIZE =
    "dotnet.gc.last_collection.memory.committed_size";
  cjsExports.METRIC_DOTNET_GC_PAUSE_TIME = "dotnet.gc.pause.time";
  cjsExports.METRIC_DOTNET_JIT_COMPILATION_TIME = "dotnet.jit.compilation.time";
  cjsExports.METRIC_DOTNET_JIT_COMPILED_IL_SIZE = "dotnet.jit.compiled_il.size";
  cjsExports.METRIC_DOTNET_JIT_COMPILED_METHODS = "dotnet.jit.compiled_methods";
  cjsExports.METRIC_DOTNET_MONITOR_LOCK_CONTENTIONS = "dotnet.monitor.lock_contentions";
  cjsExports.METRIC_DOTNET_PROCESS_CPU_COUNT = "dotnet.process.cpu.count";
  cjsExports.METRIC_DOTNET_PROCESS_CPU_TIME = "dotnet.process.cpu.time";
  cjsExports.METRIC_DOTNET_PROCESS_MEMORY_WORKING_SET = "dotnet.process.memory.working_set";
  cjsExports.METRIC_DOTNET_THREAD_POOL_QUEUE_LENGTH = "dotnet.thread_pool.queue.length";
  cjsExports.METRIC_DOTNET_THREAD_POOL_THREAD_COUNT = "dotnet.thread_pool.thread.count";
  cjsExports.METRIC_DOTNET_THREAD_POOL_WORK_ITEM_COUNT = "dotnet.thread_pool.work_item.count";
  cjsExports.METRIC_DOTNET_TIMER_COUNT = "dotnet.timer.count";
  cjsExports.METRIC_HTTP_CLIENT_REQUEST_DURATION = "http.client.request.duration";
  cjsExports.METRIC_HTTP_SERVER_REQUEST_DURATION = "http.server.request.duration";
  cjsExports.METRIC_JVM_CLASS_COUNT = "jvm.class.count";
  cjsExports.METRIC_JVM_CLASS_LOADED = "jvm.class.loaded";
  cjsExports.METRIC_JVM_CLASS_UNLOADED = "jvm.class.unloaded";
  cjsExports.METRIC_JVM_CPU_COUNT = "jvm.cpu.count";
  cjsExports.METRIC_JVM_CPU_RECENT_UTILIZATION = "jvm.cpu.recent_utilization";
  cjsExports.METRIC_JVM_CPU_TIME = "jvm.cpu.time";
  cjsExports.METRIC_JVM_GC_DURATION = "jvm.gc.duration";
  cjsExports.METRIC_JVM_MEMORY_COMMITTED = "jvm.memory.committed";
  cjsExports.METRIC_JVM_MEMORY_LIMIT = "jvm.memory.limit";
  cjsExports.METRIC_JVM_MEMORY_USED = "jvm.memory.used";
  cjsExports.METRIC_JVM_MEMORY_USED_AFTER_LAST_GC = "jvm.memory.used_after_last_gc";
  cjsExports.METRIC_JVM_THREAD_COUNT = "jvm.thread.count";
  cjsExports.METRIC_KESTREL_ACTIVE_CONNECTIONS = "kestrel.active_connections";
  cjsExports.METRIC_KESTREL_ACTIVE_TLS_HANDSHAKES = "kestrel.active_tls_handshakes";
  cjsExports.METRIC_KESTREL_CONNECTION_DURATION = "kestrel.connection.duration";
  cjsExports.METRIC_KESTREL_QUEUED_CONNECTIONS = "kestrel.queued_connections";
  cjsExports.METRIC_KESTREL_QUEUED_REQUESTS = "kestrel.queued_requests";
  cjsExports.METRIC_KESTREL_REJECTED_CONNECTIONS = "kestrel.rejected_connections";
  cjsExports.METRIC_KESTREL_TLS_HANDSHAKE_DURATION = "kestrel.tls_handshake.duration";
  cjsExports.METRIC_KESTREL_UPGRADED_CONNECTIONS = "kestrel.upgraded_connections";
  cjsExports.METRIC_SIGNALR_SERVER_ACTIVE_CONNECTIONS = "signalr.server.active_connections";
  cjsExports.METRIC_SIGNALR_SERVER_CONNECTION_DURATION = "signalr.server.connection.duration";
});
export { require_stable_metrics };
