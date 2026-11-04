/**
 * services/accountMemory/memoryContext.ts
 *
 * 协作记忆上下文（laptop/ccr）收集与附件（2.1.316 新增）
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-s61vbvea.js (64)
 * attribution: placement 64
 */
import { DoctorLazy } from "../../cli/handlers/util.js";
import { stringSchema, objectSchema, record, _enum } from "../../../vendor/zod/v4/classic/schemas.js";
import { MAX_INSTRUCTION_CHARS, MEMORY_MUTATING_TOOLS } from "../../memdir/memoryTool.js";
import { logFeatureOk, logFeatureSad, logFeatureBad } from "../analytics/featureTelemetry.js";
import { fromEnum } from "../analytics/safeMetadata.js";
import { HostScoped } from "../../utils/hostScoped.js";
import { getFeatureValue_CACHED_MAY_BE_STALE } from "../analytics/growthbook.js";
import { getSessionEntrypoint } from "../../utils/sessionShape.js";
import { env } from "../../utils/env.js";
import { ENTRYPOINT_KIND_SET, isCoworkSession } from "../../utils/entrypointKinds.js";
import { hasRemoteSdkUrl } from "../ccrAgentProxy/agentProxy.js";
import {
  isPolicyVerdictUnobtainable,
  isPrincipalSeenUnderHipaa,
  isPolicyLimitsCacheLoaded,
  isPolicyVerdictAbsent,
  isPolicyAllowed,
} from "../policyLimits/policyEvidence.js";
import { noteShownText } from "../../utils/telemetry/thirdPartyEventRecords.js";
import { logForDiagnosticsNoPII } from "../../utils/diagLogs.js";
import { accountMemoryServerState } from "./accountMemoryServer.js";
import { currentMcpClients } from "../compact/idleToolResultClearing.js";
import { getMemoryToggledOff, getSessionId } from "../../bootstrap/state.js";
import { setAccountMemoryRedaction, countToolCallsSince } from "../../utils/messages/accountMemory.js";
import { uniq } from "../../utils/collections.js";
import { recordPhase, getRecordedPhase } from "../../utils/startupTiming.js";
import { logError } from "../../utils/log.js";
import { classifyQuerySource } from "../api/requestHeaders.js";
import { createMemoryServerVerifier } from "../mcp/memoryServerVerification.js";
import { isRunningWithBun } from "../../utils/bundledMode.js";
import { raceWithAbortSignal, withDeadline } from "../../utils/sleep.js";
import { AbortError, classifyAxiosError } from "../../utils/errors.js";
import { logEvent } from "../analytics/index.js";
import { apiClient } from "../routines/routinesApi.js";
import { normalizeMemoryText } from "../../memdir/memdir.js";
import { collectMemoryReadPaths, findStaleReads, formatMemoryUpdates } from "./memoryUpdates.js";
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-s61vbvea.js:68451-68463 placement
var memoryEmergencyOffHook = null;
//@ chunk-s61vbvea.js:68463-68490 placement
function nullRepoReadEpoch(host) {
  return null;
}
//@ chunk-s61vbvea.js:68490-68515 placement
var MEMORY_CONTEXT_PATH = "/memory_context";
//@ chunk-s61vbvea.js:68515-68580 placement
/**
 * 记忆上下文等待常量：最长等待 900 s、上次检查窗口 60 s、默认等待 2 s、首次 5 s、滞后请求 10 s。
 */
var TENGU_FANCY_CRAB = "tengu_fancy_crab";
var MAX_WAIT_SECONDS = 900;
var LAST_CHECK_WINDOW_MS = 60000;
var DEFAULT_WAIT_MS = 2000;
var FIRST_WAIT_MS = 5000;
var LATE_WAIT_MS = 1e4;
//@ chunk-s61vbvea.js:68580-68637 placement
/**
 * 记忆上下文的版本与大小限额：版本 TTL 1 小时、内容 256 KB、响应 1 MB、文件版本表 4096 项。
 */
var MAX_HELD_VERSION_TTL_MS = 3600000;
var MAX_CONTENT_CHARS = 262144;
var MAX_RESPONSE_BYTES_MEMCTX = 4 * MAX_CONTENT_CHARS + 1024;
var MAX_FILE_VERSION_ENTRIES = 4096;
var MAX_TOTAL_RESPONSE_BYTES = MAX_RESPONSE_BYTES_MEMCTX + 4 * MAX_FILE_VERSION_ENTRIES;
//@ chunk-s61vbvea.js:68637-68959 placement
/**
 * 记忆上下文版本号与服务端响应的 schema（版本、内容、各文件版本、指引、变体、轮后指令）。
 */
var memoryContextVersionSchema; // deferred: uses DoctorLazy (../../cli/handlers/util.js) of its import cycle while loading; runs once the cycle is complete
var memoryContextResponseSchema;
deferInit("chunk-s61vbvea.js:68637", () => {
  memoryContextVersionSchema = DoctorLazy(() => stringSchema().regex(/^[A-Za-z0-9._:+/=-]{1,256}$/));
  memoryContextResponseSchema = DoctorLazy(() =>
    objectSchema({
      version: memoryContextVersionSchema(),
      content: stringSchema().min(1).max(MAX_CONTENT_CHARS),
      versions: record(stringSchema(), stringSchema()).optional().catch(undefined),
      guidance: stringSchema().min(1).max(MAX_FILE_VERSION_ENTRIES).optional().catch(undefined),
      variant: _enum(["tools"]).optional().catch(undefined),
      post_turn_instruction: stringSchema().min(1).max(MAX_INSTRUCTION_CHARS).optional().catch(undefined),
    }),
  );
});
//@ chunk-s61vbvea.js:68959-69020 placement
function logFeatureOutcome(feature, withOutcome, outcome, extra) {
  if (withOutcome)
    logFeatureOk(feature, {
      outcome: fromEnum(outcome),
      ...extra,
    });
  else logFeatureOk(feature);
}
//@ chunk-s61vbvea.js:69020-69531 placement
/**
 * 每会话的协作记忆上下文状态：回答记录、列表、在途请求、持有内容、显示过的文本、失败计数、已发布/撤回版本等。
 */
