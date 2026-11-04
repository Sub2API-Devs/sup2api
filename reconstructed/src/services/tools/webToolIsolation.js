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
  officeBridgeState,
  mcpServerIdHeader,
  CLAUDE_AI,
  MEMORY_SERVER_ID,
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
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-e6aww6q8.js:3900640-3900692 placement
var PLACES_SEARCH = "places_search";
var PLACES_MAP_DISPLAY_V0 = "places_map_display_v0";
//@ chunk-e6aww6q8.js:3900692-3900762 placement
var ENFORCE_WEB_SEARCH_MCP_ISOLATION = "enforce_web_search_mcp_isolation";
var TENGU_DOORBELL_AGAVE = "tengu_doorbell_agave";
//@ chunk-e6aww6q8.js:3900762-3900825 placement
/**
 * 创建隔离闩锁：当前值与变更回调。
 */
function createIsolationLatch(initialLatch = null, onLatch) {
  if (initialLatch) onLatch?.(initialLatch);
  return {
    current: initialLatch,
    onLatch,
  };
}
//@ chunk-e6aww6q8.js:3900825-3900894 placement
/**
 * 判断开关 tengu_doorbell_agave 是否被服务端强制关闭。
 */
function isDoorbellAgaveForcedOff() {
  let { value, source } = getFeatureValueWithSource_CACHED_MAY_BE_STALE(TENGU_DOORBELL_AGAVE, true);
  return value === false && isServedFeatureSource(source);
}
//@ chunk-e6aww6q8.js:3900894-3900932 placement
/**
 * 开关未关且策略要求强制隔离 web 搜索/抓取。
 */
function isWebSearchIsolationEnforced() {
  return (
    !isDoorbellAgaveForcedOff() && isPolicyEnforcedOrHintedByRefusedCache(ENFORCE_WEB_SEARCH_MCP_ISOLATION)
  );
}
//@ chunk-e6aww6q8.js:3900932-3901038 placement
/**
 * 默认豁免的 MCP 服务器名（cowork、workspace、plugins、ide 等）。
 */
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
//@ chunk-e6aww6q8.js:3901038-3901185 placement
/**
 * 把额外服务器名（规整后）加入配置的豁免服务器列表（默认列表起步，去重）。
 */
function addExemptServers(isolationLatch, webSearchIsolationExemptMcpServers) {
  if (webSearchIsolationExemptMcpServers.length === 0) return;
  let servers = [...(isolationLatch.exemptServers ?? DEFAULT_EXEMPT_SERVERS)];
  for (let serverName of webSearchIsolationExemptMcpServers) {
    let normalized = normalizeNameForMCP(serverName);
    if (!servers.includes(normalized)) servers.push(normalized);
  }
  isolationLatch.exemptServers = servers;
}
//@ chunk-e6aww6q8.js:3901185-3902123 placement
/**
 * 隔离分类用的工具名集合：卡片展示工具、需隔离的 web 工具、非 web 的 Anthropic 工具与其他展示工具。
 */
