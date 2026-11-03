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
  dropSyncedClashes,
  isHostCatalogSkill,
  isPlaidHarborOn,
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
import { memorySkillCommands } from "../../services/memorySync/memorySkills.js";
import {
  slashSkillRuleRegex,
  checkSkillPermission,
  matchesSkillRule,
  skillAllowedByRules,
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
import { sanitizeMarkName } from "../../utils/startupMarks.js";
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
  isApiErrorDisplayMessage,
  adoptSubagentPublishArmsAsync,
} from "../AgentTool/agentToolUtils.js";
import { getToolPermissionContext } from "../../utils/permissions/toolPermissionContext.js";
import { memoryModeForSession } from "../../services/accountMemory/memoryContext.js";
import { logForDebugging } from "../../utils/debug.js";
import { isBuiltInAgent } from "../AgentTool/loadAgentsDir.js";
import { runAgent, filterIncompleteToolCalls_2 } from "../AgentTool/runAgent.js";
import { agentModelRestrictedReporter } from "../../utils/model/agentModelRestriction.js";
import { unreadableToolsLine, toolsUsedForSummary } from "../../utils/agentListing.js";
import { withUntrustedPreamble, isSillyShoreGateOn } from "../../utils/messages/untrustedArtifactContent.js";
import { DoctorLazy } from "../../cli/handlers/util.js";
import { u, string, M, array, literal, union } from "../../../vendor/zod/v4/classic/schemas.js";
import { currentMcpClients } from "../../services/compact/idleToolResultClearing.js";
import { isAgentStopPending } from "../../utils/agentProcessRegistry.js";
import { isCoordinatorMainThread } from "../../coordinator/coordinatorMode.js";
import { isNonEmptyIdentifier } from "../../utils/sanitization.js";
import {
  TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS,
  AbortError,
} from "../../utils/errors.js";
import { recordSkillInvoked } from "../../utils/suggestions/skillUsageTracking.js";
import { pluginInputHoldReason } from "../../plugins/functionHooks/inputHold.js";
import {
  handedOffIds,
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
  isSkillsSyncActive,
  isSyncedSkillPlaceholder,
  hasPendingSkillDownload,
  startPendingDownload,
  skillSwitchedOffText,
} from "../../utils/claudeAiSync/skillsSync.js";
import { raceWithAbortSignal } from "../../utils/sleep.js";
import { syncedSkillRefusalReason } from "../../utils/claudeAiSync/syncedSkillAccess.js";
import { suggestClosestName } from "../../utils/settings/managedEnvKeys.js";
import { usesReservedSkillNamespace } from "../../skills/reservedSkillNames.js";
import { isPluginLoadCacheOnly } from "../../utils/plugins/pluginLoadState.js";
import { pluginLoadFailureNote } from "./pluginLoadFailureNote.js";
import { areSkillsConvertedAsPlugins } from "../../utils/permissions/permissionRulePayload.js";
import { renderToolUseMessage } from "./UI.js";
import { restoreSkillStateFromMessages } from "../../utils/conversationRecovery.js";
import { getSubagentSteer } from "../../utils/model/subagentSteer.js";
import {
  isOfficialMarketplaceName_3,
  parsePluginIdentifier_2,
} from "../../utils/plugins/pluginIdentifier.js";
import { DEFERREDTOOLPLACEHOLDER } from "../ToolSearchTool/prompt.js";

//@ chunk-a5k9jscj.js:3587-3613 sole-consumer
/**
 * 无采纳的 MCP 技能命令（当前恒返回 null）。
 */
