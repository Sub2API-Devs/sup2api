/**
 * tools/AgentTool/pluginSpawnNote.ts
 *
 * 2.1.316 新增：插件派生 agent 的说明
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-6zdwbv8y.js (2)
 * attribution: placement 2
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { getPluginRegistry } from "../../utils/plugins/pluginLoadState.js";
import { hasLink } from "../../utils/hasLink.js";
import { isHookRegistrationPending } from "../../utils/plugins/loadPluginHooks.js";

//@ chunk-6zdwbv8y.js:299-411 placement
function isUnknownPluginSpawnedAgent(toolUseContext) {
  return (
    toolUseContext.hookCaller === undefined &&
    toolUseContext.pluginUnnamed === true &&
    (getPluginRegistry().loadedModules.some((loadedModule) => !hasLink(loadedModule)) ||
      isHookRegistrationPending())
  );
}
//@ chunk-6zdwbv8y.js:411-606 placement
var UNKNOWN_PLUGIN_AGENT_NOTE =
  "A plugin started or resumed this subagent, or the one that spawned it, and that plugin is not known in this session. It cannot schedule work: nothing would hold that work after a Stop.";
export { isUnknownPluginSpawnedAgent, UNKNOWN_PLUGIN_AGENT_NOTE };
