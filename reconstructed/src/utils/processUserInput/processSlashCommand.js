/**
 * utils/processUserInput/processSlashCommand.tsx
 *
 * / 斜杠命令处理：解析、prompt/local/local-jsx 三类命令执行、技能加载元数据、出错记录
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/utils/processUserInput/processSlashCommand.tsx
 * pieces: chunk-3g0djq3w.js (28), chunk-bc20zedk.js (1), chunk-e6aww6q8.js (3)
 * attribution: affinity 4, facade-exports 7, layout 12, fingerprint 5, callgraph-witnessed 1, placement 3
 */
import { randomUUID } from "crypto";
import {
  getToolPermissionContext,
  getEffortValue,
  getEffortLayerOverride,
} from "../permissions/toolPermissionContext.js";
import {
  logFeatureSad,
  logFeatureBad,
  logFeatureOk,
  cmdFeature,
} from "../../services/analytics/featureTelemetry.js";
import {
  createUserMessage,
  createSystemMessage,
  prepareUserContent,
  createUserInterruptionMessage,
  createCommandInputMessage,
  normalizeMessages,
  extractAgentIdsFromMessages_2,
  getLastAssistantMessage,
  hasToolResultBlock,
  createSyntheticUserCaveatMessage,
  formatCommandInputTags,
  getContentText,
  wrapInSystemReminder,
} from "../messages.js";
import { createAttachmentMessage_2 as createAttachmentMessage, logForDebugging } from "../debug.js";
import { makeSaltedName } from "../agentId.js";
import {
  sanitizeSkillNameForTelemetry,
  logSkillsLoaded,
  skillLoadedSource,
} from "../telemetry/skillLoadedEvent.js";
import {
  builtInCommandNames,
  getBareCommandName,
  getCommandName,
  getBuiltinCommands,
  findCommand,
  meetsAvailabilityRequirement,
  isCommandEnabled,
  hasCommand,
  isSkillOff,
  hasSensitiveArgs,
  shippedCommandNames,
  buildCommandRunInfo,
  getCommand,
  describeSkillHiddenBehindPlugin,
  isImmediateCommand,
  getCommandContextMode,
  getBareCommandNameUnlessSynced,
} from "../../commands.js";
import { isOfficialMarketplaceSkill } from "../../tools/SkillTool/SkillTool.js";
import { logEvent } from "../../services/analytics/index.js";
import { lit, fromEnum } from "../../services/analytics/safeMetadata.js";
import { getTeamTipAttribution } from "../../services/tips/teamArtifactTips.js";
import {
  buildServerAttributionFields,
  getSkillPluginTelemetryFields,
  recordPluginUsage,
} from "../telemetry/pluginTelemetry.js";
import {
  shouldBackgroundForkedSkill,
  scopedSkillVariantNote,
  runForkedAgent,
  registerForkedSkillTask,
} from "../../tools/SkillTool/forkedSkill.js";
import { getAgentDepth, getWorkflowRunFields } from "../agentContext.js";
import {
  prepareForkedCommandContext,
  extractResultText,
  setLastCacheSafeForkMessages,
} from "../forkedAgent.js";
import { getAttachmentMessages } from "../attachments.js";
import { withCommandTextBlocks } from "../messages/apiNormalization.js";
import {
  getProjectRoot,
  clearInvokedSkillsForAgent,
  getDisableSlashCommands,
  setPromptId,
  isDiskless,
  getSkillsSyncVetoed,
  getSessionId,
  addInvokedSkill,
  getProjectRootOrNull,
} from "../../bootstrap/state.js";
import {
  resolveAgentTools,
  withWebFetchToolForAgent,
  isApiErrorDisplayMessage,
  adoptSubagentPublishArmsAsync,
} from "../../tools/AgentTool/agentToolUtils.js";
import { memoryModeForSession } from "../../services/accountMemory/memoryContext.js";
import {
  isAbortError,
  withTelemetryMessage,
  toError,
  MalformedCommandError,
  AbortError,
  TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS,
} from "../errors.js";
import { escapeXml_2 as escapeXml } from "../confusables.js";
import { escapeForkedSkillTag, forkedSkillLaunchTag } from "../xmlTagText.js";
import { sanitizeTelemetryString } from "../sanitization.js";
import { transportStateByHost, isBridgeOrTransport } from "../../cli/transportState.js";
import {
  writeSubagentProgressToOutputSink,
  runAgent,
  filterIncompleteToolCalls_2,
} from "../../tools/AgentTool/runAgent.js";
import { agentModelRestrictedReporter } from "../model/agentModelRestriction.js";
import { getAssistantMessageContentLength } from "../tokens.js";
import { logError } from "../log.js";
import { withUntrustedPreamble } from "../messages/untrustedArtifactContent.js";
import {
  isBundledSkillsPolicyDenied,
  isSkillOutsideCorePolicy,
  ALLOW_BUNDLED_SKILLS,
} from "../../skills/bundledSkillsGate.js";
import {
  getBundledSkills,
  getRegisteredBundledSkillsIgnoringKillSwitch,
  isShippedSkillExecutionBlocked,
} from "../../skills/bundledSkills.js";
import { builtinPluginSkillCommands, availableBuiltinSkillCommands } from "../plugins/managedPlugins.js";
import {
  isPolicyAllowed,
  policyDenyKind,
  policyKeyLabel,
  policyDeniedReason,
} from "../../services/policyLimits/policyEvidence.js";
import {
  commandEnabledAfterStartMessage,
  couldNotVerifyPolicyFor,
} from "../../services/policyLimits/policyMessages.js";
import {
  commandSurfaceNotice,
  isQuillKillswitchOff,
  unknownCommandFallback,
  hasSingleCommandRunHook,
  modCommandFollowUpNote,
} from "./surfaceCommandNotices.js";
import {
  getNonInteractiveCommands,
  isSyncedSkill,
  isKilledHostCatalogSkill,
  getCommandRequirements,
  isHiddenFromModel,
  notifySetupGuideLoaded,
} from "../commandPredicates.js";
import { normalizeServerNameShort } from "../../services/api/deferredToolsState.js";
import {
  takeQueuedCommandWaiter,
  joinCommandRunDispatch,
  interruptedCommandResult,
  dispatchCommandRunHooks,
  lazyCommandRunSignal,
  commandSetSignalA,
  commandSetSignalB,
} from "../../plugins/functionHooks/commandRunDispatch.js";
import { getEffortLevelIfSupported } from "../effort.js";
import { getOriginKindLabel } from "../messages/promptOrigin.js";
import { promptTelemetryFields, promptOriginForHooks } from "../promptSource.js";
import { emptyObjectFactory } from "../../tools/RefreshMcpToolsTool/RefreshMcpToolsTool.js";
import {
  logSlashPromptEvent,
  cloneContent,
  parseSlashCommand,
  matchSubcommand,
} from "../slashCommandParsing.js";
import { wrapNonUserMessage } from "../messages/nonUserMessages.js";
import { redactSecrets, containsSecret } from "../redactSecrets.js";
import { CODE_REVIEW } from "../../skills/bundled/bundledSkillNames.js";
import { ultrareviewAuthPrecondition } from "../../commands/review/ultrareviewPreconditions.js";
import {
  checkCommandSyncedAccess,
  syncedSkillRefusalReason,
  isDefined,
  logSyncedCommandRefused,
  findRefusedSyncedCommands,
  resolveSkillGitRoot,
} from "../claudeAiSync/syncedSkillAccess.js";
import { withTaskSuffix } from "../../tasks/endedByModel.js";
import { isUntouchableSpelling } from "../networkPaths.js";
import { getFsImplementation } from "../fsOperations.js";
import { logOrgPolicyDenied } from "../../services/policyLimits/orgPolicyDeniedEvent.js";
import { suggestClosestName, boundedEditDistance } from "../settings/managedEnvKeys.js";
import { isToolDetailsLoggingEnabled, sanitizeVersion } from "../../services/analytics/metadata.js";
import { isPromptHookObserved } from "../telemetry/sessionTracing.js";
import { swallowAbortError } from "../abortErrors.js";
import { resolvePromptOrigin } from "../messageOrigin.js";
import { viewportInfo } from "../../plugins/functionHooks/surfaceBinding.js";
import { isHumanOrAutoContinuation } from "../messageProvenance.js";
import { recordPluginActivity, commandActivity } from "../pluginActivity.js";
import { isCompactBoundaryMessage } from "../../services/projects/threadRows.js";
import { isSystemLocalCommandMessage } from "../../bootstrap/sessionSlices.js";
import { getTipAttribution } from "../../services/tips/tipIds.js";
import {
  LOCAL_COMMAND_STDOUT,
  LOCAL_COMMAND_STDERR,
  COMMAND_MESSAGE,
  COMMAND_NAME,
  SKILL_FORMAT,
} from "../../constants/xml.js";
import { unwrapPastedContentBlocks } from "../pastedContent.js";
import { recordSkillInvoked } from "../suggestions/skillUsageTracking.js";
import { claimCommandOverageCredit } from "../../services/api/overageCreditGrant.js";
import { NO_CONTENT_MESSAGE } from "../../constants/messages.js";
import { isRemoteSessionAvailable, REMOTE_STOPPED_WAITING_NOTICE } from "../../remote/remoteMode.js";
import { raceWithAbortSignal } from "../sleep.js";
import { buildPostCompactMessages } from "../../services/compact/compact.js";
import { isCoordinatorMainThread } from "../../coordinator/coordinatorMode.js";
import { processUserInput_2 } from "./processUserInput.js";
import {
  snapshotHookRegistration,
  hasHookRegistrationChanged,
  hasPromptSubmitHooks,
} from "../plugins/functionHooks/hookRegistration.js";
import { evaluateAskingNoHost } from "../permissions/permissions.js";
import { isSilentAbortReason, shutdownInterruptStamp } from "../abortController.js";
import { SKILL } from "../../tools/SkillTool/skillToolNames.js";
import { splitRuleList } from "../permissions/disallowedToolsFlag.js";
import {
  armedAllowedToolsOf,
  getCommandRepository,
  areCommandHooksHeld,
} from "../permissions/permissionsLoader.js";
import { applySkillPromptHooks } from "../../plugins/functionHooks/skillPromptHooks.js";
import { isRestrictedToPluginOnly, isSourceAdminTrusted } from "../settings/pluginOnlyPolicy.js";
import { logSyncedSkillRestricted } from "../../services/plugins/accountSync/syncedPluginHooks.js";
import {
  checkSkillHooksFit,
  registerSkillHooks,
  SKILL_HOOKS_NOT_REGISTERED_TEXT,
} from "../hooks/registerSkillHooks.js";
import { isRepoFrontmatterHookRestricted } from "../hooks/registerFrontmatterHooks.js";
import { slashTestPattern } from "../attributionFileClasses.js";
import { getCwdOrNull } from "../cwd.js";
import { setCommandDenyRules } from "../attachments/skillMentions.js";
import { isSkillShownToModel } from "../../skills/skillSources.js";
import { toArray_2 } from "../generators.js";
import { isSoftSparkEnabled } from "../../services/compact/compactSettings.js";
import { inlineSkillModelOverride } from "../model/model.js";
import { hookedCommands_2 } from "../../plugins/functionHooks/commandHooks.js";
import { hostOpsRoot } from "../../plugins/functionHooks/hooksWorkerHost.js";

//@ chunk-3g0djq3w.js:9865-9925 affinity
var NON_HISTORY_COMMANDS = new Set(["clear", "resume", "help", "exit", "feedback"]);
//@ chunk-3g0djq3w.js:9925-10004 facade-exports = getValueFromInput (1)
function isSlashCommandBlockedByEndedByModel(e, endedByModel) {
  if (!endedByModel) return false;
  return !(e && e.type !== "prompt" && NON_HISTORY_COMMANDS.has(e.name));
}
//@ chunk-3g0djq3w.js:10004-11339 layout
/**
 * fork 命令结束时运行 Stop 钩子：收集系统消息、错误与附加上下文，决定是否需要继续查询；否则运行回合结束反应。
 */
