/**
 * tools.ts
 *
 * 内建工具注册表：getAllBaseTools 列出全部内建工具及其注册条件（Bash/Glob/Grep/Task*\/LSP/Worktree/PowerShell/ToolSearch 等）；getTools/assembleToolPool/TOOL_CATALOG 与懒加载工具表大部分在 _unattributed/chunk-kxyd0g16/part-016..018；另混入 /hooks 用的工具名列表和屏幕阅读器环境函数
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/tools.ts
 * pieces: chunk-5xgkngpb.js (3), chunk-fmnbrxwy.js (15)
 * attribution: fingerprint 1, placement 5, layout 4, file-local 2, facade-exports 6
 */
import { FileReadTool } from "./tools/FileReadTool/FileReadTool.js";
import { FileWriteTool } from "./tools/FileWriteTool/FileWriteTool.js";
import { FileEditTool } from "./tools/FileEditTool/FileEditTool.js";
import { GlobTool } from "./tools/GlobTool/GlobTool.js";
import { GrepTool } from "./tools/GrepTool/GrepTool.js";
import { BashTool } from "./tools/BashTool/BashTool.js";
import { NotebookEditTool } from "./tools/NotebookEditTool/NotebookEditTool.js";
import {
  setWizardOperatorToolsEnabled,
  getWizardOperatorToolsEnabled,
  isWorkspaceRestricted,
} from "./bootstrap/state.js";
import { isEssentialTrafficOnly } from "./utils/privacyLevel.js";
import { isPowerShellToolEnabled, isBashAvailable } from "./utils/shell/shellToolUtils.js";
import { codeModeAccepted } from "./utils/codeMode/accepted.js";
import { lazyWritersSlot } from "./tools/ArtifactTool/actionNames.js";
import { AgentTool } from "./tools/AgentTool/agentToolDefinition.js";
import { getShadowedSearchToolNames, hasEmbeddedSearchTools } from "./utils/embeddedTools.js";
import { ExitPlanModeV2Tool } from "./tools/ExitPlanModeTool/ExitPlanModeV2Tool.js";
import { MEMORY_TOOLS } from "./services/feedback/feedbackDrafts.js";
import { WebFetchTool } from "./tools/WebFetchTool/WebFetchTool.js";
import { TodoWriteTool } from "./tools/TodoWriteTool/TodoWriteTool.js";
import { ReportFindingsTool } from "./tools/ReportFindingsTool/ReportFindingsTool.js";
import { WebSearchTool } from "./tools/WebSearchTool/WebSearchTool.js";
import { TaskStopTool } from "./tools/TaskStopTool/TaskStopTool.js";
import { AskUserQuestionTool } from "./tools/AskUserQuestionTool/AskUserQuestionTool.js";
import { SendFeedbackTool } from "./tools/SendFeedbackTool/SendFeedbackTool.js";
import { SkillTool } from "./tools/SkillTool/SkillTool.js";
import { EnterPlanModeTool } from "./tools/EnterPlanModeTool/EnterPlanModeTool.js";
import { isTaskToolsEnabled } from "./utils/tasks.js";
import { TaskCreateTool } from "./tools/TaskCreateTool/TaskCreateTool.js";
import { TaskGetTool } from "./tools/TaskGetTool/TaskGetTool.js";
import { TaskUpdateTool } from "./tools/TaskUpdateTool/TaskUpdateTool.js";
import { TaskListTool } from "./tools/TaskListTool/TaskListTool.js";
import { isCoordinatorEnvSet } from "./coordinator/coordinatorMode.js";
import { LSPTool } from "./tools/LSPTool/LSPTool.js";
import { isWorktreeModeEnabled } from "./utils/worktreeModeEnabled.js";
import { EnterWorktreeTool } from "./tools/EnterWorktreeTool/EnterWorktreeTool.js";
import { ExitWorktreeTool } from "./tools/ExitWorktreeTool/ExitWorktreeTool.js";
import { onboardingGuideTool } from "./tools/OnboardingGuideTool/OnboardingGuideTool.js";
import { ScheduleWakeupTool } from "./tools/ScheduleWakeupTool/ScheduleWakeupTool.js";
import { RolePickerTool } from "./tools/RolePickerTool/RolePickerTool.js";
import { ChromeSetupOfferTool } from "./tools/ChromeSetupOfferTool/ChromeSetupOfferTool.js";
import { WrapUpTool } from "./tools/WrapUpTool/WrapUpTool.js";
import { notificationsTool } from "./tools/NotificationsTool/NotificationsTool.js";
import { readWidgetContextTool } from "./tools/ReadWidgetContextTool/ReadWidgetContextTool.js";
import { BriefTool } from "./tools/BriefTool/BriefTool.js";
import { ListMcpResourcesTool } from "./tools/ListMcpResourcesTool/ListMcpResourcesTool.js";
import { ReadMcpResourceTool } from "./tools/ReadMcpResourceTool/ReadMcpResourceTool.js";
import { listDirectoryResourceTool } from "./services/mcp/skillDirectoryResource.js";
import { env } from "./utils/env.js";
import { RefreshMcpServersTool } from "./tools/RefreshMcpServersTool/RefreshMcpServersTool.js";
import { isToolSearchEnabledOptimistic } from "./utils/toolSearch.js";
import { ToolSearchTool } from "./tools/ToolSearchTool/ToolSearchTool.js";
import {
  WaitForMcpServersTool,
  hasPendingMcpClients,
  isDeclared,
  WAITFORMCPSERVERS,
} from "./tools/WaitForMcpServersTool/WaitForMcpServersTool.js";
import { GetTaskTool } from "./tools/TaskOutputTool/GetTaskTool.js";
import { registerAllBaseToolsProvider, matchesToolName, compareToolsByName } from "./Tool.js";
import { uniqBy } from "./utils/collections.js";
import {
  isCodeModeEnabled,
  CODE_MODE_ONLY_TOOLS,
  willHideCodeModeOnlyTools,
} from "./tools/RefreshMcpToolsTool/RefreshMcpToolsTool.js";
import { getDenyRuleForTool } from "./utils/permissions/permissions.js";
import { isPollEventIngressActive } from "./utils/pollEvents.js";
import { isWorkflowsAvailable } from "./utils/workflows/workflowGates.js";
import { filterToolsByDenyRules } from "./utils/permissions/filterToolsByDenyRules.js";
import { STRUCTUREDOUTPUT } from "./tools/SyntheticOutputTool/SyntheticOutputTool.js";
import { BASH_TOOL_NAME } from "./tools/BashTool/toolName.js";
import { REPL_TOOL_NAME } from "./tools/REPLTool/constants.js";
import { toolMatchesAnyName } from "./services/tools/permissionCheckGuard.js";
import { canUseWebFetchAgent } from "./tools/AgentTool/agentToolUtils.js";
import { WEBFETCH } from "./tools/WebFetchTool/prompt.js";
import { enabledToolsForAliases } from "./services/tools/batchTools.js";
import { TOOL_SEARCH_TOOL_NAME } from "./tools/ToolSearchTool/prompt.js";
import {
  swapBackFromArtifactsMcp,
  getToolNameForPermissionCheck_4,
  getToolNameForPermissionCheck,
  swapToArtifactsMcp,
} from "./services/artifacts/artifactMcpSwap.js";
import { warnMcpToolNameTooLong } from "./services/mcp/toolNameLimits.js";
import { deferInit } from "../runtime/deferred-init.js";

