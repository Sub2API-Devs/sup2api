/**
 * cli/print/adminRequestFrames.ts
 *
 * 2.1.316 新增：管理请求帧（限额请求配置、回退占位、CCR 历史加载失败上报）
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-0yw3taqg.js (22)
 * attribution: placement 22
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
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
import { stringSchema, objectSchema, booleanSchema } from "../../../vendor/zod/v4/classic/schemas.js";
import { DoctorLazy } from "../handlers/util.js";
import { createSignal } from "../../utils/signal.js";
import { HostScoped } from "../../utils/hostScoped.js";
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-0yw3taqg.js:210753-210898 placement
/**
 * 返回在一批用户消息结束时写入"回退替身"系统行的回调；记录 cli_rewind_stand_in 结果遥测。
 */
function makeRewindStandInWriter(messageUuid, priorMessages) {
  let priorUuids = new Set(priorMessages.map((message) => message.uuid));
  return async (batchUuid, atBatchEnd) => {
    try {
      reportRewindStandInOutcome(
        atBatchEnd ? await writeRewindStandIn(batchUuid, messageUuid, priorUuids) : "not_at_batch_end",
      );
    } catch (error) {
      logError(error);
      reportRewindStandInOutcome("failed");
    }
  };
}
//@ chunk-0yw3taqg.js:210898-211066 placement
function reportRewindStandInOutcome(outcome) {
  logForDiagnosticsNoPII("info", "cli_rewind_stand_in", {
    outcome,
  });
  if (outcome === "stored") logFeatureOk("rewind_stand_in");
  else if (outcome === "failed") logFeatureBad("rewind_stand_in", outcome);
  else logFeatureSad("rewind_stand_in", outcome);
}
//@ chunk-0yw3taqg.js:211066-211648 placement
/**
 * 在转录末尾追加 rewind_stand_in 系统行（若没有可回退目标），等待期间对话变化则放弃。
 */
async function writeRewindStandIn(messageUuid, conversationStore, excludedUuids) {
  let previousLength = conversationStore.conversation().length;
  let refusal = await checkRewindStandInPreconditions(messageUuid, conversationStore, excludedUuids);
  if (refusal !== undefined) return refusal;
  if (conversationStore.conversation().length !== previousLength) return "changed_in_wait";
  let standInMessage = {
    type: "system",
    subtype: "rewind_stand_in",
    source_uuid: messageUuid,
    content: "",
    level: "info",
    timestamp: new Date().toISOString(),
    uuid: randomUUID(),
  };
  conversationStore.append([standInMessage]);
  if (conversationStore.conversation().at(-1) !== standInMessage)
    await withDeadline(conversationStore.appendsSettled(), SUMMARY_RETRY_DELAY_MS);
  let conversation = conversationStore.conversation();
  if (!conversation.some((message) => message.uuid === standInMessage.uuid)) return "append_deferred";
  if (conversation.at(-1)?.uuid !== standInMessage.uuid || conversation.length !== previousLength + 1)
    return "changed_in_wait";
  await recordTranscript(
    conversationStore.conversation(),
    undefined,
    undefined,
    undefined,
    conversationStore.storageV5,
  );
  return "stored";
}
//@ chunk-0yw3taqg.js:211648-211705 placement
function hasRewindTarget(conversation, messageUuid) {
  return (
    findRewindTarget(conversation, messageUuid) !== null ||
    findStandInTarget(conversation, messageUuid) !== null
  );
}
//@ chunk-0yw3taqg.js:211705-212072 placement
async function checkRewindStandInPreconditions(messageUuid, { conversation, storageV5 }, excludedUuids) {
  let rows = conversation();
  if (hasRewindTarget(rows, messageUuid)) return "target_exists";
  if (hasTurnAfterLastSummary(rows)) return "later_input";
  let last = rows.findLast((message) => message.type === "user" || message.type === "assistant");
  if (last?.type !== "assistant") return "user_row_last";
  if (excludedUuids.has(last.uuid)) return "no_turn_here";
  await flushSessionStorage();
  let sessionId = getSessionId();
  for (let message of cleanMessagesForLogging(rows))
    if (!(await doesMessageExistInSession(sessionId, message.uuid, storageV5))) return "unstored_rows";
  return;
}
//@ chunk-0yw3taqg.js:212072-212312 placement
var HISTORY_READ_FAILED_SENTENCE =
  "the session's conversation history could not be read from CCR; not starting without it";
