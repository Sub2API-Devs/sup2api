/**
 * hooks/toolPermission/handlers/coordinatorHandler.ts
 *
 * 协调者模式的权限处理：先跑自动检查，失败或需要时再交互。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/hooks/toolPermission/handlers/coordinatorHandler.ts
 * pieces: chunk-s4bxxzsw.js (1)
 * attribution: fingerprint 1
 */
import { logError } from "../../../utils/log.js";
import { withTelemetryMessage } from "../../../utils/errors.js";
import { logFeatureBad, logFeatureOk } from "../../../services/analytics/featureTelemetry.js";

/**
 * 协调者模式：先运行自动权限检查，检查失败或需要人工时回到交互流程（reprompted）。
 */
//@ chunk-s4bxxzsw.js:3950-4589 fingerprint = handleCoordinatorPermission (0.46)
async function handleCoordinatorPermission(params) {
  let {
    ctx: ctx,
    updatedInput: updatedInput,
    suggestions: suggestions,
    permissionMode: permissionMode,
  } = params;
  if (params.askIsPersonOnly) return null;
  let R = !1;
  try {
    let runHooks = await ctx.runHooks(
      permissionMode,
      suggestions,
      params.askSuppressesAlwaysAllowRule,
      () => ctx.toolUseContext.abortController.signal.aborted,
      updatedInput,
    );
    if (runHooks && !("reprompted" in runHooks)) return runHooks;
  } catch (error) {
    if (((R = !0), error instanceof Error))
      logError(withTelemetryMessage(error, "coordinator automated permission check failed"));
    else
      logError(
        withTelemetryMessage(
          Error(`Automated permission check failed: ${String(error)}`),
          "coordinator automated permission check failed (non-Error throw)",
        ),
      );
  } finally {
    if (R) logFeatureBad("permission_coordinator_check", "permission_coordinator_check_failed");
    else logFeatureOk("permission_coordinator_check");
  }
  return null;
}

export { handleCoordinatorPermission };
