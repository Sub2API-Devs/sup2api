/**
 * tools/SkillTool/SkillTool.ts
 *
 * Skill 工具：解析与校验 skill 名、权限规则、inline 展开或 fork 子代理执行，返回 contextLayers
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/tools/SkillTool/SkillTool.ts
 * pieces: chunk-a5k9jscj.js (20), chunk-csq9ftr9.js (1), chunk-e6aww6q8.js (1)
 * attribution: sole-consumer 10, fingerprint 6, layout 1, file-local 1, placement 4
 */
import {
  isHiddenFromModel,
  isSyncedOrManagedSkill,
  Z5,
  isHostCatalogSkill,
  V1t,
} from "../../utils/commandPredicates.js";
import { claimOnce } from "../../services/api/verificationRequired.js";
import { logFeatureSad, logFeatureOk, logFeatureBad } from "../../services/analytics/featureTelemetry.js";
import {
  getIsNonInteractiveSession,
  getPermissionPromptToolName,
  getProjectRootOrNull,
  getSessionSkillAllowlist,
  clearInvokedSkillsForAgent,
  getInvokedSkills,
  getDisableSlashCommands,
} from "../../bootstrap/state.js";
import {
  withNamedFolderYieldsRestored,
  getCommands,
  dropShadowedFallbackSkills,
  isSkillToolCommand,
  filterCommandsByAllowlist,
  findCommand,
  isFirstPartyCommandName,
  matchesUnqualifiedName,
  resolveBarePluginSkillName,
  getBareCommandName,
  builtInCommandNames,
  shippedCommandNames,
  getCommandName,
  getCommandContextMode,
  isProjectScopedCommand,
} from "../../commands.js";
import { withReservedLabels, SKILL } from "./skillToolNames.js";
import { QRe } from "../../services/memorySync/memorySkills.js";
import {
  M8s,
  checkSkillPermission,
  matchesSkillRule,
  P8s,
  reservedSkillRuleMatch,
  describeSyncedSkillRuleScope,
} from "./skillPermissions.js";
import { isHumanOrUnset } from "../../utils/messageProvenance.js";
import { COMMAND_MESSAGE } from "../../constants/xml.js";
import {
  getUserMessageText,
  normalizeMessages,
  extractAgentIdsFromMessages_2,
  createProgressMessage_2,
  getLastAssistantMessage,
  INTERRUPT_MESSAGE_FOR_TOOL_USE,
  createUserMessage,
} from "../../utils/messages.js";
import { makeSaltedName } from "../../utils/agentId.js";
import {
  sanitizeSkillNameForTelemetry,
  parentSkillFields,
  logSkillsLoaded,
  skillLoadedSource,
} from "../../utils/telemetry/skillLoadedEvent.js";
import { recordPluginActivity, commandActivity } from "../../utils/pluginActivity.js";
import { logEvent } from "../../services/analytics/index.js";
import { lit, fromEnum } from "../../services/analytics/safeMetadata.js";
import { ye } from "../../utils/startupMarks.js";
import { getTeamTipAttribution, getTeammateAuthor } from "../../services/tips/teamArtifactTips.js";
import {
  getSkillPluginTelemetryFields,
  buildServerAttributionFields,
  recordPluginUsage,
} from "../../utils/telemetry/pluginTelemetry.js";
import { getAgentDepth, getWorkflowRunFields } from "../../utils/agentContext.js";
import {
  shouldBackgroundForkedSkill,
  scopedSkillVariantNote,
  runForkedAgent,
  registerForkedSkillTask,
  matchingSkillVariants,
} from "./forkedSkill.js";
import { prepareForkedCommandContext, extractResultText } from "../../utils/forkedAgent.js";
import {
  resolveAgentTools,
  withWebFetchToolForAgent,
  o7e,
  adoptSubagentPublishArmsAsync,
} from "../AgentTool/agentToolUtils.js";
import { getToolPermissionContext } from "../../utils/permissions/toolPermissionContext.js";
import { bN } from "../../services/accountMemory/memoryContext.js";
import { logForDebugging } from "../../utils/debug.js";
import { isBuiltInAgent } from "../AgentTool/loadAgentsDir.js";
import { runAgent, filterIncompleteToolCalls_2 } from "../AgentTool/runAgent.js";
import { i2n } from "../../utils/model/agentModelRestriction.js";
import { TZ, fq } from "../../utils/agentListing.js";
import { zPe, isSillyShoreGateOn } from "../../utils/messages/untrustedArtifactContent.js";
import { DoctorLazy } from "../../cli/handlers/util.js";
import { u, o, M, A, T, Ue } from "../../../vendor/zod/v4/classic/schemas.js";
import { currentMcpClients } from "../../services/compact/idleToolResultClearing.js";
import { hW } from "../../utils/agentProcessRegistry.js";
import { isCoordinatorMainThread } from "../../coordinator/coordinatorMode.js";
import { isNonEmptyIdentifier } from "../../utils/sanitization.js";
import {
  TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS,
  AbortError,
} from "../../utils/errors.js";
import { recordSkillInvoked } from "../../utils/suggestions/skillUsageTracking.js";
import { pluginInputHoldReason } from "../../plugins/functionHooks/inputHold.js";
import {
  Vjr,
  getContentRulesMapForTool,
  toolAlwaysAllowedRule,
} from "../../utils/permissions/permissions.js";
import { inlineSkillModelOverride, resolveSkillModelOverride } from "../../utils/model/model.js";
import { metaMessageText, SKILL_TRUNCATION_NOTE } from "../../services/compact/compact.js";
import { isSkillModelOverrideAllowedInMode } from "../../utils/betas.js";
import { buildTool } from "../../services/tools/permissionCheckGuard.js";
import { getSkillToolPrompt } from "./prompt.js";
import { stripSyncedSkillPrefix } from "../../skills/syncedSkills.js";
import {
  Zoe,
  isSyncedSkillPlaceholder,
  w3n,
  startPendingDownload,
  S3n,
} from "../../utils/claudeAiSync/skillsSync.js";
import { raceWithAbortSignal } from "../../utils/sleep.js";
import { qCe } from "../../utils/claudeAiSync/syncedSkillAccess.js";
import { suggestClosestName } from "../../utils/settings/managedEnvKeys.js";
import { vZ } from "../../skills/reservedSkillNames.js";
import { ypr } from "../../utils/plugins/pluginLoadState.js";
import { pluginLoadFailureNote } from "./pluginLoadFailureNote.js";
import { B2 } from "../../utils/permissions/permissionRulePayload.js";
import { renderToolUseMessage } from "./UI.js";
import { restoreSkillStateFromMessages } from "../../utils/conversationRecovery.js";
import { getSubagentSteer } from "../../utils/model/subagentSteer.js";
import {
  isOfficialMarketplaceName_3,
  parsePluginIdentifier_2,
} from "../../utils/plugins/pluginIdentifier.js";
import { DEFERREDTOOLPLACEHOLDER } from "../ToolSearchTool/prompt.js";

