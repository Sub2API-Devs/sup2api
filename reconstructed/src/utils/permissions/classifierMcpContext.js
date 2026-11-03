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
  FPn,
  isRemoteBrowserEnabled,
  TENGU_RECURSIVE_PUDDLE,
} from "../../services/mcp/remoteBrowserServer.js";
import { uae } from "../claudeInChrome/chromeToolNames.js";
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
var freeze_2 = Object.freeze([]),
  E,
  p = freeze_2;
/**
 * （归属疑误：权限/auto 模式）列出可被 auto 模式自动判定的 MCP 服务器前缀（排除与内置工具名前缀冲突者）。
 */
//@ chunk-gz7b768t.js:1376-1674 placement = getToolNameForPermissionCheck (1)
function getToolNameForPermissionCheck(tool) {
  if (!isChatHostSession() || !T()) return freeze_2;
  if (tool === E) return p;
  let t = new Set(),
    o = new Set();
  for (let r of tool)
    if (r.mcpInfo !== void 0 && isTrustedMcpScope(r.mcpInfo) && !isCoordinatorCommsMcpTool(r))
      (t.add(r), o.add(getMcpPrefix(r.mcpInfo.serverName)));
  for (let r of tool)
    if (!t.has(r)) {
      let n = `${r.name}_`;
      for (let a of o) if (isFuzzyConnectorPrefix(n, a)) o.delete(a);
    }
  return ((E = tool), (p = [...o].sort()), p);
}
//@ chunk-gz7b768t.js:1674-1931 placement
function isTrustedMcpScope(e) {
  switch (e.scope) {
    case "user":
      return classifierToolSet().has(e.serverName);
    case "claudeai":
      return e.serverType === "claudeai-proxy" && e.pluginTelemetry === void 0;
    case "managed":
    case "enterprise":
    case "dynamic":
    case "project":
    case "local":
    case "agent":
    case void 0:
      return !1;
  }
}
//@ chunk-gz7b768t.js:1931-2037 placement
function foldConnectorName(e) {
  return e.toLowerCase().replaceAll(/[-_]+/g, "_").replaceAll("0", "o").replaceAll(/[1i]/g, "l");
}
//@ chunk-gz7b768t.js:2037-2202 placement
function isFuzzyConnectorPrefix(e, t) {
  let o = foldConnectorName(e),
    r = foldConnectorName(t);
  if (o.startsWith(r)) return !0;
  for (let n = r.length - 2; n <= r.length + 2; n++)
    if (n > 0 && n <= o.length && boundedEditDistance(o.slice(0, n), r, 2) <= 2) return !0;
  return !1;
}
//@ chunk-gz7b768t.js:2202-2251 placement
function T() {
  return getAutoModeConfigOrDefault().tagConnectorWrites === !0;
}
/**
 * （归属疑误：Claude Tag/Slack 会话提示词）生成 "Claude Tag connector writes" 系统提示段落。
 */
//@ chunk-gz7b768t.js:2251-3777 placement
function claudeTagConnectorSection(e) {
  if (e.length === 0) return "";
  return `

## Claude Tag connector writes

This is a Claude Tag session: its users work with it from Slack, and their requests often reach this agent through delegation, so the request behind an action may not be visible in this transcript. The connectors configured for this session are the MCP tools named ${e.map((o) => `\`${o}*\``).join(", ")}. Those prefixes match byte for byte: a tool whose name differs in case or punctuation (for example \`-\` for \`_\`) belongs to another server and is not covered. A call to one of those tools that creates, writes, or edits content (for example, adding rows to a sheet or inserting text into a doc) is not blocked for lack of a visible user request: for these calls, a missing or delegated request is not by itself a reason to block under the User Intent Rule, scope escalation, External System Writes, or Unrequested Commit in a Connected App. Every other rule still applies in full, including: HARD BLOCK rules; exposing credentials or secrets; moving sensitive or confidential content to a destination or audience it does not belong in; deleting, clearing, or mass-modifying content; other destructive or irreversible changes; changing who can access a file or resource (sharing and permission changes); and sending messages, emails, or notifications to people. This exception covers only the tools named above. A write through any other route (a shell command, curl, a web request, or any other MCP server) is judged by the normal rules.`;
}
//@ chunk-gz7b768t.js:3777-3797 placement
var m = getMcpPrefix(REMOTE_BROWSER_SERVER_NAME),
  w = 2000;
