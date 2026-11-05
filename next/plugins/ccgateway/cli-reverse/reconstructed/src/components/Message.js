/**
 * components/Message.tsx
 *
 * 单条消息渲染（MessageImpl）：按 user/assistant/attachment/system 等类型与内容块分派到 messages/* 组件；本模块混入大量 thinking 块判定工具（实属 utils/messages）。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/components/Message.tsx
 * pieces: chunk-5xgkngpb.js (1), chunk-wjygkcr4.js (15)
 * attribution: fingerprint 5, placement 3, sole-consumer 1, affinity 1, layout 6
 */
import { claudeMdSessionState } from "../utils/claudemd.js";
import { useMemoCache } from "../../vendor/react/compiler-runtime.js";
import { useGetToolFromMessages } from "./messages/UserToolResultMessage/utils.js";
import { jsxProd_default } from "../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { actionKeysNamespace } from "./pluginUi/render/actionKeys.js";
import { UserToolResultMessage } from "./messages/UserToolResultMessage/UserToolResultMessage.js";
import { shouldShowNotice } from "./SlashCommandLink.js";
import { isPeerOrObserver, joinTextContent, peerNameOrFrom } from "../utils/messageProvenance.js";
import { AgentMessage } from "./messages/AgentMessage.js";
import { Box } from "../ink/components/Text.js";
import { AttachmentMessage } from "./messages/AttachmentMessage.js";
import { CompactSummary } from "./CompactSummary.js";
import { InsideToolResultProvider } from "./shell/OutputLine.js";
import { interruptedByUserSignal } from "./messages/UserToolResultMessage/RejectedToolUseMessage.js";
import { CompactBoundaryMessage } from "./messages/CompactBoundaryMessage.js";
import { PLACED_SITE_MODULE_EXPORTS } from "./pluginUi/renderSiteExports.js";
import { parseSystemMessage } from "./messages/SystemNoticeMessage.js";
import { NoticeRowMessage } from "./messages/teamMemSaved.js";
import { Divider } from "./design-system/Divider.js";
import { UserTextMessage } from "./messages/UserTextMessage.js";
import { SystemTextMessage } from "./messages/SystemTextMessage.js";
import { GroupedToolUseContent_2, GroupedToolUseContent } from "./messages/GroupedToolUseContent.js";
import { collectToolUseIds } from "./messageActions.js";
import { FreezeWhenOffscreen } from "./FreezeWhenOffscreen.js";
import { usePrefersReducedMotion } from "./Spinner/spinnerFlags.js";
import { useIsScreenReaderEnabled } from "../ink/components/ErrorBoundary.js";
import { useTerminalSize } from "../hooks/useTerminalSize.js";
import { UserImageMessage } from "./messages/UserImageMessage.js";
import { isServerToolType } from "../utils/conversationRecovery.js";
import { allowlistedBlockType as allowlistedBlockType_2 } from "../services/api/requestHeaders.js";
import { jsonStringify } from "../utils/slowOperations.js";
import { claimOnceStore } from "../services/api/verificationRequired.js";
import { logError } from "../utils/log.js";
import { useHost } from "../context/session.js";
import { useAppStateSlice } from "../state/AppState.js";
import { isFallbackMessage } from "../utils/messages/apiMediaNormalization.js";
import { ToolUseStatusDot } from "./messages/AssistantToolUseMessage.js";
import { AssistantTextBlock, AssistantThinkingBlock } from "./messages/AssistantTextMessage.js";
import { AssistantRedactedThinkingMessage } from "./messages/AssistantRedactedThinkingMessage.js";
import { hasNarrationThinking } from "../utils/messages/apiNormalization.js";
import { AssistantThinkingMessage } from "./messages/AssistantThinkingMessage.js";
import { AdvisorMessage } from "./messages/AdvisorMessage.js";
import { hasStringUuid } from "../bridge/inboundMessages.js";
import { isWeakNotified } from "../utils/queuedCommandDisplay.js";
import { getBuiltinMcpRenderOverride } from "../utils/computerUse/common.js";
import { GROUPED_TOOL_USE_RENDERERS } from "./messages/SkillProposalMessage.js";
import { deferInit } from "../../runtime/deferred-init.js";

//@ chunk-5xgkngpb.js:1348608-1348664 fingerprint (2.1.88 match: Message, 0.471)
/**
 * 清空某宿主的记忆文件缓存（loads/moves）。
 */
function clearMemoryFilesCache(session) {
  claudeMdSessionState(session).memo = {
    loads: new Map(),
    moves: new Map(),
  };
}
//@ chunk-wjygkcr4.js:227913-228097 placement (2.1.88 match: createUserInterruptionMessage, 0.51)
/**
 * React 组件：按 tool_use_id 在 lookups 里找到对应 tool_use 后渲染（找不到返回 null）。旧版名 createUserInterruptionMessage 为错配，应归 components/。
 */
function ToolResultRow(props) {
  let $ = useMemoCache(3);
  let getToolFromMessages = useGetToolFromMessages(props.param.tool_use_id, props.tools, props.lookups);
  if (!getToolFromMessages) {
    return null;
  }
  let rowElement;
  if ($[0] !== props || $[1] !== getToolFromMessages) {
    rowElement = jsxProd_default(ToolResultRequestRow, {
      ...props,
      toolUse: getToolFromMessages,
    });
    $[0] = props;
    $[1] = getToolFromMessages;
    $[2] = rowElement;
  } else rowElement = $[2];
  return rowElement;
}
//@ chunk-wjygkcr4.js:228097-228761 sole-consumer
/**
 * React（编译器产物）组件：把 tool_result 的 tool_use_id、工具名、输出、是否出错/展开作为请求参数渲染一行；只被中断消息组件使用。
 */