var memoryContextState; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-s61vbvea.js:69020", () => {
  memoryContextState = new HostScoped(() => ({
    answeredForSession: undefined,
    answeredUnderRepoRead: undefined,
    answeredWithRepoReadProof: false,
    lists: new Map(),
    listChanges: 0,
    inflightFor: undefined,
    held: undefined,
    inflight: undefined,
    kicked: undefined,
    epoch: 0,
    firstWaitSpent: false,
    withdrawalOwed: false,
    gateReported: undefined,
    lastCheck: undefined,
    memoryWriteCutAt: undefined,
    turnEndCheck: undefined,
    turnEndGet: undefined,
    shown: new Set(),
    shownRecall: [],
    failures: 0,
    notBefore: undefined,
    tools: false,
    subagentMode: undefined,
    lastGetUnanswered: false,
    placeTool: undefined,
    servedVersions: new Set(),
    withdrawnVersions: new Set(),
  }));
});
//@ chunk-s61vbvea.js:69531-69585 placement
function isMemoryContextViaCcr() {
  return isMemoryContextHost() && getFeatureValue_CACHED_MAY_BE_STALE("tengu_misty_anchor", false);
}
//@ chunk-s61vbvea.js:69585-69703 placement
function isMemoryContextHost() {
  let sessionEntrypoint = getSessionEntrypoint();
  let flagOn =
    env.SYSTEM_REMINDER_MEMORY_CONTEXT &&
    (sessionEntrypoint === undefined || ENTRYPOINT_KIND_SET.has(sessionEntrypoint));
  return Boolean((isCoworkSession() || flagOn) && hasRemoteSdkUrl());
}
//@ chunk-s61vbvea.js:69703-69732 placement
function memorySyncPolicyState() {
  return "closed";
}
//@ chunk-s61vbvea.js:69732-69883 placement
/**
 * 记忆同步的策略状态：策略不可得时按 HIPAA 与缓存情况为 denied/pending，未下发为 pending，否则按 allow_memory_sync 为 open/denied。
 */
function getMemorySyncPolicyState() {
  if (isPolicyVerdictUnobtainable()) {
    if (isPrincipalSeenUnderHipaa()) return "denied";
    if (!isPolicyLimitsCacheLoaded()) return "pending";
  } else if (isPolicyVerdictAbsent()) return "pending";
  return isPolicyAllowed("allow_memory_sync") ? "open" : "denied";
}
//@ chunk-s61vbvea.js:69883-70086 placement
function reportGateState(state, gate) {
  if (gate === "open" || gate === "closed") {
    state.gateReported = undefined;
    return;
  }
  if (state.gateReported !== gate) {
    state.gateReported = gate;
    logFeatureSad(
      "laptop_memory_context",
      gate === "pending" ? "policy_pending" : gate === "denied" ? "policy_denied" : gate,
    );
  }
}
//@ chunk-s61vbvea.js:70086-70116 placement
/**
 * 导出函数 `memorySyncPolicyClosedStub`：返回 "closed"。
 */
function memorySyncPolicyClosedStub() {
  return "closed";
}
//@ chunk-s61vbvea.js:70116-70140 placement
/**
 * 导出函数 `alwaysFalseMemCtx`：返回 !1。
 */
function alwaysFalseMemCtx() {
  return false;
}
//@ chunk-s61vbvea.js:70140-70540 placement
function coworkMemoryContextMode(host, latestCoworkMemoryVersion, force = false) {
  let leg = memoryContextLeg();
  let state = memoryContextState.of(host);
  let heldContext =
    leg !== undefined && !isMemoryToggledOff(leg) && !force && !isLaptopEmergencyOff(leg)
      ? getHeldContext(host, state, leg)
      : undefined;
  let fallback =
    leg === "ccr"
      ? {}
      : {
          leg: "laptop",
        };
  if (heldContext?.content == null)
    return latestCoworkMemoryVersion !== undefined
      ? {
          type: "cowork_memory_context",
          version: null,
          content: null,
          ...fallback,
        }
      : undefined;
  if (latestCoworkMemoryVersion === heldContext.version) return;
  let fullText = (heldContext.guidance ?? "") + heldContext.content;
  if (leg === "laptop") state.shown.add(fullText);
  noteShownText(host, fullText);
  return {
    type: "cowork_memory_context",
    version: heldContext.version,
    content: fullText,
    ...fallback,
  };
}
//@ chunk-s61vbvea.js:70540-71014 placement
function withdrawCoworkMemoryContext(host, messages) {
  let lastMemoryContextAttachment = findLastMemoryContextAttachment(messages);
  if (lastMemoryContextAttachment === null || lastMemoryContextAttachment.content === null) return [];
  let state = memoryContextState.of(host);
  let policy = memorySyncPolicyState();
  let leg = memoryContextLeg(policy);
  let extra =
    (lastMemoryContextAttachment.version !== null &&
      state.withdrawnVersions.has(lastMemoryContextAttachment.version)) ||
    state.held?.content === null;
  if (!extra) {
    if (leg === undefined && hasRemoteSdkUrl()) return [];
    extra =
      leg !== undefined
        ? isMemoryToggledOff(leg) || isLaptopEmergencyOff(leg)
        : policy !== "pending" && state.held !== undefined;
    if (!extra && state.held === undefined && state.inflight !== undefined) return [];
  }
  let attachment = extra ? buildWithdrawalAttachment(leg) : getStaleMemoryContextAttachment(host, messages);
  if (attachment === undefined) return [];
  logForDiagnosticsNoPII("info", "cowork_memory_context_withdrawn_from_spawned_loop", {
    leg: leg ?? (hasRemoteSdkUrl() ? "ccr" : "laptop"),
  });
  return [attachment];
}
//@ chunk-s61vbvea.js:71014-71289 placement
/**
 * 记忆上下文已被撤回或已被替代时返回过期附件；笔记本端且需要时返回锚点附件。
 */
