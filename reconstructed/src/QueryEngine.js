/**
 * QueryEngine.ts
 *
 * headless/SDK 引擎入口：ask() 由 runHeadlessStreaming 调用，从会话配置（工具、MCP、系统提示词选项、代理等，支持惰性函数）构建本次查询的 ToolUseContext；引擎主体（submitMessage 循环）在未归属的 chunk-tyg7f3ek.js#nI。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/QueryEngine.ts
 * pieces: chunk-18hwfzwa.js (1), chunk-tyg7f3ek.js (61)
 * attribution: fingerprint 2, placement 55, sole-consumer 1, layout 2, affinity 2
 */
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
} from "crypto";
import { NO_CONTENT_MESSAGE, DELETED_IMAGE_NOTICE, SYNTHETIC_MODEL } from "./constants/messages.js";
import { hPt } from "./utils/messageKinds.js";
import { resolveMessageAlias } from "./utils/pollEvents/fold.js";
import {
  withRenderedAttachment,
  isInterruptionOnlyMessage,
  isUserPromptOfKind,
  isUserStampPrompt,
  OB,
  isToolResultMessage,
  isTurnCompanion,
  attachmentToMessages,
  createSystemMessage,
  isEmptyUserMessage,
  checkSessionStartPlacement,
  countNamedToolUses,
  stripAgentToolResultForStorage,
  zbe,
  stripToolResultsForStorage,
  createModelFallbackSystemMessage,
} from "./utils/messages.js";
import {
  chromeSetupModule,
  checkContextInstructionsSize,
  gatewayCodeTabRulesNotice,
} from "./cli/print/agentResume.js";
import { lse } from "./services/api/promptPrefixLedger.js";
import {
  getStickyBetas,
  getSessionId,
  swapMcpServerTools,
  getTotalCostUSD,
  getModelUsage,
  getSafetyStops,
  noteSystemPromptSectionInvalidation,
  setAutoModeUnavailableStopNotice,
  isSessionPersistenceDisabled,
  getSystemPromptSectionEpoch,
  setLocalCommandExitCode,
  getAutoModeUnavailableStopNotice,
  getTotalAPIDuration,
  isDiskless,
} from "./bootstrap/state.js";
import { notifyCacheDeletion } from "./services/api/promptCacheBreakDetection.js";
import { logFeatureOk, logFeatureBad, logFeatureSad } from "./services/analytics/featureTelemetry.js";
import { logError, getInMemoryErrors } from "./utils/log.js";
import { getTaskListId, snapshotTaskList } from "./utils/tasks.js";
import {
  hasRemoteWorkerEventLog,
  registerTranscriptExitDrain,
  readAtTranscriptEntry,
  inTranscriptCallOrder,
  recordTranscript,
  transcriptCursorEnd,
  collectReplIds,
  isLoggableMessage,
  isChainParticipant,
  hasSessionMirror,
  removeTranscriptMessage,
  buildFileHistorySnapshotChain,
  flushSessionStorage,
} from "./utils/sessionStorage.js";
import { qu } from "./cli/print/turnStartChecks.js";
import { jsonStringify } from "./utils/slowOperations.js";
import { logEvent } from "./services/analytics/index.js";
import { fromEnum, fromEnumOpt } from "./services/analytics/safeMetadata.js";
import { HostScoped } from "./utils/hostScoped.js";
import {
  isAbortError,
  AbortError,
  withTelemetryMessage,
  toError,
  TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS,
  errorMessage,
} from "./utils/errors.js";
import { raceWithAbortSignal, withDeadline } from "./utils/sleep.js";
import { logForDebugging } from "./utils/debug.js";
import { isHumanOrUnset } from "./utils/messageProvenance.js";
import { aO } from "./utils/historyFile.js";
import { getMcpPrefix, buildMcpToolName, mcpInfoFromString } from "./services/mcp/mcpStringUtils.js";
import { mRe, addUsage_2, $jo } from "../vendor/@anthropic-ai/sdk/lib/internal/tracing/response.mjs";
import { EMPTY_USAGE } from "./services/api/emptyUsage.js";
import {
  fon,
  njn,
  buildSystemInitMessage,
  buildRemoteSystemInitFields,
  buildSystemInitFields,
  RLs,
  LIFECYCLE_WAKEUP_SOURCE_V1,
  TASK_LIST_RESTORE_V1,
  TASK_LIST_RESTORED_V1,
  MCP_READ_RESOURCE_V1,
  MCP_TOOL_UI_META_V1,
  ejn,
  MCP_CALL_RESULT_NOT_FOR_MODEL_V1,
  READ_FILE_AS_WRITTEN_V1,
  CLs,
  shouldOfferLinuxSandboxHint,
  START_SHELL_TASK_V1,
  recordInitTiming,
} from "./utils/messages/systemInit.js";
import { isRecordableDenial } from "./types/permissions.js";
import {
  isExternalOrigin,
  stampMissingOrigin,
  XQn,
  JQn,
  QQn,
  attachTaskDelivery,
} from "./utils/messages/nonUserMessages.js";
import { selectableUserMessagesFilter } from "./utils/messages/mappers.js";
import { bashCommandTagKindOf, localCommandTagKindOf } from "./utils/messages/localCommandTags.js";
import { cleanShellOutputForViewers } from "./utils/shell/headlessBash.js";
import { mergedMessageUuids } from "./cli/print/queuedMessageUtils.js";
import { trimTrailingAfterTurn, isTurnAnswered } from "./cli/print/transcriptChain.js";
import { lookMcpTaskEndings } from "./tasks/McpTask/mcpTaskEndings.js";
import { count, uniq } from "./utils/collections.js";
import { getTokenCountFromUsage_4 } from "./services/compact/compact.js";
import { isCompactBoundaryMessage, Us } from "./services/projects/threadRows.js";
import {
  isStopInterruptionRow,
  isInterruptMarkerRow,
  isQueueTranscriptOnlyUserMessage,
} from "./utils/transcript/deserialize.js";
import { isVsCodeTopSession } from "./utils/sessionShape.js";
import {
  waitForMcpToolServer,
  lGt,
  findLongestPrefixClients,
  getMcpServerBaseUrlFromToolName,
  clearCutResults,
} from "./services/tools/toolExecution.js";
import { currentMcpClients } from "./services/compact/idleToolResultClearing.js";
import { listMcpTools } from "./services/mcp/mcpWireUtils.js";
import { describeConnectError } from "./services/mcp/auth.js";
import { officeBridgeListingState, REMOTE_DEVICES } from "./services/mcp/firstPartyServerIds.js";
import { refreshMcpServerTools } from "./services/mcp/client.js";
import { findToolByName, toolMatchesName } from "./Tool.js";
import {
  h9t,
  buildResultMessage,
  normalizeCustomSubtype,
  isAbortedTerminalReason,
} from "./entrypoints/sdk/coreSchemas.js";
import { qS, bbn } from "./services/api/deferredToolsState.js";
import { isPermissionCardHoldEnabled } from "./cli/print/wakeRouter.js";
import {
  hasToolResultAfter,
  lastUserAfterAssistant,
  handleOrphanedPermission,
  handleHandedOffTurn,
  isHandoffTurnSettled,
  resumeDeferredToolUse,
  Ebe,
  appendRowsWithHooks,
  Owt,
  getSalvageableResultText,
  getRecentErrorLog,
} from "./utils/queryHelpers.js";
import {
  getFastModeState,
  getFastModeUnavailableReasonCode,
  getFastRejectedReason,
  rearmCreditsExhaustedNotice,
} from "./utils/fastMode.js";
import { V2e, dropCcrTurnId } from "./services/mcp/ccrTurnId.js";
import { s5r, xbn } from "./utils/telemetry/sessionTracing.js";
import { logForDiagnosticsNoPII } from "./utils/diagLogs.js";
import { createTaskListCatchUp, TASK_LIST_HANDOFF_STATE } from "./cli/print/taskListRestore.js";
import { hmn, A3s, w3s, jS, WS, k3s, T3s } from "./utils/queryProfiler.js";
import { clearContextKey, gl, setCwdForCallChain, getContextKey } from "./utils/cwd.js";
import { headlessProfilerCheckpoint } from "./utils/headlessProfiler.js";
import { getSlashCommandToolSkills } from "./commands.js";
import { loadAllPluginsCacheOnly } from "./utils/plugins/pluginLoader.js";
import { Br, uyi } from "./utils/startupTiming.js";
import { isExemptDefaultResolvingPick } from "./utils/model/defaultModel.js";
import { isModelAllowed } from "./utils/model/modelAllowlist.js";
import { parseUserSpecifiedModel } from "./utils/model/modelDisplay.js";
import { getMainLoopModel } from "./utils/model/model.js";
import { getRuntimeMainLoopModel } from "./utils/model/planModeModel.js";
import {
  isBetaHeaderAllowed,
  shouldUseGlobalCacheScope,
  isSkillModelOverrideAllowedInMode,
} from "./utils/betas.js";
import { fetchSystemPromptParts } from "./utils/queryContext.js";
import { TOOL_CATALOG } from "./tools.js";
import {
  isScratchpadEnabled,
  getScratchpadDir,
  declaredAbsoluteAdditionalDirectories,
} from "./utils/permissions/filesystem.js";
import { hasAutoMemPathOverride, getAutoMemPathState } from "./memdir/paths.js";
import { loadMemoryPrompt } from "./memdir/memdir.js";
import { getPromptModel } from "./utils/model/promptBundles.js";
import { withCliSections } from "./constants/promptSections.js";
import { baseSystemPromptOf } from "./utils/systemPromptBoundary.js";
import { renderAppendPromptHead } from "./cli/startup/appendPromptHead.js";
import { asSystemPrompt } from "./utils/systemPromptType.js";
import { getPlatform } from "./utils/platform.js";
import { getCachedPowerShellPath } from "./utils/shell/powershellDetection.js";
import { isTransportBacked, transportStateByHost, orderForTransport } from "./cli/transportState.js";
import { r1 } from "./services/mcp/redactMcpErrors.js";
import { mcpServerSource } from "./services/mcp/fileReference/fileReferencePolicy.js";
import { proactivityStateStub } from "./cli/print/proactivityControl.js";
import { mergeClients as mergeClients_2, Z5 } from "./utils/commandPredicates.js";
import { fqs } from "./utils/claudeAiSync/skillsSync.js";
import { isMarketplacePluginError, pluginNameOfError } from "./tools/SkillTool/pluginLoadFailureNote.js";
import { pluginErrorText } from "./types/plugin.js";
import { getSkippedDynamicServers } from "./services/mcp/mcpConfigProvenance.js";
import { hasMarketplaceAlias } from "./utils/plugins/pluginIdentifier.js";
import { pluginWarningText } from "./utils/plugins/pluginComponentConflicts.js";
import { x3s, P3s, computeDeclaredToolSet, promptIdForRequest } from "./services/api/claude.js";
import { viewTeammateOutput } from "./components/teams/TeamsDialog.js";
import {
  queuedNotificationCapabilities,
  createNotificationDrain,
} from "./services/queuedNotifications/queuedNotifications.js";
import { sessionNoticesCapability, SESSION_NOTICES } from "./cli/print/sessionNotices.js";
import { sdkMcpCapabilities, uiSurfaceCapabilities, uiHookedCapabilities } from "./cli/sdkMcpManifests.js";
import { isReadFileAsWrittenServed } from "./cli/print/authAndPolicyRefresh.js";
import { reduceFileHistoryState, fileHistoryMakeSnapshot, fileHistoryEnabled } from "./utils/fileHistory.js";
import { freeze_2 as freeze_2_2, createColorAssigner } from "./services/artifacts/artifactReadConsent.js";
import { mainAgentContext } from "./utils/agentContext.js";
import { query } from "./query.js";
import { resolveThemeSetting } from "./utils/systemTheme.js";
import { resolveSetting } from "./utils/settings/userIntentSettings.js";
import { createAppStateAccessors, createPermissionContextSetters } from "./state/appStateSetters.js";
import { createTaskFramework } from "./utils/task/framework.js";
import { wIe } from "./state/sliceHelpers.js";
import { restoreAttributionStateFromSnapshots } from "./utils/commitAttribution.js";
import { applySessionSettingsPatch } from "./state/applySessionSettingsPatch.js";
import { N7s } from "./services/compact/keptTools.js";
import {
  setCwd,
  setCwdV5,
  MissingWorkingDirectoryError,
  missingWorkingDirectoryPins,
} from "./utils/Shell.js";
import {
  informationalSystemMessage,
  preservedAttachmentRows,
  replayMessagesToSdk,
  systemMessagesToSdk,
  toSdkMessages,
} from "./cli/print/sdkMessageStream.js";
import { DeclaredToolSet, DSe, resolveDeclaredToolSet } from "./services/api/declaredToolSet.js";
import {
  isToolSearchEnabledOptimistic,
  isToolSearchPrecluded,
  toolSearchRejectedOn,
  extractDiscoveredToolNames,
  getNonDeferrableBuiltins,
} from "./utils/toolSearch.js";
import { MSe } from "./services/mcp/mcpToolAvailability.js";
import { isDeferredTool, isDeferredToolInConversation } from "./tools/ToolSearchTool/prompt.js";
import { Ket } from "./utils/conversationRecovery.js";
import { env } from "./utils/env.js";
import { kAe } from "./tools/BashTool/androidCommands.js";
import { _tt } from "./services/tools/webToolIsolation.js";
import { InstanceRegistry } from "./utils/instanceRegistry.js";
import { Spe } from "./services/plugins/accountSync/syncedPluginHooks.js";
import { efe } from "./memdir/findRelevantMemories.js";
import { createAbortController, userAbortReason } from "./utils/abortController.js";
import { Stream } from "./utils/stream.js";
import { createQueryEngine } from "./engine/queryEngine.js";
import {
  GLi,
  abortTurnSignal,
  applyMessageListEdit,
  applyMessageListAppend,
  startTurnTiming,
  buildTurnStartEvent,
  runMessageDisplayHook,
  collectReadNotificationsToolUseIds,
} from "./cli/print/turnStreaming.js";
import { opsDelivered, applyPendingInvalidations } from "./plugins/functionHooks/hooksModuleLoader.js";
import { logModsFirstTurn } from "./plugins/functionHooks/modLoadTelemetry.js";
import {
  b$o,
  shouldSnapshotSystemPrompt,
  snapshotContainsPrompt,
  tagBlockChange,
  latestPromptSnapshot,
} from "./utils/contextAttachments/promptSnapshot.js";
import { ROs, xxr, oSo } from "./query/promptSnapshot.js";
import { applyTurnDisallowedTools, filterTurnDisallowedTools, WXn } from "./cli/printUsageSummary.js";
import { useMessageActions } from "./components/messageActions.js";
import { markOwnClientPrompt } from "./tools/BashTool/bashEditDiff/gitEnv.js";
import { noteTurnClientPlatform } from "./tools/ChromeSetupOfferTool/ChromeSetupOfferTool.js";
import { isStorageV5Enabled } from "./utils/hoverRest.js";
import { cYs } from "./utils/api.js";
import { GZn } from "./services/accountMemory/memoryContext.js";
import { buildRunningTurnRecord, createRunningTurnTracker } from "./cli/print/runningTurnRecord.js";
import { awaitMcpSettle } from "./query/toolDrain.js";
import { getUserContextMemoryFiles } from "./context.js";
import { STRUCTUREDOUTPUT } from "./tools/SyntheticOutputTool/SyntheticOutputTool.js";
import {
  initWithUserMessageUuids,
  withoutSessionId,
  markMaxTurnsExit,
  appendUnique,
  withUserMessageUuids,
} from "./cli/print/triggerPayloads.js";
import { profileCheckpoint } from "./utils/startupProfiler.js";
import { r9n, markVerifiedHumanTurn } from "./utils/messages/apiNormalization.js";
import { createPromptEntryTracker } from "./utils/processUserInput/promptEntryWaiters.js";
import { processUserInput } from "./utils/processUserInput/processUserInput.js";
import { confirmWithUser } from "./utils/permissions/confirmWithUser.js";
import { withdrawBridgeAttachments } from "./utils/attachments/bridgeAttachments.js";
import { setHearthRelayMetadata } from "./services/projectsRelay/relayConfig.js";
import { isFoamySpringEnabled } from "./services/analytics/growthbookGates.js";
import { $ci, prefetchSenderAddressFor } from "./services/api/requestHeaders.js";
import { isBareMode } from "./utils/envUtils.js";
import { Var } from "./utils/pollEvents.js";
import { toStreamEventMessage, createPartialStreamRetraction } from "./cli/print/userPromptFiles.js";
import { nSo, isTextOrJsonDeltaEvent } from "./query/goalCheckIn.js";
import { getSourceUuid } from "./cli/queuedCommands.js";
import { parseUsageIterations } from "./utils/modelCost.js";
import {
  createRefusalFallbackMessage,
  convertCompactBoundaryMessage,
  createConsentFallbackMessage,
  createRefusalNoFallbackMessage,
} from "./remote/sdkMessageAdapter.js";
import { isRefusalFallbackEnabled } from "./services/api/refusalFallback.js";
import { F3n } from "./utils/permissions/serverClassifier/results.js";
import {
  STRUCTURED_OUTPUT_RETRACTED_MESSAGE,
  MAX_STRUCTURED_OUTPUT_RETRIES,
  formatStructuredOutputFailure,
  hasSuccessfulToolCallSince,
} from "./cli/structuredOutputRetry.js";
import { telemetrySafeModelName } from "./utils/model/telemetryModelName.js";
import { isMarkerTextDelta, LLt } from "./cli/print/resumeMcpTasks.js";
import { uN } from "./cost-tracker.js";
import { raiseTurnComplete } from "./query/turnHooks.js";
import { ye } from "./utils/startupMarks.js";
import { resolveEffortLevel } from "./utils/effort.js";
import { nv, ZC } from "./utils/remoteFileState.js";

