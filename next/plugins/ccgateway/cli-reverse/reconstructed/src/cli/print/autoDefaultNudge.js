/**
 * cli/print/autoDefaultNudge.ts
 *
 * 2.1.316 新增。处理宿主发来的"默认改为 auto 模式"提示事件，记录展示与用户接受/拒绝（tengu_auto_default_nudge_*）。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-pctkwkfk.js (2)
 * attribution: placement 2
 */
import { getGlobalConfig, saveGlobalConfig } from "../../utils/config.js";
import { getFeatureValue_CACHED_MAY_BE_STALE } from "../../services/analytics/growthbook.js";
import { getSettingsForSource, updateSettingsForSource } from "../../utils/settings/settings.js";
import { canCycleToAuto } from "../../utils/permissions/getNextPermissionMode.js";
import { parsePermissionMode } from "../../types/permissions.js";
import { logEvent } from "../../services/analytics/index.js";
import { fromEnumOpt, lit } from "../../services/analytics/safeMetadata.js";

//@ chunk-pctkwkfk.js:416-782 placement
function shouldShowAutoDefaultNudge(toolPermissionContext, { requireOnboarding = true } = {}) {
  let globalConfig = getGlobalConfig();
  if (
    (requireOnboarding && !globalConfig.hasCompletedOnboarding) ||
    globalConfig.hasSeenAutoDefaultNudge ||
    !getFeatureValue_CACHED_MAY_BE_STALE("tengu_maple_pier", true)
  )
    return null;
  let defaultMode = getSettingsForSource("userSettings")?.permissions?.defaultMode;
  let any = ["projectSettings", "localSettings", "flagSettings", "policySettings"].some(
    (settingsSource) => getSettingsForSource(settingsSource)?.permissions?.defaultMode,
  );
  if (defaultMode && defaultMode !== "auto" && !any && canCycleToAuto(toolPermissionContext))
    return defaultMode;
  return null;
}
//@ chunk-pctkwkfk.js:782-1298 placement (2.1.88 match: AutoModeOptInDialog, 0.312)
/**
 * auto 模式默认开启提示：accept 写 userSettings 为 auto，decline 保持；记录 tengu_auto_default_nudge_shown。
 */
function handleAutoDefaultNudgeEventFromHost(event, payload, storageV5) {
  if (getGlobalConfig().hasSeenAutoDefaultNudge) return;
  let permissionMode = parsePermissionMode(payload.current_mode);
  if (event === "shown") {
    logEvent("tengu_auto_default_nudge_shown", {
      current_mode: fromEnumOpt(permissionMode),
      surface: lit("ide"),
    });
    return;
  }
  let t6 = payload.choice === "accept" ? "accept" : "decline";
  if (t6 === "accept")
    updateSettingsForSource(
      "userSettings",
      {
        permissions: {
          defaultMode: "auto",
        },
      },
      undefined,
      storageV5,
    );
  saveGlobalConfig(
    (value_0) =>
      value_0.hasSeenAutoDefaultNudge
        ? value_0
        : {
            ...value_0,
            hasSeenAutoDefaultNudge: true,
          },
    storageV5,
  );
  logEvent("tengu_auto_default_nudge_resolved", {
    choice: lit(t6),
    outcome: t6 === "accept" ? lit("switched") : lit("declined"),
    current_mode: fromEnumOpt(permissionMode),
    surface: lit("ide"),
  });
}
export { handleAutoDefaultNudgeEventFromHost, shouldShowAutoDefaultNudge };
