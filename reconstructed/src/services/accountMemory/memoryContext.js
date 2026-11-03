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
import { o, u, pe, U } from "../../../vendor/zod/v4/classic/schemas.js";
import { Pas, NPt } from "../../memdir/memoryTool.js";
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
import { $li, countToolCallsSince } from "../../utils/messages/accountMemory.js";
import { uniq } from "../../utils/collections.js";
import { Br, n5e } from "../../utils/startupTiming.js";
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
var ma = null;
//@ chunk-s61vbvea.js:68463-68490 placement
function ag(e) {
  return null;
}
//@ chunk-s61vbvea.js:68490-68515 placement
var Qm = "/memory_context";
//@ chunk-s61vbvea.js:68515-68580 placement
var TENGU_FANCY_CRAB = "tengu_fancy_crab",
  UT = 900,
  BT = 60000,
  GT = 2000,
  tu = 5000,
  Zm = 1e4;
//@ chunk-s61vbvea.js:68580-68637 placement
var WT = 3600000,
  lg = 262144,
  cg = 4 * lg + 1024,
  ug = 4096,
  kX = cg + 4 * ug;
/**
 * 记忆上下文版本号与服务端响应的 schema（版本、内容、各文件版本、指引、变体、轮后指令）。
 */
//@ chunk-s61vbvea.js:68637-68959 placement
var memoryContextVersionSchema = DoctorLazy(() => o().regex(/^[A-Za-z0-9._:+/=-]{1,256}$/)),
  memoryContextResponseSchema = DoctorLazy(() =>
    u({
      version: memoryContextVersionSchema(),
      content: o().min(1).max(lg),
      versions: pe(o(), o())
        .optional()
        .catch(void 0),
      guidance: o()
        .min(1)
        .max(ug)
        .optional()
        .catch(void 0),
      variant: U(["tools"])
        .optional()
        .catch(void 0),
      post_turn_instruction: o()
        .min(1)
        .max(Pas)
        .optional()
        .catch(void 0),
    }),
  );
//@ chunk-s61vbvea.js:68959-69020 placement
function nu(e, n, r, s) {
  if (n) logFeatureOk(e, { outcome: fromEnum(r), ...s });
  else logFeatureOk(e);
}
/**
 * 每会话的协作记忆上下文状态：回答记录、列表、在途请求、持有内容、显示过的文本、失败计数、已发布/撤回版本等。
 */
//@ chunk-s61vbvea.js:69020-69531 placement
var memoryContextState = new HostScoped(() => ({
  answeredForSession: void 0,
  answeredUnderRepoRead: void 0,
  answeredWithRepoReadProof: !1,
  lists: new Map(),
  listChanges: 0,
  inflightFor: void 0,
  held: void 0,
  inflight: void 0,
  kicked: void 0,
  epoch: 0,
  firstWaitSpent: !1,
  withdrawalOwed: !1,
  gateReported: void 0,
  lastCheck: void 0,
  memoryWriteCutAt: void 0,
  turnEndCheck: void 0,
  turnEndGet: void 0,
  shown: new Set(),
  shownRecall: [],
  failures: 0,
  notBefore: void 0,
  tools: !1,
  subagentMode: void 0,
  lastGetUnanswered: !1,
  placeTool: void 0,
  servedVersions: new Set(),
  withdrawnVersions: new Set(),
}));
//@ chunk-s61vbvea.js:69531-69585 placement
function Vr() {
  return isMemoryContextHost() && getFeatureValue_CACHED_MAY_BE_STALE("tengu_misty_anchor", !1);
}
//@ chunk-s61vbvea.js:69585-69703 placement
function isMemoryContextHost() {
  let e = getSessionEntrypoint(),
    n = env.SYSTEM_REMINDER_MEMORY_CONTEXT && (e === void 0 || ENTRYPOINT_KIND_SET.has(e));
  return Boolean((isCoworkSession() || n) && hasRemoteSdkUrl());
}
//@ chunk-s61vbvea.js:69703-69732 placement
function ga() {
  return "closed";
}
/**
 * 记忆同步的策略状态：策略不可得时按 HIPAA 与缓存情况为 denied/pending，未下发为 pending，否则按 allow_memory_sync 为 open/denied。
 */
