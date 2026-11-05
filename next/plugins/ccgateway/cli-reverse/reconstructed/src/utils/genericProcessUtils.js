/**
 * utils/genericProcessUtils.ts
 *
 * 进程工具：进程是否存活、取进程命令行、获取祖先 PID 链
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/utils/genericProcessUtils.ts
 * pieces: chunk-5xgkngpb.js (1), chunk-y28agbhb.js (1)
 * attribution: placement 2
 */

//@ chunk-y28agbhb.js:1374-1454 placement (2.1.88 match: isProcessRunning, 1)
/**
 * process.kill(pid, 0) 判断进程是否存活（EPERM 视为存活）。
 */
function isProcessRunning(pid) {
  if (pid <= 1) return false;
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
}
//@ chunk-5xgkngpb.js:249166-249231 placement (2.1.88 match: isValidNumericEffort, 0.684)
/**
 * 整数、大于 1 且不是本进程的 pid。旧版名 isValidNumericEffort 为错配，与 effort 无关（进程清理代码）。
 */
function isSignalablePid(value) {
  return Number.isInteger(value) && value > 1 && value !== process.pid;
}
export { isProcessRunning, isSignalablePid };
