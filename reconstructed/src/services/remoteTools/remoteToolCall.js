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
  Hen,
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
import { ye } from "../../utils/startupMarks.js";
import { gn } from "../../utils/shortHash.js";
import {
  DYt,
  NXr,
  buildRemoteToolCallMeta,
  WITHDRAWN,
  REMOTE_TOOL_CALL_META,
  NPe,
  wirePermissionMode,
} from "../../remote/tools/protocolSchemas.js";
import { isSemverString, splitOnDash } from "../../utils/model/modelCatalog/catalogCapabilities.js";
import { compareVersions } from "./_new/compareVersions.js";
import { sanitizeToolNameForAnalytics } from "../analytics/metadata.js";
import { withConfusables } from "../../utils/sanitization.js";
import { pVt } from "../mcp/redactMcpErrors.js";
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
  nt,
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
  eKe,
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
import { B7 } from "./shellForwarding.js";
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
import { R0e } from "../../tools/BashTool/dangerousRemoval.js";
import { Yg } from "../../remote/remoteMode.js";
import { isCompactBoundaryMessage } from "../projects/threadRows.js";
import { getMainLoopModel, getToolPermissionContext } from "../../utils/permissions/toolPermissionContext.js";
import { getSessionId } from "../../bootstrap/state.js";
import { Wer } from "../../tasks/LocalShellTask/backgroundNotices.js";
import { iv } from "../../remote/tools/callResults.js";
import { normalizeMcpServerName } from "../api/deferredToolsState.js";
import { KeyedSemaphore, acquireSeat } from "../../utils/keyedSemaphore.js";
import { _1o, O6s, runWithSlot } from "../../tools/WebFetchTool/fetchQueue.js";
import { wgt } from "../../utils/sandbox/sandboxDefaultPolicy.js";
import { areAskSeatsOn } from "./servingGates.js";
import {
  getAccountSetPermissionMode,
  isAutoClassifierActive,
} from "../../utils/permissions/autoModeState.js";
import { xr } from "../../../vendor/lodash-es/_inlinedHelpers.js";
import { logRemoteTools } from "./remoteToolsDebug.js";
import { iwt } from "../../utils/permissions/permissions.js";

//@ chunk-dtv8x2hx.js:24606-24866 placement
function collectAskRules(e) {
  let decisionReason = e.decisionReason;
  return [
    ...(e.matchedAskRule !== void 0 ? [e.matchedAskRule] : []),
    ...(decisionReason?.type === "rule" && decisionReason.rule.ruleBehavior === "ask"
      ? [decisionReason.rule]
      : []),
    ...(decisionReason?.type === "subcommandResults"
      ? [...decisionReason.reasons.values()].flatMap((o) => (o.behavior === "ask" ? collectAskRules(o) : []))
      : []),
  ];
}
//@ chunk-dtv8x2hx.js:24866-24939 placement
function mt() {
  try {
    return getFeatureValue_CACHED_MAY_BE_STALE("tengu_violin_waist", !1) === !0;
  } catch {
    return !1;
  }
}
//@ chunk-dtv8x2hx.js:24939-24952 placement
var pt = 90000;
/**
 * 宿主断线时按 reconnect_hold 等待其回来，超时放弃。
 */
//@ chunk-dtv8x2hx.js:24952-25982 placement
async function holdForReconnect({
  tool: tool,
  host: host,
  call: o,
  signal: signal,
  onStatus: onStatus,
  holdMs: holdMs,
}) {
  if (!mt()) return;
  let { name: p } = host,
    i = { ended: "inconclusive" };
  try {
    let h = await host.transport
      .checkLive?.({
        signal: signal,
        ...(o.reconnectHoldMs === void 0 && {
          hold: {
            ms: holdMs,
            notify: (k) => {
              if (k === "back") {
                i.ended = "back";
                return;
              }
              ((i.stopTiming = o.beginReconnectHold()),
                onStatus?.(
                  ASK_FIRST_REASON_TEXTS["reconnect_hold.waiting"]({ name: p, holdMs: holdMs }),
                  holdMs,
                ));
            },
          },
        }),
      })
      ?.catch((k) => {
        if (!isAbortError(k)) logError(k);
        i.ended = "failed";
        return;
      });
    if (signal.aborted) i.ended = "interrupted";
    else if (h !== void 0) i.ended = "still_away";
    if (i.stopTiming !== void 0)
      if (
        (i.stopTiming(),
        onStatus?.(
          i.ended === "back"
            ? ASK_FIRST_REASON_TEXTS["ask_seat.sending"](p)
            : ASK_FIRST_REASON_TEXTS["reconnect_hold.ended"](p),
        ),
        i.ended === "back")
      )
        logFeatureOk("remote_tool_reconnect_hold");
      else if (i.ended === "still_away") logFeatureBad("remote_tool_reconnect_hold", i.ended);
      else logFeatureSad("remote_tool_reconnect_hold", i.ended);
    if (h === void 0 || signal.aborted) return;
    let w = convertRemoteToolResult(tool, host, h);
    return i.stopTiming === void 0 || w.outcome.kind !== "error"
      ? w
      : {
          ...w,
          outcome: {
            ...w.outcome,
            message: `${w.outcome.message} ${ASK_FIRST_REASON_TEXTS["reconnect_hold.gave_up"]({ name: p, holdMs: holdMs })}`,
          },
        };
  } catch (error) {
    if (!isAbortError(error)) logError(error);
    return;
  }
}
//@ chunk-dtv8x2hx.js:25982-26023 placement
var Bo = { [-1]: "older", 0: "same", 1: "newer" };
/**
 * 记录远程调用结果遥测（completed/completed_no_envelope/错误、决定者来源、耗时）。
 */