function getStaleMemoryContextAttachment(host, messages) {
  let state = memoryContextState.of(host);
  let leg = memoryContextLeg();
  let lastMemoryContextAttachment = findLastMemoryContextAttachment(messages);
  if (
    lastMemoryContextAttachment !== null &&
    lastMemoryContextAttachment.content !== null &&
    lastMemoryContextAttachment.version !== null &&
    (state.withdrawnVersions.has(lastMemoryContextAttachment.version) ||
      (!state.servedVersions.has(lastMemoryContextAttachment.version) &&
        state.held?.content != null &&
        state.held.version !== lastMemoryContextAttachment.version))
  )
    return buildWithdrawalAttachment(leg);
  return leg === "laptop" && hasStaleListAttachment(host, state, messages) ? emptyMemoryContext() : undefined;
}
//@ chunk-s61vbvea.js:71289-71401 placement
function buildWithdrawalAttachment(leg) {
  return leg === "ccr" || (leg === undefined && hasRemoteSdkUrl())
    ? {
        type: "cowork_memory_context",
        version: null,
        content: null,
      }
    : emptyMemoryContext();
}
//@ chunk-s61vbvea.js:71401-71538 placement
/**
 * 笔记本端有内容时构造只带版本的锚点附件。
 */
function buildAnchorAttachment(context) {
  return context.leg === "laptop" && context.content !== null
    ? {
        type: "cowork_memory_context",
        version: context.version,
        content: null,
        anchor: true,
      }
    : undefined;
}
//@ chunk-s61vbvea.js:71538-71821 placement
/**
 * 笔记本端版本匹配时构造带指引与内容的记忆上下文附件，并登记为已展示。
 */
function buildLaptopMemoryAttachment(host, version) {
  let leg = memoryContextLeg();
  let held =
    leg === "laptop" && !isMemoryToggledOff(leg) && !isLaptopEmergencyOff(leg)
      ? getHeldContext(host, memoryContextState.of(host), leg)
      : undefined;
  if (held?.content == null || version === null || held.version !== version) return;
  let state = memoryContextState.of(host);
  let fullText = (held.guidance ?? "") + held.content;
  state.shown.add(fullText);
  noteShownText(host, fullText);
  return {
    type: "cowork_memory_context",
    version: held.version,
    content: fullText,
    leg: "laptop",
  };
}
//@ chunk-s61vbvea.js:71821-71874 placement
/**
 * 导出函数 `memoryModeForSession`：参数 e，返回 accountMemoryServerState(currentMcpClients(e), WZn(e.session.host))。
 */
function memoryModeForSession(toolUseContext) {
  return accountMemoryServerState(
    currentMcpClients(toolUseContext),
    subagentMemoryMode(toolUseContext.session.host),
  );
}
//@ chunk-s61vbvea.js:71874-71919 placement
/**
 * 导出函数 `subagentMemoryMode`：参数 e，返回 memoryContextState.of(e).subagentMode。
 */
function subagentMemoryMode(host) {
  return memoryContextState.of(host).subagentMode;
}
//@ chunk-s61vbvea.js:71919-71995 placement
function memoryContextLeg(policy = memorySyncPolicyState()) {
  if (isMemoryContextViaCcr()) return "ccr";
  if (policy === "open") return "laptop";
  return;
}
//@ chunk-s61vbvea.js:71995-72045 placement
function isMemoryToggledOff(leg) {
  return getMemoryToggledOff() && (leg === "laptop" || !isCoworkSession());
}
//@ chunk-s61vbvea.js:72045-72111 placement
function isLaptopEmergencyOff(leg) {
  return leg === "laptop" && memoryEmergencyOffHook?.emergencyOffStands() === true;
}
//@ chunk-s61vbvea.js:72111-72294 placement
function isMemoryContextOff() {
  if (isMemoryContextViaCcr()) return isMemoryToggledOff("ccr");
  switch (memorySyncPolicyState()) {
    case "open":
      return isMemoryToggledOff("laptop");
    case "account_off":
    case "local_memory_off":
    case "denied":
      return true;
    case "pending":
    case "closed":
      return false;
  }
}
//@ chunk-s61vbvea.js:72294-72302 placement
// deferred: uses setAccountMemoryRedaction (../../utils/messages/accountMemory.js) of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-s61vbvea.js:72294", () => {
  setAccountMemoryRedaction(isMemoryContextOff);
});
//@ chunk-s61vbvea.js:72302-72360 placement
/**
 * 导出函数 `resetMemoryContextForSession`：参数 e。
 */
function resetMemoryContextForSession(host) {
  if (hasRemoteSdkUrl()) return;
  let state = memoryContextState.of(host);
  withdrawServedVersions(state);
  resetMemoryContextState(state);
}
//@ chunk-s61vbvea.js:72360-72657 placement
function buildAccountMemoryRecallAttachment(host, messages) {
  let flattened = messages.flatMap((row) => {
    if (row.type !== "attachment") return [];
    let { attachment } = row;
    if (attachment.type === "account_memory_recall") return [attachment.content];
    return attachment.type === "cowork_memory_context" &&
      attachment.leg === "laptop" &&
      attachment.content !== null
      ? [attachment.content]
      : [];
  });
  let state = memoryContextState.of(host);
  return uniq([...state.shown, ...state.shownRecall, ...flattened]);
}
//@ chunk-s61vbvea.js:72657-72877 placement
/**
 * 收集消息中非笔记本端的记忆上下文内容，与账号记忆召回内容一起去重返回。
 */
