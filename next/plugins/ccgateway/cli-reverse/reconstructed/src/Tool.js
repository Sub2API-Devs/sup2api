/**
 * Tool.ts
 *
 * 工具接口的运行时部分：默认属性 TOOL_DEFAULTS、按名/别名查工具（findToolByName、toolMatchesName）、输入容错解析、remoteExecution/backgrounding 取值、getAllBaseTools 注册槽；真正的工具工厂 buildTool（chunk-g54kbxqw#on）目前被切到 _unattributed，混入了两个命令（Skill 别名、typeahead）函数
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/Tool.ts
 * pieces: chunk-2c3jp4kn.js (40)
 * attribution: placement 11, fingerprint 3, layout 25, callgraph-witnessed 1
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { getProactivitySelectorGate, getProactivitySelectorGateEverOn } from "./bootstrap/state.js";
import { isBareMode } from "./utils/envUtils.js";
import { env } from "./utils/env.js";
import { logEvent } from "./services/analytics/index.js";
import { fromEnum } from "./services/analytics/safeMetadata.js";
import { currentMcpClients } from "./services/compact/idleToolResultClearing.js";
import {
  getToolPermissionContext,
  getMainLoopModel,
  getEffortValue,
  getEffortLayerOverride,
  getHelperEffort,
  getThinkingConfig,
} from "./utils/permissions/toolPermissionContext.js";
import { queueGoalOrigin } from "./commands/goal/goal.js";
import { codeModeAccepted } from "./utils/codeMode/accepted.js";
import { isModelAdmittedByAvailableModels } from "./utils/model/defaultModel.js";
import { EVAL_TOOL_NAME, REPL_TOOL_NAME } from "./tools/REPLTool/constants.js";
import { deferInit } from "../runtime/deferred-init.js";

//@ chunk-2c3jp4kn.js:6529-6561 placement
function isProactivityActive() {
  return isAttachmentsEnabled() && getProactivitySelectorGate();
}
//@ chunk-2c3jp4kn.js:6561-6585 placement
function alwaysFalse() {
  return false;
}
//@ chunk-2c3jp4kn.js:6585-6630 placement
function isProactiveLevel(proactivityLevel) {
  return proactivityLevel === "proactive" && isProactivityActive();
}
//@ chunk-2c3jp4kn.js:6630-6663 placement
function wasProactivityEverOn() {
  return isAttachmentsEnabled() && getProactivitySelectorGateEverOn();
}
//@ chunk-2c3jp4kn.js:6663-6724 placement
function isAttachmentsEnabled() {
  return !isBareMode() && !env.CLAUDE_CODE_DISABLE_ATTACHMENTS;
}
//@ chunk-2c3jp4kn.js:6724-6803 placement
function proactivityExclusionReason() {
  if (!isAttachmentsEnabled()) return "session_excluded";
  return getProactivitySelectorGate() ? undefined : "gate_off";
}
//@ chunk-2c3jp4kn.js:6803-6856 placement
function BARE_ATTACHMENTS_REASON() {
  return "bare, or attachments disabled";
}
//@ chunk-2c3jp4kn.js:6856-7029 placement
function logProactivityStartup({ level, source, entryMode, entryModeDecidedByLevel }) {
  logEvent("tengu_proactivity_startup", {
    level: fromEnum(level),
    source: fromEnum(source),
    entry_mode: fromEnum(entryMode),
    entry_mode_decided_by_level: entryModeDecidedByLevel,
  });
}
//@ chunk-2c3jp4kn.js:7029-7092 placement
function currentProactivityLevel({ getProactivityLevel }) {
  if (isProactivityActive()) return getProactivityLevel();
  return;
}
//@ chunk-2c3jp4kn.js:7092-13235 placement
/**
 * 为工具调用构建上下文视图对象：以 getter 透传 agentId、会话、存储、凭证等字段。
 */
