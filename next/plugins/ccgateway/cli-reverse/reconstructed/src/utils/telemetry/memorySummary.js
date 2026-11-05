/**
 * utils/telemetry/memorySummary.ts
 *
 * 2.1.316 新增：客户端事件上传队列（紧急、重试、关闭交接）；内存归因统计（子进程、页面大小、上报）等。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-exfmq47h.js (37)
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

//@ chunk-exfmq47h.js:779726-779773 placement
/**
 * 注册内存归因器。
 */
function registerMemoryAttributor(name, attributor) {
  memoryAttribution().registerAttributor(name, attributor);
}
//@ chunk-exfmq47h.js:779773-779821 placement
var CHILD_MEMORY_KINDS = ["bash_shell", "mcp_stdio", "lsp", "other"];
//@ chunk-exfmq47h.js:779821-782315 placement
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
//@ chunk-exfmq47h.js:782315-782340 placement
var memoryAttributionByHost; // deferred: uses MemoryAttribution of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-exfmq47h.js:782315", () => {
  memoryAttributionByHost = new HostScoped(() => new MemoryAttribution());
});
//@ chunk-exfmq47h.js:782340-782377 placement
function memoryAttribution() {
  return memoryAttributionByHost.of(getRootSession().host);
}
//@ chunk-exfmq47h.js:782377-782477 placement
/**
 * 登记子进程内存。
 */
function registerChildMemory(kind, pid) {
  if (!hasEmbeddedSearchTools_2() || isBareMode()) return;
  if (!Number.isFinite(pid) || pid <= 0) return;
  memoryAttribution().registerChild(kind, pid);
}
//@ chunk-exfmq47h.js:782477-782541 placement
/**
 * 标记子进程已退出，不再计入内存归因。
 */
function markChildProcessDead(pid) {
  let entry = memoryAttribution().childProcesses.get(pid);
  if (entry) entry.dead = true;
}
//@ chunk-exfmq47h.js:782541-782586 placement
function sampleChildMemoryPeaks() {
  return memoryAttribution().sampleChildPeaks();
}
//@ chunk-exfmq47h.js:782586-782629 placement
/**
 * 安装退出时的内存汇总。
 */
function installMemoryExitSummary(getMemoryPeaks) {
  memoryAttribution().installExitSummary(getMemoryPeaks);
}
//@ chunk-exfmq47h.js:782629-782785 placement
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
//@ chunk-exfmq47h.js:782850-782894 placement
var DEFAULT_STALL_MS = 60000;
var STALL_SIZE_BASE_BYTES = 8388608;
var STALL_BYTES_PER_SECOND = 32768;
var UPLOAD_CHUNK_BYTES = 262144;
//@ chunk-exfmq47h.js:782894-782972 placement
function stallFloorMs(size, stallMs) {
  let min = Math.min(size, STALL_SIZE_BASE_BYTES);
  return Math.max(stallMs, Math.ceil((min / STALL_BYTES_PER_SECOND) * 1000));
}
//@ chunk-exfmq47h.js:782972-783029 placement
function maxAllowedStallMs(size, stallMs) {
  return Math.max(stallMs, Math.ceil((size / STALL_BYTES_PER_SECOND) * 1000));
}
//@ chunk-exfmq47h.js:783029-783071 placement
/**
 * zod 版本是否兼容（>= 1.4.0）。
 */
function isZodVersionCompatible() {
  return semverGt("1.4.4", "1.4.0");
}
//@ chunk-exfmq47h.js:783071-783193 placement
class UploadStalledError extends Error {
  waitedMs;
  constructor(waitedMs) {
    super("transfer stalled");
    this.waitedMs = waitedMs;
    this.name = "UploadStalledError";
  }
}
//@ chunk-exfmq47h.js:783193-783429 placement
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
//@ chunk-exfmq47h.js:783429-783538 placement
function* chunkWithProgress(buffer, onProgress) {
  for (let offset = 0; offset < buffer.length; offset += UPLOAD_CHUNK_BYTES) {
    onProgress(offset);
    yield buffer.subarray(offset, Math.min(offset + UPLOAD_CHUNK_BYTES, buffer.length));
  }
  onProgress(buffer.length);
}
//@ chunk-exfmq47h.js:783538-783593 placement
function uploadBufferWithProgress(buffer, options = {}) {
  return withStallTimeout(buffer.length, (onProgress) => chunkWithProgress(buffer, onProgress), options);
}
//@ chunk-exfmq47h.js:783593-783644 placement
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
//@ chunk-exfmq47h.js:783644-783726 placement
async function* streamChunksWithProgress(slices, onProgress) {
  let bytesHanded = 0;
  onProgress(bytesHanded);
  for await (let slice of slices) {
    bytesHanded += slice.length;
    yield slice;
    onProgress(bytesHanded);
  }
}
//@ chunk-exfmq47h.js:783726-784204 placement
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
//@ chunk-exfmq47h.js:784239-784272 placement
/**
 * 插件目录 API 路径。
 */
