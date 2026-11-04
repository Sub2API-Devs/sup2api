/**
 * tools/AgentTool/runAgent.ts
 *
 * runAgent：子代理主循环——模型/权限/工具/系统提示词/MCP/skills/钩子准备，调用 query 循环并记录 sidechain 转录
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/tools/AgentTool/runAgent.ts
 * pieces: chunk-0h4e7gnq.js (41)
 * attribution: placement 22, fingerprint 3, layout 7, facade-exports 5, file-local 1, sole-consumer 3
 */
import { sep, join, resolve, basename } from "path";
import { randomUUID } from "crypto";
import {
  hasParkedAgentBaseline,
  MAX_CACHE_STATE_BYTES,
  restoreAgentBaseline,
  forgetClassifierCompaction,
} from "../../services/api/promptCacheBreakDetection.js";
import { isStorageV5Enabled } from "../../utils/hoverRest.js";
import { toStorageKey } from "../../utils/storage/storageKeys.js";
import {
  worktreeFromProgress,
  getAgentTranscriptPath,
  locateAgentTranscript,
  readAgentMetadata,
  writeAgentMetadata,
  setAgentTranscriptSubdir,
  isLoggableMessage,
  clearAgentTranscriptSubdir,
  recordForkContextRef,
  recordSidechainTranscript,
  registerTranscriptExitDrain,
  transcriptCursorEnd,
  isTranscriptPersistenceDisabled,
} from "../../utils/sessionStorage.js";
import { readSmallFileOrNull } from "../../utils/readSmallFile.js";
import { logError } from "../../utils/log.js";
import { subagentSidecarKey } from "../../utils/subagentTranscriptPath.js";
import { killShellTasksForAgent } from "../../tasks/LocalShellTask/killShellTasks.js";
import { dequeueAllMatching } from "../../utils/messageQueueManager.js";
import { isOfficialMarketplaceSkill } from "../SkillTool/SkillTool.js";
import { sanitizeSkillNameForTelemetry, logSkillsLoaded } from "../../utils/telemetry/skillLoadedEvent.js";
import { logEvent } from "../../services/analytics/index.js";
import { lit, fromEnum } from "../../services/analytics/safeMetadata.js";
import { sanitizeMarkName } from "../../utils/startupMarks.js";
import { buildServerAttributionFields } from "../../utils/telemetry/pluginTelemetry.js";
import {
  handbackFrom,
  getPendingHandbackReport,
  isAutoHandbackArmed,
  recordHandbackContract,
  isSendMessageHandbackEnabled,
  handbackContractOf,
  resolveHandbackRecipient,
  findLatestHandbackReminder,
  buildHandbackInstruction,
  handbackCountermandText,
} from "./handbackReport.js";
import { getFeatureValue_CACHED_MAY_BE_STALE } from "../../services/analytics/growthbook.js";
import { logForDebugging, createAttachmentMessage_2 as createAttachmentMessage } from "../../utils/debug.js";
import { excludeCoordinatorCommsMcpTools } from "../../coordinator/coordinatorMcpServers.js";
import { bridgeToolsOf } from "../../bridge/bridgePermissionResponse.js";
import { isMcpTool } from "../../services/mcp/utils.js";
import {
  toError,
  errorMessage,
  TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS,
  StreamClosedAbortError,
  isAbortError,
  AbortError,
} from "../../utils/errors.js";
import { SENDMESSAGE, hasSendMessageTool } from "../SendMessageTool/constants.js";
import {
  getStrictMcpConfig,
  getIsRemoteMode,
  isDiskless,
  getSessionId,
  getIsNonInteractiveSession,
  getPermissionPromptToolName,
  getProjectRootOrNull,
  getStickyBetas,
  mainAgentId,
  getThinkingDisplayExplicit,
  getOriginalCwd,
  getProjectRoot,
} from "../../bootstrap/state.js";
import {
  getMcpConfigByName,
  unaddableTransportReason,
  doesEnterpriseMcpConfigExist,
  isMemoryServerName,
  hasCliOwnedMemoryServer,
  filterMcpServersByPolicy,
  mcpDialBlockCause,
} from "../../services/mcp/config.js";
import { isBuiltinMcpServerName } from "../../services/mcp/builtinServerNames.js";
import { awaitPolicyColdStartWaiter } from "../../services/policyLimits/coldStartWaiter.js";
import { isSourceAdminTrusted, isRestrictedToPluginOnly } from "../../utils/settings/pluginOnlyPolicy.js";
import { isCustomizationDisabled } from "../../utils/settings/customizationDisabled.js";
import { isSafeMode, isEnvTruthy } from "../../utils/envUtils.js";
import { reportOnce } from "../../utils/reportOnce.js";
import {
  flattenToolNameList,
  withAgentDisallowedTools,
  resolveAgentTools,
  withWebFetchToolForAgent,
  resolveAgentToolNames,
} from "./agentToolUtils.js";
import {
  hasUntrustedMcpServerEntries,
  checkAgentOriginTrust,
  agentFolderTrustHint,
  isAgentDefinitionTrusted,
} from "./agentTrust.js";
import {
  isRestrictedPersonalAgent,
  settingsGrantsConfined,
} from "../../utils/permissions/permissionsLoader.js";
import { agentMcpSource, isBuiltInAgent } from "./loadAgentsDir.js";
import { applyMcpServerConfig } from "../../components/mcp/MCPListPanel.js";
import { CLAUDE_ARTIFACTS } from "../../services/mcp/firstPartyServerIds.js";
import { getCliOwnedState } from "../../services/mcp/cliOwnedClients.js";
import { transportStateByHost } from "../../cli/transportState.js";
import {
  normalizeMessage,
  isToolUseOrResultMessage,
  orderedRowSource,
  appendRowsWithHooks,
  runningTurnRegistry,
} from "../../utils/queryHelpers.js";
import { makeSidecarReadFallback } from "../../utils/agentMetadata.js";
import { isEffortLevel } from "../../utils/effort.js";
import { isBypassPermissionsModeDisabled } from "../../utils/permissions/permissionSetup.js";
import {
  isolationWorktreeFor,
  isolationRuntimeService,
  isSameRepoWorktree,
} from "../../utils/worktreeIsolation.js";
import {
  checkSyncedSkillAccess,
  logSyncedPartRefused,
  findRefusedSyncedCommands,
  logSyncedCommandRefused,
} from "../../utils/claudeAiSync/syncedSkillAccess.js";
import { refusalTextFor } from "../../services/plugins/accountSync/syncedPluginHooks.js";
import {
  getToolPermissionContext,
  getMainLoopModel as getMainLoopModel_2,
} from "../../utils/permissions/toolPermissionContext.js";
import { getAgentModelWithTelemetry, getExploreAgentModel } from "../../utils/model/agent.js";
import { makeSaltedName } from "../../utils/agentId.js";
import {
  isDelegatedObservationContext,
  getAgentDepth,
  isHookOrPluginSteered,
} from "../../utils/agentContext.js";
import { isUnknownPluginSpawnedAgent } from "./pluginSpawnNote.js";
import { raiseTurnLifecycleForAgent } from "../../query/turnHooks.js";
import {
  isPerfettoRecording,
  registerPerfettoAgent,
  unregisterPerfettoAgent,
} from "../../utils/telemetry/perfettoTracing.js";
import {
  isNullRenderingAttachment_4,
  createUserMessage,
  wrapInSystemReminder,
  isReorderedRow,
  normalizeMessagesForResume,
  normalizeMessagesForAPI,
  handleMessageFromStream,
  normalizeMessages,
  createProgressMessage,
  extractAgentIdsFromMessages_2,
} from "../../utils/messages.js";
import { forkPointUuidOf, createSubagentContext } from "../../utils/forkedAgent.js";
import { cloneFileStateCache } from "../../utils/fileStateCache.js";
import {
  createRemoteFileState,
  READ_FILE_STATE_CACHE_SIZE as READ_FILE_STATE_CACHE_SIZE_2,
} from "../../utils/remoteFileState.js";
import { getOrBuildUserContext, getCachedSystemContext, getManagedInstructionText } from "../../context.js";
import { narrowerMode, isBypassCapableMode } from "../../utils/permissions/browserToolNames.js";
import {
  hasHookForEvent_2,
  executeSubagentStartHooks,
  getNonBlockableHookErrorMessage,
  executeStopHooks,
} from "../../utils/hooks.js";
import { isWebFetchAgent } from "../WebFetchTool/harnessNotes.js";
import { fallbackFromUnavailableAutoMode } from "./agentLaunch.js";
import { withClassifiedWebCalls, buildDisallowedToolsFilter } from "../../utils/permissions/permissions.js";
import { hasPermissionPromptTool } from "../../utils/permissions/permissionPromptHost.js";
import {
  memoryModeForSession,
  getStaleMemoryContextAttachment,
  coworkMemoryContextMode,
  buildAnchorAttachment,
} from "../../services/accountMemory/memoryContext.js";
import {
  memoryCallerKind,
  memoryNoteIfEnabled,
  isServedAccountMemoryTool,
} from "../../services/accountMemory/accountMemoryServer.js";
import { asSystemPrompt } from "../../utils/systemPromptType.js";
import { env, antEnv } from "../../utils/env.js";
import { uniq, count } from "../../utils/collections.js";
import { insertCoworkMemoryContexts } from "../../services/AgentSummary/agentSummary.js";
import { messagesSinceCompactBoundary } from "../../services/projects/threadRows.js";
import {
  hasFrontmatterHooks,
  registerFrontmatterHooks,
  isRepoFrontmatterHookRestricted,
} from "../../utils/hooks/registerFrontmatterHooks.js";
import { warnMcpToolNameTooLong } from "../../services/mcp/toolNameLimits.js";
import { uniqByExport } from "../../../vendor/lodash-es/uniqBy.js";
import { logFeatureBad, logFeatureSad, logFeatureOk } from "../../services/analytics/featureTelemetry.js";
import { permissionRuleValueFromString } from "../../utils/permissions/permissionRuleParser.js";
import { getMaxSubagentSpawnDepth } from "./spawnDepth.js";
import { toolMatchesName } from "../../Tool.js";
import { SUBAGENTHANDBACK, FORK } from "./constants.js";
import { mcpInfoFromString } from "../../services/mcp/mcpStringUtils.js";
import {
  getHeldBackSyncedPlugins,
  withNamedFolderYieldsRestored,
  getSkillToolCommands,
  getHiddenSyncedSkills,
  findCommand,
  isCommandEnabled,
  builtInCommandNames,
  isProjectScopedCommand,
} from "../../commands.js";
import { dropSyncedClashes, isKilledHostCatalogSkill, isSyncedSkill } from "../../utils/commandPredicates.js";
import { getSyncedSkillCommands, refreshVetoAndRead } from "../../utils/claudeAiSync/skillsSync.js";
import { foldName } from "../../utils/plugins/syncedItems.js";
import { PromptScopedAbortController, unwrapAbortReason } from "../../utils/abortController.js";
import { applySkillPromptHooks } from "../../plugins/functionHooks/skillPromptHooks.js";
import {
  cloneStickyBetaLatches,
  clearAdvisorHeldAndReturn,
  forkStickyBetaLatches,
  createStickyBetaLatches,
} from "../../bootstrap/stateSlices.js";
import { withKeepaliveReset } from "../../services/api/cacheKeepalive.js";
import { seedWireShapeFromRecord, forgetAgentThread } from "../../services/api/tether.js";
import { snapshotIfEnabled, recordedDeferredTools } from "../../utils/contextAttachments/promptSnapshot.js";
import {
  mergeNameOnlyAnnouncements,
  getDeferredToolsDeltaAttachments,
  getDeclaredToolSource,
  buildDeferredToolsLatchContextFrom,
  getSkillListingAttachmentsLazy,
} from "../../utils/attachments.js";
import { getSandboxInstructionsAttachments } from "../../utils/attachments/sandboxInstructions.js";
import { escapeXmlText } from "../../utils/sanitization.js";
import { MAIN } from "../../utils/sessionPeers.js";
import {
  shouldNotifyTeammateLifecycle,
  hasAnyKeepaliveReason,
} from "../../tasks/LocalAgentTask/childWork.js";
import { applySubagentThinkingDisplay } from "../../utils/thinking.js";
import { isClaudeAiChatCowork } from "../../utils/entrypointKinds.js";
import { buildVerifiedHumanTurns } from "../../utils/messages/apiNormalization.js";
import { emptyList } from "../../services/mcp/mcpSkills.js";
import { getEnvironmentChangeAttachments } from "../../utils/attachments/environmentChange.js";
import { isRemoteToolForwardingSwitchOn } from "../../services/remoteTools/servingGates.js";
import { recordSpawnedAgentIsolation, recordCleanlyRemovedAgent } from "../../utils/concurrentSessions.js";
import { recordSpawnProvenance, addUnnamedSteered } from "../../plugins/functionHooks/agentHooks.js";
import { recordForwardedTurnsDelivered } from "../../utils/messageProvenance.js";
import { getMainLoopModel } from "../../utils/model/model.js";
import {
  autoModeUnavailableNotes,
  buildAutoModeStoppedMessage,
} from "../../utils/permissions/autoModeUnavailable.js";
import { registerSandboxWriteDirectory, unregisterSandboxWriteDirectory } from "../../utils/Shell.js";
import { executeInSpan, endSubagentSpan } from "../../utils/telemetry/sessionTracing.js";
import { isStreamEvent } from "../../utils/messageKinds.js";
import { applyPreservedMessages } from "../../services/compact/compact.js";
import { agentTypeForTelemetry } from "../../services/analytics/metadata.js";
import { isLocalAgent } from "../../state/teammateViewHelpers.js";
import { buildAgentStoppedUnavailableMessage } from "../../utils/permissions/serverClassifier/results.js";
import { getTaskRunState } from "../../utils/task/taskNotifications.js";
import { hasRunningBackgroundWorkForAgent } from "../../tasks/backgroundTaskKinds.js";
import { ensureAgentDirectoryExists } from "../../components/agents/agentFileUtils.js";
import { isCoordinatorMode_2 } from "../../coordinator/coordinatorMode.js";
import { INSTRUCTION_FILE_NAMES } from "../../utils/instructionFileAccess.js";
import { classifyToolError } from "../../services/tools/toolExecution.js";
import { stopOwnedMonitorTasks } from "../../tasks/MonitorWsTask/MonitorWsTask.js";
import { readAgentMemoryScope } from "./agentMemory.js";
import { buildSubagentNotesSection, DEFAULT_SUBAGENT_PROMPT } from "../../constants/prompts.js";
import { applyPromptAblation } from "../../utils/api.js";
import { firstLineOf } from "../../utils/stringUtils.js";
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-0h4e7gnq.js:81304-81708 placement
/**
 * 恢复被续接子代理的基线状态（存储 V5 时换算存储键）。
 */
