/**
 * types/logs.ts
 *
 * 日志/会话列表类型与按时间排序 sortLogs。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/types/logs.ts
 * pieces: chunk-bbtre4r8.js (3)
 * attribution: placement 2, fingerprint 1
 */
import { COMMON_INFO_ARGS } from "../constants/xml.js";

//@ chunk-bbtre4r8.js:10335-10377 placement
/**
 * 判断参数是否属于常见 info 级参数。
 */
function isCommonInfoArg(t) {
  return COMMON_INFO_ARGS.some((e) => e === t);
}
//@ chunk-bbtre4r8.js:10377-10396 placement
/**
 * 日志行最大字符数（64）。
 */
var MAX_LOG_LINE_CHARS = 64;
var MAX_LOGS = 100;
//@ chunk-bbtre4r8.js:10396-10549 fingerprint = sortLogs (1)
function sortLogs(logs) {
  return logs.sort((e, r) => {
    let modifiedDiff = r.modified.getTime() - e.modified.getTime();
    if (modifiedDiff !== 0) return modifiedDiff;
    return r.created.getTime() - e.created.getTime();
  });
}
export { MAX_LOGS, sortLogs, isCommonInfoArg, MAX_LOG_LINE_CHARS };
