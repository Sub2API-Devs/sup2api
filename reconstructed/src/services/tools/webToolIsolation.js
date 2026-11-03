/**
 * services/tools/webToolIsolation.ts
 *
 * 2.1.316 新增：Web 类工具的隔离运行
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-e6aww6q8.js (26)
 * attribution: placement 26
 */
import {
  getFeatureValueWithSource_CACHED_MAY_BE_STALE,
  isServedFeatureSource,
} from "../analytics/growthbook.js";
import {
  isPolicyEnforcedOrHintedByRefusedCache,
  isSessionVerdictFromServerFetch,
} from "../policyLimits/policyEvidence.js";
import { normalizeNameForMCP, findServersByName } from "../mcp/normalization.js";
import {
  WIt,
  mcpServerIdHeader,
  CLAUDE_AI,
  qPn,
  WIDGETS,
  WIDGETS_SERVER_ID,
  REMOTE_DEVICES,
} from "../mcp/firstPartyServerIds.js";
import { env } from "../../utils/env.js";
import { REMOTE_BROWSER_SERVER_NAME } from "../mcp/remoteBrowserServer.js";
import { isRemoteBrowserHttpConfig } from "../../utils/permissions/remoteBrowser.js";
import { isPolicyAllowed } from "../policyLimits/index.js";
import { WEBSEARCH } from "../../tools/WebSearchTool/prompt.js";
import { WEBFETCH } from "../../tools/WebFetchTool/prompt.js";
import { READMCPRESOURCETOOL } from "../../tools/ReadMcpResourceTool/prompt.js";
import { READ_MCP_RESOURCE_DIR_TOOL_NAME } from "../../tools/ReadMcpResourceDirTool/prompt.js";
import { LISTMCPRESOURCESTOOL } from "../../tools/ListMcpResourcesTool/prompt.js";
import { REFRESH_MCP_TOOLS_TOOL_NAME } from "../../tools/RefreshMcpToolsTool/RefreshMcpToolsTool.js";
import { mcpInfoFromString } from "../mcp/mcpStringUtils.js";
import { CLAUDE_DEVICE, CHROME } from "../../utils/permissions/browserToolNames.js";
import { getMcpClientsFromAccessor } from "../../bootstrap/state.js";
import { isMultiEntryAliasTool } from "./permissionCheckGuard.js";
import { getMcpServerNameOfTool } from "../mcp/utils.js";
import { isPolicyLimitsEligible } from "../policyLimits/policyState.js";
import { SKILL } from "../../tools/SkillTool/skillToolNames.js";
import { parseMcpToolNameCandidates } from "../mcp/serverIdentity.js";
import { FILE_READ_TOOL_NAME } from "../../tools/FileReadTool/constants.js";
import { FILE_EDIT_TOOL_NAME } from "../../tools/FileEditTool/constants.js";
import { FILE_WRITE_TOOL_NAME } from "../../tools/FileWriteTool/prompt.js";
import { BASH_TOOL_NAME } from "../../tools/BashTool/toolName.js";
import { GLOB_TOOL_NAME } from "../../tools/GlobTool/prompt.js";
import { GREP_TOOL_NAME } from "../../tools/GrepTool/prompt.js";
import { NOTEBOOK_EDIT_TOOL_NAME } from "../../tools/NotebookEditTool/constants.js";
import { TODO_WRITE_TOOL_NAME } from "../../tools/TodoWriteTool/constants.js";
import { TASK_CREATE_TOOL_NAME } from "../../tools/TaskCreateTool/constants.js";
import { TASK_GET_TOOL_NAME } from "../../tools/TaskGetTool/constants.js";
import { TASK_LIST_TOOL_NAME } from "../../tools/TaskListTool/constants.js";
import { TASK_UPDATE_TOOL_NAME } from "../../tools/TaskUpdateTool/constants.js";
import { PROJECTS_TOOL_NAME } from "../../tools/ProjectsTool/prompt.js";
import { SEND_USER_FILE_TOOL_NAME } from "../../tools/SendUserFileTool/prompt.js";
import { BRIEF_TOOL_NAME as BRIEF_TOOL_NAME_2 } from "../../tools/BriefTool/prompt.js";
import { TOOL_SEARCH_TOOL_NAME } from "../../tools/ToolSearchTool/prompt.js";
import { AGENT } from "../../tools/AgentTool/constants.js";
import { ASKUSERQUESTION } from "../../tools/AskUserQuestionTool/prompt.js";
import {
  ARTIFACT_TOOL_NAME as ARTIFACT_TOOL_NAME_2,
  ARTIFACT_DATA_TOOL_NAME,
} from "../../tools/ArtifactTool/constants.js";
import { EXITPLANMODE } from "../../tools/ExitPlanModeTool/constants.js";
import { MONITOR } from "../../tools/MonitorTool/constants.js";
import { READNOTIFICATIONS } from "../../tools/ReadNotificationsTool/ReadNotificationsTool.js";
import { SEARCH_MCP_REGISTRY_TOOL_NAME as SEARCH_MCP_REGISTRY_TOOL_NAME_2 } from "../../tools/SearchMcpRegistryTool/prompt.js";
import { TASKSTOP } from "../../tools/TaskStopTool/prompt.js";

