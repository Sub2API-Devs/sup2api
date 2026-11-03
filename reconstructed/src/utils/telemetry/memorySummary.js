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
import {
  readFile,
  readFile as readFile_2,
  readFile as readFile_3,
  readFile as readFile_4,
} from "fs/promises";
import { Readable, Readable as Readable_2 } from "stream";
import {
  randomUUID,
  randomUUID as randomUUID_2,
  randomUUID as randomUUID_3,
  randomUUID as randomUUID_4,
  randomUUID as randomUUID_5,
  randomUUID as randomUUID_6,
  randomUUID as randomUUID_7,
  randomUUID as randomUUID_8,
  randomUUID as randomUUID_9,
  randomUUID as randomUUID_10,
} from "crypto";
import { logEvent } from "../../services/analytics/index.js";
import { registerCleanup } from "../cleanupRegistry.js";
import { HostScoped } from "../hostScoped.js";
import { getRootSession, isCcsTenant, isDisklessProcess } from "../../bootstrap/state.js";
import { hasEmbeddedSearchTools_2 } from "../embeddedTools.js";
import { isBareMode } from "../envUtils.js";
import { isHttpMcpServeInvocation } from "../../entrypoints/mcpServeArgs.js";
import { mn } from "../remoteEnvironment.js";
import { env } from "../env.js";
import { gte } from "../semver.js";
import { jsonStringify, jsonParse } from "../slowOperations.js";
import { repairMalformedStringsDeep, normalizeFullWidthSpace } from "../stringUtils.js";
import { logForDebugging } from "../debug.js";
import { errorMessage } from "../errors.js";
import { logFeatureBad } from "../../services/analytics/featureTelemetry.js";
import { lit } from "../../services/analytics/safeMetadata.js";
import { parsePermissionMode } from "../../types/permissions.js";
import { printableName } from "../printableName.js";
import { Vt } from "../agentId.js";

//@ chunk-aepeg2w5.js:759038-759085 placement
function Bis(e, n) {
  _s().registerAttributor(e, n);
}
//@ chunk-aepeg2w5.js:759085-759133 placement
var Cj = ["bash_shell", "mcp_stdio", "lsp", "other"];
/**
 * 内存归因统计（子进程、页面大小、上报）。
 */
//@ chunk-aepeg2w5.js:759133-761627 placement
class MemoryAttribution {
  attributors = new Map();
  childProcesses = new Map();
  childRegisteredCount = 0;
  pageSizeBytes = void 0;
  installed = !1;
  emitted = !1;
  unregisterCleanup = void 0;
  registerAttributor(e, n) {
    this.attributors.set(e, n);
  }
  registerChild(e, n) {
    let r = this.childProcesses.get(n);
    if (r && !r.dead) return;
    this.childRegisteredCount++;
    let s = { kind: e, peakRssBytes: 0, dead: !1 };
    (this.childProcesses.set(n, s),
      this.readChildRssBytes(n).then((h) => {
        if (h !== void 0 && h > s.peakRssBytes) s.peakRssBytes = h;
      }));
  }
  async sampleChildPeaks() {
    if (this.childProcesses.size === 0) return;
    let filtered = [...this.childProcesses.entries()].filter(([, n]) => !n.dead);
    await Promise.all(
      filtered.map(async ([n, r]) => {
        let childRssBytes = await this.readChildRssBytes(n);
        if (childRssBytes === void 0) r.dead = !0;
        else if (childRssBytes > r.peakRssBytes) r.peakRssBytes = childRssBytes;
      }),
    );
  }
  async readChildRssBytes(e) {
    try {
      let n = await readFile_3(`/proc/${e}/statm`, "utf8"),
        r = Number(n.split(" ")[1]);
      return Number.isFinite(r) ? r * (await this.getPageSizeBytes()) : void 0;
    } catch {
      return;
    }
  }
  async getPageSizeBytes() {
    if (this.pageSizeBytes !== void 0) return this.pageSizeBytes;
    let e = 4096;
    try {
      let rss = process.memoryUsage().rss,
        r = await readFile_3("/proc/self/statm", "utf8"),
        s = Number(r.split(" ")[1]),
        h = 2 ** Math.round(Math.log2(rss / s));
      if (Number.isFinite(h) && h > 0) e = h;
    } catch {}
    return ((this.pageSizeBytes ??= e), this.pageSizeBytes);
  }
  async buildSummary(e) {
    let memoryUsage = process.memoryUsage(),
      r = {
        uptime_s: Math.round(process.uptime()),
        final_rss_bytes: memoryUsage.rss,
        final_heap_used_bytes: memoryUsage.heapUsed,
        final_external_bytes: memoryUsage.external,
        final_array_buffers_bytes: memoryUsage.arrayBuffers,
        peak_rss_bytes: Math.max(e.rss, memoryUsage.rss),
        peak_heap_used_bytes: Math.max(e.heapUsed, memoryUsage.heapUsed),
        peak_external_bytes: Math.max(e.external, memoryUsage.external),
        constrained_memory_bytes: process.constrainedMemory?.() || void 0,
      };
    for (let [y, S] of this.attributors)
      try {
        let w = S();
        if (((r[`attr_${y}_entries`] = w.entries), w.bytes !== void 0)) r[`attr_${y}_bytes`] = w.bytes;
      } catch {}
    await this.sampleChildPeaks();
    let s = 0,
      h = {};
    for (let y of this.childProcesses.values())
      ((s += y.peakRssBytes), (h[y.kind] = (h[y.kind] ?? 0) + y.peakRssBytes));
    ((r.child_count = this.childRegisteredCount), (r.child_rss_bytes_total = s));
    for (let y of Cj) if (h[y] !== void 0) r[`child_${y}_rss_bytes`] = h[y];
    return r;
  }
  async emitSummaryOnce(e) {
    if (this.emitted) return;
    this.emitted = !0;
    try {
      logEvent("tengu_sdk_memory_summary", await this.buildSummary(e()));
    } catch {}
  }
  installExitSummary(e) {
    if (this.installed) return;
    ((this.installed = !0), (this.unregisterCleanup = registerCleanup(() => this.emitSummaryOnce(e))));
  }
  reset() {
    ((this.installed = !1),
      (this.emitted = !1),
      this.unregisterCleanup?.(),
      (this.unregisterCleanup = void 0),
      this.attributors.clear(),
      this.childProcesses.clear(),
      (this.childRegisteredCount = 0));
  }
}
//@ chunk-aepeg2w5.js:761627-761652 placement
var Rj = new HostScoped(() => new MemoryAttribution());
//@ chunk-aepeg2w5.js:761652-761689 placement
function _s() {
  return Rj.of(getRootSession().host);
}
/**
 * 登记子进程内存。
 */