async function restoreResumedAgentBaseline(agentId, { resumed, storageV5 }) {
  if (!resumed) return;
  try {
    let baselineText = null;
    let sidecarPath = hasParkedAgentBaseline(agentId) ? undefined : prefixSidecarKey(agentId);
    if (sidecarPath !== undefined) {
      let storageKey =
        isStorageV5Enabled() && storageV5 !== undefined ? toStorageKey(sidecarPath) : undefined;
      if (storageV5 === undefined || storageKey === undefined) {
        let filePath = worktreeFromProgress(sidecarPath);
        baselineText =
          filePath === undefined ? null : await readSmallFileOrNull(filePath, MAX_CACHE_STATE_BYTES);
      } else {
        let readResult = await storageV5.read([
          {
            key: storageKey,
            offset: 0,
            length: MAX_CACHE_STATE_BYTES + 1,
          },
        ]);
        let item = readResult.ok ? readResult.value.items[0] : undefined;
        if (item?.found && item.totalBytes <= MAX_CACHE_STATE_BYTES)
          baselineText = Buffer.from(item.value).toString("utf-8");
      }
    }
    restoreAgentBaseline(agentId, baselineText);
  } catch (error) {
    logError(error);
  }
}
//@ chunk-0h4e7gnq.js:81708-81771 placement
/**
 * 由代理转录路径得到 `.prefix.json` 路径。
 */
function prefixTranscriptPath(agentId) {
  return getAgentTranscriptPath(agentId).replace(/\.jsonl$/, ".prefix.json");
}
//@ chunk-0h4e7gnq.js:81771-81846 placement
/**
 * 由代理转录定位出 `.prefix.json` 的 sidecar 键。
 */
function prefixSidecarKey(agentId) {
  let transcriptPath = locateAgentTranscript(agentId);
  return transcriptPath === undefined ? undefined : subagentSidecarKey(transcriptPath, ".prefix.json");
}
//@ chunk-0h4e7gnq.js:81846-81912 placement
/**
 * 把自动压缩上限包成 `{ceiling, inner}`。
 */
function withAutoCompactCeiling(autoCompactWindow, autoCompactWindow_2) {
  let innerWindow = autoCompactWindow;
  return autoCompactWindow_2 === undefined
    ? innerWindow
    : {
        ceiling: autoCompactWindow_2,
        inner: innerWindow,
      };
}
//@ chunk-0h4e7gnq.js:81912-81962 placement
/**
 * 杀掉该代理的 shell 任务并清理登记。
 */
function killAgentShellTasks(agentId, taskRegistry) {
  killShellTasksForAgent(agentId, taskRegistry);
  dequeueAllMatching((entry) => entry.agentId === agentId);
}
//@ chunk-0h4e7gnq.js:81962-82010 placement
/**
 * 上报技能预加载遥测（异常吞掉）。
 */
function logAgentSkillPreloadSafely(skill, agentId, isBuiltIn) {
  try {
    logAgentSkillPreload(skill, agentId, isBuiltIn);
  } catch (error) {
    logError(error);
  }
}
//@ chunk-0h4e7gnq.js:82010-82485 placement
/**
 * 上报子代理预加载技能的遥测（tengu_skill_tool_invocation，execution_context=preload、invocation_trigger=agent-preload）；技能名按官方市场/MCP/内建/打包区分脱敏。
 */
function logAgentSkillPreload(skill, agentId, isBuiltIn) {
  let isOfficial = isOfficialMarketplaceSkill(skill);
  let { sanitizedName, skillNameHash } = sanitizeSkillNameForTelemetry({
    rawName: skill.name,
    canonicalName: skill.name,
    isMcp: skill.loadedFrom === "mcp",
    isBuiltIn,
    isBundled: skill.source === "bundled",
    isOfficial,
  });
  let trigger = "agent-preload";
  logEvent("tengu_skill_tool_invocation", {
    command_name: sanitizedName,
    _PROTO_skill_name: skill.name,
    ...skillNameHash,
    execution_context: lit("preload"),
    invocation_trigger: fromEnum("agent-preload"),
    parent_agent_id: sanitizeMarkName(agentId),
    ...logSkillsLoaded(skill.source, skill.loadedFrom, skill.kind, skill.createdBy),
    skill_content_chars: skill.contentLength,
    ...buildServerAttributionFields(skill),
  });
}
//@ chunk-0h4e7gnq.js:82485-82634 placement = getDestructiveCommandWarning (0.499)
/**
 * 取子代理最近一次自我报告的文本，有 warning 时拼在前面；报告来源与当前一致时不取，返回 undefined。被 runAgent 使用。
 */
function getLatestAgentReportText(task, agentId, previousHandback) {
  let report =
    handbackFrom(agentId) !== previousHandback
      ? getPendingHandbackReport(task, agentId)?.at(-1)?.report
      : undefined;
  let text = report?.text;
  if (text === undefined) return;
  return report?.warning === undefined
    ? text
    : `${report.warning}

${text}`;
}
//@ chunk-0h4e7gnq.js:82634-82937 placement
function filterIncompleteToolCalls_2(toolUseContext, message) {
  if (toolUseContext.options.forwardSubagentText) return true;
  if (toolUseContext.session.surfaceCapabilities.sdkForwardNestedSubagentToolCalls() !== true) return false;
  let content = message.data.message.message.content;
  let firstBlock = Array.isArray(content) ? content[0] : undefined;
  if (firstBlock?.type !== "tool_use" && firstBlock?.type !== "tool_result") return false;
  return getFeatureValue_CACHED_MAY_BE_STALE("tengu_starry_squid", true);
}
//@ chunk-0h4e7gnq.js:82937-84075 placement
class SidechainRecorder {
  sessionStorage;
  agentId;
  lastRecordedUuid;
  recordedUuids;
  storageV5;
  abortSignal;
  queued = [];
  unregisterExitDrain;
  flushHeld = () => this.flush(true);
  constructor(sessionStorage, agentId, lastRecordedUuid, recordedUuids, storageV5, signal) {
    this.sessionStorage = sessionStorage;
    this.agentId = agentId;
    this.lastRecordedUuid = lastRecordedUuid;
    this.recordedUuids = recordedUuids;
    this.storageV5 = storageV5;
    this.abortSignal = signal;
    this.unregisterExitDrain = sessionStorage.registerTranscriptExitDrain(this.flushHeld);
    signal.addEventListener("abort", this.flushHeld, {
      once: true,
    });
  }
  record(messages) {
    this.queued.push(...messages.filter(this.sessionStorage.isLoggableMessage));
    return this.flush(
      this.abortSignal.aborted ||
        messages.some((message) => message.type === "assistant" && message.isApiErrorMessage === true),
    );
  }
  async flush(force = false) {
    let batch = this.queued.splice(0, this.sessionStorage.transcriptCursorEnd(this.queued, 0, !force));
    if (batch.length === 0) return;
    let lastRecordedUuid = this.lastRecordedUuid;
    for (let message of batch) {
      this.lastRecordedUuid = message.uuid;
      this.recordedUuids?.add(message.uuid);
    }
    await this.sessionStorage
      .recordSidechainTranscript(batch, this.agentId, lastRecordedUuid, this.storageV5)
      .catch(logSidechainFailure);
  }
  forget(uuid) {
    let lastIndex = this.queued.findLastIndex((message) => message.uuid === uuid);
    if (lastIndex !== -1) this.queued.splice(lastIndex, 1);
  }
  async close() {
    await this.flush(true);
    this.unregisterExitDrain();
    this.abortSignal.removeEventListener("abort", this.flushHeld);
  }
}
//@ chunk-0h4e7gnq.js:84075-84139 placement
/**
 * 记录 sidechain 转录写入失败。
 */
function logSidechainFailure(error) {
  logForDebugging(`Failed to record sidechain transcript: ${error}`);
}
//@ chunk-0h4e7gnq.js:84139-84258 placement
function assembleAgentToolPool(toolUseContext, permissionContext, mcpTools) {
  return toolUseContext.options.toolCatalog.assembleToolPool(
    permissionContext,
    excludeCoordinatorCommsMcpTools(mcpTools),
    {
      skipReplFilter: true,
      machineMcpTools: bridgeToolsOf(toolUseContext),
    },
  );
}
//@ chunk-0h4e7gnq.js:84258-84347 placement
/**
 * 生成可后挂工具池的审查工具集合。
 */
function createDeferredReviewTools(tools) {
  let getExtraTools = () => [];
  return {
    onToolPool: (onToolPool) => {
      getExtraTools = onToolPool;
    },
    reviewTools: () => [...tools, ...getExtraTools()],
  };
}
//@ chunk-0h4e7gnq.js:84347-84657 placement
/**
 * 创建随调用增长的工具列表获取函数。
 */
function createGrowingToolList(initialTools, getBaseTools, getMcpTools, filterTools) {
  let currentTools = initialTools;
  let lastBaseTools;
  let lastMcpTools;
  return () => {
    try {
      let baseTools = getBaseTools();
      let mcpTools = getMcpTools();
      if (baseTools !== lastBaseTools || mcpTools !== lastMcpTools) {
        let combined = baseTools.concat(mcpTools.filter(isMcpTool));
        let knownNames = new Set(currentTools.map((tool) => tool.name));
        let newNames = new Set(
          combined.map((tool) => tool.name).filter((toolName) => !knownNames.has(toolName)),
        );
        if (newNames.size > 0) {
          let filtered = filterTools(combined).filter((tool) => newNames.has(tool.name));
          if (filtered.length > 0) currentTools = [...currentTools, ...filtered];
        }
        lastBaseTools = baseTools;
        lastMcpTools = mcpTools;
      }
    } catch (error) {
      logError(toError(error));
    }
    return currentTools;
  };
}
//@ chunk-0h4e7gnq.js:84657-84772 placement
function isOnlyPendingToolUse(messages, id) {
  let flattened = messages
    .slice(messages.findLastIndex((message) => message.type === "user") + 1)
    .flatMap(getToolUseIds);
  return flattened.length === 1 && flattened[0] === id;
}
//@ chunk-0h4e7gnq.js:84772-85087 placement
/**
 * 在消息中找出正在等待结果的工具调用及其所属的助手消息。
 */
function findWaitingToolCall(messages, id, tools, { normalizeMessagesForAPI }) {
  let lastIndex = messages.findLastIndex((message) => getToolUseIds(message).includes(id));
  let assistantMessage = messages[lastIndex];
  if (assistantMessage?.type !== "assistant") return;
  let runStartIndex = messages.slice(0, lastIndex).findLastIndex((message) => message.type === "user") + 1;
  if (
    messages.slice(0, runStartIndex).some((message) => isSameAssistantMessage(message, assistantMessage)) ||
    normalizeMessagesForAPI(messages.slice(lastIndex + 1), tools).length > 0
  )
    return;
  return {
    call: assistantMessage,
    rows: messages
      .slice(runStartIndex, lastIndex + 1)
      .filter((message) => isSameAssistantMessage(message, assistantMessage)),
  };
}
//@ chunk-0h4e7gnq.js:85087-85666 placement
async function* abortedToolResults(abortedCall, messageUtils, innerIterator, queryParams) {
  if (abortedCall === undefined) return yield* innerIterator(queryParams);
  let waitingToolCall = findWaitingToolCall(
    queryParams.messages,
    abortedCall.id,
    queryParams.toolUseContext.options.tools,
    messageUtils,
  );
  if (waitingToolCall === undefined) {
    abortedCall.settled();
    return yield* innerIterator({
      ...queryParams,
      messages: messageUtils.filterUnresolvedToolUses(queryParams.messages, undefined, {
        dropSiblingBlocks: true,
      }),
    });
  }
  let rowSet = new Set(waitingToolCall.rows);
  let inner = innerIterator({
    ...queryParams,
    messages: queryParams.messages.filter((message) => !rowSet.has(message)),
    keptFirstResponse: waitingToolCall.rows,
  });
  try {
    let result = await inner.next();
    while (!result.done) {
      if (result.value.type === "user" && result.value.sourceToolAssistantUUID === waitingToolCall.call.uuid)
        abortedCall.settled();
      yield result.value;
      result = await inner.next();
    }
    return result.value;
  } finally {
    abortedCall.settled();
    await inner.return({
      reason: "aborted_tools",
    });
  }
}
//@ chunk-0h4e7gnq.js:85666-85808 placement = countToolCallsSince (1)
function getToolUseIds(message) {
  return message.type === "assistant" && Array.isArray(message.message.content)
    ? message.message.content.flatMap((block) => (block.type === "tool_use" ? [block.id] : []))
    : [];
}
//@ chunk-0h4e7gnq.js:85808-85882 placement
/**
 * 判断两条消息是否是同一条 assistant 消息。
 */
function isSameAssistantMessage(message, reference) {
  return message.type === "assistant" && message.message.id === reference.message.id;
}
//@ chunk-0h4e7gnq.js:85882-85958 placement
/**
 * 惰性注入的 laptop 记忆工具引用（当前为 null）。
 */
var laptopMemoryToolsRef; // deferred: uses SENDMESSAGE (../SendMessageTool/constants.js) of its import cycle while loading; runs once the cycle is complete
var OTHER_AGENTS_NOTE;
deferInit("chunk-0h4e7gnq.js:85882", () => {
  laptopMemoryToolsRef = null;
  OTHER_AGENTS_NOTE = `Other agents active in this session, addressable via ${SENDMESSAGE}`;
});
//@ chunk-0h4e7gnq.js:85958-86788 placement
function resolveAgentMcpServers(agentType, agentSource, mcpServer) {
  if (typeof mcpServer === "string") {
    if (getStrictMcpConfig()) {
      logForDebugging(
        `[Agent: ${agentType}] MCP server '${mcpServer}' skipped: string specs resolve from disk config, which --strict-mcp-config ignores`,
        {
          level: "warn",
        },
      );
      return {
        skipped: "strict",
        name: mcpServer,
      };
    }
    let mcpConfigByName = getMcpConfigByName(mcpServer);
    if (!mcpConfigByName) {
      logForDebugging(`[Agent: ${agentType}] MCP server not found: ${mcpServer}`, {
        level: "warn",
      });
      return null;
    }
    return {
      name: mcpServer,
      config: mcpConfigByName,
      isNewlyCreated: false,
    };
  }
  let entries = Object.entries(mcpServer);
  if (entries.length !== 1) {
    logForDebugging(`[Agent: ${agentType}] Invalid MCP server spec: expected exactly one key`, {
      level: "warn",
    });
    return null;
  }
  let [serverName, serverConfig] = entries[0];
  if (isBuiltinMcpServerName(serverName)) {
    logForDebugging(
      `[Agent: ${agentType}] Skipping reserved MCP server name '${serverName}' in frontmatter`,
      {
        level: "warn",
      },
    );
    return null;
  }
  let transportProblem = unaddableTransportReason(serverConfig.type);
  if (transportProblem !== null) {
    logForDebugging(
      `[Agent: ${agentType}] Skipping ${transportProblem} MCP transport '${serverConfig.type}' for '${serverName}' in frontmatter`,
      {
        level: "warn",
      },
    );
    return null;
  }
  return {
    name: serverName,
    config: {
      ...serverConfig,
      scope: "agent",
      agentSource,
    },
    isNewlyCreated: true,
  };
}
//@ chunk-0h4e7gnq.js:86788-89986 fingerprint = initializeAgentMcpServers (0.321)
/**
 * 连接代理 frontmatter 中声明的 MCP 服务器：受 strictPluginOnlyCustomization、--strict-mcp-config、--bare/--safe-mode、远程模式、企业 MCP 配置、云会话、CLAUDE_CODE_RESTRICT_PERSONAL_CONFIG、项目审批与托管策略限制；返回合并后的 clients、该代理专属工具和 cleanup。
 */
