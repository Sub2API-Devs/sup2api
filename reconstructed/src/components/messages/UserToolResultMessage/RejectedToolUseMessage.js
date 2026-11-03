/**
 * components/messages/UserToolResultMessage/RejectedToolUseMessage.tsx
 *
 * 通用 "工具调用被拒绝" 显示。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/components/messages/UserToolResultMessage/RejectedToolUseMessage.tsx
 * pieces: chunk-ah34pb7m.js (7)
 * attribution: placement 6, callgraph-fingerprint 1
 */
import { j, qt, Se } from "../../../../vendor/react/cjs/react.production.js";
import { w } from "../../../../vendor/react/compiler-runtime.js";
import { MEMO_CACHE_SENTINEL } from "../../../../runtime/bun-runtime.js";
import {
  e,
  r,
  Fragment,
} from "../../../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { Text } from "../../../ink/components/Text.js";
import { MessageResponse } from "../../MessageResponse.js";

//@ chunk-ah34pb7m.js:25329-25333 placement
j();
//@ chunk-ah34pb7m.js:25333-25337 placement
j();
//@ chunk-ah34pb7m.js:25337-25341 placement
j();
//@ chunk-ah34pb7m.js:25341-25394 placement
function Ii() {
  return "What should Claude do instead?";
}
//@ chunk-ah34pb7m.js:25394-25408 placement
var jt = qt(!1);
/**
 * "Interrupted" 提示行。
 */
//@ chunk-ah34pb7m.js:25408-25727 placement
function InterruptedByUser() {
  let d = w(3);
  if (Se(jt)) {
    let c;
    if (d[0] === MEMO_CACHE_SENTINEL) ((c = e(Text, { dimColor: !0, children: "Interrupted" })), (d[0] = c));
    else c = d[0];
    return c;
  }
  let c;
  if (d[1] === MEMO_CACHE_SENTINEL) ((c = e(Text, { dimColor: !0, children: "Interrupted " })), (d[1] = c));
  else c = d[1];
  let g;
  if (d[2] === MEMO_CACHE_SENTINEL)
    ((g = r(Fragment, { children: [c, r(Text, { dimColor: !0, children: ["\xB7 ", Ii()] })] })), (d[2] = g));
  else g = d[2];
  return g;
}
//@ chunk-ah34pb7m.js:25727-25831 callgraph-fingerprint = RejectedToolUseMessage (0.304)
function RejectedToolUseMessage() {
  let $ = w(1),
    t0;
  if ($[0] === MEMO_CACHE_SENTINEL)
    ((t0 = e(MessageResponse, { height: 1, children: e(InterruptedByUser, {}) })), ($[0] = t0));
  else t0 = $[0];
  return t0;
}

export { RejectedToolUseMessage, Ii, jt };