//@ chunk-aepeg2w5.js:761689-761789 placement
function registerChildMemory(e, n) {
  if (!hasEmbeddedSearchTools_2() || isBareMode()) return;
  if (!Number.isFinite(n) || n <= 0) return;
  _s().registerChild(e, n);
}
//@ chunk-aepeg2w5.js:761789-761853 placement
function Lki(e) {
  let n = _s().childProcesses.get(e);
  if (n) n.dead = !0;
}
//@ chunk-aepeg2w5.js:761853-761898 placement
function Rx() {
  return _s().sampleChildPeaks();
}
//@ chunk-aepeg2w5.js:761898-761941 placement
function Hki(e) {
  _s().installExitSummary(e);
}
/**
 * 会话宿主类型（工具容器、租户、远程）。
 */
//@ chunk-aepeg2w5.js:761941-762097 placement
function sessionHostKind() {
  if (isHttpMcpServeInvocation()) return "tool_container_daemon";
  if (isCcsTenant()) return "ccs_tenant";
  return mn() && Boolean(env.CLAUDE_CODE_REMOTE_SESSION_ID) ? "hosted_worker" : "none";
}
//@ chunk-aepeg2w5.js:762162-762206 placement
var Sg = 60000,
  Oj = 8388608,
  xx = 32768,
  dBe = 262144;
//@ chunk-aepeg2w5.js:762206-762284 placement
function Pj(e, n) {
  let min = Math.min(e, Oj);
  return Math.max(n, Math.ceil((min / xx) * 1000));
}
//@ chunk-aepeg2w5.js:762284-762341 placement
function Mx(e, n) {
  return Math.max(n, Math.ceil((e / xx) * 1000));
}
//@ chunk-aepeg2w5.js:762341-762383 placement
function dgr() {
  return gte("1.4.4", "1.4.0");
}
//@ chunk-aepeg2w5.js:762383-762505 placement
class UploadStalledError extends Error {
  waitedMs;
  constructor(e) {
    super("transfer stalled");
    this.waitedMs = e;
    this.name = "UploadStalledError";
  }
}
/**
 * 上传停滞计时器（touch/relax/clear）。
 */
//@ chunk-aepeg2w5.js:762505-762741 placement
function createStallTimer(e, n) {
  let r = !1,
    s = !1,
    h = (S, w) => {
      ((r = !0), S.abort(new UploadStalledError(w)));
    },
    y = setTimeout(h, n, e, n);
  return {
    touch: () => {
      if (!s) y.refresh();
    },
    relax: (S) => {
      if (s) return;
      (clearTimeout(y), (y = setTimeout(h, S, e, S)));
    },
    clear: () => {
      ((s = !0), clearTimeout(y));
    },
    fired: () => r,
  };
}
//@ chunk-aepeg2w5.js:762741-762850 placement
function* chunkWithProgress(e, n) {
  for (let r = 0; r < e.length; r += dBe) (n(r), yield e.subarray(r, Math.min(r + dBe, e.length)));
  n(e.length);
}
//@ chunk-aepeg2w5.js:762850-762905 placement
function Dx(e, n = {}) {
  return withStallTimeout(e.length, (r) => chunkWithProgress(e, r), n);
}
//@ chunk-aepeg2w5.js:762905-762956 placement
function Nki(e, n, r = {}) {
  return withStallTimeout(n, (s) => Dj(e, s), r);
}
//@ chunk-aepeg2w5.js:762956-763038 placement
async function* Dj(e, n) {
  let r = 0;
  n(r);
  for await (let s of e) ((r += s.length), yield s, n(r));
}
/**
 * 带停滞超时的请求。
 */
