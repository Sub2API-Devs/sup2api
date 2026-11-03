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
import { Dc } from "../../../vendor/lru-cache/dist/esm/index.min.js";
import { createKeyedQueue } from "../../utils/promiseQueue.js";
import { G, N_rbe6, clearGzipBlockStore } from "./gzipRequestBody.js";
import { SessionRootSlot } from "../../bootstrap/sessionSlices.js";
import { getRootSession, onSessionSwitch } from "../../bootstrap/state.js";

//@ chunk-rbe666af.js:6373-7138 placement
function decideStreamFallbackWarning(e, t, n) {
  let r = e.get(t);
  if (r?.fired) return { kind: "already_fired" };
  let s = n?.input_tokens ?? 0,
    i = n?.cache_read_input_tokens ?? 0,
    o = n?.cache_creation_input_tokens ?? 0,
    a =
      (n?.cache_creation?.ephemeral_5m_input_tokens ?? 0) +
      (n?.cache_creation?.ephemeral_1h_input_tokens ?? 0),
    d = o > 0 ? o : a;
  if (s + i + d <= 0) return { kind: "no_usage" };
  if (s < 20000 || d >= 0.1 * s) {
    let u = r ?? { consecutive: 0, fired: !1, okEmitted: !1 };
    if (!r) e.set(t, u);
    if (((u.consecutive = 0), !u.okEmitted && i + d > 0)) return ((u.okEmitted = !0), { kind: "confirm" });
    return { kind: "healthy" };
  }
  let c = r ?? { consecutive: 0, fired: !1, okEmitted: !1 };
  if (!r) e.set(t, c);
  if ((c.consecutive++, c.consecutive >= 3))
    return (
      (c.fired = !0),
      { kind: "fire", consecutive: c.consecutive, inputTokens: s, cacheReadTokens: i, cacheCreationTokens: d }
    );
  return { kind: "counted", consecutive: c.consecutive };
}
//@ chunk-rbe666af.js:7138-7153 placement
var ROOT = "root";
/**
 * 返回 zod 路径或 root（名字可疑）。
 */
//@ chunk-rbe666af.js:7153-7185 placement = formatZodErrors (0.82)
function formatZodErrors(zodError) {
  return zodError ?? "root";
}
//@ chunk-rbe666af.js:7185-7195 placement
var L = 256;
//@ chunk-rbe666af.js:7195-9155 placement
class StreamFallbackWarning {
  promptCacheBreak = {
    previousStateBySource: new Map(),
    hydrationAttempted: !1,
    pendingPersist: Promise.resolve(),
    latestQueuedPersist: null,
    hashSalt: null,
    summaryForks: new Map(),
    parkedAgentBaselines: new Map(),
    parkedBy: null,
    classifierLines: new Map(),
    classifierCompactions: new Map(),
  };
  threadDecisionTracker = void 0;
  threadInheritedFields = { storedToolsHashByThread: new Map(), breakerTripped: !1 };
  threadDropRecreate = new Map();
  threadRequestEnds = new Map();
  dumpPrompts = {
    recentRequests: [],
    stateByAgent: new Map(),
    retiredInitHashes: new Dc({ max: 1000 }),
    appendQueue: createKeyedQueue(),
  };
  requestReplay = {
    chains: new Map(),
    chainClears: 0,
    hashMemos: new WeakMap(),
    unrecordableShapes: new Set(),
  };
  lastIngressUuidBySession = new Map();
  cacheCoverage = G();
  ccsSenderAddr = {
    asking: new Map(),
    held: new Map(),
    waits: { firstMs: void 0, unsignedCalls: 0, asks: 0 },
  };
  gzipRequestBody = {
    latchedOff: !1,
    rejectedThisProcess: !1,
    persistedLatchChecked: !1,
    persistedLatchInEffect: !1,
    telemetryByClientRequestId: new Dc({ max: L }),
    dispatchAtByClientRequestId: new Dc({ max: L }),
    ccrWorkerSkipReasonsLogged: new Set(),
    blockStore: N_rbe6(),
    blocksSwitchedOff: !1,
    bodyBytesSwitchedOff: !1,
    reusingBodiesChecked: 0,
    firstReusingBodiesDraw: void 0,
    serialisedBodies: new WeakMap(),
    blocksBuildGeneration: void 0,
    blockGzippedResponses: new WeakMap(),
  };
  sentPrefix = {
    ledger: void 0,
    mode: void 0,
    persist: Promise.resolve(),
    persisted: void 0,
    pendingSeed: void 0,
    lastReport: new WeakMap(),
    lastVerdict: new WeakMap(),
    renderEpochs: new WeakMap(),
    memoryEpochs: new WeakMap(),
    announced: new WeakMap(),
    excuse: new WeakMap(),
    staged: new WeakMap(),
    boundVerdict: new WeakMap(),
  };
  bindingDrops = { seenBlocks: void 0, threadsRead: new Dc({ max: 512 }) };
  foreignThinkingKeep = void 0;
  streamFirstByteArmedRequestIds = new Dc({ max: 64 });
  skillHealthMap = void 0;
  headerMemberDropsNoted = new Set();
  firedOnceKeys = new Set();
  hasFired(e) {
    return this.firedOnceKeys.has(e);
  }
  markFired(e) {
    this.firedOnceKeys.add(e);
  }
  once(e) {
    if (this.firedOnceKeys.has(e)) return !1;
    return (this.firedOnceKeys.add(e), !0);
  }
  resetStreamNoEventsWarningLatch() {
    this.firedOnceKeys.delete("stream_no_events_fallback_warning");
  }
}
//@ chunk-rbe666af.js:9155-9180 placement
var de = new SessionRootSlot(() => new StreamFallbackWarning());
//@ chunk-rbe666af.js:9180-9212 placement
function Ws() {
  return de.of(getRootSession());
}
//@ chunk-rbe666af.js:9212-9278 placement
var aes = new Set(["clear", "resume", "spare_claim", "remote_attach"]);
/**
 * 注册会话切换监听：每次切换（cd/hydrate 除外）重置"流无事件"警告锁存；开始新对话时清掉根线程的续接状态与 gzip 分块缓存，并解除"到下一次对话前"的分块关闭。
 */
//@ chunk-rbe666af.js:9278-9648 placement
function registerConversationResetHook() {
  return onSessionSwitch((e, t) => {
    if (t === "cd" || t === "hydrate") return;
    let n = Ws();
    if ((n.resetStreamNoEventsWarningLatch(), aes.has(t))) {
      (n.threadDropRecreate.delete(ROOT), n.threadRequestEnds.delete(ROOT));
      let gzipRequestBody = n.gzipRequestBody;
      if (
        (clearGzipBlockStore(gzipRequestBody.blockStore),
        (gzipRequestBody.reusingBodiesChecked = 0),
        (gzipRequestBody.firstReusingBodiesDraw = void 0),
        gzipRequestBody.blocksSwitchedOff === "until_next_conversation")
      )
        gzipRequestBody.blocksSwitchedOff = !1;
    }
  });
}

export { Ws, aes, decideStreamFallbackWarning, formatZodErrors, registerConversationResetHook, ROOT };
