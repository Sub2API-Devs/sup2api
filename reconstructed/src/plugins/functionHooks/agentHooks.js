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
import { AGENT_SPAWN_PINNED_KEYS } from "./sites/agentSites.js";
import { getPluginRegistry } from "../../utils/plugins/pluginLoadState.js";
import { j9n, Nce } from "./inputHold.js";
import { isUnknownPluginSpawnedAgent } from "../../tools/AgentTool/pluginSpawnNote.js";

/**
 * agent.offer 事件定义：site 规则与默认 core（总是提供）。
 */
//@ chunk-e6aww6q8.js:58326-58429 placement
var AGENT_OFFER_EVENT = {
  site: UI_ENV_SITE_RULES["agent.offer"],
  core: { name: "core", isCore: !0, budgetMs: 0, run: async () => ({ isOffered: !0 }) },
};
//@ chunk-e6aww6q8.js:58429-58470 placement
var $yt = (e) => e !== void 0 && getHookCaller(e) !== void 0;
/**
 * 对可用代理逐个触发 agent.offer 钩子，过滤掉被钩子拒绝的；由钩子发起的调用或只有默认安全插件时跳过。
 */
//@ chunk-e6aww6q8.js:58470-58779 placement
async function filterOfferedAgents(e, n) {
  if ($yt(n)) return [...e];
  let r = isLoneSecDefaultShortcut("agent.offer"),
    results = await Promise.all(
      e.map((h) =>
        !r && hasModuleHookingSite("agent.offer", { agent: h.agentType })
          ? NO_CORE_AT_CHAIN_BOTTOM(
              "agent.offer",
              {},
            )({
              agent: h.agentType,
              description: h.whenToUse ?? "",
              source: h.source,
              provider: agentProvider(h),
            })
          : { isOffered: !0 },
      ),
    );
  return e.filter((h, y) => results[y]?.isOffered === !0);
}
//@ chunk-e6aww6q8.js:83794-83820 placement
var Tso = UI_ENV_SITE_RULES["agent.spawn"];
//@ chunk-e6aww6q8.js:83820-83888 placement
var N_t = "agent.spawn: a hook answered without passing the spawn on";
/**
 * agent.spawn 钩子拒绝时生成 deny 结果（已中止则抛 AbortError），并记调试日志。
 */
//@ chunk-e6aww6q8.js:83888-84068 placement
function agentSpawnDenied({ result: e, input: input, signal: signal }) {
  if (e.deny !== void 0 && signal.aborted) throw new AbortError_2();
  let s = e.deny ?? N_t;
  return (logForDebugging(`agent.spawn ${input.subagentType}: refused by a hook (${s})`), { deny: s });
}
/**
 * 记录 agent.spawn 钩子改写了哪些输入字段，以及模型的改动。
 */
//@ chunk-e6aww6q8.js:84127-84523 placement
function logAgentSpawnRewrites(e) {
  let { input: input, spawn: spawn } = e,
    s = new Set(AGENT_SPAWN_PINNED_KEYS),
    h = new Set([...Object.keys(input), ...Object.keys(spawn)]),
    y = (G, q) => G[q],
    filtered = [...h].filter((G) => !s.has(G) && G !== "model" && y(input, G) !== y(spawn, G));
  if (filtered.length > 0)
    logForDebugging(`agent.spawn ${input.subagentType}: ${filtered.join(", ")} rewritten by a hook`);
  if (spawn.model === input.model) return;
  logForDebugging(
    `agent.spawn ${input.subagentType}: model ${input.model ?? "(inherit)"} -> ${spawn.model ?? "(inherit)"} by a hook`,
  );
}
//@ chunk-e6aww6q8.js:84523-84602 placement
var jNi = "agent.spawn: the subagent did not start after the hooks passed it on";
/**
 * 记录或清除某代理的派生来源（由哪个钩子发起、是否服务于模型）。
 */
//@ chunk-e6aww6q8.js:4117078-4117287 placement
function recordSpawnProvenance(e, n) {
  let { hookOrigin: hookOrigin, hookCaller: hookCaller, hookServesModel: hookServesModel } = n;
  if (hookCaller === void 0) {
    getPluginRegistry().spawnProvenance.delete(e);
    return;
  }
  getPluginRegistry().spawnProvenance.set(e, {
    hookOrigin: hookOrigin ?? [hookCaller],
    hookCaller: hookCaller,
    ...(hookServesModel && { hookServesModel: hookServesModel }),
  });
}
//@ chunk-e6aww6q8.js:4117287-4117330 placement
function B1o(e) {
  getPluginRegistry().unnamedSteered.add(e);
}
/**
 * 恢复/续接代理时计算派生来源标记，并返回 admit() 在接纳时写回来源记录。
 */
//@ chunk-e6aww6q8.js:4117330-4117831 placement
function resolveSpawnProvenanceMarks(e, n, r) {
  let s = j9n(e),
    h = r.hookCaller !== void 0,
    y = h
      ? !r.hookServesModel
      : isUnknownPluginSpawnedAgent({ hookCaller: void 0, pluginUnnamed: r.pluginUnnamed }),
    S = s?.hookServesModel === !0 && y,
    w = s === void 0 && (n?.pluginSteered === !0 || Nce(e)),
    L = w || (s === void 0 && (h ? y : r.pluginUnnamed === !0)),
    G = { hookServesModel: void 0, pluginSteered: !0, pluginUnnamed: !0 };
  return {
    marks: (s && { ...s, hookServesModel: y ? void 0 : s.hookServesModel }) ?? (w ? G : {}),
    admit: () => {
      if (S)
        getPluginRegistry().spawnProvenance.set(e, { hookOrigin: s.hookOrigin, hookCaller: s.hookCaller });
      if (L) B1o(e);
    },
  };
}
/**
 * 插件相关设置在读取后变化时，再读一次（必要时强制 reread）后返回读取器。
 */
//@ chunk-e6aww6q8.js:4117831-4118038 placement
async function rereadPluginSettings(e, n) {
  if (
    (logForDebugging(
      "Plugin hooks: plugin-affecting settings changed since the plugins were read; reading them again before any hooks module is chosen",
    ),
    (await e.read()) === n)
  )
    await e.reread();
  return e;
}

export {
  filterOfferedAgents,
  recordSpawnProvenance,
  B1o,
  resolveSpawnProvenanceMarks,
  AGENT_OFFER_EVENT,
  Tso,
  rereadPluginSettings,
  jNi,
  agentSpawnDenied,
  logAgentSpawnRewrites,
};
