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
var ANTHROPIC_USAGE_LIMIT = "anthropic-usage-limit",
  SLOW = "slow";
//@ chunk-hwmsct5x.js:185055-185110 placement
var Hd = "anthropic-ratelimit-unified-slow-budget-reset";
/**
 * 读取慢速优惠实验组响应头（treatment/control）。
 */
//@ chunk-hwmsct5x.js:185110-185228 placement
function getSlowOfferArm(e) {
  let n = e?.get("anthropic-ratelimit-unified-slow-offer");
  return n === "treatment" || n === "control" ? n : void 0;
}
/**
 * 读取并校验慢速模式状态响应头（active、not_needed、slot_busy 等）。
 */
//@ chunk-hwmsct5x.js:185228-185494 placement
function getSlowStatusHeader(e) {
  let n = e?.get("anthropic-ratelimit-unified-slow-status");
  if (n === null || n === void 0) return;
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
  if (r === null || r === void 0 || r.trim() === "") return;
  let s = Number(r);
  return Number.isFinite(s) && s >= 0 ? s : void 0;
}
//@ chunk-hwmsct5x.js:185630-185706 placement
function N8r(e) {
  return readNumericHeader(e, "anthropic-ratelimit-unified-slow-retry-after");
}
//@ chunk-hwmsct5x.js:185706-185779 placement
function $8r(e) {
  return readNumericHeader(e, "anthropic-ratelimit-unified-slow-max-wait");
}
/**
 * 读取慢速预算使用率响应头（上限为 1）。
 */
//@ chunk-hwmsct5x.js:185779-185899 placement
function getSlowBudgetUtilization(e) {
  let n = readNumericHeader(e, "anthropic-ratelimit-unified-slow-budget-utilization");
  return n === void 0 ? void 0 : Math.min(1, n);
}
/**
 * 统一限流相关的响应头名：代表性额度、超额状态、超额禁用原因、超额作用域与超额使用中。
 */
//@ chunk-hwmsct5x.js:185899-186162 placement
var REPRESENTATIVE_CLAIM_HEADER = "anthropic-ratelimit-unified-representative-claim",
  OVERAGE_STATUS_HEADER = "anthropic-ratelimit-unified-overage-status",
  OVERAGE_DISABLED_REASON_HEADER = "anthropic-ratelimit-unified-overage-disabled-reason",
  OVERAGE_SCOPE_HEADER = "anthropic-ratelimit-unified-overage-scope",
  OVERAGE_IN_USE_HEADER = "anthropic-ratelimit-unified-overage-in-use";
/**
 * 判断响应是否带统一限流头（代表性额度或超额状态）。
 */
//@ chunk-hwmsct5x.js:186162-186327 placement
function hasUnifiedRateLimitHeaders(e) {
  return Boolean(
    e.headers?.get?.("anthropic-ratelimit-unified-representative-claim") ||
    e.headers?.get?.("anthropic-ratelimit-unified-overage-status"),
  );
}
//@ chunk-hwmsct5x.js:186327-186735 placement
var TENGU_TOASTY_BREEZE = "tengu_toasty_breeze",
  LOW_PRIORITY = "low-priority",
  jn = {
    label: "Continue now at lower priority",
    noticeLine: `/${LOW_PRIORITY} to continue now at lower priority \xB7 uses your weekly limit`,
    statusLine: "Lower priority until {reset}",
    allowanceNote: "{percent} allowance left",
    waitBanner: "Working at lower priority \xB7 waiting for capacity",
    budgetExhaustedCopy: "You've used this week's lower-priority allowance",
  },
  a_ = 10,
  l_ = 1440;
//@ chunk-hwmsct5x.js:186735-186825 placement
function pi() {
  let e = getFeatureValue_CACHED_MAY_BE_STALE(TENGU_TOASTY_BREEZE, {});
  return typeof e === "object" && e !== null && !Array.isArray(e) ? e : {};
}
//@ chunk-hwmsct5x.js:186825-186865 placement
function iAt() {
  return pi().enabled === !0;
}
//@ chunk-hwmsct5x.js:186865-186950 placement
function vEn() {
  let version = pi().version;
  return typeof version === "number" && Number.isFinite(version) ? version : 0;
}
/**
 * 计算低优先级模式的冷却时长（配置分钟数，限制范围后转为毫秒）。
 */
//@ chunk-hwmsct5x.js:187320-187459 placement
function getLowPriorityCooloffMs() {
  let cooloffMinutes = pi().cooloffMinutes,
    n =
      typeof cooloffMinutes === "number" && Number.isFinite(cooloffMinutes)
        ? Math.min(l_, Math.max(0, cooloffMinutes))
        : a_;
  return Math.round(n * 60000);
}
//@ chunk-hwmsct5x.js:187459-187495 placement
function F8r() {
  return { current: null };
}

export {
  OVERAGE_STATUS_HEADER,
  OVERAGE_IN_USE_HEADER,
  REPRESENTATIVE_CLAIM_HEADER,
  OVERAGE_DISABLED_REASON_HEADER,
  getSlowOfferArm,
  N8r,
  $8r,
  OVERAGE_SCOPE_HEADER,
  pi,
  jn,
  LOW_PRIORITY,
  F8r,
  ANTHROPIC_USAGE_LIMIT,
  SLOW,
  iAt,
  vEn,
  hasUnifiedRateLimitHeaders,
  getLowPriorityCooloffMs,
  getSlowBudgetUtilization,
  getSlowStatusHeader,
  Hd,
};
