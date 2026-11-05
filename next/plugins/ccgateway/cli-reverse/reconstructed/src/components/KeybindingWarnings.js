/**
 * components/KeybindingWarnings.tsx
 *
 * 自定义快捷键配置警告。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/components/KeybindingWarnings.tsx
 * pieces: chunk-8pf0qxb4.js (1)
 * attribution: fingerprint 1
 */
import { getSettingsWithErrors } from "../utils/settings/settings.js";
import { CROSSSESSIONINBOUND } from "../utils/settings/hooksValidation.js";

//@ chunk-8pf0qxb4.js:3113-3208 fingerprint (2.1.88 match: _temp2, 0.621)
function hasKeybindingWarning() {
  return getSettingsWithErrors().errors.some(
    (error) => error.path === CROSSSESSIONINBOUND && error.severity === "warning" && !error.statusOnly,
  );
}
export { hasKeybindingWarning };