function createToolUseContextView(context) {
  let view = {
    get agentId() {
      return context.agentId;
    },
    get session() {
      return context.session;
    },
    get storageV5() {
      return context.storageV5;
    },
    get credentials() {
      return context.credentials;
    },
    get queuedNotificationsRegistry() {
      return context.queuedNotificationsRegistry;
    },
    get messageQueue() {
      return context.messageQueue;
    },
    get taskRegistry() {
      return context.taskRegistry;
    },
    get toolState() {
      return context.toolState;
    },
    runTaskHooks: (part, ...hash) => part(...hash, undefined, context),
    get agentContext() {
      return context.agentContext;
    },
    get hookOrigin() {
      return context.hookOrigin;
    },
    get hookCaller() {
      return context.hookCaller;
    },
    get pluginSteered() {
      return context.pluginSteered;
    },
    get forRemoteExecution() {
      return context.forRemoteExecution;
    },
    get spawnedByWorkflowRunId() {
      return context.spawnedByWorkflowRunId;
    },
    get hookServesModel() {
      return context.hookServesModel;
    },
    get pluginUnnamed() {
      return context.pluginUnnamed;
    },
    get innerCall() {
      return context.innerCall;
    },
    get agentWorktree() {
      return context.agentWorktree;
    },
    get readFileState() {
      return context.readFileState;
    },
    get getFileHistoryState() {
      return context.getFileHistoryState;
    },
    get applyFileHistoryOp() {
      return context.applyFileHistoryOp;
    },
    get dynamicSkillDirTriggers() {
      return context.dynamicSkillDirTriggers;
    },
    get nestedMemoryAttachmentTriggers() {
      return context.nestedMemoryAttachmentTriggers;
    },
    get setArtifactReadVersion() {
      return context.setArtifactReadVersion;
    },
    get getArtifactReadObservation() {
      return context.getArtifactReadObservation;
    },
    get tools() {
      return context.options.tools;
    },
    get isNonInteractiveSession() {
      return context.options.isNonInteractiveSession;
    },
    get hasSpendCap() {
      return context.options.maxBudgetUsd !== undefined;
    },
    get messageClientPlatform() {
      return context.options.messageClientPlatform;
    },
    mcpClients: () => [...currentMcpClients(context)],
    get turnMcpClients() {
      return context.options.mcpClients;
    },
    get isolationLatch() {
      return context.isolationLatch;
    },
    permissions: () => getToolPermissionContext(context),
    get setToolPermissionContext() {
      return context.setToolPermissionContext;
    },
    get appendSystemMessage() {
      return context.appendSystemMessage;
    },
    mainLoopModel: () => context.options.mainLoopModel,
    model: () => getMainLoopModel(context),
    autoCompactWindow: () => context.options.autoCompactWindow,
    contextRoom: () => context.contextRoom,
    effort: () => getEffortValue(context),
    effortLayerOverride: () => getEffortLayerOverride(context.permissionLayers),
    helperEffortFor: (flag) => getHelperEffort(context, flag),
    thinkingConfig: () => getThinkingConfig(context),
    resolverState: () => {
      let { teamContext, agentNameRegistry, tasks, sendMessagePins } = context.getAppState();
      return {
        teamContext,
        agentNameRegistry,
        tasks,
        sendMessagePins,
      };
    },
    setSendMessagePins: (param) =>
      context.setAppState((result) => {
        let value = param(result);
        return value.sendMessagePins === result.sendMessagePins
          ? result
          : {
              ...result,
              sendMessagePins: value.sendMessagePins,
            };
      }),
    get teammateContext() {
      return context.teammateContext;
    },
    get agentLifecycle() {
      return context.agentLifecycle;
    },
    get toolAliases() {
      return context.options.toolAliases;
    },
    proactivitySetting: () => context.getProactivityLevel(),
    get sessionHooksRegistry() {
      return context.sessionHooksRegistry;
    },
    get refreshTools() {
      return context.options.refreshTools;
    },
    get refreshMcpClients() {
      return context.options.refreshMcpClients;
    },
    get stickyBetas() {
      return context.stickyBetas;
    },
    get agentDefinitions() {
      return context.options.agentDefinitions;
    },
    get appendSystemPrompt() {
      return context.options.appendSystemPrompt;
    },
    get systemPromptSnapshot() {
      return context.options.systemPromptSnapshot;
    },
    proactivityLevel: () => currentProactivityLevel(context),
    replBridgeEnabled: () => context.getAppState().replBridgeEnabled,
    todos: {
      get: (key) => context.getAppState().todos[key],
      set: (todoKey, key) =>
        context.setAppState((todoText) => ({
          ...todoText,
          todos: {
            ...todoText.todos,
            [todoKey]: key,
          },
        })),
    },
    markEndedByModel: () =>
      context.setAppState((value) => ({
        ...value,
        endedByModel: true,
      })),
    get persistedToolResultFiles() {
      return context.persistedToolResultFiles;
    },
    artifactRead: {
      getAppState: () => context.getAppState(),
      get permissionLayers() {
        return context.permissionLayers;
      },
      get toolDecisions() {
        return context.toolDecisions;
      },
      get forRemoteExecution() {
        return context.forRemoteExecution;
      },
      get forPromptShellCommand() {
        return context.forPromptShellCommand;
      },
      get permissionModeAtRequest() {
        return context.permissionModeAtRequest;
      },
      get agentContext() {
        return context.agentContext;
      },
      get agentId() {
        return context.agentId;
      },
      get artifactRegistries() {
        return context.artifactRegistries;
      },
      get credentials() {
        return context.credentials;
      },
      get messages() {
        return context.messages;
      },
      get persistedToolResultFiles() {
        return context.persistedToolResultFiles;
      },
      get toolUseId() {
        return context.toolUseId;
      },
      get setArtifactContractTarget() {
        return context.setArtifactContractTarget;
      },
      get setArtifactReadVersion() {
        return context.setArtifactReadVersion;
      },
      get getArtifactReadObservation() {
        return context.getArtifactReadObservation;
      },
      get storageV5() {
        return context.storageV5;
      },
      get options() {
        return {
          isNonInteractiveSession: context.options.isNonInteractiveSession,
          mainLoopModel: context.options.mainLoopModel,
        };
      },
    },
    webBrowser: () => context.getWebBrowser(),
    get setWebBrowserSlice() {
      return context.setWebBrowserSlice;
    },
    shellPermission: {
      getAppState: () => context.getAppState(),
      get permissionLayers() {
        return context.permissionLayers;
      },
      get forRemoteExecution() {
        return context.forRemoteExecution;
      },
      get forPromptShellCommand() {
        return context.forPromptShellCommand;
      },
      get permissionModeAtRequest() {
        return context.permissionModeAtRequest;
      },
      get sessionEnvVars() {
        return context.sessionEnvVars;
      },
      get toolState() {
        return context.toolState;
      },
      get options() {
        return {
          isNonInteractiveSession: context.options.isNonInteractiveSession,
        };
      },
    },
    unlayeredPermissions: () => context.getAppState().toolPermissionContext,
    get sessionEnvVars() {
      return context.sessionEnvVars;
    },
    markPrResolvedThisSession: () => context.markPrResolvedThisSession(),
    get emitToolProgress() {
      return context.emitToolProgress;
    },
    mcpState: () => context.getMcp(),
    get turnStartIndex() {
      return context.turnStartIndex;
    },
    get queryTracking() {
      return context.queryTracking;
    },
    get spawnedBySkill() {
      return context.options.spawnedBySkill;
    },
    get spawnedByForkedSkill() {
      return context.options.spawnedByForkedSkill;
    },
    mcpCommands: () => context.getAppState().mcp.commands,
    tasks: () => context.getAppState().tasks,
    namedAgents: () => ({
      agentNameRegistry: context.getAppState().agentNameRegistry,
    }),
    setTaskKillState: (mainLoopModel) =>
      context.setAppState((scope) => {
        let value = mainLoopModel(scope);
        if (
          value.teamContext === scope.teamContext &&
          value.ultraplanSessionUrl === scope.ultraplanSessionUrl
        )
          return scope;
        return {
          ...scope,
          teamContext: value.teamContext,
          ultraplanSessionUrl: value.ultraplanSessionUrl,
        };
      }),
    messages: () => context.messages,
    inheritedMcpSkillMessages: () => context.inheritedMcpSkillMessages,
    get requestDialog() {
      return context.requestDialog;
    },
    recordQueuedGoalOrigin: (condition, origin) => queueGoalOrigin(context.setAppState, condition, origin),
  };
  if (codeModeAccepted()) {
    Object.defineProperty(view, "primitiveToolGrant", {
      get: () => context.primitiveToolGrant,
      enumerable: true,
    });
    Object.defineProperty(view, "replScriptCall", {
      get: () => context.replScriptCall,
      enumerable: true,
    });
    Object.defineProperty(view, "deliveryTurn", {
      value: () => {
        let appState = context.getAppState();
        return {
          chainId: context.queryTracking?.chainId,
          mode: appState.toolPermissionContext.mode,
          fastMode: appState.fastMode ?? false,
        };
      },
      enumerable: true,
    });
  }
  return view;
}
//@ chunk-2c3jp4kn.js:16625-16887 placement
async function runPermissionCheckWithReentry(
  checkPermission,
  tool,
  toolUseContext,
  assistantMessage,
  toolUseBlock,
  { toolUseId, forceDecision, reentry },
) {
  if (reentry === undefined)
    return checkPermission(tool, toolUseBlock, toolUseContext, assistantMessage, toolUseId, forceDecision);
  let hadExistingDecision = toolUseContext.toolDecisions?.has(toolUseId) === true;
  try {
    return await checkPermission(
      tool,
      toolUseBlock,
      {
        ...toolUseContext,
        permissionPhase: reentry,
      },
      assistantMessage,
      toolUseId,
      forceDecision,
    );
  } finally {
    if (!hadExistingDecision && toolUseContext.toolDecisions !== undefined)
      toolUseContext.toolDecisions.delete(toolUseId);
  }
}
//@ chunk-2c3jp4kn.js:16887-17077 fingerprint (2.1.88 match: getEmptyToolPermissionContext, 0.889)
/**
 * 返回空的 ToolPermissionContext：mode=default，工作目录、allow/deny/ask 规则、MCP 模式覆盖全为空，bypass 不可用。用于测试、ToolSearch 生成描述等不需要真实权限的场合。
 */
