/**
 * bootstrap/sessionSlices.ts
 *
 * 会话状态切片：压缩边界校验、withProject 派生、会话来源等（2.1.316 新增）
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-ndmse9kj.js (46)
 * attribution: placement 46
 */
import { resolve } from "path";
import { SYNTHETIC_MODEL } from "../constants/messages.js";
import { count } from "../utils/collections.js";
import {
  currentSession,
  getAgentContext,
  defaultRootSession,
  agentContextGetter,
  getHookHolder,
  getRootSession,
  getSessionId,
  isDiskless,
} from "./state.js";
import { identityAgentId2 } from "../utils/agentId.js";
import { createSignal } from "../utils/signal.js";
import { HostScoped } from "../utils/hostScoped.js";
import { identity } from "../utils/pathClassification.js";
import {
  SessionObservers,
  ConversationLatches,
  CostLedger,
  UsageCreditsConsentSlots,
  HookRegistry,
  InvokedSkills,
  McpSessionWiring,
  ModelSelectionSlice,
  PromptAssemblySlice,
  RequestJournal,
  SessionCron,
  SessionFlags,
  SessionScratch,
  SurfaceCapabilities,
  UserPresence,
  deepEqualWithCycles,
  nullProtoCopy,
  ManagedDocumentLinks,
  unlatchStickyBetaLatches,
  ManagedFileProtections,
  RepoTierFreeze,
  settingsEqualIgnoringOwner,
  ToolsUsedSet,
} from "./stateSlices.js";
import { SESSION_URL_HASH_SALT } from "../utils/sessionUrl.js";
import { isStorageV5Enabled } from "../utils/hoverRest.js";

//@ chunk-ndmse9kj.js:36671-36750 placement
/**
 * 判断是否为压缩时插入的虚拟会话消息：type 为 user/assistant 且 isVirtual 为 true。
 */
function isVirtualConversationMessage(e) {
  return (e.type === "user" || e.type === "assistant") && e.isVirtual === true;
}
//@ chunk-ndmse9kj.js:36750-36843 placement
/**
 * 判断是否为合成模型的 API 错误消息：assistant 且 isApiErrorMessage 为真、message.model 为 SYNTHETIC_MODEL。
 */
function isSyntheticModelApiErrorMessage(e) {
  return e.type === "assistant" && e.isApiErrorMessage === true && e.message?.model === SYNTHETIC_MODEL;
}
//@ chunk-ndmse9kj.js:36843-36912 placement = isSystemLocalCommandMessage (1)
function isSystemLocalCommandMessage(message) {
  return message.type === "system" && message.subtype === "local_command";
}
//@ chunk-ndmse9kj.js:36912-37262 placement
/**
 * 判断消息是否不属于发给 API 的对话内容：progress、非本地命令的 system、若干内部附件（thinking_drop、credential_org、prompt_snapshot、prompt_render_point、deferred_tools_record）等返回 true；api_system 返回 false。
 */
function isNonConversationMessage(e) {
  if (e.type === "api_system") return false;
  return (
    e.type === "progress" ||
    (e.type === "system" && !isSystemLocalCommandMessage(e)) ||
    isVirtualConversationMessage(e) ||
    isSyntheticModelApiErrorMessage(e) ||
    (e.type === "attachment" &&
      (e.attachment?.type === "thinking_drop" ||
        e.attachment?.type === "credential_org" ||
        e.attachment?.type === "prompt_snapshot" ||
        e.attachment?.type === "prompt_render_point" ||
        e.attachment?.type === "deferred_tools_record"))
  );
}
//@ chunk-ndmse9kj.js:37262-37361 placement
var ARM_GATE_EVENT_KINDS = [
  "sdk_single_prompt_gate",
  "subagent_estimate",
  "subagent_final_turn",
  "rows_unreadable",
];
var SIDECAR_READAHEAD_LIMIT = 8;
//@ chunk-ndmse9kj.js:37361-39133 placement
/**
 * 会话状态切片：按 agentId 记录侧车状态、尝试次数、计数失败、否决记录、arm-gate 事件去重，并串行化侧车读写（enqueueSidecarIo）与预读缓存（有上限）。
 */
class AgentSidecarSlice {
  byAgent = new Map();
  attemptsByAgent = new Map();
  cappedFailuresByAgent = new Map();
  armGateEventEmitted = new Set();
  vetoedUnderPrompt = new Map();
  sidecarIo = Promise.resolve();
  rehydrateAttemptedSessions = new Set();
  sidecarReadsAhead = new Map();
  get(e) {
    return this.byAgent.get(e);
  }
  has(e) {
    return this.byAgent.has(e);
  }
  put(e, n) {
    this.byAgent.set(e, n);
  }
  remove(e) {
    this.byAgent.delete(e);
  }
  nextAttemptNumber(e) {
    let n = (this.attemptsByAgent.get(e) ?? 0) + 1;
    this.attemptsByAgent.set(e, n);
    return n;
  }
  consecutiveCountedFailures(e) {
    return this.cappedFailuresByAgent.get(e) ?? 0;
  }
  recordCountedFailure(e) {
    let n = (this.cappedFailuresByAgent.get(e) ?? 0) + 1;
    this.cappedFailuresByAgent.set(e, n);
    return n;
  }
  clearCountedFailures(e) {
    this.cappedFailuresByAgent.delete(e);
  }
  recordVeto(e, n) {
    this.vetoedUnderPrompt.set(e, n);
  }
  isVetoedUnder(e, n) {
    return this.vetoedUnderPrompt.get(e) === n;
  }
  latchArmGateEvent(e) {
    if (this.armGateEventEmitted.has(e)) return false;
    this.armGateEventEmitted.add(e);
    return true;
  }
  enqueueSidecarIo(e, n) {
    this.sidecarIo = this.sidecarIo.then(e, e).catch(n);
    return this.sidecarIo;
  }
  sidecarIoSettled() {
    return this.sidecarIo;
  }
  hasAttemptedRehydrate(e) {
    return this.rehydrateAttemptedSessions.has(e);
  }
  markRehydrateAttempted(e) {
    this.rehydrateAttemptedSessions.add(e);
  }
  keepSidecarReadAhead(e, n) {
    this.sidecarReadsAhead.delete(e);
    while (this.sidecarReadsAhead.size >= SIDECAR_READAHEAD_LIMIT) {
      let o = this.sidecarReadsAhead.keys().next().value;
      if (o === undefined) break;
      this.sidecarReadsAhead.delete(o);
    }
    this.sidecarReadsAhead.set(e, n);
  }
  takeSidecarReadAhead(e) {
    let n = this.sidecarReadsAhead.get(e);
    this.sidecarReadsAhead.delete(e);
    return n;
  }
  dropSidecarReadAhead(e) {
    this.sidecarReadsAhead.delete(e);
  }
  forgetSubagentTelemetry(e) {
    this.attemptsByAgent.delete(e);
    this.cappedFailuresByAgent.delete(e);
    this.vetoedUnderPrompt.delete(e);
    for (let n of ARM_GATE_EVENT_KINDS) this.armGateEventEmitted.delete(`${e}:${n}`);
  }
}
//@ chunk-ndmse9kj.js:39133-39166 placement
/**
 * agentId 为空时归到 "main"，用于侧车状态与否决记录的分键。
 */
