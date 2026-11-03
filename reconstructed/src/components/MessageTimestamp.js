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
import { formatFullTimestamp, resolvedTimeFormat, formatClockTime } from "../utils/timeFormat.js";
import { getLocale } from "../utils/formatBriefTimestamp.js";
import { isPeerOrObserver, isHumanOrAutoContinuation, joinTextContent } from "../utils/messageProvenance.js";
import { isNonHumanInboundOrigin } from "../utils/backgroundSessionResume.js";
import { isTaggedSystemUserText, isSystemishUserText } from "./messages/UserTextMessage.js";
import { w } from "../../vendor/react/compiler-runtime.js";
import { EARLY_RETURN_SENTINEL } from "../../runtime/bun-runtime.js";
import { Box, Text } from "../ink/components/Text.js";
import { bunStringWidth } from "../ink/stringWidth.js";
import { jsxProd_default } from "../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { init_react_production } from "../../vendor/react/cjs/react.production.js";

//@ chunk-ag5x7vhf.js:139447-139548 placement
function formatMessageTimestamp(m, h) {
  let date = new Date(m);
  if (Number.isNaN(date.getTime())) return "";
  return formatFullTimestamp(resolvedTimeFormat(), date, getLocale(), h);
}
//@ chunk-ag5x7vhf.js:139548-139688 placement
function messageTimestampOf(message) {
  if (message.type === "attachment" && message.attachment.type === "queued_command")
    return message.attachment.timestamp ?? message.timestamp;
  return message.timestamp;
}
//@ chunk-ag5x7vhf.js:139688-140413 placement
/**
 * 判断一条消息是否显示时间戳：排队的命令附件只对真人或对等方的提示显示；助手消息需含文本；用户消息排除压缩摘要、系统标签文本，图片总显示。
 */
function shouldShowMessageTimestamp(message, showAssistant, showUser, isContinuation = false) {
  if (!messageTimestampOf(message)) return false;
  if (message.type === "attachment") {
    if (!showUser || message.attachment.type !== "queued_command") return false;
    if (isPeerOrObserver(message.attachment.origin)) return true;
    if (message.attachment.commandMode === undefined && message.attachment.isMeta) return false;
    if (
      message.attachment.commandMode === "prompt" &&
      !(
        isNonHumanInboundOrigin(message.attachment.origin) ||
        (!message.attachment.isMeta && isHumanOrAutoContinuation(message.attachment.origin))
      )
    )
      return false;
    let trimmed = joinTextContent(message.attachment.prompt).trim();
    return (message.attachment.imagePasteIds?.length ?? 0) > 0 || !isTaggedSystemUserText(trimmed);
  }
  if (message.type === "assistant")
    return (showUser || showAssistant) && message.message.content.some((k) => k.type === "text");
  if (message.type === "user") {
    if (!showUser || message.isCompactSummary || isContinuation) return false;
    let k = message.message.content[0];
    if (k?.type === "image") return true;
    if (k?.type !== "text" || typeof k.text !== "string") return false;
    return !isSystemishUserText(message, k.text);
  }
  return false;
}
//@ chunk-ag5x7vhf.js:140413-140985 callgraph-fingerprint = MessageTimestamp (0.251)
function MessageTimestamp(props) {
  let $ = w(12);
  let { message, isTranscriptMode, showMessageTimestamps, isSplitUserContinuation } = props;
  let showUser = showMessageTimestamps === undefined ? false : showMessageTimestamps;
  if (
    !shouldShowMessageTimestamp(
      message,
      isTranscriptMode,
      showUser,
      isSplitUserContinuation === undefined ? false : isSplitUserContinuation,
    )
  ) {
    return null;
  }
  let A;
  let L;
  let minWidth;
  let W;
  if ($[0] !== message || $[1] !== showUser) {
    W = EARLY_RETURN_SENTINEL;
    K: {
      let z = messageTimestampOf(message) ?? "";
      L = showUser ? formatMessageTimestamp(z) : formatHeuristicTimestamp(z);
      if (!L) {
        W = null;
        break K;
      }
      A = Box;
      minWidth = bunStringWidth(L);
    }
    $[0] = message;
    $[1] = showUser;
    $[2] = A;
    $[3] = L;
    $[4] = minWidth;
    $[5] = W;
  } else {
    A = $[2];
    L = $[3];
    minWidth = $[4];
    W = $[5];
  }
  if (W !== EARLY_RETURN_SENTINEL) return W;
  let children;
  if ($[6] !== L) {
    children = jsxProd_default(Text, {
      dimColor: true,
      children: L,
    });
    $[6] = L;
    $[7] = children;
  } else children = $[7];
  let t3;
  if ($[8] !== A || $[9] !== minWidth || $[10] !== children) {
    t3 = jsxProd_default(A, {
      minWidth,
      children,
    });
    $[8] = A;
    $[9] = minWidth;
    $[10] = children;
    $[11] = t3;
  } else t3 = $[11];
  return t3;
}
//@ chunk-ag5x7vhf.js:140985-141082 sole-consumer
function formatHeuristicTimestamp(m) {
  let date = new Date(m);
  if (Number.isNaN(date.getTime())) return "";
  return formatClockTime(resolvedTimeFormat(), date, getLocale());
}
//@ chunk-ag5x7vhf.js:148064-148068 placement
init_react_production();
export { shouldShowMessageTimestamp, MessageTimestamp };