//@ chunk-5xgkngpb.js:3203102-3203201 fingerprint (2.1.88 match: getPowerShellTool, 0.524)
var getPowerShellTool; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-5xgkngpb.js:3203102", () => {
  getPowerShellTool = (() => {
    let cachedTool;
    return () => {
      if (!cachedTool) cachedTool = require("./tools/PowerShellTool/PowerShellTool.js").PowerShellTool;
      return cachedTool;
    };
  })();
});
//@ chunk-5xgkngpb.js:4780615-4780623 placement
/**
 * 文件与 shell 类工具表的缓存（只构建一次）。
 */
var fileAndShellToolsCache;
//@ chunk-5xgkngpb.js:4780623-4780746 placement
/**
 * 返回文件与 shell 类工具列表（读、写、编辑、Glob、Grep、Bash、PowerShell 等），只构建一次。
 */
function getFileAndShellTools() {
  if (fileAndShellToolsCache) return fileAndShellToolsCache;
  let { PowerShellTool } = require("./tools/PowerShellTool/PowerShellTool.js");
  return (fileAndShellToolsCache = [
    FileReadTool,
    FileWriteTool,
    FileEditTool,
    GlobTool,
    GrepTool,
    BashTool,
    PowerShellTool,
    NotebookEditTool,
  ]);
}
//@ chunk-fmnbrxwy.js:167940-168622 placement
/**
 * 创建懒加载代理：自有键直接读，其余键第一次访问时才调用工厂生成真实对象。ArtifactTool 用它在工具列表里先放一个轻量"头"，用到时再加载完整实现。
 */
