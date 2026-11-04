/**
 * utils/permissions/autoModeTransition.ts
 *
 * 2.1.316 新增：自动模式转换判定
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-pc1rmcr2.js (5)
 * attribution: placement 5
 */
import { isAntInternalFastModelId, getMainLoopModel } from "../model/model.js";
import {
  isAutoModeGateEnabled,
  refuseAutoMode,
  getAutoModeUnavailableReason,
  isAutoModeInUse,
  verifyAutoModeGateAccess,
} from "./permissionSetup.js";
import { logError } from "../log.js";
import { toError } from "../errors.js";
import { withDeadline } from "../sleep.js";

//@ chunk-pc1rmcr2.js:4806-4888 placement
function isAutoModeTransitionDue(context, fastMode) {
  return (
    (context.isAutoModeAvailable === false ||
      Boolean(fastMode) ||
      isAntInternalFastModelId(getMainLoopModel())) &&
    isAutoModeGateEnabled()
  );
}
//@ chunk-pc1rmcr2.js:4888-4931 placement
function checkAutoModeTransition(context, setAppState, fastMode, timeoutMs) {
  return evaluateAutoModeGate(context, setAppState, fastMode, timeoutMs, false);
}
//@ chunk-pc1rmcr2.js:4931-4977 placement
function checkAutoModeInUse(toolPermissionContext, setAppState, fastMode) {
  return evaluateAutoModeGate(toolPermissionContext, setAppState, fastMode, undefined, true);
}
//@ chunk-pc1rmcr2.js:4977-5258 placement
async function applyAutoModeTransition(context, setAppState, fastMode, timeoutMs) {
  switch (await checkAutoModeTransition(context, setAppState, fastMode, timeoutMs)) {
    case "not-due":
    case "allowed":
      return;
    case "refused":
      return refuseAutoMode(getAutoModeUnavailableReason());
    case "unanswered":
      return {
        ok: false,
        error: "Cannot set permission mode to auto: auto mode availability is not known yet \xB7 ask again",
        code: "auto_mode_unavailable",
      };
  }
}
//@ chunk-pc1rmcr2.js:5258-5883 placement
/**
 * 检查是否需要验证自动模式门控，并据此允许、拒绝或降级权限模式。
 */
async function evaluateAutoModeGate(context, setAppState, fastMode, timeoutMs, inUseOnly) {
  if (!isAutoModeTransitionDue(context, fastMode) || (inUseOnly && isAutoModeInUse(context)))
    return "not-due";
  let verification = verifyAutoModeGateAccess(context, fastMode)
    .then(({ updateContext, canEnterAuto, refusedForSettingsAlone }) => {
      let shouldReportUnanswered = false;
      if (!refusedForSettingsAlone)
        setAppState((state) => {
          let toolPermissionContext = state.toolPermissionContext;
          if (!canEnterAuto) {
            if (inUseOnly && isAutoModeInUse(toolPermissionContext)) return state;
            let updatedContext = updateContext(toolPermissionContext);
            return updatedContext === toolPermissionContext
              ? state
              : {
                  ...state,
                  toolPermissionContext: updatedContext,
                };
          }
          shouldReportUnanswered = Boolean(state.fastMode) && !fastMode;
          if (
            toolPermissionContext.isAutoModeAvailable !== false ||
            !isAutoModeGateEnabled() ||
            Boolean(state.fastMode) !== Boolean(fastMode)
          )
            return state;
          return {
            ...state,
            toolPermissionContext: {
              ...toolPermissionContext,
              isAutoModeAvailable: canEnterAuto,
              canAutoClassifierRun: canEnterAuto,
            },
          };
        });
      if (!canEnterAuto) return "refused";
      return shouldReportUnanswered ? "unanswered" : "allowed";
    })
    .catch((error) => {
      logError(toError(error));
      return "unanswered";
    });
  return (
    (await (timeoutMs === undefined ? verification : withDeadline(verification, timeoutMs))) ?? "unanswered"
  );
}
export { checkAutoModeTransition, isAutoModeTransitionDue, checkAutoModeInUse, applyAutoModeTransition };