//@ chunk-s61vbvea.js:69732-69883 placement
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
    e.gateReported = void 0;
    return;
  }
  if (e.gateReported !== n)
    ((e.gateReported = n),
      logFeatureSad(
        "laptop_memory_context",
        n === "pending" ? "policy_pending" : n === "denied" ? "policy_denied" : n,
      ));
}
//@ chunk-s61vbvea.js:70086-70116 placement
function vyn() {
  return "closed";
}
//@ chunk-s61vbvea.js:70116-70140 placement
function kyn() {
  return !1;
}
//@ chunk-s61vbvea.js:70140-70540 placement
function coworkMemoryContextMode(e, n, r = !1) {
  let s = Cr(),
    of = memoryContextState.of(e),
    y = s !== void 0 && !In(s) && !r && !ru(s) ? getHeldContext(e, of, s) : void 0,
    S = s === "ccr" ? {} : { leg: "laptop" };
  if (y?.content == null)
    return n !== void 0 ? { type: "cowork_memory_context", version: null, content: null, ...S } : void 0;
  if (n === y.version) return;
  let w = (y.guidance ?? "") + y.content;
  if (s === "laptop") of.shown.add(w);
  return (noteShownText(e, w), { type: "cowork_memory_context", version: y.version, content: w, ...S });
}
//@ chunk-s61vbvea.js:70540-71014 placement
function withdrawCoworkMemoryContext(e, n) {
  let r = findLastMemoryContextAttachment(n);
  if (r === null || r.content === null) return [];
  let of = memoryContextState.of(e),
    h = ga(),
    y = Cr(h),
    S = (r.version !== null && of.withdrawnVersions.has(r.version)) || of.held?.content === null;
  if (!S) {
    if (y === void 0 && hasRemoteSdkUrl()) return [];
    if (
      ((S = y !== void 0 ? In(y) || ru(y) : h !== "pending" && of.held !== void 0),
      !S && of.held === void 0 && of.inflight !== void 0)
    )
      return [];
  }
  let w = S ? buildWithdrawalAttachment(y) : getStaleMemoryContextAttachment(e, n);
  if (w === void 0) return [];
  return (
    logForDiagnosticsNoPII("info", "cowork_memory_context_withdrawn_from_spawned_loop", {
      leg: y ?? (hasRemoteSdkUrl() ? "ccr" : "laptop"),
    }),
    [w]
  );
}
/**
 * 记忆上下文已被撤回或已被替代时返回过期附件；笔记本端且需要时返回锚点附件。
 */
//@ chunk-s61vbvea.js:71014-71289 placement
function getStaleMemoryContextAttachment(e, n) {
  let of = memoryContextState.of(e),
    s = Cr(),
    h = findLastMemoryContextAttachment(n);
  if (
    h !== null &&
    h.content !== null &&
    h.version !== null &&
    (of.withdrawnVersions.has(h.version) ||
      (!of.servedVersions.has(h.version) && of.held?.content != null && of.held.version !== h.version))
  )
    return buildWithdrawalAttachment(s);
  return s === "laptop" && hasStaleListAttachment(e, of, n) ? ou() : void 0;
}
//@ chunk-s61vbvea.js:71289-71401 placement
function buildWithdrawalAttachment(e) {
  return e === "ccr" || (e === void 0 && hasRemoteSdkUrl())
    ? { type: "cowork_memory_context", version: null, content: null }
    : ou();
}
/**
 * 笔记本端有内容时构造只带版本的锚点附件。
 */
//@ chunk-s61vbvea.js:71401-71538 placement
function buildAnchorAttachment(e) {
  return e.leg === "laptop" && e.content !== null
    ? { type: "cowork_memory_context", version: e.version, content: null, anchor: !0 }
    : void 0;
}
/**
 * 笔记本端版本匹配时构造带指引与内容的记忆上下文附件，并登记为已展示。
 */
