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
import { randomUUID } from "crypto";
import { logError } from "../../utils/log.js";
import { logForDiagnosticsNoPII } from "../../utils/diagLogs.js";
import { logFeatureOk, logFeatureBad, logFeatureSad } from "../../services/analytics/featureTelemetry.js";
import { withDeadline } from "../../utils/sleep.js";
import { SUMMARY_RETRY_DELAY_MS } from "./sessionResult.js";
import {
  recordTranscript,
  flushSessionStorage,
  cleanMessagesForLogging,
  doesMessageExistInSession,
} from "../../utils/sessionStorage.js";
import { findRewindTarget, findStandInTarget, hasTurnAfterLastSummary } from "./rewindStandIn.js";
import { getSessionId, getRootSession } from "../../bootstrap/state.js";
import { isShuttingDown } from "../../utils/gracefulShutdown.js";
import { isBridgeEnvironment } from "../../utils/remoteEnvironment.js";
import { env } from "../../utils/env.js";
import {
  initializeGrowthBook,
  hasFreshGrowthBookFeatures,
  getFeatureValue_CACHED_MAY_BE_STALE,
} from "../../services/analytics/growthbook.js";
import { readFlagWithOverride } from "../../services/analytics/flagOverrides.js";
import { string, u, M } from "../../../vendor/zod/v4/classic/schemas.js";
import { DoctorLazy } from "../handlers/util.js";
import { createSignal } from "../../utils/signal.js";
import { HostScoped } from "../../utils/hostScoped.js";

//@ chunk-tyg7f3ek.js:177301-177446 placement
/**
 * 返回在一批用户消息结束时写入"回退替身"系统行的回调；记录 cli_rewind_stand_in 结果遥测。
 */
function makeRewindStandInWriter(e, n) {
  let r = new Set(n.map((s) => s.uuid));
  return async (s, h) => {
    try {
      reportRewindStandInOutcome(h ? await writeRewindStandIn(s, e, r) : "not_at_batch_end");
    } catch (error) {
      logError(error);
      reportRewindStandInOutcome("failed");
    }
  };
}
//@ chunk-tyg7f3ek.js:177446-177614 placement
function reportRewindStandInOutcome(e) {
  logForDiagnosticsNoPII("info", "cli_rewind_stand_in", {
    outcome: e,
  });
  if (e === "stored") logFeatureOk("rewind_stand_in");
  else if (e === "failed") logFeatureBad("rewind_stand_in", e);
  else logFeatureSad("rewind_stand_in", e);
}
//@ chunk-tyg7f3ek.js:177614-178196 placement
/**
 * 在转录末尾追加 rewind_stand_in 系统行（若没有可回退目标），等待期间对话变化则放弃。
 */
async function writeRewindStandIn(e, n, r) {
  let s = n.conversation().length;
  let h = await checkRewindStandInPreconditions(e, n, r);
  if (h !== undefined) return h;
  if (n.conversation().length !== s) return "changed_in_wait";
  let y = {
    type: "system",
    subtype: "rewind_stand_in",
    source_uuid: e,
    content: "",
    level: "info",
    timestamp: new Date().toISOString(),
    uuid: randomUUID(),
  };
  n.append([y]);
  if (n.conversation().at(-1) !== y) await withDeadline(n.appendsSettled(), SUMMARY_RETRY_DELAY_MS);
  let S = n.conversation();
  if (!S.some((R) => R.uuid === y.uuid)) return "append_deferred";
  if (S.at(-1)?.uuid !== y.uuid || S.length !== s + 1) return "changed_in_wait";
  await recordTranscript(n.conversation(), undefined, undefined, undefined, n.storageV5);
  return "stored";
}
//@ chunk-tyg7f3ek.js:178196-178253 placement
function hasRewindTarget(e, n) {
  return findRewindTarget(e, n) !== null || findStandInTarget(e, n) !== null;
}
//@ chunk-tyg7f3ek.js:178253-178620 placement
async function checkRewindStandInPreconditions(e, { conversation, storageV5 }, s) {
  let h = conversation();
  if (hasRewindTarget(h, e)) return "target_exists";
  if (hasTurnAfterLastSummary(h)) return "later_input";
  let last = h.findLast((R) => R.type === "user" || R.type === "assistant");
  if (last?.type !== "assistant") return "user_row_last";
  if (s.has(last.uuid)) return "no_turn_here";
  await flushSessionStorage();
  let sessionId = getSessionId();
  for (let R of cleanMessagesForLogging(h))
    if (!(await doesMessageExistInSession(sessionId, R.uuid, storageV5))) return "unstored_rows";
  return;
}
//@ chunk-tyg7f3ek.js:178620-178860 placement
var HISTORY_READ_FAILED_SENTENCE =
  "the session's conversation history could not be read from CCR; not starting without it";
