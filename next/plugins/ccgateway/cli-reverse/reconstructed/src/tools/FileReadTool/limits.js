/**
 * tools/FileReadTool/limits.ts
 *
 * Read 默认读取上限：256KB 与 25000 token（可由 CLAUDE_CODE_FILE_READ_MAX_OUTPUT_TOKENS 覆盖）
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/tools/FileReadTool/limits.ts
 * pieces: chunk-q7gky7a4.js (7)
 * attribution: placement 5, fingerprint 2
 */
import { FILE_READ_TOOL_NAME, ALLOW_LARGE_PARAM } from "./constants.js";
import { env } from "../../utils/env.js";
import { getSessionFeatureValues } from "../../bootstrap/sessionFeatureValues.js";
import { BOUNDED_READ_MAX } from "../../utils/fsSafety/atomicWriteStaging.js";
import { getFeatureValue_SESSION_PINNED } from "../../services/analytics/growthbook.js";
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-q7gky7a4.js:375-813 placement
/**
 * Read 默认 token 上限 25000，allow_large 三种提示文案，字符/token 比上限常量 128。
 */
var DEFAULT_MAX_OUTPUT_TOKENS = 25000;
var ALLOW_LARGE_RETRY_HINT = ` To read it anyway, up to what still fits in your context, call ${FILE_READ_TOOL_NAME} again with ${ALLOW_LARGE_PARAM}: true \u2014 only if you genuinely need all of it or the user asked for the whole file.`;
var ALLOW_LARGE_NO_ROOM_HINT = ` Even with ${ALLOW_LARGE_PARAM}, this is more than fits in the context you have left this turn (other large reads in the same turn share that room).`;
var ALLOW_LARGE_UNAVAILABLE_HINT = ` ${ALLOW_LARGE_PARAM} is not available where this read runs; read it in parts with offset and limit.`;
var MAX_CHARS_PER_TOKEN = 128;
//@ chunk-q7gky7a4.js:1174-1192 placement
var weakMap; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-q7gky7a4.js:1174", () => {
  weakMap = new WeakMap();
});
//@ chunk-q7gky7a4.js:1192-1221 placement
/**
 * 把某文件句柄对应的读取限制记入 WeakMap 缓存。
 */
function setCachedReadingLimit(output, limitText) {
  weakMap.set(output, limitText);
}
//@ chunk-q7gky7a4.js:1221-1253 placement
/**
 * 取出此前按文件句柄缓存的读取限制。
 */
function getCachedReadingLimit(output) {
  return weakMap.get(output);
}
//@ chunk-q7gky7a4.js:1253-1349 fingerprint = getEnvMaxTokens (1)
/**
 * 读取 CLAUDE_CODE_FILE_READ_MAX_OUTPUT_TOKENS（正数才生效）。
 */
function getEnvMaxTokens() {
  let override = env.CLAUDE_CODE_FILE_READ_MAX_OUTPUT_TOKENS;
  if (override !== undefined && override > 0) return override;
  return;
}
//@ chunk-q7gky7a4.js:1349-1475 fingerprint = getDefaultFileReadingLimits (0.676)
/**
 * 默认读取上限（缓存）：maxSizeBytes 256KB，maxTokens 取 CLAUDE_CODE_FILE_READ_MAX_OUTPUT_TOKENS 或 25000。
 */
function getDefaultFileReadingLimits() {
  let envMaxTokens = getSessionFeatureValues();
  envMaxTokens.defaultFileReadingLimits ??= {
    maxSizeBytes: BOUNDED_READ_MAX,
    maxTokens: getEnvMaxTokens() ?? DEFAULT_MAX_OUTPUT_TOKENS,
  };
  return envMaxTokens.defaultFileReadingLimits;
}
//@ chunk-q7gky7a4.js:1475-1525 placement
/**
 * 读取会话固定的 tengu_tab_read_sep 开关。
 */
function isTabReadSeparationEnabled() {
  return getFeatureValue_SESSION_PINNED("tengu_tab_read_sep", false);
}
export {
  getDefaultFileReadingLimits,
  DEFAULT_MAX_OUTPUT_TOKENS,
  isTabReadSeparationEnabled,
  setCachedReadingLimit,
  ALLOW_LARGE_UNAVAILABLE_HINT,
  ALLOW_LARGE_NO_ROOM_HINT,
  ALLOW_LARGE_RETRY_HINT,
  MAX_CHARS_PER_TOKEN,
  getCachedReadingLimit,
};