async function runForkStopHooks(e, n, o) {
  let messages = [];
  let requestQuery = false;
  let activeGoal = e.agentId ? undefined : e.getAppState().activeGoal;
  try {
    let p = o.executeStopHooks(
      getToolPermissionContext(e).mode,
      e.abortController.signal,
      undefined,
      false,
      e.agentId,
      e,
      [...e.messages, ...n],
      undefined,
      "fork_dispatch",
    );
    let h = [];
    for await (let y of p) {
      if (y.timedOut && activeGoal && y.hook?.prompt === activeGoal.condition)
        logFeatureSad("goal_met", "evaluator_timeout");
      if (y.message?.type === "attachment") {
        let attachment = y.message.attachment;
        if ("hookEvent" in attachment && attachment.hookEvent === "Stop") {
          if (attachment.type === "hook_non_blocking_error")
            h.push(attachment.stderr || `Exit code ${attachment.exitCode}`);
          else if (attachment.type === "hook_error_during_execution") h.push(attachment.content);
          else if (attachment.type === "hook_system_message") messages.push(y.message);
        }
      }
      if (y.blockingError) {
        messages.push(
          createUserMessage({
            content: o.getStopHookMessage(y.blockingError),
            isMeta: true,
          }),
        );
        requestQuery = true;
      }
      if (y.additionalContexts && y.additionalContexts.length > 0) {
        messages.push(
          createAttachmentMessage({
            type: "hook_additional_context",
            content: y.additionalContexts,
            hookName: "Stop",
            toolUseID: `hook-${randomUUID()}`,
            hookEvent: "Stop",
          }),
        );
        requestQuery = true;
      }
    }
    if (h.length > 0) messages.push(createSystemMessage(`Stop hook error: ${h.join("; ")}`, "warning"));
  } catch (error) {
    logForDebugging(`Forked command Stop hooks failed: ${String(error)}`, {
      level: "error",
    });
  }
  if (!requestQuery)
    try {
      let p = o.executeStopHooks(
        getToolPermissionContext(e).mode,
        e.abortController.signal,
        undefined,
        false,
        e.agentId,
        e,
        [],
        undefined,
        "turn_end_reactions",
      );
      for await (let h of p);
    } catch (error) {
      logForDebugging(`Forked command turn-end reactions failed: ${String(error)}`, {
        level: "error",
      });
    }
  return {
    messages,
    requestQuery,
  };
}
//@ chunk-3g0djq3w.js:11339-16950 fingerprint = executeForkedSlashCommand (0.467)
/**
 * executeForkedSlashCommand：context: fork 的技能在子代理里运行。
 */
