/**
 * utils/forkedAgent.ts
 *
 * 派生（fork）子代理的基础设施：缓存安全参数、隔离的子代理 ToolUseContext、fork skill 的上下文准备、runForkedAgent 查询循环与遥测
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/utils/forkedAgent.ts
 * pieces: chunk-5xgkngpb.js (29)
 * attribution: placement 8, layout 8, facade-exports 11, fingerprint 2
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { randomUUID } from "crypto";
import { isAdvisorToolEnabled, resolveAdvisorModel } from "./advisor.js";
import { createUserMessage, getLastAssistantMessage, extractTextContent_2 } from "./messages.js";
import { getUserSpecifiedModelSetting } from "./model/smallFastModel.js";
import { isModeDependentModelSetting } from "./model/planModeModel.js";
import { strip1mSuffix } from "./model/modelIds.js";
import { SessionRootSlot } from "../bootstrap/sessionSlices.js";
import {
  getRootSession,
  getLastMainThreadCacheTtlMs,
  getLastMainThreadCacheRenewedAt,
  getInvokedSkills,
  addInvokedSkill,
  getMainThreadAgentType,
  getStickyBetas,
} from "../bootstrap/state.js";
import { getMainLoopModel } from "./model/model.js";
import { idleCompactionSlot } from "../services/compact/idleCompaction.js";
import {
  checkCommandSyncedAccess,
  isDefined,
  logSyncedCommandRefused,
  resolveSkillGitRoot,
} from "./claudeAiSync/syncedSkillAccess.js";
import { isSyncedSkill, isKilledHostCatalogSkill, notifySetupGuideLoaded } from "./commandPredicates.js";
import { refreshVetoAndRead } from "./claudeAiSync/skillsSync.js";
import { TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS } from "./errors.js";
import { isShippedSkillExecutionBlocked } from "../skills/bundledSkills.js";
import { excludeWebFetchAgent } from "../tools/WebFetchTool/harnessNotes.js";
import { loadListedAgentDefinition } from "../tools/AgentTool/loadAgentsDir.js";
import { applySkillPromptHooks } from "../plugins/functionHooks/skillPromptHooks.js";
import { splitRuleList } from "./permissions/disallowedToolsFlag.js";
import { armedAllowedToolsOf } from "./permissions/permissionsLoader.js";
import { slashTestPattern } from "./attributionFileClasses.js";
import { getBareCommandNameUnlessSynced } from "../commands.js";
import { getCwdOrNull } from "./cwd.js";
import {
  withCommandRuleOverrides,
  getToolPermissionContext,
  getPickedEffortModel,
  getMainLoopModel as getMainLoopModel_2,
} from "./permissions/toolPermissionContext.js";
import { logForDebugging } from "./debug.js";
import { createRemoteFileState, READ_FILE_STATE_CACHE_SIZE } from "./remoteFileState.js";
import { isSkillShownToModel } from "../skills/skillSources.js";
import { toArray_2 } from "./generators.js";
import { withWebFetchToolForAgent, hasToolRuleFor } from "../tools/AgentTool/agentToolUtils.js";
import { WEBFETCH } from "../tools/WebFetchTool/prompt.js";
import { getAgentDepth, isDelegatedObservationContext, isMainConversationContext } from "./agentContext.js";
import { parseWildcardAgentTypes } from "./permissions/permissions.js";
import { createChildAbortController } from "./abortController.js";
import { cloneFileStateCache } from "./fileStateCache.js";
import { emptyPickerState } from "../memdir/findRelevantMemories.js";
import { cloneContentReplacementState } from "./toolResultStorage.js";
import { createDenialTrackingState } from "./permissions/denialTracking.js";
import { makeSaltedName } from "./agentId.js";
import { stripHostToolMeta } from "../plugins/functionHooks/sites/toolSites.js";
import { stripMemoryCallMeta } from "../memdir/memoryTool.js";
import { EMPTY_USAGE } from "../services/api/emptyUsage.js";
import { isNullRenderingAttachment } from "./contextAttachments/promptSnapshot.js";
import { recordSidechainTranscript, isLoggableMessage } from "./sessionStorage.js";
import { cloneStickyBetaLatches, forkStickyBetaLatches } from "../bootstrap/stateSlices.js";
import { withKeepaliveReset } from "../services/api/cacheKeepalive.js";
import { getFeatureValue_CACHED_MAY_BE_STALE } from "../services/analytics/growthbook.js";
import { isStreamEvent, isTransientMessage_2 } from "./messageKinds.js";
import {
  mergeUsageFromDelta,
  addUsage_2,
} from "../../vendor/@anthropic-ai/sdk/lib/internal/tracing/response.mjs";
import { applyPreservedMessages } from "../services/compact/compact.js";
import { codeModeAccepted } from "./codeMode/accepted.js";
import { killShellTasksForAgent } from "../tasks/LocalShellTask/killShellTasks.js";
import { logEvent } from "../services/analytics/index.js";
import { fromEnum } from "../services/analytics/safeMetadata.js";
import { agentTypeForTelemetry } from "../services/analytics/metadata.js";
import { sanitizeMarkName } from "./startupMarks.js";
import { deferInit } from "../../runtime/deferred-init.js";

//@ chunk-5xgkngpb.js:2264080-2264316 placement
function createForkCacheSlot() {
  let cachedValue;
  let cachedKey;
  let cachedRequestId;
  let consumed = false;
  return {
    set: (key, value) => {
      cachedValue = key;
      cachedKey = value;
      cachedRequestId = undefined;
    },
    setRequest: (key, value, requestId) => {
      cachedValue = key;
      cachedKey = value;
      cachedRequestId = requestId;
    },
    current: (key, requestId) =>
      cachedKey === key && (cachedRequestId === undefined || cachedRequestId === requestId)
        ? cachedValue
        : undefined,
    holdsResponse: (key) => cachedKey === key && cachedValue !== undefined && cachedRequestId === undefined,
    once: () => {
      let isFirst = !consumed;
      consumed = true;
      return isFirst;
    },
  };
}
//@ chunk-5xgkngpb.js:2264316-2264329 placement
/**
 * 保存 fork 缓存安全参数的槽位。
 */
