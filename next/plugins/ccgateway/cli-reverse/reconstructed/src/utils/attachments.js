/**
 * utils/attachments.ts
 *
 * 每轮附件生成：getAttachments 按用户输入（@ 文件/MCP 资源/代理/技能/同伴提及）与会话状态（队列命令、计划/自动模式、待办与任务提醒、延迟工具/代理/MCP 指令增量、嵌套与相关记忆、IDE 选区、诊断、token/预算提醒等）并发产出 Attachment 对象，由 getAttachmentMessages 包成 attachment 消息进入对话，normalizeAttachmentForAPI 再转成 system-reminder。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/utils/attachments.ts
 * pieces: chunk-bnwcqde4.js (1), chunk-e6aww6q8.js (133)
 * attribution: fingerprint 49, placement 8, layout 70, file-local 5, callgraph-fingerprint 2
 */
import { randomUUID } from "crypto";
import { join, relative, dirname, resolve as resolve_2, parse, basename, isAbsolute, sep } from "path";
import { setImmediate as THo } from "timers/promises";
import { stat, readdir, lstat } from "fs/promises";
import { buildGoalSentinelAttachment } from "../commands/goal/goal.js";
import { memoryFreshnessText } from "../memdir/memoryAge.js";
import {
  singleLineMemoryText,
  sanitizeMemoryText,
  MEMORY_FILE_RECALL_BYTES,
  MAX_ENTRYPOINT_TAIL_LINES,
} from "../memdir/memdir.js";
import {
  isInstructionReadRestricted,
  readableInstructionSpellings,
  isFileReadDenied_2,
  isFileReadDenied,
  WALK_FLUSH_INTERVAL,
  withheldInstructionStateSlot,
  takeOwedInstructionFiles,
  seenWithheldPaths,
  DEFAULT_READ_TIMEOUT_MS,
  filterManagedInstructions,
  rulesInstructionReaders,
  takeShownInstructionFiles,
  clearOwedInstructionFiles,
  recordWithheldInstructionFiles,
  logWithheldInstructionFiles,
  MAX_TRACKED_INSTRUCTION_PATHS,
  createReadThrottle,
  pathSpellingsForRead,
  isInstructionPathRefused,
  readDirIfSpellingsStable,
  stashAttachedReadPermission,
  checkPathRefused,
  claudeMdAccessTrackerSlot,
  readPinnedFile,
} from "./instructionFileAccess.js";
import {
  getFeatureValue_CACHED_MAY_BE_STALE,
  getFeatureValue_SESSION_PINNED,
} from "../services/analytics/growthbook.js";
import { getServerUrl as getServerUrl_2, unwrapCcrProxyUrl } from "../services/mcp/config.js";
import { isHostedDesktopSession } from "./computerUse/toolRendering.js";
import { COMPUTER_USE_MCP_SERVER_NAME } from "./computerUse/common.js";
import { env } from "./env.js";
import { getCachedClientData, getGlobalConfig } from "./config.js";
import { isDelegatedObservationContext, isMainConversationContext } from "./agentContext.js";
import {
  stickyBetasForRequest,
  hasDeclaredToolSet,
  resolveDeclaredToolSet,
  shouldAnnounceDeferredTools,
  canInlineToolAdditions,
} from "../services/api/declaredToolSet.js";
import { messagesSinceCompactBoundary } from "../services/projects/threadRows.js";
import { classifyQuerySource } from "../services/api/requestHeaders.js";
import { getToolPermissionContext, getUltracodeRequested } from "./permissions/toolPermissionContext.js";
import { seedWireShapeFromRecord } from "../services/api/tether.js";
import { snapshotIfEnabled, recordedDeferredTools } from "./contextAttachments/promptSnapshot.js";
import {
  seedDeferredToolReferences,
  keptDeferredToolNames,
  logRetractionFailure,
} from "../services/api/deferredToolsState.js";
import { isEchoWireToolInputsEnabled, adoptWireToolInputCopies } from "./wireToolInputEcho.js";
import { logError } from "./log.js";
import { imageLimitsForModel } from "./attachmentMedia.js";
import { getSandboxInstructionsAttachments } from "./attachments/sandboxInstructions.js";
import {
  getEnvironmentChangeAttachments,
  shouldPrefetchArtifactOpening,
  detectEnvironmentDirectoryChange,
  getOutputStyleAndLanguageAttachments,
} from "./attachments/environmentChange.js";
import {
  withdrawCoworkMemoryContext,
  collectCcrMemoryAttachments,
} from "../services/accountMemory/memoryContext.js";
import { getAttachmentTimingStore, timeAttachment } from "./attachments/attachmentTiming.js";
import { createAbortController, createChildAbortController } from "./abortController.js";
import {
  getReplyGatePolicy,
  getDisableFileMentions,
  getDisableSlashCommands,
  getIsNonInteractiveSession,
  getStickyBetas,
  notePersonPrompt,
  getConversationToolsUsed,
  isDiskless,
  getSessionId,
  hasExitedPlanModeInSession,
  setHasExitedPlanMode,
  setNeedsPlanModeExitAttachment,
  needsPlanModeExitAttachment,
  needsAutoModeExitAttachment,
  setNeedsAutoModeExitAttachment,
  getOriginalCwd,
  getToolsMachine,
  getEnsureConnectedClient,
  getProjectRoot,
  getSessionSkillAllowlist,
  getProjectRootOrNull,
  getSdkBetas,
} from "../bootstrap/state.js";
import { uniq, stringArray as stringArray_2, count } from "./collections.js";
import { isCoordinatorMainThread } from "../coordinator/coordinatorMode.js";
import { toolMatchesName, isProactivityActive } from "../Tool.js";
import { SKILL } from "../tools/SkillTool/skillToolNames.js";
import {
  isSkillMentionAttachmentEnabled,
  buildSkillMentionAttachments,
} from "./attachments/skillMentions.js";
import {
  withNamedFolderYieldsRestored,
  getSkillToolCommands,
  filterCommandsByAllowlist,
  hiddenCommandsWhenSlashDisabled,
  dedupeBundledSkills,
  dropShadowedFallbackSkills,
  getCommands,
} from "../commands.js";
import { todoToolsEnabled } from "./sessionKind.js";
import { isTaskToolsEnabled, listTasks, getTaskListId } from "./tasks.js";
import {
  isRemoteToolForwardingSwitchOn,
  isCloudSessionProcess,
  isForwardingOffNoticeOn,
  forwardingOffReasonNow,
} from "../services/remoteTools/servingGates.js";
import { isolationRuntimeService } from "./worktreeIsolation.js";
import {
  shouldConsiderToolHostsNotice,
  buildToolHostsNoticeAttachments,
} from "../remote/tools/toolHostsNotice.js";
import { prefetchArtifactOpening } from "./attachments/artifactOpeningPrefetch.js";
import { getRuntimeModelSwitchAnnouncements, SECONDARY_CONTEXT_WINDOW } from "./model/model.js";
import { isSurfaceFailedServersEnabled, isSortedOtterOn } from "../services/mcp/mcpGates.js";
import { collectFailedMcpServers, redialAllowsServer } from "../services/mcp/redactMcpErrors.js";
import {
  claudeMdExtraState,
  getWorktreeRoots,
  isInMainRepoOutsideWorktree,
  getAdditionalClaudeMdDirs,
  getMaxMemoryFileChars,
  lexMarkdownWith,
  getManagedAndUserConditionalRules,
  getMemoryFilesForNestedDirectory,
  getConditionalRulesForCwdLevelDirectory,
  getWithheldInstructionFiles,
  applyClaudeMdExcludesToInjected,
} from "./claudemd.js";
import { proactivityAttachments } from "./proactivity.js";
import { toolSearchReminderConfig } from "../services/analytics/juniperShoalConfig.js";
import { isAgentSwarmsEnabled } from "./agentSwarmsEnabled.js";
import { isFocusModeFlag } from "./focusMode.js";
import {
  isSilentTurnReminderEnabled,
  getSilentTurnReminderSeconds,
  SILENT_TURN_REMINDER_MIN_GAP,
  cachedSilentTurnReminderTurns,
  getSilentTurnReminderText,
} from "./attachments/silentTurnReminder.js";
import { getCriticalReminderAttachment } from "./attachments/criticalReminders.js";
import {
  isTurnCompanion,
  extractTextContent_2,
  isOnlySystemReminders,
  isParsedWillowEnabled,
  isDapperCupcakeOn,
  getUserMessageText,
  isThinkingOnlyMessage,
} from "./messages.js";
import {
  isElapsedTimeReminderEnabled,
  getElapsedTimeReminderAttachments,
} from "./attachments/elapsedTimeReminder.js";
import {
  getTotalTokensReminderMode,
  shouldRemindAfterUserTurn,
  totalTokensReminderByRoot,
  getTotalTokensReminderBudget,
  formatTotalTokensTag,
} from "./attachments/totalTokensReminder.js";
import {
  isWorkflowsAvailable,
  isWorkflowKeywordTriggerEnabled,
  isProSubscriber,
} from "./workflows/workflowGates.js";
import { latestWorkflowSize } from "./workflowSizeGuideline.js";
import { hasWatchdogObservation, lowResourceReminders } from "./resourceWatchdog.js";
import {
  noteAttachmentProducer,
  noteChangedFilesReread,
  noteChangedFilesCompared,
  AttachmentTimingProfile,
  runWithQueryProfile,
  noteAttachmentPass,
} from "./queryProfiler.js";
import { jsonStringify } from "./slowOperations.js";
import { logEvent } from "../services/analytics/index.js";
import { fromEnum, fromNumber } from "../services/analytics/safeMetadata.js";
import {
  ImageResizeError,
  checkImageBlockSource,
  maybeResizeAndDownsampleImageBlock,
} from "./imageResizer.js";
import { logForDebugging, logAntError, createAttachmentMessage_2 } from "./debug.js";
import {
  withTelemetryMessage,
  toError,
  isAbortError,
  isENOENT,
  AbortError as AbortError_2,
} from "./errors.js";
import { isGlimmeringFinchGateOn } from "./messages/untrustedArtifactContent.js";
import {
  unreadableToolsUsed,
  joinWithNewlineIfAny,
  unreadableToolsLine,
  listUnreadableToolsUsed,
} from "./agentListing.js";
import { hasSendMessageTool } from "../tools/SendMessageTool/constants.js";
import { isMessagingLimitedToOwnAgents } from "../tools/SendMessageTool/SendMessageTool.js";
import {
  isHumanOrUnset,
  isAutoContinuationOrigin,
  isProjectsRelay,
  forwardedTurnReminder,
  mintedDeliveries,
} from "./messageProvenance.js";
import {
  notifySetupGuidePasted,
  notifySetupGuideLoaded,
  isHiddenFromModel,
  mcpPromptCommandsWithReserved,
  dropSyncedNameClashes,
} from "./commandPredicates.js";
import { isHumanOrigin } from "./turnOrigin.js";
import { replacePromptText, formatNewDiagnosticsAttachment } from "./attachments/diagnostics.js";
import { getTaskRunState } from "./task/taskNotifications.js";
import { keepBridgeFileIds } from "./attachments/bridgeAttachments.js";
import { normalizeTaskNotificationOrigin } from "./backgroundSessionResume.js";
import {
  isPollEventMode,
  collectDeclaredPollEvents,
  mentionsSessionNoticeKind,
  getPollEventEnvelope,
} from "./pollEvents.js";
import { hasCrossSessionString } from "./messages/crossSessionMessages.js";
import { isVelvetyRippleOn, hasNarrationThinking } from "./messages/apiNormalization.js";
import { declaredRoundStamp } from "./pollEvents/declarations.js";
import { drainPendingMessages } from "../tasks/LocalAgentTask/pendingMessages.js";
import { agentMessageOrigin, receiveAgentMessage } from "../plugins/functionHooks/sessionReceive.js";
import { stripPeerMessageBody } from "./peerMessageHeaders.js";
import { dropIfAnyMessages } from "../services/mcp/ccrTurnId.js";
import { isNonEmptyImageAttachment } from "./messages/messagePredicates.js";
import { NO_CONTENT_MESSAGE, NO_RESPONSE_REQUESTED } from "../constants/messages.js";
import { ASKUSERQUESTION } from "../tools/AskUserQuestionTool/prompt.js";
import { BRIEF_TOOL_NAME, LEGACY_BRIEF_TOOL_NAME } from "./conversationRecovery.js";
import { EXITPLANMODE } from "../tools/ExitPlanModeTool/constants.js";
import { SEND_USER_FILE_TOOL_NAME } from "../tools/SendUserFileTool/prompt.js";
import { isVirtualConversationMessage } from "../bootstrap/sessionSlices.js";
import { logFeatureOk, logFeatureSad, logFeatureBad } from "../services/analytics/featureTelemetry.js";
import { isStorageV5Enabled } from "./hoverRest.js";
import { settlePlanFileCachePrime, getPlanSlug, getPlanFilePath, getPlan } from "./plans.js";
import {
  leanPromptFor,
  getPromptModel,
  isThriftySonicEnabled,
  bashFirstSteerVariant,
} from "./model/promptBundles.js";
import { BASH_TOOL_NAME } from "../tools/BashTool/toolName.js";
import { FILE_EDIT_TOOL_NAME } from "../tools/FileEditTool/constants.js";
import { FILE_WRITE_TOOL_NAME } from "../tools/FileWriteTool/prompt.js";
import { isTeammate, getTeamName, getAgentId, getAgentName, getTeammateContext } from "./teammate.js";
import {
  isAutoModeConsentFlowEnabled,
  getDenyRuleIndex,
  getDispatchableAgents,
  mergePersistedDenyRules,
} from "./permissions/permissions.js";
import { isAutoModeActive } from "./permissions/autoModeState.js";
import { isUltrathinkEnabled, hasUltrathinkKeyword } from "./thinking.js";
import { hasUltraplanKeyword } from "./ultraplan/keyword.js";
import { isUltracodeActive } from "./effort.js";
import {
  getNonDeferrableBuiltins,
  toolSearchToolFilteredOut,
  isToolSearchEnabledOptimistic,
  modelSupportsToolReference,
  isVertexModelWithoutToolSearch,
  isToolSearchToolAvailable,
  toolSearchDeclaredIn,
  toolSearchRejectedOn,
  getDeferredToolsDelta,
  maybeAddBrowserBatchToChromeSelect,
  getToolSearchMode,
  extractDiscoveredToolNames,
} from "./toolSearch.js";
import { computeDeclaredToolSet } from "../services/api/claude.js";
import {
  isDeferredTool as isDeferredTool_2,
  isDeferredToolByEngine,
  isDeferredToolInConversation,
  TOOL_SEARCH_TOOL_NAME,
} from "../tools/ToolSearchTool/prompt.js";
import { getCanonicalName } from "./model/canonicalModelName.js";
import { findLatestDeferredToolsDelta } from "../services/api/toolDefinitionShape.js";
import { getToolListingHash, buildToolListingEntries } from "./api.js";
import { UNCLASSIFIED_2 } from "../services/mcp/mcpToolRemovalReasons.js";
import { isToolDisallowedThisTurn } from "../cli/printUsageSummary.js";
import {
  describeToolAvailability,
  isPermanentUnavailability,
  pendingServersForTool,
} from "../services/mcp/mcpToolAvailability.js";
import { AGENT, FORK } from "../tools/AgentTool/constants.js";
import { getMcpServerNameOfTool } from "../services/mcp/utils.js";
import { filterAgentsByMcpRequirements } from "../tools/AgentTool/loadAgentsDir.js";
import { compareStringsGrouped, plural, countCharInString } from "./stringUtils.js";
import { formatAgentLine, shouldSteerCostToHost } from "../tools/AgentTool/prompt.js";
import { marketplaceSuffix } from "./plugins/pluginIdentifier.js";
import { BUILTIN } from "./telemetry/pluginTelemetry.js";
import { getSubagentSteer } from "./model/subagentSteer.js";
import { claudeInChromeSession } from "../commands/mobile/mobile.js";
import { CLAUDE_IN_CHROME_MCP_SERVER_NAME } from "./claudeInChrome/common.js";
import { isClaudeAiProxyServer } from "../services/mcp/builtinServerNames.js";
import { CHROME_TOOL_SEARCH_REMINDER } from "./toolSearchChrome.js";
import { getMcpInstructionsDelta } from "./mcpInstructionsDelta.js";
import { buildMcpDroppedToolsDelta } from "./attachments/mcpDroppedTools.js";
import { getSettings_DEPRECATED } from "./settings/settings.js";
import { getOutputStyleConfig } from "../constants/outputStyles.js";
import { hasBackgroundBashStopAfterReply } from "../tools/AgentTool/backgroundGates.js";
import { isTidySlothGateOn } from "../tasks/LocalShellTask/backgroundNotices.js";
import { isMonitorShellTask } from "../tasks/taskKinds.js";
import { isLocalShellTask } from "../tasks/LocalShellTask/guards.js";
import { hasAccessToIDEExtensionDiffFeature_2 } from "./ide.js";
import {
  isAttachmentReadDeniedOrThrown,
  isPathWithinOrEqual,
  findWorktreeForPath,
  mapCheckoutPathIntoWorktree,
  mapPathIntoWorktree,
  getAttachmentReadBlockReason,
  markContentNotInModelContext,
} from "./attachments/fileAttachments.js";
import { isRestrictedReadBlocked } from "./claudeInChrome/fileUpload.js";
import { getCwd, getCwdOrNull } from "./cwd.js";
import { getFsImplementation } from "./fsOperations.js";
import {
  hasInstructionsLoadedHook,
  executeInstructionsLoadedHooks,
  executePreToolHooks,
  emitHookMetrics,
} from "./hooks.js";
import { getReadTimestamp } from "../tools/FileReadTool/savedOutputPaths.js";
import {
  isTruncatedCopyOf,
  truncateInstructionsAtLine,
  latestInstructionFiles,
} from "./contextAttachments/instructions.js";
import {
  stripBomAndCarriageReturn,
  remoteFileStateKeys,
  matchesContentHash,
  hasFullFileContent,
} from "./remoteFileState.js";
import { collectNestedMemoryContents } from "./attachments/nestedMemory.js";
import { pathInAllowedWorkingPath, outsideReadBlocked } from "./permissions/filesystem.js";
import { memoryPickerMaps, memoryPickerSets, selectMemoryRecall } from "../memdir/memoryRecallSelect.js";
import { getModelContextInfo } from "./model/modelContextInfo.js";
import {
  getAutoCompactThresholdTokens,
  estimateTokensWithAnchor,
  hasUsageAnchor,
} from "../services/compact/autoCompact.js";
import { stripInProgressAssistantMessage } from "../commands/btw/btw.js";
import { isCoworkAny } from "./entrypointKinds.js";
import { getDefaultFileReadingLimits } from "../tools/FileReadTool/limits.js";
import { MAX_LINES_TO_READ } from "../tools/FileReadTool/prompt.js";
import {
  readFileInRangeFast,
  defaultOutputRoots,
  checkFileStateResyncOnce,
  FileTooLargeError,
  SelectedRangeTooLargeError,
} from "./readFileInRange.js";
import { addLineNumbers, getFileModificationTimeAsync, isFileWithinSizeBound } from "./file.js";
import {
  validateContentTokens,
  MaxFileReadTokenExceededError,
  allowLargeRoomTokens,
  FileReadTool,
  readImageWithTokenBudget,
  isUncountedPDFOverWholeReadCap,
} from "../tools/FileReadTool/FileReadTool.js";
import { expandPath, isNotebookPath } from "./path.js";
import { logAtMention } from "./telemetry/thirdPartyEventRecords.js";
import { hasBinaryExtension } from "../constants/files.js";
import { isCrossSessionMessagingEnabled } from "./crossSessionMessagingGate.js";
import { parsePeerMentions, resolveTeamName, resolvePeerMentions } from "./peerAddressing.js";
import { isConnectedOrCached } from "../skills/bundled/scheduleRemoteAgents.js";
import { hasWithheldResources } from "../services/mcp/withheldResources.js";
import {
  noopSkillFetch,
  classifySkillResourceUri,
  countUniqueFiles,
  verifySkillFile,
  MCP_SKILL_FILE_PROBLEMS,
} from "../services/mcp/mcpSkills.js";
import { recordToolUsed } from "../services/compact/keptTools.js";
import { READMCPRESOURCETOOL } from "../tools/ReadMcpResourceTool/prompt.js";
import { readMcpResource, callMcpTool } from "../services/mcp/mcpWireUtils.js";
import { reportOnce } from "./reportOnce.js";
import { getSnippetForTwoFileDiff } from "../tools/FileEditTool/utils.js";
import { isSensitiveFileName } from "./permissions/sensitivePaths.js";
import { getFileExtensionForAnalytics, agentTypeForTelemetry } from "../services/analytics/metadata.js";
import { errorTelemetryFields } from "./accessibility/screenReader.js";
import {
  getAutoMemPathState,
  getAutoMemPath,
  isIndexRecallEnabled,
  activeSessionLogExcluder,
  isAutoMemoryEnabled,
  isMemoryRecallEnabled,
  getAutoMemEntrypoint,
} from "../memdir/paths.js";
import { isAutoMemReadFenced } from "./permissions/readBlock.js";
import { waitForFirstStorePull, firstStorePullPending } from "../services/orgMemory/storePulls.js";
import { resolveAgentMemoryDirForRecall, isRealpathWithin } from "../tools/AgentTool/agentMemory.js";
import { isMultiStoreSyncAvailable } from "../services/memorySync/availability.js";
import { readMemoryFileForRecall } from "../memdir/memoryRecall.js";
import { FILE_READ_TOOL_NAME, isImageOrPdfExtension } from "../tools/FileReadTool/constants.js";
import { MEMDIR_RELEVANCE } from "../memdir/findRelevantMemories.js";
import { normalizeNfkc, isNonEmptyIdentifier, CONTROL_CHARS_OR_ANGLE_RE } from "./sanitization.js";
import { hasClearedToolResultsAfterIdle } from "../services/compact/microCompact.js";
import { getOrgMemoryDecision } from "../services/orgMemory/orgMemoryDecision.js";
import { withDeadline } from "./sleep.js";
import { addSkillDirectories } from "../skills/loadSkillsDir.js";
import { memorySkillCommands, pendingMemorySkillQueue } from "../services/memorySync/memorySkills.js";
import { uniqByExport } from "../../vendor/lodash-es/uniqBy.js";
import { getSkillListingDigest, formatCommandsWithinBudget } from "../tools/SkillTool/prompt.js";
import { getContextWindow } from "./model/configs.js";
import { getSkillUsageScore } from "./suggestions/skillUsageTracking.js";
import { bytesPerTokenForModel } from "./model/modelDisplay.js";
import { WORD_BOUNDARY_PATTERN, CJK_PUNCTUATION, isWordCharCodeAt } from "./attachments/atMentions.js";
import { SHELL_TOOL_NAMES as SHELL_TOOL_NAMES_3 } from "./shell/shellToolUtils.js";
import { alwaysFalseStream } from "../tools/RefreshMcpToolsTool/RefreshMcpToolsTool.js";
import { diagnosticTrackingSlot } from "../services/diagnosticTracking.js";
import { checkForLSPDiagnostics, clearAllLSPDiagnostics } from "../services/lsp/LSPDiagnosticRegistry.js";
import { roughTokenCountEstimationForObject } from "../services/tokenEstimation.js";
import { isDocumentExtension, isNotClaude3Model } from "./model/claude3Models.js";
import { getPdfPageCount } from "./pdf.js";
import { MAX_PDF_PAGES_PER_TURN } from "./mediaLimits.js";
import { isInboundFileArriving } from "../bridge/attachmentFilesWait.js";
import { SymlinkReadRefusedError } from "./fsSafety/atomicWriteStaging.js";
import { TODO_WRITE_TOOL_NAME } from "../tools/TodoWriteTool/constants.js";
import { isBriefToolActive } from "../constants/prompts.js";
import { TASK_CREATE_TOOL_NAME } from "../tools/TaskCreateTool/constants.js";
import { TASK_UPDATE_TOOL_NAME } from "../tools/TaskUpdateTool/constants.js";
import { getSurfacedToolNames } from "../bootstrap/stateSlices.js";
import { generateTaskAttachments } from "./task/framework.js";
import { willToolsLoseSessionState } from "../services/compact/compactCarry.js";
import { getTaskOutputPath } from "./task/diskOutput.js";
import { checkForNewAsyncHookResponses } from "./hooks/AsyncHookRegistry.js";
import { isAsyncHookResponseDuplicate } from "./attachments/asyncHookResponses.js";
import { stripMetricsForMcpInbound } from "./hooks/hookEventHelpers.js";
import { messageIdentityKey, markMessagesAsReadByPredicate } from "./teammateMailbox.js";
import { getClaudeConfigDir } from "./envUtils.js";
import { effectiveContextWindow } from "../services/compact/autoCompactWindow.js";
import { tokenCountFromLastAPIResponse, getTokenUsage } from "./tokens.js";
import { isForkBoilerplateMessage } from "../constants/xml.js";
import { getTokenCountFromUsage as getTokenCountFromUsage_5 } from "./messages/usageAndStopReason.js";
import { getSessionCostUSD } from "../cost-tracker.js";
import { deferInit } from "../../runtime/deferred-init.js";

//@ chunk-bnwcqde4.js:4394-4502 fingerprint (2.1.88 match: createAttachmentMessage, 1)
/**
 * 把一个 Attachment 包成内部 attachment 消息 {type:"attachment", uuid, timestamp, attachment}（jlr 规整附件字段）。
 */
function createAttachmentMessage(condition, condition_2) {
  return {
    type: "attachment",
    uuid: randomUUID(),
    timestamp: new Date().toISOString(),
    attachment: buildGoalSentinelAttachment(condition, condition_2),
  };
}
//@ chunk-e6aww6q8.js:117298-117385 fingerprint (2.1.88 match: memoryHeader, 1)
/**
 * 记忆文件标题行："<相对时间> Memory: <路径>:"，无时间时 "Memory: <路径>:"；relevant_memories 附件与 normalizeAttachmentForAPI 共用。
 */
function memoryHeader(path, mtimeMs) {
  let staleness = memoryFreshnessText(mtimeMs);
  let displayPath = singleLineMemoryText(path);
  return staleness
    ? `${staleness}

Memory: ${displayPath}:`
    : `Memory: ${displayPath}:`;
}
//@ chunk-e6aww6q8.js:195424-195506 fingerprint (2.1.88 match: INLINE_NOTIFICATION_MODES, 1)
/**
 * origin.kind 为 task-notification 时返回 "task-notification"，否则 "prompt"。旧版名 INLINE_NOTIFICATION_MODES 为错配（那是常量集合 jxr）。
 */
function getQueuedNotificationMode(notification) {
  return notification?.kind === "task-notification" ? "task-notification" : "prompt";
}
//@ chunk-e6aww6q8.js:1327724-1327982 placement
/**
 * （误归 computerUse）判断目录项在读权限下是否应隐藏。
 */
async function isEntryHiddenByPermissions(entry, ctx, signal) {
  let mapped = ctx.spellings.map((spelling) => join(spelling, entry.name));
  let [primaryPath] = mapped;
  if (primaryPath === undefined || ctx.isDenied(primaryPath, ctx.context)) return true;
  let filePath =
    !entry.isFile() && !entry.isDirectory() && isInstructionReadRestricted(ctx.context)
      ? await readableInstructionSpellings(primaryPath, ctx, signal)
      : mapped;
  return (
    filePath === undefined ||
    isFileReadDenied_2(filePath, ctx.context) ||
    (!entry.isFile() && isFileReadDenied(filePath, ctx.context))
  );
}
//@ chunk-e6aww6q8.js:1327982-1327994 placement
/**
 * 目录项扫描上限 1 万。
 */
var MAX_SCANNED_ENTRIES = 1e4;
//@ chunk-e6aww6q8.js:1327994-1328007 placement
/**
 * 目录项列出上限 1000。
 */
var MAX_LISTED_ENTRIES = 1000;
//@ chunk-e6aww6q8.js:1328056-1328376 placement (2.1.88 match: sanitizeAppNames, 0.528)
/**
 * （误归 computerUse）过滤被拒绝的目录项，最多扫描 1 万、列出 1000，超出追加 "… and N more entries"。
 */
async function filterListableEntries(entries, ctx, signal) {
  let instructionRestricted = isInstructionReadRestricted(ctx.context);
  let names = [];
  let min = Math.min(entries.length, MAX_SCANNED_ENTRIES);
  let index = 0;
  while (index < min && names.length < MAX_LISTED_ENTRIES) {
    if (instructionRestricted && index > 0 && index % WALK_FLUSH_INTERVAL === 0) await THo();
    let entry = entries[index];
    let hidden =
      entry === undefined || (await isEntryHiddenByPermissions(entry, ctx, signal).catch(() => true));
    if (instructionRestricted && signal.aborted) break;
    index++;
    if (entry !== undefined && !hidden) names.push(entry.name);
  }
  return index < entries.length ? [...names, `\u2026 and ${entries.length - index} more entries`] : names;
}
//@ chunk-e6aww6q8.js:1351122-1351244 fingerprint (2.1.88 match: getNestedMemoryAttachmentsForFile, 0.777)
/**
 * 记忆文件是否计入：tengu_paper_halyard 开时排除 Project/Local 类型，其余要求有内容。旧版名 getNestedMemoryAttachmentsForFile 为错配。
 */
function shouldIncludeMemoryFile(memoryFile) {
  if (
    (memoryFile.type === "Project" || memoryFile.type === "Local") &&
    getFeatureValue_CACHED_MAY_BE_STALE("tengu_paper_halyard", false)
  )
    return false;
  return Boolean(memoryFile.content);
}
//@ chunk-e6aww6q8.js:2305550-2305865 placement
/**
 * URL 是否为 https://mcp.slack.com（严格校验）。
 */
