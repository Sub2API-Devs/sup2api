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
import { init_react_production } from "../../vendor/react/cjs/react.production.js";

//@ chunk-18hwfzwa.js:153747-154002 placement
function resolveAutoDefaultNudge(h, x, D) {
  let L = h === "accept" ? switchToAutoByDefault(D) : "declined";
  if (L !== "gate_off")
    saveGlobalConfig(
      (ee) =>
        ee.hasSeenAutoDefaultNudge
          ? ee
          : {
              ...ee,
              hasSeenAutoDefaultNudge: true,
            },
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
  getToolPermissionContext,
  setToolPermissionContext,
  addNotification,
  storageV5,
}) {
  let toolPermissionContext = getToolPermissionContext();
  if (canCycleToAuto(toolPermissionContext)) {
    if (
      setPermissionModeWithGuards(
        "auto",
        toolPermissionContext,
        setToolPermissionContext,
        "auto_default_nudge",
      ).ok
    ) {
      updateSettingsForSource(
        "userSettings",
        {
          permissions: {
            defaultMode: "auto",
          },
        },
        undefined,
        storageV5,
      ).catch(logError);
      announce(`[${permissionModeIndicator("auto")} on]`);
      return "switched";
    }
  }
  let autoModeUnavailableText = getAutoModeUnavailableText();
  addNotification({
    key: "auto-default-nudge-unavailable",
    kind: "warning",
    text: autoModeUnavailableText,
    color: "warning",
    priority: "high",
  });
  announce(`[${autoModeUnavailableText}]`);
  return "gate_off";
}
//@ chunk-18hwfzwa.js:154424-154428 placement
init_react_production();
export { resolveAutoDefaultNudge };
