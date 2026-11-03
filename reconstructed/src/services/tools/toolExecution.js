/**
 * services/tools/toolExecution.ts
 *
 * 单次工具调用的生命周期：输入 JSON/schema 校验、validateInput、PreToolUse hooks、权限决策、tool.call、结果映射与持久化、PostToolUse hooks、遥测；runToolUse 入口（chunk-e6aww6q8#$B）在 _unattributed
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/services/tools/toolExecution.ts
 * pieces: chunk-bk5ntezz.js (1), chunk-e6aww6q8.js (123)
 * attribution: fingerprint 8, placement 101, layout 15
 */
import {
  AsyncLocalStorage,
  AsyncLocalStorage as AsyncLocalStorage_2,
  AsyncLocalStorage as AsyncLocalStorage_3,
  AsyncLocalStorage as AsyncLocalStorage_4,
  AsyncLocalStorage as AsyncLocalStorage_5,
  AsyncLocalStorage as AsyncLocalStorage_6,
  AsyncLocalStorage as AsyncLocalStorage_7,
  AsyncLocalStorage as AsyncLocalStorage_8,
} from "async_hooks";
import {
  randomUUID,
  randomUUID as randomUUID_2,
  randomUUID as randomUUID_3,
  randomUUID as randomUUID_4,
  randomUUID as randomUUID_5,
  randomUUID as randomUUID_6,
  randomUUID as randomUUID_7,
  randomUUID as randomUUID_8,
  randomUUID as randomUUID_9,
  randomUUID as randomUUID_10,
  randomUUID as randomUUID_11,
  randomUUID as randomUUID_12,
  randomUUID as randomUUID_13,
  randomUUID as randomUUID_14,
  randomUUID as randomUUID_15,
  randomUUID as randomUUID_16,
  randomUUID as randomUUID_17,
  randomUUID as randomUUID_18,
  randomUUID as randomUUID_19,
  randomUUID as randomUUID_20,
  randomUUID as randomUUID_21,
  randomUUID as randomUUID_22,
  randomUUID as randomUUID_23,
  randomUUID as randomUUID_24,
  randomUUID as randomUUID_25,
  randomUUID as randomUUID_26,
  randomUUID as randomUUID_27,
  randomUUID as randomUUID_28,
  randomUUID as randomUUID_29,
  randomUUID as randomUUID_30,
  randomUUID as randomUUID_31,
  randomUUID as randomUUID_32,
  randomUUID as randomUUID_33,
  randomUUID as randomUUID_34,
  randomUUID as randomUUID_35,
  randomUUID as randomUUID_36,
  randomUUID as randomUUID_37,
  randomUUID as randomUUID_38,
  randomUUID as randomUUID_39,
  randomUUID as randomUUID_40,
  randomUUID as randomUUID_41,
  randomUUID as randomUUID_42,
  randomUUID as randomUUID_43,
  randomUUID as randomUUID_44,
  randomUUID as randomUUID_45,
  randomUUID as randomUUID_46,
  randomUUID as randomUUID_47,
  randomUUID as randomUUID_48,
  randomUUID as randomUUID_49,
  randomUUID as randomUUID_50,
} from "crypto";
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
  toolResultsDirFor,
  processToolResultBlock,
} from "../../utils/toolResultStorage.js";
import { Tle, Yoo } from "../../constants/outputLimits.js";
import { isTextBlock } from "../../utils/messages/textLineCount.js";
import { truncateToLength } from "../../utils/stringUtils.js";
import { zLe, Mht, Pht } from "../../plugins/functionHooks/toolCallHooks.js";
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
  $Nn,
  makeErrorResultAppender,
  dropBlockingErrors,
  VN,
  INn,
  Zqr,
  fVr,
  runPostToolUseHooksForMemory,
  ANn,
  iVr,
  PNn,
  findToolResultBlock,
  replaceToolResult,
  isHookStoppedMessage,
  buildHookStoppedMessage,
  YN,
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
  beo,
  oxt,
  COM_ANTHROPIC_SOURCES_RELAY,
  COM_ANTHROPIC_PLUGIN_META_CUT,
  nSi,
  m3t,
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
  pPn,
  gue,
} from "../../utils/messages.js";
import { wAn } from "../../plugins/functionHooks/hostBridge.js";
import { asStringList, UI_ENV_SITE_RULES } from "../../plugins/functionHooks/sites/siteRules.js";
import { logError } from "../../utils/log.js";
import { o } from "../../../vendor/zod/v4/classic/schemas.js";
import { env } from "../../utils/env.js";
import { logEvent } from "../analytics/index.js";
import { fwr, gl, Ido, pwr } from "../../utils/cwd.js";
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
import {
  fromSanitizer_SANITIZER_OUTPUT_ONLY,
  concatSafe,
  lit as lit_2,
  fromEnum,
  fromEnumOpt,
  fromEnumArr,
} from "../analytics/safeMetadata.js";
import { isPlainObject as isPlainObject_4 } from "../../utils/isPlainObject.js";
import {
  latestPromptSnapshot,
  recordedDeferredTools,
} from "../../utils/contextAttachments/promptSnapshot.js";
import { QSe, JSe, withPlanPath } from "../../utils/api.js";
import { jsonStringify, jsonStringifyRaw, clone } from "../../utils/slowOperations.js";
import {
  CAN_USE_TOOL_ABORTED_REASON,
  CIRCUIT_BREAKER_TRAITS,
  isInvalidInputDeny,
} from "../../types/permissions.js";
import {
  AL,
  getDenyRuleForTool,
  ebe,
  consumeRepeatedToolCall,
  obe,
  arePermissionHooksUnsettled,
} from "../../utils/permissions/permissions.js";
import { voe } from "./_new/toolExecution.helpers-e6aw.js";
import { findDecidingRule } from "../../components/permissions/PermissionDecisionDebugInfo.js";
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
import { Aro, Cro } from "../routines/routinesApi.js";
import { isChromeToolName, uae } from "../../utils/claudeInChrome/chromeToolNames.js";
import { Wjr } from "../../utils/permissions/browserComputerUseTools.js";
import { TOOL_SEARCH_TOOL_NAME, isDeferredToolInConversation } from "../../tools/ToolSearchTool/prompt.js";
import { SessionRootSlot, cke } from "../../bootstrap/sessionSlices.js";
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
import { vdi } from "../../utils/jsonScan.js";
import {
  CLAUDE_ENDTURN,
  CLAUDE_ENDTURNHONORSSTOPHOOKS,
  formatMcpStructuredContent,
} from "./mcpResultMeta.js";
import { Vme } from "../../plugins/functionHooks/sessionApi.js";
import { CLAUDE_DEVICE, R_r, isAutoAllowedInMode } from "../../utils/permissions/browserToolNames.js";
import { findToolByName, runAfterResultCommitted } from "../../Tool.js";
import { currentMcpClients } from "../compact/idleToolResultClearing.js";
import {
  getConnectionTimeoutMs,
  McpAuthError,
  McpToolCallError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS,
  n4e,
  describeMissingRequiredArgs,
} from "../mcp/client.js";
import { sleep } from "../../utils/sleep.js";
import { isUnparsedInputMarker, DJt } from "../../utils/json.js";
import { getMemoryBaseDir } from "../../tools/FileEditTool/utils.js";
import {
  isRemoteOnlyCheck,
  getCheckRunner,
  getRegisteredCheck,
  forgetPendingCheck,
} from "../../utils/permissions/checkRegistry.js";
import { yO, Cf, splitHostField } from "../../bridge/deviceRegistration.js";
import { expandStablePath, NullBytePathError, UnstablePathError } from "../../utils/path.js";
import { isPathWithinCaseAware } from "../../utils/pathPrefix.js";
import { startSessionActivity, endActivity, V_i } from "../../utils/sessionActivity.js";
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
import { qS, l$e, jW } from "../api/deferredToolsState.js";
import {
  dPe,
  ENn,
  Lqr,
  logToolSafetyEvent,
  logHookPushbacks,
  rebaseBatchHookOrigins,
  logToolDecision,
  toDecisionRecord,
} from "./toolDecisionTelemetry.js";
import { mSe } from "../artifacts/rosterWait.js";
import {
  isBuiltInArtifactHiddenForMcp,
  ARTIFACTS_MCP_READ_TOOL,
  ARTIFACTS_MCP_GET_TOOL,
  ARTIFACTS_MCP_READ_SHARED_TOOL,
} from "../artifacts/artifactsMcpTools.js";
import { gn } from "../../utils/shortHash.js";
import { ye } from "../../utils/startupMarks.js";
import {
  getSubagentTelemetryFields,
  getBackgroundAgentId,
  isDelegatedObservationContext,
} from "../../utils/agentContext.js";
import { yW } from "../api/logging.js";
import { safeOrigin } from "../mcp/ccrMcpUrls.js";
import { gH } from "../mcp/claudeai.js";
import { isCancel } from "../../../vendor/axios/dist/esm/axios.js";
import { formatToolErrorMessage, formatZodValidationError } from "../../utils/toolErrors.js";
import { MaxFileReadTokenExceededError } from "../../tools/FileReadTool/FileReadTool.js";
import { KNOWN_ERROR_CLASS_NAMES } from "../../utils/telemetry/errorClassNames.js";
import { WEBFETCH } from "../../tools/WebFetchTool/prompt.js";
import { op, mn } from "../../utils/remoteEnvironment.js";
import {
  ARTIFACT_TOOL_NAME as ARTIFACT_TOOL_NAME_2,
  parseArtifactUrlInput,
} from "../../tools/ArtifactTool/constants.js";
import { Aqe, i$e } from "./batchTools.js";
import { toolMatchesAnyName } from "./permissionCheckGuard.js";
import { Akt, Unr, EXTERNAL_ALWAYS_AVAILABLE_TOOLS } from "../../utils/toolPool.js";
import { POLL } from "../../tools/PollTool/prompt.js";
import { BRIEF_TOOL_NAME as BRIEF_TOOL_NAME_2 } from "../../tools/BriefTool/prompt.js";
import { GET_TASK_TOOL_TEXT, Dpi } from "../../remote/tools/nativeToolErrors.js";
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
import { qYr, describeToolAvailability } from "../mcp/mcpToolAvailability.js";
import { SENDMESSAGE } from "../../tools/SendMessageTool/constants.js";
import {
  isToolOmittedByLaunchToolList,
  isOutsideLaunchToolList,
} from "../../utils/permissions/filterToolsByDenyRules.js";
import { ASKUSERQUESTION } from "../../tools/AskUserQuestionTool/prompt.js";
import { GLOB_TOOL_NAME } from "../../tools/GlobTool/prompt.js";
import { GREP_TOOL_NAME } from "../../tools/GrepTool/prompt.js";
import { CHROME_TOOL_NAMES } from "../../utils/claudeInChrome/common.js";
import { isPlainObject as isPlainObject_3 } from "../../utils/objectUtils.js";
import { appToolServerErrorSuffix } from "../mcp/appToolServerErrors.js";
import { WAITFORMCPSERVERS } from "../../tools/WaitForMcpServersTool/WaitForMcpServersTool.js";
import { normalizeNameForMCP } from "../mcp/normalization.js";
import { ZR } from "../../history.js";
import { POWERSHELL_TOOL_NAME } from "../../tools/PowerShellTool/toolName.js";
import { isGitCommitCommand, resolveCommitInfo } from "../../tools/shared/gitOperationTracking.js";
import { profileCheckpoint_2 } from "../../utils/startupProfiler.js";
import { Etr, waitForAttachmentFiles } from "../../bridge/attachmentFilesWait.js";
import { kGr, waitForStagedToolCallFiles } from "../../utils/ccrStageFiles.js";
import {
  createCancelledToolResult,
  v3r,
  findToolResultMessages,
  T3r,
  DY,
  noteToolTexts,
} from "../../plugins/functionHooks/toolApi.js";
import { Hrt, Tbn } from "../api/declaredToolSet.js";
import { D7s } from "../compact/keptTools.js";
import { isConnectedOrCached } from "../../skills/bundled/scheduleRemoteAgents.js";
import {
  checkWebIsolation,
  webIsolationModule,
  ISOLATION_TIMEOUT_MS,
  ISOLATION_NEUTRAL_TOOLS,
  CORE_FILE_TOOLS,
  WEB_TOOLS,
} from "./webToolIsolation.js";
import { jXt, routeToolCallWithAdoption, OSe } from "../../utils/remoteTools/toolHostRouting.js";
import { Stream } from "../../utils/stream.js";
import {
  describeCoordinatorRefusal,
  Bnr,
  checkCoordinatorShellCommand,
  bsi,
} from "../../tools/ReadNotificationsTool/ReadNotificationsTool.js";
import { clearToolUsePermissionState } from "../../components/permissions/hooks.js";
import { toolCategoryForTelemetry } from "../api/toolDefinitionShape.js";
import {
  tze,
  isClassifierTargetToolUse,
  nze,
  getPermissionModeAtRequestForArbiter,
  describeInputRewrite,
  _Kt,
  SKt,
  applyServerClassifierVerdict,
} from "../../utils/permissions/serverClassifier/arbiter.js";
import { isAutoClassifierActive } from "../../utils/permissions/autoModeState.js";
import { getServerClassifierFallbackMode } from "../../utils/permissions/serverClassifier/flags.js";
import { eP, getSurfacedToolNames } from "../../bootstrap/stateSlices.js";
import { guardAccountMemoryHookRewrite } from "../../utils/hooks/hookUpdatedInput.js";
import { hasModuleHookingSite } from "../../plugins/hooksModules/loadedModuleFilters.js";
import { W$n } from "../../plugins/functionHooks/eventCatalog.js";
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
import { S3e, _tn } from "../../utils/conversationRecovery.js";
import { OTi } from "../analytics/juniperShoalConfig.js";
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
import { kR } from "../../../vendor/zod/v4/classic/errors.js";
import {
  stripUnchangedHostOwnedKeys,
  stripHostOwnedInputKeys,
} from "../../utils/permissions/permissionAnswer.js";
import { notRecordedLength } from "../../utils/telemetry/accountMemoryRedaction.js";
import { Xli } from "../../bridge/createSession.js";
import { INJECTED_MACHINE_REFUSAL } from "../../utils/toolUseDisplay.js";
import { markHeadReflog, releaseHeadReflogMark } from "../../utils/git/gitFilesystem.js";
import { BashRepeatMeter } from "../../tools/BashTool/repeatMeter.js";
import { detachToolCall, runDetachableToolCall, zsn, noteHookModifiedFile } from "./detachedToolCalls.js";
import { waitForFolderAttached } from "../../utils/remoteTools/folderTargets.js";
import { NOTEBOOK_EDIT_TOOL_NAME } from "../../tools/NotebookEditTool/constants.js";
import { w8e } from "../../utils/permissions/permissionRuleParser.js";
import { DESIGNSYNC, v_n } from "../../tools/DesignSyncTool/DesignSyncTool.js";
import { WEBSEARCH, getWebSearchModeAnalytics } from "../../tools/WebSearchTool/prompt.js";
import { commitAttributes } from "../../utils/telemetry/repositoryAttributes.js";
import { qkt } from "../mcp/fileReference/fileReferencePolicy.js";
import { q0, Jge } from "../../utils/permissions/classifierHostContext.js";
import { getAutoModeConfigOrDefault } from "../../utils/permissions/permissionSetup.js";
import { gge } from "../../utils/messageKinds.js";
import { isDocsConnectorTool, readFirstJsonPayload } from "../mcp/resultContent.js";
import { zfr } from "../../tools/FileReadTool/limits.js";
import { getAbortKind } from "./toolAbort.js";
import { Vun } from "../../utils/abortReasons.js";
import { rY } from "../mcp/mcpResultErrors.js";
import { logForDiagnosticsNoPII } from "../../utils/diagLogs.js";
import { L, INSTRUCTIONS, PERSON, CLAUDE, SUMMARY, OTHER } from "../../skills/bundled/explainUsage.js";

//@ chunk-e6aww6q8.js:3783493-3783547 placement
function BNn(e, n) {
  return UNn(e) && yPe(n) ? { ...n } : void 0;
}
/**
 * 定时任务触发的工具调用：按对应会话定时任务（或当前调度插件）修正结果里的 plugin 归属。
 */
//@ chunk-e6aww6q8.js:3783547-3783707 placement
function attributeScheduledPlugin(e, n, r) {
  if (!UNn(e) || !yPe(r)) return r;
  let s = getCronTaskPlugin(yPe(n) ? n : r) ?? getScheduledByPlugin();
  if (r.plugin === s) return r;
  let { plugin: plugin, ...y } = r;
  return s === void 0 ? y : { ...y, plugin: s };
}
//@ chunk-e6aww6q8.js:3783707-3783745 placement
function UNn(e) {
  return e === CRON_CREATE_TOOL_NAME || e === SCHEDULE_WAKEUP_TOOL_NAME;
}
//@ chunk-e6aww6q8.js:3783745-3783817 placement
function yPe(e) {
  return typeof e === "object" && e !== null && !Array.isArray(e);
}
//@ chunk-e6aww6q8.js:3783817-3783966 placement
function getCronTaskPlugin(e) {
  if (!yPe(e)) return;
  return getSessionCronTasks().find((n) =>
    typeof e.id === "string" ? n.id === e.id : n.kind === "loop" && n.scheduledFor === e.scheduledFor,
  )?.plugin;
}
/**
 * MCP 结果被持久化或截断标签替换时，为副本保留原始结果的截断版本（钩子调用的除外）。
 */
//@ chunk-e6aww6q8.js:3783966-3784199 placement
function restoreMcpResultForCopy(e, n, { content: content }, { hookCaller: hookCaller }) {
  return e.isMcp === !0 &&
    hookCaller === void 0 &&
    typeof content === "string" &&
    content !== n &&
    ((content.startsWith(PERSISTED_OUTPUT_TAG) && content.endsWith(PERSISTED_OUTPUT_CLOSING_TAG)) ||
      (content.startsWith(TRUNCATED_OUTPUT_TAG) && content.endsWith(TRUNCATED_OUTPUT_CLOSING_TAG)))
    ? truncateResultForCopy(n, content.startsWith(TRUNCATED_OUTPUT_TAG) ? Math.min(content.length, Tle) : Tle)
    : n;
}
//@ chunk-e6aww6q8.js:3784199-3784210 placement
var Bst = 32;
/**
 * 按字符预算截断结果中的文本块，超出部分用"[N more characters are not kept on this copy]"说明。
 */
