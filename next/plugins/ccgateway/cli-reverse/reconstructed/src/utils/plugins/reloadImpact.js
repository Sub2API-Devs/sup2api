/**
 * utils/plugins/reloadImpact.ts
 *
 * 2.1.316 新增：计算重新加载插件对 MCP 客户端、命令等的影响；比较重载前后启用插件与加载错误。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-0qaty0z2.js (3)
 * attribution: placement 3
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { loadAllPluginsForPreview } from "./pluginLoader.js";
import { getConnectablePluginMcpServerNames } from "../../services/mcp/config.js";
import { bareModePluginAllow, pluginIdsWithSource } from "./refresh.js";
import {
  isToolSearchEnabledOptimistic,
  supportsToolReferenceOrPelican,
  isVertexModelWithoutToolSearch,
} from "../toolSearch.js";
import { getTotalOutputTokens } from "../../bootstrap/state.js";
import { isCoordinatorEnvSet } from "../../coordinator/coordinatorMode.js";
import { isCustomizationDisabled } from "../settings/customizationDisabled.js";
import { shouldDeferLspForRemoteSession, hasLspEverConnected } from "../../services/lsp/manager.js";
import { pluginErrorSummary } from "./marketplaceNames.js";
import { getPluginLspServers } from "./lspPluginIntegration.js";
import { logEvent } from "../../services/analytics/index.js";

//@ chunk-0qaty0z2.js:3486-4386 placement
/**
 * 计算重新加载插件对 MCP 客户端、命令等的影响。
 */
async function computePluginReloadImpact(context) {
  let currentNames = new Set(
    context.mcpClients
      .filter((mcpClient) => mcpClient.config.pluginSource !== undefined)
      .map((mcpClient) => mcpClient.name),
  );
  let loadOnce;
  let loadPlugins = () => (loadOnce ??= loadAllPluginsForPreview(context.storageV5));
  let connectablePluginMcpServerNames = await getConnectablePluginMcpServerNames(
    context.dynamicMcpConfig ?? {},
    context.storageV5,
    loadPlugins,
    bareModePluginAllow(),
  );
  for (let name of pluginIdsWithSource(context.dynamicMcpConfig)) connectablePluginMcpServerNames.add(name);
  let sorted = [...connectablePluginMcpServerNames]
    .filter((connectablePluginMcpServerName) => !currentNames.has(connectablePluginMcpServerName))
    .sort();
  let sorted_2 = [...currentNames].filter((name) => !connectablePluginMcpServerNames.has(name)).sort();
  let hasMcpChange = sorted.length > 0 || sorted_2.length > 0;
  let toolSearch =
    isToolSearchEnabledOptimistic() &&
    supportsToolReferenceOrPelican(context.model) &&
    !isVertexModelWithoutToolSearch(context.model);
  let hasOutput = getTotalOutputTokens() > 0;
  let lspChange = null;
  if (isCoordinatorEnvSet() && !toolSearch && hasOutput && !isCustomizationDisabled("lspServers")) {
    let lspDiff = shouldDeferLspForRemoteSession()
      ? {
          hasServers: false,
          loaderFailed: false,
          loaderFailedApplyHealable: false,
          derivationFailed: false,
        }
      : await diffEnabledPlugins(loadPlugins, context.storageV5, context.credentials);
    if (!hasLspEverConnected()) {
      if (lspDiff.hasServers) lspChange = "adds";
      else if (lspDiff.loaderFailedApplyHealable) lspChange = "may-add";
    } else if (!lspDiff.hasServers && !lspDiff.derivationFailed) {
      if (lspDiff.loaderFailedApplyHealable) lspChange = "may-remove";
      else if (!lspDiff.loaderFailed) lspChange = "removes";
    }
  }
  return {
    mcpServersAdded: sorted,
    mcpServersRemoved: sorted_2,
    toolSearchEnabled: toolSearch,
    lspToolChange: lspChange,
    wouldInvalidateCache: (hasMcpChange || lspChange !== null) && !toolSearch && hasOutput,
  };
}
//@ chunk-0qaty0z2.js:4386-4933 placement
/**
 * 比较重载前后启用插件与加载错误。
 */
async function diffEnabledPlugins(loadPlugins, storageV5, credentials) {
  let { enabled, errors } = await loadPlugins();
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
  let derivationFailed = false;
  for (let plugin of enabled) {
    let lspErrors = [];
    try {
      let pluginLspServers = await getPluginLspServers(plugin, lspErrors, storageV5, credentials);
      if (pluginLspServers !== undefined && Object.keys(pluginLspServers).length > 0) hasServers = true;
    } catch {
      derivationFailed = true;
    }
    if (lspErrors.length > 0) derivationFailed = true;
  }
  return {
    hasServers,
    loaderFailed,
    loaderFailedApplyHealable,
    derivationFailed,
  };
}
//@ chunk-0qaty0z2.js:4933-5163 placement
/**
 * 记 tengu_reload_plugins_cache_impact（MCP/LSP 变化、是否警告/强制）。
 */
function logReloadPluginsImpact(impact, flags) {
  logEvent("tengu_reload_plugins_cache_impact", {
    mcp_changed: impact.mcpServersAdded.length > 0 || impact.mcpServersRemoved.length > 0,
    lsp_changed: impact.lspToolChange !== null,
    tool_search_on: impact.toolSearchEnabled,
    warned: flags.warned,
    forced: flags.forced,
  });
}
export { computePluginReloadImpact, logReloadPluginsImpact };