//@ chunk-a5k9jscj.js:3587-3613 sole-consumer
function he() {
  return null;
}
//@ chunk-a5k9jscj.js:3613-3830 sole-consumer
function dedupeSkillsByName(e) {
  let n = new Map(),
    s = (i) => Boolean(i.disableModelInvocation) || isHiddenFromModel(i);
  for (let i of e) {
    let d = n.get(i.name);
    if (
      d === void 0 ||
      (s(d) && !s(i) && i.type === "prompt" && !(isSyncedOrManagedSkill(d) && !isSyncedOrManagedSkill(i)))
    )
      n.set(i.name, i);
  }
  return [...n.values()];
}
//@ chunk-a5k9jscj.js:3830-4061 sole-consumer
function logReservedRuleHeldBack(e) {
  if (!claimOnce().claim(`skill_reserved_namespace_rule_held_back_${e}`)) return;
  logFeatureSad(
    "skill_reserved_namespace",
    e === "nonholder" ? "nonholder_allow_rule" : "prefix_at_namespace_boundary",
    { interactive: !getIsNonInteractiveSession(), host_prompt: getPermissionPromptToolName() !== void 0 },
  );
}
/**
 * 汇总 Skill 工具可调用的命令：本地命令、MCP 技能（含收编的）与内置技能，按名去重并去掉被遮蔽的后备技能。
 */
//@ chunk-a5k9jscj.js:4061-4370 sole-consumer
async function getSkillToolCommandList(e) {
  let n = withNamedFolderYieldsRestored(await getCommands(getProjectRootOrNull(), e.storageV5)),
    mcpCommands = e.mcpCommands(),
    filtered = mcpCommands.filter((_) => _.type === "prompt" && _.loadedFrom === "mcp"),
    d = withReservedLabels([...filtered, ...(he()?.adoptedMcpSkillCommands(e.mcpClients()) ?? [])], n),
    sliced = d.slice(0, filtered.length),
    sliced_2 = d.slice(filtered.length),
    r = QRe(),
    h = Z5(n, mcpCommands),
    I = dedupeSkillsByName([...h, ...r, ...sliced]);
  return [...dropShadowedFallbackSkills(I), ...sliced_2];
}
//@ chunk-a5k9jscj.js:4370-4430 sole-consumer
function ce(e, n) {
  let filtered = e.filter(isSkillToolCommand);
  return n ? filterCommandsByAllowlist(filtered, getSessionSkillAllowlist()) : filtered;
}
/**
 * 插件 prompt skill 是否是通过别名（不是正名）被命中的。
 */
//@ chunk-a5k9jscj.js:4430-4535 sole-consumer = formatCommandDescription (0.874)
function formatCommandDescription(e, n) {
  return e.type === "prompt" && e.source === "plugin" && e.name !== n && (e.aliases?.includes(n) ?? !1);
}
/**
 * 按名称解析 Skill 工具要调用的技能：目录列表名命中、精确命中（同名限定版本有多个时为 ambiguous）、一方命令或未限定名命中时为 none，否则尝试按插件技能的裸名给出唯一建议或歧义候选。
 */
//@ chunk-a5k9jscj.js:4535-5257 sole-consumer
function resolveSkillName(name, commands, context) {
  let isMainAgent = context.agentId === void 0,
    command = findCommand(name, commands);
  if (command?.type === "prompt" && command.directoryListingName === name)
    return { kind: "listingName", command: void 0, listed: command };
  if (command !== void 0) {
    let v = formatCommandDescription(command, name) ? ce(commands, isMainAgent) : [];
    if (v.includes(command)) {
      let filtered = v.filter(
        (h) =>
          formatCommandDescription(h, name) ||
          (h.type === "prompt" && h.loadedFrom !== "syncedSkills" && h.name.endsWith(`:${name}`)),
      );
      if (filtered.length > 1) return { kind: "ambiguous", command: void 0, candidates: filtered };
    }
    return { kind: "exact", command: command };
  }
  if (isFirstPartyCommandName(name) || commands.some((v) => matchesUnqualifiedName(v, name)))
    return { kind: "none", command: void 0 };
  let bareMatch = resolveBarePluginSkillName(name, ce(commands, isMainAgent));
  switch (bareMatch.kind) {
    case "unique":
      return { kind: "suggestion", command: void 0, suggestion: bareMatch.command };
    case "ambiguous":
      return { kind: "ambiguous", command: void 0, candidates: bareMatch.candidates };
    case "none":
      return { kind: "none", command: void 0 };
  }
}
//@ chunk-a5k9jscj.js:5257-5399 sole-consumer
function isSelfForkedSkill(e, n) {
  return (
    e.type === "prompt" &&
    (e.context === "fork" || (e.getContext !== void 0 && n.spawnedByForkedSkill === !0)) &&
    n.spawnedBySkill === getBareCommandName(e)
  );
}
//@ chunk-a5k9jscj.js:5399-5591 sole-consumer
async function isYieldedSkillTarget(e, n, s, i) {
  if (!s.some((v) => v.type === "prompt" && v.pluginInfo?.namedFolderYield?.yielded.includes(e) === !0))
    return !0;
  let k = await getCommands(getProjectRootOrNull(), i, void 0, !0);
  return findCommand(e, k)?.name === n.name;
}
/**
 * 主会话本轮中用户是否亲手输入了该 skill 名（排除 meta、压缩摘要、交接、非键入文本、工具结果与命令消息），影响 userTypedThisTurn 判断。
 */
//@ chunk-a5k9jscj.js:5591-6044 sole-consumer
function userTypedSkillThisTurn(e, n) {
  if (n.agentId !== void 0) return !1;
  let s = M8s(e);
  for (let i = n.messages.length - 1; i >= n.turnStartIndex; i--) {
    let d = n.messages[i];
    if (
      d.type !== "user" ||
      d.isMeta ||
      d.isCompactSummary ||
      !isHumanOrUnset(d.origin) ||
      d.verifiedSlackHumanTurn === !0 ||
      d.handedOff === !0 ||
      d.textNotTyped === !0
    )
      continue;
    let content = d.message.content;
    if (typeof content === "string") {
      if (content.includes(`<${COMMAND_MESSAGE}>`)) continue;
    } else if (content.some((v) => v.type === "tool_result")) continue;
    if (s.test(getUserMessageText(d) ?? "")) return !0;
  }
  return !1;
}
/**
 * 以子代理执行 fork 型 skill：准备 fork 上下文（工具集、权限层、文件读状态、技能正文），可选后台运行（返回 "Running in the background as @名字"）；前台用 runAgent 跑完，转发子代理进度（skill_progress），最终返回 forked 结果文本与首行 toolsUsedLine。
 */
