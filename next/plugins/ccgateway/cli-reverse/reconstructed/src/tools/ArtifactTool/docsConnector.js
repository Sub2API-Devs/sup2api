/**
 * tools/ArtifactTool/docsConnector.ts
 *
 * 2.1.316 新增：文档连接器
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-4qyfrn7n.js (6)
 * attribution: placement 6
 */
import { typeNameKey } from "../../services/artifacts/artifactTypes.js";
import { isClaudeAiProxyServer } from "../../components/mcp/MCPListPanel.js";
import { isDocsConnectorUrl } from "../../services/mcp/resultContent.js";
import { isHostEntrypointSession } from "../../services/artifacts/artifactConnectors.js";
import { normalizeUuidOrNull } from "../../utils/agentId.js";
import {
  alnumLower,
  isDocsServerId,
  DOCS_SERVER_NAMES,
  DOCS_MCP_PATH,
  DOCS_SERVER_ID,
} from "../../services/mcp/firstPartyServerIds.js";
import { env } from "../../utils/env.js";
import { isPluginServerConfig } from "../../services/mcp/types.js";
import { isFirstPartyToolboxServer } from "../../services/mcp/fileReference/fileReferencePolicy.js";
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-4qyfrn7n.js:503-560 placement
/**
 * Docs 类型标题别名与内部键。
 */
var DOCS_TYPE_TITLES; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
var DOCS_TYPE_KEYS;
deferInit("chunk-4qyfrn7n.js:503", () => {
  DOCS_TYPE_TITLES = ["Docs"];
  DOCS_TYPE_KEYS = new Set(["claudedocs", "claudepages"]);
});
//@ chunk-4qyfrn7n.js:560-637 placement
/**
 * 判断类型是否是 Docs 的 core 类型。
 */
function isCoreDocsType(type) {
  return (
    type.tier === "core" && DOCS_TYPE_TITLES.some((title) => typeNameKey(type.title) === typeNameKey(title))
  );
}
//@ chunk-4qyfrn7n.js:637-826 placement
/**
 * 本会话未接入 Claude Docs 连接器时，Docs 类型只能经连接器填写，文档应改为普通页面的说明。
 */
var DOCS_CONNECTOR_UNATTACHED_NOTE =
  "The Docs type is filled only through the first-party Claude Docs connector, which is not attached in this session: for a document, make a page instead of starting from that type.";
//@ chunk-4qyfrn7n.js:826-1150 placement
/**
 * 判断 MCP 服务器是否为第一方 Claude Docs 连接器：claude.ai 代理服务器、SDK 注入的对应服务器，或远程会话中的动态 http 服务器（非插件或特定配置）。
 */
function isDocsConnectorServer(client) {
  return (
    (client.config.type === "claudeai-proxy" &&
      isClaudeAiProxyServer(client.config) &&
      isDocsConnectorUrl(client.config)) ||
    isDocsConnectorClient(client) ||
    (isHostEntrypointSession() &&
      client.config.type === "sdk" &&
      normalizeUuidOrNull(client.name) !== null &&
      DOCS_TYPE_KEYS.has(alnumLower(client.serverInfo?.name ?? ""))) ||
    (env.CLAUDE_CODE_REMOTE === true &&
      client.config.type === "http" &&
      client.config.scope === "dynamic" &&
      (!isPluginServerConfig(client.config) || isDocsConnectorUrl(client.config)) &&
      (isDocsServerId(client.config) || DOCS_SERVER_NAMES.has(client.name)))
  );
}
//@ chunk-4qyfrn7n.js:1150-1227 placement
/**
 * 判断 MCP 客户端是否是 Claude Docs 连接器。
 */
function isDocsConnectorClient(client) {
  return (
    client.config.type === "sdk" &&
    isFirstPartyToolboxServer(client, {
      path: DOCS_MCP_PATH,
      serverId: DOCS_SERVER_ID,
    })
  );
}
//@ chunk-4qyfrn7n.js:1227-1333 placement
/**
 * 判断已连接/待连接/缓存的 MCP 客户端中是否有 Claude Docs 连接器。
 */
function hasDocsConnector(clients) {
  return clients.some(
    (client) =>
      (client.type === "connected" || client.type === "pending" || client.type === "cached") &&
      isDocsConnectorServer(client),
  );
}
export {
  isDocsConnectorClient,
  isDocsConnectorServer,
  isCoreDocsType,
  hasDocsConnector,
  DOCS_CONNECTOR_UNATTACHED_NOTE,
  DOCS_TYPE_TITLES,
};
