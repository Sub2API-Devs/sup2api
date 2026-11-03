/**
 * utils/forkedAgent.ts
 *
 * 派生（fork）子代理的基础设施：缓存安全参数、隔离的子代理 ToolUseContext、fork skill 的上下文准备、runForkedAgent 查询循环与遥测
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/utils/forkedAgent.ts
 * pieces: chunk-e6aww6q8.js (29)
 * attribution: placement 8, layout 8, facade-exports 11, fingerprint 2
 */
import {
  randomUUID,
  randomUUID as randomUUID_2,
  randomUUID as randomUUID_3,
  randomUUID as randomUUID_4,
  randomUUID as randomUUID_5,
  randomUUID as randomUUID_6,
  randomUUID as randomUUID_7,
  randomUUID as randomUUID_8,
  randomUUID as randomUUID_9,
  randomUUID as randomUUID_10,
  randomUUID as randomUUID_11,
  randomUUID as randomUUID_12,
  randomUUID as randomUUID_13,
  randomUUID as randomUUID_14,
  randomUUID as randomUUID_15,
  randomUUID as randomUUID_16,
  randomUUID as randomUUID_17,
  randomUUID as randomUUID_18,
  randomUUID as randomUUID_19,
  randomUUID as randomUUID_20,
  randomUUID as randomUUID_21,
  randomUUID as randomUUID_22,
  randomUUID as randomUUID_23,
  randomUUID as randomUUID_24,
  randomUUID as randomUUID_25,
  randomUUID as randomUUID_26,
  randomUUID as randomUUID_27,
  randomUUID as randomUUID_28,
  randomUUID as randomUUID_29,
  randomUUID as randomUUID_30,
  randomUUID as randomUUID_31,
  randomUUID as randomUUID_32,
  randomUUID as randomUUID_33,
  randomUUID as randomUUID_34,
  randomUUID as randomUUID_35,
  randomUUID as randomUUID_36,
  randomUUID as randomUUID_37,
  randomUUID as randomUUID_38,
  randomUUID as randomUUID_39,
  randomUUID as randomUUID_40,
  randomUUID as randomUUID_41,
  randomUUID as randomUUID_42,
  randomUUID as randomUUID_43,
  randomUUID as randomUUID_44,
  randomUUID as randomUUID_45,
  randomUUID as randomUUID_46,
  randomUUID as randomUUID_47,
  randomUUID as randomUUID_48,
  randomUUID as randomUUID_49,
  randomUUID as randomUUID_50,
} from "crypto";
import { isAdvisorToolEnabled, resolveAdvisorModel } from "./advisor.js";
import { createUserMessage, getLastAssistantMessage, extractTextContent_2 } from "./messages.js";
import { getUserSpecifiedModelSetting } from "./model/smallFastModel.js";
import { isModeDependentModelSetting } from "./model/planModeModel.js";
import { Lt } from "./model/modelIds.js";
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
import { dWt } from "../services/compact/idleCompaction.js";
import { checkCommandSyncedAccess, LZ, gse, resolveSkillGitRoot } from "./claudeAiSync/syncedSkillAccess.js";
import { isSyncedSkill, isKilledHostCatalogSkill, rSt } from "./commandPredicates.js";
import { Gun } from "./claudeAiSync/skillsSync.js";
import { TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS } from "./errors.js";
import { isShippedSkillExecutionBlocked } from "../skills/bundledSkills.js";
import { Mtr } from "../tools/WebFetchTool/harnessNotes.js";
import { loadListedAgentDefinition } from "../tools/AgentTool/loadAgentsDir.js";
import { applySkillPromptHooks } from "../plugins/functionHooks/skillPromptHooks.js";
import { splitRuleList } from "./permissions/disallowedToolsFlag.js";
import { armedAllowedToolsOf } from "./permissions/permissionsLoader.js";
import { exe } from "./attributionFileClasses.js";
import { getBareCommandNameUnlessSynced } from "../commands.js";
import { gl } from "./cwd.js";
import {
  withCommandRuleOverrides,
  getToolPermissionContext,
  getMainLoopModel as getMainLoopModel_2,
} from "./permissions/toolPermissionContext.js";
import { logForDebugging } from "./debug.js";
import { nv, ZC } from "./remoteFileState.js";
import { isSkillShownToModel } from "../skills/skillSources.js";
import { toArray_2 } from "./generators.js";
import { withWebFetchToolForAgent, RB } from "../tools/AgentTool/agentToolUtils.js";
import { WEBFETCH } from "../tools/WebFetchTool/prompt.js";
import { getAgentDepth, isDelegatedObservationContext } from "./agentContext.js";
import { parseWildcardAgentTypes } from "./permissions/permissions.js";
import { createChildAbortController } from "./abortController.js";
import { cloneFileStateCache } from "./fileStateCache.js";
import { efe } from "../memdir/findRelevantMemories.js";
import { cloneContentReplacementState } from "./toolResultStorage.js";
import { createDenialTrackingState } from "./permissions/denialTracking.js";
import { makeSaltedName } from "./agentId.js";
import { stripHostToolMeta } from "../plugins/functionHooks/sites/toolSites.js";
import { Jro } from "../memdir/memoryTool.js";
import { EMPTY_USAGE } from "../services/api/emptyUsage.js";
import { isNullRenderingAttachment } from "./contextAttachments/promptSnapshot.js";
import { recordSidechainTranscript, isLoggableMessage } from "./sessionStorage.js";
import { cloneStickyBetaLatches, forkStickyBetaLatches } from "../bootstrap/stateSlices.js";
import { Qun } from "../services/api/cacheKeepalive.js";
import { getFeatureValue_CACHED_MAY_BE_STALE } from "../services/analytics/growthbook.js";
import { isStreamEvent, isTransientMessage } from "./messageKinds.js";
import { mRe, addUsage_2 } from "../../vendor/@anthropic-ai/sdk/lib/internal/tracing/response.mjs";
import { applyPreservedMessages } from "../services/compact/compact.js";
import { killShellTasksForAgent } from "../tasks/LocalShellTask/killShellTasks.js";
import { logEvent } from "../services/analytics/index.js";
import { fromEnum } from "../services/analytics/safeMetadata.js";
import { agentTypeForTelemetry } from "../services/analytics/metadata.js";
import { ye } from "./startupMarks.js";

