/**
 * utils/hooks/hookSources.ts
 *
 * 2.1.316 新增。hooks 来源分类。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-08s5p3av.js (2)
 * attribution: placement 2
 */
import { hasFrontmatterHooks, isRepoFrontmatterHookRestricted } from "./registerFrontmatterHooks.js";
import { setMainThreadAgentHooks } from "../../bootstrap/state.js";
import { isRestrictedToPluginOnly, isSourceAdminTrusted } from "../settings/pluginOnlyPolicy.js";
import { isAgentDefinitionTrusted, checkAgentOriginTrust } from "../../tools/AgentTool/agentTrust.js";
import { isRestrictedPersonalAgent } from "../permissions/permissionsLoader.js";
import { tagHooksWithSource } from "./sessionHooks.js";
import { HOOK_EVENTS } from "../../entrypoints/sdk/coreSchemas.js";

//@ chunk-08s5p3av.js:2406-2697 placement
function hookSourcesSummary(e) {
  if (!e || !hasFrontmatterHooks(e.hooks)) {
    setMainThreadAgentHooks(undefined);
    return;
  }
  let r = !isRestrictedToPluginOnly("hooks") || isSourceAdminTrusted(e.source);
  let o = isAgentDefinitionTrusted(e);
  if (r && o) {
    let n = isRestrictedPersonalAgent(e)
      ? markHookSource(e.hooks, "personal")
      : isRepoFrontmatterHookRestricted(e.source)
        ? markHookSource(e.hooks, "checkout")
        : e.hooks;
    tagHooksWithSource(e.hooks, e.source === "plugin" ? e.plugin : undefined);
    setMainThreadAgentHooks(n);
    return;
  }
  if (r && !o) checkAgentOriginTrust(e, "mainThread");
  setMainThreadAgentHooks(undefined);
}
//@ chunk-08s5p3av.js:2697-2843 placement
function markHookSource(hooks, r) {
  let o = {};
  for (let n of HOOK_EVENTS) {
    let s = hooks[n];
    if (s !== undefined)
      o[n] = s.map((u) =>
        r === "personal"
          ? {
              ...u,
              personal: true,
            }
          : {
              ...u,
              checkout: true,
            },
      );
  }
  return o;
}
export { hookSourcesSummary };