//@ chunk-e6aww6q8.js:3900640-3900692 placement
var PLACES_SEARCH = "places_search",
  PLACES_MAP_DISPLAY_V0 = "places_map_display_v0";
//@ chunk-e6aww6q8.js:3900692-3900762 placement
var ENFORCE_WEB_SEARCH_MCP_ISOLATION = "enforce_web_search_mcp_isolation",
  TENGU_DOORBELL_AGAVE = "tengu_doorbell_agave";
//@ chunk-e6aww6q8.js:3900762-3900825 placement
function _tt(e = null, n) {
  if (e) n?.(e);
  return { current: e, onLatch: n };
}
//@ chunk-e6aww6q8.js:3900825-3900894 placement
function A$n() {
  let { value: e, source: source } = getFeatureValueWithSource_CACHED_MAY_BE_STALE(TENGU_DOORBELL_AGAVE, !0);
  return e === !1 && isServedFeatureSource(source);
}
//@ chunk-e6aww6q8.js:3900894-3900932 placement
function x$n() {
  return !A$n() && isPolicyEnforcedOrHintedByRefusedCache(ENFORCE_WEB_SEARCH_MCP_ISOLATION);
}
/**
 * 默认豁免的 MCP 服务器名（cowork、workspace、plugins、ide 等）。
 */
//@ chunk-e6aww6q8.js:3900932-3901038 placement
var DEFAULT_EXEMPT_SERVERS = [
  "cowork",
  "workspace",
  "session-info",
  "mcp-registry",
  "plugins",
  "scheduled-tasks",
  "dispatch",
  "ide",
];
/**
 * 把额外服务器名（规整后）加入配置的豁免服务器列表（默认列表起步，去重）。
 */
//@ chunk-e6aww6q8.js:3901038-3901185 placement
function addExemptServers(e, n) {
  if (n.length === 0) return;
  let r = [...(e.exemptServers ?? DEFAULT_EXEMPT_SERVERS)];
  for (let s of n) {
    let h = normalizeNameForMCP(s);
    if (!r.includes(h)) r.push(h);
  }
  e.exemptServers = r;
}
//@ chunk-e6aww6q8.js:3901185-3902123 placement
var WEB_TOOL_DISPLAY_TYPES = new Set(["web_fetch", "web_search"]),
  P$n = [
    "product_carousel_display_v0",
    "featured_card_display_v0",
    "places_list_display_v0",
    "recipe_display_v0",
  ],
  h5r = new Set(["image_search", "web_search", "web_search_fast", "web_fetch", "us_election_info", ...P$n]),
  y5r = new Set([
    "image_annotation",
    "generate_image",
    "conversation_search",
    "recent_chats",
    "read_conversation",
    "end_conversation",
    "welfare_tool",
    "enterprise_analytics",
    "current_time",
    "approximate_location",
    "show_plan_tip",
    "read_research_report",
  ]),
  _5r = new Set(P$n),
  S5r = new Set([
    "weather_fetch",
    PLACES_SEARCH,
    PLACES_MAP_DISPLAY_V0,
    "fetch_sports_data",
    "comparison_card_display_v0",
    "options_card_display_v0",
    "step_card_display_v0",
    "itinerary_display_v0",
    "link_preview_display_v0",
    "message_compose_v1",
    "quiz_display_v0",
    "translation_display_v0",
    "chart_display_v0",
    "offer_next_step_v0",
    "offer_schedule_v0",
    "starter_tasks_display_v0",
    "claude_code_install_display_v0",
    "approved_connectors_display_v0",
    "role_select_display_v0",
  ]);
//@ chunk-e6aww6q8.js:3902123-3902171 placement
function M$n(e) {
  return e && WIt.peek(e)?.read?.();
}
//@ chunk-e6aww6q8.js:3902171-3902351 placement
function isDynamicHttpServerMatch(e, n, r, s, h) {
  return (
    e?.some((y) => {
      if (y.name !== r || y.config.scope !== "dynamic" || y.config.type !== "http") return !1;
      let S = mcpServerIdHeader(y.config) ?? n?.[r];
      return S === void 0 ? h : S === s;
    }) ?? !1
  );
}
/**
 * 判断各类服务器是否按预期配置：claude.ai 与 widgets 动态 HTTP 服务器、远程浏览器服务器（远程会话且策略允许）。
 */