function isSlackMcpUrl(urlText) {
  if (typeof urlText !== "string" || /[^\u0021-\u007e]|[\\@]/.test(urlText)) return false;
  let lower = urlText.slice(0, 21).toLowerCase();
  let nextChar = urlText.charAt(21);
  if (
    lower !== "https://mcp.slack.com" ||
    (nextChar !== "" && nextChar !== "/" && nextChar !== "?" && nextChar !== "#")
  )
    return false;
  try {
    let parsedUrl = new URL(urlText);
    return parsedUrl.origin === "https://mcp.slack.com" && !parsedUrl.pathname.startsWith("//");
  } catch {
    return false;
  }
}
//@ chunk-e6aww6q8.js:2305865-2311068 placement
/**
 * computer-use MCP 的使用说明长文本（工具分层选择、访问流程、链接与金融操作安全）。
 */
var COMPUTER_USE_MCP_INSTRUCTIONS = `You have a computer-use MCP available (tools named \`mcp__computer-use__*\`). It lets you take screenshots of the user's desktop and control it with mouse clicks, keyboard input, and scrolling.

**Pick the right tool for the app.** Each tier trades speed/precision against coverage:

1. **Dedicated MCP for the app** \u2014 if the task is in an app that has its own MCP (Slack, Gmail, Calendar, Linear, etc.) and that MCP is connected, use it. API-backed tools are fast and precise.
2. **Chrome MCP** (\`mcp__claude-in-chrome__*\`) \u2014 if the target is a web app and there's no dedicated MCP for it, use the browser tools. DOM-aware, much faster than clicking pixels. If the Chrome extension isn't connected, ask the user to install it rather than falling through to computer use.
3. **Computer use** \u2014 for native desktop apps (Maps, Notes, Finder, Photos, System Settings, any third-party native app) and cross-app workflows. Computer use IS the right tool here \u2014 don't decline a native-app task just because there's no dedicated MCP for it.

This is about what's available, not error handling \u2014 if a dedicated MCP tool errors, debug or report it rather than silently retrying via a slower tier.

**Look before you assert.** If the user asks about app state (what's open, what's connected, what an app can do), take a screenshot and check before answering. Don't answer from memory \u2014 the user's setup or app version may differ from what you expect. If you're about to say an app doesn't support an action, that claim should be grounded in what you just saw on screen, not general knowledge. Similarly, \`list_granted_applications\` or a fresh \`screenshot\` is cheaper than a wrong assertion about what's running.

**Loading via ToolSearch \u2014 load in bulk, not one-by-one:** if computer-use tools are in the deferred list, load them ALL in a single ToolSearch call: \`{ query: "computer-use", max_results: 30 }\`. The keyword search matches the server-name substring in every tool name, so one query returns the entire toolkit. Don't use \`select:\` for individual tools \u2014 that's one round-trip per tool.

**Access flow:** before any computer-use action you must call \`request_access\` with the list of applications you need. The user approves each application explicitly, and you may need to call it again mid-task if you discover you need another application. Finder is an application like any other: clicking the desktop, the Dock, or a Finder window (including Go to Folder) requires a Finder grant. The menu bar does not, as long as the app that is frontmost is one you already have access to.

**Tiered apps:** some apps are granted at a restricted tier based on their category \u2014 the tier is displayed in the approval dialog and returned in the \`request_access\` response:
- **Browsers** (Safari, Chrome, Firefox, Edge, Arc, etc.) \u2192 tier **"read"**: visible in screenshots, but clicks and typing are blocked. You can read what's already on screen. For navigation, clicking, or form-filling, use the claude-in-chrome MCP (tools named \`mcp__claude-in-chrome__*\`; load via ToolSearch if deferred).
- **Terminals and IDEs** (Terminal, iTerm, VS Code, JetBrains, etc.) \u2192 tier **"click"**: visible and left-clickable, but typing, key presses, right-click, modifier-clicks, and drag-drop are blocked. You can click a Run button or scroll test output, but cannot type into the editor or integrated terminal, cannot right-click (the context menu has Paste), and cannot drag text onto them. For shell commands, use the Bash tool.
- **Everything else** \u2192 tier **"full"**: no restrictions.

The tier is enforced by the frontmost-app check: if a tier-"read" app is in front, \`left_click\` returns an error; if a tier-"click" app is in front, \`type\` and \`right_click\` return errors. The error tells you what tier the app has and what to do instead. \`open_application\` works at any tier \u2014 bringing an app forward is a read-level operation.

**Link safety \u2014 treat links in emails and messages as suspicious by default.**
- **Never click web links with computer-use tools.** If you encounter a link in a native app (Mail, Messages, a PDF, etc.), do NOT \`left_click\` it. Open the URL via the claude-in-chrome MCP instead.
- **See the full URL before following any link.** Visible link text can be misleading \u2014 hover or inspect to get the real destination.
- **Links from emails, messages, or unknown-sender documents are suspicious by default.** If the destination URL is at all unfamiliar or looks off, ask the user for confirmation before proceeding.
- **Inside the Chrome extension** you can click links with the extension's tools, but the suspicion check still applies \u2014 verify unfamiliar URLs with the user.

**Financial actions - do not execute trades or move money.** Budgeting and accounting apps (Quicken, YNAB, QuickBooks, etc.) are granted at full tier so you can categorize transactions, generate reports, and help the user organize their finances. But never execute a trade, place an order, send money, or initiate a transfer on the user's behalf - always ask the user to perform those actions themselves.`;
//@ chunk-e6aww6q8.js:2311068-2311297 placement
/**
 * Slack MCP 发消息前查看频道说明的提示。
 */
var SLACK_MCP_POSTING_GUIDANCE =
  "Before posting a new message to a Slack channel the user didn't name, read its topic and description with slack_search_channels, and if they say that kind of message belongs elsewhere, tell the user instead of posting.";
//@ chunk-e6aww6q8.js:2311297-2311501 placement (2.1.88 match: pinCacheEdits, 0.707)
/**
 * MCP 服务器附加说明块：Slack MCP 的发帖提示，以及（未禁用时）computer-use 说明。旧版名 pinCacheEdits 为错配；属于 MCP 说明，归错文件。
 */
function getMcpServerInstructionBlocks(mcpClients) {
  let mapped = [
    ...new Set(
      mcpClients
        .filter((mcpClient) => {
          let url = getServerUrl_2(mcpClient.config);
          return url !== null && isSlackMcpUrl(unwrapCcrProxyUrl(url));
        })
        .map((mcpClient) => mcpClient.name),
    ),
  ].map((serverName) => ({
    serverName,
    block: SLACK_MCP_POSTING_GUIDANCE,
  }));
  return isHostedDesktopSession()
    ? mapped
    : [
        {
          serverName: COMPUTER_USE_MCP_SERVER_NAME,
          block: COMPUTER_USE_MCP_INSTRUCTIONS,
        },
        ...mapped,
      ];
}
//@ chunk-e6aww6q8.js:3310228-3310295 fingerprint (2.1.88 match: TODO_REMINDER_CONFIG, 1)
/**
 * {TURNS_SINCE_WRITE:10, TURNS_BETWEEN_REMINDERS:10}：距上次 TodoWrite 与上次提醒都满 10 轮才发 todo_reminder。
 */
var accountMemoryRecall = null;
var TODO_REMINDER_CONFIG = {
  TURNS_SINCE_WRITE: 10,
  TURNS_BETWEEN_REMINDERS: 10,
};
//@ chunk-e6aww6q8.js:3310295-3310443 layout
/**
 * CLAUDE_CODE_TODO_REMINDER_MODE 优先；否则 GrowthBook tengu_soft_slate_nudge 为 off 时 "off"，默认 "baseline"。
 */
function getTodoReminderMode() {
  let CLAUDE_CODE_TODO_REMINDER_MODE = env.CLAUDE_CODE_TODO_REMINDER_MODE;
  if (CLAUDE_CODE_TODO_REMINDER_MODE !== undefined) return CLAUDE_CODE_TODO_REMINDER_MODE;
  return getFeatureValue_CACHED_MAY_BE_STALE("tengu_soft_slate_nudge", "baseline") === "off"
    ? "off"
    : "baseline";
}
//@ chunk-e6aww6q8.js:3310443-3310552 fingerprint (2.1.88 match: PLAN_MODE_ATTACHMENT_CONFIG, 0.8)
/**
 * {TURNS_BETWEEN_MAINTENANCE:10}：ultra effort 维持期间每 10 轮重发一次精简 ultra_effort_enter。
 */
var PLAN_MODE_ATTACHMENT_CONFIG = {
  TURNS_BETWEEN_ATTACHMENTS: 5,
  FULL_REMINDER_EVERY_N_ATTACHMENTS: 5,
};
var ULTRA_EFFORT_CONFIG = {
  TURNS_BETWEEN_MAINTENANCE: 10,
};
//@ chunk-e6aww6q8.js:3310552-3310652 layout
/**
 * 有限数字向下取整且至少为 1，否则 undefined。
 */
function toPositiveInt(value) {
  if (typeof value !== "number" || !Number.isFinite(value)) return;
  return Math.max(1, Math.floor(value));
}
//@ chunk-e6aww6q8.js:3310652-3310891 layout
/**
 * ultra effort 精简提醒间隔：CLAUDE_CODE_JUNIPER_SUNDIAL → 远程设置/GrowthBook tengu_juniper_sundial → 默认 10。
 */
function getUltraEffortReminderInterval() {
  let CLAUDE_CODE_JUNIPER_SUNDIAL = env.CLAUDE_CODE_JUNIPER_SUNDIAL;
  if (CLAUDE_CODE_JUNIPER_SUNDIAL !== undefined) return CLAUDE_CODE_JUNIPER_SUNDIAL;
  let positiveInt = toPositiveInt(getCachedClientData()?.tengu_juniper_sundial);
  if (positiveInt !== undefined) return positiveInt;
  let positiveInt_2 = toPositiveInt(getFeatureValue_CACHED_MAY_BE_STALE("tengu_juniper_sundial", null));
  if (positiveInt_2 !== undefined) return positiveInt_2;
  return ULTRA_EFFORT_CONFIG.TURNS_BETWEEN_MAINTENANCE;
}
//@ chunk-e6aww6q8.js:3310891-3310925 fingerprint (2.1.88 match: RELEVANT_MEMORIES_CONFIG, 1)
/**
 * {MAX_SESSION_BYTES:61440}：一个会话里相关记忆附件累计上限 60KB，超过不再预取。
 */
var RELEVANT_MEMORIES_CONFIG = {
  MAX_SESSION_BYTES: 61440,
};
//@ chunk-e6aww6q8.js:3310925-3311033 layout
/**
 * CLAUDE_CODE_DISABLE_ATTACHMENTS、CLAUDE_CODE_SIMPLE 或 bareFork 时为真；此时 getAttachments 只产出队列命令与少数必需增量。
 */
function areAttachmentsDisabled(toolUseContext) {
  return Boolean(
    env.CLAUDE_CODE_DISABLE_ATTACHMENTS || env.CLAUDE_CODE_SIMPLE || toolUseContext.options.bareFork,
  );
}
//@ chunk-e6aww6q8.js:3311033-3319176 fingerprint (2.1.88 match: getAttachments, 0.511)
/**
 * getAttachments：每轮生成附件的入口。子代理委托观察时返回空；附件被禁用时只给队列命令、代理列表增量、沙箱说明等。否则在 1 秒超时的独立 AbortController 下并发运行各生成器（每个经 maybe 包装、计时、出错返回空）：用户输入类（@ 文件、MCP 资源、代理/技能/同伴提及）、全线程类（队列命令、环境、模型、延迟工具/代理/MCP 增量、变更文件、嵌套记忆、技能列表、计划/自动模式、待办、团队、关键提醒、token/预算提醒…）、仅主线程类（IDE 选区/打开文件、输出风格、诊断、任务状态、异步钩子、记忆更新、withheld 记忆、token 用量）。结果经 dedupeWithheldMemory 去重。
 */
async function getAttachments(
  input,
  toolUseContext,
  ideSelection,
  queuedCommands,
  messages,
  querySource,
  options,
) {
  if (isDelegatedObservationContext(toolUseContext.agentContext)) return [];
  let conversationLatches = options?.conversationLatches ?? stickyBetasForRequest(toolUseContext);
  let normalizedMessages = messagesSinceCompactBoundary(messages ?? []);
  let shouldWithdrawSpawnedLoopMemory =
    options?.afterToolStep === true &&
    (toolUseContext.agentId !== undefined || classifyQuerySource(querySource) !== "main") &&
    normalizedMessages.some(
      (normalizedMessage) =>
        normalizedMessage.type === "attachment" &&
        normalizedMessage.attachment.type === "cowork_memory_context" &&
        normalizedMessage.attachment.content !== null,
    );
  let declaredToolSource =
    conversationLatches === undefined
      ? undefined
      : getDeclaredToolSource(
          conversationLatches,
          normalizedMessages,
          toolUseContext.options,
          toolUseContext.options.tools,
          getToolPermissionContext(toolUseContext),
        );
  if (messages !== undefined)
    try {
      let seedingLatches = options?.conversationLatches ?? stickyBetasForRequest(toolUseContext);
      if (seedingLatches !== undefined && !seedingLatches.declaredToolsDecided) {
        seedWireShapeFromRecord(
          seedingLatches,
          snapshotIfEnabled(messages, toolUseContext.options)?.wireShape,
          toolUseContext.options.mainLoopModel,
        );
        let recordedDeferred = recordedDeferredTools(normalizedMessages);
        mergeNameOnlyAnnouncements(seedingLatches, recordedDeferred);
        seedDeferredToolReferences(normalizedMessages, [...recordedDeferred.entries.values()], {
          strippedReferences: recordedDeferred.strippedReferences,
        });
        if (recordedDeferred.toolInputCopies.size > 0 && isEchoWireToolInputsEnabled(normalizedMessages))
          adoptWireToolInputCopies(normalizedMessages, recordedDeferred.toolInputCopies);
      }
    } catch (error) {
      logError(error);
    }
  let toolPoolRefreshes = toolUseContext.options.refreshTools !== undefined;
  let modelImageLimits = imageLimitsForModel(toolUseContext.options.mainLoopModel);
  let remainingWakePolls = toolUseContext.messageQueue.countRemainingWakePollEventsAfter(queuedCommands);
  if (areAttachmentsDisabled(toolUseContext)) {
    if (options?.inputMentionsOnly) return [];
    let queuedCommandAttachments = await getQueuedCommandAttachments(
      queuedCommands,
      modelImageLimits,
      remainingWakePolls,
      {
        tools: toolUseContext.options.tools,
        messages: toolUseContext.messages,
      },
    );
    if (env.CLAUDE_CODE_SIMPLE) return queuedCommandAttachments;
    return [
      ...queuedCommandAttachments,
      ...(await getAgentListingDeltaAttachment(toolUseContext, normalizedMessages)),
      ...getSandboxInstructionsAttachments(toolUseContext.options.tools, messages),
      ...(await getEnvironmentChangeAttachments(toolUseContext, messages)),
      ...(shouldWithdrawSpawnedLoopMemory
        ? await maybe("spawned_loop_memory_withdrawal", async () =>
            withdrawCoworkMemoryContext(toolUseContext.session.host, normalizedMessages),
          )
        : []),
    ];
  }
  let abortController = getAttachmentTimingStore();
  abortController?.mark("setup");
  let attachmentAbortController = createAbortController();
  let timeoutId = setTimeout((ac) => ac.abort(), 1000, attachmentAbortController);
  let timedContext = {
    ...toolUseContext,
    abortController: attachmentAbortController,
  };
  let isMainThread = !toolUseContext.agentId;
  let hostStatusNudge = getReplyGatePolicy()?.statusNudge;
  let hostPromptReminder = getReplyGatePolicy()?.promptReminder;
  let mentionedFiles = input ? extractAtMentionedFiles(input) : uniq(options?.ownFilePaths ?? []);
  let atMentionedFilesPromise =
    mentionedFiles.length > 0 && !env.CLAUDE_CODE_EVAL_CONFINED
      ? getDisableFileMentions() || env.CLAUDE_CODE_DISABLE_FILE_MENTIONS
        ? getFileMentionReferences(mentionedFiles, toolUseContext, messages ?? toolUseContext.messages)
        : getAtMentionedFileAttachments(
            mentionedFiles,
            timedContext,
            toolUseContext.abortController,
            options?.promptLoopId,
          )
      : Promise.resolve([]);
  let userInputProducers = input
    ? [
        maybe("at_mentioned_files", () => atMentionedFilesPromise),
        maybe("mcp_resources", () =>
          env.CLAUDE_CODE_EVAL_CONFINED
            ? Promise.resolve([])
            : getMcpResourceAttachments(
                input,
                timedContext.options.mcpClients,
                timedContext.options.mcpResources,
                messages ?? timedContext.messages,
                timedContext.inheritedMcpSkillMessages,
                timedContext.abortController.signal,
                toolUseContext.abortController.signal,
              ),
        ),
        maybe("agent_mentions", () =>
          Promise.resolve(processAgentMentions(input, toolUseContext.options.agentDefinitions.activeAgents)),
        ),
        maybe("skill_mentions", () =>
          Promise.resolve(
            options?.isHumanTypedPrompt &&
              isMainThread &&
              !isCoordinatorMainThread(toolUseContext) &&
              !getDisableSlashCommands() &&
              toolUseContext.options.tools.some((tool) => toolMatchesName(tool, SKILL)) &&
              isSkillMentionAttachmentEnabled()
              ? buildSkillMentionAttachments(
                  options.preExpansionInput ?? input,
                  withNamedFolderYieldsRestored(toolUseContext.options.commands),
                  {
                    typed: options.preExpansionInput !== undefined,
                    pastedContents: options.pastedContents,
                    permissionContext: getToolPermissionContext(toolUseContext),
                  },
                )
              : [],
          ),
        ),
        maybe("peer_mentions", () =>
          options?.isHumanTypedPrompt && options.preExpansionInput !== undefined
            ? atMentionedFilesPromise.then((mentionedAttachments) =>
                getPeerMentionAttachments(options.preExpansionInput, toolUseContext, mentionedAttachments),
              )
            : Promise.resolve([]),
        ),
      ]
    : mentionedFiles.length > 0
      ? [maybe("at_mentioned_files", () => atMentionedFilesPromise)]
      : [];
  abortController?.mark("prompt_producers");
  let userAttachmentResults = await Promise.all(userInputProducers);
  abortController?.mark("prompt_producers");
  if (options?.inputMentionsOnly) {
    let nestedMemoryAttachments = await maybe("nested_memory", () =>
      getNestedMemoryTriggerAttachments(timedContext),
    );
    abortController?.mark("ambient_wait");
    clearTimeout(timeoutId);
    return [...userAttachmentResults.flat(), ...nestedMemoryAttachments].filter(
      (attachment) => attachment !== undefined && attachment !== null,
    );
  }
  let getTodoOrTaskReminders = (() => {
    let cachedReminders;
    return () =>
      (cachedReminders ??= todoToolsEnabled()
        ? isTaskToolsEnabled()
          ? getTaskReminderAttachments(messages, toolUseContext.options.tools, toolUseContext.storageV5)
          : getTodoReminderAttachments(messages, toolUseContext)
        : Promise.resolve([]));
  })();
  let remoteToolHostsNotice = isRemoteToolForwardingSwitchOn()
    ? isolationRuntimeService().remote?.noticeAttachment
    : undefined;
  let remoteToolHostsCorrection = isRemoteToolForwardingSwitchOn()
    ? isolationRuntimeService().remote?.correctionAttachment
    : undefined;
  let shouldShowToolHostsNotice =
    !isRemoteToolForwardingSwitchOn() &&
    isCloudSessionProcess() &&
    toolUseContext.agentId === undefined &&
    shouldConsiderToolHostsNotice(toolUseContext.toolState, messages ?? []) &&
    isForwardingOffNoticeOn();
  let allThreadProducers = [
    maybe("queued_commands", () =>
      getQueuedCommandAttachments(queuedCommands, modelImageLimits, remainingWakePolls, {
        tools: toolUseContext.options.tools,
        messages: toolUseContext.messages,
      }),
    ),
    maybe("sandbox_instructions", () =>
      Promise.resolve(getSandboxInstructionsAttachments(toolUseContext.options.tools, messages)),
    ),
    ...(shouldPrefetchArtifactOpening()
      ? [
          maybe("artifact_opening_prefetch", () =>
            prefetchArtifactOpening(toolUseContext, messages, input, options?.heldAppend === true),
          ),
        ]
      : []),
    maybe("environment", () => detectEnvironmentDirectoryChange(toolUseContext, messages)),
    maybe("model", () => getRuntimeModelSwitchAnnouncements(toolUseContext, messages)),
    maybe("session_settings", () => getOutputStyleAndLanguageAttachments(toolUseContext, messages)),
    maybe("ultrathink_effort", () => Promise.resolve(getUltrathinkEffortAttachment(input))),
    maybe("deferred_tools_delta", () =>
      Promise.resolve(
        getDeferredToolsDeltaAttachments(
          toolUseContext.options.tools,
          toolUseContext.options.mainLoopModel,
          normalizedMessages,
          {
            callSite: isMainThread ? "attachments_main" : "attachments_subagent",
            querySource,
          },
          toolUseContext.options.mcpClients
            .filter((mcpClient) => mcpClient.type === "pending")
            .map((mcpClient) => mcpClient.name),
          getIsNonInteractiveSession()
            ? getNeedsAuthMcpServerNames(toolUseContext.options.mcpClients, toolUseContext.options.tools)
            : undefined,
          isSurfaceFailedServersEnabled()
            ? collectFailedMcpServers(
                toolUseContext.options.mcpClients,
                redialAllowsServer(toolPoolRefreshes && true),
              )
            : undefined,
          () => {
            let tools = toolUseContext.options.tools;
            let reminderBudgetOnTop = true;
            let keptDeferred = keptDeferredToolNames(normalizedMessages, tools, {
              keepMcp: true,
              surfacedOnWire: (toolUseContext.stickyBetas ?? getStickyBetas()).surfacedOnWire,
            });
            let revokedToolNames = [];
            try {
              revokedToolNames = hasDeclaredToolSet(declaredToolSource, tools, true);
            } catch (error) {
              logRetractionFailure(error);
              let currentToolNames = new Set(tools.map((tool) => tool.name));
              revokedToolNames =
                declaredToolSource?.names.filter((toolName) => !currentToolNames.has(toolName)) ?? [];
            }
            return classifyRevokedTools(
              keptDeferred === undefined && revokedToolNames.length === 0
                ? undefined
                : uniq([...(keptDeferred ?? []), ...revokedToolNames]),
              toolUseContext.options.mcpClients,
              getToolPermissionContext(toolUseContext),
              declaredToolSource,
            );
          },
          declaredToolSource,
          buildDeferredToolsLatchContext(
            options?.conversationLatches ?? stickyBetasForRequest(toolUseContext),
            toolUseContext,
            querySource,
          ),
          toolPoolRefreshes
            ? {
                ...buildToolRevocationClassifier(toolUseContext),
                serversDeclaredInline: new Set(
                  declaredToolSource?.names.flatMap(
                    (toolName) => declaredToolSource.sourceFor(toolName)?.mcpInfo?.serverName ?? [],
                  ),
                ),
              }
            : undefined,
          toolUseContext.options,
        ),
      ),
    ),
    maybe("agent_listing_delta", () => getAgentListingDeltaAttachment(toolUseContext, normalizedMessages)),
    maybe("mcp_instructions_delta", () =>
      Promise.resolve(
        getMcpInstructionsDeltaAttachment(
          toolUseContext.options.mcpClients,
          toolUseContext.options.tools,
          toolUseContext.options.mainLoopModel,
          normalizedMessages,
          declaredToolSource,
          toolPoolRefreshes && isSortedOtterOn(),
        ),
      ),
    ),
    maybe("mcp_dropped_tools_delta", () =>
      Promise.resolve(getMcpDroppedToolsAttachment(toolUseContext, normalizedMessages)),
    ),
    ...(remoteToolHostsNotice
      ? [
          maybe("tool_hosts_notice", () =>
            remoteToolHostsNotice(timedContext, messages ?? [], "attachment_scan"),
          ),
        ]
      : shouldShowToolHostsNotice
        ? [
            maybe("tool_hosts_notice", () =>
              Promise.resolve(
                buildToolHostsNoticeAttachments(
                  timedContext,
                  messages ?? [],
                  isForwardingOffNoticeOn,
                  forwardingOffReasonNow,
                ),
              ),
            ),
          ]
        : []),
    ...(remoteToolHostsCorrection
      ? [
          maybe("tool_hosts_correction", () =>
            remoteToolHostsCorrection(timedContext, {
              turnStart: input !== null || options?.isRegularUserPrompt === true,
            }),
          ),
        ]
      : []),
    maybe("changed_files", () => getChangedFiles(timedContext)),
    maybe("nested_memory", () =>
      getNestedMemoryTriggerAttachments(
        claudeMdExtraState.peek(toolUseContext.session)?.readFor ? toolUseContext : timedContext,
        messages,
      ),
    ),
    maybe("dynamic_skill", () => getDynamicSkillAttachments(timedContext)),
    maybe("skill_listing", () => getSkillListingAttachmentsLazy(timedContext, normalizedMessages)),
    maybe("plan_mode", () => getPlanModeAttachments(input, messages, toolUseContext, options)),
    maybe("plan_mode_exit", () => getPlanModeExitAttachment(messages, toolUseContext)),
    maybe("proactivity", () =>
      proactivityAttachments(messagesSinceCompactBoundary(messages ?? []), toolUseContext),
    ),
    maybe("auto_mode", () => getAutoModeAttachments(messages, toolUseContext)),
    maybe("auto_mode_exit", () => getAutoModeExitAttachment(messages, toolUseContext)),
    maybe("todo_reminders", getTodoOrTaskReminders),
    ...(toolSearchReminderConfig() !== null
      ? [
          maybe("tool_search_usage_reminder", () =>
            getToolSearchUsageReminderAttachment(
              messages,
              toolUseContext,
              async () => (await getTodoOrTaskReminders()).length > 0,
              declaredToolSource,
            ),
          ),
        ]
      : []),
    ...(isAgentSwarmsEnabled()
      ? [
          maybe("teammate_mailbox", async () => getTeammateMailboxAttachments(toolUseContext)),
          maybe("team_context", async () => getTeamContextAttachment(messages ?? [])),
        ]
      : []),
    maybe("agent_pending_messages", async () =>
      getAgentPendingMessageAttachments(
        toolUseContext.agentId,
        toolUseContext.taskRegistry,
        toolUseContext.options.tools,
        toolUseContext.messages,
      ),
    ),
    maybe("critical_system_reminder", () =>
      Promise.resolve(
        getCriticalSystemReminderAttachment(toolUseContext.criticalSystemReminder_EXPERIMENTAL),
      ),
    ),
    ...(shouldWithdrawSpawnedLoopMemory
      ? [
          maybe("spawned_loop_memory_withdrawal", async () =>
            withdrawCoworkMemoryContext(toolUseContext.session.host, normalizedMessages),
          ),
        ]
      : []),
    ...(isMainThread &&
    input === null &&
    !options?.isRegularUserPrompt &&
    !options?.deliveredTurnStart &&
    !isFocusModeFlag() &&
    hostStatusNudge === undefined &&
    isSilentTurnReminderEnabled(toolUseContext.options.mainLoopModel)
      ? [
          maybe("silent_turn_reminder", () =>
            Promise.resolve(
              getSilentTurnReminderAttachment(
                messages ?? [],
                toolUseContext.options.mainLoopModel,
                toolUseContext.session.host.clock.now(),
              ),
            ),
          ),
        ]
      : []),
    ...(isMainThread &&
    input === null &&
    !options?.isRegularUserPrompt &&
    !options?.deliveredTurnStart &&
    !options?.heldAppend &&
    hostStatusNudge !== undefined &&
    !queuedCommands.some((queuedCommand) => queuedCommand.projectsUserTurn === true)
      ? [
          maybe("host_status_nudge", () =>
            Promise.resolve(
              getCriticalReminderAttachment(
                messages ?? [],
                hostStatusNudge,
                toolUseContext.session.host.clock.now(),
                isTurnCompanion,
                toolUseContext.options.tools,
              ),
            ),
          ),
        ]
      : []),
    ...(isMainThread &&
    (options?.isRegularUserPrompt || options?.deliveredTurnStart) &&
    hostPromptReminder !== undefined
      ? [
          maybe("host_prompt_reminder", () =>
            Promise.resolve(getCriticalSystemReminderAttachment(hostPromptReminder)),
          ),
        ]
      : []),
    ...(input === null &&
    !options?.isRegularUserPrompt &&
    !options?.deliveredTurnStart &&
    !options?.heldAppend &&
    isElapsedTimeReminderEnabled(toolUseContext.options.mainLoopModel)
      ? [
          maybe("elapsed_time_reminder", () =>
            Promise.resolve(getElapsedTimeReminderAttachments(toolUseContext)),
          ),
        ]
      : []),
    maybe("total_tokens_reminder", () => {
      let shouldRemindAfterTurn =
        (options?.isRegularUserPrompt ?? false) &&
        getTotalTokensReminderMode(toolUseContext.options.mainLoopModel, undefined) !== "off" &&
        shouldRemindAfterUserTurn();
      return Promise.resolve(
        (input === null && !options?.deliveredTurnStart) || shouldRemindAfterTurn
          ? getTotalTokensReminderAttachment(
              toolUseContext.session,
              messages ?? [],
              toolUseContext.options.mainLoopModel,
              toolUseContext.agentId,
              shouldRemindAfterTurn,
              toolUseContext.options.totalTokensReminderBudget,
              toolUseContext.options.isTotalTokensReminderBudgetOnTopOfStart === true,
            )
          : [],
      );
    }),
    maybe("budget_usd", async () =>
      Promise.resolve(getMaxBudgetUsdAttachment(toolUseContext.options.maxBudgetUsd)),
    ),
  ];
  let mainThreadProducers = isMainThread
    ? [
        ...(isWorkflowsAvailable()
          ? [
              maybe("workflow_keyword_request", () =>
                Promise.resolve(
                  options?.isHumanTypedPrompt &&
                    !options.suppressWorkflowKeyword &&
                    isWorkflowKeywordTriggerEnabled()
                    ? getWorkflowKeywordAttachment(options.preExpansionInput ?? input)
                    : [],
                ),
              ),
              maybe("ultra_effort_enter", () =>
                Promise.resolve(
                  options?.isRegularUserPrompt || options?.deliveredTurnStart
                    ? getUltraEffortAttachments(messages, toolUseContext)
                    : [],
                ),
              ),
              maybe("workflow_size_guideline_change", () =>
                Promise.resolve(
                  options?.isRegularUserPrompt
                    ? latestWorkflowSize(
                        messagesSinceCompactBoundary(messages ?? []),
                        getGlobalConfig().workflowSizeGuideline,
                        isProSubscriber(),
                      )
                    : [],
                ),
              ),
            ]
          : []),
        maybe("ide_selection", async () => getSelectedLinesFromIDE(ideSelection, toolUseContext)),
        maybe("ide_opened_file", async () => getOpenedFileFromIDE(ideSelection, toolUseContext, messages)),
        maybe("queued_ide_selections", async () =>
          (
            await Promise.all(
              queuedCommands
                .filter(isInlineNotificationMode)
                .flatMap(({ ideSelection }) =>
                  ideSelection
                    ? [
                        getSelectedLinesFromIDE(ideSelection, toolUseContext),
                        getOpenedFileFromIDE(ideSelection, toolUseContext, messages),
                      ]
                    : [],
                ),
            )
          ).flat(),
        ),
        maybe("output_style", () => getOutputStyleAttachment(toolUseContext)),
        maybe("diagnostics", async () =>
          getDiagnosticAttachments(toolUseContext.options.tools, toolUseContext.session),
        ),
        maybe("lsp_diagnostics", async () =>
          getLSPDiagnosticAttachments(toolUseContext.options.tools, toolUseContext.session),
        ),
        maybe("unified_tasks", async () =>
          getUnifiedTaskAttachments(toolUseContext.options.tools, toolUseContext.taskRegistry),
        ),
        maybe("async_hook_responses", async () => getAsyncHookResponseAttachments(messages ?? [])),
        ...(options?.afterToolStep &&
        classifyQuerySource(querySource) === "main" &&
        env.CLAUDE_CODE_MEMORY_CONTEXT_NO_WAIT
          ? [
              maybe("late_memory_context", async () =>
                collectCcrMemoryAttachments(toolUseContext.session.host, normalizedMessages),
              ),
            ]
          : []),
        ...(hasWatchdogObservation()
          ? [maybe("low_resource_status", () => Promise.resolve(lowResourceReminders(normalizedMessages)))]
          : []),
        maybe("memory_update", () => Promise.resolve(getMemoryUpdateAttachments(toolUseContext, messages))),
        ...[],
        maybe("withheld_memory", () =>
          Promise.resolve(
            withheldInstructionStateSlot.of(toolUseContext.session).owed.size === 0
              ? []
              : getWithheldMemoryAttachment(
                  toolUseContext.session,
                  takeOwedInstructionFiles(
                    toolUseContext.session,
                    seenWithheldPaths(toolUseContext, messages ?? []),
                  ),
                ),
          ),
        ),
        maybe("token_usage", async () =>
          Promise.resolve(
            getTokenUsageAttachment(
              messages ?? [],
              toolUseContext.options.mainLoopModel,
              toolUseContext.options.autoCompactWindow,
            ),
          ),
        ),
      ]
    : [];
  abortController?.mark("ambient_start");
  let [allThreadResults, mainThreadResults] = await Promise.all([
    Promise.all(allThreadProducers),
    Promise.all(mainThreadProducers),
  ]);
  abortController?.mark("ambient_wait");
  clearTimeout(timeoutId);
  return dedupeWithheldMemory(
    [...userAttachmentResults.flat(), ...allThreadResults.flat(), ...mainThreadResults.flat()].filter(
      (attachment) => attachment !== undefined && attachment !== null,
    ),
  );
}
//@ chunk-e6aww6q8.js:3319176-3319423 layout
/**
 * 去掉 withheld_memory 里已作为 nested_memory 出现或重复的路径，条目为空则丢弃整条附件。
 */