//@ chunk-tyg7f3ek.js:416207-418123 placement
function reconcileSavedFilesForTurn(e, n) {
  try {
    let r = new Set(n.map((R) => R.toLowerCase())),
      s = new Set(
        e.flatMap((R) =>
          R.type === "user" && Array.isArray(R.savedFiles)
            ? R.savedFiles.flatMap((savedFile) =>
                typeof savedFile?.file_uuid === "string" &&
                typeof savedFile.path === "string" &&
                r.has(savedFile.file_uuid.toLowerCase())
                  ? [savedFile.path]
                  : [],
              )
            : [],
        ),
      ),
      h = 0,
      y = [];
    for (let [R, w] of e.entries())
      if (w.type === "user") {
        let P = maskDisallowedNames(w.imageFileUuids, r);
        if (P === void 0 || !Array.isArray(w.message?.content)) continue;
        let L = mE(w.message.content, P),
          q = w.message.content.length - L.length;
        ((h += q),
          y.push([
            R,
            {
              ...w,
              message: {
                ...w.message,
                content: L.length > 0 ? L : [{ type: "text", text: NO_CONTENT_MESSAGE }],
              },
              withdrawnImages: (w.withdrawnImages ?? 0) + q,
              imageFileUuids: zu(w.imageFileUuids, P),
              imagePasteIds: zu(w.imagePasteIds, P),
              [hPt]: resolveMessageAlias(w),
            },
          ]));
      } else if (w.type !== "attachment") continue;
      else if (w.attachment?.type === "inlined_image_paths") {
        let { attachment: attachment } = w,
          L = maskDisallowedNames(attachment.fileUuids, r);
        if (L === void 0) continue;
        y.push([
          R,
          {
            ...withRenderedAttachment(w, {
              ...attachment,
              paths: zu(attachment.paths, L) ?? [],
              fileUuids: zu(attachment.fileUuids, L),
            }),
            [hPt]: resolveMessageAlias(w),
          },
        ]);
      } else if (w.attachment?.type === "file") {
        if (w.attachment.content?.type !== "image" || !s.has(w.attachment.filename)) continue;
        (h++,
          y.push([
            R,
            {
              ...withRenderedAttachment(w, {
                type: "critical_system_reminder",
                content: DELETED_IMAGE_NOTICE,
              }),
              [hPt]: resolveMessageAlias(w),
            },
          ]));
      } else if (w.attachment?.type === "queued_command") {
        let { attachment: attachment } = w,
          L = maskDisallowedNames(attachment.imageFileUuids, r);
        if (L === void 0 || !Array.isArray(attachment.prompt)) continue;
        let q = mE(attachment.prompt, L),
          x = attachment.prompt.length - q.length;
        ((h += x),
          y.push([
            R,
            {
              ...withRenderedAttachment(w, {
                ...attachment,
                prompt: q.length > 0 ? q : NO_CONTENT_MESSAGE,
                withdrawnImages: (attachment.withdrawnImages ?? 0) + x,
                imageFileUuids: zu(attachment.imageFileUuids, L),
                inlinedImagePaths: zu(attachment.inlinedImagePaths, L),
              }),
              [hPt]: resolveMessageAlias(w),
            },
          ]));
      }
    for (let [R, w] of y) e[R] = w;
    let S = chromeSetupModule?.getTeleportCacheState();
    if (S?.status === "active" && y.some(([, { uuid: R }]) => S.preAnchorLineUuids.includes(R)))
      chromeSetupModule?.revertTeleportCache("context_reduced", "main");
    if (y.length > 0) (lse(getStickyBetas(), "pictures_withdrawn"), notifyCacheDeletion("sdk"));
    logFeatureOk("bridge_attachment_withdraw", { listed_count: r.size, cut_picture_count: h });
  } catch (error) {
    (logError(error), logFeatureBad("bridge_attachment_withdraw", "cut_failed"));
  }
}
//@ chunk-tyg7f3ek.js:418123-418262 placement
function maskDisallowedNames(e, n) {
  if (!Array.isArray(e)) return;
  let mapped = e.map((s) => typeof s !== "string" || !n.has(s.toLowerCase()));
  return mapped.includes(!1) ? mapped : void 0;
}
//@ chunk-tyg7f3ek.js:418262-418336 placement
function zu(e, n) {
  return Array.isArray(e) ? e.filter((r, s) => n[s] ?? !0) : void 0;
}
//@ chunk-tyg7f3ek.js:418336-418415 placement = _temp (1)
function mE(e, n) {
  let r = 0;
  return e.filter((s) => s?.type !== "image" || (n[r++] ?? !0));
}
//@ chunk-tyg7f3ek.js:418415-418429 placement
var Xq = 262144;
//@ chunk-tyg7f3ek.js:418429-419533 placement
async function mirrorTaskListSnapshot(e, n, r) {
  try {
    let s = getTaskListId();
    if (!hasRemoteWorkerEventLog() || s !== n.id) return;
    let h = await snapshotTaskList(s, r);
    if (h === null || h.tasks === null) h = (await snapshotTaskList(s, r)) ?? h;
    if (h === null) {
      logFeatureBad("task_list_carry", "list_unreadable");
      return;
    }
    let { tasks: tasks, highestId: highestId } = h;
    if (highestId === 0) return;
    if (highestId > qu) {
      logFeatureBad("task_list_carry", "highest_id_over_limit");
      return;
    }
    if (tasks === null) {
      ((e.compactMetadata.preCompactTaskList = { highestId: highestId }),
        logFeatureSad("task_list_carry", "task_unreadable", { highest_id: highestId }));
      return;
    }
    let filtered = tasks.filter((x) => !x.metadata?._internal),
      w = { task_count: filtered.length, highest_id: highestId },
      P = taskListSnapshotPayload({ shown: filtered, highestId: highestId, descriptions: !0, metadata: !0 });
    if (PS(P)) {
      ((e.compactMetadata.preCompactTaskList = P), logFeatureOk("task_list_carry", w));
      return;
    }
    let L = taskListSnapshotPayload({
      shown: filtered,
      highestId: highestId,
      descriptions: !0,
      metadata: !1,
    });
    if (PS(L)) {
      ((e.compactMetadata.preCompactTaskList = L), logFeatureSad("task_list_carry", "metadata_left_out", w));
      return;
    }
    let q = taskListSnapshotPayload({
      shown: filtered,
      highestId: highestId,
      descriptions: !1,
      metadata: !1,
    });
    if (PS(q)) {
      ((e.compactMetadata.preCompactTaskList = q),
        logFeatureSad("task_list_carry", "descriptions_left_out", w));
      return;
    }
    ((e.compactMetadata.preCompactTaskList = { highestId: highestId }),
      logFeatureSad("task_list_carry", "tasks_left_out", w));
  } catch (error) {
    (logFeatureBad("task_list_carry", "carry_failed"), logError(error));
  }
}
//@ chunk-tyg7f3ek.js:419533-419959 placement
function taskListSnapshotPayload({
  shown: shown,
  highestId: highestId,
  descriptions: descriptions,
  metadata: metadata,
}) {
  return {
    tasks: shown.map((h) => ({
      id: h.id,
      subject: h.subject,
      ...(descriptions && h.description !== "" && { description: h.description }),
      ...(h.activeForm !== void 0 && { activeForm: h.activeForm }),
      status: h.status,
      ...(h.owner !== void 0 && { owner: h.owner }),
      ...(h.blocks.length > 0 && { blocks: h.blocks }),
      ...(h.blockedBy.length > 0 && { blockedBy: h.blockedBy }),
      ...(metadata && h.metadata !== void 0 && { metadata: h.metadata }),
    })),
    highestId: highestId,
  };
}
//@ chunk-tyg7f3ek.js:419959-420016 placement
function PS(e) {
  return Buffer.byteLength(jsonStringify(e), "utf8") <= Xq;
}
//@ chunk-tyg7f3ek.js:420016-420648 placement
function createRetractionFilter() {
  let e,
    n = new Set(),
    r = 0;
  function s(S) {
    let retractedMessageUuids = S.retractedMessageUuids;
    if (retractedMessageUuids === void 0 || n.size === 0) return S;
    return { ...S, retractedMessageUuids: retractedMessageUuids.filter((w) => !n.has(w)) };
  }
  function h(S, R) {
    let w = { banner: s(S), suppressedCount: r, emittedVia: R };
    return ((r = 0), w);
  }
  function y(S) {
    if (e === void 0) return [];
    let R = h(e, S);
    return ((e = void 0), [R]);
  }
  return {
    accept(S) {
      let R = [];
      if (e !== void 0)
        if (S.retractedMessageUuids?.includes(e.uuid)) (n.add(e.uuid), (r += 1), (e = void 0));
        else R.push(...y("episode_boundary"));
      if (S.provisional) e = S;
      else R.push(h(S, r > 0 ? "supersedes" : "immediate"));
      return R;
    },
    dropHeld(S) {
      if (e?.uuid === S) (n.add(e.uuid), (r += 1), (e = void 0));
    },
    settle(S) {
      return y(S);
    },
  };
}
//@ chunk-tyg7f3ek.js:420648-421367 placement
function collapseRefusalFallbackNotices(e, n) {
  return e.map(({ banner: banner, suppressedCount: suppressedCount, emittedVia: emittedVia }) => {
    if (suppressedCount > 0)
      logEvent("tengu_refusal_fallback_notice_collapsed", {
        suppressed_count: suppressedCount,
        emitted_via: fromEnum(emittedVia),
      });
    return {
      type: "system",
      subtype: "model_refusal_fallback",
      trigger: banner.trigger,
      direction: banner.direction,
      ...(banner.scope !== void 0 && { scope: banner.scope }),
      original_model: banner.originalModel,
      fallback_model: banner.fallbackModel,
      request_id: banner.requestId,
      api_refusal_category: banner.apiRefusalCategory ?? null,
      api_refusal_explanation: banner.apiRefusalExplanation ?? null,
      ...(banner.sawCyberRefusal && { saw_cyber_refusal: !0 }),
      ...(banner.retractedMessageUuids !== void 0 && {
        retracted_message_uuids: banner.retractedMessageUuids,
      }),
      refused_user_message_uuid: banner.refusedUserMessageUuid ?? null,
      content: banner.content,
      session_id: n,
      uuid: banner.uuid,
    };
  });
}
//@ chunk-tyg7f3ek.js:421367-421402 placement
var _E = 15000,
  Zq = new HostScoped(() => new Set());
//@ chunk-tyg7f3ek.js:421402-422100 placement
function runBuiltinTurnObservers(e, n, r, s) {
  if (r.aborted) return;
  let h = [];
  for (let y of Zq.of(e))
    try {
      let S = y(n, r);
      if (S !== void 0)
        h.push(
          S.catch((R) => {
            if (r.aborted && isAbortError(R)) return;
            logError(
              Error(
                "A built-in plugin failed while getting ready for this prompt; the prompt runs without waiting for it",
                { cause: R },
              ),
            );
          }),
        );
    } catch (error) {
      logError(
        Error(
          "A built-in plugin threw while getting ready for this prompt; the prompt runs without waiting for it",
          { cause: error },
        ),
      );
    }
  if (h.length === 0) return;
  return raceWithAbortSignal(withDeadline(Promise.all(h), _E, s), r, () => new AbortError()).then(
    (y) => {
      if (y === void 0)
        logForDebugging(`Built-in plugins still getting ready after ${_E} ms; the prompt runs now`);
    },
    (y) => {
      if (!isAbortError(y))
        logError(
          Error("Waiting for built-in plugins before the prompt failed; the prompt runs now", { cause: y }),
        );
    },
  );
}
//@ chunk-tyg7f3ek.js:422100-422429 placement
function isTypedPersonPrompt(e, n, r, s) {
  try {
    let y =
      r?.inputMode !== "bash" &&
      r?.textNotTyped !== !0 &&
      (r?.skipSlashCommands !== !0 || r?.bridgeOrigin === !0 || r?.modelScheduledOrigin === !0) &&
      isHumanOrUnset(r?.origin)
        ? aO(n)
        : null;
    return y === null ? void 0 : runBuiltinTurnObservers(e, y, s);
  } catch (error) {
    logError(
      Error("Waiting for built-in plugins before the prompt failed; the prompt runs now", { cause: error }),
    );
    return;
  }
}
//@ chunk-tyg7f3ek.js:422429-422737 placement
function markDroppedPrompts(e, n, r) {
  try {
    let s = new Set(r);
    if (n !== void 0) s.add(n);
    let last = e.findLast(isInterruptionOnlyMessage);
    if (s.size > 0 && last?.type === "user") last.droppedPromptUuids = [...s];
  } catch (error) {
    logError(
      Error(
        `could not write a stopped prompt's uuids on its interruption marker: a rewind or a fork to that prompt will answer "target not found"`,
        { cause: error },
      ),
    );
  }
}
//@ chunk-tyg7f3ek.js:422737-422882 placement
function filterMcpToolsBySelectedServers(e, n, r) {
  if (n.length > 0) return e;
  let mapped = r.map((h) => getMcpPrefix(h.name));
  return e.filter((h) => mapped.includes(`${h}__`) || !mapped.some((y) => h.startsWith(y)));
}
//@ chunk-tyg7f3ek.js:422882-423099 placement
function assistantUsageDelta(e, n, r) {
  try {
    let { id: id, model: model, usage: usage } = e.message;
    if (e.isApiErrorMessage || model === SYNTHETIC_MODEL || id === n || id === r) return;
    return mRe(EMPTY_USAGE, usage);
  } catch (error) {
    logError(
      withTelemetryMessage(toError(error), "usage of an unstreamed answer not added to the turn total"),
    );
    return;
  }
}
//@ chunk-tyg7f3ek.js:423099-423374 placement
function createPermissionDenialTracker(e) {
  let n = [];
  function r(s, h, y) {
    if (n.some((S) => S.tool_use_id === h)) return;
    n.push({ tool_name: fon(s.name), tool_use_id: h, tool_input: y });
  }
  return {
    permissionDenials: n,
    recordDenial: r,
    canUseTool: async (s, h, y, S, R, w) => {
      let P = await e(s, h, y, S, R, w);
      if (isRecordableDenial(P, w)) r(s, R, h);
      return P;
    },
  };
}
//@ chunk-tyg7f3ek.js:423374-423535 placement
function userRowsToReplay(e, n) {
  return e.filter(
    (r) =>
      (r.type === "user" &&
        !r.toolUseResult &&
        ((!r.isMeta && isOwnPromptRow(r, n)) || isExternalOrigin(r.origin))) ||
      (r.type === "system" && r.subtype === "compact_boundary"),
  );
}
//@ chunk-tyg7f3ek.js:423535-423637 placement
function isOwnPromptRow(e, n) {
  return e.type === "user" && n?.localStdinOrigin === !0 && DS(e, n)
    ? isUserPromptOfKind(e, "own-prompt")
    : isUserStampPrompt(e);
}
//@ chunk-tyg7f3ek.js:423637-423859 placement
function* replayUserRows(e, n) {
  for (let r of e) {
    if (r.type !== "user") continue;
    yield n?.inputMode === "bash"
      ? {
          type: "user",
          message: r.message,
          session_id: getSessionId(),
          parent_tool_use_id: null,
          uuid: r.uuid,
          timestamp: r.timestamp,
          isSynthetic: selectableUserMessagesFilter(r),
        }
      : toSdkUserMessage(r, n);
  }
}
//@ chunk-tyg7f3ek.js:423859-423977 placement
function* userRowsForSdk(e, n) {
  let r = n?.shouldQuery === !1;
  for (let s of e)
    if (s.type === "user") {
      if (!r && !DS(s, n)) continue;
      yield toSdkUserMessage(s, n);
    }
}
//@ chunk-tyg7f3ek.js:423977-424032 placement
function DS(e, n) {
  return n?.uuid != null && e.uuid === n.uuid;
}
//@ chunk-tyg7f3ek.js:424032-424301 placement
function toSdkUserMessage(e, n) {
  let s = DS(e, n) ? n?.fileAttachments : void 0;
  return {
    type: "user",
    message: e.message,
    session_id: getSessionId(),
    parent_tool_use_id: null,
    uuid: e.uuid,
    timestamp: e.timestamp,
    isReplay: !0,
    isSynthetic: selectableUserMessagesFilter(e),
    ...(s && s.length > 0 && { file_attachments: s }),
    ...(e.origin && { origin: e.origin }),
  };
}
//@ chunk-tyg7f3ek.js:424301-424555 placement = _temp7 (0.809)
function userRowsWithoutInput(opt) {
  let n = [];
  for (let r of opt) {
    if (r.type !== "user" || r.isMeta || bashCommandTagKindOf(r) === "input") continue;
    let content = r.message.content;
    n.push({
      ...r,
      message: {
        ...r.message,
        content:
          typeof content === "string"
            ? vE(content)
            : content.map((h) => (h.type === "text" ? { ...h, text: vE(h.text) } : h)),
      },
    });
  }
  return n;
}
//@ chunk-tyg7f3ek.js:424555-424629 placement
function vE(e) {
  try {
    return cleanShellOutputForViewers(e, { keepColors: !0 });
  } catch (error) {
    return (logError(error), "");
  }
}
//@ chunk-tyg7f3ek.js:424629-424760 placement
function answeredMergedUuids(e, n, r = []) {
  try {
    return n?.flatMap((s) =>
      mergedMessageUuids(trimTrailingAfterTurn(e, s), s).filter(
        (h) => h === s || r.includes(h) || isTurnAnswered(e, h),
      ),
    );
  } catch (error) {
    return (logError(error), n);
  }
}
//@ chunk-tyg7f3ek.js:424760-425012 placement
function stampMergedSends(e, n, r, s, h) {
  if (!r?.length && s === void 0 && h === void 0) return;
  try {
    let found = e.find((S) => S.uuid === n);
    if (found?.type !== "user") return;
    if (r?.length) found.mergedSendUuids = [...r];
    if (s !== void 0) found.clientPlatform = s;
    if (h !== void 0) found.turnAttributionKey = h;
  } catch (error) {
    logError(error);
  }
}
/**
 * 把本轮新增消息写入转录（处理折叠副本、压缩边界、墓碑删除与 parentUuid 链）。
 */
