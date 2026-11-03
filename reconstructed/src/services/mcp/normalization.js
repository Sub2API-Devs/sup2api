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
var yhe = "claude.ai ",
  CLAUDE_AI = "claude_ai_";
/**
 * normalizeNameForMCP：把服务器/工具名中非 [a-zA-Z0-9_-] 的字符换成 _；claude.ai 连接器名再折叠连续下划线并去掉首尾 _。
 */
//@ chunk-knckn35w.js:228-365 callgraph-witnessed = normalizeNameForMCP (0)
function normalizeNameForMCP(name) {
  let normalized = name.replace(/[^a-zA-Z0-9_-]/g, "_");
  if (name.startsWith("claude.ai ")) normalized = normalized.replace(/_+/g, "_").replace(/^_|_$/g, "");
  return normalized;
}
//@ chunk-knckn35w.js:365-383 placement
var CLAUDEAI = "claudeai_";
//@ chunk-knckn35w.js:383-468 placement
function _Y(t) {
  return normalizeNameForMCP(t).toLowerCase().replace(/[-_]+/g, "_").replace(/^_|_$/g, "");
}
//@ chunk-knckn35w.js:468-501 placement
var ORG_CONNECTOR = "org-connector-",
  $gs = 128;
/**
 * 判断服务器名是否是组织连接器名（org_connector_ 或 orgconnector_ 前缀）。
 */
//@ chunk-knckn35w.js:501-629 placement
function isOrgConnectorName(t) {
  if (t.length > $gs) return !1;
  let r = `${_Y(t)}_`;
  return r.startsWith("org_connector_") || r.startsWith("orgconnector_");
}
//@ chunk-knckn35w.js:629-714 placement
function tMn(t) {
  let r = `${_Y(t)}_`;
  return r.startsWith("claude_ai_") || r.startsWith(CLAUDEAI);
}
/**
 * CLAUDEAI_SERVER_PREFIX（实为判断）：名字是否以 "claude.ai " 开头。
 */
//@ chunk-ah34pb7m.js:157437-157480 fingerprint = CLAUDEAI_SERVER_PREFIX (1)
function CLAUDEAI_SERVER_PREFIX(j1) {
  return stripPrefix(j1, "claude.ai ");
}
/**
 * 按名称查找 MCP 客户端（精确匹配优先，否则按规范化名匹配）。
 */
//@ chunk-e6aww6q8.js:3289161-3289283 placement
function findServersByName(e, n) {
  let filtered = e.filter((h) => h.name === n);
  if (filtered.length > 0) return filtered;
  let s = normalizeNameForMCP(n);
  return e.filter((h) => normalizeNameForMCP(h.name) === s);
}

export {
  yhe,
  normalizeNameForMCP,
  CLAUDE_AI,
  _Y,
  findServersByName,
  CLAUDEAI_SERVER_PREFIX,
  tMn,
  isOrgConnectorName,
  ORG_CONNECTOR,
  $gs,
};
