/**
 * components/tasks/McpTaskDetailDialog.tsx
 *
 * 2.1.316 新增：MCP 服务器任务详情对话框（状态、轮询、停止、返回）。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-qd18c590.js (1)
 * attribution: placement 1
 */
import { w } from "../../../vendor/react/compiler-runtime.js";
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

//@ chunk-qd18c590.js:5186-8235 placement
/**
 * MCP 服务器任务详情对话框（状态、轮询、停止、返回）。
 */
function McpTaskDetailDialog(props) {
  let a = w(63);
  let { task, onDone, onKill, onBack } = props;
  let onKill_2;
  if (a[0] !== onBack || a[1] !== onKill || a[2] !== task.status) {
    onKill_2 =
      task.status === "running" && onKill
        ? () => {
            onKill();
            onBack();
          }
        : undefined;
    a[0] = onBack;
    a[1] = onKill;
    a[2] = task.status;
    a[3] = onKill_2;
  } else onKill_2 = a[3];
  let A;
  if (a[4] !== onBack || a[5] !== onDone || a[6] !== onKill_2) {
    A = {
      onClose: onDone,
      onBack,
      onKill: onKill_2,
    };
    a[4] = onBack;
    a[5] = onDone;
    a[6] = onKill_2;
    a[7] = A;
  } else A = a[7];
  let onKeyDown = useConfirmationKeys(A);
  let elapsedTicker = useElapsedTicker(task.startTime, task.status === "running", 1000, 0, task.endTime);
  let E;
  if (a[8] !== task.pollIntervalMs) {
    E = task.pollIntervalMs === undefined ? undefined : formatShortDuration(task.pollIntervalMs);
    a[8] = task.pollIntervalMs;
    a[9] = E;
  } else E = a[9];
  let J = E;
  let mcpTaskId = task.mcpTaskId === task.id ? undefined : task.mcpTaskId;
  let O;
  if (a[10] === MEMO_CACHE_SENTINEL) {
    O = jsxProd_default(KeyboardShortcutHint, {
      chord: "escape",
      action: "go back",
    });
    a[10] = O;
  } else O = a[10];
  let p;
  if (a[11] !== onKill || a[12] !== task.status) {
    p =
      task.status === "running" &&
      onKill &&
      jsxProd_default(KeyboardShortcutHint, {
        chord: "x",
        action: "stop",
      });
    a[11] = onKill;
    a[12] = task.status;
    a[13] = p;
  } else p = a[13];
  let inputGuide;
  if (a[14] !== p) {
    inputGuide = jsxProd_default_2(Byline, {
      children: [O, p],
    });
    a[14] = p;
    a[15] = inputGuide;
  } else inputGuide = a[15];
  let c;
  if (a[16] !== task.serverName) {
    c = cleanTaskDescription(task.serverName) ?? "";
    a[16] = task.serverName;
    a[17] = c;
  } else c = a[17];
  let u;
  if (a[18] !== task.toolName) {
    u = cleanTaskDescription(task.toolName) ?? "";
    a[18] = task.toolName;
    a[19] = u;
  } else u = a[19];
  let f;
  if (a[20] !== c || a[21] !== u) {
    f = jsxProd_default_2(Text, {
      bold: true,
      children: [c, "/", u],
    });
    a[20] = c;
    a[21] = u;
    a[22] = f;
  } else f = a[22];
  let g;
  if (a[23] !== task.id) {
    g = jsxProd_default_2(Text, {
      dimColor: true,
      children: [" \xB7 ", task.id],
    });
    a[23] = task.id;
    a[24] = g;
  } else g = a[24];
  let C;
  if (a[25] !== g || a[26] !== f) {
    C = jsxProd_default_2(Text, {
      children: [f, g],
    });
    a[25] = g;
    a[26] = f;
    a[27] = C;
  } else C = a[27];
  let v;
  if (a[28] !== mcpTaskId) {
    v =
      mcpTaskId &&
      jsxProd_default_2(Text, {
        dimColor: true,
        children: ["server task ", sanitizeTaskLabel(mcpTaskId)],
      });
    a[28] = mcpTaskId;
    a[29] = v;
  } else v = a[29];
  let Q;
  if (a[30] === MEMO_CACHE_SENTINEL) {
    Q = jsxProd_default(Text, {
      dimColor: true,
      children: "status ",
    });
    a[30] = Q;
  } else Q = a[30];
  let T;
  if (a[31] !== task.mcpStatus || a[32] !== task.status) {
    T = task.status === "killed" ? "stopped" : task.mcpStatus.replace("_", " ");
    a[31] = task.mcpStatus;
    a[32] = task.status;
    a[33] = T;
  } else T = a[33];
  let I;
  if (a[34] !== task.statusMessage) {
    I =
      task.statusMessage &&
      jsxProd_default_2(Text, {
        dimColor: true,
        children: [" ", "\xB7 ", cleanTaskDescription(task.statusMessage)],
      });
    a[34] = task.statusMessage;
    a[35] = I;
  } else I = a[35];
  let M;
  if (a[36] !== T || a[37] !== I) {
    M = jsxProd_default_2(Text, {
      children: [Q, T, I],
    });
    a[36] = T;
    a[37] = I;
    a[38] = M;
  } else M = a[38];
  let y;
  if (a[39] !== task.mcpStatus || a[40] !== task.status) {
    y =
      task.mcpStatus === "input_required" &&
      task.status === "running" &&
      jsxProd_default(Text, {
        dimColor: true,
        children: "waiting for your answer in the elicitation dialog",
      });
    a[39] = task.mcpStatus;
    a[40] = task.status;
    a[41] = y;
  } else y = a[41];
  const j = task.status === "running" ? "running for " : "ran for ";
  const G = J !== undefined && ` \xB7 polls every ${J}`;
  let B;
  if (a[42] !== elapsedTicker || a[43] !== j || a[44] !== G) {
    B = jsxProd_default_2(Text, {
      dimColor: true,
      children: [j, elapsedTicker, G],
    });
    a[42] = elapsedTicker;
    a[43] = j;
    a[44] = G;
    a[45] = B;
  } else B = a[45];
  let D;
  if (a[46] !== task.protocol || a[47] !== task.status) {
    D =
      task.protocol === "sep2663" &&
      task.status === "running" &&
      jsxProd_default(Text, {
        dimColor: true,
        children: "runs on the server; survives exiting this session",
      });
    a[46] = task.protocol;
    a[47] = task.status;
    a[48] = D;
  } else D = a[48];
  let children;
  if (a[49] !== C || a[50] !== v || a[51] !== M || a[52] !== y || a[53] !== B || a[54] !== D) {
    children = jsxProd_default_2(Box, {
      flexDirection: "column",
      children: [C, v, M, y, B, D],
    });
    a[49] = C;
    a[50] = v;
    a[51] = M;
    a[52] = y;
    a[53] = B;
    a[54] = D;
    a[55] = children;
  } else children = a[55];
  let children_2;
  if (a[56] !== onBack || a[57] !== children || a[58] !== inputGuide) {
    children_2 = jsxProd_default(Dialog, {
      onCancel: onBack,
      title: "MCP task",
      inputGuide,
      children,
    });
    a[56] = onBack;
    a[57] = children;
    a[58] = inputGuide;
    a[59] = children_2;
  } else children_2 = a[59];
  let U;
  if (a[60] !== onKeyDown || a[61] !== children_2) {
    U = jsxProd_default(FocusColumn, {
      onKeyDown,
      children: children_2,
    });
    a[60] = onKeyDown;
    a[61] = children_2;
    a[62] = U;
  } else U = a[62];
  return U;
}
