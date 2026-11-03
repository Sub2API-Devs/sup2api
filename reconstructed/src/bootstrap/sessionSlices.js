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
import { Mr } from "../utils/agentId.js";
import { createSignal } from "../utils/signal.js";
import { HostScoped } from "../utils/hostScoped.js";
import { Mn } from "../utils/pathClassification.js";
import {
  D,
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
  k,
  C,
  ManagedDocumentLinks,
  unlatchStickyBetaLatches,
  ManagedFileProtections,
  RepoTierFreeze,
  E,
  ToolsUsedSet,
} from "./stateSlices.js";
import { A } from "../utils/sessionUrl.js";
import { isStorageV5Enabled } from "../utils/hoverRest.js";

//@ chunk-ndmse9kj.js:36671-36750 placement
function jb(e) {
  return (e.type === "user" || e.type === "assistant") && e.isVirtual === !0;
}
//@ chunk-ndmse9kj.js:36750-36843 placement
function Pre(e) {
  return e.type === "assistant" && e.isApiErrorMessage === !0 && e.message?.model === SYNTHETIC_MODEL;
}
//@ chunk-ndmse9kj.js:36843-36912 placement = isSystemLocalCommandMessage (1)
function isSystemLocalCommandMessage(message) {
  return message.type === "system" && message.subtype === "local_command";
}
/**
 * 判断消息是否不属于发给 API 的对话内容：progress、非本地命令的 system、若干内部附件（thinking_drop、credential_org、prompt_snapshot、prompt_render_point、deferred_tools_record）等返回 true；api_system 返回 false。
 */
//@ chunk-ndmse9kj.js:36912-37262 placement
function isNonConversationMessage(e) {
  if (e.type === "api_system") return !1;
  return (
    e.type === "progress" ||
    (e.type === "system" && !isSystemLocalCommandMessage(e)) ||
    jb(e) ||
    Pre(e) ||
    (e.type === "attachment" &&
      (e.attachment?.type === "thinking_drop" ||
        e.attachment?.type === "credential_org" ||
        e.attachment?.type === "prompt_snapshot" ||
        e.attachment?.type === "prompt_render_point" ||
        e.attachment?.type === "deferred_tools_record"))
  );
}
//@ chunk-ndmse9kj.js:37262-37361 placement
var yt = ["sdk_single_prompt_gate", "subagent_estimate", "subagent_final_turn", "rows_unreadable"],
  vt = 8;
/**
 * 会话状态切片：按 agentId 记录侧车状态、尝试次数、计数失败、否决记录、arm-gate 事件去重，并串行化侧车读写（enqueueSidecarIo）与预读缓存（有上限）。
 */
//@ chunk-ndmse9kj.js:37361-39133 placement
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
    return (this.attemptsByAgent.set(e, n), n);
  }
  consecutiveCountedFailures(e) {
    return this.cappedFailuresByAgent.get(e) ?? 0;
  }
  recordCountedFailure(e) {
    let n = (this.cappedFailuresByAgent.get(e) ?? 0) + 1;
    return (this.cappedFailuresByAgent.set(e, n), n);
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
    if (this.armGateEventEmitted.has(e)) return !1;
    return (this.armGateEventEmitted.add(e), !0);
  }
  enqueueSidecarIo(e, n) {
    return ((this.sidecarIo = this.sidecarIo.then(e, e).catch(n)), this.sidecarIo);
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
    while (this.sidecarReadsAhead.size >= vt) {
      let o = this.sidecarReadsAhead.keys().next().value;
      if (o === void 0) break;
      this.sidecarReadsAhead.delete(o);
    }
    this.sidecarReadsAhead.set(e, n);
  }
  takeSidecarReadAhead(e) {
    let n = this.sidecarReadsAhead.get(e);
    return (this.sidecarReadsAhead.delete(e), n);
  }
  dropSidecarReadAhead(e) {
    this.sidecarReadsAhead.delete(e);
  }
  forgetSubagentTelemetry(e) {
    (this.attemptsByAgent.delete(e), this.cappedFailuresByAgent.delete(e), this.vetoedUnderPrompt.delete(e));
    for (let n of yt) this.armGateEventEmitted.delete(`${e}:${n}`);
  }
}
//@ chunk-ndmse9kj.js:39133-39166 placement
function Oje(e) {
  return e ?? "main";
}
/**
 * 由消息列表与行 uuid 生成预计算压缩的游标状态 {lastUuid, seenUuids, rowUuids}。
 */