var getEmptyToolPermissionContext = () => ({
  mode: "default",
  additionalWorkingDirectories: new Map(),
  alwaysAllowRules: {},
  alwaysDenyRules: {},
  alwaysAskRules: {},
  isBypassPermissionsModeAvailable: false,
  mcpPermissionModeOverrides: {},
});
//@ chunk-2c3jp4kn.js:17077-17206 layout
/**
 * 模型可用性回退时取"主模型"：availabilityFallback.fallbackModel 等于当前 mainLoopModel 时返回 primaryModel，否则返回 mainLoopModel。
 */
function getPrimaryModelForFallback(options) {
  let availabilityFallback = options.availabilityFallback;
  return availabilityFallback !== undefined && availabilityFallback.fallbackModel === options.mainLoopModel
    ? availabilityFallback.primaryModel
    : options.mainLoopModel;
}
//@ chunk-2c3jp4kn.js:17206-17288 layout
/**
 * 在 getPrimaryModelForFallback 的结果上做校验：与当前模型相同或通过 $Ie 检查才采用，否则仍用 mainLoopModel。
 */
function resolveContextPrimaryModel(options) {
  let primaryModelForFallback = getPrimaryModelForFallback(options);
  return primaryModelForFallback === options.mainLoopModel ||
    isModelAdmittedByAvailableModels(primaryModelForFallback)
    ? primaryModelForFallback
    : options.mainLoopModel;
}
//@ chunk-2c3jp4kn.js:17288-17356 fingerprint (2.1.88 match: filterToolProgressMessages, 1)
/**
 * 过滤掉工具进度消息中的 hook_progress 类型，只保留工具自身进度。
 */
