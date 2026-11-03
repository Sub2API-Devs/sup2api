/**
 * tools/ArtifactTool/docsConnector.ts
 *
 * 2.1.316 新增：文档连接器
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-jgw6g6zz.js (6)
 * attribution: placement 6
 */
import { typeNameKey } from "../../services/artifacts/artifactTypes.js";
import { isClaudeAiProxyServer } from "../../components/mcp/MCPListPanel.js";
import { isDocsConnectorUrl } from "../../services/mcp/resultContent.js";
import { SLo } from "../../services/artifacts/artifactConnectors.js";
import { Vt } from "../../utils/agentId.js";
import {
  $Oe,
  Iyr,
  DOCS_SERVER_NAMES,
  DOCS_MCP_PATH,
  DOCS_SERVER_ID,
} from "../../services/mcp/firstPartyServerIds.js";
import { env } from "../../utils/env.js";
import { isPluginServerConfig } from "../../services/mcp/types.js";
import { isFirstPartyToolboxServer } from "../../services/mcp/fileReference/fileReferencePolicy.js";

//@ chunk-jgw6g6zz.js:502-559 placement
var JDo = ["Docs"],
  t = new Set(["claudedocs", "claudepages"]);
//@ chunk-jgw6g6zz.js:559-636 placement
function BNr(e) {
  return e.tier === "core" && JDo.some((o) => typeNameKey(e.title) === typeNameKey(o));
}
/**
 * 本会话未接入 Claude Docs 连接器时，Docs 类型只能经连接器填写，文档应改为普通页面的说明。
 */
//@ chunk-jgw6g6zz.js:636-825 placement
var DOCS_CONNECTOR_UNATTACHED_NOTE =
  "The Docs type is filled only through the first-party Claude Docs connector, which is not attached in this session: for a document, make a page instead of starting from that type.";
/**
 * 判断 MCP 服务器是否为第一方 Claude Docs 连接器：claude.ai 代理服务器、SDK 注入的对应服务器，或远程会话中的动态 http 服务器（非插件或特定配置）。
 */
//@ chunk-jgw6g6zz.js:825-1148 placement
function isDocsConnectorServer(e) {
  return (
    (e.config.type === "claudeai-proxy" && isClaudeAiProxyServer(e.config) && isDocsConnectorUrl(e.config)) ||
    Sdn(e) ||
    (SLo() && e.config.type === "sdk" && Vt(e.name) !== null && t.has($Oe(e.serverInfo?.name ?? ""))) ||
    (env.CLAUDE_CODE_REMOTE === !0 &&
      e.config.type === "http" &&
      e.config.scope === "dynamic" &&
      (!isPluginServerConfig(e.config) || isDocsConnectorUrl(e.config)) &&
      (Iyr(e.config) || DOCS_SERVER_NAMES.has(e.name)))
  );
}
//@ chunk-jgw6g6zz.js:1148-1225 placement
function Sdn(e) {
  return (
    e.config.type === "sdk" && isFirstPartyToolboxServer(e, { path: DOCS_MCP_PATH, serverId: DOCS_SERVER_ID })
  );
}
/**
 * 判断已连接/待连接/缓存的 MCP 客户端中是否有 Claude Docs 连接器。
 */
//@ chunk-jgw6g6zz.js:1225-1331 placement
function hasDocsConnector(e) {
  return e.some(
    (o) =>
      (o.type === "connected" || o.type === "pending" || o.type === "cached") && isDocsConnectorServer(o),
  );
}

export { Sdn, isDocsConnectorServer, JDo, hasDocsConnector, BNr, DOCS_CONNECTOR_UNATTACHED_NOTE };
