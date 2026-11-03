/**
 * services/mcp/builtinServerNames.ts
 *
 * 2.1.316 新增：是否为内置/保留的 MCP 服务器名（Slack 登录、远程设备等）；浏览器/远程设备工具名集合等。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-aepeg2w5.js (16)
 * attribution: placement 16
 */
import { mcpInfoFromString, getMcpPrefix as getMcpPrefix_2 } from "./mcpStringUtils.js";
import {
  REMOTE_DEVICES,
  CLAUDE_AI,
  CCR_EMAIL,
  WIDGETS,
  DOCS_SERVER_NAMES,
  KIt,
  Iyr,
  eRi,
  mcpServerIdHeader,
  MEMORY_SERVER_ID,
} from "./firstPartyServerIds.js";
import { REMOTE_BROWSER_SERVER_NAME, FPn } from "./remoteBrowserServer.js";
import { BROWSER_SERVER_NAMES, tOn, CLAUDE_DEVICE } from "../../utils/permissions/browserToolNames.js";
import { COMPUTER_USE_MCP_SERVER_NAME } from "../../utils/computerUse/common.js";
import { WORKSPACE } from "../../utils/permissions/permissionRuleParser.js";
import { desktopConnectorNames } from "../../utils/sessionShape.js";
import { CLAUDE_AI as CLAUDE_AI_2, normalizeNameForMCP } from "./normalization.js";
import { isPrototypeKey } from "../../schemas/hookEntryValidation.js";
import { env } from "../../utils/env.js";
import { isPolicyAllowed } from "../policyLimits/index.js";
import { isRemoteBrowserHttpConfig, toScopedConfig } from "../../utils/permissions/remoteBrowser.js";
import {
  CLAUDE_IN_CHROME_MCP_SERVER_NAME,
  isClaudeInChromeMCPServer,
  CHROME_TOOL_NAMES as CHROME_TOOL_NAMES_2,
} from "../../utils/claudeInChrome/common.js";
import { isCcrSessionMcpUrl, isSameOriginAsCcr } from "./ccrMcpUrls.js";
import { CU_TOOL_NAMES } from "../../utils/computerUse/toolRendering.js";
import { BASH_TOOL_NAME } from "../../tools/BashTool/toolName.js";
import { FILE_READ_TOOL_NAME } from "../../tools/FileReadTool/constants.js";
import { FILE_WRITE_TOOL_NAME } from "../../tools/FileWriteTool/prompt.js";
import { FILE_EDIT_TOOL_NAME } from "../../tools/FileEditTool/constants.js";
import { GLOB_TOOL_NAME } from "../../tools/GlobTool/prompt.js";
import { GREP_TOOL_NAME } from "../../tools/GrepTool/prompt.js";

//@ chunk-aepeg2w5.js:817702-817755 placement
function hs(e) {
  return mcpInfoFromString(`${getMcpPrefix_2(e)}tool`)?.serverName;
}
//@ chunk-aepeg2w5.js:817755-817844 placement
function Fg(e) {
  let n = new Set();
  for (let r of e) {
    let s = hs(r);
    if (s !== void 0) n.add(s);
  }
  return n;
}
//@ chunk-aepeg2w5.js:817844-817916 placement
var Lg = new Set(["hearthbot", REMOTE_DEVICES, CLAUDE_AI, CCR_EMAIL]),
  IV = Fg(Lg),
  DV = hs(WIDGETS),
  NV = hs(REMOTE_BROWSER_SERVER_NAME);
//@ chunk-aepeg2w5.js:817916-817990 placement
function FV(e, n) {
  for (let r of DOCS_SERVER_NAMES) if (KIt(n, r) || KIt(e, r)) return !0;
  return !1;
}
//@ chunk-aepeg2w5.js:817990-818032 placement
var LV = Fg(BROWSER_SERVER_NAMES),
  UV = Fg([...tOn, COMPUTER_USE_MCP_SERVER_NAME, WORKSPACE, CLAUDE_DEVICE]);
//@ chunk-aepeg2w5.js:818032-818090 placement
function nas(e) {
  return desktopConnectorNames() && (hs(e)?.startsWith(CLAUDE_AI_2) ?? !1);
}
/**
 * 是否为内置/保留的 MCP 服务器名（Slack 登录、远程设备等）。
 */
//@ chunk-aepeg2w5.js:818090-818839 placement
function isBuiltinMcpServerName(e, n) {
  if (isPrototypeKey(e)) return !0;
  if (e === "Slack sign-in (Claude Code tag)") return !0;
  let r = hs(e);
  if (FV(e, r ?? ""))
    return (
      (n?.hosted ?? env.CLAUDE_CODE_REMOTE) &&
      !(n?.hostCarrier && DOCS_SERVER_NAMES.has(e) && (!n.config || Iyr(n.config)))
    );
  if (r === void 0) return !1;
  if (nas(e)) return !0;
  if (r === DV) return (n?.hosted ?? env.CLAUDE_CODE_REMOTE) && !(n?.hostCarrier && e === WIDGETS);
  if (r === "webagent" || r === "claude-code-remote") return !(n?.hostCarrier && e === r);
  if (IV.has(r)) return !(n?.hostCarrier && Lg.has(e) && (e !== CLAUDE_AI || !n.config || eRi(n.config)));
  if (r === NV && isPolicyAllowed())
    return (
      (n?.hosted ?? env.CLAUDE_CODE_REMOTE) &&
      !(
        n?.hostCarrier &&
        e === REMOTE_BROWSER_SERVER_NAME &&
        n.config !== void 0 &&
        isRemoteBrowserHttpConfig(n.config)
      )
    );
  if (LV.has(r)) return !(n?.hostCarrier && n.config && isLocalBrowserServerConfig(e, n.config));
  if (n?.hostCarrier && e === CLAUDE_IN_CHROME_MCP_SERVER_NAME && n.config && isClaudeAiProxyServer(n.config))
    return !1;
  return UV.has(r);
}
/**
 * 判断远程会话中的远程浏览器 MCP 服务器是否都是带作用域的受信配置。
 */
