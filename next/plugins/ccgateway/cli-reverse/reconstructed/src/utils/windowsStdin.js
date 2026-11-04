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

//@ chunk-j66yxmsq.js:226-359 placement
/**
 * Windows 下切换一次原始模式以复位标准输入。
 */
function resetWindowsStdinMode() {
  if (getPlatform() !== "windows" || !process.stdin.isTTY) return;
  try {
    process.stdin.setRawMode(true);
    process.stdin.setRawMode(false);
  } catch {}
}
//@ chunk-j66yxmsq.js:359-376 placement
/**
 * 空实现的 stdin 复位桩。
 */
function noopStdinReset(t) {}
export { noopStdinReset, resetWindowsStdinMode };
