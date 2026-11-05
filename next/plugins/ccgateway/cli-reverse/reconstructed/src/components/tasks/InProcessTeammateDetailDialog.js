/**
 * components/tasks/InProcessTeammateDetailDialog.tsx
 *
 * 进程内队友详情：状态、当前活动、消息。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/components/tasks/InProcessTeammateDetailDialog.tsx
 * pieces: chunk-czq1j3j2.js (3)
 * attribution: placement 1, affinity 1, fingerprint 1
 */
import { init_react_production } from "../../../vendor/react/cjs/react.production.js";
import { useMemoCache } from "../../../vendor/react/compiler-runtime.js";
import { useTheme } from "../design-system/ThemeProvider.js";
import { useAppState } from "../../state/AppState.js";
import { MEMO_CACHE_SENTINEL } from "../../../runtime/bun-runtime.js";
import { getTools } from "../../tools.js";
import { getEmptyToolPermissionContext } from "../../Tool.js";
import { useElapsedTicker, useConfirmationKeys } from "../ConfirmationPrompt.js";
import { describeTeammateActivity, TaskDetailFooterHints } from "./taskStatusUtils.js";
import { agentLabel } from "../../utils/transcriptDiagnostics.js";
import { truncateToWidth, formatNumber } from "../../utils/format.js";
import { toInkColor } from "../../utils/ink.js";
import {
  jsxProd_default_2,
  Fragment,
  jsxProd_default,
} from "../../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { Text, Box } from "../../ink/components/Text.js";
import { KeyboardShortcutHint } from "../design-system/KeyboardShortcutHint.js";
import { renderToolActivity } from "./renderToolActivity.js";
import { Dialog } from "../design-system/Dialog.js";
import { FocusColumn } from "../design-system/FocusColumn.js";
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-czq1j3j2.js:702752-702756 placement
// deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-czq1j3j2.js:702752", () => {
  init_react_production();
});
//@ chunk-czq1j3j2.js:724966-725023 affinity
function selectAgentDefinitionsActiveAgents_2(appState) {
  return appState.agentDefinitions.activeAgents;
}
//@ chunk-czq1j3j2.js:725023-729338 fingerprint (2.1.88 match: InProcessTeammateDetailDialog, 0.708)
/**
 * 进程内队友详情：状态（运行/完成/被杀）、当前活动、token、最近消息与提示。
 */
