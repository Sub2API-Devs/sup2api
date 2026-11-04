/**
 * components/messages/UserTextMessage.tsx
 *
 * 本模块实际只剩"是否为带标签的系统性用户文本"判定函数；真正的 UserTextMessage 组件是未归属的 chunk-ah34pb7m.js#I7（见过程文档）。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/components/messages/UserTextMessage.tsx
 * pieces: chunk-ah34pb7m.js (8)
 * attribution: placement 8
 */
import { NO_CONTENT_MESSAGE } from "../../constants/messages.js";
import { isPeerOrObserver } from "../../utils/messageProvenance.js";
import { isAgentSwarmsEnabled } from "../../utils/agentSwarmsEnabled.js";
import {
  isTeammateMessageText,
  extractTag,
  INTERRUPT_MESSAGE,
  INTERRUPT_MESSAGE_FOR_TOOL_USE,
} from "../../utils/messages.js";
import {
  hasNoDisplayableTeammateMessage,
  UserTeammateMessage,
  TeammateMessageContent,
  UNVERIFIED,
} from "./UserTeammateMessage.js";
import { isChannelSourcedMessage } from "../../utils/contextAttachments/externalMessages.js";
import { isTaggedPeerText } from "../../utils/crossSessionMessages.js";
import {
  startsWithCommandTag,
  extractBashInput,
  parseCommandMessage,
  isUsableCommandMessage,
} from "../../utils/messages/apiNormalization.js";
import {
  TICK,
  LOCAL_COMMAND_CAVEAT,
  LOCAL_COMMAND_STDOUT,
  LOCAL_COMMAND_STDERR,
  BASH_STDOUT,
  BASH_STDERR,
  TASK_NOTIFICATION,
  isBashOutputText,
} from "../../constants/xml.js";
import { isArtifactRoomViewNotification, TeammateDmMessage } from "./TeammateResultMessage.js";
import { hasTaskNotificationToolUseId } from "../../services/tools/detachedToolCalls.js";
import { parseUpdates } from "./UserResourceUpdateMessage.js";
import { useMemoCache } from "../../../vendor/react/compiler-runtime.js";
import { shouldShowNotice } from "../SlashCommandLink.js";
import { useContext, fragmentTypeExport } from "../../../vendor/react/cjs/react.production.js";
import {
  interruptedByUserSignal,
  RejectedToolUseMessage,
} from "./UserToolResultMessage/RejectedToolUseMessage.js";
import { resolveTranscriptMode } from "./transcriptModeContext.js";
import {
  jsxProd_default,
  jsxProd_default_2,
  Fragment,
} from "../../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { UserPlanMessage } from "./UserPlanMessage.js";
import { UserPromptText } from "./UserPromptMessage.js";
import { UserCommandMessage, BashOutputBlock } from "./UserCommandMessage.js";
import { UserBashInputMessage } from "./UserBashInputMessage.js";
import { INBOUND_MESSAGES_MODULE_EXPORTS } from "../pluginUi/renderSiteExports.js";
import { interruptedRow, parseLocalCommandOutput } from "./CompactBoundaryMessage.js";
import { NoticeRowMessage } from "./teamMemSaved.js";
import { MEMO_CACHE_SENTINEL } from "../../../runtime/bun-runtime.js";
import { UserMemoryInputMessage } from "./UserMemoryInputMessage.js";
import { renderToolUseErrorMessage_5 } from "./UserTaskNotificationMessage.js";
import { UserAgentNotificationMessage } from "./UserAgentNotificationMessage.js";
import {
  parseForkDirective,
  ForkDirectiveLine,
  UserLocalCommandOutputMessage,
} from "./UserLocalCommandOutputMessage.js";
import { CtrlOToExpandHint } from "../CtrlOToExpand.js";
import { Text } from "../../ink/components/Text.js";

//@ chunk-ah34pb7m.js:119088-119201 placement
/**
 * 判断用户消息是否属于系统产生（无内容、非计划、非对等/观察者且为带标签的系统文本）。
 */
