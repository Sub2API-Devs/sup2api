/**
 * utils/permissions/classifierMcpContext.ts
 *
 * 2.1.316 新增：分类器的 MCP 上下文与连接器段
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-c378z4w4.js (17)
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
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-c378z4w4.js:1346-1376 placement
var plainToolName; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
var lastMcpToolLookup;
var cachedMcpToolPrefixes;
deferInit("chunk-c378z4w4.js:1346", () => {
  plainToolName = Object.freeze([]);
  cachedMcpToolPrefixes = plainToolName;
});
//@ chunk-c378z4w4.js:1376-1674 placement (2.1.88 match: getToolNameForPermissionCheck, 1)
/**
 * （归属疑误：权限/auto 模式）列出可被 auto 模式自动判定的 MCP 服务器前缀（排除与内置工具名前缀冲突者）。
 */
function getToolNameForPermissionCheck(tool) {
  if (!isChatHostSession() || !tagConnectorWritesEnabled()) return plainToolName;
  if (tool === lastMcpToolLookup) return cachedMcpToolPrefixes;
  let trustedTools = new Set();
  let prefixes = new Set();
  for (let toolEntry of tool)
    if (
      toolEntry.mcpInfo !== undefined &&
      isTrustedMcpScope(toolEntry.mcpInfo) &&
      !isCoordinatorCommsMcpTool(toolEntry)
    ) {
      trustedTools.add(toolEntry);
      prefixes.add(getMcpPrefix(toolEntry.mcpInfo.serverName));
    }
  for (let toolEntry of tool)
    if (!trustedTools.has(toolEntry)) {
      let candidate = `${toolEntry.name}_`;
      for (let prefix of prefixes) if (isFuzzyConnectorPrefix(candidate, prefix)) prefixes.delete(prefix);
    }
  lastMcpToolLookup = tool;
  cachedMcpToolPrefixes = [...prefixes].sort();
  return cachedMcpToolPrefixes;
}
//@ chunk-c378z4w4.js:1674-1931 placement
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
//@ chunk-c378z4w4.js:1931-2037 placement
function foldConnectorName(name) {
  return name.toLowerCase().replaceAll(/[-_]+/g, "_").replaceAll("0", "o").replaceAll(/[1i]/g, "l");
}
//@ chunk-c378z4w4.js:2037-2202 placement
function isFuzzyConnectorPrefix(candidate, prefix) {
  let foldedCandidate = foldConnectorName(candidate);
  let foldedPrefix = foldConnectorName(prefix);
  if (foldedCandidate.startsWith(foldedPrefix)) return true;
  for (let j = foldedPrefix.length - 2; j <= foldedPrefix.length + 2; j++)
    if (
      j > 0 &&
      j <= foldedCandidate.length &&
      boundedEditDistance(foldedCandidate.slice(0, j), foldedPrefix, 2) <= 2
    )
      return true;
  return false;
}
//@ chunk-c378z4w4.js:2202-2251 placement
function tagConnectorWritesEnabled() {
  return getAutoModeConfigOrDefault().tagConnectorWrites === true;
}
//@ chunk-c378z4w4.js:2251-3777 placement
/**
 * （归属疑误：Claude Tag/Slack 会话提示词）生成 "Claude Tag connector writes" 系统提示段落。
 */
