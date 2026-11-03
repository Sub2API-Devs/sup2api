/**
 * utils/permissions/classifierMcpContext.ts
 *
 * 2.1.316 新增：分类器的 MCP 上下文与连接器段
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-gz7b768t.js (17)
 * attribution: placement 17
 */
import { isChatHostSession, isCoworkAny } from "../entrypointKinds.js";
import { isCoordinatorCommsMcpTool } from "../../coordinator/coordinatorMcpServers.js";
import { getMcpPrefix } from "../../services/mcp/mcpStringUtils.js";
import { classifierToolSet } from "./classifierModelConfig.js";
import { boundedEditDistance } from "../settings/managedEnvKeys.js";
import { getAutoModeConfigOrDefault } from "./permissionSetup.js";
import {
  REMOTE_BROWSER_SERVER_NAME,
  REMOTE_BROWSER_TOOL_NAMES,
  isRemoteBrowserEnabled,
  TENGU_RECURSIVE_PUDDLE,
} from "../../services/mcp/remoteBrowserServer.js";
import { CHROME_TOOL_PREFIXES } from "../claudeInChrome/chromeToolNames.js";
import { CHROME_TOOL_NAMES } from "../claudeInChrome/common.js";
import {
  getFeatureValueWithSource_CACHED_MAY_BE_STALE,
  hasGrowthBookUsedNonDefaultHost,
} from "../../services/analytics/growthbook.js";
import { TENGU_THISTLE_ORRERY } from "../../services/api/withRetry.js";
import { isRemoteBrowserScoped } from "../../services/mcp/builtinServerNames.js";
import { getMcpClientsFromAccessor } from "../../bootstrap/state.js";
import { antEnv } from "../env.js";

//@ chunk-gz7b768t.js:1346-1376 placement
var R = Object.freeze([]);
var lastMcpToolLookup;
var cachedMcpToolPrefixes = R;
//@ chunk-gz7b768t.js:1376-1674 placement = getToolNameForPermissionCheck (1)
/**
 * （归属疑误：权限/auto 模式）列出可被 auto 模式自动判定的 MCP 服务器前缀（排除与内置工具名前缀冲突者）。
 */
function getToolNameForPermissionCheck(tool) {
  if (!isChatHostSession() || !tagConnectorWritesEnabled()) return R;
  if (tool === lastMcpToolLookup) return cachedMcpToolPrefixes;
  let t = new Set();
  let o = new Set();
  for (let r of tool)
    if (r.mcpInfo !== undefined && isTrustedMcpScope(r.mcpInfo) && !isCoordinatorCommsMcpTool(r)) {
      t.add(r);
      o.add(getMcpPrefix(r.mcpInfo.serverName));
    }
  for (let r of tool)
    if (!t.has(r)) {
      let n = `${r.name}_`;
      for (let a of o) if (isFuzzyConnectorPrefix(n, a)) o.delete(a);
    }
  lastMcpToolLookup = tool;
  cachedMcpToolPrefixes = [...o].sort();
  return cachedMcpToolPrefixes;
}
//@ chunk-gz7b768t.js:1674-1931 placement
function isTrustedMcpScope(mcpInfo) {
  switch (mcpInfo.scope) {
    case "user":
      return classifierToolSet().has(mcpInfo.serverName);
    case "claudeai":
      return mcpInfo.serverType === "claudeai-proxy" && mcpInfo.pluginTelemetry === undefined;
    case "managed":
    case "enterprise":
    case "dynamic":
    case "project":
    case "local":
    case "agent":
    case undefined:
      return false;
  }
}
//@ chunk-gz7b768t.js:1931-2037 placement
function foldConnectorName(e) {
  return e.toLowerCase().replaceAll(/[-_]+/g, "_").replaceAll("0", "o").replaceAll(/[1i]/g, "l");
}
//@ chunk-gz7b768t.js:2037-2202 placement
function isFuzzyConnectorPrefix(e, t) {
  let o = foldConnectorName(e);
  let r = foldConnectorName(t);
  if (o.startsWith(r)) return true;
  for (let j = r.length - 2; j <= r.length + 2; j++)
    if (j > 0 && j <= o.length && boundedEditDistance(o.slice(0, j), r, 2) <= 2) return true;
  return false;
}
//@ chunk-gz7b768t.js:2202-2251 placement
function tagConnectorWritesEnabled() {
  return getAutoModeConfigOrDefault().tagConnectorWrites === true;
}
//@ chunk-gz7b768t.js:2251-3777 placement
/**
 * （归属疑误：Claude Tag/Slack 会话提示词）生成 "Claude Tag connector writes" 系统提示段落。
 */
