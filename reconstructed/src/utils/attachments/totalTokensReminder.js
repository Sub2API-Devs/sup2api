/**
 * utils/attachments/totalTokensReminder.ts
 *
 * 2.1.316 新增：剩余 token 总数提醒
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-e6aww6q8.js (24)
 * attribution: placement 24
 */
import { Bn } from "../model/modelIds.js";
import { getCanonicalName } from "../model/canonicalModelName.js";
import { getCachedClientData } from "../config.js";
import {
  getFeatureValue_SESSION_PINNED,
  getFeatureValue_CACHED_MAY_BE_STALE,
} from "../../services/analytics/growthbook.js";
import { safeParseJSON } from "../json.js";
import { isPlainObject as isPlainObject_3 } from "../objectUtils.js";
import { logForDebugging } from "../debug.js";
import { o } from "../../../vendor/zod/v4/classic/schemas.js";
import { env } from "../env.js";
import { logEvent } from "../../services/analytics/index.js";
import { SessionRootSlot } from "../../bootstrap/sessionSlices.js";
import { getRootSession } from "../../bootstrap/state.js";
import { Ao } from "../../bootstrap/sessionFeatureValues.js";
import { fromEnum } from "../../services/analytics/safeMetadata.js";
import { isModelCapabilityEnabled } from "../model/promptBundles.js";
import { getInitialSettings_2 } from "../settings/settings.js";

//@ chunk-e6aww6q8.js:2230913-2230925 placement
var ite = "*";
//@ chunk-e6aww6q8.js:2230925-2231064 placement
function matchesWildcardPattern(e, n) {
  let filtered = e.split("*").filter((h) => h !== ""),
    s = 0;
  for (let h of filtered) {
    let index = n.indexOf(h, s);
    if (index === -1) return !1;
    s = index + h.length;
  }
  return !0;
}
/**
 * 在按模型名为键的对象中查找条目：优先精确匹配模型名，其次规范名，再次最长的通配匹配，最后是默认键。
 */
//@ chunk-e6aww6q8.js:2231064-2231445 placement
function findModelKeyedEntry(e, n) {
  let lower = Bn(n).toLowerCase(),
    lower_2 = Bn(getCanonicalName(n)).toLowerCase(),
    h,
    y,
    S,
    w = -1;
  for (let [L, G] of Object.entries(e)) {
    let lower_3 = L.trim().toLowerCase();
    if (lower_3 === ite) {
      y ??= [L, G];
      continue;
    }
    if (lower_3 === lower) return [L, G];
    if (lower_3 === lower_2) {
      h ??= [L, G];
      continue;
    }
    let replaced = lower_3.replaceAll("*", "");
    if (replaced === "") continue;
    if (
      (matchesWildcardPattern(lower_3, lower) || matchesWildcardPattern(lower_3, lower_2)) &&
      replaced.length > w
    )
      ((S = [L, G]), (w = replaced.length));
  }
  if (h !== void 0) return h;
  if (S !== void 0) return S;
  return y;
}
//@ chunk-e6aww6q8.js:2231445-2231495 placement
function Gpn(e, n) {
  return n ?? getCachedClientData()?.[e] ?? getFeatureValue_SESSION_PINNED(e, null);
}
//@ chunk-e6aww6q8.js:2231495-2231590 placement
function YWr(e, n, r) {
  let s = Gpn(e, n),
    h = typeof s === "string" ? (safeParseJSON(s, !1) ?? s) : s;
  return isPlainObject_3(h) ? getModelKeyedValue(h, r) : h;
}
/**
 * 在按模型名为键的对象中取值：精确匹配优先，否则用默认键。
 */
//@ chunk-e6aww6q8.js:2231590-2231731 placement
function getModelKeyedValue(e, n) {
  let r;
  for (let [s, h] of Object.entries(e)) {
    let lower = s.trim().toLowerCase();
    if (lower === n) return h;
    if (lower === ite && r === void 0) r = h;
  }
  return r;
}
//@ chunk-e6aww6q8.js:2231731-2231877 placement
var TOTAL_TOKENS_REMINDER_MODES = ["off", "infinite", "fixed", "countdown", "padded-countdown"],
  FIXED_TOTAL_TOKENS = 5000000,
  DEFAULT_TOTAL_TOKENS_BUDGET = 15000000,
  TOTAL_TOKENS_THRESHOLDS = [75, 50, 25, 10, 0],
  TENGU_LAPIS_ANCHOR_THRESHOLD = "tengu_lapis_anchor_threshold";
