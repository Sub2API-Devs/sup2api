/**
 * components/tasks/AsyncAgentDetailDialog.tsx
 *
 * 后台异步 agent 详情：状态、进度、最近活动、结果。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/components/tasks/AsyncAgentDetailDialog.tsx
 * pieces: chunk-18hwfzwa.js (1)
 * attribution: fingerprint 1
 */
import { w } from "../../../vendor/react/compiler-runtime.js";
import { useTheme } from "../design-system/ThemeProvider.js";
import { useAppState } from "../../state/AppState.js";
import { selectAgentDefinitionsActiveAgents } from "../agents/AgentsMenu.js";
import { MEMO_CACHE_SENTINEL } from "../../../runtime/bun-runtime.js";
import { getTools } from "../../tools.js";
import { getEmptyToolPermissionContext } from "../../Tool.js";
import { useElapsedTicker, useConfirmationKeys } from "../ConfirmationPrompt.js";
import { isWaitingOnChildren } from "../../tasks/LocalAgentTask/keepalive.js";
import { extractTag } from "../../utils/messages.js";
import { agentLabel } from "../../utils/transcriptDiagnostics.js";
import { collapseWhitespace } from "../../utils/stringUtils.js";
import {
  jsxProd_default_2,
  Fragment,
  jsxProd_default,
} from "../../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { Text, Box } from "../../ink/components/Text.js";
import { getTaskStatusColor, getTaskStatusIcon, TaskDetailFooterHints } from "./taskStatusUtils.js";
import { formatNumber } from "../../utils/format.js";
import { KeyboardShortcutHint } from "../design-system/KeyboardShortcutHint.js";
import { renderToolActivity } from "./renderToolActivity.js";
import { UserPlanMessage } from "../messages/UserPlanMessage.js";
import { Dialog } from "../design-system/Dialog.js";
import { FocusColumn } from "../design-system/FocusColumn.js";

//@ chunk-18hwfzwa.js:687576-691937 fingerprint = AsyncAgentDetailDialog (0.636)
/**
 * 后台异步 agent 详情：描述、状态、进度、工具活动、结果或错误。
 */
