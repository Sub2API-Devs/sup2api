/**
 * tools.ts
 *
 * 内建工具注册表：getAllBaseTools 列出全部内建工具及其注册条件（Bash/Glob/Grep/Task*\/LSP/Worktree/PowerShell/ToolSearch 等）；getTools/assembleToolPool/TOOL_CATALOG 与懒加载工具表大部分在 _unattributed/chunk-kxyd0g16/part-016..018；另混入 /hooks 用的工具名列表和屏幕阅读器环境函数
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/tools.ts
 * pieces: chunk-azz22fvc.js (1), chunk-e6aww6q8.js (2), chunk-kxyd0g16.js (14)
 * attribution: fingerprint 1, placement 5, layout 4, file-local 2, facade-exports 5
 */
import {
  setWizardOperatorToolsEnabled,
  getWizardOperatorToolsEnabled,
  isWorkspaceRestricted,
} from "./bootstrap/state.js";
import { isEssentialTrafficOnly } from "./utils/privacyLevel.js";
import { isPowerShellToolEnabled, isBashAvailable } from "./utils/shell/shellToolUtils.js";
import { qSe } from "./tools/ArtifactTool/actionNames.js";
import { AgentTool } from "./tools/AgentTool/agentToolDefinition.js";
import { BashTool } from "./tools/BashTool/BashTool.js";
import { GlobTool } from "./tools/GlobTool/GlobTool.js";
import { GrepTool } from "./tools/GrepTool/GrepTool.js";
import { getShadowedSearchToolNames, hasEmbeddedSearchTools } from "./utils/embeddedTools.js";
import { ExitPlanModeV2Tool } from "./tools/ExitPlanModeTool/ExitPlanModeV2Tool.js";
import { FileReadTool } from "./tools/FileReadTool/FileReadTool.js";
import { FileEditTool } from "./tools/FileEditTool/FileEditTool.js";
import { FileWriteTool } from "./tools/FileWriteTool/FileWriteTool.js";
import { NotebookEditTool } from "./tools/NotebookEditTool/NotebookEditTool.js";
import { xo } from "./services/feedback/feedbackDrafts.js";
import { WebFetchTool } from "./tools/WebFetchTool/WebFetchTool.js";
import { TodoWriteTool } from "./tools/TodoWriteTool/TodoWriteTool.js";
import { vo } from "./tools/ReportFindingsTool/ReportFindingsTool.js";
import { WebSearchTool } from "./tools/WebSearchTool/WebSearchTool.js";
import { TaskStopTool } from "./tools/TaskStopTool/TaskStopTool.js";
import { AskUserQuestionTool } from "./tools/AskUserQuestionTool/AskUserQuestionTool.js";
import { Zo } from "./tools/SendFeedbackTool/SendFeedbackTool.js";
import { SkillTool } from "./tools/SkillTool/SkillTool.js";
import { EnterPlanModeTool } from "./tools/EnterPlanModeTool/EnterPlanModeTool.js";
import { isTaskToolsEnabled } from "./utils/tasks.js";
import { TaskCreateTool } from "./tools/TaskCreateTool/TaskCreateTool.js";
import { TaskGetTool } from "./tools/TaskGetTool/TaskGetTool.js";
import { TaskUpdateTool } from "./tools/TaskUpdateTool/TaskUpdateTool.js";
import { TaskListTool } from "./tools/TaskListTool/TaskListTool.js";
import { Dqe } from "./coordinator/coordinatorMode.js";
import { LSPTool } from "./tools/LSPTool/LSPTool.js";
import { isWorktreeModeEnabled } from "./utils/worktreeModeEnabled.js";
import { EnterWorktreeTool } from "./tools/EnterWorktreeTool/EnterWorktreeTool.js";
import { ExitWorktreeTool } from "./tools/ExitWorktreeTool/ExitWorktreeTool.js";
import { Vt } from "./tools/OnboardingGuideTool/OnboardingGuideTool.js";
import { ho } from "./tools/ScheduleWakeupTool/ScheduleWakeupTool.js";
import { RolePickerTool } from "./tools/RolePickerTool/RolePickerTool.js";
import { ChromeSetupOfferTool } from "./tools/ChromeSetupOfferTool/ChromeSetupOfferTool.js";
import { Ut } from "./tools/NotificationsTool/NotificationsTool.js";
import { BriefTool } from "./tools/BriefTool/BriefTool.js";
import { ListMcpResourcesTool } from "./tools/ListMcpResourcesTool/ListMcpResourcesTool.js";
import { ReadMcpResourceTool } from "./tools/ReadMcpResourceTool/ReadMcpResourceTool.js";
import { H5 } from "./services/mcp/skillDirectoryResource.js";
import { env } from "./utils/env.js";
import { Dt } from "./tools/RefreshMcpServersTool/RefreshMcpServersTool.js";
import { isToolSearchEnabledOptimistic } from "./utils/toolSearch.js";
import { ToolSearchTool } from "./tools/ToolSearchTool/ToolSearchTool.js";
import {
  WaitForMcpServersTool,
  P6s,
  ftt,
  WAITFORMCPSERVERS,
} from "./tools/WaitForMcpServersTool/WaitForMcpServersTool.js";
import { GetTaskTool } from "./tools/TaskOutputTool/GetTaskTool.js";
import { registerAllBaseToolsProvider, toolMatchesName, compareToolsByName } from "./Tool.js";
import { k1, Uvn, f4 } from "./tools/RefreshMcpToolsTool/RefreshMcpToolsTool.js";
import { getDenyRuleForTool } from "./utils/permissions/permissions.js";
import { G2 } from "./utils/pollEvents.js";
import { isWorkflowsAvailable } from "./utils/workflows/workflowGates.js";
import { filterToolsByDenyRules } from "./utils/permissions/filterToolsByDenyRules.js";
import { STRUCTUREDOUTPUT } from "./tools/SyntheticOutputTool/SyntheticOutputTool.js";
import { BASH_TOOL_NAME } from "./tools/BashTool/toolName.js";
import { REPL_TOOL_NAME } from "./tools/REPLTool/constants.js";
import { toolMatchesAnyName } from "./services/tools/permissionCheckGuard.js";
import { canUseWebFetchAgent } from "./tools/AgentTool/agentToolUtils.js";
import { WEBFETCH } from "./tools/WebFetchTool/prompt.js";
import { pnr } from "./services/tools/batchTools.js";
import { TOOL_SEARCH_TOOL_NAME } from "./tools/ToolSearchTool/prompt.js";
import {
  swapBackFromArtifactsMcp,
  getToolNameForPermissionCheck_4,
  getToolNameForPermissionCheck,
  swapToArtifactsMcp,
} from "./services/artifacts/artifactMcpSwap.js";
import { uniqBy } from "./utils/collections.js";
import { warnMcpToolNameTooLong } from "./services/mcp/toolNameLimits.js";

