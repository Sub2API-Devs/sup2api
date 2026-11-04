/**
 * utils/timeouts.ts
 *
 * Bash 工具默认/最大超时（BASH_DEFAULT_TIMEOUT_MS / BASH_MAX_TIMEOUT_MS，默认 2 分钟 / 10 分钟）
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/utils/timeouts.ts
 * pieces: chunk-4khf94hy.js (9)
 * attribution: affinity 1, fingerprint 2, placement 6
 */
import { parseIntLoose } from "./envUtils.js";

//@ chunk-4khf94hy.js:227-249 affinity
var DEFAULT_TIMEOUT_MS = 120000;
var MAX_BASH_TIMEOUT_MS = 600000;
//@ chunk-4khf94hy.js:249-363 fingerprint = getDefaultBashTimeoutMs (1)
function getDefaultBashTimeoutMs(env = process.env) {
  let envValue = env.BASH_DEFAULT_TIMEOUT_MS;
  if (envValue) {
    let parsed = parseIntLoose(envValue);
    if (!isNaN(parsed) && parsed > 0) return parsed;
  }
  return DEFAULT_TIMEOUT_MS;
}
//@ chunk-4khf94hy.js:363-507 fingerprint = getMaxBashTimeoutMs (1)
function getMaxBashTimeoutMs(env = process.env) {
  let envValue = env.BASH_MAX_TIMEOUT_MS;
  if (envValue) {
    let parsed = parseIntLoose(envValue);
    if (!isNaN(parsed) && parsed > 0) return Math.max(parsed, getDefaultBashTimeoutMs(env));
  }
  return Math.max(MAX_BASH_TIMEOUT_MS, getDefaultBashTimeoutMs(env));
}
//@ chunk-4khf94hy.js:507-535 placement
/**
 * 后台任务默认与最大超时（30 分钟 / 2 小时）。
 */
var DEFAULT_BACKGROUND_TIMEOUT_MS = 1800000;
var MAX_BACKGROUND_TIMEOUT_MS = 7200000;
//@ chunk-4khf94hy.js:535-597 placement
/**
 * 把毫秒数夹到 [Bash 最大超时, 2^31-1]。
 */
function clampToMaxTimerDelay(backgroundLimitFlag) {
  return Math.min(Math.max(backgroundLimitFlag, getMaxBashTimeoutMs()), 2147483647);
}
//@ chunk-4khf94hy.js:597-641 placement
/**
 * 取请求值与默认 Bash 超时中的较大者。
 */
function atLeastDefaultTimeout(backgroundLimitFlag, env) {
  return Math.max(backgroundLimitFlag, getDefaultBashTimeoutMs(env));
}
//@ chunk-4khf94hy.js:641-691 placement
/**
 * 仅当请求超时为正数时才返回它。
 */
function timeoutWhenPositive(timeout, positiveValue) {
  return timeout !== undefined && timeout > 0 ? positiveValue : undefined;
}
//@ chunk-4khf94hy.js:691-702 placement
var MIN_SHELL_TIMEOUT_MS = 2000;
//@ chunk-4khf94hy.js:702-939 placement
/**
 * 计算可自动转后台的 shell 命令的实际超时：主代理用环境变量，子代理用上限，取请求值与该值（不低于最小值）的较小者。
 */
function effectiveShellTimeoutMs({
  requestedTimeoutMs,
  isMainAgent,
  canAutoBackground,
  subagentCapMs = 0,
  env = process.env,
}) {
  if (!canAutoBackground) return requestedTimeoutMs;
  let autoBackgroundMs = isMainAgent
    ? parseIntLoose(env.CLAUDE_CODE_AUTO_BACKGROUND_TIMEOUT_MS)
    : subagentCapMs;
  if (isNaN(autoBackgroundMs) || autoBackgroundMs <= 0) return requestedTimeoutMs;
  return Math.min(requestedTimeoutMs, Math.max(autoBackgroundMs, MIN_SHELL_TIMEOUT_MS));
}
export {
  getMaxBashTimeoutMs,
  effectiveShellTimeoutMs,
  timeoutWhenPositive,
  getDefaultBashTimeoutMs,
  atLeastDefaultTimeout,
  DEFAULT_BACKGROUND_TIMEOUT_MS,
  clampToMaxTimerDelay,
  MAX_BACKGROUND_TIMEOUT_MS,
};