function filterToolProgressMessages(progressMessagesForMessage) {
  return progressMessagesForMessage.filter((msg) => msg.data?.type !== "hook_progress");
}
//@ chunk-2c3jp4kn.js:17356-17481 layout
/**
 * 判断工具调用结果对象是否带 afterResultCommitted() 回调（结果写入对话后再执行的副作用）。
 */
function hasAfterResultCommitted(value) {
  return (
    value !== null &&
    typeof value === "object" &&
    "afterResultCommitted" in value &&
    typeof value.afterResultCommitted === "function"
  );
}
//@ chunk-2c3jp4kn.js:17481-17566 layout
/**
 * 结果写入对话后调用其 afterResultCommitted()；skip 为真或没有回调时跳过，异常交给 onError，不向上抛。
 */
function runAfterResultCommitted(result, skip, onError) {
  if (skip || !hasAfterResultCommitted(result)) return;
  try {
    result.afterResultCommitted();
  } catch (error) {
    onError(error);
  }
}
//@ chunk-2c3jp4kn.js:17566-17631 layout
function matchesToolName(tool, name) {
  return tool.name === name || (tool.aliases?.includes(name) ?? false);
}
//@ chunk-2c3jp4kn.js:17631-17685 layout
/**
 * 按 name 的 localeCompare 比较两个工具；工具池组装时内建与 MCP 两个分区各自排序，保证提示缓存前缀稳定。
 */
