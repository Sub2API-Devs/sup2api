/**
 * services/api/streamFallbackWarning.ts
 *
 * 流无事件回退警告（2.1.316 新增）
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-5xgkngpb.js (4), chunk-g8sg6xj8.js (9)
 * attribution: placement 13
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { LRUCache } from "../../../vendor/lru-cache/dist/esm/index.min.js";
import { createKeyedQueue } from "../../utils/promiseQueue.js";
import { newWeakMap, createBlockCache, clearGzipBlockStore } from "./gzipRequestBody.js";
import { SessionRootSlot } from "../../bootstrap/sessionSlices.js";
import { getRootSession, onSessionSwitch } from "../../bootstrap/state.js";
import { logError } from "../../utils/log.js";
import { toError } from "../../utils/errors.js";
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-g8sg6xj8.js:5967-6732 placement
function decideStreamFallbackWarning(cacheCoverage, conversation, coverage) {
  let entry = cacheCoverage.get(conversation);
  if (entry?.fired)
    return {
      kind: "already_fired",
    };
  let inputTokens = coverage?.input_tokens ?? 0;
  let cacheReadInputTokens = coverage?.cache_read_input_tokens ?? 0;
  let cacheCreationInputTokens = coverage?.cache_creation_input_tokens ?? 0;
  let cacheCreateFallback =
    (coverage?.cache_creation?.ephemeral_5m_input_tokens ?? 0) +
    (coverage?.cache_creation?.ephemeral_1h_input_tokens ?? 0);
  let cacheCreation = cacheCreationInputTokens > 0 ? cacheCreationInputTokens : cacheCreateFallback;
  if (inputTokens + cacheReadInputTokens + cacheCreation <= 0)
    return {
      kind: "no_usage",
    };
  if (inputTokens < 20000 || cacheCreation >= 0.1 * inputTokens) {
    let state = entry ?? {
      consecutive: 0,
      fired: false,
      okEmitted: false,
    };
    if (!entry) cacheCoverage.set(conversation, state);
    state.consecutive = 0;
    if (!state.okEmitted && cacheReadInputTokens + cacheCreation > 0) {
      state.okEmitted = true;
      return {
        kind: "confirm",
      };
    }
    return {
      kind: "healthy",
    };
  }
  let state = entry ?? {
    consecutive: 0,
    fired: false,
    okEmitted: false,
  };
  if (!entry) cacheCoverage.set(conversation, state);
  state.consecutive++;
  if (state.consecutive >= 3) {
    state.fired = true;
    return {
      kind: "fire",
      consecutive: state.consecutive,
      inputTokens,
      cacheReadTokens: cacheReadInputTokens,
      cacheCreationTokens: cacheCreation,
    };
  }
  return {
    kind: "counted",
    consecutive: state.consecutive,
  };
}
//@ chunk-g8sg6xj8.js:6732-6747 placement
var ROOT = "root";
//@ chunk-g8sg6xj8.js:6747-6779 placement (2.1.88 match: formatZodErrors, 0.82)
/**
 * 返回 zod 路径或 root（名字可疑）。
 */
function formatZodErrors(zodError) {
  return zodError ?? "root";
}
//@ chunk-g8sg6xj8.js:6779-6789 placement
/**
 * 流回退警告的遥测表容量（按客户端请求 id 最多记 256 条）。
 */