var forkCacheSafeParamsSlot; // deferred: uses createForkCacheSlot of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-5xgkngpb.js:2264316", () => {
  forkCacheSafeParamsSlot = createForkCacheSlot();
});
//@ chunk-5xgkngpb.js:2264329-2264356 placement
/**
 * 清空 fork 缓存安全参数。
 */
var clearForkCacheSafeParams = () => forkCacheSafeParamsSlot.set(undefined);
//@ chunk-5xgkngpb.js:2264356-2264405 placement
var DEFAULT_FORK_MAX_TURNS = 50;
var NEVER_CONSULT_ADVISOR_TEXT = "Never consult the advisor tool.";
//@ chunk-5xgkngpb.js:2264405-2264605 placement
function buildAdvisorForkHint({ forkLabel, forkContextMessages, advisorModel }) {
  return forkLabel !== "compact" &&
    forkLabel !== "reactive-compact" &&
    forkLabel !== "resume_cache_warm" &&
    forkContextMessages.length > 0 &&
    isAdvisorToolEnabled() &&
    advisorModel !== undefined
    ? createUserMessage({
        content: NEVER_CONSULT_ADVISOR_TEXT,
        isMeta: true,
      })
    : undefined;
}
//@ chunk-5xgkngpb.js:2264605-2264669 placement
function isAdvisorHintMessage(message) {
  return message.type === "user" && message.message.content === NEVER_CONSULT_ADVISOR_TEXT;
}
//@ chunk-5xgkngpb.js:2264669-2264785 placement
class LastForkParams {
  params = null;
  savedAt = null;
  sessionModel = null;
  resolvedAdvisor = undefined;
  sessionId = null;
  promptForSessionModel = false;
}
//@ chunk-5xgkngpb.js:2264785-2264850 placement
function hasModeDependentUserModel() {
  let userSpecifiedModelSetting = getUserSpecifiedModelSetting();
  return (
    userSpecifiedModelSetting !== undefined &&
    userSpecifiedModelSetting !== null &&
    isModeDependentModelSetting(strip1mSuffix(userSpecifiedModelSetting))
  );
}
//@ chunk-5xgkngpb.js:2264850-2264878 layout
var lastForkParamsSlot; // deferred: uses SessionRootSlot (../bootstrap/sessionSlices.js) of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-5xgkngpb.js:2264850", () => {
  lastForkParamsSlot = new SessionRootSlot(() => new LastForkParams());
});
//@ chunk-5xgkngpb.js:2264878-2264944 layout
function getLastForkParams() {
  let rootSession = getRootSession();
  return {
    last: lastForkParamsSlot.of(rootSession),
    rootId: rootSession.id,
    root: rootSession,
  };
}
//@ chunk-5xgkngpb.js:2264944-2265274 facade-exports
function saveCacheSafeParams(cacheSafeParams) {
  let { last, rootId, root } = getLastForkParams();
  last.params = cacheSafeParams;
  last.savedAt = cacheSafeParams ? Date.now() : null;
  last.sessionModel = cacheSafeParams ? getMainLoopModel() : null;
  last.resolvedAdvisor = cacheSafeParams
    ? resolveAdvisorModel(cacheSafeParams.advisorModel, getMainLoopModel())
    : undefined;
  last.sessionId = cacheSafeParams ? rootId : null;
  last.promptForSessionModel = cacheSafeParams
    ? cacheSafeParams.toolUseContext.options.mainLoopModel === last.sessionModel &&
      !hasModeDependentUserModel()
    : false;
  if (last.savedAt !== null) idleCompactionSlot.of(root).arm(last.savedAt, lastCacheSafeParamsForSameModel);
}
//@ chunk-5xgkngpb.js:2265274-2265313 layout
function lastCacheSafeParamsForSameModel() {
  return canReuseLastForkParams() ? getLastCacheSafeParamsForSameModel() : null;
}
//@ chunk-5xgkngpb.js:2265313-2265477 facade-exports
function setLastCacheSafeForkMessages(postCompactMessages) {
  let { last, rootId } = getLastForkParams();
  if (!last.params || last.sessionId !== rootId) return;
  clearForkCacheSafeParams();
  if (postCompactMessages.length === 0) {
    saveCacheSafeParams(null);
    return;
  }
  last.params = {
    ...last.params,
    forkContextMessages: postCompactMessages,
  };
}
//@ chunk-5xgkngpb.js:2265477-2265621 facade-exports
function getLastCacheSafeParamsForSameModel() {
  let { last, rootId } = getLastForkParams();
  return last.params &&
    last.sessionId === rootId &&
    last.sessionModel === getMainLoopModel() &&
    last.promptForSessionModel &&
    !hasModeDependentUserModel()
    ? last.params
    : null;
}
//@ chunk-5xgkngpb.js:2265621-2265877 facade-exports
function getLastCacheSafeParams() {
  let { last, rootId } = getLastForkParams();
  if (!last.params || last.sessionId !== rootId) return null;
  let mainLoopModel = getMainLoopModel();
  if (last.sessionModel === mainLoopModel) return last.params;
  return {
    ...last.params,
    toolUseContext: {
      ...last.params.toolUseContext,
      options: {
        ...last.params.toolUseContext.options,
        mainLoopModel,
      },
    },
  };
}
//@ chunk-5xgkngpb.js:2265877-2266045 facade-exports
function isMainThreadCacheWarm(nowMs = Date.now()) {
  let { last } = getLastForkParams();
  if (last.savedAt === null || !canReuseLastForkParams()) return false;
  let lastMainThreadCacheTtlMs = getLastMainThreadCacheTtlMs();
  if (lastMainThreadCacheTtlMs === null) return false;
  let max = Math.max(last.savedAt, getLastMainThreadCacheRenewedAt() ?? -1 / 0);
  return nowMs - max < lastMainThreadCacheTtlMs * 0.9;
}
//@ chunk-5xgkngpb.js:2266045-2266246 layout
/**
 * 判断上次保存的 fork 参数能否复用：属于当前根会话、主循环模型未变，且 advisor 解析结果一致。
 */