async function initializeAgentMcpServers(
  agentDefinition,
  parentClients,
  onServersBlocked,
  abortSignal,
  options,
) {
  if (!agentDefinition.mcpServers?.length)
    return {
      clients: parentClients,
      agentClients: [],
      tools: [],
      cleanup: async () => {},
    };
  await awaitPolicyColdStartWaiter();
  let agentIsAdminTrusted = isSourceAdminTrusted(agentDefinition.source);
  let blockedBy = null;
  if (isRestrictedToPluginOnly("mcp") && !agentIsAdminTrusted) blockedBy = "strictPluginOnlyCustomization";
  else if (getStrictMcpConfig() && agentDefinition.source !== "flagSettings")
    blockedBy = "--strict-mcp-config";
  else if (isCustomizationDisabled("mcpAgentFrontmatter"))
    blockedBy = isSafeMode() ? "--safe-mode" : "--bare";
  else if (getIsRemoteMode()) blockedBy = "remote mode";
  else if (doesEnterpriseMcpConfigExist()) blockedBy = "enterprise MCP config";
  else if (isDiskless()) {
    reportOnce("subagent_mcp_servers");
    blockedBy = "this cloud session";
  }
  if (blockedBy) {
    logForDebugging(
      `[Agent: ${agentDefinition.agentType}] Skipping frontmatter MCP servers: blocked by ${blockedBy} (agent source: ${agentDefinition.source})`,
      {
        level: "warn",
      },
    );
    onServersBlocked?.(flattenToolNameList(agentDefinition.mcpServers), blockedBy);
    return {
      clients: parentClients,
      agentClients: [],
      tools: [],
      cleanup: async () => {},
    };
  }
  let originTrusted = !hasUntrustedMcpServerEntries(agentDefinition);
  let isRestrictedPersonal = isRestrictedPersonalAgent(agentDefinition);
  if (
    originTrusted &&
    isRestrictedPersonal &&
    agentDefinition.mcpServers.some((mcpServer) => typeof mcpServer !== "string")
  )
    onServersBlocked?.(
      flattenToolNameList(agentDefinition.mcpServers.filter((mcpServer) => typeof mcpServer !== "string")),
      "your own agents can't define their own MCP servers in this session (CLAUDE_CODE_RESTRICT_PERSONAL_CONFIG)",
    );
  if (!originTrusted) {
    checkAgentOriginTrust(agentDefinition, "subagent", "mcpServers");
    onServersBlocked?.(
      flattenToolNameList(agentDefinition.mcpServers.filter((mcpServer) => typeof mcpServer !== "string")),
      `untrusted agent origin \u2014 ${agentFolderTrustHint(agentDefinition)}`,
    );
  }
  let policyBlockedNames = [];
  let unapprovedNames = [];
  let strictSkippedNames = [];
  let sessionOwnedNames = [];
  let results = await Promise.all(
    agentDefinition.mcpServers.map(async (mcpServer) => {
      if (typeof mcpServer !== "string" && (!originTrusted || isRestrictedPersonal)) return null;
      let agentMcpServers = resolveAgentMcpServers(
        agentDefinition.agentType,
        agentMcpSource(agentDefinition),
        mcpServer,
      );
      if (agentMcpServers === null) return null;
      if ("skipped" in agentMcpServers) {
        strictSkippedNames.push(agentMcpServers.name);
        return null;
      }
      let { name: serverName, config, isNewlyCreated } = agentMcpServers;
      if (
        isMemoryServerName(serverName) &&
        (hasCliOwnedMemoryServer(parentClients) ||
          (laptopMemoryToolsRef?.laptopMemoryToolsEntryBuilt() ?? false))
      ) {
        logForDebugging(
          `[Agent: ${agentDefinition.agentType}] MCP server '${serverName}' skipped: the session holds this server name for its own entry`,
          {
            level: "warn",
          },
        );
        sessionOwnedNames.push(serverName);
        return null;
      }
      let { blocked } = filterMcpServersByPolicy({
        [serverName]: config,
      });
      let blockCause = blocked.length > 0 ? "managed-policy" : mcpDialBlockCause(serverName, config);
      if (blockCause === "project-approval") {
        logForDebugging(
          `[Agent: ${agentDefinition.agentType}] MCP server '${serverName}' skipped: not approved for this project`,
          {
            level: "warn",
          },
        );
        unapprovedNames.push(serverName);
        return null;
      }
      if (blockCause) {
        logForDebugging(
          `[Agent: ${agentDefinition.agentType}] MCP server '${serverName}' blocked by managed settings MCP policy`,
          {
            level: "warn",
          },
        );
        policyBlockedNames.push(serverName);
        return null;
      }
      let { connectToServer, fetchToolsForClient } =
        require("../../services/mcp/emitTripwireEvent.lazy.js").mcpClientModule();
      let { boundDial } = require("../../services/mcp/dialFailureLatch.js");
      let connectPromise = connectToServer(serverName, config, undefined, abortSignal, options);
      let name;
      try {
        name = await boundDial(connectPromise, {
          serverName,
          context: "subagent MCP server connect",
        });
      } catch (error) {
        logForDebugging(
          `[Agent: ${agentDefinition.agentType}] MCP server '${serverName}' connect timed out or aborted: ${errorMessage(error)}`,
          {
            level: "warn",
          },
        );
        if (isNewlyCreated)
          connectPromise.then(
            (connectedClient) => {
              if (connectedClient.type === "connected") connectedClient.cleanup().catch(() => {});
            },
            () => {},
          );
        return null;
      }
      let tools = [];
      if (name.type === "connected") {
        tools = await fetchToolsForClient(name, abortSignal);
        logForDebugging(
          `[Agent: ${agentDefinition.agentType}] Connected to MCP server '${serverName}' with ${tools.length} tools`,
        );
      } else
        logForDebugging(
          `[Agent: ${agentDefinition.agentType}] Failed to connect to MCP server '${serverName}': ${name.type}`,
          {
            level: "warn",
          },
        );
      return applyMcpServerConfig(config, {
        client: name,
        tools,
        isNewlyCreated,
      });
    }),
  );
  if (strictSkippedNames.length > 0) onServersBlocked?.(strictSkippedNames, "--strict-mcp-config");
  if (policyBlockedNames.length > 0) onServersBlocked?.(policyBlockedNames, "managed settings MCP policy");
  if (unapprovedNames.length > 0)
    onServersBlocked?.(unapprovedNames, "missing project approval (approve via /mcp)");
  let agentClients = [];
  let newClients = [];
  let tools = [];
  for (let result of results) {
    if (!result) continue;
    agentClients.push(result.client);
    if (result.isNewlyCreated) newClients.push(result.client);
    tools.push(...result.tools);
  }
  if (agentClients.some((client) => client.name === CLAUDE_ARTIFACTS))
    getCliOwnedState().subagentBroughtOwnArtifactsServer = true;
  let cleanup = async () => {
    for (let client of newClients)
      if (client.type === "connected")
        try {
          await client.cleanup();
        } catch (error) {
          logForDebugging(
            `[Agent: ${agentDefinition.agentType}] Error cleaning up MCP server '${client.name}': ${error}`,
            {
              level: "warn",
            },
          );
        }
  };
  return {
    clients: [...parentClients, ...agentClients],
    agentClients,
    tools,
    cleanup,
  };
}
//@ chunk-0h4e7gnq.js:89986-90133 fingerprint = isRecordableMessage (1)
/**
 * 可记录到子代理转录的消息类型：assistant/user/progress 与 compact_boundary 系统消息。
 */
function isRecordableMessage(msg) {
  return (
    msg.type === "assistant" ||
    msg.type === "user" ||
    msg.type === "progress" ||
    (msg.type === "system" && "subtype" in msg && msg.subtype === "compact_boundary")
  );
}
//@ chunk-0h4e7gnq.js:90133-90193 layout
function logForkContextRefFailure(error) {
  logForDebugging(`Failed to record fork-context-ref: ${error}`);
}
//@ chunk-0h4e7gnq.js:90193-90250 layout
function logAgentMetadataWriteFailure(error) {
  logForDebugging(`Failed to write agent metadata: ${error}`);
}
//@ chunk-0h4e7gnq.js:90250-90436 facade-exports
function writeSubagentProgressToOutputSink(toolUseContext, progressMessage, toolOnly) {
  let active = transportStateByHost.of(toolUseContext.session).active;
  if (!active) return;
  let forwardSubagentText = toolUseContext.options.forwardSubagentText ?? false;
  for (let message of normalizeMessage(progressMessage, toolUseContext.options.tools)) {
    if (toolOnly && !forwardSubagentText && !isToolUseOrResultMessage(message)) continue;
    active.writeAfterInit(message);
  }
}
//@ chunk-0h4e7gnq.js:90436-91216 layout
/**
 * 写入子代理元数据；恢复时先读取旧元数据并继承父代理、worktree、插件引导、workflow 阶段、请求形态、非交互与 effort 等字段。
 */
async function persistAgentMetadata(agentId, resumed, context, storageV5) {
  if (resumed) {
    let metadata = await readAgentMetadata(agentId, storageV5).catch(
      makeSidecarReadFallback("persistAgentMetadata"),
    );
    if (metadata) {
      context.parentAgentId = metadata.parentAgentId;
      if (metadata.worktreePath === undefined) {
        delete context.worktreePath;
        delete context.worktreeBranch;
      }
      if (metadata.inheritedWorktreePath !== undefined)
        context.inheritedWorktreePath = metadata.inheritedWorktreePath;
      if (metadata.spawnedWithWorktree === true) context.spawnedWithWorktree = true;
      if (metadata.worktreeCleanlyRemoved === true) context.worktreeCleanlyRemoved = true;
      if (metadata.pluginSteered === true) context.pluginSteered = true;
      if (metadata.workflowPhase !== undefined) context.workflowPhase = metadata.workflowPhase;
      if (metadata.requestShape === "foreground" || metadata.requestShape === "background")
        context.requestShape = metadata.requestShape;
      if (typeof metadata.requestNonInteractive === "boolean")
        context.requestNonInteractive = metadata.requestNonInteractive;
      if (context.effort === undefined && metadata.effort !== undefined && isEffortLevel(metadata.effort))
        context.effort = metadata.effort;
    }
  }
  await writeAgentMetadata(agentId, context, storageV5);
}
//@ chunk-0h4e7gnq.js:91216-91503 placement = isDangerousFilePathToAutoEdit (1)
/**
 * 把 .claude/worktrees/<名>/<相对路径> 映射回主仓库中的对应路径（防 .. 逃逸）；不在 worktree 下且位于允许根内返回 null，否则原样返回。旧版名 isDangerousFilePathToAutoEdit 误配，应归 worktree 相关模块。
 */
function mapWorktreePathToRepo(path, allowedRoot) {
  let worktreeSegment = `${sep}.claude${sep}worktrees${sep}`;
  let index = path.indexOf(worktreeSegment);
  if (index < 0) {
    if (allowedRoot && path.startsWith(allowedRoot + sep)) return null;
    return path;
  }
  let sliced = path.slice(0, index);
  let sliced_2 = path.slice(index + worktreeSegment.length);
  let index_2 = sliced_2.indexOf(sep);
  if (index_2 < 0) return null;
  let sliced_3 = sliced_2.slice(index_2 + 1);
  let mappedPath = join(sliced, sliced_3);
  let absolutePath = resolve(sliced);
  if (!resolve(mappedPath).startsWith(absolutePath + sep)) return null;
  return mappedPath;
}
//@ chunk-0h4e7gnq.js:91503-91610 layout
/**
 * 子代理声明或请求 bypassPermissions 时是否授权：会话未受限且父会话处于 bypassPermissions。
 */
function isBypassPermissionsAuthorized(permissionContext) {
  if (isBypassPermissionsModeDisabled()) return false;
  if (permissionContext.restricted) return false;
  if (permissionContext.mode === "bypassPermissions") return true;
  return false;
}
//@ chunk-0h4e7gnq.js:91610-91627 layout
/**
 * runAgent 常量：流式 token 估算节流 500ms，frontmatter skills 最多预加载 32 个。
 */
var STREAM_TOKEN_ESTIMATE_THROTTLE_MS = 500;
var MAX_PRELOADED_SKILLS = 32;
//@ chunk-0h4e7gnq.js:91627-118485 facade-exports = runAgent (0.281)
/**
 * runAgent：子代理主循环（async generator）。解析模型（uYs）、权限模式（spawn 模式/定义 permissionMode/bubble/bypass 授权）、工具集（resolveAgentTools，fork 时 useExactTools 原样继承）、系统提示词与 CLAUDE.md/附件、frontmatter MCP 服务器与 skills 预加载、SubagentStart/SubagentStop 钩子，创建子代理 ToolUseContext 后调用 query 循环，逐条 yield 消息并记录 sidechain 转录；结束时清理 MCP、钩子、监视任务与 worktree 根。
 */
