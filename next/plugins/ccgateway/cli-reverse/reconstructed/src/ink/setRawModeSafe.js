/**
 * ink/setRawModeSafe.ts
 *
 * 2.1.316 新增：安全设置终端 raw 模式。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-8xd7a972.js (2)
 * attribution: placement 2
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { errorMessage, getErrnoCode } from "../utils/errors.js";
import { logForDebugging } from "../utils/debug.js";
import { deferInit } from "../../runtime/deferred-init.js";

//@ chunk-8xd7a972.js:263-303 placement
/**
 * EIO/ENOTTY/EBADF
 */
var RAW_MODE_TTY_LOST_ERRNOS; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-8xd7a972.js:263", () => {
  RAW_MODE_TTY_LOST_ERRNOS = new Set(["EIO", "ENOTTY", "EBADF"]);
});
//@ chunk-8xd7a972.js:303-547 placement
/**
 * 安全地切换终端 raw 模式：流不支持时忽略；tty 已被收回（setRawMode failed 或特定 errno）时只记调试日志，其他错误照常抛出。
 */
function setRawModeSafe(stdin, enabled) {
  if (!("setRawMode" in stdin) || typeof stdin.setRawMode !== "function") return;
  try {
    stdin.setRawMode(enabled);
  } catch (error) {
    let message = errorMessage(error);
    let errnoCode = getErrnoCode(error);
    if (message.includes("setRawMode failed") || RAW_MODE_TTY_LOST_ERRNOS.has(errnoCode ?? "")) {
      logForDebugging(`setRawMode(${enabled}) failed on revoked tty: ${message}`);
      return;
    }
    throw error;
  }
}
export { setRawModeSafe };
