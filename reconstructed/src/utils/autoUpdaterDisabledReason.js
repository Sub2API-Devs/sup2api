/**
 * utils/autoUpdaterDisabledReason.ts
 *
 * 2.1.316 新增：自动更新被禁用原因
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-t9wvryrs.js (2)
 * attribution: placement 2
 */
import { isChildSession } from "./sessionShape.js";
import { getEligibilityMemo } from "../services/remoteManagedSettings/remoteSettingsState.js";
import { getRemoteManagedSettingsSyncFromCache } from "../services/remoteManagedSettings/remoteSettingsCache.js";
import { getEnabledSettingSources } from "./settings/constants.js";
import { getSettingsWithErrors_2, getSettingsForSource } from "./settings/settings.js";
import { isEnvTruthy } from "./envUtils.js";

/**
 * 自动更新被禁用的原因：嵌套会话、托管设置未加载、未读用户设置、设置不可读，或在环境变量设置中关闭；都不是则为 null。
 */
//@ chunk-t9wvryrs.js:2141-2537 placement
function autoUpdaterDisabledReason(n) {
  if (isChildSession()) return "nested session";
  if (getEligibilityMemo() !== !1 && !getRemoteManagedSettingsSyncFromCache())
    return "server-managed settings not loaded";
  let t = getEnabledSettingSources();
  if (!t.includes("userSettings")) return "user settings not read";
  if (
    getSettingsWithErrors_2().errors.some(
      (error) => error.severity !== "warning" || error.path === "env" || error.path === "",
    )
  )
    return "settings not readable";
  return [n, ...t.map((e) => getSettingsForSource(e)?.env)].some((e) =>
    Object.entries(e ?? {}).some(isUpdateDisablingEnv),
  )
    ? "turned off in settings"
    : null;
}
//@ chunk-t9wvryrs.js:2537-2719 placement
function isUpdateDisablingEnv([n, t]) {
  switch (n.toUpperCase()) {
    case "DISABLE_AUTOUPDATER":
    case "DISABLE_UPDATES":
      return isEnvTruthy(t);
    case "CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC":
      return t !== "";
    default:
      return !1;
  }
}