function agentIdOrDefault(e) {
  return e ?? "main";
}
//@ chunk-ndmse9kj.js:39166-39274 placement
/**
 * 由消息列表与行 uuid 生成预计算压缩的游标状态 {lastUuid, seenUuids, rowUuids}。
 */
function createCompactSeenState({ messages, rowUuids }, lastUuid) {
  return {
    lastUuid,
    seenUuids: new Set(messages.map((message) => message.uuid)),
    rowUuids,
  };
}
//@ chunk-ndmse9kj.js:39274-40544 placement
/**
 * 校验压缩边界：边界 uuid、被覆盖消息、保留消息是否仍一致，不一致时拒绝
 */
function checkCompactBoundaryCoverage({ coverage, kept, sent, received, instructions, fit }) {
  let a = ({ uuid }) => coverage.seenUuids.has(uuid);
  let l = new Set(sent.messages.map((message) => message.uuid));
  if (!l.has(coverage.lastUuid))
    return {
      kind: "refuse",
      reason: "boundary_uuid_missing",
    };
  if (!coverage.rowUuids.every((rowUuid) => l.has(rowUuid)))
    return {
      kind: "refuse",
      reason: "covered_messages_changed",
    };
  if (kept.some((d) => a(d) && !l.has(d.uuid)))
    return {
      kind: "refuse",
      reason: "kept_message_missing",
    };
  if (
    sent.messages
      .slice(0, sent.messages.findLastIndex(a))
      .some(
        (message) => message.type === "assistant" && !isVirtualConversationMessage(message) && !a(message),
      )
  )
    return {
      kind: "refuse",
      reason: "unseen_reply",
    };
  let sliced = sent.rowUuids.slice(
    0,
    sent.rowUuids.findLastIndex((rowUuid) => coverage.seenUuids.has(rowUuid)) + 1,
  );
  if (
    instructions ||
    !received.messages.some(({ uuid }) => uuid === coverage.lastUuid) ||
    !arraysEqual(received.rowUuids, sliced)
  )
    return {
      kind: "refuse",
      reason: "hook_rewrite",
    };
  let lastIndex = received.messages.findLastIndex(a);
  let flattened = received.messages.flatMap((message, w) =>
    message.type === "progress" || a(message)
      ? []
      : [
          {
            message,
            isEarly: w < lastIndex,
          },
        ],
  );
  let m = ({ message, isEarly }) => isEarly && isVirtualConversationMessage(message);
  let h = new Set(flattened.filter(m).map(({ message }) => message));
  let filtered = flattened.filter((d) => !m(d));
  let mapped = filtered.map(({ message }) => message);
  let x =
    fit &&
    evaluateCompactSwap(
      fit,
      received.messages.filter((message) => !h.has(message)),
      [...kept, ...mapped],
    );
  if (x?.givesWay)
    return {
      kind: "refuse",
      reason: "would_not_fit",
      sizes: x.sizes,
    };
  return {
    kind: "reuse",
    tail: mapped,
    earlyTailCount: count(filtered, ({ isEarly }) => isEarly),
    displayOnlyLeftOutCount: h.size,
    headReordered: !arraysEqual(received.rowUuids, coverage.rowUuids),
    sizes: x?.sizes,
  };
}
//@ chunk-ndmse9kj.js:40544-40928 placement
/**
 * 估算用压缩结果替换后的 token 数（postSwapTokens），并判断是否应让位（超过阈值且压缩来源小于窗口）。
 */
function evaluateCompactSwap(
  { thresholdTokens, windowTokens, liveTokens, madeFromTokens, summary, sizeOf },
  a,
  l,
) {
  let p = new Set(l.map((g) => g.uuid));
  let f = new Set(a.map((g) => g.uuid));
  let filtered = a.filter((g) => !p.has(g.uuid));
  let filtered_2 = a.filter((g) => p.has(g.uuid));
  let filtered_3 = l.filter((g) => !f.has(g.uuid));
  let h = Math.max(liveTokens - sizeOf(filtered), sizeOf(filtered_2)) + sizeOf([...summary, ...filtered_3]);
  return {
    sizes: {
      postSwapTokens: h,
      thresholdTokens,
      windowTokens,
    },
    givesWay: h >= thresholdTokens && madeFromTokens < windowTokens,
  };
}
//@ chunk-ndmse9kj.js:40928-40977 placement
function arraysEqual(rowUuids, n) {
  return n.every((o, r) => rowUuids[r] === o);
}
//@ chunk-ndmse9kj.js:40977-41173 placement = isHumanTurn (0.802)
/**
 * 找最后一条真实用户输入（非 meta、非工具结果）的 uuid。
 */
function findLastHumanPromptUuid(m) {
  return (
    m.findLast(
      (o) =>
        o.type === "user" &&
        !o.isMeta &&
        o.toolUseResult === undefined &&
        (typeof o.message.content === "string" || !o.message.content.some((r) => r.type === "tool_result")),
    )?.uuid ?? ""
  );
}
//@ chunk-ndmse9kj.js:41173-41221 placement
function recordVetoForLastPrompt(precompute, agentId, messages) {
  precompute.recordVeto(agentIdOrDefault(agentId), findLastHumanPromptUuid(messages));
}
//@ chunk-ndmse9kj.js:41221-41289 placement
class EngineStoreHolder {
  #e = undefined;
  get current() {
    return this.#e;
  }
  adopt(e) {
    this.#e = e;
  }
}
//@ chunk-ndmse9kj.js:41289-41420 placement
class SessionIdentitySlice {
  #e = null;
  #t = null;
  mainAgentId(e) {
    this.#e ??= identityAgentId2(e);
    return this.#e;
  }
  projectDir() {
    return this.#t;
  }
  replaceProjectDir(e) {
    this.#t = e;
  }
}
//@ chunk-ndmse9kj.js:41420-41740 placement
/**
 * 会话状态切片：记录当前打开的工具调用 id 与本会话是否已回答，用于防止同一问题在别处重复打开。
 */
