/**
 * utils/attachments/totalTokensReminder.ts
 *
 * 2.1.316 新增：剩余 token 总数提醒
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-5xgkngpb.js (24)
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
import { isPlainObject as isPlainObject_5 } from "../objectUtils.js";
import { logForDebugging } from "../debug.js";
import { stringSchema } from "../../../vendor/zod/v4/classic/schemas.js";
import { env } from "../env.js";
import { logEvent } from "../../services/analytics/index.js";
import { SessionRootSlot } from "../../bootstrap/sessionSlices.js";
import { getRootSession } from "../../bootstrap/state.js";
import { getSessionFeatureValues } from "../../bootstrap/sessionFeatureValues.js";
import { fromEnum } from "../../services/analytics/safeMetadata.js";
import { isModelCapabilityEnabled } from "../model/promptBundles.js";
import { getInitialSettings } from "../settings/settings.js";
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-5xgkngpb.js:2285922-2285934 placement
/**
 * 按模型取配置时的通配键 “*”。
 */
var ANY_MODEL_KEY = "*";
//@ chunk-5xgkngpb.js:2285934-2286073 placement
function matchesWildcardPattern(pattern, value) {
  let filtered = pattern.split("*").filter((part) => part !== "");
  let cursor = 0;
  for (let part of filtered) {
    let index = value.indexOf(part, cursor);
    if (index === -1) return false;
    cursor = index + part.length;
  }
  return true;
}
//@ chunk-5xgkngpb.js:2286073-2286458 placement
/**
 * 在按模型名为键的对象中查找条目：优先精确匹配模型名，其次规范名，再次最长的通配匹配，最后是默认键。
 */
function findModelKeyedEntry(entriesObject, model) {
  let lower = stripAnyVersatileSuffix(model).toLowerCase();
  let lower_2 = stripAnyVersatileSuffix(getCanonicalName(model)).toLowerCase();
  let canonicalMatch;
  let anyModelMatch;
  let wildcardMatch;
  let wildcardLength = -1;
  for (let [key, value] of Object.entries(entriesObject)) {
    let pattern = key.trim().toLowerCase();
    if (pattern === ANY_MODEL_KEY) {
      anyModelMatch ??= [key, value];
      continue;
    }
    if (pattern === lower) return [key, value];
    if (pattern === lower_2) {
      canonicalMatch ??= [key, value];
      continue;
    }
    let replaced = pattern.replaceAll("*", "");
    if (replaced === "") continue;
    if (
      (matchesWildcardPattern(pattern, lower) || matchesWildcardPattern(pattern, lower_2)) &&
      replaced.length > wildcardLength
    ) {
      wildcardMatch = [key, value];
      wildcardLength = replaced.length;
    }
  }
  if (canonicalMatch !== undefined) return canonicalMatch;
  if (wildcardMatch !== undefined) return wildcardMatch;
  return anyModelMatch;
}
//@ chunk-5xgkngpb.js:2286458-2286508 placement
/**
 * 依次取调用方给的值、客户端数据、会话固定配置开关值。
 */
function getClientOrDefaultValue(flagKey, explicitValue) {
  return explicitValue ?? getCachedClientData()?.[flagKey] ?? getFeatureValue_SESSION_PINNED(flagKey, null);
}
//@ chunk-5xgkngpb.js:2286508-2286603 placement
/**
 * 取配置时按模型取值：字符串解析成对象后取该模型的键。
 */
function getModelKeyedFlagValue(flagKey, explicitValue, model) {
  let clientOrDefaultValue = getClientOrDefaultValue(flagKey, explicitValue);
  let parsedValue =
    typeof clientOrDefaultValue === "string"
      ? (safeParseJSON(clientOrDefaultValue, false) ?? clientOrDefaultValue)
      : clientOrDefaultValue;
  return isPlainObject_5(parsedValue) ? getModelKeyedValue(parsedValue, model) : parsedValue;
}
//@ chunk-5xgkngpb.js:2286603-2286744 placement
/**
 * 在按模型名为键的对象中取值：精确匹配优先，否则用默认键。
 */
