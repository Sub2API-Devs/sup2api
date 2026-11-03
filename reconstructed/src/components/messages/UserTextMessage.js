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
import { aR, UserTeammateMessage, TeammateMessageContent, UNVERIFIED } from "./UserTeammateMessage.js";
import { XUr } from "../../utils/contextAttachments/externalMessages.js";
import { isTaggedPeerText } from "../../utils/crossSessionMessages.js";
import { Ezr, extractBashInput, parseCommandMessage, Xwt } from "../../utils/messages/apiNormalization.js";
import {
  TICK,
  LOCAL_COMMAND_CAVEAT,
  LOCAL_COMMAND_STDOUT,
  LOCAL_COMMAND_STDERR,
  BASH_STDOUT,
  BASH_STDERR,
  TASK_NOTIFICATION,
  fmt,
} from "../../constants/xml.js";
import { Dl, TeammateDmMessage } from "./TeammateResultMessage.js";
import { _Wr } from "../../services/tools/detachedToolCalls.js";
import { parseUpdates } from "./UserResourceUpdateMessage.js";
import { w } from "../../../vendor/react/compiler-runtime.js";
import { shouldShowNotice } from "../SlashCommandLink.js";
import { Se, Kc } from "../../../vendor/react/cjs/react.production.js";
import { jt, RejectedToolUseMessage } from "./UserToolResultMessage/RejectedToolUseMessage.js";
import { Wj } from "./transcriptModeContext.js";
import { e, r, Fragment } from "../../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { UserPlanMessage } from "./UserPlanMessage.js";
import { UserPromptText } from "./UserPromptMessage.js";
import { UserCommandMessage, BashOutputBlock } from "./UserCommandMessage.js";
import { UserBashInputMessage } from "./UserBashInputMessage.js";
import { rn } from "../../bridge/inboundMessages.js";
import { Lr, parseLocalCommandOutput } from "./CompactBoundaryMessage.js";
import { NoticeRowMessage } from "./teamMemSaved.js";
import { MEMO_CACHE_SENTINEL } from "../../../runtime/bun-runtime.js";
import { UserMemoryInputMessage } from "./UserMemoryInputMessage.js";
import { renderToolUseErrorMessage_5 } from "./UserTaskNotificationMessage.js";
import { UserAgentNotificationMessage } from "./UserAgentNotificationMessage.js";
import { Rc, ForkDirectiveLine, UserLocalCommandOutputMessage } from "./UserLocalCommandOutputMessage.js";
import { CtrlOToExpandHint } from "../CtrlOToExpand.js";
import { Text } from "../../ink/components/Text.js";

/**
 * 判断用户消息是否属于系统产生（无内容、非计划、非对等/观察者且为带标签的系统文本）。
 */
//@ chunk-ah34pb7m.js:119088-119201 placement
function isSystemishUserText(m, d) {
  if (!d || d.trim() === NO_CONTENT_MESSAGE) return !0;
  if (m.planContent) return !1;
  if (isPeerOrObserver(m.origin)) return !1;
  return isTaggedSystemUserText(d);
}
/**
 * 判断用户文本是否是系统产生的带标签文本（唤醒、命令输出、通知等）。
 */
//@ chunk-ah34pb7m.js:119201-119899 placement
function isTaggedSystemUserText(m) {
  if (!m || m.trim() === NO_CONTENT_MESSAGE) return !0;
  if (isAgentSwarmsEnabled() && isTeammateMessageText(m)) return aR(m);
  if (XUr(m)) return !1;
  if (m.startsWith('<wake reason="external-event"')) return !1;
  if (isTaggedPeerText(m)) return !1;
  if (Ezr(m)) return !1;
  let d = extractBashInput(m);
  if (d !== null) return !d;
  if (extractTag(m, TICK) !== null) return !0;
  if (m.includes(`<${LOCAL_COMMAND_CAVEAT}>`)) return !0;
  if (m.startsWith(`<${LOCAL_COMMAND_STDOUT}`) || m.startsWith(`<${LOCAL_COMMAND_STDERR}`)) {
    let c = extractTag(m, LOCAL_COMMAND_STDOUT)?.trim(),
      g = extractTag(m, LOCAL_COMMAND_STDERR)?.trim();
    return !((c && c !== NO_CONTENT_MESSAGE) || g);
  }
  if (m.startsWith(`<${BASH_STDOUT}`) || m.startsWith(`<${BASH_STDERR}`)) return !1;
  if (m.includes("<user-memory-input>")) return !extractTag(m, "user-memory-input");
  if (m.includes(`<${TASK_NOTIFICATION}`)) return !extractTag(m, "summary") || Dl(m) || _Wr(m);
  if (m.includes("<mcp-resource-update") || m.includes("<mcp-polling-update"))
    return parseUpdates(m).length === 0;
  return !1;
}
/**
 * 用户文本消息总渲染（计划、命令、插件提示、任务投递、发言人标签等分支）。
 */
