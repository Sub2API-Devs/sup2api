/**
 * utils/settings/settingsErrorsHeadless.ts
 *
 * 自动化会话中跳过无效设置（2.1.316 新增）
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-cckh1dq3.js (2)
 * attribution: placement 2
 */
import { logForDebugging } from "../debug.js";
import { cleanForDisplay } from "../stringUtils.js";
import { settingsSourceLabel } from "./settingsLabel.js";

//@ chunk-cckh1dq3.js:452-565 placement
/**
 * 把设置问题分为仅状态提示与无效条目两类。
 */
function splitStatusNotices(errors) {
  let statusNotices = [];
  let invalidEntries = [];
  for (let error of errors) (error.statusOnly ? statusNotices : invalidEntries).push(error);
  return {
    statusNotices,
    invalidEntries,
  };
}
//@ chunk-cckh1dq3.js:565-721 placement
function logSkippedInvalidSetting(errors) {
  for (let error of errors)
    logForDebugging(
      `Invalid setting skipped without dialog (automated session): ${cleanForDisplay(settingsSourceLabel(error.file))}: ${error.path}: ${error.message}`,
      {
        level: "error",
      },
    );
}
export { logSkippedInvalidSetting, splitStatusNotices };