function getModelKeyedValue(entriesObject, modelKey) {
  let anyModelValue;
  for (let [key, value] of Object.entries(entriesObject)) {
    let lower = key.trim().toLowerCase();
    if (lower === modelKey) return value;
    if (lower === ANY_MODEL_KEY && anyModelValue === undefined) anyModelValue = value;
  }
  return anyModelValue;
}
//@ chunk-5xgkngpb.js:2286744-2286890 placement
var TOTAL_TOKENS_REMINDER_MODES = ["off", "infinite", "fixed", "countdown", "padded-countdown"];
var FIXED_TOTAL_TOKENS = 5000000;
var DEFAULT_TOTAL_TOKENS_BUDGET = 15000000;
var TOTAL_TOKENS_THRESHOLDS = [75, 50, 25, 10, 0];
var TENGU_LAPIS_ANCHOR_THRESHOLD = "tengu_lapis_anchor_threshold";
//@ chunk-5xgkngpb.js:2286890-2288199 placement
/**
 * 剩余 token 总数提醒：在主线程按设定节奏插入剩余额度提醒。
 */
class TotalTokensReminder {
  #e = new Map();
  #t = new Map();
  #n = new Map();
  #o = new Map();
  #r = new Map();
  rollOverContext(budgetKey, tokens) {
    this.#e.set(budgetKey, (this.#e.get(budgetKey) ?? 0) + tokens);
    let thresholdState = this.#i(budgetKey);
    thresholdState.rolledOver += tokens;
    thresholdState.rolloverCount++;
    if (this.#r.get(budgetKey) === true) this.#t.set(budgetKey, (this.#t.get(budgetKey) ?? 0) + tokens);
    else if (this.#r.has(budgetKey)) this.#r.set(budgetKey, true);
  }
  reanchorTaskBudget(budgetKey, tokens) {
    this.#o.delete(budgetKey);
    this.#t.set(budgetKey, (this.#e.get(budgetKey) ?? 0) + tokens);
    this.#n.set(budgetKey, 0);
  }
  excludeStartContext(budgetKey, getStartTokens) {
    let previous = this.#r.get(budgetKey);
    if (previous === false) return;
    let startTokens = getStartTokens();
    if (startTokens === undefined) return;
    this.#r.set(budgetKey, false);
    if (previous === true) {
      this.#t.set(budgetKey, (this.#t.get(budgetKey) ?? 0) + startTokens);
      return;
    }
    this.#t.set(budgetKey, (this.#e.get(budgetKey) ?? 0) + startTokens);
    this.#n.set(budgetKey, 0);
    this.#o.delete(budgetKey);
    this.#i(budgetKey).excludedStartContext = startTokens;
  }
  cumulativeUsed(budgetKey, tokens) {
    let used = (this.#e.get(budgetKey) ?? 0) + tokens - (this.#t.get(budgetKey) ?? 0);
    let highWaterMark = this.#n.get(budgetKey) ?? 0;
    let max = Math.max(highWaterMark, used);
    this.#n.set(budgetKey, max);
    return max;
  }
  remaining(budgetKey, tokens, budget) {
    let used = this.cumulativeUsed(budgetKey, tokens);
    let remainingTokens = budget - used;
    let thresholdState = this.#i(budgetKey);
    for (let thresholdPercent of TOTAL_TOKENS_THRESHOLDS) {
      if (thresholdPercent >= thresholdState.loggedDownToPercent) continue;
      if (remainingTokens > (budget * thresholdPercent) / 100) break;
      thresholdState.loggedDownToPercent = thresholdPercent;
      logEvent(TENGU_LAPIS_ANCHOR_THRESHOLD, {
        thresholdPercent,
        budget,
        used,
        remaining: remainingTokens,
        rolledOver: thresholdState.rolledOver,
        rolloverCount: thresholdState.rolloverCount,
        excludedStartContext: thresholdState.excludedStartContext,
        msSinceAnchor: Date.now() - thresholdState.anchoredAt,
        isSubagent: budgetKey !== "main",
      });
    }
    return remainingTokens;
  }
  #i(budgetKey) {
    let state = this.#o.get(budgetKey);
    if (state === undefined) {
      state = {
        anchoredAt: Date.now(),
        rolledOver: 0,
        rolloverCount: 0,
        loggedDownToPercent: 100,
      };
      this.#o.set(budgetKey, state);
    }
    return state;
  }
}
//@ chunk-5xgkngpb.js:2288199-2288227 placement
/**
 * 按会话根保存剩余 token 提醒状态。
 */
var totalTokensReminderByRoot; // deferred: uses SessionRootSlot (../../bootstrap/sessionSlices.js) of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-5xgkngpb.js:2288199", () => {
  totalTokensReminderByRoot = new SessionRootSlot(() => new TotalTokensReminder());
});
//@ chunk-5xgkngpb.js:2288227-2288278 placement
/**
 * 上下文切换时让剩余 token 提醒跟随（重置计数）。
 */
