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
import { Dr } from "../../utils/stringUtils.js";
import { r, Fragment, e } from "../../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { Text, Box } from "../../ink/components/Text.js";
import { getTaskStatusColor, getTaskStatusIcon, TaskDetailFooterHints } from "./taskStatusUtils.js";
import { formatNumber } from "../../utils/format.js";
import { KeyboardShortcutHint } from "../design-system/KeyboardShortcutHint.js";
import { renderToolActivity } from "./renderToolActivity.js";
import { UserPlanMessage } from "../messages/UserPlanMessage.js";
import { Dialog } from "../design-system/Dialog.js";
import { FocusColumn } from "../design-system/FocusColumn.js";

/**
 * 后台异步 agent 详情：描述、状态、进度、工具活动、结果或错误。
 */
//@ chunk-18hwfzwa.js:687576-691937 fingerprint = AsyncAgentDetailDialog (0.636)
function AsyncAgentDetailDialog(t0) {
  let $ = w(70),
    {
      agent: agent,
      onDone: onDone,
      onKillAgent: onKillAgent,
      onForeground: onForeground,
      onBack: onBack,
      killAllAgentsShortcut: killAllAgentsShortcut,
    } = t0,
    [Be] = useTheme(),
    activeAgents = useAppState(selectAgentDefinitionsActiveAgents),
    ze;
  if ($[0] === MEMO_CACHE_SENTINEL)
    ((ze = getTools(getEmptyToolPermissionContext(), { skipReplFilter: !0 })), ($[0] = ze));
  else ze = $[0];
  let Xe = ze,
    rt = useElapsedTicker(
      agent.startTime,
      agent.status === "running",
      1000,
      agent.totalPausedMs ?? 0,
      agent.endTime,
    ),
    kt;
  if ($[1] !== agent)
    ((kt = agent.status === "running" || isWaitingOnChildren(agent)), ($[1] = agent), ($[2] = kt));
  else kt = $[2];
  let At = kt;
  const It = At ? onKillAgent : void 0;
  let Ot;
  if ($[3] !== onBack || $[4] !== onDone || $[5] !== It)
    ((Ot = { onClose: onDone, onBack: onBack, onKill: It }),
      ($[3] = onBack),
      ($[4] = onDone),
      ($[5] = It),
      ($[6] = Ot));
  else Ot = $[6];
  let Et = useConfirmationKeys(Ot),
    Dt;
  if ($[7] !== Et || $[8] !== onForeground)
    ((Dt = (Lt) => {
      if (Lt.key === "f" && !Lt.ctrl && !Lt.meta && onForeground) {
        (Lt.preventDefault(), onForeground());
        return;
      }
      Et(Lt);
    }),
      ($[7] = Et),
      ($[8] = onForeground),
      ($[9] = Dt));
  else Dt = $[9];
  let oo = Dt,
    Xt;
  if ($[10] !== agent.prompt) ((Xt = extractTag(agent.prompt, "plan")), ($[10] = agent.prompt), ($[11] = Xt));
  else Xt = $[11];
  let io = Xt,
    so = agent.prompt.length > 300 ? agent.prompt.substring(0, 297) + "\u2026" : agent.prompt,
    po = agent.result?.totalTokens ?? agent.progress?.tokenCount,
    ao = agent.result?.totalToolUseCount ?? agent.progress?.toolUseCount,
    co;
  if ($[12] !== agent.effort || $[13] !== agent.model)
    ((co = agentLabel(agent.model, agent.effort)),
      ($[12] = agent.effort),
      ($[13] = agent.model),
      ($[14] = co));
  else co = $[14];
  let bo = co;
  const Ao = agent.selectedAgent?.agentType ?? agent.agentType;
  let Bo;
  if ($[15] !== Ao) ((Bo = Dr(Ao)), ($[15] = Ao), ($[16] = Bo));
  else Bo = $[16];
  let Ro = Bo;
  const Ho = agent.description || "Async agent";
  let Io;
  if ($[17] !== Ro || $[18] !== Ho)
    ((Io = r(Text, { children: [Ro, " \u203A ", Ho] })), ($[17] = Ro), ($[18] = Ho), ($[19] = Io));
  else Io = $[19];
  let Wo = Io,
    mn;
  if ($[20] !== agent.status)
    ((mn =
      agent.status !== "running" &&
      r(Text, {
        color: getTaskStatusColor(agent.status),
        children: [
          getTaskStatusIcon(agent.status),
          " ",
          agent.status === "completed" ? "Completed" : agent.status === "failed" ? "Failed" : "Stopped",
          " \xB7 ",
        ],
      })),
      ($[20] = agent.status),
      ($[21] = mn));
  else mn = $[21];
  let Cn;
  if ($[22] !== po)
    ((Cn = po !== void 0 && po > 0 && r(Fragment, { children: [" \xB7 ", formatNumber(po), " tokens"] })),
      ($[22] = po),
      ($[23] = Cn));
  else Cn = $[23];
  let No;
  if ($[24] !== ao)
    ((No =
      ao !== void 0 &&
      ao > 0 &&
      r(Fragment, { children: [" ", "\xB7 ", ao, " ", ao === 1 ? "tool" : "tools"] })),
      ($[24] = ao),
      ($[25] = No));
  else No = $[25];
  let vo;
  if ($[26] !== bo) ((vo = bo && r(Fragment, { children: [" \xB7 ", bo] })), ($[26] = bo), ($[27] = vo));
  else vo = $[27];
  let Yo;
  if ($[28] !== rt || $[29] !== Cn || $[30] !== No || $[31] !== vo)
    ((Yo = r(Text, { dimColor: !0, children: [rt, Cn, No, vo] })),
      ($[28] = rt),
      ($[29] = Cn),
      ($[30] = No),
      ($[31] = vo),
      ($[32] = Yo));
  else Yo = $[32];
  let kn;
  if ($[33] !== mn || $[34] !== Yo)
    ((kn = r(Text, { children: [mn, Yo] })), ($[33] = mn), ($[34] = Yo), ($[35] = kn));
  else kn = $[35];
  let Fn = kn;
  const bn = !!onBack,
    Go = At && !!onKillAgent;
  let hn;
  if ($[36] !== onForeground)
    ((hn = onForeground && e(KeyboardShortcutHint, { chord: "f", action: "foreground" })),
      ($[36] = onForeground),
      ($[37] = hn));
  else hn = $[37];
  let Mn;
  if ($[38] !== At || $[39] !== killAllAgentsShortcut)
    ((Mn =
      At &&
      killAllAgentsShortcut &&
      e(KeyboardShortcutHint, {
        chord: killAllAgentsShortcut,
        action: "stop all agents",
        format: { keyCase: "lower" },
      })),
      ($[38] = At),
      ($[39] = killAllAgentsShortcut),
      ($[40] = Mn));
  else Mn = $[40];
  let Xo;
  if ($[41] !== bn || $[42] !== Go || $[43] !== hn || $[44] !== Mn)
    ((Xo = r(TaskDetailFooterHints, { showBack: bn, showStop: Go, children: [hn, Mn] })),
      ($[41] = bn),
      ($[42] = Go),
      ($[43] = hn),
      ($[44] = Mn),
      ($[45] = Xo));
  else Xo = $[45];
  let Sn;
  if ($[46] !== activeAgents || $[47] !== agent.progress || $[48] !== agent.status || $[49] !== Be)
    ((Sn =
      agent.status === "running" &&
      agent.progress?.recentActivities &&
      agent.progress.recentActivities.length > 0 &&
      r(Box, {
        flexDirection: "column",
        children: [
          e(Text, { bold: !0, dimColor: !0, children: "Progress" }),
          agent.progress.recentActivities.map((activity, on) =>
            r(
              Text,
              {
                dimColor: on < agent.progress.recentActivities.length - 1,
                wrap: "truncate-end",
                children: [
                  on === agent.progress.recentActivities.length - 1 ? "\u203A " : "  ",
                  renderToolActivity(activity, Xe, Be, activeAgents),
                ],
              },
              on,
            ),
          ),
        ],
      })),
      ($[46] = activeAgents),
      ($[47] = agent.progress),
      ($[48] = agent.status),
      ($[49] = Be),
      ($[50] = Sn));
  else Sn = $[50];
  let _o;
  if ($[51] !== so || $[52] !== io)
    ((_o = io
      ? e(Box, { marginTop: 1, children: e(UserPlanMessage, { addMargin: !1, planContent: io }) })
      : r(Box, {
          flexDirection: "column",
          marginTop: 1,
          children: [
            e(Text, { bold: !0, dimColor: !0, children: "Prompt" }),
            e(Text, { wrap: "wrap", children: so }),
          ],
        })),
      ($[51] = so),
      ($[52] = io),
      ($[53] = _o));
  else _o = $[53];
  let cn;
  if ($[54] !== agent.error || $[55] !== agent.status)
    ((cn =
      agent.status === "failed" &&
      agent.error &&
      r(Box, {
        flexDirection: "column",
        marginTop: 1,
        children: [
          e(Text, { bold: !0, color: "error", children: "Error" }),
          e(Text, { color: "error", wrap: "wrap", children: agent.error }),
        ],
      })),
      ($[54] = agent.error),
      ($[55] = agent.status),
      ($[56] = cn));
  else cn = $[56];
  let Dn;
  if ($[57] !== Sn || $[58] !== _o || $[59] !== cn)
    ((Dn = r(Box, { flexDirection: "column", children: [Sn, _o, cn] })),
      ($[57] = Sn),
      ($[58] = _o),
      ($[59] = cn),
      ($[60] = Dn));
  else Dn = $[60];
  let wn;
  if ($[61] !== onDone || $[62] !== Fn || $[63] !== Xo || $[64] !== Dn || $[65] !== Wo)
    ((wn = e(Dialog, {
      title: Wo,
      subtitle: Fn,
      onCancel: onDone,
      color: "background",
      inputGuide: Xo,
      children: Dn,
    })),
      ($[61] = onDone),
      ($[62] = Fn),
      ($[63] = Xo),
      ($[64] = Dn),
      ($[65] = Wo),
      ($[66] = wn));
  else wn = $[66];
  let mr;
  if ($[67] !== oo || $[68] !== wn)
    ((mr = e(FocusColumn, { onKeyDown: oo, children: wn })), ($[67] = oo), ($[68] = wn), ($[69] = mr));
  else mr = $[69];
  return mr;
}

export { AsyncAgentDetailDialog };
