/**
 * Tool.ts
 *
 * 工具接口的运行时部分：默认属性 TOOL_DEFAULTS、按名/别名查工具（findToolByName、toolMatchesName）、输入容错解析、remoteExecution/backgrounding 取值、getAllBaseTools 注册槽；真正的工具工厂 buildTool（chunk-g54kbxqw#on）目前被切到 _unattributed，混入了两个命令（Skill 别名、typeahead）函数
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/Tool.ts
 * pieces: chunk-g54kbxqw.js (36)
 * attribution: placement 11, fingerprint 3, layout 21, callgraph-witnessed 1
 */
import { getProactivitySelectorGate, getProactivitySelectorGateEverOn } from "./bootstrap/state.js";
import { isBareMode } from "./utils/envUtils.js";
import { env } from "./utils/env.js";
import { logEvent } from "./services/analytics/index.js";
import { fromEnum } from "./services/analytics/safeMetadata.js";
import { hasClearedToolResultsAfterIdle } from "./services/compact/microCompact.js";
import { currentMcpClients } from "./services/compact/idleToolResultClearing.js";
import {
  getToolPermissionContext,
  getMainLoopModel as getMainLoopModel_2,
  getEffortValue,
  getEffortLayerOverride,
  getHelperEffort,
  getThinkingConfig,
} from "./utils/permissions/toolPermissionContext.js";
import { queueGoalOrigin } from "./commands/goal/goal.js";
import { isModelAdmittedByAvailableModels } from "./utils/model/defaultModel.js";

//@ chunk-g54kbxqw.js:158548-158581 placement
function isProactivityActive() {
  return Hn() && getProactivitySelectorGate();
}
//@ chunk-g54kbxqw.js:158581-158605 placement
function alwaysFalse() {
  return !1;
}
//@ chunk-g54kbxqw.js:158605-158650 placement
function isProactiveLevel(e) {
  return e === "proactive" && isProactivityActive();
}
//@ chunk-g54kbxqw.js:158650-158683 placement
function wasProactivityEverOn() {
  return Hn() && getProactivitySelectorGateEverOn();
}
//@ chunk-g54kbxqw.js:158683-158745 placement
function Hn() {
  return !isBareMode() && !env.CLAUDE_CODE_DISABLE_ATTACHMENTS;
}
//@ chunk-g54kbxqw.js:158745-158825 placement
function proactivityExclusionReason() {
  if (!Hn()) return "session_excluded";
  return getProactivitySelectorGate() ? void 0 : "gate_off";
}
//@ chunk-g54kbxqw.js:158825-158878 placement
function BARE_ATTACHMENTS_REASON() {
  return "bare, or attachments disabled";
}
//@ chunk-g54kbxqw.js:158878-159051 placement
function logProactivityStartup({
  level: level,
  source: source,
  entryMode: entryMode,
  entryModeDecidedByLevel: entryModeDecidedByLevel,
}) {
  logEvent("tengu_proactivity_startup", {
    level: fromEnum(level),
    source: fromEnum(source),
    entry_mode: fromEnum(entryMode),
    entry_mode_decided_by_level: entryModeDecidedByLevel,
  });
}
//@ chunk-g54kbxqw.js:159051-159114 placement
function currentProactivityLevel({ getProactivityLevel: getProactivityLevel }) {
  if (isProactivityActive()) return getProactivityLevel();
  return;
}
/**
 * 为工具调用构建上下文视图对象：以 getter 透传 agentId、会话、存储、凭证等字段。
 */