function ToolResultRequestRow(props) {
  let $ = useMemoCache(11);
  let { param, message, toolUse } = props;
  let toolUseResult = message.toolUseResult;
  let isErrored = param.is_error === true;
  let toolName = toolUse.toolUse.name;
  let isExpanded = props.verbose || props.isTranscriptMode === true;
  let buildInput;
  let inputDeps;
  if (
    $[0] !== isErrored ||
    $[1] !== isExpanded ||
    $[2] !== toolUseResult ||
    $[3] !== param.tool_use_id ||
    $[4] !== toolName
  ) {
    buildInput = () => ({
      requestId: param.tool_use_id,
      props: {
        tool_use_id: param.tool_use_id,
        tool: toolName,
        output: toolUseResult,
        isErrored,
        isExpanded,
      },
    });
    inputDeps = [param.tool_use_id, toolName, toolUseResult, isErrored, isExpanded];
    $[0] = isErrored;
    $[1] = isExpanded;
    $[2] = toolUseResult;
    $[3] = param.tool_use_id;
    $[4] = toolName;
    $[5] = buildInput;
    $[6] = inputDeps;
  } else {
    buildInput = $[5];
    inputDeps = $[6];
  }
  let renderInput = actionKeysNamespace.useRenderInput("ToolResult", buildInput, inputDeps);
  let renderHook;
  if ($[7] !== message || $[8] !== toolUseResult || $[9] !== props) {
    renderHook = (args) =>
      jsxProd_default(UserToolResultMessage, {
        ...props,
        message:
          args.props.output === toolUseResult
            ? message
            : {
                ...message,
                toolUseResult: args.props.output,
              },
      });
    $[7] = message;
    $[8] = toolUseResult;
    $[9] = props;
    $[10] = renderHook;
  } else renderHook = $[10];
  return actionKeysNamespace.useRenderHook(renderInput, renderHook);
}
//@ chunk-wjygkcr4.js:231963-231975 affinity
var workSegmentModule = null;
//@ chunk-wjygkcr4.js:231975-241516 fingerprint (2.1.88 match: MessageImpl, 0.581)
/**
 * 单条消息渲染（memo 前的实现）：按 message.type 分派——assistant 逐内容块交给 AssistantMessageBlock，user 交给 UserMessage，attachment/system/grouped_tool_use/collapsed_read_search/work_segment 等交给对应组件；处理 addMargin、verbose、transcript 模式。
 */