function canReuseLastForkParams() {
  let { last, rootId } = getLastForkParams();
  if (last.params === null || last.sessionId !== rootId) return false;
  if (last.sessionModel !== getMainLoopModel()) return false;
  return (
    resolveAdvisorModel(last.params.toolUseContext.getAdvisorSetting(), getMainLoopModel()) ===
    last.resolvedAdvisor
  );
}
//@ chunk-5xgkngpb.js:2266246-2266401 layout
/**
 * 两个工具对象除 call 外所有属性都相同（工具调用路由只允许替换 call）。
 */
function differsOnlyInCall(toolA, toolB) {
  let keys = new Set([...Object.keys(toolA), ...Object.keys(toolB)]);
  for (let key of keys)
    if (key !== "call" && Reflect.get(toolA, key) !== Reflect.get(toolB, key)) return false;
  return true;
}
//@ chunk-5xgkngpb.js:2266401-2266647 facade-exports (2.1.88 match: createCacheSafeParams, 0.755)
/**
 * 从当前查询上下文提取"缓存安全参数"：系统提示词、user/system context、toolUseContext、父消息（forkContextMessages）、advisor 模型、sticky betas。fork 复用这些以命中父请求的提示缓存。
 */
function createCacheSafeParams(context) {
  return {
    systemPrompt: context.systemPrompt,
    userContext: context.userContext,
    systemContext: context.systemContext,
    toolUseContext: context.toolUseContext,
    forkContextMessages: context.messages,
    advisorModel: context.toolUseContext.getAdvisorSetting(),
    stickyBetas: context.stickyBetas,
  };
}
//@ chunk-5xgkngpb.js:2266647-2269711 facade-exports (2.1.88 match: prepareForkedCommandContext, 0.289)
/**
 * 为 context: fork 的 skill 准备运行上下文：校验 skill 可用（同步否决、组织策略、同步插件），选基础代理（skill.agent 或 general-purpose），展开 skill 提示词，
 * 按 allowed/disallowed tools 生成权限层与 getAppState，克隆 readFileState、按需提取附件，返回 promptMessages、baseAgent、availableTools 等。
 */
