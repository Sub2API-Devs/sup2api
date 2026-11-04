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
function resolveHookPermissionResult(remoteCall, hookName, result) {
  let defaultMessage = `Hook ${hookName} ${getRuleBehaviorDescription("deny")} this tool`;
  let denyMessage;
  switch (result.permissionBehavior) {
    case "deny":
      denyMessage = result.hookPermissionDecisionReason || defaultMessage;
      break;
    case "defer":
      if (remoteCall.strictestHookAnswer?.behavior !== "deny")
        denyMessage = getCloudDeferUnsupportedMessage(result.hookSource || hookName);
      break;
    case "ask":
      if (remoteCall.strictestHookAnswer?.behavior !== "deny")
        remoteCall.strictestHookAnswer = {
          behavior: "ask",
          message:
            result.hookPermissionDecisionReason ||
            `Hook ${hookName} ${getRuleBehaviorDescription("ask")} this tool`,
          decisionReason: {
            type: "hook",
            hookName,
            hookSource: result.hookSource,
            reason: result.hookPermissionDecisionReason,
            ...(result.heldForServedCall && {
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
      result.permissionBehavior;
      denyMessage = defaultMessage;
  }
  if (result.blockingError !== undefined && result.permissionBehavior !== "deny")
    denyMessage = getPreToolHookBlockingMessage(hookName, result.blockingError);
  if (denyMessage !== undefined)
    remoteCall.strictestHookAnswer = {
      behavior: "deny",
      message: denyMessage,
      decisionReason: {
        type: "hook",
        hookName,
        reason: denyMessage,
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
