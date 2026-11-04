/**
 * utils/telemetry/memorySummary.ts
 *
 * 2.1.316 新增：客户端事件上传队列（紧急、重试、关闭交接）；内存归因统计（子进程、页面大小、上报）等。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-aepeg2w5.js (37)
 * attribution: placement 37
 */
import { readFile } from "fs/promises";
import { Readable } from "stream";
import { logEvent } from "../../services/analytics/index.js";
import { registerCleanup } from "../cleanupRegistry.js";
import { HostScoped } from "../hostScoped.js";
import { getRootSession, isCcsTenant } from "../../bootstrap/state.js";
import { hasEmbeddedSearchTools_2 } from "../embeddedTools.js";
import { isBareMode } from "../envUtils.js";
import { isHttpMcpServeInvocation } from "../../entrypoints/mcpServeArgs.js";
import { isRemoteManagedEnvironment } from "../remoteEnvironment.js";
import { env } from "../env.js";
import { semverGt } from "../semver.js";
import { logForDebugging } from "../debug.js";
import { errorMessage } from "../errors.js";
import { parsePermissionMode } from "../../types/permissions.js";
import { printableName } from "../printableName.js";
import { normalizeUuidOrNull } from "../agentId.js";
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-aepeg2w5.js:759038-759085 placement
/**
 * 注册内存归因器。
 */
function registerMemoryAttributor(name, attributor) {
  memoryAttribution().registerAttributor(name, attributor);
}
//@ chunk-aepeg2w5.js:759085-759133 placement
var CHILD_MEMORY_KINDS = ["bash_shell", "mcp_stdio", "lsp", "other"];
//@ chunk-aepeg2w5.js:759133-761627 placement
/**
 * 内存归因统计（子进程、页面大小、上报）。
 */