//@ chunk-s61vbvea.js:71538-71821 placement
function buildLaptopMemoryAttachment(e, n) {
  let r = Cr(),
    s = r === "laptop" && !In(r) && !ru(r) ? getHeldContext(e, memoryContextState.of(e), r) : void 0;
  if (s?.content == null || n === null || s.version !== n) return;
  let of = memoryContextState.of(e),
    y = (s.guidance ?? "") + s.content;
  return (
    of.shown.add(y),
    noteShownText(e, y),
    { type: "cowork_memory_context", version: s.version, content: y, leg: "laptop" }
  );
}
//@ chunk-s61vbvea.js:71821-71874 placement
function bN(e) {
  return accountMemoryServerState(currentMcpClients(e), WZn(e.session.host));
}
//@ chunk-s61vbvea.js:71874-71919 placement
function WZn(e) {
  return memoryContextState.of(e).subagentMode;
}
//@ chunk-s61vbvea.js:71919-71995 placement
function Cr(e = ga()) {
  if (Vr()) return "ccr";
  if (e === "open") return "laptop";
  return;
}
//@ chunk-s61vbvea.js:71995-72045 placement
function In(e) {
  return getMemoryToggledOff() && (e === "laptop" || !isCoworkSession());
}
//@ chunk-s61vbvea.js:72045-72111 placement
function ru(e) {
  return e === "laptop" && ma?.emergencyOffStands() === !0;
}
//@ chunk-s61vbvea.js:72111-72294 placement
function isMemoryContextOff() {
  if (Vr()) return In("ccr");
  switch (ga()) {
    case "open":
      return In("laptop");
    case "account_off":
    case "local_memory_off":
    case "denied":
      return !0;
    case "pending":
    case "closed":
      return !1;
  }
}
//@ chunk-s61vbvea.js:72294-72302 placement
$li(isMemoryContextOff);
//@ chunk-s61vbvea.js:72302-72360 placement
function iZs(e) {
  if (hasRemoteSdkUrl()) return;
  let of = memoryContextState.of(e);
  (Tr(of), resetMemoryContextState(of));
}
//@ chunk-s61vbvea.js:72360-72657 placement
function buildAccountMemoryRecallAttachment(e, n) {
  let flattened = n.flatMap((h) => {
      if (h.type !== "attachment") return [];
      let { attachment: attachment } = h;
      if (attachment.type === "account_memory_recall") return [attachment.content];
      return attachment.type === "cowork_memory_context" &&
        attachment.leg === "laptop" &&
        attachment.content !== null
        ? [attachment.content]
        : [];
    }),
    of = memoryContextState.of(e);
  return uniq([...of.shown, ...of.shownRecall, ...flattened]);
}
/**
 * 收集消息中非笔记本端的记忆上下文内容，与账号记忆召回内容一起去重返回。
 */
//@ chunk-s61vbvea.js:72657-72877 placement
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
function getHeldContext(e, n, r) {
  return r === "laptop" && n.held?.stop !== !0 && (n.answeredForSession !== getSessionId() || mg(e, n))
    ? void 0
    : n.held;
}
//@ chunk-s61vbvea.js:72988-73049 placement
function mg(e, n) {
  return n.answeredWithRepoReadProof && isRepoReadStale(e, n);
}
//@ chunk-s61vbvea.js:73049-73139 placement
function ou() {
  return { type: "cowork_memory_context", version: null, content: null, leg: "laptop" };
}
//@ chunk-s61vbvea.js:73139-73243 placement
function isListStale(e, n, r) {
  return typeof r === "string" && n.lists.has(r) && n.lists.get(r) !== ag(e)?.repoReadEpoch(e);
}
//@ chunk-s61vbvea.js:73243-73524 placement
function hasStaleListAttachment(e, n, r) {
  if (n.lists.size === 0) return !1;
  for (let s = r.length - 1; s >= 0; s--) {
    let h = r[s];
    if (h?.type !== "attachment" || h.attachment.type !== "cowork_memory_context" || h.attachment.anchor)
      continue;
    if (h.attachment.content === null) return !1;
    if (isListStale(e, n, h.attachment.version)) return !0;
  }
  return !1;
}
//@ chunk-s61vbvea.js:73524-73632 placement
function isRepoReadStale(e, n) {
  return n.answeredUnderRepoRead !== void 0 && n.answeredUnderRepoRead !== ag(e)?.repoReadEpoch(e);
}
//@ chunk-s61vbvea.js:73632-73729 placement
function Tr(e) {
  for (let servedVersion of e.servedVersions) e.withdrawnVersions.add(servedVersion);
  e.servedVersions.clear();
}
/**
 * 重置记忆上下文状态：纪元加一，按需标记需撤回，清空持有内容、检查与进行中的请求等。
 */
//@ chunk-s61vbvea.js:73729-74041 placement
function resetMemoryContextState(e) {
  (e.epoch++,
    (e.withdrawalOwed ||= e.held !== void 0),
    (e.held = void 0),
    (e.lastCheck = void 0),
    (e.inflight = void 0),
    (e.inflightFor = void 0),
    (e.kicked = void 0),
    (e.firstWaitSpent = !1),
    (e.failures = 0),
    (e.notBefore = void 0),
    (e.subagentMode = void 0),
    (e.answeredForSession = void 0),
    (e.answeredUnderRepoRead = void 0),
    (e.answeredWithRepoReadProof = !1));
}
//@ chunk-s61vbvea.js:74041-74145 placement
function withdrawMemoryContext(e, n, r, s, h) {
  return (
    Tr(n),
    resetMemoryContextState(n),
    (n.withdrawalOwed = !1),
    buildMemoryContextAttachments(e, n, { version: null, content: null }, r, s, h)
  );
}
//@ chunk-s61vbvea.js:74145-74218 placement
function yVo(e, n = {}, r) {
  let s = Cr();
  if (s !== void 0 && !In(s)) kickMemoryContextFetch(e.host, s, n, r);
}
//@ chunk-s61vbvea.js:74218-74293 placement
function lZs(e) {
  if (!Vr() || In("ccr")) return !1;
  return (kickMemoryContextFetch(e.host, "ccr", {}), !0);
}
/**
 * 刷新记忆上下文：持有内容但功能已关时撤回并重置；否则在没有持有与进行中请求时发起获取。
 */
