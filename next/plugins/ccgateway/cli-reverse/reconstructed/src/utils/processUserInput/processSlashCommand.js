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
  lazyCommandRunSignal,
  commandSetSignalA,
  commandSetSignalB,
  takeQueuedCommandWaiter,
  joinCommandRunDispatch,
  interruptedCommandResult,
  dispatchCommandRunHooks,
} from "../../plugins/functionHooks/commandRunDispatch.js";
import {
  findCommand,
  builtInCommandNames,
  getBareCommandName,
  getCommandName,
  getBuiltinCommands,
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
import { hookedCommands_2 } from "../../plugins/functionHooks/commandHooks.js";
import { hostOpsRoot } from "../../plugins/functionHooks/hooksWorkerHost.js";
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
import { deferInit } from "../../../runtime/deferred-init.js";

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
async function findCommandAfterHooks(commandName, waitForHooks, signal) {
  let command = findCommand(commandName, await hookedCommands_2([]));
  let commandSetPromise = waitForHooks ? commandSetSignalA.get() : undefined;
  if (command || !commandSetPromise || signal.aborted) return command;
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
      .then(() => (hostOpsRoot.get()?.mayRegisterCommands() ?? true) && commandSetPromise.then(() => true)),
    deferred.promise.then(() => false),
  ]).finally(() => {
    signal.removeEventListener("abort", deferred.resolve);
    sessionStartHooksUi.setSpinnerMessage(null);
    sessionStartHooksUi.setSpinnerColors(null, null);
  }))
    ? findCommand(commandName, await hookedCommands_2([]))
    : undefined;
}
//@ chunk-bc20zedk.js:33028-33069 fingerprint (2.1.88 match: formatSkillLoadingMetadata, 0.84)
var formatSkillLoadingMetadata_2; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-bc20zedk.js:33028", () => {
  formatSkillLoadingMetadata_2 = Object.freeze({
    status: "loading",
  });
});
//@ chunk-3g0djq3w.js:9865-9925 affinity
var NON_HISTORY_COMMANDS; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-3g0djq3w.js:9865", () => {
  NON_HISTORY_COMMANDS = new Set(["clear", "resume", "help", "exit", "feedback"]);
});
//@ chunk-3g0djq3w.js:9925-10004 facade-exports (2.1.88 match: getValueFromInput, 1)
function isSlashCommandBlockedByEndedByModel(command, endedByModel) {
  if (!endedByModel) return false;
  return !(command && command.type !== "prompt" && NON_HISTORY_COMMANDS.has(command.name));
}
//@ chunk-3g0djq3w.js:10004-11339 layout
/**
 * fork 命令结束时运行 Stop 钩子：收集系统消息、错误与附加上下文，决定是否需要继续查询；否则运行回合结束反应。
 */