//@ chunk-tyg7f3ek.js:425012-430132 placement
function persistTurnRows({
  conversation: conversation,
  messages: messages,
  persistSession: persistSession,
  storageV5: storageV5,
  holdsLoadersRows: holdsLoadersRows = !1,
  foldCopies: foldCopies,
  neverParentUuid: neverParentUuid,
}) {
  let R = 0,
    w,
    P = messages.length,
    L = null,
    q = new Set(),
    x = 0,
    weakSet = new WeakSet(),
    Z = [],
    re,
    Ae,
    Ue;
  function ce() {
    return Ee("all");
  }
  function nt() {
    if (Z.length === 0 && Ae === void 0) {
      let ut = Ue;
      ((Ue = void 0), ie(() => ut?.()));
    }
  }
  function ie(ut) {
    try {
      return ut();
    } catch (error) {
      logError(error);
      return;
    }
  }
  function Se(ut, Yt) {
    ie(() => {
      if (foldCopies.foldCopyFate(Yt) === "wait") {
        if ((Z.push({ row: ut, sourceUuid: Yt }), persistSession)) Ue ??= registerTranscriptExitDrain(ce);
      }
    });
  }
  function me(ut) {
    if (Z.length === 0) return !1;
    let Yt = Z;
    ((Z = []), clearTimeout(re), (re = void 0));
    let nn = ie(() => foldCopies.requeueWindowLeftMs());
    for (let kn of Yt)
      if (
        ie(() => {
          if (ut === "compaction") return !0;
          let foldCopyFate = foldCopies.foldCopyFate(kn.sourceUuid);
          if (foldCopyFate === "wait" && ut === "decidable") Z.push(kn);
          else if (foldCopyFate === "drop") pn(kn.row.uuid);
          else foldCopies.foldCopyWritten(kn.sourceUuid);
          return !0;
        }) === void 0
      )
        ie(() => foldCopies.foldCopyWritten(kn.sourceUuid));
    if (Z.length > 0 && nn !== void 0) ((re = setTimeout(Ee, nn + 10)), re.unref());
    return Z.length < Yt.length;
  }
  function Me(ut) {
    let Yt = Ae === void 0 ? We(ut) : Ae.then(() => We(ut)),
      nn = Yt.then(
        () => {},
        () => {},
      ).finally(() => {
        if (Ae === nn) ((Ae = void 0), nt());
      });
    return ((Ae = nn), Yt);
  }
  function Ee(ut = "decidable") {
    return (
      ie(() => {
        if (me(ut) && persistSession) Me(!1).catch(logError);
      }),
      nt(),
      Ae ?? Promise.resolve()
    );
  }
  async function He(ut, Yt, nn) {
    let kn = readAtTranscriptEntry(ut, nn);
    return await inTranscriptCallOrder(() => recordTranscript(ut, void 0, Yt, nn, storageV5, kn));
  }
  function Xe(ut = !1) {
    return Ae === void 0 && Z.length === 0 ? We(ut) : Me(ut);
  }
  function We(ut) {
    me(ut ? "all" : "decidable");
    let Yt = R,
      nn = transcriptCursorEnd(messages, Math.max(Yt, P), !ut);
    for (let { row: row } of Z) {
      let index = messages.lastIndexOf(row);
      if (index !== -1) {
        nn = Math.min(nn, index);
        break;
      }
    }
    let kn = $r(Yt, Dr(Yt, nn));
    if (!ut) nn = kn;
    if (Yt >= nn) return (lookMcpTaskEndings(messages, nn)?.(!0), Promise.resolve(null));
    let En = Yt === 0 && nn === messages.length ? messages : messages.slice(Yt, nn),
      Mr = neverParentUuid === void 0 ? En : En.filter((Fr) => Fr.uuid !== neverParentUuid);
    R = nn;
    let Pn = w;
    w = Lt(Mr) ?? w;
    let oo = lookMcpTaskEndings(messages, nn),
      No = He(Mr, Pn, St);
    return oo === void 0
      ? No
      : No.then(
          (Fr) => (oo(!0), Fr),
          (Fr) => {
            throw (oo(!1), Fr);
          },
        );
  }
  function St() {
    return (collectReplIds(messages.slice(x), q), (x = messages.length), q);
  }
  function wt() {
    ((q = new Set()), (x = 0));
  }
  function Lt(ut) {
    return ut.findLast(
      (Yt) => isLoggableMessage(Yt) && isChainParticipant(Yt) && !OB(Yt.uuid) && Yt.uuid !== neverParentUuid,
    )?.uuid;
  }
  function pn(ut) {
    let lastIndex = messages.findLastIndex((kn) => kn.uuid === ut);
    if (lastIndex !== -1) {
      let kn = messages[lastIndex];
      if ((messages.splice(lastIndex, 1), wt(), R > lastIndex)) {
        if ((R--, w === ut && !hasSessionMirror())) w = Lt(messages.slice(0, lastIndex)) ?? w;
        if (persistSession) {
          logEvent("tengu_tombstone_persisted_removal", { message_type: fromEnum(kn.type) });
          let En = getSessionId();
          inTranscriptCallOrder(async () => {
            removeTranscriptMessage(ut, storageV5, En).catch(logError);
          });
        }
      }
      if (P > lastIndex) P--;
    }
    let lastIndex_2 = conversation.findLastIndex((kn) => kn.uuid === ut);
    if (lastIndex_2 !== -1) conversation.splice(lastIndex_2, 1);
  }
  function _n(ut) {
    let Yt = ut;
    try {
      let preservedMessages = ut.compactMetadata.preservedMessages;
      if (!preservedMessages) return ut;
      let kn = new Map(conversation.map((Fr) => [Fr.uuid, Fr])),
        filtered = preservedMessages.uuids.filter((uuid) => kn.has(uuid));
      if (filtered.length === preservedMessages.uuids.length) return ut;
      let { preservedSegment: preservedSegment, ...Pn } = ut.compactMetadata;
      Yt = {
        ...ut,
        compactMetadata: {
          ...Pn,
          ...(preservedSegment &&
            filtered.length > 0 && {
              preservedSegment: { ...preservedSegment, headUuid: filtered[0], tailUuid: filtered.at(-1) },
            }),
          preservedMessages: { ...preservedMessages, uuids: filtered },
        },
      };
      let oo = new Set(),
        No = new Set();
      for (let Fr of filtered) {
        let Xo = kn.get(Fr);
        if (Xo?.type !== "assistant" && Xo?.type !== "user") continue;
        let fi = Xo.message?.content;
        for (let _i of Array.isArray(fi) ? fi : [])
          if (_i?.type === "tool_use") oo.add(_i.id);
          else if (_i?.type === "tool_result") No.add(_i.tool_use_id);
      }
      logEvent("tengu_compact_preserved_not_in_conversation", {
        listed: preservedMessages.uuids.length,
        dropped: preservedMessages.uuids.length - filtered.length,
        tailDropped: !kn.has(preservedMessages.uuids.at(-1)),
        unpairedToolBlocksRemaining:
          count([...oo], (Fr) => !No.has(Fr)) + count([...No], (Fr) => !oo.has(Fr)),
      });
    } catch (error) {
      logError(error);
    }
    return Yt;
  }
  async function Mn(ut) {
    (me("compaction"), await Ae);
    let Yt =
      ut.compactMetadata.preservedMessages?.uuids.at(-1) ?? ut.compactMetadata.preservedSegment?.tailUuid;
    if (!Yt) return;
    let lastIndex = conversation.findLastIndex((kn) => kn.uuid === Yt);
    if (lastIndex === -1) return;
    (await He(conversation.slice(0, lastIndex + 1), void 0, void 0), (R = 0), (w = void 0));
  }
  function jn(ut) {
    let preservedMessages = ut.compactMetadata.preservedMessages,
      mapped = (preservedMessages?.allUuids ?? preservedMessages?.uuids ?? [])
        .map((Mr) => conversation.find((Pn) => Pn.uuid === Mr))
        .filter((Mr) => Mr !== void 0)
        .map(getTokenCountFromUsage_4);
    L =
      preservedMessages && mapped.length > 0
        ? { preserved: mapped, anchorUuid: preservedMessages.anchorUuid }
        : null;
    let kn = conversation.length - 1;
    if (kn > 0) conversation.splice(0, kn);
    Jn(ut.uuid);
    let En = messages.length - 1;
    if (En > 0) (messages.splice(0, En), wt(), (R = messages.length), (P = messages.length));
  }
  function Jn(ut) {
    if (L !== null && L.anchorUuid === ut) (conversation.push(...L.preserved), (L = null));
  }
  function ze() {
    if (L === null) return;
    (logEvent("tengu_compact_preserved_unanchored", { preservedCount: L.preserved.length }),
      conversation.push(...L.preserved),
      (L = null));
  }
  function Dr(ut, Yt) {
    let nn = -1;
    for (let kn = ut; kn < Yt; kn++) {
      let En = messages[kn];
      if (weakSet.has(En)) {
        if (nn === -1) nn = kn;
      } else if (isCompactBoundaryMessage(En)) nn = -1;
      else if (En.type === "assistant" || En.type === "user")
        if (nn === -1 || !isToolResultMessage(En)) nn = -1;
        else (messages.splice(kn, 1), messages.splice(nn, 0, En), wt(), nn++);
    }
    return nn === -1 ? Yt : nn;
  }
  function $r(ut, Yt) {
    if (!holdsLoadersRows) return Yt;
    let nn = Yt,
      kn = !1,
      En = !1;
    for (let Mr = Yt - 1; Mr >= ut; Mr--) {
      let Pn = messages[Mr],
        oo = isStopInterruptionRow(Pn);
      if (
        (Pn.type === "assistant" && (Pn.isApiErrorMessage !== !0 || Mr < P)) ||
        isCompactBoundaryMessage(Pn) ||
        (Pn.type === "user" &&
          (Pn.isMeta !== !0 || (Pn.promptSource !== void 0 && !isInterruptMarkerRow(Pn))) &&
          !oo &&
          !weakSet.has(Pn) &&
          !isTurnCompanion(Pn) &&
          !isQueueTranscriptOnlyUserMessage(Pn) &&
          (Pn.promptSource !== void 0 || localCommandTagKindOf(Pn) === void 0))
      )
        break;
      ((kn ||= oo), (En ||= isInterruptMarkerRow(Pn)), (nn = Mr));
    }
    return kn || En ? nn : Yt;
  }
  function $n(ut) {
    for (let Yt of ut) weakSet.add(Yt);
    messages.push(...ut);
  }
  return {
    record: Xe,
    appendHostRows: $n,
    isHostRow: (ut) => weakSet.has(ut),
    evict: pn,
    holdFoldCopy: Se,
    settleFoldCopies: Ee,
    dropPreservedRowsNotInConversation: _n,
    flushBeforeCompactBoundary: Mn,
    applyCompactBoundary: jn,
    settlePreservedTail: Jn,
    flushUnanchoredPreservedTail: ze,
  };
}
//@ chunk-tyg7f3ek.js:430132-430390 placement
function takeShownAsStoredMark(e, n) {
  try {
    return (delete e.shownAsStoredIn, e.isVirtual === !0 || e.handedOff === !0 ? void 0 : n?.());
  } catch (error) {
    logError(
      Error(
        "could not ask the host for the mark of a reply that is shown as stored: a later worker will not send this reply again",
        { cause: error },
      ),
    );
    return;
  }
}
//@ chunk-tyg7f3ek.js:430390-430560 placement
function markShownAsStored(e, n, r) {
  try {
    if (!r) e.shownAsStoredIn = n;
  } catch (error) {
    logError(
      Error("could not mark a reply as shown as stored: a later worker will not send this reply again", {
        cause: error,
      }),
    );
  }
}
//@ chunk-tyg7f3ek.js:430560-430575 placement
var OE = 0.03125;
//@ chunk-tyg7f3ek.js:430575-430877 placement
function sampleQueueLatency(e) {
  try {
    if (
      !isVsCodeTopSession() ||
      Math.random() >= OE ||
      e.enqueuedWallMs === void 0 ||
      e.previousTurnEndedWallMs === void 0 ||
      e.enqueuedWallMs < e.previousTurnEndedWallMs
    )
      return;
    logEvent("tengu_sdk_time_to_init", {
      waited_ms: Math.max(0, e.startWallMs - e.enqueuedWallMs),
      duration_ms: e.startToInitMs,
      sample_rate: OE,
    });
  } catch (error) {
    logError(error);
  }
}
//@ chunk-tyg7f3ek.js:430877-430897 placement
var nj = 7000,
  rj = 3000;
//@ chunk-tyg7f3ek.js:430897-431139 placement
async function runWithDeadline(e, n, r) {
  let s = Error("aborted");
  try {
    let h = await withDeadline(
      raceWithAbortSignal(Promise.resolve().then(e), r, () => s).then((y) => ({ value: y })),
      n,
    );
    return h ? { how: "done", value: h.value } : { how: "late" };
  } catch (error) {
    return error === s ? { how: "aborted" } : { how: "failed", error: error };
  }
}
/**
 * 等待设备桥（device bridge）上的指定工具出现：轮询 tools/list，可在池中替换为新的工具定义。
 */
//@ chunk-tyg7f3ek.js:431139-433255 placement
async function waitForDeviceBridgeTool(e, n, r, s, h = {}) {
  let y = h.pollMs ?? nj,
    S = h.lookMs ?? rj,
    { signal: signal } = r.abortController,
    now = Date.now(),
    P = await waitForMcpToolServer(e, n, r, { connectedGraceMs: y });
  function L(x, G = {}) {
    let Z = Date.now() - now;
    return (
      logForDebugging(`waitForDeviceBridgeTool: the wait for "${e}" ended as ${x} after ${Z}ms`),
      { ...P, ...G, waitedMs: Z, aborted: signal.aborted, bridgeEnd: x }
    );
  }
  let q = () => L("aborted", { tool: void 0, tools: n });
  if (P.aborted || signal.aborted) return q();
  if (P.tool) return L("in_pool");
  if (P.serverState !== "connected") return L(P.serverState === "unknown" ? "threw" : "not_connected");
  try {
    let x = lGt(e, r.options.toolAliases),
      G = () => findLongestPrefixClients(x, currentMcpClients(r)),
      Z = (Xe) => L(Xe, { serverState: getMcpServerBaseUrlFromToolName(G()) }),
      found = G().find((Xe) => Xe.type === "connected");
    if (!found) return Z("not_connected");
    let Ae = await runWithDeadline(() => listMcpTools(found, { signal: signal, timeout: S }), S, signal);
    if (Ae.how === "aborted" || signal.aborted) return q();
    if (Ae.how === "late") return Z("look_timed_out");
    if (Ae.how === "failed")
      return (
        logForDebugging(
          `waitForDeviceBridgeTool: tools/list on the device bridge failed: ${describeConnectError(Ae.error, found.config)}`,
          { level: "warn" },
        ),
        Z("look_failed")
      );
    let tools = Ae.value.tools,
      ce =
        Array.isArray(tools) &&
        tools.some(
          (Xe) =>
            typeof Xe === "object" &&
            Xe !== null &&
            "name" in Xe &&
            typeof Xe.name === "string" &&
            buildMcpToolName(found.name, Xe.name) === x,
        ),
      nt = officeBridgeListingState(Ae.value),
      ie = nt === "stub" ? "stub" : nt === "live" ? "live_without_tool" : "unmarked_without_tool";
    if (!ce && (nt === "stub" || !Ae.value.nextCursor)) return Z(ie);
    let Se,
      me = await runWithDeadline(
        () =>
          refreshMcpServerTools(
            found,
            (Xe, We) => {
              Se = swapMcpServerTools(Xe, We, found.config);
            },
            s,
          ),
        S,
        signal,
      );
    if (me.how === "aborted" || signal.aborted) return q();
    let Me = r.options.refreshTools?.() ?? n,
      Ee = findToolByName(Me, e, r.options.toolAliases);
    if (Ee) return L("after_look", { tool: Ee, tools: Me });
    logForDebugging(
      `waitForDeviceBridgeTool: refreshing the device bridge's tools did not bring "${e}" (${me.how === "failed" ? describeConnectError(me.error, found.config) : me.how === "done" ? `${me.value.status}, ${Se === void 0 ? "nothing swapped" : Se ? "swapped in" : "the swap was refused"}` : "not in time"})`,
      { level: "warn" },
    );
    let He = me.how === "done" && me.value.status === "refreshed" ? me.value.newTools : void 0;
    if (ce || (He && findToolByName(He, e, r.options.toolAliases))) return Z("listed_not_pooled");
    if (He) return Z(ie);
    return Z(me.how === "late" ? "look_timed_out" : "look_failed");
  } catch (error) {
    return (logError(error), L("threw", { tool: void 0, tools: n, serverState: "unknown" }));
  }
}
//@ chunk-tyg7f3ek.js:433255-434504 placement
function resolveDeferredToolUse({
  behavior: behavior,
  outcome: outcome,
  toolUseID: toolUseID,
  assistantMessage: assistantMessage,
  messages: messages,
  turnStartTools: turnStartTools,
  toolAliases: toolAliases,
}) {
  let R = (G) =>
      toolUseID !== void 0 && G.type === "user" && Array.isArray(G.message?.content)
        ? G.message.content.find((Z) => Z?.type === "tool_result" && Z.tool_use_id === toolUseID)
        : void 0,
    last = messages.findLast((G) => R(G) !== void 0),
    P = last && R(last),
    found = h9t.find((G) => last?.type === "user" && G === last.toolDenialKind),
    q =
      toolUseID !== void 0 && Array.isArray(assistantMessage?.message?.content)
        ? assistantMessage.message.content.find((G) => G?.type === "tool_use" && G.id === toolUseID)
        : void 0,
    x = q && qS(outcome.toolWait?.tools ?? turnStartTools, q.name, toolAliases);
  return {
    answer_behavior_kind: behavior === "allow" || behavior === "deny" ? behavior : "other",
    answer_outcome_kind: outcome.reExecuted ? "applied" : outcome.reason,
    call_result_kind:
      P?.type !== "tool_result"
        ? "none"
        : (found ?? (!P.is_error ? "ok" : outcome.callStarted ? "error" : "error-not-started-here")),
    call_concurrency_kind:
      q === void 0
        ? "no_call"
        : x === void 0
          ? "tool_not_loaded"
          : (() => {
                try {
                  let safeParse = x.inputSchema.safeParse(q.input);
                  return safeParse.success && x.isConcurrencySafe(safeParse.data);
                } catch {
                  return !1;
                }
              })()
            ? "safe"
            : "unsafe",
    call_is_for_device_bridge:
      typeof q?.name === "string" && mcpInfoFromString(q.name)?.serverName === REMOTE_DEVICES,
    waited_for_tool_ms: outcome.toolWait?.waitedMs ?? 0,
    device_bridge_wait_end_kind: outcome.toolWait?.bridgeEnd ?? "did_not_wait_for_computer",
    note_stored: outcome.noteStored === !0,
    card_step_again_kind: (outcome.reExecuted ? outcome.cardStep : void 0) ?? "not_run",
  };
}
//@ chunk-tyg7f3ek.js:434504-434844 placement
function countAttachmentRowsAtTail(e) {
  try {
    return count(
      e.slice(
        e.findLastIndex(
          (n) =>
            n.type === "assistant" ||
            (n.type === "user" &&
              Array.isArray(n.message.content) &&
              n.message.content[0]?.type === "tool_result"),
        ) + 1,
      ),
      (n) => n.type === "attachment" && attachmentToMessages(n).messages.length > 0,
    );
  } catch (error) {
    return (
      logError(
        new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
          `attachmentRowsAtTail threw; reporting 0: ${errorMessage(error)}`,
          "attachmentRowsAtTail threw",
        ),
      ),
      0
    );
  }
}
//@ chunk-tyg7f3ek.js:434844-435009 placement
function turnContinuationKind({
  orphanedPermission: orphanedPermission,
  handedOffTurn: handedOffTurn,
  deferredToolUse: deferredToolUse,
}) {
  if (orphanedPermission) return "orphaned_permission";
  if (handedOffTurn) return "turn_handoff";
  return deferredToolUse ? "deferred_tool_use" : "none";
}
/**
 * headless 轮次主体：处理 orphaned permission / turn handoff / 延迟工具调用，刷新转录、放置文件，然后运行查询并产出 SDK 消息。
 */