class MemoryAttribution {
  attributors = new Map();
  childProcesses = new Map();
  childRegisteredCount = 0;
  pageSizeBytes = undefined;
  installed = false;
  emitted = false;
  unregisterCleanup = undefined;
  registerAttributor(name, attributor) {
    this.attributors.set(name, attributor);
  }
  registerChild(kind, pid) {
    let existing = this.childProcesses.get(pid);
    if (existing && !existing.dead) return;
    this.childRegisteredCount++;
    let entry = {
      kind,
      peakRssBytes: 0,
      dead: false,
    };
    this.childProcesses.set(pid, entry);
    this.readChildRssBytes(pid).then((rss) => {
      if (rss !== undefined && rss > entry.peakRssBytes) entry.peakRssBytes = rss;
    });
  }
  async sampleChildPeaks() {
    if (this.childProcesses.size === 0) return;
    let filtered = [...this.childProcesses.entries()].filter(([, entry_2]) => !entry_2.dead);
    await Promise.all(
      filtered.map(async ([pid_2, entry_3]) => {
        let childRssBytes = await this.readChildRssBytes(pid_2);
        if (childRssBytes === undefined) entry_3.dead = true;
        else if (childRssBytes > entry_3.peakRssBytes) entry_3.peakRssBytes = childRssBytes;
      }),
    );
  }
  async readChildRssBytes(pid_3) {
    try {
      let file = await readFile(`/proc/${pid_3}/statm`, "utf8");
      let pages = Number(file.split(" ")[1]);
      return Number.isFinite(pages) ? pages * (await this.getPageSizeBytes()) : undefined;
    } catch {
      return;
    }
  }
  async getPageSizeBytes() {
    if (this.pageSizeBytes !== undefined) return this.pageSizeBytes;
    let fallbackPageSize = 4096;
    try {
      let rss = process.memoryUsage().rss;
      let file = await readFile("/proc/self/statm", "utf8");
      let pages_2 = Number(file.split(" ")[1]);
      let pageSize = 2 ** Math.round(Math.log2(rss / pages_2));
      if (Number.isFinite(pageSize) && pageSize > 0) fallbackPageSize = pageSize;
    } catch {}
    this.pageSizeBytes ??= fallbackPageSize;
    return this.pageSizeBytes;
  }
  async buildSummary(peak) {
    let current = process.memoryUsage();
    let summary = {
      uptime_s: Math.round(process.uptime()),
      final_rss_bytes: current.rss,
      final_heap_used_bytes: current.heapUsed,
      final_external_bytes: current.external,
      final_array_buffers_bytes: current.arrayBuffers,
      peak_rss_bytes: Math.max(peak.rss, current.rss),
      peak_heap_used_bytes: Math.max(peak.heapUsed, current.heapUsed),
      peak_external_bytes: Math.max(peak.external, current.external),
      constrained_memory_bytes: process.constrainedMemory?.() || undefined,
    };
    for (let [name_2, attributor_2] of this.attributors)
      try {
        let result = attributor_2();
        summary[`attr_${name_2}_entries`] = result.entries;
        if (result.bytes !== undefined) summary[`attr_${name_2}_bytes`] = result.bytes;
      } catch {}
    await this.sampleChildPeaks();
    let childRssBytesTotal = 0;
    let bytesByKind = {};
    for (let childProcess of this.childProcesses.values()) {
      childRssBytesTotal += childProcess.peakRssBytes;
      bytesByKind[childProcess.kind] = (bytesByKind[childProcess.kind] ?? 0) + childProcess.peakRssBytes;
    }
    summary.child_count = this.childRegisteredCount;
    summary.child_rss_bytes_total = childRssBytesTotal;
    for (let kind of CHILD_MEMORY_KINDS)
      if (bytesByKind[kind] !== undefined) summary[`child_${kind}_rss_bytes`] = bytesByKind[kind];
    return summary;
  }
  async emitSummaryOnce(makePeak) {
    if (this.emitted) return;
    this.emitted = true;
    try {
      logEvent("tengu_sdk_memory_summary", await this.buildSummary(makePeak()));
    } catch {}
  }
  installExitSummary(getPeak) {
    if (this.installed) return;
    this.installed = true;
    this.unregisterCleanup = registerCleanup(() => this.emitSummaryOnce(getPeak));
  }
  reset() {
    this.installed = false;
    this.emitted = false;
    this.unregisterCleanup?.();
    this.unregisterCleanup = undefined;
    this.attributors.clear();
    this.childProcesses.clear();
    this.childRegisteredCount = 0;
  }
}
//@ chunk-aepeg2w5.js:761627-761652 placement
var memoryAttributionByHost; // deferred: uses MemoryAttribution of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-aepeg2w5.js:761627", () => {
  memoryAttributionByHost = new HostScoped(() => new MemoryAttribution());
});
//@ chunk-aepeg2w5.js:761652-761689 placement
function memoryAttribution() {
  return memoryAttributionByHost.of(getRootSession().host);
}
//@ chunk-aepeg2w5.js:761689-761789 placement
/**
 * 登记子进程内存。
 */
function registerChildMemory(kind, pid) {
  if (!hasEmbeddedSearchTools_2() || isBareMode()) return;
  if (!Number.isFinite(pid) || pid <= 0) return;
  memoryAttribution().registerChild(kind, pid);
}
//@ chunk-aepeg2w5.js:761789-761853 placement
/**
 * 标记子进程已退出，不再计入内存归因。
 */
function markChildProcessDead(pid) {
  let entry = memoryAttribution().childProcesses.get(pid);
  if (entry) entry.dead = true;
}
//@ chunk-aepeg2w5.js:761853-761898 placement
function sampleChildMemoryPeaks() {
  return memoryAttribution().sampleChildPeaks();
}
//@ chunk-aepeg2w5.js:761898-761941 placement
/**
 * 安装退出时的内存汇总。
 */
function installMemoryExitSummary(getMemoryPeaks) {
  memoryAttribution().installExitSummary(getMemoryPeaks);
}
//@ chunk-aepeg2w5.js:761941-762097 placement
/**
 * 会话宿主类型（工具容器、租户、远程）。
 */
