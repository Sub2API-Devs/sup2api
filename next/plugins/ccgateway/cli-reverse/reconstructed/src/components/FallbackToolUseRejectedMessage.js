/**
 * components/FallbackToolUseRejectedMessage.tsx
 *
 * 工具被拒绝的兜底渲染（"User rejected …"）。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/components/FallbackToolUseRejectedMessage.tsx
 * pieces: chunk-abqy9pdy.js (1)
 * attribution: callgraph-fingerprint 1
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { jsxProd_default } from "../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { MessageResponse } from "./MessageResponse.js";
import { Text } from "../ink/components/Text.js";

//@ chunk-abqy9pdy.js:372-465 callgraph-fingerprint (2.1.88 match: FallbackToolUseRejectedMessage, 0.196)
function FallbackToolUseRejectedMessage() {
  return jsxProd_default(MessageResponse, {
    height: 1,
    children: jsxProd_default(Text, {
      dimColor: true,
      children: "Fetching\u2026",
    }),
  });
}
export { FallbackToolUseRejectedMessage };