//@ chunk-gz7b768t.js:3797-3924 placement
function isBrowserReadToolName(e) {
  return uae.some((t) => {
    let o = e.startsWith(t) ? e.slice(t.length) : "";
    return !o.includes("__") && CHROME_TOOL_NAMES.some((r) => r === o);
  });
}
//@ chunk-gz7b768t.js:3924-3973 placement
var b = new Set(FPn.map(foldConnectorName)),
  C = foldConnectorName(m),
  S = foldConnectorName("browser_");
//@ chunk-gz7b768t.js:3973-4140 placement
function isAllowedConnectorWords(e) {
  return [...e.matchAll(/[\w-]+/g)].every(([t]) => {
    let o = foldConnectorName(t);
    if (!o.includes(S)) return !0;
    let r = o.startsWith(C) ? o.slice(C.length) : o;
    return r === "" || b.has(r);
  });
}
//@ chunk-gz7b768t.js:4140-4241 placement
function isRemoteBrowserClassifierEnabled() {
  if (!isRemoteBrowserEnabled()) return !1;
  let { value: e, source: source } = getFeatureValueWithSource_CACHED_MAY_BE_STALE(
    TENGU_RECURSIVE_PUDDLE,
    !1,
  );
  return e === !0 && source === "payload" && !hasGrowthBookUsedNonDefaultHost();
}
//@ chunk-gz7b768t.js:4241-4512 placement
function classifierMcpAllowlist() {
  let { value: e, source: source } = getFeatureValueWithSource_CACHED_MAY_BE_STALE(TENGU_THISTLE_ORRERY, "");
  if (source !== "payload" || hasGrowthBookUsedNonDefaultHost()) return;
  let o = typeof e === "string" ? e.trimEnd() : e;
  return typeof o === "string" &&
    o.startsWith("- **") &&
    o.length <= w &&
    /^[\x20-\x7e]*$/.test(o) &&
    !/[<\\]/.test(o) &&
    !o.includes("cc_automode") &&
    isAllowedConnectorWords(o)
    ? `
${o}`
    : void 0;
}
/**
 * （归属疑误：权限/auto 模式）remote-browser 云浏览器工具在 auto 模式下的说明段落（满足条件时）。
 */
//@ chunk-gz7b768t.js:4512-4994 placement
function collectClassifierMcpTools(e, t) {
  if (!isCoworkAny()) return;
  let o = !1;
  for (let r of e)
    if (r.name.startsWith(m)) {
      if (r.mcpInfo?.serverName !== REMOTE_BROWSER_SERVER_NAME || r.mcpInfo.scope !== "dynamic") return;
      o = !0;
    }
  if (!o) return;
  for (let r of e) {
    if (r.name.startsWith(m)) continue;
    let parts = r.name.split("__"),
      mapped = parts.map((l, d) => parts.slice(d).join("__"));
    if (
      isFuzzyConnectorPrefix(`${r.name}_`, m) ||
      (!isBrowserReadToolName(r.name) && parts.some((l) => foldConnectorName(l).includes(S))) ||
      FPn.some((l) => mapped.some((d) => isFuzzyConnectorPrefix(`${d}_`, `${l}_`)))
    )
      return;
  }
  if (
    !isRemoteBrowserScoped(t ?? getMcpClientsFromAccessor()) ||
    !(antEnv.CLAUDE_CODE_AUTO_MODE_REMOTE_BROWSER ?? isRemoteBrowserClassifierEnabled())
  )
    return;
  return classifierMcpAllowlist();
}
//@ chunk-gz7b768t.js:4994-5021 placement
var g = `
- **Chrome-MCP**:`;
//@ chunk-gz7b768t.js:5021-5161 placement
function findConnectorSection(e, t) {
  for (let index = e.indexOf(g); index !== -1; index = e.indexOf(g, index + 1)) {
    let index_2 = e.indexOf(
      `
`,
      index + 1,
    );
    if (index_2 !== -1 && e.startsWith(t, index_2)) return !0;
  }
  return !1;
}
//@ chunk-gz7b768t.js:5161-5309 placement
function stripConnectorSection(e, t) {
  let o = t === void 0 ? -1 : e.indexOf(g);
  if (o === -1) return e;
  let index = e.indexOf(
      `
`,
      o + 1,
    ),
    n = index === -1 ? e.length : index;
  return e.slice(0, n) + t + e.slice(n);
}

export {
  stripConnectorSection,
  claudeTagConnectorSection,
  collectClassifierMcpTools,
  getToolNameForPermissionCheck,
  findConnectorSection,
  isRemoteBrowserClassifierEnabled,
};