function dedupeWithheldMemory(attachments) {
  let nestedMemoryPaths = new Set(
    attachments.flatMap((attachment) => (attachment.type === "nested_memory" ? [attachment.path] : [])),
  );
  return attachments.flatMap((attachment) => {
    if (attachment.type !== "withheld_memory") return [attachment];
    let filtered = attachment.entries.filter(
      ({ path }) => !nestedMemoryPaths.has(path) && nestedMemoryPaths.add(path),
    );
    return filtered.length === 0
      ? []
      : [
          {
            ...attachment,
            entries: filtered,
          },
        ];
  });
}
//@ chunk-e6aww6q8.js:3319423-3320109 fingerprint (2.1.88 match: maybe, 0.706)
/**
 * maybe(label, fn)：运行一个附件生成器并计时；5% 采样记 tengu_attachment_compute_duration（大小、数量、是否出错）；出错时记日志并返回空数组，不影响其他附件。
 */
async function maybe(label, f) {
  let startTime = Date.now();
  let startTime_2 = performance.now();
  let attachmentTimingStore = getAttachmentTimingStore();
  attachmentTimingStore?.producerBegan();
  let shouldLogTiming = Math.random() < 0.05;
  try {
    let result = await f();
    let duration = Date.now() - startTime;
    noteAttachmentProducer(label, startTime_2, attachmentTimingStore?.markedAt);
    if (shouldLogTiming) {
      let attachmentSizeBytes = result
        .filter((attachment) => attachment !== undefined && attachment !== null)
        .reduce((total, attachment) => total + jsonStringify(attachment).length, 0);
      logEvent("tengu_attachment_compute_duration", {
        label: fromEnum(label),
        duration_ms: duration,
        attachment_size_bytes: attachmentSizeBytes,
        attachment_count: result.length,
      });
    }
    return result;
  } catch (e) {
    let duration = Date.now() - startTime;
    noteAttachmentProducer(label, startTime_2, attachmentTimingStore?.markedAt);
    if (shouldLogTiming)
      logEvent("tengu_attachment_compute_duration", {
        label: fromEnum(label),
        duration_ms: duration,
        error: true,
      });
    if (e instanceof ImageResizeError)
      logForDebugging(`Attachment image resize failed in ${label}: ${e.message}`, {
        level: "error",
      });
    else logError(withTelemetryMessage(toError(e), "attachment generator failed"));
    logAntError(`Attachment error in ${label}`, e);
    return [];
  }
}
//@ chunk-e6aww6q8.js:3320109-3320157 layout (2.1.88 match: INLINE_NOTIFICATION_MODES, 1)
/**
 * 能作为队列命令附件送入的模式集合：prompt、task-notification。
 */
var INLINE_NOTIFICATION_MODES; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-e6aww6q8.js:3320109", () => {
  INLINE_NOTIFICATION_MODES = new Set(["prompt", "task-notification"]);
});
//@ chunk-e6aww6q8.js:3320157-3320260 layout
/**
 * 队列命令自带 toolsUsed 且开关开启时，算出与对话里已用工具的差集 {toolsUsedDelta}。
 */
function getToolsUsedDelta(toolsUsed, messages) {
  let unreadable =
    toolsUsed === undefined || !isGlimmeringFinchGateOn()
      ? undefined
      : unreadableToolsUsed(toolsUsed, messages);
  return unreadable === undefined
    ? undefined
    : {
        toolsUsedDelta: unreadable,
      };
}
//@ chunk-e6aww6q8.js:3320260-3320322 layout
/**
 * 开关关闭时把队列命令 toolsUsed 说明拼进提示词文本；开启时原样返回（改由 toolsUsedDelta 字段携带）。
 */
function appendToolsUsedNote(text, toolsUsed, messages) {
  return toolsUsed === undefined || isGlimmeringFinchGateOn()
    ? text
    : joinWithNewlineIfAny(text, unreadableToolsLine(toolsUsed, messages));
}
//@ chunk-e6aww6q8.js:3320322-3320361 layout
/**
 * 队列命令模式是否在 INLINE_NOTIFICATION_MODES 里。
 */
function isInlineNotificationMode(command) {
  return INLINE_NOTIFICATION_MODES.has(command.mode);
}
//@ chunk-e6aww6q8.js:3320361-3323197 layout
/**
 * 把消息队列里的 prompt/task-notification 命令转成 queued_command 附件（含图片块、粘贴内容、来源、uuid、delivery_id），前面加上 poll_events 附件；记录用户提交的提示词。2.1.88 同名函数的 316 版本。
 */
async function getQueuedCommandAttachments(commands, imageLimits, remainingWakePollEvents = 0, opts) {
  if (!commands) return [];
  let sendMessageToolAbsent = opts?.tools !== undefined && !hasSendMessageTool(opts.tools);
  let messagingLimitedToOwnAgents = opts?.tools !== undefined && isMessagingLimitedToOwnAgents();
  let pollEventsAttachment = buildPollEventsAttachment(
    commands,
    remainingWakePollEvents,
    opts?.messages ?? [],
  );
  let filtered = commands.filter(isInlineNotificationMode);
  for (let command of filtered)
    if (
      command.mode === "prompt" &&
      !command.isMeta &&
      command.shouldQuery !== false &&
      command.textNotTyped !== true &&
      isHumanOrUnset(command.origin)
    )
      notifySetupGuidePasted(
        typeof command.value === "string"
          ? command.value
          : extractTextContent_2(
              command.value,
              `
`,
            ),
        undefined,
        undefined,
        undefined,
      );
  return Promise.all(
    filtered.map(async (command) => {
      let uuid = command.uuid || randomUUID();
      command.attachmentSourceUuid = uuid;
      if (
        command.mode === "prompt" &&
        isHumanOrigin(command.origin) &&
        !command.isMeta &&
        !command.verifiedSlackHumanTurn
      )
        notePersonPrompt(uuid, new Date().toISOString(), command.clientPlatform);
      let imageBlocks = [];
      let imagePasteIds = [];
      let text =
        command.isMeta === true && isAutoContinuationOrigin(command.origin)
          ? undefined
          : command.promptSubmitted?.text;
      let promptValue = text === undefined ? command.value : replacePromptText(command.value, text);
      if (typeof promptValue === "string")
        promptValue = appendToolsUsedNote(promptValue, command.toolsUsed, opts?.messages ?? []);
      try {
        if (typeof promptValue !== "string")
          promptValue = await Promise.all(
            promptValue.map(async (block) =>
              block.type === "image" ? (await checkImageBlockSource(block, imageLimits)).block : block,
            ),
          );
        let pastedImageBlocks = await buildPastedImageBlocks(command.pastedContents, imageLimits);
        imageBlocks = pastedImageBlocks.blocks;
        imagePasteIds = pastedImageBlocks.ids;
      } catch (error) {
        if (error instanceof ImageResizeError)
          logForDebugging(
            `getQueuedCommandAttachments: dropping images for one queued command, keeping its text: ${error.message}`,
            {
              level: "error",
            },
          );
        else {
          logError(withTelemetryMessage(toError(error), "queued command image build failed"));
          logAntError("getQueuedCommandAttachments image build", error);
        }
      }
      let taskDelivery =
        command.taskDelivery && !getTaskRunState().bashTaskSnapshots.get(command.taskDelivery.taskId)?.fetched
          ? command.taskDelivery
          : undefined;
      if (imageBlocks.length > 0) {
        let text_2 =
          typeof promptValue === "string"
            ? promptValue
            : (text ??
              (typeof command.value === "string"
                ? command.value
                : extractTextContent_2(
                    command.value,
                    `
`,
                  )));
        promptValue =
          text !== undefined && text.trim() === ""
            ? [...imageBlocks]
            : [
                {
                  type: "text",
                  text: text_2,
                },
                ...imageBlocks,
              ];
      }
      command.deliveryId ??= randomUUID();
      return {
        type: "queued_command",
        prompt: promptValue,
        source_uuid: uuid,
        delivery_id: command.deliveryId,
        imagePasteIds: imageBlocks.length > 0 ? imagePasteIds : undefined,
        fileAttachments: command.fileAttachments,
        inlinedImagePaths: command.inlinedImagePaths,
        imageFileUuids: keepBridgeFileIds(command.imageFileUuids, command.value, promptValue),
        commandMode: command.mode,
        origin: normalizeTaskNotificationOrigin(command.origin),
        ...(text !== undefined &&
          text !==
            (typeof command.value === "string"
              ? command.value
              : extractTextContent_2(
                  command.value,
                  `
`,
                )) && {
            promptRewritten: true,
          }),
        ...(command.runId !== undefined && {
          runId: command.runId,
        }),
        timestamp: command.timestamp,
        isMeta: command.isMeta,
        ...getToolsUsedDelta(command.toolsUsed, opts?.messages ?? []),
        ...(command.usage && {
          usage: command.usage,
        }),
        ...(taskDelivery && {
          taskDelivery,
        }),
        ...(command.verifiedSlackHumanTurn && {
          verifiedSlackHumanTurn: true,
        }),
        ...(command.projectsUserTurn && {
          projectsUserTurn: true,
        }),
        ...(command.emailSenderTurn !== undefined && {
          emailSenderTurn: command.emailSenderTurn,
        }),
        ...(command.inputSource !== undefined && {
          inputSource: command.inputSource,
        }),
        ...(command.origin?.kind === "peer" &&
          (sendMessageToolAbsent ||
            (messagingLimitedToOwnAgents && command.origin.senderTaskId === undefined)) && {
            sendMessageToolAbsent: true,
          }),
        ...(command.hearthRelayRows && {
          hearthRelayRows: command.hearthRelayRows,
        }),
        ...(command.hearthRelayThreadTs && {
          hearthRelayThreadTs: command.hearthRelayThreadTs,
        }),
        ...(command.hearthRelayMessageIds && {
          hearthRelayMessageIds: command.hearthRelayMessageIds,
        }),
        ...(command.mode === "prompt" &&
          !command.isMeta &&
          isHumanOrigin(command.origin) &&
          !command.verifiedSlackHumanTurn &&
          !isOnlySystemReminders(
            (typeof promptValue === "string"
              ? promptValue
              : extractTextContent_2(
                  promptValue,
                  `
`,
                )
            ).trimStart(),
          ) &&
          isParsedWillowEnabled() && {
            humanTurn: true,
          }),
        ...(isProjectsRelay(command.origin) &&
          isDapperCupcakeOn() && {
            besideToolResults: true,
          }),
        ...forwardedTurnReminder({
          origin: command.origin,
          isMeta: command.isMeta,
          verifiedSlackHumanTurn: command.verifiedSlackHumanTurn,
          commandMode: command.mode,
        }),
      };
    }),
  )
    .then(batchRelayedSlackPrompts)
    .then((attachments) => (pollEventsAttachment ? [pollEventsAttachment, ...attachments] : attachments));
}
//@ chunk-e6aww6q8.js:3323197-3323716 layout
/**
 * 队列中的轮询事件（poll event）合并成一个 poll_events 附件：envelopes、kinds、toolsUsed、媒体、剩余唤醒数、来源等。
 */
function buildPollEventsAttachment(commands, remainingWakeCount, messages) {
  let entries = commands.filter(isPollEventMode);
  if (entries.length === 0) return null;
  let declaredPollEvents = collectDeclaredPollEvents(entries);
  let mapped = entries.map((command) => command.pollEvent?.kind ?? "unknown");
  let toolsUsed = mapped.every(mentionsSessionNoticeKind)
    ? []
    : listUnreadableToolsUsed(getConversationToolsUsed().names(), messages);
  return {
    type: "poll_events",
    envelopes: entries.map(getPollEventEnvelope),
    kinds: mapped,
    ...(toolsUsed.length > 0 && {
      toolsUsed,
    }),
    ...(entries.some((command) => command.pollEvent?.media !== undefined) && {
      media: entries.map((command) => command.pollEvent?.media ?? []),
    }),
    remainingWakeCount,
    timestamp: entries.at(-1)?.timestamp,
    provenance: entries.map((command) => command.pollEvent?.provenance ?? null),
    ...(declaredPollEvents !== undefined && {
      declared: declaredPollEvents,
    }),
    ...{},
    ...(hasCrossSessionString(mapped) &&
      isVelvetyRippleOn() && {
        userRoleGuard: true,
      }),
    ...declaredRoundStamp(entries),
  };
}
//@ chunk-e6aww6q8.js:3323716-3324119 layout
/**
 * 连续的已验证 Slack 人工轮次提示词合并：第一条带 batchedRelayPrompts，其余标记 renderedByBatchHead。
 */
function batchRelayedSlackPrompts(attachments) {
  let isRelayable = (attachment) =>
    attachment.verifiedSlackHumanTurn === true &&
    attachment.isMeta !== true &&
    isHumanOrUnset(attachment.origin) &&
    typeof attachment.prompt === "string" &&
    !attachment.inlinedImagePaths?.length &&
    !attachment.toolsUsedDelta?.length;
  let index = 0;
  while (index < attachments.length) {
    if (!isRelayable(attachments[index])) {
      index++;
      continue;
    }
    let runEnd = index + 1;
    while (runEnd < attachments.length && isRelayable(attachments[runEnd])) runEnd++;
    if (runEnd - index >= 2) {
      let sliced = attachments.slice(index, runEnd);
      sliced[0].batchedRelayPrompts = sliced.map((attachment) => attachment.prompt);
      for (let idx = 1; idx < sliced.length; idx++) sliced[idx].renderedByBatchHead = true;
    }
    index = runEnd;
  }
  return attachments;
}
//@ chunk-e6aww6q8.js:3324119-3324744 layout
/**
 * 子代理待处理消息（来自主线程/同伴）转成 queued_command 附件；同伴来源时经过转发处理，缺 SendMessage 工具时标记 sendMessageToolAbsent。
 */
async function getAgentPendingMessageAttachments(agentId, taskRegistry, tools, messages = []) {
  if (!agentId) return [];
  let pendingMessages = drainPendingMessages(agentId, taskRegistry);
  let keptMessages = [];
  for (let message of pendingMessages) {
    let messageOrigin = agentMessageOrigin(message.origin);
    if (messageOrigin === undefined) {
      keptMessages.push(message);
      continue;
    }
    let received = await receiveAgentMessage(messageOrigin, message.text, agentId);
    if (received.consumed === undefined)
      keptMessages.push(
        received.text === message.text
          ? message
          : {
              ...message,
              text: received.text,
              ...(message.origin?.kind === "peer" && {
                origin: stripPeerMessageBody(message.origin, received.text, message.text),
              }),
            },
      );
  }
  dropIfAnyMessages(keptMessages);
  let sendMessageToolAbsent = !hasSendMessageTool(tools);
  let forwardedDeliveries = mintedDeliveries(keptMessages.map((message) => message.forwarded));
  return keptMessages.flatMap((message, index) => [
    ...(forwardedDeliveries[index] ?? []),
    {
      type: "queued_command",
      prompt: appendToolsUsedNote(message.text, message.toolsUsed, messages),
      source_uuid: message.shownAs ?? randomUUID(),
      origin: message.origin,
      isMeta: message.isMeta,
      ...(sendMessageToolAbsent &&
        message.origin?.kind === "peer" && {
          sendMessageToolAbsent: true,
        }),
      ...forwardedTurnReminder({
        origin: message.origin,
        isMeta: message.isMeta,
      }),
      ...getToolsUsedDelta(message.toolsUsed, messages),
    },
  ]);
}
//@ chunk-e6aww6q8.js:3324744-3325029 layout
/**
 * 把粘贴内容里的图片转成 image 块（按模型限制压缩），返回块与粘贴 id。
 */
async function buildPastedImageBlocks(pastedContents, limits) {
  if (!pastedContents)
    return {
      blocks: [],
      ids: [],
    };
  let filtered = Object.values(pastedContents).filter(isNonEmptyImageAttachment);
  if (filtered.length === 0)
    return {
      blocks: [],
      ids: [],
    };
  return {
    blocks: await Promise.all(
      filtered.map(async (attachment) => {
        let { block } = await maybeResizeAndDownsampleImageBlock({
          data: attachment.content,
          mediaType: attachment.mediaType,
          limits,
        });
        return block;
      }),
    ),
    ids: filtered.map((attachment) => attachment.id),
  };
}
//@ chunk-e6aww6q8.js:3325029-3325400 fingerprint (2.1.88 match: getPlanModeAttachmentTurnCount, 0.9)
/**
 * 从最新往回数自上一条 plan_mode/plan_mode_reentry 附件以来的真实用户轮数；遇到 plan_mode_exit 停止。
 */
function getPlanModeAttachmentTurnCount(messages) {
  let turnsSinceLastAttachment = 0;
  let foundPlanModeAttachment = false;
  for (let i = messages.length - 1; i >= 0; i--) {
    let message = messages[i];
    if (message?.type === "user" && !message.isMeta && !hasToolResultContent(message.message.content))
      turnsSinceLastAttachment++;
    else if (
      message?.type === "attachment" &&
      (message.attachment.type === "plan_mode" || message.attachment.type === "plan_mode_reentry")
    ) {
      foundPlanModeAttachment = true;
      break;
    } else if (message?.type === "attachment" && message.attachment.type === "plan_mode_exit") break;
  }
  return {
    turnCount: turnsSinceLastAttachment,
    foundPlanModeAttachment,
  };
}
//@ chunk-e6aww6q8.js:3325400-3325461 layout
/**
 * 文本非空且不是 "(no content)" 等占位。
 */
function isMeaningfulText(text) {
  let trimmed = text.trim();
  return trimmed !== "" && trimmed !== NO_CONTENT_MESSAGE && trimmed !== NO_RESPONSE_REQUESTED;
}
//@ chunk-e6aww6q8.js:3325461-3325497 layout
/**
 * AskUserQuestion、ExitPlanMode、SendUserFile、Brief 等会被视为"对用户说话"的工具名集合（静默轮判断用）。
 */
var USER_FACING_TOOL_NAMES; // deferred: uses briefToolModule (./conversationRecovery.js) of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-e6aww6q8.js:3325461", () => {
  USER_FACING_TOOL_NAMES = new Set([
    ASKUSERQUESTION,
    BRIEF_TOOL_NAME,
    LEGACY_BRIEF_TOOL_NAME,
    EXITPLANMODE,
    SEND_USER_FILE_TOOL_NAME,
  ]);
});
//@ chunk-e6aww6q8.js:3325497-3326453 file-local
/**
 * 统计静默轮：从最新往回数没有对用户输出（文本/可见思考/用户可见工具）的助手轮数、本段内已发 silent_turn_reminder 次数、静默开始时间。旧版名 getAutoModeAttachmentTurnCount 为错配。
 */
function getSilentTurnStats(messages) {
  let turnsSinceLastReminder = 0;
  let remindersInStretch = 0;
  let silentSince;
  let currentMessageId;
  let currentTurnTimestamp;
  let turnHadVisibleOutput = false;
  let lastTimestamp;
  let finishTurn = () => {
    if (currentMessageId === undefined) return false;
    if (turnHadVisibleOutput) {
      silentSince ??= currentTurnTimestamp;
      return true;
    }
    if (remindersInStretch === 0) turnsSinceLastReminder++;
    currentMessageId = undefined;
    turnHadVisibleOutput = false;
    return false;
  };
  for (let idx = messages.length - 1; idx >= 0; idx--) {
    let message = messages[idx];
    if (message !== undefined && isVirtualConversationMessage(message)) continue;
    lastTimestamp = message?.timestamp;
    if (message?.type === "assistant") {
      let id = message.message.id;
      if (id !== currentMessageId) {
        if (finishTurn())
          return {
            turnsSinceLastReminder,
            remindersInStretch,
            silentSince,
          };
        currentMessageId = id;
        currentTurnTimestamp = message.timestamp;
      }
      let content = message.message.content;
      if (
        Array.isArray(content) &&
        content.some(
          (block) =>
            (block.type === "text" && isMeaningfulText(block.text)) ||
            (block.type === "thinking" && hasNarrationThinking(block)) ||
            (block.type === "tool_use" && USER_FACING_TOOL_NAMES.has(block.name)),
        )
      )
        turnHadVisibleOutput = true;
      continue;
    }
    if (finishTurn())
      return {
        turnsSinceLastReminder,
        remindersInStretch,
        silentSince,
      };
    if (message?.type === "attachment" && message.attachment.type === "silent_turn_reminder") {
      remindersInStretch++;
      silentSince ??= message.timestamp;
      continue;
    }
    if (message?.type === "user" && !message.isMeta && !hasToolResultContent(message.message.content)) {
      silentSince ??= message.timestamp;
      break;
    }
    if (
      message?.type === "user" &&
      message.isMeta &&
      !hasToolResultContent(message.message.content) &&
      !isTurnCompanion(message)
    )
      silentSince ??= message.timestamp;
  }
  finishTurn();
  silentSince ??= lastTimestamp;
  return {
    turnsSinceLastReminder,
    remindersInStretch,
    silentSince,
  };
}
//@ chunk-e6aww6q8.js:3326453-3326819 layout
/**
 * 静默轮达到阈值（轮数或秒数，按模型配置）时产出 silent_turn_reminder 附件。
 */
function getSilentTurnReminderAttachment(messages, mainLoopModel, nowMs) {
  let { turnsSinceLastReminder, remindersInStretch, silentSince } = getSilentTurnStats(messages);
  let silentMs = silentSince === undefined ? NaN : nowMs - Date.parse(silentSince);
  let silentSeconds = Number.isFinite(silentMs) ? Math.floor(silentMs / 1000) : undefined;
  let silentTurnReminderSeconds = getSilentTurnReminderSeconds(mainLoopModel);
  if (
    !(silentTurnReminderSeconds === undefined
      ? remindersInStretch < SILENT_TURN_REMINDER_MIN_GAP &&
        turnsSinceLastReminder >= cachedSilentTurnReminderTurns()
      : turnsSinceLastReminder >= 1 &&
        silentSeconds !== undefined &&
        silentSeconds >= silentTurnReminderSeconds)
  )
    return [];
  logFeatureOk("silent_turn_reminder", {
    turns: turnsSinceLastReminder,
    ...(silentSeconds !== undefined && {
      silent_seconds: silentSeconds,
    }),
  });
  return [
    {
      type: "silent_turn_reminder",
      text: getSilentTurnReminderText(),
    },
  ];
}
//@ chunk-e6aww6q8.js:3326819-3327007 fingerprint (2.1.88 match: countPlanModeAttachmentsSinceLastExit, 1)
/**
 * 最近一次 plan_mode_exit 之后的 plan_mode 附件数（决定完整/精简提醒）。
 */
function countPlanModeAttachmentsSinceLastExit(messages) {
  let count = 0;
  for (let i = messages.length - 1; i >= 0; i--) {
    let message = messages[i];
    if (message?.type === "attachment") {
      if (message.attachment.type === "plan_mode_exit") break;
      if (message.attachment.type === "plan_mode") count++;
    }
  }
  return count;
}
//@ chunk-e6aww6q8.js:3327007-3327339 layout (2.1.88 match: countPlanModeAttachmentsSinceLastExit, 0.837)
/**
 * 最近一条 plan_mode 附件的 planFilePath/planGoesToExitTool；先遇到 plan_mode_exit 返回 null。
 */
function getLastPlanModeAttachmentInfo(messages) {
  for (let i = messages.length - 1; i >= 0; i--) {
    let message = messages[i];
    if (message?.type !== "attachment") continue;
    if (message.attachment.type === "plan_mode_exit") return null;
    if (message.attachment.type === "plan_mode")
      return {
        planFilePath: message.attachment.planFilePath,
        planGoesToExitTool:
          message.attachment.planFilePath === undefined ? message.attachment.planGoesToExitTool : undefined,
      };
  }
  return null;
}
//@ chunk-e6aww6q8.js:3327339-3327384 layout
/**
 * 工具列表里有 ExitPlanMode。
 */
function hasExitPlanModeTool(tools) {
  return tools.some((tool) => toolMatchesName(tool, EXITPLANMODE));
}
//@ chunk-e6aww6q8.js:3327384-3327508 layout
/**
 * 构造 plan_mode 附件 {reminderType, isSubAgent, planExists:false, planGoesToExitTool?}。
 */
function buildPlanModeAttachment(reminderType, agentId, tools) {
  return {
    type: "plan_mode",
    reminderType,
    isSubAgent: !!agentId,
    planExists: false,
    ...(hasExitPlanModeTool(tools) && {
      planGoesToExitTool: true,
    }),
  };
}
//@ chunk-e6aww6q8.js:3327508-3328319 fingerprint (2.1.88 match: getPlanModeAttachments, 0.856)
/**
 * 计划模式（permission mode=plan）时产出 plan_mode 附件：首轮或每 5 轮一次，每 5 次一次完整版，其余精简；计划文件状态变化时立即重发；曾退出后重新进入时给 plan_mode_reentry。
 */
