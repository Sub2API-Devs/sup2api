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
function resolveHookPermissionResult(remoteCall, hookName, r) {
  let s = `Hook ${hookName} ${getRuleBehaviorDescription("deny")} this tool`;
  let h;
  switch (r.permissionBehavior) {
    case "deny":
      h = r.hookPermissionDecisionReason || s;
      break;
    case "defer":
      if (remoteCall.strictestHookAnswer?.behavior !== "deny")
        h = getCloudDeferUnsupportedMessage(r.hookSource || hookName);
      break;
    case "ask":
      if (remoteCall.strictestHookAnswer?.behavior !== "deny")
        remoteCall.strictestHookAnswer = {
          behavior: "ask",
          message:
            r.hookPermissionDecisionReason ||
            `Hook ${hookName} ${getRuleBehaviorDescription("ask")} this tool`,
          decisionReason: {
            type: "hook",
            hookName,
            hookSource: r.hookSource,
            reason: r.hookPermissionDecisionReason,
            ...(r.heldForServedCall && {
              heldForServedCall: true,
            }),
          },
        };
      break;
    case "allow":
    case "passthrough":
    case undefined:
      break;
    default:
      r.permissionBehavior;
      h = s;
  }
  if (r.blockingError !== undefined && r.permissionBehavior !== "deny")
    h = getPreToolHookBlockingMessage(hookName, r.blockingError);
  if (h !== undefined)
    remoteCall.strictestHookAnswer = {
      behavior: "deny",
      message: h,
      decisionReason: {
        type: "hook",
        hookName,
        reason: h,
      },
    };
}
//@ chunk-e6aww6q8.js:922063-922105 placement
/**
 * 记录最严格的钩子答复（用于权限判定）。
 */
function setStrictestHookAnswer(remoteCall, strictestHookAnswer) {
  remoteCall.strictestHookAnswer = strictestHookAnswer;
}
export { resolveHookPermissionResult, setStrictestHookAnswer };