function InProcessTeammateDetailDialog(props) {
  let $ = useMemoCache(71);
  let { teammate, onDone, onKill, onBack, onForeground } = props;
  let [theme] = useTheme();
  let activeAgents = useAppState(selectAgentDefinitionsActiveAgents_2);
  let t1;
  if ($[0] === MEMO_CACHE_SENTINEL) {
    t1 = getTools(getEmptyToolPermissionContext(), {
      skipReplFilter: true,
    });
    $[0] = t1;
  } else t1 = $[0];
  let tools = t1;
  let elapsedTicker = useElapsedTicker(
    teammate.startTime,
    teammate.status === "running",
    1000,
    teammate.totalPausedMs ?? 0,
    teammate.endTime,
  );
  const onKill_2 = teammate.status === "running" ? onKill : undefined;
  let confirmationHandlers;
  if ($[1] !== onBack || $[2] !== onDone || $[3] !== onKill_2) {
    confirmationHandlers = {
      onClose: onDone,
      onBack,
      onKill: onKill_2,
    };
    $[1] = onBack;
    $[2] = onDone;
    $[3] = onKill_2;
    $[4] = confirmationHandlers;
  } else confirmationHandlers = $[4];
  let confirmationKeys = useConfirmationKeys(confirmationHandlers);
  let keyDownHandler;
  if ($[5] !== confirmationKeys || $[6] !== onForeground || $[7] !== teammate.status) {
    keyDownHandler = (e) => {
      if (e.key === "f" && !e.ctrl && !e.meta && teammate.status === "running" && onForeground) {
        e.preventDefault();
        onForeground();
        return;
      }
      confirmationKeys(e);
    };
    $[5] = confirmationKeys;
    $[6] = onForeground;
    $[7] = teammate.status;
    $[8] = keyDownHandler;
  } else keyDownHandler = $[8];
  let handleKeyDown = keyDownHandler;
  let t5;
  if ($[9] !== teammate) {
    t5 = describeTeammateActivity(teammate);
    $[9] = teammate;
    $[10] = t5;
  } else t5 = $[10];
  let activity = t5;
  let tokenCount = teammate.result?.totalTokens ?? teammate.progress?.tokenCount;
  let toolUseCount = teammate.result?.totalToolUseCount ?? teammate.progress?.toolUseCount;
  let agentEffortLabel;
  if ($[11] !== teammate.effort || $[12] !== teammate.model) {
    agentEffortLabel = agentLabel(teammate.model, teammate.effort);
    $[11] = teammate.effort;
    $[12] = teammate.model;
    $[13] = agentEffortLabel;
  } else agentEffortLabel = $[13];
  let agentEffortText = agentEffortLabel;
  let truncatedPrompt;
  if ($[14] !== teammate.prompt) {
    truncatedPrompt = truncateToWidth(teammate.prompt, 300);
    $[14] = teammate.prompt;
    $[15] = truncatedPrompt;
  } else truncatedPrompt = $[15];
  let displayPrompt = truncatedPrompt;
  let color;
  if ($[16] !== teammate.identity.color) {
    color = toInkColor(teammate.identity.color);
    $[16] = teammate.identity.color;
    $[17] = color;
  } else color = $[17];
  let agentNameElement;
  if ($[18] !== color || $[19] !== teammate.identity.agentName) {
    agentNameElement = jsxProd_default_2(Text, {
      color,
      children: ["@", teammate.identity.agentName],
    });
    $[18] = color;
    $[19] = teammate.identity.agentName;
    $[20] = agentNameElement;
  } else agentNameElement = $[20];
  let activityElement;
  if ($[21] !== activity) {
    activityElement =
      activity &&
      jsxProd_default_2(Text, {
        dimColor: true,
        children: [" (", activity, ")"],
      });
    $[21] = activity;
    $[22] = activityElement;
  } else activityElement = $[22];
  let t10;
  if ($[23] !== activityElement || $[24] !== agentNameElement) {
    t10 = jsxProd_default_2(Text, {
      children: [agentNameElement, activityElement],
    });
    $[23] = activityElement;
    $[24] = agentNameElement;
    $[25] = t10;
  } else t10 = $[25];
  let title = t10;
  let statusLine;
  if ($[26] !== teammate.status) {
    statusLine =
      teammate.status !== "running" &&
      jsxProd_default_2(Text, {
        color:
          teammate.status === "completed" ? "success" : teammate.status === "killed" ? "warning" : "error",
        children: [
          teammate.status === "completed" ? "Completed" : teammate.status === "failed" ? "Failed" : "Stopped",
          " \xB7 ",
        ],
      });
    $[26] = teammate.status;
    $[27] = statusLine;
  } else statusLine = $[27];
  let tokenUsageHint;
  if ($[28] !== tokenCount) {
    tokenUsageHint =
      tokenCount !== undefined &&
      tokenCount > 0 &&
      jsxProd_default_2(Fragment, {
        children: [" \xB7 ", formatNumber(tokenCount), " tokens"],
      });
    $[28] = tokenCount;
    $[29] = tokenUsageHint;
  } else tokenUsageHint = $[29];
  let toolCountHint;
  if ($[30] !== toolUseCount) {
    toolCountHint =
      toolUseCount !== undefined &&
      toolUseCount > 0 &&
      jsxProd_default_2(Fragment, {
        children: [" ", "\xB7 ", toolUseCount, " ", toolUseCount === 1 ? "tool" : "tools"],
      });
    $[30] = toolUseCount;
    $[31] = toolCountHint;
  } else toolCountHint = $[31];
  let effortHint;
  if ($[32] !== agentEffortText) {
    effortHint =
      agentEffortText &&
      jsxProd_default_2(Fragment, {
        children: [" \xB7 ", agentEffortText],
      });
    $[32] = agentEffortText;
    $[33] = effortHint;
  } else effortHint = $[33];
  let timingLine;
  if (
    $[34] !== elapsedTicker ||
    $[35] !== tokenUsageHint ||
    $[36] !== toolCountHint ||
    $[37] !== effortHint
  ) {
    timingLine = jsxProd_default_2(Text, {
      dimColor: true,
      children: [elapsedTicker, tokenUsageHint, toolCountHint, effortHint],
    });
    $[34] = elapsedTicker;
    $[35] = tokenUsageHint;
    $[36] = toolCountHint;
    $[37] = effortHint;
    $[38] = timingLine;
  } else timingLine = $[38];
  let subtitle;
  if ($[39] !== statusLine || $[40] !== timingLine) {
    subtitle = jsxProd_default_2(Text, {
      children: [statusLine, timingLine],
    });
    $[39] = statusLine;
    $[40] = timingLine;
    $[41] = subtitle;
  } else subtitle = $[41];
  let subtitle_2 = subtitle;
  const showBack = !!onBack;
  const showStop = teammate.status === "running" && !!onKill;
  let children;
  if ($[42] !== onForeground || $[43] !== teammate.status) {
    children =
      teammate.status === "running" &&
      onForeground &&
      jsxProd_default(KeyboardShortcutHint, {
        chord: "f",
        action: "foreground",
      });
    $[42] = onForeground;
    $[43] = teammate.status;
    $[44] = children;
  } else children = $[44];
  let inputGuide;
  if ($[45] !== showBack || $[46] !== showStop || $[47] !== children) {
    inputGuide = jsxProd_default(TaskDetailFooterHints, {
      showBack,
      showStop,
      children,
    });
    $[45] = showBack;
    $[46] = showStop;
    $[47] = children;
    $[48] = inputGuide;
  } else inputGuide = $[48];
  let t17;
  if ($[49] !== activeAgents || $[50] !== teammate.progress || $[51] !== teammate.status || $[52] !== theme) {
    t17 =
      teammate.status === "running" &&
      teammate.progress?.recentActivities &&
      teammate.progress.recentActivities.length > 0 &&
      jsxProd_default_2(Box, {
        flexDirection: "column",
        children: [
          jsxProd_default(Text, {
            bold: true,
            dimColor: true,
            children: "Progress",
          }),
          teammate.progress.recentActivities.map((activity, i) =>
            jsxProd_default_2(
              Text,
              {
                dimColor: i < teammate.progress.recentActivities.length - 1,
                wrap: "truncate-end",
                children: [
                  i === teammate.progress.recentActivities.length - 1 ? "\u203A " : "  ",
                  renderToolActivity(activity, tools, theme, activeAgents),
                ],
              },
              i,
            ),
          ),
        ],
      });
    $[49] = activeAgents;
    $[50] = teammate.progress;
    $[51] = teammate.status;
    $[52] = theme;
    $[53] = t17;
  } else t17 = $[53];
  let t18;
  if ($[54] === MEMO_CACHE_SENTINEL) {
    t18 = jsxProd_default(Text, {
      bold: true,
      dimColor: true,
      children: "Prompt",
    });
    $[54] = t18;
  } else t18 = $[54];
  let t19;
  if ($[55] !== displayPrompt) {
    t19 = jsxProd_default_2(Box, {
      flexDirection: "column",
      marginTop: 1,
      children: [
        t18,
        jsxProd_default(Text, {
          wrap: "wrap",
          children: displayPrompt,
        }),
      ],
    });
    $[55] = displayPrompt;
    $[56] = t19;
  } else t19 = $[56];
  let t20;
  if ($[57] !== teammate.error || $[58] !== teammate.status) {
    t20 =
      teammate.status === "failed" &&
      teammate.error &&
      jsxProd_default_2(Box, {
        flexDirection: "column",
        marginTop: 1,
        children: [
          jsxProd_default(Text, {
            bold: true,
            color: "error",
            children: "Error",
          }),
          jsxProd_default(Text, {
            color: "error",
            wrap: "wrap",
            children: teammate.error,
          }),
        ],
      });
    $[57] = teammate.error;
    $[58] = teammate.status;
    $[59] = t20;
  } else t20 = $[59];
  let children_2;
  if (
    $[60] !== onDone ||
    $[61] !== subtitle_2 ||
    $[62] !== inputGuide ||
    $[63] !== t17 ||
    $[64] !== t19 ||
    $[65] !== t20 ||
    $[66] !== title
  ) {
    children_2 = jsxProd_default_2(Dialog, {
      title,
      subtitle: subtitle_2,
      onCancel: onDone,
      color: "background",
      inputGuide,
      children: [t17, t19, t20],
    });
    $[60] = onDone;
    $[61] = subtitle_2;
    $[62] = inputGuide;
    $[63] = t17;
    $[64] = t19;
    $[65] = t20;
    $[66] = title;
    $[67] = children_2;
  } else children_2 = $[67];
  let t22;
  if ($[68] !== handleKeyDown || $[69] !== children_2) {
    t22 = jsxProd_default(FocusColumn, {
      onKeyDown: handleKeyDown,
      children: children_2,
    });
    $[68] = handleKeyDown;
    $[69] = children_2;
    $[70] = t22;
  } else t22 = $[70];
  return t22;
}
export { InProcessTeammateDetailDialog };