async function runForkStopHooks(context, extraMessages, hookExecutors) {
  let messages = [];
  let requestQuery = false;
  let activeGoal = context.agentId ? undefined : context.getAppState().activeGoal;
  try {
    let stopHooks = hookExecutors.executeStopHooks(
      getToolPermissionContext(context).mode,
      context.abortController.signal,
      undefined,
      false,
      context.agentId,
      context,
      [...context.messages, ...extraMessages],
      undefined,
      "fork_dispatch",
    );
    let hookErrors = [];
    for await (let event of stopHooks) {
      if (event.timedOut && activeGoal && event.hook?.prompt === activeGoal.condition)
        logFeatureSad("goal_met", "evaluator_timeout");
      if (event.message?.type === "attachment") {
        let attachment = event.message.attachment;
        if ("hookEvent" in attachment && attachment.hookEvent === "Stop") {
          if (attachment.type === "hook_non_blocking_error")
            hookErrors.push(attachment.stderr || `Exit code ${attachment.exitCode}`);
          else if (attachment.type === "hook_error_during_execution") hookErrors.push(attachment.content);
          else if (attachment.type === "hook_system_message") messages.push(event.message);
        }
      }
      if (event.blockingError) {
        messages.push(
          createUserMessage({
            content: hookExecutors.getStopHookMessage(event.blockingError),
            isMeta: true,
          }),
        );
        requestQuery = true;
      }
      if (event.additionalContexts && event.additionalContexts.length > 0) {
        messages.push(
          createAttachmentMessage({
            type: "hook_additional_context",
            content: event.additionalContexts,
            hookName: "Stop",
            toolUseID: `hook-${randomUUID()}`,
            hookEvent: "Stop",
          }),
        );
        requestQuery = true;
      }
    }
    if (hookErrors.length > 0)
      messages.push(createSystemMessage(`Stop hook error: ${hookErrors.join("; ")}`, "warning"));
  } catch (error) {
    logForDebugging(`Forked command Stop hooks failed: ${String(error)}`, {
      level: "error",
    });
  }
  if (!requestQuery)
    try {
      let turnEndHooks = hookExecutors.executeStopHooks(
        getToolPermissionContext(context).mode,
        context.abortController.signal,
        undefined,
        false,
        context.agentId,
        context,
        [],
        undefined,
        "turn_end_reactions",
      );
      for await (let event of turnEndHooks);
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
//@ chunk-3g0djq3w.js:11339-16950 fingerprint (2.1.88 match: executeForkedSlashCommand, 0.467)
/**
 * executeForkedSlashCommand：context: fork 的技能在子代理里运行。
 */
async function executeForkedSlashCommand(
  command,
  args,
  context,
  precedingInputBlocks,
  imageContentBlocks,
  canUseTool,
  hookExecutors,
  hookMessages = [],
  modelScheduledOrigin,
  uuid,
  classifierTurnHooks,
  origin,
  inlinedImagePaths,
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
  let isBackground = shouldBackgroundForkedSkill(command, context, modelScheduledOrigin);
  let agentContext = isBackground
    ? {
        agentId,
        parentAgentId: context.agentId,
        depth: getAgentDepth(context.agentContext) + 1,
        agentType: "subagent",
        isAsync: false,
        isBackgroundAgent:
          context.agentContext && "isBackgroundAgent" in context.agentContext
            ? context.agentContext.isBackgroundAgent
            : undefined,
        ...getWorkflowRunFields(context.agentContext),
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
  } = await prepareForkedCommandContext(command, args, context, agentContext, {
    forkAgentId: agentId,
    extractAttachments: modelScheduledOrigin ? undefined : getAttachmentMessages,
    replaceCommandRules: true,
    replaceDenyRules: !modelScheduledOrigin,
    deferInvocationRecording: isBackground,
  });
  let permissionLayers =
    contextLayers.length > 0
      ? [...(context.permissionLayers ?? []), ...contextLayers]
      : context.permissionLayers;
  if (imageContentBlocks.length > 0 || precedingInputBlocks.length > 0)
    promptMessages.push(
      withCommandTextBlocks(
        createUserMessage({
          content: [...imageContentBlocks, ...precedingInputBlocks],
          isMeta: true,
        }),
        precedingInputBlocks,
        [],
      ),
    );
  if (inlinedImagePaths && inlinedImagePaths.length > 0)
    promptMessages.push(
      createAttachmentMessage({
        type: "inlined_image_paths",
        paths: inlinedImagePaths,
      }),
    );
  let variantNote = await scopedSkillVariantNote(command, getProjectRoot(), {
    options: {
      tools: resolveAgentTools(
        baseAgent,
        webFetchReadmissionAllowed
          ? withWebFetchToolForAgent(baseAgent, availableTools, getToolPermissionContext(context), {
              activeAgents: context.options.agentDefinitions.activeAgents,
            })
          : availableTools,
        isBackground,
        false,
        false,
        0,
        memoryModeForSession(context).mode,
      ).resolvedTools,
      spawnedBySkill: getBareCommandName(command),
    },
    storageV5: context.storageV5,
    session: context.session,
  });
  if (variantNote) promptMessages.push(variantNote);
  promptMessages.push(...hookMessages);
  let effort =
    command.getEffort?.(args, context) ?? command.getDefaultEffort?.(args, context)?.value ?? command.effort;
  let agentDef =
    effort !== undefined
      ? {
          ...baseAgent,
          effort,
        }
      : baseAgent;
  let commandName = createUserMessage({
    content: prepareUserContent({
      inputString: `/${getCommandName(command)} ${args}`.trim(),
      precedingInputBlocks:
        imageContentBlocks.length > 0
          ? [...imageContentBlocks, ...precedingInputBlocks]
          : precedingInputBlocks,
    }),
    uuid,
    origin,
  });
  await context.makeFileHistorySnapshot?.(commandName.uuid);
  logForDebugging(`Executing forked slash command /${command.name} with agent ${agentDef.agentType}`);
  if (isBackground) {
    classifierTurnHooks?.markTurnActive(
      modelScheduledOrigin ? undefined : `/${getCommandName(command)} ${args}`.trim(),
    );
    let backgroundAgent;
    try {
      backgroundAgent = await runForkedAgent({
        agentId,
        agentDefinition: agentDef,
        command,
        description: `/${getCommandName(command)} ${args}`.trim(),
        prompt: skillContent,
        promptMessages,
        context,
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
      await classifierTurnHooks?.settleTurnEnd(null);
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
            content: `<local-command-stderr>${escapeXml(commandThrowTextForTranscript(error, command.name, context.session))}</local-command-stderr>`,
            localCommandOutput: "stderr",
          }),
        ],
        shouldQuery: false,
        command,
        threw: true,
        forkDispatched: true,
      };
    }
    if (backgroundAgent) {
      await classifierTurnHooks?.settleTurnEnd(null);
      return {
        messages: [
          commandName,
          createCommandInputMessage(
            `<local-command-stdout>Running in the background as @${escapeForkedSkillTag(sanitizeTelemetryString(backgroundAgent.name))}</local-command-stdout>
` +
              forkedSkillLaunchTag({
                agentId: backgroundAgent.agentId,
                skillName: command.name,
                description: `/${getCommandName(command)} ${args}`.trim(),
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
  let progressMessages = [];
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
        agentType: agentDef.agentType,
        isBuiltIn: agentDef.source === "built-in",
        description: command.description,
      },
      parentToolUseID,
      toolUseID: `${parentToolUseID}-${toolUseCounter}`,
      timestamp: new Date().toISOString(),
      uuid: randomUUID(),
    };
  };
  let updateProgress = () => {
    context.emitToolProgress?.({
      kind: "agent_progress",
      toolUseId: parentToolUseID,
      progressMessages: [...progressMessages],
    });
  };
  let streamsProgress = transportStateByHost.of(context.session).active !== undefined;
  let sawAssistantProgress = false;
  classifierTurnHooks?.markTurnActive(
    modelScheduledOrigin ? undefined : `/${getCommandName(command)} ${args}`.trim(),
  );
  let forkedTask = registerForkedSkillTask({
    agentId,
    parentAgentId: context.agentId,
    spawnDepth: getAgentDepth(context.agentContext) + 1,
    skillName: getCommandName(command),
    prompt: skillContent,
    selectedAgent: agentDef,
    taskRegistry: context.taskRegistry,
    callerAbortController: context.abortController,
  });
  let finalStatus = "failed";
  try {
    updateProgress();
    if (streamsProgress) {
      let found = normalizeMessages(promptMessages).find((message) => message.type === "user");
      if (found)
        writeSubagentProgressToOutputSink(
          context,
          createProgressMessage({
            ...found,
            isMeta: undefined,
          }),
          false,
        );
    }
    for await (let message of runAgent({
      agentDefinition: agentDef,
      promptMessages,
      turnPrompt: skillContent,
      onModelRestricted: agentModelRestrictedReporter(getBareCommandName(command), context.onQueryEvent),
      toolUseContext: {
        ...context,
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
        abortController: forkedTask.abortController,
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
        if (streamsProgress && filterIncompleteToolCalls_2(context, message))
          writeSubagentProgressToOutputSink(context, message, false);
        continue;
      }
      let normalizedNew = normalizeMessages([message]);
      if (message.type === "assistant") {
        let contentLength = getAssistantMessageContentLength(message);
        if (contentLength > 0)
          context.onQueryEvent?.({
            type: "response_length",
            op: "add",
            delta: contentLength,
          });
        let firstMessage = normalizedNew[0];
        if (firstMessage && firstMessage.type === "assistant") {
          let progressMessage = createProgressMessage(message);
          progressMessages.push(progressMessage);
          updateProgress();
          sawAssistantProgress = true;
          if (streamsProgress) writeSubagentProgressToOutputSink(context, progressMessage, true);
        }
      }
      if (message.type === "user") {
        let message = normalizedNew[0];
        if (message && message.type === "user") {
          let progressMessage = createProgressMessage(message);
          progressMessages.push(progressMessage);
          updateProgress();
          if (streamsProgress && !(message.isMeta && !sawAssistantProgress)) {
            writeSubagentProgressToOutputSink(context, progressMessage, true);
            for (let message of normalizedNew.slice(1))
              if (message.type === "user")
                writeSubagentProgressToOutputSink(context, createProgressMessage(message), true);
          }
        }
      }
    }
    let endedInError = isApiErrorDisplayMessage(getLastAssistantMessage(agentMessages));
    if (!endedInError) adoptSubagentPublishArmsAsync(agentId, context);
    finalStatus = endedInError ? "failed" : "completed";
  } catch (error) {
    if (isAbortError(error)) {
      await classifierTurnHooks?.settleTurnEnd(null);
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
    await classifierTurnHooks?.settleTurnEnd(null);
    let stopResult = await runForkStopHooks(context, agentMessages, hookExecutors);
    return {
      messages: [
        commandName,
        createUserMessage({
          content: `<local-command-stderr>${escapeXml(commandThrowTextForTranscript(error, command.name, context.session))}</local-command-stderr>`,
          localCommandOutput: "stderr",
        }),
        ...stopResult.messages,
      ],
      shouldQuery: stopResult.requestQuery,
      command,
      threw: true,
      forkDispatched: true,
    };
  } finally {
    forkedTask.remove(finalStatus);
    clearInvokedSkillsForAgent(agentId);
    context.emitToolProgress?.({
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
  let finalResultText = withUntrustedPreamble(agentMessages) + resultText;
  logForDebugging(`Forked slash command /${command.name} completed with agent ${agentId}`);
  await classifierTurnHooks?.settleTurnEnd(agentMessages);
  let stopResult = await runForkStopHooks(context, agentMessages, hookExecutors);
  return {
    messages: [
      commandName,
      createCommandInputMessage(
        `<local-command-stdout>${escapeForkedSkillTag(finalResultText)}</local-command-stdout>`,
      ),
      ...stopResult.messages,
    ],
    shouldQuery: stopResult.requestQuery,
    command,
    resultText: finalResultText,
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
  let bundledDenied = isBundledSkillsPolicyDenied();
  let bundledSkills = getBundledSkills();
  let effectiveBundledSkills = bundledDenied ? getRegisteredBundledSkillsIgnoringKillSwitch() : bundledSkills;
  let builtinSkillCommands = bundledDenied ? builtinPluginSkillCommands() : availableBuiltinSkillCommands();
  let commandLists = [commands, builtinCommands, effectiveBundledSkills, builtinSkillCommands];
  let matchedCommand;
  let matchedPolicy;
  for (let commandList of commandLists) {
    let command = findCommand(commandName, commandList);
    if (!command) continue;
    let isBuiltinList = commandList === builtinCommands || commandList === effectiveBundledSkills;
    let policy =
      command.policyGate?.policy ?? (isBuiltinList ? COMMAND_POLICY_GATES[command.name] : undefined);
    if (
      bundledDenied &&
      isSkillOutsideCorePolicy(command.name) &&
      (commandList === effectiveBundledSkills
        ? findCommand(commandName, bundledSkills) === undefined
        : commandList === builtinSkillCommands) &&
      (policy === undefined || isPolicyAllowed(policy))
    )
      policy = ALLOW_BUNDLED_SKILLS;
    if (policy) {
      matchedCommand = command;
      matchedPolicy = policy;
      break;
    }
  }
  if (!matchedCommand || !matchedPolicy) return;
  if (!meetsAvailabilityRequirement(matchedCommand)) return;
  if (isPolicyAllowed(matchedPolicy)) {
    if (
      interactive &&
      !getDisableSlashCommands() &&
      isCommandEnabled(matchedCommand) &&
      findCommand(commandName, commands) === undefined
    )
      return {
        command: matchedCommand,
        policy: matchedPolicy,
        reason: commandEnabledAfterStartMessage(matchedCommand.name),
        kind: "stale_list",
      };
    return;
  }
  let denyKind = policyDenyKind(matchedPolicy);
  if (!interactive) {
    if (commandSurfaceNotice(commandName, getBuiltinCommands()) !== undefined) return;
    if (
      denyKind !== "org_denied" &&
      getNonInteractiveCommands(
        commandLists.flatMap((command) =>
          command.filter((candidate) => hasCommand(commandName, [candidate])),
        ),
      ).length === 0
    )
      return;
  }
  let { featureLabel, verb } = policyKeyLabel(matchedPolicy);
  let reason =
    denyKind === "cache_miss"
      ? couldNotVerifyPolicyFor(featureLabel)
      : policyDeniedReason(matchedPolicy, featureLabel, verb);
  if (reason === null || denyKind === null) return;
  return {
    command: matchedCommand,
    policy: matchedPolicy,
    reason,
    kind: denyKind,
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
  let shortName = normalizeServerNameShort(name, 200);
  let safeName = sanitizeTelemetryString(name);
  if (isAbortError(error)) {
    if (isBridgeOrTransport(session)) {
      logForDebugging(`${safeName} aborted: ${String(error)}`);
      return "Interrupted";
    }
    return escapeForkedSkillTag(error instanceof Error ? error.message || "Interrupted" : "Interrupted");
  }
  if (error instanceof MalformedCommandError) return escapeForkedSkillTag(error.message);
  if (isBridgeOrTransport(session)) {
    logForDebugging(`${safeName} threw: ${String(error)}`, {
      level: "error",
    });
    return `${shortName} failed (detail withheld on this connection)`;
  }
  return escapeForkedSkillTag(String(error));
}
//@ chunk-3g0djq3w.js:18263-28569 facade-exports (2.1.88 match: processSlashCommand, 0.357)
/**
 * processSlashCommand：解析 /命令 参数、查找命令、策略检查，分派到本地命令、prompt 命令（技能）或 fork 子代理执行。
 */
async function processSlashCommand(
  inputString,
  precedingInputBlocks,
  imageContentBlocks,
  attachmentMessages,
  context,
  uuid,
  isAlreadyProcessing,
  canUseTool,
  promptSource,
  modelScheduledOrigin,
  skillPermissionCheck,
  preExpansionInput,
  classifierTurnHooks,
  hookExecutors,
  origin,
  inlinedImagePaths,
  ideSelection,
  isMeta,
  permissionMode,
  wakeupSource,
  hostInitiator,
  lineCheckRunner,
  inboundOrigin,
  commandGate,
) {
  using parsed = takeQueuedCommandWaiter(uuid ?? context.deferredSlashUuid);
  using ahead = joinCommandRunDispatch(uuid);
  function buildPromptResult(extraAttachments = [], text = inputString, extractPromptAttachments = false) {
    let newUuid = randomUUID();
    let promptId = hasToolResultBlock(precedingInputBlocks) ? undefined : newUuid;
    if (promptId !== undefined) setPromptId(promptId);
    let effortLevelIfSupported = getEffortLevelIfSupported(
      context.options.mainLoopModel,
      getEffortValue(context),
      getEffortLayerOverride(context.permissionLayers),
    );
    logEvent("tengu_input_prompt", {
      ...(promptSource && {
        prompt_source: fromEnum(promptSource),
      }),
      ...(effortLevelIfSupported && {
        effort_level: fromEnum(effortLevelIfSupported),
      }),
      turn_origin: fromEnum(getOriginKindLabel(origin)),
      ...promptTelemetryFields({
        wakeupSource,
        hostInitiator,
        inboundOrigin,
      }),
      ...emptyObjectFactory(),
    });
    let messageUuid = uuid || randomUUID();
    logSlashPromptEvent(
      {
        text,
        attributes: {
          ...(promptId && {
            "prompt.id": promptId,
          }),
          "message.uuid": messageUuid,
        },
      },
      context.userPromptHold,
    );
    let message = createUserMessage({
      content: prepareUserContent({
        inputString: text,
        precedingInputBlocks,
      }),
      uuid: messageUuid,
      permissionMode,
      isMeta: isMeta || undefined,
      promptSource,
      promptId,
      origin,
    });
    let unframed = cloneContent(message.message.content);
    if (origin) wrapNonUserMessage(message, origin);
    return {
      messages: [
        message,
        ...attachmentMessages,
        ...extraAttachments.map((attachment) => createAttachmentMessage(attachment)),
      ],
      shouldQuery: true,
      ...(text === inputString && {
        promptRow: {
          message,
          unframed,
        },
      }),
      ...(extractPromptAttachments && {
        extractPromptAttachments: true,
      }),
    };
  }
  let slashCommand = parseSlashCommand(inputString);
  if (!slashCommand) {
    logEvent("tengu_input_slash_missing", {});
    if (context.options.isNonInteractiveSession) return buildPromptResult();
    logFeatureBad("cmd_dispatch", "cmd_parse_failed");
    let errorMessage = "Commands are in the form `/command [args]`";
    return {
      messages: [
        createSyntheticUserCaveatMessage(),
        ...attachmentMessages,
        createUserMessage({
          content: prepareUserContent({
            inputString: errorMessage,
            precedingInputBlocks,
          }),
        }),
      ],
      shouldQuery: false,
      resultText: errorMessage,
    };
  }
  let { commandName, args: parsedArgs } = slashCommand;
  let { isMcp } = slashCommand;
  let subcommandArgs;
  if (preExpansionInput !== undefined) {
    let slashCommand_2 = parseSlashCommand(preExpansionInput);
    subcommandArgs =
      slashCommand_2 && slashCommand_2.commandName === slashCommand.commandName
        ? slashCommand_2.args
        : undefined;
  }
  let command = findCommand(commandName, context.options.commands);
  if (command && !isCommandEnabled(command)) command = undefined;
  if (!command && !isMcp && parsedArgs.trim()) {
    let trimmedArgs = parsedArgs.trimStart();
    let spaceIndex = trimmedArgs.search(/\s/);
    let firstWord = spaceIndex === -1 ? trimmedArgs : trimmedArgs.slice(0, spaceIndex);
    let unknownMessage = `${commandName}:${firstWord}`;
    let command_2 = findCommand(unknownMessage, context.options.commands);
    if (command_2) {
      command = command_2;
      commandName = unknownMessage;
      parsedArgs = spaceIndex === -1 ? "" : trimmedArgs.slice(spaceIndex + 1).trimStart();
    }
  }
  if (!command && !isMcp && !getDisableSlashCommands()) {
    let commandAfterHooks = await findCommandAfterHooks(
      commandName,
      parsed.origin === undefined,
      context.abortController.signal,
    );
    if (!commandAfterHooks && context.abortController.signal.aborted) {
      let fallbackCommand =
        findCommand(commandName, context.options.commands) ?? findCommand(commandName, getBuiltinCommands());
      return interruptedCommandResult({
        signal: context.abortController.signal,
        typed: [
          ...attachmentMessages,
          createUserMessage({
            content: prepareUserContent({
              inputString: fallbackCommand
                ? formatRedactedCommandInput(fallbackCommand, parsedArgs)
                : formatCommandInputTags(sanitizeTelemetryString(commandName), redactSecrets(parsedArgs)),
              precedingInputBlocks,
            }),
            uuid,
            origin,
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
      context = {
        ...context,
        options: {
          ...context.options,
          commands: [...context.options.commands, commandAfterHooks],
        },
      };
    }
  }
  let authWarning;
  let matchInfo;
  if (command && !isSkillOff(command)) {
    let subcommandMatch = matchSubcommand(command, parsedArgs);
    if (subcommandMatch) {
      let command_2 = findCommand(subcommandMatch.targetName, context.options.commands);
      if (command_2 && isCommandEnabled(command_2)) {
        matchInfo = `${commandName} ${subcommandMatch.consumedToken}`;
        command = command_2;
        commandName = subcommandMatch.targetName;
        parsedArgs = subcommandMatch.remainingArgs;
      } else if (command.name === CODE_REVIEW) {
        let promptId = ultrareviewAuthPrecondition();
        if (promptId)
          authWarning = createSystemMessage(`${promptId} Running a local review instead.`, "warning");
      }
    }
  }
  if (command && commandGate && !isSkillOff(command)) {
    let handledResult = await commandGate(command, commandName, parsedArgs);
    if (handledResult) return emptyIfHandled(parsed.origin !== undefined, handledResult);
  }
  let syncRefusal = command ? await checkCommandSyncedAccess(command) : undefined;
  if (command && syncedSkillRefusalReason(command)) command = undefined;
  if (command && isShippedSkillExecutionBlocked(command)) command = undefined;
  if (command && isDefined(syncRefusal)) {
    logSyncedCommandRefused(command, syncRefusal);
    command = undefined;
  }
  let isBuiltinName = builtInCommandNames().has(commandName);
  if (isSlashCommandBlockedByEndedByModel(command, context.getAppState().endedByModel)) {
    let endedMessage = withTaskSuffix(
      "Claude ended this conversation. Start a new session (or /clear) to continue.",
    );
    return emptyIfHandled(parsed.origin !== undefined, {
      messages: [createSystemMessage(endedMessage, "warning")],
      shouldQuery: false,
      resultText: endedMessage,
    });
  }
  let isBundled = command?.type === "prompt" && command.source === "bundled";
  let isOfficial = command?.type === "prompt" && isOfficialMarketplaceSkill(command);
  let isMcpCommand = isMcp || (command?.type === "prompt" && command.source === "mcp");
  if (!command) {
    if (!looksLikeCommand(commandName)) return buildPromptResult();
    let typedPath = `/${commandName}`;
    let fileExists = false;
    if (!isDiskless() && !isUntouchableSpelling(typedPath))
      try {
        await getFsImplementation().stat(typedPath);
        fileExists = true;
      } catch {}
    if (!fileExists) {
      let commandPolicyGate = resolveCommandPolicyGate(commandName, context.options.commands, {
        interactive: !context.options.isNonInteractiveSession,
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
        let redactedArgs = !parsedArgs
          ? ""
          : hasSensitiveArgs(command, parsedArgs)
            ? "***"
            : escapeForkedSkillTag(redactSecrets(parsedArgs));
        if (context.options.isNonInteractiveSession)
          return emptyIfHandled(parsed.origin !== undefined, {
            messages: [
              ...attachmentMessages,
              createCommandInputMessage(`/${isOfficial}${redactedArgs ? ` ${redactedArgs}` : ""}`, {
                submitUuid: uuid,
              }),
              createCommandInputMessage(`<local-command-stdout>${reason}</local-command-stdout>`),
            ],
            shouldQuery: false,
            resultText: reason,
          });
        return emptyIfHandled(parsed.origin !== undefined, {
          messages: [
            ...attachmentMessages,
            createSystemMessage(reason, "warning"),
            ...(redactedArgs && redactedArgs !== "***"
              ? [createSystemMessage(`Args from /${isOfficial}: ${redactedArgs}`, "warning")]
              : []),
          ],
          shouldQuery: false,
          resultText: reason,
        });
      }
      if (context.options.isNonInteractiveSession && builtInCommandNames().has(commandName)) {
        let builtinCommands = getBuiltinCommands();
        let unavailableMessage =
          commandSurfaceNotice(commandName, builtinCommands) ??
          `/${escapeForkedSkillTag(sanitizeTelemetryString(commandName))} isn't available in this environment.`;
        logEvent("tengu_input_slash_invalid", {
          input_length: commandName.length,
          had_suggestion: false,
        });
        logFeatureBad("cmd_dispatch", "cmd_unavailable_headless");
        let command = findCommand(commandName, builtinCommands);
        let redactedArgs = !parsedArgs
          ? ""
          : command !== undefined && hasSensitiveArgs(command, parsedArgs)
            ? "***"
            : escapeForkedSkillTag(redactSecrets(parsedArgs));
        return emptyIfHandled(parsed.origin !== undefined, {
          messages: [
            ...attachmentMessages,
            createCommandInputMessage(
              `/${escapeForkedSkillTag(sanitizeTelemetryString(commandName))}${redactedArgs ? ` ${redactedArgs}` : ""}`,
              {
                submitUuid: uuid,
              },
            ),
            createCommandInputMessage(`<local-command-stdout>${unavailableMessage}</local-command-stdout>`, {
              commandOutcome: {
                kind: "unavailable_headless",
              },
            }),
          ],
          shouldQuery: false,
          resultText: unavailableMessage,
        });
      }
      let refusedSyncedCommands = await findRefusedSyncedCommands(context.options.commands);
      let filtered = context.options.commands.filter(
        (command) =>
          !command.isHidden &&
          !isSkillOff(command) &&
          isCommandEnabled(command) &&
          !(isSyncedSkill(command) && getSkillsSyncVetoed()) &&
          !isKilledHostCatalogSkill(command) &&
          !refusedSyncedCommands.has(command),
      );
      let modelFallback =
        parsed.origin === undefined && isQuillKillswitchOff(context.options.isNonInteractiveSession);
      let candidateCommands = modelFallback
        ? filtered.filter((command) => command.type === "prompt" && !command.disableModelInvocation)
        : filtered;
      let suggestion = suggestClosestName(
        commandName,
        candidateCommands.map((command) => ({
          name: getCommandName(command),
          aliases: command.aliases,
        })),
        {
          maxEditDistance: 2,
        },
      );
      logEvent("tengu_input_slash_invalid", {
        input_length: commandName.length,
        had_suggestion: Boolean(suggestion),
        suggestion_distance: suggestion ? boundedEditDistance(commandName, suggestion, 2) : undefined,
        fallback_to_model: modelFallback,
      });
      if (modelFallback) {
        logFeatureSad("cmd_dispatch", "cmd_unknown_model_fallback");
        return buildPromptResult(
          [
            unknownCommandFallback({
              commandName,
              suggestion,
              availableCommandNames: candidateCommands.map((command) => getCommandName(command)),
              availableCommandCount: filtered.length,
            }),
          ],
          containsSecret(inputString) ? redactSecrets(inputString) : inputString,
          true,
        );
      }
      logFeatureBad("cmd_dispatch", "cmd_unknown");
      let shortName = normalizeServerNameShort(commandName, 200);
      let suggestionName = suggestion ? normalizeServerNameShort(suggestion, 200) : undefined;
      let message = suggestion
        ? `Unknown command: /${shortName}. Did you mean /${suggestionName}?`
        : `Unknown command: /${shortName}`;
      if (context.options.isNonInteractiveSession)
        return emptyIfHandled(parsed.origin !== undefined, {
          messages: [
            ...attachmentMessages,
            createCommandInputMessage(
              `/${shortName}${parsedArgs ? ` ${escapeForkedSkillTag(redactSecrets(parsedArgs))}` : ""}`,
              {
                submitUuid: uuid,
              },
            ),
            createCommandInputMessage(`<local-command-stdout>${message}</local-command-stdout>`, {
              commandOutcome: {
                kind: "unknown",
                ...(suggestionName !== undefined && {
                  suggestion: suggestionName,
                }),
              },
            }),
          ],
          shouldQuery: false,
          resultText: message,
        });
      return emptyIfHandled(parsed.origin !== undefined, {
        messages: [
          ...attachmentMessages,
          createSystemMessage(message, "warning"),
          ...(parsedArgs
            ? [createSystemMessage(`Args from unknown skill: ${redactSecrets(parsedArgs)}`, "warning")]
            : []),
        ],
        shouldQuery: false,
        resultText: message,
      });
    }
    return buildPromptResult();
  }
  let commandSourceKind =
    isMcpCommand || command.loadedFrom === "mcp"
      ? "mcp"
      : isBuiltinName ||
          (command.type === "prompt" && (command.source === "bundled" || command.source === "builtin"))
        ? "builtin"
        : "custom";
  let text = hasSensitiveArgs(command, parsedArgs) ? `/${commandName} ***` : inputString;
  let deferredToEngine = context.deferSlashToEngine?.(command) ?? false;
  if (!deferredToEngine) {
    let promptId = randomUUID();
    setPromptId(promptId);
    let event = {
      text,
      attributes: {
        "prompt.id": promptId,
        command_name:
          commandSourceKind === "builtin" || isToolDetailsLoggingEnabled() ? commandName : commandSourceKind,
        command_source: commandSourceKind,
      },
    };
    logSlashPromptEvent(event, context.userPromptHold);
  }
  if (command.type !== "prompt" && context.userPromptHold !== undefined) context.userPromptLine?.withheld();
  let effectiveCommand = command;
  let isOfficial_2 = getCommandName(effectiveCommand);
  let argsRanWith = parsedArgs;
  let lineCheckResults = new Map();
  let passCount = 0;
  let runCommand = async (parsedArgs_2) => {
    passCount += 1;
    argsRanWith = parsedArgs_2;
    context.userPromptLine?.ranAs({
      name: isOfficial_2,
      args: parsedArgs,
      argsRanWith: parsedArgs_2,
    });
    let hookObserved = deferredToEngine && isPromptHookObserved();
    if (effectiveCommand.type !== "prompt" && !hookObserved) context.userPromptLine?.passed();
    let messagesForSlashCommand = await getMessagesForSlashCommand(
      commandName,
      parsedArgs_2,
      context,
      precedingInputBlocks,
      imageContentBlocks,
      isAlreadyProcessing,
      canUseTool,
      uuid,
      modelScheduledOrigin,
      skillPermissionCheck,
      subcommandArgs,
      matchInfo,
      classifierTurnHooks,
      promptSource,
      hookExecutors,
      origin,
      inlinedImagePaths,
      ideSelection,
      lineCheckRunner &&
        (async () => {
          let lineCheckPromise =
            lineCheckResults.get(parsedArgs_2) ??
            lineCheckRunner({
              name: isOfficial_2,
              args: parsedArgs,
              argsRanWith: parsedArgs_2,
            });
          lineCheckResults.set(parsedArgs_2, lineCheckPromise);
          return hasProceedsOutcome(await lineCheckPromise);
        }),
    );
    if (messagesForSlashCommand.ownPassCutShort) passCount -= 1;
    let lineCheckResult = await lineCheckResults.get(parsedArgs_2);
    return lineCheckResult === undefined
      ? messagesForSlashCommand
      : {
          ...messagesForSlashCommand,
          lineCheck: lineCheckResult,
        };
  };
  if (deferredToEngine) parsed.handOn(context.abortController.signal);
  let runOutcome = deferredToEngine
    ? {
        kind: "engine",
        ran: await runCommand(parsedArgs),
      }
    : await swallowAbortError(
        dispatchCommandRunHooks({
          input: {
            command: isOfficial_2,
            args: parsedArgs,
            origin: resolvePromptOrigin({
              submissionOrigin: origin,
              dispatchedOverBridge: context.dispatchedOverBridge,
              promptSource,
            }),
            presentation: viewportInfo(context.presentation),
          },
          engine: {
            run: runCommand,
            textOf: (result) => result.resultText,
            contextOf: (result) => result.metaTexts,
            retell: attachCommandResultText,
          },
          queued: parsed,
          ahead,
          signal: context.abortController.signal,
        }),
        context.abortController.signal,
      );
  let lineChecks = runOutcome === undefined ? await Promise.all(lineCheckResults.values()) : [];
  let finalLineCheck = lineChecks.some(hasProceedsOutcome) ? undefined : lineChecks.at(-1);
  let buildTypedMessage = (ranArgs) =>
    createUserMessage({
      content: prepareUserContent({
        inputString: formatRedactedCommandInput(effectiveCommand, ranArgs),
        precedingInputBlocks,
      }),
      uuid,
      origin,
    });
  if (finalLineCheck !== undefined)
    return {
      messages: [buildTypedMessage(finalLineCheck.ran.argsRanWith)],
      shouldQuery: true,
      ranCommand: finalLineCheck.ran,
      lineCheck: finalLineCheck,
    };
  if (runOutcome === undefined) {
    let proceedsLineCheck = context.userPromptLine?.isHeldForOrganization()
      ? undefined
      : lineChecks.findLast(hasProceedsOutcome);
    return {
      ...interruptedCommandResult({
        signal: context.abortController.signal,
        typed: [...attachmentMessages, buildTypedMessage(parsedArgs)],
        marker: createUserInterruptionMessage({
          toolUse: false,
        }),
        isQueuedByPlugin: parsed.origin !== undefined,
      }),
      ...(passCount === 0 && {
        ownPassCutShort: true,
      }),
      ...(proceedsLineCheck !== undefined && {
        ranCommand: proceedsLineCheck.ran,
        lineCheck: proceedsLineCheck,
      }),
    };
  }
  let withheldForHook =
    runOutcome.kind !== "engine" &&
    (!hasSingleCommandRunHook(getCommandName(effectiveCommand)) ||
      (context.userPromptLine?.isUnknownSinceDispatch() ?? false));
  let args = withheldForHook ? "" : parsedArgs;
  let offerTurn =
    runOutcome.kind === "answered" &&
    runOutcome.text !== undefined &&
    !withheldForHook &&
    (runOutcome.exitCode ?? 0) === 0 &&
    isHumanOrAutoContinuation(origin)
      ? modCommandFollowUpNote(isOfficial_2, context.agentId)
      : undefined;
  if (withheldForHook) context.userPromptLine?.withheld();
  else if (runOutcome.kind !== "engine" && effectiveCommand.type !== "prompt")
    context.userPromptLine?.passed();
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
  } = runOutcome.kind === "engine"
    ? runOutcome.ran
    : runLocalCommand(runOutcome.text, runOutcome.context, {
        plugin: runOutcome.plugin,
        command: effectiveCommand,
        commandName,
        args,
        precedingInputBlocks,
        uuid,
        submissionOrigin: origin,
        isNonInteractiveSession: context.options.isNonInteractiveSession === true,
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
    isMcp: isMcpCommand || command_2.loadedFrom === "mcp",
    isBuiltIn: isBuiltinName,
    isBundled,
    isOfficial,
  });
  function logCommandEvent() {
    let telemetryFields = {
      input: sanitizedName,
      ...skillNameHash,
    };
    if (command_2.type === "prompt" && command_2.pluginInfo) {
      Object.assign(telemetryFields, getSkillPluginTelemetryFields(command_2));
      let version = command_2.pluginInfo.pluginManifest.version;
      if (version && isOfficialMarketplaceSkill(command_2))
        telemetryFields.plugin_version = sanitizeVersion(version);
    }
    if (command_2.type === "prompt") Object.assign(telemetryFields, buildServerAttributionFields(command_2));
    logEvent("tengu_input_command", {
      ...telemetryFields,
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
    logCommandEvent();
    return {
      messages: [],
      shouldQuery: false,
      model,
      resultText,
      nextInput,
      submitNextInput,
      localCommand: sanitizedName,
      ...(runOutcome.exitCode !== undefined && {
        commandExitCode: runOutcome.exitCode,
      }),
    };
  }
  if (
    messages.length === 2 &&
    messages[1].type === "user" &&
    typeof messages[1].message.content === "string" &&
    messages[1].message.content.startsWith("Unknown command:")
  ) {
    if (!(
      inputString.startsWith("/var") ||
      inputString.startsWith("/tmp") ||
      inputString.startsWith("/private")
    )) {
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
    logCommandEvent();
  }
  let startsWithCompactBoundary = messages.length > 0 && messages[0] && isCompactBoundaryMessage(messages[0]);
  let finalMessages =
    shouldQuery ||
    messages.every(
      (message) =>
        isSystemLocalCommandMessage(message) ||
        (message.type === "system" && message.subtype === "informational") ||
        (message.type === "user" && message.isMeta),
    ) ||
    startsWithCompactBoundary ||
    engineDeferredSlash
      ? messages
      : [createSyntheticUserCaveatMessage(), ...messages];
  return {
    messages:
      authWarning && shouldQuery && (lineCheck === undefined || hasProceedsOutcome(lineCheck))
        ? [...finalMessages, authWarning]
        : finalMessages,
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
    ...(runOutcome.exitCode !== undefined && {
      commandExitCode: runOutcome.exitCode,
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
function hasProceedsOutcome(result) {
  return result.outcome?.proceeds !== undefined;
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
  let featureName = cmdFeature(shippedCommandNames().has(commandName) ? commandName : "custom");
  logFeatureOk(featureName, getTipAttribution(command.name));
  let withholdPrompt =
    isNonInteractiveSession ||
    precedingInputBlocks.length > 0 ||
    !isHumanOrAutoContinuation(submissionOrigin);
  let metaTexts = context ?? [];
  if (text === undefined && metaTexts.length === 0 && !withholdPrompt)
    return {
      messages: [],
      shouldQuery: false,
      command,
    };
  return {
    messages: [
      withholdPrompt
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
      ...metaTexts.map((content) =>
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
    ...(metaTexts.length > 0 && {
      metaTexts,
    }),
    ...(offerTurn !== undefined && {
      queriesAfterRun: true,
    }),
  };
}
//@ chunk-3g0djq3w.js:29342-30427 layout
function attachCommandResultText(result, { text, plugin, context }) {
  if (result.shouldQuery || result.nextInput !== undefined || result.settledInPlace) return;
  let messages = result.messages;
  if (text !== undefined) {
    let stdoutIndex =
      result.resultText === undefined
        ? -1
        : messages.findIndex(
            (message) =>
              isSystemLocalCommandMessage(message) &&
              (message.content.startsWith(`<${LOCAL_COMMAND_STDOUT}>`) ||
                message.content.startsWith(`<${LOCAL_COMMAND_STDERR}>`)),
          );
    if (stdoutIndex === -1) return;
    let targetMessage = messages[stdoutIndex];
    let tagName =
      targetMessage !== undefined &&
      isSystemLocalCommandMessage(targetMessage) &&
      targetMessage.content.startsWith(`<${LOCAL_COMMAND_STDERR}>`)
        ? LOCAL_COMMAND_STDERR
        : LOCAL_COMMAND_STDOUT;
    messages = messages.with(
      stdoutIndex,
      createCommandInputMessage(
        `<${tagName}>${escapeForkedSkillTag(text)}</${tagName}>`,
        targetMessage !== undefined && isSystemLocalCommandMessage(targetMessage)
          ? {
              commandRun:
                targetMessage.commandRun !== undefined && plugin !== undefined
                  ? {
                      ...targetMessage.commandRun,
                      plugin,
                    }
                  : targetMessage.commandRun,
              commandOutcome: targetMessage.commandOutcome,
            }
          : undefined,
      ),
    );
  }
  if (context !== undefined) {
    if (!(
      result.metaTexts !== undefined ||
      messages.some(
        (message) =>
          isSystemLocalCommandMessage(message) &&
          (message.content.startsWith(`<${LOCAL_COMMAND_STDOUT}>`) ||
            message.content.startsWith(`<${LOCAL_COMMAND_STDERR}>`)),
      )
    ))
      return;
    let metaCounts = new Map();
    for (let content of result.metaTexts ?? []) metaCounts.set(content, (metaCounts.get(content) ?? 0) + 1);
    messages = [
      ...messages.filter((message) => {
        let content =
          message.type === "user" && message.isMeta && typeof message.message.content === "string"
            ? message.message.content
            : undefined;
        let remaining = content === undefined ? 0 : (metaCounts.get(content) ?? 0);
        if (content === undefined || remaining === 0) return true;
        metaCounts.set(content, remaining - 1);
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
    ...result,
    messages,
    resultText: text ?? result.resultText,
    ...((context ?? result.metaTexts) !== undefined && {
      metaTexts: context ?? result.metaTexts,
    }),
  };
}
//@ chunk-3g0djq3w.js:30427-30765 layout
function headlessUnavailableResult(command, args, submitUuid) {
  let message = `/${getCommandName(command)} opens an interactive panel and isn't available in this environment. Run it from the Claude Code terminal instead.`;
  return {
    messages: [
      createCommandInputMessage(formatRedactedCommandInput(command, args), {
        submitUuid,
      }),
      createCommandInputMessage(`<local-command-stdout>${message}</local-command-stdout>`, {
        commandOutcome: {
          kind: "unavailable_headless",
        },
      }),
    ],
    shouldQuery: false,
    command,
    resultText: message,
  };
}
//@ chunk-3g0djq3w.js:30765-42876 callgraph-witnessed (2.1.88 match: getMessagesForSlashCommand, 0.288)
/**
 * getMessagesForSlashCommand：执行具体斜杠命令并生成消息（local-jsx、local、prompt 三类）。
 */
async function getMessagesForSlashCommand(
  commandName,
  args,
  context,
  precedingInputBlocks,
  imageContentBlocks,
  isAlreadyProcessing,
  canUseTool,
  uuid,
  modelScheduledOrigin,
  skillPermissionCheck,
  subcommandArgs,
  invokedAsName,
  classifierTurnHooks,
  promptSource,
  hookExecutors,
  origin,
  inlinedImagePaths,
  ideSelection,
  lineCheckRunner,
) {
  let command = getCommand(commandName, context.options.commands);
  args = unwrapPastedContentBlocks(args);
  let featureName = cmdFeature(shippedCommandNames().has(commandName) ? commandName : "custom");
  let tipAttribution = getTipAttribution(command.name);
  if (!isCommandEnabled(command)) {
    logFeatureBad(featureName, "cmd_policy_disabled");
    let message = `/${escapeForkedSkillTag(sanitizeTelemetryString(commandName))} isn't available in this session.`;
    if (context.options.isNonInteractiveSession)
      return {
        messages: [
          createCommandInputMessage(formatRedactedCommandInput(command, args), {
            submitUuid: uuid,
          }),
          createCommandInputMessage(`<local-command-stdout>${message}</local-command-stdout>`),
        ],
        shouldQuery: false,
        command,
        resultText: message,
      };
    return {
      messages: [createSystemMessage(message, "warning")],
      shouldQuery: false,
      command,
      resultText: message,
    };
  }
  if (isSkillOff(command)) {
    let hiddenReason = describeSkillHiddenBehindPlugin(command);
    logFeatureBad(
      featureName,
      hiddenReason === undefined ? "cmd_skill_override_off" : "cmd_skill_hidden_behind_plugin",
    );
    if (context.options.isNonInteractiveSession) {
      let message =
        hiddenReason ??
        `Skill "${normalizeServerNameShort(command.name, 200)}" is disabled via skillOverrides. Remove the override from your settings to run it.`;
      return {
        messages: [
          createCommandInputMessage(formatRedactedCommandInput(command, args), {
            submitUuid: uuid,
          }),
          createCommandInputMessage(`<local-command-stdout>${message}</local-command-stdout>`),
        ],
        shouldQuery: false,
        command,
        resultText: message,
      };
    }
    let message =
      hiddenReason ??
      `Skill "${normalizeServerNameShort(command.name, 200)}" is disabled via skillOverrides. Re-enable it in /skills or remove the override from your settings to run it.`;
    let redactedArgs = !args
      ? ""
      : hasSensitiveArgs(command, args)
        ? "***"
        : escapeForkedSkillTag(redactSecrets(args));
    return {
      messages: [
        createSystemMessage(message, "warning"),
        ...(args ? [createSystemMessage(`Args from disabled skill: ${redactedArgs}`, "warning")] : []),
      ],
      shouldQuery: false,
      command,
      resultText: message,
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
    logFeatureBad(featureName, "cmd_not_user_invocable");
    return {
      messages: [
        createUserMessage({
          content: prepareUserContent({
            inputString: `/${sanitizeTelemetryString(commandName)}`,
            precedingInputBlocks,
          }),
          uuid,
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
    logFeatureBad(featureName, "cmd_local_jsx_headless");
    return headlessUnavailableResult(command, args, uuid);
  }
  try {
    switch (command.type) {
      case "local-jsx":
        return new Promise((resolve) => {
          let settled = false;
          let onDone = (result, options) => {
            if (settled) return;
            settled = true;
            logFeatureOk(featureName, tipAttribution);
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
                        createCommandInputMessage(formatCommandInput(command, args)),
                        createCommandInputMessage(
                          `<local-command-stdout>${escapeForkedSkillTag(String(result))}</local-command-stdout>`,
                          {
                            commandRun: buildCommandRunInfo(command, args),
                          },
                        ),
                        ...metaMessages,
                      ]
                  : [
                      createUserMessage({
                        content: prepareUserContent({
                          inputString: formatCommandInput(command, args),
                          precedingInputBlocks,
                        }),
                        uuid,
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
          let loadDialog = command.load ?? context.options.resolveCommandDialog?.(command);
          if (!loadDialog) {
            logFeatureBad(featureName, "cmd_local_jsx_no_dialog_resolution");
            resolve(headlessUnavailableResult(command, args));
            return;
          }
          let isImmediate = isImmediateCommand(command, args, context.presentation ?? "inline");
          loadDialog()
            .then((mod) =>
              mod.call(
                onDone,
                {
                  ...context,
                  canUseTool,
                  dispatchedAsImmediate: isImmediate,
                  submissionOrigin: origin,
                  promptSource,
                },
                args,
                invokedAsName ?? commandName,
              ),
            )
            .then((jsx) => {
              if (jsx == null) return;
              if (settled) return;
              let localJsx = context.localJsx;
              if (!localJsx) {
                logFeatureBad(featureName, "cmd_local_jsx_no_panel_host");
                settled = true;
                resolve(headlessUnavailableResult(command, args));
                return;
              }
              localJsx
                .show(jsx, {
                  commandName: getCommandName(command),
                  immediate: isImmediate,
                  hidesPrompt: true,
                  retireAtTurnBoundary: true,
                })
                .closed.then((closeReason) => {
                  if (closeReason === "dismissed" && !settled) {
                    settled = true;
                    logFeatureBad(featureName, "cmd_local_jsx_dismissed");
                    resolve({
                      messages: [],
                      shouldQuery: false,
                      command,
                    });
                  }
                });
            })
            .catch((error) => {
              let aborted = isAbortError(error);
              if (aborted)
                logForDebugging(
                  `local-jsx command aborted: ${error instanceof Error ? error.message : String(error)}`,
                );
              else logError(withTelemetryMessage(toError(error), "local-jsx slash command threw"));
              logFeatureBad(featureName, aborted ? "cmd_local_jsx_aborted" : "cmd_local_jsx_threw");
              if (settled) return;
              settled = true;
              if (aborted) {
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
                      inputString: formatCommandInput(command, args),
                      precedingInputBlocks,
                    }),
                    uuid,
                  }),
                  createCommandInputMessage(
                    `<local-command-stderr>${escapeXml(escapeForkedSkillTag(commandThrowTextForTranscript(error, command.name, context.session)))}</local-command-stderr>`,
                    {
                      commandRun: buildCommandRunInfo(command, args),
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
          let trimmed = `/${getCommandName(command)} ${args}`.trim();
          let userMessage = createUserMessage({
            content: prepareUserContent({
              inputString: trimmed,
              precedingInputBlocks,
            }),
            uuid,
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
            inputString: formatCommandInput(command, args),
            precedingInputBlocks,
          }),
          uuid,
        });
        let workspace = isRemoteSessionAvailable() && getCommandRequirements(command).workspace;
        if (workspace)
          context.applyMessageOp({
            type: "append",
            messages: [userMessage],
          });
        try {
          let syntheticCaveatMessage = createSyntheticUserCaveatMessage();
          let modulePromise = (await command.load()).call(
            args,
            {
              ...context,
              submissionOrigin: origin,
              promptSource,
              commandMessageUuid: userMessage.uuid,
            },
            invokedAsName ?? commandName,
          );
          let outcome = workspace
            ? await raceWithAbortSignal(modulePromise, context.abortController.signal, () => new AbortError())
            : await modulePromise;
          if (outcome.type === "text" && outcome.level === "error")
            logFeatureBad(featureName, "cmd_returned_error");
          else logFeatureOk(featureName, tipAttribution);
          if (outcome.type === "skip")
            return {
              messages: [],
              shouldQuery: false,
              command,
            };
          if (outcome.type === "compact") {
            let slashCommandMessages = [
              syntheticCaveatMessage,
              userMessage,
              ...(outcome.displayText
                ? [
                    createUserMessage({
                      content: `<local-command-stdout>${escapeForkedSkillTag(outcome.displayText)}</local-command-stdout>`,
                      localCommandOutput: outcome.displayTextIsHintOnly ? "terminal-hint" : "stdout",
                      ...(outcome.displayRepeatsSummary === true && {
                        repeatsCompactSummary: true,
                      }),
                      timestamp: new Date(Date.now() + 100).toISOString(),
                    }),
                  ]
                : []),
            ];
            let compactionResultWithSlashMessages = {
              ...outcome.compactionResult,
              messagesToKeep: [...outcome.compactionResult.messagesToKeep, ...slashCommandMessages],
            };
            let postCompactMessages = buildPostCompactMessages(compactionResultWithSlashMessages);
            setLastCacheSafeForkMessages(postCompactMessages);
            return {
              messages: postCompactMessages,
              shouldQuery: false,
              command,
            };
          }
          if (outcome.type === "query")
            return {
              messages: [
                userMessage,
                createCommandInputMessage(
                  `<local-command-stdout>${escapeForkedSkillTag(outcome.value)}</local-command-stdout>`,
                  {
                    commandRun: buildCommandRunInfo(command, args),
                  },
                ),
                ...(outcome.metaMessages ?? []).map((content) =>
                  createUserMessage({
                    content,
                    isMeta: true,
                  }),
                ),
                createUserMessage({
                  content: outcome.prompt,
                  isMeta: true,
                }),
              ],
              shouldQuery: true,
              command,
              resultText: outcome.value,
              ...(outcome.metaMessages !== undefined && {
                metaTexts: outcome.metaMessages,
              }),
            };
          let tagName = outcome.level === "error" ? "local-command-stderr" : "local-command-stdout";
          let commandInputMessage = createCommandInputMessage(
            `<${tagName}>${escapeForkedSkillTag(outcome.value)}</${tagName}>`,
            {
              contextUsage: outcome.contextUsage,
              usageReport: outcome.usageReport,
              commandRun: buildCommandRunInfo(command, args),
              commandOutcome:
                outcome.outcome ??
                (outcome.level === "error"
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
              resultText: outcome.value,
            });
          return {
            messages: [
              userMessage,
              commandInputMessage,
              ...(outcome.metaMessages ?? []).map((content) =>
                createUserMessage({
                  content,
                  isMeta: true,
                }),
              ),
            ],
            shouldQuery: false,
            command,
            resultText: outcome.value,
            ...(outcome.metaMessages !== undefined && {
              metaTexts: outcome.metaMessages,
            }),
          };
        } catch (error) {
          if (isAbortError(error))
            logForDebugging(
              `local command aborted: ${error instanceof Error ? error.message : String(error)}`,
            );
          else logError(withTelemetryMessage(toError(error), "local slash command threw"));
          let aborted = isAbortError(error);
          if (aborted && context.abortController.signal.aborted)
            logFeatureSad(featureName, "cmd_local_aborted");
          else logFeatureBad(featureName, aborted ? "cmd_local_aborted" : "cmd_local_threw");
          let tagName = aborted ? "local-command-stdout" : "local-command-stderr";
          let fallbackText = workspace ? REMOTE_STOPPED_WAITING_NOTICE : "Interrupted";
          let errorText = aborted
            ? isBridgeOrTransport(context.session)
              ? fallbackText
              : error instanceof Error
                ? error.message || fallbackText
                : fallbackText
            : commandThrowTextForTranscript(error, command.name, context.session);
          let commandInputMessage = createCommandInputMessage(
            `<${tagName}>${escapeXml(escapeForkedSkillTag(errorText))}</${tagName}>`,
            aborted
              ? undefined
              : {
                  commandRun: buildCommandRunInfo(command, args),
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
                trailingArgs: args,
                capped: false,
              }
            : splitStackedCommands(
                args,
                subcommandArgs,
                context.options.commands,
                modelScheduledOrigin ? (skillPermissionCheck ?? (() => true)) : undefined,
              );
        let stackedSplit = trailingArgs;
        let noticeMessage;
        if (stacked.length > 0)
          logEvent("tengu_stacked_slash_commands", {
            stacked_count: stacked.length,
          });
        let passRan = false;
        try {
          let isForkDispatch =
            getCommandContextMode(command, stackedSplit, context) === "fork" &&
            !isCoordinatorMainThread(context);
          if (!isForkDispatch && (await lineCheckRunner?.()) === false) {
            logFeatureBad(
              featureName,
              context.abortController.signal.aborted
                ? "cmd_prompt_aborted"
                : "cmd_prompt_submit_hook_blocked",
            );
            return {
              messages: [
                createUserMessage({
                  content: prepareUserContent({
                    inputString: formatRedactedCommandInput(command, args),
                    precedingInputBlocks,
                  }),
                  uuid,
                  origin,
                }),
              ],
              shouldQuery: true,
              command,
            };
          }
          if (!(command.isMcp && command.loadedFrom !== "mcp"))
            skillLoadedSource(command.name, command, "user-slash");
          passRan = true;
          let inputResult = await processUserInput_2(command, stackedSplit, context);
          passRan = context.abortController.signal.aborted;
          if ("blocked" in inputResult) {
            logFeatureBad(featureName, "cmd_hook_blocked");
            return passRan && inputResult.blocked.screened?.dropped !== true
              ? {
                  ...inputResult.blocked,
                  ownPassCutShort: true,
                }
              : inputResult.blocked;
          }
          if (!context.options.isNonInteractiveSession && !modelScheduledOrigin) {
            command.onUserTypedArgs?.(stackedSplit, context);
            if (command.getEffort?.(stackedSplit, context) === undefined) {
              let notice = command.getDefaultEffort?.(stackedSplit, context)?.notice;
              if (notice) noticeMessage = createSystemMessage(notice, "notice");
            }
          }
          if (isForkDispatch) {
            let hookSnapshot = snapshotHookRegistration();
            let trimmed = `/${commandName} ${args}`.trim();
            let promptText =
              getContentText([
                ...precedingInputBlocks,
                {
                  type: "text",
                  text: trimmed,
                },
              ]) ?? trimmed;
            if (!hookExecutors) throw Error("Forked dispatch requires forkDispatchHookExecutors");
            let hookAttachments = [];
            let hookErrors = [];
            for await (let event of hookExecutors.executeUserPromptSubmitHooks(
              promptText,
              getToolPermissionContext(context).mode,
              context,
              promptOriginForHooks({
                promptSource: promptSource ?? "typed",
              }),
            )) {
              if (event.message?.type === "progress") continue;
              if (event.message?.type === "attachment") {
                let attachment = event.message.attachment;
                if ("hookEvent" in attachment && attachment.hookEvent === "UserPromptSubmit") {
                  if (attachment.type === "hook_non_blocking_error")
                    hookErrors.push(attachment.stderr || `Exit code ${attachment.exitCode}`);
                  else if (attachment.type === "hook_error_during_execution")
                    hookErrors.push(attachment.content);
                }
              }
              if (event.blockingError) {
                logFeatureBad(featureName, "cmd_prompt_submit_hook_blocked");
                let userPromptSubmitHookBlockingMessage =
                  hookExecutors.getUserPromptSubmitHookBlockingMessage(event.blockingError);
                let blockedMessage =
                  event.suppressOriginalPrompt === true ||
                  (context.userPromptLine?.isUnknownSinceDispatch() ??
                    hasHookRegistrationChanged(hookSnapshot)) ||
                  hasPromptSubmitHooks({
                    isRunReached: false,
                  })
                    ? userPromptSubmitHookBlockingMessage
                    : `${userPromptSubmitHookBlockingMessage}

Original prompt: ${promptText}`;
                return {
                  messages: [createSystemMessage(blockedMessage, "warning", undefined, true)],
                  shouldQuery: false,
                  resultText: blockedMessage,
                  command,
                  forkDispatched: true,
                  screened: {
                    dropped: true,
                  },
                };
              }
              if (event.preventContinuation) {
                let stopMessage = event.stopReason
                  ? `Operation stopped by hook: ${event.stopReason}`
                  : "Operation stopped by hook";
                logFeatureBad(featureName, "cmd_prompt_submit_hook_stopped");
                return {
                  messages: [
                    createUserMessage({
                      content: stopMessage,
                    }),
                    createSystemMessage(stopMessage, "warning", undefined, true),
                  ],
                  shouldQuery: false,
                  resultText: stopMessage,
                  command,
                  forkDispatched: true,
                  ...(context.abortController.signal.aborted && {
                    ownPassCutShort: true,
                  }),
                };
              }
              if (event.additionalContexts && event.additionalContexts.length > 0)
                hookAttachments.push(
                  createAttachmentMessage({
                    type: "hook_additional_context",
                    content: event.additionalContexts,
                    hookName: "UserPromptSubmit",
                    toolUseID: `hook-${randomUUID()}`,
                    hookEvent: "UserPromptSubmit",
                  }),
                );
            }
            let aborted = context.abortController.signal.aborted;
            if (aborted && context.userPromptLine?.isHeldForOrganization()) {
              logFeatureBad(featureName, "cmd_prompt_aborted");
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
            let forkResult = await executeForkedSlashCommand(
              command,
              stackedSplit,
              {
                ...context,
                userPromptHold: undefined,
                userPromptLine: undefined,
              },
              precedingInputBlocks,
              imageContentBlocks,
              canUseTool ?? evaluateAskingNoHost,
              hookExecutors,
              [...inputResult.hookMessages, ...hookAttachments],
              modelScheduledOrigin,
              uuid,
              classifierTurnHooks,
              origin,
              inlinedImagePaths,
            );
            if (hookErrors.length > 0)
              forkResult.messages.push(
                createSystemMessage(`UserPromptSubmit hook error: ${hookErrors.join("; ")}`, "warning"),
              );
            if (forkResult.aborted) logFeatureBad(featureName, "cmd_prompt_aborted");
            else if (forkResult.threw) logFeatureBad(featureName, "cmd_prompt_threw");
            else {
              logFeatureOk(featureName, tipAttribution);
              if (noticeMessage) forkResult.messages.splice(1, 0, noticeMessage);
            }
            return forkResult;
          }
          let messagesForPromptSlashCommand = await getMessagesForPromptSlashCommand(
            command,
            stackedSplit,
            context,
            precedingInputBlocks,
            imageContentBlocks,
            uuid,
            inputResult.hookMessages,
            modelScheduledOrigin,
            origin,
            ideSelection,
            false,
            false,
            promptSource,
          );
          if (stacked.length > 0 && subcommandArgs !== undefined) {
            let firstMessage = messagesForPromptSlashCommand.messages[0];
            if (firstMessage?.type === "user" && !firstMessage.isMeta)
              firstMessage.stackedOriginalInput = `/${command.name} ${subcommandArgs}`;
          }
          for (let stackedCommand of stacked)
            try {
              let stackedResult = await processUserInput_2(stackedCommand, trailingArgs, context);
              if ("blocked" in stackedResult) {
                messagesForPromptSlashCommand.messages.push(
                  createSystemMessage(
                    `Stacked skill /${sanitizeTelemetryString(stackedCommand.name)} blocked by UserPromptExpansion hook`,
                    "warning",
                  ),
                );
                if (stackedResult.blocked.screened?.dropped === true)
                  messagesForPromptSlashCommand.screened = {
                    dropped: true,
                  };
                continue;
              }
              if (!context.options.isNonInteractiveSession && !modelScheduledOrigin) {
                stackedCommand.onUserTypedArgs?.(trailingArgs, context);
                if (stackedCommand.getEffort?.(trailingArgs, context) === undefined) {
                  let notice = stackedCommand.getDefaultEffort?.(trailingArgs, context)?.notice;
                  if (notice)
                    messagesForPromptSlashCommand.messages.push(createSystemMessage(notice, "notice"));
                }
              }
              claimCommandOverageCredit({
                commandName: stackedCommand.name,
                agentId: context.agentId,
                isNonInteractiveSession: Boolean(context.options.isNonInteractiveSession),
                setAppState: context.setAppState,
                credentials: context.credentials,
              });
              recordSkillInvoked(context.session, stackedCommand.name, context.storageV5);
              if (stackedCommand.pluginInfo) {
                recordPluginUsage(stackedCommand.pluginInfo.repository);
                recordPluginActivity(
                  stackedCommand.pluginInfo.repository,
                  "command",
                  commandActivity(stackedCommand, stackedCommand.pluginInfo.pluginManifest.name),
                );
              }
              if (!(stackedCommand.isMcp && stackedCommand.loadedFrom !== "mcp"))
                skillLoadedSource(stackedCommand.name, stackedCommand, "user-slash");
              let messagesForPromptSlashCommand_2 = await getMessagesForPromptSlashCommand(
                stackedCommand,
                trailingArgs,
                {
                  ...context,
                  messages: [...context.messages, ...messagesForPromptSlashCommand.messages],
                },
                [],
                [],
                undefined,
                stackedResult.hookMessages,
                modelScheduledOrigin,
                origin,
                undefined,
                false,
                false,
                promptSource,
              );
              let stackedFirstMessage = messagesForPromptSlashCommand_2.messages[0];
              if (stackedFirstMessage?.type === "user" && !stackedFirstMessage.isMeta)
                stackedFirstMessage.stackedExpansion = true;
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
                  `Stacked skill /${sanitizeTelemetryString(stackedCommand.name)} failed to load: ${commandThrowTextForTranscript(error, stackedCommand.name, context.session)}`,
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
          if (noticeMessage) messagesForPromptSlashCommand.messages.push(noticeMessage);
          logFeatureOk(featureName, tipAttribution);
          return messagesForPromptSlashCommand;
        } catch (error) {
          if (isAbortError(error)) {
            logFeatureBad(featureName, "cmd_prompt_aborted");
            let abortMessages = [
              createUserMessage({
                content: prepareUserContent({
                  inputString: formatCommandInput(command, args),
                  precedingInputBlocks,
                }),
                uuid,
              }),
            ];
            if (!isSilentAbortReason(context.abortController.signal.reason))
              abortMessages.push(
                createUserInterruptionMessage({
                  toolUse: false,
                  interruptedByShutdown: shutdownInterruptStamp(context.abortController.signal),
                }),
              );
            return {
              messages: abortMessages,
              shouldQuery: false,
              command,
              ...(passRan && {
                ownPassCutShort: true,
              }),
            };
          }
          logFeatureBad(featureName, "cmd_prompt_threw");
          return {
            messages: [
              createUserMessage({
                content: prepareUserContent({
                  inputString: formatCommandInput(command, args),
                  precedingInputBlocks,
                }),
                uuid,
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
      logFeatureBad(featureName, "cmd_malformed");
      return {
        messages: [
          createUserMessage({
            content: prepareUserContent({
              inputString: error.message,
              precedingInputBlocks,
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
function formatCommandInput(command, args) {
  let commandRunInfo = buildCommandRunInfo(command, args);
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
function emptyIfHandled(handled, result) {
  return handled
    ? {
        messages: [],
        shouldQuery: false,
      }
    : result;
}
//@ chunk-3g0djq3w.js:43055-43064 layout
var MAX_STACKED_COMMANDS = 5;
//@ chunk-3g0djq3w.js:43064-43668 layout
function splitStackedCommands(text, commandArgs, commands, shouldSkip) {
  if (commandArgs === undefined && shouldSkip === undefined)
    return {
      stacked: [],
      trailingArgs: text,
      capped: false,
    };
  let stacked = [];
  let remaining = text;
  let remainingArgs = commandArgs;
  let capped = false;
  for (let k = 0; ; k++) {
    let trimmed = remaining.trimStart();
    if (!trimmed.startsWith("/")) break;
    if (k >= MAX_STACKED_COMMANDS) {
      capped = true;
      break;
    }
    let slashCommand = parseSlashCommand(trimmed);
    if (!slashCommand) break;
    let nextArgs = remainingArgs;
    if (remainingArgs !== undefined) {
      let trimmed_2 = remainingArgs.trimStart();
      let parsed = trimmed_2.startsWith("/") ? parseSlashCommand(trimmed_2) : undefined;
      if (!parsed || parsed.commandName !== slashCommand.commandName) break;
      nextArgs = parsed.args;
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
    remaining = slashCommand.args;
    remainingArgs = nextArgs;
    if (shouldSkip?.(command)) continue;
    stacked.push(command);
  }
  return {
    stacked,
    trailingArgs: remaining,
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
function isSkillLoadingMetadata(metadataText, skillName) {
  return metadataText === formatSkillLoadingMetadata(skillName);
}
//@ chunk-3g0djq3w.js:43818-43957 fingerprint (2.1.88 match: formatSlashCommandLoadingMetadata, 1)
function formatSlashCommandLoadingMetadata(commandName, args) {
  return [
    `<${COMMAND_MESSAGE}>${commandName}</${COMMAND_MESSAGE}>`,
    `<${COMMAND_NAME}>/${commandName}</${COMMAND_NAME}>`,
    args ? `<command-args>${args}</command-args>` : null,
  ].filter(Boolean).join(`
`);
}
//@ chunk-3g0djq3w.js:43957-44243 fingerprint (2.1.88 match: formatCommandLoadingMetadata, 0.703)
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
//@ chunk-3g0djq3w.js:45446-45742 facade-exports (2.1.88 match: processPromptSlashCommand, 1)
/**
 * processPromptSlashCommand：只处理 prompt 型命令，展开为消息。
 */
async function processPromptSlashCommand(
  commandName,
  args,
  commands,
  context,
  isPreload = false,
  readOnly = false,
) {
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
    isPreload,
    readOnly,
  );
}
//@ chunk-3g0djq3w.js:45742-50793 fingerprint (2.1.88 match: getMessagesForPromptSlashCommand, 0.431)
/**
 * getMessagesForPromptSlashCommand：prompt 型命令/技能展开为消息（含 MCP prompt、禁止模型调用检查）。
 */
async function getMessagesForPromptSlashCommand(
  command,
  args,
  context,
  precedingInputBlocks = [],
  imageContentBlocks = [],
  uuid,
  hookMessages = [],
  modelScheduledOrigin,
  origin,
  ideSelection,
  isPreload = false,
  readOnly = false,
  promptSource,
) {
  let syncRefusal = await checkCommandSyncedAccess(command);
  if (syncedSkillRefusalReason(command) || isShippedSkillExecutionBlocked(command))
    throw new MalformedCommandError(`Unknown command: ${sanitizeTelemetryString(command.name)}`);
  if (isDefined(syncRefusal)) {
    logSyncedCommandRefused(command, syncRefusal);
    throw new MalformedCommandError(`Unknown command: ${sanitizeTelemetryString(command.name)}`);
  }
  if (isCoordinatorMainThread(context) && !isPreload) {
    let metadata = formatCommandLoadingMetadata(command, args);
    let isMcpHidden = command.isMcp && command.loadedFrom !== "mcp";
    let hiddenFromModel = isHiddenFromModel(command);
    if (command.disableModelInvocation || isMcpHidden || hiddenFromModel) {
      let parts = [
        isMcpHidden
          ? `"/${sanitizeTelemetryString(command.name)}" is an MCP prompt and cannot run in coordinator mode: the coordinator does not load prompt content, and workers cannot invoke MCP prompts via the ${SKILL} tool.`
          : `Skill "/${sanitizeTelemetryString(command.name)}" is user-invocable only (${command.disableModelInvocation ? "disable-model-invocation" : "disabled for model invocation in settings"}) and cannot run in coordinator mode: the coordinator does not load skill content, and workers cannot invoke it via the ${SKILL} tool.`,
      ];
      if (command.description) parts.push(`Description: ${command.description}`);
      let mapped = Object.entries(command.subcommands ?? {})
        .filter(([, value]) => {
          let command = findCommand(value, context.options.commands);
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
          `Note: the subcommands ${mapped.map((subcommandKey) => `"/${sanitizeTelemetryString(command.name)} ${sanitizeTelemetryString(subcommandKey)}"`).join(", ")} route to their own dedicated commands and DO still work when the user types them directly in the terminal (remote-control clients gate some commands separately).`,
        );
      parts.push(`
Do not instruct workers to invoke this via the ${SKILL} tool \u2014 it will be refused. Tell the user that ${mapped.length > 0 ? `/${sanitizeTelemetryString(command.name)} itself (beyond the subcommands above) is` : `the /${sanitizeTelemetryString(command.name)} command is`} unavailable in coordinator mode. If \u2014 and only if \u2014 the underlying task is achievable with the tools workers actually hold, you may brief a worker to do that work directly; do not promise this otherwise.`);
      let coordinatorParts = [
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
            origin,
          }),
          ...markTurnCompanions([
            withCommandTextBlocks(
              createUserMessage({
                content: concatIfAny(imageContentBlocks, precedingInputBlocks, coordinatorParts),
                isMeta: true,
              }),
              precedingInputBlocks,
              coordinatorParts,
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
    let workerParts = [
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
          origin,
        }),
        ...markTurnCompanions([
          withCommandTextBlocks(
            createUserMessage({
              content: concatIfAny(imageContentBlocks, precedingInputBlocks, workerParts),
              isMeta: true,
            }),
            precedingInputBlocks,
            workerParts,
          ),
          ...hookMessages,
        ]),
      ],
      shouldQuery: true,
      disallowedTools: splitRuleList(command.disallowedTools ?? []),
      command,
    };
  }
  let shellHandOff = [];
  let mcpSkillLoaded = [];
  let skillContext = {
    ...context,
    submissionOrigin: origin,
    promptSource,
    promptShellHandOff: shellHandOff,
    mcpSkillLoaded,
    ...((modelScheduledOrigin || isPreload) && {
      options: {
        ...context.options,
        ...(modelScheduledOrigin && {
          modelScheduledOrigin: true,
        }),
        ...(isPreload && {
          isSkillPreload: true,
          readOnlySkillLoad: true,
        }),
      },
    }),
  };
  let promptBlocks = await applySkillPromptHooks(
    command.name,
    await command.getPromptForCommand(args, skillContext),
    command,
  );
  let last = mcpSkillLoaded.at(-1);
  if (command.loadedFrom === "mcp" && last === undefined)
    throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
      `The skill "${sanitizeTelemetryString(command.name)}" was not loaded because of a fault in Claude Code: it has no record of the files that the skill was verified against. Do not try again.`,
      "MCP skill body has no verified entry",
    );
  let armedTools = isPreload ? [] : await armedAllowedToolsOf(command);
  let toolsSyncRefusal =
    !isPreload && (command.hooks !== undefined || armedTools.length > 0)
      ? await checkCommandSyncedAccess(command)
      : undefined;
  let hooksAllowed =
    (!isRestrictedToPluginOnly("hooks") || isSourceAdminTrusted(command.source)) && !isPreload;
  let hooksRefused = command.hooks !== undefined && !hooksAllowed;
  let hooksFitProblem;
  if (toolsSyncRefusal !== undefined) {
    let restrictedParts = {
      hooks: command.hooks !== undefined && hooksAllowed,
      grant: armedTools.length > 0,
    };
    if (restrictedParts.hooks || restrictedParts.grant)
      logSyncedSkillRestricted(sanitizeTelemetryString(command.name), toolsSyncRefusal, restrictedParts);
  } else if (command.hooks && hooksAllowed) {
    let sessionId = getSessionId();
    hooksFitProblem = checkSkillHooksFit(
      context.sessionHooksRegistry,
      sessionId,
      command.source,
      getCommandRepository(command),
      command.name,
      command.hooks,
    );
    if (hooksFitProblem === undefined)
      registerSkillHooks(
        context.sessionHooksRegistry,
        sessionId,
        command.hooks,
        command.name,
        command.type === "prompt" ? command.skillRoot : undefined,
        areCommandHooksHeld(command),
        isRepoFrontmatterHookRestricted(command.source),
        getCommandRepository(command),
      );
  }
  let skillRef = command.source ? `${command.source}:${command.name}` : command.name;
  let joined = promptBlocks.filter((block) => block.type === "text").map((block) => block.text).join(`

`);
  notifySetupGuideLoaded(
    joined,
    "skill",
    context.credentials,
    context.storageV5,
    context.appendSystemMessage,
  );
  let testPattern = slashTestPattern(getBareCommandNameUnlessSynced(command));
  let skipInvocationTracking = isPreload && testPattern !== null;
  if (!skipInvocationTracking)
    addInvokedSkill(command.name, skillRef, joined, context.agentId ?? null, last !== undefined);
  if (testPattern && !isPreload)
    context.applyAttributionOp({
      kind: "recordVerification",
      method: testPattern,
      checkout: await resolveSkillGitRoot(command, getCwdOrNull()),
    });
  context.options.activeSkill = getBareCommandName(command);
  let metadata = formatCommandLoadingMetadata(command, args);
  let allowedTools =
    toolsSyncRefusal !== undefined || hooksFitProblem !== undefined || hooksRefused
      ? []
      : splitRuleList(armedTools);
  let additionalAllowedTools = splitRuleList(command.disallowedTools ?? []);
  if (additionalAllowedTools.length > 0)
    setCommandDenyRules(context.setToolPermissionContext, additionalAllowedTools, "union");
  let promptContent = concatIfAny(imageContentBlocks, precedingInputBlocks, promptBlocks);
  let skillAttachments =
    isSkillShownToModel(command) || isPreload || modelScheduledOrigin || readOnly
      ? []
      : await toArray_2(
          getAttachmentMessages(
            promptBlocks
              .filter((block) => block.type === "text")
              .map((block) => block.text)
              .join(" "),
            context,
            ideSelection ?? null,
            [],
            {
              now: () => new Date().toISOString(),
              uuid: () => randomUUID(),
            },
            context.messages,
            "repl_main_thread",
            {
              planSlugSeed: args,
            },
          ),
        );
  let variantNote = await scopedSkillVariantNote(command, getProjectRootOrNull(), context);
  return {
    messages: [
      createUserMessage({
        content: metadata,
        uuid,
        origin,
      }),
      ...markTurnCompanions([
        withCommandTextBlocks(
          createUserMessage({
            content: promptContent,
            isMeta: true,
            ...(shellHandOff.length > 0 && {
              promptShellHandOff: {
                agentId: context.agentId ?? null,
                commands: shellHandOff,
              },
            }),
            ...(last !== undefined && {
              mcpSkill: {
                ...last,
                name: command.name,
              },
            }),
            ...(isSoftSparkEnabled() &&
              !skipInvocationTracking &&
              context.agentId === undefined &&
              promptContent === promptBlocks && {
                invokedSkill: {
                  name: command.name,
                  path: skillRef,
                },
              }),
          }),
          precedingInputBlocks,
          promptBlocks,
        ),
        ...(variantNote ? [variantNote] : []),
        ...(hooksFitProblem !== undefined || (hooksRefused && !isPreload)
          ? [
              createUserMessage({
                content: wrapInSystemReminder(SKILL_HOOKS_NOT_REGISTERED_TEXT),
                isMeta: true,
              }),
            ]
          : []),
        ...skillAttachments,
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
    effort:
      command.getEffort?.(args, context) ??
      command.getDefaultEffort?.(args, context)?.value ??
      command.effort,
    command,
  };
}
//@ chunk-3g0djq3w.js:50793-50861 affinity
function concatIfAny(leftBlocks, rightBlocks, fallbackBlocks) {
  return leftBlocks.length > 0 || rightBlocks.length > 0
    ? [...leftBlocks, ...rightBlocks, ...fallbackBlocks]
    : fallbackBlocks;
}
//@ chunk-3g0djq3w.js:50861-51001 affinity
function insertMessagesInPlace(context, userMessage, result) {
  context.applyMessageOp({
    type: "insert-after-uuid",
    uuid: userMessage.uuid,
    messages: result.messages,
  });
  return {
    ...result,
    messages: [],
    settledInPlace: true,
  };
}
//@ chunk-3g0djq3w.js:51001-51077 affinity
function markTurnCompanions(messages) {
  return messages.map((message) =>
    message.type === "user"
      ? {
          ...message,
          turnCompanion: true,
        }
      : message,
  );
}
export {
  createAgentStatusEmitter,
  commandThrowTextForTranscript,
  looksLikeCommand,
  isSlashCommandBlockedByEndedByModel,
  formatSkillLoadingMetadata_2,
  SESSION_START_HOOKS_MESSAGE,
  formatSkillLoadingMetadata,
  isSkillLoadingMetadata,
  processPromptSlashCommand,
  processSlashCommand,
};