class OpenToolUseQuestionSlice {
  openToolUseId;
  answeredThisSession = false;
  get answered() {
    return this.answeredThisSession;
  }
  markAnswered() {
    this.answeredThisSession = true;
  }
  isOpenElsewhere(e) {
    return this.openToolUseId !== undefined && this.openToolUseId !== e;
  }
  open(openToolUseId) {
    this.openToolUseId = openToolUseId;
  }
  closeFor(e) {
    if (e !== undefined && this.openToolUseId === e) this.openToolUseId = undefined;
  }
}
//@ chunk-ndmse9kj.js:41740-41817 placement
class WorkflowUsageConsentFlag {
  granted = false;
  isGranted() {
    return this.granted;
  }
  grant() {
    this.granted = true;
  }
}
//@ chunk-ndmse9kj.js:41817-41938 placement
class TurnEndTaskSlice {
  inFlight = null;
  startedForTurnEnd = false;
  reset() {
    this.inFlight?.abort();
    this.inFlight = null;
    this.startedForTurnEnd = false;
  }
}
//@ chunk-ndmse9kj.js:41938-42648 placement
/**
 * 会话状态切片：云同步（账号列表、同步错误、重载保持计数、同步目录、待删回收站条目、缺失条目重同步、设置安装）的运行时状态。
 */
class CloudSyncSlice {
  firstSyncPromise = null;
  accountListing = "pending";
  syncErrors = [];
  lastRoundListed = false;
  listedStamp = null;
  changesLanded = 0;
  changesReloaded = 0;
  reloadsCompleted = 0;
  holdsSet = 0;
  reloadHeld = false;
  lastCompleteList = null;
  lastSyncedLaneLoad = null;
  syncedLaneOpened = false;
  syncedDirsLoadedHere = new Set();
  dirsNewHere = new Set();
  awaitsFirstRun = false;
  removalsDeferredHere = new Set();
  pendingTrashRemovals = [];
  ensureBucketRoot = null;
  deferredRelist = null;
  missingEntry = {
    resync: null,
    resyncAt: -1 / 0,
    swept: false,
  };
  settingsInstall = {
    current: null,
    next: null,
    loaded: null,
  };
  holdReload() {
    this.reloadHeld = true;
    this.holdsSet++;
  }
  endHoldSetBefore(e) {
    this.reloadHeld &&= this.holdsSet !== e;
  }
  reloaded(e) {
    this.changesReloaded = Math.max(this.changesReloaded, e);
    this.reloadsCompleted++;
  }
}
//@ chunk-ndmse9kj.js:42648-42875 placement
class TurnOfferSlice {
  abortController = null;
  eligibleTurns = 0;
  unusedInARow = 0;
  askOnNextTurn() {
    this.eligibleTurns = 0;
  }
  reset() {
    this.abortController?.abort();
    this.abortController = null;
  }
  arm() {
    let abortController = new AbortController();
    this.abortController = abortController;
    return abortController;
  }
}
//@ chunk-ndmse9kj.js:42875-43034 placement
class CcrSessionLatchSlice {
  #e = undefined;
  #t = undefined;
  ccrSessionID() {
    return this.#e;
  }
  latchCcrSessionID(e) {
    this.#e = e;
  }
  syncEnabled() {
    return this.#t;
  }
  latchSyncEnabled(e) {
    this.#t = e;
    return e;
  }
}
//@ chunk-ndmse9kj.js:43034-43178 placement
class AutonomousLoopSlice {
  autonomousPreambleDelivered = false;
  lastLoopFileDelivered = null;
  reset() {
    this.autonomousPreambleDelivered = false;
    this.lastLoopFileDelivered = null;
  }
}
//@ chunk-ndmse9kj.js:43178-44268 placement
/**
 * 会话状态切片：旁路提问的问答记录（最多 20 条）、待重新打开的请求（多个拥有者）、重新打开回调和进行中的问题栈。
 */
class SideQuestionSlice {
  exchanges = [];
  replace(exchanges) {
    this.exchanges = exchanges;
  }
  append(question, response, o, r) {
    this.exchanges = [
      ...this.exchanges,
      {
        question,
        response,
        ...(o && {
          fallbackNotice: o,
        }),
        ...(r && {
          agentId: r,
        }),
      },
    ].slice(-20);
  }
  pendingReopen = null;
  reopenAway = false;
  get reopenPending() {
    return this.pendingReopen !== null;
  }
  armReopen(e, n) {
    if (this.pendingReopen) {
      this.pendingReopen.owners.add(e);
      return;
    }
    this.pendingReopen = {
      owners: new Set([e]),
      cancel: n(),
    };
  }
  clearPendingReopen(e) {
    let pendingReopen = this.pendingReopen;
    if (!pendingReopen) {
      this.reopenAway = false;
      return;
    }
    if (e !== undefined) {
      pendingReopen.owners.delete(e);
      if (pendingReopen.owners.size > 0) return;
    }
    pendingReopen.cancel();
    this.pendingReopen = null;
    this.reopenAway = false;
  }
  reopener = null;
  setReopener(reopener) {
    this.reopener = reopener;
  }
  get hasReopener() {
    return this.reopener !== null;
  }
  reopenNow() {
    return this.reopener?.() ?? false;
  }
  inFlightQuestions = [];
  get inFlight() {
    return this.inFlightQuestions.at(-1) ?? null;
  }
  pendingBesidesTop() {
    return this.inFlightQuestions.slice(0, -1);
  }
  setInFlight(e) {
    if (!this.inFlightQuestions.includes(e)) this.inFlightQuestions = [...this.inFlightQuestions, e];
  }
  clearInFlight(e) {
    if (this.inFlightQuestions.includes(e))
      this.inFlightQuestions = this.inFlightQuestions.filter((inFlightQuestion) => inFlightQuestion !== e);
  }
}
//@ chunk-ndmse9kj.js:44268-44278 placement
var SUBMITTED_QUEUE_LIMIT = 16;
//@ chunk-ndmse9kj.js:44278-44876 placement
/**
 * 会话状态切片：一次性提议（pending/shown）与已提交项队列，带 subscribe/getSnapshot 供 useSyncExternalStore 订阅。
 */
class PendingOfferSlice {
  pending = null;
  shownThisSession = false;
  changed = createSignal();
  submitted = [];
  submittedChanged = createSignal();
  subscribe = this.changed.subscribe;
  getSnapshot = () => this.pending;
  subscribeSubmitted = this.submittedChanged.subscribe;
  submit(e) {
    if (this.shownThisSession) return;
    if (this.submitted.length >= SUBMITTED_QUEUE_LIMIT) this.submitted.shift();
    this.submitted.push(e);
    this.submittedChanged.emit();
  }
  takeSubmitted() {
    let submitted = this.submitted;
    this.submitted = [];
    return submitted;
  }
  offer(pending) {
    if (this.shownThisSession) return;
    this.pending = pending;
    this.changed.emit();
  }
  dismiss() {
    if (this.pending !== null) {
      this.pending = null;
      this.changed.emit();
    }
  }
  markShown() {
    this.shownThisSession = true;
  }
}
//@ chunk-ndmse9kj.js:44876-44919 placement
/**
 * 权限暂存通道 consume() 的哨兵值：该条目已被淘汰时返回此 Symbol，调用方据此当作未命中处理。
 */
