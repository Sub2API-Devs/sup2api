/**
 * components/AutoDefaultNudge.tsx
 *
 * 2.1.316 新增。提示把 auto 设为默认权限模式。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-czq1j3j2.js (3)
 * attribution: placement 3
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { init_react_production } from "../../vendor/react/cjs/react.production.js";
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
import { deferInit } from "../../runtime/deferred-init.js";

//@ chunk-czq1j3j2.js:153163-153167 placement
// deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-czq1j3j2.js:153163", () => {
  init_react_production();
});
//@ chunk-czq1j3j2.js:157843-158098 placement
function resolveAutoDefaultNudge(choice, currentMode, context) {
  let outcome = choice === "accept" ? switchToAutoByDefault(context) : "declined";
  if (outcome !== "gate_off")
    saveGlobalConfig(
      (config) =>
        config.hasSeenAutoDefaultNudge
          ? config
          : {
              ...config,
              hasSeenAutoDefaultNudge: true,
            },
      context.storageV5,
    ).catch(logError);
  logEvent("tengu_auto_default_nudge_resolved", {
    choice: fromEnum(choice),
    outcome: fromEnum(outcome),
    current_mode: fromEnum(currentMode),
  });
}
//@ chunk-czq1j3j2.js:158098-158520 placement
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
export { resolveAutoDefaultNudge };
