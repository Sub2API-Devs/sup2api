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
import { stripAnyVersatileSuffix } from "../model/modelIds.js";
import { getCanonicalName } from "../model/canonicalModelName.js";
import { getCachedClientData } from "../config.js";
import {
  getFeatureValue_SESSION_PINNED,
  getFeatureValue_CACHED_MAY_BE_STALE,
} from "../../services/analytics/growthbook.js";
import { safeParseJSON } from "../json.js";
import { isPlainObject as isPlainObject_4 } from "../objectUtils.js";
import { logForDebugging } from "../debug.js";
import { string } from "../../../vendor/zod/v4/classic/schemas.js";
import { env } from "../env.js";
import { logEvent } from "../../services/analytics/index.js";
import { SessionRootSlot } from "../../bootstrap/sessionSlices.js";
import { getRootSession } from "../../bootstrap/state.js";
import { getSessionFeatureValues } from "../../bootstrap/sessionFeatureValues.js";
import { fromEnum } from "../../services/analytics/safeMetadata.js";
import { isModelCapabilityEnabled } from "../model/promptBundles.js";
import { getInitialSettings_2 } from "../settings/settings.js";

//@ chunk-e6aww6q8.js:2230913-2230925 placement
/**
 * 按模型取配置时的通配键 “*”。
 */
var ANY_MODEL_KEY = "*";
//@ chunk-e6aww6q8.js:2230925-2231064 placement
function matchesWildcardPattern(e, n) {
  let filtered = e.split("*").filter((h) => h !== "");
  let s = 0;
  for (let h of filtered) {
    let index = n.indexOf(h, s);
    if (index === -1) return false;
    s = index + h.length;
  }
  return true;
}
//@ chunk-e6aww6q8.js:2231064-2231445 placement
/**
 * 在按模型名为键的对象中查找条目：优先精确匹配模型名，其次规范名，再次最长的通配匹配，最后是默认键。
 */
function findModelKeyedEntry(e, n) {
  let lower = stripAnyVersatileSuffix(n).toLowerCase();
  let lower_2 = stripAnyVersatileSuffix(getCanonicalName(n)).toLowerCase();
  let h;
  let y;
  let S;
  let w = -1;
  for (let [key, value] of Object.entries(e)) {
    let lower_3 = key.trim().toLowerCase();
    if (lower_3 === ANY_MODEL_KEY) {
      y ??= [key, value];
      continue;
    }
    if (lower_3 === lower) return [key, value];
    if (lower_3 === lower_2) {
      h ??= [key, value];
      continue;
    }
    let replaced = lower_3.replaceAll("*", "");
    if (replaced === "") continue;
    if (
      (matchesWildcardPattern(lower_3, lower) || matchesWildcardPattern(lower_3, lower_2)) &&
      replaced.length > w
    ) {
      S = [key, value];
      w = replaced.length;
    }
  }
  if (h !== undefined) return h;
  if (S !== undefined) return S;
  return y;
}
//@ chunk-e6aww6q8.js:2231445-2231495 placement
/**
 * 依次取调用方给的值、客户端数据、会话固定配置开关值。
 */
function getClientOrDefaultValue(e, n) {
  return n ?? getCachedClientData()?.[e] ?? getFeatureValue_SESSION_PINNED(e, null);
}
//@ chunk-e6aww6q8.js:2231495-2231590 placement
/**
 * 取配置时按模型取值：字符串解析成对象后取该模型的键。
 */
function getModelKeyedFlagValue(e, n, r) {
  let clientOrDefaultValue = getClientOrDefaultValue(e, n);
  let h =
    typeof clientOrDefaultValue === "string"
      ? (safeParseJSON(clientOrDefaultValue, false) ?? clientOrDefaultValue)
      : clientOrDefaultValue;
  return isPlainObject_4(h) ? getModelKeyedValue(h, r) : h;
}
//@ chunk-e6aww6q8.js:2231590-2231731 placement
/**
 * 在按模型名为键的对象中取值：精确匹配优先，否则用默认键。
 */
function getModelKeyedValue(e, n) {
  let r;
  for (let [key, value] of Object.entries(e)) {
    let lower = key.trim().toLowerCase();
    if (lower === n) return value;
    if (lower === ANY_MODEL_KEY && r === undefined) r = value;
  }
  return r;
}
//@ chunk-e6aww6q8.js:2231731-2231877 placement
var TOTAL_TOKENS_REMINDER_MODES = ["off", "infinite", "fixed", "countdown", "padded-countdown"];
var FIXED_TOTAL_TOKENS = 5000000;
var DEFAULT_TOTAL_TOKENS_BUDGET = 15000000;
var TOTAL_TOKENS_THRESHOLDS = [75, 50, 25, 10, 0];
var TENGU_LAPIS_ANCHOR_THRESHOLD = "tengu_lapis_anchor_threshold";
//@ chunk-e6aww6q8.js:2231877-2233186 placement
/**
 * 剩余 token 总数提醒：在主线程按设定节奏插入剩余额度提醒。
 */