var PERMISSION_STASH_EVICTED_SYMBOL = Symbol("permission-stash-evicted");
//@ chunk-ndmse9kj.js:44919-46770 placement
/**
 * 会话状态切片：按读/写两条通道暂存文件状态（容量上限、淘汰集合、溢出后标记 poisoned），并按会话记录文件 dev/ino 身份，consume 时清理前缀并返回被淘汰标记。
 */
class FileStateStashSlice {
  entriesCap;
  evictedKeysCap;
  lanes = {
    write: new Map(),
    read: new Map(),
  };
  evicted = {
    write: new Set(),
    read: new Set(),
  };
  poisoned = {
    write: false,
    read: false,
  };
  identities = new Map();
  identitiesEvicted = new Set();
  identitiesPoisoned = false;
  constructor(entriesCap = 256, evictedKeysCap = 1048576) {
    this.entriesCap = entriesCap;
    this.evictedKeysCap = evictedKeysCap;
  }
  stash(e, n, o, r = "write") {
    if (e === undefined) return;
    let i = this.lanes[r];
    let s = this.evicted[r];
    let a = fileLaneKey(e, n);
    if (s.has(a)) return;
    let l = i.get(a);
    if (l !== undefined) {
      let p = new Set(o);
      i.set(
        a,
        l.filter((f) => p.has(f)),
      );
      return;
    }
    if (i.size >= this.entriesCap) {
      let p = i.keys().next().value;
      if (p !== undefined) {
        i.delete(p);
        s.add(p);
        if (s.size > this.evictedKeysCap) {
          this.poisoned[r] = true;
          let f = s.values().next().value;
          if (f !== undefined) s.delete(f);
        }
      }
    }
    i.set(a, o);
  }
  holds(e, n, o = "write") {
    return e !== undefined && this.lanes[o].has(fileLaneKey(e, n));
  }
  stashIdentity(e, n, o) {
    if (e === undefined) return;
    let r = this.identities.get(e);
    let i = r?.get(n);
    if (r !== undefined && i !== undefined) {
      if (i === null || o === null || i.dev !== o.dev || i.ino !== o.ino) r.set(n, null);
      return;
    }
    let s = this.identitiesEvicted.has(e) || this.identitiesPoisoned;
    if (r === undefined) {
      if (!s && this.identities.size >= this.entriesCap) {
        let a = this.identities.keys().next().value;
        if (a !== undefined) {
          this.identities.delete(a);
          this.identitiesEvicted.add(a);
          if (this.identitiesEvicted.size > this.evictedKeysCap) {
            this.identitiesPoisoned = true;
            let l = this.identitiesEvicted.values().next().value;
            if (l !== undefined) this.identitiesEvicted.delete(l);
          }
        }
      }
      r = new Map();
      this.identities.set(e, r);
    }
    r.set(n, s ? null : o);
  }
  takeIdentity(e, n) {
    if (e === undefined) return;
    let o = this.identities.get(e);
    let r = o?.get(n);
    if (o?.delete(n) && o.size === 0) this.identities.delete(e);
    return r;
  }
  consume(e, n, o = "write") {
    if (e === undefined) return;
    let r = this.lanes[o];
    let i = fileLaneKey(e, n);
    let s = r.get(i);
    let a = s === undefined && (this.evicted[o].delete(i) || this.poisoned[o]);
    let l = `${e}\x00`;
    for (let key of r.keys()) if (key.startsWith(l)) r.delete(key);
    if (o === "read") {
      this.identities.delete(e);
      this.identitiesEvicted.delete(e);
    }
    if (a) return PERMISSION_STASH_EVICTED_SYMBOL;
    return s;
  }
}
//@ chunk-ndmse9kj.js:46770-46808 placement
function fileLaneKey(e, n) {
  return `${e}\x00${n}`;
}
//@ chunk-ndmse9kj.js:46808-46860 placement
var NOPROJECTDIRECTORYERROR = "NoProjectDirectoryError";
var projectDirectoryErrorReporterSlot = new HostScoped(() => ({}));
//@ chunk-ndmse9kj.js:46860-46874 placement
var onProjectDirectoryError = () => {};
//@ chunk-ndmse9kj.js:46874-46894 placement
function setProjectDirectoryErrorHandler(e) {
  onProjectDirectoryError = e;
}
//@ chunk-ndmse9kj.js:46894-47009 placement
/**
 * 会话没有工作目录时抛出的错误（name = NoProjectDirectoryError）。
 */
class NoProjectDirectoryError extends Error {
  name = NOPROJECTDIRECTORYERROR;
  constructor() {
    super("This session has no working directory.");
    try {
      onProjectDirectoryError(this);
    } catch {}
  }
}
//@ chunk-ndmse9kj.js:47009-47084 placement
/**
 * 判断一个错误是否为 NoProjectDirectoryError（按 name 比较，异常时返回 false）。
 */
function isNoProjectDirectoryError(error) {
  try {
    return error instanceof Error && error.name === NOPROJECTDIRECTORYERROR;
  } catch {
    return false;
  }
}
//@ chunk-ndmse9kj.js:47084-47150 placement
/**
 * 取会话的 project；project 为 null 时抛 NoProjectDirectoryError。同文件另有 forkRootSessionWithProject 等派生辅助。
 */
function getSessionProject(session) {
  let { project } = session;
  if (project === null) throw new NoProjectDirectoryError();
  return project;
}
//@ chunk-ndmse9kj.js:47150-47266 placement
/**
 * 以 root 会话描述（host、id、parentId）和项目信息派生带项目的会话。
 */
function forkRootSessionWithProject(e) {
  return forkSessionWithProject(
    {
      kind: "root",
      host: e.host,
      id: e.id,
      parentId: e.parentId,
    },
    e.project,
    e.project?.isolationRoot,
  );
}
//@ chunk-ndmse9kj.js:47266-47521 placement
/**
 * 用新值覆盖旧的 originalCwd/projectRoot/cwd 三元组并规范化；三者都缺返回 null，只缺一部分抛 NoProjectDirectoryError。
 */
function mergeProjectDirs(project, n) {
  let originalCwd = n.originalCwd ?? project?.originalCwd;
  let projectRoot = n.projectRoot ?? project?.projectRoot;
  let cwd = n.cwd ?? project?.cwd;
  if (originalCwd === undefined && projectRoot === undefined && cwd === undefined) return null;
  if (originalCwd === undefined || projectRoot === undefined || cwd === undefined)
    throw new NoProjectDirectoryError();
  return {
    originalCwd: identity(originalCwd),
    projectRoot: identity(projectRoot),
    cwd: identity(cwd),
  };
}
//@ chunk-ndmse9kj.js:47521-50630 placement
/**
 * 以 withProject 方式派生会话，处理 fork/parentId 并拒绝无法重新标识的会话
 */
