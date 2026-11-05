/**
 * utils/settings/settingsLabel.ts
 *
 * 2.1.316 新增：设置标签
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-5kksf9ax.js (1)
 * attribution: placement 1
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { getFlagSettingsExpectedContent, getFlagSettingsPath } from "../../bootstrap/state.js";
import { INLINE_FLAG_SETTINGS_LABEL } from "./constants.js";

//@ chunk-5kksf9ax.js:267-351 placement
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
