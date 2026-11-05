/**
 * utils/autoUpdaterDisabledReason.ts
 *
 * 2.1.316 新增：自动更新被禁用原因
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-n94asky1.js (2)
 * attribution: placement 2
 */
import { isChildSession } from "./sessionShape.js";
import { getEligibilityMemo } from "../services/remoteManagedSettings/remoteSettingsState.js";
import { getRemoteManagedSettingsSyncFromCache } from "../services/remoteManagedSettings/remoteSettingsCache.js";
import { getEnabledSettingSources } from "./settings/constants.js";
import { getSettingsWithErrors, getSettingsForSource } from "./settings/settings.js";
import { isEnvTruthy } from "./envUtils.js";

//@ chunk-n94asky1.js:2365-2761 placement
/**
 * 自动更新被禁用的原因：嵌套会话、托管设置未加载、未读用户设置、设置不可读，或在环境变量设置中关闭；都不是则为 null。
 */
function autoUpdaterDisabledReason(envObject) {
  if (isChildSession()) return "nested session";
  if (getEligibilityMemo() !== false && !getRemoteManagedSettingsSyncFromCache())
    return "server-managed settings not loaded";
  let enabledSettingSources = getEnabledSettingSources();
  if (!enabledSettingSources.includes("userSettings")) return "user settings not read";
  if (
    getSettingsWithErrors().errors.some(
      (error) => error.severity !== "warning" || error.path === "env" || error.path === "",
    )
  )
    return "settings not readable";
  return [
    envObject,
    ...enabledSettingSources.map((enabledSettingSource) => getSettingsForSource(enabledSettingSource)?.env),
  ].some((env) => Object.entries(env ?? {}).some(isUpdateDisablingEnv))
    ? "turned off in settings"
    : null;
}
//@ chunk-n94asky1.js:2761-2943 placement
function isUpdateDisablingEnv([key, value]) {
  switch (key.toUpperCase()) {
    case "DISABLE_AUTOUPDATER":
    case "DISABLE_UPDATES":
      return isEnvTruthy(value);
    case "CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC":
      return value !== "";
    default:
      return false;
  }
}
export { autoUpdaterDisabledReason };