function forkSessionWithProject(e, n, o) {
  let r = {
    project: n === null ? null : mergeProjectDirs(null, n),
  };
  let i = o;
  let signal = createSignal();
  let observers = e.kind === "fork" ? e.root.observers : new SessionObservers();
  let autonomousLoopPreamble = e.kind === "fork" ? e.root.autonomousLoopPreamble : new AutonomousLoopSlice();
  let precompute = e.kind === "fork" ? e.root.precompute : new AgentSidecarSlice();
  let f = {
    get originalCwd() {
      return getSessionProject(r).originalCwd;
    },
    get projectRoot() {
      return getSessionProject(r).projectRoot;
    },
    get cwd() {
      return getSessionProject(r).cwd;
    },
    get isolationRoot() {
      return i;
    },
  };
  let S = {
    host: e.kind === "fork" ? e.root.host : e.host,
    get id() {
      return e.kind === "fork" ? e.root.id : e.id;
    },
    get parentId() {
      return e.kind === "fork" ? e.root.parentId : e.parentId;
    },
    get root() {
      return e.kind === "fork" ? e.root : S;
    },
    get project() {
      return r.project === null ? null : f;
    },
    observers,
    autonomousLoopPreamble,
    btwHistory: e.kind === "fork" ? e.root.btwHistory : new SideQuestionSlice(),
    ccrRecap: e.kind === "fork" ? e.root.ccrRecap : new TurnEndTaskSlice(),
    conversationLatches: e.kind === "fork" ? e.root.conversationLatches : new ConversationLatches(),
    costLedger: e.kind === "fork" ? e.root.costLedger : new CostLedger(),
    engineStore: e.kind === "fork" ? e.root.engineStore : new EngineStoreHolder(),
    usageCreditsOnlyModelConsentSlots:
      e.kind === "fork" ? e.root.usageCreditsOnlyModelConsentSlots : new UsageCreditsConsentSlots(),
    hookRegistry: e.kind === "fork" ? e.root.hookRegistry : new HookRegistry(),
    identity: e.kind === "fork" ? e.root.identity : new SessionIdentitySlice(),
    invokedSkills: e.kind === "fork" ? e.root.invokedSkills : new InvokedSkills(),
    mcpSessionWiring: e.kind === "fork" ? e.root.mcpSessionWiring : new McpSessionWiring(),
    modelSelection: e.kind === "fork" ? e.root.modelSelection : new ModelSelectionSlice(),
    promptAssembly: e.kind === "fork" ? e.root.promptAssembly : new PromptAssemblySlice(),
    promptSuggestion: e.kind === "fork" ? e.root.promptSuggestion : new TurnOfferSlice(),
    pendingHint: e.kind === "fork" ? e.root.pendingHint : new PendingOfferSlice(),
    pluginsSync: e.kind === "fork" ? e.root.pluginsSync : new CloudSyncSlice(),
    precompute,
    requestJournal: e.kind === "fork" ? e.root.requestJournal : new RequestJournal(),
    sessionCron: e.kind === "fork" ? e.root.sessionCron : new SessionCron(),
    sessionFlags: e.kind === "fork" ? e.root.sessionFlags : new SessionFlags(),
    sessionRefsGate: e.kind === "fork" ? e.root.sessionRefsGate : new CcrSessionLatchSlice(),
    sessionScratch: e.kind === "fork" ? e.root.sessionScratch : new SessionScratch(),
    surfaceCapabilities: e.kind === "fork" ? e.root.surfaceCapabilities : new SurfaceCapabilities(),
    userPresence: e.kind === "fork" ? e.root.userPresence : new UserPresence(),
    workflowUsageConsent: e.kind === "fork" ? e.root.workflowUsageConsent : new WorkflowUsageConsentFlag(),
    outsideReadPrompt: e.kind === "fork" ? e.root.outsideReadPrompt : new OpenToolUseQuestionSlice(),
    writePermissionStash: e.kind === "fork" ? e.root.writePermissionStash : new FileStateStashSlice(),
    subscribe(u) {
      let m = signal.subscribe(u);
      if (e.kind !== "fork") return m;
      let root = e.root;
      let { id, parentId } = root;
      let x = root.subscribe(() => {
        if (root.id === id && root.parentId === parentId) return;
        id = root.id;
        parentId = root.parentId;
        u();
      });
      return () => {
        m();
        x();
      };
    },
    setCwd(cwd) {
      S.update({
        project: {
          cwd,
        },
      });
    },
    setIsolationRoot(u) {
      if (u !== i) {
        i = u;
        signal.emit();
      }
    },
    withProject(u) {
      return forkSessionWithProject(
        {
          kind: "fork",
          root: S.root,
        },
        mergeProjectDirs(r.project, u),
        u.isolationRoot ?? i,
      );
    },
    update(u) {
      let m =
        u.project === undefined
          ? r.project
          : u.project === null
            ? null
            : mergeProjectDirs(r.project, u.project);
      let h = false;
      if (u.id !== undefined || "parentId" in u) {
        if (e.kind === "fork")
          throw Error(
            "A withProject fork cannot re-identify the session \u2014 update the root session instead",
          );
        if (u.id !== undefined && u.id !== e.id) {
          e.id = u.id;
          h = true;
        }
        if ("parentId" in u && u.parentId !== e.parentId) {
          e.parentId = u.parentId;
          h = true;
        }
      }
      if (
        m?.originalCwd !== r.project?.originalCwd ||
        m?.projectRoot !== r.project?.projectRoot ||
        m?.cwd !== r.project?.cwd
      ) {
        r.project = m;
        h = true;
      }
      let isolationRoot = u.project?.isolationRoot;
      if (isolationRoot !== undefined && isolationRoot !== i) {
        i = isolationRoot;
        h = true;
      }
      if (h) signal.emit();
    },
  };
  return S;
}
//@ chunk-ndmse9kj.js:50630-50850 placement
/**
 * 按会话根对象（WeakMap，键为 x.root）懒创建并缓存一份状态；of 取或建、peek 只取、drop 删除。被大量模块用作每会话单例。
 */
class SessionRootSlot {
  #e;
  #t = new WeakMap();
  constructor(e) {
    this.#e = e;
  }
  peek(e) {
    return this.#t.get(e.root);
  }
  of(e) {
    let root = e.root;
    let o = this.#t.get(root);
    if (o !== undefined) return o;
    let r = this.#e();
    this.#t.set(root, r);
    return r;
  }
  drop(e) {
    this.#t.delete(e.root);
  }
}
//@ chunk-ndmse9kj.js:50850-56668 placement
/**
 * 会话运行模式切片：交互/打印模式、输出格式、权限提示工具、受限工作区、客户端类型、会话启动类型等几十个私有字段的读写器。
 */