function createLazyProxy(head, loadTarget) {
  let target;
  let getTarget = () => (target ??= loadTarget());
  let headKeys = new Set(Reflect.ownKeys(head));
  return new Proxy(head, {
    get(proxyTarget, key, receiver) {
      if (headKeys.has(key)) return Reflect.get(proxyTarget, key, receiver);
      return typeof key === "symbol" && target === undefined
        ? undefined
        : Reflect.get(getTarget(), key, receiver);
    },
    has(proxyTarget, key) {
      if (headKeys.has(key)) return true;
      return typeof key === "symbol" && target === undefined ? false : key in getTarget();
    },
    ownKeys() {
      return Reflect.ownKeys(getTarget());
    },
    getOwnPropertyDescriptor(proxyTarget, key) {
      let descriptor = headKeys.has(key)
        ? Reflect.getOwnPropertyDescriptor(proxyTarget, key)
        : Reflect.getOwnPropertyDescriptor(getTarget(), key);
      return (
        descriptor && {
          ...descriptor,
          configurable: true,
        }
      );
    },
    set(proxyTarget, key, value) {
      headKeys.delete(key);
      return Reflect.set(getTarget(), key, value);
    },
    defineProperty(proxyTarget, key, descriptor) {
      headKeys.delete(key);
      return Reflect.defineProperty(getTarget(), key, descriptor);
    },
    deleteProperty(proxyTarget, key) {
      headKeys.delete(key);
      return Reflect.deleteProperty(getTarget(), key);
    },
  });
}
//@ chunk-fmnbrxwy.js:168622-168645 placement
/**
 * 打开向导操作员工具开关。
 */
function enableWizardOperatorTools() {
  setWizardOperatorToolsEnabled(true);
}
//@ chunk-fmnbrxwy.js:168645-168672 placement
function areWizardOperatorToolsEnabled() {
  return getWizardOperatorToolsEnabled();
}
//@ chunk-fmnbrxwy.js:168672-170162 layout
/**
 * tools.ts 的懒加载工具表（一条 var 语句）：Cron 三件套、SELF_HOSTED_RUNNER_TOOLS、RemoteTrigger、SearchMcpRegistry、SuggestConnectors、ListConnectors、PLUGIN_SKILL_TOOLS、Monitor、SendUserFile、ProposeSkills、ProposeGoal、PublishPlugin、PushNotification、DesignSync、ClaudeDesign（aa：isEssentialTrafficOnly 时 null）、Projects、FetchInboxMessage、EndConversation、SendMessage（Ft）、SendFile（da）、ContinueInProjects、ENABLE_STUB_TOOLS、Poll、ArtifactTool（懒代理）。每个都在自己的 chunk 里，require 时才加载。
 */
