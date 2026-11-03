/**
 * services/tools/toolExecution.ts
 *
 * 单次工具调用的生命周期：输入 JSON/schema 校验、validateInput、PreToolUse hooks、权限决策、tool.call、结果映射与持久化、PostToolUse hooks、遥测；runToolUse 入口（chunk-e6aww6q8#$B）在 _unattributed
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/services/tools/toolExecution.ts
 * pieces: chunk-bk5ntezz.js (1), chunk-e6aww6q8.js (124)
 * attribution: fingerprint 8, placement 102, layout 15
 */
import { AsyncLocalStorage } from "async_hooks";
import { randomUUID } from "crypto";
import {
  fromSanitizer_SANITIZER_OUTPUT_ONLY,
  concatSafe,
  lit as lit_2,
  fromEnum,
  fromEnumOpt,
  fromEnumArr,
} from "../analytics/safeMetadata.js";
import {
  decisionReasonDisplayString,
  findDecidingRule,
} from "../../components/permissions/PermissionDecisionDebugInfo.js";
import { getScheduledByPlugin } from "../../utils/workloadContext.js";
import { CRON_CREATE_TOOL_NAME } from "../../tools/ScheduleCronTool/prompt.js";
import { SCHEDULE_WAKEUP_TOOL_NAME } from "../../tools/ScheduleWakeupTool/prompt.js";
import {
  getSessionCronTasks,
  isDiskless,
  getIsNonInteractiveSession,
  getRootSession,
  getStickyBetas,
  getStatsStore,
  getCodeEditToolDecisionCounter,
  isCcsTenant,
  addToToolDuration,
} from "../../bootstrap/state.js";
import {
  PERSISTED_OUTPUT_TAG,
  PERSISTED_OUTPUT_CLOSING_TAG,
  TRUNCATED_OUTPUT_TAG,
  TRUNCATED_OUTPUT_CLOSING_TAG,
  mapAndMaybePersistToolResult,
  getOriginalCwd as getOriginalCwd_2,
  isToolResultContentEmpty,
  exceedsPersistThreshold,
  getPersistenceThreshold,
  toolResultsDirFor_2,
  processToolResultBlock,
} from "../../utils/toolResultStorage.js";
import { MAX_MCP_RESULT_CHARS, MAX_OUTPUT_CHARS_SMALL } from "../../constants/outputLimits.js";
import { isTextBlock } from "../../utils/messages/textLineCount.js";
import { truncateToLength } from "../../utils/stringUtils.js";
import {
  forgetOpenCall,
  forgetWithheldCall,
  setOpenCall,
} from "../../plugins/functionHooks/toolCallHooks.js";
import {
  isAbortError,
  isSyscallError,
  isSadFsErrno,
  isEnvFsErrno,
  withTelemetryMessage,
  TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS,
  sanitizeErrnoForTelemetry,
  errorMessage,
  toError,
  ShellError,
  AbortError as AbortError_2,
  MalformedCommandError,
  getErrnoCode,
  StreamClosedAbortError,
} from "../../utils/errors.js";
import {
  isRunUnchanged,
  shouldApplyManagedRewrite,
  makeErrorResultAppender,
  dropBlockingErrors,
  shouldKeepToolResultInSubagents,
  shouldRunManagedLink,
  hookErrorToolResult,
  stripToolResultBlock,
  runPostToolUseHooksForMemory,
  toolDurationMsOf,
  ranWithoutError,
  withoutToolResultBlock,
  findToolResultBlock,
  replaceToolResult,
  isHookStoppedMessage,
  buildHookStoppedMessage,
  shouldRunManagedToolHooks,
  runToolCallPostHooks,
  findRunInputForResult,
  buildToolCallContextMessage,
  capAdditionalContext,
  createToolCallChain,
  runPreToolUseHooks,
  getHookUpdatedInput,
  resolvePermissionDecisionForCall,
  runPostToolUseHooks,
  runPostToolUseFailureHooks,
} from "./toolHooks.js";
import { logForDebugging, createAttachmentMessage_2 } from "../../utils/debug.js";
import {
  toolInputOf,
  EDIT_SOURCE_KINDS,
  MAX_REQUEST_META_BYTES,
  COM_ANTHROPIC_SOURCES_RELAY,
  COM_ANTHROPIC_PLUGIN_META_CUT,
  withAgentId,
  toolCallEvent,
  stripHostToolMeta,
} from "../../plugins/functionHooks/sites/toolSites.js";
import {
  createUserMessage,
  TOOL_CALL_SKIPPED_BY_SIBLING_DENIAL,
  TOOL_CALL_SKIPPED_FOR_DELIVERY,
  CANCEL_MESSAGE,
  stringifyToolResult,
  withMemoryCorrectionHint,
  createProgressMessage,
  createCancelledToolResultBlock,
  PERMISSION_DENIED_RETRY_TEXT,
  asSubagentFrameResult,
} from "../../utils/messages.js";
import { CHECKER_NO_ANSWER } from "../../plugins/functionHooks/hostBridge.js";
import { asStringList, UI_ENV_SITE_RULES } from "../../plugins/functionHooks/sites/siteRules.js";
import { logError } from "../../utils/log.js";
import { string } from "../../../vendor/zod/v4/classic/schemas.js";
import { env } from "../../utils/env.js";
import { logEvent } from "../analytics/index.js";
import {
  callFrameCwd,
  getCwdOrNull,
  realPathOutcomeSync,
  callFramePhysicalMatches,
} from "../../utils/cwd.js";
import { runInRemoteCallFrame } from "../../remote/remoteMode.js";
import { logFeatureSad, logFeatureOk, logFeatureBad, toolFeature } from "../analytics/featureTelemetry.js";
import {
  unwrapAbortReason,
  classifyAbortReasonForTelemetry,
  shutdownInterruptStamp,
  isServerFallbackDiscard,
  turnAbortControllerOf,
  userAbortReason,
} from "../../utils/abortController.js";
import { getFeatureValue_CACHED_MAY_BE_STALE } from "../analytics/growthbook.js";
import { isPlainObject as isPlainObject_5 } from "../../utils/isPlainObject.js";
import {
  latestPromptSnapshot,
  recordedDeferredTools,
} from "../../utils/contextAttachments/promptSnapshot.js";
import { schemaPropertiesMap, schemaEnumValues, withPlanPath } from "../../utils/api.js";
import { jsonStringify, jsonStringifyRaw, clone } from "../../utils/slowOperations.js";
import {
  CAN_USE_TOOL_ABORTED_REASON,
  CIRCUIT_BREAKER_TRAITS,
  isInvalidInputDeny,
} from "../../types/permissions.js";
import {
  sanitizeRuleCategory,
  getDenyRuleForTool,
  canPromptUserForPermission,
  consumeRepeatedToolCall,
  shouldReplaceMemoryInput,
  arePermissionHooksUnsettled,
} from "../../utils/permissions/permissions.js";
import { BASH_TOOL_NAME } from "../../tools/BashTool/toolName.js";
import { exceedsLineLimit } from "../../utils/terminal.js";
import { getCanonicalName } from "../../utils/model/canonicalModelName.js";
import { isModelCapabilityEnabled } from "../../utils/model/promptBundles.js";
import {
  getMcpPrefix as getMcpPrefix_2,
  getToolNameForPermissionCheck as getToolNameForPermissionCheck_4,
  mcpInfoFromString,
  resolveMcpConnectionForTool,
  buildMcpToolName,
} from "../mcp/mcpStringUtils.js";
import { REMOTE_DEVICES, CLAUDE_ARTIFACTS } from "../mcp/firstPartyServerIds.js";
import { IOS_SIMULATOR_DISPLAY_NAME, ANDROID_EMULATOR_DISPLAY_NAME } from "../routines/routinesApi.js";
import { isChromeToolName, CHROME_TOOL_PREFIXES } from "../../utils/claudeInChrome/chromeToolNames.js";
import { isClassifiableBrowserCall } from "../../utils/permissions/browserComputerUseTools.js";
import { TOOL_SEARCH_TOOL_NAME, isDeferredToolInConversation } from "../../tools/ToolSearchTool/prompt.js";
import { SessionRootSlot, isNoProjectDirectoryError } from "../../bootstrap/sessionSlices.js";
import { HEARTH_READ_TOOLS } from "../mcp/ccrMetaMcp.js";
import { hasMcpInboundDoor } from "../mcp/mcpInboundDoor.js";
import { RawJson } from "../../bridge/readReceipts.js";
import {
  isToolReferenceWithName,
  isToolSearchEnabledOptimistic,
  isToolSearchToolAvailable,
  extractDiscoveredToolNames,
  isToolSearchPrecluded,
  getToolSearchMode,
} from "../../utils/toolSearch.js";
import { MAX_JSON_NESTING } from "../../utils/jsonScan.js";
import {
  CLAUDE_ENDTURN,
  CLAUDE_ENDTURNHONORSSTOPHOOKS,
  formatMcpStructuredContent,
} from "./mcpResultMeta.js";
import { isSnappyPlumOn } from "../../plugins/functionHooks/sessionApi.js";
import {
  CLAUDE_DEVICE,
  ALL_BROWSER_TOOL_PREFIXES,
  isAutoAllowedInMode,
} from "../../utils/permissions/browserToolNames.js";
import { findToolByName, runAfterResultCommitted } from "../../Tool.js";
import { currentMcpClients } from "../compact/idleToolResultClearing.js";
import {
  getConnectionTimeoutMs,
  McpAuthError,
  McpToolCallError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS,
  isEntryRowNotServed,
  describeMissingRequiredArgs,
} from "../mcp/client.js";
import { sleep } from "../../utils/sleep.js";
import { isUnparsedInputMarker, UNPARSED_TOOL_INPUT_KEY } from "../../utils/json.js";
import { getMemoryBaseDir } from "../../tools/FileEditTool/utils.js";
import {
  isRemoteOnlyCheck,
  getCheckRunner,
  getRegisteredCheck,
  forgetPendingCheck,
} from "../../utils/permissions/checkRegistry.js";
import { canRunToolsOnThisMachine, hasHostField, splitHostField } from "../../bridge/deviceRegistration.js";
import { expandStablePath, NullBytePathError, UnstablePathError } from "../../utils/path.js";
import { isPathWithinCaseAware } from "../../utils/pathPrefix.js";
import { startSessionActivity, endActivity, currentActivityState } from "../../utils/sessionActivity.js";
import { createCombinedAbortSignal } from "../../utils/combinedAbortSignal.js";
import { walkPermissionCheckPathsAsync } from "../../utils/fsOperations.js";
import { isTerminalShutdown, heldUntilExit } from "../../utils/terminalShutdown.js";
import {
  getToolPermissionContext,
  getMainLoopModel as getMainLoopModel_2,
  getEffortValue,
  getEffortLayerOverride,
} from "../../utils/permissions/toolPermissionContext.js";
import { getEffortLevelIfSupported } from "../../utils/effort.js";
import { getRuntimeMainLoopModel } from "../../utils/model/planModeModel.js";
import { doesMostRecentAssistantMessageExceed200k } from "../../utils/tokens.js";
import { hasRelaySource } from "../projectsRelay/relayConfig.js";
import { FILE_EDIT_TOOL_NAME } from "../../tools/FileEditTool/constants.js";
import { roughTokenCountEstimationForContent } from "../tokenEstimation.js";
import { count, uniq } from "../../utils/collections.js";
import {
  sdkHostToolSource,
  sanitizeToolNameWithMcpFlag,
  isMcpServerLoggableInAnalytics,
  extractMcpToolDetails,
  sanitizeToolNameForAnalytics,
  getUnknownToolAnalyticsName,
  claudeAiServerIdField,
  mcpToolDetailsForAnalytics,
  isToolDetailsLoggingEnabled,
  mcpToolAnalyticsFields,
  builtinToolServedByMcp,
  extractSkillName,
  extractSubagentType,
  extractToolInputDetailsForAnalytics,
  toolSourceMetadata,
  extractToolInputForTelemetry_2,
  isMedia,
  getFileExtensionForAnalytics,
  getFileExtensionsFromBashCommand_2,
  extensionsInCommand,
  logToolFileActivity,
} from "../analytics/metadata.js";
import {
  getLoggingSafeMcpBaseUrl,
  RETRYABLE_CONNECT_CODES,
  getMcpToolScope,
  isMcpTool,
} from "../mcp/utils.js";
import { findTool, areDeferredToolsKept, deferredToolCache } from "../api/deferredToolsState.js";
import {
  toolNameForTelemetry,
  clonedHookInput,
  rebaseOriginIfInputChanged,
  logToolSafetyEvent,
  logHookPushbacks,
  rebaseBatchHookOrigins,
  logToolDecision,
  toDecisionRecord,
} from "./toolDecisionTelemetry.js";
import { isArtifactFamilyTool } from "../artifacts/rosterWait.js";
import {
  isBuiltInArtifactHiddenForMcp,
  ARTIFACTS_MCP_READ_TOOL,
  ARTIFACTS_MCP_GET_TOOL,
  ARTIFACTS_MCP_READ_SHARED_TOOL,
} from "../artifacts/artifactsMcpTools.js";
import { shortHash } from "../../utils/shortHash.js";
import { sanitizeMarkName } from "../../utils/startupMarks.js";
import {
  getSubagentTelemetryFields,
  getBackgroundAgentId,
  isDelegatedObservationContext,
} from "../../utils/agentContext.js";
import { entrypointForTelemetry } from "../api/logging.js";
import { safeOrigin } from "../mcp/ccrMcpUrls.js";
import { connectorServerId } from "../mcp/claudeai.js";
import { isCancel } from "../../../vendor/axios/dist/esm/axios.js";
import { formatToolErrorMessage, formatZodValidationError } from "../../utils/toolErrors.js";
import { MaxFileReadTokenExceededError } from "../../tools/FileReadTool/FileReadTool.js";
import { KNOWN_ERROR_CLASS_NAMES } from "../../utils/telemetry/errorClassNames.js";
import { WEBFETCH } from "../../tools/WebFetchTool/prompt.js";
import { isByocEnvironment, isRemoteManagedEnvironment } from "../../utils/remoteEnvironment.js";
import {
  ARTIFACT_TOOL_NAME as ARTIFACT_TOOL_NAME_2,
  parseArtifactUrlInput,
} from "../../tools/ArtifactTool/constants.js";
import { aliasOfToolName, toolByAlias } from "./batchTools.js";
import { toolMatchesAnyName } from "./permissionCheckGuard.js";
import {
  EXTERNAL_ALWAYS_AVAILABLE_TOOLS,
  COORDINATOR_MAIN_THREAD_TOOL_NAMES,
  EXTERNAL_ALWAYS_AVAILABLE_TOOLS_2,
} from "../../utils/toolPool.js";
import { POLL } from "../../tools/PollTool/prompt.js";
import { BRIEF_TOOL_NAME as BRIEF_TOOL_NAME_2 } from "../../tools/BriefTool/prompt.js";
import { GET_TASK_TOOL_TEXT, GET_TASK_NOT_A_TOOL_TEXT } from "../../remote/tools/nativeToolErrors.js";
import { isCoordinatorMode_2 } from "../../coordinator/coordinatorMode.js";
import { AGENT, TASK } from "../../tools/AgentTool/constants.js";
import { claudeAiEnvironment } from "../../constants/claudeAiOrigin.js";
import { artifactViewerUrlFor } from "../../tools/ArtifactTool/artifactUrls.js";
import {
  canUseWebFetchAgent,
  canSpawnSubagents,
  getAgentSpawnContext,
  webFetchAgentHookHint,
} from "../../tools/AgentTool/agentToolUtils.js";
import { WEB_FETCH_AGENT } from "../../tools/WebFetchTool/harnessNotes.js";
import { getShadowedSearchToolNames } from "../../utils/embeddedTools.js";
import { isPermanentUnavailabilityFor, describeToolAvailability } from "../mcp/mcpToolAvailability.js";
import { SENDMESSAGE } from "../../tools/SendMessageTool/constants.js";
import {
  isToolOmittedByLaunchToolList,
  isOutsideLaunchToolList,
} from "../../utils/permissions/filterToolsByDenyRules.js";
import { ASKUSERQUESTION } from "../../tools/AskUserQuestionTool/prompt.js";
import { GLOB_TOOL_NAME } from "../../tools/GlobTool/prompt.js";
import { GREP_TOOL_NAME } from "../../tools/GrepTool/prompt.js";
import { CHROME_TOOL_NAMES } from "../../utils/claudeInChrome/common.js";
import { isPlainObject as isPlainObject_4 } from "../../utils/objectUtils.js";
import { appToolServerErrorSuffix } from "../mcp/appToolServerErrors.js";
import { WAITFORMCPSERVERS } from "../../tools/WaitForMcpServersTool/WaitForMcpServersTool.js";
import { normalizeNameForMCP } from "../mcp/normalization.js";
import { mintPasteId } from "../../history.js";
import { POWERSHELL_TOOL_NAME } from "../../tools/PowerShellTool/toolName.js";
import { isGitCommitCommand, resolveCommitInfo } from "../../tools/shared/gitOperationTracking.js";
import { profileCheckpoint_2 } from "../../utils/startupProfiler.js";
import { areAttachmentFilesArriving, waitForAttachmentFiles } from "../../bridge/attachmentFilesWait.js";
import { stagedFilesWaiterByRoot, waitForStagedToolCallFiles } from "../../utils/ccrStageFiles.js";
import {
  createCancelledToolResult,
  attachPermissionDecision,
  findToolResultMessages,
  markRecordGenuine,
  setDecided,
  noteToolTexts,
} from "../../plugins/functionHooks/toolApi.js";
import { cachedDeclaredTools, cachedNoChannelTools } from "../api/declaredToolSet.js";
import { recordToolUsePair } from "../compact/keptTools.js";
import { isConnectedOrCached } from "../../skills/bundled/scheduleRemoteAgents.js";
import {
  checkWebIsolation,
  webIsolationModule,
  ISOLATION_TIMEOUT_MS,
  ISOLATION_NEUTRAL_TOOLS,
  CORE_FILE_TOOLS,
  WEB_TOOLS,
} from "./webToolIsolation.js";
import {
  shouldRouteToolToHost,
  routeToolCallWithAdoption,
  supportsRemoteExecution,
} from "../../utils/remoteTools/toolHostRouting.js";
import { Stream } from "../../utils/stream.js";
import {
  describeCoordinatorRefusal,
  isCoordinatorBashToolUse,
  checkCoordinatorShellCommand,
  clampCoordinatorShellTimeout,
} from "../../tools/ReadNotificationsTool/ReadNotificationsTool.js";
import { clearToolUsePermissionState } from "../../components/permissions/hooks.js";
import { toolCategoryForTelemetry } from "../api/toolDefinitionShape.js";
import {
  cloneIfServerResults,
  isClassifierTargetToolUse,
  lacksServerResult,
  getPermissionModeAtRequestForArbiter,
  describeInputRewrite,
  isShellToolClassified,
  isShellOrFileToolForClassifier,
  applyServerClassifierVerdict,
} from "../../utils/permissions/serverClassifier/arbiter.js";
import { isAutoClassifierActive } from "../../utils/permissions/autoModeState.js";
import { getServerClassifierFallbackMode } from "../../utils/permissions/serverClassifier/flags.js";
import { deepEqualIgnoringUndefined, getSurfacedToolNames } from "../../bootstrap/stateSlices.js";
import { guardAccountMemoryHookRewrite } from "../../utils/hooks/hookUpdatedInput.js";
import { hasModuleHookingSite } from "../../plugins/hooksModules/loadedModuleFilters.js";
import { eventCallersFor2 } from "../../plugins/functionHooks/eventCatalog.js";
import { releaseToolServerHold } from "../../plugins/functionHooks/pluginLifecycle.js";
import { notLoadedToolPolicy } from "../mcp/mcpGates.js";
import { toolInputJsonSchema } from "../../plugins/functionHooks/types/builtinToolSchemas.js";
import { getPluginRegistry } from "../../utils/plugins/pluginLoadState.js";
import { hasLink } from "../../utils/hasLink.js";
import {
  hasOnlyOwnCallbacksToRun,
  getCloudDeferUnsupportedMessage,
  executePermissionDeniedHooks,
} from "../../utils/hooks.js";
import { registerAgent } from "../../utils/telemetry/perfettoTracing.js";
import { getClassifierEpoch, registerClassifiedRun } from "../../utils/conversationRecovery.js";
import { emptyInputRepairConfig } from "../analytics/juniperShoalConfig.js";
import { isEmptyObject, placeholderToolInput } from "../../utils/toolInputPlaceholder.js";
import { errorTelemetryFields } from "../../utils/accessibility/screenReader.js";
import {
  getActiveSpanId,
  isTracingRedacted,
  isSessionTracingEnabled,
  startToolSpan,
  isPerfettoTracingEnabled,
  startToolBlockedOnUserSpan,
  endToolSpan,
  startToolExecutionSpan,
  addToolContentEvent,
  endToolExecutionSpan,
  shouldRecordToolContent,
  stringifyToolContentForSpan,
  isToolContentLoggingEnabled,
  describeErrorWithoutText,
} from "../../utils/telemetry/sessionTracing.js";
import { FILE_READ_TOOL_NAME } from "../../tools/FileReadTool/constants.js";
import { FILE_WRITE_TOOL_NAME } from "../../tools/FileWriteTool/prompt.js";
import { classifyBashCommand } from "../../tools/BashTool/commandClassification.js";
import { isLiveMemoryTool } from "../mcp/memoryServerVerification.js";
import { withholdsFileReferenceErrors } from "../mcp/fileReference/wrapFileReferenceTool.js";
import { isBetaTracingEnabled } from "../../utils/telemetry/betaSessionTracing.js";
import { startPermissionRound, takePermissionRecord } from "../../utils/permissions/permissionRecord.js";
import { logOTelEvent } from "../../utils/telemetry/events.js";
import { getClassifierVerdictAnalyticsFields } from "../../utils/classifierApprovals.js";
import { toExternalPermissionMode } from "../../utils/permissions/PermissionMode.js";
import {
  isCodeEditingTool,
  buildCodeEditToolAttributes,
} from "../../hooks/toolPermission/permissionLogging.js";
import { getApprovalSource } from "../../tools/BashTool/bashTelemetry.js";
import { getToolCallOutcomeCode, getStreamClosedOutcome } from "../../utils/permissions/yoloClassifier.js";
import { getDenialErrorCode, getToolErrorCode } from "./toolErrorCodes.js";
import { ZodError } from "../../../vendor/zod/v4/classic/errors.js";
import {
  stripUnchangedHostOwnedKeys,
  stripHostOwnedInputKeys,
} from "../../utils/permissions/permissionAnswer.js";
import { notRecordedLength } from "../../utils/telemetry/accountMemoryRedaction.js";
import { notifyBridgeSessionListener } from "../../bridge/createSession.js";
import { INJECTED_MACHINE_REFUSAL } from "../../utils/toolUseDisplay.js";
import { markHeadReflog, releaseHeadReflogMark } from "../../utils/git/gitFilesystem.js";
import { BashRepeatMeter } from "../../tools/BashTool/repeatMeter.js";
import {
  detachToolCall,
  runDetachableToolCall,
  DETACHED_TOOL_CALL_FLAG,
  noteHookModifiedFile,
} from "./detachedToolCalls.js";
import { waitForFolderAttached } from "../../utils/remoteTools/folderTargets.js";
import { NOTEBOOK_EDIT_TOOL_NAME } from "../../tools/NotebookEditTool/constants.js";
import { WORKSPACE_BASH_TOOL } from "../../utils/permissions/permissionRuleParser.js";
import { DESIGNSYNC, DESIGNSYNC_METHODS } from "../../tools/DesignSyncTool/DesignSyncTool.js";
import { WEBSEARCH, getWebSearchModeAnalytics } from "../../tools/WebSearchTool/prompt.js";
import { commitAttributes } from "../../utils/telemetry/repositoryAttributes.js";
import { isFirstPartyUploadScope } from "../mcp/fileReference/fileReferencePolicy.js";
import {
  HOST_CONTEXT_LINE_LIMIT,
  isLiveHostContextDisabled,
} from "../../utils/permissions/classifierHostContext.js";
import { getAutoModeConfigOrDefault } from "../../utils/permissions/permissionSetup.js";
import { MESSAGE_MARK_SYMBOLS } from "../../utils/messageKinds.js";
import { isDocsConnectorTool, readFirstJsonPayload } from "../mcp/resultContent.js";
import { getCachedReadingLimit } from "../../tools/FileReadTool/limits.js";
import { getAbortKind } from "./toolAbort.js";
import { abortScopeOf } from "../../utils/abortReasons.js";
import { classifyMcpErrorSourceCategory } from "../mcp/mcpResultErrors.js";
import { logForDiagnosticsNoPII } from "../../utils/diagLogs.js";
import {
  MAX_USAGE_NAME_CHARS,
  INSTRUCTIONS,
  PERSON,
  CLAUDE,
  SUMMARY,
  OTHER,
} from "../../skills/bundled/explainUsage.js";

//@ chunk-e6aww6q8.js:3765505-3765551 placement
/**
 * 把权限决策原因转成可安全展示的文本（经输出清洗器）。
 */
function sanitizedDecisionReasonDisplay(e, n, r, matchedAskRule) {
  return fromSanitizer_SANITIZER_OUTPUT_ONLY(decisionReasonDisplayString(e, n, r, matchedAskRule));
}
//@ chunk-e6aww6q8.js:3783493-3783547 placement
/**
 * 定时任务类工具调用时复制一份结果，供后续修正插件归属。
 */
function cronToolCallResult(name, n) {
  return isCronToolName(name) && isPlainObjectValue(n)
    ? {
        ...n,
      }
    : undefined;
}
//@ chunk-e6aww6q8.js:3783547-3783707 placement
/**
 * 定时任务触发的工具调用：按对应会话定时任务（或当前调度插件）修正结果里的 plugin 归属。
 */
function attributeScheduledPlugin(name, n, toolOutput) {
  if (!isCronToolName(name) || !isPlainObjectValue(toolOutput)) return toolOutput;
  let s = getCronTaskPlugin(isPlainObjectValue(n) ? n : toolOutput) ?? getScheduledByPlugin();
  if (toolOutput.plugin === s) return toolOutput;
  let { plugin, ...y } = toolOutput;
  return s === undefined
    ? y
    : {
        ...y,
        plugin: s,
      };
}
//@ chunk-e6aww6q8.js:3783707-3783745 placement
/**
 * 工具名是 CronCreate 或 ScheduleWakeup。
 */
function isCronToolName(e) {
  return e === CRON_CREATE_TOOL_NAME || e === SCHEDULE_WAKEUP_TOOL_NAME;
}
//@ chunk-e6aww6q8.js:3783745-3783817 placement
function isPlainObjectValue(e) {
  return typeof e === "object" && e !== null && !Array.isArray(e);
}
//@ chunk-e6aww6q8.js:3783817-3783966 placement
function getCronTaskPlugin(e) {
  if (!isPlainObjectValue(e)) return;
  return getSessionCronTasks().find((n) =>
    typeof e.id === "string" ? n.id === e.id : n.kind === "loop" && n.scheduledFor === e.scheduledFor,
  )?.plugin;
}
//@ chunk-e6aww6q8.js:3783966-3784199 placement
/**
 * MCP 结果被持久化或截断标签替换时，为副本保留原始结果的截断版本（钩子调用的除外）。
 */
function restoreMcpResultForCopy(tool, n, { content }, { hookCaller }) {
  return tool.isMcp === true &&
    hookCaller === undefined &&
    typeof content === "string" &&
    content !== n &&
    ((content.startsWith(PERSISTED_OUTPUT_TAG) && content.endsWith(PERSISTED_OUTPUT_CLOSING_TAG)) ||
      (content.startsWith(TRUNCATED_OUTPUT_TAG) && content.endsWith(TRUNCATED_OUTPUT_CLOSING_TAG)))
    ? truncateResultForCopy(
        n,
        content.startsWith(TRUNCATED_OUTPUT_TAG)
          ? Math.min(content.length, MAX_MCP_RESULT_CHARS)
          : MAX_MCP_RESULT_CHARS,
      )
    : n;
}
//@ chunk-e6aww6q8.js:3784199-3784210 placement
var MAX_KEPT_TEXT_BLOCK_CHARS = 32;
//@ chunk-e6aww6q8.js:3784210-3784705 placement
/**
 * 按字符预算截断结果中的文本块，超出部分用"[N more characters are not kept on this copy]"说明。
 */
function truncateResultForCopy(e, n = MAX_MCP_RESULT_CHARS) {
  let r =
    typeof e === "string"
      ? [
          {
            type: "text",
            text: e,
          },
        ]
      : e;
  if (!Array.isArray(r)) return e;
  let s = n + MAX_KEPT_TEXT_BLOCK_CHARS;
  let h = 0;
  let y = false;
  let S = [];
  for (let w of r) {
    if (!isTextBlock(w)) {
      S.push(w);
      continue;
    }
    let L = s - MAX_KEPT_TEXT_BLOCK_CHARS;
    if (w.text.length <= L) {
      s -= w.text.length + MAX_KEPT_TEXT_BLOCK_CHARS;
      S.push(w);
      continue;
    }
    if (w.text === "") continue;
    let G = L > 0 ? truncateToLength(w.text, L) : "";
    h += w.text.length - G.length;
    s = 0;
    y = true;
    if (G !== "")
      S.push({
        ...w,
        text: G,
      });
  }
  if (!y) return e;
  return [
    ...S,
    {
      type: "text",
      text: `[${h} more character${h === 1 ? " is" : "s are"} not kept on this copy of the result]`,
    },
  ];
}
//@ chunk-e6aww6q8.js:3784705-3787120 placement
/**
 * 运行 tool.call 钩子链；对账户记忆服务器的调用，钩子的代答会被记录并警告。
 */