function isSystemishUserText(message, text) {
  if (!text || text.trim() === NO_CONTENT_MESSAGE) return true;
  if (message.planContent) return false;
  if (isPeerOrObserver(message.origin)) return false;
  return isTaggedSystemUserText(text);
}
//@ chunk-ah34pb7m.js:119201-119899 placement
/**
 * 判断用户文本是否是系统产生的带标签文本（唤醒、命令输出、通知等）。
 */
function isTaggedSystemUserText(text) {
  if (!text || text.trim() === NO_CONTENT_MESSAGE) return true;
  if (isAgentSwarmsEnabled() && isTeammateMessageText(text)) return hasNoDisplayableTeammateMessage(text);
  if (isChannelSourcedMessage(text)) return false;
  if (text.startsWith('<wake reason="external-event"')) return false;
  if (isTaggedPeerText(text)) return false;
  if (startsWithCommandTag(text)) return false;
  let bashInput = extractBashInput(text);
  if (bashInput !== null) return !bashInput;
  if (extractTag(text, TICK) !== null) return true;
  if (text.includes(`<${LOCAL_COMMAND_CAVEAT}>`)) return true;
  if (text.startsWith(`<${LOCAL_COMMAND_STDOUT}`) || text.startsWith(`<${LOCAL_COMMAND_STDERR}`)) {
    let trimmed = extractTag(text, LOCAL_COMMAND_STDOUT)?.trim();
    let trimmed_2 = extractTag(text, LOCAL_COMMAND_STDERR)?.trim();
    return !((trimmed && trimmed !== NO_CONTENT_MESSAGE) || trimmed_2);
  }
  if (text.startsWith(`<${BASH_STDOUT}`) || text.startsWith(`<${BASH_STDERR}`)) return false;
  if (text.includes("<user-memory-input>")) return !extractTag(text, "user-memory-input");
  if (text.includes(`<${TASK_NOTIFICATION}`))
    return (
      !extractTag(text, "summary") ||
      isArtifactRoomViewNotification(text) ||
      hasTaskNotificationToolUseId(text)
    );
  if (text.includes("<mcp-resource-update") || text.includes("<mcp-polling-update"))
    return parseUpdates(text).length === 0;
  return false;
}
//@ chunk-ah34pb7m.js:119899-126618 placement
/**
 * 用户文本消息总渲染（计划、命令、插件提示、任务投递、发言人标签等分支）。
 */
