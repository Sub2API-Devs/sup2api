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
import { init_react_production, qt, Se } from "../../../../vendor/react/cjs/react.production.js";
import { w } from "../../../../vendor/react/compiler-runtime.js";
import { MEMO_CACHE_SENTINEL } from "../../../../runtime/bun-runtime.js";
import {
  jsxProd_default,
  jsxProd_default_2,
  Fragment,
} from "../../../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { Text } from "../../../ink/components/Text.js";
import { MessageResponse } from "../../MessageResponse.js";

//@ chunk-ah34pb7m.js:25329-25333 placement
init_react_production();
//@ chunk-ah34pb7m.js:25333-25337 placement
init_react_production();
//@ chunk-ah34pb7m.js:25337-25341 placement
init_react_production();
//@ chunk-ah34pb7m.js:25341-25394 placement
function REJECTED_FEEDBACK_PLACEHOLDER() {
  return "What should Claude do instead?";
}
//@ chunk-ah34pb7m.js:25394-25408 placement
var interruptedByUserSignal = qt(false);
//@ chunk-ah34pb7m.js:25408-25727 placement
/**
 * "Interrupted" 提示行。
 */
function InterruptedByUser() {
  let d = w(3);
  if (Se(interruptedByUserSignal)) {
    let c;
    if (d[0] === MEMO_CACHE_SENTINEL) {
      c = jsxProd_default(Text, {
        dimColor: true,
        children: "Interrupted",
      });
      d[0] = c;
    } else c = d[0];
    return c;
  }
  let c;
  if (d[1] === MEMO_CACHE_SENTINEL) {
    c = jsxProd_default(Text, {
      dimColor: true,
      children: "Interrupted ",
    });
    d[1] = c;
  } else c = d[1];
  let g;
  if (d[2] === MEMO_CACHE_SENTINEL) {
    g = jsxProd_default_2(Fragment, {
      children: [
        c,
        jsxProd_default_2(Text, {
          dimColor: true,
          children: ["\xB7 ", REJECTED_FEEDBACK_PLACEHOLDER()],
        }),
      ],
    });
    d[2] = g;
  } else g = d[2];
  return g;
}
//@ chunk-ah34pb7m.js:25727-25831 callgraph-fingerprint = RejectedToolUseMessage (0.304)
function RejectedToolUseMessage() {
  let $ = w(1);
  let t0;
  if ($[0] === MEMO_CACHE_SENTINEL) {
    t0 = jsxProd_default(MessageResponse, {
      height: 1,
      children: jsxProd_default(InterruptedByUser, {}),
    });
    $[0] = t0;
  } else t0 = $[0];
  return t0;
}
export { RejectedToolUseMessage, REJECTED_FEEDBACK_PLACEHOLDER, interruptedByUserSignal };