async function getPlanModeAttachments(planSlugSeed, messages, toolUseContext, options) {
  if (getToolPermissionContext(toolUseContext).mode !== "plan") return [];
  let lastPlanModeAttachmentInfo = getLastPlanModeAttachmentInfo(messages ?? []);
  let needsRefresh =
    lastPlanModeAttachmentInfo !== null &&
    ((lastPlanModeAttachmentInfo.planFilePath === undefined) !== isDiskless() ||
      (isDiskless() &&
        (lastPlanModeAttachmentInfo.planGoesToExitTool === true) !==
          hasExitPlanModeTool(toolUseContext.options.tools)));
  if (messages && messages.length > 0 && !needsRefresh) {
    let { turnCount, foundPlanModeAttachment } = getPlanModeAttachmentTurnCount(messages);
    if (foundPlanModeAttachment && turnCount < PLAN_MODE_ATTACHMENT_CONFIG.TURNS_BETWEEN_ATTACHMENTS)
      return [];
  }
  let useFullReminder =
    (countPlanModeAttachmentsSinceLastExit(messages ?? []) + 1) %
      PLAN_MODE_ATTACHMENT_CONFIG.FULL_REMINDER_EVERY_N_ATTACHMENTS ===
    1;
  if (isDiskless())
    return [
      buildPlanModeAttachment(
        useFullReminder || needsRefresh ? "full" : "sparse",
        toolUseContext.agentId,
        toolUseContext.options.tools,
      ),
    ];
  if (isStorageV5Enabled() && toolUseContext.storageV5 !== undefined) await settlePlanFileCachePrime();
  getPlanSlug(getSessionId(), options?.planSlugSeed ?? planSlugSeed ?? undefined);
  let planFilePath = getPlanFilePath(toolUseContext.agentId);
  let existingPlan = getPlan(toolUseContext.agentId);
  let attachments = [];
  if (hasExitedPlanModeInSession() && existingPlan !== null) {
    attachments.push({
      type: "plan_mode_reentry",
      planFilePath,
    });
    setHasExitedPlanMode(false);
  }
  let reminderType = needsRefresh || useFullReminder ? "full" : "sparse";
  attachments.push({
    type: "plan_mode",
    reminderType,
    isSubAgent: !!toolUseContext.agentId,
    planFilePath,
    planExists: existingPlan !== null,
    customInstructions: toolUseContext.options.planModeInstructions,
  });
  return attachments;
}
//@ chunk-e6aww6q8.js:3328319-3328611 fingerprint (2.1.88 match: getPlanModeExitAttachment, 0.8)
/**
 * 刚离开计划模式时产出一次 plan_mode_exit（带计划文件路径与是否存在）。
 */
async function getPlanModeExitAttachment(messages, toolUseContext) {
  if (getToolPermissionContext(toolUseContext).mode === "plan") {
    setNeedsPlanModeExitAttachment(false);
    return [];
  }
  let { foundPlanModeAttachment } = getPlanModeAttachmentTurnCount(messages ?? []);
  if (!needsPlanModeExitAttachment() && !foundPlanModeAttachment) return [];
  setNeedsPlanModeExitAttachment(false);
  if (isDiskless())
    return [
      {
        type: "plan_mode_exit",
        planExists: false,
      },
    ];
  let planFilePath = getPlanFilePath(toolUseContext.agentId);
  let planExists = getPlan(toolUseContext.agentId) !== null;
  return [
    {
      type: "plan_mode_exit",
      planFilePath,
      planExists,
    },
  ];
}
//@ chunk-e6aww6q8.js:3328611-3328823 fingerprint (2.1.88 match: countAutoModeAttachmentsSinceLastExit, 1)
/**
 * 返回最近一条 auto_mode 附件（遇到 auto_mode_exit 返回 null）。旧版名 countAutoModeAttachmentsSinceLastExit 不准确。
 */
function getLastAutoModeAttachment(messages) {
  for (let i = messages.length - 1; i >= 0; i--) {
    let message = messages[i];
    if (message?.type !== "attachment") continue;
    if (message.attachment.type === "auto_mode") return message.attachment;
    if (message.attachment.type === "auto_mode_exit") return null;
  }
  return null;
}
//@ chunk-e6aww6q8.js:3328823-3329537 callgraph-fingerprint (2.1.88 match: getAutoModeAttachments, 0.186)
/**
 * auto/bypassPermissions 模式下产出 auto_mode 附件（同意流程、bashFirst、steerOnly、finishExposedWork 等字段），已发过且状态未变则不重复。
 */
async function getAutoModeAttachments(messages, toolUseContext) {
  let toolPermissionContext = getToolPermissionContext(toolUseContext);
  let isBypassMode = toolPermissionContext.mode === "bypassPermissions";
  if (toolPermissionContext.mode !== "auto" && !isBypassMode) return [];
  let steerOnly = isBypassMode || leanPromptFor(getPromptModel(toolUseContext.options.mainLoopModel));
  let tools = toolUseContext.options.tools;
  let bashFirst =
    tools.some((tool) => toolMatchesName(tool, BASH_TOOL_NAME)) &&
    tools.some(
      (tool) => toolMatchesName(tool, FILE_EDIT_TOOL_NAME) || toolMatchesName(tool, FILE_WRITE_TOOL_NAME),
    ) &&
    true &&
    true &&
    isThriftySonicEnabled();
  let canFinishExposedWork =
    !isBypassMode &&
    toolUseContext.agentId === undefined &&
    !isTeammate() &&
    (!isProactivityActive() || toolUseContext.getProactivityLevel() === "default");
  if (steerOnly && !bashFirst && !canFinishExposedWork) return [];
  let lastAutoModeAttachment = getLastAutoModeAttachment(messages ?? []);
  let finishExposedWork =
    lastAutoModeAttachment?.steerOnly === true &&
    lastAutoModeAttachment.bashFirst === false &&
    steerOnly &&
    bashFirst &&
    !isBypassMode;
  if (lastAutoModeAttachment && !(lastAutoModeAttachment.steerOnly && !steerOnly) && !finishExposedWork)
    return [];
  let reminderType = finishExposedWork
    ? lastAutoModeAttachment?.finishExposedWork === true
    : canFinishExposedWork && getFeatureValue_SESSION_PINNED("tengu_vivid_crown", false);
  if (steerOnly && !bashFirst && !reminderType) return [];
  return [
    {
      type: "auto_mode",
      autoModeConsentFlow: !isBypassMode && isAutoModeConsentFlowEnabled(toolUseContext.agentId),
      finishExposedWork: reminderType,
      bashFirst,
      ...(bashFirst && {
        bashFirstSteer: lastAutoModeAttachment?.bashFirst
          ? (lastAutoModeAttachment.bashFirstSteer ?? "strict")
          : bashFirstSteerVariant(),
      }),
      steerOnly,
      bypass: isBypassMode,
      ...false,
    },
  ];
}
//@ chunk-e6aww6q8.js:3329537-3329793 fingerprint (2.1.88 match: getAutoModeExitAttachment, 0.507)
/**
 * 离开 auto 模式时产出一次 auto_mode_exit（主线程）。
 */
async function getAutoModeExitAttachment(messages, toolUseContext) {
  if (toolUseContext.agentId) return [];
  if (!needsAutoModeExitAttachment()) return [];
  setNeedsAutoModeExitAttachment(false);
  if (getToolPermissionContext(toolUseContext).mode === "auto" || isAutoModeActive()) return [];
  let lastAutoModeAttachment = getLastAutoModeAttachment(messages ?? []);
  if (!lastAutoModeAttachment) return [];
  return [
    {
      type: "auto_mode_exit",
      bashFirst: lastAutoModeAttachment.bashFirst,
      steerOnly: lastAutoModeAttachment.steerOnly,
      finishExposedWork: lastAutoModeAttachment.finishExposedWork,
    },
  ];
}
//@ chunk-e6aww6q8.js:3334304-3334413 fingerprint (2.1.88 match: getUltrathinkEffortAttachment, 0.855)
/**
 * 输入含 ultrathink 关键词且开关开启时产出 ultrathink_effort（记 tengu_ultrathink）。
 */
function getUltrathinkEffortAttachment(input) {
  if (!isUltrathinkEnabled() || !input || !hasUltrathinkKeyword(input)) return [];
  logEvent("tengu_ultrathink", {});
  return [
    {
      type: "ultrathink_effort",
    },
  ];
}
//@ chunk-e6aww6q8.js:3334413-3334527 layout
/**
 * 人工输入含工作流关键词时产出 workflow_keyword_request（记 tengu_workflow_keyword）。
 */
function getWorkflowKeywordAttachment(input) {
  if (!input || !hasUltraplanKeyword(input)) return [];
  logEvent("tengu_workflow_keyword", {});
  return [
    {
      type: "workflow_keyword_request",
    },
  ];
}
//@ chunk-e6aww6q8.js:3334527-3335234 layout
/**
 * effort 为 ultra 时：首次给完整 ultra_effort_enter，之后每 N 轮给精简版；退出 ultra 时给 ultra_effort_exit。
 */
function getUltraEffortAttachments(messages, toolUseContext) {
  let isUltracode = isUltracodeActive(
    getUltracodeRequested(toolUseContext),
    toolUseContext.options.mainLoopModel,
  );
  let lastUltraMode = "none";
  let userTurnsSinceMarker = 0;
  if (messages)
    for (let idx = messages.length - 1; idx >= 0; idx--) {
      let message = messages[idx];
      if (message === undefined) continue;
      if (message.type === "attachment") {
        if (message.attachment.type === "ultra_effort_enter") {
          lastUltraMode = "enter";
          break;
        }
        if (message.attachment.type === "ultra_effort_exit") {
          lastUltraMode = "exit";
          break;
        }
      } else if (message.type === "user" && !message.isMeta && !hasToolResultContent(message.message.content))
        userTurnsSinceMarker++;
    }
  if (isUltracode) {
    if (lastUltraMode !== "enter") {
      logEvent("tengu_ultra_effort", {
        is_enter: true,
        is_full: true,
      });
      return [
        {
          type: "ultra_effort_enter",
          reminderType: "full",
        },
      ];
    }
    if (userTurnsSinceMarker >= getUltraEffortReminderInterval()) {
      logEvent("tengu_ultra_effort", {
        is_enter: true,
        is_full: false,
      });
      return [
        {
          type: "ultra_effort_enter",
          reminderType: "sparse",
        },
      ];
    }
    return [];
  }
  if (lastUltraMode === "enter") {
    logEvent("tengu_ultra_effort", {
      is_enter: false,
    });
    return [
      {
        type: "ultra_effort_exit",
      },
    ];
  }
  return [];
}
//@ chunk-e6aww6q8.js:3335234-3335333 layout
/**
 * 无已记录工具声明时，从对话推断上次请求声明的工具集合（Fmn）。
 */
function inferDeclaredToolsFromHistory(betas, tools, context, messages) {
  let nonDeferrableBuiltins = getNonDeferrableBuiltins();
  return computeDeclaredToolSet(
    betas,
    tools,
    (tool) => isDeferredTool_2(tool, nonDeferrableBuiltins),
    context,
    !messages.some((message) => message.type === "assistant"),
  );
}
//@ chunk-e6aww6q8.js:3335333-3335492 layout
/**
 * 由 toolUseContext 构造延迟工具增量所需的上下文 {latches, toolPoolRefreshes, byValue}。
 */
function buildDeferredToolsLatchContext(latches, toolUseContext, querySource) {
  return latches === undefined
    ? undefined
    : {
        latches,
        toolPoolRefreshes: toolUseContext.options.refreshTools !== undefined,
        byValue: buildToolListingRenderer(
          () => getToolPermissionContext(toolUseContext),
          toolUseContext.options.agentDefinitions,
          querySource,
        ),
      };
}
//@ chunk-e6aww6q8.js:3335492-3335577 layout
/**
 * 同上，参数直接给出（runAgent 用）。
 */
function buildDeferredToolsLatchContextFrom(
  latches,
  toolPoolRefreshes,
  getToolPermissionContext,
  agentDefinitions,
  querySource,
) {
  return {
    latches,
    toolPoolRefreshes,
    byValue: buildToolListingRenderer(() => getToolPermissionContext, agentDefinitions, querySource),
  };
}
//@ chunk-e6aww6q8.js:3335577-3335663 layout
/**
 * 把历史里只宣布名字的延迟工具并入会话门闩。
 */
function mergeNameOnlyAnnouncements(latches, recorded) {
  for (let nameOnlyAnnouncement of recorded.nameOnlyAnnouncements)
    latches.nameOnlyAnnouncements.add(nameOnlyAnnouncement);
}
//@ chunk-e6aww6q8.js:3335663-3335862 layout
/**
 * 生成工具描述渲染参数（权限上下文、代理列表、listed/deferred 放置）与 querySource。
 */
function buildToolListingRenderer(getToolPermissionContext, agentDefinitions, querySource) {
  return {
    render: {
      getToolPermissionContext: async () => getToolPermissionContext(),
      agents: agentDefinitions.activeAgents,
      allowedAgentTypes: agentDefinitions.allowedAgentTypes,
      enginePlacementOf: (tool) => (isDeferredToolByEngine(tool) ? "deferred" : "listed"),
    },
    querySource,
  };
}
//@ chunk-e6aww6q8.js:3335862-3336096 layout
/**
 * 取上次请求声明的工具（名字/服务器/条目），没有记录时推断。
 */
function getDeclaredToolSource(latches, messages, options, tools, permissionContext) {
  try {
    return (
      resolveDeclaredToolSet(
        latches,
        () => {
          let snapshot = snapshotIfEnabled(messages, options);
          return (
            snapshot && {
              names: snapshot.toolDescriptions.keys(),
              servers: snapshot.toolServers,
              entries: snapshot.toolEntries,
            }
          );
        },
        tools,
        {
          latch: false,
          permissionContext,
        },
      ) ?? inferDeclaredToolsFromHistory(latches, tools, options.mainLoopModel, messages)
    );
  } catch (error) {
    logError(error);
    return;
  }
}
//@ chunk-e6aww6q8.js:3336096-3336970 layout
/**
 * 工具搜索可用时产出 deferred_tools_delta：新出现/撤回的延迟工具名（getDeferredToolsDelta）；按值声明的工具改为 computeByValueToolsDelta 的结果；有工具被拒时可加 deniedLead（tengu_composed_treehouse）。
 */
async function getDeferredToolsDeltaAttachments(
  tools,
  model,
  messages,
  scanContext,
  pendingMcpServers,
  needsAuthMcpServers,
  failedMcpServers,
  getKeptDeferredNames,
  heldInlineTools,
  latchContext,
  departures,
  requestOptions = {},
) {
  let announceDeferred = false;
  if (latchContext !== undefined)
    try {
      announceDeferred = shouldAnnounceDeferredTools(latchContext.latches, model, {
        toolSearchToolFilteredOut: toolSearchToolFilteredOut(model, tools, latchContext.latches),
        toolPoolRefreshes: latchContext.toolPoolRefreshes,
        aheadOfRequest: true,
      });
    } catch (error) {
      logError(toError(error));
    }
  if (!announceDeferred) {
    if (!isToolSearchEnabledOptimistic()) return [];
    if (!modelSupportsToolReference(model)) return [];
    if (isVertexModelWithoutToolSearch(getCanonicalName(model))) return [];
    if (!isToolSearchToolAvailable(tools)) return [];
    if (
      toolSearchDeclaredIn(
        snapshotIfEnabled(messagesSinceCompactBoundary(messages ?? []), requestOptions)?.toolDescriptions,
      ) === false
    )
      return [];
    if (latchContext && toolSearchRejectedOn(latchContext.latches, model)) return [];
  }
  let deferredToolsDelta = getDeferredToolsDelta(
    tools,
    messages ?? [],
    scanContext,
    pendingMcpServers,
    needsAuthMcpServers,
    failedMcpServers,
    getKeptDeferredNames?.(),
    heldInlineTools,
    announceDeferred && latchContext !== undefined
      ? {
          nameOnlyAnnouncements: latchContext.latches.nameOnlyAnnouncements,
        }
      : undefined,
    latchContext?.latches.nameOnlyAnnouncements,
    departures,
  );
  if (
    deferredToolsDelta?.retractedTools?.some((retractedTool) => retractedTool.cause === "denied") &&
    getFeatureValue_CACHED_MAY_BE_STALE("tengu_composed_treehouse", false)
  )
    deferredToolsDelta.deniedLead = true;
  let baseAttachments = deferredToolsDelta
    ? [
        {
          type: "deferred_tools_delta",
          ...deferredToolsDelta,
        },
      ]
    : [];
  if (latchContext === undefined) return baseAttachments;
  try {
    if (!canInlineToolAdditions(latchContext.latches, model)) return baseAttachments;
    let byValueDelta = await computeByValueToolsDelta(
      deferredToolsDelta,
      tools,
      model,
      messages ?? [],
      latchContext,
    );
    return byValueDelta
      ? [
          {
            type: "deferred_tools_delta",
            ...byValueDelta,
          },
        ]
      : [];
  } catch (error) {
    logError(toError(error));
    return baseAttachments;
  }
}
//@ chunk-e6aww6q8.js:3336970-3338419 layout
/**
 * 按值内联声明的工具：比较当前描述与已声明描述，得出需要重新声明、移除的工具。
 */
async function computeByValueToolsDelta(
  deferredToolsDelta,
  getToolPermissionContext,
  model,
  messages,
  latchContext,
) {
  let { definedByValue, withdrawn } = findLatestDeferredToolsDelta(
    messages,
    latchContext.latches.nameOnlyAnnouncements,
  );
  let isKnownDefinition = (name) => definedByValue.has(name) && !withdrawn.has(name);
  let { render, querySource } = latchContext.byValue;
  let hashForTool = (tools) => getToolListingHash(tools, getToolPermissionContext, render);
  let readdedListings = new Map();
  for (let toolName of deferredToolsDelta?.readdedNames ?? []) {
    let defined = definedByValue.get(toolName);
    let found = getToolPermissionContext.find((tool) => toolMatchesName(tool, toolName));
    if (!withdrawn.has(toolName) || defined === undefined || found === undefined) continue;
    let listing = await hashForTool(found);
    readdedListings.set(
      toolName,
      listing === defined.listing
        ? {
            name: toolName,
            listing,
            sameAs: defined.definedIn,
          }
        : "afresh",
    );
  }
  let surfacedNames = new Set([...(deferredToolsDelta?.surfacedNames ?? []), ...readdedListings.keys()]);
  let removedNames = new Set(deferredToolsDelta?.removedNames ?? []);
  let changedTools = [];
  for (let tool of getToolPermissionContext)
    if (
      isKnownDefinition(tool.name) &&
      !surfacedNames.has(tool.name) &&
      !removedNames.has(tool.name) &&
      (await hashForTool(tool)) !== definedByValue.get(tool.name)?.listing
    )
      changedTools.push(tool);
  let filtered = [...removedNames].filter(isKnownDefinition);
  if (deferredToolsDelta === null && changedTools.length === 0) return null;
  let toolListingEntries = await buildToolListingEntries(
    getToolPermissionContext.filter(
      (tool) =>
        (surfacedNames.has(tool.name) && readdedListings.get(tool.name) !== undefined
          ? readdedListings.get(tool.name) === "afresh"
          : surfacedNames.has(tool.name)) || changedTools.includes(tool),
    ),
    getToolPermissionContext,
    model,
    render,
    querySource,
  );
  if (toolListingEntries === undefined) return deferredToolsDelta;
  let baseDelta = deferredToolsDelta ?? {
    addedNames: [],
    addedLines: [],
    removedNames: [],
    wireHiddenNames: [],
    readdedNames: [],
  };
  let filtered_2 = [...readdedListings.values()].filter((entry) => entry !== "afresh");
  let sorted = [...toolListingEntries, ...filtered_2].sort((leftEntry, rightEntry) =>
    leftEntry.name.localeCompare(rightEntry.name),
  );
  let sorted_2 = changedTools.map((tool) => tool.name).sort();
  let stats = {
    definitions: toolListingEntries.length - sorted_2.length,
    replacements: sorted_2.length,
    pointers: filtered_2.length,
    withdrawals: filtered.length,
  };
  if (Object.values(stats).some((count) => count > 0)) logEvent("tengu_inline_tools_announced", stats);
  return {
    ...baseDelta,
    ...(surfacedNames.size > 0 && {
      surfacedNames: [...surfacedNames].sort(),
    }),
    ...(sorted.length > 0 && {
      surfacedDefinitions: sorted,
    }),
    ...(sorted_2.length > 0 && {
      replacedNames: sorted_2,
    }),
    ...(filtered.length > 0 && {
      removedByBlock: filtered.sort(),
    }),
  };
}
//@ chunk-e6aww6q8.js:3338419-3338745 layout
/**
 * 已声明但现在被撤回（权限或配置变化，不含未配置/替换）的工具名。压缩时使用。
 */
function getRevokedDeferredToolNames(declaredToolSource, context) {
  let revokedNames;
  try {
    revokedNames = hasDeclaredToolSet(declaredToolSource, context.options.tools, true);
  } catch (error) {
    logRetractionFailure(error);
    return [];
  }
  if (revokedNames.length === 0) return [];
  let toolPermissionContext = getToolPermissionContext(context);
  return (
    classifyRevokedTools(revokedNames, context.options.mcpClients, toolPermissionContext, declaredToolSource)
      ?.revoked.filter(
        (revokedTool) =>
          revokedTool.cause !== "not_configured" &&
          revokedTool.cause !== "replaced" &&
          revokedTool.cause !== UNCLASSIFIED_2 &&
          !isToolDisallowedThisTurn(toolPermissionContext, {
            name: revokedTool.name,
            mcpInfo: declaredToolSource?.sourceFor(revokedTool.name)?.mcpInfo,
          }),
      )
      .map((revokedTool) => revokedTool.name) ?? []
  );
}
//@ chunk-e6aww6q8.js:3338745-3339051 layout
/**
 * 对一组工具名逐个判断撤回原因，返回 {revoked:[{name,cause}], causeCounts}。
 */
function classifyRevokedTools(toolNames, mcpClients, toolPermissionContext, declaredToolSource) {
  if (toolNames === undefined) return;
  try {
    let revoked = [];
    let causeCounts = {};
    let denyRuleIndex;
    for (let toolName of toolNames) {
      denyRuleIndex ??= getDenyRuleIndex(toolPermissionContext);
      let availability = describeToolAvailability(
        toolName,
        mcpClients,
        toolPermissionContext,
        declaredToolSource?.sourceFor(toolName),
        denyRuleIndex,
      );
      causeCounts[availability.kind] = (causeCounts[availability.kind] ?? 0) + 1;
      if (isPermanentUnavailability(availability))
        revoked.push({
          name: toolName,
          cause: availability.kind,
        });
    }
    return {
      revoked,
      causeCounts,
    };
  } catch (error) {
    logRetractionFailure(error);
    return {
      revoked: toolNames.map((name) => ({
        name,
        cause: UNCLASSIFIED_2,
      })),
      causeCounts: {},
    };
  }
}
//@ chunk-e6aww6q8.js:3339051-3339285 layout
/**
 * 返回 causeKindOf/holdWhileConnecting/connectingServersOf，供延迟工具增量判断 MCP 连接中的工具。
 */
function buildToolRevocationClassifier(toolUseContext) {
  let permissionContext;
  let denyRuleIndex;
  return {
    causeKindOf: (toolName) => {
      try {
        permissionContext ??= getToolPermissionContext(toolUseContext);
        denyRuleIndex ??= getDenyRuleIndex(permissionContext);
        return describeToolAvailability(
          toolName,
          toolUseContext.options.mcpClients,
          permissionContext,
          undefined,
          denyRuleIndex,
        ).kind;
      } catch (error) {
        logRetractionFailure(error);
        return UNCLASSIFIED_2;
      }
    },
    holdWhileConnecting: isSortedOtterOn(),
    connectingServersOf: (toolName) => pendingServersForTool(toolName, toolUseContext.options.mcpClients),
  };
}
//@ chunk-e6aww6q8.js:3339285-3340409 fingerprint (2.1.88 match: getAgentListingDeltaAttachment, 0.709)
/**
 * 有 Agent 工具时，对比历史 agent_listing_delta，产出可用代理类型的增减（addedTypes/removedTypes/addedLines）。
 */
async function getAgentListingDeltaAttachment(toolUseContext, messages) {
  if (!toolUseContext.options.tools.some((t) => toolMatchesName(t, AGENT))) return [];
  let { activeAgents, allowedAgentTypes } = toolUseContext.options.agentDefinitions;
  let mcpServers = new Set();
  for (let tool of toolUseContext.options.tools) {
    let info = getMcpServerNameOfTool(tool);
    if (info) mcpServers.add(info);
  }
  let dispatchableAgents = await getDispatchableAgents(
    filterAgentsByMcpRequirements(activeAgents, [...mcpServers]),
    allowedAgentTypes,
    getToolPermissionContext(toolUseContext),
    toolUseContext,
  );
  let announced = new Set();
  for (let msg of messages ?? []) {
    if (msg.type !== "attachment") continue;
    if (msg.attachment.type !== "agent_listing_delta") continue;
    if (Array.isArray(msg.attachment.addedLines))
      for (let t of stringArray_2(msg.attachment.addedTypes)) announced.add(t);
    for (let t of stringArray_2(msg.attachment.removedTypes)) announced.delete(t);
  }
  let currentTypes = new Set(dispatchableAgents.map((dispatchableAgent) => dispatchableAgent.agentType));
  let added = dispatchableAgents.filter((dispatchableAgent) => !announced.has(dispatchableAgent.agentType));
  let removed = [];
  for (let t of announced) if (!currentTypes.has(t)) removed.push(t);
  if (added.length === 0 && removed.length === 0) return [];
  added.sort((leftAgent, rightAgent) => compareStringsGrouped(leftAgent.agentType, rightAgent.agentType));
  removed.sort();
  let isLeanPrompt = leanPromptFor(getPromptModel(toolUseContext.options.mainLoopModel));
  return [
    {
      type: "agent_listing_delta",
      addedTypes: added.map((agent) => agent.agentType),
      addedLines: added.map((agent) => formatAgentLine(agent, isLeanPrompt)),
      builtInTypes: added.filter((agent) => agent.source === "built-in").map((agent) => agent.agentType),
      builtInPluginTypes: added
        .filter((agent) => agent.source === "plugin" && marketplaceSuffix(agent.plugin) === BUILTIN)
        .map((agent) => agent.agentType),
      removedTypes: removed,
      isInitial: announced.size === 0,
      showConcurrencyNote: !shouldSteerCostToHost() && getSubagentSteer() === "default",
    },
  ];
}
//@ chunk-e6aww6q8.js:3340409-3340643 layout
/**
 * 需要认证（needs-auth）且未有认证占位工具的 MCP 服务器名。
 */
function getNeedsAuthMcpServerNames(mcpClients, tools = []) {
  let authStubServers = new Set(
    tools.flatMap((tool) => (tool.mcpInfo?.isAuthStub ? [tool.mcpInfo.serverName] : [])),
  );
  return mcpClients
    .filter(
      (mcpClient) =>
        mcpClient.type === "needs-auth" &&
        !authStubServers.has(mcpClient.name) &&
        !(
          claudeInChromeSession().attachedInstructions &&
          mcpClient.name === CLAUDE_IN_CHROME_MCP_SERVER_NAME &&
          isClaudeAiProxyServer(mcpClient.config)
        ),
    )
    .map((mcpClient) => mcpClient.name);
}
//@ chunk-e6aww6q8.js:3340643-3340968 fingerprint (2.1.88 match: getMcpInstructionsDeltaAttachment, 0.777)
/**
 * MCP 服务器 instructions 的增减 → mcp_instructions_delta；含内置服务器附加说明。
 */
function getMcpInstructionsDeltaAttachment(
  mcpClients,
  tools,
  model,
  messages,
  runtimeModel,
  holdRetractionsWhilePending = false,
) {
  let clientSideInstructions = [...getMcpServerInstructionBlocks(mcpClients)];
  let { attachedInstructions } = claudeInChromeSession();
  if (attachedInstructions)
    clientSideInstructions.push({
      serverName: CLAUDE_IN_CHROME_MCP_SERVER_NAME,
      block: attachedInstructions,
    });
  if (
    isToolSearchEnabledOptimistic() &&
    modelSupportsToolReference(model) &&
    !isVertexModelWithoutToolSearch(getCanonicalName(model)) &&
    isToolSearchToolAvailable(tools) &&
    tools.some(
      (tool) =>
        tool.mcpInfo?.serverName === CLAUDE_IN_CHROME_MCP_SERVER_NAME &&
        isDeferredToolInConversation(tool, runtimeModel, tools),
    )
  )
    clientSideInstructions.push({
      serverName: CLAUDE_IN_CHROME_MCP_SERVER_NAME,
      block: maybeAddBrowserBatchToChromeSelect(CHROME_TOOL_SEARCH_REMINDER),
    });
  let delta = getMcpInstructionsDelta(
    mcpClients,
    messages ?? [],
    clientSideInstructions,
    holdRetractionsWhilePending,
  );
  if (!delta) return [];
  return [
    {
      type: "mcp_instructions_delta",
      ...delta,
    },
  ];
}
//@ chunk-e6aww6q8.js:3340968-3341091 layout
/**
 * MCP 工具被丢弃时产出 mcp_dropped_tools_delta。
 */
