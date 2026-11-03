/**
 * components/AutoDefaultNudge.tsx
 *
 * 2.1.316 新增。提示把 auto 设为默认权限模式。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-18hwfzwa.js (3)
 * attribution: placement 3
 */
import { saveGlobalConfig } from "../utils/config.js";
import { logError } from "../utils/log.js";
import { logEvent } from "../services/analytics/index.js";
import { fromEnum } from "../services/analytics/safeMetadata.js";
import { canCycleToAuto } from "../utils/permissions/getNextPermissionMode.js";
import {
  setPermissionModeWithGuards,
  getAutoModeUnavailableText,
} from "../utils/permissions/permissionSetup.js";
import { updateSettingsForSource } from "../utils/settings/settings.js";
import { announce } from "../utils/accessibility/screenReader.js";
import { permissionModeIndicator } from "../utils/permissions/PermissionMode.js";
import { j } from "../../vendor/react/cjs/react.production.js";

//@ chunk-18hwfzwa.js:153747-154002 placement
function resolveAutoDefaultNudge(h, x, D) {
  let L = h === "accept" ? switchToAutoByDefault(D) : "declined";
  if (L !== "gate_off")
    saveGlobalConfig(
      (ee) => (ee.hasSeenAutoDefaultNudge ? ee : { ...ee, hasSeenAutoDefaultNudge: !0 }),
      D.storageV5,
    ).catch(logError);
  logEvent("tengu_auto_default_nudge_resolved", {
    choice: fromEnum(h),
    outcome: fromEnum(L),
    current_mode: fromEnum(x),
  });
}
//@ chunk-18hwfzwa.js:154002-154424 placement
function switchToAutoByDefault({
  getToolPermissionContext: getToolPermissionContext,
  setToolPermissionContext: setToolPermissionContext,
  addNotification: addNotification,
  storageV5: storageV5,
}) {
  let ee = getToolPermissionContext();
  if (canCycleToAuto(ee)) {
    if (setPermissionModeWithGuards("auto", ee, setToolPermissionContext, "auto_default_nudge").ok)
      return (
        updateSettingsForSource(
          "userSettings",
          { permissions: { defaultMode: "auto" } },
          void 0,
          storageV5,
        ).catch(logError),
        announce(`[${permissionModeIndicator("auto")} on]`),
        "switched"
      );
  }
  let ke = getAutoModeUnavailableText();
  return (
    addNotification({
      key: "auto-default-nudge-unavailable",
      kind: "warning",
      text: ke,
      color: "warning",
      priority: "high",
    }),
    announce(`[${ke}]`),
    "gate_off"
  );
}
//@ chunk-18hwfzwa.js:154424-154428 placement
j();

export { resolveAutoDefaultNudge };