//@ chunk-s61vbvea.js:74293-74553 placement
function refreshMemoryContext(e, n = {}) {
  let of = memoryContextState.of(e.host);
  if ((of.held !== void 0 || of.inflight !== void 0) && !Vr()) {
    (Tr(of), resetMemoryContextState(of));
    return;
  }
  let s = () => {
    if (of.held === void 0 && of.lastCheck === void 0 && of.inflight === void 0) yVo(e, n);
  };
  if (of.inflight === void 0) s();
  else of.inflight.then(s, s).catch(() => {});
}
//@ chunk-s61vbvea.js:74553-74830 placement
function kickMemoryContextFetch(e, n, r, s) {
  let startTime = performance.now(),
    y = requestMemoryContextOnce(e, n, r);
  if (y === void 0) return;
  (s?.asked(startTime),
    y
      .then(() => {
        let startTime_2 = performance.now();
        (s?.answered(startTime_2), Br("memory_context_fetch_ms", startTime_2 - startTime, startTime));
        let w = n5e("input_ready_ms");
        Br("memory_context_boot_spillover_ms", w === void 0 ? 0 : startTime_2 - w);
      })
      .catch(() => {}));
}
//@ chunk-s61vbvea.js:74830-74899 placement
function GZn(e, n = {}) {
  let r = Cr();
  if (r !== void 0 && !In(r)) kickTurnEndCheck(e.host, r, n);
}
//@ chunk-s61vbvea.js:74899-75733 placement
function fetchTurnEndMemoryContext(e) {
  if (!Vr() || In("ccr")) return;
  let { host: host } = e,
    of = memoryContextState.of(host),
    lastCheck = of.lastCheck;
  if (
    lastCheck === void 0 ||
    of.held?.stop ||
    of.inflight !== void 0 ||
    of.lastGetUnanswered ||
    fa(lastCheck, BT)
  )
    return;
  let h = getMemoryContextWindowMs();
  if (!(h > 0) || fa(lastCheck, h / 2)) return;
  let rounded = Math.round(Math.max(Date.now() - lastCheck.wall, performance.now() - lastCheck.monotonic)),
    S = of.held?.version,
    epoch = of.epoch,
    startTime = performance.now(),
    x = { answered: !1, disowned: !1 },
    P = requestMemoryContextOnce(host, "ccr", {}, x);
  if (P === void 0) return;
  ((of.turnEndGet = { get: P, outcome: x }),
    P.then(() => {
      if (x.answered && of.lastCheck !== void 0)
        of.turnEndCheck = { check: of.lastCheck, replaced: lastCheck };
      logForDiagnosticsNoPII("info", "memory_context_turn_end_get", {
        earlier_check_age_ms: rounded,
        get_took_ms: Math.round(performance.now() - startTime),
        answer_applied: x.answered,
        replaced_by_next_turn: !x.answered && x.disowned,
        discarded_by_memory_reset: !x.answered && !x.disowned && of.epoch !== epoch,
        version_changed: x.answered && of.held?.version !== S,
      });
    }).catch(() => {}));
}
/**
 * 本轮助手调用了记忆写入类工具且需要时，记录记忆写入截断的时间。
 */
//@ chunk-s61vbvea.js:75733-75957 placement
function markMemoryWriteCut(e, n) {
  if (!Vr()) return;
  if (
    n.some(
      (s) =>
        s.type === "assistant" &&
        Array.isArray(s.message.content) &&
        s.message.content.some((h) => h.type === "tool_use" && NPt.has(h.name)),
    ) &&
    getMemoryContextWindowMs() > 0
  )
    memoryContextState.of(e).memoryWriteCutAt = performance.now();
}
/**
 * CCR 端在本轮中途收集记忆上下文附件（有持有内容且功能开启时）。
 */
