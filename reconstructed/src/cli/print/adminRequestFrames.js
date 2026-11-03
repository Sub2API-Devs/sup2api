/**
 * cli/print/adminRequestFrames.ts
 *
 * 2.1.316 新增：管理请求帧（限额请求配置、回退占位、CCR 历史加载失败上报）
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-tyg7f3ek.js (22)
 * attribution: placement 22
 */
import {
  randomUUID,
  randomUUID as randomUUID_2,
  randomUUID as randomUUID_3,
  randomUUID as randomUUID_4,
  randomUUID as randomUUID_5,
  randomUUID as randomUUID_6,
  randomUUID as randomUUID_7,
  randomUUID as randomUUID_8,
  randomUUID as randomUUID_9,
  randomUUID as randomUUID_10,
  randomUUID as randomUUID_11,
  randomUUID as randomUUID_12,
  randomUUID as randomUUID_13,
  randomUUID as randomUUID_14,
  randomUUID as randomUUID_15,
  randomUUID as randomUUID_16,
  randomUUID as randomUUID_17,
  randomUUID as randomUUID_18,
  randomUUID as randomUUID_19,
  randomUUID as randomUUID_20,
  randomUUID as randomUUID_21,
} from "crypto";
import { logError } from "../../utils/log.js";
import { logForDiagnosticsNoPII } from "../../utils/diagLogs.js";
import { logFeatureOk, logFeatureBad, logFeatureSad } from "../../services/analytics/featureTelemetry.js";
import { withDeadline } from "../../utils/sleep.js";
import { tN } from "./sessionResult.js";
import {
  recordTranscript,
  flushSessionStorage,
  cleanMessagesForLogging,
  doesMessageExistInSession,
} from "../../utils/sessionStorage.js";
import { findRewindTarget, findStandInTarget, hasTurnAfterLastSummary } from "./rewindStandIn.js";
import { getSessionId, getRootSession } from "../../bootstrap/state.js";
import { isShuttingDown } from "../../utils/gracefulShutdown.js";
import { vS } from "../../utils/remoteEnvironment.js";
import { env } from "../../utils/env.js";
import {
  initializeGrowthBook,
  hasFreshGrowthBookFeatures,
  getFeatureValue_CACHED_MAY_BE_STALE,
} from "../../services/analytics/growthbook.js";
import { readFlagWithOverride } from "../../services/analytics/flagOverrides.js";
import { o, u, M } from "../../../vendor/zod/v4/classic/schemas.js";
import { DoctorLazy } from "../handlers/util.js";
import { createSignal } from "../../utils/signal.js";
import { HostScoped } from "../../utils/hostScoped.js";

/**
 * 返回在一批用户消息结束时写入"回退替身"系统行的回调；记录 cli_rewind_stand_in 结果遥测。
 */
//@ chunk-tyg7f3ek.js:177301-177446 placement
function makeRewindStandInWriter(e, n) {
  let r = new Set(n.map((s) => s.uuid));
  return async (s, h) => {
    try {
      reportRewindStandInOutcome(h ? await writeRewindStandIn(s, e, r) : "not_at_batch_end");
    } catch (error) {
      (logError(error), reportRewindStandInOutcome("failed"));
    }
  };
}
//@ chunk-tyg7f3ek.js:177446-177614 placement
function reportRewindStandInOutcome(e) {
  if ((logForDiagnosticsNoPII("info", "cli_rewind_stand_in", { outcome: e }), e === "stored"))
    logFeatureOk("rewind_stand_in");
  else if (e === "failed") logFeatureBad("rewind_stand_in", e);
  else logFeatureSad("rewind_stand_in", e);
}
/**
 * 在转录末尾追加 rewind_stand_in 系统行（若没有可回退目标），等待期间对话变化则放弃。
 */
