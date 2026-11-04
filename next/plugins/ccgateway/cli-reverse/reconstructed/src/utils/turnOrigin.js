/**
 * utils/turnOrigin.ts
 *
 * 2.1.316 新增：回合尾部分析的实际逻辑；自压缩边界以来是否有人工回合等。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-aepeg2w5.js (19)
 * attribution: placement 19
 */
import { logEvent } from "../services/analytics/index.js";
import {
  isHumanQueuedCommand,
  isToolResultOrCompactSummary,
  isToolResultContinuation,
  isToolResultMessage,
} from "./messageProvenance.js";
import { extractPromptText } from "./permissions/yoloClassifier.js";
import { replacedTurnStartSymbol } from "./messageKinds.js";
import { SYNTHETIC_MODEL, NO_CONTENT_MESSAGE } from "../constants/messages.js";

//@ chunk-aepeg2w5.js:600991-601031 placement
/**
 * 来源是否为人。
 */
function isHumanOrigin(origin) {
  return origin?.kind === "human";
}
//@ chunk-aepeg2w5.js:601031-601114 placement
/**
 * 是否可视为用户自己输入的回合。
 */
function isOwnWordTurn(msg) {
  return msg.ownWord === true || (isHumanOrigin(msg.origin) && msg.verifiedSlackHumanTurn !== true);
}
//@ chunk-aepeg2w5.js:601114-601404 placement
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
//@ chunk-aepeg2w5.js:601404-601537 placement
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
//@ chunk-aepeg2w5.js:601537-601629 placement
/**
 * 当前回合是否严格由人发起。
 */
function isStrictHumanTurn(messages) {
  return (
    strictHumanDeciderTurn(messages) !== undefined ||
    analyzeTurnTail(messages).replacedTurnStart?.bySessionUsersOwnWords === true
  );
}
//@ chunk-aepeg2w5.js:601629-601750 placement
/**
 * 若回合尾部的决定者是严格意义上的人工回合，返回该消息。
 */
function strictHumanDeciderTurn(msg) {
  let decider = analyzeTurnTail(msg).decider;
  if (decider == null || !decider.strictHuman) return;
  let deciderMessage = msg[decider.index];
  return deciderMessage !== undefined && isHumanTurn(deciderMessage) ? deciderMessage : undefined;
}
//@ chunk-aepeg2w5.js:601750-601822 placement
/**
 * 起点是人或自动续接的回合。
 */
function isHumanDrivenOrigin(origin) {
  return origin?.kind === "human" || origin?.kind === "auto-continuation";
}
//@ chunk-aepeg2w5.js:601822-601924 placement
/**
 * 当前回合是否由用户驱动。
 */
function isUserDrivenTurn(messages) {
  let { decider, replacedTurnStart } = analyzeTurnTail(messages);
  return decider === null ? replacedTurnStart?.byHuman === true : decider.userDriven;
}
//@ chunk-aepeg2w5.js:601924-602251 placement
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
//@ chunk-aepeg2w5.js:602251-602313 placement
var LAST_TURN_TAIL = {
  decider: null,
  referentTail: undefined,
  scheduledTrigger: false,
};
//@ chunk-aepeg2w5.js:602313-602395 placement
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
//@ chunk-aepeg2w5.js:602395-602463 placement
function logDegradedTurnTail() {
  try {
    logEvent("tengu_turn_tail_analysis_degraded", {});
  } catch {}
}
//@ chunk-aepeg2w5.js:602463-602793 placement = buildTranscriptEntries (0.777)
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
//@ chunk-aepeg2w5.js:602793-603978 placement
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
//@ chunk-aepeg2w5.js:603978-604521 placement
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
//@ chunk-aepeg2w5.js:604521-604607 placement
function isScheduledTriggerOrigin(origin) {
  return origin?.kind === "task-notification" && origin.subkind === "scheduled-trigger";
}
//@ chunk-aepeg2w5.js:604607-604662 placement
function nonEmptyPromptText(text) {
  let trimmed = text?.trim();
  return trimmed && trimmed !== NO_CONTENT_MESSAGE ? text : null;
}
//@ chunk-aepeg2w5.js:604662-604896 placement
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
//@ chunk-aepeg2w5.js:604896-605151 placement
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
export {
  isHumanTurn,
  isHumanOrigin,
  isOwnWordTurn,
  allUserTurnsSatisfy,
  analyzeTurnTail,
  isHumanDrivenOrigin,
  isNonTypedInput,
  isUserDrivenHere,
  isStrictHumanTurn,
  isUserDrivenTurn,
  isScheduledTriggerOrigin,
  strictHumanDeciderTurn,
};
