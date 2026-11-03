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
import { Ji } from "../../../vendor/lodash-es/uniqBy.js";
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

//@ chunk-0h4e7gnq.js:81304-81708 placement
/**
 * 恢复被续接子代理的基线状态（存储 V5 时换算存储键）。
 */
async function restoreResumedAgentBaseline(agentId, { resumed, storageV5 }) {
  if (!resumed) return;
  try {
    let y = null;
    let r = hasParkedAgentBaseline(agentId) ? undefined : prefixSidecarKey(agentId);
    if (r !== undefined) {
      let S = isStorageV5Enabled() && storageV5 !== undefined ? toStorageKey(r) : undefined;
      if (storageV5 === undefined || S === undefined) {
        let h = worktreeFromProgress(r);
        y = h === undefined ? null : await readSmallFileOrNull(h, MAX_CACHE_STATE_BYTES);
      } else {
        let h = await storageV5.read([
          {
            key: S,
            offset: 0,
            length: MAX_CACHE_STATE_BYTES + 1,
          },
        ]);
        let k = h.ok ? h.value.items[0] : undefined;
        if (k?.found && k.totalBytes <= MAX_CACHE_STATE_BYTES) y = Buffer.from(k.value).toString("utf-8");
      }
    }
    restoreAgentBaseline(agentId, y);
  } catch (error) {
    logError(error);
  }
}
//@ chunk-0h4e7gnq.js:81708-81771 placement
/**
 * 由代理转录路径得到 `.prefix.json` 路径。
 */
function prefixTranscriptPath(e) {
  return getAgentTranscriptPath(e).replace(/\.jsonl$/, ".prefix.json");
}
//@ chunk-0h4e7gnq.js:81771-81846 placement
/**
 * 由代理转录定位出 `.prefix.json` 的 sidecar 键。
 */
function prefixSidecarKey(e) {
  let n = locateAgentTranscript(e);
  return n === undefined ? undefined : subagentSidecarKey(n, ".prefix.json");
}
//@ chunk-0h4e7gnq.js:81846-81912 placement
/**
 * 把自动压缩上限包成 `{ceiling, inner}`。
 */
function withAutoCompactCeiling(autoCompactWindow, autoCompactWindow_2) {
  let s = autoCompactWindow;
  return autoCompactWindow_2 === undefined
    ? s
    : {
        ceiling: autoCompactWindow_2,
        inner: s,
      };
}
//@ chunk-0h4e7gnq.js:81912-81962 placement
/**
 * 杀掉该代理的 shell 任务并清理登记。
 */
