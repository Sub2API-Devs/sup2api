/**
 * utils/plugins/refresh.ts
 *
 * 并入已有模块：插件刷新补充。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/utils/plugins/refresh.ts
 * pieces: chunk-4q6mp9e8.js (4), chunk-7nse75qx.js (1)
 * attribution: placement 3, fingerprint 2
 */
import { isBareMode } from "../envUtils.js";
import { isChannelPluginAllowed } from "../../services/mcp/channelAllowlist.js";
import { getSyncedPluginReloadDebt, getOriginalCwd } from "../../bootstrap/state.js";
import { getPluginRegistry } from "./pluginLoadState.js";
import { marketplaceNameAnswerState } from "./marketplaceNames.js";
import { logError } from "../log.js";
import { logForDebugging } from "../debug.js";
import { markKeychainCacheStale } from "../secureStorage/macOsKeychainHelpers.js";
import { clearInstalledPluginsCache } from "./installedPluginsManager.js";
import { env } from "../env.js";
import {
  hasMarketplaceBackedPlugins,
  loadAllPluginsCacheOnly,
  loadAllPlugins,
  releaseSyncedDirsNotIn,
} from "./pluginLoader.js";
import { refreshPluginCaches, clearPluginDerivedState } from "./cacheUtils.js";
import { clearOrphanedGlobExclusions } from "./orphanedPluginFilter.js";
import { pruneRemovedPluginHooks, loadPluginHooks } from "./loadPluginHooks.js";
import { invalidateShellSnapshotIfPluginBinsChanged } from "../Shell.js";
import { SandboxManager } from "../sandbox/sandbox-adapter.js";
import { getPluginCommands, loadPluginSkills } from "./loadPluginCommands.js";
import { getAgentDefinitionsWithOverrides } from "../../tools/AgentTool/loadAgentsDir.js";
import { extractMcpServersFromPlugins } from "./mcpPluginIntegration.js";
import { loadPluginLspServers, findLspExtensionConflicts } from "./lspPluginIntegration.js";
import { reinitializeLspServerManager } from "../../services/lsp/manager.js";
import { errorMessage } from "../errors.js";
import { getHostState } from "../hostEnvironment.js";
import { skillsChangedSignal } from "./pluginsChangedSignal.js";
import { count } from "../collections.js";

//@ chunk-7nse75qx.js:453-519 fingerprint = mergePluginErrors (1)
/**
 * 名字是否属于插件/LSP 管理器来源（lsp-manager 或 plugin: 前缀）。
 */
function mergePluginErrors(source) {
  return source === "lsp-manager" || source.startsWith("plugin:");
}
//@ chunk-4q6mp9e8.js:1153-1189 placement
/**
 * bareModePluginAllow：裸模式下的通配插件放行函数。
 */
function bareModePluginAllow() {
  return isBareMode() ? isChannelPluginAllowed : undefined;
}
//@ chunk-4q6mp9e8.js:1189-1276 placement
/**
 * pluginIdsWithSource：有 pluginSource 的插件 id。
 */
var pluginIdsWithSource = (dynamicMcpConfig) =>
  Object.entries(dynamicMcpConfig ?? {})
    .filter(([, value]) => value.pluginSource !== undefined)
    .map(([key]) => key);
//@ chunk-4q6mp9e8.js:1276-1309 placement
/**
 * noReloadPlugins：已裁掉的插件重载（返回 0）。
 */
async function noReloadPlugins(enabled, enabled_2) {
  return 0;
}
//@ chunk-4q6mp9e8.js:1309-3503 fingerprint = refreshActivePlugins (0.701)
/**
 * /reload-plugins 与安装后刷新：清空插件相关缓存、重新加载插件（完整或 cacheOnly）、刷新命令/代理/输出样式/MCP/LSP、重新注册 hooks，汇总各组件数量与错误供界面展示。
 */
