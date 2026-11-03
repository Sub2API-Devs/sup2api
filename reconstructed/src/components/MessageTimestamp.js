/**
 * components/MessageTimestamp.tsx
 *
 * 消息时间戳显示组件。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/components/MessageTimestamp.tsx
 * pieces: chunk-ag5x7vhf.js (6)
 * attribution: placement 4, callgraph-fingerprint 1, sole-consumer 1
 */
import { formatFullTimestamp, eUt, formatClockTime } from "../utils/timeFormat.js";
import { getLocale } from "../utils/formatBriefTimestamp.js";
import { isPeerOrObserver, isHumanOrAutoContinuation, joinTextContent } from "../utils/messageProvenance.js";
import { qB } from "../utils/backgroundSessionResume.js";
import { isTaggedSystemUserText, isSystemishUserText } from "./messages/UserTextMessage.js";
import { w } from "../../vendor/react/compiler-runtime.js";
import { EARLY_RETURN_SENTINEL } from "../../runtime/bun-runtime.js";
import { Box, Text } from "../ink/components/Text.js";
import { bunStringWidth } from "../ink/stringWidth.js";
import { e } from "../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { j } from "../../vendor/react/cjs/react.production.js";

//@ chunk-ag5x7vhf.js:139447-139548 placement
function formatMessageTimestamp(m, h) {
  let date = new Date(m);
  if (Number.isNaN(date.getTime())) return "";
  return formatFullTimestamp(eUt(), date, getLocale(), h);
}
//@ chunk-ag5x7vhf.js:139548-139688 placement
function messageTimestampOf(m) {
  if (m.type === "attachment" && m.attachment.type === "queued_command")
    return m.attachment.timestamp ?? m.timestamp;
  return m.timestamp;
}
/**
 * 判断一条消息是否显示时间戳：排队的命令附件只对真人或对等方的提示显示；助手消息需含文本；用户消息排除压缩摘要、系统标签文本，图片总显示。
 */
//@ chunk-ag5x7vhf.js:139688-140413 placement
function shouldShowMessageTimestamp(message, showAssistant, showUser, isContinuation = !1) {
  if (!messageTimestampOf(message)) return !1;
  if (message.type === "attachment") {
    if (!showUser || message.attachment.type !== "queued_command") return !1;
    if (isPeerOrObserver(message.attachment.origin)) return !0;
    if (message.attachment.commandMode === void 0 && message.attachment.isMeta) return !1;
    if (
      message.attachment.commandMode === "prompt" &&
      !(
        qB(message.attachment.origin) ||
        (!message.attachment.isMeta && isHumanOrAutoContinuation(message.attachment.origin))
      )
    )
      return !1;
    let trimmed = joinTextContent(message.attachment.prompt).trim();
    return (message.attachment.imagePasteIds?.length ?? 0) > 0 || !isTaggedSystemUserText(trimmed);
  }
  if (message.type === "assistant")
    return (showUser || showAssistant) && message.message.content.some((k) => k.type === "text");
  if (message.type === "user") {
    if (!showUser || message.isCompactSummary || isContinuation) return !1;
    let k = message.message.content[0];
    if (k?.type === "image") return !0;
    if (k?.type !== "text" || typeof k.text !== "string") return !1;
    return !isSystemishUserText(message, k.text);
  }
  return !1;
}
//@ chunk-ag5x7vhf.js:140413-140985 callgraph-fingerprint = MessageTimestamp (0.251)
function MessageTimestamp(t0) {
  let $ = w(12),
    {
      message: message,
      isTranscriptMode: isTranscriptMode,
      showMessageTimestamps: showMessageTimestamps,
      isSplitUserContinuation: isSplitUserContinuation,
    } = t0,
    _ = showMessageTimestamps === void 0 ? !1 : showMessageTimestamps;
  if (
    !shouldShowMessageTimestamp(
      message,
      isTranscriptMode,
      _,
      isSplitUserContinuation === void 0 ? !1 : isSplitUserContinuation,
    )
  ) {
    return null;
  }
  let A, L, V, W;
  if ($[0] !== message || $[1] !== _) {
    W = EARLY_RETURN_SENTINEL;
    K: {
      let z = messageTimestampOf(message) ?? "";
      L = _ ? formatMessageTimestamp(z) : Aw(z);
      if (!L) {
        W = null;
        break K;
      }
      A = Box;
      V = bunStringWidth(L);
    }
    (($[0] = message), ($[1] = _), ($[2] = A), ($[3] = L), ($[4] = V), ($[5] = W));
  } else ((A = $[2]), (L = $[3]), (V = $[4]), (W = $[5]));
  if (W !== EARLY_RETURN_SENTINEL) return W;
  let q;
  if ($[6] !== L) ((q = e(Text, { dimColor: !0, children: L })), ($[6] = L), ($[7] = q));
  else q = $[7];
  let Y;
  if ($[8] !== A || $[9] !== V || $[10] !== q)
    ((Y = e(A, { minWidth: V, children: q })), ($[8] = A), ($[9] = V), ($[10] = q), ($[11] = Y));
  else Y = $[11];
  return Y;
}
//@ chunk-ag5x7vhf.js:140985-141082 sole-consumer
function Aw(m) {
  let date = new Date(m);
  if (Number.isNaN(date.getTime())) return "";
  return formatClockTime(eUt(), date, getLocale());
}
//@ chunk-ag5x7vhf.js:148064-148068 placement
j();

export { shouldShowMessageTimestamp, MessageTimestamp };
