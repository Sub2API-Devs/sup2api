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
import { xr } from "../../../vendor/lodash-es/_inlinedHelpers.js";
import { logRemoteTools } from "./remoteToolsDebug.js";
import { isAskOnMutationTool } from "../../utils/permissions/permissions.js";

//@ chunk-dtv8x2hx.js:24606-24866 placement
function collectAskRules(e) {
  let decisionReason = e.decisionReason;
  return [
    ...(e.matchedAskRule !== undefined ? [e.matchedAskRule] : []),
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
async function holdForReconnect({ tool, host, call: o, signal, onStatus, holdMs }) {
  if (!isViolinWaistOn()) return;
  let { name: p } = host;
  let i = {
    ended: "inconclusive",
  };
  try {
    let h = await host.transport
      .checkLive?.({
        signal,
        ...(o.reconnectHoldMs === undefined && {
          hold: {
            ms: holdMs,
            notify: (k) => {
              if (k === "back") {
                i.ended = "back";
                return;
              }
              i.stopTiming = o.beginReconnectHold();
              onStatus?.(
                ASK_FIRST_REASON_TEXTS["reconnect_hold.waiting"]({
                  name: p,
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
        i.ended = "failed";
        return;
      });
    if (signal.aborted) i.ended = "interrupted";
    else if (h !== undefined) i.ended = "still_away";
    if (i.stopTiming !== undefined) {
      i.stopTiming();
      onStatus?.(
        i.ended === "back"
          ? ASK_FIRST_REASON_TEXTS["ask_seat.sending"](p)
          : ASK_FIRST_REASON_TEXTS["reconnect_hold.ended"](p),
      );
      if (i.ended === "back") logFeatureOk("remote_tool_reconnect_hold");
      else if (i.ended === "still_away") logFeatureBad("remote_tool_reconnect_hold", i.ended);
      else logFeatureSad("remote_tool_reconnect_hold", i.ended);
    }
    if (h === undefined || signal.aborted) return;
    let w = convertRemoteToolResult(tool, host, h);
    return i.stopTiming === undefined || w.outcome.kind !== "error"
      ? w
      : {
          ...w,
          outcome: {
            ...w.outcome,
            message: `${w.outcome.message} ${ASK_FIRST_REASON_TEXTS["reconnect_hold.gave_up"]({
              name: p,
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
function logRemoteToolCallOutcome(tool, host, entry, r, s, toolUseContext, callerGate) {
  let { outcome } = r;
  let elapsedMs = s.elapsedMs;
  let w = analyzeTurnTail(toolUseContext.messages);
  let decider = w.decider;
  let origin = decider?.origin;
  let A = decider == null ? undefined : toolUseContext.messages[decider.index];
  let R =
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
    outcome: fromEnum(R),
    refusal_code: fromEnumOpt(r.refusalCode),
    failure_code: fromEnumOpt(r.failureCode),
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
    approval: fromEnumOpt(r.approval),
    claimed_mode: fromEnumOpt(s.claimedMode),
    turn_opened_by: fromEnum(
      decider?.strictHuman === true && A !== undefined && isHumanTurn(A)
        ? "own_words"
        : w.scheduledTrigger
          ? "routine"
          : decider === null
            ? "unknown"
            : origin?.kind === "task-notification" && origin.producer === "session-task"
              ? "helper_report"
              : getOriginKindLabel(origin),
    ),
    from_agent: toolUseContext.agentId !== undefined,
    standing_row: fromEnumOpt(s.card?.standingRow),
    standing_row_chosen: s.card?.chosen,
    repeat_in_session: toolUseContext.toolState.get(RemoteAskSeat).askedAboutBefore(s),
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
    approved_by: fromEnumOpt(s.approvedBy),
    refusal_reason: fromEnumOpt(r.askEndReason),
    delivery: fromEnumOpt(outcome.kind === "completed" ? outcome.delivery : undefined),
    adoption: fromEnumOpt(r.adoption),
    inherited_withdrawn: s.inheritedRequestId === undefined ? undefined : s.inheritedWithdrawn,
    reconcile_trigger: fromEnumOpt(r.reconcile?.trigger),
    reconcile_leg: r.reconcile?.leg,
    reconcile_result: fromEnumOpt(r.reconcile?.result),
    reconcile_attempts: r.reconcile?.attempts,
    checkin_misses: r.reconcile?.misses,
    held: r.reconcile?.held,
    epoch_changed: r.reconcile?.epochChanged,
    reconcile_leg1_result: fromEnumOpt(r.reconcileLeg1?.result),
    duration_ms: elapsedMs,
    time_to_terminal_ms: elapsedMs - s.askingMs,
    asking_ms: s.askingMs,
    queued_ms: s.queuedMs,
    ask_seat_wait_ms: s.askSeatWaitMs,
    reconnect_hold_ms: s.reconnectHoldMs,
    sent_without_ask_seat: s.sentWithoutAskSeat,
    ...buildTimingFields("leg1", s.legTransit(1)),
    ...buildTimingFields("leg2", s.legTransit(2)),
    request_bytes: r.requestBytes,
    response_bytes: r.responseBytes,
    meta_copy: fromEnumOpt(r.metaCopy),
    read_baseline_sent: r.readBaselineSent === true,
    call_id: sanitizeMarkName(s.callId),
    tool_use_id: sanitizeMarkName(s.callId),
    host_epoch: sanitizeMarkName(s.sentUnderEpoch),
    handle_hash: host.description === undefined ? undefined : shortHash(host.description.name),
    host_device_id: sanitizeMarkName(host.description?.device_id),
    criteria_version: lit(REMOTE_TOOL_PROTOCOL_LABEL),
  });
  classifyCompletion(R);
}
//@ chunk-dtv8x2hx.js:29905-30277 placement
function classifyCompletion(e) {
  switch (
    e === "completed" || e === "completed_error"
      ? SERVED_OUTCOME_TABLE.ran.bucket
      : e === "completed_no_envelope"
        ? "sad"
        : e === "not_run_on_host"
          ? SERVED_OUTCOME_TABLE.denied_by_rule.bucket
          : e === "unreadable_result"
            ? SERVED_OUTCOME_TABLE.transport_error.bucket
            : SERVED_OUTCOME_TABLE[e].bucket
  ) {
    case "ok":
      logFeatureOk("remote_tool_forward");
      return;
    case "sad":
      logFeatureSad("remote_tool_forward", e);
      return;
    case "bad":
      logFeatureBad("remote_tool_forward", e);
      return;
    case "none":
      return;
  }
}
//@ chunk-dtv8x2hx.js:30277-30663 placement
function logRemoteToolForward(e, host, o, toolUseId, verdict) {
  logEvent("tengu_remote_tool_forward", {
    tool: analyticsToolName(e),
    transport: fromEnum(host.transport.kind),
    entry: fromEnum(o),
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
function logRemoteForward(tool, n, code, r) {
  logEvent("tengu_remote_tool_forward", {
    tool: analyticsToolName(tool),
    entry: fromEnum(n),
    outcome: fromEnum(code),
    call_id: sanitizeMarkName(r),
    tool_use_id: sanitizeMarkName(r),
    criteria_version: lit(REMOTE_TOOL_PROTOCOL_LABEL),
  });
  classifyCompletion(code);
}
//@ chunk-dtv8x2hx.js:30814-30884 placement
function compareSemverOrDefaultUnknown(claudeCodeVersion, n) {
  return isSemverString(claudeCodeVersion) && isSemverString(n)
    ? VERSION_COMPARISON_LABELS[compareVersions(splitOnDash(claudeCodeVersion), splitOnDash(n))]
    : "unknown";
}
//@ chunk-dtv8x2hx.js:30884-31066 placement
function buildTimingFields(e, n) {
  return n === undefined
    ? {}
    : {
        [`${e}_queue_ms`]: n.queueMs,
        [`${e}_post_ms`]: n.postMs,
        [`${e}_reply_wait_ms`]: n.replyWaitMs,
        [`${e}_total_ms`]: n.totalMs,
        [`${e}_posts`]: n.posts,
      };
}
//@ chunk-dtv8x2hx.js:31066-31128 placement
function analyticsToolName(e) {
  return e.isMcp === true ? sanitizeToolNameForAnalytics("mcp__tool") : sanitizeToolNameForAnalytics(e.name);
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
function escapeForPrompt(e) {
  return redactSecrets(
    replaceControlChars(e.normalize("NFKC")).replace(regExp, "&lt;").replace(regExp_2, "&gt;").trim(),
  );
}
//@ chunk-dtv8x2hx.js:31438-31501 placement
function promptSafeTruncated(e) {
  return escapeForPrompt(
    truncateToLength(redactSecrets(replaceControlChars(e.normalize("NFKC"))), MAX_LINE_CHARS),
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
  let E = toolUseContext.toolState.get(RemoteAskSeat);
  let D = askLapseMs ?? clampedHostLimit(route.host, "max_ask_ms");
  let X = E.begin({
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
          afterMs: D,
        }),
      ),
  });
  let L = UNEXPECTED_FORWARD_ERROR;
  try {
    L = await resolveEarlyCheck({
      tool,
      entry,
      host: route.host,
      input: route.input,
      rawInput,
      toolUseContext,
      call: X,
      signal,
      approve,
      speculation,
      onStatus,
      checkInTiming: checkInTiming ?? progressCheckTiming(route.host),
      earlyCheckTiming: earlyCheckTiming ?? PROGRESS_WATCH_TIMING,
      silentCallTiming: silentCallTiming ?? SILENT_CALL_TIMING,
      askLapseMs: D,
      askSeatWaitMs: askSeatWaitMs ?? DEFAULT_ASK_SEAT_WAIT_MS,
      reconnectHoldMs: reconnectHoldMs ?? DEFAULT_RECONNECT_HOLD_MS,
      callerGate,
    });
    if (
      L.outcome.kind === "error" &&
      (L.outcome.code === "unreachable" || L.outcome.code === "host_unresponsive")
    )
      toolUseContext.toolState
        .get(AwayEpisodeTracker)
        .told(
          toolUseContext.toolState.get(RemoteBackgroundCommands),
          toolUseContext.agentId,
          route.host.name,
        );
    return L.outcome;
  } catch (error) {
    if (error instanceof AbortError || signal.aborted) L = INTERRUPTED_FORWARD;
    throw error;
  } finally {
    speculation?.abandon();
    E.settle(X, L.outcome);
    logRemoteToolCallOutcome(tool, route.host, entry, L, X, toolUseContext, callerGate);
    describeAskSeat(L, X, {
      tool,
      route,
      rawInput,
      toolUseContext,
    });
  }
}
//@ chunk-dtv8x2hx.js:32654-33567 placement
function describeAskSeat(e, n, { tool, route, rawInput, toolUseContext }) {
  if (route.host.transport.kind !== "session") return;
  try {
    let p = toolUseContext.toolState.get(RemoteCallLedger);
    let open = e.outcome.kind === "error" ? e.outcome.open : undefined;
    if (open === undefined) {
      p.forget(n.callId);
      return;
    }
    let held = n.held;
    let w = e.journalHost !== undefined && e.journalHost !== route.host.name;
    p.gaveUp({
      callId: n.callId,
      agentId: toolUseContext.agentId,
      hostName: e.journalHost ?? route.host.name,
      toolName: tool.name,
      wireToolName: n.wireName ?? tool.name,
      spelled: primaryInputPath(rawInput),
      toldAs: open,
      machineHadCall:
        e.approval !== undefined ||
        e.reconcile?.trigger === "in_progress" ||
        e.adoption === "ask_in_flight" ||
        e.adoption === "interrupted",
      transport: w ? undefined : route.host.transport,
      dispatchEpoch: e.adoption === undefined ? n.sentUnderEpoch : e.journalEpoch,
      standing: held !== undefined,
      ...(held !== undefined && {
        withdraw: held.withdraw,
      }),
      givenUpAt: Date.now(),
    });
    held?.late.then((k) => p.answeredLate(n.callId, k)).catch(() => {});
  } catch (error) {
    logForDebugging(
      `[remote-tools] could not record a given-up call for a later correction: ${errorMessage(error)}`,
    );
  }
}
//@ chunk-dtv8x2hx.js:33567-33804 placement
function primaryInputPath(rawInput) {
  let found = ["command", "file_path", "path", "notebook_path"]
    .map((o) => rawInput[o])
    .find((o) => typeof o === "string" && o !== "");
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
async function describeDeliveryFailure(e, n, o) {
  let { tool, host, signal } = e;
  let callId = e.call.callId;
  let i = machineIdentity(host);
  let h = {
    host: n.host,
  };
  let w = {
    journalHost: n.host,
    ...(n.host_epoch !== undefined && {
      journalEpoch: n.host_epoch,
    }),
  };
  let k = (code, message, adoption, y, I) => ({
    outcome: {
      kind: "error",
      code,
      message,
      host: i,
      ...(I !== undefined && {
        open: I,
      }),
    },
    adoption,
    ...w,
    ...(y !== undefined && {
      reconcile: y,
    }),
  });
  let S = n.parkedAtRestart ? undefined : "delivery_unknown";
  if (!isSameHostEpoch(n, host))
    return k("host_restarted", restartNoticeFor(h, n), "instance_gone", undefined, S);
  let A = remoteToolNames(tool, host);
  if (A === undefined) return k("unreachable", restartNoticeFor(h, n), "unknown", undefined, S);
  let requestId = n.request_id;
  if (requestId !== undefined && host.transport.withdrawStanding !== undefined) {
    if (n.instance_id !== undefined) e.call.recordAddressee(n.instance_id, n.host_epoch);
    e.call.inherit(requestId, () => host.transport.withdrawStanding?.(requestId));
  }
  let checkInTiming = e.checkInTiming;
  let O = formatRemoteOutputFence({
    name: host.name,
    showForMs: 2 * checkInTiming.intervalMs,
    onStatus: e.onStatus,
    waiting: (D) =>
      D ? ASK_FIRST_REASON_TEXTS["in_progress.checkin"](host.name) : reconnectingStatus(host.name),
    standing: undefined,
  });
  let x = await awaitRemoteCallWithProgress({
    host,
    held: undefined,
    dispatchEpoch: n.host_epoch,
    toolName: A.wire,
    callId,
    signal,
    timing: checkInTiming,
    onAttempt: O.onAttempt,
    onOutput: O.onOutput,
  });
  let { verdict } = x;
  let reconcile = {
    trigger: "resumed",
    leg: 1,
    result: verdict.kind === "unknown" ? `unknown_${verdict.why}` : verdict.kind,
    attempts: x.attempts,
    misses: x.misses,
    held: false,
    epochChanged: x.epochChanged,
  };
  switch (verdict.kind) {
    case "late":
    case "answer": {
      let { transported } = verdict;
      if (transported.kind !== "result")
        return k("unreachable", restartNoticeFor(h, n), "unknown", reconcile, S);
      let { envelope } = transported;
      if (envelope?.outcome === "needs_approval") {
        let L =
          host.description?.limits.max_ask_ms !== undefined &&
          Date.now() - n.dispatched_at <= SYNC_ANSWER_TTL_MS &&
          isViolinCornerOn()
            ? await o(transported)
            : undefined;
        if (L?.approval !== undefined)
          return {
            ...L,
            adoption: "ask_carried_over",
            ...w,
            reconcileLeg1: reconcile,
          };
        return toolResultForInterruption(e, n, A.wire, envelope.ask_id, reconcile);
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
      return k("still_running", pendingPermissionNotice(h), "ask_in_flight", reconcile, "delivery_unknown");
    case "not_received":
      return k("not_received", neverReceivedNotice(h), "never_received", reconcile);
    case "host_restarted":
    case "gone":
      return k("host_restarted", restartNoticeFor(h, n), "instance_gone", reconcile, S);
    case "host_unresponsive":
      if (!verdict.stillConnected) host.transport.markUnresponsive?.();
      return k(
        "host_unresponsive",
        ASK_FIRST_REASON_TEXTS.host_unresponsive({
          name: host.name,
          checks: verdict.misses,
          intervalMs: verdict.intervalMs ?? checkInTiming.intervalMs,
          whileRunning: verdict.whileRunning,
          stillConnected: verdict.stillConnected,
          returnNoted: isHostAwayRecheckable(host),
        }) + O.outputNote(),
        "unknown",
        reconcile,
        "host_unresponsive",
      );
    case "host_asleep":
      host.transport.markUnresponsive?.();
      return k(
        "host_unresponsive",
        ASK_FIRST_REASON_TEXTS.host_asleep({
          name: host.name,
          whileRunning: verdict.whileRunning,
          withdrawn: false,
          returnNoted: hostAnnouncesReturn(host),
        }) + O.outputNote(),
        "unknown",
        reconcile,
        "host_asleep",
      );
    case "unbound":
      host.transport.markUnresponsive?.();
      return k(
        "host_unresponsive",
        ASK_FIRST_REASON_TEXTS["unverified_refusal.call_phase"]({
          name: host.name,
          whileRunning: verdict.whileRunning,
        }) + O.outputNote(),
        "unknown",
        reconcile,
        "host_unresponsive",
      );
    case "cancelled":
      e.call.withdrawInherited();
      return {
        outcome: interruptedResult(i, {
          askLater: true,
        }),
        adoption: "interrupted",
        ...w,
        reconcile,
      };
    case "unreachable":
    case "unknown":
      return k("unreachable", restartNoticeFor(h, n), "unknown", reconcile, S);
  }
}
//@ chunk-dtv8x2hx.js:36883-38086 placement
async function toolResultForInterruption(e, n, wire, askId, reconcile) {
  let { tool, host, toolUseContext } = e;
  let callId = e.call.callId;
  let w = machineIdentity(host);
  let k = {
    host: n.host,
  };
  let defaultDeadlineMs = host.transport.limits.defaultDeadlineMs;
  let A = await raceWithAbortSignal(
    host.transport
      .call(
        wire,
        e.input,
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
    e.signal,
    () => new AbortError(),
  ).catch(() => {
    return;
  });
  if (e.signal.aborted)
    return {
      outcome: interruptedResult(w),
      adoption: "interrupted",
      reconcile,
    };
  let envelope = A?.kind === "result" ? A.envelope : undefined;
  if (
    A?.kind === "result" &&
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
          ...A,
          metaCopy: undefined,
        },
        {
          afterReconnect: true,
        },
      ),
    };
  if (
    A?.kind === "result" &&
    (envelope?.outcome === "in_progress" ||
      (envelope?.outcome === "completed" && envelope.disposition === "duplicate_call"))
  )
    return {
      outcome: {
        kind: "error",
        code: "still_running",
        message: stillRunningNotice(k),
        host: w,
      },
      adoption: "still_running",
      reconcile,
    };
  let T = envelope?.outcome === "acknowledged" && envelope.ask_id === askId;
  return {
    outcome: {
      kind: "error",
      code: "approval_not_received",
      message: T ? approvalWithdrawnNotice(k) : approvalWithdrawUnconfirmedNotice(k),
      host: w,
    },
    adoption: T ? "ask_withdrawn" : "unknown",
    reconcile,
  };
}
//@ chunk-dtv8x2hx.js:38086-39430 placement
async function resolveEarlyCheck(e) {
  let n;
  let o = false;
  let r = e.toolUseContext.toolState.get(ServedCallRegistry);
  let s;
  let u = (A) => {
    if (A === undefined) return;
    let R = s !== undefined;
    s = A;
    if (R) return;
    queueMicrotask(() => {
      let T = s;
      s = undefined;
      if (T !== undefined)
        e.toolUseContext.sessionState?.notifyInternalMetadataChanged({
          in_flight_served_calls: T,
        });
    });
  };
  let p = r.adopted(e.call.callId);
  r.takeAdopted(e.call.callId);
  let i;
  let h = () => {
    let { sentUnderEpoch, carryingRequestId, instanceId } = e.call;
    if (
      i !== undefined &&
      i.host_epoch === sentUnderEpoch &&
      i.request_id === carryingRequestId &&
      i.instance_id === instanceId
    )
      return;
    i = {
      tool_use_id: e.call.callId,
      tool: e.tool.name,
      host: e.host.name,
      ...(sentUnderEpoch !== undefined && {
        host_epoch: sentUnderEpoch,
      }),
      ...(carryingRequestId !== undefined && {
        request_id: carryingRequestId,
      }),
      ...(instanceId !== undefined && {
        instance_id: instanceId,
      }),
      dispatched_at: i?.dispatched_at ?? Date.now(),
    };
    u(r.add(i));
  };
  let w;
  try {
    let A = {
      ...e,
      noteSync: (R) => {
        n = R;
      },
      noteReadBaselineSent: () => {
        o = true;
      },
      onFirstSend: h,
      onAddressed: h,
    };
    w =
      p !== undefined
        ? await describeDeliveryFailure(e, p, (pendingAsk) =>
            runRemoteToolCall({
              ...A,
              pendingAsk,
            }),
          )
        : await runRemoteToolCall(A);
  } finally {
    if (!isTerminalShutdown()) r.remove(e.call.callId);
  }
  let k = o
    ? {
        ...w,
        readBaselineSent: o,
      }
    : w;
  if (k.outcome.kind !== "completed" || !isRanOutcome(k.outcome.disposition)) return k;
  if (k.outcome.dirSync !== undefined) await countAfterDeviceCommand(k.outcome.dirSync);
  let S =
    e.call.approvedBy ??
    (p === undefined &&
    e.callerGate === undefined &&
    k.outcome.delivery === "fresh" &&
    k.outcome.disposition === "ran"
      ? "unasked"
      : undefined);
  return {
    ...k,
    outcome: {
      ...k.outcome,
      ...(S !== undefined && {
        permittedBy: S,
      }),
      ...(n !== undefined && {
        sessionNotes: [
          ...(k.outcome.sessionNotes ?? []),
          {
            text: n,
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
  call: p,
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
  let callId = p.callId;
  let { dispatchEpoch } = p;
  let Y = tool.inputSchema.safeParse(input);
  if (!Y.success)
    return {
      outcome: {
        kind: "error",
        code: "invalid_input",
        message: formatZodValidationError(tool.name, Y.error),
        host: host_2,
      },
    };
  let te = remoteToolNames(tool, host);
  if (te === undefined)
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
  let ee;
  let se;
  let ue = (transported, approval) =>
    collectRemoteResult({
      transported,
      host,
      call: p,
      dispatchEpoch,
      toolName: te.wire,
      callId,
      signal,
      timing: checkInTiming,
      silentSince: se,
      silentCallTiming,
      onStatus,
      standingLine: ee,
      approval,
    });
  let oe = Y.data;
  let ro = oe;
  let we = input;
  let editedByApproval = false;
  let dirFacts = host.description === undefined ? undefined : remoteDirFacts(host.description);
  let pe = (C) =>
    tool.backfillObservableInput === undefined || dirFacts === undefined
      ? C
      : resolveRemoteFilePathInput(C, dirFacts);
  let ruleContentField = tool.getPath === undefined ? undefined : tool.ruleContentField;
  let Nn = (C) =>
    tool.name === GLOB_TOOL_NAME && dirFacts !== undefined && typeof C.pattern === "string"
      ? splitGlobRoot(C.pattern, dirFacts)
      : undefined;
  let Hn = (C, P, G) => {
    let V = ruleContentField === undefined ? undefined : C[ruleContentField];
    if (ruleContentField === undefined || dirFacts === undefined || typeof V !== "string") return C;
    if (V === P[ruleContentField] && typeof G[ruleContentField] === "string")
      return {
        ...C,
        [ruleContentField]: G[ruleContentField],
      };
    let displayPath = toDisplayPath(V, dirFacts);
    return displayPath === undefined
      ? C
      : {
          ...C,
          [ruleContentField]: displayPath,
        };
  };
  let ge = oe;
  let io = (C) => {
    let P = Nn(C);
    let path = P?.root ?? (ruleContentField === undefined ? undefined : (C[ruleContentField] ?? "."));
    if (ruleContentField === undefined || dirFacts === undefined || typeof path !== "string") return [];
    return remotePathSpellings(path, dirFacts)
      .filter((V) => P !== undefined || (V !== ge[ruleContentField] && V !== C[ruleContentField]))
      .map((V) =>
        P === undefined
          ? {
              ...C,
              [ruleContentField]: V,
            }
          : {
              ...C,
              [ruleContentField]: V,
              pattern: P.rest,
            },
      );
  };
  let ao = (C) => {
    let P =
      ruleContentField === undefined || dirFacts === undefined
        ? undefined
        : C.map((G) => {
            let V = Nn(G);
            return V === undefined ? [G[ruleContentField], G[ruleContentField]] : [G.pattern, V.root];
          })
            .flatMap(([G, V]) =>
              typeof G === "string" && typeof V === "string"
                ? [[G, checkWindowsPathSafety(V, dirFacts)]]
                : [],
            )
            .find(([, G]) => G !== undefined);
    return P?.[1] === undefined
      ? undefined
      : {
          kind: "refuse",
          code: P[1] === "magic_link" ? "declined_magic_link" : "declined_spelling",
          message: unmatchedPathSpellingMessage({
            name: host.name,
            toolName: tool.name,
            path: P[0],
            spellingIs: UNSAFE_PATH_REASON_TEXT[P[1]],
          }),
        };
  };
  let Fn = SHELL_TOOL_NAMES.includes(tool.name) ? remoteDirKind(host.description) : undefined;
  let Ae = async (C, requestBytes) => {
    let G = ao([ge, C]);
    if (G !== undefined) return G;
    let flattened = uniq([ge, ...io(C), C]).flatMap((parsedInput) => [
      {
        parsedInput,
        machineDir: undefined,
      },
      ...(Fn?.kind === "in_announced_dir"
        ? [
            {
              parsedInput,
              machineDir: Fn.dir,
            },
          ]
        : []),
    ]);
    let Q = {
      kind: "proceed",
    };
    for (let { parsedInput, machineDir } of flattened) {
      if (Q.kind === "refuse") break;
      let Z = () =>
        checkRemoteToolPermission({
          tool,
          parsedInput,
          requestBytes,
          toolUseContext,
          host,
        });
      Q = isProceedVerdict(
        Q,
        machineDir === undefined
          ? await Z()
          : await runWithoutTelemetry(() => runInRemoteCallFrameMain(machineDir, Z)),
      );
    }
    return Q;
  };
  let defaultDeadlineMs = host.transport.limits.defaultDeadlineMs;
  let expiresInMs = Math.max(1, defaultDeadlineMs - ASK_DEADLINE_SLACK_MS);
  let compactionId =
    toolUseContext.agentId === undefined
      ? toolUseContext.messages.findLast(isCompactBoundaryMessage)?.uuid
      : undefined;
  let Re;
  let he = (C) => {
    let P = wirePermissionState(toolUseContext, tool.name);
    if (C === undefined) {
      Re = P.permissionMode;
      p.claimedMode = Re;
    }
    return buildRemoteToolCallMeta({
      callId,
      expiresInMs,
      ...P,
      model: getMainLoopModel(toolUseContext),
      conversationId: getSessionId(),
      compactionId,
      ...(C !== undefined && {
        approval: C,
      }),
      ...(C === undefined && {
        readBaseline: co(),
      }),
    });
  };
  let co = () =>
    readBaselineForRemoteWrite({
      tool,
      input: oe,
      description: host.description,
      readFileState: toolUseContext.readFileState,
      sessionDir: () => taskCwd(toolUseContext.session),
    });
  let Je = (C) =>
    byteLengthOf({
      name: te.wire,
      arguments: {
        ...we,
        [REMOTE_TOOL_CALL_META]: C,
      },
    });
  let Dn = (C, P = we) => {
    p.sent({
      wireName: te.wire,
      input: P,
    });
    p.hold(undefined);
    toolUseContext.markToolCallRunning?.(callId);
    let G;
    let V = false;
    let Q = toolUseContext.toolState.get(RemoteCallState);
    let re = watchRemoteCallProgress({
      host,
      toolName: te.wire,
      callId,
      signal,
      onStatus,
      timing: earlyCheckTiming,
      mayCheck: () => SHELL_TOOL_NAMES.includes(tool.name) && V && Q.has(host.name, G),
      onNoRecord: () => Q.forget(host.name, G),
    });
    let B = watchSilentCall({
      host,
      signal,
      checkMisses: checkInTiming.misses,
      timing: silentCallTiming,
    });
    return host.transport
      .call(te.wire, P, C, {
        signal,
        deadlineMs: defaultDeadlineMs,
        toolUseId: callId,
        onSent: (Z) => {
          G = Z.epoch;
          V = Q.has(host.name, Z.epoch);
          p.recordAddressee(Z.instanceId, Z.epoch, Z.requestId);
          onAddressed?.();
        },
        ...(B.onAccepted === undefined
          ? re.onAccepted !== undefined && {
              onAccepted: re.onAccepted,
            }
          : {
              onAccepted: () => {
                B.onAccepted?.();
                re.onAccepted?.();
              },
            }),
        onTransit: (Z) => p.recordLegTransit(C.approval === undefined ? 1 : 2, Z),
        ...(hostSupportsProgressChecks(host) && {
          onHeldAtDeadline: (Z) => p.hold(Z),
        }),
      })
      .then((Z) => {
        ee = re.stop();
        B.stop();
        se = B.acceptedAt();
        noteDirSyncAnswer(host, Z);
        Q.note(host.name, G, Z);
        return Z;
      })
      .catch((error) => {
        ee = re.stop();
        B.stop();
        se = undefined;
        return {
          kind: "transport_error",
          detail: `send failed: ${normalizeMcpServerName(errorMessage(error))}`,
        };
      });
  };
  let $n = (C) => {
    host.transport
      .call(te.wire, we, he(C), {
        signal: new AbortController().signal,
        deadlineMs: Math.min(defaultDeadlineMs, MAX_STANDING_ASK_DEADLINE_MS),
        toolUseId: callId,
      })
      .catch(() => {});
  };
  let le = (askId) =>
    $n({
      ask_id: askId,
      decision: "deny",
      feedback: WITHDRAWN,
    });
  let mo = (askId) =>
    host.transport
      .call(
        te.wire,
        we,
        he({
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
  let fo = (askId) =>
    raceWithAbortSignal(mo(askId), signal, () => new AbortError()).catch(() => {
      return;
    });
  let Bn = toolUseContext.toolState.get(KeyedSemaphore);
  let maxInFlight = host.description?.limits.max_in_flight ?? DEFAULT_MAX_IN_FLIGHT_CALLS;
  let semaphore = toolUseContext.toolState.get(KeyedSemaphoreSubclass);
  let limit =
    clampServingLimit("pending_asks_max", host.description?.limits.pending_asks_max) ?? SANDBOX_MAX_DEPTH;
  let U = Je(he());
  let _e =
    pendingAsk === undefined
      ? await Ae(pe(oe), U)
      : {
          kind: "proceed",
        };
  if (_e.kind === "refuse")
    return {
      requestBytes: U,
      outcome: {
        kind: "error",
        code: _e.code,
        message: _e.message,
        host: host_2,
      },
    };
  let ke;
  let Qe = false;
  if (_e.kind === "ask_first") {
    if (approve === undefined)
      return {
        requestBytes: U,
        outcome: {
          kind: "error",
          code: "denied_by_session_rule",
          message: `${_e.message} This session asks before running this call and could not raise its prompt here; ${host.name} was not contacted.`,
          host: host_2,
        },
      };
    if (signal.aborted)
      return {
        outcome: cancelledResult(host_2),
        requestBytes: U,
      };
    Qe = getToolPermissionContext(toolUseContext).mode === "plan";
    ge = oe;
    oe = pe(oe);
    we = pe(we);
    U = Je(he());
    let C = false;
    let P = await waitWhileAsking(p, SESSION_ASK_RULE, askLapseMs, (ended, patience) =>
      approve({
        askId: SESSION_ASK_RULE,
        ended,
        host: host_2,
        tool: tool.name,
        input: oe,
        message: _e.message,
        decisionReason: undefined,
        suggestions: [],
        classifierEligible: false,
        keepsStandingApprovals: false,
        offeredStandingRules: [],
        patience,
        askEnded: () => p.askEnded !== undefined,
        noteCard: (card) => {
          p.card = card;
        },
      }).catch((error) => {
        if (error instanceof AbortError && !signal.aborted) throw error;
        if (!signal.aborted) {
          C = true;
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
    if (P !== undefined && "ended" in P)
      return {
        requestBytes: U,
        ...describeNoAnswer(host, host_2, P.ended, askLapseMs),
      };
    Qe &&= getToolPermissionContext(toolUseContext).mode === "plan";
    if (P === undefined)
      return {
        requestBytes: U,
        approval: C ? "prompt_failed" : "withdrawn",
        outcome: C
          ? {
              kind: "error",
              code: "prompt_failed",
              message: `This session could not raise its permission prompt for ${host.name}; the call did not run.`,
              host: host_2,
            }
          : cancelledResult(host_2),
      };
    if (signal.aborted && P.decision !== "deny")
      return {
        outcome: cancelledResult(host_2),
        requestBytes: U,
      };
    if (P.decision === "unanswerable")
      return {
        requestBytes: U,
        approval: "prompt_failed",
        outcome: {
          kind: "error",
          code: "prompt_failed",
          message: `${P.message} ${host.name} was not contacted.`,
          host: host_2,
        },
      };
    if (P.decision === "deny")
      return {
        requestBytes: U,
        approval: P.insteadOfRejection === undefined ? "denied" : "blocked",
        outcome: {
          kind: "error",
          code: "rejected_in_session",
          message: P.insteadOfRejection?.message ?? remoteRejectMessage(toolUseContext.agentId, P.feedback),
          ...(P.insteadOfRejection !== undefined && {
            denialKind: P.insteadOfRejection.denialKind,
          }),
          host: host_2,
        },
      };
    if (P.decidedBy !== undefined) p.recordApprovedBy(P.decidedBy);
    if (P.updatedInput !== undefined) {
      let G = tool.inputSchema.safeParse(P.updatedInput);
      if (!G.success)
        return {
          requestBytes: U,
          approval: "withdrawn",
          outcome: {
            kind: "error",
            code: "invalid_input",
            message: `The edited ${tool.name} input from this session's prompt does not parse; ${host.name} was not contacted.`,
            host: host_2,
          },
        };
      ge = Hn(G.data, oe, ge);
      oe = G.data;
      we = P.updatedInput;
      editedByApproval = true;
      U = Je(he());
      let V = await Ae(pe(oe), U);
      if (V.kind === "refuse")
        return {
          requestBytes: U,
          approval: "withdrawn",
          outcome: {
            kind: "error",
            code: V.code,
            message: V.message,
            host: host_2,
          },
        };
      ke = V.kind === "ask_first" ? V.rule : _e.rule;
    } else ke = _e.rule;
  }
  let Wn = () =>
    holdForReconnect({
      tool,
      host,
      call: p,
      signal,
      onStatus,
      holdMs: reconnectHoldMs,
    });
  let Kn = await Wn();
  if (Kn !== undefined)
    return {
      requestBytes: U,
      ...Kn,
    };
  let _o = p.beginAskSeatWait();
  let Un = false;
  using Oe = areAskSeatsOn()
    ? await acquireSeat(semaphore, host.name, limit, signal, {
        waitLimitMs: pendingAsk === undefined ? askSeatWaitMs : 0,
        onWait: () => {
          if (pendingAsk !== undefined) return;
          Un = true;
          onStatus?.(ASK_FIRST_REASON_TEXTS["ask_seat.waiting"](host.name), askSeatWaitMs);
        },
      })
    : RELEASED_SLOT;
  _o();
  if (Oe === undefined)
    return {
      outcome: cancelledResult(host_2),
      requestBytes: U,
    };
  if (!Oe.seated && pendingAsk === undefined) p.noteSentWithoutAskSeat();
  if (Un) onStatus?.(ASK_FIRST_REASON_TEXTS["ask_seat.sending"](host.name));
  let transported = pendingAsk ?? (await ko());
  async function ko() {
    let C = p.beginQueuedWait();
    return runWithSlot(Bn, host.name, maxInFlight, signal, async () => {
      C();
      if (isTerminalShutdown() && !signal.aborted) await heldUntilExit();
      let P = await Wn();
      if (P !== undefined)
        return {
          requestBytes: U,
          ...P,
        };
      let readOnly = false;
      try {
        readOnly = tool.isReadOnly(oe);
      } catch {}
      let V = false;
      try {
        V = tool.isConcurrencySafe(ro);
      } catch {}
      let Q = await clearForwardToDevice({
        host,
        readOnly,
        runsBesideOthers: toolUseContext.agentId !== undefined || entry === "repl" || V,
        signal,
        onStatus,
      });
      if (Q.kind === "hold")
        return {
          outcome: {
            kind: "error",
            code: "sync_failed",
            message: Q.message,
            host: host_2,
          },
          requestBytes: U,
        };
      if (Q.kind === "away")
        return {
          requestBytes: U,
          ...convertRemoteToolResult(tool, host, Q.outcome),
        };
      if (Q.kind === "go_with_note") noteSync(Q.note);
      let re = await Ae(pe(oe), U);
      if (re.kind === "refuse")
        return {
          outcome: {
            kind: "error",
            code: re.code,
            message: re.message,
            host: host_2,
          },
          requestBytes: U,
        };
      if (re.kind === "ask_first" && !isSameHostName(re.rule, ke))
        return ke === undefined
          ? {
              outcome: {
                kind: "error",
                code: "denied_by_session_rule",
                message: `${re.message} ${host.name} was not contacted.`,
                host: host_2,
              },
              requestBytes: U,
            }
          : {
              approval: "withdrawn",
              outcome: {
                kind: "error",
                code: "approval_no_longer_covers",
                message: ASK_FIRST_REASON_TEXTS.approval_no_longer_covers(host.name),
                host: host_2,
              },
              requestBytes: U,
            };
      if (signal.aborted)
        return {
          outcome: cancelledResult(host_2),
          requestBytes: U,
        };
      if (isTerminalShutdown()) await heldUntilExit();
      onFirstSend?.();
      if (ke === undefined)
        speculation?.begin({
          host: host_2,
          input: pe(oe),
        });
      let B = he();
      if (B.read_baseline !== undefined) noteReadBaselineSent();
      return Dn(B);
    }).then((P) => {
      if (P === undefined) C();
      return P;
    });
  }
  if (transported === undefined)
    return {
      outcome: cancelledResult(host_2),
      requestBytes: U,
    };
  if ("outcome" in transported) return transported;
  if (!(transported.kind === "result" && transported.envelope?.outcome === "needs_approval")) Oe.release();
  let fe = await ue(transported);
  if (fe.kind === "ended")
    return {
      requestBytes: U,
      reconcile: fe.trace,
      outcome: fe.outcome,
    };
  let transported_2 = fe.transported;
  let envelope =
    transported_2.kind === "result" && transported_2.envelope?.outcome === "needs_approval"
      ? transported_2.envelope
      : undefined;
  if (envelope === undefined) {
    speculation?.abandon();
    return {
      requestBytes: U,
      reconcile: fe.trace,
      ...convertRemoteToolResult(tool, host, transported_2, {
        afterReconnect: fe.kind === "answered",
        call: {
          input: oe,
          editedByApproval,
        },
      }),
    };
  }
  Oe.retake();
  toolUseContext.markToolCallRunning?.(callId, false);
  p.questionRaised();
  let Ze = await (async () => {
    if (approve === undefined) {
      le(envelope.ask_id);
      return {
        requestBytes: U,
        approval: "no_handler",
        ...convertRemoteToolResult(tool, host, transported_2),
      };
    }
    let C =
      byteLengthOf(envelope.input) <= maxRequestBytes(host)
        ? tool.inputSchema.safeParse(envelope.input)
        : {
            success: false,
          };
    if (envelope.tool !== te.ask || !C.success) {
      le(envelope.ask_id);
      return {
        requestBytes: U,
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
    let P = await Ae(C.data, U).catch((error) => {
      le(envelope.ask_id);
      throw error;
    });
    if (P.kind === "refuse") {
      le(envelope.ask_id);
      return {
        requestBytes: U,
        approval: "withdrawn",
        outcome: describeWithdrawnAsk(P, host.name, host_2),
      };
    }
    let G = false;
    let V =
      ke !== undefined &&
      (P.kind !== "ask_first" || isSameHostName(P.rule, ke)) &&
      envelope.prior_answer_ok === true &&
      sameInputsModuloDefaults(C.data, pe(oe), undefined);
    let Q =
      envelope.classifier_eligible === true &&
      P.kind !== "ask_first" &&
      (Re === "auto" || (Re === "plan" && isAutoModeCapableHost(host))) &&
      Re === wirePermissionState(toolUseContext, tool.name).permissionMode;
    if (envelope.classifier_eligible === true && Re === "plan" && !Q)
      logForDebugging(
        `[remoteCall] plan-mode ask ${envelope.ask_id} goes to a person: host accepts plan answers=${hasCapability(host)}, account-set mode=${getAccountSetPermissionMode() ?? "unknown"}, reached over ${host.transport.kind}`,
      );
    if (V) p.answeredWithoutPrompt();
    let re = getToolPermissionContext(toolUseContext).mode === "plan";
    let B = V
      ? p.askEnded === undefined
        ? {
            decision: "allow",
          }
        : {
            ended: p.askEnded,
          }
      : await waitWhileAsking(p, envelope.ask_id, askLapseMs, (ended, patience) =>
          approve({
            askId: envelope.ask_id,
            ended,
            patience,
            askEnded: () => p.askEnded !== undefined,
            noteCard: (card) => {
              p.card = card;
            },
            host: host_2,
            tool: tool.name,
            input: envelope.input,
            message: sanitizeForPrompt(envelope.message, MAX_MACHINE_MESSAGE_CHARS),
            decisionReason:
              envelope.decision_reason === undefined
                ? undefined
                : sanitizeForPrompt(envelope.decision_reason, MAX_MACHINE_MESSAGE_CHARS),
            suggestions: (envelope.suggestions ?? []).map((j) => sanitizeForPrompt(j, MAX_PROMPT_TEXT_CHARS)),
            classifierEligible: Q,
            keepsStandingApprovals: hasSessionCapability(host),
            offeredStandingRules: hasSessionCapabilityPair(host) ? (envelope.suggestions ?? []) : [],
            ...(pendingAsk !== undefined && {
              pendingBeforeRestart: true,
            }),
            ...(Q &&
              envelope.auto_mode !== undefined && {
                hostRules: xr(envelope.auto_mode, (j) =>
                  j?.map((Se) => promptSafeTruncated(Se)).filter((Se) => Se !== ""),
                ),
              }),
          }).catch((error) => {
            if (error instanceof AbortError && !signal.aborted) {
              if (p.askEnded !== undefined) {
                toolUseContext.abortController.abort(error);
                return;
              }
              le(envelope.ask_id);
              throw error;
            }
            G = !signal.aborted;
            if (G)
              logForDebugging(
                `remote tool call: the session's permission prompt failed: ${errorMessage(error)}`,
                {
                  level: "error",
                },
              );
            return;
          }),
        );
    if (B !== undefined && "ended" in B) {
      le(envelope.ask_id);
      return {
        requestBytes: U,
        ...describeNoAnswer(host, host_2, B.ended, askLapseMs),
      };
    }
    if (B === undefined || (signal.aborted && B.decision !== "deny")) {
      le(envelope.ask_id);
      if (G && !signal.aborted)
        return {
          requestBytes: U,
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
        requestBytes: U,
        approval: "withdrawn",
      };
    }
    if (B.decision === "unanswerable") {
      le(envelope.ask_id);
      return {
        requestBytes: U,
        approval: "prompt_failed",
        outcome: {
          kind: "error",
          code: "prompt_failed",
          message: `${B.message} The call did not run on ${host.name}.`,
          host: host_2,
        },
      };
    }
    let Z = B.feedback === undefined ? undefined : truncateToLength(B.feedback, MAX_MESSAGE_CHARS);
    let nn = {
      ask_id: envelope.ask_id,
      decision: B.decision,
      ...(B.decision === "allow" &&
        B.updatedInput !== undefined && {
          updated_input: B.updatedInput,
        }),
      ...(Z !== undefined && {
        feedback: Z,
      }),
      ...(B.decision === "allow" &&
        B.permissionUpdates !== undefined &&
        B.permissionUpdates.length > 0 && {
          permission_updates: B.permissionUpdates.slice(0, MAX_REMEMBERED_ASKS),
        }),
    };
    if (B.decision === "allow" && !V && B.decidedBy !== undefined) p.recordApprovedBy(B.decidedBy);
    let Ie = B.decision === "allow" && B.decidedBy === "classifier";
    let yo =
      (B.decision === "allow" && B.raisedInPlanMode !== undefined ? B.raisedInPlanMode : re) &&
      getToolPermissionContext(toolUseContext).mode === "plan" &&
      (!Ie || Re === "plan");
    if (B.decision === "deny") {
      $n(nn);
      return {
        requestBytes: U,
        approval: B.insteadOfRejection === undefined ? "denied" : "blocked",
        outcome: {
          kind: "error",
          code: "rejected_in_session",
          message: B.insteadOfRejection?.message ?? remoteRejectMessage(toolUseContext.agentId, Z),
          ...(B.insteadOfRejection !== undefined && {
            denialKind: B.insteadOfRejection.denialKind,
          }),
          host: host_2,
        },
      };
    }
    let ve = B.updatedInput === undefined ? undefined : tool.inputSchema.safeParse(B.updatedInput);
    if (ve?.success) ge = Hn(ve.data, C.data, ge);
    let Be =
      ve === undefined
        ? undefined
        : ve.success
          ? await Ae(pe(ve.data), U).catch((error) => {
              le(envelope.ask_id);
              throw error;
            })
          : {
              kind: "refuse",
              code: "invalid_input",
              message: `The edited ${tool.name} input from this session's prompt does not parse; it was not sent.`,
            };
    if (Be?.kind === "refuse") {
      le(envelope.ask_id);
      return {
        requestBytes: U,
        approval: "withdrawn",
        outcome: describeWithdrawnAsk(Be, host.name, host_2),
      };
    }
    let Ro = he(nn);
    let input = envelope.input;
    let ce = byteLengthOf({
      name: te.wire,
      arguments: {
        ...input,
        [REMOTE_TOOL_CALL_META]: Ro,
      },
    });
    let Gn = maxRequestBytes(host);
    if (ce > Gn) {
      le(envelope.ask_id);
      return {
        requestBytes: ce,
        approval: "withdrawn",
        outcome: {
          kind: "error",
          code: "request_too_large",
          message: inputTooLargeMessage({
            name: host.name,
            requestBytes: ce,
            capBytes: Gn,
          }),
          host: host_2,
        },
      };
    }
    let qn = B.updatedInput ?? C.data;
    let call = ve?.success
      ? {
          input: ve.data,
          editedByApproval: true,
        }
      : sameInputsModuloDefaults(C.data, pe(oe), undefined)
        ? {
            input: oe,
            editedByApproval,
          }
        : undefined;
    let vo = () => {
      let q = p.beginQueuedWait();
      return runWithSlot(Bn, host.name, maxInFlight, signal, async () => {
        q();
        if (isTerminalShutdown() && !signal.aborted) await heldUntilExit();
        let z = await Ae(pe(qn), ce);
        if (z.kind === "refuse")
          return {
            kind: "late_refusal",
            verdict: z,
          };
        if (
          z.kind === "ask_first" &&
          !isSameHostName(z.rule, ke) &&
          !(P.kind === "ask_first" && isSameHostName(z.rule, P.rule)) &&
          !(Be?.kind === "ask_first" && isSameHostName(z.rule, Be.rule))
        )
          return {
            kind: "late_refusal",
            verdict: {
              code: "denied_by_session_rule",
              message: `A permission rule of this session now asks before this ${tool.name} call; it appeared after the approval. ${host.name} was not contacted.`,
            },
          };
        let j = !Ie || isAutoClassifierActive(getToolPermissionContext(toolUseContext).mode);
        if (!(V ? Qe : yo && j) && getToolPermissionContext(toolUseContext).mode === "plan") {
          let Xn = false;
          try {
            Xn = tool.isReadOnly(qn, toolUseContext);
          } catch {}
          if (!Xn)
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
        let Ao = Dn(he(nn), input);
        Oe.release();
        return Ao;
      }).then(
        (z) => {
          if (z === undefined) q();
          return z;
        },
        (error) => {
          le(envelope.ask_id);
          throw error;
        },
      );
    };
    let approval = V ? "pre_approved" : "allowed";
    let To = (q, trigger) => {
      let envelope_2 = q?.kind === "result" ? q.envelope : undefined;
      if (envelope_2?.outcome === "acknowledged" && envelope_2.ask_id === envelope.ask_id)
        return {
          approval: "withdrawn",
          outcome: {
            kind: "error",
            code: "approval_not_received",
            message: approvalDroppedMessage(host.name, trigger, true),
            host: host_2,
          },
        };
      if (
        q?.kind === "result" &&
        envelope_2 !== undefined &&
        (envelope_2.outcome === "in_progress" ||
          (envelope_2.outcome !== "needs_approval" &&
            envelope_2.outcome !== "acknowledged" &&
            envelope_2.replayed === true) ||
          (envelope_2.outcome === "completed" && envelope_2.disposition === "duplicate_call"))
      )
        return {
          approval,
          ...convertRemoteToolResult(tool, host, q, {
            afterReconnect: true,
            call,
          }),
        };
      return {
        approval: "withdrawn",
        outcome: {
          kind: "error",
          code: "approval_not_received",
          message: approvalDroppedMessage(host.name, trigger, false),
          host: host_2,
          open: "delivery_unknown",
        },
      };
    };
    return (async (transported) => {
      if (transported?.kind === "late_refusal") {
        le(envelope.ask_id);
        return {
          requestBytes: ce,
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
        le(envelope.ask_id);
        if (transported?.kind === "stalled")
          return {
            requestBytes: ce,
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
        if (transported?.kind === "approval_unverified" && Ie)
          return {
            requestBytes: ce,
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
              requestBytes: ce,
              approval: "withdrawn",
              ...convertRemoteToolResult(tool, host, transported, {
                call,
              }),
            }
          : {
              outcome: interruptedResult(host_2, {
                withdrawnAtAsk: true,
              }),
              requestBytes: U,
              approval: "withdrawn",
            };
      }
      let z = await ue(transported, {
        byClassifier: Ie,
        releaseAsk: () => le(envelope.ask_id),
      });
      if (z.kind === "ended") {
        if (z.outcome.kind === "error" && z.outcome.code === "interrupted") le(envelope.ask_id);
        return {
          requestBytes: ce,
          approval,
          reconcile: z.trace,
          outcome: z.outcome,
        };
      }
      let transported_2 = z.transported;
      if (transported_2.kind !== "result" || transported_2.envelope?.outcome === "refused")
        le(envelope.ask_id);
      if (transported_2.kind === "stalled" && transported_2.takenBack)
        return {
          requestBytes: ce,
          approval: "withdrawn",
          reconcile: z.trace,
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
        !Ie &&
        !V
      )
        p.endAsk(
          normalizeWithdrawReason(
            transported_2.envelope.reason ?? (transported_2.envelope.code === "stale" ? "stale_answer" : ""),
          ),
        );
      if (transported_2.kind === "result" && transported_2.envelope?.outcome === "needs_approval") {
        if (z.kind === "answered" && transported_2.envelope.ask_id === envelope.ask_id) {
          let Se = await fo(envelope.ask_id);
          return {
            requestBytes: ce,
            reconcile: z.trace,
            ...To(Se, z.trace.trigger),
          };
        }
        le(transported_2.envelope.ask_id);
        return {
          requestBytes: ce,
          approval: "asked_again",
          reconcile: z.trace,
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
          requestBytes: ce,
          approval,
          reconcile: z.trace,
          outcome: {
            kind: "error",
            code: "dropped",
            message: approvalUploadUnconfirmedMessage(host.name),
            host: host_2,
            open: "delivery_unknown",
          },
        };
      return {
        requestBytes: ce,
        approval,
        reconcile: z.trace,
        ...convertRemoteToolResult(tool, host, transported_2, {
          afterReconnect: z.kind === "answered",
          call,
        }),
      };
    })(await vo());
  })();
  return fe.trace !== undefined && Ze.reconcile !== fe.trace
    ? {
        ...Ze,
        reconcileLeg1: fe.trace,
      }
    : Ze;
}
//@ chunk-dtv8x2hx.js:57316-61083 placement
async function collectRemoteResult({
  transported,
  host,
  call: o,
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
  let R = approval === undefined ? 1 : 2;
  let envelope =
    R === 1 && transported.kind === "result" && transported.envelope?.outcome === "in_progress"
      ? transported.envelope
      : undefined;
  let O = transported.kind === "dropped" || transported.kind === "timed_out" ? transported : undefined;
  if (O === undefined && envelope === undefined)
    return {
      kind: "as_is",
      transported,
      trace: undefined,
    };
  let x =
    envelope !== undefined
      ? (envelope.host_epoch ?? dispatchEpoch)
      : R === 1
        ? (O?.sentUnderEpoch ?? dispatchEpoch)
        : dispatchEpoch;
  let held = transported.kind === "timed_out" ? o.held : undefined;
  let E = (why) => {
    if (held === undefined) return;
    logRemoteTools(callId, "standing request withdrawn", {
      leg: R,
      why,
    });
    held.withdraw();
    o.hold(undefined);
  };
  if (x === undefined) {
    E("no_epoch");
    return {
      kind: "as_is",
      transported,
      trace: undefined,
    };
  }
  let D = machineIdentity(host);
  let X = O === undefined ? "in_progress" : describeClassifierRefusal(O, approval);
  let L = formatRemoteOutputFence({
    name: host.name,
    showForMs: 2 * timing.intervalMs,
    onStatus,
    waiting: (Y) =>
      held === undefined && envelope === undefined && !Y
        ? reconnectingStatus(host.name)
        : ASK_FIRST_REASON_TEXTS["in_progress.checkin"](host.name),
    standing: held === undefined ? undefined : standingLine,
  });
  let y = await awaitRemoteCallWithProgress({
    host,
    held,
    dispatchEpoch: x,
    toolName,
    callId,
    signal,
    timing,
    ranBefore: envelope?.state === "running",
    onAttempt: L.onAttempt,
    onOutput: L.onOutput,
    silentSince,
    silentCallTiming,
  });
  let { verdict } = y;
  let trace = {
    trigger: X,
    leg: R,
    result: verdict.kind === "unknown" ? `unknown_${verdict.why}` : verdict.kind,
    attempts: y.attempts,
    misses: y.misses,
    held: held !== undefined,
    epochChanged: y.epochChanged,
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
      E(verdict.kind);
      return {
        kind: "answered",
        transported: {
          ...verdict.transported,
          metaCopy: undefined,
        },
        trace,
      };
    case "host_restarted":
      E(verdict.kind);
      return {
        kind: "ended",
        trace,
        outcome: {
          kind: "error",
          code: "host_restarted",
          message: hostRestartedLostMessage(host.name, X),
          host: D,
        },
      };
    case "not_received":
      E(verdict.kind);
      return R === 2 || envelope !== undefined
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
              message: neverReceivedMessage(host.name, X),
              host: D,
            },
          };
    case "ask_lost":
      E(verdict.kind);
      return {
        kind: "ended",
        trace,
        outcome: {
          kind: "error",
          code: "still_running",
          message: stillRunningMessage({
            name: host.name,
            state: "awaiting_approval",
            cause: X,
          }),
          host: D,
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
            }) + L.outputNote(),
          host: D,
          open: "host_unresponsive",
        },
      };
    case "host_unresponsive":
      if (!verdict.stillConnected) host.transport.markUnresponsive?.();
      if (verdict.intervalMs !== undefined)
        held?.late.then((Y) => {
          if (Y.kind === "result") logFeatureSad("rtc_silent_call", "answered_late");
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
            }) + L.outputNote(),
          host: D,
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
              withdrawn: O?.kind === "timed_out" && held === undefined,
              returnNoted: hostAnnouncesReturn(host),
            }) + L.outputNote(),
          host: D,
          open: "host_asleep",
        },
      };
    case "cancelled":
      E(verdict.kind);
      return {
        kind: "ended",
        trace,
        outcome: interruptedResult(D, {
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
          leg: R,
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
        E("unreachable_unaccepted");
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
            }) + L.outputNote(),
          host: D,
          open: "timed_out",
        },
      };
  }
}
//@ chunk-dtv8x2hx.js:61083-61320 placement
function waitWhileAsking(e, askId, afterMs, r) {
  let abortController = new AbortController();
  let u;
  let promise = new Promise((resolve) => {
    u = (ended) =>
      resolve({
        ended,
      });
  });
  return e.whileAsking(
    {
      askId,
      end: (i) => {
        abortController.abort(i);
        u(i);
      },
    },
    (i) => (abortController.signal.aborted ? promise : Promise.race([promise, r(abortController.signal, i)])),
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
function describeClassifierRefusal(e, approval) {
  if (isUnverifiedRefusal(e)) return approval?.byClassifier ? "classifier_refused" : "unverified_refusal";
  if (e.kind === "dropped" && e.why === "write_unresolved")
    return approval !== undefined ? "approval_write_unresolved" : "write_unresolved";
  return e.kind;
}
//@ chunk-dtv8x2hx.js:61883-62138 placement
function describeWithdrawnAsk(e, name, host) {
  let r = ` ${name} was not contacted.`;
  let s = e.message.endsWith(r) ? e.message.slice(0, -r.length) : e.message;
  return {
    kind: "error",
    code: e.code,
    message: `${s} ${name} had already been asked; its suspended call was withdrawn and nothing ran there.`,
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
  let r = toolName === undefined ? undefined : host.passthroughTools?.get(toolName);
  return toolName === undefined || r === undefined
    ? undefined
    : {
        wire: toolName,
        ask: r.localName,
      };
}
export { collectAskRules, logRemoteToolForward, waitForAskAnswer, logRemoteForward, primaryInputPath };
