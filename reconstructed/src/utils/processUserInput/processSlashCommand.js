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
  kCe,
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
  o7e,
  adoptSubagentPublishArmsAsync,
} from "../../tools/AgentTool/agentToolUtils.js";
import { bN } from "../../services/accountMemory/memoryContext.js";
import {
  isAbortError,
  withTelemetryMessage,
  toError,
  MalformedCommandError,
  AbortError,
  TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS,
} from "../errors.js";
import { escapeXml_2 as escapeXml } from "../confusables.js";
import { bP, forkedSkillLaunchTag } from "../xmlTagText.js";
import { sanitizeTelemetryString } from "../sanitization.js";
import { transportStateByHost, isBridgeOrTransport } from "../../cli/transportState.js";
import {
  writeSubagentProgressToOutputSink,
  runAgent,
  filterIncompleteToolCalls_2,
} from "../../tools/AgentTool/runAgent.js";
import { i2n } from "../model/agentModelRestriction.js";
import { getAssistantMessageContentLength } from "../tokens.js";
import { logError } from "../log.js";
import { zPe } from "../messages/untrustedArtifactContent.js";
import { e6e, D4, ALLOW_BUNDLED_SKILLS } from "../../skills/bundledSkillsGate.js";
import {
  getBundledSkills,
  getRegisteredBundledSkillsIgnoringKillSwitch,
  isShippedSkillExecutionBlocked,
} from "../../skills/bundledSkills.js";
import { xSi, epr } from "../plugins/managedPlugins.js";
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
  vt,
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
  rSt,
} from "../commandPredicates.js";
import { uo } from "../../services/api/deferredToolsState.js";
import {
  takeQueuedCommandWaiter,
  joinCommandRunDispatch,
  interruptedCommandResult,
  dispatchCommandRunHooks,
  h0e,
  MZ,
  B1r,
} from "../../plugins/functionHooks/commandRunDispatch.js";
import { getEffortLevelIfSupported } from "../effort.js";
import { getOriginKindLabel } from "../messages/promptOrigin.js";
import { promptTelemetryFields, promptOriginForHooks } from "../promptSource.js";
import { dCt } from "../../tools/RefreshMcpToolsTool/RefreshMcpToolsTool.js";
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
  qCe,
  LZ,
  gse,
  findRefusedSyncedCommands,
  resolveSkillGitRoot,
} from "../claudeAiSync/syncedSkillAccess.js";
import { withTaskSuffix } from "../../tasks/endedByModel.js";
import { hl } from "../networkPaths.js";
import { getFsImplementation } from "../fsOperations.js";
import { logOrgPolicyDenied } from "../../services/policyLimits/orgPolicyDeniedEvent.js";
import { suggestClosestName, boundedEditDistance } from "../settings/managedEnvKeys.js";
import { isToolDetailsLoggingEnabled, sanitizeVersion } from "../../services/analytics/metadata.js";
import { isPromptHookObserved } from "../telemetry/sessionTracing.js";
import { Zur } from "../abortErrors.js";
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
import { wt, cwr } from "../../remote/remoteMode.js";
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
import { checkSkillHooksFit, yt } from "./_new/checkSkillHooksFit.js";
import { registerSkillHooks } from "../hooks/registerSkillHooks.js";
import { yyt } from "../hooks/registerFrontmatterHooks.js";
import { exe } from "../attributionFileClasses.js";
import { gl } from "../cwd.js";
import { setCommandDenyRules } from "../attachments/skillMentions.js";
import { isSkillShownToModel } from "../../skills/skillSources.js";
import { toArray_2 } from "../generators.js";
import { isSoftSparkEnabled } from "../../services/compact/compactSettings.js";
import { inlineSkillModelOverride } from "../model/model.js";
import { hookedCommands } from "../../plugins/functionHooks/commandHooks.js";
import { sre } from "../../plugins/functionHooks/hooksWorkerHost.js";

//@ chunk-3g0djq3w.js:9865-9925 affinity
var NON_HISTORY_COMMANDS = new Set(["clear", "resume", "help", "exit", "feedback"]);
//@ chunk-3g0djq3w.js:9925-10004 facade-exports = getValueFromInput (1)
function isSlashCommandBlockedByEndedByModel(e, n) {
  if (!n) return !1;
  return !(e && e.type !== "prompt" && NON_HISTORY_COMMANDS.has(e.name));
}
/**
 * fork 命令结束时运行 Stop 钩子：收集系统消息、错误与附加上下文，决定是否需要继续查询；否则运行回合结束反应。
 */
//@ chunk-3g0djq3w.js:10004-11339 layout
async function runForkStopHooks(e, n, o) {
  let messages = [],
    requestQuery = !1,
    T = e.agentId ? void 0 : e.getAppState().activeGoal;
  try {
    let executeStopHooks = o.executeStopHooks(
        getToolPermissionContext(e).mode,
        e.abortController.signal,
        void 0,
        !1,
        e.agentId,
        e,
        [...e.messages, ...n],
        void 0,
        "fork_dispatch",
      ),
      h = [];
    for await (let y of executeStopHooks) {
      if (y.timedOut && T && y.hook?.prompt === T.condition) logFeatureSad("goal_met", "evaluator_timeout");
      if (y.message?.type === "attachment") {
        let attachment = y.message.attachment;
        if ("hookEvent" in attachment && attachment.hookEvent === "Stop") {
          if (attachment.type === "hook_non_blocking_error")
            h.push(attachment.stderr || `Exit code ${attachment.exitCode}`);
          else if (attachment.type === "hook_error_during_execution") h.push(attachment.content);
          else if (attachment.type === "hook_system_message") messages.push(y.message);
        }
      }
      if (y.blockingError)
        (messages.push(createUserMessage({ content: o.getStopHookMessage(y.blockingError), isMeta: !0 })),
          (requestQuery = !0));
      if (y.additionalContexts && y.additionalContexts.length > 0)
        (messages.push(
          createAttachmentMessage({
            type: "hook_additional_context",
            content: y.additionalContexts,
            hookName: "Stop",
            toolUseID: `hook-${randomUUID()}`,
            hookEvent: "Stop",
          }),
        ),
          (requestQuery = !0));
    }
    if (h.length > 0) messages.push(createSystemMessage(`Stop hook error: ${h.join("; ")}`, "warning"));
  } catch (error) {
    logForDebugging(`Forked command Stop hooks failed: ${String(error)}`, { level: "error" });
  }
  if (!requestQuery)
    try {
      let executeStopHooks = o.executeStopHooks(
        getToolPermissionContext(e).mode,
        e.abortController.signal,
        void 0,
        !1,
        e.agentId,
        e,
        [],
        void 0,
        "turn_end_reactions",
      );
      for await (let h of executeStopHooks);
    } catch (error) {
      logForDebugging(`Forked command turn-end reactions failed: ${String(error)}`, { level: "error" });
    }
  return { messages: messages, requestQuery: requestQuery };
}
/**
 * executeForkedSlashCommand：context: fork 的技能在子代理里运行。
 */