//@ chunk-e6aww6q8.js:3902351-3902606 placement
function getIsolationServerFlags(e, n) {
  return {
    claudeAi: isDynamicHttpServerMatch(e, n, CLAUDE_AI, qPn, !0),
    widgets: env.CLAUDE_CODE_REMOTE && isDynamicHttpServerMatch(e, n, WIDGETS, WIDGETS_SERVER_ID, !1),
    remoteBrowser:
      env.CLAUDE_CODE_REMOTE &&
      (e ?? []).some((r) => r.name === REMOTE_BROWSER_SERVER_NAME) &&
      (e ?? []).every(
        (r) =>
          r.name !== REMOTE_BROWSER_SERVER_NAME ||
          (r.config.scope === "dynamic" && isRemoteBrowserHttpConfig(r.config)),
      ) &&
      isPolicyAllowed(),
  };
}
//@ chunk-e6aww6q8.js:3902606-3902827 placement
var CHROME_SERVER_NAME_RE = /^claude[-_](?:for|in)[-_]chrome$/i,
  BROWSER_MCP_SERVER_NAMES = new Set(["Claude_Preview", "Claude_Browser"]),
  REMOTE_BROWSER_TOOL_PREFIXES = ["Claude_Browser__", "claude-in-chrome__", "Claude_in_Chrome__"],
  WEB_WITHOUT_LATCHING = "web-without-latching",
  LAUNCH_EXTENDED_SEARCH_TASK = "launch_extended_search_task";
/**
 * 把工具调用归为 Web 或连接器类别以实现隔离：Web 搜索/抓取、浏览器服务器、claude.ai/widgets 的网页工具为 web；资源读取与非豁免服务器为 connectors；不涉及返回 null。
 */
//@ chunk-e6aww6q8.js:3902827-3903460 placement
function classifyIsolationKind(toolName, serverName, exemptServers, flags) {
  if (toolName === WEBSEARCH || toolName === WEBFETCH) return "web";
  if (
    toolName === READMCPRESOURCETOOL ||
    toolName === READ_MCP_RESOURCE_DIR_TOOL_NAME ||
    toolName === LISTMCPRESOURCESTOOL
  )
    return "connectors";
  if (toolName === REFRESH_MCP_TOOLS_TOOL_NAME && serverName === void 0) return null;
  if (serverName) {
    let normalizedServer = normalizeNameForMCP(serverName),
      included = exemptServers.includes(normalizedServer),
      bareToolName = mcpInfoFromString(toolName)?.toolName ?? toolName;
    if (
      CHROME_SERVER_NAME_RE.test(normalizedServer) ||
      BROWSER_MCP_SERVER_NAMES.has(normalizedServer) ||
      (normalizedServer === REMOTE_DEVICES &&
        REMOTE_BROWSER_TOOL_PREFIXES.some((w) => bareToolName.startsWith(w))) ||
      (normalizedServer === CLAUDE_DEVICE && bareToolName.startsWith(CHROME) && !bareToolName.includes("__"))
    )
      return "web";
    if (flags.remoteBrowser && normalizedServer === REMOTE_BROWSER_SERVER_NAME) return "web";
    if (flags.claudeAi && normalizedServer === CLAUDE_AI) {
      if (toolName === REFRESH_MCP_TOOLS_TOOL_NAME) return null;
      if (h5r.has(bareToolName)) return "web";
      if (y5r.has(bareToolName)) return null;
      if (bareToolName === LAUNCH_EXTENDED_SEARCH_TASK) return WEB_WITHOUT_LATCHING;
    }
    if (flags.widgets && normalizedServer === WIDGETS) {
      if (toolName === REFRESH_MCP_TOOLS_TOOL_NAME) return null;
      if (_5r.has(bareToolName)) return "web";
      if (S5r.has(bareToolName)) return null;
    }
    if (included && WEB_TOOL_DISPLAY_TYPES.has(bareToolName)) return "web";
    if (!included) return "connectors";
  }
  return null;
}
//@ chunk-e6aww6q8.js:3903460-3903516 placement
function P5r(e, n = DEFAULT_EXEMPT_SERVERS, r = getMcpClientsFromAccessor(), s) {
  return O$n(e, n, getIsolationServerFlags(r, s));
}
//@ chunk-e6aww6q8.js:3903516-3903609 placement
function O$n(e, n, r) {
  return classifyIsolationKind(
    isMultiEntryAliasTool(e) ? e.underlyingV1ToolName : e.name,
    getMcpServerNameOfTool(e),
    n,
    withRemoteBrowserFlag(r, e.mcpInfo),
  );
}
//@ chunk-e6aww6q8.js:3903609-3903743 placement
function withRemoteBrowserFlag(e, n) {
  return e.remoteBrowser &&
    !(n?.serverName === REMOTE_BROWSER_SERVER_NAME && n.serverType === "http" && n.scope === "dynamic")
    ? { ...e, remoteBrowser: !1 }
    : e;
}
/**
 * 扫描历史助手消息中的工具调用，找出第一个使隔离锁定为 web 或 connectors 的类别；策略未要求隔离时返回 null。
 */