//@ chunk-tyg7f3ek.js:177614-178196 placement
async function writeRewindStandIn(e, n, r) {
  let s = n.conversation().length,
    h = await checkRewindStandInPreconditions(e, n, r);
  if (h !== void 0) return h;
  if (n.conversation().length !== s) return "changed_in_wait";
  let y = {
    type: "system",
    subtype: "rewind_stand_in",
    source_uuid: e,
    content: "",
    level: "info",
    timestamp: new Date().toISOString(),
    uuid: randomUUID_6(),
  };
  if ((n.append([y]), n.conversation().at(-1) !== y)) await withDeadline(n.appendsSettled(), tN);
  let conversation = n.conversation();
  if (!conversation.some((R) => R.uuid === y.uuid)) return "append_deferred";
  if (conversation.at(-1)?.uuid !== y.uuid || conversation.length !== s + 1) return "changed_in_wait";
  return (await recordTranscript(n.conversation(), void 0, void 0, void 0, n.storageV5), "stored");
}
//@ chunk-tyg7f3ek.js:178196-178253 placement
function hasRewindTarget(e, n) {
  return findRewindTarget(e, n) !== null || findStandInTarget(e, n) !== null;
}
//@ chunk-tyg7f3ek.js:178253-178620 placement
async function checkRewindStandInPreconditions(e, { conversation: conversation, storageV5: storageV5 }, s) {
  let h = conversation();
  if (hasRewindTarget(h, e)) return "target_exists";
  if (hasTurnAfterLastSummary(h)) return "later_input";
  let last = h.findLast((R) => R.type === "user" || R.type === "assistant");
  if (last?.type !== "assistant") return "user_row_last";
  if (s.has(last.uuid)) return "no_turn_here";
  await flushSessionStorage();
  let S = getSessionId();
  for (let R of cleanMessagesForLogging(h))
    if (!(await doesMessageExistInSession(S, R.uuid, storageV5))) return "unstored_rows";
  return;
}
//@ chunk-tyg7f3ek.js:178620-178860 placement
var HISTORY_READ_FAILED_SENTENCE =
    "the session's conversation history could not be read from CCR; not starting without it",
  iN =
    "the session's conversation history could not be restored to the local transcript; not starting without it",
  TENGU_STREAMED_YETI = "tengu_streamed_yeti",
  cN = 2000;
/**
 * CCR 会话历史读取/恢复失败时，按原因输出拒绝启动的说明并结束。
 */
//@ chunk-tyg7f3ek.js:178860-179532 placement
async function reportCcrHistoryLoadFailure(e) {
  let n;
  switch (e) {
    case "rows":
    case "no_rows":
    case "no_reader":
      return;
    case "read_failed":
      n = { reason: "history_read_failed", sentence: HISTORY_READ_FAILED_SENTENCE };
      break;
    case "apply_failed":
      n = { reason: "history_apply_failed", sentence: iN };
      break;
  }
  if (isShuttingDown()) return "stopping";
  let r = vS(),
    s = env.CLAUDE_CODE_WORKER_EPOCH === 1;
  if (e === "read_failed" && (r || s)) {
    logForDiagnosticsNoPII("warn", "resume_history_not_loaded", {
      reason: n.reason,
      boot_fails: !1,
      first_worker: s,
    });
    return;
  }
  let h = await withDeadline(
    initializeGrowthBook().then(
      () => !0,
      () => !0,
    ),
    cN,
  );
  if (isShuttingDown()) return "stopping";
  let y = readFlagWithOverride(TENGU_STREAMED_YETI, { safe: !1 });
  return (
    logForDiagnosticsNoPII(y ? "error" : "warn", "resume_history_not_loaded", {
      reason: n.reason,
      boot_fails: y,
      first_worker: s,
      flag_fetch_settled: h === !0,
      flag_payload_in_hand: hasFreshGrowthBookFeatures(),
    }),
    y ? n : void 0
  );
}
//@ chunk-tyg7f3ek.js:179532-179693 placement
var ADMIN_LIMIT_REQUEST_FLAG = "tengu_tallow_quoit",
  TENGU_TALLOW_QUOIT_GATE = "tengu_tallow_quoit_gate",
  pN = "Request more",
  gN = "Request sent to your admin \u2713",
  hN = "This notifies your organization's admins.";
