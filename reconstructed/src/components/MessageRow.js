/**
 * components/MessageRow.tsx
 *
 * 消息列表的一行：包装 Message，计算是否仍在流式、工具是否全部完成、后续是否还有内容，并用自定义比较做 memo。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/components/MessageRow.tsx
 * pieces: chunk-ag5x7vhf.js (7)
 * attribution: placement 1, fingerprint 5, callgraph-witnessed 1
 */
import {
  isSignedThinkingMessage,
  getToolSearchOrReadInfo,
  isMessageBreakPoint,
  getDisplayMessageFromCollapsed,
} from "../utils/collapseReadSearch.js";
import { useMemoCache } from "../../vendor/react/compiler-runtime.js";
import { hasAnyToolUseId, collectToolUseIds } from "./messageActions.js";
import {
  getProgressMessagesFromLookup,
  EMPTY_STRING_SET,
  getSiblingToolUseIDsFromLookup,
  getToolUseID,
  rowReferencesToolUseIds,
} from "../utils/messages.js";
import { shouldRenderStatically } from "./Messages.js";
import { shouldShowMessageTimestamp, MessageTimestamp } from "./MessageTimestamp.js";
import {
  jsxProd_default,
  jsxProd_default_2,
} from "../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { agentProgressSelector } from "../tools/AgentTool/UI.js";
import { FreezeWhenOffscreen } from "./FreezeWhenOffscreen.js";
import { MessageModel } from "./MessageModel.js";
import { Box } from "../ink/components/Text.js";
import { memo } from "../../vendor/react/cjs/react.production.js";
import { deferInit } from "../../runtime/deferred-init.js";

//@ chunk-ag5x7vhf.js:138979-139092 placement
function shouldShowModelLabel(message, isBrief) {
  return (
    isBrief &&
    message.type === "assistant" &&
    !!message.message.model &&
    message.message.content.some((state) => state.type === "text")
  );
}
//@ chunk-ag5x7vhf.js:141082-141728 fingerprint = hasContentAfterIndex (0.897)
function hasContentAfterIndex(messages, tools, excludedIds) {
  for (let i = messages.length - 1; i >= 0; i--) {
    let msg = messages[i];
    if (msg?.type === "assistant") {
      let content = msg.message.content[0];
      if (content?.type === "thinking" || content?.type === "redacted_thinking") {
        if (isSignedThinkingMessage(msg)) return i;
        continue;
      }
      if (content?.type === "tool_use") {
        if (getToolSearchOrReadInfo(content.name, content.input, tools).isCollapsible) continue;
        if (excludedIds.has(content.id)) continue;
      }
      return i;
    }
    if (msg?.type === "attachment" && isMessageBreakPoint(msg)) return i;
    if (msg?.type === "system" || msg?.type === "attachment" || msg?.type === "recap_fold") continue;
    if (msg?.type === "user") {
      if (msg.message.content[0]?.type === "tool_result") continue;
    }
    if (msg?.type === "grouped_tool_use") {
      let firstInput = msg.messages[0]?.message.content[0]?.input;
      if (getToolSearchOrReadInfo(msg.toolName, firstInput, tools).isCollapsible) continue;
    }
    return i;
  }
  return -1;
}
//@ chunk-ag5x7vhf.js:141728-145756 fingerprint = MessageRowImpl (0.817)
/**
 * 消息列表单行：决定是否显示时间戳/模型、是否仍在流式（isMessageStreaming）、工具是否全部完成，渲染 Message；transcript 屏与折叠分组有特殊处理。
 */
