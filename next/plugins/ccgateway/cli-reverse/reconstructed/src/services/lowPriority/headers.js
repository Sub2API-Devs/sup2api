/**
 * services/lowPriority/headers.ts
 *
 * 2.1.316 新增：低优先级模式请求头
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-vn3g7zt8.js (16)
 * attribution: placement 16
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { getFeatureValue_CACHED_MAY_BE_STALE } from "../analytics/growthbook.js";

//@ chunk-vn3g7zt8.js:185400-185443 placement
var ANTHROPIC_USAGE_LIMIT = "anthropic-usage-limit";
var SLOW = "slow";
//@ chunk-vn3g7zt8.js:185443-185498 placement
/**
 * 慢速预算重置的响应头名。
 */
var SLOW_BUDGET_RESET_HEADER = "anthropic-ratelimit-unified-slow-budget-reset";
//@ chunk-vn3g7zt8.js:185498-185616 placement
/**
 * 读取慢速优惠实验组响应头（treatment/control）。
 */
function getSlowOfferArm(headers) {
  let value = headers?.get("anthropic-ratelimit-unified-slow-offer");
  return value === "treatment" || value === "control" ? value : undefined;
}
//@ chunk-vn3g7zt8.js:185616-185882 placement
/**
 * 读取并校验慢速模式状态响应头（active、not_needed、slot_busy 等）。
 */
function getSlowStatusHeader(headers) {
  let value = headers?.get("anthropic-ratelimit-unified-slow-status");
  if (value === null || value === undefined) return;
  switch (value) {
    case "active":
    case "not_needed":
    case "slot_busy":
    case "weekly_limit":
    case "budget_exhausted":
    case "ineligible":
    case "off":
      return value;
    default:
      return "unrecognized";
  }
}
//@ chunk-vn3g7zt8.js:185882-186018 placement
function readNumericHeader(headers, name) {
  let raw = headers?.get(name);
  if (raw === null || raw === undefined || raw.trim() === "") return;
  let value = Number(raw);
  return Number.isFinite(value) && value >= 0 ? value : undefined;
}
//@ chunk-vn3g7zt8.js:186018-186094 placement
/**
 * 读慢速重试等待头（秒）。
 */
function getSlowRetryAfter(headers) {
  return readNumericHeader(headers, "anthropic-ratelimit-unified-slow-retry-after");
}
//@ chunk-vn3g7zt8.js:186094-186167 placement
/**
 * 读慢速最大等待头（秒）。
 */
function getSlowMaxWait(headers) {
  return readNumericHeader(headers, "anthropic-ratelimit-unified-slow-max-wait");
}
//@ chunk-vn3g7zt8.js:186167-186287 placement
/**
 * 读取慢速预算使用率响应头（上限为 1）。
 */
function getSlowBudgetUtilization(headers) {
  let numericHeader = readNumericHeader(headers, "anthropic-ratelimit-unified-slow-budget-utilization");
  return numericHeader === undefined ? undefined : Math.min(1, numericHeader);
}
//@ chunk-vn3g7zt8.js:186287-186550 placement
/**
 * 统一限流相关的响应头名：代表性额度、超额状态、超额禁用原因、超额作用域与超额使用中。
 */
var REPRESENTATIVE_CLAIM_HEADER = "anthropic-ratelimit-unified-representative-claim";
var OVERAGE_STATUS_HEADER = "anthropic-ratelimit-unified-overage-status";
var OVERAGE_DISABLED_REASON_HEADER = "anthropic-ratelimit-unified-overage-disabled-reason";
var OVERAGE_SCOPE_HEADER = "anthropic-ratelimit-unified-overage-scope";
var OVERAGE_IN_USE_HEADER = "anthropic-ratelimit-unified-overage-in-use";
//@ chunk-vn3g7zt8.js:186550-186715 placement
/**
 * 判断响应是否带统一限流头（代表性额度或超额状态）。
 */