function rollOverTotalTokensContext(budgetKey, tokens) {
  totalTokensReminderByRoot.of(getRootSession()).rollOverContext(budgetKey, tokens);
}
//@ chunk-5xgkngpb.js:2288278-2288338 placement
/**
 * 判断字符串是否为合法的剩余 token 提醒模式。
 */
function isTotalTokensReminderMode(value) {
  return typeof value === "string" && TOTAL_TOKENS_REMINDER_MODES.includes(value);
}
//@ chunk-5xgkngpb.js:2288338-2288476 placement
var TENGU_LAPIS_ANCHOR = "tengu_lapis_anchor";
var TENGU_LAPIS_ANCHOR_BUDGET = "tengu_lapis_anchor_budget";
var TENGU_LAPIS_ANCHOR_USER_TURN = "tengu_lapis_anchor_user_turn";
var TENGU_LAPIS_ANCHOR_FROM_CLIENT_DATA = "tengu_lapis_anchor_from_client_data";
//@ chunk-5xgkngpb.js:2288476-2288720 placement
function reportClientDataValue(key, value, telemetryFields) {
  let reportedValues = (getSessionFeatureValues().totalTokensReminderClientDataReported ??= new Map());
  if (reportedValues.get(key) === value) return;
  reportedValues.set(key, value);
  if (telemetryFields !== undefined) logEvent(TENGU_LAPIS_ANCHOR_FROM_CLIENT_DATA, telemetryFields);
  else if (value !== undefined)
    logForDebugging(`[total_tokens reminder] ignoring clientData ${key} of type ${typeof value}`, {
      level: "warn",
    });
}
//@ chunk-5xgkngpb.js:2288720-2288755 placement
/**
 * 取生效的提醒模式：覆盖值优先，否则按特性开关。
 */
function getEffectiveTotalTokensReminderMode() {
  return getTotalTokensReminderModeOverride() ?? readDefaultTotalTokensReminderMode();
}
//@ chunk-5xgkngpb.js:2288755-2288895 placement
function getTotalTokensReminderModeOverride() {
  let configuredTotalTokensReminderMode = getConfiguredTotalTokensReminderMode();
  if (configuredTotalTokensReminderMode !== undefined) return configuredTotalTokensReminderMode;
  let clientValue = getCachedClientData()?.[TENGU_LAPIS_ANCHOR];
  let resolvedMode = isTotalTokensReminderMode(clientValue)
    ? clientValue
    : clientValue === false
      ? "off"
      : undefined;
  reportClientDataValue(
    TENGU_LAPIS_ANCHOR,
    clientValue,
    resolvedMode
      ? {
          mode: fromEnum(resolvedMode),
        }
      : undefined,
  );
  return resolvedMode;
}
//@ chunk-5xgkngpb.js:2288895-2288977 placement
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
//@ chunk-5xgkngpb.js:2288977-2289117 placement
/**
 * 决定剩余 token 提醒模式：有固定预算时为 padded-countdown，否则按覆盖或模型能力决定。
 */