async function* runAgent({
  agentDefinition,
  promptMessages,
  waitingToolUse,
  turnPrompt,
  toolUseContext,
  canUseTool,
  isAsync,
  requestShape = isAsync ? "background" : "foreground",
  requestNonInteractive,
  canShowPermissionPrompts,
  forkContextMessages,
  querySource,
  forkOrigin,
  spawnedBySkill,
  spawnedByForkedSkill,
  override,
  model,
  effort,
  maxTurns,
  preserveToolUseResults,
  persistedToolResultFiles,
  availableTools,
  assembleAvailableTools,
  onToolPool,
  webFetchReadmissionAllowed = true,
  allowedTools,
  onCacheSafeParams,
  contentReplacementState,
  stickyBetas,
  useExactTools,
  totalTokensReminderBudget,
  isTotalTokensReminderBudgetOnTopOfStart,
  worktreePath,
  worktreeBranch,
  cwd,
  launchedWithDefaults,
  session,
  spawnMode,
  description,
  name,
  toolUseId,
  enclosingToolUseId,
  transcriptSubdir,
  spawnedByWorkflowRunId,
  workflowPhase,
  onQueryProgress,
  onStreamTokenEstimate,
  onMcpServersBlocked,
  onModelRestricted,
  isTeammate = false,
  teammateContext,
  recordedUuids,
  compactTranscriptUnavailable,
  extraMetadata,
  requiresStructuredOutput,
  structuredOutputIsHandback,
  handbackOptIn,
  handbackTool,
  callerDeliveredReport,
}) {
  let activeSession = session ?? toolUseContext.session;
  let resumedContext =
    override?.agentContext?.agentType === "subagent" && override.agentContext.invocationKind === "resume";
  let isolationRoot = worktreePath || isolationWorktreeFor(toolUseContext);
  if (agentDefinition.source === "plugin") {
    let refusal = await checkSyncedSkillAccess(
      agentDefinition.plugin,
      agentDefinition.pluginSource?.pluginPath ?? agentDefinition.registeringPluginRoot,
      agentDefinition.registeredAtRunTime ? "refused" : "not judged",
    );
    if (refusal !== undefined) {
      logSyncedPartRefused("agent", agentDefinition.agentType, refusal);
      throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
        `The agent was not started: ${refusalTextFor(refusal)}.`,
        "synced plugin agent refused",
      );
    }
  }
  if (session) session.setIsolationRoot(resumedContext ? undefined : isolationRoot);
  let toolPermissionContext = getToolPermissionContext(toolUseContext);
  let permissionMode = toolPermissionContext.mode;
  let parentModel = isTeammate
    ? toolUseContext.rootToolSurface.mainLoopModel
    : getMainLoopModel_2(toolUseContext);
  let resolvedAgentModel = getAgentModelWithTelemetry(
    getExploreAgentModel(agentDefinition, parentModel),
    parentModel,
    model,
    permissionMode,
    onModelRestricted,
    isTeammate ? undefined : resumedContext ? "resume" : "spawn",
    {
      inWorkflowRun:
        spawnedByWorkflowRunId !== undefined ||
        (!resumedContext && !isTeammate && toolUseContext.spawnedByWorkflowRunId !== undefined),
    },
  );
  let resolvedModel = resolvedAgentModel;
  let agentId = override?.agentId ? override.agentId : makeSaltedName();
  let agentAbortController = override?.abortController
    ? override.abortController
    : isAsync
      ? new AbortController()
      : toolUseContext.abortController;
  let hooksEnabled = !(
    isDelegatedObservationContext(override?.agentContext ?? toolUseContext.agentContext) ||
    toolUseContext.options.settingsHooksOff === true
  );
  let unknownPluginAgent = isUnknownPluginSpawnedAgent({
    hookCaller: toolUseContext.hookCaller,
    pluginUnnamed: toolUseContext.pluginUnnamed,
  });
  using turnLifecycle = raiseTurnLifecycleForAgent(
    hooksEnabled ? (turnPrompt ?? "") : "",
    agentId,
    agentAbortController.signal,
    toolUseContext.hookCaller ?? (unknownPluginAgent ? "" : undefined),
    toolUseContext.hookOrigin,
  );
  let handback = handbackFrom(agentId);
  if (transcriptSubdir) setAgentTranscriptSubdir(agentId, transcriptSubdir);
  if (isPerfettoRecording()) {
    let perfettoParentId = toolUseContext.agentId ?? getSessionId();
    registerPerfettoAgent(agentId, agentDefinition.agentType, perfettoParentId);
  }
  let taskHandle;
  let messages = forkContextMessages ? filterIncompleteToolCalls(forkContextMessages) : [];
  let initialMessages = [
    ...messages,
    ...promptMessages.map((promptMessage) =>
      recordedUuids?.has(promptMessage.uuid) === true
        ? promptMessage
        : isNullRenderingAttachment_4(promptMessage),
    ),
  ];
  let forkPointUuid = forkContextMessages !== undefined ? forkPointUuidOf(messages) : undefined;
  let readFileState =
    override?.readFileState ??
    (forkContextMessages !== undefined
      ? cloneFileStateCache(toolUseContext.readFileState, {
          stripSeededFromContext: true,
        })
      : createRemoteFileState(READ_FILE_STATE_CACHE_SIZE_2));
  let [userContext, systemContext] = await Promise.all([
    override?.userContext ??
      getOrBuildUserContext(toolUseContext.session, toolUseContext.storageV5, toolUseContext.credentials),
    override?.systemContext ??
      getCachedSystemContext(toolUseContext.session, toolUseContext.options.cacheBreakerPhrase),
  ]);
  let {
    userContext: userContext_2,
    managedInstructionsOnly,
    architectureInstructionsOnly,
  } = agentDefinition.omitClaudeMd && !override?.userContext
    ? await resolveAgentUserContext(agentDefinition, userContext, toolUseContext)
    : {
        userContext,
        managedInstructionsOnly: false,
      };
  let spawnModeOverride = narrowerMode(spawnMode, permissionMode);
  let effectiveMode = spawnModeOverride ?? hasHookForEvent_2(agentDefinition, permissionMode);
  let cachedPermissionContext;
  let cachedAgentPermissionContext;
  function resolvePermissionContext(permissionContext) {
    if (permissionContext === cachedPermissionContext && cachedAgentPermissionContext)
      return cachedAgentPermissionContext;
    cachedPermissionContext = permissionContext;
    let resolved = permissionContext;
    let agentPermissionMode = agentDefinition.permissionMode;
    let modeSuppressed =
      spawnModeOverride !== undefined &&
      !isWebFetchAgent(agentDefinition) &&
      narrowerMode(spawnModeOverride, permissionContext.mode) === undefined;
    let declaredMode =
      spawnModeOverride ?? (spawnMode === "bubble" ? undefined : spawnMode) ?? agentPermissionMode;
    let suppressPromptsForPlan =
      permissionContext.mode === "plan" &&
      !isTeammate &&
      (modeSuppressed ||
        (!spawnModeOverride &&
          declaredMode !== undefined &&
          declaredMode !== "plan" &&
          declaredMode !== "bubble"));
    if (
      effectiveMode &&
      !modeSuppressed &&
      (spawnModeOverride ||
        !isBypassCapableMode(permissionContext.mode) ||
        (isTeammate && (permissionContext.mode === "plan" || effectiveMode === "plan")))
    ) {
      let mode = effectiveMode;
      let personalModeRefused =
        isRestrictedPersonalAgent(agentDefinition) &&
        narrowerMode(effectiveMode, permissionContext.mode) === undefined;
      if (
        !spawnModeOverride &&
        (personalModeRefused ||
          (settingsGrantsConfined() &&
            (effectiveMode === "bypassPermissions" ||
              effectiveMode === "acceptEdits" ||
              effectiveMode === "auto")))
      ) {
        logForDebugging(
          personalModeRefused
            ? `Agent '${agentDefinition.agentType}' asks for permission mode ${effectiveMode} in your own agent file. This session doesn't let your own agents widen their permission mode (CLAUDE_CODE_RESTRICT_PERSONAL_CONFIG), so it runs in '${permissionContext.mode}'.`
            : `Subagent declared permissionMode: ${effectiveMode} inside a confined evaluation run; keeping parent mode '${permissionContext.mode}'.`,
          {
            level: "warn",
          },
        );
        mode = permissionContext.mode;
      } else if (
        effectiveMode === "bubble" &&
        (permissionContext.mode === "plan" || permissionContext.mode === "dontAsk")
      )
        mode = permissionContext.mode;
      else if (effectiveMode === "bypassPermissions" && !isBypassPermissionsAuthorized(permissionContext)) {
        mode = permissionContext.mode;
        if (mode !== "bypassPermissions")
          logForDebugging(
            `Subagent ${spawnModeOverride ? "spawn-time permission mode" : "declared permissionMode"} bypassPermissions is not authorized by this session (parent not in bypass mode, bypass policy-disabled, session --restricted, or not a contained no-internet environment); keeping parent mode '${permissionContext.mode}'.`,
            {
              level: "warn",
            },
          );
      } else if (!spawnModeOverride)
        mode = fallbackFromUnavailableAutoMode(effectiveMode, permissionContext.mode, resolvedAgentModel);
      resolved = withClassifiedWebCalls(resolved, mode);
    }
    if (resolved.mode === "plan" && (isTeammate || (declaredMode !== undefined && declaredMode !== "bubble")))
      resolved = {
        ...resolved,
        isBypassPermissionsModeAvailable: false,
      };
    let hasRequestDialog = toolUseContext.requestDialog !== undefined;
    let hasPromptTool =
      getIsNonInteractiveSession() && hasPermissionPromptTool(getPermissionPromptToolName());
    let avoidPrompts =
      (suppressPromptsForPlan && (declaredMode === "dontAsk" || agentPermissionMode === "dontAsk")) ||
      (canShowPermissionPrompts !== undefined
        ? !canShowPermissionPrompts
        : effectiveMode === "bubble" || hasRequestDialog || hasPromptTool
          ? false
          : isAsync);
    if (avoidPrompts)
      resolved = {
        ...resolved,
        shouldAvoidPermissionPrompts: true,
      };
    if (isAsync && !avoidPrompts)
      resolved = {
        ...resolved,
        awaitAutomatedChecksBeforeDialog: true,
      };
    if (allowedTools !== undefined)
      resolved = {
        ...resolved,
        alwaysAllowRules: {
          cliArg: permissionContext.alwaysAllowRules.cliArg,
          ...(permissionContext.alwaysAllowRules.mcpServerPolicy && {
            mcpServerPolicy: permissionContext.alwaysAllowRules.mcpServerPolicy,
          }),
          session: [...allowedTools],
        },
      };
    resolved = withAgentDisallowedTools(resolved, agentDefinition);
    if (
      worktreePath &&
      !resolved.blockWritesOutsideWorkingDirectories &&
      !resolved.additionalWorkingDirectories.has(worktreePath)
    )
      resolved = {
        ...resolved,
        additionalWorkingDirectories: new Map([
          ...resolved.additionalWorkingDirectories,
          [
            worktreePath,
            {
              path: worktreePath,
              source: "session",
            },
          ],
        ]),
      };
    cachedAgentPermissionContext = resolved;
    return resolved;
  }
  let agentGetAppState = () => {
    let state = toolUseContext.getAppState();
    let statePermissionContext = resolvePermissionContext(state.toolPermissionContext);
    if (statePermissionContext === state.toolPermissionContext) return state;
    return {
      ...state,
      toolPermissionContext: statePermissionContext,
    };
  };
  let modelOverrides = [
    {
      kind: "model",
      mainLoopModel: resolvedAgentModel,
    },
    ...(agentDefinition.effort !== undefined
      ? [
          {
            kind: "effort",
            effort: agentDefinition.effort,
          },
        ]
      : []),
  ];
  let agentDepth = getAgentDepth(override?.agentContext ?? toolUseContext.agentContext);
  let memoryMode = memoryModeForSession(toolUseContext);
  let memoryCaller =
    toolUseContext.memoryCaller ??
    memoryCallerKind({
      isTeammate,
      isBackground: requestShape === "background",
    });
  let resolvedAgentTools = useExactTools
    ? undefined
    : resolveAgentTools(
        agentDefinition,
        webFetchReadmissionAllowed
          ? withWebFetchToolForAgent(agentDefinition, availableTools, toolPermissionContext, {
              depth: agentDepth,
              activeAgents: toolUseContext.options.agentDefinitions.activeAgents,
            })
          : availableTools,
        requestShape === "background",
        false,
        isTeammate,
        agentDepth,
        memoryMode.mode,
      );
  let repliedSuppressed = false;
  let agentTools = resolvedAgentTools?.resolvedTools ?? availableTools;
  let toolScope = resolvedAgentTools ? agentDefinition : override?.agentToolScope;
  let agentSystemPromptBlocks = override?.systemPrompt
    ? override.systemPrompt
    : asSystemPrompt(
        await getAgentSystemPrompt(
          agentDefinition,
          toolUseContext,
          resolvedAgentModel,
          totalTokensReminderBudget,
        ),
      );
  let appendSubagentSystemPrompt =
    !useExactTools &&
    !override?.isolatedContext &&
    isEnvTruthy(process.env.CLAUDE_CODE_ENABLE_APPEND_SUBAGENT_PROMPT) &&
    toolUseContext.options.appendSubagentSystemPrompt
      ? toolUseContext.options.appendSubagentSystemPrompt
      : undefined;
  let memoryNoteEnabled =
    !useExactTools &&
    !override?.isolatedContext &&
    !isWebFetchAgent(agentDefinition) &&
    !env.CLAUDE_CODE_MEMORY_SUBAGENT_APPEND;
  let memoryNote = memoryNoteEnabled ? memoryNoteIfEnabled(memoryMode) : undefined;
  let coworkMemoryOn = memoryNoteEnabled && !memoryMode.serverPending;
  let filtered = [appendSubagentSystemPrompt, memoryNote].filter((block) => block !== undefined);
  let systemPromptWithAppend =
    filtered.length === 0
      ? agentSystemPromptBlocks
      : asSystemPrompt([...agentSystemPromptBlocks, ...filtered]);
  let promptOptions = {
    customSystemPrompt: toolUseContext.options.customSystemPrompt,
    appendSystemPrompt: toolUseContext.options.appendSystemPrompt,
    systemPromptSnapshot:
      env.CLAUDE_CODE_SUBAGENT_PROMPT_SNAPSHOT && !useExactTools
        ? true
        : toolUseContext.options.systemPromptSnapshot,
  };
  let isContinuation = recordedUuids !== undefined && recordedUuids.size > 0;
  let hookMessages = [];
  let skillNames = uniq(agentDefinition.skills ?? []);
  let preloadNames = skillNames.slice(0, MAX_PRELOADED_SKILLS);
  if (skillNames.length > MAX_PRELOADED_SKILLS)
    logForDebugging(
      `[Agent: ${agentDefinition.agentType}] Warning: the skills list has ${skillNames.length} different names; only the first ${MAX_PRELOADED_SKILLS} are preloaded`,
      {
        level: "warn",
      },
    );
  let { hookContextCarried, carriedPreloads } = isContinuation
    ? await scanCarriedSubagentContext(initialMessages, preloadNames)
    : {
        hookContextCarried: false,
        carriedPreloads: new Set(),
      };
  let hookContexts = [];
  try {
    let agentContext = override?.agentContext ?? toolUseContext.agentContext;
    let startHookStream = isDelegatedObservationContext(agentContext)
      ? []
      : executeSubagentStartHooks(
          toolUseContext,
          agentId,
          agentDefinition.agentType,
          agentAbortController.signal,
          undefined,
          toolUseContext.sessionHooksRegistry,
          agentContext,
          {
            managedHooksOnly: isWebFetchAgent(agentDefinition),
          },
        );
    for await (let hookEvent of startHookStream) {
      let message = hookEvent.message;
      if (
        message?.type === "attachment" &&
        isLoggableMessage(message) &&
        message.attachment.type !== "hook_blocking_error" &&
        !override?.isolatedContext
      ) {
        initialMessages.push(message);
        hookMessages.push(message);
      }
      if (hookEvent.blockingError && !override?.isolatedContext) {
        let nonBlockableHookErrorMessage = getNonBlockableHookErrorMessage(
          "SubagentStart",
          hookEvent.blockingError,
          `SubagentStart:${agentDefinition.agentType}`,
        );
        initialMessages.push(nonBlockableHookErrorMessage);
        hookMessages.push(nonBlockableHookErrorMessage);
      }
      if (hookEvent.additionalContexts && hookEvent.additionalContexts.length > 0)
        hookContexts.push(...hookEvent.additionalContexts);
    }
  } catch (error) {
    if (!(error instanceof StreamClosedAbortError)) throw error;
    logForDebugging("SubagentStart hooks cancelled (control stream closed)");
  }
  if (hookContexts.length > 0 && !override?.isolatedContext && !hookContextCarried) {
    let attachmentMessage = createAttachmentMessage({
      type: "hook_additional_context",
      content: hookContexts,
      hookName: "SubagentStart",
      toolUseID: randomUUID(),
      hookEvent: "SubagentStart",
    });
    initialMessages.push(attachmentMessage);
    hookMessages.push(attachmentMessage);
  }
  if (coworkMemoryOn && memoryMode.mode !== "none" && isContinuation)
    insertCoworkMemoryContexts(toolUseContext.session.host, initialMessages);
  let staleMemoryAttachment = memoryNoteEnabled
    ? getStaleMemoryContextAttachment(
        toolUseContext.session.host,
        messagesSinceCompactBoundary(initialMessages),
      )
    : undefined;
  if (staleMemoryAttachment !== undefined) {
    let attachmentMessage = createAttachmentMessage(staleMemoryAttachment);
    initialMessages.push(attachmentMessage);
    hookMessages.push(attachmentMessage);
  }
  let coworkMemoryAttachment = coworkMemoryOn
    ? coworkMemoryContextMode(
        toolUseContext.session.host,
        getLatestCoworkMemoryVersion(messagesSinceCompactBoundary(initialMessages)),
        memoryMode.mode === "none",
      )
    : undefined;
  if (coworkMemoryAttachment !== undefined) {
    let attachmentMessage = createAttachmentMessage(coworkMemoryAttachment);
    initialMessages.push(attachmentMessage);
    hookMessages.push(attachmentMessage);
    let anchorAttachment = buildAnchorAttachment(coworkMemoryAttachment);
    if (anchorAttachment !== undefined) {
      let contextMessage = createAttachmentMessage(anchorAttachment);
      initialMessages.push(contextMessage);
      hookMessages.push(contextMessage);
    }
  }
  let hooksTrusted = !isRestrictedToPluginOnly("hooks") || isSourceAdminTrusted(agentDefinition.source);
  toolUseContext.sessionHooksRegistry.clear(agentId);
  if (hasFrontmatterHooks(agentDefinition.hooks) && hooksTrusted)
    if (isAgentDefinitionTrusted(agentDefinition))
      registerFrontmatterHooks(
        toolUseContext.sessionHooksRegistry,
        agentId,
        agentDefinition.hooks,
        `agent '${agentDefinition.agentType}'`,
        true,
        isRestrictedPersonalAgent(agentDefinition),
        isRepoFrontmatterHookRestricted(agentDefinition.source),
        agentDefinition.source === "plugin" ? agentDefinition.plugin : undefined,
      );
    else checkAgentOriginTrust(agentDefinition, "subagent");
  let { clients, agentClients, tools, cleanup } = await initializeAgentMcpServers(
    agentDefinition,
    toolUseContext.options.mcpClients,
    onMcpServersBlocked,
    toolUseContext.storageV5,
    toolUseContext.credentials,
  );
  let { isToolDisallowed } = buildDisallowedToolsFilter(agentDefinition.disallowedTools);
  let filtered_2 = warnMcpToolNameTooLong(tools).filter(
    (tool) => !isToolDisallowed(tool) && !isServedAccountMemoryTool(tool, memoryMode.mode),
  );
  let agentToolPool =
    filtered_2.length > 0 ? uniqByExport([...agentTools, ...filtered_2], "name") : agentTools;
  let memoryToolCount = count(availableTools, (tool) => tool.mcpInfo?.accountMemoryServer === true);
  if (memoryToolCount > 0)
    logEvent("tengu_subagent_memory_tools", {
      mode: fromEnum(memoryMode.mode),
      mode_source: fromEnum(memoryMode.source),
      marked_as: fromEnum(memoryCaller),
      parent_tools: memoryToolCount,
      kept_tools: count(agentToolPool, (tool) => tool.mcpInfo?.accountMemoryServer === true),
      exact_tools: useExactTools ?? false,
      note_appended: memoryNote !== undefined,
      block_attached: coworkMemoryAttachment?.content != null,
    });
  if (agentToolPool.length === 0) {
    let invalidTools = resolvedAgentTools?.invalidTools ?? [];
    let unavailableTools = resolvedAgentTools?.unavailableTools ?? [];
    let filtered = (resolvedAgentTools?.validTools ?? []).filter(
      (name) =>
        !isToolDisallowed({
          name,
        }),
    );
    let joined = [
      invalidTools.length ? `unrecognized [${invalidTools.join(", ")}]` : "",
      unavailableTools.length ? `not available to subagents [${unavailableTools.join(", ")}]` : "",
      filtered.length ? `recognized but matched no tools in this session [${filtered.join(", ")}]` : "",
    ]
      .filter(Boolean)
      .join("; ");
    let zeroToolsRefused =
      joined !== "" &&
      resolvedAgentTools !== undefined &&
      !resolvedAgentTools.hasWildcard &&
      availableTools.length > 0 &&
      !isContinuation;
    logEvent("tengu_subagent_zero_tools", {
      isBuiltIn: agentDefinition.source === "built-in",
      invalidCount: invalidTools.length,
      unavailableCount: unavailableTools.length,
      validButEmptyCount: filtered.length,
      availablePoolSize: availableTools.length,
      hadWildcard: resolvedAgentTools?.hasWildcard ?? false,
      isContinuation,
      refused: zeroToolsRefused,
      isAsync,
    });
    if (zeroToolsRefused) {
      logFeatureBad("subagent_tool_resolution", "zero_tools_refused", {
        invalid_count: invalidTools.length,
        unavailable_count: unavailableTools.length,
        is_async: isAsync,
      });
      await cleanup();
      toolUseContext.sessionHooksRegistry.clear(agentId);
      clearAgentTranscriptSubdir(agentId);
      unregisterPerfettoAgent(agentId);
      throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
        `Agent '${agentDefinition.agentType}' would be spawned with zero tools \u2014 refusing. ` +
          `Its tools list resolved to nothing: ${joined}. Fix the agent's tools frontmatter or pass a different subagent_type.`,
        "subagent zero-tool spawn refused",
      );
    }
  }
  if (resolvedAgentTools !== undefined) {
    let unavailableCount = count(
      resolvedAgentTools.unavailableTools,
      (name) =>
        !isToolDisallowed({
          name: permissionRuleValueFromString(name).toolName,
        }),
    );
    let resolutionTelemetry = {
      agent_depth: agentDepth,
      spawn_depth_cap: getMaxSubagentSpawnDepth(),
      is_async: isAsync,
      is_continuation: isContinuation,
      invalid_count: resolvedAgentTools.invalidTools.length,
      self_disallowed_overlap_count: resolvedAgentTools.unavailableTools.length - unavailableCount,
    };
    if (resolvedAgentTools.declaredAgentToolWithheld || unavailableCount > 0)
      logFeatureSad(
        "subagent_tool_resolution",
        resolvedAgentTools.declaredAgentToolWithheld
          ? "declared_agent_withheld"
          : "declared_tools_unavailable",
        {
          ...resolutionTelemetry,
          unavailable_count: unavailableCount,
        },
      );
    else
      logFeatureOk("subagent_tool_resolution", {
        ...resolutionTelemetry,
        agent_tool_removed_by_depth: resolvedAgentTools.agentToolRemovedByDepth === true,
        has_wildcard: resolvedAgentTools.hasWildcard,
      });
  }
  let any = agentToolPool.some((tool) => toolMatchesName(tool, SUBAGENTHANDBACK) && tool !== handbackTool);
  let handbackNameTaken = false;
  let handbackArmed =
    handbackOptIn === true &&
    !useExactTools &&
    !requiresStructuredOutput &&
    handbackTool !== undefined &&
    !any &&
    isAutoHandbackArmed(toolPermissionContext) &&
    !handbackNameTaken &&
    resolvePermissionContext(toolPermissionContext).mode === "auto";
  let handbackReason = handbackArmed
    ? undefined
    : handbackOptIn !== true
      ? "no_opt_in"
      : useExactTools
        ? "exact_tools"
        : requiresStructuredOutput
          ? "schema"
          : handbackTool === undefined
            ? "no_tool"
            : any
              ? "name_taken"
              : toolPermissionContext.mode !== "auto"
                ? "spawner_mode"
                : !isAutoHandbackArmed(toolPermissionContext)
                  ? "switched_off"
                  : "child_mode";
  recordHandbackContract(agentId, handbackArmed, handbackReason);
  if (handbackArmed && !agentToolPool.includes(handbackTool))
    agentToolPool = [...agentToolPool, handbackTool];
  let assembleTools =
    !useExactTools &&
    (agentDefinition.tools ?? ["*"]).some(
      (toolSpec) => toolSpec === "*" || mcpInfoFromString(toolSpec) !== null,
    )
      ? assembleAvailableTools
      : undefined;
  try {
    let filtered = preloadNames.filter((skillName) => !carriedPreloads.has(skillName));
    if (filtered.length > 0) {
      let hiddenPlugins = getHeldBackSyncedPlugins();
      let skillCommands = dropSyncedClashes(
        withNamedFolderYieldsRestored(
          await getSkillToolCommands(getProjectRootOrNull(), toolUseContext.storageV5, hiddenPlugins),
        ),
        toolUseContext.getAppState().mcp.commands,
      );
      let hiddenSyncedSkills = await getHiddenSyncedSkills(
        getProjectRootOrNull(),
        toolUseContext.storageV5,
        hiddenPlugins,
      );
      let syncedSkillCommands = hiddenPlugins.size === 0 ? [] : getSyncedSkillCommands();
      let isSyncedButMissing = (skillName) =>
        syncedSkillCommands.some((command) =>
          [command.name, ...(command.aliases ?? [])].some((alias) => foldName(alias) === foldName(skillName)),
        ) && findCommand(skillName, skillCommands) === undefined;
      let preloadedSkills = [];
      let allSkills = await findRefusedSyncedCommands(skillCommands);
      let vetoRefreshPromise;
      for (let skillName of filtered) {
        let skill =
          findCommand(skillName, hiddenSyncedSkills) === undefined && !isSyncedButMissing(skillName)
            ? findSkillForAgent(skillName, skillCommands, agentDefinition)
            : undefined;
        if (!skill) {
          logForDebugging(
            `[Agent: ${agentDefinition.agentType}] Warning: Skill '${skillName}' specified in frontmatter was not found`,
            {
              level: "warn",
            },
          );
          continue;
        }
        if (skill.type !== "prompt") {
          logForDebugging(
            `[Agent: ${agentDefinition.agentType}] Warning: Skill '${skillName}' is not a prompt-based skill`,
            {
              level: "warn",
            },
          );
          continue;
        }
        if (!isCommandEnabled(skill)) {
          logForDebugging(
            `[Agent: ${agentDefinition.agentType}] Warning: Skill '${skillName}' is disabled by policy`,
            {
              level: "warn",
            },
          );
          continue;
        }
        if (isKilledHostCatalogSkill(skill)) {
          logForDebugging(
            `[Agent: ${agentDefinition.agentType}] Warning: Skill '${skillName}' is turned off by the organization's Skills setting`,
            {
              level: "warn",
            },
          );
          continue;
        }
        if (isSyncedSkill(skill) && (vetoRefreshPromise ??= refreshVetoAndRead())) {
          logForDebugging(
            `[Agent: ${agentDefinition.agentType}] Warning: Skill '${skillName}' is an account-synced skill and skills sync is currently disabled (turned off or denied by policy)`,
            {
              level: "warn",
            },
          );
          continue;
        }
        let refusalReason = allSkills.get(skill);
        if (refusalReason !== undefined) {
          logSyncedCommandRefused(skill, refusalReason);
          continue;
        }
        preloadedSkills.push({
          skillName,
          skill,
        });
      }
      let { formatSkillLoadingMetadata } =
        await import("../../utils/processUserInput/processSlashCommand.js");
      let skillAbortController = new PromptScopedAbortController(toolUseContext.abortController);
      let skillPrompts = await Promise.all(
        preloadedSkills.map(async ({ skillName, skill }) => {
          let promptShellHandOff = [];
          let content = await applySkillPromptHooks(
            skillName,
            await skill.getPromptForCommand("", {
              ...toolUseContext,
              abortController: skillAbortController,
              promptShellHandOff,
              session: activeSession,
              options: {
                ...toolUseContext.options,
                isSkillPreload: true,
                tools: agentToolPool,
              },
            }),
            skill,
          );
          return {
            skillName,
            skill,
            content,
            promptShellHandOff,
          };
        }),
      ).catch((error) => {
        skillAbortController.abort();
        throw error;
      });
      for (let { skillName, skill, content, promptShellHandOff } of skillPrompts) {
        logForDebugging(`[Agent: ${agentDefinition.agentType}] Preloaded skill '${skillName}'`);
        logAgentSkillPreloadSafely(skill, agentId, builtInCommandNames().has(skill.name));
        let metadata = formatSkillLoadingMetadata(skillName, skill.progressMessage);
        let userMessage = createUserMessage({
          content: [
            {
              type: "text",
              text: metadata,
            },
            ...content,
          ],
          isMeta: true,
          ...(promptShellHandOff.length > 0 && {
            promptShellHandOff: {
              agentId,
              commands: promptShellHandOff,
            },
          }),
        });
        initialMessages.push(userMessage);
        hookMessages.push(userMessage);
      }
    }
  } catch (error) {
    await cleanup();
    throw error;
  }
  let deferredToolsState =
    stickyBetas ??
    (useExactTools
      ? forkContextMessages !== undefined
        ? cloneStickyBetaLatches(toolUseContext.stickyBetas ?? getStickyBetas())
        : withKeepaliveReset(
            clearAdvisorHeldAndReturn(forkStickyBetaLatches(toolUseContext.stickyBetas ?? getStickyBetas())),
          )
      : createStickyBetaLatches());
  let extraAttachments = [];
  if (!useExactTools || forkContextMessages === undefined) {
    let sinceCompact = messagesSinceCompactBoundary(initialMessages);
    if (!deferredToolsState.declaredToolsDecided)
      try {
        seedWireShapeFromRecord(
          deferredToolsState,
          snapshotIfEnabled(initialMessages, promptOptions)?.wireShape,
          resolvedAgentModel,
        );
        mergeNameOnlyAnnouncements(deferredToolsState, recordedDeferredTools(sinceCompact));
      } catch (error) {
        logError(error);
      }
    let toolPermissionContext = getToolPermissionContext({
      getAppState: agentGetAppState,
      permissionLayers: [...(toolUseContext.permissionLayers ?? []), ...modelOverrides],
    });
    for (let deferredToolsAttachment of await getDeferredToolsDeltaAttachments(
      agentToolPool,
      resolvedAgentModel,
      initialMessages,
      {
        callSite: "attachments_subagent",
        querySource,
      },
      undefined,
      undefined,
      undefined,
      undefined,
      getDeclaredToolSource(
        deferredToolsState,
        sinceCompact,
        promptOptions,
        agentToolPool,
        toolPermissionContext,
      ),
      buildDeferredToolsLatchContextFrom(
        deferredToolsState,
        assembleTools !== undefined,
        toolPermissionContext,
        toolUseContext.options.agentDefinitions,
        querySource,
      ),
      undefined,
      promptOptions,
    )) {
      let attachmentMessage = createAttachmentMessage(deferredToolsAttachment);
      initialMessages.push(attachmentMessage);
      extraAttachments.push(attachmentMessage);
    }
  }
  for (let sandboxAttachment of getSandboxInstructionsAttachments(agentToolPool, initialMessages)) {
    let attachmentMessage = createAttachmentMessage(sandboxAttachment);
    initialMessages.push(attachmentMessage);
    extraAttachments.push(attachmentMessage);
  }
  if (
    !useExactTools &&
    !isContinuation &&
    hasSendMessageTool(agentToolPool) &&
    !initialMessages.some(
      (initialMessage) =>
        initialMessage.type === "user" &&
        initialMessage.isMeta === true &&
        typeof initialMessage.message.content === "string" &&
        initialMessage.message.content.includes(OTHER_AGENTS_NOTE),
    )
  ) {
    let sorted = [...toolUseContext.getAppState().agentNameRegistry]
      .filter(([, otherAgentId]) => otherAgentId !== agentId)
      .map(([agentId]) => agentId)
      .sort();
    if (sorted.length > 0) {
      let mainLabel = escapeXmlText([MAIN, ...sorted].join(", "));
      let userMessage = createUserMessage({
        content: wrapInSystemReminder(`${OTHER_AGENTS_NOTE}({to: name, message}): ${mainLabel}.`),
        isMeta: true,
      });
      initialMessages.push(userMessage);
      extraAttachments.push(userMessage);
    }
  }
  let taskEntry = toolUseContext.taskRegistry.get(agentId);
  if (
    handbackOptIn === true &&
    (isSendMessageHandbackEnabled() || handbackContractOf(taskEntry) !== undefined)
  )
    toolUseContext.taskRegistry.update(agentId, (task) => ({
      ...task,
      ...resolveHandbackRecipient({
        contract: handbackArmed,
        registered: {
          recipient: task.handbackRecipient,
        },
        callerInbox: task.parentAgentId ?? mainAgentId(),
        resumerInbox: toolUseContext.agentId ?? mainAgentId(),
        inboxReadable: (from) => shouldNotifyTeammateLifecycle(from, toolUseContext.taskRegistry),
      }),
    }));
  let latestHandbackReminder = findLatestHandbackReminder(initialMessages);
  if (handbackArmed && latestHandbackReminder !== "reminder") {
    let userMessage = createUserMessage({
      content: wrapInSystemReminder(buildHandbackInstruction(hasSendMessageTool(agentToolPool))),
      isMeta: true,
    });
    initialMessages.push(userMessage);
    extraAttachments.push(userMessage);
  } else if (!handbackArmed && handbackOptIn === true && latestHandbackReminder === "reminder") {
    let userMessage = createUserMessage({
      content: wrapInSystemReminder(handbackCountermandText()),
      isMeta: true,
    });
    initialMessages.push(userMessage);
    extraAttachments.push(userMessage);
  }
  let taskOptions = {
    runQuery: toolUseContext.options.runQuery,
    isNonInteractiveSession: useExactTools
      ? toolUseContext.options.isNonInteractiveSession
      : (requestNonInteractive ??
        spawnRequestShape(requestShape === "background", toolUseContext.options.isNonInteractiveSession)
          .requestNonInteractive),
    ...promptOptions,
    ...(override?.isolatedContext && {
      isolatedContext: true,
    }),
    ...((agentDefinition.agentType === "Explore" || agentDefinition.agentType === "Plan") && {
      omitGitStatus: true,
    }),
    ...(managedInstructionsOnly && {
      managedInstructionsOnly: true,
    }),
    ...{},
    appendSubagentSystemPrompt: toolUseContext.options.appendSubagentSystemPrompt,
    spawnedBySkill,
    spawnedByForkedSkill,
    tools: agentToolPool,
    toolCatalog: toolUseContext.options.toolCatalog,
    commands: [],
    debug: toolUseContext.options.debug,
    verbose: toolUseContext.options.verbose,
    mainLoopModel: resolvedAgentModel,
    fallbackModel: toolUseContext.options.fallbackModel,
    thinkingConfig: applySubagentThinkingDisplay(toolUseContext.options.thinkingConfig, {
      useExactTools: useExactTools ?? false,
      forwardSubagentText: toolUseContext.options.forwardSubagentText ?? false,
      isAsync: requestShape === "background",
      isNonInteractiveSession: getIsNonInteractiveSession(),
      sessionDisplayExplicit: getThinkingDisplayExplicit(),
      isRemoteWorker:
        env.CLAUDE_CODE_REMOTE === true ||
        Boolean(env.CLAUDE_CODE_REMOTE_SESSION_ID) ||
        Boolean(env.CLAUDE_CODE_REMOTE_ENVIRONMENT_TYPE),
      isChatOriginCoworkSession: isClaudeAiChatCowork(),
    }),
    forwardSubagentText: toolUseContext.options.forwardSubagentText,
    refreshTools:
      assembleTools !== undefined
        ? createGrowingToolList(
            agentToolPool,
            () => toolUseContext.getAppState().mcp.tools,
            () => toolUseContext.options.refreshTools?.() ?? toolUseContext.options.tools,
            (entry) => {
              let memoryModeAgain = memoryModeForSession(toolUseContext);
              return resolveAgentTools(
                agentDefinition,
                assembleTools(entry),
                requestShape === "background",
                false,
                isTeammate,
                agentDepth,
                memoryModeAgain.serverPending ? "none" : memoryModeAgain.mode,
              ).resolvedTools;
            },
          )
        : undefined,
    mcpClients: clients,
    refreshMcpClients: toolUseContext.options.refreshMcpClients
      ? () => {
          let mcpClients = toolUseContext.options.refreshMcpClients();
          return agentClients.length > 0 ? [...mcpClients, ...agentClients] : mcpClients;
        }
      : undefined,
    mcpResources: toolUseContext.options.mcpResources,
    agentDefinitions: toolUseContext.options.agentDefinitions,
    messageClientPlatform: toolUseContext.options.messageClientPlatform,
    messageInboundOrigin: toolUseContext.options.messageInboundOrigin,
    toolAliases: toolUseContext.options.toolAliases,
    autoCompactWindow:
      agentDefinition.agentType === FORK && isBuiltInAgent(agentDefinition)
        ? toolUseContext.options.autoCompactWindow
        : withAutoCompactCeiling(toolUseContext.options.autoCompactWindow, agentDefinition.autoCompactWindow),
    maxBudgetUsd: toolUseContext.options.maxBudgetUsd,
    ...(totalTokensReminderBudget === undefined && override?.parentSystemPrompt
      ? {
          totalTokensReminderBudget: toolUseContext.options.totalTokensReminderBudget,
          isTotalTokensReminderBudgetOnTopOfStart:
            toolUseContext.options.isTotalTokensReminderBudgetOnTopOfStart,
        }
      : {
          totalTokensReminderBudget,
          isTotalTokensReminderBudgetOnTopOfStart,
        }),
    fastMode: toolUseContext.options.fastMode,
    cacheBreakerPhrase: toolUseContext.options.cacheBreakerPhrase,
    activeGoal: toolUseContext.options.activeGoal,
    ultraplanSessionUrl: toolUseContext.options.ultraplanSessionUrl,
    ...(useExactTools && {
      querySource,
    }),
    requiresStructuredOutput,
    ...(structuredOutputIsHandback === true && {
      structuredOutputIsHandback: true,
    }),
    ...(handbackArmed && {
      requiresHandback: true,
    }),
  };
  onToolPool?.(() => taskOptions.refreshTools?.() ?? agentToolPool);
  let subagentContext = createSubagentContext(toolUseContext, {
    options: taskOptions,
    session: activeSession,
    agentId,
    isBackgroundAgent:
      isAsync &&
      !(
        override?.agentContext?.agentType === "subagent" && override.agentContext.isBackgroundAgent === false
      ),
    memoryCaller,
    agentType: agentDefinition.agentType,
    agentContext: override?.agentContext,
    requireCanUseTool: override?.requireCanUseTool,
    spawnedByWorkflowRunId,
    teammateContext,
    messages: initialMessages,
    inheritedVerifiedHumanTurns:
      forkContextMessages === toolUseContext.messages ? undefined : buildVerifiedHumanTurns(toolUseContext),
    inheritedMcpSkillMessages:
      forkContextMessages === toolUseContext.messages
        ? undefined
        : [...(toolUseContext.inheritedMcpSkillMessages ?? []), ...emptyList(toolUseContext.messages)],
    readFileState,
    abortController: agentAbortController,
    getAppState: agentGetAppState,
    permissionLayers: modelOverrides,
    primitiveToolGrant: toolScope === undefined ? undefined : resolveAgentToolNames(toolScope),
    shareSetAppState: !isAsync,
    shareFileHistory: override?.shareFileHistory,
    criticalSystemReminder_EXPERIMENTAL: agentDefinition.criticalSystemReminder_EXPERIMENTAL,
    contentReplacementState,
  });
  if (override?.onRetryStatus) subagentContext.onRetryStatus = override.onRetryStatus;
  if (override?.subscribeRetryWake) subagentContext.subscribeRetryWake = override.subscribeRetryWake;
  if (worktreePath) subagentContext.agentWorktree = worktreePath;
  for (let envAttachment of await getEnvironmentChangeAttachments(subagentContext, initialMessages)) {
    let attachmentMessage = createAttachmentMessage(envAttachment);
    initialMessages.push(attachmentMessage);
    extraAttachments.push(attachmentMessage);
  }
  for (let skillAttachment of await getSkillListingAttachmentsLazy(
    subagentContext,
    messagesSinceCompactBoundary(initialMessages),
  ).catch((error) => {
    logForDebugging(
      `[Agent: ${agentDefinition.agentType}] Failed to compute skill listing attachment: ${error}`,
      {
        level: "error",
      },
    );
    return [];
  })) {
    let attachmentMessage = createAttachmentMessage(skillAttachment);
    initialMessages.push(attachmentMessage);
    extraAttachments.push(attachmentMessage);
  }
  let noticeAttachment =
    isRemoteToolForwardingSwitchOn() &&
    !override?.isolatedContext &&
    !isDelegatedObservationContext(subagentContext.agentContext)
      ? isolationRuntimeService().remote?.noticeAttachment
      : undefined;
  if (noticeAttachment !== undefined)
    try {
      for (let noticeMessage of await noticeAttachment(subagentContext, initialMessages, "attachment_scan")) {
        let attachmentMessage = createAttachmentMessage(noticeMessage);
        initialMessages.push(attachmentMessage);
        extraAttachments.push(attachmentMessage);
      }
    } catch (error) {
      if (isAbortError(error)) logForDebugging("Attached-machines notice skipped (spawn aborted)");
      else logError(error);
    }
  if (preserveToolUseResults) subagentContext.preserveToolUseResults = true;
  if (persistedToolResultFiles) subagentContext.persistedToolResultFiles = persistedToolResultFiles;
  let pendingResult = null;
  let pendingError = null;
  subagentContext.stickyBetas = deferredToolsState;
  let evictCacheOnComplete = isPlainSpawnShape({
    stickyBetas,
    useExactTools,
    name,
    recordedUuids,
  });
  if (onCacheSafeParams) {
    let allMessages = [...initialMessages];
    pendingResult = allMessages;
    onCacheSafeParams(
      {
        systemPrompt: systemPromptWithAppend,
        userContext: userContext_2,
        systemContext,
        toolUseContext: subagentContext,
        forkContextMessages: initialMessages,
        advisorModel: subagentContext.getAdvisorSetting(),
        stickyBetas: deferredToolsState,
        agentCacheTtlOverride: agentDefinition.cacheTtl,
      },
      () => allMessages,
    );
  }
  if (compactTranscriptUnavailable) subagentContext.compactTranscriptUnavailable = true;
  let beforeLoop = initialMessages;
  let loopError = null;
  if (recordedUuids !== undefined) {
    let lastIndex = initialMessages.findLastIndex((initialMessage) => recordedUuids.has(initialMessage.uuid));
    beforeLoop = initialMessages.slice(lastIndex + 1);
    let lastIndex_2 = initialMessages.findLastIndex(
      (initialMessage, message) =>
        message <= lastIndex &&
        recordedUuids.has(initialMessage.uuid) &&
        !isReorderedRow(initialMessage.uuid),
    );
    loopError = lastIndex_2 >= 0 ? initialMessages[lastIndex_2].uuid : null;
  } else if (
    forkContextMessages !== undefined &&
    forkContextMessages === toolUseContext.messages &&
    toolUseContext.agentId === undefined
  ) {
    let uuid = messages.findLast(
      (message) => isLoggableMessage(message) && !isReorderedRow(message.uuid),
    )?.uuid;
    if (uuid !== undefined) {
      beforeLoop = initialMessages.slice(messages.length);
      subagentContext.compactTranscriptUnavailable = true;
      recordForkContextRef(
        {
          agentId,
          parentSessionId: getSessionId(),
          parentLastUuid: uuid,
          contextLength: messages.length,
        },
        toolUseContext.storageV5,
      ).catch(logForkContextRefFailure);
    }
  }
  let appendedCount = initialMessages.length - beforeLoop.length;
  let max = Math.max(appendedCount, messages.length);
  let spliced = initialMessages.splice(max);
  pendingResult?.splice(max);
  let rowSource = orderedRowSource({
    agentId,
    keep: (message) => {
      initialMessages.push(...message);
      pendingResult?.push(...message);
    },
    rows: () => initialMessages,
    isHookable: hooksEnabled,
  });
  for (let message of spliced) {
    let pendingText =
      message.type === "user" &&
      message.isMeta !== true &&
      promptMessages.some((promptMessage) => promptMessage.uuid === message.uuid);
    await appendRowsWithHooks(
      rowSource,
      [message],
      pendingText
        ? {
            door: "prompt",
          }
        : {},
    );
  }
  beforeLoop = initialMessages.slice(appendedCount);
  recordSidechainTranscript(beforeLoop, agentId, loopError, toolUseContext.storageV5).catch(
    logSidechainFailure,
  );
  let recordSidechain = recordedUuids !== undefined || extraMetadata !== undefined;
  if (!recordSidechain && !worktreePath && toolUseContext.agentWorktree) recordSpawnedAgentIsolation(agentId);
  if (!recordSidechain) {
    recordSpawnProvenance(agentId, toolUseContext);
    if (
      isUnknownPluginSpawnedAgent({
        hookCaller: toolUseContext.hookCaller,
        pluginUnnamed: toolUseContext.pluginUnnamed,
      })
    )
      addUnnamedSteered(agentId);
    if (agentDefinition.agentType === FORK && isBuiltInAgent(agentDefinition))
      recordForwardedTurnsDelivered(
        {
          agentId,
          deliveringLoop: toolUseContext.agentId,
        },
        forkContextMessages ?? [],
      );
  }
  persistAgentMetadata(
    agentId,
    recordSidechain,
    {
      agentType: agentDefinition.agentType,
      ...(agentDefinition.agentType === FORK && {
        isFork: isBuiltInAgent(agentDefinition),
      }),
      isBuiltIn: isBuiltInAgent(agentDefinition),
      ...(worktreePath && {
        worktreePath,
      }),
      ...(!recordSidechain &&
        !worktreePath &&
        toolUseContext.agentWorktree && {
          inheritedWorktreePath: toolUseContext.agentWorktree,
          spawnedWithWorktree: true,
        }),
      ...(worktreePath && {
        spawnedWithWorktree: true,
      }),
      ...(worktreePath &&
        worktreeBranch && {
          worktreeBranch,
        }),
      ...(isHookOrPluginSteered(toolUseContext) && {
        pluginSteered: true,
      }),
      ...(cwd && {
        cwd,
      }),
      ...(launchedWithDefaults && {
        launchedWithDefaults: true,
      }),
      ...(spawnModeOverride && {
        spawnMode: spawnModeOverride,
      }),
      ...(description && {
        description,
      }),
      ...(name && {
        name,
      }),
      ...(workflowPhase && {
        workflowPhase,
      }),
      ...(toolUseId && {
        toolUseId,
      }),
      ...false,
      ...(toolUseContext.agentId && {
        parentAgentId: toolUseContext.agentId,
      }),
      ...(override?.agentContext !== undefined && {
        spawnDepth: getAgentDepth(override.agentContext),
      }),
      requestShape,
      requestNonInteractive: taskOptions.isNonInteractiveSession,
      ...(model && {
        model,
      }),
      ...(!model &&
        !recordSidechain &&
        toolUseContext.agentId &&
        resolvedAgentModel === parentModel &&
        parentModel !== getMainLoopModel() && {
          model: parentModel,
        }),
      ...(effort && {
        effort,
      }),
      ...extraMetadata,
    },
    toolUseContext.storageV5,
  ).catch(logAgentMetadataWriteFailure);
  let recorder = new SidechainRecorder(
    {
      isLoggableMessage,
      recordSidechainTranscript,
      registerTranscriptExitDrain,
      transcriptCursorEnd,
    },
    agentId,
    beforeLoop.findLast(isLoggableMessage)?.uuid ?? loopError,
    recordedUuids,
    toolUseContext.storageV5,
    agentAbortController.signal,
  );
  if (recordedUuids) {
    for (let message of beforeLoop) if (isLoggableMessage(message)) recordedUuids.add(message.uuid);
  }
  let gotResult = false;
  let abortedEarly = false;
  let finalResult;
  let resultMessages = [];
  let lastTokenCount = 0;
  let lastTurnTokens = 0;
  let turnCount = 0;
  let sawStructuredOutput = false;
  let toolUseCount = 0;
  let onMessage = (message) => {
    let now = Date.now();
    if (!message && now - turnCount < STREAM_TOKEN_ESTIMATE_THROTTLE_MS) return;
    let contextLeft = Math.floor(lastTokenCount) - lastTurnTokens;
    if (contextLeft <= 0) return;
    turnCount = now;
    lastTurnTokens += contextLeft;
    onStreamTokenEstimate?.({
      type: "tokens",
      estimatedTokensDelta: contextLeft,
    });
  };
  let finish = () => {
    if (sawStructuredOutput) {
      if (lastTurnTokens > 0)
        onStreamTokenEstimate?.({
          type: "tokens",
          estimatedTokensDelta: -lastTurnTokens,
        });
    } else
      onStreamTokenEstimate?.({
        type: "response_start",
      });
    lastTokenCount = 0;
    lastTurnTokens = 0;
    turnCount = 0;
    toolUseCount = 0;
    sawStructuredOutput = true;
  };
  let onEnd = () => {
    onMessage(true);
    sawStructuredOutput = false;
  };
  let streamCallbacks = {
    onSetStreamMode: (mode) =>
      resultMessages.push({
        type: "spinner_mode",
        mode,
      }),
    ...(onStreamTokenEstimate && {
      onUpdateLength: (length) => {
        lastTokenCount += length / 4;
        onMessage(false);
      },
    }),
    onApiMetrics: (metrics) => {
      if (onStreamTokenEstimate) {
        if (metrics.type === "content_block_start") toolUseCount = 0;
        else if (metrics.type === "thinking_progress") {
          toolUseCount += metrics.estimatedTokensDelta;
          lastTokenCount += metrics.estimatedTokensDelta;
          onMessage(false);
        } else if (metrics.type === "thinking_signature") {
          let approxTokens = Math.ceil(metrics.chars / 4);
          if (approxTokens > toolUseCount) {
            lastTokenCount += approxTokens - toolUseCount;
            toolUseCount = approxTokens;
            onMessage(false);
          }
        }
      }
      if (metrics.type !== "start" && metrics.type !== "end") return;
      if (metrics.type === "start") {
        finalResult = randomUUID();
        resultMessages.push({
          type: "api_metrics",
          event: {
            type: "start",
            ttftMs: metrics.ttftMs,
            id: finalResult,
          },
        });
      } else if (finalResult != null) {
        resultMessages.push({
          type: "api_metrics",
          event: {
            type: "end",
            outputTokens: metrics.outputTokens,
            id: finalResult,
          },
        });
        finalResult = undefined;
      }
    },
  };
  let queryOptions = {
    isSubagent: true,
  };
  let loopPromise;
  let worktrees = [];
  let isolationKey = `isolation:${agentId}`;
  let autoModeNotes = autoModeUnavailableNotes.of(activeSession.host);
  autoModeNotes.set(agentId, undefined);
  try {
    if (worktreePath && isSameRepoWorktree(worktreePath, [getOriginalCwd(), getProjectRoot()]))
      registerSandboxWriteDirectory(worktreePath, isolationKey);
    taskHandle = executeInSpan({
      agentId,
      agentType: agentDefinition.agentType,
      isBuiltIn: isBuiltInAgent(agentDefinition),
      parentAgentId: toolUseContext.agentId,
    });
    await restoreResumedAgentBaseline(agentId, {
      resumed:
        override?.agentContext?.agentType === "subagent" && override.agentContext.invocationKind === "resume",
      storageV5: toolUseContext.storageV5,
    });
    yield* hookMessages;
    yield* extraAttachments;
    using runningTurn = runningTurnRegistry.running(
      agentId,
      orderedRowSource({
        agentId,
        keep: (message) => {
          pendingResult?.push(...message);
        },
        keepArrived: (message) => {
          pendingResult?.push(...message);
          recorder.record(message);
        },
        rows: () => pendingResult ?? initialMessages,
        isHookable: rowSource.isHookable,
      }),
    );
    let turnOptions = {
      filterUnresolvedToolUses: normalizeMessagesForResume,
      normalizeMessagesForAPI,
    };
    let turnResult =
      waitingToolUse &&
      findWaitingToolCall(initialMessages, waitingToolUse.id, subagentContext.options.tools, turnOptions);
    if (turnResult !== undefined) yield turnResult.call;
    let collectAborted = abortedToolResults.bind(
      null,
      waitingToolUse,
      turnOptions,
      subagentContext.options.runQuery,
    );
    for await (let event of collectAborted({
      messages: initialMessages,
      systemPrompt: systemPromptWithAppend,
      userContext: userContext_2,
      systemContext,
      canUseTool,
      toolUseContext: subagentContext,
      querySource,
      forkOrigin,
      spawnedBySkill,
      maxTurns: maxTurns ?? agentDefinition.maxTurns,
      forkPointUuid,
      fallbackModel: subagentContext.options.fallbackModel,
      stickyBetas: deferredToolsState,
      evictCacheOnComplete,
      agentCacheTtlOverride: agentDefinition.cacheTtl,
    })) {
      onQueryProgress?.();
      if (isStreamEvent(event)) {
        if (
          event.type === "stream_event" &&
          (event.event.type === "message_start" ||
            (event.event.type === "message_stop" && event.abandonedBlocks === undefined))
        )
          await recorder.flush(true);
        if (onStreamTokenEstimate && event.type === "stream_event") {
          if (event.event.type === "message_start") finish();
          else if (event.event.type === "message_stop") onEnd();
        }
        handleMessageFromStream(event, streamCallbacks, queryOptions);
        yield* resultMessages;
        resultMessages.length = 0;
        continue;
      }
      if (
        (event.type === "attachment" &&
          "hookEvent" in event.attachment &&
          event.attachment.hookEvent === "SubagentStop") ||
        (event.type === "progress" &&
          event.data?.type === "hook_progress" &&
          event.data.hookEvent === "SubagentStop")
      )
        gotResult = true;
      if (event.type === "system" && event.subtype === "api_error") {
        yield event;
        continue;
      }
      if (
        event.type === "system" &&
        (event.subtype === "model_refusal_fallback" || event.subtype === "model_fallback")
      ) {
        yield event;
        continue;
      }
      if (event.type === "set_in_progress_tool_use_ids") {
        if (event.op.action === "remove") yield event;
        continue;
      }
      if (event.type === "query_model_change") {
        resolvedModel = event.toModel;
        yield event;
        continue;
      }
      if (event.type === "attachment") {
        if (event.attachment.type === "nested_memory") worktrees.push(event.attachment.path);
        if (pendingResult) {
          pendingResult.push(event);
          pendingError = applyPreservedMessages(pendingResult, event, pendingError);
        }
        if (event.attachment.type === "max_turns_reached") {
          abortedEarly = true;
          logForDebugging(
            `[Agent: ${agentDefinition.agentType}] Reached max turns limit (${event.attachment.maxTurns})`,
          );
          if (!agentAbortController.signal.aborted) {
            logEvent("tengu_agent_max_turns_reached", {
              query_source: agentTypeForTelemetry(querySource),
              is_built_in_agent: isBuiltInAgent(agentDefinition),
              max_turns: event.attachment.maxTurns,
              turn_count: event.attachment.turnCount,
              is_async: isAsync,
            });
            yield event;
          }
          break;
        }
        await recorder.record([event]);
        yield event;
        continue;
      }
      if (event.type === "tombstone") {
        recorder.forget(event.message.uuid);
        if (pendingResult) {
          let lastIndex = pendingResult.findLastIndex((row) => row.uuid === event.message.uuid);
          if (lastIndex !== -1) pendingResult.splice(lastIndex, 1);
        }
        continue;
      }
      if (isRecordableMessage(event)) {
        if (event.type !== "progress") {
          turnLifecycle.saw(event);
          if (pendingResult) {
            pendingResult.push(event);
            pendingError = applyPreservedMessages(pendingResult, event, pendingError);
          }
        }
        await recorder.record([event]);
        let taskRegistryEntry = toolUseContext.taskRegistry.get(agentId);
        let isBackgrounded = isLocalAgent(taskRegistryEntry) && taskRegistryEntry.isBackgrounded;
        if ((isAsync || isBackgrounded) && toolUseId) {
          let active = transportStateByHost.of(toolUseContext.session).active;
          if (active && (event.type === "assistant" || event.type === "user"))
            for (let message of normalizeMessages([event])) {
              let progressMessage = createProgressMessage({
                toolUseID: `agent_${agentId}`,
                parentToolUseID: toolUseId,
                data: {
                  message,
                  type: "agent_progress",
                  prompt: "",
                  agentId,
                  agentType: agentDefinition.agentType,
                  isBuiltIn: isBuiltInAgent(agentDefinition),
                  resolvedModel,
                  ...(description && {
                    description,
                  }),
                },
              });
              for (let message of normalizeMessage(
                progressMessage,
                subagentContext.options.refreshTools?.() ?? agentToolPool,
              ))
                active.write(message).catch((err) =>
                  logForDebugging(`bg-subagent progress write failed: ${err}`, {
                    level: "warn",
                  }),
                );
            }
          else if (
            active &&
            extractAgentIdsFromMessages_2(event) &&
            filterIncompleteToolCalls_2(toolUseContext, event)
          )
            for (let message of normalizeMessage(
              event,
              subagentContext.options.refreshTools?.() ?? agentToolPool,
            ))
              active.write(message).catch((prev) =>
                logForDebugging(`bg-subagent nested progress write failed: ${prev}`, {
                  level: "warn",
                }),
              );
        }
        yield event;
      }
    }
    gotResult = true;
    if (agentAbortController.signal.aborted) {
      let note = autoModeNotes.get(agentId);
      throw unwrapAbortReason(agentAbortController.signal.reason) === "permission-stop"
        ? new AbortError(
            note !== undefined ? buildAutoModeStoppedMessage(note) : buildAgentStoppedUnavailableMessage(),
          )
        : new AbortError();
    }
    if (isBuiltInAgent(agentDefinition) && agentDefinition.callback) agentDefinition.callback();
  } catch (error) {
    loopPromise = error;
    throw error;
  } finally {
    autoModeNotes.delete(agentId);
    await recorder.close();
    turnLifecycle.ended({
      isAborted: agentAbortController.signal.aborted || (!gotResult && loopPromise === undefined),
      hasFailed: loopPromise !== undefined,
      report:
        getLatestAgentReportText(toolUseContext.taskRegistry.get(agentId), agentId, handback) ??
        callerDeliveredReport?.(),
    });
    if (pendingResult && pendingError) {
      pendingResult.push(...pendingError.preserved);
      pendingError = null;
    }
    getTaskRunState().killAgentMonitors ??= stopMonitorWsTasksForAgent;
    let taskEntry = toolUseContext.taskRegistry.get(agentId);
    let taskEntry2 = toolUseContext.taskRegistry.get(agentId);
    let failureNote =
      isAsync &&
      !(isLocalAgent(taskEntry2) && taskEntry2.isBackgrounded === false) &&
      gotResult &&
      !agentAbortController.signal.aborted &&
      (hasAnyKeepaliveReason(agentId, toolUseContext.taskRegistry) ||
        hasRunningBackgroundWorkForAgent(agentId, toolUseContext.taskRegistry));
    let resultRecorded = false;
    let toolResults = [];
    let flushResults = () => {
      for (let result of toolResults)
        Promise.resolve()
          .then(result.run)
          .catch((error) =>
            logForDebugging(
              `[runAgent cleanup] deferred stage '${result.name}' failed: ${errorMessage(error)}`,
            ),
          );
    };
    let stopHookQueue = [
      {
        name: "SubagentStop",
        run: async () => {
          if (gotResult) return;
          try {
            for await (let stopHookEvent of executeStopHooks(
              undefined,
              undefined,
              5000,
              false,
              agentId,
              subagentContext,
              undefined,
              agentDefinition.agentType,
            ));
          } catch (error) {
            logForDebugging(`[runAgent] SubagentStop on interrupted query failed: ${error}`);
          }
        },
      },
      {
        name: "mcp",
        deferredWhileParked: true,
        run: () => cleanup(),
      },
      {
        name: "sessionHooks",
        deferredWhileParked: true,
        run: () => {
          if (agentDefinition.hooks) toolUseContext.sessionHooksRegistry.clear(agentId);
        },
      },
      {
        name: "promptCacheTracking",
        run: () => {
          if (isTeammate) {
            forgetClassifierCompaction(agentId);
            return;
          }
          ensureAgentDirectoryExists(agentId, !isTranscriptPersistenceDisabled(), toolUseContext.storageV5);
        },
      },
      {
        name: "tetherThreadState",
        run: () => {
          forgetAgentThread(agentId);
        },
      },
      {
        name: "propagateNestedMemory",
        run: () => {
          if (isCoordinatorMode_2() && antEnv.CLAUDE_CODE_COORDINATOR_PROPAGATE_NESTED_MEMORY) {
            let pendingNestedMemoryTriggers = toolUseContext.pendingNestedMemoryTriggers;
            if (!pendingNestedMemoryTriggers) {
              logForDebugging(
                "propagateNestedMemory: parent context has no pendingNestedMemoryTriggers; skipping",
              );
              return;
            }
            for (let worktree of worktrees) {
              if (!["CLAUDE.md", "CLAUDE.local.md", ...INSTRUCTION_FILE_NAMES].includes(basename(worktree)))
                continue;
              let mappedPath = mapWorktreePathToRepo(worktree, worktreePath);
              if (mappedPath === null) continue;
              if (toolUseContext.readFileState.has(mappedPath)) continue;
              if (!pendingNestedMemoryTriggers.includes(mappedPath))
                pendingNestedMemoryTriggers.push(mappedPath);
            }
          }
        },
      },
      {
        name: "readFileState",
        deferredWhileParked: true,
        run: () => subagentContext.readFileState.clear(),
      },
      {
        name: "initialMessages",
        run: () => {
          initialMessages.length = 0;
        },
      },
      {
        name: "liveMessages",
        run: () => {
          if (pendingResult) pendingResult.length = 0;
        },
      },
      {
        name: "perfetto",
        run: () => unregisterPerfettoAgent(agentId),
      },
      {
        name: "otelSubagentSpan",
        run: () => {
          let aborted = agentAbortController.signal.aborted;
          endSubagentSpan(taskHandle, {
            success: loopPromise === undefined && !aborted,
            ...(loopPromise !== undefined &&
              !aborted && {
                error: loopPromise instanceof Error ? loopPromise.message : String(loopPromise),
                errorClass: classifyToolError(loopPromise),
              }),
          });
        },
      },
      {
        name: "transcriptSubdir",
        run: () => clearAgentTranscriptSubdir(agentId),
      },
      {
        name: "todos",
        run: () => toolUseContext.agentLifecycle.clearTodos(agentId),
      },
      {
        name: "sandboxWriteGrant",
        deferredWhileParked: true,
        run: () => unregisterSandboxWriteDirectory(isolationKey),
      },
      {
        name: "nonShellMonitors",
        keepaliveGated: true,
        run: () => stopMonitorWsTasksForAgent(agentId, toolUseContext.taskRegistry),
      },
      {
        name: "shellTasks",
        keepaliveGated: true,
        run: () => killAgentShellTasks(agentId, toolUseContext.taskRegistry),
      },
    ];
    for (let entry of stopHookQueue) {
      if (failureNote && entry.keepaliveGated) continue;
      if (resultRecorded && entry.deferredWhileParked) {
        toolResults.push(entry);
        continue;
      }
      try {
        await entry.run();
      } catch (error) {
        logForDebugging(
          `[runAgent cleanup] stage '${entry.name}' failed: ${error instanceof Error ? error.message : String(error)}`,
        );
      }
    }
  }
}
//@ chunk-0h4e7gnq.js:118485-118511 layout
/**
 * 子代理退出时停止其非 shell 监视任务。
 */