function hasUnifiedRateLimitHeaders(error) {
  return Boolean(
    error.headers?.get?.("anthropic-ratelimit-unified-representative-claim") ||
    error.headers?.get?.("anthropic-ratelimit-unified-overage-status"),
  );
}
//@ chunk-vn3g7zt8.js:186715-187123 placement
/**
 * 冷却分钟数的上限（1440）。
 */
var TENGU_TOASTY_BREEZE = "tengu_toasty_breeze";
var LOW_PRIORITY = "low-priority";
var LOW_PRIORITY_COPY = {
  label: "Continue now at lower priority",
  noticeLine: `/${LOW_PRIORITY} to continue now at lower priority \xB7 uses your weekly limit`,
  statusLine: "Lower priority until {reset}",
  allowanceNote: "{percent} allowance left",
  waitBanner: "Working at lower priority \xB7 waiting for capacity",
  budgetExhaustedCopy: "You've used this week's lower-priority allowance",
};
var MIN_COOLOFF_MINUTES = 10;
var MAX_COOLOFF_MINUTES = 1440;
//@ chunk-vn3g7zt8.js:187123-187213 placement
/**
 * 读 tengu_toasty_breeze 配置（非对象时给空对象）。
 */
function getToastyBreezeConfig() {
  let featureValue_CACHED_MAY_BE_STALE = getFeatureValue_CACHED_MAY_BE_STALE(TENGU_TOASTY_BREEZE, {});
  return typeof featureValue_CACHED_MAY_BE_STALE === "object" &&
    featureValue_CACHED_MAY_BE_STALE !== null &&
    !Array.isArray(featureValue_CACHED_MAY_BE_STALE)
    ? featureValue_CACHED_MAY_BE_STALE
    : {};
}
//@ chunk-vn3g7zt8.js:187213-187253 placement
/**
 * 低优先级模式是否开启。
 */
function isLowPriorityEnabled() {
  return getToastyBreezeConfig().enabled === true;
}
//@ chunk-vn3g7zt8.js:187253-187338 placement
/**
 * 低优先级配置版本号（无效时 0）。
 */
function getLowPriorityConfigVersion() {
  let version = getToastyBreezeConfig().version;
  return typeof version === "number" && Number.isFinite(version) ? version : 0;
}
//@ chunk-vn3g7zt8.js:187708-187847 placement
/**
 * 计算低优先级模式的冷却时长（配置分钟数，限制范围后转为毫秒）。
 */
function getLowPriorityCooloffMs() {
  let cooloffMinutes = getToastyBreezeConfig().cooloffMinutes;
  let minutes =
    typeof cooloffMinutes === "number" && Number.isFinite(cooloffMinutes)
      ? Math.min(MAX_COOLOFF_MINUTES, Math.max(0, cooloffMinutes))
      : MIN_COOLOFF_MINUTES;
  return Math.round(minutes * 60000);
}
//@ chunk-vn3g7zt8.js:187847-187883 placement
/**
 * 空的挂起状态容器。
 */
function emptySuspendState() {
  return {
    current: null,
  };
}
export {
  emptySuspendState,
  ANTHROPIC_USAGE_LIMIT,
  SLOW,
  OVERAGE_STATUS_HEADER,
  OVERAGE_DISABLED_REASON_HEADER,
  hasUnifiedRateLimitHeaders,
  REPRESENTATIVE_CLAIM_HEADER,
  LOW_PRIORITY,
  isLowPriorityEnabled,
  getToastyBreezeConfig,
  LOW_PRIORITY_COPY,
  OVERAGE_IN_USE_HEADER,
  getSlowOfferArm,
  getSlowRetryAfter,
  getSlowMaxWait,
  OVERAGE_SCOPE_HEADER,
  getLowPriorityConfigVersion,
  getLowPriorityCooloffMs,
  getSlowBudgetUtilization,
  getSlowStatusHeader,
  SLOW_BUDGET_RESET_HEADER,
};
