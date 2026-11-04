/**
 * services/remoteManagedSettings/fetchSupport.ts
 *
 * 2.1.316 新增：远程托管设置的认证来源判定（托管设置、环境变量、文件描述符或无）与按交互状态启停的轮询。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-7t4fmt2f.js (4)
 * attribution: placement 4
 */
import { hasManagedSettings } from "../../utils/settings/managedRestrictionKeys.js";
import { claimRoadHint } from "../../entrypoints/warmSpare/claimCredentials.js";
import { env } from "../../utils/env.js";
import { getCredentialRoad, onInteraction } from "../../bootstrap/state.js";
import { getFeatureValue_CACHED_MAY_BE_STALE } from "../analytics/growthbook.js";
import { setDisposableInterval } from "../../utils/errorLogSink.js";
import { isIdleLongerThan } from "../api/errorUtils.js";

//@ chunk-7t4fmt2f.js:2229-2483 placement
/**
 * 判断远程托管设置请求使用的认证来源（托管设置、环境变量、文件描述符或无）。
 */
function settingsAuthSource() {
  if (hasManagedSettings()) return claimRoadHint();
  if (env.CLAUDE_CODE_OAUTH_TOKEN) return "env_var";
  let credentialRoad = getCredentialRoad("CLAUDE_CODE_OAUTH_TOKEN_FILE_DESCRIPTOR");
  if (credentialRoad !== undefined) return credentialRoad;
  if (env.ANTHROPIC_API_KEY) return "env_var";
  return getCredentialRoad("CLAUDE_CODE_API_KEY_FILE_DESCRIPTOR") ?? "none";
}
//@ chunk-7t4fmt2f.js:2597-2606 placement
var MAX_POLL_DEFERRALS = 3;
//@ chunk-7t4fmt2f.js:2606-2704 placement
/**
 * 读 tengu_zippy_gosling 作为轮询间隔覆盖值；非有限数字视为 0。
 */
function pollIntervalOverrideMs() {
  let featureValue_CACHED_MAY_BE_STALE = getFeatureValue_CACHED_MAY_BE_STALE("tengu_zippy_gosling", 0);
  return typeof featureValue_CACHED_MAY_BE_STALE === "number" &&
    Number.isFinite(featureValue_CACHED_MAY_BE_STALE)
    ? featureValue_CACHED_MAY_BE_STALE
    : 0;
}
//@ chunk-7t4fmt2f.js:2778-3115 placement
/**
 * 定时轮询，但用户最近有交互时推迟执行（最多推迟 Jt 次），等下一次交互后立刻补跑；返回可 dispose 的句柄。
 */
function startInteractionAwarePoll(onTick, intervalMs, options = {}) {
  let deferrals = 0;
  let unsubscribeInteraction = null;
  let pendingTimeout = null;
  let intervalHandle = setDisposableInterval(onInterval, intervalMs, options);
  function clearInteractionWait() {
    unsubscribeInteraction?.();
    unsubscribeInteraction = null;
    if (pendingTimeout !== null) {
      clearTimeout(pendingTimeout);
      pendingTimeout = null;
    }
  }
  function tick() {
    deferrals = 0;
    clearInteractionWait();
    onTick();
  }
  function onInterval() {
    let overrideMs = pollIntervalOverrideMs();
    if (!(overrideMs > 0 && isIdleLongerThan(overrideMs)) || deferrals >= MAX_POLL_DEFERRALS) {
      tick();
      return;
    }
    deferrals++;
    unsubscribeInteraction ??= onInteraction(() => {
      pendingTimeout ??= setTimeout(() => {
        intervalHandle[Symbol.dispose]();
        intervalHandle = setDisposableInterval(onInterval, intervalMs, options);
        tick();
      }, 0);
    });
  }
  return {
    [Symbol.dispose]: () => {
      intervalHandle[Symbol.dispose]();
      clearInteractionWait();
    },
  };
}
export { settingsAuthSource, startInteractionAwarePoll };