function UserTextMessage(props) {
  let $ = useMemoCache(140);
  let {
    addMargin,
    param,
    verbose,
    planContent,
    isTranscriptMode,
    timestamp,
    messageId,
    origin,
    pluginPrompt,
    commandRun,
    taskDelivery,
    followsSpeakerLabel,
    followsInboundLabel,
    followsCoordinatorLabel,
  } = props;
  let showNotice = shouldShowNotice(verbose);
  let isBySendNow = useContext(interruptedByUserSignal);
  let isExpanded = resolveTranscriptMode(verbose, isTranscriptMode);
  if (typeof param.text !== "string" || !param.text || param.text.trim() === NO_CONTENT_MESSAGE) {
    return null;
  }
  if (planContent) {
    let planMessage;
    if ($[0] !== addMargin || $[1] !== planContent) {
      planMessage = jsxProd_default(UserPlanMessage, {
        addMargin,
        planContent,
      });
      $[0] = addMargin;
      $[1] = planContent;
      $[2] = planMessage;
    } else planMessage = $[2];
    return planMessage;
  }
  if (followsCoordinatorLabel) {
    let promptText;
    if (
      $[3] !== addMargin ||
      $[4] !== followsSpeakerLabel ||
      $[5] !== isExpanded ||
      $[6] !== isTranscriptMode ||
      $[7] !== messageId ||
      $[8] !== origin ||
      $[9] !== param ||
      $[10] !== timestamp
    ) {
      promptText = jsxProd_default(UserPromptText, {
        addMargin,
        param,
        isTranscriptMode,
        isExpanded,
        timestamp,
        messageId,
        origin,
        followsSpeakerLabel,
        followsInboundLabel: true,
      });
      $[3] = addMargin;
      $[4] = followsSpeakerLabel;
      $[5] = isExpanded;
      $[6] = isTranscriptMode;
      $[7] = messageId;
      $[8] = origin;
      $[9] = param;
      $[10] = timestamp;
      $[11] = promptText;
    } else promptText = $[11];
    return promptText;
  }
  let followsSpeakerLabel_2 = followsSpeakerLabel || followsInboundLabel;
  let wake = null;
  if (isAgentSwarmsEnabled() && isTeammateMessageText(param.text)) {
    let teammateMessage;
    if (
      $[12] !== addMargin ||
      $[13] !== isTranscriptMode ||
      $[14] !== messageId ||
      $[15] !== origin ||
      $[16] !== param ||
      $[17] !== followsSpeakerLabel_2 ||
      $[18] !== verbose
    ) {
      teammateMessage = jsxProd_default(UserTeammateMessage, {
        addMargin,
        param,
        verbose,
        isTranscriptMode,
        messageId,
        origin,
        followsSpeakerLabel: followsSpeakerLabel_2,
      });
      $[12] = addMargin;
      $[13] = isTranscriptMode;
      $[14] = messageId;
      $[15] = origin;
      $[16] = param;
      $[17] = followsSpeakerLabel_2;
      $[18] = verbose;
      $[19] = teammateMessage;
    } else teammateMessage = $[19];
    return teammateMessage;
  }
  if (isChannelSourcedMessage(param.text)) {
    let { UserChannelMessage } = require("./UserChannelMessage.lazy.js");
    let channelMessage;
    if (
      $[20] !== addMargin ||
      $[21] !== isExpanded ||
      $[22] !== messageId ||
      $[23] !== origin ||
      $[24] !== param ||
      $[25] !== followsSpeakerLabel_2
    ) {
      channelMessage = jsxProd_default(UserChannelMessage, {
        addMargin,
        param,
        messageId,
        origin,
        isExpanded,
        followsSpeakerLabel: followsSpeakerLabel_2,
      });
      $[20] = addMargin;
      $[21] = isExpanded;
      $[22] = messageId;
      $[23] = origin;
      $[24] = param;
      $[25] = followsSpeakerLabel_2;
      $[26] = channelMessage;
    } else channelMessage = $[26];
    return channelMessage;
  }
  if (param.text.startsWith('<wake reason="external-event"')) {
    let { parseExternalEventWake, isSessionInboxWake } = require("../../utils/externalEventWake.js");
    let inboxWake;
    let wakePayload;
    if ($[27] !== param.text) {
      wakePayload = parseExternalEventWake(param.text);
      inboxWake = wakePayload !== null && isSessionInboxWake(wakePayload);
      $[27] = param.text;
      $[28] = inboxWake;
      $[29] = wakePayload;
    } else {
      inboxWake = $[28];
      wakePayload = $[29];
    }
    if (inboxWake) wake = wakePayload;
  }
  if (isTaggedPeerText(param.text)) {
    let { UserCrossSessionMessage } = require("./UserCrossSessionMessage.js");
    const hostInjected = origin?.kind === "peer" && origin.hostInjected === true;
    let crossSessionMessage;
    if (
      $[30] !== addMargin ||
      $[31] !== isTranscriptMode ||
      $[32] !== messageId ||
      $[33] !== origin ||
      $[34] !== param ||
      $[35] !== hostInjected ||
      $[36] !== followsSpeakerLabel_2 ||
      $[37] !== verbose
    ) {
      crossSessionMessage = jsxProd_default(UserCrossSessionMessage, {
        addMargin,
        param,
        hostInjected,
        verbose,
        isTranscriptMode,
        messageId,
        origin,
        followsSpeakerLabel: followsSpeakerLabel_2,
      });
      $[30] = addMargin;
      $[31] = isTranscriptMode;
      $[32] = messageId;
      $[33] = origin;
      $[34] = param;
      $[35] = hostInjected;
      $[36] = followsSpeakerLabel_2;
      $[37] = verbose;
      $[38] = crossSessionMessage;
    } else crossSessionMessage = $[38];
    return crossSessionMessage;
  }
  if (followsInboundLabel) {
    let promptText;
    if (
      $[39] !== addMargin ||
      $[40] !== followsSpeakerLabel ||
      $[41] !== isExpanded ||
      $[42] !== isTranscriptMode ||
      $[43] !== messageId ||
      $[44] !== origin ||
      $[45] !== param ||
      $[46] !== pluginPrompt ||
      $[47] !== timestamp
    ) {
      promptText = jsxProd_default(UserPromptText, {
        addMargin,
        param,
        isTranscriptMode,
        isExpanded,
        timestamp,
        messageId,
        origin,
        pluginPrompt,
        followsSpeakerLabel,
        followsInboundLabel: true,
      });
      $[39] = addMargin;
      $[40] = followsSpeakerLabel;
      $[41] = isExpanded;
      $[42] = isTranscriptMode;
      $[43] = messageId;
      $[44] = origin;
      $[45] = param;
      $[46] = pluginPrompt;
      $[47] = timestamp;
      $[48] = promptText;
    } else promptText = $[48];
    return promptText;
  }
  if (param.text.startsWith('<wake reason="external-event"')) {
    if (wake !== null) {
      let { UserSessionInboxWakeMessage } = require("./UserSessionInboxWakeMessage.lazy.js");
      let inboxWakeMessage;
      if (
        $[49] !== addMargin ||
        $[50] !== wake ||
        $[51] !== isTranscriptMode ||
        $[52] !== origin ||
        $[53] !== param.text ||
        $[54] !== verbose
      ) {
        inboxWakeMessage = jsxProd_default(UserSessionInboxWakeMessage, {
          addMargin,
          wake,
          origin,
          rawText: param.text,
          verbose,
          isTranscriptMode,
        });
        $[49] = addMargin;
        $[50] = wake;
        $[51] = isTranscriptMode;
        $[52] = origin;
        $[53] = param.text;
        $[54] = verbose;
        $[55] = inboxWakeMessage;
      } else inboxWakeMessage = $[55];
      return inboxWakeMessage;
    }
    let promptText;
    if (
      $[56] !== addMargin ||
      $[57] !== followsSpeakerLabel ||
      $[58] !== isExpanded ||
      $[59] !== isTranscriptMode ||
      $[60] !== messageId ||
      $[61] !== origin ||
      $[62] !== param ||
      $[63] !== timestamp
    ) {
      promptText = jsxProd_default(UserPromptText, {
        addMargin,
        param,
        isTranscriptMode,
        isExpanded,
        timestamp,
        messageId,
        origin,
        followsSpeakerLabel,
      });
      $[56] = addMargin;
      $[57] = followsSpeakerLabel;
      $[58] = isExpanded;
      $[59] = isTranscriptMode;
      $[60] = messageId;
      $[61] = origin;
      $[62] = param;
      $[63] = timestamp;
      $[64] = promptText;
    } else promptText = $[64];
    return promptText;
  }
  if (startsWithCommandTag(param.text)) {
    let commandMessage;
    if (
      $[65] !== addMargin ||
      $[66] !== followsSpeakerLabel ||
      $[67] !== isExpanded ||
      $[68] !== isTranscriptMode ||
      $[69] !== messageId ||
      $[70] !== origin ||
      $[71] !== param ||
      $[72] !== timestamp
    ) {
      let commandMessage_2 = parseCommandMessage(param.text);
      commandMessage =
        commandMessage_2 && isUsableCommandMessage(commandMessage_2)
          ? jsxProd_default(UserCommandMessage, {
              addMargin,
              param,
              followsSpeakerLabel,
            })
          : jsxProd_default(UserPromptText, {
              addMargin,
              param,
              isTranscriptMode,
              isExpanded,
              timestamp,
              messageId,
              origin,
              followsSpeakerLabel,
            });
      $[65] = addMargin;
      $[66] = followsSpeakerLabel;
      $[67] = isExpanded;
      $[68] = isTranscriptMode;
      $[69] = messageId;
      $[70] = origin;
      $[71] = param;
      $[72] = timestamp;
      $[73] = commandMessage;
    } else commandMessage = $[73];
    return commandMessage;
  }
  if (extractBashInput(param.text) !== null) {
    let bashInputMessage;
    if ($[74] !== addMargin || $[75] !== param) {
      bashInputMessage = jsxProd_default(UserBashInputMessage, {
        addMargin,
        param,
      });
      $[74] = addMargin;
      $[75] = param;
      $[76] = bashInputMessage;
    } else bashInputMessage = $[76];
    return bashInputMessage;
  }
  if (extractTag(param.text, TICK)) {
    return null;
  }
  if (param.text.includes(`<${LOCAL_COMMAND_CAVEAT}>`)) {
    return null;
  }
  if (isBashOutputText(param.text)) {
    let bashOutput;
    if ($[77] !== param.text || $[78] !== verbose) {
      bashOutput = jsxProd_default(BashOutputBlock, {
        content: param.text,
        verbose,
      });
      $[77] = param.text;
      $[78] = verbose;
      $[79] = bashOutput;
    } else bashOutput = $[79];
    return bashOutput;
  }
  if (param.text.startsWith("<local-command-stdout") || param.text.startsWith("<local-command-stderr")) {
    let printedText;
    if ($[80] !== commandRun || $[81] !== param.text) {
      printedText =
        commandRun === undefined ? undefined : INBOUND_MESSAGES_MODULE_EXPORTS.printedTextOf(param.text);
      $[80] = commandRun;
      $[81] = param.text;
      $[82] = printedText;
    } else printedText = $[82];
    let printedText_2 = printedText;
    let capProseWidth = commandRun?.command === "recap";
    if (commandRun === undefined || printedText_2 === undefined) {
      const command = commandRun?.command;
      let textContent;
      if (
        $[83] !== addMargin ||
        $[84] !== capProseWidth ||
        $[85] !== param.text ||
        $[86] !== command ||
        $[87] !== showNotice
      ) {
        textContent = jsxProd_default(UserTextContent, {
          content: param.text,
          addMargin,
          systemLine: showNotice,
          command,
          capProseWidth,
        });
        $[83] = addMargin;
        $[84] = capProseWidth;
        $[85] = param.text;
        $[86] = command;
        $[87] = showNotice;
        $[88] = textContent;
      } else textContent = $[88];
      return textContent;
    }
    let draw;
    if (
      $[89] !== addMargin ||
      $[90] !== capProseWidth ||
      $[91] !== commandRun ||
      $[92] !== param.text ||
      $[93] !== showNotice
    ) {
      draw = (content) =>
        jsxProd_default(UserTextContent, {
          content,
          addMargin,
          systemLine: showNotice,
          command: content === param.text ? commandRun.command : undefined,
          capProseWidth,
        });
      $[89] = addMargin;
      $[90] = capProseWidth;
      $[91] = commandRun;
      $[92] = param.text;
      $[93] = showNotice;
      $[94] = draw;
    } else draw = $[94];
    let commandOutput;
    if (
      $[95] !== commandRun ||
      $[96] !== messageId ||
      $[97] !== param.text ||
      $[98] !== printedText_2 ||
      $[99] !== draw
    ) {
      commandOutput = jsxProd_default(INBOUND_MESSAGES_MODULE_EXPORTS.CommandOutputSite, {
        content: param.text,
        commandRun,
        printed: printedText_2,
        messageId,
        draw,
      });
      $[95] = commandRun;
      $[96] = messageId;
      $[97] = param.text;
      $[98] = printedText_2;
      $[99] = draw;
      $[100] = commandOutput;
    } else commandOutput = $[100];
    return commandOutput;
  }
  if (param.text === INTERRUPT_MESSAGE || param.text === INTERRUPT_MESSAGE_FOR_TOOL_USE) {
    if (showNotice) {
      let row;
      if ($[101] !== isBySendNow) {
        row = interruptedRow({
          isBySendNow,
        });
        $[101] = isBySendNow;
        $[102] = row;
      } else row = $[102];
      let interruptNotice;
      if ($[103] !== addMargin || $[104] !== row) {
        interruptNotice = jsxProd_default(NoticeRowMessage, {
          row,
          addMargin,
        });
        $[103] = addMargin;
        $[104] = row;
        $[105] = interruptNotice;
      } else interruptNotice = $[105];
      return interruptNotice;
    }
    let rejectedToolUse;
    if ($[106] === MEMO_CACHE_SENTINEL) {
      rejectedToolUse = jsxProd_default(RejectedToolUseMessage, {});
      $[106] = rejectedToolUse;
    } else rejectedToolUse = $[106];
    return rejectedToolUse;
  }
  if (param.text.includes("<user-memory-input>")) {
    let memoryInputMessage;
    if ($[107] !== addMargin || $[108] !== param.text) {
      memoryInputMessage = jsxProd_default(UserMemoryInputMessage, {
        addMargin,
        text: param.text,
      });
      $[107] = addMargin;
      $[108] = param.text;
      $[109] = memoryInputMessage;
    } else memoryInputMessage = $[109];
    return memoryInputMessage;
  }
  if (param.text.includes(`<${TASK_NOTIFICATION}`)) {
    if (isArtifactRoomViewNotification(param.text)) {
      return null;
    }
    if (hasTaskNotificationToolUseId(param.text)) {
      let teammateDm;
      if ($[110] !== addMargin || $[111] !== param.text || $[112] !== verbose) {
        teammateDm = jsxProd_default(TeammateDmMessage, {
          addMargin,
          text: param.text,
          verbose,
        });
        $[110] = addMargin;
        $[111] = param.text;
        $[112] = verbose;
        $[113] = teammateDm;
      } else teammateDm = $[113];
      return teammateDm;
    }
    const verbose_2 = verbose || isTranscriptMode;
    let taskNotification;
    if (
      $[114] !== addMargin ||
      $[115] !== isExpanded ||
      $[116] !== messageId ||
      $[117] !== origin ||
      $[118] !== param ||
      $[119] !== verbose_2 ||
      $[120] !== taskDelivery
    ) {
      taskNotification = jsxProd_default(renderToolUseErrorMessage_5, {
        addMargin,
        param,
        taskDelivery,
        messageId,
        origin,
        verbose: verbose_2,
        isExpanded,
      });
      $[114] = addMargin;
      $[115] = isExpanded;
      $[116] = messageId;
      $[117] = origin;
      $[118] = param;
      $[119] = verbose_2;
      $[120] = taskDelivery;
      $[121] = taskNotification;
    } else taskNotification = $[121];
    return taskNotification;
  }
  if (param.text.includes("<mcp-resource-update") || param.text.includes("<mcp-polling-update")) {
    let agentNotification;
    if ($[122] !== addMargin || $[123] !== param) {
      agentNotification = jsxProd_default(UserAgentNotificationMessage, {
        addMargin,
        param,
      });
      $[122] = addMargin;
      $[123] = param;
      $[124] = agentNotification;
    } else agentNotification = $[124];
    return agentNotification;
  }
  let directive;
  if ($[125] !== param.text) {
    directive = param.text.includes("<fork-boilerplate>") ? parseForkDirective(param.text) : undefined;
    $[125] = param.text;
    $[126] = directive;
  } else directive = $[126];
  let directive_2 = directive;
  if (directive_2 !== undefined) {
    let forkDirectiveLine;
    if ($[127] !== addMargin || $[128] !== directive_2) {
      forkDirectiveLine = jsxProd_default(ForkDirectiveLine, {
        addMargin,
        directive: directive_2,
      });
      $[127] = addMargin;
      $[128] = directive_2;
      $[129] = forkDirectiveLine;
    } else forkDirectiveLine = $[129];
    return forkDirectiveLine;
  }
  let promptText;
  if (
    $[130] !== addMargin ||
    $[131] !== followsSpeakerLabel ||
    $[132] !== isExpanded ||
    $[133] !== isTranscriptMode ||
    $[134] !== messageId ||
    $[135] !== origin ||
    $[136] !== param ||
    $[137] !== pluginPrompt ||
    $[138] !== timestamp
  ) {
    promptText = jsxProd_default(UserPromptText, {
      addMargin,
      param,
      isTranscriptMode,
      isExpanded,
      timestamp,
      messageId,
      origin,
      pluginPrompt,
      followsSpeakerLabel,
    });
    $[130] = addMargin;
    $[131] = followsSpeakerLabel;
    $[132] = isExpanded;
    $[133] = isTranscriptMode;
    $[134] = messageId;
    $[135] = origin;
    $[136] = param;
    $[137] = pluginPrompt;
    $[138] = timestamp;
    $[139] = promptText;
  } else promptText = $[139];
  return promptText;
}
//@ chunk-ah34pb7m.js:126618-127031 placement
/**
 * 用户文本内容或系统行显示。
 */
