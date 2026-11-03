/**
 * components/messages/SystemTextMessage.tsx
 *
 * 系统消息分派：turn_duration（"Worked for Xm"）、memory_saved、away_summary、agents_killed、stop_hook_summary、bridge_status、api_error、model_fallback、permission_retry 等。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/components/messages/SystemTextMessage.tsx
 * pieces: chunk-ah34pb7m.js (26), chunk-e4xept39.js (1), chunk-e6aww6q8.js (1)
 * attribution: affinity 1, fingerprint 12, layout 12, placement 2, file-local 1
 */
import { normalize, basename, basename as basename_2, basename as basename_3 } from "path";
import { w } from "../../../vendor/react/compiler-runtime.js";
import { rs, Cr, useAppState } from "../../state/AppState.js";
import { MEMO_CACHE_SENTINEL, EARLY_RETURN_SENTINEL } from "../../../runtime/bun-runtime.js";
import { e, r, Fragment } from "../../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { Box, Text, Link } from "../../ink/components/Text.js";
import { aps, BLACK_CIRCLE, TEARDROP_ASTERISK } from "../../utils/permissions/autoModeRulesPrompt.js";
import { zhe } from "../../utils/pastedContent.js";
import { TURN_COMPLETION_VERBS } from "../../constants/turnCompletionVerbs.js";
import { isPanelAgentTask, isIdleTeammateTask } from "../../tasks/taskKinds.js";
import { isTerminalTaskStatus as isTerminalTaskStatus_2 } from "../../tasks/taskStatus.js";
import { $f } from "../../utils/messageQueueManager.js";
import { isCoordinatorPanelActive } from "../../utils/transcriptDiagnostics.js";
import { shouldHideTasksFooter } from "../tasks/taskStatusUtils.js";
import { bWe } from "../../utils/claudeInChrome/toolRendering.js";
import { getPillLabelWithExtra } from "../../tasks/pillLabel.js";
import { readFlagWithOverride } from "../../services/analytics/flagOverrides.js";
import { isRefusalFallbackEnabled } from "../../services/api/refusalFallback.js";
import { LinkifiedText } from "../rateLimit/usageCreditsOffer.js";
import { RemoteSessionLinkMessage } from "./_new/SyncStatusRows.js";
import { getValidStringArray, normalizeHookSummary } from "../../utils/collapseHookSummaries.js";
import { permissionRetryText, tjt } from "../../utils/messages.js";
import { useTerminalSize } from "../../hooks/useTerminalSize.js";
import { CtrlOToExpand } from "../CtrlOToExpand.js";
import { useShimmerOffset, ShimmerText } from "../../tools/ReportFindingsTool/UI.js";
import { hasStringUuid } from "../../bridge/inboundMessages.js";
import { Nu } from "../../context/QueuedMessageContext.js";
import { resolveSetting } from "../../utils/settings/userIntentSettings.js";
import { formatBriefTimestamp } from "../../utils/formatBriefTimestamp.js";
import { y } from "../../../vendor/react/cjs/react.production.js";
import { actionKeysNamespace } from "../pluginUi/render/actionKeys.js";
import { formatDuration, formatNumber } from "../../utils/format.js";
import { re } from "../../../vendor/@inquirer/figures/dist/esm/index.js";
import { a5 } from "../FreezeWhenOffscreen.js";
import { getMemorySavedVerb, teamMemSavedPart } from "./teamMemSaved.js";
import { renderWithForceUpdate } from "../../hooks/useForceRender.js";
import { getAutoMemPathOrNull } from "../../memdir/paths.js";
import { getPlatform } from "../../utils/platform.js";
import { isAllowedAutoMemWritePath } from "../../services/extractMemories/extractMemories.js";
import { MessageResponse } from "../MessageResponse.js";
import { hasControlChars } from "../../services/policyLimits/complianceTaints.js";
import { HIDDEN_PATH_PLACEHOLDER } from "../../utils/file.js";
import { openPath } from "../../utils/browser.js";
import { FilePathLink } from "../FilePathLink.js";
import { O4o, L4o, I4o } from "../../services/api/compactionHeaders.js";

