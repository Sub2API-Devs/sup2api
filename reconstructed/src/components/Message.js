/**
 * components/Message.tsx
 *
 * 单条消息渲染（MessageImpl）：按 user/assistant/attachment/system 等类型与内容块分派到 messages/* 组件；本模块混入大量 thinking 块判定工具（实属 utils/messages）。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/components/Message.tsx
 * pieces: chunk-ah34pb7m.js (15), chunk-e6aww6q8.js (1)
 * attribution: placement 3, sole-consumer 1, affinity 1, fingerprint 5, layout 6
 */
import { w } from "../../vendor/react/compiler-runtime.js";
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
import { PLACED_SITE_MODULE_EXPORTS, hasStringUuid } from "../bridge/inboundMessages.js";
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
import { isWeakNotified } from "../utils/queuedCommandDisplay.js";
import { getBuiltinMcpRenderOverride } from "../utils/computerUse/common.js";
import { GROUPED_TOOL_USE_RENDERERS } from "./messages/SkillProposalMessage.js";
import { claudeMdSessionState } from "../utils/claudemd.js";

//@ chunk-ah34pb7m.js:220968-221152 placement = createUserInterruptionMessage (0.51)
/**
 * React 组件：按 tool_use_id 在 lookups 里找到对应 tool_use 后渲染（找不到返回 null）。旧版名 createUserInterruptionMessage 为错配，应归 components/。
 */
function ToolResultRow(m) {
  let c = w(3);
  let getToolFromMessages = useGetToolFromMessages(m.param.tool_use_id, m.tools, m.lookups);
  if (!getToolFromMessages) {
    return null;
  }
  let g;
  if (c[0] !== m || c[1] !== getToolFromMessages) {
    g = jsxProd_default(ToolResultRequestRow, {
      ...m,
      toolUse: getToolFromMessages,
    });
    c[0] = m;
    c[1] = getToolFromMessages;
    c[2] = g;
  } else g = c[2];
  return g;
}
//@ chunk-ah34pb7m.js:221152-221816 sole-consumer
/**
 * React（编译器产物）组件：把 tool_result 的 tool_use_id、工具名、输出、是否出错/展开作为请求参数渲染一行；只被中断消息组件使用。
 */
function ToolResultRequestRow(props) {
  let x = w(11);
  let { param, message, toolUse } = props;
  let toolUseResult = message.toolUseResult;
  let h = param.is_error === true;
  let M = toolUse.toolUse.name;
  let T = props.verbose || props.isTranscriptMode === true;
  let k;
  let b;
  if (x[0] !== h || x[1] !== T || x[2] !== toolUseResult || x[3] !== param.tool_use_id || x[4] !== M) {
    k = () => ({
      requestId: param.tool_use_id,
      props: {
        tool_use_id: param.tool_use_id,
        tool: M,
        output: toolUseResult,
        isErrored: h,
        isExpanded: T,
      },
    });
    b = [param.tool_use_id, M, toolUseResult, h, T];
    x[0] = h;
    x[1] = T;
    x[2] = toolUseResult;
    x[3] = param.tool_use_id;
    x[4] = M;
    x[5] = k;
    x[6] = b;
  } else {
    k = x[5];
    b = x[6];
  }
  let E = actionKeysNamespace.useRenderInput("ToolResult", k, b);
  let B;
  if (x[7] !== message || x[8] !== toolUseResult || x[9] !== props) {
    B = (L) =>
      jsxProd_default(UserToolResultMessage, {
        ...props,
        message:
          L.props.output === toolUseResult
            ? message
            : {
                ...message,
                toolUseResult: L.props.output,
              },
      });
    x[7] = message;
    x[8] = toolUseResult;
    x[9] = props;
    x[10] = B;
  } else B = x[10];
  return actionKeysNamespace.useRenderHook(E, B);
}
//@ chunk-ah34pb7m.js:225018-225030 affinity
var workSegmentModule = null;
//@ chunk-ah34pb7m.js:225030-234162 fingerprint = MessageImpl (0.586)
/**
 * 单条消息渲染（memo 前的实现）：按 message.type 分派——assistant 逐内容块交给 AssistantMessageBlock，user 交给 UserMessage，attachment/system/grouped_tool_use/collapsed_read_search/work_segment 等交给对应组件；处理 addMargin、verbose、transcript 模式。
 */