//@ chunk-ah34pb7m.js:119899-126618 placement
function UserTextMessage(m) {
  let V = w(140),
    {
      addMargin: addMargin,
      param: param,
      verbose: verbose,
      planContent: planContent,
      isTranscriptMode: isTranscriptMode,
      timestamp: timestamp,
      messageId: messageId,
      origin: origin,
      pluginPrompt: pluginPrompt,
      commandRun: commandRun,
      taskDelivery: taskDelivery,
      followsSpeakerLabel: followsSpeakerLabel,
      followsInboundLabel: followsInboundLabel,
      followsCoordinatorLabel: followsCoordinatorLabel,
    } = m,
    W = shouldShowNotice(verbose),
    U = Se(jt),
    K = Wj(verbose, isTranscriptMode);
  if (typeof param.text !== "string" || !param.text || param.text.trim() === NO_CONTENT_MESSAGE) {
    return null;
  }
  if (planContent) {
    let Y;
    if (V[0] !== addMargin || V[1] !== planContent)
      ((Y = e(UserPlanMessage, { addMargin: addMargin, planContent: planContent })),
        (V[0] = addMargin),
        (V[1] = planContent),
        (V[2] = Y));
    else Y = V[2];
    return Y;
  }
  if (followsCoordinatorLabel) {
    let Y;
    if (
      V[3] !== addMargin ||
      V[4] !== followsSpeakerLabel ||
      V[5] !== K ||
      V[6] !== isTranscriptMode ||
      V[7] !== messageId ||
      V[8] !== origin ||
      V[9] !== param ||
      V[10] !== timestamp
    )
      ((Y = e(UserPromptText, {
        addMargin: addMargin,
        param: param,
        isTranscriptMode: isTranscriptMode,
        isExpanded: K,
        timestamp: timestamp,
        messageId: messageId,
        origin: origin,
        followsSpeakerLabel: followsSpeakerLabel,
        followsInboundLabel: !0,
      })),
        (V[3] = addMargin),
        (V[4] = followsSpeakerLabel),
        (V[5] = K),
        (V[6] = isTranscriptMode),
        (V[7] = messageId),
        (V[8] = origin),
        (V[9] = param),
        (V[10] = timestamp),
        (V[11] = Y));
    else Y = V[11];
    return Y;
  }
  let X = followsSpeakerLabel || followsInboundLabel,
    z = null;
  if (isAgentSwarmsEnabled() && isTeammateMessageText(param.text)) {
    let Y;
    if (
      V[12] !== addMargin ||
      V[13] !== isTranscriptMode ||
      V[14] !== messageId ||
      V[15] !== origin ||
      V[16] !== param ||
      V[17] !== X ||
      V[18] !== verbose
    )
      ((Y = e(UserTeammateMessage, {
        addMargin: addMargin,
        param: param,
        verbose: verbose,
        isTranscriptMode: isTranscriptMode,
        messageId: messageId,
        origin: origin,
        followsSpeakerLabel: X,
      })),
        (V[12] = addMargin),
        (V[13] = isTranscriptMode),
        (V[14] = messageId),
        (V[15] = origin),
        (V[16] = param),
        (V[17] = X),
        (V[18] = verbose),
        (V[19] = Y));
    else Y = V[19];
    return Y;
  }
  if (XUr(param.text)) {
    let { UserChannelMessage: UserChannelMessage } = require("./chunk-e67761vs.js");
    let Y;
    if (
      V[20] !== addMargin ||
      V[21] !== K ||
      V[22] !== messageId ||
      V[23] !== origin ||
      V[24] !== param ||
      V[25] !== X
    )
      ((Y = e(UserChannelMessage, {
        addMargin: addMargin,
        param: param,
        messageId: messageId,
        origin: origin,
        isExpanded: K,
        followsSpeakerLabel: X,
      })),
        (V[20] = addMargin),
        (V[21] = K),
        (V[22] = messageId),
        (V[23] = origin),
        (V[24] = param),
        (V[25] = X),
        (V[26] = Y));
    else Y = V[26];
    return Y;
  }
  if (param.text.startsWith('<wake reason="external-event"')) {
    let {
      parseExternalEventWake: parseExternalEventWake,
      isSessionInboxWake: isSessionInboxWake,
    } = require("./chunk-7v894jnd.js");
    let Y, ae;
    if (V[27] !== param.text)
      ((ae = parseExternalEventWake(param.text)),
        (Y = ae !== null && isSessionInboxWake(ae)),
        (V[27] = param.text),
        (V[28] = Y),
        (V[29] = ae));
    else ((Y = V[28]), (ae = V[29]));
    if (Y) z = ae;
  }
  if (isTaggedPeerText(param.text)) {
    let { UserCrossSessionMessage: UserCrossSessionMessage } = require("./chunk-n8ka2zfw.js");
    const Y = origin?.kind === "peer" && origin.hostInjected === !0;
    let te;
    if (
      V[30] !== addMargin ||
      V[31] !== isTranscriptMode ||
      V[32] !== messageId ||
      V[33] !== origin ||
      V[34] !== param ||
      V[35] !== Y ||
      V[36] !== X ||
      V[37] !== verbose
    )
      ((te = e(UserCrossSessionMessage, {
        addMargin: addMargin,
        param: param,
        hostInjected: Y,
        verbose: verbose,
        isTranscriptMode: isTranscriptMode,
        messageId: messageId,
        origin: origin,
        followsSpeakerLabel: X,
      })),
        (V[30] = addMargin),
        (V[31] = isTranscriptMode),
        (V[32] = messageId),
        (V[33] = origin),
        (V[34] = param),
        (V[35] = Y),
        (V[36] = X),
        (V[37] = verbose),
        (V[38] = te));
    else te = V[38];
    return te;
  }
  if (followsInboundLabel) {
    let Y;
    if (
      V[39] !== addMargin ||
      V[40] !== followsSpeakerLabel ||
      V[41] !== K ||
      V[42] !== isTranscriptMode ||
      V[43] !== messageId ||
      V[44] !== origin ||
      V[45] !== param ||
      V[46] !== pluginPrompt ||
      V[47] !== timestamp
    )
      ((Y = e(UserPromptText, {
        addMargin: addMargin,
        param: param,
        isTranscriptMode: isTranscriptMode,
        isExpanded: K,
        timestamp: timestamp,
        messageId: messageId,
        origin: origin,
        pluginPrompt: pluginPrompt,
        followsSpeakerLabel: followsSpeakerLabel,
        followsInboundLabel: !0,
      })),
        (V[39] = addMargin),
        (V[40] = followsSpeakerLabel),
        (V[41] = K),
        (V[42] = isTranscriptMode),
        (V[43] = messageId),
        (V[44] = origin),
        (V[45] = param),
        (V[46] = pluginPrompt),
        (V[47] = timestamp),
        (V[48] = Y));
    else Y = V[48];
    return Y;
  }
  if (param.text.startsWith('<wake reason="external-event"')) {
    if (z !== null) {
      let { UserSessionInboxWakeMessage: UserSessionInboxWakeMessage } = require("./chunk-nwq3j1yh.js");
      let Y;
      if (
        V[49] !== addMargin ||
        V[50] !== z ||
        V[51] !== isTranscriptMode ||
        V[52] !== origin ||
        V[53] !== param.text ||
        V[54] !== verbose
      )
        ((Y = e(UserSessionInboxWakeMessage, {
          addMargin: addMargin,
          wake: z,
          origin: origin,
          rawText: param.text,
          verbose: verbose,
          isTranscriptMode: isTranscriptMode,
        })),
          (V[49] = addMargin),
          (V[50] = z),
          (V[51] = isTranscriptMode),
          (V[52] = origin),
          (V[53] = param.text),
          (V[54] = verbose),
          (V[55] = Y));
      else Y = V[55];
      return Y;
    }
    let Y;
    if (
      V[56] !== addMargin ||
      V[57] !== followsSpeakerLabel ||
      V[58] !== K ||
      V[59] !== isTranscriptMode ||
      V[60] !== messageId ||
      V[61] !== origin ||
      V[62] !== param ||
      V[63] !== timestamp
    )
      ((Y = e(UserPromptText, {
        addMargin: addMargin,
        param: param,
        isTranscriptMode: isTranscriptMode,
        isExpanded: K,
        timestamp: timestamp,
        messageId: messageId,
        origin: origin,
        followsSpeakerLabel: followsSpeakerLabel,
      })),
        (V[56] = addMargin),
        (V[57] = followsSpeakerLabel),
        (V[58] = K),
        (V[59] = isTranscriptMode),
        (V[60] = messageId),
        (V[61] = origin),
        (V[62] = param),
        (V[63] = timestamp),
        (V[64] = Y));
    else Y = V[64];
    return Y;
  }
  if (Ezr(param.text)) {
    let Y;
    if (
      V[65] !== addMargin ||
      V[66] !== followsSpeakerLabel ||
      V[67] !== K ||
      V[68] !== isTranscriptMode ||
      V[69] !== messageId ||
      V[70] !== origin ||
      V[71] !== param ||
      V[72] !== timestamp
    ) {
      let ue = parseCommandMessage(param.text);
      Y =
        ue && Xwt(ue)
          ? e(UserCommandMessage, {
              addMargin: addMargin,
              param: param,
              followsSpeakerLabel: followsSpeakerLabel,
            })
          : e(UserPromptText, {
              addMargin: addMargin,
              param: param,
              isTranscriptMode: isTranscriptMode,
              isExpanded: K,
              timestamp: timestamp,
              messageId: messageId,
              origin: origin,
              followsSpeakerLabel: followsSpeakerLabel,
            });
      ((V[65] = addMargin),
        (V[66] = followsSpeakerLabel),
        (V[67] = K),
        (V[68] = isTranscriptMode),
        (V[69] = messageId),
        (V[70] = origin),
        (V[71] = param),
        (V[72] = timestamp),
        (V[73] = Y));
    } else Y = V[73];
    return Y;
  }
  if (extractBashInput(param.text) !== null) {
    let Y;
    if (V[74] !== addMargin || V[75] !== param)
      ((Y = e(UserBashInputMessage, { addMargin: addMargin, param: param })),
        (V[74] = addMargin),
        (V[75] = param),
        (V[76] = Y));
    else Y = V[76];
    return Y;
  }
  if (extractTag(param.text, TICK)) {
    return null;
  }
  if (param.text.includes(`<${LOCAL_COMMAND_CAVEAT}>`)) {
    return null;
  }
  if (fmt(param.text)) {
    let Y;
    if (V[77] !== param.text || V[78] !== verbose)
      ((Y = e(BashOutputBlock, { content: param.text, verbose: verbose })),
        (V[77] = param.text),
        (V[78] = verbose),
        (V[79] = Y));
    else Y = V[79];
    return Y;
  }
  if (param.text.startsWith("<local-command-stdout") || param.text.startsWith("<local-command-stderr")) {
    let Y;
    if (V[80] !== commandRun || V[81] !== param.text)
      ((Y = commandRun === void 0 ? void 0 : rn.printedTextOf(param.text)),
        (V[80] = commandRun),
        (V[81] = param.text),
        (V[82] = Y));
    else Y = V[82];
    let J = Y;
    let se = commandRun?.command === "recap";
    if (commandRun === void 0 || J === void 0) {
      const te = commandRun?.command;
      let ye;
      if (V[83] !== addMargin || V[84] !== se || V[85] !== param.text || V[86] !== te || V[87] !== W)
        ((ye = e(UserTextContent, {
          content: param.text,
          addMargin: addMargin,
          systemLine: W,
          command: te,
          capProseWidth: se,
        })),
          (V[83] = addMargin),
          (V[84] = se),
          (V[85] = param.text),
          (V[86] = te),
          (V[87] = W),
          (V[88] = ye));
      else ye = V[88];
      return ye;
    }
    let te;
    if (V[89] !== addMargin || V[90] !== se || V[91] !== commandRun || V[92] !== param.text || V[93] !== W)
      ((te = (Te) =>
        e(UserTextContent, {
          content: Te,
          addMargin: addMargin,
          systemLine: W,
          command: Te === param.text ? commandRun.command : void 0,
          capProseWidth: se,
        })),
        (V[89] = addMargin),
        (V[90] = se),
        (V[91] = commandRun),
        (V[92] = param.text),
        (V[93] = W),
        (V[94] = te));
    else te = V[94];
    let ye;
    if (V[95] !== commandRun || V[96] !== messageId || V[97] !== param.text || V[98] !== J || V[99] !== te)
      ((ye = e(rn.CommandOutputSite, {
        content: param.text,
        commandRun: commandRun,
        printed: J,
        messageId: messageId,
        draw: te,
      })),
        (V[95] = commandRun),
        (V[96] = messageId),
        (V[97] = param.text),
        (V[98] = J),
        (V[99] = te),
        (V[100] = ye));
    else ye = V[100];
    return ye;
  }
  if (param.text === INTERRUPT_MESSAGE || param.text === INTERRUPT_MESSAGE_FOR_TOOL_USE) {
    if (W) {
      let Y;
      if (V[101] !== U) ((Y = Lr({ isBySendNow: U })), (V[101] = U), (V[102] = Y));
      else Y = V[102];
      let te;
      if (V[103] !== addMargin || V[104] !== Y)
        ((te = e(NoticeRowMessage, { row: Y, addMargin: addMargin })),
          (V[103] = addMargin),
          (V[104] = Y),
          (V[105] = te));
      else te = V[105];
      return te;
    }
    let Y;
    if (V[106] === MEMO_CACHE_SENTINEL) ((Y = e(RejectedToolUseMessage, {})), (V[106] = Y));
    else Y = V[106];
    return Y;
  }
  if (param.text.includes("<user-memory-input>")) {
    let Y;
    if (V[107] !== addMargin || V[108] !== param.text)
      ((Y = e(UserMemoryInputMessage, { addMargin: addMargin, text: param.text })),
        (V[107] = addMargin),
        (V[108] = param.text),
        (V[109] = Y));
    else Y = V[109];
    return Y;
  }
  if (param.text.includes(`<${TASK_NOTIFICATION}`)) {
    if (Dl(param.text)) {
      return null;
    }
    if (_Wr(param.text)) {
      let Y;
      if (V[110] !== addMargin || V[111] !== param.text || V[112] !== verbose)
        ((Y = e(TeammateDmMessage, { addMargin: addMargin, text: param.text, verbose: verbose })),
          (V[110] = addMargin),
          (V[111] = param.text),
          (V[112] = verbose),
          (V[113] = Y));
      else Y = V[113];
      return Y;
    }
    const Y = verbose || isTranscriptMode;
    let te;
    if (
      V[114] !== addMargin ||
      V[115] !== K ||
      V[116] !== messageId ||
      V[117] !== origin ||
      V[118] !== param ||
      V[119] !== Y ||
      V[120] !== taskDelivery
    )
      ((te = e(renderToolUseErrorMessage_5, {
        addMargin: addMargin,
        param: param,
        taskDelivery: taskDelivery,
        messageId: messageId,
        origin: origin,
        verbose: Y,
        isExpanded: K,
      })),
        (V[114] = addMargin),
        (V[115] = K),
        (V[116] = messageId),
        (V[117] = origin),
        (V[118] = param),
        (V[119] = Y),
        (V[120] = taskDelivery),
        (V[121] = te));
    else te = V[121];
    return te;
  }
  if (param.text.includes("<mcp-resource-update") || param.text.includes("<mcp-polling-update")) {
    let Y;
    if (V[122] !== addMargin || V[123] !== param)
      ((Y = e(UserAgentNotificationMessage, { addMargin: addMargin, param: param })),
        (V[122] = addMargin),
        (V[123] = param),
        (V[124] = Y));
    else Y = V[124];
    return Y;
  }
  let Y;
  if (V[125] !== param.text)
    ((Y = param.text.includes("<fork-boilerplate>") ? Rc(param.text) : void 0),
      (V[125] = param.text),
      (V[126] = Y));
  else Y = V[126];
  let Me = Y;
  if (Me !== void 0) {
    let te;
    if (V[127] !== addMargin || V[128] !== Me)
      ((te = e(ForkDirectiveLine, { addMargin: addMargin, directive: Me })),
        (V[127] = addMargin),
        (V[128] = Me),
        (V[129] = te));
    else te = V[129];
    return te;
  }
  let te;
  if (
    V[130] !== addMargin ||
    V[131] !== followsSpeakerLabel ||
    V[132] !== K ||
    V[133] !== isTranscriptMode ||
    V[134] !== messageId ||
    V[135] !== origin ||
    V[136] !== param ||
    V[137] !== pluginPrompt ||
    V[138] !== timestamp
  )
    ((te = e(UserPromptText, {
      addMargin: addMargin,
      param: param,
      isTranscriptMode: isTranscriptMode,
      isExpanded: K,
      timestamp: timestamp,
      messageId: messageId,
      origin: origin,
      pluginPrompt: pluginPrompt,
      followsSpeakerLabel: followsSpeakerLabel,
    })),
      (V[130] = addMargin),
      (V[131] = followsSpeakerLabel),
      (V[132] = K),
      (V[133] = isTranscriptMode),
      (V[134] = messageId),
      (V[135] = origin),
      (V[136] = param),
      (V[137] = pluginPrompt),
      (V[138] = timestamp),
      (V[139] = te));
  else te = V[139];
  return te;
}
/**
 * 用户文本内容或系统行显示。
 */