//@ chunk-aepeg2w5.js:818982-819099 placement
function isRemoteBrowserScoped(e) {
  let n = e ?? [];
  return (
    env.CLAUDE_CODE_REMOTE &&
    n.some((r) => r.name === REMOTE_BROWSER_SERVER_NAME) &&
    n.every((r) => r.name !== REMOTE_BROWSER_SERVER_NAME || toScopedConfig(r))
  );
}
/**
 * 是否为 claude.ai 代理 MCP 服务器。
 */
//@ chunk-aepeg2w5.js:819099-819163 placement = isHTTPConfig (1)
function isClaudeAiProxyServer(config) {
  return (
    config.type === "http" && mcpServerIdHeader(config) === MEMORY_SERVER_ID && isCcrSessionMcpUrl(config.url)
  );
}
/**
 * MCP 配置的 url 有效且作用域合法（动态作用域须来自插件）。
 */
//@ chunk-aepeg2w5.js:819163-819308 placement = toScopedConfig (0.78)
function toScopedConfig_2(config) {
  if (typeof config.url !== "string" || !isSameOriginAsCcr(config.url)) return !1;
  if (config.scope === void 0) return !1;
  return config.scope !== "dynamic" || config.pluginSource !== void 0;
}
/**
 * 列出保留的 MCP 服务器名（内置连接器、浏览器、Computer Use、工作区、设备等），用户配置不能使用这些名称。
 */
//@ chunk-aepeg2w5.js:819308-819476 placement
function reservedMcpServerNames() {
  let e = [
    "Slack sign-in (Claude Code tag)",
    ...Lg,
    ...DOCS_SERVER_NAMES,
    WIDGETS,
    ...BROWSER_SERVER_NAMES,
    ...tOn,
    COMPUTER_USE_MCP_SERVER_NAME,
    WORKSPACE,
    CLAUDE_DEVICE,
  ];
  if ((e.push("webagent", "claude-code-remote"), isPolicyAllowed())) e.push(REMOTE_BROWSER_SERVER_NAME);
  return e;
}
//@ chunk-aepeg2w5.js:819476-819520 placement
var HV = new Set(["127.0.0.1", "[::1]", "::1"]);
//@ chunk-aepeg2w5.js:819520-819702 placement
function isLocalBrowserServerConfig(e, n) {
  if (!BROWSER_SERVER_NAMES.has(e) || n.type !== "http") return !1;
  let r;
  try {
    r = new URL(n.url);
  } catch {
    return !1;
  }
  return r.protocol === "http:" && r.username === "" && r.password === "" && HV.has(r.hostname);
}
/**
 * 是否为 stdio 配置。
 */
//@ chunk-aepeg2w5.js:819702-819751 placement = getServerCommandArray (1)
function isStdioConfig(config) {
  return config.type === "stdio" || !config.type;
}
/**
 * 是否为本机 stdio 服务器。
 */
//@ chunk-aepeg2w5.js:819751-819796 placement
function isReservedStdioServer(e, n) {
  return isStdioConfig(n) && (isClaudeInChromeMCPServer(e) || !1);
}
/**
 * 浏览器/远程设备工具名集合。
 */
//@ chunk-aepeg2w5.js:819796-820317 placement
var CHROME_TOOL_NAMES = new Set(CHROME_TOOL_NAMES_2.map((e) => normalizeNameForMCP(e))),
  GV = new Set(CU_TOOL_NAMES.map((e) => normalizeNameForMCP(e))),
  $V = [
    "list_devices",
    "get_device_info",
    "device_bash",
    BASH_TOOL_NAME,
    FILE_READ_TOOL_NAME,
    FILE_WRITE_TOOL_NAME,
    FILE_EDIT_TOOL_NAME,
    GLOB_TOOL_NAME,
    GREP_TOOL_NAME,
    "sync_files",
    "device_list_dir",
    "device_stage_files",
    "device_commit_files",
    "device_request_folder_access",
    "device_request_delete_permission",
    "create_artifact",
    "update_artifact",
    "list_artifacts",
    "project_memory_read",
    "project_memory_write",
  ],
  WV = new Set(FPn.map((e) => normalizeNameForMCP(e))),
  zV = new Set($V.map((e) => normalizeNameForMCP(e))),
  jV = new Set(["remote_cowork", "remote_cowork_trigger", "local-agent", "local_agent"]);

export {
  isBuiltinMcpServerName,
  nas,
  isClaudeAiProxyServer,
  toScopedConfig_2,
  isReservedStdioServer,
  reservedMcpServerNames,
  isStdioConfig,
  jV,
  CHROME_TOOL_NAMES,
  GV,
  zV,
  WV,
  isRemoteBrowserScoped,
};