function claudeTagConnectorSection(toolNames) {
  if (toolNames.length === 0) return "";
  return `

## Claude Tag connector writes

This is a Claude Tag session: its users work with it from Slack, and their requests often reach this agent through delegation, so the request behind an action may not be visible in this transcript. The connectors configured for this session are the MCP tools named ${toolNames.map((toolName) => `\`${toolName}*\``).join(", ")}. Those prefixes match byte for byte: a tool whose name differs in case or punctuation (for example \`-\` for \`_\`) belongs to another server and is not covered. A call to one of those tools that creates, writes, or edits content (for example, adding rows to a sheet or inserting text into a doc) is not blocked for lack of a visible user request: for these calls, a missing or delegated request is not by itself a reason to block under the User Intent Rule, scope escalation, External System Writes, or Unrequested Commit in a Connected App. Every other rule still applies in full, including: HARD BLOCK rules; exposing credentials or secrets; moving sensitive or confidential content to a destination or audience it does not belong in; deleting, clearing, or mass-modifying content; other destructive or irreversible changes; changing who can access a file or resource (sharing and permission changes); and sending messages, emails, or notifications to people. This exception covers only the tools named above. A write through any other route (a shell command, curl, a web request, or any other MCP server) is judged by the normal rules.`;
}
//@ chunk-c378z4w4.js:3777-3797 placement
var remoteBrowserToolPrefix; // deferred: uses getMcpPrefix (../../services/mcp/mcpStringUtils.js) of its import cycle while loading; runs once the cycle is complete
var CONNECTOR_NAME_MAX_LENGTH;
deferInit("chunk-c378z4w4.js:3777", () => {
  remoteBrowserToolPrefix = getMcpPrefix(REMOTE_BROWSER_SERVER_NAME);
  CONNECTOR_NAME_MAX_LENGTH = 2000;
});
//@ chunk-c378z4w4.js:3797-3924 placement
function isBrowserReadToolName(name) {
  return CHROME_TOOL_PREFIXES.some((prefix) => {
    let suffix = name.startsWith(prefix) ? name.slice(prefix.length) : "";
    return !suffix.includes("__") && CHROME_TOOL_NAMES.some((toolName) => toolName === suffix);
  });
}
//@ chunk-c378z4w4.js:3924-3973 placement
var KNOWN_CONNECTOR_WORDS; // deferred: uses REMOTE_BROWSER_SERVER_NAME (../../services/mcp/remoteBrowserServer.js) of its import cycle while loading; runs once the cycle is complete
var remoteBrowserFoldedPrefix;
var browserFoldedWord;
deferInit("chunk-c378z4w4.js:3924", () => {
  KNOWN_CONNECTOR_WORDS = new Set(REMOTE_BROWSER_TOOL_NAMES.map(foldConnectorName));
  remoteBrowserFoldedPrefix = foldConnectorName(remoteBrowserToolPrefix);
  browserFoldedWord = foldConnectorName("browser_");
});
//@ chunk-c378z4w4.js:3973-4140 placement
function isAllowedConnectorWords(text) {
  return [...text.matchAll(/[\w-]+/g)].every(([word]) => {
    let folded = foldConnectorName(word);
    if (!folded.includes(browserFoldedWord)) return true;
    let strippedWord = folded.startsWith(remoteBrowserFoldedPrefix)
      ? folded.slice(remoteBrowserFoldedPrefix.length)
      : folded;
    return strippedWord === "" || KNOWN_CONNECTOR_WORDS.has(strippedWord);
  });
}
//@ chunk-c378z4w4.js:4140-4241 placement
function isRemoteBrowserClassifierEnabled() {
  if (!isRemoteBrowserEnabled()) return false;
  let { value, source } = getFeatureValueWithSource_CACHED_MAY_BE_STALE(TENGU_RECURSIVE_PUDDLE, false);
  return value === true && source === "payload" && !hasGrowthBookUsedNonDefaultHost();
}
//@ chunk-c378z4w4.js:4241-4512 placement
function classifierMcpAllowlist() {
  let { value, source } = getFeatureValueWithSource_CACHED_MAY_BE_STALE(TENGU_THISTLE_ORRERY, "");
  if (source !== "payload" || hasGrowthBookUsedNonDefaultHost()) return;
  let entry = typeof value === "string" ? value.trimEnd() : value;
  return typeof entry === "string" &&
    entry.startsWith("- **") &&
    entry.length <= CONNECTOR_NAME_MAX_LENGTH &&
    /^[\x20-\x7e]*$/.test(entry) &&
    !/[<\\]/.test(entry) &&
    !entry.includes("cc_automode") &&
    isAllowedConnectorWords(entry)
    ? `
${entry}`
    : undefined;
}
//@ chunk-c378z4w4.js:4512-4994 placement
/**
 * （归属疑误：权限/auto 模式）remote-browser 云浏览器工具在 auto 模式下的说明段落（满足条件时）。
 */
function collectClassifierMcpTools(tools, mcpClients) {
  if (!isCoworkAny()) return;
  let hasRemoteBrowser = false;
  for (let tool of tools)
    if (tool.name.startsWith(remoteBrowserToolPrefix)) {
      if (tool.mcpInfo?.serverName !== REMOTE_BROWSER_SERVER_NAME || tool.mcpInfo.scope !== "dynamic") return;
      hasRemoteBrowser = true;
    }
  if (!hasRemoteBrowser) return;
  for (let tool of tools) {
    if (tool.name.startsWith(remoteBrowserToolPrefix)) continue;
    let parts = tool.name.split("__");
    let mapped = parts.map((partIndex, index) => parts.slice(index).join("__"));
    if (
      isFuzzyConnectorPrefix(`${tool.name}_`, remoteBrowserToolPrefix) ||
      (!isBrowserReadToolName(tool.name) &&
        parts.some((part) => foldConnectorName(part).includes(browserFoldedWord))) ||
      REMOTE_BROWSER_TOOL_NAMES.some((reservedName) =>
        mapped.some((suffix) => isFuzzyConnectorPrefix(`${suffix}_`, `${reservedName}_`)),
      )
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
//@ chunk-c378z4w4.js:4994-5021 placement
var CHROME_MCP_SECTION_HEADER = `
- **Chrome-MCP**:`;
//@ chunk-c378z4w4.js:5021-5161 placement
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
//@ chunk-c378z4w4.js:5161-5309 placement
function stripConnectorSection(text, remoteBrowserRule) {
  let sectionStart = remoteBrowserRule === undefined ? -1 : text.indexOf(CHROME_MCP_SECTION_HEADER);
  if (sectionStart === -1) return text;
  let index = text.indexOf(
    `
`,
    sectionStart + 1,
  );
  let sectionEnd = index === -1 ? text.length : index;
  return text.slice(0, sectionEnd) + remoteBrowserRule + text.slice(sectionEnd);
}
export {
  isRemoteBrowserClassifierEnabled,
  stripConnectorSection,
  claudeTagConnectorSection,
  collectClassifierMcpTools,
  getToolNameForPermissionCheck,
  findConnectorSection,
};
