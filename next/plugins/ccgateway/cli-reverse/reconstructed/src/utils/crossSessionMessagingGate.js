/**
 * utils/crossSessionMessagingGate.ts
 *
 * 2.1.316 新增。跨会话消息是否开启（tengu_harbor_kite 等）。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-b34h49f2.js (3)
 * attribution: placement 3
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { getHostAgentPolicy } from "./hostAgentPolicy.js";
import { env } from "./env.js";
import { isEnvTruthy } from "./envUtils.js";
import { getPlatform } from "./platform.js";
import {
  getFeatureValue_CACHED_MAY_BE_STALE,
  getFeatureValueWithSource_CACHED_MAY_BE_STALE,
} from "../services/analytics/growthbook.js";

//@ chunk-b34h49f2.js:371-607 placement
/**
 * 跨会话消息是否开启（tengu_harbor_kite 等）。
 */
function isCrossSessionMessagingEnabled(direction = "send") {
  if (direction === "send" && getHostAgentPolicy().messagingBeyondOwnAgentsDisabled) return false;
  let CLAUDE_CODE_HARBOR_KITE = env.CLAUDE_CODE_HARBOR_KITE;
  if (CLAUDE_CODE_HARBOR_KITE !== undefined) return isEnvTruthy(CLAUDE_CODE_HARBOR_KITE);
  if (getPlatform() === "windows" && !getFeatureValue_CACHED_MAY_BE_STALE("tengu_harbor_kite_win", true))
    return false;
  return getFeatureValue_CACHED_MAY_BE_STALE("tengu_harbor_kite", true);
}
//@ chunk-b34h49f2.js:607-741 placement
function isProjectsHumanOriginEnabled(context) {
  if (
    context?.flagsSettled === false &&
    getFeatureValueWithSource_CACHED_MAY_BE_STALE("tengu_cuddly_willow", true).source === "fallback"
  )
    return false;
  return getFeatureValue_CACHED_MAY_BE_STALE("tengu_cuddly_willow", true);
}
//@ chunk-b34h49f2.js:741-809 placement
var CROSS_SESSION_MESSAGING_DISABLED_MESSAGE = "Cross-session messaging is not available in this session.";
export {
  isProjectsHumanOriginEnabled,
  isCrossSessionMessagingEnabled,
  CROSS_SESSION_MESSAGING_DISABLED_MESSAGE,
};
