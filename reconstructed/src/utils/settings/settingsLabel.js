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
function Vyt(t) {
  if (t === void 0) return "settings";
  return getFlagSettingsExpectedContent() !== void 0 && t === getFlagSettingsPath()
    ? INLINE_FLAG_SETTINGS_LABEL
    : t;
}

export { Vyt };
