/**
 * utils/shell/outputLimits.ts
 *
 * Bash 输出长度上限（settings.bashOutputMaxChars / BASH_MAX_OUTPUT_LENGTH）。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/utils/shell/outputLimits.ts
 * pieces: chunk-bhxaz9j0.js (4)
 * attribution: placement 2, fingerprint 1, affinity 1
 */
import { getInitialSettings_2 } from "../settings/settings.js";
import { validateBoundedIntEnvVar } from "../envValidation.js";
import { Vhr, Sdt } from "../../constants/outputLimits.js";

//@ chunk-bhxaz9j0.js:819-844 placement
var $Yo = 150000,
  ZYr = 30000;
//@ chunk-bhxaz9j0.js:844-898 placement
function $rt() {
  return clampOutputLimit(getInitialSettings_2().bashOutputMaxChars) ?? ZYr;
}
/**
 * Bash 输出最大字符数：settings.bashOutputMaxChars（夹在上下限之间）优先，否则 BASH_MAX_OUTPUT_LENGTH（默认 30000，上限 150000）。
 */
//@ chunk-bhxaz9j0.js:898-1058 fingerprint = getMaxOutputLength (0.879)
function getMaxOutputLength() {
  let e = clampOutputLimit(getInitialSettings_2().bashOutputMaxChars);
  if (e !== void 0) return e;
  return validateBoundedIntEnvVar("BASH_MAX_OUTPUT_LENGTH", process.env.BASH_MAX_OUTPUT_LENGTH, ZYr, $Yo)
    .effective;
}
/**
 * 把设置值夹到 [下限, 上限]；undefined 原样返回。
 */
//@ chunk-bhxaz9j0.js:1058-1130 affinity
function clampOutputLimit(e) {
  if (e === void 0) return;
  return Math.min(Math.max(e, Vhr), Sdt);
}

export { ZYr, $Yo, $rt, getMaxOutputLength };