function noAdoptedSkillCommands() {
  return null;
}
//@ chunk-a5k9jscj.js:3613-3830 sole-consumer
function dedupeSkillsByName(e) {
  let n = new Map();
  let s = (i) => Boolean(i.disableModelInvocation) || isHiddenFromModel(i);
  for (let i of e) {
    let d = n.get(i.name);
    if (
      d === undefined ||
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
    {
      interactive: !getIsNonInteractiveSession(),
      host_prompt: getPermissionPromptToolName() !== undefined,
    },
  );
}
//@ chunk-a5k9jscj.js:4061-4370 sole-consumer
/**
 * 汇总 Skill 工具可调用的命令：本地命令、MCP 技能（含收编的）与内置技能，按名去重并去掉被遮蔽的后备技能。
 */
async function getSkillToolCommandList(toolContext) {
  let n = withNamedFolderYieldsRestored(await getCommands(getProjectRootOrNull(), toolContext.storageV5));
  let s = toolContext.mcpCommands();
  let filtered = s.filter((_) => _.type === "prompt" && _.loadedFrom === "mcp");
  let d = withReservedLabels(
    [...filtered, ...(noAdoptedSkillCommands()?.adoptedMcpSkillCommands(toolContext.mcpClients()) ?? [])],
    n,
  );
  let sliced = d.slice(0, filtered.length);
  let sliced_2 = d.slice(filtered.length);
  let r = memorySkillCommands();
  let h = dropSyncedClashes(n, s);
  let commands = dedupeSkillsByName([...h, ...r, ...sliced]);
  return [...dropShadowedFallbackSkills(commands), ...sliced_2];
}
//@ chunk-a5k9jscj.js:4370-4430 sole-consumer
/**
 * 过滤出技能命令；主代理时再按会话允许清单过滤。
 */
function listSkillCommands(commands, isMainAgent) {
  let filtered = commands.filter(isSkillToolCommand);
  return isMainAgent ? filterCommandsByAllowlist(filtered, getSessionSkillAllowlist()) : filtered;
}
//@ chunk-a5k9jscj.js:4430-4535 sole-consumer = formatCommandDescription (0.874)
/**
 * 插件 prompt skill 是否是通过别名（不是正名）被命中的。
 */
function formatCommandDescription(e, name) {
  return (
    e.type === "prompt" && e.source === "plugin" && e.name !== name && (e.aliases?.includes(name) ?? false)
  );
}
//@ chunk-a5k9jscj.js:4535-5257 sole-consumer
/**
 * 按名称解析 Skill 工具要调用的技能：目录列表名命中、精确命中（同名限定版本有多个时为 ambiguous）、一方命令或未限定名命中时为 none，否则尝试按插件技能的裸名给出唯一建议或歧义候选。
 */
function resolveSkillName(name, commands, context) {
  let isMainAgent = context.agentId === undefined;
  let command = findCommand(name, commands);
  if (command?.type === "prompt" && command.directoryListingName === name)
    return {
      kind: "listingName",
      command: undefined,
      listed: command,
    };
  if (command !== undefined) {
    let v = formatCommandDescription(command, name) ? listSkillCommands(commands, isMainAgent) : [];
    if (v.includes(command)) {
      let filtered = v.filter(
        (h) =>
          formatCommandDescription(h, name) ||
          (h.type === "prompt" && h.loadedFrom !== "syncedSkills" && h.name.endsWith(`:${name}`)),
      );
      if (filtered.length > 1)
        return {
          kind: "ambiguous",
          command: undefined,
          candidates: filtered,
        };
    }
    return {
      kind: "exact",
      command,
    };
  }
  if (isFirstPartyCommandName(name) || commands.some((command) => matchesUnqualifiedName(command, name)))
    return {
      kind: "none",
      command: undefined,
    };
  let bareMatch = resolveBarePluginSkillName(name, listSkillCommands(commands, isMainAgent));
  switch (bareMatch.kind) {
    case "unique":
      return {
        kind: "suggestion",
        command: undefined,
        suggestion: bareMatch.command,
      };
    case "ambiguous":
      return {
        kind: "ambiguous",
        command: undefined,
        candidates: bareMatch.candidates,
      };
    case "none":
      return {
        kind: "none",
        command: undefined,
      };
  }
}
//@ chunk-a5k9jscj.js:5257-5399 sole-consumer
function isSelfForkedSkill(e, toolContext) {
  return (
    e.type === "prompt" &&
    (e.context === "fork" || (e.getContext !== undefined && toolContext.spawnedByForkedSkill === true)) &&
    toolContext.spawnedBySkill === getBareCommandName(e)
  );
}
//@ chunk-a5k9jscj.js:5399-5591 sole-consumer
async function isYieldedSkillTarget(skillName, command, commands, storageV5) {
  if (
    !commands.some(
      (v) => v.type === "prompt" && v.pluginInfo?.namedFolderYield?.yielded.includes(skillName) === true,
    )
  )
    return true;
  let commands_2 = await getCommands(getProjectRootOrNull(), storageV5, undefined, true);
  return findCommand(skillName, commands_2)?.name === command.name;
}
//@ chunk-a5k9jscj.js:5591-6044 sole-consumer
/**
 * 主会话本轮中用户是否亲手输入了该 skill 名（排除 meta、压缩摘要、交接、非键入文本、工具结果与命令消息），影响 userTypedThisTurn 判断。
 */
function userTypedSkillThisTurn(skillName, n) {
  if (n.agentId !== undefined) return false;
  let s = slashSkillRuleRegex(skillName);
  for (let i = n.messages.length - 1; i >= n.turnStartIndex; i--) {
    let d = n.messages[i];
    if (
      d.type !== "user" ||
      d.isMeta ||
      d.isCompactSummary ||
      !isHumanOrUnset(d.origin) ||
      d.verifiedSlackHumanTurn === true ||
      d.handedOff === true ||
      d.textNotTyped === true
    )
      continue;
    let content = d.message.content;
    if (typeof content === "string") {
      if (content.includes(`<${COMMAND_MESSAGE}>`)) continue;
    } else if (content.some((v) => v.type === "tool_result")) continue;
    if (s.test(getUserMessageText(d) ?? "")) return true;
  }
  return false;
}
//@ chunk-a5k9jscj.js:6044-10399 fingerprint = executeForkedSkill (0.557)
/**
 * 以子代理执行 fork 型 skill：准备 fork 上下文（工具集、权限层、文件读状态、技能正文），可选后台运行（返回 "Running in the background as @名字"）；前台用 runAgent 跑完，转发子代理进度（skill_progress），最终返回 forked 结果文本与首行 toolsUsedLine。
 */
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
  let startTime = Date.now();
  let agentId = makeSaltedName();
  let isBuiltIn = builtInCommandNames().has(skillName);
  let isOfficialSkill = isOfficialMarketplaceSkill(command);
  let isBundled = command.source === "bundled";
  let { sanitizedName, skillNameHash } = sanitizeSkillNameForTelemetry({
    rawName: skillName,
    canonicalName: command.name,
    isMcp: command.loadedFrom === "mcp",
    isBuiltIn,
    isBundled,
    isOfficial: isOfficialSkill,
  });
  let depth = toolUseContext.queryTracking?.depth ?? 0;
  let Z = depth > 0 ? "nested-skill" : "claude-proactive";
  let agentId_2 = toolUseContext.agentId;
  if (command.pluginInfo)
    recordPluginActivity(
      command.pluginInfo.repository,
      "skill",
      commandActivity(command, command.pluginInfo.pluginManifest.name),
    );
  logEvent("tengu_skill_tool_invocation", {
    command_name: sanitizedName,
    _PROTO_skill_name: skillName,
    ...skillNameHash,
    execution_context: lit("fork"),
    invocation_trigger: fromEnum(Z),
    query_depth: depth,
    ...(toolUseContext.queryTracking && {
      query_chain_id: sanitizeMarkName(toolUseContext.queryTracking.chainId),
    }),
    ...parentSkillFields(
      invokingSkill,
      invokingSkill !== undefined && shippedCommandNames().has(invokingSkill),
    ),
    ...(agentId_2 && {
      parent_agent_id: sanitizeMarkName(agentId_2),
    }),
    ...logSkillsLoaded(command.source, command.loadedFrom, command.kind, command.createdBy),
    ...getTeamTipAttribution(command.source, skillName),
    attribution_shown: getTeammateAuthor(toolUseContext.session, command.source, skillName) !== null,
    skill_content_chars: command.contentLength,
    ...false,
    ...(command.pluginInfo && getSkillPluginTelemetryFields(command)),
    ...buildServerAttributionFields(command),
  });
  skillLoadedSource(skillName, command, Z, toolUseContext.agentContext);
  let agentContext = {
    agentId,
    parentAgentId: toolUseContext.agentId,
    depth: getAgentDepth(toolUseContext.agentContext) + 1,
    agentType: "subagent",
    isAsync: false,
    isBackgroundAgent:
      toolUseContext.agentContext.agentType === "main"
        ? false
        : toolUseContext.agentContext.isBackgroundAgent,
    ...getWorkflowRunFields(toolUseContext.agentContext),
  };
  let runInBackground = shouldBackgroundForkedSkill(command, toolUseContext);
  let N = runInBackground || toolUseContext.spawnedByWorkflowRunId !== undefined;
  let {
    modifiedGetAppState,
    contextLayers,
    recordInvocation,
    baseAgent,
    promptMessages,
    skillContent,
    forkReadFileState,
    availableTools,
    webFetchReadmissionAllowed,
    frozenCommandDenies,
  } = await prepareForkedCommandContext(command, args || "", toolUseContext, agentContext, {
    replaceCommandRules: N,
    freezeCommandDenies: N,
    deferInvocationRecording: N,
  });
  let se = await scopedSkillVariantNote(command, getProjectRootOrNull(), {
    options: {
      tools: resolveAgentTools(
        baseAgent,
        webFetchReadmissionAllowed
          ? withWebFetchToolForAgent(baseAgent, availableTools, getToolPermissionContext(toolUseContext), {
              activeAgents: toolUseContext.options.agentDefinitions.activeAgents,
            })
          : availableTools,
        runInBackground,
        false,
        false,
        0,
        memoryModeForSession(toolUseContext).mode,
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
    command.effort;
  let agentDefinition =
    ie !== undefined
      ? {
          ...baseAgent,
          effort: ie,
        }
      : baseAgent;
  let agentMessages = [];
  logForDebugging(`SkillTool executing forked skill ${skillName} with agent ${agentDefinition.agentType}`);
  if (runInBackground) {
    let Q = await runForkedAgent({
      agentId,
      agentDefinition,
      command,
      description: `/${getCommandName(command)} ${args ?? ""}`.trim(),
      prompt: skillContent,
      promptMessages,
      context: toolUseContext,
      canUseTool,
      getAppState: modifiedGetAppState,
      permissionLayers:
        contextLayers.length > 0
          ? [...(toolUseContext.permissionLayers ?? []), ...contextLayers]
          : toolUseContext.permissionLayers,
      readFileState: forkReadFileState,
      availableTools,
      webFetchReadmissionAllowed,
      spawnedBySkill: getBareCommandName(command),
      recordInvocationOnSuccess: recordInvocation,
      frozenCommandDenies,
    });
    if (Q) {
      logFeatureOk("skill_invoke");
      return {
        data: {
          success: true,
          commandName: skillName,
          status: "forked",
          background: true,
          agentId,
          result: `Running in the background as @${Q.name}`,
        },
      };
    }
    recordInvocation();
  }
  let re = {
    ...agentContext,
    subagentName: agentDefinition.agentType,
    isBuiltIn: isBuiltInAgent(agentDefinition),
  };
  let forwardSubagentText = toolUseContext.options.forwardSubagentText;
  let le = (message, prompt) => {
    onProgress?.({
      type: "progress",
      toolUseID: `skill_${parentMessage.message.id}`,
      data: {
        message,
        type: "skill_progress",
        prompt,
        agentId,
        agentType: agentDefinition.agentType,
        description: command.description,
      },
    });
  };
  let de = registerForkedSkillTask({
    agentId,
    parentAgentId: agentId_2,
    spawnDepth: getAgentDepth(re),
    skillName: getCommandName(command),
    prompt: skillContent,
    selectedAgent: agentDefinition,
    taskRegistry: toolUseContext.taskRegistry,
    toolUseId: toolUseContext.toolUseId,
    callerAbortController: toolUseContext.abortController,
  });
  let ee = "failed";
  try {
    let found = normalizeMessages(promptMessages).find((F) => F.type === "user");
    if (found)
      le(
        {
          ...found,
          isMeta: undefined,
        },
        skillContent,
      );
    let ne = false;
    let B = timing?.mark("model");
    for await (let message of runAgent({
      agentDefinition,
      promptMessages,
      turnPrompt: skillContent,
      onModelRestricted: agentModelRestrictedReporter(getBareCommandName(command), onProgress),
      toolUseContext: {
        ...toolUseContext,
        getAppState: modifiedGetAppState,
        permissionLayers:
          contextLayers.length > 0
            ? [...(toolUseContext.permissionLayers ?? []), ...contextLayers]
            : toolUseContext.permissionLayers,
      },
      canUseTool,
      isAsync: false,
      querySource: "agent:custom",
      spawnedBySkill: getBareCommandName(command),
      spawnedByForkedSkill: true,
      model: command.model,
      availableTools,
      webFetchReadmissionAllowed,
      override: {
        agentId,
        agentContext: re,
        abortController: de.abortController,
        shareFileHistory: true,
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
      agentMessages.push(message);
      if (extractAgentIdsFromMessages_2(message)) {
        if (filterIncompleteToolCalls_2(toolUseContext, message))
          onProgress?.(createProgressMessage_2(message));
        continue;
      }
      if (message.type !== "assistant" && message.type !== "user") continue;
      if (!onProgress) continue;
      if (message.type === "user" && message.isMeta && !ne) continue;
      if (message.type === "assistant") ne = true;
      for (let ve of normalizeMessages([message])) {
        let be = ve.message.content[0];
        if (!forwardSubagentText && be?.type !== "tool_use" && be?.type !== "tool_result") continue;
        le(ve, "");
      }
    }
    B?.();
    let normalizedNew = isApiErrorDisplayMessage(getLastAssistantMessage(agentMessages));
    if (!normalizedNew) {
      adoptSubagentPublishArmsAsync(agentId, toolUseContext);
      if (toolUseContext.spawnedByWorkflowRunId !== undefined) recordInvocation();
    }
    let fe = unreadableToolsLine(toolsUsedForSummary(agentMessages), toolUseContext.messages);
    let result =
      withUntrustedPreamble(agentMessages) + extractResultText(agentMessages, "Skill execution completed");
    agentMessages.length = 0;
    let Se = Date.now() - startTime;
    logForDebugging(`SkillTool forked skill ${skillName} completed in ${Se}ms`);
    logFeatureOk("skill_invoke");
    ee = normalizedNew ? "failed" : "completed";
    return {
      data: {
        success: true,
        commandName: skillName,
        status: "forked",
        agentId,
        result,
        ...(fe !== undefined && {
          toolsUsedLine: fe,
        }),
      },
    };
  } finally {
    de.remove(ee);
    clearInvokedSkillsForAgent(agentId);
  }
}
//@ chunk-a5k9jscj.js:10399-11777 fingerprint = outputSchema (0.662)
/**
 * Skill 输入 schema（skill 名、args 可选）与输出 schema（inline：allowedTools/model/readOnly；forked：agentId/result/background/toolsUsedLine）。
 */
var skillInputSchema = DoctorLazy(() =>
  u({
    skill: string().describe("The name of a skill from the available-skills list. Do not guess names."),
    args: string().optional().describe("Optional arguments for the skill"),
  }),
);
var skillOutputSchema = DoctorLazy(() => {
  let inlineOutputSchema = u({
    success: M().describe("Whether the skill is valid"),
    commandName: string().describe("The name of the skill"),
    allowedTools: array(string()).optional().describe("Tools allowed by this skill"),
    model: string()
      .optional()
      .describe(
        "Resolved model the skill turn runs on when a frontmatter model override took effect; omitted otherwise",
      ),
    status: literal("inline").optional().describe("Execution status"),
    readOnly: M()
      .optional()
      .describe("True when the skill instructions were loaded read-only (nothing was executed)"),
  });
  let forkedOutputSchema = u({
    success: M().describe("Whether the skill completed successfully"),
    commandName: string().describe("The name of the skill"),
    status: literal("forked").describe("Execution status"),
    agentId: string().describe("The ID of the sub-agent that executed the skill"),
    result: string().describe("The result from the forked skill execution"),
    background: M()
      .optional()
      .describe(
        "True when the sub-agent was launched in the background: `result` describes the launch, and the skill outcome arrives later as a task notification.",
      ),
    toolsUsedLine: string()
      .optional()
      .describe(
        "The tools-used-before-summary line the tool_result opens with: the tools the sub-agent called that this conversation's requests did not yet name",
      ),
  });
  return union([inlineOutputSchema, forkedOutputSchema]);
});
//@ chunk-a5k9jscj.js:11777-11888 layout
function makeSkillCommandSource(toolUseContext) {
  return {
    storageV5: toolUseContext.storageV5,
    mcpCommands: () => toolUseContext.getAppState().mcp.commands,
    mcpClients: () => currentMcpClients(toolUseContext),
  };
}
//@ chunk-a5k9jscj.js:11888-15630 fingerprint = SkillTool (0.407)
/**
 * Skill 调用主体（runEngine 执行）：停止中的代理不能再启动 skill；解析 skill 名（重名报歧义），设置 options.activeSkill；fork 型 skill（且非只读加载）交给 executeForkedSkill；否则 processPromptSlashCommand 展开 skill 正文为新消息（过滤进度与命令标签消息，标注 toolUseID），记录遥测，返回 allowedTools/模型/effort 三类 contextLayers 供后续回合生效。
 */
async function runSkillInvocation({
  input: { skill, args },
  toolUseContext,
  canUseTool,
  parentMessage,
  onProgress,
  timing,
}) {
  if (toolUseContext.agentId !== undefined && isAgentStopPending(toolUseContext.agentId)) {
    logFeatureBad("subagent_launch", "skill_fork_spawner_stop_pending");
    throw Error("This agent has been stopped and its stop is still completing; it cannot launch skills.");
  }
  let trimmed = skill.trim();
  let skillName = trimmed.startsWith("/") ? trimmed.substring(1) : trimmed;
  let activeSkill = toolUseContext.options.activeSkill;
  let invokingSkill = activeSkill ?? toolUseContext.options.spawnedBySkill;
  toolUseContext.options.activeSkill = skillName;
  let isReadOnlyLoad = isCoordinatorMainThread(toolUseContext);
  let completed = false;
  try {
    let commands = await getSkillToolCommandList(makeSkillCommandSource(toolUseContext));
    let resolution = resolveSkillName(skillName, commands, toolUseContext);
    if (resolution.kind === "ambiguous") {
      let B = resolution.candidates.every((candidate) => isNonEmptyIdentifier(candidate.name))
        ? `: ${resolution.candidates.map((candidate) => candidate.name).join(", ")}`
        : "";
      throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
        `Skill ${skillName} now matches several skills${B} \u2014 invoke one by its full name.`,
        "Skill tool: bare name ambiguous at dispatch",
      );
    }
    let command = resolution.command;
    let Z = null;
    if (command) toolUseContext.options.activeSkill = getBareCommandName(command);
    if (!isReadOnlyLoad) {
      recordSkillInvoked(
        toolUseContext.session,
        command?.name ?? skillName,
        toolUseContext.storageV5,
        skillName,
      );
      if (command?.type === "prompt" && command.pluginInfo) recordPluginUsage(command.pluginInfo.repository);
    }
    if (
      command?.type === "prompt" &&
      getCommandContextMode(command, args || "", toolUseContext) === "fork" &&
      !isReadOnlyLoad
    ) {
      let B =
        toolUseContext.hookCaller !== undefined &&
        !toolUseContext.hookServesModel &&
        toolUseContext.agentId === undefined
          ? pluginInputHoldReason()
          : undefined;
      if (B !== undefined)
        throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
          `Skill "${skillName}" was not run: ${B}.`,
          "A forked skill was not run: a hold on plugins' input stands",
        );
      try {
        return await executeForkedSkill(
          command,
          skillName,
          args,
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
    let invokedSkillKey = `${toolUseContext.agentId ?? ""}:${command?.name ?? skillName}`;
    let priorInvocation = getInvokedSkills().get(invokedSkillKey);
    let { processPromptSlashCommand } = await import("./chunk-jghdfw5c.js");
    let skillToolUseId = toolUseContext.toolUseId ?? findToolUseIdByName(parentMessage, SKILL);
    let W =
      skillToolUseId !== undefined && handedOffIds(parentMessage.handedOffLive)?.has(skillToolUseId) === true;
    let processed = await processPromptSlashCommand(
      skillName,
      args || "",
      commands,
      toolUseContext,
      isReadOnlyLoad,
      W,
    );
    if (!processed.shouldQuery) {
      logFeatureBad("skill_invoke", "skill_invoke_process_failed");
      throw Error("Command processing failed");
    }
    let allowedTools = isReadOnlyLoad ? [] : processed.allowedTools || [];
    let skillModel = isReadOnlyLoad ? undefined : inlineSkillModelOverride(processed.model);
    let skillEffort = isReadOnlyLoad ? undefined : processed.effort;
    let isBuiltIn = builtInCommandNames().has(skillName);
    let isBundled = command?.type === "prompt" && command.source === "bundled";
    let isOfficial = command?.type === "prompt" && isOfficialMarketplaceSkill(command);
    let { sanitizedName, skillNameHash } = sanitizeSkillNameForTelemetry({
      rawName: skillName,
      canonicalName: command?.name ?? skillName,
      isMcp: command?.loadedFrom === "mcp",
      isBuiltIn,
      isBundled,
      isOfficial,
    });
    let queryDepth = toolUseContext.queryTracking?.depth ?? 0;
    let invocationTrigger = queryDepth > 0 ? "nested-skill" : "claude-proactive";
    let agentId = toolUseContext.agentId;
    let skillSource = command?.type === "prompt" ? command.source : undefined;
    let skillBodyChars = 0;
    for (let message of processed.messages) skillBodyChars += metaMessageText(message)?.length ?? 0;
    if (command?.type === "prompt" && command.pluginInfo && !isReadOnlyLoad)
      recordPluginActivity(
        command.pluginInfo.repository,
        "skill",
        commandActivity(command, command.pluginInfo.pluginManifest.name),
      );
    logEvent("tengu_skill_tool_invocation", {
      command_name: sanitizedName,
      _PROTO_skill_name: skillName,
      ...skillNameHash,
      execution_context: isReadOnlyLoad ? lit("read-only") : lit("inline"),
      invocation_trigger: fromEnum(invocationTrigger),
      query_depth: queryDepth,
      ...(toolUseContext.queryTracking && {
        query_chain_id: sanitizeMarkName(toolUseContext.queryTracking.chainId),
      }),
      ...parentSkillFields(
        invokingSkill,
        invokingSkill !== undefined && shippedCommandNames().has(invokingSkill),
      ),
      ...(agentId && {
        parent_agent_id: sanitizeMarkName(agentId),
      }),
      ...logSkillsLoaded(
        skillSource,
        command?.loadedFrom,
        command?.kind,
        command?.type === "prompt" ? command.createdBy : undefined,
      ),
      ...getTeamTipAttribution(skillSource, skillName),
      attribution_shown: getTeammateAuthor(toolUseContext.session, skillSource, skillName) !== null,
      ...(command?.type === "prompt" && {
        skill_content_chars: command.contentLength,
      }),
      skill_body_chars: skillBodyChars,
      ...false,
      ...(command?.type === "prompt" && command.pluginInfo && getSkillPluginTelemetryFields(command)),
      ...(command?.type === "prompt" && buildServerAttributionFields(command)),
    });
    skillLoadedSource(skillName, command, invocationTrigger, toolUseContext.agentContext);
    let filtered = processed.messages.filter((m) => {
      if (m.type === "progress") return false;
      if (m.type === "user" && "message" in m) {
        let content = m.message.content;
        if (typeof content === "string" && content.includes(`<${COMMAND_MESSAGE}>`)) return false;
      }
      return true;
    });
    let le = isReadOnlyLoad
      ? (filtered.map(metaMessageText).find((B) => B !== null) ?? undefined)
      : undefined;
    let newMessages = tagMessagesWithToolUseID(
      dedupeRenderedSkillContent({
        messages: filtered,
        contextMessages: toolUseContext.messages,
        commandName: skillName,
        args,
        priorContent: priorInvocation?.content ?? le,
        renderedContent: getInvokedSkills().get(invokedSkillKey)?.content ?? le,
      }),
      skillToolUseId,
    );
    logForDebugging(`SkillTool returning ${newMessages.length} newMessages for skill ${skillName}`);
    logFeatureOk("skill_invoke");
    let contextLayers = [];
    if (allowedTools.length > 0)
      contextLayers.push({
        kind: "allowed_tools",
        allowedTools,
      });
    let appState = toolUseContext.getAppState();
    let effectiveModel =
      skillModel &&
      isSkillModelOverrideAllowedInMode({
        skillModel,
        mode: appState.toolPermissionContext.mode,
        fastMode: appState.fastMode ?? false,
      })
        ? resolveSkillModelOverride(skillModel, toolUseContext.options.mainLoopModel)
        : undefined;
    if (effectiveModel)
      contextLayers.push({
        kind: "model",
        mainLoopModel: effectiveModel,
      });
    if (skillEffort !== undefined)
      contextLayers.push({
        kind: "effort",
        effort: skillEffort,
      });
    completed = true;
    return {
      data: {
        success: true,
        commandName: skillName,
        allowedTools: allowedTools.length > 0 ? allowedTools : undefined,
        model: effectiveModel,
        ...(isReadOnlyLoad && {
          readOnly: true,
        }),
      },
      newMessages,
      ...(contextLayers.length > 0 && {
        contextLayers,
      }),
    };
  } finally {
    if (isReadOnlyLoad || !completed) toolUseContext.options.activeSkill = activeSkill;
  }
}
//@ chunk-a5k9jscj.js:15630-25436 fingerprint = SAFE_SKILL_PROPERTIES (0.302)
/**
 * Skill 工具定义（name "Skill"，backgrounding never，maxResultSizeChars 100000；isEnabled 为 !Wb()）。validateInput：去前导 /，解析命令（可能需要从远端物化或加载定义），拒绝 MCP 来源 skill、被同步否决或主机目录隐藏的 skill，未找到时给出近似名/目录作用域变体/插件加载错误提示，拒绝在自己 fork 的上下文里递归调用，并用 jKe 检查 disable-model-invocation、未加白名单等。checkPermissions：Skill deny 规则 → MCP skill 拒绝 → ask 规则 → allow 规则（含插件边界 held-back 情况）→ 只含安全属性的 prompt skill 或协调者只读加载直接允许 → 否则询问并建议加 Skill(name) 或 Skill(name:*) 规则。call 通过 runEngine 执行 runSkillInvocation。
 */
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
  description: async ({ skill }) => `Execute skill: ${skill}`,
  prompt: async ({ model, leanRewrite }) =>
    getSkillToolPrompt({
      model,
      leanRewrite,
    }),
  toAutoClassifierInput: ({ skill }) => skill ?? "",
  create(e) {
    let toolContext = e;
    return {
      async validateInput({ skill }, { signal, toolUseId }) {
        let trimmed = skill.trim();
        if (!trimmed) {
          logFeatureBad("skill_invoke", "skill_invoke_empty_name");
          return {
            result: false,
            message: `Invalid skill format: ${skill}`,
            errorCode: 1,
          };
        }
        let v = trimmed.startsWith("/");
        if (v) logEvent("tengu_skill_tool_slash_prefix", {});
        let skillName = v ? trimmed.substring(1) : trimmed;
        let downloadFailure;
        let isWithheld = false;
        let commands = await getSkillToolCommandList(toolContext);
        let resolution = resolveSkillName(skillName, commands, toolContext);
        let command = resolution.command;
        let unprefixedName = stripSyncedSkillPrefix(skillName);
        if (
          isSkillsSyncActive(toolContext.session) &&
          (!command || isSyncedSkillPlaceholder(command)) &&
          (command !== undefined || hasPendingSkillDownload(unprefixedName))
        ) {
          let P = await raceWithAbortSignal(
            startPendingDownload(unprefixedName),
            signal,
            () => new AbortError(INTERRUPT_MESSAGE_FOR_TOOL_USE),
          );
          if (!P.ok) {
            downloadFailure = P.reason;
            isWithheld = P.withheld === true;
          } else {
            commands = await getSkillToolCommandList(toolContext);
            resolution = resolveSkillName(skillName, commands, toolContext);
            command = resolution.command;
          }
        }
        let z = resolution.kind === "listingName" ? resolution.listed : command;
        if (z?.type === "prompt" && z.loadDefinition !== undefined) {
          await raceWithAbortSignal(
            z.loadDefinition(),
            signal,
            () => new AbortError(INTERRUPT_MESSAGE_FOR_TOOL_USE),
          );
          commands = await getSkillToolCommandList(toolContext);
          resolution = resolveSkillName(skillName, commands, toolContext);
          let P =
            resolution.kind === "none" && z.directoryListingName !== undefined
              ? resolveSkillName(z.directoryListingName, commands, toolContext)
              : resolution;
          if (P.kind === "listingName") resolution = P;
          command = resolution.command;
        }
        if (command?.type === "prompt" && command.loadedFrom === "mcp")
          return {
            result: false,
            message: `Unknown skill: ${skillName}`,
            errorCode: 2,
          };
        if (downloadFailure !== undefined && (!command || isSyncedSkillPlaceholder(command))) {
          logFeatureBad(
            "skill_invoke",
            isWithheld ? "skill_invoke_withheld" : "skill_invoke_not_materialized",
          );
          return {
            result: false,
            message: isWithheld
              ? `${skillSwitchedOffText(skillName)} Proceed without it.`
              : `Skill ${skillName} could not be downloaded (${downloadFailure}). Proceed without it.`,
            errorCode: 10,
          };
        }
        let te = null;
        if (command && syncedSkillRefusalReason(command)) {
          logFeatureBad(
            "skill_invoke",
            isHostCatalogSkill(command) ? "skill_invoke_host_catalog_withheld" : "skill_invoke_sync_vetoed",
          );
          return {
            result: false,
            message: `Unknown skill: ${skillName}`,
            errorCode: 13,
          };
        }
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
              logEvent("tengu_skill_tool_suffix_match", {
                candidate_count: resolution.candidates.length,
              });
            logFeatureBad("skill_invoke", "skill_invoke_not_found");
            return {
              result: false,
              message:
                y.length > 0
                  ? `Unknown skill: ${skillName}. Several skills match that name: ${[...y, ...P].map((E) => E.name).join(", ")} \u2014 invoke one by its full name; the directory-scoped variants apply to the files under their directory.`
                  : `Unknown skill: ${skillName}. Directory-scoped variants exist: ${P.map((E) => E.name).join(", ")} \u2014 invoke the variant whose directory contains the files you are working on.`,
              errorCode: 2,
            };
          }
          if (resolution.kind === "listingName") {
            let { listed } = resolution;
            let E = toolContext.agentId === undefined;
            if (
              listSkillCommands(commands, E).includes(listed) &&
              isNonEmptyIdentifier(listed.name) &&
              !isSelfForkedSkill(listed, toolContext) &&
              checkSkillPermission(listed, {
                commandName: listed.name,
                userTypedThisTurn: false,
                isMainSession: E,
                permissionContext: toolContext.permissions(),
              }) === null
            ) {
              logFeatureBad("skill_invoke", "skill_invoke_not_found");
              return {
                result: false,
                message: `Unknown skill: ${skillName}. Did you mean ${listed.name}? Invoke it by that full name.`,
                errorCode: 2,
              };
            }
          }
          if (resolution.kind === "suggestion") {
            logEvent("tengu_skill_tool_suffix_match", {
              candidate_count: 1,
            });
            if (isNonEmptyIdentifier(resolution.suggestion.name)) {
              logFeatureBad("skill_invoke", "skill_invoke_not_found");
              return {
                result: false,
                message: `Unknown skill: ${skillName}. Did you mean ${resolution.suggestion.name}? Invoke it by that full name.`,
                errorCode: 2,
              };
            }
          }
          if (resolution.kind === "ambiguous") {
            logEvent("tengu_skill_tool_suffix_match", {
              candidate_count: resolution.candidates.length,
            });
            let filtered = resolution.candidates.filter(
              (candidate) => !matchesUnqualifiedName(candidate, skillName),
            );
            let E = filtered.length === 1 ? filtered[0] : undefined;
            if (filtered.length > 0 && filtered.every((R) => isNonEmptyIdentifier(R.name))) {
              logFeatureBad("skill_invoke", "skill_invoke_not_found");
              return {
                result: false,
                message:
                  E !== undefined
                    ? `Unknown skill: ${skillName}. Did you mean ${E.name}? Invoke it by that full name.`
                    : `Unknown skill: ${skillName}. Several skills match that name: ${filtered.map((R) => R.name).join(", ")} \u2014 invoke one by its full name.`,
                errorCode: 2,
              };
            }
          }
          let V = suggestClosestName(
            skillName,
            commands.map((command) => ({
              name: getCommandName(command),
              aliases: command.aliases,
            })),
            {
              maxEditDistance: 2,
            },
          );
          let N = toolContext.agentId === undefined;
          let W =
            V === undefined && unprefixedName !== skillName
              ? listSkillCommands(commands, N).find(
                  (y) => y.name === unprefixedName && isProjectScopedCommand(y),
                )
              : undefined;
          let x =
            W !== undefined &&
            isNonEmptyIdentifier(unprefixedName) &&
            !usesReservedSkillNamespace(unprefixedName) &&
            !isSelfForkedSkill(W, toolContext) &&
            checkSkillPermission(W, {
              commandName: unprefixedName,
              userTypedThisTurn: false,
              isMainSession: N,
              permissionContext: toolContext.permissions(),
            }) === null;
          if (x) logEvent("tengu_skill_tool_unprefixed_match", {});
          let suggestedName = V ?? (x ? unprefixedName : undefined);
          logFeatureBad("skill_invoke", "skill_invoke_not_found");
          let O = await isPluginLoadCacheOnly()?.catch(() => {
            return;
          });
          let j = O && pluginLoadFailureNote(skillName, O.errors, new Set(O.enabled.map((y) => y.name)));
          let q = suggestedName
            ? `Unknown skill: ${skillName}. Did you mean ${suggestedName}?`
            : `Unknown skill: ${skillName}`;
          return {
            result: false,
            message: j ? `${q}${suggestedName ? "" : "."} ${j}` : q,
            errorCode: 2,
          };
        }
        if (isSelfForkedSkill(command, toolContext)) {
          logFeatureBad("skill_invoke", "skill_invoke_fork_recursion");
          logEvent("tengu_skill_tool_fork_recursion_blocked", {});
          return {
            result: false,
            message: `Skill ${skillName} is already executing in this forked context \u2014 you are the subagent running it. Execute the instructions in the skill body directly instead of re-invoking the ${SKILL} tool.`,
            errorCode: 9,
          };
        }
        let Z = await isYieldedSkillTarget(skillName, command, commands, toolContext.storageV5);
        let invocationBlock = checkSkillPermission(command, {
          commandName: Z ? skillName : command.name,
          userTypedThisTurn:
            !isCoordinatorMainThread(toolContext) &&
            userTypedSkillThisTurn(skillName, {
              agentId: toolContext.agentId,
              messages: toolContext.messages(),
              turnStartIndex: toolContext.turnStartIndex,
            }) &&
            Z,
          isMainSession: toolContext.agentId === undefined,
          permissionContext: undefined,
        });
        if (invocationBlock !== null) {
          switch (invocationBlock.reason) {
            case "disable_model_invocation": {
              let { sanitizedName, skillNameHash } = sanitizeSkillNameForTelemetry({
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
          return {
            result: false,
            message: invocationBlock.message,
            errorCode: invocationBlock.errorCode,
          };
        }
        return {
          result: true,
        };
      },
      async checkPermissions(s, i) {
        let { skill, args } = s;
        let trimmed = skill.trim();
        let skillName = trimmed.startsWith("/") ? trimmed.substring(1) : trimmed;
        let h = toolContext.permissions();
        let skillToolCommandList = await getSkillToolCommandList(toolContext);
        let resolution = resolveSkillName(skillName, skillToolCommandList, toolContext);
        let command = resolution.command;
        let w = resolution.kind === "ambiguous" ? resolution.candidates : [command];
        let L = command?.type === "prompt" && command.loadedFrom === "mcp" ? command : undefined;
        let z = L?.mcpSkillEntry?.();
        let S = undefined;
        let te = undefined;
        let contentRulesMapForTool = getContentRulesMapForTool(h, SkillTool, "deny");
        for (let [y, E] of contentRulesMapForTool.entries())
          if (
            (y.startsWith("/") ? y.substring(1) : y) === undefined ||
            w.some((R) => matchesSkillRule(y, skillName, R))
          )
            return {
              behavior: "deny",
              message: "Skill execution blocked by permission rules",
              decisionReason: {
                type: "rule",
                rule: E,
              },
            };
        if (L !== undefined)
          return {
            behavior: "deny",
            message: `Unknown skill: ${skillName}`,
            decisionReason: {
              type: "other",
              reason: `Unknown skill: ${skillName}`,
            },
          };
        let D = () =>
          isPlaidHarborOn() &&
          usesReservedSkillNamespace(skillName) &&
          !(command !== undefined && isSyncedOrManagedSkill(command));
        let contentRulesMapForTool_2 = getContentRulesMapForTool(h, SkillTool, "ask");
        if (contentRulesMapForTool_2.size > 0 && areSkillsConvertedAsPlugins()) {
          for (let [y, E] of contentRulesMapForTool_2.entries())
            if (w.some((R) => skillAllowedByRules(y, skillName, R)))
              return {
                behavior: "ask",
                message: `Execute skill: ${skillName}`,
                decisionReason: {
                  type: "rule",
                  rule: E,
                },
                ...(D() && {
                  suppressAlwaysAllowRule: true,
                }),
                updatedInput: {
                  skill,
                  args,
                },
                metadata: command
                  ? {
                      command,
                    }
                  : undefined,
              };
        }
        let contentRulesMapForTool_3 = getContentRulesMapForTool(h, SkillTool, "allow");
        let heldBackAllowRule;
        for (let [y, E] of contentRulesMapForTool_3.entries()) {
          let R = reservedSkillRuleMatch(y, skillName, command);
          if (R === "allow")
            return {
              behavior: "allow",
              updatedInput: {
                skill,
                args,
              },
              decisionReason: {
                type: "rule",
                rule: E,
              },
            };
          if (R === "held-back-nonholder")
            heldBackAllowRule = {
              rule: y,
              kind: "nonholder",
            };
          else if (R === "held-back-boundary")
            heldBackAllowRule ??= {
              rule: y,
              kind: "boundary",
            };
        }
        if (
          command?.type === "prompt" &&
          (skillHasOnlySafeProperties(command) || isCoordinatorMainThread(toolContext))
        )
          return {
            behavior: "allow",
            updatedInput: {
              skill,
              args,
            },
            decisionReason: undefined,
          };
        let pluginName =
          command?.type === "prompt" && command.source === "plugin"
            ? command.pluginInfo?.pluginManifest.name
            : undefined;
        let x = D();
        let U = heldBackAllowRule === undefined ? undefined : x ? "nonholder" : heldBackAllowRule.kind;
        if (U !== undefined && h.mode !== "bypassPermissions" && toolAlwaysAllowedRule(h, SkillTool) === null)
          logReservedRuleHeldBack(U);
        let O =
          heldBackAllowRule === undefined || U === undefined
            ? undefined
            : describeSyncedSkillRuleScope(
                heldBackAllowRule.rule,
                command?.name ?? skillName,
                U === "nonholder"
                  ? {
                      kind: "nonholder",
                      pluginName,
                    }
                  : {
                      kind: "boundary",
                    },
              );
        let decisionReason =
          O === undefined
            ? undefined
            : {
                type: "other",
                reason: O,
              };
        if (x)
          return {
            behavior: "ask",
            message: `Execute skill: ${skillName}${O ? ` \u2014 ${O}` : ""}`,
            decisionReason,
            suppressAlwaysAllowRule: true,
            updatedInput: {
              skill,
              args,
            },
            metadata: command
              ? {
                  command,
                }
              : undefined,
          };
        let suggestions = [
          {
            type: "addRules",
            rules: [
              {
                toolName: SKILL,
                ruleContent: skillName,
              },
            ],
            behavior: "allow",
            destination: "localSettings",
          },
          {
            type: "addRules",
            rules: [
              {
                toolName: SKILL,
                ruleContent: `${skillName}:*`,
              },
            ],
            behavior: "allow",
            destination: "localSettings",
          },
        ];
        return {
          behavior: "ask",
          message: `Execute skill: ${skillName}${O ? ` \u2014 ${O}` : ""}`,
          decisionReason,
          suggestions,
          updatedInput: {
            skill,
            args,
          },
          metadata: command
            ? {
                command,
              }
            : undefined,
        };
      },
      call(input, i) {
        if (!i.runEngine) return Promise.reject(Error("Skill: invoking needs the executor (call.runEngine)"));
        return i.runEngine(runSkillInvocation, {
          input,
          parentMessage: i.parentMessage,
          onProgress: i.onProgress,
          timing: i.timing,
        });
      },
    };
  },
  mapToolResultToToolResultBlockParam(e, toolUseID) {
    if ("status" in e && e.status === "forked")
      return {
        type: "tool_result",
        tool_use_id: toolUseID,
        content:
          (e.toolsUsedLine === undefined
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
        tool_use_id: toolUseID,
        content: `Loaded skill instructions (read-only): ${e.commandName}. Nothing was executed; delegate execution to a worker.`,
      };
    return {
      type: "tool_result",
      tool_use_id: toolUseID,
      content: `Launching skill: ${e.commandName}`,
    };
  },
  renderToolUseMessage,
});
var SAFE_SKILL_PROPERTIES = new Set([
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
//@ chunk-a5k9jscj.js:25436-25685 file-local
/**
 * prompt 型 skill 的属性是否全部在 SAFE_SKILL_PROPERTIES 内（或为空值）；是则无需权限询问。
 */
function skillHasOnlySafeProperties(command) {
  for (let key of Object.keys(command)) {
    if (SAFE_SKILL_PROPERTIES.has(key)) continue;
    let value = command[key];
    if (value === undefined || value === null) continue;
    if (Array.isArray(value) && value.length === 0) continue;
    if (typeof value === "object" && !Array.isArray(value) && Object.keys(value).length === 0) continue;
    return false;
  }
  return true;
}
//@ chunk-a5k9jscj.js:25685-26706 placement
function dedupeRenderedSkillContent({
  messages,
  contextMessages,
  commandName,
  args,
  priorContent,
  renderedContent,
}) {
  if (!priorContent || !renderedContent) return messages;
  if (
    messages.some(
      (message) =>
        message.type === "user" &&
        (message.promptShellHandOff !== undefined || message.mcpSkill !== undefined),
    )
  )
    return messages;
  let v = restoreSkillStateFromMessages(contextMessages, priorContent);
  if (!v) return messages;
  if (priorContent !== renderedContent) {
    let content = priorContent.endsWith(SKILL_TRUNCATION_NOTE)
      ? `(Re-invocation of /${commandName} \u2014 the previously loaded copy was truncated by compaction; the full instructions follow.)`
      : `(Re-invocation of /${commandName} \u2014 the skill instructions were previously loaded; the arguments or dynamic output below are new.)`;
    return [
      createUserMessage({
        content,
        isMeta: true,
      }),
      ...messages,
    ];
  }
  let r = false;
  let mapped = messages.map((message) => {
    if (metaMessageText(message) !== renderedContent) return message;
    r = true;
    return createUserMessage({
      content:
        v === "attachment"
          ? `Skill /${commandName} was loaded earlier (see the invoked-skills reminder above); this is a NEW invocation \u2014 follow those instructions now, including any setup steps.${args ? ` Arguments: ${args}` : ""}`
          : `Skill /${commandName} is already loaded above; instructions unchanged.${args ? ` Arguments: ${args}` : ""}`,
      isMeta: true,
    });
  });
  if (r) logForDebugging(`SkillTool eliding byte-identical re-invocation of skill ${commandName}`);
  return mapped;
}
//@ chunk-a5k9jscj.js:26706-26818 placement = tagMessagesWithToolUseID (1)
/**
 * tagMessagesWithToolUseID：给 user 消息加 sourceToolUseID（技能/命令展开出的消息归属到发起它的工具调用）。
 */
function tagMessagesWithToolUseID(messages, toolUseID) {
  if (!toolUseID) return messages;
  return messages.map((m) => {
    if (m.type === "user")
      return {
        ...m,
        sourceToolUseID: toolUseID,
      };
    return m;
  });
}
//@ chunk-a5k9jscj.js:26818-26944 placement = countToolCallsSince (1)
function findToolUseIdByName(messages, sinceUuid) {
  let found = messages.message.content.find((block) => block.type === "tool_use" && block.name === sinceUuid);
  return found && found.type === "tool_use" ? found.id : undefined;
}
//@ chunk-a5k9jscj.js:26944-27017 placement
function agentToolHintSuffix() {
  return getSubagentSteer() === "default" ? " (use the Agent tool instead)" : "";
}
//@ chunk-csq9ftr9.js:9850-9976 fingerprint = isOfficialMarketplaceSkill (1)
/**
 * skill 是否来自官方市场插件。
 */
function isOfficialMarketplaceSkill(command) {
  if (command.source !== "plugin" || !command.pluginInfo?.repository) return false;
  return isOfficialMarketplaceName_3(parsePluginIdentifier_2(command.pluginInfo.repository).marketplace);
}
//@ chunk-e6aww6q8.js:2804890-2805133 fingerprint = getAllCommands (0.414)
/**
 * 构造工具名 → 来源（mcp / static）映射，额外登记 DeferredToolPlaceholder 为 static；供 API 层判定工具类别。
 */
function getToolNameKinds(tools, extraToolSchemas) {
  let r = new Map();
  for (let s of tools)
    if (s.isMcp === true) r.set(s.name, "mcp");
    else if (s.uiTableKey === undefined) r.set(s.name, "static");
  for (let s of extraToolSchemas) if ("name" in s && typeof s.name === "string") r.set(s.name, "static");
  r.set(DEFERREDTOOLPLACEHOLDER, "static");
  return r;
}
export { isOfficialMarketplaceSkill, getToolNameKinds, agentToolHintSuffix, SkillTool };