class RuntimeModeSlice {
  #e = false;
  #t = false;
  #n = false;
  #o = null;
  #r = false;
  #s = undefined;
  #i = false;
  #d = false;
  #u = false;
  #c = false;
  #l = undefined;
  #p = false;
  #h = false;
  #a = null;
  #g = null;
  #S = new Map();
  #y = "cli";
  #v = "fresh";
  #f = undefined;
  #m = false;
  #b = false;
  #k = [];
  #R = false;
  #x = false;
  #C = false;
  #P = new Set();
  #T = false;
  #w = false;
  #A = false;
  #L = false;
  #M = "none";
  #O = false;
  #F = false;
  #I = false;
  #E = false;
  #H = false;
  #B = undefined;
  #U = undefined;
  #j = undefined;
  #q = undefined;
  #N = undefined;
  #_ = undefined;
  #W = false;
  #G = false;
  #V = false;
  #K = null;
  #J = null;
  #z = true;
  #Q = null;
  #D = false;
  #oe = createSignal();
  #$ = null;
  #Y = false;
  #X = false;
  #Z = {};
  #ee = null;
  #te = "none";
  #ne = undefined;
  isInteractive() {
    return this.#e;
  }
  isInteractivityDecided() {
    return this.#t;
  }
  isNoDialogLaunch() {
    return this.#n;
  }
  markNoDialogLaunch() {
    this.#n = true;
  }
  replaceIsInteractive(e) {
    this.#e = e;
    this.#t = true;
  }
  printOutputFormat() {
    return this.#o;
  }
  replacePrintOutputFormat(e) {
    this.#o = e;
  }
  thinkingDisplayExplicit() {
    return this.#r;
  }
  replaceThinkingDisplayExplicit(e) {
    this.#r = e;
  }
  permissionPromptToolName() {
    return this.#s;
  }
  replacePermissionPromptToolName(e) {
    this.#s = e;
  }
  hasStreamingInput() {
    return this.#i;
  }
  replaceHasStreamingInput(e) {
    this.#i = e;
  }
  singleShotPrintSession() {
    return this.#d;
  }
  replaceSingleShotPrintSession(e) {
    this.#d = e;
  }
  printInputClosed() {
    return this.#u;
  }
  markPrintInputClosed() {
    this.#u = true;
  }
  modelOverrideOptOutForSession() {
    return this.#c;
  }
  replaceModelOverrideOptOutForSession(e) {
    this.#c = e;
  }
  rendererMode() {
    return this.#l;
  }
  replaceRendererMode(e) {
    this.#l = e;
  }
  strictToolResultPairing() {
    return this.#p;
  }
  replaceStrictToolResultPairing(e) {
    this.#p = e;
  }
  restrictedSession() {
    return this.#h;
  }
  replaceRestrictedSession(e) {
    this.#h = e;
  }
  workspaceRestrictionState() {
    return this.#a;
  }
  replaceWorkspaceRestrictionState(e) {
    this.#a = e;
  }
  replaceWorkspaceRestrictionUnsubscribe(e) {
    this.#g?.();
    this.#g = e;
  }
  restrictedWorkspaceRoots() {
    return this.#S;
  }
  addRestrictedWorkspaceRoot(e, n) {
    this.#S.set(e, n);
  }
  clearRestrictedWorkspaceRoots() {
    this.#S = new Map();
  }
  clientType() {
    return this.#y;
  }
  replaceClientType(e) {
    this.#y = e;
  }
  sessionStartType() {
    return this.#v;
  }
  replaceSessionStartType(e) {
    this.#v = e;
  }
  questionPreviewFormat() {
    return this.#f;
  }
  replaceQuestionPreviewFormat(e) {
    this.#f = e;
  }
  extendedQuestionsEnabled() {
    return this.#m;
  }
  replaceExtendedQuestionsEnabled(e) {
    this.#m = e;
  }
  questionOptionDescriptionsOptional() {
    return this.#b;
  }
  replaceQuestionOptionDescriptionsOptional(e) {
    this.#b = e;
  }
  replConfigArgv() {
    return this.#k;
  }
  replaceReplConfigArgv(e) {
    this.#k = e;
  }
  userMsgOptIn() {
    return this.#R;
  }
  replaceUserMsgOptIn(e) {
    this.#R = e;
  }
  searchToolsOptIn() {
    return this.#x;
  }
  replaceSearchToolsOptIn(e) {
    this.#x = e;
  }
  todoToolsOptIn() {
    return this.#C;
  }
  replaceTodoToolsOptIn(e) {
    this.#C = e;
  }
  toolsOmittedByLaunchList() {
    return this.#P;
  }
  replaceToolsOmittedByLaunchList(e) {
    this.#P = e;
  }
  wizardOperatorToolsEnabled() {
    return this.#T;
  }
  replaceWizardOperatorToolsEnabled(e) {
    this.#T = e;
  }
  runnerDeclaredNestedRepositoryDiff() {
    return this.#w;
  }
  replaceRunnerDeclaredNestedRepositoryDiff(e) {
    this.#w = e;
  }
  runnerDeclaredNoRepositoryCheckedOut() {
    return this.#A;
  }
  replaceRunnerDeclaredNoRepositoryCheckedOut(e) {
    this.#A = e;
  }
  runnerDeclaredFreshMachinePerSession() {
    return this.#L;
  }
  replaceRunnerDeclaredFreshMachinePerSession(e) {
    this.#L = e;
  }
  pollEventIngress() {
    return this.#M;
  }
  markPollEventIngress(e) {
    this.#M = e;
  }
  ownEventDeliveryRequested() {
    return this.#O && !this.#F;
  }
  replaceOwnEventDeliveryHeld(e) {
    this.#F = e;
  }
  markOwnEventDeliveryRequested() {
    this.#O = true;
  }
  sdkAgentProgressSummariesEnabled() {
    return this.#I;
  }
  replaceSdkAgentProgressSummariesEnabled(e) {
    this.#I = e;
  }
  sessionPersistenceDisabled() {
    return this.#E;
  }
  replaceSessionPersistenceDisabled(e) {
    this.#E = e;
  }
  diskless() {
    return this.#H;
  }
  replaceDiskless(e) {
    this.#H = e;
  }
  ccrSessionUrl() {
    return this.#B;
  }
  replaceCcrSessionUrl(e) {
    this.#B = e;
  }
  ccrDerivedSurface() {
    return this.#U;
  }
  replaceCcrDerivedSurface(e) {
    this.#U = e;
  }
  autoCompactWindowSurface() {
    return this.#q;
  }
  replaceAutoCompactWindowSurface(e) {
    this.#q = e;
  }
  entrypointOnRequests() {
    return this.#j;
  }
  replaceEntrypointOnRequests(e) {
    this.#j = e;
  }
  coworkEnrollment() {
    return this.#N;
  }
  replaceCoworkEnrollment(e) {
    this.#N = e;
  }
  toolsMachine() {
    return this.#_;
  }
  replaceToolsMachine(e) {
    this.#_ = e;
  }
  sessionBypassPermissionsMode() {
    return this.#W;
  }
  replaceSessionBypassPermissionsMode(e) {
    this.#W = e;
  }
  disableSlashCommands() {
    return this.#G;
  }
  replaceDisableSlashCommands(e) {
    this.#G = e;
  }
  disableFileMentions() {
    return this.#V;
  }
  replaceDisableFileMentions(e) {
    this.#V = e;
  }
  sessionUploadsDir() {
    return this.#K;
  }
  replaceSessionUploadsDir(e) {
    this.#K = e;
  }
  localUploadsRoot() {
    return this.#J;
  }
  replaceLocalUploadsRoot(e) {
    this.#J = e;
  }
  mayForwardHomeSettings() {
    return this.#z;
  }
  replaceMayForwardHomeSettings(e) {
    this.#z = e;
  }
  homeSettingsHostConsent() {
    return this.#Q;
  }
  replaceHomeSettingsHostConsent(e) {
    this.#Q = e;
  }
  scheduledTasksEnabled() {
    return this.#D;
  }
  replaceScheduledTasksEnabled(e) {
    let n = e && !this.#D;
    this.#D = e;
    if (n) this.#oe.emit();
  }
  onScheduledTasksEnabled(e) {
    return this.#oe.subscribe(e);
  }
  initJsonSchema() {
    return this.#$;
  }
  replaceInitJsonSchema(e) {
    this.#$ = e;
  }
  cliSessionConfigCarried() {
    return this.#Y;
  }
  replaceCliSessionConfigCarried(e) {
    this.#Y = e;
  }
  forkRestrictedLaunchConfig() {
    return this.#X;
  }
  replaceForkRestrictedLaunchConfig(e) {
    this.#X = e;
  }
  forkReplayLaunchConfig() {
    return this.#Z;
  }
  spareClaimState() {
    return this.#te;
  }
  replaceSpareClaimState(e) {
    this.#te = e;
  }
  spareParkedAtMs() {
    return this.#ne;
  }
  replaceSpareParkedAtMs(e) {
    this.#ne = e;
  }
  replaceForkReplayLaunchConfig(e) {
    this.#Z = e;
  }
  projectConfigRoot() {
    return this.#ee;
  }
  replaceProjectConfigRoot(e) {
    this.#ee = e;
  }
  reset() {
    this.#e = false;
    this.#t = false;
    this.#n = false;
    this.#o = null;
    this.#te = "none";
    this.#ne = undefined;
    this.#r = false;
    this.#s = undefined;
    this.#i = false;
    this.#d = false;
    this.#u = false;
    this.#c = false;
    this.#l = undefined;
    this.#p = false;
    this.#h = false;
    this.#a = null;
    this.replaceWorkspaceRestrictionUnsubscribe(null);
    this.#S = new Map();
    this.#y = "cli";
    this.#v = "fresh";
    this.#f = undefined;
    this.#m = false;
    this.#b = false;
    this.#k = [];
    this.#R = false;
    this.#x = false;
    this.#C = false;
    this.#P = new Set();
    this.#T = false;
    this.#w = false;
    this.#A = false;
    this.#L = false;
    this.#M = "none";
    this.#O = false;
    this.#F = false;
    this.#I = false;
    this.#E = false;
    this.#H = false;
    this.#B = undefined;
    this.#U = undefined;
    this.#q = undefined;
    this.#j = undefined;
    this.#N = undefined;
    this.#_ = undefined;
    this.#W = false;
    this.#G = false;
    this.#V = false;
    this.#K = null;
    this.#J = null;
    this.#z = true;
    this.#Q = null;
    this.#D = false;
    this.#$ = null;
    this.#Y = false;
    this.#X = false;
    this.#Z = {};
    this.#ee = null;
  }
}
//@ chunk-ndmse9kj.js:56668-57999 placement
/**
 * 设置来源切片：--settings 路径/内联内容、agents 与 MCP 配置文件、父进程托管设置、允许的设置来源（缓存去掉 project/local 的版本）、cowork 插件开关。
 */
