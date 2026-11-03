/**
 * components/KeybindingWarnings.tsx
 *
 * 自定义快捷键配置警告。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/components/KeybindingWarnings.tsx
 * pieces: chunk-q40vccff.js (1)
 * attribution: fingerprint 1
 */
import { getSettingsWithErrors_2 } from "../utils/settings/settings.js";
import { CROSSSESSIONINBOUND } from "../utils/settings/hooksValidation.js";

//@ chunk-q40vccff.js:3113-3208 fingerprint = _temp2 (0.621)
function N() {
  return getSettingsWithErrors_2().errors.some(
    (error) => error.path === CROSSSESSIONINBOUND && error.severity === "warning" && !error.statusOnly,
  );
}

export { N };
