/**
 * hooks/useSettings.ts
 *
 * 读取当前设置（订阅 settings 变化）的 hook。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/hooks/useSettings.ts
 * pieces: chunk-n53w6zq1.js (1)
 * attribution: placement 1
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { useAppState } from "../state/AppState.js";

//@ chunk-n53w6zq1.js:226-266 placement
/**
 * 函数 useSettingsState（取 settings）；位于「读取当前设置（订阅 settings 变化）的 hook」模块。
 */
function useSettingsState() {
  return useAppState((state) => state.settings);
}
export { useSettingsState };