async function runToolCallHooks(
  e,
  { runs, thrown, managedRan, undelivered },
  { tool, input, toolUseContext, assistantMessage, now },
) {
  let toolUseId = input.tool_use_id;
  forgetOpenCall(toolUseId);
  let Z = runs.of(e.ref);
  let Se = thrown();
  if (Se !== undefined && toolUseContext.abortController.signal.aborted && isAbortError(Se.error))
    throw Se.error;
  let we = Z !== undefined && isRunUnchanged(e, Z.made);
  let Ee = shouldApplyManagedRewrite(tool, e, we);
  if (Ee)
    logForDebugging(
      `tool.call ${tool.name} ${toolUseId}: a hooks module answered for the account memory server; its answer was dropped`,
      {
        level: "warn",
      },
    );
  let Ae = we ? Z : Ee ? runs.last() : undefined;
  if (Ee && Ae === undefined)
    return makeErrorResultAppender(toolUseId, dropBlockingErrors(undelivered()), {
      sourceToolAssistantUUID: assistantMessage.uuid,
      now,
    })(
      "A plugin hook answered a call to the account memory server in place of the server; the call is refused.",
      {
        toolDenialKind: "permission-rule",
      },
    );
  let toolUseContext_2 = toolUseContext;
  let Me = managedRan() && shouldKeepToolResultInSubagents(toolUseContext, tool);
  if (Ae && !Me) return Ae.made.messages;
  let We = shouldRunManagedLink(Me, managedRan(), Ae !== undefined);
  let ze = dropBlockingErrors(undelivered());
  let lt = runs.last()?.input ?? toolInputOf(input);
  if (!Ae)
    logForDebugging(
      `tool.call ${tool.name} ${toolUseId}: resolved by a hooks module (` +
        (e.deny === undefined ? "result" : `deny: ${e.deny}`) +
        ")",
    );
  let Je = {
    sourceToolAssistantUUID: assistantMessage.uuid,
    now,
  };
  let errorResultAppender = makeErrorResultAppender(toolUseId, ze, Je);
  let pt = (deny) =>
    errorResultAppender(deny, {
      toolDenialKind: "permission-rule",
    });
  let Et = (deny) =>
    errorResultAppender(
      `${tool.name} ran, and a plugin withheld its result: ${deny}`,
      {},
      hookErrorToolResult,
    ).map((hn) => stripToolResultBlock(hn, toolUseId));
  let yt = (no) => errorResultAppender(no, {});
  if (e.deny !== undefined) {
    let no = runs.last();
    let ho =
      no !== undefined && Me
        ? await runPostToolUseHooksForMemory({
            tool,
            toolUseID: toolUseId,
            input: no.input,
            output: no.made.result,
            toolUseContext: toolUseContext_2,
            durationMs: toolDurationMsOf(no.made, toolUseId),
          })
        : undefined;
    return [
      ...(runs.last((Kn) => Kn.made.messages.some((message) => ranWithoutError(message, toolUseId))) !==
      undefined
        ? Et(e.deny)
        : pt(e.deny)),
      ...(ho?.messages ?? []),
    ];
  }
  let output = Ae ? Ae.made.result : e.result;
  let At = We
    ? await runPostToolUseHooksForMemory({
        tool,
        toolUseID: toolUseId,
        input: Ae?.input ?? lt,
        output,
        toolUseContext: toolUseContext_2,
        durationMs: toolDurationMsOf((Ae ?? runs.last())?.made, toolUseId),
      })
    : {
        output,
        rewritten: false,
        messages: [],
      };
  if (Ae && !At.rewritten)
    return At.messages.length === 0 ? Ae.made.messages : [...Ae.made.messages, ...At.messages];
  let It = tool.outputSchema?.safeParse(At.output);
  if (It && !It.success)
    return [
      ...yt(
        `${At.rewritten ? "a managed PostToolUse hook rewrote" : "tool.call step resolved"} ${tool.name} with a result that does not match its output shape: ` +
          It.error.message,
      ),
      ...(Ae ? withoutToolResultBlock(Ae.made.messages, toolUseId) : []),
      ...At.messages,
    ];
  let toolUseResult = attributeScheduledPlugin(tool.name, runs.last()?.made.result, It?.data ?? At.output);
  let qt = toolUseResult;
  let Zt = shouldKeepToolResultInSubagents(toolUseContext, tool);
  let toolDuration = (Ae ?? Z)?.made.messages.find(
    (message) => findToolResultBlock(message, toolUseId) !== undefined,
  )?.toolDuration;
  let pn = await mapAndMaybePersistToolResult(
    tool,
    toolUseResult,
    toolUseId,
    getOriginalCwd_2(toolUseContext.session),
    toolUseContext.storageV5,
  );
  return [
    ...ze,
    {
      message: createUserMessage({
        ...replaceToolResult((Ae ?? Z)?.made.messages ?? [], toolUseId, pn),
        toolUseResult: Zt ? restoreMcpResultForCopy(tool, qt, pn, toolUseContext) : undefined,
        ...Je,
      }),
      toolDuration,
    },
    ...(Ae ? withoutToolResultBlock(Ae.made.messages, toolUseId) : []),
    ...At.messages,
  ];
}
//@ chunk-e6aww6q8.js:3787120-3787208 placement
/**
 * tool.call 钩子最近一次运行失败时返回拒绝结果。
 */
function denyOnStaleHookRun(e, n, toolUseId) {
  return forgetWithheldCall(toolUseId) && e.deny === undefined && n.runs.last() !== undefined
    ? {
        deny: CHECKER_NO_ANSWER,
      }
    : e;
}
//@ chunk-e6aww6q8.js:3787208-3788237 placement
/**
 * 应用 tool.call 钩子的结果（阻止执行、改写结果）。
 */
async function applyToolCallHookResult(e, toolCallChain, r) {
  let filtered = toolCallChain.undelivered().filter((Se) => Se.preventContinuation === true);
  let stopReason = filtered.findLast((Se) => Se.stopReason)?.stopReason;
  let deny = toolCallChain.managedRan() ? undefined : e.deny;
  let S = denyOnStaleHookRun(e, toolCallChain, r.input.tool_use_id);
  let w = await runToolCallHooks(S, toolCallChain, r);
  if (toolCallChain.toolEntered())
    for (let Se of w) {
      let { message } = Se;
      if (
        message.type === "user" &&
        message.toolDenialKind === "permission-rule" &&
        findToolResultBlock(Se, r.input.tool_use_id) !== undefined
      )
        message.toolDenialAfterRun = true;
    }
  let L =
    r.toolUseContext.abortController.signal.aborted || w.some(isHookStoppedMessage)
      ? undefined
      : filtered.length > 0
        ? buildHookStoppedMessage(
            stopReason || deny || "Execution stopped by hook",
            r.tool.name,
            r.input.tool_use_id,
          )
        : toolCallChain.runs
            .last((Se) => Se.made.messages.some(isHookStoppedMessage))
            ?.made.messages.find(isHookStoppedMessage);
  let G = L === undefined ? w : [...w, L];
  let q = S.deny === undefined ? asStringList(S.context) : undefined;
  return q === undefined ||
    q.length === 0 ||
    !shouldRunManagedToolHooks(
      r.tool,
      r.toolUseContext.options.bareFork,
      r.toolUseContext.options.settingsHooksOff,
    )
    ? G
    : toolCallChain.managedRan()
      ? [
          ...G,
          ...(await runToolCallPostHooks(
            q,
            {
              tool: r.tool,
              toolUseID: r.input.tool_use_id,
              input: findRunInputForResult(S, toolCallChain, r.input),
              toolUseContext: r.toolUseContext,
            },
            G,
          )),
        ]
      : [
          ...G,
          buildToolCallContextMessage(
            await capAdditionalContext(q, "tool.call", r.toolUseContext.storageV5),
            r.input.tool_use_id,
          ),
        ];
}
//@ chunk-e6aww6q8.js:3788237-3788261 placement
var TOOL_CALL_SITE_RULES = UI_ENV_SITE_RULES["tool.call"];
//@ chunk-e6aww6q8.js:3788305-3788666 placement
/**
 * 安全采样 process.memoryUsage()：无磁盘会话跳过；失败时记日志，非常见文件系统错误只上报一次。
 */
class MemoryUsageSampler {
  #e;
  #t = false;
  constructor(stallSampler) {
    this.#e = stallSampler;
  }
  sample(e) {
    if (isDiskless()) return;
    try {
      return this.#e();
    } catch (error) {
      let errno = isSyscallError(error) ? error.errno : "none";
      logForDebugging(
        `[tool-memory] process.memoryUsage() failed (${e}, errno=${errno}); a memory measurement for this tool call is skipped`,
        {
          level: "error",
        },
      );
      if (!this.#t && !isSadFsErrno(error) && !isEnvFsErrno(error)) {
        this.#t = true;
        logError(withTelemetryMessage(error, `process.memoryUsage() failed (errno=${errno})`));
      }
      return;
    }
  }
}
//@ chunk-e6aww6q8.js:3788666-3788833 placement
function diffMemoryUsage(e, n) {
  if (e === undefined || n === undefined) return;
  return {
    rssDeltaBytes: n.rss - e.rss,
    heapUsedDeltaBytes: n.heapUsed - e.heapUsed,
    externalDeltaBytes: n.external - e.external,
  };
}
//@ chunk-e6aww6q8.js:3788883-3788929 placement
/**
 * 工具调用耗时的类别顺序（审批、模型、自身、外部）。
 */
var TIMING_CATEGORIES = ["approval", "model", "own", "external"];
//@ chunk-e6aww6q8.js:3788929-3789753 placement
/**
 * 统计工具调用的墙钟时间分布：按外部、审批、模型、自身等类别计时（同时只计最高优先的一类），settle 后输出外部耗时、审批等待、模型调用与外部工作前时间。
 */
