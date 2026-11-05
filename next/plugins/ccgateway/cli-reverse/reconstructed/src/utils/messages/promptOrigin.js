/**
 * utils/messages/promptOrigin.ts
 *
 * 2.1.316 新增：提示来源标记
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-5xgkngpb.js (10)
 * attribution: placement 10
 */
import { lastUserPromptIndex, mergedTurnPosition, getPromptId, isUserPromptAt } from "../messages.js";
import { logError } from "../log.js";
import { getFeatureValue_CACHED_MAY_BE_STALE } from "../../services/analytics/growthbook.js";
import { isUserDrivenTurn, isUserDrivenHere, isStrictHumanTurn } from "../turnOrigin.js";
import { replacedTurnStartSymbol } from "../messageKinds.js";
import { summarizedPromptUuids, isMachineOriginPrompt } from "../transcript/deserialize.js";
import { hasPollEventsAttachmentSince } from "../pollEvents.js";
import { getMessageIdentityUuids } from "../../cli/queuedCommands.js";

//@ chunk-5xgkngpb.js:5030504-5030680 placement
var KNOWN_ORIGIN_KINDS = {
  "auto-continuation": true,
  channel: true,
  coordinator: true,
  human: true,
  observer: true,
  "observer-activity": true,
  peer: true,
  plugin: true,
  "slack-ping": true,
  "task-notification": true,
  unclassified: true,
};
//@ chunk-5xgkngpb.js:5030680-5030787 placement
/**
 * 返回消息来源类型的规范标签：没有来源为 unstamped，已知类型原样返回，其他为 unclassified。
 */
function getOriginKindLabel(origin) {
  let kind = origin?.kind;
  if (kind === undefined) return "unstamped";
  return Object.hasOwn(KNOWN_ORIGIN_KINDS, kind) ? kind : "unclassified";
}
//@ chunk-5xgkngpb.js:5030787-5030931 placement
/**
 * 取当前回合起点消息的来源类型（压缩摘要为 compacted）。
 */
function getTurnStartOriginKind(messages) {
  let index = lastUserPromptIndex(messages);
  if (index === -1) return;
  let message = messages[index];
  if (message.type !== "user") return;
  if (message.isCompactSummary) return "compacted";
  return getOriginKindLabel(message.origin);
}
//@ chunk-5xgkngpb.js:5030931-5031031 placement
/**
 * 取当前回合起点用户消息的 turnOrigin。
 */
function getTurnOrigin(messages) {
  let index = lastUserPromptIndex(messages);
  if (index === -1) return;
  let message = messages[index];
  return message.type === "user" ? message.turnOrigin : undefined;
}
//@ chunk-5xgkngpb.js:5031031-5031155 placement
/**
 * 取当前回合起点的回合位置信息（起点需有 promptId 或 turnOrigin）。
 */
function getTurnPosition(messages) {
  let index = lastUserPromptIndex(messages);
  if (index === -1) return;
  let message = messages[index];
  return message.type === "user" && (message.promptId || message.turnOrigin)
    ? mergedTurnPosition(messages, index)
    : undefined;
}
//@ chunk-5xgkngpb.js:5031155-5031407 placement
/**
 * 判断当前回合是否由会话任务的任务通知触发（压缩摘要时看 turnOrigin）；出错返回 false。
 */
function isSessionTaskTurn(messages) {
  try {
    let index = lastUserPromptIndex(messages);
    let message = index === -1 ? undefined : messages[index];
    if (message?.type !== "user") return false;
    if (message.isCompactSummary) return message.turnOrigin === "task_notification";
    return message.origin?.kind === "task-notification" && message.origin.producer === "session-task";
  } catch (error) {
    logError(error);
    return false;
  }
}
//@ chunk-5xgkngpb.js:5031407-5031800 placement
/**
 * 给消息列表中缺少的字段补上 promptId、turnOrigin、回合位置与被摘要的提示 uuid。
 */
