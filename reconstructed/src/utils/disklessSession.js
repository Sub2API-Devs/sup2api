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
var ije = "Programs are unavailable in this session; the command was not run.";
//@ chunk-m4p5zn6n.js:30829-30854 placement
function Tv() {
  return isDiskless();
}
//@ chunk-m4p5zn6n.js:30854-30945 placement
function CR() {
  if (Tv())
    throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
      ije,
      "a program start was refused in a diskless session",
    );
}

export { Tv, ije, CR };