function stopMonitorWsTasksForAgent(agentId, taskRegistry) {
  stopOwnedMonitorTasks(agentId, taskRegistry);
}
//@ chunk-0h4e7gnq.js:118511-118625 layout
/**
 * 本次派生是否为普通形态（无 stickyBetas/useExactTools/name/recordedUuids），决定完成后是否驱逐缓存。
 */
function isPlainSpawnShape({ stickyBetas, useExactTools, name, recordedUuids }) {
  return stickyBetas === undefined && !useExactTools && name === undefined && recordedUuids === undefined;
}
//@ chunk-0h4e7gnq.js:118625-118977 facade-exports = countToolCallsSince (1)
function filterIncompleteToolCalls(messages) {
  let resolvedToolUseIds = new Set();
  for (let message of messages)
    if (message?.type === "user") {
      let content = message.message.content;
      if (Array.isArray(content)) {
        for (let message of content)
          if (message.type === "tool_result" && message.tool_use_id)
            resolvedToolUseIds.add(message.tool_use_id);
      }
    }
  return messages.filter((message) => {
    if (message?.type === "assistant") {
      let content = message.message.content;
      if (Array.isArray(content))
        return !content.some(
          (block) => block.type === "tool_use" && block.id && !resolvedToolUseIds.has(block.id),
        );
    }
    return true;
  });
}
//@ chunk-0h4e7gnq.js:118977-119175 fingerprint = getAgentSystemPrompt (0.746)
/**
 * 渲染代理系统提示词（含已加载的代理记忆）；失败时回退默认子代理提示词。
 */
