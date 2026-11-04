/**
 * utils/bgControllingTty.ts
 *
 * 2.1.316 新增：后台会话的控制终端
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-e6aww6q8.js (3)
 * attribution: placement 3
 */
import { open } from "fs/promises";
import { constants } from "fs";
import { isatty } from "tty";
import { getPlatform } from "./platform.js";
import { logForDebugging } from "./debug.js";

//@ chunk-e6aww6q8.js:1873675-1873787 placement
/**
 * 判断进程是否已有控制终端（能否打开 /dev/tty）。
 */
async function hasControllingTty() {
  try {
    await (await open("/dev/tty", constants.O_RDWR | constants.O_NOCTTY)).close();
    return true;
  } catch {
    return false;
  }
}
//@ chunk-e6aww6q8.js:1873787-1874167 placement
/**
 * 为后台会话获取控制终端：Windows 不支持，标准输入输出不是 TTY 时跳过，已有则返回 already，否则调用 login_tty。
 */
async function acquireControllingTty() {
  if (getPlatform() === "windows") return "unsupported";
  if (!isatty(0) || !isatty(1) || !isatty(2)) return "not_a_tty";
  if (await hasControllingTty()) return "already";
  let attached;
  try {
    attached = Bun.ant.loginTty(0);
  } catch (error) {
    logForDebugging(
      `[bg-ctty] Bun.ant.loginTty unavailable: ${error instanceof Error ? error.message : String(error)}`,
    );
    return "ffi_unavailable";
  }
  if (!attached) {
    logForDebugging("[bg-ctty] login_tty(0) failed", {
      level: "warn",
    });
    return "failed";
  }
  return "acquired";
}
//@ chunk-e6aww6q8.js:1874167-1874180 placement
/**
 * 获取控制终端的超时时间（5 秒）。
 */
var TTY_ACQUIRE_TIMEOUT_MS = 5000;
export { TTY_ACQUIRE_TIMEOUT_MS, hasControllingTty, acquireControllingTty };
