/**
 * utils/teleport/homeSettingsMode.ts
 *
 * 2.1.316 新增：家目录设置模式
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-e6aww6q8.js (18)
 * attribution: placement 18
 */
import { neverTrueAsync, neverTrue as neverTrue_2 } from "../permissions/sensitivePaths.js";
import {
  isSettingsToCloudEnabled,
  isSettingsToCloudEnabledCached,
  canForwardHomeSettings,
  getHomeSettingsForwardingBlocker,
} from "../../services/analytics/violinGates.js";
import {
  getGlobalConfig,
  IDE_KIND_LABELS,
  saveGlobalConfigDurably,
  saveGlobalConfig,
  readGlobalConfigFromDiskOrThrow,
} from "../config.js";
import { logFeatureBad, logFeatureSad, logFeatureOk } from "../../services/analytics/featureTelemetry.js";
import { logEvent } from "../../services/analytics/index.js";
import { fromEnum } from "../../services/analytics/safeMetadata.js";
import { getIsNonInteractiveSession } from "../../bootstrap/state.js";
import { getEnabledSettingSources } from "../settings/constants.js";

//@ chunk-e6aww6q8.js:1939213-1939237 placement
function isRemoteHomeSettingsDisabled() {
  return false;
}
//@ chunk-e6aww6q8.js:1939237-1939261 placement
/**
 * 外部构建恒 false 的启动同意阻断判断。
 */
function isLaunchConsentBlocked(e) {
  return false;
}
//@ chunk-e6aww6q8.js:1939261-1939346 placement
/**
 * 家目录设置转发特性开关（含当前生效值）。
 */
function homeSettingsForwardingFeature(e) {
  return isLaunchConsentBlocked(e)
    ? {
        enabled: neverTrueAsync,
        enabledNow: neverTrue_2,
      }
    : {
        enabled: isSettingsToCloudEnabled,
        enabledNow: isSettingsToCloudEnabledCached,
      };
}
//@ chunk-e6aww6q8.js:1939346-1939397 placement
/**
 * 宿主同意值到模式的映射（forward → host）。
 */
function hostConsentToMode(e) {
  return e === "forward" ? "host" : undefined;
}
//@ chunk-e6aww6q8.js:1939397-1939421 placement
/**
 * 家目录设置是否已获转发同意（外部构建恒 true）。
 */
function isHomeSettingsForwardConsent() {
  return true;
}
//@ chunk-e6aww6q8.js:1939421-1939465 placement
/**
 * 解析宿主同意对应的模式。
 */
function resolveHostConsentMode({ hostConsent }) {
  return hostConsentToMode(hostConsent);
}
//@ chunk-e6aww6q8.js:1939465-1939561 placement
/**
 * 取已存的家目录设置模式（缺省 keep_local）。
 */
function storedHomeSettingsMode() {
  let remoteHomeSettingsMode = getGlobalConfig().remoteHomeSettingsMode;
  return (
    normalizeHomeSettingsMode(remoteHomeSettingsMode) ??
    (remoteHomeSettingsMode === undefined ? undefined : "keep_local")
  );
}
//@ chunk-e6aww6q8.js:1939561-1939661 placement
function isForwardModeEffective(e) {
  if (e === undefined || e === "stored")
    return (e === "stored" || isHomeSettingsForwardConsent()) && currentForwardMode() === "forward";
  return true;
}
//@ chunk-e6aww6q8.js:1939661-1939751 placement
/**
 * 记录家目录设置提示（外部构建空实现）。
 */
function noteHomeSettingsPrompt({ launchConsent, isProjectSynced, launchMayForward, surface, trigger }) {}
//@ chunk-e6aww6q8.js:1939751-1939761 placement
var MAX_HOME_SETTINGS_SAVE_ATTEMPTS = 3;
//@ chunk-e6aww6q8.js:1939761-1939808 placement
function normalizeHomeSettingsMode(remoteHomeSettingsMode) {
  return IDE_KIND_LABELS.includes(remoteHomeSettingsMode) ? remoteHomeSettingsMode : undefined;
}
//@ chunk-e6aww6q8.js:1939808-1939884 placement
function currentForwardMode() {
  if (!canForwardHomeSettings(isSettingsToCloudEnabledCached())) return "unspecified";
  return storedForwardMode() ?? "unspecified";
}
//@ chunk-e6aww6q8.js:1939884-1939938 placement
/**
 * 取已保存的转发模式。
 */
function storedForwardMode() {
  return normalizeHomeSettingsMode(getGlobalConfig().remoteHomeSettingsMode);
}
//@ chunk-e6aww6q8.js:1939938-1940718 placement
/**
 * 保存家目录设置转发模式到全局配置（forward 前检查是否被阻止），记录先前值并上报事件。
 */