function collectMemoryContextTexts(host, messages) {
  let flattened = messages.flatMap((row) =>
    row.type === "attachment" &&
    row.attachment.type === "cowork_memory_context" &&
    row.attachment.leg !== "laptop" &&
    row.attachment.content !== null
      ? [row.attachment.content]
      : [],
  );
  return uniq([...buildAccountMemoryRecallAttachment(host, messages), ...flattened]);
}
//@ chunk-s61vbvea.js:72877-72988 placement
function getHeldContext(host, state, leg) {
  return leg === "laptop" &&
    state.held?.stop !== true &&
    (state.answeredForSession !== getSessionId() || isRepoReadProofStale(host, state))
    ? undefined
    : state.held;
}
//@ chunk-s61vbvea.js:72988-73049 placement
function isRepoReadProofStale(host, state) {
  return state.answeredWithRepoReadProof && isRepoReadStale(host, state);
}
//@ chunk-s61vbvea.js:73049-73139 placement
function emptyMemoryContext() {
  return {
    type: "cowork_memory_context",
    version: null,
    content: null,
    leg: "laptop",
  };
}
//@ chunk-s61vbvea.js:73139-73243 placement
function isListStale(host, state, version) {
  return (
    typeof version === "string" &&
    state.lists.has(version) &&
    state.lists.get(version) !== nullRepoReadEpoch(host)?.repoReadEpoch(host)
  );
}
//@ chunk-s61vbvea.js:73243-73524 placement
function hasStaleListAttachment(host, state, messages) {
  if (state.lists.size === 0) return false;
  for (let j = messages.length - 1; j >= 0; j--) {
    let row = messages[j];
    if (
      row?.type !== "attachment" ||
      row.attachment.type !== "cowork_memory_context" ||
      row.attachment.anchor
    )
      continue;
    if (row.attachment.content === null) return false;
    if (isListStale(host, state, row.attachment.version)) return true;
  }
  return false;
}
//@ chunk-s61vbvea.js:73524-73632 placement
function isRepoReadStale(host, state) {
  return (
    state.answeredUnderRepoRead !== undefined &&
    state.answeredUnderRepoRead !== nullRepoReadEpoch(host)?.repoReadEpoch(host)
  );
}
//@ chunk-s61vbvea.js:73632-73729 placement
function withdrawServedVersions(state) {
  for (let servedVersion of state.servedVersions) state.withdrawnVersions.add(servedVersion);
  state.servedVersions.clear();
}
//@ chunk-s61vbvea.js:73729-74041 placement
/**
 * 重置记忆上下文状态：纪元加一，按需标记需撤回，清空持有内容、检查与进行中的请求等。
 */
function resetMemoryContextState(state) {
  state.epoch++;
  state.withdrawalOwed ||= state.held !== undefined;
  state.held = undefined;
  state.lastCheck = undefined;
  state.inflight = undefined;
  state.inflightFor = undefined;
  state.kicked = undefined;
  state.firstWaitSpent = false;
  state.failures = 0;
  state.notBefore = undefined;
  state.subagentMode = undefined;
  state.answeredForSession = undefined;
  state.answeredUnderRepoRead = undefined;
  state.answeredWithRepoReadProof = false;
}
//@ chunk-s61vbvea.js:74041-74145 placement
function withdrawMemoryContext(host, state, lastMemoryContextAttachment, lastAttachment, options) {
  withdrawServedVersions(state);
  resetMemoryContextState(state);
  state.withdrawalOwed = false;
  return buildMemoryContextAttachments(
    host,
    state,
    {
      version: null,
      content: null,
    },
    lastMemoryContextAttachment,
    lastAttachment,
    options,
  );
}
//@ chunk-s61vbvea.js:74145-74218 placement
/**
 * 导出函数 `maybeKickMemoryContextFetch`：参数 e, n = {}, r。
 */
function maybeKickMemoryContextFetch(session, options = {}, observer) {
  let leg = memoryContextLeg();
  if (leg !== undefined && !isMemoryToggledOff(leg))
    kickMemoryContextFetch(session.host, leg, options, observer);
}
//@ chunk-s61vbvea.js:74218-74293 placement
/**
 * 导出函数 `refreshMemoryContextForCcr`：参数 e，返回 !1; return (kickMemoryContextFetch(e.host, "ccr", {}), !0)。
 */
function refreshMemoryContextForCcr(rootSession) {
  if (!isMemoryContextViaCcr() || isMemoryToggledOff("ccr")) return false;
  kickMemoryContextFetch(rootSession.host, "ccr", {});
  return true;
}
//@ chunk-s61vbvea.js:74293-74553 placement
/**
 * 刷新记忆上下文：持有内容但功能已关时撤回并重置；否则在没有持有与进行中请求时发起获取。
 */
function refreshMemoryContext(session, options = {}) {
  let state = memoryContextState.of(session.host);
  if ((state.held !== undefined || state.inflight !== undefined) && !isMemoryContextViaCcr()) {
    withdrawServedVersions(state);
    resetMemoryContextState(state);
    return;
  }
  let afterWarmup = () => {
    if (state.held === undefined && state.lastCheck === undefined && state.inflight === undefined)
      maybeKickMemoryContextFetch(session, options);
  };
  if (state.inflight === undefined) afterWarmup();
  else state.inflight.then(afterWarmup, afterWarmup).catch(() => {});
}
//@ chunk-s61vbvea.js:74553-74830 placement
function kickMemoryContextFetch(host, leg, options, observer) {
  let startTime = performance.now();
  let request = requestMemoryContextOnce(host, leg, options);
  if (request === undefined) return;
  observer?.asked(startTime);
  request
    .then(() => {
      let startTime_2 = performance.now();
      observer?.answered(startTime_2);
      recordPhase("memory_context_fetch_ms", startTime_2 - startTime, startTime);
      let recordedPhase = getRecordedPhase("input_ready_ms");
      recordPhase(
        "memory_context_boot_spillover_ms",
        recordedPhase === undefined ? 0 : startTime_2 - recordedPhase,
      );
    })
    .catch(() => {});
}
//@ chunk-s61vbvea.js:74830-74899 placement
/**
 * 导出函数 `kickTurnEndCheckMemCtx`：参数 e, n = {}。
 */
