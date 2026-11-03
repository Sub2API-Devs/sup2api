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
var S = null;
//@ chunk-yxnffbzs.js:930-967 placement
function qAi(e) {
  let n = S;
  return ((S = e), n);
}
//@ chunk-yxnffbzs.js:967-1031 placement
function zhr() {
  return S?.("tengu_cobalt_plinth_lovage", !1) === !0;
}
/**
 * 能力阻断的种类（MCP 需认证、认证过期、沙箱违规、策略拒绝等）。
 */
//@ chunk-yxnffbzs.js:1031-1494 placement
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
  ],
  XAi = ["claude_ai", "claude_design"],
  JAi = ["workflows", "artifacts"],
  QAi = ["managed_settings", "org_policy", "unavailable", "user_setting", "unsupported_runtime"],
  ZAi = ["org_denied", "latched"];
/**
 * 认证过期的阻断描述。
 */
//@ chunk-yxnffbzs.js:1494-1558 placement
function authExpiredBlock() {
  return { kind: "auth_expired", provider: "claude_ai" };
}
//@ chunk-yxnffbzs.js:1558-1636 placement
function bdt(e) {
  return { kind: "auth_overridden", provider: "claude_ai", managed: e };
}
/**
 * 按令牌来源给出认证过期阻断。
 */
//@ chunk-yxnffbzs.js:1636-1748 placement
function authExpiredBlockFor(e) {
  switch (e) {
    case "env":
      return bdt(!1);
    case "fd":
      return bdt(!0);
    case "store":
    case "none":
      return authExpiredBlock();
  }
}
//@ chunk-yxnffbzs.js:1748-1766 placement
var weakMap = new WeakMap();
/**
 * 给对象打标记（弱映射）。
 */
//@ chunk-yxnffbzs.js:1766-1803 placement
function tagObject(e, n) {
  return (weakMap.set(e, n), e);
}
//@ chunk-yxnffbzs.js:1803-1875 placement
function eCi(e) {
  if (e === null || typeof e !== "object") return;
  return weakMap.get(e);
}

export {
  CAPABILITY_BLOCK_KINDS,
  XAi,
  JAi,
  QAi,
  ZAi,
  tagObject,
  authExpiredBlockFor,
  authExpiredBlock,
  zhr,
  bdt,
  qAi,
  eCi,
};