/**
 * 创建懒加载代理：自有键直接读，其余键第一次访问时才调用工厂生成真实对象。ArtifactTool 用它在工具列表里先放一个轻量"头"，用到时再加载完整实现。
 */
//@ chunk-kxyd0g16.js:152943-153625 placement
function createLazyProxy(e, r) {
  let n,
    s = () => (n ??= r()),
    f = new Set(Reflect.ownKeys(e));
  return new Proxy(e, {
    get(h, y, k) {
      if (f.has(y)) return Reflect.get(h, y, k);
      return typeof y === "symbol" && n === void 0 ? void 0 : Reflect.get(s(), y, k);
    },
    has(h, y) {
      if (f.has(y)) return !0;
      return typeof y === "symbol" && n === void 0 ? !1 : y in s();
    },
    ownKeys() {
      return Reflect.ownKeys(s());
    },
    getOwnPropertyDescriptor(h, y) {
      let k = f.has(y) ? Reflect.getOwnPropertyDescriptor(h, y) : Reflect.getOwnPropertyDescriptor(s(), y);
      return k && { ...k, configurable: !0 };
    },
    set(h, y, k) {
      return (f.delete(y), Reflect.set(s(), y, k));
    },
    defineProperty(h, y, k) {
      return (f.delete(y), Reflect.defineProperty(s(), y, k));
    },
    deleteProperty(h, y) {
      return (f.delete(y), Reflect.deleteProperty(s(), y));
    },
  });
}
//@ chunk-kxyd0g16.js:153625-153648 placement
function KLs() {
  setWizardOperatorToolsEnabled(!0);
}
//@ chunk-kxyd0g16.js:153648-153675 placement
function Jr() {
  return getWizardOperatorToolsEnabled();
}
/**
 * tools.ts 的懒加载工具表（一条 var 语句）：Cron 三件套、SELF_HOSTED_RUNNER_TOOLS、RemoteTrigger、SearchMcpRegistry、SuggestConnectors、ListConnectors、PLUGIN_SKILL_TOOLS、Monitor、SendUserFile、ProposeSkills、ProposeGoal、PublishPlugin、PushNotification、DesignSync、ClaudeDesign（aa：isEssentialTrafficOnly 时 null）、Projects、FetchInboxMessage、EndConversation、SendMessage（Ft）、SendFile（da）、ContinueInProjects、ENABLE_STUB_TOOLS、Poll、ArtifactTool（懒代理）。每个都在自己的 chunk 里，require 时才加载。
 */