function MessageImpl(props) {
  let $ = useMemoCache(174);
  let {
    message,
    lookups,
    containerWidth,
    addMargin,
    joinsTopNotices,
    tools,
    commands,
    verbose,
    inProgressToolUseIDs,
    progressMessagesForMessage,
    shouldAnimate,
    shouldShowDot,
    style,
    isTranscriptMode,
    onOpenRateLimitOptions,
    onRateLimitAutoQueueContinue,
    isActiveCollapsedGroup,
    isUserContinuation,
    isSplitUserContinuation,
    followsSpeakerLabel,
    followsInboundLabel,
    hasMetadataHeader,
    latestBashOutputUUID,
    disableDisplayOverride,
  } = props;
  let isContinuation = joinsTopNotices === undefined ? false : joinsTopNotices;
  let isUserContinuation_2 = isUserContinuation === undefined ? false : isUserContinuation;
  let isSplitUserContinuation_2 = isSplitUserContinuation === undefined ? false : isSplitUserContinuation;
  let speakerLabel = followsSpeakerLabel === undefined ? false : followsSpeakerLabel;
  let followsInboundLabel_2 = followsInboundLabel === undefined ? false : followsInboundLabel;
  let hasMetadataHeader_2 = hasMetadataHeader === undefined ? false : hasMetadataHeader;
  let showNotice = shouldShowNotice(verbose);
  switch (message.type) {
    case "attachment": {
      if (message.attachment.type === "queued_command" && isPeerOrObserver(message.attachment.origin)) {
        let promptText;
        if ($[0] !== message.attachment.prompt) {
          promptText = joinTextContent(message.attachment.prompt);
          $[0] = message.attachment.prompt;
          $[1] = promptText;
        } else promptText = $[1];
        let text = promptText;
        const width = containerWidth ?? "100%";
        let param;
        if ($[2] !== text) {
          param = {
            text,
            type: "text",
          };
          $[2] = text;
          $[3] = param;
        } else param = $[3];
        let fromName;
        if ($[4] !== message.attachment.origin) {
          fromName = peerNameOrFrom(message.attachment.origin);
          $[4] = message.attachment.origin;
          $[5] = fromName;
        } else fromName = $[5];
        let children;
        if (
          $[6] !== addMargin ||
          $[7] !== isTranscriptMode ||
          $[8] !== message.attachment.origin ||
          $[9] !== message.uuid ||
          $[10] !== fromName ||
          $[11] !== param ||
          $[12] !== verbose
        ) {
          children = jsxProd_default(AgentMessage, {
            addMargin,
            param,
            fromName,
            verbose,
            isTranscriptMode,
            messageId: message.uuid,
            origin: message.attachment.origin,
          });
          $[6] = addMargin;
          $[7] = isTranscriptMode;
          $[8] = message.attachment.origin;
          $[9] = message.uuid;
          $[10] = fromName;
          $[11] = param;
          $[12] = verbose;
          $[13] = children;
        } else children = $[13];
        let peerMessage;
        if ($[14] !== children || $[15] !== width) {
          peerMessage = jsxProd_default(Box, {
            flexDirection: "column",
            width,
            children,
          });
          $[14] = children;
          $[15] = width;
          $[16] = peerMessage;
        } else peerMessage = $[16];
        return peerMessage;
      }
      const width = containerWidth ?? "100%";
      let children;
      if (
        $[17] !== addMargin ||
        $[18] !== followsInboundLabel_2 ||
        $[19] !== speakerLabel ||
        $[20] !== hasMetadataHeader_2 ||
        $[21] !== isTranscriptMode ||
        $[22] !== message.attachment ||
        $[23] !== message.uuid ||
        $[24] !== verbose
      ) {
        children = jsxProd_default(AttachmentMessage, {
          addMargin,
          attachment: message.attachment,
          verbose,
          isTranscriptMode,
          hasMetadataHeader: hasMetadataHeader_2,
          followsSpeakerLabel: speakerLabel,
          followsInboundLabel: followsInboundLabel_2,
          messageId: message.uuid,
        });
        $[17] = addMargin;
        $[18] = followsInboundLabel_2;
        $[19] = speakerLabel;
        $[20] = hasMetadataHeader_2;
        $[21] = isTranscriptMode;
        $[22] = message.attachment;
        $[23] = message.uuid;
        $[24] = verbose;
        $[25] = children;
      } else children = $[25];
      let attachmentBox;
      if ($[26] !== width || $[27] !== children) {
        attachmentBox = jsxProd_default(Box, {
          flexDirection: "column",
          width,
          children,
        });
        $[26] = width;
        $[27] = children;
        $[28] = attachmentBox;
      } else attachmentBox = $[28];
      return attachmentBox;
    }
    case "assistant": {
      let firstTextUuid;
      if ($[29] !== lookups.firstTextBlockUuidByMessageID || $[30] !== message.message.id) {
        firstTextUuid = lookups.firstTextBlockUuidByMessageID.get(message.message.id);
        $[29] = lookups.firstTextBlockUuidByMessageID;
        $[30] = message.message.id;
        $[31] = firstTextUuid;
      } else firstTextUuid = $[31];
      let firstTextUuid_2 = firstTextUuid;
      const width = containerWidth ?? "100%";
      let children;
      if (
        $[32] !== addMargin ||
        $[33] !== commands ||
        $[34] !== disableDisplayOverride ||
        $[35] !== firstTextUuid_2 ||
        $[36] !== speakerLabel ||
        $[37] !== inProgressToolUseIDs ||
        $[38] !== isTranscriptMode ||
        $[39] !== lookups ||
        $[40] !== message.advisorModel ||
        $[41] !== message.cloudMemoryToolUseIds ||
        $[42] !== message.error ||
        $[43] !== message.isApiErrorMessage ||
        $[44] !== message.message.content ||
        $[45] !== message.message.id ||
        $[46] !== message.message.model ||
        $[47] !== message.sessionFailureNotice ||
        $[48] !== message.uuid ||
        $[49] !== onOpenRateLimitOptions ||
        $[50] !== onRateLimitAutoQueueContinue ||
        $[51] !== progressMessagesForMessage ||
        $[52] !== shouldAnimate ||
        $[53] !== shouldShowDot ||
        $[54] !== tools ||
        $[55] !== verbose
      ) {
        let renderBlock;
        if (
          $[57] !== addMargin ||
          $[58] !== commands ||
          $[59] !== disableDisplayOverride ||
          $[60] !== firstTextUuid_2 ||
          $[61] !== speakerLabel ||
          $[62] !== inProgressToolUseIDs ||
          $[63] !== isTranscriptMode ||
          $[64] !== lookups ||
          $[65] !== message.advisorModel ||
          $[66] !== message.cloudMemoryToolUseIds ||
          $[67] !== message.error ||
          $[68] !== message.isApiErrorMessage ||
          $[69] !== message.message.id ||
          $[70] !== message.message.model ||
          $[71] !== message.sessionFailureNotice ||
          $[72] !== message.uuid ||
          $[73] !== onOpenRateLimitOptions ||
          $[74] !== onRateLimitAutoQueueContinue ||
          $[75] !== progressMessagesForMessage ||
          $[76] !== shouldAnimate ||
          $[77] !== shouldShowDot ||
          $[78] !== tools ||
          $[79] !== verbose
        ) {
          renderBlock = (param, index) =>
            jsxProd_default(
              AssistantMessageBlock,
              {
                param,
                model: message.message.model,
                addMargin: addMargin && !speakerLabel,
                tools,
                commands,
                verbose,
                inProgressToolUseIDs,
                progressMessagesForMessage,
                shouldAnimate,
                shouldShowDot,
                inProgressToolCallCount: inProgressToolUseIDs.size,
                isTranscriptMode,
                lookups,
                onOpenRateLimitOptions,
                onRateLimitAutoQueueContinue,
                advisorModel: message.advisorModel,
                isApiError: message.isApiErrorMessage === true,
                isSessionFailureNotice: message.sessionFailureNotice === true,
                cloudMemoryToolUseIds: message.cloudMemoryToolUseIds,
                apiErrorKind: message.error,
                apiMessageId: disableDisplayOverride ? undefined : message.message.id,
                messageUuid: message.uuid,
                isFirstTextBlock: firstTextUuid_2 === undefined || firstTextUuid_2 === message.uuid,
              },
              index,
            );
          $[57] = addMargin;
          $[58] = commands;
          $[59] = disableDisplayOverride;
          $[60] = firstTextUuid_2;
          $[61] = speakerLabel;
          $[62] = inProgressToolUseIDs;
          $[63] = isTranscriptMode;
          $[64] = lookups;
          $[65] = message.advisorModel;
          $[66] = message.cloudMemoryToolUseIds;
          $[67] = message.error;
          $[68] = message.isApiErrorMessage;
          $[69] = message.message.id;
          $[70] = message.message.model;
          $[71] = message.sessionFailureNotice;
          $[72] = message.uuid;
          $[73] = onOpenRateLimitOptions;
          $[74] = onRateLimitAutoQueueContinue;
          $[75] = progressMessagesForMessage;
          $[76] = shouldAnimate;
          $[77] = shouldShowDot;
          $[78] = tools;
          $[79] = verbose;
          $[80] = renderBlock;
        } else renderBlock = $[80];
        children = message.message.content.map(renderBlock);
        $[32] = addMargin;
        $[33] = commands;
        $[34] = disableDisplayOverride;
        $[35] = firstTextUuid_2;
        $[36] = speakerLabel;
        $[37] = inProgressToolUseIDs;
        $[38] = isTranscriptMode;
        $[39] = lookups;
        $[40] = message.advisorModel;
        $[41] = message.cloudMemoryToolUseIds;
        $[42] = message.error;
        $[43] = message.isApiErrorMessage;
        $[44] = message.message.content;
        $[45] = message.message.id;
        $[46] = message.message.model;
        $[47] = message.sessionFailureNotice;
        $[48] = message.uuid;
        $[49] = onOpenRateLimitOptions;
        $[50] = onRateLimitAutoQueueContinue;
        $[51] = progressMessagesForMessage;
        $[52] = shouldAnimate;
        $[53] = shouldShowDot;
        $[54] = tools;
        $[55] = verbose;
        $[56] = children;
      } else children = $[56];
      let assistantBox;
      if ($[81] !== width || $[82] !== children) {
        assistantBox = jsxProd_default(Box, {
          flexDirection: "column",
          width,
          children,
        });
        $[81] = width;
        $[82] = children;
        $[83] = assistantBox;
      } else assistantBox = $[83];
      return assistantBox;
    }
    case "user": {
      if (message.isCompactSummary) {
        const screen = isTranscriptMode ? "transcript" : "prompt";
        let compactSummary;
        if ($[84] !== message || $[85] !== screen) {
          compactSummary = jsxProd_default(CompactSummary, {
            message,
            screen,
          });
          $[84] = message;
          $[85] = screen;
          $[86] = compactSummary;
        } else compactSummary = $[86];
        return compactSummary;
      }
      let imageIndexes;
      if ($[87] !== message.imagePasteIds || $[88] !== message.message.content) {
        imageIndexes = [];
        let imagePosition = 0;
        for (const param of message.message.content) {
          if (param.type === "image") {
            let id = message.imagePasteIds?.[imagePosition];
            imagePosition++;
            imageIndexes.push(id ?? imagePosition);
          } else imageIndexes.push(imagePosition);
        }
        $[87] = message.imagePasteIds;
        $[88] = message.message.content;
        $[89] = imageIndexes;
      } else imageIndexes = $[89];
      let isLatestBashOutput = latestBashOutputUUID === message.uuid;
      const width = containerWidth ?? "100%";
      let children;
      if (
        $[90] !== addMargin ||
        $[91] !== followsInboundLabel_2 ||
        $[92] !== speakerLabel ||
        $[93] !== hasMetadataHeader_2 ||
        $[94] !== imageIndexes ||
        $[95] !== isSplitUserContinuation_2 ||
        $[96] !== isTranscriptMode ||
        $[97] !== isUserContinuation_2 ||
        $[98] !== lookups ||
        $[99] !== message ||
        $[100] !== progressMessagesForMessage ||
        $[101] !== style ||
        $[102] !== tools ||
        $[103] !== verbose
      ) {
        children = message.message.content.map((param, index) =>
          jsxProd_default(
            UserMessage,
            {
              message,
              addMargin,
              tools,
              progressMessagesForMessage,
              param,
              style,
              verbose,
              imageIndex: imageIndexes[index],
              isUserContinuation: isUserContinuation_2,
              isSplitUserContinuation: isSplitUserContinuation_2,
              followsSpeakerLabel: speakerLabel,
              followsInboundLabel: followsInboundLabel_2,
              hasMetadataHeader: hasMetadataHeader_2,
              lookups,
              isTranscriptMode,
            },
            index,
          ),
        );
        $[90] = addMargin;
        $[91] = followsInboundLabel_2;
        $[92] = speakerLabel;
        $[93] = hasMetadataHeader_2;
        $[94] = imageIndexes;
        $[95] = isSplitUserContinuation_2;
        $[96] = isTranscriptMode;
        $[97] = isUserContinuation_2;
        $[98] = lookups;
        $[99] = message;
        $[100] = progressMessagesForMessage;
        $[101] = style;
        $[102] = tools;
        $[103] = verbose;
        $[104] = children;
      } else children = $[104];
      let userBox;
      if ($[105] !== width || $[106] !== children) {
        userBox = jsxProd_default(Box, {
          flexDirection: "column",
          width,
          children,
        });
        $[105] = width;
        $[106] = children;
        $[107] = userBox;
      } else userBox = $[107];
      let content = userBox;
      const value = message.interruptedBySendNow === true;
      let children_2;
      if ($[108] !== content || $[109] !== isLatestBashOutput) {
        children_2 = isLatestBashOutput
          ? jsxProd_default(InsideToolResultProvider, {
              children: content,
            })
          : content;
        $[108] = content;
        $[109] = isLatestBashOutput;
        $[110] = children_2;
      } else children_2 = $[110];
      let providerWrapped;
      if ($[111] !== value || $[112] !== children_2) {
        providerWrapped = jsxProd_default(interruptedByUserSignal.Provider, {
          value,
          children: children_2,
        });
        $[111] = value;
        $[112] = children_2;
        $[113] = providerWrapped;
      } else providerWrapped = $[113];
      return providerWrapped;
    }
    case "system": {
      if (message.subtype === "compact_boundary") {
        let compactBoundary;
        if ($[114] !== message || $[115] !== showNotice) {
          compactBoundary = jsxProd_default(CompactBoundaryMessage, {
            message,
            transcriptV2Rows: showNotice,
          });
          $[114] = message;
          $[115] = showNotice;
          $[116] = compactBoundary;
        } else compactBoundary = $[116];
        return compactBoundary;
      }
      if (message.subtype === "placed") {
        let placedSite;
        if ($[117] !== message) {
          placedSite = jsxProd_default(PLACED_SITE_MODULE_EXPORTS.PlacedSite, {
            message,
          });
          $[117] = message;
          $[118] = placedSite;
        } else placedSite = $[118];
        return placedSite;
      }
      if (message.subtype === "microcompact_boundary") {
        return null;
      }
      if (showNotice) {
        let parsed;
        if ($[119] !== message) {
          parsed = parseSystemMessage(message);
          $[119] = message;
          $[120] = parsed;
        } else parsed = $[120];
        let hidden = parsed;
        if (hidden.kind === "hidden") {
          return null;
        }
        if (hidden.kind === "line") {
          const addMargin_2 = addMargin && !isContinuation;
          let noticeRow;
          if ($[121] !== hidden.row || $[122] !== addMargin_2) {
            noticeRow = jsxProd_default(NoticeRowMessage, {
              row: hidden.row,
              addMargin: addMargin_2,
            });
            $[121] = hidden.row;
            $[122] = addMargin_2;
            $[123] = noticeRow;
          } else noticeRow = $[123];
          return noticeRow;
        }
      }
      if (message.subtype === "read_divider") {
        let readDivider;
        if ($[124] !== message.content) {
          readDivider = jsxProd_default(Box, {
            marginTop: 1,
            width: "100%",
            children: jsxProd_default(Divider, {
              title: message.content,
              color: "inactive",
            }),
          });
          $[124] = message.content;
          $[125] = readDivider;
        } else readDivider = $[125];
        return readDivider;
      }
      if (message.subtype === "local_command") {
        let param;
        if ($[126] !== message.content) {
          param = {
            type: "text",
            text: message.content,
          };
          $[126] = message.content;
          $[127] = param;
        } else param = $[127];
        let commandText;
        if (
          $[128] !== addMargin ||
          $[129] !== speakerLabel ||
          $[130] !== isTranscriptMode ||
          $[131] !== message.commandRun ||
          $[132] !== message.uuid ||
          $[133] !== param ||
          $[134] !== verbose
        ) {
          commandText = jsxProd_default(UserTextMessage, {
            addMargin,
            param,
            verbose,
            isTranscriptMode,
            messageId: message.uuid,
            commandRun: message.commandRun,
            followsSpeakerLabel: speakerLabel,
          });
          $[128] = addMargin;
          $[129] = speakerLabel;
          $[130] = isTranscriptMode;
          $[131] = message.commandRun;
          $[132] = message.uuid;
          $[133] = param;
          $[134] = verbose;
          $[135] = commandText;
        } else commandText = $[135];
        return commandText;
      }
      let systemText;
      if ($[136] !== addMargin || $[137] !== isTranscriptMode || $[138] !== message || $[139] !== verbose) {
        systemText = jsxProd_default(SystemTextMessage, {
          message,
          addMargin,
          verbose,
          isTranscriptMode,
        });
        $[136] = addMargin;
        $[137] = isTranscriptMode;
        $[138] = message;
        $[139] = verbose;
        $[140] = systemText;
      } else systemText = $[140];
      return systemText;
    }
    case "grouped_tool_use": {
      let groupedToolUse;
      if (
        $[141] !== addMargin ||
        $[142] !== inProgressToolUseIDs ||
        $[143] !== lookups ||
        $[144] !== message ||
        $[145] !== shouldAnimate ||
        $[146] !== tools
      ) {
        groupedToolUse = jsxProd_default(GroupedToolUseContent_2, {
          message,
          tools,
          lookups,
          inProgressToolUseIDs,
          shouldAnimate,
          addMargin,
        });
        $[141] = addMargin;
        $[142] = inProgressToolUseIDs;
        $[143] = lookups;
        $[144] = message;
        $[145] = shouldAnimate;
        $[146] = tools;
        $[147] = groupedToolUse;
      } else groupedToolUse = $[147];
      return groupedToolUse;
    }
    case "collapsed_read_search": {
      let hasInterrupted;
      if ($[148] !== lookups || $[149] !== message) {
        const toolUseIds = collectToolUseIds(message);
        let isInterrupted;
        if ($[151] !== lookups) {
          isInterrupted = (id) => {
            let result = lookups.toolResultByToolUseID.get(id);
            return result?.type === "user" && result.interruptedBySendNow === true;
          };
          $[151] = lookups;
          $[152] = isInterrupted;
        } else isInterrupted = $[152];
        hasInterrupted = toolUseIds.some(isInterrupted);
        $[148] = lookups;
        $[149] = message;
        $[150] = hasInterrupted;
      } else hasInterrupted = $[150];
      let value = hasInterrupted;
      const verbose_2 = verbose || isTranscriptMode;
      let children;
      if (
        $[153] !== addMargin ||
        $[154] !== inProgressToolUseIDs ||
        $[155] !== isActiveCollapsedGroup ||
        $[156] !== lookups ||
        $[157] !== message ||
        $[158] !== shouldAnimate ||
        $[159] !== verbose_2 ||
        $[160] !== tools
      ) {
        children = jsxProd_default(GroupedToolUseContent, {
          message,
          inProgressToolUseIDs,
          shouldAnimate,
          verbose: verbose_2,
          tools,
          lookups,
          isActiveGroup: isActiveCollapsedGroup,
          addMargin,
        });
        $[153] = addMargin;
        $[154] = inProgressToolUseIDs;
        $[155] = isActiveCollapsedGroup;
        $[156] = lookups;
        $[157] = message;
        $[158] = shouldAnimate;
        $[159] = verbose_2;
        $[160] = tools;
        $[161] = children;
      } else children = $[161];
      let frozenContent;
      if ($[162] !== value || $[163] !== children) {
        frozenContent = jsxProd_default(FreezeWhenOffscreen, {
          children: jsxProd_default(interruptedByUserSignal.Provider, {
            value,
            children,
          }),
        });
        $[162] = value;
        $[163] = children;
        $[164] = frozenContent;
      } else frozenContent = $[164];
      return frozenContent;
    }
    case "work_segment": {
      let workSegment;
      if ($[165] !== message || $[166] !== shouldAnimate) {
        workSegment = jsxProd_default(WorkSegmentMessageView, {
          message,
          shouldAnimate,
        });
        $[165] = message;
        $[166] = shouldAnimate;
        $[167] = workSegment;
      } else workSegment = $[167];
      return workSegment;
    }
    case "speaker_label": {
      let speakerLabelRow;
      if ($[168] !== containerWidth || $[169] !== message.speaker) {
        speakerLabelRow =
          workSegmentModule === null
            ? null
            : jsxProd_default(Box, {
                marginTop: 1,
                width: containerWidth ?? "100%",
                backgroundColor: message.speaker.kind === "you" ? "userMessageBackground" : undefined,
                children: jsxProd_default(workSegmentModule.SpeakerLabel, {
                  speaker: message.speaker,
                }),
              });
        $[168] = containerWidth;
        $[169] = message.speaker;
        $[170] = speakerLabelRow;
      } else speakerLabelRow = $[170];
      return speakerLabelRow;
    }
    case "recap_fold": {
      let recapFold;
      if ($[171] !== addMargin || $[172] !== message) {
        recapFold =
          workSegmentModule === null
            ? null
            : jsxProd_default(workSegmentModule.RecapFoldMessage, {
                message,
                addMargin,
              });
        $[171] = addMargin;
        $[172] = message;
        $[173] = recapFold;
      } else recapFold = $[173];
      return recapFold;
    }
  }
}
//@ chunk-wjygkcr4.js:241516-241754 layout
function WorkSegmentMessageView(props) {
  let $ = useMemoCache(3);
  let { message, shouldAnimate } = props;
  let prefersReducedMotion = usePrefersReducedMotion();
  let isScreenReaderEnabled = useIsScreenReaderEnabled();
  if (workSegmentModule === null) {
    return null;
  }
  const reducedMotion = prefersReducedMotion || isScreenReaderEnabled || !shouldAnimate;
  let workSegmentElement;
  if ($[0] !== message || $[1] !== reducedMotion) {
    workSegmentElement = jsxProd_default(workSegmentModule.WorkSegmentMessage, {
      message,
      reducedMotion,
    });
    $[0] = message;
    $[1] = reducedMotion;
    $[2] = workSegmentElement;
  } else workSegmentElement = $[2];
  return workSegmentElement;
}
//@ chunk-wjygkcr4.js:241754-243787 fingerprint (2.1.88 match: UserMessage, 0.682)
/**
 * 用户消息分派：按内容块类型（text/image/tool_result）选择 UserTextMessage、UserImageMessage、UserToolResultMessage；coordinator 模式特殊处理。
 */