var HISTORY_RESTORE_FAILED_SENTENCE =
  "the session's conversation history could not be restored to the local transcript; not starting without it";
var TENGU_STREAMED_YETI = "tengu_streamed_yeti";
var HISTORY_FAILURE_EXIT_DELAY_MS = 2000;
//@ chunk-tyg7f3ek.js:178860-179532 placement
/**
 * CCR 会话历史读取/恢复失败时，按原因输出拒绝启动的说明并结束。
 */
async function reportCcrHistoryLoadFailure(e) {
  let n;
  switch (e) {
    case "rows":
    case "no_rows":
    case "no_reader":
      return;
    case "read_failed":
      n = {
        reason: "history_read_failed",
        sentence: HISTORY_READ_FAILED_SENTENCE,
      };
      break;
    case "apply_failed":
      n = {
        reason: "history_apply_failed",
        sentence: HISTORY_RESTORE_FAILED_SENTENCE,
      };
      break;
  }
  if (isShuttingDown()) return "stopping";
  let r = isBridgeEnvironment();
  let s = env.CLAUDE_CODE_WORKER_EPOCH === 1;
  if (e === "read_failed" && (r || s)) {
    logForDiagnosticsNoPII("warn", "resume_history_not_loaded", {
      reason: n.reason,
      boot_fails: false,
      first_worker: s,
    });
    return;
  }
  let h = await withDeadline(
    initializeGrowthBook().then(
      () => true,
      () => true,
    ),
    HISTORY_FAILURE_EXIT_DELAY_MS,
  );
  if (isShuttingDown()) return "stopping";
  let flagWithOverride = readFlagWithOverride(TENGU_STREAMED_YETI, {
    safe: false,
  });
  logForDiagnosticsNoPII(flagWithOverride ? "error" : "warn", "resume_history_not_loaded", {
    reason: n.reason,
    boot_fails: flagWithOverride,
    first_worker: s,
    flag_fetch_settled: h === true,
    flag_payload_in_hand: hasFreshGrowthBookFeatures(),
  });
  return flagWithOverride ? n : undefined;
}
//@ chunk-tyg7f3ek.js:179532-179693 placement
var ADMIN_LIMIT_REQUEST_FLAG = "tengu_tallow_quoit";
var TENGU_TALLOW_QUOIT_GATE = "tengu_tallow_quoit_gate";
var ADMIN_REQUEST_BUTTON_LABEL = "Request more";
var ADMIN_REQUEST_DONE_LABEL = "Request sent to your admin \u2713";
var ADMIN_REQUEST_CONFIRM_PROMPT = "This notifies your organization's admins.";
//@ chunk-tyg7f3ek.js:179693-179763 placement
function isValidAdminRequestLabel(e) {
  return e.length >= 1 && e.length <= 80 && /^\P{Cc}*$/u.test(e);
}
//@ chunk-tyg7f3ek.js:179763-179824 placement
function adminRequestLabelSchema() {
  return string().refine(isValidAdminRequestLabel).optional().catch(undefined);
}
//@ chunk-tyg7f3ek.js:179824-179948 placement
var adminLimitRequestConfigSchema = DoctorLazy(() =>
  u({
    vscode: u({
      label: adminRequestLabelSchema(),
      doneLabel: adminRequestLabelSchema(),
      confirm: M().optional().catch(undefined),
      confirmPrompt: adminRequestLabelSchema(),
    }).optional(),
  }),
);
//@ chunk-tyg7f3ek.js:179948-179978 placement
function isAdminLimitRequestGateOn() {
  return getFeatureValue_CACHED_MAY_BE_STALE(TENGU_TALLOW_QUOIT_GATE, false);
}
//@ chunk-tyg7f3ek.js:179978-180309 placement
/**
 * 读取 tengu_tallow_quoit 开关里的 IDE"向管理员申请额度"按钮配置（zod 校验）。
 */
