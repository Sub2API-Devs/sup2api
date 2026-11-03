/**
 * utils/toolPool.ts
 *
 * 工具池合并：内建与 MCP 工具去重、按权限过滤、分区排序（协调者模式额外过滤），以及 PR 活动订阅工具名判断
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/utils/toolPool.ts
 * pieces: chunk-0nt1vzp1.js (9), chunk-hg2zbde4.js (8)
 * attribution: placement 15, fingerprint 1, file-local 1
 */
import { BRIEF_TOOL_NAME } from "../tools/BriefTool/prompt.js";
import { SEND_USER_FILE_TOOL_NAME } from "../tools/SendUserFileTool/prompt.js";
import { getMcpPrefix, isToolFromMcpServer } from "../services/mcp/mcpStringUtils.js";
import { CLAUDE_CODE_REMOTE } from "../services/mcp/ccrMetaMcp.js";
import { isCommsRoledServer, isCoordinatorCommsMcpTool } from "../coordinator/coordinatorMcpServers.js";
import { env } from "./env.js";
import {
  isCoordinatorShellVerifiable,
  OFFER_CHROME_SETUP_TOOL_NAME,
  READNOTIFICATIONS,
} from "../tools/ReadNotificationsTool/ReadNotificationsTool.js";
import { toolMatchesName, compareToolsByName } from "../Tool.js";
import { BASH_TOOL_NAME } from "../tools/BashTool/toolName.js";
import { isMcpTool } from "../services/mcp/utils.js";
import { toolMatchesAnyName } from "../services/tools/permissionCheckGuard.js";
import { SS } from "../../vendor/lodash-es/_inlinedHelpers.js";
import {
  getToolNameForPermissionCheck,
  visibleTools,
  getToolNameForPermissionCheck_4,
} from "../services/artifacts/artifactMcpSwap.js";
import { uniqBy } from "./collections.js";
import { warnMcpToolNameTooLong } from "../services/mcp/toolNameLimits.js";
import { isHostOnlyNativeTool } from "../services/api/deferredToolsState.js";
import { isConversationEndToolDenied } from "./permissions/permissions.js";
import { EXITPLANMODE_2 } from "../tools/ExitPlanModeTool/constants.js";
import { ENTER_PLAN_MODE_TOOL_NAME } from "../tools/EnterPlanModeTool/constants.js";
import { MEMORY_TOOL_NAMES } from "../tools/MemoryTool/memoryToolNames.js";
import { ASKUSERQUESTION } from "../tools/AskUserQuestionTool/prompt.js";
import { POLL } from "../tools/PollTool/prompt.js";
import { CONNECTGITHUB } from "../components/ConnectGitHub/constants.js";
import { PROPOSE_SKILLS } from "../tools/ProposeSkillsTool/ProposeSkillsTool.js";
import { WAITFORMCPSERVERS } from "../tools/WaitForMcpServersTool/WaitForMcpServersTool.js";
import { REFRESH_MCP_TOOLS_TOOL_NAME } from "../tools/RefreshMcpToolsTool/RefreshMcpToolsTool.js";
import { WORKFLOW_TOOL_NAME } from "../tools/WorkflowTool/constants.js";
import { SCHEDULE_WAKEUP_TOOL_NAME } from "../tools/ScheduleWakeupTool/prompt.js";
import { PROPOSEGOAL } from "../tools/ProposeGoalTool/ProposeGoalTool.js";
import { PUBLISH_PLUGIN_TOOL_NAME } from "../tools/PublishPluginTool/prompt.js";
import { END_CONVERSATION_TOOL_NAME } from "../tools/EndConversationTool/constants.js";
import { FILE_READ_TOOL_NAME } from "../tools/FileReadTool/constants.js";
import { WEBSEARCH } from "../tools/WebSearchTool/prompt.js";
import { TODO_WRITE_TOOL_NAME } from "../tools/TodoWriteTool/constants.js";
import { GREP_TOOL_NAME } from "../tools/GrepTool/prompt.js";
import { WEBFETCH } from "../tools/WebFetchTool/prompt.js";
import { GLOB_TOOL_NAME } from "../tools/GlobTool/prompt.js";
import { SHELL_TOOL_NAMES } from "./shell/shellToolUtils.js";
import { FILE_EDIT_TOOL_NAME } from "../tools/FileEditTool/constants.js";
import { FILE_WRITE_TOOL_NAME } from "../tools/FileWriteTool/prompt.js";
import { NOTEBOOK_EDIT_TOOL_NAME } from "../tools/NotebookEditTool/constants.js";
import { SKILL } from "../tools/SkillTool/skillToolNames.js";
import { STRUCTUREDOUTPUT } from "../tools/SyntheticOutputTool/SyntheticOutputTool.js";
import { TOOL_SEARCH_TOOL_NAME } from "../tools/ToolSearchTool/prompt.js";
import { ENTER_WORKTREE_TOOL_NAME } from "../tools/EnterWorktreeTool/constants.js";
import { EXIT_WORKTREE_TOOL_NAME } from "../tools/ExitWorktreeTool/constants.js";
import { REPL_TOOL_NAME } from "../tools/REPLTool/constants.js";
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

