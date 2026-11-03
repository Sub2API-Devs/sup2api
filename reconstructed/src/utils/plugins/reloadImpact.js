/**
 * utils/plugins/reloadImpact.ts
 *
 * 2.1.316 新增：计算重新加载插件对 MCP 客户端、命令等的影响；比较重载前后启用插件与加载错误。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-4q6mp9e8.js (3)
 * attribution: placement 3
 */
import { loadAllPluginsForPreview } from "./pluginLoader.js";
import { getConnectablePluginMcpServerNames } from "../../services/mcp/config.js";
import { bareModePluginAllow, pluginIdsWithSource } from "./refresh.js";
import {
  isToolSearchEnabledOptimistic,
  modelSupportsToolReference,
  isVertexModelWithoutToolSearch,
} from "../toolSearch.js";
import { getTotalOutputTokens } from "../../bootstrap/state.js";
import { isCoordinatorEnvSet } from "../../coordinator/coordinatorMode.js";
import { isCustomizationDisabled } from "../settings/customizationDisabled.js";
import { shouldDeferLspForRemoteSession, hasLspEverConnected } from "../../services/lsp/manager.js";
import { pluginErrorSummary } from "./marketplaceNames.js";
import { getPluginLspServers } from "./lspPluginIntegration.js";
import { logEvent } from "../../services/analytics/index.js";

//@ chunk-4q6mp9e8.js:3503-4402 placement
/**
 * 计算重新加载插件对 MCP 客户端、命令等的影响。
 */
async function computePluginReloadImpact(n) {
  let e = new Set(
    n.mcpClients
      .filter((mcpClient) => mcpClient.config.pluginSource !== undefined)
      .map((mcpClient) => mcpClient.name),
  );
  let u;
  let y = () => (u ??= loadAllPluginsForPreview(n.storageV5));
  let connectablePluginMcpServerNames = await getConnectablePluginMcpServerNames(
    n.dynamicMcpConfig ?? {},
    n.storageV5,
    y,
    bareModePluginAllow(),
  );
  for (let o of pluginIdsWithSource(n.dynamicMcpConfig)) connectablePluginMcpServerNames.add(o);
  let sorted = [...connectablePluginMcpServerNames]
    .filter((connectablePluginMcpServerName) => !e.has(connectablePluginMcpServerName))
    .sort();
  let sorted_2 = [...e].filter((o) => !connectablePluginMcpServerNames.has(o)).sort();
  let S = sorted.length > 0 || sorted_2.length > 0;
  let h =
    isToolSearchEnabledOptimistic() &&
    modelSupportsToolReference(n.model) &&
    !isVertexModelWithoutToolSearch(n.model);
  let s = getTotalOutputTokens() > 0;
  let g = null;
  if (isCoordinatorEnvSet() && !h && s && !isCustomizationDisabled("lspServers")) {
    let o = shouldDeferLspForRemoteSession()
      ? {
          hasServers: false,
          loaderFailed: false,
          loaderFailedApplyHealable: false,
          derivationFailed: false,
        }
      : await diffEnabledPlugins(y, n.storageV5, n.credentials);
    if (!hasLspEverConnected()) {
      if (o.hasServers) g = "adds";
      else if (o.loaderFailedApplyHealable) g = "may-add";
    } else if (!o.hasServers && !o.derivationFailed) {
      if (o.loaderFailedApplyHealable) g = "may-remove";
      else if (!o.loaderFailed) g = "removes";
    }
  }
  return {
    mcpServersAdded: sorted,
    mcpServersRemoved: sorted_2,
    toolSearchEnabled: h,
    lspToolChange: g,
    wouldInvalidateCache: (S || g !== null) && !h && s,
  };
}
//@ chunk-4q6mp9e8.js:4402-4949 placement
/**
 * 比较重载前后启用插件与加载错误。
 */
async function diffEnabledPlugins(n, storageV5, credentials) {
  let { enabled, errors } = await n();
  let hasServers = false;
  let loaderFailed = errors.some(pluginErrorSummary);
  let loaderFailedApplyHealable = errors.some(
    (error) =>
      pluginErrorSummary(error) &&
      !(error.type === "plugin-not-installed" && error.registryReadFailed !== true) &&
      !(error.type === "marketplace-not-found" && error.registryReadFailed !== true) &&
      error.type !== "dependency-version-unsatisfied" &&
      !(error.type === "dependency-unsatisfied" && error.reason !== "not-found"),
  );
  let h = false;
  for (let s of enabled) {
    let g = [];
    try {
      let pluginLspServers = await getPluginLspServers(s, g, storageV5, credentials);
      if (pluginLspServers !== undefined && Object.keys(pluginLspServers).length > 0) hasServers = true;
    } catch {
      h = true;
    }
    if (g.length > 0) h = true;
  }
  return {
    hasServers,
    loaderFailed,
    loaderFailedApplyHealable,
    derivationFailed: h,
  };
}
//@ chunk-4q6mp9e8.js:4949-5179 placement
/**
 * 记 tengu_reload_plugins_cache_impact（MCP/LSP 变化、是否警告/强制）。
 */
function logReloadPluginsImpact(pluginReloadImpact, e) {
  logEvent("tengu_reload_plugins_cache_impact", {
    mcp_changed:
      pluginReloadImpact.mcpServersAdded.length > 0 || pluginReloadImpact.mcpServersRemoved.length > 0,
    lsp_changed: pluginReloadImpact.lspToolChange !== null,
    tool_search_on: pluginReloadImpact.toolSearchEnabled,
    warned: e.warned,
    forced: e.forced,
  });
}
export { computePluginReloadImpact, logReloadPluginsImpact };
