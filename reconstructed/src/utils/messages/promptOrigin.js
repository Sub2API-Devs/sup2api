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
import { Yno } from "../messageKinds.js";
import { YSt, isMachineOriginPrompt } from "../transcript/deserialize.js";
import { hasPollEventsAttachmentSince } from "../pollEvents.js";
import { getMessageIdentityUuids } from "../../cli/queuedCommands.js";

//@ chunk-e6aww6q8.js:4884781-4884957 placement
var KNOWN_ORIGIN_KINDS = {
  "auto-continuation": !0,
  channel: !0,
  coordinator: !0,
  human: !0,
  observer: !0,
  "observer-activity": !0,
  peer: !0,
  plugin: !0,
  "slack-ping": !0,
  "task-notification": !0,
  unclassified: !0,
};
/**
 * 返回消息来源类型的规范标签：没有来源为 unstamped，已知类型原样返回，其他为 unclassified。
 */
//@ chunk-e6aww6q8.js:4884957-4885064 placement
function getOriginKindLabel(e) {
  let n = e?.kind;
  if (n === void 0) return "unstamped";
  return Object.hasOwn(KNOWN_ORIGIN_KINDS, n) ? n : "unclassified";
}
/**
 * 取当前回合起点消息的来源类型（压缩摘要为 compacted）。
 */
//@ chunk-e6aww6q8.js:4885064-4885208 placement
function getTurnStartOriginKind(e) {
  let n = lastUserPromptIndex(e);
  if (n === -1) return;
  let r = e[n];
  if (r.type !== "user") return;
  if (r.isCompactSummary) return "compacted";
  return getOriginKindLabel(r.origin);
}
/**
 * 取当前回合起点用户消息的 turnOrigin。
 */
//@ chunk-e6aww6q8.js:4885208-4885308 placement
function getTurnOrigin(e) {
  let n = lastUserPromptIndex(e);
  if (n === -1) return;
  let r = e[n];
  return r.type === "user" ? r.turnOrigin : void 0;
}
/**
 * 取当前回合起点的回合位置信息（起点需有 promptId 或 turnOrigin）。
 */
//@ chunk-e6aww6q8.js:4885308-4885432 placement
function getTurnPosition(e) {
  let n = lastUserPromptIndex(e);
  if (n === -1) return;
  let r = e[n];
  return r.type === "user" && (r.promptId || r.turnOrigin) ? mergedTurnPosition(e, n) : void 0;
}
/**
 * 判断当前回合是否由会话任务的任务通知触发（压缩摘要时看 turnOrigin）；出错返回 false。
 */
//@ chunk-e6aww6q8.js:4885432-4885684 placement
function isSessionTaskTurn(e) {
  try {
    let n = lastUserPromptIndex(e),
      r = n === -1 ? void 0 : e[n];
    if (r?.type !== "user") return !1;
    if (r.isCompactSummary) return r.turnOrigin === "task_notification";
    return r.origin?.kind === "task-notification" && r.origin.producer === "session-task";
  } catch (error) {
    return (logError(error), !1);
  }
}
/**
 * 给消息列表中缺少的字段补上 promptId、turnOrigin、回合位置与被摘要的提示 uuid。
 */
//@ chunk-e6aww6q8.js:4885684-4886077 placement
function stampTurnFields(e, n, r, s, h) {
  if (n === void 0 && r === void 0 && s === void 0 && h === void 0) return e;
  return e.map((y) => {
    let S = y.promptId === void 0 && n !== void 0,
      w = y.turnOrigin === void 0 && r !== void 0,
      L = y.turnPosition === void 0 && s !== void 0,
      G = y.summarizedTurnPromptUuids === void 0 && h !== void 0;
    return S || w || L || G
      ? {
          ...y,
          ...(S && { promptId: n }),
          ...(w && { turnOrigin: r }),
          ...(L && { turnPosition: s }),
          ...(G && { summarizedTurnPromptUuids: h }),
        }
      : y;
  });
}
/**
 * 给压缩摘要等新消息补上当前回合的 promptId、turnOrigin、回合位置与被摘要的提示 uuid；开关开启时再附上回合起点的人类驱动信息；出错时只做最基本的处理。
 */
//@ chunk-e6aww6q8.js:4886077-4886455 placement
function stampSummaryTurnFields(e, n) {
  let r,
    s,
    h,
    y = !0,
    S;
  try {
    let L = lastUserPromptIndex(n);
    if (
      ((y = L !== -1),
      (r = getPromptId(n)),
      (s = getTurnOrigin(n)),
      (h = y ? mergedTurnPosition(n, L) : void 0),
      getFeatureValue_CACHED_MAY_BE_STALE("tengu_soft_spindle", !0))
    )
      S = {
        byHuman: isUserDrivenTurn(n),
        byHumanHere: isUserDrivenHere(n),
        bySessionUsersOwnWords: isStrictHumanTurn(n),
      };
  } catch (error) {
    (logError(error), (r = void 0), (s = void 0), (h = void 0), (y = !0), (S = void 0));
  }
  let w = stampTurnFields(y && h === void 0 ? stripTurnPosition(e) : e, r, s, h, getSummarizedPromptUuids(n));
  return S === void 0 ? w : w.map((L) => ({ ...L, [Yno]: { summaryUuid: L.uuid, turnStart: S } }));
}
//@ chunk-e6aww6q8.js:4886455-4886747 placement
function getSummarizedPromptUuids(e) {
  try {
    let max = Math.max(
        lastUserPromptIndex(e),
        e.findLastIndex((h) => YSt(h).length > 0),
      ),
      r = e[max];
    if (
      r?.type !== "user" ||
      !(r.isCompactSummary || isUserPromptAt(e, max, !1)) ||
      hasPollEventsAttachmentSince(e, max) ||
      e.some((h, y) => y > max && (isUserPromptAt(e, y, !0) || isMachineOriginPrompt(h)))
    )
      return;
    let s = r.isCompactSummary ? YSt(r) : getMessageIdentityUuids(r);
    return s.length > 0 ? s : void 0;
  } catch (error) {
    logError(error);
    return;
  }
}
//@ chunk-e6aww6q8.js:4886747-4886878 placement
function stripTurnPosition(e) {
  if (!e.some((n) => n.turnPosition !== void 0)) return e;
  return e.map((n) => {
    let r = { ...n };
    return (delete r.turnPosition, r);
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