async function prepareForkedCommandContext(command, args, toolUseContext, agentContext, options) {
  let syncState = await checkCommandSyncedAccess(command);
  if (isSyncedSkill(command) && refreshVetoAndRead())
    throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
      `Unknown skill: ${command.name}`,
      "forked skill refused: skills-sync veto",
    );
  if (isShippedSkillExecutionBlocked(command) || isKilledHostCatalogSkill(command))
    throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
      `Unknown skill: ${command.name}`,
      "forked skill refused: withheld by org Skills policy",
    );
  if (isDefined(syncState)) {
    logSyncedCommandRefused(command, syncState);
    throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
      `Unknown skill: ${command.name}`,
      "forked skill refused: synced plugin",
    );
  }
  let agentType = command.agent ?? "general-purpose";
  let activeAgents = excludeWebFetchAgent(toolUseContext.options.agentDefinitions.activeAgents);
  let found = activeAgents.find((activeAgent) => activeAgent.agentType === agentType);
  let loadedAgent = found && (await loadListedAgentDefinition(found, toolUseContext.abortController.signal));
  if (found !== undefined && loadedAgent === undefined)
    throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
      `Agent type '${agentType}' could not be loaded from its plugin, and ${command.name} runs on no other.`,
      "forked skill refused: its agent did not load from its plugin",
    );
  let shellHandOffCommands = [];
  let promptBlocks = await applySkillPromptHooks(
    command.name,
    await command.getPromptForCommand(args, {
      ...toolUseContext,
      promptShellHandOff: command.agent === undefined ? shellHandOffCommands : undefined,
      ...(agentContext && {
        agentContext,
      }),
    }),
    command,
  );
  let allowedTools = splitRuleList(await armedAllowedToolsOf(command));
  let syncStateAfterBody = await checkCommandSyncedAccess(command);
  if (isDefined(syncStateAfterBody)) {
    logSyncedCommandRefused(command, syncStateAfterBody);
    throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
      `Unknown skill: ${command.name}`,
      "forked skill refused after its body was fetched: synced plugin",
    );
  }
  let joined = promptBlocks.map((block) => (block.type === "text" ? block.text : "")).join(`
`);
  notifySetupGuideLoaded(
    joined,
    "skill",
    toolUseContext.credentials,
    toolUseContext.storageV5,
    toolUseContext.appendSystemMessage,
  );
  let allowedTools_2 = slashTestPattern(getBareCommandNameUnlessSynced(command));
  let checkout = allowedTools_2 ? await resolveSkillGitRoot(command, getCwdOrNull()) : undefined;
  function recordInvocation() {
    let content = getInvokedSkills().get(`${toolUseContext.agentId ?? ""}:${command.name}`)?.content ?? "";
    addInvokedSkill(
      command.name,
      command.source ? `${command.source}:${command.name}` : command.name,
      content,
      toolUseContext.agentId ?? null,
    );
    if (allowedTools_2)
      toolUseContext.applyAttributionOp({
        kind: "recordVerification",
        method: allowedTools_2,
        checkout,
      });
  }
  if (!options?.deferInvocationRecording) recordInvocation();
  let disallowedTools = splitRuleList(command.disallowedTools ?? []);
  let frozenCommandDenies =
    options?.freezeCommandDenies && !options?.replaceDenyRules
      ? (toolUseContext.getAppState().toolPermissionContext.alwaysDenyRules.command ?? [])
      : undefined;
  let modifiedGetAppState = withCommandRuleOverrides(
    toolUseContext.getAppState,
    allowedTools,
    disallowedTools,
    {
      replaceCommandRules: options?.replaceCommandRules,
      replaceDenyRules: options?.replaceDenyRules,
      frozenCommandDenies,
    },
  );
  let contextLayers = [
    ...(allowedTools.length === 0
      ? []
      : [
          {
            kind: "allowed_tools",
            allowedTools,
          },
        ]),
    ...(disallowedTools.length === 0
      ? []
      : [
          {
            kind: "disallowed_tools",
            disallowedTools,
          },
        ]),
  ];
  let baseAgent =
    loadedAgent ??
    activeAgents.find((activeAgent) => activeAgent.agentType === "general-purpose") ??
    activeAgents[0];
  if (!baseAgent) throw Error("No agent available for forked execution");
  if (baseAgent.agentType !== agentType)
    logForDebugging(
      `Forked command ${command.name}: agent '${agentType}' is not available as a fork base, running on '${baseAgent.agentType}'`,
    );
  let forkReadFileState = createRemoteFileState(READ_FILE_STATE_CACHE_SIZE);
  let skillShownToModel = isSkillShownToModel(command);
  let attachmentMessages =
    options?.extractAttachments && !skillShownToModel
      ? await toArray_2(
          options.extractAttachments(
            joined,
            {
              ...toolUseContext,
              readFileState: forkReadFileState,
              nestedMemoryAttachmentTriggers: [],
              dynamicSkillDirTriggers: [],
              pendingNestedMemoryTriggers: [],
            },
            null,
            [],
            {
              now: () => new Date().toISOString(),
              uuid: () => randomUUID(),
            },
            toolUseContext.messages,
            "repl_main_thread",
            {
              planSlugSeed: args,
              inputMentionsOnly: true,
              promptLoopId: agentContext?.agentId ?? options?.forkAgentId,
            },
          ),
        )
      : [];
  for (let [filePath, fileState] of forkReadFileState.entries())
    if (fileState.isPartialView) forkReadFileState.delete(filePath);
  let promptMessages = [
    createUserMessage({
      content: joined,
      isMeta: true,
      ...(shellHandOffCommands.length > 0 && {
        promptShellHandOff: {
          agentId: agentContext?.agentId ?? options?.forkAgentId ?? null,
          commands: shellHandOffCommands,
        },
      }),
    }),
    ...attachmentMessages,
  ];
  let webFetchReadmissionAllowed = !agentDisallowsWebFetch(toolUseContext);
  return {
    skillContent: joined,
    modifiedGetAppState,
    contextLayers,
    recordInvocation,
    baseAgent,
    promptMessages,
    forkReadFileState,
    webFetchReadmissionAllowed,
    availableTools: !webFetchReadmissionAllowed
      ? toolUseContext.options.tools
      : withWebFetchToolForAgent(
          {
            tools: hasToolRuleFor(allowedTools, WEBFETCH) ? allowedTools : undefined,
            disallowedTools,
          },
          toolUseContext.options.tools,
          getToolPermissionContext(toolUseContext),
          {
            depth: getAgentDepth(agentContext ?? toolUseContext.agentContext),
            activeAgents: toolUseContext.options.agentDefinitions.activeAgents,
          },
        ),
    frozenCommandDenies,
  };
}
//@ chunk-5xgkngpb.js:2269711-2270038 layout
/**
 * 当前代理（子代理或主线程指定的代理类型）的工具集是否禁止 WebFetch；决定 fork skill 是否重新放行 WebFetch。
 */
function agentDisallowsWebFetch(toolUseContext) {
  let { agentContext } = toolUseContext;
  let agentType;
  if (agentContext.agentType === "subagent") agentType = agentContext.subagentName;
  else if (agentContext.agentType === "main") {
    agentType = getMainThreadAgentType();
    if (agentType === undefined) return false;
  } else return true;
  let found = toolUseContext.options.agentDefinitions.activeAgents.find(
    (activeAgent) => activeAgent.agentType === agentType,
  );
  if (found === undefined) return true;
  let tools = found.tools;
  return (
    hasToolRuleFor(found.disallowedTools, WEBFETCH) ||
    (parseWildcardAgentTypes(tools) === null && !hasToolRuleFor(tools, WEBFETCH))
  );
}
//@ chunk-5xgkngpb.js:2270038-2270141 facade-exports (2.1.88 match: extractResultText, 1)
/**
 * 取代理最后一条 assistant 消息的文本，没有则返回默认文本。
 */
function extractResultText(agentMessages, defaultText = "Execution completed") {
  let lastAssistantMessage = getLastAssistantMessage(agentMessages);
  if (!lastAssistantMessage) return defaultText;
  return (
    extractTextContent_2(
      lastAssistantMessage.message.content,
      `
`,
    ) || defaultText
  );
}
//@ chunk-5xgkngpb.js:2270141-2270163 layout
/**
 * 子代理 setAppState 可以回写父状态的字段白名单（只有 frameUrls）。
 */
