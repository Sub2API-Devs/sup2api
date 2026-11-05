/**
 * utils/contextAttachments/threadState.ts
 *
 * 2.1.316 新增：线程状态附件
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-5xgkngpb.js (6)
 * attribution: placement 6
 */
import { isFoamySpringEnabled } from "../../services/analytics/growthbookGates.js";
import {
  getFeatureValue_CACHED_MAY_BE_STALE,
  getFeatureValueWithSource_CACHED_MAY_BE_STALE,
} from "../../services/analytics/growthbook.js";
import { TENGU_CHAIR_SERMON } from "../messages.js";
import { getSessionFeatureValues } from "../../bootstrap/sessionFeatureValues.js";

//@ chunk-5xgkngpb.js:125128-125155 placement
/**
 * 线程状态特性是否开启（tengu_foamy_spring）。
 */
function isThreadStateFeatureOn() {
  return isFoamySpringEnabled();
}
//@ chunk-5xgkngpb.js:125155-125237 placement
/**
 * 读取线程状态提醒开关（tengu_chair_sermon）及其来源。
 */
function threadStateReminderSetting() {
  let value = getFeatureValue_CACHED_MAY_BE_STALE(TENGU_CHAIR_SERMON, false) === true;
  let { source } = getFeatureValueWithSource_CACHED_MAY_BE_STALE(TENGU_CHAIR_SERMON, false);
  return {
    value,
    source,
  };
}
//@ chunk-5xgkngpb.js:125237-125410 placement
/**
 * 读取提醒折叠开关（功能开启时在会话内缓存非回退来源的值）。
 */
function reminderFoldSetting() {
  if (!isThreadStateFeatureOn()) return threadStateReminderSetting().value;
  let sessionFeatureValues = getSessionFeatureValues();
  if (sessionFeatureValues.reminderFold !== undefined) return sessionFeatureValues.reminderFold;
  let { value, source } = threadStateReminderSetting();
  if (source !== "fallback") sessionFeatureValues.reminderFold = value;
  return value;
}
//@ chunk-5xgkngpb.js:125410-125687 placement
/**
 * 决定提醒折叠设置：显式值优先，其次会话缓存，再次远程配置（非回退来源时写入缓存）。
 */
function resolveReminderFold(messages) {
  let setting = threadStateReminderSetting();
  if (messages !== undefined)
    return {
      fold: messages,
      cached: setting,
    };
  if (!isThreadStateFeatureOn())
    return {
      fold: undefined,
      cached: setting,
    };
  let reminderFold = getSessionFeatureValues().reminderFold;
  if (reminderFold !== undefined)
    return {
      fold: reminderFold,
      cached: setting,
    };
  if (setting.source === "fallback")
    return {
      fold: undefined,
      cached: setting,
    };
  getSessionFeatureValues().reminderFold = setting.value;
  return {
    fold: setting.value,
    cached: setting,
  };
}
//@ chunk-5xgkngpb.js:125687-125732 placement
/**
 * 匹配 “N m ago / N h M m ago” 形式的相对时间文本。
 */
var RELATIVE_TIME_AGO_RE = /^(\d{1,6}m|\d{1,6}h \d{1,2}m) ago$/;
//@ chunk-5xgkngpb.js:125732-125964 placement
/**
 * 线程状态提示行："用户最后写于某时，此后 Claude 已发送 N 条回复"。
 */
function threadStateLine(sinceUser, repliesSinceUser) {
  if (
    typeof sinceUser !== "string" ||
    !RELATIVE_TIME_AGO_RE.test(sinceUser) ||
    typeof repliesSinceUser !== "number" ||
    !Number.isSafeInteger(repliesSinceUser) ||
    repliesSinceUser < 0
  )
    return;
  let replyText = repliesSinceUser === 1 ? "1 reply" : `${repliesSinceUser} replies`;
  return `Thread state: the user last wrote ${sinceUser}. Claude has sent ${replyText} since then.`;
}
export {
  isThreadStateFeatureOn,
  reminderFoldSetting,
  threadStateReminderSetting,
  threadStateLine,
  resolveReminderFold,
};