//@ chunk-g54kbxqw.js:159114-165006 placement
function createToolUseContextView(e) {
  return {
    get agentId() {
      return e.agentId;
    },
    get session() {
      return e.session;
    },
    get storageV5() {
      return e.storageV5;
    },
    get credentials() {
      return e.credentials;
    },
    get queuedNotificationsRegistry() {
      return e.queuedNotificationsRegistry;
    },
    get messageQueue() {
      return e.messageQueue;
    },
    get taskRegistry() {
      return e.taskRegistry;
    },
    get toolState() {
      return e.toolState;
    },
    runTaskHooks: (s, ...r) => s(...r, void 0, e),
    get agentContext() {
      return e.agentContext;
    },
    get hookOrigin() {
      return e.hookOrigin;
    },
    get hookCaller() {
      return e.hookCaller;
    },
    get pluginSteered() {
      return e.pluginSteered;
    },
    get forRemoteExecution() {
      return e.forRemoteExecution;
    },
    get spawnedByWorkflowRunId() {
      return e.spawnedByWorkflowRunId;
    },
    get hookServesModel() {
      return e.hookServesModel;
    },
    get pluginUnnamed() {
      return e.pluginUnnamed;
    },
    get innerCall() {
      return e.innerCall;
    },
    get agentWorktree() {
      return e.agentWorktree;
    },
    get readFileState() {
      return e.readFileState;
    },
    get getFileHistoryState() {
      return e.getFileHistoryState;
    },
    get applyFileHistoryOp() {
      return e.applyFileHistoryOp;
    },
    get dynamicSkillDirTriggers() {
      return e.dynamicSkillDirTriggers;
    },
    get nestedMemoryAttachmentTriggers() {
      return e.nestedMemoryAttachmentTriggers;
    },
    get dedupUnchangedReads() {
      return e.dedupUnchangedReads === !1 ||
        hasClearedToolResultsAfterIdle(e.messages, e.options.mainLoopModel, void 0, e.session)
        ? !1
        : void 0;
    },
    get setArtifactReadVersion() {
      return e.setArtifactReadVersion;
    },
    get getArtifactReadObservation() {
      return e.getArtifactReadObservation;
    },
    get tools() {
      return e.options.tools;
    },
    get isNonInteractiveSession() {
      return e.options.isNonInteractiveSession;
    },
    get hasSpendCap() {
      return e.options.maxBudgetUsd !== void 0;
    },
    get messageClientPlatform() {
      return e.options.messageClientPlatform;
    },
    mcpClients: () => [...currentMcpClients(e)],
    get turnMcpClients() {
      return e.options.mcpClients;
    },
    get isolationLatch() {
      return e.isolationLatch;
    },
    permissions: () => getToolPermissionContext(e),
    get setToolPermissionContext() {
      return e.setToolPermissionContext;
    },
    get appendSystemMessage() {
      return e.appendSystemMessage;
    },
    mainLoopModel: () => e.options.mainLoopModel,
    model: () => getMainLoopModel_2(e),
    autoCompactWindow: () => e.options.autoCompactWindow,
    contextRoom: () => e.contextRoom,
    effort: () => getEffortValue(e),
    effortLayerOverride: () => getEffortLayerOverride(e.permissionLayers),
    helperEffortFor: (s) => getHelperEffort(e, s),
    thinkingConfig: () => getThinkingConfig(e),
    resolverState: () => {
      let {
        teamContext: teamContext,
        agentNameRegistry: agentNameRegistry,
        tasks: tasks,
        sendMessagePins: sendMessagePins,
      } = e.getAppState();
      return {
        teamContext: teamContext,
        agentNameRegistry: agentNameRegistry,
        tasks: tasks,
        sendMessagePins: sendMessagePins,
      };
    },
    setSendMessagePins: (s) =>
      e.setAppState((r) => {
        let h = s(r);
        return h.sendMessagePins === r.sendMessagePins ? r : { ...r, sendMessagePins: h.sendMessagePins };
      }),
    get teammateContext() {
      return e.teammateContext;
    },
    get agentLifecycle() {
      return e.agentLifecycle;
    },
    get toolAliases() {
      return e.options.toolAliases;
    },
    proactivitySetting: () => e.getProactivityLevel(),
    get sessionHooksRegistry() {
      return e.sessionHooksRegistry;
    },
    get refreshTools() {
      return e.options.refreshTools;
    },
    get refreshMcpClients() {
      return e.options.refreshMcpClients;
    },
    get stickyBetas() {
      return e.stickyBetas;
    },
    get agentDefinitions() {
      return e.options.agentDefinitions;
    },
    get appendSystemPrompt() {
      return e.options.appendSystemPrompt;
    },
    get systemPromptSnapshot() {
      return e.options.systemPromptSnapshot;
    },
    proactivityLevel: () => currentProactivityLevel(e),
    replBridgeEnabled: () => e.getAppState().replBridgeEnabled,
    todos: {
      get: (s) => e.getAppState().todos[s],
      set: (s, r) => e.setAppState((h) => ({ ...h, todos: { ...h.todos, [s]: r } })),
    },
    markEndedByModel: () => e.setAppState((s) => ({ ...s, endedByModel: !0 })),
    get persistedToolResultFiles() {
      return e.persistedToolResultFiles;
    },
    artifactRead: {
      getAppState: () => e.getAppState(),
      get permissionLayers() {
        return e.permissionLayers;
      },
      get toolDecisions() {
        return e.toolDecisions;
      },
      get forRemoteExecution() {
        return e.forRemoteExecution;
      },
      get forPromptShellCommand() {
        return e.forPromptShellCommand;
      },
      get permissionModeAtRequest() {
        return e.permissionModeAtRequest;
      },
      get agentContext() {
        return e.agentContext;
      },
      get agentId() {
        return e.agentId;
      },
      get artifactRegistries() {
        return e.artifactRegistries;
      },
      get credentials() {
        return e.credentials;
      },
      get messages() {
        return e.messages;
      },
      get persistedToolResultFiles() {
        return e.persistedToolResultFiles;
      },
      get toolUseId() {
        return e.toolUseId;
      },
      get setArtifactContractTarget() {
        return e.setArtifactContractTarget;
      },
      get setArtifactReadVersion() {
        return e.setArtifactReadVersion;
      },
      get getArtifactReadObservation() {
        return e.getArtifactReadObservation;
      },
      get storageV5() {
        return e.storageV5;
      },
      get options() {
        return {
          isNonInteractiveSession: e.options.isNonInteractiveSession,
          mainLoopModel: e.options.mainLoopModel,
        };
      },
    },
    webBrowser: () => e.getWebBrowser(),
    get setWebBrowserSlice() {
      return e.setWebBrowserSlice;
    },
    shellPermission: {
      getAppState: () => e.getAppState(),
      get permissionLayers() {
        return e.permissionLayers;
      },
      get forRemoteExecution() {
        return e.forRemoteExecution;
      },
      get forPromptShellCommand() {
        return e.forPromptShellCommand;
      },
      get permissionModeAtRequest() {
        return e.permissionModeAtRequest;
      },
      get sessionEnvVars() {
        return e.sessionEnvVars;
      },
      get toolState() {
        return e.toolState;
      },
      get options() {
        return { isNonInteractiveSession: e.options.isNonInteractiveSession };
      },
    },
    unlayeredPermissions: () => e.getAppState().toolPermissionContext,
    get sessionEnvVars() {
      return e.sessionEnvVars;
    },
    markPrResolvedThisSession: () => e.markPrResolvedThisSession(),
    get emitToolProgress() {
      return e.emitToolProgress;
    },
    mcpState: () => e.getMcp(),
    get turnStartIndex() {
      return e.turnStartIndex;
    },
    get queryTracking() {
      return e.queryTracking;
    },
    get spawnedBySkill() {
      return e.options.spawnedBySkill;
    },
    get spawnedByForkedSkill() {
      return e.options.spawnedByForkedSkill;
    },
    mcpCommands: () => e.getAppState().mcp.commands,
    tasks: () => e.getAppState().tasks,
    namedAgents: () => ({ agentNameRegistry: e.getAppState().agentNameRegistry }),
    setTaskKillState: (s) =>
      e.setAppState((r) => {
        let h = s(r);
        if (h.teamContext === r.teamContext && h.ultraplanSessionUrl === r.ultraplanSessionUrl) return r;
        return { ...r, teamContext: h.teamContext, ultraplanSessionUrl: h.ultraplanSessionUrl };
      }),
    messages: () => e.messages,
    inheritedMcpSkillMessages: () => e.inheritedMcpSkillMessages,
    get requestDialog() {
      return e.requestDialog;
    },
    recordQueuedGoalOrigin: (s, r) => queueGoalOrigin(e.setAppState, s, r),
  };
}
//@ chunk-g54kbxqw.js:165006-165268 placement
async function runPermissionCheckWithReentry(
  e,
  n,
  s,
  r,
  h,
  { toolUseId: toolUseId, forceDecision: forceDecision, reentry: reentry },
) {
  if (reentry === void 0) return e(n, h, s, r, toolUseId, forceDecision);
  let R = s.toolDecisions?.has(toolUseId) === !0;
  try {
    return await e(n, h, { ...s, permissionPhase: reentry }, r, toolUseId, forceDecision);
  } finally {
    if (!R && s.toolDecisions !== void 0) s.toolDecisions.delete(toolUseId);
  }
}
/**
 * 返回空的 ToolPermissionContext：mode=default，工作目录、allow/deny/ask 规则、MCP 模式覆盖全为空，bypass 不可用。用于测试、ToolSearch 生成描述等不需要真实权限的场合。
 */