class TotalTokensReminder {
  #e = new Map();
  #t = new Map();
  #n = new Map();
  #o = new Map();
  #r = new Map();
  rollOverContext(e, n) {
    this.#e.set(e, (this.#e.get(e) ?? 0) + n);
    let r = this.#i(e);
    r.rolledOver += n;
    r.rolloverCount++;
    if (this.#r.get(e) === true) this.#t.set(e, (this.#t.get(e) ?? 0) + n);
    else if (this.#r.has(e)) this.#r.set(e, true);
  }
  reanchorTaskBudget(e, n) {
    this.#o.delete(e);
    this.#t.set(e, (this.#e.get(e) ?? 0) + n);
    this.#n.set(e, 0);
  }
  excludeStartContext(e, n) {
    let r = this.#r.get(e);
    if (r === false) return;
    let s = n();
    if (s === undefined) return;
    this.#r.set(e, false);
    if (r === true) {
      this.#t.set(e, (this.#t.get(e) ?? 0) + s);
      return;
    }
    this.#t.set(e, (this.#e.get(e) ?? 0) + s);
    this.#n.set(e, 0);
    this.#o.delete(e);
    this.#i(e).excludedStartContext = s;
  }
  cumulativeUsed(e, n) {
    let s = (this.#e.get(e) ?? 0) + n - (this.#t.get(e) ?? 0);
    let h = this.#n.get(e) ?? 0;
    let max = Math.max(h, s);
    this.#n.set(e, max);
    return max;
  }
  remaining(e, n, r) {
    let s = this.cumulativeUsed(e, n);
    let h = r - s;
    let y = this.#i(e);
    for (let S of TOTAL_TOKENS_THRESHOLDS) {
      if (S >= y.loggedDownToPercent) continue;
      if (h > (r * S) / 100) break;
      y.loggedDownToPercent = S;
      logEvent(TENGU_LAPIS_ANCHOR_THRESHOLD, {
        thresholdPercent: S,
        budget: r,
        used: s,
        remaining: h,
        rolledOver: y.rolledOver,
        rolloverCount: y.rolloverCount,
        excludedStartContext: y.excludedStartContext,
        msSinceAnchor: Date.now() - y.anchoredAt,
        isSubagent: e !== "main",
      });
    }
    return h;
  }
  #i(e) {
    let n = this.#o.get(e);
    if (n === undefined) {
      n = {
        anchoredAt: Date.now(),
        rolledOver: 0,
        rolloverCount: 0,
        loggedDownToPercent: 100,
      };
      this.#o.set(e, n);
    }
    return n;
  }
}
//@ chunk-e6aww6q8.js:2233186-2233214 placement
/**
 * 按会话根保存剩余 token 提醒状态。
 */
var totalTokensReminderByRoot = new SessionRootSlot(() => new TotalTokensReminder());
//@ chunk-e6aww6q8.js:2233214-2233265 placement
/**
 * 上下文切换时让剩余 token 提醒跟随（重置计数）。
 */
function rollOverTotalTokensContext(e, n) {
  totalTokensReminderByRoot.of(getRootSession()).rollOverContext(e, n);
}
//@ chunk-e6aww6q8.js:2233265-2233325 placement
/**
 * 判断字符串是否为合法的剩余 token 提醒模式。
 */
function isTotalTokensReminderMode(e) {
  return typeof e === "string" && TOTAL_TOKENS_REMINDER_MODES.includes(e);
}
//@ chunk-e6aww6q8.js:2233325-2233463 placement
var TENGU_LAPIS_ANCHOR = "tengu_lapis_anchor";
var TENGU_LAPIS_ANCHOR_BUDGET = "tengu_lapis_anchor_budget";
var TENGU_LAPIS_ANCHOR_USER_TURN = "tengu_lapis_anchor_user_turn";
var TENGU_LAPIS_ANCHOR_FROM_CLIENT_DATA = "tengu_lapis_anchor_from_client_data";
//@ chunk-e6aww6q8.js:2233463-2233707 placement
function reportClientDataValue(e, n, r) {
  let s = (getSessionFeatureValues().totalTokensReminderClientDataReported ??= new Map());
  if (s.get(e) === n) return;
  s.set(e, n);
  if (r !== undefined) logEvent(TENGU_LAPIS_ANCHOR_FROM_CLIENT_DATA, r);
  else if (n !== undefined)
    logForDebugging(`[total_tokens reminder] ignoring clientData ${e} of type ${typeof n}`, {
      level: "warn",
    });
}
//@ chunk-e6aww6q8.js:2233707-2233742 placement
/**
 * 取生效的提醒模式：覆盖值优先，否则按特性开关。
 */
function getEffectiveTotalTokensReminderMode() {
  return getTotalTokensReminderModeOverride() ?? readDefaultTotalTokensReminderMode();
}
//@ chunk-e6aww6q8.js:2233742-2233882 placement
function getTotalTokensReminderModeOverride() {
  let configuredTotalTokensReminderMode = getConfiguredTotalTokensReminderMode();
  if (configuredTotalTokensReminderMode !== undefined) return configuredTotalTokensReminderMode;
  let n = getCachedClientData()?.[TENGU_LAPIS_ANCHOR];
  let r = isTotalTokensReminderMode(n) ? n : n === false ? "off" : undefined;
  reportClientDataValue(
    TENGU_LAPIS_ANCHOR,
    n,
    r
      ? {
          mode: fromEnum(r),
        }
      : undefined,
  );
  return r;
}
//@ chunk-e6aww6q8.js:2233882-2233964 placement
/**
 * 从 tengu_lapis_anchor 读默认提醒模式，非法时用 padded-countdown。
 */
function readDefaultTotalTokensReminderMode() {
  let featureValue_CACHED_MAY_BE_STALE = getFeatureValue_CACHED_MAY_BE_STALE(
    TENGU_LAPIS_ANCHOR,
    "padded-countdown",
  );
  return isTotalTokensReminderMode(featureValue_CACHED_MAY_BE_STALE)
    ? featureValue_CACHED_MAY_BE_STALE
    : "padded-countdown";
}
//@ chunk-e6aww6q8.js:2233964-2234104 placement
/**
 * 决定剩余 token 提醒模式：有固定预算时为 padded-countdown，否则按覆盖或模型能力决定。
 */
function getTotalTokensReminderMode(e, n) {
  if (n !== undefined) return "padded-countdown";
  return (
    getTotalTokensReminderModeOverride() ??
    (isModelCapabilityEnabled(
      "total_tokens_reminder",
      getCanonicalName(e, {
        deterministic: true,
      }),
      e,
    )
      ? readDefaultTotalTokensReminderMode()
      : "off")
  );
}
//@ chunk-e6aww6q8.js:2234104-2234234 placement
function getConfiguredTotalTokensReminderMode() {
  let CLAUDE_CODE_TOTAL_TOKENS_REMINDER = env.CLAUDE_CODE_TOTAL_TOKENS_REMINDER;
  if (isTotalTokensReminderMode(CLAUDE_CODE_TOTAL_TOKENS_REMINDER)) return CLAUDE_CODE_TOTAL_TOKENS_REMINDER;
  let totalTokensReminder = getInitialSettings_2().totalTokensReminder;
  return isTotalTokensReminderMode(totalTokensReminder) ? totalTokensReminder : undefined;
}
//@ chunk-e6aww6q8.js:2234234-2234564 placement
/**
 * 读取剩余 token 提醒的预算：环境变量 > 用户设置 > 客户端数据（上报一次）> 功能开关 tengu_lapis_anchor_budget > 默认值。
 */
function getTotalTokensReminderBudget() {
  let CLAUDE_CODE_TOTAL_TOKENS_REMINDER_BUDGET = env.CLAUDE_CODE_TOTAL_TOKENS_REMINDER_BUDGET;
  if (CLAUDE_CODE_TOTAL_TOKENS_REMINDER_BUDGET !== undefined && CLAUDE_CODE_TOTAL_TOKENS_REMINDER_BUDGET > 0)
    return CLAUDE_CODE_TOTAL_TOKENS_REMINDER_BUDGET;
  let totalTokensReminderBudget = getInitialSettings_2().totalTokensReminderBudget;
  if (Number.isFinite(totalTokensReminderBudget) && totalTokensReminderBudget > 0)
    return totalTokensReminderBudget;
  let r = getCachedClientData()?.[TENGU_LAPIS_ANCHOR_BUDGET];
  let s = typeof r === "number" && Number.isInteger(r) && r > 0;
  reportClientDataValue(
    TENGU_LAPIS_ANCHOR_BUDGET,
    r,
    s
      ? {
          budget: r,
        }
      : undefined,
  );
  if (s) return r;
  let featureValue_CACHED_MAY_BE_STALE = getFeatureValue_CACHED_MAY_BE_STALE(
    TENGU_LAPIS_ANCHOR_BUDGET,
    DEFAULT_TOTAL_TOKENS_BUDGET,
  );
  return Number.isFinite(featureValue_CACHED_MAY_BE_STALE) && featureValue_CACHED_MAY_BE_STALE > 0
    ? featureValue_CACHED_MAY_BE_STALE
    : DEFAULT_TOTAL_TOKENS_BUDGET;
}
//@ chunk-e6aww6q8.js:2234564-2235172 placement
function resolveTotalTokensReminderMode(e, n) {
  if (env.CLAUDE_CODE_DISABLE_ATTACHMENTS || env.CLAUDE_CODE_SIMPLE) return;
  let effectiveTotalTokensReminderMode = getEffectiveTotalTokensReminderMode();
  if (effectiveTotalTokensReminderMode !== "padded-countdown" && effectiveTotalTokensReminderMode !== "off")
    return;
  if (
    effectiveTotalTokensReminderMode === "off" &&
    n === undefined &&
    env.CLAUDE_CODE_RIPPLING_TULIP === undefined &&
    getConfiguredTotalTokensReminderMode() === "off"
  ) {
    logForDebugging(
      "[total_tokens reminder] off by CLAUDE_CODE_TOTAL_TOKENS_REMINDER/settings; not reading tengu_rippling_tulip for this subagent",
    );
    return;
  }
  let s =
    n === undefined
      ? getModelKeyedFlagValue("tengu_rippling_tulip", env.CLAUDE_CODE_RIPPLING_TULIP, e)
      : Number(n.findLast((h) => TOTAL_TOKENS_TAG_RE.test(h))?.match(TOTAL_TOKENS_TAG_RE)?.[1]);
  if (typeof s !== "number" || !Number.isSafeInteger(s) || s <= 0) return;
  if (effectiveTotalTokensReminderMode === "off" && n === undefined) return s;
  return s < getTotalTokensReminderBudget() ? s : undefined;
}
//@ chunk-e6aww6q8.js:2235172-2235281 placement
/**
 * 读取 tengu_calm_mochi 范围（forks、all 或 none）。
 */
function getCalmMochiScope() {
  let clientOrDefaultValue = getClientOrDefaultValue("tengu_calm_mochi", env.CLAUDE_CODE_CALM_MOCHI);
  return clientOrDefaultValue === "forks" || clientOrDefaultValue === "all" ? clientOrDefaultValue : "none";
}
//@ chunk-e6aww6q8.js:2235281-2235549 placement
/**
 * 判断剩余 token 提醒是否在用户回合后发送：环境变量 > 设置 > 客户端数据 > 开关。
 */
function shouldRemindAfterUserTurn() {
  let e = env.CLAUDE_CODE_TOTAL_TOKENS_REMINDER_AFTER_USER_TURN;
  if (e !== undefined) return e;
  let totalTokensReminderAfterUserTurn = getInitialSettings_2().totalTokensReminderAfterUserTurn;
  if (totalTokensReminderAfterUserTurn !== undefined) return totalTokensReminderAfterUserTurn;
  let r = getCachedClientData()?.[TENGU_LAPIS_ANCHOR_USER_TURN];
  let s = typeof r === "boolean";
  reportClientDataValue(
    TENGU_LAPIS_ANCHOR_USER_TURN,
    r,
    s
      ? {
          userTurn: r,
        }
      : undefined,
  );
  if (s) return r;
  return getFeatureValue_CACHED_MAY_BE_STALE(TENGU_LAPIS_ANCHOR_USER_TURN, true);
}
//@ chunk-e6aww6q8.js:2235549-2235675 placement
/**
 * 生成 <total_tokens> 提醒标签（无限、固定或剩余数量）。
 */
function formatTotalTokensTag(e, n) {
  return `<total_tokens>${e === "infinite" ? "Infinite" : e === "fixed" ? FIXED_TOTAL_TOKENS : Math.max(0, n)} tokens left</total_tokens>`;
}
//@ chunk-e6aww6q8.js:2235675-2235735 placement
/**
 * 匹配 “<total_tokens>N tokens left</total_tokens>” 文本。
 */
var TOTAL_TOKENS_TAG_RE = /^<total_tokens>(\d+) tokens left<\/total_tokens>$/;
export {
  formatTotalTokensTag,
  getTotalTokensReminderMode,
  getTotalTokensReminderBudget,
  resolveTotalTokensReminderMode,
  getCalmMochiScope,
  getClientOrDefaultValue,
  totalTokensReminderByRoot,
  rollOverTotalTokensContext,
  findModelKeyedEntry,
  getModelKeyedValue,
  shouldRemindAfterUserTurn,
  ANY_MODEL_KEY,
  getModelKeyedFlagValue,
};
