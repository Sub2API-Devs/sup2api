/**
 * components/MessageModel.tsx
 *
 * 在 verbose/transcript 下显示助手消息所用模型名。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/components/MessageModel.tsx
 * pieces: chunk-hnxhr3bs.js (1)
 * attribution: fingerprint 1
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { useMemoCache } from "../../vendor/react/compiler-runtime.js";
import { shouldShowModelLabel } from "./MessageRow.js";
import { bunStringWidth } from "../ink/stringWidth.js";
import { jsxProd_default } from "../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { Text, Box } from "../ink/components/Text.js";

//@ chunk-hnxhr3bs.js:143282-143637 fingerprint (2.1.88 match: MessageModel, 1)
function MessageModel(props) {
  let $ = useMemoCache(5);
  let { message, isTranscriptMode } = props;
  if (message.type !== "assistant" || !shouldShowModelLabel(message, isTranscriptMode)) {
    return null;
  }
  const minWidth = bunStringWidth(message.message.model) + 8;
  let children;
  if ($[0] !== message.message.model) {
    children = jsxProd_default(Text, {
      dimColor: true,
      children: message.message.model,
    });
    $[0] = message.message.model;
    $[1] = children;
  } else children = $[1];
  let t3;
  if ($[2] !== minWidth || $[3] !== children) {
    t3 = jsxProd_default(Box, {
      minWidth,
      children,
    });
    $[2] = minWidth;
    $[3] = children;
    $[4] = t3;
  } else t3 = $[4];
  return t3;
}
export { MessageModel };