async function saveHomeSettingsMode(mode, n) {
  if (mode === "forward") {
    let homeSettingsForwardingBlocker = getHomeSettingsForwardingBlocker(await isSettingsToCloudEnabled());
    if (homeSettingsForwardingBlocker !== null) {
      logFeatureBad("remote_home_settings_mode", homeSettingsForwardingBlocker);
      return "refused";
    }
  }
  let r = {
    previous: "unspecified",
  };
  let s = await saveGlobalConfigDurably((h) => {
    r.previous = normalizeHomeSettingsMode(h.remoteHomeSettingsMode) ?? "unspecified";
    return {
      ...h,
      remoteHomeSettingsMode: mode,
    };
  }, n);
  if (r.previous !== mode)
    logEvent("tengu_home_settings_mode_set", {
      mode: fromEnum(mode),
      previous: fromEnum(r.previous),
      persisted: s,
    });
  if (!s) {
    let storedHomeSettingsMode = await readStoredHomeSettingsMode(n);
    if (storedHomeSettingsMode !== null && storedHomeSettingsMode.mode !== mode) {
      let mode_2 = storedHomeSettingsMode.mode;
      for (let idx = 0; idx < MAX_HOME_SETTINGS_SAVE_ATTEMPTS; idx++) {
        let remoteHomeSettingsMode = mode_2;
        let L = false;
        saveGlobalConfig((q) => {
          if (L) return q;
          L = true;
          return {
            ...q,
            remoteHomeSettingsMode,
          };
        }, n);
        let storedHomeSettingsMode = await readStoredHomeSettingsMode(n);
        if (storedHomeSettingsMode === null || storedHomeSettingsMode.mode === mode_2) break;
        mode_2 = storedHomeSettingsMode.mode;
      }
      if (mode_2 !== mode) {
        logFeatureBad("remote_home_settings_mode", "not_stored");
        return "not_stored";
      }
    }
    logFeatureSad("remote_home_settings_mode", "unconfirmed");
    return "unconfirmed";
  }
  logFeatureOk("remote_home_settings_mode");
  return "written";
}
//@ chunk-e6aww6q8.js:1940718-1940834 placement
function shouldForwardHomeSettings(e) {
  return (
    canForwardHomeSettings(e.settingsToCloudEnabled) &&
    e.launchMayForward &&
    !isLaunchConsentBlocked(e.launchConsent) &&
    isForwardModeEffective(e.launchConsent)
  );
}
//@ chunk-e6aww6q8.js:1940834-1940975 placement
function shouldPromptHomeSettingsMode(e) {
  if (!canForwardHomeSettings(isSettingsToCloudEnabledCached())) return false;
  let n = homeSettingsPromptSkipReason(e);
  if (n !== null) {
    logEvent("tengu_home_settings_mode_prompt_skipped", {
      reason: fromEnum(n),
    });
    return false;
  }
  return true;
}
//@ chunk-e6aww6q8.js:1940975-1941312 placement
/**
 * 判断为何跳过家目录设置模式询问：非交互、未保持附着、启动参数、已回答等。
 */
function homeSettingsPromptSkipReason({ staysAttached, launchMayForward, launchConsent }) {
  if (getIsNonInteractiveSession()) return "non_interactive";
  if (!staysAttached) return "not_attached";
  if (!launchMayForward) return "launch_flag";
  if (launchConsent !== undefined) return launchConsent === "stored" ? "answered" : launchConsent;
  if (!getEnabledSettingSources().includes("userSettings")) return "user_settings_disabled";
  if (normalizeHomeSettingsMode(getGlobalConfig().remoteHomeSettingsMode) !== undefined) return "answered";
  return null;
}
//@ chunk-e6aww6q8.js:1941312-1941496 placement
async function readStoredHomeSettingsMode(e) {
  let n = await readGlobalConfigFromDiskOrThrow(e).catch(() => {
    return;
  });
  if (typeof n !== "object" || n === null) return null;
  return {
    mode: normalizeHomeSettingsMode("remoteHomeSettingsMode" in n ? n.remoteHomeSettingsMode : undefined),
  };
}
export {
  resolveHostConsentMode,
  storedHomeSettingsMode,
  isLaunchConsentBlocked,
  shouldPromptHomeSettingsMode,
  noteHomeSettingsPrompt,
  shouldForwardHomeSettings,
  storedForwardMode,
  isHomeSettingsForwardConsent,
  homeSettingsForwardingFeature,
  isForwardModeEffective,
  isRemoteHomeSettingsDisabled,
  hostConsentToMode,
  saveHomeSettingsMode,
};