//@ chunk-s61vbvea.js:75957-76175 placement
function collectCcrMemoryAttachments(e, n) {
  let of = memoryContextState.of(e);
  if (of.held?.content == null || In("ccr") || !Vr()) return [];
  let s = buildMemoryContextAttachments(e, of, of.held, findLastMemoryContextAttachment(n), n, "ccr");
  if (s.length > 0)
    logForDiagnosticsNoPII("info", "memory_context_turn_collected", { leg: "ccr", attached_mid_turn: !0 });
  return s;
}
//@ chunk-s61vbvea.js:76175-76290 placement
function isCheckBeforeWriteCut(e) {
  return (
    e.lastCheck !== void 0 && e.memoryWriteCutAt !== void 0 && e.lastCheck.monotonic <= e.memoryWriteCutAt
  );
}
//@ chunk-s61vbvea.js:76290-76442 placement
function getMemoryContextWindowMs() {
  let e = 0;
  try {
    e = getFeatureValue_CACHED_MAY_BE_STALE(TENGU_FANCY_CRAB, 0);
  } catch (error) {
    (logError(error), logForDiagnosticsNoPII("warn", "cowork_memory_context_window_flag_failed"));
  }
  return typeof e === "number" ? Math.min(e, UT) * 1000 : 0;
}
//@ chunk-s61vbvea.js:76442-76533 placement
function fa(e, n) {
  let r = Date.now() - e.wall;
  return r >= 0 && r < n && performance.now() - e.monotonic < n;
}
//@ chunk-s61vbvea.js:76533-76608 placement
function _g(e, n, r) {
  if (r === "laptop" && n.held?.stop !== !0 && mg(e, n)) (Tr(n), resetMemoryContextState(n));
}
/**
 * 在轮次结束时发起记忆上下文检查：接管 CCR 的轮末请求，返回是否已回答、是否加入进行中请求等状态。
 */
//@ chunk-s61vbvea.js:76608-76938 placement
function kickTurnEndCheck(e, n, r) {
  let of = memoryContextState.of(e);
  _g(e, of, n);
  let h = n === "ccr" ? of.turnEndGet : void 0;
  if (h !== void 0 && of.inflight === h.get)
    ((h.outcome.disowned = !0), (of.inflight = void 0), (of.inflightFor = void 0));
  let y = of.inflight !== void 0,
    lastCheck = of.lastCheck,
    R = {
      answered: requestMemoryContextOnce(e, n, r),
      joined: y,
      sentFor: of.inflightFor,
      checkAtKick: lastCheck,
    };
  return ((of.kicked = R.answered === void 0 ? void 0 : R), R);
}
//@ chunk-s61vbvea.js:76938-76980 placement
function qT(e) {
  return () => e.options?.tools;
}
/**
 * 按 laptop/ccr 两种场景收集协作记忆上下文并生成附件
 */
