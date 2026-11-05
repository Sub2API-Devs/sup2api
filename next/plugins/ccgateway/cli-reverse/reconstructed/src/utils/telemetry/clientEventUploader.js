/**
 * utils/telemetry/clientEventUploader.ts
 *
 * 2.1.316 新增：CCR 客户端事件上传队列（批量、重试、关闭前交接、签名与载荷归一化）。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-exfmq47h.js (13)
 * attribution: placement 13
 */
import { randomUUID } from "crypto";
import { jsonStringify, jsonParse } from "../slowOperations.js";
import { repairMalformedStringsDeep, normalizeFullWidthSpace } from "../stringUtils.js";
import { logForDebugging } from "../debug.js";
import { errorMessage } from "../errors.js";
import { logFeatureBad } from "../../services/analytics/featureTelemetry.js";
import { logEvent } from "../../services/analytics/index.js";
import { lit } from "../../services/analytics/safeMetadata.js";
import { isDisklessProcess } from "../../bootstrap/state.js";
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-exfmq47h.js:784309-784635 placement
/**
 * 对客户端事件签名。
 */
async function signClientEvent(eventSigner, eventId, payload) {
  let signerPromise = await eventSigner?.catch(() => {
    return;
  });
  if (signerPromise === undefined)
    return {
      payload,
    };
  try {
    let payload_2 = normalizeJsonRoundTrip({
      ...payload,
      uuid: payload.uuid || randomUUID(),
    });
    if ([eventId, payload_2.uuid, payload_2.type].some((field) => field.includes("\x00")))
      return {
        payload,
      };
    let signature = await signerPromise.sign(eventId, payload_2);
    return signature === undefined
      ? {
          payload,
        }
      : {
          payload: payload_2,
          device_attestation: signature,
        };
  } catch (error) {
    noteSignFailure(signerPromise, error);
    return {
      payload,
    };
  }
}
//@ chunk-exfmq47h.js:784635-784706 placement
/**
 * JSON 往返并修复孤立代理项、规范化对象键。
 */
function normalizeJsonRoundTrip(value) {
  let json = jsonStringify(value);
  let parsed = jsonParse(json);
  if (LONE_SURROGATE_ESCAPE_RE.test(json)) {
    repairMalformedStringsDeep(parsed);
    normalizeObjectKeys(parsed);
  }
  return parsed;
}
//@ chunk-exfmq47h.js:784706-784738 placement
var LONE_SURROGATE_ESCAPE_RE = /\\ud[89a-f][0-9a-f]{2}/;
//@ chunk-exfmq47h.js:784738-784990 placement
function normalizeObjectKeys(root) {
  let stack = [root];
  while (stack.length > 0) {
    let current = stack.pop();
    if (current === null || typeof current !== "object") continue;
    let obj = current;
    Object.keys(obj).forEach((key) => {
      let value = obj[key];
      if (value !== null && typeof value === "object") stack.push(value);
      let normalizedKey = Array.isArray(current) ? key : normalizeFullWidthSpace(key);
      if (normalizedKey !== key) {
        delete obj[key];
        obj[normalizedKey] = value;
      }
    });
  }
}
//@ chunk-exfmq47h.js:784990-785139 placement
/**
 * 签名模块加载失败时记录。
 */
function reportSignerLoadFailure(error) {
  logForDebugging(`[clientEventSigner] the signer module did not load: ${errorMessage(error)}`, {
    level: "warn",
  });
  logFeatureBad("client_event_signer", "module_load_failed");
  return;
}
//@ chunk-exfmq47h.js:785139-785388 placement
function noteSignFailure(signer, error) {
  logEvent("tengu_client_event_signed", {
    ok: false,
    error: error instanceof RangeError ? lit("RangeError") : lit("other"),
  });
  if (!signer.noteSignFailure()) return;
  logForDebugging(`[clientEventSigner] event not signed: ${errorMessage(error)}`, {
    level: "warn",
  });
  logFeatureBad("client_event_signer", "sign_failed");
}
//@ chunk-exfmq47h.js:785388-785472 placement
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
//@ chunk-exfmq47h.js:785472-785495 placement
/**
 * 批次被拒、需重发的事件上传错误。
 */
