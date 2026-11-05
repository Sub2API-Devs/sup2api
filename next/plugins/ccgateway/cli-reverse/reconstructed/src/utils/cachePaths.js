/**
 * utils/cachePaths.ts
 *
 * 缓存目录（env-paths 'claude-cli'）：errors、messages、mcp-logs-<server> 等子路径，路径段清洗（非字母数字→'-'，超长截断加 hash）。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/utils/cachePaths.ts
 * pieces: chunk-6xpnm08k.js (1), chunk-my2r02mp.js (5)
 * attribution: fingerprint 2, affinity 1, placement 3
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { join } from "path";
import { envPaths } from "../../vendor/env-paths/index.js";
import { hashString31 } from "./pastedContent.js";
import { getFsImplementation } from "./fsOperations.js";
import { getOriginalCwd } from "../bootstrap/state.js";
import { deferInit } from "../../runtime/deferred-init.js";

//@ chunk-my2r02mp.js:11736-11764 affinity (2.1.88 match: paths, 1)
/**
 * 缓存目录名的最大长度（200）。
 */
var CLAUDE_CLI_ENV_PATHS; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
var MAX_CACHE_DIR_NAME_CHARS;
deferInit("chunk-my2r02mp.js:11736", () => {
  CLAUDE_CLI_ENV_PATHS = envPaths("claude-cli");
  MAX_CACHE_DIR_NAME_CHARS = 200;
});
//@ chunk-my2r02mp.js:11764-11896 placement
function sanitizePathSegment(name) {
  let sanitized = name.replace(/[^a-zA-Z0-9]/g, "-");
  if (sanitized.length <= MAX_CACHE_DIR_NAME_CHARS) return sanitized;
  return `${sanitized.slice(0, MAX_CACHE_DIR_NAME_CHARS)}-${Math.abs(hashString31(name)).toString(36)}`;
}
//@ chunk-my2r02mp.js:11896-11952 placement
function getCwdSafe() {
  try {
    return getFsImplementation().cwd();
  } catch {
    return getOriginalCwd();
  }
}
//@ chunk-my2r02mp.js:11952-11992 placement
/**
 * 返回当前工作目录对应的缓存根目录。
 */
function cacheBaseDir() {
  return join(CLAUDE_CLI_ENV_PATHS.cache, sanitizePathSegment(getCwdSafe()));
}
//@ chunk-my2r02mp.js:11992-12085 fingerprint (2.1.88 match: CACHE_PATHS, 0.845)
/**
 * 缓存目录（env-paths claude-cli）：errors、messages、mcp-logs-<server> 等子目录。
 */
var CACHE_PATHS = {
  baseLogs: () => cacheBaseDir(),
  errors: () => join(cacheBaseDir(), "errors"),
  mcpLogs: (serverName) => join(cacheBaseDir(), `mcp-logs-${sanitizePathSegment(serverName)}`),
};
//@ chunk-6xpnm08k.js:422-443 fingerprint (2.1.88 match: paths, 1)
var paths = "claude-cli";
export { CACHE_PATHS, getCwdSafe, paths };