//@ chunk-s61vbvea.js:76980-79571 placement
function collectCoworkMemoryContext(e, n, r) {
  if (n.agentId || classifyQuerySource(r) !== "main") return;
  let host = n.session.host;
  memoryContextState.of(host).placeTool = createMemoryServerVerifier(qT(n));
  let h = ga(),
    y = Cr(h);
  if (y === void 0) {
    if (hasRemoteSdkUrl()) return;
    let of = memoryContextState.of(n.session.host);
    if ((reportGateState(of, h), h === "pending")) {
      if (of.held === void 0 && of.withdrawalOwed)
        return (
          (of.withdrawalOwed = !1),
          Tr(of),
          Promise.resolve(
            buildMemoryContextAttachments(
              host,
              of,
              { version: null, content: null },
              findLastMemoryContextAttachment(e),
              e,
              "laptop",
            ),
          )
        );
      return;
    }
    if (of.held === void 0 && !of.withdrawalOwed) {
      if (of.inflight !== void 0) resetMemoryContextState(of);
      return;
    }
    return Promise.resolve(withdrawMemoryContext(host, of, findLastMemoryContextAttachment(e), e, "laptop"));
  }
  let of = memoryContextState.of(n.session.host);
  if (y === "laptop") reportGateState(of, h);
  let w = findLastMemoryContextAttachment(e);
  if (In(y)) return Promise.resolve(withdrawMemoryContext(host, of, w, e, y));
  _g(host, of, y);
  let R = of.kicked ?? kickTurnEndCheck(n.session.host, y, n),
    { answered: answered, joined: joined, sentFor: sentFor } = R;
  of.kicked = void 0;
  let G = !1,
    L,
    q = of.held?.stop === !0;
  if (y === "ccr" && of.lastCheck !== void 0 && !q) {
    let ke = getMemoryContextWindowMs();
    ((G = fa(of.lastCheck, ke)),
      (L =
        of.turnEndCheck?.check === of.lastCheck
          ? {
              last_check_sent_at_turn_end: !0,
              earlier_check_still_in_window: fa(of.turnEndCheck.replaced, ke),
            }
          : { last_check_sent_at_turn_end: !1 }));
  }
  let Q = y === "ccr" && !q && env.CLAUDE_CODE_MEMORY_CONTEXT_NO_WAIT,
    Z = G && isRunningWithBun(of.held, w, e),
    ee = G && isCheckBeforeWriteCut(of),
    ae = y === "laptop" && !q && isRepoReadStale(host, of),
    se = ae ? void 0 : getHeldContext(host, of, y);
  if (Q || (se !== void 0 && !Z && !ee && (y === "laptop" || G))) {
    if (y === "ccr") {
      let ke = se?.version,
        epoch = of.epoch,
        startTime = performance.now();
      answered
        ?.then(() => {
          let nt = of.epoch !== epoch;
          logForDiagnosticsNoPII("info", "memory_context_per_turn_wait", {
            leg: y,
            wait_ms: 0,
            joined: joined,
            cut: !1,
            first: !1,
            waited: !1,
            answered: !nt && of.lastCheck !== R.checkAtKick,
            get_ended_after_ms: Math.round(performance.now() - startTime),
            missed_change: ke !== void 0 && !nt && of.held?.version !== ke,
            ...L,
          });
        })
        .catch(() => {});
    }
    return Promise.resolve(buildMemoryContextAttachments(host, of, of.held, w, e, y));
  }
  let epoch = of.epoch,
    he = () => getHeldContext(host, of, y),
    Se = (ke) => {
      if (y === "laptop" && ke && of.epoch === epoch) of.firstWaitSpent = !0;
      if (y === "laptop" && of.held === void 0 && of.withdrawalOwed)
        return (
          (of.withdrawalOwed = !1),
          Tr(of),
          buildMemoryContextAttachments(host, of, { version: null, content: null }, w, e, y)
        );
      return buildMemoryContextAttachments(host, of, he(), w, e, y);
    };
  if (answered === void 0) return Promise.resolve(Se(!1));
  let ce = (he() === void 0 || ae) && w === null && !(y === "laptop" && of.firstWaitSpent) ? tu : GT,
    startTime = performance.now(),
    ie = !1,
    Ee = answered.then(() => {
      if (of.epoch !== epoch) return;
      return (
        (ie = y === "ccr" && of.held?.stop !== !0 && isCheckBeforeWriteCut(of)),
        ie || (y === "laptop" && sentFor !== void 0 && sentFor !== getSessionId())
          ? requestMemoryContextOnce(n.session.host, y, n)
          : void 0
      );
    }),
    Ie = raceWithAbortSignal(
      Ee.then(() => !0),
      n.abortController.signal,
      () => new AbortError(),
    );
  return withDeadline(Ie, ce).then(
    (ke) => {
      let rounded = Math.round(performance.now() - startTime);
      if (
        (logForDiagnosticsNoPII("info", "memory_context_per_turn_wait", {
          leg: y,
          wait_ms: rounded,
          joined: joined,
          cut: !ke,
          first: ce === tu,
          ...((ee || Z) && { waited: !0, reason: ee ? "rewind_removed_memory_write" : "stale_notice_due" }),
          ...(ie && { second_check: !0 }),
          ...(q && { route_stopped: !0 }),
        }),
        y === "laptop")
      )
        logEvent("tengu_laptop_memory_context_wait", { wait_ms: rounded, cut: !ke, first: ce === tu });
      return Se(ke !== !0);
    },
    () => Se(!1),
  );
}
//@ chunk-s61vbvea.js:79571-79753 placement
function findLastMemoryContextAttachment(e) {
  for (let n = e.length - 1; n >= 0; n--) {
    let r = e[n];
    if (r?.type === "attachment" && r.attachment.type === "cowork_memory_context" && !r.attachment.anchor)
      return r.attachment;
  }
  return null;
}
/**
 * 根据持有的记忆上下文生成附件：有内容且版本与上次不同则附上（含引导与过期提示）；内容被清空时附撤回；仅工具模式时附 toolsOnly。
 */