//@ chunk-kxyd0g16.js:153675-155165 layout
var CRON_TOOLS = [
    require("./chunk-kyk75gag.js").CronCreateTool,
    require("./chunk-e1hwptaj.js").CronDeleteTool,
    require("./chunk-8985aafb.js").CronListTool,
  ],
  SELF_HOSTED_RUNNER_TOOLS = require("./chunk-3yy90gv7.js").SELF_HOSTED_RUNNER_TOOLS,
  RemoteTriggerTool = require("./chunk-y8ff1x9z.js").RemoteTriggerTool,
  SearchMcpRegistryTool = require("./chunk-1kxhadxb.js").SearchMcpRegistryTool,
  SuggestConnectorsTool = require("./chunk-24nc744j.js").SuggestConnectorsTool,
  ListConnectorsTool = require("./chunk-ry7vktx8.js").ListConnectorsTool,
  PLUGIN_SKILL_TOOLS = require("./chunk-zw5xhxkf.js").PLUGIN_SKILL_TOOLS,
  MonitorTool = require("./chunk-v3rq5m6f.js").MonitorTool,
  SendUserFileTool = require("./chunk-gy7w3kfr.js").SendUserFileTool,
  ProposeSkillsTool = require("./chunk-2rkp9ne9.js").ProposeSkillsTool,
  ProposeGoalTool = require("./chunk-1rwh0063.js").ProposeGoalTool,
  PublishPluginTool = require("./chunk-j15rab2w.js").PublishPluginTool,
  PushNotificationTool = require("./chunk-4rqaac63.js").PushNotificationTool,
  DesignSyncTool = require("./chunk-98n6ge4d.js").DesignSyncTool,
  getDesignTool = () => {
    if (isEssentialTrafficOnly()) return null;
    return require("./chunk-171dhyhe.js").DesignTool;
  },
  ProjectsTool = require("./chunk-eg496hkq.js").ProjectsTool,
  FetchInboxMessageTool = require("./chunk-psktkvhp.js").FetchInboxMessageTool,
  EndConversationTool = require("./chunk-t1kwhq0j.js").EndConversationTool,
  getSendMessageTool = () => require("./chunk-astf3mhy.js").SendMessageTool,
  getSendFileTool = () => require("./chunk-dq968kwq.js").SendFileTool,
  ContinueInProjectsTool = require("./chunk-hbtxm37k.js").ContinueInProjectsTool,
  ContinueInProjectsContextTool = require("./chunk-hbtxm37k.js").ContinueInProjectsContextTool,
  ENABLE_STUB_TOOLS = require("./chunk-tkqbtg0j.js").ENABLE_STUB_TOOLS,
  PollTool = require("./chunk-b5fpmtr5.js").PollTool,
  ArtifactTool = createLazyProxy(
    require("./chunk-avwrs8f9.js").ARTIFACT_TOOL_HEAD,
    () => require("./chunk-2rzz5p5d.js").ArtifactTool,
  );
//@ chunk-kxyd0g16.js:155165-155210 layout
function loadArtifactToolModule() {
  require("./chunk-2rzz5p5d.js");
}
/**
 * tools.ts 懒加载表第二段：ARTIFACT_ADDON_TOOLS（fa）、AppifactRepl、外部构建为 null/[] 的槽位（fn、ha、hn、gn、yn、ga、kn，对应内部构建专有工具）、coordinatorMode 模块（st）、ListAgents、Workflow（先 initBundledWorkflows）、PowerShell（Bt：isPowerShellToolEnabled() 才 require）。
 */