var HISTORY_RESTORE_FAILED_SENTENCE =
  "the session's conversation history could not be restored to the local transcript; not starting without it";
var TENGU_STREAMED_YETI = "tengu_streamed_yeti";
var HISTORY_FAILURE_EXIT_DELAY_MS = 2000;
//@ chunk-0yw3taqg.js:212312-212984 placement
/**
 * CCR 会话历史读取/恢复失败时，按原因输出拒绝启动的说明并结束。
 */
async function reportCcrHistoryLoadFailure(loadResult) {
  let report;
  switch (loadResult) {
    case "rows":
    case "no_rows":
    case "no_reader":
      return;
    case "read_failed":
      report = {
        reason: "history_read_failed",
        sentence: HISTORY_READ_FAILED_SENTENCE,
      };
      break;
    case "apply_failed":
      report = {
        reason: "history_apply_failed",
        sentence: HISTORY_RESTORE_FAILED_SENTENCE,
      };
      break;
  }
  if (isShuttingDown()) return "stopping";
  let isBridge = isBridgeEnvironment();
  let isFirstWorker = env.CLAUDE_CODE_WORKER_EPOCH === 1;
  if (loadResult === "read_failed" && (isBridge || isFirstWorker)) {
    logForDiagnosticsNoPII("warn", "resume_history_not_loaded", {
      reason: report.reason,
      boot_fails: false,
      first_worker: isFirstWorker,
    });
    return;
  }
  let flagFetchSettled = await withDeadline(
    initializeGrowthBook().then(
      () => true,
      () => true,
    ),
    HISTORY_FAILURE_EXIT_DELAY_MS,
  );
  if (isShuttingDown()) return "stopping";
  let bootFails = readFlagWithOverride(TENGU_STREAMED_YETI, {
    safe: false,
  });
  logForDiagnosticsNoPII(bootFails ? "error" : "warn", "resume_history_not_loaded", {
    reason: report.reason,
    boot_fails: bootFails,
    first_worker: isFirstWorker,
    flag_fetch_settled: flagFetchSettled === true,
    flag_payload_in_hand: hasFreshGrowthBookFeatures(),
  });
  return bootFails ? report : undefined;
}
//@ chunk-0yw3taqg.js:212984-213145 placement
var ADMIN_LIMIT_REQUEST_FLAG = "tengu_tallow_quoit";
var TENGU_TALLOW_QUOIT_GATE = "tengu_tallow_quoit_gate";
var ADMIN_REQUEST_BUTTON_LABEL = "Request more";
var ADMIN_REQUEST_DONE_LABEL = "Request sent to your admin \u2713";
var ADMIN_REQUEST_CONFIRM_PROMPT = "This notifies your organization's admins.";
//@ chunk-0yw3taqg.js:213145-213215 placement
function isValidAdminRequestLabel(label) {
  return label.length >= 1 && label.length <= 80 && /^\P{Cc}*$/u.test(label);
}
//@ chunk-0yw3taqg.js:213215-213276 placement
function adminRequestLabelSchema() {
  return stringSchema().refine(isValidAdminRequestLabel).optional().catch(undefined);
}
//@ chunk-0yw3taqg.js:213276-213400 placement
var adminLimitRequestConfigSchema; // deferred: uses DoctorLazy (../handlers/util.js) of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-0yw3taqg.js:213276", () => {
  adminLimitRequestConfigSchema = DoctorLazy(() =>
    objectSchema({
      vscode: objectSchema({
        label: adminRequestLabelSchema(),
        doneLabel: adminRequestLabelSchema(),
        confirm: booleanSchema().optional().catch(undefined),
        confirmPrompt: adminRequestLabelSchema(),
      }).optional(),
    }),
  );
});
//@ chunk-0yw3taqg.js:213400-213430 placement
function isAdminLimitRequestGateOn() {
  return getFeatureValue_CACHED_MAY_BE_STALE(TENGU_TALLOW_QUOIT_GATE, false);
}
//@ chunk-0yw3taqg.js:213430-213761 placement
/**
 * 读取 tengu_tallow_quoit 开关里的 IDE"向管理员申请额度"按钮配置（zod 校验）。
 */
