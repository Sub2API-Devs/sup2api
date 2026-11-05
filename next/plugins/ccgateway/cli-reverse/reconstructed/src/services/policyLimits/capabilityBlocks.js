/**
 * services/policyLimits/capabilityBlocks.ts
 *
 * 2.1.316 新增：能力阻断的种类（MCP 需认证、认证过期、沙箱违规、策略拒绝等）；认证过期的阻断描述等。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-bvz8t570.js (10)
 * attribution: placement 10
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */

//@ chunk-bvz8t570.js:892-903 placement
var activeFeatureReader = null;
//@ chunk-bvz8t570.js:903-940 placement
/**
 * 临时替换功能读取器（返回恢复函数），用于策略探测。
 */
function swapFeatureReader(getFeatureValue_SESSION_PINNED) {
  let previous = activeFeatureReader;
  activeFeatureReader = getFeatureValue_SESSION_PINNED;
  return previous;
}
//@ chunk-bvz8t570.js:940-1004 placement
/**
 * 读 cobolt 策略开关（allow_cobalt_* 系列）。
 */
function isCobaltGateOn() {
  return activeFeatureReader?.("tengu_cobalt_plinth_lovage", false) === true;
}
//@ chunk-bvz8t570.js:1004-1467 placement
/**
 * 能力阻断的种类（MCP 需认证、认证过期、沙箱违规、策略拒绝等）。
 */
var CAPABILITY_BLOCK_KINDS = [
  "mcp_needs_auth",
  "mcp_disabled",
  "mcp_required_missing",
  "auth_expired",
  "auth_overridden",
  "auth_missing_scope",
  "design_needs_authorization",
  "sandbox_violation",
  "outside_reads_blocked",
  "memory_paused",
  "feature_disabled",
  "policy_denied",
  "spawn_arg_limit",
  "staged_for_review",
];
var AUTH_PROVIDER_VALUES = ["claude_ai", "claude_design"];
var BLOCKABLE_FEATURES = ["workflows", "artifacts"];
var FEATURE_DISABLED_CAUSES = [
  "managed_settings",
  "org_policy",
  "unavailable",
  "user_setting",
  "unsupported_runtime",
];
var POLICY_DENIAL_KINDS = ["org_denied", "latched"];
//@ chunk-bvz8t570.js:1467-1531 placement
/**
 * 认证过期的阻断描述。
 */
function authExpiredBlock() {
  return {
    kind: "auth_expired",
    provider: "claude_ai",
  };
}
//@ chunk-bvz8t570.js:1531-1609 placement
/**
 * 认证提供方被覆盖时对应的功能屏蔽说明。
 */
function authOverriddenBlock(managed) {
  return {
    kind: "auth_overridden",
    provider: "claude_ai",
    managed,
  };
}
//@ chunk-bvz8t570.js:1609-1721 placement
/**
 * 按令牌来源给出认证过期阻断。
 */
function authExpiredBlockFor(claudeAIOAuthTokenOrigin) {
  switch (claudeAIOAuthTokenOrigin) {
    case "env":
      return authOverriddenBlock(false);
    case "fd":
      return authOverriddenBlock(true);
    case "store":
    case "none":
      return authExpiredBlock();
  }
}
//@ chunk-bvz8t570.js:1721-1739 placement
var weakMap = new WeakMap();
//@ chunk-bvz8t570.js:1739-1776 placement
/**
 * 给对象打标记（弱映射）。
 */
function tagObject(object, tag) {
  weakMap.set(object, tag);
  return object;
}
//@ chunk-bvz8t570.js:1776-1848 placement
/**
 * 取对象上带类型标记的字段。
 */
function getTaggedObject(object) {
  if (object === null || typeof object !== "object") return;
  return weakMap.get(object);
}
export {
  CAPABILITY_BLOCK_KINDS,
  AUTH_PROVIDER_VALUES,
  BLOCKABLE_FEATURES,
  FEATURE_DISABLED_CAUSES,
  POLICY_DENIAL_KINDS,
  tagObject,
  isCobaltGateOn,
  authExpiredBlock,
  getTaggedObject,
  authExpiredBlockFor,
  swapFeatureReader,
  authOverriddenBlock,
};