function compareToolsByName(tool, name) {
  return tool.name.localeCompare(name.name);
}
//@ chunk-2c3jp4kn.js:17685-17692 layout
var baseToolsProvider;
//@ chunk-2c3jp4kn.js:17692-17713 layout
/**
 * 注册 getAllBaseTools 的提供者。tools.ts 顶层执行 umi(getAllBaseTools)，让 Tool.ts 侧（UI、消息渲染）能拿到全部内建工具而不形成循环依赖。
 */
function registerAllBaseToolsProvider(getAllBaseTools) {
  baseToolsProvider = getAllBaseTools;
}
//@ chunk-2c3jp4kn.js:17713-17741 layout
/**
 * 返回已注册的 getAllBaseTools() 结果；未注册时为 undefined。消息渲染、工具活动展示据此按名字查工具定义。
 */
function getAllBaseToolsFromRegistry() {
  return baseToolsProvider?.();
}
//@ chunk-2c3jp4kn.js:17741-17748 layout
var extraToolsProvider;
//@ chunk-2c3jp4kn.js:17748-17769 layout
function setExtraToolsProvider(getFileAndShellTools) {
  extraToolsProvider = getFileAndShellTools;
}
//@ chunk-2c3jp4kn.js:17769-17798 layout
/**
 * 读取额外工具提供者 $l；外部构建中 $l 从未赋值，恒返回 undefined（utils/messages 用 fmi()??[]）。
 */
function getExtraToolsFromProvider() {
  return extraToolsProvider?.();
}
//@ chunk-2c3jp4kn.js:17798-17805 layout
var virtualResultPatcher;
//@ chunk-2c3jp4kn.js:17805-17826 layout
function setVirtualResultPatcher(patcher) {
  virtualResultPatcher = patcher;
}
//@ chunk-2c3jp4kn.js:17826-17861 layout
/**
 * 对 isVirtual 的工具结果消息在 stripForStorage 后追加字段的钩子；外部构建中未注册，恒 undefined。
 */
function patchVirtualToolResult(tool, input) {
  return virtualResultPatcher?.(tool, input);
}
//@ chunk-2c3jp4kn.js:17861-17868 layout
var remoteHookRunnerProvider;
//@ chunk-2c3jp4kn.js:17868-17889 layout
function setRemoteHookRunnerProvider(runner) {
  remoteHookRunnerProvider = runner;
}
//@ chunk-2c3jp4kn.js:17889-17920 layout
/**
 * 读取远程 hook 运行器；外部构建中未注册，恒 undefined。hooks 里用它判断是否在远端执行 hook。
 */
function getRemoteHookRunner(toolUseContext) {
  return remoteHookRunnerProvider?.(toolUseContext);
}
//@ chunk-2c3jp4kn.js:17920-17954 layout
var toolNameIndexCache; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
var toolListsSeenOnce;
deferInit("chunk-2c3jp4kn.js:17920", () => {
  toolNameIndexCache = new WeakMap();
  toolListsSeenOnce = new WeakSet();
});
//@ chunk-2c3jp4kn.js:17954-17998 layout
function isEvalAliasOfRepl(tool, name) {
  return name === EVAL_TOOL_NAME && tool.name === REPL_TOOL_NAME;
}
//@ chunk-2c3jp4kn.js:17998-18178 layout
/**
 * 把工具数组建成"名字/别名 → 工具"的 Map，先出现者优先。
 */
function buildToolNameIndex(tools) {
  let index = new Map();
  for (let tool of tools) {
    let existing = index.get(tool.name);
    if (existing === undefined || isEvalAliasOfRepl(existing, tool.name)) index.set(tool.name, tool);
    if (tool.aliases) {
      for (let alias of tool.aliases) if (!index.has(alias)) index.set(alias, tool);
    }
  }
  return index;
}
//@ chunk-2c3jp4kn.js:18178-18467 callgraph-witnessed (2.1.88 match: findToolByName, 0)
/**
 * 按名字（含别名）在工具数组中找工具。toolAliases 映射先把模型发来的名字换成规范名（递归一次）；同一数组第一次线性查找，第二次起建 WeakMap 索引缓存。
 */
