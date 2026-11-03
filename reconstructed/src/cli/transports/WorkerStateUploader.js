/**
 * cli/transports/WorkerStateUploader.ts
 *
 * 把 worker 状态（元数据/外部状态）合并节流后上传到 CCR
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/cli/transports/WorkerStateUploader.ts
 * pieces: chunk-fp6aqx1j.js (3)
 * attribution: fingerprint 2, layout 1
 */
import { isPlainObject } from "../../utils/isPlainObject.js";
import { Uo } from "../../../vendor/@mermaid-js/parser/dist/chunks/mermaid-parser.esm.min/chunk-L2OVAXIS.mjs";
import { sleep } from "../../utils/sleep.js";
import { Do } from "../../utils/git/gitSafeEnv.js";

/**
 * WorkerStateUploader：合并 worker 状态补丁（external/internal_metadata 深合并）并节流上传。
 */
//@ chunk-fp6aqx1j.js:10761-15407 fingerprint = WorkerStateUploader (0.341)
class WorkerStateUploader {
  inflight = null;
  pending = null;
  pendingWaits = !1;
  pendingSince = 0;
  waitTimer = null;
  requeued = null;
  requeuedMetadata = null;
  remembered = {};
  sending = null;
  closingToNewPatches = new AbortController();
  hasDroppedSomething = !1;
  cutKeptMetadata = !1;
  closed = !1;
  config;
  constructor(e) {
    this.config = e;
  }
  enqueue(e) {
    if (this.closed || this.isClosedToNewPatches) {
      this.hasDroppedSomething = !0;
      return;
    }
    if (this.pending && "worker_status" in this.pending && "worker_status" in e) this.drain();
    let n = !("worker_status" in e) && (this.config.waitsForStatus?.(e) ?? !1);
    if (
      ((this.pendingWaits = (this.pending === null || this.pendingWaits) && n !== !1),
      this.pendingWaits && typeof n === "number")
    )
      this.waitTimer ??= setTimeout(() => this.sendWaiting(), n);
    if (this.pending === null) ((this.pendingSince = Date.now()), (this.pending = e));
    else this.pending = coalescePatches(this.pending, e);
    if ("worker_status" in e) this.requeued = null;
    if (
      ((this.requeuedMetadata &&= diffMetadataAgainst(this.requeuedMetadata, e)),
      this.remember(e),
      this.config.mergesSameRun?.())
    )
      queueMicrotask(() => void this.drain());
    else this.drain();
  }
  requeueStatus(e) {
    if (this.closed || this.isClosedToNewPatches) {
      this.hasDroppedSomething = !0;
      return;
    }
    if (this.pending && "worker_status" in this.pending) return;
    ((this.requeued = e), this.drain());
  }
  requeueMetadata(e) {
    if (this.closed || this.isClosedToNewPatches) {
      this.hasDroppedSomething = !0;
      return;
    }
    this.putBackMetadata(e);
  }
  putBackMetadata(e) {
    ((this.requeuedMetadata = diffMetadataAgainst(
      coalescePatches(this.requeuedMetadata ?? {}, e),
      this.pending ?? {},
    )),
      this.drain());
  }
  remember(e) {
    if (this.config.remembers) this.remembered = coalescePatches(this.remembered, e);
  }
  sendWaiting(e = 0) {
    if (this.pendingWaits && (e <= 0 || Date.now() - this.pendingSince >= e))
      ((this.pendingWaits = !1), this.drain());
  }
  closeToNewPatches() {
    if (this.closed) return;
    if (
      ((this.pendingWaits = !1),
      this.disarmWaitTimer(),
      this.drain(),
      this.closingToNewPatches.abort(),
      (this.hasDroppedSomething ||= this.requeued !== null),
      (this.requeued = null),
      this.pending)
    )
      ((this.hasDroppedSomething ||= "worker_status" in this.pending),
        (this.pending = this.withoutStatus(this.pending)));
  }
  get isClosedToNewPatches() {
    return this.closingToNewPatches.signal.aborted;
  }
  get hasCutKeptMetadata() {
    return this.cutKeptMetadata;
  }
  get owesMetadata() {
    return (
      this.isClosedToNewPatches &&
      !this.closed &&
      (this.pending !== null ||
        this.requeuedMetadata !== null ||
        (this.sending !== null && this.withoutStatus(this.sending) !== null))
    );
  }
  keepsWithoutStatus(e) {
    return this.withoutStatus(e) !== null;
  }
  withoutStatus(e) {
    if (!("worker_status" in e)) return e;
    let n = isPlainObject(e.internal_metadata) ? Uo(e.internal_metadata, this.config.ridesAStatus ?? []) : {};
    return Object.keys(n).length > 0 ? { internal_metadata: n } : null;
  }
  close() {
    ((this.pendingWaits = !1),
      this.drain(),
      (this.closed = !0),
      this.clearPending(),
      (this.requeued = null),
      (this.requeuedMetadata = null));
  }
  get unsent() {
    return this.inflight !== null || this.pending !== null;
  }
  async flush() {
    while (!this.closed)
      if (this.inflight) await this.inflight;
      else if (this.pending || this.requeued || this.requeuedMetadata)
        ((this.pendingWaits = !1), await this.drain());
      else return !this.hasDroppedSomething;
    return !1;
  }
  async drain() {
    if (this.inflight || this.closed) return;
    let e = this.pendingWaits ? null : this.pending,
      n = e ?? this.requeued,
      s = !e;
    if (e) this.clearPending();
    else if (this.requeued) this.requeued = null;
    else if (this.requeuedMetadata) {
      let [[r, h] = [], ...w] = Object.entries(this.requeuedMetadata);
      ((n = r === void 0 ? null : { [r]: h }),
        (this.requeuedMetadata = w.length > 0 ? Object.fromEntries(w) : null));
    }
    if (!n) return;
    this.inflight = this.sendWithRetry(n, s).then(() => {
      if (
        ((this.inflight = null),
        (this.sending = null),
        (this.pending || this.requeued || this.requeuedMetadata) && !this.closed)
      )
        this.drain();
    });
  }
  async sendWithRetry(e, n) {
    let s = e,
      r = 0,
      h = !1;
    while (!this.closed) {
      if (((this.sending = s), await this.config.send(s))) return;
      if (this.handsBackWithoutStatus(s)) return;
      if (this.isClosedToNewPatches && n && !("worker_status" in s) && this.pending && !this.closed) {
        this.putBackMetadata(s);
        return;
      }
      if (this.isClosedToNewPatches && !h) ((h = !0), (r = 0));
      if (
        (r++,
        await sleep(this.retryDelay(r), this.isClosedToNewPatches ? void 0 : this.closingToNewPatches.signal),
        this.handsBackWithoutStatus(s))
      )
        return;
      if (this.pending && !this.closed) {
        if (n) {
          if (!("worker_status" in s) && !this.pendingWaits) {
            this.putBackMetadata(s);
            return;
          }
          if ("worker_status" in s && "worker_status" in this.pending) return;
          continue;
        }
        ((s = coalescePatches(s, this.pending)), this.clearPending());
      }
    }
  }
  handsBackWithoutStatus(e) {
    if (!this.isClosedToNewPatches || !("worker_status" in e)) return !1;
    if (this.closed) return !0;
    return (
      (this.hasDroppedSomething = !0),
      (this.cutKeptMetadata ||= this.pending !== null && "external_metadata" in this.pending),
      (this.pending = this.withoutStatus(this.pending ? coalescePatches(e, this.pending) : e)),
      !0
    );
  }
  clearPending() {
    ((this.pending = null), this.disarmWaitTimer());
  }
  disarmWaitTimer() {
    if (this.waitTimer) (clearTimeout(this.waitTimer), (this.waitTimer = null));
  }
  retryDelay(e) {
    let min = Math.min(this.config.baseDelayMs * 2 ** (e - 1), this.config.maxDelayMs),
      s = Math.random() * this.config.jitterMs;
    return min + s;
  }
}
//@ chunk-fp6aqx1j.js:15407-15576 layout
function diffMetadataAgainst(e, n) {
  let s = {};
  for (let [r, h] of Object.entries(e)) {
    let w = Do(h, (v, y) => !(y in (n[r] ?? {})));
    if (Object.keys(w).length > 0) s[r] = w;
  }
  return Object.keys(s).length > 0 ? s : null;
}
//@ chunk-fp6aqx1j.js:15576-15795 fingerprint = coalescePatches (1)
function coalescePatches(base, overlay) {
  let merged = { ...base };
  for (let [r, h] of Object.entries(overlay))
    if (
      (r === "external_metadata" || r === "internal_metadata") &&
      merged[r] &&
      typeof merged[r] === "object" &&
      typeof h === "object" &&
      h !== null
    )
      merged[r] = { ...merged[r], ...h };
    else merged[r] = h;
  return merged;
}

export { WorkerStateUploader };
