/**
 * hooks/toolPermission/handlers/swarmWorkerHandler.ts
 *
 * 队友（swarm worker）权限：通过 mailbox 把请求转发给领导，等待批准/拒绝。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/hooks/toolPermission/handlers/swarmWorkerHandler.ts
 * pieces: chunk-18hwfzwa.js (1)
 * attribution: fingerprint 1
 */
import { isAgentSwarmsEnabled } from "../../../utils/agentSwarmsEnabled.js";
import {
  isTeammateContextReady,
  createPermissionRequest,
  sendPermissionRequestViaMailbox,
} from "../../../utils/swarm/permissionSync.js";
import { createResolveOnce } from "../PermissionContext.js";
import { registerPermissionCallback, unregisterPermissionCallback } from "../../useSwarmPermissionPoller.js";
import { stableHashOfJson } from "../../../utils/stableHash.js";
import { identity as identity_3 } from "../../../tools/REPLTool/constants.js";
import { logFeatureBad, logFeatureSad, logFeatureOk } from "../../../services/analytics/featureTelemetry.js";
import { logError } from "../../../utils/log.js";
import { toError } from "../../../utils/errors.js";

//@ chunk-18hwfzwa.js:1645261-1647210 fingerprint = handleSwarmWorkerPermission (0.64)
/**
 * 队友权限：把请求写入领导的 mailbox（permission_swarm_forward），注册回调等待 useSwarmPermissionPoller 收到回复；写入失败时提示无法送达。
 */
async function handleSwarmWorkerPermission(params) {
  if (!isAgentSwarmsEnabled() || !isTeammateContextReady()) return null;
  let { ctx, description, updatedInput, suggestions } = params;
  let { askSuppressesAlwaysAllowRule, matchedAskRule } = params;
  let effectiveInput = updatedInput ?? ctx.input;
  try {
    let clearPendingRequest = () =>
      ctx.toolUseContext.setAppState((prev) => ({
        ...prev,
        pendingWorkerRequest: null,
      }));
    let mailboxFailed = false;
    let bindingMismatch = null;
    let verdictUnbound = false;
    let decision = await new Promise((resolve) => {
      let { resolve: resolveOnce, claim, isResolved } = createResolveOnce(resolve);
      let request = createPermissionRequest({
        toolName: ctx.tool.name,
        toolUseId: ctx.toolUseID,
        input: effectiveInput,
        description,
        permissionSuggestions: suggestions,
      });
      registerPermissionCallback({
        requestId: request.id,
        toolUseId: ctx.toolUseID,
        toolName: request.toolName,
        inputDigest: stableHashOfJson(request.toolName, effectiveInput),
        onAllow(allowedInput, permissionUpdates, feedback, contentBlocks) {
          if (!claim()) return;
          clearPendingRequest();
          let finalInput =
            allowedInput && Object.keys(allowedInput).length > 0 ? allowedInput : effectiveInput;
          resolveOnce(
            ctx.handleUserAllow(finalInput, permissionUpdates, {
              feedback,
              contentBlocks,
              askSuppressesAlwaysAllowRule,
              matchedAskRule,
            }),
          );
        },
        onReject(feedback, contentBlocks) {
          if (!claim()) return;
          clearPendingRequest();
          ctx.logDecision({
            decision: "reject",
            source: {
              type: "user_reject",
              hasFeedback: !!feedback,
            },
          });
          resolveOnce(ctx.cancelAndAbort(feedback, undefined, contentBlocks));
        },
        onRefuse(message, mismatchKind) {
          if (!claim()) return;
          clearPendingRequest();
          bindingMismatch = mismatchKind;
          resolveOnce({
            behavior: "ask",
            message,
          });
        },
        onUnboundVerdict() {
          if (isResolved()) return;
          verdictUnbound = true;
        },
      });
      sendPermissionRequestViaMailbox(request, ctx.toolUseContext.storageV5).then((prev) => {
        if (prev || !claim()) return;
        unregisterPermissionCallback(request.id);
        mailboxFailed = true;
        clearPendingRequest();
        resolveOnce({
          behavior: "ask",
          message:
            "The permission request could not be delivered to the team lead (mailbox write failed). Retry the tool call, or ask the lead directly.",
        });
      });
      ctx.toolUseContext.setAppState((prev) => ({
        ...prev,
        pendingWorkerRequest: {
          toolName: identity_3(ctx.tool.name),
          toolUseId: ctx.toolUseID,
          description,
        },
      }));
      ctx.toolUseContext.abortController.signal.addEventListener(
        "abort",
        () => {
          if (!claim()) return;
          unregisterPermissionCallback(request.id);
          clearPendingRequest();
          ctx.logCancelled();
          resolveOnce(ctx.cancelAndAbort(undefined, true));
        },
        {
          once: true,
        },
      );
    });
    if (mailboxFailed) logFeatureBad("permission_swarm_forward", "mailbox_write_failed");
    else if (bindingMismatch !== null)
      logFeatureSad(
        "permission_swarm_forward",
        bindingMismatch === "denial" ? "denial_binding_mismatch" : "approval_binding_mismatch",
      );
    else if (verdictUnbound) logFeatureSad("permission_swarm_forward", "verdict_unbound");
    else logFeatureOk("permission_swarm_forward");
    return decision;
  } catch (error) {
    logFeatureBad("permission_swarm_forward", "permission_swarm_forward_failed");
    logError(toError(error));
    return null;
  }
}
export { handleSwarmWorkerPermission };