function getMcpDroppedToolsAttachment(toolUseContext, messages) {
  let mcpDroppedToolsDelta = buildMcpDroppedToolsDelta(
    toolUseContext.options.mcpClients,
    messages ?? [],
    getToolPermissionContext(toolUseContext),
  );
  if (!mcpDroppedToolsDelta) return [];
  return [
    {
      type: "mcp_dropped_tools_delta",
      ...mcpDroppedToolsDelta,
    },
  ];
}
//@ chunk-e6aww6q8.js:3341091-3341174 fingerprint (2.1.88 match: getCriticalSystemReminderAttachment, 0.764)
/**
 * 有 criticalSystemReminder_EXPERIMENTAL 文本时产出 critical_system_reminder（宿主 promptReminder 也复用它）。
 */
function getCriticalSystemReminderAttachment(toolUseContext) {
  if (!toolUseContext) return [];
  return [
    {
      type: "critical_system_reminder",
      content: toolUseContext,
    },
  ];
}
//@ chunk-e6aww6q8.js:3341174-3341636 layout
/**
 * 非默认输出风格时产出 output_style（风格名与本轮提醒文本；有后台任务运行时用 waitingTurnReminder）。
 */
async function getOutputStyleAttachment(toolUseContext) {
  if ((getSettings_DEPRECATED()?.outputStyle || "default") === "default") return [];
  let outputStyleConfig = await getOutputStyleConfig();
  if (!outputStyleConfig) return [];
  let noStopAfterReply = !hasBackgroundBashStopAfterReply();
  let monitorOrLocalShell = noStopAfterReply && (isTidySlothGateOn() || !getIsNonInteractiveSession());
  let waitingTurn =
    outputStyleConfig.waitingTurnReminder !== undefined &&
    toolUseContext.agentId === undefined &&
    Object.values(toolUseContext.taskRegistry.all()).some(
      (task) =>
        task.status === "running" &&
        task.toolUseId !== undefined &&
        !("agentId" in task && task.agentId !== undefined) &&
        ((noStopAfterReply && isMonitorShellTask(task)) ||
          (monitorOrLocalShell && isLocalShellTask(task) && task.isBackgrounded)),
    );
  return [
    {
      type: "output_style",
      style: outputStyleConfig.name,
      turnReminder: waitingTurn ? outputStyleConfig.waitingTurnReminder : outputStyleConfig.turnReminder,
    },
  ];
}
//@ chunk-e6aww6q8.js:3341636-3342183 fingerprint (2.1.88 match: getSelectedLinesFromIDE, 0.751)
/**
 * IDE 选区：diff 视图选区给 selected_lines_in_diff；普通选区（连接了 IDE MCP、路径未被拒）给 selected_lines_in_ide（行号、内容、显示路径）。
 */
async function getSelectedLinesFromIDE(ideSelection, toolUseContext) {
  if (ideSelection?.source === "diff" && ideSelection.text)
    return [
      {
        type: "selected_lines_in_diff",
        lineCount: ideSelection.lineCount,
        content: ideSelection.text,
        filePath: ideSelection.filePath,
      },
    ];
  let ideName = hasAccessToIDEExtensionDiffFeature_2(toolUseContext.options.mcpClients);
  if (!ideName || ideSelection?.lineStart === undefined || !ideSelection.text || !ideSelection.filePath)
    return [];
  if (
    isAttachmentReadDeniedOrThrown(ideSelection.filePath, getToolPermissionContext(toolUseContext)) ||
    (isInstructionReadRestricted(getToolPermissionContext(toolUseContext)) &&
      (await readableInstructionSpellings(
        ideSelection.filePath,
        {
          context: getToolPermissionContext(toolUseContext),
          isHeldOutside: isRestrictedReadBlocked,
        },
        AbortSignal.timeout(DEFAULT_READ_TIMEOUT_MS),
      )) === undefined)
  )
    return [];
  return [
    {
      type: "selected_lines_in_ide",
      ideName,
      lineStart: ideSelection.lineStart,
      lineEnd: ideSelection.lineStart + ideSelection.lineCount - 1,
      filename: ideSelection.filePath,
      content: ideSelection.text,
      displayPath: relative(getCwd(), ideSelection.filePath),
    },
  ];
}
//@ chunk-e6aww6q8.js:3342183-3342595 fingerprint (2.1.88 match: getDirectoriesToProcess, 0.715)
/**
 * 计算从 cwd 到目标文件之间需要加载 CLAUDE.md 的目录：嵌套目录、cwd 及其祖先、worktree 信息、检出目标路径。
 */
function getDirectoriesToProcess(targetPath, originalCwd) {
  let targetDir = dirname(resolve_2(targetPath));
  if (!isPathWithinOrEqual(targetDir, originalCwd))
    try {
      let realTargetDir = getFsImplementation().realpathSync(targetDir);
      if (isPathWithinOrEqual(realTargetDir, originalCwd)) targetDir = realTargetDir;
    } catch {}
  let worktreeForPath = findWorktreeForPath(targetDir, originalCwd);
  let checkoutTargetDir = mapCheckoutPathIntoWorktree(targetDir, worktreeForPath);
  let nestedDirs = [];
  for (let dir = checkoutTargetDir; dir !== originalCwd && dir !== parse(dir).root; dir = dirname(dir))
    if (isPathWithinOrEqual(dir, originalCwd)) nestedDirs.push(mapPathIntoWorktree(dir, worktreeForPath));
  nestedDirs.reverse();
  let cwdLevelDirs = [];
  let dir = originalCwd;
  while (dir !== parse(dir).root) {
    cwdLevelDirs.push(dir);
    dir = dirname(dir);
  }
  cwdLevelDirs.reverse();
  let worktreeRoots = getWorktreeRoots(originalCwd);
  return {
    nestedDirs,
    cwdLevelDirs: cwdLevelDirs.filter(
      (cwdLevelDir) => !isInMainRepoOutsideWorktree(cwdLevelDir, worktreeRoots),
    ),
    worktree: worktreeForPath,
    checkoutTargetPath:
      worktreeForPath === null ? targetPath : join(checkoutTargetDir, basename(resolve_2(targetPath))),
  };
}
//@ chunk-e6aww6q8.js:3342595-3342705 layout
/**
 * 附加工作目录不在 cwd 下且其 CLAUDE.md 没有嵌套目录。
 */
function isAdditionalDirWithoutNestedMemory(dir) {
  let originalCwd = getOriginalCwd();
  return (
    getAdditionalClaudeMdDirs().includes(dir) &&
    !isPathWithinOrEqual(dir, originalCwd) &&
    getDirectoriesToProcess(join(dir, "CLAUDE.md"), originalCwd).nestedDirs.length === 0
  );
}
//@ chunk-e6aww6q8.js:3342705-3342782 callgraph-fingerprint (2.1.88 match: isInstructionsMemoryType, 1)
/**
 * 记忆类型是否为 User/Project/Local/Managed。
 */
function isInstructionsMemoryType_2(type) {
  return type === "User" || type === "Project" || type === "Local" || type === "Managed";
}
//@ chunk-e6aww6q8.js:3342782-3344175 fingerprint (2.1.88 match: memoryFilesToAttachments, 0.665)
/**
 * 把记忆文件（CLAUDE.md 等）转成 nested_memory 附件：跳过已读文件、已在上下文里的相同内容；超长时按模型截断（记 context_claude_md_load nested_file_cut）。
 */
async function memoryFilesToAttachments(
  memoryFiles,
  toolUseContext,
  triggerPath,
  announcementState,
  worktree = null,
  isTriggerRead = false,
) {
  let attachments = [];
  let shouldFireHook = hasInstructionsLoadedHook();
  let maxMemoryFileChars = getMaxMemoryFileChars(toolUseContext.options.mainLoopModel);
  for (let memoryFile of memoryFiles) {
    if (toolUseContext.readFileState.has(memoryFile.path)) continue;
    let timestamp = await getReadTimestamp(memoryFile, !isTriggerRead, toolUseContext.storageV5);
    if (toolUseContext.readFileState.has(memoryFile.path)) continue;
    let trimmed = memoryFile.content.trim();
    let flattened = uniq([memoryFile.path, mapCheckoutPathIntoWorktree(memoryFile.path, worktree)]).flatMap(
      (path) => announcementState?.announced?.get(path) ?? [],
    );
    let any = flattened.some((announced) => announced.content === trimmed);
    let isTruncatedCopyOfPrior = !any && flattened.some((announced) => isTruncatedCopyOf(announced, trimmed));
    let alreadyAnnounced = any || isTruncatedCopyOfPrior;
    let isTruncated =
      isTruncatedCopyOfPrior ||
      (!any && memoryFile.type !== "Managed" && trimmed.length > maxMemoryFileChars);
    let content = isTruncated
      ? truncateInstructionsAtLine(trimmed, memoryFile.path, maxMemoryFileChars)
      : trimmed;
    let nestedAnnounced = announcementState?.nested.get(memoryFile.path);
    let isNestedAnnounced = nestedAnnounced === content || nestedAnnounced === trimmed;
    if (!alreadyAnnounced && !isNestedAnnounced) {
      if (isTruncated) logFeatureSad("context_claude_md_load", "nested_file_cut");
      attachments.push({
        type: "nested_memory",
        path: memoryFile.path,
        content: isTruncated
          ? {
              ...memoryFile,
              content,
              rawContent: undefined,
            }
          : memoryFile,
        displayPath: isTriggerRead ? memoryFile.path : relative(getCwd(), memoryFile.path),
      });
    }
    if (isTriggerRead) announcementState?.nested.set(memoryFile.path, content);
    let readFileState = isTriggerRead ? undefined : toolUseContext.readFileState;
    readFileState?.set(memoryFile.path, {
      content: memoryFile.contentDiffersFromDisk
        ? (memoryFile.rawContent ?? memoryFile.content)
        : stripBomAndCarriageReturn(memoryFile.content),
      timestamp,
      offset: undefined,
      limit: undefined,
      isPartialView: isTruncated || memoryFile.contentDiffersFromDisk,
      seededFromContext: true,
      keepContent: true,
    });
    if (isTruncated && getFeatureValue_CACHED_MAY_BE_STALE("tengu_quizzical_mango", true))
      readFileState?.markStartOnly(memoryFile.path);
    if (alreadyAnnounced) continue;
    if (isNestedAnnounced) continue;
    if (isInstructionsMemoryType_2(memoryFile.type))
      notifySetupGuideLoaded(
        memoryFile.content,
        "claudemd",
        toolUseContext.credentials,
        toolUseContext.storageV5,
        toolUseContext.appendSystemMessage,
      );
    if (shouldFireHook && isInstructionsMemoryType_2(memoryFile.type)) {
      let loadReason = memoryFile.globs
        ? "path_glob_match"
        : memoryFile.parent
          ? "include"
          : "nested_traversal";
      executeInstructionsLoadedHooks(toolUseContext.session, memoryFile.path, memoryFile.type, loadReason, {
        globs: memoryFile.globs,
        triggerFilePath: triggerPath,
        parentFilePath: memoryFile.parent,
        agentInfo: toolUseContext,
        storageV5: toolUseContext.storageV5,
        credentials: toolUseContext.credentials,
      });
    }
  }
  return attachments;
}
//@ chunk-e6aww6q8.js:3344175-3344488 layout
/**
 * 汇总对话里已宣布/嵌套/withheld 的记忆文件，用于去重。
 */
async function getMemoryAnnouncementState(toolUseContext, messages) {
  try {
    let normalizedMessages = messagesSinceCompactBoundary(messages);
    let announced = latestInstructionFiles(normalizedMessages);
    if (announced && announced.size > 0) {
      let lexed = await lexMarkdownWith(
        toolUseContext.session,
        isStorageV5Enabled() ? toolUseContext.storageV5 : undefined,
        isStorageV5Enabled() ? toolUseContext.credentials : undefined,
      );
      let managedPaths = new Set(
        lexed &&
          filterManagedInstructions(lexed, toolUseContext.options).map(
            (instructionFile) => instructionFile.path,
          ),
      );
      for (let key of [...announced.keys()]) if (!managedPaths.has(key)) announced.delete(key);
    }
    return {
      announced,
      nested: collectNestedMemoryContents(normalizedMessages),
      withheld: seenWithheldPaths(toolUseContext, messages),
    };
  } catch (error) {
    logError(error);
    return;
  }
}
//@ chunk-e6aww6q8.js:3344488-3344799 layout
/**
 * 按 getDirectoriesToProcess 的目录顺序依次产出各级目录的记忆文件（异步生成器）。
 */
async function* iterateMemoryFilesForPath(
  targetPath,
  excludeMatcher,
  directories = getDirectoriesToProcess(targetPath, getOriginalCwd()),
  heldOutsideTracker,
) {
  let processedPaths = new Set();
  let { nestedDirs, cwdLevelDirs, worktree, checkoutTargetPath } = directories;
  yield await getManagedAndUserConditionalRules(checkoutTargetPath, processedPaths, excludeMatcher);
  for (let nestedDir of nestedDirs) {
    let isWithinWorktree = worktree !== null && isPathWithinOrEqual(nestedDir, worktree.worktreeRoot);
    yield await getMemoryFilesForNestedDirectory(
      nestedDir,
      isWithinWorktree ? targetPath : checkoutTargetPath,
      processedPaths,
      {
        held: heldOutsideTracker?.within,
      },
    );
  }
  for (let cwdLevelDir of cwdLevelDirs)
    yield await getConditionalRulesForCwdLevelDirectory(
      cwdLevelDir,
      checkoutTargetPath,
      processedPaths,
      cwdLevelDir === cwdLevelDirs.at(-1)
        ? heldOutsideTracker?.within
        : heldOutsideTracker?.above(cwdLevelDir),
    );
}
//@ chunk-e6aww6q8.js:3344799-3344886 layout
/**
 * 读取受限时返回记录"被拦在外面"的记忆文件的跟踪器。
 */
function buildHeldOutsideTracker(context, onHeldOutside) {
  let permissionContext = mergePersistedDenyRules(context);
  return isInstructionReadRestricted(permissionContext)
    ? rulesInstructionReaders(
        {
          context: permissionContext,
          isHeldOutside: isRestrictedReadBlocked,
        },
        onHeldOutside,
      )
    : undefined;
}
//@ chunk-e6aww6q8.js:3344886-3345142 layout
/**
 * 因权限未显示的记忆文件 → withheld_memory 附件。
 */
function getWithheldMemoryAttachment(context, files) {
  let shownPaths = new Set(
    takeShownInstructionFiles(getWithheldInstructionFiles(context)).shown.map(({ path }) => path),
  );
  takeOwedInstructionFiles(context, shownPaths);
  let filtered = files.filter(({ path }) => !shownPaths.has(path));
  if (filtered.length === 0 || getIsNonInteractiveSession()) return [];
  return [
    {
      type: "withheld_memory",
      entries: filtered.map((file) => ({
        ...file,
        displayPath: relative(getCwd(), file.path),
      })),
      by: withheldInstructionStateSlot.of(context).token,
    },
  ];
}
//@ chunk-e6aww6q8.js:3345142-3346117 layout
/**
 * 某文件路径触发的嵌套记忆（CLAUDE.md）附件；CLAUDE_CODE_DISABLE_CLAUDE_MDS 时为空。
 */
async function getNestedMemoryAttachmentsForFile(
  filePath,
  toolUseContext,
  permissionState,
  announcementState,
  includeTriggerFile = false,
) {
  if (env.CLAUDE_CODE_DISABLE_CLAUDE_MDS) return [];
  let attachments = [];
  try {
    let readFor = claudeMdExtraState.peek(toolUseContext.session)?.readFor;
    if (readFor)
      return getFeatureValue_CACHED_MAY_BE_STALE("tengu_paper_halyard", false)
        ? attachments
        : await memoryFilesToAttachments(
            applyClaudeMdExcludesToInjected(
              await readFor(filePath, toolUseContext.abortController.signal, function () {
                return getToolPermissionContext(toolUseContext);
              }),
            ).filter(function (memoryFile) {
              return includeTriggerFile || memoryFile.path !== filePath;
            }),
            toolUseContext,
            filePath,
            announcementState,
            null,
            true,
          );
    if (!pathInAllowedWorkingPath(filePath, permissionState.toolPermissionContext)) return attachments;
    let directories = getDirectoriesToProcess(filePath, getOriginalCwd());
    let featureValue_CACHED_MAY_BE_STALE = getFeatureValue_CACHED_MAY_BE_STALE("tengu_paper_halyard", false);
    let heldOutsideFiles = new Map();
    for await (let memoryFiles of iterateMemoryFilesForPath(
      filePath,
      toolUseContext.storageV5,
      directories,
      buildHeldOutsideTracker(permissionState.toolPermissionContext, (path, reason) => {
        heldOutsideFiles.set(path, reason);
      }),
    ))
      attachments.push(
        ...(await memoryFilesToAttachments(
          memoryFiles.filter(
            (memoryFile) =>
              !featureValue_CACHED_MAY_BE_STALE ||
              (memoryFile.type !== "Project" && memoryFile.type !== "Local"),
          ),
          toolUseContext,
          filePath,
          announcementState,
          directories.worktree,
        )),
      );
    let withheldFiles = Array.from(heldOutsideFiles).flatMap(([path, why]) =>
      why === undefined
        ? []
        : [
            {
              path,
              why,
            },
          ],
    );
    let { session } = toolUseContext;
    clearOwedInstructionFiles(
      session,
      Array.from(heldOutsideFiles).flatMap(([path, why]) => (why === undefined ? [path] : [])),
    );
    if (toolUseContext.agentId !== undefined) recordWithheldInstructionFiles(session, withheldFiles);
    else {
      logWithheldInstructionFiles(session, withheldFiles);
      let { owed } = withheldInstructionStateSlot.of(session);
      let files = withheldFiles
        .filter(({ path }) => announcementState?.withheld.has(path) !== true && !owed.has(path))
        .slice(0, MAX_TRACKED_INSTRUCTION_PATHS);
      attachments.push(...getWithheldMemoryAttachment(session, files));
      for (let { path } of files) announcementState?.withheld.add(path);
    }
  } catch (error) {
    logError(error);
  }
  return attachments;
}
//@ chunk-e6aww6q8.js:3346117-3346436 fingerprint (2.1.88 match: getOpenedFileFromIDE, 0.784)
/**
 * IDE 打开文件：附带该文件触发的嵌套记忆，再加 opened_file_in_ide。
 */
async function getOpenedFileFromIDE(ideSelection, toolUseContext, messages) {
  if (!ideSelection?.filePath || ideSelection.text) return [];
  let toolPermissionContext = getToolPermissionContext(toolUseContext);
  if (
    isAttachmentReadDeniedOrThrown(ideSelection.filePath, toolPermissionContext) ||
    (isInstructionReadRestricted(toolPermissionContext) &&
      (await readableInstructionSpellings(
        ideSelection.filePath,
        {
          context: toolPermissionContext,
          isHeldOutside: isRestrictedReadBlocked,
        },
        toolUseContext.abortController.signal,
      )) === undefined)
  )
    return [];
  return [
    ...(await getNestedMemoryAttachmentsForFile(
      ideSelection.filePath,
      toolUseContext,
      {
        toolPermissionContext,
      },
      messages && (await getMemoryAnnouncementState(toolUseContext, messages)),
    )),
    {
      type: "opened_file_in_ide",
      filename: ideSelection.filePath,
    },
  ];
}
//@ chunk-e6aww6q8.js:3346436-3347306 layout
/**
 * 文件提及只作引用（CLAUDE_CODE_DISABLE_FILE_MENTIONS 或宿主不读时）：已缓存内容能内联的读出，其余汇成 at_mention_reference。
 */
async function getFileMentionReferences(mentionedFiles, toolUseContext, messages) {
  let pickerMap = memoryPickerMaps.peek(toolUseContext.session);
  let tokenBudget;
  if (getFeatureValue_CACHED_MAY_BE_STALE("tengu_snuggly_goblet", false)) {
    let { mainLoopModel, autoCompactWindow } = toolUseContext.options;
    let modelContextInfo = getModelContextInfo(mainLoopModel);
    let autoCompactThresholdTokens = getAutoCompactThresholdTokens(modelContextInfo, autoCompactWindow);
    if (autoCompactThresholdTokens > SECONDARY_CONTEXT_WINDOW) {
      let heldTokens =
        estimateTokensWithAnchor(messages, modelContextInfo.bytesPerToken) +
        stripInProgressAssistantMessage(messages) +
        (hasUsageAnchor(messages) ? 0 : SECONDARY_CONTEXT_WINDOW);
      let claimedTokens = 0;
      tokenBudget = {
        threshold: autoCompactThresholdTokens,
        held: () => heldTokens,
        claimed: () => claimedTokens,
        claim: (count) => {
          claimedTokens += count;
        },
      };
    }
  }
  let pickerSet = memoryPickerSets.peek(toolUseContext.session);
  let attachments = [];
  let unreadPaths = [];
  let plainPdfPaths = [];
  let isCoworkNonGitRepo = () => isCoworkAny() && getToolsMachine()?.directory?.isGitRepo === false;
  let maxSizeBytes = getDefaultFileReadingLimits().maxSizeBytes;
  for (let mentionedPath of mentionedFiles) {
    if (pickerSet?.delete(mentionedPath)) {
      plainPdfPaths.push(mentionedPath);
      continue;
    }
    let cachedContent = pickerMap?.get(mentionedPath);
    pickerMap?.delete(mentionedPath);
    let contentBytes = Buffer.isBuffer(cachedContent) ? cachedContent.length : 0;
    let fileAttachment =
      cachedContent &&
      contentBytes <= maxSizeBytes &&
      getAttachmentReadBlockReason(mentionedPath, getToolPermissionContext(toolUseContext), "person") ===
        undefined &&
      (await readCachedMentionContent(mentionedPath, cachedContent, toolUseContext, tokenBudget));
    if (fileAttachment) {
      attachments.push(fileAttachment);
      maxSizeBytes -= contentBytes;
    } else if (isAbsolute(mentionedPath) || !isCoworkNonGitRepo()) unreadPaths.push(mentionedPath);
  }
  if (unreadPaths.length + plainPdfPaths.length > 0)
    logFeatureSad("input_file_at_mention", "referenced_not_read");
  if (unreadPaths.length > 0)
    attachments.push({
      type: "at_mention_reference",
      mentions: unreadPaths,
    });
  if (plainPdfPaths.length > 0)
    attachments.push({
      type: "at_mention_reference",
      mentions: plainPdfPaths,
      arePdfsToReadPlainly: true,
    });
  return attachments;
}
//@ chunk-e6aww6q8.js:3347306-3348215 layout
/**
 * 宿主提供的提及文件内容：太大给 at_mention_reference（too_large），否则按读取上限截断后生成文件附件。
 */
async function readCachedMentionContent(filePath, buffer, { credentials }, tokenBudget) {
  let cwdOrNull = getCwdOrNull();
  let displayPath = cwdOrNull === null ? filePath : relative(cwdOrNull, filePath);
  if ("tooLargeBytes" in buffer) {
    logFeatureSad("input_file_at_mention", "too_large");
    return {
      type: "at_mention_reference",
      mentions: [filePath],
      unread: "too_large",
      fileSize: buffer.tooLargeBytes,
      displayPath,
    };
  }
  let { maxTokens } = getDefaultFileReadingLimits();
  let ext = parse(filePath).ext.toLowerCase().slice(1);
  for (let lineLimit of [undefined, MAX_LINES_TO_READ]) {
    let { content, lineCount, totalLines } = readFileInRangeFast(
      buffer.toString("utf8"),
      buffer.length,
      0,
      0,
      lineLimit,
      undefined,
      undefined,
    );
    let numberedBytes =
      tokenBudget === undefined
        ? 0
        : Buffer.byteLength(
            addLineNumbers({
              content,
              startLine: 1,
            }),
          );
    let overTokenLimit = false;
    try {
      await validateContentTokens(content, ext, maxTokens, credentials, false, true);
    } catch (error) {
      if (!(error instanceof MaxFileReadTokenExceededError)) {
        logError(error);
        return;
      }
      if (tokenBudget === undefined || numberedBytes > allowLargeRoomTokens(tokenBudget, 0)) continue;
      overTokenLimit = true;
    }
    tokenBudget?.claim(numberedBytes);
    if (lineLimit === undefined) logFeatureOk("input_file_at_mention");
    else logFeatureSad("input_file_at_mention", "first_lines_only");
    return {
      type: "file",
      filename: filePath,
      content: {
        type: "text",
        file: {
          filePath,
          content,
          numLines: lineCount,
          startLine: 1,
          totalLines,
        },
      },
      ...(lineLimit !== undefined && {
        truncated: true,
      }),
      ...(overTokenLimit && {
        overTokenLimit: true,
      }),
      displayPath,
    };
  }
  return;
}
//@ chunk-e6aww6q8.js:3348215-3348324 layout
/**
 * 运行 processAtMentionedFiles，合并附件与钩子上下文。
 */
async function getAtMentionedFileAttachments(
  mentionedPaths,
  toolUseContext,
  parentAbortController,
  agentIdOverride,
) {
  let result = await processAtMentionedFiles(
    mentionedPaths,
    toolUseContext,
    parentAbortController,
    agentIdOverride,
  );
  return [...result.attached, ...result.hookContexts].filter(Boolean);
}
//@ chunk-e6aww6q8.js:3348324-3352037 fingerprint (2.1.88 match: processAtMentionedFiles, 0.3)
/**
 * 处理 @ 提及的文件/目录：解析 #L 行范围，权限检查（拒绝/网络路径跳过），目录列出、文件生成 file/compact_file_reference/pdf_reference 等，记 tengu_at_mention_* 事件。
 */