//@ chunk-3g0djq3w.js:11339-16950 fingerprint = executeForkedSlashCommand (0.467)
async function executeForkedSlashCommand(e, n, o, u, s, T, p, h = [], y, R, A, B, H) {
  let agentId = makeSaltedName(),
    { sanitizedName: sanitizedName, skillNameHash: skillNameHash } = sanitizeSkillNameForTelemetry({
      rawName: e.name,
      canonicalName: e.name,
      isMcp: e.loadedFrom === "mcp",
      isBuiltIn: builtInCommandNames().has(e.name),
      isBundled: e.source === "bundled",
      isOfficial: isOfficialMarketplaceSkill(e),
    });
  logEvent("tengu_slash_command_forked", {
    command_name: sanitizedName,
    ...skillNameHash,
    _PROTO_skill_name: e.name,
    invocation_trigger: lit("user-slash"),
    ...logSkillsLoaded(e.source, e.loadedFrom, e.kind, e.createdBy),
    ...getTeamTipAttribution(e.source, e.name),
    ...buildServerAttributionFields(e),
  });
  let se = shouldBackgroundForkedSkill(e, o, y),
    pe = se
      ? {
          agentId: agentId,
          parentAgentId: o.agentId,
          depth: getAgentDepth(o.agentContext) + 1,
          agentType: "subagent",
          isAsync: !1,
          isBackgroundAgent:
            o.agentContext && "isBackgroundAgent" in o.agentContext
              ? o.agentContext.isBackgroundAgent
              : void 0,
          ...getWorkflowRunFields(o.agentContext),
        }
      : void 0,
    {
      skillContent: skillContent,
      modifiedGetAppState: modifiedGetAppState,
      contextLayers: contextLayers,
      recordInvocation: recordInvocation,
      baseAgent: baseAgent,
      promptMessages: promptMessages,
      forkReadFileState: forkReadFileState,
      availableTools: availableTools,
      webFetchReadmissionAllowed: webFetchReadmissionAllowed,
      frozenCommandDenies: frozenCommandDenies,
    } = await prepareForkedCommandContext(e, n, o, pe, {
      forkAgentId: agentId,
      extractAttachments: y ? void 0 : getAttachmentMessages,
      replaceCommandRules: !0,
      replaceDenyRules: !y,
      deferInvocationRecording: se,
    }),
    k = contextLayers.length > 0 ? [...(o.permissionLayers ?? []), ...contextLayers] : o.permissionLayers;
  if (s.length > 0 || u.length > 0)
    promptMessages.push(
      withCommandTextBlocks(createUserMessage({ content: [...s, ...u], isMeta: !0 }), u, []),
    );
  if (H && H.length > 0)
    promptMessages.push(createAttachmentMessage({ type: "inlined_image_paths", paths: H }));
  let P = await scopedSkillVariantNote(e, getProjectRoot(), {
    options: {
      tools: resolveAgentTools(
        baseAgent,
        webFetchReadmissionAllowed
          ? withWebFetchToolForAgent(baseAgent, availableTools, getToolPermissionContext(o), {
              activeAgents: o.options.agentDefinitions.activeAgents,
            })
          : availableTools,
        se,
        !1,
        !1,
        0,
        bN(o).mode,
      ).resolvedTools,
      spawnedBySkill: getBareCommandName(e),
    },
    storageV5: o.storageV5,
    session: o.session,
  });
  if (P) promptMessages.push(P);
  promptMessages.push(...h);
  let U = e.getEffort?.(n, o) ?? e.getDefaultEffort?.(n, o)?.value ?? e.effort,
    I = U !== void 0 ? { ...baseAgent, effort: U } : baseAgent,
    commandName = createUserMessage({
      content: prepareUserContent({
        inputString: `/${getCommandName(e)} ${n}`.trim(),
        precedingInputBlocks: s.length > 0 ? [...s, ...u] : u,
      }),
      uuid: R,
      origin: B,
    });
  if (
    (await o.makeFileHistorySnapshot?.(commandName.uuid),
    logForDebugging(`Executing forked slash command /${e.name} with agent ${I.agentType}`),
    se)
  ) {
    A?.markTurnActive(y ? void 0 : `/${getCommandName(e)} ${n}`.trim());
    let re;
    try {
      re = await runForkedAgent({
        agentId: agentId,
        agentDefinition: I,
        command: e,
        description: `/${getCommandName(e)} ${n}`.trim(),
        prompt: skillContent,
        promptMessages: promptMessages,
        context: o,
        canUseTool: T,
        getAppState: modifiedGetAppState,
        permissionLayers: k,
        readFileState: forkReadFileState,
        availableTools: availableTools,
        webFetchReadmissionAllowed: webFetchReadmissionAllowed,
        spawnedBySkill: getBareCommandName(e),
        recordInvocationOnSuccess: recordInvocation,
        frozenCommandDenies: frozenCommandDenies,
      });
    } catch (error) {
      if ((await A?.settleTurnEnd(null), isAbortError(error)))
        return {
          messages: [commandName, createUserInterruptionMessage({ toolUse: !1 })],
          shouldQuery: !1,
          command: e,
          aborted: !0,
          forkDispatched: !0,
        };
      return {
        messages: [
          commandName,
          createUserMessage({
            content: `<local-command-stderr>${escapeXml(commandThrowTextForTranscript(error, e.name, o.session))}</local-command-stderr>`,
            localCommandOutput: "stderr",
          }),
        ],
        shouldQuery: !1,
        command: e,
        threw: !0,
        forkDispatched: !0,
      };
    }
    if (re)
      return (
        await A?.settleTurnEnd(null),
        {
          messages: [
            commandName,
            createCommandInputMessage(
              `<local-command-stdout>Running in the background as @${bP(sanitizeTelemetryString(re.name))}</local-command-stdout>
` +
                forkedSkillLaunchTag({
                  agentId: re.agentId,
                  skillName: e.name,
                  description: `/${getCommandName(e)} ${n}`.trim(),
                }),
            ),
          ],
          shouldQuery: !1,
          command: e,
          forkDispatched: !0,
        }
      );
    recordInvocation();
  }
  let J = [],
    ie = [],
    parentToolUseID = `forked-command-${e.name}`,
    toolUseCounter = 0,
    createProgressMessage = (message) => (
      toolUseCounter++,
      {
        type: "progress",
        data: {
          message: message,
          type: "agent_progress",
          prompt: skillContent,
          agentId: agentId,
          agentType: I.agentType,
          isBuiltIn: I.source === "built-in",
          description: e.description,
        },
        parentToolUseID: parentToolUseID,
        toolUseID: `${parentToolUseID}-${toolUseCounter}`,
        timestamp: new Date().toISOString(),
        uuid: randomUUID(),
      }
    ),
    updateProgress = () => {
      o.emitToolProgress?.({ kind: "agent_progress", toolUseId: parentToolUseID, progressMessages: [...ie] });
    },
    x = transportStateByHost.of(o.session).active !== void 0,
    Me = !1;
  A?.markTurnActive(y ? void 0 : `/${getCommandName(e)} ${n}`.trim());
  let Te = registerForkedSkillTask({
      agentId: agentId,
      parentAgentId: o.agentId,
      spawnDepth: getAgentDepth(o.agentContext) + 1,
      skillName: getCommandName(e),
      prompt: skillContent,
      selectedAgent: I,
      taskRegistry: o.taskRegistry,
      callerAbortController: o.abortController,
    }),
    ke = "failed";
  try {
    if ((updateProgress(), x)) {
      let found = normalizeMessages(promptMessages).find((ee) => ee.type === "user");
      if (found)
        writeSubagentProgressToOutputSink(o, createProgressMessage({ ...found, isMeta: void 0 }), !1);
    }
    for await (let message of runAgent({
      agentDefinition: I,
      promptMessages: promptMessages,
      turnPrompt: skillContent,
      onModelRestricted: i2n(getBareCommandName(e), o.onQueryEvent),
      toolUseContext: { ...o, getAppState: modifiedGetAppState, permissionLayers: k },
      canUseTool: T,
      isAsync: !1,
      querySource: "agent:custom",
      spawnedBySkill: getBareCommandName(e),
      spawnedByForkedSkill: !0,
      model: e.model,
      availableTools: availableTools,
      webFetchReadmissionAllowed: webFetchReadmissionAllowed,
      override: {
        shareFileHistory: !0,
        agentId: agentId,
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
      if ((J.push(message), extractAgentIdsFromMessages_2(message))) {
        if (x && filterIncompleteToolCalls_2(o, message)) writeSubagentProgressToOutputSink(o, message, !1);
        continue;
      }
      let normalizedNew = normalizeMessages([message]);
      if (message.type === "assistant") {
        let contentLength = getAssistantMessageContentLength(message);
        if (contentLength > 0) o.onQueryEvent?.({ type: "response_length", op: "add", delta: contentLength });
        let ve = normalizedNew[0];
        if (ve && ve.type === "assistant") {
          let Ae = createProgressMessage(message);
          if ((ie.push(Ae), updateProgress(), (Me = !0), x)) writeSubagentProgressToOutputSink(o, Ae, !0);
        }
      }
      if (message.type === "user") {
        let be = normalizedNew[0];
        if (be && be.type === "user") {
          let ve = createProgressMessage(be);
          if ((ie.push(ve), updateProgress(), x && !(be.isMeta && !Me))) {
            writeSubagentProgressToOutputSink(o, ve, !0);
            for (let Ae of normalizedNew.slice(1))
              if (Ae.type === "user") writeSubagentProgressToOutputSink(o, createProgressMessage(Ae), !0);
          }
        }
      }
    }
    let re = o7e(getLastAssistantMessage(J));
    if (!re) adoptSubagentPublishArmsAsync(agentId, o);
    ke = re ? "failed" : "completed";
  } catch (error) {
    if (isAbortError(error))
      return (
        await A?.settleTurnEnd(null),
        {
          messages: [commandName, createUserInterruptionMessage({ toolUse: !1 })],
          shouldQuery: !1,
          command: e,
          aborted: !0,
          forkDispatched: !0,
        }
      );
    await A?.settleTurnEnd(null);
    let q = await runForkStopHooks(o, J, p);
    return {
      messages: [
        commandName,
        createUserMessage({
          content: `<local-command-stderr>${escapeXml(commandThrowTextForTranscript(error, e.name, o.session))}</local-command-stderr>`,
          localCommandOutput: "stderr",
        }),
        ...q.messages,
      ],
      shouldQuery: q.requestQuery,
      command: e,
      threw: !0,
      forkDispatched: !0,
    };
  } finally {
    (Te.remove(ke),
      clearInvokedSkillsForAgent(agentId),
      o.emitToolProgress?.({ kind: "clear", toolUseId: parentToolUseID }));
  }
  let resultText = extractResultText(J, "Command completed");
  try {
    resultText = e.formatForegroundForkResult?.(resultText) ?? resultText;
  } catch (error) {
    logError(withTelemetryMessage(toError(error), "fork result formatter threw"));
  }
  let ye = zPe(J) + resultText;
  (logForDebugging(`Forked slash command /${e.name} completed with agent ${agentId}`),
    await A?.settleTurnEnd(J));
  let Ce = await runForkStopHooks(o, J, p);
  return {
    messages: [
      commandName,
      createCommandInputMessage(`<local-command-stdout>${bP(ye)}</local-command-stdout>`),
      ...Ce.messages,
    ],
    shouldQuery: Ce.requestQuery,
    command: e,
    resultText: ye,
    forkDispatched: !0,
  };
}
//@ chunk-3g0djq3w.js:16950-17085 layout
var COMMAND_POLICY_GATES = {
  "remote-control": "allow_remote_control",
  ultraplan: "allow_remote_sessions",
  "claude-in-chrome": "allow_claude_browser_extension",
};
//@ chunk-3g0djq3w.js:17085-17842 layout
function resolveCommandPolicyGate(e, n, { interactive: interactive }) {
  let u = getBuiltinCommands(),
    s = e6e(),
    T = getBundledSkills(),
    p = s ? getRegisteredBundledSkillsIgnoringKillSwitch() : T,
    h = s ? xSi() : epr(),
    y = [n, u, p, h],
    R,
    A;
  for (let Z of y) {
    let se = findCommand(e, Z);
    if (!se) continue;
    let pe = Z === u || Z === p,
      oe = se.policyGate?.policy ?? (pe ? COMMAND_POLICY_GATES[se.name] : void 0);
    if (
      s &&
      D4(se.name) &&
      (Z === p ? findCommand(e, T) === void 0 : Z === h) &&
      (oe === void 0 || isPolicyAllowed(oe))
    )
      oe = ALLOW_BUNDLED_SKILLS;
    if (oe) {
      ((R = se), (A = oe));
      break;
    }
  }
  if (!R || !A) return;
  if (!meetsAvailabilityRequirement(R)) return;
  if (isPolicyAllowed(A)) {
    if (interactive && !getDisableSlashCommands() && isCommandEnabled(R) && findCommand(e, n) === void 0)
      return { command: R, policy: A, reason: commandEnabledAfterStartMessage(R.name), kind: "stale_list" };
    return;
  }
  let B = policyDenyKind(A);
  if (!interactive) {
    if (commandSurfaceNotice(e, getBuiltinCommands()) !== void 0) return;
    if (
      B !== "org_denied" &&
      getNonInteractiveCommands(y.flatMap((Z) => Z.filter((se) => hasCommand(e, [se])))).length === 0
    )
      return;
  }
  let { featureLabel: featureLabel, verb: verb } = policyKeyLabel(A),
    j =
      B === "cache_miss" ? couldNotVerifyPolicyFor(featureLabel) : policyDeniedReason(A, featureLabel, verb);
  if (j === null || B === null) return;
  return { command: R, policy: A, reason: j, kind: B };
}
/**
 * 字符串是否像命令名（字母数字开头，可含 : _ -）。
 */
//@ chunk-3g0djq3w.js:17842-17904 facade-exports
function looksLikeCommand(commandName) {
  return /^[a-zA-Z0-9_][a-zA-Z0-9:_-]*$/.test(commandName);
}
/**
 * 命令执行抛错时写入会话记录的文本（中断/命令错误/其他）。
 */
//@ chunk-3g0djq3w.js:17904-18263 facade-exports
function commandThrowTextForTranscript(e, n, o) {
  let u = uo(n, 200),
    s = sanitizeTelemetryString(n);
  if (isAbortError(e)) {
    if (isBridgeOrTransport(o)) return (logForDebugging(`${s} aborted: ${String(e)}`), "Interrupted");
    return bP(e instanceof Error ? e.message || "Interrupted" : "Interrupted");
  }
  if (e instanceof MalformedCommandError) return bP(e.message);
  if (isBridgeOrTransport(o))
    return (
      logForDebugging(`${s} threw: ${String(e)}`, { level: "error" }),
      `${u} failed (detail withheld on this connection)`
    );
  return bP(String(e));
}
/**
 * processSlashCommand：解析 /命令 参数、查找命令、策略检查，分派到本地命令、prompt 命令（技能）或 fork 子代理执行。
 */
//@ chunk-3g0djq3w.js:18263-28569 facade-exports = processSlashCommand (0.357)
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
  oe,
  r,
  L,
  ce,
  E,
  O,
) {
  using parsed = takeQueuedCommandWaiter(T ?? s.deferredSlashUuid);
  using Q = joinCommandRunDispatch(T);
  function W(w = [], Y = e, he = !1) {
    let Pe = randomUUID(),
      fe = kCe(n) ? void 0 : Pe;
    if (fe !== void 0) setPromptId(fe);
    let Fe = getEffortLevelIfSupported(
      s.options.mainLoopModel,
      getEffortValue(s),
      getEffortLayerOverride(s.permissionLayers),
    );
    logEvent("tengu_input_prompt", {
      ...(y && { prompt_source: fromEnum(y) }),
      ...(Fe && { effort_level: fromEnum(Fe) }),
      turn_origin: fromEnum(getOriginKindLabel(j)),
      ...promptTelemetryFields({ wakeupSource: r, hostInitiator: L, inboundOrigin: E }),
      ...dCt(),
    });
    let He = T || randomUUID();
    logSlashPromptEvent(
      { text: Y, attributes: { ...(fe && { "prompt.id": fe }), "message.uuid": He } },
      s.userPromptHold,
    );
    let we = createUserMessage({
        content: prepareUserContent({ inputString: Y, precedingInputBlocks: n }),
        uuid: He,
        permissionMode: oe,
        isMeta: pe || void 0,
        promptSource: y,
        promptId: fe,
        origin: j,
      }),
      Le = cloneContent(we.message.content);
    if (j) wrapNonUserMessage(we, j);
    return {
      messages: [we, ...u, ...w.map((Be) => createAttachmentMessage(Be))],
      shouldQuery: !0,
      ...(Y === e && { promptRow: { message: we, unframed: Le } }),
      ...(he && { extractPromptAttachments: !0 }),
    };
  }
  let M = parseSlashCommand(e);
  if (!M) {
    if ((logEvent("tengu_input_slash_missing", {}), s.options.isNonInteractiveSession)) return W();
    logFeatureBad("cmd_dispatch", "cmd_parse_failed");
    let errorMessage = "Commands are in the form `/command [args]`";
    return {
      messages: [
        createSyntheticUserCaveatMessage(),
        ...u,
        createUserMessage({
          content: prepareUserContent({ inputString: errorMessage, precedingInputBlocks: n }),
        }),
      ],
      shouldQuery: !1,
      resultText: errorMessage,
    };
  }
  let { commandName: commandName, args: parsedArgs } = M,
    { isMcp: isMcp } = M,
    I;
  if (B !== void 0) {
    let w = parseSlashCommand(B);
    I = w && w.commandName === M.commandName ? w.args : void 0;
  }
  let S = findCommand(commandName, s.options.commands);
  if (S && !isCommandEnabled(S)) S = void 0;
  if (!S && !isMcp && parsedArgs.trim()) {
    let trimStart = parsedArgs.trimStart(),
      search = trimStart.search(/\s/),
      he = search === -1 ? trimStart : trimStart.slice(0, search),
      unknownMessage = `${commandName}:${he}`,
      fe = findCommand(unknownMessage, s.options.commands);
    if (fe)
      ((S = fe),
        (commandName = unknownMessage),
        (parsedArgs = search === -1 ? "" : trimStart.slice(search + 1).trimStart()));
  }
  if (!S && !isMcp && !getDisableSlashCommands()) {
    let w = await findCommandAfterHooks(commandName, parsed.origin === void 0, s.abortController.signal);
    if (!w && s.abortController.signal.aborted) {
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
        marker: createUserInterruptionMessage({ toolUse: !1 }),
        isQueuedByPlugin: parsed.origin !== void 0,
      });
    }
    if (w) ((S = w), (s = { ...s, options: { ...s.options, commands: [...s.options.commands, w] } }));
  }
  let J, ie;
  if (S && !isSkillOff(S)) {
    let w = matchSubcommand(S, parsedArgs);
    if (w) {
      let Y = findCommand(w.targetName, s.options.commands);
      if (Y && isCommandEnabled(Y))
        ((ie = `${commandName} ${w.consumedToken}`),
          (S = Y),
          (commandName = w.targetName),
          (parsedArgs = w.remainingArgs));
      else if (S.name === CODE_REVIEW) {
        let promptId = ultrareviewAuthPrecondition();
        if (promptId) J = createSystemMessage(`${promptId} Running a local review instead.`, "warning");
      }
    }
  }
  if (S && O && !isSkillOff(S)) {
    let w = await O(S, commandName, parsedArgs);
    if (w) return emptyIfHandled(parsed.origin !== void 0, w);
  }
  let de = S ? await checkCommandSyncedAccess(S) : void 0;
  if (S && qCe(S)) S = void 0;
  if (S && isShippedSkillExecutionBlocked(S)) S = void 0;
  if (S && LZ(de)) (gse(S, de), (S = void 0));
  let G = builtInCommandNames().has(commandName);
  if (isSlashCommandBlockedByEndedByModel(S, s.getAppState().endedByModel)) {
    let w = withTaskSuffix("Claude ended this conversation. Start a new session (or /clear) to continue.");
    return emptyIfHandled(parsed.origin !== void 0, {
      messages: [createSystemMessage(w, "warning")],
      shouldQuery: !1,
      resultText: w,
    });
  }
  let me = S?.type === "prompt" && S.source === "bundled",
    te = S?.type === "prompt" && isOfficialMarketplaceSkill(S),
    x = isMcp || (S?.type === "prompt" && S.source === "mcp");
  if (!S) {
    if (!looksLikeCommand(commandName)) return W();
    let w = `/${commandName}`,
      Y = !1;
    if (!isDiskless() && !hl(w))
      try {
        (await getFsImplementation().stat(w), (Y = !0));
      } catch {}
    if (!Y) {
      let he = resolveCommandPolicyGate(commandName, s.options.commands, {
        interactive: !s.options.isNonInteractiveSession,
      });
      if (he) {
        let { command: command, policy: policy, reason: reason, kind: kind } = he;
        if (
          (logEvent("tengu_input_slash_invalid", {
            input_length: commandName.length,
            had_suggestion: !1,
            policy_denied: kind !== "stale_list",
          }),
          logFeatureBad("cmd_dispatch", kind === "stale_list" ? "cmd_stale_list" : `cmd_policy_${kind}`),
          kind !== "stale_list")
        )
          logOrgPolicyDenied(policy, "slash_command");
        let isOfficial = bP(sanitizeTelemetryString(commandName)),
          Qe = !parsedArgs
            ? ""
            : hasSensitiveArgs(command, parsedArgs)
              ? "***"
              : bP(redactSecrets(parsedArgs));
        if (s.options.isNonInteractiveSession)
          return emptyIfHandled(parsed.origin !== void 0, {
            messages: [
              ...u,
              createCommandInputMessage(`/${isOfficial}${Qe ? ` ${Qe}` : ""}`, { submitUuid: T }),
              createCommandInputMessage(`<local-command-stdout>${reason}</local-command-stdout>`),
            ],
            shouldQuery: !1,
            resultText: reason,
          });
        return emptyIfHandled(parsed.origin !== void 0, {
          messages: [
            ...u,
            createSystemMessage(reason, "warning"),
            ...(Qe && Qe !== "***"
              ? [createSystemMessage(`Args from /${isOfficial}: ${Qe}`, "warning")]
              : []),
          ],
          shouldQuery: !1,
          resultText: reason,
        });
      }
      if (s.options.isNonInteractiveSession && builtInCommandNames().has(commandName)) {
        let ne = getBuiltinCommands(),
          Ve =
            commandSurfaceNotice(commandName, ne) ??
            `/${bP(sanitizeTelemetryString(commandName))} isn't available in this environment.`;
        (logEvent("tengu_input_slash_invalid", { input_length: commandName.length, had_suggestion: !1 }),
          logFeatureBad("cmd_dispatch", "cmd_unavailable_headless"));
        let Ee = findCommand(commandName, ne),
          $e = !parsedArgs
            ? ""
            : Ee !== void 0 && hasSensitiveArgs(Ee, parsedArgs)
              ? "***"
              : bP(redactSecrets(parsedArgs));
        return emptyIfHandled(parsed.origin !== void 0, {
          messages: [
            ...u,
            createCommandInputMessage(`/${bP(sanitizeTelemetryString(commandName))}${$e ? ` ${$e}` : ""}`, {
              submitUuid: T,
            }),
            createCommandInputMessage(`<local-command-stdout>${Ve}</local-command-stdout>`, {
              commandOutcome: { kind: "unavailable_headless" },
            }),
          ],
          shouldQuery: !1,
          resultText: Ve,
        });
      }
      let Pe = await findRefusedSyncedCommands(s.options.commands),
        filtered = s.options.commands.filter(
          (command) =>
            !command.isHidden &&
            !isSkillOff(command) &&
            isCommandEnabled(command) &&
            !(isSyncedSkill(command) && getSkillsSyncVetoed()) &&
            !isKilledHostCatalogSkill(command) &&
            !Pe.has(command),
        ),
        Fe = parsed.origin === void 0 && vt(s.options.isNonInteractiveSession),
        He = Fe ? filtered.filter((ne) => ne.type === "prompt" && !ne.disableModelInvocation) : filtered,
        we = suggestClosestName(
          commandName,
          He.map((ne) => ({ name: getCommandName(ne), aliases: ne.aliases })),
          { maxEditDistance: 2 },
        );
      if (
        (logEvent("tengu_input_slash_invalid", {
          input_length: commandName.length,
          had_suggestion: Boolean(we),
          suggestion_distance: we ? boundedEditDistance(commandName, we, 2) : void 0,
          fallback_to_model: Fe,
        }),
        Fe)
      )
        return (
          logFeatureSad("cmd_dispatch", "cmd_unknown_model_fallback"),
          W(
            [
              unknownCommandFallback({
                commandName: commandName,
                suggestion: we,
                availableCommandNames: He.map((ne) => getCommandName(ne)),
                availableCommandCount: filtered.length,
              }),
            ],
            containsSecret(e) ? redactSecrets(e) : e,
            !0,
          )
        );
      logFeatureBad("cmd_dispatch", "cmd_unknown");
      let Le = uo(commandName, 200),
        Be = we ? uo(we, 200) : void 0,
        Ke = we ? `Unknown command: /${Le}. Did you mean /${Be}?` : `Unknown command: /${Le}`;
      if (s.options.isNonInteractiveSession)
        return emptyIfHandled(parsed.origin !== void 0, {
          messages: [
            ...u,
            createCommandInputMessage(`/${Le}${parsedArgs ? ` ${bP(redactSecrets(parsedArgs))}` : ""}`, {
              submitUuid: T,
            }),
            createCommandInputMessage(`<local-command-stdout>${Ke}</local-command-stdout>`, {
              commandOutcome: { kind: "unknown", ...(Be !== void 0 && { suggestion: Be }) },
            }),
          ],
          shouldQuery: !1,
          resultText: Ke,
        });
      return emptyIfHandled(parsed.origin !== void 0, {
        messages: [
          ...u,
          createSystemMessage(Ke, "warning"),
          ...(parsedArgs
            ? [createSystemMessage(`Args from unknown skill: ${redactSecrets(parsedArgs)}`, "warning")]
            : []),
        ],
        shouldQuery: !1,
        resultText: Ke,
      });
    }
    return W();
  }
  let Me =
      x || S.loadedFrom === "mcp"
        ? "mcp"
        : G || (S.type === "prompt" && (S.source === "bundled" || S.source === "builtin"))
          ? "builtin"
          : "custom",
    Te = hasSensitiveArgs(S, parsedArgs) ? `/${commandName} ***` : e,
    ke = s.deferSlashToEngine?.(S) ?? !1;
  if (!ke) {
    let w = randomUUID();
    setPromptId(w);
    let Y = {
      text: Te,
      attributes: {
        "prompt.id": w,
        command_name: Me === "builtin" || isToolDetailsLoggingEnabled() ? commandName : Me,
        command_source: Me,
      },
    };
    logSlashPromptEvent(Y, s.userPromptHold);
  }
  if (S.type !== "prompt" && s.userPromptHold !== void 0) s.userPromptLine?.withheld();
  let ue = S,
    isOfficial = getCommandName(ue),
    Ce = parsedArgs,
    Se = new Map(),
    re = 0,
    q = async (w) => {
      ((re += 1), (Ce = w), s.userPromptLine?.ranAs({ name: isOfficial, args: parsedArgs, argsRanWith: w }));
      let Y = ke && isPromptHookObserved();
      if (ue.type !== "prompt" && !Y) s.userPromptLine?.passed();
      let he = await getMessagesForSlashCommand(
        commandName,
        w,
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
            let fe = Se.get(w) ?? ce({ name: isOfficial, args: parsedArgs, argsRanWith: w });
            return (Se.set(w, fe), hasProceedsOutcome(await fe));
          }),
      );
      if (he.ownPassCutShort) re -= 1;
      let Pe = await Se.get(w);
      return Pe === void 0 ? he : { ...he, lineCheck: Pe };
    };
  if (ke) parsed.handOn(s.abortController.signal);
  let ee = ke
      ? { kind: "engine", ran: await q(parsedArgs) }
      : await Zur(
          dispatchCommandRunHooks({
            input: {
              command: isOfficial,
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
            ahead: Q,
            signal: s.abortController.signal,
          }),
          s.abortController.signal,
        ),
    be = ee === void 0 ? await Promise.all(Se.values()) : [],
    ve = be.some(hasProceedsOutcome) ? void 0 : be.at(-1),
    Ae = (w) =>
      createUserMessage({
        content: prepareUserContent({
          inputString: formatRedactedCommandInput(ue, w),
          precedingInputBlocks: n,
        }),
        uuid: T,
        origin: j,
      });
  if (ve !== void 0)
    return { messages: [Ae(ve.ran.argsRanWith)], shouldQuery: !0, ranCommand: ve.ran, lineCheck: ve };
  if (ee === void 0) {
    let w = s.userPromptLine?.isHeldForOrganization() ? void 0 : be.findLast(hasProceedsOutcome);
    return {
      ...interruptedCommandResult({
        signal: s.abortController.signal,
        typed: [...u, Ae(parsedArgs)],
        marker: createUserInterruptionMessage({ toolUse: !1 }),
        isQueuedByPlugin: parsed.origin !== void 0,
      }),
      ...(re === 0 && { ownPassCutShort: !0 }),
      ...(w !== void 0 && { ranCommand: w.ran, lineCheck: w }),
    };
  }
  let Xe =
      ee.kind !== "engine" &&
      (!hasSingleCommandRunHook(getCommandName(ue)) || (s.userPromptLine?.isUnknownSinceDispatch() ?? !1)),
    Lt = Xe ? "" : parsedArgs,
    Bt =
      ee.kind === "answered" &&
      ee.text !== void 0 &&
      !Xe &&
      (ee.exitCode ?? 0) === 0 &&
      isHumanOrAutoContinuation(j)
        ? modCommandFollowUpNote(isOfficial, s.agentId)
        : void 0;
  if (Xe) s.userPromptLine?.withheld();
  else if (ee.kind !== "engine" && ue.type !== "prompt") s.userPromptLine?.passed();
  let {
    messages: messages,
    shouldQuery: shouldQuery,
    allowedTools: allowedTools,
    disallowedTools: disallowedTools,
    model: model,
    effort: effort,
    command: command,
    resultText: resultText,
    nextInput: nextInput,
    submitNextInput: submitNextInput,
    engineDeferredSlash: engineDeferredSlash,
    forkDispatched: forkDispatched,
    settledInPlace: settledInPlace,
    screened: screened,
    ownPassCutShort: ownPassCutShort,
    lineCheck: lineCheck,
    queriesAfterRun: queriesAfterRun,
  } = ee.kind === "engine"
    ? ee.ran
    : runLocalCommand(ee.text, ee.context, {
        plugin: ee.plugin,
        command: ue,
        commandName: commandName,
        args: Lt,
        precedingInputBlocks: n,
        uuid: T,
        submissionOrigin: j,
        isNonInteractiveSession: s.options.isNonInteractiveSession === !0,
        offerTurn: Bt,
      });
  if (command.type === "prompt" && command.pluginInfo)
    recordPluginActivity(
      command.pluginInfo.repository,
      "command",
      commandActivity(command, command.pluginInfo.pluginManifest.name),
    );
  let { sanitizedName: sanitizedName, skillNameHash: skillNameHash } = sanitizeSkillNameForTelemetry({
    rawName: commandName,
    canonicalName: command.name,
    isMcp: x || command.loadedFrom === "mcp",
    isBuiltIn: G,
    isBundled: me,
    isOfficial: te,
  });
  function gt() {
    let w = { input: sanitizedName, ...skillNameHash };
    if (command.type === "prompt" && command.pluginInfo) {
      Object.assign(w, getSkillPluginTelemetryFields(command));
      let version = command.pluginInfo.pluginManifest.version;
      if (version && isOfficialMarketplaceSkill(command)) w.plugin_version = sanitizeVersion(version);
    }
    if (command.type === "prompt") Object.assign(w, buildServerAttributionFields(command));
    logEvent("tengu_input_command", {
      ...w,
      invocation_trigger: lit("user-slash"),
      ...promptTelemetryFields({ wakeupSource: r, hostInitiator: L, inboundOrigin: E }),
      ...logSkillsLoaded(
        command.type === "prompt" ? command.source : void 0,
        command.loadedFrom,
        command.kind,
        command.type === "prompt" ? command.createdBy : void 0,
      ),
      ...getTeamTipAttribution(command.type === "prompt" ? command.source : void 0, commandName),
      ...(command.type === "prompt" && { command_content_chars: command.contentLength }),
      ...(command.type === "prompt" && { _PROTO_skill_name: command.name }),
      ...!1,
    });
  }
  if (messages.length === 0) {
    if (settledInPlace) logFeatureOk("cmd_dispatch");
    return (
      gt(),
      {
        messages: [],
        shouldQuery: !1,
        model: model,
        resultText: resultText,
        nextInput: nextInput,
        submitNextInput: submitNextInput,
        localCommand: sanitizedName,
        ...(ee.exitCode !== void 0 && { commandExitCode: ee.exitCode }),
      }
    );
  }
  if (
    messages.length === 2 &&
    messages[1].type === "user" &&
    typeof messages[1].message.content === "string" &&
    messages[1].message.content.startsWith("Unknown command:")
  ) {
    if (!(e.startsWith("/var") || e.startsWith("/tmp") || e.startsWith("/private")))
      (logEvent("tengu_input_slash_invalid", { input_length: commandName.length, had_suggestion: !1 }),
        logFeatureBad("cmd_dispatch", "cmd_unknown"));
    return {
      messages: [createSyntheticUserCaveatMessage(), ...messages],
      shouldQuery: shouldQuery,
      allowedTools: allowedTools,
      disallowedTools: disallowedTools,
      model: model,
      ranCommand: { name: isOfficial, args: parsedArgs, argsRanWith: Ce },
    };
  }
  if (!engineDeferredSlash) (logFeatureOk("cmd_dispatch"), gt());
  let Vt = messages.length > 0 && messages[0] && isCompactBoundaryMessage(messages[0]),
    ht =
      shouldQuery ||
      messages.every(
        (w) =>
          isSystemLocalCommandMessage(w) ||
          (w.type === "system" && w.subtype === "informational") ||
          (w.type === "user" && w.isMeta),
      ) ||
      Vt ||
      engineDeferredSlash
        ? messages
        : [createSyntheticUserCaveatMessage(), ...messages];
  return {
    messages: J && shouldQuery && (lineCheck === void 0 || hasProceedsOutcome(lineCheck)) ? [...ht, J] : ht,
    shouldQuery: shouldQuery,
    allowedTools: allowedTools,
    disallowedTools: disallowedTools,
    model: model,
    effort: effort,
    resultText: resultText,
    nextInput: nextInput,
    submitNextInput: submitNextInput,
    engineDeferredSlash: engineDeferredSlash,
    forkDispatched: forkDispatched,
    ...(screened !== void 0 && { screened: screened }),
    ...(ownPassCutShort && { ownPassCutShort: ownPassCutShort }),
    ...(queriesAfterRun && { queriesAfterRun: queriesAfterRun }),
    ...(!engineDeferredSlash && { localCommand: sanitizedName }),
    ...(ee.exitCode !== void 0 && { commandExitCode: ee.exitCode }),
    ranCommand: lineCheck?.ran ?? { name: isOfficial, args: parsedArgs, argsRanWith: Ce },
    ...(lineCheck !== void 0 && { lineCheck: lineCheck }),
  };
}
//@ chunk-3g0djq3w.js:28569-28620 layout
function hasProceedsOutcome(e) {
  return e.outcome?.proceeds !== void 0;
}
//@ chunk-3g0djq3w.js:28620-29342 layout
function runLocalCommand(
  e,
  n,
  {
    plugin: plugin,
    command: command,
    commandName: commandName,
    args: args,
    precedingInputBlocks: precedingInputBlocks,
    uuid: uuid,
    submissionOrigin: submissionOrigin,
    isNonInteractiveSession: isNonInteractiveSession,
    offerTurn: offerTurn,
  },
) {
  let B = cmdFeature(shippedCommandNames().has(commandName) ? commandName : "custom");
  logFeatureOk(B, getTipAttribution(command.name));
  let H =
      isNonInteractiveSession ||
      precedingInputBlocks.length > 0 ||
      !isHumanOrAutoContinuation(submissionOrigin),
    D = n ?? [];
  if (e === void 0 && D.length === 0 && !H) return { messages: [], shouldQuery: !1, command: command };
  return {
    messages: [
      H
        ? createUserMessage({
            content: prepareUserContent({
              inputString: formatCommandInput(command, args),
              precedingInputBlocks: precedingInputBlocks,
            }),
            uuid: uuid,
            origin: submissionOrigin,
          })
        : createCommandInputMessage(formatCommandInput(command, args)),
      ...(e === void 0
        ? []
        : [
            createCommandInputMessage(`<local-command-stdout>${bP(e)}</local-command-stdout>`, {
              commandRun: buildCommandRunInfo(command, args, plugin),
            }),
          ]),
      ...D.map((Z) => createUserMessage({ content: Z, isMeta: !0 })),
      ...(offerTurn === void 0 ? [] : [createUserMessage({ content: offerTurn, isMeta: !0 })]),
    ],
    shouldQuery: offerTurn !== void 0,
    command: command,
    resultText: e,
    ...(D.length > 0 && { metaTexts: D }),
    ...(offerTurn !== void 0 && { queriesAfterRun: !0 }),
  };
}
//@ chunk-3g0djq3w.js:29342-30427 layout
function attachCommandResultText(e, { text: text, plugin: plugin, context: context }) {
  if (e.shouldQuery || e.nextInput !== void 0 || e.settledInPlace) return;
  let messages = e.messages;
  if (text !== void 0) {
    let T =
      e.resultText === void 0
        ? -1
        : messages.findIndex(
            (y) =>
              isSystemLocalCommandMessage(y) &&
              (y.content.startsWith(`<${LOCAL_COMMAND_STDOUT}>`) ||
                y.content.startsWith(`<${LOCAL_COMMAND_STDERR}>`)),
          );
    if (T === -1) return;
    let p = messages[T],
      h =
        p !== void 0 && isSystemLocalCommandMessage(p) && p.content.startsWith(`<${LOCAL_COMMAND_STDERR}>`)
          ? LOCAL_COMMAND_STDERR
          : LOCAL_COMMAND_STDOUT;
    messages = messages.with(
      T,
      createCommandInputMessage(
        `<${h}>${bP(text)}</${h}>`,
        p !== void 0 && isSystemLocalCommandMessage(p)
          ? {
              commandRun:
                p.commandRun !== void 0 && plugin !== void 0
                  ? { ...p.commandRun, plugin: plugin }
                  : p.commandRun,
              commandOutcome: p.commandOutcome,
            }
          : void 0,
      ),
    );
  }
  if (context !== void 0) {
    if (!(
      e.metaTexts !== void 0 ||
      messages.some(
        (h) =>
          isSystemLocalCommandMessage(h) &&
          (h.content.startsWith(`<${LOCAL_COMMAND_STDOUT}>`) ||
            h.content.startsWith(`<${LOCAL_COMMAND_STDERR}>`)),
      )
    ))
      return;
    let p = new Map();
    for (let h of e.metaTexts ?? []) p.set(h, (p.get(h) ?? 0) + 1);
    messages = [
      ...messages.filter((h) => {
        let y =
            h.type === "user" && h.isMeta && typeof h.message.content === "string"
              ? h.message.content
              : void 0,
          R = y === void 0 ? 0 : (p.get(y) ?? 0);
        if (y === void 0 || R === 0) return !0;
        return (p.set(y, R - 1), !1);
      }),
      ...context.map((h) => createUserMessage({ content: h, isMeta: !0 })),
    ];
  }
  return {
    ...e,
    messages: messages,
    resultText: text ?? e.resultText,
    ...((context ?? e.metaTexts) !== void 0 && { metaTexts: context ?? e.metaTexts }),
  };
}
//@ chunk-3g0djq3w.js:30427-30765 layout
function headlessUnavailableResult(e, n, o) {
  let u = `/${getCommandName(e)} opens an interactive panel and isn't available in this environment. Run it from the Claude Code terminal instead.`;
  return {
    messages: [
      createCommandInputMessage(formatRedactedCommandInput(e, n), { submitUuid: o }),
      createCommandInputMessage(`<local-command-stdout>${u}</local-command-stdout>`, {
        commandOutcome: { kind: "unavailable_headless" },
      }),
    ],
    shouldQuery: !1,
    command: e,
    resultText: u,
  };
}
/**
 * getMessagesForSlashCommand：执行具体斜杠命令并生成消息（local-jsx、local、prompt 三类）。
 */
