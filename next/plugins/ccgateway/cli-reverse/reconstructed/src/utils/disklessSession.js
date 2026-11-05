/**
 * utils/disklessSession.ts
 *
 * 2.1.316 新增：无盘会话判定。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-t889g22j.js (3)
 * attribution: placement 3
 */
import { isDiskless } from "../bootstrap/state.js";
import { TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS } from "./errors.js";

//@ chunk-t889g22j.js:30751-30828 placement
/**
 * 无盘会话里“程序不可用、命令未运行”的提示。
 */
var DISKLESS_PROGRAM_REFUSAL = "Programs are unavailable in this session; the command was not run.";
//@ chunk-t889g22j.js:30828-30853 placement
/**
 * 当前是否为无盘会话。
 */
function isDisklessSession() {
  return isDiskless();
}
//@ chunk-t889g22j.js:30853-30944 placement
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
export { assertProgramLaunchAllowed, isDisklessSession, DISKLESS_PROGRAM_REFUSAL };