function sessionHostKind() {
  if (isHttpMcpServeInvocation()) return "tool_container_daemon";
  if (isCcsTenant()) return "ccs_tenant";
  return isRemoteManagedEnvironment() && Boolean(env.CLAUDE_CODE_REMOTE_SESSION_ID)
    ? "hosted_worker"
    : "none";
}
//@ chunk-aepeg2w5.js:762162-762206 placement
var DEFAULT_STALL_MS = 60000;
var STALL_SIZE_BASE_BYTES = 8388608;
var STALL_BYTES_PER_SECOND = 32768;
var UPLOAD_CHUNK_BYTES = 262144;
//@ chunk-aepeg2w5.js:762206-762284 placement
function stallFloorMs(size, stallMs) {
  let min = Math.min(size, STALL_SIZE_BASE_BYTES);
  return Math.max(stallMs, Math.ceil((min / STALL_BYTES_PER_SECOND) * 1000));
}
//@ chunk-aepeg2w5.js:762284-762341 placement
function maxAllowedStallMs(size, stallMs) {
  return Math.max(stallMs, Math.ceil((size / STALL_BYTES_PER_SECOND) * 1000));
}
//@ chunk-aepeg2w5.js:762341-762383 placement
/**
 * zod 版本是否兼容（>= 1.4.0）。
 */
function isZodVersionCompatible() {
  return semverGt("1.4.4", "1.4.0");
}
//@ chunk-aepeg2w5.js:762383-762505 placement
class UploadStalledError extends Error {
  waitedMs;
  constructor(waitedMs) {
    super("transfer stalled");
    this.waitedMs = waitedMs;
    this.name = "UploadStalledError";
  }
}
//@ chunk-aepeg2w5.js:762505-762741 placement
/**
 * 上传停滞计时器（touch/relax/clear）。
 */
function createStallTimer(abortController, timeoutMs) {
  let fired = false;
  let cleared = false;
  let onTimeout = (signal, waitedMs) => {
    fired = true;
    signal.abort(new UploadStalledError(waitedMs));
  };
  let timer = setTimeout(onTimeout, timeoutMs, abortController, timeoutMs);
  return {
    touch: () => {
      if (!cleared) timer.refresh();
    },
    relax: (newTimeout) => {
      if (cleared) return;
      clearTimeout(timer);
      timer = setTimeout(onTimeout, newTimeout, abortController, newTimeout);
    },
    clear: () => {
      cleared = true;
      clearTimeout(timer);
    },
    fired: () => fired,
  };
}
//@ chunk-aepeg2w5.js:762741-762850 placement
function* chunkWithProgress(buffer, onProgress) {
  for (let offset = 0; offset < buffer.length; offset += UPLOAD_CHUNK_BYTES) {
    onProgress(offset);
    yield buffer.subarray(offset, Math.min(offset + UPLOAD_CHUNK_BYTES, buffer.length));
  }
  onProgress(buffer.length);
}
//@ chunk-aepeg2w5.js:762850-762905 placement
function uploadBufferWithProgress(buffer, options = {}) {
  return withStallTimeout(buffer.length, (onProgress) => chunkWithProgress(buffer, onProgress), options);
}
//@ chunk-aepeg2w5.js:762905-762956 placement
/**
 * 以停滞超时上传流式请求体。
 */
function uploadStreamWithProgress(slices, contentLength, options = {}) {
  return withStallTimeout(
    contentLength,
    (onProgress) => streamChunksWithProgress(slices, onProgress),
    options,
  );
}
//@ chunk-aepeg2w5.js:762956-763038 placement
async function* streamChunksWithProgress(slices, onProgress) {
  let bytesHanded = 0;
  onProgress(bytesHanded);
  for await (let slice of slices) {
    bytesHanded += slice.length;
    yield slice;
    onProgress(bytesHanded);
  }
}
//@ chunk-aepeg2w5.js:763038-763516 placement
/**
 * 带停滞超时的请求。
 */