//@ chunk-aepeg2w5.js:763038-763516 placement
function withStallTimeout(e, n, r) {
  let s = r.stallMs ?? Sg,
    max = Math.max(Pj(e, s), r.tailFloorMs ?? 0),
    abortController = new AbortController(),
    S = () => abortController.abort(r.signal?.reason);
  if (r.signal?.aborted) S();
  else r.signal?.addEventListener("abort", S, { once: !0 });
  let w = createStallTimer(abortController, s),
    R = 0;
  return {
    body: Readable.from(
      n((x) => {
        if (((R = x), x === e)) w.relax(max);
        else w.touch();
      }),
      { objectMode: !1 },
    ),
    signal: abortController.signal,
    dispose: () => {
      (w.clear(), r.signal?.removeEventListener("abort", S));
    },
    seen: () => ({ body_bytes: e, bytes_handed: R, stalled: w.fired() && r.signal?.aborted !== !0 }),
  };
}
//@ chunk-aepeg2w5.js:763551-763584 placement
var cgr = "/api/directory/plugins";
/**
 * 对客户端事件签名。
 */
//@ chunk-aepeg2w5.js:763621-763947 placement
async function signClientEvent(e, n, r) {
  let s = await e?.catch(() => {
    return;
  });
  if (s === void 0) return { payload: r };
  try {
    let h = Wis({ ...r, uuid: r.uuid || randomUUID_9() });
    if ([n, h.uuid, h.type].some((S) => S.includes("\x00"))) return { payload: r };
    let sign = await s.sign(n, h);
    return sign === void 0 ? { payload: r } : { payload: h, device_attestation: sign };
  } catch (error) {
    return (noteSignFailure(s, error), { payload: r });
  }
}
//@ chunk-aepeg2w5.js:763947-764018 placement
function Wis(e) {
  let n = jsonStringify(e),
    r = jsonParse(n);
  if (Fj.test(n)) (repairMalformedStringsDeep(r), normalizeObjectKeys(r));
  return r;
}
//@ chunk-aepeg2w5.js:764018-764050 placement
var Fj = /\\ud[89a-f][0-9a-f]{2}/;
//@ chunk-aepeg2w5.js:764050-764302 placement
function normalizeObjectKeys(e) {
  let n = [e];
  while (n.length > 0) {
    let r = n.pop();
    if (r === null || typeof r !== "object") continue;
    let s = r;
    Object.keys(s).forEach((h) => {
      let y = s[h];
      if (y !== null && typeof y === "object") n.push(y);
      let S = Array.isArray(r) ? h : normalizeFullWidthSpace(h);
      if (S !== h) (delete s[h], (s[S] = y));
    });
  }
}
/**
 * 签名模块加载失败时记录。
 */
//@ chunk-aepeg2w5.js:764302-764451 placement
function reportSignerLoadFailure(e) {
  (logForDebugging(`[clientEventSigner] the signer module did not load: ${errorMessage(e)}`, {
    level: "warn",
  }),
    logFeatureBad("client_event_signer", "module_load_failed"));
  return;
}
//@ chunk-aepeg2w5.js:764451-764700 placement
function noteSignFailure(e, n) {
  if (
    (logEvent("tengu_client_event_signed", {
      ok: !1,
      error: n instanceof RangeError ? lit("RangeError") : lit("other"),
    }),
    !e.noteSignFailure())
  )
    return;
  (logForDebugging(`[clientEventSigner] event not signed: ${errorMessage(n)}`, { level: "warn" }),
    logFeatureBad("client_event_signer", "sign_failed"));
}
//@ chunk-aepeg2w5.js:764700-764784 placement
class q6e extends Error {
  retryAfterMs;
  constructor(e, n) {
    super(e);
    this.retryAfterMs = n;
  }
}
//@ chunk-aepeg2w5.js:764784-764807 placement
class ugr extends q6e {}
//@ chunk-aepeg2w5.js:764807-764887 placement
class fgr extends Error {
  constructor() {
    super("batch refused: resend it in two");
  }
}
//@ chunk-aepeg2w5.js:764887-764963 placement
class cro extends Error {
  minBytes;
  constructor(e, n) {
    super(e);
    this.minBytes = n;
  }
}
//@ chunk-aepeg2w5.js:764963-765073 placement
var MAX_INT32 = 2147483647,
  URGENT_RETRIES = 4,
  uploadStats = {
    posts: 0,
    rows: 0,
    maxRowsPost: 0,
    failedPosts: 0,
    droppedRows: 0,
    otherPosts: 0,
    otherRows: 0,
  };
/**
 * 客户端事件上传队列（紧急、重试、关闭交接）。
 */
