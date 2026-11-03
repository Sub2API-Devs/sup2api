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
import { f } from "../../vendor/env-paths/index.js";
import { zhe } from "./pastedContent.js";
import { getFsImplementation } from "./fsOperations.js";
import { getOriginalCwd } from "../bootstrap/state.js";

//@ chunk-bbtre4r8.js:11586-11614 affinity = paths (1)
var CLAUDE_CLI_ENV_PATHS = f("claude-cli"),
  O = 200;
//@ chunk-bbtre4r8.js:11614-11746 placement
function sanitizePathSegment(t) {
  let replaced = t.replace(/[^a-zA-Z0-9]/g, "-");
  if (replaced.length <= O) return replaced;
  return `${replaced.slice(0, O)}-${Math.abs(zhe(t)).toString(36)}`;
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
function y() {
  return join(CLAUDE_CLI_ENV_PATHS.cache, sanitizePathSegment(getCwdSafe()));
}
/**
 * 缓存目录（env-paths claude-cli）：errors、messages、mcp-logs-<server> 等子目录。
 */
//@ chunk-bbtre4r8.js:11842-11935 fingerprint = CACHE_PATHS (0.845)
var CACHE_PATHS = {
  baseLogs: () => y(),
  errors: () => join(y(), "errors"),
  mcpLogs: (t) => join(y(), `mcp-logs-${sanitizePathSegment(t)}`),
};
//@ chunk-8gzm4s8j.js:389-410 fingerprint = paths (1)
var paths = "claude-cli";

export { CACHE_PATHS, getCwdSafe, paths };