function readAdminLimitRequestConfig() {
  let featureValue_CACHED_MAY_BE_STALE = getFeatureValue_CACHED_MAY_BE_STALE(ADMIN_LIMIT_REQUEST_FLAG, null);
  if (featureValue_CACHED_MAY_BE_STALE === null || featureValue_CACHED_MAY_BE_STALE === undefined)
    return null;
  let parsed = adminLimitRequestConfigSchema().safeParse(featureValue_CACHED_MAY_BE_STALE);
  if (!parsed.success) {
    logFeatureBad("ide_admin_limit_request", "flag_unparseable");
    return null;
  }
  if (parsed.data.vscode === undefined) return null;
  let vscode = parsed.data.vscode;
  return {
    label: vscode.label ?? ADMIN_REQUEST_BUTTON_LABEL,
    doneLabel: vscode.doneLabel ?? ADMIN_REQUEST_DONE_LABEL,
    confirm: vscode.confirm ?? false,
    confirmPrompt: vscode.confirmPrompt ?? ADMIN_REQUEST_CONFIRM_PROMPT,
  };
}
//@ chunk-0yw3taqg.js:213761-213830 placement
function createAdminRequestState() {
  return {
    state: {
      phase: "idle",
    },
    pending: null,
    changed: createSignal(),
  };
}
//@ chunk-0yw3taqg.js:213830-213847 placement
var ADMIN_REQUEST_STATE; // deferred: uses createAdminRequestState of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-0yw3taqg.js:213830", () => {
  ADMIN_REQUEST_STATE = new HostScoped(createAdminRequestState);
});
//@ chunk-0yw3taqg.js:213847-213884 placement
function getAdminRequestState() {
  return ADMIN_REQUEST_STATE.of(getRootSession().host);
}
//@ chunk-0yw3taqg.js:213884-213916 placement
function getAdminRequestPhase() {
  return getAdminRequestState().state;
}
//@ chunk-0yw3taqg.js:213916-213969 placement
function setAdminRequestPhase(state) {
  let adminRequestState = getAdminRequestState();
  adminRequestState.state = state;
  adminRequestState.changed.emit();
}
//@ chunk-0yw3taqg.js:213969-214017 placement
function subscribeAdminRequestPhase(listener) {
  return getAdminRequestState().changed.subscribe(listener);
}
//@ chunk-0yw3taqg.js:214017-214248 placement
var ADMIN_REQUESTABLE_OVERAGE_REASONS; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
var EXTRA_USAGE_CHECK_TIMEOUT_MS;
var ADMIN_REQUEST_FILING_TIMEOUT_MS;
var ADMIN_REQUEST_SETTLED_COOLDOWN_MS;
deferInit("chunk-0yw3taqg.js:214017", () => {
  ADMIN_REQUESTABLE_OVERAGE_REASONS = new Set([
    "org_spend_cap_reached",
    "org_level_disabled_until",
    "member_level_disabled",
    "member_zero_credit_limit",
    "seat_tier_level_disabled",
    "seat_tier_zero_credit_limit",
    "group_zero_credit_limit",
  ]);
  EXTRA_USAGE_CHECK_TIMEOUT_MS = 40000;
  ADMIN_REQUEST_FILING_TIMEOUT_MS = 20000;
  ADMIN_REQUEST_SETTLED_COOLDOWN_MS = 600000;
});
//@ chunk-0yw3taqg.js:214248-214491 placement
/**
 * 对被拒绝且原因属于组织/席位额度上限的限流事件，生成可向管理员申请的键。
 */
function adminRequestKeyForRateLimit(limitState) {
  if (
    limitState.status !== "rejected" ||
    limitState.rateLimitType === undefined ||
    limitState.overageDisabledReason === undefined ||
    !ADMIN_REQUESTABLE_OVERAGE_REASONS.has(limitState.overageDisabledReason) ||
    limitState.overageScope !== undefined
  )
    return null;
  return `${limitState.overageDisabledReason}:${limitState.overageResetsAt ?? limitState.resetsAt ?? ""}`;
}
//@ chunk-0yw3taqg.js:214491-214562 placement
function isSameAdminRequestKey(wall, other) {
  return wall.key === other.key && wall.accountEpoch === other.accountEpoch;
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