//@ chunk-e6aww6q8.js:2209627-2209863 placement
function createForkCacheSlot() {
  let e,
    n,
    r,
    s = !1;
  return {
    set: (h, y) => {
      ((e = h), (n = y), (r = void 0));
    },
    setRequest: (h, y, S) => {
      ((e = h), (n = y), (r = S));
    },
    current: (h, y) => (n === h && (r === void 0 || r === y) ? e : void 0),
    holdsResponse: (h) => n === h && e !== void 0 && r === void 0,
    once: () => {
      let h = !s;
      return ((s = !0), h);
    },
  };
}
//@ chunk-e6aww6q8.js:2209863-2209876 placement
var VR = createForkCacheSlot();
//@ chunk-e6aww6q8.js:2209876-2209903 placement
var IGt = () => VR.set(void 0);
//@ chunk-e6aww6q8.js:2209903-2209952 placement
var Iin = 50,
  Nin = "Never consult the advisor tool.";
//@ chunk-e6aww6q8.js:2209952-2210127 placement
function buildAdvisorForkHint({
  forkLabel: forkLabel,
  forkContextMessages: forkContextMessages,
  advisorModel: advisorModel,
}) {
  return forkLabel !== "compact" &&
    forkLabel !== "reactive-compact" &&
    forkContextMessages.length > 0 &&
    isAdvisorToolEnabled() &&
    advisorModel !== void 0
    ? createUserMessage({ content: Nin, isMeta: !0 })
    : void 0;
}
//@ chunk-e6aww6q8.js:2210127-2210191 placement
function tlr(e) {
  return e.type === "user" && e.message.content === Nin;
}
//@ chunk-e6aww6q8.js:2210191-2210307 placement
class LastForkParams {
  params = null;
  savedAt = null;
  sessionModel = null;
  resolvedAdvisor = void 0;
  sessionId = null;
  promptForSessionModel = !1;
}
//@ chunk-e6aww6q8.js:2210307-2210372 placement
function $in() {
  let e = getUserSpecifiedModelSetting();
  return e !== void 0 && e !== null && isModeDependentModelSetting(Lt(e));
}
//@ chunk-e6aww6q8.js:2210372-2210400 layout
var nlr = new SessionRootSlot(() => new LastForkParams());
//@ chunk-e6aww6q8.js:2210400-2210466 layout
function Y2() {
  let e = getRootSession();
  return { last: nlr.of(e), rootId: e.id, root: e };
}
//@ chunk-e6aww6q8.js:2210466-2210796 facade-exports
function saveCacheSafeParams(e) {
  let { last: last, rootId: rootId, root: root } = Y2();
  if (
    ((last.params = e),
    (last.savedAt = e ? Date.now() : null),
    (last.sessionModel = e ? getMainLoopModel() : null),
    (last.resolvedAdvisor = e ? resolveAdvisorModel(e.advisorModel, getMainLoopModel()) : void 0),
    (last.sessionId = e ? rootId : null),
    (last.promptForSessionModel = e
      ? e.toolUseContext.options.mainLoopModel === last.sessionModel && !$in()
      : !1),
    last.savedAt !== null)
  )
    dWt.of(root).arm(last.savedAt, olr);
}
//@ chunk-e6aww6q8.js:2210796-2210835 layout
function olr() {
  return canReuseLastForkParams() ? getLastCacheSafeParamsForSameModel() : null;
}
//@ chunk-e6aww6q8.js:2210835-2210999 facade-exports
function setLastCacheSafeForkMessages(e) {
  let { last: last, rootId: rootId } = Y2();
  if (!last.params || last.sessionId !== rootId) return;
  if ((IGt(), e.length === 0)) {
    saveCacheSafeParams(null);
    return;
  }
  last.params = { ...last.params, forkContextMessages: e };
}
//@ chunk-e6aww6q8.js:2210999-2211143 facade-exports
function getLastCacheSafeParamsForSameModel() {
  let { last: last, rootId: rootId } = Y2();
  return last.params &&
    last.sessionId === rootId &&
    last.sessionModel === getMainLoopModel() &&
    last.promptForSessionModel &&
    !$in()
    ? last.params
    : null;
}
//@ chunk-e6aww6q8.js:2211143-2211399 facade-exports
function getLastCacheSafeParams() {
  let { last: last, rootId: rootId } = Y2();
  if (!last.params || last.sessionId !== rootId) return null;
  let r = getMainLoopModel();
  if (last.sessionModel === r) return last.params;
  return {
    ...last.params,
    toolUseContext: {
      ...last.params.toolUseContext,
      options: { ...last.params.toolUseContext.options, mainLoopModel: r },
    },
  };
}
//@ chunk-e6aww6q8.js:2211399-2211567 facade-exports
function isMainThreadCacheWarm(e = Date.now()) {
  let { last: last } = Y2();
  if (last.savedAt === null || !canReuseLastForkParams()) return !1;
  let r = getLastMainThreadCacheTtlMs();
  if (r === null) return !1;
  let max = Math.max(last.savedAt, getLastMainThreadCacheRenewedAt() ?? -1 / 0);
  return e - max < r * 0.9;
}
/**
 * 判断上次保存的 fork 参数能否复用：属于当前根会话、主循环模型未变，且 advisor 解析结果一致。
 */
