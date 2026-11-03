/**
 * utils/hooks/hookPermissionResult.ts
 *
 * 2.1.316 新增：钩子权限结果
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-e6aww6q8.js (2)
 * attribution: placement 2
 */
import { getRuleBehaviorDescription } from "../permissions/PermissionResult.js";
import { getCloudDeferUnsupportedMessage, getPreToolHookBlockingMessage } from "../hooks.js";

//@ chunk-e6aww6q8.js:921230-922063 placement
function resolveHookPermissionResult(e, n, r) {
  let s = `Hook ${n} ${getRuleBehaviorDescription("deny")} this tool`,
    h;
  switch (r.permissionBehavior) {
    case "deny":
      h = r.hookPermissionDecisionReason || s;
      break;
    case "defer":
      if (e.strictestHookAnswer?.behavior !== "deny") h = getCloudDeferUnsupportedMessage(r.hookSource || n);
      break;
    case "ask":
      if (e.strictestHookAnswer?.behavior !== "deny")
        e.strictestHookAnswer = {
          behavior: "ask",
          message:
            r.hookPermissionDecisionReason || `Hook ${n} ${getRuleBehaviorDescription("ask")} this tool`,
          decisionReason: {
            type: "hook",
            hookName: n,
            hookSource: r.hookSource,
            reason: r.hookPermissionDecisionReason,
            ...(r.heldForServedCall && { heldForServedCall: !0 }),
          },
        };
      break;
    case "allow":
    case "passthrough":
    case void 0:
      break;
    default:
      (r.permissionBehavior, (h = s));
  }
  if (r.blockingError !== void 0 && r.permissionBehavior !== "deny")
    h = getPreToolHookBlockingMessage(n, r.blockingError);
  if (h !== void 0)
    e.strictestHookAnswer = {
      behavior: "deny",
      message: h,
      decisionReason: { type: "hook", hookName: n, reason: h },
    };
}
//@ chunk-e6aww6q8.js:922063-922105 placement
function _1e(e, n) {
  e.strictestHookAnswer = n;
}

export { resolveHookPermissionResult, _1e };
