/**
 * utils/turnOrigin.ts
 *
 * 2.1.316 新增：回合尾部分析的实际逻辑；自压缩边界以来是否有人工回合等。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-exfmq47h.js (20)
 * attribution: placement 19, affinity 1
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { logEvent } from "../services/analytics/index.js";
import {
  isHumanQueuedCommand,
  isToolResultOrCompactSummary,
  isToolResultContinuation,
  isToolResultMessage,
} from "./messageProvenance.js";
import { replacedTurnStartSymbol } from "./messageKinds.js";
import { SYNTHETIC_MODEL } from "./messages.js";
import { NO_CONTENT_MESSAGE } from "../constants/messages.js";

//@ chunk-exfmq47h.js:613504-613544 placement
/**
 * 来源是否为人。
 */
function isHumanOrigin(origin) {
  return origin?.kind === "human";
}
//@ chunk-exfmq47h.js:613544-613627 placement
/**
 * 是否可视为用户自己输入的回合。
 */
function isOwnWordTurn(msg) {
  return msg.ownWord === true || (isHumanOrigin(msg.origin) && msg.verifiedSlackHumanTurn !== true);
}
//@ chunk-exfmq47h.js:613627-613917 placement
/**
 * 消息是否为人输入的回合。
 */
function isHumanTurn(msg) {
  try {
    if (msg.type === "user")
      return (
        isHumanOrigin(msg.origin) &&
        msg.toolUseResult === undefined &&
        msg.isCompactSummary !== true &&
        msg.verifiedSlackHumanTurn !== true
      );
    return (
      msg.type === "attachment" &&
      msg.attachment.type === "queued_command" &&
      isHumanOrigin(msg.attachment.origin) &&
      msg.attachment.verifiedSlackHumanTurn !== true
    );
  } catch {
    return false;
  }
}
//@ chunk-exfmq47h.js:613917-614050 placement
/**
 * 是否为非用户亲手输入（meta、交接、跳过附件等）。
 */
function isNonTypedInput(msg) {
  return (
    msg.isMeta === true ||
    msg.textNotTyped === true ||
    msg.handedOff === true ||
    msg.queueSkipAttachments === true ||
    msg.queueTranscriptOnly === true
  );
}
//@ chunk-exfmq47h.js:614050-614142 placement
/**
 * 当前回合是否严格由人发起。
 */
function isStrictHumanTurn(messages) {
  return (
    strictHumanDeciderTurn(messages) !== undefined ||
    analyzeTurnTail(messages).replacedTurnStart?.bySessionUsersOwnWords === true
  );
}
//@ chunk-exfmq47h.js:614142-614263 placement
/**
 * 若回合尾部的决定者是严格意义上的人工回合，返回该消息。
 */
function strictHumanDeciderTurn(msg) {
  let decider = analyzeTurnTail(msg).decider;
  if (decider == null || !decider.strictHuman) return;
  let deciderMessage = msg[decider.index];
  return deciderMessage !== undefined && isHumanTurn(deciderMessage) ? deciderMessage : undefined;
}
//@ chunk-exfmq47h.js:614263-614335 placement
/**
 * 起点是人或自动续接的回合。
 */
function isHumanDrivenOrigin(origin) {
  return origin?.kind === "human" || origin?.kind === "auto-continuation";
}
//@ chunk-exfmq47h.js:614335-614437 placement
/**
 * 当前回合是否由用户驱动。
 */
function isUserDrivenTurn(messages) {
  let { decider, replacedTurnStart } = analyzeTurnTail(messages);
  return decider === null ? replacedTurnStart?.byHuman === true : decider.userDriven;
}
//@ chunk-exfmq47h.js:614437-614764 placement
/**
 * 当前回合是否由本终端用户驱动。
 */
function isUserDrivenHere(messages) {
  let { decider, replacedTurnStart } = analyzeTurnTail(messages);
  if (decider === null) return replacedTurnStart?.byHumanHere === true;
  if (!decider.userDriven) return false;
  let deciderMessage = messages[decider.index];
  if (deciderMessage === undefined) return false;
  if (deciderMessage.type === "user") return deciderMessage.verifiedSlackHumanTurn !== true;
  return (
    deciderMessage.type === "attachment" &&
    deciderMessage.attachment.type === "queued_command" &&
    deciderMessage.attachment.verifiedSlackHumanTurn !== true
  );
}
//@ chunk-exfmq47h.js:614764-614826 placement
var LAST_TURN_TAIL = {
  decider: null,
  referentTail: undefined,
  scheduledTrigger: false,
};
//@ chunk-exfmq47h.js:614826-614908 placement
/**
 * 分析消息尾部决定回合发起者（失败时降级并上报）。
 */
