/**
 * services/compact/sleepCompaction.ts
 *
 * 空闲时压缩（compact_sleep）（2.1.316 新增）
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-awpk546t.js (6)
 * attribution: placement 6
 */
import { env } from "../../utils/env.js";
import { isRemoteNonInteractiveSession } from "../../utils/startupFlagWait.js";
import { getLastMainThreadRequestAt, getLastMainThreadContextTokens } from "../../bootstrap/state.js";
import { getPromptCacheSummary } from "../api/promptCacheBreakDetection.js";
import { isRemoteManagedEnvironment, isSelfHostedByocEnvironment } from "../../utils/remoteEnvironment.js";
import { hasLoopTask } from "../../utils/loop/loopWakeups.js";
import { logError } from "../../utils/log.js";
import { logFeatureBad, logFeatureOk } from "../analytics/featureTelemetry.js";
import { logEvent } from "../analytics/index.js";
import { fromEnum } from "../analytics/safeMetadata.js";
import { isAutoCompactEnabled, isIdleCompactionEnabled } from "./compactSettings.js";
import { getCurrentLimits } from "../claudeAiLimits.js";

//@ chunk-awpk546t.js:5192-5253 placement
/**
 * 回合结束后等待的最大毫秒数（210 秒）。
 */
var IDLE_COMPACT_MIN_TOKENS = 150000;
var MIN_IDLE_COMPACT_TOKENS = 60000;
var _ = 0.9;
var EXIT_DELAY_GUARD_MS = 30000;
var DEFAULT_AFTER_TURN_MS = 150000;
var MIN_AFTER_TURN_MS = 60000;
var MAX_AFTER_TURN_MS = 210000;
//@ chunk-awpk546t.js:5253-5308 placement
/**
 * 睡眠压缩是否开启（CLAUDE_CODE_SLEEP_COMPACT 且相关开关允许）。
 */
function isSleepCompactionEnabled() {
  return env.CLAUDE_CODE_SLEEP_COMPACT && isRemoteNonInteractiveSession();
}
//@ chunk-awpk546t.js:5308-5378 placement
/**
 * 把环境变量给出的等待时间夹在 [b, E] 之间，缺省用 A。
 */
function resolveAfterTurnMs(ms) {
  if (ms === undefined) return DEFAULT_AFTER_TURN_MS;
  return Math.min(MAX_AFTER_TURN_MS, Math.max(MIN_AFTER_TURN_MS, ms));
}
//@ chunk-awpk546t.js:5378-5611 placement
/**
 * 计算空闲压缩触发时间（缓存过期前的比例点、回合结束后、退出延迟）。
 */
function computeSleepCompactAt({
  cacheActivityAt,
  cacheExpiresAt,
  lastRequestAt,
  turnEndedAt,
  afterTurnMs,
  exitDelayMs,
  fireAtFraction,
}) {
  let fireAt = cacheActivityAt + (cacheExpiresAt - cacheActivityAt) * fireAtFraction;
  if (exitDelayMs === undefined || exitDelayMs <= 0)
    return afterTurnMs === undefined ? fireAt : Math.min(fireAt, turnEndedAt + afterTurnMs);
  return Math.min(fireAt, lastRequestAt + Math.max(0, exitDelayMs - EXIT_DELAY_GUARD_MS));
}
//@ chunk-awpk546t.js:5611-7118 placement
class SleepCompaction {
  #e = null;
  #n = null;
  #t = null;
  #r;
  #o;
  #i;
  #s;
  #u;
  constructor({ isIdle, isStopping, isPermissionPending, enqueueCompact, exitDelayMs }) {
    this.#r = isIdle;
    this.#o = isStopping;
    this.#i = isPermissionPending;
    this.#s = enqueueCompact;
    this.#u = exitDelayMs;
  }
  arm() {
    this.cancel();
    try {
      let lastMainThreadRequestAt = getLastMainThreadRequestAt();
      let promptCacheSummary = getPromptCacheSummary();
      if (
        lastMainThreadRequestAt === null ||
        lastMainThreadRequestAt === this.#n ||
        promptCacheSummary.lastActivityAt === null ||
        promptCacheSummary.expiresAt === null
      )
        return;
      if (this.#t?.requestAt !== lastMainThreadRequestAt)
        this.#t = {
          requestAt: lastMainThreadRequestAt,
          at: Date.now(),
        };
      let sleepCompactAt = computeSleepCompactAt({
        cacheActivityAt: promptCacheSummary.lastActivityAt,
        cacheExpiresAt: promptCacheSummary.expiresAt,
        lastRequestAt: lastMainThreadRequestAt,
        turnEndedAt: this.#t.at,
        afterTurnMs:
          isRemoteManagedEnvironment() ||
          (isSelfHostedByocEnvironment() &&
            env.CLAUDE_CODE_SLEEP_COMPACT_AFTER_MS !== undefined &&
            !hasLoopTask())
            ? resolveAfterTurnMs(env.CLAUDE_CODE_SLEEP_COMPACT_AFTER_MS)
            : undefined,
        exitDelayMs: this.#u,
        fireAtFraction: _,
      });
      this.#e = setTimeout(
        (requestAt) => this.#a(requestAt),
        Math.max(0, sleepCompactAt - Date.now()),
        lastMainThreadRequestAt,
      );
      this.#e.unref?.();
    } catch (error) {
      logFeatureBad("compact_sleep", "arm_failed");
      logError(error);
    }
  }
  cancel() {
    if (this.#e !== null) {
      clearTimeout(this.#e);
      this.#e = null;
    }
  }
  #a(requestAt) {
    this.#e = null;
    try {
      let max = Math.max(
        MIN_IDLE_COMPACT_TOKENS,
        env.CLAUDE_CODE_IDLE_COMPACT_MIN_TOKENS ?? IDLE_COMPACT_MIN_TOKENS,
      );
      let contextTokens = getLastMainThreadContextTokens() ?? 0;
      let outcome = this.#m(max, requestAt, contextTokens);
      logEvent("tengu_sleep_compact_fired", {
        outcome: fromEnum(outcome),
        contextTokens,
        minTokens: max,
      });
      if (outcome !== "busy" && outcome !== "permission_pending" && outcome !== "newer_request")
        this.#n = requestAt;
      if (outcome === "started") {
        this.#s();
        logFeatureOk("compact_sleep");
      }
    } catch (error) {
      logFeatureBad("compact_sleep", "fire_failed");
      logError(error);
    }
  }
  #m(minTokens, requestAt, contextTokens) {
    if (!isAutoCompactEnabled()) return "compaction_off";
    if (!isIdleCompactionEnabled()) return "idle_compaction_off";
    if (this.#o()) return "stopping";
    if (this.#i()) return "permission_pending";
    if (!this.#r()) return "busy";
    if ((getLastMainThreadRequestAt() ?? 0) > requestAt) return "newer_request";
    if (!getPromptCacheSummary().warm) return "lapsed";
    if (contextTokens < minTokens) return "small";
    if (getCurrentLimits().status !== "allowed") return "near_limit";
    return "started";
  }
}
//@ chunk-awpk546t.js:7118-7218 placement
/**
 * 给控制器附加计时器的 start/stop。
 */
function withSleepTimer(timer, sleepTimer) {
  if (sleepTimer === null) return timer;
  return {
    start() {
      timer.start();
      sleepTimer.arm();
    },
    stop() {
      sleepTimer.cancel();
      timer.stop();
    },
  };
}
export { SleepCompaction, isSleepCompactionEnabled, withSleepTimer };