/**
 * 剩余 token 总数提醒：在主线程按设定节奏插入剩余额度提醒。
 */
//@ chunk-e6aww6q8.js:2231877-2233186 placement
class TotalTokensReminder {
  #e = new Map();
  #t = new Map();
  #n = new Map();
  #o = new Map();
  #r = new Map();
  rollOverContext(e, n) {
    this.#e.set(e, (this.#e.get(e) ?? 0) + n);
    let r = this.#i(e);
    if (((r.rolledOver += n), r.rolloverCount++, this.#r.get(e) === !0))
      this.#t.set(e, (this.#t.get(e) ?? 0) + n);
    else if (this.#r.has(e)) this.#r.set(e, !0);
  }
  reanchorTaskBudget(e, n) {
    (this.#o.delete(e), this.#t.set(e, (this.#e.get(e) ?? 0) + n), this.#n.set(e, 0));
  }
  excludeStartContext(e, n) {
    let r = this.#r.get(e);
    if (r === !1) return;
    let s = n();
    if (s === void 0) return;
    if ((this.#r.set(e, !1), r === !0)) {
      this.#t.set(e, (this.#t.get(e) ?? 0) + s);
      return;
    }
    (this.#t.set(e, (this.#e.get(e) ?? 0) + s),
      this.#n.set(e, 0),
      this.#o.delete(e),
      (this.#i(e).excludedStartContext = s));
  }
  cumulativeUsed(e, n) {
    let s = (this.#e.get(e) ?? 0) + n - (this.#t.get(e) ?? 0),
      h = this.#n.get(e) ?? 0,
      max = Math.max(h, s);
    return (this.#n.set(e, max), max);
  }
  remaining(e, n, r) {
    let cumulativeUsed = this.cumulativeUsed(e, n),
      h = r - cumulativeUsed,
      y = this.#i(e);
    for (let S of TOTAL_TOKENS_THRESHOLDS) {
      if (S >= y.loggedDownToPercent) continue;
      if (h > (r * S) / 100) break;
      ((y.loggedDownToPercent = S),
        logEvent(TENGU_LAPIS_ANCHOR_THRESHOLD, {
          thresholdPercent: S,
          budget: r,
          used: cumulativeUsed,
          remaining: h,
          rolledOver: y.rolledOver,
          rolloverCount: y.rolloverCount,
          excludedStartContext: y.excludedStartContext,
          msSinceAnchor: Date.now() - y.anchoredAt,
          isSubagent: e !== "main",
        }));
    }
    return h;
  }
  #i(e) {
    let n = this.#o.get(e);
    if (n === void 0)
      ((n = { anchoredAt: Date.now(), rolledOver: 0, rolloverCount: 0, loggedDownToPercent: 100 }),
        this.#o.set(e, n));
    return n;
  }
}
//@ chunk-e6aww6q8.js:2233186-2233214 placement
var pXn = new SessionRootSlot(() => new TotalTokensReminder());
//@ chunk-e6aww6q8.js:2233214-2233265 placement
function i1o(e, n) {
  pXn.of(getRootSession()).rollOverContext(e, n);
}
//@ chunk-e6aww6q8.js:2233265-2233325 placement
function XTe(e) {
  return typeof e === "string" && TOTAL_TOKENS_REMINDER_MODES.includes(e);
}
//@ chunk-e6aww6q8.js:2233325-2233463 placement
var TENGU_LAPIS_ANCHOR = "tengu_lapis_anchor",
  TENGU_LAPIS_ANCHOR_BUDGET = "tengu_lapis_anchor_budget",
  TENGU_LAPIS_ANCHOR_USER_TURN = "tengu_lapis_anchor_user_turn",
  TENGU_LAPIS_ANCHOR_FROM_CLIENT_DATA = "tengu_lapis_anchor_from_client_data";
//@ chunk-e6aww6q8.js:2233463-2233707 placement
function reportClientDataValue(e, n, r) {
  let s = (Ao().totalTokensReminderClientDataReported ??= new Map());
  if (s.get(e) === n) return;
  if ((s.set(e, n), r !== void 0)) logEvent(TENGU_LAPIS_ANCHOR_FROM_CLIENT_DATA, r);
  else if (n !== void 0)
    logForDebugging(`[total_tokens reminder] ignoring clientData ${e} of type ${typeof n}`, {
      level: "warn",
    });
}
//@ chunk-e6aww6q8.js:2233707-2233742 placement
function Elr() {
  return getTotalTokensReminderModeOverride() ?? Qin();
}
//@ chunk-e6aww6q8.js:2233742-2233882 placement
function getTotalTokensReminderModeOverride() {
  let e = getConfiguredTotalTokensReminderMode();
  if (e !== void 0) return e;
  let n = getCachedClientData()?.[TENGU_LAPIS_ANCHOR],
    r = XTe(n) ? n : n === !1 ? "off" : void 0;
  return (reportClientDataValue(TENGU_LAPIS_ANCHOR, n, r ? { mode: fromEnum(r) } : void 0), r);
}
//@ chunk-e6aww6q8.js:2233882-2233964 placement
function Qin() {
  let e = getFeatureValue_CACHED_MAY_BE_STALE(TENGU_LAPIS_ANCHOR, "padded-countdown");
  return XTe(e) ? e : "padded-countdown";
}
/**
 * 决定剩余 token 提醒模式：有固定预算时为 padded-countdown，否则按覆盖或模型能力决定。
 */
//@ chunk-e6aww6q8.js:2233964-2234104 placement
function getTotalTokensReminderMode(e, n) {
  if (n !== void 0) return "padded-countdown";
  return (
    getTotalTokensReminderModeOverride() ??
    (isModelCapabilityEnabled("total_tokens_reminder", getCanonicalName(e, { deterministic: !0 }), e)
      ? Qin()
      : "off")
  );
}
//@ chunk-e6aww6q8.js:2234104-2234234 placement
function getConfiguredTotalTokensReminderMode() {
  let CLAUDE_CODE_TOTAL_TOKENS_REMINDER = env.CLAUDE_CODE_TOTAL_TOKENS_REMINDER;
  if (XTe(CLAUDE_CODE_TOTAL_TOKENS_REMINDER)) return CLAUDE_CODE_TOTAL_TOKENS_REMINDER;
  let totalTokensReminder = getInitialSettings_2().totalTokensReminder;
  return XTe(totalTokensReminder) ? totalTokensReminder : void 0;
}
/**
 * 读取剩余 token 提醒的预算：环境变量 > 用户设置 > 客户端数据（上报一次）> 功能开关 tengu_lapis_anchor_budget > 默认值。
 */
//@ chunk-e6aww6q8.js:2234234-2234564 placement
function getTotalTokensReminderBudget() {
  let CLAUDE_CODE_TOTAL_TOKENS_REMINDER_BUDGET = env.CLAUDE_CODE_TOTAL_TOKENS_REMINDER_BUDGET;
  if (CLAUDE_CODE_TOTAL_TOKENS_REMINDER_BUDGET !== void 0 && CLAUDE_CODE_TOTAL_TOKENS_REMINDER_BUDGET > 0)
    return CLAUDE_CODE_TOTAL_TOKENS_REMINDER_BUDGET;
  let totalTokensReminderBudget = getInitialSettings_2().totalTokensReminderBudget;
  if (Number.isFinite(totalTokensReminderBudget) && totalTokensReminderBudget > 0)
    return totalTokensReminderBudget;
  let r = getCachedClientData()?.[TENGU_LAPIS_ANCHOR_BUDGET],
    s = typeof r === "number" && Number.isInteger(r) && r > 0;
  if ((reportClientDataValue(TENGU_LAPIS_ANCHOR_BUDGET, r, s ? { budget: r } : void 0), s)) return r;
  let h = getFeatureValue_CACHED_MAY_BE_STALE(TENGU_LAPIS_ANCHOR_BUDGET, DEFAULT_TOTAL_TOKENS_BUDGET);
  return Number.isFinite(h) && h > 0 ? h : DEFAULT_TOTAL_TOKENS_BUDGET;
}
//@ chunk-e6aww6q8.js:2234564-2235172 placement
function resolveTotalTokensReminderMode(e, n) {
  if (env.CLAUDE_CODE_DISABLE_ATTACHMENTS || env.CLAUDE_CODE_SIMPLE) return;
  let r = Elr();
  if (r !== "padded-countdown" && r !== "off") return;
  if (
    r === "off" &&
    n === void 0 &&
    env.CLAUDE_CODE_RIPPLING_TULIP === void 0 &&
    getConfiguredTotalTokensReminderMode() === "off"
  ) {
    logForDebugging(
      "[total_tokens reminder] off by CLAUDE_CODE_TOTAL_TOKENS_REMINDER/settings; not reading tengu_rippling_tulip for this subagent",
    );
    return;
  }
  let s =
    n === void 0
      ? YWr("tengu_rippling_tulip", env.CLAUDE_CODE_RIPPLING_TULIP, e)
      : Number(n.findLast((h) => Vin.test(h))?.match(Vin)?.[1]);
  if (typeof s !== "number" || !Number.isSafeInteger(s) || s <= 0) return;
  if (r === "off" && n === void 0) return s;
  return s < getTotalTokensReminderBudget() ? s : void 0;
}
/**
 * 读取 tengu_calm_mochi 范围（forks、all 或 none）。
 */
//@ chunk-e6aww6q8.js:2235172-2235281 placement
function getCalmMochiScope() {
  let e = Gpn("tengu_calm_mochi", env.CLAUDE_CODE_CALM_MOCHI);
  return e === "forks" || e === "all" ? e : "none";
}
/**
 * 判断剩余 token 提醒是否在用户回合后发送：环境变量 > 设置 > 客户端数据 > 开关。
 */
//@ chunk-e6aww6q8.js:2235281-2235549 placement
function shouldRemindAfterUserTurn() {
  let e = env.CLAUDE_CODE_TOTAL_TOKENS_REMINDER_AFTER_USER_TURN;
  if (e !== void 0) return e;
  let totalTokensReminderAfterUserTurn = getInitialSettings_2().totalTokensReminderAfterUserTurn;
  if (totalTokensReminderAfterUserTurn !== void 0) return totalTokensReminderAfterUserTurn;
  let r = getCachedClientData()?.[TENGU_LAPIS_ANCHOR_USER_TURN],
    s = typeof r === "boolean";
  if ((reportClientDataValue(TENGU_LAPIS_ANCHOR_USER_TURN, r, s ? { userTurn: r } : void 0), s)) return r;
  return getFeatureValue_CACHED_MAY_BE_STALE(TENGU_LAPIS_ANCHOR_USER_TURN, !0);
}
/**
 * 生成 <total_tokens> 提醒标签（无限、固定或剩余数量）。
 */
//@ chunk-e6aww6q8.js:2235549-2235675 placement
function formatTotalTokensTag(e, n) {
  return `<total_tokens>${e === "infinite" ? "Infinite" : e === "fixed" ? FIXED_TOTAL_TOKENS : Math.max(0, n)} tokens left</total_tokens>`;
}
//@ chunk-e6aww6q8.js:2235675-2235735 placement
var Vin = /^<total_tokens>(\d+) tokens left<\/total_tokens>$/;

export {
  formatTotalTokensTag,
  getTotalTokensReminderMode,
  getTotalTokensReminderBudget,
  resolveTotalTokensReminderMode,
  getCalmMochiScope,
  Gpn,
  pXn,
  i1o,
  findModelKeyedEntry,
  getModelKeyedValue,
  shouldRemindAfterUserTurn,
  ite,
  YWr,
};