//@ chunk-g54kbxqw.js:165268-165458 fingerprint = getEmptyToolPermissionContext (0.888)
var getEmptyToolPermissionContext = () => ({
  mode: "default",
  additionalWorkingDirectories: new Map(),
  alwaysAllowRules: {},
  alwaysDenyRules: {},
  alwaysAskRules: {},
  isBypassPermissionsModeAvailable: !1,
  mcpPermissionModeOverrides: {},
});
/**
 * 模型可用性回退时取"主模型"：availabilityFallback.fallbackModel 等于当前 mainLoopModel 时返回 primaryModel，否则返回 mainLoopModel。
 */
//@ chunk-g54kbxqw.js:165458-165587 layout
function getPrimaryModelForFallback(e) {
  let availabilityFallback = e.availabilityFallback;
  return availabilityFallback !== void 0 && availabilityFallback.fallbackModel === e.mainLoopModel
    ? availabilityFallback.primaryModel
    : e.mainLoopModel;
}
/**
 * 在 getPrimaryModelForFallback 的结果上做校验：与当前模型相同或通过 $Ie 检查才采用，否则仍用 mainLoopModel。
 */
//@ chunk-g54kbxqw.js:165587-165669 layout
function resolveContextPrimaryModel(e) {
  let n = getPrimaryModelForFallback(e);
  return n === e.mainLoopModel || isModelAdmittedByAvailableModels(n) ? n : e.mainLoopModel;
}
/**
 * 过滤掉工具进度消息中的 hook_progress 类型，只保留工具自身进度。
 */