//@ chunk-kxyd0g16.js:155210-155655 file-local
var getArtifactAddonTools = () => require("./chunk-cqgek8qx.js").ARTIFACT_ADDON_TOOLS,
  AppifactReplTool = require("./chunk-tmx5d02z.js").AppifactReplTool,
  fn = null,
  ha = [],
  hn = null,
  WebBrowserTool = null,
  coordinatorModeModule = require("./chunk-yxywkh50.js"),
  SnipTool = null,
  getV2AliasTools = null,
  kn = null,
  ListAgentsTool = require("./chunk-kv9asrky.js").ListAgentsTool,
  WorkflowTool = (() => (
    require("./chunk-p9mapmve.js").initBundledWorkflows(),
    require("./chunk-y1shfdfm.js").WorkflowTool
  ))(),
  getPowerShellToolIfEnabled = () => {
    if (!isPowerShellToolEnabled()) return null;
    return require("./chunk-v0yfsee9.js").PowerShellTool;
  };
/**
 * REPL 工具槽：外部构建恒返回 null，getTools 的简单模式与 REPL 分支因此不生效。
 */
//@ chunk-kxyd0g16.js:155655-155681 layout
function getReplTool() {
  return null;
}
/**
 * getAllBaseTools：当前环境下可能出现的全部内建工具（尚未经 isEnabled 与权限过滤）。固定项有 Agent、ExitPlanMode、Read、Edit、Write、NotebookEdit、WebFetch、TodoWrite、ReportFindings、WebSearch、TaskStop、AskUserQuestion、SendFeedback、Skill、EnterPlanMode、SendMessage、Cron 三件套、ScheduleWakeup、Workflow、MCP 资源工具、WaitForMcpServers 等；条件项：Bash（jd()）、Glob/Grep（未被嵌入式搜索遮蔽）、Task* 四件（isTodoV2Enabled）、LSP（Dqe）、Worktree 两件（YNt）、PowerShell（Bt）、ToolSearch（isToolSearchEnabledOptimistic）、RefreshMcpTools（CLAUDE_CODE_ENABLE_REFRESH_MCP_TOOLS）。
 */
//@ chunk-kxyd0g16.js:155681-156481 facade-exports = getAllBaseTools (0)
function getAllBaseTools() {
  qSe.loadWriters = loadArtifactToolModule;
  let e = getDesignTool(),
    r = getReplTool();
  return [
    AgentTool,
    ...(isBashAvailable() ? [BashTool] : []),
    ...[GlobTool, GrepTool].filter((n) => !getShadowedSearchToolNames().has(n.name)),
    ExitPlanModeV2Tool,
    FileReadTool,
    FileEditTool,
    FileWriteTool,
    ...(getV2AliasTools?.() ?? []).filter((n) => !getShadowedSearchToolNames().has(n.underlyingV1ToolName)),
    NotebookEditTool,
    ...xo,
    WebFetchTool,
    TodoWriteTool,
    vo,
    WebSearchTool,
    TaskStopTool,
    AskUserQuestionTool,
    Zo,
    SkillTool,
    ...(ContinueInProjectsTool ? [ContinueInProjectsTool] : []),
    ...(ContinueInProjectsContextTool ? [ContinueInProjectsContextTool] : []),
    EnterPlanModeTool,
    ...[],
    DesignSyncTool,
    ...(e ? [e] : []),
    ProjectsTool,
    ...(WebBrowserTool ? [WebBrowserTool] : []),
    ...(isTaskToolsEnabled() ? [TaskCreateTool, TaskGetTool, TaskUpdateTool, TaskListTool] : []),
    ...(ArtifactTool ? [ArtifactTool] : []),
    ...getArtifactAddonTools(),
    ...(AppifactReplTool ? [AppifactReplTool] : []),
    ...(hn ? [hn] : []),
    ...ha,
    ...(Dqe() ? [LSPTool] : []),
    ...(isWorktreeModeEnabled() ? [EnterWorktreeTool, ExitWorktreeTool] : []),
    getSendMessageTool(),
    getSendFileTool(),
    ...(ListAgentsTool ? [ListAgentsTool] : []),
    Vt,
    ...(r ? [r] : []),
    ...(fn ? [fn] : []),
    ...(PollTool ? [PollTool] : []),
    WorkflowTool,
    ...CRON_TOOLS,
    ...(Jr() ? SELF_HOSTED_RUNNER_TOOLS : []),
    ho,
    ...(RemoteTriggerTool ? [RemoteTriggerTool] : []),
    ...(SearchMcpRegistryTool ? [SearchMcpRegistryTool] : []),
    ...(SuggestConnectorsTool ? [SuggestConnectorsTool] : []),
    RolePickerTool,
    ChromeSetupOfferTool,
    Ut,
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
    ...(kn ? [kn()] : []),
    ...[],
    ListMcpResourcesTool,
    ReadMcpResourceTool,
    H5,
    ...(env.CLAUDE_CODE_ENABLE_REFRESH_MCP_TOOLS ? [Dt] : []),
    ...(isToolSearchEnabledOptimistic() ? [ToolSearchTool] : []),
    WaitForMcpServersTool,
    GetTaskTool,
  ];
}
//@ chunk-kxyd0g16.js:156481-156489 layout
registerAllBaseToolsProvider(getAllBaseTools);
/**
 * 在工具列表里补上 Poll 与 FetchInboxMessage：两者不在列表中、但 getTools(permissionContext) 结果里有（即已启用且未被拒绝）时追加。
 */