function kickTurnEndCheckMemCtx(session, options = {}) {
  let leg = memoryContextLeg();
  if (leg !== undefined && !isMemoryToggledOff(leg)) kickTurnEndCheck(session.host, leg, options);
}
//@ chunk-s61vbvea.js:74899-75733 placement
function fetchTurnEndMemoryContext(session) {
  if (!isMemoryContextViaCcr() || isMemoryToggledOff("ccr")) return;
  let { host } = session;
  let state = memoryContextState.of(host);
  let lastCheck = state.lastCheck;
  if (
    lastCheck === undefined ||
    state.held?.stop ||
    state.inflight !== undefined ||
    state.lastGetUnanswered ||
    withinCheckWindow(lastCheck, LAST_CHECK_WINDOW_MS)
  )
    return;
  let memoryContextWindowMs = getMemoryContextWindowMs();
  if (!(memoryContextWindowMs > 0) || withinCheckWindow(lastCheck, memoryContextWindowMs / 2)) return;
  let earlierCheckAgeMs = Math.round(
    Math.max(Date.now() - lastCheck.wall, performance.now() - lastCheck.monotonic),
  );
  let version = state.held?.version;
  let epoch = state.epoch;
  let startTime = performance.now();
  let requestState = {
    answered: false,
    disowned: false,
  };
  let request = requestMemoryContextOnce(host, "ccr", {}, requestState);
  if (request === undefined) return;
  state.turnEndGet = {
    get: request,
    outcome: requestState,
  };
  request
    .then(() => {
      if (requestState.answered && state.lastCheck !== undefined)
        state.turnEndCheck = {
          check: state.lastCheck,
          replaced: lastCheck,
        };
      logForDiagnosticsNoPII("info", "memory_context_turn_end_get", {
        earlier_check_age_ms: earlierCheckAgeMs,
        get_took_ms: Math.round(performance.now() - startTime),
        answer_applied: requestState.answered,
        replaced_by_next_turn: !requestState.answered && requestState.disowned,
        discarded_by_memory_reset: !requestState.answered && !requestState.disowned && state.epoch !== epoch,
        version_changed: requestState.answered && state.held?.version !== version,
      });
    })
    .catch(() => {});
}
//@ chunk-s61vbvea.js:75733-75957 placement
/**
 * 本轮助手调用了记忆写入类工具且需要时，记录记忆写入截断的时间。
 */
function markMemoryWriteCut(host, messages) {
  if (!isMemoryContextViaCcr()) return;
  if (
    messages.some(
      (row) =>
        row.type === "assistant" &&
        Array.isArray(row.message.content) &&
        row.message.content.some(
          (block) => block.type === "tool_use" && MEMORY_MUTATING_TOOLS.has(block.name),
        ),
    ) &&
    getMemoryContextWindowMs() > 0
  )
    memoryContextState.of(host).memoryWriteCutAt = performance.now();
}
//@ chunk-s61vbvea.js:75957-76175 placement
/**
 * CCR 端在本轮中途收集记忆上下文附件（有持有内容且功能开启时）。
 */
function collectCcrMemoryAttachments(host, normalizedMessages) {
  let state = memoryContextState.of(host);
  if (state.held?.content == null || isMemoryToggledOff("ccr") || !isMemoryContextViaCcr()) return [];
  let memoryContextAttachments = buildMemoryContextAttachments(
    host,
    state,
    state.held,
    findLastMemoryContextAttachment(normalizedMessages),
    normalizedMessages,
    "ccr",
  );
  if (memoryContextAttachments.length > 0)
    logForDiagnosticsNoPII("info", "memory_context_turn_collected", {
      leg: "ccr",
      attached_mid_turn: true,
    });
  return memoryContextAttachments;
}
//@ chunk-s61vbvea.js:76175-76290 placement
function isCheckBeforeWriteCut(state) {
  return (
    state.lastCheck !== undefined &&
    state.memoryWriteCutAt !== undefined &&
    state.lastCheck.monotonic <= state.memoryWriteCutAt
  );
}
//@ chunk-s61vbvea.js:76290-76442 placement
function getMemoryContextWindowMs() {
  let windowMs = 0;
  try {
    windowMs = getFeatureValue_CACHED_MAY_BE_STALE(TENGU_FANCY_CRAB, 0);
  } catch (error) {
    logError(error);
    logForDiagnosticsNoPII("warn", "cowork_memory_context_window_flag_failed");
  }
  return typeof windowMs === "number" ? Math.min(windowMs, MAX_WAIT_SECONDS) * 1000 : 0;
}
//@ chunk-s61vbvea.js:76442-76533 placement
function withinCheckWindow(lastCheck, memoryContextWindowMs) {
  let ageMs = Date.now() - lastCheck.wall;
  return (
    ageMs >= 0 &&
    ageMs < memoryContextWindowMs &&
    performance.now() - lastCheck.monotonic < memoryContextWindowMs
  );
}
//@ chunk-s61vbvea.js:76533-76608 placement
function checkMemoryContextAtTurnEnd(host, state, leg) {
  if (leg === "laptop" && state.held?.stop !== true && isRepoReadProofStale(host, state)) {
    withdrawServedVersions(state);
    resetMemoryContextState(state);
  }
}
//@ chunk-s61vbvea.js:76608-76938 placement
/**
 * 在轮次结束时发起记忆上下文检查：接管 CCR 的轮末请求，返回是否已回答、是否加入进行中请求等状态。
 */
function kickTurnEndCheck(host, leg, options) {
  let state = memoryContextState.of(host);
  checkMemoryContextAtTurnEnd(host, state, leg);
  let turnEndGet = leg === "ccr" ? state.turnEndGet : undefined;
  if (turnEndGet !== undefined && state.inflight === turnEndGet.get) {
    turnEndGet.outcome.disowned = true;
    state.inflight = undefined;
    state.inflightFor = undefined;
  }
  let joined = state.inflight !== undefined;
  let checkAtKick = state.lastCheck;
  let result = {
    answered: requestMemoryContextOnce(host, leg, options),
    joined,
    sentFor: state.inflightFor,
    checkAtKick,
  };
  state.kicked = result.answered === undefined ? undefined : result;
  return result;
}
//@ chunk-s61vbvea.js:76938-76980 placement
function toolListProvider(toolUseContext) {
  return () => toolUseContext.options?.tools;
}
//@ chunk-s61vbvea.js:76980-79571 placement
/**
 * 按 laptop/ccr 两种场景收集协作记忆上下文并生成附件
 */