var CRON_TOOLS; // deferred: loads other modules while loading; runs once its import cycle is complete
var SELF_HOSTED_RUNNER_TOOLS;
var RemoteTriggerTool;
var SearchMcpRegistryTool;
var SuggestConnectorsTool;
var ListConnectorsTool;
var PLUGIN_SKILL_TOOLS;
var MonitorTool;
var SendUserFileTool;
var ProposeSkillsTool;
var ProposeGoalTool;
var PublishPluginTool;
var PushNotificationTool;
var DesignSyncTool;
var getDesignTool;
var ProjectsTool;
var FetchInboxMessageTool;
var EndConversationTool;
var getSendMessageTool;
var getSendFileTool;
var ContinueInProjectsTool;
var ContinueInProjectsContextTool;
var ENABLE_STUB_TOOLS;
var PollTool;
var ArtifactTool;
deferInit("chunk-fmnbrxwy.js:168672", () => {
  CRON_TOOLS = [
    require("./tools/ScheduleCronTool/CronCreateTool.js").CronCreateTool,
    require("./tools/ScheduleCronTool/CronDeleteTool.js").CronDeleteTool,
    require("./tools/ScheduleCronTool/CronListTool.js").CronListTool,
  ];
  SELF_HOSTED_RUNNER_TOOLS =
    require("./tools/SelfHostedRunnerTool/selfHostedRunnerTools.js").SELF_HOSTED_RUNNER_TOOLS;
  RemoteTriggerTool = require("./tools/RemoteTriggerTool/RemoteTriggerTool.js").RemoteTriggerTool;
  SearchMcpRegistryTool =
    require("./tools/SearchMcpRegistryTool/SearchMcpRegistryTool.lazy.js").SearchMcpRegistryTool;
  SuggestConnectorsTool =
    require("./tools/SuggestConnectorsTool/SuggestConnectorsTool.js").SuggestConnectorsTool;
  ListConnectorsTool = require("./tools/ListConnectorsTool/ListConnectorsTool.js").ListConnectorsTool;
  PLUGIN_SKILL_TOOLS = require("./tools/PluginSearchTool/PluginSearchTool.js").PLUGIN_SKILL_TOOLS;
  MonitorTool = require("./tools/MonitorTool/MonitorTool.js").MonitorTool;
  SendUserFileTool = require("./tools/SendUserFileTool/SendUserFileTool.js").SendUserFileTool;
  ProposeSkillsTool = require("./tools/ProposeSkillsTool/ProposeSkillsTool.js").ProposeSkillsTool;
  ProposeGoalTool = require("./tools/ProposeGoalTool/ProposeGoalTool.js").ProposeGoalTool;
  PublishPluginTool = require("./tools/PublishPluginTool/PublishPluginTool.js").PublishPluginTool;
  PushNotificationTool = require("./tools/PushNotificationTool/PushNotificationTool.js").PushNotificationTool;
  DesignSyncTool = require("./services/design/syncTool.js").DesignSyncTool;
  getDesignTool = () => {
    if (isEssentialTrafficOnly()) return null;
    return require("./tools/DesignTool/DesignTool.js").DesignTool;
  };
  ProjectsTool = require("./tools/ProjectsTool/ProjectsTool.js").ProjectsTool;
  FetchInboxMessageTool =
    require("./tools/FetchInboxMessageTool/FetchInboxMessageTool.lazy.js").FetchInboxMessageTool;
  EndConversationTool = require("./tools/EndConversationTool/EndConversationTool.js").EndConversationTool;
  getSendMessageTool = () => require("./tools/SendMessageTool/SendMessageTool.js").SendMessageTool;
  getSendFileTool = () => require("./tools/SendFileTool/SendFileTool.js").SendFileTool;
  ContinueInProjectsTool =
    require("./tools/ContinueInProjectsTool/ContinueInProjectsTool.js").ContinueInProjectsTool;
  ContinueInProjectsContextTool =
    require("./tools/ContinueInProjectsTool/ContinueInProjectsTool.js").ContinueInProjectsContextTool;
  ENABLE_STUB_TOOLS = require("./tools/stubTools/enableStubTools.js").ENABLE_STUB_TOOLS;
  PollTool = require("./tools/PollEventsTool/PollEventsTool.js").PollTool;
  ArtifactTool = createLazyProxy(
    require("./tools/ArtifactTool/ArtifactTool.js").ARTIFACT_TOOL_HEAD,
    () => require("./tools/ArtifactTool/ArtifactTool.js").ArtifactTool,
  );
});
//@ chunk-fmnbrxwy.js:170162-170207 layout
function loadArtifactToolModule() {
  require("./tools/ArtifactTool/ArtifactTool.js");
}
//@ chunk-fmnbrxwy.js:170207-170660 file-local
/**
 * tools.ts 懒加载表第二段：ARTIFACT_ADDON_TOOLS（fa）、AppifactRepl、外部构建为 null/[] 的槽位（fn、ha、hn、gn、yn、ga、kn，对应内部构建专有工具）、coordinatorMode 模块（st）、ListAgents、Workflow（先 initBundledWorkflows）、PowerShell（Bt：isPowerShellToolEnabled() 才 require）。
 */
