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
import { zye, T } from "./refresh.js";
import {
  isToolSearchEnabledOptimistic,
  modelSupportsToolReference,
  isVertexModelWithoutToolSearch,
} from "../toolSearch.js";
import { getTotalOutputTokens } from "../../bootstrap/state.js";
import { Dqe } from "../../coordinator/coordinatorMode.js";
import { isCustomizationDisabled } from "../settings/customizationDisabled.js";
import { shouldDeferLspForRemoteSession, hasLspEverConnected } from "../../services/lsp/manager.js";
import { pluginErrorSummary } from "./marketplaceNames.js";
import { getPluginLspServers } from "./lspPluginIntegration.js";
import { logEvent } from "../../services/analytics/index.js";

/**
 * 计算重新加载插件对 MCP 客户端、命令等的影响。
 */
//@ chunk-4q6mp9e8.js:3503-4402 placement
async function computePluginReloadImpact(n) {
  let e = new Set(
      n.mcpClients.filter((mcpClient) => mcpClient.config.pluginSource !== void 0).map((o) => o.name),
    ),
    u,
    y = () => (u ??= loadAllPluginsForPreview(n.storageV5)),
    f = await getConnectablePluginMcpServerNames(n.dynamicMcpConfig ?? {}, n.storageV5, y, zye());
  for (let o of T(n.dynamicMcpConfig)) f.add(o);
  let sorted = [...f].filter((o) => !e.has(o)).sort(),
    sorted_2 = [...e].filter((o) => !f.has(o)).sort(),
    S = sorted.length > 0 || sorted_2.length > 0,
    h =
      isToolSearchEnabledOptimistic() &&
      modelSupportsToolReference(n.model) &&
      !isVertexModelWithoutToolSearch(n.model),
    s = getTotalOutputTokens() > 0,
    g = null;
  if (Dqe() && !h && s && !isCustomizationDisabled("lspServers")) {
    let o = shouldDeferLspForRemoteSession()
      ? { hasServers: !1, loaderFailed: !1, loaderFailedApplyHealable: !1, derivationFailed: !1 }
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
/**
 * 比较重载前后启用插件与加载错误。
 */
//@ chunk-4q6mp9e8.js:4402-4949 placement
async function diffEnabledPlugins(n, e, u) {
  let { enabled: enabled, errors: errors } = await n(),
    m = !1,
    any = errors.some(pluginErrorSummary),
    any_2 = errors.some(
      (s) =>
        pluginErrorSummary(s) &&
        !(s.type === "plugin-not-installed" && s.registryReadFailed !== !0) &&
        !(s.type === "marketplace-not-found" && s.registryReadFailed !== !0) &&
        s.type !== "dependency-version-unsatisfied" &&
        !(s.type === "dependency-unsatisfied" && s.reason !== "not-found"),
    ),
    h = !1;
  for (let s of enabled) {
    let g = [];
    try {
      let k = await getPluginLspServers(s, g, e, u);
      if (k !== void 0 && Object.keys(k).length > 0) m = !0;
    } catch {
      h = !0;
    }
    if (g.length > 0) h = !0;
  }
  return { hasServers: m, loaderFailed: any, loaderFailedApplyHealable: any_2, derivationFailed: h };
}
/**
 * 记 tengu_reload_plugins_cache_impact（MCP/LSP 变化、是否警告/强制）。
 */
//@ chunk-4q6mp9e8.js:4949-5179 placement
function logReloadPluginsImpact(n, e) {
  logEvent("tengu_reload_plugins_cache_impact", {
    mcp_changed: n.mcpServersAdded.length > 0 || n.mcpServersRemoved.length > 0,
    lsp_changed: n.lspToolChange !== null,
    tool_search_on: n.toolSearchEnabled,
    warned: e.warned,
    forced: e.forced,
  });
}

export { computePluginReloadImpact, logReloadPluginsImpact };
