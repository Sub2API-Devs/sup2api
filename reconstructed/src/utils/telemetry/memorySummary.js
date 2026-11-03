/**
 * utils/telemetry/memorySummary.ts
 *
 * 2.1.316 新增：客户端事件上传队列（紧急、重试、关闭交接）；内存归因统计（子进程、页面大小、上报）等。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-aepeg2w5.js (50)
 * attribution: placement 50
 */
import { readFile } from "fs/promises";
import { Readable } from "stream";
import { randomUUID } from "crypto";
import { logEvent } from "../../services/analytics/index.js";
import { registerCleanup } from "../cleanupRegistry.js";
import { HostScoped } from "../hostScoped.js";
import { getRootSession, isCcsTenant, isDisklessProcess } from "../../bootstrap/state.js";
import { hasEmbeddedSearchTools_2 } from "../embeddedTools.js";
import { isBareMode } from "../envUtils.js";
import { isHttpMcpServeInvocation } from "../../entrypoints/mcpServeArgs.js";
import { isRemoteManagedEnvironment } from "../remoteEnvironment.js";
import { env } from "../env.js";
import { semverGt } from "../semver.js";
import { jsonStringify, jsonParse } from "../slowOperations.js";
import { repairMalformedStringsDeep, normalizeFullWidthSpace } from "../stringUtils.js";
import { logForDebugging } from "../debug.js";
import { errorMessage } from "../errors.js";
import { logFeatureBad } from "../../services/analytics/featureTelemetry.js";
import { lit } from "../../services/analytics/safeMetadata.js";
import { parsePermissionMode } from "../../types/permissions.js";
import { printableName } from "../printableName.js";
import { normalizeUuidOrNull } from "../agentId.js";

//@ chunk-aepeg2w5.js:759038-759085 placement
/**
 * 注册内存归因器。
 */