//@ chunk-a5k9jscj.js:6044-10399 fingerprint = executeForkedSkill (0.557)
async function executeForkedSkill(
  command,
  skillName,
  args,
  toolUseContext,
  canUseTool,
  parentMessage,
  invokingSkill,
  onProgress,
  timing,
) {
  let startTime = Date.now(),
    agentId = makeSaltedName(),
    isBuiltIn = builtInCommandNames().has(skillName),
    isOfficialSkill = isOfficialMarketplaceSkill(command),
    L = command.source === "bundled",
    { sanitizedName: sanitizedName, skillNameHash: skillNameHash } = sanitizeSkillNameForTelemetry({
      rawName: skillName,
      canonicalName: command.name,
      isMcp: command.loadedFrom === "mcp",
      isBuiltIn: isBuiltIn,
      isBundled: L,
      isOfficial: isOfficialSkill,
    }),
    te = toolUseContext.queryTracking?.depth ?? 0,
    Z = te > 0 ? "nested-skill" : "claude-proactive",
    agentId_2 = toolUseContext.agentId;
  if (command.pluginInfo)
    recordPluginActivity(
      command.pluginInfo.repository,
      "skill",
      commandActivity(command, command.pluginInfo.pluginManifest.name),
    );
  (logEvent("tengu_skill_tool_invocation", {
    command_name: sanitizedName,
    _PROTO_skill_name: skillName,
    ...skillNameHash,
    execution_context: lit("fork"),
    invocation_trigger: fromEnum(Z),
    query_depth: te,
    ...(toolUseContext.queryTracking && { query_chain_id: ye(toolUseContext.queryTracking.chainId) }),
    ...parentSkillFields(invokingSkill, invokingSkill !== void 0 && shippedCommandNames().has(invokingSkill)),
    ...(agentId_2 && { parent_agent_id: ye(agentId_2) }),
    ...logSkillsLoaded(command.source, command.loadedFrom, command.kind, command.createdBy),
    ...getTeamTipAttribution(command.source, skillName),
    attribution_shown: getTeammateAuthor(toolUseContext.session, command.source, skillName) !== null,
    skill_content_chars: command.contentLength,
    ...!1,
    ...(command.pluginInfo && getSkillPluginTelemetryFields(command)),
    ...buildServerAttributionFields(command),
  }),
    skillLoadedSource(skillName, command, Z, toolUseContext.agentContext));
  let P = {
      agentId: agentId,
      parentAgentId: toolUseContext.agentId,
      depth: getAgentDepth(toolUseContext.agentContext) + 1,
      agentType: "subagent",
      isAsync: !1,
      isBackgroundAgent:
        toolUseContext.agentContext.agentType === "main" ? !1 : toolUseContext.agentContext.isBackgroundAgent,
      ...getWorkflowRunFields(toolUseContext.agentContext),
    },
    runInBackground = shouldBackgroundForkedSkill(command, toolUseContext),
    N = runInBackground || toolUseContext.spawnedByWorkflowRunId !== void 0,
    {
      modifiedGetAppState: modifiedGetAppState,
      contextLayers: contextLayers,
      recordInvocation: recordInvocation,
      baseAgent: baseAgent,
      promptMessages: promptMessages,
      skillContent: skillContent,
      forkReadFileState: forkReadFileState,
      availableTools: availableTools,
      webFetchReadmissionAllowed: webFetchReadmissionAllowed,
      frozenCommandDenies: frozenCommandDenies,
    } = await prepareForkedCommandContext(command, args || "", toolUseContext, P, {
      replaceCommandRules: N,
      freezeCommandDenies: N,
      deferInvocationRecording: N,
    }),
    se = await scopedSkillVariantNote(command, getProjectRootOrNull(), {
      options: {
        tools: resolveAgentTools(
          baseAgent,
          webFetchReadmissionAllowed
            ? withWebFetchToolForAgent(baseAgent, availableTools, getToolPermissionContext(toolUseContext), {
                activeAgents: toolUseContext.options.agentDefinitions.activeAgents,
              })
            : availableTools,
          runInBackground,
          !1,
          !1,
          0,
          bN(toolUseContext).mode,
        ).resolvedTools,
        spawnedBySkill: getBareCommandName(command),
      },
      storageV5: toolUseContext.storageV5,
      session: toolUseContext.session,
    });
  if (se) promptMessages.push(se);
  let ie =
      command.getEffort?.(args || "", toolUseContext) ??
      command.getDefaultEffort?.(args || "", toolUseContext)?.value ??
      command.effort,
    agentDefinition = ie !== void 0 ? { ...baseAgent, effort: ie } : baseAgent,
    agentMessages = [];
  if (
    (logForDebugging(`SkillTool executing forked skill ${skillName} with agent ${agentDefinition.agentType}`),
    runInBackground)
  ) {
    let Q = await runForkedAgent({
      agentId: agentId,
      agentDefinition: agentDefinition,
      command: command,
      description: `/${getCommandName(command)} ${args ?? ""}`.trim(),
      prompt: skillContent,
      promptMessages: promptMessages,
      context: toolUseContext,
      canUseTool: canUseTool,
      getAppState: modifiedGetAppState,
      permissionLayers:
        contextLayers.length > 0
          ? [...(toolUseContext.permissionLayers ?? []), ...contextLayers]
          : toolUseContext.permissionLayers,
      readFileState: forkReadFileState,
      availableTools: availableTools,
      webFetchReadmissionAllowed: webFetchReadmissionAllowed,
      spawnedBySkill: getBareCommandName(command),
      recordInvocationOnSuccess: recordInvocation,
      frozenCommandDenies: frozenCommandDenies,
    });
    if (Q)
      return (
        logFeatureOk("skill_invoke"),
        {
          data: {
            success: !0,
            commandName: skillName,
            status: "forked",
            background: !0,
            agentId: agentId,
            result: `Running in the background as @${Q.name}`,
          },
        }
      );
    recordInvocation();
  }
  let re = { ...P, subagentName: agentDefinition.agentType, isBuiltIn: isBuiltInAgent(agentDefinition) },
    forwardSubagentText = toolUseContext.options.forwardSubagentText,
    le = (Q, ne) => {
      onProgress?.({
        type: "progress",
        toolUseID: `skill_${parentMessage.message.id}`,
        data: {
          message: Q,
          type: "skill_progress",
          prompt: ne,
          agentId: agentId,
          agentType: agentDefinition.agentType,
          description: command.description,
        },
      });
    },
    de = registerForkedSkillTask({
      agentId: agentId,
      parentAgentId: agentId_2,
      spawnDepth: getAgentDepth(re),
      skillName: getCommandName(command),
      prompt: skillContent,
      selectedAgent: agentDefinition,
      taskRegistry: toolUseContext.taskRegistry,
      toolUseId: toolUseContext.toolUseId,
      callerAbortController: toolUseContext.abortController,
    }),
    ee = "failed";
  try {
    let found = normalizeMessages(promptMessages).find((F) => F.type === "user");
    if (found) le({ ...found, isMeta: void 0 }, skillContent);
    let ne = !1,
      B = timing?.mark("model");
    for await (let message of runAgent({
      agentDefinition: agentDefinition,
      promptMessages: promptMessages,
      turnPrompt: skillContent,
      onModelRestricted: i2n(getBareCommandName(command), onProgress),
      toolUseContext: {
        ...toolUseContext,
        getAppState: modifiedGetAppState,
        permissionLayers:
          contextLayers.length > 0
            ? [...(toolUseContext.permissionLayers ?? []), ...contextLayers]
            : toolUseContext.permissionLayers,
      },
      canUseTool: canUseTool,
      isAsync: !1,
      querySource: "agent:custom",
      spawnedBySkill: getBareCommandName(command),
      spawnedByForkedSkill: !0,
      model: command.model,
      availableTools: availableTools,
      webFetchReadmissionAllowed: webFetchReadmissionAllowed,
      override: {
        agentId: agentId,
        agentContext: re,
        abortController: de.abortController,
        shareFileHistory: !0,
        readFileState: forkReadFileState,
      },
    })) {
      if (message.type === "api_metrics") {
        onProgress?.(message);
        continue;
      }
      if (
        message.type === "set_in_progress_tool_use_ids" ||
        message.type === "spinner_mode" ||
        message.type === "query_model_change"
      )
        continue;
      if ((agentMessages.push(message), extractAgentIdsFromMessages_2(message))) {
        if (filterIncompleteToolCalls_2(toolUseContext, message))
          onProgress?.(createProgressMessage_2(message));
        continue;
      }
      if (message.type !== "assistant" && message.type !== "user") continue;
      if (!onProgress) continue;
      if (message.type === "user" && message.isMeta && !ne) continue;
      if (message.type === "assistant") ne = !0;
      for (let ve of normalizeMessages([message])) {
        let be = ve.message.content[0];
        if (!forwardSubagentText && be?.type !== "tool_use" && be?.type !== "tool_result") continue;
        le(ve, "");
      }
    }
    B?.();
    let normalizedNew = o7e(getLastAssistantMessage(agentMessages));
    if (!normalizedNew) {
      if (
        (adoptSubagentPublishArmsAsync(agentId, toolUseContext),
        toolUseContext.spawnedByWorkflowRunId !== void 0)
      )
        recordInvocation();
    }
    let fe = TZ(fq(agentMessages), toolUseContext.messages),
      ke = zPe(agentMessages) + extractResultText(agentMessages, "Skill execution completed");
    agentMessages.length = 0;
    let Se = Date.now() - startTime;
    return (
      logForDebugging(`SkillTool forked skill ${skillName} completed in ${Se}ms`),
      logFeatureOk("skill_invoke"),
      (ee = normalizedNew ? "failed" : "completed"),
      {
        data: {
          success: !0,
          commandName: skillName,
          status: "forked",
          agentId: agentId,
          result: ke,
          ...(fe !== void 0 && { toolsUsedLine: fe }),
        },
      }
    );
  } finally {
    (de.remove(ee), clearInvokedSkillsForAgent(agentId));
  }
}
/**
 * Skill 输入 schema（skill 名、args 可选）与输出 schema（inline：allowedTools/model/readOnly；forked：agentId/result/background/toolsUsedLine）。
 */
