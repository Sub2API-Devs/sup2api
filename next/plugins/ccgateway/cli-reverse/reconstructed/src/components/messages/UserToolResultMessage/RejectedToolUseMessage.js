/**
 * components/messages/UserToolResultMessage/RejectedToolUseMessage.tsx
 *
 * 通用 "工具调用被拒绝" 显示。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/components/messages/UserToolResultMessage/RejectedToolUseMessage.tsx
 * pieces: chunk-wjygkcr4.js (7)
 * attribution: placement 6, callgraph-fingerprint 1
 */
import {
  init_react_production,
  createContext,
  useContext,
} from "../../../../vendor/react/cjs/react.production.js";
import { useMemoCache } from "../../../../vendor/react/compiler-runtime.js";
import { MEMO_CACHE_SENTINEL } from "../../../../runtime/bun-runtime.js";
import {
  jsxProd_default,
  jsxProd_default_2,
  Fragment,
} from "../../../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { Text } from "../../../ink/components/Text.js";
import { MessageResponse } from "../../MessageResponse.js";
import { deferInit } from "../../../../runtime/deferred-init.js";

//@ chunk-wjygkcr4.js:25616-25620 placement
// deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-wjygkcr4.js:25616", () => {
  init_react_production();
});
//@ chunk-wjygkcr4.js:25620-25624 placement
// deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-wjygkcr4.js:25620", () => {
  init_react_production();
});
//@ chunk-wjygkcr4.js:25624-25677 placement
function REJECTED_FEEDBACK_PLACEHOLDER() {
  return "What should Claude do instead?";
}
//@ chunk-wjygkcr4.js:25677-25691 placement
var interruptedByUserSignal; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-wjygkcr4.js:25677", () => {
  interruptedByUserSignal = createContext(false);
});
//@ chunk-wjygkcr4.js:25691-26011 placement
/**
 * "Interrupted" 提示行。
 */
function InterruptedByUser() {
  let $ = useMemoCache(3);
  if (useContext(interruptedByUserSignal)) {
    let interruptedText;
    if ($[0] === MEMO_CACHE_SENTINEL) {
      interruptedText = jsxProd_default(Text, {
        dimColor: true,
        children: "Interrupted",
      });
      $[0] = interruptedText;
    } else interruptedText = $[0];
    return interruptedText;
  }
  let interruptedSpacer;
  if ($[1] === MEMO_CACHE_SENTINEL) {
    interruptedSpacer = jsxProd_default(Text, {
      dimColor: true,
      children: "Interrupted ",
    });
    $[1] = interruptedSpacer;
  } else interruptedSpacer = $[1];
  let fragmentElement;
  if ($[2] === MEMO_CACHE_SENTINEL) {
    fragmentElement = jsxProd_default_2(Fragment, {
      children: [
        interruptedSpacer,
        jsxProd_default_2(Text, {
          dimColor: true,
          children: ["\xB7 ", REJECTED_FEEDBACK_PLACEHOLDER()],
        }),
      ],
    });
    $[2] = fragmentElement;
  } else fragmentElement = $[2];
  return fragmentElement;
}
//@ chunk-wjygkcr4.js:26011-26115 callgraph-fingerprint (2.1.88 match: RejectedToolUseMessage, 0.304)
function RejectedToolUseMessage() {
  let $ = useMemoCache(1);
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
//@ chunk-wjygkcr4.js:37020-37024 placement
// deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-wjygkcr4.js:37020", () => {
  init_react_production();
});
export { RejectedToolUseMessage, interruptedByUserSignal, REJECTED_FEEDBACK_PLACEHOLDER };