//@ chunk-aepeg2w5.js:765073-777777 placement
class ClientEventUploader {
  pending = [];
  urgent = [];
  pendingAtClose = 0;
  handedOverAfterClose = 0;
  inFlight;
  inFlightSince = 0;
  undelivered = [];
  retaining = !1;
  draining = !1;
  gathering = !1;
  closed = !1;
  backpressureResolvers = [];
  backoff = null;
  retryNowOwed = !1;
  cutsNextBackoff = !1;
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
  flushing = !1;
  released;
  counts = { ...uploadStats };
  tiedToNext = new WeakSet();
  config;
  constructor(e) {
    this.config = e;
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
    if (((this.holdSpec = e), !e)) {
      this.release(n);
      return;
    }
    if (this.closed || this.flushing) return;
    if (!holdSpec) this.owed = this.pending.length;
    this.rejudgeHeld();
  }
  rejudgeHeld() {
    let e = this.holdTimer ? this.heldSince : Date.now();
    (this.cancelHold(), this.countHeld(), this.applyHoldLimits(e), this.drain());
  }
  cutBackoff() {
    if (this.backoff?.until !== void 0) this.endBackoff();
    else if (this.inFlight) this.cutsNextBackoff = !0;
  }
  release(e, n) {
    (this.endHold(e, n), (this.owed = this.pending.length), this.drain());
  }
  takeUndelivered() {
    let undelivered = this.undelivered;
    return ((this.undelivered = []), undelivered);
  }
  peekUndelivered() {
    return this.undelivered;
  }
  discardUndelivered() {
    let e = this.undelivered.length;
    return ((this.undelivered = []), (this.retaining = !1), e);
  }
  async enqueue(e, n) {
    let r = Array.isArray(e) ? e : [e];
    if (r.length === 0) return;
    if (this.closed) {
      this.retainUndelivered(r);
      return;
    }
    if (n?.urgent) {
      if ((this.urgent.push(...r), this.backoff?.until !== void 0))
        ((this.backoffOwedUntil = this.backoff.until), this.endBackoff());
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
      await new Promise((y) => {
        this.backpressureResolvers.push(y);
      });
    }
    if (this.closed) {
      this.retainUndelivered(r);
      return;
    }
    if (n?.together) {
      for (let y of r.slice(0, -1)) if (typeof y === "object" && y !== null) this.tiedToNext.add(y);
    }
    if ((this.pending.push(...r), n?.release)) {
      this.release(n.release, n.releasedBy);
      return;
    }
    let holdOnArrivals = this.holdOnArrivals();
    if (holdOnArrivals && this.countInto(holdOnArrivals, r) > 0) this.applyHoldLimits(n?.since ?? Date.now());
    if (!this.config.gatherTick) this.drain();
    else if (!this.draining && !this.gathering)
      ((this.gathering = !0),
        setImmediate((y) => {
          if (y.gathering) y.drain();
        }, this));
  }
  countInto(e, n) {
    let r = 0;
    for (let s of n)
      if (!e.passes?.(s)) {
        if ((r++, e.maxBytes !== void 0)) this.heldBytes += Ko(s) ?? 0;
      }
    return ((this.heldCount += r), r);
  }
  holdOnArrivals() {
    let holdSpec = this.holdSpec;
    return holdSpec && !this.flushing && (holdSpec.passes || !this.draining) ? holdSpec : void 0;
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
    let { maxBatchSize: maxBatchSize } = this.config,
      byteLimit = this.byteLimit(n),
      h = [],
      y = [],
      S = 0,
      w = !1;
    for (let R of this.pending) {
      if (w || !e(R)) {
        y.push(R);
        continue;
      }
      let x = byteLimit === void 0 ? 0 : Ko(R);
      if (x === void 0) {
        this.sentBefore.delete(R);
        continue;
      }
      if (h.length > 0 && S + x > (byteLimit ?? 0)) {
        ((w = !0), y.push(R));
        continue;
      }
      ((S += x), h.push(R), (w = h.length >= maxBatchSize));
    }
    return ((this.pending = y), { items: h, bytes: S });
  }
  jsonBytesOf(e) {
    if (this.config.maxBatchBytes === void 0) return 0;
    let n = 0;
    for (let r of e) n += Ko(r) ?? 0;
    return n;
  }
  byteLimit(e) {
    let n =
      typeof this.config.maxBatchBytes === "function"
        ? this.config.maxBatchBytes()
        : this.config.maxBatchBytes;
    return n === void 0 || e === void 0 ? n : Math.min(n, e);
  }
  countHeld() {
    ((this.heldCount = 0), (this.heldBytes = 0));
    let holdOnArrivals = this.holdOnArrivals();
    if (holdOnArrivals) this.countInto(holdOnArrivals, this.pending.slice(this.owed));
  }
  applyHoldLimits(e) {
    let holdSpec = this.holdSpec;
    if (!holdSpec || this.heldCount === 0) {
      this.cancelHold();
      return;
    }
    let r =
      holdSpec.maxItems !== void 0 && this.heldCount >= holdSpec.maxItems
        ? "max_events"
        : holdSpec.maxBytes !== void 0 && this.heldBytes >= holdSpec.maxBytes
          ? "max_bytes"
          : this.pending.length - this.owed >=
              (this.config.holdMaxItems === void 0
                ? this.config.maxBatchSize
                : Math.max(
                    this.config.holdMaxItems,
                    Math.min(holdSpec.maxItems ?? 0, this.config.maxBatchSize),
                  ))
            ? "cap"
            : void 0;
    if ((this.hold(e), r)) this.release(r);
  }
  hold(e) {
    let holdSpec = this.holdSpec;
    if (!holdSpec) return;
    if (this.holdTimer) {
      if (e >= this.heldSince) return;
      clearTimeout(this.holdTimer);
    }
    ((this.heldSince = e), (this.heldRule = holdSpec.rule));
    let now = Date.now(),
      min = Math.min(holdSpec.maxAgeMs, Math.max(0, e + holdSpec.maxAgeMs - now));
    ((this.holdDeadline = now + min), (this.holdTimer = setTimeout(() => this.release("max_age"), min)));
  }
  cancelHold() {
    if (this.holdTimer) (clearTimeout(this.holdTimer), (this.holdTimer = null));
    ((this.heldCount = 0), (this.heldBytes = 0));
  }
  endHold(e, n) {
    let r = this.holdTimer !== null;
    if ((this.cancelHold(), !r)) return;
    let now = Date.now(),
      h = e === "max_age" && isDisklessProcess() ? this.holdDeadline : now,
      min = Math.min(Math.max(0, Math.round(h - this.heldSince)), MAX_INT32),
      S = this.pending.length,
      heldRule = this.heldRule;
    if (this.released) this.reportDrained();
    ((this.released = { reason: e, rule: heldRule, count: S, ageMs: min, at: now, unsent: S }),
      this.config.onHoldRelease?.(e, S, min, heldRule, n));
  }
  retainUndelivered(e) {
    if (((this.handedOverAfterClose += e.length), !this.retaining)) return;
    let n = this.config.maxQueueSize - this.undelivered.length;
    if (n <= 0) return;
    this.undelivered.push(...(e.length > n ? e.slice(0, n) : e));
  }
  flush(e) {
    if (this.pending.length === 0 && this.urgent.length === 0 && !this.draining) return Promise.resolve();
    if ((this.endHold("flush"), (this.flushing = !0), e?.retryNow))
      ((this.retryNowOwed = this.backoff === null), this.endBackoff());
    return (
      this.drain(),
      new Promise((n) => {
        this.flushResolvers.push(n);
      })
    );
  }
  withdraw(e) {
    if (this.closed) return 0;
    let filtered = this.urgent.filter((S) => {
        let w = !e(S);
        if (!w) this.sentBefore.delete(S);
        return w;
      }),
      r = this.urgent.length - filtered.length;
    this.urgent = filtered;
    let owed = this.owed,
      filtered_2 = this.pending.filter((S, w) => {
        if (!e(S)) return !0;
        if (w < this.owed) owed--;
        return (this.sentBefore.delete(S), !1);
      }),
      y = this.pending.length - filtered_2.length;
    if (y === 0) return r;
    return (
      (this.pending = filtered_2),
      (this.owed = owed),
      (this.resendSizes = []),
      this.rejudgeHeld(),
      this.releaseBackpressure(),
      y + r
    );
  }
  close(e) {
    if (this.closed) return 0;
    if (this.gathering) this.drain();
    ((this.closed = !0),
      (this.pendingAtClose = this.urgent.length + this.pending.length),
      (this.retaining = e?.retainUndelivered === !0),
      this.cancelHold(),
      (this.owed = 0),
      this.sentBefore.clear(),
      (this.flushing = !1));
    let combined = (this.inFlight ?? []).concat(this.urgent, this.pending);
    ((this.undelivered = this.retaining ? combined : []),
      (this.inFlight = void 0),
      (this.urgent = []),
      (this.pending = []),
      this.endBackoff());
    for (let backpressureResolver of this.backpressureResolvers) backpressureResolver();
    this.backpressureResolvers = [];
    for (let flushResolver of this.flushResolvers) flushResolver();
    if (((this.flushResolvers = []), this.released)) this.reportDrained(!0);
    return combined.length;
  }
  async drain() {
    if (this.draining || this.closed) return;
    ((this.gathering = !1), (this.draining = !0));
    let e = 0,
      n,
      r = 0,
      s = !1,
      h = 0;
    try {
      while (!this.closed) {
        let y = this.urgent.length > 0,
          S = this.backoffOwedUntil - Date.now();
        if (S <= 0 || !y) this.backoffOwedUntil = 0;
        if (S > 0 && !y) {
          await this.backOff(S, !0);
          continue;
        }
        let w = this.holdSpec?.passes,
          R,
          x = !1,
          P = y && h >= URGENT_RETRIES && S <= 0,
          F = y && !P;
        if (F) {
          if (((R = this.takeUrgent()), R.items.length === 0)) continue;
        } else if (w && this.owed === 0 && !this.flushing) {
          if (((R = this.takePassing(w, n)), R.items.length === 0)) {
            if (P) {
              h = 0;
              continue;
            }
            break;
          }
        } else {
          let sendableCount = this.sendableCount();
          if (sendableCount === 0) {
            if (P) {
              h = 0;
              continue;
            }
            break;
          }
          if (
            ((x = this.resendSizes.length > 0), (R = this.takeBatch(sendableCount, n)), R.items.length === 0)
          )
            continue;
        }
        let { items: items, bytes: bytes } = R;
        ((this.inFlight = items), (this.inFlightSince = Date.now()));
        let j = F ? void 0 : this.released,
          ee = j !== void 0 && j.unsent > 0,
          q = items.length,
          Q = items.findIndex((ae, ie) => !this.sharesPostWithNext(ie, items)) + 1,
          re = F || x || Q >= items.length ? 0 : Q,
          { attempt: attempt, again: again } = this.takeAttemptOf(items);
        try {
          if (
            (await this.config.send(items, {
              held: ee,
              reason: ee ? j.reason : "none",
              heldCount: ee ? j.count : 0,
              holdAgeMs: ee ? j.ageMs : 0,
              rule: ee ? j.rule : "none",
              postIndex: this.counts.posts,
              retryCount: F ? r : e,
              attempt: attempt,
              urgent: F,
              followsUrgent: !F && s,
              bytes: bytes,
              cuttable: re > 0,
              mayResendInTwo: () => re > 0 && !this.closed,
            }),
            F)
          )
            ((r = 0), h++);
          else ((e = 0), (h = 0));
          if (
            ((s = F),
            this.counts.posts++,
            (this.counts.rows += q),
            (this.counts.maxRowsPost = Math.max(this.counts.maxRowsPost, q)),
            j)
          )
            j.unsent -= q;
        } catch (error) {
          if (error instanceof fgr && re > 0 && items.length === q && !this.closed) {
            ((e = 0),
              this.counts.failedPosts++,
              this.noteSentBefore(items),
              (this.pending = items.concat(this.pending)),
              (this.owed += items.length),
              (this.resendSizes = [re, items.length - re]));
            continue;
          }
          let ie = F ? ++r : ++e;
          if ((this.counts.failedPosts++, this.closed)) break;
          if (
            error instanceof fgr ||
            (this.config.maxConsecutiveFailures !== void 0 && ie >= this.config.maxConsecutiveFailures)
          ) {
            if ((this.droppedBatches++, (this.counts.droppedRows += q), j)) j.unsent -= q;
            if ((this.config.onBatchDropped?.(items.length, ie), F)) r = 0;
            else ((e = 0), (n = void 0));
            this.releaseBackpressure();
            continue;
          }
          if (
            ((this.inFlight = void 0),
            this.noteSentBefore(error instanceof ugr ? again.filter((Ae) => items.includes(Ae)) : items),
            F)
          )
            this.urgent = items.concat(this.urgent);
          else if (((this.pending = items.concat(this.pending)), (this.owed += items.length), x))
            this.resendSizes.unshift(items.length);
          else if (error instanceof cro) {
            let Ae = items.length === q ? bytes : this.jsonBytesOf(items);
            if (Ae >= error.minBytes) {
              let max = Math.max(error.minBytes, Math.floor(Ae / 2));
              n = Math.min(max, n ?? max);
            }
          }
          let Z = error instanceof q6e ? error.retryAfterMs : void 0,
            retryDelay = this.retryDelay(ie, Z),
            fe = !F && Z === void 0;
          if (!fe) this.cutsNextBackoff = !1;
          if (fe && this.urgent.length > 0) {
            this.backoffOwedUntil = Date.now() + retryDelay;
            continue;
          }
          await this.backOff(retryDelay, fe);
          continue;
        } finally {
          this.inFlight = void 0;
        }
        this.releaseBackpressure();
      }
    } finally {
      if (
        ((this.draining = !1),
        (this.retryNowOwed = !1),
        (this.cutsNextBackoff = !1),
        (this.backoffOwedUntil = 0),
        this.pending.length === 0 && this.urgent.length === 0)
      ) {
        this.flushing = !1;
        for (let flushResolver of this.flushResolvers) flushResolver();
        if (((this.flushResolvers = []), !this.closed)) this.reportDrained();
      }
      this.config.onIdle?.();
    }
  }
  reportDrained(e = !1) {
    let { released: released, counts: counts } = this;
    if (!released) {
      this.counts = {
        ...uploadStats,
        otherPosts: counts.otherPosts + counts.posts,
        otherRows: counts.otherRows + counts.rows,
      };
      return;
    }
    ((this.released = void 0),
      (this.counts = { ...uploadStats }),
      this.config.onDrained?.({
        trigger: e ? "close" : released.reason,
        rule: released.rule,
        heldEvents: released.count,
        heldMs: released.ageMs,
        ...counts,
        drainMs: Date.now() - released.at,
      }));
  }
  takeBatch(e, n) {
    let r = this.resendSizes.shift();
    if (r !== void 0) {
      this.owed = Math.max(0, this.owed - r);
      let splice = this.pending.splice(0, r);
      return { items: splice, bytes: this.jsonBytesOf(splice) };
    }
    let { maxBatchSize: maxBatchSize } = this.config,
      byteLimit = this.byteLimit(n),
      y = 0,
      S = 0,
      w = [];
    while (S < e && S < maxBatchSize) {
      let P = 0;
      if (byteLimit !== void 0) {
        let F = Ko(this.pending[S]);
        if (F === void 0) {
          if ((this.forget(this.pending.splice(S, 1)), e--, S < this.owed)) this.owed--;
          continue;
        }
        if (S > 0 && y + F > byteLimit) break;
        P = F;
      }
      ((y += P), w.push(P), S++);
    }
    let R = S,
      x = y;
    while (S > 0 && this.sharesPostWithNext(S - 1)) (S--, (y -= w[S] ?? 0));
    if (S === 0) {
      ((S = R), (y = x));
      while (S > 0 && this.sharesPostWithNext(S - 1)) {
        let P = byteLimit === void 0 ? 0 : Ko(this.pending[S]);
        if (P === void 0) {
          if ((this.forget(this.pending.splice(S, 1)), S < this.owed)) this.owed--;
        } else ((y += P), S++);
      }
    }
    return ((this.owed = Math.max(0, this.owed - S)), { items: this.pending.splice(0, S), bytes: y });
  }
  sharesPostWithNext(e, n = this.pending) {
    let r = n[e];
    return e + 1 < n.length && typeof r === "object" && r !== null && this.tiedToNext.has(r);
  }
  takeUrgent() {
    let { maxBatchSize: maxBatchSize } = this.config,
      byteLimit = this.byteLimit(void 0),
      r = 0,
      s = 0;
    while (s < this.urgent.length && s < maxBatchSize) {
      if (byteLimit !== void 0) {
        let h = Ko(this.urgent[s]);
        if (h === void 0) {
          this.forget(this.urgent.splice(s, 1));
          continue;
        }
        if (s > 0 && r + h > byteLimit) break;
        r += h;
      }
      s++;
    }
    return { items: this.urgent.splice(0, s), bytes: r };
  }
  noteSentBefore(e) {
    for (let n of e) this.sentBefore.add(n);
  }
  forget(e) {
    for (let n of e) this.sentBefore.delete(n);
  }
  takeAttemptOf(e) {
    if (this.sentBefore.size === 0) return { attempt: "first", again: [] };
    let filtered = e.filter((r) => this.sentBefore.delete(r));
    return {
      attempt: filtered.length === 0 ? "first" : filtered.length < e.length ? "resend_with_new" : "resend",
      again: filtered,
    };
  }
  retryDelay(e, n) {
    let r = Math.random() * this.config.jitterMs;
    if (n !== void 0 && Number.isFinite(n))
      return Math.max(this.config.baseDelayMs, Math.min(n, this.config.maxDelayMs)) + r;
    return Math.min(this.config.baseDelayMs * 2 ** (e - 1), this.config.maxDelayMs) + r;
  }
  releaseBackpressure() {
    let backpressureResolvers = this.backpressureResolvers;
    this.backpressureResolvers = [];
    for (let n of backpressureResolvers) n();
  }
  inFlightBatch() {
    return this.inFlight;
  }
  busy() {
    return (this.draining || this.gathering) && !this.closed;
  }
  holdsOnArrival(e) {
    let holdOnArrivals = this.holdOnArrivals();
    return !this.closed && holdOnArrivals !== void 0 && !holdOnArrivals.passes?.(e);
  }
  held() {
    return { count: this.heldCount, ageMs: this.holdTimer ? Date.now() - this.heldSince : 0 };
  }
  backlog() {
    return {
      unsent: (this.inFlight?.length ?? 0) + this.urgent.length + this.pending.length,
      inFlightMs: this.inFlight ? Date.now() - this.inFlightSince : void 0,
      backingOff: this.backoff !== null,
    };
  }
  backOff(e, n = !1) {
    if ((this.config.onIdle?.(), this.retryNowOwed || (n && this.cutsNextBackoff)))
      return ((this.retryNowOwed = !1), (this.cutsNextBackoff = !1), Promise.resolve());
    return new Promise((r) => {
      let s = { end: r, until: n ? Date.now() + e : void 0 };
      ((this.backoff = s), (s.timer = setTimeout((h) => h.endBackoff(), e, this)));
    });
  }
  endBackoff() {
    let backoff = this.backoff;
    if (backoff) ((this.backoff = null), clearTimeout(backoff.timer), backoff.end());
  }
}
//@ chunk-aepeg2w5.js:777777-777841 placement
function Ko(e) {
  try {
    return Buffer.byteLength(jsonStringify(e));
  } catch {
    return;
  }
}
//@ chunk-aepeg2w5.js:778099-778111 placement
var Eg = null;
//@ chunk-aepeg2w5.js:778111-778150 placement
function $ki(e) {
  let n = Eg;
  return ((Eg = e), n);
}
//@ chunk-aepeg2w5.js:778150-778174 placement
function $o() {
  return Eg;
}
//@ chunk-aepeg2w5.js:778174-778186 placement
var kg = null;
//@ chunk-aepeg2w5.js:778186-778224 placement
function Fx(e) {
  let n = kg;
  return ((kg = e), n);
}
//@ chunk-aepeg2w5.js:778224-778258 placement
function Fki() {
  return kg?.() === !0;
}
/**
 * 安全调用事件回调。
 */
