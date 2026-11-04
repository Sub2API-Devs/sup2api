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
import { omitAlias } from "../../../vendor/@mermaid-js/parser/dist/chunks/mermaid-parser.esm.min/chunk-L2OVAXIS.mjs";
import { sleep } from "../../utils/sleep.js";
import { pickByHelper } from "../../utils/git/gitSafeEnv.js";

//@ chunk-fp6aqx1j.js:10761-15407 fingerprint (2.1.88 match: WorkerStateUploader, 0.341)
/**
 * WorkerStateUploader：合并 worker 状态补丁（external/internal_metadata 深合并）并节流上传。
 */
class WorkerStateUploader {
  inflight = null;
  pending = null;
  pendingWaits = false;
  pendingSince = 0;
  waitTimer = null;
  requeued = null;
  requeuedMetadata = null;
  remembered = {};
  sending = null;
  closingToNewPatches = new AbortController();
  hasDroppedSomething = false;
  cutKeptMetadata = false;
  closed = false;
  config;
  constructor(config) {
    this.config = config;
  }
  enqueue(patch) {
    if (this.closed || this.isClosedToNewPatches) {
      this.hasDroppedSomething = true;
      return;
    }
    if (this.pending && "worker_status" in this.pending && "worker_status" in patch) this.drain();
    let waits = !("worker_status" in patch) && (this.config.waitsForStatus?.(patch) ?? false);
    this.pendingWaits = (this.pending === null || this.pendingWaits) && waits !== false;
    if (this.pendingWaits && typeof waits === "number")
      this.waitTimer ??= setTimeout(() => this.sendWaiting(), waits);
    if (this.pending === null) {
      this.pendingSince = Date.now();
      this.pending = patch;
    } else this.pending = coalescePatches(this.pending, patch);
    if ("worker_status" in patch) this.requeued = null;
    this.requeuedMetadata &&= diffMetadataAgainst(this.requeuedMetadata, patch);
    this.remember(patch);
    if (this.config.mergesSameRun?.()) queueMicrotask(() => void this.drain());
    else this.drain();
  }
  requeueStatus(patch) {
    if (this.closed || this.isClosedToNewPatches) {
      this.hasDroppedSomething = true;
      return;
    }
    if (this.pending && "worker_status" in this.pending) return;
    this.requeued = patch;
    this.drain();
  }
  requeueMetadata(metadata) {
    if (this.closed || this.isClosedToNewPatches) {
      this.hasDroppedSomething = true;
      return;
    }
    this.putBackMetadata(metadata);
  }
  putBackMetadata(metadata) {
    this.requeuedMetadata = diffMetadataAgainst(
      coalescePatches(this.requeuedMetadata ?? {}, metadata),
      this.pending ?? {},
    );
    this.drain();
  }
  remember(patch) {
    if (this.config.remembers) this.remembered = coalescePatches(this.remembered, patch);
  }
  sendWaiting(minAgeMs = 0) {
    if (this.pendingWaits && (minAgeMs <= 0 || Date.now() - this.pendingSince >= minAgeMs)) {
      this.pendingWaits = false;
      this.drain();
    }
  }
  closeToNewPatches() {
    if (this.closed) return;
    this.pendingWaits = false;
    this.disarmWaitTimer();
    this.drain();
    this.closingToNewPatches.abort();
    this.hasDroppedSomething ||= this.requeued !== null;
    this.requeued = null;
    if (this.pending) {
      this.hasDroppedSomething ||= "worker_status" in this.pending;
      this.pending = this.withoutStatus(this.pending);
    }
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
  keepsWithoutStatus(patch) {
    return this.withoutStatus(patch) !== null;
  }
  withoutStatus(patch) {
    if (!("worker_status" in patch)) return patch;
    let kept = isPlainObject(patch.internal_metadata)
      ? omitAlias(patch.internal_metadata, this.config.ridesAStatus ?? [])
      : {};
    return Object.keys(kept).length > 0
      ? {
          internal_metadata: kept,
        }
      : null;
  }
  close() {
    this.pendingWaits = false;
    this.drain();
    this.closed = true;
    this.clearPending();
    this.requeued = null;
    this.requeuedMetadata = null;
  }
  get unsent() {
    return this.inflight !== null || this.pending !== null;
  }
  async flush() {
    while (!this.closed)
      if (this.inflight) await this.inflight;
      else if (this.pending || this.requeued || this.requeuedMetadata) {
        this.pendingWaits = false;
        await this.drain();
      } else return !this.hasDroppedSomething;
    return false;
  }
  async drain() {
    if (this.inflight || this.closed) return;
    let pending = this.pendingWaits ? null : this.pending;
    let next = pending ?? this.requeued;
    let statusOnly = !pending;
    if (pending) this.clearPending();
    else if (this.requeued) this.requeued = null;
    else if (this.requeuedMetadata) {
      let [[key, value] = [], ...rest] = Object.entries(this.requeuedMetadata);
      next =
        key === undefined
          ? null
          : {
              [key]: value,
            };
      this.requeuedMetadata = rest.length > 0 ? Object.fromEntries(rest) : null;
    }
    if (!next) return;
    this.inflight = this.sendWithRetry(next, statusOnly).then(() => {
      this.inflight = null;
      this.sending = null;
      if ((this.pending || this.requeued || this.requeuedMetadata) && !this.closed) this.drain();
    });
  }
  async sendWithRetry(patch, statusOnly) {
    let current = patch;
    let attempts = 0;
    let cutKept = false;
    while (!this.closed) {
      this.sending = current;
      if (await this.config.send(current)) return;
      if (this.handsBackWithoutStatus(current)) return;
      if (
        this.isClosedToNewPatches &&
        statusOnly &&
        !("worker_status" in current) &&
        this.pending &&
        !this.closed
      ) {
        this.putBackMetadata(current);
        return;
      }
      if (this.isClosedToNewPatches && !cutKept) {
        cutKept = true;
        attempts = 0;
      }
      attempts++;
      await sleep(
        this.retryDelay(attempts),
        this.isClosedToNewPatches ? undefined : this.closingToNewPatches.signal,
      );
      if (this.handsBackWithoutStatus(current)) return;
      if (this.pending && !this.closed) {
        if (statusOnly) {
          if (!("worker_status" in current) && !this.pendingWaits) {
            this.putBackMetadata(current);
            return;
          }
          if ("worker_status" in current && "worker_status" in this.pending) return;
          continue;
        }
        current = coalescePatches(current, this.pending);
        this.clearPending();
      }
    }
  }
  handsBackWithoutStatus(patch) {
    if (!this.isClosedToNewPatches || !("worker_status" in patch)) return false;
    if (this.closed) return true;
    this.hasDroppedSomething = true;
    this.cutKeptMetadata ||= this.pending !== null && "external_metadata" in this.pending;
    this.pending = this.withoutStatus(this.pending ? coalescePatches(patch, this.pending) : patch);
    return true;
  }
  clearPending() {
    this.pending = null;
    this.disarmWaitTimer();
  }
  disarmWaitTimer() {
    if (this.waitTimer) {
      clearTimeout(this.waitTimer);
      this.waitTimer = null;
    }
  }
  retryDelay(failures) {
    let exponential = Math.min(this.config.baseDelayMs * 2 ** (failures - 1), this.config.maxDelayMs);
    let jitter = Math.random() * this.config.jitterMs;
    return exponential + jitter;
  }
}
//@ chunk-fp6aqx1j.js:15407-15576 layout
function diffMetadataAgainst(metadata, against) {
  let out = {};
  for (let [key, value] of Object.entries(metadata)) {
    let kept = pickByHelper(value, (value, fieldName) => !(fieldName in (against[key] ?? {})));
    if (Object.keys(kept).length > 0) out[key] = kept;
  }
  return Object.keys(out).length > 0 ? out : null;
}
//@ chunk-fp6aqx1j.js:15576-15795 fingerprint (2.1.88 match: coalescePatches, 1)
function coalescePatches(base, overlay) {
  let merged = {
    ...base,
  };
  for (let [key, value] of Object.entries(overlay))
    if (
      (key === "external_metadata" || key === "internal_metadata") &&
      merged[key] &&
      typeof merged[key] === "object" &&
      typeof value === "object" &&
      value !== null
    )
      merged[key] = {
        ...merged[key],
        ...value,
      };
    else merged[key] = value;
  return merged;
}
export { WorkerStateUploader };
