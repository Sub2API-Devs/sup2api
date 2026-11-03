/**
 * utils/platformWindows.ts
 *
 * 2.1.316 新增：Windows 平台辅助
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-4zx9mssv.js (3)
 * attribution: placement 3
 */
import { getPlatform } from "./platform.js";
import { getCachedPowerShellPath } from "./shell/powershellDetection.js";
import { withDeadline } from "./sleep.js";
import { resolveBashToolShellWithHost } from "./Shell.js";
import { getResolvedBashShellPath } from "./shell/shellPaths.js";

//@ chunk-4zx9mssv.js:372-383 placement
var WINDOWS_SETUP_TIMEOUT_MS = 2000;
//@ chunk-4zx9mssv.js:383-474 placement
/**
 * primeWindowsPlatform：预先准备 Windows 平台的 PowerShell。
 */
async function primeWindowsPlatform() {
  if (getPlatform() === "windows") {
    getCachedPowerShellPath();
    return;
  }
  await withDeadline(
    resolveBashToolShellWithHost().catch(() => {
      return;
    }),
    WINDOWS_SETUP_TIMEOUT_MS,
  );
}
//@ chunk-4zx9mssv.js:474-528 placement
/**
 * isWindowsOrPowerShellHost：Windows 或已有 PowerShell 路径。
 */
function isWindowsOrPowerShellHost() {
  return getPlatform() === "windows" || getResolvedBashShellPath() !== undefined;
}
export { primeWindowsPlatform, isWindowsOrPowerShellHost };