function getTotalTokensReminderMode(model, totalTokensReminderBudget) {
  if (totalTokensReminderBudget !== undefined) return "padded-countdown";
  return (
    getTotalTokensReminderModeOverride() ??
    (isModelCapabilityEnabled(
      "total_tokens_reminder",
      getCanonicalName(model, {
        deterministic: true,
      }),
      model,
    )
      ? readDefaultTotalTokensReminderMode()
      : "off")
  );
}
//@ chunk-5xgkngpb.js:2289117-2289247 placement
function getConfiguredTotalTokensReminderMode() {
  let CLAUDE_CODE_TOTAL_TOKENS_REMINDER = env.CLAUDE_CODE_TOTAL_TOKENS_REMINDER;
  if (isTotalTokensReminderMode(CLAUDE_CODE_TOTAL_TOKENS_REMINDER)) return CLAUDE_CODE_TOTAL_TOKENS_REMINDER;
  let totalTokensReminder = getInitialSettings().totalTokensReminder;
  return isTotalTokensReminderMode(totalTokensReminder) ? totalTokensReminder : undefined;
}
//@ chunk-5xgkngpb.js:2289247-2289577 placement
/**
 * 读取剩余 token 提醒的预算：环境变量 > 用户设置 > 客户端数据（上报一次）> 功能开关 tengu_lapis_anchor_budget > 默认值。
 */
function getTotalTokensReminderBudget() {
  let CLAUDE_CODE_TOTAL_TOKENS_REMINDER_BUDGET = env.CLAUDE_CODE_TOTAL_TOKENS_REMINDER_BUDGET;
  if (CLAUDE_CODE_TOTAL_TOKENS_REMINDER_BUDGET !== undefined && CLAUDE_CODE_TOTAL_TOKENS_REMINDER_BUDGET > 0)
    return CLAUDE_CODE_TOTAL_TOKENS_REMINDER_BUDGET;
  let totalTokensReminderBudget = getInitialSettings().totalTokensReminderBudget;
  if (Number.isFinite(totalTokensReminderBudget) && totalTokensReminderBudget > 0)
    return totalTokensReminderBudget;
  let clientBudget = getCachedClientData()?.[TENGU_LAPIS_ANCHOR_BUDGET];
  let isUsableBudget = typeof clientBudget === "number" && Number.isInteger(clientBudget) && clientBudget > 0;
  reportClientDataValue(
    TENGU_LAPIS_ANCHOR_BUDGET,
    clientBudget,
    isUsableBudget
      ? {
          budget: clientBudget,
        }
      : undefined,
  );
  if (isUsableBudget) return clientBudget;
  let featureValue_CACHED_MAY_BE_STALE = getFeatureValue_CACHED_MAY_BE_STALE(
    TENGU_LAPIS_ANCHOR_BUDGET,
    DEFAULT_TOTAL_TOKENS_BUDGET,
  );
  return Number.isFinite(featureValue_CACHED_MAY_BE_STALE) && featureValue_CACHED_MAY_BE_STALE > 0
    ? featureValue_CACHED_MAY_BE_STALE
    : DEFAULT_TOTAL_TOKENS_BUDGET;
}
//@ chunk-5xgkngpb.js:2289577-2290185 placement
function resolveTotalTokensReminderMode(model, messages) {
  if (env.CLAUDE_CODE_DISABLE_ATTACHMENTS || env.CLAUDE_CODE_SIMPLE) return;
  let effectiveTotalTokensReminderMode = getEffectiveTotalTokensReminderMode();
  if (effectiveTotalTokensReminderMode !== "padded-countdown" && effectiveTotalTokensReminderMode !== "off")
    return;
  if (
    effectiveTotalTokensReminderMode === "off" &&
    messages === undefined &&
    env.CLAUDE_CODE_RIPPLING_TULIP === undefined &&
    getConfiguredTotalTokensReminderMode() === "off"
  ) {
    logForDebugging(
      "[total_tokens reminder] off by CLAUDE_CODE_TOTAL_TOKENS_REMINDER/settings; not reading tengu_rippling_tulip for this subagent",
    );
    return;
  }
  let tagValue =
    messages === undefined
      ? getModelKeyedFlagValue("tengu_rippling_tulip", env.CLAUDE_CODE_RIPPLING_TULIP, model)
      : Number(messages.findLast((text) => TOTAL_TOKENS_TAG_RE.test(text))?.match(TOTAL_TOKENS_TAG_RE)?.[1]);
  if (typeof tagValue !== "number" || !Number.isSafeInteger(tagValue) || tagValue <= 0) return;
  if (effectiveTotalTokensReminderMode === "off" && messages === undefined) return tagValue;
  return tagValue < getTotalTokensReminderBudget() ? tagValue : undefined;
}
//@ chunk-5xgkngpb.js:2290185-2290294 placement
/**
 * 读取 tengu_calm_mochi 范围（forks、all 或 none）。
 */