var SUBAGENT_WRITABLE_APP_STATE_KEYS = ["frameUrls"];
//@ chunk-5xgkngpb.js:2270163-2274744 facade-exports (2.1.88 match: createSubagentContext, 0.336)
/**
 * 创建隔离的子代理 ToolUseContext：abortController 默认为父的子控制器；getAppState 默认强制 shouldAvoidPermissionPrompts（加 avoid_prompts 权限层）；
 * readFileState 克隆、文件历史/denial tracking/setAppState 默认隔离（setAppState 只回写 frameUrls）；messageQueue、taskRegistry、凭证等共享；生成新 agentId 与 queryTracking 深度。
 */
function createSubagentContext(parentContext, overrides) {
  let abortController =
    overrides?.abortController ??
    (overrides?.shareAbortController
      ? parentContext.abortController
      : createChildAbortController(parentContext.abortController));
  let getAppState = overrides?.getAppState
    ? overrides.getAppState
    : overrides?.shareAbortController
      ? parentContext.getAppState
      : () => {
          let state = parentContext.getAppState();
          if (state.toolPermissionContext.shouldAvoidPermissionPrompts) return state;
          return {
            ...state,
            toolPermissionContext: {
              ...state.toolPermissionContext,
              shouldAvoidPermissionPrompts: true,
            },
          };
        };
  let avoidPromptLayers =
    overrides?.shareAbortController || overrides?.getAppState
      ? []
      : [
          {
            kind: "avoid_prompts",
          },
        ];
  let permissionLayers = [
    ...(parentContext.permissionLayers ?? []),
    ...avoidPromptLayers,
    ...(overrides?.permissionLayers ?? []),
  ];
  let options = overrides?.options ?? parentContext.options;
  let agentContext = overrides?.agentContext ?? parentContext.agentContext;
  if (overrides?.options && overrides.options.tools !== parentContext.options.tools) {
    let sharesRefreshTools =
      overrides.options.refreshTools !== undefined &&
      overrides.options.refreshTools === parentContext.options.refreshTools;
    let sharesRefreshMcpClients =
      overrides.options.refreshMcpClients !== undefined &&
      overrides.options.refreshMcpClients === parentContext.options.refreshMcpClients;
    if (sharesRefreshTools || sharesRefreshMcpClients)
      options = {
        ...overrides.options,
        refreshTools: sharesRefreshTools ? undefined : overrides.options.refreshTools,
        refreshMcpClients: sharesRefreshMcpClients ? undefined : overrides.options.refreshMcpClients,
      };
  }
  return {
    messageQueue: parentContext.messageQueue,
    session: overrides?.session ?? parentContext.session,
    hookOrigin: parentContext.hookOrigin,
    hookCaller: parentContext.hookCaller,
    hookServesModel: parentContext.hookServesModel,
    pluginSteered: parentContext.pluginSteered,
    pluginUnnamed: parentContext.pluginUnnamed,
    readFileState: cloneFileStateCache(overrides?.readFileState ?? parentContext.readFileState, {
      stripSeededFromContext: true,
    }),
    nestedMemoryAttachmentTriggers: [],
    pendingNestedMemoryTriggers: parentContext.pendingNestedMemoryTriggers,
    sessionEnvVars: parentContext.sessionEnvVars,
    toolState: parentContext.toolState,
    dynamicSkillDirTriggers: [],
    memorySelector: emptyPickerState(),
    toolDecisions: new Map(),
    contentReplacementState:
      overrides?.contentReplacementState ??
      (parentContext.contentReplacementState
        ? cloneContentReplacementState(parentContext.contentReplacementState)
        : undefined),
    abortController,
    getAppState,
    permissionLayers,
    markPrResolvedThisSession: parentContext.markPrResolvedThisSession,
    isUltrareviewOverageConfirmed: parentContext.isUltrareviewOverageConfirmed,
    markUltrareviewOverageConfirmed: parentContext.markUltrareviewOverageConfirmed,
    setAppState: overrides?.shareSetAppState
      ? parentContext.setAppState
      : (updater) =>
          parentContext.setAppState((prevState) => {
            let nextState = updater(prevState);
            if (nextState === prevState) return prevState;
            let hasChanged = false;
            let mergedState = {
              ...prevState,
            };
            for (let stateKey of SUBAGENT_WRITABLE_APP_STATE_KEYS)
              if (nextState[stateKey] !== prevState[stateKey]) {
                Object.assign(mergedState, {
                  [stateKey]: nextState[stateKey],
                });
                hasChanged = true;
              }
            return hasChanged ? mergedState : prevState;
          }),
    setToolPermissionContext: overrides?.shareSetAppState ? parentContext.setToolPermissionContext : () => {},
    setSessionToolPermissionContext: parentContext.setSessionToolPermissionContext,
    getAdvisorSetting: parentContext.getAdvisorSetting,
    getMcp: parentContext.getMcp,
    getProactivityLevel: parentContext.getProactivityLevel,
    getWebBrowser: parentContext.getWebBrowser,
    isolationLatch: overrides?.isolationLatch ?? parentContext.isolationLatch,
    taskRegistry: parentContext.taskRegistry,
    queuedNotificationsRegistry: parentContext.queuedNotificationsRegistry,
    sessionHooksRegistry: parentContext.sessionHooksRegistry,
    setWebBrowserSlice: parentContext.setWebBrowserSlice,
    setArtifactReadVersion: isDelegatedObservationContext(agentContext)
      ? () => {}
      : parentContext.setArtifactReadVersion,
    getArtifactReadObservation: parentContext.getArtifactReadObservation,
    artifactRegistries: parentContext.artifactRegistries,
    setArtifactContractTarget: isDelegatedObservationContext(agentContext)
      ? () => {}
      : parentContext.setArtifactContractTarget,
    getArtifactContractTarget: parentContext.getArtifactContractTarget,
    enqueuePendingMemoryUpdate: parentContext.enqueuePendingMemoryUpdate,
    agentLifecycle: parentContext.agentLifecycle,
    teammateColors: parentContext.teammateColors,
    rootToolSurface: parentContext.rootToolSurface,
    storageV5: parentContext.storageV5,
    credentials: parentContext.credentials,
    localDenialTracking: overrides?.shareSetAppState
      ? parentContext.localDenialTracking
      : createDenialTrackingState(),
    getFileHistoryState: overrides?.shareFileHistory
      ? parentContext.getFileHistoryState
      : () => {
          return;
        },
    applyFileHistoryOp: overrides?.shareFileHistory
      ? parentContext.applyFileHistoryOp
      : (historyOp) => {
          if (historyOp.kind === "touch") parentContext.applyFileHistoryOp(historyOp);
        },
    applyAttributionOp: parentContext.applyAttributionOp,
    requestDialog: parentContext.requestDialog,
    permissionRelays: parentContext.permissionRelays,
    onCompactEvent: undefined,
    onRetryStatus: overrides?.onRetryStatus,
    options,
    messages: overrides?.messages ?? parentContext.messages,
    inheritedVerifiedHumanTurns:
      overrides?.inheritedVerifiedHumanTurns ?? parentContext.inheritedVerifiedHumanTurns,
    inheritedMcpSkillMessages:
      overrides?.inheritedMcpSkillMessages ?? parentContext.inheritedMcpSkillMessages,
    turnStartIndex: 0,
    agentId: overrides?.agentId ?? makeSaltedName(),
    isBackgroundAgent: overrides?.isBackgroundAgent || parentContext.isBackgroundAgent,
    modelCallNames: overrides?.modelCallNames,
    agentType: overrides?.agentType,
    agentContext,
    pickedEffortModel:
      overrides?.pickedEffortModel === null
        ? undefined
        : (overrides?.pickedEffortModel ??
          (isMainConversationContext(agentContext)
            ? parentContext.pickedEffortModel
            : getPickedEffortModel(parentContext))),
    agentWorktree: parentContext.agentWorktree,
    spawnedByWorkflowRunId: overrides?.spawnedByWorkflowRunId ?? parentContext.spawnedByWorkflowRunId,
    primitiveToolGrant: overrides?.primitiveToolGrant ?? parentContext.primitiveToolGrant,
    precomputeSourceKey: overrides?.precomputeSourceKey,
    teammateContext: overrides?.teammateContext ?? parentContext.teammateContext,
    queryTracking: {
      chainId: randomUUID(),
      depth: (parentContext.queryTracking?.depth ?? -1) + 1,
    },
    fileReadingLimits: parentContext.innerCall === true ? undefined : parentContext.fileReadingLimits,
    criticalSystemReminder_EXPERIMENTAL: overrides?.criticalSystemReminder_EXPERIMENTAL,
    requireCanUseTool: overrides?.requireCanUseTool,
    mcpRequestMeta:
      overrides?.mcpRequestMeta ??
      stripHostToolMeta(
        (overrides?.memoryCaller ?? parentContext.memoryCaller) !== undefined
          ? stripMemoryCallMeta(parentContext.mcpRequestMeta)
          : parentContext.mcpRequestMeta,
      ),
    memoryCaller: overrides?.memoryCaller ?? parentContext.memoryCaller,
    onPermissionDenial: parentContext.onPermissionDenial,
  };
}
//@ chunk-5xgkngpb.js:2274744-2274925 facade-exports
/**
 * 父消息里 fork 点的 uuid：末尾若是同一响应拆成的多条 assistant，取第一条。
 */
