/**
 * utils/permissions/PermissionResult.ts
 *
 * 规则行为（allow/deny/ask）的描述文字。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/utils/permissions/PermissionResult.ts
 * pieces: chunk-e6aww6q8.js (1)
 * attribution: fingerprint 1
 */

/**
 * 规则行为的描述词：allow→"allowed"，deny→"denied"，其他→"asked for confirmation for"。
 */
//@ chunk-e6aww6q8.js:920605-920729 fingerprint = getRuleBehaviorDescription (1)
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
