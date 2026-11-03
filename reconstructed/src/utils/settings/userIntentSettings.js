/**
 * utils/settings/userIntentSettings.ts
 *
 * 2.1.316 新增。解析用户意图类设置（主题、编辑模式等），兼顾旧的全局配置。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-r5n7tcxe.js (3)
 * attribution: placement 3
 */
import { getEnabledSettingSources } from "./constants.js";
import {
  getSettingsForSource,
  projectSettingsAliasesUserSettings,
  updateSettingsForSource,
} from "./settings.js";
import { getGlobalConfig, DEFAULT_GLOBAL_CONFIG } from "../config.js";
import {
  isAutoUploadFlagKey,
  isValidGlobalConfigValue,
  validateConfigValue,
} from "../config/globalConfigValidation.js";

//@ chunk-r5n7tcxe.js:320-657 placement
var USER_INTENT_SETTING_KEYS = [
  "theme",
  "editorMode",
  "verbose",
  "preferredNotifChannel",
  "autoCompactEnabled",
  "autoScrollEnabled",
  "fileCheckpointingEnabled",
  "showTurnDuration",
  "showMessageTimestamps",
  "terminalProgressBarEnabled",
  "todoFeatureEnabled",
  "teammateMode",
  "remoteControlAtStartup",
  "autoUploadSessions",
  "inputNeededNotifEnabled",
  "agentPushNotifEnabled",
];
//@ chunk-r5n7tcxe.js:657-1043 placement
/**
 * 解析用户意图类设置（主题、编辑模式等），兼顾旧的全局配置。
 */
function resolveSetting(n, value) {
  let enabledSettingSources = getEnabledSettingSources();
  for (let j = enabledSettingSources.length - 1; j >= 0; j--) {
    let t = enabledSettingSources[j];
    let s = getSettingsForSource(t)?.[n];
    if (s === undefined) continue;
    if (
      t === "projectSettings" &&
      enabledSettingSources.includes("userSettings") &&
      projectSettingsAliasesUserSettings()
    )
      continue;
    return {
      value: s,
      source: t,
    };
  }
  if (USER_INTENT_SETTING_KEYS.includes(n)) {
    let e = n;
    let t = getGlobalConfig()[e];
    if (t !== undefined && t !== DEFAULT_GLOBAL_CONFIG[e]) {
      let s = isAutoUploadFlagKey(e) ? isValidGlobalConfigValue(e, t) : validateConfigValue(e, t);
      if (s !== undefined)
        return {
          value: s,
          source: "legacyGlobalConfig",
        };
    }
  }
  return {
    value,
    source: "default",
  };
}
//@ chunk-r5n7tcxe.js:1043-1098 placement = _temp5 (1)
function saveUserIntentSetting(n, i, storageV5) {
  updateSettingsForSource(
    "userSettings",
    {
      [n]: i,
    },
    undefined,
    storageV5,
  );
}
export { resolveSetting, USER_INTENT_SETTING_KEYS, saveUserIntentSetting };
