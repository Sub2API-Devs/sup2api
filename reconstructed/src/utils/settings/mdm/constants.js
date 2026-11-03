/**
 * utils/settings/mdm/constants.ts
 *
 * MDM 常量：Windows 注册表 HKLM/HKCU\SOFTWARE\Policies\ClaudeCode 与值名 Settings（另有错配进来的无关函数）。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/utils/settings/mdm/constants.ts
 * pieces: chunk-e6aww6q8.js (1), chunk-vrb44rx7.js (1), chunk-zw3bhs13.js (1)
 * attribution: fingerprint 3
 */
import {
  countToolDefinitionTokens,
  TOOL_DEFINITION_TOKEN_OVERHEAD,
  toolsToApiDefinitions,
  distributeProportionally,
} from "../../analyzeContext.js";
import { roughTokenCountEstimationForFileType } from "../../../services/tokenEstimation.js";
import { jsonStringify } from "../../slowOperations.js";
import { w } from "../../../../vendor/react/compiler-runtime.js";
import { MEMO_CACHE_SENTINEL } from "../../../../runtime/bun-runtime.js";
import { useKeybinding } from "../../../keybindings/useKeybinding.js";
import { useRegisterTabsNavigationOwner } from "../../../components/design-system/Tabs.js";

//@ chunk-e6aww6q8.js:2373815-2374050 fingerprint = PLUTIL_ARGS_PREFIX (1)
async function countToolTokensPerItem(e, n, r, s, h, y, S, w) {
  if (!w)
    return Promise.all(
      e.map(async (q) =>
        Math.max(
          0,
          (await countToolDefinitionTokens([q], n, r, s, void 0, h, y, S)) - TOOL_DEFINITION_TOKEN_OVERHEAD,
        ),
      ),
    );
  let L = await toolsToApiDefinitions(e, n, r, s, h, y),
    max = Math.max(0, ((await S([], L)) || 0) - TOOL_DEFINITION_TOKEN_OVERHEAD);
  return distributeProportionally(
    max,
    L.map((q) => roughTokenCountEstimationForFileType(jsonStringify(q), "json")),
  );
}
//@ chunk-vrb44rx7.js:51594-51744 fingerprint = WINDOWS_REGISTRY_VALUE_NAME (0.603)
function SettingsDialogCancelBinding(i) {
  let C = w(1),
    { onCancel: onCancel, children: children } = i,
    x;
  if (C[0] === MEMO_CACHE_SENTINEL) ((x = { context: "Settings" }), (C[0] = x));
  else x = C[0];
  return (useKeybinding("confirm:no", onCancel, x), useRegisterTabsNavigationOwner(), children ?? null);
}
//@ chunk-zw3bhs13.js:337-442 fingerprint = WINDOWS_REGISTRY_KEY_PATH_HKLM (0.548)
var WINDOWS_REGISTRY_KEY_PATH_HKLM = "HKLM\\SOFTWARE\\Policies\\ClaudeCode",
  WINDOWS_REGISTRY_KEY_PATH_HKCU = "HKCU\\SOFTWARE\\Policies\\ClaudeCode",
  SETTINGS = "Settings";

export {
  WINDOWS_REGISTRY_KEY_PATH_HKLM,
  SETTINGS,
  WINDOWS_REGISTRY_KEY_PATH_HKCU,
  countToolTokensPerItem,
  SettingsDialogCancelBinding,
};
