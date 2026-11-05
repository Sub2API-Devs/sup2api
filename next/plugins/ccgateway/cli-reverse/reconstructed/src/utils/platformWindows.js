/**
 * utils/platformWindows.ts
 *
 * 2.1.316 新增：Windows 平台辅助
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-0vrrvjm8.js (3)
 * attribution: placement 3
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { getPlatform } from "./platform.js";
import { getCachedPowerShellPath } from "./shell/powershellDetection.js";
import { withDeadline } from "./sleep.js";
import { resolveBashToolShellWithHost } from "./Shell.js";
import { getResolvedBashShellPath } from "./shell/shellPaths.js";

//@ chunk-0vrrvjm8.js:372-383 placement
var WINDOWS_SETUP_TIMEOUT_MS = 2000;
//@ chunk-0vrrvjm8.js:383-474 placement
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
//@ chunk-0vrrvjm8.js:474-528 placement
/**
 * isWindowsOrPowerShellHost：Windows 或已有 PowerShell 路径。
 */
function isWindowsOrPowerShellHost() {
  return getPlatform() === "windows" || getResolvedBashShellPath() !== undefined;
}
export { primeWindowsPlatform, isWindowsOrPowerShellHost };
