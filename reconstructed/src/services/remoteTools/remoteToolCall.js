/**
 * services/remoteTools/remoteToolCall.ts
 *
 * 2.1.316 新增：执行一次远程工具调用：发送、等待（重连保持）、结果解析、遥测与中断处理
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-dtv8x2hx.js (32)
 * attribution: placement 32
 */
import { getFeatureValue_CACHED_MAY_BE_STALE } from "../analytics/growthbook.js";
import { ASK_FIRST_REASON_TEXTS } from "../../utils/permissions/askFirstReasons.js";
import { isAbortError, AbortError, errorMessage } from "../../utils/errors.js";
import { logError } from "../../utils/log.js";
import { logFeatureOk, logFeatureBad, logFeatureSad } from "../analytics/featureTelemetry.js";
import {
  convertRemoteToolResult,
  machineIdentity,
  isHostAwayRecheckable,
  interruptedResult,
  cancelledResult,
  remoteRejectMessage,
  sanitizeForPrompt,
  MAX_MACHINE_MESSAGE_CHARS,
} from "./resultConversion.js";
import { analyzeTurnTail, isHumanTurn } from "../../utils/turnOrigin.js";
import { logEvent } from "../analytics/index.js";
import { fromEnum, fromEnumOpt, lit } from "../analytics/safeMetadata.js";
import {
  detectTerminal,
  SERVED_OUTCOME_TABLE,
  isRanOutcome,
  clampServingLimit,
  normalizeWithdrawReason,
  isUnverifiedRefusal,
} from "../../remote/tools/protocolConstants.js";
import { SHELL_TOOL_NAMES } from "../../utils/shell/shellToolUtils.js";
import {
  remoteDirKind,
  remoteDirFacts,
  resolveRemoteFilePathInput,
  readBaselineForRemoteWrite,
  sameInputsModuloDefaults,
} from "./pathMapping.js";
import { getOriginKindLabel } from "../../utils/messages/promptOrigin.js";
import { RemoteAskSeat } from "./remoteAskSeat.js";
import { sanitizeMarkName } from "../../utils/startupMarks.js";
import { shortHash } from "../../utils/shortHash.js";
import {
  REMOTE_TOOL_PROTOCOL_LABEL,
  MAX_LINE_CHARS,
  buildRemoteToolCallMeta,
  WITHDRAWN,
  REMOTE_TOOL_CALL_META,
  MAX_MESSAGE_CHARS,
  wirePermissionMode,
} from "../../remote/tools/protocolSchemas.js";
import { isSemverString, splitOnDash } from "../../utils/model/modelCatalog/catalogCapabilities.js";
import { compareVersions } from "../../utils/semver.js";
import { sanitizeToolNameForAnalytics } from "../analytics/metadata.js";
import { withConfusables } from "../../utils/sanitization.js";
import { redactSecrets } from "../mcp/redactMcpErrors.js";
import { replaceControlChars } from "../../utils/resultError.js";
import { truncateToLength } from "../../utils/stringUtils.js";
import {
  clampedHostLimit,
  progressCheckTiming,
  SILENT_CALL_TIMING,
  awaitRemoteCallWithProgress,
  hostAnnouncesReturn,
  watchSilentCall,
  hostSupportsProgressChecks,
  isAutoModeCapableHost,
  hasCapability,
  hasSessionCapability,
  hasSessionCapabilityPair,
} from "./callProgress.js";
import {
  PROGRESS_WATCH_TIMING,
  formatRemoteOutputFence,
  checkRemoteToolPermission,
  isProceedVerdict,
  RemoteCallState,
  watchRemoteCallProgress,
  isSameHostName,
  maxRequestBytes,
} from "./remoteToolPermissions.js";
import { AwayEpisodeTracker } from "../awayEpisodes.js";
import { RemoteBackgroundCommands } from "./backgroundCommands.js";
import { RemoteCallLedger } from "./callOutcome.js";
import { logForDebugging } from "../../utils/debug.js";
import {
  isSameHostEpoch,
  restartNoticeFor,
  pendingPermissionNotice,
  neverReceivedNotice,
  stillRunningNotice,
  approvalWithdrawnNotice,
  approvalWithdrawUnconfirmedNotice,
  ServedCallRegistry,
} from "../../utils/remoteTools/restartNotices.js";
import {
  reconnectingStatus,
  refusedByMachineLine,
  approvalDroppedMessage,
  livenessCheckWithdrawnMessage,
  approvalWithdrawnMessage,
  approvalNotSentMessage,
  classifierOnlyApprovalMessage,
  approvalUploadUnconfirmedMessage,
  hostRestartedLostMessage,
  neverReceivedMessage,
  stillRunningMessage,
  callTimedOutMessage,
} from "./transportMessages.js";
import { SYNC_ANSWER_TTL_MS } from "./shellForwarding.js";
import { raceWithAbortSignal } from "../../utils/sleep.js";
import { isTerminalShutdown, heldUntilExit } from "../../utils/terminalShutdown.js";
import { countAfterDeviceCommand, clearForwardToDevice, heardSyncAnswer } from "./dirSync.js";
import { formatZodValidationError } from "../../utils/toolErrors.js";
import {
  toolNotServedMessage,
  unmatchedPathSpellingMessage,
  inputTooLargeMessage,
} from "./targetMessages.js";
import { GLOB_TOOL_NAME } from "../../tools/GlobTool/prompt.js";
import {
  splitGlobRoot,
  remotePathSpellings,
  checkWindowsPathSafety,
  UNSAFE_PATH_REASON_TEXT,
} from "./windowsPathSafety.js";
import { toDisplayPath } from "../../utils/displayPath.js";
import { uniq } from "../../utils/collections.js";
import { runWithoutTelemetry } from "../../tools/BashTool/dangerousRemoval.js";
import { runInRemoteCallFrameMain } from "../../remote/remoteMode.js";
import { isCompactBoundaryMessage } from "../projects/threadRows.js";
import { getMainLoopModel, getToolPermissionContext } from "../../utils/permissions/toolPermissionContext.js";
import { getSessionId } from "../../bootstrap/state.js";
import { taskCwd } from "../../tasks/LocalShellTask/backgroundNotices.js";
import { byteLengthOf } from "../../remote/tools/callResults.js";
import { normalizeMcpServerName } from "../api/deferredToolsState.js";
import { KeyedSemaphore, acquireSeat } from "../../utils/keyedSemaphore.js";
import { KeyedSemaphoreSubclass, RELEASED_SLOT, runWithSlot } from "../../tools/WebFetchTool/fetchQueue.js";
import { SANDBOX_MAX_DEPTH } from "../../utils/sandbox/sandboxDefaultPolicy.js";
import { areAskSeatsOn } from "./servingGates.js";
import {
  getAccountSetPermissionMode,
  isAutoClassifierActive,
} from "../../utils/permissions/autoModeState.js";
import { import_mapValues } from "../../../vendor/lodash-es/_inlinedHelpers.js";
import { logRemoteTools } from "./remoteToolsDebug.js";
import { isAskOnMutationTool } from "../../utils/permissions/permissions.js";

//@ chunk-dtv8x2hx.js:24606-24866 placement
function collectAskRules(decision) {
  let decisionReason = decision.decisionReason;
  return [
    ...(decision.matchedAskRule !== undefined ? [decision.matchedAskRule] : []),
    ...(decisionReason?.type === "rule" && decisionReason.rule.ruleBehavior === "ask"
      ? [decisionReason.rule]
      : []),
    ...(decisionReason?.type === "subcommandResults"
      ? [...decisionReason.reasons.values()].flatMap((reason) =>
          reason.behavior === "ask" ? collectAskRules(reason) : [],
        )
      : []),
  ];
}
//@ chunk-dtv8x2hx.js:24866-24939 placement
function isViolinWaistOn() {
  try {
    return getFeatureValue_CACHED_MAY_BE_STALE("tengu_violin_waist", false) === true;
  } catch {
    return false;
  }
}
//@ chunk-dtv8x2hx.js:24939-24952 placement
var DEFAULT_RECONNECT_HOLD_MS = 90000;
//@ chunk-dtv8x2hx.js:24952-25982 placement
/**
 * 宿主断线时按 reconnect_hold 等待其回来，超时放弃。
 */
async function holdForReconnect({ tool, host, call: card, signal, onStatus, holdMs }) {
  if (!isViolinWaistOn()) return;
  let { name: hostName } = host;
  let status = {
    ended: "inconclusive",
  };
  try {
    let reply = await host.transport
      .checkLive?.({
        signal,
        ...(card.reconnectHoldMs === undefined && {
          hold: {
            ms: holdMs,
            notify: (event) => {
              if (event === "back") {
                status.ended = "back";
                return;
              }
              status.stopTiming = card.beginReconnectHold();
              onStatus?.(
                ASK_FIRST_REASON_TEXTS["reconnect_hold.waiting"]({
                  name: hostName,
                  holdMs,
                }),
                holdMs,
              );
            },
          },
        }),
      })
      ?.catch((error) => {
        if (!isAbortError(error)) logError(error);
        status.ended = "failed";
        return;
      });
    if (signal.aborted) status.ended = "interrupted";
    else if (reply !== undefined) status.ended = "still_away";
    if (status.stopTiming !== undefined) {
      status.stopTiming();
      onStatus?.(
        status.ended === "back"
          ? ASK_FIRST_REASON_TEXTS["ask_seat.sending"](hostName)
          : ASK_FIRST_REASON_TEXTS["reconnect_hold.ended"](hostName),
      );
      if (status.ended === "back") logFeatureOk("remote_tool_reconnect_hold");
      else if (status.ended === "still_away") logFeatureBad("remote_tool_reconnect_hold", status.ended);
      else logFeatureSad("remote_tool_reconnect_hold", status.ended);
    }
    if (reply === undefined || signal.aborted) return;
    let result = convertRemoteToolResult(tool, host, reply);
    return status.stopTiming === undefined || result.outcome.kind !== "error"
      ? result
      : {
          ...result,
          outcome: {
            ...result.outcome,
            message: `${result.outcome.message} ${ASK_FIRST_REASON_TEXTS["reconnect_hold.gave_up"]({
              name: hostName,
              holdMs,
            })}`,
          },
        };
  } catch (error) {
    if (!isAbortError(error)) logError(error);
    return;
  }
}
//@ chunk-dtv8x2hx.js:25982-26023 placement
var VERSION_COMPARISON_LABELS = {
  [-1]: "older",
  0: "same",
  1: "newer",
};
//@ chunk-dtv8x2hx.js:26023-29905 placement
/**
 * 记录远程调用结果遥测（completed/completed_no_envelope/错误、决定者来源、耗时）。
 */