var getArtifactAddonTools; // deferred: loads other modules while loading; runs once its import cycle is complete
var AppifactReplTool;
var internalExtraToolSlot;
var internalExtraToolList;
var internalExtraToolSlotB;
var WebBrowserTool;
var coordinatorModeModule;
var SnipTool;
var internalToolFactorySlot;
var getV2AliasTools;
var getV2AliasToolsSlot;
var ListAgentsTool;
var WorkflowTool;
var getPowerShellToolIfEnabled;
deferInit("chunk-fmnbrxwy.js:170207", () => {
  getArtifactAddonTools = () => require("./services/artifacts/artifactAddonTools.js").ARTIFACT_ADDON_TOOLS;
  AppifactReplTool = require("./tools/AppifactReplTool/AppifactReplTool.js").AppifactReplTool;
  internalExtraToolSlot = null;
  internalExtraToolList = [];
  internalExtraToolSlotB = null;
  WebBrowserTool = null;
  coordinatorModeModule = require("./coordinator/coordinatorMode.js");
  SnipTool = null;
  internalToolFactorySlot = null;
  getV2AliasTools = null;
  getV2AliasToolsSlot = null;
  ListAgentsTool = require("./tools/ListAgentsTool/ListAgentsTool.js").ListAgentsTool;
  WorkflowTool = (() => {
    require("./services/workflows/bundledWorkflows.js").initBundledWorkflows();
    return require("./tools/WorkflowTool/WorkflowTool.js").WorkflowTool;
  })();
  getPowerShellToolIfEnabled = () => {
    if (!isPowerShellToolEnabled()) return null;
    return require("./tools/PowerShellTool/PowerShellTool.js").PowerShellTool;
  };
});
//@ chunk-fmnbrxwy.js:170660-170776 layout
/**
 * REPL 工具槽：外部构建恒返回 null，getTools 的简单模式与 REPL 分支因此不生效。
 */
function getReplTool() {
  if (codeModeAccepted()) {
    let replModule = require("./tools/REPLTool/EvalTool.lazy.js");
    replModule.registerEvalToolSeams();
    return replModule.EvalTool;
  }
  return null;
}
//@ chunk-fmnbrxwy.js:170776-171596 facade-exports (2.1.88 match: getAllBaseTools, 0)
/**
 * getAllBaseTools：当前环境下可能出现的全部内建工具（尚未经 isEnabled 与权限过滤）。固定项有 Agent、ExitPlanMode、Read、Edit、Write、NotebookEdit、WebFetch、TodoWrite、ReportFindings、WebSearch、TaskStop、AskUserQuestion、SendFeedback、Skill、EnterPlanMode、SendMessage、Cron 三件套、ScheduleWakeup、Workflow、MCP 资源工具、WaitForMcpServers 等；条件项：Bash（jd()）、Glob/Grep（未被嵌入式搜索遮蔽）、Task* 四件（isTodoV2Enabled）、LSP（Dqe）、Worktree 两件（YNt）、PowerShell（Bt）、ToolSearch（isToolSearchEnabledOptimistic）、RefreshMcpTools（CLAUDE_CODE_ENABLE_REFRESH_MCP_TOOLS）。
 */