function claudeTagConnectorSection(toolNames) {
  if (toolNames.length === 0) return "";
  return `

## Claude Tag connector writes

This is a Claude Tag session: its users work with it from Slack, and their requests often reach this agent through delegation, so the request behind an action may not be visible in this transcript. The connectors configured for this session are the MCP tools named ${toolNames.map((o) => `\`${o}*\``).join(", ")}. Those prefixes match byte for byte: a tool whose name differs in case or punctuation (for example \`-\` for \`_\`) belongs to another server and is not covered. A call to one of those tools that creates, writes, or edits content (for example, adding rows to a sheet or inserting text into a doc) is not blocked for lack of a visible user request: for these calls, a missing or delegated request is not by itself a reason to block under the User Intent Rule, scope escalation, External System Writes, or Unrequested Commit in a Connected App. Every other rule still applies in full, including: HARD BLOCK rules; exposing credentials or secrets; moving sensitive or confidential content to a destination or audience it does not belong in; deleting, clearing, or mass-modifying content; other destructive or irreversible changes; changing who can access a file or resource (sharing and permission changes); and sending messages, emails, or notifications to people. This exception covers only the tools named above. A write through any other route (a shell command, curl, a web request, or any other MCP server) is judged by the normal rules.`;
}
//@ chunk-gz7b768t.js:3777-3797 placement
var remoteBrowserToolPrefix = getMcpPrefix(REMOTE_BROWSER_SERVER_NAME);
var CONNECTOR_NAME_MAX_LENGTH = 2000;
//@ chunk-gz7b768t.js:3797-3924 placement
function isBrowserReadToolName(name) {
  return CHROME_TOOL_PREFIXES.some((t) => {
    let o = name.startsWith(t) ? name.slice(t.length) : "";
    return !o.includes("__") && CHROME_TOOL_NAMES.some((r) => r === o);
  });
}
//@ chunk-gz7b768t.js:3924-3973 placement
var KNOWN_CONNECTOR_WORDS = new Set(REMOTE_BROWSER_TOOL_NAMES.map(foldConnectorName));
var remoteBrowserFoldedPrefix = foldConnectorName(remoteBrowserToolPrefix);
var browserFoldedWord = foldConnectorName("browser_");
//@ chunk-gz7b768t.js:3973-4140 placement
function isAllowedConnectorWords(e) {
  return [...e.matchAll(/[\w-]+/g)].every(([t]) => {
    let o = foldConnectorName(t);
    if (!o.includes(browserFoldedWord)) return true;
    let r = o.startsWith(remoteBrowserFoldedPrefix) ? o.slice(remoteBrowserFoldedPrefix.length) : o;
    return r === "" || KNOWN_CONNECTOR_WORDS.has(r);
  });
}
//@ chunk-gz7b768t.js:4140-4241 placement
function isRemoteBrowserClassifierEnabled() {
  if (!isRemoteBrowserEnabled()) return false;
  let { value: e, source } = getFeatureValueWithSource_CACHED_MAY_BE_STALE(TENGU_RECURSIVE_PUDDLE, false);
  return e === true && source === "payload" && !hasGrowthBookUsedNonDefaultHost();
}
//@ chunk-gz7b768t.js:4241-4512 placement
function classifierMcpAllowlist() {
  let { value: e, source } = getFeatureValueWithSource_CACHED_MAY_BE_STALE(TENGU_THISTLE_ORRERY, "");
  if (source !== "payload" || hasGrowthBookUsedNonDefaultHost()) return;
  let o = typeof e === "string" ? e.trimEnd() : e;
  return typeof o === "string" &&
    o.startsWith("- **") &&
    o.length <= CONNECTOR_NAME_MAX_LENGTH &&
    /^[\x20-\x7e]*$/.test(o) &&
    !/[<\\]/.test(o) &&
    !o.includes("cc_automode") &&
    isAllowedConnectorWords(o)
    ? `
${o}`
    : undefined;
}
//@ chunk-gz7b768t.js:4512-4994 placement
/**
 * （归属疑误：权限/auto 模式）remote-browser 云浏览器工具在 auto 模式下的说明段落（满足条件时）。
 */
function collectClassifierMcpTools(tools, mcpClients) {
  if (!isCoworkAny()) return;
  let o = false;
  for (let r of tools)
    if (r.name.startsWith(remoteBrowserToolPrefix)) {
      if (r.mcpInfo?.serverName !== REMOTE_BROWSER_SERVER_NAME || r.mcpInfo.scope !== "dynamic") return;
      o = true;
    }
  if (!o) return;
  for (let r of tools) {
    if (r.name.startsWith(remoteBrowserToolPrefix)) continue;
    let parts = r.name.split("__");
    let mapped = parts.map((l, d) => parts.slice(d).join("__"));
    if (
      isFuzzyConnectorPrefix(`${r.name}_`, remoteBrowserToolPrefix) ||
      (!isBrowserReadToolName(r.name) &&
        parts.some((l) => foldConnectorName(l).includes(browserFoldedWord))) ||
      REMOTE_BROWSER_TOOL_NAMES.some((l) => mapped.some((d) => isFuzzyConnectorPrefix(`${d}_`, `${l}_`)))
    )
      return;
  }
  if (
    !isRemoteBrowserScoped(mcpClients ?? getMcpClientsFromAccessor()) ||
    !(antEnv.CLAUDE_CODE_AUTO_MODE_REMOTE_BROWSER ?? isRemoteBrowserClassifierEnabled())
  )
    return;
  return classifierMcpAllowlist();
}
//@ chunk-gz7b768t.js:4994-5021 placement
var CHROME_MCP_SECTION_HEADER = `
- **Chrome-MCP**:`;
//@ chunk-gz7b768t.js:5021-5161 placement
function findConnectorSection(text, remoteBrowserRule) {
  for (
    let index = text.indexOf(CHROME_MCP_SECTION_HEADER);
    index !== -1;
    index = text.indexOf(CHROME_MCP_SECTION_HEADER, index + 1)
  ) {
    let index_2 = text.indexOf(
      `
`,
      index + 1,
    );
    if (index_2 !== -1 && text.startsWith(remoteBrowserRule, index_2)) return true;
  }
  return false;
}
//@ chunk-gz7b768t.js:5161-5309 placement
function stripConnectorSection(e, remoteBrowserRule) {
  let o = remoteBrowserRule === undefined ? -1 : e.indexOf(CHROME_MCP_SECTION_HEADER);
  if (o === -1) return e;
  let index = e.indexOf(
    `
`,
    o + 1,
  );
  let n = index === -1 ? e.length : index;
  return e.slice(0, n) + remoteBrowserRule + e.slice(n);
}
export {
  stripConnectorSection,
  claudeTagConnectorSection,
  collectClassifierMcpTools,
  getToolNameForPermissionCheck,
  findConnectorSection,
  isRemoteBrowserClassifierEnabled,
};
