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
import { gxn, n9t, validateConfigValue } from "../config/globalConfigValidation.js";

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
/**
 * 解析用户意图类设置（主题、编辑模式等），兼顾旧的全局配置。
 */
//@ chunk-r5n7tcxe.js:657-1043 placement
function resolveSetting(n, i) {
  let o = getEnabledSettingSources();
  for (let e = o.length - 1; e >= 0; e--) {
    let t = o[e],
      s = getSettingsForSource(t)?.[n];
    if (s === void 0) continue;
    if (t === "projectSettings" && o.includes("userSettings") && projectSettingsAliasesUserSettings())
      continue;
    return { value: s, source: t };
  }
  if (USER_INTENT_SETTING_KEYS.includes(n)) {
    let e = n,
      t = getGlobalConfig()[e];
    if (t !== void 0 && t !== DEFAULT_GLOBAL_CONFIG[e]) {
      let s = gxn(e) ? n9t(e, t) : validateConfigValue(e, t);
      if (s !== void 0) return { value: s, source: "legacyGlobalConfig" };
    }
  }
  return { value: i, source: "default" };
}
//@ chunk-r5n7tcxe.js:1043-1098 placement = _temp5 (1)
function saveUserIntentSetting(n, i, o) {
  updateSettingsForSource("userSettings", { [n]: i }, void 0, o);
}

export { resolveSetting, USER_INTENT_SETTING_KEYS, saveUserIntentSetting };
