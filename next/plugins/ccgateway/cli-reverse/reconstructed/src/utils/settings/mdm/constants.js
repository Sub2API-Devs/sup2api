/**
 * utils/settings/mdm/constants.ts
 *
 * MDM 常量：Windows 注册表 HKLM/HKCU\SOFTWARE\Policies\ClaudeCode 与值名 Settings（另有错配进来的无关函数）。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/utils/settings/mdm/constants.ts
 * pieces: chunk-4cd7tk6d.js (1), chunk-5xgkngpb.js (1), chunk-wb51jffc.js (1)
 * attribution: fingerprint 3
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import {
  countToolDefinitionTokens,
  TOOL_DEFINITION_TOKEN_OVERHEAD,
  toolsToApiDefinitions,
  distributeProportionally,
} from "../../analyzeContext.js";
import { roughTokenCountEstimationForFileType } from "../../../services/tokenEstimation.js";
import { jsonStringify } from "../../slowOperations.js";
import { useMemoCache } from "../../../../vendor/react/compiler-runtime.js";
import { MEMO_CACHE_SENTINEL } from "../../../../runtime/bun-runtime.js";
import { useKeybinding } from "../../../keybindings/useKeybinding.js";
import { useRegisterTabsNavigationOwner } from "../../../components/design-system/Tabs.js";

//@ chunk-4cd7tk6d.js:337-442 fingerprint (2.1.88 match: WINDOWS_REGISTRY_KEY_PATH_HKLM, 0.548)
var WINDOWS_REGISTRY_KEY_PATH_HKLM = "HKLM\\SOFTWARE\\Policies\\ClaudeCode";
var WINDOWS_REGISTRY_KEY_PATH_HKCU = "HKCU\\SOFTWARE\\Policies\\ClaudeCode";
var SETTINGS = "Settings";
//@ chunk-5xgkngpb.js:2429181-2429416 fingerprint (2.1.88 match: PLUTIL_ARGS_PREFIX, 1)
async function countToolTokensPerItem(
  tools,
  getToolPermissionContext,
  agentInfo,
  model,
  context,
  agent,
  counter,
  batch,
) {
  if (!batch)
    return Promise.all(
      tools.map(async (tool) =>
        Math.max(
          0,
          (await countToolDefinitionTokens(
            [tool],
            getToolPermissionContext,
            agentInfo,
            model,
            undefined,
            context,
            agent,
            counter,
          )) - TOOL_DEFINITION_TOKEN_OVERHEAD,
        ),
      ),
    );
  let defs = await toolsToApiDefinitions(tools, getToolPermissionContext, agentInfo, model, context, agent);
  let max = Math.max(0, ((await counter([], defs)) || 0) - TOOL_DEFINITION_TOKEN_OVERHEAD);
  return distributeProportionally(
    max,
    defs.map((def) => roughTokenCountEstimationForFileType(jsonStringify(def), "json")),
  );
}
//@ chunk-wb51jffc.js:51745-51895 fingerprint (2.1.88 match: WINDOWS_REGISTRY_VALUE_NAME, 0.603)
function SettingsDialogCancelBinding(props) {
  let $ = useMemoCache(1);
  let { onCancel, children } = props;
  let bindOpts;
  if ($[0] === MEMO_CACHE_SENTINEL) {
    bindOpts = {
      context: "Settings",
    };
    $[0] = bindOpts;
  } else bindOpts = $[0];
  useKeybinding("confirm:no", onCancel, bindOpts);
  useRegisterTabsNavigationOwner();
  return children ?? null;
}
export {
  WINDOWS_REGISTRY_KEY_PATH_HKLM,
  SETTINGS,
  WINDOWS_REGISTRY_KEY_PATH_HKCU,
  countToolTokensPerItem,
  SettingsDialogCancelBinding,
};