//@ chunk-tyg7f3ek.js:179693-179763 placement
function isValidAdminRequestLabel(e) {
  return e.length >= 1 && e.length <= 80 && /^\P{Cc}*$/u.test(e);
}
//@ chunk-tyg7f3ek.js:179763-179824 placement
function adminRequestLabelSchema() {
  return o()
    .refine(isValidAdminRequestLabel)
    .optional()
    .catch(void 0);
}
//@ chunk-tyg7f3ek.js:179824-179948 placement
var adminLimitRequestConfigSchema = DoctorLazy(() =>
  u({
    vscode: u({
      label: adminRequestLabelSchema(),
      doneLabel: adminRequestLabelSchema(),
      confirm: M()
        .optional()
        .catch(void 0),
      confirmPrompt: adminRequestLabelSchema(),
    }).optional(),
  }),
);
//@ chunk-tyg7f3ek.js:179948-179978 placement
function isAdminLimitRequestGateOn() {
  return getFeatureValue_CACHED_MAY_BE_STALE(TENGU_TALLOW_QUOIT_GATE, !1);
}
/**
 * 读取 tengu_tallow_quoit 开关里的 IDE"向管理员申请额度"按钮配置（zod 校验）。
 */
//@ chunk-tyg7f3ek.js:179978-180309 placement
function readAdminLimitRequestConfig() {
  let e = getFeatureValue_CACHED_MAY_BE_STALE(ADMIN_LIMIT_REQUEST_FLAG, null);
  if (e === null || e === void 0) return null;
  let safeParse = adminLimitRequestConfigSchema().safeParse(e);
  if (!safeParse.success) return (logFeatureBad("ide_admin_limit_request", "flag_unparseable"), null);
  if (safeParse.data.vscode === void 0) return null;
  let vscode = safeParse.data.vscode;
  return {
    label: vscode.label ?? pN,
    doneLabel: vscode.doneLabel ?? gN,
    confirm: vscode.confirm ?? !1,
    confirmPrompt: vscode.confirmPrompt ?? hN,
  };
}
//@ chunk-tyg7f3ek.js:180309-180378 placement
function createAdminRequestState() {
  return { state: { phase: "idle" }, pending: null, changed: createSignal() };
}
//@ chunk-tyg7f3ek.js:180378-180395 placement
var ADMIN_REQUEST_STATE = new HostScoped(createAdminRequestState);
//@ chunk-tyg7f3ek.js:180395-180432 placement
function getAdminRequestState() {
  return ADMIN_REQUEST_STATE.of(getRootSession().host);
}
//@ chunk-tyg7f3ek.js:180432-180464 placement
function getAdminRequestPhase() {
  return getAdminRequestState().state;
}
//@ chunk-tyg7f3ek.js:180464-180517 placement
function setAdminRequestPhase(e) {
  let n = getAdminRequestState();
  ((n.state = e), n.changed.emit());
}
//@ chunk-tyg7f3ek.js:180517-180565 placement
function subscribeAdminRequestPhase(e) {
  return getAdminRequestState().changed.subscribe(e);
}
//@ chunk-tyg7f3ek.js:180565-180796 placement
var ADMIN_REQUESTABLE_OVERAGE_REASONS = new Set([
    "org_spend_cap_reached",
    "org_level_disabled_until",
    "member_level_disabled",
    "member_zero_credit_limit",
    "seat_tier_level_disabled",
    "seat_tier_zero_credit_limit",
    "group_zero_credit_limit",
  ]),
  wN = 40000,
  vN = 20000,
  bN = 600000;
/**
 * 对被拒绝且原因属于组织/席位额度上限的限流事件，生成可向管理员申请的键。
 */
//@ chunk-tyg7f3ek.js:180796-181039 placement
function adminRequestKeyForRateLimit(e) {
  if (
    e.status !== "rejected" ||
    e.rateLimitType === void 0 ||
    e.overageDisabledReason === void 0 ||
    !ADMIN_REQUESTABLE_OVERAGE_REASONS.has(e.overageDisabledReason) ||
    e.overageScope !== void 0
  )
    return null;
  return `${e.overageDisabledReason}:${e.overageResetsAt ?? e.resetsAt ?? ""}`;
}
//@ chunk-tyg7f3ek.js:181039-181110 placement
function isSameAdminRequestKey(e, n) {
  return e.key === n.key && e.accountEpoch === n.accountEpoch;
}

export {
  makeRewindStandInWriter,
  hasRewindTarget,
  reportCcrHistoryLoadFailure,
  getAdminRequestPhase,
  adminRequestKeyForRateLimit,
  isAdminLimitRequestGateOn,
  isSameAdminRequestKey,
  bN,
  setAdminRequestPhase,
  wN,
  getAdminRequestState,
  readAdminLimitRequestConfig,
  vN,
  isValidAdminRequestLabel,
  subscribeAdminRequestPhase,
};
