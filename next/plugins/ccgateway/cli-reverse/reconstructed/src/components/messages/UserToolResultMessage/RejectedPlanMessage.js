/**
 * components/messages/UserToolResultMessage/RejectedPlanMessage.tsx
 *
 * 用户拒绝计划时显示 "User rejected Claude's plan:" 与计划内容。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/components/messages/UserToolResultMessage/RejectedPlanMessage.tsx
 * pieces: chunk-wjygkcr4.js (1)
 * attribution: fingerprint 1
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { useMemoCache } from "../../../../vendor/react/compiler-runtime.js";
import { MEMO_CACHE_SENTINEL } from "../../../../runtime/bun-runtime.js";
import {
  jsxProd_default,
  jsxProd_default_2,
} from "../../../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { Text, Box } from "../../../ink/components/Text.js";
import { MessageResponse } from "../../MessageResponse.js";
import { MarkdownText_2 } from "../../pluginUi/render/MarkdownBlock.js";

//@ chunk-wjygkcr4.js:15071-15427 fingerprint (2.1.88 match: RejectedPlanMessage, 0.802)
function RejectedPlanMessage(props) {
  let $ = useMemoCache(3);
  let { plan } = props;
  let t1;
  if ($[0] === MEMO_CACHE_SENTINEL) {
    t1 = jsxProd_default(Text, {
      color: "subtle",
      children: "User rejected Claude's plan:",
    });
    $[0] = t1;
  } else t1 = $[0];
  let t2;
  if ($[1] !== plan) {
    t2 = jsxProd_default(MessageResponse, {
      children: jsxProd_default_2(Box, {
        flexDirection: "column",
        children: [
          t1,
          jsxProd_default(Box, {
            borderStyle: "round",
            borderColor: "planMode",
            paddingX: 1,
            overflow: "hidden",
            children: jsxProd_default(MarkdownText_2, {
              children: plan,
            }),
          }),
        ],
      }),
    });
    $[1] = plan;
    $[2] = t2;
  } else t2 = $[2];
  return t2;
}
export { RejectedPlanMessage };
