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
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-e6aww6q8.js:58326-58429 placement
/**
 * agent.offer 事件定义：site 规则与默认 core（总是提供）。
 */
var AGENT_OFFER_EVENT; // deferred: uses UI_ENV_SITE_RULES (./sites/siteRules.js) of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-e6aww6q8.js:58326", () => {
  AGENT_OFFER_EVENT = {
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
});
//@ chunk-e6aww6q8.js:58429-58470 placement
/**
 * 是否来自钩子调用
 */
var isHookCallerPresent = (callerId) => callerId !== undefined && getHookCaller(callerId) !== undefined;
//@ chunk-e6aww6q8.js:58470-58779 placement
/**
 * 对可用代理逐个触发 agent.offer 钩子，过滤掉被钩子拒绝的；由钩子发起的调用或只有默认安全插件时跳过。
 */
async function filterOfferedAgents(agents, callerId) {
  if (isHookCallerPresent(callerId)) return [...agents];
  let isLoneShortcut = isLoneSecDefaultShortcut("agent.offer");
  let results = await Promise.all(
    agents.map((agent) =>
      !isLoneShortcut &&
      hasModuleHookingSite("agent.offer", {
        agent: agent.agentType,
      })
        ? NO_CORE_AT_CHAIN_BOTTOM(
            "agent.offer",
            {},
          )({
            agent: agent.agentType,
            description: agent.whenToUse ?? "",
            source: agent.source,
            provider: agentProvider(agent),
          })
        : {
            isOffered: true,
          },
    ),
  );
  return agents.filter((agent, index) => results[index]?.isOffered === true);
}
//@ chunk-e6aww6q8.js:83794-83820 placement
/**
 * agent.spawn 的 UI 规则
 */
var AGENT_SPAWN_SITE_RULES; // deferred: uses UI_ENV_SITE_RULES (./sites/siteRules.js) of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-e6aww6q8.js:83794", () => {
  AGENT_SPAWN_SITE_RULES = UI_ENV_SITE_RULES["agent.spawn"];
});
//@ chunk-e6aww6q8.js:83820-83888 placement
/**
 * 钩子未放行的说明
 */
var AGENT_SPAWN_UNPASSED = "agent.spawn: a hook answered without passing the spawn on";
//@ chunk-e6aww6q8.js:83888-84068 placement
/**
 * agent.spawn 钩子拒绝时生成 deny 结果（已中止则抛 AbortError），并记调试日志。
 */
function agentSpawnDenied({ result: hookResult, input, signal }) {
  if (hookResult.deny !== undefined && signal.aborted) throw new AbortError_2();
  let deny = hookResult.deny ?? AGENT_SPAWN_UNPASSED;
  logForDebugging(`agent.spawn ${input.subagentType}: refused by a hook (${deny})`);
  return {
    deny,
  };
}
//@ chunk-e6aww6q8.js:84127-84523 placement
/**
 * 记录 agent.spawn 钩子改写了哪些输入字段，以及模型的改动。
 */
function logAgentSpawnRewrites(spawnResult) {
  let { input, spawn } = spawnResult;
  let pinnedKeys = new Set(AGENT_SPAWN_PINNED_KEYS_2);
  let allKeys = new Set([...Object.keys(input), ...Object.keys(spawn)]);
  let readKey = (source, key) => source[key];
  let filtered = [...allKeys].filter(
    (key) => !pinnedKeys.has(key) && key !== "model" && readKey(input, key) !== readKey(spawn, key),
  );
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
function recordSpawnProvenance(agentTaskId, toolUseContext) {
  let { hookOrigin, hookCaller, hookServesModel } = toolUseContext;
  if (hookCaller === undefined) {
    getPluginRegistry().spawnProvenance.delete(agentTaskId);
    return;
  }
  getPluginRegistry().spawnProvenance.set(agentTaskId, {
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
function addUnnamedSteered(agentTaskId) {
  getPluginRegistry().unnamedSteered.add(agentTaskId);
}
//@ chunk-e6aww6q8.js:4117330-4117831 placement
/**
 * 恢复/续接代理时计算派生来源标记，并返回 admit() 在接纳时写回来源记录。
 */
function resolveSpawnProvenanceMarks(agentTaskId, meta, toolUseContext) {
  let provenanceOf = spawnProvenanceOf(agentTaskId);
  let hasCaller = toolUseContext.hookCaller !== undefined;
  let missingServesModel = hasCaller
    ? !toolUseContext.hookServesModel
    : isUnknownPluginSpawnedAgent({
        hookCaller: undefined,
        pluginUnnamed: toolUseContext.pluginUnnamed,
      });
  let keepProvenance = provenanceOf?.hookServesModel === true && missingServesModel;
  let secondIsUnnamedSteered =
    provenanceOf === undefined && (meta?.pluginSteered === true || isUnnamedSteered(agentTaskId));
  let markUnnamed =
    secondIsUnnamedSteered ||
    (provenanceOf === undefined && (hasCaller ? missingServesModel : toolUseContext.pluginUnnamed === true));
  let steeredMarks = {
    hookServesModel: undefined,
    pluginSteered: true,
    pluginUnnamed: true,
  };
  return {
    marks:
      (provenanceOf && {
        ...provenanceOf,
        hookServesModel: missingServesModel ? undefined : provenanceOf.hookServesModel,
      }) ??
      (secondIsUnnamedSteered ? steeredMarks : {}),
    admit: () => {
      if (keepProvenance)
        getPluginRegistry().spawnProvenance.set(agentTaskId, {
          hookOrigin: provenanceOf.hookOrigin,
          hookCaller: provenanceOf.hookCaller,
        });
      if (markUnnamed) addUnnamedSteered(agentTaskId);
    },
  };
}
//@ chunk-e6aww6q8.js:4117831-4118038 placement
/**
 * 插件相关设置在读取后变化时，再读一次（必要时强制 reread）后返回读取器。
 */
async function rereadPluginSettings(settings, seenVersion) {
  logForDebugging(
    "Plugin hooks: plugin-affecting settings changed since the plugins were read; reading them again before any hooks module is chosen",
  );
  if ((await settings.read()) === seenVersion) await settings.reread();
  return settings;
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
