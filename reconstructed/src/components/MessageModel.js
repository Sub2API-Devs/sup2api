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
import { e } from "../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { Text, Box } from "../ink/components/Text.js";

//@ chunk-ag5x7vhf.js:139092-139447 fingerprint = MessageModel (1)
function MessageModel(t0) {
  let $ = w(5),
    { message: message, isTranscriptMode: isTranscriptMode } = t0;
  if (message.type !== "assistant" || !shouldShowModelLabel(message, isTranscriptMode)) {
    return null;
  }
  const t1 = bunStringWidth(message.message.model) + 8;
  let _;
  if ($[0] !== message.message.model)
    ((_ = e(Text, { dimColor: !0, children: message.message.model })),
      ($[0] = message.message.model),
      ($[1] = _));
  else _ = $[1];
  let I;
  if ($[2] !== t1 || $[3] !== _)
    ((I = e(Box, { minWidth: t1, children: _ })), ($[2] = t1), ($[3] = _), ($[4] = I));
  else I = $[4];
  return I;
}

export { MessageModel };