function logRemoteToolCallOutcome(tool, host, entry, result, card, toolUseContext, callerGate) {
  let { outcome } = result;
  let elapsedMs = card.elapsedMs;
  let turnTail = analyzeTurnTail(toolUseContext.messages);
  let decider = turnTail.decider;
  let origin = decider?.origin;
  let deciderMessage = decider == null ? undefined : toolUseContext.messages[decider.index];
  let outcomeLabel =
    outcome.kind === "completed"
      ? outcome.envelope !== "present"
        ? "completed_no_envelope"
        : outcome.disposition !== undefined &&
            outcome.disposition !== "ran" &&
            outcome.disposition !== "approved_by_session"
          ? "not_run_on_host"
          : outcome.isError
            ? "completed_error"
            : "completed"
      : outcome.code === "transport_error" && outcome.unreadableResult === true
        ? "unreadable_result"
        : outcome.code;
  logEvent("tengu_remote_tool_forward", {
    tool: analyticsToolName(tool),
    transport: fromEnum(host.transport.kind),
    entry: fromEnum(entry),
    outcome: fromEnum(outcomeLabel),
    refusal_code: fromEnumOpt(result.refusalCode),
    failure_code: fromEnumOpt(result.failureCode),
    disposition: fromEnumOpt(outcome.kind === "completed" ? outcome.disposition : undefined),
    envelope: outcome.kind === "completed" ? fromEnum(outcome.envelope) : undefined,
    output_parsed: outcome.kind === "completed" ? outcome.output !== undefined : undefined,
    patch_refused:
      outcome.kind === "completed" ? outcome.output === undefined && outcome.patchRefused : undefined,
    truncated: outcome.kind === "completed" ? outcome.truncated : undefined,
    cut_here: outcome.kind === "completed" ? outcome.cutHere === true : undefined,
    spilled: outcome.kind === "completed" ? outcome.spilled !== undefined : undefined,
    host_kind: fromEnumOpt(host.description?.kind),
    host_platform: fromEnumOpt(detectTerminal(host.description?.platform)),
    shell_second_look: SHELL_TOOL_NAMES.includes(tool.name)
      ? fromEnum(remoteDirKind(host.description).kind)
      : undefined,
    protocol_version: host.protocol.kind === "compatible" ? host.protocol.version : undefined,
    approval: fromEnumOpt(result.approval),
    claimed_mode: fromEnumOpt(card.claimedMode),
    turn_opened_by: fromEnum(
      decider?.strictHuman === true && deciderMessage !== undefined && isHumanTurn(deciderMessage)
        ? "own_words"
        : turnTail.scheduledTrigger
          ? "routine"
          : decider === null
            ? "unknown"
            : origin?.kind === "task-notification" && origin.producer === "session-task"
              ? "helper_report"
              : getOriginKindLabel(origin),
    ),
    from_agent: toolUseContext.agentId !== undefined,
    standing_row: fromEnumOpt(card.card?.standingRow),
    standing_row_chosen: card.card?.chosen,
    repeat_in_session: toolUseContext.toolState.get(RemoteAskSeat).askedAboutBefore(card),
    wait_announced: host.description?.limits.max_ask_ms !== undefined,
    host_version_vs_worker: fromEnum(
      compareSemverOrDefaultUnknown(
        host.description?.claude_code_version,
        typeof {
          ISSUES_EXPLAINER: "report the issue at https://github.com/anthropics/claude-code/issues",
          PACKAGE_URL: "@anthropic-ai/claude-code",
          README_URL: "https://code.claude.com/docs/en/overview",
          VERSION: "2.1.316",
          FEEDBACK_CHANNEL: "https://github.com/anthropics/claude-code/issues",
          BUILD_TIME: "2026-10-30T23:28:13Z",
          GIT_SHA: "cd7ceb459c6864567b16a11f60101b24421475c1",
          HOOKS_WORKER_URL: import.meta.dir + "/./src/plugins/functionHooks/hooks-worker/hooks-worker.js",
          DD_SOURCEMAP_GROUP: "default",
        } === "undefined"
          ? undefined
          : {
              ISSUES_EXPLAINER: "report the issue at https://github.com/anthropics/claude-code/issues",
              PACKAGE_URL: "@anthropic-ai/claude-code",
              README_URL: "https://code.claude.com/docs/en/overview",
              VERSION: "2.1.316",
              FEEDBACK_CHANNEL: "https://github.com/anthropics/claude-code/issues",
              BUILD_TIME: "2026-10-30T23:28:13Z",
              GIT_SHA: "cd7ceb459c6864567b16a11f60101b24421475c1",
              HOOKS_WORKER_URL: import.meta.dir + "/./src/plugins/functionHooks/hooks-worker/hooks-worker.js",
              DD_SOURCEMAP_GROUP: "default",
            }.VERSION,
      ),
    ),
    caller_gate: fromEnumOpt(callerGate),
    approved_by: fromEnumOpt(card.approvedBy),
    refusal_reason: fromEnumOpt(result.askEndReason),
    delivery: fromEnumOpt(outcome.kind === "completed" ? outcome.delivery : undefined),
    adoption: fromEnumOpt(result.adoption),
    inherited_withdrawn: card.inheritedRequestId === undefined ? undefined : card.inheritedWithdrawn,
    reconcile_trigger: fromEnumOpt(result.reconcile?.trigger),
    reconcile_leg: result.reconcile?.leg,
    reconcile_result: fromEnumOpt(result.reconcile?.result),
    reconcile_attempts: result.reconcile?.attempts,
    checkin_misses: result.reconcile?.misses,
    held: result.reconcile?.held,
    epoch_changed: result.reconcile?.epochChanged,
    reconcile_leg1_result: fromEnumOpt(result.reconcileLeg1?.result),
    duration_ms: elapsedMs,
    time_to_terminal_ms: elapsedMs - card.askingMs,
    asking_ms: card.askingMs,
    queued_ms: card.queuedMs,
    ask_seat_wait_ms: card.askSeatWaitMs,
    reconnect_hold_ms: card.reconnectHoldMs,
    sent_without_ask_seat: card.sentWithoutAskSeat,
    ...buildTimingFields("leg1", card.legTransit(1)),
    ...buildTimingFields("leg2", card.legTransit(2)),
    request_bytes: result.requestBytes,
    response_bytes: result.responseBytes,
    meta_copy: fromEnumOpt(result.metaCopy),
    read_baseline_sent: result.readBaselineSent === true,
    call_id: sanitizeMarkName(card.callId),
    tool_use_id: sanitizeMarkName(card.callId),
    host_epoch: sanitizeMarkName(card.sentUnderEpoch),
    handle_hash: host.description === undefined ? undefined : shortHash(host.description.name),
    host_device_id: sanitizeMarkName(host.description?.device_id),
    criteria_version: lit(REMOTE_TOOL_PROTOCOL_LABEL),
  });
  classifyCompletion(outcomeLabel);
}
//@ chunk-dtv8x2hx.js:29905-30277 placement
function classifyCompletion(label) {
  switch (
    label === "completed" || label === "completed_error"
      ? SERVED_OUTCOME_TABLE.ran.bucket
      : label === "completed_no_envelope"
        ? "sad"
        : label === "not_run_on_host"
          ? SERVED_OUTCOME_TABLE.denied_by_rule.bucket
          : label === "unreadable_result"
            ? SERVED_OUTCOME_TABLE.transport_error.bucket
            : SERVED_OUTCOME_TABLE[label].bucket
  ) {
    case "ok":
      logFeatureOk("remote_tool_forward");
      return;
    case "sad":
      logFeatureSad("remote_tool_forward", label);
      return;
    case "bad":
      logFeatureBad("remote_tool_forward", label);
      return;
    case "none":
      return;
  }
}
//@ chunk-dtv8x2hx.js:30277-30663 placement
function logRemoteToolForward(tool, host, entry, toolUseId, verdict) {
  logEvent("tengu_remote_tool_forward", {
    tool: analyticsToolName(tool),
    transport: fromEnum(host.transport.kind),
    entry: fromEnum(entry),
    outcome: fromEnum("rejected_in_session"),
    caller_gate: fromEnum(verdict),
    host_kind: fromEnumOpt(host.description?.kind),
    host_platform: fromEnumOpt(detectTerminal(host.description?.platform)),
    call_id: sanitizeMarkName(toolUseId),
    tool_use_id: sanitizeMarkName(toolUseId),
    handle_hash: host.description === undefined ? undefined : shortHash(host.description.name),
    criteria_version: lit(REMOTE_TOOL_PROTOCOL_LABEL),
  });
  classifyCompletion("rejected_in_session");
}
//@ chunk-dtv8x2hx.js:30663-30814 placement
function logRemoteForward(tool, entry, label, toolUseId) {
  logEvent("tengu_remote_tool_forward", {
    tool: analyticsToolName(tool),
    entry: fromEnum(entry),
    outcome: fromEnum(label),
    call_id: sanitizeMarkName(toolUseId),
    tool_use_id: sanitizeMarkName(toolUseId),
    criteria_version: lit(REMOTE_TOOL_PROTOCOL_LABEL),
  });
  classifyCompletion(label);
}
//@ chunk-dtv8x2hx.js:30814-30884 placement
function compareSemverOrDefaultUnknown(claudeCodeVersion, thisVersion) {
  return isSemverString(claudeCodeVersion) && isSemverString(thisVersion)
    ? VERSION_COMPARISON_LABELS[compareVersions(splitOnDash(claudeCodeVersion), splitOnDash(thisVersion))]
    : "unknown";
}
//@ chunk-dtv8x2hx.js:30884-31066 placement
function buildTimingFields(leg, timing) {
  return timing === undefined
    ? {}
    : {
        [`${leg}_queue_ms`]: timing.queueMs,
        [`${leg}_post_ms`]: timing.postMs,
        [`${leg}_reply_wait_ms`]: timing.replyWaitMs,
        [`${leg}_total_ms`]: timing.totalMs,
        [`${leg}_posts`]: timing.posts,
      };
}
//@ chunk-dtv8x2hx.js:31066-31128 placement
function analyticsToolName(tool) {
  return tool.isMcp === true
    ? sanitizeToolNameForAnalytics("mcp__tool")
    : sanitizeToolNameForAnalytics(tool.name);
}
//@ chunk-dtv8x2hx.js:31128-31202 placement
function isViolinCornerOn() {
  try {
    return getFeatureValue_CACHED_MAY_BE_STALE("tengu_violin_corner", false) === true;
  } catch {
    return false;
  }
}
//@ chunk-dtv8x2hx.js:31202-31342 placement
/**
 * 远程调用里 ask 相关的限额与默认值（保留的 ask 数、截止余量、并发上限、座席等待、提示截断等）。
 */
var MAX_REMEMBERED_ASKS = 32;
var ASK_DEADLINE_SLACK_MS = 5000;
var DEFAULT_MAX_IN_FLIGHT_CALLS = 4;
var DEFAULT_ASK_SEAT_WAIT_MS = 30000;
var SESSION_ASK_RULE = "session:ask-rule";
var MAX_PROMPT_TEXT_CHARS = 256;
var MAX_STANDING_ASK_DEADLINE_MS = 1e4;
var regExp = new RegExp(`[${withConfusables("<")}]`, "gu");
var regExp_2 = new RegExp(`[${withConfusables(">")}]`, "gu");
//@ chunk-dtv8x2hx.js:31342-31438 placement
function escapeForPrompt(text) {
  return redactSecrets(
    replaceControlChars(text.normalize("NFKC")).replace(regExp, "&lt;").replace(regExp_2, "&gt;").trim(),
  );
}
//@ chunk-dtv8x2hx.js:31438-31501 placement
function promptSafeTruncated(text) {
  return escapeForPrompt(
    truncateToLength(redactSecrets(replaceControlChars(text.normalize("NFKC"))), MAX_LINE_CHARS),
  );
}
//@ chunk-dtv8x2hx.js:31501-32654 placement
/**
 * 等待远端 ask 的回答（max_ask_ms 超时后提示）。
 */