//@ chunk-a5k9jscj.js:10399-11777 fingerprint = outputSchema (0.662)
var skillInputSchema = DoctorLazy(() =>
    u({
      skill: o().describe("The name of a skill from the available-skills list. Do not guess names."),
      args: o().optional().describe("Optional arguments for the skill"),
    }),
  ),
  skillOutputSchema = DoctorLazy(() => {
    let e = u({
        success: M().describe("Whether the skill is valid"),
        commandName: o().describe("The name of the skill"),
        allowedTools: A(o()).optional().describe("Tools allowed by this skill"),
        model: o()
          .optional()
          .describe(
            "Resolved model the skill turn runs on when a frontmatter model override took effect; omitted otherwise",
          ),
        status: T("inline").optional().describe("Execution status"),
        readOnly: M()
          .optional()
          .describe("True when the skill instructions were loaded read-only (nothing was executed)"),
      }),
      n = u({
        success: M().describe("Whether the skill completed successfully"),
        commandName: o().describe("The name of the skill"),
        status: T("forked").describe("Execution status"),
        agentId: o().describe("The ID of the sub-agent that executed the skill"),
        result: o().describe("The result from the forked skill execution"),
        background: M()
          .optional()
          .describe(
            "True when the sub-agent was launched in the background: `result` describes the launch, and the skill outcome arrives later as a task notification.",
          ),
        toolsUsedLine: o()
          .optional()
          .describe(
            "The tools-used-before-summary line the tool_result opens with: the tools the sub-agent called that this conversation's requests did not yet name",
          ),
      });
    return Ue([e, n]);
  });
//@ chunk-a5k9jscj.js:11777-11888 layout
function makeSkillCommandSource(e) {
  return {
    storageV5: e.storageV5,
    mcpCommands: () => e.getAppState().mcp.commands,
    mcpClients: () => currentMcpClients(e),
  };
}
/**
 * Skill 调用主体（runEngine 执行）：停止中的代理不能再启动 skill；解析 skill 名（重名报歧义），设置 options.activeSkill；fork 型 skill（且非只读加载）交给 executeForkedSkill；否则 processPromptSlashCommand 展开 skill 正文为新消息（过滤进度与命令标签消息，标注 toolUseID），记录遥测，返回 allowedTools/模型/effort 三类 contextLayers 供后续回合生效。
 */