//@ chunk-kxyd0g16.js:156489-156693 facade-exports
function withLateEnabledToolsIfAdvertised(e, r) {
  let n = [];
  if (PollTool !== null && !e.includes(PollTool)) n.push(PollTool);
  if (FetchInboxMessageTool && !e.includes(FetchInboxMessageTool)) n.push(FetchInboxMessageTool);
  if (n.length === 0) return e;
  let s = getTools(r),
    filtered = n.filter((h) => s.includes(h));
  return filtered.length === 0 ? e : [...e, ...filtered];
}
/**
 * 按名字集合过滤工具；集合为 undefined 时原样返回。
 */
//@ chunk-kxyd0g16.js:156693-156759 file-local
function filterToolsByNames(tools, permissionContext) {
  return permissionContext === void 0 ? tools : tools.filter((tool) => permissionContext.has(tool.name));
}
/**
 * getTools(permissionContext, opts)：给定权限上下文下实际可用的内建工具。CLAUDE_CODE_SIMPLE 时只给 Bash/PowerShell/Read/Edit（协调者模式再加 Agent/TaskStop/SendMessage/Workflow）；否则从 getAllBaseTools 去掉 MCP 资源三件与 StructuredOutput，按拒绝规则过滤（Aee），去掉 REPL 内部原语与 WebFetch 子代理冲突的 WebFetch，按 onlyNames 过滤，再按 isEnabled 过滤；嵌入式搜索开启但 Bash 不可用时把 Glob/Grep 补回；工具搜索开启且有 MCP 时追加 WaitForMcpServers。
 */
