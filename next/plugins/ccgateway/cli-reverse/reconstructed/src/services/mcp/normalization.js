/**
 * services/mcp/normalization.ts
 *
 * 服务器/工具名规范化（非 [a-zA-Z0-9_-] 换成 _，claude.ai 连接器名额外折叠下划线）。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/services/mcp/normalization.ts
 * pieces: chunk-5xgkngpb.js (1), chunk-ja2b06pa.js (7)
 * attribution: placement 7, fingerprint 1
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
//@ chunk-ja2b06pa.js:191-228 placement
/**
 * claude.ai 连接器名在规范化前的显示前缀（"claude.ai "）。
 */
var CLAUDE_AI_NAME_PREFIX = "claude.ai ";
var CLAUDE_AI = "claude_ai_";
//@ chunk-ja2b06pa.js:228-365 fingerprint (2.1.88 match: CLAUDEAI_SERVER_PREFIX, 1)
function CLAUDEAI_SERVER_PREFIX(name) {
  let normalized = name.replace(/[^a-zA-Z0-9_-]/g, "_");
  if (name.startsWith("claude.ai ")) normalized = normalized.replace(/_+/g, "_").replace(/^_|_$/g, "");
  return normalized;
}
//@ chunk-ja2b06pa.js:365-383 placement
var CLAUDEAI = "claudeai_";
//@ chunk-ja2b06pa.js:383-468 placement
/**
 * 规范化服务器名：转小写、连字符与下划线折叠成单下划线、去首尾下划线。
 */
function normalizedKey(name) {
  return CLAUDEAI_SERVER_PREFIX(name).toLowerCase().replace(/[-_]+/g, "_").replace(/^_|_$/g, "");
}
//@ chunk-ja2b06pa.js:468-501 placement
/**
 * 服务器名的最大字符数（128）。
 */
var ORG_CONNECTOR = "org-connector-";
var MAX_SERVER_NAME_CHARS = 128;
//@ chunk-ja2b06pa.js:501-629 placement
/**
 * 判断服务器名是否是组织连接器名（org_connector_ 或 orgconnector_ 前缀）。
 */
function isOrgConnectorName(name) {
  if (name.length > MAX_SERVER_NAME_CHARS) return false;
  let prefixed = `${normalizedKey(name)}_`;
  return prefixed.startsWith("org_connector_") || prefixed.startsWith("orgconnector_");
}
//@ chunk-ja2b06pa.js:629-714 placement
/**
 * 判断服务器名是否属于 claude.ai 连接器。
 */
function isClaudeAiServerName(name) {
  let prefixed = `${normalizedKey(name)}_`;
  return prefixed.startsWith("claude_ai_") || prefixed.startsWith(CLAUDEAI);
}
//@ chunk-5xgkngpb.js:3374954-3375076 placement
/**
 * 按名称查找 MCP 客户端（精确匹配优先，否则按规范化名匹配）。
 */
function findServersByName(clients, serverName) {
  let filtered = clients.filter((client) => client.name === serverName);
  if (filtered.length > 0) return filtered;
  let normalized = CLAUDEAI_SERVER_PREFIX(serverName);
  return clients.filter((client) => CLAUDEAI_SERVER_PREFIX(client.name) === normalized);
}
export {
  CLAUDEAI_SERVER_PREFIX,
  CLAUDE_AI_NAME_PREFIX,
  CLAUDE_AI,
  findServersByName,
  normalizedKey,
  isClaudeAiServerName,
  isOrgConnectorName,
  ORG_CONNECTOR,
  MAX_SERVER_NAME_CHARS,
};
