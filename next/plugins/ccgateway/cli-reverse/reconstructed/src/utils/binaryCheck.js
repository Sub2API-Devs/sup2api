/**
 * utils/binaryCheck.ts
 *
 * 检查某命令行程序是否已安装（which + 缓存）
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/utils/binaryCheck.ts
 * pieces: chunk-18hwfzwa.js (1)
 * attribution: fingerprint 1
 */
import { logForDebugging } from "./debug.js";
import { SAFE_PATH_RE, installedSummaries } from "../hooks/useAwaySummary.js";
import { whichAsync } from "./which.js";

//@ chunk-18hwfzwa.js:1797785-1798239 fingerprint (2.1.88 match: isBinaryInstalled, 0.836)
async function isBinaryInstalled(session, command) {
  if (!command || !command.trim()) {
    logForDebugging("[binaryCheck] Empty command provided, returning false");
    return false;
  }
  let trimmedCommand = command.trim();
  if (!SAFE_PATH_RE.test(trimmedCommand)) {
    logForDebugging(`[binaryCheck] Rejected command with unsafe characters: '${trimmedCommand}'`);
    return false;
  }
  let summary = installedSummaries.of(session);
  let cached = summary.lookup(trimmedCommand);
  if (cached !== undefined) {
    logForDebugging(`[binaryCheck] Cache hit for '${trimmedCommand}': ${cached}`);
    return cached;
  }
  let exists = false;
  if (await whichAsync(trimmedCommand).catch(() => null)) exists = true;
  summary.remember(trimmedCommand, exists);
  logForDebugging(`[binaryCheck] Binary '${trimmedCommand}' ${exists ? "found" : "not found"}`);
  return exists;
}
export { isBinaryInstalled };