function UserMessage(props) {
  let $ = useMemoCache(39);
  let {
    message,
    addMargin,
    tools,
    progressMessagesForMessage,
    param,
    style,
    verbose,
    imageIndex,
    isUserContinuation,
    isSplitUserContinuation,
    followsSpeakerLabel,
    followsInboundLabel,
    hasMetadataHeader,
    lookups,
    isTranscriptMode,
  } = props;
  let { columns } = useTerminalSize();
  switch (param.type) {
    case "text": {
      if (isPeerOrObserver(message.origin)) {
        let fromName;
        if ($[0] !== message.origin) {
          fromName = peerNameOrFrom(message.origin);
          $[0] = message.origin;
          $[1] = fromName;
        } else fromName = $[1];
        const followsSpeakerLabel_2 = followsSpeakerLabel || followsInboundLabel;
        let agentMessageElement;
        if (
          $[2] !== addMargin ||
          $[3] !== isTranscriptMode ||
          $[4] !== message.origin ||
          $[5] !== message.uuid ||
          $[6] !== param ||
          $[7] !== fromName ||
          $[8] !== followsSpeakerLabel_2 ||
          $[9] !== verbose
        ) {
          agentMessageElement = jsxProd_default(AgentMessage, {
            addMargin,
            param,
            fromName,
            verbose,
            isTranscriptMode,
            messageId: message.uuid,
            origin: message.origin,
            followsSpeakerLabel: followsSpeakerLabel_2,
          });
          $[2] = addMargin;
          $[3] = isTranscriptMode;
          $[4] = message.origin;
          $[5] = message.uuid;
          $[6] = param;
          $[7] = fromName;
          $[8] = followsSpeakerLabel_2;
          $[9] = verbose;
          $[10] = agentMessageElement;
        } else agentMessageElement = $[10];
        return agentMessageElement;
      }
      const followsCoordinatorLabel = followsInboundLabel && message.origin?.kind === "coordinator";
      let userTextMessageElement;
      if (
        $[11] !== addMargin ||
        $[12] !== followsInboundLabel ||
        $[13] !== followsSpeakerLabel ||
        $[14] !== isTranscriptMode ||
        $[15] !== message.origin ||
        $[16] !== message.planContent ||
        $[17] !== message.pluginPrompt ||
        $[18] !== message.taskDelivery ||
        $[19] !== message.timestamp ||
        $[20] !== message.uuid ||
        $[21] !== param ||
        $[22] !== followsCoordinatorLabel ||
        $[23] !== verbose
      ) {
        userTextMessageElement = jsxProd_default(UserTextMessage, {
          addMargin,
          param,
          verbose,
          planContent: message.planContent,
          isTranscriptMode,
          timestamp: message.timestamp,
          messageId: message.uuid,
          origin: message.origin,
          pluginPrompt: message.pluginPrompt,
          taskDelivery: message.taskDelivery,
          followsSpeakerLabel,
          followsInboundLabel,
          followsCoordinatorLabel,
        });
        $[11] = addMargin;
        $[12] = followsInboundLabel;
        $[13] = followsSpeakerLabel;
        $[14] = isTranscriptMode;
        $[15] = message.origin;
        $[16] = message.planContent;
        $[17] = message.pluginPrompt;
        $[18] = message.taskDelivery;
        $[19] = message.timestamp;
        $[20] = message.uuid;
        $[21] = param;
        $[22] = followsCoordinatorLabel;
        $[23] = verbose;
        $[24] = userTextMessageElement;
      } else userTextMessageElement = $[24];
      return userTextMessageElement;
    }
    case "image": {
      const addMargin_2 = addMargin && !isUserContinuation;
      const startsUserTurn = hasMetadataHeader ? !isSplitUserContinuation : undefined;
      let userImageMessageElement;
      if ($[25] !== imageIndex || $[26] !== addMargin_2 || $[27] !== startsUserTurn) {
        userImageMessageElement = jsxProd_default(UserImageMessage, {
          imageId: imageIndex,
          addMargin: addMargin_2,
          startsUserTurn,
        });
        $[25] = imageIndex;
        $[26] = addMargin_2;
        $[27] = startsUserTurn;
        $[28] = userImageMessageElement;
      } else userImageMessageElement = $[28];
      return userImageMessageElement;
    }
    case "tool_result": {
      const width = columns - 5;
      let t2;
      if (
        $[29] !== isTranscriptMode ||
        $[30] !== lookups ||
        $[31] !== message ||
        $[32] !== param ||
        $[33] !== progressMessagesForMessage ||
        $[34] !== style ||
        $[35] !== width ||
        $[36] !== tools ||
        $[37] !== verbose
      ) {
        t2 = jsxProd_default(ToolResultRow, {
          param,
          message,
          lookups,
          progressMessagesForMessage,
          style,
          tools,
          verbose,
          width,
          isTranscriptMode,
        });
        $[29] = isTranscriptMode;
        $[30] = lookups;
        $[31] = message;
        $[32] = param;
        $[33] = progressMessagesForMessage;
        $[34] = style;
        $[35] = width;
        $[36] = tools;
        $[37] = verbose;
        $[38] = t2;
      } else t2 = $[38];
      return t2;
    }
    default: {
      return;
    }
  }
}
//@ chunk-wjygkcr4.js:243787-243854 layout
var TOOL_SEARCH_BLOCK_TYPES; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-wjygkcr4.js:243787", () => {
  TOOL_SEARCH_BLOCK_TYPES = new Set(["tool_search_tool_regex", "tool_search_tool_bm25"]);
});
//@ chunk-wjygkcr4.js:243854-243924 layout
function allowlistedBlockName(param) {
  return "name" in param && isServerToolType(param.name) ? param.name : "non-allowlisted";
}
//@ chunk-wjygkcr4.js:243924-244044 layout
function allowlistedBlockType(param) {
  let blockType = "type" in param ? param.type : undefined;
  if (typeof blockType !== "string") return "non-allowlisted (non-string)";
  return allowlistedBlockType_2(blockType);
}
//@ chunk-wjygkcr4.js:244044-244303 layout
function unrenderableBlockKey(block) {
  if ("id" in block && typeof block.id === "string") return `${block.type}:${block.id}`;
  if ("tool_use_id" in block && typeof block.tool_use_id === "string")
    return `${block.type}:${block.tool_use_id}`;
  try {
    return `${block.type}:${Bun.hash(jsonStringify(block)).toString(36)}`;
  } catch {
    return `${block.type}:unserializable`;
  }
}
//@ chunk-wjygkcr4.js:244303-244384 layout
function logUnrenderableBlockOnce(host, block, error) {
  if (!claimOnceStore.of(host).claim(`unrenderable_block:${unrenderableBlockKey(block)}`)) return;
  logError(error);
}
//@ chunk-wjygkcr4.js:244384-248051 fingerprint (2.1.88 match: AssistantMessageBlock, 0.757)
/**
 * 助手内容块分派：text→AssistantTextMessage，tool_use→AssistantToolUseMessage，thinking/redacted_thinking→思考组件，server_tool_use/advisor 等；无法渲染的块记一次错误日志。
 */
