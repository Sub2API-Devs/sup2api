/**
 * utils/startupFlagWait.ts
 *
 * 2.1.316 新增：启动时等待特性开关。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-m9xcg44e.js (8)
 * attribution: placement 8
 */
import { env } from "./env.js";
import { getIsNonInteractiveSession } from "../bootstrap/state.js";
import { isRemoteCowork } from "./entrypointKinds.js";
import { withDeadline } from "./sleep.js";

//@ chunk-m9xcg44e.js:334-355 placement
var qM = 1500,
  fYo = 3000;
//@ chunk-m9xcg44e.js:355-404 placement
function uie() {
  return env.CLAUDE_CODE_REMOTE && getIsNonInteractiveSession();
}
//@ chunk-m9xcg44e.js:404-438 placement
function nbn() {
  return uie() && isRemoteCowork();
}
/**
 * 计算启动时等待特性开关的时间预算：事件日志开且缓存为空，或 GrowthBook 开且需要重启时取对应值的较大者。
 */
//@ chunk-m9xcg44e.js:438-621 placement
function startupFlagWaitBudget({
  eventLoggingEnabled: eventLoggingEnabled,
  growthBookEnabled: growthBookEnabled,
  cacheEmpty: cacheEmpty,
  relaunches: relaunches,
}) {
  let t = eventLoggingEnabled && cacheEmpty ? qM : 0,
    a = growthBookEnabled && relaunches ? (env.CLAUDE_CODE_FLAG_FETCH_WAIT_MS ?? fYo) : 0,
    max = Math.max(t, a);
  return max > 0 ? max : void 0;
}
/**
 * 判断启动时 GrowthBook 拉取的情形（不适用、缓存温热未请求、设置环境待定、在 init 中或之后启动）。
 */
//@ chunk-m9xcg44e.js:621-989 placement
function startupGrowthBookKickOutcome({
  site: site,
  nonInteractive: nonInteractive,
  budgetMs: budgetMs,
  settingsEnvPending: settingsEnvPending,
  cacheEmpty: cacheEmpty,
  warmCacheKick: warmCacheKick,
}) {
  if (!nonInteractive || budgetMs === void 0) return "not_eligible";
  if (!cacheEmpty && !warmCacheKick) return "not_asked_warm";
  if (settingsEnvPending) return cacheEmpty ? "settings_pending_empty" : "settings_pending_warm";
  if (site === "init") return cacheEmpty ? "started_in_init_empty" : "started_in_init_warm";
  return cacheEmpty ? "started_after_init_empty" : "started_after_init_warm";
}
/**
 * 判断启动情形是否已经发起 GrowthBook 拉取。
 */
//@ chunk-m9xcg44e.js:989-1269 placement
function didStartGrowthBookKick(e) {
  switch (e) {
    case "started_in_init_empty":
    case "started_in_init_warm":
    case "started_after_init_empty":
    case "started_after_init_warm":
      return !0;
    case "not_asked_warm":
    case "settings_pending_empty":
    case "settings_pending_warm":
    case "launch_excluded":
    case "not_eligible":
      return !1;
  }
}
/**
 * 决定启动流程在哪一步等待特性开关：模式选择前、上下文前或工具前。
 */
//@ chunk-m9xcg44e.js:1269-1525 placement
function startupFlagWaitPoint({
  nonInteractive: nonInteractive,
  budgetMs: budgetMs,
  settingsEnvPending: settingsEnvPending,
  cacheEmpty: cacheEmpty,
  relaunches: relaunches,
  autoModeKillSwitchOnDisk: autoModeKillSwitchOnDisk,
  warmWakeEarlyFetch: warmWakeEarlyFetch,
}) {
  if (budgetMs === void 0) return;
  if (
    nonInteractive &&
    !settingsEnvPending &&
    (cacheEmpty || (relaunches && (autoModeKillSwitchOnDisk || !warmWakeEarlyFetch)))
  )
    return "gb-before-mode";
  return relaunches ? "gb-before-context" : "gb-before-tools";
}
/**
 * 在预算时间内等待初始化完成，返回等待时长与是否超时。
 */
//@ chunk-m9xcg44e.js:1525-1688 placement
async function waitForInitialize({ initialize: initialize, budgetMs: budgetMs }) {
  let startTime = performance.now(),
    r = await withDeadline(
      initialize().then(
        () => !0,
        () => !0,
      ),
      budgetMs,
    );
  return { waitMs: performance.now() - startTime, timedOut: r === void 0 };
}

export {
  qM,
  didStartGrowthBookKick,
  startupFlagWaitBudget,
  uie,
  startupGrowthBookKickOutcome,
  waitForInitialize,
  startupFlagWaitPoint,
  nbn,
  fYo,
};
