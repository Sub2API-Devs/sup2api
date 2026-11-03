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
import {
  open,
  open as open_2,
  open as open_3,
  open as open_4,
  open as open_5,
  open as open_6,
  open as open_7,
  open as open_8,
  open as open_9,
  open as open_10,
  open as open_11,
  open as open_12,
  open as open_13,
  open as open_14,
  open as open_15,
  open as open_16,
  open as open_17,
  open as open_18,
  open as open_19,
  open as open_20,
  open as open_21,
  open as open_22,
  open as open_23,
  open as open_24,
  open as open_25,
  open as open_26,
  open as open_27,
} from "fs/promises";
import {
  constants,
  constants as constants_3,
  constants as constants_4,
  constants as constants_5,
  constants as constants_6,
  constants as constants_7,
  constants as constants_9,
  constants as constants_10,
  constants as constants_12,
  constants as constants_13,
  constants as constants_14,
  constants as constants_15,
  constants as constants_16,
  constants as constants_17,
  constants as constants_18,
  constants as constants_19,
  constants as constants_20,
  constants as constants_21,
  constants as constants_22,
  constants as constants_23,
  constants as constants_24,
  constants as constants_25,
  constants as constants_26,
  constants as constants_27,
} from "fs";
import { isatty } from "tty";
import { getPlatform } from "./platform.js";
import { logForDebugging } from "./debug.js";

/**
 * 判断进程是否已有控制终端（能否打开 /dev/tty）。
 */
//@ chunk-e6aww6q8.js:1873675-1873787 placement
async function hasControllingTty() {
  try {
    return (await (await open_15("/dev/tty", constants_18.O_RDWR | constants_18.O_NOCTTY)).close(), !0);
  } catch {
    return !1;
  }
}
/**
 * 为后台会话获取控制终端：Windows 不支持，标准输入输出不是 TTY 时跳过，已有则返回 already，否则调用 login_tty。
 */
//@ chunk-e6aww6q8.js:1873787-1874167 placement
async function acquireControllingTty() {
  if (getPlatform() === "windows") return "unsupported";
  if (!isatty(0) || !isatty(1) || !isatty(2)) return "not_a_tty";
  if (await hasControllingTty()) return "already";
  let e;
  try {
    e = Bun.ant.loginTty(0);
  } catch (error) {
    return (
      logForDebugging(
        `[bg-ctty] Bun.ant.loginTty unavailable: ${error instanceof Error ? error.message : String(error)}`,
      ),
      "ffi_unavailable"
    );
  }
  if (!e) return (logForDebugging("[bg-ctty] login_tty(0) failed", { level: "warn" }), "failed");
  return "acquired";
}
//@ chunk-e6aww6q8.js:1874167-1874180 placement
var mZo = 5000;

export { mZo, hasControllingTty, acquireControllingTty };
