/**
 * services/tools/toolExecution.ts
 *
 * 单次工具调用的生命周期：输入 JSON/schema 校验、validateInput、PreToolUse hooks、权限决策、tool.call、结果映射与持久化、PostToolUse hooks、遥测；runToolUse 入口（chunk-e6aww6q8#$B）在 _unattributed
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/services/tools/toolExecution.ts
 * pieces: chunk-5xgkngpb.js (130)
 * attribution: placement 101, fingerprint 7, layout 21, sole-consumer 1
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
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
  PERSISTED_OUTPUT_TAG as PERSISTED_OUTPUT_TAG_2,
  PERSISTED_OUTPUT_CLOSING_TAG,
  TRUNCATED_OUTPUT_TAG,
  TRUNCATED_OUTPUT_CLOSING_TAG,
  mapAndMaybePersistToolResult,
  getOriginalCwd as getOriginalCwd_2,
  isToolResultContentEmpty,
  exceedsPersistThreshold,
  getPersistenceThreshold,
  recordRetypedLikely,
  toolResultsDirFor_2,
  persistLargeToolResult,
} from "../../utils/toolResultStorage.js";
import {
  MAX_MCP_RESULT_CHARS,
  MAX_OUTPUT_CHARS_SMALL,
  TRUNCATE_MIDDLE_CHARS,
} from "../../constants/outputLimits.js";
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
import { codeModeAccepted, isAccepted } from "../../utils/codeMode/accepted.js";
import { withStoppedWaitContext, withoutStoppedWait, getAbortKind } from "./toolAbort.js";
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
  getDenialMessageSuffix,
  PERMISSION_DENIED_RETRY_TEXT,
  asSubagentFrameResult,
} from "../../utils/messages.js";
import { CHECKER_NO_ANSWER } from "../../plugins/functionHooks/hostBridge.js";
import { asStringList, UI_ENV_SITE_RULES } from "../../plugins/functionHooks/sites/siteRules.js";
import { logError } from "../../utils/log.js";
import { stringSchema } from "../../../vendor/zod/v4/classic/schemas.js";
import { env } from "../../utils/env.js";
import {
  callFrameCwd,
  getCwdOrNull,
  realPathOutcomeSync,
  callFramePhysicalMatches,
} from "../../utils/cwd.js";
import { runInRemoteCallFrame, WALKED } from "../../remote/remoteMode.js";
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
import { isPlainObject as isPlainObject_6 } from "../../utils/isPlainObject.js";
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
  getMcpPrefix as getMcpPrefix_4,
  getToolNameForPermissionCheck as getToolNameForPermissionCheck_4,
  mcpInfoFromString,
  resolveMcpConnectionForTool,
  buildMcpToolName,
} from "../mcp/mcpStringUtils.js";
import { REMOTE_DEVICES, CLAUDE_ARTIFACTS } from "../mcp/firstPartyServerIds.js";
import {
  IOS_SIMULATOR_DISPLAY_NAME,
  ANDROID_EMULATOR_DISPLAY_NAME,
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
  extractToolInputForTelemetry,
  isMedia as isMedia_2,
  getFileExtensionForAnalytics,
  getFileExtensionsFromBashCommand_2,
  extensionsInCommand,
  logToolFileActivity,
} from "../analytics/metadata.js";
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
import { MCP_RESOURCE_TOOL_NAMES } from "../../cli/print/turnLoop.js";
import { canonicalToolName, WORKSPACE_BASH_TOOL } from "../../utils/permissions/permissionRuleParser.js";
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
  ModeAtRequest,
} from "../../utils/permissions/toolPermissionContext.js";
import { getEffortLevelIfSupported } from "../../utils/effort.js";
import { getRuntimeMainLoopModel } from "../../utils/model/planModeModel.js";
import { doesMostRecentAssistantMessageExceed200k } from "../../utils/tokens.js";
import { hasRelaySource } from "../projectsRelay/relayConfig.js";
import { EDIT } from "../../tools/FileEditTool/constants.js";
import { roughTokenCountEstimationForContent } from "../tokenEstimation.js";
import { countWhere } from "../../utils/collections.js";
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
import { logEvent } from "../analytics/index.js";
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
import {
  isCodeModeEnabled,
  CODE_MODE_ONLY_TOOLS,
  willHideCodeModeOnlyTools,
} from "../../tools/RefreshMcpToolsTool/RefreshMcpToolsTool.js";
import { toolMatchesAnyName } from "./permissionCheckGuard.js";
import { REPL_TOOL_NAME } from "../../tools/REPLTool/constants.js";
import { POLL } from "../../tools/PollTool/prompt.js";
import {
  EXTERNAL_ALWAYS_AVAILABLE_TOOLS,
  COORDINATOR_MAIN_THREAD_TOOL_NAMES,
  EXTERNAL_ALWAYS_AVAILABLE_TOOLS_2,
} from "../../utils/toolPool.js";
import { BRIEF_TOOL_NAME as BRIEF_TOOL_NAME_2 } from "../../tools/BriefTool/prompt.js";
import { GET_TASK_TOOL_TEXT, GET_TASK_NOT_A_TOOL_TEXT } from "../../remote/tools/nativeToolErrors.js";
import { isCoordinatorMode_2 } from "../../coordinator/coordinatorMode.js";
import { AGENT } from "../../tools/AgentTool/constants.js";
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
import { STILL_LISTED_NOTE } from "../mcp/mcpToolRemovalReasons.js";
import { GLOB_TOOL_NAME } from "../../tools/GlobTool/prompt.js";
import { GREP_TOOL_NAME } from "../../tools/GrepTool/prompt.js";
import { CHROME_TOOL_NAMES } from "../../utils/claudeInChrome/common.js";
import { isPlainObject as isPlainObject_5 } from "../../utils/objectUtils.js";
import { appToolServerErrorSuffix } from "../mcp/appToolServerErrors.js";
import { WAITFORMCPSERVERS } from "../../tools/WaitForMcpServersTool/WaitForMcpServersTool.js";
import { CLAUDEAI_SERVER_PREFIX } from "../mcp/normalization.js";
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
import { openProfileWindow } from "../../utils/queryProfiler.js";
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
  isClassifierTargetToolUse,
  cloneIfServerResults,
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
import { hasModuleHookingSite } from "../../plugins/hooksModules/loadedModuleFilters.js";
import { guardAccountMemoryHookRewrite } from "../../utils/hooks/hookUpdatedInput.js";
import { eventCallersFor2 } from "../../plugins/functionHooks/eventCatalog.js";
import { releaseToolServerHold } from "../../plugins/functionHooks/pluginLifecycle.js";
import { notLoadedToolPolicy } from "../mcp/mcpGates.js";
import { isCompactBoundaryMessage as isCompactBoundaryMessage_3 } from "../projects/threadRows.js";
import { toolInputJsonSchema } from "../../plugins/functionHooks/types/builtinToolSchemas.js";
import { createCancelledToolResultBlock } from "../PromptSuggestion/speculation.js";
import { getPluginRegistry } from "../../utils/plugins/pluginLoadState.js";
import { hasLink } from "../../utils/hasLink.js";
import {
  hasOnlyOwnCallbacksToRun,
  getCloudDeferUnsupportedMessage,
  executePermissionDeniedHooks,
} from "../../utils/hooks.js";
import { registerAgent } from "../../utils/telemetry/perfettoTracing.js";
import { FILE_WRITE_TOOL_NAME } from "../../tools/FileWriteTool/prompt.js";
import { getClassifierEpoch, registerClassifiedRun } from "../../utils/conversationRecovery.js";
import { emptyInputRepairConfig } from "../analytics/juniperShoalConfig.js";
import { isEmptyObject, placeholderToolInput } from "../../utils/toolInputPlaceholder.js";
import { normalizeCaseForComparison_2 } from "../../utils/permissions/filesystem.js";
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
import { READ } from "../../tools/FileReadTool/constants.js";
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
import { DESIGNSYNC, DESIGNSYNC_METHODS } from "../../tools/DesignSyncTool/DesignSyncTool.js";
import { WEBSEARCH, getWebSearchModeAnalytics } from "../../tools/WebSearchTool/prompt.js";
import { commitAttributes } from "../../utils/telemetry/repositoryAttributes.js";
import { isFirstPartyUploadScope } from "../mcp/fileReference/fileReferencePolicy.js";
import {
  HOST_CONTEXT_LINE_LIMIT,
  isLiveHostContextDisabled,
} from "../../utils/permissions/classifierHostContext.js";
import { getAutoModeConfigOrDefault } from "../../utils/permissions/permissionSetup.js";
import { MESSAGE_MARK_SYMBOLS, BUILT_IN_TOOL_RUN_SYMBOL } from "../../utils/messageKinds.js";
import { isDocsConnectorTool, readFirstJsonPayload } from "../mcp/resultContent.js";
import { getCachedReadingLimit } from "../../tools/FileReadTool/limits.js";
import { abortScopeOf } from "../../utils/abortReasons.js";
import { classifyMcpErrorSourceCategory } from "../mcp/mcpResultErrors.js";
import { logForDiagnosticsNoPII } from "../../utils/diagLogs.js";
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-5xgkngpb.js:3861297-3861343 placement
/**
 * 把权限决策原因转成可安全展示的文本（经输出清洗器）。
 */
function sanitizedDecisionReasonDisplay(decision, tool, input, permissionMode) {
  return fromSanitizer_SANITIZER_OUTPUT_ONLY(
    decisionReasonDisplayString(decision, tool, input, permissionMode),
  );
}
//@ chunk-5xgkngpb.js:3879941-3879995 placement
/**
 * 定时任务类工具调用时复制一份结果，供后续修正插件归属。
 */
function cronToolCallResult(toolName, result) {
  return isCronToolName(toolName) && isPlainObjectValue(result)
    ? {
        ...result,
      }
    : undefined;
}
//@ chunk-5xgkngpb.js:3879995-3880155 placement
/**
 * 定时任务触发的工具调用：按对应会话定时任务（或当前调度插件）修正结果里的 plugin 归属。
 */
function attributeScheduledPlugin(name, toolResult, toolOutput) {
  if (!isCronToolName(name) || !isPlainObjectValue(toolOutput)) return toolOutput;
  let pluginName =
    getCronTaskPlugin(isPlainObjectValue(toolResult) ? toolResult : toolOutput) ?? getScheduledByPlugin();
  if (toolOutput.plugin === pluginName) return toolOutput;
  let { plugin, ...rest } = toolOutput;
  return pluginName === undefined
    ? rest
    : {
        ...rest,
        plugin: pluginName,
      };
}
//@ chunk-5xgkngpb.js:3880155-3880193 placement
/**
 * 工具名是 CronCreate 或 ScheduleWakeup。
 */
function isCronToolName(toolName) {
  return toolName === CRON_CREATE_TOOL_NAME || toolName === SCHEDULE_WAKEUP_TOOL_NAME;
}
//@ chunk-5xgkngpb.js:3880193-3880265 placement
function isPlainObjectValue(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
//@ chunk-5xgkngpb.js:3880265-3880414 placement
function getCronTaskPlugin(value) {
  if (!isPlainObjectValue(value)) return;
  return getSessionCronTasks().find((task) =>
    typeof value.id === "string"
      ? task.id === value.id
      : task.kind === "loop" && task.scheduledFor === value.scheduledFor,
  )?.plugin;
}
//@ chunk-5xgkngpb.js:3880414-3880645 placement
/**
 * MCP 结果被持久化或截断标签替换时，为副本保留原始结果的截断版本（钩子调用的除外）。
 */
function restoreMcpResultForCopy(tool, result, { content }, { hookCaller }) {
  return tool.isMcp === true &&
    hookCaller === undefined &&
    typeof content === "string" &&
    content !== result &&
    ((content.startsWith(PERSISTED_OUTPUT_TAG_2) && content.endsWith(PERSISTED_OUTPUT_CLOSING_TAG)) ||
      (content.startsWith(TRUNCATED_OUTPUT_TAG) && content.endsWith(TRUNCATED_OUTPUT_CLOSING_TAG)))
    ? truncateResultForCopy(
        result,
        content.startsWith(TRUNCATED_OUTPUT_TAG)
          ? Math.min(content.length, MAX_MCP_RESULT_CHARS)
          : MAX_MCP_RESULT_CHARS,
      )
    : result;
}
//@ chunk-5xgkngpb.js:3880645-3880656 placement
var MAX_KEPT_TEXT_BLOCK_CHARS = 32;
//@ chunk-5xgkngpb.js:3880656-3881149 placement
/**
 * 按字符预算截断结果中的文本块，超出部分用"[N more characters are not kept on this copy]"说明。
 */
function truncateResultForCopy(result, maxChars = MAX_MCP_RESULT_CHARS) {
  let blocks =
    typeof result === "string"
      ? [
          {
            type: "text",
            text: result,
          },
        ]
      : result;
  if (!Array.isArray(blocks)) return result;
  let remainingChars = maxChars + MAX_KEPT_TEXT_BLOCK_CHARS;
  let droppedChars = 0;
  let didTruncate = false;
  let kept = [];
  for (let block of blocks) {
    if (!isTextBlock(block)) {
      kept.push(block);
      continue;
    }
    let blockBudget = remainingChars - MAX_KEPT_TEXT_BLOCK_CHARS;
    if (block.text.length <= blockBudget) {
      remainingChars -= block.text.length + MAX_KEPT_TEXT_BLOCK_CHARS;
      kept.push(block);
      continue;
    }
    if (block.text === "") continue;
    let keptText = blockBudget > 0 ? truncateToLength(block.text, blockBudget) : "";
    droppedChars += block.text.length - keptText.length;
    remainingChars = 0;
    didTruncate = true;
    if (keptText !== "")
      kept.push({
        ...block,
        text: keptText,
      });
  }
  if (!didTruncate) return result;
  return [
    ...kept,
    {
      type: "text",
      text: `[${droppedChars} more character${droppedChars === 1 ? " is" : "s are"} not kept on this copy of the result]`,
    },
  ];
}
//@ chunk-5xgkngpb.js:3881149-3883630 placement
/**
 * 运行 tool.call 钩子链；对账户记忆服务器的调用，钩子的代答会被记录并警告。
 */
async function runToolCallHooks(
  hookResult,
  { runs, thrown, managedRan, undelivered },
  { tool, input, toolUseContext, assistantMessage, now },
) {
  let toolUseId = input.tool_use_id;
  forgetOpenCall(toolUseId);
  let hookRun = runs.of(hookResult.ref);
  let thrownError = thrown();
  if (
    thrownError !== undefined &&
    toolUseContext.abortController.signal.aborted &&
    isAbortError(thrownError.error)
  )
    throw thrownError.error;
  let isRunKept = hookRun !== undefined && isRunUnchanged(hookResult, hookRun.made);
  let isManagedDropped = shouldApplyManagedRewrite(tool, hookResult, isRunKept);
  if (isManagedDropped)
    logForDebugging(
      `tool.call ${tool.name} ${toolUseId}: a hooks module answered for the account memory server; its answer was dropped`,
      {
        level: "warn",
      },
    );
  let keptRun = isRunKept ? hookRun : isManagedDropped ? runs.last() : undefined;
  if (isManagedDropped && keptRun === undefined)
    return makeErrorResultAppender(toolUseId, dropBlockingErrors(undelivered()), {
      sourceToolAssistantUUID: assistantMessage.uuid,
      now,
    })(
      "A plugin hook answered a call to the account memory server in place of the server; the call is refused.",
      {
        toolDenialKind: "permission-rule",
      },
    );
  let toolUseContext_2 = codeModeAccepted()
    ? withStoppedWaitContext(toolUseContext, toolUseId)
    : toolUseContext;
  let keepResultForSubagents = managedRan() && shouldKeepToolResultInSubagents(toolUseContext, tool);
  if (keptRun && !keepResultForSubagents) return keptRun.made.messages;
  let needsManagedLink = shouldRunManagedLink(keepResultForSubagents, managedRan(), keptRun !== undefined);
  let undeliveredErrors = dropBlockingErrors(undelivered());
  let hookInput = runs.last()?.input ?? toolInputOf(input);
  if (!keptRun)
    logForDebugging(
      `tool.call ${tool.name} ${toolUseId}: resolved by a hooks module (` +
        (hookResult.deny === undefined ? "result" : `deny: ${hookResult.deny}`) +
        ")",
    );
  let messageOrigin = {
    sourceToolAssistantUUID: assistantMessage.uuid,
    now,
  };
  let errorResultAppender = makeErrorResultAppender(toolUseId, undeliveredErrors, messageOrigin);
  let denyAppender = (deny) =>
    errorResultAppender(deny, {
      toolDenialKind: "permission-rule",
    });
  let withheldResultAppender = (deny) =>
    errorResultAppender(
      `${tool.name} ran, and a plugin withheld its result: ${deny}`,
      {},
      hookErrorToolResult,
    ).map((message) => stripToolResultBlock(message, toolUseId));
  let plainErrorAppender = (message) => errorResultAppender(message, {});
  if (hookResult.deny !== undefined) {
    let lastRun = runs.last();
    let memoryHookResult =
      lastRun !== undefined && keepResultForSubagents
        ? await runPostToolUseHooksForMemory({
            tool,
            toolUseID: toolUseId,
            input: lastRun.input,
            output: lastRun.made.result,
            toolUseContext: toolUseContext_2,
            durationMs: toolDurationMsOf(lastRun.made, toolUseId),
          })
        : undefined;
    return [
      ...(runs.last((run) => run.made.messages.some((message) => ranWithoutError(message, toolUseId))) !==
      undefined
        ? withheldResultAppender(hookResult.deny)
        : denyAppender(hookResult.deny)),
      ...(memoryHookResult?.messages ?? []),
    ];
  }
  let output = keptRun ? keptRun.made.result : hookResult.result;
  let postHookResult = needsManagedLink
    ? await runPostToolUseHooksForMemory({
        tool,
        toolUseID: toolUseId,
        input: keptRun?.input ?? hookInput,
        output,
        toolUseContext: toolUseContext_2,
        durationMs: toolDurationMsOf((keptRun ?? runs.last())?.made, toolUseId),
      })
    : {
        output,
        rewritten: false,
        messages: [],
      };
  if (keptRun && !postHookResult.rewritten)
    return postHookResult.messages.length === 0
      ? keptRun.made.messages
      : [...keptRun.made.messages, ...postHookResult.messages];
  let outputCheck = tool.outputSchema?.safeParse(postHookResult.output);
  if (outputCheck && !outputCheck.success) {
    if (codeModeAccepted()) toolUseContext.stoppedResultWait?.(toolUseId)?.withdraw();
    return [
      ...plainErrorAppender(
        `${postHookResult.rewritten ? "a managed PostToolUse hook rewrote" : "tool.call step resolved"} ${tool.name} with a result that does not match its output shape: ` +
          outputCheck.error.message,
      ),
      ...(keptRun ? withoutToolResultBlock(keptRun.made.messages, toolUseId) : []),
      ...postHookResult.messages,
    ];
  }
  let scheduled = attributeScheduledPlugin(
    tool.name,
    runs.last()?.made.result,
    outputCheck?.data ?? postHookResult.output,
  );
  let finalOutput = scheduled;
  let keepForSubagents = shouldKeepToolResultInSubagents(toolUseContext, tool);
  let toolDuration = (keptRun ?? hookRun)?.made.messages.find(
    (message) => findToolResultBlock(message, toolUseId) !== undefined,
  )?.toolDuration;
  let resultBlock = await mapAndMaybePersistToolResult(
    tool,
    scheduled,
    toolUseId,
    getOriginalCwd_2(toolUseContext.session),
    toolUseContext.storageV5,
  );
  return [
    ...undeliveredErrors,
    {
      message: createUserMessage({
        ...replaceToolResult((keptRun ?? hookRun)?.made.messages ?? [], toolUseId, resultBlock),
        toolUseResult: keepForSubagents
          ? restoreMcpResultForCopy(tool, finalOutput, resultBlock, toolUseContext)
          : undefined,
        ...messageOrigin,
      }),
      toolDuration,
    },
    ...(keptRun ? withoutToolResultBlock(keptRun.made.messages, toolUseId) : []),
    ...postHookResult.messages,
  ];
}
//@ chunk-5xgkngpb.js:3883630-3883718 placement
/**
 * tool.call 钩子最近一次运行失败时返回拒绝结果。
 */
function denyOnStaleHookRun(hookResult, hookRun, toolUseId) {
  return forgetWithheldCall(toolUseId) && hookResult.deny === undefined && hookRun.runs.last() !== undefined
    ? {
        deny: CHECKER_NO_ANSWER,
      }
    : hookResult;
}
//@ chunk-5xgkngpb.js:3883718-3884794 placement
/**
 * 应用 tool.call 钩子的结果（阻止执行、改写结果）。
 */
async function applyToolCallHookResult(hookResult, toolCallChain, callInfo) {
  let filtered = toolCallChain.undelivered().filter((delivery) => delivery.preventContinuation === true);
  let stopReason = filtered.findLast((delivery) => delivery.stopReason)?.stopReason;
  let deny = toolCallChain.managedRan() ? undefined : hookResult.deny;
  let staleCheckedResult = denyOnStaleHookRun(hookResult, toolCallChain, callInfo.input.tool_use_id);
  let messages = await runToolCallHooks(staleCheckedResult, toolCallChain, callInfo);
  if (toolCallChain.toolEntered())
    for (let entry of messages) {
      let { message } = entry;
      if (
        message.type === "user" &&
        message.toolDenialKind === "permission-rule" &&
        findToolResultBlock(entry, callInfo.input.tool_use_id) !== undefined
      )
        message.toolDenialAfterRun = true;
    }
  let stoppedMessage =
    callInfo.toolUseContext.abortController.signal.aborted || messages.some(isHookStoppedMessage)
      ? undefined
      : filtered.length > 0
        ? buildHookStoppedMessage(
            stopReason || deny || "Execution stopped by hook",
            callInfo.tool.name,
            callInfo.input.tool_use_id,
          )
        : toolCallChain.runs
            .last((run) => run.made.messages.some(isHookStoppedMessage))
            ?.made.messages.find(isHookStoppedMessage);
  let allMessages = stoppedMessage === undefined ? messages : [...messages, stoppedMessage];
  let contextList =
    staleCheckedResult.deny === undefined ? asStringList(staleCheckedResult.context) : undefined;
  return contextList === undefined ||
    contextList.length === 0 ||
    !shouldRunManagedToolHooks(
      callInfo.tool,
      callInfo.toolUseContext.options.bareFork,
      callInfo.toolUseContext.options.settingsHooksOff,
    )
    ? allMessages
    : toolCallChain.managedRan()
      ? [
          ...allMessages,
          ...(await runToolCallPostHooks(
            contextList,
            {
              tool: callInfo.tool,
              toolUseID: callInfo.input.tool_use_id,
              input: findRunInputForResult(staleCheckedResult, toolCallChain, callInfo.input),
              toolUseContext: codeModeAccepted()
                ? withStoppedWaitContext(callInfo.toolUseContext, callInfo.input.tool_use_id)
                : callInfo.toolUseContext,
            },
            allMessages,
          )),
        ]
      : [
          ...allMessages,
          buildToolCallContextMessage(
            await capAdditionalContext(contextList, "tool.call", callInfo.toolUseContext.storageV5),
            callInfo.input.tool_use_id,
          ),
        ];
}
//@ chunk-5xgkngpb.js:3884794-3884818 placement
var TOOL_CALL_SITE_RULES; // deferred: uses UI_ENV_SITE_RULES (../../plugins/functionHooks/sites/siteRules.js) of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-5xgkngpb.js:3884794", () => {
  TOOL_CALL_SITE_RULES = UI_ENV_SITE_RULES["tool.call"];
});
//@ chunk-5xgkngpb.js:3884862-3885223 placement
/**
 * 安全采样 process.memoryUsage()：无磁盘会话跳过；失败时记日志，非常见文件系统错误只上报一次。
 */
