/**
 * utils/settings/settingsLabel.ts
 *
 * 2.1.316 新增：设置标签
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-zg1bje4s.js (1)
 * attribution: placement 1
 */
import { getFlagSettingsExpectedContent, getFlagSettingsPath } from "../../bootstrap/state.js";
import { INLINE_FLAG_SETTINGS_LABEL } from "./constants.js";

//@ chunk-zg1bje4s.js:267-351 placement
/**
 * settingsSourceLabel：设置来源的展示标签。
 */
function settingsSourceLabel(settingsPath) {
  if (settingsPath === undefined) return "settings";
  return getFlagSettingsExpectedContent() !== undefined && settingsPath === getFlagSettingsPath()
    ? INLINE_FLAG_SETTINGS_LABEL
    : settingsPath;
}
export { settingsSourceLabel };