function forkPointUuidOf(messages) {
  let index = messages.length - 1;
  let lastMessage = messages[index];
  if (lastMessage?.type === "assistant") {
    let id = lastMessage.message.id;
    while (index > 0) {
      let prevMessage = messages[index - 1];
      if (prevMessage?.type !== "assistant" || prevMessage.message.id !== id) break;
      index--;
    }
  }
  return messages[index]?.uuid;
}
//@ chunk-5xgkngpb.js:2274925-2274935 layout
/**
 * 正在运行的 fork 代理计数。
 */
var activeForkCount = 0;
//@ chunk-5xgkngpb.js:2274935-2275001 facade-exports
/**
 * runForkedAgent（门面原名）：维护活动 fork 计数后调用内层实现 runForkedAgentImpl。
 */
async function runForkedAgent(params) {
  activeForkCount++;
  try {
    return await runForkedAgentImpl(params);
  } finally {
    activeForkCount--;
  }
}
//@ chunk-5xgkngpb.js:2275001-2279622 fingerprint (2.1.88 match: runForkedAgent, 0.592)
/**
 * 运行一个 fork 代理：用 createSubagentContext 建隔离上下文（默认后台、memoryCaller=worker、requireCanUseTool），继承父消息前缀与 sticky betas 以复用缓存；
 * 不声明 ownPrefix 时不许改工具集；循环 runQuery 收集消息与 usage、写 sidechain transcript；结束时清理该代理的 shell 任务与排队消息，并记 tengu_fork_agent_query。
 */
