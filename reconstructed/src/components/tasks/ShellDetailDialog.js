/**
 * components/tasks/ShellDetailDialog.tsx
 *
 * 后台 shell/monitor 任务详情：输出尾部、运行时间、停止。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/components/tasks/ShellDetailDialog.tsx
 * pieces: chunk-18hwfzwa.js (5)
 * attribution: placement 1, fingerprint 4
 */
import { j, y, eJ, fo, Qr } from "../../../vendor/react/cjs/react.production.js";
import { e, Fragment, r } from "../../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { Text, Box } from "../../ink/components/Text.js";
import { tailOutputOfTask } from "../../utils/task/diskOutput.js";
import { w } from "../../../vendor/react/compiler-runtime.js";
import { useTerminalSize } from "../../hooks/useTerminalSize.js";
import { useInterval } from "../../ink/components/Input.js";
import { useConfirmationKeys } from "../ConfirmationPrompt.js";
import { truncateToWidth, formatDuration, formatFileSize } from "../../utils/format.js";
import { TaskDetailFooterHints } from "./taskStatusUtils.js";
import { MEMO_CACHE_SENTINEL } from "../../../runtime/bun-runtime.js";
import { FlexDirectionRow } from "../design-system/Table.js";
import { Dialog } from "../design-system/Dialog.js";
import { FocusColumn } from "../design-system/FocusColumn.js";
import { HintText } from "../design-system/HintText.js";

//@ chunk-18hwfzwa.js:721881-721885 placement
j();
//@ chunk-18hwfzwa.js:721885-721954 fingerprint = _temp2 (1)
function OXt(line_0, i_1) {
  return e(Text, { wrap: "truncate-end", children: line_0 }, i_1);
}
//@ chunk-18hwfzwa.js:721954-722090 fingerprint = getTaskOutput (1)
async function getTaskOutput(shell) {
  try {
    let x = await tailOutputOfTask(shell.id);
    return { content: x.content, bytesTotal: x.bytesTotal };
  } catch {
    return { content: "", bytesTotal: 0 };
  }
}
/**
 * 后台 shell / monitor 详情：命令、运行时长、输出尾部（截断行数），可停止。
 */