//@ chunk-ah34pb7m.js:65544-65591 affinity
function selectMaxProseWidth(L) {
  return L.settings.maxProseWidth;
}
//@ chunk-ah34pb7m.js:65591-66292 fingerprint = ThinkingMessage (0.463)
function ThinkingMessage(t0) {
  let $ = w(13),
    { content: content, addMargin: addMargin, trailer: trailer } = t0,
    f = rs(selectMaxProseWidth);
  const t1 = addMargin ? 1 : 0;
  let T;
  if ($[0] === MEMO_CACHE_SENTINEL)
    ((T = e(Box, { minWidth: 2, children: e(Text, { "aria-hidden": !0, dimColor: !0, children: aps }) })),
      ($[0] = T));
  else T = $[0];
  let x;
  if ($[1] === MEMO_CACHE_SENTINEL)
    ((x = r(Text, { dimColor: !0, bold: !0, children: ["recap:", " "] })), ($[1] = x));
  else x = $[1];
  let k;
  if ($[2] !== content)
    ((k = e(Text, { dimColor: !0, italic: !0, children: content })), ($[2] = content), ($[3] = k));
  else k = $[3];
  let b;
  if ($[4] !== k || $[5] !== trailer)
    ((b = r(Text, { children: [x, k, trailer] })), ($[4] = k), ($[5] = trailer), ($[6] = b));
  else b = $[6];
  let E;
  if ($[7] !== f || $[8] !== b)
    ((E = e(Box, { maxWidth: f, children: b })), ($[7] = f), ($[8] = b), ($[9] = E));
  else E = $[9];
  let B;
  if ($[10] !== t1 || $[11] !== E)
    ((B = r(Box, { flexDirection: "row", marginTop: t1, width: "100%", children: [T, E] })),
      ($[10] = t1),
      ($[11] = E),
      ($[12] = B));
  else B = $[12];
  return B;
}
//@ chunk-ah34pb7m.js:193409-193425 fingerprint = _temp4 (1)
var WORKED = "Worked";
//@ chunk-ah34pb7m.js:193425-193486 layout
function pickTurnCompletionVerb(m) {
  let d = (zhe(m) >>> 0) % TURN_COMPLETION_VERBS.length;
  return TURN_COMPLETION_VERBS[d] ?? WORKED;
}
//@ chunk-ah34pb7m.js:193486-193589 layout
function countPendingBackgroundWork(m) {
  let { agents: agents, workflowIds: workflowIds } = collectPendingBackgroundWork(m);
  return { pendingAgents: agents.size, pendingWorkflows: workflowIds.size };
}
//@ chunk-ah34pb7m.js:193589-193752 layout
function listPendingBackgroundAgents(m) {
  return [...collectPendingBackgroundWork(m).agents.values()].map((d) => ({
    id: d.id,
    agentType: d.agentType,
    startTime: d.startTime,
    ...(d.toolUseId !== void 0 && { toolUseId: d.toolUseId }),
  }));
}
//@ chunk-ah34pb7m.js:193752-194144 layout
function collectPendingBackgroundWork({ tasks: tasks, queuedCommands: queuedCommands = [] }) {
  let c = new Map(),
    g = new Set(),
    f = (h) => {
      if (isPanelAgentTask(h) && h.isBackgrounded) c.set(h.id, h);
      else if (h.type === "local_workflow") g.add(h.id);
    };
  for (let h of Object.values(tasks))
    if (h.status === "running" || (isTerminalTaskStatus_2(h.status) && !h.notified)) f(h);
  for (let h of queuedCommands) {
    if (h.mode !== "task-notification" || !$f(h) || h.taskId === void 0) continue;
    let M = tasks[h.taskId];
    if (M) f(M);
  }
  return { agents: c, workflowIds: g };
}
/**
 * 计算回合耗时信息：仍有后台代理/工作流时返回回合时长、待完成数量与后台等待起点；否则从等待起点算到现在。
 */
//@ chunk-ah34pb7m.js:194144-194588 layout
function computeTurnDurationInfo({
  tasks: tasks,
  queuedCommands: queuedCommands = [],
  turnDurationMs: turnDurationMs,
  turnStartTime: turnStartTime,
  now: now,
  backgroundWaitStartTime: backgroundWaitStartTime,
}) {
  let { pendingAgents: pendingAgents, pendingWorkflows: pendingWorkflows } = countPendingBackgroundWork({
    tasks: tasks,
    queuedCommands: queuedCommands,
  });
  if (pendingAgents > 0 || pendingWorkflows > 0)
    return {
      durationMs: turnDurationMs,
      pendingBackgroundAgentCount: pendingAgents > 0 ? pendingAgents : void 0,
      pendingWorkflowCount: pendingWorkflows > 0 ? pendingWorkflows : void 0,
      backgroundWaitStartTime: backgroundWaitStartTime ?? turnStartTime,
    };
  return {
    durationMs: backgroundWaitStartTime !== null ? now - backgroundWaitStartTime : turnDurationMs,
    pendingBackgroundAgentCount: void 0,
    pendingWorkflowCount: void 0,
    backgroundWaitStartTime: null,
  };
}
//@ chunk-ah34pb7m.js:194588-194632 layout
function sumDurationMs(Y, X) {
  return Y + (X.durationMs ?? 0);
}
//@ chunk-ah34pb7m.js:194632-194811 fingerprint = _temp2 (0.851)
function renderStopHookCommandLine(info, idx) {
  return r(
    Text,
    {
      dimColor: !0,
      children: [
        e(Text, { "aria-hidden": !0, children: "     \u23BF " }),
        info.command === "prompt" ? `prompt: ${info.promptText || ""}` : info.command,
        "",
      ],
    },
    `cmd-${idx}`,
  );
}
//@ chunk-ah34pb7m.js:194811-194993 fingerprint = _temp3 (0.718)
function renderStopHookCommandLineCompact(info_0, idx_0) {
  return r(
    Text,
    {
      dimColor: !0,
      children: [
        e(Text, { "aria-hidden": !0, children: "\u23BF \xA0" }),
        info_0.command === "prompt" ? `prompt: ${info_0.promptText || ""}` : info_0.command,
        "",
      ],
    },
    `cmd-${idx_0}`,
  );
}
//@ chunk-ah34pb7m.js:194993-195139 layout
function renderStopHookFeedbackLine(ae, pe) {
  return r(
    Text,
    {
      children: [
        e(Text, { "aria-hidden": !0, dimColor: !0, children: "\u23BF \xA0" }),
        "Stop hook feedback: ",
        ae,
      ],
    },
    `feedback-${pe}`,
  );
}
//@ chunk-ah34pb7m.js:195139-195248 placement = _temp0 (0.683)
function agentRef(a) {
  return { id: a.id, agentType: a.agentType, ...(a.toolUseId !== void 0 && { tool_use_id: a.toolUseId }) };
}
//@ chunk-ah34pb7m.js:195248-195420 layout
function getBackgroundTasksPillLabel(we) {
  let $e = isCoordinatorPanelActive();
  let filtered = Object.values(we.tasks).filter(
    (De) => shouldHideTasksFooter(De) && !($e && isIdleTeammateTask(De)),
  );
  let Pe = bWe(we.remoteBackgroundTasks);
  return filtered.length + Pe > 0 ? getPillLabelWithExtra(filtered, Pe) : null;
}
//@ chunk-ah34pb7m.js:195420-195458 layout
function isLivelyAvalancheEnabled() {
  return readFlagWithOverride(TENGU_LIVELY_AVALANCHE, { safe: !0 });
}
//@ chunk-ah34pb7m.js:195458-195478 layout
var ZC = null,
  pm = null;