function collectCoworkMemoryContext(messages, toolUseContext, querySource) {
  if (toolUseContext.agentId || classifyQuerySource(querySource) !== "main") return;
  let host = toolUseContext.session.host;
  memoryContextState.of(host).placeTool = createMemoryServerVerifier(toolListProvider(toolUseContext));
  let policy = memorySyncPolicyState();
  let leg = memoryContextLeg(policy);
  if (leg === undefined) {
    if (hasRemoteSdkUrl()) return;
    let gate = memoryContextState.of(toolUseContext.session.host);
    reportGateState(gate, policy);
    if (policy === "pending") {
      if (gate.held === undefined && gate.withdrawalOwed) {
        gate.withdrawalOwed = false;
        withdrawServedVersions(gate);
        return Promise.resolve(
          buildMemoryContextAttachments(
            host,
            gate,
            {
              version: null,
              content: null,
            },
            findLastMemoryContextAttachment(messages),
            messages,
            "laptop",
          ),
        );
      }
      return;
    }
    if (gate.held === undefined && !gate.withdrawalOwed) {
      if (gate.inflight !== undefined) resetMemoryContextState(gate);
      return;
    }
    return Promise.resolve(
      withdrawMemoryContext(host, gate, findLastMemoryContextAttachment(messages), messages, "laptop"),
    );
  }
  let gate = memoryContextState.of(toolUseContext.session.host);
  if (leg === "laptop") reportGateState(gate, policy);
  let lastMemoryContextAttachment = findLastMemoryContextAttachment(messages);
  if (isMemoryToggledOff(leg))
    return Promise.resolve(withdrawMemoryContext(host, gate, lastMemoryContextAttachment, messages, leg));
  checkMemoryContextAtTurnEnd(host, gate, leg);
  let kick = gate.kicked ?? kickTurnEndCheck(toolUseContext.session.host, leg, toolUseContext);
  let { answered, joined, sentFor } = kick;
  gate.kicked = undefined;
  let withinWindow = false;
  let turnEndDetails;
  let writeStopped = gate.held?.stop === true;
  if (leg === "ccr" && gate.lastCheck !== undefined && !writeStopped) {
    let memoryContextWindowMs = getMemoryContextWindowMs();
    withinWindow = withinCheckWindow(gate.lastCheck, memoryContextWindowMs);
    turnEndDetails =
      gate.turnEndCheck?.check === gate.lastCheck
        ? {
            last_check_sent_at_turn_end: true,
            earlier_check_still_in_window: withinCheckWindow(
              gate.turnEndCheck.replaced,
              memoryContextWindowMs,
            ),
          }
        : {
            last_check_sent_at_turn_end: false,
          };
  }
  let CLAUDE_CODE_MEMORY_CONTEXT_NO_WAIT =
    leg === "ccr" && !writeStopped && env.CLAUDE_CODE_MEMORY_CONTEXT_NO_WAIT;
  let checkRunning = withinWindow && isRunningWithBun(gate.held, lastMemoryContextAttachment, messages);
  let cutBeforeWrite = withinWindow && isCheckBeforeWriteCut(gate);
  let repoStale = leg === "laptop" && !writeStopped && isRepoReadStale(host, gate);
  let heldContext = repoStale ? undefined : getHeldContext(host, gate, leg);
  if (
    CLAUDE_CODE_MEMORY_CONTEXT_NO_WAIT ||
    (heldContext !== undefined && !checkRunning && !cutBeforeWrite && (leg === "laptop" || withinWindow))
  ) {
    if (leg === "ccr") {
      let version = heldContext?.version;
      let epoch = gate.epoch;
      let startTime = performance.now();
      answered
        ?.then(() => {
          let epochChanged = gate.epoch !== epoch;
          logForDiagnosticsNoPII("info", "memory_context_per_turn_wait", {
            leg,
            wait_ms: 0,
            joined,
            cut: false,
            first: false,
            waited: false,
            answered: !epochChanged && gate.lastCheck !== kick.checkAtKick,
            get_ended_after_ms: Math.round(performance.now() - startTime),
            missed_change: version !== undefined && !epochChanged && gate.held?.version !== version,
            ...turnEndDetails,
          });
        })
        .catch(() => {});
    }
    return Promise.resolve(
      buildMemoryContextAttachments(host, gate, gate.held, lastMemoryContextAttachment, messages, leg),
    );
  }
  let epoch = gate.epoch;
  let readHeldContext = () => getHeldContext(host, gate, leg);
  let buildAttachments = (settledFirstWait) => {
    if (leg === "laptop" && settledFirstWait && gate.epoch === epoch) gate.firstWaitSpent = true;
    if (leg === "laptop" && gate.held === undefined && gate.withdrawalOwed) {
      gate.withdrawalOwed = false;
      withdrawServedVersions(gate);
      return buildMemoryContextAttachments(
        host,
        gate,
        {
          version: null,
          content: null,
        },
        lastMemoryContextAttachment,
        messages,
        leg,
      );
    }
    return buildMemoryContextAttachments(
      host,
      gate,
      readHeldContext(),
      lastMemoryContextAttachment,
      messages,
      leg,
    );
  };
  if (answered === undefined) return Promise.resolve(buildAttachments(false));
  let waitMs =
    (readHeldContext() === undefined || repoStale) &&
    lastMemoryContextAttachment === null &&
    !(leg === "laptop" && gate.firstWaitSpent)
      ? FIRST_WAIT_MS
      : DEFAULT_WAIT_MS;
  let startTime = performance.now();
  let mustRequest = false;
  let answerChain = answered.then(() => {
    if (gate.epoch !== epoch) return;
    mustRequest = leg === "ccr" && gate.held?.stop !== true && isCheckBeforeWriteCut(gate);
    return mustRequest || (leg === "laptop" && sentFor !== undefined && sentFor !== getSessionId())
      ? requestMemoryContextOnce(toolUseContext.session.host, leg, toolUseContext)
      : undefined;
  });
  let waitPromise = raceWithAbortSignal(
    answerChain.then(() => true),
    toolUseContext.abortController.signal,
    () => new AbortError(),
  );
  return withDeadline(waitPromise, waitMs).then(
    (completed) => {
      let waitMs_2 = Math.round(performance.now() - startTime);
      logForDiagnosticsNoPII("info", "memory_context_per_turn_wait", {
        leg,
        wait_ms: waitMs_2,
        joined,
        cut: !completed,
        first: waitMs === FIRST_WAIT_MS,
        ...((cutBeforeWrite || checkRunning) && {
          waited: true,
          reason: cutBeforeWrite ? "rewind_removed_memory_write" : "stale_notice_due",
        }),
        ...(mustRequest && {
          second_check: true,
        }),
        ...(writeStopped && {
          route_stopped: true,
        }),
      });
      if (leg === "laptop")
        logEvent("tengu_laptop_memory_context_wait", {
          wait_ms: waitMs_2,
          cut: !completed,
          first: waitMs === FIRST_WAIT_MS,
        });
      return buildAttachments(completed !== true);
    },
    () => buildAttachments(false),
  );
}
//@ chunk-s61vbvea.js:79571-79753 placement
function findLastMemoryContextAttachment(messages) {
  for (let j = messages.length - 1; j >= 0; j--) {
    let row = messages[j];
    if (
      row?.type === "attachment" &&
      row.attachment.type === "cowork_memory_context" &&
      !row.attachment.anchor
    )
      return row.attachment;
  }
  return null;
}
//@ chunk-s61vbvea.js:79892-80457 placement
/**
 * 根据持有的记忆上下文生成附件：有内容且版本与上次不同则附上（含引导与过期提示）；内容被清空时附撤回；仅工具模式时附 toolsOnly。
 */