var PLUGIN_DIRECTORY_API_PATH = "/api/directory/plugins";
//@ chunk-exfmq47h.js:798859-798871 placement
var consoleProfileBearerProvider = null;
//@ chunk-exfmq47h.js:798871-798910 placement
/**
 * 设置 console profile bearer 提供者并返回旧值。
 */
function setConsoleProfileBearerProvider(provider) {
  let previous = consoleProfileBearerProvider;
  consoleProfileBearerProvider = provider;
  return previous;
}
//@ chunk-exfmq47h.js:798910-798934 placement
function getConsoleProfileBearerProvider() {
  return consoleProfileBearerProvider;
}
//@ chunk-exfmq47h.js:798934-798946 placement
var trustedDeviceProbe = null;
//@ chunk-exfmq47h.js:798946-798984 placement
function setTrustedDeviceProbe(isConsoleProfileSessionsCredential) {
  let previous = trustedDeviceProbe;
  trustedDeviceProbe = isConsoleProfileSessionsCredential;
  return previous;
}
//@ chunk-exfmq47h.js:798984-799018 placement
/**
 * 是否已通过可信设备校验。
 */
function isTrustedDeviceAttested() {
  return trustedDeviceProbe?.() === true;
}
//@ chunk-exfmq47h.js:799018-799221 placement
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
//@ chunk-exfmq47h.js:799388-799435 placement
/**
 * 中断远程会话的控制事件。
 */
var INTERRUPT_REMOTE_EVENT = {
  subtype: "interrupt",
  cancel_queued: true,
};
//@ chunk-exfmq47h.js:799435-799532 placement
/**
 * 取系统事件里的权限模式。
 */
function permissionModeOfSystemEvent(event) {
  if (event.type !== "system" || !("permissionMode" in event)) return;
  return parsePermissionMode(event.permissionMode);
}
//@ chunk-exfmq47h.js:799532-799582 placement
var KNOWN_WORKER_STATES = ["bridge", "anthropic_cloud", "byoc", "snap"];
//@ chunk-exfmq47h.js:799582-799625 placement
/**
 * 是否为已知工作者状态。
 */
function isKnownWorkerState(environmentKind) {
  return KNOWN_WORKER_STATES.some((state) => state === environmentKind);
}
//@ chunk-exfmq47h.js:799625-799639 placement
var SESSION_INIT_ERROR_GRACE_MS = 120000;
//@ chunk-exfmq47h.js:799639-799948 placement
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
//@ chunk-exfmq47h.js:799948-800405 placement
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
//@ chunk-exfmq47h.js:800405-801865 placement
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
    ...(session.status === "paused" && {
      paused: true,
    }),
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
  sampleChildMemoryPeaks,
  UPLOAD_CHUNK_BYTES,
  isZodVersionCompatible,
  uploadStreamWithProgress,
  UploadStalledError,
  createStallTimer,
  KNOWN_WORKER_STATES,
  describeCloudSession,
  setTrustedDeviceProbe,
  getConsoleProfileBearerProvider,
  registerMemoryAttributor,
  registerChildMemory,
  sessionHostKind,
  INTERRUPT_REMOTE_EVENT,
  isKnownWorkerState,
  permissionModeOfSystemEvent,
  PLUGIN_DIRECTORY_API_PATH,
  installMemoryExitSummary,
  isTrustedDeviceAttested,
  safeEmit,
  DEFAULT_STALL_MS,
  uploadBufferWithProgress,
  maxAllowedStallMs,
  markChildProcessDead,
  setConsoleProfileBearerProvider,
};
