/**
 * components/tasks/TaskDetailDialog.tsx
 *
 * 2.1.316 新增。任务详情对话框分派。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-czq1j3j2.js (2)
 * attribution: placement 2
 */
import { remoteSessionProgressLabel } from "./RemoteSessionProgress.js";
import { useMemoCache } from "../../../vendor/react/compiler-runtime.js";
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

//@ chunk-czq1j3j2.js:719666-719771 placement
/**
 * 远程任务状态短标签：completed→done，failed→error，否则取进度标签。
 */
function remoteTaskStatusLabel(task) {
  if (task.status === "completed") return "done";
  if (task.status === "failed") return "error";
  return remoteSessionProgressLabel(task);
}
//@ chunk-czq1j3j2.js:719771-721714 placement
function TaskDetailDialog(props) {
  let $ = useMemoCache(25);
  let { task, onDone, onBack, onKill } = props;
  let children = useElapsedTicker(task.startTime, task.status === "running", 1000, 0, task.endTime);
  const onKill_2 = task.status === "running" ? onKill : undefined;
  let confirmationHandlers;
  if ($[0] !== onBack || $[1] !== onDone || $[2] !== onKill_2) {
    confirmationHandlers = {
      onClose: onDone,
      onBack,
      onKill: onKill_2,
    };
    $[0] = onBack;
    $[1] = onDone;
    $[2] = onKill_2;
    $[3] = confirmationHandlers;
  } else confirmationHandlers = $[3];
  let onKeyDown = useConfirmationKeys(confirmationHandlers);
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
  let statusLabel;
  if ($[9] === MEMO_CACHE_SENTINEL) {
    statusLabel = jsxProd_default(Text, {
      bold: true,
      children: "Status:",
    });
    $[9] = statusLabel;
  } else statusLabel = $[9];
  let statusElement;
  if ($[10] !== task.status) {
    statusElement = jsxProd_default_2(Text, {
      children: [
        statusLabel,
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
    $[11] = statusElement;
  } else statusElement = $[11];
  const children_2 =
    task.status === "running"
      ? task.gathersFromGitHubOrg
        ? "Scanning your repo, recent sessions, and your GitHub org, then drafting an auto-mode proposal. The review will pop up when it\u2019s ready."
        : "Scanning your repo and recent sessions, then drafting an auto-mode proposal. The review will pop up when it\u2019s ready."
      : task.status === "completed"
        ? "Scan finished \u2014 the proposal review pops up next (or has already been shown)."
        : "The scan ended without producing a proposal.";
  let descriptionElement;
  if ($[12] !== children_2) {
    descriptionElement = jsxProd_default(Text, {
      dimColor: true,
      children: children_2,
    });
    $[12] = children_2;
    $[13] = descriptionElement;
  } else descriptionElement = $[13];
  let children_3;
  if ($[14] !== descriptionElement || $[15] !== statusElement) {
    children_3 = jsxProd_default_2(Box, {
      flexDirection: "column",
      gap: 1,
      children: [statusElement, descriptionElement],
    });
    $[14] = descriptionElement;
    $[15] = statusElement;
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
  let dialogElement;
  if ($[22] !== onKeyDown || $[23] !== children_4) {
    dialogElement = jsxProd_default(FocusColumn, {
      onKeyDown,
      children: children_4,
    });
    $[22] = onKeyDown;
    $[23] = children_4;
    $[24] = dialogElement;
  } else dialogElement = $[24];
  return dialogElement;
}
export { TaskDetailDialog, remoteTaskStatusLabel };
