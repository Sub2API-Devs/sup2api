/**
 * components/tasks/DreamDetailDialog.tsx
 *
 * "Memory consolidation"（dream）后台任务详情。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/components/tasks/DreamDetailDialog.tsx
 * pieces: chunk-18hwfzwa.js (4)
 * attribution: file-local 1, fingerprint 2, layout 1
 */
import { r, e, Fragment } from "../../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { Box, Text } from "../../ink/components/Text.js";
import { plural } from "../../utils/stringUtils.js";
import { w } from "../../../vendor/react/compiler-runtime.js";
import { useElapsedTicker, useConfirmationKeys } from "../ConfirmationPrompt.js";
import { FocusColumn } from "../design-system/FocusColumn.js";
import { Dialog } from "../design-system/Dialog.js";
import { TaskDetailFooterHints } from "./taskStatusUtils.js";
import { MEMO_CACHE_SENTINEL } from "../../../runtime/bun-runtime.js";

//@ chunk-18hwfzwa.js:700976-701013 file-local
function BJt(t) {
  return t.text !== "";
}
//@ chunk-18hwfzwa.js:701013-701228 fingerprint = _temp2 (1)
function renderDreamTurn(turn, i) {
  return r(
    Box,
    {
      flexDirection: "column",
      children: [
        e(Text, { wrap: "wrap", children: turn.text }),
        turn.toolUseCount > 0 &&
          r(Text, {
            dimColor: !0,
            children: ["  ", "(", turn.toolUseCount, " ", plural(turn.toolUseCount, "tool"), ")"],
          }),
      ],
    },
    i,
  );
}
//@ chunk-18hwfzwa.js:701228-701238 layout
var eze = 6;
/**
 * 记忆整理（dream）任务详情：涉及的会话与文件数、当前步骤与工具活动。
 */