function getAllBaseTools() {
  lazyWritersSlot.loadWriters = loadArtifactToolModule;
  let designTool = getDesignTool();
  let replTool = getReplTool();
  return [
    AgentTool,
    ...(isBashAvailable() ? [BashTool] : []),
    ...[GlobTool, GrepTool].filter((tool) => !getShadowedSearchToolNames().has(tool.name)),
    ExitPlanModeV2Tool,
    FileReadTool,
    FileEditTool,
    FileWriteTool,
    ...(getV2AliasTools?.() ?? []).filter(
      (aliasTool) => !getShadowedSearchToolNames().has(aliasTool.underlyingV1ToolName),
    ),
    NotebookEditTool,
    ...MEMORY_TOOLS,
    WebFetchTool,
    TodoWriteTool,
    ReportFindingsTool,
    WebSearchTool,
    TaskStopTool,
    AskUserQuestionTool,
    SendFeedbackTool,
    SkillTool,
    ...(ContinueInProjectsTool ? [ContinueInProjectsTool] : []),
    ...(ContinueInProjectsContextTool ? [ContinueInProjectsContextTool] : []),
    EnterPlanModeTool,
    ...[],
    DesignSyncTool,
    ...(designTool ? [designTool] : []),
    ProjectsTool,
    ...(WebBrowserTool ? [WebBrowserTool] : []),
    ...(isTaskToolsEnabled() ? [TaskCreateTool, TaskGetTool, TaskUpdateTool, TaskListTool] : []),
    ...(ArtifactTool ? [ArtifactTool] : []),
    ...getArtifactAddonTools(),
    ...(AppifactReplTool ? [AppifactReplTool] : []),
    ...(internalExtraToolSlotB ? [internalExtraToolSlotB] : []),
    ...internalExtraToolList,
    ...(isCoordinatorEnvSet() ? [LSPTool] : []),
    ...(isWorktreeModeEnabled() ? [EnterWorktreeTool, ExitWorktreeTool] : []),
    getSendMessageTool(),
    getSendFileTool(),
    ...(ListAgentsTool ? [ListAgentsTool] : []),
    onboardingGuideTool,
    ...(replTool ? [replTool] : []),
    ...(internalExtraToolSlot ? [internalExtraToolSlot] : []),
    ...(PollTool ? [PollTool] : []),
    WorkflowTool,
    ...CRON_TOOLS,
    ...(areWizardOperatorToolsEnabled() ? SELF_HOSTED_RUNNER_TOOLS : []),
    ScheduleWakeupTool,
    ...(RemoteTriggerTool ? [RemoteTriggerTool] : []),
    ...(SearchMcpRegistryTool ? [SearchMcpRegistryTool] : []),
    ...(SuggestConnectorsTool ? [SuggestConnectorsTool] : []),
    RolePickerTool,
    ChromeSetupOfferTool,
    WrapUpTool,
    notificationsTool,
    readWidgetContextTool,
    ...ENABLE_STUB_TOOLS,
    ...(ListConnectorsTool ? [ListConnectorsTool] : []),
    ...PLUGIN_SKILL_TOOLS,
    ...(MonitorTool ? [MonitorTool] : []),
    BriefTool,
    SendUserFileTool,
    ProposeSkillsTool,
    ProposeGoalTool,
    PublishPluginTool,
    ...(PushNotificationTool ? [PushNotificationTool] : []),
    ...(FetchInboxMessageTool ? [FetchInboxMessageTool] : []),
    ...(EndConversationTool ? [EndConversationTool] : []),
    ...(getPowerShellToolIfEnabled() ? [getPowerShellToolIfEnabled()] : []),
    ...(SnipTool ? [SnipTool] : []),
    ...(internalToolFactorySlot ? [internalToolFactorySlot] : []),
    ...(getV2AliasToolsSlot ? [getV2AliasToolsSlot()] : []),
    ...[],
    ListMcpResourcesTool,
    ReadMcpResourceTool,
    listDirectoryResourceTool,
    ...(env.CLAUDE_CODE_ENABLE_REFRESH_MCP_TOOLS ? [RefreshMcpServersTool] : []),
    ...(isToolSearchEnabledOptimistic() ? [ToolSearchTool] : []),
    WaitForMcpServersTool,
    GetTaskTool,
  ];
}
//@ chunk-fmnbrxwy.js:171596-171604 layout
// deferred: uses registerAllBaseToolsProvider (./Tool.js) of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-fmnbrxwy.js:171596", () => {
  registerAllBaseToolsProvider(getAllBaseTools);
});
//@ chunk-fmnbrxwy.js:171604-171727 facade-exports
function rebuildStartupToolsForCodeMode(extraTools, toolPermissionContext) {
  let baseNames = new Set(getAllBaseTools().map((tool) => tool.name));
  return uniqBy(
    [...getTools(toolPermissionContext), ...extraTools.filter((tool) => !baseNames.has(tool.name))],
    (tool) => tool.name,
  );
}
//@ chunk-fmnbrxwy.js:171727-171931 facade-exports
/**
 * 在工具列表里补上 Poll 与 FetchInboxMessage：两者不在列表中、但 getTools(permissionContext) 结果里有（即已启用且未被拒绝）时追加。
 */