//@ chunk-a5k9jscj.js:11888-15630 fingerprint = SkillTool (0.407)
async function runSkillInvocation({
  input: { skill: e, args: n },
  toolUseContext: toolUseContext,
  canUseTool: canUseTool,
  parentMessage: parentMessage,
  onProgress: onProgress,
  timing: timing,
}) {
  if (toolUseContext.agentId !== void 0 && hW(toolUseContext.agentId))
    throw (
      logFeatureBad("subagent_launch", "skill_fork_spawner_stop_pending"),
      Error("This agent has been stopped and its stop is still completing; it cannot launch skills.")
    );
  let trimmed = e.trim(),
    skillName = trimmed.startsWith("/") ? trimmed.substring(1) : trimmed,
    activeSkill = toolUseContext.options.activeSkill,
    invokingSkill = activeSkill ?? toolUseContext.options.spawnedBySkill;
  toolUseContext.options.activeSkill = skillName;
  let isReadOnlyLoad = isCoordinatorMainThread(toolUseContext),
    completed = !1;
  try {
    let commands = await getSkillToolCommandList(makeSkillCommandSource(toolUseContext)),
      resolution = resolveSkillName(skillName, commands, toolUseContext);
    if (resolution.kind === "ambiguous") {
      let B = resolution.candidates.every((candidate) => isNonEmptyIdentifier(candidate.name))
        ? `: ${resolution.candidates.map((candidate) => candidate.name).join(", ")}`
        : "";
      throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
        `Skill ${skillName} now matches several skills${B} \u2014 invoke one by its full name.`,
        "Skill tool: bare name ambiguous at dispatch",
      );
    }
    let command = resolution.command,
      Z = null;
    if (command) toolUseContext.options.activeSkill = getBareCommandName(command);
    if (!isReadOnlyLoad) {
      if (
        (recordSkillInvoked(
          toolUseContext.session,
          command?.name ?? skillName,
          toolUseContext.storageV5,
          skillName,
        ),
        command?.type === "prompt" && command.pluginInfo)
      )
        recordPluginUsage(command.pluginInfo.repository);
    }
    if (
      command?.type === "prompt" &&
      getCommandContextMode(command, n || "", toolUseContext) === "fork" &&
      !isReadOnlyLoad
    ) {
      let B =
        toolUseContext.hookCaller !== void 0 &&
        !toolUseContext.hookServesModel &&
        toolUseContext.agentId === void 0
          ? pluginInputHoldReason()
          : void 0;
      if (B !== void 0)
        throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
          `Skill "${skillName}" was not run: ${B}.`,
          "A forked skill was not run: a hold on plugins' input stands",
        );
      try {
        return await executeForkedSkill(
          command,
          skillName,
          n,
          toolUseContext,
          canUseTool,
          parentMessage,
          invokingSkill,
          onProgress,
          timing,
        );
      } finally {
        toolUseContext.options.activeSkill = activeSkill;
      }
    }
    let invokedSkillKey = `${toolUseContext.agentId ?? ""}:${command?.name ?? skillName}`,
      priorInvocation = getInvokedSkills().get(invokedSkillKey),
      { processPromptSlashCommand: processPromptSlashCommand } = await import("./chunk-jghdfw5c.js"),
      skillToolUseId = toolUseContext.toolUseId ?? findToolUseIdByName(parentMessage, SKILL),
      W = skillToolUseId !== void 0 && Vjr(parentMessage.handedOffLive)?.has(skillToolUseId) === !0,
      processed = await processPromptSlashCommand(
        skillName,
        n || "",
        commands,
        toolUseContext,
        isReadOnlyLoad,
        W,
      );
    if (!processed.shouldQuery)
      throw (
        logFeatureBad("skill_invoke", "skill_invoke_process_failed"),
        Error("Command processing failed")
      );
    let allowedTools = isReadOnlyLoad ? [] : processed.allowedTools || [],
      skillModel = isReadOnlyLoad ? void 0 : inlineSkillModelOverride(processed.model),
      skillEffort = isReadOnlyLoad ? void 0 : processed.effort,
      q = builtInCommandNames().has(skillName),
      y = command?.type === "prompt" && command.source === "bundled",
      E = command?.type === "prompt" && isOfficialMarketplaceSkill(command),
      { sanitizedName: sanitizedName, skillNameHash: skillNameHash } = sanitizeSkillNameForTelemetry({
        rawName: skillName,
        canonicalName: command?.name ?? skillName,
        isMcp: command?.loadedFrom === "mcp",
        isBuiltIn: q,
        isBundled: y,
        isOfficial: E,
      }),
      queryDepth = toolUseContext.queryTracking?.depth ?? 0,
      invocationTrigger = queryDepth > 0 ? "nested-skill" : "claude-proactive",
      agentId = toolUseContext.agentId,
      skillSource = command?.type === "prompt" ? command.source : void 0,
      skillBodyChars = 0;
    for (let message of processed.messages) skillBodyChars += metaMessageText(message)?.length ?? 0;
    if (command?.type === "prompt" && command.pluginInfo && !isReadOnlyLoad)
      recordPluginActivity(
        command.pluginInfo.repository,
        "skill",
        commandActivity(command, command.pluginInfo.pluginManifest.name),
      );
    (logEvent("tengu_skill_tool_invocation", {
      command_name: sanitizedName,
      _PROTO_skill_name: skillName,
      ...skillNameHash,
      execution_context: isReadOnlyLoad ? lit("read-only") : lit("inline"),
      invocation_trigger: fromEnum(invocationTrigger),
      query_depth: queryDepth,
      ...(toolUseContext.queryTracking && { query_chain_id: ye(toolUseContext.queryTracking.chainId) }),
      ...parentSkillFields(
        invokingSkill,
        invokingSkill !== void 0 && shippedCommandNames().has(invokingSkill),
      ),
      ...(agentId && { parent_agent_id: ye(agentId) }),
      ...logSkillsLoaded(
        skillSource,
        command?.loadedFrom,
        command?.kind,
        command?.type === "prompt" ? command.createdBy : void 0,
      ),
      ...getTeamTipAttribution(skillSource, skillName),
      attribution_shown: getTeammateAuthor(toolUseContext.session, skillSource, skillName) !== null,
      ...(command?.type === "prompt" && { skill_content_chars: command.contentLength }),
      skill_body_chars: skillBodyChars,
      ...!1,
      ...(command?.type === "prompt" && command.pluginInfo && getSkillPluginTelemetryFields(command)),
      ...(command?.type === "prompt" && buildServerAttributionFields(command)),
    }),
      skillLoadedSource(skillName, command, invocationTrigger, toolUseContext.agentContext));
    let filtered = processed.messages.filter((message) => {
        if (message.type === "progress") return !1;
        if (message.type === "user" && "message" in message) {
          let content = message.message.content;
          if (typeof content === "string" && content.includes(`<${COMMAND_MESSAGE}>`)) return !1;
        }
        return !0;
      }),
      le = isReadOnlyLoad ? (filtered.map(metaMessageText).find((B) => B !== null) ?? void 0) : void 0,
      newMessages = tagMessagesWithToolUseID(
        dedupeRenderedSkillContent({
          messages: filtered,
          contextMessages: toolUseContext.messages,
          commandName: skillName,
          args: n,
          priorContent: priorInvocation?.content ?? le,
          renderedContent: getInvokedSkills().get(invokedSkillKey)?.content ?? le,
        }),
        skillToolUseId,
      );
    (logForDebugging(`SkillTool returning ${newMessages.length} newMessages for skill ${skillName}`),
      logFeatureOk("skill_invoke"));
    let contextLayers = [];
    if (allowedTools.length > 0) contextLayers.push({ kind: "allowed_tools", allowedTools: allowedTools });
    let appState = toolUseContext.getAppState(),
      effectiveModel =
        skillModel &&
        isSkillModelOverrideAllowedInMode({
          skillModel: skillModel,
          mode: appState.toolPermissionContext.mode,
          fastMode: appState.fastMode ?? !1,
        })
          ? resolveSkillModelOverride(skillModel, toolUseContext.options.mainLoopModel)
          : void 0;
    if (effectiveModel) contextLayers.push({ kind: "model", mainLoopModel: effectiveModel });
    if (skillEffort !== void 0) contextLayers.push({ kind: "effort", effort: skillEffort });
    return (
      (completed = !0),
      {
        data: {
          success: !0,
          commandName: skillName,
          allowedTools: allowedTools.length > 0 ? allowedTools : void 0,
          model: effectiveModel,
          ...(isReadOnlyLoad && { readOnly: !0 }),
        },
        newMessages: newMessages,
        ...(contextLayers.length > 0 && { contextLayers: contextLayers }),
      }
    );
  } finally {
    if (isReadOnlyLoad || !completed) toolUseContext.options.activeSkill = activeSkill;
  }
}
/**
 * Skill 工具定义（name "Skill"，backgrounding never，maxResultSizeChars 100000；isEnabled 为 !Wb()）。validateInput：去前导 /，解析命令（可能需要从远端物化或加载定义），拒绝 MCP 来源 skill、被同步否决或主机目录隐藏的 skill，未找到时给出近似名/目录作用域变体/插件加载错误提示，拒绝在自己 fork 的上下文里递归调用，并用 jKe 检查 disable-model-invocation、未加白名单等。checkPermissions：Skill deny 规则 → MCP skill 拒绝 → ask 规则 → allow 规则（含插件边界 held-back 情况）→ 只含安全属性的 prompt skill 或协调者只读加载直接允许 → 否则询问并建议加 Skill(name) 或 Skill(name:*) 规则。call 通过 runEngine 执行 runSkillInvocation。
 */