//@ chunk-e6aww6q8.js:2211567-2211768 layout
function canReuseLastForkParams() {
  let { last: last, rootId: rootId } = Y2();
  if (last.params === null || last.sessionId !== rootId) return !1;
  if (last.sessionModel !== getMainLoopModel()) return !1;
  return (
    resolveAdvisorModel(last.params.toolUseContext.getAdvisorSetting(), getMainLoopModel()) ===
    last.resolvedAdvisor
  );
}
/**
 * 两个工具对象除 call 外所有属性都相同（工具调用路由只允许替换 call）。
 */
//@ chunk-e6aww6q8.js:2211768-2211923 layout
function differsOnlyInCall(toolA, toolB) {
  let r = new Set([...Object.keys(toolA), ...Object.keys(toolB)]);
  for (let s of r) if (s !== "call" && Reflect.get(toolA, s) !== Reflect.get(toolB, s)) return !1;
  return !0;
}
/**
 * 从当前查询上下文提取"缓存安全参数"：系统提示词、user/system context、toolUseContext、父消息（forkContextMessages）、advisor 模型、sticky betas。fork 复用这些以命中父请求的提示缓存。
 */
//@ chunk-e6aww6q8.js:2211923-2212169 facade-exports = createCacheSafeParams (0.755)
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
/**
 * 为 context: fork 的 skill 准备运行上下文：校验 skill 可用（同步否决、组织策略、同步插件），选基础代理（skill.agent 或 general-purpose），展开 skill 提示词，
 * 按 allowed/disallowed tools 生成权限层与 getAppState，克隆 readFileState、按需提取附件，返回 promptMessages、baseAgent、availableTools 等。
 */