function analyzeTurnTail(messages) {
  try {
    return analyzeTurnTailUnsafe(messages);
  } catch {
    logDegradedTurnTail();
    return {
      ...LAST_TURN_TAIL,
      scheduledTrigger: isScheduledTriggerTurn(messages),
    };
  }
}
//@ chunk-exfmq47h.js:614908-614976 placement
function logDegradedTurnTail() {
  try {
    logEvent("tengu_turn_tail_analysis_degraded", {});
  } catch {}
}
//@ chunk-exfmq47h.js:614976-615306 placement (2.1.88 match: buildTranscriptEntries, 0.902)
/**
 * 回合是否由定时触发。
 */
function isScheduledTriggerTurn(messages) {
  for (let j = messages.length - 1; j >= 0; j--)
    try {
      let message = messages[j];
      if (message == null) continue;
      if (message.type === "attachment" && message.attachment.type === "queued_command") {
        if (isScheduledTriggerOrigin(message.attachment.origin)) return true;
        if (isHumanQueuedCommand(message.attachment)) return false;
        continue;
      }
      if (message.type === "user") {
        if (isToolResultOrCompactSummary(message)) {
          if (isScheduledTriggerOrigin(message.origin)) return true;
          continue;
        }
        return isScheduledTriggerOrigin(message.origin);
      }
    } catch {
      continue;
    }
  return false;
}
//@ chunk-exfmq47h.js:615306-616491 placement
/**
 * 从后往前找最近一条“决定性”人类回合（user 消息或人类 queued_command），返回 {decider:{index,origin,text,userDriven,strictHuman,scheduledTrigger}, referentTail: 其前一条 assistant 文本, scheduledTrigger}。
 */
function analyzeTurnTailUnsafe(messages) {
  let decider = null;
  let deciderIndex = -1;
  let sawScheduledTrigger = false;
  let compactSummaryMessage;
  let fallbackTail = () => ({
    ...LAST_TURN_TAIL,
    scheduledTrigger: sawScheduledTrigger || isScheduledTriggerTurn(messages),
  });
  for (let j = messages.length - 1; j >= 0; j--) {
    let message = messages[j];
    if (message == null) return fallbackTail();
    try {
      if (message.type === "attachment" && message.attachment.type === "queued_command") {
        if (isScheduledTriggerOrigin(message.attachment.origin)) sawScheduledTrigger = true;
        if (isHumanQueuedCommand(message.attachment)) {
          let origin = message.attachment.origin;
          decider = {
            index: j,
            origin,
            text: nonEmptyPromptText(extractPromptText(message.attachment.prompt)),
            userDriven: true,
            strictHuman: isHumanOrigin(origin),
            scheduledTrigger: isScheduledTriggerOrigin(origin),
          };
          deciderIndex = j;
          break;
        }
        continue;
      }
      if (
        message.type !== "user" ||
        isToolResultOrCompactSummary(message) ||
        isToolResultContinuation(messages, j)
      ) {
        if (message.type === "user" && isScheduledTriggerOrigin(message.origin)) sawScheduledTrigger = true;
        if (message.type === "user" && message.isCompactSummary === true) compactSummaryMessage ??= message;
        continue;
      }
      let origin = message.origin;
      let isMetaHuman = message.isMeta === true && isHumanOrigin(origin);
      decider = {
        index: j,
        origin,
        text: nonEmptyPromptText(getUserMessageText(message)),
        userDriven: isMetaHuman || (message.isMeta !== true && isHumanDrivenOrigin(origin)),
        strictHuman: isMetaHuman || (message.isMeta !== true && isHumanOrigin(origin)),
        scheduledTrigger: isScheduledTriggerOrigin(origin),
      };
      deciderIndex = j;
      break;
    } catch {
      logDegradedTurnTail();
      return fallbackTail();
    }
  }
  if (decider === null) {
    let replacedStart = compactSummaryMessage?.[replacedTurnStartSymbol];
    return {
      ...LAST_TURN_TAIL,
      scheduledTrigger: sawScheduledTrigger,
      replacedTurnStart:
        replacedStart?.summaryUuid === compactSummaryMessage?.uuid ? replacedStart?.turnStart : undefined,
    };
  }
  let scheduledTrigger = sawScheduledTrigger || decider.scheduledTrigger;
  let referentText;
  try {
    for (let j = deciderIndex - 1; j >= 0; j--) {
      let message = messages[j];
      if (message == null) break;
      if (message.type !== "assistant") break;
      if (
        message.isApiErrorMessage === true ||
        message.isVirtual === true ||
        message.message?.model === SYNTHETIC_MODEL
      )
        continue;
      let assistantText = getAssistantText(message);
      if (assistantText !== null) {
        referentText = assistantText;
        break;
      }
    }
  } catch {
    logDegradedTurnTail();
    referentText = undefined;
  }
  return {
    decider,
    referentTail: referentText,
    scheduledTrigger,
  };
}
//@ chunk-exfmq47h.js:616491-617033 placement
/**
 * 自压缩边界以来是否有人工回合。
 */