function withLateEnabledToolsIfAdvertised(tools, toolPermissionContext) {
  let missingLateTools = [];
  if (PollTool !== null && !tools.includes(PollTool)) missingLateTools.push(PollTool);
  if (FetchInboxMessageTool && !tools.includes(FetchInboxMessageTool))
    missingLateTools.push(FetchInboxMessageTool);
  if (missingLateTools.length === 0) return tools;
  let tools_2 = getTools(toolPermissionContext);
  let filtered = missingLateTools.filter((tool) => tools_2.includes(tool));
  return filtered.length === 0 ? tools : [...tools, ...filtered];
}
//@ chunk-fmnbrxwy.js:171931-171997 file-local
/**
 * 按名字集合过滤工具；集合为 undefined 时原样返回。
 */
function filterToolsByNames(tools, permissionContext) {
  return permissionContext === undefined ? tools : tools.filter((tool) => permissionContext.has(tool.name));
}
//@ chunk-fmnbrxwy.js:171997-173075 facade-exports
/**
 * getTools(permissionContext, opts)：给定权限上下文下实际可用的内建工具。CLAUDE_CODE_SIMPLE 时只给 Bash/PowerShell/Read/Edit（协调者模式再加 Agent/TaskStop/SendMessage/Workflow）；否则从 getAllBaseTools 去掉 MCP 资源三件与 StructuredOutput，按拒绝规则过滤（Aee），去掉 REPL 内部原语与 WebFetch 子代理冲突的 WebFetch，按 onlyNames 过滤，再按 isEnabled 过滤；嵌入式搜索开启但 Bash 不可用时把 Glob/Grep 补回；工具搜索开启且有 MCP 时追加 WaitForMcpServers。
 */
