/**
 * utils/permissions/autoModeTransition.ts
 *
 * 2.1.316 新增：自动模式转换判定
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-01b7fqej.js (5)
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

//@ chunk-01b7fqej.js:4849-4931 placement
function isAutoModeTransitionDue(context, fastMode) {
  return (
    (context.isAutoModeAvailable === false ||
      Boolean(fastMode) ||
      isAntInternalFastModelId(getMainLoopModel())) &&
    isAutoModeGateEnabled()
  );
}
//@ chunk-01b7fqej.js:4931-4974 placement
function checkAutoModeTransition(context, setAppState, fastMode, timeoutMs) {
  return evaluateAutoModeGate(context, setAppState, fastMode, timeoutMs, false);
}
//@ chunk-01b7fqej.js:4974-5017 placement
function checkAutoModeInUse(toolPermissionContext, setAppState, fastMode, timeoutMs) {
  return evaluateAutoModeGate(toolPermissionContext, setAppState, fastMode, timeoutMs, true);
}
//@ chunk-01b7fqej.js:5017-5298 placement
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
//@ chunk-01b7fqej.js:5298-5923 placement
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