function buildMemoryContextAttachments(host, state, held, lastAttachment, messages, leg) {
  let extra =
    leg === "laptop"
      ? {
          leg,
        }
      : {};
  if (held === undefined)
    return leg === "laptop" && hasStaleListAttachment(host, state, messages) ? [emptyMemoryContext()] : [];
  if (held.content !== null) {
    if (lastAttachment?.version === held.version) return [];
    let prefix = "";
    let text = (held.guidance ?? "") + prefix + held.content + buildStaleReadNotice(held.versions, messages);
    if (leg === "laptop") state.shown.add(text);
    noteShownText(host, text);
    return [
      ...[],
      {
        type: "cowork_memory_context",
        version: held.version,
        content: text,
        ...extra,
      },
    ];
  }
  if (lastAttachment !== null && lastAttachment.content !== null)
    return [
      {
        type: "cowork_memory_context",
        version: held.version,
        content: null,
        ...extra,
      },
    ];
  return isMemoryContextOff() && countToolCallsSince(messages, state.placeTool)
    ? [
        {
          type: "cowork_memory_context",
          version: held.version,
          content: null,
          toolsOnly: true,
          ...extra,
        },
      ]
    : [];
}
//@ chunk-s61vbvea.js:80457-80918 placement
/**
 * 发起记忆上下文请求（复用在途请求）：laptop 侧紧急关闭时锁定为停止；冷却期内不请求；结束时清除在途标记。
 */
function requestMemoryContextOnce(host, leg, requestContext, toolUseContext, skipEmergency = false) {
  let state = memoryContextState.of(host);
  if (
    leg === "laptop" &&
    !skipEmergency &&
    state.held?.stop !== true &&
    memoryEmergencyOffHook?.emergencyOffStands() === true
  ) {
    withdrawServedVersions(state);
    state.held = {
      version: null,
      content: null,
      stop: true,
    };
  }
  if (state.held?.stop) return Promise.resolve();
  if (state.inflight !== undefined) return state.inflight;
  if (leg === "laptop" && state.notBefore !== undefined) {
    let waitMs = state.notBefore - Date.now();
    if (waitMs > 0 && waitMs <= MAX_HELD_VERSION_TTL_MS) return;
  }
  let request = requestMemoryContextWithRetry(host, leg, requestContext, toolUseContext).finally(() => {
    if (state.inflight === request) {
      state.inflight = undefined;
      state.inflightFor = undefined;
    }
  });
  state.inflight = request;
  state.inflightFor = getSessionId();
  return request;
}
//@ chunk-s61vbvea.js:80918-81065 placement
async function requestMemoryContextWithRetry(host, leg, requestContext, toolUseContext) {
  let state = memoryContextState.of(host);
  let { epoch } = state;
  let retryState = {
    again: false,
  };
  await requestMemoryContext(host, leg, requestContext, toolUseContext, retryState);
  if (retryState.again && state.epoch === epoch && memoryContextLeg() === leg && !isMemoryToggledOff(leg))
    await requestMemoryContext(host, leg, requestContext, toolUseContext);
}
//@ chunk-s61vbvea.js:81065-83633 placement
async function requestMemoryContext(host, leg, { credentials, storageV5 }, requestContext, signal) {
  let gate = memoryContextState.of(host);
  let version = gate.held?.version;
  let epoch = gate.epoch;
  let sessionId = getSessionId();
  let featureName = leg === "ccr" ? "ccr_memory_context" : "laptop_memory_context";
  let notModified = false;
  let outcome;
  let retryAfter;
  let repoReadEpoch;
  let hasRepoReadProof = false;
  let notModifiedFlag = false;
  let unauthorized = false;
  let throttledFlag = false;
  try {
    let { path, opts } = {
      path: env.CLAUDE_CODE_MEMORY_CONTEXT_NO_WAIT
        ? `${MEMORY_CONTEXT_PATH}?takes_late_ms=${LATE_WAIT_MS}`
        : MEMORY_CONTEXT_PATH,
      opts: {
        host: "ccr-session",
        auth: "session-jwt",
        maxContentLength: MAX_RESPONSE_BYTES_MEMCTX,
      },
    };
    let stopReason = undefined;
    let stopVersion = null;
    let stopFlag = false;
    let isStale = () => gate.epoch !== epoch || requestContext?.disowned === true;
    let extraHeaders = {};
    repoReadEpoch = null?.repoReadEpoch(host);
    let repoReadLogin = null?.repoReadLogin();
    hasRepoReadProof = Object.keys(extraHeaders).length > 0;
    outcome = "failed";
    let lastCheck = {
      wall: Date.now(),
      monotonic: performance.now(),
    };
    let response = await apiClient.get(path, {
      ...opts,
      ...(opts.refreshOAuth && {
        refreshOAuth: false,
      }),
      headers: {
        ...opts.headers,
        "anthropic-version": "2023-06-01",
        ...false,
        ...extraHeaders,
        ...(version &&
          true &&
          gate.answeredUnderRepoRead === repoReadEpoch &&
          gate.answeredWithRepoReadProof === hasRepoReadProof && {
            "If-None-Match": `"${version}"`,
          }),
      },
      timeout: LATE_WAIT_MS,
      ...(hasRepoReadProof && {
        maxRedirects: 0,
      }),
      validateStatus: () => true,
      ...false,
    });
    if (isStale()) return;
    response.ok;
    if (!response.ok) {
      logForDiagnosticsNoPII("warn", "cowork_memory_context_gated", {
        leg,
        reason: response.reason,
      });
      logFeatureSad(featureName, response.reason.replaceAll("-", "_"));
      outcome = undefined;
      return;
    }
    let headers = response.response.headers;
    switch (((retryAfter = headers["retry-after"]), response.status)) {
      case 200: {
        let parsed = memoryContextResponseSchema().safeParse(response.data);
        if (!parsed.success) {
          logForDiagnosticsNoPII("warn", "cowork_memory_context_malformed", {
            leg,
          });
          logFeatureBad(featureName, "malformed");
          return;
        }
        let content = normalizeMemoryText(parsed.data.content);
        gate.servedVersions.add(parsed.data.version);
        gate.withdrawnVersions.delete(parsed.data.version);
        gate.held = {
          version: parsed.data.version,
          content,
          versions: parsed.data.versions,
          ...false,
          ...false,
          ...(parsed.data.post_turn_instruction !== undefined && {
            postTurnInstruction: normalizeMemoryText(parsed.data.post_turn_instruction),
          }),
        };
        outcome = "answered";
        gate.lastCheck = lastCheck;
        logForDiagnosticsNoPII("info", "cowork_memory_context_fetched", {
          leg,
        });
        logFeatureOutcome(featureName, false, "fetched", undefined);
        return;
      }
      case 304:
        outcome = "answered";
        notModifiedFlag = true;
        gate.lastCheck = lastCheck;
        logForDiagnosticsNoPII("info", "cowork_memory_context_unchanged", {
          leg,
        });
        logFeatureOutcome(featureName, false, "unchanged");
        return;
      case 204: {
        let etag = headers.etag;
        let versionParse = memoryContextVersionSchema().safeParse(
          typeof etag === "string" ? etag.replace(/^(?:W\/)?"(.*)"$/, "$1") : etag,
        );
        let stopOrg = !versionParse.success;
        withdrawServedVersions(gate);
        gate.held = {
          version: versionParse.success ? versionParse.data : null,
          content: null,
          ...(stopOrg && {
            stop: true,
          }),
        };
        outcome = "answered";
        gate.lastCheck = lastCheck;
        logForDiagnosticsNoPII("info", "cowork_memory_context_none", {
          leg,
          stop: stopOrg,
        });
        logFeatureOutcome(
          featureName,
          false,
          stopOrg ? "stop_org" : versionParse.success ? "none" : "none_no_etag",
        );
        return;
      }
      case 401:
      case 403:
        break;
      case 429:
      case 503:
        logForDiagnosticsNoPII("info", "cowork_memory_context_not_built", {
          leg,
          status: response.status,
        });
        logFeatureSad(featureName, "not_built");
        return;
      default:
        break;
    }
    logForDiagnosticsNoPII("warn", "cowork_memory_context_http_error", {
      leg,
      status: response.status,
    });
    logFeatureSad(featureName, `http_${response.status}`);
  } catch (error) {
    let { kind } = classifyAxiosError(error);
    if (requestContext?.disowned !== true) {
      logForDiagnosticsNoPII("warn", "cowork_memory_context_exception", {
        leg,
        kind,
      });
      logFeatureSad(featureName, kind);
    }
  } finally {
    if (requestContext !== undefined) requestContext.answered = outcome === "answered";
    if (leg === "ccr" && gate.epoch === epoch && requestContext?.disowned !== true)
      gate.lastGetUnanswered = outcome !== "answered";
  }
}
//@ chunk-s61vbvea.js:83633-83680 placement
/**
 * 导出函数 `heldMemoryVersions`：参数 e，返回 memoryContextState.of(e).held?.versions。
 */
