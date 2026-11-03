/**
 * services/policyLimits/capabilityBlocks.ts
 *
 * 2.1.316 新增：能力阻断的种类（MCP 需认证、认证过期、沙箱违规、策略拒绝等）；认证过期的阻断描述等。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-yxnffbzs.js (10)
 * attribution: placement 10
 */

//@ chunk-yxnffbzs.js:919-930 placement
var activeFeatureReader = null;
//@ chunk-yxnffbzs.js:930-967 placement
/**
 * 临时替换功能读取器（返回恢复函数），用于策略探测。
 */
function swapFeatureReader(getFeatureValue_SESSION_PINNED) {
  let n = activeFeatureReader;
  activeFeatureReader = getFeatureValue_SESSION_PINNED;
  return n;
}
//@ chunk-yxnffbzs.js:967-1031 placement
/**
 * 读 cobolt 策略开关（allow_cobalt_* 系列）。
 */
function isCobaltGateOn() {
  return activeFeatureReader?.("tengu_cobalt_plinth_lovage", false) === true;
}
//@ chunk-yxnffbzs.js:1031-1494 placement
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
//@ chunk-yxnffbzs.js:1494-1558 placement
/**
 * 认证过期的阻断描述。
 */
function authExpiredBlock() {
  return {
    kind: "auth_expired",
    provider: "claude_ai",
  };
}
//@ chunk-yxnffbzs.js:1558-1636 placement
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
//@ chunk-yxnffbzs.js:1636-1748 placement
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
//@ chunk-yxnffbzs.js:1748-1766 placement
var weakMap = new WeakMap();
//@ chunk-yxnffbzs.js:1766-1803 placement
/**
 * 给对象打标记（弱映射）。
 */
function tagObject(e, n) {
  weakMap.set(e, n);
  return e;
}
//@ chunk-yxnffbzs.js:1803-1875 placement
/**
 * 取对象上带类型标记的字段。
 */
function getTaggedObject(e) {
  if (e === null || typeof e !== "object") return;
  return weakMap.get(e);
}
export {
  CAPABILITY_BLOCK_KINDS,
  AUTH_PROVIDER_VALUES,
  BLOCKABLE_FEATURES,
  FEATURE_DISABLED_CAUSES,
  POLICY_DENIAL_KINDS,
  tagObject,
  authExpiredBlockFor,
  authExpiredBlock,
  isCobaltGateOn,
  authOverriddenBlock,
  swapFeatureReader,
  getTaggedObject,
};
