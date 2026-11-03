/**
 * utils/settings/settingsErrorsHeadless.ts
 *
 * 自动化会话中跳过无效设置（2.1.316 新增）
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-1ptrwbb7.js (2)
 * attribution: placement 2
 */
import { logForDebugging } from "../debug.js";
import { ql } from "../stringUtils.js";
import { Vyt } from "./settingsLabel.js";

/**
 * 把设置问题分为仅状态提示与无效条目两类。
 */
//@ chunk-1ptrwbb7.js:452-565 placement
function splitStatusNotices(o) {
  let r = [],
    i = [];
  for (let n of o) (n.statusOnly ? r : i).push(n);
  return { statusNotices: r, invalidEntries: i };
}
//@ chunk-1ptrwbb7.js:565-721 placement
function logSkippedInvalidSetting(o) {
  for (let r of o)
    logForDebugging(
      `Invalid setting skipped without dialog (automated session): ${ql(Vyt(r.file))}: ${r.path}: ${r.message}`,
      { level: "error" },
    );
}

export { splitStatusNotices, logSkippedInvalidSetting };
