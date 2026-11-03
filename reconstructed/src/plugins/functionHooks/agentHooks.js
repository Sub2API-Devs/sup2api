/**
 * plugins/functionHooks/agentHooks.ts
 *
 * 2.1.316 新增：agent.offer/agent.spawn 事件的钩子接入
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-e6aww6q8.js (12)
 * attribution: placement 12
 */
import { UI_ENV_SITE_RULES } from "./sites/siteRules.js";
import { getHookCaller } from "../../utils/agentContext.js";
import { isLoneSecDefaultShortcut } from "./modAdmission.js";
import { hasModuleHookingSite } from "../hooksModules/loadedModuleFilters.js";
import { NO_CORE_AT_CHAIN_BOTTOM } from "./eventCatalog.js";
import { agentProvider } from "./providerTiers.js";
import { AbortError as AbortError_2 } from "../../utils/errors.js";
import { logForDebugging } from "../../utils/debug.js";
import { AGENT_SPAWN_PINNED_KEYS_2 } from "./sites/agentSites.js";
import { getPluginRegistry } from "../../utils/plugins/pluginLoadState.js";
import { spawnProvenanceOf, isUnnamedSteered } from "./inputHold.js";
import { isUnknownPluginSpawnedAgent } from "../../tools/AgentTool/pluginSpawnNote.js";

//@ chunk-e6aww6q8.js:58326-58429 placement
/**
 * agent.offer 事件定义：site 规则与默认 core（总是提供）。
 */
var AGENT_OFFER_EVENT = {
  site: UI_ENV_SITE_RULES["agent.offer"],
  core: {
    name: "core",
    isCore: true,
    budgetMs: 0,
    run: async () => ({
      isOffered: true,
    }),
  },
};
//@ chunk-e6aww6q8.js:58429-58470 placement
/**
 * 是否来自钩子调用
 */
var isHookCallerPresent = (e) => e !== undefined && getHookCaller(e) !== undefined;
//@ chunk-e6aww6q8.js:58470-58779 placement
/**
 * 对可用代理逐个触发 agent.offer 钩子，过滤掉被钩子拒绝的；由钩子发起的调用或只有默认安全插件时跳过。
 */
async function filterOfferedAgents(e, n) {
  if (isHookCallerPresent(n)) return [...e];
  let r = isLoneSecDefaultShortcut("agent.offer");
  let results = await Promise.all(
    e.map((h) =>
      !r &&
      hasModuleHookingSite("agent.offer", {
        agent: h.agentType,
      })
        ? NO_CORE_AT_CHAIN_BOTTOM(
            "agent.offer",
            {},
          )({
            agent: h.agentType,
            description: h.whenToUse ?? "",
            source: h.source,
            provider: agentProvider(h),
          })
        : {
            isOffered: true,
          },
    ),
  );
  return e.filter((h, y) => results[y]?.isOffered === true);
}
//@ chunk-e6aww6q8.js:83794-83820 placement
/**
 * agent.spawn 的 UI 规则
 */
var AGENT_SPAWN_SITE_RULES = UI_ENV_SITE_RULES["agent.spawn"];
//@ chunk-e6aww6q8.js:83820-83888 placement
/**
 * 钩子未放行的说明
 */
var AGENT_SPAWN_UNPASSED = "agent.spawn: a hook answered without passing the spawn on";
//@ chunk-e6aww6q8.js:83888-84068 placement
/**
 * agent.spawn 钩子拒绝时生成 deny 结果（已中止则抛 AbortError），并记调试日志。
 */
function agentSpawnDenied({ result: e, input, signal }) {
  if (e.deny !== undefined && signal.aborted) throw new AbortError_2();
  let deny = e.deny ?? AGENT_SPAWN_UNPASSED;
  logForDebugging(`agent.spawn ${input.subagentType}: refused by a hook (${deny})`);
  return {
    deny,
  };
}
//@ chunk-e6aww6q8.js:84127-84523 placement
/**
 * 记录 agent.spawn 钩子改写了哪些输入字段，以及模型的改动。
 */
