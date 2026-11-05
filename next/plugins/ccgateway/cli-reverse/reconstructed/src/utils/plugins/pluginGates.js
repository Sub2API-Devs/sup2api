/**
 * utils/plugins/pluginGates.ts
 *
 * 插件相关特性开关（2.1.316 新增）
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-f3ry38nm.js (5)
 * attribution: placement 5
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import {
  getFeatureValue_CACHED_MAY_BE_STALE,
  getFeatureValue_SESSION_PINNED,
} from "../../services/analytics/growthbook.js";
import { env } from "../env.js";

//@ chunk-f3ry38nm.js:264-342 placement
/**
 * lanternPrismEnabled：插件 lantern prism 开关。
 */
function lanternPrismEnabled() {
  return getFeatureValue_CACHED_MAY_BE_STALE("tengu_lantern_prism", false) || env.CLAUDE_CODE_LANTERN_PRISM;
}
//@ chunk-f3ry38nm.js:342-404 placement
/**
 * isPluginDirectoryModeOn：插件目录模式开启。
 */
function isPluginDirectoryModeOn() {
  return encapsulatedPebbleEnabled() || getFeatureValue_SESSION_PINNED("tengu_spicy_blossom", false) === true;
}
//@ chunk-f3ry38nm.js:404-466 placement
/**
 * encapsulatedPebbleEnabled：插件开关（默认开）。
 */
function encapsulatedPebbleEnabled() {
  return getFeatureValue_SESSION_PINNED("tengu_encapsulated_pebble", true) !== false;
}
//@ chunk-f3ry38nm.js:466-520 placement
/**
 * shardedSnowflakeOff：插件开关（默认关时返回 true）。
 */
function shardedSnowflakeOff() {
  return !getFeatureValue_CACHED_MAY_BE_STALE("tengu_sharded_snowflake", false);
}
//@ chunk-f3ry38nm.js:520-1196 placement
function describePluginEvalAvailability() {
  if (shardedSnowflakeOff())
    return {
      enabled: true,
      text: "`claude plugin eval` is available in this session (generally available; no enablement setting is needed on any client, including Bedrock/Vertex/Foundry, LLM gateways, telemetry-disabled clients and CI runners).",
    };
  return {
    enabled: false,
    text: '`claude plugin eval` is generally available but switched OFF for this session by a server-side kill switch: it exists but prints "currently unavailable" here. If the user asks about it, say that plainly rather than that it does not exist; there is no setting or variable that turns it back on, and `claude update` plus a fresh session picks the command up again once the switch is lifted.',
  };
}
export {
  encapsulatedPebbleEnabled,
  isPluginDirectoryModeOn,
  lanternPrismEnabled,
  describePluginEvalAvailability,
  shardedSnowflakeOff,
};
