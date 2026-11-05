/**
 * utils/toolPool.ts
 *
 * 工具池合并：内建与 MCP 工具去重、按权限过滤、分区排序（协调者模式额外过滤），以及 PR 活动订阅工具名判断
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/utils/toolPool.ts
 * pieces: chunk-6f6qbsyw.js (8), chunk-dzw1343q.js (9)
 * attribution: placement 15, fingerprint 1, file-local 1
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { EXITPLANMODE_2 } from "../tools/ExitPlanModeTool/constants.js";
import { ENTER_PLAN_MODE_TOOL_NAME } from "../tools/EnterPlanModeTool/constants.js";
import { MEMORY_TOOL_NAMES } from "../tools/MemoryTool/memoryToolNames.js";
import { ASKUSERQUESTION } from "../tools/AskUserQuestionTool/prompt.js";
import { CONNECTGITHUB } from "../components/ConnectGitHub/constants.js";
import {
  OFFERCHROMESETUP,
  READNOTIFICATIONS,
  isCoordinatorShellVerifiable,
} from "../tools/ReadNotificationsTool/ReadNotificationsTool.js";
import { PROPOSE_SKILLS } from "../tools/ProposeSkillsTool/ProposeSkillsTool.js";
import { WRAPUP } from "../tools/WrapUpTool/prompt.js";
import { WAITFORMCPSERVERS } from "../tools/WaitForMcpServersTool/WaitForMcpServersTool.js";
import { REFRESH_MCP_TOOLS_TOOL_NAME } from "../tools/RefreshMcpToolsTool/RefreshMcpToolsTool.js";
import { WORKFLOW_TOOL_NAME } from "../tools/WorkflowTool/constants.js";
import { SCHEDULE_WAKEUP_TOOL_NAME } from "../tools/ScheduleWakeupTool/prompt.js";
import { PROPOSEGOAL } from "../tools/ProposeGoalTool/ProposeGoalTool.js";
import { PUBLISH_PLUGIN_TOOL_NAME } from "../tools/PublishPluginTool/prompt.js";
import { END_CONVERSATION_TOOL_NAME } from "../tools/EndConversationTool/constants.js";
import { READ } from "../tools/FileReadTool/constants.js";
import { WEBSEARCH } from "../tools/WebSearchTool/prompt.js";
import { TODO_WRITE_TOOL_NAME } from "../tools/TodoWriteTool/constants.js";
import { GREP_TOOL_NAME } from "../tools/GrepTool/prompt.js";
import { WEBFETCH } from "../tools/WebFetchTool/prompt.js";
import { GLOB_TOOL_NAME } from "../tools/GlobTool/prompt.js";
import { SHELL_TOOL_NAMES } from "./shell/shellToolUtils.js";
import { EDIT } from "../tools/FileEditTool/constants.js";
import { FILE_WRITE_TOOL_NAME } from "../tools/FileWriteTool/prompt.js";
import { NOTEBOOK_EDIT_TOOL_NAME } from "../tools/NotebookEditTool/constants.js";
import { SKILL } from "../tools/SkillTool/skillToolNames.js";
import { STRUCTUREDOUTPUT } from "../tools/SyntheticOutputTool/SyntheticOutputTool.js";
import { TOOL_SEARCH_TOOL_NAME } from "../tools/ToolSearchTool/prompt.js";
import { ENTER_WORKTREE_TOOL_NAME } from "../tools/EnterWorktreeTool/constants.js";
import { EXIT_WORKTREE_TOOL_NAME } from "../tools/ExitWorktreeTool/constants.js";
import { REPL_TOOL_NAME } from "../tools/REPLTool/constants.js";
import { POLL } from "../tools/PollTool/prompt.js";
import { LSP_TOOL_NAME } from "../tools/LSPTool/UI.js";
import { MONITOR } from "../tools/MonitorTool/constants.js";
import { TASKSTOP } from "../tools/TaskStopTool/prompt.js";
import { SENDMESSAGE } from "../tools/SendMessageTool/constants.js";
import { ARTIFACT_TOOL_NAME } from "../tools/ArtifactTool/constants.js";
import {
  PLUGIN_DISCOVERY_SEARCH_TOOL_NAMES,
  SUGGESTPLUGININSTALL,
  SUGGESTSKILLS,
} from "../tools/pluginDiscoveryToolNames.js";
import { PUSHNOTIFICATION } from "../tools/PushNotificationTool/constants.js";
import { SHOWONBOARDINGROLEPICKER } from "../tools/ShowOnboardingRolePickerTool/ShowOnboardingRolePickerTool.js";
import { TASK_CREATE_TOOL_NAME } from "../tools/TaskCreateTool/constants.js";
import { TASK_GET_TOOL_NAME } from "../tools/TaskGetTool/constants.js";
import { TASK_LIST_TOOL_NAME } from "../tools/TaskListTool/constants.js";
import { TASK_UPDATE_TOOL_NAME } from "../tools/TaskUpdateTool/constants.js";
import {
  CRON_CREATE_TOOL_NAME,
  CRON_DELETE_TOOL_NAME,
  CRON_LIST_TOOL_NAME,
} from "../tools/ScheduleCronTool/prompt.js";
import { AGENT } from "../tools/AgentTool/constants.js";
import { LISTAGENTS } from "../tools/SendMessageTool/listAgents.js";
import { CLAUDE_CODE_REMOTE } from "../services/mcp/ccrMetaMcp.js";
import { BRIEF_TOOL_NAME } from "../tools/BriefTool/prompt.js";
import { SEND_USER_FILE_TOOL_NAME } from "../tools/SendUserFileTool/prompt.js";
import { getMcpPrefix, isToolFromMcpServer } from "../services/mcp/mcpStringUtils.js";
import { isCommsRoledServer, isCoordinatorCommsMcpTool } from "../coordinator/coordinatorMcpServers.js";
import { env } from "./env.js";
import { matchesToolName, compareToolsByName } from "../Tool.js";
import { BASH_TOOL_NAME } from "../tools/BashTool/toolName.js";
import { isMcpTool } from "../services/mcp/utils.js";
import { toolMatchesAnyName } from "../services/tools/permissionCheckGuard.js";
import { partitionAlias } from "../../vendor/lodash-es/_inlinedHelpers.js";
import {
  getToolNameForPermissionCheck,
  visibleTools,
  getToolNameForPermissionCheck_4,
} from "../services/artifacts/artifactMcpSwap.js";
import { uniqBy } from "./collections.js";
import { warnMcpToolNameTooLong } from "../services/mcp/toolNameLimits.js";
import { isHostOnlyNativeTool } from "../services/api/deferredToolsState.js";
import { isConversationEndToolDenied } from "./permissions/permissions.js";
import { deferInit } from "../../runtime/deferred-init.js";

//@ chunk-6f6qbsyw.js:11210-11505 placement
function getAlwaysAvailableToolNames(names) {
  return new Set([
    EXITPLANMODE_2,
    ENTER_PLAN_MODE_TOOL_NAME,
    ...MEMORY_TOOL_NAMES,
    ASKUSERQUESTION,
    CONNECTGITHUB,
    OFFERCHROMESETUP,
    PROPOSE_SKILLS,
    WRAPUP,
    WAITFORMCPSERVERS,
    REFRESH_MCP_TOOLS_TOOL_NAME,
    ...(names !== "ant" ? [WORKFLOW_TOOL_NAME] : []),
    SCHEDULE_WAKEUP_TOOL_NAME,
    READNOTIFICATIONS,
    PROPOSEGOAL,
    PUBLISH_PLUGIN_TOOL_NAME,
    require("../services/projects/contextFile.js").CONTINUE_IN_PROJECTS_TOOL_NAME,
    require("../services/projects/contextFile.js").CONTINUE_IN_PROJECTS_CONTEXT_TOOL_NAME,
    END_CONVERSATION_TOOL_NAME,
    require("../tools/AppifactReplTool/prompt.js").APPIFACT_REPL_TOOL_NAME,
  ]);
}
//@ chunk-6f6qbsyw.js:11505-11549 placement
/**
 * 外部构建的常驻工具名集合。
 */