function getCalmMochiScope() {
  let clientOrDefaultValue = getClientOrDefaultValue("tengu_calm_mochi", env.CLAUDE_CODE_CALM_MOCHI);
  return clientOrDefaultValue === "forks" || clientOrDefaultValue === "all" ? clientOrDefaultValue : "none";
}
//@ chunk-5xgkngpb.js:2290294-2290562 placement
/**
 * 判断剩余 token 提醒是否在用户回合后发送：环境变量 > 设置 > 客户端数据 > 开关。
 */
function shouldRemindAfterUserTurn() {
  let envValue = env.CLAUDE_CODE_TOTAL_TOKENS_REMINDER_AFTER_USER_TURN;
  if (envValue !== undefined) return envValue;
  let totalTokensReminderAfterUserTurn = getInitialSettings().totalTokensReminderAfterUserTurn;
  if (totalTokensReminderAfterUserTurn !== undefined) return totalTokensReminderAfterUserTurn;
  let clientValue = getCachedClientData()?.[TENGU_LAPIS_ANCHOR_USER_TURN];
  let isBooleanValue = typeof clientValue === "boolean";
  reportClientDataValue(
    TENGU_LAPIS_ANCHOR_USER_TURN,
    clientValue,
    isBooleanValue
      ? {
          userTurn: clientValue,
        }
      : undefined,
  );
  if (isBooleanValue) return clientValue;
  return getFeatureValue_CACHED_MAY_BE_STALE(TENGU_LAPIS_ANCHOR_USER_TURN, true);
}
//@ chunk-5xgkngpb.js:2290562-2290688 placement
/**
 * 生成 <total_tokens> 提醒标签（无限、固定或剩余数量）。
 */
function formatTotalTokensTag(mode, remainingTokens) {
  return `<total_tokens>${mode === "infinite" ? "Infinite" : mode === "fixed" ? FIXED_TOTAL_TOKENS : Math.max(0, remainingTokens)} tokens left</total_tokens>`;
}
//@ chunk-5xgkngpb.js:2290688-2290748 placement
/**
 * 匹配 “<total_tokens>N tokens left</total_tokens>” 文本。
 */
var TOTAL_TOKENS_TAG_RE = /^<total_tokens>(\d+) tokens left<\/total_tokens>$/;
export {
  formatTotalTokensTag,
  getTotalTokensReminderMode,
  getTotalTokensReminderBudget,
  shouldRemindAfterUserTurn,
  totalTokensReminderByRoot,
  ANY_MODEL_KEY,
  findModelKeyedEntry,
  getModelKeyedValue,
  rollOverTotalTokensContext,
  getClientOrDefaultValue,
  resolveTotalTokensReminderMode,
  getCalmMochiScope,
  getModelKeyedFlagValue,
};