function AssistantMessageBlock(props) {
  let $ = useMemoCache(65);
  let {
    param,
    model,
    addMargin,
    tools,
    commands,
    verbose,
    inProgressToolUseIDs,
    progressMessagesForMessage,
    shouldAnimate,
    shouldShowDot,
    inProgressToolCallCount,
    isTranscriptMode,
    lookups,
    onOpenRateLimitOptions,
    onRateLimitAutoQueueContinue,
    advisorModel,
    isApiError,
    isSessionFailureNotice,
    cloudMemoryToolUseIds,
    apiErrorKind,
    apiMessageId,
    messageUuid,
    isFirstTextBlock,
  } = props;
  let host = useHost();
  let contentSelector;
  if ($[0] !== apiMessageId || $[1] !== param.type) {
    contentSelector = (state) =>
      param.type === "text" && apiMessageId !== undefined
        ? state.displayedMessageContent[apiMessageId]
        : undefined;
    $[0] = apiMessageId;
    $[1] = param.type;
    $[2] = contentSelector;
  } else contentSelector = $[2];
  let appStateSlice = useAppStateSlice(contentSelector);
  if (isFallbackMessage(param)) {
    return null;
  }
  switch (param.type) {
    case "tool_use": {
      let isCloudMemoryCall;
      if ($[3] !== cloudMemoryToolUseIds || $[4] !== param.id) {
        isCloudMemoryCall = cloudMemoryToolUseIds?.includes(param.id);
        $[3] = cloudMemoryToolUseIds;
        $[4] = param.id;
        $[5] = isCloudMemoryCall;
      } else isCloudMemoryCall = $[5];
      const isCloudMemoryCall_2 = isCloudMemoryCall === true;
      let toolUseStatusDotElement;
      if (
        $[6] !== addMargin ||
        $[7] !== commands ||
        $[8] !== inProgressToolCallCount ||
        $[9] !== inProgressToolUseIDs ||
        $[10] !== isTranscriptMode ||
        $[11] !== lookups ||
        $[12] !== param ||
        $[13] !== progressMessagesForMessage ||
        $[14] !== shouldAnimate ||
        $[15] !== shouldShowDot ||
        $[16] !== isCloudMemoryCall_2 ||
        $[17] !== tools ||
        $[18] !== verbose
      ) {
        toolUseStatusDotElement = jsxProd_default(ToolUseStatusDot, {
          param,
          addMargin,
          tools,
          commands,
          verbose,
          inProgressToolUseIDs,
          progressMessagesForMessage,
          shouldAnimate,
          shouldShowDot,
          inProgressToolCallCount,
          lookups,
          isTranscriptMode,
          isCloudMemoryCall: isCloudMemoryCall_2,
        });
        $[6] = addMargin;
        $[7] = commands;
        $[8] = inProgressToolCallCount;
        $[9] = inProgressToolUseIDs;
        $[10] = isTranscriptMode;
        $[11] = lookups;
        $[12] = param;
        $[13] = progressMessagesForMessage;
        $[14] = shouldAnimate;
        $[15] = shouldShowDot;
        $[16] = isCloudMemoryCall_2;
        $[17] = tools;
        $[18] = verbose;
        $[19] = toolUseStatusDotElement;
      } else toolUseStatusDotElement = $[19];
      return toolUseStatusDotElement;
    }
    case "text": {
      if (appStateSlice !== undefined && !verbose) {
        if (!isFirstTextBlock) {
          return null;
        }
        let param;
        if ($[20] !== appStateSlice) {
          param = {
            type: "text",
            text: appStateSlice,
          };
          $[20] = appStateSlice;
          $[21] = param;
        } else param = $[21];
        let textBlock;
        if (
          $[22] !== addMargin ||
          $[23] !== apiErrorKind ||
          $[24] !== isApiError ||
          $[25] !== isSessionFailureNotice ||
          $[26] !== messageUuid ||
          $[27] !== onOpenRateLimitOptions ||
          $[28] !== onRateLimitAutoQueueContinue ||
          $[29] !== shouldShowDot ||
          $[30] !== param ||
          $[31] !== verbose
        ) {
          textBlock = jsxProd_default(AssistantTextBlock, {
            param,
            addMargin,
            shouldShowDot,
            verbose,
            messageId: messageUuid,
            isApiError,
            isSessionFailureNotice,
            apiErrorKind,
            onOpenRateLimitOptions,
            onRateLimitAutoQueueContinue,
          });
          $[22] = addMargin;
          $[23] = apiErrorKind;
          $[24] = isApiError;
          $[25] = isSessionFailureNotice;
          $[26] = messageUuid;
          $[27] = onOpenRateLimitOptions;
          $[28] = onRateLimitAutoQueueContinue;
          $[29] = shouldShowDot;
          $[30] = param;
          $[31] = verbose;
          $[32] = textBlock;
        } else textBlock = $[32];
        return textBlock;
      }
      let textBlockPlain;
      if (
        $[33] !== addMargin ||
        $[34] !== apiErrorKind ||
        $[35] !== isApiError ||
        $[36] !== isSessionFailureNotice ||
        $[37] !== messageUuid ||
        $[38] !== onOpenRateLimitOptions ||
        $[39] !== onRateLimitAutoQueueContinue ||
        $[40] !== param ||
        $[41] !== shouldShowDot ||
        $[42] !== verbose
      ) {
        textBlockPlain = jsxProd_default(AssistantTextBlock, {
          param,
          addMargin,
          shouldShowDot,
          verbose,
          messageId: messageUuid,
          isApiError,
          isSessionFailureNotice,
          apiErrorKind,
          onOpenRateLimitOptions,
          onRateLimitAutoQueueContinue,
        });
        $[33] = addMargin;
        $[34] = apiErrorKind;
        $[35] = isApiError;
        $[36] = isSessionFailureNotice;
        $[37] = messageUuid;
        $[38] = onOpenRateLimitOptions;
        $[39] = onRateLimitAutoQueueContinue;
        $[40] = param;
        $[41] = shouldShowDot;
        $[42] = verbose;
        $[43] = textBlockPlain;
      } else textBlockPlain = $[43];
      return textBlockPlain;
    }
    case "redacted_thinking": {
      if (!isTranscriptMode && !verbose) {
        return null;
      }
      let t1;
      if ($[44] !== addMargin) {
        t1 = jsxProd_default(AssistantRedactedThinkingMessage, {
          addMargin,
        });
        $[44] = addMargin;
        $[45] = t1;
      } else t1 = $[45];
      return t1;
    }
    case "thinking": {
      if (hasNarrationThinking(param)) {
        let assistantThinkingBlockElement;
        if (
          $[46] !== addMargin ||
          $[47] !== messageUuid ||
          $[48] !== model ||
          $[49] !== param ||
          $[50] !== shouldShowDot
        ) {
          assistantThinkingBlockElement = jsxProd_default(AssistantThinkingBlock, {
            param,
            model,
            addMargin,
            shouldShowDot,
            messageId: messageUuid,
          });
          $[46] = addMargin;
          $[47] = messageUuid;
          $[48] = model;
          $[49] = param;
          $[50] = shouldShowDot;
          $[51] = assistantThinkingBlockElement;
        } else assistantThinkingBlockElement = $[51];
        return assistantThinkingBlockElement;
      }
      if (!isTranscriptMode && !verbose) {
        return null;
      }
      let assistantThinkingMessageElement;
      if ($[52] !== addMargin || $[53] !== isTranscriptMode || $[54] !== param || $[55] !== verbose) {
        assistantThinkingMessageElement = jsxProd_default(AssistantThinkingMessage, {
          addMargin,
          param,
          isTranscriptMode,
          verbose,
        });
        $[52] = addMargin;
        $[53] = isTranscriptMode;
        $[54] = param;
        $[55] = verbose;
        $[56] = assistantThinkingMessageElement;
      } else assistantThinkingMessageElement = $[56];
      return assistantThinkingMessageElement;
    }
    case "server_tool_use":
    case "advisor_tool_result": {
      if (param.type !== "server_tool_use" || param.name === "advisor") {
        const verbose_2 = verbose || isTranscriptMode;
        let t2;
        if (
          $[57] !== addMargin ||
          $[58] !== advisorModel ||
          $[59] !== lookups.erroredToolUseIDs ||
          $[60] !== lookups.resolvedToolUseIDs ||
          $[61] !== param ||
          $[62] !== shouldAnimate ||
          $[63] !== verbose_2
        ) {
          t2 = jsxProd_default(AdvisorMessage, {
            block: param,
            addMargin,
            resolvedToolUseIDs: lookups.resolvedToolUseIDs,
            erroredToolUseIDs: lookups.erroredToolUseIDs,
            shouldAnimate,
            verbose: verbose_2,
            advisorModel,
          });
          $[57] = addMargin;
          $[58] = advisorModel;
          $[59] = lookups.erroredToolUseIDs;
          $[60] = lookups.resolvedToolUseIDs;
          $[61] = param;
          $[62] = shouldAnimate;
          $[63] = verbose_2;
          $[64] = t2;
        } else t2 = $[64];
        return t2;
      }
      if (TOOL_SEARCH_BLOCK_TYPES.has(param.name)) {
        return null;
      }
      logUnrenderableBlockOnce(
        host,
        param,
        Error(`Unable to render server tool block: ${param.type} (${allowlistedBlockName(param)})`),
      );
      return null;
    }
    case "tool_search_tool_result": {
      return null;
    }
    default: {
      logUnrenderableBlockOnce(
        host,
        param,
        Error(`Unable to render message type: ${allowlistedBlockType(param)}`),
      );
      return null;
    }
  }
}
//@ chunk-wjygkcr4.js:248051-249107 fingerprint (2.1.88 match: areMessagePropsEqual, 0.409)
/**
 * Message 的 memo 比较：uuid、verbose、最新 bash 输出、transcript 模式、续行/说话人标签、进度消息等变化才重渲染。
 */