//@ chunk-0nt1vzp1.js:806-829 placement
var BRIEF_ONLY_TOOL_NAMES = new Set([BRIEF_TOOL_NAME, SEND_USER_FILE_TOOL_NAME]);
//@ chunk-0nt1vzp1.js:829-976 placement
function withoutStaticMcpShadows(o, e) {
  if (e.length === 0) return o;
  let mapped = e.map((m) => [m, getMcpPrefix(m)]);
  let filtered = o.filter((name) => !mapped.some(([s, r]) => isToolFromMcpServer(name, s, r)));
  return filtered.length === o.length ? o : filtered;
}
//@ chunk-0nt1vzp1.js:976-1049 placement
function isRemoteCliOwnedTool(o) {
  return o.mcpInfo?.cliOwned === true && o.mcpInfo.serverName === CLAUDE_CODE_REMOTE;
}
//@ chunk-0nt1vzp1.js:1049-1086 placement
var coordinatorModeModule = require("./chunk-yxywkh50.js");
//@ chunk-0nt1vzp1.js:1086-1207 placement
function coordinatorExtraToolNames() {
  return (process.env.CLAUDE_CODE_COORDINATOR_EXTRA_TOOLS ?? "")
    .split(",")
    .map((o) => o.trim())
    .filter(Boolean);
}
//@ chunk-0nt1vzp1.js:1207-1325 placement
function coordinatorMainThreadUsesMcpServer(o, e = coordinatorExtraToolNames()) {
  if (isCommsRoledServer(o) || PR_ACTIVITY_MCP_SERVERS.includes(o.name)) return true;
  let mcpPrefix = getMcpPrefix(o.name);
  return e.some((n) => n.startsWith(mcpPrefix));
}
//@ chunk-0nt1vzp1.js:1325-1538 placement
/**
 * 协调者模式下过滤工具池：只保留协调者允许的工具与其 MCP 服务，去掉被静态 MCP 覆盖的内置工具。
 */
function applyCoordinatorToolFilter(o, e = () => false) {
  let CLAUDE_CODE_BRIEF = env.CLAUDE_CODE_BRIEF;
  let n = new Set(coordinatorExtraToolNames());
  let m = isCoordinatorShellVerifiable();
  let any = o.some(isCoordinatorCommsMcpTool);
  return o.filter(
    (r) =>
      COORDINATOR_MAIN_THREAD_TOOL_NAMES.has(r.name) ||
      (m && toolMatchesName(r, BASH_TOOL_NAME) && !isMcpTool(r)) ||
      isPrActivitySubscriptionTool(r.name) ||
      isRemoteCliOwnedTool(r) ||
      isCoordinatorCommsMcpTool(r) ||
      (CLAUDE_CODE_BRIEF && BRIEF_ONLY_TOOL_NAMES.has(r.name)) ||
      toolMatchesAnyName(r, n) ||
      (!any && e(r)),
  );
}
//@ chunk-0nt1vzp1.js:1538-1733 placement = mergeAndFilterTools (0.504)
/**
 * 合并内建与 MCP 工具（按名去重、按权限过滤），MCP/外部工具分区与内建分区各自排序；协调者模式下再按协调者规则过滤。打印模式与 SDK 用它。
 */
