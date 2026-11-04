/**
 * tools/WebSearchTool/searchBudget.ts
 *
 * 2.1.316 新增：会话级 WebSearch 次数预算。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-6vnxsn99.js (5)
 * attribution: placement 5
 */
import { env } from "../../utils/env.js";
import { logForDebugging } from "../../utils/debug.js";
import { jsonStringify } from "../../utils/slowOperations.js";

//@ chunk-6vnxsn99.js:62322-62375 placement
/**
 * 每会话 WebSearch 次数的默认上限（200）。
 */
var DEFAULT_MAX_WEB_SEARCHES = 200;
var DEFAULT_HOURLY_REFILLS = 100;
var TENGU_MEMOIZED_TURTLE = "tengu_memoized_turtle";
var MAX_HOURLY_REFILLS = 3600;
//@ chunk-6vnxsn99.js:62375-62444 placement
function maxWebSearchesPerSession() {
  return env.CLAUDE_CODE_MAX_WEB_SEARCHES_PER_SESSION ?? DEFAULT_MAX_WEB_SEARCHES;
}
//@ chunk-6vnxsn99.js:62444-62917 placement
function webSearchRefillsPerHour({ refillsByDefault }) {
  let CLAUDE_CODE_WEB_SEARCH_REFILLS_PER_HOUR = env.CLAUDE_CODE_WEB_SEARCH_REFILLS_PER_HOUR;
  if (CLAUDE_CODE_WEB_SEARCH_REFILLS_PER_HOUR !== undefined) return CLAUDE_CODE_WEB_SEARCH_REFILLS_PER_HOUR;
  if (!refillsByDefault) return 0;
  let {
    getFeatureValue_CACHED_MAY_BE_STALE,
  } = require("../../services/analytics/ATIS_REQUEST_HEADER.lazy.js");
  let featureValue_CACHED_MAY_BE_STALE = getFeatureValue_CACHED_MAY_BE_STALE(
    TENGU_MEMOIZED_TURTLE,
    DEFAULT_HOURLY_REFILLS,
  );
  let featureValue =
    typeof featureValue_CACHED_MAY_BE_STALE === "string" && /^\d+$/.test(featureValue_CACHED_MAY_BE_STALE)
      ? Number(featureValue_CACHED_MAY_BE_STALE)
      : featureValue_CACHED_MAY_BE_STALE;
  if (
    typeof featureValue === "number" &&
    Number.isInteger(featureValue) &&
    featureValue >= 0 &&
    featureValue <= MAX_HOURLY_REFILLS
  )
    return featureValue;
  logForDebugging(
    `WebSearch budget: ignoring the served ${TENGU_MEMOIZED_TURTLE} value ${jsonStringify(featureValue_CACHED_MAY_BE_STALE)} (not an integer from 0 to ${MAX_HOURLY_REFILLS}); using ${DEFAULT_HOURLY_REFILLS} refills per hour`,
    {
      level: "warn",
    },
  );
  return DEFAULT_HOURLY_REFILLS;
}
//@ chunk-6vnxsn99.js:62917-62932 placement
/**
 * 回填周期（1 小时）。
 */
var REFILL_PERIOD_MS = 3600000;
//@ chunk-6vnxsn99.js:62932-63428 placement
/**
 * 会话级 WebSearch 次数预算（令牌桶）：上限 CLAUDE_CODE_MAX_WEB_SEARCHES_PER_SESSION，每小时按配置回填。
 */
function createWebSearchBudget({ refillsByDefault, now = () => Date.now() }) {
  let consumed = 0;
  let accruedMs = 0;
  let lastTickMs = now();
  let refillsPerHourValue = webSearchRefillsPerHour({
    refillsByDefault,
  });
  function refill() {
    let nowMs = now();
    let currentPerHour = webSearchRefillsPerHour({
      refillsByDefault,
    });
    let min = Math.min(currentPerHour, refillsPerHourValue);
    refillsPerHourValue = currentPerHour;
    let max = Math.max(0, nowMs - lastTickMs);
    lastTickMs = nowMs;
    if (consumed === 0) {
      accruedMs = 0;
      return;
    }
    accruedMs += max * min;
    let floored = Math.floor(accruedMs / REFILL_PERIOD_MS);
    if (floored >= consumed) {
      consumed = 0;
      accruedMs = 0;
      return;
    }
    consumed -= floored;
    accruedMs -= floored * REFILL_PERIOD_MS;
  }
  return {
    tryConsume() {
      refill();
      if (consumed >= maxWebSearchesPerSession()) return false;
      consumed++;
      return true;
    },
    msUntilNextCall() {
      refill();
      let overCount = consumed - maxWebSearchesPerSession();
      if (overCount < 0) return 0;
      if (refillsPerHourValue === 0) return 1 / 0;
      let waitMs = (overCount + 1) * REFILL_PERIOD_MS - accruedMs;
      return Math.max(1, Math.ceil(waitMs / refillsPerHourValue));
    },
    refillsPerHour() {
      return refillsPerHourValue;
    },
  };
}
export { createWebSearchBudget, maxWebSearchesPerSession };