var WEB_TOOL_DISPLAY_TYPES; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
var WEB_CARD_DISPLAY_TOOLS;
var WEB_ISOLATED_TOOL_NAMES;
var NON_WEB_ANTHROPIC_TOOL_NAMES;
var WEB_CARD_TOOL_SET;
var OTHER_DISPLAY_TOOL_NAMES;
deferInit("chunk-e6aww6q8.js:3901185", () => {
  WEB_TOOL_DISPLAY_TYPES = new Set(["web_fetch", "web_search"]);
  WEB_CARD_DISPLAY_TOOLS = [
    "product_carousel_display_v0",
    "featured_card_display_v0",
    "places_list_display_v0",
    "recipe_display_v0",
  ];
  WEB_ISOLATED_TOOL_NAMES = new Set([
    "image_search",
    "web_search",
    "web_search_fast",
    "web_fetch",
    "us_election_info",
    ...WEB_CARD_DISPLAY_TOOLS,
  ]);
  NON_WEB_ANTHROPIC_TOOL_NAMES = new Set([
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
  ]);
  WEB_CARD_TOOL_SET = new Set(WEB_CARD_DISPLAY_TOOLS);
  OTHER_DISPLAY_TOOL_NAMES = new Set([
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
});
//@ chunk-e6aww6q8.js:3902123-3902171 placement
/**
 * 读取会话级隔离闩锁。
 */
function readSessionIsolationLatch(session) {
  return session && officeBridgeState.peek(session)?.read?.();
}
//@ chunk-e6aww6q8.js:3902171-3902351 placement
function isDynamicHttpServerMatch(clients, headerIdsByServer, serverName, expectedId, fallbackMatch) {
  return (
    clients?.some((client) => {
      if (client.name !== serverName || client.config.scope !== "dynamic" || client.config.type !== "http")
        return false;
      let serverId = mcpServerIdHeader(client.config) ?? headerIdsByServer?.[serverName];
      return serverId === undefined ? fallbackMatch : serverId === expectedId;
    }) ?? false
  );
}
//@ chunk-e6aww6q8.js:3902351-3902606 placement
/**
 * 判断各类服务器是否按预期配置：claude.ai 与 widgets 动态 HTTP 服务器、远程浏览器服务器（远程会话且策略允许）。
 */
function getIsolationServerFlags(clients, sessionLatch) {
  return {
    claudeAi: isDynamicHttpServerMatch(clients, sessionLatch, CLAUDE_AI, MEMORY_SERVER_ID, true),
    widgets:
      env.CLAUDE_CODE_REMOTE &&
      isDynamicHttpServerMatch(clients, sessionLatch, WIDGETS, WIDGETS_SERVER_ID, false),
    remoteBrowser:
      env.CLAUDE_CODE_REMOTE &&
      (clients ?? []).some((client) => client.name === REMOTE_BROWSER_SERVER_NAME) &&
      (clients ?? []).every(
        (client) =>
          client.name !== REMOTE_BROWSER_SERVER_NAME ||
          (client.config.scope === "dynamic" && isRemoteBrowserHttpConfig(client.config)),
      ) &&
      isPolicyAllowed(),
  };
}
//@ chunk-e6aww6q8.js:3902606-3902827 placement
var CHROME_SERVER_NAME_RE; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
var BROWSER_MCP_SERVER_NAMES;
var REMOTE_BROWSER_TOOL_PREFIXES;
var WEB_WITHOUT_LATCHING;
var LAUNCH_EXTENDED_SEARCH_TASK;
deferInit("chunk-e6aww6q8.js:3902606", () => {
  CHROME_SERVER_NAME_RE = /^claude[-_](?:for|in)[-_]chrome$/i;
  BROWSER_MCP_SERVER_NAMES = new Set(["Claude_Preview", "Claude_Browser"]);
  REMOTE_BROWSER_TOOL_PREFIXES = ["Claude_Browser__", "claude-in-chrome__", "Claude_in_Chrome__"];
  WEB_WITHOUT_LATCHING = "web-without-latching";
  LAUNCH_EXTENDED_SEARCH_TASK = "launch_extended_search_task";
});
//@ chunk-e6aww6q8.js:3902827-3903460 placement
/**
 * 把工具调用归为 Web 或连接器类别以实现隔离：Web 搜索/抓取、浏览器服务器、claude.ai/widgets 的网页工具为 web；资源读取与非豁免服务器为 connectors；不涉及返回 null。
 */
function classifyIsolationKind(toolName, serverName, exemptServers, flags) {
  if (toolName === WEBSEARCH || toolName === WEBFETCH) return "web";
  if (
    toolName === READMCPRESOURCETOOL ||
    toolName === READ_MCP_RESOURCE_DIR_TOOL_NAME ||
    toolName === LISTMCPRESOURCESTOOL
  )
    return "connectors";
  if (toolName === REFRESH_MCP_TOOLS_TOOL_NAME && serverName === undefined) return null;
  if (serverName) {
    let normalizedServer = normalizeNameForMCP(serverName);
    let included = exemptServers.includes(normalizedServer);
    let bareToolName = mcpInfoFromString(toolName)?.toolName ?? toolName;
    if (
      CHROME_SERVER_NAME_RE.test(normalizedServer) ||
      BROWSER_MCP_SERVER_NAMES.has(normalizedServer) ||
      (normalizedServer === REMOTE_DEVICES &&
        REMOTE_BROWSER_TOOL_PREFIXES.some((prefix) => bareToolName.startsWith(prefix))) ||
      (normalizedServer === CLAUDE_DEVICE && bareToolName.startsWith(CHROME) && !bareToolName.includes("__"))
    )
      return "web";
    if (flags.remoteBrowser && normalizedServer === REMOTE_BROWSER_SERVER_NAME) return "web";
    if (flags.claudeAi && normalizedServer === CLAUDE_AI) {
      if (toolName === REFRESH_MCP_TOOLS_TOOL_NAME) return null;
      if (WEB_ISOLATED_TOOL_NAMES.has(bareToolName)) return "web";
      if (NON_WEB_ANTHROPIC_TOOL_NAMES.has(bareToolName)) return null;
      if (bareToolName === LAUNCH_EXTENDED_SEARCH_TASK) return WEB_WITHOUT_LATCHING;
    }
    if (flags.widgets && normalizedServer === WIDGETS) {
      if (toolName === REFRESH_MCP_TOOLS_TOOL_NAME) return null;
      if (WEB_CARD_TOOL_SET.has(bareToolName)) return "web";
      if (OTHER_DISPLAY_TOOL_NAMES.has(bareToolName)) return null;
    }
    if (included && WEB_TOOL_DISPLAY_TYPES.has(bareToolName)) return "web";
    if (!included) return "connectors";
  }
  return null;
}
//@ chunk-e6aww6q8.js:3903460-3903516 placement
/**
 * 按默认豁免与 MCP 客户端分类工具的隔离类型。
 */
function classifyToolIsolation(
  tool,
  exemptServers = DEFAULT_EXEMPT_SERVERS,
  clients = getMcpClientsFromAccessor(),
  sessionLatch,
) {
  return classifyToolIsolationWithFlags(tool, exemptServers, getIsolationServerFlags(clients, sessionLatch));
}
//@ chunk-e6aww6q8.js:3903516-3903609 placement
/**
 * 以多入口别名与远端浏览器标志做隔离分类。
 */
function classifyToolIsolationWithFlags(tool, exemptServers, flags) {
  return classifyIsolationKind(
    isMultiEntryAliasTool(tool) ? tool.underlyingV1ToolName : tool.name,
    getMcpServerNameOfTool(tool),
    exemptServers,
    withRemoteBrowserFlag(flags, tool.mcpInfo),
  );
}
//@ chunk-e6aww6q8.js:3903609-3903743 placement
function withRemoteBrowserFlag(flags, mcpInfo) {
  return flags.remoteBrowser &&
    !(
      mcpInfo?.serverName === REMOTE_BROWSER_SERVER_NAME &&
      mcpInfo.serverType === "http" &&
      mcpInfo.scope === "dynamic"
    )
    ? {
        ...flags,
        remoteBrowser: false,
      }
    : flags;
}
//@ chunk-e6aww6q8.js:3903743-3904363 placement
/**
 * 扫描历史助手消息中的工具调用，找出第一个使隔离锁定为 web 或 connectors 的类别；策略未要求隔离时返回 null。
 */
function findIsolationLatchFromHistory(
  messages,
  tools,
  exemptServers = DEFAULT_EXEMPT_SERVERS,
  clients = getMcpClientsFromAccessor(),
  session,
) {
  if (
    isDoorbellAgaveForcedOff() ||
    !isPolicyLimitsEligible() ||
    (isSessionVerdictFromServerFetch() &&
      !isPolicyEnforcedOrHintedByRefusedCache(ENFORCE_WEB_SEARCH_MCP_ISOLATION))
  )
    return null;
  let toolsByName = new Map(tools.map((tool) => [tool.name, tool]));
  let sessionLatch = readSessionIsolationLatch(session);
  let flags = {
    ...getIsolationServerFlags(clients, sessionLatch),
    remoteBrowser: false,
  };
  for (let message of messages) {
    if (message.type !== "assistant") continue;
    let content = message.message?.content;
    if (!Array.isArray(content)) continue;
    for (let block of content) {
      if (
        block === null ||
        typeof block !== "object" ||
        block.type !== "tool_use" ||
        typeof block.name !== "string"
      )
        continue;
      let tool = toolsByName.get(block.name);
      let refreshInput =
        block.name === REFRESH_MCP_TOOLS_TOOL_NAME ? parseRefreshToolsInput(block.input) : undefined;
      let unusedSkill = undefined;
      let kind = unusedSkill
        ? classifyIsolationKind(SKILL, unusedSkill, exemptServers, flags) === "connectors"
          ? "connectors"
          : null
        : refreshInput
          ? refreshInput.kind === "named"
            ? classifyIsolationKind(REFRESH_MCP_TOOLS_TOOL_NAME, refreshInput.server, exemptServers, flags)
            : null
          : tool
            ? classifyToolIsolationWithFlags(tool, exemptServers, flags)
            : classifyIsolationKind(
                block.name,
                mcpServerNameForTool(block.name, exemptServers),
                exemptServers,
                flags,
              );
      if (kind !== null && kind !== WEB_WITHOUT_LATCHING) return kind;
    }
  }
  return null;
}
//@ chunk-e6aww6q8.js:3904363-3904462 placement
/**
 * 从工具名候选中取未豁免的 MCP 服务器名。
 */
function mcpServerNameForTool(ruleName, exemptServers) {
  let mapped = parseMcpToolNameCandidates(ruleName).map((candidate) => candidate.serverName);
  return mapped.find((serverName) => !exemptServers.includes(normalizeNameForMCP(serverName))) ?? mapped[0];
}
//@ chunk-e6aww6q8.js:3904462-3905010 placement
function WEB_TOOLS_UNAVAILABLE_MESSAGES(kind) {
  return kind === "web"
    ? "Connectors are unavailable in this session under your organization's web search / connector isolation policy. Start a new session to use connectors."
    : "Web search, web fetch, and browser tools are unavailable in this session under your organization's web search / connector isolation policy. Do not attempt to reach any external URL via another tool (curl, bash, the browser, or otherwise) \u2014 this policy blocks all outbound web access while connector data is in context. Start a new session to use web tools.";
}
//@ chunk-e6aww6q8.js:3905010-3905072 placement
/**
 * 无隔离时的默认结果（无拒绝消息、无分类、无闩锁）。
 */
var EMPTY_ISOLATION_RESULT = {
  denyMessage: null,
  classifiedAs: null,
  activeLatch: null,
};
//@ chunk-e6aww6q8.js:3905072-3905318 placement
function parseRefreshToolsInput(input) {
  if (input === null || typeof input !== "object" || Array.isArray(input))
    return {
      kind: "malformed",
    };
  let server = "server" in input ? input.server : undefined;
  if (server === undefined || server === "")
    return {
      kind: "all",
    };
  if (typeof server !== "string")
    return {
      kind: "malformed",
    };
  return {
    kind: "named",
    server,
  };
}
//@ chunk-e6aww6q8.js:3905318-3905745 placement
/**
 * 判断刷新 MCP 工具调用的隔离类别：指定服务器时按该服务器；刷新全部时任一连接器服务器即为 connectors，否则有网页服务器为 web。
 */
function classifyRefreshToolsCall(input, mcpClients, sessionLatch, exemptServers = DEFAULT_EXEMPT_SERVERS) {
  let clients = mcpClients ?? getMcpClientsFromAccessor();
  let isolationServerFlags = getIsolationServerFlags(clients, sessionLatch);
  let refreshToolsInput = parseRefreshToolsInput(input);
  if (refreshToolsInput.kind === "malformed") return null;
  if (refreshToolsInput.kind === "named") {
    if (clients !== undefined) {
      if (
        findServersByName(clients, refreshToolsInput.server).filter((client) => client.type === "connected")
          .length === 0
      )
        return null;
    }
    return classifyIsolationKind(
      REFRESH_MCP_TOOLS_TOOL_NAME,
      refreshToolsInput.server,
      exemptServers,
      isolationServerFlags,
    );
  }
  if (clients === undefined) return "connectors";
  let sawWeb = false;
  for (let client of clients) {
    if (client.type !== "connected") continue;
    let kind = classifyIsolationKind(
      REFRESH_MCP_TOOLS_TOOL_NAME,
      client.name,
      exemptServers,
      isolationServerFlags,
    );
    if (kind === "connectors") return "connectors";
    if (kind === "web") sawWeb = true;
  }
  return sawWeb ? "web" : null;
}
//@ chunk-e6aww6q8.js:3905745-3905964 placement
/**
 * 检查工具调用是否违反 Web/连接器隔离：按工具归类后与当前锁定比较。
 */
function checkWebIsolation(tool, toolUseContext, input) {
  let isolationLatch = toolUseContext.isolationLatch;
  if (!isolationLatch || !isWebSearchIsolationEnforced()) return EMPTY_ISOLATION_RESULT;
  let sessionIsolationLatch = readSessionIsolationLatch(toolUseContext.session);
  let kind =
    tool.name === REFRESH_MCP_TOOLS_TOOL_NAME
      ? classifyRefreshToolsCall(
          input,
          toolUseContext.options?.mcpClients,
          sessionIsolationLatch,
          isolationLatch.exemptServers,
        )
      : classifyToolIsolation(
          tool,
          isolationLatch.exemptServers,
          toolUseContext.options?.mcpClients ?? getMcpClientsFromAccessor(),
          sessionIsolationLatch,
        );
  return applyIsolationLatch(isolationLatch, kind);
}
//@ chunk-e6aww6q8.js:3905964-3906205 placement
/**
 * 与隔离锁比较：已锁定为另一类时拒绝；尚未锁定且需要锁定时设置锁并回调。
 */
function applyIsolationLatch(isolationLatch, kind) {
  if (!kind) return EMPTY_ISOLATION_RESULT;
  let normalizedKind = kind === WEB_WITHOUT_LATCHING ? "web" : kind;
  let latchedKind = isolationLatch.current;
  if (latchedKind && latchedKind !== normalizedKind)
    return {
      denyMessage: WEB_TOOLS_UNAVAILABLE_MESSAGES(latchedKind),
      classifiedAs: normalizedKind,
      activeLatch: latchedKind,
    };
  if (!latchedKind && kind !== WEB_WITHOUT_LATCHING) {
    isolationLatch.current = normalizedKind;
    isolationLatch.onLatch?.(normalizedKind);
  }
  return {
    denyMessage: null,
    classifiedAs: normalizedKind,
    activeLatch: isolationLatch.current,
  };
}
//@ chunk-e6aww6q8.js:3906205-3906233 placement
/**
 * 当前是否启用 web 搜索隔离。
 */
function isWebSearchIsolationActive() {
  return isWebSearchIsolationEnforced();
}
//@ chunk-e6aww6q8.js:3906233-3906428 placement
/**
 * Web 隔离相关常量：外部模块、检查间隔与超时，以及读写文件/Bash、联网工具与只读安全工具的名称集合。
 */
var webIsolationModule; // deferred: loads other modules while loading; runs once its import cycle is complete
var ISOLATION_CHECK_INTERVAL;
var ISOLATION_TIMEOUT_MS;
var CORE_FILE_TOOLS;
var WEB_TOOLS;
var ISOLATION_NEUTRAL_TOOLS;
deferInit("chunk-e6aww6q8.js:3906233", () => {
  webIsolationModule = require("../teleport/relayState.js");
  ISOLATION_CHECK_INTERVAL = 500;
  ISOLATION_TIMEOUT_MS = 2000;
  CORE_FILE_TOOLS = new Set([FILE_READ_TOOL_NAME, FILE_EDIT_TOOL_NAME, FILE_WRITE_TOOL_NAME, BASH_TOOL_NAME]);
  WEB_TOOLS = new Set([WEBFETCH, WEBSEARCH]);
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
});
export {
  createIsolationLatch,
  findIsolationLatchFromHistory,
  DEFAULT_EXEMPT_SERVERS,
  addExemptServers,
  isWebSearchIsolationActive,
  ISOLATION_CHECK_INTERVAL,
  checkWebIsolation,
  webIsolationModule,
  ISOLATION_TIMEOUT_MS,
  ISOLATION_NEUTRAL_TOOLS,
  CORE_FILE_TOOLS,
  WEB_TOOLS,
};
