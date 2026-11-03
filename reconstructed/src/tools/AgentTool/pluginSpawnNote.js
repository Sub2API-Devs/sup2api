/**
 * tools/AgentTool/pluginSpawnNote.ts
 *
 * 2.1.316 新增：插件派生 agent 的说明
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-8zzqbk6w.js (2)
 * attribution: placement 2
 */
import { getPluginRegistry } from "../../utils/plugins/pluginLoadState.js";
import { hasLink } from "../../utils/hasLink.js";
import { isHookRegistrationPending } from "../../utils/plugins/loadPluginHooks.js";

//@ chunk-8zzqbk6w.js:299-412 placement
function isUnknownPluginSpawnedAgent(o) {
  return (
    o.hookCaller === undefined &&
    o.pluginUnnamed === true &&
    (getPluginRegistry().loadedModules.some((loadedModule) => !hasLink(loadedModule)) ||
      isHookRegistrationPending())
  );
}
//@ chunk-8zzqbk6w.js:412-607 placement
var UNKNOWN_PLUGIN_AGENT_NOTE =
  "A plugin started or resumed this subagent, or the one that spawned it, and that plugin is not known in this session. It cannot schedule work: nothing would hold that work after a Stop.";
export { isUnknownPluginSpawnedAgent, UNKNOWN_PLUGIN_AGENT_NOTE };