async function processAtMentionedFiles(
  mentionedPaths,
  toolUseContext,
  parentAbortController,
  agentIdOverride,
) {
  let permissionContext = getToolPermissionContext(toolUseContext);
  let hookContexts = [];
  let targetAgentId = agentIdOverride ?? toolUseContext.agentId;
  let readThrottle = createReadThrottle();
  return {
    attached: await Promise.all(
      mentionedPaths.map(async (mentionedPath, index) => {
        let releaseThrottle;
        try {
          let { filename, lineStart, lineEnd } = parseAtMentionedFileLines(mentionedPath);
          let isPathLike =
            isAbsolute(filename) || filename.startsWith("~") || /(^|[\\/])\.\.([\\/]|$)/.test(filename);
          let attachmentReadBlockReason = getAttachmentReadBlockReason(filename, permissionContext, "person");
          if (attachmentReadBlockReason === "network") {
            logFeatureBad("input_file_at_mention", "denied");
            return null;
          }
          let absoluteFilename = expandPath(filename);
          if (attachmentReadBlockReason === "denied") {
            if (isPathLike) logFeatureBad("input_file_at_mention", "denied");
            return null;
          }
          let instructionRestricted = isInstructionReadRestricted(permissionContext);
          releaseThrottle = instructionRestricted ? await readThrottle() : undefined;
          let filePathSpellings = instructionRestricted
            ? await pathSpellingsForRead(absoluteFilename, toolUseContext.abortController.signal)
            : [absoluteFilename];
          if (
            instructionRestricted &&
            filePathSpellings !== undefined &&
            isInstructionPathRefused(filePathSpellings, {
              context: permissionContext,
              isHeldOutside: isRestrictedReadBlocked,
            })
          ) {
            logFeatureBad("input_file_at_mention", "denied_at_landing");
            return null;
          }
          let readSpellings = filePathSpellings;
          let aborted = readSpellings === undefined && toolUseContext.abortController.signal.aborted;
          if (readSpellings === undefined && !aborted) {
            logFeatureBad("input_file_at_mention", "landing_unsettled");
            return {
              type: "at_mention_reference",
              mentions: [filename],
              unread: "unexamined",
            };
          }
          let sizeProbe = "none";
          try {
            let stats = aborted ? undefined : await stat(absoluteFilename);
            sizeProbe = instructionRestricted && stats?.isFile() ? "through-open" : "none";
            if (stats?.isDirectory() && readSpellings !== undefined)
              try {
                if (instructionRestricted && isFileReadDenied(readSpellings, permissionContext)) {
                  logFeatureBad("input_dir_at_mention", "denied");
                  return null;
                }
                let entries = instructionRestricted
                  ? await readDirIfSpellingsStable(absoluteFilename, readSpellings, (dir) =>
                      readdir(dir, {
                        withFileTypes: true,
                      }),
                    )
                  : await readdir(absoluteFilename, {
                      withFileTypes: true,
                    });
                if (entries === undefined) {
                  logFeatureBad("input_dir_at_mention", "listing_unsettled");
                  return {
                    type: "at_mention_reference",
                    mentions: [filename],
                    unread: "unexamined",
                  };
                }
                let content = (
                  await filterListableEntries(
                    entries,
                    {
                      spellings: readSpellings,
                      context: permissionContext,
                      isDenied: isAttachmentReadDeniedOrThrown,
                      isHeldOutside: isRestrictedReadBlocked,
                    },
                    toolUseContext.abortController.signal,
                  )
                ).join(`
`);
                logEvent("tengu_at_mention_extracting_directory_success", {});
                logFeatureOk("input_dir_at_mention");
                logAtMention({
                  mentionType: "directory",
                  success: true,
                });
                return {
                  type: "directory",
                  path: absoluteFilename,
                  content,
                  displayPath: relative(getCwd(), absoluteFilename),
                };
              } catch {
                logEvent("tengu_at_mention_extracting_directory_error", {});
                logFeatureBad("input_dir_at_mention", "readdir_failed");
                return null;
              }
          } catch {}
          let offset = lineStart;
          let limit = lineEnd && lineStart ? lineEnd - lineStart + 1 : undefined;
          let normalizePath = (raised) =>
            raised.path === absoluteFilename ? absoluteFilename : expandPath(raised.path);
          let readStateBackup = new Map();
          let sawAbort = false;
          let sawLiveRead = false;
          let forgotten = false;
          let refusedAtOpen = false;
          let tooLargeFiles = [];
          releaseThrottle?.();
          releaseThrottle = undefined;
          let { readThroughMention } = await import("./plugins/functionHooks/attachedNameOf.lazy.js");
          let stats = await readThroughMention({
            raised: {
              mention: mentionedPath,
              path: absoluteFilename,
              ...(offset !== undefined && {
                offset,
              }),
              ...(limit !== undefined && {
                limit,
              }),
              ...(targetAgentId !== undefined && {
                agentId: targetAgentId,
              }),
            },
            signalOf: () => (parentAbortController ?? toolUseContext.abortController).signal,
            skipping: toolUseContext.hookOrigin,
            isIsolated: toolUseContext.options.settingsHooksOff === true,
            storageV5: toolUseContext.storageV5,
            refusal: (raised) =>
              raised.path !== absoluteFilename &&
              getAttachmentReadBlockReason(raised.path, getToolPermissionContext(toolUseContext), "hook") !==
                undefined
                ? "the path may not be read here"
                : undefined,
            read: (raised, kind) => {
              let filename = normalizePath(raised);
              readStateBackup.set(filename, {
                state: toolUseContext.readFileState.get(filename),
                triggers: count(
                  toolUseContext.nestedMemoryAttachmentTriggers ?? [],
                  (trigger) => trigger === filename,
                ),
              });
              let toolUseContext_2 =
                kind === "hooked" && parentAbortController !== undefined
                  ? {
                      ...toolUseContext,
                      abortController: createChildAbortController(parentAbortController),
                    }
                  : toolUseContext;
              sawAbort ||= toolUseContext_2.abortController.signal.aborted;
              sawLiveRead ||= !toolUseContext_2.abortController.signal.aborted;
              return generateFileAttachment(
                filename,
                toolUseContext_2,
                "tengu_at_mention_extracting_filename_success",
                "tengu_at_mention_extracting_filename_error",
                "at-mention",
                {
                  offset: raised.offset,
                  limit: raised.limit,
                  pdfAbortParent: parentAbortController,
                  onRefusedAtOpen: () => {
                    refusedAtOpen = true;
                  },
                  onTooLarge: (fileSize) => {
                    tooLargeFiles.push({
                      path: filename,
                      fileSize,
                    });
                  },
                  ...(instructionRestricted &&
                    filename === absoluteFilename &&
                    readSpellings !== undefined && {
                      landing: readSpellings,
                      sizeProbe,
                    }),
                },
              );
            },
            forget: (raised) => {
              forgotten = true;
              let path = normalizePath(raised);
              let backup = readStateBackup.get(path);
              if (backup?.state === undefined) toolUseContext.readFileState.delete(path);
              else toolUseContext.readFileState.set(path, backup.state);
              let nestedMemoryAttachmentTriggers = toolUseContext.nestedMemoryAttachmentTriggers;
              let triggers = backup?.triggers ?? 0;
              while (
                nestedMemoryAttachmentTriggers !== undefined &&
                count(nestedMemoryAttachmentTriggers, (trigger) => trigger === path) > triggers
              )
                nestedMemoryAttachmentTriggers.splice(nestedMemoryAttachmentTriggers.lastIndexOf(path), 1);
            },
          });
          let attachment = stats.attachment;
          if (stats.context) hookContexts[index] = stats.context;
          if (attachment) logFeatureOk("input_file_at_mention");
          if (
            !attachment &&
            !forgotten &&
            (refusedAtOpen ||
              (aborted && (isPathLike || lineStart !== undefined) && sawAbort && !sawLiveRead))
          ) {
            if (refusedAtOpen) logFeatureBad("input_file_at_mention", "refused_at_open");
            return {
              type: "at_mention_reference",
              mentions: [filename],
              unread: "unexamined",
            };
          }
          let last = tooLargeFiles.at(-1);
          if (
            !attachment &&
            !forgotten &&
            last !== undefined &&
            parse(last.path).ext !== "" &&
            !hasBinaryExtension(last.path) &&
            !isNotebookPath(last.path)
          ) {
            logFeatureSad("input_file_at_mention", "too_large");
            return {
              type: "at_mention_reference",
              mentions: [last.path],
              unread: "too_large",
              fileSize: last.fileSize,
              displayPath: relative(getCwd(), last.path),
            };
          }
          return attachment;
        } catch {
          logEvent("tengu_at_mention_extracting_filename_error", {});
          logAtMention({
            mentionType: "file",
            success: false,
          });
        } finally {
          releaseThrottle?.();
        }
      }),
    ),
    hookContexts,
  };
}
//@ chunk-e6aww6q8.js:3352037-3352324 fingerprint (2.1.88 match: processAgentMentions, 0.595)
/**
 * @agent-xxx 或 @"xxx (agent)" 提及 → agent_mention 附件（找不到的代理丢弃）。
 */
function processAgentMentions(input, agents) {
  let agentMentions = extractAgentMentions(input);
  if (agentMentions.length === 0) return [];
  logUnreportedMentions("agent", agentMentions.length);
  return agentMentions
    .map((mention, index) => {
      let agentType = mention.replace("agent-", "");
      let agentDef = agents.find((def) => def.agentType === agentType);
      if (!agentDef) {
        logMentionResult(index, "agent", false);
        return null;
      }
      logMentionResult(index, "agent", true);
      return {
        type: "agent_mention",
        agentType: agentDef.agentType,
      };
    })
    .filter((result) => result !== null);
}
//@ chunk-e6aww6q8.js:3352324-3352884 layout
/**
 * @ 同伴提及解析：唯一匹配给 resolved，多个候选给 ask（peer_mention）。
 */
async function getPeerMentionAttachments(text, toolUseContext, attachments) {
  if (isCrossSessionMessagingEnabled()) {
    let attachmentPaths = new Set(
      attachments.flatMap((attachment) => [
        ...("displayPath" in attachment ? [attachment.displayPath] : []),
        ...("filename" in attachment ? [attachment.filename] : []),
        ...(attachment.type === "directory" ? [attachment.path] : []),
      ]),
    );
    let mentions = parsePeerMentions(text).filter(
      (mention) => mention.ref !== undefined || !attachmentPaths.has(mention.name),
    );
    if (mentions.length === 0) return [];
    let peers = await resolveTeamName(toolUseContext.session, toolUseContext.getAppState(), {
      storageV5: toolUseContext.storageV5,
    });
    return resolvePeerMentions(mentions, peers).map((resolved) =>
      resolved.kind === "resolved"
        ? {
            type: "peer_mention",
            mention: resolved.mention,
            status: "resolved",
            candidates: [resolved.candidate],
            total: 1,
          }
        : {
            type: "peer_mention",
            mention: resolved.mention,
            status: "ask",
            candidates: resolved.candidates,
            total: resolved.total,
          },
    );
  }
  return [];
}
//@ chunk-e6aww6q8.js:3352884-3355459 layout
/**
 * @server:uri 提及的 MCP 资源读取成 mcp_resource 附件（检查连接、权限与资源存在）。
 */
async function getMcpResourceAttachments(
  input,
  mcpClients,
  mcpResources,
  context,
  extraFiles,
  signal,
  signal_2,
) {
  let mcpResourceMentions = extractMcpResourceMentions(input);
  if (mcpResourceMentions.length === 0) return [];
  let clients = mcpClients || [];
  logUnreportedMentions("mcp_resource", mcpResourceMentions.length);
  return (
    await Promise.all(
      mcpResourceMentions.map(async (mcpResourceMention, index) => {
        try {
          let [serverName, ...uriParts] = mcpResourceMention.split(":");
          let uri = uriParts.join(":");
          if (!serverName || !uri) {
            logMentionResult(index, "mcp_resource", false);
            return null;
          }
          let found = clients.find((mcpClient) => mcpClient.name === serverName);
          if (!found || !isConnectedOrCached(found)) {
            logMentionResult(index, "mcp_resource", false);
            return null;
          }
          if (hasWithheldResources(found, undefined)) {
            logMentionResult(index, "mcp_resource", false);
            return null;
          }
          let found_2 = (mcpResources?.[serverName] || []).find((resource) => resource.uri === uri);
          if (!found_2) {
            logMentionResult(index, "mcp_resource", false);
            return null;
          }
          let refusal = noopSkillFetch(found.name, uri, context, extraFiles);
          if (refusal !== undefined) {
            logMentionResult(index, "mcp_resource", false);
            logForDebugging(`MCP resource ${serverName} ${uri} not read: ${refusal}`, {
              level: "warn",
            });
            return null;
          }
          let ensureConnectedClient = getEnsureConnectedClient();
          if (!ensureConnectedClient) {
            logMentionResult(index, "mcp_resource", false);
            return null;
          }
          try {
            let connection = await ensureConnectedClient(found, {
              signal,
              context: "MCP @-mention resource read",
            });
            if (hasWithheldResources(connection, undefined)) {
              logMentionResult(index, "mcp_resource", false);
              return null;
            }
            let listing = classifySkillResourceUri(
              uri,
              countUniqueFiles(connection.name, context, extraFiles),
            );
            if (listing.case === "unlisted") {
              logMentionResult(index, "mcp_resource", false);
              logForDebugging(
                listing.reason === "uri_too_long"
                  ? `MCP resource ${serverName} (an address of ${Buffer.byteLength(uri)} bytes) not read: its address is longer than 2048 bytes, and ${plural(listing.skills.length, "skill")} ${listing.skills.map((skill) => skill.skillName).join(", ")} from this server ${listing.skills.length === 1 ? "is" : "are"} loaded`
                  : listing.reason === "unparseable_uri"
                    ? `MCP resource ${serverName} ${uri} not read: its address is not a valid URL, and ${plural(listing.skills.length, "skill")} ${listing.skills.map((skill) => skill.skillName).join(", ")} from this server ${listing.skills.length === 1 ? "is" : "are"} loaded`
                    : listing.reason === "other_spelling"
                      ? `MCP resource ${serverName} ${uri} not read: its address begins with another spelling of the address of loaded ${plural(listing.skills.length, "skill")} ${listing.skills.map((skill) => skill.skillName).join(", ")}`
                      : `MCP resource ${serverName} ${uri} not read: it is in the directory of loaded ${plural(listing.skills.length, "skill")} ${listing.skills.map((skill) => skill.skillName).join(", ")}, but ${listing.skills.length === 1 ? "that skill does not list it" : "none of them lists it"}, or MCP skills are turned off`,
                {
                  level: "warn",
                },
              );
              return null;
            }
            recordToolUsed(READMCPRESOURCETOOL);
            let mcpResource = await readMcpResource(connection, uri, {
              signal: signal_2,
            });
            let verification =
              listing.case === "listed"
                ? verifySkillFile(mcpResource.contents, uri, listing.rows)
                : undefined;
            if (verification !== undefined && !verification.ok) {
              logMentionResult(index, "mcp_resource", false);
              logForDebugging(
                `MCP resource ${serverName} ${uri} not attached: ${MCP_SKILL_FILE_PROBLEMS[verification.reason]}`,
                {
                  level: "warn",
                },
              );
              return null;
            }
            logMentionResult(index, "mcp_resource", true);
            return {
              type: "mcp_resource",
              server: serverName,
              uri,
              name: found_2.name || uri,
              description: found_2.description,
              content:
                verification !== undefined && verification.ok
                  ? {
                      ...mcpResource,
                      contents: [verification.item],
                    }
                  : mcpResource,
            };
          } catch (error) {
            if (isAbortError(error) || signal_2.aborted) return null;
            logMentionResult(index, "mcp_resource", false);
            logForDebugging(
              `MCP resource read failed for ${serverName} ${uri}: ${error instanceof Error ? error.message : String(error)}`,
              {
                level: "error",
              },
            );
            return null;
          }
        } catch {
          logMentionResult(index, "mcp_resource", false);
          return null;
        }
      }),
    )
  ).filter((attachment) => attachment !== null);
}
//@ chunk-e6aww6q8.js:3355459-3355471 layout
/**
 * 100：每类提及最多单独上报 100 个事件，其余合并为 tengu_at_mention_unreported。
 */
var MAX_REPORTED_MENTIONS = 100;
//@ chunk-e6aww6q8.js:3355471-3355720 file-local
/**
 * 记录一个提及处理结果事件（agent/mcp_resource 成功或失败）。旧版名 processMcpResourceAttachments 为错配。
 */
function logMentionResult(index, mentionType, success) {
  if (index >= MAX_REPORTED_MENTIONS) return;
  if (mentionType === "agent")
    logEvent(success ? "tengu_at_mention_agent_success" : "tengu_at_mention_agent_not_found", {});
  else
    logEvent(success ? "tengu_at_mention_mcp_resource_success" : "tengu_at_mention_mcp_resource_error", {});
  logAtMention({
    mentionType,
    success,
  });
}
//@ chunk-e6aww6q8.js:3355720-3355812 layout
/**
 * 提及数超过上限时记 tengu_at_mention_unreported。
 */
function logUnreportedMentions(mentionType, mentionCount) {
  if (mentionCount > MAX_REPORTED_MENTIONS)
    logEvent("tengu_at_mention_unreported", {
      mention_type: fromEnum(mentionType),
      count: mentionCount - MAX_REPORTED_MENTIONS,
    });
}
//@ chunk-e6aww6q8.js:3355812-3355842 layout
/**
 * 按 readFileState 记录变更文件检查顺序的 WeakMap。
 */
var MAX_CHANGED_FILE_SNIPPET_CHARS; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
var changedFilesOrderByState;
deferInit("chunk-e6aww6q8.js:3355812", () => {
  MAX_CHANGED_FILE_SNIPPET_CHARS = 16384;
  changedFilesOrderByState = new WeakMap();
});
//@ chunk-e6aww6q8.js:3355842-3358973 fingerprint (2.1.88 match: getChangedFiles, 0.432)
/**
 * 检查已读文件（readFileState）在磁盘上是否变化：变化的文本文件给 edited_text_file（diff 片段，总长 16KB 内），图片给 edited_image_file；计划模式下跳过。
 */
async function getChangedFiles(toolUseContext) {
  let filePaths = remoteFileStateKeys(toolUseContext.readFileState);
  if (filePaths.length === 0) return [];
  if (isDiskless()) {
    reportOnce("changed_files");
    return [];
  }
  let previousOrder = changedFilesOrderByState.get(toolUseContext.readFileState) ?? [];
  let currentPaths = new Set(filePaths);
  let previousPaths = new Set(previousOrder);
  let combined = previousOrder
    .filter((filePath) => currentPaths.has(filePath))
    .concat(filePaths.filter((filePath) => !previousPaths.has(filePath)));
  let abortedPaths = new Set();
  let unexaminedPaths = new Set();
  let toolPermissionContext = getToolPermissionContext(toolUseContext);
  let featureValue_CACHED_MAY_BE_STALE = getFeatureValue_CACHED_MAY_BE_STALE("tengu_fallow_plover", false);
  let outputsLink =
    featureValue_CACHED_MAY_BE_STALE && getFeatureValue_CACHED_MAY_BE_STALE("tengu_mossy_thrush", false)
      ? defaultOutputRoots()
      : undefined;
  let outcomeCounts = {};
  let rereadCount = 0;
  let instructionRestricted = isInstructionReadRestricted(toolPermissionContext);
  let readThrottle = createReadThrottle();
  let results = await Promise.all(
    combined.map(async (filePath) => {
      let fileState = toolUseContext.readFileState.get(filePath);
      if (!fileState) return null;
      if (fileState.offset !== undefined || fileState.limit !== undefined) return null;
      let normalizedPath = expandPath(filePath);
      if (isAttachmentReadDeniedOrThrown(normalizedPath, toolPermissionContext)) return null;
      let releaseThrottle;
      try {
        releaseThrottle = instructionRestricted ? await readThrottle() : undefined;
        let unexaminedSet = toolUseContext.abortController.signal.aborted ? abortedPaths : unexaminedPaths;
        let pathSpellings = instructionRestricted
          ? await readableInstructionSpellings(
              normalizedPath,
              {
                context: toolPermissionContext,
                isHeldOutside: isRestrictedReadBlocked,
              },
              toolUseContext.abortController.signal,
            )
          : [normalizedPath];
        if (pathSpellings === undefined) {
          if (toolUseContext.abortController.signal.aborted) unexaminedSet.add(filePath);
          return null;
        }
        if ((await getFileModificationTimeAsync(normalizedPath)) <= fileState.timestamp) return null;
        let fileInput = {
          file_path: normalizedPath,
        };
        if (!(await FileReadTool.validateInput(fileInput, toolUseContext)).result) return null;
        if (
          featureValue_CACHED_MAY_BE_STALE &&
          (await checkFileStateResyncOnce(
            toolUseContext.readFileState,
            normalizedPath,
            fileState,
            toolUseContext.fileReadingLimits?.maxSizeBytes ?? getDefaultFileReadingLimits().maxSizeBytes,
            toolUseContext.abortController.signal,
            {
              outputsLink,
              isLandingJudged: instructionRestricted
                ? (spelling) => pathSpellings.includes(spelling)
                : () => true,
              onOutcome: (outcome, viaOutputsLink, differsFile) => {
                outcomeCounts[outcome] = (outcomeCounts[outcome] ?? 0) + 1;
                if (viaOutputsLink)
                  outcomeCounts.via_outputs_link = (outcomeCounts.via_outputs_link ?? 0) + 1;
                if (outcome === "differs" && differsFile !== undefined)
                  getAttachmentTimingStore()?.noteDiffersFile(
                    differsFile,
                    fileState.content === "" && (fileState.contentLength ?? 0) > 0,
                  );
              },
            },
          ))
        )
          return null;
        rereadCount++;
        let onlyStartHeld = toolUseContext.readFileState.holdsOnlyStartOf(normalizedPath);
        recordToolUsed(FileReadTool.name);
        let readContext = instructionRestricted
          ? await stashAttachedReadPermission(normalizedPath, pathSpellings, toolUseContext)
          : toolUseContext;
        let readPromise = timeAttachment("changed_file_read", () =>
          FileReadTool.call(fileInput, readContext),
        );
        releaseThrottle?.();
        let readResult = await readPromise;
        if (fileState.isPartialView || onlyStartHeld) {
          let currentState = toolUseContext.readFileState.get(normalizedPath);
          if (currentState)
            toolUseContext.readFileState.set(normalizedPath, {
              ...currentState,
              ...(fileState.isPartialView && {
                isPartialView: true,
              }),
              ...(onlyStartHeld && {
                contentNotInModelContext: true,
              }),
            });
        }
        if (readResult.data.type === "text") {
          if (readResult.data.file.truncatedByTokenCap === true) return null;
          if (matchesContentHash(fileState, readResult.data.file.content)) return null;
          if (fileState.content === "" && (fileState.contentLength ?? 0) > 0) {
            markContentNotInModelContext(toolUseContext.readFileState, normalizedPath);
            return {
              type: "edited_text_file",
              filename: normalizedPath,
              snippet: "",
            };
          }
          let snippet = getSnippetForTwoFileDiff(fileState.content, readResult.data.file.content);
          if (snippet === "") return null;
          if (isSensitiveFileName(normalizedPath)) {
            markContentNotInModelContext(toolUseContext.readFileState, normalizedPath);
            return {
              type: "edited_text_file",
              filename: normalizedPath,
              snippet: "",
            };
          }
          return {
            type: "edited_text_file",
            filename: normalizedPath,
            snippet,
          };
        }
        if (readResult.data.type === "image")
          try {
            let heldFile = instructionRestricted
              ? await checkPathRefused(normalizedPath, pathSpellings, toolUseContext.abortController.signal)
              : undefined;
            try {
              let content = await readImageWithTokenBudget(
                heldFile ?? normalizedPath,
                undefined,
                undefined,
                imageLimitsForModel(toolUseContext.options.mainLoopModel),
              );
              return {
                type: "edited_image_file",
                filename: normalizedPath,
                content,
              };
            } finally {
              if (heldFile !== undefined) await heldFile.close().catch(() => {});
            }
          } catch (compressionError) {
            logForDebugging(
              `Failed to read changed image file ${normalizedPath}: ${compressionError instanceof Error ? compressionError.message : String(compressionError)}`,
              {
                level: "error",
              },
            );
            logEvent("tengu_watched_file_compression_failed", {
              ext: getFileExtensionForAnalytics(normalizedPath),
              ...errorTelemetryFields(compressionError),
            });
            return null;
          }
        return null;
      } catch (err) {
        if (isENOENT(err)) toolUseContext.readFileState.delete(filePath);
        return null;
      } finally {
        releaseThrottle?.();
      }
    }),
  );
  let unexaminedCount = abortedPaths.size + unexaminedPaths.size;
  if (unexaminedCount === 0) changedFilesOrderByState.delete(toolUseContext.readFileState);
  else {
    changedFilesOrderByState.set(
      toolUseContext.readFileState,
      combined
        .filter((result) => abortedPaths.has(result))
        .concat(combined.filter((filePath) => unexaminedPaths.has(filePath))),
    );
    logForDebugging(
      `Changed files: the pass ended with ${unexaminedCount} of ${combined.length} tracked files not examined; the next pass begins with them.`,
      {
        level: "warn",
      },
    );
  }
  if (!toolUseContext.agentId) {
    noteChangedFilesReread(rereadCount);
    noteChangedFilesCompared(outcomeCounts);
  }
  let filtered = results.filter((result) => result != null);
  let snippetChars = 0;
  for (let attachment of filtered) {
    if (attachment.type !== "edited_text_file") continue;
    if (snippetChars >= MAX_CHANGED_FILE_SNIPPET_CHARS) {
      attachment.snippet = "";
      markContentNotInModelContext(toolUseContext.readFileState, attachment.filename);
    } else snippetChars += attachment.snippet.length;
  }
  return filtered;
}
//@ chunk-e6aww6q8.js:3358973-3359439 layout
/**
 * 消费 nestedMemoryAttachmentTriggers（读文件等操作触发的路径），生成对应嵌套记忆附件。
 */
async function getNestedMemoryTriggerAttachments(toolUseContext, messages) {
  let { nestedMemoryAttachmentTriggers, pendingNestedMemoryTriggers } = toolUseContext;
  let newlyAddedTriggers = new Set();
  if (nestedMemoryAttachmentTriggers && pendingNestedMemoryTriggers && !toolUseContext.agentId) {
    for (let pendingNestedMemoryTrigger of pendingNestedMemoryTriggers)
      if (!nestedMemoryAttachmentTriggers.includes(pendingNestedMemoryTrigger)) {
        nestedMemoryAttachmentTriggers.push(pendingNestedMemoryTrigger);
        newlyAddedTriggers.add(pendingNestedMemoryTrigger);
      }
    toolUseContext.consumedNestedMemoryTriggers?.push(...pendingNestedMemoryTriggers);
    pendingNestedMemoryTriggers.length = 0;
  }
  if (env.CLAUDE_CODE_DISABLE_CLAUDE_MDS) {
    if (nestedMemoryAttachmentTriggers) nestedMemoryAttachmentTriggers.length = 0;
    return [];
  }
  if (!nestedMemoryAttachmentTriggers || nestedMemoryAttachmentTriggers.length === 0) return [];
  let toolPermissionContext = getToolPermissionContext(toolUseContext);
  let attachments = [];
  let announcementState = messages && (await getMemoryAnnouncementState(toolUseContext, messages));
  for (let nestedMemoryAttachmentTrigger of nestedMemoryAttachmentTriggers) {
    let nestedMemoryAttachmentsForFile = await getNestedMemoryAttachmentsForFile(
      nestedMemoryAttachmentTrigger,
      toolUseContext,
      {
        toolPermissionContext,
      },
      announcementState,
      newlyAddedTriggers.has(nestedMemoryAttachmentTrigger),
    );
    attachments.push(...nestedMemoryAttachmentsForFile);
  }
  nestedMemoryAttachmentTriggers.length = 0;
  return attachments;
}
//@ chunk-e6aww6q8.js:3359439-3359508 layout
/**
 * readFileState 已有该路径（可选要求完整读取）。
 */
function isAlreadyReadWhole(readFileState, filePath, earlierReadsMayBeCleared) {
  return (
    readFileState.has(filePath) &&
    (!earlierReadsMayBeCleared || readFileState.get(filePath)?.offset === undefined)
  );
}
//@ chunk-e6aww6q8.js:3359508-3360723 fingerprint (2.1.88 match: getRelevantMemoryAttachments, 0.541)
/**
 * 相关记忆检索：按提及的代理记忆或自动记忆目录列出候选，用记忆选择器挑选，读取后生成 relevant_memories（可含账户召回）。
 */
async function getRelevantMemoryAttachments(
  session,
  input,
  activeAgents,
  memorySelector,
  readFileState,
  signal,
  surfaced,
  storageV5,
  credentials,
  selectorTurnReverts,
  isBlockedPath,
  earlierReadsMayBeCleared,
  autoMemoryOn,
  accountRecall,
) {
  let agentMemoryScopes = autoMemoryOn
    ? extractAgentMentions(input).flatMap((mention) => {
        let agentType = mention.replace("agent-", "");
        let agentDef = activeAgents.find((def) => def.agentType === agentType);
        return agentDef?.memory
          ? [
              {
                agentType,
                scope: agentDef.memory,
              },
            ]
          : [];
      })
    : [];
  let accountListingPromise = agentMemoryScopes.length === 0 ? accountRecall?.listing() : undefined;
  await getAutoMemPathState().warmCanonicalWcRoot();
  let isAutoMemoryActive = autoMemoryOn && !(agentMemoryScopes.length === 0 && isAutoMemReadFenced());
  let accountListing = await accountListingPromise;
  if (!isAutoMemoryActive && accountListing === undefined) return [];
  await waitForFirstStorePull(signal);
  let dirs =
    agentMemoryScopes.length > 0
      ? (
          await Promise.all(
            agentMemoryScopes.map(({ agentType, scope }) => resolveAgentMemoryDirForRecall(agentType, scope)),
          )
        ).filter((dir) => dir !== null)
      : [
          {
            dir: getAutoMemPath(),
            regularFilesOnly: false,
            containedIn: undefined,
          },
        ];
  let selected = (
    await Promise.all(
      dirs.map(({ dir, regularFilesOnly, containedIn }) =>
        selectMemoryRecall(
          session,
          input,
          dir,
          memorySelector,
          signal,
          surfaced.paths,
          isIndexRecallEnabled(),
          activeSessionLogExcluder(),
          dir === getAutoMemPath(),
          (recalledPath) => isAlreadyReadWhole(readFileState, recalledPath, earlierReadsMayBeCleared),
          isMultiStoreSyncAvailable,
          storageV5,
          credentials,
          selectorTurnReverts,
          regularFilesOnly,
          dir === getAutoMemPath() ? accountListing : undefined,
          isAutoMemoryActive,
          dir === getAutoMemPath()
            ? (accountRecall?.scope() ?? accountMemoryRecall?.NO_ACCOUNT_SCOPE)
            : undefined,
        )
          .then((memoryRecall) =>
            memoryRecall.map((memoryEntry) => ({
              ...memoryEntry,
              regularFilesOnly,
              containedIn,
            })),
          )
          .catch(() => []),
      ),
    )
  )
    .flat()
    .filter((selectedMemory) =>
      selectedMemory.account
        ? accountRecall?.pickable(selectedMemory.path) === true
        : !isAlreadyReadWhole(readFileState, selectedMemory.path, earlierReadsMayBeCleared) &&
          !surfaced.paths.has(selectedMemory.path) &&
          !isBlockedPath(selectedMemory.path),
    )
    .slice(0, 5);
  let [memoriesForSurfacing, accountAttachments] = await Promise.all([
    readMemoriesForSurfacing(
      selected.filter((fileMemoryEntry) => !fileMemoryEntry.account),
      signal,
    ),
    accountRecall?.attachmentsFor(
      selected
        .filter((accountMemoryEntry) => accountMemoryEntry.account)
        .map((accountMemoryPath) => accountMemoryPath.path),
      RELEVANT_MEMORIES_CONFIG.MAX_SESSION_BYTES - surfaced.totalBytes,
      signal,
    ) ?? [],
  ]);
  return [
    ...(memoriesForSurfacing.length > 0
      ? [
          {
            type: "relevant_memories",
            memories: memoriesForSurfacing,
          },
        ]
      : []),
    ...accountAttachments,
  ];
}
//@ chunk-e6aww6q8.js:3360723-3361031 fingerprint (2.1.88 match: collectSurfacedMemories, 0.869)
/**
 * 统计对话里已出现的相关记忆路径与总字节数（含账户召回）。
 */
function collectSurfacedMemories(messages) {
  let paths = new Set();
  let totalBytes = 0;
  for (let m of messages) {
    if (m.type !== "attachment") continue;
    if (m.attachment.type === "relevant_memories")
      for (let mem of m.attachment.memories) {
        paths.add(mem.path);
        totalBytes += mem.content.length;
      }
    else if (m.attachment.type === "account_memory_recall") totalBytes += m.attachment.content.length;
  }
  return {
    paths,
    totalBytes,
  };
}
//@ chunk-e6aww6q8.js:3361031-3361660 fingerprint (2.1.88 match: readMemoriesForSurfacing, 0.843)
/**
 * 读取选中的记忆文件：限制为普通文件/目录内，截断时附提示（用 Read 看全文），返回 {path, content, mtimeMs, header, limit}。
 */