function mergeAndFilterTools(initialTools, assembled, mode, n, accountMemoryToolGate) {
  let [mcp, builtIn] = SS(
    getToolNameForPermissionCheck(
      uniqBy(warnMcpToolNameTooLong([...initialTools, ...assembled]), (l) => l.name),
      n,
    ),
    (l) => isMcpTool(l) || isHostOnlyNativeTool(l),
  );
  let tools = [
    ...visibleTools(builtIn).sort(compareToolsByName),
    ...getToolNameForPermissionCheck_4(mcp, n ?? mcp).sort(compareToolsByName),
  ];
  if (coordinatorModeModule.isCoordinatorMode())
    return applyCoordinatorToolFilter(tools, accountMemoryToolGate);
  return tools;
}
//@ chunk-0nt1vzp1.js:1733-1815 placement
function stripSoleNonDeniableTool(o, toolPermissionContext) {
  let t = o.length === 1 ? o[0] : undefined;
  if (t && isConversationEndToolDenied(toolPermissionContext, t)) return [];
  return o;
}
//@ chunk-hg2zbde4.js:12967-13279 placement
function getAlwaysAvailableToolNames(e) {
  return new Set([
    EXITPLANMODE_2,
    ENTER_PLAN_MODE_TOOL_NAME,
    ...MEMORY_TOOL_NAMES,
    ASKUSERQUESTION,
    ...(e !== "ant" ? [POLL] : []),
    CONNECTGITHUB,
    OFFER_CHROME_SETUP_TOOL_NAME,
    PROPOSE_SKILLS,
    WAITFORMCPSERVERS,
    REFRESH_MCP_TOOLS_TOOL_NAME,
    ...(e !== "ant" ? [WORKFLOW_TOOL_NAME] : []),
    SCHEDULE_WAKEUP_TOOL_NAME,
    READNOTIFICATIONS,
    PROPOSEGOAL,
    PUBLISH_PLUGIN_TOOL_NAME,
    require("./chunk-kmvx6c21.js").CONTINUE_IN_PROJECTS_TOOL_NAME,
    require("./chunk-kmvx6c21.js").CONTINUE_IN_PROJECTS_CONTEXT_TOOL_NAME,
    END_CONVERSATION_TOOL_NAME,
    require("./chunk-q973gz0n.js").APPIFACT_REPL_TOOL_NAME,
  ]);
}
//@ chunk-hg2zbde4.js:13279-13323 placement
/**
 * 外部构建的常驻工具名集合。
 */
var EXTERNAL_ALWAYS_AVAILABLE_TOOLS = getAlwaysAvailableToolNames("external");
var EXTERNAL_ALWAYS_AVAILABLE_SET = new Set([...EXTERNAL_ALWAYS_AVAILABLE_TOOLS]);
//@ chunk-hg2zbde4.js:13323-13471 placement = cleanMessagesForLogging (1)
function cleanMessagesForLogging(e) {
  return new Set([
    FILE_READ_TOOL_NAME,
    WEBSEARCH,
    TODO_WRITE_TOOL_NAME,
    GREP_TOOL_NAME,
    WEBFETCH,
    GLOB_TOOL_NAME,
    ...SHELL_TOOL_NAMES,
    FILE_EDIT_TOOL_NAME,
    FILE_WRITE_TOOL_NAME,
    NOTEBOOK_EDIT_TOOL_NAME,
    SKILL,
    STRUCTUREDOUTPUT,
    TOOL_SEARCH_TOOL_NAME,
    ENTER_WORKTREE_TOOL_NAME,
    EXIT_WORKTREE_TOOL_NAME,
    REPL_TOOL_NAME,
    ...(e === "ant" ? [POLL] : []),
    LSP_TOOL_NAME,
    MONITOR,
    TASKSTOP,
    SENDMESSAGE,
    ...(e === "ant" ? [WORKFLOW_TOOL_NAME] : []),
    ARTIFACT_TOOL_NAME,
    ...PLUGIN_DISCOVERY_SEARCH_TOOL_NAMES,
  ]);
}
//@ chunk-hg2zbde4.js:13471-13528 placement
/**
 * 建议安装类工具与空集合、协调者固定工具引用。
 */