function heldMemoryVersions(host) {
  return memoryContextState.of(host).held?.versions;
}
//@ chunk-s61vbvea.js:83680-83738 placement
/**
 * 导出函数 `heldPostTurnInstruction`：参数 e，返回 memoryContextState.of(e).held?.postTurnInstruction。
 */
function heldPostTurnInstruction(host) {
  return memoryContextState.of(host).held?.postTurnInstruction;
}
//@ chunk-s61vbvea.js:83738-83984 placement
/**
 * 把本次读取到的文件版本合并到持有的记忆上下文版本表（版本表未变时）。
 */
function mergeReadVersions(host, expectedVersions, messages) {
  let state = memoryContextState.of(host);
  let held = state.held;
  if (held?.versions !== expectedVersions) return;
  let readVersions;
  try {
    readVersions = collectMemoryReadPaths(messages).last;
  } catch {
    logForDiagnosticsNoPII("warn", "cowork_memory_context_pass_versions_failed");
    return;
  }
  if (readVersions.size === 0) return;
  state.held = {
    ...held,
    versions: {
      ...held.versions,
      ...Object.fromEntries(readVersions),
    },
  };
}
//@ chunk-s61vbvea.js:83984-84109 placement
/**
 * 生成读取已过期的提示文字，出错时记录诊断并返回空串。
 */
function buildStaleReadNotice(host, messages, findStaleCarriedReads = findStaleReads) {
  if (!host) return "";
  try {
    return formatMemoryUpdates(findStaleCarriedReads(host, messages));
  } catch {
    logForDiagnosticsNoPII("warn", "cowork_memory_context_notice_failed");
    return "";
  }
}
export {
  collectMemoryContextTexts,
  memoryModeForSession,
  getStaleMemoryContextAttachment,
  coworkMemoryContextMode,
  buildAnchorAttachment,
  buildLaptopMemoryAttachment,
  memorySyncPolicyClosedStub,
  kickTurnEndCheckMemCtx,
  buildAccountMemoryRecallAttachment,
  refreshMemoryContextForCcr,
  refreshMemoryContext,
  maybeKickMemoryContextFetch,
  collectCoworkMemoryContext,
  subagentMemoryMode,
  heldMemoryVersions,
  buildStaleReadNotice,
  heldPostTurnInstruction,
  mergeReadVersions,
  resetMemoryContextForSession,
  alwaysFalseMemCtx,
  withdrawCoworkMemoryContext,
  collectCcrMemoryAttachments,
  getMemorySyncPolicyState,
  fetchTurnEndMemoryContext,
  markMemoryWriteCut,
};