//@ chunk-kxyd0g16.js:156759-157842 facade-exports
var getTools = (e, r) => {
    if (env.CLAUDE_CODE_SIMPLE && !r?.skipSimpleModeFilter) {
      let S = getReplTool();
      if (S !== null && k1() && !r?.skipReplFilter) {
        let x =
          isWorkspaceRestricted() || (e.restricted === !0 && getDenyRuleForTool(e, S) !== null)
            ? [FileReadTool, FileEditTool, FileWriteTool]
            : [S, FileEditTool, FileWriteTool];
        if (PollTool !== null && G2()) x.push(PollTool);
        if (coordinatorModeModule.isCoordinatorMode())
          x.push(
            AgentTool,
            TaskStopTool,
            getSendMessageTool(),
            ...(isWorkflowsAvailable() ? [WorkflowTool] : []),
          );
        return filterToolsByNames(filterToolsByDenyRules(x, e), r?.onlyNames);
      }
      let R = getPowerShellToolIfEnabled(),
        I = [...(isBashAvailable() ? [BashTool] : []), ...(R ? [R] : []), FileReadTool, FileEditTool];
      if (coordinatorModeModule.isCoordinatorMode())
        I.push(
          AgentTool,
          TaskStopTool,
          getSendMessageTool(),
          ...(isWorkflowsAvailable() ? [WorkflowTool] : []),
        );
      return filterToolsByNames(filterToolsByDenyRules(I, e), r?.onlyNames);
    }
    let n = new Set([ListMcpResourcesTool.name, ReadMcpResourceTool.name, H5.name, STRUCTUREDOUTPUT]),
      filtered = getAllBaseTools().filter((S) => !n.has(S.name)),
      f = filterToolsByDenyRules(filtered, e),
      h = f.some((S) => toolMatchesName(S, BASH_TOOL_NAME)) && BashTool.isEnabled(),
      y = !1;
    if (k1() && !r?.skipReplFilter) {
      if (f.some((R) => toolMatchesName(R, REPL_TOOL_NAME)))
        ((f = f.filter((R) => !toolMatchesAnyName(R, Uvn))), (y = !0));
    }
    if (!r?.skipReplFilter && canUseWebFetchAgent(f, e, { activeAgents: r?.activeAgents }))
      f = f.filter((S) => !toolMatchesName(S, WEBFETCH));
    f = filterToolsByNames(f, r?.onlyNames);
    let mapped = f.map((S) => S.isEnabled()),
      filtered_2 = f.filter((S, R) => mapped[R]);
    if (hasEmbeddedSearchTools() && !h && !y) {
      let S = filterToolsByDenyRules(
        [GlobTool, GrepTool, ...pnr([GrepTool.name, GlobTool.name])].filter((R) => !filtered_2.includes(R)),
        e,
      );
      filtered_2 = [...filtered_2, ...S];
    }
    if (
      (P6s() || ftt()) &&
      !f4(filtered_2) &&
      !filtered_2.some((S) => toolMatchesName(S, TOOL_SEARCH_TOOL_NAME)) &&
      !filtered_2.some((S) => toolMatchesName(S, WAITFORMCPSERVERS))
    )
      filtered_2 = [...filtered_2, ...filterToolsByDenyRules([WaitForMcpServersTool], e)];
    return filterToolsByNames(filtered_2, r?.onlyNames);
  },
  TOOL_POOL_MEMO_TTL_MS = 30000;
/**
 * assembleToolPool(permissionContext, mcpTools, opts)：内建工具（getTools）与 MCP 工具（含机器级 MCP 工具，按名去重、拒绝规则过滤、遮蔽内建的规则处理）各自按名排序后拼接，再按名去重（内建优先）。REPL 与子代理都用它组装工具池。
 */
//@ chunk-kxyd0g16.js:157842-158035 facade-exports = getRuleByContentsForTool (0)
function assembleToolPool(context, tool, behavior) {
  swapBackFromArtifactsMcp();
  let s = getTools(context, behavior),
    f = uniqBy(warnMcpToolNameTooLong([...(behavior?.machineMcpTools ?? []), ...tool]), (k) => k.name),
    h = getToolNameForPermissionCheck_4(
      getToolNameForPermissionCheck(filterToolsByDenyRules(f, context), f),
      f,
    ),
    y = swapToArtifactsMcp(s, h);
  return uniqBy(y.toSorted(compareToolsByName).concat(h.sort(compareToolsByName)), (k) => k.name);
}
/**
 * TOOL_CATALOG：{getAllBaseTools, getTools, assembleToolPool}，挂在 toolUseContext.options.toolCatalog，执行器遇到未知工具时用它给出"可能是哪个工具"的提示。
 */
//@ chunk-kxyd0g16.js:158035-158096 facade-exports
var TOOL_CATALOG = {
  getAllBaseTools: getAllBaseTools,
  getTools: getTools,
  assembleToolPool: assembleToolPool,
};
//@ chunk-e6aww6q8.js:4672012-4672020 placement
var Cpt;
/**
 * 返回文件与 shell 类工具列表（读、写、编辑、Glob、Grep、Bash、PowerShell 等），只构建一次。
 */
//@ chunk-e6aww6q8.js:4672020-4672143 placement
function getFileAndShellTools() {
  if (Cpt) return Cpt;
  let { PowerShellTool: PowerShellTool } = require("./chunk-v0yfsee9.js");
  return (Cpt = [
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
/**
 * require 并返回 PowerShellTool（不检查启用条件）。
 */
//@ chunk-azz22fvc.js:4057-4123 fingerprint = getPowerShellTool (0.524)
function getPowerShellTool() {
  return require("./chunk-v0yfsee9.js").PowerShellTool;
}

export {
  getAllBaseTools,
  getTools,
  assembleToolPool,
  withLateEnabledToolsIfAdvertised,
  TOOL_POOL_MEMO_TTL_MS,
  TOOL_CATALOG,
  KLs,
  getFileAndShellTools,
  getPowerShellTool,
};