//@ chunk-dtv8x2hx.js:26023-29905 placement
function logRemoteToolCallOutcome(e, n, o, r, s, u, p) {
  let { outcome: outcome } = r,
    elapsedMs = s.elapsedMs,
    w = analyzeTurnTail(u.messages),
    decider = w.decider,
    S = decider?.origin,
    A = decider == null ? void 0 : u.messages[decider.index],
    R =
      outcome.kind === "completed"
        ? outcome.envelope !== "present"
          ? "completed_no_envelope"
          : outcome.disposition !== void 0 &&
              outcome.disposition !== "ran" &&
              outcome.disposition !== "approved_by_session"
            ? "not_run_on_host"
            : outcome.isError
              ? "completed_error"
              : "completed"
        : outcome.code === "transport_error" && outcome.unreadableResult === !0
          ? "unreadable_result"
          : outcome.code;
  (logEvent("tengu_remote_tool_forward", {
    tool: hn(e),
    transport: fromEnum(n.transport.kind),
    entry: fromEnum(o),
    outcome: fromEnum(R),
    refusal_code: fromEnumOpt(r.refusalCode),
    failure_code: fromEnumOpt(r.failureCode),
    disposition: fromEnumOpt(outcome.kind === "completed" ? outcome.disposition : void 0),
    envelope: outcome.kind === "completed" ? fromEnum(outcome.envelope) : void 0,
    output_parsed: outcome.kind === "completed" ? outcome.output !== void 0 : void 0,
    patch_refused: outcome.kind === "completed" ? outcome.output === void 0 && outcome.patchRefused : void 0,
    truncated: outcome.kind === "completed" ? outcome.truncated : void 0,
    cut_here: outcome.kind === "completed" ? outcome.cutHere === !0 : void 0,
    spilled: outcome.kind === "completed" ? outcome.spilled !== void 0 : void 0,
    host_kind: fromEnumOpt(n.description?.kind),
    host_platform: fromEnumOpt(detectTerminal(n.description?.platform)),
    shell_second_look: SHELL_TOOL_NAMES.includes(e.name)
      ? fromEnum(remoteDirKind(n.description).kind)
      : void 0,
    protocol_version: n.protocol.kind === "compatible" ? n.protocol.version : void 0,
    approval: fromEnumOpt(r.approval),
    claimed_mode: fromEnumOpt(s.claimedMode),
    turn_opened_by: fromEnum(
      decider?.strictHuman === !0 && A !== void 0 && isHumanTurn(A)
        ? "own_words"
        : w.scheduledTrigger
          ? "routine"
          : decider === null
            ? "unknown"
            : S?.kind === "task-notification" && S.producer === "session-task"
              ? "helper_report"
              : getOriginKindLabel(S),
    ),
    from_agent: u.agentId !== void 0,
    standing_row: fromEnumOpt(s.card?.standingRow),
    standing_row_chosen: s.card?.chosen,
    repeat_in_session: u.toolState.get(RemoteAskSeat).askedAboutBefore(s),
    wait_announced: n.description?.limits.max_ask_ms !== void 0,
    host_version_vs_worker: fromEnum(
      xo(
        n.description?.claude_code_version,
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
        } > "u"
          ? void 0
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
    caller_gate: fromEnumOpt(p),
    approved_by: fromEnumOpt(s.approvedBy),
    refusal_reason: fromEnumOpt(r.askEndReason),
    delivery: fromEnumOpt(outcome.kind === "completed" ? outcome.delivery : void 0),
    adoption: fromEnumOpt(r.adoption),
    inherited_withdrawn: s.inheritedRequestId === void 0 ? void 0 : s.inheritedWithdrawn,
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
    read_baseline_sent: r.readBaselineSent === !0,
    call_id: ye(s.callId),
    tool_use_id: ye(s.callId),
    host_epoch: ye(s.sentUnderEpoch),
    handle_hash: n.description === void 0 ? void 0 : gn(n.description.name),
    host_device_id: ye(n.description?.device_id),
    criteria_version: lit(DYt),
  }),
    classifyCompletion(R));
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
function logRemoteToolForward(e, n, o, r, s) {
  (logEvent("tengu_remote_tool_forward", {
    tool: hn(e),
    transport: fromEnum(n.transport.kind),
    entry: fromEnum(o),
    outcome: fromEnum("rejected_in_session"),
    caller_gate: fromEnum(s),
    host_kind: fromEnumOpt(n.description?.kind),
    host_platform: fromEnumOpt(detectTerminal(n.description?.platform)),
    call_id: ye(r),
    tool_use_id: ye(r),
    handle_hash: n.description === void 0 ? void 0 : gn(n.description.name),
    criteria_version: lit(DYt),
  }),
    classifyCompletion("rejected_in_session"));
}
//@ chunk-dtv8x2hx.js:30663-30814 placement
function logRemoteForward(e, n, o, r) {
  (logEvent("tengu_remote_tool_forward", {
    tool: hn(e),
    entry: fromEnum(n),
    outcome: fromEnum(o),
    call_id: ye(r),
    tool_use_id: ye(r),
    criteria_version: lit(DYt),
  }),
    classifyCompletion(o));
}
//@ chunk-dtv8x2hx.js:30814-30884 placement
function xo(e, n) {
  return isSemverString(e) && isSemverString(n)
    ? Bo[compareVersions(splitOnDash(e), splitOnDash(n))]
    : "unknown";
}
//@ chunk-dtv8x2hx.js:30884-31066 placement
function buildTimingFields(e, n) {
  return n === void 0
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
function hn(e) {
  return e.isMcp === !0 ? sanitizeToolNameForAnalytics("mcp__tool") : sanitizeToolNameForAnalytics(e.name);
}
//@ chunk-dtv8x2hx.js:31128-31202 placement
function kt() {
  try {
    return getFeatureValue_CACHED_MAY_BE_STALE("tengu_violin_corner", !1) === !0;
  } catch {
    return !1;
  }
}
//@ chunk-dtv8x2hx.js:31202-31342 placement
var MAX_REMEMBERED_ASKS = 32,
  Tt = 5000,
  Wo = 4,
  Ko = 30000,
  SESSION_ASK_RULE = "session:ask-rule",
  Vo = 256,
  kn = 1e4,
  regExp = new RegExp(`[${withConfusables("<")}]`, "gu"),
  regExp_2 = new RegExp(`[${withConfusables(">")}]`, "gu");
//@ chunk-dtv8x2hx.js:31342-31438 placement
function At(e) {
  return pVt(
    replaceControlChars(e.normalize("NFKC")).replace(regExp, "&lt;").replace(regExp_2, "&gt;").trim(),
  );
}
//@ chunk-dtv8x2hx.js:31438-31501 placement
function Xo(e) {
  return At(truncateToLength(pVt(replaceControlChars(e.normalize("NFKC"))), NXr));
}
/**
 * 等待远端 ask 的回答（max_ask_ms 超时后提示）。
 */
//@ chunk-dtv8x2hx.js:31501-32654 placement
async function waitForAskAnswer({
  tool: tool,
  route: route,
  rawInput: rawInput,
  toolUseContext: toolUseContext,
  toolUseId: toolUseId,
  signal: signal,
  entry: entry,
  approve: approve,
  speculation: speculation,
  onStatus: onStatus,
  onNotice: onNotice,
  checkInTiming: checkInTiming,
  earlyCheckTiming: earlyCheckTiming,
  silentCallTiming: silentCallTiming,
  askLapseMs: askLapseMs,
  askSeatWaitMs: askSeatWaitMs,
  reconnectHoldMs: reconnectHoldMs,
  callerGate: callerGate,
}) {
  let E = toolUseContext.toolState.get(RemoteAskSeat),
    D = askLapseMs ?? clampedHostLimit(route.host, "max_ask_ms"),
    begin = E.begin({
      callId: toolUseId,
      toolName: tool.name,
      hostName: route.host.name,
      dispatchEpoch: route.host.description?.epoch,
      onAskEnded: (y) =>
        onNotice?.(
          ASK_FIRST_REASON_TEXTS["ask_ended.notice"]({
            name: route.host.name,
            toolName: tool.name,
            reason: y,
            afterMs: D,
          }),
        ),
    }),
    L = UNEXPECTED_FORWARD_ERROR;
  try {
    if (
      ((L = await resolveEarlyCheck({
        tool: tool,
        entry: entry,
        host: route.host,
        input: route.input,
        rawInput: rawInput,
        toolUseContext: toolUseContext,
        call: begin,
        signal: signal,
        approve: approve,
        speculation: speculation,
        onStatus: onStatus,
        checkInTiming: checkInTiming ?? progressCheckTiming(route.host),
        earlyCheckTiming: earlyCheckTiming ?? nt,
        silentCallTiming: silentCallTiming ?? SILENT_CALL_TIMING,
        askLapseMs: D,
        askSeatWaitMs: askSeatWaitMs ?? Ko,
        reconnectHoldMs: reconnectHoldMs ?? pt,
        callerGate: callerGate,
      })),
      L.outcome.kind === "error" &&
        (L.outcome.code === "unreachable" || L.outcome.code === "host_unresponsive"))
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
    (speculation?.abandon(),
      E.settle(begin, L.outcome),
      logRemoteToolCallOutcome(tool, route.host, entry, L, begin, toolUseContext, callerGate),
      describeAskSeat(L, begin, {
        tool: tool,
        route: route,
        rawInput: rawInput,
        toolUseContext: toolUseContext,
      }));
  }
}
//@ chunk-dtv8x2hx.js:32654-33567 placement
function describeAskSeat(
  e,
  n,
  { tool: tool, route: route, rawInput: rawInput, toolUseContext: toolUseContext },
) {
  if (route.host.transport.kind !== "session") return;
  try {
    let p = toolUseContext.toolState.get(RemoteCallLedger),
      i = e.outcome.kind === "error" ? e.outcome.open : void 0;
    if (i === void 0) {
      p.forget(n.callId);
      return;
    }
    let held = n.held,
      w = e.journalHost !== void 0 && e.journalHost !== route.host.name;
    (p.gaveUp({
      callId: n.callId,
      agentId: toolUseContext.agentId,
      hostName: e.journalHost ?? route.host.name,
      toolName: tool.name,
      wireToolName: n.wireName ?? tool.name,
      spelled: primaryInputPath(rawInput),
      toldAs: i,
      machineHadCall:
        e.approval !== void 0 ||
        e.reconcile?.trigger === "in_progress" ||
        e.adoption === "ask_in_flight" ||
        e.adoption === "interrupted",
      transport: w ? void 0 : route.host.transport,
      dispatchEpoch: e.adoption === void 0 ? n.sentUnderEpoch : e.journalEpoch,
      standing: held !== void 0,
      ...(held !== void 0 && { withdraw: held.withdraw }),
      givenUpAt: Date.now(),
    }),
      held?.late.then((k) => p.answeredLate(n.callId, k)).catch(() => {}));
  } catch (error) {
    logForDebugging(
      `[remote-tools] could not record a given-up call for a later correction: ${errorMessage(error)}`,
    );
  }
}
//@ chunk-dtv8x2hx.js:33567-33804 placement
function primaryInputPath(e) {
  let found = ["command", "file_path", "path", "notebook_path"]
    .map((o) => e[o])
    .find((o) => typeof o === "string" && o !== "");
  return found === void 0
    ? "its input as sent"
    : `"${truncateToLength(At(truncateToLength(found, 480)).replace(/[`"]/g, " ").replace(/\s+/g, " ").trim(), 120)}"`;
}
//@ chunk-dtv8x2hx.js:33804-34004 placement
var INTERRUPTED_FORWARD = {
    outcome: { kind: "error", code: "interrupted", message: "interrupted while forwarding" },
    requestBytes: 0,
  },
  UNEXPECTED_FORWARD_ERROR = {
    outcome: { kind: "error", code: "transport_error", message: "unexpected error while forwarding" },
  };
/**
 * 描述投递失败（交付未知、宿主重启、中断）。
 */
//@ chunk-dtv8x2hx.js:34004-36883 placement
async function describeDeliveryFailure(e, n, o) {
  let { tool: tool, host: host, signal: signal } = e,
    callId = e.call.callId,
    i = machineIdentity(host),
    h = { host: n.host },
    w = { journalHost: n.host, ...(n.host_epoch !== void 0 && { journalEpoch: n.host_epoch }) },
    k = (D, X, L, y, I) => ({
      outcome: { kind: "error", code: D, message: X, host: i, ...(I !== void 0 && { open: I }) },
      adoption: L,
      ...w,
      ...(y !== void 0 && { reconcile: y }),
    }),
    S = n.parkedAtRestart ? void 0 : "delivery_unknown";
  if (!isSameHostEpoch(n, host)) return k("host_restarted", eKe(h, n), "instance_gone", void 0, S);
  let A = remoteToolNames(tool, host);
  if (A === void 0) return k("unreachable", eKe(h, n), "unknown", void 0, S);
  let request_id = n.request_id;
  if (request_id !== void 0 && host.transport.withdrawStanding !== void 0) {
    if (n.instance_id !== void 0) e.call.recordAddressee(n.instance_id, n.host_epoch);
    e.call.inherit(request_id, () => host.transport.withdrawStanding?.(request_id));
  }
  let checkInTiming = e.checkInTiming,
    O = formatRemoteOutputFence({
      name: host.name,
      showForMs: 2 * checkInTiming.intervalMs,
      onStatus: e.onStatus,
      waiting: (D) =>
        D ? ASK_FIRST_REASON_TEXTS["in_progress.checkin"](host.name) : reconnectingStatus(host.name),
      standing: void 0,
    }),
    x = await awaitRemoteCallWithProgress({
      host: host,
      held: void 0,
      dispatchEpoch: n.host_epoch,
      toolName: A.wire,
      callId: callId,
      signal: signal,
      timing: checkInTiming,
      onAttempt: O.onAttempt,
      onOutput: O.onOutput,
    }),
    { verdict: verdict } = x,
    E = {
      trigger: "resumed",
      leg: 1,
      result: verdict.kind === "unknown" ? `unknown_${verdict.why}` : verdict.kind,
      attempts: x.attempts,
      misses: x.misses,
      held: !1,
      epochChanged: x.epochChanged,
    };
  switch (verdict.kind) {
    case "late":
    case "answer": {
      let { transported: transported } = verdict;
      if (transported.kind !== "result") return k("unreachable", eKe(h, n), "unknown", E, S);
      let { envelope: envelope } = transported;
      if (envelope?.outcome === "needs_approval") {
        let L =
          host.description?.limits.max_ask_ms !== void 0 && Date.now() - n.dispatched_at <= B7 && kt()
            ? await o(transported)
            : void 0;
        if (L?.approval !== void 0) return { ...L, adoption: "ask_carried_over", ...w, reconcileLeg1: E };
        return toolResultForInterruption(e, n, A.wire, envelope.ask_id, E);
      }
      return {
        reconcile: E,
        adoption: "after_reconnect",
        ...convertRemoteToolResult(tool, host, { ...transported, metaCopy: void 0 }, { afterReconnect: !0 }),
      };
    }
    case "ask_lost":
      return k("still_running", pendingPermissionNotice(h), "ask_in_flight", E, "delivery_unknown");
    case "not_received":
      return k("not_received", neverReceivedNotice(h), "never_received", E);
    case "host_restarted":
    case "gone":
      return k("host_restarted", eKe(h, n), "instance_gone", E, S);
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
        E,
        "host_unresponsive",
      );
    case "host_asleep":
      return (
        host.transport.markUnresponsive?.(),
        k(
          "host_unresponsive",
          ASK_FIRST_REASON_TEXTS.host_asleep({
            name: host.name,
            whileRunning: verdict.whileRunning,
            withdrawn: !1,
            returnNoted: hostAnnouncesReturn(host),
          }) + O.outputNote(),
          "unknown",
          E,
          "host_asleep",
        )
      );
    case "unbound":
      return (
        host.transport.markUnresponsive?.(),
        k(
          "host_unresponsive",
          ASK_FIRST_REASON_TEXTS["unverified_refusal.call_phase"]({
            name: host.name,
            whileRunning: verdict.whileRunning,
          }) + O.outputNote(),
          "unknown",
          E,
          "host_unresponsive",
        )
      );
    case "cancelled":
      return (
        e.call.withdrawInherited(),
        { outcome: interruptedResult(i, { askLater: !0 }), adoption: "interrupted", ...w, reconcile: E }
      );
    case "unreachable":
    case "unknown":
      return k("unreachable", eKe(h, n), "unknown", E, S);
  }
}
//@ chunk-dtv8x2hx.js:36883-38086 placement
async function toolResultForInterruption(e, n, o, r, s) {
  let { tool: tool, host: host, toolUseContext: toolUseContext } = e,
    callId = e.call.callId,
    w = machineIdentity(host),
    k = { host: n.host },
    defaultDeadlineMs = host.transport.limits.defaultDeadlineMs,
    A = await raceWithAbortSignal(
      host.transport
        .call(
          o,
          e.input,
          buildRemoteToolCallMeta({
            callId: callId,
            expiresInMs: Math.max(1, defaultDeadlineMs - Tt),
            ...wirePermissionState(toolUseContext, tool.name),
            approval: { ask_id: r, decision: "deny", feedback: WITHDRAWN },
          }),
          {
            signal: new AbortController().signal,
            deadlineMs: Math.min(defaultDeadlineMs, kn),
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
  if (e.signal.aborted) return { outcome: interruptedResult(w), adoption: "interrupted", reconcile: s };
  let R = A?.kind === "result" ? A.envelope : void 0;
  if (
    A?.kind === "result" &&
    R !== void 0 &&
    R.outcome !== "acknowledged" &&
    R.outcome !== "needs_approval" &&
    R.outcome !== "in_progress" &&
    R.replayed === !0
  )
    return {
      reconcile: s,
      adoption: "after_reconnect",
      ...convertRemoteToolResult(tool, host, { ...A, metaCopy: void 0 }, { afterReconnect: !0 }),
    };
  if (
    A?.kind === "result" &&
    (R?.outcome === "in_progress" || (R?.outcome === "completed" && R.disposition === "duplicate_call"))
  )
    return {
      outcome: { kind: "error", code: "still_running", message: stillRunningNotice(k), host: w },
      adoption: "still_running",
      reconcile: s,
    };
  let T = R?.outcome === "acknowledged" && R.ask_id === r;
  return {
    outcome: {
      kind: "error",
      code: "approval_not_received",
      message: T ? approvalWithdrawnNotice(k) : approvalWithdrawUnconfirmedNotice(k),
      host: w,
    },
    adoption: T ? "ask_withdrawn" : "unknown",
    reconcile: s,
  };
}
//@ chunk-dtv8x2hx.js:38086-39430 placement
async function resolveEarlyCheck(e) {
  let n,
    o = !1,
    r = e.toolUseContext.toolState.get(ServedCallRegistry),
    s,
    u = (A) => {
      if (A === void 0) return;
      let R = s !== void 0;
      if (((s = A), R)) return;
      queueMicrotask(() => {
        let T = s;
        if (((s = void 0), T !== void 0))
          e.toolUseContext.sessionState?.notifyInternalMetadataChanged({ in_flight_served_calls: T });
      });
    },
    adopted = r.adopted(e.call.callId);
  r.takeAdopted(e.call.callId);
  let i,
    h = () => {
      let {
        sentUnderEpoch: sentUnderEpoch,
        carryingRequestId: carryingRequestId,
        instanceId: instanceId,
      } = e.call;
      if (
        i !== void 0 &&
        i.host_epoch === sentUnderEpoch &&
        i.request_id === carryingRequestId &&
        i.instance_id === instanceId
      )
        return;
      ((i = {
        tool_use_id: e.call.callId,
        tool: e.tool.name,
        host: e.host.name,
        ...(sentUnderEpoch !== void 0 && { host_epoch: sentUnderEpoch }),
        ...(carryingRequestId !== void 0 && { request_id: carryingRequestId }),
        ...(instanceId !== void 0 && { instance_id: instanceId }),
        dispatched_at: i?.dispatched_at ?? Date.now(),
      }),
        u(r.add(i)));
    },
    w;
  try {
    let A = {
      ...e,
      noteSync: (R) => {
        n = R;
      },
      noteReadBaselineSent: () => {
        o = !0;
      },
      onFirstSend: h,
      onAddressed: h,
    };
    w =
      adopted !== void 0
        ? await describeDeliveryFailure(e, adopted, (R) => runRemoteToolCall({ ...A, pendingAsk: R }))
        : await runRemoteToolCall(A);
  } finally {
    if (!isTerminalShutdown()) r.remove(e.call.callId);
  }
  let k = o ? { ...w, readBaselineSent: o } : w;
  if (k.outcome.kind !== "completed" || !isRanOutcome(k.outcome.disposition)) return k;
  if (k.outcome.dirSync !== void 0) await countAfterDeviceCommand(k.outcome.dirSync);
  let S =
    e.call.approvedBy ??
    (adopted === void 0 &&
    e.callerGate === void 0 &&
    k.outcome.delivery === "fresh" &&
    k.outcome.disposition === "ran"
      ? "unasked"
      : void 0);
  return {
    ...k,
    outcome: {
      ...k.outcome,
      ...(S !== void 0 && { permittedBy: S }),
      ...(n !== void 0 && { sessionNotes: [...(k.outcome.sessionNotes ?? []), { text: n }] }),
    },
  };
}
/**
 * 远程工具调用主流程：权限、早期检查、发送、等待、重连、结果与遥测（约 18 KB）。
 */
//@ chunk-dtv8x2hx.js:39430-57316 placement
async function runRemoteToolCall({
  tool: tool,
  entry: entry,
  host: host,
  input: input,
  rawInput: rawInput,
  toolUseContext: toolUseContext,
  call: p,
  signal: signal,
  approve: approve,
  speculation: speculation,
  onStatus: onStatus,
  checkInTiming: checkInTiming,
  earlyCheckTiming: earlyCheckTiming,
  silentCallTiming: silentCallTiming,
  askLapseMs: askLapseMs,
  askSeatWaitMs: askSeatWaitMs,
  reconnectHoldMs: reconnectHoldMs,
  noteSync: noteSync,
  noteReadBaselineSent: noteReadBaselineSent,
  onFirstSend: onFirstSend,
  onAddressed: onAddressed,
  pendingAsk: pendingAsk,
}) {
  let y = machineIdentity(host),
    callId = p.callId,
    { dispatchEpoch: dispatchEpoch } = p,
    safeParse = tool.inputSchema.safeParse(input);
  if (!safeParse.success)
    return {
      outcome: {
        kind: "error",
        code: "invalid_input",
        message: formatZodValidationError(tool.name, safeParse.error),
        host: y,
      },
    };
  let te = remoteToolNames(tool, host);
  if (te === void 0)
    return {
      outcome: {
        kind: "error",
        code: "not_served",
        message: toolNotServedMessage({ name: host.name, toolName: tool.name }),
        host: y,
      },
    };
  let ee,
    se,
    ue = (C, P) =>
      collectRemoteResult({
        transported: C,
        host: host,
        call: p,
        dispatchEpoch: dispatchEpoch,
        toolName: te.wire,
        callId: callId,
        signal: signal,
        timing: checkInTiming,
        silentSince: se,
        silentCallTiming: silentCallTiming,
        onStatus: onStatus,
        standingLine: ee,
        approval: P,
      }),
    oe = safeParse.data,
    ro = oe,
    we = input,
    ze = !1,
    me = host.description === void 0 ? void 0 : remoteDirFacts(host.description),
    pe = (C) =>
      tool.backfillObservableInput === void 0 || me === void 0 ? C : resolveRemoteFilePathInput(C, me),
    ie = tool.getPath === void 0 ? void 0 : tool.ruleContentField,
    Nn = (C) =>
      tool.name === GLOB_TOOL_NAME && me !== void 0 && typeof C.pattern === "string"
        ? splitGlobRoot(C.pattern, me)
        : void 0,
    Hn = (C, P, G) => {
      let V = ie === void 0 ? void 0 : C[ie];
      if (ie === void 0 || me === void 0 || typeof V !== "string") return C;
      if (V === P[ie] && typeof G[ie] === "string") return { ...C, [ie]: G[ie] };
      let Q = toDisplayPath(V, me);
      return Q === void 0 ? C : { ...C, [ie]: Q };
    },
    ge = oe,
    io = (C) => {
      let P = Nn(C),
        G = P?.root ?? (ie === void 0 ? void 0 : (C[ie] ?? "."));
      if (ie === void 0 || me === void 0 || typeof G !== "string") return [];
      return remotePathSpellings(G, me)
        .filter((V) => P !== void 0 || (V !== ge[ie] && V !== C[ie]))
        .map((V) => (P === void 0 ? { ...C, [ie]: V } : { ...C, [ie]: V, pattern: P.rest }));
    },
    ao = (C) => {
      let P =
        ie === void 0 || me === void 0
          ? void 0
          : C.map((G) => {
              let V = Nn(G);
              return V === void 0 ? [G[ie], G[ie]] : [G.pattern, V.root];
            })
              .flatMap(([G, V]) =>
                typeof G === "string" && typeof V === "string" ? [[G, checkWindowsPathSafety(V, me)]] : [],
              )
              .find(([, G]) => G !== void 0);
      return P?.[1] === void 0
        ? void 0
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
    },
    Fn = SHELL_TOOL_NAMES.includes(tool.name) ? remoteDirKind(host.description) : void 0,
    Ae = async (C, P) => {
      let G = ao([ge, C]);
      if (G !== void 0) return G;
      let flattened = uniq([ge, ...io(C), C]).flatMap((re) => [
          { parsedInput: re, machineDir: void 0 },
          ...(Fn?.kind === "in_announced_dir" ? [{ parsedInput: re, machineDir: Fn.dir }] : []),
        ]),
        Q = { kind: "proceed" };
      for (let { parsedInput: parsedInput, machineDir: machineDir } of flattened) {
        if (Q.kind === "refuse") break;
        let Z = () =>
          checkRemoteToolPermission({
            tool: tool,
            parsedInput: parsedInput,
            requestBytes: P,
            toolUseContext: toolUseContext,
            host: host,
          });
        Q = isProceedVerdict(Q, machineDir === void 0 ? await Z() : await R0e(() => Yg(machineDir, Z)));
      }
      return Q;
    },
    defaultDeadlineMs = host.transport.limits.defaultDeadlineMs,
    max = Math.max(1, defaultDeadlineMs - Tt),
    uo =
      toolUseContext.agentId === void 0
        ? toolUseContext.messages.findLast(isCompactBoundaryMessage)?.uuid
        : void 0,
    Re,
    he = (C) => {
      let P = wirePermissionState(toolUseContext, tool.name);
      if (C === void 0) ((Re = P.permissionMode), (p.claimedMode = Re));
      return buildRemoteToolCallMeta({
        callId: callId,
        expiresInMs: max,
        ...P,
        model: getMainLoopModel(toolUseContext),
        conversationId: getSessionId(),
        compactionId: uo,
        ...(C !== void 0 && { approval: C }),
        ...(C === void 0 && { readBaseline: co() }),
      });
    },
    co = () =>
      readBaselineForRemoteWrite({
        tool: tool,
        input: oe,
        description: host.description,
        readFileState: toolUseContext.readFileState,
        sessionDir: () => Wer(toolUseContext.session),
      }),
    Je = (C) => iv({ name: te.wire, arguments: { ...we, [REMOTE_TOOL_CALL_META]: C } }),
    Dn = (C, P = we) => {
      (p.sent({ wireName: te.wire, input: P }), p.hold(void 0), toolUseContext.markToolCallRunning?.(callId));
      let G,
        V = !1,
        Q = toolUseContext.toolState.get(RemoteCallState),
        re = watchRemoteCallProgress({
          host: host,
          toolName: te.wire,
          callId: callId,
          signal: signal,
          onStatus: onStatus,
          timing: earlyCheckTiming,
          mayCheck: () => SHELL_TOOL_NAMES.includes(tool.name) && V && Q.has(host.name, G),
          onNoRecord: () => Q.forget(host.name, G),
        }),
        B = watchSilentCall({
          host: host,
          signal: signal,
          checkMisses: checkInTiming.misses,
          timing: silentCallTiming,
        });
      return host.transport
        .call(te.wire, P, C, {
          signal: signal,
          deadlineMs: defaultDeadlineMs,
          toolUseId: callId,
          onSent: (Z) => {
            ((G = Z.epoch),
              (V = Q.has(host.name, Z.epoch)),
              p.recordAddressee(Z.instanceId, Z.epoch, Z.requestId),
              onAddressed?.());
          },
          ...(B.onAccepted === void 0
            ? re.onAccepted !== void 0 && { onAccepted: re.onAccepted }
            : {
                onAccepted: () => {
                  (B.onAccepted?.(), re.onAccepted?.());
                },
              }),
          onTransit: (Z) => p.recordLegTransit(C.approval === void 0 ? 1 : 2, Z),
          ...(hostSupportsProgressChecks(host) && { onHeldAtDeadline: (Z) => p.hold(Z) }),
        })
        .then(
          (Z) => ((ee = re.stop()), B.stop(), (se = B.acceptedAt()), wn(host, Z), Q.note(host.name, G, Z), Z),
        )
        .catch(
          (Z) => (
            (ee = re.stop()),
            B.stop(),
            (se = void 0),
            { kind: "transport_error", detail: `send failed: ${normalizeMcpServerName(errorMessage(Z))}` }
          ),
        );
    },
    $n = (C) => {
      host.transport
        .call(te.wire, we, he(C), {
          signal: new AbortController().signal,
          deadlineMs: Math.min(defaultDeadlineMs, kn),
          toolUseId: callId,
        })
        .catch(() => {});
    },
    le = (C) => $n({ ask_id: C, decision: "deny", feedback: WITHDRAWN }),
    mo = (C) =>
      host.transport
        .call(te.wire, we, he({ ask_id: C, decision: "deny", feedback: WITHDRAWN }), {
          signal: new AbortController().signal,
          deadlineMs: Math.min(defaultDeadlineMs, kn),
          toolUseId: callId,
        })
        .catch(() => {
          return;
        }),
    fo = (C) =>
      raceWithAbortSignal(mo(C), signal, () => new AbortError()).catch(() => {
        return;
      }),
    Bn = toolUseContext.toolState.get(KeyedSemaphore),
    xn = host.description?.limits.max_in_flight ?? Wo,
    go = toolUseContext.toolState.get(_1o),
    ho = clampServingLimit("pending_asks_max", host.description?.limits.pending_asks_max) ?? wgt,
    U = Je(he()),
    _e = pendingAsk === void 0 ? await Ae(pe(oe), U) : { kind: "proceed" };
  if (_e.kind === "refuse")
    return { requestBytes: U, outcome: { kind: "error", code: _e.code, message: _e.message, host: y } };
  let ke,
    Qe = !1;
  if (_e.kind === "ask_first") {
    if (approve === void 0)
      return {
        requestBytes: U,
        outcome: {
          kind: "error",
          code: "denied_by_session_rule",
          message: `${_e.message} This session asks before running this call and could not raise its prompt here; ${host.name} was not contacted.`,
          host: y,
        },
      };
    if (signal.aborted) return { outcome: cancelledResult(y), requestBytes: U };
    ((Qe = getToolPermissionContext(toolUseContext).mode === "plan"),
      (ge = oe),
      (oe = pe(oe)),
      (we = pe(we)),
      (U = Je(he())));
    let C = !1,
      P = await waitWhileAsking(p, SESSION_ASK_RULE, askLapseMs, (G, V) =>
        approve({
          askId: SESSION_ASK_RULE,
          ended: G,
          host: y,
          tool: tool.name,
          input: oe,
          message: _e.message,
          decisionReason: void 0,
          suggestions: [],
          classifierEligible: !1,
          keepsStandingApprovals: !1,
          offeredStandingRules: [],
          patience: V,
          askEnded: () => p.askEnded !== void 0,
          noteCard: (Q) => {
            p.card = Q;
          },
        }).catch((Q) => {
          if (Q instanceof AbortError && !signal.aborted) throw Q;
          if (!signal.aborted)
            ((C = !0),
              logForDebugging(
                `remote tool call: this session's own permission prompt failed: ${errorMessage(Q)}`,
                { level: "error" },
              ));
          return;
        }),
      );
    if (P !== void 0 && "ended" in P)
      return { requestBytes: U, ...describeNoAnswer(host, y, P.ended, askLapseMs) };
    if (((Qe &&= getToolPermissionContext(toolUseContext).mode === "plan"), P === void 0))
      return {
        requestBytes: U,
        approval: C ? "prompt_failed" : "withdrawn",
        outcome: C
          ? {
              kind: "error",
              code: "prompt_failed",
              message: `This session could not raise its permission prompt for ${host.name}; the call did not run.`,
              host: y,
            }
          : cancelledResult(y),
      };
    if (signal.aborted && P.decision !== "deny") return { outcome: cancelledResult(y), requestBytes: U };
    if (P.decision === "unanswerable")
      return {
        requestBytes: U,
        approval: "prompt_failed",
        outcome: {
          kind: "error",
          code: "prompt_failed",
          message: `${P.message} ${host.name} was not contacted.`,
          host: y,
        },
      };
    if (P.decision === "deny")
      return {
        requestBytes: U,
        approval: P.insteadOfRejection === void 0 ? "denied" : "blocked",
        outcome: {
          kind: "error",
          code: "rejected_in_session",
          message: P.insteadOfRejection?.message ?? remoteRejectMessage(toolUseContext.agentId, P.feedback),
          ...(P.insteadOfRejection !== void 0 && { denialKind: P.insteadOfRejection.denialKind }),
          host: y,
        },
      };
    if (P.decidedBy !== void 0) p.recordApprovedBy(P.decidedBy);
    if (P.updatedInput !== void 0) {
      let safeParse = tool.inputSchema.safeParse(P.updatedInput);
      if (!safeParse.success)
        return {
          requestBytes: U,
          approval: "withdrawn",
          outcome: {
            kind: "error",
            code: "invalid_input",
            message: `The edited ${tool.name} input from this session's prompt does not parse; ${host.name} was not contacted.`,
            host: y,
          },
        };
      ((ge = Hn(safeParse.data, oe, ge)),
        (oe = safeParse.data),
        (we = P.updatedInput),
        (ze = !0),
        (U = Je(he())));
      let V = await Ae(pe(oe), U);
      if (V.kind === "refuse")
        return {
          requestBytes: U,
          approval: "withdrawn",
          outcome: { kind: "error", code: V.code, message: V.message, host: y },
        };
      ke = V.kind === "ask_first" ? V.rule : _e.rule;
    } else ke = _e.rule;
  }
  let Wn = () =>
      holdForReconnect({
        tool: tool,
        host: host,
        call: p,
        signal: signal,
        onStatus: onStatus,
        holdMs: reconnectHoldMs,
      }),
    Kn = await Wn();
  if (Kn !== void 0) return { requestBytes: U, ...Kn };
  let beginAskSeatWait = p.beginAskSeatWait(),
    Un = !1;
  using Oe = areAskSeatsOn()
    ? await acquireSeat(go, host.name, ho, signal, {
        waitLimitMs: pendingAsk === void 0 ? askSeatWaitMs : 0,
        onWait: () => {
          if (pendingAsk !== void 0) return;
          ((Un = !0), onStatus?.(ASK_FIRST_REASON_TEXTS["ask_seat.waiting"](host.name), askSeatWaitMs));
        },
      })
    : O6s;
  if ((beginAskSeatWait(), Oe === void 0)) return { outcome: cancelledResult(y), requestBytes: U };
  if (!Oe.seated && pendingAsk === void 0) p.noteSentWithoutAskSeat();
  if (Un) onStatus?.(ASK_FIRST_REASON_TEXTS["ask_seat.sending"](host.name));
  let be = pendingAsk ?? (await ko());
  async function ko() {
    let beginQueuedWait = p.beginQueuedWait();
    return runWithSlot(Bn, host.name, xn, signal, async () => {
      if ((beginQueuedWait(), isTerminalShutdown() && !signal.aborted)) await heldUntilExit();
      let P = await Wn();
      if (P !== void 0) return { requestBytes: U, ...P };
      let G = !1;
      try {
        G = tool.isReadOnly(oe);
      } catch {}
      let V = !1;
      try {
        V = tool.isConcurrencySafe(ro);
      } catch {}
      let Q = await clearForwardToDevice({
        host: host,
        readOnly: G,
        runsBesideOthers: toolUseContext.agentId !== void 0 || entry === "repl" || V,
        signal: signal,
        onStatus: onStatus,
      });
      if (Q.kind === "hold")
        return {
          outcome: { kind: "error", code: "sync_failed", message: Q.message, host: y },
          requestBytes: U,
        };
      if (Q.kind === "away") return { requestBytes: U, ...convertRemoteToolResult(tool, host, Q.outcome) };
      if (Q.kind === "go_with_note") noteSync(Q.note);
      let re = await Ae(pe(oe), U);
      if (re.kind === "refuse")
        return { outcome: { kind: "error", code: re.code, message: re.message, host: y }, requestBytes: U };
      if (re.kind === "ask_first" && !isSameHostName(re.rule, ke))
        return ke === void 0
          ? {
              outcome: {
                kind: "error",
                code: "denied_by_session_rule",
                message: `${re.message} ${host.name} was not contacted.`,
                host: y,
              },
              requestBytes: U,
            }
          : {
              approval: "withdrawn",
              outcome: {
                kind: "error",
                code: "approval_no_longer_covers",
                message: ASK_FIRST_REASON_TEXTS.approval_no_longer_covers(host.name),
                host: y,
              },
              requestBytes: U,
            };
      if (signal.aborted) return { outcome: cancelledResult(y), requestBytes: U };
      if (isTerminalShutdown()) await heldUntilExit();
      if ((onFirstSend?.(), ke === void 0)) speculation?.begin({ host: y, input: pe(oe) });
      let B = he();
      if (B.read_baseline !== void 0) noteReadBaselineSent();
      return Dn(B);
    }).then((P) => {
      if (P === void 0) beginQueuedWait();
      return P;
    });
  }
  if (be === void 0) return { outcome: cancelledResult(y), requestBytes: U };
  if ("outcome" in be) return be;
  if (!(be.kind === "result" && be.envelope?.outcome === "needs_approval")) Oe.release();
  let fe = await ue(be);
  if (fe.kind === "ended") return { requestBytes: U, reconcile: fe.trace, outcome: fe.outcome };
  let transported = fe.transported,
    W =
      transported.kind === "result" && transported.envelope?.outcome === "needs_approval"
        ? transported.envelope
        : void 0;
  if (W === void 0)
    return (
      speculation?.abandon(),
      {
        requestBytes: U,
        reconcile: fe.trace,
        ...convertRemoteToolResult(tool, host, transported, {
          afterReconnect: fe.kind === "answered",
          call: { input: oe, editedByApproval: ze },
        }),
      }
    );
  (Oe.retake(), toolUseContext.markToolCallRunning?.(callId, !1), p.questionRaised());
  let Ze = await (async () => {
    if (approve === void 0)
      return (
        le(W.ask_id),
        { requestBytes: U, approval: "no_handler", ...convertRemoteToolResult(tool, host, transported) }
      );
    let C = iv(W.input) <= maxRequestBytes(host) ? tool.inputSchema.safeParse(W.input) : { success: !1 };
    if (W.tool !== te.ask || !C.success)
      return (
        le(W.ask_id),
        {
          requestBytes: U,
          approval: "unreadable_ask",
          outcome: {
            kind: "error",
            code: "refused_by_host",
            message: refusedByMachineLine({
              name: host.name,
              message: "it asked for approval of a call this session could not read; nothing ran",
            }),
            host: y,
          },
        }
      );
    let P = await Ae(C.data, U).catch((q) => {
      throw (le(W.ask_id), q);
    });
    if (P.kind === "refuse")
      return (
        le(W.ask_id),
        { requestBytes: U, approval: "withdrawn", outcome: describeWithdrawnAsk(P, host.name, y) }
      );
    let G = !1,
      V =
        ke !== void 0 &&
        (P.kind !== "ask_first" || isSameHostName(P.rule, ke)) &&
        W.prior_answer_ok === !0 &&
        sameInputsModuloDefaults(C.data, pe(oe), void 0),
      Q =
        W.classifier_eligible === !0 &&
        P.kind !== "ask_first" &&
        (Re === "auto" || (Re === "plan" && isAutoModeCapableHost(host))) &&
        Re === wirePermissionState(toolUseContext, tool.name).permissionMode;
    if (W.classifier_eligible === !0 && Re === "plan" && !Q)
      logForDebugging(
        `[remoteCall] plan-mode ask ${W.ask_id} goes to a person: host accepts plan answers=${hasCapability(host)}, account-set mode=${getAccountSetPermissionMode() ?? "unknown"}, reached over ${host.transport.kind}`,
      );
    if (V) p.answeredWithoutPrompt();
    let re = getToolPermissionContext(toolUseContext).mode === "plan",
      B = V
        ? p.askEnded === void 0
          ? { decision: "allow" }
          : { ended: p.askEnded }
        : await waitWhileAsking(p, W.ask_id, askLapseMs, (q, z) =>
            approve({
              askId: W.ask_id,
              ended: q,
              patience: z,
              askEnded: () => p.askEnded !== void 0,
              noteCard: (j) => {
                p.card = j;
              },
              host: y,
              tool: tool.name,
              input: W.input,
              message: sanitizeForPrompt(W.message, Hen),
              decisionReason:
                W.decision_reason === void 0 ? void 0 : sanitizeForPrompt(W.decision_reason, Hen),
              suggestions: (W.suggestions ?? []).map((j) => sanitizeForPrompt(j, Vo)),
              classifierEligible: Q,
              keepsStandingApprovals: hasSessionCapability(host),
              offeredStandingRules: hasSessionCapabilityPair(host) ? (W.suggestions ?? []) : [],
              ...(pendingAsk !== void 0 && { pendingBeforeRestart: !0 }),
              ...(Q &&
                W.auto_mode !== void 0 && {
                  hostRules: xr(W.auto_mode, (j) => j?.map((Se) => Xo(Se)).filter((Se) => Se !== "")),
                }),
            }).catch((j) => {
              if (j instanceof AbortError && !signal.aborted) {
                if (p.askEnded !== void 0) {
                  toolUseContext.abortController.abort(j);
                  return;
                }
                throw (le(W.ask_id), j);
              }
              if (((G = !signal.aborted), G))
                logForDebugging(
                  `remote tool call: the session's permission prompt failed: ${errorMessage(j)}`,
                  { level: "error" },
                );
              return;
            }),
          );
    if (B !== void 0 && "ended" in B)
      return (le(W.ask_id), { requestBytes: U, ...describeNoAnswer(host, y, B.ended, askLapseMs) });
    if (B === void 0 || (signal.aborted && B.decision !== "deny")) {
      if ((le(W.ask_id), G && !signal.aborted))
        return {
          requestBytes: U,
          approval: "prompt_failed",
          outcome: {
            kind: "error",
            code: "prompt_failed",
            message: `This session could not raise its permission prompt for ${host.name}; the call did not run.`,
            host: y,
          },
        };
      return {
        outcome: interruptedResult(y, { withdrawnAtAsk: !0 }),
        requestBytes: U,
        approval: "withdrawn",
      };
    }
    if (B.decision === "unanswerable")
      return (
        le(W.ask_id),
        {
          requestBytes: U,
          approval: "prompt_failed",
          outcome: {
            kind: "error",
            code: "prompt_failed",
            message: `${B.message} The call did not run on ${host.name}.`,
            host: y,
          },
        }
      );
    let Z = B.feedback === void 0 ? void 0 : truncateToLength(B.feedback, NPe),
      nn = {
        ask_id: W.ask_id,
        decision: B.decision,
        ...(B.decision === "allow" && B.updatedInput !== void 0 && { updated_input: B.updatedInput }),
        ...(Z !== void 0 && { feedback: Z }),
        ...(B.decision === "allow" &&
          B.permissionUpdates !== void 0 &&
          B.permissionUpdates.length > 0 && {
            permission_updates: B.permissionUpdates.slice(0, MAX_REMEMBERED_ASKS),
          }),
      };
    if (B.decision === "allow" && !V && B.decidedBy !== void 0) p.recordApprovedBy(B.decidedBy);
    let Ie = B.decision === "allow" && B.decidedBy === "classifier",
      yo =
        (B.decision === "allow" && B.raisedInPlanMode !== void 0 ? B.raisedInPlanMode : re) &&
        getToolPermissionContext(toolUseContext).mode === "plan" &&
        (!Ie || Re === "plan");
    if (B.decision === "deny")
      return (
        $n(nn),
        {
          requestBytes: U,
          approval: B.insteadOfRejection === void 0 ? "denied" : "blocked",
          outcome: {
            kind: "error",
            code: "rejected_in_session",
            message: B.insteadOfRejection?.message ?? remoteRejectMessage(toolUseContext.agentId, Z),
            ...(B.insteadOfRejection !== void 0 && { denialKind: B.insteadOfRejection.denialKind }),
            host: y,
          },
        }
      );
    let ve = B.updatedInput === void 0 ? void 0 : tool.inputSchema.safeParse(B.updatedInput);
    if (ve?.success) ge = Hn(ve.data, C.data, ge);
    let Be =
      ve === void 0
        ? void 0
        : ve.success
          ? await Ae(pe(ve.data), U).catch((q) => {
              throw (le(W.ask_id), q);
            })
          : {
              kind: "refuse",
              code: "invalid_input",
              message: `The edited ${tool.name} input from this session's prompt does not parse; it was not sent.`,
            };
    if (Be?.kind === "refuse")
      return (
        le(W.ask_id),
        { requestBytes: U, approval: "withdrawn", outcome: describeWithdrawnAsk(Be, host.name, y) }
      );
    let Ro = he(nn),
      input = W.input,
      ce = iv({ name: te.wire, arguments: { ...input, [REMOTE_TOOL_CALL_META]: Ro } }),
      Gn = maxRequestBytes(host);
    if (ce > Gn)
      return (
        le(W.ask_id),
        {
          requestBytes: ce,
          approval: "withdrawn",
          outcome: {
            kind: "error",
            code: "request_too_large",
            message: inputTooLargeMessage({ name: host.name, requestBytes: ce, capBytes: Gn }),
            host: y,
          },
        }
      );
    let qn = B.updatedInput ?? C.data,
      tn = ve?.success
        ? { input: ve.data, editedByApproval: !0 }
        : sameInputsModuloDefaults(C.data, pe(oe), void 0)
          ? { input: oe, editedByApproval: ze }
          : void 0,
      vo = () => {
        let beginQueuedWait = p.beginQueuedWait();
        return runWithSlot(Bn, host.name, xn, signal, async () => {
          if ((beginQueuedWait(), isTerminalShutdown() && !signal.aborted)) await heldUntilExit();
          let z = await Ae(pe(qn), ce);
          if (z.kind === "refuse") return { kind: "late_refusal", verdict: z };
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
            let Xn = !1;
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
          if (signal.aborted) return { kind: "cancelled" };
          if (isTerminalShutdown()) await heldUntilExit();
          let Ao = Dn(he(nn), input);
          return (Oe.release(), Ao);
        }).then(
          (z) => {
            if (z === void 0) beginQueuedWait();
            return z;
          },
          (z) => {
            throw (le(W.ask_id), z);
          },
        );
      },
      xe = V ? "pre_approved" : "allowed",
      To = (q, z) => {
        let j = q?.kind === "result" ? q.envelope : void 0;
        if (j?.outcome === "acknowledged" && j.ask_id === W.ask_id)
          return {
            approval: "withdrawn",
            outcome: {
              kind: "error",
              code: "approval_not_received",
              message: approvalDroppedMessage(host.name, z, !0),
              host: y,
            },
          };
        if (
          q?.kind === "result" &&
          j !== void 0 &&
          (j.outcome === "in_progress" ||
            (j.outcome !== "needs_approval" && j.outcome !== "acknowledged" && j.replayed === !0) ||
            (j.outcome === "completed" && j.disposition === "duplicate_call"))
        )
          return {
            approval: xe,
            ...convertRemoteToolResult(tool, host, q, { afterReconnect: !0, call: tn }),
          };
        return {
          approval: "withdrawn",
          outcome: {
            kind: "error",
            code: "approval_not_received",
            message: approvalDroppedMessage(host.name, z, !1),
            host: y,
            open: "delivery_unknown",
          },
        };
      };
    return (async (q) => {
      if (q?.kind === "late_refusal")
        return (
          le(W.ask_id),
          { requestBytes: ce, approval: "withdrawn", outcome: describeWithdrawnAsk(q.verdict, host.name, y) }
        );
      if (
        q === void 0 ||
        q.kind === "cancelled" ||
        q.kind === "unreachable" ||
        q.kind === "stalled" ||
        q.kind === "approval_unverified"
      ) {
        if ((le(W.ask_id), q?.kind === "stalled"))
          return {
            requestBytes: ce,
            approval: "withdrawn",
            outcome: {
              kind: "error",
              code: q.takenBack ? "stalled_unsent" : "stalled",
              message:
                q.request === "probe"
                  ? livenessCheckWithdrawnMessage({ name: host.name, capMs: q.capMs })
                  : q.takenBack
                    ? approvalWithdrawnMessage({ name: host.name, capMs: q.capMs })
                    : approvalNotSentMessage({ name: host.name, capMs: q.capMs }),
              ...(q.request !== "probe" && !q.takenBack && { open: "stalled" }),
              host: y,
            },
          };
        if (q?.kind === "approval_unverified" && Ie)
          return {
            requestBytes: ce,
            approval: "withdrawn",
            outcome: {
              kind: "error",
              code: "approval_unverified",
              message: classifierOnlyApprovalMessage(host.name, tool.name),
              host: y,
            },
          };
        return q?.kind === "unreachable" || q?.kind === "approval_unverified"
          ? {
              requestBytes: ce,
              approval: "withdrawn",
              ...convertRemoteToolResult(tool, host, q, { call: tn }),
            }
          : { outcome: interruptedResult(y, { withdrawnAtAsk: !0 }), requestBytes: U, approval: "withdrawn" };
      }
      let z = await ue(q, { byClassifier: Ie, releaseAsk: () => le(W.ask_id) });
      if (z.kind === "ended") {
        if (z.outcome.kind === "error" && z.outcome.code === "interrupted") le(W.ask_id);
        return { requestBytes: ce, approval: xe, reconcile: z.trace, outcome: z.outcome };
      }
      let transported = z.transported;
      if (transported.kind !== "result" || transported.envelope?.outcome === "refused") le(W.ask_id);
      if (transported.kind === "stalled" && transported.takenBack)
        return {
          requestBytes: ce,
          approval: "withdrawn",
          reconcile: z.trace,
          outcome: {
            kind: "error",
            code: "stalled_unsent",
            message: approvalWithdrawnMessage({ name: host.name, capMs: transported.capMs }),
            host: y,
          },
        };
      if (
        transported.kind === "result" &&
        transported.envelope?.outcome === "refused" &&
        (transported.envelope.code === "withdrawn" ||
          transported.envelope.code === "stale" ||
          transported.envelope.reason === "stale_answer") &&
        !Ie &&
        !V
      )
        p.endAsk(
          normalizeWithdrawReason(
            transported.envelope.reason ?? (transported.envelope.code === "stale" ? "stale_answer" : ""),
          ),
        );
      if (transported.kind === "result" && transported.envelope?.outcome === "needs_approval") {
        if (z.kind === "answered" && transported.envelope.ask_id === W.ask_id) {
          let Se = await fo(W.ask_id);
          return { requestBytes: ce, reconcile: z.trace, ...To(Se, z.trace.trigger) };
        }
        return (
          le(transported.envelope.ask_id),
          {
            requestBytes: ce,
            approval: "asked_again",
            reconcile: z.trace,
            outcome: {
              kind: "error",
              code: "refused_by_host",
              message: `Your approval reached ${host.name} after it stopped waiting for it; nothing ran. Retry the call if it is still wanted.`,
              host: y,
            },
          }
        );
      }
      if (transported.kind === "dropped" && transported.why === "write_unresolved")
        return {
          requestBytes: ce,
          approval: xe,
          reconcile: z.trace,
          outcome: {
            kind: "error",
            code: "dropped",
            message: approvalUploadUnconfirmedMessage(host.name),
            host: y,
            open: "delivery_unknown",
          },
        };
      return {
        requestBytes: ce,
        approval: xe,
        reconcile: z.trace,
        ...convertRemoteToolResult(tool, host, transported, {
          afterReconnect: z.kind === "answered",
          call: tn,
        }),
      };
    })(await vo());
  })();
  return fe.trace !== void 0 && Ze.reconcile !== fe.trace ? { ...Ze, reconcileLeg1: fe.trace } : Ze;
}
//@ chunk-dtv8x2hx.js:57316-61083 placement
async function collectRemoteResult({
  transported: transported,
  host: host,
  call: o,
  dispatchEpoch: dispatchEpoch,
  toolName: toolName,
  callId: callId,
  signal: signal,
  timing: timing,
  silentSince: silentSince,
  silentCallTiming: silentCallTiming,
  onStatus: onStatus,
  standingLine: standingLine,
  approval: approval,
}) {
  let R = approval === void 0 ? 1 : 2,
    T =
      R === 1 && transported.kind === "result" && transported.envelope?.outcome === "in_progress"
        ? transported.envelope
        : void 0,
    O = transported.kind === "dropped" || transported.kind === "timed_out" ? transported : void 0;
  if (O === void 0 && T === void 0) return { kind: "as_is", transported: transported, trace: void 0 };
  let x =
      T !== void 0
        ? (T.host_epoch ?? dispatchEpoch)
        : R === 1
          ? (O?.sentUnderEpoch ?? dispatchEpoch)
          : dispatchEpoch,
    M = transported.kind === "timed_out" ? o.held : void 0,
    E = (Y) => {
      if (M === void 0) return;
      (logRemoteTools(callId, "standing request withdrawn", { leg: R, why: Y }),
        M.withdraw(),
        o.hold(void 0));
    };
  if (x === void 0) return (E("no_epoch"), { kind: "as_is", transported: transported, trace: void 0 });
  let D = machineIdentity(host),
    X = O === void 0 ? "in_progress" : describeClassifierRefusal(O, approval),
    L = formatRemoteOutputFence({
      name: host.name,
      showForMs: 2 * timing.intervalMs,
      onStatus: onStatus,
      waiting: (Y) =>
        M === void 0 && T === void 0 && !Y
          ? reconnectingStatus(host.name)
          : ASK_FIRST_REASON_TEXTS["in_progress.checkin"](host.name),
      standing: M === void 0 ? void 0 : standingLine,
    }),
    y = await awaitRemoteCallWithProgress({
      host: host,
      held: M,
      dispatchEpoch: x,
      toolName: toolName,
      callId: callId,
      signal: signal,
      timing: timing,
      ranBefore: T?.state === "running",
      onAttempt: L.onAttempt,
      onOutput: L.onOutput,
      silentSince: silentSince,
      silentCallTiming: silentCallTiming,
    }),
    { verdict: verdict } = y,
    F = {
      trigger: X,
      leg: R,
      result: verdict.kind === "unknown" ? `unknown_${verdict.why}` : verdict.kind,
      attempts: y.attempts,
      misses: y.misses,
      held: M !== void 0,
      epochChanged: y.epochChanged,
    };
  switch (verdict.kind) {
    case "late":
      return (wn(host, verdict.transported), { kind: "as_is", transported: verdict.transported, trace: F });
    case "answer":
      return (
        wn(host, verdict.transported),
        E(verdict.kind),
        { kind: "answered", transported: { ...verdict.transported, metaCopy: void 0 }, trace: F }
      );
    case "host_restarted":
      return (
        E(verdict.kind),
        {
          kind: "ended",
          trace: F,
          outcome: {
            kind: "error",
            code: "host_restarted",
            message: hostRestartedLostMessage(host.name, X),
            host: D,
          },
        }
      );
    case "not_received":
      return (
        E(verdict.kind),
        R === 2 || T !== void 0
          ? { kind: "as_is", transported: transported, trace: F }
          : {
              kind: "ended",
              trace: F,
              outcome: {
                kind: "error",
                code: "not_received",
                message: neverReceivedMessage(host.name, X),
                host: D,
              },
            }
      );
    case "ask_lost":
      return (
        E(verdict.kind),
        {
          kind: "ended",
          trace: F,
          outcome: {
            kind: "error",
            code: "still_running",
            message: stillRunningMessage({ name: host.name, state: "awaiting_approval", cause: X }),
            host: D,
          },
        }
      );
    case "unbound":
      return (
        host.transport.markUnresponsive?.(),
        approval?.releaseAsk(),
        {
          kind: "ended",
          trace: F,
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
        }
      );
    case "host_unresponsive":
      if (!verdict.stillConnected) host.transport.markUnresponsive?.();
      if (verdict.intervalMs !== void 0)
        M?.late.then((Y) => {
          if (Y.kind === "result") logFeatureSad("rtc_silent_call", "answered_late");
        });
      return {
        kind: "ended",
        trace: F,
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
      return (
        host.transport.markUnresponsive?.(),
        {
          kind: "ended",
          trace: F,
          outcome: {
            kind: "error",
            code: "host_unresponsive",
            message:
              ASK_FIRST_REASON_TEXTS.host_asleep({
                name: host.name,
                whileRunning: verdict.whileRunning,
                withdrawn: O?.kind === "timed_out" && M === void 0,
                returnNoted: hostAnnouncesReturn(host),
              }) + L.outputNote(),
            host: D,
            open: "host_asleep",
          },
        }
      );
    case "cancelled":
      return (
        E(verdict.kind),
        { kind: "ended", trace: F, outcome: interruptedResult(D, { askLater: T !== void 0 }) }
      );
    case "gone":
      return { kind: "as_is", transported: verdict.transported, trace: F };
    case "unreachable":
    case "unknown":
      if (M?.takeBack() === !0)
        return (
          logRemoteTools(callId, "standing request taken back unsent", { leg: R }),
          {
            kind: "as_is",
            transported: {
              kind: "stalled",
              capMs: transported.kind === "timed_out" ? transported.capMs : 0,
              request: "call",
              takenBack: !0,
            },
            trace: F,
          }
        );
      if (M === void 0 || transported.kind !== "timed_out")
        return { kind: "as_is", transported: transported, trace: F };
      if (verdict.kind === "unreachable" && !M.accepted())
        return (E("unreachable_unaccepted"), { kind: "as_is", transported: transported, trace: F });
      return {
        kind: "ended",
        trace: F,
        outcome: {
          kind: "error",
          code: "timed_out",
          message:
            callTimedOutMessage({ name: host.name, capMs: transported.capMs, left: !0 }) + L.outputNote(),
          host: D,
          open: "timed_out",
        },
      };
  }
}
//@ chunk-dtv8x2hx.js:61083-61320 placement
function waitWhileAsking(e, n, o, r) {
  let abortController = new AbortController(),
    u,
    promise = new Promise((i) => {
      u = (h) => i({ ended: h });
    });
  return e.whileAsking(
    {
      askId: n,
      end: (i) => {
        (abortController.abort(i), u(i));
      },
    },
    (i) => (abortController.signal.aborted ? promise : Promise.race([promise, r(abortController.signal, i)])),
    { afterMs: o, reason: "no_answer" },
  );
}
//@ chunk-dtv8x2hx.js:61320-61662 placement
function describeNoAnswer(e, n, o, r) {
  return {
    approval: o === "no_answer" ? "no_answer" : "withdrawn",
    askEndReason: o,
    outcome:
      o === "no_answer"
        ? {
            kind: "error",
            code: "no_answer",
            message: ASK_FIRST_REASON_TEXTS.no_answer({
              name: e.name,
              afterMs: r,
              waitAnnounced: e.description?.limits.max_ask_ms !== void 0,
            }),
            host: n,
          }
        : {
            kind: "error",
            code: "withdrawn",
            message: ASK_FIRST_REASON_TEXTS.withdrawn({ name: e.name, reason: o }),
            host: n,
          },
  };
}
//@ chunk-dtv8x2hx.js:61662-61883 placement
function describeClassifierRefusal(e, n) {
  if (isUnverifiedRefusal(e)) return n?.byClassifier ? "classifier_refused" : "unverified_refusal";
  if (e.kind === "dropped" && e.why === "write_unresolved")
    return n !== void 0 ? "approval_write_unresolved" : "write_unresolved";
  return e.kind;
}
//@ chunk-dtv8x2hx.js:61883-62138 placement
function describeWithdrawnAsk(e, n, o) {
  let r = ` ${n} was not contacted.`,
    s = e.message.endsWith(r) ? e.message.slice(0, -r.length) : e.message;
  return {
    kind: "error",
    code: e.code,
    message: `${s} ${n} had already been asked; its suspended call was withdrawn and nothing ran there.`,
    host: o,
  };
}
//@ chunk-dtv8x2hx.js:62138-62317 placement
function wirePermissionState(e, n) {
  let o = getToolPermissionContext(e),
    r = o.mode === "auto" && iwt(n, e.getProactivityLevel()) ? "default" : o.mode;
  return { permissionMode: wirePermissionMode(r), isBypassAvailable: o.isBypassPermissionsModeAvailable };
}
//@ chunk-dtv8x2hx.js:62317-62404 placement
function wn(e, n) {
  if (n.kind === "result" && n.dirSync !== void 0)
    try {
      heardSyncAnswer(e, n.dirSync);
    } catch {}
}
//@ chunk-dtv8x2hx.js:62404-62603 placement
function remoteToolNames(e, n) {
  if (e.isMcp !== !0) return { wire: e.name, ask: e.name };
  let o = e.mcpInfo?.toolName,
    r = o === void 0 ? void 0 : n.passthroughTools?.get(o);
  return o === void 0 || r === void 0 ? void 0 : { wire: o, ask: r.localName };
}

export { collectAskRules, logRemoteToolForward, waitForAskAnswer, logRemoteForward, primaryInputPath };