//@ chunk-s61vbvea.js:79892-80457 placement
function buildMemoryContextAttachments(e, n, held, lastAttachment, messages, leg) {
  let S = leg === "laptop" ? { leg: leg } : {};
  if (held === void 0) return leg === "laptop" && hasStaleListAttachment(e, n, messages) ? [ou()] : [];
  if (held.content !== null) {
    if (lastAttachment?.version === held.version) return [];
    let prefix = "",
      text = (held.guidance ?? "") + prefix + held.content + buildStaleReadNotice(held.versions, messages);
    if (leg === "laptop") n.shown.add(text);
    return (
      noteShownText(e, text),
      [...[], { type: "cowork_memory_context", version: held.version, content: text, ...S }]
    );
  }
  if (lastAttachment !== null && lastAttachment.content !== null)
    return [{ type: "cowork_memory_context", version: held.version, content: null, ...S }];
  return isMemoryContextOff() && countToolCallsSince(messages, n.placeTool)
    ? [{ type: "cowork_memory_context", version: held.version, content: null, toolsOnly: !0, ...S }]
    : [];
}
/**
 * 发起记忆上下文请求（复用在途请求）：laptop 侧紧急关闭时锁定为停止；冷却期内不请求；结束时清除在途标记。
 */
//@ chunk-s61vbvea.js:80457-80918 placement
function requestMemoryContextOnce(e, n, r, s, h = !1) {
  let of = memoryContextState.of(e);
  if (n === "laptop" && !h && of.held?.stop !== !0 && ma?.emergencyOffStands() === !0)
    (Tr(of), (of.held = { version: null, content: null, stop: !0 }));
  if (of.held?.stop) return Promise.resolve();
  if (of.inflight !== void 0) return of.inflight;
  if (n === "laptop" && of.notBefore !== void 0) {
    let w = of.notBefore - Date.now();
    if (w > 0 && w <= WT) return;
  }
  let S = requestMemoryContextWithRetry(e, n, r, s).finally(() => {
    if (of.inflight === S) ((of.inflight = void 0), (of.inflightFor = void 0));
  });
  return ((of.inflight = S), (of.inflightFor = getSessionId()), S);
}
//@ chunk-s61vbvea.js:80918-81065 placement
async function requestMemoryContextWithRetry(e, n, r, s) {
  let of = memoryContextState.of(e),
    { epoch: epoch } = of,
    S = { again: !1 };
  if ((await requestMemoryContext(e, n, r, s, S), S.again && of.epoch === epoch && Cr() === n && !In(n)))
    await requestMemoryContext(e, n, r, s);
}
//@ chunk-s61vbvea.js:81065-83633 placement
async function requestMemoryContext(e, n, { credentials: credentials, storageV5: storageV5 }, h, y) {
  let of = memoryContextState.of(e),
    w = of.held?.version,
    epoch = of.epoch,
    x = getSessionId(),
    P = n === "ccr" ? "ccr_memory_context" : "laptop_memory_context",
    j = !1,
    G,
    L,
    q,
    Q = !1,
    Z = !1,
    ee = !1,
    ae = !1;
  try {
    let { path: path, opts: opts } = {
        path: env.CLAUDE_CODE_MEMORY_CONTEXT_NO_WAIT ? `${Qm}?takes_late_ms=${Zm}` : Qm,
        opts: { host: "ccr-session", auth: "session-jwt", maxContentLength: cg },
      },
      he = void 0,
      Se = null,
      ce = !1,
      we = () => of.epoch !== epoch || h?.disowned === !0,
      ie = {};
    q = null?.repoReadEpoch(e);
    let Ee = null?.repoReadLogin();
    ((Q = Object.keys(ie).length > 0), (G = "failed"));
    let Ie = { wall: Date.now(), monotonic: performance.now() },
      ke = await apiClient.get(path, {
        ...opts,
        ...(opts.refreshOAuth && { refreshOAuth: !1 }),
        headers: {
          ...opts.headers,
          "anthropic-version": "2023-06-01",
          ...!1,
          ...ie,
          ...(w &&
            !0 &&
            of.answeredUnderRepoRead === q &&
            of.answeredWithRepoReadProof === Q && { "If-None-Match": `"${w}"` }),
        },
        timeout: Zm,
        ...(Q && { maxRedirects: 0 }),
        validateStatus: () => !0,
        ...!1,
      });
    if (we()) return;
    if ((ke.ok, !ke.ok)) {
      (logForDiagnosticsNoPII("warn", "cowork_memory_context_gated", { leg: n, reason: ke.reason }),
        logFeatureSad(P, ke.reason.replaceAll("-", "_")),
        (G = void 0));
      return;
    }
    let headers = ke.response.headers;
    switch (((L = headers["retry-after"]), ke.status)) {
      case 200: {
        let safeParse = memoryContextResponseSchema().safeParse(ke.data);
        if (!safeParse.success) {
          (logForDiagnosticsNoPII("warn", "cowork_memory_context_malformed", { leg: n }),
            logFeatureBad(P, "malformed"));
          return;
        }
        let nt = normalizeMemoryText(safeParse.data.content);
        (of.servedVersions.add(safeParse.data.version),
          of.withdrawnVersions.delete(safeParse.data.version),
          (of.held = {
            version: safeParse.data.version,
            content: nt,
            versions: safeParse.data.versions,
            ...!1,
            ...!1,
            ...(safeParse.data.post_turn_instruction !== void 0 && {
              postTurnInstruction: normalizeMemoryText(safeParse.data.post_turn_instruction),
            }),
          }),
          (G = "answered"),
          (of.lastCheck = Ie),
          logForDiagnosticsNoPII("info", "cowork_memory_context_fetched", { leg: n }),
          nu(P, !1, "fetched", void 0));
        return;
      }
      case 304:
        ((G = "answered"),
          (Z = !0),
          (of.lastCheck = Ie),
          logForDiagnosticsNoPII("info", "cowork_memory_context_unchanged", { leg: n }),
          nu(P, !1, "unchanged"));
        return;
      case 204: {
        let etag = headers.etag,
          safeParse = memoryContextVersionSchema().safeParse(
            typeof etag === "string" ? etag.replace(/^(?:W\/)?"(.*)"$/, "$1") : etag,
          ),
          Be = !safeParse.success;
        (Tr(of),
          (of.held = {
            version: safeParse.success ? safeParse.data : null,
            content: null,
            ...(Be && { stop: !0 }),
          }),
          (G = "answered"),
          (of.lastCheck = Ie),
          logForDiagnosticsNoPII("info", "cowork_memory_context_none", { leg: n, stop: Be }),
          nu(P, !1, Be ? "stop_org" : safeParse.success ? "none" : "none_no_etag"));
        return;
      }
      case 401:
      case 403:
        break;
      case 429:
      case 503:
        (logForDiagnosticsNoPII("info", "cowork_memory_context_not_built", { leg: n, status: ke.status }),
          logFeatureSad(P, "not_built"));
        return;
      default:
        break;
    }
    (logForDiagnosticsNoPII("warn", "cowork_memory_context_http_error", { leg: n, status: ke.status }),
      logFeatureSad(P, `http_${ke.status}`));
  } catch (error) {
    let { kind: kind } = classifyAxiosError(error);
    if (h?.disowned !== !0)
      (logForDiagnosticsNoPII("warn", "cowork_memory_context_exception", { leg: n, kind: kind }),
        logFeatureSad(P, kind));
  } finally {
    if (h !== void 0) h.answered = G === "answered";
    if (n === "ccr" && of.epoch === epoch && h?.disowned !== !0) of.lastGetUnanswered = G !== "answered";
  }
}
//@ chunk-s61vbvea.js:83633-83680 placement
function mZs(e) {
  return memoryContextState.of(e).held?.versions;
}
//@ chunk-s61vbvea.js:83680-83738 placement
function gZs(e) {
  return memoryContextState.of(e).held?.postTurnInstruction;
}
/**
 * 把本次读取到的文件版本合并到持有的记忆上下文版本表（版本表未变时）。
 */
