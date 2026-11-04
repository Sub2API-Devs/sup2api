/**
 * components/messages/AssistantRedactedThinkingMessage.tsx
 *
 * 被加密（redacted）的思考块：显示 "✻ Thinking…"。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/components/messages/AssistantRedactedThinkingMessage.tsx
 * pieces: chunk-ah34pb7m.js (1)
 * attribution: fingerprint 1
 */
import { useMemoCache } from "../../../vendor/react/compiler-runtime.js";
import { MEMO_CACHE_SENTINEL } from "../../../runtime/bun-runtime.js";
import {
  jsxProd_default_2,
  jsxProd_default,
} from "../../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { Text, Box } from "../../ink/components/Text.js";

//@ chunk-ah34pb7m.js:43247-43543 fingerprint = AssistantRedactedThinkingMessage (0.369)
function AssistantRedactedThinkingMessage(props) {
  let $ = useMemoCache(3);
  let { addMargin } = props;
  const marginTop = (addMargin === undefined ? false : addMargin) ? 1 : 0;
  let children;
  if ($[0] === MEMO_CACHE_SENTINEL) {
    children = jsxProd_default_2(Text, {
      dimColor: true,
      italic: true,
      children: [
        jsxProd_default(Text, {
          "aria-hidden": true,
          children: "\u273B ",
        }),
        "Thinking\u2026",
      ],
    });
    $[0] = children;
  } else children = $[0];
  let t4;
  if ($[1] !== marginTop) {
    t4 = jsxProd_default(Box, {
      marginTop,
      children,
    });
    $[1] = marginTop;
    $[2] = t4;
  } else t4 = $[2];
  return t4;
}
export { AssistantRedactedThinkingMessage };