class MemoryUsageSampler {
  #e;
  #t = false;
  constructor(stallSampler) {
    this.#e = stallSampler;
  }
  sample(reason) {
    if (isDiskless()) return;
    try {
      return this.#e();
    } catch (error) {
      let errno = isSyscallError(error) ? error.errno : "none";
      logForDebugging(
        `[tool-memory] process.memoryUsage() failed (${reason}, errno=${errno}); a memory measurement for this tool call is skipped`,
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
//@ chunk-5xgkngpb.js:3885223-3885390 placement
function diffMemoryUsage(before, after) {
  if (before === undefined || after === undefined) return;
  return {
    rssDeltaBytes: after.rss - before.rss,
    heapUsedDeltaBytes: after.heapUsed - before.heapUsed,
    externalDeltaBytes: after.external - before.external,
  };
}
//@ chunk-5xgkngpb.js:3885440-3885486 placement
/**
 * 工具调用耗时的类别顺序（审批、模型、自身、外部）。
 */
var TIMING_CATEGORIES = ["approval", "model", "own", "external"];
//@ chunk-5xgkngpb.js:3885486-3886310 placement
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
  mark(category) {
    if (this.#s) return () => {};
    let nowMs = this.#a();
    if (category !== "own") this.#i ??= nowMs;
    this.#n[category]++;
    let isSettled = false;
    return () => {
      if (isSettled || this.#s) return;
      isSettled = true;
      this.#a();
      this.#n[category]--;
    };
  }
  settle() {
    if (!this.#s) {
      this.#a();
      this.#s = true;
    }
  }
  fields(totalMs, { declaredNoOutsideWork }) {
    if (this.#i === undefined && !declaredNoOutsideWork) return {};
    let max = Math.max(0, totalMs);
    let takeMs = (availableMs) => {
      let min = Math.min(Math.max(0, availableMs), max);
      max -= min;
      return min;
    };
    let approvalWaitMs = takeMs(this.#o.approval);
    let modelCallMs = takeMs(this.#o.model);
    let externalWallMs = takeMs(this.#o.external);
    let preExternalMs = takeMs((this.#i ?? this.#e) - this.#e);
    return {
      externalWallMs,
      ...(approvalWaitMs > 0 && {
        approvalWaitMs,
      }),
      ...(modelCallMs > 0 && {
        modelCallMs,
      }),
      ...(preExternalMs > 0 && {
        preExternalMs,
      }),
    };
  }
  #a() {
    let nowMs = this.#t();
    let found = TIMING_CATEGORIES.find((category) => this.#n[category] > 0);
    if (found !== undefined) this.#o[found] += Math.max(0, nowMs - this.#r);
    this.#r = nowMs;
    return nowMs;
  }
}
//@ chunk-5xgkngpb.js:3886310-3886326 placement
/**
 * 按调用保存计时上下文的 AsyncLocalStorage。
 */
var timingContext; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-5xgkngpb.js:3886310", () => {
  timingContext = new AsyncLocalStorage();
});
//@ chunk-5xgkngpb.js:3886326-3886364 placement
/**
 * 在给定计时上下文里执行函数。
 */
function runWithTimingContext(timing, fn) {
  return timingContext.run(timing, fn);
}
//@ chunk-5xgkngpb.js:3886364-3886401 placement
/**
 * 当前请求的计时器存储（ALS）。
 */
function getRequestTimingStore() {
  return timingContext.getStore();
}
//@ chunk-5xgkngpb.js:3886401-3886648 placement
var CALL_DIRECTORY_CHANGED_MESSAGE =
  "The working directory no longer leads where it did when this call was permission-checked (it was deleted, a part of its path was replaced, or it can't be examined), so the call was not run. Make the call again to have it checked afresh.";
//@ chunk-5xgkngpb.js:3886648-3886748 placement
function runInHeldDirectory(cwd, fn) {
  return callFrameCwd() !== undefined || (cwd !== undefined && cwd === getCwdOrNull())
    ? runInRemoteCallFrame(fn, {
        recoversIfAlreadyGone: true,
      })
    : fn();
}
//@ chunk-5xgkngpb.js:3886748-3887598 placement
/**
 * 检查工作目录在权限检查后是否仍指向同一位置；变化时记日志与 call_directory_hold 事件并拒绝调用。
 */
function isCallDirectoryUnchanged() {
  let heldCwd = callFrameCwd();
  if (heldCwd === undefined) return true;
  let realPath = realPathOutcomeSync(heldCwd);
  let reasonText = typeof realPath === "string" && realPath.startsWith(WALKED);
  if (callFramePhysicalMatches(realPath)) {
    if (realPath === undefined)
      logForDebugging(
        `Working directory "${heldCwd}" may not be examined, now or at the call's permission check, so it isn't compared`,
      );
    else if (reasonText)
      logForDebugging(
        `Working directory "${heldCwd}" is on a volume that the native lookup fails on, now and at the call's permission check, so it is compared by its device and file index and a walk of its links`,
      );
    return true;
  }
  logForDebugging(
    reasonText
      ? `Call refused: for working directory "${heldCwd}" the native lookup fails now, and the walk of its links answers ${realPath}, not what the call's permission check was given`
      : `Call refused: working directory "${heldCwd}" now leads to ${typeof realPath === "string" ? `"${realPath}"` : "nowhere that can be examined"}, elsewhere than at the call's permission check`,
    {
      level: "warn",
    },
  );
  logFeatureSad("call_directory_hold", "changed_before_call");
  return false;
}
//@ chunk-5xgkngpb.js:3887598-3887765 placement
/**
 * 根据中止原因选择工具取消消息：同批被拒、交付中断（特性开关）或普通取消。
 */
function getCancelMessage(signal) {
  let reasonKind = unwrapAbortReason(signal.reason);
  if (reasonKind === "permission-stop") return TOOL_CALL_SKIPPED_BY_SIBLING_DENIAL;
  if (
    reasonKind === "interrupt" &&
    (env.CLAUDE_CODE_FIZZY_GROVE ?? getFeatureValue_CACHED_MAY_BE_STALE("tengu_fizzy_grove", false))
  )
    return TOOL_CALL_SKIPPED_FOR_DELIVERY;
  return CANCEL_MESSAGE;
}
//@ chunk-5xgkngpb.js:3887765-3888087 fingerprint (2.1.88 match: classifyToolError, 0.849)
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
//@ chunk-5xgkngpb.js:3888087-3889217 layout
/**
 * 输入校验失败时，若未知键或枚举值"在本对话早先的工具 schema 里出现过"（内联或延迟 schema），生成"…was offered earlier in this conversation but is not available in this session"提示。
 */
function buildUnavailableOptionNote(name, schema, schemaInput, error, messages) {
  try {
    if (!isPlainObject_6(schemaInput)) return null;
    let offeredKeys = new Set();
    let offeredValues = [];
    for (let issue of error.issues)
      if (issue.code === "unrecognized_keys" && issue.path.length === 0) {
        for (let key of issue.keys) if (Object.hasOwn(schema, key)) offeredKeys.add(key);
      } else if (issue.code === "invalid_value" && issue.path.length === 1) {
        let parameter = issue.path[0];
        if (
          typeof parameter === "string" &&
          Object.hasOwn(schema, parameter) &&
          Object.is(schema[parameter], schemaInput[parameter])
        )
          offeredValues.push({
            parameter,
            value: schemaInput[parameter],
          });
      }
    if (offeredKeys.size === 0 && offeredValues.length === 0) return null;
    let toolEntry = latestPromptSnapshot(messages)?.toolEntries.get(name);
    let inputSchema = toolEntry?.input_schema;
    let source = "inline";
    if (toolEntry === undefined) {
      let deferredEntry = recordedDeferredTools(messages).entries.get(name);
      if (deferredEntry === undefined || !("input_schema" in deferredEntry)) return null;
      inputSchema = deferredEntry.input_schema;
      source = "deferred";
    }
    let properties = schemaPropertiesMap(inputSchema);
    let listed = [];
    for (let { parameter, value } of offeredValues)
      if (schemaEnumValues(properties.get(parameter))?.includes(value))
        listed.push(`\`${parameter}: ${jsonStringify(value)}\``);
    let kind = listed.length > 0 ? "enum_value" : "unknown_key";
    for (let key of offeredKeys) if (properties.has(key)) listed.push(`\`${key}\``);
    if (listed.length === 0) return null;
    let isSingle = listed.length === 1;
    return {
      text: `${isSingle ? listed[0] : `${listed.slice(0, -1).join(", ")} and ${listed.at(-1)}`} ${isSingle ? "was" : "were"} offered earlier in this conversation but ${isSingle ? "is" : "are"} not available in this session; continue without ${isSingle ? "it" : "them"}.`,
      kind,
      source,
    };
  } catch (error) {
    logError(error);
    return null;
  }
}
//@ chunk-5xgkngpb.js:3889217-3889422 fingerprint (2.1.88 match: ruleSourceToOTelSource, 1)
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
//@ chunk-5xgkngpb.js:3889422-3889963 fingerprint (2.1.88 match: decisionReasonToOTelSource, 0.965)
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
//@ chunk-5xgkngpb.js:3889963-3890216 layout
/**
 * 权限结果转 OTel tool_decision：allow→accept，deny→reject，ask（未决）→reject（中断时来源 user_abort）。
 */
function getToolDecisionForOTel(decision, aborted) {
  switch (decision.behavior) {
    case "allow":
      return {
        decision: "accept",
        source: decisionReasonToOTelSource(decision.decisionReason, "allow"),
      };
    case "deny":
      return {
        decision: "reject",
        source: decisionReasonToOTelSource(decision.decisionReason, "deny"),
      };
    case "ask":
      return {
        decision: "reject",
        source: aborted ? "user_abort" : "config",
      };
  }
}
//@ chunk-5xgkngpb.js:3890216-3891044 layout
/**
 * 组装权限决策记录（decision、source、reasonType、ruleSource、grantScope、reasonCode、circuitBreaker、classifierCategory），供权限遥测与审计。
 */
function buildPermissionDecisionRecord(decision, source, outcomeInfo) {
  let decisionReason = outcomeInfo?.outcome.decisionReason;
  let isPrompted =
    outcomeInfo?.outcome.behavior === "ask" ||
    outcomeInfo?.recorded?.source.startsWith("user_") === true ||
    source === "user_abort" ||
    decisionReason?.type === "permissionPromptTool";
  let shownOutcome =
    outcomeInfo === undefined ? undefined : resolveShownPermissionOutcome(outcomeInfo, isPrompted);
  let ruleSource =
    outcomeInfo === undefined
      ? undefined
      : (getDecisionRuleSource(decisionReason, outcomeInfo.outcome.behavior) ??
        getMatchedAskRule(outcomeInfo.outcome)?.source ??
        (shownOutcome &&
          (getDecisionRuleSource(shownOutcome.reason, shownOutcome.behavior) ??
            shownOutcome.matchedAskRule?.source)));
  let grantScope =
    decision !== "accept"
      ? undefined
      : (outcomeInfo?.recorded?.grantScope ??
        (outcomeInfo?.outcome.behavior === "allow" ? outcomeInfo.outcome.grantScope : undefined));
  let circuitBreaker = shownOutcome && findCircuitBreaker(shownOutcome.reason, shownOutcome.behavior);
  let classifierCategory =
    shownOutcome?.reason?.type === "classifier"
      ? sanitizeRuleCategory(shownOutcome.reason.category)
      : undefined;
  let empty = undefined;
  return {
    decision,
    source,
    ...(decisionReason !== undefined &&
      !isPrompted && {
        reasonType: decisionReason.type,
      }),
    ...(ruleSource !== undefined && {
      ruleSource,
    }),
    ...(grantScope !== undefined && {
      grantScope,
    }),
    ...(shownOutcome !== undefined && {
      reasonCode: sanitizedDecisionReasonDisplay(
        shownOutcome.behavior,
        undefined,
        shownOutcome.reason,
        shownOutcome.matchedAskRule,
      ),
    }),
    ...(circuitBreaker !== undefined && {
      circuitBreaker,
    }),
    ...(classifierCategory !== undefined && {
      classifierCategory,
    }),
    ...false,
  };
}
//@ chunk-5xgkngpb.js:3891044-3891709 layout
function resolveShownPermissionOutcome(decisionInfo, isPrompted) {
  let { outcome, shown } = decisionInfo;
  let isEvaluationReason =
    outcome.behavior !== "allow" &&
    (outcome.decisionReason?.type === "hook" || outcome.decisionReason?.type === "classifier");
  if (shown?.behavior === "ask" && !isEvaluationReason)
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
  if (isPrompted && outcome.decisionReason?.type !== "permissionPromptTool")
    return {
      behavior: "ask",
      reason: outcome.decisionReason,
      matchedAskRule: getMatchedAskRule(outcome),
    };
  return;
}
//@ chunk-5xgkngpb.js:3891709-3891776 layout
function getMatchedAskRule(outcome) {
  return "matchedAskRule" in outcome ? outcome.matchedAskRule : undefined;
}
//@ chunk-5xgkngpb.js:3891776-3892040 placement
function findCircuitBreaker(reason, behavior) {
  if (reason?.type === "safetyCheck") {
    let circuitBreaker = reason.circuitBreaker;
    return circuitBreaker !== undefined && Object.hasOwn(CIRCUIT_BREAKER_TRAITS, circuitBreaker)
      ? circuitBreaker
      : undefined;
  }
  if (reason?.type === "subcommandResults") {
    for (let reason_2 of reason.reasons.values())
      if (reason_2.behavior === behavior) {
        let circuitBreaker = findCircuitBreaker(reason_2.decisionReason, behavior);
        if (circuitBreaker !== undefined) return circuitBreaker;
      }
  }
  return;
}
//@ chunk-5xgkngpb.js:3892040-3892200 placement
function buildDeniedDecisionRecord(decisionResult, recorded, pipelineRecorded, pipeline) {
  return buildPermissionDecisionRecord(
    decisionResult.behavior === "allow" ? recorded?.decision || pipelineRecorded.decision : "reject",
    recorded?.source || pipelineRecorded.source,
    {
      outcome: decisionResult,
      recorded,
      shown: pipeline?.answered ?? pipeline?.result,
    },
  );
}
//@ chunk-5xgkngpb.js:3892200-3892351 placement
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
//@ chunk-5xgkngpb.js:3892351-3892455 placement
function getDecisionRuleSource(reason, behavior) {
  if (reason?.type === "rule") return reason.rule.source;
  return findDecidingRule(reason, behavior === "deny" ? "deny" : "ask")?.source;
}
//@ chunk-5xgkngpb.js:3892455-3892686 placement
function shouldAddBashAudienceNote(name, toolOutput, mainLoopModel) {
  if (
    name !== BASH_TOOL_NAME ||
    typeof toolOutput !== "object" ||
    toolOutput === null ||
    !("stdout" in toolOutput) ||
    typeof toolOutput.stdout !== "string" ||
    getIsNonInteractiveSession() ||
    !exceedsLineLimit(toolOutput.stdout)
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
//@ chunk-5xgkngpb.js:3892686-3892826 placement
var REMOTE_DEVICES_PREFIX; // deferred: uses getMcpPrefix (../mcp/mcpStringUtils.js) of its import cycle while loading; runs once the cycle is complete
var BROWSER_TOOL_PREFIXES;
var flattened_2;
deferInit("chunk-5xgkngpb.js:3892686", () => {
  REMOTE_DEVICES_PREFIX = getMcpPrefix_4(REMOTE_DEVICES);
  BROWSER_TOOL_PREFIXES = [`${REMOTE_DEVICES_PREFIX}Claude_Preview__`, "mcp__claude-for-chrome__"];
  flattened_2 = [IOS_SIMULATOR_DISPLAY_NAME, ANDROID_EMULATOR_DISPLAY_NAME].flatMap((displayName) => {
    let mcpPrefix = getMcpPrefix_4(displayName);
    return [mcpPrefix, REMOTE_DEVICES_PREFIX + mcpPrefix.slice(5)];
  });
});
//@ chunk-5xgkngpb.js:3892826-3893080 placement
function getDeviceToolKind(tool) {
  if (tool.isMcp !== true) return;
  let toolName = getToolNameForPermissionCheck_4(tool);
  if (isChromeToolName(toolName) || BROWSER_TOOL_PREFIXES.some((prefix) => toolName.startsWith(prefix)))
    return "browser";
  if (
    isClassifiableBrowserCall(toolName) &&
    !(
      toolName.startsWith(REMOTE_DEVICES_PREFIX) &&
      toolName.slice(REMOTE_DEVICES_PREFIX.length).includes("__")
    )
  )
    return "computer_use";
  return flattened_2.some((prefix) => toolName.startsWith(prefix)) ? "simulator" : undefined;
}
//@ chunk-5xgkngpb.js:3893080-3893106 placement
var TOOL_NOT_LOADED = "TOOL_NOT_LOADED";
//@ chunk-5xgkngpb.js:3893106-3893471 placement
/**
 * 工具未加载就被调用时的 InputValidationError 文本，提示先用 ToolSearch 一次性加载所需工具再调用。
 */
function buildNotLoadedToolError(name) {
  return `InputValidationError: ${name} did not run: it was not loaded when it was called. Unless ${TOOL_SEARCH_TOOL_NAME} has loaded it since, load it together with the other tools you expect to need, in one ${TOOL_SEARCH_TOOL_NAME} call (for example, query "select:${name}", with the other names after it, comma-separated). Call it again once that result has come back, not in the same reply.`;
}
//@ chunk-5xgkngpb.js:3893471-3893545 placement
var SANITIZER_SHAPE_REGEX = /^[A-Za-z][A-Za-z0-9_]{0,63}(?:[,+][A-Za-z][A-Za-z0-9_]{0,63})*$/;
//@ chunk-5xgkngpb.js:3893545-3893605 placement
/**
 * 校验遥测里的形状字段，非法时记为 nonconforming。
 */
function sanitizeShapeClass(shapeClass) {
  return SANITIZER_SHAPE_REGEX.test(shapeClass)
    ? fromSanitizer_SANITIZER_OUTPUT_ONLY(shapeClass)
    : lit_2("nonconforming");
}
//@ chunk-5xgkngpb.js:3893643-3893898 placement
var MAX_RESULT_FIELDS; // deferred: uses SessionRootSlot (../../bootstrap/sessionSlices.js) of its import cycle while loading; runs once the cycle is complete
var MAX_PENDING_CUTS;
var MAX_PENDING_CUT_CHARS;
var MAX_WALK_NODES;
var MAX_WALK_NODES_DEDUPED;
var HOOK_RESULT_FIELDS_CUT_NOTICE;
var pendingResultCuts;
deferInit("chunk-5xgkngpb.js:3893643", () => {
  MAX_RESULT_FIELDS = 256;
  MAX_PENDING_CUTS = 64;
  MAX_PENDING_CUT_CHARS = 33554432;
  MAX_WALK_NODES = 1048576;
  MAX_WALK_NODES_DEDUPED = 65536;
  HOOK_RESULT_FIELDS_CUT_NOTICE =
    "[Parts of this tool result were left out: a hook replaced the tool's output with one that has too many fields, and only its text, inline images and inline PDFs are kept.]";
  pendingResultCuts = new SessionRootSlot(() => new Map());
});
//@ chunk-5xgkngpb.js:3893898-3893932 placement
/**
 * 判断工具是否属于项目中继读取工具集。
 */
function isHearthReadTool(name) {
  return HEARTH_READ_TOOLS.has(name);
}
//@ chunk-5xgkngpb.js:3893932-3894310 placement
/**
 * 有 MCP 入站门时，字段过多的 MCP 结果只保留简化形式，完整结果按 uuid 暂存待取回；子代理或无法序列化时只做截断并记事件。
 */
function cutLargeMcpResult(result) {
  if (!hasMcpInboundDoor()) return result;
  let { toolUseId, toolUseResult, mcpMeta } = result;
  let minimalMcpResult = buildMinimalMcpResult(toolUseResult, mcpMeta, result.keepsMcpMeta);
  if (!needsResultCut(minimalMcpResult, result)) return result;
  if (result.inSubagent) {
    logFeatureSad("mcp_large_result_cut", "in_subagent");
    return minimalMcpResult;
  }
  let json;
  try {
    json = jsonStringify(
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
      whole: new RawJson(json),
      chars: json.length,
      feature: "mcp_large_result_cut",
    }),
  };
}
//@ chunk-5xgkngpb.js:3894310-3894708 placement
/**
 * 编辑工具结果的 originalFile 过长时置空并暂存完整结果（子代理中只置空）。
 */
function cutEditOriginalFile({ toolUseId, toolUseResult, mcpMeta, inSubagent }) {
  if (
    !hasMcpInboundDoor() ||
    !isPlainObject_6(toolUseResult) ||
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
//@ chunk-5xgkngpb.js:3894708-3894947 placement
/**
 * 按 toolUseId 暂存被截掉的完整结果，超过条数或字符上限时淘汰最早的（记 dropped_waiting），返回新 uuid。
 */
function stashCutResult(toolUseId, cut) {
  let uuid = randomUUID();
  let cuts = pendingResultCuts.of(getRootSession());
  cuts.delete(toolUseId);
  cuts.set(toolUseId, {
    ...cut,
    uuid,
  });
  let totalChars = 0;
  for (let entry of cuts.values()) totalChars += entry.chars;
  for (let [key, entry] of cuts) {
    if (key === toolUseId || (cuts.size <= MAX_PENDING_CUTS && totalChars <= MAX_PENDING_CUT_CHARS)) break;
    cuts.delete(key);
    totalChars -= entry.chars;
    logFeatureSad(entry.feature, "dropped_waiting");
  }
  return uuid;
}
//@ chunk-5xgkngpb.js:3894947-3895086 placement
function cutOversizedResultBlocks(content) {
  let simplified = hasMcpInboundDoor() ? simplifyResultBlocks(content) : undefined;
  if (simplified === undefined) return content;
  logFeatureSad("mcp_result_block_cut", typeof simplified === "string" ? "not_a_list" : "list");
  return simplified;
}
//@ chunk-5xgkngpb.js:3895086-3895357 placement
/**
 * 结果字段过多时把内容块简化为只保留文本、工具引用、内联图片与 PDF，丢弃部分处加一条说明；不需要时返回 undefined。
 */
function simplifyResultBlocks(content, dedupe = false) {
  let allowToolReference = Array.isArray(content) && content.every(isToolReferenceWithName);
  let simplified = Array.isArray(content)
    ? content.map((block) => simplifyResultBlock(block, allowToolReference))
    : undefined;
  let budget = MAX_RESULT_FIELDS + countResultFields(simplified, 1 / 0, dedupe);
  if (budget !== 1 / 0 && countResultFields(content, budget, dedupe) <= budget) return;
  if (simplified === undefined) return stringifyToolResult(content);
  let index = simplified.indexOf(undefined);
  return simplified.flatMap(
    (block, blockIndex) =>
      block ??
      (blockIndex === index
        ? {
            type: "text",
            text: HOOK_RESULT_FIELDS_CUT_NOTICE,
          }
        : []),
  );
}
//@ chunk-5xgkngpb.js:3895357-3896007 placement
/**
 * 把单个内容块简化为文本、工具引用、支持的 base64 图片或 PDF 文档，其他返回 undefined。
 */
function simplifyResultBlock(block, allowToolReference) {
  let raw = isPlainObject_6(block) ? block : {};
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
  let base64Source = isPlainObject_6(source) && source.type === "base64" ? source : {};
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
//@ chunk-5xgkngpb.js:3896007-3896134 placement (2.1.88 match: _temp4, 0.615)
function needsResultCut(minimalMcpResult, original, dedupe = false) {
  let budget =
    MAX_RESULT_FIELDS +
    countResultFields([minimalMcpResult.toolUseResult, minimalMcpResult.mcpMeta], 1 / 0, dedupe);
  return (
    budget === 1 / 0 || countResultFields([original.toolUseResult, original.mcpMeta], budget, dedupe) > budget
  );
}
//@ chunk-5xgkngpb.js:3896134-3896437 placement
/**
 * 迭代统计结果对象的字段数（超过上限提前返回上限+1），可对重复键形状的对象去重计数。
 */
function countResultFields(root, limit, dedupe = false) {
  let fieldCount = 0;
  let nodeCount = 0;
  let seenShapes = new Set();
  let stack = [root];
  while (stack.length > 0) {
    let node = stack.pop();
    if (typeof node !== "object" || node === null) continue;
    if (++nodeCount > (dedupe ? MAX_WALK_NODES_DEDUPED : MAX_WALK_NODES)) return limit + 1;
    if (Array.isArray(node)) {
      for (let item of node) stack.push(item);
      continue;
    }
    let isRepeated = dedupe && isRepeatedKeyShape(node, seenShapes);
    for (let value of Object.values(node)) {
      if (!isRepeated && ++fieldCount > limit) return limit + 1;
      stack.push(value);
    }
  }
  return fieldCount;
}
//@ chunk-5xgkngpb.js:3896437-3896590 placement
function isRepeatedKeyShape(value, seenShapes) {
  let keys = Object.keys(value);
  let isNumericKey = String(Number(keys[0]) >>> 0) === keys[0];
  if (keys.length > MAX_JSON_NESTING || isNumericKey) return false;
  let shapeKey = jsonStringifyRaw(keys);
  if (seenShapes.has(shapeKey)) return true;
  seenShapes.add(shapeKey);
  return false;
}
//@ chunk-5xgkngpb.js:3896590-3896938 placement
/**
 * 构造精简的 MCP 结果：内容块只留基本字段，mcpMeta 只保留结束轮次标记、限定大小的插件元数据、来源中继、结构化内容省略标记与资源链接。
 */
function buildMinimalMcpResult(toolUseResult, mcpMeta, keepsMcpMeta = false) {
  if (keepsMcpMeta)
    return {
      ...buildMinimalMcpResult(toolUseResult, undefined),
      mcpMeta,
    };
  return {
    toolUseResult: Array.isArray(toolUseResult)
      ? toolUseResult.map(minimalContentBlock)
      : isPlainObject_6(toolUseResult)
        ? {}
        : toolUseResult,
    mcpMeta: mcpMeta && {
      ...(isPlainObject_6(mcpMeta._meta) && pickMcpMetaFields(mcpMeta._meta)),
      ...((mcpMeta.structuredContent !== undefined || mcpMeta.structuredContentOmitted === true) && {
        structuredContentOmitted: true,
      }),
      ...(Array.isArray(mcpMeta.resourceLinks) && {
        resourceLinks: mcpMeta.resourceLinks.filter(isPlainObject_6).map(minimalResourceLink),
      }),
    },
  };
}
//@ chunk-5xgkngpb.js:3896938-3897288 placement
/**
 * 从 MCP _meta 中挑出要保留的键：结束轮次标记，以及开关开启时大小受限的插件元数据（超限的记录到 plugin_meta_cut）。
 */
function pickMcpMetaFields(meta) {
  let kept = {};
  if (meta[CLAUDE_ENDTURN] === true) {
    kept[CLAUDE_ENDTURN] = true;
    if (meta[CLAUDE_ENDTURNHONORSSTOPHOOKS] === true) kept[CLAUDE_ENDTURNHONORSSTOPHOOKS] = true;
  }
  if (isSnappyPlumOn()) {
    let droppedKinds = [];
    for (let kind of EDIT_SOURCE_KINDS) {
      let value = meta[kind];
      if (!Object.hasOwn(meta, kind) || value === undefined) continue;
      if (
        typeof value === "string"
          ? value.length <= MAX_REQUEST_META_BYTES
          : countResultFields(value, MAX_RESULT_FIELDS) <= MAX_RESULT_FIELDS
      )
        kept[kind] = value;
      else droppedKinds.push(kind);
    }
    if (typeof meta[COM_ANTHROPIC_SOURCES_RELAY] === "string")
      kept[COM_ANTHROPIC_SOURCES_RELAY] = meta[COM_ANTHROPIC_SOURCES_RELAY];
    if (droppedKinds.length > 0) kept[COM_ANTHROPIC_PLUGIN_META_CUT] = droppedKinds;
  }
  return Object.keys(kept).length === 0
    ? {}
    : {
        _meta: kept,
      };
}
//@ chunk-5xgkngpb.js:3897288-3897710 placement
/**
 * 把内容块精简为 type、text、source（type/media_type/data）、title、context。
 */
function minimalContentBlock(block) {
  if (Array.isArray(block)) return [];
  if (!isPlainObject_6(block)) return block;
  let { type, text, source, title, context } = block;
  return {
    ...(typeof type === "string" && {
      type,
    }),
    ...(typeof text === "string" && {
      text,
    }),
    ...(isPlainObject_6(source) && {
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
//@ chunk-5xgkngpb.js:3897710-3897997 placement
function minimalResourceLink(link) {
  let { uri, name, title, description, mimeType, size } = link;
  return {
    uri: typeof uri === "string" ? uri : "",
    name: typeof name === "string" ? name : "",
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
//@ chunk-5xgkngpb.js:3897997-3898160 placement
/**
 * 按 toolUseId 取回暂存的完整结果，uuid 不符时丢弃并记事件。
 */
function takeCutResult(toolUseId, uuid) {
  let cuts = pendingResultCuts.peek(getRootSession());
  let cut = cuts?.get(toolUseId);
  if (cut === undefined) return;
  cuts?.delete(toolUseId);
  if (cut.uuid !== uuid) {
    logFeatureSad(cut.feature, "other_message");
    return;
  }
  logFeatureOk(cut.feature);
  return cut.whole;
}
//@ chunk-5xgkngpb.js:3898160-3898261 placement
/**
 * 轮次结束时，对仍未完成的切出结果逐个上报 turn_ended 并清空。
 */
function clearCutResults() {
  let cuts = pendingResultCuts.peek(getRootSession());
  for (let cut of cuts?.values() ?? []) logFeatureSad(cut.feature, "turn_ended");
  cuts?.clear();
}
//@ chunk-5xgkngpb.js:3898261-3898346 placement
/**
 * 设备类 MCP 工具名的前缀常量与后缀规则。
 */
var CLAUDE_DEVICE_MCP_PREFIX; // deferred: uses getMcpPrefix (../mcp/mcpStringUtils.js) of its import cycle while loading; runs once the cycle is complete
var REMOTE_DEVICES_MCP_PREFIX;
var MAX_DEVICE_TOOL_SUFFIX_CHARS;
var DEVICE_TOOL_SUFFIX_REGEX;
deferInit("chunk-5xgkngpb.js:3898261", () => {
  CLAUDE_DEVICE_MCP_PREFIX = getMcpPrefix_4(CLAUDE_DEVICE);
  REMOTE_DEVICES_MCP_PREFIX = getMcpPrefix_4(REMOTE_DEVICES);
  MAX_DEVICE_TOOL_SUFFIX_CHARS = 108;
  DEVICE_TOOL_SUFFIX_REGEX = /^[a-zA-Z0-9](?:[a-zA-Z0-9_-]*[a-zA-Z0-9])?$/;
});
//@ chunk-5xgkngpb.js:3898346-3898512 placement
function matchLocalToolAlias(toolName, aliases) {
  let matches;
  if (toolName.startsWith(REMOTE_DEVICES_MCP_PREFIX)) {
    let localToolAlias = toLocalToolAlias(toolName);
    matches = aliases.filter((alias) => alias === localToolAlias);
  } else
    matches = aliases.filter(
      (alias) => alias.startsWith(REMOTE_DEVICES_MCP_PREFIX) && toLocalToolAlias(alias) === toolName,
    );
  return matches.length === 1 ? matches[0] : undefined;
}
//@ chunk-5xgkngpb.js:3898512-3898740 placement
function toLocalToolAlias(toolName) {
  let sliced = toolName.slice(REMOTE_DEVICES_MCP_PREFIX.length);
  let [devicePart, actionPart, ...extraParts] = sliced.split("__");
  if (
    devicePart === undefined ||
    actionPart === undefined ||
    extraParts.length > 0 ||
    !DEVICE_TOOL_SUFFIX_REGEX.test(devicePart) ||
    !DEVICE_TOOL_SUFFIX_REGEX.test(actionPart) ||
    ALL_BROWSER_TOOL_PREFIXES.some((prefix) => sliced.startsWith(prefix))
  )
    return;
  let localSuffix = `lcl-${devicePart}-${actionPart}`;
  return localSuffix.length <= MAX_DEVICE_TOOL_SUFFIX_CHARS
    ? CLAUDE_DEVICE_MCP_PREFIX + localSuffix
    : undefined;
}
//@ chunk-5xgkngpb.js:3898768-3898806 sole-consumer
function isMcpServerAlias(serverConnection) {
  return MCP_RESOURCE_TOOL_NAMES.has(canonicalToolName(serverConnection));
}
//@ chunk-5xgkngpb.js:3898806-3898834 placement
/**
 * 等待 MCP 服务器就绪的轮询间隔、最长等待与缺失宽限。
 */
var MCP_WAIT_POLL_INTERVAL_MS = 50;
var MAX_MCP_WAIT_MS = 1e4;
var MCP_ABSENT_GRACE_MS = 3000;
//@ chunk-5xgkngpb.js:3898834-3898861 placement
/**
 * 按会话记录已尝试过的工具行（弱集合）。
 */
class ToolRowsState {
  rows = new WeakSet();
}
//@ chunk-5xgkngpb.js:3898861-3898890 placement
/**
 * 按响应 id 记录等待时长。
 */
class ToolWaitByResponse {
  byResponse = new Map();
}
//@ chunk-5xgkngpb.js:3898890-3898901 placement
var MAX_WAIT_BY_RESPONSE_ENTRIES = 50;
//@ chunk-5xgkngpb.js:3898901-3898989 placement
/**
 * 判断缓存未命中的原因（未找到、超时、已列出但未入池）。
 */
function isCacheMissReason(bridgeEnd) {
  return bridgeEnd === "look_failed" || bridgeEnd === "look_timed_out" || bridgeEnd === "listed_not_pooled";
}
//@ chunk-5xgkngpb.js:3898989-3899238 placement
/**
 * 等待 MCP 工具所在服务器就绪并返回工具与等待信息；出错时记日志并返回未知状态。
 */
async function waitForMcpToolServer(toolName, tools, toolUseContext, options = {}) {
  let { signal } = toolUseContext.abortController;
  function notWaited(extra) {
    return {
      tool: undefined,
      tools,
      waitedMs: 0,
      aborted: signal.aborted,
      ...extra,
    };
  }
  try {
    return await getMcpServerType(toolName, tools, toolUseContext, options, notWaited);
  } catch (error) {
    logError(error);
    return notWaited({
      serverState: "unknown",
      initialServerState: "unknown",
    });
  }
}
//@ chunk-5xgkngpb.js:3899238-3899601 placement
/**
 * 判断调用的 MCP 工具是否值得等待：已能在刷新后的工具池找到，或对应服务器尚未出现在已知行中。
 */
function shouldWaitForMcpTool(toolName, toolUseContext) {
  if (typeof toolName !== "string") return false;
  let { refreshTools, toolAliases } = toolUseContext.options;
  let resolvedName = aliasOrSelf(toolName, toolAliases);
  if (!refreshTools || !mcpInfoFromString(resolvedName)) return false;
  let rows = toolUseContext.toolState.get(ToolRowsState).rows;
  try {
    return (
      findToolByName(refreshTools(), toolName, toolAliases) !== undefined ||
      findLongestPrefixClients(resolvedName, currentMcpClients(toolUseContext)).some(
        (client) => isPendingWithoutReconnect(client) && !rows.has(client),
      )
    );
  } catch (error) {
    logForDebugging(
      `Not waiting for MCP tool ${toolName}: reading its server or the tool pool failed: ${errorMessage(error)}`,
      {
        level: "warn",
      },
    );
    logError(error);
    return false;
  }
}
//@ chunk-5xgkngpb.js:3899601-3899659 placement
/**
 * 工具名属 MCP 且前缀客户端里有尚未连接完成的客户端。
 */
function isPendingMcpToolName(name, clients) {
  return (
    mcpInfoFromString(name) !== null &&
    findLongestPrefixClients(name, clients).some(isPendingWithoutReconnect)
  );
}
//@ chunk-5xgkngpb.js:3899659-3899730 placement
function isPendingWithoutReconnect(client) {
  return client.type === "pending" && client.reconnectAttempt === undefined;
}
//@ chunk-5xgkngpb.js:3899730-3901309 placement
async function getMcpServerType(toolName, tools, toolUseContext, options, notWaited) {
  let maxWaitMs = options.maxWaitMs ?? Math.min(getConnectionTimeoutMs(), MAX_MCP_WAIT_MS);
  let absentGraceMs = options.absentGraceMs ?? MCP_ABSENT_GRACE_MS;
  let connectedGraceMs = options.connectedGraceMs ?? 0;
  let rows = toolUseContext.toolState.get(ToolRowsState).rows;
  let skipExhausted = options.skipExhausted === true;
  let { signal } = toolUseContext.abortController;
  let { toolAliases } = toolUseContext.options;
  let serverConnection = aliasOrSelf(toolName, toolAliases);
  let isToolAlias = typeof serverConnection === "string" && isMcpServerAlias(serverConnection);
  if (typeof serverConnection !== "string" || (!isToolAlias && !mcpInfoFromString(serverConnection)))
    return notWaited({
      serverState: "not_mcp",
      initialServerState: "not_mcp",
    });
  function clients() {
    let clients = currentMcpClients(toolUseContext);
    return isToolAlias ? clients : findLongestPrefixClients(serverConnection, clients);
  }
  function serverState() {
    return getMcpServerBaseUrlFromToolName(clients());
  }
  let waitedClients = new Set(
    clients().filter((client) => isUnwaitedPendingClient(client, skipExhausted, rows)),
  );
  function shouldKeepWaiting(elapsedMs) {
    let currentClients = clients();
    if (
      currentClients.some(
        (client) => waitedClients.has(client) || isUnwaitedPendingClient(client, skipExhausted, rows),
      )
    )
      return true;
    if (elapsedMs < connectedGraceMs && currentClients.some((client) => client.type === "connected"))
      return true;
    return (currentClients.length === 0 || isToolAlias) && elapsedMs < absentGraceMs;
  }
  function findTool(currentTools) {
    return findToolByName(currentTools, toolName, toolAliases);
  }
  let initialState = serverState();
  let refreshTools = toolUseContext.options.refreshTools;
  if (!refreshTools)
    return notWaited({
      serverState: initialState,
      initialServerState: initialState,
    });
  let currentTools = refreshTools();
  let foundTool = findTool(currentTools);
  if (foundTool)
    return {
      tool: foundTool,
      tools: currentTools,
      waitedMs: 0,
      serverState: initialState,
      initialServerState: initialState,
      aborted: false,
    };
  if (!shouldKeepWaiting(0))
    return notWaited({
      serverState: initialState,
      initialServerState: initialState,
    });
  let byResponse = toolUseContext.toolState.get(ToolWaitByResponse).byResponse;
  let responseId = options.responseId;
  let waitBudgetMs = responseId ? maxWaitMs - (byResponse.get(responseId) ?? 0) : maxWaitMs;
  if (waitBudgetMs <= 0)
    return notWaited({
      serverState: initialState,
      initialServerState: initialState,
    });
  let now = Date.now();
  while (!signal.aborted) {
    currentTools = refreshTools();
    foundTool = findTool(currentTools);
    let elapsedMs = Date.now() - now;
    if (foundTool || !shouldKeepWaiting(elapsedMs) || elapsedMs >= waitBudgetMs) break;
    await sleep(MCP_WAIT_POLL_INTERVAL_MS, signal);
  }
  if (signal.aborted) foundTool = undefined;
  else if (!foundTool) {
    currentTools = refreshTools();
    foundTool = findTool(currentTools);
    if (!foundTool && !isToolAlias && waitBudgetMs === maxWaitMs && Date.now() - now >= waitBudgetMs) {
      for (let client of clients()) if (waitedClients.has(client)) rows.add(client);
    }
  }
  let waitedMs = Date.now() - now;
  if (responseId) {
    byResponse.set(responseId, (byResponse.get(responseId) ?? 0) + waitedMs);
    for (let key of byResponse.keys()) {
      if (byResponse.size <= MAX_WAIT_BY_RESPONSE_ENTRIES) break;
      byResponse.delete(key);
    }
  }
  return {
    tool: foundTool,
    tools: foundTool ? currentTools : tools,
    waitedMs,
    serverState: serverState(),
    initialServerState: initialState,
    aborted: signal.aborted,
  };
}
//@ chunk-5xgkngpb.js:3901309-3901469 placement
function getMcpServerBaseUrlFromToolName(clients) {
  let mapped = clients.map((client) => client.type);
  for (let state of ["connected", "cached", "pending", "needs-auth", "failed", "disabled"])
    if (mapped.includes(state)) return state;
  return "absent";
}
//@ chunk-5xgkngpb.js:3901469-3901526 placement
/**
 * 别名表里有该名字则返回别名，否则返回原名。
 */
function aliasOrSelf(name, toolAliases) {
  return toolAliases && Object.hasOwn(toolAliases, name) ? (toolAliases[name] ?? name) : name;
}
//@ chunk-5xgkngpb.js:3901526-3901680 placement
/**
 * 找出 MCP 前缀与工具名匹配且前缀最长的客户端列表。
 */
function findLongestPrefixClients(toolName, clients) {
  let matches = [];
  let bestPrefixLength = 0;
  for (let client of clients) {
    let mcpPrefix = getMcpPrefix_4(client.name);
    if (!toolName.startsWith(mcpPrefix) || mcpPrefix.length < bestPrefixLength) continue;
    if (mcpPrefix.length > bestPrefixLength) {
      bestPrefixLength = mcpPrefix.length;
      matches = [];
    }
    matches.push(client);
  }
  return matches;
}
//@ chunk-5xgkngpb.js:3901680-3901742 placement
/**
 * 客户端处于 pending 且不在已尝试集合里。
 */
function isUnwaitedPendingClient(client, skipExhausted, rows) {
  return client.type === "pending" && !(skipExhausted && rows.has(client));
}
//@ chunk-5xgkngpb.js:3901742-3902179 placement
/**
 * 解析工具输入：原始 JSON 无法解析时报 json 错误；可选先做 coerceInput 修复，再按 inputSchema 校验，返回解析结果与修复信息。
 */
function parseToolInput(tool, rawInput, coercion) {
  if (isUnparsedInputMarker(rawInput)) {
    let { raw, len } = rawInput[UNPARSED_TOOL_INPUT_KEY];
    return {
      ok: false,
      phase: "parse",
      cause: "json",
      raw,
      len,
    };
  }
  let coercionResult = coercion === undefined ? (tool.coerceInput?.(rawInput) ?? null) : coercion.repair;
  let candidateInput = coercion !== undefined || coercionResult === null ? rawInput : coercionResult.input;
  let parsed = tool.inputSchema.safeParse(candidateInput);
  let coerced =
    coercionResult === null
      ? undefined
      : {
          shapeClass: coercionResult.shapeClass,
          valid: parsed.success,
          resultNote: coercionResult.resultNote,
        };
  if (!parsed.success)
    return {
      ok: false,
      phase: "parse",
      cause: "schema",
      error: parsed.error,
      schemaInput: candidateInput,
      coerced,
    };
  return {
    ok: true,
    input: parsed.data,
    coerced,
  };
}
//@ chunk-5xgkngpb.js:3902179-3902559 placement
/**
 * 调用 validateInput：失败时返回校验结论（被规则拒绝时补全可观测输入）；成功时按需生成补全后的可观测输入。
 */
async function runValidateInput(tool, input, validate) {
  let verdict = await validate(input);
  if (verdict?.result === false) {
    let deniedInput;
    if (verdict.deniedByPermissionRule) {
      deniedInput = {
        ...input,
      };
      tool.backfillObservableInput?.(deniedInput);
    }
    return {
      ok: false,
      phase: "validate",
      verdict,
      deniedInput,
    };
  }
  if (!tool.backfillObservableInput)
    return {
      ok: true,
      callInput: input,
      observableInput: input,
      backfilled: false,
    };
  let observableInput = {
    ...input,
  };
  tool.backfillObservableInput(observableInput);
  return {
    ok: true,
    callInput: input,
    observableInput,
    backfilled: true,
  };
}
//@ chunk-5xgkngpb.js:3902559-3902765 placement
/**
 * 把基于可观测输入改写的输入映射回实际调用输入（file_path 等）。
 */
function restoreCallInput(parseResult, restoredInput) {
  let { callInput, observableInput, backfilled } = parseResult;
  if (
    backfilled &&
    restoredInput !== callInput &&
    "file_path" in restoredInput &&
    "file_path" in callInput &&
    restoredInput.file_path === observableInput.file_path
  )
    return {
      ...restoredInput,
      file_path: callInput.file_path,
    };
  if (backfilled && restoredInput === observableInput) return callInput;
  return restoredInput;
}
//@ chunk-5xgkngpb.js:3902765-3902789 placement
var MAX_PREWARM_WAIT_MS = 300000;
var PREWARM_POLL_MS = 5000;
//@ chunk-5xgkngpb.js:3902789-3903841 placement
/**
 * 工具执行前预热远程记忆路径，处理中止、超时与挂载断开。
 */
async function warmRemoteMemoryPath(tool, input, signal, activityLabel) {
  try {
    let memoryBaseDir = getMemoryBaseDir();
    if (
      memoryBaseDir === undefined ||
      !tool.getPath ||
      isRemoteOnlyCheck(tool.name) ||
      (canRunToolsOnThisMachine() && hasHostField(input))
    )
      return false;
    let absolutePath = expandStablePath(tool.getPath(input));
    if (!isPathWithinCaseAware(absolutePath, memoryBaseDir, false)) return false;
    if (signal.aborted) return true;
    startSessionActivity("tool_exec", activityLabel);
    let combinedAbortSignal = createCombinedAbortSignal(signal, {
      timeoutMs: MAX_PREWARM_WAIT_MS,
      refTimer: true,
    });
    try {
      let now = Date.now();
      let walkResult = await walkPermissionCheckPathsAsync(
        absolutePath,
        combinedAbortSignal.signal,
        (candidatePath) =>
          isPathWithinCaseAware(candidatePath, memoryBaseDir, false) ||
          isPathWithinCaseAware(memoryBaseDir, candidatePath, false),
      );
      let timing = {
        duration_ms: Date.now() - now,
      };
      if (signal.aborted) {
        if (timing.duration_ms >= PREWARM_POLL_MS)
          logFeatureSad("remote_memory_path_warmup", "aborted", timing);
      } else if (combinedAbortSignal.signal.aborted) logFeatureBad("remote_memory_path_warmup", "timed_out");
      else if (walkResult.unresolved)
        switch (walkResult.reason) {
          case "cut-short":
            logFeatureSad("remote_memory_path_warmup", "link_off_mount", timing);
            break;
          case "unexamined":
            logFeatureSad("remote_memory_path_warmup", "lookup_failed", timing);
            break;
          case "past-a-link":
            logFeatureSad("remote_memory_path_warmup", "link_unresolved", timing);
            break;
          default:
            walkResult.reason;
        }
      else if (timing.duration_ms >= PREWARM_POLL_MS)
        logFeatureSad("remote_memory_path_warmup", "slow", timing);
      else logFeatureOk("remote_memory_path_warmup");
    } finally {
      combinedAbortSignal.cleanup();
      endActivity("tool_exec", activityLabel);
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
//@ chunk-5xgkngpb.js:3998769-3998783 placement
var MEMORY_PREWARM_TIMEOUT_MS = 30000;
//@ chunk-5xgkngpb.js:3998783-3999285 placement
function emitToolHeartbeat({ toolName, toolUseID, abortSignal, onProgress }) {
  let now = Date.now();
  let isStopped = false;
  let didTickThrow = false;
  let heartbeatCount = 0;
  let interval = setInterval(() => {
    try {
      if (isStopped) return;
      if (abortSignal.aborted) {
        stopHeartbeat();
        return;
      }
      if (currentActivityState()) return;
      onProgress({
        type: "progress",
        toolUseID: `${toolUseID}-heartbeat-${heartbeatCount++}`,
        data: {
          type: "tool_heartbeat",
          toolName,
          elapsedTimeSeconds: Math.floor((Date.now() - now) / 1000),
        },
      });
    } catch (error) {
      didTickThrow = true;
      stopHeartbeat();
      logError(error);
      logFeatureBad("heartbeat_tool_progress", "tick_emit_threw");
    }
  }, MEMORY_PREWARM_TIMEOUT_MS);
  interval.unref();
  function stopHeartbeat() {
    if (isStopped) return;
    isStopped = true;
    clearInterval(interval);
    if (heartbeatCount > 0 && !didTickThrow) logFeatureOk("heartbeat_tool_progress");
  }
  return stopHeartbeat;
}
//@ chunk-5xgkngpb.js:4005122-4005310 placement
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
//@ chunk-5xgkngpb.js:4005310-4005695 placement
/**
 * 为写入转录准备工具结果：MCP 或需要时裁掉过大的结果，编辑工具结果的 originalFile 过长时置空，返回结果、mcpMeta 与暂存 uuid。
 */
function cutResultForStorage(toolUseContext, tool, forceCut, result) {
  let inSubagent = Boolean(toolUseContext.agentId);
  let keepsMcpMeta = isHearthReadTool(tool.name) && hasRelaySource(toolUseContext.options.mcpClients);
  let cutResult =
    forceCut || (tool.isMcp === true && !keepsMcpMeta && !toolUseContext.agentId)
      ? cutLargeMcpResult({
          ...result,
          keepsMcpMeta,
          inSubagent,
        })
      : result;
  let { toolUseResult, mcpMeta, uuid } =
    tool.isMcp !== true && tool.name === EDIT && cutResult.uuid === undefined
      ? {
          ...cutResult,
          ...cutEditOriginalFile({
            toolUseId: result.toolUseId,
            toolUseResult: cutResult.toolUseResult,
            mcpMeta: cutResult.mcpMeta,
            inSubagent,
          }),
        }
      : cutResult;
  return {
    toolUseResult,
    mcpMeta,
    uuid,
  };
}
//@ chunk-5xgkngpb.js:4005695-4005760 placement
function toolFeatureOf(signal) {
  return signal.aborted
    ? {
        abortKind: fromEnum(classifyAbortReasonForTelemetry(signal.reason)),
      }
    : {};
}
//@ chunk-5xgkngpb.js:4005760-4005953 placement
function measureStringChars(value, depth = 0) {
  if (typeof value === "string") return value.length + 1;
  if (depth >= 8 || value === null || typeof value !== "object") return 0;
  let total = 0;
  let items = Array.isArray(value) ? value : Object.values(value);
  for (let item of items) total += measureStringChars(item, depth + 1);
  return total;
}
//@ chunk-5xgkngpb.js:4005953-4006903 placement
/**
 * 统计工具结果中大字段的长度（原文件、笔记本前后内容、文件内容/base64/cells、git diff、结构化补丁）用于遥测。
 */
function measureSidecarFields(output) {
  if (!isPlainObject_6(output)) return {};
  let sizes = {};
  if (typeof output.originalFile === "string") sizes.sidecarOriginalFileBytes = output.originalFile.length;
  if (typeof output.original_file === "string")
    sizes.sidecarNotebookOriginalFileBytes = output.original_file.length;
  if (typeof output.updated_file === "string")
    sizes.sidecarNotebookUpdatedFileBytes = output.updated_file.length;
  if (typeof output.content === "string") sizes.sidecarContentBytes = output.content.length;
  if (isPlainObject_6(output.file)) {
    let file = output.file;
    if (typeof file.content === "string") sizes.sidecarFileContentBytes = file.content.length;
    if (typeof file.base64 === "string") sizes.sidecarFileBase64Bytes = file.base64.length;
    if (Array.isArray(file.cells)) sizes.sidecarFileCellsBytes = measureStringChars(file.cells);
  }
  if (isPlainObject_6(output.gitDiff)) {
    let patch = output.gitDiff.patch;
    if (typeof patch === "string") sizes.sidecarGitDiffPatchBytes = patch.length;
  }
  if (Array.isArray(output.structuredPatch)) {
    let sidecarStructuredPatchBytes = 0;
    for (let patchHunk of output.structuredPatch) {
      if (!isPlainObject_6(patchHunk)) continue;
      let lines = patchHunk.lines;
      if (!Array.isArray(lines)) continue;
      for (let line of lines) if (typeof line === "string") sidecarStructuredPatchBytes += line.length + 1;
    }
    sizes.sidecarStructuredPatchBytes = sidecarStructuredPatchBytes;
  }
  return sizes;
}
//@ chunk-5xgkngpb.js:4006903-4007215 placement
/**
 * 估算工具结果的遥测指标：token 估计、图片/文档块数量，以及是否超过阈值需要落盘；出错时返回空对象。
 */
function getResultSizeTelemetry(content, tool) {
  try {
    return {
      toolResultTokensEst: roughTokenCountEstimationForContent(content),
      toolResultMediaBlocks: Array.isArray(content)
        ? countWhere(content, (block) => block.type === "image" || block.type === "document")
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
//@ chunk-5xgkngpb.js:4007215-4007312 placement
/**
 * 取工具对应的遥测特性名（MCP 工具按来源归类）。
 */
function toolFeatureName(name, server) {
  let hostSource = sdkHostToolSource(server);
  if (hostSource !== undefined) return toolFeature(hostSource);
  return toolFeature(String(sanitizeToolNameWithMcpFlag(name, server !== undefined)));
}
//@ chunk-5xgkngpb.js:4007312-4007366 placement
/**
 * 安全地处理未知工具（吞掉异常）。
 */
function resolveUnknownToolSafe(toolName, toolUseId, toolUseContext, requestId) {
  try {
    resolveUnknownTool(toolName, toolUseId, toolUseContext, requestId);
  } catch (error) {
    logError(error);
  }
}
//@ chunk-5xgkngpb.js:4007366-4008625 placement
/**
 * 处理找不到的工具名：未注册的 MCP 工具、未知工具，返回对应错误。
 */
function resolveUnknownTool(toolName, toolUseId, toolUseContext, requestId) {
  let { connection, ambiguous } = resolveMcpConnectionForTool(toolName, toolUseContext.options.mcpClients);
  let serverType = connection ? (connection.config.type ?? "stdio") : undefined;
  let serverBaseUrl = connection ? getLoggingSafeMcpBaseUrl(connection.config) : undefined;
  let mcpServerType =
    !ambiguous &&
    isMcpServerLoggableInAnalytics(extractMcpToolDetails(toolName)?.serverName ?? "", connection?.config);
  let tool = findTool(toolUseContext.options.toolCatalog.getAllBaseTools(), toolName);
  let registeredToolName = toolNameForTelemetry(tool === undefined ? [] : [tool], toolName);
  let analyticsToolName = registeredToolName
    ? sanitizeToolNameForAnalytics(registeredToolName)
    : getUnknownToolAnalyticsName(toolName);
  logForDebugging(`Unknown tool ${analyticsToolName}: ${toolUseId}`);
  let isHiddenArtifact = tool !== undefined && isArtifactFamilyTool(tool) && isBuiltInArtifactHiddenForMcp();
  logFeatureBad(
    String(analyticsToolName) === "mcp_tool"
      ? toolFeature("unregistered_mcp")
      : toolFeature(String(analyticsToolName)),
    "tool_not_found",
    isHiddenArtifact
      ? {
          hidden_for_mcp: true,
        }
      : undefined,
  );
  let errorLabels = {
    unknown_tool: lit_2("No such tool available: unknown_tool"),
    mcp_tool: lit_2("No such tool available: mcp_tool"),
    skill_tool: lit_2("No such tool available: skill_tool"),
  };
  logEvent("tengu_tool_use_error", {
    error: registeredToolName
      ? lit_2("No such tool available: registered_base_tool")
      : (errorLabels[String(analyticsToolName)] ?? lit_2("No such tool available: unknown_tool")),
    errorCode: lit_2("NO_SUCH_TOOL"),
    toolName: analyticsToolName,
    ...(isHiddenArtifact && {
      hiddenForMcp: true,
    }),
    toolNameHash: shortHash(toolName),
    toolUseID: sanitizeMarkName(toolUseId),
    isMcp: toolName.startsWith("mcp__"),
    ...getSubagentTelemetryFields(toolUseContext.agentContext),
    ...getEffortTelemetryFields(toolUseContext),
    queryChainId: sanitizeMarkName(toolUseContext.queryTracking?.chainId),
    queryDepth: toolUseContext.queryTracking?.depth,
    ...(toolUseContext.options.messageClientPlatform && {
      messageClientPlatform: entrypointForTelemetry(toolUseContext.options.messageClientPlatform),
    }),
    ...(serverType && {
      mcpServerType: fromEnum(serverType),
    }),
    ...(serverBaseUrl && {
      mcpServerBaseUrl: safeOrigin(serverBaseUrl),
    }),
    ...claudeAiServerIdField(
      connection
        ? {
            serverType: connection.config.type,
            serverId: connectorServerId(connection.config),
          }
        : undefined,
    ),
    ...(requestId && {
      requestId: sanitizeMarkName(requestId),
    }),
    ...mcpToolDetailsForAnalytics(toolName, mcpServerType, connection !== undefined),
  });
}
//@ chunk-5xgkngpb.js:4008625-4008661 placement
/**
 * 判断错误是否属于中止/取消。
 */
function isAbortOrCancelError(error) {
  return isAbortError(error) || isCancel(error);
}
//@ chunk-5xgkngpb.js:4008661-4008746 placement
/**
 * 把中止错误转成工具错误文案（后台取消时附记忆更正提示）。
 */
function toolErrorTextForAbort(error, signal) {
  return isAbortOrCancelError(error) && signal.aborted && unwrapAbortReason(signal.reason) === "background"
    ? withMemoryCorrectionHint(CANCEL_MESSAGE)
    : formatToolErrorMessage(error);
}
//@ chunk-5xgkngpb.js:4008746-4009290 placement
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
    let text = await tool.settleUnaskedQuestion(
      ask,
      input,
      context,
      decisionReason.type === "asyncAgent" && decisionReason.hookAllowIgnored === true,
      decisionReason.type === "mode",
    );
    return text === "" || signal.aborted ? undefined : text;
  } catch (error) {
    if (!isAbortOrCancelError(error)) logError(error);
    return;
  }
}
//@ chunk-5xgkngpb.js:4009290-4009468 placement
function getInterruptKind(error, signal) {
  let interrupted = error instanceof ShellError && error.interrupted;
  if (!(error instanceof AbortError_2 || interrupted || (isAbortOrCancelError(error) && signal.aborted)))
    return;
  return signal.aborted && unwrapAbortReason(signal.reason) === "background" ? "cancelled" : "interrupted";
}
//@ chunk-5xgkngpb.js:4009468-4010592 placement
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
    let className = error.name !== "Error" ? error.name : (error.constructor?.name ?? "");
    if (KNOWN_ERROR_CLASS_NAMES.has(className))
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
//@ chunk-5xgkngpb.js:4010592-4010724 placement (2.1.88 match: getToolNameForPermissionCheck, 1)
function getToolNameForPermissionCheck_3(tool) {
  let hasArtifactTool = (toolName) =>
    tool.some(
      (candidate) =>
        candidate.mcpInfo?.serverName === CLAUDE_ARTIFACTS && candidate.mcpInfo.toolName === toolName,
    );
  return (
    findToolByName(tool, WEBFETCH) !== undefined &&
    hasArtifactTool(ARTIFACTS_MCP_READ_TOOL) &&
    hasArtifactTool(ARTIFACTS_MCP_GET_TOOL)
  );
}
//@ chunk-5xgkngpb.js:4010724-4010793 layout
function describeUnknownTool(
  toolName,
  mcpClients,
  baseTools,
  agentId,
  declaredTools,
  toolPermissionContext,
  agentSpawnContext = {},
  input,
  surfacedTools,
  noChannelTools,
) {
  return describeToolUnavailable(
    toolName,
    mcpClients,
    baseTools,
    agentId,
    declaredTools,
    toolPermissionContext,
    agentSpawnContext,
    input,
    surfacedTools,
    noChannelTools,
  );
}
//@ chunk-5xgkngpb.js:4010793-4017514 layout
function describeToolUnavailable(
  toolName,
  mcpClients,
  baseTools,
  isRestrictedContext,
  connectedClients,
  toolPermissionContext,
  agentSpawnContext = {},
  input,
  messages,
  surfaced,
) {
  let tool = surfaced?.sourceFor(toolName) ?? messages?.sourceFor(toolName);
  if (tool?.mcpInfo !== undefined && mcpInfoFromString(toolName) === null)
    return describeUnavailableMcpTool(
      toolName,
      isRestrictedContext,
      connectedClients,
      toolPermissionContext,
      tool,
      surfaced === undefined && isToolSearchInPool(mcpClients),
    );
  let tool_2 = findTool(baseTools, toolName);
  if (
    tool_2 !== undefined &&
    isArtifactFamilyTool(tool_2) &&
    isBuiltInArtifactHiddenForMcp() &&
    mcpClients.some((client) => client.mcpInfo?.serverName === CLAUDE_ARTIFACTS)
  ) {
    let webReadNote =
      !isByocEnvironment() && getToolNameForPermissionCheck_3(mcpClients)
        ? ` ${WEBFETCH} can read claude.ai artifact links.`
        : "";
    return surfaced === undefined && isToolSearchInPool(mcpClients)
      ? `. In this session the built-in Artifact tools were replaced by the tools of the MCP server '${CLAUDE_ARTIFACTS}': find them with ${TOOL_SEARCH_TOOL_NAME} and call those instead.${webReadNote}`
      : `. In this session the built-in Artifact tools were replaced by the tools of the MCP server '${CLAUDE_ARTIFACTS}', which are in your tool list: call those instead.${webReadNote}`;
  }
  if (
    !isByocEnvironment() &&
    tool_2 !== undefined &&
    isArtifactFamilyTool(tool_2) &&
    isBuiltInArtifactHiddenForMcp() &&
    !connectedClients.some((client) => client.name === CLAUDE_ARTIFACTS && client.type === "connected")
  )
    return `. The Artifacts tools aren't available in this session right now: the MCP server '${CLAUDE_ARTIFACTS}' that replaced the built-in Artifact tools isn't connected. Tell the user; /mcp can reconnect or re-enable it, or restarting Claude Code restores the tools.`;
  if (
    !isByocEnvironment() &&
    toolName === buildMcpToolName(CLAUDE_ARTIFACTS, ARTIFACTS_MCP_READ_SHARED_TOOL) &&
    isBuiltInArtifactHiddenForMcp()
  ) {
    let any = mcpClients.some(
      (client) =>
        client.mcpInfo?.serverName === CLAUDE_ARTIFACTS &&
        client.mcpInfo.toolName === ARTIFACTS_MCP_READ_TOOL,
    );
    let toolNameForPermissionCheck = getToolNameForPermissionCheck_3(mcpClients);
    let readNote = any
      ? ` ${ARTIFACTS_MCP_READ_TOOL} reads an artifact the user owns, or one from their organization that they can open; ${toolNameForPermissionCheck ? `for a link ${ARTIFACTS_MCP_READ_TOOL} refuses, use ${WEBFETCH}.` : "for anything else, tell the user."}`
      : " Tell the user.";
    return `. ${ARTIFACTS_MCP_READ_SHARED_TOOL} isn't available in local Claude Code sessions.${readNote}`;
  }
  let tool_3 = findToolByName(mcpClients, ARTIFACT_TOOL_NAME_2);
  if (
    tool_3 !== undefined &&
    mcpInfoFromString(toolName)?.serverName === CLAUDE_ARTIFACTS &&
    connectedClients.some(isEntryRowNotServed)
  )
    return `. The MCP server '${CLAUDE_ARTIFACTS}' is no longer served in this session, and the built-in Artifact tools are back${suggestToolInstead(tool_3, mcpClients, messages, surfaced)}`;
  let underlyingName = aliasOfToolName(toolName) ?? tool_2?.underlyingV1ToolName;
  if (
    codeModeAccepted() &&
    isCodeModeEnabled() &&
    toolMatchesAnyName(
      {
        name: toolName,
        underlyingV1ToolName: underlyingName,
      },
      CODE_MODE_ONLY_TOOLS,
    ) &&
    findToolByName(mcpClients, REPL_TOOL_NAME)
  ) {
    let toolNameText = underlyingName ?? toolName;
    return `. ${toolNameText} is only available inside ${REPL_TOOL_NAME}. Use ${REPL_TOOL_NAME} with code: await ${toolNameText}({...}).`;
  }
  if (codeModeAccepted() && isRestrictedContext && tool_2?.name === POLL)
    return `. ${toolName} is not available to this agent. Complete the task with the tools provided and return findings to the orchestrator.`;
  if (
    isRestrictedContext &&
    tool_2 &&
    (toolMatchesAnyName(tool_2, EXTERNAL_ALWAYS_AVAILABLE_TOOLS) || tool_2.name === POLL)
  )
    return `. ${toolName} is not available inside subagents. Complete the task with the tools provided and return findings to the orchestrator.`;
  if (tool_2?.name === BRIEF_TOOL_NAME_2)
    return `. ${toolName} is not enabled in this session \u2014 write your message as normal assistant text instead.`;
  if (tool_2?.name === GET_TASK_TOOL_TEXT) return GET_TASK_NOT_A_TOOL_TEXT;
  let aliasTool = tool_2 && toolByAlias(tool_2.name);
  if (
    tool_2 &&
    !isRestrictedContext &&
    isCoordinatorMode_2() &&
    !env.CLAUDE_CODE_SIMPLE &&
    !COORDINATOR_MAIN_THREAD_TOOL_NAMES.has(tool_2.name) &&
    tool_2.name !== POLL &&
    toolMatchesAnyName(tool_2, EXTERNAL_ALWAYS_AVAILABLE_TOOLS_2) &&
    tool_2.isEnabled() &&
    !getDenyRuleForTool(toolPermissionContext, tool_2) &&
    (underlyingName === undefined ||
      !getDenyRuleForTool(toolPermissionContext, {
        name: underlyingName,
      })) &&
    (aliasTool === undefined ||
      !aliasTool.isEnabled() ||
      !getDenyRuleForTool(toolPermissionContext, aliasTool)) &&
    findToolByName(mcpClients, AGENT)
  )
    return `. ${toolName} is not available to you as the coordinator \u2014 run it from a worker via the ${AGENT} tool instead.`;
  if (tool_2?.name === WEBFETCH && tool_2.isEnabled() && !getDenyRuleForTool(toolPermissionContext, tool_2)) {
    let artifactUrl =
      typeof input === "object" && input !== null && "url" in input ? parseArtifactUrlInput(input.url) : null;
    if (
      artifactUrl !== null &&
      artifactUrl.env === claudeAiEnvironment() &&
      findToolByName(mcpClients, ARTIFACT_TOOL_NAME_2) &&
      !getDenyRuleForTool(toolPermissionContext, {
        name: ARTIFACT_TOOL_NAME_2,
      })
    )
      return `. ${artifactViewerUrlFor(artifactUrl)} is a claude.ai artifact \u2014 read it with the ${ARTIFACT_TOOL_NAME_2} tool (action: "read", url) instead of ${WEBFETCH}.`;
    let readTool =
      artifactUrl !== null &&
      artifactUrl.env === claudeAiEnvironment() &&
      isBuiltInArtifactHiddenForMcp() &&
      !getDenyRuleForTool(toolPermissionContext, {
        name: ARTIFACT_TOOL_NAME_2,
      })
        ? mcpClients.find(
            (candidate) =>
              candidate.mcpInfo?.serverName === CLAUDE_ARTIFACTS &&
              candidate.mcpInfo.toolName === ARTIFACTS_MCP_READ_TOOL,
          )
        : undefined;
    if (artifactUrl !== null && readTool !== undefined)
      return `. ${artifactViewerUrlFor(artifactUrl)} is a claude.ai artifact \u2014 read it with ${readTool.name} (slug: "${artifactUrl.slug}") instead of ${WEBFETCH}.`;
    if (
      canUseWebFetchAgent(mcpClients, toolPermissionContext, {
        activeAgents: agentSpawnContext.activeAgents,
      })
    ) {
      if (canUseWebFetchAgent(mcpClients, toolPermissionContext, agentSpawnContext))
        return `. ${WEBFETCH} is not available directly in this context \u2014 use the ${AGENT} tool with subagent_type: "${WEB_FETCH_AGENT}" to read web pages instead.`;
      return (agentSpawnContext.depth ?? 0) === 0
        ? `. ${WEBFETCH} is not available in this context, and the ${WEB_FETCH_AGENT} agent that reads web pages for this session is outside this session's allowed subagent types. If the page is required, tell the user.`
        : `. ${WEBFETCH} is not available in this context, and the ${WEB_FETCH_AGENT} agent that reads web pages for this session cannot be dispatched from here (this agent's nesting depth or allowed subagent types rule it out). If the page is required, say so in your report so the caller can fetch it.`;
    }
  }
  let keptSource = surfaced ?? (isToolSearchInPool(mcpClients) ? messages : undefined);
  let isKnownButGone =
    (messages?.keeps(toolName) === true || surfaced?.keeps(toolName) === true) &&
    tool?.mcpInfo === undefined &&
    mcpInfoFromString(toolName) === null &&
    !toolMatchesAnyName(
      {
        name: toolName,
        underlyingV1ToolName: underlyingName,
      },
      getShadowedSearchToolNames(),
    );
  let isPermanent =
    isKnownButGone &&
    isPermanentUnavailabilityFor(
      describeToolAvailability(toolName, connectedClients, toolPermissionContext, tool),
    );
  let listedButGone =
    isKnownButGone &&
    keptSource?.keeps(toolName) === true &&
    !isPermanent &&
    !findToolByName(mcpClients, toolName);
  let isSendMessage = tool_2?.name === SENDMESSAGE;
  let spawnHint =
    isSendMessage && canSpawnSubagents(mcpClients, toolPermissionContext, agentSpawnContext)
      ? ` To follow up on an agent's work, start a new ${AGENT} call with everything it needs in its prompt.`
      : "";
  let sendMessageNote = isSendMessage
    ? ` An agent cannot be continued from this context. To message another session, use your host application's own messaging tool if it provides one; otherwise that is not possible from here.${spawnHint}`
    : "";
  if (listedButGone) {
    if (
      tool_2 !== undefined &&
      (!tool_2.isEnabled() ||
        isToolOmittedByLaunchToolList(toolPermissionContext, tool_2) ||
        isOutsideLaunchToolList(toolPermissionContext, tool_2))
    )
      return toolName === ASKUSERQUESTION && !canPromptUserForPermission()
        ? `. ${toolName} ${STILL_LISTED_NOTE}, but nobody in this session can answer it, so it cannot run. Continue without it; if you need the user's decision, ask in your response text instead.`
        : `. ${toolName} ${STILL_LISTED_NOTE} but is switched off in this session right now, so it cannot run. Continue without it.${sendMessageNote}`;
    return `. ${toolName} ${STILL_LISTED_NOTE}, but nothing in this session provides it right now (its source was removed or disconnected, or this version no longer has it), so it cannot run. Continue without it.${sendMessageNote}`;
  }
  if (
    codeModeAccepted() &&
    tool_2?.name === POLL &&
    tool_2.isEnabled() &&
    !getDenyRuleForTool(toolPermissionContext, tool_2) &&
    willHideCodeModeOnlyTools(mcpClients)
  )
    return `. ${POLL} is not among your tools in this session. Each ${REPL_TOOL_NAME} call here waits for its script and returns its output; none returns a (dispatched #N) receipt and no ${REPL_TOOL_NAME} output arrives later. A tool call the script has not awaited when it returns is cancelled and may not finish, so await every tool call. Continue with ${REPL_TOOL_NAME}.`;
  if (isSendMessage) return `. ${SENDMESSAGE} is not among the tools available here.${sendMessageNote}`;
  if (tool_2 || isPermanent)
    return isPermanent ||
      !tool_2?.isEnabled() ||
      getDenyRuleForTool(toolPermissionContext, tool_2) ||
      isOutsideLaunchToolList(toolPermissionContext, tool_2) ||
      (underlyingName !== undefined &&
        getDenyRuleForTool(toolPermissionContext, {
          name: underlyingName,
        })) ||
      (aliasTool?.isEnabled() && getDenyRuleForTool(toolPermissionContext, aliasTool))
      ? `. ${toolName} is disabled for this session, in subagents as well as here.`
      : `. ${toolName} is not among the tools available here. Continue with the tools you have.`;
  if (
    toolMatchesAnyName(
      {
        name: toolName,
        underlyingV1ToolName: underlyingName,
      },
      getShadowedSearchToolNames(),
    )
  ) {
    let searchToolName = (underlyingName ?? toolName) === GLOB_TOOL_NAME ? GLOB_TOOL_NAME : GREP_TOOL_NAME;
    if (!findToolByName(mcpClients, BASH_TOOL_NAME))
      return `. ${searchToolName} is disabled for this session.`;
    return searchToolName === GLOB_TOOL_NAME
      ? `. ${GLOB_TOOL_NAME} is not available in this session \u2014 find files with \`find\` via the ${BASH_TOOL_NAME} tool instead.`
      : `. ${GREP_TOOL_NAME} is not available in this session \u2014 search file contents with \`grep\` via the ${BASH_TOOL_NAME} tool instead.`;
  }
  let waitHint = isRestrictedContext ? "" : suggestWaitForMcpServers(toolName, mcpClients, connectedClients);
  if (waitHint) return waitHint;
  if (
    (areDeferredToolsKept() && deferredToolCache().hasTool(toolName)) ||
    messages?.has(toolName) ||
    surfaced?.has(toolName)
  )
    return describeUnavailableMcpTool(
      toolName,
      isRestrictedContext,
      connectedClients,
      toolPermissionContext,
      tool,
      surfaced === undefined && isToolSearchInPool(mcpClients),
    );
  if (typeof toolName !== "string") return "";
  let filtered = mcpClients.filter((tool) => tool.name.toLowerCase() === toolName.toLowerCase());
  let [caseMatch] = filtered;
  if (
    caseMatch !== undefined &&
    filtered.length === 1 &&
    !isDeferredToolInConversation(caseMatch, messages, mcpClients)
  )
    return `. Tool names are case-sensitive: call ${caseMatch.name} instead.`;
  let found = CHROME_TOOL_NAMES.find((name) => name === toolName);
  if (found !== undefined) {
    let filtered = mcpClients.filter((tool) => {
      let lower = tool.name.toLowerCase();
      return lower === found || lower.endsWith(`__${found}`);
    });
    let [tool] = filtered;
    if (
      tool !== undefined &&
      filtered.length === 1 &&
      isInputSchemaCompatible(tool, input) &&
      CHROME_TOOL_PREFIXES.some((matchedTool) => tool.name === matchedTool + found)
    )
      return suggestToolInstead(tool, mcpClients, messages, surfaced);
  }
  let message = matchLocalToolAlias(
    toolName,
    mcpClients.map((client) => client.name),
  );
  let tool_4 = message === undefined ? undefined : findToolByName(mcpClients, message);
  if (tool_4 !== undefined && isInputSchemaCompatible(tool_4, input))
    return suggestToolInstead(tool_4, mcpClients, messages, surfaced);
  return "";
}
//@ chunk-5xgkngpb.js:4017514-4017730 placement
function isInputSchemaCompatible(tool, input) {
  let properties = tool.inputJSONSchema?.properties;
  let required = tool.inputJSONSchema?.required;
  return (
    properties === undefined ||
    (isPlainObject_5(input) &&
      Object.keys(input).every((key) => Object.hasOwn(properties, key)) &&
      (Object.keys(input).length > 0 || !Array.isArray(required) || required.length === 0))
  );
}
//@ chunk-5xgkngpb.js:4017730-4017922 placement
function suggestToolInstead(tool, pool, messages, surfaced) {
  return surfaced === undefined &&
    isToolSearchInPool(pool) &&
    isDeferredToolInConversation(tool, messages, pool)
    ? `. Call ${tool.name} instead, loading it first with ${TOOL_SEARCH_TOOL_NAME} query "select:${tool.name}" if it is not loaded yet.`
    : `. Call ${tool.name} instead.`;
}
//@ chunk-5xgkngpb.js:4017922-4020705 placement
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
//@ chunk-5xgkngpb.js:4020705-4020989 placement
function suggestWaitForMcpServers(toolName, tools, clients) {
  let serverName = /^mcp__(.+?)__/.exec(toolName)?.[1];
  if (!serverName) return "";
  if (!findToolByName(tools, WAITFORMCPSERVERS)) return "";
  let normalizedServer = CLAUDEAI_SERVER_PREFIX(serverName);
  let found = clients.find(
    (client) =>
      client.type === "pending" &&
      (client.name === serverName || CLAUDEAI_SERVER_PREFIX(client.name) === normalizedServer),
  );
  if (!found) return "";
  return `. The MCP server '${found.name}' is still connecting. Call ${WAITFORMCPSERVERS} to wait for it, then try again.`;
}
//@ chunk-5xgkngpb.js:4020989-4021044 placement
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
//@ chunk-5xgkngpb.js:4021044-4021076 placement (2.1.88 match: extractErrorTypeFromData, 1)
/**
 * 对象是否带 type 字段。
 */
function hasTypeField(data) {
  return "type" in data;
}
//@ chunk-5xgkngpb.js:4021076-4021100 placement
/**
 * 按会话记录已触发过的工具别名。
 */
class AliasFireState {
  fired = new Set();
}
//@ chunk-5xgkngpb.js:4021100-4021249 placement (2.1.88 match: extractBashToolsFromMessages, 1)
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
//@ chunk-5xgkngpb.js:4021249-4021332 placement
/**
 * 取当前调用所属的后台代理 id。
 */
function backgroundAgentIdOf(toolUseContext) {
  return (
    getBackgroundAgentId(toolUseContext.agentContext) ??
    (toolUseContext.isBackgroundAgent ? toolUseContext.agentId : undefined)
  );
}
//@ chunk-5xgkngpb.js:4021332-4027197 placement
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
  let stagedWaiter = stagedFilesWaiterByRoot.peek(toolUseContext.session);
  if (stagedWaiter !== undefined && stagedWaiter.pending() > 0)
    await waitForStagedToolCallFiles(
      stagedWaiter,
      toolUseContext.abortController.signal,
      backgroundAgentIdOf(toolUseContext),
    );
  if (isTerminalShutdown() && !toolUseContext.abortController.signal.aborted) await heldUntilExit();
  let toolName = toolUse.name;
  let tool = findTool(toolUseContext.options.tools, toolName, toolUseContext.options.toolAliases);
  if (
    tool &&
    tool.name !== toolName &&
    tool.aliases?.includes(toolName) &&
    !toolUseContext.toolState.get(AliasFireState).fired.has(toolName)
  ) {
    toolUseContext.toolState.get(AliasFireState).fired.add(toolName);
    logEvent("tengu_dead_probe_tool_alias_exec", {
      alias: sanitizeToolNameForAnalytics(toolName),
      tool: sanitizeToolNameForAnalytics(tool.name),
    });
  }
  let id = assistantMessage.message.id;
  let requestId = assistantMessage.requestId;
  if (!tool && shouldWaitForMcpTool(toolName, toolUseContext)) {
    let waitResult = await waitForMcpToolServer(toolName, toolUseContext.options.tools, toolUseContext, {
      absentGraceMs: 0,
      skipExhausted: true,
      responseId: id ? `${requestId ?? ""}|${id}` : undefined,
    });
    logEvent("tengu_mcp_pending_tool_wait", {
      found: waitResult.tool !== undefined,
      aborted: waitResult.aborted,
      waited_ms: waitResult.waitedMs,
      server_state: fromEnum(waitResult.serverState),
      server_state_at_start: fromEnum(waitResult.initialServerState),
      handed_off: assistantMessage.handedOff === true,
    });
    if (waitResult.tool) {
      let options = toolUseContext.options;
      let waitOptions = {
        ...options,
        tools: waitResult.tools,
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
            options: waitOptions,
          },
          now,
          stallSampler,
        );
      } finally {
        if (waitOptions.activeMcpServer !== undefined && !toolUseContext.abortController.signal.aborted) {
          options.activeMcpServer = waitOptions.activeMcpServer;
          options.activeMcpTool = waitOptions.activeMcpTool;
        }
      }
      return;
    }
    if (waitResult.aborted) {
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
    let unavailableNote = describeUnknownTool(
      toolName,
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
    resolveUnknownToolSafe(toolName, toolUse.id, toolUseContext, requestId);
    yield {
      message: createUserMessage({
        content: [
          {
            type: "tool_result",
            content: `<tool_use_error>Error: No such tool available: ${toolName}${unavailableNote}</tool_use_error>`,
            is_error: true,
            tool_use_id: toolUse.id,
          },
        ],
        toolUseResult: `Error: No such tool available: ${toolName}${unavailableNote}`,
        sourceToolAssistantUUID: assistantMessage.uuid,
        now,
      }),
    };
    return;
  }
  recordToolUsePair(toolName, tool.name);
  let { connection, ambiguous } = resolveMcpConnectionForTool(toolName, toolUseContext.options.mcpClients);
  let connectedClient = connection && isConnectedOrCached(connection) ? connection : undefined;
  let mcpServerType = connectedClient ? (connectedClient.config.type ?? "stdio") : undefined;
  let mcpServerBaseUrl = connectedClient ? getLoggingSafeMcpBaseUrl(connectedClient.config) : undefined;
  let serverName = extractMcpToolDetails(toolName)?.serverName;
  let isRenamedTool = serverName !== undefined && serverName !== extractMcpToolDetails(tool.name)?.serverName;
  let mcpNameLoggable =
    !ambiguous &&
    !isRenamedTool &&
    isMcpServerLoggableInAnalytics(
      extractMcpToolDetails(toolName)?.serverName ?? "",
      connectedClient?.config,
    );
  let featureName = toolFeatureName(tool.name, tool.mcpInfo);
  let input = toolUse.input;
  let serverType = openProfileWindow(tool.name === AGENT ? "agent_tool" : "tool");
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
    let notLoadedVerdict = isHookCallerVirtualTool(assistantMessage, toolUseContext)
      ? null
      : getNotLoadedToolVerdict(tool, toolUseContext, toolUse.id);
    if (notLoadedVerdict !== null) {
      try {
        let commonFields = {
          family: fromEnum(notLoadedVerdict.family),
          late: notLoadedVerdict.late,
          loadInSameReply: notLoadedVerdict.loadInSameReply,
          firstForTool: notLoadedVerdict.firstForTool,
          relayActive: notLoadedVerdict.relayActive,
          flagSource: fromEnum(notLoadedVerdict.flagSource),
          coworkSurface: notLoadedVerdict.coworkSurface,
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
          enforced: notLoadedVerdict.enforced,
          toolUseID: sanitizeMarkName(toolUse.id),
          ...commonFields,
        });
        if (notLoadedVerdict.enforced) {
          logFeatureSad(featureName, "tool_not_loaded");
          logEvent("tengu_tool_use_error", {
            error: lit_2("InputValidationError"),
            errorCode: fromEnum(TOOL_NOT_LOADED),
            messageID: sanitizeMarkName(id),
            ...commonFields,
          });
        }
      } catch (error) {
        logNotLoadedCheckFailure("telemetry", error);
      }
      if (notLoadedVerdict.enforced) {
        yield {
          message: createUserMessage({
            content: [
              {
                type: "tool_result",
                content: `<tool_use_error>${notLoadedVerdict.message}</tool_use_error>`,
                is_error: true,
                tool_use_id: toolUse.id,
              },
            ],
            toolUseResult: notLoadedVerdict.message,
            sourceToolAssistantUUID: assistantMessage.uuid,
            now,
          }),
        };
        return;
      }
    }
    let isolationCheck = checkWebIsolation(tool, toolUseContext, toolUse.input);
    if (isolationCheck.denyMessage) {
      logFeatureSad(featureName, "tool_isolation_denied");
      logEvent("tengu_tool_use_isolation_latch_denied", {
        toolName: sanitizeToolNameForAnalytics(tool.name),
        toolUseID: sanitizeMarkName(toolUse.id),
        isMcp: tool.isMcp ?? false,
        isolationLatch: fromEnumOpt(isolationCheck.activeLatch),
        isolationClassifiedAs: fromEnumOpt(isolationCheck.classifiedAs),
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
              content: `<tool_use_error>${isolationCheck.denyMessage}</tool_use_error>`,
              is_error: true,
              tool_use_id: toolUse.id,
            },
          ],
          toolUseResult: `Error: ${isolationCheck.denyMessage}`,
          toolDenialKind: "permission-rule",
          sourceToolAssistantUUID: assistantMessage.uuid,
          now,
        }),
      };
      return;
    }
    let remoteStream = shouldRouteToolToHost(tool, input, toolUseContext, toolUse.id)
      ? new Stream()
      : undefined;
    let routePromise = routeToolCallWithAdoption(
      tool,
      input,
      toolUseContext,
      toolUse.id,
      remoteStream === undefined
        ? undefined
        : (text, timeoutMs) =>
            remoteStream.enqueue({
              type: "notification",
              notification: {
                key: `remote-tool-status-${toolUse.id}`,
                text,
                priority: "medium",
                ...(timeoutMs !== undefined && {
                  timeoutMs,
                }),
              },
            }),
    );
    if (remoteStream !== undefined) {
      routePromise.then(
        () => remoteStream.done(),
        () => remoteStream.done(),
      );
      for await (let message of remoteStream) yield message;
    }
    let coordinatorVerdict = describeCoordinatorRefusal(tool, toolUseContext, await routePromise);
    if (coordinatorVerdict.where === "refused") {
      yield {
        message: createUserMessage({
          content: [
            {
              type: "tool_result",
              content: `<tool_use_error>${coordinatorVerdict.message}</tool_use_error>`,
              is_error: true,
              tool_use_id: toolUse.id,
            },
          ],
          toolUseResult: `Error: ${coordinatorVerdict.message}`,
          sourceToolAssistantUUID: assistantMessage.uuid,
          now,
        }),
      };
      return;
    }
    if (coordinatorVerdict.where === "elsewhere") {
      try {
        yield* coordinatorVerdict.hosts.runToolUse({
          tool,
          toolUse,
          route: coordinatorVerdict.route,
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
    let planInput = withPlanPath(tool.name, coordinatorVerdict.input, toolUseContext.agentId);
    for await (let message of streamedCheckPermissionsAndCallTool(
      tool,
      toolUse.id,
      planInput,
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
      yield message;
  } catch (error) {
    let message = error instanceof Error ? error.message : String(error);
    let toolSuffix = tool ? ` (${tool.name})` : "";
    if (!isAbortOrCancelError(error)) {
      let { code, isSad } = classifyToolErrorCode(error);
      logForDebugging(
        `runToolUse error${tool ? ` (${toolCategoryForTelemetry(tool)})` : ""}: code=${code} errorChars=${message.length}`,
      );
      if (isSad) logFeatureSad(featureName, code);
      else {
        logError(error);
        logFeatureBad(featureName, "tool_unexpected_error");
      }
    }
    let errorText = `Error calling tool${toolSuffix}: ${message}`;
    yield {
      message: createUserMessage({
        content: [
          {
            type: "tool_result",
            content: `<tool_use_error>${errorText}</tool_use_error>`,
            is_error: true,
            tool_use_id: toolUse.id,
          },
        ],
        toolUseResult: errorText,
        toolDenialKind: getInterruptKind(error, toolUseContext.abortController.signal),
        interruptedByShutdown: shutdownInterruptStamp(toolUseContext.abortController.signal),
        sourceToolAssistantUUID: assistantMessage.uuid,
        now,
      }),
    };
  } finally {
    serverType();
  }
}
//@ chunk-5xgkngpb.js:4027197-4030031 fingerprint (2.1.88 match: streamedCheckPermissionsAndCallTool, 0.394)
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
  let command =
    isClassifierTargetToolUse(assistantMessage, toolUseID, toolUseContext.clientRequestedToolUseId) &&
    assistantMessage.handedOff !== true &&
    assistantMessage.serverClassifierInputRewritten !== true &&
    assistantMessage.permissionModeAtRequest instanceof ModeAtRequest &&
    typeof input.command === "string"
      ? input.command
      : undefined;
  let coercion =
    tool.coerceInput !== undefined && !isUnparsedInputMarker(input)
      ? {
          repair: tool.coerceInput(input),
          sent: input,
        }
      : undefined;
  let input_2 = coercion?.repair?.input;
  let candidateInput = isPlainObject_6(input_2) ? input_2 : input;
  let serverResult = cloneIfServerResults(assistantMessage, candidateInput);
  let serverInput = serverResult ?? (tool.name === REPL_TOOL_NAME ? clone(candidateInput) : undefined);
  let clonedInput = clonedHookInput(toolUseContext, candidateInput);
  let classifierState = {
    input:
      isPlainObject_6(candidateInput) &&
      isAutoClassifierActive(
        getToolPermissionContext(toolUseContext).mode,
        getToolPermissionContext(toolUseContext).servedCall === true,
      ) &&
      getServerClassifierFallbackMode() !== "off" &&
      isClassifierTargetToolUse(assistantMessage, toolUseID, toolUseContext.clientRequestedToolUseId) &&
      consumeRepeatedToolCall({
        agentId: toolUseContext.agentId,
        tool: tool.name,
        input: candidateInput,
        message: assistantMessage,
        messages: toolUseContext.messages,
      })
        ? clone(candidateInput)
        : undefined,
    used: false,
  };
  let safetyLogged = false;
  let observedMode;
  let run = (inputArg, callContext, callObserver) => {
    let decisionOut = {};
    let usedClassifierInput = classifierState.input !== undefined && !classifierState.used;
    classifierState.used = true;
    let effectiveInput = usedClassifierInput ? classifierState.input : inputArg;
    let changed = !usedClassifierInput && lacksServerResult(serverResult, inputArg);
    let managedLeft = toolCallChain.managedLeft();
    let changedKinds = !changed
      ? []
      : managedLeft !== undefined && deepEqualIgnoringUndefined(inputArg, managedLeft)
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
      effectiveInput,
      rebaseOriginIfInputChanged(callContext, clonedInput, effectiveInput),
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
        changed,
        kinds: changedKinds.map((results) => results.kind),
        sources: changedKinds.map((kindResult) => kindResult.source),
        written: serverResult,
      },
      serverInput !== undefined && !deepEqualIgnoringUndefined(effectiveInput, serverInput),
      decisionOut,
      callObserver,
      coercion,
      usedClassifierInput,
      classifierState.input !== undefined ? undefined : command,
    )
      .then((decision) => {
        let { decided } = decisionOut;
        attachPermissionDecision(decision, toolUseID, decided?.record);
        observedMode = decided?.mode ?? observedMode;
        if (decided !== undefined && !safetyLogged)
          safetyLogged = logToolSafetyEvent({
            tool,
            toolUseId: toolUseID,
            record: decided.record,
            sandboxViolations: findToolResultMessages(decision, toolUseID).flatMap(
              (resultMessage) => resultMessage.sandboxViolations ?? [],
            ),
            permissionMode: decided.mode,
            agentContext: callContext.agentContext,
            toolCatalog: callContext.options.toolCatalog,
          });
        return decision;
      })
      .finally(() => clearToolUsePermissionState(callContext.session, toolUseID));
  };
  let callEvent = withAgentId(toolCallEvent(tool.name, toolUseID, candidateInput), toolUseContext.agentId);
  let didLogSuspected =
    codeModeAccepted() &&
    toolUseContext.stoppedResultWait !== undefined &&
    hasModuleHookingSite("tool.call", {
      tool: tool.name,
    });
  let toolCallChain = createToolCallChain(
    tool,
    codeModeAccepted() && didLogSuspected ? withoutStoppedWait(toolUseContext) : toolUseContext,
    run,
    (managedInput) =>
      shouldReplaceMemoryInput(tool, candidateInput, managedInput)
        ? guardAccountMemoryHookRewrite(tool, "PreToolUse", "tool.call hook").message
        : undefined,
  );
  if (
    hasModuleHookingSite("tool.call", {
      ...candidateInput,
      tool: tool.name,
      tool_use_id: toolUseID,
    })
  )
    toolUseContext.markToolCallStarted?.(toolUseID);
  setOpenCall(toolUseID, toolUseContext.hookOrigin);
  let eventHandle = eventCallersFor2({
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
    releaseToolServerHold(tool).then(() => eventHandle.tool.call(callEvent)),
  )
    .then((hookMessages) =>
      applyToolCallHookResult(hookMessages, toolCallChain, {
        tool,
        input: callEvent,
        toolUseContext,
        assistantMessage,
        now,
      }),
    )
    .then(
      (updates) => {
        logHookPushbacks({
          updates,
          tool,
          toolUseId: toolUseID,
          getPermissionMode: () => observedMode ?? getToolPermissionContext(toolUseContext).mode,
          agentContext: toolUseContext.agentContext,
          toolCatalog: toolUseContext.options.toolCatalog,
        });
        for (let result of updates) stream.enqueue(result);
        stream.done();
      },
      (error) => {
        forgetOpenCall(toolUseID);
        if (codeModeAccepted()) toolUseContext.stoppedResultWait?.(toolUseID)?.withdraw();
        stream.error(error);
      },
    );
  return stream;
}
//@ chunk-5xgkngpb.js:4030031-4030066 layout
/**
 * 工具搜索乐观开启（isToolSearchEnabledOptimistic）且当前工具列表里有 ToolSearch。
 */
function isToolSearchInPool(pool) {
  return isToolSearchEnabledOptimistic() && isToolSearchToolAvailable(pool);
}
//@ chunk-5xgkngpb.js:4030066-4030147 layout
/**
 * 判断调用的工具是否是"schema 没发给 API 的延迟工具"：工具搜索在池中、该工具在本对话应延迟、且历史中未被发现（extractDiscoveredToolNames 不含它）。buildSchemaNotSentHint 与未加载判定都依赖它。
 */
function isDeferredSchemaNotSent(tool, messages, pool, conversation, surfaced) {
  return (
    isToolSearchInPool(pool) &&
    isDeferredToolInConversation(tool, conversation, pool) &&
    !extractDiscoveredToolNames(messages, {
      surfaced,
    }).has(tool.name)
  );
}
//@ chunk-5xgkngpb.js:4030147-4030314 layout
function toolSchemaHint(name, messages, sinceUuid) {
  return messages.some(
    (message) =>
      message.type === "assistant" &&
      Array.isArray(message.message.content) &&
      message.message.content.some(
        (block) => block.type === "tool_use" && block.name === name && block.id !== sinceUuid,
      ),
  );
}
//@ chunk-5xgkngpb.js:4030314-4030416 layout
/**
 * 未加载工具检查自身出错时的兜底：记 tengu_tool_use_not_loaded_check_failed{part} 并 logError，两步都吞掉异常，不影响工具调用。
 */
function logNotLoadedCheckFailure(part, error) {
  try {
    logEvent("tengu_tool_use_not_loaded_check_failed", {
      part: fromEnum(part),
    });
  } catch {}
  try {
    logError(error);
  } catch {}
}
//@ chunk-5xgkngpb.js:4030416-4030744 layout
/**
 * 为"调用未加载的延迟工具"收集附加信息：late（工具本不该延迟）、loadInSameReply（同一回答里已调用 ToolSearch）、firstForTool（本对话首次调用该工具）、relayActive（中继缓存活跃）。
 */
function getNotLoadedCallNotes(tool, toolUseContext, messageId) {
  try {
    let sameTurnToolUses = toolUseContext.sameTurnToolUses ?? [];
    return {
      late: !isDeferredToolInConversation(tool, undefined, toolUseContext.options.tools),
      loadInSameReply: toolSchemaHint(TOOL_SEARCH_TOOL_NAME, sameTurnToolUses),
      firstForTool:
        !toolSchemaHint(tool.name, toolUseContext.messages, messageId) &&
        !toolSchemaHint(tool.name, sameTurnToolUses),
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
//@ chunk-5xgkngpb.js:4030744-4030809 layout
function isHookCallerVirtualTool(assistantMessage, toolUseContext) {
  return assistantMessage.isVirtual === true && toolUseContext.hookCaller !== undefined;
}
//@ chunk-5xgkngpb.js:4030809-4031000 layout
function shouldMentionToolSearch(tool, messages, messages_2 = messages.messages) {
  let tools = messages.options.tools;
  let conversation = cachedDeclaredTools(messages);
  return (
    cachedNoChannelTools(messages) === undefined &&
    !isToolSearchPrecluded(messages.options.mainLoopModel, tools) &&
    (getToolSearchMode() === "tst" || conversation?.has(TOOL_SEARCH_TOOL_NAME) === true) &&
    isDeferredSchemaNotSent(
      tool,
      messages_2,
      tools,
      conversation,
      getSurfacedToolNames(messages.stickyBetas ?? getStickyBetas()),
    )
  );
}
//@ chunk-5xgkngpb.js:4031000-4031263 layout
/**
 * 延迟工具未加载就被调用时的判定：工具属于受管家族、工具搜索处于 tst 或已声明、且 schema 未发送时，返回 {enforced, flagSource, coworkSurface, family, message, …notes}，否则 null。出错时记失败事件返回 null。
 */
function getNotLoadedToolVerdict(tool, toolUseContext, messageId) {
  try {
    let deviceToolKind = getDeviceToolKind(tool);
    if (deviceToolKind === undefined) return null;
    if (!shouldMentionToolSearch(tool, toolUseContext)) return null;
    let policy = notLoadedToolPolicy();
    return {
      enforced: policy.inForce,
      flagSource: policy.flagSource,
      coworkSurface: policy.coworkSurface,
      family: deviceToolKind,
      message: buildNotLoadedToolError(tool.name),
      ...getNotLoadedCallNotes(tool, toolUseContext, messageId),
    };
  } catch (error) {
    logNotLoadedCheckFailure("verdict", error);
    return null;
  }
}
//@ chunk-5xgkngpb.js:4031263-4032073 layout
function toolSchemaNotInPromptNote(tool, toolUseContext) {
  try {
    if (
      tool.inputJSONSchema === undefined ||
      !shouldMentionToolSearch(
        tool,
        toolUseContext,
        toolUseContext.messages.filter((message) => !isCompactBoundaryMessage_3(message)),
      )
    )
      return null;
    let introText = `

This tool's input schema was not in your prompt when you called it. `;
    let howToLoad = `call ${TOOL_SEARCH_TOOL_NAME} with query "select:${tool.name}" to load the tool, then call it again.`;
    if (
      toolUseContext.messages.some(
        (message) =>
          message.type === "user" &&
          Array.isArray(message.message.content) &&
          message.message.content.some(
            (block) =>
              block.type === "tool_result" &&
              typeof block.content === "string" &&
              block.content.endsWith(howToLoad),
          ),
      )
    )
      return null;
    let schemaText = jsonStringify(tool.inputJSONSchema);
    if (schemaText.length > TRUNCATE_MIDDLE_CHARS)
      return `${introText}If the error above is about the input, ${howToLoad}`;
    return (
      introText +
      `The input schema is: ${schemaText}
If your input does not match this schema, correct it and call the tool again. If it matches, the error above has another cause. If the corrected call fails the same way, ${howToLoad}`
    );
  } catch (error) {
    logNotLoadedCheckFailure("verdict", error);
    return null;
  }
}
//@ chunk-5xgkngpb.js:4032073-4032585 fingerprint (2.1.88 match: buildSchemaNotSentHint, 0.719)
/**
 * 调用了 schema 未发送的延迟工具时生成提示：说明 schema 不在已发现集合里、类型化参数会被当成字符串，要求先 ToolSearch select:<name> 再重试，并附上该工具的 JSON schema。
 */
function buildSchemaNotSentHint(tool, input, toolUseContext, coercion, options) {
  if (!isDeferredSchemaNotSent(tool, input, toolUseContext, coercion, options)) return null;
  let schemaNote = "";
  try {
    schemaNote = ` For reference, this tool's input schema is: ${jsonStringify(toolInputJsonSchema(tool.inputSchema))}`;
  } catch {}
  return (
    `

This tool's schema was not sent to the API \u2014 it was not in the discovered-tool set derived from message history. ` +
    `Without the schema in your prompt, typed parameters (arrays, numbers, booleans) get emitted as strings and the client-side parser rejects them. Load the tool first: call ${TOOL_SEARCH_TOOL_NAME} with query "select:${tool.name}", then retry this call.${schemaNote}`
  );
}
//@ chunk-5xgkngpb.js:4032585-4033279 fingerprint (2.1.88 match: runToolUse, 0.465)
/**
 * 生成"已取消"的工具结果：记 tengu_tool_use_cancelled（阶段 validate_input/permission/... 与中断原因），返回 toolDenialKind=cancelled 的 tool_result。
 */
function buildCancelledToolResult(options) {
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
  } = options;
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
//@ chunk-5xgkngpb.js:4033279-4033431 layout (2.1.88 match: isUnrecognizedKeysIssue, 0.804)
function isUnrecognizedKeysIssue_2(inputSchema, updatedInput) {
  let parsed = inputSchema.safeParse(updatedInput);
  if (parsed.success) return null;
  let filtered = parsed.error.issues.filter((issue) => issue.code !== "unrecognized_keys");
  return filtered.length > 0 ? filtered : null;
}
//@ chunk-5xgkngpb.js:4033431-4033610 layout
/**
 * 向结果列表推入 hook_stopped_continuation 附件（hookName=PreToolUse:<工具名>），表示 PreToolUse hook 阻止了继续。
 */
function pushHookStoppedContinuation(results, { toolName, toolUseID, message }) {
  results.push({
    message: createAttachmentMessage_2({
      type: "hook_stopped_continuation",
      message,
      hookName: `PreToolUse:${toolName}`,
      toolUseID,
      hookEvent: "PreToolUse",
    }),
  });
}
//@ chunk-5xgkngpb.js:4033610-4033763 layout
var BASH_EDIT_HOOK_EVENTS = [["PostToolUse", "post_tool_use_hook"]];
var DEFAULT_HOOK_EVENTS = [
  ...BASH_EDIT_HOOK_EVENTS,
  ["PostToolUseFailure", "post_tool_use_failure_hook"],
  ["PostToolBatch", "post_tool_batch_hook"],
];
//@ chunk-5xgkngpb.js:4033763-4033941 layout
function makeOutsideResultReaderBlocker({
  sessionHooksRegistry,
  session,
  agentId,
  agentContext,
  remoteCall,
}) {
  return (toolUseContext) =>
    getOutsideResultReaderBlocker(
      {
        sessionHooksRegistry,
        session,
        agentId,
        agentContext,
        remoteCall,
      },
      toolUseContext,
    );
}
//@ chunk-5xgkngpb.js:4033941-4034190 layout
/**
 * 判断工具调用是否需要"外部结果读取器"：有非内置插件模块已加载→plugin_loaded，插件加载中→plugins_loading，有会话外的 PostToolUse hook→post_tool_use_hook，否则 undefined。
 */
function getOutsideResultReaderBlocker(toolUseContext, callSite) {
  if (getPluginRegistry().loadedModules.some((loadedModule) => !hasLink(loadedModule)))
    return "plugin_loaded";
  if (arePermissionHooksUnsettled()) return "plugins_loading";
  return (callSite === "bash_edit_diff" ? BASH_EDIT_HOOK_EVENTS : DEFAULT_HOOK_EVENTS).find(
    ([hookEvent]) =>
      !hasOnlyOwnCallbacksToRun(
        hookEvent,
        toolUseContext.sessionHooksRegistry,
        registerAgent(toolUseContext, hookEvent, toolUseContext.session.id),
        toolUseContext,
        callSite === "bash_edit_diff" && isRemoteManagedEnvironment(),
      ),
  )?.[1];
}
//@ chunk-5xgkngpb.js:4034190-4070977 fingerprint (2.1.88 match: checkPermissionsAndCallTool, 0.38)
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
  commandAsWritten,
) {
  let errorContent = toolFeatureName(tool.name, tool.mcpInfo);
  let effectiveToolName = builtinToolServedByMcp(tool) ?? tool.name;
  let parsedInput =
    coercion?.repair && deepEqualIgnoringUndefined(input, coercion.repair.input) ? coercion.sent : input;
  let inputBytes = jsonStringify(parsedInput).length;
  if (
    effectiveToolName === BASH_TOOL_NAME ||
    effectiveToolName === FILE_WRITE_TOOL_NAME ||
    effectiveToolName === POWERSHELL_TOOL_NAME ||
    tool.name === WORKSPACE_BASH_TOOL
  )
    recordRetypedLikely(inputBytes);
  let classifierEpoch = getClassifierEpoch();
  let schemaHint = parseToolInput(tool, input, coercion);
  if (!schemaHint.ok && schemaHint.cause === "json") {
    let { raw, len } = schemaHint;
    let rawPrefix = truncateToLength(raw, 200);
    let parseFailureText = `${tool.name} was called with input that could not be parsed as JSON.
You sent (first ${rawPrefix.length} of ${len} bytes): ${rawPrefix}
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
              content: `<tool_use_error>InputValidationError: ${parseFailureText}</tool_use_error>`,
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
      toolInputSizeBytes: inputBytes,
    });
  if (!schemaHint.ok) {
    let validationText = formatZodValidationError(tool.name, schemaHint.error);
    let emptyRepaired = false;
    if (emptyInputRepairConfig() && isEmptyObject(parsedInput)) {
      let placeholderInput = placeholderToolInput(tool.name, tool.inputSchema);
      if (placeholderInput !== null) {
        validationText = placeholderInput;
        emptyRepaired = true;
      }
    }
    let steerNote = tool.validationErrorSteer?.(parsedInput, schemaHint.error);
    if (steerNote)
      validationText = `${steerNote}

${validationText}`;
    let unavailableNote = isArtifactFamilyTool(tool)
      ? buildUnavailableOptionNote(
          tool.name,
          parsedInput,
          schemaHint.schemaInput,
          schemaHint.error,
          toolUseContext.messages,
        )
      : null;
    if (unavailableNote) {
      logEvent("tengu_recorded_tool_option_unavailable", {
        toolName: sanitizeToolNameForAnalytics(tool.name),
        isArtifactFamily: true,
        kind: fromEnum(unavailableNote.kind),
        source: fromEnum(unavailableNote.source),
      });
      validationText += `

${unavailableNote.text}`;
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
      validationText += schemaNotSentHint;
    }
    let joined = normalizeCaseForComparison_2(schemaHint.error.issues.map((issue) => issue.code)).join(",");
    logForDebugging(
      `${toolCategoryForTelemetry(tool)} tool input error: issues=${joined} inputBytes=${inputBytes} errorChars=${validationText.length}`,
    );
    logFeatureSad(errorContent, "tool_input_validation_failed");
    logEvent("tengu_tool_use_error", {
      error: lit_2("InputValidationError"),
      errorCode: lit_2("ZOD_VALIDATION"),
      zodIssueCodes: fromEnumArr(
        normalizeCaseForComparison_2(schemaHint.error.issues.map((issue) => issue.code)),
      ),
      errorDetailsHash: shortHash(validationText),
      messageID: sanitizeMarkName(messageId),
      toolName: sanitizeToolNameForAnalytics(tool.name),
      isMcp: tool.isMcp ?? false,
      ...getSubagentTelemetryFields(toolUseContext.agentContext),
      ...getEffortTelemetryFields(toolUseContext),
      toolInputSizeBytes: inputBytes,
      ...(emptyRepaired && {
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
              content: `<tool_use_error>InputValidationError: ${validationText}</tool_use_error>`,
              is_error: true,
              tool_use_id: toolUseID,
            },
          ],
          toolUseResult: `InputValidationError: ${schemaHint.error.message}`,
          toolResultRemedy: tool.validationErrorRemedy?.(parsedInput),
          sourceToolAssistantUUID: assistantMessage.uuid,
          now,
        }),
      },
    ];
  }
  if (tool.isMcp) {
    let missingArgs = describeMissingRequiredArgs(schemaHint.input, tool.inputJSONSchema);
    if (missingArgs !== null)
      logEvent("tengu_mcp_input_missing_required", {
        toolName: sanitizeToolNameForAnalytics(tool.name),
        isMcp: true,
        toolUseID: sanitizeMarkName(toolUseID),
        messageID: sanitizeMarkName(messageId),
        toolInputSizeBytes: inputBytes,
        requiredCount: missingArgs.requiredCount,
        missingCount: missingArgs.missingCount,
        presentKeyCount: missingArgs.presentKeyCount,
        maxStringValueLen: missingArgs.maxStringValueLen,
        hasPseudoTagDebris: missingArgs.hasPseudoTagDebris,
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
  let validateToolInput = (validateInput) =>
    tool.validateInput?.(validateInput, {
      ...toolUseContext,
      toolUseId: toolUseID,
    });
  let validation = (await warmRemoteMemoryPath(
    tool,
    schemaHint.input,
    toolUseContext.abortController.signal,
    backgroundAgentIdOf(toolUseContext),
  ))
    ? undefined
    : await runValidateInput(tool, schemaHint.input, validateToolInput);
  if (validation === undefined || isServerFallbackDiscard(toolUseContext.abortController.signal))
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
  let rejectResult = (verdict) => {
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
  if (!validation.ok) {
    let rejection = rejectResult(validation.verdict);
    if (validation.deniedInput !== undefined)
      toolUseContext.onPermissionDenial?.(tool, toolUseID, validation.deniedInput);
    if (validation.verdict.denyRule !== undefined)
      decisionOut.decided = {
        record: buildDenyRuleDecisionRecord(validation.verdict.message, validation.verdict.denyRule),
        mode: getToolPermissionContext(toolUseContext).mode,
      };
    return rejection;
  }
  let messages = [];
  let { observableInput, callInput } = validation;
  let clonedMessage = cloneIfServerResults(assistantMessage, validation.observableInput);
  let baselineInput =
    clonedMessage ?? (tool.name === REPL_TOOL_NAME ? clone(validation.observableInput) : undefined);
  let classifierInput = usedClassifierInput ? clone(validation.observableInput) : undefined;
  let classifierCallInput =
    usedClassifierInput && validation.backfilled ? clone(validation.callInput) : undefined;
  let callContext = validation;
  let hookInputSnapshot = clonedHookInput(toolUseContext, validation.observableInput);
  let toolUseContext_2 = {
    ...toolUseContext,
    mcpRequestMeta: stripHostToolMeta(toolUseContext.mcpRequestMeta),
    permissionModeAtRequest: getPermissionModeAtRequestForArbiter(
      assistantMessage,
      toolUseID,
      toolUseContext,
    ),
  };
  let preventContinuation = false;
  let stopReason;
  let hookPermissionResult;
  let rewriteKinds = [];
  let rewriteSources = [];
  let hookTimings = [];
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
    validateToolInput,
  ))
    switch (result.type) {
      case "message":
        if (result.message.message.type === "progress") onProgress(result.message.message);
        else {
          messages.push(result.message);
          let att = result.message.message.attachment;
          if (
            att &&
            "command" in att &&
            att.command !== undefined &&
            "durationMs" in att &&
            att.durationMs !== undefined
          )
            hookTimings.push({
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
        rewriteKinds.push(result.kind);
        rewriteSources.push(result.source);
        break;
      case "preventContinuation":
        preventContinuation = result.shouldPreventContinuation;
        break;
      case "stopReason":
        stopReason = result.stopReason;
        break;
      case "additionalContext":
        if (!isDelegatedObservationContext(toolUseContext.agentContext)) messages.push(result.message);
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
        let batchToolCount = Array.isArray(assistantMessage.message.content)
          ? countWhere(assistantMessage.message.content, (block) => block.type === "tool_use")
          : 1;
        if (batchToolCount > 1) {
          logForDebugging(
            `PreToolUse hook for ${toolCategoryForTelemetry(tool)} returned permissionDecision=defer but ${batchToolCount} tool calls are in this batch; ignoring (defer is solo-only \u2014 siblings would be orphaned on resume)`,
            {
              level: "warn",
            },
          );
          break;
        }
        if (toolUseContext.abortController.signal.aborted) {
          let cancelMessage = getCancelMessage(toolUseContext.abortController.signal);
          messages.push({
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
          return messages;
        }
        logEvent("tengu_pre_tool_hook_deferred", {
          toolName: sanitizeToolNameForAnalytics(tool.name),
          queryChainId: sanitizeMarkName(toolUseContext.queryTracking?.chainId),
          queryDepth: toolUseContext.queryTracking?.depth,
        });
        let activeSpanId = getActiveSpanId();
        messages.push({
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
        return messages;
      }
      case "stop": {
        getStatsStore()?.observe("pre_tool_hook_duration_ms", Date.now() - preToolHookStart);
        let cancelMessage = getCancelMessage(toolUseContext.abortController.signal);
        let cancelledToolResultBlock = createCancelledToolResultBlock(toolUseID);
        cancelledToolResultBlock.content = result.stopReason ?? cancelMessage;
        let stopReason_2 = result.stopReason ?? stopReason;
        messages.push({
          message: createUserMessage({
            content: [cancelledToolResultBlock],
            toolUseResult: stopReason_2 ? `Error: ${stopReason_2}` : cancelMessage,
            toolDenialKind: result.stopReason ? undefined : "cancelled",
            sourceToolAssistantUUID: assistantMessage.uuid,
            now,
          }),
        });
        if (preventContinuation && result.stopReason && !toolUseContext.abortController.signal.aborted)
          pushHookStoppedContinuation(messages, {
            toolName: tool.name,
            toolUseID,
            message: stopReason_2 || "Execution stopped by hook",
          });
        return messages;
      }
    }
  let hookDurationMs = Date.now() - preToolHookStart;
  getStatsStore()?.observe("pre_tool_hook_duration_ms", hookDurationMs);
  if (usedClassifierInput && classifierInput !== undefined) {
    let updatedInput =
      hookPermissionResult !== undefined && "updatedInput" in hookPermissionResult
        ? hookPermissionResult.updatedInput
        : undefined;
    let rewriteDropped =
      !deepEqualIgnoringUndefined(observableInput, classifierInput) ||
      (updatedInput !== undefined && !deepEqualIgnoringUndefined(updatedInput, classifierInput));
    if (!deepEqualIgnoringUndefined(observableInput, classifierInput)) {
      observableInput = classifierInput;
      callContext = {
        ...validation,
        observableInput: classifierInput,
        callInput: classifierCallInput ?? classifierInput,
      };
    }
    if (hookPermissionResult?.behavior === "allow" && rewriteDropped) hookPermissionResult = undefined;
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
      rewriteDropped,
    });
  }
  if (hookDurationMs >= ISOLATION_TIMEOUT_MS)
    logForDebugging(
      `Slow PreToolUse hooks: ${hookDurationMs}ms for ${toolCategoryForTelemetry(tool)} (${hookTimings.length} hooks)`,
      {
        level: "info",
      },
    );
  let spanAttributes = {};
  if (observableInput && typeof observableInput === "object" && !isTracingRedacted()) {
    if (tool.name === READ && "file_path" in observableInput && isToolDetailsLoggingEnabled())
      spanAttributes.file_path = String(observableInput.file_path);
    else if (
      (tool.name === EDIT || tool.name === FILE_WRITE_TOOL_NAME) &&
      "file_path" in observableInput &&
      isToolDetailsLoggingEnabled()
    )
      spanAttributes.file_path = String(observableInput.file_path);
    else if (tool.name === BASH_TOOL_NAME && "command" in observableInput && isToolDetailsLoggingEnabled()) {
      let bashInput = observableInput;
      spanAttributes.full_command = bashInput.command;
    } else if (isToolDetailsLoggingEnabled()) {
      let skillName = extractSkillName(tool.name, observableInput);
      if (skillName) spanAttributes.skill_name = skillName;
      let subagentType = extractSubagentType(tool.name, observableInput);
      if (subagentType) spanAttributes.subagent_type = subagentType;
    }
  }
  let bashClass =
    observableInput &&
    typeof observableInput === "object" &&
    effectiveToolName === BASH_TOOL_NAME &&
    "command" in observableInput &&
    typeof observableInput.command === "string"
      ? classifyBashCommand(observableInput.command)
      : undefined;
  if (bashClass && isSessionTracingEnabled()) {
    spanAttributes.bash_command_class = bashClass.bash_command_class;
    spanAttributes.bash_argv0 = bashClass.bash_argv0;
  }
  let memoryTool = isLiveMemoryTool(tool);
  let accountMemoryTool = memoryTool || tool.mcpInfo?.accountMemory === true;
  if (tool.mcpInfo?.accountMemory === true) markRecordGenuine();
  let withholdsFileRefs = withholdsFileReferenceErrors(tool, toolUseID);
  let span = startToolSpan(
    tool.name,
    toolUseContext.agentContext,
    spanAttributes,
    isPerfettoTracingEnabled() || (isBetaTracingEnabled() && isToolDetailsLoggingEnabled())
      ? jsonStringify(observableInput)
      : undefined,
    toolUseID,
    accountMemoryTool,
  );
  startToolBlockedOnUserSpan(toolUseContext.agentContext);
  rebaseBatchHookOrigins(
    [toolUseContext, toolUseContext_2],
    hookInputSnapshot,
    getHookUpdatedInput(hookPermissionResult, observableInput),
  );
  let permissionMode = getToolPermissionContext(toolUseContext_2).mode;
  let permissionStart = Date.now();
  let hookUpdatedInput = getHookUpdatedInput(hookPermissionResult, observableInput);
  let rewriteDescription = describeInputRewrite(
    hookRewrite,
    {
      changed: lacksServerResult(clonedMessage, hookUpdatedInput),
      kinds: rewriteKinds,
      sources: rewriteSources,
    },
    () => isShellToolClassified(tool.name),
    () => isShellOrFileToolForClassifier(tool),
  );
  let permissionRound = startPermissionRound(toolUseContext, toolUseID, tool.name);
  let checkRunner = getCheckRunner(toolUseContext.session, tool.name);
  let checkRegistered = getRegisteredCheck(toolUseContext.session, tool.name) && checkRunner;
  let checkRunnerHere = checkRegistered ? undefined : checkRunner;
  toolUseContext.toolDecisions ??= new Map();
  let inputRewritten =
    inputRewrittenBeforeCall ||
    (baselineInput !== undefined && !deepEqualIgnoringUndefined(hookUpdatedInput, baselineInput));
  let permissionResult = await resolvePermissionDecisionForCall(
    hookPermissionResult,
    tool,
    observableInput,
    {
      ...toolUseContext_2,
      permissionPhase: undefined,
      permissionRound,
      inputChangedByHook: inputRewritten ? true : undefined,
    },
    canUseTool,
    await applyServerClassifierVerdict(
      assistantMessage,
      toolUseID,
      hookUpdatedInput,
      rewriteDescription,
      toolUseContext.sameTurnToolUses,
    ),
    toolUseID,
  ).catch((error) => {
    takePermissionRecord(toolUseContext, toolUseID, permissionRound);
    throw error;
  });
  let permissionDecision = permissionResult.decision;
  observableInput = permissionResult.input;
  let permissionRecord = takePermissionRecord(toolUseContext, toolUseID, permissionRound) ?? {};
  if (
    permissionDecision.behavior !== "allow" &&
    isServerFallbackDiscard(toolUseContext.abortController.signal)
  ) {
    setDecided(
      decisionOut,
      permissionMode,
      buildPermissionDecisionRecord("cancelled", "server_fallback_tombstone"),
    );
    endToolSpan(span);
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
  let decisionEntry = toolUseContext.toolDecisions.get(toolUseID);
  if (
    permissionDecision.behavior === "ask" &&
    unwrapAbortReason(toolUseContext.abortController.signal.reason) === "interrupt" &&
    (decisionEntry === undefined || decisionEntry.source === "user_abort")
  ) {
    setDecided(decisionOut, permissionMode, buildPermissionDecisionRecord("cancelled", "user_abort"));
    endToolSpan(span);
    messages.push({
      message: createCancelledToolResult(
        toolUseID,
        assistantMessage,
        toolUseContext.abortController.signal,
        now,
      ),
    });
    return messages;
  }
  if (permissionDecision.behavior !== "allow") {
    if (isTerminalShutdown() && !toolUseContext.abortController.signal.aborted) await heldUntilExit();
    if (isInvalidInputDeny(permissionDecision)) {
      setDecided(decisionOut, permissionMode, buildPermissionDecisionRecord("reject", "invalid_input"));
      endToolSpan(span);
      messages.push(
        ...rejectResult({
          result: false,
          message: permissionDecision.message,
          errorCode: 1,
        }),
      );
      if (preventContinuation && !toolUseContext.abortController.signal.aborted)
        pushHookStoppedContinuation(messages, {
          toolName: tool.name,
          toolUseID,
          message: stopReason || "Execution stopped by hook",
        });
      return messages;
    }
    toolUseContext.onPermissionDenial?.(tool, toolUseID, observableInput);
  }
  let permissionDurationMs = Date.now() - permissionStart;
  if (permissionDurationMs >= ISOLATION_TIMEOUT_MS && permissionMode === "auto")
    logForDebugging(
      `Slow permission decision: ${permissionDurationMs}ms for ${toolCategoryForTelemetry(tool)} (mode=${permissionMode}, behavior=${permissionDecision.behavior})`,
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
    messages.push({
      message: createAttachmentMessage_2({
        type: "hook_permission_decision",
        decision: permissionDecision.behavior,
        toolUseID,
        hookEvent: "PermissionRequest",
      }),
    });
  let cancelledResult;
  try {
    if (
      isCcsTenant() &&
      isAutoClassifierActive(
        isAutoAllowedInMode(tool, toolPermissionContext),
        toolPermissionContext.servedCall === true,
      )
    )
      cancelledResult = {
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
    let decisionEntry = toolUseContext.toolDecisions.get(toolUseID);
    setDecided(
      decisionOut,
      permissionMode,
      buildDeniedDecisionRecord(permissionDecision, decisionEntry, source, permissionRecord.pipeline),
    );
    endToolSpan(span);
    logEvent("tengu_tool_use_can_use_tool_rejected", {
      ...cancelledResult,
      messageID: sanitizeMarkName(messageId),
      toolUseID: sanitizeMarkName(toolUseID),
      toolName: sanitizeToolNameForAnalytics(tool.name),
      deniedBy:
        permissionDecision.behavior === "ask" && decisionEntry?.decision !== "reject"
          ? lit_2("unresolvedAsk")
          : sanitizedDecisionReasonDisplay("deny", decisionEntry?.source, permissionDecision.decisionReason),
      decisionReasonType: fromEnum(
        permissionDecision.decisionReason?.type !== "rule" &&
          toDecisionRecord(permissionDecision).matchedAskRule !== undefined
          ? "rule"
          : (permissionDecision.decisionReason?.type ?? "unknown"),
      ),
      preToolHookDurationMs: hookDurationMs,
      permissionDurationMs,
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
    let settledAsk = await settleUnaskedQuestion(tool, permissionDecision, toolUseID, toolUseContext, {
      stopped: preventContinuation,
      asked: hookPermissionResult?.behavior === "ask",
    });
    let denyMessage = settledAsk ?? permissionDecision.message;
    if (preventContinuation && !denyMessage)
      denyMessage = `Execution stopped by PreToolUse hook${stopReason ? `: ${stopReason}` : ""}`;
    if (permissionDecision.decisionReason?.type === "hook")
      denyMessage += webFetchAgentHookHint(
        tool.name,
        observableInput,
        toolUseContext.options.tools,
        getToolPermissionContext(toolUseContext),
        getAgentSpawnContext(toolUseContext),
      );
    let settledMessage =
      codeModeAccepted() &&
      tool.name === REPL_TOOL_NAME &&
      !tool.mcpInfo &&
      !toolUseContext.abortController.signal.aborted
        ? `${denyMessage}${getDenialMessageSuffix()}`
        : denyMessage;
    let messageContent = [
      {
        type: "tool_result",
        content: settledMessage,
        ...(settledAsk === undefined && {
          is_error: true,
        }),
        tool_use_id: toolUseID,
      },
    ];
    let contentBlocks = permissionDecision.behavior === "ask" ? permissionDecision.contentBlocks : undefined;
    if (contentBlocks?.length) messageContent.push(...contentBlocks);
    let imagePasteIds;
    if (contentBlocks?.length) {
      let imageCount = countWhere(contentBlocks, (imageCount) => imageCount.type === "image");
      if (imageCount > 0) imagePasteIds = makeImagePlaceholders(imageCount);
    }
    messages.push({
      message: createUserMessage({
        content: messageContent,
        imagePasteIds,
        toolUseResult: settledAsk === undefined ? `Error: ${settledMessage}` : settledMessage,
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
      preventContinuation &&
      permissionDecision.behavior === "deny" &&
      permissionDecision.decisionReason.type === "hook" &&
      !toolUseContext.abortController.signal.aborted
    )
      pushHookStoppedContinuation(messages, {
        toolName: tool.name,
        toolUseID,
        message: stopReason ?? denyMessage,
      });
    if (
      permissionDecision.decisionReason?.type === "classifier" &&
      permissionDecision.decisionReason.classifier === "auto-mode"
    ) {
      let deniedHooksRan = false;
      try {
        for await (let deniedHookEvent of executePermissionDeniedHooks(
          tool.name,
          toolUseID,
          observableInput,
          permissionDecision.decisionReason.reason ?? "Permission denied",
          toolUseContext,
          permissionMode,
          toolUseContext.abortController.signal,
        ))
          if (deniedHookEvent.retry) deniedHooksRan = true;
      } catch (error) {
        if (!(error instanceof StreamClosedAbortError)) throw error;
        logForDebugging("PermissionDenied hooks cancelled (control stream closed)");
      }
      if (deniedHooksRan && !permissionDecision.decisionReason.noVerdict)
        messages.push({
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
    return messages;
  }
  logEvent("tengu_tool_use_can_use_tool_allowed", {
    ...cancelledResult,
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
    let unknownIssues = isUnrecognizedKeysIssue_2(tool.inputSchema, permissionDecision.updatedInput);
    if (unknownIssues !== null) {
      let zodError = new ZodError(unknownIssues);
      let updatedInputError = `The permission handler returned updatedInput for ${tool.name} that failed schema validation: ${formatZodValidationError(tool.name, zodError)}
This is a configuration issue in your canUseTool callback, PermissionRequest hook, or permission-prompt tool \u2014 updatedInput must satisfy the tool's input schema. The tool input from the model was valid.`;
      let startId = normalizeCaseForComparison_2(unknownIssues.map((issueCode) => issueCode.code));
      setDecided(
        decisionOut,
        permissionMode,
        buildPermissionDecisionRecord("reject", "permission_updated_input_invalid"),
      );
      endToolSpan(span);
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
        errorDetailsHash: shortHash(updatedInputError),
        messageID: sanitizeMarkName(messageId),
        toolName: sanitizeToolNameForAnalytics(tool.name),
        isMcp: tool.isMcp ?? false,
        ...getSubagentTelemetryFields(toolUseContext.agentContext),
        ...getEffortTelemetryFields(toolUseContext),
        toolInputSizeBytes: inputBytes,
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
      messages.push({
        message: createUserMessage({
          content: [
            {
              type: "tool_result",
              content: `<tool_use_error>${updatedInputError}</tool_use_error>`,
              is_error: true,
              tool_use_id: toolUseID,
            },
          ],
          toolUseResult: `InputValidationError: permission handler updatedInput failed schema for ${tool.name}`,
          sourceToolAssistantUUID: assistantMessage.uuid,
          now,
        }),
      });
      if (preventContinuation && !toolUseContext.abortController.signal.aborted)
        pushHookStoppedContinuation(messages, {
          toolName: tool.name,
          toolUseID,
          message: stopReason || "Execution stopped by hook",
        });
      return messages;
    }
    observableInput = stripUnchangedHostOwnedKeys(
      tool.name,
      permissionDecision.updatedInput,
      observableInput,
    );
  } else observableInput = stripHostOwnedInputKeys(tool.name, observableInput);
  let attributionState = {
    stamped: false,
    visiblyAttributed: false,
  };
  let toolInputForTelemetry = extractToolInputForTelemetry(observableInput);
  let attributedFlag =
    toolInputForTelemetry !== undefined && accountMemoryTool
      ? notRecordedLength(jsonStringify(observableInput))
      : toolInputForTelemetry;
  let toolInputDetailsForAnalytics = extractToolInputDetailsForAnalytics(
    tool.name,
    observableInput,
    tool.mcpInfo,
  );
  let decisionRecord = toolUseContext.toolDecisions.get(toolUseID);
  setDecided(
    decisionOut,
    permissionMode,
    buildDeniedDecisionRecord(permissionDecision, decisionRecord, source, permissionRecord.pipeline),
  );
  let aborted = toolUseContext.abortController.signal.aborted;
  let isVirtual = assistantMessage.isVirtual
    ? undefined
    : notifyBridgeSessionListener(toolUseContext.session, {
        toolUseId: toolUseID,
        mayWrite: () => !tool.isReadOnly(restoreCallInput(callContext, observableInput), toolUseContext),
        agentId: toolUseContext.agentId,
        signal: toolUseContext.abortController.signal,
      });
  if (isVirtual) {
    await isVirtual;
    if (
      !aborted &&
      toolUseContext.abortController.signal.aborted &&
      !isServerFallbackDiscard(toolUseContext.abortController.signal)
    ) {
      endToolSpan(span);
      messages.push(
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
      return messages;
    }
  }
  if (toolUseContext.toolCallAbandoned?.(toolUseID)) {
    endToolSpan(span);
    return [];
  }
  startToolExecutionSpan(toolUseContext.agentContext, toolUseID);
  let now_2 = Date.now();
  let wallClock = new ToolWallClockTracker(now_2);
  let callState = {
    declaredNoOutsideWork:
      tool.mcpInfo === undefined &&
      ISOLATION_NEUTRAL_TOOLS.has(tool.name) &&
      !(
        tool.name === ARTIFACT_TOOL_NAME_2 &&
        "action" in observableInput &&
        observableInput.action === "read"
      ),
  };
  let memorySampler = new MemoryUsageSampler(stallSampler);
  let memoryBefore = memorySampler.sample("before_call");
  let callSpan;
  callInput = restoreCallInput(callContext, observableInput);
  let toolResult;
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
    `[Stall] tool_dispatch_start tool=${toolCategoryForTelemetry(tool)} toolUseId=${toolUseID} permissionDecisionMs=${permissionDurationMs}`,
    {
      level: "info",
    },
  );
  let callFailed = false;
  let callError;
  let telemetryToolInput = backgroundAgentIdOf(toolUseContext);
  let stopAfterCall = false;
  let onStreamProgress = () => {
    if (stopAfterCall) {
      stopAfterCall = false;
      endActivity("tool_exec", telemetryToolInput);
    }
  };
  try {
    stopAfterCall = true;
    startSessionActivity("tool_exec", telemetryToolInput);
    toolUseContext.lendToolExecEnd?.(toolUseID, onStreamProgress);
    if (supportsRemoteExecution(tool) && splitHostField(callInput).requested !== undefined)
      throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
        INJECTED_MACHINE_REFUSAL,
        "late host argument on a local tool call",
      );
    if (isCoordinatorBashToolUse(tool, toolUseContext)) {
      let coordinatorProblem = checkCoordinatorShellCommand(tool, callInput, toolUseContext);
      if (coordinatorProblem !== null)
        throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
          coordinatorProblem,
          "coordinator Bash call refused at call time",
        );
      callInput = clampCoordinatorShellTimeout(callInput);
    }
    let cwd = toolUseContext.session.project?.cwd;
    if (cwd !== undefined && shouldLogGitCommitDetails(tool, callInput))
      toolResult = await markHeadReflog(cwd);
    if (!isCallDirectoryUnchanged())
      throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
        CALL_DIRECTORY_CHANGED_MESSAGE,
        "working directory changed between check and call",
      );
    let agentIdForCall = toolUseContext.agentId
      ? () => {}
      : emitToolHeartbeat({
          toolName: tool.name,
          toolUseID,
          abortSignal: toolUseContext.abortController.signal,
          onProgress,
        });
    let applyResultLayers = () => {
      callSpan = Date.now();
    };
    if (toolUseContext.abortController.signal.aborted) callSpan = now_2;
    toolUseContext.abortController.signal.addEventListener("abort", applyResultLayers, {
      once: true,
    });
    let isWriteCall = !tool.isReadOnly(callInput, toolUseContext);
    toolUseContext.toolState.get(BashRepeatMeter).noteOtherToolCall(tool, isWriteCall);
    if (callObserver && !isWriteCall) callObserver.isReadOnly = true;
    let mcpDetails = getApprovalSource(permissionDecision);
    let skillName = forgetPendingCheck(toolUseContext.session, toolUseID);
    let runToolCall = (toolUseContext, onProgress) =>
      tool.call(
        callInput,
        {
          ...toolUseContext,
          toolUseId: toolUseID,
          permissionPhase: permissionRecord,
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
          outsideResultReader: makeOutsideResultReaderBlocker(toolUseContext),
          commandAsWritten,
          permissionCheckedFor: skillName ? undefined : checkRegistered,
          runnerCheckedHere: skillName ? checkRunner : checkRunnerHere,
          timing: wallClock,
        },
      );
    let calledToolResult;
    callObserver?.onToolEntered?.();
    try {
      calledToolResult = await runWithTimingContext(wallClock, () =>
        detachToolCall(tool, callInput, toolUseContext)
          ? runDetachableToolCall({
              tool,
              input: callInput,
              toolUseID,
              toolUseContext,
              onProgress,
              run: runToolCall,
            })
          : runToolCall(toolUseContext, onProgress),
      );
    } finally {
      agentIdForCall();
      toolUseContext.abortController.signal.removeEventListener("abort", applyResultLayers);
    }
    await waitForFolderAttached({
      toolState: toolUseContext.toolState,
      fullToolName: tool.name,
      content: calledToolResult.data,
      signal: toolUseContext.abortController.signal,
    });
    let callDurationMs = Date.now() - now_2;
    wallClock.settle();
    callError = callDurationMs;
    let memoryAfter = memorySampler.sample("after_call");
    addToToolDuration(callDurationMs);
    logForDebugging(
      `[Stall] tool_dispatch_end tool=${toolCategoryForTelemetry(tool)} toolUseId=${toolUseID} outcome=ok durationMs=${callDurationMs}`,
      {
        level: "info",
      },
    );
    callFailed = true;
    if (
      tool.mcpInfo === undefined &&
      CORE_FILE_TOOLS.has(tool.name) &&
      calledToolResult.data &&
      typeof calledToolResult.data === "object"
    ) {
      let timings = {};
      if (tool.name === READ) {
        let resultData = calledToolResult.data;
        if (resultData.type === "text") {
          if (isToolDetailsLoggingEnabled() && "file_path" in observableInput)
            timings.file_path = String(observableInput.file_path);
          timings.content = resultData.file.content;
        }
      }
      if ((tool.name === EDIT || tool.name === FILE_WRITE_TOOL_NAME) && "file_path" in observableInput) {
        if (isToolDetailsLoggingEnabled()) timings.file_path = String(observableInput.file_path);
        if (isToolDetailsLoggingEnabled() && tool.name === EDIT && "structuredPatch" in calledToolResult.data)
          timings.diff = jsonStringify(calledToolResult.data.structuredPatch);
        if (
          isToolDetailsLoggingEnabled() &&
          tool.name === FILE_WRITE_TOOL_NAME &&
          "content" in observableInput
        )
          timings.content = String(observableInput.content);
      }
      if (tool.name === BASH_TOOL_NAME && "command" in observableInput) {
        let callInputSnapshot = observableInput;
        if (isToolDetailsLoggingEnabled()) timings.bash_command = callInputSnapshot.command;
        if ("stdout" in calledToolResult.data) timings.output = String(calledToolResult.data.stdout);
      }
      if (Object.keys(timings).length > 0) addToolContentEvent(span, "tool.output", timings);
    }
    if (
      tool.name === POLL &&
      typeof calledToolResult.data === "object" &&
      calledToolResult.data !== null &&
      "eventCount" in calledToolResult.data &&
      typeof calledToolResult.data.eventCount === "number" &&
      calledToolResult.data.eventCount > 0
    )
      messages.push({
        message: createAttachmentMessage_2({
          type: "poll_events",
          deliveredVia: "poll_tool",
          envelopes: [],
          kinds: [],
          remainingWakeCount: 0,
          ...("provenance" in calledToolResult.data &&
            Array.isArray(calledToolResult.data.provenance) && {
              provenance: calledToolResult.data.provenance,
            }),
          ...("declared" in calledToolResult.data &&
            Array.isArray(calledToolResult.data.declared) && {
              declared: calledToolResult.data.declared,
            }),
          ...false,
        }),
      });
    if (typeof calledToolResult === "object" && "structured_output" in calledToolResult)
      messages.push({
        message: createAttachmentMessage_2({
          type: "structured_output",
          data: calledToolResult.structured_output,
          toolUseID,
        }),
      });
    endToolExecutionSpan({
      success: true,
    });
    let preMappedBlock = calledToolResult.detached
      ? {
          type: "tool_result",
          tool_use_id: toolUseID,
          content: calledToolResult.detached.text,
        }
      : tool.mapToolResultToToolResultBlockParam(calledToolResult.data, toolUseID);
    if (
      (tool.mcpInfo !== undefined || WEB_TOOLS.has(tool.name)) &&
      !calledToolResult.detached &&
      shouldRecordToolContent(span)
    ) {
      let preMappedText = stringifyToolContentForSpan(preMappedBlock.content);
      addToolContentEvent(span, "tool.output", {
        output: accountMemoryTool ? notRecordedLength(preMappedText) : preMappedText,
      });
    }
    let mappedBlock =
      isPerfettoTracingEnabled() || (isBetaTracingEnabled() && isToolContentLoggingEnabled())
        ? calledToolResult.data && typeof calledToolResult.data === "object"
          ? jsonStringify(calledToolResult.data)
          : String(calledToolResult.data ?? "")
        : undefined;
    endToolSpan(span, mappedBlock, undefined, accountMemoryTool);
    let mappedContent = preMappedBlock.content;
    if (memoryTool) noteToolTexts(observableInput, mappedContent);
    let hasMappedContent = !mappedContent
      ? 0
      : typeof mappedContent === "string"
        ? mappedContent.length
        : jsonStringify(mappedContent).length;
    let resultSizeTelemetry = getResultSizeTelemetry(mappedContent, tool);
    let resultIsMedia = isMedia_2(calledToolResult.newMessages);
    let mediaBlocks;
    let mediaUrls;
    let extraMessages;
    let resultFiles;
    let resultNotes;
    if (observableInput && typeof observableInput === "object") {
      if (
        (effectiveToolName === READ ||
          effectiveToolName === EDIT ||
          effectiveToolName === FILE_WRITE_TOOL_NAME) &&
        "file_path" in observableInput &&
        typeof observableInput.file_path === "string"
      ) {
        mediaBlocks = getFileExtensionForAnalytics(observableInput.file_path);
        extraMessages = String(callInput.file_path).length;
      } else if (
        effectiveToolName === NOTEBOOK_EDIT_TOOL_NAME &&
        "notebook_path" in observableInput &&
        typeof observableInput.notebook_path === "string"
      ) {
        let notebookPath = observableInput.notebook_path;
        mediaBlocks = getFileExtensionForAnalytics(notebookPath);
        extraMessages = notebookPath.length;
      } else if (tool.name === ARTIFACT_TOOL_NAME_2 && "file_path" in observableInput) {
        let filePathText = String(observableInput.file_path);
        mediaBlocks = getFileExtensionForAnalytics(filePathText);
        extraMessages = filePathText.length;
      } else if (
        effectiveToolName === BASH_TOOL_NAME &&
        "command" in observableInput &&
        typeof observableInput.command === "string"
      ) {
        let fileInput = observableInput;
        mediaBlocks = getFileExtensionsFromBashCommand_2(fileInput.command);
        mediaUrls = extensionsInCommand(fileInput.command);
        resultFiles = fileInput.command.length;
      } else if (
        (tool.name === WORKSPACE_BASH_TOOL || effectiveToolName === POWERSHELL_TOOL_NAME) &&
        "command" in observableInput &&
        typeof observableInput.command === "string"
      )
        mediaUrls = extensionsInCommand(observableInput.command);
      else if (tool.name === DESIGNSYNC) {
        let designInput = observableInput;
        let listLength = (item) => (Array.isArray(item) ? item.length : undefined);
        let counts = designInput.method === "report_validate" ? designInput.counts : undefined;
        resultNotes = {
          dsMethod: fromEnumOpt(
            DESIGNSYNC_METHODS.find((designMethod) => designMethod === designInput.method),
          ),
          ...(typeof designInput.projectId === "string" && {
            dsProjectIdHash: shortHash(designInput.projectId),
          }),
          ...(listLength(designInput.assets) !== undefined && {
            dsAssetCount: listLength(designInput.assets),
          }),
          ...(listLength(designInput.files) !== undefined && {
            dsFileCount: listLength(designInput.files),
          }),
          ...(listLength(designInput.paths) !== undefined && {
            dsPathCount: listLength(designInput.paths),
          }),
          ...(listLength(designInput.writes) !== undefined && {
            dsWriteCount: listLength(designInput.writes),
          }),
          ...(listLength(designInput.deletes) !== undefined && {
            dsDeleteCount: listLength(designInput.deletes),
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
    logToolFileActivity(effectiveToolName, observableInput, messageId);
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
      durationMs: callDurationMs,
      ...wallClock.fields(callDurationMs, callState),
      ...(calledToolResult.detached && {
        detached: true,
      }),
      ...(callSpan !== undefined && {
        ...toolFeatureOf(toolUseContext.abortController.signal),
        durationMsAtAbort: callSpan - now_2,
      }),
      ...diffMemoryUsage(memoryBefore, memoryAfter),
      preToolHookDurationMs: hookDurationMs,
      permissionDurationMs,
      toolResultSizeBytes: hasMappedContent,
      ...resultSizeTelemetry,
      ...(resultIsMedia > 0 && {
        toolResultAttachmentBytes: resultIsMedia,
      }),
      ...measureSidecarFields(calledToolResult.data),
      ...(!shouldKeepToolResultInSubagents(toolUseContext, tool) && {
        sidecarDroppedForSubagent: true,
        ...(calledToolResult.subagentFrameResult !== undefined && {
          sidecarSmallFormOfferedForSubagent: true,
        }),
      }),
      toolInputSizeBytes: inputBytes,
      ...(mediaBlocks !== undefined && {
        fileExtension: mediaBlocks,
      }),
      ...(mediaUrls !== undefined && {
        bashCommandFileExtensions: mediaUrls,
      }),
      ...(extraMessages !== undefined && {
        filePathLen: extraMessages,
      }),
      ...(resultFiles !== undefined && {
        bashCommandLen: resultFiles,
      }),
      ...(bashClass && {
        bash_command_class: bashClass.bash_command_class,
        bash_argv0: bashClass.bash_argv0,
        ...(bashClass.bash_subcommand !== undefined && {
          bash_subcommand: bashClass.bash_subcommand,
        }),
        has_pipe: bashClass.has_pipe,
      }),
      ...resultNotes,
      ...(effectiveToolName === READ &&
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
    let cronResult;
    if (
      shouldLogGitCommitDetails(tool, callInput) &&
      calledToolResult.data &&
      typeof calledToolResult.data === "object" &&
      "stdout" in calledToolResult.data
    ) {
      let cronData =
        !("backgroundTaskId" in calledToolResult.data && calledToolResult.data.backgroundTaskId) &&
        !("interrupted" in calledToolResult.data && calledToolResult.data.interrupted === true);
      let commitInfo = await resolveCommitInfo(
        String(calledToolResult.data.stdout),
        toolUseContext.session.project?.cwd ?? null,
        cronData ? toolResult : undefined,
      );
      if (commitInfo) {
        toolInputDetailsForAnalytics.git_commit_id = commitInfo.commitId;
        if (commitInfo.branch) toolInputDetailsForAnalytics.git_branch = commitInfo.branch;
        cronResult = commitAttributes(commitInfo);
      }
    }
    let gitCommitId = getMcpToolScope(tool);
    logOTelEvent(
      "tool_result",
      {
        tool_name: sanitizeToolNameForAnalytics(tool.name),
        tool_use_id: toolUseID,
        success: "true",
        duration_ms: String(callDurationMs),
        ...(Object.keys(toolInputDetailsForAnalytics).length > 0 && {
          tool_parameters: jsonStringify(toolInputDetailsForAnalytics),
        }),
        ...(attributedFlag && {
          tool_input: attributedFlag,
        }),
        tool_input_size_bytes: String(inputBytes),
        tool_result_size_bytes: String(hasMappedContent),
        ...(decisionRecord && {
          decision_source: decisionRecord.source,
          decision_type: decisionRecord.decision,
        }),
        ...(gitCommitId && {
          mcp_server_scope: gitCommitId,
        }),
        ...cronResult,
        ...(requestId && {
          request_id: requestId,
        }),
      },
      toolUseContext.agentContext,
    );
    let toolOutput = calledToolResult.data;
    let cronSummary = cronToolCallResult(tool.name, calledToolResult.data);
    let followups = [];
    let followupCount = 0;
    let followupFailed = false;
    let followupError;
    let followupMessages = [];
    if (
      calledToolResult.classifierContext !== undefined &&
      (!tool.isMcp ||
        (mcpServerType === "sdk" &&
          tool.mcpInfo?.scope !== "project" &&
          isFirstPartyUploadScope(
            resolveMcpConnectionForTool(tool.name, toolUseContext.options.mcpClients).connection?.config,
          )))
    )
      followupMessages.push({
        value: truncateToLength(calledToolResult.classifierContext, HOST_CONTEXT_LINE_LIMIT),
        hostPrincipal: true,
        pairedRewriteSeq: 0,
      });
    let contextLayers = calledToolResult.contextLayers;
    let mcpMeta = calledToolResult.mcpMeta;
    let toolEndsTurn = calledToolResult.endsTurn;
    let toolResultRemedy = calledToolResult.remedy;
    let sandboxViolations = calledToolResult.sandboxViolations;
    let sandboxed = calledToolResult.sandboxed;
    async function addToolResult(toolUseResult, preMappedBlock) {
      let toolResultsDir = toolResultsDirFor_2(toolUseContext.session);
      let mappedPreBlock = preMappedBlock
        ? await persistLargeToolResult(preMappedBlock, tool, toolResultsDir, toolUseContext.storageV5)
        : await mapAndMaybePersistToolResult(
            tool,
            toolUseResult,
            toolUseID,
            toolResultsDir,
            toolUseContext.storageV5,
          );
      let finalBlock =
        resultNote !== undefined && !mappedPreBlock.is_error && typeof mappedPreBlock.content === "string"
          ? {
              ...mappedPreBlock,
              content: `${mappedPreBlock.content}

${resultNote}`,
            }
          : mappedPreBlock;
      let hasFollowups = followupCount !== 0 && !followupFailed;
      let contentBlocks = [
        isMcpTool(tool) || hasFollowups
          ? {
              ...finalBlock,
              content: cutOversizedResultBlocks(finalBlock.content),
            }
          : finalBlock,
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
        let imageCount = countWhere(contentBlocks_2, (imageCount) => imageCount.type === "image");
        if (imageCount > 0) imagePasteIds = makeImagePlaceholders(imageCount);
      }
      let strippedResult = toolUseResult;
      try {
        if (tool.stripForCreation) strippedResult = tool.stripForCreation(toolUseResult);
        else if (tool.stripToolUseResultAtCreation && tool.stripForStorage)
          strippedResult = tool.stripForStorage(toolUseResult, false);
      } catch (error) {
        logError(error);
        strippedResult = undefined;
      }
      if (callObserver)
        callObserver.output = {
          value: strippedResult,
        };
      strippedResult = restoreMcpResultForCopy(tool, strippedResult, mappedPreBlock, toolUseContext);
      let filtered = followupMessages.filter((followup) => {
        if (followup.pairedRewriteSeq === undefined) return true;
        if (followup.pairedRewriteSeq === 0) return followupCount === 0 || followupFailed;
        return !followupFailed && followup.pairedRewriteSeq === followupCount;
      });
      if (filtered.length < followupMessages.length)
        logForDebugging(
          `host classifier context: dropped ${followupMessages.length - filtered.length} entr(y/ies) whose paired rewrite never took effect (${followupFailed ? "rewrites reverted" : "superseded or inapplicable"}) for ${toolCategoryForTelemetry(tool)}`,
        );
      let joinedContext =
        filtered.length > 0
          ? filtered.map((followup) => followup.value).join(`
`)
          : undefined;
      let allHostPrincipals = filtered.length > 0 && filtered.every((followup) => followup.hostPrincipal);
      let classifierContext =
        joinedContext !== undefined ? truncateToLength(joinedContext, HOST_CONTEXT_LINE_LIMIT) : undefined;
      if (classifierContext !== undefined)
        if (classifierContext.length < joinedContext.length)
          logFeatureSad("auto_mode_host_context", "join_truncated");
        else logFeatureOk("auto_mode_host_context");
      let startId = createUserMessage({
        content: contentBlocks,
        imagePasteIds,
        hostClassifierContext: classifierContext,
        ...cutResultForStorage(toolUseContext, tool, hasFollowups, {
          toolUseId: toolUseID,
          toolUseResult: shouldKeepToolResultInSubagents(toolUseContext, tool) ? strippedResult : undefined,
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
        decisionRecord?.surface === "host_dialog" &&
        "acceptFeedback" in permissionDecision &&
        permissionDecision.acceptFeedback &&
        getAutoModeConfigOrDefault().typedMarks === true
      )
        startId[MESSAGE_MARK_SYMBOLS] = {
          as: "feedback",
          texts: [permissionDecision.acceptFeedback],
        };
      if (
        tool.stampsOwnResults &&
        toolUseContext.agentId === undefined &&
        assistantMessage.handedOff !== true &&
        !hasFollowups &&
        toolUseContext.options.toolCatalog.getAllBaseTools().includes(tool)
      )
        startId[BUILT_IN_TOOL_RUN_SYMBOL] = {
          toolUseId: toolUseID,
          name: tool.name,
        };
      if (codeModeAccepted() && calledToolResult.hideRow === true && !hasFollowups)
        startId.hiddenToolUseIds = [toolUseID];
      if (
        calledToolResult.subagentFrameResult !== undefined &&
        !shouldKeepToolResultInSubagents(toolUseContext, tool)
      )
        if (hasFollowups) logFeatureSad("subagent_frame_result", "hook_rewrote_output");
        else if (followupError !== undefined) logFeatureSad("subagent_frame_result", followupError);
        else {
          Object.assign(startId, asSubagentFrameResult(calledToolResult.subagentFrameResult));
          logFeatureOk("subagent_frame_result");
        }
      if (
        codeModeAccepted() &&
        calledToolResult.detachedToolUseIds !== undefined &&
        calledToolResult.detachedToolUseIds.length > 0
      )
        startId.detachedToolUseIds = [...calledToolResult.detachedToolUseIds];
      if (
        startId.hostClassifierContext !== undefined &&
        allHostPrincipals &&
        !toolUseContext.abortController.signal.aborted &&
        getClassifierEpoch() === classifierEpoch &&
        !isLiveHostContextDisabled()
      )
        registerClassifiedRun(startId);
      messages.push({
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
          durationMs: callDurationMs,
        },
      });
    }
    if (calledToolResult.detached) {
      await addToolResult(DETACHED_TOOL_CALL_FLAG, preMappedBlock);
      if (preventContinuation && !toolUseContext.abortController.signal.aborted)
        pushHookStoppedContinuation(messages, {
          toolName: tool.name,
          toolUseID,
          message: stopReason || "Execution stopped by hook",
        });
      return messages;
    }
    let unusedShape;
    if (codeModeAccepted() && toolUseContext.abortController.signal.aborted) {
      let chunkModule = require("../../tools/REPLTool/stopReport.js");
      if (chunkModule.isStoppedReplResult(tool.name, calledToolResult.data))
        unusedShape = toolUseContext.stoppedResultWait?.(toolUseID);
    }
    let stoppedWait = [];
    let postToolHookStart = Date.now();
    let outputModified = false;
    let didRewriteOutput = false;
    let followupsStarted =
      isAccepted() &&
      tool.name === REPL_TOOL_NAME &&
      !tool.mcpInfo &&
      require("../../utils/codeMode/receiptEvalId.js").receiptEvalIdOf(calledToolResult.data) !== undefined;
    for await (let followup of followupsStarted
      ? []
      : runPostToolUseHooks(
          codeModeAccepted() && unusedShape !== undefined
            ? {
                ...toolUseContext,
                abortController: unusedShape.hookController,
              }
            : toolUseContext,
          tool,
          toolUseID,
          assistantMessage.message.id,
          observableInput,
          toolOutput,
          requestId,
          mcpServerType,
          mcpServerBaseUrl,
          callDurationMs,
          {
            managedHooksExcluded:
              toolUseContext.managedPass?.toolUseId === toolUseID &&
              shouldKeepToolResultInSubagents(toolUseContext, tool),
          },
        )) {
      outputModified = true;
      if ("updatedToolOutput" in followup) {
        toolOutput = followup.updatedToolOutput;
        didRewriteOutput = true;
        followupCount += 1;
      } else if ("classifierContext" in followup)
        followupMessages.push({
          ...followup.classifierContext,
          pairedRewriteSeq:
            followup.pairing === "none"
              ? undefined
              : followup.pairing === "pending" && followupCount > 0
                ? followupCount
                : -1,
        });
      else {
        followups.push(followup);
        if (followup.message.type === "attachment") {
          let att = followup.message.attachment;
          if (
            "command" in att &&
            att.command !== undefined &&
            "durationMs" in att &&
            att.durationMs !== undefined
          )
            stoppedWait.push({
              command: att.command,
              durationMs: att.durationMs,
            });
        }
      }
    }
    let postHookElapsedMs = Date.now() - postToolHookStart;
    if (outputModified) {
      let modifiedFileNote = await noteHookModifiedFile(
        tool.name,
        toolUseID,
        observableInput,
        toolUseContext.readFileState,
      );
      if (modifiedFileNote)
        followups.push({
          message: modifiedFileNote,
        });
    }
    if (
      calledToolResult.subagentFrameResultHolds !== undefined &&
      !shouldKeepToolResultInSubagents(toolUseContext, tool)
    ) {
      try {
        if (!(await calledToolResult.subagentFrameResultHolds())) followupError = "tool_says_stale";
      } catch (error) {
        logError(error);
        followupError = "check_threw";
      }
      if (followupError !== undefined)
        logForDebugging(
          `${toolCategoryForTelemetry(tool)}: subagentFrameResult not sent (${followupError}): the tool's check did not confirm that it still describes what the call left behind`,
        );
    }
    if (postHookElapsedMs >= ISOLATION_TIMEOUT_MS)
      logForDebugging(
        `Slow PostToolUse hooks: ${postHookElapsedMs}ms for ${toolCategoryForTelemetry(tool)} (${stoppedWait.length} hooks)`,
        {
          level: "info",
        },
      );
    if (isMcpTool(tool)) {
      await addToolResult(attributeScheduledPlugin(tool.name, cronSummary, toolOutput));
      let frameKey = isDocsConnectorTool(tool, toolUseContext.getAppState().mcp.clients)
        ? readFirstJsonPayload(calledToolResult.data)
        : null;
      if (frameKey !== null)
        import("../artifacts/AUTO_REPLIES_ARMED_TOKEN.lazy.js")
          .then((artifactModule) =>
            artifactModule.touchFrameLiveForMcpWrite(
              frameKey,
              toolUseContext,
              artifactModule.makeArtifactReadVersionReader(toolUseContext.getAppState, frameKey),
            ),
          )
          .catch(logError);
    } else {
      let preMappedBlock_2 = preMappedBlock;
      if (didRewriteOutput) {
        if (
          codeModeAccepted() &&
          tool.name === REPL_TOOL_NAME &&
          calledToolResult.data !== null &&
          typeof calledToolResult.data === "object" &&
          calledToolResult.data.asyncDispatched === true &&
          toolOutput !== null &&
          typeof toolOutput === "object"
        )
          toolOutput = {
            ...toolOutput,
            asyncDispatched: true,
          };
        let outputCheck = tool.outputSchema?.safeParse(toolOutput);
        let logInvalidOutput = (reason, detail) => {
          logForDebugging(
            `PostToolUse hook returned updatedToolOutput that does not match ${toolCategoryForTelemetry(tool)}'s output shape: reason=${reason} detailChars=${detail.length}`,
            {
              level: "error",
            },
          );
          toolOutput = calledToolResult.data;
          followupFailed = true;
          let pairedCount = countWhere(
            followupMessages,
            (followup) => followup.pairedRewriteSeq === followupCount,
          );
          followups.push({
            message: createAttachmentMessage_2({
              type: "hook_error_during_execution",
              content: `PostToolUse hook returned updatedToolOutput that does not match ${tool.name}'s output shape; using original output.${pairedCount > 0 ? " A host-asserted classifier context attached by the same hook was discarded with the rejected rewrite." : ""} ${detail}`,
              hookName: `PostToolUse:${tool.name}`,
              toolUseID,
              hookEvent: "PostToolUse",
            }),
          });
        };
        if (outputCheck && !outputCheck.success)
          logInvalidOutput(
            `schema_invalid issues=${normalizeCaseForComparison_2(outputCheck.error.issues.map((issue) => issue.code)).join(",")}`,
            outputCheck.error.message,
          );
        else
          try {
            let remappedOutput = toolOutput;
            if (tool.restoreTransientForRemap)
              try {
                remappedOutput = tool.restoreTransientForRemap(calledToolResult.data, toolOutput);
              } catch (error) {
                logError(error);
                remappedOutput = toolOutput;
              }
            let detail = tool.mapToolResultToToolResultBlockParam(remappedOutput, toolUseID);
            if (detail === undefined) logInvalidOutput("mapper_undefined", "mapper returned undefined");
            else preMappedBlock_2 = detail;
          } catch (error) {
            logInvalidOutput("mapper_throw", formatToolErrorMessage(error));
          }
      }
      await addToolResult(attributeScheduledPlugin(tool.name, cronSummary, toolOutput), preMappedBlock_2);
    }
    if (tool.name === READ && calledToolResult.data && typeof calledToolResult.data === "object") {
      let cachedReadingLimit = getCachedReadingLimit(calledToolResult.data);
      if (cachedReadingLimit !== undefined)
        messages.push({
          message: createAttachmentMessage_2({
            type: "read_truncation_notice",
            banner: cachedReadingLimit,
            toolUseID,
          }),
        });
    }
    if (shouldAddBashAudienceNote(tool.name, calledToolResult.data, getMainLoopModel_2(toolUseContext)))
      messages.push({
        message: createAttachmentMessage_2({
          type: "bash_output_audience_note",
          toolUseID,
        }),
      });
    let resultCommitted =
      getAbortKind(
        toolUseContext.abortController.signal,
        {
          name: tool.name,
          ran: true,
          ...(codeModeAccepted() && {
            asyncReplReceipt: require("../../utils/codeMode/asyncReplReceipt.js").isAsyncReplReceipt(
              calledToolResult.data,
            ),
          }),
        },
        abortScopeOf(toolUseContext),
      ) !== null;
    for (let followup of followups) messages.push(followup);
    let message = [
      ...(calledToolResult.newMessages ?? []),
      ...(codeModeAccepted() && calledToolResult.messagesFromOutput
        ? calledToolResult.messagesFromOutput(toolOutput)
        : []),
    ];
    if (message.length > 0)
      for (let hookResult of message)
        if (hookResult.type === "user") {
          let message = {
            ...hookResult,
            turnCompanion: true,
          };
          messages.push({
            message,
          });
        } else
          messages.push({
            message: hookResult,
          });
    if (preventContinuation && !toolUseContext.abortController.signal.aborted)
      pushHookStoppedContinuation(messages, {
        toolName: tool.name,
        toolUseID,
        message: stopReason || "Execution stopped by hook",
      });
    let stoppedResult =
      codeModeAccepted() &&
      unusedShape !== undefined &&
      !unusedShape.hookController.signal.aborted &&
      unusedShape.keep(() => runAfterResultCommitted(calledToolResult, false, logError));
    runAfterResultCommitted(calledToolResult, stoppedResult || resultCommitted, logError);
    return messages;
  } catch (error) {
    let errorDurationMs = Date.now() - now_2;
    wallClock.settle();
    let memoryAfter = memorySampler.sample("after_throw");
    addToToolDuration(errorDurationMs);
    let wasCanceled = isAbortOrCancelError(error);
    if (!callFailed)
      logForDebugging(
        `[Stall] tool_dispatch_end tool=${toolCategoryForTelemetry(tool)} toolUseId=${toolUseID} outcome=${wasCanceled ? "aborted" : "error"} durationMs=${errorDurationMs}`,
        {
          level: wasCanceled ? "info" : "warn",
        },
      );
    else
      logForDebugging(
        `[Stall] tool_dispatch_post_error tool=${toolCategoryForTelemetry(tool)} toolUseId=${toolUseID} durationMs=${errorDurationMs}`,
        {
          level: "warn",
        },
      );
    let errorText = errorMessage(error);
    let errorKind = classifyToolError(error);
    if (memoryTool)
      noteToolTexts(
        observableInput,
        error instanceof McpToolCallError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS ? errorText : undefined,
      );
    let loggedError =
      accountMemoryTool || withholdsFileRefs || withholdsFileReferenceErrors(tool, toolUseID)
        ? error instanceof Error
          ? describeErrorWithoutText(error)
          : notRecordedLength(errorText)
        : errorText;
    endToolExecutionSpan({
      success: false,
      interrupted: getInterruptKind(error, toolUseContext.abortController.signal) !== undefined,
      error: isToolDetailsLoggingEnabled() ? loggedError : errorKind,
      errorClass: errorKind,
    });
    endToolSpan(span);
    if (error instanceof McpAuthError)
      toolUseContext.session.mcpSessionWiring.connections()?.markNeedsAuth(error.serverName);
    let isFallbackDiscard = isServerFallbackDiscard(toolUseContext.abortController.signal);
    let commonFields = {
      messageID: sanitizeMarkName(messageId),
      toolName: sanitizeToolNameForAnalytics(tool.name),
      toolUseID: sanitizeMarkName(toolUseID),
      isMcp: tool.isMcp ?? false,
      toolInputSizeBytes: inputBytes,
      ...(!callFailed && {
        durationMs: errorDurationMs,
        ...wallClock.fields(errorDurationMs, callState),
        preToolHookDurationMs: hookDurationMs,
        permissionDurationMs,
        ...toolFeatureOf(toolUseContext.abortController.signal),
        ...(callSpan !== undefined && {
          durationMsAtAbort: callSpan - now_2,
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
    if (!isFallbackDiscard && !wasCanceled) {
      let { code, isSad } = classifyToolErrorCode(error);
      logForDebugging(
        `${toolCategoryForTelemetry(tool)} tool error (${errorDurationMs}ms): code=${code} type=${errorKind} errorChars=${errorText.length}`,
      );
      if (isSad) logFeatureSad(errorContent, code);
      else {
        let error_2 = toError(error);
        logError(
          "telemetryMessage" in error_2
            ? error_2
            : withTelemetryMessage(error_2, `tool.call threw (${errorKind})`),
        );
        logFeatureBad(errorContent, code);
      }
      let mcpErrorSource = tool.isMcp === true ? classifyMcpErrorSourceCategory(error) : undefined;
      logEvent("tengu_tool_use_error", {
        ...commonFields,
        error: errorKind,
        ...errorTelemetryFields(error),
        errorCode: errorKind,
        ...(mcpErrorSource !== undefined && {
          mcpErrorSource: fromEnum(mcpErrorSource),
        }),
        ...diffMemoryUsage(memoryBefore, memoryAfter),
        ...(tool.name === DESIGNSYNC && {
          dsMethod: fromEnumOpt(DESIGNSYNC_METHODS.find((prevState) => prevState === observableInput.method)),
        }),
        ...(tool.name === WEBSEARCH && !tool.isMcp && getWebSearchModeAnalytics(observableInput, input)),
        ...(toolUseContext.options.messageClientPlatform && {
          messageClientPlatform: entrypointForTelemetry(toolUseContext.options.messageClientPlatform),
        }),
      });
      if (!callFailed && mcpErrorSource === "downstream_unreachable")
        logForDiagnosticsNoPII("warn", "mcp_tool_call_unreachable", () => ({
          transport: mcpServerType ?? "unknown",
          error_class: errorKind.replace(":", "_"),
          error_code: sanitizeErrnoForTelemetry(error) ?? "missing",
          duration_ms: errorDurationMs,
        }));
      let errorMsg = getMcpToolScope(tool);
      logOTelEvent(
        "tool_result",
        {
          tool_name: sanitizeToolNameForAnalytics(tool.name),
          tool_use_id: toolUseID,
          success: "false",
          duration_ms: String(errorDurationMs),
          error_type: errorKind,
          ...(isToolDetailsLoggingEnabled() && {
            error: loggedError,
          }),
          ...(Object.keys(toolInputDetailsForAnalytics).length > 0 && {
            tool_parameters: jsonStringify(toolInputDetailsForAnalytics),
          }),
          ...(attributedFlag && {
            tool_input: attributedFlag,
          }),
          tool_input_size_bytes: String(inputBytes),
          ...(decisionRecord && {
            decision_source: decisionRecord.source,
            decision_type: decisionRecord.decision,
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
    } else if (!isFallbackDiscard && !callFailed) logEvent("tengu_tool_use_interrupted", commonFields);
    let error_2 = toolErrorTextForAbort(error, toolUseContext.abortController.signal);
    let mcpMeta =
      error instanceof McpToolCallError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS ? error.mcpMeta : undefined;
    let failureHookResults = [];
    for await (let hookResult of runPostToolUseFailureHooks(
      toolUseContext,
      tool,
      toolUseID,
      messageId,
      observableInput,
      error_2,
      wasCanceled || isFallbackDiscard,
      requestId,
      mcpServerType,
      mcpServerBaseUrl,
      errorDurationMs,
    ))
      failureHookResults.push(hookResult);
    if (isFallbackDiscard)
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
    let serverTypeForCall =
      getAbortKind(
        toolUseContext.abortController.signal,
        {
          name: tool.name,
          ran: true,
        },
        abortScopeOf(toolUseContext),
      ) !== null;
    let extraMessages = [];
    let resultWaitKept =
      error instanceof McpToolCallError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS &&
      !isHookCallerVirtualTool(assistantMessage, toolUseContext)
        ? toolSchemaNotInPromptNote(tool, toolUseContext)
        : null;
    if (resultWaitKept !== null)
      logEvent("tengu_deferred_tool_schema_not_sent", {
        toolName: sanitizeToolNameWithMcpFlag(tool.name, tool.isMcp === true),
        isMcp: tool.isMcp ?? false,
      });
    messages.push(
      {
        message: createUserMessage({
          content: [
            {
              type: "tool_result",
              content: error_2 + (resultWaitKept ?? ""),
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
          durationMs: callError ?? errorDurationMs,
        },
      },
      ...extraMessages,
      ...failureHookResults,
    );
    if (preventContinuation && !wasCanceled && !toolUseContext.abortController.signal.aborted)
      pushHookStoppedContinuation(messages, {
        toolName: tool.name,
        toolUseID,
        message: stopReason || "Execution stopped by hook",
      });
    runAfterResultCommitted(error, serverTypeForCall, logError);
    return messages;
  } finally {
    if (toolResult !== undefined) releaseHeadReflogMark(toolResult);
    onStreamProgress();
    if (decisionRecord) toolUseContext.toolDecisions.delete(toolUseID);
  }
}
export {
  getRequestTimingStore,
  waitForMcpToolServer,
  aliasOrSelf,
  findLongestPrefixClients,
  getMcpServerBaseUrlFromToolName,
  clearCutResults,
  classifyToolError,
  runToolUse,
  hasTypeField,
  isPendingMcpToolName,
  getCancelMessage,
  TOOL_CALL_SITE_RULES,
  takeCutResult,
  isCacheMissReason,
  shouldWaitForMcpTool,
  isAbortOrCancelError,
  classifyToolErrorCode,
  toolFeatureName,
  restoreCallInput,
  runValidateInput,
  buildDenyRuleDecisionRecord,
  buildPermissionDecisionRecord,
  buildDeniedDecisionRecord,
  getToolDecisionForOTel,
  settleUnaskedQuestion,
  isHookCallerVirtualTool,
  getNotLoadedToolVerdict,
  logNotLoadedCheckFailure,
  isCallDirectoryUnchanged,
  CALL_DIRECTORY_CHANGED_MESSAGE,
  getInterruptKind,
  describeUnknownTool,
  resolveUnknownToolSafe,
  emitToolHeartbeat,
};