function allUserTurnsSatisfy(messages, predicate) {
  try {
    for (let j = 0; j < messages.length; j++) {
      let row = messages[j];
      if (row == null) return false;
      if (row.type === "system") {
        if (row.subtype === "compact_boundary" || row.subtype === "microcompact_boundary") return false;
        continue;
      }
      if (row.type === "attachment") {
        if (
          row.attachment.type === "poll_events" ||
          row.attachment.type === "teammate_mailbox" ||
          (row.attachment.type === "queued_command" && !predicate(row.attachment.origin, row))
        )
          return false;
        continue;
      }
      if (row.type !== "user") continue;
      if (row.isCompactSummary === true || row.replacesSpan === true) return false;
      if (isToolResultMessage(row) || isToolResultContinuation(messages, j)) continue;
      if (!predicate(row.origin, row)) return false;
    }
    return true;
  } catch {
    return false;
  }
}
//@ chunk-exfmq47h.js:617033-617119 placement
function isScheduledTriggerOrigin(origin) {
  return origin?.kind === "task-notification" && origin.subkind === "scheduled-trigger";
}
//@ chunk-exfmq47h.js:617119-617174 placement
function nonEmptyPromptText(text) {
  let trimmed = text?.trim();
  return trimmed && trimmed !== NO_CONTENT_MESSAGE ? text : null;
}
//@ chunk-exfmq47h.js:617174-617408 placement
function getAssistantText(message) {
  let content = message.message?.content;
  if (!Array.isArray(content)) return null;
  let textParts = [];
  for (let block of content)
    if (
      typeof block === "object" &&
      block !== null &&
      block.type === "text" &&
      typeof block.text === "string"
    )
      textParts.push(block.text);
  let joined = textParts.join(`
`);
  return joined.trim() !== "" ? joined : null;
}
//@ chunk-exfmq47h.js:617408-617663 placement
function getUserMessageText(message) {
  let content = message.message?.content;
  if (typeof content === "string") return content;
  if (!Array.isArray(content)) return null;
  let textParts = [];
  for (let block of content)
    if (
      typeof block === "object" &&
      block !== null &&
      block.type === "text" &&
      typeof block.text === "string"
    )
      textParts.push(block.text);
  return textParts.length > 0
    ? textParts.join(`
`)
    : null;
}
//@ chunk-exfmq47h.js:617663-617893 affinity
/**
 * 从 prompt（字符串或内容块数组）中取出文本，多块用换行连接，没有文本返回 null。
 */
function extractPromptText(prompt) {
  if (typeof prompt === "string") return prompt;
  if (!Array.isArray(prompt)) return null;
  let texts = [];
  for (let block of prompt)
    if (
      typeof block === "object" &&
      block !== null &&
      block.type === "text" &&
      typeof block.text === "string"
    )
      texts.push(block.text);
  return texts.length > 0
    ? texts.join(`
`)
    : null;
}
export {
  isHumanOrigin,
  analyzeTurnTail,
  isHumanTurn,
  isUserDrivenHere,
  isUserDrivenTurn,
  isScheduledTriggerOrigin,
  isOwnWordTurn,
  isHumanDrivenOrigin,
  allUserTurnsSatisfy,
  isStrictHumanTurn,
  isNonTypedInput,
  strictHumanDeciderTurn,
};
