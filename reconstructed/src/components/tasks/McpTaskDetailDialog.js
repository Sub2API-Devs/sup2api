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
import { f3o, sanitizeTaskLabel } from "../../services/mcp/mcpTaskCapability.js";
import { MEMO_CACHE_SENTINEL } from "../../../runtime/bun-runtime.js";
import { e, r } from "../../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { KeyboardShortcutHint } from "../design-system/KeyboardShortcutHint.js";
import { Byline } from "../design-system/Byline.js";
import { vc } from "../../utils/taskDescription.js";
import { Text, Box } from "../../ink/components/Text.js";
import { Dialog } from "../design-system/Dialog.js";
import { FocusColumn } from "../design-system/FocusColumn.js";

/**
 * MCP 服务器任务详情对话框（状态、轮询、停止、返回）。
 */
//@ chunk-qd18c590.js:5186-8235 placement
function McpTaskDetailDialog(Z) {
  let a = w(63),
    { task: task, onDone: onDone, onKill: onKill, onBack: onBack } = Z,
    d;
  if (a[0] !== onBack || a[1] !== onKill || a[2] !== task.status)
    ((d =
      task.status === "running" && onKill
        ? () => {
            (onKill(), onBack());
          }
        : void 0),
      (a[0] = onBack),
      (a[1] = onKill),
      (a[2] = task.status),
      (a[3] = d));
  else d = a[3];
  let A;
  if (a[4] !== onBack || a[5] !== onDone || a[6] !== d)
    ((A = { onClose: onDone, onBack: onBack, onKill: d }),
      (a[4] = onBack),
      (a[5] = onDone),
      (a[6] = d),
      (a[7] = A));
  else A = a[7];
  let R = useConfirmationKeys(A),
    _ = useElapsedTicker(task.startTime, task.status === "running", 1000, 0, task.endTime),
    E;
  if (a[8] !== task.pollIntervalMs)
    ((E = task.pollIntervalMs === void 0 ? void 0 : f3o(task.pollIntervalMs)),
      (a[8] = task.pollIntervalMs),
      (a[9] = E));
  else E = a[9];
  let J = E,
    k = task.mcpTaskId === task.id ? void 0 : task.mcpTaskId,
    O;
  if (a[10] === MEMO_CACHE_SENTINEL)
    ((O = e(KeyboardShortcutHint, { chord: "escape", action: "go back" })), (a[10] = O));
  else O = a[10];
  let p;
  if (a[11] !== onKill || a[12] !== task.status)
    ((p = task.status === "running" && onKill && e(KeyboardShortcutHint, { chord: "x", action: "stop" })),
      (a[11] = onKill),
      (a[12] = task.status),
      (a[13] = p));
  else p = a[13];
  let m;
  if (a[14] !== p) ((m = r(Byline, { children: [O, p] })), (a[14] = p), (a[15] = m));
  else m = a[15];
  let c;
  if (a[16] !== task.serverName) ((c = vc(task.serverName) ?? ""), (a[16] = task.serverName), (a[17] = c));
  else c = a[17];
  let u;
  if (a[18] !== task.toolName) ((u = vc(task.toolName) ?? ""), (a[18] = task.toolName), (a[19] = u));
  else u = a[19];
  let f;
  if (a[20] !== c || a[21] !== u)
    ((f = r(Text, { bold: !0, children: [c, "/", u] })), (a[20] = c), (a[21] = u), (a[22] = f));
  else f = a[22];
  let g;
  if (a[23] !== task.id)
    ((g = r(Text, { dimColor: !0, children: [" \xB7 ", task.id] })), (a[23] = task.id), (a[24] = g));
  else g = a[24];
  let C;
  if (a[25] !== g || a[26] !== f)
    ((C = r(Text, { children: [f, g] })), (a[25] = g), (a[26] = f), (a[27] = C));
  else C = a[27];
  let v;
  if (a[28] !== k)
    ((v = k && r(Text, { dimColor: !0, children: ["server task ", sanitizeTaskLabel(k)] })),
      (a[28] = k),
      (a[29] = v));
  else v = a[29];
  let Q;
  if (a[30] === MEMO_CACHE_SENTINEL) ((Q = e(Text, { dimColor: !0, children: "status " })), (a[30] = Q));
  else Q = a[30];
  let T;
  if (a[31] !== task.mcpStatus || a[32] !== task.status)
    ((T = task.status === "killed" ? "stopped" : task.mcpStatus.replace("_", " ")),
      (a[31] = task.mcpStatus),
      (a[32] = task.status),
      (a[33] = T));
  else T = a[33];
  let I;
  if (a[34] !== task.statusMessage)
    ((I = task.statusMessage && r(Text, { dimColor: !0, children: [" ", "\xB7 ", vc(task.statusMessage)] })),
      (a[34] = task.statusMessage),
      (a[35] = I));
  else I = a[35];
  let M;
  if (a[36] !== T || a[37] !== I)
    ((M = r(Text, { children: [Q, T, I] })), (a[36] = T), (a[37] = I), (a[38] = M));
  else M = a[38];
  let y;
  if (a[39] !== task.mcpStatus || a[40] !== task.status)
    ((y =
      task.mcpStatus === "input_required" &&
      task.status === "running" &&
      e(Text, { dimColor: !0, children: "waiting for your answer in the elicitation dialog" })),
      (a[39] = task.mcpStatus),
      (a[40] = task.status),
      (a[41] = y));
  else y = a[41];
  const j = task.status === "running" ? "running for " : "ran for ",
    G = J !== void 0 && ` \xB7 polls every ${J}`;
  let B;
  if (a[42] !== _ || a[43] !== j || a[44] !== G)
    ((B = r(Text, { dimColor: !0, children: [j, _, G] })),
      (a[42] = _),
      (a[43] = j),
      (a[44] = G),
      (a[45] = B));
  else B = a[45];
  let D;
  if (a[46] !== task.protocol || a[47] !== task.status)
    ((D =
      task.protocol === "sep2663" &&
      task.status === "running" &&
      e(Text, { dimColor: !0, children: "runs on the server; survives exiting this session" })),
      (a[46] = task.protocol),
      (a[47] = task.status),
      (a[48] = D));
  else D = a[48];
  let K;
  if (a[49] !== C || a[50] !== v || a[51] !== M || a[52] !== y || a[53] !== B || a[54] !== D)
    ((K = r(Box, { flexDirection: "column", children: [C, v, M, y, B, D] })),
      (a[49] = C),
      (a[50] = v),
      (a[51] = M),
      (a[52] = y),
      (a[53] = B),
      (a[54] = D),
      (a[55] = K));
  else K = a[55];
  let h;
  if (a[56] !== onBack || a[57] !== K || a[58] !== m)
    ((h = e(Dialog, { onCancel: onBack, title: "MCP task", inputGuide: m, children: K })),
      (a[56] = onBack),
      (a[57] = K),
      (a[58] = m),
      (a[59] = h));
  else h = a[59];
  let U;
  if (a[60] !== R || a[61] !== h)
    ((U = e(FocusColumn, { onKeyDown: R, children: h })), (a[60] = R), (a[61] = h), (a[62] = U));
  else U = a[62];
  return U;
}