async function runForkedAgentImpl({
  promptMessages,
  cacheSafeParams,
  ownPrefix,
  canUseTool,
  querySource,
  forkLabel,
  overrides,
  maxOutputTokens,
  maxTurns,
  pinnedEffort,
  onMessage,
  onRequestUsage,
  onStreamDelta,
  skipTranscript,
  skipCacheWrite,
  skipMessageCacheMarkers,
  fallbackModel,
  compactionRequestKind,
  noServerToolCalls,
  apiAttemptsLeft,
  thinkingStripPlan,
  advisorStripPlan,
  divergesAtMessageId,
  toolCallRoutes,
}) {
  let startTime = Date.now();
  let outputMessages = [];
  let compactState = null;
  let totalUsage = {
    ...EMPTY_USAGE,
  };
  let { userContext, systemContext, toolUseContext, forkContextMessages, advisorModel, model } =
    cacheSafeParams;
  let systemPrompt = ownPrefix?.systemPrompt ?? cacheSafeParams.systemPrompt;
  let isolatedToolUseContext = createSubagentContext(toolUseContext, {
    ...overrides,
    isBackgroundAgent: overrides?.isBackgroundAgent ?? true,
    memoryCaller: overrides?.memoryCaller ?? toolUseContext.memoryCaller ?? "worker",
    options:
      overrides?.options ??
      (fallbackModel !== undefined
        ? {
            ...toolUseContext.options,
          }
        : undefined),
    ...(model !== undefined && {
      options: {
        ...(overrides?.options ?? toolUseContext.options),
        mainLoopModel: model,
      },
      permissionLayers: [
        ...(overrides?.permissionLayers ?? []),
        {
          kind: "model",
          mainLoopModel: model,
        },
      ],
    }),
    isolationLatch: overrides?.isolationLatch ?? {
      current: toolUseContext.isolationLatch?.current ?? null,
      exemptServers: toolUseContext.isolationLatch?.exemptServers,
    },
    precomputeSourceKey: overrides?.precomputeSourceKey ?? toolUseContext.agentId ?? "main",
    requireCanUseTool: overrides?.requireCanUseTool ?? true,
  });
  isolatedToolUseContext.onPermissionDenial = undefined;
  isolatedToolUseContext.compactTranscriptUnavailable = true;
  let getAppState = isolatedToolUseContext.getAppState;
  isolatedToolUseContext.getAppState = () => {
    let appState = getAppState();
    return appState.advisorModel === advisorModel
      ? appState
      : {
          ...appState,
          advisorModel,
        };
  };
  isolatedToolUseContext.getAdvisorSetting = () => advisorModel;
  let advisorHintMessage = buildAdvisorForkHint({
    forkLabel,
    forkContextMessages,
    advisorModel,
  });
  if (
    advisorHintMessage !== undefined &&
    promptMessages.length > 0 &&
    !promptMessages.some(isAdvisorHintMessage)
  )
    promptMessages = [...promptMessages, advisorHintMessage];
  let continuesParentPrefix = ownPrefix === undefined && forkContextMessages.length > 0;
  if (continuesParentPrefix && isolatedToolUseContext.options.tools !== toolUseContext.options.tools)
    throw Error("runForkedAgent: a fork changed its parent's tools without stating ownPrefix");
  if (toolCallRoutes !== undefined && toolCallRoutes.size > 0) {
    if (!continuesParentPrefix)
      throw Error("runForkedAgent: tool call routes need a fork that continues its parent's prefix");
    let tools = toolUseContext.options.tools;
    for (let [toolA, toolB] of toolCallRoutes)
      if (!tools.includes(toolA) || !differsOnlyInCall(toolA, toolB))
        throw Error(
          "runForkedAgent: a tool call route must replace one of the parent's tools with a copy that differs only in call",
        );
    isolatedToolUseContext.options = {
      ...isolatedToolUseContext.options,
      tools: tools.map((tool) => toolCallRoutes.get(tool) ?? tool),
    };
  }
  let initialMessages = [
    ...(ownPrefix === undefined ? forkContextMessages : isNullRenderingAttachment(forkContextMessages)),
    ...promptMessages,
  ];
  let forkPointUuid = forkPointUuidOf(forkContextMessages);
  let transcriptAgentId = skipTranscript ? undefined : makeSaltedName(forkLabel);
  let lastRecordedUuid = null;
  if (transcriptAgentId) {
    await recordSidechainTranscript(
      promptMessages,
      transcriptAgentId,
      undefined,
      toolUseContext.storageV5,
    ).catch((err) =>
      logForDebugging(`Forked agent [${forkLabel}] failed to record initial transcript: ${err}`),
    );
    lastRecordedUuid = promptMessages.at(-1)?.uuid ?? null;
  }
  let turnLimit = maxTurns ?? DEFAULT_FORK_MAX_TURNS;
  let assistantTurns = 0;
  let parentStickyBetas = cacheSafeParams.stickyBetas ?? getStickyBetas();
  let stickyBetas = continuesParentPrefix
    ? cloneStickyBetaLatches(parentStickyBetas)
    : withKeepaliveReset(forkStickyBetaLatches(parentStickyBetas));
  isolatedToolUseContext.stickyBetas = stickyBetas;
  let relayFork =
    !toolUseContext.agentId &&
    continuesParentPrefix &&
    getMainLoopModel_2(isolatedToolUseContext) === getMainLoopModel_2(toolUseContext) &&
    getFeatureValue_CACHED_MAY_BE_STALE("tengu_wild_tome", false);
  try {
    for await (let message of isolatedToolUseContext.options.runQuery({
      messages: initialMessages,
      systemPrompt,
      userContext,
      systemContext,
      canUseTool,
      toolUseContext: isolatedToolUseContext,
      querySource,
      fallbackModel,
      maxOutputTokensOverride: maxOutputTokens,
      maxTurns: turnLimit,
      pinnedEffort,
      skipCacheWrite,
      skipMessageCacheMarkers,
      relayFork,
      compactionRequestKind,
      noServerToolCalls,
      apiAttemptsLeft,
      forkPointUuid,
      divergesAtMessageId,
      thinkingStripPlan,
      advisorStripPlan,
      stickyBetas,
      agentCacheTtlOverride: cacheSafeParams.agentCacheTtlOverride,
    })) {
      if (isStreamEvent(message)) {
        onStreamDelta?.(message);
        if (
          message.type === "stream_event" &&
          message.event?.type === "message_delta" &&
          message.event.usage
        ) {
          let turnUsage = mergeUsageFromDelta(
            {
              ...EMPTY_USAGE,
            },
            message.event.usage,
          );
          totalUsage = addUsage_2(totalUsage, turnUsage);
          onRequestUsage?.(turnUsage);
        }
        continue;
      }
      if (message.type === "tombstone") {
        let lastIndex = outputMessages.findLastIndex(
          (outputMessage) => outputMessage.uuid === message.message.uuid,
        );
        if (lastIndex !== -1) outputMessages.splice(lastIndex, 1);
        continue;
      }
      if (isTransientMessage_2(message)) continue;
      if (message.type === "assistant") assistantTurns++;
      logForDebugging(`Forked agent [${forkLabel}] received message: type=${message.type}`);
      outputMessages.push(message);
      compactState = applyPreservedMessages(outputMessages, message, compactState, initialMessages);
      onMessage?.(message);
      if (
        transcriptAgentId &&
        (message.type === "assistant" ||
          message.type === "user" ||
          message.type === "progress" ||
          (message.type === "attachment" && isLoggableMessage(message)))
      ) {
        await recordSidechainTranscript(
          [message],
          transcriptAgentId,
          lastRecordedUuid,
          toolUseContext.storageV5,
        ).catch((err) => logForDebugging(`Forked agent [${forkLabel}] failed to record transcript: ${err}`));
        if (message.type !== "progress") lastRecordedUuid = message.uuid;
      }
    }
  } finally {
    if (compactState) outputMessages.push(...compactState.preserved);
    if (isolatedToolUseContext.agentId) {
      if (codeModeAccepted())
        try {
          require("./codeMode/replSessionEnd.js").endSubagentRepl(
            isolatedToolUseContext.toolState,
            isolatedToolUseContext.messageQueue,
            isolatedToolUseContext.agentId,
          );
        } catch (error) {
          logForDebugging(`[runForkedAgent] REPL session end failed (continuing teardown): ${error}`);
        }
      try {
        let agentId = isolatedToolUseContext.agentId;
        killShellTasksForAgent(agentId, isolatedToolUseContext.taskRegistry);
        isolatedToolUseContext.messageQueue.dequeueAllMatching((err) => err.agentId === agentId);
      } catch (error) {
        logForDebugging(`[runForkedAgent] shell-task reap failed (continuing teardown): ${error}`);
      }
    }
    isolatedToolUseContext.readFileState.clear();
    initialMessages.length = 0;
  }
  logForDebugging(
    `Forked agent [${forkLabel}] finished: ${outputMessages.length} messages, types=[${outputMessages.map((m) => m.type).join(", ")}], totalUsage: input=${totalUsage.input_tokens} output=${totalUsage.output_tokens} cacheRead=${totalUsage.cache_read_input_tokens} cacheCreate=${totalUsage.cache_creation_input_tokens}`,
  );
  let durationMs = Date.now() - startTime;
  if (maxTurns === undefined && assistantTurns >= DEFAULT_FORK_MAX_TURNS)
    logEvent("tengu_forked_agent_default_turns_exceeded", {
      forkLabel: fromEnum(forkLabel),
      querySource: agentTypeForTelemetry(querySource),
      turnCount: assistantTurns,
    });
  logForkAgentQueryEvent({
    forkLabel,
    querySource,
    durationMs,
    messageCount: outputMessages.length,
    totalUsage,
    queryTracking: toolUseContext.queryTracking,
    relayEligible: relayFork,
  });
  return {
    messages: outputMessages,
    totalUsage,
  };
}
//@ chunk-5xgkngpb.js:2279622-2280362 fingerprint (2.1.88 match: logForkAgentQueryEvent, 0.977)
/**
 * 记 tengu_fork_agent_query：耗时、消息数、token 与缓存命中率、查询链深度。
 */