//@ chunk-18hwfzwa.js:722090-725128 fingerprint = ShellDetailDialog (0.637)
function ShellDetailDialog(t0) {
  let $ = w(51),
    { shell: shell, onDone: onDone, onKillShell: onKillShell, onBack: onBack } = t0,
    { columns: columns } = useTerminalSize(),
    Be;
  if ($[0] !== shell) ((Be = () => getTaskOutput(shell)), ($[0] = shell), ($[1] = Be));
  else Be = $[1];
  let [He, We] = y(Be),
    deferredOutputPromise = eJ(He),
    Xe;
  if ($[2] !== shell) ((Xe = () => We(getTaskOutput(shell))), ($[2] = shell), ($[3] = Xe));
  else Xe = $[3];
  useInterval(Xe, shell.status === "running" ? 1000 : null);
  let rt;
  if ($[4] !== onDone)
    ((rt = () => onDone("Shell details dismissed", { display: "system" })), ($[4] = onDone), ($[5] = rt));
  else rt = $[5];
  let kt = rt;
  const At = shell.status === "running" ? onKillShell : void 0;
  let It;
  if ($[6] !== kt || $[7] !== onBack || $[8] !== At)
    ((It = { onClose: kt, onBack: onBack, onKill: At }),
      ($[6] = kt),
      ($[7] = onBack),
      ($[8] = At),
      ($[9] = It));
  else It = $[9];
  let Ot = useConfirmationKeys(It),
    Et = shell.kind === "monitor",
    Dt;
  if ($[10] !== shell.command)
    ((Dt = truncateToWidth(shell.command, 280)), ($[10] = shell.command), ($[11] = Dt));
  else Dt = $[11];
  let Lt = Dt;
  const oo = Et ? "Monitor details" : "Shell details",
    Xt = !!onBack,
    io = shell.status === "running" && !!onKillShell;
  let so;
  if ($[12] !== Xt || $[13] !== io)
    ((so = e(TaskDetailFooterHints, { showBack: Xt, showStop: io })),
      ($[12] = Xt),
      ($[13] = io),
      ($[14] = so));
  else so = $[14];
  let po;
  if ($[15] === MEMO_CACHE_SENTINEL) ((po = [{ bold: !0 }, { width: { ratio: 1 } }]), ($[15] = po));
  else po = $[15];
  const ao = columns - 6;
  let co;
  if ($[16] === MEMO_CACHE_SENTINEL) ((co = e(Fragment, { children: "Status:" })), ($[16] = co));
  else co = $[16];
  let bo;
  if ($[17] !== shell.result || $[18] !== shell.status)
    ((bo = r(FlexDirectionRow.Row, {
      children: [
        co,
        shell.status === "running"
          ? r(Text, {
              color: "background",
              children: [shell.status, shell.result?.code !== void 0 && ` (exit code: ${shell.result.code})`],
            })
          : shell.status === "completed"
            ? r(Text, {
                color: "success",
                children: [
                  shell.status,
                  shell.result?.code !== void 0 && ` (exit code: ${shell.result.code})`,
                ],
              })
            : r(Text, {
                color: "error",
                children: [
                  shell.status,
                  shell.result?.code !== void 0 && ` (exit code: ${shell.result.code})`,
                ],
              }),
      ],
    })),
      ($[17] = shell.result),
      ($[18] = shell.status),
      ($[19] = bo));
  else bo = $[19];
  let Ao;
  if ($[20] === MEMO_CACHE_SENTINEL) ((Ao = e(Fragment, { children: "Runtime:" })), ($[20] = Ao));
  else Ao = $[20];
  let Bo;
  if ($[21] !== shell.endTime) ((Bo = shell.endTime ?? Date.now()), ($[21] = shell.endTime), ($[22] = Bo));
  else Bo = $[22];
  const Ro = Bo - shell.startTime;
  let Ho;
  if ($[23] !== Ro) ((Ho = formatDuration(Ro)), ($[23] = Ro), ($[24] = Ho));
  else Ho = $[24];
  let Io;
  if ($[25] !== Ho) ((Io = r(FlexDirectionRow.Row, { children: [Ao, Ho] })), ($[25] = Ho), ($[26] = Io));
  else Io = $[26];
  const Wo = Et ? "Script:" : "Command:";
  let mn;
  if ($[27] !== Wo) ((mn = e(Fragment, { children: Wo })), ($[27] = Wo), ($[28] = mn));
  else mn = $[28];
  let Cn;
  if ($[29] !== Lt || $[30] !== mn)
    ((Cn = r(FlexDirectionRow.Row, { children: [mn, Lt] })), ($[29] = Lt), ($[30] = mn), ($[31] = Cn));
  else Cn = $[31];
  let No;
  if ($[32] !== ao || $[33] !== bo || $[34] !== Io || $[35] !== Cn)
    ((No = r(FlexDirectionRow, { columns: po, forceWidth: ao, children: [bo, Io, Cn] })),
      ($[32] = ao),
      ($[33] = bo),
      ($[34] = Io),
      ($[35] = Cn),
      ($[36] = No));
  else No = $[36];
  let vo;
  if ($[37] === MEMO_CACHE_SENTINEL) ((vo = e(Text, { bold: !0, children: "Output:" })), ($[37] = vo));
  else vo = $[37];
  let Yo;
  if ($[38] === MEMO_CACHE_SENTINEL)
    ((Yo = e(Text, { dimColor: !0, children: "Loading output\u2026" })), ($[38] = Yo));
  else Yo = $[38];
  let kn;
  if ($[39] !== columns || $[40] !== deferredOutputPromise)
    ((kn = r(Box, {
      flexDirection: "column",
      children: [
        vo,
        e(fo, {
          fallback: Yo,
          children: e(ShellOutputContent, { outputPromise: deferredOutputPromise, columns: columns }),
        }),
      ],
    })),
      ($[39] = columns),
      ($[40] = deferredOutputPromise),
      ($[41] = kn));
  else kn = $[41];
  let Fn;
  if ($[42] !== kt || $[43] !== so || $[44] !== No || $[45] !== kn || $[46] !== oo)
    ((Fn = r(Dialog, { title: oo, onCancel: kt, color: "background", inputGuide: so, children: [No, kn] })),
      ($[42] = kt),
      ($[43] = so),
      ($[44] = No),
      ($[45] = kn),
      ($[46] = oo),
      ($[47] = Fn));
  else Fn = $[47];
  let bn;
  if ($[48] !== Ot || $[49] !== Fn)
    ((bn = e(FocusColumn, { onKeyDown: Ot, children: Fn })), ($[48] = Ot), ($[49] = Fn), ($[50] = bn));
  else bn = $[50];
  return bn;
}
//@ chunk-18hwfzwa.js:725128-726327 fingerprint = ShellOutputContent (0.835)
function ShellOutputContent(t0) {
  let $ = w(19),
    { outputPromise: outputPromise, columns: columns } = t0,
    { content: content, bytesTotal: bytesTotal } = Qr(outputPromise);
  if (!content) {
    let Re;
    if ($[0] === MEMO_CACHE_SENTINEL) ((Re = e(HintText, { children: "No output available" })), ($[0] = Re));
    else Re = $[0];
    return Re;
  }
  let Be, He;
  if ($[1] !== bytesTotal || $[2] !== content) {
    let starts = [];
    let pos = content.length;
    for (let Xe = 0; Xe < 10 && pos > 0; Xe++) {
      let index = content.lastIndexOf(
        `
`,
        pos - 1,
      );
      (starts.push(index + 1), (pos = index));
    }
    starts.reverse();
    Be = bytesTotal > content.length;
    He = [];
    for (let kt = 0; kt < starts.length; kt++) {
      let start = starts[kt];
      let end = kt < starts.length - 1 ? starts[kt + 1] - 1 : content.length;
      let line = content.slice(start, end);
      if (line) He.push(line);
    }
    (($[1] = bytesTotal), ($[2] = content), ($[3] = Be), ($[4] = He));
  } else ((Be = $[3]), (He = $[4]));
  const t1 = columns - 6;
  let Et;
  if ($[5] !== He) ((Et = He.map(OXt)), ($[5] = He), ($[6] = Et));
  else Et = $[6];
  let Dt;
  if ($[7] !== t1 || $[8] !== Et)
    ((Dt = e(Box, {
      borderStyle: "round",
      paddingX: 1,
      flexDirection: "column",
      height: 12,
      maxWidth: t1,
      children: Et,
    })),
      ($[7] = t1),
      ($[8] = Et),
      ($[9] = Dt));
  else Dt = $[9];
  const t4 = `Showing ${He.length} lines`;
  let oo;
  if ($[10] !== bytesTotal || $[11] !== Be)
    ((oo = Be ? ` of ${formatFileSize(bytesTotal)}` : ""), ($[10] = bytesTotal), ($[11] = Be), ($[12] = oo));
  else oo = $[12];
  let Xt;
  if ($[13] !== t4 || $[14] !== oo)
    ((Xt = r(Text, { dimColor: !0, italic: !0, children: [t4, oo] })),
      ($[13] = t4),
      ($[14] = oo),
      ($[15] = Xt));
  else Xt = $[15];
  let io;
  if ($[16] !== Dt || $[17] !== Xt)
    ((io = r(Fragment, { children: [Dt, Xt] })), ($[16] = Dt), ($[17] = Xt), ($[18] = io));
  else io = $[18];
  return io;
}

export { ShellDetailDialog };
