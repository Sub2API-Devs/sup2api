/**
 * utils/hooks/hookSources.ts
 *
 * 2.1.316 新增。hooks 来源分类。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-2snqx25v.js (2)
 * attribution: placement 2
 */
import { hasFrontmatterHooks, isRepoFrontmatterHookRestricted } from "./registerFrontmatterHooks.js";
import { setMainThreadAgentHooks } from "../../bootstrap/state.js";
import { isRestrictedToPluginOnly, isSourceAdminTrusted } from "../settings/pluginOnlyPolicy.js";
import { isAgentDefinitionTrusted, checkAgentOriginTrust } from "../../tools/AgentTool/agentTrust.js";
import { isRestrictedPersonalAgent } from "../permissions/permissionsLoader.js";
import { tagHooksWithSource } from "./sessionHooks.js";
import { HOOK_EVENTS } from "../../entrypoints/sdk/coreSchemas.js";

//@ chunk-2snqx25v.js:2473-2764 placement
function hookSourcesSummary(agent) {
  if (!agent || !hasFrontmatterHooks(agent.hooks)) {
    setMainThreadAgentHooks(undefined);
    return;
  }
  let allowedByPolicy = !isRestrictedToPluginOnly("hooks") || isSourceAdminTrusted(agent.source);
  let trusted = isAgentDefinitionTrusted(agent);
  if (allowedByPolicy && trusted) {
    let hooks = isRestrictedPersonalAgent(agent)
      ? markHookSource(agent.hooks, "personal")
      : isRepoFrontmatterHookRestricted(agent.source)
        ? markHookSource(agent.hooks, "checkout")
        : agent.hooks;
    tagHooksWithSource(agent.hooks, agent.source === "plugin" ? agent.plugin : undefined);
    setMainThreadAgentHooks(hooks);
    return;
  }
  if (allowedByPolicy && !trusted) checkAgentOriginTrust(agent, "mainThread");
  setMainThreadAgentHooks(undefined);
}
//@ chunk-2snqx25v.js:2764-2910 placement
function markHookSource(hooks, kind) {
  let marked = {};
  for (let event of HOOK_EVENTS) {
    let matchers = hooks[event];
    if (matchers !== undefined)
      marked[event] = matchers.map((matcher) =>
        kind === "personal"
          ? {
              ...matcher,
              personal: true,
            }
          : {
              ...matcher,
              checkout: true,
            },
      );
  }
  return marked;
}
export { hookSourcesSummary };
