/**
 * components/MessageModel.tsx
 *
 * 在 verbose/transcript 下显示助手消息所用模型名。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/components/MessageModel.tsx
 * pieces: chunk-ag5x7vhf.js (1)
 * attribution: fingerprint 1
 */
import { w } from "../../vendor/react/compiler-runtime.js";
import { shouldShowModelLabel } from "./MessageRow.js";
import { bunStringWidth } from "../ink/stringWidth.js";
import { jsxProd_default } from "../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { Text, Box } from "../ink/components/Text.js";

//@ chunk-ag5x7vhf.js:139092-139447 fingerprint = MessageModel (1)
function MessageModel(props) {
  let $ = w(5);
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