//@ chunk-ah34pb7m.js:126618-127031 placement
function UserTextContent(m) {
  let M = w(9),
    {
      content: content,
      addMargin: addMargin,
      systemLine: systemLine,
      command: command,
      capProseWidth: capProseWidth,
    } = m;
  if (systemLine) {
    let T;
    if (M[0] !== command || M[1] !== content)
      ((T = parseLocalCommandOutput(content, command)), (M[0] = command), (M[1] = content), (M[2] = T));
    else T = M[2];
    let x = T;
    if (x.kind === "line") {
      let k;
      if (M[3] !== addMargin || M[4] !== x.row)
        ((k = e(NoticeRowMessage, { row: x.row, addMargin: addMargin })),
          (M[3] = addMargin),
          (M[4] = x.row),
          (M[5] = k));
      else k = M[5];
      return k;
    }
  }
  let T;
  if (M[6] !== capProseWidth || M[7] !== content)
    ((T = e(UserLocalCommandOutputMessage, { content: content, capProseWidth: capProseWidth })),
      (M[6] = capProseWidth),
      (M[7] = content),
      (M[8] = T));
  else T = M[8];
  return T;
}
/**
 * 渲染队友消息项：panel 直接返回节点，否则渲染 TeammateMessageContent。
 */
//@ chunk-ah34pb7m.js:127031-127180 placement
function renderTeammateContentItem(Ms, Xm) {
  return Ms.kind === "panel"
    ? Ms.node
    : e(
        TeammateMessageContent,
        { displayName: Ms.displayName, inkColor: Ms.inkColor, content: Ms.content, summary: Ms.summary },
        Xm,
      );
}
/**
 * 渲染合并后的队友消息项：panel 直接返回，否则显示 ctrl+o 展开提示（含未验证标记与计数）。
 */
//@ chunk-ah34pb7m.js:127180-127346 placement
function renderCoalescedTeammateItem(as, Qh) {
  return as.kind === "panel"
    ? as.node
    : e(
        CtrlOToExpandHint,
        {
          displayName: as.senderName,
          qualifier: as.isUnverified ? UNVERIFIED : void 0,
          count: as.count,
          fallbackLabel: "teammate",
        },
        Qh,
      );
}
//@ chunk-ah34pb7m.js:127346-127377 placement
function iL(ni) {
  return ni.name;
}
/**
 * "Async hook X completed" / "N async X hooks completed" 片段（多个时以逗号连接）。
 */
//@ chunk-ah34pb7m.js:127377-127634 placement
function renderAsyncHookCompletedItem(qs, Xh) {
  return r(
    Kc,
    {
      children: [
        Xh > 0 && ", ",
        qs.count === 1
          ? r(Fragment, {
              children: ["Async hook ", e(Text, { bold: !0, children: qs.hookEvent }), " completed"],
            })
          : r(Fragment, {
              children: [
                qs.count,
                " async ",
                e(Text, { bold: !0, children: qs.hookEvent }),
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
  iL,
  renderAsyncHookCompletedItem,
};