//@ chunk-e6aww6q8.js:3903743-3904363 placement
function findIsolationLatchFromHistory(e, n, r = DEFAULT_EXEMPT_SERVERS, s = getMcpClientsFromAccessor(), h) {
  if (
    A$n() ||
    !isPolicyLimitsEligible() ||
    (isSessionVerdictFromServerFetch() &&
      !isPolicyEnforcedOrHintedByRefusedCache(ENFORCE_WEB_SEARCH_MCP_ISOLATION))
  )
    return null;
  let toolsByName = new Map(n.map((L) => [L.name, L])),
    sessionLatch = M$n(h),
    flags = { ...getIsolationServerFlags(s, sessionLatch), remoteBrowser: !1 };
  for (let L of e) {
    if (L.type !== "assistant") continue;
    let G = L.message?.content;
    if (!Array.isArray(G)) continue;
    for (let q of G) {
      if (q === null || typeof q !== "object" || q.type !== "tool_use" || typeof q.name !== "string")
        continue;
      let Z = toolsByName.get(q.name),
        Se = q.name === REFRESH_MCP_TOOLS_TOOL_NAME ? parseRefreshToolsInput(q.input) : void 0,
        ke = void 0,
        we = ke
          ? classifyIsolationKind(SKILL, ke, r, flags) === "connectors"
            ? "connectors"
            : null
          : Se
            ? Se.kind === "named"
              ? classifyIsolationKind(REFRESH_MCP_TOOLS_TOOL_NAME, Se.server, r, flags)
              : null
            : Z
              ? O$n(Z, r, flags)
              : classifyIsolationKind(q.name, F5r(q.name, r), r, flags);
      if (we !== null && we !== WEB_WITHOUT_LATCHING) return we;
    }
  }
  return null;
}
//@ chunk-e6aww6q8.js:3904363-3904462 placement
function F5r(e, n) {
  let mapped = parseMcpToolNameCandidates(e).map((s) => s.serverName);
  return mapped.find((s) => !n.includes(normalizeNameForMCP(s))) ?? mapped[0];
}
//@ chunk-e6aww6q8.js:3904462-3905010 placement
function WEB_TOOLS_UNAVAILABLE_MESSAGES(e) {
  return e === "web"
    ? "Connectors are unavailable in this session under your organization's web search / connector isolation policy. Start a new session to use connectors."
    : "Web search, web fetch, and browser tools are unavailable in this session under your organization's web search / connector isolation policy. Do not attempt to reach any external URL via another tool (curl, bash, the browser, or otherwise) \u2014 this policy blocks all outbound web access while connector data is in context. Start a new session to use web tools.";
}
//@ chunk-e6aww6q8.js:3905010-3905072 placement
var I$n = { denyMessage: null, classifiedAs: null, activeLatch: null };
//@ chunk-e6aww6q8.js:3905072-3905318 placement
function parseRefreshToolsInput(e) {
  if (e === null || typeof e !== "object" || Array.isArray(e)) return { kind: "malformed" };
  let n = "server" in e ? e.server : void 0;
  if (n === void 0 || n === "") return { kind: "all" };
  if (typeof n !== "string") return { kind: "malformed" };
  return { kind: "named", server: n };
}
/**
 * 判断刷新 MCP 工具调用的隔离类别：指定服务器时按该服务器；刷新全部时任一连接器服务器即为 connectors，否则有网页服务器为 web。
 */
