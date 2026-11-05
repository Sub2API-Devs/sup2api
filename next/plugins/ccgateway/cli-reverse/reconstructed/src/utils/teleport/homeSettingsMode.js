/**
 * utils/teleport/homeSettingsMode.ts
 *
 * 2.1.316 新增：家目录设置模式
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-5xgkngpb.js (18)
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

//@ chunk-5xgkngpb.js:1994380-1994404 placement
function isRemoteHomeSettingsDisabled() {
  return false;
}
//@ chunk-5xgkngpb.js:1994404-1994428 placement
/**
 * 外部构建恒 false 的启动同意阻断判断。
 */
function isLaunchConsentBlocked(consent) {
  return false;
}
//@ chunk-5xgkngpb.js:1994428-1994513 placement
/**
 * 家目录设置转发特性开关（含当前生效值）。
 */
function homeSettingsForwardingFeature(consent) {
  return isLaunchConsentBlocked(consent)
    ? {
        enabled: neverTrueAsync,
        enabledNow: neverTrue_2,
      }
    : {
        enabled: isSettingsToCloudEnabled,
        enabledNow: isSettingsToCloudEnabledCached,
      };
}
//@ chunk-5xgkngpb.js:1994513-1994564 placement
/**
 * 宿主同意值到模式的映射（forward → host）。
 */
function hostConsentToMode(mode) {
  return mode === "forward" ? "host" : undefined;
}
//@ chunk-5xgkngpb.js:1994564-1994588 placement
/**
 * 家目录设置是否已获转发同意（外部构建恒 true）。
 */
function isHomeSettingsForwardConsent() {
  return true;
}
//@ chunk-5xgkngpb.js:1994588-1994632 placement
/**
 * 解析宿主同意对应的模式。
 */
function resolveHostConsentMode({ hostConsent }) {
  return hostConsentToMode(hostConsent);
}
//@ chunk-5xgkngpb.js:1994632-1994729 placement
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
//@ chunk-5xgkngpb.js:1994729-1994829 placement
function isForwardModeEffective(mode) {
  if (mode === undefined || mode === "stored")
    return (mode === "stored" || isHomeSettingsForwardConsent()) && currentForwardMode() === "forward";
  return true;
}
//@ chunk-5xgkngpb.js:1994829-1994919 placement
/**
 * 记录家目录设置提示（外部构建空实现）。
 */
function noteHomeSettingsPrompt({ launchConsent, isProjectSynced, launchMayForward, surface, trigger }) {}
//@ chunk-5xgkngpb.js:1994919-1994929 placement
var MAX_HOME_SETTINGS_SAVE_ATTEMPTS = 3;
//@ chunk-5xgkngpb.js:1994929-1994977 placement
function normalizeHomeSettingsMode(remoteHomeSettingsMode) {
  return IDE_KIND_LABELS.includes(remoteHomeSettingsMode) ? remoteHomeSettingsMode : undefined;
}
//@ chunk-5xgkngpb.js:1994977-1995053 placement
function currentForwardMode() {
  if (!canForwardHomeSettings(isSettingsToCloudEnabledCached())) return "unspecified";
  return storedForwardMode() ?? "unspecified";
}
//@ chunk-5xgkngpb.js:1995053-1995108 placement
/**
 * 取已保存的转发模式。
 */
function storedForwardMode() {
  return normalizeHomeSettingsMode(getGlobalConfig().remoteHomeSettingsMode);
}
//@ chunk-5xgkngpb.js:1995108-1995889 placement
/**
 * 保存家目录设置转发模式到全局配置（forward 前检查是否被阻止），记录先前值并上报事件。
 */
async function saveHomeSettingsMode(mode, mode_2) {
  if (mode === "forward") {
    let homeSettingsForwardingBlocker = getHomeSettingsForwardingBlocker(await isSettingsToCloudEnabled());
    if (homeSettingsForwardingBlocker !== null) {
      logFeatureBad("remote_home_settings_mode", homeSettingsForwardingBlocker);
      return "refused";
    }
  }
  let saveState = {
    previous: "unspecified",
  };
  let saved = await saveGlobalConfigDurably((config) => {
    saveState.previous = normalizeHomeSettingsMode(config.remoteHomeSettingsMode) ?? "unspecified";
    return {
      ...config,
      remoteHomeSettingsMode: mode,
    };
  }, mode_2);
  if (saveState.previous !== mode)
    logEvent("tengu_home_settings_mode_set", {
      mode: fromEnum(mode),
      previous: fromEnum(saveState.previous),
      persisted: saved,
    });
  if (!saved) {
    let storedHomeSettingsMode = await readStoredHomeSettingsMode(mode_2);
    if (storedHomeSettingsMode !== null && storedHomeSettingsMode.mode !== mode) {
      let mode_3 = storedHomeSettingsMode.mode;
      for (let idx = 0; idx < MAX_HOME_SETTINGS_SAVE_ATTEMPTS; idx++) {
        let remoteHomeSettingsMode = mode_3;
        let applied = false;
        saveGlobalConfig((config) => {
          if (applied) return config;
          applied = true;
          return {
            ...config,
            remoteHomeSettingsMode,
          };
        }, mode_2);
        let storedHomeSettingsMode = await readStoredHomeSettingsMode(mode_2);
        if (storedHomeSettingsMode === null || storedHomeSettingsMode.mode === mode_3) break;
        mode_3 = storedHomeSettingsMode.mode;
      }
      if (mode_3 !== mode) {
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
//@ chunk-5xgkngpb.js:1995889-1996005 placement
function shouldForwardHomeSettings(options) {
  return (
    canForwardHomeSettings(options.settingsToCloudEnabled) &&
    options.launchMayForward &&
    !isLaunchConsentBlocked(options.launchConsent) &&
    isForwardModeEffective(options.launchConsent)
  );
}
//@ chunk-5xgkngpb.js:1996005-1996146 placement
function shouldPromptHomeSettingsMode(options) {
  if (!canForwardHomeSettings(isSettingsToCloudEnabledCached())) return false;
  let skipReason = homeSettingsPromptSkipReason(options);
  if (skipReason !== null) {
    logEvent("tengu_home_settings_mode_prompt_skipped", {
      reason: fromEnum(skipReason),
    });
    return false;
  }
  return true;
}
//@ chunk-5xgkngpb.js:1996146-1996484 placement
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
//@ chunk-5xgkngpb.js:1996484-1996669 placement
async function readStoredHomeSettingsMode(options) {
  let config = await readGlobalConfigFromDiskOrThrow(options).catch(() => {
    return;
  });
  if (typeof config !== "object" || config === null) return null;
  return {
    mode: normalizeHomeSettingsMode(
      "remoteHomeSettingsMode" in config ? config.remoteHomeSettingsMode : undefined,
    ),
  };
}
export {
  resolveHostConsentMode,
  storedHomeSettingsMode,
  isLaunchConsentBlocked,
  shouldPromptHomeSettingsMode,
  noteHomeSettingsPrompt,
  shouldForwardHomeSettings,
  homeSettingsForwardingFeature,
  isForwardModeEffective,
  isRemoteHomeSettingsDisabled,
  storedForwardMode,
  saveHomeSettingsMode,
  isHomeSettingsForwardConsent,
  hostConsentToMode,
};
