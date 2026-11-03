/**
 * services/compact/sleepCompaction.ts
 *
 * 空闲时压缩（compact_sleep）（2.1.316 新增）
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-bbwtdypr.js (6)
 * attribution: placement 6
 */
import { env } from "../../utils/env.js";
import { uie } from "../../utils/startupFlagWait.js";
import { getLastMainThreadRequestAt, getLastMainThreadContextTokens } from "../../bootstrap/state.js";
import { getPromptCacheSummary } from "../api/promptCacheBreakDetection.js";
import { mn } from "../../utils/remoteEnvironment.js";
import { logEvent } from "../analytics/index.js";
import { logFeatureBad, logFeatureOk } from "../analytics/featureTelemetry.js";
import { logError } from "../../utils/log.js";
import { fromEnum } from "../analytics/safeMetadata.js";
import { isAutoCompactEnabled, isIdleCompactionEnabled } from "./compactSettings.js";
import { getCurrentLimits } from "../claudeAiLimits.js";

//@ chunk-bbwtdypr.js:4682-4743 placement
var d = 150000,
  f = 60000,
  _ = 0.9,
  h = 30000,
  A = 150000,
  b = 60000,
  E = 210000;
//@ chunk-bbwtdypr.js:4743-4798 placement
function q() {
  return env.CLAUDE_CODE_SLEEP_COMPACT && uie();
}
//@ chunk-bbwtdypr.js:4798-4868 placement
function T(e) {
  if (e === void 0) return A;
  return Math.min(E, Math.max(b, e));
}
/**
 * 计算空闲压缩触发时间（缓存过期前的比例点、回合结束后、退出延迟）。
 */
//@ chunk-bbwtdypr.js:4868-5101 placement
function computeSleepCompactAt({
  cacheActivityAt: cacheActivityAt,
  cacheExpiresAt: cacheExpiresAt,
  lastRequestAt: lastRequestAt,
  turnEndedAt: turnEndedAt,
  afterTurnMs: afterTurnMs,
  exitDelayMs: exitDelayMs,
  fireAtFraction: fireAtFraction,
}) {
  let u = cacheActivityAt + (cacheExpiresAt - cacheActivityAt) * fireAtFraction;
  if (exitDelayMs === void 0 || exitDelayMs <= 0)
    return afterTurnMs === void 0 ? u : Math.min(u, turnEndedAt + afterTurnMs);
  return Math.min(u, lastRequestAt + Math.max(0, exitDelayMs - h));
}
//@ chunk-bbwtdypr.js:5101-6548 placement
class SleepCompaction {
  #e = null;
  #n = null;
  #t = null;
  #r;
  #o;
  #i;
  #s;
  #u;
  constructor({ isIdle: e, isStopping: t, isPermissionPending: r, enqueueCompact: n, exitDelayMs: o }) {
    ((this.#r = e), (this.#o = t), (this.#i = r), (this.#s = n), (this.#u = o));
  }
  arm() {
    this.cancel();
    try {
      let e = getLastMainThreadRequestAt(),
        t = getPromptCacheSummary();
      if (e === null || e === this.#n || t.lastActivityAt === null || t.expiresAt === null) return;
      if (this.#t?.requestAt !== e) this.#t = { requestAt: e, at: Date.now() };
      let r = computeSleepCompactAt({
        cacheActivityAt: t.lastActivityAt,
        cacheExpiresAt: t.expiresAt,
        lastRequestAt: e,
        turnEndedAt: this.#t.at,
        afterTurnMs: mn() ? T(env.CLAUDE_CODE_SLEEP_COMPACT_AFTER_MS) : void 0,
        exitDelayMs: this.#u,
        fireAtFraction: _,
      });
      ((this.#e = setTimeout((n) => this.#a(n), Math.max(0, r - Date.now()), e)), this.#e.unref?.());
    } catch (error) {
      (logFeatureBad("compact_sleep", "arm_failed"), logError(error));
    }
  }
  cancel() {
    if (this.#e !== null) (clearTimeout(this.#e), (this.#e = null));
  }
  #a(e) {
    this.#e = null;
    try {
      let max = Math.max(f, env.CLAUDE_CODE_IDLE_COMPACT_MIN_TOKENS ?? d),
        r = getLastMainThreadContextTokens() ?? 0,
        n = this.#m(max, e, r);
      if (
        (logEvent("tengu_sleep_compact_fired", { outcome: fromEnum(n), contextTokens: r, minTokens: max }),
        n !== "busy" && n !== "permission_pending" && n !== "newer_request")
      )
        this.#n = e;
      if (n === "started") (this.#s(), logFeatureOk("compact_sleep"));
    } catch (error) {
      (logFeatureBad("compact_sleep", "fire_failed"), logError(error));
    }
  }
  #m(e, t, r) {
    if (!isAutoCompactEnabled()) return "compaction_off";
    if (!isIdleCompactionEnabled()) return "idle_compaction_off";
    if (this.#o()) return "stopping";
    if (this.#i()) return "permission_pending";
    if (!this.#r()) return "busy";
    if ((getLastMainThreadRequestAt() ?? 0) > t) return "newer_request";
    if (!getPromptCacheSummary().warm) return "lapsed";
    if (r < e) return "small";
    if (getCurrentLimits().status !== "allowed") return "near_limit";
    return "started";
  }
}
/**
 * 给控制器附加计时器的 start/stop。
 */
//@ chunk-bbwtdypr.js:6548-6648 placement
function withSleepTimer(e, t) {
  if (t === null) return e;
  return {
    start() {
      (e.start(), t.arm());
    },
    stop() {
      (t.cancel(), e.stop());
    },
  };
}