//@ chunk-tyg7f3ek.js:435009-440425 placement
async function* runHeadlessTurn({
  orphanedPermission: orphanedPermission,
  handedOffTurn: handedOffTurn,
  beginTranscriptFlush: beginTranscriptFlush,
  awaitStagedFiles: awaitStagedFiles,
  placeFilesByName: placeFilesByName,
  placeCarriedWrites: placeCarriedWrites,
  handoffRelay: handoffRelay,
  deferredToolUse: deferredToolUse,
  hasPrompt: hasPrompt,
  tools: tools,
  mutableMessages: mutableMessages,
  processUserInputContext: processUserInputContext,
  canUseTool: canUseTool,
  answers: answers,
  persistSession: persistSession,
  earlyResult: earlyResult,
  onHandedOffCallsRan: onHandedOffCallsRan,
  onOrphanedAnswerSettled: onOrphanedAnswerSettled,
}) {
  let ce = mutableMessages.length,
    nt = () =>
      deferredToolUse !== void 0 &&
      (orphanedPermission?.denyIsRefusal === !0 || isPermissionCardHoldEnabled()) &&
      hasToolResultAfter(mutableMessages, ce, deferredToolUse.toolUseID),
    ie = () =>
      buildResultMessage({
        startedAt: earlyResult.startedAt,
        common: {
          is_error: !1,
          duration_api_ms: 0,
          num_turns: 0,
          stop_reason: null,
          session_id: getSessionId(),
          total_cost_usd: getTotalCostUSD(),
          usage: earlyResult.usage,
          modelUsage: getModelUsage(),
          permission_denials: earlyResult.permissionDenials,
          fast_mode_state: getFastModeState(earlyResult.mainLoopModel, earlyResult.fastMode),
          fast_mode_disabled_reason:
            getFastModeUnavailableReasonCode() ??
            getFastRejectedReason(earlyResult.mainLoopModel, earlyResult.fastMode) ??
            void 0,
          origin: earlyResult.origin,
          subagent_stats: buildFileHistorySnapshotChain(processUserInputContext.session),
          safety_stops: getSafetyStops(),
        },
        variant: {
          subtype: "success",
          result: "",
          ...earlyResult.sendEcho,
          ...earlyResult.resumeReasonStamp,
        },
      }),
    Se = () =>
      buildResultMessage({
        startedAt: earlyResult.startedAt,
        common: {
          is_error: !0,
          duration_api_ms: 0,
          num_turns: 0,
          stop_reason: null,
          session_id: getSessionId(),
          total_cost_usd: getTotalCostUSD(),
          usage: earlyResult.usage,
          modelUsage: getModelUsage(),
          permission_denials: earlyResult.permissionDenials,
          terminal_reason: "aborted_tools",
          fast_mode_state: getFastModeState(earlyResult.mainLoopModel, earlyResult.fastMode),
          fast_mode_disabled_reason:
            getFastModeUnavailableReasonCode() ??
            getFastRejectedReason(earlyResult.mainLoopModel, earlyResult.fastMode) ??
            void 0,
          origin: earlyResult.origin,
          subagent_stats: buildFileHistorySnapshotChain(processUserInputContext.session),
          safety_stops: getSafetyStops(),
        },
        variant: {
          subtype: "error_during_execution",
          errors: ["turn_handoff: the turn was stopped before any of its calls ran"],
          ...(earlyResult.sendEcho ?? { user_message_uuid: void 0 }),
          ...earlyResult.resumeReasonStamp,
        },
      });
  if (orphanedPermission) {
    (V2e([orphanedPermission]), s5r());
    let Ee = lastUserAfterAssistant(mutableMessages),
      He = yield* handleOrphanedPermission(
        orphanedPermission,
        tools,
        canUseTool,
        mutableMessages,
        processUserInputContext,
        waitForDeviceBridgeTool,
        answers,
      );
    if (!He.reExecuted) dropCcrTurnId();
    try {
      let Lt = resolveDeferredToolUse({
        behavior: orphanedPermission.permissionResult?.behavior,
        outcome: He,
        toolUseID: orphanedPermission.permissionResult?.toolUseID,
        assistantMessage: orphanedPermission.assistantMessage,
        messages: mutableMessages,
        turnStartTools: tools,
        toolAliases: processUserInputContext.options.toolAliases,
      });
      (logForDiagnosticsNoPII("info", "cli_orphan_answer_settled", Lt), onOrphanedAnswerSettled?.(Lt));
    } catch (error) {
      logError(error);
    }
    let Xe = {
        waited_ms: He.toolWait?.waitedMs ?? 0,
        server_state: fromEnumOpt(He.toolWait?.serverState),
        server_state_at_start: fromEnumOpt(He.toolWait?.initialServerState),
        device_bridge_wait_end: fromEnumOpt(He.toolWait?.bridgeEnd),
        resumes_interrupted_turn: orphanedPermission.resumesInterruptedTurn === !0,
      },
      We = orphanedPermission.permissionResult?.behavior,
      St = He.reExecuted ? void 0 : He.missingTool,
      wt = {
        answer_behavior: fromEnum(We === "allow" || We === "deny" ? We : "other"),
        tool_departure_cause: fromEnumOpt(St?.departureCause),
        server_transport: fromEnumOpt(St?.serverTransport),
        server_is_device_bridge: St?.serverIsDeviceBridge,
        server_tools_list_failed: St?.serverToolsListFailed,
        server_tools_in_pool: fromEnumOpt(St?.serverToolsInPool),
      };
    if (He.reExecuted)
      logEvent("tengu_orphaned_permission_applied", { found_on_reread: He.toolWait !== void 0, ...Xe });
    if (!He.reExecuted && He.reason === "closed_unrun")
      logEvent("tengu_orphaned_permission_closed_unrun", { ...Xe, ...wt });
    if (!He.reExecuted && He.reason !== "closed_unrun" && !hasPrompt && (!deferredToolUse || nt())) {
      if (He.reason === "aborted") return !1;
      let Lt = { reason: fromEnum(He.reason), ...Xe, ...wt };
      if (orphanedPermission.resumesInterruptedTurn && !orphanedPermission.siblings?.length && Ee)
        return (
          logForDebugging(
            "Orphaned permission could not be applied; it stood in for the interrupted turn it was parked on, so the turn proceeds to the model on the interrupted prompt",
          ),
          logEvent("tengu_orphaned_permission_unapplied_turn_resumed", Lt),
          !1
        );
      return (
        logForDebugging(
          "Orphaned permission could not be applied, or left a served call unsettled, and the turn has no prompt: ending the turn without a model call",
        ),
        logEvent("tengu_orphaned_permission_unapplied_turn_end", Lt),
        yield ie(),
        !0
      );
    }
  }
  if (handedOffTurn) {
    (dropCcrTurnId(), s5r());
    let Ee = createTaskListCatchUp(
        processUserInputContext.session,
        handedOffTurn.messages,
        mutableMessages,
        processUserInputContext.storageV5,
      ),
      He = countAttachmentRowsAtTail(mutableMessages),
      Xe;
    try {
      Xe = yield* handleHandedOffTurn(
        handedOffTurn,
        tools,
        mutableMessages,
        processUserInputContext,
        canUseTool,
        beginTranscriptFlush,
        handoffRelay,
        async (We) => {
          try {
            await Ee.beforeRun();
          } finally {
            if (awaitStagedFiles)
              await hmn("resume_other", "resume_staged_files_wait", () => awaitStagedFiles(We));
            await placeFilesByName?.(handedOffTurn, We);
          }
        },
        placeCarriedWrites,
      );
    } finally {
      if (handoffRelay && handedOffTurn.relayMarker !== void 0 && handedOffTurn.kind !== "stopped")
        try {
          handoffRelay.noteHandoffMarkerFate(
            handedOffTurn.kind,
            Xe === void 0 ? "unfinished" : Xe.ran ? "ran" : Xe.reason,
          );
        } catch (error) {
          logError(error);
        }
    }
    if ((await Ee.catchUp(isHandoffTurnSettled(Xe)), Xe.ran)) onHandedOffCallsRan(Xe.contextLayers);
    if (
      (logEvent("tengu_turn_handoff_run", {
        ran: Xe.ran,
        reason: fromEnumOpt(Xe.ran ? void 0 : Xe.reason),
        kind: fromEnum(handedOffTurn.kind),
        tool_uses: handedOffTurn.toolUseIDs.length,
        carried_messages: handedOffTurn.messages.length,
        has_memory_context: handedOffTurn.memoryLine !== void 0,
        has_relay_marker: handedOffTurn.relayMarker !== void 0,
        attachment_rows_ahead: He,
      }),
      !Xe.ran &&
        (handedOffTurn.kind === "stopped" ||
          Xe.reason === "stopped_closed" ||
          Xe.reason === "stopped_unconfirmed"))
    )
      return (yield Se(), !0);
    if (!Xe.ran && Xe.reason === "history_appended") return (yield ie(), !0);
    if (!Xe.ran && !hasPrompt && !deferredToolUse) return (yield ie(), !0);
  }
  if (!deferredToolUse) return !1;
  (dropCcrTurnId(), clearContextKey(), s5r());
  let me = (Ee, He) =>
    buildResultMessage({
      startedAt: earlyResult.startedAt,
      common: {
        is_error: He,
        duration_api_ms: 0,
        num_turns: mutableMessages.length,
        stop_reason: He ? "tool_deferred_unavailable" : "tool_deferred",
        session_id: getSessionId(),
        total_cost_usd: getTotalCostUSD(),
        usage: earlyResult.usage,
        modelUsage: getModelUsage(),
        permission_denials: earlyResult.permissionDenials,
        ...(He && { terminal_reason: "tool_deferred_unavailable" }),
        fast_mode_state: getFastModeState(earlyResult.mainLoopModel, earlyResult.fastMode),
        fast_mode_disabled_reason:
          getFastModeUnavailableReasonCode() ??
          getFastRejectedReason(earlyResult.mainLoopModel, earlyResult.fastMode) ??
          void 0,
        origin: earlyResult.origin,
        subagent_stats: buildFileHistorySnapshotChain(processUserInputContext.session),
        safety_stops: getSafetyStops(),
      },
      variant: {
        subtype: "success",
        result: "",
        ...((He || !hasPrompt) && earlyResult.sendEcho),
        ...((He || !hasPrompt) && earlyResult.resumeReasonStamp),
        deferred_tool_use: { id: Ee.toolUseID, name: Ee.toolName, input: Ee.toolInput },
      },
    });
  if (nt())
    return (
      logForDebugging(
        `Deferred tool resume: ${deferredToolUse.toolUseID} already has this turn's result; not run again`,
      ),
      !1
    );
  if (!qS(tools, deferredToolUse.toolName, processUserInputContext.options.toolAliases))
    return (
      logForDebugging(
        `Deferred tool resume: tool '${deferredToolUse.toolName}' is no longer available (MCP server disconnected or tool removed)`,
        { level: "warn" },
      ),
      yield me(deferredToolUse, !0),
      !0
    );
  let Me = yield* resumeDeferredToolUse(
    deferredToolUse,
    canUseTool,
    mutableMessages,
    processUserInputContext,
  );
  if (!Me) return !1;
  if (persistSession)
    await recordTranscript(mutableMessages, void 0, void 0, void 0, processUserInputContext.storageV5);
  return (yield me(Me, !1), !0);
}
//@ chunk-tyg7f3ek.js:440425-440628 placement
async function loadSkillsAndPlugins(e) {
  headlessProfilerCheckpoint("before_skills_plugins");
  let startTime = performance.now(),
    results = await Promise.all([getSlashCommandToolSkills(gl(), e), loadAllPluginsCacheOnly(e)]);
  return (
    Br("qe_plugin_skills_load_ms", performance.now() - startTime, startTime),
    headlessProfilerCheckpoint("after_skills_plugins"),
    results
  );
}
//@ chunk-tyg7f3ek.js:440628-440808 placement
function logShouldQueryResolved({
  shouldQuery: shouldQuery,
  fromUserInput: fromUserInput,
  fromOptions: fromOptions,
}) {
  (headlessProfilerCheckpoint("system_message_yielded"),
    logForDiagnosticsNoPII("info", "cli_ask_should_query_resolved", {
      should_query: shouldQuery,
      from_user_input: fromUserInput,
      from_options: fromOptions,
    }));
}
//@ chunk-tyg7f3ek.js:440808-440872 placement
var getCoordinatorUserContext_2 = require("./chunk-yxywkh50.js").getCoordinatorUserContext;
//@ chunk-tyg7f3ek.js:440872-441122 placement
function resolveTurnModelAndThinking({
  userSpecifiedModel: userSpecifiedModel,
  permissionMode: permissionMode,
  thinkingConfig: thinkingConfig,
}) {
  let s =
      userSpecifiedModel &&
      (isExemptDefaultResolvingPick(userSpecifiedModel) || isModelAllowed(userSpecifiedModel))
        ? parseUserSpecifiedModel(userSpecifiedModel)
        : getMainLoopModel(),
    h = getRuntimeMainLoopModel({ permissionMode: permissionMode, mainLoopModel: s });
  return {
    mainLoopModel: s,
    runtimeModel: h,
    thinkingConfig: thinkingConfig
      ? thinkingConfig
      : isBetaHeaderAllowed() !== !1
        ? { type: "adaptive" }
        : { type: "disabled" },
  };
}
/**
 * headless 轮次的系统提示组装：自定义/追加提示、追加头、动态段与 cache breaker。
 */
//@ chunk-tyg7f3ek.js:441122-441978 placement
async function buildHeadlessSystemPrompt({
  session: session,
  tools: tools,
  runtimeModel: runtimeModel,
  customSystemPrompt: customSystemPrompt,
  appendSystemPrompt: appendSystemPrompt,
  appendSystemPromptHead: appendSystemPromptHead,
  excludeDynamicSections: excludeDynamicSections,
  cacheBreakerPhrase: cacheBreakerPhrase,
  mcpClients: mcpClients,
  storageV5: storageV5,
  credentials: credentials,
}) {
  headlessProfilerCheckpoint("before_getSystemPrompt");
  let startTime = performance.now(),
    {
      defaultSystemPrompt: defaultSystemPrompt,
      userContext: userContext,
      systemContext: systemContext,
    } = await fetchSystemPromptParts({
      session: session,
      tools: tools,
      mainLoopModel: runtimeModel,
      customSystemPrompt: customSystemPrompt,
      excludeDynamicSections: excludeDynamicSections,
      cacheBreakerPhrase: cacheBreakerPhrase,
      storageV5: storageV5,
      credentials: credentials,
    });
  (Br("qe_system_prompt_ms", performance.now() - startTime, startTime),
    headlessProfilerCheckpoint("after_getSystemPrompt"));
  let re = {
      ...userContext,
      ...getCoordinatorUserContext_2(
        mcpClients,
        TOOL_CATALOG.getAllBaseTools,
        isScratchpadEnabled() ? (getScratchpadDir() ?? void 0) : void 0,
        tools,
      ),
    },
    Ae =
      customSystemPrompt !== void 0 && hasAutoMemPathOverride()
        ? await loadMemoryPrompt(getPromptModel(runtimeModel))
        : null,
    Ue = withCliSections(baseSystemPromptOf(customSystemPrompt, defaultSystemPrompt), {
      tools: tools,
      memoryMechanicsPrompt: Ae,
      appendSystemPrompt: void 0,
    }),
    ce = appendSystemPromptHead
      ? renderAppendPromptHead(Ue, appendSystemPrompt, appendSystemPromptHead, shouldUseGlobalCacheScope())
      : void 0,
    nt = ce ? ce.append : appendSystemPrompt;
  return {
    systemPrompt: asSystemPrompt([...(ce ? ce.base : Ue), ...(nt ? [nt] : [])]),
    userContext: re,
    systemContext: systemContext,
  };
}
//@ chunk-tyg7f3ek.js:441978-442046 placement
function lj(e) {
  try {
    return njn() ? void 0 : declaredAbsoluteAdditionalDirectories(e);
  } catch (error) {
    logError(error);
    return;
  }
}
/**
 * 组装 SDK system/init 消息：工具、MCP 服务器、模型、权限模式、命令、agents、skills、插件、快速模式等。
 */
//@ chunk-tyg7f3ek.js:442046-443633 placement
async function buildSdkInitMessage({
  session: session,
  tools: tools,
  mcpClients: mcpClients,
  model: model,
  readSessionEffort: readSessionEffort,
  permissionMode: permissionMode,
  commands: commands,
  agents: agents,
  skills: skills,
  plugins: plugins,
  fastMode: fastMode,
  proactivityState: proactivityState,
  capabilities: capabilities,
  messagesInView: messagesInView,
}) {
  if ((await getAutoMemPathState().warmCanonicalWcRoot(), getPlatform() === "windows"))
    await getCachedPowerShellPath();
  let startTime = performance.now(),
    re = isTransportBacked(session),
    Ae = () => ({
      redactsWhatItPersists: re,
      isRemoteTransport: transportStateByHost.of(session).active?.isRemoteTransport() === !0,
      sessionWriters: transportStateByHost.of(session).active?.sessionWriters(),
    }),
    Ue = buildSystemInitMessage({
      ...(re ? buildRemoteSystemInitFields() : buildSystemInitFields()),
      tools: tools,
      mcpClients: mcpClients
        .filter((ce) => !r1(ce))
        .map((ce) => ({ name: ce.name, type: ce.type, source: mcpServerSource(ce.name, ce.config) })),
      model: model,
      permissionMode: permissionMode,
      proactivity: proactivityStateStub(proactivityState),
      ...{},
      commands: mergeClients_2(commands),
      agents: agents,
      skills: skills,
      plugins: re ? [] : plugins.enabled,
      additionalDirectories: re ? void 0 : lj(proactivityState.toolPermissionContext),
      pluginErrors: re
        ? []
        : [...plugins.errors, ...fqs(session)].filter(isMarketplacePluginError).map((ce) => {
            let nt = pluginNameOfError(ce);
            return {
              plugin: ce.source,
              type: ce.type,
              message: pluginErrorText(ce),
              ...(nt !== void 0 && { path: nt }),
            };
          }),
      mcpServerErrors: re ? [] : getSkippedDynamicServers(),
      pluginWarnings: re
        ? []
        : plugins.warnings
            .filter((warning) => hasMarketplaceAlias(warning.source))
            .map((ce) => ({ plugin: ce.source, type: ce.type, message: pluginWarningText(ce) })),
      fastModeState: getFastModeState(model, fastMode),
      fastModeDisabledReason:
        getFastModeUnavailableReasonCode() ?? getFastRejectedReason(model, fastMode) ?? void 0,
      perTurnEffortActive: x3s(model),
      ultrathinkAvailable: P3s(model, readSessionEffort),
      viewMode: viewTeammateOutput(),
      capabilities: capabilities ?? [
        ...RLs,
        ...(transportStateByHost.of(session).active?.commandLifecycleForwarderInstalled === !0
          ? [LIFECYCLE_WAKEUP_SOURCE_V1]
          : []),
        ...(transportStateByHost.of(session).active?.isRemoteTransport() === !0
          ? [TASK_LIST_RESTORE_V1]
          : []),
        ...(TASK_LIST_HANDOFF_STATE.peek(session)?.honoured === !0 ? [TASK_LIST_RESTORED_V1] : []),
        ...queuedNotificationCapabilities(tools, session, messagesInView),
        ...(sessionNoticesCapability(session, permissionMode) ? [SESSION_NOTICES] : []),
        ...sdkMcpCapabilities(transportStateByHost.of(session).active),
        ...(re ? [] : [MCP_READ_RESOURCE_V1]),
        ...(re ? [] : [MCP_TOOL_UI_META_V1]),
        ...uiSurfaceCapabilities(Ae),
        ...uiHookedCapabilities(Ae),
        ...(ejn(Ae()) ? [MCP_CALL_RESULT_NOT_FOR_MODEL_V1] : []),
        ...(isReadFileAsWrittenServed(session) ? [READ_FILE_AS_WRITTEN_V1] : []),
        ...CLs(),
        ...(shouldOfferLinuxSandboxHint(tools) ? [START_SHELL_TASK_V1] : []),
        ...[],
      ],
    });
  return (recordInitTiming(Ue, startTime), Ue);
}
/**
 * 构造 headless 模式的 ToolUseContext（文件历史、AppState 读写、SDK 状态回调等）。
 */