function logAgentSpawnRewrites(e) {
  let { input, spawn } = e;
  let s = new Set(AGENT_SPAWN_PINNED_KEYS_2);
  let h = new Set([...Object.keys(input), ...Object.keys(spawn)]);
  let y = (G, q) => G[q];
  let filtered = [...h].filter((G) => !s.has(G) && G !== "model" && y(input, G) !== y(spawn, G));
  if (filtered.length > 0)
    logForDebugging(`agent.spawn ${input.subagentType}: ${filtered.join(", ")} rewritten by a hook`);
  if (spawn.model === input.model) return;
  logForDebugging(
    `agent.spawn ${input.subagentType}: model ${input.model ?? "(inherit)"} -> ${spawn.model ?? "(inherit)"} by a hook`,
  );
}
//@ chunk-e6aww6q8.js:84523-84602 placement
/**
 * 子代理未启动的说明
 */
var AGENT_SPAWN_NOT_STARTED = "agent.spawn: the subagent did not start after the hooks passed it on";
//@ chunk-e6aww6q8.js:4117078-4117287 placement
/**
 * 记录或清除某代理的派生来源（由哪个钩子发起、是否服务于模型）。
 */
function recordSpawnProvenance(e, toolUseContext) {
  let { hookOrigin, hookCaller, hookServesModel } = toolUseContext;
  if (hookCaller === undefined) {
    getPluginRegistry().spawnProvenance.delete(e);
    return;
  }
  getPluginRegistry().spawnProvenance.set(e, {
    hookOrigin: hookOrigin ?? [hookCaller],
    hookCaller,
    ...(hookServesModel && {
      hookServesModel,
    }),
  });
}
//@ chunk-e6aww6q8.js:4117287-4117330 placement
/**
 * 记入无名引导集合
 */
function addUnnamedSteered(e) {
  getPluginRegistry().unnamedSteered.add(e);
}
//@ chunk-e6aww6q8.js:4117330-4117831 placement
/**
 * 恢复/续接代理时计算派生来源标记，并返回 admit() 在接纳时写回来源记录。
 */
function resolveSpawnProvenanceMarks(e, n, toolUseContext) {
  let provenanceOf = spawnProvenanceOf(e);
  let h = toolUseContext.hookCaller !== undefined;
  let y = h
    ? !toolUseContext.hookServesModel
    : isUnknownPluginSpawnedAgent({
        hookCaller: undefined,
        pluginUnnamed: toolUseContext.pluginUnnamed,
      });
  let S = provenanceOf?.hookServesModel === true && y;
  let w = provenanceOf === undefined && (n?.pluginSteered === true || isUnnamedSteered(e));
  let L = w || (provenanceOf === undefined && (h ? y : toolUseContext.pluginUnnamed === true));
  let G = {
    hookServesModel: undefined,
    pluginSteered: true,
    pluginUnnamed: true,
  };
  return {
    marks:
      (provenanceOf && {
        ...provenanceOf,
        hookServesModel: y ? undefined : provenanceOf.hookServesModel,
      }) ??
      (w ? G : {}),
    admit: () => {
      if (S)
        getPluginRegistry().spawnProvenance.set(e, {
          hookOrigin: provenanceOf.hookOrigin,
          hookCaller: provenanceOf.hookCaller,
        });
      if (L) addUnnamedSteered(e);
    },
  };
}
//@ chunk-e6aww6q8.js:4117831-4118038 placement
/**
 * 插件相关设置在读取后变化时，再读一次（必要时强制 reread）后返回读取器。
 */
async function rereadPluginSettings(e, n) {
  logForDebugging(
    "Plugin hooks: plugin-affecting settings changed since the plugins were read; reading them again before any hooks module is chosen",
  );
  if ((await e.read()) === n) await e.reread();
  return e;
}
export {
  filterOfferedAgents,
  recordSpawnProvenance,
  addUnnamedSteered,
  resolveSpawnProvenanceMarks,
  AGENT_OFFER_EVENT,
  AGENT_SPAWN_SITE_RULES,
  rereadPluginSettings,
  AGENT_SPAWN_NOT_STARTED,
  agentSpawnDenied,
  logAgentSpawnRewrites,
};