//@ chunk-g54kbxqw.js:165669-165737 fingerprint = filterToolProgressMessages (1)
function filterToolProgressMessages(progressMessagesForMessage) {
  return progressMessagesForMessage.filter((msg) => msg.data?.type !== "hook_progress");
}
/**
 * 判断工具调用结果对象是否带 afterResultCommitted() 回调（结果写入对话后再执行的副作用）。
 */
//@ chunk-g54kbxqw.js:165737-165862 layout
function hasAfterResultCommitted(e) {
  return (
    e !== null &&
    typeof e === "object" &&
    "afterResultCommitted" in e &&
    typeof e.afterResultCommitted === "function"
  );
}
/**
 * 结果写入对话后调用其 afterResultCommitted()；skip 为真或没有回调时跳过，异常交给 onError，不向上抛。
 */
//@ chunk-g54kbxqw.js:165862-165947 layout
function runAfterResultCommitted(result, skip, onError) {
  if (skip || !hasAfterResultCommitted(result)) return;
  try {
    result.afterResultCommitted();
  } catch (error) {
    onError(error);
  }
}
/**
 * 工具名匹配：name 相等或在 aliases 里（旧版 toolMatchesName）。全项目约 70 个模块用它按名字判断工具。
 */
//@ chunk-g54kbxqw.js:165947-166012 layout
function toolMatchesName(tool, name) {
  return tool.name === name || (tool.aliases?.includes(name) ?? !1);
}
/**
 * 按 name 的 localeCompare 比较两个工具；工具池组装时内建与 MCP 两个分区各自排序，保证提示缓存前缀稳定。
 */
//@ chunk-g54kbxqw.js:166012-166066 layout
function compareToolsByName(e, n) {
  return e.name.localeCompare(n.name);
}
//@ chunk-g54kbxqw.js:166066-166073 layout
var getAllBaseToolsProvider;
/**
 * 注册 getAllBaseTools 的提供者。tools.ts 顶层执行 umi(getAllBaseTools)，让 Tool.ts 侧（UI、消息渲染）能拿到全部内建工具而不形成循环依赖。
 */
//@ chunk-g54kbxqw.js:166073-166094 layout
function registerAllBaseToolsProvider(e) {
  getAllBaseToolsProvider = e;
}
/**
 * 返回已注册的 getAllBaseTools() 结果；未注册时为 undefined。消息渲染、工具活动展示据此按名字查工具定义。
 */
//@ chunk-g54kbxqw.js:166094-166122 layout
function getAllBaseToolsFromRegistry() {
  return getAllBaseToolsProvider?.();
}
//@ chunk-g54kbxqw.js:166122-166129 layout
var extraToolsProvider;
/**
 * 读取额外工具提供者 $l；外部构建中 $l 从未赋值，恒返回 undefined（utils/messages 用 fmi()??[]）。
 */
//@ chunk-g54kbxqw.js:166129-166158 layout
function getExtraToolsFromProvider() {
  return extraToolsProvider?.();
}
//@ chunk-g54kbxqw.js:166158-166165 layout
var virtualResultPatcher;
/**
 * 对 isVirtual 的工具结果消息在 stripForStorage 后追加字段的钩子；外部构建中未注册，恒 undefined。
 */
//@ chunk-g54kbxqw.js:166165-166200 layout
function patchVirtualToolResult(e, n) {
  return virtualResultPatcher?.(e, n);
}
//@ chunk-g54kbxqw.js:166200-166207 layout
var remoteHookRunnerProvider;
/**
 * 读取远程 hook 运行器；外部构建中未注册，恒 undefined。hooks 里用它判断是否在远端执行 hook。
 */