async function waitForAskAnswer({
  tool,
  route,
  rawInput,
  toolUseContext,
  toolUseId,
  signal,
  entry,
  approve,
  speculation,
  onStatus,
  onNotice,
  checkInTiming,
  earlyCheckTiming,
  silentCallTiming,
  askLapseMs,
  askSeatWaitMs,
  reconnectHoldMs,
  callerGate,
}) {
  let seat = toolUseContext.toolState.get(RemoteAskSeat);
  let askLapseMs_2 = askLapseMs ?? clampedHostLimit(route.host, "max_ask_ms");
  let card = seat.begin({
    callId: toolUseId,
    toolName: tool.name,
    hostName: route.host.name,
    dispatchEpoch: route.host.description?.epoch,
    onAskEnded: (reason) =>
      onNotice?.(
        ASK_FIRST_REASON_TEXTS["ask_ended.notice"]({
          name: route.host.name,
          toolName: tool.name,
          reason,
          afterMs: askLapseMs_2,
        }),
      ),
  });
  let result = UNEXPECTED_FORWARD_ERROR;
  try {
    result = await resolveEarlyCheck({
      tool,
      entry,
      host: route.host,
      input: route.input,
      rawInput,
      toolUseContext,
      call: card,
      signal,
      approve,
      speculation,
      onStatus,
      checkInTiming: checkInTiming ?? progressCheckTiming(route.host),
      earlyCheckTiming: earlyCheckTiming ?? PROGRESS_WATCH_TIMING,
      silentCallTiming: silentCallTiming ?? SILENT_CALL_TIMING,
      askLapseMs: askLapseMs_2,
      askSeatWaitMs: askSeatWaitMs ?? DEFAULT_ASK_SEAT_WAIT_MS,
      reconnectHoldMs: reconnectHoldMs ?? DEFAULT_RECONNECT_HOLD_MS,
      callerGate,
    });
    if (
      result.outcome.kind === "error" &&
      (result.outcome.code === "unreachable" || result.outcome.code === "host_unresponsive")
    )
      toolUseContext.toolState
        .get(AwayEpisodeTracker)
        .told(
          toolUseContext.toolState.get(RemoteBackgroundCommands),
          toolUseContext.agentId,
          route.host.name,
        );
    return result.outcome;
  } catch (error) {
    if (error instanceof AbortError || signal.aborted) result = INTERRUPTED_FORWARD;
    throw error;
  } finally {
    speculation?.abandon();
    seat.settle(card, result.outcome);
    logRemoteToolCallOutcome(tool, route.host, entry, result, card, toolUseContext, callerGate);
    describeAskSeat(result, card, {
      tool,
      route,
      rawInput,
      toolUseContext,
    });
  }
}
//@ chunk-dtv8x2hx.js:32654-33567 placement
function describeAskSeat(result, card, { tool, route, rawInput, toolUseContext }) {
  if (route.host.transport.kind !== "session") return;
  try {
    let ledger = toolUseContext.toolState.get(RemoteCallLedger);
    let open = result.outcome.kind === "error" ? result.outcome.open : undefined;
    if (open === undefined) {
      ledger.forget(card.callId);
      return;
    }
    let held = card.held;
    let otherHost = result.journalHost !== undefined && result.journalHost !== route.host.name;
    ledger.gaveUp({
      callId: card.callId,
      agentId: toolUseContext.agentId,
      hostName: result.journalHost ?? route.host.name,
      toolName: tool.name,
      wireToolName: card.wireName ?? tool.name,
      spelled: primaryInputPath(rawInput),
      toldAs: open,
      machineHadCall:
        result.approval !== undefined ||
        result.reconcile?.trigger === "in_progress" ||
        result.adoption === "ask_in_flight" ||
        result.adoption === "interrupted",
      transport: otherHost ? undefined : route.host.transport,
      dispatchEpoch: result.adoption === undefined ? card.sentUnderEpoch : result.journalEpoch,
      standing: held !== undefined,
      ...(held !== undefined && {
        withdraw: held.withdraw,
      }),
      givenUpAt: Date.now(),
    });
    held?.late.then((late) => ledger.answeredLate(card.callId, late)).catch(() => {});
  } catch (error) {
    logForDebugging(
      `[remote-tools] could not record a given-up call for a later correction: ${errorMessage(error)}`,
    );
  }
}
//@ chunk-dtv8x2hx.js:33567-33804 placement
function primaryInputPath(rawInput) {
  let found = ["command", "file_path", "path", "notebook_path"]
    .map((key) => rawInput[key])
    .find((value) => typeof value === "string" && value !== "");
  return found === undefined
    ? "its input as sent"
    : `"${truncateToLength(escapeForPrompt(truncateToLength(found, 480)).replace(/[`"]/g, " ").replace(/\s+/g, " ").trim(), 120)}"`;
}
//@ chunk-dtv8x2hx.js:33804-34004 placement
var INTERRUPTED_FORWARD = {
  outcome: {
    kind: "error",
    code: "interrupted",
    message: "interrupted while forwarding",
  },
  requestBytes: 0,
};
var UNEXPECTED_FORWARD_ERROR = {
  outcome: {
    kind: "error",
    code: "transport_error",
    message: "unexpected error while forwarding",
  },
};
//@ chunk-dtv8x2hx.js:34004-36883 placement
/**
 * 描述投递失败（交付未知、宿主重启、中断）。
 */
async function describeDeliveryFailure(context, parked, runWithPendingAsk) {
  let { tool, host, signal } = context;
  let callId = context.call.callId;
  let identity = machineIdentity(host);
  let noticeArgs = {
    host: parked.host,
  };
  let journalFields = {
    journalHost: parked.host,
    ...(parked.host_epoch !== undefined && {
      journalEpoch: parked.host_epoch,
    }),
  };
  let fail = (code, message, adoption, reconcileInfo, openReason) => ({
    outcome: {
      kind: "error",
      code,
      message,
      host: identity,
      ...(openReason !== undefined && {
        open: openReason,
      }),
    },
    adoption,
    ...journalFields,
    ...(reconcileInfo !== undefined && {
      reconcile: reconcileInfo,
    }),
  });
  let unknownOpen = parked.parkedAtRestart ? undefined : "delivery_unknown";
  if (!isSameHostEpoch(parked, host))
    return fail(
      "host_restarted",
      restartNoticeFor(noticeArgs, parked),
      "instance_gone",
      undefined,
      unknownOpen,
    );
  let names = remoteToolNames(tool, host);
  if (names === undefined)
    return fail("unreachable", restartNoticeFor(noticeArgs, parked), "unknown", undefined, unknownOpen);
  let requestId = parked.request_id;
  if (requestId !== undefined && host.transport.withdrawStanding !== undefined) {
    if (parked.instance_id !== undefined) context.call.recordAddressee(parked.instance_id, parked.host_epoch);
    context.call.inherit(requestId, () => host.transport.withdrawStanding?.(requestId));
  }
  let checkInTiming = context.checkInTiming;
  let fence = formatRemoteOutputFence({
    name: host.name,
    showForMs: 2 * checkInTiming.intervalMs,
    onStatus: context.onStatus,
    waiting: (waitingForAsk) =>
      waitingForAsk
        ? ASK_FIRST_REASON_TEXTS["in_progress.checkin"](host.name)
        : reconnectingStatus(host.name),
    standing: undefined,
  });
  let outcome = await awaitRemoteCallWithProgress({
    host,
    held: undefined,
    dispatchEpoch: parked.host_epoch,
    toolName: names.wire,
    callId,
    signal,
    timing: checkInTiming,
    onAttempt: fence.onAttempt,
    onOutput: fence.onOutput,
  });
  let { verdict } = outcome;
  let reconcile = {
    trigger: "resumed",
    leg: 1,
    result: verdict.kind === "unknown" ? `unknown_${verdict.why}` : verdict.kind,
    attempts: outcome.attempts,
    misses: outcome.misses,
    held: false,
    epochChanged: outcome.epochChanged,
  };
  switch (verdict.kind) {
    case "late":
    case "answer": {
      let { transported } = verdict;
      if (transported.kind !== "result")
        return fail("unreachable", restartNoticeFor(noticeArgs, parked), "unknown", reconcile, unknownOpen);
      let { envelope } = transported;
      if (envelope?.outcome === "needs_approval") {
        let carried =
          host.description?.limits.max_ask_ms !== undefined &&
          Date.now() - parked.dispatched_at <= SYNC_ANSWER_TTL_MS &&
          isViolinCornerOn()
            ? await runWithPendingAsk(transported)
            : undefined;
        if (carried?.approval !== undefined)
          return {
            ...carried,
            adoption: "ask_carried_over",
            ...journalFields,
            reconcileLeg1: reconcile,
          };
        return toolResultForInterruption(context, parked, names.wire, envelope.ask_id, reconcile);
      }
      return {
        reconcile,
        adoption: "after_reconnect",
        ...convertRemoteToolResult(
          tool,
          host,
          {
            ...transported,
            metaCopy: undefined,
          },
          {
            afterReconnect: true,
          },
        ),
      };
    }
    case "ask_lost":
      return fail(
        "still_running",
        pendingPermissionNotice(noticeArgs),
        "ask_in_flight",
        reconcile,
        "delivery_unknown",
      );
    case "not_received":
      return fail("not_received", neverReceivedNotice(noticeArgs), "never_received", reconcile);
    case "host_restarted":
    case "gone":
      return fail(
        "host_restarted",
        restartNoticeFor(noticeArgs, parked),
        "instance_gone",
        reconcile,
        unknownOpen,
      );
    case "host_unresponsive":
      if (!verdict.stillConnected) host.transport.markUnresponsive?.();
      return fail(
        "host_unresponsive",
        ASK_FIRST_REASON_TEXTS.host_unresponsive({
          name: host.name,
          checks: verdict.misses,
          intervalMs: verdict.intervalMs ?? checkInTiming.intervalMs,
          whileRunning: verdict.whileRunning,
          stillConnected: verdict.stillConnected,
          returnNoted: isHostAwayRecheckable(host),
        }) + fence.outputNote(),
        "unknown",
        reconcile,
        "host_unresponsive",
      );
    case "host_asleep":
      host.transport.markUnresponsive?.();
      return fail(
        "host_unresponsive",
        ASK_FIRST_REASON_TEXTS.host_asleep({
          name: host.name,
          whileRunning: verdict.whileRunning,
          withdrawn: false,
          returnNoted: hostAnnouncesReturn(host),
        }) + fence.outputNote(),
        "unknown",
        reconcile,
        "host_asleep",
      );
    case "unbound":
      host.transport.markUnresponsive?.();
      return fail(
        "host_unresponsive",
        ASK_FIRST_REASON_TEXTS["unverified_refusal.call_phase"]({
          name: host.name,
          whileRunning: verdict.whileRunning,
        }) + fence.outputNote(),
        "unknown",
        reconcile,
        "host_unresponsive",
      );
    case "cancelled":
      context.call.withdrawInherited();
      return {
        outcome: interruptedResult(identity, {
          askLater: true,
        }),
        adoption: "interrupted",
        ...journalFields,
        reconcile,
      };
    case "unreachable":
    case "unknown":
      return fail("unreachable", restartNoticeFor(noticeArgs, parked), "unknown", reconcile, unknownOpen);
  }
}
//@ chunk-dtv8x2hx.js:36883-38086 placement
async function toolResultForInterruption(context, parked, wire, askId, reconcile) {
  let { tool, host, toolUseContext } = context;
  let callId = context.call.callId;
  let identity = machineIdentity(host);
  let noticeArgs = {
    host: parked.host,
  };
  let defaultDeadlineMs = host.transport.limits.defaultDeadlineMs;
  let reply = await raceWithAbortSignal(
    host.transport
      .call(
        wire,
        context.input,
        buildRemoteToolCallMeta({
          callId,
          expiresInMs: Math.max(1, defaultDeadlineMs - ASK_DEADLINE_SLACK_MS),
          ...wirePermissionState(toolUseContext, tool.name),
          approval: {
            ask_id: askId,
            decision: "deny",
            feedback: WITHDRAWN,
          },
        }),
        {
          signal: new AbortController().signal,
          deadlineMs: Math.min(defaultDeadlineMs, MAX_STANDING_ASK_DEADLINE_MS),
          toolUseId: callId,
        },
      )
      .catch(() => {
        return;
      }),
    context.signal,
    () => new AbortError(),
  ).catch(() => {
    return;
  });
  if (context.signal.aborted)
    return {
      outcome: interruptedResult(identity),
      adoption: "interrupted",
      reconcile,
    };
  let envelope = reply?.kind === "result" ? reply.envelope : undefined;
  if (
    reply?.kind === "result" &&
    envelope !== undefined &&
    envelope.outcome !== "acknowledged" &&
    envelope.outcome !== "needs_approval" &&
    envelope.outcome !== "in_progress" &&
    envelope.replayed === true
  )
    return {
      reconcile,
      adoption: "after_reconnect",
      ...convertRemoteToolResult(
        tool,
        host,
        {
          ...reply,
          metaCopy: undefined,
        },
        {
          afterReconnect: true,
        },
      ),
    };
  if (
    reply?.kind === "result" &&
    (envelope?.outcome === "in_progress" ||
      (envelope?.outcome === "completed" && envelope.disposition === "duplicate_call"))
  )
    return {
      outcome: {
        kind: "error",
        code: "still_running",
        message: stillRunningNotice(noticeArgs),
        host: identity,
      },
      adoption: "still_running",
      reconcile,
    };
  let withdrawn = envelope?.outcome === "acknowledged" && envelope.ask_id === askId;
  return {
    outcome: {
      kind: "error",
      code: "approval_not_received",
      message: withdrawn
        ? approvalWithdrawnNotice(noticeArgs)
        : approvalWithdrawUnconfirmedNotice(noticeArgs),
      host: identity,
    },
    adoption: withdrawn ? "ask_withdrawn" : "unknown",
    reconcile,
  };
}
//@ chunk-dtv8x2hx.js:38086-39430 placement
async function resolveEarlyCheck(context) {
  let syncInfo;
  let readBaselineSent = false;
  let registry = context.toolUseContext.toolState.get(ServedCallRegistry);
  let lastServed;
  let publishServed = (served) => {
    if (served === undefined) return;
    let hadValue = lastServed !== undefined;
    lastServed = served;
    if (hadValue) return;
    queueMicrotask(() => {
      let latest = lastServed;
      lastServed = undefined;
      if (latest !== undefined)
        context.toolUseContext.sessionState?.notifyInternalMetadataChanged({
          in_flight_served_calls: latest,
        });
    });
  };
  let adopted = registry.adopted(context.call.callId);
  registry.takeAdopted(context.call.callId);
  let entry;
  let noteEntry = () => {
    let { sentUnderEpoch, carryingRequestId, instanceId } = context.call;
    if (
      entry !== undefined &&
      entry.host_epoch === sentUnderEpoch &&
      entry.request_id === carryingRequestId &&
      entry.instance_id === instanceId
    )
      return;
    entry = {
      tool_use_id: context.call.callId,
      tool: context.tool.name,
      host: context.host.name,
      ...(sentUnderEpoch !== undefined && {
        host_epoch: sentUnderEpoch,
      }),
      ...(carryingRequestId !== undefined && {
        request_id: carryingRequestId,
      }),
      ...(instanceId !== undefined && {
        instance_id: instanceId,
      }),
      dispatched_at: entry?.dispatched_at ?? Date.now(),
    };
    publishServed(registry.add(entry));
  };
  let result;
  try {
    let extended = {
      ...context,
      noteSync: (info) => {
        syncInfo = info;
      },
      noteReadBaselineSent: () => {
        readBaselineSent = true;
      },
      onFirstSend: noteEntry,
      onAddressed: noteEntry,
    };
    result =
      adopted !== undefined
        ? await describeDeliveryFailure(context, adopted, (pendingAsk) =>
            runRemoteToolCall({
              ...extended,
              pendingAsk,
            }),
          )
        : await runRemoteToolCall(extended);
  } finally {
    if (!isTerminalShutdown()) registry.remove(context.call.callId);
  }
  let finalResult = readBaselineSent
    ? {
        ...result,
        readBaselineSent,
      }
    : result;
  if (finalResult.outcome.kind !== "completed" || !isRanOutcome(finalResult.outcome.disposition))
    return finalResult;
  if (finalResult.outcome.dirSync !== undefined) await countAfterDeviceCommand(finalResult.outcome.dirSync);
  let approvedBy =
    context.call.approvedBy ??
    (adopted === undefined &&
    context.callerGate === undefined &&
    finalResult.outcome.delivery === "fresh" &&
    finalResult.outcome.disposition === "ran"
      ? "unasked"
      : undefined);
  return {
    ...finalResult,
    outcome: {
      ...finalResult.outcome,
      ...(approvedBy !== undefined && {
        permittedBy: approvedBy,
      }),
      ...(syncInfo !== undefined && {
        sessionNotes: [
          ...(finalResult.outcome.sessionNotes ?? []),
          {
            text: syncInfo,
          },
        ],
      }),
    },
  };
}
//@ chunk-dtv8x2hx.js:39430-57316 placement
/**
 * 远程工具调用主流程：权限、早期检查、发送、等待、重连、结果与遥测（约 18 KB）。
 */
async function runRemoteToolCall({
  tool,
  entry,
  host,
  input,
  rawInput,
  toolUseContext,
  call,
  signal,
  approve,
  speculation,
  onStatus,
  checkInTiming,
  earlyCheckTiming,
  silentCallTiming,
  askLapseMs,
  askSeatWaitMs,
  reconnectHoldMs,
  noteSync,
  noteReadBaselineSent,
  onFirstSend,
  onAddressed,
  pendingAsk,
}) {
  let host_2 = machineIdentity(host);
  let callId = call.callId;
  let { dispatchEpoch } = call;
  let parsed = tool.inputSchema.safeParse(input);
  if (!parsed.success)
    return {
      outcome: {
        kind: "error",
        code: "invalid_input",
        message: formatZodValidationError(tool.name, parsed.error),
        host: host_2,
      },
    };
  let toolNames = remoteToolNames(tool, host);
  if (toolNames === undefined)
    return {
      outcome: {
        kind: "error",
        code: "not_served",
        message: toolNotServedMessage({
          name: host.name,
          toolName: tool.name,
        }),
        host: host_2,
      },
    };
  let standingLine;
  let silentSince;
  let collectResult = (transported, approval) =>
    collectRemoteResult({
      transported,
      host,
      call,
      dispatchEpoch,
      toolName: toolNames.wire,
      callId,
      signal,
      timing: checkInTiming,
      silentSince,
      silentCallTiming,
      onStatus,
      standingLine,
      approval,
    });
  let parsedInput = parsed.data;
  let concurrencyInput = parsedInput;
  let rawCallInput = input;
  let editedByApproval = false;
  let remoteDir = host.description === undefined ? undefined : remoteDirFacts(host.description);
  let withLocalPaths = (parsedInput) =>
    tool.backfillObservableInput === undefined || remoteDir === undefined
      ? parsedInput
      : resolveRemoteFilePathInput(parsedInput, remoteDir);
  let ruleContentField = tool.getPath === undefined ? undefined : tool.ruleContentField;
  let globRoot = (parsedInput) =>
    tool.name === GLOB_TOOL_NAME && remoteDir !== undefined && typeof parsedInput.pattern === "string"
      ? splitGlobRoot(parsedInput.pattern, remoteDir)
      : undefined;
  let restateRuleValue = (parsedInput, before, after) => {
    let ruleValue = ruleContentField === undefined ? undefined : parsedInput[ruleContentField];
    if (ruleContentField === undefined || remoteDir === undefined || typeof ruleValue !== "string")
      return parsedInput;
    if (ruleValue === before[ruleContentField] && typeof after[ruleContentField] === "string")
      return {
        ...parsedInput,
        [ruleContentField]: after[ruleContentField],
      };
    let displayPath = toDisplayPath(ruleValue, remoteDir);
    return displayPath === undefined
      ? parsedInput
      : {
          ...parsedInput,
          [ruleContentField]: displayPath,
        };
  };
  let beforeInput = parsedInput;
  let spellingVariants = (parsedInput) => {
    let glob = globRoot(parsedInput);
    let path =
      glob?.root ?? (ruleContentField === undefined ? undefined : (parsedInput[ruleContentField] ?? "."));
    if (ruleContentField === undefined || remoteDir === undefined || typeof path !== "string") return [];
    return remotePathSpellings(path, remoteDir)
      .filter(
        (spelling) =>
          glob !== undefined ||
          (spelling !== beforeInput[ruleContentField] && spelling !== parsedInput[ruleContentField]),
      )
      .map((spelling) =>
        glob === undefined
          ? {
              ...parsedInput,
              [ruleContentField]: spelling,
            }
          : {
              ...parsedInput,
              [ruleContentField]: spelling,
              pattern: glob.rest,
            },
      );
  };
  let checkUnsafeSpelling = (spellings) => {
    let unsafe =
      ruleContentField === undefined || remoteDir === undefined
        ? undefined
        : spellings
            .map((spelling) => {
              let glob = globRoot(spelling);
              return glob === undefined
                ? [spelling[ruleContentField], spelling[ruleContentField]]
                : [spelling.pattern, glob.root];
            })
            .flatMap(([ruleValue, root]) =>
              typeof ruleValue === "string" && typeof root === "string"
                ? [[ruleValue, checkWindowsPathSafety(root, remoteDir)]]
                : [],
            )
            .find(([, reason]) => reason !== undefined);
    return unsafe?.[1] === undefined
      ? undefined
      : {
          kind: "refuse",
          code: unsafe[1] === "magic_link" ? "declined_magic_link" : "declined_spelling",
          message: unmatchedPathSpellingMessage({
            name: host.name,
            toolName: tool.name,
            path: unsafe[0],
            spellingIs: UNSAFE_PATH_REASON_TEXT[unsafe[1]],
          }),
        };
  };
  let shellDir = SHELL_TOOL_NAMES.includes(tool.name) ? remoteDirKind(host.description) : undefined;
  let checkPermission = async (parsedInput, requestBytes) => {
    let refusal = checkUnsafeSpelling([beforeInput, parsedInput]);
    if (refusal !== undefined) return refusal;
    let flattened = uniq([beforeInput, ...spellingVariants(parsedInput), parsedInput]).flatMap(
      (parsedInput) => [
        {
          parsedInput,
          machineDir: undefined,
        },
        ...(shellDir?.kind === "in_announced_dir"
          ? [
              {
                parsedInput,
                machineDir: shellDir.dir,
              },
            ]
          : []),
      ],
    );
    let verdict = {
      kind: "proceed",
    };
    for (let { parsedInput, machineDir } of flattened) {
      if (verdict.kind === "refuse") break;
      let checkOnce = () =>
        checkRemoteToolPermission({
          tool,
          parsedInput,
          requestBytes,
          toolUseContext,
          host,
        });
      verdict = isProceedVerdict(
        verdict,
        machineDir === undefined
          ? await checkOnce()
          : await runWithoutTelemetry(() => runInRemoteCallFrameMain(machineDir, checkOnce)),
      );
    }
    return verdict;
  };
  let defaultDeadlineMs = host.transport.limits.defaultDeadlineMs;
  let expiresInMs = Math.max(1, defaultDeadlineMs - ASK_DEADLINE_SLACK_MS);
  let compactionId =
    toolUseContext.agentId === undefined
      ? toolUseContext.messages.findLast(isCompactBoundaryMessage)?.uuid
      : undefined;
  let claimedMode;
  let buildMeta = (approval) => {
    let permissionState = wirePermissionState(toolUseContext, tool.name);
    if (approval === undefined) {
      claimedMode = permissionState.permissionMode;
      call.claimedMode = claimedMode;
    }
    return buildRemoteToolCallMeta({
      callId,
      expiresInMs,
      ...permissionState,
      model: getMainLoopModel(toolUseContext),
      conversationId: getSessionId(),
      compactionId,
      ...(approval !== undefined && {
        approval,
      }),
      ...(approval === undefined && {
        readBaseline: readBaseline(),
      }),
    });
  };
  let readBaseline = () =>
    readBaselineForRemoteWrite({
      tool,
      input: parsedInput,
      description: host.description,
      readFileState: toolUseContext.readFileState,
      sessionDir: () => taskCwd(toolUseContext.session),
    });
  let measureRequest = (meta) =>
    byteLengthOf({
      name: toolNames.wire,
      arguments: {
        ...rawCallInput,
        [REMOTE_TOOL_CALL_META]: meta,
      },
    });
  let sendCall = (meta, callInput = rawCallInput) => {
    call.sent({
      wireName: toolNames.wire,
      input: callInput,
    });
    call.hold(undefined);
    toolUseContext.markToolCallRunning?.(callId);
    let epoch;
    let hasRecord = false;
    let remoteCallState = toolUseContext.toolState.get(RemoteCallState);
    let progressWatch = watchRemoteCallProgress({
      host,
      toolName: toolNames.wire,
      callId,
      signal,
      onStatus,
      timing: earlyCheckTiming,
      mayCheck: () =>
        SHELL_TOOL_NAMES.includes(tool.name) && hasRecord && remoteCallState.has(host.name, epoch),
      onNoRecord: () => remoteCallState.forget(host.name, epoch),
    });
    let silentWatch = watchSilentCall({
      host,
      signal,
      checkMisses: checkInTiming.misses,
      timing: silentCallTiming,
    });
    return host.transport
      .call(toolNames.wire, callInput, meta, {
        signal,
        deadlineMs: defaultDeadlineMs,
        toolUseId: callId,
        onSent: (addressed) => {
          epoch = addressed.epoch;
          hasRecord = remoteCallState.has(host.name, addressed.epoch);
          call.recordAddressee(addressed.instanceId, addressed.epoch, addressed.requestId);
          onAddressed?.();
        },
        ...(silentWatch.onAccepted === undefined
          ? progressWatch.onAccepted !== undefined && {
              onAccepted: progressWatch.onAccepted,
            }
          : {
              onAccepted: () => {
                silentWatch.onAccepted?.();
                progressWatch.onAccepted?.();
              },
            }),
        onTransit: (leg) => call.recordLegTransit(meta.approval === undefined ? 1 : 2, leg),
        ...(hostSupportsProgressChecks(host) && {
          onHeldAtDeadline: (heldInfo) => call.hold(heldInfo),
        }),
      })
      .then((transported) => {
        standingLine = progressWatch.stop();
        silentWatch.stop();
        silentSince = silentWatch.acceptedAt();
        noteDirSyncAnswer(host, transported);
        remoteCallState.note(host.name, epoch, transported);
        return transported;
      })
      .catch((error) => {
        standingLine = progressWatch.stop();
        silentWatch.stop();
        silentSince = undefined;
        return {
          kind: "transport_error",
          detail: `send failed: ${normalizeMcpServerName(errorMessage(error))}`,
        };
      });
  };
  let sendAnswer = (answer) => {
    host.transport
      .call(toolNames.wire, rawCallInput, buildMeta(answer), {
        signal: new AbortController().signal,
        deadlineMs: Math.min(defaultDeadlineMs, MAX_STANDING_ASK_DEADLINE_MS),
        toolUseId: callId,
      })
      .catch(() => {});
  };
  let withdrawAsk = (askId) =>
    sendAnswer({
      ask_id: askId,
      decision: "deny",
      feedback: WITHDRAWN,
    });
  let withdrawAskCall = (askId) =>
    host.transport
      .call(
        toolNames.wire,
        rawCallInput,
        buildMeta({
          ask_id: askId,
          decision: "deny",
          feedback: WITHDRAWN,
        }),
        {
          signal: new AbortController().signal,
          deadlineMs: Math.min(defaultDeadlineMs, MAX_STANDING_ASK_DEADLINE_MS),
          toolUseId: callId,
        },
      )
      .catch(() => {
        return;
      });
  let withdrawAskAndWait = (askId) =>
    raceWithAbortSignal(withdrawAskCall(askId), signal, () => new AbortError()).catch(() => {
      return;
    });
  let sendSemaphore = toolUseContext.toolState.get(KeyedSemaphore);
  let maxInFlight = host.description?.limits.max_in_flight ?? DEFAULT_MAX_IN_FLIGHT_CALLS;
  let semaphore = toolUseContext.toolState.get(KeyedSemaphoreSubclass);
  let limit =
    clampServingLimit("pending_asks_max", host.description?.limits.pending_asks_max) ?? SANDBOX_MAX_DEPTH;
  let requestBytes = measureRequest(buildMeta());
  let firstVerdict =
    pendingAsk === undefined
      ? await checkPermission(withLocalPaths(parsedInput), requestBytes)
      : {
          kind: "proceed",
        };
  if (firstVerdict.kind === "refuse")
    return {
      requestBytes,
      outcome: {
        kind: "error",
        code: firstVerdict.code,
        message: firstVerdict.message,
        host: host_2,
      },
    };
  let approvedRule;
  let planModeAtAsk = false;
  if (firstVerdict.kind === "ask_first") {
    if (approve === undefined)
      return {
        requestBytes,
        outcome: {
          kind: "error",
          code: "denied_by_session_rule",
          message: `${firstVerdict.message} This session asks before running this call and could not raise its prompt here; ${host.name} was not contacted.`,
          host: host_2,
        },
      };
    if (signal.aborted)
      return {
        outcome: cancelledResult(host_2),
        requestBytes,
      };
    planModeAtAsk = getToolPermissionContext(toolUseContext).mode === "plan";
    beforeInput = parsedInput;
    parsedInput = withLocalPaths(parsedInput);
    rawCallInput = withLocalPaths(rawCallInput);
    requestBytes = measureRequest(buildMeta());
    let promptFailed = false;
    let sessionAnswer = await waitWhileAsking(call, SESSION_ASK_RULE, askLapseMs, (ended, patience) =>
      approve({
        askId: SESSION_ASK_RULE,
        ended,
        host: host_2,
        tool: tool.name,
        input: parsedInput,
        message: firstVerdict.message,
        decisionReason: undefined,
        suggestions: [],
        classifierEligible: false,
        keepsStandingApprovals: false,
        offeredStandingRules: [],
        patience,
        askEnded: () => call.askEnded !== undefined,
        noteCard: (card) => {
          call.card = card;
        },
      }).catch((error) => {
        if (error instanceof AbortError && !signal.aborted) throw error;
        if (!signal.aborted) {
          promptFailed = true;
          logForDebugging(
            `remote tool call: this session's own permission prompt failed: ${errorMessage(error)}`,
            {
              level: "error",
            },
          );
        }
        return;
      }),
    );
    if (sessionAnswer !== undefined && "ended" in sessionAnswer)
      return {
        requestBytes,
        ...describeNoAnswer(host, host_2, sessionAnswer.ended, askLapseMs),
      };
    planModeAtAsk &&= getToolPermissionContext(toolUseContext).mode === "plan";
    if (sessionAnswer === undefined)
      return {
        requestBytes,
        approval: promptFailed ? "prompt_failed" : "withdrawn",
        outcome: promptFailed
          ? {
              kind: "error",
              code: "prompt_failed",
              message: `This session could not raise its permission prompt for ${host.name}; the call did not run.`,
              host: host_2,
            }
          : cancelledResult(host_2),
      };
    if (signal.aborted && sessionAnswer.decision !== "deny")
      return {
        outcome: cancelledResult(host_2),
        requestBytes,
      };
    if (sessionAnswer.decision === "unanswerable")
      return {
        requestBytes,
        approval: "prompt_failed",
        outcome: {
          kind: "error",
          code: "prompt_failed",
          message: `${sessionAnswer.message} ${host.name} was not contacted.`,
          host: host_2,
        },
      };
    if (sessionAnswer.decision === "deny")
      return {
        requestBytes,
        approval: sessionAnswer.insteadOfRejection === undefined ? "denied" : "blocked",
        outcome: {
          kind: "error",
          code: "rejected_in_session",
          message:
            sessionAnswer.insteadOfRejection?.message ??
            remoteRejectMessage(toolUseContext.agentId, sessionAnswer.feedback),
          ...(sessionAnswer.insteadOfRejection !== undefined && {
            denialKind: sessionAnswer.insteadOfRejection.denialKind,
          }),
          host: host_2,
        },
      };
    if (sessionAnswer.decidedBy !== undefined) call.recordApprovedBy(sessionAnswer.decidedBy);
    if (sessionAnswer.updatedInput !== undefined) {
      let editedParsed = tool.inputSchema.safeParse(sessionAnswer.updatedInput);
      if (!editedParsed.success)
        return {
          requestBytes,
          approval: "withdrawn",
          outcome: {
            kind: "error",
            code: "invalid_input",
            message: `The edited ${tool.name} input from this session's prompt does not parse; ${host.name} was not contacted.`,
            host: host_2,
          },
        };
      beforeInput = restateRuleValue(editedParsed.data, parsedInput, beforeInput);
      parsedInput = editedParsed.data;
      rawCallInput = sessionAnswer.updatedInput;
      editedByApproval = true;
      requestBytes = measureRequest(buildMeta());
      let recheck = await checkPermission(withLocalPaths(parsedInput), requestBytes);
      if (recheck.kind === "refuse")
        return {
          requestBytes,
          approval: "withdrawn",
          outcome: {
            kind: "error",
            code: recheck.code,
            message: recheck.message,
            host: host_2,
          },
        };
      approvedRule = recheck.kind === "ask_first" ? recheck.rule : firstVerdict.rule;
    } else approvedRule = firstVerdict.rule;
  }
  let holdUntilReconnect = () =>
    holdForReconnect({
      tool,
      host,
      call,
      signal,
      onStatus,
      holdMs: reconnectHoldMs,
    });
  let holdOutcome = await holdUntilReconnect();
  if (holdOutcome !== undefined)
    return {
      requestBytes,
      ...holdOutcome,
    };
  let endSeatWait = call.beginAskSeatWait();
  let seatWaiting = false;
  using seat = areAskSeatsOn()
    ? await acquireSeat(semaphore, host.name, limit, signal, {
        waitLimitMs: pendingAsk === undefined ? askSeatWaitMs : 0,
        onWait: () => {
          if (pendingAsk !== undefined) return;
          seatWaiting = true;
          onStatus?.(ASK_FIRST_REASON_TEXTS["ask_seat.waiting"](host.name), askSeatWaitMs);
        },
      })
    : RELEASED_SLOT;
  endSeatWait();
  if (seat === undefined)
    return {
      outcome: cancelledResult(host_2),
      requestBytes,
    };
  if (!seat.seated && pendingAsk === undefined) call.noteSentWithoutAskSeat();
  if (seatWaiting) onStatus?.(ASK_FIRST_REASON_TEXTS["ask_seat.sending"](host.name));
  let transported = pendingAsk ?? (await sendAfterSeating());
  async function sendAfterSeating() {
    let endQueuedWait = call.beginQueuedWait();
    return runWithSlot(sendSemaphore, host.name, maxInFlight, signal, async () => {
      endQueuedWait();
      if (isTerminalShutdown() && !signal.aborted) await heldUntilExit();
      let secondHold = await holdUntilReconnect();
      if (secondHold !== undefined)
        return {
          requestBytes,
          ...secondHold,
        };
      let readOnly = false;
      try {
        readOnly = tool.isReadOnly(parsedInput);
      } catch {}
      let concurrencySafe = false;
      try {
        concurrencySafe = tool.isConcurrencySafe(concurrencyInput);
      } catch {}
      let syncOutcome = await clearForwardToDevice({
        host,
        readOnly,
        runsBesideOthers: toolUseContext.agentId !== undefined || entry === "repl" || concurrencySafe,
        signal,
        onStatus,
      });
      if (syncOutcome.kind === "hold")
        return {
          outcome: {
            kind: "error",
            code: "sync_failed",
            message: syncOutcome.message,
            host: host_2,
          },
          requestBytes,
        };
      if (syncOutcome.kind === "away")
        return {
          requestBytes,
          ...convertRemoteToolResult(tool, host, syncOutcome.outcome),
        };
      if (syncOutcome.kind === "go_with_note") noteSync(syncOutcome.note);
      let verdict = await checkPermission(withLocalPaths(parsedInput), requestBytes);
      if (verdict.kind === "refuse")
        return {
          outcome: {
            kind: "error",
            code: verdict.code,
            message: verdict.message,
            host: host_2,
          },
          requestBytes,
        };
      if (verdict.kind === "ask_first" && !isSameHostName(verdict.rule, approvedRule))
        return approvedRule === undefined
          ? {
              outcome: {
                kind: "error",
                code: "denied_by_session_rule",
                message: `${verdict.message} ${host.name} was not contacted.`,
                host: host_2,
              },
              requestBytes,
            }
          : {
              approval: "withdrawn",
              outcome: {
                kind: "error",
                code: "approval_no_longer_covers",
                message: ASK_FIRST_REASON_TEXTS.approval_no_longer_covers(host.name),
                host: host_2,
              },
              requestBytes,
            };
      if (signal.aborted)
        return {
          outcome: cancelledResult(host_2),
          requestBytes,
        };
      if (isTerminalShutdown()) await heldUntilExit();
      onFirstSend?.();
      if (approvedRule === undefined)
        speculation?.begin({
          host: host_2,
          input: withLocalPaths(parsedInput),
        });
      let meta = buildMeta();
      if (meta.read_baseline !== undefined) noteReadBaselineSent();
      return sendCall(meta);
    }).then((result) => {
      if (result === undefined) endQueuedWait();
      return result;
    });
  }
  if (transported === undefined)
    return {
      outcome: cancelledResult(host_2),
      requestBytes,
    };
  if ("outcome" in transported) return transported;
  if (!(transported.kind === "result" && transported.envelope?.outcome === "needs_approval")) seat.release();
  let collected = await collectResult(transported);
  if (collected.kind === "ended")
    return {
      requestBytes,
      reconcile: collected.trace,
      outcome: collected.outcome,
    };
  let transported_2 = collected.transported;
  let envelope =
    transported_2.kind === "result" && transported_2.envelope?.outcome === "needs_approval"
      ? transported_2.envelope
      : undefined;
  if (envelope === undefined) {
    speculation?.abandon();
    return {
      requestBytes,
      reconcile: collected.trace,
      ...convertRemoteToolResult(tool, host, transported_2, {
        afterReconnect: collected.kind === "answered",
        call: {
          input: parsedInput,
          editedByApproval,
        },
      }),
    };
  }
  seat.retake();
  toolUseContext.markToolCallRunning?.(callId, false);
  call.questionRaised();
  let askHandling = await (async () => {
    if (approve === undefined) {
      withdrawAsk(envelope.ask_id);
      return {
        requestBytes,
        approval: "no_handler",
        ...convertRemoteToolResult(tool, host, transported_2),
      };
    }
    let askParsed =
      byteLengthOf(envelope.input) <= maxRequestBytes(host)
        ? tool.inputSchema.safeParse(envelope.input)
        : {
            success: false,
          };
    if (envelope.tool !== toolNames.ask || !askParsed.success) {
      withdrawAsk(envelope.ask_id);
      return {
        requestBytes,
        approval: "unreadable_ask",
        outcome: {
          kind: "error",
          code: "refused_by_host",
          message: refusedByMachineLine({
            name: host.name,
            message: "it asked for approval of a call this session could not read; nothing ran",
          }),
          host: host_2,
        },
      };
    }
    let askVerdict = await checkPermission(askParsed.data, requestBytes).catch((error) => {
      withdrawAsk(envelope.ask_id);
      throw error;
    });
    if (askVerdict.kind === "refuse") {
      withdrawAsk(envelope.ask_id);
      return {
        requestBytes,
        approval: "withdrawn",
        outcome: describeWithdrawnAsk(askVerdict, host.name, host_2),
      };
    }
    let promptFailed = false;
    let reusedAnswer =
      approvedRule !== undefined &&
      (askVerdict.kind !== "ask_first" || isSameHostName(askVerdict.rule, approvedRule)) &&
      envelope.prior_answer_ok === true &&
      sameInputsModuloDefaults(askParsed.data, withLocalPaths(parsedInput), undefined);
    let classifierEligible =
      envelope.classifier_eligible === true &&
      askVerdict.kind !== "ask_first" &&
      (claimedMode === "auto" || (claimedMode === "plan" && isAutoModeCapableHost(host))) &&
      claimedMode === wirePermissionState(toolUseContext, tool.name).permissionMode;
    if (envelope.classifier_eligible === true && claimedMode === "plan" && !classifierEligible)
      logForDebugging(
        `[remoteCall] plan-mode ask ${envelope.ask_id} goes to a person: host accepts plan answers=${hasCapability(host)}, account-set mode=${getAccountSetPermissionMode() ?? "unknown"}, reached over ${host.transport.kind}`,
      );
    if (reusedAnswer) call.answeredWithoutPrompt();
    let planModeNow = getToolPermissionContext(toolUseContext).mode === "plan";
    let answer = reusedAnswer
      ? call.askEnded === undefined
        ? {
            decision: "allow",
          }
        : {
            ended: call.askEnded,
          }
      : await waitWhileAsking(call, envelope.ask_id, askLapseMs, (ended, patience) =>
          approve({
            askId: envelope.ask_id,
            ended,
            patience,
            askEnded: () => call.askEnded !== undefined,
            noteCard: (card) => {
              call.card = card;
            },
            host: host_2,
            tool: tool.name,
            input: envelope.input,
            message: sanitizeForPrompt(envelope.message, MAX_MACHINE_MESSAGE_CHARS),
            decisionReason:
              envelope.decision_reason === undefined
                ? undefined
                : sanitizeForPrompt(envelope.decision_reason, MAX_MACHINE_MESSAGE_CHARS),
            suggestions: (envelope.suggestions ?? []).map((suggestion) =>
              sanitizeForPrompt(suggestion, MAX_PROMPT_TEXT_CHARS),
            ),
            classifierEligible,
            keepsStandingApprovals: hasSessionCapability(host),
            offeredStandingRules: hasSessionCapabilityPair(host) ? (envelope.suggestions ?? []) : [],
            ...(pendingAsk !== undefined && {
              pendingBeforeRestart: true,
            }),
            ...(classifierEligible &&
              envelope.auto_mode !== undefined && {
                hostRules: import_mapValues(envelope.auto_mode, (rules) =>
                  rules?.map((rule) => promptSafeTruncated(rule)).filter((ruleText) => ruleText !== ""),
                ),
              }),
          }).catch((error) => {
            if (error instanceof AbortError && !signal.aborted) {
              if (call.askEnded !== undefined) {
                toolUseContext.abortController.abort(error);
                return;
              }
              withdrawAsk(envelope.ask_id);
              throw error;
            }
            promptFailed = !signal.aborted;
            if (promptFailed)
              logForDebugging(
                `remote tool call: the session's permission prompt failed: ${errorMessage(error)}`,
                {
                  level: "error",
                },
              );
            return;
          }),
        );
    if (answer !== undefined && "ended" in answer) {
      withdrawAsk(envelope.ask_id);
      return {
        requestBytes,
        ...describeNoAnswer(host, host_2, answer.ended, askLapseMs),
      };
    }
    if (answer === undefined || (signal.aborted && answer.decision !== "deny")) {
      withdrawAsk(envelope.ask_id);
      if (promptFailed && !signal.aborted)
        return {
          requestBytes,
          approval: "prompt_failed",
          outcome: {
            kind: "error",
            code: "prompt_failed",
            message: `This session could not raise its permission prompt for ${host.name}; the call did not run.`,
            host: host_2,
          },
        };
      return {
        outcome: interruptedResult(host_2, {
          withdrawnAtAsk: true,
        }),
        requestBytes,
        approval: "withdrawn",
      };
    }
    if (answer.decision === "unanswerable") {
      withdrawAsk(envelope.ask_id);
      return {
        requestBytes,
        approval: "prompt_failed",
        outcome: {
          kind: "error",
          code: "prompt_failed",
          message: `${answer.message} The call did not run on ${host.name}.`,
          host: host_2,
        },
      };
    }
    let feedback =
      answer.feedback === undefined ? undefined : truncateToLength(answer.feedback, MAX_MESSAGE_CHARS);
    let reply = {
      ask_id: envelope.ask_id,
      decision: answer.decision,
      ...(answer.decision === "allow" &&
        answer.updatedInput !== undefined && {
          updated_input: answer.updatedInput,
        }),
      ...(feedback !== undefined && {
        feedback,
      }),
      ...(answer.decision === "allow" &&
        answer.permissionUpdates !== undefined &&
        answer.permissionUpdates.length > 0 && {
          permission_updates: answer.permissionUpdates.slice(0, MAX_REMEMBERED_ASKS),
        }),
    };
    if (answer.decision === "allow" && !reusedAnswer && answer.decidedBy !== undefined)
      call.recordApprovedBy(answer.decidedBy);
    let byClassifier = answer.decision === "allow" && answer.decidedBy === "classifier";
    let raisedInPlanMode =
      (answer.decision === "allow" && answer.raisedInPlanMode !== undefined
        ? answer.raisedInPlanMode
        : planModeNow) &&
      getToolPermissionContext(toolUseContext).mode === "plan" &&
      (!byClassifier || claimedMode === "plan");
    if (answer.decision === "deny") {
      sendAnswer(reply);
      return {
        requestBytes,
        approval: answer.insteadOfRejection === undefined ? "denied" : "blocked",
        outcome: {
          kind: "error",
          code: "rejected_in_session",
          message:
            answer.insteadOfRejection?.message ?? remoteRejectMessage(toolUseContext.agentId, feedback),
          ...(answer.insteadOfRejection !== undefined && {
            denialKind: answer.insteadOfRejection.denialKind,
          }),
          host: host_2,
        },
      };
    }
    let editedParsed =
      answer.updatedInput === undefined ? undefined : tool.inputSchema.safeParse(answer.updatedInput);
    if (editedParsed?.success) beforeInput = restateRuleValue(editedParsed.data, askParsed.data, beforeInput);
    let editedVerdict =
      editedParsed === undefined
        ? undefined
        : editedParsed.success
          ? await checkPermission(withLocalPaths(editedParsed.data), requestBytes).catch((error) => {
              withdrawAsk(envelope.ask_id);
              throw error;
            })
          : {
              kind: "refuse",
              code: "invalid_input",
              message: `The edited ${tool.name} input from this session's prompt does not parse; it was not sent.`,
            };
    if (editedVerdict?.kind === "refuse") {
      withdrawAsk(envelope.ask_id);
      return {
        requestBytes,
        approval: "withdrawn",
        outcome: describeWithdrawnAsk(editedVerdict, host.name, host_2),
      };
    }
    let meta = buildMeta(reply);
    let input = envelope.input;
    let editedBytes = byteLengthOf({
      name: toolNames.wire,
      arguments: {
        ...input,
        [REMOTE_TOOL_CALL_META]: meta,
      },
    });
    let requestCap = maxRequestBytes(host);
    if (editedBytes > requestCap) {
      withdrawAsk(envelope.ask_id);
      return {
        requestBytes: editedBytes,
        approval: "withdrawn",
        outcome: {
          kind: "error",
          code: "request_too_large",
          message: inputTooLargeMessage({
            name: host.name,
            requestBytes: editedBytes,
            capBytes: requestCap,
          }),
          host: host_2,
        },
      };
    }
    let finalInput = answer.updatedInput ?? askParsed.data;
    let call_2 = editedParsed?.success
      ? {
          input: editedParsed.data,
          editedByApproval: true,
        }
      : sameInputsModuloDefaults(askParsed.data, withLocalPaths(parsedInput), undefined)
        ? {
            input: parsedInput,
            editedByApproval,
          }
        : undefined;
    let sendApproved = () => {
      let endQueuedWait = call.beginQueuedWait();
      return runWithSlot(sendSemaphore, host.name, maxInFlight, signal, async () => {
        endQueuedWait();
        if (isTerminalShutdown() && !signal.aborted) await heldUntilExit();
        let recheck = await checkPermission(withLocalPaths(finalInput), editedBytes);
        if (recheck.kind === "refuse")
          return {
            kind: "late_refusal",
            verdict: recheck,
          };
        if (
          recheck.kind === "ask_first" &&
          !isSameHostName(recheck.rule, approvedRule) &&
          !(askVerdict.kind === "ask_first" && isSameHostName(recheck.rule, askVerdict.rule)) &&
          !(editedVerdict?.kind === "ask_first" && isSameHostName(recheck.rule, editedVerdict.rule))
        )
          return {
            kind: "late_refusal",
            verdict: {
              code: "denied_by_session_rule",
              message: `A permission rule of this session now asks before this ${tool.name} call; it appeared after the approval. ${host.name} was not contacted.`,
            },
          };
        let classifierStillActive =
          !byClassifier || isAutoClassifierActive(getToolPermissionContext(toolUseContext).mode);
        if (
          !(reusedAnswer ? planModeAtAsk : raisedInPlanMode && classifierStillActive) &&
          getToolPermissionContext(toolUseContext).mode === "plan"
        ) {
          let readOnlyNow = false;
          try {
            readOnlyNow = tool.isReadOnly(finalInput, toolUseContext);
          } catch {}
          if (!readOnlyNow)
            return {
              kind: "late_refusal",
              verdict: {
                code: "denied_by_session_rule",
                message: ASK_FIRST_REASON_TEXTS["plan_mode.entered_while_asking"](tool.name),
              },
            };
        }
        if (signal.aborted)
          return {
            kind: "cancelled",
          };
        if (isTerminalShutdown()) await heldUntilExit();
        let sent = sendCall(buildMeta(reply), input);
        seat.release();
        return sent;
      }).then(
        (result) => {
          if (result === undefined) endQueuedWait();
          return result;
        },
        (error) => {
          withdrawAsk(envelope.ask_id);
          throw error;
        },
      );
    };
    let approval = reusedAnswer ? "pre_approved" : "allowed";
    let interpretAnswered = (transported, reason) => {
      let envelope_2 = transported?.kind === "result" ? transported.envelope : undefined;
      if (envelope_2?.outcome === "acknowledged" && envelope_2.ask_id === envelope.ask_id)
        return {
          approval: "withdrawn",
          outcome: {
            kind: "error",
            code: "approval_not_received",
            message: approvalDroppedMessage(host.name, reason, true),
            host: host_2,
          },
        };
      if (
        transported?.kind === "result" &&
        envelope_2 !== undefined &&
        (envelope_2.outcome === "in_progress" ||
          (envelope_2.outcome !== "needs_approval" &&
            envelope_2.outcome !== "acknowledged" &&
            envelope_2.replayed === true) ||
          (envelope_2.outcome === "completed" && envelope_2.disposition === "duplicate_call"))
      )
        return {
          approval,
          ...convertRemoteToolResult(tool, host, transported, {
            afterReconnect: true,
            call: call_2,
          }),
        };
      return {
        approval: "withdrawn",
        outcome: {
          kind: "error",
          code: "approval_not_received",
          message: approvalDroppedMessage(host.name, reason, false),
          host: host_2,
          open: "delivery_unknown",
        },
      };
    };
    return (async (transported) => {
      if (transported?.kind === "late_refusal") {
        withdrawAsk(envelope.ask_id);
        return {
          requestBytes: editedBytes,
          approval: "withdrawn",
          outcome: describeWithdrawnAsk(transported.verdict, host.name, host_2),
        };
      }
      if (
        transported === undefined ||
        transported.kind === "cancelled" ||
        transported.kind === "unreachable" ||
        transported.kind === "stalled" ||
        transported.kind === "approval_unverified"
      ) {
        withdrawAsk(envelope.ask_id);
        if (transported?.kind === "stalled")
          return {
            requestBytes: editedBytes,
            approval: "withdrawn",
            outcome: {
              kind: "error",
              code: transported.takenBack ? "stalled_unsent" : "stalled",
              message:
                transported.request === "probe"
                  ? livenessCheckWithdrawnMessage({
                      name: host.name,
                      capMs: transported.capMs,
                    })
                  : transported.takenBack
                    ? approvalWithdrawnMessage({
                        name: host.name,
                        capMs: transported.capMs,
                      })
                    : approvalNotSentMessage({
                        name: host.name,
                        capMs: transported.capMs,
                      }),
              ...(transported.request !== "probe" &&
                !transported.takenBack && {
                  open: "stalled",
                }),
              host: host_2,
            },
          };
        if (transported?.kind === "approval_unverified" && byClassifier)
          return {
            requestBytes: editedBytes,
            approval: "withdrawn",
            outcome: {
              kind: "error",
              code: "approval_unverified",
              message: classifierOnlyApprovalMessage(host.name, tool.name),
              host: host_2,
            },
          };
        return transported?.kind === "unreachable" || transported?.kind === "approval_unverified"
          ? {
              requestBytes: editedBytes,
              approval: "withdrawn",
              ...convertRemoteToolResult(tool, host, transported, {
                call: call_2,
              }),
            }
          : {
              outcome: interruptedResult(host_2, {
                withdrawnAtAsk: true,
              }),
              requestBytes,
              approval: "withdrawn",
            };
      }
      let collected = await collectResult(transported, {
        byClassifier,
        releaseAsk: () => withdrawAsk(envelope.ask_id),
      });
      if (collected.kind === "ended") {
        if (collected.outcome.kind === "error" && collected.outcome.code === "interrupted")
          withdrawAsk(envelope.ask_id);
        return {
          requestBytes: editedBytes,
          approval,
          reconcile: collected.trace,
          outcome: collected.outcome,
        };
      }
      let transported_2 = collected.transported;
      if (transported_2.kind !== "result" || transported_2.envelope?.outcome === "refused")
        withdrawAsk(envelope.ask_id);
      if (transported_2.kind === "stalled" && transported_2.takenBack)
        return {
          requestBytes: editedBytes,
          approval: "withdrawn",
          reconcile: collected.trace,
          outcome: {
            kind: "error",
            code: "stalled_unsent",
            message: approvalWithdrawnMessage({
              name: host.name,
              capMs: transported_2.capMs,
            }),
            host: host_2,
          },
        };
      if (
        transported_2.kind === "result" &&
        transported_2.envelope?.outcome === "refused" &&
        (transported_2.envelope.code === "withdrawn" ||
          transported_2.envelope.code === "stale" ||
          transported_2.envelope.reason === "stale_answer") &&
        !byClassifier &&
        !reusedAnswer
      )
        call.endAsk(
          normalizeWithdrawReason(
            transported_2.envelope.reason ?? (transported_2.envelope.code === "stale" ? "stale_answer" : ""),
          ),
        );
      if (transported_2.kind === "result" && transported_2.envelope?.outcome === "needs_approval") {
        if (collected.kind === "answered" && transported_2.envelope.ask_id === envelope.ask_id) {
          let answerResult = await withdrawAskAndWait(envelope.ask_id);
          return {
            requestBytes: editedBytes,
            reconcile: collected.trace,
            ...interpretAnswered(answerResult, collected.trace.trigger),
          };
        }
        withdrawAsk(transported_2.envelope.ask_id);
        return {
          requestBytes: editedBytes,
          approval: "asked_again",
          reconcile: collected.trace,
          outcome: {
            kind: "error",
            code: "refused_by_host",
            message: `Your approval reached ${host.name} after it stopped waiting for it; nothing ran. Retry the call if it is still wanted.`,
            host: host_2,
          },
        };
      }
      if (transported_2.kind === "dropped" && transported_2.why === "write_unresolved")
        return {
          requestBytes: editedBytes,
          approval,
          reconcile: collected.trace,
          outcome: {
            kind: "error",
            code: "dropped",
            message: approvalUploadUnconfirmedMessage(host.name),
            host: host_2,
            open: "delivery_unknown",
          },
        };
      return {
        requestBytes: editedBytes,
        approval,
        reconcile: collected.trace,
        ...convertRemoteToolResult(tool, host, transported_2, {
          afterReconnect: collected.kind === "answered",
          call: call_2,
        }),
      };
    })(await sendApproved());
  })();
  return collected.trace !== undefined && askHandling.reconcile !== collected.trace
    ? {
        ...askHandling,
        reconcileLeg1: collected.trace,
      }
    : askHandling;
}
//@ chunk-dtv8x2hx.js:57316-61083 placement
async function collectRemoteResult({
  transported,
  host,
  call,
  dispatchEpoch,
  toolName,
  callId,
  signal,
  timing,
  silentSince,
  silentCallTiming,
  onStatus,
  standingLine,
  approval,
}) {
  let leg = approval === undefined ? 1 : 2;
  let envelope =
    leg === 1 && transported.kind === "result" && transported.envelope?.outcome === "in_progress"
      ? transported.envelope
      : undefined;
  let lost = transported.kind === "dropped" || transported.kind === "timed_out" ? transported : undefined;
  if (lost === undefined && envelope === undefined)
    return {
      kind: "as_is",
      transported,
      trace: undefined,
    };
  let dispatchEpochUsed =
    envelope !== undefined
      ? (envelope.host_epoch ?? dispatchEpoch)
      : leg === 1
        ? (lost?.sentUnderEpoch ?? dispatchEpoch)
        : dispatchEpoch;
  let held = transported.kind === "timed_out" ? call.held : undefined;
  let dropHeld = (why) => {
    if (held === undefined) return;
    logRemoteTools(callId, "standing request withdrawn", {
      leg,
      why,
    });
    held.withdraw();
    call.hold(undefined);
  };
  if (dispatchEpochUsed === undefined) {
    dropHeld("no_epoch");
    return {
      kind: "as_is",
      transported,
      trace: undefined,
    };
  }
  let identity = machineIdentity(host);
  let trigger = lost === undefined ? "in_progress" : describeClassifierRefusal(lost, approval);
  let fence = formatRemoteOutputFence({
    name: host.name,
    showForMs: 2 * timing.intervalMs,
    onStatus,
    waiting: (waitingForAsk) =>
      held === undefined && envelope === undefined && !waitingForAsk
        ? reconnectingStatus(host.name)
        : ASK_FIRST_REASON_TEXTS["in_progress.checkin"](host.name),
    standing: held === undefined ? undefined : standingLine,
  });
  let outcome = await awaitRemoteCallWithProgress({
    host,
    held,
    dispatchEpoch: dispatchEpochUsed,
    toolName,
    callId,
    signal,
    timing,
    ranBefore: envelope?.state === "running",
    onAttempt: fence.onAttempt,
    onOutput: fence.onOutput,
    silentSince,
    silentCallTiming,
  });
  let { verdict } = outcome;
  let trace = {
    trigger,
    leg,
    result: verdict.kind === "unknown" ? `unknown_${verdict.why}` : verdict.kind,
    attempts: outcome.attempts,
    misses: outcome.misses,
    held: held !== undefined,
    epochChanged: outcome.epochChanged,
  };
  switch (verdict.kind) {
    case "late":
      noteDirSyncAnswer(host, verdict.transported);
      return {
        kind: "as_is",
        transported: verdict.transported,
        trace,
      };
    case "answer":
      noteDirSyncAnswer(host, verdict.transported);
      dropHeld(verdict.kind);
      return {
        kind: "answered",
        transported: {
          ...verdict.transported,
          metaCopy: undefined,
        },
        trace,
      };
    case "host_restarted":
      dropHeld(verdict.kind);
      return {
        kind: "ended",
        trace,
        outcome: {
          kind: "error",
          code: "host_restarted",
          message: hostRestartedLostMessage(host.name, trigger),
          host: identity,
        },
      };
    case "not_received":
      dropHeld(verdict.kind);
      return leg === 2 || envelope !== undefined
        ? {
            kind: "as_is",
            transported,
            trace,
          }
        : {
            kind: "ended",
            trace,
            outcome: {
              kind: "error",
              code: "not_received",
              message: neverReceivedMessage(host.name, trigger),
              host: identity,
            },
          };
    case "ask_lost":
      dropHeld(verdict.kind);
      return {
        kind: "ended",
        trace,
        outcome: {
          kind: "error",
          code: "still_running",
          message: stillRunningMessage({
            name: host.name,
            state: "awaiting_approval",
            cause: trigger,
          }),
          host: identity,
        },
      };
    case "unbound":
      host.transport.markUnresponsive?.();
      approval?.releaseAsk();
      return {
        kind: "ended",
        trace,
        outcome: {
          kind: "error",
          code: "host_unresponsive",
          message:
            ASK_FIRST_REASON_TEXTS["unverified_refusal.call_phase"]({
              name: host.name,
              whileRunning: verdict.whileRunning,
            }) + fence.outputNote(),
          host: identity,
          open: "host_unresponsive",
        },
      };
    case "host_unresponsive":
      if (!verdict.stillConnected) host.transport.markUnresponsive?.();
      if (verdict.intervalMs !== undefined)
        held?.late.then((value) => {
          if (value.kind === "result") logFeatureSad("rtc_silent_call", "answered_late");
        });
      return {
        kind: "ended",
        trace,
        outcome: {
          kind: "error",
          code: "host_unresponsive",
          message:
            ASK_FIRST_REASON_TEXTS.host_unresponsive({
              name: host.name,
              checks: verdict.misses,
              intervalMs: verdict.intervalMs ?? timing.intervalMs,
              whileRunning: verdict.whileRunning,
              stillConnected: verdict.stillConnected,
              returnNoted: isHostAwayRecheckable(host),
            }) + fence.outputNote(),
          host: identity,
          open: "host_unresponsive",
        },
      };
    case "host_asleep":
      host.transport.markUnresponsive?.();
      return {
        kind: "ended",
        trace,
        outcome: {
          kind: "error",
          code: "host_unresponsive",
          message:
            ASK_FIRST_REASON_TEXTS.host_asleep({
              name: host.name,
              whileRunning: verdict.whileRunning,
              withdrawn: lost?.kind === "timed_out" && held === undefined,
              returnNoted: hostAnnouncesReturn(host),
            }) + fence.outputNote(),
          host: identity,
          open: "host_asleep",
        },
      };
    case "cancelled":
      dropHeld(verdict.kind);
      return {
        kind: "ended",
        trace,
        outcome: interruptedResult(identity, {
          askLater: envelope !== undefined,
        }),
      };
    case "gone":
      return {
        kind: "as_is",
        transported: verdict.transported,
        trace,
      };
    case "unreachable":
    case "unknown":
      if (held?.takeBack() === true) {
        logRemoteTools(callId, "standing request taken back unsent", {
          leg,
        });
        return {
          kind: "as_is",
          transported: {
            kind: "stalled",
            capMs: transported.kind === "timed_out" ? transported.capMs : 0,
            request: "call",
            takenBack: true,
          },
          trace,
        };
      }
      if (held === undefined || transported.kind !== "timed_out")
        return {
          kind: "as_is",
          transported,
          trace,
        };
      if (verdict.kind === "unreachable" && !held.accepted()) {
        dropHeld("unreachable_unaccepted");
        return {
          kind: "as_is",
          transported,
          trace,
        };
      }
      return {
        kind: "ended",
        trace,
        outcome: {
          kind: "error",
          code: "timed_out",
          message:
            callTimedOutMessage({
              name: host.name,
              capMs: transported.capMs,
              left: true,
            }) + fence.outputNote(),
          host: identity,
          open: "timed_out",
        },
      };
  }
}
//@ chunk-dtv8x2hx.js:61083-61320 placement
function waitWhileAsking(card, askId, afterMs, waitForAnswer) {
  let abortController = new AbortController();
  let resolveEnded;
  let promise = new Promise((resolve) => {
    resolveEnded = (ended) =>
      resolve({
        ended,
      });
  });
  return card.whileAsking(
    {
      askId,
      end: (reason) => {
        abortController.abort(reason);
        resolveEnded(reason);
      },
    },
    (helpers) =>
      abortController.signal.aborted
        ? promise
        : Promise.race([promise, waitForAnswer(abortController.signal, helpers)]),
    {
      afterMs,
      reason: "no_answer",
    },
  );
}
//@ chunk-dtv8x2hx.js:61320-61662 placement
function describeNoAnswer(host, host_2, ended, afterMs) {
  return {
    approval: ended === "no_answer" ? "no_answer" : "withdrawn",
    askEndReason: ended,
    outcome:
      ended === "no_answer"
        ? {
            kind: "error",
            code: "no_answer",
            message: ASK_FIRST_REASON_TEXTS.no_answer({
              name: host.name,
              afterMs,
              waitAnnounced: host.description?.limits.max_ask_ms !== undefined,
            }),
            host: host_2,
          }
        : {
            kind: "error",
            code: "withdrawn",
            message: ASK_FIRST_REASON_TEXTS.withdrawn({
              name: host.name,
              reason: ended,
            }),
            host: host_2,
          },
  };
}
//@ chunk-dtv8x2hx.js:61662-61883 placement
function describeClassifierRefusal(failure, approval) {
  if (isUnverifiedRefusal(failure))
    return approval?.byClassifier ? "classifier_refused" : "unverified_refusal";
  if (failure.kind === "dropped" && failure.why === "write_unresolved")
    return approval !== undefined ? "approval_write_unresolved" : "write_unresolved";
  return failure.kind;
}
//@ chunk-dtv8x2hx.js:61883-62138 placement
function describeWithdrawnAsk(decision, name, host) {
  let suffix = ` ${name} was not contacted.`;
  let trimmed = decision.message.endsWith(suffix)
    ? decision.message.slice(0, -suffix.length)
    : decision.message;
  return {
    kind: "error",
    code: decision.code,
    message: `${trimmed} ${name} had already been asked; its suspended call was withdrawn and nothing ran there.`,
    host,
  };
}
//@ chunk-dtv8x2hx.js:62138-62317 placement
function wirePermissionState(toolUseContext, name) {
  let toolPermissionContext = getToolPermissionContext(toolUseContext);
  let mode =
    toolPermissionContext.mode === "auto" && isAskOnMutationTool(name, toolUseContext.getProactivityLevel())
      ? "default"
      : toolPermissionContext.mode;
  return {
    permissionMode: wirePermissionMode(mode),
    isBypassAvailable: toolPermissionContext.isBypassPermissionsModeAvailable,
  };
}
//@ chunk-dtv8x2hx.js:62317-62404 placement
function noteDirSyncAnswer(host, transported) {
  if (transported.kind === "result" && transported.dirSync !== undefined)
    try {
      heardSyncAnswer(host, transported.dirSync);
    } catch {}
}
//@ chunk-dtv8x2hx.js:62404-62603 placement
function remoteToolNames(tool, host) {
  if (tool.isMcp !== true)
    return {
      wire: tool.name,
      ask: tool.name,
    };
  let toolName = tool.mcpInfo?.toolName;
  let mapped = toolName === undefined ? undefined : host.passthroughTools?.get(toolName);
  return toolName === undefined || mapped === undefined
    ? undefined
    : {
        wire: toolName,
        ask: mapped.localName,
      };
}
export { collectAskRules, logRemoteToolForward, waitForAskAnswer, logRemoteForward, primaryInputPath };
