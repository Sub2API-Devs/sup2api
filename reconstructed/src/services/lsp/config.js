/**
 * services/lsp/config.ts
 *
 * 从已启用插件收集 LSP 服务器配置（316 中 LSP 配置只来自插件 lspServers）。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/services/lsp/config.ts
 * pieces: chunk-e6aww6q8.js (1)
 * attribution: fingerprint 1
 */
import { loadAllPluginsCacheOnly } from "../../utils/plugins/pluginLoader.js";
import { pluginErrorSummary } from "../../utils/plugins/marketplaceNames.js";
import { getPluginLspServers } from "../../utils/plugins/lspPluginIntegration.js";
import { logForDebugging } from "../../utils/debug.js";
import { errorMessage } from "../../utils/errors.js";

//@ chunk-e6aww6q8.js:4625529-4626294 fingerprint = getAllLspServers (0.963)
/**
 * 收集所有已启用插件声明的 LSP 服务器（loadAllPlugins → getPluginLspServers），合并成 {名字: 配置}；任一插件加载失败时 loadFailed=true。316 中 LSP 配置只来自插件。
 */
async function getAllLspServers(storageV5, credentials) {
  let allServers = {};
  let loadFailed = false;
  try {
    let { enabled: plugins, errors } = await loadAllPluginsCacheOnly(storageV5);
    if (errors.some(pluginErrorSummary)) loadFailed = true;
    let results = await Promise.all(
      plugins.map(async (plugin) => {
        let errors = [];
        try {
          let scopedServers = await getPluginLspServers(plugin, errors, storageV5, credentials);
          return {
            plugin,
            scopedServers,
            errors,
          };
        } catch (e) {
          loadFailed = true;
          logForDebugging(`Failed to load LSP servers for plugin ${plugin.name}: ${e}`, {
            level: "error",
          });
          return {
            plugin,
            scopedServers: undefined,
            errors,
          };
        }
      }),
    );
    for (let { plugin, scopedServers, errors } of results) {
      let serverCount = scopedServers ? Object.keys(scopedServers).length : 0;
      if (serverCount > 0) {
        Object.assign(allServers, scopedServers);
        logForDebugging(`Loaded ${serverCount} LSP server(s) from plugin: ${plugin.name}`);
      }
      if (errors.length > 0) {
        loadFailed = true;
        logForDebugging(`${errors.length} error(s) loading LSP servers from plugin: ${plugin.name}`);
      }
    }
    logForDebugging(`Total LSP servers loaded: ${Object.keys(allServers).length}`);
  } catch (error) {
    loadFailed = true;
    logForDebugging(`Error loading LSP servers: ${errorMessage(error)}`, {
      level: "error",
    });
  }
  return {
    servers: allServers,
    loadFailed,
  };
}
export { getAllLspServers };
