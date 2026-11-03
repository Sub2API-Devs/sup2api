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
var ko = 200,
  tt = 100,
  TENGU_MEMOIZED_TURTLE = "tengu_memoized_turtle",
  hn = 3600;
//@ chunk-6vnxsn99.js:62375-62444 placement
function maxWebSearchesPerSession() {
  return env.CLAUDE_CODE_MAX_WEB_SEARCHES_PER_SESSION ?? ko;
}
//@ chunk-6vnxsn99.js:62444-62917 placement
function webSearchRefillsPerHour({ refillsByDefault: refillsByDefault }) {
  let CLAUDE_CODE_WEB_SEARCH_REFILLS_PER_HOUR = env.CLAUDE_CODE_WEB_SEARCH_REFILLS_PER_HOUR;
  if (CLAUDE_CODE_WEB_SEARCH_REFILLS_PER_HOUR !== void 0) return CLAUDE_CODE_WEB_SEARCH_REFILLS_PER_HOUR;
  if (!refillsByDefault) return 0;
  let {
      getFeatureValue_CACHED_MAY_BE_STALE: getFeatureValue_CACHED_MAY_BE_STALE,
    } = require("./chunk-6df1d6re.js"),
    o = getFeatureValue_CACHED_MAY_BE_STALE(TENGU_MEMOIZED_TURTLE, tt),
    s = typeof o === "string" && /^\d+$/.test(o) ? Number(o) : o;
  if (typeof s === "number" && Number.isInteger(s) && s >= 0 && s <= hn) return s;
  return (
    logForDebugging(
      `WebSearch budget: ignoring the served ${TENGU_MEMOIZED_TURTLE} value ${jsonStringify(o)} (not an integer from 0 to ${hn}); using ${tt} refills per hour`,
      { level: "warn" },
    ),
    tt
  );
}
//@ chunk-6vnxsn99.js:62917-62932 placement
var nt = 3600000;
/**
 * 会话级 WebSearch 次数预算（令牌桶）：上限 CLAUDE_CODE_MAX_WEB_SEARCHES_PER_SESSION，每小时按配置回填。
 */
//@ chunk-6vnxsn99.js:62932-63428 placement
function createWebSearchBudget({ refillsByDefault: refillsByDefault, now: now = () => Date.now() }) {
  let r = 0,
    o = 0,
    s = now(),
    a = webSearchRefillsPerHour({ refillsByDefault: refillsByDefault });
  function u() {
    let h = now(),
      p = webSearchRefillsPerHour({ refillsByDefault: refillsByDefault }),
      min = Math.min(p, a);
    a = p;
    let max = Math.max(0, h - s);
    if (((s = h), r === 0)) {
      o = 0;
      return;
    }
    o += max * min;
    let floored = Math.floor(o / nt);
    if (floored >= r) {
      ((r = 0), (o = 0));
      return;
    }
    ((r -= floored), (o -= floored * nt));
  }
  return {
    tryConsume() {
      if ((u(), r >= maxWebSearchesPerSession())) return !1;
      return (r++, !0);
    },
    msUntilNextCall() {
      u();
      let h = r - maxWebSearchesPerSession();
      if (h < 0) return 0;
      if (a === 0) return 1 / 0;
      let p = (h + 1) * nt - o;
      return Math.max(1, Math.ceil(p / a));
    },
    refillsPerHour() {
      return a;
    },
  };
}

export { createWebSearchBudget, maxWebSearchesPerSession };