function UserTextContent(props) {
  let $ = useMemoCache(9);
  let { content, addMargin, systemLine, command, capProseWidth } = props;
  if (systemLine) {
    let localOutput;
    if ($[0] !== command || $[1] !== content) {
      localOutput = parseLocalCommandOutput(content, command);
      $[0] = command;
      $[1] = content;
      $[2] = localOutput;
    } else localOutput = $[2];
    let output = localOutput;
    if (output.kind === "line") {
      let noticeRowMessageElement;
      if ($[3] !== addMargin || $[4] !== output.row) {
        noticeRowMessageElement = jsxProd_default(NoticeRowMessage, {
          row: output.row,
          addMargin,
        });
        $[3] = addMargin;
        $[4] = output.row;
        $[5] = noticeRowMessageElement;
      } else noticeRowMessageElement = $[5];
      return noticeRowMessageElement;
    }
  }
  let userLocalCommandOutputMessageElement;
  if ($[6] !== capProseWidth || $[7] !== content) {
    userLocalCommandOutputMessageElement = jsxProd_default(UserLocalCommandOutputMessage, {
      content,
      capProseWidth,
    });
    $[6] = capProseWidth;
    $[7] = content;
    $[8] = userLocalCommandOutputMessageElement;
  } else userLocalCommandOutputMessageElement = $[8];
  return userLocalCommandOutputMessageElement;
}
//@ chunk-ah34pb7m.js:127031-127180 placement
/**
 * 渲染队友消息项：panel 直接返回节点，否则渲染 TeammateMessageContent。
 */