async function refreshActivePlugins(appState, storageV5, credentials, options = {}) {
  let applyStagedInstalls = options.applyStagedInstalls ?? true;
  let syncedPluginReloadDebt = getSyncedPluginReloadDebt();
  let { changesLanded, holdsSet } = syncedPluginReloadDebt;
  using dispose = {
    [Symbol.dispose]: () => {
      syncedPluginReloadDebt.endHoldSetBefore(holdsSet);
    },
  };
  let organizationAsk = getPluginRegistry().organizationAsk;
  let heldReresolve =
    applyStagedInstalls && marketplaceNameAnswerState() !== "unanswered"
      ? organizationAsk.heldReresolve
      : null;
  if (heldReresolve) {
    organizationAsk.heldReresolve = null;
    await heldReresolve().catch(logError);
  }
  logForDebugging("refreshActivePlugins: clearing all plugin caches");
  if (applyStagedInstalls) {
    markKeychainCacheStale();
    clearInstalledPluginsCache();
  }
  let oneLoadMode =
    env.CLAUDE_CODE_CCR_ONE_PLUGIN_LOAD_PER_RELOAD &&
    !env.CLAUDE_CODE_SYNC_PLUGIN_INSTALL &&
    !hasMarketplaceBackedPlugins() &&
    getPluginRegistry().pluginLoadsRunning === 0;
  refreshPluginCaches(storageV5, credentials, oneLoadMode ? "caller" : "clear");
  if (applyStagedInstalls) clearOrphanedGlobExclusions();
  if (oneLoadMode) pruneRemovedPluginHooks(storageV5, credentials).catch(logError);
  let loadResult;
  if (oneLoadMode) {
    let allPluginsCacheOnly = loadAllPluginsCacheOnly(storageV5, credentials);
    let loadOutcome = await allPluginsCacheOnly.catch((error) => {
      logError(error);
      return;
    });
    if (getPluginRegistry().pluginLoadCacheOnly === allPluginsCacheOnly && !hasMarketplaceBackedPlugins())
      loadResult = loadOutcome;
  }
  loadResult ??= await loadAllPlugins(storageV5, credentials);
  clearPluginDerivedState();
  let pluginLoadCacheOnly = getPluginRegistry().pluginLoadCacheOnly;
  await invalidateShellSnapshotIfPluginBinsChanged(storageV5);
  SandboxManager.refreshConfig();
  let [pluginCommands, pluginSkills, agentDefinitionsWithOverrides] = await Promise.all([
    getPluginCommands(storageV5),
    loadPluginSkills(storageV5),
    getAgentDefinitionsWithOverrides(getOriginalCwd(), storageV5),
  ]);
  let { enabled, disabled, errors, warnings } = loadResult;
  let mcpErrors = [];
  let mcpWarnings = [];
  let [mcpCounts, lspCounts] = await Promise.all([
    Promise.all(
      enabled.map(async (plugin) => {
        let servers = await extractMcpServersFromPlugins(plugin, mcpErrors, storageV5, {
          warnings: mcpWarnings,
        });
        return servers ? Object.keys(servers).length : 0;
      }),
    ),
    Promise.all(
      enabled.map(async (plugin) => {
        if (plugin.lspServers) return Object.keys(plugin.lspServers).length;
        let servers = await loadPluginLspServers(plugin, mcpErrors, storageV5);
        if (servers) plugin.lspServers = servers;
        return servers ? Object.keys(servers).length : 0;
      }),
    ),
  ]);
  let mcp_count = mcpCounts.reduce((sum, n) => sum + n, 0);
  let lsp_count = lspCounts.reduce((sum, n) => sum + n, 0);
  await noReloadPlugins(enabled, mcpErrors);
  let warnings_2 = [...warnings, ...mcpWarnings, ...findLspExtensionConflicts(enabled)];
  let errors_2 = [...errors, ...mcpErrors];
  appState.applyRefresh({
    enabled,
    disabled,
    commands: pluginCommands,
    errors: errors_2,
    warnings: warnings_2,
    agentDefinitions: agentDefinitionsWithOverrides,
  });
  reinitializeLspServerManager(storageV5, credentials);
  let hook_load_failed = false;
  try {
    await loadPluginHooks(storageV5, credentials);
  } catch (e) {
    hook_load_failed = true;
    logError(e);
    logForDebugging(`refreshActivePlugins: loadPluginHooks failed: ${errorMessage(e)}`);
  }
  if (!hook_load_failed) {
    await releaseSyncedDirsNotIn(enabled, storageV5).catch(logError);
    syncedPluginReloadDebt.reloaded(changesLanded);
  }
  let hook_count = enabled.reduce((sum, plugin) => {
    if (!plugin.hooksConfig) return sum;
    return (
      sum +
      Object.values(plugin.hooksConfig).reduce(
        (acc, matchers) => acc + (matchers?.reduce((acc, m) => acc + m.hooks.length, 0) ?? 0),
        0,
      )
    );
  }, 0);
  let hostState = getHostState();
  hostState.isAnnouncingFreshLoad =
    pluginLoadCacheOnly !== undefined && getPluginRegistry().pluginLoadCacheOnly === pluginLoadCacheOnly;
  try {
    skillsChangedSignal.emit();
  } finally {
    hostState.isAnnouncingFreshLoad = false;
  }
  logForDebugging(
    `refreshActivePlugins: ${enabled.length} enabled, ${pluginCommands.length} commands, ${pluginSkills.length} skills, ${agentDefinitionsWithOverrides.allAgents.length} agents, ${hook_count} hooks, ${mcp_count} MCP, ${lsp_count} LSP`,
  );
  return {
    enabled_count: count(enabled, (plugin) => plugin.isBuiltin !== true),
    disabled_count: count(disabled, (plugin) => plugin.isBuiltin !== true),
    command_count: pluginCommands.length,
    skill_count: pluginSkills.length,
    agent_count: agentDefinitionsWithOverrides.allAgents.length,
    hook_count,
    mcp_count,
    lsp_count,
    error_count: errors_2.length + (hook_load_failed ? 1 : 0),
    errors: errors_2,
    warnings: warnings_2,
    agentDefinitions: agentDefinitionsWithOverrides,
    pluginCommands,
  };
}
export { refreshActivePlugins, noReloadPlugins, bareModePluginAllow, pluginIdsWithSource, mergePluginErrors };
