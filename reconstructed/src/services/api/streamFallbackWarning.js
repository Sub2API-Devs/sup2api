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
import { newWeakMap, N, clearGzipBlockStore } from "./gzipRequestBody.js";
import { SessionRootSlot } from "../../bootstrap/sessionSlices.js";
import { getRootSession, onSessionSwitch } from "../../bootstrap/state.js";

//@ chunk-rbe666af.js:6373-7138 placement
function decideStreamFallbackWarning(cacheCoverage, conversation, n) {
  let r = cacheCoverage.get(conversation);
  if (r?.fired)
    return {
      kind: "already_fired",
    };
  let inputTokens = n?.input_tokens ?? 0;
  let cacheReadInputTokens = n?.cache_read_input_tokens ?? 0;
  let cacheCreationInputTokens = n?.cache_creation_input_tokens ?? 0;
  let a =
    (n?.cache_creation?.ephemeral_5m_input_tokens ?? 0) + (n?.cache_creation?.ephemeral_1h_input_tokens ?? 0);
  let d = cacheCreationInputTokens > 0 ? cacheCreationInputTokens : a;
  if (inputTokens + cacheReadInputTokens + d <= 0)
    return {
      kind: "no_usage",
    };
  if (inputTokens < 20000 || d >= 0.1 * inputTokens) {
    let u = r ?? {
      consecutive: 0,
      fired: false,
      okEmitted: false,
    };
    if (!r) cacheCoverage.set(conversation, u);
    u.consecutive = 0;
    if (!u.okEmitted && cacheReadInputTokens + d > 0) {
      u.okEmitted = true;
      return {
        kind: "confirm",
      };
    }
    return {
      kind: "healthy",
    };
  }
  let c = r ?? {
    consecutive: 0,
    fired: false,
    okEmitted: false,
  };
  if (!r) cacheCoverage.set(conversation, c);
  c.consecutive++;
  if (c.consecutive >= 3) {
    c.fired = true;
    return {
      kind: "fire",
      consecutive: c.consecutive,
      inputTokens,
      cacheReadTokens: cacheReadInputTokens,
      cacheCreationTokens: d,
    };
  }
  return {
    kind: "counted",
    consecutive: c.consecutive,
  };
}
//@ chunk-rbe666af.js:7138-7153 placement
var ROOT = "root";
//@ chunk-rbe666af.js:7153-7185 placement = formatZodErrors (0.82)
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
    blockStore: N(),
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
  hasFired(e) {
    return this.firedOnceKeys.has(e);
  }
  markFired(e) {
    this.firedOnceKeys.add(e);
  }
  once(e) {
    if (this.firedOnceKeys.has(e)) return false;
    this.firedOnceKeys.add(e);
    return true;
  }
  resetStreamNoEventsWarningLatch() {
    this.firedOnceKeys.delete("stream_no_events_fallback_warning");
  }
}
//@ chunk-rbe666af.js:9155-9180 placement
var streamFallbackWarningSlot = new SessionRootSlot(() => new StreamFallbackWarning());
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
var CONVERSATION_RESET_KINDS = new Set(["clear", "resume", "spare_claim", "remote_attach"]);
//@ chunk-rbe666af.js:9278-9648 placement
/**
 * 注册会话切换监听：每次切换（cd/hydrate 除外）重置"流无事件"警告锁存；开始新对话时清掉根线程的续接状态与 gzip 分块缓存，并解除"到下一次对话前"的分块关闭。
 */
function registerConversationResetHook() {
  return onSessionSwitch((e, t) => {
    if (t === "cd" || t === "hydrate") return;
    let n = streamFallbackWarning();
    n.resetStreamNoEventsWarningLatch();
    if (CONVERSATION_RESET_KINDS.has(t)) {
      n.threadDropRecreate.delete(ROOT);
      n.threadRequestEnds.delete(ROOT);
      let gzipRequestBody = n.gzipRequestBody;
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