async function getAgentSystemPrompt(agent, toolUseContext, requestModel, budgetOverride) {
  try {
    let primedAgentMemory = await readAgentMemoryScope(agent, toolUseContext.storageV5);
    let agentPrompt = agent.getSystemPrompt({
      toolUseContext,
      primedAgentMemory,
    });
    return await buildSubagentNotesSection(
      [isBuiltInAgent(agent) ? applyPromptAblation(agentPrompt) : agentPrompt],
      requestModel,
      budgetOverride,
    );
  } catch (_error) {
    return buildSubagentNotesSection(
      [applyPromptAblation(DEFAULT_SUBAGENT_PROMPT)],
      requestModel,
      budgetOverride,
    );
  }
}
//@ chunk-0h4e7gnq.js:119175-119361 file-local
function findSkillForAgent(skillName, allSkills, agentDefinition) {
  let command = findCommand(skillName, allSkills);
  if (command) return command;
  let filtered = allSkills.filter(isProjectScopedCommand);
  let agentPrefix = firstLineOf(agentDefinition.agentType, ":");
  if (agentPrefix) {
    let qualifiedName = findCommand(`${agentPrefix}:${skillName}`, filtered);
    if (qualifiedName) return qualifiedName;
  }
  let suffix = `:${skillName}`;
  return filtered.find((cmd) => cmd.name.endsWith(suffix));
}
//@ chunk-0h4e7gnq.js:119361-119493 facade-exports
function spawnRequestShape(isBackground, requestNonInteractive) {
  return isBackground
    ? {
        requestShape: "background",
        requestNonInteractive: true,
      }
    : {
        requestShape: "foreground",
        requestNonInteractive,
      };
}
//@ chunk-0h4e7gnq.js:119493-120116 facade-exports
async function clearWorktreeFromAgentMetadata({ agentId, removedWorktreePath, spawnMetadata, storageV5 }) {
  recordCleanlyRemovedAgent(agentId);
  let metadata = await readAgentMetadata(agentId, storageV5).catch(
    makeSidecarReadFallback("clearWorktreeFromAgentMetadata"),
  );
  let cwd = metadata?.cwd && metadata.cwd !== removedWorktreePath ? metadata.cwd : undefined;
  await writeAgentMetadata(
    agentId,
    {
      ...spawnMetadata,
      ...(cwd && {
        cwd,
      }),
      ...(metadata?.stoppedByUser && {
        stoppedByUser: true,
      }),
      ...(metadata?.parentAgentId && {
        parentAgentId: metadata.parentAgentId,
      }),
      ...(metadata?.pluginSteered === true && {
        pluginSteered: true,
      }),
      ...(metadata?.finished === true && {
        finished: true,
      }),
      ...((metadata?.requestShape === "foreground" || metadata?.requestShape === "background") && {
        requestShape: metadata.requestShape,
      }),
      ...(typeof metadata?.requestNonInteractive === "boolean" && {
        requestNonInteractive: metadata.requestNonInteractive,
      }),
      ...false,
      worktreeCleanlyRemoved: true,
    },
    storageV5,
  );
}
//@ chunk-0h4e7gnq.js:120116-120602 sole-consumer
/**
 * 扫描子代理的初始消息：是否已带 SubagentStart hook 的附加上下文、哪些预载技能已在消息中（避免恢复/续接时重复注入）。
 */