function withStallTimeout(contentLength, toChunks, options) {
  let stallMs = options.stallMs ?? DEFAULT_STALL_MS;
  let max = Math.max(stallFloorMs(contentLength, stallMs), options.tailFloorMs ?? 0);
  let abortController = new AbortController();
  let onSourceAbort = () => abortController.abort(options.signal?.reason);
  if (options.signal?.aborted) onSourceAbort();
  else
    options.signal?.addEventListener("abort", onSourceAbort, {
      once: true,
    });
  let stallTimer = createStallTimer(abortController, stallMs);
  let bytesHanded = 0;
  return {
    body: Readable.from(
      toChunks((handedBytes) => {
        bytesHanded = handedBytes;
        if (handedBytes === contentLength) stallTimer.relax(max);
        else stallTimer.touch();
      }),
      {
        objectMode: false,
      },
    ),
    signal: abortController.signal,
    dispose: () => {
      stallTimer.clear();
      options.signal?.removeEventListener("abort", onSourceAbort);
    },
    seen: () => ({
      body_bytes: contentLength,
      bytes_handed: bytesHanded,
      stalled: stallTimer.fired() && options.signal?.aborted !== true,
    }),
  };
}
//@ chunk-aepeg2w5.js:763551-763584 placement
/**
 * 插件目录 API 路径。
 */
var PLUGIN_DIRECTORY_API_PATH = "/api/directory/plugins";
//@ chunk-aepeg2w5.js:778099-778111 placement
var consoleProfileBearerProvider = null;
//@ chunk-aepeg2w5.js:778111-778150 placement
/**
 * 设置 console profile bearer 提供者并返回旧值。
 */
function setConsoleProfileBearerProvider(provider) {
  let previous = consoleProfileBearerProvider;
  consoleProfileBearerProvider = provider;
  return previous;
}
//@ chunk-aepeg2w5.js:778150-778174 placement
function getConsoleProfileBearerProvider() {
  return consoleProfileBearerProvider;
}
//@ chunk-aepeg2w5.js:778174-778186 placement
var trustedDeviceProbe = null;
//@ chunk-aepeg2w5.js:778186-778224 placement
function setTrustedDeviceProbe(isConsoleProfileSessionsCredential) {
  let previous = trustedDeviceProbe;
  trustedDeviceProbe = isConsoleProfileSessionsCredential;
  return previous;
}
//@ chunk-aepeg2w5.js:778224-778258 placement
/**
 * 是否已通过可信设备校验。
 */
function isTrustedDeviceAttested() {
  return trustedDeviceProbe?.() === true;
}
//@ chunk-aepeg2w5.js:778258-778461 placement
/**
 * 安全调用事件回调。
 */
function safeEmit(emit, event, label) {
  try {
    emit(event);
    return true;
  } catch (error) {
    let eventName = typeof event.subtype === "string" ? `${event.type}:${event.subtype}` : event.type;
    logForDebugging(`[${label}] Dropping ${eventName} frame \u2014 handler threw: ${errorMessage(error)}`, {
      level: "error",
    });
    return false;
  }
}
//@ chunk-aepeg2w5.js:778628-778675 placement
/**
 * 中断远程会话的控制事件。
 */
var INTERRUPT_REMOTE_EVENT = {
  subtype: "interrupt",
  cancel_queued: true,
};
//@ chunk-aepeg2w5.js:778675-778772 placement
/**
 * 取系统事件里的权限模式。
 */
function permissionModeOfSystemEvent(event) {
  if (event.type !== "system" || !("permissionMode" in event)) return;
  return parsePermissionMode(event.permissionMode);
}
//@ chunk-aepeg2w5.js:778772-778822 placement
var KNOWN_WORKER_STATES = ["bridge", "anthropic_cloud", "byoc", "snap"];
//@ chunk-aepeg2w5.js:778822-778865 placement
/**
 * 是否为已知工作者状态。
 */
function isKnownWorkerState(environmentKind) {
  return KNOWN_WORKER_STATES.some((state) => state === environmentKind);
}
//@ chunk-aepeg2w5.js:778865-778879 placement
var SESSION_INIT_ERROR_GRACE_MS = 120000;
//@ chunk-aepeg2w5.js:778879-779188 placement
/**
 * 描述会话初始化错误。
 */
function describeInitError(lastInitError) {
  let message =
    typeof lastInitError.message === "string" ? printableName(lastInitError.message, 500).trim() : "";
  if (message && message !== "<nil>") return message;
  let namePattern = /^[A-Za-z][A-Za-z0-9_]{0,63}$/;
  let found = [lastInitError.error_type, lastInitError.error_kind].find(
    (name) => typeof name === "string" && namePattern.test(name),
  );
  return found ? `the cloud environment failed to start (${found})` : "the cloud environment failed to start";
}
//@ chunk-aepeg2w5.js:779188-779645 placement
/**
 * 会话错误摘要。
 */