function MessageRowImpl(props) {
  let $ = useMemoCache(80);
  let {
    message: msg,
    isUserContinuation,
    isSplitUserContinuation,
    followsSpeakerLabel,
    continuesLabelledReply,
    followsInboundLabel,
    hasContentAfter,
    tools,
    commands,
    verbose,
    showMessageTimestamps,
    inProgressToolUseIDs,
    streamingToolUseIDs,
    screen,
    canAnimate,
    onOpenRateLimitOptions,
    onRateLimitAutoQueueContinue,
    latestBashOutputUUID,
    columns,
    isLoading,
    lookups,
  } = props;
  let onTranscriptScreen = screen === "transcript";
  let isGrouped = msg.type === "grouped_tool_use";
  let isCollapsedReadSearch = msg.type === "collapsed_read_search";
  let t1;
  if (
    $[0] !== hasContentAfter ||
    $[1] !== inProgressToolUseIDs ||
    $[2] !== isCollapsedReadSearch ||
    $[3] !== isLoading ||
    $[4] !== msg
  ) {
    t1 =
      isCollapsedReadSearch &&
      (hasAnyToolUseId(msg, inProgressToolUseIDs) || (isLoading && !hasContentAfter));
    $[0] = hasContentAfter;
    $[1] = inProgressToolUseIDs;
    $[2] = isCollapsedReadSearch;
    $[3] = isLoading;
    $[4] = msg;
    $[5] = t1;
  } else t1 = $[5];
  let isActiveCollapsedGroup = t1;
  let rowElement;
  if ($[6] !== msg) {
    rowElement =
      msg.type === "grouped_tool_use"
        ? msg.displayMessage
        : msg.type === "collapsed_read_search"
          ? getDisplayMessageFromCollapsed(msg)
          : msg.type === "work_segment" || msg.type === "speaker_label" || msg.type === "recap_fold"
            ? null
            : msg;
    $[6] = msg;
    $[7] = rowElement;
  } else rowElement = $[7];
  let message = rowElement;
  let t3;
  if ($[8] !== message || $[9] !== isCollapsedReadSearch || $[10] !== isGrouped || $[11] !== lookups) {
    t3 =
      message === null || isGrouped || isCollapsedReadSearch
        ? []
        : getProgressMessagesFromLookup(message, lookups);
    $[8] = message;
    $[9] = isCollapsedReadSearch;
    $[10] = isGrouped;
    $[11] = lookups;
    $[12] = t3;
  } else t3 = $[12];
  let progressMessagesForMessage = t3;
  let t4;
  if (
    $[13] !== message ||
    $[14] !== inProgressToolUseIDs ||
    $[15] !== isCollapsedReadSearch ||
    $[16] !== isGrouped ||
    $[17] !== lookups ||
    $[18] !== msg ||
    $[19] !== screen ||
    $[20] !== streamingToolUseIDs
  ) {
    let siblingToolUseIDs =
      message === null || isGrouped || isCollapsedReadSearch
        ? EMPTY_STRING_SET
        : getSiblingToolUseIDsFromLookup(message, lookups);
    t4 = shouldRenderStatically(
      msg,
      streamingToolUseIDs,
      inProgressToolUseIDs,
      siblingToolUseIDs,
      screen,
      lookups,
    );
    $[13] = message;
    $[14] = inProgressToolUseIDs;
    $[15] = isCollapsedReadSearch;
    $[16] = isGrouped;
    $[17] = lookups;
    $[18] = msg;
    $[19] = screen;
    $[20] = streamingToolUseIDs;
    $[21] = t4;
  } else t4 = $[21];
  let isStatic = t4;
  let shouldAnimate = false;
  if (canAnimate) {
    if (msg.type === "grouped_tool_use") {
      let t5;
      if ($[22] !== inProgressToolUseIDs || $[23] !== msg.messages) {
        let t6;
        if ($[25] !== inProgressToolUseIDs) {
          t6 = (m) => {
            let content = m.message.content[0];
            return content?.type === "tool_use" && inProgressToolUseIDs.has(content.id);
          };
          $[25] = inProgressToolUseIDs;
          $[26] = t6;
        } else t6 = $[26];
        t5 = msg.messages.some(t6);
        $[22] = inProgressToolUseIDs;
        $[23] = msg.messages;
        $[24] = t5;
      } else t5 = $[24];
      shouldAnimate = t5;
    } else if (msg.type === "collapsed_read_search") {
      let t5;
      if ($[27] !== inProgressToolUseIDs || $[28] !== msg) {
        t5 = hasAnyToolUseId(msg, inProgressToolUseIDs);
        $[27] = inProgressToolUseIDs;
        $[28] = msg;
        $[29] = t5;
      } else t5 = $[29];
      shouldAnimate = t5;
    } else if (msg.type === "work_segment") shouldAnimate = msg.isLive;
    else if (msg.type === "speaker_label" || msg.type === "recap_fold") shouldAnimate = false;
    else {
      let t5;
      if ($[30] !== inProgressToolUseIDs || $[31] !== msg) {
        let toolUseID = getToolUseID(msg);
        t5 = !toolUseID || inProgressToolUseIDs.has(toolUseID);
        $[30] = inProgressToolUseIDs;
        $[31] = msg;
        $[32] = t5;
      } else t5 = $[32];
      shouldAnimate = t5;
    }
  }
  let hasMetadataHeader;
  if (
    $[33] !== continuesLabelledReply ||
    $[34] !== message ||
    $[35] !== followsSpeakerLabel ||
    $[36] !== isSplitUserContinuation ||
    $[37] !== onTranscriptScreen ||
    $[38] !== showMessageTimestamps
  ) {
    hasMetadataHeader =
      message !== null &&
      !followsSpeakerLabel &&
      !continuesLabelledReply &&
      (shouldShowMessageTimestamp(
        message,
        onTranscriptScreen,
        showMessageTimestamps,
        isSplitUserContinuation,
      ) ||
        shouldShowModelLabel(message, onTranscriptScreen));
    $[33] = continuesLabelledReply;
    $[34] = message;
    $[35] = followsSpeakerLabel;
    $[36] = isSplitUserContinuation;
    $[37] = onTranscriptScreen;
    $[38] = showMessageTimestamps;
    $[39] = hasMetadataHeader;
  } else hasMetadataHeader = $[39];
  let metadataHeader = hasMetadataHeader;
  const addMargin = !metadataHeader;
  const containerWidth = metadataHeader ? undefined : columns;
  const shouldShowDot = !followsSpeakerLabel && !continuesLabelledReply;
  let t8;
  if (
    $[40] !== commands ||
    $[41] !== followsInboundLabel ||
    $[42] !== followsSpeakerLabel ||
    $[43] !== metadataHeader ||
    $[44] !== inProgressToolUseIDs ||
    $[45] !== isActiveCollapsedGroup ||
    $[46] !== isSplitUserContinuation ||
    $[47] !== isStatic ||
    $[48] !== onTranscriptScreen ||
    $[49] !== isUserContinuation ||
    $[50] !== latestBashOutputUUID ||
    $[51] !== lookups ||
    $[52] !== msg ||
    $[53] !== onOpenRateLimitOptions ||
    $[54] !== onRateLimitAutoQueueContinue ||
    $[55] !== progressMessagesForMessage ||
    $[56] !== shouldAnimate ||
    $[57] !== addMargin ||
    $[58] !== containerWidth ||
    $[59] !== shouldShowDot ||
    $[60] !== tools ||
    $[61] !== verbose
  ) {
    t8 = jsxProd_default(agentProgressSelector, {
      message: msg,
      lookups,
      addMargin,
      containerWidth,
      tools,
      commands,
      verbose,
      inProgressToolUseIDs,
      progressMessagesForMessage,
      shouldAnimate,
      shouldShowDot,
      isTranscriptMode: onTranscriptScreen,
      isStatic,
      onOpenRateLimitOptions,
      onRateLimitAutoQueueContinue,
      isActiveCollapsedGroup,
      isUserContinuation,
      isSplitUserContinuation,
      followsSpeakerLabel,
      followsInboundLabel,
      hasMetadataHeader: metadataHeader,
      latestBashOutputUUID,
    });
    $[40] = commands;
    $[41] = followsInboundLabel;
    $[42] = followsSpeakerLabel;
    $[43] = metadataHeader;
    $[44] = inProgressToolUseIDs;
    $[45] = isActiveCollapsedGroup;
    $[46] = isSplitUserContinuation;
    $[47] = isStatic;
    $[48] = onTranscriptScreen;
    $[49] = isUserContinuation;
    $[50] = latestBashOutputUUID;
    $[51] = lookups;
    $[52] = msg;
    $[53] = onOpenRateLimitOptions;
    $[54] = onRateLimitAutoQueueContinue;
    $[55] = progressMessagesForMessage;
    $[56] = shouldAnimate;
    $[57] = addMargin;
    $[58] = containerWidth;
    $[59] = shouldShowDot;
    $[60] = tools;
    $[61] = verbose;
    $[62] = t8;
  } else t8 = $[62];
  let messageEl = t8;
  if (!metadataHeader || message === null) {
    let t9;
    if ($[63] !== messageEl) {
      t9 = jsxProd_default(FreezeWhenOffscreen, {
        children: messageEl,
      });
      $[63] = messageEl;
      $[64] = t9;
    } else t9 = $[64];
    return t9;
  }
  let messageTimestampElement;
  if (
    $[65] !== message ||
    $[66] !== isSplitUserContinuation ||
    $[67] !== onTranscriptScreen ||
    $[68] !== showMessageTimestamps
  ) {
    messageTimestampElement = jsxProd_default(MessageTimestamp, {
      message,
      isTranscriptMode: onTranscriptScreen,
      showMessageTimestamps,
      isSplitUserContinuation,
    });
    $[65] = message;
    $[66] = isSplitUserContinuation;
    $[67] = onTranscriptScreen;
    $[68] = showMessageTimestamps;
    $[69] = messageTimestampElement;
  } else messageTimestampElement = $[69];
  let messageModelElement;
  if ($[70] !== message || $[71] !== onTranscriptScreen) {
    messageModelElement = jsxProd_default(MessageModel, {
      message,
      isTranscriptMode: onTranscriptScreen,
    });
    $[70] = message;
    $[71] = onTranscriptScreen;
    $[72] = messageModelElement;
  } else messageModelElement = $[72];
  let boxElement;
  if ($[73] !== messageTimestampElement || $[74] !== messageModelElement) {
    boxElement = jsxProd_default_2(Box, {
      flexDirection: "row",
      justifyContent: "flex-end",
      gap: 1,
      marginTop: 1,
      children: [messageTimestampElement, messageModelElement],
    });
    $[73] = messageTimestampElement;
    $[74] = messageModelElement;
    $[75] = boxElement;
  } else boxElement = $[75];
  let t10;
  if ($[76] !== columns || $[77] !== messageEl || $[78] !== boxElement) {
    t10 = jsxProd_default(FreezeWhenOffscreen, {
      children: jsxProd_default_2(Box, {
        width: columns,
        flexDirection: "column",
        children: [boxElement, messageEl],
      }),
    });
    $[76] = columns;
    $[77] = messageEl;
    $[78] = boxElement;
    $[79] = t10;
  } else t10 = $[79];
  return t10;
}
//@ chunk-ag5x7vhf.js:146130-146586 fingerprint = allToolsResolved (0.655)
function allToolsResolved(msg, resolvedToolUseIDs) {
  if (msg.type === "grouped_tool_use")
    return msg.messages.every((m) => {
      let content = m.message.content[0];
      return content?.type === "tool_use" && resolvedToolUseIDs.has(content.id);
    });
  if (msg.type === "collapsed_read_search")
    return collectToolUseIds(msg).every((id) => resolvedToolUseIDs.has(id));
  if (msg.type === "assistant") {
    let block = msg.message.content[0];
    if (block?.type === "server_tool_use") return resolvedToolUseIDs.has(block.id);
  }
  if (msg.type === "work_segment") return !msg.isLive;
  if (msg.type === "speaker_label" || msg.type === "recap_fold") return true;
  let toolUseID = getToolUseID(msg);
  return !toolUseID || resolvedToolUseIDs.has(toolUseID);
}
//@ chunk-ag5x7vhf.js:146586-147355 fingerprint = areMessageRowPropsEqual (0.751)
function areMessageRowPropsEqual(prev, next) {
  if (prev.message !== next.message) return false;
  if (prev.screen !== next.screen) return false;
  if (prev.verbose !== next.verbose) return false;
  if (prev.showMessageTimestamps !== next.showMessageTimestamps) return false;
  if (
    prev.isUserContinuation !== next.isUserContinuation ||
    prev.isSplitUserContinuation !== next.isSplitUserContinuation ||
    prev.followsSpeakerLabel !== next.followsSpeakerLabel ||
    prev.continuesLabelledReply !== next.continuesLabelledReply ||
    prev.followsInboundLabel !== next.followsInboundLabel
  )
    return false;
  if (prev.message.type === "collapsed_read_search" && next.screen !== "transcript") return false;
  if (prev.columns !== next.columns) return false;
  let prevIsLatestBash = prev.latestBashOutputUUID === prev.message.uuid;
  let nextIsLatestBash = next.latestBashOutputUUID === next.message.uuid;
  if (prevIsLatestBash !== nextIsLatestBash) return false;
  let isStreaming = rowReferencesToolUseIds(prev.message, prev.streamingToolUseIDs);
  let isResolved = allToolsResolved(prev.message, prev.lookups.resolvedToolUseIDs);
  if (isStreaming || !isResolved) return false;
  return true;
}
//@ chunk-ag5x7vhf.js:147355-147372 callgraph-witnessed = MessageRow (0)
/**
 * MessageRow = React.memo(MessageRowImpl, areMessageRowPropsEqual)。
 */
var MessageRow; // deferred: uses MessageRowImpl of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-ag5x7vhf.js:147355", () => {
  MessageRow = memo(MessageRowImpl, areMessageRowPropsEqual);
});
//@ chunk-ag5x7vhf.js:172936-173244 fingerprint = isMessageStreaming (0.863)
/**
 * 判断消息是否仍在流式输出：与当前流式工具 ID 比较，按 assistant/user/grouped_tool_use/collapsed_read_search 分类检查。
 */
function isMessageStreaming(msg, streamingToolUseIDs) {
  if (msg.uuid === streamingToolUseIDs) return true;
  switch (msg.type) {
    case "assistant":
    case "user":
      return getToolUseID(msg) === streamingToolUseIDs;
    case "grouped_tool_use":
      return msg.messages.some((message) => message.message.content[0]?.id === streamingToolUseIDs);
    case "collapsed_read_search":
      return msg.messages.some(
        (id) => (id.type === "assistant" || id.type === "user") && getToolUseID(id) === streamingToolUseIDs,
      );
    default:
      return false;
  }
}
export { hasContentAfterIndex, MessageRow, shouldShowModelLabel, isMessageStreaming };
