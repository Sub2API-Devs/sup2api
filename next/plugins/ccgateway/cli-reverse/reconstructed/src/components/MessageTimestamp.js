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
import { useMemoCache } from "../../vendor/react/compiler-runtime.js";
import { EARLY_RETURN_SENTINEL } from "../../runtime/bun-runtime.js";
import { Box, Text } from "../ink/components/Text.js";
import { bunStringWidth } from "../ink/stringWidth.js";
import { jsxProd_default } from "../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { init_react_production } from "../../vendor/react/cjs/react.production.js";
import { deferInit } from "../../runtime/deferred-init.js";

//@ chunk-ag5x7vhf.js:139447-139548 placement
function formatMessageTimestamp(timestamp, timeFormat) {
  let date = new Date(timestamp);
  if (Number.isNaN(date.getTime())) return "";
  return formatFullTimestamp(resolvedTimeFormat(), date, getLocale(), timeFormat);
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
    return (showUser || showAssistant) && message.message.content.some((block) => block.type === "text");
  if (message.type === "user") {
    if (!showUser || message.isCompactSummary || isContinuation) return false;
    let block = message.message.content[0];
    if (block?.type === "image") return true;
    if (block?.type !== "text" || typeof block.text !== "string") return false;
    return !isSystemishUserText(message, block.text);
  }
  return false;
}
//@ chunk-ag5x7vhf.js:140413-140985 callgraph-fingerprint = MessageTimestamp (0.251)
function MessageTimestamp(props) {
  let $ = useMemoCache(12);
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
  let dateElement;
  let timeElement;
  let minWidth;
  let rowElement;
  if ($[0] !== message || $[1] !== showUser) {
    rowElement = EARLY_RETURN_SENTINEL;
    K: {
      let timestampText = messageTimestampOf(message) ?? "";
      timeElement = showUser
        ? formatMessageTimestamp(timestampText)
        : formatHeuristicTimestamp(timestampText);
      if (!timeElement) {
        rowElement = null;
        break K;
      }
      dateElement = Box;
      minWidth = bunStringWidth(timeElement);
    }
    $[0] = message;
    $[1] = showUser;
    $[2] = dateElement;
    $[3] = timeElement;
    $[4] = minWidth;
    $[5] = rowElement;
  } else {
    dateElement = $[2];
    timeElement = $[3];
    minWidth = $[4];
    rowElement = $[5];
  }
  if (rowElement !== EARLY_RETURN_SENTINEL) return rowElement;
  let children;
  if ($[6] !== timeElement) {
    children = jsxProd_default(Text, {
      dimColor: true,
      children: timeElement,
    });
    $[6] = timeElement;
    $[7] = children;
  } else children = $[7];
  let t3;
  if ($[8] !== dateElement || $[9] !== minWidth || $[10] !== children) {
    t3 = jsxProd_default(dateElement, {
      minWidth,
      children,
    });
    $[8] = dateElement;
    $[9] = minWidth;
    $[10] = children;
    $[11] = t3;
  } else t3 = $[11];
  return t3;
}
//@ chunk-ag5x7vhf.js:140985-141082 sole-consumer
function formatHeuristicTimestamp(timestamp) {
  let date = new Date(timestamp);
  if (Number.isNaN(date.getTime())) return "";
  return formatClockTime(resolvedTimeFormat(), date, getLocale());
}
//@ chunk-ag5x7vhf.js:148064-148068 placement
// deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-ag5x7vhf.js:148064", () => {
  init_react_production();
});
export { shouldShowMessageTimestamp, MessageTimestamp };
