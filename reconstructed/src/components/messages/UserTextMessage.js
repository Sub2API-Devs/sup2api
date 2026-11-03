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
import { w } from "../../../vendor/react/compiler-runtime.js";
import { shouldShowNotice } from "../SlashCommandLink.js";
import { Se, Kc } from "../../../vendor/react/cjs/react.production.js";
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
import { INBOUND_MESSAGES_MODULE_EXPORTS } from "../../bridge/inboundMessages.js";
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
  let V = w(140);
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
  let W = shouldShowNotice(verbose);
  let isBySendNow = Se(interruptedByUserSignal);
  let isExpanded = resolveTranscriptMode(verbose, isTranscriptMode);
  if (typeof param.text !== "string" || !param.text || param.text.trim() === NO_CONTENT_MESSAGE) {
    return null;
  }
  if (planContent) {
    let Y;
    if (V[0] !== addMargin || V[1] !== planContent) {
      Y = jsxProd_default(UserPlanMessage, {
        addMargin,
        planContent,
      });
      V[0] = addMargin;
      V[1] = planContent;
      V[2] = Y;
    } else Y = V[2];
    return Y;
  }
  if (followsCoordinatorLabel) {
    let Y;
    if (
      V[3] !== addMargin ||
      V[4] !== followsSpeakerLabel ||
      V[5] !== isExpanded ||
      V[6] !== isTranscriptMode ||
      V[7] !== messageId ||
      V[8] !== origin ||
      V[9] !== param ||
      V[10] !== timestamp
    ) {
      Y = jsxProd_default(UserPromptText, {
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
      V[3] = addMargin;
      V[4] = followsSpeakerLabel;
      V[5] = isExpanded;
      V[6] = isTranscriptMode;
      V[7] = messageId;
      V[8] = origin;
      V[9] = param;
      V[10] = timestamp;
      V[11] = Y;
    } else Y = V[11];
    return Y;
  }
  let followsSpeakerLabel_2 = followsSpeakerLabel || followsInboundLabel;
  let z = null;
  if (isAgentSwarmsEnabled() && isTeammateMessageText(param.text)) {
    let Y;
    if (
      V[12] !== addMargin ||
      V[13] !== isTranscriptMode ||
      V[14] !== messageId ||
      V[15] !== origin ||
      V[16] !== param ||
      V[17] !== followsSpeakerLabel_2 ||
      V[18] !== verbose
    ) {
      Y = jsxProd_default(UserTeammateMessage, {
        addMargin,
        param,
        verbose,
        isTranscriptMode,
        messageId,
        origin,
        followsSpeakerLabel: followsSpeakerLabel_2,
      });
      V[12] = addMargin;
      V[13] = isTranscriptMode;
      V[14] = messageId;
      V[15] = origin;
      V[16] = param;
      V[17] = followsSpeakerLabel_2;
      V[18] = verbose;
      V[19] = Y;
    } else Y = V[19];
    return Y;
  }
  if (isChannelSourcedMessage(param.text)) {
    let { UserChannelMessage } = require("./chunk-e67761vs.js");
    let Y;
    if (
      V[20] !== addMargin ||
      V[21] !== isExpanded ||
      V[22] !== messageId ||
      V[23] !== origin ||
      V[24] !== param ||
      V[25] !== followsSpeakerLabel_2
    ) {
      Y = jsxProd_default(UserChannelMessage, {
        addMargin,
        param,
        messageId,
        origin,
        isExpanded,
        followsSpeakerLabel: followsSpeakerLabel_2,
      });
      V[20] = addMargin;
      V[21] = isExpanded;
      V[22] = messageId;
      V[23] = origin;
      V[24] = param;
      V[25] = followsSpeakerLabel_2;
      V[26] = Y;
    } else Y = V[26];
    return Y;
  }
  if (param.text.startsWith('<wake reason="external-event"')) {
    let { parseExternalEventWake, isSessionInboxWake } = require("./chunk-7v894jnd.js");
    let Y;
    let ae;
    if (V[27] !== param.text) {
      ae = parseExternalEventWake(param.text);
      Y = ae !== null && isSessionInboxWake(ae);
      V[27] = param.text;
      V[28] = Y;
      V[29] = ae;
    } else {
      Y = V[28];
      ae = V[29];
    }
    if (Y) z = ae;
  }
  if (isTaggedPeerText(param.text)) {
    let { UserCrossSessionMessage } = require("./chunk-n8ka2zfw.js");
    const hostInjected = origin?.kind === "peer" && origin.hostInjected === true;
    let te;
    if (
      V[30] !== addMargin ||
      V[31] !== isTranscriptMode ||
      V[32] !== messageId ||
      V[33] !== origin ||
      V[34] !== param ||
      V[35] !== hostInjected ||
      V[36] !== followsSpeakerLabel_2 ||
      V[37] !== verbose
    ) {
      te = jsxProd_default(UserCrossSessionMessage, {
        addMargin,
        param,
        hostInjected,
        verbose,
        isTranscriptMode,
        messageId,
        origin,
        followsSpeakerLabel: followsSpeakerLabel_2,
      });
      V[30] = addMargin;
      V[31] = isTranscriptMode;
      V[32] = messageId;
      V[33] = origin;
      V[34] = param;
      V[35] = hostInjected;
      V[36] = followsSpeakerLabel_2;
      V[37] = verbose;
      V[38] = te;
    } else te = V[38];
    return te;
  }
  if (followsInboundLabel) {
    let Y;
    if (
      V[39] !== addMargin ||
      V[40] !== followsSpeakerLabel ||
      V[41] !== isExpanded ||
      V[42] !== isTranscriptMode ||
      V[43] !== messageId ||
      V[44] !== origin ||
      V[45] !== param ||
      V[46] !== pluginPrompt ||
      V[47] !== timestamp
    ) {
      Y = jsxProd_default(UserPromptText, {
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
      V[39] = addMargin;
      V[40] = followsSpeakerLabel;
      V[41] = isExpanded;
      V[42] = isTranscriptMode;
      V[43] = messageId;
      V[44] = origin;
      V[45] = param;
      V[46] = pluginPrompt;
      V[47] = timestamp;
      V[48] = Y;
    } else Y = V[48];
    return Y;
  }
  if (param.text.startsWith('<wake reason="external-event"')) {
    if (z !== null) {
      let { UserSessionInboxWakeMessage } = require("./chunk-nwq3j1yh.js");
      let Y;
      if (
        V[49] !== addMargin ||
        V[50] !== z ||
        V[51] !== isTranscriptMode ||
        V[52] !== origin ||
        V[53] !== param.text ||
        V[54] !== verbose
      ) {
        Y = jsxProd_default(UserSessionInboxWakeMessage, {
          addMargin,
          wake: z,
          origin,
          rawText: param.text,
          verbose,
          isTranscriptMode,
        });
        V[49] = addMargin;
        V[50] = z;
        V[51] = isTranscriptMode;
        V[52] = origin;
        V[53] = param.text;
        V[54] = verbose;
        V[55] = Y;
      } else Y = V[55];
      return Y;
    }
    let Y;
    if (
      V[56] !== addMargin ||
      V[57] !== followsSpeakerLabel ||
      V[58] !== isExpanded ||
      V[59] !== isTranscriptMode ||
      V[60] !== messageId ||
      V[61] !== origin ||
      V[62] !== param ||
      V[63] !== timestamp
    ) {
      Y = jsxProd_default(UserPromptText, {
        addMargin,
        param,
        isTranscriptMode,
        isExpanded,
        timestamp,
        messageId,
        origin,
        followsSpeakerLabel,
      });
      V[56] = addMargin;
      V[57] = followsSpeakerLabel;
      V[58] = isExpanded;
      V[59] = isTranscriptMode;
      V[60] = messageId;
      V[61] = origin;
      V[62] = param;
      V[63] = timestamp;
      V[64] = Y;
    } else Y = V[64];
    return Y;
  }
  if (startsWithCommandTag(param.text)) {
    let Y;
    if (
      V[65] !== addMargin ||
      V[66] !== followsSpeakerLabel ||
      V[67] !== isExpanded ||
      V[68] !== isTranscriptMode ||
      V[69] !== messageId ||
      V[70] !== origin ||
      V[71] !== param ||
      V[72] !== timestamp
    ) {
      let commandMessage = parseCommandMessage(param.text);
      Y =
        commandMessage && isUsableCommandMessage(commandMessage)
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
      V[65] = addMargin;
      V[66] = followsSpeakerLabel;
      V[67] = isExpanded;
      V[68] = isTranscriptMode;
      V[69] = messageId;
      V[70] = origin;
      V[71] = param;
      V[72] = timestamp;
      V[73] = Y;
    } else Y = V[73];
    return Y;
  }
  if (extractBashInput(param.text) !== null) {
    let Y;
    if (V[74] !== addMargin || V[75] !== param) {
      Y = jsxProd_default(UserBashInputMessage, {
        addMargin,
        param,
      });
      V[74] = addMargin;
      V[75] = param;
      V[76] = Y;
    } else Y = V[76];
    return Y;
  }
  if (extractTag(param.text, TICK)) {
    return null;
  }
  if (param.text.includes(`<${LOCAL_COMMAND_CAVEAT}>`)) {
    return null;
  }
  if (isBashOutputText(param.text)) {
    let Y;
    if (V[77] !== param.text || V[78] !== verbose) {
      Y = jsxProd_default(BashOutputBlock, {
        content: param.text,
        verbose,
      });
      V[77] = param.text;
      V[78] = verbose;
      V[79] = Y;
    } else Y = V[79];
    return Y;
  }
  if (param.text.startsWith("<local-command-stdout") || param.text.startsWith("<local-command-stderr")) {
    let Y;
    if (V[80] !== commandRun || V[81] !== param.text) {
      Y = commandRun === undefined ? undefined : INBOUND_MESSAGES_MODULE_EXPORTS.printedTextOf(param.text);
      V[80] = commandRun;
      V[81] = param.text;
      V[82] = Y;
    } else Y = V[82];
    let J = Y;
    let capProseWidth = commandRun?.command === "recap";
    if (commandRun === undefined || J === undefined) {
      const command = commandRun?.command;
      let ye;
      if (
        V[83] !== addMargin ||
        V[84] !== capProseWidth ||
        V[85] !== param.text ||
        V[86] !== command ||
        V[87] !== W
      ) {
        ye = jsxProd_default(UserTextContent, {
          content: param.text,
          addMargin,
          systemLine: W,
          command,
          capProseWidth,
        });
        V[83] = addMargin;
        V[84] = capProseWidth;
        V[85] = param.text;
        V[86] = command;
        V[87] = W;
        V[88] = ye;
      } else ye = V[88];
      return ye;
    }
    let draw;
    if (
      V[89] !== addMargin ||
      V[90] !== capProseWidth ||
      V[91] !== commandRun ||
      V[92] !== param.text ||
      V[93] !== W
    ) {
      draw = (Te) =>
        jsxProd_default(UserTextContent, {
          content: Te,
          addMargin,
          systemLine: W,
          command: Te === param.text ? commandRun.command : undefined,
          capProseWidth,
        });
      V[89] = addMargin;
      V[90] = capProseWidth;
      V[91] = commandRun;
      V[92] = param.text;
      V[93] = W;
      V[94] = draw;
    } else draw = V[94];
    let ye;
    if (
      V[95] !== commandRun ||
      V[96] !== messageId ||
      V[97] !== param.text ||
      V[98] !== J ||
      V[99] !== draw
    ) {
      ye = jsxProd_default(INBOUND_MESSAGES_MODULE_EXPORTS.CommandOutputSite, {
        content: param.text,
        commandRun,
        printed: J,
        messageId,
        draw,
      });
      V[95] = commandRun;
      V[96] = messageId;
      V[97] = param.text;
      V[98] = J;
      V[99] = draw;
      V[100] = ye;
    } else ye = V[100];
    return ye;
  }
  if (param.text === INTERRUPT_MESSAGE || param.text === INTERRUPT_MESSAGE_FOR_TOOL_USE) {
    if (W) {
      let row;
      if (V[101] !== isBySendNow) {
        row = interruptedRow({
          isBySendNow,
        });
        V[101] = isBySendNow;
        V[102] = row;
      } else row = V[102];
      let te;
      if (V[103] !== addMargin || V[104] !== row) {
        te = jsxProd_default(NoticeRowMessage, {
          row,
          addMargin,
        });
        V[103] = addMargin;
        V[104] = row;
        V[105] = te;
      } else te = V[105];
      return te;
    }
    let Y;
    if (V[106] === MEMO_CACHE_SENTINEL) {
      Y = jsxProd_default(RejectedToolUseMessage, {});
      V[106] = Y;
    } else Y = V[106];
    return Y;
  }
  if (param.text.includes("<user-memory-input>")) {
    let Y;
    if (V[107] !== addMargin || V[108] !== param.text) {
      Y = jsxProd_default(UserMemoryInputMessage, {
        addMargin,
        text: param.text,
      });
      V[107] = addMargin;
      V[108] = param.text;
      V[109] = Y;
    } else Y = V[109];
    return Y;
  }
  if (param.text.includes(`<${TASK_NOTIFICATION}`)) {
    if (isArtifactRoomViewNotification(param.text)) {
      return null;
    }
    if (hasTaskNotificationToolUseId(param.text)) {
      let Y;
      if (V[110] !== addMargin || V[111] !== param.text || V[112] !== verbose) {
        Y = jsxProd_default(TeammateDmMessage, {
          addMargin,
          text: param.text,
          verbose,
        });
        V[110] = addMargin;
        V[111] = param.text;
        V[112] = verbose;
        V[113] = Y;
      } else Y = V[113];
      return Y;
    }
    const verbose_2 = verbose || isTranscriptMode;
    let te;
    if (
      V[114] !== addMargin ||
      V[115] !== isExpanded ||
      V[116] !== messageId ||
      V[117] !== origin ||
      V[118] !== param ||
      V[119] !== verbose_2 ||
      V[120] !== taskDelivery
    ) {
      te = jsxProd_default(renderToolUseErrorMessage_5, {
        addMargin,
        param,
        taskDelivery,
        messageId,
        origin,
        verbose: verbose_2,
        isExpanded,
      });
      V[114] = addMargin;
      V[115] = isExpanded;
      V[116] = messageId;
      V[117] = origin;
      V[118] = param;
      V[119] = verbose_2;
      V[120] = taskDelivery;
      V[121] = te;
    } else te = V[121];
    return te;
  }
  if (param.text.includes("<mcp-resource-update") || param.text.includes("<mcp-polling-update")) {
    let Y;
    if (V[122] !== addMargin || V[123] !== param) {
      Y = jsxProd_default(UserAgentNotificationMessage, {
        addMargin,
        param,
      });
      V[122] = addMargin;
      V[123] = param;
      V[124] = Y;
    } else Y = V[124];
    return Y;
  }
  let Y;
  if (V[125] !== param.text) {
    Y = param.text.includes("<fork-boilerplate>") ? parseForkDirective(param.text) : undefined;
    V[125] = param.text;
    V[126] = Y;
  } else Y = V[126];
  let Me = Y;
  if (Me !== undefined) {
    let te;
    if (V[127] !== addMargin || V[128] !== Me) {
      te = jsxProd_default(ForkDirectiveLine, {
        addMargin,
        directive: Me,
      });
      V[127] = addMargin;
      V[128] = Me;
      V[129] = te;
    } else te = V[129];
    return te;
  }
  let te;
  if (
    V[130] !== addMargin ||
    V[131] !== followsSpeakerLabel ||
    V[132] !== isExpanded ||
    V[133] !== isTranscriptMode ||
    V[134] !== messageId ||
    V[135] !== origin ||
    V[136] !== param ||
    V[137] !== pluginPrompt ||
    V[138] !== timestamp
  ) {
    te = jsxProd_default(UserPromptText, {
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
    V[130] = addMargin;
    V[131] = followsSpeakerLabel;
    V[132] = isExpanded;
    V[133] = isTranscriptMode;
    V[134] = messageId;
    V[135] = origin;
    V[136] = param;
    V[137] = pluginPrompt;
    V[138] = timestamp;
    V[139] = te;
  } else te = V[139];
  return te;
}
//@ chunk-ah34pb7m.js:126618-127031 placement
/**
 * 用户文本内容或系统行显示。
 */
function UserTextContent(props) {
  let M = w(9);
  let { content, addMargin, systemLine, command, capProseWidth } = props;
  if (systemLine) {
    let T;
    if (M[0] !== command || M[1] !== content) {
      T = parseLocalCommandOutput(content, command);
      M[0] = command;
      M[1] = content;
      M[2] = T;
    } else T = M[2];
    let x = T;
    if (x.kind === "line") {
      let k;
      if (M[3] !== addMargin || M[4] !== x.row) {
        k = jsxProd_default(NoticeRowMessage, {
          row: x.row,
          addMargin,
        });
        M[3] = addMargin;
        M[4] = x.row;
        M[5] = k;
      } else k = M[5];
      return k;
    }
  }
  let T;
  if (M[6] !== capProseWidth || M[7] !== content) {
    T = jsxProd_default(UserLocalCommandOutputMessage, {
      content,
      capProseWidth,
    });
    M[6] = capProseWidth;
    M[7] = content;
    M[8] = T;
  } else T = M[8];
  return T;
}
//@ chunk-ah34pb7m.js:127031-127180 placement
/**
 * 渲染队友消息项：panel 直接返回节点，否则渲染 TeammateMessageContent。
 */
function renderTeammateContentItem(Ms, Xm) {
  return Ms.kind === "panel"
    ? Ms.node
    : jsxProd_default(
        TeammateMessageContent,
        {
          displayName: Ms.displayName,
          inkColor: Ms.inkColor,
          content: Ms.content,
          summary: Ms.summary,
        },
        Xm,
      );
}
//@ chunk-ah34pb7m.js:127180-127346 placement
/**
 * 渲染合并后的队友消息项：panel 直接返回，否则显示 ctrl+o 展开提示（含未验证标记与计数）。
 */
function renderCoalescedTeammateItem(as, Qh) {
  return as.kind === "panel"
    ? as.node
    : jsxProd_default(
        CtrlOToExpandHint,
        {
          displayName: as.senderName,
          qualifier: as.isUnverified ? UNVERIFIED : undefined,
          count: as.count,
          fallbackLabel: "teammate",
        },
        Qh,
      );
}
//@ chunk-ah34pb7m.js:127346-127377 placement
function hookDisplayName(ni) {
  return ni.name;
}
//@ chunk-ah34pb7m.js:127377-127634 placement
/**
 * "Async hook X completed" / "N async X hooks completed" 片段（多个时以逗号连接）。
 */
function renderAsyncHookCompletedItem(qs, Xh) {
  return jsxProd_default_2(
    Kc,
    {
      children: [
        Xh > 0 && ", ",
        qs.count === 1
          ? jsxProd_default_2(Fragment, {
              children: [
                "Async hook ",
                jsxProd_default(Text, {
                  bold: true,
                  children: qs.hookEvent,
                }),
                " completed",
              ],
            })
          : jsxProd_default_2(Fragment, {
              children: [
                qs.count,
                " async ",
                jsxProd_default(Text, {
                  bold: true,
                  children: qs.hookEvent,
                }),
                " hooks completed",
              ],
            }),
      ],
    },
    qs.hookEvent,
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
