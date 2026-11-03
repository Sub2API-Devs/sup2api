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
import { j } from "../../../vendor/react/cjs/react.production.js";
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
import { r, Fragment, e } from "../../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { Text, Box } from "../../ink/components/Text.js";
import { KeyboardShortcutHint } from "../design-system/KeyboardShortcutHint.js";
import { renderToolActivity } from "./renderToolActivity.js";
import { Dialog } from "../design-system/Dialog.js";
import { FocusColumn } from "../design-system/FocusColumn.js";

//@ chunk-18hwfzwa.js:704222-704226 placement
j();
//@ chunk-18hwfzwa.js:704226-704283 layout
function selectAgentDefinitionsActiveAgents_2(cn) {
  return cn.agentDefinitions.activeAgents;
}
/**
 * 进程内队友详情：状态（运行/完成/被杀）、当前活动、token、最近消息与提示。
 */
//@ chunk-18hwfzwa.js:704283-708595 fingerprint = InProcessTeammateDetailDialog (0.709)
function InProcessTeammateDetailDialog(t0) {
  let $ = w(71),
    { teammate: teammate, onDone: onDone, onKill: onKill, onBack: onBack, onForeground: onForeground } = t0,
    [Re] = useTheme(),
    activeAgents = useAppState(selectAgentDefinitionsActiveAgents_2),
    We;
  if ($[0] === MEMO_CACHE_SENTINEL)
    ((We = getTools(getEmptyToolPermissionContext(), { skipReplFilter: !0 })), ($[0] = We));
  else We = $[0];
  let ze = We,
    Xe = useElapsedTicker(
      teammate.startTime,
      teammate.status === "running",
      1000,
      teammate.totalPausedMs ?? 0,
      teammate.endTime,
    );
  const rt = teammate.status === "running" ? onKill : void 0;
  let kt;
  if ($[1] !== onBack || $[2] !== onDone || $[3] !== rt)
    ((kt = { onClose: onDone, onBack: onBack, onKill: rt }),
      ($[1] = onBack),
      ($[2] = onDone),
      ($[3] = rt),
      ($[4] = kt));
  else kt = $[4];
  let At = useConfirmationKeys(kt),
    It;
  if ($[5] !== At || $[6] !== onForeground || $[7] !== teammate.status)
    ((It = (Ot) => {
      if (Ot.key === "f" && !Ot.ctrl && !Ot.meta && teammate.status === "running" && onForeground) {
        (Ot.preventDefault(), onForeground());
        return;
      }
      At(Ot);
    }),
      ($[5] = At),
      ($[6] = onForeground),
      ($[7] = teammate.status),
      ($[8] = It));
  else It = $[8];
  let Et = It,
    Dt;
  if ($[9] !== teammate) ((Dt = describeTeammateActivity(teammate)), ($[9] = teammate), ($[10] = Dt));
  else Dt = $[10];
  let Lt = Dt,
    oo = teammate.result?.totalTokens ?? teammate.progress?.tokenCount,
    Xt = teammate.result?.totalToolUseCount ?? teammate.progress?.toolUseCount,
    io;
  if ($[11] !== teammate.effort || $[12] !== teammate.model)
    ((io = agentLabel(teammate.model, teammate.effort)),
      ($[11] = teammate.effort),
      ($[12] = teammate.model),
      ($[13] = io));
  else io = $[13];
  let so = io,
    po;
  if ($[14] !== teammate.prompt)
    ((po = truncateToWidth(teammate.prompt, 300)), ($[14] = teammate.prompt), ($[15] = po));
  else po = $[15];
  let ao = po,
    co;
  if ($[16] !== teammate.identity.color)
    ((co = toInkColor(teammate.identity.color)), ($[16] = teammate.identity.color), ($[17] = co));
  else co = $[17];
  let bo;
  if ($[18] !== co || $[19] !== teammate.identity.agentName)
    ((bo = r(Text, { color: co, children: ["@", teammate.identity.agentName] })),
      ($[18] = co),
      ($[19] = teammate.identity.agentName),
      ($[20] = bo));
  else bo = $[20];
  let Ao;
  if ($[21] !== Lt)
    ((Ao = Lt && r(Text, { dimColor: !0, children: [" (", Lt, ")"] })), ($[21] = Lt), ($[22] = Ao));
  else Ao = $[22];
  let Bo;
  if ($[23] !== Ao || $[24] !== bo)
    ((Bo = r(Text, { children: [bo, Ao] })), ($[23] = Ao), ($[24] = bo), ($[25] = Bo));
  else Bo = $[25];
  let Ro = Bo,
    Ho;
  if ($[26] !== teammate.status)
    ((Ho =
      teammate.status !== "running" &&
      r(Text, {
        color:
          teammate.status === "completed" ? "success" : teammate.status === "killed" ? "warning" : "error",
        children: [
          teammate.status === "completed" ? "Completed" : teammate.status === "failed" ? "Failed" : "Stopped",
          " \xB7 ",
        ],
      })),
      ($[26] = teammate.status),
      ($[27] = Ho));
  else Ho = $[27];
  let Io;
  if ($[28] !== oo)
    ((Io = oo !== void 0 && oo > 0 && r(Fragment, { children: [" \xB7 ", formatNumber(oo), " tokens"] })),
      ($[28] = oo),
      ($[29] = Io));
  else Io = $[29];
  let Wo;
  if ($[30] !== Xt)
    ((Wo =
      Xt !== void 0 &&
      Xt > 0 &&
      r(Fragment, { children: [" ", "\xB7 ", Xt, " ", Xt === 1 ? "tool" : "tools"] })),
      ($[30] = Xt),
      ($[31] = Wo));
  else Wo = $[31];
  let mn;
  if ($[32] !== so) ((mn = so && r(Fragment, { children: [" \xB7 ", so] })), ($[32] = so), ($[33] = mn));
  else mn = $[33];
  let Cn;
  if ($[34] !== Xe || $[35] !== Io || $[36] !== Wo || $[37] !== mn)
    ((Cn = r(Text, { dimColor: !0, children: [Xe, Io, Wo, mn] })),
      ($[34] = Xe),
      ($[35] = Io),
      ($[36] = Wo),
      ($[37] = mn),
      ($[38] = Cn));
  else Cn = $[38];
  let No;
  if ($[39] !== Ho || $[40] !== Cn)
    ((No = r(Text, { children: [Ho, Cn] })), ($[39] = Ho), ($[40] = Cn), ($[41] = No));
  else No = $[41];
  let vo = No;
  const Yo = !!onBack,
    kn = teammate.status === "running" && !!onKill;
  let Fn;
  if ($[42] !== onForeground || $[43] !== teammate.status)
    ((Fn =
      teammate.status === "running" &&
      onForeground &&
      e(KeyboardShortcutHint, { chord: "f", action: "foreground" })),
      ($[42] = onForeground),
      ($[43] = teammate.status),
      ($[44] = Fn));
  else Fn = $[44];
  let bn;
  if ($[45] !== Yo || $[46] !== kn || $[47] !== Fn)
    ((bn = e(TaskDetailFooterHints, { showBack: Yo, showStop: kn, children: Fn })),
      ($[45] = Yo),
      ($[46] = kn),
      ($[47] = Fn),
      ($[48] = bn));
  else bn = $[48];
  let Go;
  if ($[49] !== activeAgents || $[50] !== teammate.progress || $[51] !== teammate.status || $[52] !== Re)
    ((Go =
      teammate.status === "running" &&
      teammate.progress?.recentActivities &&
      teammate.progress.recentActivities.length > 0 &&
      r(Box, {
        flexDirection: "column",
        children: [
          e(Text, { bold: !0, dimColor: !0, children: "Progress" }),
          teammate.progress.recentActivities.map((activity_0, Mn) =>
            r(
              Text,
              {
                dimColor: Mn < teammate.progress.recentActivities.length - 1,
                wrap: "truncate-end",
                children: [
                  Mn === teammate.progress.recentActivities.length - 1 ? "\u203A " : "  ",
                  renderToolActivity(activity_0, ze, Re, activeAgents),
                ],
              },
              Mn,
            ),
          ),
        ],
      })),
      ($[49] = activeAgents),
      ($[50] = teammate.progress),
      ($[51] = teammate.status),
      ($[52] = Re),
      ($[53] = Go));
  else Go = $[53];
  let Xo;
  if ($[54] === MEMO_CACHE_SENTINEL)
    ((Xo = e(Text, { bold: !0, dimColor: !0, children: "Prompt" })), ($[54] = Xo));
  else Xo = $[54];
  let Sn;
  if ($[55] !== ao)
    ((Sn = r(Box, {
      flexDirection: "column",
      marginTop: 1,
      children: [Xo, e(Text, { wrap: "wrap", children: ao })],
    })),
      ($[55] = ao),
      ($[56] = Sn));
  else Sn = $[56];
  let $n;
  if ($[57] !== teammate.error || $[58] !== teammate.status)
    (($n =
      teammate.status === "failed" &&
      teammate.error &&
      r(Box, {
        flexDirection: "column",
        marginTop: 1,
        children: [
          e(Text, { bold: !0, color: "error", children: "Error" }),
          e(Text, { color: "error", wrap: "wrap", children: teammate.error }),
        ],
      })),
      ($[57] = teammate.error),
      ($[58] = teammate.status),
      ($[59] = $n));
  else $n = $[59];
  let on;
  if (
    $[60] !== onDone ||
    $[61] !== vo ||
    $[62] !== bn ||
    $[63] !== Go ||
    $[64] !== Sn ||
    $[65] !== $n ||
    $[66] !== Ro
  )
    ((on = r(Dialog, {
      title: Ro,
      subtitle: vo,
      onCancel: onDone,
      color: "background",
      inputGuide: bn,
      children: [Go, Sn, $n],
    })),
      ($[60] = onDone),
      ($[61] = vo),
      ($[62] = bn),
      ($[63] = Go),
      ($[64] = Sn),
      ($[65] = $n),
      ($[66] = Ro),
      ($[67] = on));
  else on = $[67];
  let _o;
  if ($[68] !== Et || $[69] !== on)
    ((_o = e(FocusColumn, { onKeyDown: Et, children: on })), ($[68] = Et), ($[69] = on), ($[70] = _o));
  else _o = $[70];
  return _o;
}

export { InProcessTeammateDetailDialog };