//@ chunk-ndmse9kj.js:39166-39274 placement
function createCompactSeenState({ messages: messages, rowUuids: rowUuids }, o) {
  return { lastUuid: o, seenUuids: new Set(messages.map((r) => r.uuid)), rowUuids: rowUuids };
}
/**
 * 校验压缩边界：边界 uuid、被覆盖消息、保留消息是否仍一致，不一致时拒绝
 */
//@ chunk-ndmse9kj.js:39274-40544 placement
function checkCompactBoundaryCoverage({
  coverage: coverage,
  kept: kept,
  sent: sent,
  received: received,
  instructions: instructions,
  fit: fit,
}) {
  let a = ({ uuid: uuid }) => coverage.seenUuids.has(uuid),
    l = new Set(sent.messages.map((message) => message.uuid));
  if (!l.has(coverage.lastUuid)) return { kind: "refuse", reason: "boundary_uuid_missing" };
  if (!coverage.rowUuids.every((rowUuid) => l.has(rowUuid)))
    return { kind: "refuse", reason: "covered_messages_changed" };
  if (kept.some((d) => a(d) && !l.has(d.uuid))) return { kind: "refuse", reason: "kept_message_missing" };
  if (
    sent.messages
      .slice(0, sent.messages.findLastIndex(a))
      .some((d) => d.type === "assistant" && !jb(d) && !a(d))
  )
    return { kind: "refuse", reason: "unseen_reply" };
  let sliced = sent.rowUuids.slice(0, sent.rowUuids.findLastIndex((d) => coverage.seenUuids.has(d)) + 1);
  if (
    instructions ||
    !received.messages.some(({ uuid: uuid }) => uuid === coverage.lastUuid) ||
    !We(received.rowUuids, sliced)
  )
    return { kind: "refuse", reason: "hook_rewrite" };
  let lastIndex = received.messages.findLastIndex(a),
    flattened = received.messages.flatMap((message, w) =>
      message.type === "progress" || a(message) ? [] : [{ message: message, isEarly: w < lastIndex }],
    ),
    m = ({ message: message, isEarly: isEarly }) => isEarly && jb(message),
    h = new Set(flattened.filter(m).map(({ message: message }) => message)),
    filtered = flattened.filter((d) => !m(d)),
    mapped = filtered.map(({ message: message }) => message),
    x =
      fit &&
      evaluateCompactSwap(
        fit,
        received.messages.filter((message) => !h.has(message)),
        [...kept, ...mapped],
      );
  if (x?.givesWay) return { kind: "refuse", reason: "would_not_fit", sizes: x.sizes };
  return {
    kind: "reuse",
    tail: mapped,
    earlyTailCount: count(filtered, ({ isEarly: isEarly }) => isEarly),
    displayOnlyLeftOutCount: h.size,
    headReordered: !We(received.rowUuids, coverage.rowUuids),
    sizes: x?.sizes,
  };
}
/**
 * 估算用压缩结果替换后的 token 数（postSwapTokens），并判断是否应让位（超过阈值且压缩来源小于窗口）。
 */
//@ chunk-ndmse9kj.js:40544-40928 placement
function evaluateCompactSwap(
  {
    thresholdTokens: thresholdTokens,
    windowTokens: windowTokens,
    liveTokens: liveTokens,
    madeFromTokens: madeFromTokens,
    summary: summary,
    sizeOf: sizeOf,
  },
  a,
  l,
) {
  let p = new Set(l.map((g) => g.uuid)),
    f = new Set(a.map((g) => g.uuid)),
    filtered = a.filter((g) => !p.has(g.uuid)),
    filtered_2 = a.filter((g) => p.has(g.uuid)),
    filtered_3 = l.filter((g) => !f.has(g.uuid)),
    h = Math.max(liveTokens - sizeOf(filtered), sizeOf(filtered_2)) + sizeOf([...summary, ...filtered_3]);
  return {
    sizes: { postSwapTokens: h, thresholdTokens: thresholdTokens, windowTokens: windowTokens },
    givesWay: h >= thresholdTokens && madeFromTokens < windowTokens,
  };
}
//@ chunk-ndmse9kj.js:40928-40977 placement
function We(e, n) {
  return n.every((o, r) => e[r] === o);
}
/**
 * 找最后一条真实用户输入（非 meta、非工具结果）的 uuid。
 */
