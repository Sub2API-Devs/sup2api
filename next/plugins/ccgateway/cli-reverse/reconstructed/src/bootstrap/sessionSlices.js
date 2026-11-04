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
import { deferInit } from "../../runtime/deferred-init.js";

//@ chunk-ndmse9kj.js:36671-36750 placement
/**
 * 判断是否为压缩时插入的虚拟会话消息：type 为 user/assistant 且 isVirtual 为 true。
 */
function isVirtualConversationMessage(message) {
  return (message.type === "user" || message.type === "assistant") && message.isVirtual === true;
}
//@ chunk-ndmse9kj.js:36750-36843 placement
/**
 * 判断是否为合成模型的 API 错误消息：assistant 且 isApiErrorMessage 为真、message.model 为 SYNTHETIC_MODEL。
 */
function isSyntheticModelApiErrorMessage(message) {
  return (
    message.type === "assistant" &&
    message.isApiErrorMessage === true &&
    message.message?.model === SYNTHETIC_MODEL
  );
}
//@ chunk-ndmse9kj.js:36843-36912 placement (2.1.88 match: isSystemLocalCommandMessage, 1)
function isSystemLocalCommandMessage(message) {
  return message.type === "system" && message.subtype === "local_command";
}
//@ chunk-ndmse9kj.js:36912-37262 placement
/**
 * 判断消息是否不属于发给 API 的对话内容：progress、非本地命令的 system、若干内部附件（thinking_drop、credential_org、prompt_snapshot、prompt_render_point、deferred_tools_record）等返回 true；api_system 返回 false。
 */