//@ chunk-e6aww6q8.js:3905318-3905745 placement
function classifyRefreshToolsCall(e, n, r, s = DEFAULT_EXEMPT_SERVERS) {
  let h = n ?? getMcpClientsFromAccessor(),
    y = getIsolationServerFlags(h, r),
    S = parseRefreshToolsInput(e);
  if (S.kind === "malformed") return null;
  if (S.kind === "named") {
    if (h !== void 0) {
      if (findServersByName(h, S.server).filter((G) => G.type === "connected").length === 0) return null;
    }
    return classifyIsolationKind(REFRESH_MCP_TOOLS_TOOL_NAME, S.server, s, y);
  }
  if (h === void 0) return "connectors";
  let w = !1;
  for (let L of h) {
    if (L.type !== "connected") continue;
    let G = classifyIsolationKind(REFRESH_MCP_TOOLS_TOOL_NAME, L.name, s, y);
    if (G === "connectors") return "connectors";
    if (G === "web") w = !0;
  }
  return w ? "web" : null;
}
/**
 * 检查工具调用是否违反 Web/连接器隔离：按工具归类后与当前锁定比较。
 */
//@ chunk-e6aww6q8.js:3905745-3905964 placement
function checkWebIsolation(e, n, r) {
  let isolationLatch = n.isolationLatch;
  if (!isolationLatch || !x$n()) return I$n;
  let h = M$n(n.session),
    y =
      e.name === REFRESH_MCP_TOOLS_TOOL_NAME
        ? classifyRefreshToolsCall(r, n.options?.mcpClients, h, isolationLatch.exemptServers)
        : P5r(e, isolationLatch.exemptServers, n.options?.mcpClients ?? getMcpClientsFromAccessor(), h);
  return applyIsolationLatch(isolationLatch, y);
}
/**
 * 与隔离锁比较：已锁定为另一类时拒绝；尚未锁定且需要锁定时设置锁并回调。
 */
//@ chunk-e6aww6q8.js:3905964-3906205 placement
function applyIsolationLatch(e, n) {
  if (!n) return I$n;
  let r = n === WEB_WITHOUT_LATCHING ? "web" : n,
    s = e.current;
  if (s && s !== r)
    return { denyMessage: WEB_TOOLS_UNAVAILABLE_MESSAGES(s), classifiedAs: r, activeLatch: s };
  if (!s && n !== WEB_WITHOUT_LATCHING) ((e.current = r), e.onLatch?.(r));
  return { denyMessage: null, classifiedAs: r, activeLatch: e.current };
}
//@ chunk-e6aww6q8.js:3906205-3906233 placement
function g3s() {
  return x$n();
}
/**
 * Web 隔离相关常量：外部模块、检查间隔与超时，以及读写文件/Bash、联网工具与只读安全工具的名称集合。
 */
//@ chunk-e6aww6q8.js:3906233-3906428 placement
var webIsolationModule = require("./chunk-1cnesc1e.js"),
  ISOLATION_CHECK_INTERVAL = 500,
  ISOLATION_TIMEOUT_MS = 2000,
  CORE_FILE_TOOLS = new Set([FILE_READ_TOOL_NAME, FILE_EDIT_TOOL_NAME, FILE_WRITE_TOOL_NAME, BASH_TOOL_NAME]),
  WEB_TOOLS = new Set([WEBFETCH, WEBSEARCH]),
  ISOLATION_NEUTRAL_TOOLS = new Set([
    FILE_READ_TOOL_NAME,
    FILE_EDIT_TOOL_NAME,
    FILE_WRITE_TOOL_NAME,
    GLOB_TOOL_NAME,
    GREP_TOOL_NAME,
    NOTEBOOK_EDIT_TOOL_NAME,
    TODO_WRITE_TOOL_NAME,
    TASK_CREATE_TOOL_NAME,
    TASK_GET_TOOL_NAME,
    TASK_LIST_TOOL_NAME,
    TASK_UPDATE_TOOL_NAME,
    PROJECTS_TOOL_NAME,
    SEND_USER_FILE_TOOL_NAME,
    BRIEF_TOOL_NAME_2,
    TOOL_SEARCH_TOOL_NAME,
    SKILL,
    AGENT,
    ASKUSERQUESTION,
    ARTIFACT_TOOL_NAME_2,
    ARTIFACT_DATA_TOOL_NAME,
    EXITPLANMODE,
    MONITOR,
    READNOTIFICATIONS,
    SEARCH_MCP_REGISTRY_TOOL_NAME_2,
    TASKSTOP,
  ]);

export {
  _tt,
  findIsolationLatchFromHistory,
  DEFAULT_EXEMPT_SERVERS,
  addExemptServers,
  g3s,
  ISOLATION_CHECK_INTERVAL,
  checkWebIsolation,
  webIsolationModule,
  ISOLATION_TIMEOUT_MS,
  ISOLATION_NEUTRAL_TOOLS,
  CORE_FILE_TOOLS,
  WEB_TOOLS,
};