function stampTurnFields(messages, promptId, turnOrigin, turnPosition, summarizedPromptUuids) {
  if (
    promptId === undefined &&
    turnOrigin === undefined &&
    turnPosition === undefined &&
    summarizedPromptUuids === undefined
  )
    return messages;
  return messages.map((message) => {
    let needsPromptId = message.promptId === undefined && promptId !== undefined;
    let needsTurnOrigin = message.turnOrigin === undefined && turnOrigin !== undefined;
    let needsTurnPosition = message.turnPosition === undefined && turnPosition !== undefined;
    let needsSummarizedUuids =
      message.summarizedTurnPromptUuids === undefined && summarizedPromptUuids !== undefined;
    return needsPromptId || needsTurnOrigin || needsTurnPosition || needsSummarizedUuids
      ? {
          ...message,
          ...(needsPromptId && {
            promptId,
          }),
          ...(needsTurnOrigin && {
            turnOrigin,
          }),
          ...(needsTurnPosition && {
            turnPosition,
          }),
          ...(needsSummarizedUuids && {
            summarizedTurnPromptUuids: summarizedPromptUuids,
          }),
        }
      : message;
  });
}
//@ chunk-5xgkngpb.js:5031800-5032178 placement
/**
 * 给压缩摘要等新消息补上当前回合的 promptId、turnOrigin、回合位置与被摘要的提示 uuid；开关开启时再附上回合起点的人类驱动信息；出错时只做最基本的处理。
 */
function stampSummaryTurnFields(messages, messages_2) {
  let promptId;
  let turnOrigin;
  let turnPosition;
  let hasPrompt = true;
  let turnStart;
  try {
    let promptIndex = lastUserPromptIndex(messages_2);
    hasPrompt = promptIndex !== -1;
    promptId = getPromptId(messages_2);
    turnOrigin = getTurnOrigin(messages_2);
    turnPosition = hasPrompt ? mergedTurnPosition(messages_2, promptIndex) : undefined;
    if (getFeatureValue_CACHED_MAY_BE_STALE("tengu_soft_spindle", true))
      turnStart = {
        byHuman: isUserDrivenTurn(messages_2),
        byHumanHere: isUserDrivenHere(messages_2),
        bySessionUsersOwnWords: isStrictHumanTurn(messages_2),
      };
  } catch (error) {
    logError(error);
    promptId = undefined;
    turnOrigin = undefined;
    turnPosition = undefined;
    hasPrompt = true;
    turnStart = undefined;
  }
  let stamped = stampTurnFields(
    hasPrompt && turnPosition === undefined ? stripTurnPosition(messages) : messages,
    promptId,
    turnOrigin,
    turnPosition,
    getSummarizedPromptUuids(messages_2),
  );
  return turnStart === undefined
    ? stamped
    : stamped.map((message) => ({
        ...message,
        [replacedTurnStartSymbol]: {
          summaryUuid: message.uuid,
          turnStart,
        },
      }));
}
//@ chunk-5xgkngpb.js:5032178-5032470 placement
function getSummarizedPromptUuids(messages) {
  try {
    let max = Math.max(
      lastUserPromptIndex(messages),
      messages.findLastIndex((message) => summarizedPromptUuids(message).length > 0),
    );
    let message = messages[max];
    if (
      message?.type !== "user" ||
      !(message.isCompactSummary || isUserPromptAt(messages, max, false)) ||
      hasPollEventsAttachmentSince(messages, max) ||
      messages.some(
        (message, index) =>
          index > max && (isUserPromptAt(messages, index, true) || isMachineOriginPrompt(message)),
      )
    )
      return;
    let uuids = message.isCompactSummary ? summarizedPromptUuids(message) : getMessageIdentityUuids(message);
    return uuids.length > 0 ? uuids : undefined;
  } catch (error) {
    logError(error);
    return;
  }
}
//@ chunk-5xgkngpb.js:5032470-5032601 placement
function stripTurnPosition(messages) {
  if (!messages.some((message) => message.turnPosition !== undefined)) return messages;
  return messages.map((message) => {
    let copy = {
      ...message,
    };
    delete copy.turnPosition;
    return copy;
  });
}
export {
  getTurnOrigin,
  getTurnPosition,
  isSessionTaskTurn,
  getTurnStartOriginKind,
  getOriginKindLabel,
  stampSummaryTurnFields,
};
