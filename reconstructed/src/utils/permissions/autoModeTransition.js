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
function isAutoModeTransitionDue(e, r) {
  return (
    (e.isAutoModeAvailable === false || Boolean(r) || isAntInternalFastModelId(getMainLoopModel())) &&
    isAutoModeGateEnabled()
  );
}
//@ chunk-pc1rmcr2.js:4888-4931 placement
function checkAutoModeTransition(e, r, o, d) {
  return evaluateAutoModeGate(e, r, o, d, false);
}
//@ chunk-pc1rmcr2.js:4931-4977 placement
function checkAutoModeInUse(toolPermissionContext, r, fastMode) {
  return evaluateAutoModeGate(toolPermissionContext, r, fastMode, undefined, true);
}
//@ chunk-pc1rmcr2.js:4977-5258 placement
async function applyAutoModeTransition(toolPermissionContext, r, fastMode, d) {
  switch (await checkAutoModeTransition(toolPermissionContext, r, fastMode, d)) {
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
async function evaluateAutoModeGate(e, r, o, d, u) {
  if (!isAutoModeTransitionDue(e, o) || (u && isAutoModeInUse(e))) return "not-due";
  let c = verifyAutoModeGateAccess(e, o)
    .then(({ updateContext, canEnterAuto, refusedForSettingsAlone }) => {
      let n = false;
      if (!refusedForSettingsAlone)
        r((s) => {
          let toolPermissionContext = s.toolPermissionContext;
          if (!canEnterAuto) {
            if (u && isAutoModeInUse(toolPermissionContext)) return s;
            let h = updateContext(toolPermissionContext);
            return h === toolPermissionContext
              ? s
              : {
                  ...s,
                  toolPermissionContext: h,
                };
          }
          n = Boolean(s.fastMode) && !o;
          if (
            toolPermissionContext.isAutoModeAvailable !== false ||
            !isAutoModeGateEnabled() ||
            Boolean(s.fastMode) !== Boolean(o)
          )
            return s;
          return {
            ...s,
            toolPermissionContext: {
              ...toolPermissionContext,
              isAutoModeAvailable: canEnterAuto,
              canAutoClassifierRun: canEnterAuto,
            },
          };
        });
      if (!canEnterAuto) return "refused";
      return n ? "unanswered" : "allowed";
    })
    .catch((error) => {
      logError(toError(error));
      return "unanswered";
    });
  return (await (d === undefined ? c : withDeadline(c, d))) ?? "unanswered";
}
export { checkAutoModeTransition, isAutoModeTransitionDue, checkAutoModeInUse, applyAutoModeTransition };
