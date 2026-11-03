/**
 * services/lowPriority/headers.ts
 *
 * 2.1.316 新增：低优先级模式请求头
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-hwmsct5x.js (16)
 * attribution: placement 16
 */
import { getFeatureValue_CACHED_MAY_BE_STALE } from "../analytics/growthbook.js";

//@ chunk-hwmsct5x.js:185012-185055 placement
var ANTHROPIC_USAGE_LIMIT = "anthropic-usage-limit";
var SLOW = "slow";
//@ chunk-hwmsct5x.js:185055-185110 placement
/**
 * 慢速预算重置的响应头名。
 */
var SLOW_BUDGET_RESET_HEADER = "anthropic-ratelimit-unified-slow-budget-reset";
//@ chunk-hwmsct5x.js:185110-185228 placement
/**
 * 读取慢速优惠实验组响应头（treatment/control）。
 */
function getSlowOfferArm(e) {
  let n = e?.get("anthropic-ratelimit-unified-slow-offer");
  return n === "treatment" || n === "control" ? n : undefined;
}
//@ chunk-hwmsct5x.js:185228-185494 placement
/**
 * 读取并校验慢速模式状态响应头（active、not_needed、slot_busy 等）。
 */
function getSlowStatusHeader(e) {
  let n = e?.get("anthropic-ratelimit-unified-slow-status");
  if (n === null || n === undefined) return;
  switch (n) {
    case "active":
    case "not_needed":
    case "slot_busy":
    case "weekly_limit":
    case "budget_exhausted":
    case "ineligible":
    case "off":
      return n;
    default:
      return "unrecognized";
  }
}
//@ chunk-hwmsct5x.js:185494-185630 placement
function readNumericHeader(e, n) {
  let r = e?.get(n);
  if (r === null || r === undefined || r.trim() === "") return;
  let s = Number(r);
  return Number.isFinite(s) && s >= 0 ? s : undefined;
}
//@ chunk-hwmsct5x.js:185630-185706 placement
/**
 * 读慢速重试等待头（秒）。
 */
function getSlowRetryAfter(e) {
  return readNumericHeader(e, "anthropic-ratelimit-unified-slow-retry-after");
}
//@ chunk-hwmsct5x.js:185706-185779 placement
/**
 * 读慢速最大等待头（秒）。
 */
function getSlowMaxWait(e) {
  return readNumericHeader(e, "anthropic-ratelimit-unified-slow-max-wait");
}
//@ chunk-hwmsct5x.js:185779-185899 placement
/**
 * 读取慢速预算使用率响应头（上限为 1）。
 */
function getSlowBudgetUtilization(e) {
  let numericHeader = readNumericHeader(e, "anthropic-ratelimit-unified-slow-budget-utilization");
  return numericHeader === undefined ? undefined : Math.min(1, numericHeader);
}
//@ chunk-hwmsct5x.js:185899-186162 placement
/**
 * 统一限流相关的响应头名：代表性额度、超额状态、超额禁用原因、超额作用域与超额使用中。
 */
var REPRESENTATIVE_CLAIM_HEADER = "anthropic-ratelimit-unified-representative-claim";
var OVERAGE_STATUS_HEADER = "anthropic-ratelimit-unified-overage-status";
var OVERAGE_DISABLED_REASON_HEADER = "anthropic-ratelimit-unified-overage-disabled-reason";
var OVERAGE_SCOPE_HEADER = "anthropic-ratelimit-unified-overage-scope";
var OVERAGE_IN_USE_HEADER = "anthropic-ratelimit-unified-overage-in-use";
//@ chunk-hwmsct5x.js:186162-186327 placement
/**
 * 判断响应是否带统一限流头（代表性额度或超额状态）。
 */
function hasUnifiedRateLimitHeaders(e) {
  return Boolean(
    e.headers?.get?.("anthropic-ratelimit-unified-representative-claim") ||
    e.headers?.get?.("anthropic-ratelimit-unified-overage-status"),
  );
}
//@ chunk-hwmsct5x.js:186327-186735 placement
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
//@ chunk-hwmsct5x.js:186735-186825 placement
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
//@ chunk-hwmsct5x.js:186825-186865 placement
/**
 * 低优先级模式是否开启。
 */
function isLowPriorityEnabled() {
  return getToastyBreezeConfig().enabled === true;
}
//@ chunk-hwmsct5x.js:186865-186950 placement
/**
 * 低优先级配置版本号（无效时 0）。
 */
function getLowPriorityConfigVersion() {
  let version = getToastyBreezeConfig().version;
  return typeof version === "number" && Number.isFinite(version) ? version : 0;
}
//@ chunk-hwmsct5x.js:187320-187459 placement
/**
 * 计算低优先级模式的冷却时长（配置分钟数，限制范围后转为毫秒）。
 */
function getLowPriorityCooloffMs() {
  let cooloffMinutes = getToastyBreezeConfig().cooloffMinutes;
  let n =
    typeof cooloffMinutes === "number" && Number.isFinite(cooloffMinutes)
      ? Math.min(MAX_COOLOFF_MINUTES, Math.max(0, cooloffMinutes))
      : MIN_COOLOFF_MINUTES;
  return Math.round(n * 60000);
}
//@ chunk-hwmsct5x.js:187459-187495 placement
/**
 * 空的挂起状态容器。
 */
function emptySuspendState() {
  return {
    current: null,
  };
}
export {
  OVERAGE_STATUS_HEADER,
  OVERAGE_IN_USE_HEADER,
  REPRESENTATIVE_CLAIM_HEADER,
  OVERAGE_DISABLED_REASON_HEADER,
  getSlowOfferArm,
  getSlowRetryAfter,
  getSlowMaxWait,
  OVERAGE_SCOPE_HEADER,
  getToastyBreezeConfig,
  LOW_PRIORITY_COPY,
  LOW_PRIORITY,
  emptySuspendState,
  ANTHROPIC_USAGE_LIMIT,
  SLOW,
  isLowPriorityEnabled,
  getLowPriorityConfigVersion,
  hasUnifiedRateLimitHeaders,
  getLowPriorityCooloffMs,
  getSlowBudgetUtilization,
  getSlowStatusHeader,
  SLOW_BUDGET_RESET_HEADER,
};
