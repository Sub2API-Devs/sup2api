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
import { J_ } from "./marketplaceNames.js";
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
import { ic, clearPluginDerivedState } from "./cacheUtils.js";
import { vYs } from "./orphanedPluginFilter.js";
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
import { Jz } from "./pluginsChangedSignal.js";
import { count } from "../collections.js";

//@ chunk-4q6mp9e8.js:1153-1189 placement
function zye() {
  return isBareMode() ? isChannelPluginAllowed : void 0;
}
//@ chunk-4q6mp9e8.js:1189-1276 placement
var T = (n) =>
  Object.entries(n ?? {})
    .filter(([, e]) => e.pluginSource !== void 0)
    .map(([e]) => e);
//@ chunk-4q6mp9e8.js:1276-1309 placement
async function pDr(n, e) {
  return 0;
}
/**
 * /reload-plugins 与安装后刷新：清空插件相关缓存、重新加载插件（完整或 cacheOnly）、刷新命令/代理/输出样式/MCP/LSP、重新注册 hooks，汇总各组件数量与错误供界面展示。
 */
//@ chunk-4q6mp9e8.js:1309-3503 fingerprint = refreshActivePlugins (0.701)
async function refreshActivePlugins(n, e, u, y = {}) {
  let f = y.applyStagedInstalls ?? !0,
    m = getSyncedPluginReloadDebt(),
    { changesLanded: changesLanded, holdsSet: holdsSet } = m;
  using h = {
    [Symbol.dispose]: () => {
      m.endHoldSetBefore(holdsSet);
    },
  };
  let organizationAsk = getPluginRegistry().organizationAsk,
    k = f && J_() !== "unanswered" ? organizationAsk.heldReresolve : null;
  if (k) ((organizationAsk.heldReresolve = null), await k().catch(logError));
  if ((logForDebugging("refreshActivePlugins: clearing all plugin caches"), f))
    (markKeychainCacheStale(), clearInstalledPluginsCache());
  let o =
    env.CLAUDE_CODE_CCR_ONE_PLUGIN_LOAD_PER_RELOAD &&
    !env.CLAUDE_CODE_SYNC_PLUGIN_INSTALL &&
    !hasMarketplaceBackedPlugins() &&
    getPluginRegistry().pluginLoadsRunning === 0;
  if ((ic(e, u, o ? "caller" : "clear"), f)) vYs();
  if (o) pruneRemovedPluginHooks(e, u).catch(logError);
  let A;
  if (o) {
    let r = loadAllPluginsCacheOnly(e, u),
      c = await r.catch((E) => {
        logError(E);
        return;
      });
    if (getPluginRegistry().pluginLoadCacheOnly === r && !hasMarketplaceBackedPlugins()) A = c;
  }
  ((A ??= await loadAllPlugins(e, u)), clearPluginDerivedState());
  let pluginLoadCacheOnly = getPluginRegistry().pluginLoadCacheOnly;
  (await invalidateShellSnapshotIfPluginBinsChanged(e), SandboxManager.refreshConfig());
  let [b, C, _] = await Promise.all([
      getPluginCommands(e),
      loadPluginSkills(e),
      getAgentDefinitionsWithOverrides(getOriginalCwd(), e),
    ]),
    { enabled: enabled, disabled: disabled, errors: errors, warnings: warnings } = A,
    P = [],
    I = [],
    [z, H] = await Promise.all([
      Promise.all(
        enabled.map(async (r) => {
          let c = await extractMcpServersFromPlugins(r, P, e, { warnings: I });
          return c ? Object.keys(c).length : 0;
        }),
      ),
      Promise.all(
        enabled.map(async (r) => {
          if (r.lspServers) return Object.keys(r.lspServers).length;
          let c = await loadPluginLspServers(r, P, e);
          if (c) r.lspServers = c;
          return c ? Object.keys(c).length : 0;
        }),
      ),
    ]),
    mcp_count = z.reduce((sum, c) => sum + c, 0),
    lsp_count = H.reduce((sum, c) => sum + c, 0);
  await pDr(enabled, P);
  let v = [...warnings, ...I, ...findLspExtensionConflicts(enabled)],
    L = [...errors, ...P];
  (n.applyRefresh({
    enabled: enabled,
    disabled: disabled,
    commands: b,
    errors: L,
    warnings: v,
    agentDefinitions: _,
  }),
    reinitializeLspServerManager(e, u));
  let j = !1;
  try {
    await loadPluginHooks(e, u);
  } catch (error) {
    ((j = !0),
      logError(error),
      logForDebugging(`refreshActivePlugins: loadPluginHooks failed: ${errorMessage(error)}`));
  }
  if (!j) (await releaseSyncedDirsNotIn(enabled, e).catch(logError), m.reloaded(changesLanded));
  let hook_count = enabled.reduce((sum, c) => {
      if (!c.hooksConfig) return sum;
      return (
        sum +
        Object.values(c.hooksConfig).reduce(
          (E, matchers) => E + (matchers?.reduce((J, W) => J + W.hooks.length, 0) ?? 0),
          0,
        )
      );
    }, 0),
    N = getHostState();
  N.isAnnouncingFreshLoad =
    pluginLoadCacheOnly !== void 0 && getPluginRegistry().pluginLoadCacheOnly === pluginLoadCacheOnly;
  try {
    Jz.emit();
  } finally {
    N.isAnnouncingFreshLoad = !1;
  }
  return (
    logForDebugging(
      `refreshActivePlugins: ${enabled.length} enabled, ${b.length} commands, ${C.length} skills, ${_.allAgents.length} agents, ${hook_count} hooks, ${mcp_count} MCP, ${lsp_count} LSP`,
    ),
    {
      enabled_count: count(enabled, (r) => r.isBuiltin !== !0),
      disabled_count: count(disabled, (r) => r.isBuiltin !== !0),
      command_count: b.length,
      skill_count: C.length,
      agent_count: _.allAgents.length,
      hook_count: hook_count,
      mcp_count: mcp_count,
      lsp_count: lsp_count,
      error_count: L.length + (j ? 1 : 0),
      errors: L,
      warnings: v,
      agentDefinitions: _,
      pluginCommands: b,
    }
  );
}
/**
 * 名字是否属于插件/LSP 管理器来源（lsp-manager 或 plugin: 前缀）。
 */
//@ chunk-7nse75qx.js:453-519 fingerprint = mergePluginErrors (1)
function mergePluginErrors(e) {
  return e === "lsp-manager" || e.startsWith("plugin:");
}

export { refreshActivePlugins, pDr, zye, T, mergePluginErrors };