function MessageImpl(props) {
  let $ = w(174);
  let {
    message,
    lookups,
    containerWidth,
    addMargin,
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
  let isUserContinuation_2 = isUserContinuation === undefined ? false : isUserContinuation;
  let isSplitUserContinuation_2 = isSplitUserContinuation === undefined ? false : isSplitUserContinuation;
  let pe = followsSpeakerLabel === undefined ? false : followsSpeakerLabel;
  let followsInboundLabel_2 = followsInboundLabel === undefined ? false : followsInboundLabel;
  let hasMetadataHeader_2 = hasMetadataHeader === undefined ? false : hasMetadataHeader;
  let ue = shouldShowNotice(verbose);
  switch (message.type) {
    case "attachment": {
      if (message.attachment.type === "queued_command" && isPeerOrObserver(message.attachment.origin)) {
        let se;
        if ($[0] !== message.attachment.prompt) {
          se = joinTextContent(message.attachment.prompt);
          $[0] = message.attachment.prompt;
          $[1] = se;
        } else se = $[1];
        let text = se;
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
          $[10] !== param ||
          $[11] !== fromName ||
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
          $[10] = param;
          $[11] = fromName;
          $[12] = verbose;
          $[13] = children;
        } else children = $[13];
        let Ue;
        if ($[14] !== children || $[15] !== width) {
          Ue = jsxProd_default(Box, {
            flexDirection: "column",
            width,
            children,
          });
          $[14] = children;
          $[15] = width;
          $[16] = Ue;
        } else Ue = $[16];
        return Ue;
      }
      const width = containerWidth ?? "100%";
      let children;
      if (
        $[17] !== addMargin ||
        $[18] !== followsInboundLabel_2 ||
        $[19] !== pe ||
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
          followsSpeakerLabel: pe,
          followsInboundLabel: followsInboundLabel_2,
          messageId: message.uuid,
        });
        $[17] = addMargin;
        $[18] = followsInboundLabel_2;
        $[19] = pe;
        $[20] = hasMetadataHeader_2;
        $[21] = isTranscriptMode;
        $[22] = message.attachment;
        $[23] = message.uuid;
        $[24] = verbose;
        $[25] = children;
      } else children = $[25];
      let Me;
      if ($[26] !== width || $[27] !== children) {
        Me = jsxProd_default(Box, {
          flexDirection: "column",
          width,
          children,
        });
        $[26] = width;
        $[27] = children;
        $[28] = Me;
      } else Me = $[28];
      return Me;
    }
    case "assistant": {
      let se;
      if ($[29] !== lookups.firstTextBlockUuidByMessageID || $[30] !== message.message.id) {
        se = lookups.firstTextBlockUuidByMessageID.get(message.message.id);
        $[29] = lookups.firstTextBlockUuidByMessageID;
        $[30] = message.message.id;
        $[31] = se;
      } else se = $[31];
      let we = se;
      const width = containerWidth ?? "100%";
      let children;
      if (
        $[32] !== addMargin ||
        $[33] !== commands ||
        $[34] !== disableDisplayOverride ||
        $[35] !== we ||
        $[36] !== pe ||
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
        let be;
        if (
          $[57] !== addMargin ||
          $[58] !== commands ||
          $[59] !== disableDisplayOverride ||
          $[60] !== we ||
          $[61] !== pe ||
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
          be = (param, index) =>
            jsxProd_default(
              AssistantMessageBlock,
              {
                param,
                model: message.message.model,
                addMargin: addMargin && !pe,
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
                isFirstTextBlock: we === undefined || we === message.uuid,
              },
              index,
            );
          $[57] = addMargin;
          $[58] = commands;
          $[59] = disableDisplayOverride;
          $[60] = we;
          $[61] = pe;
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
          $[80] = be;
        } else be = $[80];
        children = message.message.content.map(be);
        $[32] = addMargin;
        $[33] = commands;
        $[34] = disableDisplayOverride;
        $[35] = we;
        $[36] = pe;
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
      let be;
      if ($[81] !== width || $[82] !== children) {
        be = jsxProd_default(Box, {
          flexDirection: "column",
          width,
          children,
        });
        $[81] = width;
        $[82] = children;
        $[83] = be;
      } else be = $[83];
      return be;
    }
    case "user": {
      if (message.isCompactSummary) {
        const screen = isTranscriptMode ? "transcript" : "prompt";
        let Te;
        if ($[84] !== message || $[85] !== screen) {
          Te = jsxProd_default(CompactSummary, {
            message,
            screen,
          });
          $[84] = message;
          $[85] = screen;
          $[86] = Te;
        } else Te = $[86];
        return Te;
      }
      let xe;
      if ($[87] !== message.imagePasteIds || $[88] !== message.message.content) {
        xe = [];
        let imagePosition = 0;
        for (const param of message.message.content) {
          if (param.type === "image") {
            let id = message.imagePasteIds?.[imagePosition];
            imagePosition++;
            xe.push(id ?? imagePosition);
          } else xe.push(imagePosition);
        }
        $[87] = message.imagePasteIds;
        $[88] = message.message.content;
        $[89] = xe;
      } else xe = $[89];
      let isLatestBashOutput = latestBashOutputUUID === message.uuid;
      const width = containerWidth ?? "100%";
      let children;
      if (
        $[90] !== addMargin ||
        $[91] !== followsInboundLabel_2 ||
        $[92] !== pe ||
        $[93] !== hasMetadataHeader_2 ||
        $[94] !== xe ||
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
              imageIndex: xe[index],
              isUserContinuation: isUserContinuation_2,
              isSplitUserContinuation: isSplitUserContinuation_2,
              followsSpeakerLabel: pe,
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
        $[92] = pe;
        $[93] = hasMetadataHeader_2;
        $[94] = xe;
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
      let Me;
      if ($[105] !== width || $[106] !== children) {
        Me = jsxProd_default(Box, {
          flexDirection: "column",
          width,
          children,
        });
        $[105] = width;
        $[106] = children;
        $[107] = Me;
      } else Me = $[107];
      let content = Me;
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
      let Ue;
      if ($[111] !== children_2 || $[112] !== value) {
        Ue = jsxProd_default(interruptedByUserSignal.Provider, {
          value,
          children: children_2,
        });
        $[111] = children_2;
        $[112] = value;
        $[113] = Ue;
      } else Ue = $[113];
      return Ue;
    }
    case "system": {
      if (message.subtype === "compact_boundary") {
        let se;
        if ($[114] !== message || $[115] !== ue) {
          se = jsxProd_default(CompactBoundaryMessage, {
            message,
            transcriptV2Rows: ue,
          });
          $[114] = message;
          $[115] = ue;
          $[116] = se;
        } else se = $[116];
        return se;
      }
      if (message.subtype === "placed") {
        let se;
        if ($[117] !== message) {
          se = jsxProd_default(PLACED_SITE_MODULE_EXPORTS.PlacedSite, {
            message,
          });
          $[117] = message;
          $[118] = se;
        } else se = $[118];
        return se;
      }
      if (message.subtype === "microcompact_boundary") {
        return null;
      }
      if (ue) {
        let se;
        if ($[119] !== message) {
          se = parseSystemMessage(message);
          $[119] = message;
          $[120] = se;
        } else se = $[120];
        let Xe = se;
        if (Xe.kind === "hidden") {
          return null;
        }
        if (Xe.kind === "line") {
          let Te;
          if ($[121] !== addMargin || $[122] !== Xe.row) {
            Te = jsxProd_default(NoticeRowMessage, {
              row: Xe.row,
              addMargin,
            });
            $[121] = addMargin;
            $[122] = Xe.row;
            $[123] = Te;
          } else Te = $[123];
          return Te;
        }
      }
      if (message.subtype === "read_divider") {
        let se;
        if ($[124] !== message.content) {
          se = jsxProd_default(Box, {
            marginTop: 1,
            width: "100%",
            children: jsxProd_default(Divider, {
              title: message.content,
              color: "inactive",
            }),
          });
          $[124] = message.content;
          $[125] = se;
        } else se = $[125];
        return se;
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
        let Te;
        if (
          $[128] !== addMargin ||
          $[129] !== pe ||
          $[130] !== isTranscriptMode ||
          $[131] !== message.commandRun ||
          $[132] !== message.uuid ||
          $[133] !== param ||
          $[134] !== verbose
        ) {
          Te = jsxProd_default(UserTextMessage, {
            addMargin,
            param,
            verbose,
            isTranscriptMode,
            messageId: message.uuid,
            commandRun: message.commandRun,
            followsSpeakerLabel: pe,
          });
          $[128] = addMargin;
          $[129] = pe;
          $[130] = isTranscriptMode;
          $[131] = message.commandRun;
          $[132] = message.uuid;
          $[133] = param;
          $[134] = verbose;
          $[135] = Te;
        } else Te = $[135];
        return Te;
      }
      let se;
      if ($[136] !== addMargin || $[137] !== isTranscriptMode || $[138] !== message || $[139] !== verbose) {
        se = jsxProd_default(SystemTextMessage, {
          message,
          addMargin,
          verbose,
          isTranscriptMode,
        });
        $[136] = addMargin;
        $[137] = isTranscriptMode;
        $[138] = message;
        $[139] = verbose;
        $[140] = se;
      } else se = $[140];
      return se;
    }
    case "grouped_tool_use": {
      let se;
      if (
        $[141] !== addMargin ||
        $[142] !== inProgressToolUseIDs ||
        $[143] !== lookups ||
        $[144] !== message ||
        $[145] !== shouldAnimate ||
        $[146] !== tools
      ) {
        se = jsxProd_default(GroupedToolUseContent_2, {
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
        $[147] = se;
      } else se = $[147];
      return se;
    }
    case "collapsed_read_search": {
      let se;
      if ($[148] !== lookups || $[149] !== message) {
        const toolUseIds = collectToolUseIds(message);
        let Me;
        if ($[151] !== lookups) {
          Me = (Ge) => {
            let ao = lookups.toolResultByToolUseID.get(Ge);
            return ao?.type === "user" && ao.interruptedBySendNow === true;
          };
          $[151] = lookups;
          $[152] = Me;
        } else Me = $[152];
        se = toolUseIds.some(Me);
        $[148] = lookups;
        $[149] = message;
        $[150] = se;
      } else se = $[150];
      let value = se;
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
      let be;
      if ($[162] !== value || $[163] !== children) {
        be = jsxProd_default(FreezeWhenOffscreen, {
          children: jsxProd_default(interruptedByUserSignal.Provider, {
            value,
            children,
          }),
        });
        $[162] = value;
        $[163] = children;
        $[164] = be;
      } else be = $[164];
      return be;
    }
    case "work_segment": {
      let se;
      if ($[165] !== message || $[166] !== shouldAnimate) {
        se = jsxProd_default(WorkSegmentMessageView, {
          message,
          shouldAnimate,
        });
        $[165] = message;
        $[166] = shouldAnimate;
        $[167] = se;
      } else se = $[167];
      return se;
    }
    case "speaker_label": {
      let se;
      if ($[168] !== containerWidth || $[169] !== message.speaker) {
        se =
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
        $[170] = se;
      } else se = $[170];
      return se;
    }
    case "recap_fold": {
      let se;
      if ($[171] !== addMargin || $[172] !== message) {
        se =
          workSegmentModule === null
            ? null
            : jsxProd_default(workSegmentModule.RecapFoldMessage, {
                message,
                addMargin,
              });
        $[171] = addMargin;
        $[172] = message;
        $[173] = se;
      } else se = $[173];
      return se;
    }
  }
}
//@ chunk-ah34pb7m.js:234162-234400 layout
function WorkSegmentMessageView(props) {
  let $ = w(3);
  let { message, shouldAnimate } = props;
  let prefersReducedMotion = usePrefersReducedMotion();
  let isScreenReaderEnabled = useIsScreenReaderEnabled();
  if (workSegmentModule === null) {
    return null;
  }
  const reducedMotion = prefersReducedMotion || isScreenReaderEnabled || !shouldAnimate;
  let T;
  if ($[0] !== message || $[1] !== reducedMotion) {
    T = jsxProd_default(workSegmentModule.WorkSegmentMessage, {
      message,
      reducedMotion,
    });
    $[0] = message;
    $[1] = reducedMotion;
    $[2] = T;
  } else T = $[2];
  return T;
}
//@ chunk-ah34pb7m.js:234400-236422 fingerprint = UserMessage (0.682)
/**
 * 用户消息分派：按内容块类型（text/image/tool_result）选择 UserTextMessage、UserImageMessage、UserToolResultMessage；coordinator 模式特殊处理。
 */
function UserMessage(props) {
  let $ = w(39);
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
        let X;
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
          X = jsxProd_default(AgentMessage, {
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
          $[10] = X;
        } else X = $[10];
        return X;
      }
      const followsCoordinatorLabel = followsInboundLabel && message.origin?.kind === "coordinator";
      let Y;
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
        Y = jsxProd_default(UserTextMessage, {
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
        $[24] = Y;
      } else Y = $[24];
      return Y;
    }
    case "image": {
      const addMargin_2 = addMargin && !isUserContinuation;
      const startsUserTurn = hasMetadataHeader ? !isSplitUserContinuation : undefined;
      let X;
      if ($[25] !== imageIndex || $[26] !== addMargin_2 || $[27] !== startsUserTurn) {
        X = jsxProd_default(UserImageMessage, {
          imageId: imageIndex,
          addMargin: addMargin_2,
          startsUserTurn,
        });
        $[25] = imageIndex;
        $[26] = addMargin_2;
        $[27] = startsUserTurn;
        $[28] = X;
      } else X = $[28];
      return X;
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
//@ chunk-ah34pb7m.js:236422-236489 layout
var TOOL_SEARCH_BLOCK_TYPES = new Set(["tool_search_tool_regex", "tool_search_tool_bm25"]);
//@ chunk-ah34pb7m.js:236489-236559 layout
function allowlistedBlockName(param) {
  return "name" in param && isServerToolType(param.name) ? param.name : "non-allowlisted";
}
//@ chunk-ah34pb7m.js:236559-236679 layout
function allowlistedBlockType(param) {
  let d = "type" in param ? param.type : undefined;
  if (typeof d !== "string") return "non-allowlisted (non-string)";
  return allowlistedBlockType_2(d);
}
//@ chunk-ah34pb7m.js:236679-236938 layout
function unrenderableBlockKey(m) {
  if ("id" in m && typeof m.id === "string") return `${m.type}:${m.id}`;
  if ("tool_use_id" in m && typeof m.tool_use_id === "string") return `${m.type}:${m.tool_use_id}`;
  try {
    return `${m.type}:${Bun.hash(jsonStringify(m)).toString(36)}`;
  } catch {
    return `${m.type}:unserializable`;
  }
}
//@ chunk-ah34pb7m.js:236938-237019 layout
function logUnrenderableBlockOnce(host, param, c) {
  if (!claimOnceStore.of(host).claim(`unrenderable_block:${unrenderableBlockKey(param)}`)) return;
  logError(c);
}
//@ chunk-ah34pb7m.js:237019-240675 fingerprint = AssistantMessageBlock (0.765)
/**
 * 助手内容块分派：text→AssistantTextMessage，tool_use→AssistantToolUseMessage，thinking/redacted_thinking→思考组件，server_tool_use/advisor 等；无法渲染的块记一次错误日志。
 */
function AssistantMessageBlock(props) {
  let $ = w(65);
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
  let pe;
  if ($[0] !== apiMessageId || $[1] !== param.type) {
    pe = (te) =>
      param.type === "text" && apiMessageId !== undefined
        ? te.displayedMessageContent[apiMessageId]
        : undefined;
    $[0] = apiMessageId;
    $[1] = param.type;
    $[2] = pe;
  } else pe = $[2];
  let appStateSlice = useAppStateSlice(pe);
  if (isFallbackMessage(param)) {
    return null;
  }
  switch (param.type) {
    case "tool_use": {
      let ue;
      if ($[3] !== cloudMemoryToolUseIds || $[4] !== param.id) {
        ue = cloudMemoryToolUseIds?.includes(param.id);
        $[3] = cloudMemoryToolUseIds;
        $[4] = param.id;
        $[5] = ue;
      } else ue = $[5];
      const isCloudMemoryCall = ue === true;
      let se;
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
        $[16] !== isCloudMemoryCall ||
        $[17] !== tools ||
        $[18] !== verbose
      ) {
        se = jsxProd_default(ToolUseStatusDot, {
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
          isCloudMemoryCall,
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
        $[16] = isCloudMemoryCall;
        $[17] = tools;
        $[18] = verbose;
        $[19] = se;
      } else se = $[19];
      return se;
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
        let J;
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
          J = jsxProd_default(AssistantTextBlock, {
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
          $[32] = J;
        } else J = $[32];
        return J;
      }
      let ue;
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
        ue = jsxProd_default(AssistantTextBlock, {
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
        $[43] = ue;
      } else ue = $[43];
      return ue;
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
        let ue;
        if (
          $[46] !== addMargin ||
          $[47] !== messageUuid ||
          $[48] !== model ||
          $[49] !== param ||
          $[50] !== shouldShowDot
        ) {
          ue = jsxProd_default(AssistantThinkingBlock, {
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
          $[51] = ue;
        } else ue = $[51];
        return ue;
      }
      if (!isTranscriptMode && !verbose) {
        return null;
      }
      let ue;
      if ($[52] !== addMargin || $[53] !== isTranscriptMode || $[54] !== param || $[55] !== verbose) {
        ue = jsxProd_default(AssistantThinkingMessage, {
          addMargin,
          param,
          isTranscriptMode,
          verbose,
        });
        $[52] = addMargin;
        $[53] = isTranscriptMode;
        $[54] = param;
        $[55] = verbose;
        $[56] = ue;
      } else ue = $[56];
      return ue;
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
//@ chunk-ah34pb7m.js:240675-241692 fingerprint = areMessagePropsEqual (0.429)
/**
 * Message 的 memo 比较：uuid、verbose、最新 bash 输出、transcript 模式、续行/说话人标签、进度消息等变化才重渲染。
 */
function areMessagePropsEqual(prev, next) {
  if (prev.message.uuid !== next.message.uuid) return false;
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
//@ chunk-ah34pb7m.js:265606-265706 placement
/**
 * 取 MCP 工具的渲染覆盖：先查内置覆盖，再按 uiTableKey 或工具名查覆盖表。
 */
function mcpRenderOverrideFor(tool, slot) {
  let c = tool.uiTableKey ?? tool.name;
  return (
    getBuiltinMcpRenderOverride(tool, slot) ??
    (Object.hasOwn(GROUPED_TOOL_USE_RENDERERS, c) ? GROUPED_TOOL_USE_RENDERERS[c]?.[slot] : undefined)
  );
}
//@ chunk-ah34pb7m.js:265706-265814 placement
/**
 * 判断覆盖表中某工具是否定义了指定的渲染覆盖。
 */
function hasMcpRenderOverride(m, d) {
  let ownPropertyDescriptor = Object.getOwnPropertyDescriptor(GROUPED_TOOL_USE_RENDERERS, m);
  return ownPropertyDescriptor?.value !== undefined && ownPropertyDescriptor.value[d] !== undefined;
}
//@ chunk-e6aww6q8.js:1349439-1349495 fingerprint = Message (0.471)
/**
 * 清空某宿主的记忆文件缓存（loads/moves）。
 */
function clearMemoryFilesCache(e) {
  claudeMdSessionState(e).memo = {
    loads: new Map(),
    moves: new Map(),
  };
}
export {
  mcpRenderOverrideFor,
  MessageImpl,
  areMessagePropsEqual,
  clearMemoryFilesCache,
  hasMcpRenderOverride,
};
