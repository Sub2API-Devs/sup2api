/**
 * utils/idleTimeout.ts
 *
 * 空闲退出：CLAUDE_CODE_EXIT_AFTER_STOP_DELAY 毫秒无活动后退出进程
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/utils/idleTimeout.ts
 * pieces: chunk-tyg7f3ek.js (1)
 * attribution: fingerprint 1
 */
import { env } from "./env.js";
import { logError } from "./log.js";
import { logForDebugging } from "./debug.js";
import { gracefulShutdownSync } from "./gracefulShutdown.js";

/**
 * 空闲退出管理：设置 CLAUDE_CODE_EXIT_AFTER_STOP_DELAY 时，回合结束后空闲超过该毫秒数即退出进程。
 */
//@ chunk-tyg7f3ek.js:490216-490840 fingerprint = createIdleTimeoutManager (0.847)
function createIdleTimeoutManager(e, n) {
  let exitAfterStopDelay = env.CLAUDE_CODE_EXIT_AFTER_STOP_DELAY,
    isValidDelay = exitAfterStopDelay !== void 0 && exitAfterStopDelay > 0,
    timer = null,
    y = null,
    lastIdleTime = 0;
  return {
    start() {
      if (((lastIdleTime += 1), timer)) (clearTimeout(timer), (timer = null));
      if (isValidDelay) {
        try {
          y = e() ? Date.now() : null;
        } catch {
          y = null;
        }
        let R = lastIdleTime,
          w = () => {
            if (R !== lastIdleTime) return;
            try {
              P();
            } catch (error) {
              ((timer = null),
                logError(error),
                logForDebugging(
                  "[idleTimeout] idle check failed; chain stopped (error in error log when reporting is enabled)",
                  { level: "error" },
                ));
            }
          },
          P = () => {
            let now = Date.now();
            if (!e()) ((y = null), (timer = setTimeout(w, exitAfterStopDelay)));
            else if (y !== null && now - y >= exitAfterStopDelay) {
              logForDebugging(`Exiting after ${exitAfterStopDelay}ms of idle time`);
              try {
                n();
              } catch (error) {
                logError(error);
              }
              gracefulShutdownSync();
            } else ((y ??= now), (timer = setTimeout(w, Math.max(1, exitAfterStopDelay - (now - y)))));
          };
        timer = setTimeout(w, exitAfterStopDelay);
      }
    },
    stop() {
      if (((lastIdleTime += 1), timer)) (clearTimeout(timer), (timer = null));
    },
  };
}

export { createIdleTimeoutManager };