function findToolByName(tools, name, toolAliases) {
  let canonicalName = toolAliases && Object.hasOwn(toolAliases, name) ? toolAliases[name] : undefined;
  if (canonicalName !== undefined && canonicalName !== name) return findToolByName(tools, canonicalName);
  let index = toolNameIndexCache.get(tools);
  if (index) return index.get(name);
  if (toolListsSeenOnce.has(tools)) {
    let toolNameIndex = buildToolNameIndex(tools);
    toolNameIndexCache.set(tools, toolNameIndex);
    return toolNameIndex.get(name);
  }
  toolListsSeenOnce.add(tools);
  let tool = tools.find((tool) => matchesToolName(tool, name));
  if (tool !== undefined && isEvalAliasOfRepl(tool, name))
    return tools.find((tool) => tool.name === name) ?? tool;
  return tool;
}
//@ chunk-2c3jp4kn.js:18467-18566 layout
/**
 * 解析工具输入：有 coerceInput 时先修复输入，再用 inputSchema.safeParse 校验。UI 渲染和任务展示用它容错解析历史输入。
 */
function safeParseToolInput(tool, input) {
  let coerced = tool.coerceInput?.(input) ?? null;
  return tool.inputSchema.safeParse(coerced === null ? input : coerced.input);
}
//@ chunk-2c3jp4kn.js:18566-18604 layout
var REMOTE_EXECUTION_UNSUPPORTED; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-2c3jp4kn.js:18566", () => {
  REMOTE_EXECUTION_UNSUPPORTED = Object.freeze({
    supported: false,
  });
});
//@ chunk-2c3jp4kn.js:18604-18649 layout
/**
 * 返回工具的 remoteExecution 描述，未声明时为 {supported:false}。远程/桥接执行决定工具能否在另一台机器上跑。
 */
function getToolRemoteExecution(tool) {
  return tool.remoteExecution ?? REMOTE_EXECUTION_UNSUPPORTED;
}
//@ chunk-2c3jp4kn.js:18649-18697 layout
/**
 * 返回工具的 backgrounding 声明，默认 "never"。取值 never/self/... 决定工具是否可被转入后台。
 */
function getToolBackgrounding(tool) {
  return tool.backgrounding ?? "never";
}
//@ chunk-2c3jp4kn.js:18697-18863 fingerprint (2.1.88 match: TOOL_DEFAULTS, 0.792)
/**
 * 工具默认属性：isEnabled=true、isConcurrencySafe=false、isReadOnly=false、isDestructive=false、remoteExecution 不支持、toAutoClassifierInput=""、userFacingName=""。buildTool 先铺这一层再叠加工具定义。
 */
var TOOL_DEFAULTS; // deferred: uses REMOTE_EXECUTION_UNSUPPORTED of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-2c3jp4kn.js:18697", () => {
  TOOL_DEFAULTS = {
    isEnabled: () => true,
    isConcurrencySafe: (_input) => false,
    isReadOnly: (_input) => false,
    isDestructive: (_input) => false,
    remoteExecution: REMOTE_EXECUTION_UNSUPPORTED,
    toAutoClassifierInput: (_input) => "",
    userFacingName: (_input) => "",
  };
});
export {
  matchesToolName,
  wasProactivityEverOn,
  safeParseToolInput,
  findToolByName,
  getEmptyToolPermissionContext,
  compareToolsByName,
  getAllBaseToolsFromRegistry,
  alwaysFalse,
  patchVirtualToolResult,
  getExtraToolsFromProvider,
  isProactivityActive,
  proactivityExclusionReason,
  BARE_ATTACHMENTS_REASON,
  hasAfterResultCommitted,
  createToolUseContextView,
  runPermissionCheckWithReentry,
  TOOL_DEFAULTS,
  getToolRemoteExecution,
  getToolBackgrounding,
  runAfterResultCommitted,
  getRemoteHookRunner,
  currentProactivityLevel,
  registerAllBaseToolsProvider,
  filterToolProgressMessages,
  REMOTE_EXECUTION_UNSUPPORTED,
  logProactivityStartup,
  resolveContextPrimaryModel,
  setExtraToolsProvider,
  setVirtualResultPatcher,
  setRemoteHookRunnerProvider,
  isProactiveLevel,
  getPrimaryModelForFallback,
};