function AsyncAgentDetailDialog(props) {
  let $ = w(70);
  let { agent, onDone, onKillAgent, onForeground, onBack, killAllAgentsShortcut } = props;
  let [theme] = useTheme();
  let activeAgents = useAppState(selectAgentDefinitionsActiveAgents);
  let t1;
  if ($[0] === MEMO_CACHE_SENTINEL) {
    t1 = getTools(getEmptyToolPermissionContext(), {
      skipReplFilter: true,
    });
    $[0] = t1;
  } else t1 = $[0];
  let tools = t1;
  let elapsedTicker = useElapsedTicker(
    agent.startTime,
    agent.status === "running",
    1000,
    agent.totalPausedMs ?? 0,
    agent.endTime,
  );
  let t2;
  if ($[1] !== agent) {
    t2 = agent.status === "running" || isWaitingOnChildren(agent);
    $[1] = agent;
    $[2] = t2;
  } else t2 = $[2];
  let At = t2;
  const onKill = At ? onKillAgent : undefined;
  let Ot;
  if ($[3] !== onBack || $[4] !== onDone || $[5] !== onKill) {
    Ot = {
      onClose: onDone,
      onBack,
      onKill,
    };
    $[3] = onBack;
    $[4] = onDone;
    $[5] = onKill;
    $[6] = Ot;
  } else Ot = $[6];
  let confirmationKeys = useConfirmationKeys(Ot);
  let Dt;
  if ($[7] !== confirmationKeys || $[8] !== onForeground) {
    Dt = (e) => {
      if (e.key === "f" && !e.ctrl && !e.meta && onForeground) {
        e.preventDefault();
        onForeground();
        return;
      }
      confirmationKeys(e);
    };
    $[7] = confirmationKeys;
    $[8] = onForeground;
    $[9] = Dt;
  } else Dt = $[9];
  let handleKeyDown = Dt;
  let t5;
  if ($[10] !== agent.prompt) {
    t5 = extractTag(agent.prompt, "plan");
    $[10] = agent.prompt;
    $[11] = t5;
  } else t5 = $[11];
  let planContent = t5;
  let displayPrompt = agent.prompt.length > 300 ? agent.prompt.substring(0, 297) + "\u2026" : agent.prompt;
  let tokenCount = agent.result?.totalTokens ?? agent.progress?.tokenCount;
  let toolUseCount = agent.result?.totalToolUseCount ?? agent.progress?.toolUseCount;
  let co;
  if ($[12] !== agent.effort || $[13] !== agent.model) {
    co = agentLabel(agent.model, agent.effort);
    $[12] = agent.effort;
    $[13] = agent.model;
    $[14] = co;
  } else co = $[14];
  let bo = co;
  const agentType = agent.selectedAgent?.agentType ?? agent.agentType;
  let Bo;
  if ($[15] !== agentType) {
    Bo = collapseWhitespace(agentType);
    $[15] = agentType;
    $[16] = Bo;
  } else Bo = $[16];
  let Ro = Bo;
  const description = agent.description || "Async agent";
  let t8;
  if ($[17] !== Ro || $[18] !== description) {
    t8 = jsxProd_default_2(Text, {
      children: [Ro, " \u203A ", description],
    });
    $[17] = Ro;
    $[18] = description;
    $[19] = t8;
  } else t8 = $[19];
  let title = t8;
  let mn;
  if ($[20] !== agent.status) {
    mn =
      agent.status !== "running" &&
      jsxProd_default_2(Text, {
        color: getTaskStatusColor(agent.status),
        children: [
          getTaskStatusIcon(agent.status),
          " ",
          agent.status === "completed" ? "Completed" : agent.status === "failed" ? "Failed" : "Stopped",
          " \xB7 ",
        ],
      });
    $[20] = agent.status;
    $[21] = mn;
  } else mn = $[21];
  let Cn;
  if ($[22] !== tokenCount) {
    Cn =
      tokenCount !== undefined &&
      tokenCount > 0 &&
      jsxProd_default_2(Fragment, {
        children: [" \xB7 ", formatNumber(tokenCount), " tokens"],
      });
    $[22] = tokenCount;
    $[23] = Cn;
  } else Cn = $[23];
  let No;
  if ($[24] !== toolUseCount) {
    No =
      toolUseCount !== undefined &&
      toolUseCount > 0 &&
      jsxProd_default_2(Fragment, {
        children: [" ", "\xB7 ", toolUseCount, " ", toolUseCount === 1 ? "tool" : "tools"],
      });
    $[24] = toolUseCount;
    $[25] = No;
  } else No = $[25];
  let vo;
  if ($[26] !== bo) {
    vo =
      bo &&
      jsxProd_default_2(Fragment, {
        children: [" \xB7 ", bo],
      });
    $[26] = bo;
    $[27] = vo;
  } else vo = $[27];
  let Yo;
  if ($[28] !== elapsedTicker || $[29] !== Cn || $[30] !== No || $[31] !== vo) {
    Yo = jsxProd_default_2(Text, {
      dimColor: true,
      children: [elapsedTicker, Cn, No, vo],
    });
    $[28] = elapsedTicker;
    $[29] = Cn;
    $[30] = No;
    $[31] = vo;
    $[32] = Yo;
  } else Yo = $[32];
  let t13;
  if ($[33] !== mn || $[34] !== Yo) {
    t13 = jsxProd_default_2(Text, {
      children: [mn, Yo],
    });
    $[33] = mn;
    $[34] = Yo;
    $[35] = t13;
  } else t13 = $[35];
  let subtitle = t13;
  const showBack = !!onBack;
  const showStop = At && !!onKillAgent;
  let hn;
  if ($[36] !== onForeground) {
    hn =
      onForeground &&
      jsxProd_default(KeyboardShortcutHint, {
        chord: "f",
        action: "foreground",
      });
    $[36] = onForeground;
    $[37] = hn;
  } else hn = $[37];
  let Mn;
  if ($[38] !== At || $[39] !== killAllAgentsShortcut) {
    Mn =
      At &&
      killAllAgentsShortcut &&
      jsxProd_default(KeyboardShortcutHint, {
        chord: killAllAgentsShortcut,
        action: "stop all agents",
        format: {
          keyCase: "lower",
        },
      });
    $[38] = At;
    $[39] = killAllAgentsShortcut;
    $[40] = Mn;
  } else Mn = $[40];
  let inputGuide;
  if ($[41] !== showBack || $[42] !== showStop || $[43] !== hn || $[44] !== Mn) {
    inputGuide = jsxProd_default_2(TaskDetailFooterHints, {
      showBack,
      showStop,
      children: [hn, Mn],
    });
    $[41] = showBack;
    $[42] = showStop;
    $[43] = hn;
    $[44] = Mn;
    $[45] = inputGuide;
  } else inputGuide = $[45];
  let t15;
  if ($[46] !== activeAgents || $[47] !== agent.progress || $[48] !== agent.status || $[49] !== theme) {
    t15 =
      agent.status === "running" &&
      agent.progress?.recentActivities &&
      agent.progress.recentActivities.length > 0 &&
      jsxProd_default_2(Box, {
        flexDirection: "column",
        children: [
          jsxProd_default(Text, {
            bold: true,
            dimColor: true,
            children: "Progress",
          }),
          agent.progress.recentActivities.map((activity, i) =>
            jsxProd_default_2(
              Text,
              {
                dimColor: i < agent.progress.recentActivities.length - 1,
                wrap: "truncate-end",
                children: [
                  i === agent.progress.recentActivities.length - 1 ? "\u203A " : "  ",
                  renderToolActivity(activity, tools, theme, activeAgents),
                ],
              },
              i,
            ),
          ),
        ],
      });
    $[46] = activeAgents;
    $[47] = agent.progress;
    $[48] = agent.status;
    $[49] = theme;
    $[50] = t15;
  } else t15 = $[50];
  let t16;
  if ($[51] !== displayPrompt || $[52] !== planContent) {
    t16 = planContent
      ? jsxProd_default(Box, {
          marginTop: 1,
          children: jsxProd_default(UserPlanMessage, {
            addMargin: false,
            planContent,
          }),
        })
      : jsxProd_default_2(Box, {
          flexDirection: "column",
          marginTop: 1,
          children: [
            jsxProd_default(Text, {
              bold: true,
              dimColor: true,
              children: "Prompt",
            }),
            jsxProd_default(Text, {
              wrap: "wrap",
              children: displayPrompt,
            }),
          ],
        });
    $[51] = displayPrompt;
    $[52] = planContent;
    $[53] = t16;
  } else t16 = $[53];
  let t17;
  if ($[54] !== agent.error || $[55] !== agent.status) {
    t17 =
      agent.status === "failed" &&
      agent.error &&
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
            children: agent.error,
          }),
        ],
      });
    $[54] = agent.error;
    $[55] = agent.status;
    $[56] = t17;
  } else t17 = $[56];
  let children;
  if ($[57] !== t15 || $[58] !== t16 || $[59] !== t17) {
    children = jsxProd_default_2(Box, {
      flexDirection: "column",
      children: [t15, t16, t17],
    });
    $[57] = t15;
    $[58] = t16;
    $[59] = t17;
    $[60] = children;
  } else children = $[60];
  let children_2;
  if (
    $[61] !== onDone ||
    $[62] !== subtitle ||
    $[63] !== inputGuide ||
    $[64] !== children ||
    $[65] !== title
  ) {
    children_2 = jsxProd_default(Dialog, {
      title,
      subtitle,
      onCancel: onDone,
      color: "background",
      inputGuide,
      children,
    });
    $[61] = onDone;
    $[62] = subtitle;
    $[63] = inputGuide;
    $[64] = children;
    $[65] = title;
    $[66] = children_2;
  } else children_2 = $[66];
  let t20;
  if ($[67] !== handleKeyDown || $[68] !== children_2) {
    t20 = jsxProd_default(FocusColumn, {
      onKeyDown: handleKeyDown,
      children: children_2,
    });
    $[67] = handleKeyDown;
    $[68] = children_2;
    $[69] = t20;
  } else t20 = $[69];
  return t20;
}
export { AsyncAgentDetailDialog };
