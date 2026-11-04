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

//@ chunk-ah34pb7m.js:25329-25333 placement
// deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-ah34pb7m.js:25329", () => {
  init_react_production();
});
//@ chunk-ah34pb7m.js:25333-25337 placement
// deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-ah34pb7m.js:25333", () => {
  init_react_production();
});
//@ chunk-ah34pb7m.js:25337-25341 placement
// deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-ah34pb7m.js:25337", () => {
  init_react_production();
});
//@ chunk-ah34pb7m.js:25341-25394 placement
function REJECTED_FEEDBACK_PLACEHOLDER() {
  return "What should Claude do instead?";
}
//@ chunk-ah34pb7m.js:25394-25408 placement
var interruptedByUserSignal; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-ah34pb7m.js:25394", () => {
  interruptedByUserSignal = createContext(false);
});
//@ chunk-ah34pb7m.js:25408-25727 placement
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
//@ chunk-ah34pb7m.js:25727-25831 callgraph-fingerprint = RejectedToolUseMessage (0.304)
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
export { RejectedToolUseMessage, REJECTED_FEEDBACK_PLACEHOLDER, interruptedByUserSignal };
