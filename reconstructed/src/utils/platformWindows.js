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
import { j7s } from "./Shell.js";
import { ZSr } from "./shell/shellPaths.js";

//@ chunk-4zx9mssv.js:372-383 placement
var e = 2000;
//@ chunk-4zx9mssv.js:383-474 placement
async function rNt() {
  if (getPlatform() === "windows") {
    getCachedPowerShellPath();
    return;
  }
  await withDeadline(
    j7s().catch(() => {
      return;
    }),
    e,
  );
}
//@ chunk-4zx9mssv.js:474-528 placement
function cOs() {
  return getPlatform() === "windows" || ZSr() !== void 0;
}

export { rNt, cOs };
