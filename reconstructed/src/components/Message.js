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
import { e } from "../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { actionKeysNamespace } from "./pluginUi/render/actionKeys.js";
import { UserToolResultMessage } from "./messages/UserToolResultMessage/UserToolResultMessage.js";
import { shouldShowNotice } from "./SlashCommandLink.js";
import { isPeerOrObserver, joinTextContent, Qmr } from "../utils/messageProvenance.js";
import { AgentMessage } from "./messages/AgentMessage.js";
import { Box } from "../ink/components/Text.js";
import { AttachmentMessage } from "./messages/AttachmentMessage.js";
import { CompactSummary } from "./CompactSummary.js";
import { InsideToolResultProvider } from "./shell/OutputLine.js";
import { jt } from "./messages/UserToolResultMessage/RejectedToolUseMessage.js";
import { CompactBoundaryMessage } from "./messages/CompactBoundaryMessage.js";
import { Qn, hasStringUuid } from "../bridge/inboundMessages.js";
import { parseSystemMessage } from "./messages/SystemNoticeMessage.js";
import { NoticeRowMessage } from "./messages/teamMemSaved.js";
import { Divider } from "./design-system/Divider.js";
import { UserTextMessage } from "./messages/UserTextMessage.js";
import { SystemTextMessage } from "./messages/SystemTextMessage.js";
import { GroupedToolUseContent_2, GroupedToolUseContent } from "./messages/GroupedToolUseContent.js";
import { ife } from "./messageActions.js";
import { FreezeWhenOffscreen } from "./FreezeWhenOffscreen.js";
import { usePrefersReducedMotion } from "./Spinner/spinnerFlags.js";
import { useIsScreenReaderEnabled } from "../ink/components/ErrorBoundary.js";
import { useTerminalSize } from "../hooks/useTerminalSize.js";
import { UserImageMessage } from "./messages/UserImageMessage.js";
import { u9n } from "../utils/conversationRecovery.js";
import { NEi } from "../services/api/requestHeaders.js";
import { jsonStringify } from "../utils/slowOperations.js";
import { claimOnceStore } from "../services/api/verificationRequired.js";
import { logError } from "../utils/log.js";
import { useHost } from "../context/session.js";
import { rs } from "../state/AppState.js";
import { K5 } from "../utils/messages/apiMediaNormalization.js";
import { ToolUseStatusDot } from "./messages/AssistantToolUseMessage.js";
import { AssistantTextBlock, AssistantThinkingBlock } from "./messages/AssistantTextMessage.js";
import { AssistantRedactedThinkingMessage } from "./messages/AssistantRedactedThinkingMessage.js";
import { ltt } from "../utils/messages/apiNormalization.js";
import { AssistantThinkingMessage } from "./messages/AssistantThinkingMessage.js";
import { AdvisorMessage } from "./messages/AdvisorMessage.js";
import { BWr } from "../utils/queuedCommandDisplay.js";
import { getBuiltinMcpRenderOverride } from "../utils/computerUse/common.js";
import { zh } from "./messages/SkillProposalMessage.js";
import { NA } from "../utils/claudemd.js";

/**
 * React 组件：按 tool_use_id 在 lookups 里找到对应 tool_use 后渲染（找不到返回 null）。旧版名 createUserInterruptionMessage 为错配，应归 components/。
 */
//@ chunk-ah34pb7m.js:220968-221152 placement = createUserInterruptionMessage (0.51)
function ToolResultRow(m) {
  let c = w(3),
    d = useGetToolFromMessages(m.param.tool_use_id, m.tools, m.lookups);
  if (!d) {
    return null;
  }
  let g;
  if (c[0] !== m || c[1] !== d)
    ((g = e(ToolResultRequestRow, { ...m, toolUse: d })), (c[0] = m), (c[1] = d), (c[2] = g));
  else g = c[2];
  return g;
}
/**
 * React（编译器产物）组件：把 tool_result 的 tool_use_id、工具名、输出、是否出错/展开作为请求参数渲染一行；只被中断消息组件使用。
 */
//@ chunk-ah34pb7m.js:221152-221816 sole-consumer
function ToolResultRequestRow(m) {
  let x = w(11),
    { param: param, message: message, toolUse: toolUse } = m,
    toolUseResult = message.toolUseResult,
    h = param.is_error === !0,
    M = toolUse.toolUse.name,
    T = m.verbose || m.isTranscriptMode === !0,
    k,
    b;
  if (x[0] !== h || x[1] !== T || x[2] !== toolUseResult || x[3] !== param.tool_use_id || x[4] !== M)
    ((k = () => ({
      requestId: param.tool_use_id,
      props: { tool_use_id: param.tool_use_id, tool: M, output: toolUseResult, isErrored: h, isExpanded: T },
    })),
      (b = [param.tool_use_id, M, toolUseResult, h, T]),
      (x[0] = h),
      (x[1] = T),
      (x[2] = toolUseResult),
      (x[3] = param.tool_use_id),
      (x[4] = M),
      (x[5] = k),
      (x[6] = b));
  else ((k = x[5]), (b = x[6]));
  let useRenderInput = actionKeysNamespace.useRenderInput("ToolResult", k, b),
    B;
  if (x[7] !== message || x[8] !== toolUseResult || x[9] !== m)
    ((B = (L) =>
      e(UserToolResultMessage, {
        ...m,
        message: L.props.output === toolUseResult ? message : { ...message, toolUseResult: L.props.output },
      })),
      (x[7] = message),
      (x[8] = toolUseResult),
      (x[9] = m),
      (x[10] = B));
  else B = x[10];
  return actionKeysNamespace.useRenderHook(useRenderInput, B);
}
//@ chunk-ah34pb7m.js:225018-225030 affinity
var workSegmentModule = null;
/**
 * 单条消息渲染（memo 前的实现）：按 message.type 分派——assistant 逐内容块交给 AssistantMessageBlock，user 交给 UserMessage，attachment/system/grouped_tool_use/collapsed_read_search/work_segment 等交给对应组件；处理 addMargin、verbose、transcript 模式。
 */