var getTools = (toolPermissionContext, options) => {
  if (env.CLAUDE_CODE_SIMPLE && !options?.skipSimpleModeFilter) {
    let replTool = getReplTool();
    if (replTool !== null && isCodeModeEnabled() && !options?.skipReplFilter) {
      let simpleModeTools =
        isWorkspaceRestricted() ||
        (toolPermissionContext.restricted === true &&
          getDenyRuleForTool(toolPermissionContext, replTool) !== null)
          ? [FileReadTool, FileEditTool, FileWriteTool]
          : [replTool, FileEditTool, FileWriteTool];
      if (PollTool !== null && isPollEventIngressActive()) simpleModeTools.push(PollTool);
      if (coordinatorModeModule.isCoordinatorMode())
        simpleModeTools.push(
          AgentTool,
          TaskStopTool,
          getSendMessageTool(),
          ...(isWorkflowsAvailable() ? [WorkflowTool] : []),
        );
      return filterToolsByNames(
        filterToolsByDenyRules(simpleModeTools, toolPermissionContext),
        options?.onlyNames,
      );
    }
    let powerShellToolIfEnabled = getPowerShellToolIfEnabled();
    let shellTools = [
      ...(isBashAvailable() ? [BashTool] : []),
      ...(powerShellToolIfEnabled ? [powerShellToolIfEnabled] : []),
      FileReadTool,
      FileEditTool,
    ];
    if (coordinatorModeModule.isCoordinatorMode())
      shellTools.push(
        AgentTool,
        TaskStopTool,
        getSendMessageTool(),
        ...(isWorkflowsAvailable() ? [WorkflowTool] : []),
      );
    return filterToolsByNames(filterToolsByDenyRules(shellTools, toolPermissionContext), options?.onlyNames);
  }
  let mcpResourceToolNames = new Set([
    ListMcpResourcesTool.name,
    ReadMcpResourceTool.name,
    listDirectoryResourceTool.name,
    STRUCTUREDOUTPUT,
  ]);
  let filtered = getAllBaseTools().filter((tool) => !mcpResourceToolNames.has(tool.name));
  let allowedTools = filterToolsByDenyRules(filtered, toolPermissionContext);
  let hasBashTool =
    allowedTools.some((tool) => matchesToolName(tool, BASH_TOOL_NAME)) && BashTool.isEnabled();
  let replReplacedReadOnly = false;
  if (isCodeModeEnabled() && !options?.skipReplFilter) {
    if (allowedTools.some((tool) => matchesToolName(tool, REPL_TOOL_NAME))) {
      allowedTools = allowedTools.filter((tool) => !toolMatchesAnyName(tool, CODE_MODE_ONLY_TOOLS));
      replReplacedReadOnly = true;
    }
  }
  if (
    !options?.skipReplFilter &&
    canUseWebFetchAgent(allowedTools, toolPermissionContext, {
      activeAgents: options?.activeAgents,
    })
  )
    allowedTools = allowedTools.filter((tool) => !matchesToolName(tool, WEBFETCH));
  allowedTools = filterToolsByNames(allowedTools, options?.onlyNames);
  let mapped = allowedTools.map((tool) => tool.isEnabled());
  let filtered_2 = allowedTools.filter((tool, index) => mapped[index]);
  if (hasEmbeddedSearchTools() && !hasBashTool && !replReplacedReadOnly) {
    let searchTools = filterToolsByDenyRules(
      [GlobTool, GrepTool, ...enabledToolsForAliases([GrepTool.name, GlobTool.name])].filter(
        (tool) => !filtered_2.includes(tool),
      ),
      toolPermissionContext,
    );
    filtered_2 = [...filtered_2, ...searchTools];
  }
  if (
    (hasPendingMcpClients() || isDeclared()) &&
    !willHideCodeModeOnlyTools(filtered_2) &&
    !filtered_2.some((tool) => matchesToolName(tool, TOOL_SEARCH_TOOL_NAME)) &&
    !filtered_2.some((tool) => matchesToolName(tool, WAITFORMCPSERVERS))
  )
    filtered_2 = [...filtered_2, ...filterToolsByDenyRules([WaitForMcpServersTool], toolPermissionContext)];
  return filterToolsByNames(filtered_2, options?.onlyNames);
};
var TOOL_POOL_MEMO_TTL_MS = 30000;
//@ chunk-fmnbrxwy.js:173075-173267 facade-exports (2.1.88 match: getRuleByContentsForTool, 0)
/**
 * assembleToolPool(permissionContext, mcpTools, opts)：内建工具（getTools）与 MCP 工具（含机器级 MCP 工具，按名去重、拒绝规则过滤、遮蔽内建的规则处理）各自按名排序后拼接，再按名去重（内建优先）。REPL 与子代理都用它组装工具池。
 */
function assembleToolPool(context, tool, behavior) {
  swapBackFromArtifactsMcp();
  let tools = getTools(context, behavior);
  let machineTools = uniqBy(
    warnMcpToolNameTooLong([...(behavior?.machineMcpTools ?? []), ...tool]),
    (tool) => tool.name,
  );
  let toolNameForPermissionCheck = getToolNameForPermissionCheck_4(
    getToolNameForPermissionCheck(filterToolsByDenyRules(machineTools, context), machineTools),
    machineTools,
  );
  let pooledTools = swapToArtifactsMcp(tools, toolNameForPermissionCheck);
  return uniqBy(
    pooledTools.toSorted(compareToolsByName).concat(toolNameForPermissionCheck.sort(compareToolsByName)),
    (tool) => tool.name,
  );
}
//@ chunk-fmnbrxwy.js:173267-173328 facade-exports
/**
 * TOOL_CATALOG：{getAllBaseTools, getTools, assembleToolPool}，挂在 toolUseContext.options.toolCatalog，执行器遇到未知工具时用它给出"可能是哪个工具"的提示。
 */
var TOOL_CATALOG = {
  getAllBaseTools,
  getTools,
  assembleToolPool,
};
export {
  rebuildStartupToolsForCodeMode,
  withLateEnabledToolsIfAdvertised,
  TOOL_POOL_MEMO_TTL_MS,
  assembleToolPool,
  TOOL_CATALOG,
  getAllBaseTools,
  getFileAndShellTools,
  getTools,
  getPowerShellTool,
  enableWizardOperatorTools,
};
