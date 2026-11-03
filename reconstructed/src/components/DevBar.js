/**
 * components/DevBar.tsx
 *
 * 开发者栏：显示 "Remote tool calling" 等远程工具调用状态与最近慢操作；本文件还混入了若干遥测 schema 常量（切分误归）。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/components/DevBar.tsx
 * pieces: chunk-18hwfzwa.js (1), chunk-b7gstm5r.js (3)
 * attribution: fingerprint 2, affinity 1, placement 1
 */
import { w } from "../../vendor/react/compiler-runtime.js";
import { MEMO_CACHE_SENTINEL } from "../../runtime/bun-runtime.js";
import { e, r } from "../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { Text, Box } from "../ink/components/Text.js";
import { UNATTENDED_CONSENT_LABELS } from "../services/remoteTools/unattendedServingConsent.js";
import { ListItem } from "./design-system/ListItem.js";

//@ chunk-b7gstm5r.js:20584-20613 affinity
var Rt = "Remote tool calling";
//@ chunk-b7gstm5r.js:20613-21639 fingerprint = DevBar (0.33)
function DevBar(a) {
  let $ = w(20),
    { state: state, isFocused: isFocused, notice: notice } = a,
    v;
  if ($[0] === MEMO_CACHE_SENTINEL) ((v = e(Text, { bold: !0, children: Rt })), ($[0] = v));
  else v = $[0];
  let b;
  if ($[1] === MEMO_CACHE_SENTINEL) ((b = e(Text, { dimColor: !0, children: " \xB7 " })), ($[1] = b));
  else b = $[1];
  const N = state.choice === "accepted" ? "success" : void 0,
    k = state.choice !== "accepted",
    I = UNATTENDED_CONSENT_LABELS[state.choice];
  let u;
  if ($[2] !== N || $[3] !== k || $[4] !== I)
    ((u = e(Text, { color: N, dimColor: k, children: I })), ($[2] = N), ($[3] = k), ($[4] = I), ($[5] = u));
  else u = $[5];
  let T;
  if ($[6] !== isFocused || $[7] !== u)
    ((T = r(Text, {
      bold: isFocused,
      wrap: "truncate-end",
      children: ["Unattended commands from cloud sessions", b, u],
    })),
      ($[6] = isFocused),
      ($[7] = u),
      ($[8] = T));
  else T = $[8];
  let p;
  if ($[9] !== isFocused || $[10] !== T)
    ((p = e(ListItem, { isFocused: isFocused, styled: !1, children: T })),
      ($[9] = isFocused),
      ($[10] = T),
      ($[11] = p));
  else p = $[11];
  let M;
  if ($[12] !== state.lockReason)
    ((M = state.lockReason !== void 0 && e(IndentedInactiveText, { children: state.lockReason })),
      ($[12] = state.lockReason),
      ($[13] = M));
  else M = $[13];
  let m;
  if ($[14] !== notice)
    ((m = notice !== null && e(IndentedInactiveText, { children: notice })), ($[14] = notice), ($[15] = m));
  else m = $[15];
  let D;
  if ($[16] !== m || $[17] !== p || $[18] !== M)
    ((D = r(Box, { marginTop: 1, flexDirection: "column", children: [v, p, M, m] })),
      ($[16] = m),
      ($[17] = p),
      ($[18] = M),
      ($[19] = D));
  else D = $[19];
  return D;
}
/**
 * React Compiler 产物：缩进 2 的灰色文本行组件（DevBar 使用），与 AskUserQuestion 无关。
 */
//@ chunk-b7gstm5r.js:21639-21796 placement = _temp (0.798)
function IndentedInactiveText(t0) {
  let o = w(2),
    { children: children } = t0,
    f;
  if (o[0] !== children)
    ((f = e(Box, { paddingLeft: 2, children: e(Text, { color: "inactive", children: children }) })),
      (o[0] = children),
      (o[1] = f));
  else f = o[1];
  return f;
}
//@ chunk-18hwfzwa.js:514449-514523 fingerprint = _temp (1)
function uJn(op) {
  return `${op.operation} (${Math.round(op.durationMs)}ms)`;
}

export { DevBar };