async function readMemoriesForSurfacing(selected, signal) {
  return (
    await Promise.all(
      selected.map(async (selectedMemory) => {
        let { path: filePath, mtimeMs, regularFilesOnly, containedIn } = selectedMemory;
        try {
          if (regularFilesOnly && !(await lstat(filePath)).isFile()) return null;
          if (containedIn !== undefined && !(await isRealpathWithin(filePath, containedIn))) return null;
          let memoryFileForRecall = await readMemoryFileForRecall(filePath, signal);
          if (memoryFileForRecall === undefined) return null;
          let sanitizedContent = sanitizeMemoryText(memoryFileForRecall.content);
          let content = memoryFileForRecall.truncated
            ? sanitizedContent +
              `

> This memory file was truncated (${memoryFileForRecall.truncatedByBytes ? `${MEMORY_FILE_RECALL_BYTES} byte limit` : `first ${MAX_ENTRYPOINT_TAIL_LINES} lines`}). Use the ${FILE_READ_TOOL_NAME} tool to view the complete file at: ${singleLineMemoryText(filePath)}`
            : sanitizedContent;
          return {
            path: filePath,
            content,
            mtimeMs,
            header: memoryHeader(filePath, mtimeMs),
            limit:
              memoryFileForRecall.truncated ||
              memoryFileForRecall.itemBlockRemoved ||
              sanitizedContent !== memoryFileForRecall.content
                ? memoryFileForRecall.lineCount
                : undefined,
          };
        } catch {
          return null;
        }
      }),
    )
  ).filter((memory) => memory !== null);
}
//@ chunk-e6aww6q8.js:3361660-3361745 layout
/**
 * 不做相关记忆预取的 querySource：extract_memories、auto_dream、prompt_suggestion、compact 等。
 */
var MEMORY_PREFETCH_SKIP_SOURCES; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-e6aww6q8.js:3361660", () => {
  MEMORY_PREFETCH_SKIP_SOURCES = new Set([
    "extract_memories",
    "auto_dream",
    MEMDIR_RELEVANCE,
    "prompt_suggestion",
    "compact",
  ]);
});
//@ chunk-e6aww6q8.js:3361745-3363462 fingerprint (2.1.88 match: startRelevantMemoryPrefetch, 0.544)
/**
 * 在 queryLoop 入口启动相关记忆预取：主线程、非跳过来源、自动记忆或账户召回开启、最后一条用户消息有空白（或含 CJK）、会话预算未超 60KB 时，异步调用 getRelevantMemoryAttachments，返回可 using 释放的句柄。
 */
function startRelevantMemoryPrefetch(messages, toolUseContext, querySource, memoryContextPromise) {
  let memorySelector = toolUseContext.memorySelector;
  if (!memorySelector || toolUseContext.agentId || MEMORY_PREFETCH_SKIP_SOURCES.has(querySource)) return;
  let autoMemoryOn = isAutoMemoryEnabled() && isMemoryRecallEnabled();
  let isAccountRecallActive = accountMemoryRecall?.isAccountRecallOn() === true && !isIndexRecallEnabled();
  if (!autoMemoryOn && !isAccountRecallActive) return;
  let lastUserMessage = messages.findLast((m) => m.type === "user" && !m.isMeta);
  if (!lastUserMessage) return;
  let input = getUserMessageText(lastUserMessage);
  if (!input) return;
  if (
    !/\s/.test(input.trim()) &&
    !(
      isIndexRecallEnabled() &&
      /[\u3040-\u30FF\u3400-\u4DBF\u4E00-\u9FFF\uAC00-\uD7AF\uF900-\uFAFF]/.test(normalizeNfkc(input))
    )
  )
    return;
  let surfaced = collectSurfacedMemories(messages);
  if (surfaced.totalBytes >= RELEVANT_MEMORIES_CONFIG.MAX_SESSION_BYTES) {
    logFeatureSad("memory_recall_select", "session_budget_exhausted");
    return;
  }
  let accountRecall =
    isAccountRecallActive && accountMemoryRecall
      ? accountMemoryRecall.startAccountRecall(
          messagesSinceCompactBoundary([...messages]),
          toolUseContext,
          querySource,
          memoryContextPromise,
          {
            callMcpToolRaw: callMcpTool,
            executePreToolHooks,
          },
        )
      : undefined;
  if (!autoMemoryOn && !accountRecall) return;
  let earlierReadsMayBeCleared = hasClearedToolResultsAfterIdle(
    messages,
    toolUseContext.options.mainLoopModel,
    undefined,
    toolUseContext.session,
  );
  let controller = createChildAbortController(toolUseContext.abortController);
  let firedAt = Date.now();
  let deferredReleaseCallbacks = [];
  let promise = getRelevantMemoryAttachments(
    toolUseContext.session,
    input,
    toolUseContext.options.agentDefinitions.activeAgents,
    memorySelector,
    toolUseContext.readFileState,
    controller.signal,
    surfaced,
    toolUseContext.storageV5,
    toolUseContext.credentials,
    deferredReleaseCallbacks,
    (pathToCheck) => {
      let toolPermissionContext = getToolPermissionContext(toolUseContext);
      if (toolPermissionContext?.blockReadsOutsideWorkingDirectories !== true) return false;
      try {
        return outsideReadBlocked(pathToCheck, toolPermissionContext);
      } catch {
        return true;
      }
    },
    earlierReadsMayBeCleared,
    autoMemoryOn,
    accountRecall,
  ).catch((e) => {
    if (!isAbortError(e)) logError(e);
    return [];
  });
  let prefetchHandle = {
    promise,
    settledAt: null,
    consumedOnIteration: -1,
    consumedBlocking: false,
    earlierReadsMayBeCleared,
    screen(entries, screenContext) {
      return accountRecall ? accountRecall.screen(entries, screenContext) : [...entries];
    },
    [Symbol.dispose]() {
      controller.abort();
      if (prefetchHandle.consumedOnIteration === -1)
        promise.then(() => deferredReleaseCallbacks.forEach((release) => release()));
      accountRecall?.finish(prefetchHandle);
      let lastUsage = memorySelector.lastUsage;
      logEvent("tengu_memdir_prefetch_collected", {
        hidden_by_first_iteration:
          prefetchHandle.settledAt !== null &&
          prefetchHandle.consumedOnIteration === 0 &&
          !prefetchHandle.consumedBlocking,
        blocking_consume: prefetchHandle.consumedBlocking,
        consumed_on_iteration: prefetchHandle.consumedOnIteration,
        latency_ms: (prefetchHandle.settledAt ?? Date.now()) - firedAt,
        cache_read_input_tokens: lastUsage?.cacheReadInputTokens,
        cache_creation_input_tokens: lastUsage?.cacheCreationInputTokens,
        selector_turn_count: lastUsage?.turnCount,
      });
    },
  };
  promise.finally(() => {
    prefetchHandle.settledAt = Date.now();
  });
  return prefetchHandle;
}
//@ chunk-e6aww6q8.js:3363462-3363475 layout
/**
 * 2000：阻塞等待记忆预取的上限。
 */
var MEMORY_PREFETCH_DEADLINE_MS = 2000;
//@ chunk-e6aww6q8.js:3363475-3363547 layout
/**
 * 是否在请求前阻塞等待记忆预取（tengu_mill_orange 且记忆同步不在待定状态）。
 */
function shouldBlockOnMemoryPrefetch() {
  return (
    isIndexRecallEnabled() &&
    !firstStorePullPending() &&
    !(isMultiStoreSyncAvailable() && getOrgMemoryDecision().state === "undecided")
  );
}
//@ chunk-e6aww6q8.js:3363547-3364082 layout
/**
 * 最多等 2 秒或中止，记 tengu_memdir_prefetch_blocking_wait，返回预取到的附件。
 */
async function awaitMemoryPrefetch(memoryRecallPrefetch, signal) {
  let now = Date.now();
  let onAbort;
  let promise = new Promise((resolve) => {
    if (signal.aborted) {
      resolve(undefined);
      return;
    }
    onAbort = () => resolve(undefined);
    signal.addEventListener("abort", onAbort, {
      once: true,
    });
  });
  let attachments;
  try {
    attachments = await Promise.race([
      withDeadline(memoryRecallPrefetch.promise, MEMORY_PREFETCH_DEADLINE_MS),
      promise,
    ]);
  } finally {
    if (onAbort !== undefined) signal.removeEventListener("abort", onAbort);
  }
  let blockingWaitMs = Date.now() - now;
  logEvent("tengu_memdir_prefetch_blocking_wait", {
    outcome: fromEnum(signal.aborted ? "aborted" : attachments !== undefined ? "consumed" : "deadline"),
    blocking_wait_ms: blockingWaitMs,
    deadline_fired: attachments === undefined && !signal.aborted,
    result_in_time: attachments !== undefined && !signal.aborted,
    attachment_count: attachments?.length ?? -1,
  });
  return signal.aborted ? undefined : attachments;
}
//@ chunk-e6aww6q8.js:3364082-3364192 file-local
/**
 * 对象且 type=tool_result、tool_use_id 为字符串。
 */
function isToolResultBlock_3(b) {
  return typeof b === "object" && b !== null && b.type === "tool_result" && typeof b.tool_use_id === "string";
}
//@ chunk-e6aww6q8.js:3364192-3364245 file-local
/**
 * 内容数组里含 tool_result 块（用于区分真实用户轮与工具结果轮）。
 */
function hasToolResultContent(content) {
  return Array.isArray(content) && content.some(isToolResultBlock_3);
}
//@ chunk-e6aww6q8.js:3364245-3364589 fingerprint (2.1.88 match: filterDuplicateMemoryAttachments, 0.9)
/**
 * 去掉已读过的相关记忆，把新记忆写入 readFileState 并记入已呈现集合；空的附件丢弃。
 */
function filterDuplicateMemoryAttachments(attachments, readFileState, session, earlierReadsMayBeCleared) {
  let claudeMdTracker = claudeMdAccessTrackerSlot.of(session);
  return attachments
    .map((attachment) => {
      if (attachment.type !== "relevant_memories") return attachment;
      let filtered = attachment.memories.filter(
        (m) => !isAlreadyReadWhole(readFileState, m.path, earlierReadsMayBeCleared),
      );
      for (let m of filtered)
        readFileState.set(m.path, {
          content: m.content,
          timestamp: m.mtimeMs,
          offset: undefined,
          limit: m.limit,
        });
      claudeMdTracker.recordSurfaced(filtered.map((memory) => memory.path));
      return filtered.length > 0
        ? {
            ...attachment,
            memories: filtered,
          }
        : null;
    })
    .filter((attachment) => attachment !== null);
}
//@ chunk-e6aww6q8.js:3364589-3364614 layout
/**
 * 技能附件附加字段（当前构建恒为空对象）。
 */
function getSkillAttachmentExtras(tools) {
  return {};
}
//@ chunk-e6aww6q8.js:3364614-3365645 fingerprint (2.1.88 match: getDynamicSkillAttachments, 0.901)
/**
 * 文件操作触发的新技能目录：扫描技能目录，产出 dynamic_skill 附件（目录、技能名）。
 */
async function getDynamicSkillAttachments(toolUseContext) {
  let dynamicSkillDirTriggers = toolUseContext.dynamicSkillDirTriggers;
  if (!dynamicSkillDirTriggers || dynamicSkillDirTriggers.length === 0) return [];
  let pendingDirs = [...dynamicSkillDirTriggers];
  dynamicSkillDirTriggers.length = 0;
  if (getDisableSlashCommands()) return [];
  if (!toolUseContext.options.tools.some((tool) => toolMatchesName(tool, SKILL))) return [];
  await addSkillDirectories(pendingDirs).catch(() => {});
  let projectRoot = getProjectRoot();
  let projectRootPrefix = projectRoot.endsWith(sep) ? projectRoot : projectRoot + sep;
  let skillToolCommands = await getSkillToolCommands(getProjectRoot(), toolUseContext.storageV5);
  if (toolUseContext.agentId === undefined)
    skillToolCommands = filterCommandsByAllowlist(skillToolCommands, getSessionSkillAllowlist());
  let namesBySkillRoot = new Map();
  for (let skillToolCommand of skillToolCommands)
    if (skillToolCommand.type === "prompt" && skillToolCommand.skillRoot)
      namesBySkillRoot.set(skillToolCommand.skillRoot, skillToolCommand.name);
  let attachments = [];
  let perDirResults = await Promise.all(
    pendingDirs.map(async (skillDir) => {
      try {
        let candidates = (
          await readdir(skillDir, {
            withFileTypes: true,
          })
        )
          .filter((e) => e.isDirectory() || e.isSymbolicLink())
          .map((e) => e.name);
        let checked = await Promise.all(
          candidates.map(async (name) => {
            try {
              await stat(resolve_2(skillDir, name, "SKILL.md"));
            } catch {
              return null;
            }
            let skillName = namesBySkillRoot.get(resolve_2(skillDir, name));
            if (!skillName || !isNonEmptyIdentifier(skillName)) return null;
            return skillName;
          }),
        );
        return {
          skillDir,
          skillNames: checked.filter((n) => n !== null),
        };
      } catch {
        return {
          skillDir,
          skillNames: [],
        };
      }
    }),
  );
  for (let { skillDir, skillNames } of perDirResults) {
    if (skillNames.length === 0) continue;
    let displayPath = relative(projectRoot, skillDir);
    if (CONTROL_CHARS_OR_ANGLE_RE.test(displayPath) || !skillDir.startsWith(projectRootPrefix)) continue;
    attachments.push({
      type: "dynamic_skill",
      skillDir,
      skillNames,
      displayPath,
      ...getSkillAttachmentExtras(toolUseContext.options.tools),
    });
  }
  return attachments;
}
//@ chunk-e6aww6q8.js:3365645-3365687 layout
/**
 * getSkillListingAttachments 的转发包装。
 */
async function getSkillListingAttachmentsLazy(...args) {
  return getSkillListingAttachments(...args);
}
//@ chunk-e6aww6q8.js:3365687-3366805 fingerprint (2.1.88 match: getSkillListingAttachments, 0.674)
/**
 * 有 Skill 工具时产出 skill_listing：首次完整列表，之后只给新增（对比历史 digest），带技能数与名字。
 */
async function getSkillListingAttachments(toolUseContext, messages) {
  if (getDisableSlashCommands()) return [];
  if (!toolUseContext.options.tools.some((t) => toolMatchesName(t, SKILL))) return [];
  let skillToolCommands = await getSkillToolCommands(getProjectRootOrNull(), toolUseContext.storageV5);
  let hiddenCommands = hiddenCommandsWhenSlashDisabled(toolUseContext.getMcp().commands);
  let filtered = memorySkillCommands().filter(
    (command) => !command.disableModelInvocation && !isHiddenFromModel(command),
  );
  let mcpPromptCommands = mcpPromptCommandsWithReserved(toolUseContext.getMcp().commands);
  let unclashedSkills = dropSyncedNameClashes(skillToolCommands, mcpPromptCommands);
  let mcpSkills = dedupeBundledSkills(
    hiddenCommands.length > 0
      ? dropShadowedFallbackSkills(uniqByExport([...unclashedSkills, ...filtered, ...hiddenCommands], "name"))
      : uniqByExport([...unclashedSkills, ...filtered], "name"),
  );
  let { agentContext } = toolUseContext;
  if (
    isMainConversationContext(agentContext) ||
    (agentContext.agentType === "subagent" &&
      agentContext.isBuiltIn === true &&
      agentContext.subagentName === FORK)
  )
    mcpSkills = filterCommandsByAllowlist(mcpSkills, getSessionSkillAllowlist());
  let announcedDigests = new Map();
  for (let cmd of messages)
    if (cmd.type === "attachment" && cmd.attachment.type === "skill_listing") {
      let { names = [], digests } = cmd.attachment;
      for (let [index, name] of names.entries())
        announcedDigests.set(name, (announcedDigests.get(name) ?? new Set()).add(digests?.[index]));
    }
  let newSkills = mcpSkills.filter((cmd) => {
    let digestSet = announcedDigests.get(cmd.name);
    return !digestSet?.has(undefined) && !digestSet?.has(getSkillListingDigest(cmd));
  });
  if (newSkills.length === 0) return [];
  let isInitial = announcedDigests.size === 0;
  logForDebugging(`Sending ${newSkills.length} skills via attachment (${isInitial ? "initial" : "dynamic"})`);
  let contextWindowTokens = getContextWindow(toolUseContext.options.mainLoopModel, getSdkBetas());
  return [
    {
      type: "skill_listing",
      content: formatCommandsWithinBudget(
        newSkills,
        (skill) => getSkillUsageScore(skill.name),
        contextWindowTokens,
        bytesPerTokenForModel(toolUseContext.options.mainLoopModel),
        [...(await getCommands(getProjectRootOrNull(), toolUseContext.storageV5)), ...mcpPromptCommands],
      ),
      skillCount: newSkills.length,
      isInitial,
      names: newSkills.map((newSkill) => newSkill.name),
      ...getSkillAttachmentExtras(toolUseContext.options.tools),
      digests: newSkills.map(getSkillListingDigest),
    },
  ];
}
//@ chunk-e6aww6q8.js:3366805-3367028 fingerprint (2.1.88 match: extractAtMentionedFiles, 0.486)
/**
 * 从输入中提取 @ 文件提及（@"带空格路径" 与普通 @path，排除 (agent)）。
 */
function extractAtMentionedFiles(content) {
  let quotedAtMentionRegex = new RegExp(String.raw`(^|${WORD_BOUNDARY_PATTERN})@"([^"]+)"`, "g");
  let quotedMentions = [];
  let match;
  while ((match = quotedAtMentionRegex.exec(content)) !== null)
    if (match[2] && !match[2].endsWith(" (agent)")) quotedMentions.push(match[2]);
  let filtered = extractAtTokens(content, false).filter((match) => !match.startsWith('"'));
  return uniq([...quotedMentions, ...filtered]);
}
//@ chunk-e6aww6q8.js:3367028-3367064 layout
/**
 * 提取 @server:uri 形式的 MCP 资源提及。
 */
function extractMcpResourceMentions(input) {
  return uniq(extractAtTokens(input, true));
}
//@ chunk-e6aww6q8.js:3367064-3367395 layout
/**
 * 按空白切词找 @ 后的 token（可要求含冒号），去掉尾部成对标点。
 */
function extractAtTokens(text, requireResourceUri) {
  let tokens = [];
  if (!text.includes("@")) return tokens;
  for (let [word] of text.matchAll(/[^\s]+/g)) {
    let index = word.indexOf("@");
    while (index > 0 && !CJK_PUNCTUATION.includes(word[index - 1])) index = word.indexOf("@", index + 1);
    if (index === -1) continue;
    let tokenStart = requireResourceUri ? word.indexOf(":", index + 2) : index;
    if (tokenStart === -1) continue;
    let tokenEnd = word.length;
    while (
      tokenEnd >= tokenStart + 2 &&
      isWordCharCodeAt(word, tokenEnd - 1) === isWordCharCodeAt(word, tokenEnd)
    )
      tokenEnd--;
    if (tokenEnd >= tokenStart + 2) tokens.push(word.slice(index + 1, tokenEnd));
  }
  return tokens;
}
//@ chunk-e6aww6q8.js:3367395-3367674 layout
/**
 * 提取 @"name (agent)" 与 @agent-name 形式的代理提及。
 */
function extractAgentMentions(content) {
  let results = [];
  let quotedAgentRegex = new RegExp(String.raw`(^|${WORD_BOUNDARY_PATTERN})@"([\w:.@-]+) \(agent\)"`, "g");
  let match;
  while ((match = quotedAgentRegex.exec(content)) !== null) if (match[2]) results.push(match[2]);
  let unquotedAgentRegex = new RegExp(String.raw`(^|${WORD_BOUNDARY_PATTERN})@(agent-[\w:.@-]+)`, "g");
  let unquotedMatches = content.match(unquotedAgentRegex) || [];
  for (let m of unquotedMatches) results.push(m.slice(m.indexOf("@") + 1));
  return uniq(results);
}
//@ chunk-e6aww6q8.js:3367674-3367881 fingerprint (2.1.88 match: parseAtMentionedFileLines, 1)
/**
 * 解析 "file#L10-20" 形式的行范围。
 */