//@ chunk-tyg7f3ek.js:443633-446804 placement
function createHeadlessToolUseContext(e, n) {
  let { getAppState: getAppState, setAppState: setAppState, setSDKStatus: setSDKStatus, tools: tools } = e,
    S = () => getAppState().fileHistory,
    R = (w) => {
      setAppState((P) => {
        let L = reduceFileHistoryState(P.fileHistory, w, e.storageV5);
        if (L === P.fileHistory) return P;
        return { ...P, fileHistory: L };
      });
    };
  return {
    renderedSystemPrompt: e.renderedSystemPrompt,
    messages: n.messages,
    messageQueue: e.messageQueue,
    session: e.session,
    turnStartIndex: 0,
    primitiveToolGrant: e.primitiveToolGrant,
    ...(n.phase === "query" && { permissionLayers: n.permissionLayers }),
    setMessages: n.phase === "input" ? n.setMessages : () => {},
    applyMessageOp: n.phase === "input" ? n.applyMessageOp : () => {},
    onChangeAPIKey: () => {},
    onPermissionDenial: e.onPermissionDenial,
    requestDialog: e.requestDialog,
    permissionRelays: freeze_2_2,
    sessionState: e.sessionState,
    agentContext: mainAgentContext(),
    options: {
      commands: e.commands,
      debug: !1,
      tools: tools,
      toolCatalog: e.toolCatalog ?? TOOL_CATALOG,
      refreshTools: e.refreshTools,
      refreshMcpClients: e.refreshMcpClients,
      verbose: e.verbose,
      mainLoopModel: n.mainLoopModel,
      fallbackModel: e.fallbackModel,
      thinkingConfig: e.thinkingConfig,
      mcpClients: e.mcpClients,
      mcpResources: {},
      ideInstallationStatus: null,
      isNonInteractiveSession: !0,
      runQuery: query,
      customSystemPrompt: e.customSystemPrompt,
      ...(e.customSystemPrompt !== void 0 && { omitGitStatus: !0 }),
      appendSystemPrompt: e.appendSystemPrompt,
      planModeInstructions: e.planModeInstructions,
      systemPromptSnapshot: e.systemPromptSnapshot,
      appendSubagentSystemPrompt: e.appendSubagentSystemPrompt,
      toolAliases: e.toolAliases,
      excludeDynamicSections: e.excludeDynamicSections,
      agentDefinitions: { activeAgents: e.agents, allAgents: [], allowedAgentTypes: e.allowedAgentTypes },
      theme: resolveThemeSetting(resolveSetting("theme", "dark").value),
      maxBudgetUsd: e.maxBudgetUsd,
      messageClientPlatform: e.messageClientPlatform,
      messageInboundOrigin: e.messageInboundOrigin,
      forwardSubagentText: e.forwardSubagentText,
      ...(n.phase === "query" && { activeSkill: n.activeSkill }),
      requiresStructuredOutput: e.requiresStructuredOutput,
      autoCompactWindow: n.appState.autoCompactWindow,
      fastMode: n.appState.fastMode,
      cacheBreakerPhrase: n.appState.cacheBreakerPhrase,
      activeGoal: n.appState.activeGoal,
      ultraplanSessionUrl: n.appState.ultraplanSessionUrl,
    },
    getAppState: getAppState,
    setAppState: setAppState,
    ...createAppStateAccessors(getAppState, setAppState),
    queuedNotificationsRegistry: createNotificationDrain(getAppState, setAppState, e.session),
    taskRegistry: createTaskFramework(getAppState, setAppState),
    sessionHooksRegistry: e.sessionHooks,
    teammateColors: createColorAssigner(wIe(getAppState, setAppState, "teammateColors")),
    rootToolSurface: { tools: tools, mainLoopModel: n.mainLoopModel },
    abortController: n.abortController,
    readFileState: e.readFileState,
    nestedMemoryAttachmentTriggers: [],
    pendingNestedMemoryTriggers: e.pendingNestedMemoryTriggers,
    sessionEnvVars: e.sessionEnvVars,
    toolState: e.toolState,
    toolDecisions: new Map(),
    dynamicSkillDirTriggers: [],
    memorySelector: e.memorySelector,
    isolationLatch: e.isolationLatch,
    storageV5: e.storageV5,
    credentials: e.credentials,
    getFileHistoryState: S,
    applyFileHistoryOp: R,
    ...(n.phase === "input" && {
      makeFileHistorySnapshot: async (w) => {
        if (!n.persistSession) return;
        await fileHistoryMakeSnapshot(S, R, w, { preCheckpoint: !0 });
      },
    }),
    applyAttributionOp: (w) => {
      setAppState((P) => {
        let L = restoreAttributionStateFromSnapshots(P.attribution, w);
        if (L === P.attribution) return P;
        return { ...P, attribution: L };
      });
    },
    onCompactEvent: (w) => {
      if (w.type === "sdk_status") setSDKStatus?.(w.status, w.metadata);
    },
    onQueryEvent: (w) => {
      if (w.type === "apply_flag_settings") applySessionSettingsPatch(w.settings, setAppState);
      else if (w.type === "conversation_reset")
        (e.sessionState?.notifyConversationReset(), N7s(e.sessionState));
    },
  };
}
//@ chunk-tyg7f3ek.js:446804-446865 placement
function setCwdOrPin(e, n) {
  try {
    setCwd(e, n);
    return;
  } catch (error) {
    return pinMissingWorkingDirectory(error, n);
  }
}
//@ chunk-tyg7f3ek.js:446865-446943 placement
async function setCwdV5OrPin(e, n, r) {
  try {
    await setCwdV5(e, n, r);
    return;
  } catch (error) {
    return pinMissingWorkingDirectory(error, n);
  }
}
//@ chunk-tyg7f3ek.js:446943-447452 placement
function pinMissingWorkingDirectory(e, n) {
  if (!(e instanceof MissingWorkingDirectoryError)) throw e;
  (n.setCwd(e.path),
    setCwdForCallChain(e.path),
    logForDebugging(`[headless] working directory ${e.path} no longer exists; the turn starts pinned to it`, {
      level: "warn",
    }));
  let of = missingWorkingDirectoryPins.of(n);
  if (of.pinned) return;
  of.pinned = !0;
  try {
    logEvent("tengu_shell_set_cwd", { success: !1, missing_at_turn: !0 });
  } catch {}
  let s = isTransportBacked(n) ? "" : ` ${e.path}`;
  return informationalSystemMessage(
    createSystemMessage(
      `The session's working directory${s} no longer exists; shell commands cannot start there and relative file paths that use it will fail until it is restored.`,
      "warning",
    ),
  );
}
//@ chunk-tyg7f3ek.js:447452-447567 placement
function declaredToolSetFor(e, n, r) {
  return new DeclaredToolSet(
    e.filter((s) => n(s) && isToolDeclaredForTurn(s, e, r)),
    { only: new Map(), order: [], names: e.map((s) => s.name) },
  );
}
//@ chunk-tyg7f3ek.js:447567-447963 placement
function resolveToolSearchForTurn(e, n, r) {
  if (
    ((r.requestsHaveToolSearch ??=
      isToolSearchEnabledOptimistic() &&
      !isToolSearchPrecluded(r.model(), n) &&
      !toolSearchRejectedOn(getStickyBetas(), r.model())),
    !r.requestsHaveToolSearch)
  )
    return "harmful";
  if (isToolDeclaredForTurn(e, n, r)) return r.isNewConversation && MSe() ? "free" : "harmful";
  if (
    ((r.loaded ??= extractDiscoveredToolNames(r.messages, { surfaced: { exceptAnnouncements: new Set() } })),
    !isDeferredTool(e, r.nonDeferrableBuiltins) || r.loaded.has(e.name))
  )
    return bbn() ? "costly" : "harmful";
  return r.held === void 0 ? "costly" : "free";
}
//@ chunk-tyg7f3ek.js:447963-448257 placement
function isToolDeclaredForTurn(e, n, r) {
  let s = (r.nonDeferrableBuiltins ??= getNonDeferrableBuiltins());
  if (r.held === void 0 && r.aboutToHold === void 0)
    r.aboutToHold =
      computeDeclaredToolSet(
        getStickyBetas(),
        n,
        (h) => isDeferredTool(h, s),
        r.model(),
        r.isNewConversation && !Us(r.messages).some((h) => h.type === "assistant"),
      ) ?? null;
  return !isDeferredToolInConversation(e, r.held ?? r.aboutToHold ?? void 0, n, { nonDeferrableBuiltins: s });
}
//@ chunk-tyg7f3ek.js:448257-448270 placement
var DEVICE_BRIDGE_TOOL_WAIT_MS = 60000;
//@ chunk-tyg7f3ek.js:448342-448521 sole-consumer
function readTurnSignals(e, n, r, s) {
  if (e === void 0 || n?.turnStartMark === void 0 || n.receivedWallMs === void 0) return;
  try {
    return e.readSince(n.turnStartMark, r, s - n.enqueuedWallMs);
  } catch (error) {
    logError(error);
    return;
  }
}
//@ chunk-tyg7f3ek.js:448521-483526 placement
function QueryEngine(e) {
  Ket();
  let { getAppState: getAppState, setAppState: setAppState } = e,
    s = e.initialMessages ?? [],
    h =
      e.conversation ??
      Ebe({
        keep: (It) => {
          s.push(...It);
        },
        rows: () => s,
        list: s,
        isHookable: !0,
      }),
    y = Boolean(env.CLAUDE_CODE_SESSION_START_ANNOUNCEMENTS_BEFORE_PROMPT),
    of = kAe.of(e.session.host);
  of.absorb(s);
  let readFileCache = e.readFileCache,
    w = e.sessionEnvVars ?? new Map(),
    P = e.isolationLatch ?? _tt(),
    L = e.toolState ?? new InstanceRegistry(),
    q = e.sessionHooks ?? Spe(),
    any = s.some((It) => It.type === "assistant" || (It.type === "user" && !It.isMeta)),
    G = !1,
    Z = e.memorySelector ?? efe(),
    userSpecifiedModel = e.userSpecifiedModel,
    Ae,
    Ue = createAbortController();
  function ce() {
    let It = e.abortController?.signal;
    if (It?.aborted) Ue.abort(It.reason);
  }
  function nt() {
    Ue.abort(e.abortController?.signal.reason);
  }
  (e.abortController?.signal.addEventListener("abort", nt, { once: !0 }), ce());
  function ie(It = "remote-cancel") {
    (Ue.abort(userAbortReason(It)), (Ue = createAbortController()), ce());
  }
  let Se = null,
    me;
  function Me() {
    let It = me;
    return ((me = void 0), It);
  }
  let Ee = new Stream(),
    He = createQueryEngine({
      run: query,
      queryParams: async () => {
        if (Se === null) throw Error("headless session: turn picked up without prepared params");
        let It = Se;
        return ((Se = null), It);
      },
      hostOwnsPermissionMode: !0,
      sdkResultVerdict: !0,
      fastModeState: () => (Ae === void 0 ? void 0 : getFastModeState(Ae.model, Ae.enabled)),
      fastModeDisabledReason: () =>
        getFastModeUnavailableReasonCode() ?? (Ae && getFastRejectedReason(Ae.model, Ae.enabled)) ?? void 0,
      onCommandLifecycle: e.onCommandLifecycle,
      onTurnThrow: (It) => {
        me = It;
      },
    });
  He.streamInput(Ee).catch(logError);
  let Xe = [],
    We = [],
    St = GLi((It) => {
      Xe.push(...It);
    }),
    wt = new Set(),
    Lt = e.turnEventsSettleMs ?? DEVICE_BRIDGE_TOOL_WAIT_MS,
    pn = !1;
  function _n(It, Ie, on) {
    try {
      return Ie();
    } catch (error) {
      return (
        logForDebugging(
          `headless session: ${It} failed, the turn goes on without it: ` + errorMessage(error),
          { level: "error" },
        ),
        on
      );
    }
  }
  async function Mn() {
    let abortController = new AbortController();
    try {
      let Ie = await withDeadline(
        Promise.race([
          St.settled()
            .then(() => opsDelivered())
            .then(() => "settled"),
          abortTurnSignal(e.messageQueue, abortController.signal).then(() => "yielded"),
        ]),
        Lt,
      );
      if (((pn = Ie === "yielded"), Ie === void 0))
        (St.sever(),
          _n("the mods' first-turn row at the cut", logModsFirstTurn, void 0),
          logForDebugging(
            `headless session: turn events still running after ${Lt}ms; the turn ends without them and their late notes are dropped`,
            { level: "warn" },
          ));
      else if (Ie === "yielded")
        logForDebugging(
          "headless session: a turn event hook queued input; the turn ends so it can run, and the events settle with the turn that runs it",
        );
    } catch (error) {
      ((pn = !1),
        logForDebugging(`headless session: settling the turn events failed: ${errorMessage(error)}`, {
          level: "warn",
        }));
    } finally {
      abortController.abort();
    }
    return Xe.splice(0);
  }
  async function jn(It, Ie, on, Zn) {
    if (((We = await Mn()), We.length === 0)) return;
    try {
      if (((We = [...(await appendRowsWithHooks(h, We))]), Ie.push(...We), on)) {
        if ((await It.record(!0), Zn)) await flushSessionStorage();
      }
    } catch (error) {
      logForDebugging("headless session: recording the turn's notes failed: " + errorMessage(error), {
        level: "error",
      });
    }
  }
  let Jn = new Set(b$o(s));
  function ze(It, Ie, on) {
    let Zn = !1;
    try {
      Zn = It !== void 0 && It !== "" && e.takeSystemPromptDelivered?.() === !0;
      let Nn =
          Zn &&
          shouldSnapshotSystemPrompt({ systemPromptSnapshot: on }) &&
          !snapshotContainsPrompt(Us(s), It),
        Cr = Us(s),
        at = b$o(Cr).at(-1),
        io =
          e.liveAppendSections !== void 0 &&
          (Ie || (at !== void 0 && Jn.has(at))) &&
          shouldSnapshotSystemPrompt({ systemPromptSnapshot: on })
            ? tagBlockChange(Cr, Ie, e.liveAppendSections)
            : void 0;
      if (Nn || io !== void 0) {
        let Hr = appendRowsWithHooks(h, [ROs()]);
        if (Hr instanceof Promise) Hr.catch(logError);
        noteSystemPromptSectionInvalidation(Nn ? "sdk_system_prompt" : "host_append_section");
      }
      if (io !== void 0) e.onLiveAppendSectionChange?.(io);
      if (Zn) ((Zn = !1), logFeatureOk("prompt_snapshot_host_supersede", { prompt_rerendered: Nn }));
      if (Nn) e.onHostPromptSupersedesRecord?.();
    } catch (error) {
      if ((logError(error), Zn)) logFeatureBad("prompt_snapshot_host_supersede", "threw");
    }
  }
  let Dr = !1,
    $r = !1,
    $n,
    ut,
    Yt,
    nn;
  function kn(It) {
    if (nn !== void 0) {
      nn.push({ rows: It, isAnswered: !0 });
      return;
    }
    (h.keep(It), Yt?.appendHostRows(It));
  }
  function En(It) {
    let Ie = appendRowsWithHooks(h, It, { keep: kn });
    if (Ie instanceof Promise) Ie.catch(logError);
  }
  function Mr() {
    let It = nn;
    nn = void 0;
    for (let { rows: rows, isAnswered: isAnswered } of It ?? [])
      if (isAnswered) kn(rows);
      else En(rows);
  }
  let Pn;
  function oo(It) {
    let Ie = Pn;
    if (Ie === void 0 || Ie.length === 0) return;
    try {
      if (It) {
        let last = s.findLast((Nn) => Nn.type === "assistant" || Nn.type === "user");
        if (!(
          last?.type === "assistant" &&
          !last.isApiErrorMessage &&
          last.message.content.every((Nn) => Nn.type !== "tool_use") &&
          last.message.content.some(
            (Nn) => Nn.type === "text" && Nn.text.trim() !== "" && Nn.text.trim() !== NO_CONTENT_MESSAGE,
          )
        ))
          return;
      }
      ((Pn = []), En(Ie));
    } catch (error) {
      logError(error);
    }
  }
  async function* No(It, Ie) {
    if (Dr) throw Error("headless session: a turn is already in flight");
    if (((Dr = !0), Ue.signal.aborted)) ((Ue = createAbortController()), ce());
    let on = Ue,
      Zn = $n,
      Nn = Ie?.abortController?.signal;
    function Cr() {
      on.abort(Nn?.reason);
    }
    if (Nn?.aborted) Cr();
    else Nn?.addEventListener("abort", Cr, { once: !0 });
    try {
      try {
        setAutoModeUnavailableStopNotice(void 0);
      } catch (error) {
        logError(error);
      }
      if (((We = []), !pn)) Xe.length = 0;
      if (Ie?.withdrawnFileUuids?.length) reconcileSavedFilesForTurn(s, Ie.withdrawnFileUuids);
      yield* _i(It, Ie, on);
      for (let mr of We)
        if (mr.type === "system" && mr.subtype === "informational") yield informationalSystemMessage(mr);
    } finally {
      if (
        (Nn?.removeEventListener("abort", Cr),
        Mr(),
        (Yt = void 0),
        oo(!1),
        (Pn = void 0),
        (Dr = !1),
        A3s(),
        $n === Zn)
      )
        $n = Date.now();
    }
  }
  let Fr = [];
  function Xo(It, Ie = []) {
    let { setToolPermissionContext: setToolPermissionContext } = createPermissionContextSetters(setAppState),
      Zn,
      Nn,
      Cr;
    getStickyBetas().turnDeniedTools = void 0;
    try {
      if (
        ((Zn = DSe(getStickyBetas())),
        (Nn = It.length === 0 || Zn !== void 0 ? void 0 : latestPromptSnapshot(s)),
        (Cr = getAppState().toolPermissionContext.alwaysDenyRules.command ?? []),
        It.length > 0 && Zn === void 0)
      ) {
        if ((applyTurnDisallowedTools(setToolPermissionContext, []), Nn === void 0))
          Cr = getAppState().toolPermissionContext.alwaysDenyRules.command ?? [];
      }
      if (Nn !== void 0) (fi(Nn), (Zn = DSe(getStickyBetas())));
      let mr,
        io = {
          held: Zn,
          messages: s,
          isNewConversation: Zn === void 0 && Nn === void 0 && !getStickyBetas().declaredToolsDecided,
          model: () =>
            resolveTurnModelAndThinking({
              userSpecifiedModel: userSpecifiedModel,
              permissionMode: getAppState().toolPermissionContext.mode,
              thinkingConfig: resolveLazy(e.thinkingConfig),
            }).mainLoopModel,
        },
        Hr = filterTurnDisallowedTools(
          It,
          Cr,
          () => (mr ??= e.refreshTools?.() ?? resolveLazy(e.tools)),
          (es) => Zn?.has(es) ?? Nn?.toolDescriptions.has(es) ?? !1,
          (es, Ys) => resolveToolSearchForTurn(es, Ys, io),
        );
      if (Zn === void 0 && Hr.length > 0)
        ((mr ??= e.refreshTools?.() ?? resolveLazy(e.tools)),
          (getStickyBetas().turnDeniedTools = declaredToolSetFor(
            mr,
            (es) => WXn({ turnDisallowedTools: Hr }, es),
            io,
          )));
      applyTurnDisallowedTools(setToolPermissionContext, uniq([...Ie, ...Hr]));
    } catch (error) {
      logError(error);
      try {
        let io = Cr ?? getAppState().toolPermissionContext.alwaysDenyRules.command ?? [];
        (applyTurnDisallowedTools(
          setToolPermissionContext,
          uniq([
            ...Ie,
            ...It.filter((Hr) => io.includes(Hr) || (Zn?.has(Hr) ?? Nn?.toolDescriptions.has(Hr) ?? !1)),
          ]),
        ),
          logFeatureSad("headless_turn_deny", "judging_threw"));
      } catch (error) {
        logError(error);
      }
    }
  }
  function fi(It) {
    try {
      let Ie = getStickyBetas();
      if (
        Ie.declaredToolsDecided ||
        e.refreshTools === void 0 ||
        !shouldSnapshotSystemPrompt({ systemPromptSnapshot: resolveLazy(e.systemPromptSnapshot) })
      )
        return;
      let on = resolveDeclaredToolSet(
        Ie,
        () => ({ names: It.toolDescriptions.keys(), servers: It.toolServers, entries: It.toolEntries }),
        e.refreshTools(),
        { latch: !1, permissionContext: getAppState().toolPermissionContext },
      );
      if (on !== void 0 && [...It.toolDescriptions.keys()].every((Zn) => on.has(Zn))) Ie.declaredTools ??= on;
    } catch (error) {
      logError(error);
    }
  }
  async function* _i(It, Ie, on) {
    let Zn = isTypedPersonPrompt(e.session.host, It, Ie, on.signal);
    if (Zn !== void 0) await Zn;
    let Nn = Ie?.turnStartClock;
    useMessageActions(Nn, "tool_reread");
    try {
      (markOwnClientPrompt(L, Ie?.clientPlatform), noteTurnClientPlatform(e.session, Ie?.clientPlatform));
    } catch (error) {
      logError(error);
    }
    if (
      ((Fr = Ie?.clientDisallowedTools ?? Fr), Ie?.shouldQuery !== !1 && Ie?.skipSkillPermissionReset !== !0)
    )
      Xo(Ie?.keepsDisallowedTools === !0 ? Fr : (Ie?.disallowedTools ?? []));
    let Cr = EMPTY_USAGE,
      mr = e.refreshTools?.() ?? resolveLazy(e.tools),
      io = resolveLazy(e.commands),
      Hr = e.refreshMcpClients?.() ?? resolveLazy(e.mcpClients),
      es = resolveLazy(e.agents),
      Ys = resolveLazy(e.allowedAgentTypes),
      ou = resolveLazy(e.primitiveToolGrant),
      ga = resolveLazy(e.jsonSchema),
      Ni = resolveLazy(e.customSystemPrompt),
      Rd = resolveLazy(e.appendSystemPrompt),
      Ro = resolveLazy(e.planModeInstructions),
      dc = resolveLazy(e.systemPromptSnapshot);
    ze(Ni, Rd, dc);
    let Wo = resolveLazy(e.appendSubagentSystemPrompt),
      ha = resolveLazy(e.toolAliases),
      Wi = resolveLazy(e.excludeDynamicSections),
      Rn = resolveLazy(e.forwardSubagentText) ?? !1,
      { storageV5: storageV5 } = e,
      _a;
    if ((useMessageActions(Nn, "cwd"), e.cwd !== null)) {
      let Ve = resolveLazy(e.cwd);
      if (isStorageV5Enabled() && storageV5 !== void 0) _a = await setCwdV5OrPin(Ve, e.session, storageV5);
      else _a = setCwdOrPin(Ve, e.session);
    }
    if (_a !== void 0) yield _a;
    rearmCreditsExhaustedNotice();
    let to = !isSessionPersistenceDisabled(),
      startTime = performance.now(),
      now = Date.now();
    w3s();
    let $a = readTurnSignals(Nn, Ie?.frameTiming, startTime, now);
    if ((useMessageActions(Nn, "earlier_turn", startTime), Ie?.shouldQuery !== !1)) {
      cYs(e.session, mr);
      try {
        GZn(e.session, { credentials: e.credentials, storageV5: storageV5 });
      } catch (error) {
        logForDebugging(
          `memory snapshot kick failed: ${error instanceof Error ? error.message : String(error)}`,
        );
      }
    }
    let Cd = Ie?.uuid && (Ie.uuidIsClientEventUuid || !Ie.isMeta) ? Ie.uuid : void 0,
      vn = buildRunningTurnRecord(
        Cd,
        Ie?.resumeReason === void 0
          ? Ie?.userMessageUuids
          : answeredMergedUuids(s, Ie.userMessageUuids, Ie.alsoLeftToThisReRun),
        {
          primaryIsMeta: Ie?.isMeta === !0,
          resultsAlsoList: Ie?.handedOffTurnUserMessageUuids,
          standIn: Ie?.userMessageUuids?.at(-1),
          wasPutBack: (Ve) => xxr(e.messageQueue, Ve),
        },
      ),
      ts = Ie?.resumeReason !== void 0 ? { resume_reason: Ie.resumeReason } : void 0,
      Ka = {},
      {
        permissionDenials: permissionDenials,
        recordDenial: recordDenial,
        canUseTool: canUseTool,
      } = createPermissionDenialTracker(e.canUseTool),
      is = getAppState(),
      {
        mainLoopModel: mainLoopModel,
        runtimeModel: runtimeModel,
        thinkingConfig: thinkingConfig,
      } = resolveTurnModelAndThinking({
        userSpecifiedModel: userSpecifiedModel,
        permissionMode: is.toolPermissionContext.mode,
        thinkingConfig: resolveLazy(e.thinkingConfig),
      });
    jS("model_config_wait");
    let Ml =
      Ie?.shouldQuery === !1
        ? void 0
        : await awaitMcpSettle(runtimeModel, {
            storageV5: e.storageV5,
            credentials: e.credentials,
            abortController: on,
          });
    if ((WS("model_config_wait"), e.storageV5 !== void 0))
      loadAllPluginsCacheOnly(e.storageV5, e.credentials).catch(() => {});
    let Jr = {
      session: e.session,
      tools: mr,
      runtimeModel: runtimeModel,
      customSystemPrompt: Ni,
      appendSystemPrompt: Rd,
      appendSystemPromptHead: e.appendSystemPromptHead,
      excludeDynamicSections: Wi,
      cacheBreakerPhrase: is.cacheBreakerPhrase,
      mcpClients: Hr,
      storageV5: e.storageV5,
      credentials: e.credentials,
    };
    applyPendingInvalidations();
    let Bs = getSystemPromptSectionEpoch();
    jS("system_prompt");
    let {
      systemPrompt: systemPrompt,
      userContext: userContext,
      systemContext: systemContext,
    } = await buildHeadlessSystemPrompt(Jr);
    WS("system_prompt");
    let ka = any ? void 0 : getUserContextMemoryFiles(e.session),
      Oo = {
        session: e.session,
        messageQueue: e.messageQueue,
        commands: io,
        tools: mr,
        refreshTools: e.refreshTools,
        toolCatalog: e.toolCatalog,
        refreshMcpClients: e.refreshMcpClients,
        verbose: e.verbose ?? !1,
        fallbackModel: e.fallbackModel,
        thinkingConfig: thinkingConfig,
        mcpClients: Hr,
        customSystemPrompt: Ni,
        appendSystemPrompt: Rd,
        planModeInstructions: Ro,
        systemPromptSnapshot: dc,
        appendSubagentSystemPrompt: Wo,
        toolAliases: ha,
        excludeDynamicSections: Wi,
        agents: es,
        allowedAgentTypes: Ys,
        primitiveToolGrant: ou,
        maxBudgetUsd: e.maxBudgetUsd,
        messageClientPlatform: Ie?.clientPlatform,
        messageInboundOrigin: Ie?.inboundOrigin,
        forwardSubagentText: Rn,
        requiresStructuredOutput: ga !== void 0 && mr.some((Ve) => toolMatchesName(Ve, STRUCTUREDOUTPUT)),
        renderedSystemPrompt: systemPrompt,
        onPermissionDenial: recordDenial,
        requestDialog: e.requestDialog,
        sessionState: e.sessionState,
        getAppState: getAppState,
        setAppState: setAppState,
        setSDKStatus: e.setSDKStatus,
        readFileState: readFileCache,
        pendingNestedMemoryTriggers: e.pendingNestedMemoryTriggers,
        sessionEnvVars: w,
        memorySelector: Z,
        isolationLatch: P,
        toolState: L,
        sessionHooks: q,
        storageV5: e.storageV5,
        credentials: e.credentials,
      },
      Vi = createHeadlessToolUseContext(Oo, {
        phase: "input",
        messages: s,
        mainLoopModel: mainLoopModel,
        appState: is,
        abortController: on,
        setMessages: (Ve) => {
          let ho = Ve(s);
          if (ho !== s) {
            if (ho.length === 0) (h.cut(), (ut = void 0));
            ((s.length = 0), s.push(...ho));
          }
        },
        applyMessageOp: (Ve) => {
          let ho = (rd) => {
              let Ti = applyMessageListEdit(s, rd);
              if (Ti !== s) ((s.length = 0), s.push(...Ti));
            },
            $o = applyMessageListAppend(Ve, ho),
            Is =
              $o === void 0
                ? h.behindAppends(() => ho(Ve))
                : appendRowsWithHooks(h, $o.rows, { keep: $o.keep });
          if (Is instanceof Promise) Is.catch(logError);
        },
        persistSession: to,
      }),
      Id = Ie?.orphanedPermission?.initFirst === !0 || Ie?.handedOffTurn !== void 0;
    if (Id) {
      jS("init_message");
      let Ve = await Qa(Oo, mainLoopModel, is.fastMode);
      (WS("init_message"),
        jS("init_frame_send"),
        ($r = !0),
        yield initWithUserMessageUuids(Ve, vn),
        WS("init_frame_send"));
    }
    let Ps = !(Array.isArray(It) && It.length === 0),
      zi = !1,
      permissionLayers = Vi.permissionLayers;
    if (!$r)
      try {
        e.onTurnBeganBeforeInit?.();
      } catch (error) {
        logError(
          new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
            `onTurnBeganBeforeInit threw; the turn goes on: ${errorMessage(error)}`,
            "onTurnBeganBeforeInit threw",
          ),
        );
      }
    jS("resume_other");
    let Hs = Ie?.inPlaceOfFirstRequest !== void 0,
      Si = Hs ? void 0 : Ie,
      Ms = yield* runHeadlessTurn({
        orphanedPermission: Si?.orphanedPermission,
        handedOffTurn: Si?.handedOffTurn,
        beginTranscriptFlush: e.beginTranscriptFlush,
        awaitStagedFiles: e.awaitStagedFiles,
        placeFilesByName: e.placeFilesByName,
        placeCarriedWrites: e.placeCarriedWrites,
        handoffRelay: e.handoffRelay,
        deferredToolUse: Si?.deferredToolUse,
        hasPrompt: Ps,
        tools: mr,
        mutableMessages: s,
        processUserInputContext: Vi,
        canUseTool: canUseTool,
        answers: e.answers,
        persistSession: to,
        earlyResult: {
          startedAt: startTime,
          usage: Cr,
          permissionDenials: permissionDenials,
          mainLoopModel: mainLoopModel,
          fastMode: is.fastMode,
          origin: Ie?.origin,
          sendEcho: vn.fields(),
          resumeReasonStamp: ts,
        },
        onHandedOffCallsRan: (Ve) => {
          ((zi = !0), (permissionLayers = Ve));
        },
        onOrphanedAnswerSettled: e.onOrphanedAnswerSettled,
      });
    if ((WS("resume_other"), Ms)) return;
    let Od = profileCheckpoint("before_processUserInput", { once: !0 }),
      Dd =
        Ie?.hearthRelayMessageIds !== void 0 ||
        Ie?.hearthRelayRows !== void 0 ||
        Ie?.hearthRelayThreadTs !== void 0,
      ws = r9n(Ie?.uuid, Ie?.verifiedSlackHumanTurn || Dd);
    using ns = createPromptEntryTracker();
    jS("process_user_input");
    let {
      messages: messages,
      shouldQuery: shouldQuery,
      allowedTools: allowedTools,
      model: model,
      effort: effort,
      resultText: resultText,
      localCommand: localCommand,
      commandExitCode: commandExitCode,
      interrupted: interrupted,
    } = await processUserInput({
      input: It,
      mode: Ie?.inputMode ?? "prompt",
      clientBashCommand: Ie?.inputMode === "bash",
      clientBashCommandCwd: Ie?.inputMode === "bash" ? Ie.clientBashCommandCwd : void 0,
      interactionPrompt: xbn(),
      context: {
        ...Vi,
        messages: s,
        askPerson: (Ve) => confirmWithUser({ ...Ve, canUseTool: canUseTool, toolUseContext: Vi }),
      },
      messages: s,
      uuid: ws,
      isMeta: Ie?.isMeta,
      shouldQuery: Ie?.shouldQuery,
      queryHeldForNextTurn: Ie?.queryHeldForNextTurn,
      querySource: "sdk",
      origin: Ie?.origin,
      skipSlashCommands: Hs || Ie?.skipSlashCommands,
      skipAttachments: Hs
        ? "all"
        : Ie?.skipAttachments
          ? Ie.shouldQuery === !1
            ? "all"
            : "mentions"
          : void 0,
      skipSubmissionHooks: Hs || Ie?.skipSubmissionHooks,
      aheadOfSessionStart: Ie?.orphanedPermission !== void 0,
      bridgeOrigin: Si?.bridgeOrigin,
      localStdinOrigin: Ie?.localStdinOrigin,
      sessionChannelPersonTyped: Ie?.sessionChannelPersonTyped,
      ownWordUuids: Ie?.ownWordUuids,
      hostInitiator: Ie?.hostInitiator,
      inboundOrigin: Ie?.inboundOrigin,
      toolsUsed: Ie?.toolsUsed,
      modelScheduledOrigin: Si?.modelScheduledOrigin,
      wakeupSource: Ie?.wakeupSource,
      artifactCommentTurn: Ie?.artifactCommentTurn,
      pollEventDelivery: Ie?.pollEventDelivery,
      pollEventProvenance: Ie?.pollEventProvenance,
      pollEventDeclared: Ie?.pollEventDeclared,
      skipSkillPermissionReset: Ie?.skipSkillPermissionReset === !0 || zi,
      verifiedSlackHumanTurn: Ie?.verifiedSlackHumanTurn,
      textNotTyped: Ie?.textNotTyped,
      ownFilePaths: Ie?.ownFilePaths,
      noPersonArrived: Ie?.noPersonArrived,
      inlinedImagePaths: Ie?.inlinedImagePaths,
      stampThreadState: Ie?.stampThreadState,
      entries: ns,
    });
    if ((WS("process_user_input"), jS("conversation_append"), Od))
      profileCheckpoint("after_processUserInput");
    let Nr =
        (Ie?.orphanedPermission !== void 0 || Ie?.handedOffTurn !== void 0) && !Ps
          ? messages.filter((Ve) => !isEmptyUserMessage(Ve))
          : Hs
            ? messages.filter(
                (Ve) => Ie?.refusedPromptIsStoredAlready === !0 && Ve.type === "user" && Ve.isMeta !== !0,
              )
            : messages,
      Do = Ie?.inPlaceOfFirstRequest !== "nothing" && (Hs || (shouldQuery && Ie?.shouldQuery !== !1));
    if (Ie?.origin?.kind !== "plugin") setLocalCommandExitCode(Do ? void 0 : commandExitCode);
    if (Ie?.origin) stampMissingOrigin(Nr, Ie.origin);
    if (Ie?.skipAttachments === !0) XQn(Nr);
    if (Ie?.textNotTyped === !0) JQn(Nr);
    if (Ie?.shouldQuery === !1 && Ie.queryHeldForNextTurn !== !0) QQn(Nr);
    if (interrupted) markDroppedPrompts(Nr, ws, Ie?.resumeReason === void 0 ? Ie?.userMessageUuids : void 0);
    if (Ie?.taskDelivery) attachTaskDelivery(Nr, Ie.taskDelivery, ws);
    if (
      (stampMergedSends(Nr, ws, Ie?.mergedSendUuids, Ie?.clientPlatform, getContextKey()),
      withdrawBridgeAttachments(Nr, ws, It, Ie?.imageFileUuids, Ie?.savedFiles),
      Ie?.verifiedSlackHumanTurn && ws)
    )
      markVerifiedHumanTurn(Nr, ws, {
        projectsUserTurn: Ie.projectsUserTurn === !0,
        emailSenderTurn: Ie.emailSenderTurn,
      });
    if (Dd && ws)
      setHearthRelayMetadata(Nr, ws, {
        messageIds: Ie?.hearthRelayMessageIds,
        rows: Ie?.hearthRelayRows,
        threadTs: Ie?.hearthRelayThreadTs,
      });
    if (y)
      y =
        !checkSessionStartPlacement({
          conversation: s,
          turnMessages: Nr,
          model: runtimeModel,
          startsModelTurn: Do,
        }) && !Do;
    if (Do)
      try {
        e.beforeTurnInput?.();
      } catch (error) {
        logError(
          new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
            `beforeTurnInput threw; the turn goes on without the host's rows: ${errorMessage(error)}`,
            "beforeTurnInput threw",
          ),
        );
      }
    let found = Nr.find(isCompactBoundaryMessage);
    if (found !== void 0) await mirrorTaskListSnapshot(found, e.session, e.storageV5);
    if (Owt()) await h.settled();
    let ni = { before: s.at(-1)?.uuid, next: void 0 },
      lt = await appendRowsWithHooks(h, Nr);
    if (lt !== Nr) Nr.splice(0, Nr.length, ...lt);
    let In = Hs ? Ie?.errorRowBehindRefusedPrompt : void 0;
    if (In !== void 0 && s.findLastIndex((Ve) => Ve.uuid === In.uuid) === -1) h.keep([In]);
    if (In !== void 0) ut = Ie?.uuid;
    ns.handedOff();
    let ar = [...s];
    if (isFoamySpringEnabled()) Pn = [];
    let pr = persistTurnRows({
      conversation: s,
      messages: ar,
      persistSession: to,
      storageV5: e.storageV5,
      holdsLoadersRows: e.loadShowsCutOffCalls === !0,
      foldCopies: e.messageQueue,
      neverParentUuid: ut,
    });
    if (((Yt = to ? pr : void 0), Do && !Hs && !interrupted && Ie?.origin?.kind === "human" && $ci()))
      await prefetchSenderAddressFor(promptIdForRequest(ar, mainAgentContext()));
    let qo = Boolean(env.CLAUDE_CODE_EAGER_FLUSH) || Boolean(env.CLAUDE_CODE_IS_COWORK);
    if (to && Nr.length > 0) {
      let record = pr.record();
      if (isBareMode());
      else {
        if ((WS("conversation_append"), jS("transcript_persist"), await record, qo))
          await flushSessionStorage();
        (WS("transcript_persist"), jS("conversation_append"));
      }
    }
    let oi =
        Ie?.inputMode === "bash"
          ? userRowsWithoutInput(Nr)
          : e.replayUserMessages
            ? userRowsToReplay(Nr, Ie)
            : [],
      ds = e.includePartialMessages ?? !1,
      Ct = ds && (e.replayAcksAtRequestDispatch ?? !1);
    (WS("conversation_append"),
      jS("tool_pool_refresh"),
      Var(createPermissionContextSetters(setAppState), allowedTools, Ie));
    let cs = model != null && (isExemptDefaultResolvingPick(model) || isModelAllowed(model));
    if (model && !cs)
      logForDebugging(
        `Skill/command model "${model}" is not in the availableModels allowlist; keeping the session model`,
        { level: "warn" },
      );
    let rs =
      cs &&
      isSkillModelOverrideAllowedInMode({
        skillModel: model,
        mode: getAppState().toolPermissionContext.mode,
        fastMode: getAppState().fastMode ?? !1,
      })
        ? model
        : mainLoopModel;
    Ae = { model: rs, enabled: is.fastMode };
    let Zi = mr,
      fs = Hr,
      si;
    try {
      let Ve = e.refreshTools?.() ?? mr;
      if (e.refreshTools !== void 0) si = Ve === mr;
      ((Zi = Ve.length === mr.length && Ve.every((ho, $o) => ho.name === mr[$o]?.name) ? mr : Ve),
        (fs = e.refreshMcpClients?.() ?? Hr));
    } catch (error) {
      logError(error);
    }
    if ((WS("tool_pool_refresh"), Zi !== mr))
      try {
        let Ve = getSystemPromptSectionEpoch();
        jS("system_prompt_rebuild");
        try {
          ({
            systemPrompt: systemPrompt,
            userContext: userContext,
            systemContext: systemContext,
          } = await buildHeadlessSystemPrompt({ ...Jr, tools: Zi }));
        } finally {
          WS("system_prompt_rebuild");
        }
        Bs = Ve;
      } catch (error) {
        if (!isAbortError(error)) logError(error);
      }
    let xd = { ...Oo, tools: Zi, mcpClients: fs, renderedSystemPrompt: systemPrompt },
      Po = createHeadlessToolUseContext(xd, {
        phase: "query",
        messages: ar,
        mainLoopModel: rs,
        appState: getAppState(),
        abortController: on,
        permissionLayers:
          effort !== void 0
            ? [...(permissionLayers ?? []), { kind: "effort", effort: effort }]
            : permissionLayers,
        activeSkill: Vi.options.activeSkill,
      });
    if (!Id) {
      jS("init_message");
      let Ve = await Qa(xd, rs, is.fastMode);
      (WS("init_message"), jS("init_frame_send"), ($r = !0));
      let ho = ua(startTime, performance.now());
      if ((yield initWithUserMessageUuids(Ve, vn), Do))
        sampleQueueLatency({
          enqueuedWallMs: Ie?.frameTiming?.enqueuedWallMs,
          previousTurnEndedWallMs: $n,
          startWallMs: now,
          startToInitMs: ho,
        });
    } else jS("init_frame_send");
    if (
      (logShouldQueryResolved({ shouldQuery: Do, fromUserInput: shouldQuery, fromOptions: Ie?.shouldQuery }),
      yield* preservedAttachmentRows(Nr, getSessionId()),
      !any)
    ) {
      any = !0;
      let Ve = await checkContextInstructionsSize(ka, getSessionId(), rs);
      if (Ve !== null) yield Ve;
    }
    if (!G) {
      G = !0;
      let Ve = gatewayCodeTabRulesNotice(e.session);
      if (Ve !== null) yield Ve;
    }
    if (!Do) {
      if ((WS("init_frame_send"), Ie?.inputMode !== "bash")) yield* replayMessagesToSdk(Nr);
      if (to) {
        if (
          (await pr.record(e.loadShowsCutOffCalls === !0 && Ie?.resumeReason !== void 0 && !interrupted), qo)
        )
          await flushSessionStorage();
      }
      if ((yield* Ie?.inputMode === "bash" ? replayUserRows(oi, Ie) : userRowsForSdk(oi, Ie), interrupted))
        try {
          Ie?.onPromptCheckInterrupted?.();
        } catch (error) {
          if (isAbortError(error)) logForDebugging(`onPromptCheckInterrupted aborted: ${error}`);
          else logError(error);
        }
      if (
        (yield buildResultMessage({
          startedAt: startTime,
          common: {
            is_error: interrupted === !0,
            duration_api_ms: 0,
            num_turns: 0,
            stop_reason: null,
            session_id: getSessionId(),
            total_cost_usd: getTotalCostUSD(),
            usage: Cr,
            modelUsage: getModelUsage(),
            permission_denials: permissionDenials,
            terminal_reason: interrupted ? "aborted_streaming" : void 0,
            fast_mode_state: getFastModeState(rs, getAppState().fastMode),
            fast_mode_disabled_reason:
              getFastModeUnavailableReasonCode() ??
              getFastRejectedReason(rs, getAppState().fastMode) ??
              void 0,
            origin: Ie?.origin,
            subagent_stats: buildFileHistorySnapshotChain(e.session),
            safety_stops: getSafetyStops(),
          },
          variant: interrupted
            ? {
                subtype: "error_during_execution",
                errors: ["prompt_check: the turn was stopped before its prompt was checked"],
                ...vn.errorVariantFields(),
                ...ts,
              }
            : {
                subtype: "success",
                result: resultText ?? "",
                ...vn.fields(),
                ...ts,
                ...(localCommand !== void 0 && { local_command: normalizeCustomSubtype(localCommand) }),
              },
        }),
        pn)
      )
        await jn(pr, ar, to, qo);
      return;
    }
    if ((yield* systemMessagesToSdk(Nr), fileHistoryEnabled() && to))
      Nr.filter((Ve) => isOwnPromptRow(Ve, Ie)).forEach((Ve) => {
        fileHistoryMakeSnapshot(Po.getFileHistoryState, Po.applyFileHistoryOp, Ve.uuid);
      });
    let ps = startTurnTiming({ toolUseContext: Po, sessionState: e.sessionState }),
      Ja = !1,
      El = !1,
      hr = 0,
      Fo = ds ? Ie?.emitPlainDelta : void 0,
      va =
        Fo === void 0
          ? void 0
          : (Ve) => {
              if (
                Fo === void 0 ||
                !Ja ||
                (!El && Ve.event.type === "content_block_delta" && Ve.event.delta.type === "text_delta")
              )
                return !1;
              try {
                let ho = Fo(toStreamEventMessage(Ve, { uuid: randomUUID_16(), session_id: getSessionId() }));
                if (ho) hr++;
                return ho;
              } catch (error) {
                return ((Fo = void 0), nSo("host_threw", error), !1);
              }
            };
    ((Se = {
      messages: ar,
      systemPrompt: systemPrompt,
      promptRenderEpoch: Bs,
      modelFacts: Ml,
      userContext: userContext,
      systemContext: systemContext,
      canUseTool: e.canUseTool,
      toolUseContext: Po,
      fallbackModel: e.fallbackModel,
      querySource: "sdk",
      maxTurns: e.maxTurns,
      taskBudget: e.taskBudget,
      takePlainDelta: va,
      stopHookActive: Ie?.stopHookActive,
      joinedDisallowedTools: (Ve) => {
        let ho = Ve.length > 0 ? [] : (e.refreshMcpClients?.() ?? resolveLazy(e.mcpClients));
        (Xo(
          Ve,
          filterMcpToolsBySelectedServers(
            getAppState().toolPermissionContext.turnDisallowedTools ?? [],
            Ve,
            ho,
          ),
        ),
          (Fr = uniq([...filterMcpToolsBySelectedServers(Fr, Ve, ho), ...Ve])));
      },
      inPlaceOfFirstRequest: Ie?.inPlaceOfFirstRequest === "nothing" ? void 0 : Ie?.inPlaceOfFirstRequest,
    }),
      Me());
    let at = getInMemoryErrors().at(-1);
    for (let Ve of wt) Ve.next = ni;
    (wt.clear(), wt.add(ni));
    let ba = _n(
      "turn.start",
      () =>
        buildTurnStartEvent({
          turnEvents: St,
          newMessages: Nr,
          input: typeof It === "string" ? It : void 0,
          signal: on.signal,
          abort: () => on.abort(userAbortReason("turn-abort")),
        }),
      void 0,
    );
    (WS("init_frame_send"),
      jS("engine_pickup"),
      Ee.enqueue({
        type: "user",
        message: { role: "user", content: It },
        parent_tool_use_id: null,
        origin: Ie?.origin,
      }));
    let jo = randomUUID_16(),
      Gs = new Map(),
      ig = () => e.refreshTools?.() ?? Zi,
      lc = !1;
    try {
      lc = resolveLazy(e.replayOwnTaskNotifications) ?? !1;
    } catch (error) {
      logError(error);
    }
    let Im = {
        replayUserMessages: e.replayUserMessages ?? !1,
        replayOwnTaskNotifications: lc,
        includePartialMessages: ds,
        ...!1,
      },
      mo = createRetractionFilter(),
      Ao = (Ve) => collapseRefusalFallbackNotices(mo.settle(Ve), getSessionId()),
      Xa = createPartialStreamRetraction(ds),
      Il = ga ? countNamedToolUses(s, STRUCTUREDOUTPUT) : 0,
      at_2 = s.at(-1),
      vi = [],
      Za = 0,
      Bd = new Set(),
      Es = EMPTY_USAGE,
      uc,
      ed,
      Nd = null,
      Wd = 0,
      qd = 0,
      td = 0,
      nd,
      Ta,
      jd = 0,
      uu = 0,
      mu = 0,
      mc = 1,
      fu = oi.length === 0;
    function* pu() {
      if (!fu) ((fu = !0), yield* replayUserRows(oi, Ie));
    }
    let _u = !1,
      Cn = !1,
      os = createRunningTurnTracker(() => vn.fields()?.user_message_uuids ?? []);
    if (Ie?.inputMode === "bash") yield* pu();
    try {
      while (!0) {
        let { value: Ve, done: ho } = await He.next();
        if (((Ja = !1), ho)) throw Error("headless session: the engine loop ended before the turn result");
        let $o = Ve,
          Is = !0,
          rd =
            (Ve.type === "assistant" && !("parent_tool_use_id" in Ve)) ||
            Ve.type === "user" ||
            (Ve.type === "system" && Ve.subtype === "compact_boundary"),
          Ti = [],
          Su = !1;
        switch (Ve.type) {
          case "assistant": {
            if ("parent_tool_use_id" in Ve) break;
            let Mt = withoutSessionId(Ve);
            oSo(e.messageQueue);
            let Ur = takeShownAsStoredMark(Mt, to ? e.markOfRepliesShownAsStored : void 0);
            if ((os.onAssistantRow(Mt), ps.onAssistantMessage(Mt), !Wd)) Wd = performance.now();
            if (Mt.message.stop_reason != null) Nd = Mt.message.stop_reason;
            if (Mt.isApiErrorMessage) Ti.push(...Ao("stream_error"));
            let rr = assistantUsageDelta(Mt, uc, ed);
            if (rr) ((ed = Mt.message.id), (Cr = addUsage_2(Cr, rr)));
            if (
              ((Su = Mt.message.stop_reason != null && Mt.message.stop_reason !== "refusal"),
              ar.push(Mt),
              to && Ur === void 0)
            )
              pr.record();
            if ((h.keep([Mt]), Ur === void 0)) (yield* pu(), of.absorb([Mt]));
            let Uo;
            try {
              let Bo = await runMessageDisplayHook(
                e.session,
                Mt,
                jo,
                q,
                on.signal,
                e.storageV5,
                e.credentials,
              );
              if (((Uo = Bo.message), Ur !== void 0)) markShownAsStored(Mt, Ur, Bo.hookOutputApplied);
            } finally {
              if (Ur !== void 0) pr.record();
            }
            if (Ur !== void 0) (yield* pu(), of.absorb([Mt]));
            if (Uo !== Mt) Gs.set(Mt, Uo);
            $o = { ...Uo, session_id: Ve.session_id, uuid: Ve.uuid };
            break;
          }
          case "user": {
            let Mt = withoutSessionId(Ve);
            if (isInterruptionOnlyMessage(Mt)) Ti.push(...Ao("interrupted"));
            nn = [];
            try {
              if ((ar.push(Mt), to)) await pr.record();
              (h.keep([Mt]), of.absorb([Mt]), pr.settlePreservedTail(Mt.uuid));
            } finally {
              Mr();
            }
            mc++;
            break;
          }
          case "progress":
          case "attachment": {
            let Mt = markMaxTurnsExit(withoutSessionId(Ve)),
              Ur = stripAgentToolResultForStorage(Mt);
            (h.keep([Ur]), of.absorb([Mt]));
            let rr = getSourceUuid(Mt);
            if (rr !== void 0) pr.holdFoldCopy(Ur, rr);
            if (to) (ar.push(Ur), pr.record());
            if (Mt.type === "attachment") vn.noteAttachment(Mt.attachment);
            if (Mt.type === "attachment" && Mt.attachment.type === "structured_output")
              if (Mt.attachment.toolUseID !== void 0 ? Bd.has(Mt.attachment.toolUseID) : Bd.size > 0)
                (pr.evict(Mt.uuid), logEvent("tengu_structured_output_late_retraction_drop", {}));
              else vi.push({ toolUseID: Mt.attachment.toolUseID, attachmentUuid: Mt.uuid });
            break;
          }
          case "tombstone": {
            (os.onRetraction(Ve.message.uuid),
              yield* Xa.onTombstone(Ve),
              pr.evict(Ve.message.uuid),
              mo.dropHeld(Ve.message.uuid));
            let Mt = Ve.message.type === "assistant" ? Ve.message.message.content : void 0,
              Ur = Array.isArray(Mt)
                ? Mt.flatMap((rr) => (rr.type === "tool_use" && rr.name === STRUCTUREDOUTPUT ? [rr.id] : []))
                : [];
            if (Ur.length > 0) {
              (Za++, Ur.forEach((Bo) => Bd.add(Bo)));
              let rr = (Bo) => Bo.toolUseID === void 0 || Ur.includes(Bo.toolUseID),
                filtered = vi.filter(rr);
              (filtered.forEach((Bo) => pr.evict(Bo.attachmentUuid)),
                (vi = vi.filter((Bo) => !rr(Bo))),
                logEvent("tengu_structured_output_retracted", {
                  retracted_results: filtered.length,
                  surviving_results: vi.length,
                  tombstoned_calls: Za,
                }));
            }
            break;
          }
          case "stream_event":
            if (!("parent_tool_use_id" in Ve && Ve.parent_tool_use_id) && !zbe(Ve.event))
              (oSo(e.messageQueue), pr.settleFoldCopies());
            if (
              (ps.onStreamEvent(Ve),
              Ti.push(...Xa.onStreamEvent(Ve.event, Es)),
              !td && (Ve.event.type === "content_block_start" || Ve.event.type === "content_block_delta"))
            )
              td = performance.now();
            if (Ve.event.type === "message_start") {
              if (!qd) qd = performance.now();
              if (
                ((Es = mRe(EMPTY_USAGE, Ve.event.message.usage)),
                !jd && "requestSentAtMs" in Ve && Ve.requestSentAtMs)
              )
                jd = Ve.requestSentAtMs;
              if (!uu && "requestSentWallMs" in Ve && Ve.requestSentWallMs)
                ((uu = Ve.requestSentWallMs),
                  (mu = Es.input_tokens + Es.cache_read_input_tokens + Es.cache_creation_input_tokens));
              uc = Ve.event.message.id;
            } else if (Ve.event.type === "message_delta") {
              if (Ve.event.delta.stop_reason != null) {
                if (((Nd = Ve.event.delta.stop_reason), Ve.event.delta.stop_reason !== "refusal"))
                  Ti.push(...Ao("served"));
              }
              if (
                ((Es = parseUsageIterations(Ve.event.usage)?.servedFallbackModel
                  ? $jo(Es, Ve.event.usage)
                  : mRe(Es, Ve.event.usage)),
                to)
              )
                pr.record();
            } else if (Ve.event.type === "message_stop") Cr = addUsage_2(Cr, Es);
            break;
          case "system":
            if (Ve.subtype === "status" && Ve.status === "compacting") pr.settleFoldCopies("compaction");
            else if (Ve.subtype === "status") pr.settleFoldCopies();
            if (Ve.subtype === "status" && Ve.status === "requesting") os.onRoundStart();
            if (Ve.subtype === "model_refusal_fallback") {
              Is = !1;
              let Mt = createRefusalFallbackMessage(Ve);
              if (
                (ja(Mt, ar, to),
                yield* Xa.onRefusalFallbackBanner(Mt.direction, Es),
                isRefusalFallbackEnabled())
              )
                yield* collapseRefusalFallbackNotices(mo.accept(Mt), getSessionId());
            } else if ((Hi(Ve, ar, pr, to), Ve.subtype === "model_refusal_no_fallback"))
              yield* Ao("exhausted");
            else if (Ve.subtype === "model_fallback") yield* Ao("availability_switch");
            else if (Ve.subtype === "informational")
              try {
                Is = !isTransportBacked(e.session);
              } catch {
                Is = !1;
              }
            if (Ve.subtype === "compact_boundary") {
              let dropPreservedRowsNotInConversation = pr.dropPreservedRowsNotInConversation(
                  convertCompactBoundaryMessage(Ve),
                ),
                Ur = Ie?.resumeReason !== void 0;
              (os.onBoundary(dropPreservedRowsNotInConversation, {
                openerUuid: Ur && Ie.isMeta ? Ie.resumedTurnOpenerUuid : (Ie?.resumedTurnOpenerUuid ?? Cd),
                conversation: s,
                continuedTurnsRows: Ur ? s : void 0,
              }),
                (nn = []));
              try {
                if (
                  (await mirrorTaskListSnapshot(dropPreservedRowsNotInConversation, e.session, e.storageV5),
                  to)
                )
                  await pr.flushBeforeCompactBoundary(dropPreservedRowsNotInConversation);
                if ((ar.push(dropPreservedRowsNotInConversation), to)) await pr.record(!0);
                (h.keep([dropPreservedRowsNotInConversation]),
                  pr.applyCompactBoundary(dropPreservedRowsNotInConversation));
              } finally {
                Mr();
              }
            }
            break;
          case "post_turn_summary":
            setAppState((Mt) =>
              Mt.postTurnSummary === Ve.value ? Mt : { ...Mt, postTurnSummary: Ve.value },
            );
            break;
          case "active_goal":
            setAppState((Mt) => (Mt.activeGoal === Ve.value ? Mt : { ...Mt, activeGoal: Ve.value }));
            break;
          case "command_lifecycle":
            if (Ve.state === "started") {
              let noteCommandStarted = vn.noteCommandStarted(Ve.command_uuid);
              try {
                Ie?.onCommandTakenIn?.(Ve.command_uuid, noteCommandStarted);
              } catch (error) {
                logError(error);
              }
              pr.settleFoldCopies();
            }
            break;
          case "result": {
            ((_u = !0), (Cn = !0), ps.end(Ve.terminal_reason), Bi(pr, mr));
            let Mt = Me();
            if (Mt !== void 0) throw (yield* Xa.closeAtTurnEnd(Es), Mt.error);
            (Ve.permission_denials.unshift(...permissionDenials),
              yield* Xa.closeAtTurnEnd(Es),
              yield* Ao("turn_end"));
            let Ur = getAutoModeUnavailableStopNotice();
            if (Ur !== void 0) {
              let ea = Ur;
              try {
                if (isTransportBacked(e.session)) ea = F3n(Ur);
              } catch {
                ea = F3n(Ur);
              }
              yield informationalSystemMessage(createSystemMessage(ea, "warning"));
            }
            if (to) {
              if ((await pr.record(!0), qo)) await flushSessionStorage();
            }
            let rr = Ve.subtype === "success" && !Ve.is_error && Ve.deferred_tool_use === void 0;
            if (ga !== void 0 && rr && vi.length === 0 && Za > 0) {
              (logEvent("tengu_structured_output_retraction_exhausted", {
                tombstoned_calls: Za,
                num_turns: Ve.num_turns,
              }),
                yield buildResultMessage({
                  startedAt: startTime,
                  common: {
                    is_error: !0,
                    duration_api_ms: Ve.duration_api_ms,
                    num_turns: Ve.num_turns,
                    stop_reason: Nd,
                    session_id: getSessionId(),
                    total_cost_usd: Ve.total_cost_usd,
                    usage: Cr,
                    modelUsage: Ve.modelUsage,
                    permission_denials: Ve.permission_denials,
                    terminal_reason: isAbortedTerminalReason(Ve.terminal_reason)
                      ? Ve.terminal_reason
                      : "structured_output_retry_exhausted",
                    fast_mode_state: Ve.fast_mode_state,
                    fast_mode_disabled_reason: Ve.fast_mode_disabled_reason,
                    origin: Ie?.origin,
                    subagent_stats: buildFileHistorySnapshotChain(e.session),
                    safety_stops: getSafetyStops(),
                  },
                  variant: {
                    subtype: "error_max_structured_output_retries",
                    errors: [STRUCTURED_OUTPUT_RETRACTED_MESSAGE],
                    ...vn.errorVariantFields(),
                    ...ts,
                  },
                }));
              return;
            }
            if (rr && Wd)
              logEvent("tengu_sdk_ttft", {
                ttft_ms: ua(startTime, Wd),
                model: telemetrySafeModelName(rs),
                ...(si !== void 0 && { tool_pool_reused: si }),
              });
            let Uo = rr ? uyi() : void 0,
              Bo = rr && jd ? ua(startTime, jd) : void 0,
              _r = Bo !== void 0 ? k3s(Bo, jd) : void 0,
              Ol =
                Ve.subtype === "success" && Ve.is_error && Ve.deferred_tool_use === void 0 ? T3s() : void 0,
              last = ar.findLast(
                (ea) => (ea.type === "assistant" || ea.type === "user") && !pr.isHostRow(ea),
              ),
              Pa =
                last?.type === "assistant" && !(last.isApiErrorMessage && !Ve.is_error)
                  ? getSalvageableResultText(last, Gs.get(last))
                  : void 0,
              resultFields = vn.resultFields(),
              Kd = postTimingFields(rr, startTime, nd),
              Vd = postTimingFields(rr, startTime, Ta);
            $o = {
              ...Ve,
              usage: Cr,
              duration_ms: ua(startTime, performance.now()),
              ...(Ve.subtype === "error_during_execution" && {
                errors: orderForTransport(
                  e.session,
                  Ve.errors[0] ?? "",
                  appendUnique(Ve.errors.slice(1), getRecentErrorLog(at)),
                  "first",
                ),
              }),
              ...(Ve.subtype !== "success" && vn.errorVariantFields()),
              ...(Ve.subtype !== "success" && ts),
              ...(Ve.subtype === "success" && {
                ...(Pa !== void 0 && { result: Pa }),
                ttft_ms: rr && Wd ? ua(startTime, Wd) : void 0,
                ttft_stream_ms: rr && qd ? ua(startTime, qd) : void 0,
                time_to_request_ms: Bo,
                ...(_r && {
                  time_to_request_phases_ms: _r.phases,
                  turn_start_resume_kind: turnContinuationKind({
                    orphanedPermission: Ie?.orphanedPermission,
                    handedOffTurn: Ie?.handedOffTurn,
                    deferredToolUse: Ie?.deferredToolUse,
                  }),
                  ...(Ie?.handedOffTurn?.intakePhasesMs !== void 0 && {
                    handoff_intake_phases_ms: Ie.handedOffTurn.intakePhasesMs,
                  }),
                }),
                ...(Ol !== void 0 && { process_turn_index: Ol }),
                ...(_r?.window && {
                  process_turn_index: _r.window.processTurnIndex,
                  time_to_request_loop_lag_ms: _r.window.loopLagMs,
                }),
                ...(_r?.window?.resources && {
                  time_to_request_cpu_ms: _r.window.resources.cpuMs,
                  time_to_request_major_faults: _r.window.resources.majorFaults,
                }),
                ...(_r?.memory && {
                  process_rss_mib_turn_start: _r.memory.atBegin.rssMib,
                  process_anon_mib_turn_start: _r.memory.atBegin.anonMib,
                  process_rss_mib_result: _r.memory.atConsume.rssMib,
                  process_anon_mib_result: _r.memory.atConsume.anonMib,
                  process_peak_rss_mib: _r.memory.atConsume.peakRssMib,
                }),
                ...(_r?.betweenTurns && {
                  process_cpu_ms_between_turns: _r.betweenTurns.cpuMs,
                  process_wall_ms_between_turns: _r.betweenTurns.wallMs,
                }),
                ...(_r?.turn && { process_cpu_ms_turn: _r.turn.cpuMs, process_wall_ms_turn: _r.turn.wallMs }),
                ...(_r?.shellCpu && {
                  shell_cpu_ms_turn: _r.shellCpu.turnMs,
                  ...(_r.shellCpu.sinceLastResult && {
                    shell_cpu_ms_since_last_result: _r.shellCpu.sinceLastResult.cpuMs,
                    shell_wall_ms_since_last_result: _r.shellCpu.sinceLastResult.wallMs,
                  }),
                }),
                ...(_r?.streaming && {
                  process_cpu_ms_streaming: _r.streaming.cpuMs,
                  process_wall_ms_streaming: _r.streaming.wallMs,
                  main_stream_count: _r.streaming.streams,
                  main_stream_event_count: _r.streaming.events,
                  ...(_r.streaming.chunks !== void 0 && { main_stream_chunk_count: _r.streaming.chunks }),
                }),
                ...(_r?.inputAttachments && { input_attachments_detail: _r.inputAttachments }),
                ...(_r?.storeConfirm && { resume_store_confirm_detail: _r.storeConfirm }),
                first_content_frame_ms: rr && td ? ua(startTime, td) : void 0,
                first_stream_post_ms: Kd.postMs,
                first_stream_post_ack_ms: rr && nd?.ackedAtMs ? ua(startTime, nd.ackedAtMs) : void 0,
                first_stream_post_queue_wait_ms: Kd.queueWaitMs,
                first_stream_post_queued_behind: Kd.queuedBehind,
                first_text_post_ms: Vd.postMs,
                first_text_post_queue_wait_ms: Vd.queueWaitMs,
                first_text_post_queued_behind: Vd.queuedBehind,
                text_post_count: Vd.textPosts,
                text_post_gap_over_500ms_count: Vd.textPostGapsOver500Ms,
                text_post_flush_timer_max_late_ms: Vd.flushTimerMaxLateMs,
                ...resultFields,
                ...ts,
                ...(rr &&
                  uu &&
                  resultFields !== void 0 &&
                  resultFields.user_message_uuid === Cd && {
                    request_sent_wall_ms: uu,
                    ...(mu > 0 && { first_request_input_tokens: mu }),
                    ...(Ie?.frameTiming?.serverReceivedWallMs !== void 0 && {
                      user_message_server_received_wall_ms: Ie.frameTiming.serverReceivedWallMs,
                    }),
                    ...(nd?.postedWallMs !== void 0 && { first_stream_post_wall_ms: nd.postedWallMs }),
                    ...(Ta?.postedWallMs !== void 0 && { first_text_post_wall_ms: Ta.postedWallMs }),
                    ...(Ie?.frameTiming?.receivedWallMs !== void 0 && {
                      frame_received_wall_ms: Ie.frameTiming.receivedWallMs,
                      frame_enqueued_wall_ms: Ie.frameTiming.enqueuedWallMs,
                      turn_started_wall_ms: now,
                      ...(Ie.frameTiming.intakePhasesMs !== void 0 && {
                        frame_intake_phases_ms: Ie.frameTiming.intakePhasesMs,
                      }),
                      ...($a !== void 0 && {
                        turn_start_phases_ms: $a.phases,
                        ...($a.controlRequestsMs > 0 && {
                          turn_start_control_requests_ms: $a.controlRequestsMs,
                        }),
                      }),
                    }),
                  }),
                ...(Uo && {
                  time_to_request_from_spawn_ms: Uo.ms,
                  warm_spare_claimed: Uo.warmSpareClaimed,
                  flag_fetch_kick: Uo.flagFetchKick,
                  time_origin_ms: Uo.timeOriginMs,
                }),
              }),
            };
            break;
          }
          default:
            break;
        }
        if (
          rd ||
          (ds && Ve.type === "stream_event" && !zbe(Ve.event)) ||
          (Ct && Ve.type === "system" && Ve.subtype === "status" && Ve.status === "requesting")
        ) {
          if (!fu) yield* pu();
        }
        if (Ti.length > 0) yield* Ti;
        let Lm = getSessionId();
        if (Is)
          for (let Mt of toSdkMessages($o.session_id === Lm ? $o : { ...$o, session_id: Lm }, ig, Im)) {
            if (Mt.type === "assistant" && Ve.type === "assistant" && !("parent_tool_use_id" in Ve))
              Xa.onAssistantMessage(Ve);
            if (Mt.type === "stream_event" && Mt.parent_tool_use_id == null && isMarkerTextDelta(Mt.event)) {
              if (
                (ps.markFirstTextPainted("stream_event"),
                (El = !0),
                Ta === void 0 && e.trackFirstTextFrameUpload !== void 0)
              )
                Ta = e.trackFirstTextFrameUpload(Mt.uuid);
            } else if (
              Mt.type === "assistant" &&
              Mt.parent_tool_use_id == null &&
              collectReadNotificationsToolUseIds(Mt, LLt)
            )
              ps.markFirstTextPainted("message", Mt.message.id);
            if (
              nd === void 0 &&
              e.trackFirstFrameUpload !== void 0 &&
              Mt.type === "stream_event" &&
              Mt.parent_tool_use_id == null &&
              !zbe(Mt.event)
            )
              nd = e.trackFirstFrameUpload(Mt.uuid);
            let Ur =
                Mt.type === "assistant" && Mt.parent_tool_use_id == null
                  ? "assistant"
                  : Mt.type === "stream_event" && Mt.parent_tool_use_id == null && !zbe(Mt.event)
                    ? "stream_event"
                    : void 0,
              rr = Ur === void 0 ? void 0 : vn.fields();
            if (Ur !== void 0 && rr !== void 0 && rr.user_message_uuid !== Ka[Ur])
              ((Ka[Ur] = rr.user_message_uuid), yield { ...Mt, ...rr, ...ts });
            else if (Mt.type === "system" && Mt.subtype === "thinking_tokens") {
              let fields = vn.fields();
              yield fields === void 0 ? Mt : { ...Mt, user_message_uuid: fields.user_message_uuid };
            } else if (Mt.type === "system" && Mt.subtype === "status" && Mt.status === "requesting")
              yield withUserMessageUuids(Mt, vn);
            else ((Ja = Ur === "stream_event" && isTextOrJsonDeltaEvent(Ve)), yield Mt);
          }
        if (Su) yield* Ao("served");
        if (_u) return;
        if (Ve.type === "user" && ga !== void 0 && !uN(e.maxBudgetUsd)) {
          let Mt = env.MAX_STRUCTURED_OUTPUT_RETRIES ?? MAX_STRUCTURED_OUTPUT_RETRIES;
          if (countNamedToolUses(s, STRUCTUREDOUTPUT) + Za - Il >= Mt && vi.length === 0) {
            if (((Cn = !0), await Gr(on, permissionDenials), (_u = !0), Bi(pr, mr), to)) {
              if ((await pr.record(!0), qo)) await flushSessionStorage();
            }
            (ps.end("structured_output_retry_exhausted"),
              yield* Xa.closeAtTurnEnd(Es),
              yield* Ao("turn_end"),
              yield buildResultMessage({
                startedAt: startTime,
                common: {
                  is_error: !0,
                  duration_api_ms: getTotalAPIDuration(),
                  num_turns: mc,
                  stop_reason: Nd,
                  session_id: getSessionId(),
                  total_cost_usd: getTotalCostUSD(),
                  usage: Cr,
                  modelUsage: getModelUsage(),
                  permission_denials: permissionDenials,
                  terminal_reason: "structured_output_retry_exhausted",
                  fast_mode_state: getFastModeState(rs, is.fastMode),
                  fast_mode_disabled_reason:
                    getFastModeUnavailableReasonCode() ?? getFastRejectedReason(rs, is.fastMode) ?? void 0,
                  origin: Ie?.origin,
                  subagent_stats: buildFileHistorySnapshotChain(e.session),
                  safety_stops: getSafetyStops(),
                },
                variant: {
                  subtype: "error_max_structured_output_retries",
                  errors: [formatStructuredOutputFailure(Mt, Za, hasSuccessfulToolCallSince(s, at_2))],
                  ...vn.errorVariantFields(),
                  ...ts,
                },
              }));
            return;
          }
        }
      }
    } finally {
      if ((($n = Date.now()), (Fo = void 0), hr > 0))
        logForDebugging(
          `[headless] ${hr} streamed deltas went straight to output this turn (CLAUDE_CODE_PLAIN_DELTA_FAST_PATH)`,
          { level: "info" },
        );
      if ((ps.end(void 0, on.signal.aborted), ps.dispose(), !_u)) await Gr(on);
      if (!Cn) Bi(pr, mr);
      if ((await pr.settleFoldCopies("all"), wt.delete(ni), ba !== void 0))
        _n(
          "turn.complete",
          () =>
            raiseTurnComplete({
              turnEvents: St,
              turnId: ba,
              transcript: { getSnapshot: () => s },
              span: ni,
              durationMs: ua(startTime, performance.now()),
              isAborted: on.signal.aborted,
            }),
          void 0,
        );
      await jn(pr, ar, to, qo);
    }
  }
  async function Gr(It, Ie) {
    if (It === Ue) ie();
    try {
      while (!0) {
        let { value: on, done: Zn } = await He.next();
        if (Zn) return;
        if (on.type === "result") {
          Ie?.push(...on.permission_denials);
          return;
        }
      }
    } catch (error) {
      logForDebugging(
        `headless session: draining an abandoned turn failed: ${error instanceof Error ? error.message : String(error)}`,
        { level: "warn" },
      );
    }
  }
  function Bi(It, Ie) {
    It.flushUnanchoredPreservedTail();
    try {
      clearCutResults();
    } catch (error) {
      logError(error);
    }
    try {
      let on = stripToolResultsForStorage(s, Ie, 0, !0);
      if (on !== s) for (let Zn = 0; Zn < on.length; Zn++) s[Zn] = on[Zn];
    } catch (error) {
      logError(error);
    }
    oo(!0);
  }
  function Hi(It, Ie, on, Zn) {
    if ("timestamp" in It && "level" in It) {
      let Cr = withoutSessionId(It);
      if ((h.keep([Cr]), Zn)) (Ie.push(Cr), on.record());
      return;
    }
    let Nn;
    switch (It.subtype) {
      case "model_fallback":
        Nn = createModelFallbackSystemMessage(It);
        break;
      case "model_consent_fallback":
        Nn = createConsentFallbackMessage(It);
        break;
      case "model_refusal_no_fallback":
        Nn = createRefusalNoFallbackMessage(It);
        break;
      default:
        return;
    }
    if ((h.keep([Nn]), Zn)) Ie.push(Nn);
  }
  function ja(It, Ie, on) {
    if ((h.keep([It]), on))
      (Ie.push(It), logEvent("tengu_refusal_fallback_entry_recorded", { request_id: ye(It.requestId) }));
  }
  async function Qa(It, Ie, on) {
    let [Zn, Nn] = await loadSkillsAndPlugins(It.storageV5),
      Cr = getAppState(),
      mr;
    try {
      mr = Z5(Zn, Cr.mcp.commands);
    } catch (error) {
      (logError(error), (mr = Zn.filter((es) => es.loadedFrom !== "syncedSkills")));
    }
    let io;
    try {
      io = resolveLazy(e.capabilities);
    } catch (error) {
      (logError(error), (io = []));
    }
    return await buildSdkInitMessage({
      session: It.session,
      tools: It.tools,
      mcpClients: It.mcpClients,
      model: Ie,
      readSessionEffort: () => resolveEffortLevel(Cr),
      permissionMode: Cr.toolPermissionContext.mode,
      commands: It.commands,
      agents: It.agents,
      skills: mr,
      plugins: Nn,
      fastMode: on,
      proactivityState: Cr,
      capabilities: io,
      messagesInView: () => Us(s),
    });
  }
  return {
    submitMessage: No,
    interrupt: ie,
    setModel: (It) => {
      userSpecifiedModel = It;
    },
    getMessages: () => s,
    keepArrivedRows: kn,
    appendMessages: (It) => {
      if (Pn !== void 0) Pn.push(...It);
      else if (nn !== void 0) nn.push({ rows: It, isAnswered: !1 });
      else En(It);
    },
    appendsSettled: () => h.settled(),
    getReadFileState: () => readFileCache,
    dispose: () => {
      (Ket(),
        e.abortController?.signal.removeEventListener("abort", nt),
        Ue.abort(userAbortReason("remote-cancel")),
        Ee.done(),
        He.return(void 0).catch(logError),
        (s = []),
        (readFileCache = nv(ZC)),
        (w = new Map()),
        (L = new InstanceRegistry()),
        (q = Spe()),
        (Z = efe()));
    },
  };
}
//@ chunk-tyg7f3ek.js:483526-483578 layout
function ua(e, n) {
  return Math.max(0, Math.round(n - e));
}
/**
 * 发送时间相关遥测字段。
 */
