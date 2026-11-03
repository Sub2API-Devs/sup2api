/**
 * utils/contextAttachments/threadState.ts
 *
 * 2.1.316 新增：线程状态附件
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-e6aww6q8.js (6)
 * attribution: placement 6
 */
import { isFoamySpringEnabled } from "../../services/analytics/growthbookGates.js";
import {
  getFeatureValue_CACHED_MAY_BE_STALE,
  getFeatureValueWithSource_CACHED_MAY_BE_STALE,
} from "../../services/analytics/growthbook.js";
import { TENGU_CHAIR_SERMON } from "../messages.js";
import { Ao } from "../../bootstrap/sessionFeatureValues.js";

//@ chunk-e6aww6q8.js:122354-122381 placement
function X1t() {
  return isFoamySpringEnabled();
}
//@ chunk-e6aww6q8.js:122381-122463 placement
function i9() {
  let e = getFeatureValue_CACHED_MAY_BE_STALE(TENGU_CHAIR_SERMON, !1) === !0,
    { source: source } = getFeatureValueWithSource_CACHED_MAY_BE_STALE(TENGU_CHAIR_SERMON, !1);
  return { value: e, source: source };
}
/**
 * 读取提醒折叠开关（功能开启时在会话内缓存非回退来源的值）。
 */
//@ chunk-e6aww6q8.js:122463-122636 placement
function reminderFoldSetting() {
  if (!X1t()) return i9().value;
  let e = Ao();
  if (e.reminderFold !== void 0) return e.reminderFold;
  let { value: n, source: source } = i9();
  if (source !== "fallback") e.reminderFold = n;
  return n;
}
/**
 * 决定提醒折叠设置：显式值优先，其次会话缓存，再次远程配置（非回退来源时写入缓存）。
 */
//@ chunk-e6aww6q8.js:122636-122913 placement
function resolveReminderFold(e) {
  let n = i9();
  if (e !== void 0) return { fold: e, cached: n };
  if (!X1t()) return { fold: void 0, cached: n };
  let reminderFold = Ao().reminderFold;
  if (reminderFold !== void 0) return { fold: reminderFold, cached: n };
  if (n.source === "fallback") return { fold: void 0, cached: n };
  return ((Ao().reminderFold = n.value), { fold: n.value, cached: n });
}
//@ chunk-e6aww6q8.js:122913-122958 placement
var nao = /^(\d{1,6}m|\d{1,6}h \d{1,2}m) ago$/;
/**
 * 线程状态提示行："用户最后写于某时，此后 Claude 已发送 N 条回复"。
 */
//@ chunk-e6aww6q8.js:122958-123190 placement
function threadStateLine(e, n) {
  if (typeof e !== "string" || !nao.test(e) || typeof n !== "number" || !Number.isSafeInteger(n) || n < 0)
    return;
  let r = n === 1 ? "1 reply" : `${n} replies`;
  return `Thread state: the user last wrote ${e}. Claude has sent ${r} since then.`;
}

export { X1t, reminderFoldSetting, i9, threadStateLine, resolveReminderFold };
