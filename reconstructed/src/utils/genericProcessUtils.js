/**
 * utils/genericProcessUtils.ts
 *
 * 进程工具：进程是否存活、取进程命令行、获取祖先 PID 链
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/utils/genericProcessUtils.ts
 * pieces: chunk-e6aww6q8.js (1), chunk-g4mgfvqt.js (1)
 * attribution: placement 2
 */

/**
 * 整数、大于 1 且不是本进程的 pid。旧版名 isValidNumericEffort 为错配，与 effort 无关（进程清理代码）。
 */
//@ chunk-e6aww6q8.js:249937-250002 placement = isValidNumericEffort (0.684)
function isSignalablePid(value) {
  return Number.isInteger(value) && value > 1 && value !== process.pid;
}
/**
 * process.kill(pid, 0) 判断进程是否存活（EPERM 视为存活）。
 */
//@ chunk-g4mgfvqt.js:1374-1454 placement = isProcessRunning (1)
function isProcessRunning(pid) {
  if (pid <= 1) return !1;
  try {
    return (process.kill(pid, 0), !0);
  } catch {
    return !1;
  }
}

export { isProcessRunning, isSignalablePid };
