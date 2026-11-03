/**
 * utils/crossSessionMessagingGate.ts
 *
 * 2.1.316 新增。跨会话消息是否开启（tengu_harbor_kite 等）。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-jbqx8bv9.js (3)
 * attribution: placement 3
 */
import { getHostAgentPolicy } from "./hostAgentPolicy.js";
import { env } from "./env.js";
import { isEnvTruthy } from "./envUtils.js";
import { getPlatform } from "./platform.js";
import {
  getFeatureValue_CACHED_MAY_BE_STALE,
  getFeatureValueWithSource_CACHED_MAY_BE_STALE,
} from "../services/analytics/growthbook.js";

/**
 * 跨会话消息是否开启（tengu_harbor_kite 等）。
 */
//@ chunk-jbqx8bv9.js:371-607 placement
function isCrossSessionMessagingEnabled(e = "send") {
  if (e === "send" && getHostAgentPolicy().messagingBeyondOwnAgentsDisabled) return !1;
  let CLAUDE_CODE_HARBOR_KITE = env.CLAUDE_CODE_HARBOR_KITE;
  if (CLAUDE_CODE_HARBOR_KITE !== void 0) return isEnvTruthy(CLAUDE_CODE_HARBOR_KITE);
  if (getPlatform() === "windows" && !getFeatureValue_CACHED_MAY_BE_STALE("tengu_harbor_kite_win", !0))
    return !1;
  return getFeatureValue_CACHED_MAY_BE_STALE("tengu_harbor_kite", !0);
}
//@ chunk-jbqx8bv9.js:607-741 placement
function isProjectsHumanOriginEnabled(e) {
  if (
    e?.flagsSettled === !1 &&
    getFeatureValueWithSource_CACHED_MAY_BE_STALE("tengu_cuddly_willow", !0).source === "fallback"
  )
    return !1;
  return getFeatureValue_CACHED_MAY_BE_STALE("tengu_cuddly_willow", !0);
}
//@ chunk-jbqx8bv9.js:741-809 placement
var CROSS_SESSION_MESSAGING_DISABLED_MESSAGE = "Cross-session messaging is not available in this session.";

export {
  isCrossSessionMessagingEnabled,
  isProjectsHumanOriginEnabled,
  CROSS_SESSION_MESSAGING_DISABLED_MESSAGE,
};
