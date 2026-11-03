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
import { join, relative, dirname, resolve as resolve_2, parse, basename, isAbsolute, sep } from "path";
import { setImmediate as THo } from "timers/promises";
import { randomUUID } from "crypto";
import { stat, readdir, lstat } from "fs/promises";
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
import { Ji } from "../../vendor/lodash-es/uniqBy.js";
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
import { MAX_PDF_PAGES_PER_TURN } from "./truncateGraphemes.js";
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
import { buildGoalSentinelAttachment } from "../commands/goal/goal.js";

//@ chunk-e6aww6q8.js:117298-117385 fingerprint = memoryHeader (1)
/**
 * 记忆文件标题行："<相对时间> Memory: <路径>:"，无时间时 "Memory: <路径>:"；relevant_memories 附件与 normalizeAttachmentForAPI 共用。
 */
function memoryHeader(path, mtimeMs) {
  let staleness = memoryFreshnessText(mtimeMs);
  let s = singleLineMemoryText(path);
  return staleness
    ? `${staleness}

Memory: ${s}:`
    : `Memory: ${s}:`;
}
//@ chunk-e6aww6q8.js:195424-195506 fingerprint = INLINE_NOTIFICATION_MODES (1)
/**
 * origin.kind 为 task-notification 时返回 "task-notification"，否则 "prompt"。旧版名 INLINE_NOTIFICATION_MODES 为错配（那是常量集合 jxr）。
 */
function getQueuedNotificationMode(e) {
  return e?.kind === "task-notification" ? "task-notification" : "prompt";
}
//@ chunk-e6aww6q8.js:1327724-1327982 placement
/**
 * （误归 computerUse）判断目录项在读权限下是否应隐藏。
 */