//@ chunk-a5k9jscj.js:15630-25436 fingerprint = SAFE_SKILL_PROPERTIES (0.302)
var SkillTool = buildTool({
    name: SKILL,
    searchHint: "invoke a slash-command skill",
    isEnabled() {
      return !getDisableSlashCommands();
    },
    backgrounding: "never",
    maxResultSizeChars: 1e5,
    get preserveToolUseResultInSubagents() {
      return isSillyShoreGateOn();
    },
    get inputSchema() {
      return skillInputSchema();
    },
    get outputSchema() {
      return skillOutputSchema();
    },
    description: async ({ skill: skill }) => `Execute skill: ${skill}`,
    prompt: async ({ model: model, leanRewrite: leanRewrite }) =>
      getSkillToolPrompt({ model: model, leanRewrite: leanRewrite }),
    toAutoClassifierInput: ({ skill: skill }) => skill ?? "",
    create(e) {
      let toolContext = e;
      return {
        async validateInput({ skill: s }, { signal: i, toolUseId: d }) {
          let trimmed = s.trim();
          if (!trimmed)
            return (
              logFeatureBad("skill_invoke", "skill_invoke_empty_name"),
              { result: !1, message: `Invalid skill format: ${s}`, errorCode: 1 }
            );
          let startsWith = trimmed.startsWith("/");
          if (startsWith) logEvent("tengu_skill_tool_slash_prefix", {});
          let skillName = startsWith ? trimmed.substring(1) : trimmed,
            downloadFailure,
            isWithheld = !1,
            commands = await getSkillToolCommandList(toolContext),
            resolution = resolveSkillName(skillName, commands, toolContext),
            command = resolution.command,
            unprefixedName = stripSyncedSkillPrefix(skillName);
          if (
            Zoe(toolContext.session) &&
            (!command || isSyncedSkillPlaceholder(command)) &&
            (command !== void 0 || w3n(unprefixedName))
          ) {
            let P = await raceWithAbortSignal(
              startPendingDownload(unprefixedName),
              i,
              () => new AbortError(INTERRUPT_MESSAGE_FOR_TOOL_USE),
            );
            if (!P.ok) ((downloadFailure = P.reason), (isWithheld = P.withheld === !0));
            else
              ((commands = await getSkillToolCommandList(toolContext)),
                (resolution = resolveSkillName(skillName, commands, toolContext)),
                (command = resolution.command));
          }
          let z = resolution.kind === "listingName" ? resolution.listed : command;
          if (z?.type === "prompt" && z.loadDefinition !== void 0) {
            (await raceWithAbortSignal(
              z.loadDefinition(),
              i,
              () => new AbortError(INTERRUPT_MESSAGE_FOR_TOOL_USE),
            ),
              (commands = await getSkillToolCommandList(toolContext)),
              (resolution = resolveSkillName(skillName, commands, toolContext)));
            let P =
              resolution.kind === "none" && z.directoryListingName !== void 0
                ? resolveSkillName(z.directoryListingName, commands, toolContext)
                : resolution;
            if (P.kind === "listingName") resolution = P;
            command = resolution.command;
          }
          if (command?.type === "prompt" && command.loadedFrom === "mcp")
            return { result: !1, message: `Unknown skill: ${skillName}`, errorCode: 2 };
          if (downloadFailure !== void 0 && (!command || isSyncedSkillPlaceholder(command)))
            return (
              logFeatureBad(
                "skill_invoke",
                isWithheld ? "skill_invoke_withheld" : "skill_invoke_not_materialized",
              ),
              {
                result: !1,
                message: isWithheld
                  ? `${S3n(skillName)} Proceed without it.`
                  : `Skill ${skillName} could not be downloaded (${downloadFailure}). Proceed without it.`,
                errorCode: 10,
              }
            );
          let te = null;
          if (command && qCe(command))
            return (
              logFeatureBad(
                "skill_invoke",
                isHostCatalogSkill(command)
                  ? "skill_invoke_host_catalog_withheld"
                  : "skill_invoke_sync_vetoed",
              ),
              { result: !1, message: `Unknown skill: ${skillName}`, errorCode: 13 }
            );
          if (!command) {
            let P = matchingSkillVariants(commands, skillName, toolContext.spawnedBySkill);
            if (P.length > 0) {
              let y =
                resolution.kind === "ambiguous"
                  ? resolution.candidates.filter(
                      (candidate) =>
                        !matchesUnqualifiedName(candidate, skillName) && isNonEmptyIdentifier(candidate.name),
                    )
                  : [];
              if (resolution.kind === "ambiguous")
                logEvent("tengu_skill_tool_suffix_match", { candidate_count: resolution.candidates.length });
              return (
                logFeatureBad("skill_invoke", "skill_invoke_not_found"),
                {
                  result: !1,
                  message:
                    y.length > 0
                      ? `Unknown skill: ${skillName}. Several skills match that name: ${[...y, ...P].map((E) => E.name).join(", ")} \u2014 invoke one by its full name; the directory-scoped variants apply to the files under their directory.`
                      : `Unknown skill: ${skillName}. Directory-scoped variants exist: ${P.map((E) => E.name).join(", ")} \u2014 invoke the variant whose directory contains the files you are working on.`,
                  errorCode: 2,
                }
              );
            }
            if (resolution.kind === "listingName") {
              let { listed: listed } = resolution,
                E = toolContext.agentId === void 0;
              if (
                ce(commands, E).includes(listed) &&
                isNonEmptyIdentifier(listed.name) &&
                !isSelfForkedSkill(listed, toolContext) &&
                checkSkillPermission(listed, {
                  commandName: listed.name,
                  userTypedThisTurn: !1,
                  isMainSession: E,
                  permissionContext: toolContext.permissions(),
                }) === null
              )
                return (
                  logFeatureBad("skill_invoke", "skill_invoke_not_found"),
                  {
                    result: !1,
                    message: `Unknown skill: ${skillName}. Did you mean ${listed.name}? Invoke it by that full name.`,
                    errorCode: 2,
                  }
                );
            }
            if (resolution.kind === "suggestion") {
              if (
                (logEvent("tengu_skill_tool_suffix_match", { candidate_count: 1 }),
                isNonEmptyIdentifier(resolution.suggestion.name))
              )
                return (
                  logFeatureBad("skill_invoke", "skill_invoke_not_found"),
                  {
                    result: !1,
                    message: `Unknown skill: ${skillName}. Did you mean ${resolution.suggestion.name}? Invoke it by that full name.`,
                    errorCode: 2,
                  }
                );
            }
            if (resolution.kind === "ambiguous") {
              logEvent("tengu_skill_tool_suffix_match", { candidate_count: resolution.candidates.length });
              let filtered = resolution.candidates.filter(
                  (candidate) => !matchesUnqualifiedName(candidate, skillName),
                ),
                E = filtered.length === 1 ? filtered[0] : void 0;
              if (filtered.length > 0 && filtered.every((R) => isNonEmptyIdentifier(R.name)))
                return (
                  logFeatureBad("skill_invoke", "skill_invoke_not_found"),
                  {
                    result: !1,
                    message:
                      E !== void 0
                        ? `Unknown skill: ${skillName}. Did you mean ${E.name}? Invoke it by that full name.`
                        : `Unknown skill: ${skillName}. Several skills match that name: ${filtered.map((R) => R.name).join(", ")} \u2014 invoke one by its full name.`,
                    errorCode: 2,
                  }
                );
            }
            let V = suggestClosestName(
                skillName,
                commands.map((y) => ({ name: getCommandName(y), aliases: y.aliases })),
                { maxEditDistance: 2 },
              ),
              N = toolContext.agentId === void 0,
              W =
                V === void 0 && unprefixedName !== skillName
                  ? ce(commands, N).find((y) => y.name === unprefixedName && isProjectScopedCommand(y))
                  : void 0,
              x =
                W !== void 0 &&
                isNonEmptyIdentifier(unprefixedName) &&
                !vZ(unprefixedName) &&
                !isSelfForkedSkill(W, toolContext) &&
                checkSkillPermission(W, {
                  commandName: unprefixedName,
                  userTypedThisTurn: !1,
                  isMainSession: N,
                  permissionContext: toolContext.permissions(),
                }) === null;
            if (x) logEvent("tengu_skill_tool_unprefixed_match", {});
            let suggestedName = V ?? (x ? unprefixedName : void 0);
            logFeatureBad("skill_invoke", "skill_invoke_not_found");
            let O = await ypr()?.catch(() => {
                return;
              }),
              j = O && pluginLoadFailureNote(skillName, O.errors, new Set(O.enabled.map((y) => y.name))),
              q = suggestedName
                ? `Unknown skill: ${skillName}. Did you mean ${suggestedName}?`
                : `Unknown skill: ${skillName}`;
            return { result: !1, message: j ? `${q}${suggestedName ? "" : "."} ${j}` : q, errorCode: 2 };
          }
          if (isSelfForkedSkill(command, toolContext))
            return (
              logFeatureBad("skill_invoke", "skill_invoke_fork_recursion"),
              logEvent("tengu_skill_tool_fork_recursion_blocked", {}),
              {
                result: !1,
                message: `Skill ${skillName} is already executing in this forked context \u2014 you are the subagent running it. Execute the instructions in the skill body directly instead of re-invoking the ${SKILL} tool.`,
                errorCode: 9,
              }
            );
          let Z = await isYieldedSkillTarget(skillName, command, commands, toolContext.storageV5),
            invocationBlock = checkSkillPermission(command, {
              commandName: Z ? skillName : command.name,
              userTypedThisTurn:
                !isCoordinatorMainThread(toolContext) &&
                userTypedSkillThisTurn(skillName, {
                  agentId: toolContext.agentId,
                  messages: toolContext.messages(),
                  turnStartIndex: toolContext.turnStartIndex,
                }) &&
                Z,
              isMainSession: toolContext.agentId === void 0,
              permissionContext: void 0,
            });
          if (invocationBlock !== null) {
            switch (invocationBlock.reason) {
              case "disable_model_invocation": {
                let { sanitizedName: sanitizedName, skillNameHash: skillNameHash } =
                  sanitizeSkillNameForTelemetry({
                    rawName: skillName,
                    canonicalName: command.name,
                    isMcp: command.loadedFrom === "mcp",
                    isBuiltIn: builtInCommandNames().has(skillName),
                    isBundled: command.type === "prompt" && command.source === "bundled",
                    isOfficial: command.type === "prompt" && isOfficialMarketplaceSkill(command),
                  });
                logFeatureBad("skill_invoke", "skill_invoke_model_disabled", {
                  command_name: sanitizedName,
                  ...skillNameHash,
                });
                break;
              }
              case "not_loaded":
                logFeatureBad("skill_invoke", "skill_invoke_not_materialized");
                break;
              case "not_allowlisted":
                logFeatureBad("skill_invoke", "skill_invoke_not_allowlisted");
                break;
              case "override_disabled":
                logFeatureBad(
                  "skill_invoke",
                  invocationBlock.hiddenBehindPlugin
                    ? "skill_invoke_hidden_behind_plugin"
                    : invocationBlock.killSwitchOnly
                      ? "skill_invoke_bundled_skills_disabled"
                      : "skill_invoke_override_disabled",
                );
                break;
              case "not_prompt_type":
                logFeatureBad("skill_invoke", "skill_invoke_not_prompt_type");
                break;
              case "mcp_prompt":
                break;
              case "deny_rule":
                break;
            }
            return { result: !1, message: invocationBlock.message, errorCode: invocationBlock.errorCode };
          }
          return { result: !0 };
        },
        async checkPermissions(s, i) {
          let { skill: skill, args: args } = s,
            trimmed = skill.trim(),
            skillName = trimmed.startsWith("/") ? trimmed.substring(1) : trimmed,
            permissions = toolContext.permissions(),
            I = await getSkillToolCommandList(toolContext),
            resolution = resolveSkillName(skillName, I, toolContext),
            command = resolution.command,
            w = resolution.kind === "ambiguous" ? resolution.candidates : [command],
            L = command?.type === "prompt" && command.loadedFrom === "mcp" ? command : void 0,
            z = L?.mcpSkillEntry?.(),
            S = void 0,
            te = void 0,
            Z = getContentRulesMapForTool(permissions, SkillTool, "deny");
          for (let [y, E] of Z.entries())
            if (
              (y.startsWith("/") ? y.substring(1) : y) === void 0 ||
              w.some((R) => matchesSkillRule(y, skillName, R))
            )
              return {
                behavior: "deny",
                message: "Skill execution blocked by permission rules",
                decisionReason: { type: "rule", rule: E },
              };
          if (L !== void 0)
            return {
              behavior: "deny",
              message: `Unknown skill: ${skillName}`,
              decisionReason: { type: "other", reason: `Unknown skill: ${skillName}` },
            };
          let D = () => V1t() && vZ(skillName) && !(command !== void 0 && isSyncedOrManagedSkill(command)),
            P = getContentRulesMapForTool(permissions, SkillTool, "ask");
          if (P.size > 0 && B2()) {
            for (let [y, E] of P.entries())
              if (w.some((R) => P8s(y, skillName, R)))
                return {
                  behavior: "ask",
                  message: `Execute skill: ${skillName}`,
                  decisionReason: { type: "rule", rule: E },
                  ...(D() && { suppressAlwaysAllowRule: !0 }),
                  updatedInput: { skill: skill, args: args },
                  metadata: command ? { command: command } : void 0,
                };
          }
          let V = getContentRulesMapForTool(permissions, SkillTool, "allow"),
            heldBackAllowRule;
          for (let [y, E] of V.entries()) {
            let R = reservedSkillRuleMatch(y, skillName, command);
            if (R === "allow")
              return {
                behavior: "allow",
                updatedInput: { skill: skill, args: args },
                decisionReason: { type: "rule", rule: E },
              };
            if (R === "held-back-nonholder") heldBackAllowRule = { rule: y, kind: "nonholder" };
            else if (R === "held-back-boundary") heldBackAllowRule ??= { rule: y, kind: "boundary" };
          }
          if (
            command?.type === "prompt" &&
            (skillHasOnlySafeProperties(command) || isCoordinatorMainThread(toolContext))
          )
            return { behavior: "allow", updatedInput: { skill: skill, args: args }, decisionReason: void 0 };
          let W =
              command?.type === "prompt" && command.source === "plugin"
                ? command.pluginInfo?.pluginManifest.name
                : void 0,
            x = D(),
            U = heldBackAllowRule === void 0 ? void 0 : x ? "nonholder" : heldBackAllowRule.kind;
          if (
            U !== void 0 &&
            permissions.mode !== "bypassPermissions" &&
            toolAlwaysAllowedRule(permissions, SkillTool) === null
          )
            logReservedRuleHeldBack(U);
          let O =
              heldBackAllowRule === void 0 || U === void 0
                ? void 0
                : describeSyncedSkillRuleScope(
                    heldBackAllowRule.rule,
                    command?.name ?? skillName,
                    U === "nonholder" ? { kind: "nonholder", pluginName: W } : { kind: "boundary" },
                  ),
            j = O === void 0 ? void 0 : { type: "other", reason: O };
          if (x)
            return {
              behavior: "ask",
              message: `Execute skill: ${skillName}${O ? ` \u2014 ${O}` : ""}`,
              decisionReason: j,
              suppressAlwaysAllowRule: !0,
              updatedInput: { skill: skill, args: args },
              metadata: command ? { command: command } : void 0,
            };
          let q = [
            {
              type: "addRules",
              rules: [{ toolName: SKILL, ruleContent: skillName }],
              behavior: "allow",
              destination: "localSettings",
            },
            {
              type: "addRules",
              rules: [{ toolName: SKILL, ruleContent: `${skillName}:*` }],
              behavior: "allow",
              destination: "localSettings",
            },
          ];
          return {
            behavior: "ask",
            message: `Execute skill: ${skillName}${O ? ` \u2014 ${O}` : ""}`,
            decisionReason: j,
            suggestions: q,
            updatedInput: { skill: skill, args: args },
            metadata: command ? { command: command } : void 0,
          };
        },
        call(s, i) {
          if (!i.runEngine)
            return Promise.reject(Error("Skill: invoking needs the executor (call.runEngine)"));
          return i.runEngine(runSkillInvocation, {
            input: s,
            parentMessage: i.parentMessage,
            onProgress: i.onProgress,
            timing: i.timing,
          });
        },
      };
    },
    mapToolResultToToolResultBlockParam(e, n) {
      if ("status" in e && e.status === "forked")
        return {
          type: "tool_result",
          tool_use_id: n,
          content:
            (e.toolsUsedLine === void 0
              ? ""
              : `${e.toolsUsedLine}
`) +
            (e.background
              ? `Skill "${e.commandName}" launched (forked execution, running in the background).

${e.result}`
              : `Skill "${e.commandName}" completed (forked execution).

Result:
${e.result}`),
        };
      if ("readOnly" in e && e.readOnly)
        return {
          type: "tool_result",
          tool_use_id: n,
          content: `Loaded skill instructions (read-only): ${e.commandName}. Nothing was executed; delegate execution to a worker.`,
        };
      return { type: "tool_result", tool_use_id: n, content: `Launching skill: ${e.commandName}` };
    },
    renderToolUseMessage: renderToolUseMessage,
  }),
  SAFE_SKILL_PROPERTIES = new Set([
    "type",
    "progressMessage",
    "contentLength",
    "contentHash",
    "getLoadedSkillMd",
    "skillFile",
    "argNames",
    "model",
    "effort",
    "source",
    "pluginInfo",
    "serverAttribution",
    "disableNonInteractive",
    "skillRoot",
    "skillDir",
    "context",
    "agent",
    "background",
    "getPromptForCommand",
    "getEffort",
    "getDefaultEffort",
    "onUserTypedArgs",
    "getContext",
    "formatForegroundForkResult",
    "declaredFields",
    "pluginSource",
    "metadata",
    "createdBy",
    "fallback",
    "unqualifiedName",
    "allowlistedByFullNameOnly",
    "directoryListingName",
    "bareNameReserved",
    "reservedLabels",
    "fromHostCatalog",
    "shedAliases",
    "name",
    "description",
    "menuDescription",
    "hasUserSpecifiedDescription",
    "isEnabled",
    "isHidden",
    "aliases",
    "subcommands",
    "subcommandsBareOnly",
    "isMcp",
    "argumentHint",
    "whenToUse",
    "paths",
    "version",
    "disableModelInvocation",
    "disableBridgeInvocation",
    "userInvocable",
    "loadedFrom",
    "immediate",
    "userFacingName",
    "getArgumentCompletions",
  ]);