function renderTeammateContentItem(item, key) {
  return item.kind === "panel"
    ? item.node
    : jsxProd_default(
        TeammateMessageContent,
        {
          displayName: item.displayName,
          inkColor: item.inkColor,
          content: item.content,
          summary: item.summary,
        },
        key,
      );
}
//@ chunk-ah34pb7m.js:127180-127346 placement
/**
 * 渲染合并后的队友消息项：panel 直接返回，否则显示 ctrl+o 展开提示（含未验证标记与计数）。
 */
function renderCoalescedTeammateItem(item, key) {
  return item.kind === "panel"
    ? item.node
    : jsxProd_default(
        CtrlOToExpandHint,
        {
          displayName: item.senderName,
          qualifier: item.isUnverified ? UNVERIFIED : undefined,
          count: item.count,
          fallbackLabel: "teammate",
        },
        key,
      );
}
//@ chunk-ah34pb7m.js:127346-127377 placement
function hookDisplayName(hook) {
  return hook.name;
}
//@ chunk-ah34pb7m.js:127377-127634 placement
/**
 * "Async hook X completed" / "N async X hooks completed" 片段（多个时以逗号连接）。
 */
function renderAsyncHookCompletedItem(group, index) {
  return jsxProd_default_2(
    fragmentTypeExport,
    {
      children: [
        index > 0 && ", ",
        group.count === 1
          ? jsxProd_default_2(Fragment, {
              children: [
                "Async hook ",
                jsxProd_default(Text, {
                  bold: true,
                  children: group.hookEvent,
                }),
                " completed",
              ],
            })
          : jsxProd_default_2(Fragment, {
              children: [
                group.count,
                " async ",
                jsxProd_default(Text, {
                  bold: true,
                  children: group.hookEvent,
                }),
                " hooks completed",
              ],
            }),
      ],
    },
    group.hookEvent,
  );
}
export {
  isTaggedSystemUserText,
  isSystemishUserText,
  UserTextMessage,
  renderTeammateContentItem,
  renderCoalescedTeammateItem,
  hookDisplayName,
  renderAsyncHookCompletedItem,
};