//@ chunk-tyg7f3ek.js:483578-483926 layout
function postTimingFields(e, n, r) {
  try {
    let s = r?.postedAtMs,
      h = r?.enqueuedAtMs;
    if (!e || !s) return {};
    let y = r?.textRhythm;
    return {
      postMs: ua(n, s),
      ...(h !== void 0 && h !== 0 && { queueWaitMs: ua(h, s), queuedBehind: r?.queuedBehind }),
      ...(y !== void 0 &&
        y.posts > 0 &&
        !isDiskless() && {
          textPosts: y.posts,
          textPostGapsOver500Ms: y.gapsOver500Ms,
          flushTimerMaxLateMs: y.timerMaxLateMs,
        }),
    };
  } catch (error) {
    return (logError(error), {});
  }
}
/**
 * ask()：解析惰性配置（工具/MCP/命令/JSON schema 等可为函数），按 userSpecifiedModel 与权限模式决定主循环模型与 thinking，构建 headless 的 ToolUseContext（isNonInteractiveSession、runQuery=query 等）。
 */
//@ chunk-tyg7f3ek.js:483926-485753 fingerprint = ask (0.405)
function ask(sessionConfig, { abortController: abortController, userSpecifiedModel: userSpecifiedModel }) {
  let { getAppState: getAppState, setAppState: setAppState } = sessionConfig,
    tools = sessionConfig.refreshTools?.() ?? resolveLazy(sessionConfig.tools),
    mcpClients = sessionConfig.refreshMcpClients?.() ?? resolveLazy(sessionConfig.mcpClients),
    jsonSchema = resolveLazy(sessionConfig.jsonSchema),
    appState = getAppState(),
    { mainLoopModel: mainLoopModel, thinkingConfig: thinkingConfig } = resolveTurnModelAndThinking({
      userSpecifiedModel: userSpecifiedModel,
      permissionMode: appState.toolPermissionContext.mode,
      thinkingConfig: resolveLazy(sessionConfig.thinkingConfig),
    });
  return createHeadlessToolUseContext(
    {
      session: sessionConfig.session,
      messageQueue: sessionConfig.messageQueue,
      commands: resolveLazy(sessionConfig.commands),
      tools: tools,
      refreshTools: sessionConfig.refreshTools,
      toolCatalog: sessionConfig.toolCatalog,
      refreshMcpClients: sessionConfig.refreshMcpClients,
      verbose: sessionConfig.verbose ?? !1,
      fallbackModel: sessionConfig.fallbackModel,
      thinkingConfig: thinkingConfig,
      mcpClients: mcpClients,
      customSystemPrompt: resolveLazy(sessionConfig.customSystemPrompt),
      appendSystemPrompt: resolveLazy(sessionConfig.appendSystemPrompt),
      planModeInstructions: resolveLazy(sessionConfig.planModeInstructions),
      systemPromptSnapshot: resolveLazy(sessionConfig.systemPromptSnapshot),
      appendSubagentSystemPrompt: resolveLazy(sessionConfig.appendSubagentSystemPrompt),
      toolAliases: resolveLazy(sessionConfig.toolAliases),
      excludeDynamicSections: resolveLazy(sessionConfig.excludeDynamicSections),
      agents: resolveLazy(sessionConfig.agents),
      allowedAgentTypes: resolveLazy(sessionConfig.allowedAgentTypes),
      primitiveToolGrant: resolveLazy(sessionConfig.primitiveToolGrant),
      maxBudgetUsd: sessionConfig.maxBudgetUsd,
      messageClientPlatform: void 0,
      messageInboundOrigin: void 0,
      forwardSubagentText: resolveLazy(sessionConfig.forwardSubagentText) ?? !1,
      requiresStructuredOutput:
        jsonSchema !== void 0 && tools.some((q) => toolMatchesName(q, STRUCTUREDOUTPUT)),
      onPermissionDenial: () => {},
      requestDialog: sessionConfig.requestDialog,
      sessionState: sessionConfig.sessionState,
      getAppState: getAppState,
      setAppState: setAppState,
      setSDKStatus: sessionConfig.setSDKStatus,
      readFileState: sessionConfig.readFileCache,
      pendingNestedMemoryTriggers: sessionConfig.pendingNestedMemoryTriggers,
      sessionEnvVars: sessionConfig.sessionEnvVars ?? new Map(),
      toolState: sessionConfig.toolState ?? new InstanceRegistry(),
      memorySelector: sessionConfig.memorySelector ?? efe(),
      isolationLatch: sessionConfig.isolationLatch ?? _tt(),
      sessionHooks: sessionConfig.sessionHooks ?? Spe(),
      storageV5: sessionConfig.storageV5,
      credentials: sessionConfig.credentials,
    },
    {
      phase: "query",
      messages: [...(sessionConfig.initialMessages ?? [])],
      mainLoopModel: mainLoopModel,
      appState: appState,
      abortController: abortController,
      permissionLayers: void 0,
      activeSkill: void 0,
    },
  );
}
/**
 * 值是函数则调用取值，否则原样（配置项可惰性提供）。
 */
//@ chunk-tyg7f3ek.js:485753-485787 affinity
function resolveLazy(e) {
  return isFunction(e) ? e() : e;
}
/**
 * typeof 为 function。
 */
//@ chunk-tyg7f3ek.js:485787-485831 affinity
function isFunction(e) {
  return typeof e === "function";
}
/**
 * coordinator 用户上下文缓存（初始 null）。
 */
//@ chunk-18hwfzwa.js:1510660-1510734 fingerprint = getCoordinatorUserContext (0.572)
var getCoordinatorUserContext = require("./chunk-yxywkh50.js").getCoordinatorUserContext,
  coordinatorContextCache = null;

export { ask, QueryEngine, coordinatorContextCache, getCoordinatorUserContext };