var MAX_TELEMETRY_ENTRIES = 256;
//@ chunk-g8sg6xj8.js:6789-8852 placement
class StreamFallbackWarning {
  promptCacheBreak = {
    previousStateBySource: new Map(),
    hydrationAttempted: false,
    pendingPersist: Promise.resolve(),
    latestQueuedPersist: null,
    hashSalt: null,
    summaryForks: new Map(),
    parkedAgentBaselines: new Map(),
    parkedBy: null,
    classifierLines: new Map(),
    classifierCompactions: new Map(),
  };
  threadDecisionTracker = undefined;
  threadInheritedFields = {
    storedToolsHashByThread: new Map(),
    breakerTripped: false,
  };
  threadDropRecreate = new Map();
  threadRequestEnds = new Map();
  dumpPrompts = {
    recentRequests: [],
    stateByAgent: new Map(),
    retiredInitHashes: new LRUCache({
      max: 1000,
    }),
    appendQueue: createKeyedQueue(),
  };
  requestReplay = {
    chains: new Map(),
    chainClears: 0,
    hashMemos: new WeakMap(),
    unrecordableShapes: new Set(),
  };
  lastIngressUuidBySession = new Map();
  cacheCoverage = newWeakMap();
  ccsSenderAddr = {
    asking: new Map(),
    held: new Map(),
    carriedOn: undefined,
    waits: {
      firstMs: undefined,
      unsignedCalls: 0,
      asks: 0,
      asksBeforeTurn: 0,
    },
    turnStartedAt: 0,
  };
  cacheWarm = {
    inFlight: undefined,
    report: undefined,
    met: undefined,
  };
  gzipRequestBody = {
    latchedOff: false,
    rejectedThisProcess: false,
    persistedLatchChecked: false,
    persistedLatchInEffect: false,
    telemetryByClientRequestId: new LRUCache({
      max: MAX_TELEMETRY_ENTRIES,
    }),
    dispatchAtByClientRequestId: new LRUCache({
      max: MAX_TELEMETRY_ENTRIES,
    }),
    ccrWorkerSkipReasonsLogged: new Set(),
    blockStore: createBlockCache(),
    blocksSwitchedOff: false,
    bodyBytesSwitchedOff: false,
    reusingBodiesChecked: 0,
    firstReusingBodiesDraw: undefined,
    serialisedBodies: new WeakMap(),
    blocksBuildGeneration: undefined,
    blockGzippedResponses: new WeakMap(),
  };
  sentPrefix = {
    ledger: undefined,
    mode: undefined,
    persist: Promise.resolve(),
    persisted: undefined,
    pendingSeed: undefined,
    lastReport: new WeakMap(),
    lastVerdict: new WeakMap(),
    renderEpochs: new WeakMap(),
    memoryEpochs: new WeakMap(),
    announced: new WeakMap(),
    excuse: new WeakMap(),
    staged: new WeakMap(),
    boundVerdict: new WeakMap(),
  };
  bindingDrops = {
    seenBlocks: undefined,
    threadsRead: new LRUCache({
      max: 512,
    }),
  };
  foreignThinkingKeep = undefined;
  streamFirstByteArmedRequestIds = new LRUCache({
    max: 64,
  });
  skillHealthMap = undefined;
  headerMemberDropsNoted = new Set();
  firedOnceKeys = new Set();
  hasFired(key) {
    return this.firedOnceKeys.has(key);
  }
  markFired(key) {
    this.firedOnceKeys.add(key);
  }
  once(key) {
    if (this.firedOnceKeys.has(key)) return false;
    this.firedOnceKeys.add(key);
    return true;
  }
  resetStreamNoEventsWarningLatch() {
    this.firedOnceKeys.delete("stream_no_events_fallback_warning");
  }
}
//@ chunk-g8sg6xj8.js:8852-8877 placement
var streamFallbackWarningSlot; // deferred: uses SessionRootSlot (../../bootstrap/sessionSlices.js) of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-g8sg6xj8.js:8852", () => {
  streamFallbackWarningSlot = new SessionRootSlot(() => new StreamFallbackWarning());
});
//@ chunk-g8sg6xj8.js:8877-8909 placement
/**
 * 导出函数 `streamFallbackWarning`：返回 de.of(getRootSession())。
 */
function streamFallbackWarning() {
  return streamFallbackWarningSlot.of(getRootSession());
}
//@ chunk-g8sg6xj8.js:8909-8975 placement
/**
 * 导出常量或表 `CONVERSATION_RESET_KINDS`：值为 new Set(["clear", "resume", "spare_claim", "remote_attach"])。
 */