async function executeForkedSlashCommand(
  command,
  n,
  toolUseContext,
  u,
  s,
  canUseTool,
  p,
  h = [],
  y,
  uuid,
  A,
  origin,
  H,
) {
  let agentId = makeSaltedName();
  let { sanitizedName, skillNameHash } = sanitizeSkillNameForTelemetry({
    rawName: command.name,
    canonicalName: command.name,
    isMcp: command.loadedFrom === "mcp",
    isBuiltIn: builtInCommandNames().has(command.name),
    isBundled: command.source === "bundled",
    isOfficial: isOfficialMarketplaceSkill(command),
  });
  logEvent("tengu_slash_command_forked", {
    command_name: sanitizedName,
    ...skillNameHash,
    _PROTO_skill_name: command.name,
    invocation_trigger: lit("user-slash"),
    ...logSkillsLoaded(command.source, command.loadedFrom, command.kind, command.createdBy),
    ...getTeamTipAttribution(command.source, command.name),
    ...buildServerAttributionFields(command),
  });
  let se = shouldBackgroundForkedSkill(command, toolUseContext, y);
  let agentContext = se
    ? {
        agentId,
        parentAgentId: toolUseContext.agentId,
        depth: getAgentDepth(toolUseContext.agentContext) + 1,
        agentType: "subagent",
        isAsync: false,
        isBackgroundAgent:
          toolUseContext.agentContext && "isBackgroundAgent" in toolUseContext.agentContext
            ? toolUseContext.agentContext.isBackgroundAgent
            : undefined,
        ...getWorkflowRunFields(toolUseContext.agentContext),
      }
    : undefined;
  let {
    skillContent,
    modifiedGetAppState,
    contextLayers,
    recordInvocation,
    baseAgent,
    promptMessages,
    forkReadFileState,
    availableTools,
    webFetchReadmissionAllowed,
    frozenCommandDenies,
  } = await prepareForkedCommandContext(command, n, toolUseContext, agentContext, {
    forkAgentId: agentId,
    extractAttachments: y ? undefined : getAttachmentMessages,
    replaceCommandRules: true,
    replaceDenyRules: !y,
    deferInvocationRecording: se,
  });
  let permissionLayers =
    contextLayers.length > 0
      ? [...(toolUseContext.permissionLayers ?? []), ...contextLayers]
      : toolUseContext.permissionLayers;
  if (s.length > 0 || u.length > 0)
    promptMessages.push(
      withCommandTextBlocks(
        createUserMessage({
          content: [...s, ...u],
          isMeta: true,
        }),
        u,
        [],
      ),
    );
  if (H && H.length > 0)
    promptMessages.push(
      createAttachmentMessage({
        type: "inlined_image_paths",
        paths: H,
      }),
    );
  let P = await scopedSkillVariantNote(command, getProjectRoot(), {
    options: {
      tools: resolveAgentTools(
        baseAgent,
        webFetchReadmissionAllowed
          ? withWebFetchToolForAgent(baseAgent, availableTools, getToolPermissionContext(toolUseContext), {
              activeAgents: toolUseContext.options.agentDefinitions.activeAgents,
            })
          : availableTools,
        se,
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
  if (P) promptMessages.push(P);
  promptMessages.push(...h);
  let U =
    command.getEffort?.(n, toolUseContext) ??
    command.getDefaultEffort?.(n, toolUseContext)?.value ??
    command.effort;
  let I =
    U !== undefined
      ? {
          ...baseAgent,
          effort: U,
        }
      : baseAgent;
  let commandName = createUserMessage({
    content: prepareUserContent({
      inputString: `/${getCommandName(command)} ${n}`.trim(),
      precedingInputBlocks: s.length > 0 ? [...s, ...u] : u,
    }),
    uuid,
    origin,
  });
  await toolUseContext.makeFileHistorySnapshot?.(commandName.uuid);
  logForDebugging(`Executing forked slash command /${command.name} with agent ${I.agentType}`);
  if (se) {
    A?.markTurnActive(y ? undefined : `/${getCommandName(command)} ${n}`.trim());
    let re;
    try {
      re = await runForkedAgent({
        agentId,
        agentDefinition: I,
        command,
        description: `/${getCommandName(command)} ${n}`.trim(),
        prompt: skillContent,
        promptMessages,
        context: toolUseContext,
        canUseTool,
        getAppState: modifiedGetAppState,
        permissionLayers,
        readFileState: forkReadFileState,
        availableTools,
        webFetchReadmissionAllowed,
        spawnedBySkill: getBareCommandName(command),
        recordInvocationOnSuccess: recordInvocation,
        frozenCommandDenies,
      });
    } catch (error) {
      await A?.settleTurnEnd(null);
      if (isAbortError(error))
        return {
          messages: [
            commandName,
            createUserInterruptionMessage({
              toolUse: false,
            }),
          ],
          shouldQuery: false,
          command,
          aborted: true,
          forkDispatched: true,
        };
      return {
        messages: [
          commandName,
          createUserMessage({
            content: `<local-command-stderr>${escapeXml(commandThrowTextForTranscript(error, command.name, toolUseContext.session))}</local-command-stderr>`,
            localCommandOutput: "stderr",
          }),
        ],
        shouldQuery: false,
        command,
        threw: true,
        forkDispatched: true,
      };
    }
    if (re) {
      await A?.settleTurnEnd(null);
      return {
        messages: [
          commandName,
          createCommandInputMessage(
            `<local-command-stdout>Running in the background as @${escapeForkedSkillTag(sanitizeTelemetryString(re.name))}</local-command-stdout>
` +
              forkedSkillLaunchTag({
                agentId: re.agentId,
                skillName: command.name,
                description: `/${getCommandName(command)} ${n}`.trim(),
              }),
          ),
        ],
        shouldQuery: false,
        command,
        forkDispatched: true,
      };
    }
    recordInvocation();
  }
  let agentMessages = [];
  let ie = [];
  let parentToolUseID = `forked-command-${command.name}`;
  let toolUseCounter = 0;
  let createProgressMessage = (message) => {
    toolUseCounter++;
    return {
      type: "progress",
      data: {
        message,
        type: "agent_progress",
        prompt: skillContent,
        agentId,
        agentType: I.agentType,
        isBuiltIn: I.source === "built-in",
        description: command.description,
      },
      parentToolUseID,
      toolUseID: `${parentToolUseID}-${toolUseCounter}`,
      timestamp: new Date().toISOString(),
      uuid: randomUUID(),
    };
  };
  let updateProgress = () => {
    toolUseContext.emitToolProgress?.({
      kind: "agent_progress",
      toolUseId: parentToolUseID,
      progressMessages: [...ie],
    });
  };
  let x = transportStateByHost.of(toolUseContext.session).active !== undefined;
  let Me = false;
  A?.markTurnActive(y ? undefined : `/${getCommandName(command)} ${n}`.trim());
  let Te = registerForkedSkillTask({
    agentId,
    parentAgentId: toolUseContext.agentId,
    spawnDepth: getAgentDepth(toolUseContext.agentContext) + 1,
    skillName: getCommandName(command),
    prompt: skillContent,
    selectedAgent: I,
    taskRegistry: toolUseContext.taskRegistry,
    callerAbortController: toolUseContext.abortController,
  });
  let ke = "failed";
  try {
    updateProgress();
    if (x) {
      let found = normalizeMessages(promptMessages).find((ee) => ee.type === "user");
      if (found)
        writeSubagentProgressToOutputSink(
          toolUseContext,
          createProgressMessage({
            ...found,
            isMeta: undefined,
          }),
          false,
        );
    }
    for await (let message of runAgent({
      agentDefinition: I,
      promptMessages,
      turnPrompt: skillContent,
      onModelRestricted: agentModelRestrictedReporter(
        getBareCommandName(command),
        toolUseContext.onQueryEvent,
      ),
      toolUseContext: {
        ...toolUseContext,
        getAppState: modifiedGetAppState,
        permissionLayers,
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
        shareFileHistory: true,
        agentId,
        abortController: Te.abortController,
        readFileState: forkReadFileState,
      },
    })) {
      if (
        message.type === "api_metrics" ||
        message.type === "set_in_progress_tool_use_ids" ||
        message.type === "spinner_mode" ||
        message.type === "query_model_change"
      )
        continue;
      agentMessages.push(message);
      if (extractAgentIdsFromMessages_2(message)) {
        if (x && filterIncompleteToolCalls_2(toolUseContext, message))
          writeSubagentProgressToOutputSink(toolUseContext, message, false);
        continue;
      }
      let normalizedNew = normalizeMessages([message]);
      if (message.type === "assistant") {
        let contentLength = getAssistantMessageContentLength(message);
        if (contentLength > 0)
          toolUseContext.onQueryEvent?.({
            type: "response_length",
            op: "add",
            delta: contentLength,
          });
        let ve = normalizedNew[0];
        if (ve && ve.type === "assistant") {
          let progressMessage = createProgressMessage(message);
          ie.push(progressMessage);
          updateProgress();
          Me = true;
          if (x) writeSubagentProgressToOutputSink(toolUseContext, progressMessage, true);
        }
      }
      if (message.type === "user") {
        let message = normalizedNew[0];
        if (message && message.type === "user") {
          let progressMessage = createProgressMessage(message);
          ie.push(progressMessage);
          updateProgress();
          if (x && !(message.isMeta && !Me)) {
            writeSubagentProgressToOutputSink(toolUseContext, progressMessage, true);
            for (let Ae of normalizedNew.slice(1))
              if (Ae.type === "user")
                writeSubagentProgressToOutputSink(toolUseContext, createProgressMessage(Ae), true);
          }
        }
      }
    }
    let re = isApiErrorDisplayMessage(getLastAssistantMessage(agentMessages));
    if (!re) adoptSubagentPublishArmsAsync(agentId, toolUseContext);
    ke = re ? "failed" : "completed";
  } catch (error) {
    if (isAbortError(error)) {
      await A?.settleTurnEnd(null);
      return {
        messages: [
          commandName,
          createUserInterruptionMessage({
            toolUse: false,
          }),
        ],
        shouldQuery: false,
        command,
        aborted: true,
        forkDispatched: true,
      };
    }
    await A?.settleTurnEnd(null);
    let q = await runForkStopHooks(toolUseContext, agentMessages, p);
    return {
      messages: [
        commandName,
        createUserMessage({
          content: `<local-command-stderr>${escapeXml(commandThrowTextForTranscript(error, command.name, toolUseContext.session))}</local-command-stderr>`,
          localCommandOutput: "stderr",
        }),
        ...q.messages,
      ],
      shouldQuery: q.requestQuery,
      command,
      threw: true,
      forkDispatched: true,
    };
  } finally {
    Te.remove(ke);
    clearInvokedSkillsForAgent(agentId);
    toolUseContext.emitToolProgress?.({
      kind: "clear",
      toolUseId: parentToolUseID,
    });
  }
  let resultText = extractResultText(agentMessages, "Command completed");
  try {
    resultText = command.formatForegroundForkResult?.(resultText) ?? resultText;
  } catch (error) {
    logError(withTelemetryMessage(toError(error), "fork result formatter threw"));
  }
  let ye = withUntrustedPreamble(agentMessages) + resultText;
  logForDebugging(`Forked slash command /${command.name} completed with agent ${agentId}`);
  await A?.settleTurnEnd(agentMessages);
  let Ce = await runForkStopHooks(toolUseContext, agentMessages, p);
  return {
    messages: [
      commandName,
      createCommandInputMessage(`<local-command-stdout>${escapeForkedSkillTag(ye)}</local-command-stdout>`),
      ...Ce.messages,
    ],
    shouldQuery: Ce.requestQuery,
    command,
    resultText: ye,
    forkDispatched: true,
  };
}
//@ chunk-3g0djq3w.js:16950-17085 layout
var COMMAND_POLICY_GATES = {
  "remote-control": "allow_remote_control",
  ultraplan: "allow_remote_sessions",
  "claude-in-chrome": "allow_claude_browser_extension",
};
//@ chunk-3g0djq3w.js:17085-17842 layout
function resolveCommandPolicyGate(commandName, commands, { interactive }) {
  let builtinCommands = getBuiltinCommands();
  let s = isBundledSkillsPolicyDenied();
  let bundledSkills = getBundledSkills();
  let p = s ? getRegisteredBundledSkillsIgnoringKillSwitch() : bundledSkills;
  let h = s ? builtinPluginSkillCommands() : availableBuiltinSkillCommands();
  let y = [commands, builtinCommands, p, h];
  let R;
  let A;
  for (let Z of y) {
    let command = findCommand(commandName, Z);
    if (!command) continue;
    let pe = Z === builtinCommands || Z === p;
    let oe = command.policyGate?.policy ?? (pe ? COMMAND_POLICY_GATES[command.name] : undefined);
    if (
      s &&
      isSkillOutsideCorePolicy(command.name) &&
      (Z === p ? findCommand(commandName, bundledSkills) === undefined : Z === h) &&
      (oe === undefined || isPolicyAllowed(oe))
    )
      oe = ALLOW_BUNDLED_SKILLS;
    if (oe) {
      R = command;
      A = oe;
      break;
    }
  }
  if (!R || !A) return;
  if (!meetsAvailabilityRequirement(R)) return;
  if (isPolicyAllowed(A)) {
    if (
      interactive &&
      !getDisableSlashCommands() &&
      isCommandEnabled(R) &&
      findCommand(commandName, commands) === undefined
    )
      return {
        command: R,
        policy: A,
        reason: commandEnabledAfterStartMessage(R.name),
        kind: "stale_list",
      };
    return;
  }
  let B = policyDenyKind(A);
  if (!interactive) {
    if (commandSurfaceNotice(commandName, getBuiltinCommands()) !== undefined) return;
    if (
      B !== "org_denied" &&
      getNonInteractiveCommands(y.flatMap((Z) => Z.filter((se) => hasCommand(commandName, [se])))).length ===
        0
    )
      return;
  }
  let { featureLabel, verb } = policyKeyLabel(A);
  let j =
    B === "cache_miss" ? couldNotVerifyPolicyFor(featureLabel) : policyDeniedReason(A, featureLabel, verb);
  if (j === null || B === null) return;
  return {
    command: R,
    policy: A,
    reason: j,
    kind: B,
  };
}
//@ chunk-3g0djq3w.js:17842-17904 facade-exports
/**
 * 字符串是否像命令名（字母数字开头，可含 : _ -）。
 */
function looksLikeCommand(commandName) {
  return /^[a-zA-Z0-9_][a-zA-Z0-9:_-]*$/.test(commandName);
}
//@ chunk-3g0djq3w.js:17904-18263 facade-exports
/**
 * 命令执行抛错时写入会话记录的文本（中断/命令错误/其他）。
 */
function commandThrowTextForTranscript(error, name, session) {
  let u = normalizeServerNameShort(name, 200);
  let s = sanitizeTelemetryString(name);
  if (isAbortError(error)) {
    if (isBridgeOrTransport(session)) {
      logForDebugging(`${s} aborted: ${String(error)}`);
      return "Interrupted";
    }
    return escapeForkedSkillTag(error instanceof Error ? error.message || "Interrupted" : "Interrupted");
  }
  if (error instanceof MalformedCommandError) return escapeForkedSkillTag(error.message);
  if (isBridgeOrTransport(session)) {
    logForDebugging(`${s} threw: ${String(error)}`, {
      level: "error",
    });
    return `${u} failed (detail withheld on this connection)`;
  }
  return escapeForkedSkillTag(String(error));
}
//@ chunk-3g0djq3w.js:18263-28569 facade-exports = processSlashCommand (0.357)
/**
 * processSlashCommand：解析 /命令 参数、查找命令、策略检查，分派到本地命令、prompt 命令（技能）或 fork 子代理执行。
 */
async function processSlashCommand(
  e,
  n,
  o,
  u,
  s,
  T,
  p,
  h,
  y,
  R,
  A,
  B,
  H,
  D,
  j,
  Z,
  se,
  pe,
  permissionMode,
  wakeupSource,
  hostInitiator,
  ce,
  inboundOrigin,
  O,
) {
  using parsed = takeQueuedCommandWaiter(T ?? s.deferredSlashUuid);
  using ahead = joinCommandRunDispatch(T);
  function W(w = [], Y = e, he = false) {
    let Pe = randomUUID();
    let fe = hasToolResultBlock(n) ? undefined : Pe;
    if (fe !== undefined) setPromptId(fe);
    let effortLevelIfSupported = getEffortLevelIfSupported(
      s.options.mainLoopModel,
      getEffortValue(s),
      getEffortLayerOverride(s.permissionLayers),
    );
    logEvent("tengu_input_prompt", {
      ...(y && {
        prompt_source: fromEnum(y),
      }),
      ...(effortLevelIfSupported && {
        effort_level: fromEnum(effortLevelIfSupported),
      }),
      turn_origin: fromEnum(getOriginKindLabel(j)),
      ...promptTelemetryFields({
        wakeupSource,
        hostInitiator,
        inboundOrigin,
      }),
      ...emptyObjectFactory(),
    });
    let He = T || randomUUID();
    logSlashPromptEvent(
      {
        text: Y,
        attributes: {
          ...(fe && {
            "prompt.id": fe,
          }),
          "message.uuid": He,
        },
      },
      s.userPromptHold,
    );
    let userMessage = createUserMessage({
      content: prepareUserContent({
        inputString: Y,
        precedingInputBlocks: n,
      }),
      uuid: He,
      permissionMode,
      isMeta: pe || undefined,
      promptSource: y,
      promptId: fe,
      origin: j,
    });
    let unframed = cloneContent(userMessage.message.content);
    if (j) wrapNonUserMessage(userMessage, j);
    return {
      messages: [userMessage, ...u, ...w.map((Be) => createAttachmentMessage(Be))],
      shouldQuery: true,
      ...(Y === e && {
        promptRow: {
          message: userMessage,
          unframed,
        },
      }),
      ...(he && {
        extractPromptAttachments: true,
      }),
    };
  }
  let slashCommand = parseSlashCommand(e);
  if (!slashCommand) {
    logEvent("tengu_input_slash_missing", {});
    if (s.options.isNonInteractiveSession) return W();
    logFeatureBad("cmd_dispatch", "cmd_parse_failed");
    let errorMessage = "Commands are in the form `/command [args]`";
    return {
      messages: [
        createSyntheticUserCaveatMessage(),
        ...u,
        createUserMessage({
          content: prepareUserContent({
            inputString: errorMessage,
            precedingInputBlocks: n,
          }),
        }),
      ],
      shouldQuery: false,
      resultText: errorMessage,
    };
  }
  let { commandName, args: parsedArgs } = slashCommand;
  let { isMcp } = slashCommand;
  let I;
  if (B !== undefined) {
    let slashCommand_2 = parseSlashCommand(B);
    I =
      slashCommand_2 && slashCommand_2.commandName === slashCommand.commandName
        ? slashCommand_2.args
        : undefined;
  }
  let command = findCommand(commandName, s.options.commands);
  if (command && !isCommandEnabled(command)) command = undefined;
  if (!command && !isMcp && parsedArgs.trim()) {
    let w = parsedArgs.trimStart();
    let Y = w.search(/\s/);
    let he = Y === -1 ? w : w.slice(0, Y);
    let unknownMessage = `${commandName}:${he}`;
    let command_2 = findCommand(unknownMessage, s.options.commands);
    if (command_2) {
      command = command_2;
      commandName = unknownMessage;
      parsedArgs = Y === -1 ? "" : w.slice(Y + 1).trimStart();
    }
  }
  if (!command && !isMcp && !getDisableSlashCommands()) {
    let commandAfterHooks = await findCommandAfterHooks(
      commandName,
      parsed.origin === undefined,
      s.abortController.signal,
    );
    if (!commandAfterHooks && s.abortController.signal.aborted) {
      let Y = findCommand(commandName, s.options.commands) ?? findCommand(commandName, getBuiltinCommands());
      return interruptedCommandResult({
        signal: s.abortController.signal,
        typed: [
          ...u,
          createUserMessage({
            content: prepareUserContent({
              inputString: Y
                ? formatRedactedCommandInput(Y, parsedArgs)
                : formatCommandInputTags(sanitizeTelemetryString(commandName), redactSecrets(parsedArgs)),
              precedingInputBlocks: n,
            }),
            uuid: T,
            origin: j,
          }),
        ],
        marker: createUserInterruptionMessage({
          toolUse: false,
        }),
        isQueuedByPlugin: parsed.origin !== undefined,
      });
    }
    if (commandAfterHooks) {
      command = commandAfterHooks;
      s = {
        ...s,
        options: {
          ...s.options,
          commands: [...s.options.commands, commandAfterHooks],
        },
      };
    }
  }
  let J;
  let ie;
  if (command && !isSkillOff(command)) {
    let w = matchSubcommand(command, parsedArgs);
    if (w) {
      let command_2 = findCommand(w.targetName, s.options.commands);
      if (command_2 && isCommandEnabled(command_2)) {
        ie = `${commandName} ${w.consumedToken}`;
        command = command_2;
        commandName = w.targetName;
        parsedArgs = w.remainingArgs;
      } else if (command.name === CODE_REVIEW) {
        let promptId = ultrareviewAuthPrecondition();
        if (promptId) J = createSystemMessage(`${promptId} Running a local review instead.`, "warning");
      }
    }
  }
  if (command && O && !isSkillOff(command)) {
    let w = await O(command, commandName, parsedArgs);
    if (w) return emptyIfHandled(parsed.origin !== undefined, w);
  }
  let de = command ? await checkCommandSyncedAccess(command) : undefined;
  if (command && syncedSkillRefusalReason(command)) command = undefined;
  if (command && isShippedSkillExecutionBlocked(command)) command = undefined;
  if (command && isDefined(de)) {
    logSyncedCommandRefused(command, de);
    command = undefined;
  }
  let G = builtInCommandNames().has(commandName);
  if (isSlashCommandBlockedByEndedByModel(command, s.getAppState().endedByModel)) {
    let w = withTaskSuffix("Claude ended this conversation. Start a new session (or /clear) to continue.");
    return emptyIfHandled(parsed.origin !== undefined, {
      messages: [createSystemMessage(w, "warning")],
      shouldQuery: false,
      resultText: w,
    });
  }
  let isBundled = command?.type === "prompt" && command.source === "bundled";
  let isOfficial = command?.type === "prompt" && isOfficialMarketplaceSkill(command);
  let x = isMcp || (command?.type === "prompt" && command.source === "mcp");
  if (!command) {
    if (!looksLikeCommand(commandName)) return W();
    let w = `/${commandName}`;
    let Y = false;
    if (!isDiskless() && !isUntouchableSpelling(w))
      try {
        await getFsImplementation().stat(w);
        Y = true;
      } catch {}
    if (!Y) {
      let commandPolicyGate = resolveCommandPolicyGate(commandName, s.options.commands, {
        interactive: !s.options.isNonInteractiveSession,
      });
      if (commandPolicyGate) {
        let { command, policy, reason, kind } = commandPolicyGate;
        logEvent("tengu_input_slash_invalid", {
          input_length: commandName.length,
          had_suggestion: false,
          policy_denied: kind !== "stale_list",
        });
        logFeatureBad("cmd_dispatch", kind === "stale_list" ? "cmd_stale_list" : `cmd_policy_${kind}`);
        if (kind !== "stale_list") logOrgPolicyDenied(policy, "slash_command");
        let isOfficial = escapeForkedSkillTag(sanitizeTelemetryString(commandName));
        let Qe = !parsedArgs
          ? ""
          : hasSensitiveArgs(command, parsedArgs)
            ? "***"
            : escapeForkedSkillTag(redactSecrets(parsedArgs));
        if (s.options.isNonInteractiveSession)
          return emptyIfHandled(parsed.origin !== undefined, {
            messages: [
              ...u,
              createCommandInputMessage(`/${isOfficial}${Qe ? ` ${Qe}` : ""}`, {
                submitUuid: T,
              }),
              createCommandInputMessage(`<local-command-stdout>${reason}</local-command-stdout>`),
            ],
            shouldQuery: false,
            resultText: reason,
          });
        return emptyIfHandled(parsed.origin !== undefined, {
          messages: [
            ...u,
            createSystemMessage(reason, "warning"),
            ...(Qe && Qe !== "***"
              ? [createSystemMessage(`Args from /${isOfficial}: ${Qe}`, "warning")]
              : []),
          ],
          shouldQuery: false,
          resultText: reason,
        });
      }
      if (s.options.isNonInteractiveSession && builtInCommandNames().has(commandName)) {
        let builtinCommands = getBuiltinCommands();
        let Ve =
          commandSurfaceNotice(commandName, builtinCommands) ??
          `/${escapeForkedSkillTag(sanitizeTelemetryString(commandName))} isn't available in this environment.`;
        logEvent("tengu_input_slash_invalid", {
          input_length: commandName.length,
          had_suggestion: false,
        });
        logFeatureBad("cmd_dispatch", "cmd_unavailable_headless");
        let command = findCommand(commandName, builtinCommands);
        let $e = !parsedArgs
          ? ""
          : command !== undefined && hasSensitiveArgs(command, parsedArgs)
            ? "***"
            : escapeForkedSkillTag(redactSecrets(parsedArgs));
        return emptyIfHandled(parsed.origin !== undefined, {
          messages: [
            ...u,
            createCommandInputMessage(
              `/${escapeForkedSkillTag(sanitizeTelemetryString(commandName))}${$e ? ` ${$e}` : ""}`,
              {
                submitUuid: T,
              },
            ),
            createCommandInputMessage(`<local-command-stdout>${Ve}</local-command-stdout>`, {
              commandOutcome: {
                kind: "unavailable_headless",
              },
            }),
          ],
          shouldQuery: false,
          resultText: Ve,
        });
      }
      let refusedSyncedCommands = await findRefusedSyncedCommands(s.options.commands);
      let filtered = s.options.commands.filter(
        (command) =>
          !command.isHidden &&
          !isSkillOff(command) &&
          isCommandEnabled(command) &&
          !(isSyncedSkill(command) && getSkillsSyncVetoed()) &&
          !isKilledHostCatalogSkill(command) &&
          !refusedSyncedCommands.has(command),
      );
      let Fe = parsed.origin === undefined && isQuillKillswitchOff(s.options.isNonInteractiveSession);
      let He = Fe ? filtered.filter((ne) => ne.type === "prompt" && !ne.disableModelInvocation) : filtered;
      let we = suggestClosestName(
        commandName,
        He.map((ne) => ({
          name: getCommandName(ne),
          aliases: ne.aliases,
        })),
        {
          maxEditDistance: 2,
        },
      );
      logEvent("tengu_input_slash_invalid", {
        input_length: commandName.length,
        had_suggestion: Boolean(we),
        suggestion_distance: we ? boundedEditDistance(commandName, we, 2) : undefined,
        fallback_to_model: Fe,
      });
      if (Fe) {
        logFeatureSad("cmd_dispatch", "cmd_unknown_model_fallback");
        return W(
          [
            unknownCommandFallback({
              commandName,
              suggestion: we,
              availableCommandNames: He.map((ne) => getCommandName(ne)),
              availableCommandCount: filtered.length,
            }),
          ],
          containsSecret(e) ? redactSecrets(e) : e,
          true,
        );
      }
      logFeatureBad("cmd_dispatch", "cmd_unknown");
      let Le = normalizeServerNameShort(commandName, 200);
      let Be = we ? normalizeServerNameShort(we, 200) : undefined;
      let Ke = we ? `Unknown command: /${Le}. Did you mean /${Be}?` : `Unknown command: /${Le}`;
      if (s.options.isNonInteractiveSession)
        return emptyIfHandled(parsed.origin !== undefined, {
          messages: [
            ...u,
            createCommandInputMessage(
              `/${Le}${parsedArgs ? ` ${escapeForkedSkillTag(redactSecrets(parsedArgs))}` : ""}`,
              {
                submitUuid: T,
              },
            ),
            createCommandInputMessage(`<local-command-stdout>${Ke}</local-command-stdout>`, {
              commandOutcome: {
                kind: "unknown",
                ...(Be !== undefined && {
                  suggestion: Be,
                }),
              },
            }),
          ],
          shouldQuery: false,
          resultText: Ke,
        });
      return emptyIfHandled(parsed.origin !== undefined, {
        messages: [
          ...u,
          createSystemMessage(Ke, "warning"),
          ...(parsedArgs
            ? [createSystemMessage(`Args from unknown skill: ${redactSecrets(parsedArgs)}`, "warning")]
            : []),
        ],
        shouldQuery: false,
        resultText: Ke,
      });
    }
    return W();
  }
  let Me =
    x || command.loadedFrom === "mcp"
      ? "mcp"
      : G || (command.type === "prompt" && (command.source === "bundled" || command.source === "builtin"))
        ? "builtin"
        : "custom";
  let text = hasSensitiveArgs(command, parsedArgs) ? `/${commandName} ***` : e;
  let ke = s.deferSlashToEngine?.(command) ?? false;
  if (!ke) {
    let w = randomUUID();
    setPromptId(w);
    let Y = {
      text,
      attributes: {
        "prompt.id": w,
        command_name: Me === "builtin" || isToolDetailsLoggingEnabled() ? commandName : Me,
        command_source: Me,
      },
    };
    logSlashPromptEvent(Y, s.userPromptHold);
  }
  if (command.type !== "prompt" && s.userPromptHold !== undefined) s.userPromptLine?.withheld();
  let ue = command;
  let isOfficial_2 = getCommandName(ue);
  let argsRanWith = parsedArgs;
  let Se = new Map();
  let re = 0;
  let q = async (parsedArgs_2) => {
    re += 1;
    argsRanWith = parsedArgs_2;
    s.userPromptLine?.ranAs({
      name: isOfficial_2,
      args: parsedArgs,
      argsRanWith: parsedArgs_2,
    });
    let Y = ke && isPromptHookObserved();
    if (ue.type !== "prompt" && !Y) s.userPromptLine?.passed();
    let messagesForSlashCommand = await getMessagesForSlashCommand(
      commandName,
      parsedArgs_2,
      s,
      n,
      o,
      p,
      h,
      T,
      R,
      A,
      I,
      ie,
      H,
      y,
      D,
      j,
      Z,
      se,
      ce &&
        (async () => {
          let fe =
            Se.get(parsedArgs_2) ??
            ce({
              name: isOfficial_2,
              args: parsedArgs,
              argsRanWith: parsedArgs_2,
            });
          Se.set(parsedArgs_2, fe);
          return hasProceedsOutcome(await fe);
        }),
    );
    if (messagesForSlashCommand.ownPassCutShort) re -= 1;
    let Pe = await Se.get(parsedArgs_2);
    return Pe === undefined
      ? messagesForSlashCommand
      : {
          ...messagesForSlashCommand,
          lineCheck: Pe,
        };
  };
  if (ke) parsed.handOn(s.abortController.signal);
  let ee = ke
    ? {
        kind: "engine",
        ran: await q(parsedArgs),
      }
    : await swallowAbortError(
        dispatchCommandRunHooks({
          input: {
            command: isOfficial_2,
            args: parsedArgs,
            origin: resolvePromptOrigin({
              submissionOrigin: j,
              dispatchedOverBridge: s.dispatchedOverBridge,
              promptSource: y,
            }),
            presentation: viewportInfo(s.presentation),
          },
          engine: {
            run: q,
            textOf: (w) => w.resultText,
            contextOf: (w) => w.metaTexts,
            retell: attachCommandResultText,
          },
          queued: parsed,
          ahead,
          signal: s.abortController.signal,
        }),
        s.abortController.signal,
      );
  let be = ee === undefined ? await Promise.all(Se.values()) : [];
  let ve = be.some(hasProceedsOutcome) ? undefined : be.at(-1);
  let Ae = (w) =>
    createUserMessage({
      content: prepareUserContent({
        inputString: formatRedactedCommandInput(ue, w),
        precedingInputBlocks: n,
      }),
      uuid: T,
      origin: j,
    });
  if (ve !== undefined)
    return {
      messages: [Ae(ve.ran.argsRanWith)],
      shouldQuery: true,
      ranCommand: ve.ran,
      lineCheck: ve,
    };
  if (ee === undefined) {
    let w = s.userPromptLine?.isHeldForOrganization() ? undefined : be.findLast(hasProceedsOutcome);
    return {
      ...interruptedCommandResult({
        signal: s.abortController.signal,
        typed: [...u, Ae(parsedArgs)],
        marker: createUserInterruptionMessage({
          toolUse: false,
        }),
        isQueuedByPlugin: parsed.origin !== undefined,
      }),
      ...(re === 0 && {
        ownPassCutShort: true,
      }),
      ...(w !== undefined && {
        ranCommand: w.ran,
        lineCheck: w,
      }),
    };
  }
  let Xe =
    ee.kind !== "engine" &&
    (!hasSingleCommandRunHook(getCommandName(ue)) || (s.userPromptLine?.isUnknownSinceDispatch() ?? false));
  let args = Xe ? "" : parsedArgs;
  let offerTurn =
    ee.kind === "answered" &&
    ee.text !== undefined &&
    !Xe &&
    (ee.exitCode ?? 0) === 0 &&
    isHumanOrAutoContinuation(j)
      ? modCommandFollowUpNote(isOfficial_2, s.agentId)
      : undefined;
  if (Xe) s.userPromptLine?.withheld();
  else if (ee.kind !== "engine" && ue.type !== "prompt") s.userPromptLine?.passed();
  let {
    messages,
    shouldQuery,
    allowedTools,
    disallowedTools,
    model,
    effort,
    command: command_2,
    resultText,
    nextInput,
    submitNextInput,
    engineDeferredSlash,
    forkDispatched,
    settledInPlace,
    screened,
    ownPassCutShort,
    lineCheck,
    queriesAfterRun,
  } = ee.kind === "engine"
    ? ee.ran
    : runLocalCommand(ee.text, ee.context, {
        plugin: ee.plugin,
        command: ue,
        commandName,
        args,
        precedingInputBlocks: n,
        uuid: T,
        submissionOrigin: j,
        isNonInteractiveSession: s.options.isNonInteractiveSession === true,
        offerTurn,
      });
  if (command_2.type === "prompt" && command_2.pluginInfo)
    recordPluginActivity(
      command_2.pluginInfo.repository,
      "command",
      commandActivity(command_2, command_2.pluginInfo.pluginManifest.name),
    );
  let { sanitizedName, skillNameHash } = sanitizeSkillNameForTelemetry({
    rawName: commandName,
    canonicalName: command_2.name,
    isMcp: x || command_2.loadedFrom === "mcp",
    isBuiltIn: G,
    isBundled,
    isOfficial,
  });
  function gt() {
    let w = {
      input: sanitizedName,
      ...skillNameHash,
    };
    if (command_2.type === "prompt" && command_2.pluginInfo) {
      Object.assign(w, getSkillPluginTelemetryFields(command_2));
      let version = command_2.pluginInfo.pluginManifest.version;
      if (version && isOfficialMarketplaceSkill(command_2)) w.plugin_version = sanitizeVersion(version);
    }
    if (command_2.type === "prompt") Object.assign(w, buildServerAttributionFields(command_2));
    logEvent("tengu_input_command", {
      ...w,
      invocation_trigger: lit("user-slash"),
      ...promptTelemetryFields({
        wakeupSource,
        hostInitiator,
        inboundOrigin,
      }),
      ...logSkillsLoaded(
        command_2.type === "prompt" ? command_2.source : undefined,
        command_2.loadedFrom,
        command_2.kind,
        command_2.type === "prompt" ? command_2.createdBy : undefined,
      ),
      ...getTeamTipAttribution(command_2.type === "prompt" ? command_2.source : undefined, commandName),
      ...(command_2.type === "prompt" && {
        command_content_chars: command_2.contentLength,
      }),
      ...(command_2.type === "prompt" && {
        _PROTO_skill_name: command_2.name,
      }),
      ...false,
    });
  }
  if (messages.length === 0) {
    if (settledInPlace) logFeatureOk("cmd_dispatch");
    gt();
    return {
      messages: [],
      shouldQuery: false,
      model,
      resultText,
      nextInput,
      submitNextInput,
      localCommand: sanitizedName,
      ...(ee.exitCode !== undefined && {
        commandExitCode: ee.exitCode,
      }),
    };
  }
  if (
    messages.length === 2 &&
    messages[1].type === "user" &&
    typeof messages[1].message.content === "string" &&
    messages[1].message.content.startsWith("Unknown command:")
  ) {
    if (!(e.startsWith("/var") || e.startsWith("/tmp") || e.startsWith("/private"))) {
      logEvent("tengu_input_slash_invalid", {
        input_length: commandName.length,
        had_suggestion: false,
      });
      logFeatureBad("cmd_dispatch", "cmd_unknown");
    }
    return {
      messages: [createSyntheticUserCaveatMessage(), ...messages],
      shouldQuery,
      allowedTools,
      disallowedTools,
      model,
      ranCommand: {
        name: isOfficial_2,
        args: parsedArgs,
        argsRanWith,
      },
    };
  }
  if (!engineDeferredSlash) {
    logFeatureOk("cmd_dispatch");
    gt();
  }
  let Vt = messages.length > 0 && messages[0] && isCompactBoundaryMessage(messages[0]);
  let ht =
    shouldQuery ||
    messages.every(
      (message) =>
        isSystemLocalCommandMessage(message) ||
        (message.type === "system" && message.subtype === "informational") ||
        (message.type === "user" && message.isMeta),
    ) ||
    Vt ||
    engineDeferredSlash
      ? messages
      : [createSyntheticUserCaveatMessage(), ...messages];
  return {
    messages:
      J && shouldQuery && (lineCheck === undefined || hasProceedsOutcome(lineCheck)) ? [...ht, J] : ht,
    shouldQuery,
    allowedTools,
    disallowedTools,
    model,
    effort,
    resultText,
    nextInput,
    submitNextInput,
    engineDeferredSlash,
    forkDispatched,
    ...(screened !== undefined && {
      screened,
    }),
    ...(ownPassCutShort && {
      ownPassCutShort,
    }),
    ...(queriesAfterRun && {
      queriesAfterRun,
    }),
    ...(!engineDeferredSlash && {
      localCommand: sanitizedName,
    }),
    ...(ee.exitCode !== undefined && {
      commandExitCode: ee.exitCode,
    }),
    ranCommand: lineCheck?.ran ?? {
      name: isOfficial_2,
      args: parsedArgs,
      argsRanWith,
    },
    ...(lineCheck !== undefined && {
      lineCheck,
    }),
  };
}
//@ chunk-3g0djq3w.js:28569-28620 layout
function hasProceedsOutcome(e) {
  return e.outcome?.proceeds !== undefined;
}
//@ chunk-3g0djq3w.js:28620-29342 layout
function runLocalCommand(
  text,
  context,
  {
    plugin,
    command,
    commandName,
    args,
    precedingInputBlocks,
    uuid,
    submissionOrigin,
    isNonInteractiveSession,
    offerTurn,
  },
) {
  let B = cmdFeature(shippedCommandNames().has(commandName) ? commandName : "custom");
  logFeatureOk(B, getTipAttribution(command.name));
  let H =
    isNonInteractiveSession ||
    precedingInputBlocks.length > 0 ||
    !isHumanOrAutoContinuation(submissionOrigin);
  let D = context ?? [];
  if (text === undefined && D.length === 0 && !H)
    return {
      messages: [],
      shouldQuery: false,
      command,
    };
  return {
    messages: [
      H
        ? createUserMessage({
            content: prepareUserContent({
              inputString: formatCommandInput(command, args),
              precedingInputBlocks,
            }),
            uuid,
            origin: submissionOrigin,
          })
        : createCommandInputMessage(formatCommandInput(command, args)),
      ...(text === undefined
        ? []
        : [
            createCommandInputMessage(
              `<local-command-stdout>${escapeForkedSkillTag(text)}</local-command-stdout>`,
              {
                commandRun: buildCommandRunInfo(command, args, plugin),
              },
            ),
          ]),
      ...D.map((content) =>
        createUserMessage({
          content,
          isMeta: true,
        }),
      ),
      ...(offerTurn === undefined
        ? []
        : [
            createUserMessage({
              content: offerTurn,
              isMeta: true,
            }),
          ]),
    ],
    shouldQuery: offerTurn !== undefined,
    command,
    resultText: text,
    ...(D.length > 0 && {
      metaTexts: D,
    }),
    ...(offerTurn !== undefined && {
      queriesAfterRun: true,
    }),
  };
}
//@ chunk-3g0djq3w.js:29342-30427 layout
function attachCommandResultText(e, { text, plugin, context }) {
  if (e.shouldQuery || e.nextInput !== undefined || e.settledInPlace) return;
  let messages = e.messages;
  if (text !== undefined) {
    let T =
      e.resultText === undefined
        ? -1
        : messages.findIndex(
            (message) =>
              isSystemLocalCommandMessage(message) &&
              (message.content.startsWith(`<${LOCAL_COMMAND_STDOUT}>`) ||
                message.content.startsWith(`<${LOCAL_COMMAND_STDERR}>`)),
          );
    if (T === -1) return;
    let p = messages[T];
    let h =
      p !== undefined && isSystemLocalCommandMessage(p) && p.content.startsWith(`<${LOCAL_COMMAND_STDERR}>`)
        ? LOCAL_COMMAND_STDERR
        : LOCAL_COMMAND_STDOUT;
    messages = messages.with(
      T,
      createCommandInputMessage(
        `<${h}>${escapeForkedSkillTag(text)}</${h}>`,
        p !== undefined && isSystemLocalCommandMessage(p)
          ? {
              commandRun:
                p.commandRun !== undefined && plugin !== undefined
                  ? {
                      ...p.commandRun,
                      plugin,
                    }
                  : p.commandRun,
              commandOutcome: p.commandOutcome,
            }
          : undefined,
      ),
    );
  }
  if (context !== undefined) {
    if (!(
      e.metaTexts !== undefined ||
      messages.some(
        (message) =>
          isSystemLocalCommandMessage(message) &&
          (message.content.startsWith(`<${LOCAL_COMMAND_STDOUT}>`) ||
            message.content.startsWith(`<${LOCAL_COMMAND_STDERR}>`)),
      )
    ))
      return;
    let p = new Map();
    for (let h of e.metaTexts ?? []) p.set(h, (p.get(h) ?? 0) + 1);
    messages = [
      ...messages.filter((message) => {
        let content =
          message.type === "user" && message.isMeta && typeof message.message.content === "string"
            ? message.message.content
            : undefined;
        let R = content === undefined ? 0 : (p.get(content) ?? 0);
        if (content === undefined || R === 0) return true;
        p.set(content, R - 1);
        return false;
      }),
      ...context.map((content) =>
        createUserMessage({
          content,
          isMeta: true,
        }),
      ),
    ];
  }
  return {
    ...e,
    messages,
    resultText: text ?? e.resultText,
    ...((context ?? e.metaTexts) !== undefined && {
      metaTexts: context ?? e.metaTexts,
    }),
  };
}
//@ chunk-3g0djq3w.js:30427-30765 layout
function headlessUnavailableResult(command, n, submitUuid) {
  let u = `/${getCommandName(command)} opens an interactive panel and isn't available in this environment. Run it from the Claude Code terminal instead.`;
  return {
    messages: [
      createCommandInputMessage(formatRedactedCommandInput(command, n), {
        submitUuid,
      }),
      createCommandInputMessage(`<local-command-stdout>${u}</local-command-stdout>`, {
        commandOutcome: {
          kind: "unavailable_headless",
        },
      }),
    ],
    shouldQuery: false,
    command,
    resultText: u,
  };
}
//@ chunk-3g0djq3w.js:30765-42876 callgraph-witnessed = getMessagesForSlashCommand (0.288)
/**
 * getMessagesForSlashCommand：执行具体斜杠命令并生成消息（local-jsx、local、prompt 三类）。
 */
async function getMessagesForSlashCommand(
  commandName,
  content,
  context,
  u,
  s,
  T,
  p,
  h,
  y,
  R,
  A,
  B,
  H,
  promptSource,
  j,
  origin,
  se,
  pe,
  oe,
) {
  let command = getCommand(commandName, context.options.commands);
  content = unwrapPastedContentBlocks(content);
  let L = cmdFeature(shippedCommandNames().has(commandName) ? commandName : "custom");
  let tipAttribution = getTipAttribution(command.name);
  if (!isCommandEnabled(command)) {
    logFeatureBad(L, "cmd_policy_disabled");
    let E = `/${escapeForkedSkillTag(sanitizeTelemetryString(commandName))} isn't available in this session.`;
    if (context.options.isNonInteractiveSession)
      return {
        messages: [
          createCommandInputMessage(formatRedactedCommandInput(command, content), {
            submitUuid: h,
          }),
          createCommandInputMessage(`<local-command-stdout>${E}</local-command-stdout>`),
        ],
        shouldQuery: false,
        command,
        resultText: E,
      };
    return {
      messages: [createSystemMessage(E, "warning")],
      shouldQuery: false,
      command,
      resultText: E,
    };
  }
  if (isSkillOff(command)) {
    let E = describeSkillHiddenBehindPlugin(command);
    logFeatureBad(L, E === undefined ? "cmd_skill_override_off" : "cmd_skill_hidden_behind_plugin");
    if (context.options.isNonInteractiveSession) {
      let Q =
        E ??
        `Skill "${normalizeServerNameShort(command.name, 200)}" is disabled via skillOverrides. Remove the override from your settings to run it.`;
      return {
        messages: [
          createCommandInputMessage(formatRedactedCommandInput(command, content), {
            submitUuid: h,
          }),
          createCommandInputMessage(`<local-command-stdout>${Q}</local-command-stdout>`),
        ],
        shouldQuery: false,
        command,
        resultText: Q,
      };
    }
    let O =
      E ??
      `Skill "${normalizeServerNameShort(command.name, 200)}" is disabled via skillOverrides. Re-enable it in /skills or remove the override from your settings to run it.`;
    let F = !content
      ? ""
      : hasSensitiveArgs(command, content)
        ? "***"
        : escapeForkedSkillTag(redactSecrets(content));
    return {
      messages: [
        createSystemMessage(O, "warning"),
        ...(content ? [createSystemMessage(`Args from disabled skill: ${F}`, "warning")] : []),
      ],
      shouldQuery: false,
      command,
      resultText: O,
    };
  }
  if (command.type === "prompt" && command.userInvocable !== false)
    recordSkillInvoked(context.session, command.name, context.storageV5);
  if (command.type === "prompt" && command.pluginInfo) recordPluginUsage(command.pluginInfo.repository);
  if (!context.deferSlashToEngine?.(command))
    claimCommandOverageCredit({
      commandName: command.name,
      agentId: context.agentId,
      isNonInteractiveSession: Boolean(context.options.isNonInteractiveSession),
      setAppState: context.setAppState,
      credentials: context.credentials,
    });
  if (command.userInvocable === false) {
    logFeatureBad(L, "cmd_not_user_invocable");
    return {
      messages: [
        createUserMessage({
          content: prepareUserContent({
            inputString: `/${sanitizeTelemetryString(commandName)}`,
            precedingInputBlocks: u,
          }),
          uuid: h,
        }),
        createUserMessage({
          content: `This skill can only be invoked by Claude, not directly by users. Ask Claude to use the "${sanitizeTelemetryString(commandName)}" skill for you.`,
        }),
      ],
      shouldQuery: false,
      command,
    };
  }
  if (command.type === "local-jsx" && context.options.isNonInteractiveSession) {
    logFeatureBad(L, "cmd_local_jsx_headless");
    return headlessUnavailableResult(command, content, h);
  }
  try {
    switch (command.type) {
      case "local-jsx":
        return new Promise((resolve) => {
          let O = false;
          let onDone = (result, options) => {
            if (O) return;
            O = true;
            logFeatureOk(L, tipAttribution);
            if (options?.display === "skip") {
              resolve({
                messages: [],
                shouldQuery: false,
                command,
                nextInput: options?.nextInput,
                submitNextInput: options?.submitNextInput,
              });
              return;
            }
            let metaMessages = (options?.metaMessages ?? []).map((content) =>
              createUserMessage({
                content,
                isMeta: true,
                origin: options?.metaMessagesOrigin,
              }),
            );
            let skipTranscript =
              context.presentation === "fullscreen" &&
              typeof result === "string" &&
              result.endsWith(" dismissed");
            resolve({
              messages:
                options?.display === "system"
                  ? skipTranscript
                    ? metaMessages
                    : [
                        createCommandInputMessage(formatCommandInput(command, content)),
                        createCommandInputMessage(
                          `<local-command-stdout>${escapeForkedSkillTag(String(result))}</local-command-stdout>`,
                          {
                            commandRun: buildCommandRunInfo(command, content),
                          },
                        ),
                        ...metaMessages,
                      ]
                  : [
                      createUserMessage({
                        content: prepareUserContent({
                          inputString: formatCommandInput(command, content),
                          precedingInputBlocks: u,
                        }),
                        uuid: h,
                      }),
                      createUserMessage({
                        content: `<local-command-stdout>${result || NO_CONTENT_MESSAGE}</local-command-stdout>`,
                        localCommandOutput: "stdout",
                      }),
                      ...metaMessages,
                    ],
              shouldQuery: options?.shouldQuery ?? false,
              command,
              nextInput: options?.nextInput,
              submitNextInput: options?.submitNextInput,
              ...(metaMessages.length > 0 && {
                metaTexts: options?.metaMessages,
              }),
            });
          };
          let Q = command.load ?? context.options.resolveCommandDialog?.(command);
          if (!Q) {
            logFeatureBad(L, "cmd_local_jsx_no_dialog_resolution");
            resolve(headlessUnavailableResult(command, content));
            return;
          }
          let W = isImmediateCommand(command, content, context.presentation ?? "inline");
          Q()
            .then((mod) =>
              mod.call(
                onDone,
                {
                  ...context,
                  canUseTool: p,
                  dispatchedAsImmediate: W,
                  submissionOrigin: origin,
                  promptSource,
                },
                content,
                B ?? commandName,
              ),
            )
            .then((jsx) => {
              if (jsx == null) return;
              if (O) return;
              let localJsx = context.localJsx;
              if (!localJsx) {
                logFeatureBad(L, "cmd_local_jsx_no_panel_host");
                O = true;
                resolve(headlessUnavailableResult(command, content));
                return;
              }
              localJsx
                .show(jsx, {
                  commandName: getCommandName(command),
                  immediate: W,
                  hidesPrompt: true,
                  retireAtTurnBoundary: true,
                })
                .closed.then((U) => {
                  if (U === "dismissed" && !O) {
                    O = true;
                    logFeatureBad(L, "cmd_local_jsx_dismissed");
                    resolve({
                      messages: [],
                      shouldQuery: false,
                      command,
                    });
                  }
                });
            })
            .catch((error) => {
              let k = isAbortError(error);
              if (k)
                logForDebugging(
                  `local-jsx command aborted: ${error instanceof Error ? error.message : String(error)}`,
                );
              else logError(withTelemetryMessage(toError(error), "local-jsx slash command threw"));
              logFeatureBad(L, k ? "cmd_local_jsx_aborted" : "cmd_local_jsx_threw");
              if (O) return;
              O = true;
              if (k) {
                resolve({
                  messages: [],
                  shouldQuery: false,
                  command,
                });
                return;
              }
              resolve({
                messages: [
                  createUserMessage({
                    content: prepareUserContent({
                      inputString: formatCommandInput(command, content),
                      precedingInputBlocks: u,
                    }),
                    uuid: h,
                  }),
                  createCommandInputMessage(
                    `<local-command-stderr>${escapeXml(escapeForkedSkillTag(commandThrowTextForTranscript(error, command.name, context.session)))}</local-command-stderr>`,
                    {
                      commandRun: buildCommandRunInfo(command, content),
                      commandOutcome: {
                        kind: "failed",
                      },
                    },
                  ),
                ],
                shouldQuery: false,
                command,
              });
            });
        });
      case "local": {
        if (context.deferSlashToEngine?.(command)) {
          let trimmed = `/${getCommandName(command)} ${content}`.trim();
          let userMessage = createUserMessage({
            content: prepareUserContent({
              inputString: trimmed,
              precedingInputBlocks: u,
            }),
            uuid: h,
          });
          return {
            messages: [userMessage],
            shouldQuery: false,
            command,
            engineDeferredSlash: {
              text: trimmed,
              messageUuid: userMessage.uuid,
              origin,
            },
          };
        }
        let userMessage = createUserMessage({
          content: prepareUserContent({
            inputString: formatCommandInput(command, content),
            precedingInputBlocks: u,
          }),
          uuid: h,
        });
        let workspace = isRemoteSessionAvailable() && getCommandRequirements(command).workspace;
        if (workspace)
          context.applyMessageOp({
            type: "append",
            messages: [userMessage],
          });
        try {
          let syntheticCaveatMessage = createSyntheticUserCaveatMessage();
          let W = (await command.load()).call(
            content,
            {
              ...context,
              submissionOrigin: origin,
              promptSource,
              commandMessageUuid: userMessage.uuid,
            },
            B ?? commandName,
          );
          let M = workspace
            ? await raceWithAbortSignal(W, context.abortController.signal, () => new AbortError())
            : await W;
          if (M.type === "text" && M.level === "error") logFeatureBad(L, "cmd_returned_error");
          else logFeatureOk(L, tipAttribution);
          if (M.type === "skip")
            return {
              messages: [],
              shouldQuery: false,
              command,
            };
          if (M.type === "compact") {
            let slashCommandMessages = [
              syntheticCaveatMessage,
              userMessage,
              ...(M.displayText
                ? [
                    createUserMessage({
                      content: `<local-command-stdout>${escapeForkedSkillTag(M.displayText)}</local-command-stdout>`,
                      localCommandOutput: M.displayTextIsHintOnly ? "terminal-hint" : "stdout",
                      ...(M.displayRepeatsSummary === true && {
                        repeatsCompactSummary: true,
                      }),
                      timestamp: new Date(Date.now() + 100).toISOString(),
                    }),
                  ]
                : []),
            ];
            let compactionResultWithSlashMessages = {
              ...M.compactionResult,
              messagesToKeep: [...M.compactionResult.messagesToKeep, ...slashCommandMessages],
            };
            let postCompactMessages = buildPostCompactMessages(compactionResultWithSlashMessages);
            setLastCacheSafeForkMessages(postCompactMessages);
            return {
              messages: postCompactMessages,
              shouldQuery: false,
              command,
            };
          }
          if (M.type === "query")
            return {
              messages: [
                userMessage,
                createCommandInputMessage(
                  `<local-command-stdout>${escapeForkedSkillTag(M.value)}</local-command-stdout>`,
                  {
                    commandRun: buildCommandRunInfo(command, content),
                  },
                ),
                ...(M.metaMessages ?? []).map((content) =>
                  createUserMessage({
                    content,
                    isMeta: true,
                  }),
                ),
                createUserMessage({
                  content: M.prompt,
                  isMeta: true,
                }),
              ],
              shouldQuery: true,
              command,
              resultText: M.value,
              ...(M.metaMessages !== undefined && {
                metaTexts: M.metaMessages,
              }),
            };
          let k = M.level === "error" ? "local-command-stderr" : "local-command-stdout";
          let commandInputMessage = createCommandInputMessage(
            `<${k}>${escapeForkedSkillTag(M.value)}</${k}>`,
            {
              contextUsage: M.contextUsage,
              usageReport: M.usageReport,
              commandRun: buildCommandRunInfo(command, content),
              commandOutcome:
                M.outcome ??
                (M.level === "error"
                  ? {
                      kind: "failed",
                    }
                  : undefined),
            },
          );
          if (workspace)
            return insertMessagesInPlace(context, userMessage, {
              messages: [commandInputMessage],
              shouldQuery: false,
              command,
              resultText: M.value,
            });
          return {
            messages: [
              userMessage,
              commandInputMessage,
              ...(M.metaMessages ?? []).map((content) =>
                createUserMessage({
                  content,
                  isMeta: true,
                }),
              ),
            ],
            shouldQuery: false,
            command,
            resultText: M.value,
            ...(M.metaMessages !== undefined && {
              metaTexts: M.metaMessages,
            }),
          };
        } catch (error) {
          if (isAbortError(error))
            logForDebugging(
              `local command aborted: ${error instanceof Error ? error.message : String(error)}`,
            );
          else logError(withTelemetryMessage(toError(error), "local slash command threw"));
          let Q = isAbortError(error);
          if (Q && context.abortController.signal.aborted) logFeatureSad(L, "cmd_local_aborted");
          else logFeatureBad(L, Q ? "cmd_local_aborted" : "cmd_local_threw");
          let W = Q ? "local-command-stdout" : "local-command-stderr";
          let M = workspace ? REMOTE_STOPPED_WAITING_NOTICE : "Interrupted";
          let k = Q
            ? isBridgeOrTransport(context.session)
              ? M
              : error instanceof Error
                ? error.message || M
                : M
            : commandThrowTextForTranscript(error, command.name, context.session);
          let commandInputMessage = createCommandInputMessage(
            `<${W}>${escapeXml(escapeForkedSkillTag(k))}</${W}>`,
            Q
              ? undefined
              : {
                  commandRun: buildCommandRunInfo(command, content),
                  commandOutcome: {
                    kind: "failed",
                  },
                },
          );
          if (workspace)
            return insertMessagesInPlace(context, userMessage, {
              messages: [commandInputMessage],
              shouldQuery: false,
              command,
            });
          return {
            messages: [userMessage, commandInputMessage],
            shouldQuery: false,
            command,
          };
        }
      }
      case "prompt": {
        let { stacked, trailingArgs, capped } =
          command.context === "fork" ||
          command.getContext !== undefined ||
          command.argsMayContainSlashCommands
            ? {
                stacked: [],
                trailingArgs: content,
                capped: false,
              }
            : splitStackedCommands(content, A, context.options.commands, y ? (R ?? (() => true)) : undefined);
        let Q = trailingArgs;
        let W;
        if (stacked.length > 0)
          logEvent("tengu_stacked_slash_commands", {
            stacked_count: stacked.length,
          });
        let M = false;
        try {
          let k = getCommandContextMode(command, Q, context) === "fork" && !isCoordinatorMainThread(context);
          if (!k && (await oe?.()) === false) {
            logFeatureBad(
              L,
              context.abortController.signal.aborted
                ? "cmd_prompt_aborted"
                : "cmd_prompt_submit_hook_blocked",
            );
            return {
              messages: [
                createUserMessage({
                  content: prepareUserContent({
                    inputString: formatRedactedCommandInput(command, content),
                    precedingInputBlocks: u,
                  }),
                  uuid: h,
                  origin,
                }),
              ],
              shouldQuery: true,
              command,
            };
          }
          if (!(command.isMcp && command.loadedFrom !== "mcp"))
            skillLoadedSource(command.name, command, "user-slash");
          M = true;
          let P = await processUserInput_2(command, Q, context);
          M = context.abortController.signal.aborted;
          if ("blocked" in P) {
            logFeatureBad(L, "cmd_hook_blocked");
            return M && P.blocked.screened?.dropped !== true
              ? {
                  ...P.blocked,
                  ownPassCutShort: true,
                }
              : P.blocked;
          }
          if (!context.options.isNonInteractiveSession && !y) {
            command.onUserTypedArgs?.(Q, context);
            if (command.getEffort?.(Q, context) === undefined) {
              let notice = command.getDefaultEffort?.(Q, context)?.notice;
              if (notice) W = createSystemMessage(notice, "notice");
            }
          }
          if (k) {
            let I = snapshotHookRegistration();
            let trimmed = `/${commandName} ${content}`.trim();
            let J =
              getContentText([
                ...u,
                {
                  type: "text",
                  text: trimmed,
                },
              ]) ?? trimmed;
            if (!j) throw Error("Forked dispatch requires forkDispatchHookExecutors");
            let ie = [];
            let de = [];
            for await (let te of j.executeUserPromptSubmitHooks(
              J,
              getToolPermissionContext(context).mode,
              context,
              promptOriginForHooks({
                promptSource: promptSource ?? "typed",
              }),
            )) {
              if (te.message?.type === "progress") continue;
              if (te.message?.type === "attachment") {
                let attachment = te.message.attachment;
                if ("hookEvent" in attachment && attachment.hookEvent === "UserPromptSubmit") {
                  if (attachment.type === "hook_non_blocking_error")
                    de.push(attachment.stderr || `Exit code ${attachment.exitCode}`);
                  else if (attachment.type === "hook_error_during_execution") de.push(attachment.content);
                }
              }
              if (te.blockingError) {
                logFeatureBad(L, "cmd_prompt_submit_hook_blocked");
                let userPromptSubmitHookBlockingMessage = j.getUserPromptSubmitHookBlockingMessage(
                  te.blockingError,
                );
                let Te =
                  te.suppressOriginalPrompt === true ||
                  (context.userPromptLine?.isUnknownSinceDispatch() ?? hasHookRegistrationChanged(I)) ||
                  hasPromptSubmitHooks({
                    isRunReached: false,
                  })
                    ? userPromptSubmitHookBlockingMessage
                    : `${userPromptSubmitHookBlockingMessage}

Original prompt: ${J}`;
                return {
                  messages: [createSystemMessage(Te, "warning", undefined, true)],
                  shouldQuery: false,
                  resultText: Te,
                  command,
                  forkDispatched: true,
                  screened: {
                    dropped: true,
                  },
                };
              }
              if (te.preventContinuation) {
                let x = te.stopReason
                  ? `Operation stopped by hook: ${te.stopReason}`
                  : "Operation stopped by hook";
                logFeatureBad(L, "cmd_prompt_submit_hook_stopped");
                return {
                  messages: [
                    createUserMessage({
                      content: x,
                    }),
                    createSystemMessage(x, "warning", undefined, true),
                  ],
                  shouldQuery: false,
                  resultText: x,
                  command,
                  forkDispatched: true,
                  ...(context.abortController.signal.aborted && {
                    ownPassCutShort: true,
                  }),
                };
              }
              if (te.additionalContexts && te.additionalContexts.length > 0)
                ie.push(
                  createAttachmentMessage({
                    type: "hook_additional_context",
                    content: te.additionalContexts,
                    hookName: "UserPromptSubmit",
                    toolUseID: `hook-${randomUUID()}`,
                    hookEvent: "UserPromptSubmit",
                  }),
                );
            }
            let aborted = context.abortController.signal.aborted;
            if (aborted && context.userPromptLine?.isHeldForOrganization()) {
              logFeatureBad(L, "cmd_prompt_aborted");
              return {
                messages: [
                  createUserInterruptionMessage({
                    toolUse: false,
                  }),
                ],
                shouldQuery: false,
                command,
                forkDispatched: true,
                ownPassCutShort: true,
              };
            }
            if (!aborted) context.userPromptLine?.forked();
            let me = await executeForkedSlashCommand(
              command,
              Q,
              {
                ...context,
                userPromptHold: undefined,
                userPromptLine: undefined,
              },
              u,
              s,
              p ?? evaluateAskingNoHost,
              j,
              [...P.hookMessages, ...ie],
              y,
              h,
              H,
              origin,
              se,
            );
            if (de.length > 0)
              me.messages.push(
                createSystemMessage(`UserPromptSubmit hook error: ${de.join("; ")}`, "warning"),
              );
            if (me.aborted) logFeatureBad(L, "cmd_prompt_aborted");
            else if (me.threw) logFeatureBad(L, "cmd_prompt_threw");
            else {
              logFeatureOk(L, tipAttribution);
              if (W) me.messages.splice(1, 0, W);
            }
            return me;
          }
          let messagesForPromptSlashCommand = await getMessagesForPromptSlashCommand(
            command,
            Q,
            context,
            u,
            s,
            h,
            P.hookMessages,
            y,
            origin,
            pe,
            false,
            false,
            promptSource,
          );
          if (stacked.length > 0 && A !== undefined) {
            let I = messagesForPromptSlashCommand.messages[0];
            if (I?.type === "user" && !I.isMeta) I.stackedOriginalInput = `/${command.name} ${A}`;
          }
          for (let I of stacked)
            try {
              let S = await processUserInput_2(I, trailingArgs, context);
              if ("blocked" in S) {
                messagesForPromptSlashCommand.messages.push(
                  createSystemMessage(
                    `Stacked skill /${sanitizeTelemetryString(I.name)} blocked by UserPromptExpansion hook`,
                    "warning",
                  ),
                );
                if (S.blocked.screened?.dropped === true)
                  messagesForPromptSlashCommand.screened = {
                    dropped: true,
                  };
                continue;
              }
              if (!context.options.isNonInteractiveSession && !y) {
                I.onUserTypedArgs?.(trailingArgs, context);
                if (I.getEffort?.(trailingArgs, context) === undefined) {
                  let notice = I.getDefaultEffort?.(trailingArgs, context)?.notice;
                  if (notice)
                    messagesForPromptSlashCommand.messages.push(createSystemMessage(notice, "notice"));
                }
              }
              claimCommandOverageCredit({
                commandName: I.name,
                agentId: context.agentId,
                isNonInteractiveSession: Boolean(context.options.isNonInteractiveSession),
                setAppState: context.setAppState,
                credentials: context.credentials,
              });
              recordSkillInvoked(context.session, I.name, context.storageV5);
              if (I.pluginInfo) {
                recordPluginUsage(I.pluginInfo.repository);
                recordPluginActivity(
                  I.pluginInfo.repository,
                  "command",
                  commandActivity(I, I.pluginInfo.pluginManifest.name),
                );
              }
              if (!(I.isMcp && I.loadedFrom !== "mcp")) skillLoadedSource(I.name, I, "user-slash");
              let messagesForPromptSlashCommand_2 = await getMessagesForPromptSlashCommand(
                I,
                trailingArgs,
                {
                  ...context,
                  messages: [...context.messages, ...messagesForPromptSlashCommand.messages],
                },
                [],
                [],
                undefined,
                S.hookMessages,
                y,
                origin,
                undefined,
                false,
                false,
                promptSource,
              );
              let ie = messagesForPromptSlashCommand_2.messages[0];
              if (ie?.type === "user" && !ie.isMeta) ie.stackedExpansion = true;
              messagesForPromptSlashCommand.messages.push(...messagesForPromptSlashCommand_2.messages);
              messagesForPromptSlashCommand.allowedTools = [
                ...(messagesForPromptSlashCommand.allowedTools ?? []),
                ...(messagesForPromptSlashCommand_2.allowedTools ?? []),
              ];
              messagesForPromptSlashCommand.disallowedTools = [
                ...(messagesForPromptSlashCommand.disallowedTools ?? []),
                ...(messagesForPromptSlashCommand_2.disallowedTools ?? []),
              ];
              messagesForPromptSlashCommand.model =
                messagesForPromptSlashCommand_2.model ?? messagesForPromptSlashCommand.model;
              messagesForPromptSlashCommand.effort =
                messagesForPromptSlashCommand_2.effort ?? messagesForPromptSlashCommand.effort;
            } catch (error) {
              if (isAbortError(error)) throw error;
              logError(withTelemetryMessage(toError(error), "stacked slash command expansion threw"));
              messagesForPromptSlashCommand.messages.push(
                createSystemMessage(
                  `Stacked skill /${sanitizeTelemetryString(I.name)} failed to load: ${commandThrowTextForTranscript(error, I.name, context.session)}`,
                  "warning",
                ),
              );
            }
          if (capped)
            messagesForPromptSlashCommand.messages.push(
              createSystemMessage(
                `Stacked command limit (${MAX_STACKED_COMMANDS}) reached \u2014 remaining input passed as arguments`,
                "warning",
              ),
            );
          if (W) messagesForPromptSlashCommand.messages.push(W);
          logFeatureOk(L, tipAttribution);
          return messagesForPromptSlashCommand;
        } catch (error) {
          if (isAbortError(error)) {
            logFeatureBad(L, "cmd_prompt_aborted");
            let P = [
              createUserMessage({
                content: prepareUserContent({
                  inputString: formatCommandInput(command, content),
                  precedingInputBlocks: u,
                }),
                uuid: h,
              }),
            ];
            if (!isSilentAbortReason(context.abortController.signal.reason))
              P.push(
                createUserInterruptionMessage({
                  toolUse: false,
                  interruptedByShutdown: shutdownInterruptStamp(context.abortController.signal),
                }),
              );
            return {
              messages: P,
              shouldQuery: false,
              command,
              ...(M && {
                ownPassCutShort: true,
              }),
            };
          }
          logFeatureBad(L, "cmd_prompt_threw");
          return {
            messages: [
              createUserMessage({
                content: prepareUserContent({
                  inputString: formatCommandInput(command, content),
                  precedingInputBlocks: u,
                }),
                uuid: h,
              }),
              createUserMessage({
                content: `<local-command-stderr>${escapeXml(commandThrowTextForTranscript(error, command.name, context.session))}</local-command-stderr>`,
                localCommandOutput: "stderr",
              }),
            ],
            shouldQuery: false,
            command,
          };
        }
      }
    }
  } catch (error) {
    if (error instanceof MalformedCommandError) {
      logFeatureBad(L, "cmd_malformed");
      return {
        messages: [
          createUserMessage({
            content: prepareUserContent({
              inputString: error.message,
              precedingInputBlocks: u,
            }),
          }),
        ],
        shouldQuery: false,
        command,
      };
    }
    throw error;
  }
}
//@ chunk-3g0djq3w.js:42876-42937 layout
function formatCommandInput(command, n) {
  let commandRunInfo = buildCommandRunInfo(command, n);
  return formatCommandInputTags(commandRunInfo.command, commandRunInfo.args);
}
//@ chunk-3g0djq3w.js:42937-42998 layout
function formatRedactedCommandInput(command, args) {
  return formatCommandInputTags(
    sanitizeTelemetryString(getCommandName(command)),
    hasSensitiveArgs(command, args) ? "***" : redactSecrets(args),
  );
}
//@ chunk-3g0djq3w.js:42998-43055 layout
function emptyIfHandled(e, n) {
  return e
    ? {
        messages: [],
        shouldQuery: false,
      }
    : n;
}
//@ chunk-3g0djq3w.js:43055-43064 layout
var MAX_STACKED_COMMANDS = 5;
//@ chunk-3g0djq3w.js:43064-43668 layout
function splitStackedCommands(e, n, commands, u) {
  if (n === undefined && u === undefined)
    return {
      stacked: [],
      trailingArgs: e,
      capped: false,
    };
  let s = [];
  let T = e;
  let p = n;
  let capped = false;
  for (let k = 0; ; k++) {
    let R = T.trimStart();
    if (!R.startsWith("/")) break;
    if (k >= MAX_STACKED_COMMANDS) {
      capped = true;
      break;
    }
    let slashCommand = parseSlashCommand(R);
    if (!slashCommand) break;
    let B = p;
    if (p !== undefined) {
      let D = p.trimStart();
      let j = D.startsWith("/") ? parseSlashCommand(D) : undefined;
      if (!j || j.commandName !== slashCommand.commandName) break;
      B = j.args;
    }
    let command = findCommand(slashCommand.commandName, commands);
    if (
      !command ||
      command.type !== "prompt" ||
      command.context === "fork" ||
      command.getContext !== undefined ||
      command.argsMayContainSlashCommands ||
      command.userInvocable === false ||
      !isCommandEnabled(command) ||
      isSkillOff(command)
    )
      break;
    T = slashCommand.args;
    p = B;
    if (u?.(command)) continue;
    s.push(command);
  }
  return {
    stacked: s,
    trailingArgs: T,
    capped,
  };
}
//@ chunk-3g0djq3w.js:43668-43782 facade-exports
/**
 * 技能加载中的元数据标签文本（command-name/message 标签）。
 */
function formatSkillLoadingMetadata(skillName, _progressMessage = "loading") {
  return [
    `<${COMMAND_MESSAGE}>${skillName}</${COMMAND_MESSAGE}>`,
    `<${COMMAND_NAME}>${skillName}</${COMMAND_NAME}>`,
    `<${SKILL_FORMAT}>true</${SKILL_FORMAT}>`,
  ].join(`
`);
}
//@ chunk-3g0djq3w.js:43782-43818 facade-exports
/**
 * 消息是否是技能加载中的元数据。
 */
function isSkillLoadingMetadata(e, skillName) {
  return e === formatSkillLoadingMetadata(skillName);
}
//@ chunk-3g0djq3w.js:43818-43957 fingerprint = formatSlashCommandLoadingMetadata (1)
function formatSlashCommandLoadingMetadata(commandName, args) {
  return [
    `<${COMMAND_MESSAGE}>${commandName}</${COMMAND_MESSAGE}>`,
    `<${COMMAND_NAME}>/${commandName}</${COMMAND_NAME}>`,
    args ? `<command-args>${args}</command-args>` : null,
  ].filter(Boolean).join(`
`);
}
//@ chunk-3g0djq3w.js:43957-44243 fingerprint = formatCommandLoadingMetadata (0.703)
function formatCommandLoadingMetadata(command, args) {
  if (command.userInvocable !== false) return formatSlashCommandLoadingMetadata(command.name, args);
  if (
    command.loadedFrom === "skills" ||
    command.loadedFrom === "syncedSkills" ||
    command.loadedFrom === "plugin" ||
    command.loadedFrom === "mcp" ||
    command.loadedFrom === "memoryStore" ||
    command.loadedFrom === "attachedFolder"
  )
    return formatSkillLoadingMetadata(command.name, command.progressMessage);
  return formatSlashCommandLoadingMetadata(command.name, args);
}
//@ chunk-3g0djq3w.js:45446-45742 facade-exports = processPromptSlashCommand (1)
/**
 * processPromptSlashCommand：只处理 prompt 型命令，展开为消息。
 */
async function processPromptSlashCommand(commandName, args, commands, context, s = false, T = false) {
  let command = findCommand(commandName, commands);
  if (!command) throw new MalformedCommandError(`Unknown command: ${sanitizeTelemetryString(commandName)}`);
  if (command.type !== "prompt")
    throw Error(
      `Unexpected ${command.type} command. Expected 'prompt' command. Use /${commandName} directly in the main conversation.`,
    );
  return getMessagesForPromptSlashCommand(
    command,
    args,
    context,
    [],
    [],
    undefined,
    [],
    undefined,
    undefined,
    undefined,
    s,
    T,
  );
}
//@ chunk-3g0djq3w.js:45742-50793 fingerprint = getMessagesForPromptSlashCommand (0.431)
/**
 * getMessagesForPromptSlashCommand：prompt 型命令/技能展开为消息（含 MCP prompt、禁止模型调用检查）。
 */
async function getMessagesForPromptSlashCommand(
  command,
  n,
  o,
  u = [],
  s = [],
  uuid,
  hookMessages = [],
  h,
  y,
  R,
  A = false,
  B = false,
  promptSource,
) {
  let D = await checkCommandSyncedAccess(command);
  if (syncedSkillRefusalReason(command) || isShippedSkillExecutionBlocked(command))
    throw new MalformedCommandError(`Unknown command: ${sanitizeTelemetryString(command.name)}`);
  if (isDefined(D)) {
    logSyncedCommandRefused(command, D);
    throw new MalformedCommandError(`Unknown command: ${sanitizeTelemetryString(command.name)}`);
  }
  if (isCoordinatorMainThread(o) && !A) {
    let metadata = formatCommandLoadingMetadata(command, n);
    let me = command.isMcp && command.loadedFrom !== "mcp";
    let te = isHiddenFromModel(command);
    if (command.disableModelInvocation || me || te) {
      let parts = [
        me
          ? `"/${sanitizeTelemetryString(command.name)}" is an MCP prompt and cannot run in coordinator mode: the coordinator does not load prompt content, and workers cannot invoke MCP prompts via the ${SKILL} tool.`
          : `Skill "/${sanitizeTelemetryString(command.name)}" is user-invocable only (${command.disableModelInvocation ? "disable-model-invocation" : "disabled for model invocation in settings"}) and cannot run in coordinator mode: the coordinator does not load skill content, and workers cannot invoke it via the ${SKILL} tool.`,
      ];
      if (command.description) parts.push(`Description: ${command.description}`);
      let mapped = Object.entries(command.subcommands ?? {})
        .filter(([, value]) => {
          let command = findCommand(value, o.options.commands);
          return (
            command !== undefined &&
            isCommandEnabled(command) &&
            !command.disableModelInvocation &&
            !isHiddenFromModel(command) &&
            !(command.isMcp && command.loadedFrom !== "mcp")
          );
        })
        .map(([key]) => key);
      if (mapped.length > 0)
        parts.push(
          `Note: the subcommands ${mapped.map((Ce) => `"/${sanitizeTelemetryString(command.name)} ${sanitizeTelemetryString(Ce)}"`).join(", ")} route to their own dedicated commands and DO still work when the user types them directly in the terminal (remote-control clients gate some commands separately).`,
        );
      parts.push(`
Do not instruct workers to invoke this via the ${SKILL} tool \u2014 it will be refused. Tell the user that ${mapped.length > 0 ? `/${sanitizeTelemetryString(command.name)} itself (beyond the subcommands above) is` : `the /${sanitizeTelemetryString(command.name)} command is`} unavailable in coordinator mode. If \u2014 and only if \u2014 the underlying task is achievable with the tools workers actually hold, you may brief a worker to do that work directly; do not promise this otherwise.`);
      let ye = [
        {
          type: "text",
          text: parts.join(`
`),
        },
      ];
      return {
        messages: [
          createUserMessage({
            content: metadata,
            uuid,
            origin: y,
          }),
          ...markTurnCompanions([
            withCommandTextBlocks(
              createUserMessage({
                content: concatIfAny(s, u, ye),
                isMeta: true,
              }),
              u,
              ye,
            ),
            ...hookMessages,
          ]),
        ],
        shouldQuery: true,
        disallowedTools: splitRuleList(command.disallowedTools ?? []),
        command,
      };
    }
    let parts = [`Skill "/${sanitizeTelemetryString(command.name)}" is available for workers.`];
    if (command.description) parts.push(`Description: ${command.description}`);
    if (command.whenToUse) parts.push(`When to use: ${command.whenToUse}`);
    let skillAllowedTools = await armedAllowedToolsOf(command);
    if (skillAllowedTools.length > 0)
      parts.push(
        `This skill grants workers additional tool permissions: ${skillAllowedTools.map(sanitizeTelemetryString).join(", ")}`,
      );
    parts.push(`
Instruct a worker to use this skill by including "Use the /${sanitizeTelemetryString(command.name)} skill" in your Agent prompt. The worker has access to the Skill tool and will receive the skill's content and permissions when it invokes it.`);
    let Te = [
      {
        type: "text",
        text: parts.join(`
`),
      },
    ];
    return {
      messages: [
        createUserMessage({
          content: metadata,
          uuid,
          origin: y,
        }),
        ...markTurnCompanions([
          withCommandTextBlocks(
            createUserMessage({
              content: concatIfAny(s, u, Te),
              isMeta: true,
            }),
            u,
            Te,
          ),
          ...hookMessages,
        ]),
      ],
      shouldQuery: true,
      disallowedTools: splitRuleList(command.disallowedTools ?? []),
      command,
    };
  }
  let j = [];
  let Z = [];
  let se = {
    ...o,
    submissionOrigin: y,
    promptSource,
    promptShellHandOff: j,
    mcpSkillLoaded: Z,
    ...((h || A) && {
      options: {
        ...o.options,
        ...(h && {
          modelScheduledOrigin: true,
        }),
        ...(A && {
          isSkillPreload: true,
          readOnlySkillLoad: true,
        }),
      },
    }),
  };
  let pe = await applySkillPromptHooks(command.name, await command.getPromptForCommand(n, se), command);
  let last = Z.at(-1);
  if (command.loadedFrom === "mcp" && last === undefined)
    throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
      `The skill "${sanitizeTelemetryString(command.name)}" was not loaded because of a fault in Claude Code: it has no record of the files that the skill was verified against. Do not try again.`,
      "MCP skill body has no verified entry",
    );
  let r = A ? [] : await armedAllowedToolsOf(command);
  let L =
    !A && (command.hooks !== undefined || r.length > 0) ? await checkCommandSyncedAccess(command) : undefined;
  let ce = (!isRestrictedToPluginOnly("hooks") || isSourceAdminTrusted(command.source)) && !A;
  let E = command.hooks !== undefined && !ce;
  let O;
  if (L !== undefined) {
    let G = {
      hooks: command.hooks !== undefined && ce,
      grant: r.length > 0,
    };
    if (G.hooks || G.grant) logSyncedSkillRestricted(sanitizeTelemetryString(command.name), L, G);
  } else if (command.hooks && ce) {
    let sessionId = getSessionId();
    O = checkSkillHooksFit(
      o.sessionHooksRegistry,
      sessionId,
      command.source,
      getCommandRepository(command),
      command.name,
      command.hooks,
    );
    if (O === undefined)
      registerSkillHooks(
        o.sessionHooksRegistry,
        sessionId,
        command.hooks,
        command.name,
        command.type === "prompt" ? command.skillRoot : undefined,
        areCommandHooksHeld(command),
        isRepoFrontmatterHookRestricted(command.source),
        getCommandRepository(command),
      );
  }
  let F = command.source ? `${command.source}:${command.name}` : command.name;
  let joined = pe.filter((G) => G.type === "text").map((G) => G.text).join(`

`);
  notifySetupGuideLoaded(joined, "skill", o.credentials, o.storageV5, o.appendSystemMessage);
  let W = slashTestPattern(getBareCommandNameUnlessSynced(command));
  let M = A && W !== null;
  if (!M) addInvokedSkill(command.name, F, joined, o.agentId ?? null, last !== undefined);
  if (W && !A)
    o.applyAttributionOp({
      kind: "recordVerification",
      method: W,
      checkout: await resolveSkillGitRoot(command, getCwdOrNull()),
    });
  o.options.activeSkill = getBareCommandName(command);
  let metadata = formatCommandLoadingMetadata(command, n);
  let allowedTools = L !== undefined || O !== undefined || E ? [] : splitRuleList(r);
  let additionalAllowedTools = splitRuleList(command.disallowedTools ?? []);
  if (additionalAllowedTools.length > 0)
    setCommandDenyRules(o.setToolPermissionContext, additionalAllowedTools, "union");
  let I = concatIfAny(s, u, pe);
  let J =
    isSkillShownToModel(command) || A || h || B
      ? []
      : await toArray_2(
          getAttachmentMessages(
            pe
              .filter((block) => block.type === "text")
              .map((block) => block.text)
              .join(" "),
            o,
            R ?? null,
            [],
            {
              now: () => new Date().toISOString(),
              uuid: () => randomUUID(),
            },
            o.messages,
            "repl_main_thread",
            {
              planSlugSeed: n,
            },
          ),
        );
  let ie = await scopedSkillVariantNote(command, getProjectRootOrNull(), o);
  return {
    messages: [
      createUserMessage({
        content: metadata,
        uuid,
        origin: y,
      }),
      ...markTurnCompanions([
        withCommandTextBlocks(
          createUserMessage({
            content: I,
            isMeta: true,
            ...(j.length > 0 && {
              promptShellHandOff: {
                agentId: o.agentId ?? null,
                commands: j,
              },
            }),
            ...(last !== undefined && {
              mcpSkill: {
                ...last,
                name: command.name,
              },
            }),
            ...(isSoftSparkEnabled() &&
              !M &&
              o.agentId === undefined &&
              I === pe && {
                invokedSkill: {
                  name: command.name,
                  path: F,
                },
              }),
          }),
          u,
          pe,
        ),
        ...(ie ? [ie] : []),
        ...(O !== undefined || (E && !A)
          ? [
              createUserMessage({
                content: wrapInSystemReminder(SKILL_HOOKS_NOT_REGISTERED_TEXT),
                isMeta: true,
              }),
            ]
          : []),
        ...J,
        ...hookMessages,
      ]),
      createAttachmentMessage({
        type: "command_permissions",
        allowedTools,
        model: inlineSkillModelOverride(command.model),
      }),
    ],
    shouldQuery: true,
    allowedTools,
    disallowedTools: additionalAllowedTools,
    model: inlineSkillModelOverride(command.model),
    effort: command.getEffort?.(n, o) ?? command.getDefaultEffort?.(n, o)?.value ?? command.effort,
    command,
  };
}
//@ chunk-3g0djq3w.js:50793-50861 affinity
function concatIfAny(e, n, o) {
  return e.length > 0 || n.length > 0 ? [...e, ...n, ...o] : o;
}
//@ chunk-3g0djq3w.js:50861-51001 affinity
function insertMessagesInPlace(e, userMessage, o) {
  e.applyMessageOp({
    type: "insert-after-uuid",
    uuid: userMessage.uuid,
    messages: o.messages,
  });
  return {
    ...o,
    messages: [],
    settledInPlace: true,
  };
}
//@ chunk-3g0djq3w.js:51001-51077 affinity
function markTurnCompanions(e) {
  return e.map((n) =>
    n.type === "user"
      ? {
          ...n,
          turnCompanion: true,
        }
      : n,
  );
}
//@ chunk-e6aww6q8.js:5048489-5048750 placement
/**
 * 为代理创建状态发射器：设置模式、重试状态与回合 effort。
 */
function createAgentStatusEmitter(agentId) {
  return {
    setMode(mode) {
      lazyCommandRunSignal.emit({
        kind: "agent-mode",
        agentId,
        mode,
      });
    },
    setRetryStatus(retryStatus) {
      lazyCommandRunSignal.emit({
        kind: "agent-retry-status",
        agentId,
        retryStatus,
      });
    },
    setTurnEffort(turnEffort, turnModel = null) {
      lazyCommandRunSignal.emit({
        kind: "agent-turn-effort",
        agentId,
        turnEffort,
        turnModel,
      });
    },
  };
}
//@ chunk-e6aww6q8.js:5048750-5049005 placement
/**
 * "Running SessionStart hooks…" 提示与主线程 spinner 状态发射器。
 */
var SESSION_START_HOOKS_MESSAGE = "Running SessionStart hooks\u2026";
var sessionStartHooksUi = {
  setSpinnerMessage(message) {
    lazyCommandRunSignal.emit({
      kind: "main-message",
      message,
    });
  },
  setSpinnerColors(color, shimmerColor) {
    lazyCommandRunSignal.emit({
      kind: "main-colors",
      color,
      shimmerColor,
    });
  },
  setResponseHeld(held) {
    lazyCommandRunSignal.emit({
      kind: "main-response-held",
      held,
    });
  },
};
//@ chunk-e6aww6q8.js:5049005-5049623 placement
/**
 * 找不到命令时等待 SessionStart 钩子与插件命令注册完成后再找一次（期间显示 spinner）。
 */
async function findCommandAfterHooks(commandName, n, signal) {
  let command = findCommand(commandName, await hookedCommands_2([]));
  let h = n ? commandSetSignalA.get() : undefined;
  if (command || !h || signal.aborted) return command;
  let deferred = Promise.withResolvers();
  signal.addEventListener("abort", deferred.resolve, {
    once: true,
  });
  sessionStartHooksUi.setSpinnerColors(
    "claudeBlue_FOR_SYSTEM_SPINNER",
    "claudeBlueShimmer_FOR_SYSTEM_SPINNER",
  );
  sessionStartHooksUi.setSpinnerMessage(SESSION_START_HOOKS_MESSAGE);
  return (await Promise.race([
    (commandSetSignalB.get() ?? Promise.resolve())
      .then(() => hostOpsRoot.get()?.read())
      .then(() => (hostOpsRoot.get()?.mayRegisterCommands() ?? true) && h.then(() => true)),
    deferred.promise.then(() => false),
  ]).finally(() => {
    signal.removeEventListener("abort", deferred.resolve);
    sessionStartHooksUi.setSpinnerMessage(null);
    sessionStartHooksUi.setSpinnerColors(null, null);
  }))
    ? findCommand(commandName, await hookedCommands_2([]))
    : undefined;
}
//@ chunk-bc20zedk.js:33028-33069 fingerprint = formatSkillLoadingMetadata (0.84)
var formatSkillLoadingMetadata_2 = Object.freeze({
  status: "loading",
});
export {
  createAgentStatusEmitter,
  commandThrowTextForTranscript,
  looksLikeCommand,
  isSlashCommandBlockedByEndedByModel,
  formatSkillLoadingMetadata_2,
  SESSION_START_HOOKS_MESSAGE,
};
