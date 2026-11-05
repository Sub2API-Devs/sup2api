/**
 * utils/idleTimeout.ts
 *
 * 空闲退出：CLAUDE_CODE_EXIT_AFTER_STOP_DELAY 毫秒无活动后退出进程
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/utils/idleTimeout.ts
 * pieces: chunk-0yw3taqg.js (1)
 * attribution: fingerprint 1
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { env } from "./env.js";
import { logError } from "./log.js";
import { logForDebugging } from "./debug.js";
import { gracefulShutdownSync } from "./gracefulShutdown.js";

//@ chunk-0yw3taqg.js:521842-522466 fingerprint (2.1.88 match: createIdleTimeoutManager, 0.846)
/**
 * 空闲退出管理：设置 CLAUDE_CODE_EXIT_AFTER_STOP_DELAY 时，回合结束后空闲超过该毫秒数即退出进程。
 */
function createIdleTimeoutManager(isIdle, onExit) {
  let exitAfterStopDelay = env.CLAUDE_CODE_EXIT_AFTER_STOP_DELAY;
  let isValidDelay = exitAfterStopDelay !== undefined && exitAfterStopDelay > 0;
  let timer = null;
  let idleSince = null;
  let lastIdleTime = 0;
  return {
    start() {
      lastIdleTime += 1;
      if (timer) {
        clearTimeout(timer);
        timer = null;
      }
      if (isValidDelay) {
        try {
          idleSince = isIdle() ? Date.now() : null;
        } catch {
          idleSince = null;
        }
        let generation = lastIdleTime;
        let tick = () => {
          if (generation !== lastIdleTime) return;
          try {
            checkIdle();
          } catch (error) {
            timer = null;
            logError(error);
            logForDebugging(
              "[idleTimeout] idle check failed; chain stopped (error in error log when reporting is enabled)",
              {
                level: "error",
              },
            );
          }
        };
        let checkIdle = () => {
          let now = Date.now();
          if (!isIdle()) {
            idleSince = null;
            timer = setTimeout(tick, exitAfterStopDelay);
          } else if (idleSince !== null && now - idleSince >= exitAfterStopDelay) {
            logForDebugging(`Exiting after ${exitAfterStopDelay}ms of idle time`);
            try {
              onExit();
            } catch (error) {
              logError(error);
            }
            gracefulShutdownSync();
          } else {
            idleSince ??= now;
            timer = setTimeout(tick, Math.max(1, exitAfterStopDelay - (now - idleSince)));
          }
        };
        timer = setTimeout(tick, exitAfterStopDelay);
      }
    },
    stop() {
      lastIdleTime += 1;
      if (timer) {
        clearTimeout(timer);
        timer = null;
      }
    },
  };
}
export { createIdleTimeoutManager };