/**
 * 系统消息分派：turn_duration（"Worked for …"、预算/后台 agent）、memory_saved/account_memory_saved、away_summary、agents_killed、stop_hook_summary（"Ran N hooks"）、bridge_status（"/remote-control is active"）、api_error、model_fallback/model_refusal_*、permission_denied/permission_retry、scheduled_task_fire、cloud_session_status 等；其余按 level 着色显示文本。
 */
//@ chunk-ah34pb7m.js:195478-200180 fingerprint = SystemTextMessage (0.561)
function SystemTextMessage(t0) {
  let $ = w(65),
    { message: message, addMargin: addMargin, verbose: verbose, isTranscriptMode: isTranscriptMode } = t0;
  if (message.subtype === "turn_duration") {
    const h = verbose || isTranscriptMode === !0;
    let T;
    if ($[0] !== addMargin || $[1] !== message || $[2] !== h)
      ((T = e(TurnDurationRow, { message: message, addMargin: addMargin, isExpanded: h })),
        ($[0] = addMargin),
        ($[1] = message),
        ($[2] = h),
        ($[3] = T));
    else T = $[3];
    return T;
  }
  if (message.subtype === "memory_saved") {
    const h = verbose || !!isTranscriptMode;
    let T;
    if ($[4] !== addMargin || $[5] !== message || $[6] !== h)
      ((T = e(MemorySavedMessage, { message: message, addMargin: addMargin, verbose: h })),
        ($[4] = addMargin),
        ($[5] = message),
        ($[6] = h),
        ($[7] = T));
    else T = $[7];
    return T;
  }
  if (message.subtype === "account_memory_saved") {
    let h;
    if ($[8] !== addMargin || $[9] !== message)
      ((h = pm === null ? null : e(pm.AccountMemorySavedMessage, { message: message, addMargin: addMargin })),
        ($[8] = addMargin),
        ($[9] = message),
        ($[10] = h));
    else h = $[10];
    return h;
  }
  if (message.subtype === "away_summary") {
    let h;
    if ($[11] !== addMargin || $[12] !== message.content)
      ((h = e(ThinkingMessage, { content: message.content, addMargin: addMargin })),
        ($[11] = addMargin),
        ($[12] = message.content),
        ($[13] = h));
    else h = $[13];
    return h;
  }
  if (message.subtype === "agents_killed") {
    const h = addMargin ? 1 : 0;
    let T, x;
    if ($[14] === MEMO_CACHE_SENTINEL)
      ((T = e(Box, {
        minWidth: 2,
        children: e(Text, { "aria-hidden": !0, color: "error", children: BLACK_CIRCLE }),
      })),
        (x = e(Text, { dimColor: !0, children: "All background agents stopped" })),
        ($[14] = T),
        ($[15] = x));
    else ((T = $[14]), (x = $[15]));
    let k;
    if ($[16] !== h)
      ((k = r(Box, { flexDirection: "row", marginTop: h, width: "100%", children: [T, x] })),
        ($[16] = h),
        ($[17] = k));
    else k = $[17];
    return k;
  }
  if (message.subtype === "thinking") {
    return null;
  }
  if (message.subtype === "model_refusal_no_fallback") {
    return null;
  }
  if (isRefusalFallbackEnabled() && message.subtype === "model_refusal_fallback") {
    const h = addMargin ? 1 : 0;
    let T;
    if ($[18] === MEMO_CACHE_SENTINEL)
      ((T = e(Box, {
        minWidth: 2,
        children: e(Text, { "aria-label": "warning:", color: "warning", children: BLACK_CIRCLE }),
      })),
        ($[18] = T));
    else T = $[18];
    let x;
    if ($[19] !== message.content)
      ((x = r(Box, {
        flexDirection: "row",
        width: "100%",
        children: [T, e(LinkifiedText, { color: "warning", bold: !0, children: message.content })],
      })),
        ($[19] = message.content),
        ($[20] = x));
    else x = $[20];
    let k;
    if ($[21] !== message.scope)
      ((k =
        message.scope !== "local" &&
        r(Text, {
          dimColor: !0,
          children: [
            e(Text, { "aria-hidden": !0, children: "  \u23BF  " }),
            "Tip: You can configure model switch behavior in /config",
          ],
        })),
        ($[21] = message.scope),
        ($[22] = k));
    else k = $[22];
    let b;
    if ($[23] !== h || $[24] !== x || $[25] !== k)
      ((b = r(Box, { flexDirection: "column", marginTop: h, width: "100%", children: [x, k, !1] })),
        ($[23] = h),
        ($[24] = x),
        ($[25] = k),
        ($[26] = b));
    else b = $[26];
    return b;
  }
  if (message.subtype === "model_fallback") {
    let E = message.trigger === "model_not_found" || message.trigger === "permission_denied";
    const h = addMargin ? 1 : 0;
    let T;
    if ($[27] === MEMO_CACHE_SENTINEL)
      ((T = e(Box, {
        minWidth: 2,
        children: e(Text, { "aria-label": "warning:", color: "warning", children: BLACK_CIRCLE }),
      })),
        ($[27] = T));
    else T = $[27];
    let x;
    if ($[28] !== E || $[29] !== message.content)
      ((x = e(Text, { color: "warning", bold: E, wrap: "wrap", children: message.content })),
        ($[28] = E),
        ($[29] = message.content),
        ($[30] = x));
    else x = $[30];
    let k;
    if ($[31] !== h || $[32] !== x)
      ((k = r(Box, { flexDirection: "row", marginTop: h, width: "100%", children: [T, x] })),
        ($[31] = h),
        ($[32] = x),
        ($[33] = k));
    else k = $[33];
    return k;
  }
  if (message.subtype === "bridge_status") {
    let h;
    if ($[34] !== addMargin || $[35] !== message)
      ((h = e(BridgeStatusMessage, { message: message, addMargin: addMargin })),
        ($[34] = addMargin),
        ($[35] = message),
        ($[36] = h));
    else h = $[36];
    return h;
  }
  if (message.subtype === "cloud_session_status") {
    let h;
    if ($[37] !== addMargin || $[38] !== message)
      ((h = e(RemoteSessionLinkMessage, { message: message, addMargin: addMargin })),
        ($[37] = addMargin),
        ($[38] = message),
        ($[39] = h));
    else h = $[39];
    return h;
  }
  if (message.subtype === "scheduled_task_fire") {
    const h = addMargin ? 1 : 0;
    let T;
    if ($[40] === MEMO_CACHE_SENTINEL)
      ((T = r(Text, { "aria-hidden": !0, children: [TEARDROP_ASTERISK, " "] })), ($[40] = T));
    else T = $[40];
    let x;
    if ($[41] !== message.content)
      ((x = r(Text, { dimColor: !0, children: [T, message.content] })),
        ($[41] = message.content),
        ($[42] = x));
    else x = $[42];
    let k;
    if ($[43] !== h || $[44] !== x)
      ((k = e(Box, { marginTop: h, width: "100%", children: x })), ($[43] = h), ($[44] = x), ($[45] = k));
    else k = $[45];
    return k;
  }
  if (message.subtype === "permission_retry") {
    let commands = message.commands;
    let content = message.content;
    let h, T;
    if (
      $[46] !== addMargin ||
      $[47] !== commands ||
      $[48] !== content ||
      $[49] !== message.heardAtNextPrompt
    ) {
      T = EARLY_RETURN_SENTINEL;
      K: {
        let N = getValidStringArray(commands);
        let joined = N.join(", ");
        let U = typeof content === "string" ? content : "";
        if (joined.length === 0 && U.length === 0) {
          T = null;
          break K;
        }
        let x;
        if ($[52] === MEMO_CACHE_SENTINEL)
          ((x = r(Text, { "aria-hidden": !0, dimColor: !0, children: [TEARDROP_ASTERISK, " "] })),
            ($[52] = x));
        else x = $[52];
        h = r(Box, {
          marginTop: addMargin ? 1 : 0,
          width: "100%",
          children: [
            x,
            joined.length > 0
              ? r(Text, {
                  children: [
                    permissionRetryText(message.heardAtNextPrompt === !0),
                    " ",
                    e(Text, { bold: !0, children: joined }),
                    r(Text, { dimColor: !0, children: [". ", tjt(N.length)] }),
                  ],
                })
              : e(Text, { children: U }),
          ],
        });
      }
      (($[46] = addMargin),
        ($[47] = commands),
        ($[48] = content),
        ($[49] = message.heardAtNextPrompt),
        ($[50] = h),
        ($[51] = T));
    } else ((h = $[50]), (T = $[51]));
    if (T !== EARLY_RETURN_SENTINEL) return T;
    return h;
  }
  if (message.subtype === "placed") {
    return null;
  }
  if (message.subtype !== "stop_hook_summary" && !verbose && message.level === "info") {
    return null;
  }
  if (message.subtype === "api_error") {
    return null;
  }
  if (message.subtype === "stop_hook_summary") {
    let h;
    if ($[53] !== addMargin || $[54] !== isTranscriptMode || $[55] !== message || $[56] !== verbose)
      ((h = e(StopHookSummaryMessage, {
        message: message,
        addMargin: addMargin,
        verbose: verbose,
        isTranscriptMode: isTranscriptMode,
      })),
        ($[53] = addMargin),
        ($[54] = isTranscriptMode),
        ($[55] = message),
        ($[56] = verbose),
        ($[57] = h));
    else h = $[57];
    return h;
  }
  let content = message.content;
  if (typeof content !== "string") {
    return null;
  }
  const h = message.level !== "info",
    T = message.level === "warning" ? "warning" : message.level === "notice" ? "inactive" : void 0,
    x = message.subtype === "informational" ? message.highlight : void 0,
    k = message.level === "info";
  let b;
  if ($[58] !== addMargin || $[59] !== content || $[60] !== h || $[61] !== T || $[62] !== x || $[63] !== k)
    ((b = e(Box, {
      flexDirection: "row",
      width: "100%",
      children: e(SystemTextMessageInner, {
        content: content,
        addMargin: addMargin,
        dot: h,
        color: T,
        highlight: x,
        dimColor: k,
      }),
    })),
      ($[58] = addMargin),
      ($[59] = content),
      ($[60] = h),
      ($[61] = T),
      ($[62] = x),
      ($[63] = k),
      ($[64] = b));
  else b = $[64];
  return b;
}
//@ chunk-ah34pb7m.js:200180-201377 fingerprint = StopHookSummaryMessage (0.765)
function StopHookSummaryMessage(t0) {
  let $ = w(2),
    { message: message, addMargin: addMargin, verbose: verbose, isTranscriptMode: isTranscriptMode } = t0,
    {
      hookCount: hookCount,
      hookInfos: hookInfos,
      hookErrors: hookErrors,
      hookAdditionalContext: hookAdditionalContext,
      preventedContinuation: preventedContinuation,
      stopReason: stopReason,
      hookLabel: hookLabel,
      totalDurationMs: totalDurationMs,
    } = normalizeHookSummary(message),
    L = hookAdditionalContext === void 0 ? [] : hookAdditionalContext,
    { columns: columns } = useTerminalSize();
  if (
    (totalDurationMs ?? hookInfos.reduce(sumDurationMs, 0),
    hookErrors.length === 0 && L.length === 0 && !preventedContinuation && !hookLabel)
  ) {
    return null;
  }
  if (hookLabel) {
    let U;
    if ($[0] === MEMO_CACHE_SENTINEL)
      ((U = e(Text, { "aria-hidden": !0, children: "  \u23BF  " })), ($[0] = U));
    else U = $[0];
    return r(Box, {
      flexDirection: "column",
      width: "100%",
      children: [
        r(Text, {
          dimColor: !0,
          children: [U, "Ran ", hookCount, " ", hookLabel, " ", hookCount === 1 ? "hook" : "hooks", ""],
        }),
        isTranscriptMode && hookInfos.map(renderStopHookCommandLine),
      ],
    });
  }
  let U;
  if ($[1] === MEMO_CACHE_SENTINEL)
    ((U = e(Box, { minWidth: 2, children: e(Text, { "aria-hidden": !0, children: BLACK_CIRCLE }) })),
      ($[1] = U));
  else U = $[1];
  return r(Box, {
    flexDirection: "row",
    marginTop: addMargin ? 1 : 0,
    width: "100%",
    children: [
      U,
      r(Box, {
        flexDirection: "column",
        width: columns - 10,
        children: [
          r(Text, {
            children: [
              "Ran ",
              e(Text, { bold: !0, children: hookCount }),
              " ",
              hookLabel ?? "stop",
              " ",
              hookCount === 1 ? "hook" : "hooks",
              "",
              !verbose && hookInfos.length > 0 && r(Fragment, { children: [" ", e(CtrlOToExpand, {})] }),
            ],
          }),
          verbose && hookInfos.length > 0 && hookInfos.map(renderStopHookCommandLineCompact),
          preventedContinuation &&
            stopReason &&
            r(Text, {
              children: [e(Text, { "aria-hidden": !0, dimColor: !0, children: "\u23BF \xA0" }), stopReason],
            }),
          hookErrors.length > 0 &&
            hookErrors.map((err, idx_1) =>
              r(
                Text,
                {
                  children: [
                    e(Text, { "aria-hidden": !0, dimColor: !0, children: "\u23BF \xA0" }),
                    hookLabel ?? "Stop",
                    " hook error: ",
                    err,
                  ],
                },
                idx_1,
              ),
            ),
          L.length > 0 && L.map(renderStopHookFeedbackLine),
        ],
      }),
    ],
  });
}
//@ chunk-ah34pb7m.js:201377-202330 fingerprint = SystemTextMessageInner (0.721)
function SystemTextMessageInner(t0) {
  let $ = w(19),
    {
      content: content,
      addMargin: addMargin,
      dot: dot,
      color: color,
      dimColor: dimColor,
      highlight: highlight,
    } = t0,
    { columns: columns } = useTerminalSize(),
    trimmed = content.trim(),
    [k, b] = useShimmerOffset(highlight ? trimmed.length : 0),
    [E] = trimmed.split(`
`);
  E === void 0 ? "" : E;
  const t1 = addMargin ? 1 : 0;
  let N;
  if ($[0] !== color || $[1] !== dimColor || $[2] !== dot || $[3] !== highlight?.color)
    ((N =
      dot &&
      e(Box, {
        minWidth: 2,
        children: e(Text, {
          "aria-hidden": !0,
          color: highlight?.color ?? color,
          dimColor: dimColor,
          children: BLACK_CIRCLE,
        }),
      })),
      ($[0] = color),
      ($[1] = dimColor),
      ($[2] = dot),
      ($[3] = highlight?.color),
      ($[4] = N));
  else N = $[4];
  const t3 = columns - 10;
  let U;
  if ($[5] !== color || $[6] !== dimColor || $[7] !== b || $[8] !== highlight || $[9] !== trimmed)
    ((U = highlight
      ? e(ShimmerText, {
          text: trimmed,
          color: highlight.color,
          shimmerColor: highlight.shimmerColor,
          glimmerIndex: b,
        })
      : e(Text, { color: color, dimColor: dimColor, wrap: "wrap", children: trimmed })),
      ($[5] = color),
      ($[6] = dimColor),
      ($[7] = b),
      ($[8] = highlight),
      ($[9] = trimmed),
      ($[10] = U));
  else U = $[10];
  let K;
  if ($[11] !== t3 || $[12] !== U)
    ((K = e(Box, { flexDirection: "column", width: t3, children: U })),
      ($[11] = t3),
      ($[12] = U),
      ($[13] = K));
  else K = $[13];
  let V;
  if ($[14] !== k || $[15] !== t1 || $[16] !== N || $[17] !== K)
    ((V = r(Box, { ref: k, flexDirection: "row", marginTop: t1, width: "100%", children: [N, K] })),
      ($[14] = k),
      ($[15] = t1),
      ($[16] = N),
      ($[17] = K),
      ($[18] = V));
  else V = $[18];
  return V;
}
//@ chunk-ah34pb7m.js:202330-204046 layout
function TurnDurationRow(m) {
  let $ = w(21),
    { message: message, addMargin: addMargin, isExpanded: isExpanded } = m,
    f = hasStringUuid(message) ? message.uuid : "",
    M;
  if ($[0] !== f) ((M = pickTurnCompletionVerb(f)), ($[0] = f), ($[1] = M));
  else M = $[1];
  let T = M,
    x = Cr(),
    k = Nu(),
    b;
  if (
    $[2] !== message.briefHiddenCount ||
    $[3] !== message.budgetLimit ||
    $[4] !== message.pendingBackgroundAgentCount ||
    $[5] !== message.pendingWorkflowCount ||
    $[6] !== message.timestamp ||
    $[7] !== k ||
    $[8] !== x
  )
    ((b = () => {
      let E = { tasks: x.getState().tasks, queuedCommands: k.getCommandQueue() };
      let B = countPendingBackgroundWork(E);
      let L = B.pendingAgents > 0;
      let N = B.pendingWorkflows > 0;
      let W = resolveSetting("showTurnDuration", !0).value;
      let U = L ? (message.pendingBackgroundAgentCount ?? 0) : 0;
      let K = N ? (message.pendingWorkflowCount ?? 0) : 0;
      let parse = Date.parse(message.timestamp);
      let filtered = (U > 0 ? listPendingBackgroundAgents(E) : []).filter((Y) => Y.startTime <= parse);
      let z =
        W &&
        (U > 0 || K > 0) &&
        message.budgetLimit === void 0 &&
        (message.briefHiddenCount ?? 0) === 0 &&
        filtered.length === U;
      return {
        hasPendingAgents: L,
        hasPendingWorkflows: N,
        showTurnDuration: W,
        doneAt: formatBriefTimestamp(message.timestamp),
        waitingFor: z ? { agents: filtered.map(agentRef), workflows: K } : void 0,
      };
    }),
      ($[2] = message.briefHiddenCount),
      ($[3] = message.budgetLimit),
      ($[4] = message.pendingBackgroundAgentCount),
      ($[5] = message.pendingWorkflowCount),
      ($[6] = message.timestamp),
      ($[7] = k),
      ($[8] = x),
      ($[9] = b));
  else b = $[9];
  let [ee] = y(b),
    le,
    ge;
  if (
    $[10] !== isExpanded ||
    $[11] !== message.durationMs ||
    $[12] !== f ||
    $[13] !== ee.waitingFor ||
    $[14] !== T
  )
    ((le = () => ({
      requestId: f,
      props: {
        word: T,
        durationMs: message.durationMs,
        isExpanded: isExpanded,
        ...(ee.waitingFor !== void 0 && { waitingFor: ee.waitingFor }),
      },
    })),
      (ge = [T, f, message.durationMs, isExpanded, ee.waitingFor]),
      ($[10] = isExpanded),
      ($[11] = message.durationMs),
      ($[12] = f),
      ($[13] = ee.waitingFor),
      ($[14] = T),
      ($[15] = le),
      ($[16] = ge));
  else ((le = $[15]), (ge = $[16]));
  let useRenderInput = actionKeysNamespace.useRenderInput("TurnDuration", le, ge),
    pe;
  if ($[17] !== addMargin || $[18] !== message || $[19] !== ee)
    ((pe = (te) =>
      e(TurnDurationMessage, {
        message:
          te.props.durationMs === message.durationMs
            ? message
            : { ...message, durationMs: te.props.durationMs },
        addMargin: addMargin,
        verb: te.props.word,
        snapshot: ee,
      })),
      ($[17] = addMargin),
      ($[18] = message),
      ($[19] = ee),
      ($[20] = pe));
  else pe = $[20];
  return actionKeysNamespace.useRenderHook(useRenderInput, pe);
}
/**
 * 回合耗时消息："✻ <随机完成动词> for Xm Ys"，附带 token 用量、提醒（nudge）计数与仍在后台运行的 agent/工作流数。
 */
