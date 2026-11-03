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

//@ chunk-18hwfzwa.js:1797785-1798239 fingerprint = isBinaryInstalled (0.836)
async function isBinaryInstalled(h, command) {
  if (!command || !command.trim()) {
    logForDebugging("[binaryCheck] Empty command provided, returning false");
    return false;
  }
  let trimmedCommand = command.trim();
  if (!SAFE_PATH_RE.test(trimmedCommand)) {
    logForDebugging(`[binaryCheck] Rejected command with unsafe characters: '${trimmedCommand}'`);
    return false;
  }
  let L = installedSummaries.of(h);
  let ee = L.lookup(trimmedCommand);
  if (ee !== undefined) {
    logForDebugging(`[binaryCheck] Cache hit for '${trimmedCommand}': ${ee}`);
    return ee;
  }
  let exists = false;
  if (await whichAsync(trimmedCommand).catch(() => null)) exists = true;
  L.remember(trimmedCommand, exists);
  logForDebugging(`[binaryCheck] Binary '${trimmedCommand}' ${exists ? "found" : "not found"}`);
  return exists;
}
export { isBinaryInstalled };