var EXTERNAL_ALWAYS_AVAILABLE_TOOLS; // deferred: uses getAlwaysAvailableToolNames of its import cycle while loading; runs once the cycle is complete
var EXTERNAL_ALWAYS_AVAILABLE_SET;
deferInit("chunk-6f6qbsyw.js:11505", () => {
  EXTERNAL_ALWAYS_AVAILABLE_TOOLS = getAlwaysAvailableToolNames("external");
  EXTERNAL_ALWAYS_AVAILABLE_SET = new Set([...EXTERNAL_ALWAYS_AVAILABLE_TOOLS]);
});
//@ chunk-6f6qbsyw.js:11549-11679 placement (2.1.88 match: cleanMessagesForLogging, 1)
function cleanMessagesForLogging(names) {
  return new Set([
    READ,
    WEBSEARCH,
    TODO_WRITE_TOOL_NAME,
    GREP_TOOL_NAME,
    WEBFETCH,
    GLOB_TOOL_NAME,
    ...SHELL_TOOL_NAMES,
    EDIT,
    FILE_WRITE_TOOL_NAME,
    NOTEBOOK_EDIT_TOOL_NAME,
    SKILL,
    STRUCTUREDOUTPUT,
    TOOL_SEARCH_TOOL_NAME,
    ENTER_WORKTREE_TOOL_NAME,
    EXIT_WORKTREE_TOOL_NAME,
    REPL_TOOL_NAME,
    POLL,
    LSP_TOOL_NAME,
    MONITOR,
    TASKSTOP,
    SENDMESSAGE,
    ...(names === "ant" ? [WORKFLOW_TOOL_NAME] : []),
    ARTIFACT_TOOL_NAME,
    ...PLUGIN_DISCOVERY_SEARCH_TOOL_NAMES,
  ]);
}
//@ chunk-6f6qbsyw.js:11679-11736 placement
/**
 * 建议安装类工具与空集合、协调者固定工具引用。
 */