function isNonConversationMessage(message) {
  if (message.type === "api_system") return false;
  return (
    message.type === "progress" ||
    (message.type === "system" && !isSystemLocalCommandMessage(message)) ||
    isVirtualConversationMessage(message) ||
    isSyntheticModelApiErrorMessage(message) ||
    (message.type === "attachment" &&
      (message.attachment?.type === "thinking_drop" ||
        message.attachment?.type === "credential_org" ||
        message.attachment?.type === "prompt_snapshot" ||
        message.attachment?.type === "prompt_render_point" ||
        message.attachment?.type === "deferred_tools_record"))
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
  get(agentId) {
    return this.byAgent.get(agentId);
  }
  has(agentId) {
    return this.byAgent.has(agentId);
  }
  put(agentId, sidecar) {
    this.byAgent.set(agentId, sidecar);
  }
  remove(agentId) {
    this.byAgent.delete(agentId);
  }
  nextAttemptNumber(agentId) {
    let attemptNumber = (this.attemptsByAgent.get(agentId) ?? 0) + 1;
    this.attemptsByAgent.set(agentId, attemptNumber);
    return attemptNumber;
  }
  consecutiveCountedFailures(agentId) {
    return this.cappedFailuresByAgent.get(agentId) ?? 0;
  }
  recordCountedFailure(agentId) {
    let failureCount = (this.cappedFailuresByAgent.get(agentId) ?? 0) + 1;
    this.cappedFailuresByAgent.set(agentId, failureCount);
    return failureCount;
  }
  clearCountedFailures(agentId) {
    this.cappedFailuresByAgent.delete(agentId);
  }
  recordVeto(agentId, promptId) {
    this.vetoedUnderPrompt.set(agentId, promptId);
  }
  isVetoedUnder(agentId, promptId) {
    return this.vetoedUnderPrompt.get(agentId) === promptId;
  }
  latchArmGateEvent(gateKey) {
    if (this.armGateEventEmitted.has(gateKey)) return false;
    this.armGateEventEmitted.add(gateKey);
    return true;
  }
  enqueueSidecarIo(runIo, onError) {
    this.sidecarIo = this.sidecarIo.then(runIo, runIo).catch(onError);
    return this.sidecarIo;
  }
  sidecarIoSettled() {
    return this.sidecarIo;
  }
  hasAttemptedRehydrate(sessionId) {
    return this.rehydrateAttemptedSessions.has(sessionId);
  }
  markRehydrateAttempted(sessionId) {
    this.rehydrateAttemptedSessions.add(sessionId);
  }
  keepSidecarReadAhead(agentId, value) {
    this.sidecarReadsAhead.delete(agentId);
    while (this.sidecarReadsAhead.size >= SIDECAR_READAHEAD_LIMIT) {
      let oldestAgentId = this.sidecarReadsAhead.keys().next().value;
      if (oldestAgentId === undefined) break;
      this.sidecarReadsAhead.delete(oldestAgentId);
    }
    this.sidecarReadsAhead.set(agentId, value);
  }
  takeSidecarReadAhead(agentId) {
    let value = this.sidecarReadsAhead.get(agentId);
    this.sidecarReadsAhead.delete(agentId);
    return value;
  }
  dropSidecarReadAhead(agentId) {
    this.sidecarReadsAhead.delete(agentId);
  }
  forgetSubagentTelemetry(agentId) {
    this.attemptsByAgent.delete(agentId);
    this.cappedFailuresByAgent.delete(agentId);
    this.vetoedUnderPrompt.delete(agentId);
    for (let eventKind of ARM_GATE_EVENT_KINDS) this.armGateEventEmitted.delete(`${agentId}:${eventKind}`);
  }
}
//@ chunk-ndmse9kj.js:39133-39166 placement
/**
 * agentId 为空时归到 "main"，用于侧车状态与否决记录的分键。
 */
function agentIdOrDefault(agentId) {
  return agentId ?? "main";
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
  let isSeenUuid = ({ uuid }) => coverage.seenUuids.has(uuid);
  let sentUuidSet = new Set(sent.messages.map((message) => message.uuid));
  if (!sentUuidSet.has(coverage.lastUuid))
    return {
      kind: "refuse",
      reason: "boundary_uuid_missing",
    };
  if (!coverage.rowUuids.every((rowUuid) => sentUuidSet.has(rowUuid)))
    return {
      kind: "refuse",
      reason: "covered_messages_changed",
    };
  if (kept.some((keptMessage) => isSeenUuid(keptMessage) && !sentUuidSet.has(keptMessage.uuid)))
    return {
      kind: "refuse",
      reason: "kept_message_missing",
    };
  if (
    sent.messages
      .slice(0, sent.messages.findLastIndex(isSeenUuid))
      .some(
        (message) =>
          message.type === "assistant" && !isVirtualConversationMessage(message) && !isSeenUuid(message),
      )
  )
    return {
      kind: "refuse",
      reason: "unseen_reply",
    };
  let otherRowUuids = sent.rowUuids.slice(
    0,
    sent.rowUuids.findLastIndex((rowUuid) => coverage.seenUuids.has(rowUuid)) + 1,
  );
  if (
    instructions ||
    !received.messages.some(({ uuid }) => uuid === coverage.lastUuid) ||
    !arraysEqual(received.rowUuids, otherRowUuids)
  )
    return {
      kind: "refuse",
      reason: "hook_rewrite",
    };
  let lastIndex = received.messages.findLastIndex(isSeenUuid);
  let flattened = received.messages.flatMap((message, messageIndex) =>
    message.type === "progress" || isSeenUuid(message)
      ? []
      : [
          {
            message,
            isEarly: messageIndex < lastIndex,
          },
        ],
  );
  let isEarlyVirtual = ({ message, isEarly }) => isEarly && isVirtualConversationMessage(message);
  let earlyVirtualSet = new Set(flattened.filter(isEarlyVirtual).map(({ message }) => message));
  let filtered = flattened.filter((entry) => !isEarlyVirtual(entry));
  let mapped = filtered.map(({ message }) => message);
  let swapResult =
    fit &&
    evaluateCompactSwap(
      fit,
      received.messages.filter((message) => !earlyVirtualSet.has(message)),
      [...kept, ...mapped],
    );
  if (swapResult?.givesWay)
    return {
      kind: "refuse",
      reason: "would_not_fit",
      sizes: swapResult.sizes,
    };
  return {
    kind: "reuse",
    tail: mapped,
    earlyTailCount: count(filtered, ({ isEarly }) => isEarly),
    displayOnlyLeftOutCount: earlyVirtualSet.size,
    headReordered: !arraysEqual(received.rowUuids, coverage.rowUuids),
    sizes: swapResult?.sizes,
  };
}
//@ chunk-ndmse9kj.js:40544-40928 placement
/**
 * 估算用压缩结果替换后的 token 数（postSwapTokens），并判断是否应让位（超过阈值且压缩来源小于窗口）。
 */
function evaluateCompactSwap(
  { thresholdTokens, windowTokens, liveTokens, madeFromTokens, summary, sizeOf },
  currentMessages,
  proposedTail,
) {
  let proposedUuidSet = new Set(proposedTail.map((message) => message.uuid));
  let currentUuidSet = new Set(currentMessages.map((message) => message.uuid));
  let filtered = currentMessages.filter((message) => !proposedUuidSet.has(message.uuid));
  let filtered_2 = currentMessages.filter((message) => proposedUuidSet.has(message.uuid));
  let filtered_3 = proposedTail.filter((message) => !currentUuidSet.has(message.uuid));
  let postSwapTokens =
    Math.max(liveTokens - sizeOf(filtered), sizeOf(filtered_2)) + sizeOf([...summary, ...filtered_3]);
  return {
    sizes: {
      postSwapTokens,
      thresholdTokens,
      windowTokens,
    },
    givesWay: postSwapTokens >= thresholdTokens && madeFromTokens < windowTokens,
  };
}
//@ chunk-ndmse9kj.js:40928-40977 placement
function arraysEqual(rowUuids, otherRowUuids) {
  return otherRowUuids.every((rowUuid, index) => rowUuids[index] === rowUuid);
}
//@ chunk-ndmse9kj.js:40977-41173 placement (2.1.88 match: isHumanTurn, 0.802)
/**
 * 找最后一条真实用户输入（非 meta、非工具结果）的 uuid。
 */
function findLastHumanPromptUuid(m) {
  return (
    m.findLast(
      (message) =>
        message.type === "user" &&
        !message.isMeta &&
        message.toolUseResult === undefined &&
        (typeof message.message.content === "string" ||
          !message.message.content.some((contentPart) => contentPart.type === "tool_result")),
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
  adopt(engineStore) {
    this.#e = engineStore;
  }
}
//@ chunk-ndmse9kj.js:41289-41420 placement
class SessionIdentitySlice {
  #e = null;
  #t = null;
  mainAgentId(session) {
    this.#e ??= identityAgentId2(session);
    return this.#e;
  }
  projectDir() {
    return this.#t;
  }
  replaceProjectDir(projectDir) {
    this.#t = projectDir;
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
  isOpenElsewhere(toolUseId) {
    return this.openToolUseId !== undefined && this.openToolUseId !== toolUseId;
  }
  open(openToolUseId) {
    this.openToolUseId = openToolUseId;
  }
  closeFor(toolUseId) {
    if (toolUseId !== undefined && this.openToolUseId === toolUseId) this.openToolUseId = undefined;
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
  endHoldSetBefore(holdCount) {
    this.reloadHeld &&= this.holdsSet !== holdCount;
  }
  reloaded(changeCount) {
    this.changesReloaded = Math.max(this.changesReloaded, changeCount);
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
  latchCcrSessionID(sessionId) {
    this.#e = sessionId;
  }
  syncEnabled() {
    return this.#t;
  }
  latchSyncEnabled(enabled) {
    this.#t = enabled;
    return enabled;
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
  append(question, response, fallbackNotice, agentId) {
    this.exchanges = [
      ...this.exchanges,
      {
        question,
        response,
        ...(fallbackNotice && {
          fallbackNotice,
        }),
        ...(agentId && {
          agentId,
        }),
      },
    ].slice(-20);
  }
  pendingReopen = null;
  reopenAway = false;
  get reopenPending() {
    return this.pendingReopen !== null;
  }
  armReopen(ownerId, makeCancel) {
    if (this.pendingReopen) {
      this.pendingReopen.owners.add(ownerId);
      return;
    }
    this.pendingReopen = {
      owners: new Set([ownerId]),
      cancel: makeCancel(),
    };
  }
  clearPendingReopen(ownerId) {
    let pendingReopen = this.pendingReopen;
    if (!pendingReopen) {
      this.reopenAway = false;
      return;
    }
    if (ownerId !== undefined) {
      pendingReopen.owners.delete(ownerId);
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
  setInFlight(question) {
    if (!this.inFlightQuestions.includes(question))
      this.inFlightQuestions = [...this.inFlightQuestions, question];
  }
  clearInFlight(question) {
    if (this.inFlightQuestions.includes(question))
      this.inFlightQuestions = this.inFlightQuestions.filter(
        (inFlightQuestion) => inFlightQuestion !== question,
      );
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
  submit(offer) {
    if (this.shownThisSession) return;
    if (this.submitted.length >= SUBMITTED_QUEUE_LIMIT) this.submitted.shift();
    this.submitted.push(offer);
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
var PERMISSION_STASH_EVICTED_SYMBOL; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-ndmse9kj.js:44876", () => {
  PERMISSION_STASH_EVICTED_SYMBOL = Symbol("permission-stash-evicted");
});
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
  stash(sessionId, toolUseId, filePaths, lane = "write") {
    if (sessionId === undefined) return;
    let laneMap = this.lanes[lane];
    let evictedSet = this.evicted[lane];
    let laneKey = fileLaneKey(sessionId, toolUseId);
    if (evictedSet.has(laneKey)) return;
    let existingPaths = laneMap.get(laneKey);
    if (existingPaths !== undefined) {
      let keepSet = new Set(filePaths);
      laneMap.set(
        laneKey,
        existingPaths.filter((filePath) => keepSet.has(filePath)),
      );
      return;
    }
    if (laneMap.size >= this.entriesCap) {
      let oldestKey = laneMap.keys().next().value;
      if (oldestKey !== undefined) {
        laneMap.delete(oldestKey);
        evictedSet.add(oldestKey);
        if (evictedSet.size > this.evictedKeysCap) {
          this.poisoned[lane] = true;
          let oldestEvictedKey = evictedSet.values().next().value;
          if (oldestEvictedKey !== undefined) evictedSet.delete(oldestEvictedKey);
        }
      }
    }
    laneMap.set(laneKey, filePaths);
  }
  holds(sessionId, toolUseId, lane = "write") {
    return sessionId !== undefined && this.lanes[lane].has(fileLaneKey(sessionId, toolUseId));
  }
  stashIdentity(sessionId, toolUseId, identity) {
    if (sessionId === undefined) return;
    let toolUseIdMap = this.identities.get(sessionId);
    let existingIdentity = toolUseIdMap?.get(toolUseId);
    if (toolUseIdMap !== undefined && existingIdentity !== undefined) {
      if (
        existingIdentity === null ||
        identity === null ||
        existingIdentity.dev !== identity.dev ||
        existingIdentity.ino !== identity.ino
      )
        toolUseIdMap.set(toolUseId, null);
      return;
    }
    let evictedOrPoisoned = this.identitiesEvicted.has(sessionId) || this.identitiesPoisoned;
    if (toolUseIdMap === undefined) {
      if (!evictedOrPoisoned && this.identities.size >= this.entriesCap) {
        let oldestSessionId = this.identities.keys().next().value;
        if (oldestSessionId !== undefined) {
          this.identities.delete(oldestSessionId);
          this.identitiesEvicted.add(oldestSessionId);
          if (this.identitiesEvicted.size > this.evictedKeysCap) {
            this.identitiesPoisoned = true;
            let oldestEvictedSessionId = this.identitiesEvicted.values().next().value;
            if (oldestEvictedSessionId !== undefined) this.identitiesEvicted.delete(oldestEvictedSessionId);
          }
        }
      }
      toolUseIdMap = new Map();
      this.identities.set(sessionId, toolUseIdMap);
    }
    toolUseIdMap.set(toolUseId, evictedOrPoisoned ? null : identity);
  }
  takeIdentity(sessionId, toolUseId) {
    if (sessionId === undefined) return;
    let toolUseIdMap = this.identities.get(sessionId);
    let identity = toolUseIdMap?.get(toolUseId);
    if (toolUseIdMap?.delete(toolUseId) && toolUseIdMap.size === 0) this.identities.delete(sessionId);
    return identity;
  }
  consume(sessionId, toolUseId, lane = "write") {
    if (sessionId === undefined) return;
    let laneMap = this.lanes[lane];
    let laneKey = fileLaneKey(sessionId, toolUseId);
    let stashedPaths = laneMap.get(laneKey);
    let wasEvicted =
      stashedPaths === undefined && (this.evicted[lane].delete(laneKey) || this.poisoned[lane]);
    let sessionPrefix = `${sessionId}\x00`;
    for (let key of laneMap.keys()) if (key.startsWith(sessionPrefix)) laneMap.delete(key);
    if (lane === "read") {
      this.identities.delete(sessionId);
      this.identitiesEvicted.delete(sessionId);
    }
    if (wasEvicted) return PERMISSION_STASH_EVICTED_SYMBOL;
    return stashedPaths;
  }
}
//@ chunk-ndmse9kj.js:46770-46808 placement
function fileLaneKey(sessionId, toolUseId) {
  return `${sessionId}\x00${toolUseId}`;
}
//@ chunk-ndmse9kj.js:46808-46860 placement
var NOPROJECTDIRECTORYERROR; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
var projectDirectoryErrorReporterSlot;
deferInit("chunk-ndmse9kj.js:46808", () => {
  NOPROJECTDIRECTORYERROR = "NoProjectDirectoryError";
  projectDirectoryErrorReporterSlot = new HostScoped(() => ({}));
});
//@ chunk-ndmse9kj.js:46860-46874 placement
var onProjectDirectoryError = () => {};
//@ chunk-ndmse9kj.js:46874-46894 placement
function setProjectDirectoryErrorHandler(handler) {
  onProjectDirectoryError = handler;
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
function getSessionProject(sessionRecord) {
  let { project } = sessionRecord;
  if (project === null) throw new NoProjectDirectoryError();
  return project;
}
//@ chunk-ndmse9kj.js:47150-47266 placement
/**
 * 以 root 会话描述（host、id、parentId）和项目信息派生带项目的会话。
 */
function forkRootSessionWithProject(root) {
  return forkSessionWithProject(
    {
      kind: "root",
      host: root.host,
      id: root.id,
      parentId: root.parentId,
    },
    root.project,
    root.project?.isolationRoot,
  );
}
//@ chunk-ndmse9kj.js:47266-47521 placement
/**
 * 用新值覆盖旧的 originalCwd/projectRoot/cwd 三元组并规范化；三者都缺返回 null，只缺一部分抛 NoProjectDirectoryError。
 */
function mergeProjectDirs(project, patch) {
  let originalCwd = patch.originalCwd ?? project?.originalCwd;
  let projectRoot = patch.projectRoot ?? project?.projectRoot;
  let cwd = patch.cwd ?? project?.cwd;
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
function forkSessionWithProject(source, project, isolationRoot) {
  let projectHolder = {
    project: project === null ? null : mergeProjectDirs(null, project),
  };
  let currentIsolationRoot = isolationRoot;
  let signal = createSignal();
  let observers = source.kind === "fork" ? source.root.observers : new SessionObservers();
  let autonomousLoopPreamble =
    source.kind === "fork" ? source.root.autonomousLoopPreamble : new AutonomousLoopSlice();
  let precompute = source.kind === "fork" ? source.root.precompute : new AgentSidecarSlice();
  let projectView = {
    get originalCwd() {
      return getSessionProject(projectHolder).originalCwd;
    },
    get projectRoot() {
      return getSessionProject(projectHolder).projectRoot;
    },
    get cwd() {
      return getSessionProject(projectHolder).cwd;
    },
    get isolationRoot() {
      return currentIsolationRoot;
    },
  };
  let session = {
    host: source.kind === "fork" ? source.root.host : source.host,
    get id() {
      return source.kind === "fork" ? source.root.id : source.id;
    },
    get parentId() {
      return source.kind === "fork" ? source.root.parentId : source.parentId;
    },
    get root() {
      return source.kind === "fork" ? source.root : session;
    },
    get project() {
      return projectHolder.project === null ? null : projectView;
    },
    observers,
    autonomousLoopPreamble,
    btwHistory: source.kind === "fork" ? source.root.btwHistory : new SideQuestionSlice(),
    ccrRecap: source.kind === "fork" ? source.root.ccrRecap : new TurnEndTaskSlice(),
    conversationLatches: source.kind === "fork" ? source.root.conversationLatches : new ConversationLatches(),
    costLedger: source.kind === "fork" ? source.root.costLedger : new CostLedger(),
    engineStore: source.kind === "fork" ? source.root.engineStore : new EngineStoreHolder(),
    usageCreditsOnlyModelConsentSlots:
      source.kind === "fork" ? source.root.usageCreditsOnlyModelConsentSlots : new UsageCreditsConsentSlots(),
    hookRegistry: source.kind === "fork" ? source.root.hookRegistry : new HookRegistry(),
    identity: source.kind === "fork" ? source.root.identity : new SessionIdentitySlice(),
    invokedSkills: source.kind === "fork" ? source.root.invokedSkills : new InvokedSkills(),
    mcpSessionWiring: source.kind === "fork" ? source.root.mcpSessionWiring : new McpSessionWiring(),
    modelSelection: source.kind === "fork" ? source.root.modelSelection : new ModelSelectionSlice(),
    promptAssembly: source.kind === "fork" ? source.root.promptAssembly : new PromptAssemblySlice(),
    promptSuggestion: source.kind === "fork" ? source.root.promptSuggestion : new TurnOfferSlice(),
    pendingHint: source.kind === "fork" ? source.root.pendingHint : new PendingOfferSlice(),
    pluginsSync: source.kind === "fork" ? source.root.pluginsSync : new CloudSyncSlice(),
    precompute,
    requestJournal: source.kind === "fork" ? source.root.requestJournal : new RequestJournal(),
    sessionCron: source.kind === "fork" ? source.root.sessionCron : new SessionCron(),
    sessionFlags: source.kind === "fork" ? source.root.sessionFlags : new SessionFlags(),
    sessionRefsGate: source.kind === "fork" ? source.root.sessionRefsGate : new CcrSessionLatchSlice(),
    sessionScratch: source.kind === "fork" ? source.root.sessionScratch : new SessionScratch(),
    surfaceCapabilities: source.kind === "fork" ? source.root.surfaceCapabilities : new SurfaceCapabilities(),
    userPresence: source.kind === "fork" ? source.root.userPresence : new UserPresence(),
    workflowUsageConsent:
      source.kind === "fork" ? source.root.workflowUsageConsent : new WorkflowUsageConsentFlag(),
    outsideReadPrompt:
      source.kind === "fork" ? source.root.outsideReadPrompt : new OpenToolUseQuestionSlice(),
    writePermissionStash:
      source.kind === "fork" ? source.root.writePermissionStash : new FileStateStashSlice(),
    subscribe(listener) {
      let unsubscribe = signal.subscribe(listener);
      if (source.kind !== "fork") return unsubscribe;
      let root = source.root;
      let { id, parentId } = root;
      let rootUnsubscribe = root.subscribe(() => {
        if (root.id === id && root.parentId === parentId) return;
        id = root.id;
        parentId = root.parentId;
        listener();
      });
      return () => {
        unsubscribe();
        rootUnsubscribe();
      };
    },
    setCwd(cwd) {
      session.update({
        project: {
          cwd,
        },
      });
    },
    setIsolationRoot(isolationRoot) {
      if (isolationRoot !== currentIsolationRoot) {
        currentIsolationRoot = isolationRoot;
        signal.emit();
      }
    },
    withProject(projectPatch) {
      return forkSessionWithProject(
        {
          kind: "fork",
          root: session.root,
        },
        mergeProjectDirs(projectHolder.project, projectPatch),
        projectPatch.isolationRoot ?? currentIsolationRoot,
      );
    },
    update(patch) {
      let nextProject =
        patch.project === undefined
          ? projectHolder.project
          : patch.project === null
            ? null
            : mergeProjectDirs(projectHolder.project, patch.project);
      let changed = false;
      if (patch.id !== undefined || "parentId" in patch) {
        if (source.kind === "fork")
          throw Error(
            "A withProject fork cannot re-identify the session \u2014 update the root session instead",
          );
        if (patch.id !== undefined && patch.id !== source.id) {
          source.id = patch.id;
          changed = true;
        }
        if ("parentId" in patch && patch.parentId !== source.parentId) {
          source.parentId = patch.parentId;
          changed = true;
        }
      }
      if (
        nextProject?.originalCwd !== projectHolder.project?.originalCwd ||
        nextProject?.projectRoot !== projectHolder.project?.projectRoot ||
        nextProject?.cwd !== projectHolder.project?.cwd
      ) {
        projectHolder.project = nextProject;
        changed = true;
      }
      let isolationRoot = patch.project?.isolationRoot;
      if (isolationRoot !== undefined && isolationRoot !== currentIsolationRoot) {
        currentIsolationRoot = isolationRoot;
        changed = true;
      }
      if (changed) signal.emit();
    },
  };
  return session;
}
//@ chunk-ndmse9kj.js:50630-50850 placement
/**
 * 按会话根对象（WeakMap，键为 x.root）懒创建并缓存一份状态；of 取或建、peek 只取、drop 删除。被大量模块用作每会话单例。
 */
class SessionRootSlot {
  #e;
  #t = new WeakMap();
  constructor(createSlot) {
    this.#e = createSlot;
  }
  peek(session) {
    return this.#t.get(session.root);
  }
  of(session) {
    let root = session.root;
    let cachedSlot = this.#t.get(root);
    if (cachedSlot !== undefined) return cachedSlot;
    let createdSlot = this.#e();
    this.#t.set(root, createdSlot);
    return createdSlot;
  }
  drop(session) {
    this.#t.delete(session.root);
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
  replaceIsInteractive(isInteractive) {
    this.#e = isInteractive;
    this.#t = true;
  }
  printOutputFormat() {
    return this.#o;
  }
  replacePrintOutputFormat(outputFormat) {
    this.#o = outputFormat;
  }
  thinkingDisplayExplicit() {
    return this.#r;
  }
  replaceThinkingDisplayExplicit(isThinkingDisplayExplicit) {
    this.#r = isThinkingDisplayExplicit;
  }
  permissionPromptToolName() {
    return this.#s;
  }
  replacePermissionPromptToolName(toolName) {
    this.#s = toolName;
  }
  hasStreamingInput() {
    return this.#i;
  }
  replaceHasStreamingInput(hasStreamingInput) {
    this.#i = hasStreamingInput;
  }
  singleShotPrintSession() {
    return this.#d;
  }
  replaceSingleShotPrintSession(isSingleShotPrintSession) {
    this.#d = isSingleShotPrintSession;
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
  replaceModelOverrideOptOutForSession(isModelOverrideOptOut) {
    this.#c = isModelOverrideOptOut;
  }
  rendererMode() {
    return this.#l;
  }
  replaceRendererMode(rendererMode) {
    this.#l = rendererMode;
  }
  strictToolResultPairing() {
    return this.#p;
  }
  replaceStrictToolResultPairing(isStrictToolResultPairing) {
    this.#p = isStrictToolResultPairing;
  }
  restrictedSession() {
    return this.#h;
  }
  replaceRestrictedSession(restrictedSession) {
    this.#h = restrictedSession;
  }
  workspaceRestrictionState() {
    return this.#a;
  }
  replaceWorkspaceRestrictionState(restrictionState) {
    this.#a = restrictionState;
  }
  replaceWorkspaceRestrictionUnsubscribe(unsubscribe) {
    this.#g?.();
    this.#g = unsubscribe;
  }
  restrictedWorkspaceRoots() {
    return this.#S;
  }
  addRestrictedWorkspaceRoot(root, value) {
    this.#S.set(root, value);
  }
  clearRestrictedWorkspaceRoots() {
    this.#S = new Map();
  }
  clientType() {
    return this.#y;
  }
  replaceClientType(clientType) {
    this.#y = clientType;
  }
  sessionStartType() {
    return this.#v;
  }
  replaceSessionStartType(sessionStartType) {
    this.#v = sessionStartType;
  }
  questionPreviewFormat() {
    return this.#f;
  }
  replaceQuestionPreviewFormat(previewFormat) {
    this.#f = previewFormat;
  }
  extendedQuestionsEnabled() {
    return this.#m;
  }
  replaceExtendedQuestionsEnabled(isExtendedQuestionsEnabled) {
    this.#m = isExtendedQuestionsEnabled;
  }
  questionOptionDescriptionsOptional() {
    return this.#b;
  }
  replaceQuestionOptionDescriptionsOptional(optionDescriptionsOptional) {
    this.#b = optionDescriptionsOptional;
  }
  replConfigArgv() {
    return this.#k;
  }
  replaceReplConfigArgv(argv) {
    this.#k = argv;
  }
  userMsgOptIn() {
    return this.#R;
  }
  replaceUserMsgOptIn(isUserMsgOptIn) {
    this.#R = isUserMsgOptIn;
  }
  searchToolsOptIn() {
    return this.#x;
  }
  replaceSearchToolsOptIn(isSearchToolsOptIn) {
    this.#x = isSearchToolsOptIn;
  }
  todoToolsOptIn() {
    return this.#C;
  }
  replaceTodoToolsOptIn(isTodoToolsOptIn) {
    this.#C = isTodoToolsOptIn;
  }
  toolsOmittedByLaunchList() {
    return this.#P;
  }
  replaceToolsOmittedByLaunchList(omittedTools) {
    this.#P = omittedTools;
  }
  wizardOperatorToolsEnabled() {
    return this.#T;
  }
  replaceWizardOperatorToolsEnabled(isWizardOperatorToolsEnabled) {
    this.#T = isWizardOperatorToolsEnabled;
  }
  runnerDeclaredNestedRepositoryDiff() {
    return this.#w;
  }
  replaceRunnerDeclaredNestedRepositoryDiff(isNestedRepositoryDiff) {
    this.#w = isNestedRepositoryDiff;
  }
  runnerDeclaredNoRepositoryCheckedOut() {
    return this.#A;
  }
  replaceRunnerDeclaredNoRepositoryCheckedOut(isNoRepositoryCheckedOut) {
    this.#A = isNoRepositoryCheckedOut;
  }
  runnerDeclaredFreshMachinePerSession() {
    return this.#L;
  }
  replaceRunnerDeclaredFreshMachinePerSession(isFreshMachinePerSession) {
    this.#L = isFreshMachinePerSession;
  }
  pollEventIngress() {
    return this.#M;
  }
  markPollEventIngress(ingressMode) {
    this.#M = ingressMode;
  }
  ownEventDeliveryRequested() {
    return this.#O && !this.#F;
  }
  replaceOwnEventDeliveryHeld(isHeld) {
    this.#F = isHeld;
  }
  markOwnEventDeliveryRequested() {
    this.#O = true;
  }
  sdkAgentProgressSummariesEnabled() {
    return this.#I;
  }
  replaceSdkAgentProgressSummariesEnabled(isSdkAgentProgressSummariesEnabled) {
    this.#I = isSdkAgentProgressSummariesEnabled;
  }
  sessionPersistenceDisabled() {
    return this.#E;
  }
  replaceSessionPersistenceDisabled(isSessionPersistenceDisabled) {
    this.#E = isSessionPersistenceDisabled;
  }
  diskless() {
    return this.#H;
  }
  replaceDiskless(isDiskless) {
    this.#H = isDiskless;
  }
  ccrSessionUrl() {
    return this.#B;
  }
  replaceCcrSessionUrl(sessionUrl) {
    this.#B = sessionUrl;
  }
  ccrDerivedSurface() {
    return this.#U;
  }
  replaceCcrDerivedSurface(derivedSurface) {
    this.#U = derivedSurface;
  }
  autoCompactWindowSurface() {
    return this.#q;
  }
  replaceAutoCompactWindowSurface(compactWindowSurface) {
    this.#q = compactWindowSurface;
  }
  entrypointOnRequests() {
    return this.#j;
  }
  replaceEntrypointOnRequests(entrypoint) {
    this.#j = entrypoint;
  }
  coworkEnrollment() {
    return this.#N;
  }
  replaceCoworkEnrollment(enrollment) {
    this.#N = enrollment;
  }
  toolsMachine() {
    return this.#_;
  }
  replaceToolsMachine(toolsMachine) {
    this.#_ = toolsMachine;
  }
  sessionBypassPermissionsMode() {
    return this.#W;
  }
  replaceSessionBypassPermissionsMode(isBypassPermissionsMode) {
    this.#W = isBypassPermissionsMode;
  }
  disableSlashCommands() {
    return this.#G;
  }
  replaceDisableSlashCommands(areSlashCommandsDisabled) {
    this.#G = areSlashCommandsDisabled;
  }
  disableFileMentions() {
    return this.#V;
  }
  replaceDisableFileMentions(areFileMentionsDisabled) {
    this.#V = areFileMentionsDisabled;
  }
  sessionUploadsDir() {
    return this.#K;
  }
  replaceSessionUploadsDir(uploadsDir) {
    this.#K = uploadsDir;
  }
  localUploadsRoot() {
    return this.#J;
  }
  replaceLocalUploadsRoot(uploadsRoot) {
    this.#J = uploadsRoot;
  }
  mayForwardHomeSettings() {
    return this.#z;
  }
  replaceMayForwardHomeSettings(mayForwardHomeSettings) {
    this.#z = mayForwardHomeSettings;
  }
  homeSettingsHostConsent() {
    return this.#Q;
  }
  replaceHomeSettingsHostConsent(hostConsent) {
    this.#Q = hostConsent;
  }
  scheduledTasksEnabled() {
    return this.#D;
  }
  replaceScheduledTasksEnabled(isScheduledTasksEnabled) {
    let becameEnabled = isScheduledTasksEnabled && !this.#D;
    this.#D = isScheduledTasksEnabled;
    if (becameEnabled) this.#oe.emit();
  }
  onScheduledTasksEnabled(listener) {
    return this.#oe.subscribe(listener);
  }
  initJsonSchema() {
    return this.#$;
  }
  replaceInitJsonSchema(jsonSchema) {
    this.#$ = jsonSchema;
  }
  cliSessionConfigCarried() {
    return this.#Y;
  }
  replaceCliSessionConfigCarried(isCliSessionConfigCarried) {
    this.#Y = isCliSessionConfigCarried;
  }
  forkRestrictedLaunchConfig() {
    return this.#X;
  }
  replaceForkRestrictedLaunchConfig(restrictedLaunchConfig) {
    this.#X = restrictedLaunchConfig;
  }
  forkReplayLaunchConfig() {
    return this.#Z;
  }
  spareClaimState() {
    return this.#te;
  }
  replaceSpareClaimState(claimState) {
    this.#te = claimState;
  }
  spareParkedAtMs() {
    return this.#ne;
  }
  replaceSpareParkedAtMs(parkedAtMs) {
    this.#ne = parkedAtMs;
  }
  replaceForkReplayLaunchConfig(replayLaunchConfig) {
    this.#Z = replayLaunchConfig;
  }
  projectConfigRoot() {
    return this.#ee;
  }
  replaceProjectConfigRoot(projectConfigRoot) {
    this.#ee = projectConfigRoot;
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
  replaceFlagSettingsPath(settingsPath) {
    this.#e = settingsPath;
  }
  flagAgentsFilePaths() {
    return this.#t;
  }
  replaceFlagAgentsFilePaths(agentsFilePaths) {
    this.#t = agentsFilePaths;
  }
  flagMcpConfigFilePaths() {
    return this.#n;
  }
  replaceFlagMcpConfigFilePaths(mcpConfigFilePaths) {
    this.#n = mcpConfigFilePaths;
  }
  flagSettingsExpectedContent() {
    return this.#o;
  }
  replaceFlagSettingsExpectedContent(expectedContent) {
    this.#o = expectedContent;
  }
  flagSettingsFilePinnedContent() {
    return this.#r;
  }
  replaceFlagSettingsFilePinnedContent(pinnedContent) {
    this.#r = pinnedContent;
  }
  flagSettingsInline() {
    return this.#s;
  }
  replaceFlagSettingsInline(inlineSettings) {
    this.#s = inlineSettings;
  }
  parentManagedSettings() {
    return this.#i;
  }
  replaceParentManagedSettings(managedSettings, organizationSettings = null) {
    this.#i = managedSettings;
    this.#u = organizationSettings;
  }
  parentManagedSettingsInvalid() {
    return this.#d;
  }
  replaceParentManagedSettingsInvalid(isInvalid) {
    this.#d = isInvalid;
  }
  parentOrganizationSettings() {
    return this.#u;
  }
  allowedSettingSources() {
    return this.#c;
  }
  replaceAllowedSettingSources(sources) {
    this.#c = sources;
  }
  allowedSettingSourcesWithoutRepoDirSources() {
    let sources = this.#c;
    if (this.#l?.of !== sources)
      this.#l = {
        of: sources,
        result: sources.filter((source) => source !== "projectSettings" && source !== "localSettings"),
      };
    return this.#l.result;
  }
  useCoworkPlugins() {
    return this.#p;
  }
  replaceUseCoworkPlugins(useCoworkPlugins) {
    this.#p = useCoworkPlugins;
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
  replaceInlinePlugins(plugins) {
    this.#e = plugins;
  }
  inlinePluginsNoMcp() {
    return this.#t;
  }
  replaceInlinePluginsNoMcp(pluginsNoMcp) {
    this.#t = pluginsNoMcp;
  }
  inlinePluginUrls() {
    return this.#n;
  }
  replaceInlinePluginUrls(pluginUrls) {
    this.#n = pluginUrls;
  }
  syncedPluginDirs() {
    return this.#o ?? [];
  }
  syncedPluginDirsRegistered() {
    return this.#o !== undefined;
  }
  syncedPluginAttestation(pluginId) {
    return this.#r.get(pluginId);
  }
  syncedPluginRowId(pluginId) {
    return this.#s.get(pluginId);
  }
  replaceSyncedPluginDirs(dirs, attestations = new Map(), rowIds = new Map()) {
    this.#o = dirs;
    this.#r = attestations;
    this.#s = rowIds;
    this.#i = this.#g(this.#i);
  }
  clearSyncedPluginDirs() {
    this.#o = undefined;
    this.#r = new Map();
    this.#s = new Map();
    this.#i = new Map();
  }
  attestedOfficialPluginMarketplace(pluginId) {
    return this.#i.get(pluginId);
  }
  replaceAttestedOfficialPluginIds(pluginIds) {
    this.#i = this.#g(pluginIds);
  }
  #g(pluginIds) {
    let attestedKeys = new Set(
      [...this.#r.values()].map((attestation) => `${attestation.pluginName}@${attestation.marketplace}`),
    );
    return new Map(
      [...pluginIds].filter(([pluginId, marketplace]) =>
        attestedKeys.has(`${pluginId.slice(0, pluginId.lastIndexOf("@"))}@${marketplace}`),
      ),
    );
  }
  additionalDirectoriesForClaudeMd() {
    return this.#d;
  }
  replaceAdditionalDirectoriesForClaudeMd(directories) {
    this.#d = directories;
  }
  claudeMdAdditionalDirectoriesAsked() {
    return this.#u;
  }
  askClaudeMdAdditionalDirectories(asked) {
    this.#u = asked;
  }
  allowedChannels() {
    return this.#c;
  }
  replaceAllowedChannels(channels) {
    this.#c = channels;
  }
  hasDevChannels() {
    return this.#l;
  }
  replaceHasDevChannels(hasDevChannels) {
    this.#l = hasDevChannels;
  }
  sessionSkillAllowlist() {
    return this.#p;
  }
  replaceSessionSkillAllowlist(skillAllowlist) {
    this.#p = skillAllowlist;
  }
  chromeFlagOverride() {
    return this.#h;
  }
  replaceChromeFlagOverride(flagOverride) {
    this.#h = flagOverride;
  }
  teammateAgentId() {
    return this.#a;
  }
  replaceTeammateAgentId(agentId) {
    this.#a = agentId;
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
  replaceModelStrings(modelStrings) {
    this.#e = modelStrings;
  }
  invalidate() {
    this.#e = null;
    this.#n = new Set();
  }
  admin3PSteeringSnapshot() {
    return this.#t;
  }
  recordAdmin3PSteeringSnapshot(steeringSnapshot) {
    this.#t = steeringSnapshot;
  }
  probeRefutedDocumentDefaults() {
    return this.#n;
  }
  recordProbeRefutedDocumentDefault(documentKey) {
    this.#n.add(documentKey);
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
  recordError(entry) {
    if (this.#e.length >= 100) this.#e.shift();
    this.#e.push(entry);
  }
  recordSlowOperation(operation, durationMs) {
    return;
  }
  slowOperations() {
    if (this.#t.length === 0) return EMPTY_DIAGNOSTICS_LIST;
    let now = Date.now();
    if (this.#t.some((operation) => now - operation.timestamp >= 1e4)) {
      this.#t = this.#t.filter((operation) => now - operation.timestamp < 1e4);
      if (this.#t.length === 0) return EMPTY_DIAGNOSTICS_LIST;
    }
    return this.#t;
  }
  recordDevBarAlert(alert) {
    return;
  }
  devBarAlert() {
    let alert = this.#n;
    if (alert && Date.now() - alert.timestamp >= 60000) {
      this.#n = undefined;
      return;
    }
    return alert;
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