let ClientEventBatchRejectedError; // deferred: uses ClientEventUploadError of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-exfmq47h.js:785472", () => {
  ClientEventBatchRejectedError = class ClientEventBatchRejectedError extends ClientEventUploadError {};
});
//@ chunk-exfmq47h.js:785495-785575 placement
/**
 * 「批次被拒，请稍后重发」错误。
 */
class ClientEventResendSoonError extends Error {
  constructor() {
    super("batch refused: resend it in two");
  }
}
//@ chunk-exfmq47h.js:785575-785651 placement
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
//@ chunk-exfmq47h.js:785651-785761 placement
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
//@ chunk-exfmq47h.js:785761-798537 placement
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
  hasRoomFor(entryCount) {
    return !this.closed && this.pending.length + entryCount <= this.config.maxQueueSize;
  }
  setHold(spec, releasedBy) {
    let holdSpec = this.holdSpec;
    if (
      spec?.rule === holdSpec?.rule &&
      spec?.maxAgeMs === holdSpec?.maxAgeMs &&
      spec?.maxItems === holdSpec?.maxItems &&
      spec?.maxBytes === holdSpec?.maxBytes &&
      spec?.passes === holdSpec?.passes
    )
      return;
    if (this.gathering) this.drain();
    this.holdSpec = spec;
    if (!spec) {
      this.release(releasedBy);
      return;
    }
    if (this.closed || this.flushing) return;
    if (!holdSpec) this.owed = this.pending.length;
    this.rejudgeHeld();
  }
  rejudgeHeld() {
    let since = this.holdTimer ? this.heldSince : Date.now();
    this.cancelHold();
    this.countHeld();
    this.applyHoldLimits(since);
    this.drain();
  }
  cutBackoff() {
    if (this.backoff?.until !== undefined) this.endBackoff();
    else if (this.inFlight) this.cutsNextBackoff = true;
  }
  release(reason, releasedBy_2) {
    this.endHold(reason, releasedBy_2);
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
    let count = this.undelivered.length;
    this.undelivered = [];
    this.retaining = false;
    return count;
  }
  async enqueue(items, options) {
    let batch = Array.isArray(items) ? items : [items];
    if (batch.length === 0) return;
    if (this.closed) {
      this.retainUndelivered(batch);
      return;
    }
    if (options?.urgent) {
      this.urgent.push(...batch);
      if (this.backoff?.until !== undefined) {
        this.backoffOwedUntil = this.backoff.until;
        this.endBackoff();
      }
      this.drain();
      return;
    }
    if (batch.length > this.config.maxQueueSize && !options?.together) {
      for (let offset = 0; offset < batch.length; offset += this.config.maxQueueSize)
        await this.enqueue(batch.slice(offset, offset + this.config.maxQueueSize), options);
      return;
    }
    let batchSize = options?.together ? 1 : batch.length;
    if (this.holdTimer && this.pending.length + batchSize > this.config.maxQueueSize) this.release("cap");
    while (this.pending.length + batchSize > this.config.maxQueueSize && !this.closed) {
      if (this.gathering) {
        this.drain();
        continue;
      }
      await new Promise((resolve) => {
        this.backpressureResolvers.push(resolve);
      });
    }
    if (this.closed) {
      this.retainUndelivered(batch);
      return;
    }
    if (options?.together) {
      for (let item of batch.slice(0, -1))
        if (typeof item === "object" && item !== null) this.tiedToNext.add(item);
    }
    this.pending.push(...batch);
    if (options?.release) {
      this.release(options.release, options.releasedBy);
      return;
    }
    let hold = this.holdOnArrivals();
    if (hold && this.countInto(hold, batch) > 0) this.applyHoldLimits(options?.since ?? Date.now());
    if (!this.config.gatherTick) this.drain();
    else if (!this.draining && !this.gathering) {
      this.gathering = true;
      setImmediate((summary) => {
        if (summary.gathering) summary.drain();
      }, this);
    }
  }
  countInto(spec_2, items_2) {
    let held = 0;
    for (let item_2 of items_2)
      if (!spec_2.passes?.(item_2)) {
        held++;
        if (spec_2.maxBytes !== undefined) this.heldBytes += jsonByteLength(item_2) ?? 0;
      }
    this.heldCount += held;
    return held;
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
  takePassing(predicate, hint) {
    let { maxBatchSize } = this.config;
    let byteLimit = this.byteLimit(hint);
    let itemsOut = [];
    let rest = [];
    let bytes = 0;
    let batchFull = false;
    for (let item_3 of this.pending) {
      if (batchFull || !predicate(item_3)) {
        rest.push(item_3);
        continue;
      }
      let itemBytes = byteLimit === undefined ? 0 : jsonByteLength(item_3);
      if (itemBytes === undefined) {
        this.sentBefore.delete(item_3);
        continue;
      }
      if (itemsOut.length > 0 && bytes + itemBytes > (byteLimit ?? 0)) {
        batchFull = true;
        rest.push(item_3);
        continue;
      }
      bytes += itemBytes;
      itemsOut.push(item_3);
      batchFull = itemsOut.length >= maxBatchSize;
    }
    this.pending = rest;
    return {
      items: itemsOut,
      bytes,
    };
  }
  jsonBytesOf(items_3) {
    if (this.config.maxBatchBytes === undefined) return 0;
    let total = 0;
    for (let item_4 of items_3) total += jsonByteLength(item_4) ?? 0;
    return total;
  }
  byteLimit(hint_2) {
    let limit =
      typeof this.config.maxBatchBytes === "function"
        ? this.config.maxBatchBytes()
        : this.config.maxBatchBytes;
    return limit === undefined || hint_2 === undefined ? limit : Math.min(limit, hint_2);
  }
  countHeld() {
    this.heldCount = 0;
    this.heldBytes = 0;
    let spec_3 = this.holdOnArrivals();
    if (spec_3) this.countInto(spec_3, this.pending.slice(this.owed));
  }
  applyHoldLimits(since_2) {
    let holdSpec = this.holdSpec;
    if (!holdSpec || this.heldCount === 0) {
      this.cancelHold();
      return;
    }
    let limitReason =
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
    this.hold(since_2);
    if (limitReason) this.release(limitReason);
  }
  hold(since_3) {
    let holdSpec = this.holdSpec;
    if (!holdSpec) return;
    if (this.holdTimer) {
      if (since_3 >= this.heldSince) return;
      clearTimeout(this.holdTimer);
    }
    this.heldSince = since_3;
    this.heldRule = holdSpec.rule;
    let now = Date.now();
    let min = Math.min(holdSpec.maxAgeMs, Math.max(0, since_3 + holdSpec.maxAgeMs - now));
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
  endHold(now, releasedBy_3) {
    let hadHold = this.holdTimer !== null;
    this.cancelHold();
    if (!hadHold) return;
    let now_2 = Date.now();
    let deadline = now === "max_age" && isDisklessProcess() ? this.holdDeadline : now_2;
    let min = Math.min(Math.max(0, Math.round(deadline - this.heldSince)), MAX_INT32);
    let countAtRelease = this.pending.length;
    let heldRule = this.heldRule;
    if (this.released) this.reportDrained();
    this.released = {
      reason: now,
      rule: heldRule,
      count: countAtRelease,
      ageMs: min,
      at: now_2,
      unsent: countAtRelease,
    };
    this.config.onHoldRelease?.(now, countAtRelease, min, heldRule, releasedBy_3);
  }
  retainUndelivered(items_4) {
    this.handedOverAfterClose += items_4.length;
    if (!this.retaining) return;
    let room = this.config.maxQueueSize - this.undelivered.length;
    if (room <= 0) return;
    this.undelivered.push(...(items_4.length > room ? items_4.slice(0, room) : items_4));
  }
  flush(options_2) {
    if (this.pending.length === 0 && this.urgent.length === 0 && !this.draining) return Promise.resolve();
    this.endHold("flush");
    this.flushing = true;
    if (options_2?.retryNow) {
      this.retryNowOwed = this.backoff === null;
      this.endBackoff();
    }
    this.drain();
    return new Promise((resolve) => {
      this.flushResolvers.push(resolve);
    });
  }
  withdraw(predicate_2) {
    if (this.closed) return 0;
    let filtered = this.urgent.filter((kept) => {
      let keep = !predicate_2(kept);
      if (!keep) this.sentBefore.delete(kept);
      return keep;
    });
    let droppedFromUrgent = this.urgent.length - filtered.length;
    this.urgent = filtered;
    let owed = this.owed;
    let filtered_2 = this.pending.filter((keptPending, index) => {
      if (!predicate_2(keptPending)) return true;
      if (index < this.owed) owed--;
      this.sentBefore.delete(keptPending);
      return false;
    });
    let droppedPending = this.pending.length - filtered_2.length;
    if (droppedPending === 0) return droppedFromUrgent;
    this.pending = filtered_2;
    this.owed = owed;
    this.resendSizes = [];
    this.rejudgeHeld();
    this.releaseBackpressure();
    return droppedPending + droppedFromUrgent;
  }
  close(options_3) {
    if (this.closed) return 0;
    if (this.gathering) this.drain();
    this.closed = true;
    this.pendingAtClose = this.urgent.length + this.pending.length;
    this.retaining = options_3?.retainUndelivered === true;
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
    let postsSent = 0;
    let heldMore;
    let urgentFailures = 0;
    let followedUrgent = false;
    let urgentRetries = 0;
    try {
      while (!this.closed) {
        let hasUrgent = this.urgent.length > 0;
        let backoffRemaining = this.backoffOwedUntil - Date.now();
        if (backoffRemaining <= 0 || !hasUrgent) this.backoffOwedUntil = 0;
        if (backoffRemaining > 0 && !hasUrgent) {
          await this.backOff(backoffRemaining, true);
          continue;
        }
        let passes = this.holdSpec?.passes;
        let selection;
        let isResend = false;
        let urgentExpired = hasUrgent && urgentRetries >= URGENT_RETRIES && backoffRemaining <= 0;
        let takeUrgentOnly = hasUrgent && !urgentExpired;
        if (takeUrgentOnly) {
          selection = this.takeUrgent();
          if (selection.items.length === 0) continue;
        } else if (passes && this.owed === 0 && !this.flushing) {
          selection = this.takePassing(passes, heldMore);
          if (selection.items.length === 0) {
            if (urgentExpired) {
              urgentRetries = 0;
              continue;
            }
            break;
          }
        } else {
          let sendable = this.sendableCount();
          if (sendable === 0) {
            if (urgentExpired) {
              urgentRetries = 0;
              continue;
            }
            break;
          }
          isResend = this.resendSizes.length > 0;
          selection = this.takeBatch(sendable, heldMore);
          if (selection.items.length === 0) continue;
        }
        let { items, bytes } = selection;
        this.inFlight = items;
        this.inFlightSince = Date.now();
        let released = takeUrgentOnly ? undefined : this.released;
        let isHeldBatch = released !== undefined && released.unsent > 0;
        let batchCount = items.length;
        let cutIndex = items.findIndex((item, itemIndex) => !this.sharesPostWithNext(itemIndex, items)) + 1;
        let cuttable = takeUrgentOnly || isResend || cutIndex >= items.length ? 0 : cutIndex;
        let { attempt, again } = this.takeAttemptOf(items);
        try {
          await this.config.send(items, {
            held: isHeldBatch,
            reason: isHeldBatch ? released.reason : "none",
            heldCount: isHeldBatch ? released.count : 0,
            holdAgeMs: isHeldBatch ? released.ageMs : 0,
            rule: isHeldBatch ? released.rule : "none",
            postIndex: this.counts.posts,
            retryCount: takeUrgentOnly ? urgentFailures : postsSent,
            attempt,
            urgent: takeUrgentOnly,
            followsUrgent: !takeUrgentOnly && followedUrgent,
            bytes,
            cuttable: cuttable > 0,
            mayResendInTwo: () => cuttable > 0 && !this.closed,
          });
          if (takeUrgentOnly) {
            urgentFailures = 0;
            urgentRetries++;
          } else {
            postsSent = 0;
            urgentRetries = 0;
          }
          followedUrgent = takeUrgentOnly;
          this.counts.posts++;
          this.counts.rows += batchCount;
          this.counts.maxRowsPost = Math.max(this.counts.maxRowsPost, batchCount);
          if (released) released.unsent -= batchCount;
        } catch (error) {
          if (
            error instanceof ClientEventResendSoonError &&
            cuttable > 0 &&
            items.length === batchCount &&
            !this.closed
          ) {
            postsSent = 0;
            this.counts.failedPosts++;
            this.noteSentBefore(items);
            this.pending = items.concat(this.pending);
            this.owed += items.length;
            this.resendSizes = [cuttable, items.length - cuttable];
            continue;
          }
          let failedCount = takeUrgentOnly ? ++urgentFailures : ++postsSent;
          this.counts.failedPosts++;
          if (this.closed) break;
          if (
            error instanceof ClientEventResendSoonError ||
            (this.config.maxConsecutiveFailures !== undefined &&
              failedCount >= this.config.maxConsecutiveFailures)
          ) {
            this.droppedBatches++;
            this.counts.droppedRows += batchCount;
            if (released) released.unsent -= batchCount;
            this.config.onBatchDropped?.(items.length, failedCount);
            if (takeUrgentOnly) urgentFailures = 0;
            else {
              postsSent = 0;
              heldMore = undefined;
            }
            this.releaseBackpressure();
            continue;
          }
          this.inFlight = undefined;
          this.noteSentBefore(
            error instanceof ClientEventBatchRejectedError
              ? again.filter((againItem) => items.includes(againItem))
              : items,
          );
          if (takeUrgentOnly) this.urgent = items.concat(this.urgent);
          else {
            this.pending = items.concat(this.pending);
            this.owed += items.length;
            if (isResend) this.resendSizes.unshift(items.length);
            else if (error instanceof ClientEventTooSmallError) {
              let jsonBytes = items.length === batchCount ? bytes : this.jsonBytesOf(items);
              if (jsonBytes >= error.minBytes) {
                let max = Math.max(error.minBytes, Math.floor(jsonBytes / 2));
                heldMore = Math.min(max, heldMore ?? max);
              }
            }
          }
          let retryAfterMs = error instanceof ClientEventUploadError ? error.retryAfterMs : undefined;
          let retryDelay = this.retryDelay(failedCount, retryAfterMs);
          let mayDeferToUrgent = !takeUrgentOnly && retryAfterMs === undefined;
          if (!mayDeferToUrgent) this.cutsNextBackoff = false;
          if (mayDeferToUrgent && this.urgent.length > 0) {
            this.backoffOwedUntil = Date.now() + retryDelay;
            continue;
          }
          await this.backOff(retryDelay, mayDeferToUrgent);
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
  reportDrained(isClose = false) {
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
      trigger: isClose ? "close" : released.reason,
      rule: released.rule,
      heldEvents: released.count,
      heldMs: released.ageMs,
      ...counts,
      drainMs: Date.now() - released.at,
    });
  }
  takeBatch(count, hint_3) {
    let resendSize = this.resendSizes.shift();
    if (resendSize !== undefined) {
      this.owed = Math.max(0, this.owed - resendSize);
      let resendItems = this.pending.splice(0, resendSize);
      return {
        items: resendItems,
        bytes: this.jsonBytesOf(resendItems),
      };
    }
    let { maxBatchSize } = this.config;
    let byteLimit_2 = this.byteLimit(hint_3);
    let bytes = 0;
    let index_2 = 0;
    let itemBytesList = [];
    while (index_2 < count && index_2 < maxBatchSize) {
      let itemBytes_2 = 0;
      if (byteLimit_2 !== undefined) {
        let itemBytes_3 = jsonByteLength(this.pending[index_2]);
        if (itemBytes_3 === undefined) {
          this.forget(this.pending.splice(index_2, 1));
          count--;
          if (index_2 < this.owed) this.owed--;
          continue;
        }
        if (index_2 > 0 && bytes + itemBytes_3 > byteLimit_2) break;
        itemBytes_2 = itemBytes_3;
      }
      bytes += itemBytes_2;
      itemBytesList.push(itemBytes_2);
      index_2++;
    }
    let count_2 = index_2;
    let bytes_2 = bytes;
    while (index_2 > 0 && this.sharesPostWithNext(index_2 - 1)) {
      index_2--;
      bytes -= itemBytesList[index_2] ?? 0;
    }
    if (index_2 === 0) {
      index_2 = count_2;
      bytes = bytes_2;
      while (index_2 > 0 && this.sharesPostWithNext(index_2 - 1)) {
        let itemBytes_4 = byteLimit_2 === undefined ? 0 : jsonByteLength(this.pending[index_2]);
        if (itemBytes_4 === undefined) {
          this.forget(this.pending.splice(index_2, 1));
          if (index_2 < this.owed) this.owed--;
        } else {
          bytes += itemBytes_4;
          index_2++;
        }
      }
    }
    this.owed = Math.max(0, this.owed - index_2);
    return {
      items: this.pending.splice(0, index_2),
      bytes,
    };
  }
  sharesPostWithNext(index_3, list = this.pending) {
    let item_5 = list[index_3];
    return (
      index_3 + 1 < list.length &&
      typeof item_5 === "object" &&
      item_5 !== null &&
      this.tiedToNext.has(item_5)
    );
  }
  takeUrgent() {
    let { maxBatchSize } = this.config;
    let byteLimit_3 = this.byteLimit(undefined);
    let bytes_3 = 0;
    let index_4 = 0;
    while (index_4 < this.urgent.length && index_4 < maxBatchSize) {
      if (byteLimit_3 !== undefined) {
        let itemBytes_5 = jsonByteLength(this.urgent[index_4]);
        if (itemBytes_5 === undefined) {
          this.forget(this.urgent.splice(index_4, 1));
          continue;
        }
        if (index_4 > 0 && bytes_3 + itemBytes_5 > byteLimit_3) break;
        bytes_3 += itemBytes_5;
      }
      index_4++;
    }
    return {
      items: this.urgent.splice(0, index_4),
      bytes: bytes_3,
    };
  }
  noteSentBefore(items_5) {
    for (let item_6 of items_5) this.sentBefore.add(item_6);
  }
  forget(items_6) {
    for (let item_7 of items_6) this.sentBefore.delete(item_7);
  }
  takeAttemptOf(items_7) {
    if (this.sentBefore.size === 0)
      return {
        attempt: "first",
        again: [],
      };
    let filtered = items_7.filter((item_8) => this.sentBefore.delete(item_8));
    return {
      attempt:
        filtered.length === 0 ? "first" : filtered.length < items_7.length ? "resend_with_new" : "resend",
      again: filtered,
    };
  }
  retryDelay(failures, retryAfterMs) {
    let jitter = Math.random() * this.config.jitterMs;
    if (retryAfterMs !== undefined && Number.isFinite(retryAfterMs))
      return Math.max(this.config.baseDelayMs, Math.min(retryAfterMs, this.config.maxDelayMs)) + jitter;
    return Math.min(this.config.baseDelayMs * 2 ** (failures - 1), this.config.maxDelayMs) + jitter;
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
  hasHeld(predicate) {
    return !this.closed && this.pending.slice(this.owed).some(predicate);
  }
  holdsOnArrival(event) {
    let spec_4 = this.holdOnArrivals();
    return !this.closed && spec_4 !== undefined && !spec_4.passes?.(event);
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
  backOff(delayMs, renewable = false) {
    this.config.onIdle?.();
    if (this.retryNowOwed || (renewable && this.cutsNextBackoff)) {
      this.retryNowOwed = false;
      this.cutsNextBackoff = false;
      return Promise.resolve();
    }
    return new Promise((resolve) => {
      let sleeper = {
        end: resolve,
        until: renewable ? Date.now() + delayMs : undefined,
      };
      this.backoff = sleeper;
      sleeper.timer = setTimeout((self_2) => self_2.endBackoff(), delayMs, this);
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
//@ chunk-exfmq47h.js:798537-798601 placement
function jsonByteLength(value) {
  try {
    return Buffer.byteLength(jsonStringify(value));
  } catch {
    return;
  }
}
export {
  signClientEvent,
  ClientEventUploader,
  ClientEventUploadError,
  reportSignerLoadFailure,
  ClientEventBatchRejectedError,
  ClientEventResendSoonError,
  ClientEventTooSmallError,
  normalizeJsonRoundTrip,
};
