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
import { NGo, installedSummaries } from "../hooks/useAwaySummary.js";
import { whichAsync } from "./which.js";

//@ chunk-18hwfzwa.js:1797785-1798239 fingerprint = isBinaryInstalled (0.836)
async function isBinaryInstalled(h, x) {
  if (!x || !x.trim()) return (logForDebugging("[binaryCheck] Empty command provided, returning false"), !1);
  let trimmedCommand = x.trim();
  if (!NGo.test(trimmedCommand))
    return (
      logForDebugging(`[binaryCheck] Rejected command with unsafe characters: '${trimmedCommand}'`),
      !1
    );
  let of = installedSummaries.of(h),
    lookup = of.lookup(trimmedCommand);
  if (lookup !== void 0)
    return (logForDebugging(`[binaryCheck] Cache hit for '${trimmedCommand}': ${lookup}`), lookup);
  let ke = !1;
  if (await whichAsync(trimmedCommand).catch(() => null)) ke = !0;
  return (
    of.remember(trimmedCommand, ke),
    logForDebugging(`[binaryCheck] Binary '${trimmedCommand}' ${ke ? "found" : "not found"}`),
    ke
  );
}

export { isBinaryInstalled };