//@ chunk-18hwfzwa.js:701238-704222 fingerprint = DreamDetailDialog (0.639)
function DreamDetailDialog(t0) {
  let $ = w(59),
    { task: task, onDone: onDone, onBack: onBack, onKill: onKill } = t0,
    ke = useElapsedTicker(task.startTime, task.status === "running", 1000, 0, task.endTime);
  const Re = task.status === "running" ? onKill : void 0;
  let He;
  if ($[0] !== onBack || $[1] !== onDone || $[2] !== Re)
    ((He = { onClose: onDone, onBack: onBack, onKill: Re }),
      ($[0] = onBack),
      ($[1] = onDone),
      ($[2] = Re),
      ($[3] = He));
  else He = $[3];
  let We = useConfirmationKeys(He),
    ze,
    Xe,
    rt,
    kt,
    At,
    It,
    Ot,
    Et,
    Dt,
    Lt,
    oo,
    Xt,
    io;
  if (
    $[4] !== ke ||
    $[5] !== We ||
    $[6] !== onBack ||
    $[7] !== onDone ||
    $[8] !== onKill ||
    $[9] !== task.filesTouched.length ||
    $[10] !== task.sessionsReviewing ||
    $[11] !== task.status ||
    $[12] !== task.turns
  ) {
    let visibleTurns = task.turns.filter(BJt);
    let shown = visibleTurns.slice(-eze);
    let hidden = visibleTurns.length - shown.length;
    rt = FocusColumn;
    It = We;
    Xe = Dialog;
    oo = "Memory consolidation";
    const t17 = task.sessionsReviewing;
    let bo;
    if ($[26] !== task.sessionsReviewing)
      ((bo = plural(task.sessionsReviewing, "session")), ($[26] = task.sessionsReviewing), ($[27] = bo));
    else bo = $[27];
    let Ao;
    if ($[28] !== task.filesTouched.length)
      ((Ao =
        task.filesTouched.length > 0 &&
        r(Fragment, {
          children: [
            " ",
            "\xB7 ",
            task.filesTouched.length,
            " ",
            plural(task.filesTouched.length, "file"),
            " touched",
          ],
        })),
        ($[28] = task.filesTouched.length),
        ($[29] = Ao));
    else Ao = $[29];
    if ($[30] !== ke || $[31] !== bo || $[32] !== Ao || $[33] !== task.sessionsReviewing)
      ((Xt = r(Text, { dimColor: !0, children: [ke, " \xB7 reviewing ", t17, " ", bo, Ao] })),
        ($[30] = ke),
        ($[31] = bo),
        ($[32] = Ao),
        ($[33] = task.sessionsReviewing),
        ($[34] = Xt));
    else Xt = $[34];
    io = onDone;
    kt = "background";
    const Bo = !!onBack;
    const Ro = task.status === "running" && !!onKill;
    if ($[35] !== Bo || $[36] !== Ro)
      ((At = e(TaskDetailFooterHints, { showBack: Bo, showStop: Ro })),
        ($[35] = Bo),
        ($[36] = Ro),
        ($[37] = At));
    else At = $[37];
    ze = Box;
    Ot = "column";
    Et = 1;
    let Ho;
    if ($[38] === MEMO_CACHE_SENTINEL) ((Ho = e(Text, { bold: !0, children: "Status:" })), ($[38] = Ho));
    else Ho = $[38];
    if ($[39] !== task.status)
      ((Dt = r(Text, {
        children: [
          Ho,
          " ",
          task.status === "running"
            ? e(Text, { color: "background", children: "running" })
            : task.status === "completed"
              ? e(Text, { color: "success", children: task.status })
              : e(Text, { color: "error", children: task.status }),
        ],
      })),
        ($[39] = task.status),
        ($[40] = Dt));
    else Dt = $[40];
    Lt =
      shown.length === 0
        ? e(Text, {
            dimColor: !0,
            children: task.status === "running" ? "Starting\u2026" : "(no text output)",
          })
        : r(Fragment, {
            children: [
              hidden > 0 &&
                r(Text, { dimColor: !0, children: ["(", hidden, " earlier ", plural(hidden, "turn"), ")"] }),
              shown.map(renderDreamTurn),
            ],
          });
    (($[4] = ke),
      ($[5] = We),
      ($[6] = onBack),
      ($[7] = onDone),
      ($[8] = onKill),
      ($[9] = task.filesTouched.length),
      ($[10] = task.sessionsReviewing),
      ($[11] = task.status),
      ($[12] = task.turns),
      ($[13] = ze),
      ($[14] = Xe),
      ($[15] = rt),
      ($[16] = kt),
      ($[17] = At),
      ($[18] = It),
      ($[19] = Ot),
      ($[20] = Et),
      ($[21] = Dt),
      ($[22] = Lt),
      ($[23] = oo),
      ($[24] = Xt),
      ($[25] = io));
  } else
    ((ze = $[13]),
      (Xe = $[14]),
      (rt = $[15]),
      (kt = $[16]),
      (At = $[17]),
      (It = $[18]),
      (Ot = $[19]),
      (Et = $[20]),
      (Dt = $[21]),
      (Lt = $[22]),
      (oo = $[23]),
      (Xt = $[24]),
      (io = $[25]));
  let co;
  if ($[41] !== ze || $[42] !== Ot || $[43] !== Et || $[44] !== Dt || $[45] !== Lt)
    ((co = r(ze, { flexDirection: Ot, gap: Et, children: [Dt, Lt] })),
      ($[41] = ze),
      ($[42] = Ot),
      ($[43] = Et),
      ($[44] = Dt),
      ($[45] = Lt),
      ($[46] = co));
  else co = $[46];
  let bo;
  if (
    $[47] !== Xe ||
    $[48] !== kt ||
    $[49] !== At ||
    $[50] !== co ||
    $[51] !== oo ||
    $[52] !== Xt ||
    $[53] !== io
  )
    ((bo = e(Xe, { title: oo, subtitle: Xt, onCancel: io, color: kt, inputGuide: At, children: co })),
      ($[47] = Xe),
      ($[48] = kt),
      ($[49] = At),
      ($[50] = co),
      ($[51] = oo),
      ($[52] = Xt),
      ($[53] = io),
      ($[54] = bo));
  else bo = $[54];
  let Ao;
  if ($[55] !== rt || $[56] !== It || $[57] !== bo)
    ((Ao = e(rt, { onKeyDown: It, children: bo })), ($[55] = rt), ($[56] = It), ($[57] = bo), ($[58] = Ao));
  else Ao = $[58];
  return Ao;
}

export { DreamDetailDialog };
