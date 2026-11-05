/**
 * utils/permissions/PermissionResult.ts
 *
 * 规则行为（allow/deny/ask）的描述文字。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/utils/permissions/PermissionResult.ts
 * pieces: chunk-5xgkngpb.js (1)
 * attribution: fingerprint 1
 */

//@ chunk-5xgkngpb.js:931106-931230 fingerprint (2.1.88 match: getRuleBehaviorDescription, 1)
/**
 * 规则行为的描述词：allow→"allowed"，deny→"denied"，其他→"asked for confirmation for"。
 */
function getRuleBehaviorDescription(permissionResult) {
  switch (permissionResult) {
    case "allow":
      return "allowed";
    case "deny":
      return "denied";
    default:
      return "asked for confirmation for";
  }
}
export { getRuleBehaviorDescription };