//@ chunk-ah34pb7m.js:204046-206407 fingerprint = TurnDurationMessage (0.466)
function TurnDurationMessage(t0) {
  let $ = w(33),
    { message: message, addMargin: addMargin, verb: verb, snapshot: snapshot } = t0,
    {
      hasPendingAgents: hasPendingAgents,
      hasPendingWorkflows: hasPendingWorkflows,
      showTurnDuration: showTurnDuration,
      doneAt: doneAt,
    } = snapshot,
    k = useAppState(getBackgroundTasksPillLabel),
    E;
  if ($[0] !== message.durationMs)
    ((E = formatDuration(message.durationMs)), ($[0] = message.durationMs), ($[1] = E));
  else E = $[1];
  let B = E,
    hasBudget = message.budgetLimit !== void 0,
    N;
  W: {
    if (!hasBudget) {
      N = null;
      break W;
    }
    let tokens = message.budgetTokens;
    let limit = message.budgetLimit;
    let V;
    if ($[2] !== limit || $[3] !== tokens)
      ((V =
        tokens >= limit
          ? r(Text, {
              children: [
                formatNumber(tokens),
                " used (",
                formatNumber(limit),
                " min",
                r(Text, { "aria-hidden": !0, children: [" ", re.tick] }),
                ")",
              ],
            })
          : `${formatNumber(tokens)} / ${formatNumber(limit)} (${Math.round((tokens / limit) * 100)}%)`),
        ($[2] = limit),
        ($[3] = tokens),
        ($[4] = V));
    else V = $[4];
    let Y = V;
    let X =
      message.budgetNudges > 0
        ? ` \xB7 ${message.budgetNudges} ${message.budgetNudges === 1 ? "nudge" : "nudges"}`
        : "";
    const z = showTurnDuration ? " \xB7 " : "";
    let ee;
    if ($[5] !== X || $[6] !== z || $[7] !== Y)
      ((ee = r(Fragment, { children: [z, Y, X] })), ($[5] = X), ($[6] = z), ($[7] = Y), ($[8] = ee));
    else ee = $[8];
    N = ee;
  }
  let le = N,
    ge = message.briefHiddenCount ?? 0,
    ae =
      ge > 0
        ? `${showTurnDuration || hasBudget ? " \xB7 " : ""}${ge} ${ge === 1 ? "message" : "messages"} hidden (/focus to show)`
        : "",
    pe = !showTurnDuration && !hasBudget && !ae,
    te = hasPendingAgents ? (message.pendingBackgroundAgentCount ?? 0) : 0,
    de = hasPendingWorkflows ? (message.pendingWorkflowCount ?? 0) : 0,
    ue = te > 0 || de > 0,
    V;
  if ($[9] !== te)
    ((V =
      te > 0 &&
      r(Text, {
        children: [
          " ",
          e(Text, { bold: !0, dimColor: !0, children: te }),
          ` background ${te === 1 ? "agent" : "agents"}`,
        ],
      })),
      ($[9] = te),
      ($[10] = V));
  else V = $[10];
  const z = te > 0 && de > 0 && " and";
  let ee;
  if ($[11] !== de)
    ((ee =
      de > 0 &&
      r(Text, {
        children: [
          " ",
          e(Text, { bold: !0, dimColor: !0, children: de }),
          ` ${de === 1 ? "dynamic workflow" : "dynamic workflows"}`,
        ],
      })),
      ($[11] = de),
      ($[12] = ee));
  else ee = $[12];
  let J;
  if ($[13] !== V || $[14] !== z || $[15] !== ee)
    ((J = r(Text, { dimColor: !0, children: ["Waiting for", V, z, ee, " to finish"] })),
      ($[13] = V),
      ($[14] = z),
      ($[15] = ee),
      ($[16] = J));
  else J = $[16];
  let se = J,
    ye = showTurnDuration && ue,
    Te;
  if (
    $[17] !== addMargin ||
    $[18] !== k ||
    $[19] !== le ||
    $[20] !== doneAt ||
    $[21] !== B ||
    $[22] !== ae ||
    $[23] !== pe ||
    $[24] !== ue ||
    $[25] !== showTurnDuration ||
    $[26] !== ye ||
    $[27] !== verb ||
    $[28] !== se
  )
    ((Te = pe
      ? null
      : r(Box, {
          flexDirection: "row",
          marginTop: addMargin ? 1 : 0,
          width: "100%",
          children: [
            e(Box, {
              minWidth: 2,
              children: e(Text, { "aria-hidden": !0, dimColor: !0, children: TEARDROP_ASTERISK }),
            }),
            r(Text, {
              children: [
                showTurnDuration &&
                  (ue
                    ? se
                    : e(Text, {
                        dimColor: !0,
                        children: `${verb} for ${B}${doneAt ? ` \xB7 done ${doneAt}` : ""}`,
                      })),
                le && e(Text, { dimColor: !0, children: le }),
                ae && e(Text, { dimColor: !0, children: ae }),
                !ye && k && e(Text, { dimColor: !0, children: ` \xB7 ${k} still running` }),
              ],
            }),
          ],
        })),
      ($[17] = addMargin),
      ($[18] = k),
      ($[19] = le),
      ($[20] = doneAt),
      ($[21] = B),
      ($[22] = ae),
      ($[23] = pe),
      ($[24] = ue),
      ($[25] = showTurnDuration),
      ($[26] = ye),
      ($[27] = verb),
      ($[28] = se),
      ($[29] = Te));
  else Te = $[29];
  let Me = Te,
    [be, ve] = a5(Me),
    Ue;
  if ($[30] !== ve || $[31] !== be)
    ((Ue = e(Box, { ref: be, flexDirection: "column", width: "100%", children: ve })),
      ($[30] = ve),
      ($[31] = be),
      ($[32] = Ue));
  else Ue = $[32];
  return Ue;
}
//@ chunk-ah34pb7m.js:206407-206439 layout
var TENGU_LIVELY_AVALANCHE = "tengu_lively_avalanche";
//@ chunk-ah34pb7m.js:206439-207625 fingerprint = MemorySavedMessage (0.642)
function MemorySavedMessage(t0) {
  let $ = w(18),
    { message: message, addMargin: addMargin, verbose: verbose } = t0,
    f = getValidStringArray(message.writtenPaths),
    M;
  if ($[0] !== message) ((M = getMemorySavedVerb(message)), ($[0] = message), ($[1] = M));
  else M = $[1];
  let T = M,
    x = renderWithForceUpdate(isLivelyAvalancheEnabled),
    k = x ? getAutoMemPathOrNull() : null,
    b;
  if ($[2] === MEMO_CACHE_SENTINEL) ((b = getPlatform()), ($[2] = b));
  else b = $[2];
  let E = b,
    B = E !== "windows" && E !== "wsl",
    L;
  if ($[3] !== message) ((L = teamMemSavedPart(message)), ($[3] = message), ($[4] = L));
  else L = $[4];
  let N = L,
    privateCount = f.length - (N?.count ?? 0),
    U;
  if ($[5] === MEMO_CACHE_SENTINEL) ((U = ZC?.localMemoryQualifier() ?? ""), ($[5] = U));
  else U = $[5];
  let K = U;
  const V = privateCount > 0 ? `${privateCount} ${K}${privateCount === 1 ? "memory" : "memories"}` : null,
    t3 = N?.segment;
  let X;
  if ($[6] !== V || $[7] !== t3) ((X = [V, t3].filter(Boolean)), ($[6] = V), ($[7] = t3), ($[8] = X));
  else X = $[8];
  let z = X;
  const ee = Box,
    le = "column",
    ge = addMargin ? 1 : 0;
  let ae;
  if ($[9] === MEMO_CACHE_SENTINEL)
    ((ae = e(Box, {
      minWidth: 2,
      children: e(Text, { "aria-hidden": !0, dimColor: !0, children: BLACK_CIRCLE }),
    })),
      ($[9] = ae));
  else ae = $[9];
  const t8 = z.join(" \xB7 ");
  let te;
  if ($[10] !== t8 || $[11] !== T)
    ((te = r(Box, { flexDirection: "row", children: [ae, r(Text, { children: [T, " ", t8] })] })),
      ($[10] = t8),
      ($[11] = T),
      ($[12] = te));
  else te = $[12];
  const ue =
    verbose &&
    f.map((de) => {
      if (!x) {
        return e(MemoryFileRow, { path: de }, de);
      }
      return B && k !== null && isAllowedAutoMemWritePath(de, k)
        ? e(MemoryFileRow, { path: normalize(de) }, de)
        : e(MemoryFilePath, { path: de }, de);
    });
  let J;
  if ($[13] !== ee || $[14] !== te || $[15] !== ue || $[16] !== ge)
    ((J = r(ee, { flexDirection: le, marginTop: ge, children: [te, ue] })),
      ($[13] = ee),
      ($[14] = te),
      ($[15] = ue),
      ($[16] = ge),
      ($[17] = J));
  else J = $[17];
  return J;
}
//@ chunk-ah34pb7m.js:207625-207996 file-local
function MemoryFilePath(p) {
  let $ = w(12),
    { path: path } = p,
    g,
    f,
    h,
    M;
  if ($[0] !== path) {
    let T = basename_3(path);
    f = MessageResponse;
    g = Text;
    h = !0;
    M = hasControlChars(T) ? HIDDEN_PATH_PLACEHOLDER : T;
    (($[0] = path), ($[1] = g), ($[2] = f), ($[3] = h), ($[4] = M));
  } else ((g = $[1]), (f = $[2]), (h = $[3]), (M = $[4]));
  let x;
  if ($[5] !== g || $[6] !== h || $[7] !== M)
    ((x = e(g, { dimColor: h, children: M })), ($[5] = g), ($[6] = h), ($[7] = M), ($[8] = x));
  else x = $[8];
  let k;
  if ($[9] !== f || $[10] !== x) ((k = e(f, { children: x })), ($[9] = f), ($[10] = x), ($[11] = k));
  else k = $[11];
  return k;
}
//@ chunk-ah34pb7m.js:207996-208617 fingerprint = MemoryFileRow (0.734)
function MemoryFileRow(t0) {
  let $ = w(16),
    { path: path } = t0,
    [c, g] = y(!1),
    h;
  if ($[0] !== path) ((h = () => void openPath(path)), ($[0] = path), ($[1] = h));
  else h = $[1];
  let M, T;
  if ($[2] === MEMO_CACHE_SENTINEL) ((M = () => g(!0)), (T = () => g(!1)), ($[2] = M), ($[3] = T));
  else ((M = $[2]), (T = $[3]));
  const t4 = !c;
  let k;
  if ($[4] !== path) ((k = basename_3(path)), ($[4] = path), ($[5] = k));
  else k = $[5];
  let b;
  if ($[6] !== path || $[7] !== k)
    ((b = e(FilePathLink, { filePath: path, children: k })), ($[6] = path), ($[7] = k), ($[8] = b));
  else b = $[8];
  let E;
  if ($[9] !== c || $[10] !== t4 || $[11] !== b)
    ((E = e(Text, { dimColor: t4, underline: c, children: b })),
      ($[9] = c),
      ($[10] = t4),
      ($[11] = b),
      ($[12] = E));
  else E = $[12];
  let B;
  if ($[13] !== h || $[14] !== E)
    ((B = e(MessageResponse, {
      children: e(Box, { onClick: h, onMouseEnter: M, onMouseLeave: T, children: E }),
    })),
      ($[13] = h),
      ($[14] = E),
      ($[15] = B));
  else B = $[15];
  return B;
}
//@ chunk-ah34pb7m.js:208617-209574 fingerprint = BridgeStatusMessage (0.355)
function BridgeStatusMessage(t0) {
  let $ = w(13),
    { message: message, addMargin: addMargin } = t0,
    f;
  if ($[0] !== message)
    ((f = (h) =>
      h.replBridgeConnected && !h.replBridgeOutboundOnly && h.replBridgeSessionUrl === message.url),
      ($[0] = message),
      ($[1] = f));
  else f = $[1];
  if (!useAppState(f)) {
    return null;
  }
  const t1 = addMargin ? 1 : 0;
  let x;
  if ($[2] === MEMO_CACHE_SENTINEL) ((x = e(Box, { minWidth: 2 })), ($[2] = x));
  else x = $[2];
  let k;
  if ($[3] !== message.url)
    ((k = r(Text, {
      children: [
        "/remote-control is active",
        r(Text, {
          dimColor: !0,
          children: [
            " \xB7 Continue here, on your phone, or at ",
            e(Link, { url: message.url, children: message.url }),
          ],
        }),
      ],
    })),
      ($[3] = message.url),
      ($[4] = k));
  else k = $[4];
  let b;
  if ($[5] !== message.upgradeNudge)
    ((b =
      message.upgradeNudge &&
      r(Box, {
        flexDirection: "row",
        children: [
          e(Text, { "aria-hidden": !0, dimColor: !0, children: "\u23BF  " }),
          e(Text, { dimColor: !0, children: message.upgradeNudge }),
        ],
      })),
      ($[5] = message.upgradeNudge),
      ($[6] = b));
  else b = $[6];
  let E;
  if ($[7] !== k || $[8] !== b)
    ((E = r(Box, { flexDirection: "column", children: [k, b] })), ($[7] = k), ($[8] = b), ($[9] = E));
  else E = $[9];
  let B;
  if ($[10] !== t1 || $[11] !== E)
    ((B = r(Box, { flexDirection: "row", marginTop: t1, width: 999, children: [x, E] })),
      ($[10] = t1),
      ($[11] = E),
      ($[12] = B));
  else B = $[12];
  return B;
}
/**
 * 云会话横幅文字（创建或附着）与"在此或在…编码"的连接文字。
 */
