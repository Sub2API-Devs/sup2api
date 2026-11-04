/**
 * services/api/streamFallbackWarning.ts
 *
 * 流无事件回退警告（2.1.316 新增）
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-rbe666af.js (9)
 * attribution: placement 9
 */
import { LRUCache } from "../../../vendor/lru-cache/dist/esm/index.min.js";
import { createKeyedQueue } from "../../utils/promiseQueue.js";
import { newWeakMap, createBlockCache, clearGzipBlockStore } from "./gzipRequestBody.js";
import { SessionRootSlot } from "../../bootstrap/sessionSlices.js";
import { getRootSession, onSessionSwitch } from "../../bootstrap/state.js";
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-rbe666af.js:6373-7138 placement
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
//@ chunk-rbe666af.js:7138-7153 placement
var ROOT = "root";
//@ chunk-rbe666af.js:7153-7185 placement (2.1.88 match: formatZodErrors, 0.82)
/**
 * 返回 zod 路径或 root（名字可疑）。
 */
function formatZodErrors(zodError) {
  return zodError ?? "root";
}
//@ chunk-rbe666af.js:7185-7195 placement
/**
 * 流回退警告的遥测表容量（按客户端请求 id 最多记 256 条）。
 */
var MAX_TELEMETRY_ENTRIES = 256;
//@ chunk-rbe666af.js:7195-9155 placement
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
    waits: {
      firstMs: undefined,
      unsignedCalls: 0,
      asks: 0,
    },
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
//@ chunk-rbe666af.js:9155-9180 placement
var streamFallbackWarningSlot; // deferred: uses SessionRootSlot (../../bootstrap/sessionSlices.js) of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-rbe666af.js:9155", () => {
  streamFallbackWarningSlot = new SessionRootSlot(() => new StreamFallbackWarning());
});
//@ chunk-rbe666af.js:9180-9212 placement
/**
 * 导出函数 `streamFallbackWarning`：返回 de.of(getRootSession())。
 */
function streamFallbackWarning() {
  return streamFallbackWarningSlot.of(getRootSession());
}
//@ chunk-rbe666af.js:9212-9278 placement
/**
 * 导出常量或表 `CONVERSATION_RESET_KINDS`：值为 new Set(["clear", "resume", "spare_claim", "remote_attach"])。
 */
var CONVERSATION_RESET_KINDS; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-rbe666af.js:9212", () => {
  CONVERSATION_RESET_KINDS = new Set(["clear", "resume", "spare_claim", "remote_attach"]);
});
//@ chunk-rbe666af.js:9278-9648 placement
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
export {
  streamFallbackWarning,
  CONVERSATION_RESET_KINDS,
  decideStreamFallbackWarning,
  formatZodErrors,
  registerConversationResetHook,
  ROOT,
};