//@ chunk-ndmse9kj.js:40977-41173 placement = isHumanTurn (0.802)
function findLastHumanPromptUuid(m) {
  return (
    m.findLast(
      (o) =>
        o.type === "user" &&
        !o.isMeta &&
        o.toolUseResult === void 0 &&
        (typeof o.message.content === "string" || !o.message.content.some((r) => r.type === "tool_result")),
    )?.uuid ?? ""
  );
}
//@ chunk-ndmse9kj.js:41173-41221 placement
function recordVetoForLastPrompt(e, n, o) {
  e.recordVeto(Oje(n), findLastHumanPromptUuid(o));
}
//@ chunk-ndmse9kj.js:41221-41289 placement
class re {
  #e = void 0;
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
    return ((this.#e ??= Mr(e)), this.#e);
  }
  projectDir() {
    return this.#t;
  }
  replaceProjectDir(e) {
    this.#t = e;
  }
}
/**
 * 会话状态切片：记录当前打开的工具调用 id 与本会话是否已回答，用于防止同一问题在别处重复打开。
 */
//@ chunk-ndmse9kj.js:41420-41740 placement
class OpenToolUseQuestionSlice {
  openToolUseId;
  answeredThisSession = !1;
  get answered() {
    return this.answeredThisSession;
  }
  markAnswered() {
    this.answeredThisSession = !0;
  }
  isOpenElsewhere(e) {
    return this.openToolUseId !== void 0 && this.openToolUseId !== e;
  }
  open(e) {
    this.openToolUseId = e;
  }
  closeFor(e) {
    if (e !== void 0 && this.openToolUseId === e) this.openToolUseId = void 0;
  }
}
//@ chunk-ndmse9kj.js:41740-41817 placement
class ae {
  granted = !1;
  isGranted() {
    return this.granted;
  }
  grant() {
    this.granted = !0;
  }
}
//@ chunk-ndmse9kj.js:41817-41938 placement
class TurnEndTaskSlice {
  inFlight = null;
  startedForTurnEnd = !1;
  reset() {
    (this.inFlight?.abort(), (this.inFlight = null), (this.startedForTurnEnd = !1));
  }
}
/**
 * 会话状态切片：云同步（账号列表、同步错误、重载保持计数、同步目录、待删回收站条目、缺失条目重同步、设置安装）的运行时状态。
 */
//@ chunk-ndmse9kj.js:41938-42648 placement
class CloudSyncSlice {
  firstSyncPromise = null;
  accountListing = "pending";
  syncErrors = [];
  lastRoundListed = !1;
  listedStamp = null;
  changesLanded = 0;
  changesReloaded = 0;
  reloadsCompleted = 0;
  holdsSet = 0;
  reloadHeld = !1;
  lastCompleteList = null;
  lastSyncedLaneLoad = null;
  syncedLaneOpened = !1;
  syncedDirsLoadedHere = new Set();
  dirsNewHere = new Set();
  awaitsFirstRun = !1;
  removalsDeferredHere = new Set();
  pendingTrashRemovals = [];
  ensureBucketRoot = null;
  deferredRelist = null;
  missingEntry = { resync: null, resyncAt: -1 / 0, swept: !1 };
  settingsInstall = { current: null, next: null, loaded: null };
  holdReload() {
    ((this.reloadHeld = !0), this.holdsSet++);
  }
  endHoldSetBefore(e) {
    this.reloadHeld &&= this.holdsSet !== e;
  }
  reloaded(e) {
    ((this.changesReloaded = Math.max(this.changesReloaded, e)), this.reloadsCompleted++);
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
    (this.abortController?.abort(), (this.abortController = null));
  }
  arm() {
    let abortController = new AbortController();
    return ((this.abortController = abortController), abortController);
  }
}
//@ chunk-ndmse9kj.js:42875-43034 placement
class CcrSessionLatchSlice {
  #e = void 0;
  #t = void 0;
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
    return ((this.#t = e), e);
  }
}
//@ chunk-ndmse9kj.js:43034-43178 placement
class AutonomousLoopSlice {
  autonomousPreambleDelivered = !1;
  lastLoopFileDelivered = null;
  reset() {
    ((this.autonomousPreambleDelivered = !1), (this.lastLoopFileDelivered = null));
  }
}
/**
 * 会话状态切片：旁路提问的问答记录（最多 20 条）、待重新打开的请求（多个拥有者）、重新打开回调和进行中的问题栈。
 */
//@ chunk-ndmse9kj.js:43178-44268 placement
class SideQuestionSlice {
  exchanges = [];
  replace(e) {
    this.exchanges = e;
  }
  append(e, n, o, r) {
    this.exchanges = [
      ...this.exchanges,
      { question: e, response: n, ...(o && { fallbackNotice: o }), ...(r && { agentId: r }) },
    ].slice(-20);
  }
  pendingReopen = null;
  reopenAway = !1;
  get reopenPending() {
    return this.pendingReopen !== null;
  }
  armReopen(e, n) {
    if (this.pendingReopen) {
      this.pendingReopen.owners.add(e);
      return;
    }
    this.pendingReopen = { owners: new Set([e]), cancel: n() };
  }
  clearPendingReopen(e) {
    let pendingReopen = this.pendingReopen;
    if (!pendingReopen) {
      this.reopenAway = !1;
      return;
    }
    if (e !== void 0) {
      if ((pendingReopen.owners.delete(e), pendingReopen.owners.size > 0)) return;
    }
    (pendingReopen.cancel(), (this.pendingReopen = null), (this.reopenAway = !1));
  }
  reopener = null;
  setReopener(e) {
    this.reopener = e;
  }
  get hasReopener() {
    return this.reopener !== null;
  }
  reopenNow() {
    return this.reopener?.() ?? !1;
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
var kt = 16;
/**
 * 会话状态切片：一次性提议（pending/shown）与已提交项队列，带 subscribe/getSnapshot 供 useSyncExternalStore 订阅。
 */
//@ chunk-ndmse9kj.js:44278-44876 placement
class PendingOfferSlice {
  pending = null;
  shownThisSession = !1;
  changed = createSignal();
  submitted = [];
  submittedChanged = createSignal();
  subscribe = this.changed.subscribe;
  getSnapshot = () => this.pending;
  subscribeSubmitted = this.submittedChanged.subscribe;
  submit(e) {
    if (this.shownThisSession) return;
    if (this.submitted.length >= kt) this.submitted.shift();
    (this.submitted.push(e), this.submittedChanged.emit());
  }
  takeSubmitted() {
    let submitted = this.submitted;
    return ((this.submitted = []), submitted);
  }
  offer(e) {
    if (this.shownThisSession) return;
    ((this.pending = e), this.changed.emit());
  }
  dismiss() {
    if (this.pending !== null) ((this.pending = null), this.changed.emit());
  }
  markShown() {
    this.shownThisSession = !0;
  }
}
//@ chunk-ndmse9kj.js:44876-44919 placement
var BMe = Symbol("permission-stash-evicted");
/**
 * 会话状态切片：按读/写两条通道暂存文件状态（容量上限、淘汰集合、溢出后标记 poisoned），并按会话记录文件 dev/ino 身份，consume 时清理前缀并返回被淘汰标记。
 */
//@ chunk-ndmse9kj.js:44919-46770 placement
class FileStateStashSlice {
  entriesCap;
  evictedKeysCap;
  lanes = { write: new Map(), read: new Map() };
  evicted = { write: new Set(), read: new Set() };
  poisoned = { write: !1, read: !1 };
  identities = new Map();
  identitiesEvicted = new Set();
  identitiesPoisoned = !1;
  constructor(e = 256, n = 1048576) {
    this.entriesCap = e;
    this.evictedKeysCap = n;
  }
  stash(e, n, o, r = "write") {
    if (e === void 0) return;
    let i = this.lanes[r],
      s = this.evicted[r],
      a = fe(e, n);
    if (s.has(a)) return;
    let l = i.get(a);
    if (l !== void 0) {
      let p = new Set(o);
      i.set(
        a,
        l.filter((f) => p.has(f)),
      );
      return;
    }
    if (i.size >= this.entriesCap) {
      let p = i.keys().next().value;
      if (p !== void 0) {
        if ((i.delete(p), s.add(p), s.size > this.evictedKeysCap)) {
          this.poisoned[r] = !0;
          let f = s.values().next().value;
          if (f !== void 0) s.delete(f);
        }
      }
    }
    i.set(a, o);
  }
  holds(e, n, o = "write") {
    return e !== void 0 && this.lanes[o].has(fe(e, n));
  }
  stashIdentity(e, n, o) {
    if (e === void 0) return;
    let r = this.identities.get(e),
      i = r?.get(n);
    if (r !== void 0 && i !== void 0) {
      if (i === null || o === null || i.dev !== o.dev || i.ino !== o.ino) r.set(n, null);
      return;
    }
    let s = this.identitiesEvicted.has(e) || this.identitiesPoisoned;
    if (r === void 0) {
      if (!s && this.identities.size >= this.entriesCap) {
        let a = this.identities.keys().next().value;
        if (a !== void 0) {
          if (
            (this.identities.delete(a),
            this.identitiesEvicted.add(a),
            this.identitiesEvicted.size > this.evictedKeysCap)
          ) {
            this.identitiesPoisoned = !0;
            let l = this.identitiesEvicted.values().next().value;
            if (l !== void 0) this.identitiesEvicted.delete(l);
          }
        }
      }
      ((r = new Map()), this.identities.set(e, r));
    }
    r.set(n, s ? null : o);
  }
  takeIdentity(e, n) {
    if (e === void 0) return;
    let o = this.identities.get(e),
      r = o?.get(n);
    if (o?.delete(n) && o.size === 0) this.identities.delete(e);
    return r;
  }
  consume(e, n, o = "write") {
    if (e === void 0) return;
    let r = this.lanes[o],
      i = fe(e, n),
      s = r.get(i),
      a = s === void 0 && (this.evicted[o].delete(i) || this.poisoned[o]),
      l = `${e}\x00`;
    for (let p of r.keys()) if (p.startsWith(l)) r.delete(p);
    if (o === "read") (this.identities.delete(e), this.identitiesEvicted.delete(e));
    if (a) return BMe;
    return s;
  }
}
//@ chunk-ndmse9kj.js:46770-46808 placement
function fe(e, n) {
  return `${e}\x00${n}`;
}
//@ chunk-ndmse9kj.js:46808-46860 placement
var NOPROJECTDIRECTORYERROR = "NoProjectDirectoryError",
  Ve = new HostScoped(() => ({}));
//@ chunk-ndmse9kj.js:46860-46874 placement
var Ke = () => {};
//@ chunk-ndmse9kj.js:46874-46894 placement
function Je(e) {
  Ke = e;
}
/**
 * 会话没有工作目录时抛出的错误（name = NoProjectDirectoryError）。
 */
//@ chunk-ndmse9kj.js:46894-47009 placement
class NoProjectDirectoryError extends Error {
  name = NOPROJECTDIRECTORYERROR;
  constructor() {
    super("This session has no working directory.");
    try {
      Ke(this);
    } catch {}
  }
}
//@ chunk-ndmse9kj.js:47009-47084 placement
function cke(e) {
  try {
    return e instanceof Error && e.name === NOPROJECTDIRECTORYERROR;
  } catch {
    return !1;
  }
}
//@ chunk-ndmse9kj.js:47084-47150 placement
function xo(e) {
  let { project: project } = e;
  if (project === null) throw new NoProjectDirectoryError();
  return project;
}
/**
 * 以 root 会话描述（host、id、parentId）和项目信息派生带项目的会话。
 */
//@ chunk-ndmse9kj.js:47150-47266 placement
function forkRootSessionWithProject(e) {
  return forkSessionWithProject(
    { kind: "root", host: e.host, id: e.id, parentId: e.parentId },
    e.project,
    e.project?.isolationRoot,
  );
}
/**
 * 用新值覆盖旧的 originalCwd/projectRoot/cwd 三元组并规范化；三者都缺返回 null，只缺一部分抛 NoProjectDirectoryError。
 */
//@ chunk-ndmse9kj.js:47266-47521 placement
function mergeProjectDirs(e, n) {
  let o = n.originalCwd ?? e?.originalCwd,
    r = n.projectRoot ?? e?.projectRoot,
    i = n.cwd ?? e?.cwd;
  if (o === void 0 && r === void 0 && i === void 0) return null;
  if (o === void 0 || r === void 0 || i === void 0) throw new NoProjectDirectoryError();
  return { originalCwd: Mn(o), projectRoot: Mn(r), cwd: Mn(i) };
}
/**
 * 以 withProject 方式派生会话，处理 fork/parentId 并拒绝无法重新标识的会话
 */
//@ chunk-ndmse9kj.js:47521-50630 placement
function forkSessionWithProject(e, n, o) {
  let r = { project: n === null ? null : mergeProjectDirs(null, n) },
    i = o,
    s = createSignal(),
    a = e.kind === "fork" ? e.root.observers : new D(),
    l = e.kind === "fork" ? e.root.autonomousLoopPreamble : new AutonomousLoopSlice(),
    p = e.kind === "fork" ? e.root.precompute : new AgentSidecarSlice(),
    f = {
      get originalCwd() {
        return xo(r).originalCwd;
      },
      get projectRoot() {
        return xo(r).projectRoot;
      },
      get cwd() {
        return xo(r).cwd;
      },
      get isolationRoot() {
        return i;
      },
    },
    S = {
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
      observers: a,
      autonomousLoopPreamble: l,
      btwHistory: e.kind === "fork" ? e.root.btwHistory : new SideQuestionSlice(),
      ccrRecap: e.kind === "fork" ? e.root.ccrRecap : new TurnEndTaskSlice(),
      conversationLatches: e.kind === "fork" ? e.root.conversationLatches : new ConversationLatches(),
      costLedger: e.kind === "fork" ? e.root.costLedger : new CostLedger(),
      engineStore: e.kind === "fork" ? e.root.engineStore : new re(),
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
      precompute: p,
      requestJournal: e.kind === "fork" ? e.root.requestJournal : new RequestJournal(),
      sessionCron: e.kind === "fork" ? e.root.sessionCron : new SessionCron(),
      sessionFlags: e.kind === "fork" ? e.root.sessionFlags : new SessionFlags(),
      sessionRefsGate: e.kind === "fork" ? e.root.sessionRefsGate : new CcrSessionLatchSlice(),
      sessionScratch: e.kind === "fork" ? e.root.sessionScratch : new SessionScratch(),
      surfaceCapabilities: e.kind === "fork" ? e.root.surfaceCapabilities : new SurfaceCapabilities(),
      userPresence: e.kind === "fork" ? e.root.userPresence : new UserPresence(),
      workflowUsageConsent: e.kind === "fork" ? e.root.workflowUsageConsent : new ae(),
      outsideReadPrompt: e.kind === "fork" ? e.root.outsideReadPrompt : new OpenToolUseQuestionSlice(),
      writePermissionStash: e.kind === "fork" ? e.root.writePermissionStash : new FileStateStashSlice(),
      subscribe(u) {
        let subscribe = s.subscribe(u);
        if (e.kind !== "fork") return subscribe;
        let root = e.root,
          { id: id, parentId: parentId } = root,
          subscribe_2 = root.subscribe(() => {
            if (root.id === id && root.parentId === parentId) return;
            ((id = root.id), (parentId = root.parentId), u());
          });
        return () => {
          (subscribe(), subscribe_2());
        };
      },
      setCwd(u) {
        S.update({ project: { cwd: u } });
      },
      setIsolationRoot(u) {
        if (u !== i) ((i = u), s.emit());
      },
      withProject(u) {
        return forkSessionWithProject(
          { kind: "fork", root: S.root },
          mergeProjectDirs(r.project, u),
          u.isolationRoot ?? i,
        );
      },
      update(u) {
        let m =
            u.project === void 0
              ? r.project
              : u.project === null
                ? null
                : mergeProjectDirs(r.project, u.project),
          h = !1;
        if (u.id !== void 0 || "parentId" in u) {
          if (e.kind === "fork")
            throw Error(
              "A withProject fork cannot re-identify the session \u2014 update the root session instead",
            );
          if (u.id !== void 0 && u.id !== e.id) ((e.id = u.id), (h = !0));
          if ("parentId" in u && u.parentId !== e.parentId) ((e.parentId = u.parentId), (h = !0));
        }
        if (
          m?.originalCwd !== r.project?.originalCwd ||
          m?.projectRoot !== r.project?.projectRoot ||
          m?.cwd !== r.project?.cwd
        )
          ((r.project = m), (h = !0));
        let g = u.project?.isolationRoot;
        if (g !== void 0 && g !== i) ((i = g), (h = !0));
        if (h) s.emit();
      },
    };
  return S;
}
/**
 * 按会话根对象（WeakMap，键为 x.root）懒创建并缓存一份状态；of 取或建、peek 只取、drop 删除。被大量模块用作每会话单例。
 */
//@ chunk-ndmse9kj.js:50630-50850 placement
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
    let root = e.root,
      o = this.#t.get(root);
    if (o !== void 0) return o;
    let r = this.#e();
    return (this.#t.set(root, r), r);
  }
  drop(e) {
    this.#t.delete(e.root);
  }
}
/**
 * 会话运行模式切片：交互/打印模式、输出格式、权限提示工具、受限工作区、客户端类型、会话启动类型等几十个私有字段的读写器。
 */
//@ chunk-ndmse9kj.js:50850-56668 placement
class RuntimeModeSlice {
  #e = !1;
  #t = !1;
  #n = !1;
  #o = null;
  #r = !1;
  #s = void 0;
  #i = !1;
  #d = !1;
  #u = !1;
  #c = !1;
  #l = void 0;
  #p = !1;
  #h = !1;
  #a = null;
  #g = null;
  #S = new Map();
  #y = "cli";
  #v = "fresh";
  #f = void 0;
  #m = !1;
  #b = !1;
  #k = [];
  #R = !1;
  #x = !1;
  #C = !1;
  #P = new Set();
  #T = !1;
  #w = !1;
  #A = !1;
  #L = !1;
  #M = "none";
  #O = !1;
  #F = !1;
  #I = !1;
  #E = !1;
  #H = !1;
  #B = void 0;
  #U = void 0;
  #j = void 0;
  #q = void 0;
  #N = void 0;
  #_ = void 0;
  #W = !1;
  #G = !1;
  #V = !1;
  #K = null;
  #J = null;
  #z = !0;
  #Q = null;
  #D = !1;
  #oe = createSignal();
  #$ = null;
  #Y = !1;
  #X = !1;
  #Z = {};
  #ee = null;
  #te = "none";
  #ne = void 0;
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
    this.#n = !0;
  }
  replaceIsInteractive(e) {
    ((this.#e = e), (this.#t = !0));
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
    this.#u = !0;
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
    (this.#g?.(), (this.#g = e));
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
    this.#O = !0;
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
    if (((this.#D = e), n)) this.#oe.emit();
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
    ((this.#e = !1),
      (this.#t = !1),
      (this.#n = !1),
      (this.#o = null),
      (this.#te = "none"),
      (this.#ne = void 0),
      (this.#r = !1),
      (this.#s = void 0),
      (this.#i = !1),
      (this.#d = !1),
      (this.#u = !1),
      (this.#c = !1),
      (this.#l = void 0),
      (this.#p = !1),
      (this.#h = !1),
      (this.#a = null),
      this.replaceWorkspaceRestrictionUnsubscribe(null),
      (this.#S = new Map()),
      (this.#y = "cli"),
      (this.#v = "fresh"),
      (this.#f = void 0),
      (this.#m = !1),
      (this.#b = !1),
      (this.#k = []),
      (this.#R = !1),
      (this.#x = !1),
      (this.#C = !1),
      (this.#P = new Set()),
      (this.#T = !1),
      (this.#w = !1),
      (this.#A = !1),
      (this.#L = !1),
      (this.#M = "none"),
      (this.#O = !1),
      (this.#F = !1),
      (this.#I = !1),
      (this.#E = !1),
      (this.#H = !1),
      (this.#B = void 0),
      (this.#U = void 0),
      (this.#q = void 0),
      (this.#j = void 0),
      (this.#N = void 0),
      (this.#_ = void 0),
      (this.#W = !1),
      (this.#G = !1),
      (this.#V = !1),
      (this.#K = null),
      (this.#J = null),
      (this.#z = !0),
      (this.#Q = null),
      (this.#D = !1),
      (this.#$ = null),
      (this.#Y = !1),
      (this.#X = !1),
      (this.#Z = {}),
      (this.#ee = null));
  }
}
/**
 * 设置来源切片：--settings 路径/内联内容、agents 与 MCP 配置文件、父进程托管设置、允许的设置来源（缓存去掉 project/local 的版本）、cowork 插件开关。
 */
//@ chunk-ndmse9kj.js:56668-57999 placement
class SettingsSourcesSlice {
  #e = void 0;
  #t = [];
  #n = [];
  #o = void 0;
  #r = void 0;
  #s = null;
  #i = null;
  #d = !1;
  #u = null;
  #c = getDefaultSettingSources();
  #l = null;
  #p = !1;
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
    ((this.#i = e), (this.#u = n));
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
      this.#l = { of: e, result: e.filter((n) => n !== "projectSettings" && n !== "localSettings") };
    return this.#l.result;
  }
  useCoworkPlugins() {
    return this.#p;
  }
  replaceUseCoworkPlugins(e) {
    this.#p = e;
  }
  reset() {
    ((this.#e = void 0),
      (this.#t = []),
      (this.#n = []),
      (this.#o = void 0),
      (this.#r = void 0),
      (this.#s = null),
      (this.#i = null),
      (this.#d = !1),
      (this.#u = null),
      (this.#c = getDefaultSettingSources()),
      (this.#l = null),
      (this.#p = !1));
  }
}
//@ chunk-ndmse9kj.js:57999-58102 placement
function getDefaultSettingSources() {
  return ["userSettings", "projectSettings", "localSettings", "flagSettings", "policySettings"];
}
/**
 * 插件与通道切片：内联插件/URL、同步插件目录及其签名与行 id、官方市场认证（按签名过滤）、CLAUDE.md 附加目录、允许的通道、会话技能白名单、Chrome 开关、队友 agentId。
 */
//@ chunk-ndmse9kj.js:58102-59828 placement
class PluginsAndChannelsSlice {
  #e = [];
  #t = [];
  #n = [];
  #o = void 0;
  #r = new Map();
  #s = new Map();
  #i = new Map();
  #d = [];
  #u = void 0;
  #c = [];
  #l = !1;
  #p = void 0;
  #h = void 0;
  #a = void 0;
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
    return this.#o !== void 0;
  }
  syncedPluginAttestation(e) {
    return this.#r.get(e);
  }
  syncedPluginRowId(e) {
    return this.#s.get(e);
  }
  replaceSyncedPluginDirs(e, n = new Map(), o = new Map()) {
    ((this.#o = e), (this.#r = n), (this.#s = o), (this.#i = this.#g(this.#i)));
  }
  clearSyncedPluginDirs() {
    ((this.#o = void 0), (this.#r = new Map()), (this.#s = new Map()), (this.#i = new Map()));
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
    ((this.#e = []),
      (this.#t = []),
      (this.#n = []),
      this.clearSyncedPluginDirs(),
      (this.#d = []),
      (this.#u = void 0),
      (this.#c = []),
      (this.#l = !1),
      (this.#p = void 0),
      (this.#h = void 0),
      (this.#a = void 0));
  }
}
/**
 * 模型字符串缓存与第三方管理员引导快照、探测否定的文档默认值。
 */
//@ chunk-ndmse9kj.js:59828-60202 placement
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
    ((this.#e = null), (this.#n = new Set()));
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
    ((this.#e = null), (this.#t = null), (this.#n = new Set()));
  }
}
//@ chunk-ndmse9kj.js:60202-60212 placement
var $e = [];
/**
 * 诊断切片：错误日志（最多 100 条）、慢操作（10 秒过期）、开发栏告警（60 秒过期）。
 */
//@ chunk-ndmse9kj.js:60212-60743 placement
class DiagnosticsSlice {
  #e = [];
  #t = [];
  #n = void 0;
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
    if (this.#t.length === 0) return $e;
    let now = Date.now();
    if (this.#t.some((n) => now - n.timestamp >= 1e4)) {
      if (((this.#t = this.#t.filter((n) => now - n.timestamp < 1e4)), this.#t.length === 0)) return $e;
    }
    return this.#t;
  }
  recordDevBarAlert(e) {
    return;
  }
  devBarAlert() {
    let e = this.#n;
    if (e && Date.now() - e.timestamp >= 60000) {
      this.#n = void 0;
      return;
    }
    return e;
  }
  reset() {
    ((this.#e = []), (this.#t = []), (this.#n = void 0));
  }
}
//@ chunk-ndmse9kj.js:60743-60755 placement
var sLi = 100;

export {
  SessionRootSlot,
  jb,
  isSystemLocalCommandMessage,
  isNonConversationMessage,
  Pre,
  cke,
  NoProjectDirectoryError,
  xo,
  BMe,
  Oje,
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
  Je,
  Ve,
  sLi,
};