//@ chunk-e6aww6q8.js:2212169-2215228 facade-exports = prepareForkedCommandContext (0.287)
async function prepareForkedCommandContext(command, args, toolUseContext, agentContext, options) {
  let syncState = await checkCommandSyncedAccess(command);
  if (isSyncedSkill(command) && Gun())
    throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
      `Unknown skill: ${command.name}`,
      "forked skill refused: skills-sync veto",
    );
  if (isShippedSkillExecutionBlocked(command) || isKilledHostCatalogSkill(command))
    throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
      `Unknown skill: ${command.name}`,
      "forked skill refused: withheld by org Skills policy",
    );
  if (LZ(syncState))
    throw (
      gse(command, syncState),
      new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
        `Unknown skill: ${command.name}`,
        "forked skill refused: synced plugin",
      )
    );
  let agentType = command.agent ?? "general-purpose",
    activeAgents = Mtr(toolUseContext.options.agentDefinitions.activeAgents),
    found = activeAgents.find((At) => At.agentType === agentType),
    loadedAgent = found && (await loadListedAgentDefinition(found, toolUseContext.abortController.signal));
  if (found !== void 0 && loadedAgent === void 0)
    throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
      `Agent type '${agentType}' could not be loaded from its plugin, and ${command.name} runs on no other.`,
      "forked skill refused: its agent did not load from its plugin",
    );
  let shellHandOffCommands = [],
    promptBlocks = await applySkillPromptHooks(
      command.name,
      await command.getPromptForCommand(args, {
        ...toolUseContext,
        promptShellHandOff: command.agent === void 0 ? shellHandOffCommands : void 0,
        ...(agentContext && { agentContext: agentContext }),
      }),
      command,
    ),
    allowedTools = splitRuleList(await armedAllowedToolsOf(command)),
    ke = await checkCommandSyncedAccess(command);
  if (LZ(ke))
    throw (
      gse(command, ke),
      new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
        `Unknown skill: ${command.name}`,
        "forked skill refused after its body was fetched: synced plugin",
      )
    );
  let joined = promptBlocks.map((block) => (block.type === "text" ? block.text : "")).join(`
`);
  rSt(
    joined,
    "skill",
    toolUseContext.credentials,
    toolUseContext.storageV5,
    toolUseContext.appendSystemMessage,
  );
  let allowedTools_2 = exe(getBareCommandNameUnlessSynced(command)),
    Ae = allowedTools_2 ? await resolveSkillGitRoot(command, gl()) : void 0;
  function recordInvocation() {
    let At = getInvokedSkills().get(`${toolUseContext.agentId ?? ""}:${command.name}`)?.content ?? "";
    if (
      (addInvokedSkill(
        command.name,
        command.source ? `${command.source}:${command.name}` : command.name,
        At,
        toolUseContext.agentId ?? null,
      ),
      allowedTools_2)
    )
      toolUseContext.applyAttributionOp({ kind: "recordVerification", method: allowedTools_2, checkout: Ae });
  }
  if (!options?.deferInvocationRecording) recordInvocation();
  let disallowedTools = splitRuleList(command.disallowedTools ?? []),
    frozenCommandDenies =
      options?.freezeCommandDenies && !options?.replaceDenyRules
        ? (toolUseContext.getAppState().toolPermissionContext.alwaysDenyRules.command ?? [])
        : void 0,
    modifiedGetAppState = withCommandRuleOverrides(
      toolUseContext.getAppState,
      allowedTools,
      disallowedTools,
      {
        replaceCommandRules: options?.replaceCommandRules,
        replaceDenyRules: options?.replaceDenyRules,
        frozenCommandDenies: frozenCommandDenies,
      },
    ),
    contextLayers = [
      ...(allowedTools.length === 0 ? [] : [{ kind: "allowed_tools", allowedTools: allowedTools }]),
      ...(disallowedTools.length === 0
        ? []
        : [{ kind: "disallowed_tools", disallowedTools: disallowedTools }]),
    ],
    baseAgent =
      loadedAgent ?? activeAgents.find((At) => At.agentType === "general-purpose") ?? activeAgents[0];
  if (!baseAgent) throw Error("No agent available for forked execution");
  if (baseAgent.agentType !== agentType)
    logForDebugging(
      `Forked command ${command.name}: agent '${agentType}' is not available as a fork base, running on '${baseAgent.agentType}'`,
    );
  let forkReadFileState = nv(ZC),
    pt = isSkillShownToModel(command),
    attachmentMessages =
      options?.extractAttachments && !pt
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
              { now: () => new Date().toISOString(), uuid: () => randomUUID_22() },
              toolUseContext.messages,
              "repl_main_thread",
              {
                planSlugSeed: args,
                inputMentionsOnly: !0,
                promptLoopId: agentContext?.agentId ?? options?.forkAgentId,
              },
            ),
          )
        : [];
  for (let [At, It] of forkReadFileState.entries()) if (It.isPartialView) forkReadFileState.delete(At);
  let promptMessages = [
      createUserMessage({
        content: joined,
        isMeta: !0,
        ...(shellHandOffCommands.length > 0 && {
          promptShellHandOff: {
            agentId: agentContext?.agentId ?? options?.forkAgentId ?? null,
            commands: shellHandOffCommands,
          },
        }),
      }),
      ...attachmentMessages,
    ],
    webFetchReadmissionAllowed = !agentDisallowsWebFetch(toolUseContext);
  return {
    skillContent: joined,
    modifiedGetAppState: modifiedGetAppState,
    contextLayers: contextLayers,
    recordInvocation: recordInvocation,
    baseAgent: baseAgent,
    promptMessages: promptMessages,
    forkReadFileState: forkReadFileState,
    webFetchReadmissionAllowed: webFetchReadmissionAllowed,
    availableTools: !webFetchReadmissionAllowed
      ? toolUseContext.options.tools
      : withWebFetchToolForAgent(
          { tools: RB(allowedTools, WEBFETCH) ? allowedTools : void 0, disallowedTools: disallowedTools },
          toolUseContext.options.tools,
          getToolPermissionContext(toolUseContext),
          {
            depth: getAgentDepth(agentContext ?? toolUseContext.agentContext),
            activeAgents: toolUseContext.options.agentDefinitions.activeAgents,
          },
        ),
    frozenCommandDenies: frozenCommandDenies,
  };
}
/**
 * 当前代理（子代理或主线程指定的代理类型）的工具集是否禁止 WebFetch；决定 fork skill 是否重新放行 WebFetch。
 */
//@ chunk-e6aww6q8.js:2215228-2215555 layout
function agentDisallowsWebFetch(toolUseContext) {
  let { agentContext: agentContext } = toolUseContext,
    agentType;
  if (agentContext.agentType === "subagent") agentType = agentContext.subagentName;
  else if (agentContext.agentType === "main") {
    if (((agentType = getMainThreadAgentType()), agentType === void 0)) return !1;
  } else return !0;
  let found = toolUseContext.options.agentDefinitions.activeAgents.find(
    (activeAgent) => activeAgent.agentType === agentType,
  );
  if (found === void 0) return !0;
  let tools = found.tools;
  return (
    RB(found.disallowedTools, WEBFETCH) || (parseWildcardAgentTypes(tools) === null && !RB(tools, WEBFETCH))
  );
}
/**
 * 取代理最后一条 assistant 消息的文本，没有则返回默认文本。
 */
