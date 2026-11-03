/**
 * components/tasks/InProcessTeammateDetailDialog.tsx
 *
 * 进程内队友详情：状态、当前活动、消息。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/components/tasks/InProcessTeammateDetailDialog.tsx
 * pieces: chunk-18hwfzwa.js (3)
 * attribution: placement 1, layout 1, fingerprint 1
 */
import { init_react_production } from "../../../vendor/react/cjs/react.production.js";
import { w } from "../../../vendor/react/compiler-runtime.js";
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

//@ chunk-18hwfzwa.js:704222-704226 placement
init_react_production();
//@ chunk-18hwfzwa.js:704226-704283 layout
function selectAgentDefinitionsActiveAgents_2(cn) {
  return cn.agentDefinitions.activeAgents;
}
//@ chunk-18hwfzwa.js:704283-708595 fingerprint = InProcessTeammateDetailDialog (0.709)
/**
 * 进程内队友详情：状态（运行/完成/被杀）、当前活动、token、最近消息与提示。
 */
function InProcessTeammateDetailDialog(props) {
  let $ = w(71);
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
  let kt;
  if ($[1] !== onBack || $[2] !== onDone || $[3] !== onKill_2) {
    kt = {
      onClose: onDone,
      onBack,
      onKill: onKill_2,
    };
    $[1] = onBack;
    $[2] = onDone;
    $[3] = onKill_2;
    $[4] = kt;
  } else kt = $[4];
  let confirmationKeys = useConfirmationKeys(kt);
  let It;
  if ($[5] !== confirmationKeys || $[6] !== onForeground || $[7] !== teammate.status) {
    It = (e) => {
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
    $[8] = It;
  } else It = $[8];
  let handleKeyDown = It;
  let t5;
  if ($[9] !== teammate) {
    t5 = describeTeammateActivity(teammate);
    $[9] = teammate;
    $[10] = t5;
  } else t5 = $[10];
  let activity = t5;
  let tokenCount = teammate.result?.totalTokens ?? teammate.progress?.tokenCount;
  let toolUseCount = teammate.result?.totalToolUseCount ?? teammate.progress?.toolUseCount;
  let io;
  if ($[11] !== teammate.effort || $[12] !== teammate.model) {
    io = agentLabel(teammate.model, teammate.effort);
    $[11] = teammate.effort;
    $[12] = teammate.model;
    $[13] = io;
  } else io = $[13];
  let so = io;
  let po;
  if ($[14] !== teammate.prompt) {
    po = truncateToWidth(teammate.prompt, 300);
    $[14] = teammate.prompt;
    $[15] = po;
  } else po = $[15];
  let displayPrompt = po;
  let color;
  if ($[16] !== teammate.identity.color) {
    color = toInkColor(teammate.identity.color);
    $[16] = teammate.identity.color;
    $[17] = color;
  } else color = $[17];
  let bo;
  if ($[18] !== color || $[19] !== teammate.identity.agentName) {
    bo = jsxProd_default_2(Text, {
      color,
      children: ["@", teammate.identity.agentName],
    });
    $[18] = color;
    $[19] = teammate.identity.agentName;
    $[20] = bo;
  } else bo = $[20];
  let Ao;
  if ($[21] !== activity) {
    Ao =
      activity &&
      jsxProd_default_2(Text, {
        dimColor: true,
        children: [" (", activity, ")"],
      });
    $[21] = activity;
    $[22] = Ao;
  } else Ao = $[22];
  let t10;
  if ($[23] !== Ao || $[24] !== bo) {
    t10 = jsxProd_default_2(Text, {
      children: [bo, Ao],
    });
    $[23] = Ao;
    $[24] = bo;
    $[25] = t10;
  } else t10 = $[25];
  let title = t10;
  let Ho;
  if ($[26] !== teammate.status) {
    Ho =
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
    $[27] = Ho;
  } else Ho = $[27];
  let Io;
  if ($[28] !== tokenCount) {
    Io =
      tokenCount !== undefined &&
      tokenCount > 0 &&
      jsxProd_default_2(Fragment, {
        children: [" \xB7 ", formatNumber(tokenCount), " tokens"],
      });
    $[28] = tokenCount;
    $[29] = Io;
  } else Io = $[29];
  let Wo;
  if ($[30] !== toolUseCount) {
    Wo =
      toolUseCount !== undefined &&
      toolUseCount > 0 &&
      jsxProd_default_2(Fragment, {
        children: [" ", "\xB7 ", toolUseCount, " ", toolUseCount === 1 ? "tool" : "tools"],
      });
    $[30] = toolUseCount;
    $[31] = Wo;
  } else Wo = $[31];
  let mn;
  if ($[32] !== so) {
    mn =
      so &&
      jsxProd_default_2(Fragment, {
        children: [" \xB7 ", so],
      });
    $[32] = so;
    $[33] = mn;
  } else mn = $[33];
  let Cn;
  if ($[34] !== elapsedTicker || $[35] !== Io || $[36] !== Wo || $[37] !== mn) {
    Cn = jsxProd_default_2(Text, {
      dimColor: true,
      children: [elapsedTicker, Io, Wo, mn],
    });
    $[34] = elapsedTicker;
    $[35] = Io;
    $[36] = Wo;
    $[37] = mn;
    $[38] = Cn;
  } else Cn = $[38];
  let No;
  if ($[39] !== Ho || $[40] !== Cn) {
    No = jsxProd_default_2(Text, {
      children: [Ho, Cn],
    });
    $[39] = Ho;
    $[40] = Cn;
    $[41] = No;
  } else No = $[41];
  let subtitle = No;
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
    $[61] !== subtitle ||
    $[62] !== inputGuide ||
    $[63] !== t17 ||
    $[64] !== t19 ||
    $[65] !== t20 ||
    $[66] !== title
  ) {
    children_2 = jsxProd_default_2(Dialog, {
      title,
      subtitle,
      onCancel: onDone,
      color: "background",
      inputGuide,
      children: [t17, t19, t20],
    });
    $[60] = onDone;
    $[61] = subtitle;
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
