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
import { hasFrontmatterHooks, yyt } from "./registerFrontmatterHooks.js";
import { setMainThreadAgentHooks } from "../../bootstrap/state.js";
import { isRestrictedToPluginOnly, isSourceAdminTrusted } from "../settings/pluginOnlyPolicy.js";
import { isAgentDefinitionTrusted, checkAgentOriginTrust } from "../../tools/AgentTool/agentTrust.js";
import { isRestrictedPersonalAgent } from "../permissions/permissionsLoader.js";
import { tagHooksWithSource } from "./sessionHooks.js";
import { HOOK_EVENTS } from "../../entrypoints/sdk/coreSchemas.js";

//@ chunk-08s5p3av.js:2406-2697 placement
function hookSourcesSummary(e) {
  if (!e || !hasFrontmatterHooks(e.hooks)) {
    setMainThreadAgentHooks(void 0);
    return;
  }
  let r = !isRestrictedToPluginOnly("hooks") || isSourceAdminTrusted(e.source),
    o = isAgentDefinitionTrusted(e);
  if (r && o) {
    let n = isRestrictedPersonalAgent(e)
      ? markHookSource(e.hooks, "personal")
      : yyt(e.source)
        ? markHookSource(e.hooks, "checkout")
        : e.hooks;
    (tagHooksWithSource(e.hooks, e.source === "plugin" ? e.plugin : void 0), setMainThreadAgentHooks(n));
    return;
  }
  if (r && !o) checkAgentOriginTrust(e, "mainThread");
  setMainThreadAgentHooks(void 0);
}
//@ chunk-08s5p3av.js:2697-2843 placement
function markHookSource(e, r) {
  let o = {};
  for (let n of HOOK_EVENTS) {
    let s = e[n];
    if (s !== void 0)
      o[n] = s.map((u) => (r === "personal" ? { ...u, personal: !0 } : { ...u, checkout: !0 }));
  }
  return o;
}

export { hookSourcesSummary };
