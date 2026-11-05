/**
 * utils/startupFlagWait.ts
 *
 * 2.1.316 新增：启动时等待特性开关。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-mcvsyhc6.js (8)
 * attribution: placement 8
 */
import { env } from "./env.js";
import { getIsNonInteractiveSession } from "../bootstrap/state.js";
import { isRemoteCowork } from "./entrypointKinds.js";
import { withDeadline } from "./sleep.js";

//@ chunk-mcvsyhc6.js:334-355 placement
/**
 * 事件日志开关缓存为空时等待的毫秒数（1500）。
 */
var EVENT_LOGGING_FLAG_WAIT_MS = 1500;
var GROWTHBOOK_FLAG_WAIT_MS = 3000;
//@ chunk-mcvsyhc6.js:355-404 placement
/**
 * 是否远程且非交互会话。
 */
function isRemoteNonInteractiveSession() {
  return env.CLAUDE_CODE_REMOTE && getIsNonInteractiveSession();
}
//@ chunk-mcvsyhc6.js:404-438 placement
/**
 * 是否远程 cowork 会话（远程非交互 + cowork）。
 */
function isRemoteCoworkSession() {
  return isRemoteNonInteractiveSession() && isRemoteCowork();
}
//@ chunk-mcvsyhc6.js:438-621 placement
/**
 * 计算启动时等待特性开关的时间预算：事件日志开且缓存为空，或 GrowthBook 开且需要重启时取对应值的较大者。
 */
function startupFlagWaitBudget({ eventLoggingEnabled, growthBookEnabled, cacheEmpty, relaunches }) {
  let eventLoggingBudget = eventLoggingEnabled && cacheEmpty ? EVENT_LOGGING_FLAG_WAIT_MS : 0;
  let growthBookBudget =
    growthBookEnabled && relaunches ? (env.CLAUDE_CODE_FLAG_FETCH_WAIT_MS ?? GROWTHBOOK_FLAG_WAIT_MS) : 0;
  let max = Math.max(eventLoggingBudget, growthBookBudget);
  return max > 0 ? max : undefined;
}
//@ chunk-mcvsyhc6.js:621-989 placement
/**
 * 判断启动时 GrowthBook 拉取的情形（不适用、缓存温热未请求、设置环境待定、在 init 中或之后启动）。
 */
function startupGrowthBookKickOutcome({
  site,
  nonInteractive,
  budgetMs,
  settingsEnvPending,
  cacheEmpty,
  warmCacheKick,
}) {
  if (!nonInteractive || budgetMs === undefined) return "not_eligible";
  if (!cacheEmpty && !warmCacheKick) return "not_asked_warm";
  if (settingsEnvPending) return cacheEmpty ? "settings_pending_empty" : "settings_pending_warm";
  if (site === "init") return cacheEmpty ? "started_in_init_empty" : "started_in_init_warm";
  return cacheEmpty ? "started_after_init_empty" : "started_after_init_warm";
}
//@ chunk-mcvsyhc6.js:989-1269 placement
/**
 * 判断启动情形是否已经发起 GrowthBook 拉取。
 */
function didStartGrowthBookKick(origin) {
  switch (origin) {
    case "started_in_init_empty":
    case "started_in_init_warm":
    case "started_after_init_empty":
    case "started_after_init_warm":
      return true;
    case "not_asked_warm":
    case "settings_pending_empty":
    case "settings_pending_warm":
    case "launch_excluded":
    case "not_eligible":
      return false;
  }
}
//@ chunk-mcvsyhc6.js:1269-1525 placement
/**
 * 决定启动流程在哪一步等待特性开关：模式选择前、上下文前或工具前。
 */
function startupFlagWaitPoint({
  nonInteractive,
  budgetMs,
  settingsEnvPending,
  cacheEmpty,
  relaunches,
  autoModeKillSwitchOnDisk,
  warmWakeEarlyFetch,
}) {
  if (budgetMs === undefined) return;
  if (
    nonInteractive &&
    !settingsEnvPending &&
    (cacheEmpty || (relaunches && (autoModeKillSwitchOnDisk || !warmWakeEarlyFetch)))
  )
    return "gb-before-mode";
  return relaunches ? "gb-before-context" : "gb-before-tools";
}
//@ chunk-mcvsyhc6.js:1525-1688 placement
/**
 * 在预算时间内等待初始化完成，返回等待时长与是否超时。
 */
async function waitForInitialize({ initialize, budgetMs }) {
  let startTime = performance.now();
  let finished = await withDeadline(
    initialize().then(
      () => true,
      () => true,
    ),
    budgetMs,
  );
  return {
    waitMs: performance.now() - startTime,
    timedOut: finished === undefined,
  };
}
export {
  EVENT_LOGGING_FLAG_WAIT_MS,
  didStartGrowthBookKick,
  waitForInitialize,
  isRemoteCoworkSession,
  isRemoteNonInteractiveSession,
  startupFlagWaitBudget,
  startupGrowthBookKickOutcome,
  startupFlagWaitPoint,
  GROWTHBOOK_FLAG_WAIT_MS,
};
