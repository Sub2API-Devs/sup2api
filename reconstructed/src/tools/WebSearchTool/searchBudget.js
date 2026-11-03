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
  let { getFeatureValue_CACHED_MAY_BE_STALE } = require("./chunk-6df1d6re.js");
  let featureValue_CACHED_MAY_BE_STALE = getFeatureValue_CACHED_MAY_BE_STALE(
    TENGU_MEMOIZED_TURTLE,
    DEFAULT_HOURLY_REFILLS,
  );
  let s =
    typeof featureValue_CACHED_MAY_BE_STALE === "string" && /^\d+$/.test(featureValue_CACHED_MAY_BE_STALE)
      ? Number(featureValue_CACHED_MAY_BE_STALE)
      : featureValue_CACHED_MAY_BE_STALE;
  if (typeof s === "number" && Number.isInteger(s) && s >= 0 && s <= MAX_HOURLY_REFILLS) return s;
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
  let r = 0;
  let o = 0;
  let s = now();
  let a = webSearchRefillsPerHour({
    refillsByDefault,
  });
  function u() {
    let h = now();
    let p = webSearchRefillsPerHour({
      refillsByDefault,
    });
    let min = Math.min(p, a);
    a = p;
    let max = Math.max(0, h - s);
    s = h;
    if (r === 0) {
      o = 0;
      return;
    }
    o += max * min;
    let floored = Math.floor(o / REFILL_PERIOD_MS);
    if (floored >= r) {
      r = 0;
      o = 0;
      return;
    }
    r -= floored;
    o -= floored * REFILL_PERIOD_MS;
  }
  return {
    tryConsume() {
      u();
      if (r >= maxWebSearchesPerSession()) return false;
      r++;
      return true;
    },
    msUntilNextCall() {
      u();
      let h = r - maxWebSearchesPerSession();
      if (h < 0) return 0;
      if (a === 0) return 1 / 0;
      let p = (h + 1) * REFILL_PERIOD_MS - o;
      return Math.max(1, Math.ceil(p / a));
    },
    refillsPerHour() {
      return a;
    },
  };
}
export { createWebSearchBudget, maxWebSearchesPerSession };
