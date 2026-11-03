/**
 * utils/autoRunIssue.tsx
 *
 * 自动运行 /issue 前的确认提示组件（Esc 取消）
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/utils/autoRunIssue.tsx
 * pieces: chunk-s5p7fp0c.js (1)
 * attribution: callgraph-fingerprint 1
 */
import { w } from "../../vendor/react/compiler-runtime.js";
import { MEMO_CACHE_SENTINEL } from "../../runtime/bun-runtime.js";
import { useKeybinding } from "../keybindings/useKeybinding.js";
import { e, r } from "../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { Spinner } from "../components/Spinner.js";
import { Box, Text } from "../ink/components/Text.js";

//@ chunk-s5p7fp0c.js:11644-12107 callgraph-fingerprint = AutoRunIssueNotification (0.382)
function AutoRunIssueNotification(t0) {
  let M = w(7),
    { label: label, onCancel: onCancel } = t0,
    L;
  if (M[0] === MEMO_CACHE_SENTINEL) ((L = { context: "Confirmation" }), (M[0] = L));
  else L = M[0];
  useKeybinding("confirm:no", onCancel, L);
  let W;
  if (M[1] === MEMO_CACHE_SENTINEL) ((W = e(Spinner, {})), (M[1] = W));
  else W = M[1];
  let F;
  if (M[2] !== label)
    ((F = r(Box, { gap: 1, children: [W, e(Text, { children: label })] })), (M[2] = label), (M[3] = F));
  else F = M[3];
  let U;
  if (M[4] === MEMO_CACHE_SENTINEL)
    ((U = e(Text, { dimColor: !0, children: "Press Esc to cancel" })), (M[4] = U));
  else U = M[4];
  let i;
  if (M[5] !== F)
    ((i = r(Box, { flexDirection: "column", gap: 1, children: [F, U] })), (M[5] = F), (M[6] = i));
  else i = M[6];
  return i;
}

export { AutoRunIssueNotification };