//@ chunk-aepeg2w5.js:778258-778461 placement
function safeEmit(e, n, r) {
  try {
    return (e(n), !0);
  } catch (error) {
    let h = typeof n.subtype === "string" ? `${n.type}:${n.subtype}` : n.type;
    return (
      logForDebugging(`[${r}] Dropping ${h} frame \u2014 handler threw: ${errorMessage(error)}`, {
        level: "error",
      }),
      !1
    );
  }
}
//@ chunk-aepeg2w5.js:778628-778675 placement
var Uki = { subtype: "interrupt", cancel_queued: !0 };
//@ chunk-aepeg2w5.js:778675-778772 placement
function pgr(e) {
  if (e.type !== "system" || !("permissionMode" in e)) return;
  return parsePermissionMode(e.permissionMode);
}
//@ chunk-aepeg2w5.js:778772-778822 placement
var wg = ["bridge", "anthropic_cloud", "byoc", "snap"];
/**
 * 是否为已知工作者状态。
 */
//@ chunk-aepeg2w5.js:778822-778865 placement
function isKnownWorkerState(e) {
  return wg.some((n) => n === e);
}
//@ chunk-aepeg2w5.js:778865-778879 placement
var Kj = 120000;
/**
 * 描述会话初始化错误。
 */
//@ chunk-aepeg2w5.js:778879-779188 placement
function describeInitError(e) {
  let n = typeof e.message === "string" ? printableName(e.message, 500).trim() : "";
  if (n && n !== "<nil>") return n;
  let r = /^[A-Za-z][A-Za-z0-9_]{0,63}$/,
    found = [e.error_type, e.error_kind].find((h) => typeof h === "string" && r.test(h));
  return found ? `the cloud environment failed to start (${found})` : "the cloud environment failed to start";
}
/**
 * 会话错误摘要。
 */