var ONBOARDING_TOOL_NAMES = new Set([
  SUGGESTPLUGININSTALL,
  SUGGESTSKILLS,
  PUSHNOTIFICATION,
  SHOWONBOARDINGROLEPICKER,
]);
var EXTERNAL_EXTRA_TOOL_NAMES = new Set([]);
var coordinatorPin = null;
//@ chunk-hg2zbde4.js:13528-13572 placement
/**
 * 是否是协调者固定的那个工具。
 */
function isCoordinatorPinnedTool(isBuiltIn, agentType) {
  return coordinatorPin !== null && isBuiltIn && agentType === coordinatorPin;
}
//@ chunk-hg2zbde4.js:13572-13673 placement
/**
 * 外部构建的常驻工具集，以及协调者模式下的任务/消息工具与主线程工具集合。
 */
var EXTERNAL_ALWAYS_AVAILABLE_TOOLS_2 = cleanMessagesForLogging("external");
var COORDINATOR_TASK_TOOL_NAMES = new Set([
  TASK_CREATE_TOOL_NAME,
  TASK_GET_TOOL_NAME,
  TASK_LIST_TOOL_NAME,
  TASK_UPDATE_TOOL_NAME,
  SENDMESSAGE,
  CRON_CREATE_TOOL_NAME,
  CRON_DELETE_TOOL_NAME,
  CRON_LIST_TOOL_NAME,
]);
var COORDINATOR_MAIN_THREAD_TOOL_NAMES = new Set([
  AGENT,
  TASKSTOP,
  SENDMESSAGE,
  STRUCTUREDOUTPUT,
  SKILL,
  READNOTIFICATIONS,
  LISTAGENTS,
  WORKFLOW_TOOL_NAME,
]);
//@ chunk-hg2zbde4.js:13673-13753 fingerprint = PR_ACTIVITY_TOOL_SUFFIXES (0.87)
var SUBSCRIBE_PR_ACTIVITY = "subscribe_pr_activity";
var PR_ACTIVITY_TOOL_SUFFIXES = [SUBSCRIBE_PR_ACTIVITY, "unsubscribe_pr_activity"];
var PR_ACTIVITY_MCP_SERVERS = [CLAUDE_CODE_REMOTE, "github"];
//@ chunk-hg2zbde4.js:13753-13803 file-local
/**
 * 工具名以 subscribe_pr_activity / unsubscribe_pr_activity 结尾。
 */
function isPrActivitySubscriptionTool(name) {
  return PR_ACTIVITY_TOOL_SUFFIXES.some((suffix) => name.endsWith(suffix));
}
export {
  EXTERNAL_ALWAYS_AVAILABLE_TOOLS_2,
  PR_ACTIVITY_MCP_SERVERS,
  EXTERNAL_ALWAYS_AVAILABLE_TOOLS,
  EXTERNAL_ALWAYS_AVAILABLE_SET,
  ONBOARDING_TOOL_NAMES,
  EXTERNAL_EXTRA_TOOL_NAMES,
  isCoordinatorPinnedTool,
  COORDINATOR_TASK_TOOL_NAMES,
  mergeAndFilterTools,
  stripSoleNonDeniableTool,
  withoutStaticMcpShadows,
  applyCoordinatorToolFilter,
  COORDINATOR_MAIN_THREAD_TOOL_NAMES,
  coordinatorExtraToolNames,
  coordinatorMainThreadUsesMcpServer,
};