function readAdminLimitRequestConfig() {
  let featureValue_CACHED_MAY_BE_STALE = getFeatureValue_CACHED_MAY_BE_STALE(ADMIN_LIMIT_REQUEST_FLAG, null);
  if (featureValue_CACHED_MAY_BE_STALE === null || featureValue_CACHED_MAY_BE_STALE === undefined)
    return null;
  let n = adminLimitRequestConfigSchema().safeParse(featureValue_CACHED_MAY_BE_STALE);
  if (!n.success) {
    logFeatureBad("ide_admin_limit_request", "flag_unparseable");
    return null;
  }
  if (n.data.vscode === undefined) return null;
  let vscode = n.data.vscode;
  return {
    label: vscode.label ?? ADMIN_REQUEST_BUTTON_LABEL,
    doneLabel: vscode.doneLabel ?? ADMIN_REQUEST_DONE_LABEL,
    confirm: vscode.confirm ?? false,
    confirmPrompt: vscode.confirmPrompt ?? ADMIN_REQUEST_CONFIRM_PROMPT,
  };
}
//@ chunk-tyg7f3ek.js:180309-180378 placement
function createAdminRequestState() {
  return {
    state: {
      phase: "idle",
    },
    pending: null,
    changed: createSignal(),
  };
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
function setAdminRequestPhase(state) {
  let adminRequestState = getAdminRequestState();
  adminRequestState.state = state;
  adminRequestState.changed.emit();
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
]);
var EXTRA_USAGE_CHECK_TIMEOUT_MS = 40000;
var ADMIN_REQUEST_FILING_TIMEOUT_MS = 20000;
var ADMIN_REQUEST_SETTLED_COOLDOWN_MS = 600000;
//@ chunk-tyg7f3ek.js:180796-181039 placement
/**
 * 对被拒绝且原因属于组织/席位额度上限的限流事件，生成可向管理员申请的键。
 */
function adminRequestKeyForRateLimit(e) {
  if (
    e.status !== "rejected" ||
    e.rateLimitType === undefined ||
    e.overageDisabledReason === undefined ||
    !ADMIN_REQUESTABLE_OVERAGE_REASONS.has(e.overageDisabledReason) ||
    e.overageScope !== undefined
  )
    return null;
  return `${e.overageDisabledReason}:${e.overageResetsAt ?? e.resetsAt ?? ""}`;
}
//@ chunk-tyg7f3ek.js:181039-181110 placement
function isSameAdminRequestKey(wall, n) {
  return wall.key === n.key && wall.accountEpoch === n.accountEpoch;
}
export {
  makeRewindStandInWriter,
  hasRewindTarget,
  reportCcrHistoryLoadFailure,
  getAdminRequestPhase,
  adminRequestKeyForRateLimit,
  isAdminLimitRequestGateOn,
  isSameAdminRequestKey,
  ADMIN_REQUEST_SETTLED_COOLDOWN_MS,
  setAdminRequestPhase,
  EXTRA_USAGE_CHECK_TIMEOUT_MS,
  getAdminRequestState,
  readAdminLimitRequestConfig,
  ADMIN_REQUEST_FILING_TIMEOUT_MS,
  isValidAdminRequestLabel,
  subscribeAdminRequestPhase,
};
