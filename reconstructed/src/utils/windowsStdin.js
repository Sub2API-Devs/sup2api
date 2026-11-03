/**
 * utils/windowsStdin.ts
 *
 * Windows 标准输入（2.1.316 新增）
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-j66yxmsq.js (2)
 * attribution: placement 2
 */
import { getPlatform } from "./platform.js";

/**
 * Windows 下切换一次原始模式以复位标准输入。
 */
//@ chunk-j66yxmsq.js:226-359 placement
function resetWindowsStdinMode() {
  if (getPlatform() !== "windows" || !process.stdin.isTTY) return;
  try {
    (process.stdin.setRawMode(!0), process.stdin.setRawMode(!1));
  } catch {}
}
//@ chunk-j66yxmsq.js:359-376 placement
function ozn(t) {}

export { ozn, resetWindowsStdinMode };