class ToolWallClockTracker {
  #e;
  #t;
  #n = {
    external: 0,
    approval: 0,
    model: 0,
    own: 0,
  };
  #o = {
    external: 0,
    approval: 0,
    model: 0,
    own: 0,
  };
  #r;
  #i;
  #s = false;
  constructor(startMs, now = Date.now) {
    this.#e = startMs;
    this.#r = startMs;
    this.#t = now;
  }
  mark(e) {
    if (this.#s) return () => {};
    let n = this.#a();
    if (e !== "own") this.#i ??= n;
    this.#n[e]++;
    let r = false;
    return () => {
      if (r || this.#s) return;
      r = true;
      this.#a();
      this.#n[e]--;
    };
  }
  settle() {
    if (!this.#s) {
      this.#a();
      this.#s = true;
    }
  }
  fields(e, { declaredNoOutsideWork }) {
    if (this.#i === undefined && !declaredNoOutsideWork) return {};
    let max = Math.max(0, e);
    let s = (L) => {
      let min = Math.min(Math.max(0, L), max);
      max -= min;
      return min;
    };
    let h = s(this.#o.approval);
    let y = s(this.#o.model);
    let externalWallMs = s(this.#o.external);
    let w = s((this.#i ?? this.#e) - this.#e);
    return {
      externalWallMs,
      ...(h > 0 && {
        approvalWaitMs: h,
      }),
      ...(y > 0 && {
        modelCallMs: y,
      }),
      ...(w > 0 && {
        preExternalMs: w,
      }),
    };
  }
  #a() {
    let e = this.#t();
    let found = TIMING_CATEGORIES.find((r) => this.#n[r] > 0);
    if (found !== undefined) this.#o[found] += Math.max(0, e - this.#r);
    this.#r = e;
    return e;
  }
}
//@ chunk-e6aww6q8.js:3789753-3789769 placement
/**
 * 按调用保存计时上下文的 AsyncLocalStorage。
 */
var timingContext = new AsyncLocalStorage();
//@ chunk-e6aww6q8.js:3789769-3789807 placement
/**
 * 在给定计时上下文里执行函数。
 */
function runWithTimingContext(e, n) {
  return timingContext.run(e, n);
}
//@ chunk-e6aww6q8.js:3789807-3789844 placement = getAgentContext (1)
/**
 * 当前请求的计时器存储（ALS）。
 */
function getRequestTimingStore() {
  return timingContext.getStore();
}
//@ chunk-e6aww6q8.js:3789844-3790091 placement
var CALL_DIRECTORY_CHANGED_MESSAGE =
  "The working directory no longer leads where it did when this call was permission-checked (it was deleted, a part of its path was replaced, or it can't be examined), so the call was not run. Make the call again to have it checked afresh.";
//@ chunk-e6aww6q8.js:3790091-3790191 placement
function runInHeldDirectory(cwd, n) {
  return callFrameCwd() !== undefined || (cwd !== undefined && cwd === getCwdOrNull())
    ? runInRemoteCallFrame(n, {
        recoversIfAlreadyGone: true,
      })
    : n();
}
//@ chunk-e6aww6q8.js:3790191-3790638 placement
/**
 * 检查工作目录在权限检查后是否仍指向同一位置；变化时记日志与 call_directory_hold 事件并拒绝调用。
 */
function isCallDirectoryUnchanged() {
  let e = callFrameCwd();
  if (e === undefined) return true;
  let n = realPathOutcomeSync(e);
  if (callFramePhysicalMatches(n)) {
    if (n === undefined)
      logForDebugging(
        `Working directory "${e}" may not be examined, now or at the call's permission check, so it isn't compared`,
      );
    return true;
  }
  logForDebugging(
    `Call refused: working directory "${e}" now leads to ${typeof n === "string" ? `"${n}"` : "nowhere that can be examined"}, elsewhere than at the call's permission check`,
    {
      level: "warn",
    },
  );
  logFeatureSad("call_directory_hold", "changed_before_call");
  return false;
}
//@ chunk-e6aww6q8.js:3790638-3790776 placement
/**
 * 根据中止原因选择工具取消消息：同批被拒、交付中断（特性开关）或普通取消。
 */
function getCancelMessage(signal) {
  let n = unwrapAbortReason(signal.reason);
  if (n === "permission-stop") return TOOL_CALL_SKIPPED_BY_SIBLING_DENIAL;
  if (n === "interrupt" && getFeatureValue_CACHED_MAY_BE_STALE("tengu_fizzy_grove", false))
    return TOOL_CALL_SKIPPED_FOR_DELIVERY;
  return CANCEL_MESSAGE;
}
//@ chunk-e6aww6q8.js:3790776-3791098 fingerprint = classifyToolError (0.849)
/**
 * 把工具抛出的错误归类为可上报的字符串：TelemetrySafeError 的 errorClass、errno 码、合法的 error.name，否则 Error/UnknownError。
 */
function classifyToolError(error) {
  if (error instanceof Error) {
    if (
      error instanceof TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS &&
      typeof error.errorClass === "string" &&
      /^[a-z][a-z0-9_]{2,59}$/.test(error.errorClass)
    )
      return fromSanitizer_SANITIZER_OUTPUT_ONLY(error.errorClass);
    let errnoCode = sanitizeErrnoForTelemetry(error);
    if (errnoCode) return concatSafe(lit_2("Error:"), errnoCode);
    if (typeof error.name === "string" && /^[A-Za-z]{4,60}$/.test(error.name))
      return fromSanitizer_SANITIZER_OUTPUT_ONLY(error.name);
    return lit_2("Error");
  }
  return lit_2("UnknownError");
}
//@ chunk-e6aww6q8.js:3791098-3792219 layout
/**
 * 输入校验失败时，若未知键或枚举值"在本对话早先的工具 schema 里出现过"（内联或延迟 schema），生成"…was offered earlier in this conversation but is not available in this session"提示。
 */
function buildUnavailableOptionNote(name, n, schemaInput, error, messages) {
  try {
    if (!isPlainObject_5(schemaInput)) return null;
    let y = new Set();
    let S = [];
    for (let issue of error.issues)
      if (issue.code === "unrecognized_keys" && issue.path.length === 0) {
        for (let key of issue.keys) if (Object.hasOwn(n, key)) y.add(key);
      } else if (issue.code === "invalid_value" && issue.path.length === 1) {
        let Ae = issue.path[0];
        if (typeof Ae === "string" && Object.hasOwn(n, Ae) && Object.is(n[Ae], schemaInput[Ae]))
          S.push({
            parameter: Ae,
            value: schemaInput[Ae],
          });
      }
    if (y.size === 0 && S.length === 0) return null;
    let w = latestPromptSnapshot(messages)?.toolEntries.get(name);
    let inputSchema = w?.input_schema;
    let source = "inline";
    if (w === undefined) {
      let Ee = recordedDeferredTools(messages).entries.get(name);
      if (Ee === undefined || !("input_schema" in Ee)) return null;
      inputSchema = Ee.input_schema;
      source = "deferred";
    }
    let q = schemaPropertiesMap(inputSchema);
    let Z = [];
    for (let { parameter, value: Ae } of S)
      if (schemaEnumValues(q.get(parameter))?.includes(Ae)) Z.push(`\`${parameter}: ${jsonStringify(Ae)}\``);
    let kind = Z.length > 0 ? "enum_value" : "unknown_key";
    for (let Ee of y) if (q.has(Ee)) Z.push(`\`${Ee}\``);
    if (Z.length === 0) return null;
    let ke = Z.length === 1;
    return {
      text: `${ke ? Z[0] : `${Z.slice(0, -1).join(", ")} and ${Z.at(-1)}`} ${ke ? "was" : "were"} offered earlier in this conversation but ${ke ? "is" : "are"} not available in this session; continue without ${ke ? "it" : "them"}.`,
      kind,
      source,
    };
  } catch (error) {
    logError(error);
    return null;
  }
}
//@ chunk-e6aww6q8.js:3792219-3792424 fingerprint = ruleSourceToOTelSource (1)
/**
 * 权限规则来源映射到 OTel 决策来源：session→user_temporary/user_reject，用户/本地设置→user_permanent/user_reject，其余→config。
 */
function ruleSourceToOTelSource(ruleSource, behavior) {
  switch (ruleSource) {
    case "session":
      return behavior === "allow" ? "user_temporary" : "user_reject";
    case "localSettings":
    case "userSettings":
      return behavior === "allow" ? "user_permanent" : "user_reject";
    default:
      return "config";
  }
}
//@ chunk-e6aww6q8.js:3792424-3792965 fingerprint = decisionReasonToOTelSource (0.965)
/**
 * 权限决策原因映射到 OTel 来源：permissionPromptTool 用其分类、rule 看来源、hook→hook、用户中断→user_abort，其它→config。
 */
function decisionReasonToOTelSource(reason, behavior) {
  if (!reason) return "config";
  switch (reason.type) {
    case "permissionPromptTool": {
      let classified = reason.toolResult?.decisionClassification;
      if (classified === "user_temporary" || classified === "user_permanent" || classified === "user_reject")
        return classified;
      return behavior === "allow" ? "user_temporary" : "user_reject";
    }
    case "rule":
      return ruleSourceToOTelSource(reason.rule.source, behavior);
    case "hook":
      return "hook";
    case "mode":
    case "classifier":
    case "subcommandResults":
    case "asyncAgent":
    case "sandboxOverride":
    case "workingDir":
    case "safetyCheck":
      return "config";
    case "other":
      if (reason.reason === CAN_USE_TOOL_ABORTED_REASON) return "user_abort";
      return "config";
    default:
      return "config";
  }
}
//@ chunk-e6aww6q8.js:3792965-3793218 layout
/**
 * 权限结果转 OTel tool_decision：allow→accept，deny→reject，ask（未决）→reject（中断时来源 user_abort）。
 */
function getToolDecisionForOTel(permissionDecision, aborted) {
  switch (permissionDecision.behavior) {
    case "allow":
      return {
        decision: "accept",
        source: decisionReasonToOTelSource(permissionDecision.decisionReason, "allow"),
      };
    case "deny":
      return {
        decision: "reject",
        source: decisionReasonToOTelSource(permissionDecision.decisionReason, "deny"),
      };
    case "ask":
      return {
        decision: "reject",
        source: aborted ? "user_abort" : "config",
      };
  }
}
//@ chunk-e6aww6q8.js:3793218-3794030 layout
/**
 * 组装权限决策记录（decision、source、reasonType、ruleSource、grantScope、reasonCode、circuitBreaker、classifierCategory），供权限遥测与审计。
 */
function buildPermissionDecisionRecord(e, n, r) {
  let decisionReason = r?.outcome.decisionReason;
  let h =
    r?.outcome.behavior === "ask" ||
    r?.recorded?.source.startsWith("user_") === true ||
    n === "user_abort" ||
    decisionReason?.type === "permissionPromptTool";
  let y = r === undefined ? undefined : resolveShownPermissionOutcome(r, h);
  let S =
    r === undefined
      ? undefined
      : (getDecisionRuleSource(decisionReason, r.outcome.behavior) ??
        getMatchedAskRule(r.outcome)?.source ??
        (y && (getDecisionRuleSource(y.reason, y.behavior) ?? y.matchedAskRule?.source)));
  let w =
    e !== "accept"
      ? undefined
      : (r?.recorded?.grantScope ?? (r?.outcome.behavior === "allow" ? r.outcome.grantScope : undefined));
  let L = y && findCircuitBreaker(y.reason, y.behavior);
  let G = y?.reason?.type === "classifier" ? sanitizeRuleCategory(y.reason.category) : undefined;
  return {
    decision: e,
    source: n,
    ...(decisionReason !== undefined &&
      !h && {
        reasonType: decisionReason.type,
      }),
    ...(S !== undefined && {
      ruleSource: S,
    }),
    ...(w !== undefined && {
      grantScope: w,
    }),
    ...(y !== undefined && {
      reasonCode: sanitizedDecisionReasonDisplay(y.behavior, undefined, y.reason, y.matchedAskRule),
    }),
    ...(L !== undefined && {
      circuitBreaker: L,
    }),
    ...(G !== undefined && {
      classifierCategory: G,
    }),
  };
}
//@ chunk-e6aww6q8.js:3794030-3794695 layout
function resolveShownPermissionOutcome(e, n) {
  let { outcome, shown } = e;
  let h =
    outcome.behavior !== "allow" &&
    (outcome.decisionReason?.type === "hook" || outcome.decisionReason?.type === "classifier");
  if (shown?.behavior === "ask" && !h)
    return {
      behavior: "ask",
      reason: shown.decisionReason,
      matchedAskRule: getMatchedAskRule(shown),
    };
  if (
    outcome.behavior === "deny" &&
    outcome.decisionReason?.type === "asyncAgent" &&
    outcome.decisionReason.ask !== undefined
  ) {
    let { ask } = outcome.decisionReason;
    return {
      behavior: "ask",
      reason: ask.decisionReason,
      matchedAskRule: ask.matchedAskRule,
    };
  }
  if (outcome.behavior !== "allow")
    return {
      behavior: outcome.behavior,
      reason: outcome.decisionReason,
      matchedAskRule: getMatchedAskRule(outcome),
    };
  if (n && outcome.decisionReason?.type !== "permissionPromptTool")
    return {
      behavior: "ask",
      reason: outcome.decisionReason,
      matchedAskRule: getMatchedAskRule(outcome),
    };
  return;
}
//@ chunk-e6aww6q8.js:3794695-3794762 layout
function getMatchedAskRule(outcome) {
  return "matchedAskRule" in outcome ? outcome.matchedAskRule : undefined;
}
//@ chunk-e6aww6q8.js:3794762-3795026 placement
function findCircuitBreaker(e, n) {
  if (e?.type === "safetyCheck") {
    let circuitBreaker = e.circuitBreaker;
    return circuitBreaker !== undefined && Object.hasOwn(CIRCUIT_BREAKER_TRAITS, circuitBreaker)
      ? circuitBreaker
      : undefined;
  }
  if (e?.type === "subcommandResults") {
    for (let reason of e.reasons.values())
      if (reason.behavior === n) {
        let circuitBreaker = findCircuitBreaker(reason.decisionReason, n);
        if (circuitBreaker !== undefined) return circuitBreaker;
      }
  }
  return;
}
//@ chunk-e6aww6q8.js:3795026-3795185 placement
function buildDeniedDecisionRecord(permissionDecision, n, source, pipeline) {
  return buildPermissionDecisionRecord(
    permissionDecision.behavior === "allow" ? n?.decision || source.decision : "reject",
    n?.source || source.source,
    {
      outcome: permissionDecision,
      recorded: n,
      shown: pipeline?.answered ?? pipeline?.result,
    },
  );
}
//@ chunk-e6aww6q8.js:3795185-3795335 placement
function buildDenyRuleDecisionRecord(message, rule) {
  let reason = {
    type: "rule",
    rule,
  };
  return buildPermissionDecisionRecord("reject", decisionReasonToOTelSource(reason, "deny"), {
    outcome: {
      behavior: "deny",
      message,
      decisionReason: reason,
    },
    recorded: undefined,
  });
}
//@ chunk-e6aww6q8.js:3795335-3795439 placement
function getDecisionRuleSource(e, behavior) {
  if (e?.type === "rule") return e.rule.source;
  return findDecidingRule(e, behavior === "deny" ? "deny" : "ask")?.source;
}
//@ chunk-e6aww6q8.js:3795439-3795670 placement
function shouldAddBashAudienceNote(name, n, mainLoopModel) {
  if (
    name !== BASH_TOOL_NAME ||
    typeof n !== "object" ||
    n === null ||
    !("stdout" in n) ||
    typeof n.stdout !== "string" ||
    getIsNonInteractiveSession() ||
    !exceedsLineLimit(n.stdout)
  )
    return false;
  let canonicalName = getCanonicalName(mainLoopModel);
  return isModelCapabilityEnabled(
    "bash_output_audience_note",
    canonicalName,
    mainLoopModel,
    env.CLAUDE_CODE_BASH_OUTPUT_AUDIENCE_NOTE,
  );
}
//@ chunk-e6aww6q8.js:3795670-3795810 placement
var REMOTE_DEVICES_PREFIX = getMcpPrefix_2(REMOTE_DEVICES);
var BROWSER_TOOL_PREFIXES = [`${REMOTE_DEVICES_PREFIX}Claude_Preview__`, "mcp__claude-for-chrome__"];
var flattened_2 = [IOS_SIMULATOR_DISPLAY_NAME, ANDROID_EMULATOR_DISPLAY_NAME].flatMap((e) => {
  let mcpPrefix = getMcpPrefix_2(e);
  return [mcpPrefix, REMOTE_DEVICES_PREFIX + mcpPrefix.slice(5)];
});
//@ chunk-e6aww6q8.js:3795810-3796064 placement
function getDeviceToolKind(e) {
  if (e.isMcp !== true) return;
  let toolNameForPermissionCheck = getToolNameForPermissionCheck_4(e);
  if (
    isChromeToolName(toolNameForPermissionCheck) ||
    BROWSER_TOOL_PREFIXES.some((r) => toolNameForPermissionCheck.startsWith(r))
  )
    return "browser";
  if (
    isClassifiableBrowserCall(toolNameForPermissionCheck) &&
    !(
      toolNameForPermissionCheck.startsWith(REMOTE_DEVICES_PREFIX) &&
      toolNameForPermissionCheck.slice(REMOTE_DEVICES_PREFIX.length).includes("__")
    )
  )
    return "computer_use";
  return flattened_2.some((r) => toolNameForPermissionCheck.startsWith(r)) ? "simulator" : undefined;
}
//@ chunk-e6aww6q8.js:3796064-3796090 placement
var TOOL_NOT_LOADED = "TOOL_NOT_LOADED";
//@ chunk-e6aww6q8.js:3796090-3796455 placement
/**
 * 工具未加载就被调用时的 InputValidationError 文本，提示先用 ToolSearch 一次性加载所需工具再调用。
 */
function buildNotLoadedToolError(name) {
  return `InputValidationError: ${name} did not run: it was not loaded when it was called. Unless ${TOOL_SEARCH_TOOL_NAME} has loaded it since, load it together with the other tools you expect to need, in one ${TOOL_SEARCH_TOOL_NAME} call (for example, query "select:${name}", with the other names after it, comma-separated). Call it again once that result has come back, not in the same reply.`;
}
//@ chunk-e6aww6q8.js:3796455-3796529 placement
var SANITIZER_SHAPE_REGEX = /^[A-Za-z][A-Za-z0-9_]{0,63}(?:[,+][A-Za-z][A-Za-z0-9_]{0,63})*$/;
//@ chunk-e6aww6q8.js:3796529-3796589 placement
/**
 * 校验遥测里的形状字段，非法时记为 nonconforming。
 */
function sanitizeShapeClass(shapeClass) {
  return SANITIZER_SHAPE_REGEX.test(shapeClass)
    ? fromSanitizer_SANITIZER_OUTPUT_ONLY(shapeClass)
    : lit_2("nonconforming");
}
//@ chunk-e6aww6q8.js:3796627-3796882 placement
var MAX_RESULT_FIELDS = 256;
var MAX_PENDING_CUTS = 64;
var MAX_PENDING_CUT_CHARS = 33554432;
var MAX_WALK_NODES = 1048576;
var MAX_WALK_NODES_DEDUPED = 65536;
var HOOK_RESULT_FIELDS_CUT_NOTICE =
  "[Parts of this tool result were left out: a hook replaced the tool's output with one that has too many fields, and only its text, inline images and inline PDFs are kept.]";
var pendingResultCuts = new SessionRootSlot(() => new Map());
//@ chunk-e6aww6q8.js:3796882-3796916 placement
/**
 * 判断工具是否属于项目中继读取工具集。
 */
function isHearthReadTool(name) {
  return HEARTH_READ_TOOLS.has(name);
}
//@ chunk-e6aww6q8.js:3796916-3797295 placement
/**
 * 有 MCP 入站门时，字段过多的 MCP 结果只保留简化形式，完整结果按 uuid 暂存待取回；子代理或无法序列化时只做截断并记事件。
 */
function cutLargeMcpResult(e) {
  if (!hasMcpInboundDoor()) return e;
  let { toolUseId, toolUseResult, mcpMeta } = e;
  let minimalMcpResult = buildMinimalMcpResult(toolUseResult, mcpMeta, e.keepsMcpMeta);
  if (!needsResultCut(minimalMcpResult, e)) return e;
  if (e.inSubagent) {
    logFeatureSad("mcp_large_result_cut", "in_subagent");
    return minimalMcpResult;
  }
  let y;
  try {
    y = jsonStringify(
      mcpMeta
        ? {
            content: toolUseResult,
            ...mcpMeta,
          }
        : toolUseResult,
    );
  } catch {
    logFeatureSad("mcp_large_result_cut", "not_serializable");
    return minimalMcpResult;
  }
  return {
    ...minimalMcpResult,
    uuid: stashCutResult(toolUseId, {
      whole: new RawJson(y),
      chars: y.length,
      feature: "mcp_large_result_cut",
    }),
  };
}
//@ chunk-e6aww6q8.js:3797295-3797694 placement
/**
 * 编辑工具结果的 originalFile 过长时置空并暂存完整结果（子代理中只置空）。
 */
function cutEditOriginalFile({ toolUseId, toolUseResult, mcpMeta, inSubagent }) {
  if (
    !hasMcpInboundDoor() ||
    !isPlainObject_5(toolUseResult) ||
    typeof toolUseResult.originalFile !== "string" ||
    toolUseResult.originalFile.length <= MAX_OUTPUT_CHARS_SMALL
  )
    return {
      toolUseResult,
    };
  let toolUseResult_2 = {
    ...toolUseResult,
    originalFile: null,
  };
  if (inSubagent) {
    logFeatureSad("edit_original_file_cut", "in_subagent");
    return {
      toolUseResult: toolUseResult_2,
    };
  }
  return {
    toolUseResult: toolUseResult_2,
    uuid: stashCutResult(toolUseId, {
      whole: mcpMeta
        ? {
            content: toolUseResult,
            ...mcpMeta,
          }
        : toolUseResult,
      chars: toolUseResult.originalFile.length,
      feature: "edit_original_file_cut",
    }),
  };
}
//@ chunk-e6aww6q8.js:3797694-3797933 placement
/**
 * 按 toolUseId 暂存被截掉的完整结果，超过条数或字符上限时淘汰最早的（记 dropped_waiting），返回新 uuid。
 */
function stashCutResult(toolUseId, n) {
  let r = randomUUID();
  let s = pendingResultCuts.of(getRootSession());
  s.delete(toolUseId);
  s.set(toolUseId, {
    ...n,
    uuid: r,
  });
  let h = 0;
  for (let y of s.values()) h += y.chars;
  for (let [y, S] of s) {
    if (y === toolUseId || (s.size <= MAX_PENDING_CUTS && h <= MAX_PENDING_CUT_CHARS)) break;
    s.delete(y);
    h -= S.chars;
    logFeatureSad(S.feature, "dropped_waiting");
  }
  return r;
}
//@ chunk-e6aww6q8.js:3797933-3798073 placement
function cutOversizedResultBlocks(content) {
  let n = hasMcpInboundDoor() ? simplifyResultBlocks(content) : undefined;
  if (n === undefined) return content;
  logFeatureSad("mcp_result_block_cut", typeof n === "string" ? "not_a_list" : "list");
  return n;
}
//@ chunk-e6aww6q8.js:3798073-3798344 placement
/**
 * 结果字段过多时把内容块简化为只保留文本、工具引用、内联图片与 PDF，丢弃部分处加一条说明；不需要时返回 undefined。
 */
function simplifyResultBlocks(e, n = false) {
  let allowToolReference = Array.isArray(e) && e.every(isToolReferenceWithName);
  let s = Array.isArray(e) ? e.map((S) => simplifyResultBlock(S, allowToolReference)) : undefined;
  let h = MAX_RESULT_FIELDS + countResultFields(s, 1 / 0, n);
  if (h !== 1 / 0 && countResultFields(e, h, n) <= h) return;
  if (s === undefined) return stringifyToolResult(e);
  let index = s.indexOf(undefined);
  return s.flatMap(
    (S, w) =>
      S ??
      (w === index
        ? {
            type: "text",
            text: HOOK_RESULT_FIELDS_CUT_NOTICE,
          }
        : []),
  );
}
//@ chunk-e6aww6q8.js:3798344-3798989 placement
/**
 * 把单个内容块简化为文本、工具引用、支持的 base64 图片或 PDF 文档，其他返回 undefined。
 */
function simplifyResultBlock(block, allowToolReference) {
  let raw = isPlainObject_5(block) ? block : {};
  let { type: blockType, text, source, title, context, tool_name: toolName } = raw;
  if (blockType === "text" && typeof text === "string")
    return {
      type: blockType,
      text,
    };
  if (allowToolReference && blockType === "tool_reference" && typeof toolName === "string")
    return {
      type: blockType,
      tool_name: toolName,
    };
  let base64Source = isPlainObject_5(source) && source.type === "base64" ? source : {};
  let { media_type: mediaType, data } = base64Source;
  if (
    blockType === "image" &&
    typeof data === "string" &&
    (mediaType === "image/png" ||
      mediaType === "image/jpeg" ||
      mediaType === "image/gif" ||
      mediaType === "image/webp")
  )
    return {
      type: blockType,
      source: {
        type: "base64",
        media_type: mediaType,
        data,
      },
    };
  if (blockType === "document" && typeof data === "string" && mediaType === "application/pdf")
    return {
      type: blockType,
      source: {
        type: "base64",
        media_type: mediaType,
        data,
      },
      ...(typeof title === "string" && {
        title,
      }),
      ...(typeof context === "string" && {
        context,
      }),
    };
  return;
}
//@ chunk-e6aww6q8.js:3798989-3799116 placement
function needsResultCut(minimalMcpResult, n, r = false) {
  let s =
    MAX_RESULT_FIELDS +
    countResultFields([minimalMcpResult.toolUseResult, minimalMcpResult.mcpMeta], 1 / 0, r);
  return s === 1 / 0 || countResultFields([n.toolUseResult, n.mcpMeta], s, r) > s;
}
//@ chunk-e6aww6q8.js:3799116-3799419 placement
/**
 * 迭代统计结果对象的字段数（超过上限提前返回上限+1），可对重复键形状的对象去重计数。
 */
function countResultFields(e, n, r = false) {
  let s = 0;
  let h = 0;
  let y = new Set();
  let S = [e];
  while (S.length > 0) {
    let w = S.pop();
    if (typeof w !== "object" || w === null) continue;
    if (++h > (r ? MAX_WALK_NODES_DEDUPED : MAX_WALK_NODES)) return n + 1;
    if (Array.isArray(w)) {
      for (let G of w) S.push(G);
      continue;
    }
    let L = r && isRepeatedKeyShape(w, y);
    for (let G of Object.values(w)) {
      if (!L && ++s > n) return n + 1;
      S.push(G);
    }
  }
  return s;
}
//@ chunk-e6aww6q8.js:3799419-3799572 placement
function isRepeatedKeyShape(e, n) {
  let keys = Object.keys(e);
  let s = String(Number(keys[0]) >>> 0) === keys[0];
  if (keys.length > MAX_JSON_NESTING || s) return false;
  let h = jsonStringifyRaw(keys);
  if (n.has(h)) return true;
  n.add(h);
  return false;
}
//@ chunk-e6aww6q8.js:3799572-3799920 placement
/**
 * 构造精简的 MCP 结果：内容块只留基本字段，mcpMeta 只保留结束轮次标记、限定大小的插件元数据、来源中继、结构化内容省略标记与资源链接。
 */
function buildMinimalMcpResult(e, n, keepsMcpMeta = false) {
  if (keepsMcpMeta)
    return {
      ...buildMinimalMcpResult(e, undefined),
      mcpMeta: n,
    };
  return {
    toolUseResult: Array.isArray(e) ? e.map(minimalContentBlock) : isPlainObject_5(e) ? {} : e,
    mcpMeta: n && {
      ...(isPlainObject_5(n._meta) && pickMcpMetaFields(n._meta)),
      ...((n.structuredContent !== undefined || n.structuredContentOmitted === true) && {
        structuredContentOmitted: true,
      }),
      ...(Array.isArray(n.resourceLinks) && {
        resourceLinks: n.resourceLinks.filter(isPlainObject_5).map(minimalResourceLink),
      }),
    },
  };
}
//@ chunk-e6aww6q8.js:3799920-3800270 placement
/**
 * 从 MCP _meta 中挑出要保留的键：结束轮次标记，以及开关开启时大小受限的插件元数据（超限的记录到 plugin_meta_cut）。
 */
function pickMcpMetaFields(e) {
  let n = {};
  if (e[CLAUDE_ENDTURN] === true) {
    n[CLAUDE_ENDTURN] = true;
    if (e[CLAUDE_ENDTURNHONORSSTOPHOOKS] === true) n[CLAUDE_ENDTURNHONORSSTOPHOOKS] = true;
  }
  if (isSnappyPlumOn()) {
    let r = [];
    for (let s of EDIT_SOURCE_KINDS) {
      let h = e[s];
      if (!Object.hasOwn(e, s) || h === undefined) continue;
      if (
        typeof h === "string"
          ? h.length <= MAX_REQUEST_META_BYTES
          : countResultFields(h, MAX_RESULT_FIELDS) <= MAX_RESULT_FIELDS
      )
        n[s] = h;
      else r.push(s);
    }
    if (typeof e[COM_ANTHROPIC_SOURCES_RELAY] === "string")
      n[COM_ANTHROPIC_SOURCES_RELAY] = e[COM_ANTHROPIC_SOURCES_RELAY];
    if (r.length > 0) n[COM_ANTHROPIC_PLUGIN_META_CUT] = r;
  }
  return Object.keys(n).length === 0
    ? {}
    : {
        _meta: n,
      };
}
//@ chunk-e6aww6q8.js:3800270-3800692 placement
/**
 * 把内容块精简为 type、text、source（type/media_type/data）、title、context。
 */
function minimalContentBlock(e) {
  if (Array.isArray(e)) return [];
  if (!isPlainObject_5(e)) return e;
  let { type: n, text, source, title, context } = e;
  return {
    ...(typeof n === "string" && {
      type: n,
    }),
    ...(typeof text === "string" && {
      text,
    }),
    ...(isPlainObject_5(source) && {
      source: {
        ...(typeof source.type === "string" && {
          type: source.type,
        }),
        ...(typeof source.media_type === "string" && {
          media_type: source.media_type,
        }),
        ...(typeof source.data === "string" && {
          data: source.data,
        }),
      },
    }),
    ...(typeof title === "string" && {
      title,
    }),
    ...(typeof context === "string" && {
      context,
    }),
  };
}
//@ chunk-e6aww6q8.js:3800692-3800979 placement
function minimalResourceLink(e) {
  let { uri, name: r, title, description, mimeType, size } = e;
  return {
    uri: typeof uri === "string" ? uri : "",
    name: typeof r === "string" ? r : "",
    ...(typeof title === "string" && {
      title,
    }),
    ...(typeof description === "string" && {
      description,
    }),
    ...(typeof mimeType === "string" && {
      mimeType,
    }),
    ...(typeof size === "number" && {
      size,
    }),
  };
}
//@ chunk-e6aww6q8.js:3800979-3801142 placement
/**
 * 按 toolUseId 取回暂存的完整结果，uuid 不符时丢弃并记事件。
 */
function takeCutResult(toolUseId, uuid) {
  let r = pendingResultCuts.peek(getRootSession());
  let s = r?.get(toolUseId);
  if (s === undefined) return;
  r?.delete(toolUseId);
  if (s.uuid !== uuid) {
    logFeatureSad(s.feature, "other_message");
    return;
  }
  logFeatureOk(s.feature);
  return s.whole;
}
//@ chunk-e6aww6q8.js:3801142-3801243 placement
/**
 * 轮次结束时，对仍未完成的切出结果逐个上报 turn_ended 并清空。
 */
function clearCutResults() {
  let e = pendingResultCuts.peek(getRootSession());
  for (let n of e?.values() ?? []) logFeatureSad(n.feature, "turn_ended");
  e?.clear();
}
//@ chunk-e6aww6q8.js:3801243-3801328 placement
/**
 * 设备类 MCP 工具名的前缀常量与后缀规则。
 */
var CLAUDE_DEVICE_MCP_PREFIX = getMcpPrefix_2(CLAUDE_DEVICE);
var REMOTE_DEVICES_MCP_PREFIX = getMcpPrefix_2(REMOTE_DEVICES);
var MAX_DEVICE_TOOL_SUFFIX_CHARS = 108;
var DEVICE_TOOL_SUFFIX_REGEX = /^[a-zA-Z0-9](?:[a-zA-Z0-9_-]*[a-zA-Z0-9])?$/;
//@ chunk-e6aww6q8.js:3801328-3801494 placement
function matchLocalToolAlias(e, n) {
  let r;
  if (e.startsWith(REMOTE_DEVICES_MCP_PREFIX)) {
    let localToolAlias = toLocalToolAlias(e);
    r = n.filter((h) => h === localToolAlias);
  } else r = n.filter((s) => s.startsWith(REMOTE_DEVICES_MCP_PREFIX) && toLocalToolAlias(s) === e);
  return r.length === 1 ? r[0] : undefined;
}
//@ chunk-e6aww6q8.js:3801494-3801722 placement
function toLocalToolAlias(e) {
  let sliced = e.slice(REMOTE_DEVICES_MCP_PREFIX.length);
  let [r, s, ...h] = sliced.split("__");
  if (
    r === undefined ||
    s === undefined ||
    h.length > 0 ||
    !DEVICE_TOOL_SUFFIX_REGEX.test(r) ||
    !DEVICE_TOOL_SUFFIX_REGEX.test(s) ||
    ALL_BROWSER_TOOL_PREFIXES.some((S) => sliced.startsWith(S))
  )
    return;
  let y = `lcl-${r}-${s}`;
  return y.length <= MAX_DEVICE_TOOL_SUFFIX_CHARS ? CLAUDE_DEVICE_MCP_PREFIX + y : undefined;
}
//@ chunk-e6aww6q8.js:3801722-3801750 placement
/**
 * 等待 MCP 服务器就绪的轮询间隔、最长等待与缺失宽限。
 */
var MCP_WAIT_POLL_INTERVAL_MS = 50;
var MAX_MCP_WAIT_MS = 1e4;
var MCP_ABSENT_GRACE_MS = 3000;
//@ chunk-e6aww6q8.js:3801750-3801777 placement
/**
 * 按会话记录已尝试过的工具行（弱集合）。
 */
class ToolRowsState {
  rows = new WeakSet();
}
//@ chunk-e6aww6q8.js:3801777-3801806 placement
/**
 * 按响应 id 记录等待时长。
 */
class ToolWaitByResponse {
  byResponse = new Map();
}
//@ chunk-e6aww6q8.js:3801806-3801817 placement
var MAX_WAIT_BY_RESPONSE_ENTRIES = 50;
//@ chunk-e6aww6q8.js:3801817-3801905 placement
/**
 * 判断缓存未命中的原因（未找到、超时、已列出但未入池）。
 */
function isCacheMissReason(bridgeEnd) {
  return bridgeEnd === "look_failed" || bridgeEnd === "look_timed_out" || bridgeEnd === "listed_not_pooled";
}
//@ chunk-e6aww6q8.js:3801905-3802154 placement
/**
 * 等待 MCP 工具所在服务器就绪并返回工具与等待信息；出错时记日志并返回未知状态。
 */
async function waitForMcpToolServer(e, n, r, s = {}) {
  let { signal } = r.abortController;
  function y(S) {
    return {
      tool: undefined,
      tools: n,
      waitedMs: 0,
      aborted: signal.aborted,
      ...S,
    };
  }
  try {
    return await getMcpServerType(e, n, r, s, y);
  } catch (error) {
    logError(error);
    return y({
      serverState: "unknown",
      initialServerState: "unknown",
    });
  }
}
//@ chunk-e6aww6q8.js:3802154-3802517 placement
/**
 * 判断调用的 MCP 工具是否值得等待：已能在刷新后的工具池找到，或对应服务器尚未出现在已知行中。
 */
function shouldWaitForMcpTool(name, toolUseContext) {
  if (typeof name !== "string") return false;
  let { refreshTools, toolAliases } = toolUseContext.options;
  let h = aliasOrSelf(name, toolAliases);
  if (!refreshTools || !mcpInfoFromString(h)) return false;
  let rows = toolUseContext.toolState.get(ToolRowsState).rows;
  try {
    return (
      findToolByName(refreshTools(), name, toolAliases) !== undefined ||
      findLongestPrefixClients(h, currentMcpClients(toolUseContext)).some(
        (S) => isPendingWithoutReconnect(S) && !rows.has(S),
      )
    );
  } catch (error) {
    logForDebugging(
      `Not waiting for MCP tool ${name}: reading its server or the tool pool failed: ${errorMessage(error)}`,
      {
        level: "warn",
      },
    );
    logError(error);
    return false;
  }
}
//@ chunk-e6aww6q8.js:3802517-3802575 placement
/**
 * 工具名属 MCP 且前缀客户端里有尚未连接完成的客户端。
 */
function isPendingMcpToolName(name, n) {
  return (
    mcpInfoFromString(name) !== null && findLongestPrefixClients(name, n).some(isPendingWithoutReconnect)
  );
}
//@ chunk-e6aww6q8.js:3802575-3802646 placement
function isPendingWithoutReconnect(e) {
  return e.type === "pending" && e.reconnectAttempt === undefined;
}
//@ chunk-e6aww6q8.js:3802646-3804158 placement
async function getMcpServerType(e, n, r, s, h) {
  let y = s.maxWaitMs ?? Math.min(getConnectionTimeoutMs(), MAX_MCP_WAIT_MS);
  let absentGraceMs = s.absentGraceMs ?? MCP_ABSENT_GRACE_MS;
  let connectedGraceMs = s.connectedGraceMs ?? 0;
  let rows = r.toolState.get(ToolRowsState).rows;
  let G = s.skipExhausted === true;
  let { signal } = r.abortController;
  let { toolAliases } = r.options;
  let serverConnection = aliasOrSelf(e, toolAliases);
  if (typeof serverConnection !== "string" || !mcpInfoFromString(serverConnection))
    return h({
      serverState: "not_mcp",
      initialServerState: "not_mcp",
    });
  function ke() {
    return findLongestPrefixClients(serverConnection, currentMcpClients(r));
  }
  function we() {
    return getMcpServerBaseUrlFromToolName(ke());
  }
  let Ee = new Set(ke().filter((gt) => isUnwaitedPendingClient(gt, G, rows)));
  function Ae(gt) {
    let At = ke();
    if (At.some((It) => Ee.has(It) || isUnwaitedPendingClient(It, G, rows))) return true;
    if (gt < connectedGraceMs && At.some((It) => It.type === "connected")) return true;
    return At.length === 0 && gt < absentGraceMs;
  }
  function Ie(gt) {
    return findToolByName(gt, e, toolAliases);
  }
  let Me = we();
  let refreshTools = r.options.refreshTools;
  if (!refreshTools)
    return h({
      serverState: Me,
      initialServerState: Me,
    });
  let ze = refreshTools();
  let lt = Ie(ze);
  if (lt)
    return {
      tool: lt,
      tools: ze,
      waitedMs: 0,
      serverState: Me,
      initialServerState: Me,
      aborted: false,
    };
  if (!Ae(0))
    return h({
      serverState: Me,
      initialServerState: Me,
    });
  let byResponse = r.toolState.get(ToolWaitByResponse).byResponse;
  let responseId = s.responseId;
  let pt = responseId ? y - (byResponse.get(responseId) ?? 0) : y;
  if (pt <= 0)
    return h({
      serverState: Me,
      initialServerState: Me,
    });
  let now = Date.now();
  while (!signal.aborted) {
    ze = refreshTools();
    lt = Ie(ze);
    let gt = Date.now() - now;
    if (lt || !Ae(gt) || gt >= pt) break;
    await sleep(MCP_WAIT_POLL_INTERVAL_MS, signal);
  }
  if (signal.aborted) lt = undefined;
  else if (!lt) {
    ze = refreshTools();
    lt = Ie(ze);
    if (!lt && pt === y && Date.now() - now >= pt) {
      for (let gt of ke()) if (Ee.has(gt)) rows.add(gt);
    }
  }
  let yt = Date.now() - now;
  if (responseId) {
    byResponse.set(responseId, (byResponse.get(responseId) ?? 0) + yt);
    for (let key of byResponse.keys()) {
      if (byResponse.size <= MAX_WAIT_BY_RESPONSE_ENTRIES) break;
      byResponse.delete(key);
    }
  }
  return {
    tool: lt,
    tools: lt ? ze : n,
    waitedMs: yt,
    serverState: we(),
    initialServerState: Me,
    aborted: signal.aborted,
  };
}
//@ chunk-e6aww6q8.js:3804158-3804318 placement
function getMcpServerBaseUrlFromToolName(e) {
  let mapped = e.map((r) => r.type);
  for (let r of ["connected", "cached", "pending", "needs-auth", "failed", "disabled"])
    if (mapped.includes(r)) return r;
  return "absent";
}
//@ chunk-e6aww6q8.js:3804318-3804375 placement
/**
 * 别名表里有该名字则返回别名，否则返回原名。
 */
function aliasOrSelf(e, toolAliases) {
  return toolAliases && Object.hasOwn(toolAliases, e) ? (toolAliases[e] ?? e) : e;
}
//@ chunk-e6aww6q8.js:3804375-3804529 placement
/**
 * 找出 MCP 前缀与工具名匹配且前缀最长的客户端列表。
 */
function findLongestPrefixClients(e, n) {
  let r = [];
  let s = 0;
  for (let h of n) {
    let mcpPrefix = getMcpPrefix_2(h.name);
    if (!e.startsWith(mcpPrefix) || mcpPrefix.length < s) continue;
    if (mcpPrefix.length > s) {
      s = mcpPrefix.length;
      r = [];
    }
    r.push(h);
  }
  return r;
}
//@ chunk-e6aww6q8.js:3804529-3804591 placement
/**
 * 客户端处于 pending 且不在已尝试集合里。
 */
function isUnwaitedPendingClient(e, n, rows) {
  return e.type === "pending" && !(n && rows.has(e));
}
//@ chunk-e6aww6q8.js:3804591-3805028 placement
/**
 * 解析工具输入：原始 JSON 无法解析时报 json 错误；可选先做 coerceInput 修复，再按 inputSchema 校验，返回解析结果与修复信息。
 */
function parseToolInput(tool, n, coercion) {
  if (isUnparsedInputMarker(n)) {
    let { raw, len } = n[UNPARSED_TOOL_INPUT_KEY];
    return {
      ok: false,
      phase: "parse",
      cause: "json",
      raw,
      len,
    };
  }
  let s = coercion === undefined ? (tool.coerceInput?.(n) ?? null) : coercion.repair;
  let h = coercion !== undefined || s === null ? n : s.input;
  let y = tool.inputSchema.safeParse(h);
  let coerced =
    s === null
      ? undefined
      : {
          shapeClass: s.shapeClass,
          valid: y.success,
          resultNote: s.resultNote,
        };
  if (!y.success)
    return {
      ok: false,
      phase: "parse",
      cause: "schema",
      error: y.error,
      schemaInput: h,
      coerced,
    };
  return {
    ok: true,
    input: y.data,
    coerced,
  };
}
//@ chunk-e6aww6q8.js:3805028-3805408 placement
/**
 * 调用 validateInput：失败时返回校验结论（被规则拒绝时补全可观测输入）；成功时按需生成补全后的可观测输入。
 */
async function runValidateInput(e, n, r) {
  let s = await r(n);
  if (s?.result === false) {
    let y;
    if (s.deniedByPermissionRule) {
      y = {
        ...n,
      };
      e.backfillObservableInput?.(y);
    }
    return {
      ok: false,
      phase: "validate",
      verdict: s,
      deniedInput: y,
    };
  }
  if (!e.backfillObservableInput)
    return {
      ok: true,
      callInput: n,
      observableInput: n,
      backfilled: false,
    };
  let h = {
    ...n,
  };
  e.backfillObservableInput(h);
  return {
    ok: true,
    callInput: n,
    observableInput: h,
    backfilled: true,
  };
}
//@ chunk-e6aww6q8.js:3805408-3805614 placement
/**
 * 把基于可观测输入改写的输入映射回实际调用输入（file_path 等）。
 */
function restoreCallInput(e, observableInput) {
  let { callInput, observableInput: observableInput_2, backfilled } = e;
  if (
    backfilled &&
    observableInput !== callInput &&
    "file_path" in observableInput &&
    "file_path" in callInput &&
    observableInput.file_path === observableInput_2.file_path
  )
    return {
      ...observableInput,
      file_path: callInput.file_path,
    };
  if (backfilled && observableInput === observableInput_2) return callInput;
  return observableInput;
}
//@ chunk-e6aww6q8.js:3805614-3805638 placement
var MAX_PREWARM_WAIT_MS = 300000;
var PREWARM_POLL_MS = 5000;
//@ chunk-e6aww6q8.js:3805638-3806688 placement
/**
 * 工具执行前预热远程记忆路径，处理中止、超时与挂载断开。
 */
async function warmRemoteMemoryPath(tool, n, signal, s) {
  try {
    let memoryBaseDir = getMemoryBaseDir();
    if (
      memoryBaseDir === undefined ||
      !tool.getPath ||
      isRemoteOnlyCheck(tool.name) ||
      (canRunToolsOnThisMachine() && hasHostField(n))
    )
      return false;
    let y = expandStablePath(tool.getPath(n));
    if (!isPathWithinCaseAware(y, memoryBaseDir, false)) return false;
    if (signal.aborted) return true;
    startSessionActivity("tool_exec", s);
    let combinedAbortSignal = createCombinedAbortSignal(signal, {
      timeoutMs: MAX_PREWARM_WAIT_MS,
      refTimer: true,
    });
    try {
      let now = Date.now();
      let L = await walkPermissionCheckPathsAsync(
        y,
        combinedAbortSignal.signal,
        (q) =>
          isPathWithinCaseAware(q, memoryBaseDir, false) || isPathWithinCaseAware(memoryBaseDir, q, false),
      );
      let G = {
        duration_ms: Date.now() - now,
      };
      if (signal.aborted) {
        if (G.duration_ms >= PREWARM_POLL_MS) logFeatureSad("remote_memory_path_warmup", "aborted", G);
      } else if (combinedAbortSignal.signal.aborted) logFeatureBad("remote_memory_path_warmup", "timed_out");
      else if (L.unresolved)
        switch (L.reason) {
          case "cut-short":
            logFeatureSad("remote_memory_path_warmup", "link_off_mount", G);
            break;
          case "unexamined":
            logFeatureSad("remote_memory_path_warmup", "lookup_failed", G);
            break;
          case "past-a-link":
            logFeatureSad("remote_memory_path_warmup", "link_unresolved", G);
            break;
          default:
            L.reason;
        }
      else if (G.duration_ms >= PREWARM_POLL_MS) logFeatureSad("remote_memory_path_warmup", "slow", G);
      else logFeatureOk("remote_memory_path_warmup");
    } finally {
      combinedAbortSignal.cleanup();
      endActivity("tool_exec", s);
    }
    if (isTerminalShutdown() && !signal.aborted) await heldUntilExit();
    return signal.aborted;
  } catch (error) {
    if (!(
      error instanceof NullBytePathError ||
      error instanceof UnstablePathError ||
      isNoProjectDirectoryError(error)
    ))
      logError(withTelemetryMessage(toError(error), "warmRemoteMemoryPath threw"));
    return false;
  }
}
//@ chunk-e6aww6q8.js:3900124-3900138 placement
var MEMORY_PREWARM_TIMEOUT_MS = 30000;
//@ chunk-e6aww6q8.js:3900138-3900640 placement
function emitToolHeartbeat({ toolName, toolUseID, abortSignal, onProgress }) {
  let now = Date.now();
  let y = false;
  let S = false;
  let w = 0;
  let interval = setInterval(() => {
    try {
      if (y) return;
      if (abortSignal.aborted) {
        G();
        return;
      }
      if (currentActivityState()) return;
      onProgress({
        type: "progress",
        toolUseID: `${toolUseID}-heartbeat-${w++}`,
        data: {
          type: "tool_heartbeat",
          toolName,
          elapsedTimeSeconds: Math.floor((Date.now() - now) / 1000),
        },
      });
    } catch (error) {
      S = true;
      G();
      logError(error);
      logFeatureBad("heartbeat_tool_progress", "tick_emit_threw");
    }
  }, MEMORY_PREWARM_TIMEOUT_MS);
  interval.unref();
  function G() {
    if (y) return;
    y = true;
    clearInterval(interval);
    if (w > 0 && !S) logFeatureOk("heartbeat_tool_progress");
  }
  return G;
}
//@ chunk-e6aww6q8.js:3906428-3906616 placement
function getEffortTelemetryFields(toolUseContext) {
  let mode = getToolPermissionContext(toolUseContext).mode;
  let effortLevelIfSupported = getEffortLevelIfSupported(
    getRuntimeMainLoopModel({
      permissionMode: mode,
      mainLoopModel: getMainLoopModel_2(toolUseContext),
      exceeds200kTokens: mode === "plan" && doesMostRecentAssistantMessageExceed200k(toolUseContext.messages),
    }),
    getEffortValue(toolUseContext),
    getEffortLayerOverride(toolUseContext.permissionLayers),
  );
  return effortLevelIfSupported
    ? {
        effort_level: fromEnum(effortLevelIfSupported),
      }
    : {};
}
//@ chunk-e6aww6q8.js:3906616-3907001 placement
/**
 * 为写入转录准备工具结果：MCP 或需要时裁掉过大的结果，编辑工具结果的 originalFile 过长时置空，返回结果、mcpMeta 与暂存 uuid。
 */
function cutResultForStorage(toolUseContext, tool, r, s) {
  let inSubagent = Boolean(toolUseContext.agentId);
  let y = isHearthReadTool(tool.name) && hasRelaySource(toolUseContext.options.mcpClients);
  let S =
    r || (tool.isMcp === true && !y && !toolUseContext.agentId)
      ? cutLargeMcpResult({
          ...s,
          keepsMcpMeta: y,
          inSubagent,
        })
      : s;
  let { toolUseResult, mcpMeta, uuid } =
    tool.isMcp !== true && tool.name === FILE_EDIT_TOOL_NAME && S.uuid === undefined
      ? {
          ...S,
          ...cutEditOriginalFile({
            toolUseId: s.toolUseId,
            toolUseResult: S.toolUseResult,
            mcpMeta: S.mcpMeta,
            inSubagent,
          }),
        }
      : S;
  return {
    toolUseResult,
    mcpMeta,
    uuid,
  };
}
//@ chunk-e6aww6q8.js:3907001-3907066 placement
function toolFeatureOf(signal) {
  return signal.aborted
    ? {
        abortKind: fromEnum(classifyAbortReasonForTelemetry(signal.reason)),
      }
    : {};
}
//@ chunk-e6aww6q8.js:3907066-3907259 placement
function measureStringChars(e, n = 0) {
  if (typeof e === "string") return e.length + 1;
  if (n >= 8 || e === null || typeof e !== "object") return 0;
  let r = 0;
  let s = Array.isArray(e) ? e : Object.values(e);
  for (let h of s) r += measureStringChars(h, n + 1);
  return r;
}
//@ chunk-e6aww6q8.js:3907259-3908209 placement
/**
 * 统计工具结果中大字段的长度（原文件、笔记本前后内容、文件内容/base64/cells、git diff、结构化补丁）用于遥测。
 */
function measureSidecarFields(output) {
  if (!isPlainObject_5(output)) return {};
  let sizes = {};
  if (typeof output.originalFile === "string") sizes.sidecarOriginalFileBytes = output.originalFile.length;
  if (typeof output.original_file === "string")
    sizes.sidecarNotebookOriginalFileBytes = output.original_file.length;
  if (typeof output.updated_file === "string")
    sizes.sidecarNotebookUpdatedFileBytes = output.updated_file.length;
  if (typeof output.content === "string") sizes.sidecarContentBytes = output.content.length;
  if (isPlainObject_5(output.file)) {
    let file = output.file;
    if (typeof file.content === "string") sizes.sidecarFileContentBytes = file.content.length;
    if (typeof file.base64 === "string") sizes.sidecarFileBase64Bytes = file.base64.length;
    if (Array.isArray(file.cells)) sizes.sidecarFileCellsBytes = measureStringChars(file.cells);
  }
  if (isPlainObject_5(output.gitDiff)) {
    let patch = output.gitDiff.patch;
    if (typeof patch === "string") sizes.sidecarGitDiffPatchBytes = patch.length;
  }
  if (Array.isArray(output.structuredPatch)) {
    let sidecarStructuredPatchBytes = 0;
    for (let patchHunk of output.structuredPatch) {
      if (!isPlainObject_5(patchHunk)) continue;
      let lines = patchHunk.lines;
      if (!Array.isArray(lines)) continue;
      for (let line of lines) if (typeof line === "string") sidecarStructuredPatchBytes += line.length + 1;
    }
    sizes.sidecarStructuredPatchBytes = sidecarStructuredPatchBytes;
  }
  return sizes;
}
//@ chunk-e6aww6q8.js:3908209-3908522 placement
/**
 * 估算工具结果的遥测指标：token 估计、图片/文档块数量，以及是否超过阈值需要落盘；出错时返回空对象。
 */
function getResultSizeTelemetry(content, tool) {
  try {
    return {
      toolResultTokensEst: roughTokenCountEstimationForContent(content),
      toolResultMediaBlocks: Array.isArray(content)
        ? count(content, (r) => r.type === "image" || r.type === "document")
        : 0,
      toolResultWillPersist:
        !!content &&
        !isToolResultContentEmpty(content) &&
        exceedsPersistThreshold(
          content,
          getPersistenceThreshold(
            tool.name,
            tool.maxResultSizeChars,
            tool.persistenceThresholdCeiling,
            tool.skipAggregateToolResultBudget === true,
          ),
        ),
    };
  } catch (error) {
    logError(error);
    return {};
  }
}
//@ chunk-e6aww6q8.js:3908522-3908619 placement
/**
 * 取工具对应的遥测特性名（MCP 工具按来源归类）。
 */
function toolFeatureName(name, mcpInfo) {
  let r = sdkHostToolSource(mcpInfo);
  if (r !== undefined) return toolFeature(r);
  return toolFeature(String(sanitizeToolNameWithMcpFlag(name, mcpInfo !== undefined)));
}
//@ chunk-e6aww6q8.js:3908619-3908673 placement
/**
 * 安全地处理未知工具（吞掉异常）。
 */
function resolveUnknownToolSafe(e, id, toolUseContext, requestId) {
  try {
    resolveUnknownTool(e, id, toolUseContext, requestId);
  } catch (error) {
    logError(error);
  }
}
//@ chunk-e6aww6q8.js:3908673-3909926 placement
/**
 * 处理找不到的工具名：未注册的 MCP 工具、未知工具，返回对应错误。
 */
function resolveUnknownTool(toolName, n, r, s) {
  let { connection, ambiguous } = resolveMcpConnectionForTool(toolName, r.options.mcpClients);
  let S = connection ? (connection.config.type ?? "stdio") : undefined;
  let w = connection ? getLoggingSafeMcpBaseUrl(connection.config) : undefined;
  let mcpServerType =
    !ambiguous &&
    isMcpServerLoggableInAnalytics(extractMcpToolDetails(toolName)?.serverName ?? "", connection?.config);
  let tool = findTool(r.options.toolCatalog.getAllBaseTools(), toolName);
  let q = toolNameForTelemetry(tool === undefined ? [] : [tool], toolName);
  let Z = q ? sanitizeToolNameForAnalytics(q) : getUnknownToolAnalyticsName(toolName);
  logForDebugging(`Unknown tool ${Z}: ${n}`);
  let Se = tool !== undefined && isArtifactFamilyTool(tool) && isBuiltInArtifactHiddenForMcp();
  logFeatureBad(
    String(Z) === "mcp_tool" ? toolFeature("unregistered_mcp") : toolFeature(String(Z)),
    "tool_not_found",
    Se
      ? {
          hidden_for_mcp: true,
        }
      : undefined,
  );
  let ke = {
    unknown_tool: lit_2("No such tool available: unknown_tool"),
    mcp_tool: lit_2("No such tool available: mcp_tool"),
    skill_tool: lit_2("No such tool available: skill_tool"),
  };
  logEvent("tengu_tool_use_error", {
    error: q
      ? lit_2("No such tool available: registered_base_tool")
      : (ke[String(Z)] ?? lit_2("No such tool available: unknown_tool")),
    errorCode: lit_2("NO_SUCH_TOOL"),
    toolName: Z,
    ...(Se && {
      hiddenForMcp: true,
    }),
    toolNameHash: shortHash(toolName),
    toolUseID: sanitizeMarkName(n),
    isMcp: toolName.startsWith("mcp__"),
    ...getSubagentTelemetryFields(r.agentContext),
    ...getEffortTelemetryFields(r),
    queryChainId: sanitizeMarkName(r.queryTracking?.chainId),
    queryDepth: r.queryTracking?.depth,
    ...(r.options.messageClientPlatform && {
      messageClientPlatform: entrypointForTelemetry(r.options.messageClientPlatform),
    }),
    ...(S && {
      mcpServerType: fromEnum(S),
    }),
    ...(w && {
      mcpServerBaseUrl: safeOrigin(w),
    }),
    ...claudeAiServerIdField(
      connection
        ? {
            serverType: connection.config.type,
            serverId: connectorServerId(connection.config),
          }
        : undefined,
    ),
    ...(s && {
      requestId: sanitizeMarkName(s),
    }),
    ...mcpToolDetailsForAnalytics(toolName, mcpServerType, connection !== undefined),
  });
}
//@ chunk-e6aww6q8.js:3909926-3909962 placement
/**
 * 判断错误是否属于中止/取消。
 */
function isAbortOrCancelError(error) {
  return isAbortError(error) || isCancel(error);
}
//@ chunk-e6aww6q8.js:3909962-3910048 placement
/**
 * 把中止错误转成工具错误文案（后台取消时附记忆更正提示）。
 */
function toolErrorTextForAbort(error, signal) {
  return isAbortOrCancelError(error) && signal.aborted && unwrapAbortReason(signal.reason) === "background"
    ? withMemoryCorrectionHint(CANCEL_MESSAGE)
    : formatToolErrorMessage(error);
}
//@ chunk-e6aww6q8.js:3910048-3910592 placement
/**
 * 后台代理或 dontAsk 模式下拒绝了带问题的权限请求时，调用工具的 settleUnaskedQuestion 给出替代答复（已问过、停止、中止或远程执行时跳过）。
 */
async function settleUnaskedQuestion(tool, decision, input, context, state) {
  if (tool.settleUnaskedQuestion === undefined || decision.behavior !== "deny") return;
  let decisionReason = decision.decisionReason;
  if (
    decisionReason.type !== "asyncAgent" &&
    !(decisionReason.type === "mode" && decisionReason.mode === "dontAsk")
  )
    return;
  let ask = decisionReason.ask;
  let { signal } = context.abortController;
  if (
    ask === undefined ||
    state.asked ||
    ask.hooksMayRefuse === true ||
    decision.endsTurn ||
    state.stopped ||
    signal.aborted ||
    context.forRemoteExecution === true ||
    getToolPermissionContext(context).servedCall === true
  )
    return;
  try {
    let L = await tool.settleUnaskedQuestion(
      ask,
      input,
      context,
      decisionReason.type === "asyncAgent" && decisionReason.hookAllowIgnored === true,
      decisionReason.type === "mode",
    );
    return L === "" || signal.aborted ? undefined : L;
  } catch (error) {
    if (!isAbortOrCancelError(error)) logError(error);
    return;
  }
}
//@ chunk-e6aww6q8.js:3910592-3910770 placement
function getInterruptKind(error, signal) {
  let interrupted = error instanceof ShellError && error.interrupted;
  if (!(error instanceof AbortError_2 || interrupted || (isAbortOrCancelError(error) && signal.aborted)))
    return;
  return signal.aborted && unwrapAbortReason(signal.reason) === "background" ? "cancelled" : "interrupted";
}
//@ chunk-e6aww6q8.js:3910770-3911894 placement
/**
 * 把工具执行错误归类为错误码（MCP 认证、OAuth、shell 错误等）。
 */
function classifyToolErrorCode(error) {
  if (error instanceof McpAuthError)
    return {
      code: "tool_mcp_auth_error",
      isSad: true,
    };
  if (
    error instanceof Error &&
    (("code" in error && typeof error.code === "string") ||
      ("errorCode" in error && typeof error.errorCode === "string")) &&
    /^HTTP 40[13]\b/.test(error.message)
  )
    return {
      code: "tool_mcp_oauth_error",
      isSad: true,
    };
  if (error instanceof ShellError)
    return {
      code: "tool_shell_error",
      isSad: true,
    };
  if (error instanceof McpToolCallError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS)
    return {
      code: "tool_mcp_call_error",
      isSad: true,
    };
  if (isSadFsErrno(error) || isEnvFsErrno(error))
    return {
      code: "tool_fs_error",
      isSad: true,
    };
  if (error instanceof MaxFileReadTokenExceededError)
    return {
      code: "tool_read_budget_exceeded",
      isSad: true,
    };
  if (error instanceof TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS)
    return {
      code: "tool_telemetry_safe_error",
      isSad: true,
    };
  if (error instanceof MalformedCommandError)
    return {
      code: "tool_malformed_command",
      isSad: true,
    };
  if (error instanceof Error) {
    let r = error.name !== "Error" ? error.name : (error.constructor?.name ?? "");
    if (KNOWN_ERROR_CLASS_NAMES.has(r))
      return {
        code:
          "reasonCode" in error &&
          typeof error.reasonCode === "string" &&
          /^[a-z][a-z0-9_]{2,39}$/.test(error.reasonCode)
            ? error.reasonCode
            : "tool_expected_error",
        isSad: true,
      };
  }
  if (error instanceof DOMException && error.name === "TimeoutError")
    return {
      code: "tool_mcp_transport_error",
      isSad: true,
    };
  let errnoCode = getErrnoCode(error);
  if (errnoCode !== undefined && RETRYABLE_CONNECT_CODES.has(errnoCode))
    return {
      code: "tool_mcp_transport_error",
      isSad: true,
    };
  return {
    code: "tool_call_threw",
    isSad: false,
  };
}
//@ chunk-e6aww6q8.js:3911894-3912026 placement = getToolNameForPermissionCheck (1)
function getToolNameForPermissionCheck_3(tool) {
  let n = (r) => tool.some((s) => s.mcpInfo?.serverName === CLAUDE_ARTIFACTS && s.mcpInfo.toolName === r);
  return (
    findToolByName(tool, WEBFETCH) !== undefined && n(ARTIFACTS_MCP_READ_TOOL) && n(ARTIFACTS_MCP_GET_TOOL)
  );
}
//@ chunk-e6aww6q8.js:3912026-3918095 placement
/**
 * 当内置 Artifact 工具被替换或不可用时，告诉模型应该调用哪些工具。
 */
function explainUnavailableArtifactTool(
  toolName,
  tool,
  allBaseTools,
  isRestrictedContext,
  tools,
  mcpClients,
  agentSpawnContext = {},
  w,
  L,
  G,
) {
  let tool_2 = G?.sourceFor(toolName) ?? L?.sourceFor(toolName);
  if (tool_2?.mcpInfo !== undefined && mcpInfoFromString(toolName) === null)
    return describeUnavailableMcpTool(
      toolName,
      isRestrictedContext,
      tools,
      mcpClients,
      tool_2,
      G === undefined && isToolSearchInPool(tool),
    );
  let tool_3 = findTool(allBaseTools, toolName);
  if (
    tool_3 !== undefined &&
    isArtifactFamilyTool(tool_3) &&
    isBuiltInArtifactHiddenForMcp() &&
    tool.some((At) => At.mcpInfo?.serverName === CLAUDE_ARTIFACTS)
  ) {
    let At =
      !isByocEnvironment() && getToolNameForPermissionCheck_3(tool)
        ? ` ${WEBFETCH} can read claude.ai artifact links.`
        : "";
    return G === undefined && isToolSearchInPool(tool)
      ? `. In this session the built-in Artifact tools were replaced by the tools of the MCP server '${CLAUDE_ARTIFACTS}': find them with ${TOOL_SEARCH_TOOL_NAME} and call those instead.${At}`
      : `. In this session the built-in Artifact tools were replaced by the tools of the MCP server '${CLAUDE_ARTIFACTS}', which are in your tool list: call those instead.${At}`;
  }
  if (
    !isByocEnvironment() &&
    tool_3 !== undefined &&
    isArtifactFamilyTool(tool_3) &&
    isBuiltInArtifactHiddenForMcp() &&
    !tools.some((At) => At.name === CLAUDE_ARTIFACTS && At.type === "connected")
  )
    return `. The Artifacts tools aren't available in this session right now: the MCP server '${CLAUDE_ARTIFACTS}' that replaced the built-in Artifact tools isn't connected. Tell the user; /mcp can reconnect or re-enable it, or restarting Claude Code restores the tools.`;
  if (
    !isByocEnvironment() &&
    toolName === buildMcpToolName(CLAUDE_ARTIFACTS, ARTIFACTS_MCP_READ_SHARED_TOOL) &&
    isBuiltInArtifactHiddenForMcp()
  ) {
    let any = tool.some(
      (qt) => qt.mcpInfo?.serverName === CLAUDE_ARTIFACTS && qt.mcpInfo.toolName === ARTIFACTS_MCP_READ_TOOL,
    );
    let toolNameForPermissionCheck = getToolNameForPermissionCheck_3(tool);
    let Yt = any
      ? ` ${ARTIFACTS_MCP_READ_TOOL} reads an artifact the user owns, or one from their organization that they can open; ${toolNameForPermissionCheck ? `for a link ${ARTIFACTS_MCP_READ_TOOL} refuses, use ${WEBFETCH}.` : "for anything else, tell the user."}`
      : " Tell the user.";
    return `. ${ARTIFACTS_MCP_READ_SHARED_TOOL} isn't available in local Claude Code sessions.${Yt}`;
  }
  let toolByName = findToolByName(tool, ARTIFACT_TOOL_NAME_2);
  if (
    toolByName !== undefined &&
    mcpInfoFromString(toolName)?.serverName === CLAUDE_ARTIFACTS &&
    tools.some(isEntryRowNotServed)
  )
    return `. The MCP server '${CLAUDE_ARTIFACTS}' is no longer served in this session, and the built-in Artifact tools are back${suggestToolInstead(toolByName, tool, L, G)}`;
  let ke = aliasOfToolName(toolName) ?? tool_3?.underlyingV1ToolName;
  if (
    isRestrictedContext &&
    tool_3 &&
    (toolMatchesAnyName(tool_3, EXTERNAL_ALWAYS_AVAILABLE_TOOLS) || tool_3.name === POLL)
  )
    return `. ${toolName} is not available inside subagents. Complete the task with the tools provided and return findings to the orchestrator.`;
  if (tool_3?.name === BRIEF_TOOL_NAME_2)
    return `. ${toolName} is not enabled in this session \u2014 write your message as normal assistant text instead.`;
  if (tool_3?.name === GET_TASK_TOOL_TEXT) return GET_TASK_NOT_A_TOOL_TEXT;
  let we = tool_3 && toolByAlias(tool_3.name);
  if (
    tool_3 &&
    !isRestrictedContext &&
    isCoordinatorMode_2() &&
    !env.CLAUDE_CODE_SIMPLE &&
    !COORDINATOR_MAIN_THREAD_TOOL_NAMES.has(tool_3.name) &&
    tool_3.name !== POLL &&
    toolMatchesAnyName(tool_3, EXTERNAL_ALWAYS_AVAILABLE_TOOLS_2) &&
    tool_3.isEnabled() &&
    !getDenyRuleForTool(mcpClients, tool_3) &&
    (ke === undefined ||
      !getDenyRuleForTool(mcpClients, {
        name: ke,
      })) &&
    (we === undefined || !we.isEnabled() || !getDenyRuleForTool(mcpClients, we)) &&
    findToolByName(tool, AGENT)
  )
    return `. ${toolName} is not available to you as the coordinator \u2014 run it from a worker via the ${AGENT} tool instead.`;
  if (tool_3?.name === WEBFETCH && tool_3.isEnabled() && !getDenyRuleForTool(mcpClients, tool_3)) {
    let At = typeof w === "object" && w !== null && "url" in w ? parseArtifactUrlInput(w.url) : null;
    if (
      At !== null &&
      At.env === claudeAiEnvironment() &&
      findToolByName(tool, ARTIFACT_TOOL_NAME_2) &&
      !getDenyRuleForTool(mcpClients, {
        name: ARTIFACT_TOOL_NAME_2,
      })
    )
      return `. ${artifactViewerUrlFor(At)} is a claude.ai artifact \u2014 read it with the ${ARTIFACT_TOOL_NAME_2} tool (action: "read", url) instead of ${WEBFETCH}.`;
    let It =
      At !== null &&
      At.env === claudeAiEnvironment() &&
      isBuiltInArtifactHiddenForMcp() &&
      !getDenyRuleForTool(mcpClients, {
        name: ARTIFACT_TOOL_NAME_2,
      })
        ? tool.find(
            (Yt) =>
              Yt.mcpInfo?.serverName === CLAUDE_ARTIFACTS && Yt.mcpInfo.toolName === ARTIFACTS_MCP_READ_TOOL,
          )
        : undefined;
    if (At !== null && It !== undefined)
      return `. ${artifactViewerUrlFor(At)} is a claude.ai artifact \u2014 read it with ${It.name} (slug: "${At.slug}") instead of ${WEBFETCH}.`;
    if (
      canUseWebFetchAgent(tool, mcpClients, {
        activeAgents: agentSpawnContext.activeAgents,
      })
    ) {
      if (canUseWebFetchAgent(tool, mcpClients, agentSpawnContext))
        return `. ${WEBFETCH} is not available directly in this context \u2014 use the ${AGENT} tool with subagent_type: "${WEB_FETCH_AGENT}" to read web pages instead.`;
      return (agentSpawnContext.depth ?? 0) === 0
        ? `. ${WEBFETCH} is not available in this context, and the ${WEB_FETCH_AGENT} agent that reads web pages for this session is outside this session's allowed subagent types. If the page is required, tell the user.`
        : `. ${WEBFETCH} is not available in this context, and the ${WEB_FETCH_AGENT} agent that reads web pages for this session cannot be dispatched from here (this agent's nesting depth or allowed subagent types rule it out). If the page is required, say so in your report so the caller can fetch it.`;
    }
  }
  let Ee = G ?? (isToolSearchInPool(tool) ? L : undefined);
  let Ae =
    (L?.keeps(toolName) === true || G?.keeps(toolName) === true) &&
    tool_2?.mcpInfo === undefined &&
    mcpInfoFromString(toolName) === null &&
    !toolMatchesAnyName(
      {
        name: toolName,
        underlyingV1ToolName: ke,
      },
      getShadowedSearchToolNames(),
    );
  let Ie = Ae && isPermanentUnavailabilityFor(describeToolAvailability(toolName, tools, mcpClients, tool_2));
  let Me = Ae && Ee?.keeps(toolName) === true && !Ie && !findToolByName(tool, toolName);
  let We = tool_3?.name === SENDMESSAGE;
  let ze =
    We && canSpawnSubagents(tool, mcpClients, agentSpawnContext)
      ? ` To follow up on an agent's work, start a new ${AGENT} call with everything it needs in its prompt.`
      : "";
  let lt = We
    ? ` An agent cannot be continued from this context. To message another session, use your host application's own messaging tool if it provides one; otherwise that is not possible from here.${ze}`
    : "";
  if (Me) {
    if (
      tool_3 !== undefined &&
      (!tool_3.isEnabled() ||
        isToolOmittedByLaunchToolList(mcpClients, tool_3) ||
        isOutsideLaunchToolList(mcpClients, tool_3))
    )
      return toolName === ASKUSERQUESTION && !canPromptUserForPermission()
        ? `. ${toolName} is still listed for this conversation, but nobody in this session can answer it, so it cannot run. Continue without it; if you need the user's decision, ask in your response text instead.`
        : `. ${toolName} is still listed for this conversation but is switched off in this session right now, so it cannot run. Continue without it.${lt}`;
    return `. ${toolName} is still listed for this conversation, but nothing in this session provides it right now (its source was removed or disconnected, or this version no longer has it), so it cannot run. Continue without it.${lt}`;
  }
  if (We) return `. ${SENDMESSAGE} is not among the tools available here.${lt}`;
  if (tool_3 || Ie)
    return Ie ||
      !tool_3?.isEnabled() ||
      getDenyRuleForTool(mcpClients, tool_3) ||
      isOutsideLaunchToolList(mcpClients, tool_3) ||
      (ke !== undefined &&
        getDenyRuleForTool(mcpClients, {
          name: ke,
        })) ||
      (we?.isEnabled() && getDenyRuleForTool(mcpClients, we))
      ? `. ${toolName} is disabled for this session, in subagents as well as here.`
      : `. ${toolName} is not among the tools available here. Continue with the tools you have.`;
  if (
    toolMatchesAnyName(
      {
        name: toolName,
        underlyingV1ToolName: ke,
      },
      getShadowedSearchToolNames(),
    )
  ) {
    let At = (ke ?? toolName) === GLOB_TOOL_NAME ? GLOB_TOOL_NAME : GREP_TOOL_NAME;
    if (!findToolByName(tool, BASH_TOOL_NAME)) return `. ${At} is disabled for this session.`;
    return At === GLOB_TOOL_NAME
      ? `. ${GLOB_TOOL_NAME} is not available in this session \u2014 find files with \`find\` via the ${BASH_TOOL_NAME} tool instead.`
      : `. ${GREP_TOOL_NAME} is not available in this session \u2014 search file contents with \`grep\` via the ${BASH_TOOL_NAME} tool instead.`;
  }
  let Je = isRestrictedContext ? "" : suggestWaitForMcpServers(toolName, tool, tools);
  if (Je) return Je;
  if (
    (areDeferredToolsKept() && deferredToolCache().hasTool(toolName)) ||
    L?.has(toolName) ||
    G?.has(toolName)
  )
    return describeUnavailableMcpTool(
      toolName,
      isRestrictedContext,
      tools,
      mcpClients,
      tool_2,
      G === undefined && isToolSearchInPool(tool),
    );
  if (typeof toolName !== "string") return "";
  let filtered = tool.filter((At) => At.name.toLowerCase() === toolName.toLowerCase());
  let [pt] = filtered;
  if (pt !== undefined && filtered.length === 1 && !isDeferredToolInConversation(pt, L, tool))
    return `. Tool names are case-sensitive: call ${pt.name} instead.`;
  let found = CHROME_TOOL_NAMES.find((At) => At === toolName);
  if (found !== undefined) {
    let filtered = tool.filter((Yt) => {
      let lower = Yt.name.toLowerCase();
      return lower === found || lower.endsWith(`__${found}`);
    });
    let [It] = filtered;
    if (
      It !== undefined &&
      filtered.length === 1 &&
      isInputSchemaCompatible(It, w) &&
      CHROME_TOOL_PREFIXES.some((Yt) => It.name === Yt + found)
    )
      return suggestToolInstead(It, tool, L, G);
  }
  let yt = matchLocalToolAlias(
    toolName,
    tool.map((At) => At.name),
  );
  let gt = yt === undefined ? undefined : findToolByName(tool, yt);
  if (gt !== undefined && isInputSchemaCompatible(gt, w)) return suggestToolInstead(gt, tool, L, G);
  return "";
}
//@ chunk-e6aww6q8.js:3918095-3918311 placement
function isInputSchemaCompatible(e, n) {
  let properties = e.inputJSONSchema?.properties;
  let required = e.inputJSONSchema?.required;
  return (
    properties === undefined ||
    (isPlainObject_4(n) &&
      Object.keys(n).every((key) => Object.hasOwn(properties, key)) &&
      (Object.keys(n).length > 0 || !Array.isArray(required) || required.length === 0))
  );
}
//@ chunk-e6aww6q8.js:3918311-3918503 placement
function suggestToolInstead(e, n, r, s) {
  return s === undefined && isToolSearchInPool(n) && isDeferredToolInConversation(e, r, n)
    ? `. Call ${e.name} instead, loading it first with ${TOOL_SEARCH_TOOL_NAME} query "select:${e.name}" if it is not loaded yet.`
    : `. Call ${e.name} instead.`;
}
//@ chunk-e6aww6q8.js:3918503-3921286 placement
/**
 * 为不可用的 MCP 工具生成说明后缀：按状态（重连中、需授权、策略阻止、保留地址、断开、禁用、关闭、组织阻止、已认证占位、未提供、被拒、未配置）给出继续方式。
 */
function describeUnavailableMcpTool(toolName, isRestrictedContext, tools, mcpClients, tool, viaToolSearch) {
  if (tool?.mcpInfo === undefined && !toolName.startsWith("mcp__")) return "";
  let availability = describeToolAvailability(toolName, tools, mcpClients, tool);
  let sharedNote = appToolServerErrorSuffix(availability, Boolean(isRestrictedContext));
  if (sharedNote !== undefined) return sharedNote;
  switch (availability.kind) {
    case "reconnecting":
      return isRestrictedContext
        ? `. Its MCP server '${availability.serverName}' is not connected in this context. Continue without this tool.`
        : `. Its MCP server '${availability.serverName}' is still connecting; try again shortly.`;
    case "needs_auth":
      return isRestrictedContext
        ? `. Its MCP server '${availability.serverName}' is not available in this context. Continue without this tool.`
        : `. Its MCP server '${availability.serverName}' needs the user to re-authorize it before its tools work again. Continue without this tool and tell the user if the task depends on it.`;
    case "policy_blocked":
      return `. Its MCP server '${availability.serverName}' is blocked by the organization's policy or settings, so this tool will not become available in this session. Continue without it.`;
    case "reserved_address":
      return `. Claude Code refuses its MCP server '${availability.serverName}' because it reserves that server's address for its own use, so this tool will not become available in this session. Continue without it.`;
    case "disconnected":
      return isRestrictedContext
        ? `. Its MCP server '${availability.serverName}' is not available in this context. Continue without this tool.`
        : `. Its MCP server '${availability.serverName}' has disconnected. Continue without this tool; it becomes callable again only if the server reconnects.`;
    case "disabled":
      return `. Its MCP server '${availability.serverName}' was disabled by the user. Continue without this tool.`;
    case "switched_off":
      return `. Its MCP server '${availability.serverName}' has been switched off. Continue without this tool.`;
    case "org_blocked":
      return availability.byClaudeCode
        ? `. Claude Code itself blocks this tool from MCP server '${availability.serverName}', so it will not become available in this session. Continue without it.`
        : `. Your organization's administrator has blocked this tool from MCP server '${availability.serverName}', so it will not become available in this session. Continue without it.`;
    case "auth_completed":
      return isRestrictedContext
        ? `. This authentication placeholder for MCP server '${availability.serverName}' is no longer needed and its tools are not available in this context. Continue without it.`
        : viaToolSearch
          ? `. The MCP server '${availability.serverName}' has since been authenticated and its real tools are available: find them with ${TOOL_SEARCH_TOOL_NAME} instead of calling this placeholder.`
          : `. The MCP server '${availability.serverName}' has since been authenticated and its real tools are now in your tool list; call those instead of this placeholder.`;
    case "not_offered":
      return `. Its MCP server '${availability.serverName}' is connected but does not offer this tool here. Continue without it.`;
    case "denied":
      return ". A permissions deny rule now blocks this tool; do not call it again.";
    case "not_configured":
      return ". No MCP server in this session provides it; continue without this tool.";
    case "replaced":
    case "withdrawn":
      return "";
  }
}
//@ chunk-e6aww6q8.js:3921286-3921570 placement
function suggestWaitForMcpServers(e, n, r) {
  let h = /^mcp__(.+?)__/.exec(e)?.[1];
  if (!h) return "";
  if (!findToolByName(n, WAITFORMCPSERVERS)) return "";
  let y = normalizeNameForMCP(h);
  let found = r.find((w) => w.type === "pending" && (w.name === h || normalizeNameForMCP(w.name) === y));
  if (!found) return "";
  return `. The MCP server '${found.name}' is still connecting. Call ${WAITFORMCPSERVERS} to wait for it, then try again.`;
}
//@ chunk-e6aww6q8.js:3921570-3921625 placement
/**
 * 生成指定数量的图片占位符。
 */
function makeImagePlaceholders(imageCount) {
  return Array.from(
    {
      length: imageCount,
    },
    () => mintPasteId(),
  );
}
//@ chunk-e6aww6q8.js:3921625-3921657 placement = extractErrorTypeFromData (1)
/**
 * 对象是否带 type 字段。
 */
function hasTypeField(data) {
  return "type" in data;
}
//@ chunk-e6aww6q8.js:3921657-3921681 placement
/**
 * 按会话记录已触发过的工具别名。
 */
class AliasFireState {
  fired = new Set();
}
//@ chunk-e6aww6q8.js:3921681-3921830 placement
function shouldLogGitCommitDetails(tool, callInput) {
  return (
    isToolDetailsLoggingEnabled() &&
    (tool.name === BASH_TOOL_NAME || tool.name === POWERSHELL_TOOL_NAME) &&
    typeof callInput === "object" &&
    callInput !== null &&
    "command" in callInput &&
    typeof callInput.command === "string" &&
    isGitCommitCommand(callInput.command)
  );
}
//@ chunk-e6aww6q8.js:3921830-3921913 placement
/**
 * 取当前调用所属的后台代理 id。
 */
function backgroundAgentIdOf(toolUseContext) {
  return (
    getBackgroundAgentId(toolUseContext.agentContext) ??
    (toolUseContext.isBackgroundAgent ? toolUseContext.agentId : undefined)
  );
}
//@ chunk-e6aww6q8.js:3921913-3927718 placement
/**
 * runToolUse：单个 tool_use 的入口。等待前置排空与会话活动锁，按名字/别名查工具（别名调用记 tengu_dead_probe_tool_alias_exec），工具缺失但 MCP 服务器连接中时等待；检查隔离锁（拒绝时返回 permission-rule 错误）；判定在本机、远端或拒绝运行；本机时进 streamedCheckPermissionsAndCallTool。异常转成 tool_result 错误并按错误码分类上报。
 */
async function* runToolUse(
  toolUse,
  assistantMessage,
  canUseTool,
  toolUseContext,
  now,
  stallSampler = profileCheckpoint_2,
) {
  if (areAttachmentFilesArriving())
    await waitForAttachmentFiles(toolUseContext.abortController.signal, {
      activityAgentId: backgroundAgentIdOf(toolUseContext),
    });
  let S = stagedFilesWaiterByRoot.peek(toolUseContext.session);
  if (S !== undefined && S.pending() > 0)
    await waitForStagedToolCallFiles(
      S,
      toolUseContext.abortController.signal,
      backgroundAgentIdOf(toolUseContext),
    );
  if (isTerminalShutdown() && !toolUseContext.abortController.signal.aborted) await heldUntilExit();
  let w = toolUse.name;
  let tool = findTool(toolUseContext.options.tools, w, toolUseContext.options.toolAliases);
  if (
    tool &&
    tool.name !== w &&
    tool.aliases?.includes(w) &&
    !toolUseContext.toolState.get(AliasFireState).fired.has(w)
  ) {
    toolUseContext.toolState.get(AliasFireState).fired.add(w);
    logEvent("tengu_dead_probe_tool_alias_exec", {
      alias: sanitizeToolNameForAnalytics(w),
      tool: sanitizeToolNameForAnalytics(tool.name),
    });
  }
  let id = assistantMessage.message.id;
  let requestId = assistantMessage.requestId;
  if (!tool && shouldWaitForMcpTool(w, toolUseContext)) {
    let lt = await waitForMcpToolServer(w, toolUseContext.options.tools, toolUseContext, {
      absentGraceMs: 0,
      skipExhausted: true,
      responseId: id ? `${requestId ?? ""}|${id}` : undefined,
    });
    logEvent("tengu_mcp_pending_tool_wait", {
      found: lt.tool !== undefined,
      aborted: lt.aborted,
      waited_ms: lt.waitedMs,
      server_state: fromEnum(lt.serverState),
      server_state_at_start: fromEnum(lt.initialServerState),
      handed_off: assistantMessage.handedOff === true,
    });
    if (lt.tool) {
      let options = toolUseContext.options;
      let nt = {
        ...options,
        tools: lt.tools,
        mcpClients: [...currentMcpClients(toolUseContext)],
        activeMcpServer: undefined,
        activeMcpTool: undefined,
      };
      try {
        yield* runToolUse(
          toolUse,
          assistantMessage,
          canUseTool,
          {
            ...toolUseContext,
            options: nt,
          },
          now,
          stallSampler,
        );
      } finally {
        if (nt.activeMcpServer !== undefined && !toolUseContext.abortController.signal.aborted) {
          options.activeMcpServer = nt.activeMcpServer;
          options.activeMcpTool = nt.activeMcpTool;
        }
      }
      return;
    }
    if (lt.aborted) {
      yield {
        message: createCancelledToolResult(
          toolUse.id,
          assistantMessage,
          toolUseContext.abortController.signal,
          now,
        ),
      };
      return;
    }
    if (isTerminalShutdown() && !toolUseContext.abortController.signal.aborted) await heldUntilExit();
  }
  if (!tool) {
    let lt = explainUnavailableArtifactTool(
      w,
      toolUseContext.options.tools,
      toolUseContext.options.toolCatalog.getAllBaseTools(),
      toolUseContext.agentId,
      currentMcpClients(toolUseContext),
      getToolPermissionContext(toolUseContext),
      getAgentSpawnContext(toolUseContext),
      toolUse.input,
      cachedDeclaredTools(toolUseContext),
      cachedNoChannelTools(toolUseContext),
    );
    resolveUnknownToolSafe(w, toolUse.id, toolUseContext, requestId);
    yield {
      message: createUserMessage({
        content: [
          {
            type: "tool_result",
            content: `<tool_use_error>Error: No such tool available: ${w}${lt}</tool_use_error>`,
            is_error: true,
            tool_use_id: toolUse.id,
          },
        ],
        toolUseResult: `Error: No such tool available: ${w}${lt}`,
        sourceToolAssistantUUID: assistantMessage.uuid,
        now,
      }),
    };
    return;
  }
  recordToolUsePair(w, tool.name);
  let { connection, ambiguous } = resolveMcpConnectionForTool(w, toolUseContext.options.mcpClients);
  let ke = connection && isConnectedOrCached(connection) ? connection : undefined;
  let mcpServerType = ke ? (ke.config.type ?? "stdio") : undefined;
  let mcpServerBaseUrl = ke ? getLoggingSafeMcpBaseUrl(ke.config) : undefined;
  let serverName = extractMcpToolDetails(w)?.serverName;
  let Ie = serverName !== undefined && serverName !== extractMcpToolDetails(tool.name)?.serverName;
  let mcpNameLoggable =
    !ambiguous &&
    !Ie &&
    isMcpServerLoggableInAnalytics(extractMcpToolDetails(w)?.serverName ?? "", ke?.config);
  let We = toolFeatureName(tool.name, tool.mcpInfo);
  let input = toolUse.input;
  try {
    if (toolUseContext.abortController.signal.aborted) {
      logEvent("tengu_tool_use_cancelled", {
        toolName: sanitizeToolNameForAnalytics(tool.name),
        toolUseID: sanitizeMarkName(toolUse.id),
        isMcp: tool.isMcp ?? false,
        phase: lit_2("entry"),
        abortKind: fromEnum(classifyAbortReasonForTelemetry(toolUseContext.abortController.signal.reason)),
        queryChainId: sanitizeMarkName(toolUseContext.queryTracking?.chainId),
        queryDepth: toolUseContext.queryTracking?.depth,
        ...(mcpServerType && {
          mcpServerType: fromEnum(mcpServerType),
        }),
        ...(mcpServerBaseUrl && {
          mcpServerBaseUrl: safeOrigin(mcpServerBaseUrl),
        }),
        ...(requestId && {
          requestId: sanitizeMarkName(requestId),
        }),
        ...mcpToolAnalyticsFields(tool.name, mcpNameLoggable),
        ...claudeAiServerIdField(tool.mcpInfo),
        ...tool.mcpInfo?.pluginTelemetry,
      });
      yield {
        message: createCancelledToolResult(
          toolUse.id,
          assistantMessage,
          toolUseContext.abortController.signal,
          now,
        ),
      };
      return;
    }
    let lt = isHookCallerVirtualTool(assistantMessage, toolUseContext)
      ? null
      : getNotLoadedToolVerdict(tool, toolUseContext, toolUse.id);
    if (lt !== null) {
      try {
        let gt = {
          family: fromEnum(lt.family),
          late: lt.late,
          loadInSameReply: lt.loadInSameReply,
          firstForTool: lt.firstForTool,
          relayActive: lt.relayActive,
          flagSource: fromEnum(lt.flagSource),
          coworkSurface: lt.coworkSurface,
          toolName: lit_2("mcp_tool"),
          isMcp: true,
          ...getSubagentTelemetryFields(toolUseContext.agentContext),
          ...getEffortTelemetryFields(toolUseContext),
          queryChainId: sanitizeMarkName(toolUseContext.queryTracking?.chainId),
          queryDepth: toolUseContext.queryTracking?.depth,
          ...(toolUseContext.options.messageClientPlatform && {
            messageClientPlatform: entrypointForTelemetry(toolUseContext.options.messageClientPlatform),
          }),
          ...(mcpServerType && {
            mcpServerType: fromEnum(mcpServerType),
          }),
          ...(mcpServerBaseUrl && {
            mcpServerBaseUrl: safeOrigin(mcpServerBaseUrl),
          }),
          ...(requestId && {
            requestId: sanitizeMarkName(requestId),
          }),
          ...mcpToolAnalyticsFields(tool.name, mcpNameLoggable),
          ...claudeAiServerIdField(tool.mcpInfo),
          ...tool.mcpInfo?.pluginTelemetry,
        };
        logEvent("tengu_tool_use_not_loaded", {
          enforced: lt.enforced,
          toolUseID: sanitizeMarkName(toolUse.id),
          ...gt,
        });
        if (lt.enforced) {
          logFeatureSad(We, "tool_not_loaded");
          logEvent("tengu_tool_use_error", {
            error: lit_2("InputValidationError"),
            errorCode: fromEnum(TOOL_NOT_LOADED),
            messageID: sanitizeMarkName(id),
            ...gt,
          });
        }
      } catch (error) {
        logNotLoadedCheckFailure("telemetry", error);
      }
      if (lt.enforced) {
        yield {
          message: createUserMessage({
            content: [
              {
                type: "tool_result",
                content: `<tool_use_error>${lt.message}</tool_use_error>`,
                is_error: true,
                tool_use_id: toolUse.id,
              },
            ],
            toolUseResult: lt.message,
            sourceToolAssistantUUID: assistantMessage.uuid,
            now,
          }),
        };
        return;
      }
    }
    let Je = checkWebIsolation(tool, toolUseContext, toolUse.input);
    if (Je.denyMessage) {
      logFeatureSad(We, "tool_isolation_denied");
      logEvent("tengu_tool_use_isolation_latch_denied", {
        toolName: sanitizeToolNameForAnalytics(tool.name),
        toolUseID: sanitizeMarkName(toolUse.id),
        isMcp: tool.isMcp ?? false,
        isolationLatch: fromEnumOpt(Je.activeLatch),
        isolationClassifiedAs: fromEnumOpt(Je.classifiedAs),
        queryChainId: sanitizeMarkName(toolUseContext.queryTracking?.chainId),
        queryDepth: toolUseContext.queryTracking?.depth,
        ...(mcpServerType && {
          mcpServerType: fromEnum(mcpServerType),
        }),
        ...(mcpServerBaseUrl && {
          mcpServerBaseUrl: safeOrigin(mcpServerBaseUrl),
        }),
        ...(requestId && {
          requestId: sanitizeMarkName(requestId),
        }),
        ...mcpToolAnalyticsFields(tool.name, mcpNameLoggable),
        ...claudeAiServerIdField(tool.mcpInfo),
        ...tool.mcpInfo?.pluginTelemetry,
      });
      yield {
        message: createUserMessage({
          content: [
            {
              type: "tool_result",
              content: `<tool_use_error>${Je.denyMessage}</tool_use_error>`,
              is_error: true,
              tool_use_id: toolUse.id,
            },
          ],
          toolUseResult: `Error: ${Je.denyMessage}`,
          toolDenialKind: "permission-rule",
          sourceToolAssistantUUID: assistantMessage.uuid,
          now,
        }),
      };
      return;
    }
    let nt = shouldRouteToolToHost(tool, input, toolUseContext, toolUse.id) ? new Stream() : undefined;
    let pt = routeToolCallWithAdoption(
      tool,
      input,
      toolUseContext,
      toolUse.id,
      nt === undefined
        ? undefined
        : (text, At) =>
            nt.enqueue({
              type: "notification",
              notification: {
                key: `remote-tool-status-${toolUse.id}`,
                text,
                priority: "medium",
                ...(At !== undefined && {
                  timeoutMs: At,
                }),
              },
            }),
    );
    if (nt !== undefined) {
      pt.then(
        () => nt.done(),
        () => nt.done(),
      );
      for await (let gt of nt) yield gt;
    }
    let Et = describeCoordinatorRefusal(tool, toolUseContext, await pt);
    if (Et.where === "refused") {
      yield {
        message: createUserMessage({
          content: [
            {
              type: "tool_result",
              content: `<tool_use_error>${Et.message}</tool_use_error>`,
              is_error: true,
              tool_use_id: toolUse.id,
            },
          ],
          toolUseResult: `Error: ${Et.message}`,
          sourceToolAssistantUUID: assistantMessage.uuid,
          now,
        }),
      };
      return;
    }
    if (Et.where === "elsewhere") {
      try {
        yield* Et.hosts.runToolUse({
          tool,
          toolUse,
          route: Et.route,
          assistantMessage,
          toolUseContext,
          canUseTool,
          now,
        });
      } finally {
        clearToolUsePermissionState(toolUseContext.session, toolUse.id);
      }
      return;
    }
    let yt = withPlanPath(tool.name, Et.input, toolUseContext.agentId);
    for await (let gt of streamedCheckPermissionsAndCallTool(
      tool,
      toolUse.id,
      yt,
      toolUseContext,
      canUseTool,
      assistantMessage,
      id,
      requestId,
      mcpServerType,
      mcpServerBaseUrl,
      mcpNameLoggable,
      now,
      stallSampler,
    ))
      yield gt;
  } catch (error) {
    let Je = error instanceof Error ? error.message : String(error);
    let nt = tool ? ` (${tool.name})` : "";
    if (!isAbortOrCancelError(error)) {
      let { code, isSad } = classifyToolErrorCode(error);
      logForDebugging(
        `runToolUse error${tool ? ` (${toolCategoryForTelemetry(tool)})` : ""}: code=${code} errorChars=${Je.length}`,
      );
      if (isSad) logFeatureSad(We, code);
      else {
        logError(error);
        logFeatureBad(We, "tool_unexpected_error");
      }
    }
    let pt = `Error calling tool${nt}: ${Je}`;
    yield {
      message: createUserMessage({
        content: [
          {
            type: "tool_result",
            content: `<tool_use_error>${pt}</tool_use_error>`,
            is_error: true,
            tool_use_id: toolUse.id,
          },
        ],
        toolUseResult: pt,
        toolDenialKind: getInterruptKind(error, toolUseContext.abortController.signal),
        interruptedByShutdown: shutdownInterruptStamp(toolUseContext.abortController.signal),
        sourceToolAssistantUUID: assistantMessage.uuid,
        now,
      }),
    };
  }
}
//@ chunk-e6aww6q8.js:3927718-3930188 fingerprint = streamedCheckPermissionsAndCallTool (0.414)
/**
 * streamedCheckPermissionsAndCallTool：把 checkPermissionsAndCallTool 包成异步流。进度消息即时转成 progress 消息（记 tengu_tool_use_progress），按需修复输入（coerceInput），运行 tool.call 模块级 hook（W$n），记录权限决策与沙箱违规，最后把结果逐条入流。
 */
function streamedCheckPermissionsAndCallTool(
  tool,
  toolUseID,
  input,
  toolUseContext,
  canUseTool,
  assistantMessage,
  messageId,
  requestId,
  mcpServerType,
  mcpServerBaseUrl,
  mcpNameLoggable,
  now,
  stallSampler,
) {
  let stream = new Stream();
  function onProgress(progress) {
    if (progress.type !== "progress") {
      stream.enqueue(progress);
      return;
    }
    if (progress.data.type !== "tool_heartbeat")
      logEvent("tengu_tool_use_progress", {
        messageID: sanitizeMarkName(messageId),
        toolName: sanitizeToolNameForAnalytics(tool.name),
        isMcp: tool.isMcp ?? false,
        queryChainId: sanitizeMarkName(toolUseContext.queryTracking?.chainId),
        queryDepth: toolUseContext.queryTracking?.depth,
        ...(mcpServerType && {
          mcpServerType: fromEnum(mcpServerType),
        }),
        ...(mcpServerBaseUrl && {
          mcpServerBaseUrl: safeOrigin(mcpServerBaseUrl),
        }),
        ...(requestId && {
          requestId: sanitizeMarkName(requestId),
        }),
        ...mcpToolAnalyticsFields(tool.name, mcpNameLoggable),
        ...claudeAiServerIdField(tool.mcpInfo),
        ...tool.mcpInfo?.pluginTelemetry,
      });
    stream.enqueue({
      message: createProgressMessage({
        toolUseID: progress.toolUseID,
        parentToolUseID: progress.parentToolUseID ?? toolUseID,
        data: progress.data,
        now,
      }),
    });
  }
  let coercion =
    tool.coerceInput !== undefined && !isUnparsedInputMarker(input)
      ? {
          repair: tool.coerceInput(input),
          sent: input,
        }
      : undefined;
  let input_2 = coercion?.repair?.input;
  let Ie = isPlainObject_5(input_2) ? input_2 : input;
  let Me = cloneIfServerResults(assistantMessage, Ie);
  let We = Me ?? undefined;
  let ze = clonedHookInput(toolUseContext, Ie);
  let lt = {
    input:
      isPlainObject_5(Ie) &&
      isAutoClassifierActive(
        getToolPermissionContext(toolUseContext).mode,
        getToolPermissionContext(toolUseContext).servedCall === true,
      ) &&
      getServerClassifierFallbackMode() !== "off" &&
      isClassifierTargetToolUse(assistantMessage, toolUseID, toolUseContext.clientRequestedToolUseId) &&
      consumeRepeatedToolCall({
        agentId: toolUseContext.agentId,
        tool: tool.name,
        input: Ie,
        message: assistantMessage,
        messages: toolUseContext.messages,
      })
        ? clone(Ie)
        : undefined,
    used: false,
  };
  let Je = false;
  let nt;
  let run = (It, Yt, callObserver) => {
    let decisionOut = {};
    let usedClassifierInput = lt.input !== undefined && !lt.used;
    lt.used = true;
    let pn = usedClassifierInput ? lt.input : It;
    let no = !usedClassifierInput && lacksServerResult(Me, It);
    let hn = toolCallChain.managedLeft();
    let ho = !no
      ? []
      : hn !== undefined && deepEqualIgnoringUndefined(It, hn)
        ? toolCallChain.managedRewrites()
        : [
            ...toolCallChain.managedRewrites(),
            {
              kind: "mod",
              source: "mod",
            },
          ];
    return checkPermissionsAndCallTool(
      tool,
      toolUseID,
      pn,
      rebaseOriginIfInputChanged(Yt, ze, pn),
      canUseTool,
      assistantMessage,
      messageId,
      requestId,
      mcpServerType,
      mcpServerBaseUrl,
      mcpNameLoggable,
      now,
      stallSampler,
      onProgress,
      {
        changed: no,
        kinds: ho.map((results) => results.kind),
        sources: ho.map((yn) => yn.source),
        written: Me,
      },
      We !== undefined && !deepEqualIgnoringUndefined(pn, We),
      decisionOut,
      callObserver,
      coercion,
      usedClassifierInput,
    )
      .then((yn) => {
        let { decided } = decisionOut;
        attachPermissionDecision(yn, toolUseID, decided?.record);
        nt = decided?.mode ?? nt;
        if (decided !== undefined && !Je)
          Je = logToolSafetyEvent({
            tool,
            toolUseId: toolUseID,
            record: decided.record,
            sandboxViolations: findToolResultMessages(yn, toolUseID).flatMap(
              (Xn) => Xn.sandboxViolations ?? [],
            ),
            permissionMode: decided.mode,
            agentContext: Yt.agentContext,
            toolCatalog: Yt.options.toolCatalog,
          });
        return yn;
      })
      .finally(() => clearToolUsePermissionState(Yt.session, toolUseID));
  };
  let Et = withAgentId(toolCallEvent(tool.name, toolUseID, Ie), toolUseContext.agentId);
  let yt = false;
  let toolCallChain = createToolCallChain(tool, toolUseContext, run, (It) =>
    shouldReplaceMemoryInput(tool, Ie, It)
      ? guardAccountMemoryHookRewrite(tool, "PreToolUse", "tool.call hook").message
      : undefined,
  );
  if (
    hasModuleHookingSite("tool.call", {
      ...Ie,
      tool: tool.name,
      tool_use_id: toolUseID,
    })
  )
    toolUseContext.markToolCallStarted?.(toolUseID);
  setOpenCall(toolUseID, toolUseContext.hookOrigin);
  let At = eventCallersFor2({
    signal: toolUseContext.abortController.signal,
    origin: toolUseContext.hookOrigin,
    core: {
      "tool.call": toolCallChain.core,
    },
    managed: {
      "tool.call": toolCallChain.managed,
    },
    withoutModuleHandlers: toolUseContext.options.settingsHooksOff ? true : undefined,
  });
  runInHeldDirectory(toolUseContext.session.project?.cwd, () =>
    releaseToolServerHold(tool).then(() => At.tool.call(Et)),
  )
    .then((It) =>
      applyToolCallHookResult(It, toolCallChain, {
        tool,
        input: Et,
        toolUseContext,
        assistantMessage,
        now,
      }),
    )
    .then(
      (It) => {
        logHookPushbacks({
          updates: It,
          tool,
          toolUseId: toolUseID,
          getPermissionMode: () => nt ?? getToolPermissionContext(toolUseContext).mode,
          agentContext: toolUseContext.agentContext,
          toolCatalog: toolUseContext.options.toolCatalog,
        });
        for (let result of It) stream.enqueue(result);
        stream.done();
      },
      (error) => {
        forgetOpenCall(toolUseID);
        stream.error(error);
      },
    );
  return stream;
}
//@ chunk-e6aww6q8.js:3930188-3930223 layout
/**
 * 工具搜索乐观开启（isToolSearchEnabledOptimistic）且当前工具列表里有 ToolSearch。
 */
function isToolSearchInPool(e) {
  return isToolSearchEnabledOptimistic() && isToolSearchToolAvailable(e);
}
//@ chunk-e6aww6q8.js:3930223-3930305 layout
/**
 * 判断调用的工具是否是"schema 没发给 API 的延迟工具"：工具搜索在池中、该工具在本对话应延迟、且历史中未被发现（extractDiscoveredToolNames 不含它）。buildSchemaNotSentHint 与未加载判定都依赖它。
 */
function isDeferredSchemaNotSent(e, n, r, s, surfaced) {
  return (
    isToolSearchInPool(r) &&
    isDeferredToolInConversation(e, s, r) &&
    !extractDiscoveredToolNames(n, {
      surfaced,
    }).has(e.name)
  );
}
//@ chunk-e6aww6q8.js:3930305-3930472 layout = countToolCallsSince (1)
function countToolCallsSince_9(name, n, r) {
  return n.some(
    (s) =>
      s.type === "assistant" &&
      Array.isArray(s.message.content) &&
      s.message.content.some((block) => block.type === "tool_use" && block.name === name && block.id !== r),
  );
}
//@ chunk-e6aww6q8.js:3930472-3930574 layout
/**
 * 未加载工具检查自身出错时的兜底：记 tengu_tool_use_not_loaded_check_failed{part} 并 logError，两步都吞掉异常，不影响工具调用。
 */
function logNotLoadedCheckFailure(e, error) {
  try {
    logEvent("tengu_tool_use_not_loaded_check_failed", {
      part: fromEnum(e),
    });
  } catch {}
  try {
    logError(error);
  } catch {}
}
//@ chunk-e6aww6q8.js:3930574-3930902 layout
/**
 * 为"调用未加载的延迟工具"收集附加信息：late（工具本不该延迟）、loadInSameReply（同一回答里已调用 ToolSearch）、firstForTool（本对话首次调用该工具）、relayActive（中继缓存活跃）。
 */
function getNotLoadedCallNotes(e, n, r) {
  try {
    let sameTurnToolUses = n.sameTurnToolUses ?? [];
    return {
      late: !isDeferredToolInConversation(e, undefined, n.options.tools),
      loadInSameReply: countToolCallsSince_9(TOOL_SEARCH_TOOL_NAME, sameTurnToolUses),
      firstForTool:
        !countToolCallsSince_9(e.name, n.messages, r) && !countToolCallsSince_9(e.name, sameTurnToolUses),
      relayActive: webIsolationModule?.getTeleportCacheState().status === "active",
    };
  } catch (error) {
    logNotLoadedCheckFailure("notes", error);
    return {
      late: false,
      loadInSameReply: false,
      firstForTool: false,
      relayActive: false,
    };
  }
}
//@ chunk-e6aww6q8.js:3930902-3930967 layout
function isHookCallerVirtualTool(assistantMessage, toolUseContext) {
  return assistantMessage.isVirtual === true && toolUseContext.hookCaller !== undefined;
}
//@ chunk-e6aww6q8.js:3930967-3931383 layout
/**
 * 延迟工具未加载就被调用时的判定：工具属于受管家族、工具搜索处于 tst 或已声明、且 schema 未发送时，返回 {enforced, flagSource, coworkSurface, family, message, …notes}，否则 null。出错时记失败事件返回 null。
 */
function getNotLoadedToolVerdict(e, toolUseContext, id) {
  try {
    let deviceToolKind = getDeviceToolKind(e);
    if (deviceToolKind === undefined) return null;
    let tools = toolUseContext.options.tools;
    let y = cachedDeclaredTools(toolUseContext);
    if (
      cachedNoChannelTools(toolUseContext) !== undefined ||
      isToolSearchPrecluded(toolUseContext.options.mainLoopModel, tools) ||
      !(getToolSearchMode() === "tst" || y?.has(TOOL_SEARCH_TOOL_NAME) === true) ||
      !isDeferredSchemaNotSent(
        e,
        toolUseContext.messages,
        tools,
        y,
        getSurfacedToolNames(toolUseContext.stickyBetas ?? getStickyBetas()),
      )
    )
      return null;
    let S = notLoadedToolPolicy();
    return {
      enforced: S.inForce,
      flagSource: S.flagSource,
      coworkSurface: S.coworkSurface,
      family: deviceToolKind,
      message: buildNotLoadedToolError(e.name),
      ...getNotLoadedCallNotes(e, toolUseContext, id),
    };
  } catch (error) {
    logNotLoadedCheckFailure("verdict", error);
    return null;
  }
}
//@ chunk-e6aww6q8.js:3931383-3931895 fingerprint = buildSchemaNotSentHint (0.723)
/**
 * 调用了 schema 未发送的延迟工具时生成提示：说明 schema 不在已发现集合里、类型化参数会被当成字符串，要求先 ToolSearch select:<name> 再重试，并附上该工具的 JSON schema。
 */
function buildSchemaNotSentHint(tool, input, toolUseContext, coercion, options) {
  if (!isDeferredSchemaNotSent(tool, input, toolUseContext, coercion, options)) return null;
  let y = "";
  try {
    y = ` For reference, this tool's input schema is: ${jsonStringify(toolInputJsonSchema(tool.inputSchema))}`;
  } catch {}
  return (
    `

This tool's schema was not sent to the API \u2014 it was not in the discovered-tool set derived from message history. ` +
    `Without the schema in your prompt, typed parameters (arrays, numbers, booleans) get emitted as strings and the client-side parser rejects them. Load the tool first: call ${TOOL_SEARCH_TOOL_NAME} with query "select:${tool.name}", then retry this call.${y}`
  );
}
//@ chunk-e6aww6q8.js:3931895-3932586 fingerprint = runToolUse (0.478)
/**
 * 生成"已取消"的工具结果：记 tengu_tool_use_cancelled（阶段 validate_input/permission/... 与中断原因），返回 toolDenialKind=cancelled 的 tool_result。
 */
function buildCancelledToolResult(e) {
  let {
    phase,
    cancelText = CANCEL_MESSAGE,
    tool,
    toolUseID,
    toolUseContext,
    assistantMessage,
    mcpServerType,
    mcpServerBaseUrl,
    mcpNameLoggable,
    requestId,
    now,
  } = e;
  logEvent("tengu_tool_use_cancelled", {
    toolName: sanitizeToolNameForAnalytics(tool.name),
    toolUseID: sanitizeMarkName(toolUseID),
    isMcp: tool.isMcp ?? false,
    phase: fromEnum(phase),
    abortKind: fromEnum(classifyAbortReasonForTelemetry(toolUseContext.abortController.signal.reason)),
    queryChainId: sanitizeMarkName(toolUseContext.queryTracking?.chainId),
    queryDepth: toolUseContext.queryTracking?.depth,
    ...(mcpServerType && {
      mcpServerType: fromEnum(mcpServerType),
    }),
    ...(mcpServerBaseUrl && {
      mcpServerBaseUrl: safeOrigin(mcpServerBaseUrl),
    }),
    ...(requestId && {
      requestId: sanitizeMarkName(requestId),
    }),
    ...mcpToolAnalyticsFields(tool.name, mcpNameLoggable),
    ...claudeAiServerIdField(tool.mcpInfo),
    ...tool.mcpInfo?.pluginTelemetry,
  });
  let sanitizedToolName = createCancelledToolResultBlock(toolUseID);
  sanitizedToolName.content = withMemoryCorrectionHint(cancelText);
  return [
    {
      message: createUserMessage({
        content: [sanitizedToolName],
        toolUseResult: cancelText,
        toolDenialKind: "cancelled",
        sourceToolAssistantUUID: assistantMessage.uuid,
        now,
      }),
    },
  ];
}
//@ chunk-e6aww6q8.js:3932586-3932738 layout = isUnrecognizedKeysIssue (0.804)
function isUnrecognizedKeysIssue_2(inputSchema, updatedInput) {
  let r = inputSchema.safeParse(updatedInput);
  if (r.success) return null;
  let filtered = r.error.issues.filter((issue) => issue.code !== "unrecognized_keys");
  return filtered.length > 0 ? filtered : null;
}
//@ chunk-e6aww6q8.js:3932738-3932917 layout
/**
 * 向结果列表推入 hook_stopped_continuation 附件（hookName=PreToolUse:<工具名>），表示 PreToolUse hook 阻止了继续。
 */
function pushHookStoppedContinuation(e, { toolName, toolUseID, message }) {
  e.push({
    message: createAttachmentMessage_2({
      type: "hook_stopped_continuation",
      message,
      hookName: `PreToolUse:${toolName}`,
      toolUseID,
      hookEvent: "PreToolUse",
    }),
  });
}
//@ chunk-e6aww6q8.js:3932917-3933145 layout
/**
 * 判断工具调用是否需要"外部结果读取器"：有非内置插件模块已加载→plugin_loaded，插件加载中→plugins_loading，有会话外的 PostToolUse hook→post_tool_use_hook，否则 undefined。
 */
function getOutsideResultReaderBlocker(e) {
  if (getPluginRegistry().loadedModules.some((loadedModule) => !hasLink(loadedModule)))
    return "plugin_loaded";
  if (arePermissionHooksUnsettled()) return "plugins_loading";
  return hasOnlyOwnCallbacksToRun(
    "PostToolUse",
    e.sessionHooksRegistry,
    registerAgent(e, "PostToolUse", e.session.id),
    e,
    isRemoteManagedEnvironment(),
  )
    ? undefined
    : "post_tool_use_hook";
}
//@ chunk-e6aww6q8.js:3933145-3968539 fingerprint = checkPermissionsAndCallTool (0.393)
/**
 * checkPermissionsAndCallTool：一次工具调用的完整生命周期。1) JSON 解析失败/schema 校验失败 → InputValidationError（可附"选项本会话不可用"或"schema 未发送"提示）；2) validateInput（带拒绝规则时记录）；3) PreToolUse hooks（可改输入、给权限结论、阻止继续、追加上下文）；4) 权限决策（hook 结论 → 规则/模式/分类器 → canUseTool 询问），拒绝时返回错误；5) 调用 tool.call（进度、中断监听、工作目录变化检查、协调者 Bash 限制）；6) mapToolResultToToolResultBlockParam、结果持久化与大小预算；7) PostToolUse / PostToolUseFailure hooks；8) OTel 与 tengu_tool_use_* 统计。
 */
async function checkPermissionsAndCallTool(
  tool,
  toolUseID,
  input,
  toolUseContext,
  canUseTool,
  assistantMessage,
  messageId,
  requestId,
  mcpServerType,
  mcpServerBaseUrl,
  mcpNameLoggable,
  now,
  stallSampler,
  onProgress,
  hookRewrite,
  inputRewrittenBeforeCall,
  decisionOut,
  callObserver,
  coercion,
  usedClassifierInput = false,
) {
  let errorContent = toolFeatureName(tool.name, tool.mcpInfo);
  let lt = builtinToolServedByMcp(tool) ?? tool.name;
  let Je =
    coercion?.repair && deepEqualIgnoringUndefined(input, coercion.repair.input) ? coercion.sent : input;
  let nt = jsonStringify(Je).length;
  let classifierEpoch = getClassifierEpoch();
  let schemaHint = parseToolInput(tool, input, coercion);
  if (!schemaHint.ok && schemaHint.cause === "json") {
    let { raw, len } = schemaHint;
    let Li = truncateToLength(raw, 200);
    let Qs = `${tool.name} was called with input that could not be parsed as JSON.
You sent (first ${Li.length} of ${len} bytes): ${Li}
Common causes: unescaped backslashes in file paths (use / or \\\\), unescaped control characters, or truncated output. Retry with valid JSON.`;
    logFeatureSad(errorContent, "tool_input_validation_failed");
    logEvent("tengu_tool_use_error", {
      error: lit_2("InputValidationError"),
      errorCode: lit_2("JSON_PARSE"),
      errorDetailsHash: shortHash(`${tool.name}: unparsed tool input`),
      messageID: sanitizeMarkName(messageId),
      toolName: sanitizeToolNameForAnalytics(tool.name),
      isMcp: tool.isMcp ?? false,
      ...getSubagentTelemetryFields(toolUseContext.agentContext),
      ...getEffortTelemetryFields(toolUseContext),
      toolInputSizeBytes: len,
      queryChainId: sanitizeMarkName(toolUseContext.queryTracking?.chainId),
      queryDepth: toolUseContext.queryTracking?.depth,
      ...(toolUseContext.options.messageClientPlatform && {
        messageClientPlatform: entrypointForTelemetry(toolUseContext.options.messageClientPlatform),
      }),
      ...(mcpServerType && {
        mcpServerType: fromEnum(mcpServerType),
      }),
      ...(mcpServerBaseUrl && {
        mcpServerBaseUrl: safeOrigin(mcpServerBaseUrl),
      }),
      ...(requestId && {
        requestId: sanitizeMarkName(requestId),
      }),
      ...mcpToolAnalyticsFields(tool.name, mcpNameLoggable),
      ...claudeAiServerIdField(tool.mcpInfo),
      ...tool.mcpInfo?.pluginTelemetry,
    });
    return [
      {
        message: createUserMessage({
          content: [
            {
              type: "tool_result",
              content: `<tool_use_error>InputValidationError: ${Qs}</tool_use_error>`,
              is_error: true,
              tool_use_id: toolUseID,
            },
          ],
          toolUseResult: `InputValidationError: JSON parse failed (${len} bytes)`,
          sourceToolAssistantUUID: assistantMessage.uuid,
          now,
        }),
      },
    ];
  }
  if (schemaHint.coerced !== undefined)
    logEvent("tengu_tool_input_coerced", {
      toolName: sanitizeToolNameForAnalytics(tool.name),
      shapeClass: sanitizeShapeClass(schemaHint.coerced.shapeClass),
      outcome: lit_2(schemaHint.coerced.valid ? "coerced_valid" : "coerced_still_invalid"),
      toolInputSizeBytes: nt,
    });
  if (!schemaHint.ok) {
    let yr = formatZodValidationError(tool.name, schemaHint.error);
    let Kr = false;
    if (emptyInputRepairConfig() && isEmptyObject(Je)) {
      let ta = placeholderToolInput(tool.name, tool.inputSchema);
      if (ta !== null) {
        yr = ta;
        Kr = true;
      }
    }
    let Li = tool.validationErrorSteer?.(Je, schemaHint.error);
    if (Li)
      yr = `${Li}

${yr}`;
    let Qs = isArtifactFamilyTool(tool)
      ? buildUnavailableOptionNote(
          tool.name,
          Je,
          schemaHint.schemaInput,
          schemaHint.error,
          toolUseContext.messages,
        )
      : null;
    if (Qs) {
      logEvent("tengu_recorded_tool_option_unavailable", {
        toolName: sanitizeToolNameForAnalytics(tool.name),
        isArtifactFamily: true,
        kind: fromEnum(Qs.kind),
        source: fromEnum(Qs.source),
      });
      yr += `

${Qs.text}`;
    }
    let schemaNotSentHint = buildSchemaNotSentHint(
      tool,
      toolUseContext.messages,
      toolUseContext.options.tools,
      cachedDeclaredTools(toolUseContext),
      getSurfacedToolNames(toolUseContext.stickyBetas ?? getStickyBetas()),
    );
    if (schemaNotSentHint) {
      logEvent("tengu_deferred_tool_schema_not_sent", {
        toolName: sanitizeToolNameForAnalytics(tool.name),
        isMcp: tool.isMcp ?? false,
      });
      yr += schemaNotSentHint;
    }
    let joined = uniq(schemaHint.error.issues.map((issue) => issue.code)).join(",");
    logForDebugging(
      `${toolCategoryForTelemetry(tool)} tool input error: issues=${joined} inputBytes=${nt} errorChars=${yr.length}`,
    );
    logFeatureSad(errorContent, "tool_input_validation_failed");
    logEvent("tengu_tool_use_error", {
      error: lit_2("InputValidationError"),
      errorCode: lit_2("ZOD_VALIDATION"),
      zodIssueCodes: fromEnumArr(uniq(schemaHint.error.issues.map((issue) => issue.code))),
      errorDetailsHash: shortHash(yr),
      messageID: sanitizeMarkName(messageId),
      toolName: sanitizeToolNameForAnalytics(tool.name),
      isMcp: tool.isMcp ?? false,
      ...getSubagentTelemetryFields(toolUseContext.agentContext),
      ...getEffortTelemetryFields(toolUseContext),
      toolInputSizeBytes: nt,
      ...(Kr && {
        emptyInputRepaired: true,
      }),
      queryChainId: sanitizeMarkName(toolUseContext.queryTracking?.chainId),
      queryDepth: toolUseContext.queryTracking?.depth,
      ...(toolUseContext.options.messageClientPlatform && {
        messageClientPlatform: entrypointForTelemetry(toolUseContext.options.messageClientPlatform),
      }),
      ...(mcpServerType && {
        mcpServerType: fromEnum(mcpServerType),
      }),
      ...(mcpServerBaseUrl && {
        mcpServerBaseUrl: safeOrigin(mcpServerBaseUrl),
      }),
      ...(requestId && {
        requestId: sanitizeMarkName(requestId),
      }),
      ...mcpToolAnalyticsFields(tool.name, mcpNameLoggable),
      ...claudeAiServerIdField(tool.mcpInfo),
      ...tool.mcpInfo?.pluginTelemetry,
    });
    return [
      {
        message: createUserMessage({
          content: [
            {
              type: "tool_result",
              content: `<tool_use_error>InputValidationError: ${yr}</tool_use_error>`,
              is_error: true,
              tool_use_id: toolUseID,
            },
          ],
          toolUseResult: `InputValidationError: ${schemaHint.error.message}`,
          toolResultRemedy: tool.validationErrorRemedy?.(Je),
          sourceToolAssistantUUID: assistantMessage.uuid,
          now,
        }),
      },
    ];
  }
  if (tool.isMcp) {
    let yr = describeMissingRequiredArgs(schemaHint.input, tool.inputJSONSchema);
    if (yr !== null)
      logEvent("tengu_mcp_input_missing_required", {
        toolName: sanitizeToolNameForAnalytics(tool.name),
        isMcp: true,
        toolUseID: sanitizeMarkName(toolUseID),
        messageID: sanitizeMarkName(messageId),
        toolInputSizeBytes: nt,
        requiredCount: yr.requiredCount,
        missingCount: yr.missingCount,
        presentKeyCount: yr.presentKeyCount,
        maxStringValueLen: yr.maxStringValueLen,
        hasPseudoTagDebris: yr.hasPseudoTagDebris,
        ...getSubagentTelemetryFields(toolUseContext.agentContext),
        queryChainId: sanitizeMarkName(toolUseContext.queryTracking?.chainId),
        queryDepth: toolUseContext.queryTracking?.depth,
        ...(mcpServerType && {
          mcpServerType: fromEnum(mcpServerType),
        }),
        ...(mcpServerBaseUrl && {
          mcpServerBaseUrl: safeOrigin(mcpServerBaseUrl),
        }),
        ...(requestId && {
          requestId: sanitizeMarkName(requestId),
        }),
        ...mcpToolAnalyticsFields(tool.name, mcpNameLoggable),
        ...claudeAiServerIdField(tool.mcpInfo),
        ...tool.mcpInfo?.pluginTelemetry,
      });
  }
  let resultNote = schemaHint.coerced?.resultNote;
  let validateInput = (yr) =>
    tool.validateInput?.(yr, {
      ...toolUseContext,
      toolUseId: toolUseID,
    });
  let It = (await warmRemoteMemoryPath(
    tool,
    schemaHint.input,
    toolUseContext.abortController.signal,
    backgroundAgentIdOf(toolUseContext),
  ))
    ? undefined
    : await runValidateInput(tool, schemaHint.input, validateInput);
  if (It === undefined || isServerFallbackDiscard(toolUseContext.abortController.signal))
    return buildCancelledToolResult({
      phase: "validate_input",
      cancelText: isServerFallbackDiscard(toolUseContext.abortController.signal)
        ? undefined
        : getCancelMessage(toolUseContext.abortController.signal),
      tool,
      toolUseID,
      toolUseContext,
      assistantMessage,
      mcpServerType,
      mcpServerBaseUrl,
      mcpNameLoggable,
      requestId,
      now,
    });
  let Yt = (verdict) => {
    logForDebugging(
      `${toolCategoryForTelemetry(tool)} tool validation error: code=${verdict.errorCode} messageChars=${verdict.message?.length ?? 0}`,
    );
    logFeatureSad(errorContent, "tool_validate_input_rejected");
    if (verdict.notAnError)
      return [
        {
          message: createUserMessage({
            content: [
              {
                type: "tool_result",
                content: verdict.message,
                tool_use_id: toolUseID,
              },
            ],
            toolUseResult: verdict.message,
            toolResultRemedy: verdict.remedy,
            sourceToolAssistantUUID: assistantMessage.uuid,
            now,
          }),
        },
      ];
    logEvent("tengu_tool_use_error", {
      messageID: sanitizeMarkName(messageId),
      toolUseID: sanitizeMarkName(toolUseID),
      toolName: sanitizeToolNameForAnalytics(tool.name),
      error: lit_2("ValidateInputError"),
      ...errorTelemetryFields(verdict.message),
      errorCode: verdict.errorCode,
      isMcp: tool.isMcp ?? false,
      ...getSubagentTelemetryFields(toolUseContext.agentContext),
      ...getEffortTelemetryFields(toolUseContext),
      queryChainId: sanitizeMarkName(toolUseContext.queryTracking?.chainId),
      queryDepth: toolUseContext.queryTracking?.depth,
      ...(toolUseContext.options.messageClientPlatform && {
        messageClientPlatform: entrypointForTelemetry(toolUseContext.options.messageClientPlatform),
      }),
      ...(mcpServerType && {
        mcpServerType: fromEnum(mcpServerType),
      }),
      ...(mcpServerBaseUrl && {
        mcpServerBaseUrl: safeOrigin(mcpServerBaseUrl),
      }),
      ...(requestId && {
        requestId: sanitizeMarkName(requestId),
      }),
      ...mcpToolAnalyticsFields(tool.name, mcpNameLoggable),
      ...claudeAiServerIdField(tool.mcpInfo),
      ...tool.mcpInfo?.pluginTelemetry,
    });
    return [
      {
        message: createUserMessage({
          content: [
            {
              type: "tool_result",
              content: `<tool_use_error>${verdict.message}</tool_use_error>`,
              is_error: true,
              tool_use_id: toolUseID,
            },
          ],
          toolUseResult: `Error: ${verdict.message}`,
          toolResultRemedy: verdict.remedy,
          sourceToolAssistantUUID: assistantMessage.uuid,
          now,
        }),
      },
    ];
  };
  if (!It.ok) {
    let yr = Yt(It.verdict);
    if (It.deniedInput !== undefined) toolUseContext.onPermissionDenial?.(tool, toolUseID, It.deniedInput);
    if (It.verdict.denyRule !== undefined)
      decisionOut.decided = {
        record: buildDenyRuleDecisionRecord(It.verdict.message, It.verdict.denyRule),
        mode: getToolPermissionContext(toolUseContext).mode,
      };
    return yr;
  }
  let qt = [];
  let { observableInput, callInput } = It;
  let pn = cloneIfServerResults(assistantMessage, It.observableInput);
  let no = pn ?? undefined;
  let hn = usedClassifierInput ? clone(It.observableInput) : undefined;
  let ho = usedClassifierInput && It.backfilled ? clone(It.callInput) : undefined;
  let yn = It;
  let Kn = clonedHookInput(toolUseContext, It.observableInput);
  let toolUseContext_2 = {
    ...toolUseContext,
    mcpRequestMeta: stripHostToolMeta(toolUseContext.mcpRequestMeta),
    permissionModeAtRequest: getPermissionModeAtRequestForArbiter(
      assistantMessage,
      toolUseID,
      toolUseContext,
    ),
  };
  let fo = false;
  let To;
  let hookPermissionResult;
  let vn = [];
  let co = [];
  let So = [];
  let preToolHookStart = Date.now();
  for await (let result of runPreToolUseHooks(
    toolUseContext_2,
    tool,
    observableInput,
    toolUseID,
    assistantMessage.message.id,
    requestId,
    mcpServerType,
    mcpServerBaseUrl,
    validateInput,
  ))
    switch (result.type) {
      case "message":
        if (result.message.message.type === "progress") onProgress(result.message.message);
        else {
          qt.push(result.message);
          let att = result.message.message.attachment;
          if (
            att &&
            "command" in att &&
            att.command !== undefined &&
            "durationMs" in att &&
            att.durationMs !== undefined
          )
            So.push({
              command: att.command,
              durationMs: att.durationMs,
            });
        }
        break;
      case "hookPermissionResult":
        hookPermissionResult = result.hookPermissionResult;
        break;
      case "hookUpdatedInput":
        observableInput = result.updatedInput;
        break;
      case "hookRewriterKind":
        vn.push(result.kind);
        co.push(result.source);
        break;
      case "preventContinuation":
        fo = result.shouldPreventContinuation;
        break;
      case "stopReason":
        To = result.stopReason;
        break;
      case "additionalContext":
        if (!isDelegatedObservationContext(toolUseContext.agentContext)) qt.push(result.message);
        break;
      case "defer": {
        if (toolUseContext.remoteCall !== undefined) {
          let cloudDeferUnsupportedMessage = getCloudDeferUnsupportedMessage(result.hookName);
          logForDebugging(
            `PreToolUse hook for ${toolCategoryForTelemetry(tool)} returned permissionDecision=defer for a served call; refusing (no resume machinery)`,
            {
              level: "warn",
            },
          );
          hookPermissionResult = {
            behavior: "deny",
            message: cloudDeferUnsupportedMessage,
            decisionReason: {
              type: "hook",
              hookName: `PreToolUse:${tool.name}`,
              reason: cloudDeferUnsupportedMessage,
            },
          };
          break;
        }
        getStatsStore()?.observe("pre_tool_hook_duration_ms", Date.now() - preToolHookStart);
        if (!toolUseContext.options.isNonInteractiveSession) {
          logForDebugging(
            `PreToolUse hook for ${toolCategoryForTelemetry(tool)} returned permissionDecision=defer in interactive mode; ignoring (defer is print-mode only)`,
            {
              level: "warn",
            },
          );
          break;
        }
        let Kr = Array.isArray(assistantMessage.message.content)
          ? count(assistantMessage.message.content, (Qs) => Qs.type === "tool_use")
          : 1;
        if (Kr > 1) {
          logForDebugging(
            `PreToolUse hook for ${toolCategoryForTelemetry(tool)} returned permissionDecision=defer but ${Kr} tool calls are in this batch; ignoring (defer is solo-only \u2014 siblings would be orphaned on resume)`,
            {
              level: "warn",
            },
          );
          break;
        }
        if (toolUseContext.abortController.signal.aborted) {
          let cancelMessage = getCancelMessage(toolUseContext.abortController.signal);
          qt.push({
            message: createUserMessage({
              content: [
                {
                  ...createCancelledToolResultBlock(toolUseID),
                  content: cancelMessage,
                },
              ],
              toolUseResult: cancelMessage,
              toolDenialKind: "cancelled",
              sourceToolAssistantUUID: assistantMessage.uuid,
              now,
            }),
          });
          return qt;
        }
        logEvent("tengu_pre_tool_hook_deferred", {
          toolName: sanitizeToolNameForAnalytics(tool.name),
          queryChainId: sanitizeMarkName(toolUseContext.queryTracking?.chainId),
          queryDepth: toolUseContext.queryTracking?.depth,
        });
        let activeSpanId = getActiveSpanId();
        qt.push({
          message: createAttachmentMessage_2({
            type: "hook_deferred_tool",
            toolUseID,
            toolName: tool.name,
            toolInput: observableInput,
            hookName: result.hookName,
            hookEvent: "PreToolUse",
            permissionMode: getToolPermissionContext(toolUseContext_2).mode,
            ...(activeSpanId && {
              traceparent: activeSpanId,
            }),
          }),
        });
        return qt;
      }
      case "stop": {
        getStatsStore()?.observe("pre_tool_hook_duration_ms", Date.now() - preToolHookStart);
        let cancelMessage = getCancelMessage(toolUseContext.abortController.signal);
        let cancelledToolResultBlock = createCancelledToolResultBlock(toolUseID);
        cancelledToolResultBlock.content = result.stopReason ?? cancelMessage;
        let stopReason = result.stopReason ?? To;
        qt.push({
          message: createUserMessage({
            content: [cancelledToolResultBlock],
            toolUseResult: stopReason ? `Error: ${stopReason}` : cancelMessage,
            toolDenialKind: result.stopReason ? undefined : "cancelled",
            sourceToolAssistantUUID: assistantMessage.uuid,
            now,
          }),
        });
        if (fo && result.stopReason && !toolUseContext.abortController.signal.aborted)
          pushHookStoppedContinuation(qt, {
            toolName: tool.name,
            toolUseID,
            message: stopReason || "Execution stopped by hook",
          });
        return qt;
      }
    }
  let un = Date.now() - preToolHookStart;
  getStatsStore()?.observe("pre_tool_hook_duration_ms", un);
  if (usedClassifierInput && hn !== undefined) {
    let updatedInput =
      hookPermissionResult !== undefined && "updatedInput" in hookPermissionResult
        ? hookPermissionResult.updatedInput
        : undefined;
    let Kr =
      !deepEqualIgnoringUndefined(observableInput, hn) ||
      (updatedInput !== undefined && !deepEqualIgnoringUndefined(updatedInput, hn));
    if (!deepEqualIgnoringUndefined(observableInput, hn)) {
      observableInput = hn;
      yn = {
        ...It,
        observableInput: hn,
        callInput: ho ?? hn,
      };
    }
    if (hookPermissionResult?.behavior === "allow" && Kr) hookPermissionResult = undefined;
    else if (
      hookPermissionResult !== undefined &&
      "updatedInput" in hookPermissionResult &&
      hookPermissionResult.updatedInput !== undefined
    )
      hookPermissionResult = {
        ...hookPermissionResult,
        updatedInput: undefined,
      };
    logEvent("tengu_auto_mode_reissue_exempt", {
      toolName: sanitizeToolNameForAnalytics(tool.name),
      isMcp: tool.isMcp ?? false,
      toolUseId: sanitizeMarkName(toolUseID),
      rewriteDropped: Kr,
    });
  }
  if (un >= ISOLATION_TIMEOUT_MS)
    logForDebugging(
      `Slow PreToolUse hooks: ${un}ms for ${toolCategoryForTelemetry(tool)} (${So.length} hooks)`,
      {
        level: "info",
      },
    );
  let ao = {};
  if (observableInput && typeof observableInput === "object" && !isTracingRedacted()) {
    if (tool.name === FILE_READ_TOOL_NAME && "file_path" in observableInput && isToolDetailsLoggingEnabled())
      ao.file_path = String(observableInput.file_path);
    else if (
      (tool.name === FILE_EDIT_TOOL_NAME || tool.name === FILE_WRITE_TOOL_NAME) &&
      "file_path" in observableInput &&
      isToolDetailsLoggingEnabled()
    )
      ao.file_path = String(observableInput.file_path);
    else if (tool.name === BASH_TOOL_NAME && "command" in observableInput && isToolDetailsLoggingEnabled()) {
      let yr = observableInput;
      ao.full_command = yr.command;
    } else if (isToolDetailsLoggingEnabled()) {
      let skillName = extractSkillName(tool.name, observableInput);
      if (skillName) ao.skill_name = skillName;
      let subagentType = extractSubagentType(tool.name, observableInput);
      if (subagentType) ao.subagent_type = subagentType;
    }
  }
  let $o =
    observableInput &&
    typeof observableInput === "object" &&
    lt === BASH_TOOL_NAME &&
    "command" in observableInput &&
    typeof observableInput.command === "string"
      ? classifyBashCommand(observableInput.command)
      : undefined;
  if ($o && isSessionTracingEnabled()) {
    ao.bash_command_class = $o.bash_command_class;
    ao.bash_argv0 = $o.bash_argv0;
  }
  let yo = isLiveMemoryTool(tool);
  let Ho = yo || tool.mcpInfo?.accountMemory === true;
  if (tool.mcpInfo?.accountMemory === true) markRecordGenuine();
  let rr = withholdsFileReferenceErrors(tool, toolUseID);
  let toolSpan = startToolSpan(
    tool.name,
    toolUseContext.agentContext,
    ao,
    isPerfettoTracingEnabled() || (isBetaTracingEnabled() && isToolDetailsLoggingEnabled())
      ? jsonStringify(observableInput)
      : undefined,
    toolUseID,
    Ho,
  );
  startToolBlockedOnUserSpan(toolUseContext.agentContext);
  rebaseBatchHookOrigins(
    [toolUseContext, toolUseContext_2],
    Kn,
    getHookUpdatedInput(hookPermissionResult, observableInput),
  );
  let permissionMode = getToolPermissionContext(toolUseContext_2).mode;
  let permissionStart = Date.now();
  let hookUpdatedInput = getHookUpdatedInput(hookPermissionResult, observableInput);
  let _r = describeInputRewrite(
    hookRewrite,
    {
      changed: lacksServerResult(pn, hookUpdatedInput),
      kinds: vn,
      sources: co,
    },
    () => isShellToolClassified(tool.name),
    () => isShellOrFileToolForClassifier(tool),
  );
  let permissionRound = startPermissionRound(toolUseContext, toolUseID, tool.name);
  let checkRunner = getCheckRunner(toolUseContext.session, tool.name);
  let Oo = getRegisteredCheck(toolUseContext.session, tool.name) && checkRunner;
  let jr = Oo ? undefined : checkRunner;
  toolUseContext.toolDecisions ??= new Map();
  let Or =
    inputRewrittenBeforeCall || (no !== undefined && !deepEqualIgnoringUndefined(hookUpdatedInput, no));
  let Io = await resolvePermissionDecisionForCall(
    hookPermissionResult,
    tool,
    observableInput,
    {
      ...toolUseContext_2,
      permissionPhase: undefined,
      permissionRound,
      inputChangedByHook: Or ? true : undefined,
    },
    canUseTool,
    await applyServerClassifierVerdict(
      assistantMessage,
      toolUseID,
      hookUpdatedInput,
      _r,
      toolUseContext.sameTurnToolUses,
    ),
    toolUseID,
  ).catch((error) => {
    takePermissionRecord(toolUseContext, toolUseID, permissionRound);
    throw error;
  });
  let permissionDecision = Io.decision;
  observableInput = Io.input;
  let rs = takePermissionRecord(toolUseContext, toolUseID, permissionRound) ?? {};
  if (
    permissionDecision.behavior !== "allow" &&
    isServerFallbackDiscard(toolUseContext.abortController.signal)
  ) {
    setDecided(
      decisionOut,
      permissionMode,
      buildPermissionDecisionRecord("cancelled", "server_fallback_tombstone"),
    );
    endToolSpan(toolSpan);
    return buildCancelledToolResult({
      phase: "permission",
      tool,
      toolUseID,
      toolUseContext,
      assistantMessage,
      mcpServerType,
      mcpServerBaseUrl,
      mcpNameLoggable,
      requestId,
      now,
    });
  }
  let Es = toolUseContext.toolDecisions.get(toolUseID);
  if (
    permissionDecision.behavior === "ask" &&
    unwrapAbortReason(toolUseContext.abortController.signal.reason) === "interrupt" &&
    (Es === undefined || Es.source === "user_abort")
  ) {
    setDecided(decisionOut, permissionMode, buildPermissionDecisionRecord("cancelled", "user_abort"));
    endToolSpan(toolSpan);
    qt.push({
      message: createCancelledToolResult(
        toolUseID,
        assistantMessage,
        toolUseContext.abortController.signal,
        now,
      ),
    });
    return qt;
  }
  if (permissionDecision.behavior !== "allow") {
    if (isTerminalShutdown() && !toolUseContext.abortController.signal.aborted) await heldUntilExit();
    if (isInvalidInputDeny(permissionDecision)) {
      setDecided(decisionOut, permissionMode, buildPermissionDecisionRecord("reject", "invalid_input"));
      endToolSpan(toolSpan);
      qt.push(
        ...Yt({
          result: false,
          message: permissionDecision.message,
          errorCode: 1,
        }),
      );
      if (fo && !toolUseContext.abortController.signal.aborted)
        pushHookStoppedContinuation(qt, {
          toolName: tool.name,
          toolUseID,
          message: To || "Execution stopped by hook",
        });
      return qt;
    }
    toolUseContext.onPermissionDenial?.(tool, toolUseID, observableInput);
  }
  let Nr = Date.now() - permissionStart;
  if (Nr >= ISOLATION_TIMEOUT_MS && permissionMode === "auto")
    logForDebugging(
      `Slow permission decision: ${Nr}ms for ${toolCategoryForTelemetry(tool)} (mode=${permissionMode}, behavior=${permissionDecision.behavior})`,
      {
        level: "info",
      },
    );
  let toolPermissionContext = getToolPermissionContext(toolUseContext_2);
  logToolDecision({
    toolName: tool.name,
    isMcp: tool.isMcp ?? false,
    messageId,
    toolUseID,
    permissionMode: toolPermissionContext.mode,
    ...toDecisionRecord(permissionDecision),
    resolvedSource: toolUseContext.toolDecisions.get(toolUseID)?.source,
    resolvedDecision: toolUseContext.toolDecisions.get(toolUseID)?.decision,
  });
  let source = getToolDecisionForOTel(permissionDecision, toolUseContext.abortController.signal.aborted);
  if (!toolUseContext.toolDecisions.has(toolUseID)) {
    let { decision, source: source_2 } = source;
    let toolInputDetailsForAnalytics = extractToolInputDetailsForAnalytics(
      tool.name,
      observableInput,
      tool.mcpInfo,
    );
    logOTelEvent(
      "tool_decision",
      {
        decision,
        source: source_2,
        tool_name: sanitizeToolNameForAnalytics(tool.name),
        tool_use_id: toolUseID,
        ...toolSourceMetadata(tool.mcpInfo),
        ...(Object.keys(toolInputDetailsForAnalytics).length > 0 && {
          tool_parameters: jsonStringify(toolInputDetailsForAnalytics),
        }),
        ...(source_2 === "config" &&
          permissionDecision.behavior !== "ask" &&
          getClassifierVerdictAnalyticsFields(decision, permissionDecision.decisionReason)),
        permission_mode: toExternalPermissionMode(permissionMode),
        ...(requestId && {
          request_id: requestId,
        }),
      },
      toolUseContext.agentContext,
    );
    if (isCodeEditingTool(tool.name))
      buildCodeEditToolAttributes(tool, observableInput, decision, source_2).then((attributes) =>
        getCodeEditToolDecisionCounter()?.add(1, attributes),
      );
  }
  if (
    permissionDecision.decisionReason?.type === "hook" &&
    permissionDecision.decisionReason.hookName === "PermissionRequest" &&
    permissionDecision.behavior !== "ask"
  )
    qt.push({
      message: createAttachmentMessage_2({
        type: "hook_permission_decision",
        decision: permissionDecision.behavior,
        toolUseID,
        hookEvent: "PermissionRequest",
      }),
    });
  let as;
  try {
    if (
      isCcsTenant() &&
      isAutoClassifierActive(
        isAutoAllowedInMode(tool, toolPermissionContext),
        toolPermissionContext.servedCall === true,
      )
    )
      as = {
        autoClassifierActive: true,
        ...(permissionDecision.behavior === "allow" && {
          approver: fromEnumOpt(getApprovalSource(permissionDecision)),
          decisionReasonType: fromEnum(permissionDecision.decisionReason?.type ?? "unknown"),
        }),
      };
  } catch (error) {
    logError(error);
  }
  if (permissionDecision.behavior !== "allow") {
    logForDebugging(`${toolCategoryForTelemetry(tool)} tool permission denied`);
    let yr = toolUseContext.toolDecisions.get(toolUseID);
    setDecided(
      decisionOut,
      permissionMode,
      buildDeniedDecisionRecord(permissionDecision, yr, source, rs.pipeline),
    );
    endToolSpan(toolSpan);
    logEvent("tengu_tool_use_can_use_tool_rejected", {
      ...as,
      messageID: sanitizeMarkName(messageId),
      toolUseID: sanitizeMarkName(toolUseID),
      toolName: sanitizeToolNameForAnalytics(tool.name),
      deniedBy:
        permissionDecision.behavior === "ask" && yr?.decision !== "reject"
          ? lit_2("unresolvedAsk")
          : sanitizedDecisionReasonDisplay("deny", yr?.source, permissionDecision.decisionReason),
      decisionReasonType: fromEnum(
        permissionDecision.decisionReason?.type !== "rule" &&
          toDecisionRecord(permissionDecision).matchedAskRule !== undefined
          ? "rule"
          : (permissionDecision.decisionReason?.type ?? "unknown"),
      ),
      preToolHookDurationMs: un,
      permissionDurationMs: Nr,
      queryChainId: sanitizeMarkName(toolUseContext.queryTracking?.chainId),
      queryDepth: toolUseContext.queryTracking?.depth,
      ...(toolUseContext.options.messageClientPlatform && {
        messageClientPlatform: entrypointForTelemetry(toolUseContext.options.messageClientPlatform),
      }),
      ...(mcpServerType && {
        mcpServerType: fromEnum(mcpServerType),
      }),
      ...(mcpServerBaseUrl && {
        mcpServerBaseUrl: safeOrigin(mcpServerBaseUrl),
      }),
      ...(requestId && {
        requestId: sanitizeMarkName(requestId),
      }),
      ...mcpToolAnalyticsFields(tool.name, mcpNameLoggable),
      ...claudeAiServerIdField(tool.mcpInfo),
      ...tool.mcpInfo?.pluginTelemetry,
    });
    let Kr = await settleUnaskedQuestion(tool, permissionDecision, toolUseID, toolUseContext, {
      stopped: fo,
      asked: hookPermissionResult?.behavior === "ask",
    });
    let Li = Kr ?? permissionDecision.message;
    if (fo && !Li) Li = `Execution stopped by PreToolUse hook${To ? `: ${To}` : ""}`;
    if (permissionDecision.decisionReason?.type === "hook")
      Li += webFetchAgentHookHint(
        tool.name,
        observableInput,
        toolUseContext.options.tools,
        getToolPermissionContext(toolUseContext),
        getAgentSpawnContext(toolUseContext),
      );
    let Qs = Li;
    let messageContent = [
      {
        type: "tool_result",
        content: Qs,
        ...(Kr === undefined && {
          is_error: true,
        }),
        tool_use_id: toolUseID,
      },
    ];
    let contentBlocks = permissionDecision.behavior === "ask" ? permissionDecision.contentBlocks : undefined;
    if (contentBlocks?.length) messageContent.push(...contentBlocks);
    let imagePasteIds;
    if (contentBlocks?.length) {
      let imageCount = count(contentBlocks, (Ca) => Ca.type === "image");
      if (imageCount > 0) imagePasteIds = makeImagePlaceholders(imageCount);
    }
    qt.push({
      message: createUserMessage({
        content: messageContent,
        imagePasteIds,
        toolUseResult: Kr === undefined ? `Error: ${Qs}` : Qs,
        toolDenialKind: getToolCallOutcomeCode(permissionDecision),
        toolDenialEndsTurn:
          permissionDecision.behavior === "deny" && permissionDecision.endsTurn ? true : undefined,
        toolDenialMonitorBlocked:
          permissionDecision.behavior === "deny" &&
          permissionDecision.decisionReason.type === "classifier" &&
          permissionDecision.decisionReason.monitorBlocked === true
            ? true
            : undefined,
        toolDenialUnanswered: getStreamClosedOutcome(permissionDecision),
        userFeedback: permissionDecision.behavior === "ask" ? permissionDecision.userFeedback : undefined,
        toolResultRemedy: getDenialErrorCode(permissionDecision),
        sourceToolAssistantUUID: assistantMessage.uuid,
        now,
      }),
    });
    if (
      fo &&
      permissionDecision.behavior === "deny" &&
      permissionDecision.decisionReason.type === "hook" &&
      !toolUseContext.abortController.signal.aborted
    )
      pushHookStoppedContinuation(qt, {
        toolName: tool.name,
        toolUseID,
        message: To ?? Li,
      });
    if (
      permissionDecision.decisionReason?.type === "classifier" &&
      permissionDecision.decisionReason.classifier === "auto-mode"
    ) {
      let Bs = false;
      try {
        for await (let Ca of executePermissionDeniedHooks(
          tool.name,
          toolUseID,
          observableInput,
          permissionDecision.decisionReason.reason ?? "Permission denied",
          toolUseContext,
          permissionMode,
          toolUseContext.abortController.signal,
        ))
          if (Ca.retry) Bs = true;
      } catch (error) {
        if (!(error instanceof StreamClosedAbortError)) throw error;
        logForDebugging("PermissionDenied hooks cancelled (control stream closed)");
      }
      if (Bs && !permissionDecision.decisionReason.noVerdict)
        qt.push({
          message: createUserMessage({
            content: PERMISSION_DENIED_RETRY_TEXT,
            isMeta: true,
            turnCompanion: true,
            now,
          }),
        });
    }
    if (
      permissionDecision.behavior === "deny" &&
      permissionDecision.endsTurn &&
      !toolUseContext.abortController.signal.aborted
    )
      turnAbortControllerOf(toolUseContext.abortController).abort(userAbortReason("permission-stop"));
    return qt;
  }
  logEvent("tengu_tool_use_can_use_tool_allowed", {
    ...as,
    messageID: sanitizeMarkName(messageId),
    toolUseID: sanitizeMarkName(toolUseID),
    toolName: sanitizeToolNameForAnalytics(tool.name),
    queryChainId: sanitizeMarkName(toolUseContext.queryTracking?.chainId),
    queryDepth: toolUseContext.queryTracking?.depth,
    ...(mcpServerType && {
      mcpServerType: fromEnum(mcpServerType),
    }),
    ...(mcpServerBaseUrl && {
      mcpServerBaseUrl: safeOrigin(mcpServerBaseUrl),
    }),
    ...(requestId && {
      requestId: sanitizeMarkName(requestId),
    }),
    ...mcpToolAnalyticsFields(tool.name, mcpNameLoggable),
    ...claudeAiServerIdField(tool.mcpInfo),
    ...tool.mcpInfo?.pluginTelemetry,
  });
  if (permissionDecision.updatedInput !== undefined && !isEmptyObject(permissionDecision.updatedInput)) {
    let yr = isUnrecognizedKeysIssue_2(tool.inputSchema, permissionDecision.updatedInput);
    if (yr !== null) {
      let Kr = new ZodError(yr);
      let Li = `The permission handler returned updatedInput for ${tool.name} that failed schema validation: ${formatZodValidationError(tool.name, Kr)}
This is a configuration issue in your canUseTool callback, PermissionRequest hook, or permission-prompt tool \u2014 updatedInput must satisfy the tool's input schema. The tool input from the model was valid.`;
      let startId = uniq(yr.map((Hi) => Hi.code));
      setDecided(
        decisionOut,
        permissionMode,
        buildPermissionDecisionRecord("reject", "permission_updated_input_invalid"),
      );
      endToolSpan(toolSpan);
      logForDebugging(
        `Permission handler updatedInput for ${toolCategoryForTelemetry(tool)} failed schema validation (${startId.join(",")})`,
        {
          level: "warn",
        },
      );
      logFeatureSad(errorContent, "tool_permission_updated_input_invalid");
      logEvent("tengu_tool_use_error", {
        error: lit_2("InputValidationError"),
        errorCode: lit_2("PERMISSION_UPDATED_INPUT"),
        zodIssueCodes: fromEnumArr(startId),
        errorDetailsHash: shortHash(Li),
        messageID: sanitizeMarkName(messageId),
        toolName: sanitizeToolNameForAnalytics(tool.name),
        isMcp: tool.isMcp ?? false,
        ...getSubagentTelemetryFields(toolUseContext.agentContext),
        ...getEffortTelemetryFields(toolUseContext),
        toolInputSizeBytes: nt,
        queryChainId: sanitizeMarkName(toolUseContext.queryTracking?.chainId),
        queryDepth: toolUseContext.queryTracking?.depth,
        ...(mcpServerType && {
          mcpServerType: fromEnum(mcpServerType),
        }),
        ...(mcpServerBaseUrl && {
          mcpServerBaseUrl: safeOrigin(mcpServerBaseUrl),
        }),
        ...(requestId && {
          requestId: sanitizeMarkName(requestId),
        }),
        ...mcpToolAnalyticsFields(tool.name, mcpNameLoggable),
        ...claudeAiServerIdField(tool.mcpInfo),
        ...tool.mcpInfo?.pluginTelemetry,
      });
      qt.push({
        message: createUserMessage({
          content: [
            {
              type: "tool_result",
              content: `<tool_use_error>${Li}</tool_use_error>`,
              is_error: true,
              tool_use_id: toolUseID,
            },
          ],
          toolUseResult: `InputValidationError: permission handler updatedInput failed schema for ${tool.name}`,
          sourceToolAssistantUUID: assistantMessage.uuid,
          now,
        }),
      });
      if (fo && !toolUseContext.abortController.signal.aborted)
        pushHookStoppedContinuation(qt, {
          toolName: tool.name,
          toolUseID,
          message: To || "Execution stopped by hook",
        });
      return qt;
    }
    observableInput = stripUnchangedHostOwnedKeys(
      tool.name,
      permissionDecision.updatedInput,
      observableInput,
    );
  } else observableInput = stripHostOwnedInputKeys(tool.name, observableInput);
  let Vi = {
    stamped: false,
    visiblyAttributed: false,
  };
  let toolInputForTelemetry = extractToolInputForTelemetry_2(observableInput);
  let Wi =
    toolInputForTelemetry !== undefined && Ho
      ? notRecordedLength(jsonStringify(observableInput))
      : toolInputForTelemetry;
  let toolInputDetailsForAnalytics = extractToolInputDetailsForAnalytics(
    tool.name,
    observableInput,
    tool.mcpInfo,
  );
  let wa = toolUseContext.toolDecisions.get(toolUseID);
  setDecided(
    decisionOut,
    permissionMode,
    buildDeniedDecisionRecord(permissionDecision, wa, source, rs.pipeline),
  );
  let aborted = toolUseContext.abortController.signal.aborted;
  let mi = assistantMessage.isVirtual
    ? undefined
    : notifyBridgeSessionListener(toolUseContext.session, {
        toolUseId: toolUseID,
        mayWrite: () => !tool.isReadOnly(restoreCallInput(yn, observableInput), toolUseContext),
        agentId: toolUseContext.agentId,
        signal: toolUseContext.abortController.signal,
      });
  if (mi) {
    await mi;
    if (
      !aborted &&
      toolUseContext.abortController.signal.aborted &&
      !isServerFallbackDiscard(toolUseContext.abortController.signal)
    ) {
      endToolSpan(toolSpan);
      qt.push(
        ...buildCancelledToolResult({
          phase: "pre_call",
          cancelText: getCancelMessage(toolUseContext.abortController.signal),
          tool,
          toolUseID,
          toolUseContext,
          assistantMessage,
          mcpServerType,
          mcpServerBaseUrl,
          mcpNameLoggable,
          requestId,
          now,
        }),
      );
      return qt;
    }
  }
  if (toolUseContext.toolCallAbandoned?.(toolUseID)) {
    endToolSpan(toolSpan);
    return [];
  }
  startToolExecutionSpan(toolUseContext.agentContext, toolUseID);
  let now_2 = Date.now();
  let $a = new ToolWallClockTracker(now_2);
  let nr = {
    declaredNoOutsideWork:
      tool.mcpInfo === undefined &&
      ISOLATION_NEUTRAL_TOOLS.has(tool.name) &&
      !(
        tool.name === ARTIFACT_TOOL_NAME_2 &&
        "action" in observableInput &&
        observableInput.action === "read"
      ),
  };
  let Ti = new MemoryUsageSampler(stallSampler);
  let Vs = Ti.sample("before_call");
  let _i;
  callInput = restoreCallInput(yn, observableInput);
  let jo;
  if (isServerFallbackDiscard(toolUseContext.abortController.signal))
    return buildCancelledToolResult({
      phase: "pre_call",
      tool,
      toolUseID,
      toolUseContext,
      assistantMessage,
      mcpServerType,
      mcpServerBaseUrl,
      mcpNameLoggable,
      requestId,
      now,
    });
  if (isTerminalShutdown() && !toolUseContext.abortController.signal.aborted) await heldUntilExit();
  toolUseContext.markToolCallStarted?.(toolUseID);
  toolUseContext.markToolCallRunning?.(toolUseID);
  onProgress({
    type: "set_in_progress_tool_use_ids",
    op: {
      action: "add",
      ids: [toolUseID],
    },
  });
  logForDebugging(
    `[Stall] tool_dispatch_start tool=${toolCategoryForTelemetry(tool)} toolUseId=${toolUseID} permissionDecisionMs=${Nr}`,
    {
      level: "info",
    },
  );
  let Qr = false;
  let fi;
  let telemetryToolInput = backgroundAgentIdOf(toolUseContext);
  let Ja = false;
  let Di = () => {
    if (Ja) {
      Ja = false;
      endActivity("tool_exec", telemetryToolInput);
    }
  };
  try {
    Ja = true;
    startSessionActivity("tool_exec", telemetryToolInput);
    toolUseContext.lendToolExecEnd?.(toolUseID, Di);
    if (supportsRemoteExecution(tool) && splitHostField(callInput).requested !== undefined)
      throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
        INJECTED_MACHINE_REFUSAL,
        "late host argument on a local tool call",
      );
    if (isCoordinatorBashToolUse(tool, toolUseContext)) {
      let Ks = checkCoordinatorShellCommand(tool, callInput, toolUseContext);
      if (Ks !== null)
        throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
          Ks,
          "coordinator Bash call refused at call time",
        );
      callInput = clampCoordinatorShellTimeout(callInput);
    }
    let cwd = toolUseContext.session.project?.cwd;
    if (cwd !== undefined && shouldLogGitCommitDetails(tool, callInput)) jo = await markHeadReflog(cwd);
    if (!isCallDirectoryUnchanged())
      throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
        CALL_DIRECTORY_CHANGED_MESSAGE,
        "working directory changed between check and call",
      );
    let Kr = toolUseContext.agentId
      ? () => {}
      : emitToolHeartbeat({
          toolName: tool.name,
          toolUseID,
          abortSignal: toolUseContext.abortController.signal,
          onProgress,
        });
    let Li = () => {
      _i = Date.now();
    };
    if (toolUseContext.abortController.signal.aborted) _i = now_2;
    toolUseContext.abortController.signal.addEventListener("abort", Li, {
      once: true,
    });
    let Qs = !tool.isReadOnly(callInput, toolUseContext);
    toolUseContext.toolState.get(BashRepeatMeter).noteOtherToolCall(tool, Qs);
    if (callObserver && !Qs) callObserver.isReadOnly = true;
    let mcpDetails = getApprovalSource(permissionDecision);
    let skillName = forgetPendingCheck(toolUseContext.session, toolUseID);
    let ta = (toolUseContext, onProgress) =>
      tool.call(
        callInput,
        {
          ...toolUseContext,
          toolUseId: toolUseID,
          permissionPhase: rs,
          autoModeClassified:
            permissionDecision.decisionReason?.type === "classifier" &&
            permissionDecision.decisionReason.classifier === "auto-mode" &&
            permissionDecision.decisionReason.classifierAllowed === true
              ? true
              : undefined,
          allowGivenBy: mcpDetails && {
            toolUseId: toolUseID,
            approver: mcpDetails,
          },
          ...false,
          desktopForwardToolUseId: undefined,
        },
        canUseTool,
        assistantMessage,
        onProgress,
        {
          userModified: permissionDecision.userModified ?? false,
          gitDiffRead: true,
          outsideResultReader: () => getOutsideResultReaderBlocker(toolUseContext),
          permissionCheckedFor: skillName ? undefined : Oo,
          runnerCheckedHere: skillName ? checkRunner : jr,
          timing: $a,
        },
      );
    let result;
    callObserver?.onToolEntered?.();
    try {
      result = await runWithTimingContext($a, () =>
        detachToolCall(tool, callInput, toolUseContext)
          ? runDetachableToolCall({
              tool,
              input: callInput,
              toolUseID,
              toolUseContext,
              onProgress,
              run: ta,
            })
          : ta(toolUseContext, onProgress),
      );
    } finally {
      Kr();
      toolUseContext.abortController.signal.removeEventListener("abort", Li);
    }
    await waitForFolderAttached({
      toolState: toolUseContext.toolState,
      fullToolName: tool.name,
      content: result.data,
      signal: toolUseContext.abortController.signal,
    });
    let toolDurationMs = Date.now() - now_2;
    $a.settle();
    fi = toolDurationMs;
    let tu = Ti.sample("after_call");
    addToToolDuration(toolDurationMs);
    logForDebugging(
      `[Stall] tool_dispatch_end tool=${toolCategoryForTelemetry(tool)} toolUseId=${toolUseID} outcome=ok durationMs=${toolDurationMs}`,
      {
        level: "info",
      },
    );
    Qr = true;
    if (
      tool.mcpInfo === undefined &&
      CORE_FILE_TOOLS.has(tool.name) &&
      result.data &&
      typeof result.data === "object"
    ) {
      let Ks = {};
      if (tool.name === FILE_READ_TOOL_NAME) {
        let kl = result.data;
        if (kl.type === "text") {
          if (isToolDetailsLoggingEnabled() && "file_path" in observableInput)
            Ks.file_path = String(observableInput.file_path);
          Ks.content = kl.file.content;
        }
      }
      if (
        (tool.name === FILE_EDIT_TOOL_NAME || tool.name === FILE_WRITE_TOOL_NAME) &&
        "file_path" in observableInput
      ) {
        if (isToolDetailsLoggingEnabled()) Ks.file_path = String(observableInput.file_path);
        if (
          isToolDetailsLoggingEnabled() &&
          tool.name === FILE_EDIT_TOOL_NAME &&
          "structuredPatch" in result.data
        )
          Ks.diff = jsonStringify(result.data.structuredPatch);
        if (
          isToolDetailsLoggingEnabled() &&
          tool.name === FILE_WRITE_TOOL_NAME &&
          "content" in observableInput
        )
          Ks.content = String(observableInput.content);
      }
      if (tool.name === BASH_TOOL_NAME && "command" in observableInput) {
        let kl = observableInput;
        if (isToolDetailsLoggingEnabled()) Ks.bash_command = kl.command;
        if ("stdout" in result.data) Ks.output = String(result.data.stdout);
      }
      if (Object.keys(Ks).length > 0) addToolContentEvent(toolSpan, "tool.output", Ks);
    }
    if (
      tool.name === POLL &&
      typeof result.data === "object" &&
      result.data !== null &&
      "eventCount" in result.data &&
      typeof result.data.eventCount === "number" &&
      result.data.eventCount > 0
    )
      qt.push({
        message: createAttachmentMessage_2({
          type: "poll_events",
          deliveredVia: "poll_tool",
          envelopes: [],
          kinds: [],
          remainingWakeCount: 0,
          ...("provenance" in result.data &&
            Array.isArray(result.data.provenance) && {
              provenance: result.data.provenance,
            }),
          ...("declared" in result.data &&
            Array.isArray(result.data.declared) && {
              declared: result.data.declared,
            }),
          ...false,
        }),
      });
    if (typeof result === "object" && "structured_output" in result)
      qt.push({
        message: createAttachmentMessage_2({
          type: "structured_output",
          data: result.structured_output,
          toolUseID,
        }),
      });
    endToolExecutionSpan({
      success: true,
    });
    let preMappedBlock = result.detached
      ? {
          type: "tool_result",
          tool_use_id: toolUseID,
          content: result.detached.text,
        }
      : tool.mapToolResultToToolResultBlockParam(result.data, toolUseID);
    if (
      (tool.mcpInfo !== undefined || WEB_TOOLS.has(tool.name)) &&
      !result.detached &&
      shouldRecordToolContent(toolSpan)
    ) {
      let Ks = stringifyToolContentForSpan(preMappedBlock.content);
      addToolContentEvent(toolSpan, "tool.output", {
        output: Ho ? notRecordedLength(Ks) : Ks,
      });
    }
    let ga =
      isPerfettoTracingEnabled() || (isBetaTracingEnabled() && isToolContentLoggingEnabled())
        ? result.data && typeof result.data === "object"
          ? jsonStringify(result.data)
          : String(result.data ?? "")
        : undefined;
    endToolSpan(toolSpan, ga, undefined, Ho);
    let mappedContent = preMappedBlock.content;
    if (yo) noteToolTexts(observableInput, mappedContent);
    let hd = !mappedContent
      ? 0
      : typeof mappedContent === "string"
        ? mappedContent.length
        : jsonStringify(mappedContent).length;
    let resultSizeTelemetry = getResultSizeTelemetry(mappedContent, tool);
    let Ld = isMedia(result.newMessages);
    let vs;
    let ol;
    let gd;
    let Su;
    let Eu;
    if (observableInput && typeof observableInput === "object") {
      if (
        (lt === FILE_READ_TOOL_NAME || lt === FILE_EDIT_TOOL_NAME || lt === FILE_WRITE_TOOL_NAME) &&
        "file_path" in observableInput &&
        typeof observableInput.file_path === "string"
      ) {
        vs = getFileExtensionForAnalytics(observableInput.file_path);
        gd = String(callInput.file_path).length;
      } else if (
        lt === NOTEBOOK_EDIT_TOOL_NAME &&
        "notebook_path" in observableInput &&
        typeof observableInput.notebook_path === "string"
      ) {
        let notebookPath = observableInput.notebook_path;
        vs = getFileExtensionForAnalytics(notebookPath);
        gd = notebookPath.length;
      } else if (tool.name === ARTIFACT_TOOL_NAME_2 && "file_path" in observableInput) {
        let Ks = String(observableInput.file_path);
        vs = getFileExtensionForAnalytics(Ks);
        gd = Ks.length;
      } else if (
        lt === BASH_TOOL_NAME &&
        "command" in observableInput &&
        typeof observableInput.command === "string"
      ) {
        let Ks = observableInput;
        vs = getFileExtensionsFromBashCommand_2(Ks.command);
        ol = extensionsInCommand(Ks.command);
        Su = Ks.command.length;
      } else if (
        (tool.name === WORKSPACE_BASH_TOOL || lt === POWERSHELL_TOOL_NAME) &&
        "command" in observableInput &&
        typeof observableInput.command === "string"
      )
        ol = extensionsInCommand(observableInput.command);
      else if (tool.name === DESIGNSYNC) {
        let Ks = observableInput;
        let kl = (xc) => (Array.isArray(xc) ? xc.length : undefined);
        let counts = Ks.method === "report_validate" ? Ks.counts : undefined;
        Eu = {
          dsMethod: fromEnumOpt(DESIGNSYNC_METHODS.find((xc) => xc === Ks.method)),
          ...(typeof Ks.projectId === "string" && {
            dsProjectIdHash: shortHash(Ks.projectId),
          }),
          ...(kl(Ks.assets) !== undefined && {
            dsAssetCount: kl(Ks.assets),
          }),
          ...(kl(Ks.files) !== undefined && {
            dsFileCount: kl(Ks.files),
          }),
          ...(kl(Ks.paths) !== undefined && {
            dsPathCount: kl(Ks.paths),
          }),
          ...(kl(Ks.writes) !== undefined && {
            dsWriteCount: kl(Ks.writes),
          }),
          ...(kl(Ks.deletes) !== undefined && {
            dsDeleteCount: kl(Ks.deletes),
          }),
          ...(counts && {
            dsValidateTotal: counts.total,
            dsValidateBad: counts.bad,
            dsValidateThin: counts.thin,
            dsValidateVi: counts.variantsIdentical,
            dsValidateIterations: counts.iterations,
          }),
        };
      }
    }
    logToolFileActivity(lt, observableInput, messageId);
    if (tool.mcpInfo !== undefined && getIsNonInteractiveSession())
      toolUseContext.session.mcpSessionWiring.connections()?.clearNeedsAuth(tool.mcpInfo.serverName);
    logFeatureOk(errorContent);
    logEvent("tengu_tool_use_success", {
      messageID: sanitizeMarkName(messageId),
      toolUseID: sanitizeMarkName(toolUseID),
      toolName: sanitizeToolNameForAnalytics(tool.name),
      isMcp: tool.isMcp ?? false,
      ...getSubagentTelemetryFields(toolUseContext.agentContext),
      ...getEffortTelemetryFields(toolUseContext),
      durationMs: toolDurationMs,
      ...$a.fields(toolDurationMs, nr),
      ...(result.detached && {
        detached: true,
      }),
      ...(_i !== undefined && {
        ...toolFeatureOf(toolUseContext.abortController.signal),
        durationMsAtAbort: _i - now_2,
      }),
      ...diffMemoryUsage(Vs, tu),
      preToolHookDurationMs: un,
      permissionDurationMs: Nr,
      toolResultSizeBytes: hd,
      ...resultSizeTelemetry,
      ...(Ld > 0 && {
        toolResultAttachmentBytes: Ld,
      }),
      ...measureSidecarFields(result.data),
      ...(!shouldKeepToolResultInSubagents(toolUseContext, tool) && {
        sidecarDroppedForSubagent: true,
        ...(result.subagentFrameResult !== undefined && {
          sidecarSmallFormOfferedForSubagent: true,
        }),
      }),
      toolInputSizeBytes: nt,
      ...(vs !== undefined && {
        fileExtension: vs,
      }),
      ...(ol !== undefined && {
        bashCommandFileExtensions: ol,
      }),
      ...(gd !== undefined && {
        filePathLen: gd,
      }),
      ...(Su !== undefined && {
        bashCommandLen: Su,
      }),
      ...($o && {
        bash_command_class: $o.bash_command_class,
        bash_argv0: $o.bash_argv0,
        ...($o.bash_subcommand !== undefined && {
          bash_subcommand: $o.bash_subcommand,
        }),
        has_pipe: $o.has_pipe,
      }),
      ...Eu,
      ...(lt === FILE_READ_TOOL_NAME &&
        observableInput &&
        typeof observableInput === "object" && {
          readHasLimit: observableInput.limit !== undefined,
          readHasOffset: observableInput.offset !== undefined,
        }),
      ...(tool.name === WEBSEARCH && !tool.isMcp && getWebSearchModeAnalytics(observableInput, input)),
      queryChainId: sanitizeMarkName(toolUseContext.queryTracking?.chainId),
      queryDepth: toolUseContext.queryTracking?.depth,
      ...(toolUseContext.options.messageClientPlatform && {
        messageClientPlatform: entrypointForTelemetry(toolUseContext.options.messageClientPlatform),
      }),
      ...(mcpServerType && {
        mcpServerType: fromEnum(mcpServerType),
      }),
      ...(mcpServerBaseUrl && {
        mcpServerBaseUrl: safeOrigin(mcpServerBaseUrl),
      }),
      ...(requestId && {
        requestId: sanitizeMarkName(requestId),
      }),
      ...(tool.readOnlyHint !== undefined && {
        readOnlyHint: tool.readOnlyHint,
      }),
      ...mcpToolAnalyticsFields(tool.name, mcpNameLoggable),
      ...claudeAiServerIdField(tool.mcpInfo),
      ...tool.mcpInfo?.pluginTelemetry,
    });
    let Uc;
    if (
      shouldLogGitCommitDetails(tool, callInput) &&
      result.data &&
      typeof result.data === "object" &&
      "stdout" in result.data
    ) {
      let Ks =
        !("backgroundTaskId" in result.data && result.data.backgroundTaskId) &&
        !("interrupted" in result.data && result.data.interrupted === true);
      let commitInfo = await resolveCommitInfo(
        String(result.data.stdout),
        toolUseContext.session.project?.cwd ?? null,
        Ks ? jo : undefined,
      );
      if (commitInfo) {
        toolInputDetailsForAnalytics.git_commit_id = commitInfo.commitId;
        if (commitInfo.branch) toolInputDetailsForAnalytics.git_branch = commitInfo.branch;
        Uc = commitAttributes(commitInfo);
      }
    }
    let gitCommitId = getMcpToolScope(tool);
    logOTelEvent(
      "tool_result",
      {
        tool_name: sanitizeToolNameForAnalytics(tool.name),
        tool_use_id: toolUseID,
        success: "true",
        duration_ms: String(toolDurationMs),
        ...(Object.keys(toolInputDetailsForAnalytics).length > 0 && {
          tool_parameters: jsonStringify(toolInputDetailsForAnalytics),
        }),
        ...(Wi && {
          tool_input: Wi,
        }),
        tool_input_size_bytes: String(nt),
        tool_result_size_bytes: String(hd),
        ...(wa && {
          decision_source: wa.source,
          decision_type: wa.decision,
        }),
        ...(gitCommitId && {
          mcp_server_scope: gitCommitId,
        }),
        ...Uc,
        ...(requestId && {
          request_id: requestId,
        }),
      },
      toolUseContext.agentContext,
    );
    let toolOutput = result.data;
    let Qm = cronToolCallResult(tool.name, result.data);
    let wr = [];
    let zs = 0;
    let li = false;
    let nl;
    let Tl = [];
    if (
      result.classifierContext !== undefined &&
      (!tool.isMcp ||
        (mcpServerType === "sdk" &&
          tool.mcpInfo?.scope !== "project" &&
          isFirstPartyUploadScope(
            resolveMcpConnectionForTool(tool.name, toolUseContext.options.mcpClients).connection?.config,
          )))
    )
      Tl.push({
        value: truncateToLength(result.classifierContext, HOST_CONTEXT_LINE_LIMIT),
        hostPrincipal: true,
        pairedRewriteSeq: 0,
      });
    let contextLayers = result.contextLayers;
    let mcpMeta = result.mcpMeta;
    let toolEndsTurn = result.endsTurn;
    let toolResultRemedy = result.remedy;
    let sandboxViolations = result.sandboxViolations;
    let sandboxed = result.sandboxed;
    async function addToolResult(toolUseResult, preMappedBlock) {
      let Yd = toolResultsDirFor_2(toolUseContext.session);
      let xc = preMappedBlock
        ? await processToolResultBlock(preMappedBlock, tool, Yd, toolUseContext.storageV5)
        : await mapAndMaybePersistToolResult(tool, toolUseResult, toolUseID, Yd, toolUseContext.storageV5);
      let Ip =
        resultNote !== undefined && !xc.is_error && typeof xc.content === "string"
          ? {
              ...xc,
              content: `${xc.content}

${resultNote}`,
            }
          : xc;
      let Gc = zs !== 0 && !li;
      let contentBlocks = [
        isMcpTool(tool) || Gc
          ? {
              ...Ip,
              content: cutOversizedResultBlocks(Ip.content),
            }
          : Ip,
      ];
      if ("acceptFeedback" in permissionDecision && permissionDecision.acceptFeedback)
        contentBlocks.push({
          type: "text",
          text: permissionDecision.acceptFeedback,
        });
      let contentBlocks_2 =
        "contentBlocks" in permissionDecision ? permissionDecision.contentBlocks : undefined;
      if (contentBlocks_2?.length) contentBlocks.push(...contentBlocks_2);
      let imagePasteIds;
      if (contentBlocks_2?.length) {
        let imageCount = count(contentBlocks_2, (mae) => mae.type === "image");
        if (imageCount > 0) imagePasteIds = makeImagePlaceholders(imageCount);
      }
      let Sc = toolUseResult;
      try {
        if (tool.stripForCreation) Sc = tool.stripForCreation(toolUseResult);
        else if (tool.stripToolUseResultAtCreation && tool.stripForStorage)
          Sc = tool.stripForStorage(toolUseResult, false);
      } catch (error) {
        logError(error);
        Sc = undefined;
      }
      if (callObserver)
        callObserver.output = {
          value: Sc,
        };
      Sc = restoreMcpResultForCopy(tool, Sc, xc, toolUseContext);
      let filtered = Tl.filter((cS) => {
        if (cS.pairedRewriteSeq === undefined) return true;
        if (cS.pairedRewriteSeq === 0) return zs === 0 || li;
        return !li && cS.pairedRewriteSeq === zs;
      });
      if (filtered.length < Tl.length)
        logForDebugging(
          `host classifier context: dropped ${Tl.length - filtered.length} entr(y/ies) whose paired rewrite never took effect (${li ? "rewrites reverted" : "superseded or inapplicable"}) for ${toolCategoryForTelemetry(tool)}`,
        );
      let dy =
        filtered.length > 0
          ? filtered.map((cS) => cS.value).join(`
`)
          : undefined;
      let Hx = filtered.length > 0 && filtered.every((cS) => cS.hostPrincipal);
      let aI = dy !== undefined ? truncateToLength(dy, HOST_CONTEXT_LINE_LIMIT) : undefined;
      if (aI !== undefined)
        if (aI.length < dy.length) logFeatureSad("auto_mode_host_context", "join_truncated");
        else logFeatureOk("auto_mode_host_context");
      let startId = createUserMessage({
        content: contentBlocks,
        imagePasteIds,
        hostClassifierContext: aI,
        ...cutResultForStorage(toolUseContext, tool, Gc, {
          toolUseId: toolUseID,
          toolUseResult: shouldKeepToolResultInSubagents(toolUseContext, tool) ? Sc : undefined,
          mcpMeta: formatMcpStructuredContent(
            toolUseContext.agentId,
            mcpMeta,
            tool,
            tool.mcpInfo?.accountMemoryServer === true ||
              (isHearthReadTool(tool.name) && hasRelaySource(toolUseContext.options.mcpClients)),
          ),
        }),
        toolEndsTurn,
        toolResultRemedy,
        sandboxViolations,
        sandboxed,
        sourceToolAssistantUUID: assistantMessage.uuid,
        now,
      });
      if (
        wa?.surface === "host_dialog" &&
        "acceptFeedback" in permissionDecision &&
        permissionDecision.acceptFeedback &&
        getAutoModeConfigOrDefault().typedMarks === true
      )
        startId[MESSAGE_MARK_SYMBOLS] = {
          as: "feedback",
          texts: [permissionDecision.acceptFeedback],
        };
      if (result.subagentFrameResult !== undefined && !shouldKeepToolResultInSubagents(toolUseContext, tool))
        if (Gc) logFeatureSad("subagent_frame_result", "hook_rewrote_output");
        else if (nl !== undefined) logFeatureSad("subagent_frame_result", nl);
        else {
          Object.assign(startId, asSubagentFrameResult(result.subagentFrameResult));
          logFeatureOk("subagent_frame_result");
        }
      if (
        startId.hostClassifierContext !== undefined &&
        Hx &&
        !toolUseContext.abortController.signal.aborted &&
        getClassifierEpoch() === classifierEpoch &&
        !isLiveHostContextDisabled()
      )
        registerClassifiedRun(startId);
      qt.push({
        message: startId,
        contextLayers:
          contextLayers && contextLayers.length > 0
            ? {
                toolUseID,
                layers: contextLayers,
              }
            : undefined,
        toolDuration: {
          toolName: tool.name,
          durationMs: toolDurationMs,
        },
      });
    }
    if (result.detached) {
      await addToolResult(DETACHED_TOOL_CALL_FLAG, preMappedBlock);
      if (fo && !toolUseContext.abortController.signal.aborted)
        pushHookStoppedContinuation(qt, {
          toolName: tool.name,
          toolUseID,
          message: To || "Execution stopped by hook",
        });
      return qt;
    }
    let np;
    let Rf = [];
    let postToolHookStart = Date.now();
    let al = false;
    let mf = false;
    let rg = false;
    for await (let Ks of rg
      ? []
      : runPostToolUseHooks(
          toolUseContext,
          tool,
          toolUseID,
          assistantMessage.message.id,
          observableInput,
          toolOutput,
          requestId,
          mcpServerType,
          mcpServerBaseUrl,
          toolDurationMs,
          {
            managedHooksExcluded:
              toolUseContext.managedPass?.toolUseId === toolUseID &&
              shouldKeepToolResultInSubagents(toolUseContext, tool),
          },
        )) {
      al = true;
      if ("updatedToolOutput" in Ks) {
        toolOutput = Ks.updatedToolOutput;
        mf = true;
        zs += 1;
      } else if ("classifierContext" in Ks)
        Tl.push({
          ...Ks.classifierContext,
          pairedRewriteSeq: Ks.pairing === "none" ? undefined : Ks.pairing === "pending" && zs > 0 ? zs : -1,
        });
      else {
        wr.push(Ks);
        if (Ks.message.type === "attachment") {
          let att = Ks.message.attachment;
          if (
            "command" in att &&
            att.command !== undefined &&
            "durationMs" in att &&
            att.durationMs !== undefined
          )
            Rf.push({
              command: att.command,
              durationMs: att.durationMs,
            });
        }
      }
    }
    let uh = Date.now() - postToolHookStart;
    if (al) {
      let Ks = await noteHookModifiedFile(
        tool.name,
        toolUseID,
        observableInput,
        toolUseContext.readFileState,
      );
      if (Ks)
        wr.push({
          message: Ks,
        });
    }
    if (
      result.subagentFrameResultHolds !== undefined &&
      !shouldKeepToolResultInSubagents(toolUseContext, tool)
    ) {
      try {
        if (!(await result.subagentFrameResultHolds())) nl = "tool_says_stale";
      } catch (error) {
        logError(error);
        nl = "check_threw";
      }
      if (nl !== undefined)
        logForDebugging(
          `${toolCategoryForTelemetry(tool)}: subagentFrameResult not sent (${nl}): the tool's check did not confirm that it still describes what the call left behind`,
        );
    }
    if (uh >= ISOLATION_TIMEOUT_MS)
      logForDebugging(
        `Slow PostToolUse hooks: ${uh}ms for ${toolCategoryForTelemetry(tool)} (${Rf.length} hooks)`,
        {
          level: "info",
        },
      );
    if (isMcpTool(tool)) {
      await addToolResult(attributeScheduledPlugin(tool.name, Qm, toolOutput));
      let Ks = isDocsConnectorTool(tool, toolUseContext.getAppState().mcp.clients)
        ? readFirstJsonPayload(result.data)
        : null;
      if (Ks !== null)
        import("./chunk-4mngb19a.js")
          .then((kl) =>
            kl.touchFrameLiveForMcpWrite(
              Ks,
              toolUseContext,
              kl.makeArtifactReadVersionReader(toolUseContext.getAppState, Ks),
            ),
          )
          .catch(logError);
    } else {
      let preMappedBlock_2 = preMappedBlock;
      if (mf) {
        let kl = tool.outputSchema?.safeParse(toolOutput);
        let Yd = (xc, Ip) => {
          logForDebugging(
            `PostToolUse hook returned updatedToolOutput that does not match ${toolCategoryForTelemetry(tool)}'s output shape: reason=${xc} detailChars=${Ip.length}`,
            {
              level: "error",
            },
          );
          toolOutput = result.data;
          li = true;
          let Gc = count(Tl, (oc) => oc.pairedRewriteSeq === zs);
          wr.push({
            message: createAttachmentMessage_2({
              type: "hook_error_during_execution",
              content: `PostToolUse hook returned updatedToolOutput that does not match ${tool.name}'s output shape; using original output.${Gc > 0 ? " A host-asserted classifier context attached by the same hook was discarded with the rejected rewrite." : ""} ${Ip}`,
              hookName: `PostToolUse:${tool.name}`,
              toolUseID,
              hookEvent: "PostToolUse",
            }),
          });
        };
        if (kl && !kl.success)
          Yd(
            `schema_invalid issues=${uniq(kl.error.issues.map((issue) => issue.code)).join(",")}`,
            kl.error.message,
          );
        else
          try {
            let xc = toolOutput;
            if (tool.restoreTransientForRemap)
              try {
                xc = tool.restoreTransientForRemap(result.data, toolOutput);
              } catch (error) {
                logError(error);
                xc = toolOutput;
              }
            let Ip = tool.mapToolResultToToolResultBlockParam(xc, toolUseID);
            if (Ip === undefined) Yd("mapper_undefined", "mapper returned undefined");
            else preMappedBlock_2 = Ip;
          } catch (error) {
            Yd("mapper_throw", formatToolErrorMessage(error));
          }
      }
      await addToolResult(attributeScheduledPlugin(tool.name, Qm, toolOutput), preMappedBlock_2);
    }
    if (tool.name === FILE_READ_TOOL_NAME && result.data && typeof result.data === "object") {
      let cachedReadingLimit = getCachedReadingLimit(result.data);
      if (cachedReadingLimit !== undefined)
        qt.push({
          message: createAttachmentMessage_2({
            type: "read_truncation_notice",
            banner: cachedReadingLimit,
            toolUseID,
          }),
        });
    }
    if (shouldAddBashAudienceNote(tool.name, result.data, getMainLoopModel_2(toolUseContext)))
      qt.push({
        message: createAttachmentMessage_2({
          type: "bash_output_audience_note",
          toolUseID,
        }),
      });
    let Kf =
      getAbortKind(
        toolUseContext.abortController.signal,
        {
          name: tool.name,
          ran: true,
          ...false,
        },
        abortScopeOf(toolUseContext),
      ) !== null;
    for (let Ks of wr) qt.push(Ks);
    let ch = [...(result.newMessages ?? []), ...[]];
    if (ch.length > 0)
      for (let hookResult of ch)
        if (hookResult.type === "user") {
          let message = {
            ...hookResult,
            turnCompanion: true,
          };
          qt.push({
            message,
          });
        } else
          qt.push({
            message: hookResult,
          });
    if (fo && !toolUseContext.abortController.signal.aborted)
      pushHookStoppedContinuation(qt, {
        toolName: tool.name,
        toolUseID,
        message: To || "Execution stopped by hook",
      });
    runAfterResultCommitted(result, false || Kf, logError);
    return qt;
  } catch (error) {
    let toolDurationMs = Date.now() - now_2;
    $a.settle();
    let Li = Ti.sample("after_throw");
    addToToolDuration(toolDurationMs);
    let Qs = isAbortOrCancelError(error);
    if (!Qr)
      logForDebugging(
        `[Stall] tool_dispatch_end tool=${toolCategoryForTelemetry(tool)} toolUseId=${toolUseID} outcome=${Qs ? "aborted" : "error"} durationMs=${toolDurationMs}`,
        {
          level: Qs ? "info" : "warn",
        },
      );
    else
      logForDebugging(
        `[Stall] tool_dispatch_post_error tool=${toolCategoryForTelemetry(tool)} toolUseId=${toolUseID} durationMs=${toolDurationMs}`,
        {
          level: "warn",
        },
      );
    let Hi = errorMessage(error);
    let Xa = classifyToolError(error);
    if (yo)
      noteToolTexts(
        observableInput,
        error instanceof McpToolCallError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS ? Hi : undefined,
      );
    let ta =
      Ho || rr || withholdsFileReferenceErrors(tool, toolUseID)
        ? error instanceof Error
          ? describeErrorWithoutText(error)
          : notRecordedLength(Hi)
        : Hi;
    endToolExecutionSpan({
      success: false,
      interrupted: getInterruptKind(error, toolUseContext.abortController.signal) !== undefined,
      error: isToolDetailsLoggingEnabled() ? ta : Xa,
      errorClass: Xa,
    });
    endToolSpan(toolSpan);
    if (error instanceof McpAuthError)
      toolUseContext.session.mcpSessionWiring.connections()?.markNeedsAuth(error.serverName);
    let Bs = isServerFallbackDiscard(toolUseContext.abortController.signal);
    let Ca = {
      messageID: sanitizeMarkName(messageId),
      toolName: sanitizeToolNameForAnalytics(tool.name),
      toolUseID: sanitizeMarkName(toolUseID),
      isMcp: tool.isMcp ?? false,
      toolInputSizeBytes: nt,
      ...(!Qr && {
        durationMs: toolDurationMs,
        ...$a.fields(toolDurationMs, nr),
        preToolHookDurationMs: un,
        permissionDurationMs: Nr,
        ...toolFeatureOf(toolUseContext.abortController.signal),
        ...(_i !== undefined && {
          durationMsAtAbort: _i - now_2,
        }),
      }),
      ...getSubagentTelemetryFields(toolUseContext.agentContext),
      ...getEffortTelemetryFields(toolUseContext),
      queryChainId: sanitizeMarkName(toolUseContext.queryTracking?.chainId),
      queryDepth: toolUseContext.queryTracking?.depth,
      ...(mcpServerType && {
        mcpServerType: fromEnum(mcpServerType),
      }),
      ...(mcpServerBaseUrl && {
        mcpServerBaseUrl: safeOrigin(mcpServerBaseUrl),
      }),
      ...(requestId && {
        requestId: sanitizeMarkName(requestId),
      }),
      ...(tool.readOnlyHint !== undefined && {
        readOnlyHint: tool.readOnlyHint,
      }),
      ...mcpToolAnalyticsFields(tool.name, mcpNameLoggable),
      ...claudeAiServerIdField(tool.mcpInfo),
      ...tool.mcpInfo?.pluginTelemetry,
    };
    if (!Bs && !Qs) {
      let { code, isSad } = classifyToolErrorCode(error);
      logForDebugging(
        `${toolCategoryForTelemetry(tool)} tool error (${toolDurationMs}ms): code=${code} type=${Xa} errorChars=${Hi.length}`,
      );
      if (isSad) logFeatureSad(errorContent, code);
      else {
        let error_2 = toError(error);
        logError(
          "telemetryMessage" in error_2 ? error_2 : withTelemetryMessage(error_2, `tool.call threw (${Xa})`),
        );
        logFeatureBad(errorContent, code);
      }
      let gd = tool.isMcp === true ? classifyMcpErrorSourceCategory(error) : undefined;
      logEvent("tengu_tool_use_error", {
        ...Ca,
        error: Xa,
        ...errorTelemetryFields(error),
        errorCode: Xa,
        ...(gd !== undefined && {
          mcpErrorSource: fromEnum(gd),
        }),
        ...diffMemoryUsage(Vs, Li),
        ...(tool.name === DESIGNSYNC && {
          dsMethod: fromEnumOpt(DESIGNSYNC_METHODS.find((prevState) => prevState === observableInput.method)),
        }),
        ...(tool.name === WEBSEARCH && !tool.isMcp && getWebSearchModeAnalytics(observableInput, input)),
        ...(toolUseContext.options.messageClientPlatform && {
          messageClientPlatform: entrypointForTelemetry(toolUseContext.options.messageClientPlatform),
        }),
      });
      if (!Qr && gd === "downstream_unreachable")
        logForDiagnosticsNoPII("warn", "mcp_tool_call_unreachable", () => ({
          transport: mcpServerType ?? "unknown",
          error_class: Xa.replace(":", "_"),
          error_code: sanitizeErrnoForTelemetry(error) ?? "missing",
          duration_ms: toolDurationMs,
        }));
      let errorMsg = getMcpToolScope(tool);
      logOTelEvent(
        "tool_result",
        {
          tool_name: sanitizeToolNameForAnalytics(tool.name),
          tool_use_id: toolUseID,
          success: "false",
          duration_ms: String(toolDurationMs),
          error_type: Xa,
          ...(isToolDetailsLoggingEnabled() && {
            error: ta,
          }),
          ...(Object.keys(toolInputDetailsForAnalytics).length > 0 && {
            tool_parameters: jsonStringify(toolInputDetailsForAnalytics),
          }),
          ...(Wi && {
            tool_input: Wi,
          }),
          tool_input_size_bytes: String(nt),
          ...(wa && {
            decision_source: wa.source,
            decision_type: wa.decision,
          }),
          ...(errorMsg && {
            mcp_server_scope: errorMsg,
          }),
          ...(requestId && {
            request_id: requestId,
          }),
        },
        toolUseContext.agentContext,
      );
    } else if (!Bs && !Qr) logEvent("tengu_tool_use_interrupted", Ca);
    let error_2 = toolErrorTextForAbort(error, toolUseContext.abortController.signal);
    let mcpMeta =
      error instanceof McpToolCallError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS ? error.mcpMeta : undefined;
    let ga = [];
    for await (let vs of runPostToolUseFailureHooks(
      toolUseContext,
      tool,
      toolUseID,
      messageId,
      observableInput,
      error_2,
      Qs || Bs,
      requestId,
      mcpServerType,
      mcpServerBaseUrl,
      toolDurationMs,
    ))
      ga.push(vs);
    if (Bs)
      return buildCancelledToolResult({
        phase: "call",
        tool,
        toolUseID,
        toolUseContext,
        assistantMessage,
        mcpServerType,
        mcpServerBaseUrl,
        mcpNameLoggable,
        requestId,
        now,
      });
    let interruptKind = getInterruptKind(error, toolUseContext.abortController.signal);
    let toolResultRemedy =
      interruptKind === undefined
        ? await getToolErrorCode(error, tool.name, toolUseContext.options.mcpClients)
        : undefined;
    let skip =
      getAbortKind(
        toolUseContext.abortController.signal,
        {
          name: tool.name,
          ran: true,
        },
        abortScopeOf(toolUseContext),
      ) !== null;
    let Ld = [];
    qt.push(
      {
        message: createUserMessage({
          content: [
            {
              type: "tool_result",
              content: error_2,
              is_error: true,
              tool_use_id: toolUseID,
            },
          ],
          ...cutResultForStorage(toolUseContext, tool, false, {
            toolUseId: toolUseID,
            toolUseResult: `Error: ${error_2}`,
            mcpMeta: formatMcpStructuredContent(toolUseContext.agentId, mcpMeta, tool),
          }),
          toolDenialKind: interruptKind,
          toolDenialEndsTurn:
            toolUseContext.abortController.signal.aborted &&
            unwrapAbortReason(toolUseContext.abortController.signal.reason) === "permission-stop"
              ? true
              : undefined,
          toolResultRemedy,
          sandboxViolations: error instanceof ShellError ? error.sandboxViolations : undefined,
          sandboxed: error instanceof ShellError ? error.sandboxed : undefined,
          sourceToolAssistantUUID: assistantMessage.uuid,
          now,
        }),
        toolDuration: {
          toolName: tool.name,
          durationMs: fi ?? toolDurationMs,
        },
      },
      ...Ld,
      ...ga,
    );
    if (fo && !Qs && !toolUseContext.abortController.signal.aborted)
      pushHookStoppedContinuation(qt, {
        toolName: tool.name,
        toolUseID,
        message: To || "Execution stopped by hook",
      });
    runAfterResultCommitted(error, skip, logError);
    return qt;
  } finally {
    if (jo !== undefined) releaseHeadReflogMark(jo);
    Di();
    if (wa) toolUseContext.toolDecisions.delete(toolUseID);
  }
}
//@ chunk-bk5ntezz.js:3179-3346 fingerprint = findMcpServerConnection (1)
/**
 * 规范化工具名用于记录：Task→Agent，MCP 工具缩成 mcp__<server>，非法字符换成 _，与保留词（instructions/person/claude/summary/other）冲突时加 _。
 */
function normalizeToolNameForTranscript(s) {
  if (s === TASK) return AGENT;
  let sliced = s.slice(0, MAX_USAGE_NAME_CHARS);
  let serverName = mcpInfoFromString(sliced)?.serverName;
  let replaced = (serverName === undefined ? sliced : `mcp__${serverName}`).replace(/[^\w.:-]/g, "_");
  return [INSTRUCTIONS, PERSON, CLAUDE, SUMMARY, OTHER].includes(replaced) ? `${replaced}_` : replaced;
}
export {
  takeCutResult,
  hasTypeField,
  waitForMcpToolServer,
  isCacheMissReason,
  shouldWaitForMcpTool,
  findLongestPrefixClients,
  aliasOrSelf,
  runToolUse,
  classifyToolError,
  getRequestTimingStore,
  getMcpServerBaseUrlFromToolName,
  clearCutResults,
  toolFeatureName,
  isAbortOrCancelError,
  classifyToolErrorCode,
  normalizeToolNameForTranscript,
  emitToolHeartbeat,
  getCancelMessage,
  restoreCallInput,
  runValidateInput,
  TOOL_CALL_SITE_RULES,
  explainUnavailableArtifactTool,
  resolveUnknownToolSafe,
  isPendingMcpToolName,
};