function killAgentShellTasks(agentId, taskRegistry) {
  killShellTasksForAgent(agentId, taskRegistry);
  dequeueAllMatching((s) => s.agentId === agentId);
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
function logAgentSkillPreload(e, n, isBuiltIn) {
  let isOfficial = isOfficialMarketplaceSkill(e);
  let { sanitizedName, skillNameHash } = sanitizeSkillNameForTelemetry({
    rawName: e.name,
    canonicalName: e.name,
    isMcp: e.loadedFrom === "mcp",
    isBuiltIn,
    isBundled: e.source === "bundled",
    isOfficial,
  });
  let h = "agent-preload";
  logEvent("tengu_skill_tool_invocation", {
    command_name: sanitizedName,
    _PROTO_skill_name: e.name,
    ...skillNameHash,
    execution_context: lit("preload"),
    invocation_trigger: fromEnum("agent-preload"),
    parent_agent_id: sanitizeMarkName(n),
    ...logSkillsLoaded(e.source, e.loadedFrom, e.kind, e.createdBy),
    skill_content_chars: e.contentLength,
    ...buildServerAttributionFields(e),
  });
}
//@ chunk-0h4e7gnq.js:82485-82634 placement = getDestructiveCommandWarning (0.499)
/**
 * 取子代理最近一次自我报告的文本，有 warning 时拼在前面；报告来源与当前一致时不取，返回 undefined。被 runAgent 使用。
 */
function getLatestAgentReportText(e, agentId, s) {
  let report = handbackFrom(agentId) !== s ? getPendingHandbackReport(e, agentId)?.at(-1)?.report : undefined;
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
  let y = Array.isArray(content) ? content[0] : undefined;
  if (y?.type !== "tool_use" && y?.type !== "tool_result") return false;
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
  constructor(e, agentId, lastRecordedUuid, recordedUuids, storageV5, signal) {
    this.sessionStorage = e;
    this.agentId = agentId;
    this.lastRecordedUuid = lastRecordedUuid;
    this.recordedUuids = recordedUuids;
    this.storageV5 = storageV5;
    this.abortSignal = signal;
    this.unregisterExitDrain = e.registerTranscriptExitDrain(this.flushHeld);
    signal.addEventListener("abort", this.flushHeld, {
      once: true,
    });
  }
  record(e) {
    this.queued.push(...e.filter(this.sessionStorage.isLoggableMessage));
    return this.flush(
      this.abortSignal.aborted || e.some((n) => n.type === "assistant" && n.isApiErrorMessage === true),
    );
  }
  async flush(e = false) {
    let n = this.queued.splice(0, this.sessionStorage.transcriptCursorEnd(this.queued, 0, !e));
    if (n.length === 0) return;
    let lastRecordedUuid = this.lastRecordedUuid;
    for (let y of n) {
      this.lastRecordedUuid = y.uuid;
      this.recordedUuids?.add(y.uuid);
    }
    await this.sessionStorage
      .recordSidechainTranscript(n, this.agentId, lastRecordedUuid, this.storageV5)
      .catch(logSidechainFailure);
  }
  forget(e) {
    let lastIndex = this.queued.findLastIndex((s) => s.uuid === e);
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
function logSidechainFailure(e) {
  logForDebugging(`Failed to record sidechain transcript: ${e}`);
}
//@ chunk-0h4e7gnq.js:84139-84258 placement
function assembleAgentToolPool(toolUseContext, n, s) {
  return toolUseContext.options.toolCatalog.assembleToolPool(n, excludeCoordinatorCommsMcpTools(s), {
    skipReplFilter: true,
    machineMcpTools: bridgeToolsOf(toolUseContext),
  });
}
//@ chunk-0h4e7gnq.js:84258-84347 placement
/**
 * 生成可后挂工具池的审查工具集合。
 */
function createDeferredReviewTools(tools) {
  let n = () => [];
  return {
    onToolPool: (s) => {
      n = s;
    },
    reviewTools: () => [...tools, ...n()],
  };
}
//@ chunk-0h4e7gnq.js:84347-84657 placement
/**
 * 创建随调用增长的工具列表获取函数。
 */
function createGrowingToolList(e, n, s, y) {
  let r = e;
  let S;
  let h;
  return () => {
    try {
      let k = n();
      let w = s();
      if (k !== S || w !== h) {
        let combined = k.concat(w.filter(isMcpTool));
        let L = new Set(r.map((G) => G.name));
        let I = new Set(combined.map((G) => G.name).filter((G) => !L.has(G)));
        if (I.size > 0) {
          let filtered = y(combined).filter((ee) => I.has(ee.name));
          if (filtered.length > 0) r = [...r, ...filtered];
        }
        S = k;
        h = w;
      }
    } catch (error) {
      logError(toError(error));
    }
    return r;
  };
}
//@ chunk-0h4e7gnq.js:84657-84772 placement
function isOnlyPendingToolUse(messages, id) {
  let flattened = messages.slice(messages.findLastIndex((y) => y.type === "user") + 1).flatMap(getToolUseIds);
  return flattened.length === 1 && flattened[0] === id;
}
//@ chunk-0h4e7gnq.js:84772-85087 placement
/**
 * 在消息中找出正在等待结果的工具调用及其所属的助手消息。
 */
function findWaitingToolCall(e, id, tools, { normalizeMessagesForAPI }) {
  let lastIndex = e.findLastIndex((k) => getToolUseIds(k).includes(id));
  let S = e[lastIndex];
  if (S?.type !== "assistant") return;
  let h = e.slice(0, lastIndex).findLastIndex((k) => k.type === "user") + 1;
  if (
    e.slice(0, h).some((k) => isSameAssistantMessage(k, S)) ||
    normalizeMessagesForAPI(e.slice(lastIndex + 1), tools).length > 0
  )
    return;
  return {
    call: S,
    rows: e.slice(h, lastIndex + 1).filter((k) => isSameAssistantMessage(k, S)),
  };
}
//@ chunk-0h4e7gnq.js:85087-85666 placement
async function* abortedToolResults(e, n, s, y) {
  if (e === undefined) return yield* s(y);
  let waitingToolCall = findWaitingToolCall(y.messages, e.id, y.toolUseContext.options.tools, n);
  if (waitingToolCall === undefined) {
    e.settled();
    return yield* s({
      ...y,
      messages: n.filterUnresolvedToolUses(y.messages, undefined, {
        dropSiblingBlocks: true,
      }),
    });
  }
  let S = new Set(waitingToolCall.rows);
  let h = s({
    ...y,
    messages: y.messages.filter((message) => !S.has(message)),
    keptFirstResponse: waitingToolCall.rows,
  });
  try {
    let k = await h.next();
    while (!k.done) {
      if (k.value.type === "user" && k.value.sourceToolAssistantUUID === waitingToolCall.call.uuid)
        e.settled();
      yield k.value;
      k = await h.next();
    }
    return k.value;
  } finally {
    e.settled();
    await h.return({
      reason: "aborted_tools",
    });
  }
}
//@ chunk-0h4e7gnq.js:85666-85808 placement = countToolCallsSince (1)
function getToolUseIds(e) {
  return e.type === "assistant" && Array.isArray(e.message.content)
    ? e.message.content.flatMap((block) => (block.type === "tool_use" ? [block.id] : []))
    : [];
}
//@ chunk-0h4e7gnq.js:85808-85882 placement
/**
 * 判断两条消息是否是同一条 assistant 消息。
 */
function isSameAssistantMessage(e, n) {
  return e.type === "assistant" && e.message.id === n.message.id;
}
//@ chunk-0h4e7gnq.js:85882-85958 placement
/**
 * 惰性注入的 laptop 记忆工具引用（当前为 null）。
 */
var laptopMemoryToolsRef = null;
var OTHER_AGENTS_NOTE = `Other agents active in this session, addressable via ${SENDMESSAGE}`;
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
  let [r, S] = entries[0];
  if (isBuiltinMcpServerName(r)) {
    logForDebugging(`[Agent: ${agentType}] Skipping reserved MCP server name '${r}' in frontmatter`, {
      level: "warn",
    });
    return null;
  }
  let h = unaddableTransportReason(S.type);
  if (h !== null) {
    logForDebugging(
      `[Agent: ${agentType}] Skipping ${h} MCP transport '${S.type}' for '${r}' in frontmatter`,
      {
        level: "warn",
      },
    );
    return null;
  }
  return {
    name: r,
    config: {
      ...S,
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
  let h = null;
  if (isRestrictedToPluginOnly("mcp") && !agentIsAdminTrusted) h = "strictPluginOnlyCustomization";
  else if (getStrictMcpConfig() && agentDefinition.source !== "flagSettings") h = "--strict-mcp-config";
  else if (isCustomizationDisabled("mcpAgentFrontmatter")) h = isSafeMode() ? "--safe-mode" : "--bare";
  else if (getIsRemoteMode()) h = "remote mode";
  else if (doesEnterpriseMcpConfigExist()) h = "enterprise MCP config";
  else if (isDiskless()) {
    reportOnce("subagent_mcp_servers");
    h = "this cloud session";
  }
  if (h) {
    logForDebugging(
      `[Agent: ${agentDefinition.agentType}] Skipping frontmatter MCP servers: blocked by ${h} (agent source: ${agentDefinition.source})`,
      {
        level: "warn",
      },
    );
    onServersBlocked?.(flattenToolNameList(agentDefinition.mcpServers), h);
    return {
      clients: parentClients,
      agentClients: [],
      tools: [],
      cleanup: async () => {},
    };
  }
  let k = !hasUntrustedMcpServerEntries(agentDefinition);
  let w = isRestrictedPersonalAgent(agentDefinition);
  if (k && w && agentDefinition.mcpServers.some((mcpServer) => typeof mcpServer !== "string"))
    onServersBlocked?.(
      flattenToolNameList(agentDefinition.mcpServers.filter((mcpServer) => typeof mcpServer !== "string")),
      "your own agents can't define their own MCP servers in this session (CLAUDE_CODE_RESTRICT_PERSONAL_CONFIG)",
    );
  if (!k) {
    checkAgentOriginTrust(agentDefinition, "subagent", "mcpServers");
    onServersBlocked?.(
      flattenToolNameList(agentDefinition.mcpServers.filter((mcpServer) => typeof mcpServer !== "string")),
      `untrusted agent origin \u2014 ${agentFolderTrustHint(agentDefinition)}`,
    );
  }
  let x = [];
  let L = [];
  let I = [];
  let G = [];
  let results = await Promise.all(
    agentDefinition.mcpServers.map(async (mcpServer) => {
      if (typeof mcpServer !== "string" && (!k || w)) return null;
      let agentMcpServers = resolveAgentMcpServers(
        agentDefinition.agentType,
        agentMcpSource(agentDefinition),
        mcpServer,
      );
      if (agentMcpServers === null) return null;
      if ("skipped" in agentMcpServers) {
        I.push(agentMcpServers.name);
        return null;
      }
      let { name: j, config, isNewlyCreated } = agentMcpServers;
      if (
        isMemoryServerName(j) &&
        (hasCliOwnedMemoryServer(parentClients) ||
          (laptopMemoryToolsRef?.laptopMemoryToolsEntryBuilt() ?? false))
      ) {
        logForDebugging(
          `[Agent: ${agentDefinition.agentType}] MCP server '${j}' skipped: the session holds this server name for its own entry`,
          {
            level: "warn",
          },
        );
        G.push(j);
        return null;
      }
      let { blocked } = filterMcpServersByPolicy({
        [j]: config,
      });
      let ce = blocked.length > 0 ? "managed-policy" : mcpDialBlockCause(j, config);
      if (ce === "project-approval") {
        logForDebugging(
          `[Agent: ${agentDefinition.agentType}] MCP server '${j}' skipped: not approved for this project`,
          {
            level: "warn",
          },
        );
        L.push(j);
        return null;
      }
      if (ce) {
        logForDebugging(
          `[Agent: ${agentDefinition.agentType}] MCP server '${j}' blocked by managed settings MCP policy`,
          {
            level: "warn",
          },
        );
        x.push(j);
        return null;
      }
      let { connectToServer, fetchToolsForClient } = require("./chunk-asne9cp8.js").mcpClientModule();
      let { boundDial } = require("./chunk-td5f96dd.js");
      let q = connectToServer(j, config, undefined, abortSignal, options);
      let name;
      try {
        name = await boundDial(q, {
          serverName: j,
          context: "subagent MCP server connect",
        });
      } catch (error) {
        logForDebugging(
          `[Agent: ${agentDefinition.agentType}] MCP server '${j}' connect timed out or aborted: ${errorMessage(error)}`,
          {
            level: "warn",
          },
        );
        if (isNewlyCreated)
          q.then(
            (Q) => {
              if (Q.type === "connected") Q.cleanup().catch(() => {});
            },
            () => {},
          );
        return null;
      }
      let ue = [];
      if (name.type === "connected") {
        ue = await fetchToolsForClient(name, abortSignal);
        logForDebugging(
          `[Agent: ${agentDefinition.agentType}] Connected to MCP server '${j}' with ${ue.length} tools`,
        );
      } else
        logForDebugging(
          `[Agent: ${agentDefinition.agentType}] Failed to connect to MCP server '${j}': ${name.type}`,
          {
            level: "warn",
          },
        );
      return applyMcpServerConfig(config, {
        client: name,
        tools: ue,
        isNewlyCreated,
      });
    }),
  );
  if (I.length > 0) onServersBlocked?.(I, "--strict-mcp-config");
  if (x.length > 0) onServersBlocked?.(x, "managed settings MCP policy");
  if (L.length > 0) onServersBlocked?.(L, "missing project approval (approve via /mcp)");
  let te = [];
  let R = [];
  let z = [];
  for (let V of results) {
    if (!V) continue;
    te.push(V.client);
    if (V.isNewlyCreated) R.push(V.client);
    z.push(...V.tools);
  }
  if (te.some((V) => V.name === CLAUDE_ARTIFACTS))
    getCliOwnedState().subagentBroughtOwnArtifactsServer = true;
  let cleanup = async () => {
    for (let client of R)
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
    clients: [...parentClients, ...te],
    agentClients: te,
    tools: z,
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
function logForkContextRefFailure(e) {
  logForDebugging(`Failed to record fork-context-ref: ${e}`);
}
//@ chunk-0h4e7gnq.js:90193-90250 layout
function logAgentMetadataWriteFailure(e) {
  logForDebugging(`Failed to write agent metadata: ${e}`);
}
//@ chunk-0h4e7gnq.js:90250-90436 facade-exports
function writeSubagentProgressToOutputSink(e, progressMessage, s) {
  let active = transportStateByHost.of(e.session).active;
  if (!active) return;
  let forwardSubagentText = e.options.forwardSubagentText ?? false;
  for (let S of normalizeMessage(progressMessage, e.options.tools)) {
    if (s && !forwardSubagentText && !isToolUseOrResultMessage(S)) continue;
    active.writeAfterInit(S);
  }
}
//@ chunk-0h4e7gnq.js:90436-91216 layout
/**
 * 写入子代理元数据；恢复时先读取旧元数据并继承父代理、worktree、插件引导、workflow 阶段、请求形态、非交互与 effort 等字段。
 */
async function persistAgentMetadata(agentId, n, context, storageV5) {
  if (n) {
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
  let s = `${sep}.claude${sep}worktrees${sep}`;
  let index = path.indexOf(s);
  if (index < 0) {
    if (allowedRoot && path.startsWith(allowedRoot + sep)) return null;
    return path;
  }
  let sliced = path.slice(0, index);
  let sliced_2 = path.slice(index + s.length);
  let index_2 = sliced_2.indexOf(sep);
  if (index_2 < 0) return null;
  let sliced_3 = sliced_2.slice(index_2 + 1);
  let w = join(sliced, sliced_3);
  let absolutePath = resolve(sliced);
  if (!resolve(w).startsWith(absolutePath + sep)) return null;
  return w;
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
  name: Ke,
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
  let ut = session ?? toolUseContext.session;
  let Me =
    override?.agentContext?.agentType === "subagent" && override.agentContext.invocationKind === "resume";
  let Xe = worktreePath || isolationWorktreeFor(toolUseContext);
  if (agentDefinition.source === "plugin") {
    let P = await checkSyncedSkillAccess(
      agentDefinition.plugin,
      agentDefinition.pluginSource?.pluginPath ?? agentDefinition.registeringPluginRoot,
      agentDefinition.registeredAtRunTime ? "refused" : "not judged",
    );
    if (P !== undefined) {
      logSyncedPartRefused("agent", agentDefinition.agentType, P);
      throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
        `The agent was not started: ${refusalTextFor(P)}.`,
        "synced plugin agent refused",
      );
    }
  }
  if (session) session.setIsolationRoot(Me ? undefined : Xe);
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
    isTeammate ? undefined : Me ? "resume" : "spawn",
    {
      inWorkflowRun:
        spawnedByWorkflowRunId !== undefined ||
        (!Me && !isTeammate && toolUseContext.spawnedByWorkflowRunId !== undefined),
    },
  );
  let resolvedModel = resolvedAgentModel;
  let agentId = override?.agentId ? override.agentId : makeSaltedName();
  let agentAbortController = override?.abortController
    ? override.abortController
    : isAsync
      ? new AbortController()
      : toolUseContext.abortController;
  let it = !(
    isDelegatedObservationContext(override?.agentContext ?? toolUseContext.agentContext) ||
    toolUseContext.options.settingsHooksOff === true
  );
  let Xo = isUnknownPluginSpawnedAgent({
    hookCaller: toolUseContext.hookCaller,
    pluginUnnamed: toolUseContext.pluginUnnamed,
  });
  using Jo = raiseTurnLifecycleForAgent(
    it ? (turnPrompt ?? "") : "",
    agentId,
    agentAbortController.signal,
    toolUseContext.hookCaller ?? (Xo ? "" : undefined),
    toolUseContext.hookOrigin,
  );
  let So = handbackFrom(agentId);
  if (transcriptSubdir) setAgentTranscriptSubdir(agentId, transcriptSubdir);
  if (isPerfettoRecording()) {
    let P = toolUseContext.agentId ?? getSessionId();
    registerPerfettoAgent(agentId, agentDefinition.agentType, P);
  }
  let Oo;
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
  let [xt, Be] = await Promise.all([
    override?.userContext ??
      getOrBuildUserContext(toolUseContext.session, toolUseContext.storageV5, toolUseContext.credentials),
    override?.systemContext ??
      getCachedSystemContext(toolUseContext.session, toolUseContext.options.cacheBreakerPhrase),
  ]);
  let { userContext, managedInstructionsOnly, architectureInstructionsOnly } =
    agentDefinition.omitClaudeMd && !override?.userContext
      ? await resolveAgentUserContext(agentDefinition, xt, toolUseContext)
      : {
          userContext: xt,
          managedInstructionsOnly: false,
        };
  let Bt = narrowerMode(spawnMode, permissionMode);
  let Lt = Bt ?? hasHookForEvent_2(agentDefinition, permissionMode);
  let ys;
  let gn;
  function hs(permissionContext) {
    if (permissionContext === ys && gn) return gn;
    ys = permissionContext;
    let se = permissionContext;
    let agentPermissionMode = agentDefinition.permissionMode;
    let lt =
      Bt !== undefined &&
      !isWebFetchAgent(agentDefinition) &&
      narrowerMode(Bt, permissionContext.mode) === undefined;
    let re = Bt ?? (spawnMode === "bubble" ? undefined : spawnMode) ?? agentPermissionMode;
    let Rt =
      permissionContext.mode === "plan" &&
      !isTeammate &&
      (lt || (!Bt && re !== undefined && re !== "plan" && re !== "bubble"));
    if (
      Lt &&
      !lt &&
      (Bt ||
        !isBypassCapableMode(permissionContext.mode) ||
        (isTeammate && (permissionContext.mode === "plan" || Lt === "plan")))
    ) {
      let mode = Lt;
      let Ut =
        isRestrictedPersonalAgent(agentDefinition) && narrowerMode(Lt, permissionContext.mode) === undefined;
      if (
        !Bt &&
        (Ut ||
          (settingsGrantsConfined() && (Lt === "bypassPermissions" || Lt === "acceptEdits" || Lt === "auto")))
      ) {
        logForDebugging(
          Ut
            ? `Agent '${agentDefinition.agentType}' asks for permission mode ${Lt} in your own agent file. This session doesn't let your own agents widen their permission mode (CLAUDE_CODE_RESTRICT_PERSONAL_CONFIG), so it runs in '${permissionContext.mode}'.`
            : `Subagent declared permissionMode: ${Lt} inside a confined evaluation run; keeping parent mode '${permissionContext.mode}'.`,
          {
            level: "warn",
          },
        );
        mode = permissionContext.mode;
      } else if (
        Lt === "bubble" &&
        (permissionContext.mode === "plan" || permissionContext.mode === "dontAsk")
      )
        mode = permissionContext.mode;
      else if (Lt === "bypassPermissions" && !isBypassPermissionsAuthorized(permissionContext)) {
        mode = permissionContext.mode;
        if (mode !== "bypassPermissions")
          logForDebugging(
            `Subagent ${Bt ? "spawn-time permission mode" : "declared permissionMode"} bypassPermissions is not authorized by this session (parent not in bypass mode, bypass policy-disabled, session --restricted, or not a contained no-internet environment); keeping parent mode '${permissionContext.mode}'.`,
            {
              level: "warn",
            },
          );
      } else if (!Bt) mode = fallbackFromUnavailableAutoMode(Lt, permissionContext.mode, resolvedAgentModel);
      se = withClassifiedWebCalls(se, mode);
    }
    if (se.mode === "plan" && (isTeammate || (re !== undefined && re !== "bubble")))
      se = {
        ...se,
        isBypassPermissionsModeAvailable: false,
      };
    let Jt = toolUseContext.requestDialog !== undefined;
    let qt = getIsNonInteractiveSession() && hasPermissionPromptTool(getPermissionPromptToolName());
    let $e =
      (Rt && (re === "dontAsk" || agentPermissionMode === "dontAsk")) ||
      (canShowPermissionPrompts !== undefined
        ? !canShowPermissionPrompts
        : Lt === "bubble" || Jt || qt
          ? false
          : isAsync);
    if ($e)
      se = {
        ...se,
        shouldAvoidPermissionPrompts: true,
      };
    if (isAsync && !$e)
      se = {
        ...se,
        awaitAutomatedChecksBeforeDialog: true,
      };
    if (allowedTools !== undefined)
      se = {
        ...se,
        alwaysAllowRules: {
          cliArg: permissionContext.alwaysAllowRules.cliArg,
          ...(permissionContext.alwaysAllowRules.mcpServerPolicy && {
            mcpServerPolicy: permissionContext.alwaysAllowRules.mcpServerPolicy,
          }),
          session: [...allowedTools],
        },
      };
    se = withAgentDisallowedTools(se, agentDefinition);
    if (
      worktreePath &&
      !se.blockWritesOutsideWorkingDirectories &&
      !se.additionalWorkingDirectories.has(worktreePath)
    )
      se = {
        ...se,
        additionalWorkingDirectories: new Map([
          ...se.additionalWorkingDirectories,
          [
            worktreePath,
            {
              path: worktreePath,
              source: "session",
            },
          ],
        ]),
      };
    gn = se;
    return se;
  }
  let agentGetAppState = () => {
    let state = toolUseContext.getAppState();
    let se = hs(state.toolPermissionContext);
    if (se === state.toolPermissionContext) return state;
    return {
      ...state,
      toolPermissionContext: se,
    };
  };
  let Ts = [
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
  let ro = memoryModeForSession(toolUseContext);
  let Ss =
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
        ro.mode,
      );
  let ep = false;
  let agentTools = resolvedAgentTools?.resolvedTools ?? availableTools;
  let ks = resolvedAgentTools ? agentDefinition : override?.agentToolScope;
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
  let yn =
    !useExactTools &&
    !override?.isolatedContext &&
    !isWebFetchAgent(agentDefinition) &&
    !env.CLAUDE_CODE_MEMORY_SUBAGENT_APPEND;
  let Ms = yn ? memoryNoteIfEnabled(ro) : undefined;
  let vs = yn && !ro.serverPending;
  let filtered = [appendSubagentSystemPrompt, Ms].filter((P) => P !== undefined);
  let systemPromptWithAppend =
    filtered.length === 0
      ? agentSystemPromptBlocks
      : asSystemPrompt([...agentSystemPromptBlocks, ...filtered]);
  let en = {
    customSystemPrompt: toolUseContext.options.customSystemPrompt,
    appendSystemPrompt: toolUseContext.options.appendSystemPrompt,
    systemPromptSnapshot:
      env.CLAUDE_CODE_SUBAGENT_PROMPT_SNAPSHOT && !useExactTools
        ? true
        : toolUseContext.options.systemPromptSnapshot,
  };
  let Ao = recordedUuids !== undefined && recordedUuids.size > 0;
  let io = [];
  let hn = uniq(agentDefinition.skills ?? []);
  let sliced = hn.slice(0, MAX_PRELOADED_SKILLS);
  if (hn.length > MAX_PRELOADED_SKILLS)
    logForDebugging(
      `[Agent: ${agentDefinition.agentType}] Warning: the skills list has ${hn.length} different names; only the first ${MAX_PRELOADED_SKILLS} are preloaded`,
      {
        level: "warn",
      },
    );
  let { hookContextCarried, carriedPreloads } = Ao
    ? await scanCarriedSubagentContext(initialMessages, sliced)
    : {
        hookContextCarried: false,
        carriedPreloads: new Set(),
      };
  let _n = [];
  try {
    let agentContext = override?.agentContext ?? toolUseContext.agentContext;
    let se = isDelegatedObservationContext(agentContext)
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
    for await (let xe of se) {
      let message = xe.message;
      if (
        message?.type === "attachment" &&
        isLoggableMessage(message) &&
        message.attachment.type !== "hook_blocking_error" &&
        !override?.isolatedContext
      ) {
        initialMessages.push(message);
        io.push(message);
      }
      if (xe.blockingError && !override?.isolatedContext) {
        let nonBlockableHookErrorMessage = getNonBlockableHookErrorMessage(
          "SubagentStart",
          xe.blockingError,
          `SubagentStart:${agentDefinition.agentType}`,
        );
        initialMessages.push(nonBlockableHookErrorMessage);
        io.push(nonBlockableHookErrorMessage);
      }
      if (xe.additionalContexts && xe.additionalContexts.length > 0) _n.push(...xe.additionalContexts);
    }
  } catch (error) {
    if (!(error instanceof StreamClosedAbortError)) throw error;
    logForDebugging("SubagentStart hooks cancelled (control stream closed)");
  }
  if (_n.length > 0 && !override?.isolatedContext && !hookContextCarried) {
    let attachmentMessage = createAttachmentMessage({
      type: "hook_additional_context",
      content: _n,
      hookName: "SubagentStart",
      toolUseID: randomUUID(),
      hookEvent: "SubagentStart",
    });
    initialMessages.push(attachmentMessage);
    io.push(attachmentMessage);
  }
  if (vs && ro.mode !== "none" && Ao)
    insertCoworkMemoryContexts(toolUseContext.session.host, initialMessages);
  let xs = yn
    ? getStaleMemoryContextAttachment(
        toolUseContext.session.host,
        messagesSinceCompactBoundary(initialMessages),
      )
    : undefined;
  if (xs !== undefined) {
    let attachmentMessage = createAttachmentMessage(xs);
    initialMessages.push(attachmentMessage);
    io.push(attachmentMessage);
  }
  let on = vs
    ? coworkMemoryContextMode(
        toolUseContext.session.host,
        getLatestCoworkMemoryVersion(messagesSinceCompactBoundary(initialMessages)),
        ro.mode === "none",
      )
    : undefined;
  if (on !== undefined) {
    let attachmentMessage = createAttachmentMessage(on);
    initialMessages.push(attachmentMessage);
    io.push(attachmentMessage);
    let anchorAttachment = buildAnchorAttachment(on);
    if (anchorAttachment !== undefined) {
      let contextMessage = createAttachmentMessage(anchorAttachment);
      initialMessages.push(contextMessage);
      io.push(contextMessage);
    }
  }
  let Gi = !isRestrictedToPluginOnly("hooks") || isSourceAdminTrusted(agentDefinition.source);
  toolUseContext.sessionHooksRegistry.clear(agentId);
  if (hasFrontmatterHooks(agentDefinition.hooks) && Gi)
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
    (P) => !isToolDisallowed(P) && !isServedAccountMemoryTool(P, ro.mode),
  );
  let kt = filtered_2.length > 0 ? Ji([...agentTools, ...filtered_2], "name") : agentTools;
  let Ps = count(availableTools, (P) => P.mcpInfo?.accountMemoryServer === true);
  if (Ps > 0)
    logEvent("tengu_subagent_memory_tools", {
      mode: fromEnum(ro.mode),
      mode_source: fromEnum(ro.source),
      marked_as: fromEnum(Ss),
      parent_tools: Ps,
      kept_tools: count(kt, (P) => P.mcpInfo?.accountMemoryServer === true),
      exact_tools: useExactTools ?? false,
      note_appended: Ms !== undefined,
      block_attached: on?.content != null,
    });
  if (kt.length === 0) {
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
    let re =
      joined !== "" &&
      resolvedAgentTools !== undefined &&
      !resolvedAgentTools.hasWildcard &&
      availableTools.length > 0 &&
      !Ao;
    logEvent("tengu_subagent_zero_tools", {
      isBuiltIn: agentDefinition.source === "built-in",
      invalidCount: invalidTools.length,
      unavailableCount: unavailableTools.length,
      validButEmptyCount: filtered.length,
      availablePoolSize: availableTools.length,
      hadWildcard: resolvedAgentTools?.hasWildcard ?? false,
      isContinuation: Ao,
      refused: re,
      isAsync,
    });
    if (re) {
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
    let P = count(
      resolvedAgentTools.unavailableTools,
      (xe) =>
        !isToolDisallowed({
          name: permissionRuleValueFromString(xe).toolName,
        }),
    );
    let se = {
      agent_depth: agentDepth,
      spawn_depth_cap: getMaxSubagentSpawnDepth(),
      is_async: isAsync,
      is_continuation: Ao,
      invalid_count: resolvedAgentTools.invalidTools.length,
      self_disallowed_overlap_count: resolvedAgentTools.unavailableTools.length - P,
    };
    if (resolvedAgentTools.declaredAgentToolWithheld || P > 0)
      logFeatureSad(
        "subagent_tool_resolution",
        resolvedAgentTools.declaredAgentToolWithheld
          ? "declared_agent_withheld"
          : "declared_tools_unavailable",
        {
          ...se,
          unavailable_count: P,
        },
      );
    else
      logFeatureOk("subagent_tool_resolution", {
        ...se,
        agent_tool_removed_by_depth: resolvedAgentTools.agentToolRemovedByDepth === true,
        has_wildcard: resolvedAgentTools.hasWildcard,
      });
  }
  let any = kt.some((P) => toolMatchesName(P, SUBAGENTHANDBACK) && P !== handbackTool);
  let Xi = false;
  let uo =
    handbackOptIn === true &&
    !useExactTools &&
    !requiresStructuredOutput &&
    handbackTool !== undefined &&
    !any &&
    isAutoHandbackArmed(toolPermissionContext) &&
    !Xi &&
    hs(toolPermissionContext).mode === "auto";
  let Qi = uo
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
  recordHandbackContract(agentId, uo, Qi);
  if (uo && !kt.includes(handbackTool)) kt = [...kt, handbackTool];
  let Mn =
    !useExactTools && (agentDefinition.tools ?? ["*"]).some((P) => P === "*" || mcpInfoFromString(P) !== null)
      ? assembleAvailableTools
      : undefined;
  try {
    let filtered = sliced.filter((se) => !carriedPreloads.has(se));
    if (filtered.length > 0) {
      let hiddenPlugins = getHeldBackSyncedPlugins();
      let allSkills = dropSyncedClashes(
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
      let re = hiddenPlugins.size === 0 ? [] : getSyncedSkillCommands();
      let Rt = (skillName) =>
        re.some((_t) =>
          [_t.name, ...(_t.aliases ?? [])].some((Zt) => foldName(Zt) === foldName(skillName)),
        ) && findCommand(skillName, allSkills) === undefined;
      let Jt = [];
      let allSkills_2 = await findRefusedSyncedCommands(allSkills);
      let $e;
      for (let skillName of filtered) {
        let _t =
          findCommand(skillName, hiddenSyncedSkills) === undefined && !Rt(skillName)
            ? findSkillForAgent(skillName, allSkills, agentDefinition)
            : undefined;
        if (!_t) {
          logForDebugging(
            `[Agent: ${agentDefinition.agentType}] Warning: Skill '${skillName}' specified in frontmatter was not found`,
            {
              level: "warn",
            },
          );
          continue;
        }
        if (_t.type !== "prompt") {
          logForDebugging(
            `[Agent: ${agentDefinition.agentType}] Warning: Skill '${skillName}' is not a prompt-based skill`,
            {
              level: "warn",
            },
          );
          continue;
        }
        if (!isCommandEnabled(_t)) {
          logForDebugging(
            `[Agent: ${agentDefinition.agentType}] Warning: Skill '${skillName}' is disabled by policy`,
            {
              level: "warn",
            },
          );
          continue;
        }
        if (isKilledHostCatalogSkill(_t)) {
          logForDebugging(
            `[Agent: ${agentDefinition.agentType}] Warning: Skill '${skillName}' is turned off by the organization's Skills setting`,
            {
              level: "warn",
            },
          );
          continue;
        }
        if (isSyncedSkill(_t) && ($e ??= refreshVetoAndRead())) {
          logForDebugging(
            `[Agent: ${agentDefinition.agentType}] Warning: Skill '${skillName}' is an account-synced skill and skills sync is currently disabled (turned off or denied by policy)`,
            {
              level: "warn",
            },
          );
          continue;
        }
        let Zt = allSkills_2.get(_t);
        if (Zt !== undefined) {
          logSyncedCommandRefused(_t, Zt);
          continue;
        }
        Jt.push({
          skillName,
          skill: _t,
        });
      }
      let { formatSkillLoadingMetadata } = await import("./chunk-jghdfw5c.js");
      let Ut = new PromptScopedAbortController(toolUseContext.abortController);
      let Bo = await Promise.all(
        Jt.map(async ({ skillName, skill }) => {
          let promptShellHandOff = [];
          let content = await applySkillPromptHooks(
            skillName,
            await skill.getPromptForCommand("", {
              ...toolUseContext,
              abortController: Ut,
              promptShellHandOff,
              session: ut,
              options: {
                ...toolUseContext.options,
                isSkillPreload: true,
                tools: kt,
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
        Ut.abort();
        throw error;
      });
      for (let { skillName, skill, content, promptShellHandOff } of Bo) {
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
        io.push(userMessage);
      }
    }
  } catch (error) {
    await cleanup();
    throw error;
  }
  let ao =
    stickyBetas ??
    (useExactTools
      ? forkContextMessages !== undefined
        ? cloneStickyBetaLatches(toolUseContext.stickyBetas ?? getStickyBetas())
        : withKeepaliveReset(
            clearAdvisorHeldAndReturn(forkStickyBetaLatches(toolUseContext.stickyBetas ?? getStickyBetas())),
          )
      : createStickyBetaLatches());
  let Yt = [];
  if (!useExactTools || forkContextMessages === undefined) {
    let P = messagesSinceCompactBoundary(initialMessages);
    if (!ao.declaredToolsDecided)
      try {
        seedWireShapeFromRecord(ao, snapshotIfEnabled(initialMessages, en)?.wireShape, resolvedAgentModel);
        mergeNameOnlyAnnouncements(ao, recordedDeferredTools(P));
      } catch (error) {
        logError(error);
      }
    let permissionContext = getToolPermissionContext({
      getAppState: agentGetAppState,
      permissionLayers: [...(toolUseContext.permissionLayers ?? []), ...Ts],
    });
    for (let xe of await getDeferredToolsDeltaAttachments(
      kt,
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
      getDeclaredToolSource(ao, P, en, kt, permissionContext),
      buildDeferredToolsLatchContextFrom(
        ao,
        Mn !== undefined,
        permissionContext,
        toolUseContext.options.agentDefinitions,
        querySource,
      ),
      undefined,
      en,
    )) {
      let attachmentMessage = createAttachmentMessage(xe);
      initialMessages.push(attachmentMessage);
      Yt.push(attachmentMessage);
    }
  }
  for (let P of getSandboxInstructionsAttachments(kt, initialMessages)) {
    let attachmentMessage = createAttachmentMessage(P);
    initialMessages.push(attachmentMessage);
    Yt.push(attachmentMessage);
  }
  if (
    !useExactTools &&
    !Ao &&
    hasSendMessageTool(kt) &&
    !initialMessages.some(
      (initialMessage) =>
        initialMessage.type === "user" &&
        initialMessage.isMeta === true &&
        typeof initialMessage.message.content === "string" &&
        initialMessage.message.content.includes(OTHER_AGENTS_NOTE),
    )
  ) {
    let sorted = [...toolUseContext.getAppState().agentNameRegistry]
      .filter(([, se]) => se !== agentId)
      .map(([se]) => se)
      .sort();
    if (sorted.length > 0) {
      let se = escapeXmlText([MAIN, ...sorted].join(", "));
      let userMessage = createUserMessage({
        content: wrapInSystemReminder(`${OTHER_AGENTS_NOTE}({to: name, message}): ${se}.`),
        isMeta: true,
      });
      initialMessages.push(userMessage);
      Yt.push(userMessage);
    }
  }
  let Zi = toolUseContext.taskRegistry.get(agentId);
  if (handbackOptIn === true && (isSendMessageHandbackEnabled() || handbackContractOf(Zi) !== undefined))
    toolUseContext.taskRegistry.update(agentId, (P) => ({
      ...P,
      ...resolveHandbackRecipient({
        contract: uo,
        registered: {
          recipient: P.handbackRecipient,
        },
        callerInbox: P.parentAgentId ?? mainAgentId(),
        resumerInbox: toolUseContext.agentId ?? mainAgentId(),
        inboxReadable: (se) => shouldNotifyTeammateLifecycle(se, toolUseContext.taskRegistry),
      }),
    }));
  let latestHandbackReminder = findLatestHandbackReminder(initialMessages);
  if (uo && latestHandbackReminder !== "reminder") {
    let userMessage = createUserMessage({
      content: wrapInSystemReminder(buildHandbackInstruction(hasSendMessageTool(kt))),
      isMeta: true,
    });
    initialMessages.push(userMessage);
    Yt.push(userMessage);
  } else if (!uo && handbackOptIn === true && latestHandbackReminder === "reminder") {
    let userMessage = createUserMessage({
      content: wrapInSystemReminder(handbackCountermandText()),
      isMeta: true,
    });
    initialMessages.push(userMessage);
    Yt.push(userMessage);
  }
  let vn = {
    runQuery: toolUseContext.options.runQuery,
    isNonInteractiveSession: useExactTools
      ? toolUseContext.options.isNonInteractiveSession
      : (requestNonInteractive ??
        spawnRequestShape(requestShape === "background", toolUseContext.options.isNonInteractiveSession)
          .requestNonInteractive),
    ...en,
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
    tools: kt,
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
      Mn !== undefined
        ? createGrowingToolList(
            kt,
            () => toolUseContext.getAppState().mcp.tools,
            () => toolUseContext.options.refreshTools?.() ?? toolUseContext.options.tools,
            (P) => {
              let se = memoryModeForSession(toolUseContext);
              return resolveAgentTools(
                agentDefinition,
                Mn(P),
                requestShape === "background",
                false,
                isTeammate,
                agentDepth,
                se.serverPending ? "none" : se.mode,
              ).resolvedTools;
            },
          )
        : undefined,
    mcpClients: clients,
    refreshMcpClients: toolUseContext.options.refreshMcpClients
      ? () => {
          let P = toolUseContext.options.refreshMcpClients();
          return agentClients.length > 0 ? [...P, ...agentClients] : P;
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
    ...(uo && {
      requiresHandback: true,
    }),
  };
  onToolPool?.(() => vn.refreshTools?.() ?? kt);
  let subagentContext = createSubagentContext(toolUseContext, {
    options: vn,
    session: ut,
    agentId,
    isBackgroundAgent:
      isAsync &&
      !(
        override?.agentContext?.agentType === "subagent" && override.agentContext.isBackgroundAgent === false
      ),
    memoryCaller: Ss,
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
    permissionLayers: Ts,
    primitiveToolGrant: ks === undefined ? undefined : resolveAgentToolNames(ks),
    shareSetAppState: !isAsync,
    shareFileHistory: override?.shareFileHistory,
    criticalSystemReminder_EXPERIMENTAL: agentDefinition.criticalSystemReminder_EXPERIMENTAL,
    contentReplacementState,
  });
  if (override?.onRetryStatus) subagentContext.onRetryStatus = override.onRetryStatus;
  if (override?.subscribeRetryWake) subagentContext.subscribeRetryWake = override.subscribeRetryWake;
  if (worktreePath) subagentContext.agentWorktree = worktreePath;
  for (let P of await getEnvironmentChangeAttachments(subagentContext, initialMessages)) {
    let attachmentMessage = createAttachmentMessage(P);
    initialMessages.push(attachmentMessage);
    Yt.push(attachmentMessage);
  }
  for (let P of await getSkillListingAttachmentsLazy(
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
    let attachmentMessage = createAttachmentMessage(P);
    initialMessages.push(attachmentMessage);
    Yt.push(attachmentMessage);
  }
  let noticeAttachment =
    isRemoteToolForwardingSwitchOn() &&
    !override?.isolatedContext &&
    !isDelegatedObservationContext(subagentContext.agentContext)
      ? isolationRuntimeService().remote?.noticeAttachment
      : undefined;
  if (noticeAttachment !== undefined)
    try {
      for (let P of await noticeAttachment(subagentContext, initialMessages, "attachment_scan")) {
        let attachmentMessage = createAttachmentMessage(P);
        initialMessages.push(attachmentMessage);
        Yt.push(attachmentMessage);
      }
    } catch (error) {
      if (isAbortError(error)) logForDebugging("Attached-machines notice skipped (spawn aborted)");
      else logError(error);
    }
  if (preserveToolUseResults) subagentContext.preserveToolUseResults = true;
  if (persistedToolResultFiles) subagentContext.persistedToolResultFiles = persistedToolResultFiles;
  let yt = null;
  let co = null;
  subagentContext.stickyBetas = ao;
  let evictCacheOnComplete = isPlainSpawnShape({
    stickyBetas,
    useExactTools,
    name: Ke,
    recordedUuids,
  });
  if (onCacheSafeParams) {
    let P = [...initialMessages];
    yt = P;
    onCacheSafeParams(
      {
        systemPrompt: systemPromptWithAppend,
        userContext,
        systemContext: Be,
        toolUseContext: subagentContext,
        forkContextMessages: initialMessages,
        advisorModel: subagentContext.getAdvisorSetting(),
        stickyBetas: ao,
        agentCacheTtlOverride: agentDefinition.cacheTtl,
      },
      () => P,
    );
  }
  if (compactTranscriptUnavailable) subagentContext.compactTranscriptUnavailable = true;
  let fo = initialMessages;
  let Cn = null;
  if (recordedUuids !== undefined) {
    let lastIndex = initialMessages.findLastIndex((initialMessage) => recordedUuids.has(initialMessage.uuid));
    fo = initialMessages.slice(lastIndex + 1);
    let lastIndex_2 = initialMessages.findLastIndex(
      (initialMessage, lt) =>
        lt <= lastIndex && recordedUuids.has(initialMessage.uuid) && !isReorderedRow(initialMessage.uuid),
    );
    Cn = lastIndex_2 >= 0 ? initialMessages[lastIndex_2].uuid : null;
  } else if (
    forkContextMessages !== undefined &&
    forkContextMessages === toolUseContext.messages &&
    toolUseContext.agentId === undefined
  ) {
    let uuid = messages.findLast((se) => isLoggableMessage(se) && !isReorderedRow(se.uuid))?.uuid;
    if (uuid !== undefined) {
      fo = initialMessages.slice(messages.length);
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
  let Bs = initialMessages.length - fo.length;
  let max = Math.max(Bs, messages.length);
  let ta = initialMessages.splice(max);
  yt?.splice(max);
  let js = orderedRowSource({
    agentId,
    keep: (P) => {
      initialMessages.push(...P);
      yt?.push(...P);
    },
    rows: () => initialMessages,
    isHookable: it,
  });
  for (let P of ta) {
    let se =
      P.type === "user" &&
      P.isMeta !== true &&
      promptMessages.some((promptMessage) => promptMessage.uuid === P.uuid);
    await appendRowsWithHooks(
      js,
      [P],
      se
        ? {
            door: "prompt",
          }
        : {},
    );
  }
  fo = initialMessages.slice(Bs);
  recordSidechainTranscript(fo, agentId, Cn, toolUseContext.storageV5).catch(logSidechainFailure);
  let Po = recordedUuids !== undefined || extraMetadata !== undefined;
  if (!Po && !worktreePath && toolUseContext.agentWorktree) recordSpawnedAgentIsolation(agentId);
  if (!Po) {
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
    Po,
    {
      agentType: agentDefinition.agentType,
      ...(agentDefinition.agentType === FORK && {
        isFork: isBuiltInAgent(agentDefinition),
      }),
      isBuiltIn: isBuiltInAgent(agentDefinition),
      ...(worktreePath && {
        worktreePath,
      }),
      ...(!Po &&
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
      ...(Bt && {
        spawnMode: Bt,
      }),
      ...(description && {
        description,
      }),
      ...(Ke && {
        name: Ke,
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
      requestNonInteractive: vn.isNonInteractiveSession,
      ...(model && {
        model,
      }),
      ...(!model &&
        !Po &&
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
  let ko = new SidechainRecorder(
    {
      isLoggableMessage,
      recordSidechainTranscript,
      registerTranscriptExitDrain,
      transcriptCursorEnd,
    },
    agentId,
    fo.findLast(isLoggableMessage)?.uuid ?? Cn,
    recordedUuids,
    toolUseContext.storageV5,
    agentAbortController.signal,
  );
  if (recordedUuids) {
    for (let P of fo) if (isLoggableMessage(P)) recordedUuids.add(P.uuid);
  }
  let Io = false;
  let Ws = false;
  let No;
  let Fo = [];
  let Lo = 0;
  let Uo = 0;
  let En = 0;
  let Rn = false;
  let bo = 0;
  let nn = (P) => {
    let now = Date.now();
    if (!P && now - En < STREAM_TOKEN_ESTIMATE_THROTTLE_MS) return;
    let xe = Math.floor(Lo) - Uo;
    if (xe <= 0) return;
    En = now;
    Uo += xe;
    onStreamTokenEstimate?.({
      type: "tokens",
      estimatedTokensDelta: xe,
    });
  };
  let oa = () => {
    if (Rn) {
      if (Uo > 0)
        onStreamTokenEstimate?.({
          type: "tokens",
          estimatedTokensDelta: -Uo,
        });
    } else
      onStreamTokenEstimate?.({
        type: "response_start",
      });
    Lo = 0;
    Uo = 0;
    En = 0;
    bo = 0;
    Rn = true;
  };
  let na = () => {
    nn(true);
    Rn = false;
  };
  let sa = {
    onSetStreamMode: (mode) =>
      Fo.push({
        type: "spinner_mode",
        mode,
      }),
    ...(onStreamTokenEstimate && {
      onUpdateLength: (P) => {
        Lo += P / 4;
        nn(false);
      },
    }),
    onApiMetrics: (P) => {
      if (onStreamTokenEstimate) {
        if (P.type === "content_block_start") bo = 0;
        else if (P.type === "thinking_progress") {
          bo += P.estimatedTokensDelta;
          Lo += P.estimatedTokensDelta;
          nn(false);
        } else if (P.type === "thinking_signature") {
          let se = Math.ceil(P.chars / 4);
          if (se > bo) {
            Lo += se - bo;
            bo = se;
            nn(false);
          }
        }
      }
      if (P.type !== "start" && P.type !== "end") return;
      if (P.type === "start") {
        No = randomUUID();
        Fo.push({
          type: "api_metrics",
          event: {
            type: "start",
            ttftMs: P.ttftMs,
            id: No,
          },
        });
      } else if (No != null) {
        Fo.push({
          type: "api_metrics",
          event: {
            type: "end",
            outputTokens: P.outputTokens,
            id: No,
          },
        });
        No = undefined;
      }
    },
  };
  let ra = {
    isSubagent: true,
  };
  let Qt;
  let Ks = [];
  let qs = `isolation:${agentId}`;
  let Pn = autoModeUnavailableNotes.of(ut.host);
  Pn.set(agentId, undefined);
  try {
    if (worktreePath && isSameRepoWorktree(worktreePath, [getOriginalCwd(), getProjectRoot()]))
      registerSandboxWriteDirectory(worktreePath, qs);
    Oo = executeInSpan({
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
    yield* io;
    yield* Yt;
    using P = runningTurnRegistry.running(
      agentId,
      orderedRowSource({
        agentId,
        keep: (re) => {
          yt?.push(...re);
        },
        keepArrived: (re) => {
          yt?.push(...re);
          ko.record(re);
        },
        rows: () => yt ?? initialMessages,
        isHookable: js.isHookable,
      }),
    );
    let se = {
      filterUnresolvedToolUses: normalizeMessagesForResume,
      normalizeMessagesForAPI,
    };
    let xe =
      waitingToolUse &&
      findWaitingToolCall(initialMessages, waitingToolUse.id, subagentContext.options.tools, se);
    if (xe !== undefined) yield xe.call;
    let lt = abortedToolResults.bind(null, waitingToolUse, se, subagentContext.options.runQuery);
    for await (let re of lt({
      messages: initialMessages,
      systemPrompt: systemPromptWithAppend,
      userContext,
      systemContext: Be,
      canUseTool,
      toolUseContext: subagentContext,
      querySource,
      forkOrigin,
      spawnedBySkill,
      maxTurns: maxTurns ?? agentDefinition.maxTurns,
      forkPointUuid,
      fallbackModel: subagentContext.options.fallbackModel,
      stickyBetas: ao,
      evictCacheOnComplete,
      agentCacheTtlOverride: agentDefinition.cacheTtl,
    })) {
      onQueryProgress?.();
      if (isStreamEvent(re)) {
        if (
          re.type === "stream_event" &&
          (re.event.type === "message_start" ||
            (re.event.type === "message_stop" && re.abandonedBlocks === undefined))
        )
          await ko.flush(true);
        if (onStreamTokenEstimate && re.type === "stream_event") {
          if (re.event.type === "message_start") oa();
          else if (re.event.type === "message_stop") na();
        }
        handleMessageFromStream(re, sa, ra);
        yield* Fo;
        Fo.length = 0;
        continue;
      }
      if (
        (re.type === "attachment" &&
          "hookEvent" in re.attachment &&
          re.attachment.hookEvent === "SubagentStop") ||
        (re.type === "progress" && re.data?.type === "hook_progress" && re.data.hookEvent === "SubagentStop")
      )
        Io = true;
      if (re.type === "system" && re.subtype === "api_error") {
        yield re;
        continue;
      }
      if (
        re.type === "system" &&
        (re.subtype === "model_refusal_fallback" || re.subtype === "model_fallback")
      ) {
        yield re;
        continue;
      }
      if (re.type === "set_in_progress_tool_use_ids") {
        if (re.op.action === "remove") yield re;
        continue;
      }
      if (re.type === "query_model_change") {
        resolvedModel = re.toModel;
        yield re;
        continue;
      }
      if (re.type === "attachment") {
        if (re.attachment.type === "nested_memory") Ks.push(re.attachment.path);
        if (yt) {
          yt.push(re);
          co = applyPreservedMessages(yt, re, co);
        }
        if (re.attachment.type === "max_turns_reached") {
          Ws = true;
          logForDebugging(
            `[Agent: ${agentDefinition.agentType}] Reached max turns limit (${re.attachment.maxTurns})`,
          );
          if (!agentAbortController.signal.aborted) {
            logEvent("tengu_agent_max_turns_reached", {
              query_source: agentTypeForTelemetry(querySource),
              is_built_in_agent: isBuiltInAgent(agentDefinition),
              max_turns: re.attachment.maxTurns,
              turn_count: re.attachment.turnCount,
              is_async: isAsync,
            });
            yield re;
          }
          break;
        }
        await ko.record([re]);
        yield re;
        continue;
      }
      if (re.type === "tombstone") {
        ko.forget(re.message.uuid);
        if (yt) {
          let lastIndex = yt.findLastIndex((Jt) => Jt.uuid === re.message.uuid);
          if (lastIndex !== -1) yt.splice(lastIndex, 1);
        }
        continue;
      }
      if (isRecordableMessage(re)) {
        if (re.type !== "progress") {
          Jo.saw(re);
          if (yt) {
            yt.push(re);
            co = applyPreservedMessages(yt, re, co);
          }
        }
        await ko.record([re]);
        let Rt = toolUseContext.taskRegistry.get(agentId);
        let isBackgrounded = isLocalAgent(Rt) && Rt.isBackgrounded;
        if ((isAsync || isBackgrounded) && toolUseId) {
          let active = transportStateByHost.of(toolUseContext.session).active;
          if (active && (re.type === "assistant" || re.type === "user"))
            for (let message of normalizeMessages([re])) {
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
              for (let Ut of normalizeMessage(
                progressMessage,
                subagentContext.options.refreshTools?.() ?? kt,
              ))
                active.write(Ut).catch((err) =>
                  logForDebugging(`bg-subagent progress write failed: ${err}`, {
                    level: "warn",
                  }),
                );
            }
          else if (
            active &&
            extractAgentIdsFromMessages_2(re) &&
            filterIncompleteToolCalls_2(toolUseContext, re)
          )
            for (let $e of normalizeMessage(re, subagentContext.options.refreshTools?.() ?? kt))
              active.write($e).catch((prev) =>
                logForDebugging(`bg-subagent nested progress write failed: ${prev}`, {
                  level: "warn",
                }),
              );
        }
        yield re;
      }
    }
    Io = true;
    if (agentAbortController.signal.aborted) {
      let re = Pn.get(agentId);
      throw unwrapAbortReason(agentAbortController.signal.reason) === "permission-stop"
        ? new AbortError(
            re !== undefined ? buildAutoModeStoppedMessage(re) : buildAgentStoppedUnavailableMessage(),
          )
        : new AbortError();
    }
    if (isBuiltInAgent(agentDefinition) && agentDefinition.callback) agentDefinition.callback();
  } catch (error) {
    Qt = error;
    throw error;
  } finally {
    Pn.delete(agentId);
    await ko.close();
    Jo.ended({
      isAborted: agentAbortController.signal.aborted || (!Io && Qt === undefined),
      hasFailed: Qt !== undefined,
      report:
        getLatestAgentReportText(toolUseContext.taskRegistry.get(agentId), agentId, So) ??
        callerDeliveredReport?.(),
    });
    if (yt && co) {
      yt.push(...co.preserved);
      co = null;
    }
    getTaskRunState().killAgentMonitors ??= stopMonitorWsTasksForAgent;
    let P = toolUseContext.taskRegistry.get(agentId);
    let se = toolUseContext.taskRegistry.get(agentId);
    let xe =
      isAsync &&
      !(isLocalAgent(se) && se.isBackgrounded === false) &&
      Io &&
      !agentAbortController.signal.aborted &&
      (hasAnyKeepaliveReason(agentId, toolUseContext.taskRegistry) ||
        hasRunningBackgroundWorkForAgent(agentId, toolUseContext.taskRegistry));
    let re = false;
    let Rt = [];
    let Jt = () => {
      for (let $e of Rt)
        Promise.resolve()
          .then($e.run)
          .catch((error) =>
            logForDebugging(`[runAgent cleanup] deferred stage '${$e.name}' failed: ${errorMessage(error)}`),
          );
    };
    let qt = [
      {
        name: "SubagentStop",
        run: async () => {
          if (Io) return;
          try {
            for await (let $e of executeStopHooks(
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
            for (let rt of Ks) {
              if (!["CLAUDE.md", "CLAUDE.local.md", ...INSTRUCTION_FILE_NAMES].includes(basename(rt)))
                continue;
              let Ut = mapWorktreePathToRepo(rt, worktreePath);
              if (Ut === null) continue;
              if (toolUseContext.readFileState.has(Ut)) continue;
              if (!pendingNestedMemoryTriggers.includes(Ut)) pendingNestedMemoryTriggers.push(Ut);
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
          if (yt) yt.length = 0;
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
          endSubagentSpan(Oo, {
            success: Qt === undefined && !aborted,
            ...(Qt !== undefined &&
              !aborted && {
                error: Qt instanceof Error ? Qt.message : String(Qt),
                errorClass: classifyToolError(Qt),
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
        run: () => unregisterSandboxWriteDirectory(qs),
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
    for (let $e of qt) {
      if (xe && $e.keepaliveGated) continue;
      if (re && $e.deferredWhileParked) {
        Rt.push($e);
        continue;
      }
      try {
        await $e.run();
      } catch (error) {
        logForDebugging(
          `[runAgent cleanup] stage '${$e.name}' failed: ${error instanceof Error ? error.message : String(error)}`,
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
function isPlainSpawnShape({ stickyBetas, useExactTools, name: s, recordedUuids }) {
  return stickyBetas === undefined && !useExactTools && s === undefined && recordedUuids === undefined;
}
//@ chunk-0h4e7gnq.js:118625-118977 facade-exports = countToolCallsSince (1)
function filterIncompleteToolCalls(e) {
  let n = new Set();
  for (let s of e)
    if (s?.type === "user") {
      let content = s.message.content;
      if (Array.isArray(content)) {
        for (let message of content)
          if (message.type === "tool_result" && message.tool_use_id) n.add(message.tool_use_id);
      }
    }
  return e.filter((s) => {
    if (s?.type === "assistant") {
      let content = s.message.content;
      if (Array.isArray(content))
        return !content.some((block) => block.type === "tool_use" && block.id && !n.has(block.id));
    }
    return true;
  });
}
//@ chunk-0h4e7gnq.js:118977-119175 fingerprint = getAgentSystemPrompt (0.746)
/**
 * 渲染代理系统提示词（含已加载的代理记忆）；失败时回退默认子代理提示词。
 */
async function getAgentSystemPrompt(
  agentDefinition,
  toolUseContext,
  resolvedAgentModel,
  totalTokensReminderBudget,
) {
  try {
    let primedAgentMemory = await readAgentMemoryScope(agentDefinition, toolUseContext.storageV5);
    let agentPrompt = agentDefinition.getSystemPrompt({
      toolUseContext,
      primedAgentMemory,
    });
    return await buildSubagentNotesSection(
      [isBuiltInAgent(agentDefinition) ? applyPromptAblation(agentPrompt) : agentPrompt],
      resolvedAgentModel,
      totalTokensReminderBudget,
    );
  } catch (_error) {
    return buildSubagentNotesSection(
      [applyPromptAblation(DEFAULT_SUBAGENT_PROMPT)],
      resolvedAgentModel,
      totalTokensReminderBudget,
    );
  }
}
//@ chunk-0h4e7gnq.js:119175-119361 file-local
function findSkillForAgent(skillName, allSkills, agentDefinition) {
  let command = findCommand(skillName, allSkills);
  if (command) return command;
  let filtered = allSkills.filter(isProjectScopedCommand);
  let S = firstLineOf(agentDefinition.agentType, ":");
  if (S) {
    let qualifiedName = findCommand(`${S}:${skillName}`, filtered);
    if (qualifiedName) return qualifiedName;
  }
  let suffix = `:${skillName}`;
  return filtered.find((cmd) => cmd.name.endsWith(suffix));
}
//@ chunk-0h4e7gnq.js:119361-119493 facade-exports
function spawnRequestShape(e, requestNonInteractive) {
  return e
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
  let r = await readAgentMetadata(agentId, storageV5).catch(
    makeSidecarReadFallback("clearWorktreeFromAgentMetadata"),
  );
  let cwd = r?.cwd && r.cwd !== removedWorktreePath ? r.cwd : undefined;
  await writeAgentMetadata(
    agentId,
    {
      ...spawnMetadata,
      ...(cwd && {
        cwd,
      }),
      ...(r?.stoppedByUser && {
        stoppedByUser: true,
      }),
      ...(r?.parentAgentId && {
        parentAgentId: r.parentAgentId,
      }),
      ...(r?.pluginSteered === true && {
        pluginSteered: true,
      }),
      ...(r?.finished === true && {
        finished: true,
      }),
      ...((r?.requestShape === "foreground" || r?.requestShape === "background") && {
        requestShape: r.requestShape,
      }),
      ...(typeof r?.requestNonInteractive === "boolean" && {
        requestNonInteractive: r.requestNonInteractive,
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
async function scanCarriedSubagentContext(initialMessages, n) {
  let { isSkillLoadingMetadata } = await import("./chunk-jghdfw5c.js");
  let y = false;
  let r = new Set();
  for (let S of messagesSinceCompactBoundary(initialMessages)) {
    if (S.type === "attachment") {
      let { attachment } = S;
      if (attachment.type === "hook_additional_context" && attachment.hookEvent === "SubagentStart") y = true;
    } else if (S.type === "user" && S.isMeta === true && typeof S.message.content !== "string") {
      let h = S.message.content[0];
      if (h?.type === "text") {
        for (let k of n) if (isSkillLoadingMetadata(h.text, k)) r.add(k);
      }
    }
    if (y && r.size === n.length) break;
  }
  return {
    hookContextCarried: y,
    carriedPreloads: r,
  };
}
//@ chunk-0h4e7gnq.js:120602-120958 sole-consumer
/**
 * 计算子代理的 userContext：内建或策略来源的代理去掉 CLAUDE.md；其它代理按会话取托管的 CLAUDE.md 覆盖，返回 {userContext, managedInstructionsOnly}。
 */
async function resolveAgentUserContext(agentDefinition, n, toolUseContext) {
  let { claudeMd, ...r } = n;
  let S = {
    userContext: r,
    managedInstructionsOnly: false,
  };
  if (agentDefinition.source === "built-in" || agentDefinition.source === "policySettings") return S;
  let managedInstructionText = await getManagedInstructionText(
    toolUseContext.session,
    toolUseContext.storageV5,
    toolUseContext.credentials,
  );
  if (managedInstructionText === undefined)
    return {
      userContext: n,
      managedInstructionsOnly: false,
    };
  if (managedInstructionText === "") return S;
  return {
    userContext: {
      ...n,
      claudeMd: managedInstructionText,
    },
    managedInstructionsOnly: true,
  };
}
//@ chunk-0h4e7gnq.js:120958-121177 sole-consumer
function getLatestCoworkMemoryVersion(e) {
  for (let j = e.length - 1; j >= 0; j--) {
    let s = e[j];
    if (s.type === "attachment" && s.attachment.type === "cowork_memory_context" && !s.attachment.anchor)
      return s.attachment.content !== null ? s.attachment.version : undefined;
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