async function isEntryHiddenByPermissions(entry, ctx, r) {
  let mapped = ctx.spellings.map((spelling) => join(spelling, entry.name));
  let [primaryPath] = mapped;
  if (primaryPath === undefined || ctx.isDenied(primaryPath, ctx.context)) return true;
  let filePath =
    !entry.isFile() && !entry.isDirectory() && isInstructionReadRestricted(ctx.context)
      ? await readableInstructionSpellings(primaryPath, ctx, r)
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
//@ chunk-e6aww6q8.js:1328056-1328376 placement = sanitizeAppNames (0.528)
/**
 * （误归 computerUse）过滤被拒绝的目录项，最多扫描 1 万、列出 1000，超出追加 "… and N more entries"。
 */
async function filterListableEntries(entries, ctx, signal) {
  let s = isInstructionReadRestricted(ctx.context);
  let names = [];
  let min = Math.min(entries.length, MAX_SCANNED_ENTRIES);
  let index = 0;
  while (index < min && names.length < MAX_LISTED_ENTRIES) {
    if (s && index > 0 && index % WALK_FLUSH_INTERVAL === 0) await THo();
    let entry = entries[index];
    let q = entry === undefined || (await isEntryHiddenByPermissions(entry, ctx, signal).catch(() => true));
    if (s && signal.aborted) break;
    index++;
    if (entry !== undefined && !q) names.push(entry.name);
  }
  return index < entries.length ? [...names, `\u2026 and ${entries.length - index} more entries`] : names;
}
//@ chunk-e6aww6q8.js:1351122-1351244 fingerprint = getNestedMemoryAttachmentsForFile (0.777)
/**
 * 记忆文件是否计入：tengu_paper_halyard 开时排除 Project/Local 类型，其余要求有内容。旧版名 getNestedMemoryAttachmentsForFile 为错配。
 */
function shouldIncludeMemoryFile(e) {
  if (
    (e.type === "Project" || e.type === "Local") &&
    getFeatureValue_CACHED_MAY_BE_STALE("tengu_paper_halyard", false)
  )
    return false;
  return Boolean(e.content);
}
//@ chunk-e6aww6q8.js:2305550-2305865 placement
/**
 * URL 是否为 https://mcp.slack.com（严格校验）。
 */
function isSlackMcpUrl(e) {
  if (typeof e !== "string" || /[^\u0021-\u007e]|[\\@]/.test(e)) return false;
  let lower = e.slice(0, 21).toLowerCase();
  let r = e.charAt(21);
  if (lower !== "https://mcp.slack.com" || (r !== "" && r !== "/" && r !== "?" && r !== "#")) return false;
  try {
    let s = new URL(e);
    return s.origin === "https://mcp.slack.com" && !s.pathname.startsWith("//");
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
//@ chunk-e6aww6q8.js:2311297-2311501 placement = pinCacheEdits (0.707)
/**
 * MCP 服务器附加说明块：Slack MCP 的发帖提示，以及（未禁用时）computer-use 说明。旧版名 pinCacheEdits 为错配；属于 MCP 说明，归错文件。
 */
function getMcpServerInstructionBlocks(e) {
  let mapped = [
    ...new Set(
      e
        .filter((s) => {
          let url = getServerUrl_2(s.config);
          return url !== null && isSlackMcpUrl(unwrapCcrProxyUrl(url));
        })
        .map((s) => s.name),
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
//@ chunk-e6aww6q8.js:3310228-3310295 fingerprint = TODO_REMINDER_CONFIG (1)
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
//@ chunk-e6aww6q8.js:3310443-3310552 fingerprint = PLAN_MODE_ATTACHMENT_CONFIG (0.8)
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
function toPositiveInt(e) {
  if (typeof e !== "number" || !Number.isFinite(e)) return;
  return Math.max(1, Math.floor(e));
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
//@ chunk-e6aww6q8.js:3310891-3310925 fingerprint = RELEVANT_MEMORIES_CONFIG (1)
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
function areAttachmentsDisabled(e) {
  return Boolean(env.CLAUDE_CODE_DISABLE_ATTACHMENTS || env.CLAUDE_CODE_SIMPLE || e.options.bareFork);
}
//@ chunk-e6aww6q8.js:3311033-3319176 fingerprint = getAttachments (0.511)
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
      let betas = options?.conversationLatches ?? stickyBetasForRequest(toolUseContext);
      if (betas !== undefined && !betas.declaredToolsDecided) {
        seedWireShapeFromRecord(
          betas,
          snapshotIfEnabled(messages, toolUseContext.options)?.wireShape,
          toolUseContext.options.mainLoopModel,
        );
        let pn = recordedDeferredTools(normalizedMessages);
        mergeNameOnlyAnnouncements(betas, pn);
        seedDeferredToolReferences(normalizedMessages, [...pn.entries.values()], {
          strippedReferences: pn.strippedReferences,
        });
        if (pn.toolInputCopies.size > 0 && isEchoWireToolInputsEnabled(normalizedMessages))
          adoptWireToolInputCopies(normalizedMessages, pn.toolInputCopies);
      }
    } catch (error) {
      logError(error);
    }
  let toolPoolRefreshes = toolUseContext.options.refreshTools !== undefined;
  let modelImageLimits = imageLimitsForModel(toolUseContext.options.mainLoopModel);
  let ke = toolUseContext.messageQueue.countRemainingWakePollEventsAfter(queuedCommands);
  if (areAttachmentsDisabled(toolUseContext)) {
    if (options?.inputMentionsOnly) return [];
    let queuedCommandAttachments = await getQueuedCommandAttachments(queuedCommands, modelImageLimits, ke, {
      tools: toolUseContext.options.tools,
      messages: toolUseContext.messages,
    });
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
            ? atMentionedFilesPromise.then((rn) =>
                getPeerMentionAttachments(options.preExpansionInput, toolUseContext, rn),
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
    let rn = await maybe("nested_memory", () => getNestedMemoryTriggerAttachments(timedContext));
    abortController?.mark("ambient_wait");
    clearTimeout(timeoutId);
    return [...userAttachmentResults.flat(), ...rn].filter((pn) => pn !== undefined && pn !== null);
  }
  let getTodoOrTaskReminders = (() => {
    let rn;
    return () =>
      (rn ??= todoToolsEnabled()
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
      getQueuedCommandAttachments(queuedCommands, modelImageLimits, ke, {
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
            let pn = true;
            let no = keptDeferredToolNames(normalizedMessages, tools, {
              keepMcp: true,
              surfacedOnWire: (toolUseContext.stickyBetas ?? getStickyBetas()).surfacedOnWire,
            });
            let hn = [];
            try {
              hn = hasDeclaredToolSet(declaredToolSource, tools, true);
            } catch (error) {
              logRetractionFailure(error);
              let yn = new Set(tools.map((tool) => tool.name));
              hn = declaredToolSource?.names.filter((Kn) => !yn.has(Kn)) ?? [];
            }
            return classifyRevokedTools(
              no === undefined && hn.length === 0 ? undefined : uniq([...(no ?? []), ...hn]),
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
                    (rn) => declaredToolSource.sourceFor(rn)?.mcpInfo?.serverName ?? [],
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
      let rn =
        (options?.isRegularUserPrompt ?? false) &&
        getTotalTokensReminderMode(toolUseContext.options.mainLoopModel, undefined) !== "off" &&
        shouldRemindAfterUserTurn();
      return Promise.resolve(
        (input === null && !options?.deliveredTurnStart) || rn
          ? getTotalTokensReminderAttachment(
              toolUseContext.session,
              messages ?? [],
              toolUseContext.options.mainLoopModel,
              toolUseContext.agentId,
              rn,
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
      (rn) => rn !== undefined && rn !== null,
    ),
  );
}
//@ chunk-e6aww6q8.js:3319176-3319423 layout
/**
 * 去掉 withheld_memory 里已作为 nested_memory 出现或重复的路径，条目为空则丢弃整条附件。
 */
function dedupeWithheldMemory(e) {
  let n = new Set(e.flatMap((r) => (r.type === "nested_memory" ? [r.path] : [])));
  return e.flatMap((r) => {
    if (r.type !== "withheld_memory") return [r];
    let filtered = r.entries.filter(({ path }) => !n.has(path) && n.add(path));
    return filtered.length === 0
      ? []
      : [
          {
            ...r,
            entries: filtered,
          },
        ];
  });
}
//@ chunk-e6aww6q8.js:3319423-3320109 fingerprint = maybe (0.706)
/**
 * maybe(label, fn)：运行一个附件生成器并计时；5% 采样记 tengu_attachment_compute_duration（大小、数量、是否出错）；出错时记日志并返回空数组，不影响其他附件。
 */
async function maybe(label, f) {
  let startTime = Date.now();
  let startTime_2 = performance.now();
  let attachmentTimingStore = getAttachmentTimingStore();
  attachmentTimingStore?.producerBegan();
  let y = Math.random() < 0.05;
  try {
    let result = await f();
    let duration = Date.now() - startTime;
    noteAttachmentProducer(label, startTime_2, attachmentTimingStore?.markedAt);
    if (y) {
      let attachmentSizeBytes = result
        .filter((G) => G !== undefined && G !== null)
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
    if (y)
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
//@ chunk-e6aww6q8.js:3320109-3320157 layout = INLINE_NOTIFICATION_MODES (1)
/**
 * 能作为队列命令附件送入的模式集合：prompt、task-notification。
 */
var INLINE_NOTIFICATION_MODES = new Set(["prompt", "task-notification"]);
//@ chunk-e6aww6q8.js:3320157-3320260 layout
/**
 * 队列命令自带 toolsUsed 且开关开启时，算出与对话里已用工具的差集 {toolsUsedDelta}。
 */
function getToolsUsedDelta(toolsUsed, n) {
  let r =
    toolsUsed === undefined || !isGlimmeringFinchGateOn() ? undefined : unreadableToolsUsed(toolsUsed, n);
  return r === undefined
    ? undefined
    : {
        toolsUsedDelta: r,
      };
}
//@ chunk-e6aww6q8.js:3320260-3320322 layout
/**
 * 开关关闭时把队列命令 toolsUsed 说明拼进提示词文本；开启时原样返回（改由 toolsUsedDelta 字段携带）。
 */
function appendToolsUsedNote(e, toolsUsed, r) {
  return toolsUsed === undefined || isGlimmeringFinchGateOn()
    ? e
    : joinWithNewlineIfAny(e, unreadableToolsLine(toolsUsed, r));
}
//@ chunk-e6aww6q8.js:3320322-3320361 layout
/**
 * 队列命令模式是否在 INLINE_NOTIFICATION_MODES 里。
 */
function isInlineNotificationMode(e) {
  return INLINE_NOTIFICATION_MODES.has(e.mode);
}
//@ chunk-e6aww6q8.js:3320361-3323197 layout
/**
 * 把消息队列里的 prompt/task-notification 命令转成 queued_command 附件（含图片块、粘贴内容、来源、uuid、delivery_id），前面加上 poll_events 附件；记录用户提交的提示词。2.1.88 同名函数的 316 版本。
 */
async function getQueuedCommandAttachments(commands, imageLimits, remainingWakePollEvents = 0, opts) {
  if (!commands) return [];
  let h = opts?.tools !== undefined && !hasSendMessageTool(opts.tools);
  let y = opts?.tools !== undefined && isMessagingLimitedToOwnAgents();
  let pollEventsAttachment = buildPollEventsAttachment(
    commands,
    remainingWakePollEvents,
    opts?.messages ?? [],
  );
  let filtered = commands.filter(isInlineNotificationMode);
  for (let L of filtered)
    if (
      L.mode === "prompt" &&
      !L.isMeta &&
      L.shouldQuery !== false &&
      L.textNotTyped !== true &&
      isHumanOrUnset(L.origin)
    )
      notifySetupGuidePasted(
        typeof L.value === "string"
          ? L.value
          : extractTextContent_2(
              L.value,
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
      let q = [];
      let Z = [];
      let text =
        command.isMeta === true && isAutoContinuationOrigin(command.origin)
          ? undefined
          : command.promptSubmitted?.text;
      let we = text === undefined ? command.value : replacePromptText(command.value, text);
      if (typeof we === "string") we = appendToolsUsedNote(we, command.toolsUsed, opts?.messages ?? []);
      try {
        if (typeof we !== "string")
          we = await Promise.all(
            we.map(async (Ie) =>
              Ie.type === "image" ? (await checkImageBlockSource(Ie, imageLimits)).block : Ie,
            ),
          );
        let pastedImageBlocks = await buildPastedImageBlocks(command.pastedContents, imageLimits);
        q = pastedImageBlocks.blocks;
        Z = pastedImageBlocks.ids;
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
      if (q.length > 0) {
        let text_2 =
          typeof we === "string"
            ? we
            : (text ??
              (typeof command.value === "string"
                ? command.value
                : extractTextContent_2(
                    command.value,
                    `
`,
                  )));
        we =
          text !== undefined && text.trim() === ""
            ? [...q]
            : [
                {
                  type: "text",
                  text: text_2,
                },
                ...q,
              ];
      }
      command.deliveryId ??= randomUUID();
      return {
        type: "queued_command",
        prompt: we,
        source_uuid: uuid,
        delivery_id: command.deliveryId,
        imagePasteIds: q.length > 0 ? Z : undefined,
        fileAttachments: command.fileAttachments,
        inlinedImagePaths: command.inlinedImagePaths,
        imageFileUuids: keepBridgeFileIds(command.imageFileUuids, command.value, we),
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
          (h || (y && command.origin.senderTaskId === undefined)) && {
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
            (typeof we === "string"
              ? we
              : extractTextContent_2(
                  we,
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
    .then((L) => (pollEventsAttachment ? [pollEventsAttachment, ...L] : L));
}
//@ chunk-e6aww6q8.js:3323197-3323716 layout
/**
 * 队列中的轮询事件（poll event）合并成一个 poll_events 附件：envelopes、kinds、toolsUsed、媒体、剩余唤醒数、来源等。
 */
function buildPollEventsAttachment(commands, remainingWakeCount, r) {
  let filtered = commands.filter(isPollEventMode);
  if (filtered.length === 0) return null;
  let declaredPollEvents = collectDeclaredPollEvents(filtered);
  let mapped = filtered.map((w) => w.pollEvent?.kind ?? "unknown");
  let S = mapped.every(mentionsSessionNoticeKind)
    ? []
    : listUnreadableToolsUsed(getConversationToolsUsed().names(), r);
  return {
    type: "poll_events",
    envelopes: filtered.map(getPollEventEnvelope),
    kinds: mapped,
    ...(S.length > 0 && {
      toolsUsed: S,
    }),
    ...(filtered.some((w) => w.pollEvent?.media !== undefined) && {
      media: filtered.map((w) => w.pollEvent?.media ?? []),
    }),
    remainingWakeCount,
    timestamp: filtered.at(-1)?.timestamp,
    provenance: filtered.map((w) => w.pollEvent?.provenance ?? null),
    ...(declaredPollEvents !== undefined && {
      declared: declaredPollEvents,
    }),
    ...{},
    ...(hasCrossSessionString(mapped) &&
      isVelvetyRippleOn() && {
        userRoleGuard: true,
      }),
    ...declaredRoundStamp(filtered),
  };
}
//@ chunk-e6aww6q8.js:3323716-3324119 layout
/**
 * 连续的已验证 Slack 人工轮次提示词合并：第一条带 batchedRelayPrompts，其余标记 renderedByBatchHead。
 */
function batchRelayedSlackPrompts(e) {
  let n = (s) =>
    s.verifiedSlackHumanTurn === true &&
    s.isMeta !== true &&
    isHumanOrUnset(s.origin) &&
    typeof s.prompt === "string" &&
    !s.inlinedImagePaths?.length &&
    !s.toolsUsedDelta?.length;
  let r = 0;
  while (r < e.length) {
    if (!n(e[r])) {
      r++;
      continue;
    }
    let s = r + 1;
    while (s < e.length && n(e[s])) s++;
    if (s - r >= 2) {
      let sliced = e.slice(r, s);
      sliced[0].batchedRelayPrompts = sliced.map((y) => y.prompt);
      for (let idx = 1; idx < sliced.length; idx++) sliced[idx].renderedByBatchHead = true;
    }
    r = s;
  }
  return e;
}
//@ chunk-e6aww6q8.js:3324119-3324744 layout
/**
 * 子代理待处理消息（来自主线程/同伴）转成 queued_command 附件；同伴来源时经过转发处理，缺 SendMessage 工具时标记 sendMessageToolAbsent。
 */
async function getAgentPendingMessageAttachments(agentId, taskRegistry, tools, messages = []) {
  if (!agentId) return [];
  let h = drainPendingMessages(agentId, taskRegistry);
  let y = [];
  for (let L of h) {
    let G = agentMessageOrigin(L.origin);
    if (G === undefined) {
      y.push(L);
      continue;
    }
    let q = await receiveAgentMessage(G, L.text, agentId);
    if (q.consumed === undefined)
      y.push(
        q.text === L.text
          ? L
          : {
              ...L,
              text: q.text,
              ...(L.origin?.kind === "peer" && {
                origin: stripPeerMessageBody(L.origin, q.text, L.text),
              }),
            },
      );
  }
  dropIfAnyMessages(y);
  let S = !hasSendMessageTool(tools);
  let w = mintedDeliveries(y.map((L) => L.forwarded));
  return y.flatMap((L, G) => [
    ...(w[G] ?? []),
    {
      type: "queued_command",
      prompt: appendToolsUsedNote(L.text, L.toolsUsed, messages),
      source_uuid: L.shownAs ?? randomUUID(),
      origin: L.origin,
      isMeta: L.isMeta,
      ...(S &&
        L.origin?.kind === "peer" && {
          sendMessageToolAbsent: true,
        }),
      ...forwardedTurnReminder({
        origin: L.origin,
        isMeta: L.isMeta,
      }),
      ...getToolsUsedDelta(L.toolsUsed, messages),
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
      filtered.map(async (h) => {
        let { block } = await maybeResizeAndDownsampleImageBlock({
          data: h.content,
          mediaType: h.mediaType,
          limits,
        });
        return block;
      }),
    ),
    ids: filtered.map((h) => h.id),
  };
}
//@ chunk-e6aww6q8.js:3325029-3325400 fingerprint = getPlanModeAttachmentTurnCount (0.9)
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
var USER_FACING_TOOL_NAMES = new Set([
  ASKUSERQUESTION,
  BRIEF_TOOL_NAME,
  LEGACY_BRIEF_TOOL_NAME,
  EXITPLANMODE,
  SEND_USER_FILE_TOOL_NAME,
]);
//@ chunk-e6aww6q8.js:3325497-3326453 file-local
/**
 * 统计静默轮：从最新往回数没有对用户输出（文本/可见思考/用户可见工具）的助手轮数、本段内已发 silent_turn_reminder 次数、静默开始时间。旧版名 getAutoModeAttachmentTurnCount 为错配。
 */
function getSilentTurnStats(messages) {
  let n = 0;
  let r = 0;
  let s;
  let h;
  let y;
  let S = false;
  let w;
  let L = () => {
    if (h === undefined) return false;
    if (S) {
      s ??= y;
      return true;
    }
    if (r === 0) n++;
    h = undefined;
    S = false;
    return false;
  };
  for (let idx = messages.length - 1; idx >= 0; idx--) {
    let message = messages[idx];
    if (message !== undefined && isVirtualConversationMessage(message)) continue;
    w = message?.timestamp;
    if (message?.type === "assistant") {
      let id = message.message.id;
      if (id !== h) {
        if (L())
          return {
            turnsSinceLastReminder: n,
            remindersInStretch: r,
            silentSince: s,
          };
        h = id;
        y = message.timestamp;
      }
      let content = message.message.content;
      if (
        Array.isArray(content) &&
        content.some(
          (ke) =>
            (ke.type === "text" && isMeaningfulText(ke.text)) ||
            (ke.type === "thinking" && hasNarrationThinking(ke)) ||
            (ke.type === "tool_use" && USER_FACING_TOOL_NAMES.has(ke.name)),
        )
      )
        S = true;
      continue;
    }
    if (L())
      return {
        turnsSinceLastReminder: n,
        remindersInStretch: r,
        silentSince: s,
      };
    if (message?.type === "attachment" && message.attachment.type === "silent_turn_reminder") {
      r++;
      s ??= message.timestamp;
      continue;
    }
    if (message?.type === "user" && !message.isMeta && !hasToolResultContent(message.message.content)) {
      s ??= message.timestamp;
      break;
    }
    if (
      message?.type === "user" &&
      message.isMeta &&
      !hasToolResultContent(message.message.content) &&
      !isTurnCompanion(message)
    )
      s ??= message.timestamp;
  }
  L();
  s ??= w;
  return {
    turnsSinceLastReminder: n,
    remindersInStretch: r,
    silentSince: s,
  };
}
//@ chunk-e6aww6q8.js:3326453-3326819 layout
/**
 * 静默轮达到阈值（轮数或秒数，按模型配置）时产出 silent_turn_reminder 附件。
 */
function getSilentTurnReminderAttachment(messages, mainLoopModel, r) {
  let { turnsSinceLastReminder, remindersInStretch, silentSince } = getSilentTurnStats(messages);
  let S = silentSince === undefined ? NaN : r - Date.parse(silentSince);
  let w = Number.isFinite(S) ? Math.floor(S / 1000) : undefined;
  let silentTurnReminderSeconds = getSilentTurnReminderSeconds(mainLoopModel);
  if (
    !(silentTurnReminderSeconds === undefined
      ? remindersInStretch < SILENT_TURN_REMINDER_MIN_GAP &&
        turnsSinceLastReminder >= cachedSilentTurnReminderTurns()
      : turnsSinceLastReminder >= 1 && w !== undefined && w >= silentTurnReminderSeconds)
  )
    return [];
  logFeatureOk("silent_turn_reminder", {
    turns: turnsSinceLastReminder,
    ...(w !== undefined && {
      silent_seconds: w,
    }),
  });
  return [
    {
      type: "silent_turn_reminder",
      text: getSilentTurnReminderText(),
    },
  ];
}
//@ chunk-e6aww6q8.js:3326819-3327007 fingerprint = countPlanModeAttachmentsSinceLastExit (1)
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
//@ chunk-e6aww6q8.js:3327007-3327339 layout = countPlanModeAttachmentsSinceLastExit (0.837)
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
function hasExitPlanModeTool(e) {
  return e.some((n) => toolMatchesName(n, EXITPLANMODE));
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
//@ chunk-e6aww6q8.js:3327508-3328319 fingerprint = getPlanModeAttachments (0.856)
/**
 * 计划模式（permission mode=plan）时产出 plan_mode 附件：首轮或每 5 轮一次，每 5 次一次完整版，其余精简；计划文件状态变化时立即重发；曾退出后重新进入时给 plan_mode_reentry。
 */
async function getPlanModeAttachments(e, messages, toolUseContext, options) {
  if (getToolPermissionContext(toolUseContext).mode !== "plan") return [];
  let lastPlanModeAttachmentInfo = getLastPlanModeAttachmentInfo(messages ?? []);
  let S =
    lastPlanModeAttachmentInfo !== null &&
    ((lastPlanModeAttachmentInfo.planFilePath === undefined) !== isDiskless() ||
      (isDiskless() &&
        (lastPlanModeAttachmentInfo.planGoesToExitTool === true) !==
          hasExitPlanModeTool(toolUseContext.options.tools)));
  if (messages && messages.length > 0 && !S) {
    let { turnCount, foundPlanModeAttachment } = getPlanModeAttachmentTurnCount(messages);
    if (foundPlanModeAttachment && turnCount < PLAN_MODE_ATTACHMENT_CONFIG.TURNS_BETWEEN_ATTACHMENTS)
      return [];
  }
  let L =
    (countPlanModeAttachmentsSinceLastExit(messages ?? []) + 1) %
      PLAN_MODE_ATTACHMENT_CONFIG.FULL_REMINDER_EVERY_N_ATTACHMENTS ===
    1;
  if (isDiskless())
    return [
      buildPlanModeAttachment(
        L || S ? "full" : "sparse",
        toolUseContext.agentId,
        toolUseContext.options.tools,
      ),
    ];
  if (isStorageV5Enabled() && toolUseContext.storageV5 !== undefined) await settlePlanFileCachePrime();
  getPlanSlug(getSessionId(), options?.planSlugSeed ?? e ?? undefined);
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
  let reminderType = S || L ? "full" : "sparse";
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
//@ chunk-e6aww6q8.js:3328319-3328611 fingerprint = getPlanModeExitAttachment (0.8)
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
//@ chunk-e6aww6q8.js:3328611-3328823 fingerprint = countAutoModeAttachmentsSinceLastExit (1)
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
//@ chunk-e6aww6q8.js:3328823-3329537 callgraph-fingerprint = getAutoModeAttachments (0.186)
/**
 * auto/bypassPermissions 模式下产出 auto_mode 附件（同意流程、bashFirst、steerOnly、finishExposedWork 等字段），已发过且状态未变则不重复。
 */
async function getAutoModeAttachments(messages, toolUseContext) {
  let toolPermissionContext = getToolPermissionContext(toolUseContext);
  let s = toolPermissionContext.mode === "bypassPermissions";
  if (toolPermissionContext.mode !== "auto" && !s) return [];
  let h = s || leanPromptFor(getPromptModel(toolUseContext.options.mainLoopModel));
  let tools = toolUseContext.options.tools;
  let S =
    tools.some((tool) => toolMatchesName(tool, BASH_TOOL_NAME)) &&
    tools.some(
      (tool) => toolMatchesName(tool, FILE_EDIT_TOOL_NAME) || toolMatchesName(tool, FILE_WRITE_TOOL_NAME),
    ) &&
    true &&
    true &&
    isThriftySonicEnabled();
  let w =
    !s &&
    toolUseContext.agentId === undefined &&
    !isTeammate() &&
    (!isProactivityActive() || toolUseContext.getProactivityLevel() === "default");
  if (h && !S && !w) return [];
  let lastAutoModeAttachment = getLastAutoModeAttachment(messages ?? []);
  let G =
    lastAutoModeAttachment?.steerOnly === true && lastAutoModeAttachment.bashFirst === false && h && S && !s;
  if (lastAutoModeAttachment && !(lastAutoModeAttachment.steerOnly && !h) && !G) return [];
  let reminderType = G
    ? lastAutoModeAttachment?.finishExposedWork === true
    : w && getFeatureValue_SESSION_PINNED("tengu_vivid_crown", false);
  if (h && !S && !reminderType) return [];
  return [
    {
      type: "auto_mode",
      autoModeConsentFlow: !s && isAutoModeConsentFlowEnabled(toolUseContext.agentId),
      finishExposedWork: reminderType,
      bashFirst: S,
      ...(S && {
        bashFirstSteer: lastAutoModeAttachment?.bashFirst
          ? (lastAutoModeAttachment.bashFirstSteer ?? "strict")
          : bashFirstSteerVariant(),
      }),
      steerOnly: h,
      bypass: s,
      ...false,
    },
  ];
}
//@ chunk-e6aww6q8.js:3329537-3329793 fingerprint = getAutoModeExitAttachment (0.507)
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
//@ chunk-e6aww6q8.js:3334304-3334413 fingerprint = getUltrathinkEffortAttachment (0.855)
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
  let r = isUltracodeActive(getUltracodeRequested(toolUseContext), toolUseContext.options.mainLoopModel);
  let s = "none";
  let h = 0;
  if (messages)
    for (let idx = messages.length - 1; idx >= 0; idx--) {
      let S = messages[idx];
      if (S === undefined) continue;
      if (S.type === "attachment") {
        if (S.attachment.type === "ultra_effort_enter") {
          s = "enter";
          break;
        }
        if (S.attachment.type === "ultra_effort_exit") {
          s = "exit";
          break;
        }
      } else if (S.type === "user" && !S.isMeta && !hasToolResultContent(S.message.content)) h++;
    }
  if (r) {
    if (s !== "enter") {
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
    if (h >= getUltraEffortReminderInterval()) {
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
  if (s === "enter") {
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
function inferDeclaredToolsFromHistory(betas, tools, context, s) {
  let nonDeferrableBuiltins = getNonDeferrableBuiltins();
  return computeDeclaredToolSet(
    betas,
    tools,
    (y) => isDeferredTool_2(y, nonDeferrableBuiltins),
    context,
    !s.some((y) => y.type === "assistant"),
  );
}
//@ chunk-e6aww6q8.js:3335333-3335492 layout
/**
 * 由 toolUseContext 构造延迟工具增量所需的上下文 {latches, toolPoolRefreshes, byValue}。
 */
function buildDeferredToolsLatchContext(e, n, querySource) {
  return e === undefined
    ? undefined
    : {
        latches: e,
        toolPoolRefreshes: n.options.refreshTools !== undefined,
        byValue: buildToolListingRenderer(
          () => getToolPermissionContext(n),
          n.options.agentDefinitions,
          querySource,
        ),
      };
}
//@ chunk-e6aww6q8.js:3335492-3335577 layout
/**
 * 同上，参数直接给出（runAgent 用）。
 */
function buildDeferredToolsLatchContextFrom(latches, toolPoolRefreshes, r, agentDefinitions, querySource) {
  return {
    latches,
    toolPoolRefreshes,
    byValue: buildToolListingRenderer(() => r, agentDefinitions, querySource),
  };
}
//@ chunk-e6aww6q8.js:3335577-3335663 layout
/**
 * 把历史里只宣布名字的延迟工具并入会话门闩。
 */
function mergeNameOnlyAnnouncements(e, n) {
  for (let nameOnlyAnnouncement of n.nameOnlyAnnouncements) e.nameOnlyAnnouncements.add(nameOnlyAnnouncement);
}
//@ chunk-e6aww6q8.js:3335663-3335862 layout
/**
 * 生成工具描述渲染参数（权限上下文、代理列表、listed/deferred 放置）与 querySource。
 */
function buildToolListingRenderer(e, n, querySource) {
  return {
    render: {
      getToolPermissionContext: async () => e(),
      agents: n.activeAgents,
      allowedAgentTypes: n.allowedAgentTypes,
      enginePlacementOf: (s) => (isDeferredToolByEngine(s) ? "deferred" : "listed"),
    },
    querySource,
  };
}
//@ chunk-e6aww6q8.js:3335862-3336096 layout
/**
 * 取上次请求声明的工具（名字/服务器/条目），没有记录时推断。
 */
function getDeclaredToolSource(e, n, r, s, permissionContext) {
  try {
    return (
      resolveDeclaredToolSet(
        e,
        () => {
          let y = snapshotIfEnabled(n, r);
          return (
            y && {
              names: y.toolDescriptions.keys(),
              servers: y.toolServers,
              entries: y.toolEntries,
            }
          );
        },
        s,
        {
          latch: false,
          permissionContext,
        },
      ) ?? inferDeclaredToolsFromHistory(e, s, r.mainLoopModel, n)
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
  r,
  scanContext,
  pendingMcpServers,
  needsAuthMcpServers,
  failedMcpServers,
  w,
  heldInlineTools,
  G,
  departures,
  options = {},
) {
  let Se = false;
  if (G !== undefined)
    try {
      Se = shouldAnnounceDeferredTools(G.latches, model, {
        toolSearchToolFilteredOut: toolSearchToolFilteredOut(model, tools, G.latches),
        toolPoolRefreshes: G.toolPoolRefreshes,
        aheadOfRequest: true,
      });
    } catch (error) {
      logError(toError(error));
    }
  if (!Se) {
    if (!isToolSearchEnabledOptimistic()) return [];
    if (!modelSupportsToolReference(model)) return [];
    if (isVertexModelWithoutToolSearch(getCanonicalName(model))) return [];
    if (!isToolSearchToolAvailable(tools)) return [];
    if (
      toolSearchDeclaredIn(
        snapshotIfEnabled(messagesSinceCompactBoundary(r ?? []), options)?.toolDescriptions,
      ) === false
    )
      return [];
    if (G && toolSearchRejectedOn(G.latches, model)) return [];
  }
  let deferredToolsDelta = getDeferredToolsDelta(
    tools,
    r ?? [],
    scanContext,
    pendingMcpServers,
    needsAuthMcpServers,
    failedMcpServers,
    w?.(),
    heldInlineTools,
    Se && G !== undefined
      ? {
          nameOnlyAnnouncements: G.latches.nameOnlyAnnouncements,
        }
      : undefined,
    G?.latches.nameOnlyAnnouncements,
    departures,
  );
  if (
    deferredToolsDelta?.retractedTools?.some((retractedTool) => retractedTool.cause === "denied") &&
    getFeatureValue_CACHED_MAY_BE_STALE("tengu_composed_treehouse", false)
  )
    deferredToolsDelta.deniedLead = true;
  let we = deferredToolsDelta
    ? [
        {
          type: "deferred_tools_delta",
          ...deferredToolsDelta,
        },
      ]
    : [];
  if (G === undefined) return we;
  try {
    if (!canInlineToolAdditions(G.latches, model)) return we;
    let Ee = await computeByValueToolsDelta(deferredToolsDelta, tools, model, r ?? [], G);
    return Ee
      ? [
          {
            type: "deferred_tools_delta",
            ...Ee,
          },
        ]
      : [];
  } catch (error) {
    logError(toError(error));
    return we;
  }
}
//@ chunk-e6aww6q8.js:3336970-3338419 layout
/**
 * 按值内联声明的工具：比较当前描述与已声明描述，得出需要重新声明、移除的工具。
 */
async function computeByValueToolsDelta(deferredToolsDelta, getToolPermissionContext, model, s, h) {
  let { definedByValue, withdrawn } = findLatestDeferredToolsDelta(s, h.latches.nameOnlyAnnouncements);
  let w = (name) => definedByValue.has(name) && !withdrawn.has(name);
  let { render, querySource } = h.byValue;
  let q = (tools) => getToolListingHash(tools, getToolPermissionContext, render);
  let Z = new Map();
  for (let Je of deferredToolsDelta?.readdedNames ?? []) {
    let nt = definedByValue.get(Je);
    let found = getToolPermissionContext.find((yt) => toolMatchesName(yt, Je));
    if (!withdrawn.has(Je) || nt === undefined || found === undefined) continue;
    let Et = await q(found);
    Z.set(
      Je,
      Et === nt.listing
        ? {
            name: Je,
            listing: Et,
            sameAs: nt.definedIn,
          }
        : "afresh",
    );
  }
  let Se = new Set([...(deferredToolsDelta?.surfacedNames ?? []), ...Z.keys()]);
  let ke = new Set(deferredToolsDelta?.removedNames ?? []);
  let we = [];
  for (let Je of getToolPermissionContext)
    if (
      w(Je.name) &&
      !Se.has(Je.name) &&
      !ke.has(Je.name) &&
      (await q(Je)) !== definedByValue.get(Je.name)?.listing
    )
      we.push(Je);
  let filtered = [...ke].filter(w);
  if (deferredToolsDelta === null && we.length === 0) return null;
  let toolListingEntries = await buildToolListingEntries(
    getToolPermissionContext.filter(
      (Je) =>
        (Se.has(Je.name) && Z.get(Je.name) !== undefined ? Z.get(Je.name) === "afresh" : Se.has(Je.name)) ||
        we.includes(Je),
    ),
    getToolPermissionContext,
    model,
    render,
    querySource,
  );
  if (toolListingEntries === undefined) return deferredToolsDelta;
  let Ie = deferredToolsDelta ?? {
    addedNames: [],
    addedLines: [],
    removedNames: [],
    wireHiddenNames: [],
    readdedNames: [],
  };
  let filtered_2 = [...Z.values()].filter((Je) => Je !== "afresh");
  let sorted = [...toolListingEntries, ...filtered_2].sort((Je, nt) => Je.name.localeCompare(nt.name));
  let sorted_2 = we.map((Je) => Je.name).sort();
  let lt = {
    definitions: toolListingEntries.length - sorted_2.length,
    replacements: sorted_2.length,
    pointers: filtered_2.length,
    withdrawals: filtered.length,
  };
  if (Object.values(lt).some((Je) => Je > 0)) logEvent("tengu_inline_tools_announced", lt);
  return {
    ...Ie,
    ...(Se.size > 0 && {
      surfacedNames: [...Se].sort(),
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
function getRevokedDeferredToolNames(e, context) {
  let r;
  try {
    r = hasDeclaredToolSet(e, context.options.tools, true);
  } catch (error) {
    logRetractionFailure(error);
    return [];
  }
  if (r.length === 0) return [];
  let toolPermissionContext = getToolPermissionContext(context);
  return (
    classifyRevokedTools(r, context.options.mcpClients, toolPermissionContext, e)
      ?.revoked.filter(
        (h) =>
          h.cause !== "not_configured" &&
          h.cause !== "replaced" &&
          h.cause !== UNCLASSIFIED_2 &&
          !isToolDisallowedThisTurn(toolPermissionContext, {
            name: h.name,
            mcpInfo: e?.sourceFor(h.name)?.mcpInfo,
          }),
      )
      .map((h) => h.name) ?? []
  );
}
//@ chunk-e6aww6q8.js:3338745-3339051 layout
/**
 * 对一组工具名逐个判断撤回原因，返回 {revoked:[{name,cause}], causeCounts}。
 */
function classifyRevokedTools(e, mcpClients, toolPermissionContext, s) {
  if (e === undefined) return;
  try {
    let h = [];
    let y = {};
    let S;
    for (let w of e) {
      S ??= getDenyRuleIndex(toolPermissionContext);
      let L = describeToolAvailability(w, mcpClients, toolPermissionContext, s?.sourceFor(w), S);
      y[L.kind] = (y[L.kind] ?? 0) + 1;
      if (isPermanentUnavailability(L))
        h.push({
          name: w,
          cause: L.kind,
        });
    }
    return {
      revoked: h,
      causeCounts: y,
    };
  } catch (error) {
    logRetractionFailure(error);
    return {
      revoked: e.map((name) => ({
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
function buildToolRevocationClassifier(e) {
  let n;
  let r;
  return {
    causeKindOf: (s) => {
      try {
        n ??= getToolPermissionContext(e);
        r ??= getDenyRuleIndex(n);
        return describeToolAvailability(s, e.options.mcpClients, n, undefined, r).kind;
      } catch (error) {
        logRetractionFailure(error);
        return UNCLASSIFIED_2;
      }
    },
    holdWhileConnecting: isSortedOtterOn(),
    connectingServersOf: (s) => pendingServersForTool(s, e.options.mcpClients),
  };
}
//@ chunk-e6aww6q8.js:3339285-3340409 fingerprint = getAgentListingDeltaAttachment (0.709)
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
  added.sort((Z, Se) => compareStringsGrouped(Z.agentType, Se.agentType));
  removed.sort();
  let q = leanPromptFor(getPromptModel(toolUseContext.options.mainLoopModel));
  return [
    {
      type: "agent_listing_delta",
      addedTypes: added.map((Z) => Z.agentType),
      addedLines: added.map((Z) => formatAgentLine(Z, q)),
      builtInTypes: added.filter((Z) => Z.source === "built-in").map((Z) => Z.agentType),
      builtInPluginTypes: added
        .filter((Z) => Z.source === "plugin" && marketplaceSuffix(Z.plugin) === BUILTIN)
        .map((Z) => Z.agentType),
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
  let r = new Set(tools.flatMap((s) => (s.mcpInfo?.isAuthStub ? [s.mcpInfo.serverName] : [])));
  return mcpClients
    .filter(
      (s) =>
        s.type === "needs-auth" &&
        !r.has(s.name) &&
        !(
          claudeInChromeSession().attachedInstructions &&
          s.name === CLAUDE_IN_CHROME_MCP_SERVER_NAME &&
          isClaudeAiProxyServer(s.config)
        ),
    )
    .map((s) => s.name);
}
//@ chunk-e6aww6q8.js:3340643-3340968 fingerprint = getMcpInstructionsDeltaAttachment (0.777)
/**
 * MCP 服务器 instructions 的增减 → mcp_instructions_delta；含内置服务器附加说明。
 */
function getMcpInstructionsDeltaAttachment(
  mcpClients,
  tools,
  model,
  messages,
  h,
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
      (G) =>
        G.mcpInfo?.serverName === CLAUDE_IN_CHROME_MCP_SERVER_NAME &&
        isDeferredToolInConversation(G, h, tools),
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
function getMcpDroppedToolsAttachment(e, n) {
  let mcpDroppedToolsDelta = buildMcpDroppedToolsDelta(
    e.options.mcpClients,
    n ?? [],
    getToolPermissionContext(e),
  );
  if (!mcpDroppedToolsDelta) return [];
  return [
    {
      type: "mcp_dropped_tools_delta",
      ...mcpDroppedToolsDelta,
    },
  ];
}
//@ chunk-e6aww6q8.js:3341091-3341174 fingerprint = getCriticalSystemReminderAttachment (0.764)
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
  let h = !hasBackgroundBashStopAfterReply();
  let y = h && (isTidySlothGateOn() || !getIsNonInteractiveSession());
  let S =
    outputStyleConfig.waitingTurnReminder !== undefined &&
    toolUseContext.agentId === undefined &&
    Object.values(toolUseContext.taskRegistry.all()).some(
      (w) =>
        w.status === "running" &&
        w.toolUseId !== undefined &&
        !("agentId" in w && w.agentId !== undefined) &&
        ((h && isMonitorShellTask(w)) || (y && isLocalShellTask(w) && w.isBackgrounded)),
    );
  return [
    {
      type: "output_style",
      style: outputStyleConfig.name,
      turnReminder: S ? outputStyleConfig.waitingTurnReminder : outputStyleConfig.turnReminder,
    },
  ];
}
//@ chunk-e6aww6q8.js:3341636-3342183 fingerprint = getSelectedLinesFromIDE (0.751)
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
//@ chunk-e6aww6q8.js:3342183-3342595 fingerprint = getDirectoriesToProcess (0.715)
/**
 * 计算从 cwd 到目标文件之间需要加载 CLAUDE.md 的目录：嵌套目录、cwd 及其祖先、worktree 信息、检出目标路径。
 */
function getDirectoriesToProcess(targetPath, originalCwd) {
  let targetDir = dirname(resolve_2(targetPath));
  if (!isPathWithinOrEqual(targetDir, originalCwd))
    try {
      let G = getFsImplementation().realpathSync(targetDir);
      if (isPathWithinOrEqual(G, originalCwd)) targetDir = G;
    } catch {}
  let worktreeForPath = findWorktreeForPath(targetDir, originalCwd);
  let h = mapCheckoutPathIntoWorktree(targetDir, worktreeForPath);
  let y = [];
  for (let G = h; G !== originalCwd && G !== parse(G).root; G = dirname(G))
    if (isPathWithinOrEqual(G, originalCwd)) y.push(mapPathIntoWorktree(G, worktreeForPath));
  y.reverse();
  let cwdLevelDirs = [];
  let w = originalCwd;
  while (w !== parse(w).root) {
    cwdLevelDirs.push(w);
    w = dirname(w);
  }
  cwdLevelDirs.reverse();
  let worktreeRoots = getWorktreeRoots(originalCwd);
  return {
    nestedDirs: y,
    cwdLevelDirs: cwdLevelDirs.filter(
      (cwdLevelDir) => !isInMainRepoOutsideWorktree(cwdLevelDir, worktreeRoots),
    ),
    worktree: worktreeForPath,
    checkoutTargetPath: worktreeForPath === null ? targetPath : join(h, basename(resolve_2(targetPath))),
  };
}
//@ chunk-e6aww6q8.js:3342595-3342705 layout
/**
 * 附加工作目录不在 cwd 下且其 CLAUDE.md 没有嵌套目录。
 */
function isAdditionalDirWithoutNestedMemory(e) {
  let originalCwd = getOriginalCwd();
  return (
    getAdditionalClaudeMdDirs().includes(e) &&
    !isPathWithinOrEqual(e, originalCwd) &&
    getDirectoriesToProcess(join(e, "CLAUDE.md"), originalCwd).nestedDirs.length === 0
  );
}
//@ chunk-e6aww6q8.js:3342705-3342782 callgraph-fingerprint = isInstructionsMemoryType (1)
/**
 * 记忆类型是否为 User/Project/Local/Managed。
 */
function isInstructionsMemoryType_2(type) {
  return type === "User" || type === "Project" || type === "Local" || type === "Managed";
}
//@ chunk-e6aww6q8.js:3342782-3344175 fingerprint = memoryFilesToAttachments (0.665)
/**
 * 把记忆文件（CLAUDE.md 等）转成 nested_memory 附件：跳过已读文件、已在上下文里的相同内容；超长时按模型截断（记 context_claude_md_load nested_file_cut）。
 */
async function memoryFilesToAttachments(
  memoryFiles,
  toolUseContext,
  triggerPath,
  announcementState,
  worktree = null,
  y = false,
) {
  let attachments = [];
  let shouldFireHook = hasInstructionsLoadedHook();
  let maxMemoryFileChars = getMaxMemoryFileChars(toolUseContext.options.mainLoopModel);
  for (let memoryFile of memoryFiles) {
    if (toolUseContext.readFileState.has(memoryFile.path)) continue;
    let timestamp = await getReadTimestamp(memoryFile, !y, toolUseContext.storageV5);
    if (toolUseContext.readFileState.has(memoryFile.path)) continue;
    let trimmed = memoryFile.content.trim();
    let flattened = uniq([memoryFile.path, mapCheckoutPathIntoWorktree(memoryFile.path, worktree)]).flatMap(
      (lt) => announcementState?.announced?.get(lt) ?? [],
    );
    let any = flattened.some((lt) => lt.content === trimmed);
    let we = !any && flattened.some((lt) => isTruncatedCopyOf(lt, trimmed));
    let Ee = any || we;
    let Ae = we || (!any && memoryFile.type !== "Managed" && trimmed.length > maxMemoryFileChars);
    let Ie = Ae ? truncateInstructionsAtLine(trimmed, memoryFile.path, maxMemoryFileChars) : trimmed;
    let Me = announcementState?.nested.get(memoryFile.path);
    let We = Me === Ie || Me === trimmed;
    if (!Ee && !We) {
      if (Ae) logFeatureSad("context_claude_md_load", "nested_file_cut");
      attachments.push({
        type: "nested_memory",
        path: memoryFile.path,
        content: Ae
          ? {
              ...memoryFile,
              content: Ie,
              rawContent: undefined,
            }
          : memoryFile,
        displayPath: y ? memoryFile.path : relative(getCwd(), memoryFile.path),
      });
    }
    if (y) announcementState?.nested.set(memoryFile.path, Ie);
    let readFileState = y ? undefined : toolUseContext.readFileState;
    readFileState?.set(memoryFile.path, {
      content: memoryFile.contentDiffersFromDisk
        ? (memoryFile.rawContent ?? memoryFile.content)
        : stripBomAndCarriageReturn(memoryFile.content),
      timestamp,
      offset: undefined,
      limit: undefined,
      isPartialView: Ae || memoryFile.contentDiffersFromDisk,
      seededFromContext: true,
      keepContent: true,
    });
    if (Ae && getFeatureValue_CACHED_MAY_BE_STALE("tengu_quizzical_mango", true))
      readFileState?.markStartOnly(memoryFile.path);
    if (Ee) continue;
    if (We) continue;
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
async function getMemoryAnnouncementState(e, n) {
  try {
    let r = messagesSinceCompactBoundary(n);
    let s = latestInstructionFiles(r);
    if (s && s.size > 0) {
      let h = await lexMarkdownWith(
        e.session,
        isStorageV5Enabled() ? e.storageV5 : undefined,
        isStorageV5Enabled() ? e.credentials : undefined,
      );
      let y = new Set(h && filterManagedInstructions(h, e.options).map((S) => S.path));
      for (let key of [...s.keys()]) if (!y.has(key)) s.delete(key);
    }
    return {
      announced: s,
      nested: collectNestedMemoryContents(r),
      withheld: seenWithheldPaths(e, n),
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
  storageV5,
  r = getDirectoriesToProcess(targetPath, getOriginalCwd()),
  heldOutsideTracker,
) {
  let processedPaths = new Set();
  let { nestedDirs, cwdLevelDirs, worktree, checkoutTargetPath } = r;
  yield await getManagedAndUserConditionalRules(checkoutTargetPath, processedPaths, storageV5);
  for (let nestedDir of nestedDirs) {
    let q = worktree !== null && isPathWithinOrEqual(nestedDir, worktree.worktreeRoot);
    yield await getMemoryFilesForNestedDirectory(
      nestedDir,
      q ? targetPath : checkoutTargetPath,
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
function buildHeldOutsideTracker(context, n) {
  let r = mergePersistedDenyRules(context);
  return isInstructionReadRestricted(r)
    ? rulesInstructionReaders(
        {
          context: r,
          isHeldOutside: isRestrictedReadBlocked,
        },
        n,
      )
    : undefined;
}
//@ chunk-e6aww6q8.js:3344886-3345142 layout
/**
 * 因权限未显示的记忆文件 → withheld_memory 附件。
 */
function getWithheldMemoryAttachment(session, n) {
  let r = new Set(
    takeShownInstructionFiles(getWithheldInstructionFiles(session)).shown.map(({ path }) => path),
  );
  takeOwedInstructionFiles(session, r);
  let filtered = n.filter(({ path }) => !r.has(path));
  if (filtered.length === 0 || getIsNonInteractiveSession()) return [];
  return [
    {
      type: "withheld_memory",
      entries: filtered.map((h) => ({
        ...h,
        displayPath: relative(getCwd(), h.path),
      })),
      by: withheldInstructionStateSlot.of(session).token,
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
  let y = [];
  try {
    let readFor = claudeMdExtraState.peek(toolUseContext.session)?.readFor;
    if (readFor)
      return getFeatureValue_CACHED_MAY_BE_STALE("tengu_paper_halyard", false)
        ? y
        : await memoryFilesToAttachments(
            applyClaudeMdExcludesToInjected(
              await readFor(filePath, toolUseContext.abortController.signal, function () {
                return getToolPermissionContext(toolUseContext);
              }),
            ).filter(function (ke) {
              return includeTriggerFile || ke.path !== filePath;
            }),
            toolUseContext,
            filePath,
            announcementState,
            null,
            true,
          );
    if (!pathInAllowedWorkingPath(filePath, permissionState.toolPermissionContext)) return y;
    let directoriesToProcess = getDirectoriesToProcess(filePath, getOriginalCwd());
    let featureValue_CACHED_MAY_BE_STALE = getFeatureValue_CACHED_MAY_BE_STALE("tengu_paper_halyard", false);
    let G = new Map();
    for await (let Se of iterateMemoryFilesForPath(
      filePath,
      toolUseContext.storageV5,
      directoriesToProcess,
      buildHeldOutsideTracker(permissionState.toolPermissionContext, (ke, we) => {
        G.set(ke, we);
      }),
    ))
      y.push(
        ...(await memoryFilesToAttachments(
          Se.filter(
            (ke) => !featureValue_CACHED_MAY_BE_STALE || (ke.type !== "Project" && ke.type !== "Local"),
          ),
          toolUseContext,
          filePath,
          announcementState,
          directoriesToProcess.worktree,
        )),
      );
    let flattened = Array.from(G).flatMap(([Se, ke]) =>
      ke === undefined
        ? []
        : [
            {
              path: Se,
              why: ke,
            },
          ],
    );
    let { session } = toolUseContext;
    clearOwedInstructionFiles(
      session,
      Array.from(G).flatMap(([Se, ke]) => (ke === undefined ? [Se] : [])),
    );
    if (toolUseContext.agentId !== undefined) recordWithheldInstructionFiles(session, flattened);
    else {
      logWithheldInstructionFiles(session, flattened);
      let { owed } = withheldInstructionStateSlot.of(session);
      let sliced = flattened
        .filter(({ path }) => announcementState?.withheld.has(path) !== true && !owed.has(path))
        .slice(0, MAX_TRACKED_INSTRUCTION_PATHS);
      y.push(...getWithheldMemoryAttachment(session, sliced));
      for (let { path } of sliced) announcementState?.withheld.add(path);
    }
  } catch (error) {
    logError(error);
  }
  return y;
}
//@ chunk-e6aww6q8.js:3346117-3346436 fingerprint = getOpenedFileFromIDE (0.784)
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
async function getFileMentionReferences(mentionedFiles, toolUseContext, r) {
  let s = memoryPickerMaps.peek(toolUseContext.session);
  let h;
  if (getFeatureValue_CACHED_MAY_BE_STALE("tengu_snuggly_goblet", false)) {
    let { mainLoopModel, autoCompactWindow } = toolUseContext.options;
    let modelContextInfo = getModelContextInfo(mainLoopModel);
    let autoCompactThresholdTokens = getAutoCompactThresholdTokens(modelContextInfo, autoCompactWindow);
    if (autoCompactThresholdTokens > SECONDARY_CONTEXT_WINDOW) {
      let Ee =
        estimateTokensWithAnchor(r, modelContextInfo.bytesPerToken) +
        stripInProgressAssistantMessage(r) +
        (hasUsageAnchor(r) ? 0 : SECONDARY_CONTEXT_WINDOW);
      let Ae = 0;
      h = {
        threshold: autoCompactThresholdTokens,
        held: () => Ee,
        claimed: () => Ae,
        claim: (Ie) => {
          Ae += Ie;
        },
      };
    }
  }
  let y = memoryPickerSets.peek(toolUseContext.session);
  let S = [];
  let w = [];
  let L = [];
  let G = () => isCoworkAny() && getToolsMachine()?.directory?.isGitRepo === false;
  let maxSizeBytes = getDefaultFileReadingLimits().maxSizeBytes;
  for (let Z of mentionedFiles) {
    if (y?.delete(Z)) {
      L.push(Z);
      continue;
    }
    let Se = s?.get(Z);
    s?.delete(Z);
    let ke = Buffer.isBuffer(Se) ? Se.length : 0;
    let we =
      Se &&
      ke <= maxSizeBytes &&
      getAttachmentReadBlockReason(Z, getToolPermissionContext(toolUseContext), "person") === undefined &&
      (await readCachedMentionContent(Z, Se, toolUseContext, h));
    if (we) {
      S.push(we);
      maxSizeBytes -= ke;
    } else if (isAbsolute(Z) || !G()) w.push(Z);
  }
  if (w.length + L.length > 0) logFeatureSad("input_file_at_mention", "referenced_not_read");
  if (w.length > 0)
    S.push({
      type: "at_mention_reference",
      mentions: w,
    });
  if (L.length > 0)
    S.push({
      type: "at_mention_reference",
      mentions: L,
      arePdfsToReadPlainly: true,
    });
  return S;
}
//@ chunk-e6aww6q8.js:3347306-3348215 layout
/**
 * 宿主提供的提及文件内容：太大给 at_mention_reference（too_large），否则按读取上限截断后生成文件附件。
 */
async function readCachedMentionContent(e, n, { credentials }, s) {
  let cwdOrNull = getCwdOrNull();
  let displayPath = cwdOrNull === null ? e : relative(cwdOrNull, e);
  if ("tooLargeBytes" in n) {
    logFeatureSad("input_file_at_mention", "too_large");
    return {
      type: "at_mention_reference",
      mentions: [e],
      unread: "too_large",
      fileSize: n.tooLargeBytes,
      displayPath,
    };
  }
  let { maxTokens } = getDefaultFileReadingLimits();
  let ext = parse(e).ext.toLowerCase().slice(1);
  for (let L of [undefined, MAX_LINES_TO_READ]) {
    let { content, lineCount, totalLines } = readFileInRangeFast(
      n.toString("utf8"),
      n.length,
      0,
      0,
      L,
      undefined,
      undefined,
    );
    let Se =
      s === undefined
        ? 0
        : Buffer.byteLength(
            addLineNumbers({
              content,
              startLine: 1,
            }),
          );
    let ke = false;
    try {
      await validateContentTokens(content, ext, maxTokens, credentials, false, true);
    } catch (error) {
      if (!(error instanceof MaxFileReadTokenExceededError)) {
        logError(error);
        return;
      }
      if (s === undefined || Se > allowLargeRoomTokens(s, 0)) continue;
      ke = true;
    }
    s?.claim(Se);
    if (L === undefined) logFeatureOk("input_file_at_mention");
    else logFeatureSad("input_file_at_mention", "first_lines_only");
    return {
      type: "file",
      filename: e,
      content: {
        type: "text",
        file: {
          filePath: e,
          content,
          numLines: lineCount,
          startLine: 1,
          totalLines,
        },
      },
      ...(L !== undefined && {
        truncated: true,
      }),
      ...(ke && {
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
  let h = await processAtMentionedFiles(
    mentionedPaths,
    toolUseContext,
    parentAbortController,
    agentIdOverride,
  );
  return [...h.attached, ...h.hookContexts].filter(Boolean);
}
//@ chunk-e6aww6q8.js:3348324-3352037 fingerprint = processAtMentionedFiles (0.3)
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
  let y = [];
  let S = agentIdOverride ?? toolUseContext.agentId;
  let readThrottle = createReadThrottle();
  return {
    attached: await Promise.all(
      mentionedPaths.map(async (mentionedPath, q) => {
        let Z;
        try {
          let { filename, lineStart, lineEnd } = parseAtMentionedFileLines(mentionedPath);
          let Ee =
            isAbsolute(filename) || filename.startsWith("~") || /(^|[\\/])\.\.([\\/]|$)/.test(filename);
          let attachmentReadBlockReason = getAttachmentReadBlockReason(filename, permissionContext, "person");
          if (attachmentReadBlockReason === "network") {
            logFeatureBad("input_file_at_mention", "denied");
            return null;
          }
          let absoluteFilename = expandPath(filename);
          if (attachmentReadBlockReason === "denied") {
            if (Ee) logFeatureBad("input_file_at_mention", "denied");
            return null;
          }
          let Me = isInstructionReadRestricted(permissionContext);
          Z = Me ? await readThrottle() : undefined;
          let We = Me
            ? await pathSpellingsForRead(absoluteFilename, toolUseContext.abortController.signal)
            : [absoluteFilename];
          if (
            Me &&
            We !== undefined &&
            isInstructionPathRefused(We, {
              context: permissionContext,
              isHeldOutside: isRestrictedReadBlocked,
            })
          ) {
            logFeatureBad("input_file_at_mention", "denied_at_landing");
            return null;
          }
          let filePath = We;
          let aborted = filePath === undefined && toolUseContext.abortController.signal.aborted;
          if (filePath === undefined && !aborted) {
            logFeatureBad("input_file_at_mention", "landing_unsettled");
            return {
              type: "at_mention_reference",
              mentions: [filename],
              unread: "unexamined",
            };
          }
          let sizeProbe = "none";
          try {
            let ho = aborted ? undefined : await stat(absoluteFilename);
            sizeProbe = Me && ho?.isFile() ? "through-open" : "none";
            if (ho?.isDirectory() && filePath !== undefined)
              try {
                if (Me && isFileReadDenied(filePath, permissionContext)) {
                  logFeatureBad("input_dir_at_mention", "denied");
                  return null;
                }
                let entries = Me
                  ? await readDirIfSpellingsStable(absoluteFilename, filePath, (Xn) =>
                      readdir(Xn, {
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
                      spellings: filePath,
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
          let nt = lineStart;
          let pt = lineEnd && lineStart ? lineEnd - lineStart + 1 : undefined;
          let Et = (ho) => (ho.path === absoluteFilename ? absoluteFilename : expandPath(ho.path));
          let yt = new Map();
          let gt = false;
          let At = false;
          let It = false;
          let Yt = false;
          let qt = [];
          Z?.();
          Z = undefined;
          let { readThroughMention } = await import("./chunk-hg7yd2v7.js");
          let stats = await readThroughMention({
            raised: {
              mention: mentionedPath,
              path: absoluteFilename,
              ...(nt !== undefined && {
                offset: nt,
              }),
              ...(pt !== undefined && {
                limit: pt,
              }),
              ...(S !== undefined && {
                agentId: S,
              }),
            },
            signalOf: () => (parentAbortController ?? toolUseContext.abortController).signal,
            skipping: toolUseContext.hookOrigin,
            isIsolated: toolUseContext.options.settingsHooksOff === true,
            storageV5: toolUseContext.storageV5,
            refusal: (ho) =>
              ho.path !== absoluteFilename &&
              getAttachmentReadBlockReason(ho.path, getToolPermissionContext(toolUseContext), "hook") !==
                undefined
                ? "the path may not be read here"
                : undefined,
            read: (ho, yn) => {
              let filename = Et(ho);
              yt.set(filename, {
                state: toolUseContext.readFileState.get(filename),
                triggers: count(toolUseContext.nestedMemoryAttachmentTriggers ?? [], (fo) => fo === filename),
              });
              let toolUseContext_2 =
                yn === "hooked" && parentAbortController !== undefined
                  ? {
                      ...toolUseContext,
                      abortController: createChildAbortController(parentAbortController),
                    }
                  : toolUseContext;
              gt ||= toolUseContext_2.abortController.signal.aborted;
              At ||= !toolUseContext_2.abortController.signal.aborted;
              return generateFileAttachment(
                filename,
                toolUseContext_2,
                "tengu_at_mention_extracting_filename_success",
                "tengu_at_mention_extracting_filename_error",
                "at-mention",
                {
                  offset: ho.offset,
                  limit: ho.limit,
                  pdfAbortParent: parentAbortController,
                  onRefusedAtOpen: () => {
                    Yt = true;
                  },
                  onTooLarge: (fileSize) => {
                    qt.push({
                      path: filename,
                      fileSize,
                    });
                  },
                  ...(Me &&
                    filename === absoluteFilename &&
                    filePath !== undefined && {
                      landing: filePath,
                      sizeProbe,
                    }),
                },
              );
            },
            forget: (ho) => {
              It = true;
              let yn = Et(ho);
              let Kn = yt.get(yn);
              if (Kn?.state === undefined) toolUseContext.readFileState.delete(yn);
              else toolUseContext.readFileState.set(yn, Kn.state);
              let nestedMemoryAttachmentTriggers = toolUseContext.nestedMemoryAttachmentTriggers;
              let triggers = Kn?.triggers ?? 0;
              while (
                nestedMemoryAttachmentTriggers !== undefined &&
                count(nestedMemoryAttachmentTriggers, (To) => To === yn) > triggers
              )
                nestedMemoryAttachmentTriggers.splice(nestedMemoryAttachmentTriggers.lastIndexOf(yn), 1);
            },
          });
          let attachment = stats.attachment;
          if (stats.context) y[q] = stats.context;
          if (attachment) logFeatureOk("input_file_at_mention");
          if (!attachment && !It && (Yt || (aborted && (Ee || lineStart !== undefined) && gt && !At))) {
            if (Yt) logFeatureBad("input_file_at_mention", "refused_at_open");
            return {
              type: "at_mention_reference",
              mentions: [filename],
              unread: "unexamined",
            };
          }
          let last = qt.at(-1);
          if (
            !attachment &&
            !It &&
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
          Z?.();
        }
      }),
    ),
    hookContexts: y,
  };
}
//@ chunk-e6aww6q8.js:3352037-3352324 fingerprint = processAgentMentions (0.595)
/**
 * @agent-xxx 或 @"xxx (agent)" 提及 → agent_mention 附件（找不到的代理丢弃）。
 */
function processAgentMentions(input, agents) {
  let agentMentions = extractAgentMentions(input);
  if (agentMentions.length === 0) return [];
  logUnreportedMentions("agent", agentMentions.length);
  return agentMentions
    .map((mention, y) => {
      let agentType = mention.replace("agent-", "");
      let agentDef = agents.find((def) => def.agentType === agentType);
      if (!agentDef) {
        logMentionResult(y, "agent", false);
        return null;
      }
      logMentionResult(y, "agent", true);
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
async function getPeerMentionAttachments(preExpansionInput, toolUseContext, r) {
  if (isCrossSessionMessagingEnabled()) {
    let s = new Set(
      r.flatMap((S) => [
        ...("displayPath" in S ? [S.displayPath] : []),
        ...("filename" in S ? [S.filename] : []),
        ...(S.type === "directory" ? [S.path] : []),
      ]),
    );
    let mentions = parsePeerMentions(preExpansionInput).filter((S) => S.ref !== undefined || !s.has(S.name));
    if (mentions.length === 0) return [];
    let peers = await resolveTeamName(toolUseContext.session, toolUseContext.getAppState(), {
      storageV5: toolUseContext.storageV5,
    });
    return resolvePeerMentions(mentions, peers).map((S) =>
      S.kind === "resolved"
        ? {
            type: "peer_mention",
            mention: S.mention,
            status: "resolved",
            candidates: [S.candidate],
            total: 1,
          }
        : {
            type: "peer_mention",
            mention: S.mention,
            status: "ask",
            candidates: S.candidates,
            total: S.total,
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
  e,
  mcpClients,
  mcpResources,
  s,
  inheritedMcpSkillMessages,
  signal,
  signal_2,
) {
  let mcpResourceMentions = extractMcpResourceMentions(e);
  if (mcpResourceMentions.length === 0) return [];
  let L = mcpClients || [];
  logUnreportedMentions("mcp_resource", mcpResourceMentions.length);
  return (
    await Promise.all(
      mcpResourceMentions.map(async (mcpResourceMention, Z) => {
        try {
          let [Se, ...ke] = mcpResourceMention.split(":");
          let uri = ke.join(":");
          if (!Se || !uri) {
            logMentionResult(Z, "mcp_resource", false);
            return null;
          }
          let found = L.find((ze) => ze.name === Se);
          if (!found || !isConnectedOrCached(found)) {
            logMentionResult(Z, "mcp_resource", false);
            return null;
          }
          if (hasWithheldResources(found, undefined)) {
            logMentionResult(Z, "mcp_resource", false);
            return null;
          }
          let found_2 = (mcpResources?.[Se] || []).find((ze) => ze.uri === uri);
          if (!found_2) {
            logMentionResult(Z, "mcp_resource", false);
            return null;
          }
          let Me = noopSkillFetch(found.name, uri, s, inheritedMcpSkillMessages);
          if (Me !== undefined) {
            logMentionResult(Z, "mcp_resource", false);
            logForDebugging(`MCP resource ${Se} ${uri} not read: ${Me}`, {
              level: "warn",
            });
            return null;
          }
          let ensureConnectedClient = getEnsureConnectedClient();
          if (!ensureConnectedClient) {
            logMentionResult(Z, "mcp_resource", false);
            return null;
          }
          try {
            let connectedClient = await ensureConnectedClient(found, {
              signal,
              context: "MCP @-mention resource read",
            });
            if (hasWithheldResources(connectedClient, undefined)) {
              logMentionResult(Z, "mcp_resource", false);
              return null;
            }
            let lt = classifySkillResourceUri(
              uri,
              countUniqueFiles(connectedClient.name, s, inheritedMcpSkillMessages),
            );
            if (lt.case === "unlisted") {
              logMentionResult(Z, "mcp_resource", false);
              logForDebugging(
                lt.reason === "uri_too_long"
                  ? `MCP resource ${Se} (an address of ${Buffer.byteLength(uri)} bytes) not read: its address is longer than 2048 bytes, and ${plural(lt.skills.length, "skill")} ${lt.skills.map((skill) => skill.skillName).join(", ")} from this server ${lt.skills.length === 1 ? "is" : "are"} loaded`
                  : lt.reason === "unparseable_uri"
                    ? `MCP resource ${Se} ${uri} not read: its address is not a valid URL, and ${plural(lt.skills.length, "skill")} ${lt.skills.map((skill) => skill.skillName).join(", ")} from this server ${lt.skills.length === 1 ? "is" : "are"} loaded`
                    : lt.reason === "other_spelling"
                      ? `MCP resource ${Se} ${uri} not read: its address begins with another spelling of the address of loaded ${plural(lt.skills.length, "skill")} ${lt.skills.map((skill) => skill.skillName).join(", ")}`
                      : `MCP resource ${Se} ${uri} not read: it is in the directory of loaded ${plural(lt.skills.length, "skill")} ${lt.skills.map((skill) => skill.skillName).join(", ")}, but ${lt.skills.length === 1 ? "that skill does not list it" : "none of them lists it"}, or MCP skills are turned off`,
                {
                  level: "warn",
                },
              );
              return null;
            }
            recordToolUsed(READMCPRESOURCETOOL);
            let mcpResource = await readMcpResource(connectedClient, uri, {
              signal: signal_2,
            });
            let nt = lt.case === "listed" ? verifySkillFile(mcpResource.contents, uri, lt.rows) : undefined;
            if (nt !== undefined && !nt.ok) {
              logMentionResult(Z, "mcp_resource", false);
              logForDebugging(
                `MCP resource ${Se} ${uri} not attached: ${MCP_SKILL_FILE_PROBLEMS[nt.reason]}`,
                {
                  level: "warn",
                },
              );
              return null;
            }
            logMentionResult(Z, "mcp_resource", true);
            return {
              type: "mcp_resource",
              server: Se,
              uri,
              name: found_2.name || uri,
              description: found_2.description,
              content:
                nt !== undefined && nt.ok
                  ? {
                      ...mcpResource,
                      contents: [nt.item],
                    }
                  : mcpResource,
            };
          } catch (error) {
            if (isAbortError(error) || signal_2.aborted) return null;
            logMentionResult(Z, "mcp_resource", false);
            logForDebugging(
              `MCP resource read failed for ${Se} ${uri}: ${error instanceof Error ? error.message : String(error)}`,
              {
                level: "error",
              },
            );
            return null;
          }
        } catch {
          logMentionResult(Z, "mcp_resource", false);
          return null;
        }
      }),
    )
  ).filter((q) => q !== null);
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
function logMentionResult(e, n, r) {
  if (e >= MAX_REPORTED_MENTIONS) return;
  if (n === "agent") logEvent(r ? "tengu_at_mention_agent_success" : "tengu_at_mention_agent_not_found", {});
  else logEvent(r ? "tengu_at_mention_mcp_resource_success" : "tengu_at_mention_mcp_resource_error", {});
  logAtMention({
    mentionType: n,
    success: r,
  });
}
//@ chunk-e6aww6q8.js:3355720-3355812 layout
/**
 * 提及数超过上限时记 tengu_at_mention_unreported。
 */
function logUnreportedMentions(e, n) {
  if (n > MAX_REPORTED_MENTIONS)
    logEvent("tengu_at_mention_unreported", {
      mention_type: fromEnum(e),
      count: n - MAX_REPORTED_MENTIONS,
    });
}
//@ chunk-e6aww6q8.js:3355812-3355842 layout
/**
 * 按 readFileState 记录变更文件检查顺序的 WeakMap。
 */
var MAX_CHANGED_FILE_SNIPPET_CHARS = 16384;
var changedFilesOrderByState = new WeakMap();
//@ chunk-e6aww6q8.js:3355842-3358973 fingerprint = getChangedFiles (0.432)
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
  let r = changedFilesOrderByState.get(toolUseContext.readFileState) ?? [];
  let s = new Set(filePaths);
  let h = new Set(r);
  let combined = r.filter((We) => s.has(We)).concat(filePaths.filter((filePath) => !h.has(filePath)));
  let S = new Set();
  let w = new Set();
  let toolPermissionContext = getToolPermissionContext(toolUseContext);
  let featureValue_CACHED_MAY_BE_STALE = getFeatureValue_CACHED_MAY_BE_STALE("tengu_fallow_plover", false);
  let outputsLink =
    featureValue_CACHED_MAY_BE_STALE && getFeatureValue_CACHED_MAY_BE_STALE("tengu_mossy_thrush", false)
      ? defaultOutputRoots()
      : undefined;
  let Z = {};
  let Se = 0;
  let ke = isInstructionReadRestricted(toolPermissionContext);
  let readThrottle = createReadThrottle();
  let results = await Promise.all(
    combined.map(async (filePath) => {
      let fileState = toolUseContext.readFileState.get(filePath);
      if (!fileState) return null;
      if (fileState.offset !== undefined || fileState.limit !== undefined) return null;
      let normalizedPath = expandPath(filePath);
      if (isAttachmentReadDeniedOrThrown(normalizedPath, toolPermissionContext)) return null;
      let Je;
      try {
        Je = ke ? await readThrottle() : undefined;
        let nt = toolUseContext.abortController.signal.aborted ? S : w;
        let pt = ke
          ? await readableInstructionSpellings(
              normalizedPath,
              {
                context: toolPermissionContext,
                isHeldOutside: isRestrictedReadBlocked,
              },
              toolUseContext.abortController.signal,
            )
          : [normalizedPath];
        if (pt === undefined) {
          if (toolUseContext.abortController.signal.aborted) nt.add(filePath);
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
              isLandingJudged: ke ? (Zt) => pt.includes(Zt) : () => true,
              onOutcome: (Zt, rn, pn) => {
                Z[Zt] = (Z[Zt] ?? 0) + 1;
                if (rn) Z.via_outputs_link = (Z.via_outputs_link ?? 0) + 1;
                if (Zt === "differs" && pn !== undefined)
                  getAttachmentTimingStore()?.noteDiffersFile(
                    pn,
                    fileState.content === "" && (fileState.contentLength ?? 0) > 0,
                  );
              },
            },
          ))
        )
          return null;
        Se++;
        let At = toolUseContext.readFileState.holdsOnlyStartOf(normalizedPath);
        recordToolUsed(FileReadTool.name);
        let It = ke ? await stashAttachedReadPermission(normalizedPath, pt, toolUseContext) : toolUseContext;
        let Yt = timeAttachment("changed_file_read", () => FileReadTool.call(fileInput, It));
        Je?.();
        let qt = await Yt;
        if (fileState.isPartialView || At) {
          let Zt = toolUseContext.readFileState.get(normalizedPath);
          if (Zt)
            toolUseContext.readFileState.set(normalizedPath, {
              ...Zt,
              ...(fileState.isPartialView && {
                isPartialView: true,
              }),
              ...(At && {
                contentNotInModelContext: true,
              }),
            });
        }
        if (qt.data.type === "text") {
          if (qt.data.file.truncatedByTokenCap === true) return null;
          if (matchesContentHash(fileState, qt.data.file.content)) return null;
          if (fileState.content === "" && (fileState.contentLength ?? 0) > 0) {
            markContentNotInModelContext(toolUseContext.readFileState, normalizedPath);
            return {
              type: "edited_text_file",
              filename: normalizedPath,
              snippet: "",
            };
          }
          let snippet = getSnippetForTwoFileDiff(fileState.content, qt.data.file.content);
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
        if (qt.data.type === "image")
          try {
            let Zt = ke
              ? await checkPathRefused(normalizedPath, pt, toolUseContext.abortController.signal)
              : undefined;
            try {
              let content = await readImageWithTokenBudget(
                Zt ?? normalizedPath,
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
              if (Zt !== undefined) await Zt.close().catch(() => {});
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
        Je?.();
      }
    }),
  );
  let Ae = S.size + w.size;
  if (Ae === 0) changedFilesOrderByState.delete(toolUseContext.readFileState);
  else {
    changedFilesOrderByState.set(
      toolUseContext.readFileState,
      combined.filter((result) => S.has(result)).concat(combined.filter((We) => w.has(We))),
    );
    logForDebugging(
      `Changed files: the pass ended with ${Ae} of ${combined.length} tracked files not examined; the next pass begins with them.`,
      {
        level: "warn",
      },
    );
  }
  if (!toolUseContext.agentId) {
    noteChangedFilesReread(Se);
    noteChangedFilesCompared(Z);
  }
  let filtered = results.filter((result) => result != null);
  let Me = 0;
  for (let We of filtered) {
    if (We.type !== "edited_text_file") continue;
    if (Me >= MAX_CHANGED_FILE_SNIPPET_CHARS) {
      We.snippet = "";
      markContentNotInModelContext(toolUseContext.readFileState, We.filename);
    } else Me += We.snippet.length;
  }
  return filtered;
}
//@ chunk-e6aww6q8.js:3358973-3359439 layout
/**
 * 消费 nestedMemoryAttachmentTriggers（读文件等操作触发的路径），生成对应嵌套记忆附件。
 */
async function getNestedMemoryTriggerAttachments(toolUseContext, messages) {
  let { nestedMemoryAttachmentTriggers, pendingNestedMemoryTriggers } = toolUseContext;
  let h = new Set();
  if (nestedMemoryAttachmentTriggers && pendingNestedMemoryTriggers && !toolUseContext.agentId) {
    for (let pendingNestedMemoryTrigger of pendingNestedMemoryTriggers)
      if (!nestedMemoryAttachmentTriggers.includes(pendingNestedMemoryTrigger)) {
        nestedMemoryAttachmentTriggers.push(pendingNestedMemoryTrigger);
        h.add(pendingNestedMemoryTrigger);
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
  let S = [];
  let announcementState = messages && (await getMemoryAnnouncementState(toolUseContext, messages));
  for (let nestedMemoryAttachmentTrigger of nestedMemoryAttachmentTriggers) {
    let nestedMemoryAttachmentsForFile = await getNestedMemoryAttachmentsForFile(
      nestedMemoryAttachmentTrigger,
      toolUseContext,
      {
        toolPermissionContext,
      },
      announcementState,
      h.has(nestedMemoryAttachmentTrigger),
    );
    S.push(...nestedMemoryAttachmentsForFile);
  }
  nestedMemoryAttachmentTriggers.length = 0;
  return S;
}
//@ chunk-e6aww6q8.js:3359439-3359508 layout
/**
 * readFileState 已有该路径（可选要求完整读取）。
 */
function isAlreadyReadWhole(readFileState, path, earlierReadsMayBeCleared) {
  return (
    readFileState.has(path) && (!earlierReadsMayBeCleared || readFileState.get(path)?.offset === undefined)
  );
}
//@ chunk-e6aww6q8.js:3359508-3360723 fingerprint = getRelevantMemoryAttachments (0.541)
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
  let we = autoMemoryOn
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
  let Ee = we.length === 0 ? accountRecall?.listing() : undefined;
  await getAutoMemPathState().warmCanonicalWcRoot();
  let Ae = autoMemoryOn && !(we.length === 0 && isAutoMemReadFenced());
  let Ie = await Ee;
  if (!Ae && Ie === undefined) return [];
  await waitForFirstStorePull(signal);
  let dirs =
    we.length > 0
      ? (
          await Promise.all(
            we.map(({ agentType, scope }) => resolveAgentMemoryDirForRecall(agentType, scope)),
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
          (yt) => isAlreadyReadWhole(readFileState, yt, earlierReadsMayBeCleared),
          isMultiStoreSyncAvailable,
          storageV5,
          credentials,
          selectorTurnReverts,
          regularFilesOnly,
          dir === getAutoMemPath() ? Ie : undefined,
          Ae,
          dir === getAutoMemPath()
            ? (accountRecall?.scope() ?? accountMemoryRecall?.NO_ACCOUNT_SCOPE)
            : undefined,
        )
          .then((memoryRecall) =>
            memoryRecall.map((gt) => ({
              ...gt,
              regularFilesOnly,
              containedIn,
            })),
          )
          .catch(() => []),
      ),
    )
  )
    .flat()
    .filter((nt) =>
      nt.account
        ? accountRecall?.pickable(nt.path) === true
        : !isAlreadyReadWhole(readFileState, nt.path, earlierReadsMayBeCleared) &&
          !surfaced.paths.has(nt.path) &&
          !isBlockedPath(nt.path),
    )
    .slice(0, 5);
  let [memoriesForSurfacing, Je] = await Promise.all([
    readMemoriesForSurfacing(
      selected.filter((nt) => !nt.account),
      signal,
    ),
    accountRecall?.attachmentsFor(
      selected.filter((nt) => nt.account).map((nt) => nt.path),
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
    ...Je,
  ];
}
//@ chunk-e6aww6q8.js:3360723-3361031 fingerprint = collectSurfacedMemories (0.869)
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
//@ chunk-e6aww6q8.js:3361031-3361660 fingerprint = readMemoriesForSurfacing (0.843)
/**
 * 读取选中的记忆文件：限制为普通文件/目录内，截断时附提示（用 Read 看全文），返回 {path, content, mtimeMs, header, limit}。
 */
async function readMemoriesForSurfacing(selected, signal) {
  return (
    await Promise.all(
      selected.map(async (s) => {
        let { path: filePath, mtimeMs, regularFilesOnly, containedIn } = s;
        try {
          if (regularFilesOnly && !(await lstat(filePath)).isFile()) return null;
          if (containedIn !== undefined && !(await isRealpathWithin(filePath, containedIn))) return null;
          let memoryFileForRecall = await readMemoryFileForRecall(filePath, signal);
          if (memoryFileForRecall === undefined) return null;
          let G = sanitizeMemoryText(memoryFileForRecall.content);
          let content = memoryFileForRecall.truncated
            ? G +
              `

> This memory file was truncated (${memoryFileForRecall.truncatedByBytes ? `${MEMORY_FILE_RECALL_BYTES} byte limit` : `first ${MAX_ENTRYPOINT_TAIL_LINES} lines`}). Use the ${FILE_READ_TOOL_NAME} tool to view the complete file at: ${singleLineMemoryText(filePath)}`
            : G;
          return {
            path: filePath,
            content,
            mtimeMs,
            header: memoryHeader(filePath, mtimeMs),
            limit:
              memoryFileForRecall.truncated ||
              memoryFileForRecall.itemBlockRemoved ||
              G !== memoryFileForRecall.content
                ? memoryFileForRecall.lineCount
                : undefined,
          };
        } catch {
          return null;
        }
      }),
    )
  ).filter((s) => s !== null);
}
//@ chunk-e6aww6q8.js:3361660-3361745 layout
/**
 * 不做相关记忆预取的 querySource：extract_memories、auto_dream、prompt_suggestion、compact 等。
 */
var MEMORY_PREFETCH_SKIP_SOURCES = new Set([
  "extract_memories",
  "auto_dream",
  MEMDIR_RELEVANCE,
  "prompt_suggestion",
  "compact",
]);
//@ chunk-e6aww6q8.js:3361745-3363462 fingerprint = startRelevantMemoryPrefetch (0.544)
/**
 * 在 queryLoop 入口启动相关记忆预取：主线程、非跳过来源、自动记忆或账户召回开启、最后一条用户消息有空白（或含 CJK）、会话预算未超 60KB 时，异步调用 getRelevantMemoryAttachments，返回可 using 释放的句柄。
 */
function startRelevantMemoryPrefetch(messages, toolUseContext, querySource, memoryContextPromise) {
  let memorySelector = toolUseContext.memorySelector;
  if (!memorySelector || toolUseContext.agentId || MEMORY_PREFETCH_SKIP_SOURCES.has(querySource)) return;
  let autoMemoryOn = isAutoMemoryEnabled() && isMemoryRecallEnabled();
  let S = accountMemoryRecall?.isAccountRecallOn() === true && !isIndexRecallEnabled();
  if (!autoMemoryOn && !S) return;
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
    S && accountMemoryRecall
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
  let we = [];
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
    we,
    (Ie) => {
      let toolPermissionContext = getToolPermissionContext(toolUseContext);
      if (toolPermissionContext?.blockReadsOutsideWorkingDirectories !== true) return false;
      try {
        return outsideReadBlocked(Ie, toolPermissionContext);
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
    screen(Ie, Me) {
      return accountRecall ? accountRecall.screen(Ie, Me) : [...Ie];
    },
    [Symbol.dispose]() {
      controller.abort();
      if (prefetchHandle.consumedOnIteration === -1) promise.then(() => we.forEach((Me) => Me()));
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
  let s;
  let promise = new Promise((resolve) => {
    if (signal.aborted) {
      resolve(undefined);
      return;
    }
    s = () => resolve(undefined);
    signal.addEventListener("abort", s, {
      once: true,
    });
  });
  let y;
  try {
    y = await Promise.race([
      withDeadline(memoryRecallPrefetch.promise, MEMORY_PREFETCH_DEADLINE_MS),
      promise,
    ]);
  } finally {
    if (s !== undefined) signal.removeEventListener("abort", s);
  }
  let blockingWaitMs = Date.now() - now;
  logEvent("tengu_memdir_prefetch_blocking_wait", {
    outcome: fromEnum(signal.aborted ? "aborted" : y !== undefined ? "consumed" : "deadline"),
    blocking_wait_ms: blockingWaitMs,
    deadline_fired: y === undefined && !signal.aborted,
    result_in_time: y !== undefined && !signal.aborted,
    attachment_count: y?.length ?? -1,
  });
  return signal.aborted ? undefined : y;
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
//@ chunk-e6aww6q8.js:3364245-3364589 fingerprint = filterDuplicateMemoryAttachments (0.9)
/**
 * 去掉已读过的相关记忆，把新记忆写入 readFileState 并记入已呈现集合；空的附件丢弃。
 */
function filterDuplicateMemoryAttachments(attachments, readFileState, session, earlierReadsMayBeCleared) {
  let h = claudeMdAccessTrackerSlot.of(session);
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
      h.recordSurfaced(filtered.map((w) => w.path));
      return filtered.length > 0
        ? {
            ...attachment,
            memories: filtered,
          }
        : null;
    })
    .filter((y) => y !== null);
}
//@ chunk-e6aww6q8.js:3364589-3364614 layout
/**
 * 技能附件附加字段（当前构建恒为空对象）。
 */
function getSkillAttachmentExtras(tools) {
  return {};
}
//@ chunk-e6aww6q8.js:3364614-3365645 fingerprint = getDynamicSkillAttachments (0.901)
/**
 * 文件操作触发的新技能目录：扫描技能目录，产出 dynamic_skill 附件（目录、技能名）。
 */
async function getDynamicSkillAttachments(toolUseContext) {
  let dynamicSkillDirTriggers = toolUseContext.dynamicSkillDirTriggers;
  if (!dynamicSkillDirTriggers || dynamicSkillDirTriggers.length === 0) return [];
  let r = [...dynamicSkillDirTriggers];
  dynamicSkillDirTriggers.length = 0;
  if (getDisableSlashCommands()) return [];
  if (!toolUseContext.options.tools.some((tool) => toolMatchesName(tool, SKILL))) return [];
  await addSkillDirectories(r).catch(() => {});
  let projectRoot = getProjectRoot();
  let h = projectRoot.endsWith(sep) ? projectRoot : projectRoot + sep;
  let skillToolCommands = await getSkillToolCommands(getProjectRoot(), toolUseContext.storageV5);
  if (toolUseContext.agentId === undefined)
    skillToolCommands = filterCommandsByAllowlist(skillToolCommands, getSessionSkillAllowlist());
  let S = new Map();
  for (let skillToolCommand of skillToolCommands)
    if (skillToolCommand.type === "prompt" && skillToolCommand.skillRoot)
      S.set(skillToolCommand.skillRoot, skillToolCommand.name);
  let attachments = [];
  let perDirResults = await Promise.all(
    r.map(async (skillDir) => {
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
            let we = S.get(resolve_2(skillDir, name));
            if (!we || !isNonEmptyIdentifier(we)) return null;
            return we;
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
    let Z = relative(projectRoot, skillDir);
    if (CONTROL_CHARS_OR_ANGLE_RE.test(Z) || !skillDir.startsWith(h)) continue;
    attachments.push({
      type: "dynamic_skill",
      skillDir,
      skillNames,
      displayPath: Z,
      ...getSkillAttachmentExtras(toolUseContext.options.tools),
    });
  }
  return attachments;
}
//@ chunk-e6aww6q8.js:3365645-3365687 layout
/**
 * getSkillListingAttachments 的转发包装。
 */
async function getSkillListingAttachmentsLazy(...e) {
  return getSkillListingAttachments(...e);
}
//@ chunk-e6aww6q8.js:3365687-3366805 fingerprint = getSkillListingAttachments (0.674)
/**
 * 有 Skill 工具时产出 skill_listing：首次完整列表，之后只给新增（对比历史 digest），带技能数与名字。
 */
async function getSkillListingAttachments(toolUseContext, messages) {
  if (getDisableSlashCommands()) return [];
  if (!toolUseContext.options.tools.some((t) => toolMatchesName(t, SKILL))) return [];
  let skillToolCommands = await getSkillToolCommands(getProjectRootOrNull(), toolUseContext.storageV5);
  let s = hiddenCommandsWhenSlashDisabled(toolUseContext.getMcp().commands);
  let filtered = memorySkillCommands().filter((we) => !we.disableModelInvocation && !isHiddenFromModel(we));
  let y = mcpPromptCommandsWithReserved(toolUseContext.getMcp().commands);
  let S = dropSyncedNameClashes(skillToolCommands, y);
  let mcpSkills = dedupeBundledSkills(
    s.length > 0
      ? dropShadowedFallbackSkills(Ji([...S, ...filtered, ...s], "name"))
      : Ji([...S, ...filtered], "name"),
  );
  let { agentContext } = toolUseContext;
  if (
    isMainConversationContext(agentContext) ||
    (agentContext.agentType === "subagent" &&
      agentContext.isBuiltIn === true &&
      agentContext.subagentName === FORK)
  )
    mcpSkills = filterCommandsByAllowlist(mcpSkills, getSessionSkillAllowlist());
  let G = new Map();
  for (let cmd of messages)
    if (cmd.type === "attachment" && cmd.attachment.type === "skill_listing") {
      let { names = [], digests } = cmd.attachment;
      for (let [Ie, Me] of names.entries()) G.set(Me, (G.get(Me) ?? new Set()).add(digests?.[Ie]));
    }
  let newSkills = mcpSkills.filter((cmd) => {
    let Ee = G.get(cmd.name);
    return !Ee?.has(undefined) && !Ee?.has(getSkillListingDigest(cmd));
  });
  if (newSkills.length === 0) return [];
  let isInitial = G.size === 0;
  logForDebugging(`Sending ${newSkills.length} skills via attachment (${isInitial ? "initial" : "dynamic"})`);
  let contextWindowTokens = getContextWindow(toolUseContext.options.mainLoopModel, getSdkBetas());
  return [
    {
      type: "skill_listing",
      content: formatCommandsWithinBudget(
        newSkills,
        (we) => getSkillUsageScore(we.name),
        contextWindowTokens,
        bytesPerTokenForModel(toolUseContext.options.mainLoopModel),
        [...(await getCommands(getProjectRootOrNull(), toolUseContext.storageV5)), ...y],
      ),
      skillCount: newSkills.length,
      isInitial,
      names: newSkills.map((newSkill) => newSkill.name),
      ...getSkillAttachmentExtras(toolUseContext.options.tools),
      digests: newSkills.map(getSkillListingDigest),
    },
  ];
}
//@ chunk-e6aww6q8.js:3366805-3367028 fingerprint = extractAtMentionedFiles (0.486)
/**
 * 从输入中提取 @ 文件提及（@"带空格路径" 与普通 @path，排除 (agent)）。
 */
function extractAtMentionedFiles(content) {
  let quotedAtMentionRegex = new RegExp(String.raw`(^|${WORD_BOUNDARY_PATTERN})@"([^"]+)"`, "g");
  let r = [];
  let match;
  while ((match = quotedAtMentionRegex.exec(content)) !== null)
    if (match[2] && !match[2].endsWith(" (agent)")) r.push(match[2]);
  let filtered = extractAtTokens(content, false).filter((match) => !match.startsWith('"'));
  return uniq([...r, ...filtered]);
}
//@ chunk-e6aww6q8.js:3367028-3367064 layout
/**
 * 提取 @server:uri 形式的 MCP 资源提及。
 */
function extractMcpResourceMentions(e) {
  return uniq(extractAtTokens(e, true));
}
//@ chunk-e6aww6q8.js:3367064-3367395 layout
/**
 * 按空白切词找 @ 后的 token（可要求含冒号），去掉尾部成对标点。
 */
function extractAtTokens(e, n) {
  let r = [];
  if (!e.includes("@")) return r;
  for (let [s] of e.matchAll(/[^\s]+/g)) {
    let index = s.indexOf("@");
    while (index > 0 && !CJK_PUNCTUATION.includes(s[index - 1])) index = s.indexOf("@", index + 1);
    if (index === -1) continue;
    let y = n ? s.indexOf(":", index + 2) : index;
    if (y === -1) continue;
    let S = s.length;
    while (S >= y + 2 && isWordCharCodeAt(s, S - 1) === isWordCharCodeAt(s, S)) S--;
    if (S >= y + 2) r.push(s.slice(index + 1, S));
  }
  return r;
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
//@ chunk-e6aww6q8.js:3367674-3367881 fingerprint = parseAtMentionedFileLines (1)
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
function logDiagnosticsInjected(e, n) {
  logEvent("tengu_lsp_diagnostics_injected", {
    diagnostics_chars: formatNewDiagnosticsAttachment(e).length,
    diagnostic_count: e.reduce((acc, s) => acc + s.diagnostics.length, 0),
    file_count: e.length,
    source: fromEnum(n),
  });
}
//@ chunk-e6aww6q8.js:3368060-3368126 layout
/**
 * 工具列表含编辑类工具（诊断附件前提）。
 */
function hasFileEditTools(e) {
  return e.some((n) => SHELL_TOOL_NAMES_3.some((r) => toolMatchesName(n, r))) || alwaysFalseStream(e);
}
//@ chunk-e6aww6q8.js:3368126-3368301 fingerprint = getDiagnosticAttachments (0.782)
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
//@ chunk-e6aww6q8.js:3368301-3368866 fingerprint = getLSPDiagnosticAttachments (0.958)
/**
 * LSP 待发诊断 → diagnostics 附件。
 */
async function getLSPDiagnosticAttachments(tools, session) {
  if (!hasFileEditTools(tools)) return [];
  logForDebugging("LSP Diagnostics: getLSPDiagnosticAttachments called");
  try {
    let diagnosticSets = checkForLSPDiagnostics(session);
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
      clearAllLSPDiagnostics(session);
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
//@ chunk-e6aww6q8.js:3368866-3369068 fingerprint = getAttachmentMessages (0.686)
/**
 * getAttachmentMessages：调用 getAttachments，记 tengu_attachments（类型与 token 估算），逐个包装成 attachment 消息产出；记录本轮附件耗时。
 */
async function* getAttachmentMessages(
  input,
  toolUseContext,
  ideSelection,
  queuedCommands,
  h,
  messages,
  querySource,
  options,
) {
  let L = new AttachmentTimingProfile();
  let G = await runWithQueryProfile(L, () =>
    getAttachments(input, toolUseContext, ideSelection, queuedCommands, messages, querySource, options),
  );
  if (G.length > 0) {
    logEvent("tengu_attachments", buildAttachmentsEventPayload(G, querySource));
    for (let attachment of G) yield createAttachmentMessage_2(attachment, h);
  }
  let q = L.finish();
  if (!toolUseContext.agentId) noteAttachmentPass(q);
}
//@ chunk-e6aww6q8.js:3369068-3369320 layout
/**
 * tengu_attachments 事件字段：附件类型、token 估算、技能列表是否完整、querySource。
 */
function buildAttachmentsEventPayload(e, n) {
  let found = e.find((h) => h.type === "skill_listing");
  let attachmentTokenEstimates;
  try {
    attachmentTokenEstimates = e.map((h) => fromNumber(roughTokenCountEstimationForObject(h)));
  } catch (error) {
    logError(error);
  }
  return {
    attachment_types: e.map((h) => fromEnum(h.type)),
    attachment_token_estimates: attachmentTokenEstimates,
    ...(found && {
      skill_listing_is_full: found.isInitial,
    }),
    ...(n && {
      query_source: agentTypeForTelemetry(n),
    }),
  };
}
//@ chunk-e6aww6q8.js:3369320-3370101 fingerprint = tryGetPDFReference (0.732)
/**
 * PDF 超过页数/大小阈值或模型按页读取时，返回 pdf_reference（只给引用，不内联内容）。
 */
async function tryGetPDFReference(filename, mainLoopModel, r) {
  let ext = parse(filename).ext.toLowerCase();
  if (!isDocumentExtension(ext)) return null;
  try {
    let [stats, pdfPageCount] = await Promise.all([
      r ?? getFsImplementation().stat(filename),
      getPdfPageCount(r?.ioPath ?? filename, r),
    ]);
    let effectivePageCount = Math.ceil(stats.size / 102400);
    let w =
      pdfPageCount.pageCount !== null
        ? pdfPageCount.pageCount > MAX_PDF_PAGES_PER_TURN
        : effectivePageCount > MAX_PDF_PAGES_PER_TURN ||
          (await isUncountedPDFOverWholeReadCap(stats.size, pdfPageCount.pdfinfoFailure));
    let L = !isNotClaude3Model(mainLoopModel);
    let effectivePageCount_2 = !w && L;
    if (w || effectivePageCount_2) {
      logEvent("tengu_pdf_reference_attachment", {
        pageCount: pdfPageCount.pageCount ?? effectivePageCount,
        fileSize: stats.size,
        hadPdfinfo: pdfPageCount.pageCount !== null,
        ...(effectivePageCount_2 && {
          wholeRefusedByModel: effectivePageCount_2,
        }),
        ...(L && {
          modelReadsByPage: L,
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
        ...(L && {
          modelReadsByPage: L,
        }),
      };
    }
  } catch {}
  return null;
}
//@ chunk-e6aww6q8.js:3370101-3373785 fingerprint = generateFileAttachment (0.627)
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
  let q = landingPaths;
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
    let we = await tryGetPDFReference(filename, toolUseContext.options.mainLoopModel);
    if (we) {
      logEvent(successEventName, {});
      logAtMention({
        mentionType: "file",
        success: true,
      });
      return we;
    }
  }
  let Z;
  if (isReadRestricted && mode === "at-mention" && options?.sizeProbe !== "none") {
    let we = await readPinnedFile(
      filename,
      q,
      toolUseContext.abortController.signal,
    )(async (Ee, Ae) => ({
      size: Number(Ae.size),
      modified: Number(Ae.mtimeMs),
      pdfRef: await tryGetPDFReference(filename, toolUseContext.options.mainLoopModel, {
        ioPath: Ee.ioPath,
        size: Number(Ae.size),
        handle: Ee.handle,
        signal: toolUseContext.abortController.signal,
      }),
    }));
    Z = we?.modified;
    if (
      we !== undefined &&
      we.size > getDefaultFileReadingLimits().maxSizeBytes &&
      !isDocumentExtension(parse(filename).ext.toLowerCase())
    ) {
      logEvent("tengu_attachment_file_too_large", {
        size_bytes: we.size,
        mode: fromEnum(mode),
      });
      options?.onTooLarge?.(we.size);
      return null;
    }
    if (we?.pdfRef) {
      logEvent(successEventName, {});
      logAtMention({
        mentionType: "file",
        success: true,
      });
      return we.pdfRef;
    }
  }
  let existingFileState = toolUseContext.readFileState.get(filename);
  let ke =
    existingFileState !== undefined &&
    mode === "at-mention" &&
    hasClearedToolResultsAfterIdle(
      toolUseContext.messages,
      toolUseContext.options.mainLoopModel,
      new Date().toISOString(),
      toolUseContext.session,
    );
  if (existingFileState && mode === "at-mention") {
    let we =
      hasFullFileContent(existingFileState) &&
      (existingFileState.content !== "" || (existingFileState.contentLength ?? 0) === 0) &&
      !ke;
    try {
      if (
        we &&
        (isReadRestricted ? Z : await getFileModificationTimeAsync(filename)) === existingFileState.timestamp
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
        let We = ke
          ? {
              ...toolUseContext,
              dedupUnchangedReads: false,
            }
          : toolUseContext;
        let result = await FileReadTool.call(
          truncatedInput,
          isReadRestricted ? await stashAttachedReadPermission(filename, q, We) : We,
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
    let Ie =
      options?.pdfAbortParent !== undefined && isImageOrPdfExtension(filename)
        ? createChildAbortController(options.pdfAbortParent)
        : undefined;
    try {
      let Me = ke
        ? {
            ...toolUseContext,
            dedupUnchangedReads: false,
          }
        : toolUseContext;
      let We = await FileReadTool.call(
        fileInput,
        isReadRestricted ? await stashAttachedReadPermission(filename, q, Me) : Me,
        undefined,
        undefined,
        undefined,
        {
          pdfRenderSignal: Ie?.signal,
        },
      );
      recordToolUsed(FileReadTool.name);
      if (We.data.type === "file_unchanged") {
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
          content: We.data,
        };
      }
      if (We.data.type === "text" && We.data.file.truncatedByTokenCap === true)
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
          We.data.type === "pdf"
            ? {
                ...We.data,
                file: {
                  ...We.data.file,
                  base64: "",
                },
              }
            : We.data,
        displayPath: relative(getCwd(), filename),
      };
    } catch (error) {
      if (
        error instanceof MaxFileReadTokenExceededError ||
        error instanceof FileTooLargeError ||
        error instanceof SelectedRangeTooLargeError
      )
        return await readTruncatedFile();
      if (Ie?.signal.aborted && error instanceof AbortError_2) return null;
      throw error;
    } finally {
      Ie?.abort();
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
//@ chunk-e6aww6q8.js:3374007-3374459 fingerprint = getTodoReminderTurnCounts (1)
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
//@ chunk-e6aww6q8.js:3374608-3375014 fingerprint = getTodoReminderAttachments (0.943)
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
    let S = toolUseContext.getAppState().todos[todoKey] ?? [];
    return [
      {
        type: "todo_reminder",
        content: S,
        itemCount: S.length,
      },
    ];
  }
  return [];
}
//@ chunk-e6aww6q8.js:3375014-3375477 fingerprint = getTaskReminderTurnCounts (1)
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
//@ chunk-e6aww6q8.js:3375477-3375851 fingerprint = getTaskReminderAttachments (0.791)
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
function getToolSearchReminderTurnCounts(e) {
  let n = -1;
  let r = -1;
  let s = 0;
  let h = 0;
  for (let idx = e.length - 1; idx >= 0; idx--) {
    let S = e[idx];
    if (S?.type === "assistant") {
      if (isThinkingOnlyMessage(S)) continue;
      if (
        n === -1 &&
        "message" in S &&
        Array.isArray(S.message?.content) &&
        S.message.content.some((w) => w.type === "tool_use" && w.name === TOOL_SEARCH_TOOL_NAME)
      )
        n = idx;
      if (n === -1) s++;
      if (r === -1) h++;
    } else if (r === -1 && S?.type === "attachment" && S.attachment.type === "tool_search_usage_reminder")
      r = idx;
    if (n !== -1 && r !== -1) break;
  }
  return {
    turnsSinceLastToolSearch: s,
    turnsSinceLastReminder: h,
  };
}
//@ chunk-e6aww6q8.js:3376308-3377501 layout
/**
 * 实验配置开启时每 N 轮提醒使用 ToolSearch（tool_search_usage_reminder），不满足条件记 tengu_juniper_shoal_shown。
 */
async function getToolSearchUsageReminderAttachment(messages, toolUseContext, r, declaredToolSource) {
  let h = toolSearchReminderConfig();
  if (h === null) return [];
  if (!messages || messages.length === 0) return [];
  let { turnsSinceLastToolSearch, turnsSinceLastReminder } = getToolSearchReminderTurnCounts(messages);
  if (turnsSinceLastToolSearch < h.everyNTurns || turnsSinceLastReminder < h.everyNTurns) return [];
  let w = (Z) => {
    if (turnsSinceLastReminder % h.everyNTurns === 0)
      logEvent("tengu_juniper_shoal_shown", {
        delivered: false,
        skipReason: fromEnum(Z),
        everyNTurns: h.everyNTurns,
        turnsSinceLastReminder,
      });
    return [];
  };
  if (getToolSearchMode() !== "tst") return w("mode_not_tst");
  if (!modelSupportsToolReference(toolUseContext.options.mainLoopModel)) return w("model_unsupported");
  if (isVertexModelWithoutToolSearch(getCanonicalName(toolUseContext.options.mainLoopModel)))
    return w("vertex_model_unsupported");
  if (
    !isToolSearchToolAvailable(toolUseContext.options.tools) ||
    toolSearchRejectedOn(toolUseContext.stickyBetas ?? getStickyBetas(), toolUseContext.options.mainLoopModel)
  )
    return w("toolsearch_unavailable");
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
  if (sorted.length === 0) return w("no_undiscovered_tools");
  let q = false;
  try {
    q = await r();
  } catch {
    q = false;
  }
  if (q) return w("task_reminder_same_turn");
  logEvent("tengu_juniper_shoal_shown", {
    delivered: true,
    undiscoveredCount: sorted.length,
    listedCount: Math.min(sorted.length, h.maxNames),
    everyNTurns: h.everyNTurns,
    maxNames: h.maxNames,
  });
  return [
    {
      type: "tool_search_usage_reminder",
      undiscoveredToolNames: sorted.slice(0, h.maxNames),
      undiscoveredCount: sorted.length,
    },
  ];
}
//@ chunk-e6aww6q8.js:3377501-3377849 fingerprint = getUnifiedTaskAttachments (0.833)
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
  let h =
    isAutoMemoryEnabled() && process.env.CLAUDE_COWORK_MEMORY_INDEX_CONTENT !== ""
      ? getAutoMemEntrypoint()
      : null;
  let y = messagesSinceCompactBoundary(messages);
  let S = latestInstructionFiles(y);
  let nestedMemoryContents = collectNestedMemoryContents(y);
  let L = (G) =>
    G === h || toolUseContext.readFileState.has(G) || S?.has(G) === true || nestedMemoryContents.has(G);
  toolUseContext.setAppState((G) =>
    G.pendingMemoryUpdates.length === 0
      ? G
      : {
          ...G,
          pendingMemoryUpdates: [],
        },
  );
  return mapped.concat(
    pendingMemoryUpdates.map((pendingMemoryUpdate) => ({
      type: "memory_update",
      source: pendingMemoryUpdate.source,
      summary: pendingMemoryUpdate.summary,
      paths: pendingMemoryUpdate.paths,
      inContextPaths: pendingMemoryUpdate.paths.filter(L),
    })),
  );
}
//@ chunk-e6aww6q8.js:3378450-3379394 fingerprint = getAsyncHookResponseAttachments (0.774)
/**
 * 已完成的异步钩子响应 → async_hook_response 系列附件（SessionStart 重复输出跳过）。
 */
async function getAsyncHookResponseAttachments(e) {
  let responses = await checkForNewAsyncHookResponses();
  if (responses.length === 0) return [];
  logForDebugging(`Hooks: getAsyncHookResponseAttachments found ${responses.length} responses`);
  let r = responses.some((response) => response.hookEvent === "SessionStart")
    ? messagesSinceCompactBoundary(e).flatMap((h) => (h?.type === "attachment" ? [h.attachment] : []))
    : [];
  let s = [];
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
        r,
      )
    ) {
      logForDebugging(
        `Hooks: Not adding the output of ${processId} (${hookName}) to the conversation: Claude already sees the same text from an earlier SessionStart run`,
      );
      continue;
    }
    logForDebugging(`Hooks: Creating attachment for ${processId} (${hookName}): ${jsonStringify(response)}`);
    let we = {
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
    s.push(we);
    r.push(we);
  }
  logForDebugging(`Hooks: getAsyncHookResponseAttachments found ${s.length} attachments`);
  return s;
}
//@ chunk-e6aww6q8.js:3379394-3379803 file-local
/**
 * 把已附加的非结构化邮箱消息标记为已读（失败则下轮再附加）。旧版名 getTeammateMailboxAttachments 不准确。
 */
async function markMailboxMessagesRead(agentName, teamName, r, store) {
  if (r.length === 0) return;
  let pendingIds = new Set(r.map(messageIdentityKey));
  let y = await markMessagesAsReadByPredicate(
    agentName,
    (S) => pendingIds.has(messageIdentityKey(S)),
    teamName,
    store,
  );
  logForDebugging(
    y
      ? `[MailboxBridge] marked ${r.length} non-structured message(s) as read for agent="${agentName}" team="${teamName || "default"}"`
      : `[MailboxBridge] could not mark ${r.length} non-structured message(s) read for agent="${agentName}" team="${teamName || "default"}"; they will be attached again next turn`,
    {
      level: y ? "debug" : "warn",
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
//@ chunk-e6aww6q8.js:3379852-3380299 fingerprint = getTeamContextAttachment (0.901)
/**
 * 代理团队成员首轮产出 team_context（团队名、配置与任务列表路径、是否有任务工具）。
 */
function getTeamContextAttachment(messages) {
  let teamName = getTeamName();
  let agentId = getAgentId();
  let agentName = getAgentName();
  if (!teamName || !agentId) return [];
  if (messages.some((m) => m.type === "assistant")) return [];
  let y;
  let configDir = getTeammateContext();
  if (configDir) {
    for (let message of messages)
      if (message.type === "attachment" && message.attachment.type === "team_context") {
        y = message.attachment.hasTaskListTools;
        break;
      }
    y ??= configDir.hasTaskListTools;
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
      hasTaskListTools: y,
    },
  ];
}
//@ chunk-e6aww6q8.js:3380299-3380461 fingerprint = getTokenUsageAttachment (1)
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
  mainLoopModel,
  agentId,
  h,
  totalTokensReminderBudget,
  S,
) {
  let totalTokensReminderMode = getTotalTokensReminderMode(mainLoopModel, totalTokensReminderBudget);
  if (totalTokensReminderMode === "off") return [];
  let L = agentId ?? "main";
  let G = tokenCountFromLastAPIResponse(usage);
  let q = totalTokensReminderByRoot.of(session);
  if (h) q.reanchorTaskBudget(L, G);
  if (totalTokensReminderBudget !== undefined && S)
    q.excludeStartContext(L, () => getMinInputTokensSinceLastCompact(usage));
  let Z =
    totalTokensReminderMode === "countdown"
      ? getContextWindow(mainLoopModel, getSdkBetas()) - G
      : totalTokensReminderMode === "padded-countdown"
        ? q.remaining(L, G, totalTokensReminderBudget ?? getTotalTokensReminderBudget())
        : 0;
  return [
    {
      type: "total_tokens_reminder",
      text: formatTotalTokensTag(totalTokensReminderMode, Z),
    },
  ];
}
//@ chunk-e6aww6q8.js:3380786-3381047 layout = getTokenCountFromUsage (0.754)
/**
 * 最近一次压缩边界之后各回答 usage 的输入 token（首个与最后一个中较小者）。
 */
function getMinInputTokensSinceLastCompact(usage) {
  let n = usage.findLastIndex(isForkBoilerplateMessage) + 1;
  let r;
  let s;
  for (let h = n; h < usage.length; h++) {
    let tokenUsage = getTokenUsage(usage[h]);
    if (!tokenUsage) continue;
    let tokenCountFromUsage = getTokenCountFromUsage_5(tokenUsage);
    let w =
      tokenCountFromUsage.input_tokens +
      tokenCountFromUsage.cache_creation_input_tokens +
      tokenCountFromUsage.cache_read_input_tokens;
    if (w > 0) {
      r ??= w;
      s = w;
    }
  }
  return r === undefined || s === undefined ? undefined : Math.min(r, s);
}
//@ chunk-e6aww6q8.js:3381047-3381159 fingerprint = getMaxBudgetUsdAttachment (1)
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
//@ chunk-bnwcqde4.js:4394-4502 fingerprint = createAttachmentMessage (1)
/**
 * 把一个 Attachment 包成内部 attachment 消息 {type:"attachment", uuid, timestamp, attachment}（jlr 规整附件字段）。
 */
function createAttachmentMessage(t, condition) {
  return {
    type: "attachment",
    uuid: randomUUID(),
    timestamp: new Date().toISOString(),
    attachment: buildGoalSentinelAttachment(t, condition),
  };
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
