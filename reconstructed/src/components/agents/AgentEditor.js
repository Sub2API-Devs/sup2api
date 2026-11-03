/**
 * components/agents/AgentEditor.tsx
 *
 * 子代理编辑器；本模块实际内容与云网关登录相关，疑似匹配错误。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/components/agents/AgentEditor.tsx
 * pieces: chunk-s5p7fp0c.js (1)
 * attribution: callgraph-fingerprint 1
 */
import { w } from "../../../vendor/react/compiler-runtime.js";
import { MEMO_CACHE_SENTINEL } from "../../../runtime/bun-runtime.js";
import { useKeybinding } from "../../keybindings/useKeybinding.js";
import { e, r } from "../../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { Text, Box } from "../../ink/components/Text.js";
import { lnn, dnn } from "../../services/oauth/gatewayLogin/GatewayLogin.js";
import { Spinner } from "../Spinner.js";

//@ chunk-s5p7fp0c.js:10633-11644 callgraph-fingerprint = AgentEditor (0.184)
function AgentEditor(A) {
  let $ = w(13),
    { userCode: userCode, verificationUri: verificationUri, onCancel: onCancel } = A,
    W;
  if ($[0] === MEMO_CACHE_SENTINEL) ((W = { context: "Confirmation" }), ($[0] = W));
  else W = $[0];
  useKeybinding("confirm:no", onCancel, W);
  let F, U;
  if ($[1] === MEMO_CACHE_SENTINEL)
    ((F = e(Text, { bold: !0, children: "Cloud gateway \xB7 sign in" })),
      (U = e(Text, { children: lnn })),
      ($[1] = F),
      ($[2] = U));
  else ((F = $[1]), (U = $[2]));
  let i;
  if ($[3] !== userCode)
    ((i = e(Box, {
      borderDimColor: !0,
      borderStyle: "round",
      paddingX: 2,
      children: e(Text, { bold: !0, color: "suggestion", children: userCode }),
    })),
      ($[3] = userCode),
      ($[4] = i));
  else i = $[4];
  let ae;
  if ($[5] === MEMO_CACHE_SENTINEL) ((ae = e(Text, { dimColor: !0, children: dnn })), ($[5] = ae));
  else ae = $[5];
  let x;
  if ($[6] !== verificationUri)
    ((x = r(Box, {
      flexDirection: "column",
      children: [ae, e(Text, { dimColor: !0, wrap: "wrap", children: verificationUri })],
    })),
      ($[6] = verificationUri),
      ($[7] = x));
  else x = $[7];
  let _, Q;
  if ($[8] === MEMO_CACHE_SENTINEL)
    ((_ = r(Box, {
      gap: 1,
      children: [
        e(Spinner, {}),
        e(Text, { dimColor: !0, children: "Waiting for sign-in to complete in your browser\u2026" }),
      ],
    })),
      (Q = e(Text, { dimColor: !0, children: "Press Esc to cancel" })),
      ($[8] = _),
      ($[9] = Q));
  else ((_ = $[8]), (Q = $[9]));
  let ue;
  if ($[10] !== i || $[11] !== x)
    ((ue = r(Box, { flexDirection: "column", gap: 1, children: [F, U, i, x, _, Q] })),
      ($[10] = i),
      ($[11] = x),
      ($[12] = ue));
  else ue = $[12];
  return ue;
}

export { AgentEditor };