var CONVERSATION_RESET_KINDS; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-g8sg6xj8.js:8909", () => {
  CONVERSATION_RESET_KINDS = new Set(["clear", "resume", "spare_claim", "remote_attach"]);
});
//@ chunk-g8sg6xj8.js:8975-9345 placement
/**
 * 注册会话切换监听：每次切换（cd/hydrate 除外）重置"流无事件"警告锁存；开始新对话时清掉根线程的续接状态与 gzip 分块缓存，并解除"到下一次对话前"的分块关闭。
 */
function registerConversationResetHook() {
  return onSessionSwitch((sessionId, kind) => {
    if (kind === "cd" || kind === "hydrate") return;
    let state = streamFallbackWarning();
    state.resetStreamNoEventsWarningLatch();
    if (CONVERSATION_RESET_KINDS.has(kind)) {
      state.threadDropRecreate.delete(ROOT);
      state.threadRequestEnds.delete(ROOT);
      let gzipRequestBody = state.gzipRequestBody;
      clearGzipBlockStore(gzipRequestBody.blockStore);
      gzipRequestBody.reusingBodiesChecked = 0;
      gzipRequestBody.firstReusingBodiesDraw = undefined;
      if (gzipRequestBody.blocksSwitchedOff === "until_next_conversation")
        gzipRequestBody.blocksSwitchedOff = false;
    }
  });
}
//@ chunk-5xgkngpb.js:1546985-1546998 placement
/**
 * 缓存预热的最短年龄（1500 ms），小于它算 warm_too_young。
 */
var MIN_WARM_HOLD_MS = 1500;
//@ chunk-5xgkngpb.js:1546998-1547122 placement
/**
 * 结算上一次预热中的请求：取 cacheWarm 状态并转给 dqo，异常只记日志。
 */
function awaitCacheWarmIfAny(model, signal) {
  try {
    let cacheWarm = streamFallbackWarning().cacheWarm;
    return cacheWarm.inFlight === undefined
      ? undefined
      : awaitCacheWarm(cacheWarm, cacheWarm.inFlight, model, signal);
  } catch (error) {
    logError(toError(error));
    return;
  }
}
//@ chunk-5xgkngpb.js:1547122-1547451 placement
/**
 * 给预热请求打结束原因（回合停止、换模型、禁hold、太年轻、等结果），非正常结束时中止请求，并记录年龄与持续时长。
 */
async function awaitCacheWarm(cacheWarm, inFlight, model, signal) {
  try {
    let startTime = performance.now();
    let ageMs = startTime - inFlight.sentAt;
    let end = signal.aborted
      ? "turn_stopped"
      : model !== inFlight.model
        ? "other_model"
        : inFlight.holdCapMs === 0
          ? "hold_disabled"
          : ageMs < MIN_WARM_HOLD_MS
            ? "warm_too_young"
            : await waitForWarmSettle(inFlight, signal);
    if (end !== "warm_done" && end !== "warm_failed" && end !== "turn_stopped") inFlight.abort();
    cacheWarm.met ??= {
      end,
      ageMs,
      heldMs: performance.now() - startTime,
    };
  } catch (error) {
    logError(toError(error));
  }
}
//@ chunk-5xgkngpb.js:1547451-1547751 placement
/**
 * 等预热请求 settle，带 holdCapMs 超时与调用方 abort 监听，返回结束原因。
 */
async function waitForWarmSettle(inFlight, signal) {
  let deferred = Promise.withResolvers();
  let timer = setTimeout(deferred.resolve, inFlight.holdCapMs, "hold_cap_reached");
  let onAbort = deferred.resolve.bind(undefined, "turn_stopped");
  signal.addEventListener("abort", onAbort, {
    once: true,
  });
  try {
    return await Promise.race([inFlight.settled, deferred.promise]);
  } finally {
    clearTimeout(timer);
    signal.removeEventListener("abort", onAbort);
  }
}
export {
  streamFallbackWarning,
  CONVERSATION_RESET_KINDS,
  decideStreamFallbackWarning,
  formatZodErrors,
  awaitCacheWarmIfAny,
  ROOT,
  registerConversationResetHook,
};
