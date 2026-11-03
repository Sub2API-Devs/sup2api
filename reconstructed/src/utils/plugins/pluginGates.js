/**
 * utils/plugins/pluginGates.ts
 *
 * 插件相关特性开关（2.1.316 新增）
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-3a43jh83.js (5)
 * attribution: placement 5
 */
import {
  getFeatureValue_CACHED_MAY_BE_STALE,
  getFeatureValue_SESSION_PINNED,
} from "../../services/analytics/growthbook.js";
import { env } from "../env.js";

//@ chunk-3a43jh83.js:264-342 placement
function jF() {
  return getFeatureValue_CACHED_MAY_BE_STALE("tengu_lantern_prism", !1) || env.CLAUDE_CODE_LANTERN_PRISM;
}
//@ chunk-3a43jh83.js:342-404 placement
function QE() {
  return Q4o() || getFeatureValue_SESSION_PINNED("tengu_spicy_blossom", !1) === !0;
}
//@ chunk-3a43jh83.js:404-466 placement
function Q4o() {
  return getFeatureValue_SESSION_PINNED("tengu_encapsulated_pebble", !0) !== !1;
}
//@ chunk-3a43jh83.js:466-520 placement
function J_n() {
  return !getFeatureValue_CACHED_MAY_BE_STALE("tengu_sharded_snowflake", !1);
}
//@ chunk-3a43jh83.js:520-1196 placement
function describePluginEvalAvailability() {
  if (J_n())
    return {
      enabled: !0,
      text: "`claude plugin eval` is available in this session (generally available; no enablement setting is needed on any client, including Bedrock/Vertex/Foundry, LLM gateways, telemetry-disabled clients and CI runners).",
    };
  return {
    enabled: !1,
    text: '`claude plugin eval` is generally available but switched OFF for this session by a server-side kill switch: it exists but prints "currently unavailable" here. If the user asks about it, say that plainly rather than that it does not exist; there is no setting or variable that turns it back on, and `claude update` plus a fresh session picks the command up again once the switch is lifted.',
  };
}

export { QE, jF, J_n, describePluginEvalAvailability, Q4o };