var ONBOARDING_TOOL_NAMES; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
var EXTERNAL_EXTRA_TOOL_NAMES;
var coordinatorPin;
deferInit("chunk-6f6qbsyw.js:11679", () => {
  ONBOARDING_TOOL_NAMES = new Set([
    SUGGESTPLUGININSTALL,
    SUGGESTSKILLS,
    PUSHNOTIFICATION,
    SHOWONBOARDINGROLEPICKER,
  ]);
  EXTERNAL_EXTRA_TOOL_NAMES = new Set([]);
  coordinatorPin = null;
});
//@ chunk-6f6qbsyw.js:11736-11780 placement
/**
 * 是否是协调者固定的那个工具。
 */
function isCoordinatorPinnedTool(isBuiltIn, agentType) {
  return coordinatorPin !== null && isBuiltIn && agentType === coordinatorPin;
}
//@ chunk-6f6qbsyw.js:11780-11881 placement
/**
 * 外部构建的常驻工具集，以及协调者模式下的任务/消息工具与主线程工具集合。
 */
var EXTERNAL_ALWAYS_AVAILABLE_TOOLS_2; // deferred: uses cleanMessagesForLogging of its import cycle while loading; runs once the cycle is complete
var COORDINATOR_TASK_TOOL_NAMES;
var COORDINATOR_MAIN_THREAD_TOOL_NAMES;
deferInit("chunk-6f6qbsyw.js:11780", () => {
  EXTERNAL_ALWAYS_AVAILABLE_TOOLS_2 = cleanMessagesForLogging("external");
  COORDINATOR_TASK_TOOL_NAMES = new Set([
    TASK_CREATE_TOOL_NAME,
    TASK_GET_TOOL_NAME,
    TASK_LIST_TOOL_NAME,
    TASK_UPDATE_TOOL_NAME,
    SENDMESSAGE,
    CRON_CREATE_TOOL_NAME,
    CRON_DELETE_TOOL_NAME,
    CRON_LIST_TOOL_NAME,
  ]);
  COORDINATOR_MAIN_THREAD_TOOL_NAMES = new Set([
    AGENT,
    TASKSTOP,
    SENDMESSAGE,
    STRUCTUREDOUTPUT,
    SKILL,
    READNOTIFICATIONS,
    LISTAGENTS,
    WORKFLOW_TOOL_NAME,
  ]);
});
//@ chunk-6f6qbsyw.js:11881-11961 fingerprint (2.1.88 match: PR_ACTIVITY_TOOL_SUFFIXES, 0.87)
var SUBSCRIBE_PR_ACTIVITY = "subscribe_pr_activity";
var PR_ACTIVITY_TOOL_SUFFIXES = [SUBSCRIBE_PR_ACTIVITY, "unsubscribe_pr_activity"];
var PR_ACTIVITY_MCP_SERVERS = [CLAUDE_CODE_REMOTE, "github"];
//@ chunk-6f6qbsyw.js:11961-12011 file-local
/**
 * 工具名以 subscribe_pr_activity / unsubscribe_pr_activity 结尾。
 */
