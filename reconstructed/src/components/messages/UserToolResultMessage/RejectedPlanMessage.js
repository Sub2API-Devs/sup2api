/**
 * components/messages/UserToolResultMessage/RejectedPlanMessage.tsx
 *
 * 用户拒绝计划时显示 "User rejected Claude's plan:" 与计划内容。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/components/messages/UserToolResultMessage/RejectedPlanMessage.tsx
 * pieces: chunk-ah34pb7m.js (1)
 * attribution: fingerprint 1
 */
import { w } from "../../../../vendor/react/compiler-runtime.js";
import { MEMO_CACHE_SENTINEL } from "../../../../runtime/bun-runtime.js";
import { e, r } from "../../../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { Text, Box } from "../../../ink/components/Text.js";
import { MessageResponse } from "../../MessageResponse.js";
import { MarkdownText_2 } from "../../pluginUi/render/MarkdownBlock.js";

//@ chunk-ah34pb7m.js:14788-15144 fingerprint = RejectedPlanMessage (0.802)
function RejectedPlanMessage(t0) {
  let $ = w(3),
    { plan: plan } = t0,
    g;
  if ($[0] === MEMO_CACHE_SENTINEL)
    ((g = e(Text, { color: "subtle", children: "User rejected Claude's plan:" })), ($[0] = g));
  else g = $[0];
  let f;
  if ($[1] !== plan)
    ((f = e(MessageResponse, {
      children: r(Box, {
        flexDirection: "column",
        children: [
          g,
          e(Box, {
            borderStyle: "round",
            borderColor: "planMode",
            paddingX: 1,
            overflow: "hidden",
            children: e(MarkdownText_2, { children: plan }),
          }),
        ],
      }),
    })),
      ($[1] = plan),
      ($[2] = f));
  else f = $[2];
  return f;
}

export { RejectedPlanMessage };