//@ chunk-s61vbvea.js:83738-83984 placement
function mergeReadVersions(e, n, r) {
  let of = memoryContextState.of(e),
    held = of.held;
  if (held?.versions !== n) return;
  let y;
  try {
    y = collectMemoryReadPaths(r).last;
  } catch {
    logForDiagnosticsNoPII("warn", "cowork_memory_context_pass_versions_failed");
    return;
  }
  if (y.size === 0) return;
  of.held = { ...held, versions: { ...held.versions, ...Object.fromEntries(y) } };
}
/**
 * 生成读取已过期的提示文字，出错时记录诊断并返回空串。
 */
//@ chunk-s61vbvea.js:83984-84109 placement
function buildStaleReadNotice(e, n, r = findStaleReads) {
  if (!e) return "";
  try {
    return formatMemoryUpdates(r(e, n));
  } catch {
    return (logForDiagnosticsNoPII("warn", "cowork_memory_context_notice_failed"), "");
  }
}

export {
  collectMemoryContextTexts,
  bN,
  getStaleMemoryContextAttachment,
  coworkMemoryContextMode,
  buildAnchorAttachment,
  buildLaptopMemoryAttachment,
  vyn,
  GZn,
  buildAccountMemoryRecallAttachment,
  lZs,
  refreshMemoryContext,
  yVo,
  collectCoworkMemoryContext,
  WZn,
  iZs,
  kyn,
  withdrawCoworkMemoryContext,
  collectCcrMemoryAttachments,
  getMemorySyncPolicyState,
  fetchTurnEndMemoryContext,
  markMemoryWriteCut,
  mZs,
  buildStaleReadNotice,
  gZs,
  mergeReadVersions,
};
