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
var DEFAULT_TIMEOUT_MS = 120000,
  s = 600000;
//@ chunk-4khf94hy.js:249-363 fingerprint = getDefaultBashTimeoutMs (1)
function getDefaultBashTimeoutMs(env = process.env) {
  let envValue = env.BASH_DEFAULT_TIMEOUT_MS;
  if (envValue) {
    let t = parseIntLoose(envValue);
    if (!isNaN(t) && t > 0) return t;
  }
  return DEFAULT_TIMEOUT_MS;
}
//@ chunk-4khf94hy.js:363-507 fingerprint = getMaxBashTimeoutMs (1)
function getMaxBashTimeoutMs(env = process.env) {
  let envValue = env.BASH_MAX_TIMEOUT_MS;
  if (envValue) {
    let t = parseIntLoose(envValue);
    if (!isNaN(t) && t > 0) return Math.max(t, getDefaultBashTimeoutMs(env));
  }
  return Math.max(s, getDefaultBashTimeoutMs(env));
}
//@ chunk-4khf94hy.js:507-535 placement
var Ssi = 1800000,
  _5r = 7200000;
//@ chunk-4khf94hy.js:535-597 placement
function wsi(n) {
  return Math.min(Math.max(n, getMaxBashTimeoutMs()), 2147483647);
}
//@ chunk-4khf94hy.js:597-641 placement
function Esi(n, e) {
  return Math.max(n, getDefaultBashTimeoutMs(e));
}
//@ chunk-4khf94hy.js:641-691 placement
function EVt(n, e) {
  return n !== void 0 && n > 0 ? e : void 0;
}
//@ chunk-4khf94hy.js:691-702 placement
var i = 2000;
/**
 * 计算可自动转后台的 shell 命令的实际超时：主代理用环境变量，子代理用上限，取请求值与该值（不低于最小值）的较小者。
 */
//@ chunk-4khf94hy.js:702-939 placement
function effectiveShellTimeoutMs({
  requestedTimeoutMs: requestedTimeoutMs,
  isMainAgent: isMainAgent,
  canAutoBackground: canAutoBackground,
  subagentCapMs: subagentCapMs = 0,
  env: env = process.env,
}) {
  if (!canAutoBackground) return requestedTimeoutMs;
  let r = isMainAgent ? parseIntLoose(env.CLAUDE_CODE_AUTO_BACKGROUND_TIMEOUT_MS) : subagentCapMs;
  if (isNaN(r) || r <= 0) return requestedTimeoutMs;
  return Math.min(requestedTimeoutMs, Math.max(r, i));
}

export { getMaxBashTimeoutMs, effectiveShellTimeoutMs, EVt, getDefaultBashTimeoutMs, Esi, Ssi, wsi, _5r };