//@ chunk-e6aww6q8.js:2215555-2215658 facade-exports = extractResultText (1)
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
/**
 * 子代理 setAppState 可以回写父状态的字段白名单（只有 frameUrls）。
 */
//@ chunk-e6aww6q8.js:2215658-2215680 layout
var SUBAGENT_WRITABLE_APP_STATE_KEYS = ["frameUrls"];
/**
 * 创建隔离的子代理 ToolUseContext：abortController 默认为父的子控制器；getAppState 默认强制 shouldAvoidPermissionPrompts（加 avoid_prompts 权限层）；
 * readFileState 克隆、文件历史/denial tracking/setAppState 默认隔离（setAppState 只回写 frameUrls）；messageQueue、taskRegistry、凭证等共享；生成新 agentId 与 queryTracking 深度。
 */
//@ chunk-e6aww6q8.js:2215680-2220261 facade-exports = createSubagentContext (0.344)
function createSubagentContext(parentContext, overrides) {
  let abortController =
      overrides?.abortController ??
      (overrides?.shareAbortController
        ? parentContext.abortController
        : createChildAbortController(parentContext.abortController)),
    getAppState = overrides?.getAppState
      ? overrides.getAppState
      : overrides?.shareAbortController
        ? parentContext.getAppState
        : () => {
            let state = parentContext.getAppState();
            if (state.toolPermissionContext.shouldAvoidPermissionPrompts) return state;
            return {
              ...state,
              toolPermissionContext: { ...state.toolPermissionContext, shouldAvoidPermissionPrompts: !0 },
            };
          },
    avoidPromptLayers =
      overrides?.shareAbortController || overrides?.getAppState ? [] : [{ kind: "avoid_prompts" }],
    permissionLayers = [
      ...(parentContext.permissionLayers ?? []),
      ...avoidPromptLayers,
      ...(overrides?.permissionLayers ?? []),
    ],
    options = overrides?.options ?? parentContext.options,
    agentContext = overrides?.agentContext ?? parentContext.agentContext;
  if (overrides?.options && overrides.options.tools !== parentContext.options.tools) {
    let L =
        overrides.options.refreshTools !== void 0 &&
        overrides.options.refreshTools === parentContext.options.refreshTools,
      G =
        overrides.options.refreshMcpClients !== void 0 &&
        overrides.options.refreshMcpClients === parentContext.options.refreshMcpClients;
    if (L || G)
      options = {
        ...overrides.options,
        refreshTools: L ? void 0 : overrides.options.refreshTools,
        refreshMcpClients: G ? void 0 : overrides.options.refreshMcpClients,
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
      stripSeededFromContext: !0,
    }),
    dedupUnchangedReads:
      parentContext.innerCall === !0 && (overrides?.readFileState ?? parentContext.readFileState).size === 0
        ? void 0
        : parentContext.dedupUnchangedReads,
    nestedMemoryAttachmentTriggers: [],
    pendingNestedMemoryTriggers: parentContext.pendingNestedMemoryTriggers,
    sessionEnvVars: parentContext.sessionEnvVars,
    toolState: parentContext.toolState,
    dynamicSkillDirTriggers: [],
    memorySelector: efe(),
    toolDecisions: new Map(),
    contentReplacementState:
      overrides?.contentReplacementState ??
      (parentContext.contentReplacementState
        ? cloneContentReplacementState(parentContext.contentReplacementState)
        : void 0),
    abortController: abortController,
    getAppState: getAppState,
    permissionLayers: permissionLayers,
    markPrResolvedThisSession: parentContext.markPrResolvedThisSession,
    isUltrareviewOverageConfirmed: parentContext.isUltrareviewOverageConfirmed,
    markUltrareviewOverageConfirmed: parentContext.markUltrareviewOverageConfirmed,
    setAppState: overrides?.shareSetAppState
      ? parentContext.setAppState
      : (L) =>
          parentContext.setAppState((G) => {
            let q = L(G);
            if (q === G) return G;
            let Z = !1,
              Se = { ...G };
            for (let ke of SUBAGENT_WRITABLE_APP_STATE_KEYS)
              if (q[ke] !== G[ke]) (Object.assign(Se, { [ke]: q[ke] }), (Z = !0));
            return Z ? Se : G;
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
      : (L) => {
          if (L.kind === "touch") parentContext.applyFileHistoryOp(L);
        },
    applyAttributionOp: parentContext.applyAttributionOp,
    requestDialog: parentContext.requestDialog,
    permissionRelays: parentContext.permissionRelays,
    onCompactEvent: void 0,
    onRetryStatus: overrides?.onRetryStatus,
    options: options,
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
    agentContext: agentContext,
    agentWorktree: parentContext.agentWorktree,
    spawnedByWorkflowRunId: overrides?.spawnedByWorkflowRunId ?? parentContext.spawnedByWorkflowRunId,
    primitiveToolGrant: overrides?.primitiveToolGrant ?? parentContext.primitiveToolGrant,
    precomputeSourceKey: overrides?.precomputeSourceKey,
    teammateContext: overrides?.teammateContext ?? parentContext.teammateContext,
    queryTracking: { chainId: randomUUID_22(), depth: (parentContext.queryTracking?.depth ?? -1) + 1 },
    fileReadingLimits: parentContext.innerCall === !0 ? void 0 : parentContext.fileReadingLimits,
    criticalSystemReminder_EXPERIMENTAL: overrides?.criticalSystemReminder_EXPERIMENTAL,
    requireCanUseTool: overrides?.requireCanUseTool,
    mcpRequestMeta:
      overrides?.mcpRequestMeta ??
      stripHostToolMeta(
        (overrides?.memoryCaller ?? parentContext.memoryCaller) !== void 0
          ? Jro(parentContext.mcpRequestMeta)
          : parentContext.mcpRequestMeta,
      ),
    memoryCaller: overrides?.memoryCaller ?? parentContext.memoryCaller,
    onPermissionDenial: parentContext.onPermissionDenial,
  };
}
/**
 * 父消息里 fork 点的 uuid：末尾若是同一响应拆成的多条 assistant，取第一条。
 */
//@ chunk-e6aww6q8.js:2220261-2220442 facade-exports
function forkPointUuidOf(messages) {
  let n = messages.length - 1,
    r = messages[n];
  if (r?.type === "assistant") {
    let id = r.message.id;
    while (n > 0) {
      let h = messages[n - 1];
      if (h?.type !== "assistant" || h.message.id !== id) break;
      n--;
    }
  }
  return messages[n]?.uuid;
}
/**
 * 正在运行的 fork 代理计数。
 */
//@ chunk-e6aww6q8.js:2220442-2220452 layout
var activeForkCount = 0;
/**
 * runForkedAgent（门面原名）：维护活动 fork 计数后调用内层实现 runForkedAgentImpl。
 */
//@ chunk-e6aww6q8.js:2220452-2220518 facade-exports
async function runForkedAgent(params) {
  activeForkCount++;
  try {
    return await runForkedAgentImpl(params);
  } finally {
    activeForkCount--;
  }
}
/**
 * 运行一个 fork 代理：用 createSubagentContext 建隔离上下文（默认后台、memoryCaller=worker、requireCanUseTool），继承父消息前缀与 sticky betas 以复用缓存；
 * 不声明 ownPrefix 时不许改工具集；循环 runQuery 收集消息与 usage、写 sidechain transcript；结束时清理该代理的 shell 任务与排队消息，并记 tengu_fork_agent_query。
 */
//@ chunk-e6aww6q8.js:2220518-2224904 fingerprint = runForkedAgent (0.62)
async function runForkedAgentImpl({
  promptMessages: promptMessages,
  cacheSafeParams: cacheSafeParams,
  ownPrefix: ownPrefix,
  canUseTool: canUseTool,
  querySource: querySource,
  forkLabel: forkLabel,
  overrides: overrides,
  maxOutputTokens: maxOutputTokens,
  maxTurns: maxTurns,
  onMessage: onMessage,
  onRequestUsage: onRequestUsage,
  onStreamDelta: onStreamDelta,
  skipTranscript: skipTranscript,
  skipCacheWrite: skipCacheWrite,
  skipMessageCacheMarkers: skipMessageCacheMarkers,
  fallbackModel: fallbackModel,
  compactionRequestKind: compactionRequestKind,
  toolChoice: toolChoice,
  apiAttemptsLeft: apiAttemptsLeft,
  thinkingStripPlan: thinkingStripPlan,
  advisorStripPlan: advisorStripPlan,
  divergesAtMessageId: divergesAtMessageId,
  toolCallRoutes: toolCallRoutes,
}) {
  let startTime = Date.now(),
    outputMessages = [],
    compactState = null,
    totalUsage = { ...EMPTY_USAGE },
    {
      userContext: userContext,
      systemContext: systemContext,
      toolUseContext: toolUseContext,
      forkContextMessages: forkContextMessages,
      advisorModel: advisorModel,
      model: model,
    } = cacheSafeParams,
    systemPrompt = ownPrefix?.systemPrompt ?? cacheSafeParams.systemPrompt,
    isolatedToolUseContext = createSubagentContext(toolUseContext, {
      ...overrides,
      isBackgroundAgent: overrides?.isBackgroundAgent ?? !0,
      memoryCaller: overrides?.memoryCaller ?? toolUseContext.memoryCaller ?? "worker",
      options: overrides?.options ?? (fallbackModel !== void 0 ? { ...toolUseContext.options } : void 0),
      ...(model !== void 0 && {
        options: { ...(overrides?.options ?? toolUseContext.options), mainLoopModel: model },
        permissionLayers: [...(overrides?.permissionLayers ?? []), { kind: "model", mainLoopModel: model }],
      }),
      isolationLatch: overrides?.isolationLatch ?? {
        current: toolUseContext.isolationLatch?.current ?? null,
        exemptServers: toolUseContext.isolationLatch?.exemptServers,
      },
      precomputeSourceKey: overrides?.precomputeSourceKey ?? toolUseContext.agentId ?? "main",
      requireCanUseTool: overrides?.requireCanUseTool ?? !0,
    });
  ((isolatedToolUseContext.onPermissionDenial = void 0),
    (isolatedToolUseContext.compactTranscriptUnavailable = !0));
  let getAppState = isolatedToolUseContext.getAppState;
  ((isolatedToolUseContext.getAppState = () => {
    let un = getAppState();
    return un.advisorModel === advisorModel ? un : { ...un, advisorModel: advisorModel };
  }),
    (isolatedToolUseContext.getAdvisorSetting = () => advisorModel));
  let advisorHintMessage = buildAdvisorForkHint({
    forkLabel: forkLabel,
    forkContextMessages: forkContextMessages,
    advisorModel: advisorModel,
  });
  if (advisorHintMessage !== void 0 && promptMessages.length > 0 && !promptMessages.some(tlr))
    promptMessages = [...promptMessages, advisorHintMessage];
  let continuesParentPrefix = ownPrefix === void 0 && forkContextMessages.length > 0;
  if (continuesParentPrefix && isolatedToolUseContext.options.tools !== toolUseContext.options.tools)
    throw Error("runForkedAgent: a fork changed its parent's tools without stating ownPrefix");
  if (toolCallRoutes !== void 0 && toolCallRoutes.size > 0) {
    if (!continuesParentPrefix)
      throw Error("runForkedAgent: tool call routes need a fork that continues its parent's prefix");
    let tools = toolUseContext.options.tools;
    for (let [ao, $o] of toolCallRoutes)
      if (!tools.includes(ao) || !differsOnlyInCall(ao, $o))
        throw Error(
          "runForkedAgent: a tool call route must replace one of the parent's tools with a copy that differs only in call",
        );
    isolatedToolUseContext.options = {
      ...isolatedToolUseContext.options,
      tools: tools.map((ao) => toolCallRoutes.get(ao) ?? ao),
    };
  }
  let initialMessages = [
      ...(ownPrefix === void 0 ? forkContextMessages : isNullRenderingAttachment(forkContextMessages)),
      ...promptMessages,
    ],
    forkPointUuid = forkPointUuidOf(forkContextMessages),
    transcriptAgentId = skipTranscript ? void 0 : makeSaltedName(forkLabel),
    lastRecordedUuid = null;
  if (transcriptAgentId)
    (await recordSidechainTranscript(
      promptMessages,
      transcriptAgentId,
      void 0,
      toolUseContext.storageV5,
    ).catch((err) =>
      logForDebugging(`Forked agent [${forkLabel}] failed to record initial transcript: ${err}`),
    ),
      (lastRecordedUuid = promptMessages.at(-1)?.uuid ?? null));
  let turnLimit = maxTurns ?? Iin,
    assistantTurns = 0,
    parentStickyBetas = cacheSafeParams.stickyBetas ?? getStickyBetas(),
    stickyBetas = continuesParentPrefix
      ? cloneStickyBetaLatches(parentStickyBetas)
      : Qun(forkStickyBetaLatches(parentStickyBetas));
  isolatedToolUseContext.stickyBetas = stickyBetas;
  let relayFork =
    !toolUseContext.agentId &&
    continuesParentPrefix &&
    getMainLoopModel_2(isolatedToolUseContext) === getMainLoopModel_2(toolUseContext) &&
    getFeatureValue_CACHED_MAY_BE_STALE("tengu_wild_tome", !1);
  try {
    for await (let message of isolatedToolUseContext.options.runQuery({
      messages: initialMessages,
      systemPrompt: systemPrompt,
      userContext: userContext,
      systemContext: systemContext,
      canUseTool: canUseTool,
      toolUseContext: isolatedToolUseContext,
      querySource: querySource,
      fallbackModel: fallbackModel,
      maxOutputTokensOverride: maxOutputTokens,
      maxTurns: turnLimit,
      skipCacheWrite: skipCacheWrite,
      skipMessageCacheMarkers: skipMessageCacheMarkers,
      relayFork: relayFork,
      compactionRequestKind: compactionRequestKind,
      toolChoice: toolChoice,
      apiAttemptsLeft: apiAttemptsLeft,
      forkPointUuid: forkPointUuid,
      divergesAtMessageId: divergesAtMessageId,
      thinkingStripPlan: thinkingStripPlan,
      advisorStripPlan: advisorStripPlan,
      stickyBetas: stickyBetas,
      agentCacheTtlOverride: cacheSafeParams.agentCacheTtlOverride,
    })) {
      if (isStreamEvent(message)) {
        if (
          (onStreamDelta?.(message),
          message.type === "stream_event" && message.event?.type === "message_delta" && message.event.usage)
        ) {
          let turnUsage = mRe({ ...EMPTY_USAGE }, message.event.usage);
          ((totalUsage = addUsage_2(totalUsage, turnUsage)), onRequestUsage?.(turnUsage));
        }
        continue;
      }
      if (message.type === "tombstone") {
        let lastIndex = outputMessages.findLastIndex(($o) => $o.uuid === message.message.uuid);
        if (lastIndex !== -1) outputMessages.splice(lastIndex, 1);
        continue;
      }
      if (isTransientMessage(message)) continue;
      if (message.type === "assistant") assistantTurns++;
      if (
        (logForDebugging(`Forked agent [${forkLabel}] received message: type=${message.type}`),
        outputMessages.push(message),
        (compactState = applyPreservedMessages(outputMessages, message, compactState, initialMessages)),
        onMessage?.(message),
        transcriptAgentId &&
          (message.type === "assistant" ||
            message.type === "user" ||
            message.type === "progress" ||
            (message.type === "attachment" && isLoggableMessage(message))))
      ) {
        if (
          (await recordSidechainTranscript(
            [message],
            transcriptAgentId,
            lastRecordedUuid,
            toolUseContext.storageV5,
          ).catch((ao) => logForDebugging(`Forked agent [${forkLabel}] failed to record transcript: ${ao}`)),
          message.type !== "progress")
        )
          lastRecordedUuid = message.uuid;
      }
    }
  } finally {
    if (compactState) outputMessages.push(...compactState.preserved);
    if (isolatedToolUseContext.agentId)
      try {
        let agentId = isolatedToolUseContext.agentId;
        (killShellTasksForAgent(agentId, isolatedToolUseContext.taskRegistry),
          isolatedToolUseContext.messageQueue.dequeueAllMatching((err) => err.agentId === agentId));
      } catch (error) {
        logForDebugging(`[runForkedAgent] shell-task reap failed (continuing teardown): ${error}`);
      }
    (isolatedToolUseContext.readFileState.clear(), (initialMessages.length = 0));
  }
  logForDebugging(
    `Forked agent [${forkLabel}] finished: ${outputMessages.length} messages, types=[${outputMessages.map((un) => un.type).join(", ")}], totalUsage: input=${totalUsage.input_tokens} output=${totalUsage.output_tokens} cacheRead=${totalUsage.cache_read_input_tokens} cacheCreate=${totalUsage.cache_creation_input_tokens}`,
  );
  let durationMs = Date.now() - startTime;
  if (maxTurns === void 0 && assistantTurns >= Iin)
    logEvent("tengu_forked_agent_default_turns_exceeded", {
      forkLabel: fromEnum(forkLabel),
      querySource: agentTypeForTelemetry(querySource),
      turnCount: assistantTurns,
    });
  return (
    logForkAgentQueryEvent({
      forkLabel: forkLabel,
      querySource: querySource,
      durationMs: durationMs,
      messageCount: outputMessages.length,
      totalUsage: totalUsage,
      queryTracking: toolUseContext.queryTracking,
      relayEligible: relayFork,
    }),
    { messages: outputMessages, totalUsage: totalUsage }
  );
}
/**
 * 记 tengu_fork_agent_query：耗时、消息数、token 与缓存命中率、查询链深度。
 */
//@ chunk-e6aww6q8.js:2224904-2225644 fingerprint = logForkAgentQueryEvent (0.977)
function logForkAgentQueryEvent({
  forkLabel: forkLabel,
  querySource: querySource,
  durationMs: durationMs,
  messageCount: messageCount,
  totalUsage: totalUsage,
  queryTracking: queryTracking,
  relayEligible: relayEligible,
}) {
  let totalInputTokens =
      totalUsage.input_tokens + totalUsage.cache_creation_input_tokens + totalUsage.cache_read_input_tokens,
    cacheHitRate = totalInputTokens > 0 ? totalUsage.cache_read_input_tokens / totalInputTokens : 0;
  logEvent("tengu_fork_agent_query", {
    forkLabel: fromEnum(forkLabel),
    querySource: agentTypeForTelemetry(querySource),
    durationMs: durationMs,
    messageCount: messageCount,
    relayEligible: relayEligible,
    inputTokens: totalUsage.input_tokens,
    outputTokens: totalUsage.output_tokens,
    cacheReadInputTokens: totalUsage.cache_read_input_tokens,
    cacheCreationInputTokens: totalUsage.cache_creation_input_tokens,
    serviceTier: fromEnum(totalUsage.service_tier),
    cacheCreationEphemeral1hTokens: totalUsage.cache_creation.ephemeral_1h_input_tokens,
    cacheCreationEphemeral5mTokens: totalUsage.cache_creation.ephemeral_5m_input_tokens,
    cacheHitRate: cacheHitRate,
    ...(queryTracking && { queryChainId: ye(queryTracking.chainId), queryDepth: queryTracking.depth }),
  });
}

export {
  forkPointUuidOf,
  createSubagentContext,
  runForkedAgent,
  IGt,
  setLastCacheSafeForkMessages,
  getLastCacheSafeParams,
  prepareForkedCommandContext,
  extractResultText,
  createCacheSafeParams,
  VR,
  saveCacheSafeParams,
  getLastCacheSafeParamsForSameModel,
  isMainThreadCacheWarm,
};