//@ chunk-aepeg2w5.js:779188-779645 placement
function sessionErrorSummary(e, n) {
  let r = e.environment_kind === "bridge" ? null : e.external_metadata?.last_init_error;
  if (r) {
    let s =
        e.worker_status === "running" || e.worker_status === "idle" || e.worker_status === "requires_action",
      h = String(r.recoverable) === "true",
      y = typeof r.at === "string" ? Date.parse(r.at) : NaN,
      S = Number.isFinite(y) && n - y > Kj;
    if (r.error_kind === "environment_deleted" || (!s && (!h || S))) return describeInitError(r);
  }
  if (e.status === "failed") return "the cloud environment could not be provisioned";
  return;
}
/**
 * 描述云会话状态（归档、需要操作等）。
 */
//@ chunk-aepeg2w5.js:779645-781069 placement
function describeCloudSession(e, n = {}) {
  let r = e.status === "archived" ? "archived" : (e.worker_status ?? "idle"),
    s = r === "requires_action" ? e.external_metadata?.pending_action : void 0;
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
    ...(e.config != null && { config_read: !0 }),
    bound_device_uuid: Vt(e.bound_device_uuid)?.toLowerCase(),
    ...(e.tags !== void 0 && { tags: e.tags }),
    ...(e.external_metadata?.tool_host_status != null && {
      tool_host_status: e.external_metadata.tool_host_status,
    }),
    ...(e.external_metadata?.device_bind_posture != null && {
      device_bind_posture: e.external_metadata.device_bind_posture,
    }),
    ...(e.external_metadata?.artifacts != null && { artifacts: e.external_metadata.artifacts }),
    ...(e.external_metadata?.autocompact_state != null && {
      autocompact_state: e.external_metadata.autocompact_state,
    }),
    ...(e.agent_id != null && { agent_id: e.agent_id }),
    ...(e.self_hosted_runner_pool_id != null && { self_hosted_runner_pool_id: e.self_hosted_runner_pool_id }),
    startup_failure: sessionErrorSummary(e, n.serverNow ?? Date.now()),
    ...(typeof s?.tool_name === "string" && {
      pending_action: {
        name: s.tool_name,
        ...(typeof s.request_id === "string" && s.request_id !== "" && { request_id: s.request_id }),
      },
    }),
  };
}

export {
  safeEmit,
  signClientEvent,
  sessionHostKind,
  Fki,
  wg,
  describeCloudSession,
  ClientEventUploader,
  q6e,
  Fx,
  $o,
  dBe,
  reportSignerLoadFailure,
  pgr,
  registerChildMemory,
  Bis,
  Uki,
  Rx,
  Hki,
  ugr,
  fgr,
  cro,
  $ki,
  isKnownWorkerState,
  dgr,
  Nki,
  UploadStalledError,
  createStallTimer,
  cgr,
  Sg,
  Dx,
  Mx,
  Wis,
  Lki,
};