function areMessagePropsEqual(prev, next) {
  if (prev.message.uuid !== next.message.uuid || prev.joinsTopNotices !== next.joinsTopNotices) return false;
  if (!hasStringUuid(next.message) && prev.message !== next.message) return false;
  if (prev.verbose !== next.verbose) return false;
  let prevIsLatest = prev.latestBashOutputUUID === prev.message.uuid;
  let nextIsLatest = next.latestBashOutputUUID === next.message.uuid;
  if (prevIsLatest !== nextIsLatest) return false;
  if (prev.isTranscriptMode !== next.isTranscriptMode) return false;
  if (
    prev.isUserContinuation !== next.isUserContinuation ||
    prev.isSplitUserContinuation !== next.isSplitUserContinuation ||
    prev.followsSpeakerLabel !== next.followsSpeakerLabel ||
    prev.followsInboundLabel !== next.followsInboundLabel ||
    prev.hasMetadataHeader !== next.hasMetadataHeader ||
    prev.shouldShowDot !== next.shouldShowDot
  )
    return false;
  if (
    (prev.message.type === "work_segment" ||
      prev.message.type === "recap_fold" ||
      isWeakNotified(prev.message) ||
      isWeakNotified(next.message)) &&
    prev.message !== next.message
  )
    return false;
  if (prev.containerWidth !== next.containerWidth) return false;
  if (prev.isStatic && next.isStatic) {
    let briefHiddenCount =
      prev.message.type === "system" && prev.message.subtype === "turn_duration"
        ? prev.message.briefHiddenCount
        : undefined;
    let briefHiddenCount_2 =
      next.message.type === "system" && next.message.subtype === "turn_duration"
        ? next.message.briefHiddenCount
        : undefined;
    return briefHiddenCount === briefHiddenCount_2;
  }
  return false;
}
//@ chunk-wjygkcr4.js:273291-273391 placement
/**
 * 取 MCP 工具的渲染覆盖：先查内置覆盖，再按 uiTableKey 或工具名查覆盖表。
 */
function mcpRenderOverrideFor(tool, slot) {
  let rendererKey = tool.uiTableKey ?? tool.name;
  return (
    getBuiltinMcpRenderOverride(tool, slot) ??
    (Object.hasOwn(GROUPED_TOOL_USE_RENDERERS, rendererKey)
      ? GROUPED_TOOL_USE_RENDERERS[rendererKey]?.[slot]
      : undefined)
  );
}
//@ chunk-wjygkcr4.js:273391-273499 placement
/**
 * 判断覆盖表中某工具是否定义了指定的渲染覆盖。
 */
function hasMcpRenderOverride(toolName, slot) {
  let ownPropertyDescriptor = Object.getOwnPropertyDescriptor(GROUPED_TOOL_USE_RENDERERS, toolName);
  return ownPropertyDescriptor?.value !== undefined && ownPropertyDescriptor.value[slot] !== undefined;
}
export {
  clearMemoryFilesCache,
  mcpRenderOverrideFor,
  hasMcpRenderOverride,
  MessageImpl,
  areMessagePropsEqual,
};