//@ chunk-ah34pb7m.js:225030-234162 fingerprint = MessageImpl (0.586)
function MessageImpl(t0) {
  let $ = w(174),
    {
      message: message,
      lookups: lookups,
      containerWidth: containerWidth,
      addMargin: addMargin,
      tools: tools,
      commands: commands,
      verbose: verbose,
      inProgressToolUseIDs: inProgressToolUseIDs,
      progressMessagesForMessage: progressMessagesForMessage,
      shouldAnimate: shouldAnimate,
      shouldShowDot: shouldShowDot,
      style: style,
      isTranscriptMode: isTranscriptMode,
      onOpenRateLimitOptions: onOpenRateLimitOptions,
      onRateLimitAutoQueueContinue: onRateLimitAutoQueueContinue,
      isActiveCollapsedGroup: isActiveCollapsedGroup,
      isUserContinuation: t1,
      isSplitUserContinuation: isSplitUserContinuation,
      followsSpeakerLabel: followsSpeakerLabel,
      followsInboundLabel: followsInboundLabel,
      hasMetadataHeader: hasMetadataHeader,
      latestBashOutputUUID: latestBashOutputUUID,
      disableDisplayOverride: disableDisplayOverride,
    } = t0,
    ge = t1 === void 0 ? !1 : t1,
    ae = isSplitUserContinuation === void 0 ? !1 : isSplitUserContinuation,
    pe = followsSpeakerLabel === void 0 ? !1 : followsSpeakerLabel,
    te = followsInboundLabel === void 0 ? !1 : followsInboundLabel,
    de = hasMetadataHeader === void 0 ? !1 : hasMetadataHeader,
    ue = shouldShowNotice(verbose);
  switch (message.type) {
    case "attachment": {
      if (message.attachment.type === "queued_command" && isPeerOrObserver(message.attachment.origin)) {
        let se;
        if ($[0] !== message.attachment.prompt)
          ((se = joinTextContent(message.attachment.prompt)),
            ($[0] = message.attachment.prompt),
            ($[1] = se));
        else se = $[1];
        let ye = se;
        const Te = containerWidth ?? "100%";
        let Me;
        if ($[2] !== ye) ((Me = { text: ye, type: "text" }), ($[2] = ye), ($[3] = Me));
        else Me = $[3];
        let be;
        if ($[4] !== message.attachment.origin)
          ((be = Qmr(message.attachment.origin)), ($[4] = message.attachment.origin), ($[5] = be));
        else be = $[5];
        let ve;
        if (
          $[6] !== addMargin ||
          $[7] !== isTranscriptMode ||
          $[8] !== message.attachment.origin ||
          $[9] !== message.uuid ||
          $[10] !== Me ||
          $[11] !== be ||
          $[12] !== verbose
        )
          ((ve = e(AgentMessage, {
            addMargin: addMargin,
            param: Me,
            fromName: be,
            verbose: verbose,
            isTranscriptMode: isTranscriptMode,
            messageId: message.uuid,
            origin: message.attachment.origin,
          })),
            ($[6] = addMargin),
            ($[7] = isTranscriptMode),
            ($[8] = message.attachment.origin),
            ($[9] = message.uuid),
            ($[10] = Me),
            ($[11] = be),
            ($[12] = verbose),
            ($[13] = ve));
        else ve = $[13];
        let Ue;
        if ($[14] !== ve || $[15] !== Te)
          ((Ue = e(Box, { flexDirection: "column", width: Te, children: ve })),
            ($[14] = ve),
            ($[15] = Te),
            ($[16] = Ue));
        else Ue = $[16];
        return Ue;
      }
      const se = containerWidth ?? "100%";
      let Te;
      if (
        $[17] !== addMargin ||
        $[18] !== te ||
        $[19] !== pe ||
        $[20] !== de ||
        $[21] !== isTranscriptMode ||
        $[22] !== message.attachment ||
        $[23] !== message.uuid ||
        $[24] !== verbose
      )
        ((Te = e(AttachmentMessage, {
          addMargin: addMargin,
          attachment: message.attachment,
          verbose: verbose,
          isTranscriptMode: isTranscriptMode,
          hasMetadataHeader: de,
          followsSpeakerLabel: pe,
          followsInboundLabel: te,
          messageId: message.uuid,
        })),
          ($[17] = addMargin),
          ($[18] = te),
          ($[19] = pe),
          ($[20] = de),
          ($[21] = isTranscriptMode),
          ($[22] = message.attachment),
          ($[23] = message.uuid),
          ($[24] = verbose),
          ($[25] = Te));
      else Te = $[25];
      let Me;
      if ($[26] !== se || $[27] !== Te)
        ((Me = e(Box, { flexDirection: "column", width: se, children: Te })),
          ($[26] = se),
          ($[27] = Te),
          ($[28] = Me));
      else Me = $[28];
      return Me;
    }
    case "assistant": {
      let se;
      if ($[29] !== lookups.firstTextBlockUuidByMessageID || $[30] !== message.message.id)
        ((se = lookups.firstTextBlockUuidByMessageID.get(message.message.id)),
          ($[29] = lookups.firstTextBlockUuidByMessageID),
          ($[30] = message.message.id),
          ($[31] = se));
      else se = $[31];
      let we = se;
      const Te = containerWidth ?? "100%";
      let Me;
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
        )
          ((be = ($e, index_0) =>
            e(
              AssistantMessageBlock,
              {
                param: $e,
                model: message.message.model,
                addMargin: addMargin && !pe,
                tools: tools,
                commands: commands,
                verbose: verbose,
                inProgressToolUseIDs: inProgressToolUseIDs,
                progressMessagesForMessage: progressMessagesForMessage,
                shouldAnimate: shouldAnimate,
                shouldShowDot: shouldShowDot,
                inProgressToolCallCount: inProgressToolUseIDs.size,
                isTranscriptMode: isTranscriptMode,
                lookups: lookups,
                onOpenRateLimitOptions: onOpenRateLimitOptions,
                onRateLimitAutoQueueContinue: onRateLimitAutoQueueContinue,
                advisorModel: message.advisorModel,
                isApiError: message.isApiErrorMessage === !0,
                isSessionFailureNotice: message.sessionFailureNotice === !0,
                cloudMemoryToolUseIds: message.cloudMemoryToolUseIds,
                apiErrorKind: message.error,
                apiMessageId: disableDisplayOverride ? void 0 : message.message.id,
                messageUuid: message.uuid,
                isFirstTextBlock: we === void 0 || we === message.uuid,
              },
              index_0,
            )),
            ($[57] = addMargin),
            ($[58] = commands),
            ($[59] = disableDisplayOverride),
            ($[60] = we),
            ($[61] = pe),
            ($[62] = inProgressToolUseIDs),
            ($[63] = isTranscriptMode),
            ($[64] = lookups),
            ($[65] = message.advisorModel),
            ($[66] = message.cloudMemoryToolUseIds),
            ($[67] = message.error),
            ($[68] = message.isApiErrorMessage),
            ($[69] = message.message.id),
            ($[70] = message.message.model),
            ($[71] = message.sessionFailureNotice),
            ($[72] = message.uuid),
            ($[73] = onOpenRateLimitOptions),
            ($[74] = onRateLimitAutoQueueContinue),
            ($[75] = progressMessagesForMessage),
            ($[76] = shouldAnimate),
            ($[77] = shouldShowDot),
            ($[78] = tools),
            ($[79] = verbose),
            ($[80] = be));
        else be = $[80];
        Me = message.message.content.map(be);
        (($[32] = addMargin),
          ($[33] = commands),
          ($[34] = disableDisplayOverride),
          ($[35] = we),
          ($[36] = pe),
          ($[37] = inProgressToolUseIDs),
          ($[38] = isTranscriptMode),
          ($[39] = lookups),
          ($[40] = message.advisorModel),
          ($[41] = message.cloudMemoryToolUseIds),
          ($[42] = message.error),
          ($[43] = message.isApiErrorMessage),
          ($[44] = message.message.content),
          ($[45] = message.message.id),
          ($[46] = message.message.model),
          ($[47] = message.sessionFailureNotice),
          ($[48] = message.uuid),
          ($[49] = onOpenRateLimitOptions),
          ($[50] = onRateLimitAutoQueueContinue),
          ($[51] = progressMessagesForMessage),
          ($[52] = shouldAnimate),
          ($[53] = shouldShowDot),
          ($[54] = tools),
          ($[55] = verbose),
          ($[56] = Me));
      } else Me = $[56];
      let be;
      if ($[81] !== Te || $[82] !== Me)
        ((be = e(Box, { flexDirection: "column", width: Te, children: Me })),
          ($[81] = Te),
          ($[82] = Me),
          ($[83] = be));
      else be = $[83];
      return be;
    }
    case "user": {
      if (message.isCompactSummary) {
        const se = isTranscriptMode ? "transcript" : "prompt";
        let Te;
        if ($[84] !== message || $[85] !== se)
          ((Te = e(CompactSummary, { message: message, screen: se })),
            ($[84] = message),
            ($[85] = se),
            ($[86] = Te));
        else Te = $[86];
        return Te;
      }
      let xe;
      if ($[87] !== message.imagePasteIds || $[88] !== message.message.content) {
        xe = [];
        let imagePosition = 0;
        for (const param of message.message.content) {
          if (param.type === "image") {
            let id = message.imagePasteIds?.[imagePosition];
            (imagePosition++, xe.push(id ?? imagePosition));
          } else xe.push(imagePosition);
        }
        (($[87] = message.imagePasteIds), ($[88] = message.message.content), ($[89] = xe));
      } else xe = $[89];
      let Ke = latestBashOutputUUID === message.uuid;
      const se = containerWidth ?? "100%";
      let Te;
      if (
        $[90] !== addMargin ||
        $[91] !== te ||
        $[92] !== pe ||
        $[93] !== de ||
        $[94] !== xe ||
        $[95] !== ae ||
        $[96] !== isTranscriptMode ||
        $[97] !== ge ||
        $[98] !== lookups ||
        $[99] !== message ||
        $[100] !== progressMessagesForMessage ||
        $[101] !== style ||
        $[102] !== tools ||
        $[103] !== verbose
      )
        ((Te = message.message.content.map((param_0, index) =>
          e(
            UserMessage,
            {
              message: message,
              addMargin: addMargin,
              tools: tools,
              progressMessagesForMessage: progressMessagesForMessage,
              param: param_0,
              style: style,
              verbose: verbose,
              imageIndex: xe[index],
              isUserContinuation: ge,
              isSplitUserContinuation: ae,
              followsSpeakerLabel: pe,
              followsInboundLabel: te,
              hasMetadataHeader: de,
              lookups: lookups,
              isTranscriptMode: isTranscriptMode,
            },
            index,
          ),
        )),
          ($[90] = addMargin),
          ($[91] = te),
          ($[92] = pe),
          ($[93] = de),
          ($[94] = xe),
          ($[95] = ae),
          ($[96] = isTranscriptMode),
          ($[97] = ge),
          ($[98] = lookups),
          ($[99] = message),
          ($[100] = progressMessagesForMessage),
          ($[101] = style),
          ($[102] = tools),
          ($[103] = verbose),
          ($[104] = Te));
      else Te = $[104];
      let Me;
      if ($[105] !== se || $[106] !== Te)
        ((Me = e(Box, { flexDirection: "column", width: se, children: Te })),
          ($[105] = se),
          ($[106] = Te),
          ($[107] = Me));
      else Me = $[107];
      let go = Me;
      const be = message.interruptedBySendNow === !0;
      let ve;
      if ($[108] !== go || $[109] !== Ke)
        ((ve = Ke ? e(InsideToolResultProvider, { children: go }) : go),
          ($[108] = go),
          ($[109] = Ke),
          ($[110] = ve));
      else ve = $[110];
      let Ue;
      if ($[111] !== ve || $[112] !== be)
        ((Ue = e(jt.Provider, { value: be, children: ve })), ($[111] = ve), ($[112] = be), ($[113] = Ue));
      else Ue = $[113];
      return Ue;
    }
    case "system": {
      if (message.subtype === "compact_boundary") {
        let se;
        if ($[114] !== message || $[115] !== ue)
          ((se = e(CompactBoundaryMessage, { message: message, transcriptV2Rows: ue })),
            ($[114] = message),
            ($[115] = ue),
            ($[116] = se));
        else se = $[116];
        return se;
      }
      if (message.subtype === "placed") {
        let se;
        if ($[117] !== message)
          ((se = e(Qn.PlacedSite, { message: message })), ($[117] = message), ($[118] = se));
        else se = $[118];
        return se;
      }
      if (message.subtype === "microcompact_boundary") {
        return null;
      }
      if (ue) {
        let se;
        if ($[119] !== message) ((se = parseSystemMessage(message)), ($[119] = message), ($[120] = se));
        else se = $[120];
        let Xe = se;
        if (Xe.kind === "hidden") {
          return null;
        }
        if (Xe.kind === "line") {
          let Te;
          if ($[121] !== addMargin || $[122] !== Xe.row)
            ((Te = e(NoticeRowMessage, { row: Xe.row, addMargin: addMargin })),
              ($[121] = addMargin),
              ($[122] = Xe.row),
              ($[123] = Te));
          else Te = $[123];
          return Te;
        }
      }
      if (message.subtype === "read_divider") {
        let se;
        if ($[124] !== message.content)
          ((se = e(Box, {
            marginTop: 1,
            width: "100%",
            children: e(Divider, { title: message.content, color: "inactive" }),
          })),
            ($[124] = message.content),
            ($[125] = se));
        else se = $[125];
        return se;
      }
      if (message.subtype === "local_command") {
        let se;
        if ($[126] !== message.content)
          ((se = { type: "text", text: message.content }), ($[126] = message.content), ($[127] = se));
        else se = $[127];
        let Te;
        if (
          $[128] !== addMargin ||
          $[129] !== pe ||
          $[130] !== isTranscriptMode ||
          $[131] !== message.commandRun ||
          $[132] !== message.uuid ||
          $[133] !== se ||
          $[134] !== verbose
        )
          ((Te = e(UserTextMessage, {
            addMargin: addMargin,
            param: se,
            verbose: verbose,
            isTranscriptMode: isTranscriptMode,
            messageId: message.uuid,
            commandRun: message.commandRun,
            followsSpeakerLabel: pe,
          })),
            ($[128] = addMargin),
            ($[129] = pe),
            ($[130] = isTranscriptMode),
            ($[131] = message.commandRun),
            ($[132] = message.uuid),
            ($[133] = se),
            ($[134] = verbose),
            ($[135] = Te));
        else Te = $[135];
        return Te;
      }
      let se;
      if ($[136] !== addMargin || $[137] !== isTranscriptMode || $[138] !== message || $[139] !== verbose)
        ((se = e(SystemTextMessage, {
          message: message,
          addMargin: addMargin,
          verbose: verbose,
          isTranscriptMode: isTranscriptMode,
        })),
          ($[136] = addMargin),
          ($[137] = isTranscriptMode),
          ($[138] = message),
          ($[139] = verbose),
          ($[140] = se));
      else se = $[140];
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
      )
        ((se = e(GroupedToolUseContent_2, {
          message: message,
          tools: tools,
          lookups: lookups,
          inProgressToolUseIDs: inProgressToolUseIDs,
          shouldAnimate: shouldAnimate,
          addMargin: addMargin,
        })),
          ($[141] = addMargin),
          ($[142] = inProgressToolUseIDs),
          ($[143] = lookups),
          ($[144] = message),
          ($[145] = shouldAnimate),
          ($[146] = tools),
          ($[147] = se));
      else se = $[147];
      return se;
    }
    case "collapsed_read_search": {
      let se;
      if ($[148] !== lookups || $[149] !== message) {
        const Te = ife(message);
        let Me;
        if ($[151] !== lookups)
          ((Me = (Ge) => {
            let ao = lookups.toolResultByToolUseID.get(Ge);
            return ao?.type === "user" && ao.interruptedBySendNow === !0;
          }),
            ($[151] = lookups),
            ($[152] = Me));
        else Me = $[152];
        se = Te.some(Me);
        (($[148] = lookups), ($[149] = message), ($[150] = se));
      } else se = $[150];
      let uo = se;
      const Te = verbose || isTranscriptMode;
      let Me;
      if (
        $[153] !== addMargin ||
        $[154] !== inProgressToolUseIDs ||
        $[155] !== isActiveCollapsedGroup ||
        $[156] !== lookups ||
        $[157] !== message ||
        $[158] !== shouldAnimate ||
        $[159] !== Te ||
        $[160] !== tools
      )
        ((Me = e(GroupedToolUseContent, {
          message: message,
          inProgressToolUseIDs: inProgressToolUseIDs,
          shouldAnimate: shouldAnimate,
          verbose: Te,
          tools: tools,
          lookups: lookups,
          isActiveGroup: isActiveCollapsedGroup,
          addMargin: addMargin,
        })),
          ($[153] = addMargin),
          ($[154] = inProgressToolUseIDs),
          ($[155] = isActiveCollapsedGroup),
          ($[156] = lookups),
          ($[157] = message),
          ($[158] = shouldAnimate),
          ($[159] = Te),
          ($[160] = tools),
          ($[161] = Me));
      else Me = $[161];
      let be;
      if ($[162] !== uo || $[163] !== Me)
        ((be = e(FreezeWhenOffscreen, { children: e(jt.Provider, { value: uo, children: Me }) })),
          ($[162] = uo),
          ($[163] = Me),
          ($[164] = be));
      else be = $[164];
      return be;
    }
    case "work_segment": {
      let se;
      if ($[165] !== message || $[166] !== shouldAnimate)
        ((se = e(WorkSegmentMessageView, { message: message, shouldAnimate: shouldAnimate })),
          ($[165] = message),
          ($[166] = shouldAnimate),
          ($[167] = se));
      else se = $[167];
      return se;
    }
    case "speaker_label": {
      let se;
      if ($[168] !== containerWidth || $[169] !== message.speaker)
        ((se =
          workSegmentModule === null
            ? null
            : e(Box, {
                marginTop: 1,
                width: containerWidth ?? "100%",
                backgroundColor: message.speaker.kind === "you" ? "userMessageBackground" : void 0,
                children: e(workSegmentModule.SpeakerLabel, { speaker: message.speaker }),
              })),
          ($[168] = containerWidth),
          ($[169] = message.speaker),
          ($[170] = se));
      else se = $[170];
      return se;
    }
    case "recap_fold": {
      let se;
      if ($[171] !== addMargin || $[172] !== message)
        ((se =
          workSegmentModule === null
            ? null
            : e(workSegmentModule.RecapFoldMessage, { message: message, addMargin: addMargin })),
          ($[171] = addMargin),
          ($[172] = message),
          ($[173] = se));
      else se = $[173];
      return se;
    }
  }
}
//@ chunk-ah34pb7m.js:234162-234400 layout
function WorkSegmentMessageView(m) {
  let $ = w(3),
    { message: message, shouldAnimate: shouldAnimate } = m,
    g = usePrefersReducedMotion(),
    f = useIsScreenReaderEnabled();
  if (workSegmentModule === null) {
    return null;
  }
  const h = g || f || !shouldAnimate;
  let T;
  if ($[0] !== message || $[1] !== h)
    ((T = e(workSegmentModule.WorkSegmentMessage, { message: message, reducedMotion: h })),
      ($[0] = message),
      ($[1] = h),
      ($[2] = T));
  else T = $[2];
  return T;
}
/**
 * 用户消息分派：按内容块类型（text/image/tool_result）选择 UserTextMessage、UserImageMessage、UserToolResultMessage；coordinator 模式特殊处理。
 */
