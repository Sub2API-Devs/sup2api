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
  Yqe,
  createPermissionRequest,
  sendPermissionRequestViaMailbox,
} from "../../../utils/swarm/permissionSync.js";
import { createResolveOnce } from "../PermissionContext.js";
import { registerPermissionCallback, unregisterPermissionCallback } from "../../useSwarmPermissionPoller.js";
import { BVt } from "../../../utils/stableHash.js";
import { pae } from "../../../tools/REPLTool/constants.js";
import { logFeatureBad, logFeatureSad, logFeatureOk } from "../../../services/analytics/featureTelemetry.js";
import { logError } from "../../../utils/log.js";
import { toError } from "../../../utils/errors.js";

/**
 * 队友权限：把请求写入领导的 mailbox（permission_swarm_forward），注册回调等待 useSwarmPermissionPoller 收到回复；写入失败时提示无法送达。
 */
//@ chunk-18hwfzwa.js:1645261-1647210 fingerprint = handleSwarmWorkerPermission (0.64)
async function handleSwarmWorkerPermission(params) {
  if (!isAgentSwarmsEnabled() || !Yqe()) return null;
  let { ctx: ctx, description: description, updatedInput: updatedInput, suggestions: suggestions } = params,
    { askSuppressesAlwaysAllowRule: askSuppressesAlwaysAllowRule, matchedAskRule: matchedAskRule } = params,
    Be = updatedInput ?? ctx.input;
  try {
    let clearPendingRequest = () =>
        ctx.toolUseContext.setAppState((prev) => ({ ...prev, pendingWorkerRequest: null })),
      We = !1,
      ze = null,
      Xe = !1,
      decision = await new Promise((resolve) => {
        let { resolve: resolveOnce, claim: claim, isResolved: isResolved } = createResolveOnce(resolve),
          request = createPermissionRequest({
            toolName: ctx.tool.name,
            toolUseId: ctx.toolUseID,
            input: Be,
            description: description,
            permissionSuggestions: suggestions,
          });
        (registerPermissionCallback({
          requestId: request.id,
          toolUseId: ctx.toolUseID,
          toolName: request.toolName,
          inputDigest: BVt(request.toolName, Be),
          onAllow(Dt, Lt, oo, Xt) {
            if (!claim()) return;
            clearPendingRequest();
            let io = Dt && Object.keys(Dt).length > 0 ? Dt : Be;
            resolveOnce(
              ctx.handleUserAllow(io, Lt, {
                feedback: oo,
                contentBlocks: Xt,
                askSuppressesAlwaysAllowRule: askSuppressesAlwaysAllowRule,
                matchedAskRule: matchedAskRule,
              }),
            );
          },
          onReject(Dt, Lt) {
            if (!claim()) return;
            (clearPendingRequest(),
              ctx.logDecision({ decision: "reject", source: { type: "user_reject", hasFeedback: !!Dt } }),
              resolveOnce(ctx.cancelAndAbort(Dt, void 0, Lt)));
          },
          onRefuse(Dt, Lt) {
            if (!claim()) return;
            (clearPendingRequest(), (ze = Lt), resolveOnce({ behavior: "ask", message: Dt }));
          },
          onUnboundVerdict() {
            if (isResolved()) return;
            Xe = !0;
          },
        }),
          sendPermissionRequestViaMailbox(request, ctx.toolUseContext.storageV5).then((prev) => {
            if (prev || !claim()) return;
            (unregisterPermissionCallback(request.id),
              (We = !0),
              clearPendingRequest(),
              resolveOnce({
                behavior: "ask",
                message:
                  "The permission request could not be delivered to the team lead (mailbox write failed). Retry the tool call, or ask the lead directly.",
              }));
          }),
          ctx.toolUseContext.setAppState((Dt) => ({
            ...Dt,
            pendingWorkerRequest: {
              toolName: pae(ctx.tool.name),
              toolUseId: ctx.toolUseID,
              description: description,
            },
          })),
          ctx.toolUseContext.abortController.signal.addEventListener(
            "abort",
            () => {
              if (!claim()) return;
              (unregisterPermissionCallback(request.id),
                clearPendingRequest(),
                ctx.logCancelled(),
                resolveOnce(ctx.cancelAndAbort(void 0, !0)));
            },
            { once: !0 },
          ));
      });
    if (We) logFeatureBad("permission_swarm_forward", "mailbox_write_failed");
    else if (ze !== null)
      logFeatureSad(
        "permission_swarm_forward",
        ze === "denial" ? "denial_binding_mismatch" : "approval_binding_mismatch",
      );
    else if (Xe) logFeatureSad("permission_swarm_forward", "verdict_unbound");
    else logFeatureOk("permission_swarm_forward");
    return decision;
  } catch (error) {
    return (
      logFeatureBad("permission_swarm_forward", "permission_swarm_forward_failed"),
      logError(toError(error)),
      null
    );
  }
}

export { handleSwarmWorkerPermission };
