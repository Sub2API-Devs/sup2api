/**
 * services/mcpServerApproval.tsx
 *
 * 收集需要用户审批的 .mcp.json 与插件服务器名，供启动时审批对话框使用。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/services/mcpServerApproval.tsx
 * pieces: chunk-ezx72dpn.js (1)
 * attribution: fingerprint 1
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { getMcpConfigsByScope } from "./mcp/config.js";
import { loadAllPluginsCacheOnly } from "../utils/plugins/pluginLoader.js";
import { isProjectLocalPlugin } from "../utils/plugins/pluginIdentifier.js";
import { getPluginMcpServers } from "../utils/plugins/mcpPluginIntegration.js";

//@ chunk-ezx72dpn.js:4566-4887 fingerprint (2.1.88 match: handleMcpjsonServerApprovals, 0.523)
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
