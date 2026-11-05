/**
 * components/tasks/McpTaskDetailDialog.tsx
 *
 * 2.1.316 新增：MCP 服务器任务详情对话框（状态、轮询、停止、返回）。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-e3632sxp.js (1)
 * attribution: placement 1
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { useMemoCache } from "../../../vendor/react/compiler-runtime.js";
import { useConfirmationKeys, useElapsedTicker } from "../ConfirmationPrompt.js";
import { formatShortDuration, sanitizeTaskLabel } from "../../services/mcp/mcpTaskCapability.js";
import { MEMO_CACHE_SENTINEL } from "../../../runtime/bun-runtime.js";
import {
  jsxProd_default,
  jsxProd_default_2,
} from "../../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { KeyboardShortcutHint } from "../design-system/KeyboardShortcutHint.js";
import { Byline } from "../design-system/Byline.js";
import { cleanTaskDescription } from "../../utils/taskDescription.js";
import { Text, Box } from "../../ink/components/Text.js";
import { Dialog } from "../design-system/Dialog.js";
import { FocusColumn } from "../design-system/FocusColumn.js";

//@ chunk-e3632sxp.js:5522-8571 placement
/**
 * MCP 服务器任务详情对话框（状态、轮询、停止、返回）。
 */
function McpTaskDetailDialog(props) {
  let $ = useMemoCache(63);
  let { task, onDone, onKill, onBack } = props;
  let onKill_2;
  if ($[0] !== onBack || $[1] !== onKill || $[2] !== task.status) {
    onKill_2 =
      task.status === "running" && onKill
        ? () => {
            onKill();
            onBack();
          }
        : undefined;
    $[0] = onBack;
    $[1] = onKill;
    $[2] = task.status;
    $[3] = onKill_2;
  } else onKill_2 = $[3];
  let confirmationHandlers;
  if ($[4] !== onBack || $[5] !== onDone || $[6] !== onKill_2) {
    confirmationHandlers = {
      onClose: onDone,
      onBack,
      onKill: onKill_2,
    };
    $[4] = onBack;
    $[5] = onDone;
    $[6] = onKill_2;
    $[7] = confirmationHandlers;
  } else confirmationHandlers = $[7];
  let onKeyDown = useConfirmationKeys(confirmationHandlers);
  let elapsedTicker = useElapsedTicker(task.startTime, task.status === "running", 1000, 0, task.endTime);
  let pollIntervalLabel;
  if ($[8] !== task.pollIntervalMs) {
    pollIntervalLabel =
      task.pollIntervalMs === undefined ? undefined : formatShortDuration(task.pollIntervalMs);
    $[8] = task.pollIntervalMs;
    $[9] = pollIntervalLabel;
  } else pollIntervalLabel = $[9];
  let pollIntervalText = pollIntervalLabel;
  let mcpTaskId = task.mcpTaskId === task.id ? undefined : task.mcpTaskId;
  let escapeHint;
  if ($[10] === MEMO_CACHE_SENTINEL) {
    escapeHint = jsxProd_default(KeyboardShortcutHint, {
      chord: "escape",
      action: "go back",
    });
    $[10] = escapeHint;
  } else escapeHint = $[10];
  let stopHint;
  if ($[11] !== onKill || $[12] !== task.status) {
    stopHint =
      task.status === "running" &&
      onKill &&
      jsxProd_default(KeyboardShortcutHint, {
        chord: "x",
        action: "stop",
      });
    $[11] = onKill;
    $[12] = task.status;
    $[13] = stopHint;
  } else stopHint = $[13];
  let inputGuide;
  if ($[14] !== stopHint) {
    inputGuide = jsxProd_default_2(Byline, {
      children: [escapeHint, stopHint],
    });
    $[14] = stopHint;
    $[15] = inputGuide;
  } else inputGuide = $[15];
  let serverLabel;
  if ($[16] !== task.serverName) {
    serverLabel = cleanTaskDescription(task.serverName) ?? "";
    $[16] = task.serverName;
    $[17] = serverLabel;
  } else serverLabel = $[17];
  let toolLabel;
  if ($[18] !== task.toolName) {
    toolLabel = cleanTaskDescription(task.toolName) ?? "";
    $[18] = task.toolName;
    $[19] = toolLabel;
  } else toolLabel = $[19];
  let titleElement;
  if ($[20] !== serverLabel || $[21] !== toolLabel) {
    titleElement = jsxProd_default_2(Text, {
      bold: true,
      children: [serverLabel, "/", toolLabel],
    });
    $[20] = serverLabel;
    $[21] = toolLabel;
    $[22] = titleElement;
  } else titleElement = $[22];
  let idElement;
  if ($[23] !== task.id) {
    idElement = jsxProd_default_2(Text, {
      dimColor: true,
      children: [" \xB7 ", task.id],
    });
    $[23] = task.id;
    $[24] = idElement;
  } else idElement = $[24];
  let headingElement;
  if ($[25] !== idElement || $[26] !== titleElement) {
    headingElement = jsxProd_default_2(Text, {
      children: [titleElement, idElement],
    });
    $[25] = idElement;
    $[26] = titleElement;
    $[27] = headingElement;
  } else headingElement = $[27];
  let mcpTaskIdElement;
  if ($[28] !== mcpTaskId) {
    mcpTaskIdElement =
      mcpTaskId &&
      jsxProd_default_2(Text, {
        dimColor: true,
        children: ["server task ", sanitizeTaskLabel(mcpTaskId)],
      });
    $[28] = mcpTaskId;
    $[29] = mcpTaskIdElement;
  } else mcpTaskIdElement = $[29];
  let statusLabelElement;
  if ($[30] === MEMO_CACHE_SENTINEL) {
    statusLabelElement = jsxProd_default(Text, {
      dimColor: true,
      children: "status ",
    });
    $[30] = statusLabelElement;
  } else statusLabelElement = $[30];
  let statusText;
  if ($[31] !== task.mcpStatus || $[32] !== task.status) {
    statusText = task.status === "killed" ? "stopped" : task.mcpStatus.replace("_", " ");
    $[31] = task.mcpStatus;
    $[32] = task.status;
    $[33] = statusText;
  } else statusText = $[33];
  let statusMessageElement;
  if ($[34] !== task.statusMessage) {
    statusMessageElement =
      task.statusMessage &&
      jsxProd_default_2(Text, {
        dimColor: true,
        children: [" ", "\xB7 ", cleanTaskDescription(task.statusMessage)],
      });
    $[34] = task.statusMessage;
    $[35] = statusMessageElement;
  } else statusMessageElement = $[35];
  let statusElement;
  if ($[36] !== statusText || $[37] !== statusMessageElement) {
    statusElement = jsxProd_default_2(Text, {
      children: [statusLabelElement, statusText, statusMessageElement],
    });
    $[36] = statusText;
    $[37] = statusMessageElement;
    $[38] = statusElement;
  } else statusElement = $[38];
  let elicitationNotice;
  if ($[39] !== task.mcpStatus || $[40] !== task.status) {
    elicitationNotice =
      task.mcpStatus === "input_required" &&
      task.status === "running" &&
      jsxProd_default(Text, {
        dimColor: true,
        children: "waiting for your answer in the elicitation dialog",
      });
    $[39] = task.mcpStatus;
    $[40] = task.status;
    $[41] = elicitationNotice;
  } else elicitationNotice = $[41];
  const elapsedPrefix = task.status === "running" ? "running for " : "ran for ";
  const pollHint = pollIntervalText !== undefined && ` \xB7 polls every ${pollIntervalText}`;
  let elapsedElement;
  if ($[42] !== elapsedTicker || $[43] !== elapsedPrefix || $[44] !== pollHint) {
    elapsedElement = jsxProd_default_2(Text, {
      dimColor: true,
      children: [elapsedPrefix, elapsedTicker, pollHint],
    });
    $[42] = elapsedTicker;
    $[43] = elapsedPrefix;
    $[44] = pollHint;
    $[45] = elapsedElement;
  } else elapsedElement = $[45];
  let protocolNotice;
  if ($[46] !== task.protocol || $[47] !== task.status) {
    protocolNotice =
      task.protocol === "sep2663" &&
      task.status === "running" &&
      jsxProd_default(Text, {
        dimColor: true,
        children: "runs on the server; survives exiting this session",
      });
    $[46] = task.protocol;
    $[47] = task.status;
    $[48] = protocolNotice;
  } else protocolNotice = $[48];
  let children;
  if (
    $[49] !== headingElement ||
    $[50] !== mcpTaskIdElement ||
    $[51] !== statusElement ||
    $[52] !== elicitationNotice ||
    $[53] !== elapsedElement ||
    $[54] !== protocolNotice
  ) {
    children = jsxProd_default_2(Box, {
      flexDirection: "column",
      children: [
        headingElement,
        mcpTaskIdElement,
        statusElement,
        elicitationNotice,
        elapsedElement,
        protocolNotice,
      ],
    });
    $[49] = headingElement;
    $[50] = mcpTaskIdElement;
    $[51] = statusElement;
    $[52] = elicitationNotice;
    $[53] = elapsedElement;
    $[54] = protocolNotice;
    $[55] = children;
  } else children = $[55];
  let children_2;
  if ($[56] !== onBack || $[57] !== children || $[58] !== inputGuide) {
    children_2 = jsxProd_default(Dialog, {
      onCancel: onBack,
      title: "MCP task",
      inputGuide,
      children,
    });
    $[56] = onBack;
    $[57] = children;
    $[58] = inputGuide;
    $[59] = children_2;
  } else children_2 = $[59];
  let dialogElement;
  if ($[60] !== onKeyDown || $[61] !== children_2) {
    dialogElement = jsxProd_default(FocusColumn, {
      onKeyDown,
      children: children_2,
    });
    $[60] = onKeyDown;
    $[61] = children_2;
    $[62] = dialogElement;
  } else dialogElement = $[62];
  return dialogElement;
}
export { McpTaskDetailDialog };
