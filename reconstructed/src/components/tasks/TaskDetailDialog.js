/**
 * components/tasks/TaskDetailDialog.tsx
 *
 * 2.1.316 新增。任务详情对话框分派。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-18hwfzwa.js (2)
 * attribution: placement 2
 */
import { remoteSessionProgressLabel } from "./RemoteSessionProgress.js";
import { w } from "../../../vendor/react/compiler-runtime.js";
import { useElapsedTicker, useConfirmationKeys } from "../ConfirmationPrompt.js";
import { e, r } from "../../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { Text, Box } from "../../ink/components/Text.js";
import { TaskDetailFooterHints } from "./taskStatusUtils.js";
import { MEMO_CACHE_SENTINEL } from "../../../runtime/bun-runtime.js";
import { Dialog } from "../design-system/Dialog.js";
import { FocusColumn } from "../design-system/FocusColumn.js";

/**
 * 远程任务状态短标签：completed→done，failed→error，否则取进度标签。
 */
//@ chunk-18hwfzwa.js:698928-699033 placement
function remoteTaskStatusLabel(h) {
  if (h.status === "completed") return "done";
  if (h.status === "failed") return "error";
  return remoteSessionProgressLabel(h);
}
//@ chunk-18hwfzwa.js:699033-700976 placement
function TaskDetailDialog(h) {
  let $ = w(25),
    { task: task, onDone: onDone, onBack: onBack, onKill: onKill } = h,
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
    ze;
  if ($[4] !== ke) ((ze = e(Text, { dimColor: !0, children: ke })), ($[4] = ke), ($[5] = ze));
  else ze = $[5];
  const Xe = !!onBack,
    rt = task.status === "running" && !!onKill;
  let kt;
  if ($[6] !== Xe || $[7] !== rt)
    ((kt = e(TaskDetailFooterHints, { showBack: Xe, showStop: rt })), ($[6] = Xe), ($[7] = rt), ($[8] = kt));
  else kt = $[8];
  let At;
  if ($[9] === MEMO_CACHE_SENTINEL) ((At = e(Text, { bold: !0, children: "Status:" })), ($[9] = At));
  else At = $[9];
  let It;
  if ($[10] !== task.status)
    ((It = r(Text, {
      children: [
        At,
        " ",
        task.status === "running"
          ? e(Text, { color: "background", children: "running" })
          : task.status === "completed"
            ? e(Text, { color: "success", children: task.status })
            : e(Text, { color: "error", children: task.status }),
      ],
    })),
      ($[10] = task.status),
      ($[11] = It));
  else It = $[11];
  const Ot =
    task.status === "running"
      ? task.gathersFromGitHubOrg
        ? "Scanning your repo, recent sessions, and your GitHub org, then drafting an auto-mode proposal. The review will pop up when it\u2019s ready."
        : "Scanning your repo and recent sessions, then drafting an auto-mode proposal. The review will pop up when it\u2019s ready."
      : task.status === "completed"
        ? "Scan finished \u2014 the proposal review pops up next (or has already been shown)."
        : "The scan ended without producing a proposal.";
  let Et;
  if ($[12] !== Ot) ((Et = e(Text, { dimColor: !0, children: Ot })), ($[12] = Ot), ($[13] = Et));
  else Et = $[13];
  let Dt;
  if ($[14] !== Et || $[15] !== It)
    ((Dt = r(Box, { flexDirection: "column", gap: 1, children: [It, Et] })),
      ($[14] = Et),
      ($[15] = It),
      ($[16] = Dt));
  else Dt = $[16];
  let Lt;
  if ($[17] !== onDone || $[18] !== Dt || $[19] !== ze || $[20] !== kt)
    ((Lt = e(Dialog, {
      title: "Auto-mode setup scan",
      subtitle: ze,
      onCancel: onDone,
      color: "background",
      inputGuide: kt,
      children: Dt,
    })),
      ($[17] = onDone),
      ($[18] = Dt),
      ($[19] = ze),
      ($[20] = kt),
      ($[21] = Lt));
  else Lt = $[21];
  let oo;
  if ($[22] !== We || $[23] !== Lt)
    ((oo = e(FocusColumn, { onKeyDown: We, children: Lt })), ($[22] = We), ($[23] = Lt), ($[24] = oo));
  else oo = $[24];
  return oo;
}

export { TaskDetailDialog, remoteTaskStatusLabel };