/**
 * prompt 型 skill 的属性是否全部在 SAFE_SKILL_PROPERTIES 内（或为空值）；是则无需权限询问。
 */
//@ chunk-a5k9jscj.js:25436-25685 file-local
function skillHasOnlySafeProperties(command) {
  for (let key of Object.keys(command)) {
    if (SAFE_SKILL_PROPERTIES.has(key)) continue;
    let value = command[key];
    if (value === void 0 || value === null) continue;
    if (Array.isArray(value) && value.length === 0) continue;
    if (typeof value === "object" && !Array.isArray(value) && Object.keys(value).length === 0) continue;
    return !1;
  }
  return !0;
}
//@ chunk-a5k9jscj.js:25685-26706 placement
function dedupeRenderedSkillContent({
  messages: messages,
  contextMessages: contextMessages,
  commandName: commandName,
  args: args,
  priorContent: priorContent,
  renderedContent: renderedContent,
}) {
  if (!priorContent || !renderedContent) return messages;
  if (messages.some((I) => I.type === "user" && (I.promptShellHandOff !== void 0 || I.mcpSkill !== void 0)))
    return messages;
  let v = restoreSkillStateFromMessages(contextMessages, priorContent);
  if (!v) return messages;
  if (priorContent !== renderedContent) {
    let I = priorContent.endsWith(SKILL_TRUNCATION_NOTE)
      ? `(Re-invocation of /${commandName} \u2014 the previously loaded copy was truncated by compaction; the full instructions follow.)`
      : `(Re-invocation of /${commandName} \u2014 the skill instructions were previously loaded; the arguments or dynamic output below are new.)`;
    return [createUserMessage({ content: I, isMeta: !0 }), ...messages];
  }
  let r = !1,
    mapped = messages.map((I) => {
      if (metaMessageText(I) !== renderedContent) return I;
      return (
        (r = !0),
        createUserMessage({
          content:
            v === "attachment"
              ? `Skill /${commandName} was loaded earlier (see the invoked-skills reminder above); this is a NEW invocation \u2014 follow those instructions now, including any setup steps.${args ? ` Arguments: ${args}` : ""}`
              : `Skill /${commandName} is already loaded above; instructions unchanged.${args ? ` Arguments: ${args}` : ""}`,
          isMeta: !0,
        })
      );
    });
  if (r) logForDebugging(`SkillTool eliding byte-identical re-invocation of skill ${commandName}`);
  return mapped;
}
/**
 * tagMessagesWithToolUseID：给 user 消息加 sourceToolUseID（技能/命令展开出的消息归属到发起它的工具调用）。
 */