//@ chunk-e4xept39.js:231-335 placement
var CLOUD_SESSION_BANNERS = { create: "Cloud session active", attach: "Attached to cloud session" },
  CODE_HERE_OR_AT = " \xB7 code here or at ";
/**
 * 把工具耗时列表编码为 "tool=ms;tool=ms"（数量与总长有上限），用于请求头。
 */
//@ chunk-e6aww6q8.js:1538140-1538417 fingerprint = _temp (0.705)
function formatToolDurationsHeader(e) {
  let n = [],
    r = 0;
  for (let { toolName: toolName, durationMs: durationMs } of e) {
    if (n.length >= O4o) break;
    if (!Number.isFinite(durationMs)) continue;
    let max = Math.max(0, Math.round(durationMs)),
      S = `${L4o(toolName)}=${max}`,
      w = n.length > 0 ? 1 : 0;
    if (r + w + S.length > I4o) break;
    ((r += w + S.length), n.push(S));
  }
  return n.length > 0 ? n.join(";") : void 0;
}

export {
  countPendingBackgroundWork,
  ThinkingMessage,
  computeTurnDurationInfo,
  formatToolDurationsHeader,
  CLOUD_SESSION_BANNERS,
  CODE_HERE_OR_AT,
  SystemTextMessage,
};
