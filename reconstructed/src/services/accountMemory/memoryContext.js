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
import { string, u, record, _enum } from "../../../vendor/zod/v4/classic/schemas.js";
import { memoryListArgsSchema, MEMORY_MUTATING_TOOLS } from "../../memdir/memoryTool.js";
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

//@ chunk-s61vbvea.js:68451-68463 placement
var memoryEmergencyOffHook = null;
//@ chunk-s61vbvea.js:68463-68490 placement
function nullRepoReadEpoch(e) {
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
var memoryContextVersionSchema = DoctorLazy(() => string().regex(/^[A-Za-z0-9._:+/=-]{1,256}$/));
var memoryContextResponseSchema = DoctorLazy(() =>
  u({
    version: memoryContextVersionSchema(),
    content: string().min(1).max(MAX_CONTENT_CHARS),
    versions: record(string(), string()).optional().catch(undefined),
    guidance: string().min(1).max(MAX_FILE_VERSION_ENTRIES).optional().catch(undefined),
    variant: _enum(["tools"]).optional().catch(undefined),
    post_turn_instruction: string().min(1).max(memoryListArgsSchema).optional().catch(undefined),
  }),
);
//@ chunk-s61vbvea.js:68959-69020 placement
function logFeatureOutcome(e, n, r, s) {
  if (n)
    logFeatureOk(e, {
      outcome: fromEnum(r),
      ...s,
    });
  else logFeatureOk(e);
}
//@ chunk-s61vbvea.js:69020-69531 placement
/**
 * 每会话的协作记忆上下文状态：回答记录、列表、在途请求、持有内容、显示过的文本、失败计数、已发布/撤回版本等。
 */
var memoryContextState = new HostScoped(() => ({
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
//@ chunk-s61vbvea.js:69531-69585 placement
function isMemoryContextViaCcr() {
  return isMemoryContextHost() && getFeatureValue_CACHED_MAY_BE_STALE("tengu_misty_anchor", false);
}
//@ chunk-s61vbvea.js:69585-69703 placement
function isMemoryContextHost() {
  let sessionEntrypoint = getSessionEntrypoint();
  let n =
    env.SYSTEM_REMINDER_MEMORY_CONTEXT &&
    (sessionEntrypoint === undefined || ENTRYPOINT_KIND_SET.has(sessionEntrypoint));
  return Boolean((isCoworkSession() || n) && hasRemoteSdkUrl());
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
function reportGateState(e, n) {
  if (n === "open" || n === "closed") {
    e.gateReported = undefined;
    return;
  }
  if (e.gateReported !== n) {
    e.gateReported = n;
    logFeatureSad(
      "laptop_memory_context",
      n === "pending" ? "policy_pending" : n === "denied" ? "policy_denied" : n,
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
function coworkMemoryContextMode(host, latestCoworkMemoryVersion, r = false) {
  let s = memoryContextLeg();
  let h = memoryContextState.of(host);
  let y =
    s !== undefined && !isMemoryToggledOff(s) && !r && !isLaptopEmergencyOff(s)
      ? getHeldContext(host, h, s)
      : undefined;
  let S =
    s === "ccr"
      ? {}
      : {
          leg: "laptop",
        };
  if (y?.content == null)
    return latestCoworkMemoryVersion !== undefined
      ? {
          type: "cowork_memory_context",
          version: null,
          content: null,
          ...S,
        }
      : undefined;
  if (latestCoworkMemoryVersion === y.version) return;
  let w = (y.guidance ?? "") + y.content;
  if (s === "laptop") h.shown.add(w);
  noteShownText(host, w);
  return {
    type: "cowork_memory_context",
    version: y.version,
    content: w,
    ...S,
  };
}
//@ chunk-s61vbvea.js:70540-71014 placement
function withdrawCoworkMemoryContext(host, normalizedMessages) {
  let lastMemoryContextAttachment = findLastMemoryContextAttachment(normalizedMessages);
  if (lastMemoryContextAttachment === null || lastMemoryContextAttachment.content === null) return [];
  let s = memoryContextState.of(host);
  let h = memorySyncPolicyState();
  let y = memoryContextLeg(h);
  let S =
    (lastMemoryContextAttachment.version !== null &&
      s.withdrawnVersions.has(lastMemoryContextAttachment.version)) ||
    s.held?.content === null;
  if (!S) {
    if (y === undefined && hasRemoteSdkUrl()) return [];
    S =
      y !== undefined
        ? isMemoryToggledOff(y) || isLaptopEmergencyOff(y)
        : h !== "pending" && s.held !== undefined;
    if (!S && s.held === undefined && s.inflight !== undefined) return [];
  }
  let w = S ? buildWithdrawalAttachment(y) : getStaleMemoryContextAttachment(host, normalizedMessages);
  if (w === undefined) return [];
  logForDiagnosticsNoPII("info", "cowork_memory_context_withdrawn_from_spawned_loop", {
    leg: y ?? (hasRemoteSdkUrl() ? "ccr" : "laptop"),
  });
  return [w];
}
//@ chunk-s61vbvea.js:71014-71289 placement
/**
 * 记忆上下文已被撤回或已被替代时返回过期附件；笔记本端且需要时返回锚点附件。
 */
function getStaleMemoryContextAttachment(e, n) {
  let r = memoryContextState.of(e);
  let s = memoryContextLeg();
  let lastMemoryContextAttachment = findLastMemoryContextAttachment(n);
  if (
    lastMemoryContextAttachment !== null &&
    lastMemoryContextAttachment.content !== null &&
    lastMemoryContextAttachment.version !== null &&
    (r.withdrawnVersions.has(lastMemoryContextAttachment.version) ||
      (!r.servedVersions.has(lastMemoryContextAttachment.version) &&
        r.held?.content != null &&
        r.held.version !== lastMemoryContextAttachment.version))
  )
    return buildWithdrawalAttachment(s);
  return s === "laptop" && hasStaleListAttachment(e, r, n) ? emptyMemoryContext() : undefined;
}
//@ chunk-s61vbvea.js:71289-71401 placement
function buildWithdrawalAttachment(e) {
  return e === "ccr" || (e === undefined && hasRemoteSdkUrl())
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
function buildAnchorAttachment(e) {
  return e.leg === "laptop" && e.content !== null
    ? {
        type: "cowork_memory_context",
        version: e.version,
        content: null,
        anchor: true,
      }
    : undefined;
}
//@ chunk-s61vbvea.js:71538-71821 placement
/**
 * 笔记本端版本匹配时构造带指引与内容的记忆上下文附件，并登记为已展示。
 */
function buildLaptopMemoryAttachment(e, version) {
  let r = memoryContextLeg();
  let s =
    r === "laptop" && !isMemoryToggledOff(r) && !isLaptopEmergencyOff(r)
      ? getHeldContext(e, memoryContextState.of(e), r)
      : undefined;
  if (s?.content == null || version === null || s.version !== version) return;
  let h = memoryContextState.of(e);
  let y = (s.guidance ?? "") + s.content;
  h.shown.add(y);
  noteShownText(e, y);
  return {
    type: "cowork_memory_context",
    version: s.version,
    content: y,
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
function memoryContextLeg(e = memorySyncPolicyState()) {
  if (isMemoryContextViaCcr()) return "ccr";
  if (e === "open") return "laptop";
  return;
}
//@ chunk-s61vbvea.js:71995-72045 placement
function isMemoryToggledOff(e) {
  return getMemoryToggledOff() && (e === "laptop" || !isCoworkSession());
}
//@ chunk-s61vbvea.js:72045-72111 placement
function isLaptopEmergencyOff(e) {
  return e === "laptop" && memoryEmergencyOffHook?.emergencyOffStands() === true;
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
setAccountMemoryRedaction(isMemoryContextOff);
//@ chunk-s61vbvea.js:72302-72360 placement
/**
 * 导出函数 `resetMemoryContextForSession`：参数 e。
 */
function resetMemoryContextForSession(host) {
  if (hasRemoteSdkUrl()) return;
  let n = memoryContextState.of(host);
  withdrawServedVersions(n);
  resetMemoryContextState(n);
}
//@ chunk-s61vbvea.js:72360-72657 placement
function buildAccountMemoryRecallAttachment(e, n) {
  let flattened = n.flatMap((h) => {
    if (h.type !== "attachment") return [];
    let { attachment } = h;
    if (attachment.type === "account_memory_recall") return [attachment.content];
    return attachment.type === "cowork_memory_context" &&
      attachment.leg === "laptop" &&
      attachment.content !== null
      ? [attachment.content]
      : [];
  });
  let s = memoryContextState.of(e);
  return uniq([...s.shown, ...s.shownRecall, ...flattened]);
}
//@ chunk-s61vbvea.js:72657-72877 placement
/**
 * 收集消息中非笔记本端的记忆上下文内容，与账号记忆召回内容一起去重返回。
 */
function collectMemoryContextTexts(e, n) {
  let flattened = n.flatMap((s) =>
    s.type === "attachment" &&
    s.attachment.type === "cowork_memory_context" &&
    s.attachment.leg !== "laptop" &&
    s.attachment.content !== null
      ? [s.attachment.content]
      : [],
  );
  return uniq([...buildAccountMemoryRecallAttachment(e, n), ...flattened]);
}
//@ chunk-s61vbvea.js:72877-72988 placement
function getHeldContext(host, n, r) {
  return r === "laptop" &&
    n.held?.stop !== true &&
    (n.answeredForSession !== getSessionId() || isRepoReadProofStale(host, n))
    ? undefined
    : n.held;
}
//@ chunk-s61vbvea.js:72988-73049 placement
function isRepoReadProofStale(e, n) {
  return n.answeredWithRepoReadProof && isRepoReadStale(e, n);
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
function isListStale(e, n, version) {
  return (
    typeof version === "string" &&
    n.lists.has(version) &&
    n.lists.get(version) !== nullRepoReadEpoch(e)?.repoReadEpoch(e)
  );
}
//@ chunk-s61vbvea.js:73243-73524 placement
function hasStaleListAttachment(e, n, r) {
  if (n.lists.size === 0) return false;
  for (let j = r.length - 1; j >= 0; j--) {
    let h = r[j];
    if (h?.type !== "attachment" || h.attachment.type !== "cowork_memory_context" || h.attachment.anchor)
      continue;
    if (h.attachment.content === null) return false;
    if (isListStale(e, n, h.attachment.version)) return true;
  }
  return false;
}
//@ chunk-s61vbvea.js:73524-73632 placement
function isRepoReadStale(e, n) {
  return (
    n.answeredUnderRepoRead !== undefined &&
    n.answeredUnderRepoRead !== nullRepoReadEpoch(e)?.repoReadEpoch(e)
  );
}
//@ chunk-s61vbvea.js:73632-73729 placement
function withdrawServedVersions(e) {
  for (let servedVersion of e.servedVersions) e.withdrawnVersions.add(servedVersion);
  e.servedVersions.clear();
}
//@ chunk-s61vbvea.js:73729-74041 placement
/**
 * 重置记忆上下文状态：纪元加一，按需标记需撤回，清空持有内容、检查与进行中的请求等。
 */
function resetMemoryContextState(e) {
  e.epoch++;
  e.withdrawalOwed ||= e.held !== undefined;
  e.held = undefined;
  e.lastCheck = undefined;
  e.inflight = undefined;
  e.inflightFor = undefined;
  e.kicked = undefined;
  e.firstWaitSpent = false;
  e.failures = 0;
  e.notBefore = undefined;
  e.subagentMode = undefined;
  e.answeredForSession = undefined;
  e.answeredUnderRepoRead = undefined;
  e.answeredWithRepoReadProof = false;
}
//@ chunk-s61vbvea.js:74041-74145 placement
function withdrawMemoryContext(host, n, lastMemoryContextAttachment, s, h) {
  withdrawServedVersions(n);
  resetMemoryContextState(n);
  n.withdrawalOwed = false;
  return buildMemoryContextAttachments(
    host,
    n,
    {
      version: null,
      content: null,
    },
    lastMemoryContextAttachment,
    s,
    h,
  );
}
//@ chunk-s61vbvea.js:74145-74218 placement
/**
 * 导出函数 `maybeKickMemoryContextFetch`：参数 e, n = {}, r。
 */
function maybeKickMemoryContextFetch(e, n = {}, r) {
  let s = memoryContextLeg();
  if (s !== undefined && !isMemoryToggledOff(s)) kickMemoryContextFetch(e.host, s, n, r);
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
function refreshMemoryContext(rootSession, n = {}) {
  let r = memoryContextState.of(rootSession.host);
  if ((r.held !== undefined || r.inflight !== undefined) && !isMemoryContextViaCcr()) {
    withdrawServedVersions(r);
    resetMemoryContextState(r);
    return;
  }
  let s = () => {
    if (r.held === undefined && r.lastCheck === undefined && r.inflight === undefined)
      maybeKickMemoryContextFetch(rootSession, n);
  };
  if (r.inflight === undefined) s();
  else r.inflight.then(s, s).catch(() => {});
}
//@ chunk-s61vbvea.js:74553-74830 placement
function kickMemoryContextFetch(host, n, r, s) {
  let startTime = performance.now();
  let y = requestMemoryContextOnce(host, n, r);
  if (y === undefined) return;
  s?.asked(startTime);
  y.then(() => {
    let startTime_2 = performance.now();
    s?.answered(startTime_2);
    recordPhase("memory_context_fetch_ms", startTime_2 - startTime, startTime);
    let recordedPhase = getRecordedPhase("input_ready_ms");
    recordPhase(
      "memory_context_boot_spillover_ms",
      recordedPhase === undefined ? 0 : startTime_2 - recordedPhase,
    );
  }).catch(() => {});
}
//@ chunk-s61vbvea.js:74830-74899 placement
/**
 * 导出函数 `kickTurnEndCheckMemCtx`：参数 e, n = {}。
 */
function kickTurnEndCheckMemCtx(session, n = {}) {
  let r = memoryContextLeg();
  if (r !== undefined && !isMemoryToggledOff(r)) kickTurnEndCheck(session.host, r, n);
}
//@ chunk-s61vbvea.js:74899-75733 placement
function fetchTurnEndMemoryContext(session) {
  if (!isMemoryContextViaCcr() || isMemoryToggledOff("ccr")) return;
  let { host } = session;
  let r = memoryContextState.of(host);
  let lastCheck = r.lastCheck;
  if (
    lastCheck === undefined ||
    r.held?.stop ||
    r.inflight !== undefined ||
    r.lastGetUnanswered ||
    withinCheckWindow(lastCheck, LAST_CHECK_WINDOW_MS)
  )
    return;
  let memoryContextWindowMs = getMemoryContextWindowMs();
  if (!(memoryContextWindowMs > 0) || withinCheckWindow(lastCheck, memoryContextWindowMs / 2)) return;
  let earlierCheckAgeMs = Math.round(
    Math.max(Date.now() - lastCheck.wall, performance.now() - lastCheck.monotonic),
  );
  let version = r.held?.version;
  let epoch = r.epoch;
  let startTime = performance.now();
  let x = {
    answered: false,
    disowned: false,
  };
  let P = requestMemoryContextOnce(host, "ccr", {}, x);
  if (P === undefined) return;
  r.turnEndGet = {
    get: P,
    outcome: x,
  };
  P.then(() => {
    if (x.answered && r.lastCheck !== undefined)
      r.turnEndCheck = {
        check: r.lastCheck,
        replaced: lastCheck,
      };
    logForDiagnosticsNoPII("info", "memory_context_turn_end_get", {
      earlier_check_age_ms: earlierCheckAgeMs,
      get_took_ms: Math.round(performance.now() - startTime),
      answer_applied: x.answered,
      replaced_by_next_turn: !x.answered && x.disowned,
      discarded_by_memory_reset: !x.answered && !x.disowned && r.epoch !== epoch,
      version_changed: x.answered && r.held?.version !== version,
    });
  }).catch(() => {});
}
//@ chunk-s61vbvea.js:75733-75957 placement
/**
 * 本轮助手调用了记忆写入类工具且需要时，记录记忆写入截断的时间。
 */
function markMemoryWriteCut(host, n) {
  if (!isMemoryContextViaCcr()) return;
  if (
    n.some(
      (s) =>
        s.type === "assistant" &&
        Array.isArray(s.message.content) &&
        s.message.content.some((h) => h.type === "tool_use" && MEMORY_MUTATING_TOOLS.has(h.name)),
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
  let r = memoryContextState.of(host);
  if (r.held?.content == null || isMemoryToggledOff("ccr") || !isMemoryContextViaCcr()) return [];
  let memoryContextAttachments = buildMemoryContextAttachments(
    host,
    r,
    r.held,
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
function isCheckBeforeWriteCut(e) {
  return (
    e.lastCheck !== undefined &&
    e.memoryWriteCutAt !== undefined &&
    e.lastCheck.monotonic <= e.memoryWriteCutAt
  );
}
//@ chunk-s61vbvea.js:76290-76442 placement
function getMemoryContextWindowMs() {
  let e = 0;
  try {
    e = getFeatureValue_CACHED_MAY_BE_STALE(TENGU_FANCY_CRAB, 0);
  } catch (error) {
    logError(error);
    logForDiagnosticsNoPII("warn", "cowork_memory_context_window_flag_failed");
  }
  return typeof e === "number" ? Math.min(e, MAX_WAIT_SECONDS) * 1000 : 0;
}
//@ chunk-s61vbvea.js:76442-76533 placement
function withinCheckWindow(lastCheck, memoryContextWindowMs) {
  let r = Date.now() - lastCheck.wall;
  return (
    r >= 0 && r < memoryContextWindowMs && performance.now() - lastCheck.monotonic < memoryContextWindowMs
  );
}
//@ chunk-s61vbvea.js:76533-76608 placement
function checkMemoryContextAtTurnEnd(e, n, r) {
  if (r === "laptop" && n.held?.stop !== true && isRepoReadProofStale(e, n)) {
    withdrawServedVersions(n);
    resetMemoryContextState(n);
  }
}
//@ chunk-s61vbvea.js:76608-76938 placement
/**
 * 在轮次结束时发起记忆上下文检查：接管 CCR 的轮末请求，返回是否已回答、是否加入进行中请求等状态。
 */
function kickTurnEndCheck(host, n, r) {
  let s = memoryContextState.of(host);
  checkMemoryContextAtTurnEnd(host, s, n);
  let turnEndGet = n === "ccr" ? s.turnEndGet : undefined;
  if (turnEndGet !== undefined && s.inflight === turnEndGet.get) {
    turnEndGet.outcome.disowned = true;
    s.inflight = undefined;
    s.inflightFor = undefined;
  }
  let joined = s.inflight !== undefined;
  let checkAtKick = s.lastCheck;
  let R = {
    answered: requestMemoryContextOnce(host, n, r),
    joined,
    sentFor: s.inflightFor,
    checkAtKick,
  };
  s.kicked = R.answered === undefined ? undefined : R;
  return R;
}
//@ chunk-s61vbvea.js:76938-76980 placement
function toolListProvider(e) {
  return () => e.options?.tools;
}
//@ chunk-s61vbvea.js:76980-79571 placement
/**
 * 按 laptop/ccr 两种场景收集协作记忆上下文并生成附件
 */
function collectCoworkMemoryContext(e, toolUseContext, querySource) {
  if (toolUseContext.agentId || classifyQuerySource(querySource) !== "main") return;
  let host = toolUseContext.session.host;
  memoryContextState.of(host).placeTool = createMemoryServerVerifier(toolListProvider(toolUseContext));
  let h = memorySyncPolicyState();
  let y = memoryContextLeg(h);
  if (y === undefined) {
    if (hasRemoteSdkUrl()) return;
    let ke = memoryContextState.of(toolUseContext.session.host);
    reportGateState(ke, h);
    if (h === "pending") {
      if (ke.held === undefined && ke.withdrawalOwed) {
        ke.withdrawalOwed = false;
        withdrawServedVersions(ke);
        return Promise.resolve(
          buildMemoryContextAttachments(
            host,
            ke,
            {
              version: null,
              content: null,
            },
            findLastMemoryContextAttachment(e),
            e,
            "laptop",
          ),
        );
      }
      return;
    }
    if (ke.held === undefined && !ke.withdrawalOwed) {
      if (ke.inflight !== undefined) resetMemoryContextState(ke);
      return;
    }
    return Promise.resolve(withdrawMemoryContext(host, ke, findLastMemoryContextAttachment(e), e, "laptop"));
  }
  let S = memoryContextState.of(toolUseContext.session.host);
  if (y === "laptop") reportGateState(S, h);
  let lastMemoryContextAttachment = findLastMemoryContextAttachment(e);
  if (isMemoryToggledOff(y))
    return Promise.resolve(withdrawMemoryContext(host, S, lastMemoryContextAttachment, e, y));
  checkMemoryContextAtTurnEnd(host, S, y);
  let R = S.kicked ?? kickTurnEndCheck(toolUseContext.session.host, y, toolUseContext);
  let { answered, joined, sentFor } = R;
  S.kicked = undefined;
  let G = false;
  let L;
  let q = S.held?.stop === true;
  if (y === "ccr" && S.lastCheck !== undefined && !q) {
    let memoryContextWindowMs = getMemoryContextWindowMs();
    G = withinCheckWindow(S.lastCheck, memoryContextWindowMs);
    L =
      S.turnEndCheck?.check === S.lastCheck
        ? {
            last_check_sent_at_turn_end: true,
            earlier_check_still_in_window: withinCheckWindow(S.turnEndCheck.replaced, memoryContextWindowMs),
          }
        : {
            last_check_sent_at_turn_end: false,
          };
  }
  let CLAUDE_CODE_MEMORY_CONTEXT_NO_WAIT = y === "ccr" && !q && env.CLAUDE_CODE_MEMORY_CONTEXT_NO_WAIT;
  let Z = G && isRunningWithBun(S.held, lastMemoryContextAttachment, e);
  let ee = G && isCheckBeforeWriteCut(S);
  let ae = y === "laptop" && !q && isRepoReadStale(host, S);
  let se = ae ? undefined : getHeldContext(host, S, y);
  if (CLAUDE_CODE_MEMORY_CONTEXT_NO_WAIT || (se !== undefined && !Z && !ee && (y === "laptop" || G))) {
    if (y === "ccr") {
      let version = se?.version;
      let epoch = S.epoch;
      let startTime = performance.now();
      answered
        ?.then(() => {
          let nt = S.epoch !== epoch;
          logForDiagnosticsNoPII("info", "memory_context_per_turn_wait", {
            leg: y,
            wait_ms: 0,
            joined,
            cut: false,
            first: false,
            waited: false,
            answered: !nt && S.lastCheck !== R.checkAtKick,
            get_ended_after_ms: Math.round(performance.now() - startTime),
            missed_change: version !== undefined && !nt && S.held?.version !== version,
            ...L,
          });
        })
        .catch(() => {});
    }
    return Promise.resolve(buildMemoryContextAttachments(host, S, S.held, lastMemoryContextAttachment, e, y));
  }
  let epoch = S.epoch;
  let he = () => getHeldContext(host, S, y);
  let Se = (ke) => {
    if (y === "laptop" && ke && S.epoch === epoch) S.firstWaitSpent = true;
    if (y === "laptop" && S.held === undefined && S.withdrawalOwed) {
      S.withdrawalOwed = false;
      withdrawServedVersions(S);
      return buildMemoryContextAttachments(
        host,
        S,
        {
          version: null,
          content: null,
        },
        lastMemoryContextAttachment,
        e,
        y,
      );
    }
    return buildMemoryContextAttachments(host, S, he(), lastMemoryContextAttachment, e, y);
  };
  if (answered === undefined) return Promise.resolve(Se(false));
  let ce =
    (he() === undefined || ae) &&
    lastMemoryContextAttachment === null &&
    !(y === "laptop" && S.firstWaitSpent)
      ? FIRST_WAIT_MS
      : DEFAULT_WAIT_MS;
  let startTime = performance.now();
  let ie = false;
  let Ee = answered.then(() => {
    if (S.epoch !== epoch) return;
    ie = y === "ccr" && S.held?.stop !== true && isCheckBeforeWriteCut(S);
    return ie || (y === "laptop" && sentFor !== undefined && sentFor !== getSessionId())
      ? requestMemoryContextOnce(toolUseContext.session.host, y, toolUseContext)
      : undefined;
  });
  let Ie = raceWithAbortSignal(
    Ee.then(() => true),
    toolUseContext.abortController.signal,
    () => new AbortError(),
  );
  return withDeadline(Ie, ce).then(
    (ke) => {
      let waitMs = Math.round(performance.now() - startTime);
      logForDiagnosticsNoPII("info", "memory_context_per_turn_wait", {
        leg: y,
        wait_ms: waitMs,
        joined,
        cut: !ke,
        first: ce === FIRST_WAIT_MS,
        ...((ee || Z) && {
          waited: true,
          reason: ee ? "rewind_removed_memory_write" : "stale_notice_due",
        }),
        ...(ie && {
          second_check: true,
        }),
        ...(q && {
          route_stopped: true,
        }),
      });
      if (y === "laptop")
        logEvent("tengu_laptop_memory_context_wait", {
          wait_ms: waitMs,
          cut: !ke,
          first: ce === FIRST_WAIT_MS,
        });
      return Se(ke !== true);
    },
    () => Se(false),
  );
}
//@ chunk-s61vbvea.js:79571-79753 placement
function findLastMemoryContextAttachment(e) {
  for (let j = e.length - 1; j >= 0; j--) {
    let r = e[j];
    if (r?.type === "attachment" && r.attachment.type === "cowork_memory_context" && !r.attachment.anchor)
      return r.attachment;
  }
  return null;
}
//@ chunk-s61vbvea.js:79892-80457 placement
/**
 * 根据持有的记忆上下文生成附件：有内容且版本与上次不同则附上（含引导与过期提示）；内容被清空时附撤回；仅工具模式时附 toolsOnly。
 */
function buildMemoryContextAttachments(host, n, held, lastAttachment, messages, leg) {
  let S =
    leg === "laptop"
      ? {
          leg,
        }
      : {};
  if (held === undefined)
    return leg === "laptop" && hasStaleListAttachment(host, n, messages) ? [emptyMemoryContext()] : [];
  if (held.content !== null) {
    if (lastAttachment?.version === held.version) return [];
    let prefix = "";
    let text = (held.guidance ?? "") + prefix + held.content + buildStaleReadNotice(held.versions, messages);
    if (leg === "laptop") n.shown.add(text);
    noteShownText(host, text);
    return [
      ...[],
      {
        type: "cowork_memory_context",
        version: held.version,
        content: text,
        ...S,
      },
    ];
  }
  if (lastAttachment !== null && lastAttachment.content !== null)
    return [
      {
        type: "cowork_memory_context",
        version: held.version,
        content: null,
        ...S,
      },
    ];
  return isMemoryContextOff() && countToolCallsSince(messages, n.placeTool)
    ? [
        {
          type: "cowork_memory_context",
          version: held.version,
          content: null,
          toolsOnly: true,
          ...S,
        },
      ]
    : [];
}
//@ chunk-s61vbvea.js:80457-80918 placement
/**
 * 发起记忆上下文请求（复用在途请求）：laptop 侧紧急关闭时锁定为停止；冷却期内不请求；结束时清除在途标记。
 */
function requestMemoryContextOnce(host, n, r, s, h = false) {
  let y = memoryContextState.of(host);
  if (
    n === "laptop" &&
    !h &&
    y.held?.stop !== true &&
    memoryEmergencyOffHook?.emergencyOffStands() === true
  ) {
    withdrawServedVersions(y);
    y.held = {
      version: null,
      content: null,
      stop: true,
    };
  }
  if (y.held?.stop) return Promise.resolve();
  if (y.inflight !== undefined) return y.inflight;
  if (n === "laptop" && y.notBefore !== undefined) {
    let w = y.notBefore - Date.now();
    if (w > 0 && w <= MAX_HELD_VERSION_TTL_MS) return;
  }
  let S = requestMemoryContextWithRetry(host, n, r, s).finally(() => {
    if (y.inflight === S) {
      y.inflight = undefined;
      y.inflightFor = undefined;
    }
  });
  y.inflight = S;
  y.inflightFor = getSessionId();
  return S;
}
//@ chunk-s61vbvea.js:80918-81065 placement
async function requestMemoryContextWithRetry(e, n, r, s) {
  let h = memoryContextState.of(e);
  let { epoch } = h;
  let S = {
    again: false,
  };
  await requestMemoryContext(e, n, r, s, S);
  if (S.again && h.epoch === epoch && memoryContextLeg() === n && !isMemoryToggledOff(n))
    await requestMemoryContext(e, n, r, s);
}
//@ chunk-s61vbvea.js:81065-83633 placement
async function requestMemoryContext(e, n, { credentials, storageV5 }, h, y) {
  let S = memoryContextState.of(e);
  let version = S.held?.version;
  let epoch = S.epoch;
  let sessionId = getSessionId();
  let P = n === "ccr" ? "ccr_memory_context" : "laptop_memory_context";
  let j = false;
  let G;
  let L;
  let q;
  let Q = false;
  let Z = false;
  let ee = false;
  let ae = false;
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
    let he = undefined;
    let Se = null;
    let ce = false;
    let we = () => S.epoch !== epoch || h?.disowned === true;
    let ie = {};
    q = null?.repoReadEpoch(e);
    let Ee = null?.repoReadLogin();
    Q = Object.keys(ie).length > 0;
    G = "failed";
    let lastCheck = {
      wall: Date.now(),
      monotonic: performance.now(),
    };
    let ke = await apiClient.get(path, {
      ...opts,
      ...(opts.refreshOAuth && {
        refreshOAuth: false,
      }),
      headers: {
        ...opts.headers,
        "anthropic-version": "2023-06-01",
        ...false,
        ...ie,
        ...(version &&
          true &&
          S.answeredUnderRepoRead === q &&
          S.answeredWithRepoReadProof === Q && {
            "If-None-Match": `"${version}"`,
          }),
      },
      timeout: LATE_WAIT_MS,
      ...(Q && {
        maxRedirects: 0,
      }),
      validateStatus: () => true,
      ...false,
    });
    if (we()) return;
    ke.ok;
    if (!ke.ok) {
      logForDiagnosticsNoPII("warn", "cowork_memory_context_gated", {
        leg: n,
        reason: ke.reason,
      });
      logFeatureSad(P, ke.reason.replaceAll("-", "_"));
      G = undefined;
      return;
    }
    let headers = ke.response.headers;
    switch (((L = headers["retry-after"]), ke.status)) {
      case 200: {
        let We = memoryContextResponseSchema().safeParse(ke.data);
        if (!We.success) {
          logForDiagnosticsNoPII("warn", "cowork_memory_context_malformed", {
            leg: n,
          });
          logFeatureBad(P, "malformed");
          return;
        }
        let content = normalizeMemoryText(We.data.content);
        S.servedVersions.add(We.data.version);
        S.withdrawnVersions.delete(We.data.version);
        S.held = {
          version: We.data.version,
          content,
          versions: We.data.versions,
          ...false,
          ...false,
          ...(We.data.post_turn_instruction !== undefined && {
            postTurnInstruction: normalizeMemoryText(We.data.post_turn_instruction),
          }),
        };
        G = "answered";
        S.lastCheck = lastCheck;
        logForDiagnosticsNoPII("info", "cowork_memory_context_fetched", {
          leg: n,
        });
        logFeatureOutcome(P, false, "fetched", undefined);
        return;
      }
      case 304:
        G = "answered";
        Z = true;
        S.lastCheck = lastCheck;
        logForDiagnosticsNoPII("info", "cowork_memory_context_unchanged", {
          leg: n,
        });
        logFeatureOutcome(P, false, "unchanged");
        return;
      case 204: {
        let etag = headers.etag;
        let nt = memoryContextVersionSchema().safeParse(
          typeof etag === "string" ? etag.replace(/^(?:W\/)?"(.*)"$/, "$1") : etag,
        );
        let Be = !nt.success;
        withdrawServedVersions(S);
        S.held = {
          version: nt.success ? nt.data : null,
          content: null,
          ...(Be && {
            stop: true,
          }),
        };
        G = "answered";
        S.lastCheck = lastCheck;
        logForDiagnosticsNoPII("info", "cowork_memory_context_none", {
          leg: n,
          stop: Be,
        });
        logFeatureOutcome(P, false, Be ? "stop_org" : nt.success ? "none" : "none_no_etag");
        return;
      }
      case 401:
      case 403:
        break;
      case 429:
      case 503:
        logForDiagnosticsNoPII("info", "cowork_memory_context_not_built", {
          leg: n,
          status: ke.status,
        });
        logFeatureSad(P, "not_built");
        return;
      default:
        break;
    }
    logForDiagnosticsNoPII("warn", "cowork_memory_context_http_error", {
      leg: n,
      status: ke.status,
    });
    logFeatureSad(P, `http_${ke.status}`);
  } catch (error) {
    let { kind } = classifyAxiosError(error);
    if (h?.disowned !== true) {
      logForDiagnosticsNoPII("warn", "cowork_memory_context_exception", {
        leg: n,
        kind,
      });
      logFeatureSad(P, kind);
    }
  } finally {
    if (h !== undefined) h.answered = G === "answered";
    if (n === "ccr" && S.epoch === epoch && h?.disowned !== true) S.lastGetUnanswered = G !== "answered";
  }
}
//@ chunk-s61vbvea.js:83633-83680 placement
/**
 * 导出函数 `heldMemoryVersions`：参数 e，返回 memoryContextState.of(e).held?.versions。
 */
function heldMemoryVersions(e) {
  return memoryContextState.of(e).held?.versions;
}
//@ chunk-s61vbvea.js:83680-83738 placement
/**
 * 导出函数 `heldPostTurnInstruction`：参数 e，返回 memoryContextState.of(e).held?.postTurnInstruction。
 */
function heldPostTurnInstruction(e) {
  return memoryContextState.of(e).held?.postTurnInstruction;
}
//@ chunk-s61vbvea.js:83738-83984 placement
/**
 * 把本次读取到的文件版本合并到持有的记忆上下文版本表（版本表未变时）。
 */
function mergeReadVersions(e, n, r) {
  let s = memoryContextState.of(e);
  let held = s.held;
  if (held?.versions !== n) return;
  let y;
  try {
    y = collectMemoryReadPaths(r).last;
  } catch {
    logForDiagnosticsNoPII("warn", "cowork_memory_context_pass_versions_failed");
    return;
  }
  if (y.size === 0) return;
  s.held = {
    ...held,
    versions: {
      ...held.versions,
      ...Object.fromEntries(y),
    },
  };
}
//@ chunk-s61vbvea.js:83984-84109 placement
/**
 * 生成读取已过期的提示文字，出错时记录诊断并返回空串。
 */
function buildStaleReadNotice(e, n, findStaleCarriedReads = findStaleReads) {
  if (!e) return "";
  try {
    return formatMemoryUpdates(findStaleCarriedReads(e, n));
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