//@ chunk-ah34pb7m.js:234400-236422 fingerprint = UserMessage (0.682)
function UserMessage(t0) {
  let $ = w(39),
    {
      message: message,
      addMargin: addMargin,
      tools: tools,
      progressMessagesForMessage: progressMessagesForMessage,
      param: param,
      style: style,
      verbose: verbose,
      imageIndex: imageIndex,
      isUserContinuation: isUserContinuation,
      isSplitUserContinuation: isSplitUserContinuation,
      followsSpeakerLabel: followsSpeakerLabel,
      followsInboundLabel: followsInboundLabel,
      hasMetadataHeader: hasMetadataHeader,
      lookups: lookups,
      isTranscriptMode: isTranscriptMode,
    } = t0,
    { columns: columns } = useTerminalSize();
  switch (param.type) {
    case "text": {
      if (isPeerOrObserver(message.origin)) {
        let V;
        if ($[0] !== message.origin) ((V = Qmr(message.origin)), ($[0] = message.origin), ($[1] = V));
        else V = $[1];
        const Y = followsSpeakerLabel || followsInboundLabel;
        let X;
        if (
          $[2] !== addMargin ||
          $[3] !== isTranscriptMode ||
          $[4] !== message.origin ||
          $[5] !== message.uuid ||
          $[6] !== param ||
          $[7] !== V ||
          $[8] !== Y ||
          $[9] !== verbose
        )
          ((X = e(AgentMessage, {
            addMargin: addMargin,
            param: param,
            fromName: V,
            verbose: verbose,
            isTranscriptMode: isTranscriptMode,
            messageId: message.uuid,
            origin: message.origin,
            followsSpeakerLabel: Y,
          })),
            ($[2] = addMargin),
            ($[3] = isTranscriptMode),
            ($[4] = message.origin),
            ($[5] = message.uuid),
            ($[6] = param),
            ($[7] = V),
            ($[8] = Y),
            ($[9] = verbose),
            ($[10] = X));
        else X = $[10];
        return X;
      }
      const V = followsInboundLabel && message.origin?.kind === "coordinator";
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
        $[22] !== V ||
        $[23] !== verbose
      )
        ((Y = e(UserTextMessage, {
          addMargin: addMargin,
          param: param,
          verbose: verbose,
          planContent: message.planContent,
          isTranscriptMode: isTranscriptMode,
          timestamp: message.timestamp,
          messageId: message.uuid,
          origin: message.origin,
          pluginPrompt: message.pluginPrompt,
          taskDelivery: message.taskDelivery,
          followsSpeakerLabel: followsSpeakerLabel,
          followsInboundLabel: followsInboundLabel,
          followsCoordinatorLabel: V,
        })),
          ($[11] = addMargin),
          ($[12] = followsInboundLabel),
          ($[13] = followsSpeakerLabel),
          ($[14] = isTranscriptMode),
          ($[15] = message.origin),
          ($[16] = message.planContent),
          ($[17] = message.pluginPrompt),
          ($[18] = message.taskDelivery),
          ($[19] = message.timestamp),
          ($[20] = message.uuid),
          ($[21] = param),
          ($[22] = V),
          ($[23] = verbose),
          ($[24] = Y));
      else Y = $[24];
      return Y;
    }
    case "image": {
      const V = addMargin && !isUserContinuation;
      const Y = hasMetadataHeader ? !isSplitUserContinuation : void 0;
      let X;
      if ($[25] !== imageIndex || $[26] !== V || $[27] !== Y)
        ((X = e(UserImageMessage, { imageId: imageIndex, addMargin: V, startsUserTurn: Y })),
          ($[25] = imageIndex),
          ($[26] = V),
          ($[27] = Y),
          ($[28] = X));
      else X = $[28];
      return X;
    }
    case "tool_result": {
      const t1 = columns - 5;
      let Y;
      if (
        $[29] !== isTranscriptMode ||
        $[30] !== lookups ||
        $[31] !== message ||
        $[32] !== param ||
        $[33] !== progressMessagesForMessage ||
        $[34] !== style ||
        $[35] !== t1 ||
        $[36] !== tools ||
        $[37] !== verbose
      )
        ((Y = e(ToolResultRow, {
          param: param,
          message: message,
          lookups: lookups,
          progressMessagesForMessage: progressMessagesForMessage,
          style: style,
          tools: tools,
          verbose: verbose,
          width: t1,
          isTranscriptMode: isTranscriptMode,
        })),
          ($[29] = isTranscriptMode),
          ($[30] = lookups),
          ($[31] = message),
          ($[32] = param),
          ($[33] = progressMessagesForMessage),
          ($[34] = style),
          ($[35] = t1),
          ($[36] = tools),
          ($[37] = verbose),
          ($[38] = Y));
      else Y = $[38];
      return Y;
    }
    default: {
      return;
    }
  }
}
//@ chunk-ah34pb7m.js:236422-236489 layout
var TOOL_SEARCH_BLOCK_TYPES = new Set(["tool_search_tool_regex", "tool_search_tool_bm25"]);
//@ chunk-ah34pb7m.js:236489-236559 layout
function allowlistedBlockName(m) {
  return "name" in m && u9n(m.name) ? m.name : "non-allowlisted";
}
//@ chunk-ah34pb7m.js:236559-236679 layout
function allowlistedBlockType(m) {
  let d = "type" in m ? m.type : void 0;
  if (typeof d !== "string") return "non-allowlisted (non-string)";
  return NEi(d);
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
function logUnrenderableBlockOnce(m, d, c) {
  if (!claimOnceStore.of(m).claim(`unrenderable_block:${unrenderableBlockKey(d)}`)) return;
  logError(c);
}
/**
 * 助手内容块分派：text→AssistantTextMessage，tool_use→AssistantToolUseMessage，thinking/redacted_thinking→思考组件，server_tool_use/advisor 等；无法渲染的块记一次错误日志。
 */
//@ chunk-ah34pb7m.js:237019-240675 fingerprint = AssistantMessageBlock (0.765)
function AssistantMessageBlock(t0) {
  let $ = w(65),
    {
      param: param,
      model: model,
      addMargin: addMargin,
      tools: tools,
      commands: commands,
      verbose: verbose,
      inProgressToolUseIDs: inProgressToolUseIDs,
      progressMessagesForMessage: progressMessagesForMessage,
      shouldAnimate: shouldAnimate,
      shouldShowDot: shouldShowDot,
      inProgressToolCallCount: inProgressToolCallCount,
      isTranscriptMode: isTranscriptMode,
      lookups: lookups,
      onOpenRateLimitOptions: onOpenRateLimitOptions,
      onRateLimitAutoQueueContinue: onRateLimitAutoQueueContinue,
      advisorModel: advisorModel,
      isApiError: isApiError,
      isSessionFailureNotice: isSessionFailureNotice,
      cloudMemoryToolUseIds: cloudMemoryToolUseIds,
      apiErrorKind: apiErrorKind,
      apiMessageId: apiMessageId,
      messageUuid: messageUuid,
      isFirstTextBlock: isFirstTextBlock,
    } = t0,
    ge = useHost(),
    pe;
  if ($[0] !== apiMessageId || $[1] !== param.type)
    ((pe = (te) =>
      param.type === "text" && apiMessageId !== void 0 ? te.displayedMessageContent[apiMessageId] : void 0),
      ($[0] = apiMessageId),
      ($[1] = param.type),
      ($[2] = pe));
  else pe = $[2];
  let de = rs(pe);
  if (K5(param)) {
    return null;
  }
  switch (param.type) {
    case "tool_use": {
      let ue;
      if ($[3] !== cloudMemoryToolUseIds || $[4] !== param.id)
        ((ue = cloudMemoryToolUseIds?.includes(param.id)),
          ($[3] = cloudMemoryToolUseIds),
          ($[4] = param.id),
          ($[5] = ue));
      else ue = $[5];
      const J = ue === !0;
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
        $[16] !== J ||
        $[17] !== tools ||
        $[18] !== verbose
      )
        ((se = e(ToolUseStatusDot, {
          param: param,
          addMargin: addMargin,
          tools: tools,
          commands: commands,
          verbose: verbose,
          inProgressToolUseIDs: inProgressToolUseIDs,
          progressMessagesForMessage: progressMessagesForMessage,
          shouldAnimate: shouldAnimate,
          shouldShowDot: shouldShowDot,
          inProgressToolCallCount: inProgressToolCallCount,
          lookups: lookups,
          isTranscriptMode: isTranscriptMode,
          isCloudMemoryCall: J,
        })),
          ($[6] = addMargin),
          ($[7] = commands),
          ($[8] = inProgressToolCallCount),
          ($[9] = inProgressToolUseIDs),
          ($[10] = isTranscriptMode),
          ($[11] = lookups),
          ($[12] = param),
          ($[13] = progressMessagesForMessage),
          ($[14] = shouldAnimate),
          ($[15] = shouldShowDot),
          ($[16] = J),
          ($[17] = tools),
          ($[18] = verbose),
          ($[19] = se));
      else se = $[19];
      return se;
    }
    case "text": {
      if (de !== void 0 && !verbose) {
        if (!isFirstTextBlock) {
          return null;
        }
        let ue;
        if ($[20] !== de) ((ue = { type: "text", text: de }), ($[20] = de), ($[21] = ue));
        else ue = $[21];
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
          $[30] !== ue ||
          $[31] !== verbose
        )
          ((J = e(AssistantTextBlock, {
            param: ue,
            addMargin: addMargin,
            shouldShowDot: shouldShowDot,
            verbose: verbose,
            messageId: messageUuid,
            isApiError: isApiError,
            isSessionFailureNotice: isSessionFailureNotice,
            apiErrorKind: apiErrorKind,
            onOpenRateLimitOptions: onOpenRateLimitOptions,
            onRateLimitAutoQueueContinue: onRateLimitAutoQueueContinue,
          })),
            ($[22] = addMargin),
            ($[23] = apiErrorKind),
            ($[24] = isApiError),
            ($[25] = isSessionFailureNotice),
            ($[26] = messageUuid),
            ($[27] = onOpenRateLimitOptions),
            ($[28] = onRateLimitAutoQueueContinue),
            ($[29] = shouldShowDot),
            ($[30] = ue),
            ($[31] = verbose),
            ($[32] = J));
        else J = $[32];
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
      )
        ((ue = e(AssistantTextBlock, {
          param: param,
          addMargin: addMargin,
          shouldShowDot: shouldShowDot,
          verbose: verbose,
          messageId: messageUuid,
          isApiError: isApiError,
          isSessionFailureNotice: isSessionFailureNotice,
          apiErrorKind: apiErrorKind,
          onOpenRateLimitOptions: onOpenRateLimitOptions,
          onRateLimitAutoQueueContinue: onRateLimitAutoQueueContinue,
        })),
          ($[33] = addMargin),
          ($[34] = apiErrorKind),
          ($[35] = isApiError),
          ($[36] = isSessionFailureNotice),
          ($[37] = messageUuid),
          ($[38] = onOpenRateLimitOptions),
          ($[39] = onRateLimitAutoQueueContinue),
          ($[40] = param),
          ($[41] = shouldShowDot),
          ($[42] = verbose),
          ($[43] = ue));
      else ue = $[43];
      return ue;
    }
    case "redacted_thinking": {
      if (!isTranscriptMode && !verbose) {
        return null;
      }
      let ue;
      if ($[44] !== addMargin)
        ((ue = e(AssistantRedactedThinkingMessage, { addMargin: addMargin })),
          ($[44] = addMargin),
          ($[45] = ue));
      else ue = $[45];
      return ue;
    }
    case "thinking": {
      if (ltt(param)) {
        let ue;
        if (
          $[46] !== addMargin ||
          $[47] !== messageUuid ||
          $[48] !== model ||
          $[49] !== param ||
          $[50] !== shouldShowDot
        )
          ((ue = e(AssistantThinkingBlock, {
            param: param,
            model: model,
            addMargin: addMargin,
            shouldShowDot: shouldShowDot,
            messageId: messageUuid,
          })),
            ($[46] = addMargin),
            ($[47] = messageUuid),
            ($[48] = model),
            ($[49] = param),
            ($[50] = shouldShowDot),
            ($[51] = ue));
        else ue = $[51];
        return ue;
      }
      if (!isTranscriptMode && !verbose) {
        return null;
      }
      let ue;
      if ($[52] !== addMargin || $[53] !== isTranscriptMode || $[54] !== param || $[55] !== verbose)
        ((ue = e(AssistantThinkingMessage, {
          addMargin: addMargin,
          param: param,
          isTranscriptMode: isTranscriptMode,
          verbose: verbose,
        })),
          ($[52] = addMargin),
          ($[53] = isTranscriptMode),
          ($[54] = param),
          ($[55] = verbose),
          ($[56] = ue));
      else ue = $[56];
      return ue;
    }
    case "server_tool_use":
    case "advisor_tool_result": {
      if (param.type !== "server_tool_use" || param.name === "advisor") {
        const ue = verbose || isTranscriptMode;
        let J;
        if (
          $[57] !== addMargin ||
          $[58] !== advisorModel ||
          $[59] !== lookups.erroredToolUseIDs ||
          $[60] !== lookups.resolvedToolUseIDs ||
          $[61] !== param ||
          $[62] !== shouldAnimate ||
          $[63] !== ue
        )
          ((J = e(AdvisorMessage, {
            block: param,
            addMargin: addMargin,
            resolvedToolUseIDs: lookups.resolvedToolUseIDs,
            erroredToolUseIDs: lookups.erroredToolUseIDs,
            shouldAnimate: shouldAnimate,
            verbose: ue,
            advisorModel: advisorModel,
          })),
            ($[57] = addMargin),
            ($[58] = advisorModel),
            ($[59] = lookups.erroredToolUseIDs),
            ($[60] = lookups.resolvedToolUseIDs),
            ($[61] = param),
            ($[62] = shouldAnimate),
            ($[63] = ue),
            ($[64] = J));
        else J = $[64];
        return J;
      }
      if (TOOL_SEARCH_BLOCK_TYPES.has(param.name)) {
        return null;
      }
      return (
        logUnrenderableBlockOnce(
          ge,
          param,
          Error(`Unable to render server tool block: ${param.type} (${allowlistedBlockName(param)})`),
        ),
        null
      );
    }
    case "tool_search_tool_result": {
      return null;
    }
    default: {
      return (
        logUnrenderableBlockOnce(
          ge,
          param,
          Error(`Unable to render message type: ${allowlistedBlockType(param)}`),
        ),
        null
      );
    }
  }
}
/**
 * Message 的 memo 比较：uuid、verbose、最新 bash 输出、transcript 模式、续行/说话人标签、进度消息等变化才重渲染。
 */
