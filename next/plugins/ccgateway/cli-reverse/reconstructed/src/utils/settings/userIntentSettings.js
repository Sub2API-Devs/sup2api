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
function resolveSetting(key, value) {
  let enabledSettingSources = getEnabledSettingSources();
  for (let j = enabledSettingSources.length - 1; j >= 0; j--) {
    let source = enabledSettingSources[j];
    let value = getSettingsForSource(source)?.[key];
    if (value === undefined) continue;
    if (
      source === "projectSettings" &&
      enabledSettingSources.includes("userSettings") &&
      projectSettingsAliasesUserSettings()
    )
      continue;
    return {
      value,
      source,
    };
  }
  if (USER_INTENT_SETTING_KEYS.includes(key)) {
    let legacyKey = key;
    let legacyValue = getGlobalConfig()[legacyKey];
    if (legacyValue !== undefined && legacyValue !== DEFAULT_GLOBAL_CONFIG[legacyKey]) {
      let validated = isAutoUploadFlagKey(legacyKey)
        ? isValidGlobalConfigValue(legacyKey, legacyValue)
        : validateConfigValue(legacyKey, legacyValue);
      if (validated !== undefined)
        return {
          value: validated,
          source: "legacyGlobalConfig",
        };
    }
  }
  return {
    value,
    source: "default",
  };
}
//@ chunk-r5n7tcxe.js:1043-1098 placement (2.1.88 match: _temp5, 1)
function saveUserIntentSetting(key, value, storageV5) {
  updateSettingsForSource(
    "userSettings",
    {
      [key]: value,
    },
    undefined,
    storageV5,
  );
}
export { resolveSetting, USER_INTENT_SETTING_KEYS, saveUserIntentSetting };