function sessionErrorSummary(session, options) {
  let lastInitError =
    session.environment_kind === "bridge" ? null : session.external_metadata?.last_init_error;
  if (lastInitError) {
    let status =
      session.worker_status === "running" ||
      session.worker_status === "idle" ||
      session.worker_status === "requires_action";
    let lastInitError_2 = String(lastInitError.recoverable) === "true";
    let summary = typeof lastInitError.at === "string" ? Date.parse(lastInitError.at) : NaN;
    let result = Number.isFinite(summary) && options - summary > SESSION_INIT_ERROR_GRACE_MS;
    if (lastInitError.error_kind === "environment_deleted" || (!status && (!lastInitError_2 || result)))
      return describeInitError(lastInitError);
  }
  if (session.status === "failed") return "the cloud environment could not be provisioned";
  return;
}
//@ chunk-aepeg2w5.js:779645-781069 placement
/**
 * 描述云会话状态（归档、需要操作等）。
 */
function describeCloudSession(session, options = {}) {
  let status = session.status === "archived" ? "archived" : (session.worker_status ?? "idle");
  let pendingAction = status === "requires_action" ? session.external_metadata?.pending_action : undefined;
  return {
    type: "session",
    id: session.id,
    title: session.title || null,
    session_status: status,
    environment_id: session.environment_id,
    environment_kind: session.environment_kind,
    created_at: session.created_at,
    updated_at: ("updated_at" in session ? session.updated_at : session.last_event_at) ?? session.created_at,
    session_context: {
      sources: session.config?.sources ?? [],
      outcomes: session.config?.outcomes ?? null,
      model: session.config?.model ?? null,
      cwd: "",
      custom_system_prompt: null,
      append_system_prompt: null,
    },
    ...(session.config != null && {
      config_read: true,
    }),
    bound_device_uuid: normalizeUuidOrNull(session.bound_device_uuid)?.toLowerCase(),
    ...(session.tags !== undefined && {
      tags: session.tags,
    }),
    ...(session.external_metadata?.tool_host_status != null && {
      tool_host_status: session.external_metadata.tool_host_status,
    }),
    ...(session.external_metadata?.device_bind_posture != null && {
      device_bind_posture: session.external_metadata.device_bind_posture,
    }),
    ...(session.external_metadata?.artifacts != null && {
      artifacts: session.external_metadata.artifacts,
    }),
    ...(session.external_metadata?.autocompact_state != null && {
      autocompact_state: session.external_metadata.autocompact_state,
    }),
    ...(session.agent_id != null && {
      agent_id: session.agent_id,
    }),
    ...(session.self_hosted_runner_pool_id != null && {
      self_hosted_runner_pool_id: session.self_hosted_runner_pool_id,
    }),
    startup_failure: sessionErrorSummary(session, options.serverNow ?? Date.now()),
    ...(typeof pendingAction?.tool_name === "string" && {
      pending_action: {
        name: pendingAction.tool_name,
        ...(typeof pendingAction.request_id === "string" &&
          pendingAction.request_id !== "" && {
            request_id: pendingAction.request_id,
          }),
      },
    }),
  };
}
export {
  safeEmit,
  sessionHostKind,
  isTrustedDeviceAttested,
  KNOWN_WORKER_STATES,
  describeCloudSession,
  setTrustedDeviceProbe,
  getConsoleProfileBearerProvider,
  UPLOAD_CHUNK_BYTES,
  permissionModeOfSystemEvent,
  registerChildMemory,
  registerMemoryAttributor,
  INTERRUPT_REMOTE_EVENT,
  sampleChildMemoryPeaks,
  installMemoryExitSummary,
  setConsoleProfileBearerProvider,
  isKnownWorkerState,
  isZodVersionCompatible,
  uploadStreamWithProgress,
  UploadStalledError,
  createStallTimer,
  PLUGIN_DIRECTORY_API_PATH,
  DEFAULT_STALL_MS,
  uploadBufferWithProgress,
  maxAllowedStallMs,
  markChildProcessDead,
};