//@ chunk-ah34pb7m.js:240675-241692 fingerprint = areMessagePropsEqual (0.429)
function areMessagePropsEqual(prev, next) {
  if (prev.message.uuid !== next.message.uuid) return !1;
  if (!hasStringUuid(next.message) && prev.message !== next.message) return !1;
  if (prev.verbose !== next.verbose) return !1;
  let c = prev.latestBashOutputUUID === prev.message.uuid,
    g = next.latestBashOutputUUID === next.message.uuid;
  if (c !== g) return !1;
  if (prev.isTranscriptMode !== next.isTranscriptMode) return !1;
  if (
    prev.isUserContinuation !== next.isUserContinuation ||
    prev.isSplitUserContinuation !== next.isSplitUserContinuation ||
    prev.followsSpeakerLabel !== next.followsSpeakerLabel ||
    prev.followsInboundLabel !== next.followsInboundLabel ||
    prev.hasMetadataHeader !== next.hasMetadataHeader ||
    prev.shouldShowDot !== next.shouldShowDot
  )
    return !1;
  if (
    (prev.message.type === "work_segment" ||
      prev.message.type === "recap_fold" ||
      BWr(prev.message) ||
      BWr(next.message)) &&
    prev.message !== next.message
  )
    return !1;
  if (prev.containerWidth !== next.containerWidth) return !1;
  if (prev.isStatic && next.isStatic) {
    let f =
        prev.message.type === "system" && prev.message.subtype === "turn_duration"
          ? prev.message.briefHiddenCount
          : void 0,
      h =
        next.message.type === "system" && next.message.subtype === "turn_duration"
          ? next.message.briefHiddenCount
          : void 0;
    return f === h;
  }
  return !1;
}
/**
 * 取 MCP 工具的渲染覆盖：先查内置覆盖，再按 uiTableKey 或工具名查覆盖表。
 */
//@ chunk-ah34pb7m.js:265606-265706 placement
function mcpRenderOverrideFor(m, d) {
  let c = m.uiTableKey ?? m.name;
  return getBuiltinMcpRenderOverride(m, d) ?? (Object.hasOwn(zh, c) ? zh[c]?.[d] : void 0);
}
/**
 * 判断覆盖表中某工具是否定义了指定的渲染覆盖。
 */
//@ chunk-ah34pb7m.js:265706-265814 placement
function hasMcpRenderOverride(m, d) {
  let ownPropertyDescriptor = Object.getOwnPropertyDescriptor(zh, m);
  return ownPropertyDescriptor?.value !== void 0 && ownPropertyDescriptor.value[d] !== void 0;
}
/**
 * 清空某宿主的记忆文件缓存（loads/moves）。
 */
//@ chunk-e6aww6q8.js:1349439-1349495 fingerprint = Message (0.471)
function clearMemoryFilesCache(e) {
  NA(e).memo = { loads: new Map(), moves: new Map() };
}

export {
  mcpRenderOverrideFor,
  MessageImpl,
  areMessagePropsEqual,
  clearMemoryFilesCache,
  hasMcpRenderOverride,
};
