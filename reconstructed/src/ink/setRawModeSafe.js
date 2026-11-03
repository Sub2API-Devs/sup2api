/**
 * ink/setRawModeSafe.ts
 *
 * 2.1.316 新增：安全设置终端 raw 模式。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-ngsa3jxs.js (2)
 * attribution: placement 2
 */
import { errorMessage, getErrnoCode } from "../utils/errors.js";
import { logForDebugging } from "../utils/debug.js";

//@ chunk-ngsa3jxs.js:263-303 placement
var s = new Set(["EIO", "ENOTTY", "EBADF"]);
/**
 * 安全地切换终端 raw 模式：流不支持时忽略；tty 已被收回（setRawMode failed 或特定 errno）时只记调试日志，其他错误照常抛出。
 */
//@ chunk-ngsa3jxs.js:303-547 placement
function setRawModeSafe(e, n) {
  if (!("setRawMode" in e) || typeof e.setRawMode !== "function") return;
  try {
    e.setRawMode(n);
  } catch (error) {
    let a = errorMessage(error),
      r = getErrnoCode(error);
    if (a.includes("setRawMode failed") || s.has(r ?? "")) {
      logForDebugging(`setRawMode(${n}) failed on revoked tty: ${a}`);
      return;
    }
    throw error;
  }
}

export { setRawModeSafe };
