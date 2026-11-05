/**
 * types/logs.ts
 *
 * 日志/会话列表类型与按时间排序 sortLogs。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/types/logs.ts
 * pieces: chunk-my2r02mp.js (3)
 * attribution: placement 2, fingerprint 1
 */
import { COMMON_INFO_ARGS } from "../constants/xml.js";

//@ chunk-my2r02mp.js:10485-10527 placement
/**
 * 判断参数是否属于常见 info 级参数。
 */
function isCommonInfoArg(arg) {
  return COMMON_INFO_ARGS.some((commonArg) => commonArg === arg);
}
//@ chunk-my2r02mp.js:10527-10546 placement
/**
 * 日志行最大字符数（64）。
 */
var MAX_LOG_LINE_CHARS = 64;
var MAX_LOGS = 100;
//@ chunk-my2r02mp.js:10546-10699 fingerprint (2.1.88 match: sortLogs, 1)
function sortLogs(logs) {
  return logs.sort((left, right) => {
    let modifiedDiff = right.modified.getTime() - left.modified.getTime();
    if (modifiedDiff !== 0) return modifiedDiff;
    return right.created.getTime() - left.created.getTime();
  });
}
export { MAX_LOGS, sortLogs, MAX_LOG_LINE_CHARS, isCommonInfoArg };