function parseAtMentionedFileLines(mention) {
  let match = mention.match(/^([^#]+)(?:#L(\d+)(?:-(\d+))?)?(?:#[^#]*)?$/);
  if (!match)
    return {
      filename: mention,
    };
  let [, filename, lineStartStr, lineEndStr] = match;
  let lineStart = lineStartStr ? parseInt(lineStartStr, 10) : undefined;
  let lineEnd = lineEndStr ? parseInt(lineEndStr, 10) : lineStart;
  return {
    filename: filename ?? mention,
    lineStart,
    lineEnd,
  };
}
//@ chunk-e6aww6q8.js:3367881-3368060 layout
/**
 * 记 tengu_lsp_diagnostics_injected（字符数、诊断数、文件数、来源）。
 */
function logDiagnosticsInjected(fileDiagnostics, source) {
  logEvent("tengu_lsp_diagnostics_injected", {
    diagnostics_chars: formatNewDiagnosticsAttachment(fileDiagnostics).length,
    diagnostic_count: fileDiagnostics.reduce((acc, entry) => acc + entry.diagnostics.length, 0),
    file_count: fileDiagnostics.length,
    source: fromEnum(source),
  });
}
//@ chunk-e6aww6q8.js:3368060-3368126 layout
/**
 * 工具列表含编辑类工具（诊断附件前提）。
 */
function hasFileEditTools(tools) {
  return (
    tools.some((tool) => SHELL_TOOL_NAMES_3.some((toolName) => toolMatchesName(tool, toolName))) ||
    alwaysFalseStream(tools)
  );
}
//@ chunk-e6aww6q8.js:3368126-3368301 fingerprint (2.1.88 match: getDiagnosticAttachments, 0.782)
/**
 * IDE MCP 新诊断 → diagnostics 附件（isNew）。
 */
async function getDiagnosticAttachments(tools, session) {
  if (!hasFileEditTools(tools)) return [];
  let newDiagnostics = await diagnosticTrackingSlot.of(session).getNewDiagnostics();
  if (newDiagnostics.length === 0) return [];
  logDiagnosticsInjected(newDiagnostics, "ide-mcp");
  return [
    {
      type: "diagnostics",
      files: newDiagnostics,
      isNew: true,
    },
  ];
}
//@ chunk-e6aww6q8.js:3368301-3368866 fingerprint (2.1.88 match: getLSPDiagnosticAttachments, 0.958)
/**
 * LSP 待发诊断 → diagnostics 附件。
 */
async function getLSPDiagnosticAttachments(tools, toolUseContext) {
  if (!hasFileEditTools(tools)) return [];
  logForDebugging("LSP Diagnostics: getLSPDiagnosticAttachments called");
  try {
    let diagnosticSets = checkForLSPDiagnostics(toolUseContext);
    if (diagnosticSets.length === 0) return [];
    logForDebugging(`LSP Diagnostics: Found ${diagnosticSets.length} pending diagnostic set(s)`);
    let attachments = diagnosticSets.map(({ files }) => {
      logDiagnosticsInjected(files, "lsp");
      return {
        type: "diagnostics",
        files,
        isNew: true,
      };
    });
    if (diagnosticSets.length > 0) {
      clearAllLSPDiagnostics(toolUseContext);
      logForDebugging(
        `LSP Diagnostics: Cleared ${diagnosticSets.length} delivered diagnostic(s) from registry`,
      );
    }
    logForDebugging(`LSP Diagnostics: Returning ${attachments.length} diagnostic attachment(s)`);
    return attachments;
  } catch (error) {
    let err = toError(error);
    logError(Error(`Failed to get LSP diagnostic attachments: ${err.message}`));
    return [];
  }
}
//@ chunk-e6aww6q8.js:3368866-3369068 fingerprint (2.1.88 match: getAttachmentMessages, 0.686)
/**
 * getAttachmentMessages：调用 getAttachments，记 tengu_attachments（类型与 token 估算），逐个包装成 attachment 消息产出；记录本轮附件耗时。
 */
async function* getAttachmentMessages(
  input,
  toolUseContext,
  ideSelection,
  queuedCommands,
  toolUseId,
  messages,
  querySource,
  options,
) {
  let timingProfile = new AttachmentTimingProfile();
  let attachments = await runWithQueryProfile(timingProfile, () =>
    getAttachments(input, toolUseContext, ideSelection, queuedCommands, messages, querySource, options),
  );
  if (attachments.length > 0) {
    logEvent("tengu_attachments", buildAttachmentsEventPayload(attachments, querySource));
    for (let attachment of attachments) yield createAttachmentMessage_2(attachment, toolUseId);
  }
  let timing = timingProfile.finish();
  if (!toolUseContext.agentId) noteAttachmentPass(timing);
}
//@ chunk-e6aww6q8.js:3369068-3369320 layout
/**
 * tengu_attachments 事件字段：附件类型、token 估算、技能列表是否完整、querySource。
 */
function buildAttachmentsEventPayload(attachments, querySource) {
  let found = attachments.find((attachment) => attachment.type === "skill_listing");
  let attachmentTokenEstimates;
  try {
    attachmentTokenEstimates = attachments.map((attachment) =>
      fromNumber(roughTokenCountEstimationForObject(attachment)),
    );
  } catch (error) {
    logError(error);
  }
  return {
    attachment_types: attachments.map((attachment) => fromEnum(attachment.type)),
    attachment_token_estimates: attachmentTokenEstimates,
    ...(found && {
      skill_listing_is_full: found.isInitial,
    }),
    ...(querySource && {
      query_source: agentTypeForTelemetry(querySource),
    }),
  };
}
//@ chunk-e6aww6q8.js:3369320-3370101 fingerprint (2.1.88 match: tryGetPDFReference, 0.732)
/**
 * PDF 超过页数/大小阈值或模型按页读取时，返回 pdf_reference（只给引用，不内联内容）。
 */
async function tryGetPDFReference(filename, mainLoopModel, fileHandle) {
  let ext = parse(filename).ext.toLowerCase();
  if (!isDocumentExtension(ext)) return null;
  try {
    let [stats, pdfPageCount] = await Promise.all([
      fileHandle ?? getFsImplementation().stat(filename),
      getPdfPageCount(fileHandle?.ioPath ?? filename, fileHandle),
    ]);
    let effectivePageCount = Math.ceil(stats.size / 102400);
    let tooManyPages =
      pdfPageCount.pageCount !== null
        ? pdfPageCount.pageCount > MAX_PDF_PAGES_PER_TURN
        : effectivePageCount > MAX_PDF_PAGES_PER_TURN ||
          (await isUncountedPDFOverWholeReadCap(stats.size, pdfPageCount.pdfinfoFailure));
    let modelReadsByPage = !isNotClaude3Model(mainLoopModel);
    let effectivePageCount_2 = !tooManyPages && modelReadsByPage;
    if (tooManyPages || effectivePageCount_2) {
      logEvent("tengu_pdf_reference_attachment", {
        pageCount: pdfPageCount.pageCount ?? effectivePageCount,
        fileSize: stats.size,
        hadPdfinfo: pdfPageCount.pageCount !== null,
        ...(effectivePageCount_2 && {
          wholeRefusedByModel: effectivePageCount_2,
        }),
        ...(modelReadsByPage && {
          modelReadsByPage,
        }),
        ...(pdfPageCount.pageCount === null && {
          pdfinfoFailure: fromEnum(pdfPageCount.pdfinfoFailure.reason),
          ...(pdfPageCount.pdfinfoFailure.reason === "nonzero_exit" && {
            pdfinfoExitCode: pdfPageCount.pdfinfoFailure.exitCode,
          }),
        }),
      });
      return {
        type: "pdf_reference",
        filename,
        pageCount: pdfPageCount.pageCount,
        fileSize: stats.size,
        displayPath: relative(getCwd(), filename),
        ...(effectivePageCount_2 && {
          wholeRefusedByModel: effectivePageCount_2,
        }),
        ...(modelReadsByPage && {
          modelReadsByPage,
        }),
      };
    }
  } catch {}
  return null;
}
//@ chunk-e6aww6q8.js:3370101-3373785 fingerprint (2.1.88 match: generateFileAttachment, 0.627)
/**
 * 生成单个文件的附件：权限检查后按类型产出 text/image/notebook/pdf/pdf_reference/compact_file_reference/already_read_file 等，支持 offset/limit。
 */
async function generateFileAttachment(
  filename,
  toolUseContext,
  successEventName,
  errorEventName,
  mode,
  options,
) {
  let { offset, limit } = options ?? {};
  if (isAttachmentReadDeniedOrThrown(filename, getToolPermissionContext(toolUseContext))) return null;
  let isReadRestricted = isInstructionReadRestricted(getToolPermissionContext(toolUseContext));
  let landingPaths = !isReadRestricted
    ? [filename]
    : (options?.landing ??
      (await readableInstructionSpellings(
        filename,
        {
          context: getToolPermissionContext(toolUseContext),
          isHeldOutside: isRestrictedReadBlocked,
        },
        toolUseContext.abortController.signal,
      )));
  if (landingPaths === undefined) return null;
  if (
    isReadRestricted &&
    options?.landing !== undefined &&
    isInstructionPathRefused(options.landing, {
      context: getToolPermissionContext(toolUseContext),
      isHeldOutside: isRestrictedReadBlocked,
    })
  )
    return null;
  let landing = landingPaths;
  if (mode === "at-mention" && isDocumentExtension(parse(filename).ext) && isInboundFileArriving(filename)) {
    logEvent("tengu_pdf_reference_attachment", {
      stillArriving: true,
    });
    logEvent(successEventName, {});
    logAtMention({
      mentionType: "file",
      success: true,
    });
    return {
      type: "pdf_reference",
      filename,
      displayPath: relative(getCwd(), filename),
      stillArriving: true,
    };
  }
  if (
    !isReadRestricted &&
    mode === "at-mention" &&
    !(await isFileWithinSizeBound(filename, getDefaultFileReadingLimits().maxSizeBytes))
  ) {
    let ext = parse(filename).ext.toLowerCase();
    if (!isDocumentExtension(ext))
      try {
        let stats = await getFsImplementation().stat(filename);
        logEvent("tengu_attachment_file_too_large", {
          size_bytes: stats.size,
          mode: fromEnum(mode),
        });
        options?.onTooLarge?.(stats.size);
        return null;
      } catch {}
  }
  if (!isReadRestricted && mode === "at-mention") {
    let pdfReference = await tryGetPDFReference(filename, toolUseContext.options.mainLoopModel);
    if (pdfReference) {
      logEvent(successEventName, {});
      logAtMention({
        mentionType: "file",
        success: true,
      });
      return pdfReference;
    }
  }
  let probedModified;
  if (isReadRestricted && mode === "at-mention" && options?.sizeProbe !== "none") {
    let probe = await readPinnedFile(
      filename,
      landing,
      toolUseContext.abortController.signal,
    )(async (pinned, stats) => ({
      size: Number(stats.size),
      modified: Number(stats.mtimeMs),
      pdfRef: await tryGetPDFReference(filename, toolUseContext.options.mainLoopModel, {
        ioPath: pinned.ioPath,
        size: Number(stats.size),
        handle: pinned.handle,
        signal: toolUseContext.abortController.signal,
      }),
    }));
    probedModified = probe?.modified;
    if (
      probe !== undefined &&
      probe.size > getDefaultFileReadingLimits().maxSizeBytes &&
      !isDocumentExtension(parse(filename).ext.toLowerCase())
    ) {
      logEvent("tengu_attachment_file_too_large", {
        size_bytes: probe.size,
        mode: fromEnum(mode),
      });
      options?.onTooLarge?.(probe.size);
      return null;
    }
    if (probe?.pdfRef) {
      logEvent(successEventName, {});
      logAtMention({
        mentionType: "file",
        success: true,
      });
      return probe.pdfRef;
    }
  }
  let existingFileState = toolUseContext.readFileState.get(filename);
  let clearedAfterIdle =
    existingFileState !== undefined &&
    mode === "at-mention" &&
    hasClearedToolResultsAfterIdle(
      toolUseContext.messages,
      toolUseContext.options.mainLoopModel,
      new Date().toISOString(),
      toolUseContext.session,
    );
  if (existingFileState && mode === "at-mention") {
    let canReuseRead =
      hasFullFileContent(existingFileState) &&
      (existingFileState.content !== "" || (existingFileState.contentLength ?? 0) === 0) &&
      !clearedAfterIdle;
    try {
      if (
        canReuseRead &&
        (isReadRestricted ? probedModified : await getFileModificationTimeAsync(filename)) ===
          existingFileState.timestamp
      ) {
        logEvent(successEventName, {});
        if (mode === "at-mention")
          logAtMention({
            mentionType: "file",
            success: true,
          });
        return {
          type: "already_read_file",
          filename,
          displayPath: relative(getCwd(), filename),
          content: {
            type: "text",
            file: {
              filePath: filename,
              content: existingFileState.content,
              numLines:
                countCharInString(
                  existingFileState.content,
                  `
`,
                ) + 1,
              startLine: offset ?? 1,
              totalLines:
                countCharInString(
                  existingFileState.content,
                  `
`,
                ) + 1,
            },
          },
        };
      }
    } catch {}
  }
  try {
    let fileInput = {
      file_path: filename,
      offset,
      limit,
    };
    async function readTruncatedFile() {
      if (mode === "compact")
        return {
          type: "compact_file_reference",
          filename,
          displayPath: relative(getCwd(), filename),
        };
      if (isAttachmentReadDeniedOrThrown(filename, getToolPermissionContext(toolUseContext))) return null;
      try {
        let truncatedInput = {
          file_path: filename,
          offset: offset ?? 1,
          limit: MAX_LINES_TO_READ,
        };
        let readContext = clearedAfterIdle
          ? {
              ...toolUseContext,
              dedupUnchangedReads: false,
            }
          : toolUseContext;
        let result = await FileReadTool.call(
          truncatedInput,
          isReadRestricted ? await stashAttachedReadPermission(filename, landing, readContext) : readContext,
        );
        recordToolUsed(FileReadTool.name);
        logEvent(successEventName, {});
        if (mode === "at-mention")
          logAtMention({
            mentionType: "file",
            success: true,
          });
        return {
          type: "file",
          filename,
          content: result.data,
          truncated: true,
          displayPath: relative(getCwd(), filename),
        };
      } catch (error) {
        if (isReadRestricted && error instanceof SymlinkReadRefusedError) options?.onRefusedAtOpen?.();
        logEvent(errorEventName, {});
        if (mode === "at-mention")
          logAtMention({
            mentionType: "file",
            success: false,
          });
        return null;
      }
    }
    if (!(await FileReadTool.validateInput(fileInput, toolUseContext)).result) return null;
    let pdfController =
      options?.pdfAbortParent !== undefined && isImageOrPdfExtension(filename)
        ? createChildAbortController(options.pdfAbortParent)
        : undefined;
    try {
      let readContext = clearedAfterIdle
        ? {
            ...toolUseContext,
            dedupUnchangedReads: false,
          }
        : toolUseContext;
      let readResult = await FileReadTool.call(
        fileInput,
        isReadRestricted ? await stashAttachedReadPermission(filename, landing, readContext) : readContext,
        undefined,
        undefined,
        undefined,
        {
          pdfRenderSignal: pdfController?.signal,
        },
      );
      recordToolUsed(FileReadTool.name);
      if (readResult.data.type === "file_unchanged") {
        logEvent(successEventName, {});
        if (mode === "at-mention")
          logAtMention({
            mentionType: "file",
            success: true,
          });
        return {
          type: "already_read_file",
          filename,
          displayPath: relative(getCwd(), filename),
          content: readResult.data,
        };
      }
      if (readResult.data.type === "text" && readResult.data.file.truncatedByTokenCap === true)
        return await readTruncatedFile();
      logEvent(successEventName, {});
      if (mode === "at-mention")
        logAtMention({
          mentionType: "file",
          success: true,
        });
      return {
        type: "file",
        filename,
        content:
          readResult.data.type === "pdf"
            ? {
                ...readResult.data,
                file: {
                  ...readResult.data.file,
                  base64: "",
                },
              }
            : readResult.data,
        displayPath: relative(getCwd(), filename),
      };
    } catch (error) {
      if (
        error instanceof MaxFileReadTokenExceededError ||
        error instanceof FileTooLargeError ||
        error instanceof SelectedRangeTooLargeError
      )
        return await readTruncatedFile();
      if (pdfController?.signal.aborted && error instanceof AbortError_2) return null;
      throw error;
    } finally {
      pdfController?.abort();
    }
  } catch (error) {
    if (isReadRestricted && error instanceof SymlinkReadRefusedError) options?.onRefusedAtOpen?.();
    logEvent(errorEventName, {});
    if (mode === "at-mention")
      logAtMention({
        mentionType: "file",
        success: false,
      });
    return null;
  }
}
//@ chunk-e6aww6q8.js:3374007-3374459 fingerprint (2.1.88 match: getTodoReminderTurnCounts, 1)
/**
 * 统计距上次 TodoWrite 与上次 todo_reminder 的助手轮数。
 */
function getTodoReminderTurnCounts(messages) {
  let lastTodoWriteIndex = -1;
  let lastReminderIndex = -1;
  let assistantTurnsSinceWrite = 0;
  let assistantTurnsSinceReminder = 0;
  for (let i = messages.length - 1; i >= 0; i--) {
    let message = messages[i];
    if (message?.type === "assistant") {
      if (isThinkingOnlyMessage(message)) continue;
      if (
        lastTodoWriteIndex === -1 &&
        "message" in message &&
        Array.isArray(message.message?.content) &&
        message.message.content.some((block) => block.type === "tool_use" && block.name === "TodoWrite")
      )
        lastTodoWriteIndex = i;
      if (lastTodoWriteIndex === -1) assistantTurnsSinceWrite++;
      if (lastReminderIndex === -1) assistantTurnsSinceReminder++;
    } else if (
      lastReminderIndex === -1 &&
      message?.type === "attachment" &&
      message.attachment.type === "todo_reminder"
    )
      lastReminderIndex = i;
    if (lastTodoWriteIndex !== -1 && lastReminderIndex !== -1) break;
  }
  return {
    turnsSinceLastTodoWrite: assistantTurnsSinceWrite,
    turnsSinceLastReminder: assistantTurnsSinceReminder,
  };
}
//@ chunk-e6aww6q8.js:3374608-3375014 fingerprint (2.1.88 match: getTodoReminderAttachments, 0.943)
/**
 * 有 TodoWrite 工具、提醒模式非 off、距上次写与上次提醒都 ≥10 轮时产出 todo_reminder（当前待办内容）。
 */
async function getTodoReminderAttachments(messages, toolUseContext) {
  if (!toolUseContext.options.tools.some((t) => toolMatchesName(t, TODO_WRITE_TOOL_NAME))) return [];
  if (isBriefToolActive(toolUseContext.options.tools)) return [];
  if (!messages || messages.length === 0) return [];
  if (getTodoReminderMode() === "off") return [];
  let { turnsSinceLastTodoWrite, turnsSinceLastReminder } = getTodoReminderTurnCounts(messages);
  if (
    turnsSinceLastTodoWrite >= TODO_REMINDER_CONFIG.TURNS_SINCE_WRITE &&
    turnsSinceLastReminder >= TODO_REMINDER_CONFIG.TURNS_BETWEEN_REMINDERS
  ) {
    let todoKey = toolUseContext.agentId ?? getSessionId();
    let todoItems = toolUseContext.getAppState().todos[todoKey] ?? [];
    return [
      {
        type: "todo_reminder",
        content: todoItems,
        itemCount: todoItems.length,
      },
    ];
  }
  return [];
}
//@ chunk-e6aww6q8.js:3375014-3375477 fingerprint (2.1.88 match: getTaskReminderTurnCounts, 1)
/**
 * 统计距上次任务管理工具调用与上次 task_reminder 的助手轮数。
 */
function getTaskReminderTurnCounts(messages) {
  let lastTaskManagementIndex = -1;
  let lastReminderIndex = -1;
  let assistantTurnsSinceTaskManagement = 0;
  let assistantTurnsSinceReminder = 0;
  for (let i = messages.length - 1; i >= 0; i--) {
    let message = messages[i];
    if (message?.type === "assistant") {
      if (isThinkingOnlyMessage(message)) continue;
      if (
        lastTaskManagementIndex === -1 &&
        "message" in message &&
        Array.isArray(message.message?.content) &&
        message.message.content.some(
          (block) =>
            block.type === "tool_use" &&
            (block.name === TASK_CREATE_TOOL_NAME || block.name === TASK_UPDATE_TOOL_NAME),
        )
      )
        lastTaskManagementIndex = i;
      if (lastTaskManagementIndex === -1) assistantTurnsSinceTaskManagement++;
      if (lastReminderIndex === -1) assistantTurnsSinceReminder++;
    } else if (
      lastReminderIndex === -1 &&
      message?.type === "attachment" &&
      message.attachment.type === "task_reminder"
    )
      lastReminderIndex = i;
    if (lastTaskManagementIndex !== -1 && lastReminderIndex !== -1) break;
  }
  return {
    turnsSinceLastTaskManagement: assistantTurnsSinceTaskManagement,
    turnsSinceLastReminder: assistantTurnsSinceReminder,
  };
}
//@ chunk-e6aww6q8.js:3375477-3375851 fingerprint (2.1.88 match: getTaskReminderAttachments, 0.791)
/**
 * 任务工具（新任务系统）版提醒 → task_reminder，条件同 todo。
 */
async function getTaskReminderAttachments(messages, tools, storageV5) {
  if (!isTaskToolsEnabled()) return [];
  if (!tools.some((t) => toolMatchesName(t, TASK_UPDATE_TOOL_NAME))) return [];
  if (isBriefToolActive(tools)) return [];
  if (!messages || messages.length === 0) return [];
  if (getTodoReminderMode() === "off") return [];
  let { turnsSinceLastTaskManagement, turnsSinceLastReminder } = getTaskReminderTurnCounts(messages);
  if (
    turnsSinceLastTaskManagement >= TODO_REMINDER_CONFIG.TURNS_SINCE_WRITE &&
    turnsSinceLastReminder >= TODO_REMINDER_CONFIG.TURNS_BETWEEN_REMINDERS
  ) {
    let tasks = await listTasks(getTaskListId(), storageV5);
    return [
      {
        type: "task_reminder",
        content: tasks,
        itemCount: tasks.length,
      },
    ];
  }
  return [];
}
//@ chunk-e6aww6q8.js:3375851-3376308 layout
/**
 * 统计距上次 ToolSearch 调用与上次 tool_search_usage_reminder 的轮数。
 */
function getToolSearchReminderTurnCounts(messages) {
  let lastToolSearchIndex = -1;
  let lastReminderIndex = -1;
  let turnsSinceLastToolSearch = 0;
  let turnsSinceLastReminder = 0;
  for (let idx = messages.length - 1; idx >= 0; idx--) {
    let message = messages[idx];
    if (message?.type === "assistant") {
      if (isThinkingOnlyMessage(message)) continue;
      if (
        lastToolSearchIndex === -1 &&
        "message" in message &&
        Array.isArray(message.message?.content) &&
        message.message.content.some(
          (block) => block.type === "tool_use" && block.name === TOOL_SEARCH_TOOL_NAME,
        )
      )
        lastToolSearchIndex = idx;
      if (lastToolSearchIndex === -1) turnsSinceLastToolSearch++;
      if (lastReminderIndex === -1) turnsSinceLastReminder++;
    } else if (
      lastReminderIndex === -1 &&
      message?.type === "attachment" &&
      message.attachment.type === "tool_search_usage_reminder"
    )
      lastReminderIndex = idx;
    if (lastToolSearchIndex !== -1 && lastReminderIndex !== -1) break;
  }
  return {
    turnsSinceLastToolSearch,
    turnsSinceLastReminder,
  };
}
//@ chunk-e6aww6q8.js:3376308-3377501 layout
/**
 * 实验配置开启时每 N 轮提醒使用 ToolSearch（tool_search_usage_reminder），不满足条件记 tengu_juniper_shoal_shown。
 */
async function getToolSearchUsageReminderAttachment(
  messages,
  toolUseContext,
  hasTaskReminderThisTurn,
  declaredToolSource,
) {
  let reminderConfig = toolSearchReminderConfig();
  if (reminderConfig === null) return [];
  if (!messages || messages.length === 0) return [];
  let { turnsSinceLastToolSearch, turnsSinceLastReminder } = getToolSearchReminderTurnCounts(messages);
  if (
    turnsSinceLastToolSearch < reminderConfig.everyNTurns ||
    turnsSinceLastReminder < reminderConfig.everyNTurns
  )
    return [];
  let skipWithTelemetry = (reason) => {
    if (turnsSinceLastReminder % reminderConfig.everyNTurns === 0)
      logEvent("tengu_juniper_shoal_shown", {
        delivered: false,
        skipReason: fromEnum(reason),
        everyNTurns: reminderConfig.everyNTurns,
        turnsSinceLastReminder,
      });
    return [];
  };
  if (getToolSearchMode() !== "tst") return skipWithTelemetry("mode_not_tst");
  if (!modelSupportsToolReference(toolUseContext.options.mainLoopModel))
    return skipWithTelemetry("model_unsupported");
  if (isVertexModelWithoutToolSearch(getCanonicalName(toolUseContext.options.mainLoopModel)))
    return skipWithTelemetry("vertex_model_unsupported");
  if (
    !isToolSearchToolAvailable(toolUseContext.options.tools) ||
    toolSearchRejectedOn(toolUseContext.stickyBetas ?? getStickyBetas(), toolUseContext.options.mainLoopModel)
  )
    return skipWithTelemetry("toolsearch_unavailable");
  let discoveredToolNames = extractDiscoveredToolNames(messages, {
    surfaced: getSurfacedToolNames(toolUseContext.stickyBetas ?? getStickyBetas()),
  });
  let sorted = toolUseContext.options.tools
    .filter(
      (tool) =>
        isDeferredToolInConversation(tool, declaredToolSource, toolUseContext.options.tools) &&
        !discoveredToolNames.has(tool.name),
    )
    .map((tool) => tool.name)
    .sort();
  if (sorted.length === 0) return skipWithTelemetry("no_undiscovered_tools");
  let taskReminderSameTurn = false;
  try {
    taskReminderSameTurn = await hasTaskReminderThisTurn();
  } catch {
    taskReminderSameTurn = false;
  }
  if (taskReminderSameTurn) return skipWithTelemetry("task_reminder_same_turn");
  logEvent("tengu_juniper_shoal_shown", {
    delivered: true,
    undiscoveredCount: sorted.length,
    listedCount: Math.min(sorted.length, reminderConfig.maxNames),
    everyNTurns: reminderConfig.everyNTurns,
    maxNames: reminderConfig.maxNames,
  });
  return [
    {
      type: "tool_search_usage_reminder",
      undiscoveredToolNames: sorted.slice(0, reminderConfig.maxNames),
      undiscoveredCount: sorted.length,
    },
  ];
}
//@ chunk-e6aww6q8.js:3377501-3377849 fingerprint (2.1.88 match: getUnifiedTaskAttachments, 0.833)
/**
 * 后台任务状态变化 → task_status 附件（状态、描述、增量摘要、输出文件路径）。
 */
async function getUnifiedTaskAttachments(tools, appState) {
  let { attachments, updatedTaskOffsets, evictedTaskIds } = await generateTaskAttachments(appState.all());
  appState.applyOffsetsAndEvict(updatedTaskOffsets, evictedTaskIds);
  let canContinueAgent = hasSendMessageTool(tools);
  return attachments.map((taskAttachment) => ({
    type: "task_status",
    taskId: taskAttachment.taskId,
    taskType: taskAttachment.taskType,
    status: taskAttachment.status,
    description: taskAttachment.description,
    deltaSummary: taskAttachment.deltaSummary,
    outputFilePath: willToolsLoseSessionState(tools) ? getTaskOutputPath(taskAttachment.taskId) : undefined,
    canContinueAgent,
  }));
}
//@ chunk-e6aww6q8.js:3377849-3378450 layout
/**
 * 未保存同步与待处理的记忆更新 → memory_update 附件，并清空 pendingMemoryUpdates。
 */
function getMemoryUpdateAttachments(toolUseContext, messages = []) {
  let mapped = pendingMemorySkillQueue
    .of(toolUseContext.session.host)
    .drain()
    .map((summary) => ({
      type: "memory_update",
      source: "sync_unsaved",
      summary,
      paths: [],
      inContextPaths: [],
    }));
  let pendingMemoryUpdates = toolUseContext.getAppState().pendingMemoryUpdates;
  if (pendingMemoryUpdates.length === 0) return mapped;
  let autoMemEntrypoint =
    isAutoMemoryEnabled() && process.env.CLAUDE_COWORK_MEMORY_INDEX_CONTENT !== ""
      ? getAutoMemEntrypoint()
      : null;
  let normalizedMessages = messagesSinceCompactBoundary(messages);
  let announcedFiles = latestInstructionFiles(normalizedMessages);
  let nestedMemoryContents = collectNestedMemoryContents(normalizedMessages);
  let isInContext = (path) =>
    path === autoMemEntrypoint ||
    toolUseContext.readFileState.has(path) ||
    announcedFiles?.has(path) === true ||
    nestedMemoryContents.has(path);
  toolUseContext.setAppState((prevState) =>
    prevState.pendingMemoryUpdates.length === 0
      ? prevState
      : {
          ...prevState,
          pendingMemoryUpdates: [],
        },
  );
  return mapped.concat(
    pendingMemoryUpdates.map((pendingMemoryUpdate) => ({
      type: "memory_update",
      source: pendingMemoryUpdate.source,
      summary: pendingMemoryUpdate.summary,
      paths: pendingMemoryUpdate.paths,
      inContextPaths: pendingMemoryUpdate.paths.filter(isInContext),
    })),
  );
}
//@ chunk-e6aww6q8.js:3378450-3379394 fingerprint (2.1.88 match: getAsyncHookResponseAttachments, 0.774)
/**
 * 已完成的异步钩子响应 → async_hook_response 系列附件（SessionStart 重复输出跳过）。
 */
async function getAsyncHookResponseAttachments(messages) {
  let responses = await checkForNewAsyncHookResponses();
  if (responses.length === 0) return [];
  logForDebugging(`Hooks: getAsyncHookResponseAttachments found ${responses.length} responses`);
  let priorAttachments = responses.some((response) => response.hookEvent === "SessionStart")
    ? messagesSinceCompactBoundary(messages).flatMap((message) =>
        message?.type === "attachment" ? [message.attachment] : [],
      )
    : [];
  let attachments = [];
  for (let {
    processId,
    response,
    hookName,
    hookEvent,
    toolName,
    pluginId,
    command,
    stdout,
    stderr,
    exitCode,
  } of responses) {
    emitHookMetrics(response.metrics, pluginId, hookEvent);
    if (
      hookEvent === "SessionStart" &&
      isAsyncHookResponseDuplicate(
        {
          response,
          command,
          pluginId,
        },
        priorAttachments,
      )
    ) {
      logForDebugging(
        `Hooks: Not adding the output of ${processId} (${hookName}) to the conversation: Claude already sees the same text from an earlier SessionStart run`,
      );
      continue;
    }
    logForDebugging(`Hooks: Creating attachment for ${processId} (${hookName}): ${jsonStringify(response)}`);
    let attachment = {
      type: "async_hook_response",
      processId,
      hookName,
      hookEvent,
      toolName,
      ...(hookEvent === "SessionStart" && {
        command,
        pluginId,
      }),
      response: stripMetricsForMcpInbound(response),
      stdout,
      stderr,
      exitCode,
    };
    attachments.push(attachment);
    priorAttachments.push(attachment);
  }
  logForDebugging(`Hooks: getAsyncHookResponseAttachments found ${attachments.length} attachments`);
  return attachments;
}
//@ chunk-e6aww6q8.js:3379394-3379803 file-local
/**
 * 把已附加的非结构化邮箱消息标记为已读（失败则下轮再附加）。旧版名 getTeammateMailboxAttachments 不准确。
 */
async function markMailboxMessagesRead(agentName, teamName, messages, store) {
  if (messages.length === 0) return;
  let pendingIds = new Set(messages.map(messageIdentityKey));
  let marked = await markMessagesAsReadByPredicate(
    agentName,
    (storedMessage) => pendingIds.has(messageIdentityKey(storedMessage)),
    teamName,
    store,
  );
  logForDebugging(
    marked
      ? `[MailboxBridge] marked ${messages.length} non-structured message(s) as read for agent="${agentName}" team="${teamName || "default"}"`
      : `[MailboxBridge] could not mark ${messages.length} non-structured message(s) read for agent="${agentName}" team="${teamName || "default"}"; they will be attached again next turn`,
    {
      level: marked ? "debug" : "warn",
    },
  );
}
//@ chunk-e6aww6q8.js:3379803-3379852 layout
/**
 * 316 里恒返回空（邮箱消息改走别处）。
 */
async function getTeammateMailboxAttachments(toolUseContext) {
  if (!isAgentSwarmsEnabled()) return [];
  return [];
}
//@ chunk-e6aww6q8.js:3379852-3380299 fingerprint (2.1.88 match: getTeamContextAttachment, 0.901)
/**
 * 代理团队成员首轮产出 team_context（团队名、配置与任务列表路径、是否有任务工具）。
 */
function getTeamContextAttachment(messages) {
  let teamName = getTeamName();
  let agentId = getAgentId();
  let agentName = getAgentName();
  if (!teamName || !agentId) return [];
  if (messages.some((m) => m.type === "assistant")) return [];
  let hasTaskListTools;
  let configDir = getTeammateContext();
  if (configDir) {
    for (let message of messages)
      if (message.type === "attachment" && message.attachment.type === "team_context") {
        hasTaskListTools = message.attachment.hasTaskListTools;
        break;
      }
    hasTaskListTools ??= configDir.hasTaskListTools;
  }
  let configDir_2 = getClaudeConfigDir();
  let teamConfigPath = `${configDir_2}/teams/${teamName}/config.json`;
  let taskListPath = `${configDir_2}/tasks/${getTaskListId()}/`;
  return [
    {
      type: "team_context",
      agentId,
      agentName: agentName || agentId,
      teamName,
      teamConfigPath,
      taskListPath,
      hasTaskListTools,
    },
  ];
}
//@ chunk-e6aww6q8.js:3380299-3380461 fingerprint (2.1.88 match: getTokenUsageAttachment, 1)
/**
 * CLAUDE_CODE_ENABLE_TOKEN_USAGE_ATTACHMENT 时产出 token_usage（已用/总量/剩余）。
 */
function getTokenUsageAttachment(messages, model, autoCompactWindow) {
  if (!env.CLAUDE_CODE_ENABLE_TOKEN_USAGE_ATTACHMENT) return [];
  let contextWindow = effectiveContextWindow(getModelContextInfo(model), autoCompactWindow);
  let usedTokens = tokenCountFromLastAPIResponse(messages);
  return [
    {
      type: "token_usage",
      used: usedTokens,
      total: contextWindow,
      remaining: contextWindow - usedTokens,
    },
  ];
}
//@ chunk-e6aww6q8.js:3380461-3380786 layout
/**
 * total_tokens_reminder：按模式（countdown/padded-countdown/fixed/infinite）输出 "<total_tokens>N tokens left</total_tokens>"。
 */
function getTotalTokensReminderAttachment(
  session,
  usage,
  model,
  agentId,
  reanchor,
  totalTokensReminderBudget,
  excludeStart,
) {
  let mode = getTotalTokensReminderMode(model, totalTokensReminderBudget);
  if (mode === "off") return [];
  let budgetKey = agentId ?? "main";
  let currentTokens = tokenCountFromLastAPIResponse(usage);
  let budgetState = totalTokensReminderByRoot.of(session);
  if (reanchor) budgetState.reanchorTaskBudget(budgetKey, currentTokens);
  if (totalTokensReminderBudget !== undefined && excludeStart)
    budgetState.excludeStartContext(budgetKey, () => getMinInputTokensSinceLastCompact(usage));
  let remainingTokens =
    mode === "countdown"
      ? getContextWindow(model, getSdkBetas()) - currentTokens
      : mode === "padded-countdown"
        ? budgetState.remaining(
            budgetKey,
            currentTokens,
            totalTokensReminderBudget ?? getTotalTokensReminderBudget(),
          )
        : 0;
  return [
    {
      type: "total_tokens_reminder",
      text: formatTotalTokensTag(mode, remainingTokens),
    },
  ];
}
//@ chunk-e6aww6q8.js:3380786-3381047 layout (2.1.88 match: getTokenCountFromUsage, 0.754)
/**
 * 最近一次压缩边界之后各回答 usage 的输入 token（首个与最后一个中较小者）。
 */
function getMinInputTokensSinceLastCompact(usage) {
  let startIndex = usage.findLastIndex(isForkBoilerplateMessage) + 1;
  let firstTotal;
  let lastTotal;
  for (let index = startIndex; index < usage.length; index++) {
    let tokenUsage = getTokenUsage(usage[index]);
    if (!tokenUsage) continue;
    let tokenCountFromUsage = getTokenCountFromUsage_5(tokenUsage);
    let totalTokens =
      tokenCountFromUsage.input_tokens +
      tokenCountFromUsage.cache_creation_input_tokens +
      tokenCountFromUsage.cache_read_input_tokens;
    if (totalTokens > 0) {
      firstTotal ??= totalTokens;
      lastTotal = totalTokens;
    }
  }
  return firstTotal === undefined || lastTotal === undefined ? undefined : Math.min(firstTotal, lastTotal);
}
//@ chunk-e6aww6q8.js:3381047-3381159 fingerprint (2.1.88 match: getMaxBudgetUsdAttachment, 1)
/**
 * 设置了 --max-budget-usd 时产出 budget_usd（已用/总额/剩余美元）。
 */
function getMaxBudgetUsdAttachment(maxBudgetUsd) {
  if (maxBudgetUsd === undefined) return [];
  let usedCost = getSessionCostUSD();
  let remainingBudget = maxBudgetUsd - usedCost;
  return [
    {
      type: "budget_usd",
      used: usedCost,
      total: maxBudgetUsd,
      remaining: remainingBudget,
    },
  ];
}
export {
  memoryHeader,
  mergeNameOnlyAnnouncements,
  getDeferredToolsDeltaAttachments,
  getDeclaredToolSource,
  buildDeferredToolsLatchContextFrom,
  getSkillListingAttachmentsLazy,
  getQueuedNotificationMode,
  getQueuedCommandAttachments,
  isAdditionalDirWithoutNestedMemory,
  startRelevantMemoryPrefetch,
  shouldBlockOnMemoryPrefetch,
  awaitMemoryPrefetch,
  filterDuplicateMemoryAttachments,
  isInlineNotificationMode,
  getAttachmentMessages,
  shouldIncludeMemoryFile,
  getRevokedDeferredToolNames,
  buildDeferredToolsLatchContext,
  buildToolRevocationClassifier,
  getAgentListingDeltaAttachment,
  areAttachmentsDisabled,
  getMcpInstructionsDeltaAttachment,
  getMcpDroppedToolsAttachment,
  generateFileAttachment,
  buildPlanModeAttachment,
  createAttachmentMessage,
  getMcpServerInstructionBlocks,
  maybe,
  getChangedFiles,
  buildHeldOutsideTracker,
  iterateMemoryFilesForPath,
};
