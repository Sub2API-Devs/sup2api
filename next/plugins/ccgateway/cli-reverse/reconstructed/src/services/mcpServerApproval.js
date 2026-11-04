/**
 * services/mcpServerApproval.tsx
 *
 * 收集需要用户审批的 .mcp.json 与插件服务器名，供启动时审批对话框使用。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/services/mcpServerApproval.tsx
 * pieces: chunk-20skp6hd.js (1)
 * attribution: fingerprint 1
 */
import { getMcpConfigsByScope } from "./mcp/config.js";
import { loadAllPluginsCacheOnly } from "../utils/plugins/pluginLoader.js";
import { isProjectLocalPlugin } from "../utils/plugins/pluginIdentifier.js";
import { getPluginMcpServers } from "../utils/plugins/mcpPluginIntegration.js";

//@ chunk-20skp6hd.js:4564-4885 fingerprint = handleMcpjsonServerApprovals (0.524)
/**
 * collectProjectMcpServerNames：收集 project 作用域（.mcp.json）与已启用、需审批插件提供的服务器名，返回 {serverNames, pluginServerNames, rootServers}，供 .mcp.json 审批对话框使用。
 */
async function collectProjectMcpServerNames(root) {
  let { servers: projectServers } = getMcpConfigsByScope("project");
  let keys = Object.keys(projectServers);
  let seenNames = new Set(keys);
  let pluginServerNames = new Set();
  let { enabled } = await loadAllPluginsCacheOnly(root);
  let pendingServers = enabled.filter(isProjectLocalPlugin);
  for (let pendingServer of pendingServers) {
    let pluginMcpServers = await getPluginMcpServers(pendingServer, [], root);
    if (!pluginMcpServers) continue;
    for (let key of Object.keys(pluginMcpServers)) {
      if (seenNames.has(key) || pluginServerNames.has(key)) continue;
      keys.push(key);
      pluginServerNames.add(key);
    }
  }
  return {
    serverNames: keys,
    pluginServerNames,
    rootServers: projectServers,
  };
}
export { collectProjectMcpServerNames };
