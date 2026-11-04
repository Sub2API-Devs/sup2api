/**
 * utils/cachePaths.ts
 *
 * 缓存目录（env-paths 'claude-cli'）：errors、messages、mcp-logs-<server> 等子路径，路径段清洗（非字母数字→'-'，超长截断加 hash）。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/utils/cachePaths.ts
 * pieces: chunk-8gzm4s8j.js (1), chunk-bbtre4r8.js (5)
 * attribution: fingerprint 2, affinity 1, placement 3
 */
import { join } from "path";
import { envPaths } from "../../vendor/env-paths/index.js";
import { hashString31 } from "./pastedContent.js";
import { getFsImplementation } from "./fsOperations.js";
import { getOriginalCwd } from "../bootstrap/state.js";
import { deferInit } from "../../runtime/deferred-init.js";

//@ chunk-bbtre4r8.js:11586-11614 affinity (2.1.88 match: paths, 1)
/**
 * 缓存目录名的最大长度（200）。
 */
var CLAUDE_CLI_ENV_PATHS; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
var MAX_CACHE_DIR_NAME_CHARS;
deferInit("chunk-bbtre4r8.js:11586", () => {
  CLAUDE_CLI_ENV_PATHS = envPaths("claude-cli");
  MAX_CACHE_DIR_NAME_CHARS = 200;
});
//@ chunk-bbtre4r8.js:11614-11746 placement
function sanitizePathSegment(name) {
  let sanitized = name.replace(/[^a-zA-Z0-9]/g, "-");
  if (sanitized.length <= MAX_CACHE_DIR_NAME_CHARS) return sanitized;
  return `${sanitized.slice(0, MAX_CACHE_DIR_NAME_CHARS)}-${Math.abs(hashString31(name)).toString(36)}`;
}
//@ chunk-bbtre4r8.js:11746-11802 placement
function getCwdSafe() {
  try {
    return getFsImplementation().cwd();
  } catch {
    return getOriginalCwd();
  }
}
//@ chunk-bbtre4r8.js:11802-11842 placement
/**
 * 返回当前工作目录对应的缓存根目录。
 */
function cacheBaseDir() {
  return join(CLAUDE_CLI_ENV_PATHS.cache, sanitizePathSegment(getCwdSafe()));
}
//@ chunk-bbtre4r8.js:11842-11935 fingerprint (2.1.88 match: CACHE_PATHS, 0.845)
/**
 * 缓存目录（env-paths claude-cli）：errors、messages、mcp-logs-<server> 等子目录。
 */
var CACHE_PATHS = {
  baseLogs: () => cacheBaseDir(),
  errors: () => join(cacheBaseDir(), "errors"),
  mcpLogs: (serverName) => join(cacheBaseDir(), `mcp-logs-${sanitizePathSegment(serverName)}`),
};
//@ chunk-8gzm4s8j.js:389-410 fingerprint (2.1.88 match: paths, 1)
var paths = "claude-cli";
export { CACHE_PATHS, getCwdSafe, paths };
