/**
 * utils/disklessSession.ts
 *
 * 2.1.316 新增：无盘会话判定。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-m4p5zn6n.js (3)
 * attribution: placement 3
 */
import { isDiskless } from "../bootstrap/state.js";
import { TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS } from "./errors.js";

//@ chunk-m4p5zn6n.js:30752-30829 placement
/**
 * 无盘会话里“程序不可用、命令未运行”的提示。
 */
var DISKLESS_PROGRAM_REFUSAL = "Programs are unavailable in this session; the command was not run.";
//@ chunk-m4p5zn6n.js:30829-30854 placement
/**
 * 当前是否为无盘会话。
 */
function isDisklessSession() {
  return isDiskless();
}
//@ chunk-m4p5zn6n.js:30854-30945 placement
/**
 * 无盘会话里尝试启动程序时抛出遥测安全错误。
 */
function assertProgramLaunchAllowed() {
  if (isDisklessSession())
    throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
      DISKLESS_PROGRAM_REFUSAL,
      "a program start was refused in a diskless session",
    );
}
export { isDisklessSession, DISKLESS_PROGRAM_REFUSAL, assertProgramLaunchAllowed };