//@ chunk-3g0djq3w.js:30765-42876 callgraph-witnessed = getMessagesForSlashCommand (0.288)
async function getMessagesForSlashCommand(e, n, o, u, s, T, p, h, y, R, A, B, H, D, j, Z, se, pe, oe) {
  let command = getCommand(e, o.options.commands);
  n = unwrapPastedContentBlocks(n);
  let L = cmdFeature(shippedCommandNames().has(e) ? e : "custom"),
    ce = getTipAttribution(command.name);
  if (!isCommandEnabled(command)) {
    logFeatureBad(L, "cmd_policy_disabled");
    let E = `/${bP(sanitizeTelemetryString(e))} isn't available in this session.`;
    if (o.options.isNonInteractiveSession)
      return {
        messages: [
          createCommandInputMessage(formatRedactedCommandInput(command, n), { submitUuid: h }),
          createCommandInputMessage(`<local-command-stdout>${E}</local-command-stdout>`),
        ],
        shouldQuery: !1,
        command: command,
        resultText: E,
      };
    return {
      messages: [createSystemMessage(E, "warning")],
      shouldQuery: !1,
      command: command,
      resultText: E,
    };
  }
  if (isSkillOff(command)) {
    let E = describeSkillHiddenBehindPlugin(command);
    if (
      (logFeatureBad(L, E === void 0 ? "cmd_skill_override_off" : "cmd_skill_hidden_behind_plugin"),
      o.options.isNonInteractiveSession)
    ) {
      let Q =
        E ??
        `Skill "${uo(command.name, 200)}" is disabled via skillOverrides. Remove the override from your settings to run it.`;
      return {
        messages: [
          createCommandInputMessage(formatRedactedCommandInput(command, n), { submitUuid: h }),
          createCommandInputMessage(`<local-command-stdout>${Q}</local-command-stdout>`),
        ],
        shouldQuery: !1,
        command: command,
        resultText: Q,
      };
    }
    let O =
        E ??
        `Skill "${uo(command.name, 200)}" is disabled via skillOverrides. Re-enable it in /skills or remove the override from your settings to run it.`,
      F = !n ? "" : hasSensitiveArgs(command, n) ? "***" : bP(redactSecrets(n));
    return {
      messages: [
        createSystemMessage(O, "warning"),
        ...(n ? [createSystemMessage(`Args from disabled skill: ${F}`, "warning")] : []),
      ],
      shouldQuery: !1,
      command: command,
      resultText: O,
    };
  }
  if (command.type === "prompt" && command.userInvocable !== !1)
    recordSkillInvoked(o.session, command.name, o.storageV5);
  if (command.type === "prompt" && command.pluginInfo) recordPluginUsage(command.pluginInfo.repository);
  if (!o.deferSlashToEngine?.(command))
    claimCommandOverageCredit({
      commandName: command.name,
      agentId: o.agentId,
      isNonInteractiveSession: Boolean(o.options.isNonInteractiveSession),
      setAppState: o.setAppState,
      credentials: o.credentials,
    });
  if (command.userInvocable === !1)
    return (
      logFeatureBad(L, "cmd_not_user_invocable"),
      {
        messages: [
          createUserMessage({
            content: prepareUserContent({
              inputString: `/${sanitizeTelemetryString(e)}`,
              precedingInputBlocks: u,
            }),
            uuid: h,
          }),
          createUserMessage({
            content: `This skill can only be invoked by Claude, not directly by users. Ask Claude to use the "${sanitizeTelemetryString(e)}" skill for you.`,
          }),
        ],
        shouldQuery: !1,
        command: command,
      }
    );
  if (command.type === "local-jsx" && o.options.isNonInteractiveSession)
    return (logFeatureBad(L, "cmd_local_jsx_headless"), headlessUnavailableResult(command, n, h));
  try {
    switch (command.type) {
      case "local-jsx":
        return new Promise((resolve) => {
          let O = !1,
            onDone = (result, options) => {
              if (O) return;
              if (((O = !0), logFeatureOk(L, ce), options?.display === "skip")) {
                resolve({
                  messages: [],
                  shouldQuery: !1,
                  command: command,
                  nextInput: options?.nextInput,
                  submitNextInput: options?.submitNextInput,
                });
                return;
              }
              let metaMessages = (options?.metaMessages ?? []).map((content) =>
                  createUserMessage({ content: content, isMeta: !0, origin: options?.metaMessagesOrigin }),
                ),
                U =
                  o.presentation === "fullscreen" &&
                  typeof result === "string" &&
                  result.endsWith(" dismissed");
              resolve({
                messages:
                  options?.display === "system"
                    ? U
                      ? metaMessages
                      : [
                          createCommandInputMessage(formatCommandInput(command, n)),
                          createCommandInputMessage(
                            `<local-command-stdout>${bP(String(result))}</local-command-stdout>`,
                            { commandRun: buildCommandRunInfo(command, n) },
                          ),
                          ...metaMessages,
                        ]
                    : [
                        createUserMessage({
                          content: prepareUserContent({
                            inputString: formatCommandInput(command, n),
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
                shouldQuery: options?.shouldQuery ?? !1,
                command: command,
                nextInput: options?.nextInput,
                submitNextInput: options?.submitNextInput,
                ...(metaMessages.length > 0 && { metaTexts: options?.metaMessages }),
              });
            },
            Q = command.load ?? o.options.resolveCommandDialog?.(command);
          if (!Q) {
            (logFeatureBad(L, "cmd_local_jsx_no_dialog_resolution"),
              resolve(headlessUnavailableResult(command, n)));
            return;
          }
          let W = isImmediateCommand(command, n, o.presentation ?? "inline");
          Q()
            .then((mod) =>
              mod.call(
                onDone,
                { ...o, canUseTool: p, dispatchedAsImmediate: W, submissionOrigin: Z, promptSource: D },
                n,
                B ?? e,
              ),
            )
            .then((jsx) => {
              if (jsx == null) return;
              if (O) return;
              let localJsx = o.localJsx;
              if (!localJsx) {
                (logFeatureBad(L, "cmd_local_jsx_no_panel_host"),
                  (O = !0),
                  resolve(headlessUnavailableResult(command, n)));
                return;
              }
              localJsx
                .show(jsx, {
                  commandName: getCommandName(command),
                  immediate: W,
                  hidesPrompt: !0,
                  retireAtTurnBoundary: !0,
                })
                .closed.then((U) => {
                  if (U === "dismissed" && !O)
                    ((O = !0),
                      logFeatureBad(L, "cmd_local_jsx_dismissed"),
                      resolve({ messages: [], shouldQuery: !1, command: command }));
                });
            })
            .catch((M) => {
              let k = isAbortError(M);
              if (k)
                logForDebugging(`local-jsx command aborted: ${M instanceof Error ? M.message : String(M)}`);
              else logError(withTelemetryMessage(toError(M), "local-jsx slash command threw"));
              if ((logFeatureBad(L, k ? "cmd_local_jsx_aborted" : "cmd_local_jsx_threw"), O)) return;
              if (((O = !0), k)) {
                resolve({ messages: [], shouldQuery: !1, command: command });
                return;
              }
              resolve({
                messages: [
                  createUserMessage({
                    content: prepareUserContent({
                      inputString: formatCommandInput(command, n),
                      precedingInputBlocks: u,
                    }),
                    uuid: h,
                  }),
                  createCommandInputMessage(
                    `<local-command-stderr>${escapeXml(bP(commandThrowTextForTranscript(M, command.name, o.session)))}</local-command-stderr>`,
                    { commandRun: buildCommandRunInfo(command, n), commandOutcome: { kind: "failed" } },
                  ),
                ],
                shouldQuery: !1,
                command: command,
              });
            });
        });
      case "local": {
        if (o.deferSlashToEngine?.(command)) {
          let trimmed = `/${getCommandName(command)} ${n}`.trim(),
            Q = createUserMessage({
              content: prepareUserContent({ inputString: trimmed, precedingInputBlocks: u }),
              uuid: h,
            });
          return {
            messages: [Q],
            shouldQuery: !1,
            command: command,
            engineDeferredSlash: { text: trimmed, messageUuid: Q.uuid, origin: Z },
          };
        }
        let userMessage = createUserMessage({
            content: prepareUserContent({
              inputString: formatCommandInput(command, n),
              precedingInputBlocks: u,
            }),
            uuid: h,
          }),
          O = wt() && getCommandRequirements(command).workspace;
        if (O) o.applyMessageOp({ type: "append", messages: [userMessage] });
        try {
          let syntheticCaveatMessage = createSyntheticUserCaveatMessage(),
            W = (await command.load()).call(
              n,
              { ...o, submissionOrigin: Z, promptSource: D, commandMessageUuid: userMessage.uuid },
              B ?? e,
            ),
            M = O ? await raceWithAbortSignal(W, o.abortController.signal, () => new AbortError()) : await W;
          if (M.type === "text" && M.level === "error") logFeatureBad(L, "cmd_returned_error");
          else logFeatureOk(L, ce);
          if (M.type === "skip") return { messages: [], shouldQuery: !1, command: command };
          if (M.type === "compact") {
            let slashCommandMessages = [
                syntheticCaveatMessage,
                userMessage,
                ...(M.displayText
                  ? [
                      createUserMessage({
                        content: `<local-command-stdout>${bP(M.displayText)}</local-command-stdout>`,
                        localCommandOutput: M.displayTextIsHintOnly ? "terminal-hint" : "stdout",
                        ...(M.displayRepeatsSummary === !0 && { repeatsCompactSummary: !0 }),
                        timestamp: new Date(Date.now() + 100).toISOString(),
                      }),
                    ]
                  : []),
              ],
              compactionResultWithSlashMessages = {
                ...M.compactionResult,
                messagesToKeep: [...M.compactionResult.messagesToKeep, ...slashCommandMessages],
              },
              S = buildPostCompactMessages(compactionResultWithSlashMessages);
            return (setLastCacheSafeForkMessages(S), { messages: S, shouldQuery: !1, command: command });
          }
          if (M.type === "query")
            return {
              messages: [
                userMessage,
                createCommandInputMessage(`<local-command-stdout>${bP(M.value)}</local-command-stdout>`, {
                  commandRun: buildCommandRunInfo(command, n),
                }),
                ...(M.metaMessages ?? []).map((U) => createUserMessage({ content: U, isMeta: !0 })),
                createUserMessage({ content: M.prompt, isMeta: !0 }),
              ],
              shouldQuery: !0,
              command: command,
              resultText: M.value,
              ...(M.metaMessages !== void 0 && { metaTexts: M.metaMessages }),
            };
          let k = M.level === "error" ? "local-command-stderr" : "local-command-stdout",
            P = createCommandInputMessage(`<${k}>${bP(M.value)}</${k}>`, {
              contextUsage: M.contextUsage,
              usageReport: M.usageReport,
              commandRun: buildCommandRunInfo(command, n),
              commandOutcome: M.outcome ?? (M.level === "error" ? { kind: "failed" } : void 0),
            });
          if (O)
            return insertMessagesInPlace(o, userMessage, {
              messages: [P],
              shouldQuery: !1,
              command: command,
              resultText: M.value,
            });
          return {
            messages: [
              userMessage,
              P,
              ...(M.metaMessages ?? []).map((U) => createUserMessage({ content: U, isMeta: !0 })),
            ],
            shouldQuery: !1,
            command: command,
            resultText: M.value,
            ...(M.metaMessages !== void 0 && { metaTexts: M.metaMessages }),
          };
        } catch (error) {
          if (isAbortError(error))
            logForDebugging(
              `local command aborted: ${error instanceof Error ? error.message : String(error)}`,
            );
          else logError(withTelemetryMessage(toError(error), "local slash command threw"));
          let Q = isAbortError(error);
          if (Q && o.abortController.signal.aborted) logFeatureSad(L, "cmd_local_aborted");
          else logFeatureBad(L, Q ? "cmd_local_aborted" : "cmd_local_threw");
          let W = Q ? "local-command-stdout" : "local-command-stderr",
            M = O ? cwr : "Interrupted",
            k = Q
              ? isBridgeOrTransport(o.session)
                ? M
                : error instanceof Error
                  ? error.message || M
                  : M
              : commandThrowTextForTranscript(error, command.name, o.session),
            P = createCommandInputMessage(
              `<${W}>${escapeXml(bP(k))}</${W}>`,
              Q
                ? void 0
                : { commandRun: buildCommandRunInfo(command, n), commandOutcome: { kind: "failed" } },
            );
          if (O)
            return insertMessagesInPlace(o, userMessage, {
              messages: [P],
              shouldQuery: !1,
              command: command,
            });
          return { messages: [userMessage, P], shouldQuery: !1, command: command };
        }
      }
      case "prompt": {
        let {
            stacked: stacked,
            trailingArgs: trailingArgs,
            capped: capped,
          } = command.context === "fork" ||
          command.getContext !== void 0 ||
          command.argsMayContainSlashCommands
            ? { stacked: [], trailingArgs: n, capped: !1 }
            : splitStackedCommands(n, A, o.options.commands, y ? (R ?? (() => !0)) : void 0),
          Q = trailingArgs,
          W;
        if (stacked.length > 0) logEvent("tengu_stacked_slash_commands", { stacked_count: stacked.length });
        let M = !1;
        try {
          let k = getCommandContextMode(command, Q, o) === "fork" && !isCoordinatorMainThread(o);
          if (!k && (await oe?.()) === !1)
            return (
              logFeatureBad(
                L,
                o.abortController.signal.aborted ? "cmd_prompt_aborted" : "cmd_prompt_submit_hook_blocked",
              ),
              {
                messages: [
                  createUserMessage({
                    content: prepareUserContent({
                      inputString: formatRedactedCommandInput(command, n),
                      precedingInputBlocks: u,
                    }),
                    uuid: h,
                    origin: Z,
                  }),
                ],
                shouldQuery: !0,
                command: command,
              }
            );
          if (!(command.isMcp && command.loadedFrom !== "mcp"))
            skillLoadedSource(command.name, command, "user-slash");
          M = !0;
          let P = await processUserInput_2(command, Q, o);
          if (((M = o.abortController.signal.aborted), "blocked" in P))
            return (
              logFeatureBad(L, "cmd_hook_blocked"),
              M && P.blocked.screened?.dropped !== !0 ? { ...P.blocked, ownPassCutShort: !0 } : P.blocked
            );
          if (!o.options.isNonInteractiveSession && !y) {
            if ((command.onUserTypedArgs?.(Q, o), command.getEffort?.(Q, o) === void 0)) {
              let I = command.getDefaultEffort?.(Q, o)?.notice;
              if (I) W = createSystemMessage(I, "notice");
            }
          }
          if (k) {
            let I = snapshotHookRegistration(),
              trimmed = `/${e} ${n}`.trim(),
              J = getContentText([...u, { type: "text", text: trimmed }]) ?? trimmed;
            if (!j) throw Error("Forked dispatch requires forkDispatchHookExecutors");
            let ie = [],
              de = [];
            for await (let te of j.executeUserPromptSubmitHooks(
              J,
              getToolPermissionContext(o).mode,
              o,
              promptOriginForHooks({ promptSource: D ?? "typed" }),
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
                  ),
                  Te =
                    te.suppressOriginalPrompt === !0 ||
                    (o.userPromptLine?.isUnknownSinceDispatch() ?? hasHookRegistrationChanged(I)) ||
                    hasPromptSubmitHooks({ isRunReached: !1 })
                      ? userPromptSubmitHookBlockingMessage
                      : `${userPromptSubmitHookBlockingMessage}

Original prompt: ${J}`;
                return {
                  messages: [createSystemMessage(Te, "warning", void 0, !0)],
                  shouldQuery: !1,
                  resultText: Te,
                  command: command,
                  forkDispatched: !0,
                  screened: { dropped: !0 },
                };
              }
              if (te.preventContinuation) {
                let x = te.stopReason
                  ? `Operation stopped by hook: ${te.stopReason}`
                  : "Operation stopped by hook";
                return (
                  logFeatureBad(L, "cmd_prompt_submit_hook_stopped"),
                  {
                    messages: [
                      createUserMessage({ content: x }),
                      createSystemMessage(x, "warning", void 0, !0),
                    ],
                    shouldQuery: !1,
                    resultText: x,
                    command: command,
                    forkDispatched: !0,
                    ...(o.abortController.signal.aborted && { ownPassCutShort: !0 }),
                  }
                );
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
            let aborted = o.abortController.signal.aborted;
            if (aborted && o.userPromptLine?.isHeldForOrganization())
              return (
                logFeatureBad(L, "cmd_prompt_aborted"),
                {
                  messages: [createUserInterruptionMessage({ toolUse: !1 })],
                  shouldQuery: !1,
                  command: command,
                  forkDispatched: !0,
                  ownPassCutShort: !0,
                }
              );
            if (!aborted) o.userPromptLine?.forked();
            let me = await executeForkedSlashCommand(
              command,
              Q,
              { ...o, userPromptHold: void 0, userPromptLine: void 0 },
              u,
              s,
              p ?? evaluateAskingNoHost,
              j,
              [...P.hookMessages, ...ie],
              y,
              h,
              H,
              Z,
              se,
            );
            if (de.length > 0)
              me.messages.push(
                createSystemMessage(`UserPromptSubmit hook error: ${de.join("; ")}`, "warning"),
              );
            if (me.aborted) logFeatureBad(L, "cmd_prompt_aborted");
            else if (me.threw) logFeatureBad(L, "cmd_prompt_threw");
            else if ((logFeatureOk(L, ce), W)) me.messages.splice(1, 0, W);
            return me;
          }
          let U = await getMessagesForPromptSlashCommand(
            command,
            Q,
            o,
            u,
            s,
            h,
            P.hookMessages,
            y,
            Z,
            pe,
            !1,
            !1,
            D,
          );
          if (stacked.length > 0 && A !== void 0) {
            let I = U.messages[0];
            if (I?.type === "user" && !I.isMeta) I.stackedOriginalInput = `/${command.name} ${A}`;
          }
          for (let I of stacked)
            try {
              let S = await processUserInput_2(I, trailingArgs, o);
              if ("blocked" in S) {
                if (
                  (U.messages.push(
                    createSystemMessage(
                      `Stacked skill /${sanitizeTelemetryString(I.name)} blocked by UserPromptExpansion hook`,
                      "warning",
                    ),
                  ),
                  S.blocked.screened?.dropped === !0)
                )
                  U.screened = { dropped: !0 };
                continue;
              }
              if (!o.options.isNonInteractiveSession && !y) {
                if ((I.onUserTypedArgs?.(trailingArgs, o), I.getEffort?.(trailingArgs, o) === void 0)) {
                  let de = I.getDefaultEffort?.(trailingArgs, o)?.notice;
                  if (de) U.messages.push(createSystemMessage(de, "notice"));
                }
              }
              if (
                (claimCommandOverageCredit({
                  commandName: I.name,
                  agentId: o.agentId,
                  isNonInteractiveSession: Boolean(o.options.isNonInteractiveSession),
                  setAppState: o.setAppState,
                  credentials: o.credentials,
                }),
                recordSkillInvoked(o.session, I.name, o.storageV5),
                I.pluginInfo)
              )
                (recordPluginUsage(I.pluginInfo.repository),
                  recordPluginActivity(
                    I.pluginInfo.repository,
                    "command",
                    commandActivity(I, I.pluginInfo.pluginManifest.name),
                  ));
              if (!(I.isMcp && I.loadedFrom !== "mcp")) skillLoadedSource(I.name, I, "user-slash");
              let J = await getMessagesForPromptSlashCommand(
                  I,
                  trailingArgs,
                  { ...o, messages: [...o.messages, ...U.messages] },
                  [],
                  [],
                  void 0,
                  S.hookMessages,
                  y,
                  Z,
                  void 0,
                  !1,
                  !1,
                  D,
                ),
                ie = J.messages[0];
              if (ie?.type === "user" && !ie.isMeta) ie.stackedExpansion = !0;
              (U.messages.push(...J.messages),
                (U.allowedTools = [...(U.allowedTools ?? []), ...(J.allowedTools ?? [])]),
                (U.disallowedTools = [...(U.disallowedTools ?? []), ...(J.disallowedTools ?? [])]),
                (U.model = J.model ?? U.model),
                (U.effort = J.effort ?? U.effort));
            } catch (error) {
              if (isAbortError(error)) throw error;
              (logError(withTelemetryMessage(toError(error), "stacked slash command expansion threw")),
                U.messages.push(
                  createSystemMessage(
                    `Stacked skill /${sanitizeTelemetryString(I.name)} failed to load: ${commandThrowTextForTranscript(error, I.name, o.session)}`,
                    "warning",
                  ),
                ));
            }
          if (capped)
            U.messages.push(
              createSystemMessage(
                `Stacked command limit (${MAX_STACKED_COMMANDS}) reached \u2014 remaining input passed as arguments`,
                "warning",
              ),
            );
          if (W) U.messages.push(W);
          return (logFeatureOk(L, ce), U);
        } catch (error) {
          if (isAbortError(error)) {
            logFeatureBad(L, "cmd_prompt_aborted");
            let P = [
              createUserMessage({
                content: prepareUserContent({
                  inputString: formatCommandInput(command, n),
                  precedingInputBlocks: u,
                }),
                uuid: h,
              }),
            ];
            if (!isSilentAbortReason(o.abortController.signal.reason))
              P.push(
                createUserInterruptionMessage({
                  toolUse: !1,
                  interruptedByShutdown: shutdownInterruptStamp(o.abortController.signal),
                }),
              );
            return { messages: P, shouldQuery: !1, command: command, ...(M && { ownPassCutShort: !0 }) };
          }
          return (
            logFeatureBad(L, "cmd_prompt_threw"),
            {
              messages: [
                createUserMessage({
                  content: prepareUserContent({
                    inputString: formatCommandInput(command, n),
                    precedingInputBlocks: u,
                  }),
                  uuid: h,
                }),
                createUserMessage({
                  content: `<local-command-stderr>${escapeXml(commandThrowTextForTranscript(error, command.name, o.session))}</local-command-stderr>`,
                  localCommandOutput: "stderr",
                }),
              ],
              shouldQuery: !1,
              command: command,
            }
          );
        }
      }
    }
  } catch (error) {
    if (error instanceof MalformedCommandError)
      return (
        logFeatureBad(L, "cmd_malformed"),
        {
          messages: [
            createUserMessage({
              content: prepareUserContent({ inputString: error.message, precedingInputBlocks: u }),
            }),
          ],
          shouldQuery: !1,
          command: command,
        }
      );
    throw error;
  }
}
//@ chunk-3g0djq3w.js:42876-42937 layout
function formatCommandInput(e, n) {
  let o = buildCommandRunInfo(e, n);
  return formatCommandInputTags(o.command, o.args);
}
//@ chunk-3g0djq3w.js:42937-42998 layout
function formatRedactedCommandInput(e, n) {
  return formatCommandInputTags(
    sanitizeTelemetryString(getCommandName(e)),
    hasSensitiveArgs(e, n) ? "***" : redactSecrets(n),
  );
}
//@ chunk-3g0djq3w.js:42998-43055 layout
function emptyIfHandled(e, n) {
  return e ? { messages: [], shouldQuery: !1 } : n;
}
//@ chunk-3g0djq3w.js:43055-43064 layout
var MAX_STACKED_COMMANDS = 5;
//@ chunk-3g0djq3w.js:43064-43668 layout
function splitStackedCommands(e, n, o, u) {
  if (n === void 0 && u === void 0) return { stacked: [], trailingArgs: e, capped: !1 };
  let s = [],
    T = e,
    p = n,
    h = !1;
  for (let y = 0; ; y++) {
    let trimStart = T.trimStart();
    if (!trimStart.startsWith("/")) break;
    if (y >= MAX_STACKED_COMMANDS) {
      h = !0;
      break;
    }
    let A = parseSlashCommand(trimStart);
    if (!A) break;
    let B = p;
    if (p !== void 0) {
      let trimStart = p.trimStart(),
        j = trimStart.startsWith("/") ? parseSlashCommand(trimStart) : void 0;
      if (!j || j.commandName !== A.commandName) break;
      B = j.args;
    }
    let H = findCommand(A.commandName, o);
    if (
      !H ||
      H.type !== "prompt" ||
      H.context === "fork" ||
      H.getContext !== void 0 ||
      H.argsMayContainSlashCommands ||
      H.userInvocable === !1 ||
      !isCommandEnabled(H) ||
      isSkillOff(H)
    )
      break;
    if (((T = A.args), (p = B), u?.(H))) continue;
    s.push(H);
  }
  return { stacked: s, trailingArgs: T, capped: h };
}
/**
 * 技能加载中的元数据标签文本（command-name/message 标签）。
 */
//@ chunk-3g0djq3w.js:43668-43782 facade-exports
function formatSkillLoadingMetadata(e, n = "loading") {
  return [
    `<${COMMAND_MESSAGE}>${e}</${COMMAND_MESSAGE}>`,
    `<${COMMAND_NAME}>${e}</${COMMAND_NAME}>`,
    `<${SKILL_FORMAT}>true</${SKILL_FORMAT}>`,
  ].join(`
`);
}
/**
 * 消息是否是技能加载中的元数据。
 */
//@ chunk-3g0djq3w.js:43782-43818 facade-exports
function isSkillLoadingMetadata(e, n) {
  return e === formatSkillLoadingMetadata(n);
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
  if (command.userInvocable !== !1) return formatSlashCommandLoadingMetadata(command.name, args);
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
/**
 * processPromptSlashCommand：只处理 prompt 型命令，展开为消息。
 */
//@ chunk-3g0djq3w.js:45446-45742 facade-exports = processPromptSlashCommand (1)
async function processPromptSlashCommand(e, n, o, u, s = !1, T = !1) {
  let command = findCommand(e, o);
  if (!command) throw new MalformedCommandError(`Unknown command: ${sanitizeTelemetryString(e)}`);
  if (command.type !== "prompt")
    throw Error(
      `Unexpected ${command.type} command. Expected 'prompt' command. Use /${e} directly in the main conversation.`,
    );
  return getMessagesForPromptSlashCommand(command, n, u, [], [], void 0, [], void 0, void 0, void 0, s, T);
}
/**
 * getMessagesForPromptSlashCommand：prompt 型命令/技能展开为消息（含 MCP prompt、禁止模型调用检查）。
 */
//@ chunk-3g0djq3w.js:45742-50793 fingerprint = getMessagesForPromptSlashCommand (0.431)
async function getMessagesForPromptSlashCommand(
  e,
  n,
  o,
  u = [],
  s = [],
  T,
  p = [],
  h,
  y,
  R,
  A = !1,
  B = !1,
  H,
) {
  let D = await checkCommandSyncedAccess(e);
  if (qCe(e) || isShippedSkillExecutionBlocked(e))
    throw new MalformedCommandError(`Unknown command: ${sanitizeTelemetryString(e.name)}`);
  if (LZ(D))
    throw (gse(e, D), new MalformedCommandError(`Unknown command: ${sanitizeTelemetryString(e.name)}`));
  if (isCoordinatorMainThread(o) && !A) {
    let metadata = formatCommandLoadingMetadata(e, n),
      me = e.isMcp && e.loadedFrom !== "mcp",
      te = isHiddenFromModel(e);
    if (e.disableModelInvocation || me || te) {
      let parts = [
        me
          ? `"/${sanitizeTelemetryString(e.name)}" is an MCP prompt and cannot run in coordinator mode: the coordinator does not load prompt content, and workers cannot invoke MCP prompts via the ${SKILL} tool.`
          : `Skill "/${sanitizeTelemetryString(e.name)}" is user-invocable only (${e.disableModelInvocation ? "disable-model-invocation" : "disabled for model invocation in settings"}) and cannot run in coordinator mode: the coordinator does not load skill content, and workers cannot invoke it via the ${SKILL} tool.`,
      ];
      if (e.description) parts.push(`Description: ${e.description}`);
      let mapped = Object.entries(e.subcommands ?? {})
        .filter(([, Ce]) => {
          let Se = findCommand(Ce, o.options.commands);
          return (
            Se !== void 0 &&
            isCommandEnabled(Se) &&
            !Se.disableModelInvocation &&
            !isHiddenFromModel(Se) &&
            !(Se.isMcp && Se.loadedFrom !== "mcp")
          );
        })
        .map(([Ce]) => Ce);
      if (mapped.length > 0)
        parts.push(
          `Note: the subcommands ${mapped.map((Ce) => `"/${sanitizeTelemetryString(e.name)} ${sanitizeTelemetryString(Ce)}"`).join(", ")} route to their own dedicated commands and DO still work when the user types them directly in the terminal (remote-control clients gate some commands separately).`,
        );
      parts.push(`
Do not instruct workers to invoke this via the ${SKILL} tool \u2014 it will be refused. Tell the user that ${mapped.length > 0 ? `/${sanitizeTelemetryString(e.name)} itself (beyond the subcommands above) is` : `the /${sanitizeTelemetryString(e.name)} command is`} unavailable in coordinator mode. If \u2014 and only if \u2014 the underlying task is achievable with the tools workers actually hold, you may brief a worker to do that work directly; do not promise this otherwise.`);
      let ye = [
        {
          type: "text",
          text: parts.join(`
`),
        },
      ];
      return {
        messages: [
          createUserMessage({ content: metadata, uuid: T, origin: y }),
          ...markTurnCompanions([
            withCommandTextBlocks(createUserMessage({ content: concatIfAny(s, u, ye), isMeta: !0 }), u, ye),
            ...p,
          ]),
        ],
        shouldQuery: !0,
        disallowedTools: splitRuleList(e.disallowedTools ?? []),
        command: e,
      };
    }
    let x = [`Skill "/${sanitizeTelemetryString(e.name)}" is available for workers.`];
    if (e.description) x.push(`Description: ${e.description}`);
    if (e.whenToUse) x.push(`When to use: ${e.whenToUse}`);
    let Me = await armedAllowedToolsOf(e);
    if (Me.length > 0)
      x.push(
        `This skill grants workers additional tool permissions: ${Me.map(sanitizeTelemetryString).join(", ")}`,
      );
    x.push(`
Instruct a worker to use this skill by including "Use the /${sanitizeTelemetryString(e.name)} skill" in your Agent prompt. The worker has access to the Skill tool and will receive the skill's content and permissions when it invokes it.`);
    let Te = [
      {
        type: "text",
        text: x.join(`
`),
      },
    ];
    return {
      messages: [
        createUserMessage({ content: metadata, uuid: T, origin: y }),
        ...markTurnCompanions([
          withCommandTextBlocks(createUserMessage({ content: concatIfAny(s, u, Te), isMeta: !0 }), u, Te),
          ...p,
        ]),
      ],
      shouldQuery: !0,
      disallowedTools: splitRuleList(e.disallowedTools ?? []),
      command: e,
    };
  }
  let j = [],
    Z = [],
    se = {
      ...o,
      submissionOrigin: y,
      promptSource: H,
      promptShellHandOff: j,
      mcpSkillLoaded: Z,
      ...((h || A) && {
        options: {
          ...o.options,
          ...(h && { modelScheduledOrigin: !0 }),
          ...(A && { isSkillPreload: !0, readOnlySkillLoad: !0 }),
        },
      }),
    },
    pe = await applySkillPromptHooks(e.name, await e.getPromptForCommand(n, se), e),
    at = Z.at(-1);
  if (e.loadedFrom === "mcp" && at === void 0)
    throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
      `The skill "${sanitizeTelemetryString(e.name)}" was not loaded because of a fault in Claude Code: it has no record of the files that the skill was verified against. Do not try again.`,
      "MCP skill body has no verified entry",
    );
  let r = A ? [] : await armedAllowedToolsOf(e),
    L = !A && (e.hooks !== void 0 || r.length > 0) ? await checkCommandSyncedAccess(e) : void 0,
    ce = (!isRestrictedToPluginOnly("hooks") || isSourceAdminTrusted(e.source)) && !A,
    E = e.hooks !== void 0 && !ce,
    O;
  if (L !== void 0) {
    let G = { hooks: e.hooks !== void 0 && ce, grant: r.length > 0 };
    if (G.hooks || G.grant) logSyncedSkillRestricted(sanitizeTelemetryString(e.name), L, G);
  } else if (e.hooks && ce) {
    let sessionId = getSessionId();
    if (
      ((O = checkSkillHooksFit(
        o.sessionHooksRegistry,
        sessionId,
        e.source,
        getCommandRepository(e),
        e.name,
        e.hooks,
      )),
      O === void 0)
    )
      registerSkillHooks(
        o.sessionHooksRegistry,
        sessionId,
        e.hooks,
        e.name,
        e.type === "prompt" ? e.skillRoot : void 0,
        areCommandHooksHeld(e),
        yyt(e.source),
        getCommandRepository(e),
      );
  }
  let F = e.source ? `${e.source}:${e.name}` : e.name,
    joined = pe.filter((G) => G.type === "text").map((G) => G.text).join(`

`);
  rSt(joined, "skill", o.credentials, o.storageV5, o.appendSystemMessage);
  let W = exe(getBareCommandNameUnlessSynced(e)),
    M = A && W !== null;
  if (!M) addInvokedSkill(e.name, F, joined, o.agentId ?? null, at !== void 0);
  if (W && !A)
    o.applyAttributionOp({
      kind: "recordVerification",
      method: W,
      checkout: await resolveSkillGitRoot(e, gl()),
    });
  o.options.activeSkill = getBareCommandName(e);
  let metadata = formatCommandLoadingMetadata(e, n),
    P = L !== void 0 || O !== void 0 || E ? [] : splitRuleList(r),
    additionalAllowedTools = splitRuleList(e.disallowedTools ?? []);
  if (additionalAllowedTools.length > 0)
    setCommandDenyRules(o.setToolPermissionContext, additionalAllowedTools, "union");
  let I = concatIfAny(s, u, pe),
    J =
      isSkillShownToModel(e) || A || h || B
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
              { now: () => new Date().toISOString(), uuid: () => randomUUID() },
              o.messages,
              "repl_main_thread",
              { planSlugSeed: n },
            ),
          ),
    ie = await scopedSkillVariantNote(e, getProjectRootOrNull(), o);
  return {
    messages: [
      createUserMessage({ content: metadata, uuid: T, origin: y }),
      ...markTurnCompanions([
        withCommandTextBlocks(
          createUserMessage({
            content: I,
            isMeta: !0,
            ...(j.length > 0 && { promptShellHandOff: { agentId: o.agentId ?? null, commands: j } }),
            ...(at !== void 0 && { mcpSkill: { ...at, name: e.name } }),
            ...(isSoftSparkEnabled() &&
              !M &&
              o.agentId === void 0 &&
              I === pe && { invokedSkill: { name: e.name, path: F } }),
          }),
          u,
          pe,
        ),
        ...(ie ? [ie] : []),
        ...(O !== void 0 || (E && !A)
          ? [createUserMessage({ content: wrapInSystemReminder(yt), isMeta: !0 })]
          : []),
        ...J,
        ...p,
      ]),
      createAttachmentMessage({
        type: "command_permissions",
        allowedTools: P,
        model: inlineSkillModelOverride(e.model),
      }),
    ],
    shouldQuery: !0,
    allowedTools: P,
    disallowedTools: additionalAllowedTools,
    model: inlineSkillModelOverride(e.model),
    effort: e.getEffort?.(n, o) ?? e.getDefaultEffort?.(n, o)?.value ?? e.effort,
    command: e,
  };
}
//@ chunk-3g0djq3w.js:50793-50861 affinity
function concatIfAny(e, n, o) {
  return e.length > 0 || n.length > 0 ? [...e, ...n, ...o] : o;
}
//@ chunk-3g0djq3w.js:50861-51001 affinity
function insertMessagesInPlace(e, n, o) {
  return (
    e.applyMessageOp({ type: "insert-after-uuid", uuid: n.uuid, messages: o.messages }),
    { ...o, messages: [], settledInPlace: !0 }
  );
}
//@ chunk-3g0djq3w.js:51001-51077 affinity
function markTurnCompanions(e) {
  return e.map((n) => (n.type === "user" ? { ...n, turnCompanion: !0 } : n));
}
/**
 * 为代理创建状态发射器：设置模式、重试状态与回合 effort。
 */
//@ chunk-e6aww6q8.js:5048489-5048750 placement
function createAgentStatusEmitter(e) {
  return {
    setMode(n) {
      h0e.emit({ kind: "agent-mode", agentId: e, mode: n });
    },
    setRetryStatus(n) {
      h0e.emit({ kind: "agent-retry-status", agentId: e, retryStatus: n });
    },
    setTurnEffort(n, r = null) {
      h0e.emit({ kind: "agent-turn-effort", agentId: e, turnEffort: n, turnModel: r });
    },
  };
}
/**
 * "Running SessionStart hooks…" 提示与主线程 spinner 状态发射器。
 */
//@ chunk-e6aww6q8.js:5048750-5049005 placement
var SESSION_START_HOOKS_MESSAGE = "Running SessionStart hooks\u2026",
  pae = {
    setSpinnerMessage(e) {
      h0e.emit({ kind: "main-message", message: e });
    },
    setSpinnerColors(e, n) {
      h0e.emit({ kind: "main-colors", color: e, shimmerColor: n });
    },
    setResponseHeld(e) {
      h0e.emit({ kind: "main-response-held", held: e });
    },
  };
/**
 * 找不到命令时等待 SessionStart 钩子与插件命令注册完成后再找一次（期间显示 spinner）。
 */
//@ chunk-e6aww6q8.js:5049005-5049623 placement
async function findCommandAfterHooks(e, n, r) {
  let s = findCommand(e, await hookedCommands([])),
    h = n ? MZ.get() : void 0;
  if (s || !h || r.aborted) return s;
  let withResolvers = Promise.withResolvers();
  return (
    r.addEventListener("abort", withResolvers.resolve, { once: !0 }),
    pae.setSpinnerColors("claudeBlue_FOR_SYSTEM_SPINNER", "claudeBlueShimmer_FOR_SYSTEM_SPINNER"),
    pae.setSpinnerMessage(SESSION_START_HOOKS_MESSAGE),
    (await Promise.race([
      (B1r.get() ?? Promise.resolve())
        .then(() => sre.get()?.read())
        .then(() => (sre.get()?.mayRegisterCommands() ?? !0) && h.then(() => !0)),
      withResolvers.promise.then(() => !1),
    ]).finally(() => {
      (r.removeEventListener("abort", withResolvers.resolve),
        pae.setSpinnerMessage(null),
        pae.setSpinnerColors(null, null));
    }))
      ? findCommand(e, await hookedCommands([]))
      : void 0
  );
}
//@ chunk-bc20zedk.js:33028-33069 fingerprint = formatSkillLoadingMetadata (0.84)
var formatSkillLoadingMetadata_2 = Object.freeze({ status: "loading" });

export {
  createAgentStatusEmitter,
  commandThrowTextForTranscript,
  looksLikeCommand,
  isSlashCommandBlockedByEndedByModel,
  formatSkillLoadingMetadata_2,
  SESSION_START_HOOKS_MESSAGE,
};