class SettingsSourcesSlice {
  #e = undefined;
  #t = [];
  #n = [];
  #o = undefined;
  #r = undefined;
  #s = null;
  #i = null;
  #d = false;
  #u = null;
  #c = getDefaultSettingSources();
  #l = null;
  #p = false;
  flagSettingsPath() {
    return this.#e;
  }
  replaceFlagSettingsPath(e) {
    this.#e = e;
  }
  flagAgentsFilePaths() {
    return this.#t;
  }
  replaceFlagAgentsFilePaths(e) {
    this.#t = e;
  }
  flagMcpConfigFilePaths() {
    return this.#n;
  }
  replaceFlagMcpConfigFilePaths(e) {
    this.#n = e;
  }
  flagSettingsExpectedContent() {
    return this.#o;
  }
  replaceFlagSettingsExpectedContent(e) {
    this.#o = e;
  }
  flagSettingsFilePinnedContent() {
    return this.#r;
  }
  replaceFlagSettingsFilePinnedContent(e) {
    this.#r = e;
  }
  flagSettingsInline() {
    return this.#s;
  }
  replaceFlagSettingsInline(e) {
    this.#s = e;
  }
  parentManagedSettings() {
    return this.#i;
  }
  replaceParentManagedSettings(e, n = null) {
    this.#i = e;
    this.#u = n;
  }
  parentManagedSettingsInvalid() {
    return this.#d;
  }
  replaceParentManagedSettingsInvalid(e) {
    this.#d = e;
  }
  parentOrganizationSettings() {
    return this.#u;
  }
  allowedSettingSources() {
    return this.#c;
  }
  replaceAllowedSettingSources(e) {
    this.#c = e;
  }
  allowedSettingSourcesWithoutRepoDirSources() {
    let e = this.#c;
    if (this.#l?.of !== e)
      this.#l = {
        of: e,
        result: e.filter((n) => n !== "projectSettings" && n !== "localSettings"),
      };
    return this.#l.result;
  }
  useCoworkPlugins() {
    return this.#p;
  }
  replaceUseCoworkPlugins(e) {
    this.#p = e;
  }
  reset() {
    this.#e = undefined;
    this.#t = [];
    this.#n = [];
    this.#o = undefined;
    this.#r = undefined;
    this.#s = null;
    this.#i = null;
    this.#d = false;
    this.#u = null;
    this.#c = getDefaultSettingSources();
    this.#l = null;
    this.#p = false;
  }
}
//@ chunk-ndmse9kj.js:57999-58102 placement
function getDefaultSettingSources() {
  return ["userSettings", "projectSettings", "localSettings", "flagSettings", "policySettings"];
}
//@ chunk-ndmse9kj.js:58102-59828 placement
/**
 * 插件与通道切片：内联插件/URL、同步插件目录及其签名与行 id、官方市场认证（按签名过滤）、CLAUDE.md 附加目录、允许的通道、会话技能白名单、Chrome 开关、队友 agentId。
 */