async function scanCarriedSubagentContext(initialMessages, preloadNames) {
  let { isSkillLoadingMetadata } = await import("../../utils/processUserInput/processSlashCommand.js");
  let hookContextCarried = false;
  let carriedPreloads = new Set();
  for (let message of messagesSinceCompactBoundary(initialMessages)) {
    if (message.type === "attachment") {
      let { attachment } = message;
      if (attachment.type === "hook_additional_context" && attachment.hookEvent === "SubagentStart")
        hookContextCarried = true;
    } else if (
      message.type === "user" &&
      message.isMeta === true &&
      typeof message.message.content !== "string"
    ) {
      let block = message.message.content[0];
      if (block?.type === "text") {
        for (let skillName of preloadNames)
          if (isSkillLoadingMetadata(block.text, skillName)) carriedPreloads.add(skillName);
      }
    }
    if (hookContextCarried && carriedPreloads.size === preloadNames.length) break;
  }
  return {
    hookContextCarried,
    carriedPreloads,
  };
}
//@ chunk-0h4e7gnq.js:120602-120958 sole-consumer
/**
 * 计算子代理的 userContext：内建或策略来源的代理去掉 CLAUDE.md；其它代理按会话取托管的 CLAUDE.md 覆盖，返回 {userContext, managedInstructionsOnly}。
 */
