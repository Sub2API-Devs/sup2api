/**
 * hooks/useSettings.ts
 *
 * 读取当前设置（订阅 settings 变化）的 hook。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/hooks/useSettings.ts
 * pieces: chunk-vc5p26w2.js (1), chunk-z4g2ta8k.js (1)
 * attribution: placement 1, fingerprint 1
 */
import { useAppState } from "../state/AppState.js";
import { asPlainObject } from "../cli/remoteIO/servedCalls.js";
import { CLOUD_PLUGINS_FORWARDED_KEY } from "../utils/plugins/cloudPluginForwarding.js";

//@ chunk-vc5p26w2.js:226-266 placement
/**
 * 函数 useSettingsState（取 settings）；位于「读取当前设置（订阅 settings 变化）的 hook」模块。
 */
function useSettingsState() {
  return useAppState((state) => state.settings);
}
//@ chunk-z4g2ta8k.js:36537-36667 fingerprint = useSettings (0.657)
function useSettings(payload) {
  let settings = asPlainObject(asPlainObject(payload.request)?.settings);
  if (settings === undefined) return;
  let { [CLOUD_PLUGINS_FORWARDED_KEY]: forwardedKey, ...userSettings } = settings;
  return Object.keys(userSettings).length > 0 ? userSettings : undefined;
}
export { useSettingsState, useSettings };