class PluginsAndChannelsSlice {
  #e = [];
  #t = [];
  #n = [];
  #o = undefined;
  #r = new Map();
  #s = new Map();
  #i = new Map();
  #d = [];
  #u = undefined;
  #c = [];
  #l = false;
  #p = undefined;
  #h = undefined;
  #a = undefined;
  inlinePlugins() {
    return this.#e;
  }
  replaceInlinePlugins(e) {
    this.#e = e;
  }
  inlinePluginsNoMcp() {
    return this.#t;
  }
  replaceInlinePluginsNoMcp(e) {
    this.#t = e;
  }
  inlinePluginUrls() {
    return this.#n;
  }
  replaceInlinePluginUrls(e) {
    this.#n = e;
  }
  syncedPluginDirs() {
    return this.#o ?? [];
  }
  syncedPluginDirsRegistered() {
    return this.#o !== undefined;
  }
  syncedPluginAttestation(e) {
    return this.#r.get(e);
  }
  syncedPluginRowId(e) {
    return this.#s.get(e);
  }
  replaceSyncedPluginDirs(e, n = new Map(), o = new Map()) {
    this.#o = e;
    this.#r = n;
    this.#s = o;
    this.#i = this.#g(this.#i);
  }
  clearSyncedPluginDirs() {
    this.#o = undefined;
    this.#r = new Map();
    this.#s = new Map();
    this.#i = new Map();
  }
  attestedOfficialPluginMarketplace(e) {
    return this.#i.get(e);
  }
  replaceAttestedOfficialPluginIds(e) {
    this.#i = this.#g(e);
  }
  #g(e) {
    let n = new Set([...this.#r.values()].map((o) => `${o.pluginName}@${o.marketplace}`));
    return new Map([...e].filter(([o, r]) => n.has(`${o.slice(0, o.lastIndexOf("@"))}@${r}`)));
  }
  additionalDirectoriesForClaudeMd() {
    return this.#d;
  }
  replaceAdditionalDirectoriesForClaudeMd(e) {
    this.#d = e;
  }
  claudeMdAdditionalDirectoriesAsked() {
    return this.#u;
  }
  askClaudeMdAdditionalDirectories(e) {
    this.#u = e;
  }
  allowedChannels() {
    return this.#c;
  }
  replaceAllowedChannels(e) {
    this.#c = e;
  }
  hasDevChannels() {
    return this.#l;
  }
  replaceHasDevChannels(e) {
    this.#l = e;
  }
  sessionSkillAllowlist() {
    return this.#p;
  }
  replaceSessionSkillAllowlist(e) {
    this.#p = e;
  }
  chromeFlagOverride() {
    return this.#h;
  }
  replaceChromeFlagOverride(e) {
    this.#h = e;
  }
  teammateAgentId() {
    return this.#a;
  }
  replaceTeammateAgentId(e) {
    this.#a = e;
  }
  reset() {
    this.#e = [];
    this.#t = [];
    this.#n = [];
    this.clearSyncedPluginDirs();
    this.#d = [];
    this.#u = undefined;
    this.#c = [];
    this.#l = false;
    this.#p = undefined;
    this.#h = undefined;
    this.#a = undefined;
  }
}
//@ chunk-ndmse9kj.js:59828-60202 placement
/**
 * 模型字符串缓存与第三方管理员引导快照、探测否定的文档默认值。
 */
class ModelStringsSlice {
  #e = null;
  #t = null;
  #n = new Set();
  modelStrings() {
    return this.#e;
  }
  replaceModelStrings(e) {
    this.#e = e;
  }
  invalidate() {
    this.#e = null;
    this.#n = new Set();
  }
  admin3PSteeringSnapshot() {
    return this.#t;
  }
  recordAdmin3PSteeringSnapshot(e) {
    this.#t = e;
  }
  probeRefutedDocumentDefaults() {
    return this.#n;
  }
  recordProbeRefutedDocumentDefault(e) {
    this.#n.add(e);
  }
  reset() {
    this.#e = null;
    this.#t = null;
    this.#n = new Set();
  }
}
//@ chunk-ndmse9kj.js:60202-60212 placement
var EMPTY_DIAGNOSTICS_LIST = [];
//@ chunk-ndmse9kj.js:60212-60743 placement
/**
 * 诊断切片：错误日志（最多 100 条）、慢操作（10 秒过期）、开发栏告警（60 秒过期）。
 */
class DiagnosticsSlice {
  #e = [];
  #t = [];
  #n = undefined;
  errorLog() {
    return this.#e;
  }
  recordError(e) {
    if (this.#e.length >= 100) this.#e.shift();
    this.#e.push(e);
  }
  recordSlowOperation(e, n) {
    return;
  }
  slowOperations() {
    if (this.#t.length === 0) return EMPTY_DIAGNOSTICS_LIST;
    let now = Date.now();
    if (this.#t.some((n) => now - n.timestamp >= 1e4)) {
      this.#t = this.#t.filter((n) => now - n.timestamp < 1e4);
      if (this.#t.length === 0) return EMPTY_DIAGNOSTICS_LIST;
    }
    return this.#t;
  }
  recordDevBarAlert(e) {
    return;
  }
  devBarAlert() {
    let e = this.#n;
    if (e && Date.now() - e.timestamp >= 60000) {
      this.#n = undefined;
      return;
    }
    return e;
  }
  reset() {
    this.#e = [];
    this.#t = [];
    this.#n = undefined;
  }
}
//@ chunk-ndmse9kj.js:60743-60755 placement
/**
 * 诊断切片里错误日志最多保留 100 条，超出丢最旧。
 */
var MAX_DIAGNOSTIC_ERRORS = 100;
export {
  SessionRootSlot,
  isVirtualConversationMessage,
  isSystemLocalCommandMessage,
  isNonConversationMessage,
  isSyntheticModelApiErrorMessage,
  isNoProjectDirectoryError,
  NoProjectDirectoryError,
  getSessionProject,
  PERMISSION_STASH_EVICTED_SYMBOL,
  agentIdOrDefault,
  checkCompactBoundaryCoverage,
  recordVetoForLastPrompt,
  createCompactSeenState,
  findLastHumanPromptUuid,
  mergeProjectDirs,
  RuntimeModeSlice,
  SettingsSourcesSlice,
  PluginsAndChannelsSlice,
  ModelStringsSlice,
  DiagnosticsSlice,
  forkRootSessionWithProject,
  setProjectDirectoryErrorHandler,
  projectDirectoryErrorReporterSlot,
  MAX_DIAGNOSTIC_ERRORS,
};