async function resolveAgentUserContext(agentDefinition, userContext, toolUseContext) {
  let { claudeMd, ...withoutClaudeMd } = userContext;
  let managedOnlyResult = {
    userContext: withoutClaudeMd,
    managedInstructionsOnly: false,
  };
  if (agentDefinition.source === "built-in" || agentDefinition.source === "policySettings")
    return managedOnlyResult;
  let managedInstructionText = await getManagedInstructionText(
    toolUseContext.session,
    toolUseContext.storageV5,
    toolUseContext.credentials,
  );
  if (managedInstructionText === undefined)
    return {
      userContext,
      managedInstructionsOnly: false,
    };
  if (managedInstructionText === "") return managedOnlyResult;
  return {
    userContext: {
      ...userContext,
      claudeMd: managedInstructionText,
    },
    managedInstructionsOnly: true,
  };
}
//@ chunk-0h4e7gnq.js:120958-121177 sole-consumer
function getLatestCoworkMemoryVersion(messages) {
  for (let j = messages.length - 1; j >= 0; j--) {
    let message = messages[j];
    if (
      message.type === "attachment" &&
      message.attachment.type === "cowork_memory_context" &&
      !message.attachment.anchor
    )
      return message.attachment.content !== null ? message.attachment.version : undefined;
  }
  return;
}
export {
  createDeferredReviewTools,
  runAgent,
  prefixTranscriptPath,
  filterIncompleteToolCalls,
  isOnlyPendingToolUse,
  assembleAgentToolPool,
  clearWorktreeFromAgentMetadata,
  spawnRequestShape,
  filterIncompleteToolCalls_2,
  writeSubagentProgressToOutputSink,
  withAutoCompactCeiling,
};
