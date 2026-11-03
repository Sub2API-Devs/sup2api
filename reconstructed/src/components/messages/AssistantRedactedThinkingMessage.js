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
import { w } from "../../../vendor/react/compiler-runtime.js";
import { MEMO_CACHE_SENTINEL } from "../../../runtime/bun-runtime.js";
import { r, e } from "../../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { Text, Box } from "../../ink/components/Text.js";

//@ chunk-ah34pb7m.js:43247-43543 fingerprint = AssistantRedactedThinkingMessage (0.369)
function AssistantRedactedThinkingMessage(t0) {
  let $ = w(3),
    { addMargin: t1 } = t0;
  const g = (t1 === void 0 ? !1 : t1) ? 1 : 0;
  let h;
  if ($[0] === MEMO_CACHE_SENTINEL)
    ((h = r(Text, {
      dimColor: !0,
      italic: !0,
      children: [e(Text, { "aria-hidden": !0, children: "\u273B " }), "Thinking\u2026"],
    })),
      ($[0] = h));
  else h = $[0];
  let M;
  if ($[1] !== g) ((M = e(Box, { marginTop: g, children: h })), ($[1] = g), ($[2] = M));
  else M = $[2];
  return M;
}

export { AssistantRedactedThinkingMessage };