function registerMemoryAttributor(e, n) {
  memoryAttribution().registerAttributor(e, n);
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
  registerAttributor(e, n) {
    this.attributors.set(e, n);
  }
  registerChild(kind, n) {
    let r = this.childProcesses.get(n);
    if (r && !r.dead) return;
    this.childRegisteredCount++;
    let s = {
      kind,
      peakRssBytes: 0,
      dead: false,
    };
    this.childProcesses.set(n, s);
    this.readChildRssBytes(n).then((h) => {
      if (h !== undefined && h > s.peakRssBytes) s.peakRssBytes = h;
    });
  }
  async sampleChildPeaks() {
    if (this.childProcesses.size === 0) return;
    let filtered = [...this.childProcesses.entries()].filter(([, n]) => !n.dead);
    await Promise.all(
      filtered.map(async ([n, r]) => {
        let childRssBytes = await this.readChildRssBytes(n);
        if (childRssBytes === undefined) r.dead = true;
        else if (childRssBytes > r.peakRssBytes) r.peakRssBytes = childRssBytes;
      }),
    );
  }
  async readChildRssBytes(e) {
    try {
      let file = await readFile(`/proc/${e}/statm`, "utf8");
      let r = Number(file.split(" ")[1]);
      return Number.isFinite(r) ? r * (await this.getPageSizeBytes()) : undefined;
    } catch {
      return;
    }
  }
  async getPageSizeBytes() {
    if (this.pageSizeBytes !== undefined) return this.pageSizeBytes;
    let e = 4096;
    try {
      let rss = process.memoryUsage().rss;
      let file = await readFile("/proc/self/statm", "utf8");
      let s = Number(file.split(" ")[1]);
      let h = 2 ** Math.round(Math.log2(rss / s));
      if (Number.isFinite(h) && h > 0) e = h;
    } catch {}
    this.pageSizeBytes ??= e;
    return this.pageSizeBytes;
  }
  async buildSummary(e) {
    let n = process.memoryUsage();
    let r = {
      uptime_s: Math.round(process.uptime()),
      final_rss_bytes: n.rss,
      final_heap_used_bytes: n.heapUsed,
      final_external_bytes: n.external,
      final_array_buffers_bytes: n.arrayBuffers,
      peak_rss_bytes: Math.max(e.rss, n.rss),
      peak_heap_used_bytes: Math.max(e.heapUsed, n.heapUsed),
      peak_external_bytes: Math.max(e.external, n.external),
      constrained_memory_bytes: process.constrainedMemory?.() || undefined,
    };
    for (let [y, S] of this.attributors)
      try {
        let w = S();
        r[`attr_${y}_entries`] = w.entries;
        if (w.bytes !== undefined) r[`attr_${y}_bytes`] = w.bytes;
      } catch {}
    await this.sampleChildPeaks();
    let childRssBytesTotal = 0;
    let h = {};
    for (let childProcess of this.childProcesses.values()) {
      childRssBytesTotal += childProcess.peakRssBytes;
      h[childProcess.kind] = (h[childProcess.kind] ?? 0) + childProcess.peakRssBytes;
    }
    r.child_count = this.childRegisteredCount;
    r.child_rss_bytes_total = childRssBytesTotal;
    for (let y of CHILD_MEMORY_KINDS) if (h[y] !== undefined) r[`child_${y}_rss_bytes`] = h[y];
    return r;
  }
  async emitSummaryOnce(e) {
    if (this.emitted) return;
    this.emitted = true;
    try {
      logEvent("tengu_sdk_memory_summary", await this.buildSummary(e()));
    } catch {}
  }
  installExitSummary(e) {
    if (this.installed) return;
    this.installed = true;
    this.unregisterCleanup = registerCleanup(() => this.emitSummaryOnce(e));
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
var memoryAttributionByHost = new HostScoped(() => new MemoryAttribution());
//@ chunk-aepeg2w5.js:761652-761689 placement
function memoryAttribution() {
  return memoryAttributionByHost.of(getRootSession().host);
}
//@ chunk-aepeg2w5.js:761689-761789 placement
/**
 * 登记子进程内存。
 */
function registerChildMemory(e, pid) {
  if (!hasEmbeddedSearchTools_2() || isBareMode()) return;
  if (!Number.isFinite(pid) || pid <= 0) return;
  memoryAttribution().registerChild(e, pid);
}
//@ chunk-aepeg2w5.js:761789-761853 placement
/**
 * 标记子进程已退出，不再计入内存归因。
 */
function markChildProcessDead(pid) {
  let n = memoryAttribution().childProcesses.get(pid);
  if (n) n.dead = true;
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
function stallFloorMs(e, stallMs) {
  let min = Math.min(e, STALL_SIZE_BASE_BYTES);
  return Math.max(stallMs, Math.ceil((min / STALL_BYTES_PER_SECOND) * 1000));
}
//@ chunk-aepeg2w5.js:762284-762341 placement
function maxAllowedStallMs(e, stallMs) {
  return Math.max(stallMs, Math.ceil((e / STALL_BYTES_PER_SECOND) * 1000));
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
function createStallTimer(abortController, n) {
  let r = false;
  let s = false;
  let h = (S, waitedMs) => {
    r = true;
    S.abort(new UploadStalledError(waitedMs));
  };
  let timer = setTimeout(h, n, abortController, n);
  return {
    touch: () => {
      if (!s) timer.refresh();
    },
    relax: (S) => {
      if (s) return;
      clearTimeout(timer);
      timer = setTimeout(h, S, abortController, S);
    },
    clear: () => {
      s = true;
      clearTimeout(timer);
    },
    fired: () => r,
  };
}
//@ chunk-aepeg2w5.js:762741-762850 placement
function* chunkWithProgress(e, n) {
  for (let r = 0; r < e.length; r += UPLOAD_CHUNK_BYTES) {
    n(r);
    yield e.subarray(r, Math.min(r + UPLOAD_CHUNK_BYTES, e.length));
  }
  n(e.length);
}
//@ chunk-aepeg2w5.js:762850-762905 placement
function uploadBufferWithProgress(buffer, n = {}) {
  return withStallTimeout(buffer.length, (r) => chunkWithProgress(buffer, r), n);
}
//@ chunk-aepeg2w5.js:762905-762956 placement
/**
 * 以停滞超时上传流式请求体。
 */
function uploadStreamWithProgress(slices, contentLength, r = {}) {
  return withStallTimeout(contentLength, (s) => streamChunksWithProgress(slices, s), r);
}
//@ chunk-aepeg2w5.js:762956-763038 placement
async function* streamChunksWithProgress(e, n) {
  let r = 0;
  n(r);
  for await (let s of e) {
    r += s.length;
    yield s;
    n(r);
  }
}
//@ chunk-aepeg2w5.js:763038-763516 placement
/**
 * 带停滞超时的请求。
 */
function withStallTimeout(e, n, r) {
  let stallMs = r.stallMs ?? DEFAULT_STALL_MS;
  let max = Math.max(stallFloorMs(e, stallMs), r.tailFloorMs ?? 0);
  let abortController = new AbortController();
  let S = () => abortController.abort(r.signal?.reason);
  if (r.signal?.aborted) S();
  else
    r.signal?.addEventListener("abort", S, {
      once: true,
    });
  let stallTimer = createStallTimer(abortController, stallMs);
  let bytesHanded = 0;
  return {
    body: Readable.from(
      n((x) => {
        bytesHanded = x;
        if (x === e) stallTimer.relax(max);
        else stallTimer.touch();
      }),
      {
        objectMode: false,
      },
    ),
    signal: abortController.signal,
    dispose: () => {
      stallTimer.clear();
      r.signal?.removeEventListener("abort", S);
    },
    seen: () => ({
      body_bytes: e,
      bytes_handed: bytesHanded,
      stalled: stallTimer.fired() && r.signal?.aborted !== true,
    }),
  };
}
//@ chunk-aepeg2w5.js:763551-763584 placement
/**
 * 插件目录 API 路径。
 */
var PLUGIN_DIRECTORY_API_PATH = "/api/directory/plugins";
//@ chunk-aepeg2w5.js:763621-763947 placement
/**
 * 对客户端事件签名。
 */
async function signClientEvent(eventSigner, n, r) {
  let s = await eventSigner?.catch(() => {
    return;
  });
  if (s === undefined)
    return {
      payload: r,
    };
  try {
    let h = normalizeJsonRoundTrip({
      ...r,
      uuid: r.uuid || randomUUID(),
    });
    if ([n, h.uuid, h.type].some((S) => S.includes("\x00")))
      return {
        payload: r,
      };
    let y = await s.sign(n, h);
    return y === undefined
      ? {
          payload: r,
        }
      : {
          payload: h,
          device_attestation: y,
        };
  } catch (error) {
    noteSignFailure(s, error);
    return {
      payload: r,
    };
  }
}
//@ chunk-aepeg2w5.js:763947-764018 placement
/**
 * JSON 往返并修复孤立代理项、规范化对象键。
 */
function normalizeJsonRoundTrip(e) {
  let n = jsonStringify(e);
  let r = jsonParse(n);
  if (LONE_SURROGATE_ESCAPE_RE.test(n)) {
    repairMalformedStringsDeep(r);
    normalizeObjectKeys(r);
  }
  return r;
}
//@ chunk-aepeg2w5.js:764018-764050 placement
var LONE_SURROGATE_ESCAPE_RE = /\\ud[89a-f][0-9a-f]{2}/;
//@ chunk-aepeg2w5.js:764050-764302 placement
function normalizeObjectKeys(e) {
  let n = [e];
  while (n.length > 0) {
    let r = n.pop();
    if (r === null || typeof r !== "object") continue;
    let s = r;
    Object.keys(s).forEach((key) => {
      let y = s[key];
      if (y !== null && typeof y === "object") n.push(y);
      let S = Array.isArray(r) ? key : normalizeFullWidthSpace(key);
      if (S !== key) {
        delete s[key];
        s[S] = y;
      }
    });
  }
}
//@ chunk-aepeg2w5.js:764302-764451 placement
/**
 * 签名模块加载失败时记录。
 */
function reportSignerLoadFailure(e) {
  logForDebugging(`[clientEventSigner] the signer module did not load: ${errorMessage(e)}`, {
    level: "warn",
  });
  logFeatureBad("client_event_signer", "module_load_failed");
  return;
}
//@ chunk-aepeg2w5.js:764451-764700 placement
function noteSignFailure(e, error) {
  logEvent("tengu_client_event_signed", {
    ok: false,
    error: error instanceof RangeError ? lit("RangeError") : lit("other"),
  });
  if (!e.noteSignFailure()) return;
  logForDebugging(`[clientEventSigner] event not signed: ${errorMessage(error)}`, {
    level: "warn",
  });
  logFeatureBad("client_event_signer", "sign_failed");
}
//@ chunk-aepeg2w5.js:764700-764784 placement
/**
 * 客户端事件上传错误基类（带 retryAfterMs）。
 */
class ClientEventUploadError extends Error {
  retryAfterMs;
  constructor(message, retryAfterMs) {
    super(message);
    this.retryAfterMs = retryAfterMs;
  }
}
//@ chunk-aepeg2w5.js:764784-764807 placement
/**
 * 批次被拒、需重发的事件上传错误。
 */
class ClientEventBatchRejectedError extends ClientEventUploadError {}
//@ chunk-aepeg2w5.js:764807-764887 placement
/**
 * 「批次被拒，请稍后重发」错误。
 */
class ClientEventResendSoonError extends Error {
  constructor() {
    super("batch refused: resend it in two");
  }
}
//@ chunk-aepeg2w5.js:764887-764963 placement
/**
 * 「批次太小」上传错误（带 minBytes）。
 */
class ClientEventTooSmallError extends Error {
  minBytes;
  constructor(message, minBytes) {
    super(message);
    this.minBytes = minBytes;
  }
}
//@ chunk-aepeg2w5.js:764963-765073 placement
var MAX_INT32 = 2147483647;
var URGENT_RETRIES = 4;
var uploadStats = {
  posts: 0,
  rows: 0,
  maxRowsPost: 0,
  failedPosts: 0,
  droppedRows: 0,
  otherPosts: 0,
  otherRows: 0,
};
//@ chunk-aepeg2w5.js:765073-777777 placement
/**
 * 客户端事件上传队列（紧急、重试、关闭交接）。
 */
class ClientEventUploader {
  pending = [];
  urgent = [];
  pendingAtClose = 0;
  handedOverAfterClose = 0;
  inFlight;
  inFlightSince = 0;
  undelivered = [];
  retaining = false;
  draining = false;
  gathering = false;
  closed = false;
  backpressureResolvers = [];
  backoff = null;
  retryNowOwed = false;
  cutsNextBackoff = false;
  backoffOwedUntil = 0;
  flushResolvers = [];
  droppedBatches = 0;
  holdSpec;
  holdTimer = null;
  heldSince = 0;
  holdDeadline = 0;
  heldRule = "no_subscriber_flag";
  heldCount = 0;
  heldBytes = 0;
  owed = 0;
  sentBefore = new Set();
  resendSizes = [];
  flushing = false;
  released;
  counts = {
    ...uploadStats,
  };
  tiedToNext = new WeakSet();
  config;
  constructor(config) {
    this.config = config;
  }
  get droppedBatchCount() {
    return this.droppedBatches;
  }
  get pendingCount() {
    return this.closed ? this.pendingAtClose : this.urgent.length + this.pending.length;
  }
  get handedOverAfterCloseCount() {
    return this.handedOverAfterClose;
  }
  hasRoomFor(e) {
    return !this.closed && this.pending.length + e <= this.config.maxQueueSize;
  }
  setHold(e, n) {
    let holdSpec = this.holdSpec;
    if (
      e?.rule === holdSpec?.rule &&
      e?.maxAgeMs === holdSpec?.maxAgeMs &&
      e?.maxItems === holdSpec?.maxItems &&
      e?.maxBytes === holdSpec?.maxBytes &&
      e?.passes === holdSpec?.passes
    )
      return;
    if (this.gathering) this.drain();
    this.holdSpec = e;
    if (!e) {
      this.release(n);
      return;
    }
    if (this.closed || this.flushing) return;
    if (!holdSpec) this.owed = this.pending.length;
    this.rejudgeHeld();
  }
  rejudgeHeld() {
    let e = this.holdTimer ? this.heldSince : Date.now();
    this.cancelHold();
    this.countHeld();
    this.applyHoldLimits(e);
    this.drain();
  }
  cutBackoff() {
    if (this.backoff?.until !== undefined) this.endBackoff();
    else if (this.inFlight) this.cutsNextBackoff = true;
  }
  release(e, n) {
    this.endHold(e, n);
    this.owed = this.pending.length;
    this.drain();
  }
  takeUndelivered() {
    let undelivered = this.undelivered;
    this.undelivered = [];
    return undelivered;
  }
  peekUndelivered() {
    return this.undelivered;
  }
  discardUndelivered() {
    let e = this.undelivered.length;
    this.undelivered = [];
    this.retaining = false;
    return e;
  }
  async enqueue(e, n) {
    let r = Array.isArray(e) ? e : [e];
    if (r.length === 0) return;
    if (this.closed) {
      this.retainUndelivered(r);
      return;
    }
    if (n?.urgent) {
      this.urgent.push(...r);
      if (this.backoff?.until !== undefined) {
        this.backoffOwedUntil = this.backoff.until;
        this.endBackoff();
      }
      this.drain();
      return;
    }
    if (r.length > this.config.maxQueueSize && !n?.together) {
      for (let y = 0; y < r.length; y += this.config.maxQueueSize)
        await this.enqueue(r.slice(y, y + this.config.maxQueueSize), n);
      return;
    }
    let s = n?.together ? 1 : r.length;
    if (this.holdTimer && this.pending.length + s > this.config.maxQueueSize) this.release("cap");
    while (this.pending.length + s > this.config.maxQueueSize && !this.closed) {
      if (this.gathering) {
        this.drain();
        continue;
      }
      await new Promise((resolve) => {
        this.backpressureResolvers.push(resolve);
      });
    }
    if (this.closed) {
      this.retainUndelivered(r);
      return;
    }
    if (n?.together) {
      for (let y of r.slice(0, -1)) if (typeof y === "object" && y !== null) this.tiedToNext.add(y);
    }
    this.pending.push(...r);
    if (n?.release) {
      this.release(n.release, n.releasedBy);
      return;
    }
    let h = this.holdOnArrivals();
    if (h && this.countInto(h, r) > 0) this.applyHoldLimits(n?.since ?? Date.now());
    if (!this.config.gatherTick) this.drain();
    else if (!this.draining && !this.gathering) {
      this.gathering = true;
      setImmediate((y) => {
        if (y.gathering) y.drain();
      }, this);
    }
  }
  countInto(e, n) {
    let r = 0;
    for (let s of n)
      if (!e.passes?.(s)) {
        r++;
        if (e.maxBytes !== undefined) this.heldBytes += jsonByteLength(s) ?? 0;
      }
    this.heldCount += r;
    return r;
  }
  holdOnArrivals() {
    let holdSpec = this.holdSpec;
    return holdSpec && !this.flushing && (holdSpec.passes || !this.draining) ? holdSpec : undefined;
  }
  sendableCount() {
    let holdSpec = this.holdSpec;
    if (!holdSpec || this.flushing) return this.pending.length;
    if (!holdSpec.passes) return this.holdTimer ? 0 : this.pending.length;
    let owed = this.owed;
    while (owed < this.pending.length && holdSpec.passes(this.pending[owed])) owed++;
    return owed;
  }
  takePassing(e, n) {
    let { maxBatchSize } = this.config;
    let s = this.byteLimit(n);
    let h = [];
    let y = [];
    let S = 0;
    let w = false;
    for (let R of this.pending) {
      if (w || !e(R)) {
        y.push(R);
        continue;
      }
      let x = s === undefined ? 0 : jsonByteLength(R);
      if (x === undefined) {
        this.sentBefore.delete(R);
        continue;
      }
      if (h.length > 0 && S + x > (s ?? 0)) {
        w = true;
        y.push(R);
        continue;
      }
      S += x;
      h.push(R);
      w = h.length >= maxBatchSize;
    }
    this.pending = y;
    return {
      items: h,
      bytes: S,
    };
  }
  jsonBytesOf(e) {
    if (this.config.maxBatchBytes === undefined) return 0;
    let n = 0;
    for (let r of e) n += jsonByteLength(r) ?? 0;
    return n;
  }
  byteLimit(e) {
    let n =
      typeof this.config.maxBatchBytes === "function"
        ? this.config.maxBatchBytes()
        : this.config.maxBatchBytes;
    return n === undefined || e === undefined ? n : Math.min(n, e);
  }
  countHeld() {
    this.heldCount = 0;
    this.heldBytes = 0;
    let e = this.holdOnArrivals();
    if (e) this.countInto(e, this.pending.slice(this.owed));
  }
  applyHoldLimits(e) {
    let holdSpec = this.holdSpec;
    if (!holdSpec || this.heldCount === 0) {
      this.cancelHold();
      return;
    }
    let r =
      holdSpec.maxItems !== undefined && this.heldCount >= holdSpec.maxItems
        ? "max_events"
        : holdSpec.maxBytes !== undefined && this.heldBytes >= holdSpec.maxBytes
          ? "max_bytes"
          : this.pending.length - this.owed >=
              (this.config.holdMaxItems === undefined
                ? this.config.maxBatchSize
                : Math.max(
                    this.config.holdMaxItems,
                    Math.min(holdSpec.maxItems ?? 0, this.config.maxBatchSize),
                  ))
            ? "cap"
            : undefined;
    this.hold(e);
    if (r) this.release(r);
  }
  hold(e) {
    let holdSpec = this.holdSpec;
    if (!holdSpec) return;
    if (this.holdTimer) {
      if (e >= this.heldSince) return;
      clearTimeout(this.holdTimer);
    }
    this.heldSince = e;
    this.heldRule = holdSpec.rule;
    let now = Date.now();
    let min = Math.min(holdSpec.maxAgeMs, Math.max(0, e + holdSpec.maxAgeMs - now));
    this.holdDeadline = now + min;
    this.holdTimer = setTimeout(() => this.release("max_age"), min);
  }
  cancelHold() {
    if (this.holdTimer) {
      clearTimeout(this.holdTimer);
      this.holdTimer = null;
    }
    this.heldCount = 0;
    this.heldBytes = 0;
  }
  endHold(e, n) {
    let r = this.holdTimer !== null;
    this.cancelHold();
    if (!r) return;
    let now = Date.now();
    let h = e === "max_age" && isDisklessProcess() ? this.holdDeadline : now;
    let min = Math.min(Math.max(0, Math.round(h - this.heldSince)), MAX_INT32);
    let S = this.pending.length;
    let heldRule = this.heldRule;
    if (this.released) this.reportDrained();
    this.released = {
      reason: e,
      rule: heldRule,
      count: S,
      ageMs: min,
      at: now,
      unsent: S,
    };
    this.config.onHoldRelease?.(e, S, min, heldRule, n);
  }
  retainUndelivered(e) {
    this.handedOverAfterClose += e.length;
    if (!this.retaining) return;
    let n = this.config.maxQueueSize - this.undelivered.length;
    if (n <= 0) return;
    this.undelivered.push(...(e.length > n ? e.slice(0, n) : e));
  }
  flush(e) {
    if (this.pending.length === 0 && this.urgent.length === 0 && !this.draining) return Promise.resolve();
    this.endHold("flush");
    this.flushing = true;
    if (e?.retryNow) {
      this.retryNowOwed = this.backoff === null;
      this.endBackoff();
    }
    this.drain();
    return new Promise((resolve) => {
      this.flushResolvers.push(resolve);
    });
  }
  withdraw(e) {
    if (this.closed) return 0;
    let filtered = this.urgent.filter((S) => {
      let w = !e(S);
      if (!w) this.sentBefore.delete(S);
      return w;
    });
    let r = this.urgent.length - filtered.length;
    this.urgent = filtered;
    let owed = this.owed;
    let filtered_2 = this.pending.filter((S, w) => {
      if (!e(S)) return true;
      if (w < this.owed) owed--;
      this.sentBefore.delete(S);
      return false;
    });
    let y = this.pending.length - filtered_2.length;
    if (y === 0) return r;
    this.pending = filtered_2;
    this.owed = owed;
    this.resendSizes = [];
    this.rejudgeHeld();
    this.releaseBackpressure();
    return y + r;
  }
  close(e) {
    if (this.closed) return 0;
    if (this.gathering) this.drain();
    this.closed = true;
    this.pendingAtClose = this.urgent.length + this.pending.length;
    this.retaining = e?.retainUndelivered === true;
    this.cancelHold();
    this.owed = 0;
    this.sentBefore.clear();
    this.flushing = false;
    let combined = (this.inFlight ?? []).concat(this.urgent, this.pending);
    this.undelivered = this.retaining ? combined : [];
    this.inFlight = undefined;
    this.urgent = [];
    this.pending = [];
    this.endBackoff();
    for (let backpressureResolver of this.backpressureResolvers) backpressureResolver();
    this.backpressureResolvers = [];
    for (let flushResolver of this.flushResolvers) flushResolver();
    this.flushResolvers = [];
    if (this.released) this.reportDrained(true);
    return combined.length;
  }
  async drain() {
    if (this.draining || this.closed) return;
    this.gathering = false;
    this.draining = true;
    let e = 0;
    let n;
    let r = 0;
    let s = false;
    let h = 0;
    try {
      while (!this.closed) {
        let y = this.urgent.length > 0;
        let S = this.backoffOwedUntil - Date.now();
        if (S <= 0 || !y) this.backoffOwedUntil = 0;
        if (S > 0 && !y) {
          await this.backOff(S, true);
          continue;
        }
        let passes = this.holdSpec?.passes;
        let R;
        let x = false;
        let P = y && h >= URGENT_RETRIES && S <= 0;
        let F = y && !P;
        if (F) {
          R = this.takeUrgent();
          if (R.items.length === 0) continue;
        } else if (passes && this.owed === 0 && !this.flushing) {
          R = this.takePassing(passes, n);
          if (R.items.length === 0) {
            if (P) {
              h = 0;
              continue;
            }
            break;
          }
        } else {
          let ae = this.sendableCount();
          if (ae === 0) {
            if (P) {
              h = 0;
              continue;
            }
            break;
          }
          x = this.resendSizes.length > 0;
          R = this.takeBatch(ae, n);
          if (R.items.length === 0) continue;
        }
        let { items, bytes } = R;
        this.inFlight = items;
        this.inFlightSince = Date.now();
        let released = F ? undefined : this.released;
        let ee = released !== undefined && released.unsent > 0;
        let q = items.length;
        let Q = items.findIndex((item, ie) => !this.sharesPostWithNext(ie, items)) + 1;
        let re = F || x || Q >= items.length ? 0 : Q;
        let { attempt, again } = this.takeAttemptOf(items);
        try {
          await this.config.send(items, {
            held: ee,
            reason: ee ? released.reason : "none",
            heldCount: ee ? released.count : 0,
            holdAgeMs: ee ? released.ageMs : 0,
            rule: ee ? released.rule : "none",
            postIndex: this.counts.posts,
            retryCount: F ? r : e,
            attempt,
            urgent: F,
            followsUrgent: !F && s,
            bytes,
            cuttable: re > 0,
            mayResendInTwo: () => re > 0 && !this.closed,
          });
          if (F) {
            r = 0;
            h++;
          } else {
            e = 0;
            h = 0;
          }
          s = F;
          this.counts.posts++;
          this.counts.rows += q;
          this.counts.maxRowsPost = Math.max(this.counts.maxRowsPost, q);
          if (released) released.unsent -= q;
        } catch (error) {
          if (error instanceof ClientEventResendSoonError && re > 0 && items.length === q && !this.closed) {
            e = 0;
            this.counts.failedPosts++;
            this.noteSentBefore(items);
            this.pending = items.concat(this.pending);
            this.owed += items.length;
            this.resendSizes = [re, items.length - re];
            continue;
          }
          let ie = F ? ++r : ++e;
          this.counts.failedPosts++;
          if (this.closed) break;
          if (
            error instanceof ClientEventResendSoonError ||
            (this.config.maxConsecutiveFailures !== undefined && ie >= this.config.maxConsecutiveFailures)
          ) {
            this.droppedBatches++;
            this.counts.droppedRows += q;
            if (released) released.unsent -= q;
            this.config.onBatchDropped?.(items.length, ie);
            if (F) r = 0;
            else {
              e = 0;
              n = undefined;
            }
            this.releaseBackpressure();
            continue;
          }
          this.inFlight = undefined;
          this.noteSentBefore(
            error instanceof ClientEventBatchRejectedError ? again.filter((Ae) => items.includes(Ae)) : items,
          );
          if (F) this.urgent = items.concat(this.urgent);
          else {
            this.pending = items.concat(this.pending);
            this.owed += items.length;
            if (x) this.resendSizes.unshift(items.length);
            else if (error instanceof ClientEventTooSmallError) {
              let Ae = items.length === q ? bytes : this.jsonBytesOf(items);
              if (Ae >= error.minBytes) {
                let max = Math.max(error.minBytes, Math.floor(Ae / 2));
                n = Math.min(max, n ?? max);
              }
            }
          }
          let retryAfterMs = error instanceof ClientEventUploadError ? error.retryAfterMs : undefined;
          let ce = this.retryDelay(ie, retryAfterMs);
          let fe = !F && retryAfterMs === undefined;
          if (!fe) this.cutsNextBackoff = false;
          if (fe && this.urgent.length > 0) {
            this.backoffOwedUntil = Date.now() + ce;
            continue;
          }
          await this.backOff(ce, fe);
          continue;
        } finally {
          this.inFlight = undefined;
        }
        this.releaseBackpressure();
      }
    } finally {
      this.draining = false;
      this.retryNowOwed = false;
      this.cutsNextBackoff = false;
      this.backoffOwedUntil = 0;
      if (this.pending.length === 0 && this.urgent.length === 0) {
        this.flushing = false;
        for (let flushResolver of this.flushResolvers) flushResolver();
        this.flushResolvers = [];
        if (!this.closed) this.reportDrained();
      }
      this.config.onIdle?.();
    }
  }
  reportDrained(e = false) {
    let { released, counts } = this;
    if (!released) {
      this.counts = {
        ...uploadStats,
        otherPosts: counts.otherPosts + counts.posts,
        otherRows: counts.otherRows + counts.rows,
      };
      return;
    }
    this.released = undefined;
    this.counts = {
      ...uploadStats,
    };
    this.config.onDrained?.({
      trigger: e ? "close" : released.reason,
      rule: released.rule,
      heldEvents: released.count,
      heldMs: released.ageMs,
      ...counts,
      drainMs: Date.now() - released.at,
    });
  }
  takeBatch(e, n) {
    let r = this.resendSizes.shift();
    if (r !== undefined) {
      this.owed = Math.max(0, this.owed - r);
      let P = this.pending.splice(0, r);
      return {
        items: P,
        bytes: this.jsonBytesOf(P),
      };
    }
    let { maxBatchSize } = this.config;
    let h = this.byteLimit(n);
    let y = 0;
    let S = 0;
    let w = [];
    while (S < e && S < maxBatchSize) {
      let P = 0;
      if (h !== undefined) {
        let F = jsonByteLength(this.pending[S]);
        if (F === undefined) {
          this.forget(this.pending.splice(S, 1));
          e--;
          if (S < this.owed) this.owed--;
          continue;
        }
        if (S > 0 && y + F > h) break;
        P = F;
      }
      y += P;
      w.push(P);
      S++;
    }
    let R = S;
    let x = y;
    while (S > 0 && this.sharesPostWithNext(S - 1)) {
      S--;
      y -= w[S] ?? 0;
    }
    if (S === 0) {
      S = R;
      y = x;
      while (S > 0 && this.sharesPostWithNext(S - 1)) {
        let P = h === undefined ? 0 : jsonByteLength(this.pending[S]);
        if (P === undefined) {
          this.forget(this.pending.splice(S, 1));
          if (S < this.owed) this.owed--;
        } else {
          y += P;
          S++;
        }
      }
    }
    this.owed = Math.max(0, this.owed - S);
    return {
      items: this.pending.splice(0, S),
      bytes: y,
    };
  }
  sharesPostWithNext(e, n = this.pending) {
    let r = n[e];
    return e + 1 < n.length && typeof r === "object" && r !== null && this.tiedToNext.has(r);
  }
  takeUrgent() {
    let { maxBatchSize } = this.config;
    let n = this.byteLimit(undefined);
    let r = 0;
    let s = 0;
    while (s < this.urgent.length && s < maxBatchSize) {
      if (n !== undefined) {
        let h = jsonByteLength(this.urgent[s]);
        if (h === undefined) {
          this.forget(this.urgent.splice(s, 1));
          continue;
        }
        if (s > 0 && r + h > n) break;
        r += h;
      }
      s++;
    }
    return {
      items: this.urgent.splice(0, s),
      bytes: r,
    };
  }
  noteSentBefore(e) {
    for (let n of e) this.sentBefore.add(n);
  }
  forget(e) {
    for (let n of e) this.sentBefore.delete(n);
  }
  takeAttemptOf(e) {
    if (this.sentBefore.size === 0)
      return {
        attempt: "first",
        again: [],
      };
    let filtered = e.filter((r) => this.sentBefore.delete(r));
    return {
      attempt: filtered.length === 0 ? "first" : filtered.length < e.length ? "resend_with_new" : "resend",
      again: filtered,
    };
  }
  retryDelay(e, n) {
    let r = Math.random() * this.config.jitterMs;
    if (n !== undefined && Number.isFinite(n))
      return Math.max(this.config.baseDelayMs, Math.min(n, this.config.maxDelayMs)) + r;
    return Math.min(this.config.baseDelayMs * 2 ** (e - 1), this.config.maxDelayMs) + r;
  }
  releaseBackpressure() {
    let backpressureResolvers = this.backpressureResolvers;
    this.backpressureResolvers = [];
    for (let backpressureResolver of backpressureResolvers) backpressureResolver();
  }
  inFlightBatch() {
    return this.inFlight;
  }
  busy() {
    return (this.draining || this.gathering) && !this.closed;
  }
  holdsOnArrival(e) {
    let n = this.holdOnArrivals();
    return !this.closed && n !== undefined && !n.passes?.(e);
  }
  held() {
    return {
      count: this.heldCount,
      ageMs: this.holdTimer ? Date.now() - this.heldSince : 0,
    };
  }
  backlog() {
    return {
      unsent: (this.inFlight?.length ?? 0) + this.urgent.length + this.pending.length,
      inFlightMs: this.inFlight ? Date.now() - this.inFlightSince : undefined,
      backingOff: this.backoff !== null,
    };
  }
  backOff(e, n = false) {
    this.config.onIdle?.();
    if (this.retryNowOwed || (n && this.cutsNextBackoff)) {
      this.retryNowOwed = false;
      this.cutsNextBackoff = false;
      return Promise.resolve();
    }
    return new Promise((resolve) => {
      let s = {
        end: resolve,
        until: n ? Date.now() + e : undefined,
      };
      this.backoff = s;
      s.timer = setTimeout((h) => h.endBackoff(), e, this);
    });
  }
  endBackoff() {
    let backoff = this.backoff;
    if (backoff) {
      this.backoff = null;
      clearTimeout(backoff.timer);
      backoff.end();
    }
  }
}
//@ chunk-aepeg2w5.js:777777-777841 placement
function jsonByteLength(e) {
  try {
    return Buffer.byteLength(jsonStringify(e));
  } catch {
    return;
  }
}
//@ chunk-aepeg2w5.js:778099-778111 placement
var consoleProfileBearerProvider = null;
//@ chunk-aepeg2w5.js:778111-778150 placement
/**
 * 设置 console profile bearer 提供者并返回旧值。
 */
function setConsoleProfileBearerProvider(e) {
  let n = consoleProfileBearerProvider;
  consoleProfileBearerProvider = e;
  return n;
}
//@ chunk-aepeg2w5.js:778150-778174 placement
function getConsoleProfileBearerProvider() {
  return consoleProfileBearerProvider;
}
//@ chunk-aepeg2w5.js:778174-778186 placement
var trustedDeviceProbe = null;
//@ chunk-aepeg2w5.js:778186-778224 placement
function setTrustedDeviceProbe(isConsoleProfileSessionsCredential) {
  let n = trustedDeviceProbe;
  trustedDeviceProbe = isConsoleProfileSessionsCredential;
  return n;
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
function safeEmit(e, n, r) {
  try {
    e(n);
    return true;
  } catch (error) {
    let h = typeof n.subtype === "string" ? `${n.type}:${n.subtype}` : n.type;
    logForDebugging(`[${r}] Dropping ${h} frame \u2014 handler threw: ${errorMessage(error)}`, {
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
function permissionModeOfSystemEvent(e) {
  if (e.type !== "system" || !("permissionMode" in e)) return;
  return parsePermissionMode(e.permissionMode);
}
//@ chunk-aepeg2w5.js:778772-778822 placement
var KNOWN_WORKER_STATES = ["bridge", "anthropic_cloud", "byoc", "snap"];
//@ chunk-aepeg2w5.js:778822-778865 placement
/**
 * 是否为已知工作者状态。
 */
function isKnownWorkerState(environmentKind) {
  return KNOWN_WORKER_STATES.some((n) => n === environmentKind);
}
//@ chunk-aepeg2w5.js:778865-778879 placement
var SESSION_INIT_ERROR_GRACE_MS = 120000;
//@ chunk-aepeg2w5.js:778879-779188 placement
/**
 * 描述会话初始化错误。
 */
function describeInitError(lastInitError) {
  let n = typeof lastInitError.message === "string" ? printableName(lastInitError.message, 500).trim() : "";
  if (n && n !== "<nil>") return n;
  let r = /^[A-Za-z][A-Za-z0-9_]{0,63}$/;
  let found = [lastInitError.error_type, lastInitError.error_kind].find(
    (h) => typeof h === "string" && r.test(h),
  );
  return found ? `the cloud environment failed to start (${found})` : "the cloud environment failed to start";
}
//@ chunk-aepeg2w5.js:779188-779645 placement
/**
 * 会话错误摘要。
 */
function sessionErrorSummary(e, n) {
  let lastInitError = e.environment_kind === "bridge" ? null : e.external_metadata?.last_init_error;
  if (lastInitError) {
    let s =
      e.worker_status === "running" || e.worker_status === "idle" || e.worker_status === "requires_action";
    let h = String(lastInitError.recoverable) === "true";
    let y = typeof lastInitError.at === "string" ? Date.parse(lastInitError.at) : NaN;
    let S = Number.isFinite(y) && n - y > SESSION_INIT_ERROR_GRACE_MS;
    if (lastInitError.error_kind === "environment_deleted" || (!s && (!h || S)))
      return describeInitError(lastInitError);
  }
  if (e.status === "failed") return "the cloud environment could not be provisioned";
  return;
}
//@ chunk-aepeg2w5.js:779645-781069 placement
/**
 * 描述云会话状态（归档、需要操作等）。
 */
function describeCloudSession(e, n = {}) {
  let r = e.status === "archived" ? "archived" : (e.worker_status ?? "idle");
  let pendingAction = r === "requires_action" ? e.external_metadata?.pending_action : undefined;
  return {
    type: "session",
    id: e.id,
    title: e.title || null,
    session_status: r,
    environment_id: e.environment_id,
    environment_kind: e.environment_kind,
    created_at: e.created_at,
    updated_at: ("updated_at" in e ? e.updated_at : e.last_event_at) ?? e.created_at,
    session_context: {
      sources: e.config?.sources ?? [],
      outcomes: e.config?.outcomes ?? null,
      model: e.config?.model ?? null,
      cwd: "",
      custom_system_prompt: null,
      append_system_prompt: null,
    },
    ...(e.config != null && {
      config_read: true,
    }),
    bound_device_uuid: normalizeUuidOrNull(e.bound_device_uuid)?.toLowerCase(),
    ...(e.tags !== undefined && {
      tags: e.tags,
    }),
    ...(e.external_metadata?.tool_host_status != null && {
      tool_host_status: e.external_metadata.tool_host_status,
    }),
    ...(e.external_metadata?.device_bind_posture != null && {
      device_bind_posture: e.external_metadata.device_bind_posture,
    }),
    ...(e.external_metadata?.artifacts != null && {
      artifacts: e.external_metadata.artifacts,
    }),
    ...(e.external_metadata?.autocompact_state != null && {
      autocompact_state: e.external_metadata.autocompact_state,
    }),
    ...(e.agent_id != null && {
      agent_id: e.agent_id,
    }),
    ...(e.self_hosted_runner_pool_id != null && {
      self_hosted_runner_pool_id: e.self_hosted_runner_pool_id,
    }),
    startup_failure: sessionErrorSummary(e, n.serverNow ?? Date.now()),
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
  signClientEvent,
  sessionHostKind,
  isTrustedDeviceAttested,
  KNOWN_WORKER_STATES,
  describeCloudSession,
  ClientEventUploader,
  ClientEventUploadError,
  setTrustedDeviceProbe,
  getConsoleProfileBearerProvider,
  UPLOAD_CHUNK_BYTES,
  reportSignerLoadFailure,
  permissionModeOfSystemEvent,
  registerChildMemory,
  registerMemoryAttributor,
  INTERRUPT_REMOTE_EVENT,
  sampleChildMemoryPeaks,
  installMemoryExitSummary,
  ClientEventBatchRejectedError,
  ClientEventResendSoonError,
  ClientEventTooSmallError,
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
  normalizeJsonRoundTrip,
  markChildProcessDead,
};