function isPrActivitySubscriptionTool(name) {
  return PR_ACTIVITY_TOOL_SUFFIXES.some((suffix) => name.endsWith(suffix));
}
//@ chunk-dzw1343q.js:839-862 placement
var BRIEF_ONLY_TOOL_NAMES; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-dzw1343q.js:839", () => {
  BRIEF_ONLY_TOOL_NAMES = new Set([BRIEF_TOOL_NAME, SEND_USER_FILE_TOOL_NAME]);
});
//@ chunk-dzw1343q.js:862-1009 placement
function withoutStaticMcpShadows(pool, shadowed) {
  if (shadowed.length === 0) return pool;
  let mapped = shadowed.map((serverName) => [serverName, getMcpPrefix(serverName)]);
  let filtered = pool.filter(
    (name) => !mapped.some(([serverName, mcpPrefix]) => isToolFromMcpServer(name, serverName, mcpPrefix)),
  );
  return filtered.length === pool.length ? pool : filtered;
}
//@ chunk-dzw1343q.js:1009-1082 placement
function isRemoteCliOwnedTool(tool) {
  return tool.mcpInfo?.cliOwned === true && tool.mcpInfo.serverName === CLAUDE_CODE_REMOTE;
}
//@ chunk-dzw1343q.js:1082-1119 placement
var coordinatorModeModule; // deferred: loads other modules while loading; runs once its import cycle is complete
deferInit("chunk-dzw1343q.js:1082", () => {
  coordinatorModeModule = require("../coordinator/coordinatorMode.js");
});
//@ chunk-dzw1343q.js:1119-1240 placement
function coordinatorExtraToolNames() {
  return (process.env.CLAUDE_CODE_COORDINATOR_EXTRA_TOOLS ?? "")
    .split(",")
    .map((name) => name.trim())
    .filter(Boolean);
}
//@ chunk-dzw1343q.js:1240-1358 placement
function coordinatorMainThreadUsesMcpServer(server, extraToolNames = coordinatorExtraToolNames()) {
  if (isCommsRoledServer(server) || PR_ACTIVITY_MCP_SERVERS.includes(server.name)) return true;
  let mcpPrefix = getMcpPrefix(server.name);
  return extraToolNames.some((extraToolName) => extraToolName.startsWith(mcpPrefix));
}
//@ chunk-dzw1343q.js:1358-1571 placement
/**
 * 协调者模式下过滤工具池：只保留协调者允许的工具与其 MCP 服务，去掉被静态 MCP 覆盖的内置工具。
 */
function applyCoordinatorToolFilter(tools, filter = () => false) {
  let CLAUDE_CODE_BRIEF = env.CLAUDE_CODE_BRIEF;
  let brief = new Set(coordinatorExtraToolNames());
  let isShellVerifiable = isCoordinatorShellVerifiable();
  let any = tools.some(isCoordinatorCommsMcpTool);
  return tools.filter(
    (tool) =>
      COORDINATOR_MAIN_THREAD_TOOL_NAMES.has(tool.name) ||
      (isShellVerifiable && matchesToolName(tool, BASH_TOOL_NAME) && !isMcpTool(tool)) ||
      isPrActivitySubscriptionTool(tool.name) ||
      isRemoteCliOwnedTool(tool) ||
      isCoordinatorCommsMcpTool(tool) ||
      (CLAUDE_CODE_BRIEF && BRIEF_ONLY_TOOL_NAMES.has(tool.name)) ||
      toolMatchesAnyName(tool, brief) ||
      (!any && filter(tool)),
  );
}
//@ chunk-dzw1343q.js:1571-1766 placement (2.1.88 match: mergeAndFilterTools, 0.505)
/**
 * 合并内建与 MCP 工具（按名去重、按权限过滤），MCP/外部工具分区与内建分区各自排序；协调者模式下再按协调者规则过滤。打印模式与 SDK 用它。
 */
function mergeAndFilterTools(initialTools, assembled, mode, extra, filter) {
  let [mcp, builtIn] = partitionAlias(
    getToolNameForPermissionCheck(
      uniqBy(warnMcpToolNameTooLong([...initialTools, ...assembled]), (tool) => tool.name),
      extra,
    ),
    (tool) => isMcpTool(tool) || isHostOnlyNativeTool(tool),
  );
  let tools = [
    ...visibleTools(builtIn).sort(compareToolsByName),
    ...getToolNameForPermissionCheck_4(mcp, extra ?? mcp).sort(compareToolsByName),
  ];
  if (coordinatorModeModule.isCoordinatorMode()) return applyCoordinatorToolFilter(tools, filter);
  return tools;
}
//@ chunk-dzw1343q.js:1766-1848 placement
function stripSoleNonDeniableTool(tools, toolPermissionContext) {
  let tool = tools.length === 1 ? tools[0] : undefined;
  if (tool && isConversationEndToolDenied(toolPermissionContext, tool)) return [];
  return tools;
}
export {
  withoutStaticMcpShadows,
  mergeAndFilterTools,
  stripSoleNonDeniableTool,
  coordinatorExtraToolNames,
  coordinatorMainThreadUsesMcpServer,
  PR_ACTIVITY_MCP_SERVERS,
  EXTERNAL_ALWAYS_AVAILABLE_TOOLS_2,
  EXTERNAL_ALWAYS_AVAILABLE_TOOLS,
  EXTERNAL_ALWAYS_AVAILABLE_SET,
  ONBOARDING_TOOL_NAMES,
  EXTERNAL_EXTRA_TOOL_NAMES,
  isCoordinatorPinnedTool,
  COORDINATOR_TASK_TOOL_NAMES,
  COORDINATOR_MAIN_THREAD_TOOL_NAMES,
  applyCoordinatorToolFilter,
};
