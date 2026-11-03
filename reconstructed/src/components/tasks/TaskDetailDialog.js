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
import {
  jsxProd_default,
  jsxProd_default_2,
} from "../../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { Text, Box } from "../../ink/components/Text.js";
import { TaskDetailFooterHints } from "./taskStatusUtils.js";
import { MEMO_CACHE_SENTINEL } from "../../../runtime/bun-runtime.js";
import { Dialog } from "../design-system/Dialog.js";
import { FocusColumn } from "../design-system/FocusColumn.js";

//@ chunk-18hwfzwa.js:698928-699033 placement
/**
 * 远程任务状态短标签：completed→done，failed→error，否则取进度标签。
 */
function remoteTaskStatusLabel(h) {
  if (h.status === "completed") return "done";
  if (h.status === "failed") return "error";
  return remoteSessionProgressLabel(h);
}
//@ chunk-18hwfzwa.js:699033-700976 placement
function TaskDetailDialog(props) {
  let $ = w(25);
  let { task, onDone, onBack, onKill } = props;
  let children = useElapsedTicker(task.startTime, task.status === "running", 1000, 0, task.endTime);
  const onKill_2 = task.status === "running" ? onKill : undefined;
  let He;
  if ($[0] !== onBack || $[1] !== onDone || $[2] !== onKill_2) {
    He = {
      onClose: onDone,
      onBack,
      onKill: onKill_2,
    };
    $[0] = onBack;
    $[1] = onDone;
    $[2] = onKill_2;
    $[3] = He;
  } else He = $[3];
  let onKeyDown = useConfirmationKeys(He);
  let subtitle;
  if ($[4] !== children) {
    subtitle = jsxProd_default(Text, {
      dimColor: true,
      children,
    });
    $[4] = children;
    $[5] = subtitle;
  } else subtitle = $[5];
  const showBack = !!onBack;
  const showStop = task.status === "running" && !!onKill;
  let inputGuide;
  if ($[6] !== showBack || $[7] !== showStop) {
    inputGuide = jsxProd_default(TaskDetailFooterHints, {
      showBack,
      showStop,
    });
    $[6] = showBack;
    $[7] = showStop;
    $[8] = inputGuide;
  } else inputGuide = $[8];
  let At;
  if ($[9] === MEMO_CACHE_SENTINEL) {
    At = jsxProd_default(Text, {
      bold: true,
      children: "Status:",
    });
    $[9] = At;
  } else At = $[9];
  let It;
  if ($[10] !== task.status) {
    It = jsxProd_default_2(Text, {
      children: [
        At,
        " ",
        task.status === "running"
          ? jsxProd_default(Text, {
              color: "background",
              children: "running",
            })
          : task.status === "completed"
            ? jsxProd_default(Text, {
                color: "success",
                children: task.status,
              })
            : jsxProd_default(Text, {
                color: "error",
                children: task.status,
              }),
      ],
    });
    $[10] = task.status;
    $[11] = It;
  } else It = $[11];
  const children_2 =
    task.status === "running"
      ? task.gathersFromGitHubOrg
        ? "Scanning your repo, recent sessions, and your GitHub org, then drafting an auto-mode proposal. The review will pop up when it\u2019s ready."
        : "Scanning your repo and recent sessions, then drafting an auto-mode proposal. The review will pop up when it\u2019s ready."
      : task.status === "completed"
        ? "Scan finished \u2014 the proposal review pops up next (or has already been shown)."
        : "The scan ended without producing a proposal.";
  let Et;
  if ($[12] !== children_2) {
    Et = jsxProd_default(Text, {
      dimColor: true,
      children: children_2,
    });
    $[12] = children_2;
    $[13] = Et;
  } else Et = $[13];
  let children_3;
  if ($[14] !== Et || $[15] !== It) {
    children_3 = jsxProd_default_2(Box, {
      flexDirection: "column",
      gap: 1,
      children: [It, Et],
    });
    $[14] = Et;
    $[15] = It;
    $[16] = children_3;
  } else children_3 = $[16];
  let children_4;
  if ($[17] !== onDone || $[18] !== children_3 || $[19] !== subtitle || $[20] !== inputGuide) {
    children_4 = jsxProd_default(Dialog, {
      title: "Auto-mode setup scan",
      subtitle,
      onCancel: onDone,
      color: "background",
      inputGuide,
      children: children_3,
    });
    $[17] = onDone;
    $[18] = children_3;
    $[19] = subtitle;
    $[20] = inputGuide;
    $[21] = children_4;
  } else children_4 = $[21];
  let oo;
  if ($[22] !== onKeyDown || $[23] !== children_4) {
    oo = jsxProd_default(FocusColumn, {
      onKeyDown,
      children: children_4,
    });
    $[22] = onKeyDown;
    $[23] = children_4;
    $[24] = oo;
  } else oo = $[24];
  return oo;
}
export { TaskDetailDialog, remoteTaskStatusLabel };