function logForkAgentQueryEvent({
  forkLabel,
  querySource,
  durationMs,
  messageCount,
  totalUsage,
  queryTracking,
  relayEligible,
}) {
  let totalInputTokens =
    totalUsage.input_tokens + totalUsage.cache_creation_input_tokens + totalUsage.cache_read_input_tokens;
  let cacheHitRate = totalInputTokens > 0 ? totalUsage.cache_read_input_tokens / totalInputTokens : 0;
  logEvent("tengu_fork_agent_query", {
    forkLabel: fromEnum(forkLabel),
    querySource: agentTypeForTelemetry(querySource),
    durationMs,
    messageCount,
    relayEligible,
    inputTokens: totalUsage.input_tokens,
    outputTokens: totalUsage.output_tokens,
    cacheReadInputTokens: totalUsage.cache_read_input_tokens,
    cacheCreationInputTokens: totalUsage.cache_creation_input_tokens,
    serviceTier: fromEnum(totalUsage.service_tier),
    cacheCreationEphemeral1hTokens: totalUsage.cache_creation.ephemeral_1h_input_tokens,
    cacheCreationEphemeral5mTokens: totalUsage.cache_creation.ephemeral_5m_input_tokens,
    cacheHitRate,
    ...(queryTracking && {
      queryChainId: sanitizeMarkName(queryTracking.chainId),
      queryDepth: queryTracking.depth,
    }),
  });
}
export {
  getLastCacheSafeParams,
  clearForkCacheSafeParams,
  isMainThreadCacheWarm,
  runForkedAgent,
  setLastCacheSafeForkMessages,
  getLastCacheSafeParamsForSameModel,
  prepareForkedCommandContext,
  extractResultText,
  forkCacheSafeParamsSlot,
  createCacheSafeParams,
  forkPointUuidOf,
  createSubagentContext,
  saveCacheSafeParams,
};