//@ chunk-e6aww6q8.js:3784210-3784705 placement
function truncateResultForCopy(e, n = Tle) {
  let r = typeof e === "string" ? [{ type: "text", text: e }] : e;
  if (!Array.isArray(r)) return e;
  let s = n + Bst,
    h = 0,
    y = !1,
    S = [];
  for (let w of r) {
    if (!isTextBlock(w)) {
      S.push(w);
      continue;
    }
    let L = s - Bst;
    if (w.text.length <= L) {
      ((s -= w.text.length + Bst), S.push(w));
      continue;
    }
    if (w.text === "") continue;
    let G = L > 0 ? truncateToLength(w.text, L) : "";
    if (((h += w.text.length - G.length), (s = 0), (y = !0), G !== "")) S.push({ ...w, text: G });
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
/**
 * 运行 tool.call 钩子链；对账户记忆服务器的调用，钩子的代答会被记录并警告。
 */
//@ chunk-e6aww6q8.js:3784705-3787120 placement
async function runToolCallHooks(
  e,
  { runs: runs, thrown: thrown, managedRan: managedRan, undelivered: undelivered },
  { tool: tool, input: input, toolUseContext: toolUseContext, assistantMessage: assistantMessage, now: now },
) {
  let tool_use_id = input.tool_use_id;
  zLe(tool_use_id);
  let of = runs.of(e.ref),
    Se = thrown();
  if (Se !== void 0 && toolUseContext.abortController.signal.aborted && isAbortError(Se.error))
    throw Se.error;
  let we = of !== void 0 && isRunUnchanged(e, of.made),
    Ee = $Nn(tool, e, we);
  if (Ee)
    logForDebugging(
      `tool.call ${tool.name} ${tool_use_id}: a hooks module answered for the account memory server; its answer was dropped`,
      { level: "warn" },
    );
  let Ae = we ? of : Ee ? runs.last() : void 0;
  if (Ee && Ae === void 0)
    return makeErrorResultAppender(tool_use_id, dropBlockingErrors(undelivered()), {
      sourceToolAssistantUUID: assistantMessage.uuid,
      now: now,
    })(
      "A plugin hook answered a call to the account memory server in place of the server; the call is refused.",
      { toolDenialKind: "permission-rule" },
    );
  let Ie = toolUseContext,
    Me = managedRan() && VN(toolUseContext, tool);
  if (Ae && !Me) return Ae.made.messages;
  let We = INn(Me, managedRan(), Ae !== void 0),
    ze = dropBlockingErrors(undelivered()),
    lt = runs.last()?.input ?? toolInputOf(input);
  if (!Ae)
    logForDebugging(
      `tool.call ${tool.name} ${tool_use_id}: resolved by a hooks module (` +
        (e.deny === void 0 ? "result" : `deny: ${e.deny}`) +
        ")",
    );
  let Je = { sourceToolAssistantUUID: assistantMessage.uuid, now: now },
    nt = makeErrorResultAppender(tool_use_id, ze, Je),
    pt = (no) => nt(no, { toolDenialKind: "permission-rule" }),
    Et = (no) =>
      nt(`${tool.name} ran, and a plugin withheld its result: ${no}`, {}, Zqr).map((hn) =>
        fVr(hn, tool_use_id),
      ),
    yt = (no) => nt(no, {});
  if (e.deny !== void 0) {
    let last = runs.last(),
      ho =
        last !== void 0 && Me
          ? await runPostToolUseHooksForMemory({
              tool: tool,
              toolUseID: tool_use_id,
              input: last.input,
              output: last.made.result,
              toolUseContext: Ie,
              durationMs: ANn(last.made, tool_use_id),
            })
          : void 0;
    return [
      ...(runs.last((Kn) => Kn.made.messages.some((message) => iVr(message, tool_use_id))) !== void 0
        ? Et(e.deny)
        : pt(e.deny)),
      ...(ho?.messages ?? []),
    ];
  }
  let gt = Ae ? Ae.made.result : e.result,
    At = We
      ? await runPostToolUseHooksForMemory({
          tool: tool,
          toolUseID: tool_use_id,
          input: Ae?.input ?? lt,
          output: gt,
          toolUseContext: Ie,
          durationMs: ANn((Ae ?? runs.last())?.made, tool_use_id),
        })
      : { output: gt, rewritten: !1, messages: [] };
  if (Ae && !At.rewritten)
    return At.messages.length === 0 ? Ae.made.messages : [...Ae.made.messages, ...At.messages];
  let It = tool.outputSchema?.safeParse(At.output);
  if (It && !It.success)
    return [
      ...yt(
        `${At.rewritten ? "a managed PostToolUse hook rewrote" : "tool.call step resolved"} ${tool.name} with a result that does not match its output shape: ` +
          It.error.message,
      ),
      ...(Ae ? PNn(Ae.made.messages, tool_use_id) : []),
      ...At.messages,
    ];
  let Yt = attributeScheduledPlugin(tool.name, runs.last()?.made.result, It?.data ?? At.output),
    qt = Yt,
    Zt = VN(toolUseContext, tool),
    rn = (Ae ?? of)?.made.messages.find(
      (no) => findToolResultBlock(no, tool_use_id) !== void 0,
    )?.toolDuration,
    pn = await mapAndMaybePersistToolResult(
      tool,
      Yt,
      tool_use_id,
      getOriginalCwd_2(toolUseContext.session),
      toolUseContext.storageV5,
    );
  return [
    ...ze,
    {
      message: createUserMessage({
        ...replaceToolResult((Ae ?? of)?.made.messages ?? [], tool_use_id, pn),
        toolUseResult: Zt ? restoreMcpResultForCopy(tool, qt, pn, toolUseContext) : void 0,
        ...Je,
      }),
      toolDuration: rn,
    },
    ...(Ae ? PNn(Ae.made.messages, tool_use_id) : []),
    ...At.messages,
  ];
}
//@ chunk-e6aww6q8.js:3787120-3787208 placement
function GNn(e, n, r) {
  return Mht(r) && e.deny === void 0 && n.runs.last() !== void 0 ? { deny: wAn } : e;
}
/**
 * 应用 tool.call 钩子的结果（阻止执行、改写结果）。
 */
//@ chunk-e6aww6q8.js:3787208-3788237 placement
async function applyToolCallHookResult(e, n, r) {
  let filtered = n.undelivered().filter((Se) => Se.preventContinuation === !0),
    h = filtered.findLast((Se) => Se.stopReason)?.stopReason,
    y = n.managedRan() ? void 0 : e.deny,
    S = GNn(e, n, r.input.tool_use_id),
    w = await runToolCallHooks(S, n, r);
  if (n.toolEntered())
    for (let Se of w) {
      let { message: message } = Se;
      if (
        message.type === "user" &&
        message.toolDenialKind === "permission-rule" &&
        findToolResultBlock(Se, r.input.tool_use_id) !== void 0
      )
        message.toolDenialAfterRun = !0;
    }
  let L =
      r.toolUseContext.abortController.signal.aborted || w.some(isHookStoppedMessage)
        ? void 0
        : filtered.length > 0
          ? buildHookStoppedMessage(h || y || "Execution stopped by hook", r.tool.name, r.input.tool_use_id)
          : n.runs
              .last((Se) => Se.made.messages.some(isHookStoppedMessage))
              ?.made.messages.find(isHookStoppedMessage),
    G = L === void 0 ? w : [...w, L],
    q = S.deny === void 0 ? asStringList(S.context) : void 0;
  return q === void 0 ||
    q.length === 0 ||
    !YN(r.tool, r.toolUseContext.options.bareFork, r.toolUseContext.options.settingsHooksOff)
    ? G
    : n.managedRan()
      ? [
          ...G,
          ...(await runToolCallPostHooks(
            q,
            {
              tool: r.tool,
              toolUseID: r.input.tool_use_id,
              input: findRunInputForResult(S, n, r.input),
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
var gYr = UI_ENV_SITE_RULES["tool.call"];
/**
 * 安全采样 process.memoryUsage()：无磁盘会话跳过；失败时记日志，非常见文件系统错误只上报一次。
 */
//@ chunk-e6aww6q8.js:3788305-3788666 placement
class MemoryUsageSampler {
  #e;
  #t = !1;
  constructor(e) {
    this.#e = e;
  }
  sample(e) {
    if (isDiskless()) return;
    try {
      return this.#e();
    } catch (error) {
      let r = isSyscallError(error) ? error.errno : "none";
      if (
        (logForDebugging(
          `[tool-memory] process.memoryUsage() failed (${e}, errno=${r}); a memory measurement for this tool call is skipped`,
          { level: "error" },
        ),
        !this.#t && !isSadFsErrno(error) && !isEnvFsErrno(error))
      )
        ((this.#t = !0), logError(withTelemetryMessage(error, `process.memoryUsage() failed (errno=${r})`)));
      return;
    }
  }
}
//@ chunk-e6aww6q8.js:3788666-3788833 placement
function diffMemoryUsage(e, n) {
  if (e === void 0 || n === void 0) return;
  return {
    rssDeltaBytes: n.rss - e.rss,
    heapUsedDeltaBytes: n.heapUsed - e.heapUsed,
    externalDeltaBytes: n.external - e.external,
  };
}
//@ chunk-e6aww6q8.js:3788883-3788929 placement
var RYr = ["approval", "model", "own", "external"];
/**
 * 统计工具调用的墙钟时间分布：按外部、审批、模型、自身等类别计时（同时只计最高优先的一类），settle 后输出外部耗时、审批等待、模型调用与外部工作前时间。
 */
//@ chunk-e6aww6q8.js:3788929-3789753 placement
class ToolWallClockTracker {
  #e;
  #t;
  #n = { external: 0, approval: 0, model: 0, own: 0 };
  #o = { external: 0, approval: 0, model: 0, own: 0 };
  #r;
  #i;
  #s = !1;
  constructor(startMs, now = Date.now) {
    ((this.#e = startMs), (this.#r = startMs), (this.#t = now));
  }
  mark(e) {
    if (this.#s) return () => {};
    let n = this.#a();
    if (e !== "own") this.#i ??= n;
    this.#n[e]++;
    let r = !1;
    return () => {
      if (r || this.#s) return;
      ((r = !0), this.#a(), this.#n[e]--);
    };
  }
  settle() {
    if (!this.#s) (this.#a(), (this.#s = !0));
  }
  fields(e, { declaredNoOutsideWork: n }) {
    if (this.#i === void 0 && !n) return {};
    let max = Math.max(0, e),
      s = (L) => {
        let min = Math.min(Math.max(0, L), max);
        return ((max -= min), min);
      },
      h = s(this.#o.approval),
      y = s(this.#o.model),
      S = s(this.#o.external),
      w = s((this.#i ?? this.#e) - this.#e);
    return {
      externalWallMs: S,
      ...(h > 0 && { approvalWaitMs: h }),
      ...(y > 0 && { modelCallMs: y }),
      ...(w > 0 && { preExternalMs: w }),
    };
  }
  #a() {
    let e = this.#t(),
      found = RYr.find((r) => this.#n[r] > 0);
    if (found !== void 0) this.#o[found] += Math.max(0, e - this.#r);
    return ((this.#r = e), e);
  }
}
//@ chunk-e6aww6q8.js:3789753-3789769 placement
var qNn = new AsyncLocalStorage_7();
//@ chunk-e6aww6q8.js:3789769-3789807 placement
function KNn(e, n) {
  return qNn.run(e, n);
}
/**
 * 当前请求的计时器存储（ALS）。
 */
//@ chunk-e6aww6q8.js:3789807-3789844 placement = getAgentContext (1)
function getRequestTimingStore() {
  return qNn.getStore();
}
//@ chunk-e6aww6q8.js:3789844-3790091 placement
var CALL_DIRECTORY_CHANGED_MESSAGE =
  "The working directory no longer leads where it did when this call was permission-checked (it was deleted, a part of its path was replaced, or it can't be examined), so the call was not run. Make the call again to have it checked afresh.";
//@ chunk-e6aww6q8.js:3790091-3790191 placement
function runInHeldDirectory(e, n) {
  return fwr() !== void 0 || (e !== void 0 && e === gl())
    ? runInRemoteCallFrame(n, { recoversIfAlreadyGone: !0 })
    : n();
}
/**
 * 检查工作目录在权限检查后是否仍指向同一位置；变化时记日志与 call_directory_hold 事件并拒绝调用。
 */
//@ chunk-e6aww6q8.js:3790191-3790638 placement
function isCallDirectoryUnchanged() {
  let e = fwr();
  if (e === void 0) return !0;
  let n = Ido(e);
  if (pwr(n)) {
    if (n === void 0)
      logForDebugging(
        `Working directory "${e}" may not be examined, now or at the call's permission check, so it isn't compared`,
      );
    return !0;
  }
  return (
    logForDebugging(
      `Call refused: working directory "${e}" now leads to ${typeof n === "string" ? `"${n}"` : "nowhere that can be examined"}, elsewhere than at the call's permission check`,
      { level: "warn" },
    ),
    logFeatureSad("call_directory_hold", "changed_before_call"),
    !1
  );
}
/**
 * 根据中止原因选择工具取消消息：同批被拒、交付中断（特性开关）或普通取消。
 */
//@ chunk-e6aww6q8.js:3790638-3790776 placement
function getCancelMessage(e) {
  let n = unwrapAbortReason(e.reason);
  if (n === "permission-stop") return TOOL_CALL_SKIPPED_BY_SIBLING_DENIAL;
  if (n === "interrupt" && getFeatureValue_CACHED_MAY_BE_STALE("tengu_fizzy_grove", !1))
    return TOOL_CALL_SKIPPED_FOR_DELIVERY;
  return CANCEL_MESSAGE;
}
/**
 * 把工具抛出的错误归类为可上报的字符串：TelemetrySafeError 的 errorClass、errno 码、合法的 error.name，否则 Error/UnknownError。
 */
//@ chunk-e6aww6q8.js:3790776-3791098 fingerprint = classifyToolError (0.849)
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
/**
 * 输入校验失败时，若未知键或枚举值"在本对话早先的工具 schema 里出现过"（内联或延迟 schema），生成"…was offered earlier in this conversation but is not available in this session"提示。
 */
//@ chunk-e6aww6q8.js:3791098-3792219 layout
function buildUnavailableOptionNote(e, n, r, s, h) {
  try {
    if (!isPlainObject_4(r)) return null;
    let y = new Set(),
      S = [];
    for (let issue of s.issues)
      if (issue.code === "unrecognized_keys" && issue.path.length === 0) {
        for (let key of issue.keys) if (Object.hasOwn(n, key)) y.add(key);
      } else if (issue.code === "invalid_value" && issue.path.length === 1) {
        let Ae = issue.path[0];
        if (typeof Ae === "string" && Object.hasOwn(n, Ae) && Object.is(n[Ae], r[Ae]))
          S.push({ parameter: Ae, value: r[Ae] });
      }
    if (y.size === 0 && S.length === 0) return null;
    let w = latestPromptSnapshot(h)?.toolEntries.get(e),
      L = w?.input_schema,
      G = "inline";
    if (w === void 0) {
      let Ee = recordedDeferredTools(h).entries.get(e);
      if (Ee === void 0 || !("input_schema" in Ee)) return null;
      ((L = Ee.input_schema), (G = "deferred"));
    }
    let q = QSe(L),
      Z = [];
    for (let { parameter: parameter, value: Ae } of S)
      if (JSe(q.get(parameter))?.includes(Ae)) Z.push(`\`${parameter}: ${jsonStringify(Ae)}\``);
    let Se = Z.length > 0 ? "enum_value" : "unknown_key";
    for (let Ee of y) if (q.has(Ee)) Z.push(`\`${Ee}\``);
    if (Z.length === 0) return null;
    let ke = Z.length === 1;
    return {
      text: `${ke ? Z[0] : `${Z.slice(0, -1).join(", ")} and ${Z.at(-1)}`} ${ke ? "was" : "were"} offered earlier in this conversation but ${ke ? "is" : "are"} not available in this session; continue without ${ke ? "it" : "them"}.`,
      kind: Se,
      source: G,
    };
  } catch (error) {
    return (logError(error), null);
  }
}
/**
 * 权限规则来源映射到 OTel 决策来源：session→user_temporary/user_reject，用户/本地设置→user_permanent/user_reject，其余→config。
 */
//@ chunk-e6aww6q8.js:3792219-3792424 fingerprint = ruleSourceToOTelSource (1)
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
/**
 * 权限决策原因映射到 OTel 来源：permissionPromptTool 用其分类、rule 看来源、hook→hook、用户中断→user_abort，其它→config。
 */
//@ chunk-e6aww6q8.js:3792424-3792965 fingerprint = decisionReasonToOTelSource (0.965)
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
/**
 * 权限结果转 OTel tool_decision：allow→accept，deny→reject，ask（未决）→reject（中断时来源 user_abort）。
 */
//@ chunk-e6aww6q8.js:3792965-3793218 layout
function getToolDecisionForOTel(e, n) {
  switch (e.behavior) {
    case "allow":
      return { decision: "accept", source: decisionReasonToOTelSource(e.decisionReason, "allow") };
    case "deny":
      return { decision: "reject", source: decisionReasonToOTelSource(e.decisionReason, "deny") };
    case "ask":
      return { decision: "reject", source: n ? "user_abort" : "config" };
  }
}
/**
 * 组装权限决策记录（decision、source、reasonType、ruleSource、grantScope、reasonCode、circuitBreaker、classifierCategory），供权限遥测与审计。
 */
//@ chunk-e6aww6q8.js:3793218-3794030 layout
function buildPermissionDecisionRecord(e, n, r) {
  let s = r?.outcome.decisionReason,
    h =
      r?.outcome.behavior === "ask" ||
      r?.recorded?.source.startsWith("user_") === !0 ||
      n === "user_abort" ||
      s?.type === "permissionPromptTool",
    y = r === void 0 ? void 0 : resolveShownPermissionOutcome(r, h),
    S =
      r === void 0
        ? void 0
        : (getDecisionRuleSource(s, r.outcome.behavior) ??
          getMatchedAskRule(r.outcome)?.source ??
          (y && (getDecisionRuleSource(y.reason, y.behavior) ?? y.matchedAskRule?.source))),
    w =
      e !== "accept"
        ? void 0
        : (r?.recorded?.grantScope ?? (r?.outcome.behavior === "allow" ? r.outcome.grantScope : void 0)),
    L = y && findCircuitBreaker(y.reason, y.behavior),
    G = y?.reason?.type === "classifier" ? AL(y.reason.category) : void 0;
  return {
    decision: e,
    source: n,
    ...(s !== void 0 && !h && { reasonType: s.type }),
    ...(S !== void 0 && { ruleSource: S }),
    ...(w !== void 0 && { grantScope: w }),
    ...(y !== void 0 && { reasonCode: voe(y.behavior, void 0, y.reason, y.matchedAskRule) }),
    ...(L !== void 0 && { circuitBreaker: L }),
    ...(G !== void 0 && { classifierCategory: G }),
  };
}
//@ chunk-e6aww6q8.js:3794030-3794695 layout
function resolveShownPermissionOutcome(e, n) {
  let { outcome: outcome, shown: shown } = e,
    h =
      outcome.behavior !== "allow" &&
      (outcome.decisionReason?.type === "hook" || outcome.decisionReason?.type === "classifier");
  if (shown?.behavior === "ask" && !h)
    return { behavior: "ask", reason: shown.decisionReason, matchedAskRule: getMatchedAskRule(shown) };
  if (
    outcome.behavior === "deny" &&
    outcome.decisionReason?.type === "asyncAgent" &&
    outcome.decisionReason.ask !== void 0
  ) {
    let { ask: ask } = outcome.decisionReason;
    return { behavior: "ask", reason: ask.decisionReason, matchedAskRule: ask.matchedAskRule };
  }
  if (outcome.behavior !== "allow")
    return {
      behavior: outcome.behavior,
      reason: outcome.decisionReason,
      matchedAskRule: getMatchedAskRule(outcome),
    };
  if (n && outcome.decisionReason?.type !== "permissionPromptTool")
    return { behavior: "ask", reason: outcome.decisionReason, matchedAskRule: getMatchedAskRule(outcome) };
  return;
}
//@ chunk-e6aww6q8.js:3794695-3794762 layout
function getMatchedAskRule(e) {
  return "matchedAskRule" in e ? e.matchedAskRule : void 0;
}
//@ chunk-e6aww6q8.js:3794762-3795026 placement
function findCircuitBreaker(e, n) {
  if (e?.type === "safetyCheck") {
    let circuitBreaker = e.circuitBreaker;
    return circuitBreaker !== void 0 && Object.hasOwn(CIRCUIT_BREAKER_TRAITS, circuitBreaker)
      ? circuitBreaker
      : void 0;
  }
  if (e?.type === "subcommandResults") {
    for (let r of e.reasons.values())
      if (r.behavior === n) {
        let s = findCircuitBreaker(r.decisionReason, n);
        if (s !== void 0) return s;
      }
  }
  return;
}
//@ chunk-e6aww6q8.js:3795026-3795185 placement
function buildDeniedDecisionRecord(e, n, r, s) {
  return buildPermissionDecisionRecord(
    e.behavior === "allow" ? n?.decision || r.decision : "reject",
    n?.source || r.source,
    { outcome: e, recorded: n, shown: s?.answered ?? s?.result },
  );
}
//@ chunk-e6aww6q8.js:3795185-3795335 placement
function buildDenyRuleDecisionRecord(e, n) {
  let r = { type: "rule", rule: n };
  return buildPermissionDecisionRecord("reject", decisionReasonToOTelSource(r, "deny"), {
    outcome: { behavior: "deny", message: e, decisionReason: r },
    recorded: void 0,
  });
}
//@ chunk-e6aww6q8.js:3795335-3795439 placement
function getDecisionRuleSource(e, n) {
  if (e?.type === "rule") return e.rule.source;
  return findDecidingRule(e, n === "deny" ? "deny" : "ask")?.source;
}
//@ chunk-e6aww6q8.js:3795439-3795670 placement
function shouldAddBashAudienceNote(e, n, r) {
  if (
    e !== BASH_TOOL_NAME ||
    typeof n !== "object" ||
    n === null ||
    !("stdout" in n) ||
    typeof n.stdout !== "string" ||
    getIsNonInteractiveSession() ||
    !exceedsLineLimit(n.stdout)
  )
    return !1;
  let s = getCanonicalName(r);
  return isModelCapabilityEnabled(
    "bash_output_audience_note",
    s,
    r,
    env.CLAUDE_CODE_BASH_OUTPUT_AUDIENCE_NOTE,
  );
}
//@ chunk-e6aww6q8.js:3795670-3795810 placement
var REMOTE_DEVICES_PREFIX = getMcpPrefix_2(REMOTE_DEVICES),
  BROWSER_TOOL_PREFIXES = [`${REMOTE_DEVICES_PREFIX}Claude_Preview__`, "mcp__claude-for-chrome__"],
  flattened_2 = [Aro, Cro].flatMap((e) => {
    let n = getMcpPrefix_2(e);
    return [n, REMOTE_DEVICES_PREFIX + n.slice(5)];
  });
//@ chunk-e6aww6q8.js:3795810-3796064 placement
function getDeviceToolKind(e) {
  if (e.isMcp !== !0) return;
  let n = getToolNameForPermissionCheck_4(e);
  if (isChromeToolName(n) || BROWSER_TOOL_PREFIXES.some((r) => n.startsWith(r))) return "browser";
  if (
    Wjr(n) &&
    !(n.startsWith(REMOTE_DEVICES_PREFIX) && n.slice(REMOTE_DEVICES_PREFIX.length).includes("__"))
  )
    return "computer_use";
  return flattened_2.some((r) => n.startsWith(r)) ? "simulator" : void 0;
}
//@ chunk-e6aww6q8.js:3796064-3796090 placement
var TOOL_NOT_LOADED = "TOOL_NOT_LOADED";
/**
 * 工具未加载就被调用时的 InputValidationError 文本，提示先用 ToolSearch 一次性加载所需工具再调用。
 */
//@ chunk-e6aww6q8.js:3796090-3796455 placement
function buildNotLoadedToolError(e) {
  return `InputValidationError: ${e} did not run: it was not loaded when it was called. Unless ${TOOL_SEARCH_TOOL_NAME} has loaded it since, load it together with the other tools you expect to need, in one ${TOOL_SEARCH_TOOL_NAME} call (for example, query "select:${e}", with the other names after it, comma-separated). Call it again once that result has come back, not in the same reply.`;
}
//@ chunk-e6aww6q8.js:3796455-3796529 placement
var QYr = /^[A-Za-z][A-Za-z0-9_]{0,63}(?:[,+][A-Za-z][A-Za-z0-9_]{0,63})*$/;
//@ chunk-e6aww6q8.js:3796529-3796589 placement
function iFn(e) {
  return QYr.test(e) ? fromSanitizer_SANITIZER_OUTPUT_ONLY(e) : lit_2("nonconforming");
}
//@ chunk-e6aww6q8.js:3796627-3796882 placement
var MAX_RESULT_FIELDS = 256,
  MAX_PENDING_CUTS = 64,
  MAX_PENDING_CUT_CHARS = 33554432,
  MAX_WALK_NODES = 1048576,
  MAX_WALK_NODES_DEDUPED = 65536,
  HOOK_RESULT_FIELDS_CUT_NOTICE =
    "[Parts of this tool result were left out: a hook replaced the tool's output with one that has too many fields, and only its text, inline images and inline PDFs are kept.]",
  pendingResultCuts = new SessionRootSlot(() => new Map());
//@ chunk-e6aww6q8.js:3796882-3796916 placement
function sit(e) {
  return HEARTH_READ_TOOLS.has(e);
}
/**
 * 有 MCP 入站门时，字段过多的 MCP 结果只保留简化形式，完整结果按 uuid 暂存待取回；子代理或无法序列化时只做截断并记事件。
 */
//@ chunk-e6aww6q8.js:3796916-3797295 placement
function cutLargeMcpResult(e) {
  if (!hasMcpInboundDoor()) return e;
  let { toolUseId: toolUseId, toolUseResult: toolUseResult, mcpMeta: mcpMeta } = e,
    h = buildMinimalMcpResult(toolUseResult, mcpMeta, e.keepsMcpMeta);
  if (!needsResultCut(h, e)) return e;
  if (e.inSubagent) return (logFeatureSad("mcp_large_result_cut", "in_subagent"), h);
  let y;
  try {
    y = jsonStringify(mcpMeta ? { content: toolUseResult, ...mcpMeta } : toolUseResult);
  } catch {
    return (logFeatureSad("mcp_large_result_cut", "not_serializable"), h);
  }
  return {
    ...h,
    uuid: stashCutResult(toolUseId, {
      whole: new RawJson(y),
      chars: y.length,
      feature: "mcp_large_result_cut",
    }),
  };
}
/**
 * 编辑工具结果的 originalFile 过长时置空并暂存完整结果（子代理中只置空）。
 */
//@ chunk-e6aww6q8.js:3797295-3797694 placement
function cutEditOriginalFile({
  toolUseId: toolUseId,
  toolUseResult: toolUseResult,
  mcpMeta: mcpMeta,
  inSubagent: inSubagent,
}) {
  if (
    !hasMcpInboundDoor() ||
    !isPlainObject_4(toolUseResult) ||
    typeof toolUseResult.originalFile !== "string" ||
    toolUseResult.originalFile.length <= Yoo
  )
    return { toolUseResult: toolUseResult };
  let h = { ...toolUseResult, originalFile: null };
  if (inSubagent) return (logFeatureSad("edit_original_file_cut", "in_subagent"), { toolUseResult: h });
  return {
    toolUseResult: h,
    uuid: stashCutResult(toolUseId, {
      whole: mcpMeta ? { content: toolUseResult, ...mcpMeta } : toolUseResult,
      chars: toolUseResult.originalFile.length,
      feature: "edit_original_file_cut",
    }),
  };
}
/**
 * 按 toolUseId 暂存被截掉的完整结果，超过条数或字符上限时淘汰最早的（记 dropped_waiting），返回新 uuid。
 */
//@ chunk-e6aww6q8.js:3797694-3797933 placement
function stashCutResult(e, n) {
  let r = randomUUID_45(),
    of = pendingResultCuts.of(getRootSession());
  (of.delete(e), of.set(e, { ...n, uuid: r }));
  let h = 0;
  for (let y of of.values()) h += y.chars;
  for (let [y, S] of of) {
    if (y === e || (of.size <= MAX_PENDING_CUTS && h <= MAX_PENDING_CUT_CHARS)) break;
    (of.delete(y), (h -= S.chars), logFeatureSad(S.feature, "dropped_waiting"));
  }
  return r;
}
//@ chunk-e6aww6q8.js:3797933-3798073 placement
function cutOversizedResultBlocks(e) {
  let n = hasMcpInboundDoor() ? simplifyResultBlocks(e) : void 0;
  if (n === void 0) return e;
  return (logFeatureSad("mcp_result_block_cut", typeof n === "string" ? "not_a_list" : "list"), n);
}
/**
 * 结果字段过多时把内容块简化为只保留文本、工具引用、内联图片与 PDF，丢弃部分处加一条说明；不需要时返回 undefined。
 */
//@ chunk-e6aww6q8.js:3798073-3798344 placement
function simplifyResultBlocks(e, n = !1) {
  let r = Array.isArray(e) && e.every(isToolReferenceWithName),
    s = Array.isArray(e) ? e.map((S) => simplifyResultBlock(S, r)) : void 0,
    h = MAX_RESULT_FIELDS + countResultFields(s, 1 / 0, n);
  if (h !== 1 / 0 && countResultFields(e, h, n) <= h) return;
  if (s === void 0) return stringifyToolResult(e);
  let index = s.indexOf(void 0);
  return s.flatMap((S, w) => S ?? (w === index ? { type: "text", text: HOOK_RESULT_FIELDS_CUT_NOTICE } : []));
}
/**
 * 把单个内容块简化为文本、工具引用、支持的 base64 图片或 PDF 文档，其他返回 undefined。
 */
//@ chunk-e6aww6q8.js:3798344-3798989 placement
function simplifyResultBlock(block, allowToolReference) {
  let raw = isPlainObject_4(block) ? block : {},
    {
      type: blockType,
      text: text,
      source: source,
      title: title,
      context: context,
      tool_name: tool_name,
    } = raw;
  if (blockType === "text" && typeof text === "string") return { type: blockType, text: text };
  if (allowToolReference && blockType === "tool_reference" && typeof tool_name === "string")
    return { type: blockType, tool_name: tool_name };
  let base64Source = isPlainObject_4(source) && source.type === "base64" ? source : {},
    { media_type: media_type, data: data } = base64Source;
  if (
    blockType === "image" &&
    typeof data === "string" &&
    (media_type === "image/png" ||
      media_type === "image/jpeg" ||
      media_type === "image/gif" ||
      media_type === "image/webp")
  )
    return { type: blockType, source: { type: "base64", media_type: media_type, data: data } };
  if (blockType === "document" && typeof data === "string" && media_type === "application/pdf")
    return {
      type: blockType,
      source: { type: "base64", media_type: media_type, data: data },
      ...(typeof title === "string" && { title: title }),
      ...(typeof context === "string" && { context: context }),
    };
  return;
}
//@ chunk-e6aww6q8.js:3798989-3799116 placement
function needsResultCut(e, n, r = !1) {
  let s = MAX_RESULT_FIELDS + countResultFields([e.toolUseResult, e.mcpMeta], 1 / 0, r);
  return s === 1 / 0 || countResultFields([n.toolUseResult, n.mcpMeta], s, r) > s;
}
/**
 * 迭代统计结果对象的字段数（超过上限提前返回上限+1），可对重复键形状的对象去重计数。
 */
//@ chunk-e6aww6q8.js:3799116-3799419 placement
function countResultFields(e, n, r = !1) {
  let s = 0,
    h = 0,
    y = new Set(),
    S = [e];
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
  let keys = Object.keys(e),
    s = String(Number(keys[0]) >>> 0) === keys[0];
  if (keys.length > vdi || s) return !1;
  let h = jsonStringifyRaw(keys);
  if (n.has(h)) return !0;
  return (n.add(h), !1);
}
/**
 * 构造精简的 MCP 结果：内容块只留基本字段，mcpMeta 只保留结束轮次标记、限定大小的插件元数据、来源中继、结构化内容省略标记与资源链接。
 */
//@ chunk-e6aww6q8.js:3799572-3799920 placement
function buildMinimalMcpResult(e, n, r = !1) {
  if (r) return { ...buildMinimalMcpResult(e, void 0), mcpMeta: n };
  return {
    toolUseResult: Array.isArray(e) ? e.map(minimalContentBlock) : isPlainObject_4(e) ? {} : e,
    mcpMeta: n && {
      ...(isPlainObject_4(n._meta) && pickMcpMetaFields(n._meta)),
      ...((n.structuredContent !== void 0 || n.structuredContentOmitted === !0) && {
        structuredContentOmitted: !0,
      }),
      ...(Array.isArray(n.resourceLinks) && {
        resourceLinks: n.resourceLinks.filter(isPlainObject_4).map(minimalResourceLink),
      }),
    },
  };
}
/**
 * 从 MCP _meta 中挑出要保留的键：结束轮次标记，以及开关开启时大小受限的插件元数据（超限的记录到 plugin_meta_cut）。
 */
//@ chunk-e6aww6q8.js:3799920-3800270 placement
function pickMcpMetaFields(e) {
  let n = {};
  if (e[CLAUDE_ENDTURN] === !0) {
    if (((n[CLAUDE_ENDTURN] = !0), e[CLAUDE_ENDTURNHONORSSTOPHOOKS] === !0))
      n[CLAUDE_ENDTURNHONORSSTOPHOOKS] = !0;
  }
  if (Vme()) {
    let r = [];
    for (let s of beo) {
      let h = e[s];
      if (!Object.hasOwn(e, s) || h === void 0) continue;
      if (
        typeof h === "string" ? h.length <= oxt : countResultFields(h, MAX_RESULT_FIELDS) <= MAX_RESULT_FIELDS
      )
        n[s] = h;
      else r.push(s);
    }
    if (typeof e[COM_ANTHROPIC_SOURCES_RELAY] === "string")
      n[COM_ANTHROPIC_SOURCES_RELAY] = e[COM_ANTHROPIC_SOURCES_RELAY];
    if (r.length > 0) n[COM_ANTHROPIC_PLUGIN_META_CUT] = r;
  }
  return Object.keys(n).length === 0 ? {} : { _meta: n };
}
/**
 * 把内容块精简为 type、text、source（type/media_type/data）、title、context。
 */
//@ chunk-e6aww6q8.js:3800270-3800692 placement
function minimalContentBlock(e) {
  if (Array.isArray(e)) return [];
  if (!isPlainObject_4(e)) return e;
  let { type: n, text: text, source: source, title: title, context: context } = e;
  return {
    ...(typeof n === "string" && { type: n }),
    ...(typeof text === "string" && { text: text }),
    ...(isPlainObject_4(source) && {
      source: {
        ...(typeof source.type === "string" && { type: source.type }),
        ...(typeof source.media_type === "string" && { media_type: source.media_type }),
        ...(typeof source.data === "string" && { data: source.data }),
      },
    }),
    ...(typeof title === "string" && { title: title }),
    ...(typeof context === "string" && { context: context }),
  };
}
//@ chunk-e6aww6q8.js:3800692-3800979 placement
function minimalResourceLink(e) {
  let { uri: uri, name: r, title: title, description: description, mimeType: mimeType, size: size } = e;
  return {
    uri: typeof uri === "string" ? uri : "",
    name: typeof r === "string" ? r : "",
    ...(typeof title === "string" && { title: title }),
    ...(typeof description === "string" && { description: description }),
    ...(typeof mimeType === "string" && { mimeType: mimeType }),
    ...(typeof size === "number" && { size: size }),
  };
}
/**
 * 按 toolUseId 取回暂存的完整结果，uuid 不符时丢弃并记事件。
 */
//@ chunk-e6aww6q8.js:3800979-3801142 placement
function takeCutResult(e, n) {
  let peek = pendingResultCuts.peek(getRootSession()),
    s = peek?.get(e);
  if (s === void 0) return;
  if ((peek?.delete(e), s.uuid !== n)) {
    logFeatureSad(s.feature, "other_message");
    return;
  }
  return (logFeatureOk(s.feature), s.whole);
}
/**
 * 轮次结束时，对仍未完成的切出结果逐个上报 turn_ended 并清空。
 */
//@ chunk-e6aww6q8.js:3801142-3801243 placement
function clearCutResults() {
  let peek = pendingResultCuts.peek(getRootSession());
  for (let n of peek?.values() ?? []) logFeatureSad(n.feature, "turn_ended");
  peek?.clear();
}
//@ chunk-e6aww6q8.js:3801243-3801328 placement
var b4r = getMcpPrefix_2(CLAUDE_DEVICE),
  iit = getMcpPrefix_2(REMOTE_DEVICES),
  w4r = 108,
  fFn = /^[a-zA-Z0-9](?:[a-zA-Z0-9_-]*[a-zA-Z0-9])?$/;
//@ chunk-e6aww6q8.js:3801328-3801494 placement
function matchLocalToolAlias(e, n) {
  let r;
  if (e.startsWith(iit)) {
    let s = toLocalToolAlias(e);
    r = n.filter((h) => h === s);
  } else r = n.filter((s) => s.startsWith(iit) && toLocalToolAlias(s) === e);
  return r.length === 1 ? r[0] : void 0;
}
//@ chunk-e6aww6q8.js:3801494-3801722 placement
function toLocalToolAlias(e) {
  let sliced = e.slice(iit.length),
    [r, s, ...h] = sliced.split("__");
  if (
    r === void 0 ||
    s === void 0 ||
    h.length > 0 ||
    !fFn.test(r) ||
    !fFn.test(s) ||
    R_r.some((S) => sliced.startsWith(S))
  )
    return;
  let y = `lcl-${r}-${s}`;
  return y.length <= w4r ? b4r + y : void 0;
}
//@ chunk-e6aww6q8.js:3801722-3801750 placement
var T4r = 50,
  v4r = 1e4,
  E4r = 3000;
//@ chunk-e6aww6q8.js:3801750-3801777 placement
class ait {
  rows = new WeakSet();
}
//@ chunk-e6aww6q8.js:3801777-3801806 placement
class hFn {
  byResponse = new Map();
}
//@ chunk-e6aww6q8.js:3801806-3801817 placement
var R4r = 50;
//@ chunk-e6aww6q8.js:3801817-3801905 placement
function s3s(e) {
  return e === "look_failed" || e === "look_timed_out" || e === "listed_not_pooled";
}
/**
 * 等待 MCP 工具所在服务器就绪并返回工具与等待信息；出错时记日志并返回未知状态。
 */
//@ chunk-e6aww6q8.js:3801905-3802154 placement
async function waitForMcpToolServer(e, n, r, s = {}) {
  let { signal: signal } = r.abortController;
  function y(S) {
    return { tool: void 0, tools: n, waitedMs: 0, aborted: signal.aborted, ...S };
  }
  try {
    return await getMcpServerType(e, n, r, s, y);
  } catch (error) {
    return (logError(error), y({ serverState: "unknown", initialServerState: "unknown" }));
  }
}
/**
 * 判断调用的 MCP 工具是否值得等待：已能在刷新后的工具池找到，或对应服务器尚未出现在已知行中。
 */
//@ chunk-e6aww6q8.js:3802154-3802517 placement
function shouldWaitForMcpTool(e, n) {
  if (typeof e !== "string") return !1;
  let { refreshTools: refreshTools, toolAliases: toolAliases } = n.options,
    h = lGt(e, toolAliases);
  if (!refreshTools || !mcpInfoFromString(h)) return !1;
  let rows = n.toolState.get(ait).rows;
  try {
    return (
      findToolByName(refreshTools(), e, toolAliases) !== void 0 ||
      findLongestPrefixClients(h, currentMcpClients(n)).some((S) => yFn(S) && !rows.has(S))
    );
  } catch (error) {
    return (
      logForDebugging(
        `Not waiting for MCP tool ${e}: reading its server or the tool pool failed: ${errorMessage(error)}`,
        { level: "warn" },
      ),
      logError(error),
      !1
    );
  }
}
//@ chunk-e6aww6q8.js:3802517-3802575 placement
function i3s(e, n) {
  return mcpInfoFromString(e) !== null && findLongestPrefixClients(e, n).some(yFn);
}
//@ chunk-e6aww6q8.js:3802575-3802646 placement
function yFn(e) {
  return e.type === "pending" && e.reconnectAttempt === void 0;
}
//@ chunk-e6aww6q8.js:3802646-3804158 placement
async function getMcpServerType(e, n, r, s, h) {
  let y = s.maxWaitMs ?? Math.min(getConnectionTimeoutMs(), v4r),
    S = s.absentGraceMs ?? E4r,
    w = s.connectedGraceMs ?? 0,
    rows = r.toolState.get(ait).rows,
    G = s.skipExhausted === !0,
    { signal: signal } = r.abortController,
    { toolAliases: toolAliases } = r.options,
    serverConnection = lGt(e, toolAliases);
  if (typeof serverConnection !== "string" || !mcpInfoFromString(serverConnection))
    return h({ serverState: "not_mcp", initialServerState: "not_mcp" });
  function ke() {
    return findLongestPrefixClients(serverConnection, currentMcpClients(r));
  }
  function we() {
    return getMcpServerBaseUrlFromToolName(ke());
  }
  let Ee = new Set(ke().filter((gt) => gFn(gt, G, rows)));
  function Ae(gt) {
    let At = ke();
    if (At.some((It) => Ee.has(It) || gFn(It, G, rows))) return !0;
    if (gt < w && At.some((It) => It.type === "connected")) return !0;
    return At.length === 0 && gt < S;
  }
  function Ie(gt) {
    return findToolByName(gt, e, toolAliases);
  }
  let Me = we(),
    refreshTools = r.options.refreshTools;
  if (!refreshTools) return h({ serverState: Me, initialServerState: Me });
  let ze = refreshTools(),
    lt = Ie(ze);
  if (lt) return { tool: lt, tools: ze, waitedMs: 0, serverState: Me, initialServerState: Me, aborted: !1 };
  if (!Ae(0)) return h({ serverState: Me, initialServerState: Me });
  let byResponse = r.toolState.get(hFn).byResponse,
    responseId = s.responseId,
    pt = responseId ? y - (byResponse.get(responseId) ?? 0) : y;
  if (pt <= 0) return h({ serverState: Me, initialServerState: Me });
  let now = Date.now();
  while (!signal.aborted) {
    ((ze = refreshTools()), (lt = Ie(ze)));
    let gt = Date.now() - now;
    if (lt || !Ae(gt) || gt >= pt) break;
    await sleep(T4r, signal);
  }
  if (signal.aborted) lt = void 0;
  else if (!lt) {
    if (((ze = refreshTools()), (lt = Ie(ze)), !lt && pt === y && Date.now() - now >= pt)) {
      for (let gt of ke()) if (Ee.has(gt)) rows.add(gt);
    }
  }
  let yt = Date.now() - now;
  if (responseId) {
    byResponse.set(responseId, (byResponse.get(responseId) ?? 0) + yt);
    for (let gt of byResponse.keys()) {
      if (byResponse.size <= R4r) break;
      byResponse.delete(gt);
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
function lGt(e, n) {
  return n && Object.hasOwn(n, e) ? (n[e] ?? e) : e;
}
/**
 * 找出 MCP 前缀与工具名匹配且前缀最长的客户端列表。
 */
//@ chunk-e6aww6q8.js:3804375-3804529 placement
function findLongestPrefixClients(e, n) {
  let r = [],
    s = 0;
  for (let h of n) {
    let y = getMcpPrefix_2(h.name);
    if (!e.startsWith(y) || y.length < s) continue;
    if (y.length > s) ((s = y.length), (r = []));
    r.push(h);
  }
  return r;
}
//@ chunk-e6aww6q8.js:3804529-3804591 placement
function gFn(e, n, r) {
  return e.type === "pending" && !(n && r.has(e));
}
/**
 * 解析工具输入：原始 JSON 无法解析时报 json 错误；可选先做 coerceInput 修复，再按 inputSchema 校验，返回解析结果与修复信息。
 */
//@ chunk-e6aww6q8.js:3804591-3805028 placement
function parseToolInput(e, n, r) {
  if (isUnparsedInputMarker(n)) {
    let { raw: raw, len: len } = n[DJt];
    return { ok: !1, phase: "parse", cause: "json", raw: raw, len: len };
  }
  let s = r === void 0 ? (e.coerceInput?.(n) ?? null) : r.repair,
    h = r !== void 0 || s === null ? n : s.input,
    safeParse = e.inputSchema.safeParse(h),
    S =
      s === null ? void 0 : { shapeClass: s.shapeClass, valid: safeParse.success, resultNote: s.resultNote };
  if (!safeParse.success)
    return { ok: !1, phase: "parse", cause: "schema", error: safeParse.error, schemaInput: h, coerced: S };
  return { ok: !0, input: safeParse.data, coerced: S };
}
/**
 * 调用 validateInput：失败时返回校验结论（被规则拒绝时补全可观测输入）；成功时按需生成补全后的可观测输入。
 */
//@ chunk-e6aww6q8.js:3805028-3805408 placement
async function runValidateInput(e, n, r) {
  let s = await r(n);
  if (s?.result === !1) {
    let y;
    if (s.deniedByPermissionRule) ((y = { ...n }), e.backfillObservableInput?.(y));
    return { ok: !1, phase: "validate", verdict: s, deniedInput: y };
  }
  if (!e.backfillObservableInput) return { ok: !0, callInput: n, observableInput: n, backfilled: !1 };
  let h = { ...n };
  return (e.backfillObservableInput(h), { ok: !0, callInput: n, observableInput: h, backfilled: !0 });
}
/**
 * 把基于可观测输入改写的输入映射回实际调用输入（file_path 等）。
 */
//@ chunk-e6aww6q8.js:3805408-3805614 placement
function restoreCallInput(e, n) {
  let { callInput: callInput, observableInput: observableInput, backfilled: backfilled } = e;
  if (
    backfilled &&
    n !== callInput &&
    "file_path" in n &&
    "file_path" in callInput &&
    n.file_path === observableInput.file_path
  )
    return { ...n, file_path: callInput.file_path };
  if (backfilled && n === observableInput) return callInput;
  return n;
}
//@ chunk-e6aww6q8.js:3805614-3805638 placement
var A4r = 300000,
  SFn = 5000;
/**
 * 工具执行前预热远程记忆路径，处理中止、超时与挂载断开。
 */
//@ chunk-e6aww6q8.js:3805638-3806688 placement
async function warmRemoteMemoryPath(e, n, r, s) {
  try {
    let h = getMemoryBaseDir();
    if (h === void 0 || !e.getPath || isRemoteOnlyCheck(e.name) || (yO() && Cf(n))) return !1;
    let y = expandStablePath(e.getPath(n));
    if (!isPathWithinCaseAware(y, h, !1)) return !1;
    if (r.aborted) return !0;
    startSessionActivity("tool_exec", s);
    let S = createCombinedAbortSignal(r, { timeoutMs: A4r, refTimer: !0 });
    try {
      let now = Date.now(),
        L = await walkPermissionCheckPathsAsync(
          y,
          S.signal,
          (q) => isPathWithinCaseAware(q, h, !1) || isPathWithinCaseAware(h, q, !1),
        ),
        G = { duration_ms: Date.now() - now };
      if (r.aborted) {
        if (G.duration_ms >= SFn) logFeatureSad("remote_memory_path_warmup", "aborted", G);
      } else if (S.signal.aborted) logFeatureBad("remote_memory_path_warmup", "timed_out");
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
      else if (G.duration_ms >= SFn) logFeatureSad("remote_memory_path_warmup", "slow", G);
      else logFeatureOk("remote_memory_path_warmup");
    } finally {
      (S.cleanup(), endActivity("tool_exec", s));
    }
    if (isTerminalShutdown() && !r.aborted) await heldUntilExit();
    return r.aborted;
  } catch (error) {
    if (!(error instanceof NullBytePathError || error instanceof UnstablePathError || cke(error)))
      logError(withTelemetryMessage(toError(error), "warmRemoteMemoryPath threw"));
    return !1;
  }
}
//@ chunk-e6aww6q8.js:3900124-3900138 placement
var p5r = 30000;
//@ chunk-e6aww6q8.js:3900138-3900640 placement
function emitToolHeartbeat({
  toolName: toolName,
  toolUseID: toolUseID,
  abortSignal: abortSignal,
  onProgress: onProgress,
}) {
  let now = Date.now(),
    y = !1,
    S = !1,
    w = 0,
    L = setInterval(() => {
      try {
        if (y) return;
        if (abortSignal.aborted) {
          G();
          return;
        }
        if (V_i()) return;
        onProgress({
          type: "progress",
          toolUseID: `${toolUseID}-heartbeat-${w++}`,
          data: {
            type: "tool_heartbeat",
            toolName: toolName,
            elapsedTimeSeconds: Math.floor((Date.now() - now) / 1000),
          },
        });
      } catch (error) {
        ((S = !0), G(), logError(error), logFeatureBad("heartbeat_tool_progress", "tick_emit_threw"));
      }
    }, p5r);
  L.unref();
  function G() {
    if (y) return;
    if (((y = !0), clearInterval(L), w > 0 && !S)) logFeatureOk("heartbeat_tool_progress");
  }
  return G;
}
//@ chunk-e6aww6q8.js:3906428-3906616 placement
function getEffortTelemetryFields(e) {
  let mode = getToolPermissionContext(e).mode,
    r = getEffortLevelIfSupported(
      getRuntimeMainLoopModel({
        permissionMode: mode,
        mainLoopModel: getMainLoopModel_2(e),
        exceeds200kTokens: mode === "plan" && doesMostRecentAssistantMessageExceed200k(e.messages),
      }),
      getEffortValue(e),
      getEffortLayerOverride(e.permissionLayers),
    );
  return r ? { effort_level: fromEnum(r) } : {};
}
/**
 * 为写入转录准备工具结果：MCP 或需要时裁掉过大的结果，编辑工具结果的 originalFile 过长时置空，返回结果、mcpMeta 与暂存 uuid。
 */
//@ chunk-e6aww6q8.js:3906616-3907001 placement
function cutResultForStorage(e, n, r, s) {
  let h = Boolean(e.agentId),
    y = sit(n.name) && hasRelaySource(e.options.mcpClients),
    S =
      r || (n.isMcp === !0 && !y && !e.agentId)
        ? cutLargeMcpResult({ ...s, keepsMcpMeta: y, inSubagent: h })
        : s,
    {
      toolUseResult: toolUseResult,
      mcpMeta: mcpMeta,
      uuid: uuid,
    } = n.isMcp !== !0 && n.name === FILE_EDIT_TOOL_NAME && S.uuid === void 0
      ? {
          ...S,
          ...cutEditOriginalFile({
            toolUseId: s.toolUseId,
            toolUseResult: S.toolUseResult,
            mcpMeta: S.mcpMeta,
            inSubagent: h,
          }),
        }
      : S;
  return { toolUseResult: toolUseResult, mcpMeta: mcpMeta, uuid: uuid };
}
//@ chunk-e6aww6q8.js:3907001-3907066 placement
function N$n(e) {
  return e.aborted ? { abortKind: fromEnum(classifyAbortReasonForTelemetry(e.reason)) } : {};
}
//@ chunk-e6aww6q8.js:3907066-3907259 placement
function measureStringChars(e, n = 0) {
  if (typeof e === "string") return e.length + 1;
  if (n >= 8 || e === null || typeof e !== "object") return 0;
  let r = 0,
    s = Array.isArray(e) ? e : Object.values(e);
  for (let h of s) r += measureStringChars(h, n + 1);
  return r;
}
/**
 * 统计工具结果中大字段的长度（原文件、笔记本前后内容、文件内容/base64/cells、git diff、结构化补丁）用于遥测。
 */
//@ chunk-e6aww6q8.js:3907259-3908209 placement
function measureSidecarFields(output) {
  if (!isPlainObject_4(output)) return {};
  let sizes = {};
  if (typeof output.originalFile === "string") sizes.sidecarOriginalFileBytes = output.originalFile.length;
  if (typeof output.original_file === "string")
    sizes.sidecarNotebookOriginalFileBytes = output.original_file.length;
  if (typeof output.updated_file === "string")
    sizes.sidecarNotebookUpdatedFileBytes = output.updated_file.length;
  if (typeof output.content === "string") sizes.sidecarContentBytes = output.content.length;
  if (isPlainObject_4(output.file)) {
    let file = output.file;
    if (typeof file.content === "string") sizes.sidecarFileContentBytes = file.content.length;
    if (typeof file.base64 === "string") sizes.sidecarFileBase64Bytes = file.base64.length;
    if (Array.isArray(file.cells)) sizes.sidecarFileCellsBytes = measureStringChars(file.cells);
  }
  if (isPlainObject_4(output.gitDiff)) {
    let patch = output.gitDiff.patch;
    if (typeof patch === "string") sizes.sidecarGitDiffPatchBytes = patch.length;
  }
  if (Array.isArray(output.structuredPatch)) {
    let r = 0;
    for (let patchHunk of output.structuredPatch) {
      if (!isPlainObject_4(patchHunk)) continue;
      let lines = patchHunk.lines;
      if (!Array.isArray(lines)) continue;
      for (let line of lines) if (typeof line === "string") r += line.length + 1;
    }
    sizes.sidecarStructuredPatchBytes = r;
  }
  return sizes;
}
/**
 * 估算工具结果的遥测指标：token 估计、图片/文档块数量，以及是否超过阈值需要落盘；出错时返回空对象。
 */
//@ chunk-e6aww6q8.js:3908209-3908522 placement
function getResultSizeTelemetry(e, n) {
  try {
    return {
      toolResultTokensEst: roughTokenCountEstimationForContent(e),
      toolResultMediaBlocks: Array.isArray(e)
        ? count(e, (r) => r.type === "image" || r.type === "document")
        : 0,
      toolResultWillPersist:
        !!e &&
        !isToolResultContentEmpty(e) &&
        exceedsPersistThreshold(
          e,
          getPersistenceThreshold(
            n.name,
            n.maxResultSizeChars,
            n.persistenceThresholdCeiling,
            n.skipAggregateToolResultBudget === !0,
          ),
        ),
    };
  } catch (error) {
    return (logError(error), {});
  }
}
//@ chunk-e6aww6q8.js:3908522-3908619 placement
function fGt(e, n) {
  let r = sdkHostToolSource(n);
  if (r !== void 0) return toolFeature(r);
  return toolFeature(String(sanitizeToolNameWithMcpFlag(e, n !== void 0)));
}
//@ chunk-e6aww6q8.js:3908619-3908673 placement
function q1o(e, n, r, s) {
  try {
    resolveUnknownTool(e, n, r, s);
  } catch (error) {
    logError(error);
  }
}
/**
 * 处理找不到的工具名：未注册的 MCP 工具、未知工具，返回对应错误。
 */
//@ chunk-e6aww6q8.js:3908673-3909926 placement
function resolveUnknownTool(e, n, r, s) {
  let { connection: connection, ambiguous: ambiguous } = resolveMcpConnectionForTool(e, r.options.mcpClients),
    S = connection ? (connection.config.type ?? "stdio") : void 0,
    w = connection ? getLoggingSafeMcpBaseUrl(connection.config) : void 0,
    L =
      !ambiguous &&
      isMcpServerLoggableInAnalytics(extractMcpToolDetails(e)?.serverName ?? "", connection?.config),
    G = qS(r.options.toolCatalog.getAllBaseTools(), e),
    q = dPe(G === void 0 ? [] : [G], e),
    Z = q ? sanitizeToolNameForAnalytics(q) : getUnknownToolAnalyticsName(e);
  logForDebugging(`Unknown tool ${Z}: ${n}`);
  let Se = G !== void 0 && mSe(G) && isBuiltInArtifactHiddenForMcp();
  logFeatureBad(
    String(Z) === "mcp_tool" ? toolFeature("unregistered_mcp") : toolFeature(String(Z)),
    "tool_not_found",
    Se ? { hidden_for_mcp: !0 } : void 0,
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
    ...(Se && { hiddenForMcp: !0 }),
    toolNameHash: gn(e),
    toolUseID: ye(n),
    isMcp: e.startsWith("mcp__"),
    ...getSubagentTelemetryFields(r.agentContext),
    ...getEffortTelemetryFields(r),
    queryChainId: ye(r.queryTracking?.chainId),
    queryDepth: r.queryTracking?.depth,
    ...(r.options.messageClientPlatform && { messageClientPlatform: yW(r.options.messageClientPlatform) }),
    ...(S && { mcpServerType: fromEnum(S) }),
    ...(w && { mcpServerBaseUrl: safeOrigin(w) }),
    ...claudeAiServerIdField(
      connection ? { serverType: connection.config.type, serverId: gH(connection.config) } : void 0,
    ),
    ...(s && { requestId: ye(s) }),
    ...mcpToolDetailsForAnalytics(e, L, connection !== void 0),
  });
}
//@ chunk-e6aww6q8.js:3909926-3909962 placement
function LKe(e) {
  return isAbortError(e) || isCancel(e);
}
//@ chunk-e6aww6q8.js:3909962-3910048 placement
function a3r(e, n) {
  return LKe(e) && n.aborted && unwrapAbortReason(n.reason) === "background"
    ? withMemoryCorrectionHint(CANCEL_MESSAGE)
    : formatToolErrorMessage(e);
}
/**
 * 后台代理或 dontAsk 模式下拒绝了带问题的权限请求时，调用工具的 settleUnaskedQuestion 给出替代答复（已问过、停止、中止或远程执行时跳过）。
 */
//@ chunk-e6aww6q8.js:3910048-3910592 placement
async function settleUnaskedQuestion(tool, decision, input, context, state) {
  if (tool.settleUnaskedQuestion === void 0 || decision.behavior !== "deny") return;
  let decisionReason = decision.decisionReason;
  if (
    decisionReason.type !== "asyncAgent" &&
    !(decisionReason.type === "mode" && decisionReason.mode === "dontAsk")
  )
    return;
  let ask = decisionReason.ask,
    { signal: signal } = context.abortController;
  if (
    ask === void 0 ||
    state.asked ||
    ask.hooksMayRefuse === !0 ||
    decision.endsTurn ||
    state.stopped ||
    signal.aborted ||
    context.forRemoteExecution === !0 ||
    getToolPermissionContext(context).servedCall === !0
  )
    return;
  try {
    let settleUnaskedQuestion = await tool.settleUnaskedQuestion(
      ask,
      input,
      context,
      decisionReason.type === "asyncAgent" && decisionReason.hookAllowIgnored === !0,
      decisionReason.type === "mode",
    );
    return settleUnaskedQuestion === "" || signal.aborted ? void 0 : settleUnaskedQuestion;
  } catch (error) {
    if (!LKe(error)) logError(error);
    return;
  }
}
//@ chunk-e6aww6q8.js:3910592-3910770 placement
function getInterruptKind(e, n) {
  let r = e instanceof ShellError && e.interrupted;
  if (!(e instanceof AbortError_2 || r || (LKe(e) && n.aborted))) return;
  return n.aborted && unwrapAbortReason(n.reason) === "background" ? "cancelled" : "interrupted";
}
/**
 * 把工具执行错误归类为错误码（MCP 认证、OAuth、shell 错误等）。
 */
//@ chunk-e6aww6q8.js:3910770-3911894 placement
function classifyToolErrorCode(e) {
  if (e instanceof McpAuthError) return { code: "tool_mcp_auth_error", isSad: !0 };
  if (
    e instanceof Error &&
    (("code" in e && typeof e.code === "string") || ("errorCode" in e && typeof e.errorCode === "string")) &&
    /^HTTP 40[13]\b/.test(e.message)
  )
    return { code: "tool_mcp_oauth_error", isSad: !0 };
  if (e instanceof ShellError) return { code: "tool_shell_error", isSad: !0 };
  if (e instanceof McpToolCallError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS)
    return { code: "tool_mcp_call_error", isSad: !0 };
  if (isSadFsErrno(e) || isEnvFsErrno(e)) return { code: "tool_fs_error", isSad: !0 };
  if (e instanceof MaxFileReadTokenExceededError) return { code: "tool_read_budget_exceeded", isSad: !0 };
  if (e instanceof TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS)
    return { code: "tool_telemetry_safe_error", isSad: !0 };
  if (e instanceof MalformedCommandError) return { code: "tool_malformed_command", isSad: !0 };
  if (e instanceof Error) {
    let r = e.name !== "Error" ? e.name : (e.constructor?.name ?? "");
    if (KNOWN_ERROR_CLASS_NAMES.has(r))
      return {
        code:
          "reasonCode" in e && typeof e.reasonCode === "string" && /^[a-z][a-z0-9_]{2,39}$/.test(e.reasonCode)
            ? e.reasonCode
            : "tool_expected_error",
        isSad: !0,
      };
  }
  if (e instanceof DOMException && e.name === "TimeoutError")
    return { code: "tool_mcp_transport_error", isSad: !0 };
  let n = getErrnoCode(e);
  if (n !== void 0 && RETRYABLE_CONNECT_CODES.has(n)) return { code: "tool_mcp_transport_error", isSad: !0 };
  return { code: "tool_call_threw", isSad: !1 };
}
//@ chunk-e6aww6q8.js:3911894-3912026 placement = getToolNameForPermissionCheck (1)
function getToolNameForPermissionCheck_3(tool) {
  let n = (r) => tool.some((s) => s.mcpInfo?.serverName === CLAUDE_ARTIFACTS && s.mcpInfo.toolName === r);
  return findToolByName(tool, WEBFETCH) !== void 0 && n(ARTIFACTS_MCP_READ_TOOL) && n(ARTIFACTS_MCP_GET_TOOL);
}
/**
 * 当内置 Artifact 工具被替换或不可用时，告诉模型应该调用哪些工具。
 */
//@ chunk-e6aww6q8.js:3912026-3918095 placement
function explainUnavailableArtifactTool(e, n, r, s, h, y, S = {}, w, L, G) {
  let q = G?.sourceFor(e) ?? L?.sourceFor(e);
  if (q?.mcpInfo !== void 0 && mcpInfoFromString(e) === null)
    return describeUnavailableMcpTool(e, s, h, y, q, G === void 0 && isToolSearchInPool(n));
  let Z = qS(r, e);
  if (
    Z !== void 0 &&
    mSe(Z) &&
    isBuiltInArtifactHiddenForMcp() &&
    n.some((At) => At.mcpInfo?.serverName === CLAUDE_ARTIFACTS)
  ) {
    let At =
      !op() && getToolNameForPermissionCheck_3(n) ? ` ${WEBFETCH} can read claude.ai artifact links.` : "";
    return G === void 0 && isToolSearchInPool(n)
      ? `. In this session the built-in Artifact tools were replaced by the tools of the MCP server '${CLAUDE_ARTIFACTS}': find them with ${TOOL_SEARCH_TOOL_NAME} and call those instead.${At}`
      : `. In this session the built-in Artifact tools were replaced by the tools of the MCP server '${CLAUDE_ARTIFACTS}', which are in your tool list: call those instead.${At}`;
  }
  if (
    !op() &&
    Z !== void 0 &&
    mSe(Z) &&
    isBuiltInArtifactHiddenForMcp() &&
    !h.some((At) => At.name === CLAUDE_ARTIFACTS && At.type === "connected")
  )
    return `. The Artifacts tools aren't available in this session right now: the MCP server '${CLAUDE_ARTIFACTS}' that replaced the built-in Artifact tools isn't connected. Tell the user; /mcp can reconnect or re-enable it, or restarting Claude Code restores the tools.`;
  if (
    !op() &&
    e === buildMcpToolName(CLAUDE_ARTIFACTS, ARTIFACTS_MCP_READ_SHARED_TOOL) &&
    isBuiltInArtifactHiddenForMcp()
  ) {
    let any = n.some(
        (qt) =>
          qt.mcpInfo?.serverName === CLAUDE_ARTIFACTS && qt.mcpInfo.toolName === ARTIFACTS_MCP_READ_TOOL,
      ),
      It = getToolNameForPermissionCheck_3(n),
      Yt = any
        ? ` ${ARTIFACTS_MCP_READ_TOOL} reads an artifact the user owns, or one from their organization that they can open; ${It ? `for a link ${ARTIFACTS_MCP_READ_TOOL} refuses, use ${WEBFETCH}.` : "for anything else, tell the user."}`
        : " Tell the user.";
    return `. ${ARTIFACTS_MCP_READ_SHARED_TOOL} isn't available in local Claude Code sessions.${Yt}`;
  }
  let Se = findToolByName(n, ARTIFACT_TOOL_NAME_2);
  if (Se !== void 0 && mcpInfoFromString(e)?.serverName === CLAUDE_ARTIFACTS && h.some(n4e))
    return `. The MCP server '${CLAUDE_ARTIFACTS}' is no longer served in this session, and the built-in Artifact tools are back${suggestToolInstead(Se, n, L, G)}`;
  let ke = Aqe(e) ?? Z?.underlyingV1ToolName;
  if (s && Z && (toolMatchesAnyName(Z, Akt) || Z.name === POLL))
    return `. ${e} is not available inside subagents. Complete the task with the tools provided and return findings to the orchestrator.`;
  if (Z?.name === BRIEF_TOOL_NAME_2)
    return `. ${e} is not enabled in this session \u2014 write your message as normal assistant text instead.`;
  if (Z?.name === GET_TASK_TOOL_TEXT) return Dpi;
  let we = Z && i$e(Z.name);
  if (
    Z &&
    !s &&
    isCoordinatorMode_2() &&
    !env.CLAUDE_CODE_SIMPLE &&
    !Unr.has(Z.name) &&
    Z.name !== POLL &&
    toolMatchesAnyName(Z, EXTERNAL_ALWAYS_AVAILABLE_TOOLS) &&
    Z.isEnabled() &&
    !getDenyRuleForTool(y, Z) &&
    (ke === void 0 || !getDenyRuleForTool(y, { name: ke })) &&
    (we === void 0 || !we.isEnabled() || !getDenyRuleForTool(y, we)) &&
    findToolByName(n, AGENT)
  )
    return `. ${e} is not available to you as the coordinator \u2014 run it from a worker via the ${AGENT} tool instead.`;
  if (Z?.name === WEBFETCH && Z.isEnabled() && !getDenyRuleForTool(y, Z)) {
    let At = typeof w === "object" && w !== null && "url" in w ? parseArtifactUrlInput(w.url) : null;
    if (
      At !== null &&
      At.env === claudeAiEnvironment() &&
      findToolByName(n, ARTIFACT_TOOL_NAME_2) &&
      !getDenyRuleForTool(y, { name: ARTIFACT_TOOL_NAME_2 })
    )
      return `. ${artifactViewerUrlFor(At)} is a claude.ai artifact \u2014 read it with the ${ARTIFACT_TOOL_NAME_2} tool (action: "read", url) instead of ${WEBFETCH}.`;
    let It =
      At !== null &&
      At.env === claudeAiEnvironment() &&
      isBuiltInArtifactHiddenForMcp() &&
      !getDenyRuleForTool(y, { name: ARTIFACT_TOOL_NAME_2 })
        ? n.find(
            (Yt) =>
              Yt.mcpInfo?.serverName === CLAUDE_ARTIFACTS && Yt.mcpInfo.toolName === ARTIFACTS_MCP_READ_TOOL,
          )
        : void 0;
    if (At !== null && It !== void 0)
      return `. ${artifactViewerUrlFor(At)} is a claude.ai artifact \u2014 read it with ${It.name} (slug: "${At.slug}") instead of ${WEBFETCH}.`;
    if (canUseWebFetchAgent(n, y, { activeAgents: S.activeAgents })) {
      if (canUseWebFetchAgent(n, y, S))
        return `. ${WEBFETCH} is not available directly in this context \u2014 use the ${AGENT} tool with subagent_type: "${WEB_FETCH_AGENT}" to read web pages instead.`;
      return (S.depth ?? 0) === 0
        ? `. ${WEBFETCH} is not available in this context, and the ${WEB_FETCH_AGENT} agent that reads web pages for this session is outside this session's allowed subagent types. If the page is required, tell the user.`
        : `. ${WEBFETCH} is not available in this context, and the ${WEB_FETCH_AGENT} agent that reads web pages for this session cannot be dispatched from here (this agent's nesting depth or allowed subagent types rule it out). If the page is required, say so in your report so the caller can fetch it.`;
    }
  }
  let Ee = G ?? (isToolSearchInPool(n) ? L : void 0),
    Ae =
      (L?.keeps(e) === !0 || G?.keeps(e) === !0) &&
      q?.mcpInfo === void 0 &&
      mcpInfoFromString(e) === null &&
      !toolMatchesAnyName({ name: e, underlyingV1ToolName: ke }, getShadowedSearchToolNames()),
    Ie = Ae && qYr(describeToolAvailability(e, h, y, q)),
    Me = Ae && Ee?.keeps(e) === !0 && !Ie && !findToolByName(n, e),
    We = Z?.name === SENDMESSAGE,
    ze =
      We && canSpawnSubagents(n, y, S)
        ? ` To follow up on an agent's work, start a new ${AGENT} call with everything it needs in its prompt.`
        : "",
    lt = We
      ? ` An agent cannot be continued from this context. To message another session, use your host application's own messaging tool if it provides one; otherwise that is not possible from here.${ze}`
      : "";
  if (Me) {
    if (
      Z !== void 0 &&
      (!Z.isEnabled() || isToolOmittedByLaunchToolList(y, Z) || isOutsideLaunchToolList(y, Z))
    )
      return e === ASKUSERQUESTION && !ebe()
        ? `. ${e} is still listed for this conversation, but nobody in this session can answer it, so it cannot run. Continue without it; if you need the user's decision, ask in your response text instead.`
        : `. ${e} is still listed for this conversation but is switched off in this session right now, so it cannot run. Continue without it.${lt}`;
    return `. ${e} is still listed for this conversation, but nothing in this session provides it right now (its source was removed or disconnected, or this version no longer has it), so it cannot run. Continue without it.${lt}`;
  }
  if (We) return `. ${SENDMESSAGE} is not among the tools available here.${lt}`;
  if (Z || Ie)
    return Ie ||
      !Z?.isEnabled() ||
      getDenyRuleForTool(y, Z) ||
      isOutsideLaunchToolList(y, Z) ||
      (ke !== void 0 && getDenyRuleForTool(y, { name: ke })) ||
      (we?.isEnabled() && getDenyRuleForTool(y, we))
      ? `. ${e} is disabled for this session, in subagents as well as here.`
      : `. ${e} is not among the tools available here. Continue with the tools you have.`;
  if (toolMatchesAnyName({ name: e, underlyingV1ToolName: ke }, getShadowedSearchToolNames())) {
    let At = (ke ?? e) === GLOB_TOOL_NAME ? GLOB_TOOL_NAME : GREP_TOOL_NAME;
    if (!findToolByName(n, BASH_TOOL_NAME)) return `. ${At} is disabled for this session.`;
    return At === GLOB_TOOL_NAME
      ? `. ${GLOB_TOOL_NAME} is not available in this session \u2014 find files with \`find\` via the ${BASH_TOOL_NAME} tool instead.`
      : `. ${GREP_TOOL_NAME} is not available in this session \u2014 search file contents with \`grep\` via the ${BASH_TOOL_NAME} tool instead.`;
  }
  let Je = s ? "" : suggestWaitForMcpServers(e, n, h);
  if (Je) return Je;
  if ((l$e() && jW().hasTool(e)) || L?.has(e) || G?.has(e))
    return describeUnavailableMcpTool(e, s, h, y, q, G === void 0 && isToolSearchInPool(n));
  if (typeof e !== "string") return "";
  let filtered = n.filter((At) => At.name.toLowerCase() === e.toLowerCase()),
    [pt] = filtered;
  if (pt !== void 0 && filtered.length === 1 && !isDeferredToolInConversation(pt, L, n))
    return `. Tool names are case-sensitive: call ${pt.name} instead.`;
  let found = CHROME_TOOL_NAMES.find((At) => At === e);
  if (found !== void 0) {
    let filtered = n.filter((Yt) => {
        let lower = Yt.name.toLowerCase();
        return lower === found || lower.endsWith(`__${found}`);
      }),
      [It] = filtered;
    if (
      It !== void 0 &&
      filtered.length === 1 &&
      isInputSchemaCompatible(It, w) &&
      uae.some((Yt) => It.name === Yt + found)
    )
      return suggestToolInstead(It, n, L, G);
  }
  let yt = matchLocalToolAlias(
      e,
      n.map((At) => At.name),
    ),
    gt = yt === void 0 ? void 0 : findToolByName(n, yt);
  if (gt !== void 0 && isInputSchemaCompatible(gt, w)) return suggestToolInstead(gt, n, L, G);
  return "";
}
//@ chunk-e6aww6q8.js:3918095-3918311 placement
function isInputSchemaCompatible(e, n) {
  let r = e.inputJSONSchema?.properties,
    s = e.inputJSONSchema?.required;
  return (
    r === void 0 ||
    (isPlainObject_3(n) &&
      Object.keys(n).every((h) => Object.hasOwn(r, h)) &&
      (Object.keys(n).length > 0 || !Array.isArray(s) || s.length === 0))
  );
}
//@ chunk-e6aww6q8.js:3918311-3918503 placement
function suggestToolInstead(e, n, r, s) {
  return s === void 0 && isToolSearchInPool(n) && isDeferredToolInConversation(e, r, n)
    ? `. Call ${e.name} instead, loading it first with ${TOOL_SEARCH_TOOL_NAME} query "select:${e.name}" if it is not loaded yet.`
    : `. Call ${e.name} instead.`;
}
/**
 * 为不可用的 MCP 工具生成说明后缀：按状态（重连中、需授权、策略阻止、保留地址、断开、禁用、关闭、组织阻止、已认证占位、未提供、被拒、未配置）给出继续方式。
 */
//@ chunk-e6aww6q8.js:3918503-3921286 placement
function describeUnavailableMcpTool(toolName, isRestrictedContext, tools, mcpClients, tool, viaToolSearch) {
  if (tool?.mcpInfo === void 0 && !toolName.startsWith("mcp__")) return "";
  let availability = describeToolAvailability(toolName, tools, mcpClients, tool),
    sharedNote = appToolServerErrorSuffix(availability, Boolean(isRestrictedContext));
  if (sharedNote !== void 0) return sharedNote;
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
  let y = normalizeNameForMCP(h),
    found = r.find((w) => w.type === "pending" && (w.name === h || normalizeNameForMCP(w.name) === y));
  if (!found) return "";
  return `. The MCP server '${found.name}' is still connecting. Call ${WAITFORMCPSERVERS} to wait for it, then try again.`;
}
//@ chunk-e6aww6q8.js:3921570-3921625 placement
function B$n(e) {
  return Array.from({ length: e }, () => ZR());
}
/**
 * 对象是否带 type 字段。
 */
//@ chunk-e6aww6q8.js:3921625-3921657 placement = extractErrorTypeFromData (1)
function hasTypeField(data) {
  return "type" in data;
}
//@ chunk-e6aww6q8.js:3921657-3921681 placement
class nat {
  fired = new Set();
}
//@ chunk-e6aww6q8.js:3921681-3921830 placement
function shouldLogGitCommitDetails(e, n) {
  return (
    isToolDetailsLoggingEnabled() &&
    (e.name === BASH_TOOL_NAME || e.name === POWERSHELL_TOOL_NAME) &&
    typeof n === "object" &&
    n !== null &&
    "command" in n &&
    typeof n.command === "string" &&
    isGitCommitCommand(n.command)
  );
}
//@ chunk-e6aww6q8.js:3921830-3921913 placement
function qPe(e) {
  return getBackgroundAgentId(e.agentContext) ?? (e.isBackgroundAgent ? e.agentId : void 0);
}
/**
 * runToolUse：单个 tool_use 的入口。等待前置排空与会话活动锁，按名字/别名查工具（别名调用记 tengu_dead_probe_tool_alias_exec），工具缺失但 MCP 服务器连接中时等待；检查隔离锁（拒绝时返回 permission-rule 错误）；判定在本机、远端或拒绝运行；本机时进 streamedCheckPermissionsAndCallTool。异常转成 tool_result 错误并按错误码分类上报。
 */
//@ chunk-e6aww6q8.js:3921913-3927718 placement
async function* runToolUse(
  toolUse,
  assistantMessage,
  canUseTool,
  toolUseContext,
  now,
  stallSampler = profileCheckpoint_2,
) {
  if (Etr())
    await waitForAttachmentFiles(toolUseContext.abortController.signal, {
      activityAgentId: qPe(toolUseContext),
    });
  let peek = kGr.peek(toolUseContext.session);
  if (peek !== void 0 && peek.pending() > 0)
    await waitForStagedToolCallFiles(peek, toolUseContext.abortController.signal, qPe(toolUseContext));
  if (isTerminalShutdown() && !toolUseContext.abortController.signal.aborted) await heldUntilExit();
  let w = toolUse.name,
    L = qS(toolUseContext.options.tools, w, toolUseContext.options.toolAliases);
  if (L && L.name !== w && L.aliases?.includes(w) && !toolUseContext.toolState.get(nat).fired.has(w))
    (toolUseContext.toolState.get(nat).fired.add(w),
      logEvent("tengu_dead_probe_tool_alias_exec", {
        alias: sanitizeToolNameForAnalytics(w),
        tool: sanitizeToolNameForAnalytics(L.name),
      }));
  let id = assistantMessage.message.id,
    requestId = assistantMessage.requestId;
  if (!L && shouldWaitForMcpTool(w, toolUseContext)) {
    let lt = await waitForMcpToolServer(w, toolUseContext.options.tools, toolUseContext, {
      absentGraceMs: 0,
      skipExhausted: !0,
      responseId: id ? `${requestId ?? ""}|${id}` : void 0,
    });
    if (
      (logEvent("tengu_mcp_pending_tool_wait", {
        found: lt.tool !== void 0,
        aborted: lt.aborted,
        waited_ms: lt.waitedMs,
        server_state: fromEnum(lt.serverState),
        server_state_at_start: fromEnum(lt.initialServerState),
        handed_off: assistantMessage.handedOff === !0,
      }),
      lt.tool)
    ) {
      let options = toolUseContext.options,
        nt = {
          ...options,
          tools: lt.tools,
          mcpClients: [...currentMcpClients(toolUseContext)],
          activeMcpServer: void 0,
          activeMcpTool: void 0,
        };
      try {
        yield* runToolUse(
          toolUse,
          assistantMessage,
          canUseTool,
          { ...toolUseContext, options: nt },
          now,
          stallSampler,
        );
      } finally {
        if (nt.activeMcpServer !== void 0 && !toolUseContext.abortController.signal.aborted)
          ((options.activeMcpServer = nt.activeMcpServer), (options.activeMcpTool = nt.activeMcpTool));
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
  if (!L) {
    let lt = explainUnavailableArtifactTool(
      w,
      toolUseContext.options.tools,
      toolUseContext.options.toolCatalog.getAllBaseTools(),
      toolUseContext.agentId,
      currentMcpClients(toolUseContext),
      getToolPermissionContext(toolUseContext),
      getAgentSpawnContext(toolUseContext),
      toolUse.input,
      Hrt(toolUseContext),
      Tbn(toolUseContext),
    );
    (q1o(w, toolUse.id, toolUseContext, requestId),
      yield {
        message: createUserMessage({
          content: [
            {
              type: "tool_result",
              content: `<tool_use_error>Error: No such tool available: ${w}${lt}</tool_use_error>`,
              is_error: !0,
              tool_use_id: toolUse.id,
            },
          ],
          toolUseResult: `Error: No such tool available: ${w}${lt}`,
          sourceToolAssistantUUID: assistantMessage.uuid,
          now: now,
        }),
      });
    return;
  }
  D7s(w, L.name);
  let { connection: connection, ambiguous: ambiguous } = resolveMcpConnectionForTool(
      w,
      toolUseContext.options.mcpClients,
    ),
    ke = connection && isConnectedOrCached(connection) ? connection : void 0,
    we = ke ? (ke.config.type ?? "stdio") : void 0,
    Ee = ke ? getLoggingSafeMcpBaseUrl(ke.config) : void 0,
    Ae = extractMcpToolDetails(w)?.serverName,
    Ie = Ae !== void 0 && Ae !== extractMcpToolDetails(L.name)?.serverName,
    Me =
      !ambiguous &&
      !Ie &&
      isMcpServerLoggableInAnalytics(extractMcpToolDetails(w)?.serverName ?? "", ke?.config),
    We = fGt(L.name, L.mcpInfo),
    input = toolUse.input;
  try {
    if (toolUseContext.abortController.signal.aborted) {
      (logEvent("tengu_tool_use_cancelled", {
        toolName: sanitizeToolNameForAnalytics(L.name),
        toolUseID: ye(toolUse.id),
        isMcp: L.isMcp ?? !1,
        phase: lit_2("entry"),
        abortKind: fromEnum(classifyAbortReasonForTelemetry(toolUseContext.abortController.signal.reason)),
        queryChainId: ye(toolUseContext.queryTracking?.chainId),
        queryDepth: toolUseContext.queryTracking?.depth,
        ...(we && { mcpServerType: fromEnum(we) }),
        ...(Ee && { mcpServerBaseUrl: safeOrigin(Ee) }),
        ...(requestId && { requestId: ye(requestId) }),
        ...mcpToolAnalyticsFields(L.name, Me),
        ...claudeAiServerIdField(L.mcpInfo),
        ...L.mcpInfo?.pluginTelemetry,
      }),
        yield {
          message: createCancelledToolResult(
            toolUse.id,
            assistantMessage,
            toolUseContext.abortController.signal,
            now,
          ),
        });
      return;
    }
    let lt = isHookCallerVirtualTool(assistantMessage, toolUseContext)
      ? null
      : getNotLoadedToolVerdict(L, toolUseContext, toolUse.id);
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
          isMcp: !0,
          ...getSubagentTelemetryFields(toolUseContext.agentContext),
          ...getEffortTelemetryFields(toolUseContext),
          queryChainId: ye(toolUseContext.queryTracking?.chainId),
          queryDepth: toolUseContext.queryTracking?.depth,
          ...(toolUseContext.options.messageClientPlatform && {
            messageClientPlatform: yW(toolUseContext.options.messageClientPlatform),
          }),
          ...(we && { mcpServerType: fromEnum(we) }),
          ...(Ee && { mcpServerBaseUrl: safeOrigin(Ee) }),
          ...(requestId && { requestId: ye(requestId) }),
          ...mcpToolAnalyticsFields(L.name, Me),
          ...claudeAiServerIdField(L.mcpInfo),
          ...L.mcpInfo?.pluginTelemetry,
        };
        if (
          (logEvent("tengu_tool_use_not_loaded", { enforced: lt.enforced, toolUseID: ye(toolUse.id), ...gt }),
          lt.enforced)
        )
          (logFeatureSad(We, "tool_not_loaded"),
            logEvent("tengu_tool_use_error", {
              error: lit_2("InputValidationError"),
              errorCode: fromEnum(TOOL_NOT_LOADED),
              messageID: ye(id),
              ...gt,
            }));
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
                is_error: !0,
                tool_use_id: toolUse.id,
              },
            ],
            toolUseResult: lt.message,
            sourceToolAssistantUUID: assistantMessage.uuid,
            now: now,
          }),
        };
        return;
      }
    }
    let Je = checkWebIsolation(L, toolUseContext, toolUse.input);
    if (Je.denyMessage) {
      (logFeatureSad(We, "tool_isolation_denied"),
        logEvent("tengu_tool_use_isolation_latch_denied", {
          toolName: sanitizeToolNameForAnalytics(L.name),
          toolUseID: ye(toolUse.id),
          isMcp: L.isMcp ?? !1,
          isolationLatch: fromEnumOpt(Je.activeLatch),
          isolationClassifiedAs: fromEnumOpt(Je.classifiedAs),
          queryChainId: ye(toolUseContext.queryTracking?.chainId),
          queryDepth: toolUseContext.queryTracking?.depth,
          ...(we && { mcpServerType: fromEnum(we) }),
          ...(Ee && { mcpServerBaseUrl: safeOrigin(Ee) }),
          ...(requestId && { requestId: ye(requestId) }),
          ...mcpToolAnalyticsFields(L.name, Me),
          ...claudeAiServerIdField(L.mcpInfo),
          ...L.mcpInfo?.pluginTelemetry,
        }),
        yield {
          message: createUserMessage({
            content: [
              {
                type: "tool_result",
                content: `<tool_use_error>${Je.denyMessage}</tool_use_error>`,
                is_error: !0,
                tool_use_id: toolUse.id,
              },
            ],
            toolUseResult: `Error: ${Je.denyMessage}`,
            toolDenialKind: "permission-rule",
            sourceToolAssistantUUID: assistantMessage.uuid,
            now: now,
          }),
        });
      return;
    }
    let nt = jXt(L, input, toolUseContext, toolUse.id) ? new Stream() : void 0,
      pt = routeToolCallWithAdoption(
        L,
        input,
        toolUseContext,
        toolUse.id,
        nt === void 0
          ? void 0
          : (gt, At) =>
              nt.enqueue({
                type: "notification",
                notification: {
                  key: `remote-tool-status-${toolUse.id}`,
                  text: gt,
                  priority: "medium",
                  ...(At !== void 0 && { timeoutMs: At }),
                },
              }),
      );
    if (nt !== void 0) {
      pt.then(
        () => nt.done(),
        () => nt.done(),
      );
      for await (let gt of nt) yield gt;
    }
    let Et = describeCoordinatorRefusal(L, toolUseContext, await pt);
    if (Et.where === "refused") {
      yield {
        message: createUserMessage({
          content: [
            {
              type: "tool_result",
              content: `<tool_use_error>${Et.message}</tool_use_error>`,
              is_error: !0,
              tool_use_id: toolUse.id,
            },
          ],
          toolUseResult: `Error: ${Et.message}`,
          sourceToolAssistantUUID: assistantMessage.uuid,
          now: now,
        }),
      };
      return;
    }
    if (Et.where === "elsewhere") {
      try {
        yield* Et.hosts.runToolUse({
          tool: L,
          toolUse: toolUse,
          route: Et.route,
          assistantMessage: assistantMessage,
          toolUseContext: toolUseContext,
          canUseTool: canUseTool,
          now: now,
        });
      } finally {
        clearToolUsePermissionState(toolUseContext.session, toolUse.id);
      }
      return;
    }
    let yt = withPlanPath(L.name, Et.input, toolUseContext.agentId);
    for await (let gt of streamedCheckPermissionsAndCallTool(
      L,
      toolUse.id,
      yt,
      toolUseContext,
      canUseTool,
      assistantMessage,
      id,
      requestId,
      we,
      Ee,
      Me,
      now,
      stallSampler,
    ))
      yield gt;
  } catch (error) {
    let Je = error instanceof Error ? error.message : String(error),
      nt = L ? ` (${L.name})` : "";
    if (!LKe(error)) {
      let { code: code, isSad: isSad } = classifyToolErrorCode(error);
      if (
        (logForDebugging(
          `runToolUse error${L ? ` (${toolCategoryForTelemetry(L)})` : ""}: code=${code} errorChars=${Je.length}`,
        ),
        isSad)
      )
        logFeatureSad(We, code);
      else (logError(error), logFeatureBad(We, "tool_unexpected_error"));
    }
    let pt = `Error calling tool${nt}: ${Je}`;
    yield {
      message: createUserMessage({
        content: [
          {
            type: "tool_result",
            content: `<tool_use_error>${pt}</tool_use_error>`,
            is_error: !0,
            tool_use_id: toolUse.id,
          },
        ],
        toolUseResult: pt,
        toolDenialKind: getInterruptKind(error, toolUseContext.abortController.signal),
        interruptedByShutdown: shutdownInterruptStamp(toolUseContext.abortController.signal),
        sourceToolAssistantUUID: assistantMessage.uuid,
        now: now,
      }),
    };
  }
}
/**
 * streamedCheckPermissionsAndCallTool：把 checkPermissionsAndCallTool 包成异步流。进度消息即时转成 progress 消息（记 tengu_tool_use_progress），按需修复输入（coerceInput），运行 tool.call 模块级 hook（W$n），记录权限决策与沙箱违规，最后把结果逐条入流。
 */
//@ chunk-e6aww6q8.js:3927718-3930188 fingerprint = streamedCheckPermissionsAndCallTool (0.414)
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
  function we(progress) {
    if (progress.type !== "progress") {
      stream.enqueue(progress);
      return;
    }
    if (progress.data.type !== "tool_heartbeat")
      logEvent("tengu_tool_use_progress", {
        messageID: ye(messageId),
        toolName: sanitizeToolNameForAnalytics(tool.name),
        isMcp: tool.isMcp ?? !1,
        queryChainId: ye(toolUseContext.queryTracking?.chainId),
        queryDepth: toolUseContext.queryTracking?.depth,
        ...(mcpServerType && { mcpServerType: fromEnum(mcpServerType) }),
        ...(mcpServerBaseUrl && { mcpServerBaseUrl: safeOrigin(mcpServerBaseUrl) }),
        ...(requestId && { requestId: ye(requestId) }),
        ...mcpToolAnalyticsFields(tool.name, mcpNameLoggable),
        ...claudeAiServerIdField(tool.mcpInfo),
        ...tool.mcpInfo?.pluginTelemetry,
      });
    stream.enqueue({
      message: createProgressMessage({
        toolUseID: progress.toolUseID,
        parentToolUseID: progress.parentToolUseID ?? toolUseID,
        data: progress.data,
        now: now,
      }),
    });
  }
  let Ee =
      tool.coerceInput !== void 0 && !isUnparsedInputMarker(input)
        ? { repair: tool.coerceInput(input), sent: input }
        : void 0,
    Ae = Ee?.repair?.input,
    Ie = isPlainObject_4(Ae) ? Ae : input,
    Me = tze(assistantMessage, Ie),
    We = Me ?? void 0,
    ze = ENn(toolUseContext, Ie),
    lt = {
      input:
        isPlainObject_4(Ie) &&
        isAutoClassifierActive(
          getToolPermissionContext(toolUseContext).mode,
          getToolPermissionContext(toolUseContext).servedCall === !0,
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
          : void 0,
      used: !1,
    },
    Je = !1,
    nt,
    pt = (It, Yt, qt) => {
      let Zt = {},
        rn = lt.input !== void 0 && !lt.used;
      lt.used = !0;
      let pn = rn ? lt.input : It,
        no = !rn && nze(Me, It),
        managedLeft = gt.managedLeft(),
        ho = !no
          ? []
          : managedLeft !== void 0 && eP(It, managedLeft)
            ? gt.managedRewrites()
            : [...gt.managedRewrites(), { kind: "mod", source: "mod" }];
      return checkPermissionsAndCallTool(
        tool,
        toolUseID,
        pn,
        Lqr(Yt, ze, pn),
        canUseTool,
        assistantMessage,
        messageId,
        requestId,
        mcpServerType,
        mcpServerBaseUrl,
        mcpNameLoggable,
        now,
        stallSampler,
        we,
        {
          changed: no,
          kinds: ho.map((results) => results.kind),
          sources: ho.map((yn) => yn.source),
          written: Me,
        },
        We !== void 0 && !eP(pn, We),
        Zt,
        qt,
        Ee,
        rn,
      )
        .then((yn) => {
          let { decided: decided } = Zt;
          if ((v3r(yn, toolUseID, decided?.record), (nt = decided?.mode ?? nt), decided !== void 0 && !Je))
            Je = logToolSafetyEvent({
              tool: tool,
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
    },
    Et = nSi(m3t(tool.name, toolUseID, Ie), toolUseContext.agentId),
    yt = !1,
    gt = createToolCallChain(tool, toolUseContext, pt, (It) =>
      obe(tool, Ie, It)
        ? guardAccountMemoryHookRewrite(tool, "PreToolUse", "tool.call hook").message
        : void 0,
    );
  if (hasModuleHookingSite("tool.call", { ...Ie, tool: tool.name, tool_use_id: toolUseID }))
    toolUseContext.markToolCallStarted?.(toolUseID);
  Pht(toolUseID, toolUseContext.hookOrigin);
  let At = W$n({
    signal: toolUseContext.abortController.signal,
    origin: toolUseContext.hookOrigin,
    core: { "tool.call": gt.core },
    managed: { "tool.call": gt.managed },
    withoutModuleHandlers: toolUseContext.options.settingsHooksOff ? !0 : void 0,
  });
  return (
    runInHeldDirectory(toolUseContext.session.project?.cwd, () =>
      releaseToolServerHold(tool).then(() => At.tool.call(Et)),
    )
      .then((It) =>
        applyToolCallHookResult(It, gt, {
          tool: tool,
          input: Et,
          toolUseContext: toolUseContext,
          assistantMessage: assistantMessage,
          now: now,
        }),
      )
      .then(
        (It) => {
          logHookPushbacks({
            updates: It,
            tool: tool,
            toolUseId: toolUseID,
            getPermissionMode: () => nt ?? getToolPermissionContext(toolUseContext).mode,
            agentContext: toolUseContext.agentContext,
            toolCatalog: toolUseContext.options.toolCatalog,
          });
          for (let result of It) stream.enqueue(result);
          stream.done();
        },
        (error) => {
          (zLe(toolUseID), stream.error(error));
        },
      ),
    stream
  );
}
/**
 * 工具搜索乐观开启（isToolSearchEnabledOptimistic）且当前工具列表里有 ToolSearch。
 */
//@ chunk-e6aww6q8.js:3930188-3930223 layout
function isToolSearchInPool(e) {
  return isToolSearchEnabledOptimistic() && isToolSearchToolAvailable(e);
}
/**
 * 判断调用的工具是否是"schema 没发给 API 的延迟工具"：工具搜索在池中、该工具在本对话应延迟、且历史中未被发现（extractDiscoveredToolNames 不含它）。buildSchemaNotSentHint 与未加载判定都依赖它。
 */
//@ chunk-e6aww6q8.js:3930223-3930305 layout
function isDeferredSchemaNotSent(e, n, r, s, h) {
  return (
    isToolSearchInPool(r) &&
    isDeferredToolInConversation(e, s, r) &&
    !extractDiscoveredToolNames(n, { surfaced: h }).has(e.name)
  );
}
//@ chunk-e6aww6q8.js:3930305-3930472 layout = countToolCallsSince (1)
function countToolCallsSince_9(e, n, r) {
  return n.some(
    (s) =>
      s.type === "assistant" &&
      Array.isArray(s.message.content) &&
      s.message.content.some((block) => block.type === "tool_use" && block.name === e && block.id !== r),
  );
}
/**
 * 未加载工具检查自身出错时的兜底：记 tengu_tool_use_not_loaded_check_failed{part} 并 logError，两步都吞掉异常，不影响工具调用。
 */
//@ chunk-e6aww6q8.js:3930472-3930574 layout
function logNotLoadedCheckFailure(e, n) {
  try {
    logEvent("tengu_tool_use_not_loaded_check_failed", { part: fromEnum(e) });
  } catch {}
  try {
    logError(n);
  } catch {}
}
/**
 * 为"调用未加载的延迟工具"收集附加信息：late（工具本不该延迟）、loadInSameReply（同一回答里已调用 ToolSearch）、firstForTool（本对话首次调用该工具）、relayActive（中继缓存活跃）。
 */
//@ chunk-e6aww6q8.js:3930574-3930902 layout
function getNotLoadedCallNotes(e, n, r) {
  try {
    let s = n.sameTurnToolUses ?? [];
    return {
      late: !isDeferredToolInConversation(e, void 0, n.options.tools),
      loadInSameReply: countToolCallsSince_9(TOOL_SEARCH_TOOL_NAME, s),
      firstForTool: !countToolCallsSince_9(e.name, n.messages, r) && !countToolCallsSince_9(e.name, s),
      relayActive: webIsolationModule?.getTeleportCacheState().status === "active",
    };
  } catch (error) {
    return (
      logNotLoadedCheckFailure("notes", error),
      { late: !1, loadInSameReply: !1, firstForTool: !1, relayActive: !1 }
    );
  }
}
//@ chunk-e6aww6q8.js:3930902-3930967 layout
function isHookCallerVirtualTool(e, n) {
  return e.isVirtual === !0 && n.hookCaller !== void 0;
}
/**
 * 延迟工具未加载就被调用时的判定：工具属于受管家族、工具搜索处于 tst 或已声明、且 schema 未发送时，返回 {enforced, flagSource, coworkSurface, family, message, …notes}，否则 null。出错时记失败事件返回 null。
 */
//@ chunk-e6aww6q8.js:3930967-3931383 layout
function getNotLoadedToolVerdict(e, n, r) {
  try {
    let s = getDeviceToolKind(e);
    if (s === void 0) return null;
    let tools = n.options.tools,
      y = Hrt(n);
    if (
      Tbn(n) !== void 0 ||
      isToolSearchPrecluded(n.options.mainLoopModel, tools) ||
      !(getToolSearchMode() === "tst" || y?.has(TOOL_SEARCH_TOOL_NAME) === !0) ||
      !isDeferredSchemaNotSent(
        e,
        n.messages,
        tools,
        y,
        getSurfacedToolNames(n.stickyBetas ?? getStickyBetas()),
      )
    )
      return null;
    let S = notLoadedToolPolicy();
    return {
      enforced: S.inForce,
      flagSource: S.flagSource,
      coworkSurface: S.coworkSurface,
      family: s,
      message: buildNotLoadedToolError(e.name),
      ...getNotLoadedCallNotes(e, n, r),
    };
  } catch (error) {
    return (logNotLoadedCheckFailure("verdict", error), null);
  }
}
/**
 * 调用了 schema 未发送的延迟工具时生成提示：说明 schema 不在已发现集合里、类型化参数会被当成字符串，要求先 ToolSearch select:<name> 再重试，并附上该工具的 JSON schema。
 */
//@ chunk-e6aww6q8.js:3931383-3931895 fingerprint = buildSchemaNotSentHint (0.723)
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
/**
 * 生成"已取消"的工具结果：记 tengu_tool_use_cancelled（阶段 validate_input/permission/... 与中断原因），返回 toolDenialKind=cancelled 的 tool_result。
 */
//@ chunk-e6aww6q8.js:3931895-3932586 fingerprint = runToolUse (0.478)
function buildCancelledToolResult(e) {
  let {
    phase: phase,
    cancelText: cancelText = CANCEL_MESSAGE,
    tool: tool,
    toolUseID: toolUseID,
    toolUseContext: toolUseContext,
    assistantMessage: assistantMessage,
    mcpServerType: mcpServerType,
    mcpServerBaseUrl: mcpServerBaseUrl,
    mcpNameLoggable: mcpNameLoggable,
    requestId: requestId,
    now: now,
  } = e;
  logEvent("tengu_tool_use_cancelled", {
    toolName: sanitizeToolNameForAnalytics(tool.name),
    toolUseID: ye(toolUseID),
    isMcp: tool.isMcp ?? !1,
    phase: fromEnum(phase),
    abortKind: fromEnum(classifyAbortReasonForTelemetry(toolUseContext.abortController.signal.reason)),
    queryChainId: ye(toolUseContext.queryTracking?.chainId),
    queryDepth: toolUseContext.queryTracking?.depth,
    ...(mcpServerType && { mcpServerType: fromEnum(mcpServerType) }),
    ...(mcpServerBaseUrl && { mcpServerBaseUrl: safeOrigin(mcpServerBaseUrl) }),
    ...(requestId && { requestId: ye(requestId) }),
    ...mcpToolAnalyticsFields(tool.name, mcpNameLoggable),
    ...claudeAiServerIdField(tool.mcpInfo),
    ...tool.mcpInfo?.pluginTelemetry,
  });
  let sanitizedToolName = createCancelledToolResultBlock(toolUseID);
  return (
    (sanitizedToolName.content = withMemoryCorrectionHint(cancelText)),
    [
      {
        message: createUserMessage({
          content: [sanitizedToolName],
          toolUseResult: cancelText,
          toolDenialKind: "cancelled",
          sourceToolAssistantUUID: assistantMessage.uuid,
          now: now,
        }),
      },
    ]
  );
}
//@ chunk-e6aww6q8.js:3932586-3932738 layout = isUnrecognizedKeysIssue (0.804)
function isUnrecognizedKeysIssue_2(e, n) {
  let safeParse = e.safeParse(n);
  if (safeParse.success) return null;
  let filtered = safeParse.error.issues.filter((issue) => issue.code !== "unrecognized_keys");
  return filtered.length > 0 ? filtered : null;
}
/**
 * 向结果列表推入 hook_stopped_continuation 附件（hookName=PreToolUse:<工具名>），表示 PreToolUse hook 阻止了继续。
 */
//@ chunk-e6aww6q8.js:3932738-3932917 layout
function pushHookStoppedContinuation(e, { toolName: toolName, toolUseID: toolUseID, message: message }) {
  e.push({
    message: createAttachmentMessage_2({
      type: "hook_stopped_continuation",
      message: message,
      hookName: `PreToolUse:${toolName}`,
      toolUseID: toolUseID,
      hookEvent: "PreToolUse",
    }),
  });
}
/**
 * 判断工具调用是否需要"外部结果读取器"：有非内置插件模块已加载→plugin_loaded，插件加载中→plugins_loading，有会话外的 PostToolUse hook→post_tool_use_hook，否则 undefined。
 */
//@ chunk-e6aww6q8.js:3932917-3933145 layout
function getOutsideResultReaderBlocker(e) {
  if (getPluginRegistry().loadedModules.some((loadedModule) => !hasLink(loadedModule)))
    return "plugin_loaded";
  if (arePermissionHooksUnsettled()) return "plugins_loading";
  return hasOnlyOwnCallbacksToRun(
    "PostToolUse",
    e.sessionHooksRegistry,
    registerAgent(e, "PostToolUse", e.session.id),
    e,
    mn(),
  )
    ? void 0
    : "post_tool_use_hook";
}
/**
 * checkPermissionsAndCallTool：一次工具调用的完整生命周期。1) JSON 解析失败/schema 校验失败 → InputValidationError（可附"选项本会话不可用"或"schema 未发送"提示）；2) validateInput（带拒绝规则时记录）；3) PreToolUse hooks（可改输入、给权限结论、阻止继续、追加上下文）；4) 权限决策（hook 结论 → 规则/模式/分类器 → canUseTool 询问），拒绝时返回错误；5) 调用 tool.call（进度、中断监听、工作目录变化检查、协调者 Bash 限制）；6) mapToolResultToToolResultBlockParam、结果持久化与大小预算；7) PostToolUse / PostToolUseFailure hooks；8) OTel 与 tengu_tool_use_* 统计。
 */
//@ chunk-e6aww6q8.js:3933145-3968539 fingerprint = checkPermissionsAndCallTool (0.393)
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
  usedClassifierInput = !1,
) {
  let errorContent = fGt(tool.name, tool.mcpInfo),
    lt = builtinToolServedByMcp(tool) ?? tool.name,
    Je = coercion?.repair && eP(input, coercion.repair.input) ? coercion.sent : input,
    nt = jsonStringify(Je).length,
    pt = S3e(),
    schemaHint = parseToolInput(tool, input, coercion);
  if (!schemaHint.ok && schemaHint.cause === "json") {
    let { raw: raw, len: len } = schemaHint,
      Li = truncateToLength(raw, 200),
      Qs = `${tool.name} was called with input that could not be parsed as JSON.
You sent (first ${Li.length} of ${len} bytes): ${Li}
Common causes: unescaped backslashes in file paths (use / or \\\\), unescaped control characters, or truncated output. Retry with valid JSON.`;
    return (
      logFeatureSad(errorContent, "tool_input_validation_failed"),
      logEvent("tengu_tool_use_error", {
        error: lit_2("InputValidationError"),
        errorCode: lit_2("JSON_PARSE"),
        errorDetailsHash: gn(`${tool.name}: unparsed tool input`),
        messageID: ye(messageId),
        toolName: sanitizeToolNameForAnalytics(tool.name),
        isMcp: tool.isMcp ?? !1,
        ...getSubagentTelemetryFields(toolUseContext.agentContext),
        ...getEffortTelemetryFields(toolUseContext),
        toolInputSizeBytes: len,
        queryChainId: ye(toolUseContext.queryTracking?.chainId),
        queryDepth: toolUseContext.queryTracking?.depth,
        ...(toolUseContext.options.messageClientPlatform && {
          messageClientPlatform: yW(toolUseContext.options.messageClientPlatform),
        }),
        ...(mcpServerType && { mcpServerType: fromEnum(mcpServerType) }),
        ...(mcpServerBaseUrl && { mcpServerBaseUrl: safeOrigin(mcpServerBaseUrl) }),
        ...(requestId && { requestId: ye(requestId) }),
        ...mcpToolAnalyticsFields(tool.name, mcpNameLoggable),
        ...claudeAiServerIdField(tool.mcpInfo),
        ...tool.mcpInfo?.pluginTelemetry,
      }),
      [
        {
          message: createUserMessage({
            content: [
              {
                type: "tool_result",
                content: `<tool_use_error>InputValidationError: ${Qs}</tool_use_error>`,
                is_error: !0,
                tool_use_id: toolUseID,
              },
            ],
            toolUseResult: `InputValidationError: JSON parse failed (${len} bytes)`,
            sourceToolAssistantUUID: assistantMessage.uuid,
            now: now,
          }),
        },
      ]
    );
  }
  if (schemaHint.coerced !== void 0)
    logEvent("tengu_tool_input_coerced", {
      toolName: sanitizeToolNameForAnalytics(tool.name),
      shapeClass: iFn(schemaHint.coerced.shapeClass),
      outcome: lit_2(schemaHint.coerced.valid ? "coerced_valid" : "coerced_still_invalid"),
      toolInputSizeBytes: nt,
    });
  if (!schemaHint.ok) {
    let yr = formatZodValidationError(tool.name, schemaHint.error),
      Kr = !1;
    if (OTi() && isEmptyObject(Je)) {
      let ta = placeholderToolInput(tool.name, tool.inputSchema);
      if (ta !== null) ((yr = ta), (Kr = !0));
    }
    let Li = tool.validationErrorSteer?.(Je, schemaHint.error);
    if (Li)
      yr = `${Li}

${yr}`;
    let Qs = mSe(tool)
      ? buildUnavailableOptionNote(
          tool.name,
          Je,
          schemaHint.schemaInput,
          schemaHint.error,
          toolUseContext.messages,
        )
      : null;
    if (Qs)
      (logEvent("tengu_recorded_tool_option_unavailable", {
        toolName: sanitizeToolNameForAnalytics(tool.name),
        isArtifactFamily: !0,
        kind: fromEnum(Qs.kind),
        source: fromEnum(Qs.source),
      }),
        (yr += `

${Qs.text}`));
    let Hi = buildSchemaNotSentHint(
      tool,
      toolUseContext.messages,
      toolUseContext.options.tools,
      Hrt(toolUseContext),
      getSurfacedToolNames(toolUseContext.stickyBetas ?? getStickyBetas()),
    );
    if (Hi)
      (logEvent("tengu_deferred_tool_schema_not_sent", {
        toolName: sanitizeToolNameForAnalytics(tool.name),
        isMcp: tool.isMcp ?? !1,
      }),
        (yr += Hi));
    let joined = uniq(schemaHint.error.issues.map((issue) => issue.code)).join(",");
    return (
      logForDebugging(
        `${toolCategoryForTelemetry(tool)} tool input error: issues=${joined} inputBytes=${nt} errorChars=${yr.length}`,
      ),
      logFeatureSad(errorContent, "tool_input_validation_failed"),
      logEvent("tengu_tool_use_error", {
        error: lit_2("InputValidationError"),
        errorCode: lit_2("ZOD_VALIDATION"),
        zodIssueCodes: fromEnumArr(uniq(schemaHint.error.issues.map((issue) => issue.code))),
        errorDetailsHash: gn(yr),
        messageID: ye(messageId),
        toolName: sanitizeToolNameForAnalytics(tool.name),
        isMcp: tool.isMcp ?? !1,
        ...getSubagentTelemetryFields(toolUseContext.agentContext),
        ...getEffortTelemetryFields(toolUseContext),
        toolInputSizeBytes: nt,
        ...(Kr && { emptyInputRepaired: !0 }),
        queryChainId: ye(toolUseContext.queryTracking?.chainId),
        queryDepth: toolUseContext.queryTracking?.depth,
        ...(toolUseContext.options.messageClientPlatform && {
          messageClientPlatform: yW(toolUseContext.options.messageClientPlatform),
        }),
        ...(mcpServerType && { mcpServerType: fromEnum(mcpServerType) }),
        ...(mcpServerBaseUrl && { mcpServerBaseUrl: safeOrigin(mcpServerBaseUrl) }),
        ...(requestId && { requestId: ye(requestId) }),
        ...mcpToolAnalyticsFields(tool.name, mcpNameLoggable),
        ...claudeAiServerIdField(tool.mcpInfo),
        ...tool.mcpInfo?.pluginTelemetry,
      }),
      [
        {
          message: createUserMessage({
            content: [
              {
                type: "tool_result",
                content: `<tool_use_error>InputValidationError: ${yr}</tool_use_error>`,
                is_error: !0,
                tool_use_id: toolUseID,
              },
            ],
            toolUseResult: `InputValidationError: ${schemaHint.error.message}`,
            toolResultRemedy: tool.validationErrorRemedy?.(Je),
            sourceToolAssistantUUID: assistantMessage.uuid,
            now: now,
          }),
        },
      ]
    );
  }
  if (tool.isMcp) {
    let yr = describeMissingRequiredArgs(schemaHint.input, tool.inputJSONSchema);
    if (yr !== null)
      logEvent("tengu_mcp_input_missing_required", {
        toolName: sanitizeToolNameForAnalytics(tool.name),
        isMcp: !0,
        toolUseID: ye(toolUseID),
        messageID: ye(messageId),
        toolInputSizeBytes: nt,
        requiredCount: yr.requiredCount,
        missingCount: yr.missingCount,
        presentKeyCount: yr.presentKeyCount,
        maxStringValueLen: yr.maxStringValueLen,
        hasPseudoTagDebris: yr.hasPseudoTagDebris,
        ...getSubagentTelemetryFields(toolUseContext.agentContext),
        queryChainId: ye(toolUseContext.queryTracking?.chainId),
        queryDepth: toolUseContext.queryTracking?.depth,
        ...(mcpServerType && { mcpServerType: fromEnum(mcpServerType) }),
        ...(mcpServerBaseUrl && { mcpServerBaseUrl: safeOrigin(mcpServerBaseUrl) }),
        ...(requestId && { requestId: ye(requestId) }),
        ...mcpToolAnalyticsFields(tool.name, mcpNameLoggable),
        ...claudeAiServerIdField(tool.mcpInfo),
        ...tool.mcpInfo?.pluginTelemetry,
      });
  }
  let yt = schemaHint.coerced?.resultNote,
    gt = (yr) => tool.validateInput?.(yr, { ...toolUseContext, toolUseId: toolUseID }),
    It = (await warmRemoteMemoryPath(
      tool,
      schemaHint.input,
      toolUseContext.abortController.signal,
      qPe(toolUseContext),
    ))
      ? void 0
      : await runValidateInput(tool, schemaHint.input, gt);
  if (It === void 0 || isServerFallbackDiscard(toolUseContext.abortController.signal))
    return buildCancelledToolResult({
      phase: "validate_input",
      cancelText: isServerFallbackDiscard(toolUseContext.abortController.signal)
        ? void 0
        : getCancelMessage(toolUseContext.abortController.signal),
      tool: tool,
      toolUseID: toolUseID,
      toolUseContext: toolUseContext,
      assistantMessage: assistantMessage,
      mcpServerType: mcpServerType,
      mcpServerBaseUrl: mcpServerBaseUrl,
      mcpNameLoggable: mcpNameLoggable,
      requestId: requestId,
      now: now,
    });
  let Yt = (yr) => {
    if (
      (logForDebugging(
        `${toolCategoryForTelemetry(tool)} tool validation error: code=${yr.errorCode} messageChars=${yr.message?.length ?? 0}`,
      ),
      logFeatureSad(errorContent, "tool_validate_input_rejected"),
      yr.notAnError)
    )
      return [
        {
          message: createUserMessage({
            content: [{ type: "tool_result", content: yr.message, tool_use_id: toolUseID }],
            toolUseResult: yr.message,
            toolResultRemedy: yr.remedy,
            sourceToolAssistantUUID: assistantMessage.uuid,
            now: now,
          }),
        },
      ];
    return (
      logEvent("tengu_tool_use_error", {
        messageID: ye(messageId),
        toolUseID: ye(toolUseID),
        toolName: sanitizeToolNameForAnalytics(tool.name),
        error: lit_2("ValidateInputError"),
        ...errorTelemetryFields(yr.message),
        errorCode: yr.errorCode,
        isMcp: tool.isMcp ?? !1,
        ...getSubagentTelemetryFields(toolUseContext.agentContext),
        ...getEffortTelemetryFields(toolUseContext),
        queryChainId: ye(toolUseContext.queryTracking?.chainId),
        queryDepth: toolUseContext.queryTracking?.depth,
        ...(toolUseContext.options.messageClientPlatform && {
          messageClientPlatform: yW(toolUseContext.options.messageClientPlatform),
        }),
        ...(mcpServerType && { mcpServerType: fromEnum(mcpServerType) }),
        ...(mcpServerBaseUrl && { mcpServerBaseUrl: safeOrigin(mcpServerBaseUrl) }),
        ...(requestId && { requestId: ye(requestId) }),
        ...mcpToolAnalyticsFields(tool.name, mcpNameLoggable),
        ...claudeAiServerIdField(tool.mcpInfo),
        ...tool.mcpInfo?.pluginTelemetry,
      }),
      [
        {
          message: createUserMessage({
            content: [
              {
                type: "tool_result",
                content: `<tool_use_error>${yr.message}</tool_use_error>`,
                is_error: !0,
                tool_use_id: toolUseID,
              },
            ],
            toolUseResult: `Error: ${yr.message}`,
            toolResultRemedy: yr.remedy,
            sourceToolAssistantUUID: assistantMessage.uuid,
            now: now,
          }),
        },
      ]
    );
  };
  if (!It.ok) {
    let yr = Yt(It.verdict);
    if (It.deniedInput !== void 0) toolUseContext.onPermissionDenial?.(tool, toolUseID, It.deniedInput);
    if (It.verdict.denyRule !== void 0)
      decisionOut.decided = {
        record: buildDenyRuleDecisionRecord(It.verdict.message, It.verdict.denyRule),
        mode: getToolPermissionContext(toolUseContext).mode,
      };
    return yr;
  }
  let qt = [],
    { observableInput: observableInput, callInput: callInput } = It,
    pn = tze(assistantMessage, It.observableInput),
    no = pn ?? void 0,
    hn = usedClassifierInput ? clone(It.observableInput) : void 0,
    ho = usedClassifierInput && It.backfilled ? clone(It.callInput) : void 0,
    yn = It,
    Kn = ENn(toolUseContext, It.observableInput),
    Xn = {
      ...toolUseContext,
      mcpRequestMeta: stripHostToolMeta(toolUseContext.mcpRequestMeta),
      permissionModeAtRequest: getPermissionModeAtRequestForArbiter(
        assistantMessage,
        toolUseID,
        toolUseContext,
      ),
    },
    fo = !1,
    To,
    bo,
    vn = [],
    co = [],
    So = [],
    preToolHookStart = Date.now();
  for await (let result of runPreToolUseHooks(
    Xn,
    tool,
    observableInput,
    toolUseID,
    assistantMessage.message.id,
    requestId,
    mcpServerType,
    mcpServerBaseUrl,
    gt,
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
            att.command !== void 0 &&
            "durationMs" in att &&
            att.durationMs !== void 0
          )
            So.push({ command: att.command, durationMs: att.durationMs });
        }
        break;
      case "hookPermissionResult":
        bo = result.hookPermissionResult;
        break;
      case "hookUpdatedInput":
        observableInput = result.updatedInput;
        break;
      case "hookRewriterKind":
        (vn.push(result.kind), co.push(result.source));
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
        if (toolUseContext.remoteCall !== void 0) {
          let Qs = getCloudDeferUnsupportedMessage(result.hookName);
          (logForDebugging(
            `PreToolUse hook for ${toolCategoryForTelemetry(tool)} returned permissionDecision=defer for a served call; refusing (no resume machinery)`,
            { level: "warn" },
          ),
            (bo = {
              behavior: "deny",
              message: Qs,
              decisionReason: { type: "hook", hookName: `PreToolUse:${tool.name}`, reason: Qs },
            }));
          break;
        }
        if (
          (getStatsStore()?.observe("pre_tool_hook_duration_ms", Date.now() - preToolHookStart),
          !toolUseContext.options.isNonInteractiveSession)
        ) {
          logForDebugging(
            `PreToolUse hook for ${toolCategoryForTelemetry(tool)} returned permissionDecision=defer in interactive mode; ignoring (defer is print-mode only)`,
            { level: "warn" },
          );
          break;
        }
        let Kr = Array.isArray(assistantMessage.message.content)
          ? count(assistantMessage.message.content, (Qs) => Qs.type === "tool_use")
          : 1;
        if (Kr > 1) {
          logForDebugging(
            `PreToolUse hook for ${toolCategoryForTelemetry(tool)} returned permissionDecision=defer but ${Kr} tool calls are in this batch; ignoring (defer is solo-only \u2014 siblings would be orphaned on resume)`,
            { level: "warn" },
          );
          break;
        }
        if (toolUseContext.abortController.signal.aborted) {
          let Qs = getCancelMessage(toolUseContext.abortController.signal);
          return (
            qt.push({
              message: createUserMessage({
                content: [{ ...createCancelledToolResultBlock(toolUseID), content: Qs }],
                toolUseResult: Qs,
                toolDenialKind: "cancelled",
                sourceToolAssistantUUID: assistantMessage.uuid,
                now: now,
              }),
            }),
            qt
          );
        }
        logEvent("tengu_pre_tool_hook_deferred", {
          toolName: sanitizeToolNameForAnalytics(tool.name),
          queryChainId: ye(toolUseContext.queryTracking?.chainId),
          queryDepth: toolUseContext.queryTracking?.depth,
        });
        let Li = getActiveSpanId();
        return (
          qt.push({
            message: createAttachmentMessage_2({
              type: "hook_deferred_tool",
              toolUseID: toolUseID,
              toolName: tool.name,
              toolInput: observableInput,
              hookName: result.hookName,
              hookEvent: "PreToolUse",
              permissionMode: getToolPermissionContext(Xn).mode,
              ...(Li && { traceparent: Li }),
            }),
          }),
          qt
        );
      }
      case "stop": {
        getStatsStore()?.observe("pre_tool_hook_duration_ms", Date.now() - preToolHookStart);
        let Kr = getCancelMessage(toolUseContext.abortController.signal),
          Li = createCancelledToolResultBlock(toolUseID);
        Li.content = result.stopReason ?? Kr;
        let Qs = result.stopReason ?? To;
        if (
          (qt.push({
            message: createUserMessage({
              content: [Li],
              toolUseResult: Qs ? `Error: ${Qs}` : Kr,
              toolDenialKind: result.stopReason ? void 0 : "cancelled",
              sourceToolAssistantUUID: assistantMessage.uuid,
              now: now,
            }),
          }),
          fo && result.stopReason && !toolUseContext.abortController.signal.aborted)
        )
          pushHookStoppedContinuation(qt, {
            toolName: tool.name,
            toolUseID: toolUseID,
            message: Qs || "Execution stopped by hook",
          });
        return qt;
      }
    }
  let un = Date.now() - preToolHookStart;
  if ((getStatsStore()?.observe("pre_tool_hook_duration_ms", un), usedClassifierInput && hn !== void 0)) {
    let yr = bo !== void 0 && "updatedInput" in bo ? bo.updatedInput : void 0,
      Kr = !eP(observableInput, hn) || (yr !== void 0 && !eP(yr, hn));
    if (!eP(observableInput, hn))
      ((observableInput = hn), (yn = { ...It, observableInput: hn, callInput: ho ?? hn }));
    if (bo?.behavior === "allow" && Kr) bo = void 0;
    else if (bo !== void 0 && "updatedInput" in bo && bo.updatedInput !== void 0)
      bo = { ...bo, updatedInput: void 0 };
    logEvent("tengu_auto_mode_reissue_exempt", {
      toolName: sanitizeToolNameForAnalytics(tool.name),
      isMcp: tool.isMcp ?? !1,
      toolUseId: ye(toolUseID),
      rewriteDropped: Kr,
    });
  }
  if (un >= ISOLATION_TIMEOUT_MS)
    logForDebugging(
      `Slow PreToolUse hooks: ${un}ms for ${toolCategoryForTelemetry(tool)} (${So.length} hooks)`,
      { level: "info" },
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
      let yr = extractSkillName(tool.name, observableInput);
      if (yr) ao.skill_name = yr;
      let Kr = extractSubagentType(tool.name, observableInput);
      if (Kr) ao.subagent_type = Kr;
    }
  }
  let $o =
    observableInput &&
    typeof observableInput === "object" &&
    lt === BASH_TOOL_NAME &&
    "command" in observableInput &&
    typeof observableInput.command === "string"
      ? classifyBashCommand(observableInput.command)
      : void 0;
  if ($o && isSessionTracingEnabled())
    ((ao.bash_command_class = $o.bash_command_class), (ao.bash_argv0 = $o.bash_argv0));
  let yo = isLiveMemoryTool(tool),
    Ho = yo || tool.mcpInfo?.accountMemory === !0;
  if (tool.mcpInfo?.accountMemory === !0) T3r();
  let rr = withholdsFileReferenceErrors(tool, toolUseID),
    br = startToolSpan(
      tool.name,
      toolUseContext.agentContext,
      ao,
      isPerfettoTracingEnabled() || (isBetaTracingEnabled() && isToolDetailsLoggingEnabled())
        ? jsonStringify(observableInput)
        : void 0,
      toolUseID,
      Ho,
    );
  (startToolBlockedOnUserSpan(toolUseContext.agentContext),
    rebaseBatchHookOrigins([toolUseContext, Xn], Kn, getHookUpdatedInput(bo, observableInput)));
  let permissionMode = getToolPermissionContext(Xn).mode,
    permissionStart = Date.now(),
    cs = getHookUpdatedInput(bo, observableInput),
    _r = describeInputRewrite(
      hookRewrite,
      { changed: nze(pn, cs), kinds: vn, sources: co },
      () => _Kt(tool.name),
      () => SKt(tool),
    ),
    Cr = startPermissionRound(toolUseContext, toolUseID, tool.name),
    Vr = getCheckRunner(toolUseContext.session, tool.name),
    Oo = getRegisteredCheck(toolUseContext.session, tool.name) && Vr,
    jr = Oo ? void 0 : Vr;
  toolUseContext.toolDecisions ??= new Map();
  let Or = inputRewrittenBeforeCall || (no !== void 0 && !eP(cs, no)),
    Io = await resolvePermissionDecisionForCall(
      bo,
      tool,
      observableInput,
      { ...Xn, permissionPhase: void 0, permissionRound: Cr, inputChangedByHook: Or ? !0 : void 0 },
      canUseTool,
      await applyServerClassifierVerdict(
        assistantMessage,
        toolUseID,
        cs,
        _r,
        toolUseContext.sameTurnToolUses,
      ),
      toolUseID,
    ).catch((yr) => {
      throw (takePermissionRecord(toolUseContext, toolUseID, Cr), yr);
    }),
    permissionDecision = Io.decision;
  observableInput = Io.input;
  let rs = takePermissionRecord(toolUseContext, toolUseID, Cr) ?? {};
  if (
    permissionDecision.behavior !== "allow" &&
    isServerFallbackDiscard(toolUseContext.abortController.signal)
  )
    return (
      DY(
        decisionOut,
        permissionMode,
        buildPermissionDecisionRecord("cancelled", "server_fallback_tombstone"),
      ),
      endToolSpan(br),
      buildCancelledToolResult({
        phase: "permission",
        tool: tool,
        toolUseID: toolUseID,
        toolUseContext: toolUseContext,
        assistantMessage: assistantMessage,
        mcpServerType: mcpServerType,
        mcpServerBaseUrl: mcpServerBaseUrl,
        mcpNameLoggable: mcpNameLoggable,
        requestId: requestId,
        now: now,
      })
    );
  let Es = toolUseContext.toolDecisions.get(toolUseID);
  if (
    permissionDecision.behavior === "ask" &&
    unwrapAbortReason(toolUseContext.abortController.signal.reason) === "interrupt" &&
    (Es === void 0 || Es.source === "user_abort")
  )
    return (
      DY(decisionOut, permissionMode, buildPermissionDecisionRecord("cancelled", "user_abort")),
      endToolSpan(br),
      qt.push({
        message: createCancelledToolResult(
          toolUseID,
          assistantMessage,
          toolUseContext.abortController.signal,
          now,
        ),
      }),
      qt
    );
  if (permissionDecision.behavior !== "allow") {
    if (isTerminalShutdown() && !toolUseContext.abortController.signal.aborted) await heldUntilExit();
    if (isInvalidInputDeny(permissionDecision)) {
      if (
        (DY(decisionOut, permissionMode, buildPermissionDecisionRecord("reject", "invalid_input")),
        endToolSpan(br),
        qt.push(...Yt({ result: !1, message: permissionDecision.message, errorCode: 1 })),
        fo && !toolUseContext.abortController.signal.aborted)
      )
        pushHookStoppedContinuation(qt, {
          toolName: tool.name,
          toolUseID: toolUseID,
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
      { level: "info" },
    );
  let Is = getToolPermissionContext(Xn);
  logToolDecision({
    toolName: tool.name,
    isMcp: tool.isMcp ?? !1,
    messageId: messageId,
    toolUseID: toolUseID,
    permissionMode: Is.mode,
    ...toDecisionRecord(permissionDecision),
    resolvedSource: toolUseContext.toolDecisions.get(toolUseID)?.source,
    resolvedDecision: toolUseContext.toolDecisions.get(toolUseID)?.decision,
  });
  let source = getToolDecisionForOTel(permissionDecision, toolUseContext.abortController.signal.aborted);
  if (!toolUseContext.toolDecisions.has(toolUseID)) {
    let { decision: decision, source: source_2 } = source,
      Li = extractToolInputDetailsForAnalytics(tool.name, observableInput, tool.mcpInfo);
    if (
      (logOTelEvent(
        "tool_decision",
        {
          decision: decision,
          source: source_2,
          tool_name: sanitizeToolNameForAnalytics(tool.name),
          tool_use_id: toolUseID,
          ...toolSourceMetadata(tool.mcpInfo),
          ...(Object.keys(Li).length > 0 && { tool_parameters: jsonStringify(Li) }),
          ...(source_2 === "config" &&
            permissionDecision.behavior !== "ask" &&
            getClassifierVerdictAnalyticsFields(decision, permissionDecision.decisionReason)),
          permission_mode: toExternalPermissionMode(permissionMode),
          ...(requestId && { request_id: requestId }),
        },
        toolUseContext.agentContext,
      ),
      isCodeEditingTool(tool.name))
    )
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
        toolUseID: toolUseID,
        hookEvent: "PermissionRequest",
      }),
    });
  let as;
  try {
    if (isCcsTenant() && isAutoClassifierActive(isAutoAllowedInMode(tool, Is), Is.servedCall === !0))
      as = {
        autoClassifierActive: !0,
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
    (DY(decisionOut, permissionMode, buildDeniedDecisionRecord(permissionDecision, yr, source, rs.pipeline)),
      endToolSpan(br),
      logEvent("tengu_tool_use_can_use_tool_rejected", {
        ...as,
        messageID: ye(messageId),
        toolUseID: ye(toolUseID),
        toolName: sanitizeToolNameForAnalytics(tool.name),
        deniedBy:
          permissionDecision.behavior === "ask" && yr?.decision !== "reject"
            ? lit_2("unresolvedAsk")
            : voe("deny", yr?.source, permissionDecision.decisionReason),
        decisionReasonType: fromEnum(
          permissionDecision.decisionReason?.type !== "rule" &&
            toDecisionRecord(permissionDecision).matchedAskRule !== void 0
            ? "rule"
            : (permissionDecision.decisionReason?.type ?? "unknown"),
        ),
        preToolHookDurationMs: un,
        permissionDurationMs: Nr,
        queryChainId: ye(toolUseContext.queryTracking?.chainId),
        queryDepth: toolUseContext.queryTracking?.depth,
        ...(toolUseContext.options.messageClientPlatform && {
          messageClientPlatform: yW(toolUseContext.options.messageClientPlatform),
        }),
        ...(mcpServerType && { mcpServerType: fromEnum(mcpServerType) }),
        ...(mcpServerBaseUrl && { mcpServerBaseUrl: safeOrigin(mcpServerBaseUrl) }),
        ...(requestId && { requestId: ye(requestId) }),
        ...mcpToolAnalyticsFields(tool.name, mcpNameLoggable),
        ...claudeAiServerIdField(tool.mcpInfo),
        ...tool.mcpInfo?.pluginTelemetry,
      }));
    let Kr = await settleUnaskedQuestion(tool, permissionDecision, toolUseID, toolUseContext, {
        stopped: fo,
        asked: bo?.behavior === "ask",
      }),
      Li = Kr ?? permissionDecision.message;
    if (fo && !Li) Li = `Execution stopped by PreToolUse hook${To ? `: ${To}` : ""}`;
    if (permissionDecision.decisionReason?.type === "hook")
      Li += webFetchAgentHookHint(
        tool.name,
        observableInput,
        toolUseContext.options.tools,
        getToolPermissionContext(toolUseContext),
        getAgentSpawnContext(toolUseContext),
      );
    let Qs = Li,
      messageContent = [
        { type: "tool_result", content: Qs, ...(Kr === void 0 && { is_error: !0 }), tool_use_id: toolUseID },
      ],
      Xa = permissionDecision.behavior === "ask" ? permissionDecision.contentBlocks : void 0;
    if (Xa?.length) messageContent.push(...Xa);
    let ta;
    if (Xa?.length) {
      let imageCount = count(Xa, (Ca) => Ca.type === "image");
      if (imageCount > 0) ta = B$n(imageCount);
    }
    if (
      (qt.push({
        message: createUserMessage({
          content: messageContent,
          imagePasteIds: ta,
          toolUseResult: Kr === void 0 ? `Error: ${Qs}` : Qs,
          toolDenialKind: getToolCallOutcomeCode(permissionDecision),
          toolDenialEndsTurn:
            permissionDecision.behavior === "deny" && permissionDecision.endsTurn ? !0 : void 0,
          toolDenialMonitorBlocked:
            permissionDecision.behavior === "deny" &&
            permissionDecision.decisionReason.type === "classifier" &&
            permissionDecision.decisionReason.monitorBlocked === !0
              ? !0
              : void 0,
          toolDenialUnanswered: getStreamClosedOutcome(permissionDecision),
          userFeedback: permissionDecision.behavior === "ask" ? permissionDecision.userFeedback : void 0,
          toolResultRemedy: getDenialErrorCode(permissionDecision),
          sourceToolAssistantUUID: assistantMessage.uuid,
          now: now,
        }),
      }),
      fo &&
        permissionDecision.behavior === "deny" &&
        permissionDecision.decisionReason.type === "hook" &&
        !toolUseContext.abortController.signal.aborted)
    )
      pushHookStoppedContinuation(qt, { toolName: tool.name, toolUseID: toolUseID, message: To ?? Li });
    if (
      permissionDecision.decisionReason?.type === "classifier" &&
      permissionDecision.decisionReason.classifier === "auto-mode"
    ) {
      let Bs = !1;
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
          if (Ca.retry) Bs = !0;
      } catch (error) {
        if (!(error instanceof StreamClosedAbortError)) throw error;
        logForDebugging("PermissionDenied hooks cancelled (control stream closed)");
      }
      if (Bs && !permissionDecision.decisionReason.noVerdict)
        qt.push({ message: createUserMessage({ content: pPn, isMeta: !0, turnCompanion: !0, now: now }) });
    }
    if (
      permissionDecision.behavior === "deny" &&
      permissionDecision.endsTurn &&
      !toolUseContext.abortController.signal.aborted
    )
      turnAbortControllerOf(toolUseContext.abortController).abort(userAbortReason("permission-stop"));
    return qt;
  }
  if (
    (logEvent("tengu_tool_use_can_use_tool_allowed", {
      ...as,
      messageID: ye(messageId),
      toolUseID: ye(toolUseID),
      toolName: sanitizeToolNameForAnalytics(tool.name),
      queryChainId: ye(toolUseContext.queryTracking?.chainId),
      queryDepth: toolUseContext.queryTracking?.depth,
      ...(mcpServerType && { mcpServerType: fromEnum(mcpServerType) }),
      ...(mcpServerBaseUrl && { mcpServerBaseUrl: safeOrigin(mcpServerBaseUrl) }),
      ...(requestId && { requestId: ye(requestId) }),
      ...mcpToolAnalyticsFields(tool.name, mcpNameLoggable),
      ...claudeAiServerIdField(tool.mcpInfo),
      ...tool.mcpInfo?.pluginTelemetry,
    }),
    permissionDecision.updatedInput !== void 0 && !isEmptyObject(permissionDecision.updatedInput))
  ) {
    let yr = isUnrecognizedKeysIssue_2(tool.inputSchema, permissionDecision.updatedInput);
    if (yr !== null) {
      let Kr = new kR(yr),
        Li = `The permission handler returned updatedInput for ${tool.name} that failed schema validation: ${formatZodValidationError(tool.name, Kr)}
This is a configuration issue in your canUseTool callback, PermissionRequest hook, or permission-prompt tool \u2014 updatedInput must satisfy the tool's input schema. The tool input from the model was valid.`,
        startId = uniq(yr.map((Hi) => Hi.code));
      if (
        (DY(
          decisionOut,
          permissionMode,
          buildPermissionDecisionRecord("reject", "permission_updated_input_invalid"),
        ),
        endToolSpan(br),
        logForDebugging(
          `Permission handler updatedInput for ${toolCategoryForTelemetry(tool)} failed schema validation (${startId.join(",")})`,
          { level: "warn" },
        ),
        logFeatureSad(errorContent, "tool_permission_updated_input_invalid"),
        logEvent("tengu_tool_use_error", {
          error: lit_2("InputValidationError"),
          errorCode: lit_2("PERMISSION_UPDATED_INPUT"),
          zodIssueCodes: fromEnumArr(startId),
          errorDetailsHash: gn(Li),
          messageID: ye(messageId),
          toolName: sanitizeToolNameForAnalytics(tool.name),
          isMcp: tool.isMcp ?? !1,
          ...getSubagentTelemetryFields(toolUseContext.agentContext),
          ...getEffortTelemetryFields(toolUseContext),
          toolInputSizeBytes: nt,
          queryChainId: ye(toolUseContext.queryTracking?.chainId),
          queryDepth: toolUseContext.queryTracking?.depth,
          ...(mcpServerType && { mcpServerType: fromEnum(mcpServerType) }),
          ...(mcpServerBaseUrl && { mcpServerBaseUrl: safeOrigin(mcpServerBaseUrl) }),
          ...(requestId && { requestId: ye(requestId) }),
          ...mcpToolAnalyticsFields(tool.name, mcpNameLoggable),
          ...claudeAiServerIdField(tool.mcpInfo),
          ...tool.mcpInfo?.pluginTelemetry,
        }),
        qt.push({
          message: createUserMessage({
            content: [
              {
                type: "tool_result",
                content: `<tool_use_error>${Li}</tool_use_error>`,
                is_error: !0,
                tool_use_id: toolUseID,
              },
            ],
            toolUseResult: `InputValidationError: permission handler updatedInput failed schema for ${tool.name}`,
            sourceToolAssistantUUID: assistantMessage.uuid,
            now: now,
          }),
        }),
        fo && !toolUseContext.abortController.signal.aborted)
      )
        pushHookStoppedContinuation(qt, {
          toolName: tool.name,
          toolUseID: toolUseID,
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
  let Vi = { stamped: !1, visiblyAttributed: !1 },
    ji = extractToolInputForTelemetry_2(observableInput),
    Wi = ji !== void 0 && Ho ? notRecordedLength(jsonStringify(observableInput)) : ji,
    ii = extractToolInputDetailsForAnalytics(tool.name, observableInput, tool.mcpInfo),
    wa = toolUseContext.toolDecisions.get(toolUseID);
  DY(decisionOut, permissionMode, buildDeniedDecisionRecord(permissionDecision, wa, source, rs.pipeline));
  let aborted = toolUseContext.abortController.signal.aborted,
    mi = assistantMessage.isVirtual
      ? void 0
      : Xli(toolUseContext.session, {
          toolUseId: toolUseID,
          mayWrite: () => !tool.isReadOnly(restoreCallInput(yn, observableInput), toolUseContext),
          agentId: toolUseContext.agentId,
          signal: toolUseContext.abortController.signal,
        });
  if (mi) {
    if (
      (await mi,
      !aborted &&
        toolUseContext.abortController.signal.aborted &&
        !isServerFallbackDiscard(toolUseContext.abortController.signal))
    )
      return (
        endToolSpan(br),
        qt.push(
          ...buildCancelledToolResult({
            phase: "pre_call",
            cancelText: getCancelMessage(toolUseContext.abortController.signal),
            tool: tool,
            toolUseID: toolUseID,
            toolUseContext: toolUseContext,
            assistantMessage: assistantMessage,
            mcpServerType: mcpServerType,
            mcpServerBaseUrl: mcpServerBaseUrl,
            mcpNameLoggable: mcpNameLoggable,
            requestId: requestId,
            now: now,
          }),
        ),
        qt
      );
  }
  if (toolUseContext.toolCallAbandoned?.(toolUseID)) return (endToolSpan(br), []);
  startToolExecutionSpan(toolUseContext.agentContext, toolUseID);
  let now_2 = Date.now(),
    $a = new ToolWallClockTracker(now_2),
    nr = {
      declaredNoOutsideWork:
        tool.mcpInfo === void 0 &&
        ISOLATION_NEUTRAL_TOOLS.has(tool.name) &&
        !(
          tool.name === ARTIFACT_TOOL_NAME_2 &&
          "action" in observableInput &&
          observableInput.action === "read"
        ),
    },
    Ti = new MemoryUsageSampler(stallSampler),
    sample = Ti.sample("before_call"),
    _i;
  callInput = restoreCallInput(yn, observableInput);
  let jo;
  if (isServerFallbackDiscard(toolUseContext.abortController.signal))
    return buildCancelledToolResult({
      phase: "pre_call",
      tool: tool,
      toolUseID: toolUseID,
      toolUseContext: toolUseContext,
      assistantMessage: assistantMessage,
      mcpServerType: mcpServerType,
      mcpServerBaseUrl: mcpServerBaseUrl,
      mcpNameLoggable: mcpNameLoggable,
      requestId: requestId,
      now: now,
    });
  if (isTerminalShutdown() && !toolUseContext.abortController.signal.aborted) await heldUntilExit();
  (toolUseContext.markToolCallStarted?.(toolUseID),
    toolUseContext.markToolCallRunning?.(toolUseID),
    onProgress({ type: "set_in_progress_tool_use_ids", op: { action: "add", ids: [toolUseID] } }),
    logForDebugging(
      `[Stall] tool_dispatch_start tool=${toolCategoryForTelemetry(tool)} toolUseId=${toolUseID} permissionDecisionMs=${Nr}`,
      { level: "info" },
    ));
  let Qr = !1,
    fi,
    telemetryToolInput = qPe(toolUseContext),
    Ja = !1,
    Di = () => {
      if (Ja) ((Ja = !1), endActivity("tool_exec", telemetryToolInput));
    };
  try {
    if (
      ((Ja = !0),
      startSessionActivity("tool_exec", telemetryToolInput),
      toolUseContext.lendToolExecEnd?.(toolUseID, Di),
      OSe(tool) && splitHostField(callInput).requested !== void 0)
    )
      throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
        INJECTED_MACHINE_REFUSAL,
        "late host argument on a local tool call",
      );
    if (Bnr(tool, toolUseContext)) {
      let Ks = checkCoordinatorShellCommand(tool, callInput, toolUseContext);
      if (Ks !== null)
        throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
          Ks,
          "coordinator Bash call refused at call time",
        );
      callInput = bsi(callInput);
    }
    let yr = toolUseContext.session.project?.cwd;
    if (yr !== void 0 && shouldLogGitCommitDetails(tool, callInput)) jo = await markHeadReflog(yr);
    if (!isCallDirectoryUnchanged())
      throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
        CALL_DIRECTORY_CHANGED_MESSAGE,
        "working directory changed between check and call",
      );
    let Kr = toolUseContext.agentId
        ? () => {}
        : emitToolHeartbeat({
            toolName: tool.name,
            toolUseID: toolUseID,
            abortSignal: toolUseContext.abortController.signal,
            onProgress: onProgress,
          }),
      Li = () => {
        _i = Date.now();
      };
    if (toolUseContext.abortController.signal.aborted) _i = now_2;
    toolUseContext.abortController.signal.addEventListener("abort", Li, { once: !0 });
    let Qs = !tool.isReadOnly(callInput, toolUseContext);
    if ((toolUseContext.toolState.get(BashRepeatMeter).noteOtherToolCall(tool, Qs), callObserver && !Qs))
      callObserver.isReadOnly = !0;
    let mcpDetails = getApprovalSource(permissionDecision),
      skillName = forgetPendingCheck(toolUseContext.session, toolUseID),
      ta = (Ks, kl) =>
        tool.call(
          callInput,
          {
            ...Ks,
            toolUseId: toolUseID,
            permissionPhase: rs,
            autoModeClassified:
              permissionDecision.decisionReason?.type === "classifier" &&
              permissionDecision.decisionReason.classifier === "auto-mode" &&
              permissionDecision.decisionReason.classifierAllowed === !0
                ? !0
                : void 0,
            allowGivenBy: mcpDetails && { toolUseId: toolUseID, approver: mcpDetails },
            ...!1,
            desktopForwardToolUseId: void 0,
          },
          canUseTool,
          assistantMessage,
          kl,
          {
            userModified: permissionDecision.userModified ?? !1,
            gitDiffRead: !0,
            outsideResultReader: () => getOutsideResultReaderBlocker(Ks),
            permissionCheckedFor: skillName ? void 0 : Oo,
            runnerCheckedHere: skillName ? Vr : jr,
            timing: $a,
          },
        ),
      Bs;
    callObserver?.onToolEntered?.();
    try {
      Bs = await KNn($a, () =>
        detachToolCall(tool, callInput, toolUseContext)
          ? runDetachableToolCall({
              tool: tool,
              input: callInput,
              toolUseID: toolUseID,
              toolUseContext: toolUseContext,
              onProgress: onProgress,
              run: ta,
            })
          : ta(toolUseContext, onProgress),
      );
    } finally {
      (Kr(), toolUseContext.abortController.signal.removeEventListener("abort", Li));
    }
    await waitForFolderAttached({
      toolState: toolUseContext.toolState,
      fullToolName: tool.name,
      content: Bs.data,
      signal: toolUseContext.abortController.signal,
    });
    let Ca = Date.now() - now_2;
    ($a.settle(), (fi = Ca));
    let sample_2 = Ti.sample("after_call");
    if (
      (addToToolDuration(Ca),
      logForDebugging(
        `[Stall] tool_dispatch_end tool=${toolCategoryForTelemetry(tool)} toolUseId=${toolUseID} outcome=ok durationMs=${Ca}`,
        { level: "info" },
      ),
      (Qr = !0),
      tool.mcpInfo === void 0 && CORE_FILE_TOOLS.has(tool.name) && Bs.data && typeof Bs.data === "object")
    ) {
      let Ks = {};
      if (tool.name === FILE_READ_TOOL_NAME) {
        let kl = Bs.data;
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
          "structuredPatch" in Bs.data
        )
          Ks.diff = jsonStringify(Bs.data.structuredPatch);
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
        if ("stdout" in Bs.data) Ks.output = String(Bs.data.stdout);
      }
      if (Object.keys(Ks).length > 0) addToolContentEvent(br, "tool.output", Ks);
    }
    if (
      tool.name === POLL &&
      typeof Bs.data === "object" &&
      Bs.data !== null &&
      "eventCount" in Bs.data &&
      typeof Bs.data.eventCount === "number" &&
      Bs.data.eventCount > 0
    )
      qt.push({
        message: createAttachmentMessage_2({
          type: "poll_events",
          deliveredVia: "poll_tool",
          envelopes: [],
          kinds: [],
          remainingWakeCount: 0,
          ...("provenance" in Bs.data &&
            Array.isArray(Bs.data.provenance) && { provenance: Bs.data.provenance }),
          ...("declared" in Bs.data && Array.isArray(Bs.data.declared) && { declared: Bs.data.declared }),
          ...!1,
        }),
      });
    if (typeof Bs === "object" && "structured_output" in Bs)
      qt.push({
        message: createAttachmentMessage_2({
          type: "structured_output",
          data: Bs.structured_output,
          toolUseID: toolUseID,
        }),
      });
    endToolExecutionSpan({ success: !0 });
    let pd = Bs.detached
      ? { type: "tool_result", tool_use_id: toolUseID, content: Bs.detached.text }
      : tool.mapToolResultToToolResultBlockParam(Bs.data, toolUseID);
    if (
      (tool.mcpInfo !== void 0 || WEB_TOOLS.has(tool.name)) &&
      !Bs.detached &&
      shouldRecordToolContent(br)
    ) {
      let Ks = stringifyToolContentForSpan(pd.content);
      addToolContentEvent(br, "tool.output", { output: Ho ? notRecordedLength(Ks) : Ks });
    }
    let ga =
      isPerfettoTracingEnabled() || (isBetaTracingEnabled() && isToolContentLoggingEnabled())
        ? Bs.data && typeof Bs.data === "object"
          ? jsonStringify(Bs.data)
          : String(Bs.data ?? "")
        : void 0;
    endToolSpan(br, ga, void 0, Ho);
    let mappedContent = pd.content;
    if (yo) noteToolTexts(observableInput, mappedContent);
    let hd = !mappedContent
        ? 0
        : typeof mappedContent === "string"
          ? mappedContent.length
          : jsonStringify(mappedContent).length,
      Sd = getResultSizeTelemetry(mappedContent, tool),
      Ld = isMedia(Bs.newMessages),
      vs,
      ol,
      gd,
      Su,
      Eu;
    if (observableInput && typeof observableInput === "object") {
      if (
        (lt === FILE_READ_TOOL_NAME || lt === FILE_EDIT_TOOL_NAME || lt === FILE_WRITE_TOOL_NAME) &&
        "file_path" in observableInput &&
        typeof observableInput.file_path === "string"
      )
        ((vs = getFileExtensionForAnalytics(observableInput.file_path)),
          (gd = String(callInput.file_path).length));
      else if (
        lt === NOTEBOOK_EDIT_TOOL_NAME &&
        "notebook_path" in observableInput &&
        typeof observableInput.notebook_path === "string"
      ) {
        let notebook_path = observableInput.notebook_path;
        ((vs = getFileExtensionForAnalytics(notebook_path)), (gd = notebook_path.length));
      } else if (tool.name === ARTIFACT_TOOL_NAME_2 && "file_path" in observableInput) {
        let Ks = String(observableInput.file_path);
        ((vs = getFileExtensionForAnalytics(Ks)), (gd = Ks.length));
      } else if (
        lt === BASH_TOOL_NAME &&
        "command" in observableInput &&
        typeof observableInput.command === "string"
      ) {
        let Ks = observableInput;
        ((vs = getFileExtensionsFromBashCommand_2(Ks.command)),
          (ol = extensionsInCommand(Ks.command)),
          (Su = Ks.command.length));
      } else if (
        (tool.name === w8e || lt === POWERSHELL_TOOL_NAME) &&
        "command" in observableInput &&
        typeof observableInput.command === "string"
      )
        ol = extensionsInCommand(observableInput.command);
      else if (tool.name === DESIGNSYNC) {
        let Ks = observableInput,
          kl = (xc) => (Array.isArray(xc) ? xc.length : void 0),
          Yd = Ks.method === "report_validate" ? Ks.counts : void 0;
        Eu = {
          dsMethod: fromEnumOpt(v_n.find((xc) => xc === Ks.method)),
          ...(typeof Ks.projectId === "string" && { dsProjectIdHash: gn(Ks.projectId) }),
          ...(kl(Ks.assets) !== void 0 && { dsAssetCount: kl(Ks.assets) }),
          ...(kl(Ks.files) !== void 0 && { dsFileCount: kl(Ks.files) }),
          ...(kl(Ks.paths) !== void 0 && { dsPathCount: kl(Ks.paths) }),
          ...(kl(Ks.writes) !== void 0 && { dsWriteCount: kl(Ks.writes) }),
          ...(kl(Ks.deletes) !== void 0 && { dsDeleteCount: kl(Ks.deletes) }),
          ...(Yd && {
            dsValidateTotal: Yd.total,
            dsValidateBad: Yd.bad,
            dsValidateThin: Yd.thin,
            dsValidateVi: Yd.variantsIdentical,
            dsValidateIterations: Yd.iterations,
          }),
        };
      }
    }
    if (
      (logToolFileActivity(lt, observableInput, messageId),
      tool.mcpInfo !== void 0 && getIsNonInteractiveSession())
    )
      toolUseContext.session.mcpSessionWiring.connections()?.clearNeedsAuth(tool.mcpInfo.serverName);
    (logFeatureOk(errorContent),
      logEvent("tengu_tool_use_success", {
        messageID: ye(messageId),
        toolUseID: ye(toolUseID),
        toolName: sanitizeToolNameForAnalytics(tool.name),
        isMcp: tool.isMcp ?? !1,
        ...getSubagentTelemetryFields(toolUseContext.agentContext),
        ...getEffortTelemetryFields(toolUseContext),
        durationMs: Ca,
        ...$a.fields(Ca, nr),
        ...(Bs.detached && { detached: !0 }),
        ...(_i !== void 0 && {
          ...N$n(toolUseContext.abortController.signal),
          durationMsAtAbort: _i - now_2,
        }),
        ...diffMemoryUsage(sample, sample_2),
        preToolHookDurationMs: un,
        permissionDurationMs: Nr,
        toolResultSizeBytes: hd,
        ...Sd,
        ...(Ld > 0 && { toolResultAttachmentBytes: Ld }),
        ...measureSidecarFields(Bs.data),
        ...(!VN(toolUseContext, tool) && {
          sidecarDroppedForSubagent: !0,
          ...(Bs.subagentFrameResult !== void 0 && { sidecarSmallFormOfferedForSubagent: !0 }),
        }),
        toolInputSizeBytes: nt,
        ...(vs !== void 0 && { fileExtension: vs }),
        ...(ol !== void 0 && { bashCommandFileExtensions: ol }),
        ...(gd !== void 0 && { filePathLen: gd }),
        ...(Su !== void 0 && { bashCommandLen: Su }),
        ...($o && {
          bash_command_class: $o.bash_command_class,
          bash_argv0: $o.bash_argv0,
          ...($o.bash_subcommand !== void 0 && { bash_subcommand: $o.bash_subcommand }),
          has_pipe: $o.has_pipe,
        }),
        ...Eu,
        ...(lt === FILE_READ_TOOL_NAME &&
          observableInput &&
          typeof observableInput === "object" && {
            readHasLimit: observableInput.limit !== void 0,
            readHasOffset: observableInput.offset !== void 0,
          }),
        ...(tool.name === WEBSEARCH && !tool.isMcp && getWebSearchModeAnalytics(observableInput, input)),
        queryChainId: ye(toolUseContext.queryTracking?.chainId),
        queryDepth: toolUseContext.queryTracking?.depth,
        ...(toolUseContext.options.messageClientPlatform && {
          messageClientPlatform: yW(toolUseContext.options.messageClientPlatform),
        }),
        ...(mcpServerType && { mcpServerType: fromEnum(mcpServerType) }),
        ...(mcpServerBaseUrl && { mcpServerBaseUrl: safeOrigin(mcpServerBaseUrl) }),
        ...(requestId && { requestId: ye(requestId) }),
        ...(tool.readOnlyHint !== void 0 && { readOnlyHint: tool.readOnlyHint }),
        ...mcpToolAnalyticsFields(tool.name, mcpNameLoggable),
        ...claudeAiServerIdField(tool.mcpInfo),
        ...tool.mcpInfo?.pluginTelemetry,
      }));
    let Uc;
    if (
      shouldLogGitCommitDetails(tool, callInput) &&
      Bs.data &&
      typeof Bs.data === "object" &&
      "stdout" in Bs.data
    ) {
      let Ks =
          !("backgroundTaskId" in Bs.data && Bs.data.backgroundTaskId) &&
          !("interrupted" in Bs.data && Bs.data.interrupted === !0),
        kl = await resolveCommitInfo(
          String(Bs.data.stdout),
          toolUseContext.session.project?.cwd ?? null,
          Ks ? jo : void 0,
        );
      if (kl) {
        if (((ii.git_commit_id = kl.commitId), kl.branch)) ii.git_branch = kl.branch;
        Uc = commitAttributes(kl);
      }
    }
    let gitCommitId = getMcpToolScope(tool);
    logOTelEvent(
      "tool_result",
      {
        tool_name: sanitizeToolNameForAnalytics(tool.name),
        tool_use_id: toolUseID,
        success: "true",
        duration_ms: String(Ca),
        ...(Object.keys(ii).length > 0 && { tool_parameters: jsonStringify(ii) }),
        ...(Wi && { tool_input: Wi }),
        tool_input_size_bytes: String(nt),
        tool_result_size_bytes: String(hd),
        ...(wa && { decision_source: wa.source, decision_type: wa.decision }),
        ...(gitCommitId && { mcp_server_scope: gitCommitId }),
        ...Uc,
        ...(requestId && { request_id: requestId }),
      },
      toolUseContext.agentContext,
    );
    let toolOutput = Bs.data,
      Qm = BNn(tool.name, Bs.data),
      wr = [],
      zs = 0,
      li = !1,
      nl,
      Tl = [];
    if (
      Bs.classifierContext !== void 0 &&
      (!tool.isMcp ||
        (mcpServerType === "sdk" &&
          tool.mcpInfo?.scope !== "project" &&
          qkt(resolveMcpConnectionForTool(tool.name, toolUseContext.options.mcpClients).connection?.config)))
    )
      Tl.push({ value: truncateToLength(Bs.classifierContext, q0), hostPrincipal: !0, pairedRewriteSeq: 0 });
    let contextLayers = Bs.contextLayers,
      mcpMeta = Bs.mcpMeta,
      endsTurn = Bs.endsTurn,
      remedy = Bs.remedy,
      sandboxViolations = Bs.sandboxViolations,
      sandboxed = Bs.sandboxed;
    async function addToolResult(toolUseResult, preMappedBlock) {
      let Yd = toolResultsDirFor(toolUseContext.session),
        xc = preMappedBlock
          ? await processToolResultBlock(preMappedBlock, tool, Yd, toolUseContext.storageV5)
          : await mapAndMaybePersistToolResult(tool, toolUseResult, toolUseID, Yd, toolUseContext.storageV5),
        Ip =
          yt !== void 0 && !xc.is_error && typeof xc.content === "string"
            ? {
                ...xc,
                content: `${xc.content}

${yt}`,
              }
            : xc,
        Gc = zs !== 0 && !li,
        contentBlocks = [
          isMcpTool(tool) || Gc ? { ...Ip, content: cutOversizedResultBlocks(Ip.content) } : Ip,
        ];
      if ("acceptFeedback" in permissionDecision && permissionDecision.acceptFeedback)
        contentBlocks.push({ type: "text", text: permissionDecision.acceptFeedback });
      let hp = "contentBlocks" in permissionDecision ? permissionDecision.contentBlocks : void 0;
      if (hp?.length) contentBlocks.push(...hp);
      let Pg;
      if (hp?.length) {
        let imageCount = count(hp, (mae) => mae.type === "image");
        if (imageCount > 0) Pg = B$n(imageCount);
      }
      let Sc = toolUseResult;
      try {
        if (tool.stripForCreation) Sc = tool.stripForCreation(toolUseResult);
        else if (tool.stripToolUseResultAtCreation && tool.stripForStorage)
          Sc = tool.stripForStorage(toolUseResult, !1);
      } catch (error) {
        (logError(error), (Sc = void 0));
      }
      if (callObserver) callObserver.output = { value: Sc };
      Sc = restoreMcpResultForCopy(tool, Sc, xc, toolUseContext);
      let filtered = Tl.filter((cS) => {
        if (cS.pairedRewriteSeq === void 0) return !0;
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
            : void 0,
        Hx = filtered.length > 0 && filtered.every((cS) => cS.hostPrincipal),
        aI = dy !== void 0 ? truncateToLength(dy, q0) : void 0;
      if (aI !== void 0)
        if (aI.length < dy.length) logFeatureSad("auto_mode_host_context", "join_truncated");
        else logFeatureOk("auto_mode_host_context");
      let startId = createUserMessage({
        content: contentBlocks,
        imagePasteIds: Pg,
        hostClassifierContext: aI,
        ...cutResultForStorage(toolUseContext, tool, Gc, {
          toolUseId: toolUseID,
          toolUseResult: VN(toolUseContext, tool) ? Sc : void 0,
          mcpMeta: formatMcpStructuredContent(
            toolUseContext.agentId,
            mcpMeta,
            tool,
            tool.mcpInfo?.accountMemoryServer === !0 ||
              (sit(tool.name) && hasRelaySource(toolUseContext.options.mcpClients)),
          ),
        }),
        toolEndsTurn: endsTurn,
        toolResultRemedy: remedy,
        sandboxViolations: sandboxViolations,
        sandboxed: sandboxed,
        sourceToolAssistantUUID: assistantMessage.uuid,
        now: now,
      });
      if (
        wa?.surface === "host_dialog" &&
        "acceptFeedback" in permissionDecision &&
        permissionDecision.acceptFeedback &&
        getAutoModeConfigOrDefault().typedMarks === !0
      )
        startId[gge] = { as: "feedback", texts: [permissionDecision.acceptFeedback] };
      if (Bs.subagentFrameResult !== void 0 && !VN(toolUseContext, tool))
        if (Gc) logFeatureSad("subagent_frame_result", "hook_rewrote_output");
        else if (nl !== void 0) logFeatureSad("subagent_frame_result", nl);
        else (Object.assign(startId, gue(Bs.subagentFrameResult)), logFeatureOk("subagent_frame_result"));
      if (
        startId.hostClassifierContext !== void 0 &&
        Hx &&
        !toolUseContext.abortController.signal.aborted &&
        S3e() === pt &&
        !Jge()
      )
        _tn(startId);
      qt.push({
        message: startId,
        contextLayers:
          contextLayers && contextLayers.length > 0
            ? { toolUseID: toolUseID, layers: contextLayers }
            : void 0,
        toolDuration: { toolName: tool.name, durationMs: Ca },
      });
    }
    if (Bs.detached) {
      if ((await addToolResult(zsn, pd), fo && !toolUseContext.abortController.signal.aborted))
        pushHookStoppedContinuation(qt, {
          toolName: tool.name,
          toolUseID: toolUseID,
          message: To || "Execution stopped by hook",
        });
      return qt;
    }
    let np,
      Rf = [],
      postToolHookStart = Date.now(),
      al = !1,
      mf = !1,
      rg = !1;
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
          Ca,
          {
            managedHooksExcluded:
              toolUseContext.managedPass?.toolUseId === toolUseID && VN(toolUseContext, tool),
          },
        ))
      if (((al = !0), "updatedToolOutput" in Ks)) ((toolOutput = Ks.updatedToolOutput), (mf = !0), (zs += 1));
      else if ("classifierContext" in Ks)
        Tl.push({
          ...Ks.classifierContext,
          pairedRewriteSeq: Ks.pairing === "none" ? void 0 : Ks.pairing === "pending" && zs > 0 ? zs : -1,
        });
      else if ((wr.push(Ks), Ks.message.type === "attachment")) {
        let att = Ks.message.attachment;
        if ("command" in att && att.command !== void 0 && "durationMs" in att && att.durationMs !== void 0)
          Rf.push({ command: att.command, durationMs: att.durationMs });
      }
    let uh = Date.now() - postToolHookStart;
    if (al) {
      let Ks = await noteHookModifiedFile(
        tool.name,
        toolUseID,
        observableInput,
        toolUseContext.readFileState,
      );
      if (Ks) wr.push({ message: Ks });
    }
    if (Bs.subagentFrameResultHolds !== void 0 && !VN(toolUseContext, tool)) {
      try {
        if (!(await Bs.subagentFrameResultHolds())) nl = "tool_says_stale";
      } catch (error) {
        (logError(error), (nl = "check_threw"));
      }
      if (nl !== void 0)
        logForDebugging(
          `${toolCategoryForTelemetry(tool)}: subagentFrameResult not sent (${nl}): the tool's check did not confirm that it still describes what the call left behind`,
        );
    }
    if (uh >= ISOLATION_TIMEOUT_MS)
      logForDebugging(
        `Slow PostToolUse hooks: ${uh}ms for ${toolCategoryForTelemetry(tool)} (${Rf.length} hooks)`,
        { level: "info" },
      );
    if (isMcpTool(tool)) {
      await addToolResult(attributeScheduledPlugin(tool.name, Qm, toolOutput));
      let Ks = isDocsConnectorTool(tool, toolUseContext.getAppState().mcp.clients)
        ? readFirstJsonPayload(Bs.data)
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
      let Ks = pd;
      if (mf) {
        let kl = tool.outputSchema?.safeParse(toolOutput),
          Yd = (xc, Ip) => {
            (logForDebugging(
              `PostToolUse hook returned updatedToolOutput that does not match ${toolCategoryForTelemetry(tool)}'s output shape: reason=${xc} detailChars=${Ip.length}`,
              { level: "error" },
            ),
              (toolOutput = Bs.data),
              (li = !0));
            let Gc = count(Tl, (oc) => oc.pairedRewriteSeq === zs);
            wr.push({
              message: createAttachmentMessage_2({
                type: "hook_error_during_execution",
                content: `PostToolUse hook returned updatedToolOutput that does not match ${tool.name}'s output shape; using original output.${Gc > 0 ? " A host-asserted classifier context attached by the same hook was discarded with the rejected rewrite." : ""} ${Ip}`,
                hookName: `PostToolUse:${tool.name}`,
                toolUseID: toolUseID,
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
                xc = tool.restoreTransientForRemap(Bs.data, toolOutput);
              } catch (error) {
                (logError(error), (xc = toolOutput));
              }
            let mapToolResultToToolResultBlockParam = tool.mapToolResultToToolResultBlockParam(xc, toolUseID);
            if (mapToolResultToToolResultBlockParam === void 0)
              Yd("mapper_undefined", "mapper returned undefined");
            else Ks = mapToolResultToToolResultBlockParam;
          } catch (error) {
            Yd("mapper_throw", formatToolErrorMessage(error));
          }
      }
      await addToolResult(attributeScheduledPlugin(tool.name, Qm, toolOutput), Ks);
    }
    if (tool.name === FILE_READ_TOOL_NAME && Bs.data && typeof Bs.data === "object") {
      let Ks = zfr(Bs.data);
      if (Ks !== void 0)
        qt.push({
          message: createAttachmentMessage_2({
            type: "read_truncation_notice",
            banner: Ks,
            toolUseID: toolUseID,
          }),
        });
    }
    if (shouldAddBashAudienceNote(tool.name, Bs.data, getMainLoopModel_2(toolUseContext)))
      qt.push({
        message: createAttachmentMessage_2({ type: "bash_output_audience_note", toolUseID: toolUseID }),
      });
    let Kf =
      getAbortKind(
        toolUseContext.abortController.signal,
        { name: tool.name, ran: !0, ...!1 },
        Vun(toolUseContext),
      ) !== null;
    for (let Ks of wr) qt.push(Ks);
    let ch = [...(Bs.newMessages ?? []), ...[]];
    if (ch.length > 0)
      for (let hookResult of ch)
        if (hookResult.type === "user") {
          let kl = { ...hookResult, turnCompanion: !0 };
          qt.push({ message: kl });
        } else qt.push({ message: hookResult });
    if (fo && !toolUseContext.abortController.signal.aborted)
      pushHookStoppedContinuation(qt, {
        toolName: tool.name,
        toolUseID: toolUseID,
        message: To || "Execution stopped by hook",
      });
    return (runAfterResultCommitted(Bs, !1 || Kf, logError), qt);
  } catch (error) {
    let Kr = Date.now() - now_2;
    $a.settle();
    let sample_2 = Ti.sample("after_throw");
    addToToolDuration(Kr);
    let Qs = LKe(error);
    if (!Qr)
      logForDebugging(
        `[Stall] tool_dispatch_end tool=${toolCategoryForTelemetry(tool)} toolUseId=${toolUseID} outcome=${Qs ? "aborted" : "error"} durationMs=${Kr}`,
        { level: Qs ? "info" : "warn" },
      );
    else
      logForDebugging(
        `[Stall] tool_dispatch_post_error tool=${toolCategoryForTelemetry(tool)} toolUseId=${toolUseID} durationMs=${Kr}`,
        { level: "warn" },
      );
    let Hi = errorMessage(error),
      Xa = classifyToolError(error);
    if (yo)
      noteToolTexts(
        observableInput,
        error instanceof McpToolCallError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS ? Hi : void 0,
      );
    let ta =
      Ho || rr || withholdsFileReferenceErrors(tool, toolUseID)
        ? error instanceof Error
          ? describeErrorWithoutText(error)
          : notRecordedLength(Hi)
        : Hi;
    if (
      (endToolExecutionSpan({
        success: !1,
        interrupted: getInterruptKind(error, toolUseContext.abortController.signal) !== void 0,
        error: isToolDetailsLoggingEnabled() ? ta : Xa,
        errorClass: Xa,
      }),
      endToolSpan(br),
      error instanceof McpAuthError)
    )
      toolUseContext.session.mcpSessionWiring.connections()?.markNeedsAuth(error.serverName);
    let Bs = isServerFallbackDiscard(toolUseContext.abortController.signal),
      Ca = {
        messageID: ye(messageId),
        toolName: sanitizeToolNameForAnalytics(tool.name),
        toolUseID: ye(toolUseID),
        isMcp: tool.isMcp ?? !1,
        toolInputSizeBytes: nt,
        ...(!Qr && {
          durationMs: Kr,
          ...$a.fields(Kr, nr),
          preToolHookDurationMs: un,
          permissionDurationMs: Nr,
          ...N$n(toolUseContext.abortController.signal),
          ...(_i !== void 0 && { durationMsAtAbort: _i - now_2 }),
        }),
        ...getSubagentTelemetryFields(toolUseContext.agentContext),
        ...getEffortTelemetryFields(toolUseContext),
        queryChainId: ye(toolUseContext.queryTracking?.chainId),
        queryDepth: toolUseContext.queryTracking?.depth,
        ...(mcpServerType && { mcpServerType: fromEnum(mcpServerType) }),
        ...(mcpServerBaseUrl && { mcpServerBaseUrl: safeOrigin(mcpServerBaseUrl) }),
        ...(requestId && { requestId: ye(requestId) }),
        ...(tool.readOnlyHint !== void 0 && { readOnlyHint: tool.readOnlyHint }),
        ...mcpToolAnalyticsFields(tool.name, mcpNameLoggable),
        ...claudeAiServerIdField(tool.mcpInfo),
        ...tool.mcpInfo?.pluginTelemetry,
      };
    if (!Bs && !Qs) {
      let { code: code, isSad: isSad } = classifyToolErrorCode(error);
      if (
        (logForDebugging(
          `${toolCategoryForTelemetry(tool)} tool error (${Kr}ms): code=${code} type=${Xa} errorChars=${Hi.length}`,
        ),
        isSad)
      )
        logFeatureSad(errorContent, code);
      else {
        let Eu = toError(error);
        (logError("telemetryMessage" in Eu ? Eu : withTelemetryMessage(Eu, `tool.call threw (${Xa})`)),
          logFeatureBad(errorContent, code));
      }
      let gd = tool.isMcp === !0 ? rY(error) : void 0;
      if (
        (logEvent("tengu_tool_use_error", {
          ...Ca,
          error: Xa,
          ...errorTelemetryFields(error),
          errorCode: Xa,
          ...(gd !== void 0 && { mcpErrorSource: fromEnum(gd) }),
          ...diffMemoryUsage(sample, sample_2),
          ...(tool.name === DESIGNSYNC && {
            dsMethod: fromEnumOpt(v_n.find((prevState) => prevState === observableInput.method)),
          }),
          ...(tool.name === WEBSEARCH && !tool.isMcp && getWebSearchModeAnalytics(observableInput, input)),
          ...(toolUseContext.options.messageClientPlatform && {
            messageClientPlatform: yW(toolUseContext.options.messageClientPlatform),
          }),
        }),
        !Qr && gd === "downstream_unreachable")
      )
        logForDiagnosticsNoPII("warn", "mcp_tool_call_unreachable", () => ({
          transport: mcpServerType ?? "unknown",
          error_class: Xa.replace(":", "_"),
          error_code: sanitizeErrnoForTelemetry(error) ?? "missing",
          duration_ms: Kr,
        }));
      let errorMsg = getMcpToolScope(tool);
      logOTelEvent(
        "tool_result",
        {
          tool_name: sanitizeToolNameForAnalytics(tool.name),
          tool_use_id: toolUseID,
          success: "false",
          duration_ms: String(Kr),
          error_type: Xa,
          ...(isToolDetailsLoggingEnabled() && { error: ta }),
          ...(Object.keys(ii).length > 0 && { tool_parameters: jsonStringify(ii) }),
          ...(Wi && { tool_input: Wi }),
          tool_input_size_bytes: String(nt),
          ...(wa && { decision_source: wa.source, decision_type: wa.decision }),
          ...(errorMsg && { mcp_server_scope: errorMsg }),
          ...(requestId && { request_id: requestId }),
        },
        toolUseContext.agentContext,
      );
    } else if (!Bs && !Qr) logEvent("tengu_tool_use_interrupted", Ca);
    let tu = a3r(error, toolUseContext.abortController.signal),
      pd =
        error instanceof McpToolCallError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS ? error.mcpMeta : void 0,
      ga = [];
    for await (let vs of runPostToolUseFailureHooks(
      toolUseContext,
      tool,
      toolUseID,
      messageId,
      observableInput,
      tu,
      Qs || Bs,
      requestId,
      mcpServerType,
      mcpServerBaseUrl,
      Kr,
    ))
      ga.push(vs);
    if (Bs)
      return buildCancelledToolResult({
        phase: "call",
        tool: tool,
        toolUseID: toolUseID,
        toolUseContext: toolUseContext,
        assistantMessage: assistantMessage,
        mcpServerType: mcpServerType,
        mcpServerBaseUrl: mcpServerBaseUrl,
        mcpNameLoggable: mcpNameLoggable,
        requestId: requestId,
        now: now,
      });
    let Hl = getInterruptKind(error, toolUseContext.abortController.signal),
      hd =
        Hl === void 0 ? await getToolErrorCode(error, tool.name, toolUseContext.options.mcpClients) : void 0,
      Sd =
        getAbortKind(
          toolUseContext.abortController.signal,
          { name: tool.name, ran: !0 },
          Vun(toolUseContext),
        ) !== null,
      Ld = [];
    if (
      (qt.push(
        {
          message: createUserMessage({
            content: [{ type: "tool_result", content: tu, is_error: !0, tool_use_id: toolUseID }],
            ...cutResultForStorage(toolUseContext, tool, !1, {
              toolUseId: toolUseID,
              toolUseResult: `Error: ${tu}`,
              mcpMeta: formatMcpStructuredContent(toolUseContext.agentId, pd, tool),
            }),
            toolDenialKind: Hl,
            toolDenialEndsTurn:
              toolUseContext.abortController.signal.aborted &&
              unwrapAbortReason(toolUseContext.abortController.signal.reason) === "permission-stop"
                ? !0
                : void 0,
            toolResultRemedy: hd,
            sandboxViolations: error instanceof ShellError ? error.sandboxViolations : void 0,
            sandboxed: error instanceof ShellError ? error.sandboxed : void 0,
            sourceToolAssistantUUID: assistantMessage.uuid,
            now: now,
          }),
          toolDuration: { toolName: tool.name, durationMs: fi ?? Kr },
        },
        ...Ld,
        ...ga,
      ),
      fo && !Qs && !toolUseContext.abortController.signal.aborted)
    )
      pushHookStoppedContinuation(qt, {
        toolName: tool.name,
        toolUseID: toolUseID,
        message: To || "Execution stopped by hook",
      });
    return (runAfterResultCommitted(error, Sd, logError), qt);
  } finally {
    if (jo !== void 0) releaseHeadReflogMark(jo);
    if ((Di(), wa)) toolUseContext.toolDecisions.delete(toolUseID);
  }
}
/**
 * 规范化工具名用于记录：Task→Agent，MCP 工具缩成 mcp__<server>，非法字符换成 _，与保留词（instructions/person/claude/summary/other）冲突时加 _。
 */
//@ chunk-bk5ntezz.js:3179-3346 fingerprint = findMcpServerConnection (1)
function normalizeToolNameForTranscript(s) {
  if (s === TASK) return AGENT;
  let sliced = s.slice(0, L),
    e = mcpInfoFromString(sliced)?.serverName,
    replaced = (e === void 0 ? sliced : `mcp__${e}`).replace(/[^\w.:-]/g, "_");
  return [INSTRUCTIONS, PERSON, CLAUDE, SUMMARY, OTHER].includes(replaced) ? `${replaced}_` : replaced;
}

export {
  takeCutResult,
  hasTypeField,
  waitForMcpToolServer,
  s3s,
  shouldWaitForMcpTool,
  findLongestPrefixClients,
  lGt,
  runToolUse,
  classifyToolError,
  getRequestTimingStore,
  getMcpServerBaseUrlFromToolName,
  clearCutResults,
  fGt,
  LKe,
  classifyToolErrorCode,
  normalizeToolNameForTranscript,
  emitToolHeartbeat,
  getCancelMessage,
  restoreCallInput,
  runValidateInput,
  gYr,
  explainUnavailableArtifactTool,
  q1o,
  i3s,
};
