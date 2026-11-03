/**
 * services/mcp/normalization.ts
 *
 * 服务器/工具名规范化（非 [a-zA-Z0-9_-] 换成 _，claude.ai 连接器名额外折叠下划线）。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/services/mcp/normalization.ts
 * pieces: chunk-ah34pb7m.js (1), chunk-e6aww6q8.js (1), chunk-knckn35w.js (7)
 * attribution: fingerprint 1, placement 7, callgraph-witnessed 1
 */
import { stripPrefix } from "../../utils/stringUtils.js";

//@ chunk-knckn35w.js:191-228 placement
/**
 * claude.ai 连接器名在规范化前的显示前缀（"claude.ai "）。
 */
var CLAUDE_AI_NAME_PREFIX = "claude.ai ";
var CLAUDE_AI = "claude_ai_";
//@ chunk-knckn35w.js:228-365 callgraph-witnessed = normalizeNameForMCP (0)
/**
 * normalizeNameForMCP：把服务器/工具名中非 [a-zA-Z0-9_-] 的字符换成 _；claude.ai 连接器名再折叠连续下划线并去掉首尾 _。
 */
function normalizeNameForMCP(name) {
  let normalized = name.replace(/[^a-zA-Z0-9_-]/g, "_");
  if (name.startsWith("claude.ai ")) normalized = normalized.replace(/_+/g, "_").replace(/^_|_$/g, "");
  return normalized;
}
//@ chunk-knckn35w.js:365-383 placement
var CLAUDEAI = "claudeai_";
//@ chunk-knckn35w.js:383-468 placement
/**
 * 规范化服务器名：转小写、连字符与下划线折叠成单下划线、去首尾下划线。
 */
function normalizedKey(t) {
  return normalizeNameForMCP(t).toLowerCase().replace(/[-_]+/g, "_").replace(/^_|_$/g, "");
}
//@ chunk-knckn35w.js:468-501 placement
/**
 * 服务器名的最大字符数（128）。
 */
var ORG_CONNECTOR = "org-connector-";
var MAX_SERVER_NAME_CHARS = 128;
//@ chunk-knckn35w.js:501-629 placement
/**
 * 判断服务器名是否是组织连接器名（org_connector_ 或 orgconnector_ 前缀）。
 */
function isOrgConnectorName(t) {
  if (t.length > MAX_SERVER_NAME_CHARS) return false;
  let r = `${normalizedKey(t)}_`;
  return r.startsWith("org_connector_") || r.startsWith("orgconnector_");
}
//@ chunk-knckn35w.js:629-714 placement
/**
 * 判断服务器名是否属于 claude.ai 连接器。
 */
function isClaudeAiServerName(name) {
  let r = `${normalizedKey(name)}_`;
  return r.startsWith("claude_ai_") || r.startsWith(CLAUDEAI);
}
//@ chunk-ah34pb7m.js:157437-157480 fingerprint = CLAUDEAI_SERVER_PREFIX (1)
/**
 * CLAUDEAI_SERVER_PREFIX（实为判断）：名字是否以 "claude.ai " 开头。
 */
function CLAUDEAI_SERVER_PREFIX(j1) {
  return stripPrefix(j1, "claude.ai ");
}
//@ chunk-e6aww6q8.js:3289161-3289283 placement
/**
 * 按名称查找 MCP 客户端（精确匹配优先，否则按规范化名匹配）。
 */
function findServersByName(e, n) {
  let filtered = e.filter((h) => h.name === n);
  if (filtered.length > 0) return filtered;
  let s = normalizeNameForMCP(n);
  return e.filter((h) => normalizeNameForMCP(h.name) === s);
}
export {
  CLAUDE_AI_NAME_PREFIX,
  normalizeNameForMCP,
  CLAUDE_AI,
  normalizedKey,
  findServersByName,
  CLAUDEAI_SERVER_PREFIX,
  isClaudeAiServerName,
  isOrgConnectorName,
  ORG_CONNECTOR,
  MAX_SERVER_NAME_CHARS,
};
