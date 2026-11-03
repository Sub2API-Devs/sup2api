/**
 * utils/messages/promptOrigin.ts
 *
 * 2.1.316 新增：提示来源标记
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-e6aww6q8.js (10)
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

//@ chunk-e6aww6q8.js:4884781-4884957 placement
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
//@ chunk-e6aww6q8.js:4884957-4885064 placement
/**
 * 返回消息来源类型的规范标签：没有来源为 unstamped，已知类型原样返回，其他为 unclassified。
 */
function getOriginKindLabel(origin) {
  let kind = origin?.kind;
  if (kind === undefined) return "unstamped";
  return Object.hasOwn(KNOWN_ORIGIN_KINDS, kind) ? kind : "unclassified";
}
//@ chunk-e6aww6q8.js:4885064-4885208 placement
/**
 * 取当前回合起点消息的来源类型（压缩摘要为 compacted）。
 */
function getTurnStartOriginKind(messages) {
  let n = lastUserPromptIndex(messages);
  if (n === -1) return;
  let r = messages[n];
  if (r.type !== "user") return;
  if (r.isCompactSummary) return "compacted";
  return getOriginKindLabel(r.origin);
}
//@ chunk-e6aww6q8.js:4885208-4885308 placement
/**
 * 取当前回合起点用户消息的 turnOrigin。
 */
function getTurnOrigin(e) {
  let n = lastUserPromptIndex(e);
  if (n === -1) return;
  let r = e[n];
  return r.type === "user" ? r.turnOrigin : undefined;
}
//@ chunk-e6aww6q8.js:4885308-4885432 placement
/**
 * 取当前回合起点的回合位置信息（起点需有 promptId 或 turnOrigin）。
 */
function getTurnPosition(e) {
  let n = lastUserPromptIndex(e);
  if (n === -1) return;
  let r = e[n];
  return r.type === "user" && (r.promptId || r.turnOrigin) ? mergedTurnPosition(e, n) : undefined;
}
//@ chunk-e6aww6q8.js:4885432-4885684 placement
/**
 * 判断当前回合是否由会话任务的任务通知触发（压缩摘要时看 turnOrigin）；出错返回 false。
 */
function isSessionTaskTurn(e) {
  try {
    let n = lastUserPromptIndex(e);
    let r = n === -1 ? undefined : e[n];
    if (r?.type !== "user") return false;
    if (r.isCompactSummary) return r.turnOrigin === "task_notification";
    return r.origin?.kind === "task-notification" && r.origin.producer === "session-task";
  } catch (error) {
    logError(error);
    return false;
  }
}
//@ chunk-e6aww6q8.js:4885684-4886077 placement
/**
 * 给消息列表中缺少的字段补上 promptId、turnOrigin、回合位置与被摘要的提示 uuid。
 */
function stampTurnFields(e, n, r, s, summarizedPromptUuids) {
  if (n === undefined && r === undefined && s === undefined && summarizedPromptUuids === undefined) return e;
  return e.map((y) => {
    let S = y.promptId === undefined && n !== undefined;
    let w = y.turnOrigin === undefined && r !== undefined;
    let L = y.turnPosition === undefined && s !== undefined;
    let G = y.summarizedTurnPromptUuids === undefined && summarizedPromptUuids !== undefined;
    return S || w || L || G
      ? {
          ...y,
          ...(S && {
            promptId: n,
          }),
          ...(w && {
            turnOrigin: r,
          }),
          ...(L && {
            turnPosition: s,
          }),
          ...(G && {
            summarizedTurnPromptUuids: summarizedPromptUuids,
          }),
        }
      : y;
  });
}
//@ chunk-e6aww6q8.js:4886077-4886455 placement
/**
 * 给压缩摘要等新消息补上当前回合的 promptId、turnOrigin、回合位置与被摘要的提示 uuid；开关开启时再附上回合起点的人类驱动信息；出错时只做最基本的处理。
 */
function stampSummaryTurnFields(summaryMessages, messagesForQuery) {
  let r;
  let s;
  let h;
  let y = true;
  let S;
  try {
    let L = lastUserPromptIndex(messagesForQuery);
    y = L !== -1;
    r = getPromptId(messagesForQuery);
    s = getTurnOrigin(messagesForQuery);
    h = y ? mergedTurnPosition(messagesForQuery, L) : undefined;
    if (getFeatureValue_CACHED_MAY_BE_STALE("tengu_soft_spindle", true))
      S = {
        byHuman: isUserDrivenTurn(messagesForQuery),
        byHumanHere: isUserDrivenHere(messagesForQuery),
        bySessionUsersOwnWords: isStrictHumanTurn(messagesForQuery),
      };
  } catch (error) {
    logError(error);
    r = undefined;
    s = undefined;
    h = undefined;
    y = true;
    S = undefined;
  }
  let w = stampTurnFields(
    y && h === undefined ? stripTurnPosition(summaryMessages) : summaryMessages,
    r,
    s,
    h,
    getSummarizedPromptUuids(messagesForQuery),
  );
  return S === undefined
    ? w
    : w.map((L) => ({
        ...L,
        [replacedTurnStartSymbol]: {
          summaryUuid: L.uuid,
          turnStart: S,
        },
      }));
}
//@ chunk-e6aww6q8.js:4886455-4886747 placement
function getSummarizedPromptUuids(e) {
  try {
    let max = Math.max(
      lastUserPromptIndex(e),
      e.findLastIndex((h) => summarizedPromptUuids(h).length > 0),
    );
    let r = e[max];
    if (
      r?.type !== "user" ||
      !(r.isCompactSummary || isUserPromptAt(e, max, false)) ||
      hasPollEventsAttachmentSince(e, max) ||
      e.some((h, y) => y > max && (isUserPromptAt(e, y, true) || isMachineOriginPrompt(h)))
    )
      return;
    let s = r.isCompactSummary ? summarizedPromptUuids(r) : getMessageIdentityUuids(r);
    return s.length > 0 ? s : undefined;
  } catch (error) {
    logError(error);
    return;
  }
}
//@ chunk-e6aww6q8.js:4886747-4886878 placement
function stripTurnPosition(e) {
  if (!e.some((n) => n.turnPosition !== undefined)) return e;
  return e.map((n) => {
    let r = {
      ...n,
    };
    delete r.turnPosition;
    return r;
  });
}
export {
  getOriginKindLabel,
  getTurnOrigin,
  getTurnPosition,
  isSessionTaskTurn,
  getTurnStartOriginKind,
  stampSummaryTurnFields,
};