//@ chunk-a5k9jscj.js:26706-26818 placement = tagMessagesWithToolUseID (1)
function tagMessagesWithToolUseID(messages, toolUseID) {
  if (!toolUseID) return messages;
  return messages.map((s) => {
    if (s.type === "user") return { ...s, sourceToolUseID: toolUseID };
    return s;
  });
}
//@ chunk-a5k9jscj.js:26818-26944 placement = countToolCallsSince (1)
function findToolUseIdByName(messages, sinceUuid) {
  let found = messages.message.content.find((block) => block.type === "tool_use" && block.name === sinceUuid);
  return found && found.type === "tool_use" ? found.id : void 0;
}
//@ chunk-a5k9jscj.js:26944-27017 placement
function agentToolHintSuffix() {
  return getSubagentSteer() === "default" ? " (use the Agent tool instead)" : "";
}
/**
 * skill 是否来自官方市场插件。
 */
//@ chunk-csq9ftr9.js:9850-9976 fingerprint = isOfficialMarketplaceSkill (1)
function isOfficialMarketplaceSkill(command) {
  if (command.source !== "plugin" || !command.pluginInfo?.repository) return !1;
  return isOfficialMarketplaceName_3(parsePluginIdentifier_2(command.pluginInfo.repository).marketplace);
}
/**
 * 构造工具名 → 来源（mcp / static）映射，额外登记 DeferredToolPlaceholder 为 static；供 API 层判定工具类别。
 */
//@ chunk-e6aww6q8.js:2804890-2805133 fingerprint = getAllCommands (0.414)
function getToolNameKinds(e, n) {
  let r = new Map();
  for (let s of e)
    if (s.isMcp === !0) r.set(s.name, "mcp");
    else if (s.uiTableKey === void 0) r.set(s.name, "static");
  for (let s of n) if ("name" in s && typeof s.name === "string") r.set(s.name, "static");
  return (r.set(DEFERREDTOOLPLACEHOLDER, "static"), r);
}

export { isOfficialMarketplaceSkill, getToolNameKinds, agentToolHintSuffix, SkillTool };