//@ chunk-g54kbxqw.js:166207-166238 layout
function getRemoteHookRunner(e) {
  return remoteHookRunnerProvider?.(e);
}
//@ chunk-g54kbxqw.js:166238-166272 layout
var toolNameIndexCache = new WeakMap(),
  toolListsSeenOnce = new WeakSet();
/**
 * 把工具数组建成"名字/别名 → 工具"的 Map，先出现者优先。
 */
//@ chunk-g54kbxqw.js:166272-166430 layout
function buildToolNameIndex(e) {
  let n = new Map();
  for (let s of e) {
    if (n.get(s.name) === void 0) n.set(s.name, s);
    if (s.aliases) {
      for (let aliase of s.aliases) if (!n.has(aliase)) n.set(aliase, s);
    }
  }
  return n;
}
/**
 * 按名字（含别名）在工具数组中找工具。toolAliases 映射先把模型发来的名字换成规范名（递归一次）；同一数组第一次线性查找，第二次起建 WeakMap 索引缓存。
 */
//@ chunk-g54kbxqw.js:166430-166654 callgraph-witnessed = findToolByName (0)
function findToolByName(tools, name, toolAliases) {
  let r = toolAliases && Object.hasOwn(toolAliases, name) ? toolAliases[name] : void 0;
  if (r !== void 0 && r !== name) return findToolByName(tools, r);
  let h = toolNameIndexCache.get(tools);
  if (h) return h.get(name);
  if (toolListsSeenOnce.has(tools)) {
    let k = buildToolNameIndex(tools);
    return (toolNameIndexCache.set(tools, k), k.get(name));
  }
  return (toolListsSeenOnce.add(tools), tools.find((k) => toolMatchesName(k, name)));
}
/**
 * 解析工具输入：有 coerceInput 时先修复输入，再用 inputSchema.safeParse 校验。UI 渲染和任务展示用它容错解析历史输入。
 */
//@ chunk-g54kbxqw.js:166654-166753 layout
function safeParseToolInput(tool, input) {
  let s = tool.coerceInput?.(input) ?? null;
  return tool.inputSchema.safeParse(s === null ? input : s.input);
}
//@ chunk-g54kbxqw.js:166753-166791 layout
var REMOTE_EXECUTION_UNSUPPORTED = Object.freeze({ supported: !1 });
/**
 * 返回工具的 remoteExecution 描述，未声明时为 {supported:false}。远程/桥接执行决定工具能否在另一台机器上跑。
 */
//@ chunk-g54kbxqw.js:166791-166836 layout
function getToolRemoteExecution(e) {
  return e.remoteExecution ?? REMOTE_EXECUTION_UNSUPPORTED;
}
/**
 * 返回工具的 backgrounding 声明，默认 "never"。取值 never/self/... 决定工具是否可被转入后台。
 */
//@ chunk-g54kbxqw.js:166836-166884 layout
function getToolBackgrounding(e) {
  return e.backgrounding ?? "never";
}
/**
 * 工具默认属性：isEnabled=true、isConcurrencySafe=false、isReadOnly=false、isDestructive=false、remoteExecution 不支持、toAutoClassifierInput=""、userFacingName=""。buildTool 先铺这一层再叠加工具定义。
 */
//@ chunk-g54kbxqw.js:166884-167050 fingerprint = TOOL_DEFAULTS (0.792)
var TOOL_DEFAULTS = {
  isEnabled: () => !0,
  isConcurrencySafe: (e) => !1,
  isReadOnly: (e) => !1,
  isDestructive: (e) => !1,
  remoteExecution: REMOTE_EXECUTION_UNSUPPORTED,
  toAutoClassifierInput: (e) => "",
  userFacingName: (e) => "",
};

export {
  toolMatchesName,
  findToolByName,
  patchVirtualToolResult,
  getExtraToolsFromProvider,
  isProactivityActive,
  wasProactivityEverOn,
  compareToolsByName,
  safeParseToolInput,
  getEmptyToolPermissionContext,
  alwaysFalse,
  getAllBaseToolsFromRegistry,
  filterToolProgressMessages,
  logProactivityStartup,
  getPrimaryModelForFallback,
  createToolUseContextView,
  currentProactivityLevel,
  getToolRemoteExecution,
  resolveContextPrimaryModel,
  getRemoteHookRunner,
  REMOTE_EXECUTION_UNSUPPORTED,
  hasAfterResultCommitted,
  registerAllBaseToolsProvider,
  runAfterResultCommitted,
  getToolBackgrounding,
  runPermissionCheckWithReentry,
  TOOL_DEFAULTS,
  isProactiveLevel,
  proactivityExclusionReason,
  BARE_ATTACHMENTS_REASON,
};
