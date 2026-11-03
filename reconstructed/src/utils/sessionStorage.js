/**
 * utils/sessionStorage.ts
 *
 * 会话转录存储核心：projects/<清洗cwd>/<sessionId>.jsonl 的写入队列（Project 类）、记录类型策略、元数据记录、加载/建链、日志列表与 resume 查找、子代理转录与侧车、远程水合与迁移。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/utils/sessionStorage.ts
 * pieces: chunk-0j11jfmy.js (1), chunk-18hwfzwa.js (2), chunk-63641kq7.js (3), chunk-7dqf31r1.js (2), chunk-89ebz077.js (1), chunk-ad2e1aj6.js (1), chunk-bss4k1z9.js (1), chunk-cg2r2hy6.js (2), chunk-cgs3vg0v.js (1), chunk-dz3q485w.js (1), chunk-e6aww6q8.js (505), chunk-qzv7ezvq.js (19), chunk-rds552kq.js (1), chunk-wd9kxbpn.js (1), chunk-x753sk9t.js (8)
 * attribution: fingerprint 34, callgraph-fingerprint 6, placement 29, affinity 1, sole-consumer 1, layout 163, facade-majority 292, callgraph-witnessed 3, file-local 4, facade-exports 16
 */
import { resolve as resolve_2, join, dirname, basename, normalize, sep, isAbsolute, relative } from "path";
import {
  readFile,
  mkdir,
  writeFile,
  unlink,
  readdir,
  realpath,
  appendFile,
  open,
  stat,
  utimes,
  rename,
  lutimes,
  lstat,
  copyFile,
  rm as rm_2,
  link,
} from "fs/promises";
import { constants, createReadStream, openSync, fstatSync, writeSync, closeSync, readSync } from "fs";
import { randomBytes } from "crypto";
import { constants as constants_8 } from "os";
import { StringDecoder } from "string_decoder";
import { isAscii } from "buffer";
import { streamFallbackWarning } from "../services/api/streamFallbackWarning.js";
import { isUnavailableErrorCode, isUnavailableError } from "./settings/managedEnvKeys.js";
import {
  getErrnoCode,
  isFsInaccessible,
  isPathAbsent,
  isENOENT,
  errorMessage,
  isSyscallError,
  AbortError as AbortError_2,
  sanitizedErrnoLowerForTelemetry,
  withTelemetryMessage,
  isAbortError,
  TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS,
  isSadFsErrno,
  isEnvFsErrno,
  isWin32ReadEbadf,
  errnoShapedCode,
} from "./errors.js";
import {
  isStoreError,
  isAbsentParentError,
  formatStorageError,
  isUnsupportedStorageError,
  isByteViewUnsupportedError,
  isStoreFencedError,
  storageErrorCode,
} from "./storage/storageErrors.js";
import {
  stopSiblingExists,
  stopSiblingPath,
  stopSiblingCache,
  readStopSiblingCount,
  removeStopSibling,
  persistSubagentStop,
} from "./agentStopSiblings.js";
import { runWithFileWriteContext } from "./file.js";
import {
  isDiskless,
  getRootSession,
  getSessionId,
  isSessionPersistenceDisabled,
  getConversationAtisLatch,
  getConversationToolsUsed,
  getPromptId as getPromptId_2,
  getPlanSlugCache,
  registerCostStateRecorder,
  getOriginalCwd,
  switchSession,
  setConversationAtisLatch,
  getRestoredMemoryPause,
  setRestoredMemoryPause,
  setMemoryToggledOff,
  getRestoredAutoMemoryOff,
  setRestoredAutoMemoryOff,
  setAutoMemoryOffThisSession,
  getSessionProjectDir,
  getOriginalCwdOrNull,
} from "../bootstrap/state.js";
import { devModsDir } from "../plugins/functionHooks/devModsName.js";
import { isPlainObject as isPlainObject_5 } from "./isPlainObject.js";
import { formatDurationCoarse, formatFileSize } from "./format.js";
import { MAX_LOGS, sortLogs } from "../types/logs.js";
import { defineOwnProperty } from "./objectSafety.js";
import { createStore } from "../state/store.js";
import { SessionRootSlot } from "../bootstrap/sessionSlices.js";
import {
  isTranscriptMessage as isTranscriptMessage_3,
  fillMissingTranscriptFields,
  findResumedThinkingRanges,
} from "../cli/transports/ccrMessageMapping.js";
import {
  isCompactBoundaryOrSummary,
  dropLargeOriginalFile,
  isReorderedRow,
  extractTag,
  rememberMovedRow,
  isInterruptionOnlyMessage,
  isToolResultMessage,
  isHarnessMetaMessage,
  isShutdownInterrupted,
} from "./messages.js";
import { logEvent } from "../services/analytics/index.js";
import { fromEnum, lit as lit_2, fromEnumOpt } from "../services/analytics/safeMetadata.js";
import { isStorageV5Enabled } from "./hoverRest.js";
import {
  keyFromMetaPath,
  validateStorageKey,
  validateStorageScope,
  pathToSessionSideKey,
} from "./storage/storageKeys.js";
import {
  jsonParse,
  jsonStringify,
  toJsonLine,
  jsonlJoin,
  jsonParseRaw,
  clone,
  slowLogging,
} from "./slowOperations.js";
import {
  writeFileAtomic as writeFileAtomic_2,
  retryFsOp,
  O_NONBLOCK as O_NONBLOCK_2,
  writeIfMissing,
  assertPathSafeAsync,
  writeNewFile,
} from "./atomicPublishWrite.js";
import { logFeatureOk, logFeatureSad, logFeatureBad } from "../services/analytics/featureTelemetry.js";
import { logError } from "./log.js";
import { logForDebugging } from "./debug.js";
import { warnDisklessSettingsWrite } from "./settings/settingsStorage.js";
import { DoctorLazy } from "../cli/handlers/util.js";
import {
  create,
  create_2,
  create_3,
  create_6,
  create_20,
  create_12,
  create_25,
} from "../../vendor/zod/lib/index.mjs";
import { readAllPages } from "./pagedRead.js";
import {
  getFsImplementation,
  tailFile,
  FileChangedDuringReadError,
  readLinesReverse,
  hasUntouchableRecordSpellingAsync,
} from "./fsOperations.js";
import { env } from "./env.js";
import { isNestedInteractiveClaudeSession, isTeammate } from "./teammate.js";
import {
  envSessionKind,
  getRegisteredSessionName,
  isUnattendedInteractiveSession,
} from "./concurrentSessions.js";
import { getCwdOrNull } from "./cwd.js";
import { getBranch } from "./git.js";
import {
  PROGRAMMATIC_ENTRYPOINTS,
  LITE_READ_BUF_SIZE,
  extractLastJsonStringField,
  extractFieldFromLastEntryOfTypeStrict,
  buildHistorySuppressionEntry,
  canonicalizePath,
  transcriptMessagesStateV5,
  writeEntriesToJsonlFile,
  appendEntriesToJsonlFile,
  findProjectDir,
  hasPrefix,
  isUuidShaped,
  SKIP_PRECOMPACT_THRESHOLD,
  getProjectKey,
  legacyDerivedProjectKey,
  MAX_SANITIZED_LENGTH,
  MAX_LISTING_PAGES,
  dirBelongsToProject,
  findProjectDirs,
  listedProjectKey,
  sanitizePath,
  normalizePathForCwdCompare,
  recordedCwdIsWithinOwnWorktrees,
  slugCollisionGuardFoldsCase,
  recordedCwdCollidesWithProjectResolved,
  readHeadAndTail as readHeadAndTail_2,
  extractJsonStringField,
  extractFieldFromFirstEntryStrict,
  getPinnedProjectDir,
  getProjectsDir as getProjectsDir_3,
  readSessionLite,
  resolveSessionFilePath_2,
} from "./sessionStoragePortable.js";
import { STORAGE_SPACES, isValidKeySegment, areValidKeySegments } from "./storage/storageSpaces.js";
import { identity } from "./pathClassification.js";
import { uniq, count } from "./collections.js";
import { createSignal } from "./signal.js";
import { io } from "../../vendor/@mermaid-js/parser/dist/chunks/mermaid-parser.esm.min/chunk-L2OVAXIS.mjs";
import {
  createToolResultSlimmer_2,
  writeTranscriptFile,
  reportTranscriptWriteFailure,
  noteTranscriptWriteOk,
  slimCharsOf,
} from "./transcript/transcriptWriter.js";
import { HostScoped } from "./hostScoped.js";
import { isDiagLogging, isInDiagScope, logForDiagnosticsNoPII } from "./diagLogs.js";
import { withDeadline, raceWithAbortSignal } from "./sleep.js";
import { registerCleanup } from "./cleanupRegistry.js";
import {
  RequestBlobStore,
  clearAllReplayChains,
  isRequestBlobStoreEnabled,
  stripCacheControl as stripCacheControl_4,
  getToolResultDigests,
  setMarkerTextWriter,
} from "./transcriptRequestBlobs.js";
import { READ_LIMITS } from "./fsBoundRead.js";
import {
  getFirstLine,
  truncateToLength,
  sanitizeSessionTitle,
  repairMalformedStringsDeep,
} from "./stringUtils.js";
import {
  transcriptLines,
  tryAppendToTranscript,
  findContinuedInSessionId,
} from "./backgroundSessionResume.js";
import {
  stripLeadingNuls,
  deleteSessionTitleSidecar,
  transcriptStorageKeyForPath,
  removeTombstones,
  scanCompactBoundaries,
  makeLineEmitter,
  transcriptKeyFor,
  transcriptScopeForDir,
  contentHasBlockType,
  isAuxiliaryEntry,
  indexOrMax,
  mapKeysToIndex,
  buildChildrenIndex,
  collectLinearChain,
  writeSessionTitleSidecar,
  openTranscriptStream,
  isTranscriptLoadError,
  collectLeafUuids,
  isWin32TranscriptEbadf,
  WIN32_EBADF_TELEMETRY_MESSAGE,
  validatedTranscriptKey,
  findLastMessageTimestamp,
} from "./transcript/transcriptFiles.js";
import { isCompactBoundaryMessage as isCompactBoundaryMessage_3 } from "../services/projects/threadRows.js";
import { isShuttingDown, gracefulShutdownSync } from "./gracefulShutdown.js";
import { createKeyedQueue } from "./promiseQueue.js";
import { isSillyShoreGateOn, tagUntrustedArtifactContent } from "./messages/untrustedArtifactContent.js";
import {
  readTranscriptEntries,
  skipNuls,
  readEnvelopeSessionId,
  ArtifactLedgerCollector,
  CostStateEntrySchema,
  resetArtifactLedgerState,
  isLaptopMemoryAttachment,
} from "./transcript/entryTypes.js";
import { writeFully, WRITE_BUFFER_LIMIT_BYTES } from "../services/memorySync/syncFiles.js";
import { ATOMIC_WRITE_ERRNOS } from "./plugins/safeCopy.js";
import { refreshCheckoutMetadata } from "./git/repoCheckouts.js";
import {
  normalizeUuidOrNull,
  isSafeIdSegment,
  isSafeIdSegment_2,
  identityAgentId,
  identityAgentId2,
} from "./agentId.js";
import { isEnvTruthy, getProjectDirNameOverride, getClaudeConfigDir } from "./envUtils.js";
import { appendSessionLog, getSessionLogs } from "../services/api/sessionIngress.js";
import { NOFOLLOW_NONBLOCK_FLAGS } from "./fsFlags.js";
import { parseJSONL, bunJSONLParse } from "./json.js";
import {
  rememberValidatedTip,
  validatedTipOf,
  rememberHydrateNote,
  conversationChainOf,
  createRewindTracker,
  recordLoadReportFor,
  recordLoadReportSafely,
} from "./transcript/resumeLoadReport.js";
import { validateAgentMetadata, describeStorageError } from "./agentMetadata.js";
import { recordPhase, markResumeHydrateDelta, markResumeTranscriptScan } from "./startupTiming.js";
import { isRemoteManagedEnvironment, isRemoteEnvironmentAny } from "./remoteEnvironment.js";
import { shortHash } from "./shortHash.js";
import { renderPluginPromptColon } from "./messages/pluginPrompts.js";
import { flattenPastedBlocks } from "./pastedContent.js";
import { COMMAND_NAME, TICK } from "../constants/xml.js";
import { restoredTaskMarkSymbol } from "./messageKinds.js";
import { readSessionStartDate } from "./stats.js";
import {
  isFoamySpringEnabled,
  isSideMessagesEnabled,
  readGateTrueByDefault,
} from "../services/analytics/growthbookGates.js";
import { announceFirstTurnOnce } from "./transcript/resumeAnnouncements.js";
import { hasEmbeddedSearchTools_2 } from "./embeddedTools.js";
import { collectBlockFieldsByType, getToolResultIds } from "../services/api/claude.js";
import { withEndedByModel, getEndedByModel, isModelEndCheckSupported } from "../tasks/endedByModel.js";
import { slugifySessionName } from "./sessionAddresses.js";
import { settledYieldFor } from "./sessionNameUniqueness.js";
import { getWorktreePaths } from "./getWorktreePaths.js";
import { createRowRepairer } from "./transcript/transcriptRepair.js";
import { countToolCallsSince_2, restoreWireInputStamps } from "./wireToolInputEcho.js";
import { sanitizeStringList } from "../bridge/controlRequests.js";
import { limitConcurrency } from "./concurrencyLimit.js";
import { isExactReplToolName } from "../tools/REPLTool/constants.js";
import { resolveMessageAlias } from "./pollEvents/fold.js";
import { readCustomTitle } from "../cli/toolPermissionStream.js";
import { getPluginsDirectory } from "./plugins/pluginDirectories.js";
import { PathSpace } from "./resultError.js";
import { ce } from "../../vendor/react/cjs/react.production.js";
import { endsWithNumberedList } from "../components/FeedbackSurvey/SurveyHost.js";
import { useStoreSelector } from "../hooks/useStoreSelector.js";
import { getPlatform } from "./platform.js";
import { daemonTokensFile, daemonAuthDir } from "./sandbox/userNamespace.js";
import { spawnStatsSlots } from "../tasks/taskState.js";
import { sameRepoWorktrees, isSameRepoPath } from "../services/projects/repoContext.js";
import { getJobDir, readJobState } from "../services/daemon/jobState.js";
import { pickWorktreeFields } from "../services/agentStatus/jobClassifier.js";
import { writeStateAndBroadcast } from "../services/agentStatus/jobState.js";

//@ chunk-e6aww6q8.js:215483-215536 placement
/**
 * clearLastIngressUuid：清空按会话记录的最后入站 uuid。
 */
function clearLastIngressUuid() {
  streamFallbackWarning().lastIngressUuidBySession.clear();
}
//@ chunk-e6aww6q8.js:220628-220716 placement
/**
 * isUnavailableStoreError：存储不可用错误（含 cause 链）。
 */
function isUnavailableStoreError(e) {
  let cause = e instanceof Error ? e.cause : undefined;
  return isUnavailableErrorCode(getErrnoCode(e)) || (isStoreError(cause) && isUnavailableError(cause));
}
//@ chunk-e6aww6q8.js:220716-220758 placement
function stopSiblingExistsAt(agentMetadataPath, n, r) {
  return stopSiblingExists(stopSiblingPath(agentMetadataPath, n), r);
}
//@ chunk-e6aww6q8.js:220758-220842 placement
async function setAgentTranscriptSubdir_2(agentMetadataPath, n, r) {
  let s = stopSiblingPath(agentMetadataPath, n);
  stopSiblingCache.set(s, readStopSiblingCount(s) + 1);
  await runWithFileWriteContext(agentMetadataPath, () => removeStopSibling(s, r));
}
//@ chunk-e6aww6q8.js:220887-220972 placement
/**
 * isSessionFileAt：该路径是否为指定会话的转录文件。
 */
function isSessionFileAt(e, sessionId) {
  return (
    !isDiskless() &&
    /^[A-Za-z0-9_-]+$/.test(sessionId) &&
    resolve_2(e) === resolve_2(join(devModsDir(), sessionId))
  );
}
//@ chunk-e6aww6q8.js:220972-221079 placement
var DISK_TRANSCRIPT_LAG_PREFIX =
  "When this session resumed, the copy of this conversation on the container's disk lacked at least";
//@ chunk-e6aww6q8.js:221079-221757 placement
function findUnresolvedToolUse_2(events, resolvedEventIds, r) {
  let lastIndex = events.findLastIndex((w) =>
    [w.event_id, w.payload.uuid].some((L) => typeof L === "string" && resolvedEventIds.has(L)),
  );
  if (lastIndex === -1 && !r) return;
  let h = new Set();
  let oldestToolRowAt;
  let sliced = events.slice(lastIndex + 1);
  for (let { payload } of sliced) {
    let message = payload.message;
    let content = isPlainObject_5(message) ? message.content : undefined;
    let q = Array.isArray(content) ? content : [];
    for (let message of q.filter(isPlainObject_5)) {
      let Se =
        message.type === "tool_use"
          ? message.id
          : message.type === "tool_result"
            ? message.tool_use_id
            : undefined;
      if (typeof Se === "string") {
        if (h.size === 0 && typeof payload.timestamp === "string") oldestToolRowAt = payload.timestamp;
        h.add(Se);
      }
    }
  }
  return {
    rows: sliced.length,
    toolCalls: h.size,
    oldestToolRowAt,
    remindedBefore: sliced.some(({ payload }) => {
      let attachment = payload.attachment;
      let content =
        isPlainObject_5(attachment) && attachment.type === "critical_system_reminder"
          ? attachment.content
          : undefined;
      return typeof content === "string" && content.startsWith(DISK_TRANSCRIPT_LAG_PREFIX);
    }),
  };
}
//@ chunk-e6aww6q8.js:221757-222475 placement
function describeDiskTranscriptLag(e, n) {
  let timestamp = Date.parse(e.oldestToolRowAt ?? "");
  let s =
    timestamp <= n
      ? ` The oldest call or result that the disk's copy lacked is from ${new Date(timestamp).toISOString().slice(0, 16).replace("T", " ")} UTC, about ${formatDurationCoarse(n - timestamp)} before this session resumed.`
      : "";
  let h = e.remindedBefore
    ? " The disk has been behind like this before in this conversation. Changes that you make on this disk may be lost again. Tell the user this."
    : "";
  return `${DISK_TRANSCRIPT_LAG_PREFIX} ${e.toolCalls} of your recent tool calls, so the disk may be older than the conversation.${s} Files that those calls created or changed may be missing or out of date, and installed packages may be gone. Check the files that you need before you rely on them, and tell the user if work was lost.${h}`;
}
//@ chunk-e6aww6q8.js:222475-223602 placement
/**
 * 按转录消息顺序把文件历史快照与增量合成快照列表：同一消息的更新替换、增量合并或合成新快照，只保留最近若干个，被裁掉的部分折叠为基准状态。
 */
function buildFileHistorySnapshots(fileHistorySnapshots, fileHistoryDeltas, transcript) {
  let ops = [];
  let indexByMessageId = new Map();
  let nextIndex = 0;
  for (let q of transcript) {
    let Z = fileHistorySnapshots.get(q.uuid);
    if (Z) {
      let { snapshot, isSnapshotUpdate } = Z;
      let we = isSnapshotUpdate ? indexByMessageId.get(snapshot.messageId) : undefined;
      if (we === undefined) {
        indexByMessageId.set(snapshot.messageId, nextIndex);
        ops.push({
          kind: "append",
          index: nextIndex++,
          snapshot,
        });
      } else
        ops.push({
          kind: "replace",
          index: we,
          snapshot,
        });
    }
    for (let Se of fileHistoryDeltas.get(q.uuid) ?? []) {
      let ke = indexByMessageId.get(Se.snapshotMessageId);
      if (ke === undefined) {
        indexByMessageId.set(Se.snapshotMessageId, nextIndex);
        ops.push({
          kind: "synthesize",
          index: nextIndex++,
          delta: Se,
        });
      } else
        ops.push({
          kind: "merge",
          index: ke,
          delta: Se,
        });
    }
  }
  let max = Math.max(0, nextIndex - MAX_LOGS);
  let snapshots = [];
  let ownedIndexes = new Set();
  let baseState;
  for (let q of ops) {
    if (q.index < max) {
      baseState = foldSnapshotBase(baseState, q);
      continue;
    }
    let Z = q.index - max;
    switch (q.kind) {
      case "append":
        snapshots.push(q.snapshot);
        break;
      case "replace":
        snapshots[Z] = q.snapshot;
        ownedIndexes.delete(Z);
        break;
      case "synthesize":
        ownedIndexes.add(Z);
        snapshots.push({
          messageId: q.delta.snapshotMessageId,
          trackedFileBackups: {
            ...(Z > 0 ? snapshots[Z - 1].trackedFileBackups : baseState?.trackedFileBackups),
            [q.delta.trackingPath]: q.delta.backup,
          },
          timestamp: new Date(q.delta.timestamp),
        });
        break;
      case "merge": {
        let Se = snapshots[Z];
        if (!ownedIndexes.has(Z)) {
          Se = {
            ...Se,
            trackedFileBackups: {
              ...Se.trackedFileBackups,
            },
          };
          snapshots[Z] = Se;
          ownedIndexes.add(Z);
        }
        defineOwnProperty(Se.trackedFileBackups, q.delta.trackingPath, q.delta.backup);
        break;
      }
    }
  }
  return snapshots;
}
//@ chunk-e6aww6q8.js:223602-224004 placement
/**
 * 把被裁掉的文件历史快照操作折叠进基准状态（追加/替换取快照，合成/合并累加增量）。
 */
function foldSnapshotBase(baseState, n) {
  if ((n.kind === "replace" || n.kind === "merge") && n.index !== baseState?.index) return baseState;
  switch (n.kind) {
    case "append":
    case "replace":
      return {
        index: n.index,
        trackedFileBackups: n.snapshot.trackedFileBackups,
        owned: false,
      };
    case "synthesize":
    case "merge": {
      let r = baseState?.owned
        ? baseState.trackedFileBackups
        : {
            ...baseState?.trackedFileBackups,
          };
      defineOwnProperty(r, n.delta.trackingPath, n.delta.backup);
      return {
        index: n.index,
        trackedFileBackups: r,
        owned: true,
      };
    }
  }
}
//@ chunk-e6aww6q8.js:338564-338771 placement
class TranscriptWriterHealth {
  failuresByFile = new Map();
  failureSeq = 0;
  abandonedPaths = new Set();
  abandonedPrefixes = new Set();
  abandonedPendingPaths = new Set();
  latchingEnabled = true;
  firstWriteOkEmitted = false;
  liveServing = null;
  degradedStore = createStore(null);
}
//@ chunk-e6aww6q8.js:338771-338796 placement
var sessionStorageInitState = new SessionRootSlot(() => ({}));
//@ chunk-e6aww6q8.js:338796-338831 placement
function setStoragePort(port) {
  sessionStorageInitState.of(getRootSession()).port = port;
}
//@ chunk-e6aww6q8.js:338831-338873 placement
/**
 * storagePort：取存储端口。
 */
function storagePort() {
  return sessionStorageInitState.peek(getRootSession())?.port;
}
//@ chunk-e6aww6q8.js:338873-340008 layout
/**
 * 会话存储常量：CLI 版本、各种大小上限、合成用户文本（中断提示、标签开头）的正则。
 */
var CLI_VERSION =
  typeof {
    ISSUES_EXPLAINER: "report the issue at https://github.com/anthropics/claude-code/issues",
    PACKAGE_URL: "@anthropic-ai/claude-code",
    README_URL: "https://code.claude.com/docs/en/overview",
    VERSION: "2.1.316",
    FEEDBACK_CHANNEL: "https://github.com/anthropics/claude-code/issues",
    BUILD_TIME: "2026-10-30T23:28:13Z",
    GIT_SHA: "cd7ceb459c6864567b16a11f60101b24421475c1",
    HOOKS_WORKER_URL: import.meta.dir + "/./src/plugins/functionHooks/hooks-worker/hooks-worker.js",
    DD_SOURCEMAP_GROUP: "default",
  } !== "undefined"
    ? {
        ISSUES_EXPLAINER: "report the issue at https://github.com/anthropics/claude-code/issues",
        PACKAGE_URL: "@anthropic-ai/claude-code",
        README_URL: "https://code.claude.com/docs/en/overview",
        VERSION: "2.1.316",
        FEEDBACK_CHANNEL: "https://github.com/anthropics/claude-code/issues",
        BUILD_TIME: "2026-10-30T23:28:13Z",
        GIT_SHA: "cd7ceb459c6864567b16a11f60101b24421475c1",
        HOOKS_WORKER_URL: import.meta.dir + "/./src/plugins/functionHooks/hooks-worker/hooks-worker.js",
        DD_SOURCEMAP_GROUP: "default",
      }.VERSION
    : "unknown";
var MAX_TRANSCRIPT_READ_BYTES_2 = 52428800;
var MAX_SYNTHETIC_MESSAGE_BYTES = 2000000;
var MAX_TRANSCRIPT_TAIL_BYTES = 52428800;
var TRANSCRIPT_HEAD_BUFFER_BYTES = 4096;
var TRANSCRIPT_PAGE_BYTES = 1048576;
var MAX_PAGED_TRANSCRIPT_BYTES = 4194304;
var SYNTHETIC_USER_TEXT_PATTERN = /^(?:\s*<[a-z][\w-]*[\s>]|\[Request interrupted by user[^\]]*\])/;
//@ chunk-e6aww6q8.js:340008-340037 facade-majority
/**
 * 是否为转录消息类型（user/assistant/attachment/system，排除 fork_briefing 附件）。
 */
function isTranscriptMessage(e) {
  return isTranscriptMessage_3(e);
}
//@ chunk-e6aww6q8.js:340037-340075 layout
function isCompactOrCarriedMessage(e) {
  return isCompactBoundaryOrSummary(e) || isCarriedAttachment(e);
}
//@ chunk-e6aww6q8.js:340075-340113 layout
function isCarriedAttachment(e) {
  return isProjectsThreadAskAttachment(e) || isSessionCronCarryAttachment(e);
}
//@ chunk-e6aww6q8.js:340113-340202 layout
function isProjectsThreadAskAttachment(e) {
  return e.type === "attachment" && e.attachment?.type === "projects_thread_ask";
}
//@ chunk-e6aww6q8.js:340202-340290 layout
function isSessionCronCarryAttachment(e) {
  return e.type === "attachment" && e.attachment?.type === "session_cron_carry";
}
//@ chunk-e6aww6q8.js:340290-340400 facade-majority = isLegacyProgressEntry (0.8)
function isSyncedTranscriptEntry(entry) {
  return (
    typeof entry === "object" &&
    entry !== null &&
    "type" in entry &&
    "uuid" in entry &&
    typeof entry.uuid === "string" &&
    isTranscriptMessage(entry)
  );
}
//@ chunk-e6aww6q8.js:340400-340428 layout
function isPlainObject_3(e) {
  return isPlainObject_5(e);
}
//@ chunk-e6aww6q8.js:340428-341559 facade-majority
/**
 * 记录类型写入策略表：user/assistant/attachment/system/progress 为 dedup-transcript（按 uuid 去重，子代理写入自己的转录）；summary、custom-title、tag、last-prompt、file-history-snapshot 等元数据为 always；content-replacement、api-request*、fork-context-ref、observer-ref 为 route-by-agent（有 agentId 时写入子代理文件）。
 */
var ENTRY_APPEND_POLICY = {
  user: "dedup-transcript",
  assistant: "dedup-transcript",
  attachment: "dedup-transcript",
  system: "dedup-transcript",
  progress: "dedup-transcript",
  summary: "always",
  "custom-title": "always",
  "ended-by-model": "always",
  "continued-in": "always",
  "ai-title": "always",
  "last-prompt": "always",
  tag: "always",
  relocated: "always",
  "agent-name": "always",
  "agent-color": "always",
  "agent-setting": "always",
  "pr-link": "always",
  "frame-link": "always",
  "artifact-comment-monitor": "always",
  "artifact-autoreact-ledger": "always",
  "bridge-session": "always",
  "history-suppression": "always",
  "file-history-snapshot": "always",
  "file-history-delta": "always",
  "attribution-snapshot": "always",
  mode: "always",
  "permission-mode": "always",
  "isolation-latch": "always",
  "dev-mods": "always",
  "memory-mode": "always",
  "atis-latch": "always",
  "tools-used": "always",
  "worktree-state": "always",
  "cost-state": "always",
  "queue-operation": "always",
  "content-replacement": "route-by-agent",
  "api-request-shape": "route-by-agent",
  "api-request-blob": "route-by-agent",
  "api-request": "route-by-agent",
  "fork-context-ref": "route-by-agent",
  "observer-ref": "route-by-agent",
};
var COMPACT_MIN_FILE_BYTES = 5242880;
var ENTRY_APPEND_POLICY_2 = 20971520;
var SESSION_ENTRY_APPEND_POLICY = 8 * ENTRY_APPEND_POLICY_2;
var SESSION_ENTRY_APPEND_POLICY_2 = 0.1;
//@ chunk-e6aww6q8.js:341559-341607 layout
function forceGcIfBun(e) {
  if (e && typeof Bun !== "undefined") Bun.gc(true);
}
//@ chunk-e6aww6q8.js:341607-341640 layout
function isLowYieldCompaction(e, n) {
  return n < e * SESSION_ENTRY_APPEND_POLICY_2;
}
//@ chunk-e6aww6q8.js:341640-341690 facade-majority
function setLowYieldCompactSkipForTesting(lowYieldCompactSkipEnabled) {
  currentTranscriptStore().lowYieldCompactSkipEnabled = lowYieldCompactSkipEnabled;
}
//@ chunk-e6aww6q8.js:341690-341732 facade-majority
function setTranscriptLocalGcEnabled(e) {
  currentTranscriptStore().setLocalGcEnabled(e);
}
//@ chunk-e6aww6q8.js:341732-341782 facade-majority
function setToolResultCopiesOnDisk(e) {
  currentTranscriptStore().setToolResultCopiesOnDisk(e);
}
//@ chunk-e6aww6q8.js:341782-341830 facade-majority
function getSessionRowsOffDisk() {
  return getProject().sessionRowsOffDisk();
}
//@ chunk-e6aww6q8.js:341830-341882 facade-majority
function setKeepSessionMessagesCache(e) {
  currentTranscriptStore().setKeepSessionMessagesCache(e);
}
//@ chunk-e6aww6q8.js:341882-341924 facade-majority = countUnseenAssistantTurns (1)
function isChainParticipant(e) {
  return e.type !== "progress";
}
//@ chunk-e6aww6q8.js:341924-342084 facade-majority
function transcriptCursorEnd(e, n, r) {
  if (!r) return e.length;
  for (let s = n; s < e.length; s++) {
    let h = e[s];
    if (h.type === "assistant" && h.message.stop_reason === null) return s;
  }
  return e.length;
}
//@ chunk-e6aww6q8.js:342084-342203 layout
function logLegacyProgressProbe(e) {
  if (!currentTranscriptStore().claimLegacyProgressProbe(e)) return;
  logEvent("tengu_dead_probe_legacy_progress_bridge", {
    signal: fromEnum(e),
  });
}
//@ chunk-e6aww6q8.js:342203-342327 fingerprint = isLegacyProgressEntry (1)
function isLegacyProgressEntry(entry) {
  return (
    typeof entry === "object" &&
    entry !== null &&
    "type" in entry &&
    entry.type === "progress" &&
    "uuid" in entry &&
    typeof entry.uuid === "string"
  );
}
//@ chunk-e6aww6q8.js:342327-342471 fingerprint = EPHEMERAL_PROGRESS_TYPES (0.656)
var EPHEMERAL_PROGRESS_TYPES = new Set([
  "bash_progress",
  "powershell_progress",
  "mcp_progress",
  ...[],
  "tool_heartbeat",
  "agent_api_retry",
  "artifact_publish_retry",
  ...[],
]);
//@ chunk-e6aww6q8.js:342471-342532 facade-majority
function isEphemeralToolProgress(dataType) {
  return typeof dataType === "string" && (EPHEMERAL_PROGRESS_TYPES.has(dataType) || false);
}
//@ chunk-e6aww6q8.js:342532-342589 facade-majority
function getMaterializedSessionFile() {
  return currentTranscriptStore().project?.sessionFilePath ?? null;
}
//@ chunk-e6aww6q8.js:342589-342616 facade-majority
function locateMaterializedSessionFile() {
  return getMaterializedSessionFile();
}
//@ chunk-e6aww6q8.js:342616-342650 facade-majority
function hasMaterializedSessionFile() {
  return getMaterializedSessionFile() !== null;
}
//@ chunk-e6aww6q8.js:342650-342720 facade-majority
function hasRecordedUserPrompt() {
  return currentTranscriptStore().project?.currentSessionLastPrompt !== undefined;
}
//@ chunk-e6aww6q8.js:342720-342802 facade-majority = getErrorsPath (1)
/**
 * 某会话的转录路径：当前会话返回已绑定的会话文件，否则 <当前项目目录>/<sessionId>.jsonl。
 */
function getTranscriptPathForSession(e) {
  if (e === getSessionId()) return getMaterializedSessionFile() ?? getTranscriptPath();
  let projectDir = resolveProjectDir();
  return join(projectDir, `${e}.jsonl`);
}
//@ chunk-e6aww6q8.js:342802-342831 facade-majority
function locateTranscriptForSession(e) {
  return getTranscriptPathForSession(e);
}
//@ chunk-e6aww6q8.js:342831-342881 facade-majority
var MAX_TRANSCRIPT_READ_BYTES = 52428800;
var INDEX_HEAD_SCAN_BYTES = 256;
var INDEX_BOUNDARY_SCAN_BYTES = 4096;
var INDEX_LAST_PROMPT_SCAN_BYTES = 1024;
var LAST_PROMPT_PREFIX_SCAN_BYTES = 64;
//@ chunk-e6aww6q8.js:342881-342943 facade-majority = getAgentMetadataPath (1)
function getAgentMetadataPath(agentId) {
  return getAgentTranscriptPath(agentId).replace(/\.jsonl$/, ".meta.json");
}
//@ chunk-e6aww6q8.js:342943-343074 facade-majority
var RESERVED_AGENT_METADATA_FIELDS = [
  "isObserver",
  "observerStopped",
  "observerTaskId",
  "armingPermissionMode",
  "revivedAt",
];
var AGENT_METADATA_FIELDS = [...RESERVED_AGENT_METADATA_FIELDS, "restartResumes", "model"];
//@ chunk-e6aww6q8.js:343074-343475 facade-majority = readAgentMetadata (0.393)
async function readAgentMetadataAtPath(e, n, r = isFsInaccessible) {
  if (isStorageV5Enabled() && n !== undefined) {
    let path = keyFromMetaPath(e);
    if (path !== undefined) {
      let y = await n.read([path]);
      if (!y.ok)
        throw Error("readAgentMetadataAtPath: storage read failed", {
          cause: y.error,
        });
      let [S] = y.value.items;
      if (!S.found) return null;
      return jsonParse(Buffer.from(S.value).toString("utf-8"));
    }
  }
  let s = worktreeFromProgress(e);
  if (s === undefined) return null;
  try {
    let raw = await readFile(s, "utf-8");
    return jsonParse(raw);
  } catch (error) {
    if (r(error)) return null;
    throw error;
  }
}
//@ chunk-e6aww6q8.js:343475-345781 layout
/**
 * 写子代理元数据侧车 agent-<id>.meta.json（agentType、observer 状态等），已有内容时合并。
 */
async function persistAgentMetadata(e, n, sessionId, s, h = false) {
  let y = n;
  let all = RESERVED_AGENT_METADATA_FIELDS.every((Se) => n[Se] !== undefined);
  let w = null;
  try {
    w = await readAgentMetadataAtPath(e, s);
  } catch (error) {
    if (!all || h) throw error;
  }
  if (w) {
    if (h) return;
    for (let Se of AGENT_METADATA_FIELDS)
      if (n[Se] === undefined && w[Se] !== undefined)
        y = {
          ...y,
          [Se]: w[Se],
        };
    if (w.pluginSteered === true)
      y = {
        ...y,
        pluginSteered: true,
      };
  }
  let L = isStorageV5Enabled() && s !== undefined ? keyFromMetaPath(e) : undefined;
  if (s !== undefined && L !== undefined) {
    let Se = await s.write(L, jsonStringify(y), {
      mode: 438 & ~process.umask(),
    });
    if (!Se.ok)
      throw Error("persistAgentMetadata: storage write failed", {
        cause: Se.error,
      });
  } else {
    assertDiskWritable("agent_metadata", e);
    await mkdir(dirname(e), {
      recursive: true,
    });
    await writeFileAtomic_2(e, jsonStringify(y));
  }
  let replaced = e.replace(/\.meta\.json$/, ".jsonl");
  getProject().fireMirror(replaced, [
    {
      type: "agent_metadata",
      agentType: y.agentType,
      ...(y.isFork !== undefined && {
        isFork: y.isFork,
      }),
      ...(y.isBuiltIn !== undefined && {
        isBuiltIn: y.isBuiltIn,
      }),
      ...(y.worktreePath && {
        worktreePath: y.worktreePath,
      }),
      ...(y.worktreeBranch && {
        worktreeBranch: y.worktreeBranch,
      }),
      ...(y.cwd && {
        cwd: y.cwd,
      }),
      ...(y.spawnMode && {
        spawnMode: y.spawnMode,
      }),
      ...(y.description && {
        description: y.description,
      }),
      ...(y.workflowPhase && {
        workflowPhase: y.workflowPhase,
      }),
      ...(y.name && {
        name: y.name,
      }),
      ...(y.toolUseId && {
        toolUseId: y.toolUseId,
      }),
      ...false,
      ...(y.parentAgentId && {
        parentAgentId: y.parentAgentId,
      }),
      ...(y.stoppedByUser && {
        stoppedByUser: true,
      }),
      ...(y.finished && {
        finished: true,
      }),
      ...(y.spawnDepth !== undefined && {
        spawnDepth: y.spawnDepth,
      }),
      ...(y.requestShape && {
        requestShape: y.requestShape,
      }),
      ...(y.requestNonInteractive !== undefined && {
        requestNonInteractive: y.requestNonInteractive,
      }),
      ...(y.taskKind && {
        taskKind: y.taskKind,
      }),
      ...(y.teamName && {
        teamName: y.teamName,
      }),
      ...(y.color && {
        color: y.color,
      }),
      ...(y.planModeRequired !== undefined && {
        planModeRequired: y.planModeRequired,
      }),
      ...(y.customAgentType && {
        customAgentType: y.customAgentType,
      }),
      ...(y.spawnedAgentType && {
        spawnedAgentType: y.spawnedAgentType,
      }),
      ...(y.effort && {
        effort: y.effort,
      }),
      ...(y.permissionMode && {
        permissionMode: y.permissionMode,
      }),
      ...(y.launchedWithDefaults === true && {
        launchedWithDefaults: true,
      }),
      ...Object.fromEntries(
        AGENT_METADATA_FIELDS.filter((Se) => y[Se] !== undefined).map((Se) => [Se, y[Se]]),
      ),
      ...(y.pluginSteered === true && {
        pluginSteered: true,
      }),
    },
  ]);
  let project = getProject();
  let Z = /^agent-(.+)\.meta\.json$/.exec(basename(e))?.[1];
  if (Z !== undefined && !h && project.keepsAgentMetadataInStream())
    project
      .mirrorWorkerEvent(
        "agent_metadata",
        {
          ...y,
          type: "agent_metadata",
        },
        {
          sessionId,
          agentId: Z,
        },
      )
      .then(
        (Se) => {
          if (Se) logFeatureOk("subagent_sidecar_to_stream");
          else logFeatureSad("subagent_sidecar_to_stream", "withheld");
        },
        (error) => {
          logFeatureBad("subagent_sidecar_to_stream", "send_failed");
          logError(error);
        },
      );
}
//@ chunk-e6aww6q8.js:345781-345866 facade-majority
async function writeAgentMetadata(e, n, r, s = false) {
  let sessionId = pinSessionId(getSessionId());
  let agentMetadataPath = getAgentMetadataPath(e);
  await runWithFileWriteContext(agentMetadataPath, () =>
    persistAgentMetadata(agentMetadataPath, n, sessionId, r, s),
  );
}
//@ chunk-e6aww6q8.js:345866-345947 facade-majority
async function updateAgentMetadata(e, n, storageV5, isPathAbsent) {
  let h = pinSessionId(getSessionId());
  let agentMetadataPath = getAgentMetadataPath(e);
  await runWithFileWriteContext(agentMetadataPath, () =>
    mergeAgentMetadataUnderLock(agentMetadataPath, n, h, storageV5, isPathAbsent),
  );
}
//@ chunk-e6aww6q8.js:345947-346187 facade-majority
async function mergeAgentMetadataUnderLock(agentMetadataPath, n, sessionId, s, h, y) {
  let S = (await readAgentMetadataAtPath(agentMetadataPath, s, h)) ?? y;
  if (!S && n.agentType === undefined) {
    logForDebugging(
      `[updateAgentMetadata] dropped patch for ${agentMetadataPath}: no existing sidecar and patch lacks agentType`,
    );
    return false;
  }
  let w = {
    ...S,
    ...n,
  };
  await persistAgentMetadata(agentMetadataPath, w, sessionId, s);
  return true;
}
//@ chunk-e6aww6q8.js:346187-346250 layout
function canPersistAgentMetadata(agentMetadataPath, n) {
  return (
    !isDiskless() ||
    (isStorageV5Enabled() && n !== undefined && keyFromMetaPath(agentMetadataPath) !== undefined)
  );
}
//@ chunk-e6aww6q8.js:346250-346497 facade-majority
function landAgentStop(e, n, r, s, h) {
  return (async () => {
    let y = pinSessionId(getSessionId());
    let agentMetadataPath = getAgentMetadataPath(e);
    if (!canPersistAgentMetadata(agentMetadataPath, s)) {
      logForDebugging(`[agent stop] ${n} not kept for ${e}: diskless, and no store for its sidecar`);
      warnDisklessSettingsWrite("agent_metadata", agentMetadataPath);
      return;
    }
    await persistSubagentStop(
      agentMetadataPath,
      n,
      r,
      () =>
        mergeAgentMetadataUnderLock(
          agentMetadataPath,
          {
            [n]: true,
          },
          y,
          s,
        ),
      s,
      h,
    );
  })().catch(logError);
}
//@ chunk-e6aww6q8.js:346497-346646 facade-majority
function landStoppedByUser(e, agentType, storageV5) {
  return landAgentStop(
    e,
    "stoppedByUser",
    async () => {
      let s = pinSessionId(getSessionId());
      let agentMetadataPath = getAgentMetadataPath(e);
      await runWithFileWriteContext(agentMetadataPath, () =>
        mergeAgentMetadataUnderLock(
          agentMetadataPath,
          {
            stoppedByUser: true,
          },
          s,
          storageV5,
          isPathAbsent,
          {
            agentType,
          },
        ),
      );
    },
    storageV5,
  );
}
//@ chunk-e6aww6q8.js:346646-346695 facade-majority
async function hasAgentStopSibling(e, n, storageV5) {
  return stopSiblingExistsAt(getAgentMetadataPath(e), n, storageV5);
}
//@ chunk-e6aww6q8.js:346695-346743 facade-majority
async function clearAgentStopSibling(e, n, storageV5) {
  await setAgentTranscriptSubdir_2(getAgentMetadataPath(e), n, storageV5);
}
//@ chunk-e6aww6q8.js:346743-346791 facade-majority
async function readAgentMetadata(e, storageV5, isPathAbsent) {
  return readAgentMetadataAtPath(getAgentMetadataPath(e), storageV5, isPathAbsent);
}
//@ chunk-e6aww6q8.js:346791-347245 layout
/**
 * REMOTE_TASK_ID_PATTERN：远程任务 id 格式；REMOTE_TASK_ENTRY_SCHEMA：远程任务条目 schema（同一声明共 2 个绑定）。
 */
var REMOTE_TASK_ID_PATTERN_2 = /^r[0-9a-z]{8}$/;
var REMOTE_TASK_ID_PATTERN = /^(?!\.\.?$)[^\\/?#%\x00-\x20\x7f]+$/;
var REMOTE_TASK_ENTRY_SCHEMA = DoctorLazy(() =>
  create({
    taskId: create_2().regex(REMOTE_TASK_ID_PATTERN_2),
    remoteTaskType: create_2(),
    sessionId: create_2().regex(REMOTE_TASK_ID_PATTERN),
    title: create_2(),
    command: create_2(),
    spawnedAt: create_3(),
    toolUseId: create_2().optional(),
    runId: create_2().optional(),
    isLongRunning: create_6().optional(),
    isUltraplan: create_6().optional(),
    isRemoteReview: create_6().optional(),
    applyFixesOnComplete: create_6().optional(),
    reviewInstructions: create_2().optional(),
    remoteTaskMetadata: create_20(create_12()).optional(),
  }).passthrough(),
);
//@ chunk-e6aww6q8.js:347245-347304 fingerprint = getRemoteAgentsDir (1)
function getRemoteAgentsDir() {
  let projectDir = resolveSessionProjectDir();
  return join(projectDir, getSessionId(), "remote-agents");
}
//@ chunk-e6aww6q8.js:347304-347367 fingerprint = getRemoteAgentMetadataPath (1)
function getRemoteAgentMetadataPath(taskId) {
  return join(getRemoteAgentsDir(), `remote-agent-${taskId}.meta.json`);
}
//@ chunk-e6aww6q8.js:347367-347694 facade-majority = writeRemoteAgentMetadata (0.137)
async function writeRemoteAgentMetadata(taskId, metadata, storageV5) {
  let path = getRemoteAgentMetadataPath(taskId);
  if (!isDiskless())
    await mkdir(dirname(path), {
      recursive: true,
    });
  if (isStorageV5Enabled() && storageV5 !== undefined) {
    let h = keyFromMetaPath(path);
    if (h !== undefined) {
      let y = await storageV5.write(h, jsonStringify(metadata), {
        publishDiscipline: "inPlace",
      });
      if (!y.ok)
        throw Error("writeRemoteAgentMetadata: storage write failed", {
          cause: y.error,
        });
      return;
    }
  }
  assertDiskWritable("remote_agent_metadata", path);
  await writeFile(path, jsonStringify(metadata));
}
//@ chunk-e6aww6q8.js:347694-347984 facade-majority
async function deleteRemoteAgentMetadata(taskId, storageV5) {
  let remoteAgentMetadataPath = getRemoteAgentMetadataPath(taskId);
  if (isStorageV5Enabled() && storageV5 !== undefined) {
    let h = keyFromMetaPath(remoteAgentMetadataPath);
    if (h !== undefined) {
      let y = await storageV5.delete(h);
      if (!y.ok)
        throw Error("deleteRemoteAgentMetadata: storage delete failed", {
          cause: y.error,
        });
      return;
    }
  }
  let s = worktreeFromProgress(remoteAgentMetadataPath);
  if (s === undefined) return;
  try {
    await unlink(s);
  } catch (error) {
    if (isFsInaccessible(error)) return;
    throw error;
  }
}
//@ chunk-e6aww6q8.js:347984-348089 facade-majority = removeRemoteAgentMetadata (1)
/**
 * 删除远程代理任务的本地元数据（失败只记日志）。
 */
async function removeRemoteAgentMetadata(taskId, storageV5) {
  try {
    await deleteRemoteAgentMetadata(taskId, storageV5);
  } catch (e) {
    logForDebugging(`removeRemoteAgentMetadata failed: ${String(e)}`);
  }
}
//@ chunk-e6aww6q8.js:348089-348779 facade-majority = listRemoteAgentMetadata (0.645)
async function listRemoteAgentMetadata(storageV5) {
  let dir = getRemoteAgentsDir();
  if (isStorageV5Enabled() && storageV5 !== undefined) {
    let y = keyFromMetaPath(join(dir, "probe.meta.json"));
    if (y !== undefined && y.namespace === "sidecar")
      return listRemoteAgentMetadataViaStorage(storageV5, {
        namespace: "sidecar",
        projectKey: y.projectKey,
        sessionId: y.sessionId,
        relPath: y.relPath.slice(0, -1),
      });
  }
  let r = worktreeFromProgress(dir);
  if (r === undefined) return [];
  let entries;
  try {
    entries = await readdir(r, {
      withFileTypes: true,
    });
  } catch (e) {
    if (isFsInaccessible(e)) return [];
    throw e;
  }
  let results = [];
  for (let entry of entries) {
    if (!entry.isFile() || !entry.name.endsWith(".meta.json")) continue;
    try {
      let raw = await readFile(join(r, entry.name), "utf-8");
      let w = REMOTE_TASK_ENTRY_SCHEMA().safeParse(jsonParse(raw));
      if (!w.success) {
        logForDebugging(`listRemoteAgentMetadata: skipping ${entry.name}: ${String(w.error)}`);
        continue;
      }
      results.push(w.data);
    } catch (e) {
      logForDebugging(`listRemoteAgentMetadata: skipping ${entry.name}: ${String(e)}`);
    }
  }
  return results;
}
//@ chunk-e6aww6q8.js:348779-349705 layout
async function listRemoteAgentMetadataViaStorage(e, n) {
  let r = [];
  let allPages = await readAllPages(
    (S) =>
      e.listEntries(n, {
        skipKeyStats: true,
        skipScopeStats: true,
        ...(S !== undefined && {
          cursor: S,
        }),
      }),
    (S) => {
      for (let w of S)
        if (
          w.kind === "key" &&
          w.key.namespace === "sidecar" &&
          w.key.relPath.length === n.relPath.length + 1 &&
          w.key.relPath[n.relPath.length].endsWith(".meta.json")
        )
          r.push(w.key);
    },
  );
  if (allPages.status !== "done") {
    if (allPages.status === "error")
      logForDebugging(
        `listRemoteAgentMetadata: listing failed via storage (${allPages.error.code}) \u2014 empty restore`,
      );
    return [];
  }
  if (r.length === 0) return [];
  let text = await e.readText(r);
  if (!text.ok) {
    logForDebugging(
      `listRemoteAgentMetadata: read failed via storage (${text.error.code}) \u2014 empty restore`,
    );
    return [];
  }
  let y = [];
  text.value.items.forEach((item, w) => {
    let last = r[w].relPath.at(-1);
    if (!item.found) return;
    try {
      let G = REMOTE_TASK_ENTRY_SCHEMA().safeParse(jsonParse(item.value));
      if (!G.success) {
        logForDebugging(`listRemoteAgentMetadata: skipping ${last}: ${String(G.error)}`);
        return;
      }
      y.push(G.data);
    } catch (error) {
      logForDebugging(`listRemoteAgentMetadata: skipping ${last}: ${String(error)}`);
    }
  });
  return y;
}
//@ chunk-e6aww6q8.js:349705-349820 facade-majority = sessionIdExists (1)
/**
 * 当前项目目录下是否存在 <sessionId>.jsonl。
 */
function sessionIdExists(sessionId) {
  if (isDiskless()) return false;
  let projectDir = resolveSessionProjectDir();
  let sessionFile = join(projectDir, `${sessionId}.jsonl`);
  let fs = getFsImplementation();
  try {
    fs.statSync(sessionFile);
    return true;
  } catch {
    return false;
  }
}
//@ chunk-e6aww6q8.js:349820-349854 facade-majority = getEnvironmentForGrowthBook (1)
function getNodeEnv() {
  return "production";
}
//@ chunk-e6aww6q8.js:349854-349888 facade-majority
function isTranscriptPersistenceDisabled() {
  return getPersistenceSuppressionCause() !== null;
}
//@ chunk-e6aww6q8.js:349888-350115 facade-majority
function getPersistenceSuppressionCause() {
  if (getNodeEnv() === "test" && !env.TEST_ENABLE_SESSION_PERSISTENCE) return "test_env";
  if (isSessionPersistenceDisabled()) return "explicit_disable";
  if (env.CLAUDE_CODE_SKIP_PROMPT_HISTORY) return "skip_prompt_history";
  if (isNestedInteractiveClaudeSession()) return "nested_marker";
  return null;
}
//@ chunk-e6aww6q8.js:350115-350229 facade-majority
function transcriptStamp(sessionId) {
  return {
    sessionKind: envSessionKind(),
    userType: getUserType(),
    entrypoint: entrypointEnv(),
    cwd: getCwdOrNull() ?? undefined,
    sessionId,
    version: CLI_VERSION,
  };
}
//@ chunk-e6aww6q8.js:350229-350311 layout
function transcriptVersion(e) {
  return "version" in e && typeof e.version === "string" ? e.version : undefined;
}
//@ chunk-e6aww6q8.js:350311-350371 layout
function transcriptVersionOrDefault(e) {
  return transcriptVersion(e) ?? ("sessionId" in e ? undefined : CLI_VERSION);
}
//@ chunk-e6aww6q8.js:350371-350415 facade-majority
function withVersionToRecord(e) {
  return {
    ...e,
    version: transcriptVersionOrDefault(e),
  };
}
//@ chunk-e6aww6q8.js:350415-350447 facade-majority
function getUserType() {
  return "external";
}
//@ chunk-e6aww6q8.js:350447-350504 layout
function entrypointEnv() {
  return process.env.CLAUDE_CODE_ENTRYPOINT;
}
//@ chunk-e6aww6q8.js:350504-350646 layout
async function transcriptContextFields() {
  let e = entrypointEnv();
  return {
    cwd: getCwdOrNull() ?? undefined,
    gitBranch: await getBranch().catch(() => {
      return;
    }),
    entrypoint: e !== undefined && PROGRAMMATIC_ENTRYPOINTS.has(e) ? undefined : e,
  };
}
//@ chunk-e6aww6q8.js:350646-350670 facade-majority
function isCustomTitleEnabled() {
  return true;
}
//@ chunk-e6aww6q8.js:350670-350697 layout
var SESSION_ALIASES_DIR = ".session-aliases";
//@ chunk-e6aww6q8.js:350697-350904 layout
function sessionAliasStorageTarget(projectDir, n) {
  if (!isStorageV5Enabled() || n === undefined || dirname(projectDir) !== getProjectsDir()) return;
  let r = basename(projectDir);
  let s = STORAGE_SPACES.sessionAliases(r);
  let h = {
    namespace: "transcript",
    projectKey: r,
  };
  return validateStorageKey(s) === undefined && validateStorageScope(h) === undefined
    ? {
        backend: n,
        key: s,
        folder: h,
      }
    : undefined;
}
//@ chunk-e6aww6q8.js:350904-351398 layout
/**
 * 经存储后端把会话别名追加到别名记录（已存在则跳过）；目录不存在时先建作用域再重试，失败只记日志。
 */
async function appendSessionAliasViaStorage(e, sessionProjectDir, projectDir) {
  let s = () =>
    e.backend.updateText(
      e.key,
      (y) =>
        y !== undefined &&
        y.value
          .split(
            `
`,
          )
          .includes(sessionProjectDir)
          ? {
              skip: true,
            }
          : {
              write:
                (y?.value ?? "") +
                sessionProjectDir +
                `
`,
            },
      {
        publishDiscipline: "inPlace",
        mode: 384,
      },
    );
  let h = await s();
  if (!h.ok && isAbsentParentError(h.error)) {
    let y = await e.backend.ensureScope(e.folder);
    if (!y.ok) {
      let S = transcriptMkdirFailedError(y.error);
      if (isFsInaccessible(S)) {
        logForDebugging(
          `recordSessionAlias: mkdir failed for ${join(projectDir, SESSION_ALIASES_DIR)}: ${S}`,
        );
        return;
      }
      logError(S);
      return;
    }
    h = await s();
  }
  if (!h.ok)
    logForDebugging(`recordSessionAlias: update failed via storage (${formatStorageError(h.error)})`, {
      level: "error",
    });
}
//@ chunk-e6aww6q8.js:351398-352397 facade-majority
async function recordSessionAlias(e, storageV5) {
  if (isTranscriptPersistenceDisabled()) return;
  let r = e;
  try {
    if (isStorageV5Enabled() && storageV5 !== undefined) {
      let w = await makeWorkspaceRealPath(storageV5)(e);
      if (w.ok && w.value.found) r = identity(w.value.path);
      else if (!w.ok)
        logForDebugging(`recordSessionAlias: realpath failed for ${e}: ${formatStorageError(w.error)}`, {
          level: isUnsupportedStorageError(w.error) ? "debug" : "error",
        });
    } else if (!isDiskless()) r = identity(await realpath(e));
  } catch (error) {
    if (!isENOENT(error))
      logForDebugging(`recordSessionAlias: realpath failed for ${e}: ${error}`, {
        level: "error",
      });
  }
  let sessionProjectDir = resolveSessionProjectDir();
  let projectDir = getProjectDir(r);
  if (projectDir === sessionProjectDir) return;
  let y = sessionAliasStorageTarget(projectDir, storageV5);
  if (y !== undefined) {
    try {
      await appendSessionAliasViaStorage(y, sessionProjectDir, projectDir);
    } catch (error) {
      logForDebugging(`recordSessionAlias: update threw via storage: ${error}`);
    }
    return;
  }
  let S = join(projectDir, SESSION_ALIASES_DIR);
  if (isDiskless()) {
    warnDisklessSettingsWrite("session_alias", S);
    return;
  }
  try {
    if (
      (await readFile(S, "utf8"))
        .split(
          `
`,
        )
        .includes(sessionProjectDir)
    )
      return;
  } catch (error) {
    if (!isENOENT(error)) {
      if (isFsInaccessible(error)) {
        logForDebugging(`recordSessionAlias: read failed for ${S}: ${error}`);
        return;
      }
      logError(error);
      return;
    }
    try {
      await mkdir(dirname(S), {
        recursive: true,
        mode: 448,
      });
    } catch (error) {
      if (isFsInaccessible(error)) {
        logForDebugging(`recordSessionAlias: mkdir failed for ${S}: ${error}`);
        return;
      }
      logError(error);
      return;
    }
  }
  try {
    await appendFile(
      S,
      sessionProjectDir +
        `
`,
      {
        mode: 384,
      },
    );
  } catch (error) {
    if (isFsInaccessible(error)) {
      logForDebugging(`recordSessionAlias: append failed for ${S}: ${error}`);
      return;
    }
    logError(error);
  }
}
//@ chunk-e6aww6q8.js:352397-352965 layout
/**
 * 读取项目目录下的会话别名列表：优先经存储后端，否则读本地文件，去重并忽略空行；读失败返回空列表。
 */
async function readSessionAliases(e, n) {
  let storageTarget = sessionAliasStorageTarget(getProjectDir(e), n);
  if (storageTarget !== undefined)
    try {
      let text = await storageTarget.backend.readText([storageTarget.key]);
      if (!text.ok) {
        logForDebugging(`readSessionAliases: read failed via storage (${formatStorageError(text.error)})`);
        return [];
      }
      let y = text.value.items[0];
      return y.found
        ? uniq(
            y.value
              .split(
                `
`,
              )
              .filter((line) => line.length > 0),
          )
        : [];
    } catch (error) {
      logForDebugging(`readSessionAliases: read threw via storage: ${error}`);
      return [];
    }
  let aliasesPath = worktreeFromProgress(join(getProjectDir(e), SESSION_ALIASES_DIR));
  if (aliasesPath === undefined) return [];
  try {
    let file = await readFile(aliasesPath, "utf8");
    return uniq(
      file
        .split(
          `
`,
        )
        .filter((line) => line.length > 0),
    );
  } catch (error) {
    if (!isENOENT(error))
      if (isFsInaccessible(error))
        logForDebugging(`readSessionAliases: read failed for ${aliasesPath}: ${error}`);
      else logError(error);
    return [];
  }
}
//@ chunk-e6aww6q8.js:352965-355234 layout
/**
 * 会话转录存储的进程级状态：当前 Project、写入健康、退出重盖章、本地清理开关、工具结果副本方式、会话消息 uuid 缓存（含无文件恢复的预置）、迁移期间暂存的追加，以及各种信号。
 */
class TranscriptStore {
  getSessionId;
  project = null;
  exitReStampRan = false;
  localGcEnabled = false;
  lowYieldCompactSkipEnabled = true;
  toolResultCopiesOnDisk = "whole";
  slimAppendedRow = undefined;
  keepSessionMessagesCache = false;
  hasFailedWrite = false;
  forkContextHydrationCache = new Map();
  forkContextHydrationsInFlight = new Map();
  warnedUnchainedSessions = new Set();
  legacyProgressProbeFired = new Set();
  relocationParkedAppends = null;
  relocationParkedPath = null;
  liveSuppressionProbe = undefined;
  writerHealth = new TranscriptWriterHealth();
  exitReStampProviders = new Set();
  foreignExitReStampProviders = new Set();
  takenForeignExitLines = new Set();
  replaySeedStarts = new Map();
  exitDrains = new Set();
  sessionAgentNameChanged = createSignal();
  sessionTitleChanged = createSignal();
  sessionFileMaterialized = createSignal();
  filelessResumeUuids = undefined;
  sessionMessages = io(
    async (e, n) => {
      let r = [];
      try {
        let { messages } = await loadSessionTranscript(
          e,
          e === this.getSessionId() ? undefined : this.project?.recordedSessionFile(e),
          n,
        );
        r = messages.keys();
      } catch (error) {
        logForDebugging(
          `getSessionMessages: loadSessionFile failed: ${error instanceof Error ? error.message : String(error)}`,
          {
            level: "error",
          },
        );
      }
      let filelessResumeUuids = this.filelessResumeUuids;
      let h = new Set(filelessResumeUuids?.sessionId === e ? filelessResumeUuids.uuids : undefined);
      for (let y of r) h.add(y);
      return h;
    },
    (e) => e,
  );
  constructor(getSessionId) {
    this.getSessionId = getSessionId;
  }
  setLocalGcEnabled(localGcEnabled) {
    this.localGcEnabled = localGcEnabled;
  }
  setKeepSessionMessagesCache(keepSessionMessagesCache) {
    this.keepSessionMessagesCache = keepSessionMessagesCache;
  }
  setToolResultCopiesOnDisk(e) {
    this.toolResultCopiesOnDisk = e;
    this.slimAppendedRow = e === "slim" ? createToolResultSlimmer_2() : undefined;
  }
  claimExitReStamp() {
    if (this.exitReStampRan) return false;
    this.exitReStampRan = true;
    return true;
  }
  exitReStampDone() {
    return this.exitReStampRan;
  }
  claimLegacyProgressProbe(e) {
    if (this.legacyProgressProbeFired.has(e)) return false;
    this.legacyProgressProbeFired.add(e);
    return true;
  }
  openAppendRelocationBracket(relocationParkedPath) {
    this.relocationParkedAppends ??= [];
    this.relocationParkedPath = relocationParkedPath;
  }
  closeAppendRelocationBracket() {
    let relocationParkedAppends = this.relocationParkedAppends;
    this.relocationParkedAppends = null;
    this.relocationParkedPath = null;
    return relocationParkedAppends;
  }
  setLiveSuppressionProbe(liveSuppressionProbe) {
    this.liveSuppressionProbe = liveSuppressionProbe;
  }
  clearSessionMessagesCache() {
    if (this.keepSessionMessagesCache) return;
    this.sessionMessages.cache.clear?.();
  }
  primeSessionMessagesCache(e, n) {
    let cache = this.sessionMessages.cache;
    let s = cache.get(e);
    if (s === undefined) {
      cache.set(e, Promise.resolve(new Set(n)));
      return;
    }
    s.then((h) => {
      for (let y of n) h.add(y);
    });
  }
  primeFilelessResume(e, n) {
    let r = new Set(n);
    this.filelessResumeUuids = {
      sessionId: e,
      uuids: r,
    };
    this.primeSessionMessagesCache(e, r);
  }
}
//@ chunk-e6aww6q8.js:355234-355283 facade-majority
var transcriptStores = new SessionRootSlot(() => ({
  current: new TranscriptStore(() => getSessionId()),
}));
//@ chunk-e6aww6q8.js:355283-355324 layout
/**
 * currentTranscriptStore：当前转录存储。
 */
function currentTranscriptStore() {
  return transcriptStores.of(getRootSession()).current;
}
//@ chunk-e6aww6q8.js:355324-355411 layout
class RestoreClaim {
  installed = false;
  claim() {
    if (this.installed) return false;
    this.installed = true;
    return true;
  }
}
//@ chunk-e6aww6q8.js:355411-355438 facade-majority
var transcriptExitHooksLatches = new HostScoped(() => new RestoreClaim());
//@ chunk-e6aww6q8.js:355438-355478 facade-majority
function getTranscriptWriterHealth() {
  return currentTranscriptStore().writerHealth;
}
//@ chunk-e6aww6q8.js:355478-355528 facade-majority
function getTranscriptWriteFailureSeq() {
  return currentTranscriptStore().writerHealth.failureSeq;
}
//@ chunk-e6aww6q8.js:355528-355593 facade-majority
function getTranscriptWriterDegraded() {
  return currentTranscriptStore().writerHealth.degradedStore.getState();
}
//@ chunk-e6aww6q8.js:355593-356221 facade-majority
function reAppendSessionMetadataAtExit() {
  if (isDiagLogging() && !isInDiagScope()) return;
  if (isDiskless()) return;
  let e = currentTranscriptStore();
  if (!e.claimExitReStamp()) return;
  try {
    e.project?.reAppendSessionMetadata(false, false, true);
  } catch {}
  let takenForeignExitLines =
    isStorageV5Enabled() && e.takenForeignExitLines.size > 0 ? e.takenForeignExitLines : undefined;
  let r = takenForeignExitLines !== undefined ? new Set() : undefined;
  for (let foreignExitReStampProvider of e.foreignExitReStampProviders)
    try {
      for (let { path, entry, tornTailEntry } of foreignExitReStampProvider())
        try {
          appendEntrySync(path, entry, tornTailEntry);
          r?.add(entryDedupKey(path, entry));
        } catch {}
    } catch {}
  if (takenForeignExitLines !== undefined) {
    for (let { path, entry, tornTailEntry } of takenForeignExitLines) {
      if (r?.has(entryDedupKey(path, entry)) === true) continue;
      try {
        appendEntrySync(path, entry, tornTailEntry);
      } catch {}
    }
    takenForeignExitLines.clear();
  }
  for (let exitReStampProvider of e.exitReStampProviders)
    try {
      let h = exitReStampProvider();
      if (h !== undefined) e.project?.appendOwedEntryAtExit(h);
    } catch {}
}
//@ chunk-e6aww6q8.js:356221-356319 facade-majority
function registerTranscriptExitReStamp(e) {
  currentTranscriptStore().exitReStampProviders.add(e);
  return () => {
    currentTranscriptStore().exitReStampProviders.delete(e);
  };
}
//@ chunk-e6aww6q8.js:356319-356397 facade-majority
function registerTranscriptExitDrain(e) {
  currentTranscriptStore().exitDrains.add(e);
  return () => {
    currentTranscriptStore().exitDrains.delete(e);
  };
}
//@ chunk-e6aww6q8.js:356397-356509 facade-majority
function registerForeignTranscriptExitReStamp(collectExitIntentEntries) {
  currentTranscriptStore().foreignExitReStampProviders.add(collectExitIntentEntries);
  return () => {
    currentTranscriptStore().foreignExitReStampProviders.delete(collectExitIntentEntries);
  };
}
//@ chunk-e6aww6q8.js:356509-356527 layout
var MAX_RELOCATION_RETRIES = 500;
var RELOCATION_BACKOFF = 3;
//@ chunk-e6aww6q8.js:356527-357248 facade-majority
async function flushSessionStorageAtExit() {
  if (isDiagLogging() && !isInDiagScope()) return;
  let e = currentTranscriptStore();
  try {
    await withDeadline(
      Promise.allSettled([...e.exitDrains].map((exitDrain) => Promise.resolve().then(exitDrain))),
      500,
    );
    try {
      await e.project?.flush();
    } finally {
      e.project?.settleHeldReplayRecords();
    }
    await flushAppendEntryQueues();
    let project = e.project;
    let r = project?.exitReStampSource();
    if (isStorageV5Enabled() && project !== null && r !== undefined) {
      if (
        (await withDeadline(
          project.reStampAtExitAsync(r).then(() => true),
          MAX_RELOCATION_RETRIES,
        )) !== true
      )
        logForDebugging(
          `Exit re-stamp through the storage backend did not finish within ${MAX_RELOCATION_RETRIES} ms; the synchronous re-stamp runs instead`,
          {
            level: "warn",
          },
        );
    }
  } catch {
  } finally {
    reAppendSessionMetadataAtExit();
    let transcriptWriterDegraded = getTranscriptWriterDegraded();
    if (transcriptWriterDegraded !== null)
      logForDebugging(
        `flushSessionStorageAtExit: transcript writer degraded (${transcriptWriterDegraded.code} at ${transcriptWriterDegraded.source}) \u2014 entries since the failure window may be missing from the transcript`,
        {
          level: "error",
        },
      );
  }
}
//@ chunk-e6aww6q8.js:357248-357431 callgraph-witnessed = getProject (0)
/**
 * 取当前宿主的会话存储单例 Project；首次创建时注册退出钩子，进程退出前把写队列刷到磁盘。
 */
function getProject() {
  let store = currentTranscriptStore();
  if (!store.project) {
    store.project = new Project(store);
    if (transcriptExitHooksLatches.of(getRootSession().host).claim()) {
      registerCleanup(flushSessionStorageAtExit);
      if (!process.listeners("exit").includes(reAppendSessionMetadataAtExit))
        process.on("exit", reAppendSessionMetadataAtExit);
    }
  }
  return store.project;
}
//@ chunk-e6aww6q8.js:357431-357479 facade-majority = resetProjectFlushStateForTesting (0.771)
function resetProjectFlushStateForTesting() {
  currentTranscriptStore().project?._resetFlushState();
}
//@ chunk-e6aww6q8.js:357479-357531 facade-majority
function resetProjectForTesting() {
  transcriptStores.of(getRootSession()).current = new TranscriptStore(() => getSessionId());
}
//@ chunk-e6aww6q8.js:357531-357603 facade-majority
function compactTranscriptForTesting(e, n, r, s, h) {
  return getProject().performCompactTranscript(e, n, r, s, h);
}
//@ chunk-e6aww6q8.js:357603-357652 facade-majority
function requestCompactForTesting(e) {
  getProject().requestCompact(e, undefined, true);
}
//@ chunk-e6aww6q8.js:357652-357691 facade-majority
function setSessionFileForTesting(e) {
  getProject().setSessionFile(e);
}
//@ chunk-e6aww6q8.js:357691-357729 facade-majority
function transcriptTailForHydrateForTesting(e, n, r) {
  return readHydrateTail(e, n, r);
}
//@ chunk-e6aww6q8.js:357729-357763 facade-majority
function readSessionAliasesForTesting(e, n) {
  return readSessionAliases(e, n);
}
//@ chunk-e6aww6q8.js:357763-357838 facade-majority
async function reAppendSessionMetadataAsyncForTesting(e = true, n) {
  await getProject().reAppendSessionMetadataAsync(false, e, n);
}
//@ chunk-e6aww6q8.js:357838-357901 facade-majority = recordContextCollapseCommit (1)
async function appendEntryToSessionForTesting(e, n, r) {
  await getProject().appendEntry(e, n, undefined, r);
}
//@ chunk-e6aww6q8.js:357901-357944 facade-majority
function getCurrentSessionFile() {
  return getProject().sessionFilePath;
}
//@ chunk-e6aww6q8.js:357944-357972 facade-majority
function locateCurrentSessionFile() {
  return getCurrentSessionFile();
}
//@ chunk-e6aww6q8.js:357972-358023 facade-majority
function currentSessionFileIsFor(e) {
  return isOwnTranscriptFile(e, getProject().sessionFilePath);
}
//@ chunk-e6aww6q8.js:358023-358088 facade-majority
function onSessionFileMaterialized(e) {
  return currentTranscriptStore().sessionFileMaterialized.subscribe(e);
}
//@ chunk-e6aww6q8.js:358088-358139 facade-majority
function emitSessionFileMaterializedForTesting() {
  currentTranscriptStore().sessionFileMaterialized.emit();
}
//@ chunk-e6aww6q8.js:358139-358196 facade-majority = setInternalEventWriter (1)
function setInternalEventWriter(writer, n) {
  getProject().setInternalEventWriter(writer, n);
  registerWorkerEventMirror();
}
//@ chunk-e6aww6q8.js:358196-358307 layout
function registerWorkerEventMirror() {
  setStoragePort({
    mirror: (e, n, { sessionId, agentId }) =>
      mirrorWorkerEventToRemote(e, n, {
        sessionId: pinSessionId(sessionId),
        agentId,
      }),
    readAgent: readAgentWorkerEvents,
  });
}
//@ chunk-e6aww6q8.js:358307-358354 facade-majority
function clearInternalEventWriter() {
  getProject().clearInternalEventWriter();
}
//@ chunk-e6aww6q8.js:358354-358399 facade-majority
function sealTranscriptAppendsForShutdown() {
  getProject().sealAppendsForShutdown();
}
//@ chunk-e6aww6q8.js:358399-358433 facade-majority
function addSessionMirror(e) {
  getProject().addMirror(e);
}
//@ chunk-e6aww6q8.js:358433-358472 facade-majority
function hasSessionMirror() {
  return getProject().hasMirror();
}
//@ chunk-e6aww6q8.js:358472-358511 facade-majority
function fireSessionMirror(e, n) {
  getProject().fireMirror(e, n);
}
//@ chunk-e6aww6q8.js:358511-358689 facade-majority = setInternalEventReader (0.674)
function setInternalEventReader(reader, subagentReader, r) {
  getProject().setInternalEventReader(reader);
  getProject().setInternalSubagentEventReader(subagentReader);
  getProject().setInternalAgentEventReader(r ?? null);
  getProject().setAgentWorkerEventReader(r ?? null);
  registerWorkerEventMirror();
}
//@ chunk-e6aww6q8.js:358689-359050 facade-majority
async function readAgentWorkerEvents(agentId, signal) {
  let project = getProject();
  let agentWorkerEventReader = project.getAgentWorkerEventReader();
  if (agentWorkerEventReader === null) return;
  if (project.isAgentOverBound(agentId)) return null;
  let h = await agentWorkerEventReader(agentId, signal);
  if (h?.overBound) project.noteAgentOverBound(agentId);
  if (h === null || h.overBound || h.encodedBody) return null;
  let filtered = h.events.filter((event) => event.session_agent_id === agentId);
  if (filtered.length === 0 && h.events.length > 0) return null;
  return filtered.map((S) => S.payload);
}
//@ chunk-e6aww6q8.js:359050-359100 facade-majority
function setAgentMetadataInStreamGate(keepsAgentMetadataInStream) {
  getProject().keepsAgentMetadataInStream = keepsAgentMetadataInStream;
}
//@ chunk-e6aww6q8.js:359100-359156 facade-majority
function keepsAgentMetadataInStream() {
  return getProject().keepsAgentMetadataInStream();
}
//@ chunk-e6aww6q8.js:359156-359210 facade-majority
function hasWrittenAgentTranscript(agentId) {
  return getProject().hasWrittenAgentLocally(agentId);
}
//@ chunk-e6aww6q8.js:359210-359258 facade-majority
function isAgentTranscriptOverBound(agentId) {
  return getProject().isAgentOverBound(agentId);
}
//@ chunk-e6aww6q8.js:359258-359302 facade-majority = setRemoteIngressUrlForTesting (1)
function setRemoteIngressUrlForTesting(url) {
  getProject().setRemoteIngressUrl(url);
}
//@ chunk-e6aww6q8.js:359302-359313 layout
var REPLAY_INDEX_SCAN_LIMIT = 10;
//@ chunk-e6aww6q8.js:359313-360206 facade-majority
async function seedReplayIndex(e, n) {
  let r = new RequestBlobStore();
  if (isDiskless())
    return {
      index: r,
      fileExisted: false,
    };
  let s;
  try {
    let h = await open(e, constants.O_RDONLY | READ_LIMITS);
    s = h;
    let { size } = await h.stat();
    if (size === 0)
      return {
        index: r,
        fileExisted: true,
      };
    let max = Math.max(0, size - MAX_TRANSCRIPT_TAIL_BYTES);
    let w = n !== undefined && n.start < n.fileSize && n.fileSize <= size ? Math.max(max, n.start) : max;
    if (w > 0) {
      r.startMidFile();
      let G = Buffer.alloc(TRANSCRIPT_HEAD_BUFFER_BYTES);
      let { bytesRead } = await h.read(G, 0, G.length, 0);
      let firstLine = getFirstLine(G.toString("utf8", 0, bytesRead));
      try {
        if (jsonParse(firstLine)?.type === "fork-context-ref") r.hasForkContextRef = true;
      } catch {}
    }
    let L = transcriptLines(
      h.createReadStream({
        encoding: "utf8",
        start: w,
        end: size - 1,
        autoClose: true,
      }),
    );
    for await (let G of L) {
      if (G.length === 0) continue;
      let q = stripLeadingNuls(G);
      try {
        let Z = jsonParse(q);
        if (q === G || isCompactBoundaryMessage_3(Z)) r.noteLine(Z);
        else if (Z?.type === "user" || Z?.type === "assistant") r = r.successor(true);
      } catch {}
    }
    return {
      index: r,
      fileExisted: true,
    };
  } catch (error) {
    if (!isENOENT(error)) logError(error);
    return {
      index: s === undefined ? r : r.successor(false),
      fileExisted: s !== undefined,
    };
  } finally {
    await s?.close().catch(() => {});
  }
}
//@ chunk-e6aww6q8.js:360206-360284 layout
function hasToolResultMessage(content) {
  return Array.isArray(content) && content.some((n) => n?.type === "tool_result");
}
//@ chunk-e6aww6q8.js:360284-407532 fingerprint = Project (0.319)
/**
 * 会话转录写入器：按目标文件维护写队列，每 100ms（FLUSH_INTERVAL_MS）批量 flush，单块不超过 100MB；会话文件在第一条 user/assistant/system 消息时才创建；同时管理标题、tag、agent 名等会话元数据并在尾部重写（reAppendSessionMetadata），支持远程镜像、storage v5 后端与转录迁移。
 */
class Project {
  store;
  currentSessionTag;
  currentSessionRelocatedCwd;
  currentSessionTitle;
  currentSessionAiTitle;
  currentSessionAgentName;
  currentSessionAgentColor;
  currentSessionLastPrompt;
  currentSessionLeafUuid;
  currentSessionLeafTs;
  currentSessionAgentSetting;
  currentSessionMode;
  currentSessionPermissionMode;
  currentSessionIsolationLatch;
  currentSessionDevModsFolder;
  currentSessionMemoryModeStamps = [];
  atisLatchStamp;
  toolsUsedStamp;
  currentSessionWorktree;
  resumedArtifactCommentMonitor;
  currentSessionPrNumber;
  currentSessionPrUrl;
  currentSessionPrRepository;
  currentSessionArtifactCount;
  resumedArtifactAutoReactLedger;
  currentSessionBridgeId;
  currentSessionBridgeSeq;
  currentSessionBridgeDialogKinds;
  currentSessionBridgeGroupingId;
  currentSessionBridgeNoBackfill;
  currentSessionBridgeOwnerAccountUuid;
  currentSessionBridgeOwnerOrganizationUuid;
  currentSessionHistorySuppressed;
  currentSessionPrecautionarySuppression;
  clearResilientPrecautionSids;
  scanUncertaintyHoldSids;
  knownTaintedSessionIds;
  sessionFile = null;
  get sessionFilePath() {
    return this.sessionFile;
  }
  setSessionFile(e) {
    writeTranscriptFile(
      this.store.writerHealth,
      this.sessionFile,
      e,
      undefined,
      e === null ? Array.from(this.writeQueues.keys()) : [],
    );
    if (this.compactAwaitingSummary?.filePath !== e) this.compactAwaitingSummary = undefined;
    this.sessionFile = e;
    if (e !== null) this.existingSessionFiles.set(this.store.getSessionId(), e);
  }
  pendingEntries = [];
  heldReplayRecords = [];
  awaitingFirstUserRow = false;
  relocationBuffer = null;
  remoteIngressUrl = null;
  internalEventWriter = null;
  internalEventWriterSessionId = undefined;
  internalEventReader = null;
  internalSubagentEventReader = null;
  internalAgentEventReader = null;
  agentWorkerEventReader = null;
  keepsAgentMetadataInStream = () => false;
  agentIdsWrittenLocally = new Set();
  agentIdsFetched = new Set();
  agentIdsOverBound = new Set();
  verifiesAgentTranscripts = false;
  agentTranscriptFetches = new Map();
  mirrors = [];
  pendingWriteCount = 0;
  flushResolvers = [];
  lastWriteInCallOrder = undefined;
  shutdownSeen = createSignal();
  writeQueues = new Map();
  flushTimer = null;
  activeDrain = null;
  storeFence = undefined;
  queueOperationsRaisedElsewhere = Promise.resolve();
  drainChain = Promise.resolve();
  FLUSH_INTERVAL_MS = 100;
  MAX_CHUNK_BYTES = 104857600;
  bytesSinceMetadataReAppend = 0;
  sessionFileAppendSource = undefined;
  tornTailToSeal = null;
  bytesSinceCompact = 0;
  backstopThresholdBytes = ENTRY_APPEND_POLICY_2;
  compactAwaitingSummary = undefined;
  sessionRewritesPending = new Set();
  sessionRowsDeleted = new Set();
  sessionLastBoundaryUuid = undefined;
  constructor(store) {
    this.store = store;
  }
  _resetFlushState() {
    this.pendingWriteCount = 0;
    this.lastWriteInCallOrder = undefined;
    this.shutdownSeen.clear();
    this.transcriptBatches.clearForTest();
    this.storeFence = undefined;
    this.bytesSinceMetadataReAppend = 0;
    this.sessionFileAppendSource = undefined;
    this.tornTailToSeal = null;
    this.bytesSinceCompact = 0;
    this.compactAwaitingSummary = undefined;
    this.sessionRewritesPending.clear();
    this.sessionRowsDeleted.clear();
    this.sessionLastBoundaryUuid = undefined;
    this.flushResolvers = [];
    if (this.flushTimer) clearTimeout(this.flushTimer);
    this.flushTimer = null;
    this.activeDrain = null;
    this.drainChain = Promise.resolve();
    this.writeQueues = new Map();
    this.mirrors = [];
  }
  addMirror(e) {
    this.mirrors.push(e);
  }
  hasMirror() {
    return this.mirrors.length > 0;
  }
  fireMirror(e, n) {
    for (let mirror of this.mirrors)
      try {
        mirror(e, n);
      } catch (error) {
        logForDebugging(`[SessionMirror] mirror failed for ${e}: ${error}`, {
          level: "error",
        });
      }
  }
  incrementPendingWrites() {
    this.pendingWriteCount++;
  }
  decrementPendingWrites() {
    this.pendingWriteCount--;
    if (this.pendingWriteCount === 0) {
      for (let resolve of this.flushResolvers) resolve();
      this.flushResolvers = [];
    }
  }
  async trackWrite(fn) {
    this.incrementPendingWrites();
    try {
      return await fn();
    } finally {
      this.decrementPendingWrites();
    }
  }
  inCallOrder(e) {
    this.releaseWaitsForUploads();
    let lastWriteInCallOrder = this.lastWriteInCallOrder;
    let { promise, resolve } = Promise.withResolvers();
    this.lastWriteInCallOrder = promise;
    return this.trackWrite(async () => {
      try {
        if (lastWriteInCallOrder !== undefined) await lastWriteInCallOrder;
        return await e();
      } finally {
        if (this.lastWriteInCallOrder === promise) this.lastWriteInCallOrder = undefined;
        resolve();
      }
    });
  }
  untilUploadedOrShutdown(e) {
    return new Promise((resolve, reject) => {
      let s = this.shutdownSeen.subscribe(() => {
        s();
        this.trackWrite(() => e.catch(logError));
        resolve();
      });
      e.then(
        () => {
          s();
          resolve();
        },
        (error) => {
          s();
          reject(error);
        },
      );
    });
  }
  releaseWaitsForUploads() {
    if (isShuttingDown()) this.shutdownSeen.emit();
  }
  transcriptBatches = createKeyedQueue();
  recordInTurn(e, n, r) {
    this.releaseWaitsForUploads();
    return this.trackWrite(() =>
      this.transcriptBatches.run(
        `${e}
${n ?? ""}`,
        r,
      ),
    );
  }
  pushQueueItem(e, n) {
    let r = this.writeQueues.get(e);
    if (!r) {
      r = [];
      this.writeQueues.set(e, r);
    }
    r.push(n);
    this.scheduleDrain();
  }
  enqueueWrite(e, entry, r) {
    if (this.appendsSealedForShutdown) return Promise.resolve();
    if (isDiskless() && r === undefined) {
      let s = Error("diskless session: transcript entry queued with no storage backend; entry dropped");
      logError(s);
      warnDisklessSettingsWrite("transcript_lines", e);
      reportTranscriptWriteFailure(this.store.writerHealth, "enqueue", s, e);
      this.forgetLinesThatNeverLanded(e);
      return Promise.resolve();
    }
    return new Promise((resolve) => {
      this.pushQueueItem(e, {
        entry,
        resolve,
        storageV5: r,
      });
    });
  }
  forgetLinesThatNeverLanded(e) {
    if (this.replaySources.has(e)) {
      this.restartReplayIndex(e);
      clearAllReplayChains();
    }
    this.queuedToolResults.clear();
  }
  enqueueRemove(e, removeUuid, storageV5) {
    return new Promise((resolve) => {
      this.pushQueueItem(e, {
        removeUuid,
        resolve,
        storageV5,
      });
    });
  }
  enqueueCompact(e, storageV5, afterCompaction) {
    return new Promise((resolve) => {
      this.pushQueueItem(e, {
        compact: true,
        afterCompaction,
        resolve,
        storageV5,
      });
    });
  }
  queueLeafCheckpointWithdrawal(withdrawal) {
    if (this.sessionFile === null || this.relocationBuffer !== null || this.shouldSkipPersistence()) return;
    this.pushQueueItem(this.sessionFile, {
      withdrawal,
      resolve: () => {},
      storageV5: this.exitReStampSource(),
    });
  }
  async performLeafCheckpointWithdrawal(e, n, r) {
    let any = (await readFileRange(e, r))
      .split(
        `
`,
      )
      .some(isLastPromptLine);
    let y;
    if (!any)
      try {
        for await (let S of transcriptLines(
          createReadStream(e, {
            encoding: "utf8",
          }),
        ))
          if (isLastPromptLine(S)) {
            any = true;
            break;
          }
      } catch (error) {
        y = `(${getErrnoCode(error)}): ${errorMessage(error)}`;
      }
    if (!any && y !== undefined) {
      logForDebugging(
        `/clear: could not read the transcript it left, so any resume checkpoint in it is not withdrawn: ${e} ${y}`,
        {
          level: "warn",
        },
      );
      return;
    }
    if (!any) {
      logForDebugging(`/clear: no resume checkpoint in the transcript it left, so none withdrawn: ${e}`);
      return;
    }
    await this.appendToFile(e, toJsonLine(n), r);
    this.fireMirror(e, [n]);
    logForDebugging(`/clear: withdrew the resume checkpoint in the transcript it left: ${e}`);
  }
  requestCompact(e, n, r = false) {
    if (!this.store.localGcEnabled) return;
    this.restartReplayIndex(e);
    clearAllReplayChains();
    this.queuedToolResults.clear();
    let s = this.enqueueCompact(e, n, r);
    if (e === this.sessionFile) this.trackSessionRewrite(s);
    this.scheduleDrain();
  }
  trackSessionRewrite(e) {
    let n = {};
    this.sessionRewritesPending.add(n);
    return e.finally(() => {
      this.sessionRewritesPending.delete(n);
    });
  }
  sessionRowsOffDisk() {
    if (this.sessionRowsDeleted.size === 0 && this.sessionRewritesPending.size === 0) return;
    return {
      deleted: this.sessionRowsDeleted,
      rewriting: this.sessionRewritesPending.size > 0,
      lastBoundary: this.sessionLastBoundaryUuid,
    };
  }
  scheduleDrain() {
    if (this.flushTimer) return;
    this.flushTimer = setTimeout(async () => {
      this.flushTimer = null;
      this.activeDrain = this.drainWriteQueue();
      await this.activeDrain;
      this.activeDrain = null;
      if (this.writeQueues.size > 0) this.scheduleDrain();
    }, this.FLUSH_INTERVAL_MS);
  }
  sealTornTailOnNextAppend(tornTailToSeal) {
    this.tornTailToSeal = tornTailToSeal;
  }
  sealTornTailSync(e) {
    if (this.tornTailToSeal !== e || isDiskless()) return;
    if (isTranscriptPersistenceDisabled()) return;
    let n;
    try {
      n = openSync(e, constants.O_WRONLY | constants.O_APPEND);
    } catch {
      return;
    }
    try {
      let { size } = fstatSync(n);
      if (size > 0)
        writeSync(
          n,
          `
`,
          undefined,
        );
    } finally {
      closeSync(n);
    }
    this.tornTailToSeal = null;
  }
  tornTailSealPending(e) {
    return this.tornTailToSeal === e;
  }
  tornTailSealLanded(e) {
    if (this.tornTailToSeal === e) this.tornTailToSeal = null;
  }
  async appendToFile(e, n, r) {
    if (this.storeFence !== undefined) throw this.storeFence;
    this.directAppendsInFlight++;
    let s;
    try {
      s = (await appendToTranscriptFile(e, n, r)) === "backend";
    } finally {
      this.directAppendsInFlight--;
    }
    noteTranscriptWriteOk(this.store.writerHealth, e);
    this.sessionFilesNotYetWritten.delete(e);
    if (e === this.sessionFile) {
      let h = Buffer.byteLength(n, "utf8");
      this.bytesSinceMetadataReAppend += h;
      this.bytesSinceCompact += h;
      this.sessionFileAppendSource = s ? r : undefined;
    }
  }
  drainsInFlight = 0;
  directAppendsInFlight = 0;
  appendInFlight() {
    return this.drainsInFlight > 0 || this.directAppendsInFlight > 0;
  }
  drainWriteQueue() {
    this.drainsInFlight++;
    let e = this.drainChain.then(() => this.drainQueuesOnce());
    this.drainChain = e
      .catch(() => {})
      .finally(() => {
        this.drainsInFlight--;
      });
    return e;
  }
  async drainQueuesOnce() {
    for (let [e, n] of this.writeQueues) {
      if (n.length === 0) continue;
      let r = n.splice(0);
      let s = 0;
      try {
        let h = "";
        let y = 0;
        let S;
        let L = this.mirrors.length > 0 ? [] : undefined;
        for (let idx = 0; idx < r.length; idx++) {
          let q = r[idx];
          if (!("entry" in q)) {
            if (h.length > 0) {
              await this.appendToFile(e, h, S);
              if (L && L.length > 0) {
                this.fireMirror(e, L.slice());
                L.length = 0;
              }
              for (let ke = y; ke < idx; ke++) r[ke].resolve();
              s = idx;
              h = "";
            }
            if (this.storeFence !== undefined) throw this.storeFence;
            if ("removeUuid" in q) await this.performRemoveByUuid(e, q.removeUuid, q.storageV5);
            else if ("compact" in q)
              await this.performCompactTranscript(e, undefined, undefined, q.storageV5, q.afterCompaction);
            else await this.performLeafCheckpointWithdrawal(e, q.withdrawal, q.storageV5);
            q.resolve();
            s = idx + 1;
            y = idx + 1;
            continue;
          }
          let { entry } = q;
          let jsonLine = toJsonLine(entry);
          if (h.length + jsonLine.length >= this.MAX_CHUNK_BYTES || (q.storageV5 !== S && h.length > 0)) {
            await this.appendToFile(e, h, S);
            if (L && L.length > 0) {
              this.fireMirror(e, L.slice());
              L.length = 0;
            }
            for (let ke = y; ke < idx; ke++) r[ke].resolve();
            s = idx;
            y = idx;
            h = "";
          }
          S = q.storageV5;
          h += jsonLine;
          if (!entry.type.startsWith("api-request")) L?.push(entry);
        }
        if (h.length > 0) {
          await this.appendToFile(e, h, S);
          if (L && L.length > 0) this.fireMirror(e, L);
          for (let G = y; G < r.length; G++) r[G].resolve();
          s = r.length;
        }
      } catch (error) {
        if (error !== this.storeFence) {
          let errnoCode = getErrnoCode(error);
          if (isSyscallError(error))
            logForDebugging(`Transcript write failed (${errnoCode}): ${errorMessage(error)}`, {
              level: "error",
            });
          else logError(error);
          reportTranscriptWriteFailure(this.store.writerHealth, "drain", error, e);
          this.forgetLinesThatNeverLanded(e);
          if (error instanceof Error && getStorageErrorCause(error) !== undefined) this.storeFence = error;
        }
        this.store.hasFailedWrite = true;
        for (let y = s; y < r.length; y++) r[y].resolve();
      }
    }
    for (let [e, n] of this.writeQueues) if (n.length === 0) this.writeQueues.delete(e);
    if (
      this.store.localGcEnabled &&
      this.sessionFile &&
      this.storeFence === undefined &&
      this.compactAwaitingSummary === undefined &&
      this.bytesSinceCompact >= this.backstopThresholdBytes
    ) {
      this.bytesSinceCompact = 0;
      await this.trackSessionRewrite(
        this.performCompactTranscript(this.sessionFile, undefined, undefined, this.sessionFileAppendSource),
      );
    }
    if (this.bytesSinceMetadataReAppend >= LITE_READ_BUF_SIZE / 2)
      try {
        await this.reAppendSessionMetadataAsync(false, true, this.sessionFileAppendSource);
      } catch (error) {
        if (isSyscallError(error))
          logForDebugging(`Metadata re-append failed (${getErrnoCode(error)}): ${errorMessage(error)}`, {
            level: "error",
          });
        else logError(error);
      }
  }
  resetSessionFile() {
    for (let { target } of this.heldReplayRecords.map((heldReplayRecord) => heldReplayRecord.records))
      if (
        target.sessionId !== getSessionId() &&
        getTranscriptPathForSession(target.sessionId) === this.sessionFile
      )
        this.existingSessionFiles.set(target.sessionId, this.sessionFile);
    this.setSessionFile(null);
    this.pendingEntries = [];
    this.awaitingFirstUserRow = false;
    if (this.heldReplayRecords.length > 0) this.releaseHeldReplayRecords();
    this.bytesSinceMetadataReAppend = 0;
    this.sessionFileAppendSource = undefined;
    this.bytesSinceCompact = 0;
    this.backstopThresholdBytes = ENTRY_APPEND_POLICY_2;
    this.sessionRowsDeleted.clear();
    this.sessionLastBoundaryUuid = undefined;
  }
  reAppendSessionMetadata(e = false, n = false, r = false, s = false) {
    if (!this.sessionFile) return;
    this.bytesSinceMetadataReAppend = 0;
    let transcriptTail = readTranscriptTail(this.sessionFile);
    if (
      s &&
      transcriptTail !== "" &&
      !transcriptTail.endsWith(`
`)
    )
      this.sealTornTailOnNextAppend(this.sessionFile);
    let y = this.planReAppendSessionMetadata(transcriptTail, e, n, undefined, r);
    if (!y) return;
    try {
      if (y.entries.length > 0) this.sealTornTailSync(y.sessionFile);
      for (let entry of y.entries) writeTranscriptMetadataSync(y.sessionFile, entry);
    } catch (error) {
      for (let stamp of y.stamps) stamp.inFlight = false;
      throw error;
    }
    for (let stamp of y.stamps) {
      stamp.written = true;
      stamp.inFlight = false;
    }
  }
  appendOwedEntryAtExit(e) {
    if (!this.sessionFile) return;
    this.sealTornTailSync(this.sessionFile);
    writeTranscriptMetadataSync(this.sessionFile, e);
  }
  exitReStampSource() {
    return this.sessionFileAppendSource;
  }
  adoptAppendSource(e) {
    let sessionFile = this.sessionFile;
    this.sessionFileAppendSource =
      sessionFile === null ? undefined : getStorageTargetForPath(sessionFile, e)?.backend;
  }
  async reStampAtExitAsync(e) {
    let sessionFile = this.sessionFile;
    if (!sessionFile || this.store.exitReStampDone()) return;
    if (isTranscriptPersistenceDisabled()) {
      this.store.claimExitReStamp();
      return;
    }
    try {
      await this.reAppendSessionMetadataAsync(false, false, e, false);
    } catch (error) {
      logReStampFailure("Exit re-stamp through the storage backend failed", error);
      return;
    }
    let r = true;
    let s = new Set();
    for (let idx = 0; ; idx++) {
      if (this.store.exitReStampDone()) return;
      let { lines, clean } = this.takeForeignExitLines(s);
      r &&= clean;
      if (idx > 0 && lines.length === 0) break;
      if (idx === RELOCATION_BACKOFF) {
        r = false;
        break;
      }
      for (let line of lines) {
        if (this.store.exitReStampDone()) return;
        try {
          await appendEntryToFileAsync(line.path, line.entry, e, {
            onlyIfExists: true,
            tornTailEntry: line.tornTailEntry,
          });
          this.store.takenForeignExitLines.delete(line);
        } catch (error) {
          logReStampFailure(
            "Exit line owed to another session's transcript was not appended through the storage backend",
            error,
          );
          r = false;
        }
      }
      if (idx > 0) continue;
      for (let exitReStampProvider of this.store.exitReStampProviders) {
        if (this.store.exitReStampDone()) return;
        if (this.sessionFile !== sessionFile) {
          r = false;
          break;
        }
        try {
          let L = exitReStampProvider();
          if (L !== undefined) {
            await appendToTranscriptFile(
              sessionFile,
              jsonStringify(L) +
                `
`,
              e,
            );
            this.fireMirror(sessionFile, [L]);
          }
        } catch (error) {
          logReStampFailure(
            "Exit line owed to the transcript was not appended through the storage backend",
            error,
          );
          r = false;
          if (error instanceof Error && getStorageErrorCause(error) !== undefined) {
            this.storeFence = error;
            break;
          }
        }
      }
    }
    if (r && this.sessionFile === sessionFile) this.store.claimExitReStamp();
  }
  takeForeignExitLines(e) {
    let n = [];
    let clean = true;
    for (let foreignExitReStampProvider of this.store.foreignExitReStampProviders)
      try {
        for (let h of foreignExitReStampProvider()) {
          let y =
            h.path +
            `
` +
            jsonStringify(h.entry);
          if (e.has(y)) continue;
          e.add(y);
          this.store.takenForeignExitLines.add(h);
          n.push(h);
        }
      } catch (error) {
        logReStampFailure("Exit lines owed to other sessions' transcripts could not be listed", error);
        clean = false;
      }
    return {
      lines: n,
      clean,
    };
  }
  async reAppendSessionMetadataAsync(e = false, n = false, r, s = false) {
    let sessionFile = this.sessionFile;
    if (!sessionFile || this.storeFence !== undefined) return;
    let sessionId = this.store.getSessionId();
    this.bytesSinceMetadataReAppend = 0;
    await flushAppendEntryQueues();
    let fileRange = await readFileRange(sessionFile, r);
    if (s && r !== undefined && (this.sessionFile !== sessionFile || this.store.getSessionId() !== sessionId))
      return;
    let w = this.planReAppendSessionMetadata(fileRange, e, n, r);
    if (!w || w.entries.length === 0) return;
    this.directAppendsInFlight++;
    try {
      await appendToTranscriptFile(w.sessionFile, jsonlJoin(w.entries), r);
    } catch (error) {
      if (error instanceof Error && getStorageErrorCause(error) !== undefined) this.storeFence = error;
      for (let stamp of w.stamps) stamp.inFlight = false;
      throw error;
    } finally {
      this.directAppendsInFlight--;
    }
    for (let stamp of w.stamps) {
      stamp.written = true;
      stamp.inFlight = false;
    }
    this.fireMirror(w.sessionFile, w.entries);
  }
  normalizeLastPrompt(e) {
    let trimmed = e
      .replaceAll(
        `
`,
        " ",
      )
      .trim();
    return trimmed.length > 200 ? truncateToLength(trimmed, 200).trim() + "\u2026" : trimmed;
  }
  planReAppendSessionMetadata(e, n, r, s, h = false) {
    if (!this.sessionFile) return null;
    let sessionId = this.store.getSessionId();
    if (!sessionId) return null;
    let sessionFile = this.sessionFile;
    let lines = e.split(`
`);
    if (!n) {
      let We = false;
      let last = lines.findLast(
        (line) => line.includes('"type":"custom-title"') && line.includes('"customTitle":"'),
      );
      if (last) {
        let lastJsonStringField = extractLastJsonStringField(last, "customTitle");
        if (lastJsonStringField !== undefined) {
          We ||= this.currentSessionTitle !== (lastJsonStringField || undefined);
          this.currentSessionTitle = lastJsonStringField || undefined;
          if (!lastJsonStringField) deleteSessionTitleSidecar(sessionFile, sessionId, s);
        }
      }
      let last_2 = lines.findLast(
        (line) => line.includes('"type":"ai-title"') && line.includes('"aiTitle":"'),
      );
      if (last_2) {
        let lastJsonStringField = extractLastJsonStringField(last_2, "aiTitle");
        if (lastJsonStringField !== undefined) {
          We ||= this.currentSessionAiTitle !== (lastJsonStringField || undefined);
          this.currentSessionAiTitle = lastJsonStringField || undefined;
        }
      }
      if (We) this.store.sessionTitleChanged.emit();
    }
    let last = lines.findLast((line) => line.includes('"type":"tag"') && line.includes('"tag":"'));
    if (last) {
      let lastJsonStringField = extractLastJsonStringField(last, "tag");
      if (lastJsonStringField !== undefined) this.currentSessionTag = lastJsonStringField || undefined;
    }
    let fieldFromLastEntryOfTypeStrict = extractFieldFromLastEntryOfTypeStrict(
      e,
      "relocated",
      "relocatedCwd",
    );
    if (fieldFromLastEntryOfTypeStrict) this.currentSessionRelocatedCwd ??= fieldFromLastEntryOfTypeStrict;
    if (this.currentSessionLeafUuid !== undefined) {
      let fieldFromLastEntryOfTypeStrict = extractFieldFromLastEntryOfTypeStrict(
        e,
        "last-prompt",
        "lastPrompt",
      );
      if (fieldFromLastEntryOfTypeStrict)
        this.currentSessionLastPrompt ??= this.normalizeLastPrompt(fieldFromLastEntryOfTypeStrict);
    }
    {
      let We = countFrameLinks(e);
      if (We !== undefined)
        this.currentSessionArtifactCount = Math.max(this.currentSessionArtifactCount ?? 0, We);
    }
    let q = [];
    if (this.currentSessionLastPrompt !== undefined || this.currentSessionLeafUuid !== undefined)
      q.push({
        type: "last-prompt",
        ...(this.currentSessionLastPrompt && {
          lastPrompt: this.currentSessionLastPrompt,
        }),
        ...(this.currentSessionLeafUuid && {
          leafUuid: this.currentSessionLeafUuid,
        }),
        sessionId,
      });
    if (this.currentSessionTitle)
      q.push({
        type: "custom-title",
        customTitle: this.currentSessionTitle,
        sessionId,
      });
    if (this.currentSessionAiTitle)
      q.push({
        type: "ai-title",
        aiTitle: this.currentSessionAiTitle,
        sessionId,
      });
    if (this.currentSessionTag)
      q.push({
        type: "tag",
        tag: this.currentSessionTag,
        sessionId,
      });
    if (this.currentSessionRelocatedCwd && e !== "")
      q.push({
        type: "relocated",
        relocatedCwd: this.currentSessionRelocatedCwd,
        sessionId,
      });
    if (this.currentSessionAgentName)
      q.push({
        type: "agent-name",
        agentName: this.currentSessionAgentName,
        sessionId,
      });
    if (this.currentSessionAgentColor)
      q.push({
        type: "agent-color",
        agentColor: this.currentSessionAgentColor,
        sessionId,
      });
    if (this.currentSessionAgentSetting)
      q.push({
        type: "agent-setting",
        agentSetting: this.currentSessionAgentSetting,
        sessionId,
      });
    if (this.currentSessionMode)
      q.push({
        type: "mode",
        mode: this.currentSessionMode,
        sessionId,
      });
    if (this.currentSessionPermissionMode)
      q.push({
        type: "permission-mode",
        permissionMode: this.currentSessionPermissionMode,
        sessionId,
      });
    if (this.currentSessionIsolationLatch)
      q.push({
        type: "isolation-latch",
        side: this.currentSessionIsolationLatch,
        sessionId,
      });
    if (this.currentSessionDevModsFolder)
      q.push({
        type: "dev-mods",
        folder: this.currentSessionDevModsFolder,
        sessionId,
      });
    let index = this.currentSessionMemoryModeStamps.findIndex(
      (currentSessionMemoryModeStamp) => !currentSessionMemoryModeStamp.written,
    );
    let Se = [];
    if (
      index !== -1 &&
      (h ||
        !this.currentSessionMemoryModeStamps.some(
          (currentSessionMemoryModeStamp) => currentSessionMemoryModeStamp.inFlight,
        ))
    )
      for (let currentSessionMemoryModeStamp of this.currentSessionMemoryModeStamps.slice(index)) {
        currentSessionMemoryModeStamp.inFlight = true;
        Se.push(currentSessionMemoryModeStamp);
        q.push({
          type: "memory-mode",
          mode: currentSessionMemoryModeStamp.mode,
          afterUuid: currentSessionMemoryModeStamp.afterUuid,
          timestamp: currentSessionMemoryModeStamp.timestamp,
          ...(currentSessionMemoryModeStamp.reason !== undefined && {
            reason: currentSessionMemoryModeStamp.reason,
          }),
          ...(currentSessionMemoryModeStamp.account !== undefined && {
            account: currentSessionMemoryModeStamp.account,
          }),
          ...(currentSessionMemoryModeStamp.accountChoice !== undefined && {
            accountChoice: currentSessionMemoryModeStamp.accountChoice,
          }),
          sessionId,
        });
      }
    let conversationAtisLatch = getConversationAtisLatch();
    if (conversationAtisLatch !== undefined) {
      q.push({
        type: "atis-latch",
        atis: conversationAtisLatch,
        sessionId,
      });
      this.atisLatchStamp = `${sessionFile}
${conversationAtisLatch}`;
    }
    let conversationToolsUsed = getConversationToolsUsed();
    if (
      isSillyShoreGateOn() &&
      conversationToolsUsed.size() > 0 &&
      this.toolsUsedStamp !==
        `${sessionFile}
${conversationToolsUsed.generation()}`
    ) {
      q.push({
        type: "tools-used",
        tools: conversationToolsUsed.names(),
        sessionId,
      });
      this.toolsUsedStamp = `${sessionFile}
${conversationToolsUsed.generation()}`;
    }
    if (this.currentSessionWorktree !== undefined)
      q.push({
        type: "worktree-state",
        worktreeSession: this.currentSessionWorktree,
        sessionId,
      });
    if (
      this.currentSessionPrNumber !== undefined &&
      this.currentSessionPrUrl &&
      this.currentSessionPrRepository
    )
      q.push({
        type: "pr-link",
        sessionId,
        prNumber: this.currentSessionPrNumber,
        prUrl: this.currentSessionPrUrl,
        prRepository: this.currentSessionPrRepository,
        timestamp: new Date().toISOString(),
      });
    if (this.currentSessionArtifactCount && e !== "")
      q.push({
        type: "frame-link",
        artifactCount: this.currentSessionArtifactCount,
        sessionId,
        timestamp: new Date().toISOString(),
      });
    if (this.currentSessionHistorySuppressed) q.push(buildHistorySuppressionEntry(sessionId, "migration"));
    if (this.currentSessionBridgeId)
      q.push({
        type: "bridge-session",
        sessionId,
        bridgeSessionId: this.currentSessionBridgeId,
        lastSequenceNum: this.currentSessionBridgeSeq ?? 0,
        ...(this.currentSessionBridgeDialogKinds?.length && {
          declaredDialogKinds: this.currentSessionBridgeDialogKinds,
        }),
        ...(this.currentSessionBridgeGroupingId && {
          sessionGroupingId: this.currentSessionBridgeGroupingId,
        }),
        ...(this.currentSessionBridgeNoBackfill && {
          noHistoryBackfill: true,
        }),
        ...(this.currentSessionBridgeOwnerAccountUuid && {
          ownerAccountUuid: this.currentSessionBridgeOwnerAccountUuid,
        }),
        ...(this.currentSessionBridgeOwnerOrganizationUuid && {
          ownerOrganizationUuid: this.currentSessionBridgeOwnerOrganizationUuid,
        }),
      });
    if (r || q.length === 0)
      return {
        sessionFile,
        entries: q,
        stamps: Se,
      };
    let Ee = new Set(q.map((We) => We.type));
    let Ae = new Map();
    let Ie = 0;
    for (let idx = lines.length - 1; idx >= 0; idx--) {
      if (Ae.size === Ee.size) break;
      let ze = lines[idx] ?? "";
      Ie += Buffer.byteLength(ze, "utf8") + 1;
      if (Ie > LITE_READ_BUF_SIZE / 2) break;
      if (!ze) continue;
      let lt;
      for (let Je of Ee)
        if (!Ae.has(Je) && ze.includes(`"type":"${Je}"`)) {
          lt = Je;
          break;
        }
      if (!lt) continue;
      try {
        let Je = jsonParseRaw(ze);
        if (Je.type === lt) Ae.set(lt, Je);
      } catch {}
    }
    let Me = (We) => {
      if (We.type === "history-suppression")
        return jsonStringify({
          type: We.type,
          sessionId: We.sessionId,
        });
      let { timestamp, ts, ...Je } = We;
      return jsonStringify(Je);
    };
    return {
      sessionFile,
      entries: q.filter((We) => {
        if (We.type === "memory-mode") return true;
        let ze = Ae.get(We.type);
        return !ze || Me(We) !== Me(ze);
      }),
      stamps: Se,
    };
  }
  async flush() {
    this.releaseWaitsForUploads();
    if (this.flushTimer) {
      clearTimeout(this.flushTimer);
      this.flushTimer = null;
    }
    if (this.activeDrain) await this.activeDrain;
    await this.drainWriteQueue();
    while (this.pendingWriteCount > 0) {
      await new Promise((resolve) => {
        this.flushResolvers.push(resolve);
      });
      await this.drainWriteQueue();
    }
    if (this.sessionFile !== null && this.heldReplayRecords.length > 0) await this.releaseHeldReplayRecords();
    if (this.writeQueues.size > 0) await this.drainWriteQueue();
    if (this.storeFence !== undefined) throw this.storeFence;
  }
  drainQueuedRows(e, n, r) {
    if (!this.writeQueues.has(e)) return;
    this.drainWriteQueue();
    let s = withDeadline(
      this.drainChain.then(() => "drained"),
      n,
    ).then((h) => h ?? "timed_out");
    return r === undefined ? s : raceWithAbortSignal(s, r, () => new AbortError_2());
  }
  async removeMessageByUuid(e, n, r) {
    return this.trackWrite(async () => {
      let s = n === this.store.getSessionId() ? this.sessionFile : await this.getExistingSessionFile(n, r);
      if (!s)
        return {
          drained: Promise.resolve(),
        };
      this.restartReplayIndex(s, true);
      this.queuedToolResults.clear();
      let h = this.enqueueRemove(s, e, r);
      this.trackWrite(() => h);
      return {
        drained: h,
      };
    });
  }
  async performRemoveByUuid(e, n, r) {
    let s = r !== undefined ? transcriptStorageKeyForPath(e) : undefined;
    if (isStorageV5Enabled() && r !== undefined && s !== undefined) return this.removeByUuidV5(r, s, n);
    if (isDiskless()) return;
    let h = false;
    try {
      let y = 0;
      let S = await open(e, "r+");
      try {
        let { size } = await S.stat();
        y = size;
        if (size === 0) return;
        let min = Math.min(size, LITE_READ_BUF_SIZE);
        let Se = size - min;
        let ke = Buffer.allocUnsafe(min);
        let { bytesRead } = await S.read(ke, 0, min, Se);
        let chunk = ke.subarray(0, bytesRead);
        let Ae = `"uuid":"${n}"`;
        let index = chunk.lastIndexOf(Ae);
        if (index >= 0) {
          let index_2 = chunk.lastIndexOf(10, index);
          if (index_2 >= 0 || Se === 0) {
            let We = index_2 + 1;
            let index_3 = chunk.indexOf(10, index + Ae.length);
            let lt = index_3 >= 0 ? index_3 + 1 : bytesRead;
            let Je = Se + We;
            let nt = bytesRead - lt;
            h = true;
            await S.truncate(Je);
            if (nt > 0) {
              let { bytesWritten } = await S.write(chunk, lt, nt, Je);
              if (bytesWritten < nt) throw Error("performRemoveByUuid: short write");
            }
            return;
          }
        }
      } finally {
        await S.close();
      }
      if (y > MAX_TRANSCRIPT_READ_BYTES_2) {
        logForDebugging(`Skipping tombstone removal: session file too large (${formatFileSize(y)})`, {
          level: "warn",
        });
        return;
      }
      let lines = (
        await readFile(e, {
          encoding: "utf-8",
        })
      ).split(`
`);
      let filtered = lines.filter((line) => {
        if (!line.trim()) return true;
        try {
          return jsonParse(line).uuid !== n;
        } catch {
          return true;
        }
      });
      if (filtered.length === lines.length) return;
      h = true;
      await writeFile(
        e,
        filtered.join(`
`),
        {
          encoding: "utf8",
        },
      );
    } catch {
      if (h && this.replaySources.has(e)) {
        this.restartReplayIndex(e);
        clearAllReplayChains();
        this.queuedToolResults.clear();
      }
    }
  }
  async removeByUuidV5(e, n, r) {
    try {
      let buffer = Buffer.from(`"uuid":"${r}"`);
      for (let idx = 1; idx <= 3; idx++) {
        let y = await e.read([
          {
            key: n,
            tail: LITE_READ_BUF_SIZE,
          },
        ]);
        if (!y.ok) {
          if (isByteViewUnsupportedError(y.error))
            return await removeTombstones(e, n, r, {
              windowBytes: LITE_READ_BUF_SIZE,
              pageBytes: TRANSCRIPT_PAGE_BYTES,
              maxReadBytes: MAX_TRANSCRIPT_READ_BYTES_2,
            });
          logForDebugging(`Tombstone removal abandoned: tail read failed (${y.error.code})`, {
            level: "warn",
          });
          return;
        }
        let [S] = y.value.items;
        if (!S.found) return;
        let buffer_2 = Buffer.from(S.value.buffer, S.value.byteOffset, S.value.byteLength);
        if (buffer_2.length === 0) return;
        let L = S.totalBytes - buffer_2.length;
        let index = buffer_2.lastIndexOf(buffer);
        let q = index < 0 ? -1 : buffer_2.lastIndexOf(10, index);
        if (index < 0 || (q < 0 && L > 0))
          return await this.removeByUuidSlowV5(e, n, r, S.totalBytes, S.version);
        let index_2 = buffer_2.indexOf(10, index + buffer.length);
        if (index_2 < 0) return;
        let Se = await e.replaceRecords(n, [], {
          keepBefore: L + q + 1,
          preserveFrom: L + index_2 + 1,
          publishDiscipline: "inPlace",
          precondition:
            S.version !== undefined
              ? {
                  type: "ifMatch",
                  version: S.version,
                }
              : {
                  type: "none",
                },
        });
        if (Se.ok || Se.error.code === "NotFound") return;
        if (!(Se.error.code === "PreconditionFailed" || Se.error.code === "Unavailable") || idx === 3) {
          logForDebugging(`Tombstone removal abandoned after ${idx} attempt(s) (${Se.error.code})`, {
            level: "warn",
          });
          return;
        }
      }
    } catch (error) {
      logForDebugging(`Tombstone removal abandoned: ${errorMessage(error)}`, {
        level: "warn",
      });
    }
  }
  async removeByUuidSlowV5(e, n, r, s, h) {
    let y = h;
    if (y === undefined) {
      let stats = await e.stat(n);
      if (!stats.ok) {
        if (stats.error.code !== "NotFound")
          logForDebugging(`Tombstone removal abandoned: stat failed (${stats.error.code})`, {
            level: "warn",
          });
        return;
      }
      s = stats.value.size;
      y = stats.value.version;
    }
    if (s > MAX_TRANSCRIPT_READ_BYTES_2) {
      logForDebugging(`Skipping tombstone removal: session file too large (${formatFileSize(s)})`, {
        level: "warn",
      });
      return;
    }
    let S;
    let w = [];
    let L;
    for (;;) {
      let records = await e.readRecords(n, {
        order: "forward",
        ...(L !== undefined && {
          fromSeq: L,
        }),
        maxBytes: TRANSCRIPT_PAGE_BYTES,
      });
      if (!records.ok) {
        logForDebugging(`Tombstone removal abandoned: paging failed (${records.error.code})`, {
          level: "warn",
        });
        return;
      }
      let Z = false;
      for (let item of records.value.items) {
        if (item.seq >= s) {
          Z = true;
          break;
        }
        let str = Buffer.from(item.data.buffer, item.data.byteOffset, item.data.byteLength).toString("utf8");
        let sliced = str.slice(0, -1);
        let Ae = false;
        if (sliced.trim())
          try {
            Ae = jsonParseRaw(sliced).uuid === r;
          } catch {}
        if (Ae) {
          S ??= item.seq;
          continue;
        }
        if (S !== undefined)
          w.push({
            data: str,
          });
      }
      let nextSeq = records.value.nextSeq;
      if (Z || nextSeq === undefined || nextSeq >= s) break;
      L = nextSeq;
    }
    if (S === undefined) return;
    let G = await e.replaceRecords(n, w, {
      keepBefore: S,
      preserveFrom: s,
      publishDiscipline: "inPlace",
      precondition:
        y !== undefined
          ? {
              type: "ifMatch",
              version: y,
            }
          : {
              type: "none",
            },
    });
    if (!G.ok && G.error.code !== "NotFound")
      logForDebugging(`Tombstone removal abandoned on the paged path (${G.error.code})`, {
        level: "warn",
      });
  }
  async performCompactTranscript(e, n, r, s, h = false) {
    let y = s !== undefined ? transcriptStorageKeyForPath(e) : undefined;
    if (isStorageV5Enabled() && s !== undefined && y !== undefined)
      return this.performCompactTranscriptV5(s, y, e, h);
    if (isDiskless()) return;
    let S = `${e}.compact.tmp.${randomBytes(4).toString("hex")}`;
    let w = false;
    let L = false;
    try {
      let G = await stat(e);
      if (G.size < COMPACT_MIN_FILE_BYTES) return;
      let q = 4096;
      let Z = [
        [0, Math.min(q, G.size)],
        [Math.max(0, Math.floor(G.size / 2) - q / 2), Math.min(q, G.size)],
        [Math.max(0, G.size - q), Math.min(q, G.size)],
      ];
      let Se = async () => {
        let Et = await open(e, "r");
        try {
          let yt = [];
          for (let [gt, At] of Z) {
            let It = Buffer.alloc(At);
            let Yt = 0;
            while (Yt < At) {
              let { bytesRead } = await Et.read(It, Yt, At - Yt, gt + Yt);
              if (bytesRead <= 0) break;
              Yt += bytesRead;
            }
            yt.push(It.subarray(0, Yt));
          }
          return yt;
        } finally {
          await Et.close().catch(() => {});
        }
      };
      let ke = await Se();
      let we = async () => {
        let Et = await Se();
        return ke.some((yt, gt) => !Et[gt] || !yt.equals(Et[gt]));
      };
      {
        let Et = ke[2];
        if (!Et || Et.length === 0 || Et.at(-1) !== 10) {
          logEvent("tengu_transcript_compact_failed", {
            reason: lit_2("snapshot_mid_line"),
          });
          return;
        }
      }
      let Ee = await scanCompactBoundaries(e, G.size);
      if (Ee === 0 || this.skipLowYieldCompact(e, G.size, Ee, true)) return;
      let Ae = () =>
        transcriptLines(
          createReadStream(e, {
            encoding: "utf8",
            end: G.size - 1,
          }),
        );
      forceGcIfBun(h);
      let transcriptEntries = await readTranscriptEntries(Ae());
      if (transcriptEntries.kind === "skip") return;
      if (transcriptEntries.kind === "abort") {
        logEvent("tengu_transcript_compact_failed", {
          reason: fromEnum(transcriptEntries.reason),
        });
        return;
      }
      if (this.skipLowYieldCompact(e, G.size, transcriptEntries.reclaimableBytes)) return;
      let lineEmitter = makeLineEmitter(transcriptEntries.plan);
      let We = await open(S, "w", 384);
      let ze = "";
      let lt = 0;
      let Je = async (Et) => {
        await writeFully(We, Et, null);
        lt += Et.length;
      };
      let nt = false;
      let pt = async (Et) => {
        ze +=
          stripLeadingNuls(Et) +
          `
`;
        if (ze.length >= LITE_READ_BUF_SIZE) {
          await Je(Buffer.from(ze, "utf8"));
          ze = "";
        }
      };
      try {
        let Et = 0;
        for await (let At of Ae()) {
          for (let It of lineEmitter(Et, At)) await pt(It);
          Et++;
        }
        await Je(Buffer.from(ze, "utf8"));
        n?.();
        let yt = await stat(e);
        if (yt.ino !== G.ino || yt.size < G.size || (await we())) {
          logEvent("tengu_transcript_compact_failed", {
            reason: lit_2("source_changed"),
          });
          return;
        }
        if (yt.size > G.size) {
          let At = Buffer.alloc(yt.size - G.size);
          let It = await open(e, "r");
          let Yt = 0;
          try {
            while (Yt < At.length) {
              let { bytesRead } = await It.read(At, Yt, At.length - Yt, G.size + Yt);
              if (bytesRead <= 0) break;
              Yt += bytesRead;
            }
          } finally {
            await It.close().catch(() => {});
          }
          if (Yt < At.length) {
            logEvent("tengu_transcript_compact_failed", {
              reason: lit_2("appended_rows_unread"),
            });
            return;
          }
          while (Yt > 0 && At[Yt - 1] !== 10) Yt--;
          await Je(At.subarray(0, Yt));
        }
        await We.sync();
        let size = (await We.stat()).size;
        if (size !== lt) {
          logEvent("tengu_transcript_compact_failed", {
            reason: lit_2("staged_size_mismatch"),
            staged_bytes: size,
            written_bytes: lt,
          });
          return;
        }
        r?.();
        if ((await stat(e)).ino !== G.ino || (await we())) {
          logEvent("tengu_transcript_compact_failed", {
            reason: lit_2("source_changed"),
          });
          return;
        }
        nt = true;
        await We.close();
      } finally {
        if (!nt) await We.close().catch(() => {});
      }
      L = true;
      await retryFsOp(S, e);
      w = true;
      if (e === this.sessionFile)
        for (let deletedUuid of transcriptEntries.plan.deletedUuids) this.sessionRowsDeleted.add(deletedUuid);
      this.queuedToolResults.clear();
      this.recordCompactYield(e, G.size, transcriptEntries.reclaimableBytes);
      if (e === this.sessionFile) await this.reAppendSessionMetadataAsync(false, true).catch(() => {});
      logEvent("tengu_transcript_compact", {
        bytesBefore: G.size,
        bytesAfter: lt,
      });
    } catch (error) {
      let errnoCode = getErrnoCode(error);
      logEvent("tengu_transcript_compact_failed", {
        reason:
          L && errnoCode !== undefined && ATOMIC_WRITE_ERRNOS.has(errnoCode)
            ? lit_2("rename_fallback")
            : lit_2("io"),
        error_code: sanitizedErrnoLowerForTelemetry(error),
      });
      logForDebugging(`Transcript compact failed (${getErrnoCode(error)}): ${errorMessage(error)}`, {
        level: "warn",
      });
    } finally {
      if (!w) await unlink(S).catch(() => {});
    }
  }
  async performCompactTranscriptV5(e, n, r, s) {
    let h = (y, error) => {
      logEvent("tengu_transcript_compact_failed", {
        reason: fromEnum(y),
        ...((y === "io" || y === "rename_fallback") && {
          error_code: sanitizedErrnoLowerForTelemetry(error),
        }),
      });
    };
    try {
      let stats = await e.stat(n, {
        witness: true,
      });
      if (!stats.ok) {
        h("io");
        logForDebugging(
          `Transcript compact failed (${stats.error.code}): ${formatStorageError(stats.error)}`,
          {
            level: "warn",
          },
        );
        return;
      }
      let size = stats.value.size;
      let tornTailBytes = stats.value.tornTailBytes ?? 0;
      if (size + tornTailBytes < COMPACT_MIN_FILE_BYTES) return;
      if (tornTailBytes > 0) {
        h("snapshot_mid_line");
        return;
      }
      let seq = -1;
      let G = async function* () {
        let Ee;
        for (;;) {
          let records = await e.readRecords(n, {
            order: "forward",
            ...(Ee !== undefined && {
              fromSeq: Ee,
            }),
            maxBytes: MAX_PAGED_TRANSCRIPT_BYTES,
          });
          if (!records.ok) {
            logForDebugging(
              `Transcript compact: storage read failed (${records.error.code}): ${formatStorageError(records.error)}`,
              {
                level: "warn",
              },
            );
            throw Error("transcript storage read failed", {
              cause: records.error,
            });
          }
          for (let item of records.value.items) {
            if (item.seq >= size) return;
            seq = item.seq;
            let str = Buffer.from(item.data.buffer, item.data.byteOffset, item.data.byteLength).toString(
              "utf8",
            );
            if (
              str.endsWith(`
`)
            )
              str = str.slice(0, -1);
            if (str.endsWith("\r")) str = str.slice(0, -1);
            yield str;
          }
          let nextSeq = records.value.nextSeq;
          if (nextSeq === undefined || nextSeq >= size) return;
          Ee = nextSeq;
        }
      };
      forceGcIfBun(s);
      let transcriptEntries = await readTranscriptEntries(G());
      if (transcriptEntries.kind === "skip") return;
      if (transcriptEntries.kind === "abort") {
        h(transcriptEntries.reason);
        return;
      }
      if (this.skipLowYieldCompact(r, size, transcriptEntries.reclaimableBytes)) return;
      let lineEmitter = makeLineEmitter(transcriptEntries.plan);
      let Se = async function* () {
        let Ee = 0;
        for await (let Ae of G()) {
          for (let Ie of lineEmitter(Ee, Ae))
            yield {
              data:
                stripLeadingNuls(Ie) +
                `
`,
            };
          Ee++;
        }
      };
      let ke = await e.replaceRecords(n, Se(), {
        preserveFrom: size,
        precondition: {
          type: "ifUnchangedThrough",
          seq,
          version: stats.value.version,
        },
        publishDiscipline: "atomic",
        mode: 384,
        parent: "mustExist",
      });
      if (!ke.ok) {
        let error = ke.error;
        if (error.code === "PreconditionFailed") {
          h("source_changed");
          return;
        }
        let telemetryCode =
          error.code === "Failed" || error.code === "Unavailable" ? error.telemetryCode : undefined;
        if (error.code === "InvalidArgument") {
          h(error.argument.startsWith("opts.precondition") ? "invalid_token" : "invalid_argument");
          logForDebugging(`Transcript compact skipped (${error.code}): ${formatStorageError(error)}`, {
            level: "warn",
          });
          return;
        }
        let Ie =
          (error.code === "Failed" || error.code === "Unavailable") &&
          error.phase === "publish" &&
          telemetryCode !== undefined &&
          ATOMIC_WRITE_ERRNOS.has(telemetryCode);
        h(Ie ? "rename_fallback" : "io", {
          code: telemetryCode,
        });
        logForDebugging(
          `Transcript compact failed (${telemetryCode ?? error.code}): ${formatStorageError(error)}`,
          {
            level: "warn",
          },
        );
        return;
      }
      if (r === this.sessionFile)
        for (let deletedUuid of transcriptEntries.plan.deletedUuids) this.sessionRowsDeleted.add(deletedUuid);
      this.recordCompactYield(r, size, transcriptEntries.reclaimableBytes);
      let bytesAfter = ke.value.sizeAfter;
      if (r === this.sessionFile)
        await this.reAppendSessionMetadataAsync(false, true, e, true).catch(() => {});
      logEvent("tengu_transcript_compact", {
        bytesBefore: size,
        bytesAfter,
      });
    } catch (error) {
      h("io", error);
      logForDebugging(`Transcript compact failed (${getErrnoCode(error)}): ${errorMessage(error)}`, {
        level: "warn",
      });
    }
  }
  skipLowYieldCompact(e, n, r, s = false) {
    if (!this.store.lowYieldCompactSkipEnabled || !isLowYieldCompaction(n, r)) return false;
    this.recordCompactYield(e, n, r);
    logEvent("tengu_transcript_compact_skipped", {
      bytesBefore: n,
      reclaimableBytes: r,
      ...(s && {
        reclaimableBytesIsUpperBound: true,
      }),
    });
    return true;
  }
  recordCompactYield(e, n, r) {
    this.bytesSinceCompact = 0;
    if (e === this.sessionFile)
      this.backstopThresholdBytes = isLowYieldCompaction(n, r)
        ? Math.min(this.backstopThresholdBytes * 2, SESSION_ENTRY_APPEND_POLICY)
        : ENTRY_APPEND_POLICY_2;
  }
  shouldSkipPersistence() {
    return isTranscriptPersistenceDisabled() || this.appendsSealedForShutdown;
  }
  appendsSealedForShutdown = false;
  sealAppendsForShutdown() {
    this.appendsSealedForShutdown = true;
  }
  async materializeSessionFile(e) {
    if (this.shouldSkipPersistence()) return;
    try {
      this.ensureCurrentSessionFile();
      try {
        await this.reAppendSessionMetadataAsync(false, false, e);
      } catch (error) {
        swallowRefusedDirectWrite(error);
      }
      if (this.pendingEntries.length > 0) {
        let pendingEntries = this.pendingEntries;
        this.pendingEntries = [];
        for (let { entry, storageV5 } of pendingEntries)
          await this.appendEntry(entry, undefined, undefined, storageV5);
        if (this.currentSessionRelocatedCwd) await this.reAppendSessionMetadataAsync(true, false, e);
      }
    } catch (error) {
      let errnoCode = getErrnoCode(error);
      if (isSyscallError(error))
        logForDebugging(`Session file materialize failed (${errnoCode}): ${errorMessage(error)}`, {
          level: "error",
        });
      else logError(error);
      reportTranscriptWriteFailure(this.store.writerHealth, "materialize", error, this.sessionFile);
    }
    try {
      this.store.sessionFileMaterialized.emit();
    } catch (error) {
      if (isSyscallError(error))
        logForDebugging(
          `Session file materialize listener failed (${getErrnoCode(error)}): ${errorMessage(error)}`,
          {
            level: "error",
          },
        );
      else logError(error);
    }
  }
  releaseHeldReplayRecords() {
    let heldReplayRecords = this.heldReplayRecords;
    this.heldReplayRecords = [];
    return this.trackWrite(async () => {
      for (let { records, resolve, reject } of heldReplayRecords)
        await this.writeRequestReplayRecords(records).then(resolve, reject);
    });
  }
  settleHeldReplayRecords() {
    for (let { resolve } of this.heldReplayRecords) resolve("no_transcript");
    this.heldReplayRecords = [];
  }
  async insertMessageChain(transcript, n = false, agentId, s, h, y, S, w, L, G, q) {
    let Z = y ?? getSessionId();
    let Se = S ?? isForeignToBinding(pinSessionId(Z));
    let ke = L === undefined ? (bridgeSessionForPulledWindow(pinSessionId(Z)) ?? null) : L;
    let we = G ?? pulledRows();
    let Ee = q === undefined ? getPromptId_2() : q;
    return this.trackWrite(async () => {
      let Ae = s ?? null;
      let Ie;
      if (
        this.sessionFile === null &&
        Z === getSessionId() &&
        transcript.some((nt) => nt.type === "user" || nt.type === "assistant" || nt.type === "system")
      ) {
        this.awaitingFirstUserRow = true;
        await this.materializeSessionFile(w);
      }
      let Me;
      try {
        Me = await getBranch();
      } catch {
        Me = undefined;
      }
      refreshCheckoutMetadata();
      let sessionId = Z;
      let slug = getPlanSlugCache().get(sessionId);
      let lt = n || this.shouldSkipPersistence() ? null : await this.store.sessionMessages(sessionId, w);
      if (!n && !Se && this.sessionFile !== null && Z === getSessionId()) {
        let conversationAtisLatch = getConversationAtisLatch();
        if (
          conversationAtisLatch !== undefined &&
          this.atisLatchStamp !==
            `${this.sessionFile}
${conversationAtisLatch}`
        ) {
          this.atisLatchStamp = `${this.sessionFile}
${conversationAtisLatch}`;
          await this.appendEntry(
            {
              type: "atis-latch",
              atis: conversationAtisLatch,
              sessionId,
            },
            sessionId,
            undefined,
            w,
          );
        }
      }
      if (!Se && this.sessionFile !== null && Z === getSessionId()) {
        let conversationToolsUsed = getConversationToolsUsed();
        let pt = `${this.sessionFile}
${conversationToolsUsed.generation()}`;
        if (isSillyShoreGateOn() && conversationToolsUsed.size() > 0 && this.toolsUsedStamp !== pt) {
          await this.appendEntry(
            {
              type: "tools-used",
              tools: conversationToolsUsed.names(),
              sessionId,
            },
            sessionId,
            undefined,
            w,
          );
          this.toolsUsedStamp = pt;
        }
      }
      let Je = false;
      for (let nt of transcript) {
        let pt = isCompactBoundaryMessage_3(nt);
        let sessionFile = !n && Z === getSessionId() ? this.sessionFile : null;
        if (pt && sessionFile) {
          this.compactAwaitingSummary = {
            filePath: sessionFile,
            storageV5: w,
          };
          this.sessionLastBoundaryUuid = nt.uuid;
          Je = false;
        }
        let yt = Ae;
        if (nt.type === "user" && "sourceToolAssistantUUID" in nt && nt.sourceToolAssistantUUID) {
          let sourceToolAssistantUUID = nt.sourceToolAssistantUUID;
          if (lt === null || lt.has(sourceToolAssistantUUID)) yt = sourceToolAssistantUUID;
          else logEvent("tengu_phantom_parent_write", {});
        }
        if (yt === nt.uuid) logEvent("tengu_chain_self_reference_write", {});
        let gt = {
          parentUuid: pt ? null : yt,
          logicalParentUuid: pt ? Ae : undefined,
          isSidechain: n,
          teamName: h?.teamName,
          agentName: h?.agentName,
          promptId: nt.type === "user" ? (Ee ?? undefined) : undefined,
          agentId,
          ...withTaskProducerMarkRecorded(nt),
          ...transcriptStamp(sessionId),
          version: transcriptVersionOrDefault(nt),
          gitBranch: Me,
          slug,
        };
        gt.isSidechain = n;
        if (n) gt.agentId = agentId;
        if (gt.type === "user" && gt.toolUseResult != null)
          gt.toolUseResult = dropLargeOriginalFile(gt.toolUseResult);
        await this.appendEntry(gt, Z, Se, w, ke, we);
        if (
          this.awaitingFirstUserRow &&
          !n &&
          Z === getSessionId() &&
          nt.type === "user" &&
          !hasToolResultMessage(nt.message.content)
        )
          this.awaitingFirstUserRow = false;
        if (pt && sessionFile) this.backstopThresholdBytes = ENTRY_APPEND_POLICY_2;
        if (sessionFile && (nt.type === "user" || nt.type === "assistant")) Je = true;
        if (isChainParticipant(nt)) {
          Ae = nt.uuid;
          Ie = nt.timestamp;
        }
      }
      if (Je && this.compactAwaitingSummary) {
        let { filePath, storageV5 } = this.compactAwaitingSummary;
        this.compactAwaitingSummary = undefined;
        if (filePath === this.sessionFile) this.requestCompact(filePath, storageV5, true);
      }
      if (!n && Z === getSessionId()) {
        if (Ae && Ie && (!this.currentSessionLeafTs || Ie >= this.currentSessionLeafTs)) {
          this.currentSessionLeafUuid = Ae;
          this.currentSessionLeafTs = Ie;
        }
        let firstMeaningfulUserMessageTextContent = getFirstMeaningfulUserMessageTextContent(transcript);
        if (firstMeaningfulUserMessageTextContent)
          this.currentSessionLastPrompt = this.normalizeLastPrompt(firstMeaningfulUserMessageTextContent);
      }
      if (!this.awaitingFirstUserRow && this.sessionFile !== null && this.heldReplayRecords.length > 0)
        await this.releaseHeldReplayRecords();
    });
  }
  async insertFileHistorySnapshot(messageId, snapshot, isSnapshotUpdate, s) {
    return this.trackWrite(async () => {
      let fileHistoryMessage = {
        type: "file-history-snapshot",
        messageId,
        snapshot,
        isSnapshotUpdate,
      };
      await this.appendEntry(fileHistoryMessage, undefined, undefined, s);
    });
  }
  async insertFileHistoryDelta(e, n) {
    return this.trackWrite(async () => {
      await this.appendEntry(e, undefined, undefined, n);
    });
  }
  async insertQueueOperation(e, n) {
    return this.trackWrite(async () => {
      let r = normalizeUuidOrNull(e.sessionId);
      if (r === null || r === this.store.getSessionId()) {
        await this.appendEntry(e, undefined, undefined, n);
        return;
      }
      let s = this.queueOperationsRaisedElsewhere.then(async () => {
        if ((await this.getExistingSessionFile(r, n)) !== null) await this.appendEntry(e, r, undefined, n);
      });
      this.queueOperationsRaisedElsewhere = s.catch(() => {});
      await s;
    });
  }
  async insertAttributionSnapshot(e, n) {
    return this.trackWrite(async () => {
      await this.appendEntry(e, undefined, undefined, n);
    });
  }
  async insertContentReplacement(replacements, agentId, r) {
    return this.trackWrite(async () => {
      let s = {
        type: "content-replacement",
        sessionId: this.store.getSessionId(),
        agentId,
        replacements,
      };
      await this.appendEntry(s, undefined, undefined, r);
    });
  }
  replaySources = new Map();
  queuedToolResults = new Map();
  oversizeReplayShapes = new Set();
  queuedToolResultDigest(e, n) {
    if (e.storageV5 !== undefined || e.sessionId !== this.store.getSessionId()) return;
    let r = e.agentId ? agentTranscriptPathOfEntry(e.agentId) : this.sessionFile;
    return r
      ? this.queuedToolResults.get(`${r}
${n}`)
      : undefined;
  }
  restartReplayIndex(e, n = false) {
    this.store.replaySeedStarts.delete(normalize(e));
    if (!isRequestBlobStoreEnabled()) return;
    let r = (h) => ({
      index: (h?.index ?? new RequestBlobStore()).successor(n),
      fileExisted: true,
    });
    let s = this.replaySources.get(e);
    this.replaySources.set(e, s === undefined ? Promise.resolve(r()) : s.then(r));
  }
  replayIndexFor(e) {
    let n = this.replaySources.get(e);
    if (n === undefined) {
      let r = normalize(e);
      n = seedReplayIndex(e, this.store.replaySeedStarts.get(r));
      this.store.replaySeedStarts.delete(r);
      this.replaySources.set(e, n);
    }
    return n;
  }
  async replayTargetFile(e) {
    let n =
      e.sessionId === this.store.getSessionId()
        ? this.sessionFile
        : await this.getExistingSessionFile(e.sessionId, e.storageV5);
    if (n === null || n === undefined) return;
    return e.agentId ? agentTranscriptPathOfEntry(e.agentId) : n;
  }
  isRemotelyMirrored() {
    return this.internalEventWriter !== null || (isEnvTruthy("true") && Boolean(this.remoteIngressUrl));
  }
  async appendRequestReplayRecords(e) {
    if (!e.target.agentId && (this.sessionFile === null || this.awaitingFirstUserRow)) {
      let shape = stripCacheControl_4(e.shape);
      let cacheControl = clone(e.request.cacheControl);
      let request = {
        ...e.request,
        cacheControl,
      };
      return new Promise((resolve, reject) => {
        this.heldReplayRecords.push({
          records: {
            ...e,
            shape,
            request,
          },
          resolve,
          reject,
        });
      });
    }
    return this.writeRequestReplayRecords(e);
  }
  async writeRequestReplayRecords(e) {
    return this.trackWrite(async () => {
      let { target, request } = e;
      if (this.shouldSkipPersistence()) return "no_transcript";
      if (this.oversizeReplayShapes.has(e.shapeHash)) return "shape_too_large";
      let s = await this.replayTargetFile(target);
      if (s === undefined) return "no_transcript";
      let { index, fileExisted } = await this.replayIndexFor(s);
      if ((!fileExisted && !index.hasLines) || index.hasForkContextRef) return "no_transcript";
      let S = [];
      if (!index.has(e.shapeHash)) {
        let w = {
          type: "api-request-shape",
          sessionId: request.sessionId,
          ...(request.agentId !== undefined && {
            agentId: request.agentId,
          }),
          shapeHash: e.shapeHash,
          timestamp: request.timestamp,
          version: request.version,
          shape: stripCacheControl_4(e.shape),
        };
        if (Buffer.byteLength(jsonStringify(w)) > MAX_SYNTHETIC_MESSAGE_BYTES) {
          this.oversizeReplayShapes.add(e.shapeHash);
          logError(
            Error(
              "request-replay: system+tools over the record size cap; not recording requests that use them",
            ),
          );
          return "shape_too_large";
        }
        S.push(w);
        index.noteLine(w);
      }
      for (let { hash, message } of e.blobCandidates)
        if (!index.has(hash)) {
          let G = {
            type: "api-request-blob",
            sessionId: request.sessionId,
            ...(request.agentId !== undefined && {
              agentId: request.agentId,
            }),
            hash,
            message,
          };
          S.push(G);
          index.noteLine(G);
        }
      await Promise.all(
        [...S, request].map((w) => this.appendEntry(w, target.sessionId, undefined, target.storageV5)),
      );
      return "written";
    });
  }
  async appendEntry(e, n = this.store.getSessionId(), r, s, h, y) {
    if ("agentId" in e && e.agentId) this.noteAgentWrittenLocally(e.agentId);
    if (this.shouldSkipPersistence()) return;
    if (
      isTranscriptMessage(e) &&
      isCompactOrCarriedMessage(e) &&
      (r === true || isForeignToBinding(pinSessionId(n)))
    )
      this.foreignWithheldEntryUuids.add(e.uuid);
    if (isTranscriptMessage(e) && !e.isSidechain) {
      let G = firstConcreteBridgeSession((y ?? pulledRows())?.get(e.uuid));
      let q =
        G ??
        (isCompactOrCarriedMessage(e)
          ? h === undefined
            ? bridgeSessionForPulledWindow(pinSessionId(n))
            : h
          : undefined);
      if (q !== undefined && q !== null) {
        if (G !== undefined) this.windowNoteEntryUuids.delete(e.uuid);
        else if (e.foreignToBridgeSession === undefined && isCarriedAttachment(e))
          this.windowNoteEntryUuids.add(e.uuid);
        e.foreignToBridgeSession = q;
      }
    }
    if (this.relocationBuffer) {
      this.relocationBuffer.push({
        entry: e,
        sessionId: n,
        storageV5: s,
        foreignAtEntry: r,
        pulledAtEntry: h,
        pulledRowsAtEntry: y,
      });
      return;
    }
    let sessionId = this.store.getSessionId();
    let w = n === sessionId;
    let L;
    if (w) {
      if (this.sessionFile === null) {
        this.pendingEntries.push({
          entry: e,
          storageV5: s,
        });
        return;
      }
      L = this.sessionFile;
    } else {
      let existingSessionFile = await this.getExistingSessionFile(n, s);
      if (!existingSessionFile) {
        logError(
          withTelemetryMessage(
            Error(`appendEntry: session file not found for other session ${n}`),
            "appendEntry: session file not found for other session (id not reported); entry not written",
          ),
        );
        return;
      }
      L = existingSessionFile;
    }
    switch (ENTRY_APPEND_POLICY[e.type]) {
      case "always": {
        this.enqueueWrite(L, e, s);
        return;
      }
      case "route-by-agent": {
        let G =
          (e.type === "content-replacement" ||
            e.type === "api-request-shape" ||
            e.type === "api-request-blob" ||
            e.type === "api-request" ||
            e.type === "fork-context-ref" ||
            e.type === "observer-ref") &&
          e.agentId
            ? agentTranscriptPathOfEntry(e.agentId)
            : L;
        if (G === undefined) {
          logError(Error("appendEntry invariant: agentId cannot name a transcript file; entry dropped"));
          return;
        }
        this.enqueueWrite(G, e, s);
        if (e.type === "fork-context-ref" && isRequestBlobStoreEnabled())
          this.replayIndexFor(G).then(({ index }) => index.noteLine(e));
        return;
      }
      case "dedup-transcript": {
        if (e.type !== "progress" && !isTranscriptMessage(e)) {
          logError(
            Error(`appendEntry invariant: dedup-transcript policy on non-transcript type '${e.type}'`),
          );
          return;
        }
        let G = await this.store.sessionMessages(n, s);
        let q = e.isSidechain && e.agentId !== undefined;
        let Z = q ? agentTranscriptPathOfEntry(e.agentId) : L;
        if (Z === undefined) {
          logError(Error("appendEntry invariant: agentId cannot name a transcript file; entry dropped"));
          return;
        }
        let Se;
        if (!this.appendsSealedForShutdown && isRequestBlobStoreEnabled())
          try {
            Se = (await this.replayIndexFor(Z)).index;
          } catch (error) {
            logError(error);
          }
        let ke = !G.has(e.uuid);
        if (q || ke) {
          this.enqueueWrite(Z, q || s !== undefined ? e : (this.store.slimAppendedRow?.(e) ?? e), s);
          try {
            if (Se !== undefined) {
              Se.noteLine(e);
              if (isCompactBoundaryMessage_3(e)) clearAllReplayChains();
              for (let [we, Ee] of getToolResultDigests(e))
                this.queuedToolResults.set(
                  `${Z}
${we}`,
                  Ee,
                );
            }
          } catch (error) {
            logError(error);
          }
          if (!q) {
            G.add(e.uuid);
            if (isTranscriptMessage(e))
              if (this.internalEventWriter && isShuttingDown()) {
                this.releaseWaitsForUploads();
                this.persistToRemote(n, e);
              } else await this.untilUploadedOrShutdown(this.persistToRemote(n, e));
          } else if (this.internalEventWriter && isTranscriptMessage(e)) this.persistToRemote(n, e);
        }
        return;
      }
    }
  }
  beginTranscriptRelocation() {
    this.relocationBuffer ??= [];
  }
  isTranscriptRelocationInProgress() {
    return this.relocationBuffer !== null;
  }
  async endTranscriptRelocation() {
    let relocationBuffer = this.relocationBuffer;
    this.relocationBuffer = null;
    if (!relocationBuffer) return;
    for (let {
      entry,
      sessionId,
      storageV5,
      foreignAtEntry,
      pulledAtEntry,
      pulledRowsAtEntry,
    } of relocationBuffer)
      await this.appendEntry(entry, sessionId, foreignAtEntry, storageV5, pulledAtEntry, pulledRowsAtEntry);
  }
  ensureCurrentSessionFile() {
    if (this.sessionFile === null) {
      let transcriptPath = getTranscriptPath();
      this.setSessionFile(transcriptPath);
      this.sessionFilesNotYetWritten.add(transcriptPath);
      return transcriptPath;
    }
    return this.sessionFile;
  }
  noteSessionFileMoving(e, n) {
    if (this.sessionFilesNotYetWritten.delete(e)) this.sessionFilesNotYetWritten.add(n);
  }
  existingSessionFiles = new Map();
  sessionFilesNotYetWritten = new Set();
  foreignWithheldEntryUuids = new Set();
  windowNoteEntryUuids = new Set();
  recordedSessionFile(e) {
    return this.existingSessionFiles.get(e);
  }
  async getExistingSessionFile(e, n) {
    let r = this.existingSessionFiles.get(e);
    if (r) {
      if (this.sessionFilesNotYetWritten.has(r)) return r;
      return (await this.probeTranscript(r, n).catch(() => "unknown")) === "absent" ? null : r;
    }
    let transcriptPathForSession = getTranscriptPathForSession(e);
    if ((await this.probeTranscript(transcriptPathForSession, n)) === "present") {
      this.existingSessionFiles.set(e, transcriptPathForSession);
      return transcriptPathForSession;
    }
    return null;
  }
  async probeTranscript(e, n) {
    let r = n !== undefined ? transcriptStorageKeyForPath(e) : undefined;
    if (isStorageV5Enabled() && n !== undefined && r !== undefined)
      try {
        let s = await n.statMeta(r);
        if (s.ok) return "present";
        if (s.error.code === "NotFound") return "absent";
      } catch {}
    if (isDiskless()) return "unknown";
    try {
      await stat(e);
      return "present";
    } catch (error) {
      let errnoCode = getErrnoCode(error);
      if (errnoCode === "ENOENT" || errnoCode === "ENOTDIR") return "absent";
      if (isFsInaccessible(error)) return "unknown";
      throw error;
    }
  }
  async persistToRemote(sessionId, entry) {
    if (this.appendsSealedForShutdown) return;
    if (isShuttingDown() && !this.internalEventWriter) return;
    let r = isRowForeignToBridgeSession(entry, this.internalEventWriterSessionId);
    if (r && !this.windowNoteEntryUuids.delete(entry.uuid)) {
      logForDebugging("[persist-remote] Skipping upload: the row is the /teleport-pulled conversation's");
      return;
    }
    if (
      isCompactOrCarriedMessage(entry) &&
      (r ||
        this.foreignWithheldEntryUuids.delete(entry.uuid) ||
        isRemoteEgressSuppressedFor(pinSessionId(sessionId)))
    ) {
      if (!isCarriedAttachment(entry)) {
        logForDebugging(
          "[persist-remote] Skipping compact-pair upload: conversation carries a history-suppression taint",
        );
        return;
      }
      logForDebugging(
        "[persist-remote] Emptying a carried note for upload: its conversation is withheld from this session",
      );
      entry = {
        ...entry,
        attachment: isProjectsThreadAskAttachment(entry)
          ? {
              type: "projects_thread_ask",
              call: null,
            }
          : {
              type: "session_cron_carry",
              tasks: [],
            },
      };
    }
    if (this.internalEventWriter) {
      try {
        await this.internalEventWriter("transcript", entry, {
          ...(isCompactBoundaryMessage_3(entry) && {
            isCompaction: true,
            preservedEventIds: entry.compactMetadata?.preservedMessages?.uuids,
          }),
          ...(entry.agentId && {
            agentId: entry.agentId,
          }),
        });
      } catch {
        logEvent("tengu_session_persistence_failed", {});
        logForDebugging("Failed to write transcript as internal event");
      }
      return;
    }
    if (!isEnvTruthy("true") || !this.remoteIngressUrl) return;
    if (!(await appendSessionLog(sessionId, entry, this.remoteIngressUrl))) {
      logEvent("tengu_session_persistence_failed", {});
      gracefulShutdownSync(1, "other");
    }
  }
  async mirrorInternalEntry(e) {
    if (isRemoteEgressSuppressedFor(pinSessionId(this.store.getSessionId()))) {
      let n = e;
      if (n.type !== "last-prompt" || n.explicit !== true) return false;
      let { lastPrompt, ...s } = e;
      e = s;
    }
    if (!this.internalEventWriter || isShuttingDown()) return false;
    try {
      await this.internalEventWriter(e.type, e, {});
    } catch (error) {
      logEvent("tengu_session_persistence_failed", {});
      logForDebugging("Failed to mirror internal entry to CCR");
      throw error;
    }
    return true;
  }
  hasInternalEventWriter() {
    return this.internalEventWriter !== null;
  }
  async mirrorWorkerEvent(e, n, { sessionId, agentId }) {
    if (this.shouldSkipPersistence() || isRemoteEgressSuppressedFor(sessionId)) return false;
    if (!this.internalEventWriter || isShuttingDown()) return false;
    await this.internalEventWriter(e, n, {
      agentId,
    });
    return true;
  }
  setRemoteIngressUrl(url) {
    this.remoteIngressUrl = url;
    logForDebugging(`Remote persistence enabled with URL: ${url}`);
    if (url) this.FLUSH_INTERVAL_MS = REPLAY_INDEX_SCAN_LIMIT;
  }
  setInternalEventWriter(internalEventWriter, internalEventWriterSessionId) {
    this.internalEventWriter = internalEventWriter;
    this.internalEventWriterSessionId = internalEventWriterSessionId;
    logForDebugging("CCR v2 internal event writer registered for transcript persistence");
    this.FLUSH_INTERVAL_MS = REPLAY_INDEX_SCAN_LIMIT;
  }
  clearInternalEventWriter() {
    if (!this.internalEventWriter) return;
    this.internalEventWriter = null;
    logForDebugging("CCR v2 internal event writer cleared");
  }
  setInternalEventReader(internalEventReader) {
    this.internalEventReader = internalEventReader;
    logForDebugging("CCR v2 internal event reader registered for session resume");
  }
  setInternalSubagentEventReader(internalSubagentEventReader) {
    this.internalSubagentEventReader = internalSubagentEventReader;
    logForDebugging("CCR v2 subagent event reader registered for session resume");
  }
  getInternalEventReader() {
    return this.internalEventReader;
  }
  getInternalSubagentEventReader() {
    return this.internalSubagentEventReader;
  }
  setInternalAgentEventReader(internalAgentEventReader) {
    this.internalAgentEventReader = internalAgentEventReader;
  }
  setAgentWorkerEventReader(agentWorkerEventReader) {
    this.agentWorkerEventReader = agentWorkerEventReader;
  }
  getAgentWorkerEventReader() {
    return this.agentWorkerEventReader;
  }
  hasInternalAgentEventReader() {
    return this.internalAgentEventReader !== null;
  }
  noteAgentWrittenLocally(e) {
    if (this.internalAgentEventReader !== null) this.agentIdsWrittenLocally.add(e);
  }
  hasWrittenAgentLocally(e) {
    return this.agentIdsWrittenLocally.has(e);
  }
  setVerifiesAgentTranscripts(verifiesAgentTranscripts) {
    this.verifiesAgentTranscripts = verifiesAgentTranscripts;
  }
  mustVerifyAgentTranscript(e) {
    return this.verifiesAgentTranscripts && !this.agentIdsWrittenLocally.has(e);
  }
  noteAgentOverBound(e) {
    this.agentIdsOverBound.add(e);
  }
  isAgentOverBound(e) {
    return this.agentIdsOverBound.has(e);
  }
  async hydrateAgentTranscriptOnDemand(e, n, r, s = false) {
    let internalAgentEventReader = this.internalAgentEventReader;
    if (internalAgentEventReader === null) return "no_reader";
    if (!isSafeIdSegment(e)) return "unsafe_id";
    if (this.agentIdsOverBound.has(e)) throw new AgentTranscriptFetchError("over_bound");
    if (this.agentIdsFetched.has(e)) return "already_fetched";
    let y = this.agentIdsWrittenLocally.has(e);
    let S = this.agentTranscriptFetches.get(e);
    if (S)
      try {
        return await S;
      } catch (error) {
        if (!isAbortError(error) || r?.aborted) throw error;
      }
    let agentTranscriptOnce = this.fetchAgentTranscriptOnce(internalAgentEventReader, e, n, r, y, s);
    this.agentTranscriptFetches.set(e, agentTranscriptOnce);
    try {
      return await agentTranscriptOnce;
    } finally {
      if (this.agentTranscriptFetches.get(e) === agentTranscriptOnce) this.agentTranscriptFetches.delete(e);
    }
  }
  async fetchAgentTranscriptOnce(e, n, r, s, h, y) {
    if (h && wrapStorageSource(getStorageTargetForPath(getAgentTranscriptPath(n), r))) {
      this.agentIdsFetched.add(n);
      logForDiagnosticsNoPII("info", "subagent_lazy_fetch", {
        outcome: "backend_no_create",
        written_locally: true,
      });
      return "backend_no_create";
    }
    let now = Date.now();
    let outcome = "read_fail";
    let pageCount;
    let eventCount;
    let q;
    let Z;
    try {
      let Se;
      if (y && (await readAgentMetadata(n, r).catch(() => null)) !== null) {
        let Me = await openRegularFile(getAgentTranscriptPath(n)).catch(() => null);
        let We = Me && (await tailFile(Me, 65536).catch(() => null));
        await Me?.close().catch(() => {});
        let last = We?.content
          .split(
            `
`,
          )
          .findLast(isConversationLine);
        Se = last && extractLastSyncedEventUuid(last);
      }
      let ke = null;
      if (Se !== undefined) {
        ke = await e(n, s, Se).catch((error) => {
          logError(error);
          return null;
        });
        if (ke === null) Z = s?.aborted ? "aborted" : "failed";
        else if (ke.anchorFallback) Z = `anchor-${ke.anchorFallback}`;
        else
          Z =
            ke.overBound ||
            ke.encodedBody ||
            ke.events.some(
              (event) => isConversationEntry(event.payload) || event.payload?.subtype === "compact_boundary",
            )
              ? "not-current"
              : "current";
      }
      if (Z !== "current" && !ke?.anchorFallback)
        ke = await e(n, s).catch((error) => {
          logError(error);
          return null;
        });
      if (ke === null) {
        if (s?.aborted) {
          outcome = "aborted";
          throw new AbortError_2();
        }
        throw new AgentTranscriptFetchError("read_fail");
      }
      pageCount = ke.stats?.pageCount;
      if (ke.overBound) {
        outcome = "over_bound";
        this.agentIdsOverBound.add(n);
        throw new AgentTranscriptFetchError("over_bound");
      }
      if (ke.encodedBody) {
        outcome = "body_encoded";
        throw new AgentTranscriptFetchError("body_encoded");
      }
      let we = await transcriptContextFields();
      let mapped = ke.events
        .filter((event) => event.session_agent_id === n)
        .map((event) => fillMissingTranscriptFields(event.payload, we));
      eventCount = mapped.length;
      if (mapped.length === 0 && ke.events.length > 0) {
        outcome = "unfiltered";
        throw new AgentTranscriptFetchError("unfiltered");
      }
      let last = mapped.findLast(isConversationEntry);
      let Ie = new Set();
      if (y && last !== undefined)
        await someLineMatches(getAgentTranscriptPath(n), (Me) => {
          for (let We of collectTailUuids(Me)) Ie.add(We);
          return false;
        }).catch((error) => {
          outcome = "local_read_fail";
          q = sanitizedErrnoLowerForTelemetry(error);
          throw new AgentTranscriptFetchError(outcome, {
            cause: error,
          });
        });
      if (!h && this.agentIdsWrittenLocally.has(n)) {
        outcome = "superseded";
        return outcome;
      }
      if (y) {
        let Me =
          last === undefined || Ie.has(last.uuid)
            ? []
            : mapped.filter((lt) => lt.type !== "agent_metadata" && !Ie.has(lt.uuid));
        outcome = "write_fail";
        if (
          (await appendToTranscriptFile(getAgentTranscriptPath(n), jsonlJoin(Me), r, true).catch((error) => {
            q = sanitizedErrnoLowerForTelemetry(error);
            throw new AgentTranscriptFetchError("write_fail", {
              cause: error,
            });
          })) === "skipped"
        )
          throw new AgentTranscriptFetchError("write_fail");
        let last_2 = mapped.findLast((lt) => lt.type === "agent_metadata");
        if (last_2 !== undefined && this.keepsAgentMetadataInStream())
          await restoreAgentSidecarFromStream(n, last_2, r);
        outcome = Me.length > 0 ? "hit" : last === undefined && Z !== "current" ? "empty" : "local_current";
      } else if (mapped.some(isConversationEntry)) {
        outcome = "write_fail";
        outcome =
          (await writeHydratedAgentTranscript(n, mapped, r, {
            createOnly: h,
          }).catch((cause) => {
            throw new AgentTranscriptFetchError("write_fail", {
              cause,
            });
          })) === "exists"
            ? "superseded"
            : "hit";
      } else outcome = "empty";
      this.agentIdsFetched.add(n);
      return outcome;
    } finally {
      if (outcome === "hit" || outcome === "empty" || outcome === "local_current" || outcome === "superseded")
        logFeatureOk("ccr_subagent_lazy_fetch");
      else if (outcome !== "aborted") logFeatureBad("ccr_subagent_lazy_fetch", outcome);
      logForDiagnosticsNoPII("info", "subagent_lazy_fetch", {
        outcome,
        written_locally: h,
        verify_local: y,
        probe: Z,
        errno: q,
        page_count: pageCount,
        event_count: eventCount,
        duration_ms: Date.now() - now,
      });
    }
  }
}
//@ chunk-e6aww6q8.js:407532-407706 facade-majority
function readAtTranscriptEntry(e, n) {
  let sessionId = getSessionId();
  return {
    cleanedMessages: cleanMessagesForLogging(e, n),
    sessionId,
    foreignAtEntry: isForeignToBinding(pinSessionId(sessionId)),
    pulledAtEntry: bridgeSessionForPulledWindow(pinSessionId(sessionId)) ?? null,
    pulledRowsAtEntry: pulledRows(),
    promptIdAtEntry: getPromptId_2(),
  };
}
//@ chunk-e6aww6q8.js:407706-408232 facade-majority = recordTranscript (0.261)
/**
 * 记录一组消息到当前会话转录：清理消息后交给 Project.insertMessageChain，建立 parentUuid 链（压缩边界的 parentUuid 置空并记 logicalParentUuid），检测幻影父节点（tengu_phantom_parent_hint）。
 */
async function recordTranscript(
  messages,
  teamInfo,
  startingParentUuidHint,
  allMessages,
  storageV5,
  {
    cleanedMessages: y,
    sessionId: S,
    foreignAtEntry: w,
    pulledAtEntry: L,
    pulledRowsAtEntry: G,
    promptIdAtEntry: q,
  } = readAtTranscriptEntry(messages, allMessages),
) {
  let sessionId = getProject();
  return sessionId.recordInTurn(S, undefined, async () => {
    let messageSet = await currentTranscriptStore().sessionMessages(S, storageV5);
    let newMessages = [];
    let startingParentUuid = startingParentUuidHint;
    if (startingParentUuid && !isTranscriptPersistenceDisabled() && !messageSet.has(startingParentUuid))
      logEvent("tengu_phantom_parent_hint", {});
    let seenNewMessage = false;
    for (let m of y)
      if (messageSet.has(m.uuid)) {
        if (!seenNewMessage && isChainParticipant(m) && !isReorderedRow(m.uuid)) startingParentUuid = m.uuid;
      } else {
        newMessages.push(m);
        seenNewMessage = true;
      }
    if (newMessages.length > 0)
      await sessionId.insertMessageChain(
        newMessages,
        false,
        undefined,
        startingParentUuid,
        teamInfo,
        S,
        w,
        storageV5,
        L,
        G,
        q,
      );
    return newMessages.findLast(isChainParticipant)?.uuid ?? startingParentUuid ?? null;
  });
}
//@ chunk-e6aww6q8.js:408232-408523 facade-majority
/**
 * 追加 last-prompt 记录：叶子 uuid 与最后一条提示，用于 resume 选取叶子与列表显示。
 */
async function persistLeafCheckpoint(e, n, r) {
  let project = getProject();
  project.currentSessionLeafUuid = e ?? undefined;
  project.currentSessionLeafTs = new Date().toISOString();
  await project.appendEntry(
    {
      type: "last-prompt",
      ...(project.currentSessionLastPrompt && {
        lastPrompt: project.currentSessionLastPrompt,
      }),
      leafUuid: e,
      explicit: true,
      ...n,
      sessionId: getSessionId(),
    },
    undefined,
    undefined,
    r,
  );
}
//@ chunk-e6aww6q8.js:408523-408635 facade-majority
function queueLeafCheckpointWithdrawal() {
  getProject().queueLeafCheckpointWithdrawal({
    type: "last-prompt",
    leafUuid: null,
    explicit: true,
    sessionId: getSessionId(),
  });
}
//@ chunk-e6aww6q8.js:408635-408833 facade-majority
async function mirrorLeafCheckpointToRemote(leafUuid, n) {
  let project = getProject();
  await project.mirrorInternalEntry({
    type: "last-prompt",
    ...(project.currentSessionLastPrompt && {
      lastPrompt: project.currentSessionLastPrompt,
    }),
    leafUuid,
    explicit: true,
    ...n,
    sessionId: getSessionId(),
  });
}
//@ chunk-e6aww6q8.js:408833-408932 facade-majority
function mirrorCustomTitleToRemote(sessionId, customTitle) {
  return getProject().mirrorInternalEntry({
    type: "custom-title",
    customTitle,
    sessionId,
  });
}
//@ chunk-e6aww6q8.js:408932-408984 facade-majority
function hasRemoteWorkerEventLog() {
  return getProject().hasInternalEventWriter();
}
//@ chunk-e6aww6q8.js:408984-409041 facade-majority
function mirrorWorkerEventToRemote(e, n, r) {
  return getProject().mirrorWorkerEvent(e, n, r);
}
//@ chunk-e6aww6q8.js:409041-409221 facade-majority = recordSidechainTranscript (0.678)
/**
 * 记录子代理（sidechain）消息：isSidechain=true、带 agentId，写入 subagents/agent-<id>.jsonl。
 */
async function recordSidechainTranscript(e, n, r, storageV5) {
  let sessionId = getSessionId();
  let y = isForeignToBinding(pinSessionId(sessionId));
  let S = bridgeSessionForPulledWindow(pinSessionId(sessionId)) ?? null;
  let w = pulledRows();
  let promptId = getPromptId_2();
  let G = cleanMessagesForLogging(e);
  let project = getProject();
  await project.recordInTurn(sessionId, n, () =>
    project.insertMessageChain(G, true, n, r, undefined, sessionId, y, storageV5, S, w, promptId),
  );
}
//@ chunk-e6aww6q8.js:409221-409316 facade-majority = recordContextCollapseSnapshot (0.517)
async function recordForkContextRef(snapshot, storageV5) {
  await getProject().appendEntry(
    {
      type: "fork-context-ref",
      ...snapshot,
    },
    undefined,
    undefined,
    storageV5,
  );
}
//@ chunk-e6aww6q8.js:409316-409387 facade-majority = recordContextCollapseCommit (1)
async function recordArtifactAutoReactLedger(ledgerEntry, n) {
  await getProject().appendEntry(ledgerEntry, ledgerEntry.sessionId, undefined, n);
}
//@ chunk-e6aww6q8.js:409387-409455 facade-majority = recordContextCollapseCommit (1)
function recordCostState(e, n) {
  getProject().appendEntry(e, e.sessionId, undefined, n).catch(logError);
}
//@ chunk-e6aww6q8.js:409455-409464 layout
registerCostStateRecorder(recordCostState);
//@ chunk-e6aww6q8.js:409464-409590 facade-majority
/**
 * 记录任务摘要（observer-ref 相关），供后台会话列表显示。
 */
async function recordObserverRef(sessionId, summary) {
  await getProject().appendEntry(
    {
      type: "observer-ref",
      ...sessionId,
      timestamp: new Date().toISOString(),
    },
    undefined,
    undefined,
    summary,
  );
}
//@ chunk-e6aww6q8.js:409590-409790 facade-majority
async function agentTranscriptExists(e, storageV5) {
  if (isStorageV5Enabled() && storageV5 !== undefined)
    try {
      let r = locateAgentTranscript(e);
      let s = r === undefined ? undefined : transcriptKeyFor(r);
      if (s !== undefined && (await storageV5.stat(s)).ok) return true;
    } catch {}
  if (isDiskless()) return false;
  try {
    await stat(getAgentTranscriptPath(e));
    return true;
  } catch {
    return false;
  }
}
//@ chunk-e6aww6q8.js:409790-409923 layout
function splitJsonlLines(e) {
  let n = [];
  let r = 0;
  while (r < e.length) {
    let index = e.indexOf(
      `
`,
      r,
    );
    let h = index === -1 ? e.length : index + 1;
    n.push({
      data: e.slice(r, h),
    });
    r = h;
  }
  return n;
}
//@ chunk-e6aww6q8.js:409923-410098 layout
function getSessionScopeOfKey(e) {
  if (e.namespace !== "transcript") throw Error("sessionScopeOf: not a transcript key");
  return {
    namespace: "transcript",
    projectKey: e.projectKey,
    sessionId: e.sessionId,
  };
}
//@ chunk-e6aww6q8.js:410098-410185 layout
function getStorageErrorCause(error) {
  let cause = error instanceof Error ? error.cause : undefined;
  return isStoreError(cause) && isStoreFencedError(cause) ? cause : undefined;
}
//@ chunk-e6aww6q8.js:410185-410360 layout
function transcriptAppendFailedError(error) {
  let n = () =>
    Object.assign(
      new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
        `transcript storage append failed (${formatStorageErrorCode(error)})`,
        "transcript storage append failed",
      ),
      {
        cause: error,
      },
    );
  return isStoreFencedError(error) ? n() : withErrnoFromStorageError(error, n, "write");
}
//@ chunk-e6aww6q8.js:410360-410481 layout
function logReStampFailure(e, error) {
  if (isSyscallError(error))
    logForDebugging(
      `${e} (${getErrnoCode(error)}): ${errorMessage(error)}; the synchronous re-stamp runs instead`,
      {
        level: "error",
      },
    );
  else logError(error);
}
//@ chunk-e6aww6q8.js:410481-410576 layout
function entryDedupKey(path, entry) {
  let sessionId = "sessionId" in entry ? entry.sessionId : undefined;
  return `${path}
${entry.type}
${String(sessionId)}`;
}
//@ chunk-e6aww6q8.js:410576-410822 layout
function getAsideStrandedLeftover(error) {
  if (error.code !== "Failed" || error.telemetryCode !== "AsideStranded") return;
  let cause = "cause" in error ? error.cause : undefined;
  if (typeof cause !== "object" || cause === null || "moveError" in cause) return;
  let path = "path" in cause ? cause.path : undefined;
  return {
    leftover: typeof path === "string" ? path : undefined,
  };
}
//@ chunk-e6aww6q8.js:410822-410975 layout
function transcriptMoveFailedError(error) {
  return withErrnoFromStorageError(
    error,
    () =>
      Object.assign(
        new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
          `transcript storage move failed (${formatStorageErrorCode(error)})`,
          "transcript storage move failed",
        ),
        {
          cause: error,
        },
      ),
    "rename",
  );
}
//@ chunk-e6aww6q8.js:410975-411149 layout
function transcriptMkdirFailedError(error) {
  return withErrnoFromStorageError(
    error,
    () =>
      Object.assign(
        new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
          `transcript storage folder creation failed (${formatStorageErrorCode(error)})`,
          "transcript storage folder creation failed",
        ),
        {
          cause: error,
        },
      ),
    "mkdir",
  );
}
//@ chunk-e6aww6q8.js:411149-411246 layout
function formatStorageErrorCode(e) {
  return "telemetryCode" in e && e.telemetryCode ? `${e.code} ${e.telemetryCode}` : e.code;
}
//@ chunk-e6aww6q8.js:411246-411437 layout
function withErrnoFromStorageError(e, n, syscall) {
  let cause = "cause" in e ? e.cause : undefined;
  if (isSyscallError(cause)) return cause;
  let h = n();
  let y = storageErrorToErrno(e, cause);
  if (y === undefined) return h;
  let errno = constants_8.errno;
  return Object.assign(h, {
    code: y,
    errno: -(errno[y] ?? 0),
    syscall,
  });
}
//@ chunk-e6aww6q8.js:411437-411610 layout
function storageErrorToErrno(e, cause) {
  let r = storageErrorCode(e);
  if (isErrnoCode(r)) return r;
  let errnoCode = getErrnoCode(cause);
  if (isErrnoCode(errnoCode)) return errnoCode;
  switch (e.code) {
    case "NotFound":
      return "ENOENT";
    case "Unavailable":
      return "EAGAIN";
    default:
      return;
  }
}
//@ chunk-e6aww6q8.js:411610-411668 layout
function isErrnoCode(e) {
  return e !== undefined && /^E[A-Z0-9]+$/.test(e);
}
//@ chunk-e6aww6q8.js:411668-411873 facade-majority
class RefusedDirectWriteError extends Error {
  writer;
  name = "RefusedDirectWriteError";
  constructor(writer) {
    super(
      "diskless session: refused a direct write of a session file (no storage backend, or no key for the path)",
    );
    this.writer = writer;
  }
}
//@ chunk-e6aww6q8.js:411873-411922 layout
function assertDiskWritable(writer, n) {
  if (isDiskless()) {
    warnDisklessSettingsWrite(writer, n);
    throw new RefusedDirectWriteError(writer);
  }
}
//@ chunk-e6aww6q8.js:411922-411974 layout
function swallowRefusedDirectWrite(error) {
  if (!(error instanceof RefusedDirectWriteError)) throw error;
  logError(error);
}
//@ chunk-e6aww6q8.js:411974-412062 layout
function getHydratedTranscriptTarget(e, n) {
  let r = wrapStorageSource(getStorageTargetForPath(e, n));
  if (r === undefined) assertDiskWritable("hydrated_transcript", e);
  return r;
}
//@ chunk-e6aww6q8.js:412062-413115 layout
/**
 * 把一段 jsonl 文本追加到转录：文件以 O_APPEND 打开（必要时先补换行封闭撕裂的尾行），storage v5 后端时写记录。
 */
async function appendToTranscriptFile(e, n, r, s, h) {
  let y = currentTranscriptStore();
  let S = s !== true && y.project?.tornTailSealPending(e) === true;
  if (S)
    n =
      `
` + n;
  let w = false;
  let L = r !== undefined ? transcriptStorageKeyForPath(e) : undefined;
  if (isStorageV5Enabled() && r !== undefined && L !== undefined) {
    if (s === true) {
      let stats = await r.stat(L);
      if (!stats.ok) {
        if (stats.error.code === "NotFound") return "skipped";
        let error = stats.error;
        throw withErrnoFromStorageError(
          error,
          () =>
            Object.assign(
              new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
                `onlyIfExists stat failed (${formatStorageErrorCode(error)}) \u2014 append withheld`,
                "onlyIfExists stat failed \u2014 append withheld",
              ),
              {
                cause: error,
              },
            ),
          "write",
        );
      }
      if ((stats.value.storedBytes ?? stats.value.size) === 0) return "skipped";
      if ((stats.value.tornTailBytes ?? 0) > 0) {
        n =
          `
` + (h ?? n);
        w = true;
      }
    }
    let G = await r.append(
      L,
      splitJsonlLines(n),
      s === true
        ? {
            precondition: {
              type: "ifExists",
            },
          }
        : undefined,
    );
    if (!G.ok) {
      if (s === true && G.error.code === "NotFound") return "skipped";
      throw transcriptAppendFailedError(G.error);
    }
    if (S) y.project?.tornTailSealLanded(e);
    return w ? "backend-torn" : "backend";
  }
  assertDiskWritable("transcript_lines", e);
  if (s === true) {
    let G = await appendToExistingTranscript(e, n, h);
    return G === false ? "skipped" : G === "torn" ? "direct-torn" : "direct";
  }
  try {
    await appendFile(e, n, {
      mode: 384,
    });
  } catch {
    await mkdir(dirname(e), {
      recursive: true,
      mode: 448,
    });
    await appendFile(e, n, {
      mode: 384,
    });
  }
  if (S) y.project?.tornTailSealLanded(e);
  return "direct";
}
//@ chunk-e6aww6q8.js:413115-413637 layout
async function appendToExistingTranscript(e, n, r) {
  let s;
  try {
    s = await open(e, constants.O_RDWR | constants.O_APPEND | NOFOLLOW_NONBLOCK_FLAGS);
  } catch (error) {
    let errnoCode = getErrnoCode(error);
    if (errnoCode === "ENOENT" || errnoCode === "ENOTDIR") return false;
    throw error;
  }
  try {
    let { size } = await s.stat();
    if (size === 0) return false;
    let y = Buffer.alloc(1);
    let { bytesRead } = await s.read(y, 0, 1, size - 1);
    let w = bytesRead === 1 && y[0] === 10;
    let buffer = Buffer.from(
      w
        ? n
        : `
` + (r ?? n),
      "utf8",
    );
    let G = undefined;
    let q = 0;
    while (q < buffer.length) {
      let { bytesWritten } = await s.write(buffer, q, buffer.length - q, G);
      if (bytesWritten <= 0) throw Error("appendToExistingTranscript: short write");
      q += bytesWritten;
      if (G !== undefined) G += bytesWritten;
    }
    return w ? true : "torn";
  } finally {
    await s.close();
  }
}
//@ chunk-e6aww6q8.js:413637-413653 facade-majority
var OBSERVER_REF_TAIL_SCAN_BYTES = 1048576;
//@ chunk-e6aww6q8.js:413653-413811 layout
async function readTranscriptTailViaStorage(e, n, r) {
  let s = transcriptKeyFor(e);
  if (s === undefined) return;
  let transcriptTailV5 = await readTranscriptTailV5(s, n, r);
  if (transcriptTailV5 === null) return null;
  if (!transcriptTailV5.ok) return;
  return {
    content: transcriptTailV5.content,
    cut: transcriptTailV5.cut,
  };
}
//@ chunk-e6aww6q8.js:413811-414178 facade-majority
function readTranscriptTailV5(e, maxBytes, r) {
  return r
    .read([
      {
        key: e,
        tail: maxBytes,
      },
    ])
    .then((s) => {
      if (!s.ok)
        return isByteViewUnsupportedError(s.error)
          ? readStorageTailByRecords(e, maxBytes, r)
          : {
              ok: false,
              error: s.error,
            };
      let [h] = s.value.items;
      if (!h.found) return null;
      return {
        ok: true,
        content: Buffer.from(h.value.buffer, h.value.byteOffset, h.value.byteLength).toString("utf8"),
        totalBytes: h.totalBytes,
        byteLength: h.value.byteLength,
        cut: h.totalBytes > h.value.byteLength,
      };
    });
}
//@ chunk-e6aww6q8.js:414178-414267 layout
function isStorageTooLargeError(error) {
  return error.code === "Failed" && "telemetryCode" in error && error.telemetryCode === "EFBIG";
}
//@ chunk-e6aww6q8.js:414267-414290 layout
var PAGED_TRANSCRIPT_PAGE_BYTES = 4194304;
var pagedTranscriptPageBytes = WRITE_BUFFER_LIMIT_BYTES;
//@ chunk-e6aww6q8.js:414290-414405 layout
function pagedTranscriptTooLargeError() {
  return Object.assign(Error("loadTranscriptFile: the paged transcript is too large"), {
    code: "EFBIG",
  });
}
//@ chunk-e6aww6q8.js:414405-415433 layout
async function readPagedTranscript(backend, key, pagedTranscriptPageBytes_2) {
  let s;
  try {
    s = await backend.stat(key);
  } catch (error) {
    if (pagedTranscriptPageBytes_2 !== undefined) return;
    throw error;
  }
  if (!s.ok) {
    if (s.error.code === "NotFound") return null;
    if (pagedTranscriptPageBytes_2 !== undefined) return;
    return {
      failure: s.error,
    };
  }
  if (pagedTranscriptPageBytes_2 !== undefined && s.value.size > pagedTranscriptPageBytes_2) return;
  if (s.value.size > pagedTranscriptPageBytes) throw pagedTranscriptTooLargeError();
  let h = Buffer.allocUnsafe(Math.min(s.value.size, pagedTranscriptPageBytes));
  let y = 0;
  let S = 0;
  let w;
  for (;;) {
    let records = await backend.readRecords(key, {
      order: "forward",
      maxBytes: PAGED_TRANSCRIPT_PAGE_BYTES,
      ...(w !== undefined && {
        fromSeq: w,
      }),
    });
    if (!records.ok) {
      if (records.error.code === "NotFound" && w === undefined) return null;
      return {
        failure: records.error,
      };
    }
    for (let item of records.value.items) {
      let Z = y + item.data.byteLength;
      if (Z > pagedTranscriptPageBytes) throw pagedTranscriptTooLargeError();
      if (Z > h.length) {
        let Se = Buffer.allocUnsafe(Math.min(Math.max(Z, h.length * 2), pagedTranscriptPageBytes));
        h.copy(Se, 0, 0, y);
        h = Se;
      }
      h.set(item.data, y);
      y = Z;
      S++;
    }
    let nextSeq = records.value.nextSeq;
    if (nextSeq === undefined) break;
    if (w !== undefined && nextSeq <= w) throw Error("loadTranscriptFile: the record cursor did not advance");
    w = nextSeq;
  }
  logForDebugging(`loadTranscriptFile: read ${S} records (${y} bytes) by page`);
  return {
    bytes: h.subarray(0, y),
    mtimeMs: s.value.mtimeMs,
    storedBytes: Math.max(s.value.size, y),
    tornTailBytes: s.value.tornTailBytes ?? 0,
  };
}
//@ chunk-e6aww6q8.js:415433-415739 layout
async function readStorageTailByRecords(e, maxBytes, r) {
  let records = await r.readRecords(e, {
    order: "backward",
    maxBytes,
  });
  if (!records.ok)
    return records.error.code === "NotFound"
      ? null
      : {
          ok: false,
          error: records.error,
        };
  let buffer = Buffer.concat(records.value.items.map((item) => item.data).reverse());
  return {
    ok: true,
    content: buffer.toString("utf8"),
    totalBytes: undefined,
    byteLength: buffer.byteLength,
    cut: false,
  };
}
//@ chunk-e6aww6q8.js:415739-416177 facade-majority
async function readLastObserverRef(e, storageV5) {
  let r = e ? getAgentTranscriptPath(e) : getTranscriptPath();
  let s =
    !isStorageV5Enabled() || storageV5 === undefined
      ? undefined
      : await readTranscriptTailViaStorage(r, OBSERVER_REF_TAIL_SCAN_BYTES, storageV5).catch(() => {
          return;
        });
  if (s === null || (s === undefined && isDiskless())) return null;
  let h =
    s !== undefined
      ? s
      : await tailFile(r, OBSERVER_REF_TAIL_SCAN_BYTES).catch((error) => {
          if (isFsInaccessible(error)) return null;
          throw error;
        });
  if (h == null) return null;
  let lines = h.content.split(`
`);
  for (let idx = lines.length - 1; idx >= 0; idx--) {
    let w = lines[idx];
    if (!w || !w.includes('"observer-ref"')) continue;
    try {
      let L = jsonParse(w);
      if (L?.type === "observer-ref") return L;
    } catch {}
  }
  return null;
}
//@ chunk-e6aww6q8.js:416177-416200 layout
var FORK_CONTEXT_MAX_DEPTH_2 = 4;
var FORK_CONTEXT_MAX_DEPTH = 16777216;
//@ chunk-e6aww6q8.js:416200-416535 facade-majority
/**
 * 解析 fork-context-ref：加载父会话到 parentLastUuid 为止的前缀消息，带缓存与并发去重。
 */
async function hydrateForkContext(e, n = FORK_CONTEXT_MAX_DEPTH, r) {
  let { forkContextHydrationCache, forkContextHydrationsInFlight } = currentTranscriptStore();
  let y = forkContextHydrationCache.get(e.parentLastUuid);
  if (y) {
    forkContextHydrationCache.delete(e.parentLastUuid);
    forkContextHydrationCache.set(e.parentLastUuid, y);
    return y.slice;
  }
  let S = forkContextHydrationsInFlight.get(e.parentLastUuid);
  if (S) return S;
  let w = loadForkContextPrefix(e, n, r).finally(() =>
    forkContextHydrationsInFlight.delete(e.parentLastUuid),
  );
  forkContextHydrationsInFlight.set(e.parentLastUuid, w);
  return w;
}
//@ chunk-e6aww6q8.js:416535-417329 layout
async function loadForkContextPrefix(e, n, r) {
  let { forkContextHydrationCache } = currentTranscriptStore();
  if (!isSafeIdSegment_2(e.parentSessionId)) {
    logForDebugging(
      "[fork-context-ref] parent session id cannot name a transcript file; returning empty prefix",
      {
        level: "warn",
      },
    );
    return [];
  }
  let transcriptPathForSession = getTranscriptPathForSession(e.parentSessionId);
  let transcriptStorageKey = getTranscriptStorageKey(transcriptPathForSession, r);
  let { messages } = await loadTranscriptFile(
    transcriptPathForSession,
    transcriptStorageKey && {
      storageV5: transcriptStorageKey,
    },
  );
  let w = messages.get(e.parentLastUuid);
  if (!w) {
    logForDebugging(
      `[fork-context-ref] parent uuid ${e.parentLastUuid} not found in ${transcriptPathForSession}; returning empty prefix`,
      {
        level: "warn",
      },
    );
    return [];
  }
  let mapped = buildConversationChain(messages, w)
    .filter((Z) => !Z.isSidechain)
    .map(({ isSidechain, parentUuid, promptId, ...we }) => withoutTaskProducerMark(we));
  let bytes = mapped.reduce((acc, Se) => acc + toJsonLine(Se).length, 0);
  forkContextHydrationCache.delete(e.parentLastUuid);
  forkContextHydrationCache.set(e.parentLastUuid, {
    slice: mapped,
    bytes,
  });
  let q = 0;
  for (let Z of forkContextHydrationCache.values()) q += Z.bytes;
  for (let [Z, Se] of forkContextHydrationCache) {
    if (
      forkContextHydrationCache.size <= 1 ||
      (forkContextHydrationCache.size <= FORK_CONTEXT_MAX_DEPTH_2 && q <= n)
    )
      break;
    q -= Se.bytes;
    forkContextHydrationCache.delete(Z);
  }
  return mapped;
}
//@ chunk-e6aww6q8.js:417329-417390 facade-majority = recordQueueOperation (1)
/**
 * 追加 queue-operation 记录（排队命令的入队/出队），可写入其他会话的文件。
 */
async function recordQueueOperation(e, n) {
  await getProject().insertQueueOperation(e, n);
}
//@ chunk-e6aww6q8.js:417390-417547 facade-majority = removeTranscriptMessage (0.515)
/**
 * 从转录中删除指定 uuid 的消息（排入写队列，执行时重写文件）。
 */
async function removeTranscriptMessage(e, storageV5, sessionId) {
  let s = isStorageV5Enabled() && storageV5 !== undefined ? storageV5 : undefined;
  let h = sessionId ?? getSessionId();
  let project = getProject();
  let { drained } = await project.recordInTurn(h, undefined, () => project.removeMessageByUuid(e, h, s));
  await drained;
}
//@ chunk-e6aww6q8.js:417547-417773 facade-majority
async function removeTranscriptMessageIfPersisted(continuationReplacesUuid, storageV5) {
  let r = isStorageV5Enabled() && storageV5 !== undefined ? storageV5 : undefined;
  let sessionId = getSessionId();
  let project = getProject();
  let { drained } = await project.recordInTurn(sessionId, undefined, async () =>
    (await currentTranscriptStore().sessionMessages(sessionId, r)).has(continuationReplacesUuid)
      ? project.removeMessageByUuid(continuationReplacesUuid, sessionId, r)
      : {
          drained: Promise.resolve(),
        },
  );
  await drained;
}
//@ chunk-e6aww6q8.js:417773-417847 facade-majority = recordFileHistorySnapshot (1)
/**
 * 追加 file-history-snapshot 记录（文件检查点，供 /rewind 回滚文件）。
 */
async function recordFileHistorySnapshot(messageId, n, r, s) {
  await getProject().insertFileHistorySnapshot(messageId, n, r, s);
}
//@ chunk-e6aww6q8.js:417847-418033 facade-majority
async function recordFileHistoryDelta(messageId, snapshotMessageId, trackingPath, backup, h) {
  await getProject().insertFileHistoryDelta(
    {
      type: "file-history-delta",
      messageId,
      snapshotMessageId,
      trackingPath,
      backup,
      timestamp: new Date().toISOString(),
    },
    h,
  );
}
//@ chunk-e6aww6q8.js:418033-418099 facade-majority = recordAttributionSnapshot (1)
/**
 * 追加 attribution-snapshot 记录（提交署名统计快照）。
 */
async function recordAttributionSnapshot(e, n) {
  await getProject().insertAttributionSnapshot(e, n);
}
//@ chunk-e6aww6q8.js:418099-418168 facade-majority = recordContentReplacement (1)
/**
 * 追加 content-replacement 记录（大工具结果替换为引用），有 agentId 时写入子代理转录。
 */
async function recordContentReplacement(contentReplacements, n, storageV5) {
  await getProject().insertContentReplacement(contentReplacements, n, storageV5);
}
//@ chunk-e6aww6q8.js:418168-418333 layout
setMarkerTextWriter({
  canRecord: () => !isTranscriptPersistenceDisabled() && !getProject().isRemotelyMirrored(),
  append: (e) => getProject().appendRequestReplayRecords(e),
  storedToolResultDigest: (e, n) => getProject().queuedToolResultDigest(e, n),
});
//@ chunk-e6aww6q8.js:418333-418378 facade-majority = resetSessionFilePointer (1)
/**
 * 重置会话文件指针（新 sessionId 时下次写入重新创建文件）。
 */
async function resetSessionFilePointer() {
  getProject().resetSessionFile();
}
//@ chunk-e6aww6q8.js:418378-418687 facade-majority = adoptResumedSessionFile (0.214)
/**
 * resume 同一会话时把会话文件指针指向被恢复的转录文件，并重写元数据。
 */
function adoptResumedSessionFile() {
  let project = getProject();
  let transcriptPath = getTranscriptPath();
  project.setSessionFile(transcriptPath);
  let date = new Date();
  let s = worktreeFromProgress(transcriptPath);
  if (s !== undefined) utimes(s, date, date).catch(() => {});
  try {
    project.reAppendSessionMetadata(true, false, false, true);
  } catch (error) {
    let errnoCode = getErrnoCode(error);
    if (isSyscallError(error))
      logForDebugging(`Resume re-append failed (${errnoCode}): ${errorMessage(error)}`, {
        level: "error",
      });
    else logError(error);
    reportTranscriptWriteFailure(
      currentTranscriptStore().writerHealth,
      "adopt",
      error,
      project.sessionFilePath,
    );
  }
}
//@ chunk-e6aww6q8.js:418687-418982 facade-majority
async function adoptResumedSessionFileAsync(storageV5) {
  let project = getProject();
  let transcriptPath = getTranscriptPath();
  project.setSessionFile(transcriptPath);
  project.adoptAppendSource(storageV5);
  touchTranscript(transcriptPath, storageV5);
  if (isTranscriptPersistenceDisabled()) return;
  try {
    await project.reAppendSessionMetadataAsync(true, false, storageV5, true);
  } catch (error) {
    let errnoCode = getErrnoCode(error);
    if (isSyscallError(error))
      logForDebugging(`Resume re-append failed (${errnoCode}): ${errorMessage(error)}`, {
        level: "error",
      });
    else logError(error);
    reportTranscriptWriteFailure(currentTranscriptStore().writerHealth, "adopt", error, transcriptPath);
  }
}
//@ chunk-e6aww6q8.js:418982-419053 facade-majority
function touchSessionTranscript(storageV5) {
  let sessionFilePath = getProject().sessionFilePath;
  if (sessionFilePath === null) return;
  touchTranscript(sessionFilePath, storageV5);
}
//@ chunk-e6aww6q8.js:419053-419235 layout
function touchTranscript(e, n) {
  if (isStorageV5Enabled() && n !== undefined) {
    let h = transcriptKeyFor(e);
    if (h !== undefined) {
      try {
        n.touch(h).catch(() => {});
      } catch {}
      return;
    }
  }
  let r = worktreeFromProgress(e);
  if (r === undefined) return;
  let date = new Date();
  utimes(r, date, date).catch(() => {});
}
//@ chunk-e6aww6q8.js:419235-421372 facade-majority
/**
 * cwd 改变（如进入 worktree）后把当前会话转录从旧项目目录迁到新项目目录，迁移期间新写入先缓存在 relocationBuffer。
 */
async function relocateSessionTranscript(e) {
  if (isDiskless()) throw Error("A diskless session moves no transcript between project folders on disk");
  let n = isStorageV5Enabled() && e !== undefined ? e : undefined;
  let sessionId = getSessionId();
  let projectDir = getProjectDir(getOriginalCwd());
  let project = getProject();
  let sessionFilePath = project.sessionFilePath;
  if (sessionFilePath === null || isTranscriptPersistenceDisabled()) {
    project.currentSessionRelocatedCwd = getOriginalCwd();
    switchSession(sessionId, "cd", projectDir);
    return;
  }
  let S = join(projectDir, `${sessionId}.jsonl`);
  if (sessionFilePath === S) {
    switchSession(sessionId, "cd", projectDir);
    let originalCwd = getOriginalCwd();
    if (project.currentSessionRelocatedCwd !== originalCwd) {
      project.currentSessionRelocatedCwd = originalCwd;
      let L = {
        type: "relocated",
        sessionId,
        relocatedCwd: originalCwd,
      };
      project.beginTranscriptRelocation();
      openRelocationBracket(sessionFilePath);
      try {
        await project.flush();
        await flushAppendEntryQueues();
        if (
          await tryAppendToTranscript(
            sessionFilePath,
            jsonStringify(L) +
              `
`,
            getStorageTargetForPath(sessionFilePath, n),
          )
        )
          project.fireMirror(sessionFilePath, [L]);
      } catch (error) {
        logForDebugging(`relocateSessionTranscript: same-target relocated stamp failed: ${error}`);
      } finally {
        flushParkedAppends(sessionFilePath);
        await project.endTranscriptRelocation();
      }
    }
    return;
  }
  project.beginTranscriptRelocation();
  openRelocationBracket(sessionFilePath);
  try {
    await project.flush();
    await flushAppendEntryQueues();
    await mkdir(projectDir, {
      recursive: true,
      mode: 448,
    });
    let realPathOptions = getRealPathOptions(e);
    let L =
      (await canonicalizePath(dirname(sessionFilePath), realPathOptions)) ===
      (await canonicalizePath(projectDir, realPathOptions));
    if (!L)
      try {
        let [Ie, Me] = await Promise.all([
          stat(dirname(sessionFilePath), {
            bigint: true,
          }),
          stat(projectDir, {
            bigint: true,
          }),
        ]);
        L = Ie.dev === Me.dev && Ie.ino === Me.ino;
      } catch (error) {
        if (!isENOENT(error)) throw error;
      }
    let G;
    if (!L) G = await supersedeTranscriptFile(S);
    let q = n && transcriptStorageKeyForPath(sessionFilePath);
    let Z = n && transcriptStorageKeyForPath(S);
    let Se = n !== undefined && q !== undefined && Z !== undefined;
    let ke = true;
    try {
      await moveTranscript(
        sessionFilePath,
        S,
        n,
        Se
          ? {
              from: q,
              to: Z,
            }
          : undefined,
      );
    } catch (error) {
      if (isENOENT(error)) {
        if (G !== undefined) {
          await rename(G, S).catch((error) => {
            logForDebugging(
              `relocateSessionTranscript: could not restore set-aside destination after ENOENT move: ${error}`,
              {
                level: "warn",
              },
            );
          });
          throw error;
        }
        logForDebugging(`relocateSessionTranscript: old file missing: ${error}`);
        ke = false;
      } else {
        if (G !== undefined)
          await rename(G, S).catch((error) => {
            logForDebugging(
              `relocateSessionTranscript: could not restore set-aside destination after failed move: ${error}`,
              {
                level: "warn",
              },
            );
          });
        throw error;
      }
    }
    let we = join(dirname(sessionFilePath), sessionId);
    let Ee = join(projectDir, sessionId);
    let Ae = true;
    try {
      await moveTranscript(
        we,
        Ee,
        n,
        Se
          ? {
              fromScope: getSessionScopeOfKey(q),
              toScope: getSessionScopeOfKey(Z),
            }
          : undefined,
      );
    } catch (error) {
      Ae = false;
      if (!isENOENT(error)) logError(error);
    }
    project.noteSessionFileMoving(sessionFilePath, S);
    project.setSessionFile(S);
    switchSession(sessionId, "cd", projectDir);
    project.currentSessionRelocatedCwd = getOriginalCwd();
    if (ke)
      try {
        await appendEntryToFileAsync(
          S,
          {
            type: "relocated",
            sessionId,
            relocatedCwd: project.currentSessionRelocatedCwd,
          },
          n,
        );
      } catch (error) {
        logForDebugging(`relocateSessionTranscript: relocated stamp failed: ${error}`);
      }
    if (Ae)
      try {
        let Ie = require("./chunk-xr4q1qwc.js");
        await Ie.repointTaskOutputSymlinks(we, Ee);
      } catch (error) {
        logError(error);
      }
  } finally {
    flushParkedAppends(project.sessionFilePath ?? sessionFilePath);
    await project.endTranscriptRelocation();
  }
}
//@ chunk-e6aww6q8.js:421372-421526 facade-majority
function reportRelocateSessionTranscriptFailure(error, n) {
  if (isSadFsErrno(error) || isEnvFsErrno(error))
    logForDebugging(`${n}: transcript relocation failed (${getErrnoCode(error)}): ${errorMessage(error)}`, {
      level: "error",
    });
  else logError(error);
  reportTranscriptWriteFailure(currentTranscriptStore().writerHealth, "relocate", error);
}
//@ chunk-e6aww6q8.js:421526-421574 facade-majority
function beginTranscriptRelocationForTesting() {
  getProject().beginTranscriptRelocation();
}
//@ chunk-e6aww6q8.js:421574-421632 facade-majority
async function endTranscriptRelocationForTesting() {
  await getProject().endTranscriptRelocation();
}
//@ chunk-e6aww6q8.js:421632-422089 layout
async function supersedeTranscriptFile(e) {
  let n = `${e}.superseded-${Date.now()}`;
  try {
    await rename(e, n);
  } catch (error) {
    if (isENOENT(error)) return;
    throw error;
  }
  let { isRetentionExemptionDisabled } = require("./chunk-xdz4h5jb.js");
  if (!isRetentionExemptionDisabled()) {
    let date = new Date();
    await lutimes(n, date, date).catch((error) => {
      logForDebugging(
        `relocateSessionTranscript: could not refresh the set-aside's mtime at ${n} (it ages from its old clock): ${error}`,
        {
          level: "warn",
        },
      );
    });
  }
  logForDebugging(`relocateSessionTranscript: existing destination set aside at ${n}`, {
    level: "warn",
  });
  return n;
}
//@ chunk-e6aww6q8.js:422089-422775 layout
async function moveStorageScope(e, fromScope, toScope) {
  let s = await e.moveScope(fromScope, toScope);
  if (!s.ok || s.value.published) return s;
  function h() {
    return Object.assign(Error("an occupant blocks the destination scope and could not be set aside"), {
      code: "EEXIST",
    });
  }
  let y =
    toScope.namespace === "transcript" && toScope.sessionId !== undefined
      ? {
          ...toScope,
          sessionId: `${toScope.sessionId}.superseded-${Date.now()}`,
        }
      : undefined;
  if (y === undefined) throw h();
  let S = await e.moveScope(toScope, y);
  if (!S.ok) throw transcriptMoveFailedError(S.error);
  if (!S.value.published) throw h();
  logForDebugging(`renameWithFallbacks: existing destination scope set aside at ${y.sessionId}`, {
    level: "warn",
  });
  let w = await e.moveScope(fromScope, toScope);
  if (w.ok && w.value.published) return w;
  await e.moveScope(y, toScope).catch(() => {
    return;
  });
  if (!w.ok) return w;
  throw h();
}
//@ chunk-e6aww6q8.js:422775-424251 layout
async function moveTranscript(e, n, r, s) {
  if (isStorageV5Enabled() && r !== undefined && s !== undefined) {
    let y = "fromScope" in s ? await moveStorageScope(r, s.fromScope, s.toScope) : await r.move(s.from, s.to);
    if (y.ok) return;
    if (y.error.code === "NotFound" || y.error.code === "ScopeNotFound")
      throw Object.assign(Error("nothing to move at the old home"), {
        code: "ENOENT",
      });
    if (y.error.code === "Failed" && y.error.telemetryCode === "SameEntry") return;
    let S = "fromScope" in s ? getAsideStrandedLeftover(y.error) : undefined;
    if (S !== undefined) {
      logForDebugging(
        `renameWithFallbacks: a scope move stood with its set-aside leftover stranded; left in place at ${S.leftover ?? "(unnamed)"}`,
        {
          level: "warn",
        },
      );
      if (
        (await lstat(e).catch(() => {
          return;
        })) !== undefined
      )
        logForDebugging(`renameWithFallbacks: the session folder may also remain at ${e}; left in place`, {
          level: "warn",
        });
      return;
    }
    throw transcriptMoveFailedError(y.error);
  }
  async function h(y, S) {
    await mkdir(S, {
      recursive: true,
      mode: 448,
    });
    for (let w of await readdir(y, {
      withFileTypes: true,
    }))
      if (w.isDirectory()) await h(join(y, w.name), join(S, w.name));
      else await copyFile(join(y, w.name), join(S, w.name));
  }
  try {
    await rename(e, n);
    return;
  } catch (error) {
    let errnoCode = getErrnoCode(error);
    if (
      errnoCode === "EEXIST" ||
      errnoCode === "EPERM" ||
      errnoCode === "EBUSY" ||
      errnoCode === "ENOTEMPTY"
    ) {
      let w = await supersedeTranscriptFile(n).catch(() => {
        return;
      });
      try {
        await rename(e, n);
      } catch (error) {
        if (w !== undefined) await rename(w, n).catch(() => {});
        throw error;
      }
      return;
    }
    if (errnoCode === "EXDEV") {
      try {
        await copyFile(e, n);
      } catch (error) {
        let errnoCode = getErrnoCode(error);
        if (errnoCode === "EISDIR" || errnoCode === "ENOTSUP" || errnoCode === "EPERM") {
          let G = await supersedeTranscriptFile(n);
          try {
            await h(e, n);
          } catch (error) {
            if (G !== undefined) {
              await rm_2(n, {
                recursive: true,
                force: true,
              }).catch(() => {});
              await rename(G, n).catch(() => {});
            }
            throw error;
          }
        } else throw error;
      }
      await rm_2(e, {
        recursive: true,
        force: true,
      });
      return;
    }
    throw error;
  }
}
//@ chunk-e6aww6q8.js:424251-424290 facade-majority = flushSessionStorage (1)
/**
 * 等待会话存储所有排队写入落盘。
 */
async function flushSessionStorage() {
  await getProject().flush();
}
//@ chunk-e6aww6q8.js:424290-424345 facade-majority
async function inTranscriptCallOrder(e) {
  return await getProject().inCallOrder(e);
}
//@ chunk-e6aww6q8.js:424345-424474 facade-majority
function appendEntryToCurrentTranscriptNow(e, n, tornTailEntry) {
  let project = getProject();
  let h = n ?? project.sessionFilePath;
  if (!h || isTranscriptPersistenceDisabled()) return;
  try {
    project.sealTornTailSync(h);
    appendEntrySync(h, e, tornTailEntry);
  } catch (error) {
    reportStopNowAppendFailure(error, h);
  }
}
//@ chunk-e6aww6q8.js:424474-424626 layout
function reportStopNowAppendFailure(error, n) {
  if (isSyscallError(error))
    logForDebugging(
      `Stop-gesture transcript append failed (${getErrnoCode(error)}): ${errorMessage(error)}`,
      {
        level: "error",
      },
    );
  else logError(error);
  reportTranscriptWriteFailure(currentTranscriptStore().writerHealth, "stop_now", error, n);
}
//@ chunk-e6aww6q8.js:424626-424684 facade-majority
function sealTornTranscriptTail(e) {
  getProject().sealTornTailOnNextAppend(e ?? getTranscriptPathForSession(getSessionId()));
}
//@ chunk-e6aww6q8.js:424684-424789 layout
function isConversationEntry(payload) {
  if (typeof payload !== "object" || payload === null) return false;
  let n = payload.type;
  return n === "user" || n === "assistant";
}
//@ chunk-e6aww6q8.js:424789-424995 layout
async function openRegularFile(e) {
  if (isDiskless()) return null;
  let n = await open(e, constants.O_RDONLY | O_NONBLOCK_2);
  try {
    if ((await n.stat()).isFile()) return n;
  } catch (error) {
    await n.close().catch(() => {});
    throw error;
  }
  await n.close().catch(() => {});
  return null;
}
//@ chunk-e6aww6q8.js:424995-425085 facade-majority
async function transcriptFileHasContentEntry(transcriptPath, backend) {
  if (isStorageV5Enabled() && backend !== undefined)
    return storedTranscriptHasContent(transcriptPath, backend);
  return someLineMatches(transcriptPath, isConversationLine).catch(() => false);
}
//@ chunk-e6aww6q8.js:425085-425476 layout
/**
 * 逐块读取文件并按行调用判断函数，任一行命中即返回 true。
 */
async function someLineMatches(e, n) {
  let s = null;
  try {
    s = await openRegularFile(e);
    if (s === null) throw Error("not a regular file");
    let h = Buffer.allocUnsafe(65536);
    let y = new StringDecoder("utf8");
    let S = "";
    for (;;) {
      let { bytesRead } = await s.read(h, 0, 65536, null);
      if (bytesRead <= 0) break;
      let lines = y.write(h.subarray(0, bytesRead)).split(`
`);
      lines[0] = S + (lines[0] ?? "");
      S = lines.pop() ?? "";
      for (let line of lines) if (n(line)) return true;
    }
    return n(S + y.end());
  } finally {
    if (s)
      try {
        await s.close();
      } catch {}
  }
}
//@ chunk-e6aww6q8.js:425476-425490 layout
var MAX_TRANSCRIPT_HEAD_SCAN_BYTES = 65536;
//@ chunk-e6aww6q8.js:425490-426134 layout
/**
 * 判断转录是否含对话消息：无存储键时查本地文件；无盘模式读存储直到判定；否则先读存储记录前段，未截断时续读本地文件。
 */
async function storedTranscriptHasContent(transcriptPath, backend) {
  let storageKey = transcriptStorageKeyForPath(transcriptPath);
  if (storageKey === undefined) return transcriptFileHasContentEntry(transcriptPath);
  if (isDiskless()) {
    let state = await transcriptMessagesStateV5(
      {
        backend,
        key: storageKey,
      },
      (h) => isConversationLine(h.toString("utf8")),
    );
    if (state === "unknown") {
      logForDebugging(
        "transcriptFileHasContentEntry: could not read the stored transcript to its end; keeping it as if it holds a conversation",
        {
          level: "warn",
        },
      );
      logFeatureSad("transcript_content_probe", "undecided");
    }
    return state !== "none";
  }
  try {
    let records = await backend.readRecords(storageKey, {
      order: "forward",
      maxBytes: MAX_TRANSCRIPT_HEAD_SCAN_BYTES,
    });
    if (records.ok) {
      let textDecoder = new TextDecoder("utf-8", {
        ignoreBOM: true,
      });
      let bytesRead = 0;
      let complete = true;
      for (let item of records.value.items) {
        if (item.truncated === true) {
          complete = false;
          break;
        }
        if (isConversationLine(textDecoder.decode(item.data))) return true;
        bytesRead += item.data.byteLength;
      }
      if (complete) return await readJSONLFile(transcriptPath, bytesRead);
    }
  } catch {}
  return transcriptFileHasContentEntry(transcriptPath);
}
//@ chunk-e6aww6q8.js:426134-426509 layout = readJSONLFile (0.869)
async function readJSONLFile(transcriptPath, bytesRead) {
  let s = null;
  try {
    s = await openRegularFile(transcriptPath);
    if (s === null) return false;
    let buf = Buffer.allocUnsafe(65536);
    let y = new StringDecoder("utf8");
    let S = "";
    let w = bytesRead;
    for (;;) {
      let { bytesRead } = await s.read(buf, 0, 65536, w);
      if (bytesRead <= 0) break;
      w += bytesRead;
      let lines = (S + y.write(buf.subarray(0, bytesRead))).split(`
`);
      S = lines.pop() ?? "";
      for (let line of lines) if (isConversationLine(line)) return true;
    }
    return isConversationLine(S + y.end());
  } catch {
    return false;
  } finally {
    if (s)
      try {
        await s.close();
      } catch {}
  }
}
//@ chunk-e6aww6q8.js:426509-426704 layout
function isConversationLine(e) {
  if (
    !e.includes('"type":"user"') &&
    !e.includes('"type": "user"') &&
    !e.includes('"type":"assistant"') &&
    !e.includes('"type": "assistant"')
  )
    return false;
  try {
    return isConversationEntry(jsonParseRaw(e));
  } catch {
    return false;
  }
}
//@ chunk-e6aww6q8.js:426704-426729 facade-majority
function withoutFetchedCodeModeRecords(e) {
  return e;
}
//@ chunk-e6aww6q8.js:426729-427354 facade-majority = hydrateRemoteSession (0.588)
/**
 * 远程会话（CCR）恢复：从服务器拉取会话条目写回本地转录。
 */
async function hydrateRemoteSession(sessionId, ingressUrl, storageV5) {
  switchSession(identityAgentId(sessionId), "hydrate");
  let project = getProject();
  try {
    let remoteLogs = (await getSessionLogs(sessionId, ingressUrl)) || [];
    let projectDir = resolveProjectDir();
    await ensureTranscriptDir(projectDir, storageV5);
    let projectDir_2 = getTranscriptPathForSession(sessionId);
    if (
      !remoteLogs.some(isConversationEntry) &&
      (await transcriptFileHasContentEntry(projectDir_2, storageV5))
    ) {
      logForDebugging(
        `Skipping remote hydration: server set of ${remoteLogs.length} entries has no content-bearing entries but the local transcript does`,
      );
      logForDiagnosticsNoPII("info", "hydrate_skip_zero_content_replace", {
        path: "v1_session_ingress",
        server_entry_count: remoteLogs.length,
      });
      return true;
    }
    await writeEntriesToJsonlFile(
      projectDir_2,
      withoutFetchedCodeModeRecords(remoteLogs),
      getHydratedTranscriptTarget(projectDir_2, storageV5),
    );
    logForDebugging(`Hydrated ${remoteLogs.length} entries from remote`);
    return remoteLogs.length > 0;
  } catch (error) {
    logForDebugging(`Error hydrating session from remote: ${error}`);
    logForDiagnosticsNoPII("error", "hydrate_remote_session_fail");
    return false;
  } finally {
    project.setRemoteIngressUrl(ingressUrl);
  }
}
//@ chunk-e6aww6q8.js:427354-427728 layout
async function readHydrateTail(e, n, r) {
  let s =
    isStorageV5Enabled() && r !== undefined
      ? await readHydrateTailViaStorage(e, n, r).catch((error) => {
          logForDebugging(
            `hydrate tail: backend tail read threw, using the raw tail: ${errorMessage(error)}`,
            {
              level: "warn",
            },
          );
          return;
        })
      : undefined;
  if (s !== undefined) return s;
  let h = worktreeFromProgress(e);
  if (h === undefined) return null;
  let y = await tailFile(h, n).catch(() => null);
  return (
    y && {
      content: y.content,
      bytesTotal: y.bytesTotal,
      endsOnLineBoundary: y.content.endsWith(`
`),
    }
  );
}
//@ chunk-e6aww6q8.js:427728-428352 layout
async function readHydrateTailViaStorage(e, n, r) {
  let s = transcriptKeyFor(e);
  if (s === undefined) return;
  let [transcriptTailV5, y] = await Promise.all([readTranscriptTailV5(s, n, r), r.stat(s)]);
  if (transcriptTailV5 === null) return null;
  if (!transcriptTailV5.ok) {
    logForDebugging(
      `hydrate tail: backend tail read failed (${transcriptTailV5.error.code}), using the raw tail`,
      {
        level: "warn",
      },
    );
    return;
  }
  if (!y.ok) {
    if (transcriptTailV5.totalBytes === undefined)
      return {
        content: transcriptTailV5.content,
        bytesTotal: transcriptTailV5.byteLength,
        endsOnLineBoundary: transcriptTailV5.content.endsWith(`
`),
      };
    logForDebugging(`hydrate tail: backend stat failed (${y.error.code}), using the raw tail`, {
      level: "warn",
    });
    return;
  }
  let tornTailBytes = y.value.tornTailBytes ?? 0;
  return {
    content: transcriptTailV5.content,
    bytesTotal: (transcriptTailV5.totalBytes ?? y.value.size) + tornTailBytes,
    endsOnLineBoundary:
      tornTailBytes === 0 &&
      transcriptTailV5.content.endsWith(`
`),
  };
}
//@ chunk-e6aww6q8.js:428352-428553 layout
async function ensureTranscriptDir(projectDir, n) {
  if (isStorageV5Enabled() && n !== undefined) {
    let r = transcriptScopeForDir(projectDir);
    if (r !== undefined) {
      let s = await n.ensureScope(r);
      if (!s.ok) throw transcriptMkdirFailedError(s.error);
      return;
    }
  }
  assertDiskWritable("hydrated_transcript", projectDir);
  await mkdir(projectDir, {
    recursive: true,
    mode: 448,
  });
}
//@ chunk-e6aww6q8.js:428553-428653 layout
function getStorageTargetForPath(e, n) {
  if (!isStorageV5Enabled() || n === undefined) return;
  let r = transcriptStorageKeyForPath(e);
  return r === undefined
    ? undefined
    : {
        backend: n,
        key: r,
      };
}
//@ chunk-e6aww6q8.js:428653-428692 facade-majority
function getSessionSidecarDir(e) {
  return join(dirname(getTranscriptPathForSession(e)), e);
}
//@ chunk-e6aww6q8.js:428692-428733 facade-majority
function locateSidecarFile(e, n) {
  return join(getSessionSidecarDir(e), ...n);
}
//@ chunk-e6aww6q8.js:428733-428864 facade-majority
async function ensureSidecarDirFor(e) {
  if (isDiskless()) throw Error("A diskless session writes no side file to disk");
  await mkdir(dirname(e), {
    recursive: true,
    mode: 448,
  });
}
//@ chunk-e6aww6q8.js:428864-428913 layout
function getCcrTipPath(e) {
  return join(getSessionSidecarDir(e), "ccr-tip.json");
}
//@ chunk-e6aww6q8.js:428913-428959 layout
function getLegacyCcrTipPath(e) {
  return getSessionSidecarDir(e) + ".ccr-tip.json";
}
//@ chunk-e6aww6q8.js:428959-429070 facade-majority
async function readCCRTip(e, n) {
  for (let r of [getCcrTipPath(e), getLegacyCcrTipPath(e)]) {
    let remoteAgentMetadata = await readRemoteAgentMetadata(r, n);
    if (remoteAgentMetadata !== "absent") return remoteAgentMetadata;
  }
  return null;
}
//@ chunk-e6aww6q8.js:429070-429529 file-local
async function readRemoteAgentMetadata(e, n) {
  let r = n !== undefined ? pathToSessionSideKey(e) : undefined;
  let s;
  if (isStorageV5Enabled() && n !== undefined && r !== undefined)
    try {
      let text = await n.readText([r]);
      if (!text.ok) return null;
      let y = text.value.items[0];
      if (!y.found) return "absent";
      s = y.value;
    } catch {
      return null;
    }
  else {
    let path = worktreeFromProgress(e);
    if (path === undefined) return "absent";
    try {
      s = await readFile(path, "utf-8");
    } catch (error) {
      return isENOENT(error) ? "absent" : null;
    }
  }
  try {
    let h = jsonParse(s);
    if (typeof h === "object" && h !== null && "eventId" in h && typeof h.eventId === "string") return h;
    return null;
  } catch {
    return null;
  }
}
//@ chunk-e6aww6q8.js:429529-430152 layout
/**
 * 远程水合时查找未解决的 tool_use：收集本会话及来源会话在各项目目录下的 ccr-tip 记录，结合已解决事件找到未完成的工具调用，并定位其所在目录与会话。
 */
async function findUnresolvedToolUseTip(sessionId, folder, events, resolvedIds, h, storage) {
  let sessionIds = new Set([sessionId]);
  for (let { payload } of events) {
    let Ee = normalizeUuidOrNull(payload.sessionId);
    if (Ee !== null) sessionIds.add(Ee);
  }
  let folders = await readdir(getProjectsDir()).catch((error) => {
    if (isPathAbsent(error)) return [];
    throw error;
  });
  let resolvedEventIds = new Set(resolvedIds);
  let tips = [];
  for (let folder of folders)
    for (let sessionId of sessionIds) {
      let tip = await readRemoteAgentMetadata(
        join(getProjectsDir(), folder, sessionId, "ccr-tip.json"),
        storage,
      );
      if (tip !== null && tip !== "absent") {
        resolvedEventIds.add(tip.eventId);
        tips.push({
          eventId: tip.eventId,
          place: {
            folder,
            sessionId,
          },
        });
      }
    }
  let unresolved = findUnresolvedToolUse_2(events, resolvedEventIds, h);
  if (unresolved === undefined) return;
  let Z = events.at(-unresolved.rows - 1);
  let mapped = tips.filter((we) => [Z?.event_id, Z?.payload.uuid].includes(we.eventId)).map((we) => we.place);
  let found = mapped.find((we) => we.folder === folder && we.sessionId === sessionId);
  return {
    ...unresolved,
    tipAt: found ?? mapped[0],
  };
}
//@ chunk-e6aww6q8.js:430152-430517 layout
async function writeCcrTip(e, eventId, r) {
  let s = {
    eventId,
    updatedAt: new Date().toISOString(),
  };
  try {
    let ccrTipPath = getCcrTipPath(e);
    let y = r !== undefined ? pathToSessionSideKey(ccrTipPath) : undefined;
    if (isStorageV5Enabled() && r !== undefined && y !== undefined) {
      let S = await r.write(y, jsonStringify(s), {
        mode: 384,
      });
      if (!S.ok) logForDebugging(`Failed to write CCR tip sidecar: ${formatStorageError(S.error)}`);
      return;
    }
    assertDiskWritable("ccr_tip", ccrTipPath);
    await ensureSidecarDirFor(ccrTipPath);
    await writeFileAtomic_2(ccrTipPath, jsonStringify(s), 384);
  } catch (error) {
    logForDebugging(`Failed to write CCR tip sidecar: ${error}`);
  }
}
//@ chunk-e6aww6q8.js:430517-430678 facade-majority
async function updateCCRTipFromAckedBatch(e, storageV5) {
  for (let idx = e.length - 1; idx >= 0; idx--) {
    let s = e[idx];
    if (!s || s.session_agent_id) continue;
    if (isSyncedTranscriptEntry(s.payload)) {
      await writeCcrTip(getSessionId(), s.payload.uuid, storageV5);
      return;
    }
  }
}
//@ chunk-e6aww6q8.js:430678-430825 facade-majority
function collectTailUuids(content) {
  let n = new Set();
  for (let r of parseJSONL(content)) {
    if (typeof r !== "object" || r === null) continue;
    let uuid = r.uuid;
    if (typeof uuid === "string") n.add(uuid);
  }
  return n;
}
//@ chunk-e6aww6q8.js:430825-431087 facade-majority
async function getValidatedCCRTip(e, n, r) {
  let [ccrTip, h] = await Promise.all([
    readCCRTip(e, r),
    n !== undefined ? n : readTranscriptTailForTip(e, r),
  ]);
  if (!ccrTip)
    return {
      fallbackReason: "no-sidecar",
    };
  if (!h || !collectTailUuids(h.content).has(ccrTip.eventId))
    return {
      fallbackReason: "tip-not-in-tail",
    };
  let y = {
    eventId: ccrTip.eventId,
  };
  rememberValidatedTip(y, ccrTip.updatedAt);
  return y;
}
//@ chunk-e6aww6q8.js:431087-431276 facade-majority
async function readTranscriptTailForTip(e, n) {
  let transcriptPathForSession = getTranscriptPathForSession(e);
  if (isStorageV5Enabled() && n !== undefined) {
    let h = await readTranscriptTailViaStorage(transcriptPathForSession, 65536, n).catch(() => {
      return;
    });
    if (h !== undefined) return h;
  }
  let s = worktreeFromProgress(transcriptPathForSession);
  return s === undefined ? null : tailFile(s, 65536).catch(() => null);
}
//@ chunk-e6aww6q8.js:431276-431328 facade-majority
function extractLastSyncedEventUuid(content) {
  for (let n of iterateUuidsBackward(content)) return n;
  return;
}
//@ chunk-e6aww6q8.js:431328-431477 layout
function* iterateUuidsBackward(e) {
  let lines = e.split(`
`);
  for (let idx = lines.length - 1; idx >= 0; idx--) {
    let s = lines[idx];
    if (!s) continue;
    let h;
    try {
      h = jsonParseRaw(s);
    } catch {
      continue;
    }
    if (isSyncedTranscriptEntry(h)) yield h.uuid;
  }
}
//@ chunk-e6aww6q8.js:431477-431573 facade-majority
function extractLatestIntersectingSyncedUuid(sessionId, n) {
  let r = 0;
  for (let s of iterateUuidsBackward(sessionId)) {
    if (n.has(s))
      return {
        uuid: s,
        walkback: r,
      };
    r++;
  }
  return;
}
//@ chunk-e6aww6q8.js:431573-431922 facade-majority
async function restoreAgentSidecarFromStream(e, n, r) {
  try {
    let s = validateAgentMetadata(n);
    if (s === undefined) {
      logFeatureSad("subagent_sidecar_from_stream", "entry_refused");
      return "refused";
    }
    await writeAgentMetadata(e, s, r, true);
    logFeatureOk("subagent_sidecar_from_stream");
    return "restored";
  } catch (error) {
    logForDebugging(`Sidecar of an agent not written from its stream: ${describeStorageError(error)}`, {
      level: "error",
    });
    logFeatureSad("subagent_sidecar_from_stream", "not_written");
    return "failed";
  }
}
//@ chunk-e6aww6q8.js:431922-433001 facade-majority
async function writeHydratedAgentTranscript(e, n, r, s) {
  let filtered = n.filter((w) => w.type !== "agent_metadata");
  let last = n.findLast((w) => w.type === "agent_metadata");
  if (!isSafeIdSegment(e)) {
    logForDiagnosticsNoPII("warn", "subagent_transcript_write_rejected", {
      reason: "unsafe_id",
      server_entry_count: filtered.length,
    });
    return "skipped";
  }
  if (!filtered.some(isConversationEntry)) {
    logForDiagnosticsNoPII("info", "hydrate_skip_zero_content_replace", {
      path: "v2_subagent",
      server_entry_count: filtered.length,
    });
    return "skipped";
  }
  if (last !== undefined && getProject().keepsAgentMetadataInStream())
    await restoreAgentSidecarFromStream(identityAgentId2(e), last, r);
  let agentTranscriptPath = getAgentTranscriptPath(identityAgentId2(e));
  try {
    let hydratedTranscriptTarget = getHydratedTranscriptTarget(agentTranscriptPath, r);
    await ensureTranscriptDir(dirname(agentTranscriptPath), r);
    if (s?.createOnly) {
      if (hydratedTranscriptTarget) return "exists";
      let L = await writeIfMissing(agentTranscriptPath, jsonlJoin(filtered), 384);
      try {
        await assertPathSafeAsync(agentTranscriptPath);
        await link(L, agentTranscriptPath).catch(async (error) => {
          let errnoCode = getErrnoCode(error);
          if (errnoCode !== "EPERM" && errnoCode !== "ENOSYS" && errnoCode !== "EOPNOTSUPP") throw error;
          await writeNewFile(agentTranscriptPath, jsonlJoin(filtered), 384);
        });
      } catch (error) {
        if (getErrnoCode(error) === "EEXIST") return "exists";
        throw error;
      } finally {
        await unlink(L).catch(() => {});
      }
    } else if (hydratedTranscriptTarget)
      await writeEntriesToJsonlFile(agentTranscriptPath, filtered, hydratedTranscriptTarget);
    else await writeFileAtomic_2(agentTranscriptPath, jsonlJoin(filtered), 384);
    return "written";
  } catch (error) {
    if (isSyscallError(error))
      logForDebugging(`Subagent transcript write failed (${getErrnoCode(error)}): ${errorMessage(error)}`, {
        level: "error",
      });
    else logError(error);
    logForDiagnosticsNoPII("warn", "subagent_transcript_write_rejected", {
      reason: "write_failed",
      server_entry_count: filtered.length,
      errno: sanitizedErrnoLowerForTelemetry(error),
    });
    throw error;
  }
}
//@ chunk-e6aww6q8.js:433001-433058 facade-majority
function canFetchAgentTranscriptsOnDemand() {
  return getProject().hasInternalAgentEventReader();
}
//@ chunk-e6aww6q8.js:433058-433242 facade-majority
class AgentTranscriptFetchError extends Error {
  outcome;
  constructor(outcome = "read_fail", n) {
    super("could not load this agent's earlier transcript; try again", n);
    this.outcome = outcome;
    this.name = "AgentTranscriptFetchError";
  }
}
//@ chunk-e6aww6q8.js:433242-433331 layout
function slimToolResultsIfConfigured(e, n) {
  return currentTranscriptStore().toolResultCopiesOnDisk === "slim" && n === undefined
    ? e.map(createToolResultSlimmer_2())
    : e;
}
//@ chunk-e6aww6q8.js:433331-438546 facade-majority = hydrateFromCCRv2InternalEvents (0.34)
/**
 * 从 CCR v2 内部事件流重建本地转录（主会话与子代理）。
 */
async function hydrateFromCCRv2InternalEvents(sessionId, n, r = false, storage, onDiskBehind, y = false) {
  let startMs = Date.now();
  switchSession(identityAgentId(sessionId), "hydrate");
  let project = getProject();
  let L = y && storage === undefined;
  project.setVerifiesAgentTranscripts(L);
  let reader = project.getInternalEventReader();
  if (!reader) {
    logForDebugging("No internal event reader registered for CCR v2 resume");
    return "no_reader";
  }
  let q;
  let Z = false;
  try {
    let transcriptPathForSession = getTranscriptPathForSession(sessionId);
    let hydrateTail = readHydrateTail(transcriptPathForSession, 65536, storage);
    let we;
    let Ee;
    let Ae;
    let Ie;
    if (n) {
      we = n[0];
      Ee = n[2]?.eventId;
      Ie = validatedTipOf(n[2]);
      Ae = n[2]?.fallbackReason;
    } else {
      let validatedCCRTip = await getValidatedCCRTip(sessionId, await hydrateTail, storage);
      Ee = validatedCCRTip.eventId;
      Ie = validatedTipOf(validatedCCRTip);
      Ae = validatedCCRTip.fallbackReason;
      let startTime = performance.now();
      Z = true;
      we = await reader(Ee);
      Z = false;
      recordPhase("resume_hydrate_fetch_ms", performance.now() - startTime, startTime);
    }
    if (!we) {
      logForDebugging("Failed to read internal events for resume");
      rememberHydrateNote(project, sessionId, {
        outcome: "read_fail",
      });
      logForDiagnosticsNoPII("error", "hydrate_ccr_v2_read_fail");
      return "read_failed";
    }
    let { events, stats } = we;
    let projectDir = resolveProjectDir();
    await ensureTranscriptDir(projectDir, storage);
    let lt = await hydrateTail;
    let bytesTotal = lt?.bytesTotal ?? 0;
    let onDiskLastUuid;
    let pt;
    let Et;
    if (lt) {
      onDiskLastUuid = extractLastSyncedEventUuid(lt.content);
      if (Ee === undefined) {
        let un = new Map();
        for (let idx = 0; idx < events.length; idx++) {
          let uuid = events[idx]?.payload.uuid;
          if (typeof uuid === "string") un.set(uuid, idx);
        }
        pt = extractLatestIntersectingSyncedUuid(lt.content, un);
        Et = pt === undefined ? undefined : un.get(pt.uuid);
      }
    }
    let yt = Et === undefined ? events.length : events.length - 1 - Et;
    markResumeHydrateDelta(
      bytesTotal,
      stats?.bytesReceived ?? null,
      events.length,
      yt,
      Ee !== undefined,
      pt?.walkback,
    );
    let gt = false;
    let At = 0;
    let It = we.anchorFallback !== undefined;
    let Yt =
      Ee !== undefined &&
      !It &&
      events.some((event) =>
        event.event_id !== undefined ? event.event_id === Ee : event.payload.uuid === Ee,
      );
    let qt = Ee !== undefined && lt ? collectTailUuids(lt.content) : null;
    let endsOnLineBoundary =
      Ee !== undefined && lt !== null && qt !== null && qt.has(Ee) && lt.endsOnLineBoundary;
    let rn = events;
    if (Ee && !It && !Yt) {
      if (!endsOnLineBoundary) {
        Ae = "tail-incoherent";
        Z = true;
        let events = await reader();
        Z = false;
        if (!events) {
          logForDebugging("Failed to refetch full read after incoherent local tail");
          rememberHydrateNote(project, sessionId, {
            outcome: "read_fail",
          });
          logForDiagnosticsNoPII("error", "hydrate_ccr_v2_read_fail");
          return "read_failed";
        }
        rn = events.events;
      }
    }
    let pn = await transcriptContextFields();
    let no = false;
    if (Ee && !It && !Yt && endsOnLineBoundary) {
      let un = slimToolResultsIfConfigured(
        events.map((event) => fillMissingTranscriptFields(event.payload, pn)),
        storage,
      );
      let filtered = withoutFetchedCodeModeRecords(un).filter(($o) => {
        let uuid = $o.uuid;
        return typeof uuid !== "string" || !qt.has(uuid);
      });
      if (filtered.length > 0)
        await appendEntriesToJsonlFile(
          transcriptPathForSession,
          filtered,
          getHydratedTranscriptTarget(transcriptPathForSession, storage),
        );
      gt = true;
      At = filtered.length;
      no = true;
      if (currentTranscriptStore().localGcEnabled) {
        let $o = 0;
        for (let yo of filtered) $o += Buffer.byteLength(toJsonLine(yo), "utf8");
        if (bytesTotal + $o > ENTRY_APPEND_POLICY_2)
          getProject().requestCompact(transcriptPathForSession, storage);
      }
      logForDebugging(
        `Hydrated delta: appended ${filtered.length}/${events.length} foreground entries from CCR v2 internal events`,
      );
    } else {
      if (Ee && Ae !== "tail-incoherent")
        Ae =
          we.anchorFallback === "rejected"
            ? "anchor-rejected"
            : we.anchorFallback === "not-found"
              ? "anchor-not-found"
              : "anchor-in-response";
      if (
        !rn.some((ao) => isConversationEntry(ao.payload)) &&
        (await transcriptFileHasContentEntry(transcriptPathForSession, storage))
      ) {
        logForDebugging(
          `Skipping CCR v2 foreground hydration: fetched set of ${rn.length} events has no content-bearing entries but the local transcript does`,
        );
        logForDiagnosticsNoPII("info", "hydrate_skip_zero_content_replace", {
          path: "v2_foreground",
          server_entry_count: rn.length,
        });
      } else {
        let ao = slimToolResultsIfConfigured(
          rn.map(($o) => fillMissingTranscriptFields($o.payload, pn)),
          storage,
        );
        await writeEntriesToJsonlFile(
          transcriptPathForSession,
          withoutFetchedCodeModeRecords(ao),
          getHydratedTranscriptTarget(transcriptPathForSession, storage),
        );
        no = true;
        logForDebugging(`Hydrated ${rn.length} foreground entries from CCR v2 internal events`);
      }
    }
    let events_2 = gt ? events : rn;
    q = events_2.length > 0 ? "rows" : "no_rows";
    let ho = isRemoteManagedEnvironment();
    let projectDir_2 = basename(dirname(transcriptPathForSession));
    let Kn =
      (gt ? At : yt) > 0 && ho
        ? await findUnresolvedToolUseTip(
            sessionId,
            projectDir_2,
            events_2,
            qt ?? (pt === undefined ? [] : [pt.uuid]),
            gt,
            storage,
          ).catch((error) => {
            logError(error);
            return;
          })
        : undefined;
    if (Kn !== undefined && Kn.toolCalls > 0) onDiskBehind?.(Kn);
    if (no)
      for (let idx = events_2.length - 1; idx >= 0; idx--) {
        let ao = events_2[idx];
        if (ao && isSyncedTranscriptEntry(ao.payload)) {
          await writeCcrTip(sessionId, ao.event_id ?? ao.payload.uuid, storage);
          break;
        }
      }
    let subagentEventCount = 0;
    let fo;
    let subagentRead = "none";
    let vn = !(!n || n[1] === undefined)
      ? "eager"
      : project.hasInternalAgentEventReader() && (gt || lt === null || L)
        ? "lazy"
        : r && gt
          ? "skipped_delta"
          : "eager";
    let subagentReader = project.getInternalSubagentEventReader();
    if (subagentReader && vn === "eager") {
      let un = n && n[1] !== undefined ? n[1] : await subagentReader();
      fo = un?.stats;
      subagentRead = n && n[1] !== undefined ? "prefetched" : "inline";
      let ao = un !== null;
      let events = un?.events;
      if (events && events.length > 0) {
        subagentEventCount = events.length;
        let byAgent = new Map();
        for (let event of events) {
          let sessionAgentId = event.session_agent_id || "";
          if (!sessionAgentId) continue;
          let list = byAgent.get(sessionAgentId);
          if (!list) {
            list = [];
            byAgent.set(sessionAgentId, list);
          }
          list.push(fillMissingTranscriptFields(event.payload, pn));
        }
        for (let [Ho, rr] of byAgent)
          await writeHydratedAgentTranscript(Ho, rr, storage).catch(() => {
            ao = false;
          });
        logForDebugging(`Hydrated ${events.length} subagent entries across ${byAgent.size} agents`);
      }
      if (ao) project.setInternalAgentEventReader(null);
    }
    let timestamp = Date.parse(Ie ?? "");
    let ko = Number.isFinite(timestamp) ? Math.round((startMs - timestamp) / 1000) : undefined;
    rememberHydrateNote(project, sessionId, {
      outcome: "ok",
      deltaApplied: gt,
      deltaEvents: yt,
      deltaAppended: At,
      fallbackReason: Ae,
      wroteFile: no,
      onDiskBytes: bytesTotal,
      tipAgeSeconds: ko,
    });
    logForDiagnosticsNoPII("info", "hydrate_ccr_v2_completed", {
      duration_ms: Date.now() - startMs,
      event_count: events_2.length,
      subagent_event_count: subagentEventCount,
      page_count: stats?.pageCount,
      bytes_received: stats?.bytesReceived,
      content_encoding: stats?.contentEncoding,
      subagent_page_count: fo?.pageCount,
      subagent_read: subagentRead,
      subagent_bytes_received: fo?.bytesReceived,
      prefetched: n?.[0] != null,
      on_disk_bytes: bytesTotal,
      project_folder_hash: ho ? shortHash(projectDir_2) : undefined,
      local_session_id_hash: ho ? shortHash(sessionId) : undefined,
      behind_tip_folder_hash: Kn?.tipAt && shortHash(Kn.tipAt.folder),
      behind_tip_session_id_hash: Kn?.tipAt && shortHash(Kn.tipAt.sessionId),
      delta_events: yt,
      delta_fetch_attempted: Ee !== undefined,
      delta_fetch_applied: gt,
      delta_appended: At,
      behind_rows: Kn?.rows,
      behind_tool_calls: Kn?.toolCalls,
      tip_age_s: ko,
      subagent_skipped_local_reuse: vn === "skipped_delta",
      subagent_hydrate: vn,
      ...(Ae && {
        delta_fallback_reason: Ae,
      }),
      delta_anchor: pt !== undefined && pt.walkback > 0 ? "intersected" : "synced",
      on_disk_last_uuid: onDiskLastUuid,
      anchor_uuid: pt?.uuid,
      anchor_walkback: pt?.walkback,
      ccr_last_uuid: events_2.at(-1)?.payload.uuid,
    });
    return q;
  } catch (error) {
    if (error instanceof Error && error.message === "CCRClient: Epoch mismatch (409)") throw error;
    logForDebugging(`Error hydrating session from CCR v2: ${error}`);
    rememberHydrateNote(project, sessionId, {
      outcome: "threw",
    });
    logForDiagnosticsNoPII("error", "hydrate_ccr_v2_fail", {
      settled: q !== undefined,
      errno: sanitizedErrnoLowerForTelemetry(error),
    });
    return q ?? (Z ? "read_failed" : "apply_failed");
  }
}
//@ chunk-e6aww6q8.js:438546-438675 layout
function getFirstPromptInfo(transcript) {
  let firstPromptPreview = getFirstPromptPreview(transcript, "stored");
  let r =
    firstPromptPreview === extractFirstPrompt
      ? firstPromptPreview
      : getFirstPromptPreview(transcript, "shown");
  return r === firstPromptPreview
    ? {
        firstPrompt: firstPromptPreview,
      }
    : {
        firstPrompt: firstPromptPreview,
        firstPromptShown: r,
      };
}
//@ chunk-e6aww6q8.js:438675-438695 fingerprint = extractFirstPrompt (1)
var extractFirstPrompt = "No prompt";
//@ chunk-e6aww6q8.js:438695-438833 layout
function getFirstPromptPreview(transcript, n) {
  let textContent = getFirstMeaningfulUserMessageTextContent(transcript, n);
  if (textContent) {
    let result = textContent
      .replaceAll(
        `
`,
        " ",
      )
      .trim();
    if (result.length > 200) result = truncateToLength(result, 200).trim() + "\u2026";
    return result;
  }
  return extractFirstPrompt;
}
//@ chunk-e6aww6q8.js:438833-439536 facade-majority = getFirstMeaningfulUserMessageTextContent (0.673)
/**
 * 取第一条有意义的用户文本（跳过 meta、压缩摘要、命令输出），用于会话列表首条提示。
 */
function getFirstMeaningfulUserMessageTextContent(transcript, n = "stored") {
  for (let msg of transcript) {
    if (msg.type !== "user" || msg.isMeta) continue;
    if ("isCompactSummary" in msg && msg.isCompactSummary) continue;
    let content = msg.message?.content;
    if (!content) continue;
    let h =
      n === "shown" && typeof content === "string"
        ? renderPluginPromptColon(content, msg.pluginPrompt)
        : content;
    let y = h !== content;
    let texts = [];
    if (typeof h === "string") texts.push(h);
    else if (Array.isArray(content)) {
      for (let block of content) if (block.type === "text" && block.text) texts.push(block.text);
    }
    for (let textContent of texts) {
      if (!textContent) continue;
      let textContent_2 = flattenPastedBlocks(textContent);
      let commandNameTag = y ? null : extractTag(textContent_2, COMMAND_NAME);
      if (commandNameTag) {
        let commandName = commandNameTag.replace(/^\//, "");
        if (require("./chunk-mvgsex7x.js").builtInCommandNames().has(commandName)) continue;
        else {
          let commandArgs = extractTag(textContent_2, "command-args")?.trim();
          if (!commandArgs) continue;
          return `${commandNameTag} ${commandArgs}`;
        }
      }
      let bashInput = y ? null : extractTag(textContent_2, "bash-input");
      if (bashInput) return `! ${bashInput}`;
      if (SYNTHETIC_USER_TEXT_PATTERN.test(textContent_2)) continue;
      return textContent_2;
    }
  }
  return;
}
//@ chunk-e6aww6q8.js:439536-439637 facade-majority = removeExtraFields (0.786)
function removeExtraFields(transcript) {
  return transcript.map((m) => {
    let { isSidechain, parentUuid, promptId, ...serializedMessage } = m;
    return withoutTaskProducerMark(serializedMessage);
  });
}
//@ chunk-e6aww6q8.js:439637-440004 facade-majority
function withoutTaskProducerMark(e) {
  if (e.type === "attachment" && e.attachment?.type === "queued_command") {
    let s = stripTaskProducer(e.attachment.origin);
    return s === e.attachment.origin
      ? e
      : {
          ...e,
          attachment: {
            ...e.attachment,
            origin: s,
            [restoredTaskMarkSymbol]: true,
          },
        };
  }
  if (e.type !== "user") return e;
  let n = stripTaskProducer(e.origin);
  let r = stripTaskProducer(e.queueOrigin);
  return n === e.origin && r === e.queueOrigin
    ? e
    : {
        ...e,
        origin: n,
        queueOrigin: r,
        ...(n !== e.origin && {
          [restoredTaskMarkSymbol]: true,
        }),
      };
}
//@ chunk-e6aww6q8.js:440004-440256 facade-majority = buildTranscriptEntries (0.777)
/**
 * 对带内部标记（B6e）的 user 消息或 queued_command 附件，复制一份并把 task-notification 类 origin 的 producer 改成 "session-task"；其他消息原样返回。
 */
function withTaskProducerMarkRecorded(message) {
  if (
    message.type === "attachment" &&
    message.attachment.type === "queued_command" &&
    message.attachment[restoredTaskMarkSymbol] === true
  )
    return {
      ...message,
      attachment: {
        ...message.attachment,
        origin: markSessionTaskProducer(message.attachment.origin),
      },
    };
  if (message.type === "user" && message[restoredTaskMarkSymbol] === true)
    return {
      ...message,
      origin: markSessionTaskProducer(message.origin),
    };
  return message;
}
//@ chunk-e6aww6q8.js:440256-440342 layout
function markSessionTaskProducer(origin) {
  return origin?.kind === "task-notification"
    ? {
        ...origin,
        producer: "session-task",
      }
    : origin;
}
//@ chunk-e6aww6q8.js:440342-440453 layout
function stripTaskProducer(e) {
  if (e?.kind !== "task-notification" || e.producer === undefined) return e;
  let { producer, ...r } = e;
  return r;
}
//@ chunk-e6aww6q8.js:440453-441757 layout
/**
 * 加载转录时应用压缩保留段：最后一个压缩边界带保留信息时，重新链接保留消息到锚点后、清零其用量，删除边界前其他消息并把孤立子节点接到保留段末尾，返回末条保留消息 uuid。
 */
function applyPreservedSegmentOnLoad(messages) {
  let preservedMeta;
  let preservedIndex = -1;
  let lastBoundaryIndex = -1;
  let indexByUuid = new Map();
  let position = 0;
  for (let Se of messages.values()) {
    indexByUuid.set(Se.uuid, position);
    if (isCompactBoundaryMessage_3(Se)) {
      lastBoundaryIndex = position;
      let compactMetadata = Se.compactMetadata;
      if (compactMetadata?.preservedMessages || compactMetadata?.preservedSegment) {
        preservedMeta = compactMetadata;
        preservedIndex = position;
      }
    }
    position++;
  }
  if (!preservedMeta) return;
  let isLastBoundary = preservedIndex === lastBoundaryIndex;
  let relink = isLastBoundary ? applyPreservedSegmentRelinks(preservedMeta, messages) : undefined;
  if (isLastBoundary && !relink) return;
  let preserved = relink && relink.preserved.uuids.length > 0 ? relink.preserved : undefined;
  if (preserved?.uuids.some((uuid) => !messages.has(uuid))) {
    logEvent("tengu_relink_walk_broken", {
      source: fromEnumOpt(relink?.source),
      listed: preserved.uuids.length,
      present: count(preserved.uuids, (Se) => messages.has(Se)),
      anchorInTranscript: messages.has(preserved.anchorUuid),
      transcriptSize: messages.size,
    });
    return;
  }
  let preservedUuids = preserved?.uuids ?? [];
  let preservedSet = new Set(preservedUuids);
  if (preserved) {
    let parentUuid = preservedUuids.at(-1);
    let parentUuid_2 = preserved.anchorUuid;
    for (let preservedUuid of preservedUuids) {
      let Ee = messages.get(preservedUuid);
      messages.set(preservedUuid, {
        ...Ee,
        parentUuid: parentUuid_2,
      });
      parentUuid_2 = preservedUuid;
    }
    for (let [we, Ee] of messages)
      if (Ee.parentUuid === preserved.anchorUuid && we !== preservedUuids[0])
        messages.set(we, {
          ...Ee,
          parentUuid,
        });
    for (let preservedUuid of preservedUuids) {
      let Ee = messages.get(preservedUuid);
      if (Ee?.type !== "assistant") continue;
      messages.set(preservedUuid, {
        ...Ee,
        message: {
          ...Ee.message,
          usage: {
            ...Ee.message.usage,
            input_tokens: 0,
            output_tokens: 0,
            cache_creation_input_tokens: 0,
            cache_read_input_tokens: 0,
          },
        },
      });
    }
  }
  let removed = [];
  for (let [Se] of messages) {
    let ke = indexByUuid.get(Se);
    if (ke !== undefined && ke < lastBoundaryIndex && !preservedSet.has(Se)) removed.push(Se);
  }
  for (let Se of removed) messages.delete(Se);
  if (preserved && removed.length > 0) {
    let parentUuid = preservedUuids.at(-1);
    let ke = new Set(removed);
    for (let [we, Ee] of messages)
      if ((Ee.type === "user" || Ee.type === "assistant") && Ee.parentUuid !== null && ke.has(Ee.parentUuid))
        messages.set(we, {
          ...Ee,
          parentUuid,
        });
  }
  return preservedUuids.at(-1);
}
//@ chunk-e6aww6q8.js:441757-442329 fingerprint = applyPreservedSegmentRelinks (0.702)
function applyPreservedSegmentRelinks(preservedMeta, n) {
  if (preservedMeta.preservedMessages)
    return {
      preserved: preservedMeta.preservedMessages,
      source: "list",
    };
  let preservedSegment = preservedMeta.preservedSegment;
  if (!preservedSegment) return;
  let entryIndex = new Set();
  let toDelete = [];
  let idx = n.get(preservedSegment.tailUuid);
  while (idx && !entryIndex.has(idx.uuid)) {
    entryIndex.add(idx.uuid);
    toDelete.push(idx.uuid);
    if (idx.uuid === preservedSegment.headUuid) {
      toDelete.reverse();
      return {
        preserved: {
          anchorUuid: preservedSegment.anchorUuid,
          uuids: toDelete,
        },
        source: "walk",
      };
    }
    idx = idx.parentUuid ? n.get(idx.parentUuid) : undefined;
  }
  logEvent("tengu_relink_walk_broken", {
    source: lit_2("walk"),
    tailInTranscript: n.has(preservedSegment.tailUuid),
    headInTranscript: n.has(preservedSegment.headUuid),
    anchorInTranscript: n.has(preservedSegment.anchorUuid),
    walkSteps: entryIndex.size,
    transcriptSize: n.size,
  });
  return;
}
//@ chunk-e6aww6q8.js:442329-442447 callgraph-witnessed = findLatestMessage (1)
function findLatestMessage(messages, predicate) {
  let latest;
  let maxTime = -1 / 0;
  for (let m of messages) {
    if (!predicate(m)) continue;
    let t = Date.parse(m.timestamp);
    if (t > maxTime) {
      maxTime = t;
      latest = m;
    }
  }
  return latest;
}
//@ chunk-e6aww6q8.js:442447-442965 facade-majority = buildConversationChain (0.785)
/**
 * 从叶子消息沿 parentUuid 回溯到根，反转得到对话链；检测环（tengu_chain_parent_cycle），断链时按时间戳回退，最后补回孤立的并行工具结果。
 */
function buildConversationChain(messages, leafMessage, r) {
  let transcript = [];
  let seen = new Set();
  let y = {
    entriesBySide: undefined,
    timedSides: new Map(),
  };
  let currentMsg = leafMessage;
  while (currentMsg) {
    if (seen.has(currentMsg.uuid)) {
      logError(
        Error(
          `Cycle detected in parentUuid chain at message ${currentMsg.uuid}. Returning partial transcript.`,
        ),
      );
      logEvent("tengu_chain_parent_cycle", {});
      break;
    }
    seen.add(currentMsg.uuid);
    transcript.push(currentMsg);
    let parentUuid = currentMsg.parentUuid;
    if (!parentUuid) break;
    let G = messages.get(parentUuid);
    if (!G || seen.has(G.uuid)) {
      G = readSessionStartDate(y, messages, currentMsg, seen);
      if (G) logEvent("tengu_chain_timestamp_fallback", {});
    }
    currentMsg = G;
  }
  transcript.reverse();
  if (isFoamySpringEnabled()) for (let L of conversationChainOf(messages) ?? []) seen.add(L);
  let w = recoverOrphanedParallelToolResults(messages, transcript, seen);
  attachSideMessages(leafMessage, w, seen, r ?? groupNonChainChildrenByParent(messages));
  announceFirstTurnOnce(messages, w, seen);
  return w;
}
//@ chunk-e6aww6q8.js:442965-443830 facade-majority
function warnIfTranscriptUnchained(messages, transcript, sessionId) {
  let s = 0;
  for (let w of messages.values()) {
    if (w.type !== "user" && w.type !== "assistant") continue;
    if (w.parentUuid) return;
    s++;
  }
  if (s <= 1) return;
  let h = sessionId && normalizeUuidOrNull(sessionId) !== null ? sessionId : undefined;
  if (h) {
    let { warnedUnchainedSessions } = currentTranscriptStore();
    if (warnedUnchainedSessions.has(h)) return;
    warnedUnchainedSessions.add(h);
  }
  let y = count(transcript, (w) => w.type === "user" || w.type === "assistant");
  let S = `Resume transcript${h ? ` (session ${h})` : ""} has ${s} user/assistant records but none carry parentUuid links; only ${y} reached the resumed conversation. Conversation reconstruction walks parentUuid from the last record, so unlinked records are dropped \u2014 the file's producer must chain records (parentUuid null on the first, the previous record's uuid on each subsequent one).`;
  logEvent("tengu_resume_unchained_transcript", {
    conversational_records: s,
    survived: y,
  });
  logForDebugging(S, {
    level: "error",
  });
  if (hasEmbeddedSearchTools_2() || env.CLAUDE_CODE_ENTRYPOINT === "bench")
    process.stderr.write(`Warning: ${S}
`);
}
//@ chunk-e6aww6q8.js:443830-443948 layout
function getFileSnapshotMessages(messages) {
  let n = [];
  for (let r of messages.values()) if (r.type === "system" && r.subtype === "file_snapshot") n.push(r);
  return n;
}
//@ chunk-e6aww6q8.js:443948-444137 layout
function groupNonChainChildrenByParent(e) {
  let n = new Map();
  for (let r of e.values())
    if (r.parentUuid && r.type !== "user" && r.type !== "assistant") {
      let s = n.get(r.parentUuid);
      if (s) s.push(r);
      else n.set(r.parentUuid, [r]);
    }
  return n;
}
//@ chunk-e6aww6q8.js:444137-444704 layout
function attachSideMessages(leafMessage, n, seen, s) {
  if (isSideMessagesEnabled()) {
    let S = (L, G) => (L.timestamp < G.timestamp ? -1 : L.timestamp > G.timestamp ? 1 : 0);
    let w = [leafMessage];
    while (w.length > 0) {
      let L = w.pop();
      if (L !== leafMessage) {
        if (seen.has(L.uuid)) continue;
        seen.add(L.uuid);
        n.push(L);
      }
      let G = s.get(L.uuid) ?? [];
      let q = G.length > 1 ? [...G].sort(S) : G;
      for (let idx = q.length - 1; idx >= 0; idx--) if (!seen.has(q[idx].uuid)) w.push(q[idx]);
    }
    return;
  }
  let h = [];
  let y = [leafMessage.uuid];
  while (y.length > 0) {
    let S = y.shift();
    for (let w of s.get(S) ?? []) {
      if (seen.has(w.uuid)) continue;
      seen.add(w.uuid);
      h.push(w);
      y.push(w.uuid);
    }
  }
  if (h.length > 1) h.sort((S, w) => (S.timestamp < w.timestamp ? -1 : S.timestamp > w.timestamp ? 1 : 0));
  n.push(...h);
}
//@ chunk-e6aww6q8.js:444704-444757 layout
var TENGU_CCR_STORED_GAP_BRIDGE_ENABLED = "tengu_ccr_stored_gap_bridge_enabled";
var CCR_STORED_GAP_BRIDGE_FLAG = 16;
//@ chunk-e6aww6q8.js:444757-445149 callgraph-fingerprint = applySnipRemovals (0.189)
function applySnipRemovals(messages, n) {
  if (
    !isRemoteEnvironmentAny() ||
    !isFoamySpringEnabled() ||
    !readGateTrueByDefault(TENGU_CCR_STORED_GAP_BRIDGE_ENABLED)
  )
    return;
  let toDelete = new Set();
  let s = 0;
  let newestGapMs = 0;
  let y = n ? messages.get(n) : undefined;
  while (y?.parentUuid && !toDelete.has(y.uuid)) {
    toDelete.add(y.uuid);
    let entry = messages.get(y.parentUuid);
    if (!entry && s < CCR_STORED_GAP_BRIDGE_FLAG) {
      entry = removeExtraFields_2(messages, y, toDelete);
      if (entry) {
        messages.set(y.uuid, {
          ...y,
          parentUuid: entry.uuid,
        });
        newestGapMs ||= Date.parse(y.timestamp) - Date.parse(entry.timestamp);
        s++;
      }
    }
    y = entry;
  }
  if (s > 0)
    logEvent("tengu_ccr_stored_gap_bridged", {
      bridges: s,
      newest_gap_ms: newestGapMs,
      message_count: messages.size,
    });
}
//@ chunk-e6aww6q8.js:445149-445455 fingerprint = removeExtraFields (0.847)
function removeExtraFields_2(e, n, toDelete) {
  let s = [];
  for (let S of e.values()) {
    if (S.uuid === n.uuid) break;
    if (!S.isSidechain && S.timestamp <= n.timestamp) s.push(S);
  }
  let h = new Set(s.map((S) => S.parentUuid));
  let y;
  for (let S of s)
    if (
      !toDelete.has(S.uuid) &&
      !h.has(S.uuid) &&
      !(S.type === "system" && !S.parentUuid) &&
      (!y || S.timestamp >= y.timestamp)
    )
      y = S;
  return y;
}
//@ chunk-e6aww6q8.js:445455-445534 placement = countToolCallsSince (1)
function countToolCallsSince_5(e) {
  return e.type === "assistant" && contentHasBlockType(e.message?.content, "tool_use");
}
//@ chunk-e6aww6q8.js:445534-445621 placement = countToolCallsSince (1)
function hasToolUseBlock(e) {
  return e.type === "assistant" ? collectBlockFieldsByType(e.message?.content, "tool_use", "id") : [];
}
//@ chunk-e6aww6q8.js:445862-446111 placement
function countVisibleMessages_2(e, n) {
  switch (e.type) {
    case "assistant":
      return n !== null && e.message?.id === n;
    case "user":
      return e.isMeta === true || contentHasBlockType(e.message?.content, "tool_result");
    case "attachment":
      return true;
    case "system":
      return e.subtype !== "compact_boundary";
    default:
      return false;
  }
}
//@ chunk-e6aww6q8.js:446111-446162 layout
function isAssistantTranscriptEntry(e) {
  return isTranscriptMessage(e) && e.type === "assistant";
}
//@ chunk-e6aww6q8.js:446162-446211 layout
function isChainLinkCandidate(entry, n) {
  return isLegacyProgressEntry(entry) || (isTranscriptMessage(entry) && countVisibleMessages_2(entry, n));
}
//@ chunk-e6aww6q8.js:446211-446265 layout
function getAssistantMessageId(e, n) {
  return isAssistantTranscriptEntry(e) ? (e.message?.id ?? null) : n;
}
//@ chunk-e6aww6q8.js:446265-446309 layout
function isProgressOrHiddenEntry(entry) {
  return isLegacyProgressEntry(entry) || (isTranscriptMessage(entry) && isAuxiliaryEntry(entry));
}
//@ chunk-e6aww6q8.js:446309-446394 layout
function hasMalformedMessage(e) {
  return (
    isTranscriptMessage(e) && (e.type === "user" || e.type === "assistant") && !isPlainObject_5(e.message)
  );
}
//@ chunk-e6aww6q8.js:446394-450439 fingerprint = recoverOrphanedParallelToolResults (0.451)
/**
 * 并行工具调用时多个 tool_result 只有一个在主链上，把同一 assistant 消息的其余 tool_result 找回插入链中。
 */
function recoverOrphanedParallelToolResults(messages, chain, seen) {
  let chainAssistants = chain.filter((It) => It.type === "assistant");
  if (chainAssistants.length === 0) return chain;
  let h = isFoamySpringEnabled();
  let anchorByMsgId = new Map();
  let S = new Map();
  let w = [];
  for (let It of messages.values())
    if (It.type === "assistant" && It.message.id) {
      let Yt = anchorByMsgId.get(It.message.id);
      if (Yt) Yt.push(It);
      else anchorByMsgId.set(It.message.id, [It]);
    } else if (It.type === "user" && contentHasBlockType(It.message?.content, "tool_result")) w.push(It);
  let L = new Set();
  let G = (It, Yt) => {
    if (
      L.has(
        It +
          `
` +
          Yt.uuid,
      )
    )
      return;
    L.add(
      It +
        `
` +
        Yt.uuid,
    );
    let qt = S.get(It);
    if (qt) qt.push(Yt);
    else S.set(It, [Yt]);
  };
  let q = (It, Yt) => (It.isSidechain ?? false) === (Yt.isSidechain ?? false) && It.agentId === Yt.agentId;
  let Z = [];
  for (let It of w) {
    if (It.parentUuid) G(It.parentUuid, It);
    if (!h) continue;
    let Yt = It.parentUuid ? messages.get(It.parentUuid) : undefined;
    let qt = new Set(Yt ? hasToolUseBlock(Yt) : []);
    let toolResultIds = getToolResultIds(It);
    if (toolResultIds.length > 0 && toolResultIds.every((toolResultId) => qt.has(toolResultId))) continue;
    Z.push(It);
  }
  let siblingsByMsgId = new Map();
  if (Z.length > 0)
    for (let It of anchorByMsgId.values())
      for (let Yt of It) {
        if (Yt.type !== "assistant") continue;
        for (let qt of hasToolUseBlock(Yt)) {
          let group = siblingsByMsgId.get(qt);
          siblingsByMsgId.set(qt, group === undefined || group?.message.id === Yt.message.id ? Yt : null);
        }
      }
  for (let It of Z) {
    let sourceToolAssistantUUID = "sourceToolAssistantUUID" in It ? It.sourceToolAssistantUUID : undefined;
    let qt =
      typeof sourceToolAssistantUUID === "string" && sourceToolAssistantUUID !== It.parentUuid
        ? messages.get(sourceToolAssistantUUID)
        : undefined;
    if (qt && q(It, qt)) G(qt.uuid, It);
    for (let Zt of getToolResultIds(It)) {
      let group = siblingsByMsgId.get(Zt);
      if (group && group.uuid !== It.parentUuid && q(It, group)) G(group.uuid, It);
    }
  }
  let ke;
  let we = () => {
    if (ke === undefined) {
      ke = new Set();
      for (let It of chain) for (let Yt of getToolResultIds(It)) ke.add(Yt);
    }
    return ke;
  };
  let processedGroups = new Map();
  for (let idx = 0; idx < chain.length; idx++) processedGroups.set(chain[idx].uuid, idx);
  let inserts = new Set();
  let Ie = [];
  let recoveredCount = 0;
  let recoveredTailCount = 0;
  let ze = 0;
  let lt;
  let Je;
  let nt = new Map();
  let pt = (It) => nt.get(It.uuid) ?? indexOrMax(Je, It);
  let Et = (It, Yt) => pt(It) - pt(Yt) || indexOrMax(Je, It) - indexOrMax(Je, Yt);
  for (let asst of chainAssistants) {
    let msgId = asst.message.id;
    if (!msgId || inserts.has(msgId)) continue;
    inserts.add(msgId);
    let group = anchorByMsgId.get(msgId) ?? [asst];
    let Zt = (fo) => !!fo && group.some((To) => To.uuid === fo);
    let orphanedSiblings = group.filter((fo) => !seen.has(fo.uuid));
    let pn = [];
    let no = [];
    let hn = new Set();
    for (let member of group)
      for (let To of S.get(member.uuid) ?? []) {
        if (seen.has(To.uuid) || hn.has(To.uuid)) continue;
        hn.add(To.uuid);
        if (Zt(To.parentUuid)) pn.push(To);
        else no.push(To);
      }
    if (no.length > 0) {
      Je ??= mapKeysToIndex(messages);
      let fo = new Set(we());
      for (let bo of pn) for (let vn of getToolResultIds(bo)) fo.add(vn);
      no.sort(Et);
      let max = Math.max(...group.map((bo) => indexOrMax(Je, bo)));
      for (let bo of no) {
        let toolResultIds = getToolResultIds(bo);
        if (
          !toolResultIds.some((toolResultId) => {
            let trs = siblingsByMsgId.get(toolResultId);
            return !fo.has(toolResultId) && !!trs && Zt(trs.uuid);
          })
        )
          continue;
        for (let tr of toolResultIds) fo.add(tr);
        nt.set(bo.uuid, Math.max(indexOrMax(Je, bo), max + 0.5));
        rememberMovedRow(bo.uuid);
        pn.push(bo);
        ze++;
      }
    }
    let ho = [...orphanedSiblings, ...pn];
    for (let fo of ho) seen.add(fo.uuid);
    let yn = processedGroups.get(asst.uuid);
    let Kn = yn + 1;
    for (let fo of group) {
      let To = processedGroups.get(fo.uuid);
      if (To !== undefined && To >= Kn) Kn = To + 1;
    }
    while (Kn < chain.length && countVisibleMessages_2(chain[Kn], msgId)) Kn++;
    let Xn = new Map();
    if (group.some(countToolCallsSince_5)) {
      lt ??= buildChildrenIndex(messages);
      let fo = lt;
      let To = [...group];
      let bo = new Set(group.map((co) => co.uuid));
      for (let co of group)
        for (let So of S.get(co.uuid) ?? [])
          if (seen.has(So.uuid) && !bo.has(So.uuid)) {
            bo.add(So.uuid);
            To.push(So);
          }
      let vn = (co, So) => {
        let ko = nt.get(co.uuid);
        for (let un of fo.get(co.uuid) ?? []) {
          let linearChain = collectLinearChain(un, co, fo, seen);
          for (let $o of linearChain) {
            seen.add($o.uuid);
            So.push($o);
            if (ko !== undefined) {
              Je ??= mapKeysToIndex(messages);
              nt.set($o.uuid, Math.max(indexOrMax(Je, $o), ko));
              rememberMovedRow($o.uuid);
            }
          }
          recoveredTailCount += linearChain.length;
        }
      };
      for (let co of To) vn(co, ho);
      for (let co of chain.slice(yn + 1, Kn)) {
        if (!isAuxiliaryEntry(co)) continue;
        let So = [];
        vn(co, So);
        if (So.length > 0) Xn.set(co.uuid, So);
      }
    }
    if (ho.length === 0 && Xn.size === 0) continue;
    recoveredCount += orphanedSiblings.length + pn.length;
    Je ??= mapKeysToIndex(messages);
    ho.sort(Et);
    Ie.push({
      start: yn,
      end: Kn,
      recovered: ho,
      anchored: Xn,
    });
  }
  if (Ie.length === 0) return chain;
  logEvent("tengu_chain_parallel_tr_recovered", {
    recovered_count: recoveredCount,
    recovered_tail_count: recoveredTailCount,
  });
  if (ze > 0)
    logEvent("tengu_chain_tool_result_recovered_by_call_id", {
      recovered_count: ze,
    });
  Ie.sort((It, Yt) => It.start - Yt.start);
  let yt = [];
  for (let It of Ie) {
    let last = yt.at(-1);
    if (last !== undefined && It.start < last.end) {
      last.end = Math.max(last.end, It.end);
      last.recovered = [...last.recovered, ...It.recovered].sort(Et);
      for (let [qt, Zt] of It.anchored) last.anchored.set(qt, [...(last.anchored.get(qt) ?? []), ...Zt]);
    } else yt.push(It);
  }
  let gt = [];
  let At = 0;
  for (let { start, end, recovered, anchored } of yt) {
    gt.push(...chain.slice(At, start + 1));
    let rn = 0;
    for (let idx = start + 1; idx < end; idx++) {
      let no = chain[idx];
      let hn = indexOrMax(Je, no);
      while (rn < recovered.length && pt(recovered[rn]) < hn) gt.push(recovered[rn++]);
      gt.push(no);
      gt.push(...(anchored.get(no.uuid) ?? []));
    }
    while (rn < recovered.length) gt.push(recovered[rn++]);
    At = end;
  }
  gt.push(...chain.slice(At));
  return gt;
}
//@ chunk-e6aww6q8.js:450439-450740 facade-majority = checkResumeConsistency (1)
/**
 * 检查恢复的消息链与记录的轮次统计是否一致，偏差时打 tengu_resume_consistency_delta。
 */
function checkResumeConsistency(chain) {
  for (let i = chain.length - 1; i >= 0; i--) {
    let m = chain[i];
    if (m.type !== "system" || m.subtype !== "turn_duration") continue;
    let expected = m.messageCount;
    if (expected === undefined) return;
    let actual = i;
    logEvent("tengu_resume_consistency_delta", {
      expected,
      actual,
      delta: actual - expected,
      chain_length: chain.length,
      checkpoint_age_entries: chain.length - 1 - i,
    });
    return;
  }
}
//@ chunk-e6aww6q8.js:450740-450788 file-local
function buildAttributionSnapshotChain(attributionSnapshots, _conversation) {
  return Array.from(attributionSnapshots.values());
}
//@ chunk-e6aww6q8.js:450788-450856 facade-majority
class TranscriptFileFormatError extends Error {
  code;
  constructor(message, code) {
    super(message);
    this.code = code;
  }
}
//@ chunk-e6aww6q8.js:450856-452382 layout
function buildLiteLogFromMessages(transcriptFile, n, r) {
  let sessionId = findLatestMessage(transcriptFile.messages.values(), () => true)?.sessionId ?? r;
  return {
    ...n,
    messages: [],
    value: n.value ?? 0,
    firstPrompt: "",
    messageCount: 0,
    isSidechain: false,
    sessionId,
    customTitle: transcriptFile.customTitles.get(sessionId) ?? n.customTitle,
    aiTitle: transcriptFile.aiTitles.get(sessionId) ?? n.aiTitle,
    tag: transcriptFile.tags.get(sessionId) ?? n.tag,
    agentName: transcriptFile.agentNames.get(sessionId) ?? n.agentName,
    agentColor: transcriptFile.agentColors.get(sessionId),
    agentSetting: transcriptFile.agentSettings.get(sessionId) ?? n.agentSetting,
    mode: transcriptFile.modes.get(sessionId),
    permissionMode: transcriptFile.permissionModes.get(sessionId),
    isolationLatch: transcriptFile.isolationLatches.get(sessionId),
    devModsFolder: transcriptFile.devModsFolders?.get(sessionId),
    memoryModeStamps: transcriptFile.memoryModeStamps.get(sessionId) ?? [],
    atisLatch: transcriptFile.atisLatches.get(sessionId),
    toolsUsed: transcriptFile.toolsUsedLists?.get(sessionId),
    prNumber: transcriptFile.prNumbers.get(sessionId) ?? n.prNumber,
    prUrl: transcriptFile.prUrls.get(sessionId) ?? n.prUrl,
    prRepository: transcriptFile.prRepositories.get(sessionId) ?? n.prRepository,
    bridgeSessionId: transcriptFile.bridgeSessionIds.get(sessionId),
    bridgeLastSeq: transcriptFile.bridgeLastSeqs.get(sessionId),
    bridgeDialogKinds: transcriptFile.bridgeDialogKindsBySession.get(sessionId),
    bridgeSessionGroupingId: transcriptFile.bridgeSessionGroupingIds.get(sessionId),
    bridgeNoHistoryBackfill: transcriptFile.bridgeNoBackfill.get(sessionId),
    bridgeOwnerAccountUuid: transcriptFile.bridgeOwnerAccountUuids.get(sessionId),
    bridgeOwnerOrganizationUuid: transcriptFile.bridgeOwnerOrganizationUuids.get(sessionId),
    sessionHistorySuppressed: transcriptFile.historySuppressed.has(sessionId) ? true : undefined,
    worktreeSession: transcriptFile.worktreeStates.has(sessionId)
      ? transcriptFile.worktreeStates.get(sessionId)
      : n.worktreeSession,
    artifactCommentMonitor: transcriptFile.artifactCommentMonitors.get(sessionId),
    artifactAutoReactLedger: transcriptFile.artifactAutoReactLedgers.get(sessionId),
    costState: transcriptFile.costStates.get(sessionId),
    contentReplacements: transcriptFile.contentReplacements.get(sessionId) ?? [],
    rewindAnchorUuid: transcriptFile.rewindAnchorUuid,
  };
}
//@ chunk-e6aww6q8.js:452382-455102 facade-majority = loadTranscriptFromFile (0.439)
/**
 * 读取指定 jsonl 文件并构造日志对象（No messages found in JSONL file 时报错），用于 --resume <path>.jsonl。
 */
async function loadTranscriptFromFile(fullPath, storageV5) {
  let r =
    isStorageV5Enabled() && storageV5 !== undefined
      ? getTranscriptStorageKey(fullPath, storageV5)
      : undefined;
  if (r === undefined && isDiskless()) throw makeEnoentError(fullPath);
  if (fullPath.endsWith(".jsonl")) {
    let w = r ? undefined : await stat(fullPath);
    let transcriptFile = await loadTranscriptFile(
      fullPath,
      r && {
        storageV5: r,
      },
    );
    if (transcriptFile.servedBy === "absent") throw makeEnoentError(fullPath);
    let {
      messages,
      summaries,
      customTitles,
      endedSessions,
      aiTitles,
      tags,
      relocatedCwds,
      fileHistorySnapshots,
      fileHistoryDeltas,
      attributionSnapshots,
      leafUuids,
      contentReplacements,
      worktreeStates,
      artifactCommentMonitors,
      artifactAutoReactLedgers,
      costStates,
      isolationLatches,
      devModsFolders,
      memoryModeStamps,
      atisLatches,
      toolsUsedLists,
      bridgeSessionIds,
      bridgeLastSeqs,
      bridgeDialogKindsBySession,
      bridgeSessionGroupingIds,
      bridgeNoBackfill,
      bridgeOwnerAccountUuids,
      bridgeOwnerOrganizationUuids,
      historySuppressed,
      clearedToEmpty,
    } = transcriptFile;
    if (messages.size === 0)
      throw new TranscriptFileFormatError("No messages found in JSONL file", "no_messages");
    let leafMessage =
      findLatestMessage(messages.values(), (msg) => leafUuids.has(msg.uuid)) ??
      (leafUuids.size === 0 && !clearedToEmpty
        ? findLatestMessage(messages.values(), (msg) => !msg.isSidechain)
        : undefined);
    if (!leafMessage) {
      if (clearedToEmpty) {
        let So = w?.mtime ?? new Date(transcriptFile.v5Read?.mtimeMs ?? 0);
        return buildLiteLogFromMessages(transcriptFile, {
          date: So.toISOString(),
          fullPath,
          created: So,
          modified: So,
        });
      }
      throw new TranscriptFileFormatError("No valid conversation chain found in JSONL file", "no_chain");
    }
    let transcript = buildConversationChain(messages, leafMessage);
    warnIfTranscriptUnchained(messages, transcript, leafMessage.sessionId);
    let summary = summaries.get(leafMessage.uuid);
    let customTitle = customTitles.get(leafMessage.sessionId);
    let tag = tags.get(leafMessage.sessionId);
    let sessionId = leafMessage.sessionId;
    return {
      ...convertToLogOption(
        transcript,
        0,
        summary,
        customTitle,
        buildFileHistorySnapshots(fileHistorySnapshots, fileHistoryDeltas, transcript),
        tag,
        fullPath,
        buildAttributionSnapshotChain(attributionSnapshots, transcript),
        undefined,
        contentReplacements.get(sessionId) ?? [],
      ),
      rewindAnchorUuid: transcriptFile.rewindAnchorUuid,
      aiTitle: aiTitles.get(sessionId),
      relocatedCwd: relocatedCwds.get(sessionId),
      ...withEndedByModel({}, endedSessions.has(sessionId)),
      worktreeSession: worktreeStates.has(sessionId) ? worktreeStates.get(sessionId) : undefined,
      artifactCommentMonitor: artifactCommentMonitors.get(sessionId),
      artifactAutoReactLedger: artifactAutoReactLedgers.get(sessionId),
      costState: costStates.get(sessionId),
      isolationLatch: isolationLatches.get(sessionId),
      devModsFolder: devModsFolders?.get(sessionId),
      memoryModeStamps: memoryModeStamps.get(sessionId) ?? [],
      atisLatch: getOrEmptyString(atisLatches, sessionId),
      toolsUsed: toolsUsedLists?.get(sessionId),
      bridgeSessionId: bridgeSessionIds.get(sessionId),
      bridgeLastSeq: bridgeLastSeqs.get(sessionId),
      bridgeDialogKinds: bridgeDialogKindsBySession.get(sessionId),
      bridgeSessionGroupingId: bridgeSessionGroupingIds.get(sessionId),
      bridgeNoHistoryBackfill: bridgeNoBackfill.get(sessionId),
      bridgeOwnerAccountUuid: bridgeOwnerAccountUuids.get(sessionId),
      bridgeOwnerOrganizationUuid: bridgeOwnerOrganizationUuids.get(sessionId),
      sessionHistorySuppressed: historySuppressed.has(sessionId) ? true : undefined,
    };
  }
  let s = await stat(fullPath);
  if (s.size > 268435456)
    throw new TranscriptFileFormatError(
      `Transcript file too large to load as JSON (${s.size} bytes)`,
      "too_large",
    );
  let content = await readFile(fullPath, {
    encoding: "utf-8",
  });
  let parsed;
  try {
    parsed = jsonParse(content);
  } catch (error) {
    throw new TranscriptFileFormatError(`Invalid JSON in transcript file: ${error}`, "invalid_json");
  }
  let messages;
  if (Array.isArray(parsed)) messages = parsed;
  else if (parsed && typeof parsed === "object" && "messages" in parsed) {
    if (!Array.isArray(parsed.messages))
      throw new TranscriptFileFormatError("Transcript messages must be an array", "bad_shape");
    messages = parsed.messages;
  } else
    throw new TranscriptFileFormatError(
      "Transcript must be an array of messages or an object with a messages array",
      "bad_shape",
    );
  if (messages.length === 0)
    throw new TranscriptFileFormatError("No messages found in JSON file", "no_messages");
  return convertToLogOption(messages, 0, undefined, undefined, undefined, undefined, fullPath);
}
//@ chunk-e6aww6q8.js:455102-455270 layout
function makeEnoentError(e) {
  return Object.assign(
    new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
      `ENOENT: no such file or directory, stat '${e}'`,
      "ENOENT: no such file or directory",
    ),
    {
      code: "ENOENT",
      syscall: "stat",
      path: e,
    },
  );
}
//@ chunk-e6aww6q8.js:455270-455527 fingerprint = hasVisibleUserContent (1)
function hasVisibleUserContent(message) {
  if (message.type !== "user") return false;
  if (message.isMeta) return false;
  let content = message.message?.content;
  if (!content) return false;
  if (typeof content === "string") return content.trim().length > 0;
  if (Array.isArray(content))
    return content.some(
      (block) => block.type === "text" || block.type === "image" || block.type === "document",
    );
  return false;
}
//@ chunk-e6aww6q8.js:455527-455721 file-local
/**
 * assistant 消息含非空 text 块。旧版名 getAssistantMessageText 不准确。
 */
function hasNonEmptyAssistantText(message) {
  if (message.type !== "assistant") return false;
  let content = message.message?.content;
  if (!content || !Array.isArray(content)) return false;
  return content.some(
    (block) => block.type === "text" && typeof block.text === "string" && block.text.trim().length > 0,
  );
}
//@ chunk-e6aww6q8.js:455721-455902 placement = isSyntheticMessage (1)
/**
 * 统计含可见内容的 user/assistant 消息数（会话列表用）。旧版名 isSyntheticMessage 为错配。
 */
function countVisibleMessages(message) {
  let n = 0;
  for (let r of message)
    switch (r.type) {
      case "user":
        if (hasVisibleUserContent(r)) n++;
        break;
      case "assistant":
        if (hasNonEmptyAssistantText(r)) n++;
        break;
      case "attachment":
      case "system":
      case "progress":
        break;
    }
  return n;
}
//@ chunk-e6aww6q8.js:455902-456426 fingerprint = convertToLogOption (0.925)
function convertToLogOption(
  transcript,
  value = 0,
  summary,
  customTitle,
  fileHistorySnapshots,
  tag,
  fullPath,
  attributionSnapshots,
  agentSetting,
  contentReplacements,
) {
  let lastMessage = transcript.at(-1);
  let firstMessage = transcript[0];
  let firstPrompt = getFirstPromptInfo(transcript);
  let created = new Date(firstMessage.timestamp);
  let modified = new Date(lastMessage.timestamp);
  return {
    date: lastMessage.timestamp,
    messages: removeExtraFields(transcript),
    fullPath,
    value,
    created,
    modified,
    ...firstPrompt,
    messageCount: countVisibleMessages(transcript),
    isSidechain: firstMessage.isSidechain,
    teamName: firstMessage.teamName,
    sessionKind: firstMessage.sessionKind,
    agentName: firstMessage.agentName,
    agentSetting,
    leafUuid: (transcript.findLast((Ee) => !isReorderedRow(Ee.uuid)) ?? lastMessage).uuid,
    summary,
    customTitle,
    tag,
    fileHistorySnapshots,
    attributionSnapshots,
    contentReplacements,
    gitBranch: lastMessage.gitBranch,
    projectPath: firstMessage.cwd,
  };
}
//@ chunk-e6aww6q8.js:456426-456852 fingerprint = trackSessionBranchingAnalytics (1)
/**
 * 统计会话分叉（同一会话多叶子），打 tengu_session_forked_branches_fetched。
 */
async function trackSessionBranchingAnalytics(logs) {
  let sessionIdCounts = new Map();
  let maxCount = 0;
  for (let log of logs) {
    let sessionId = getSessionIdFromLog(log);
    if (sessionId) {
      let newCount = (sessionIdCounts.get(sessionId) || 0) + 1;
      sessionIdCounts.set(sessionId, newCount);
      maxCount = Math.max(newCount, maxCount);
    }
  }
  if (maxCount <= 1) return;
  let branchCounts = Array.from(sessionIdCounts.values()).filter((S) => S > 1);
  let sessionsWithBranches = branchCounts.length;
  let totalBranches = branchCounts.reduce((sum, count) => sum + count, 0);
  logEvent("tengu_session_forked_branches_fetched", {
    total_sessions: sessionIdCounts.size,
    sessions_with_branches: sessionsWithBranches,
    max_branches_per_session: Math.max(...branchCounts),
    avg_branches_per_session: Math.round(totalBranches / sessionsWithBranches),
    total_transcript_count: logs.length,
  });
}
//@ chunk-e6aww6q8.js:456852-457422 facade-majority = fetchLogs (0)
/**
 * 列出当前项目（及 worktree）的会话日志（lite），供 /resume 与 --continue 使用。
 */
async function fetchLogs(e, n) {
  if (isDiskless() && getTranscriptStorageContext(n) === undefined) return [];
  let originalCwd = getOriginalCwd();
  let s =
    (await findProjectDir(originalCwd, wrapStorageSource(getTranscriptStorageContext(n)))) ??
    getProjectDir(originalCwd);
  let [sessionFilesLite, sessionAliases] = await Promise.all([
    getSessionFilesLite(s, e, originalCwd, n),
    readSessionAliases(originalCwd, n),
  ]);
  let logs = sessionFilesLite;
  if (
    e !== undefined &&
    sessionFilesLite.length === e &&
    (await allLogsShareCwd(sessionFilesLite, originalCwd, n))
  ) {
    let sessionFilesLite = await getSessionFilesLite(s, undefined, originalCwd, n);
    let L = Buffer.alloc(LITE_READ_BUF_SIZE);
    let G = [];
    for (let q of sessionFilesLite)
      if (!(await logCwdMatches(q, originalCwd, L, n))) {
        G.push(q);
        if (G.length === e) break;
      }
    logs = G;
  }
  if (UNSAFE_PATH_CHAR_PATTERN.test(originalCwd) && (await allLogsShareCwd(logs, originalCwd, n)))
    logs = await getSessionFilesLite_2(originalCwd, s, e, false, undefined, n);
  if (sessionAliases.length > 0) {
    let mapped = (
      await Promise.all(
        sessionAliases.map((sessionAlias) => getSessionFilesLite(sessionAlias, e, undefined, n)),
      )
    )
      .flat()
      .map((L) => ({
        ...L,
        isAlias: true,
      }));
    logs = latestLogPerSession(logs.concat(mapped));
    if (e !== undefined) logs = logs.slice(0, e);
  }
  await trackSessionBranchingAnalytics(logs);
  return logs;
}
//@ chunk-e6aww6q8.js:457422-457634 layout
function writeTranscriptMetadataSync(sessionFile, n) {
  if (isTranscriptPersistenceDisabled()) return;
  assertDiskWritable("transcript_metadata", sessionFile);
  let fsImplementation = getFsImplementation();
  let s =
    jsonStringify(n) +
    `
`;
  try {
    fsImplementation.appendFileSync(sessionFile, s, {
      mode: 384,
    });
  } catch {
    fsImplementation.mkdirSync(dirname(sessionFile), {
      mode: 448,
    });
    fsImplementation.appendFileSync(sessionFile, s, {
      mode: 384,
    });
  }
  getProject().fireMirror(sessionFile, [n]);
}
//@ chunk-e6aww6q8.js:457634-458137 layout
/**
 * 同步向已存在的转录文件追加一条记录（文件末尾无换行时先补换行、可换用替代记录），完整写入后触发镜像；文件不存在或为空时跳过。
 */
function appendEntrySync(path, entry, tornTailEntry) {
  if (isTranscriptPersistenceDisabled()) return;
  if (isDiskless()) {
    warnDisklessSettingsWrite("transcript_stop_now", path);
    return;
  }
  let line =
    jsonStringify(entry) +
    `
`;
  let fd;
  try {
    fd = openSync(path, constants.O_RDWR | constants.O_APPEND);
  } catch (error) {
    let errnoCode = getErrnoCode(error);
    if (errnoCode === "ENOENT" || errnoCode === "ENOTDIR") return;
    throw error;
  }
  try {
    let { size } = fstatSync(fd);
    if (size === 0) return;
    let S = !endsWithNewlineSync(fd, size);
    if (S && tornTailEntry !== undefined) entry = tornTailEntry;
    let buffer = Buffer.from(
      S
        ? `
` +
            jsonStringify(entry) +
            `
`
        : line,
      "utf8",
    );
    let L = undefined;
    let G = 0;
    while (G < buffer.length) {
      let q = writeSync(fd, buffer, G, buffer.length - G, L);
      if (q <= 0) throw Error("appendEntryToExistingFileSync: short write");
      G += q;
      if (L !== undefined) L += q;
    }
  } finally {
    closeSync(fd);
  }
  getProject().fireMirror(path, [entry]);
}
//@ chunk-e6aww6q8.js:458137-458381 layout
function readTranscriptTail(sessionFile) {
  if (isDiskless()) return "";
  let n;
  try {
    n = openSync(sessionFile, "r");
    let r = fstatSync(n);
    let max = Math.max(0, r.size - LITE_READ_BUF_SIZE);
    let h = Buffer.allocUnsafe(Math.min(LITE_READ_BUF_SIZE, r.size - max));
    let y = readSync(n, h, 0, h.length, max);
    return h.toString("utf8", 0, y);
  } catch {
    return "";
  } finally {
    if (n !== undefined)
      try {
        closeSync(n);
      } catch {}
  }
}
//@ chunk-e6aww6q8.js:458381-458394 layout
var transcriptRelocationQueue = createKeyedQueue();
//@ chunk-e6aww6q8.js:458394-458446 layout
function openRelocationBracket(sessionFilePath) {
  currentTranscriptStore().openAppendRelocationBracket(sessionFilePath);
}
//@ chunk-e6aww6q8.js:458446-458598 layout
function flushParkedAppends(sessionFilePath) {
  let n = currentTranscriptStore().closeAppendRelocationBracket();
  if (!n) return;
  for (let { entry, storageV5, opts, resolve, reject } of n)
    appendEntryToFileAsync(sessionFilePath, entry, storageV5, opts).then(resolve, reject);
}
//@ chunk-e6aww6q8.js:458598-459186 facade-majority
function appendEntryToFileAsync(e, n, r, s) {
  if (isTranscriptPersistenceDisabled()) return Promise.resolve();
  let { relocationParkedAppends, relocationParkedPath } = currentTranscriptStore();
  if (relocationParkedAppends !== null && e === relocationParkedPath)
    return new Promise((resolve, reject) => {
      relocationParkedAppends.push({
        entry: n,
        storageV5: r,
        opts: s,
        resolve,
        reject,
      });
    });
  let S =
    jsonStringify(n) +
    `
`;
  let w =
    s?.tornTailEntry !== undefined
      ? jsonStringify(s.tornTailEntry) +
        `
`
      : undefined;
  let L = transcriptRelocationQueue.run(e, async () => {
    let G = await appendToTranscriptFile(e, S, r, s?.onlyIfExists, w);
    if (G !== "skipped") {
      let q =
        (G === "direct-torn" || G === "backend-torn") && s?.tornTailEntry !== undefined ? s.tornTailEntry : n;
      getProject().fireMirror(e, [q]);
    }
  });
  L.catch((error) => {
    logForDebugging(`appendEntryToFileAsync: append to ${e} failed: ${errorMessage(error)}`, {
      level: "error",
    });
  });
  return L;
}
//@ chunk-e6aww6q8.js:459186-459226 facade-majority
async function flushAppendEntryQueues() {
  await transcriptRelocationQueue.settle();
}
//@ chunk-e6aww6q8.js:459226-459401 layout
function isLastPromptLine(e) {
  if (!e.includes('"type":"last-prompt"') || !e.includes('"leafUuid":')) return false;
  try {
    let n = jsonParseRaw(e);
    return n.type === "last-prompt" && n.leafUuid !== undefined;
  } catch {
    return false;
  }
}
//@ chunk-e6aww6q8.js:459401-459819 layout = readFileRange (0.819)
async function readFileRange(e, n) {
  if (isStorageV5Enabled() && n !== undefined && transcriptKeyFor(e) !== undefined)
    return (
      (
        await readTranscriptTailViaStorage(e, LITE_READ_BUF_SIZE, n).catch(() => {
          return;
        })
      )?.content ?? ""
    );
  let r = worktreeFromProgress(e);
  if (r === undefined) return "";
  let s;
  try {
    s = await open(r, "r");
    let stats = await s.stat();
    let max = Math.max(0, stats.size - LITE_READ_BUF_SIZE);
    let bytesToRead = Math.min(LITE_READ_BUF_SIZE, stats.size - max);
    if (bytesToRead <= 0) return "";
    let buffer = Buffer.allocUnsafe(bytesToRead);
    let { bytesRead } = await s.read(buffer, 0, bytesToRead, max);
    return buffer.toString("utf8", 0, bytesRead);
  } catch {
    return "";
  } finally {
    if (s)
      try {
        await s.close();
      } catch {}
  }
}
//@ chunk-e6aww6q8.js:459819-460025 facade-majority
async function markSessionEndedByModel(sessionId, storageV5) {
  if (isTranscriptPersistenceDisabled()) return;
  await appendEntryToFileAsync(
    getTranscriptPathForSession(sessionId),
    {
      type: "ended-by-model",
      timestamp: new Date().toISOString(),
      sessionId,
    },
    storageV5,
  ).catch((error) => {
    logForDebugging(`markSessionEndedByModel: transcript append failed: ${errorMessage(error)}`);
  });
}
//@ chunk-e6aww6q8.js:460025-460111 facade-majority
function applyEndedByModelOnResume(endedByModel, n) {
  let r = Boolean(endedByModel);
  n((s) =>
    s.endedByModel === r
      ? s
      : {
          ...s,
          endedByModel: r,
        },
  );
}
//@ chunk-e6aww6q8.js:460111-460503 facade-majority = saveCustomTitle (0.756)
/**
 * 追加 custom-title 记录（/rename 等），更新内存中的会话标题并发出标题变更事件。
 */
async function saveCustomTitle(sessionId, customTitle, fullPath, source = "user", storageV5) {
  let resolvedPath = fullPath ?? getTranscriptPathForSession(sessionId);
  try {
    await appendEntryToFileAsync(
      resolvedPath,
      {
        type: "custom-title",
        customTitle,
        sessionId,
      },
      storageV5,
    );
  } catch (error) {
    if (isSyscallError(error))
      logForDebugging(
        `saveCustomTitle: transcript append failed (${getErrnoCode(error)}): ${errorMessage(error)}`,
        {
          level: "error",
        },
      );
    else throw error;
  }
  if (!isTranscriptPersistenceDisabled()) {
    let S = sessionId === getSessionId() ? getTranscriptPathForSession(sessionId) : resolvedPath;
    await writeSessionTitleSidecar(S, sessionId, customTitle, storageV5);
  }
  if (sessionId === getSessionId()) {
    getProject().currentSessionTitle = customTitle;
    currentTranscriptStore().sessionTitleChanged.emit();
  }
  logEvent("tengu_session_renamed", {
    source: fromEnum(source),
  });
}
//@ chunk-e6aww6q8.js:460503-460722 facade-majority = saveAiGeneratedTitle (0.539)
/**
 * 追加 ai-title 记录（自动生成的会话标题）。
 */
function saveAiGeneratedTitle(sessionId, n, storageV5) {
  appendEntryToFileAsync(
    getTranscriptPathForSession(sessionId),
    {
      type: "ai-title",
      aiTitle: n,
      sessionId,
    },
    storageV5,
  ).catch((error) => {
    logForDebugging(`saveAiGeneratedTitle: transcript append failed: ${errorMessage(error)}`);
  });
  if (sessionId === getSessionId()) {
    getProject().currentSessionAiTitle = n;
    currentTranscriptStore().sessionTitleChanged.emit();
  }
}
//@ chunk-e6aww6q8.js:460722-461204 facade-majority = linkSessionToPR (0.804)
/**
 * 追加 pr-link 记录（PR 编号、URL、仓库），打 tengu_session_linked_to_pr。
 */
async function linkSessionToPR(sessionId, prNumber, prUrl, prRepository, fullPath, y) {
  let resolvedPath = fullPath ?? getTranscriptPathForSession(sessionId);
  try {
    await appendEntryToFileAsync(
      resolvedPath,
      {
        type: "pr-link",
        sessionId,
        prNumber,
        prUrl,
        prRepository,
        timestamp: new Date().toISOString(),
      },
      y,
    );
    logEvent("tengu_session_linked_to_pr", {
      prNumber,
    });
  } catch (error) {
    let errnoCode = getErrnoCode(error);
    if (isSyscallError(error))
      logForDebugging(
        `linkSessionToPR: failed to append pr-link entry to ${resolvedPath} (${errnoCode}): ${errorMessage(error)}`,
        {
          level: "error",
        },
      );
    else logError(error);
    reportTranscriptWriteFailure(currentTranscriptStore().writerHealth, "pr_link", error, resolvedPath);
  }
  if (sessionId === getSessionId()) {
    let project = getProject();
    project.currentSessionPrNumber = prNumber;
    project.currentSessionPrUrl = prUrl;
    project.currentSessionPrRepository = prRepository;
  }
}
//@ chunk-e6aww6q8.js:461204-461292 layout
function needsTranscriptTarget(project, n, r) {
  return Boolean(project.sessionFilePath) || (r?.targetExists === true && n !== undefined);
}
//@ chunk-e6aww6q8.js:461292-462041 facade-majority
function saveBridgeSession(
  sessionId,
  bridgeSessionId,
  lastSequenceNum,
  s,
  h,
  sessionGroupingId,
  S,
  w,
  L,
  storageV5,
) {
  let project = getProject();
  if (needsTranscriptTarget(project, s, L))
    appendEntryToFileAsync(
      s ?? getTranscriptPathForSession(sessionId),
      {
        type: "bridge-session",
        sessionId,
        bridgeSessionId,
        lastSequenceNum,
        ...(h?.length && {
          declaredDialogKinds: h,
        }),
        ...(sessionGroupingId && {
          sessionGroupingId,
        }),
        ...(S && {
          noHistoryBackfill: true,
        }),
        ...(w?.accountUuid && {
          ownerAccountUuid: w.accountUuid,
        }),
        ...(w?.organizationUuid && {
          ownerOrganizationUuid: w.organizationUuid,
        }),
      },
      storageV5,
    ).catch((error) => {
      logForDebugging(`saveBridgeSession: transcript append failed: ${errorMessage(error)}`);
    });
  if (sessionId === getSessionId()) {
    project.currentSessionBridgeId = bridgeSessionId;
    project.currentSessionBridgeSeq = lastSequenceNum;
    project.currentSessionBridgeDialogKinds = h?.length ? h : undefined;
    project.currentSessionBridgeGroupingId = sessionGroupingId;
    project.currentSessionBridgeNoBackfill = S ? true : undefined;
    project.currentSessionBridgeOwnerAccountUuid = w?.accountUuid;
    project.currentSessionBridgeOwnerOrganizationUuid = w?.organizationUuid;
  }
}
//@ chunk-e6aww6q8.js:462041-462279 facade-majority
function writeHistorySuppression(e, n, r, s, storageV5) {
  let y = e ?? getSessionId();
  if (!y) return;
  let S;
  if (!isTranscriptPersistenceDisabled())
    S = appendEntryToFileAsync(
      n ?? getTranscriptPathForSession(y),
      buildHistorySuppressionEntry(y, r, s),
      storageV5,
    ).catch((error) => {
      logForDebugging(`writeHistorySuppression: transcript append failed: ${errorMessage(error)}`);
    });
  markSessionHistorySuppressedFor(y);
  if (y === getSessionId()) getProject().currentSessionHistorySuppressed = true;
  return S;
}
//@ chunk-e6aww6q8.js:462279-462343 facade-majority
function isSessionHistorySuppressed() {
  return getProject().currentSessionHistorySuppressed === true;
}
//@ chunk-e6aww6q8.js:462343-462597 facade-majority
async function readHistorySuppressionFromDisk(e) {
  let sessionId = getSessionId();
  let materializedSessionFile = getMaterializedSessionFile();
  let s =
    Boolean(sessionId) &&
    materializedSessionFile !== null &&
    !isOwnTranscriptFile(sessionId, materializedSessionFile);
  try {
    let h = s
      ? getDerivedTranscriptPathForSession(sessionId)
      : (materializedSessionFile ?? getTranscriptPath());
    let y = await scanTranscriptForSuppression(
      h,
      {
        sid: sessionId || undefined,
      },
      e,
    );
    return s && y === "clean" ? "torn" : y;
  } catch (error) {
    if (isENOENT(error)) {
      if (s) return "torn";
      return isTranscriptRelocationInProgress() ? "read-error" : "clean";
    }
    return "read-error";
  }
}
//@ chunk-e6aww6q8.js:462597-462659 facade-majority
function isTranscriptRelocationInProgress() {
  return getProject().isTranscriptRelocationInProgress();
}
//@ chunk-e6aww6q8.js:462659-462710 facade-majority
function mirrorInternalEntryForTesting(e) {
  return getProject().mirrorInternalEntry(e);
}
//@ chunk-e6aww6q8.js:462710-462745 facade-majority
var SUPPRESSION_SCAN_MAX_LINES = 1e5;
var SUPPRESSION_SCAN_MAX_LINES_ANT = 1e6;
var SUPPRESSION_SCAN_MAX_BYTES_ANT = 4294967296;
//@ chunk-e6aww6q8.js:462745-462989 facade-majority
class SuppressionScanBudget {
  maxLines;
  maxBytes;
  lines = 0;
  chars = 0;
  constructor(maxLines = SUPPRESSION_SCAN_MAX_LINES, maxBytes = 1 / 0) {
    this.maxLines = maxLines;
    this.maxBytes = maxBytes;
  }
  static forBackendRead() {
    return new SuppressionScanBudget(SUPPRESSION_SCAN_MAX_LINES, 1 / 0);
  }
  spend(e) {
    this.chars += e.length + 1;
    return ++this.lines >= this.maxLines || this.chars >= this.maxBytes;
  }
}
//@ chunk-e6aww6q8.js:462989-463004 facade-majority
var SUPPRESSION_SCAN_CHUNK_BYTES = 262144;
//@ chunk-e6aww6q8.js:463004-463134 facade-majority
function suppressionScanFailure(error) {
  if (isENOENT(error)) return "no-file";
  if (error instanceof FileChangedDuringReadError) return error.partialRead ? "partial-read" : "file-changed";
  return "read-error";
}
//@ chunk-e6aww6q8.js:463134-463151 facade-majority
function logSuppressionScan(e) {}
//@ chunk-e6aww6q8.js:463151-463643 facade-majority
async function scanTranscriptForSuppression(e, n, storageV5) {
  let s = isStorageV5Enabled() && storageV5 !== undefined ? getTranscriptStorageKey(e, storageV5) : undefined;
  let h =
    n.budget ?? (s !== undefined ? SuppressionScanBudget.forBackendRead() : new SuppressionScanBudget());
  let startMs = Date.now();
  let fileBytes;
  let w =
    s !== undefined
      ? openTranscriptStream(s.backend, s.key)
      : readLinesReverse(e, SUPPRESSION_SCAN_CHUNK_BYTES, {
          onOpen: (q) => {
            fileBytes = q;
          },
        });
  let L = "clean";
  let G;
  try {
    for await (let q of w) {
      G ??= q;
      let Z = h.spend(q);
      if (matchesHistorySuppressionLine(q, n)) {
        L = "found";
        return L;
      }
      if (Z) {
        L = "budget-exhausted";
        return L;
      }
    }
    return "clean";
  } catch (error) {
    L = suppressionScanFailure(error);
    throw error;
  } finally {
    logSuppressionScan({
      leg: "transcript-scan",
      throughBackend: s !== undefined,
      outcome: L,
      lines: h.lines,
      charsRead: h.chars,
      fileBytes,
      startMs,
    });
  }
}
//@ chunk-e6aww6q8.js:463643-464057 facade-majority
async function scanAppendedForSuppression(e, n, r, s) {
  for (;;) {
    let h = 0;
    let y = 0;
    let S;
    let w = false;
    try {
      for await (let L of readLinesReverse(e, SUPPRESSION_SCAN_CHUNK_BYTES, {
        onOpen: (G) => {
          h = G;
        },
      })) {
        if (h < n.size) break;
        if (L === n.lastLine && y === h - n.size) {
          w = true;
          break;
        }
        S ??= L;
        let G = s.spend(L);
        if (matchesHistorySuppressionLine(L, r)) return "found";
        if (G) return "budget-exhausted";
        y += Buffer.byteLength(L) + 1;
      }
    } catch (error) {
      throw isENOENT(error) ? new FileChangedDuringReadError() : error;
    }
    if (h < n.size) throw new FileChangedDuringReadError();
    if (h === n.size && (w || S === undefined)) return "clean";
    n = {
      size: h,
      lastLine: S ?? n.lastLine,
    };
  }
}
//@ chunk-e6aww6q8.js:464057-464124 facade-majority = getErrorsPath (1)
function isOwnTranscriptFile(e, n) {
  return e !== undefined && n != null && basename(n) === `${e}.jsonl`;
}
//@ chunk-e6aww6q8.js:464124-464178 facade-majority = getErrorsPath (1)
function getDerivedTranscriptPathForSession(sessionId) {
  let projectDir = resolveProjectDir();
  return join(projectDir, `${sessionId}.jsonl`);
}
//@ chunk-e6aww6q8.js:464178-464357 facade-majority
function matchesHistorySuppressionLine(e, n = {}) {
  if (!e.includes('"history-suppression"')) return false;
  try {
    let r = jsonParse(e);
    return r.type === "history-suppression" && (n.sid === undefined || r.sessionId === n.sid);
  } catch {
    return false;
  }
}
//@ chunk-e6aww6q8.js:464357-464879 facade-majority
function buildForkAdoptionMeta(e, n = {}) {
  return {
    ...e,
    ...(n.stripWorktreeSession && {
      worktreeSession: undefined,
    }),
    ...(n.stripRelocatedCwd && {
      relocatedCwd: undefined,
    }),
    memoryModeStamps: e.memoryModeStamps?.map((memoryModeStamp) => ({
      ...memoryModeStamp,
      written: e.forkedFromSessionId !== undefined ? (memoryModeStamp.written ?? true) : false,
    })),
    devModsFolder: undefined,
    artifactCommentMonitor: undefined,
    artifactAutoReactLedger: undefined,
    bridgeSessionId: undefined,
    bridgeLastSeq: undefined,
    bridgeDialogKinds: undefined,
    bridgeSessionGroupingId: undefined,
    bridgeNoHistoryBackfill: undefined,
    bridgeOwnerAccountUuid: undefined,
    bridgeOwnerOrganizationUuid: undefined,
  };
}
//@ chunk-e6aww6q8.js:464879-465180 facade-majority
async function adoptForkSessionMetadata(e, n) {
  let r = n.destSid ?? pinSessionId(getSessionId());
  let s = e.sessionHistorySuppressed === true || isSessionHistorySuppressedFor(pinSessionId(e.sessionId));
  if (s) await writeHistorySuppression(r, undefined, "fork_inherit", undefined, n.storageV5);
  restoreSessionMetadata(
    buildForkAdoptionMeta(
      s && !e.sessionHistorySuppressed
        ? {
            ...e,
            sessionHistorySuppressed: true,
          }
        : e,
      n,
    ),
    {
      taintSid: r,
      storageV5: n.storageV5,
    },
  );
  copyPrecautionarySuppressionTo(r, pinSessionId(e.sessionId));
}
//@ chunk-e6aww6q8.js:465180-465235 facade-majority
function holdSessionHistorySuppression() {
  getProject().currentSessionHistorySuppressed = true;
}
//@ chunk-e6aww6q8.js:465235-465321 facade-majority
function holdSessionHistorySuppressionFor(e) {
  markSessionHistorySuppressedFor(e);
  if (e !== undefined && e === getSessionId()) getProject().currentSessionHistorySuppressed = true;
}
//@ chunk-e6aww6q8.js:465321-465436 facade-majority
function markSessionHistorySuppressedFor(e) {
  if (e === undefined) return;
  let project = getProject();
  project.knownTaintedSessionIds ??= new Set();
  project.knownTaintedSessionIds.add(e);
}
//@ chunk-e6aww6q8.js:465436-465512 facade-majority
function isSessionHistorySuppressedFor(e) {
  return e !== undefined && getProject().knownTaintedSessionIds?.has(e) === true;
}
//@ chunk-e6aww6q8.js:465512-465571 facade-majority
function dropSessionHistorySuppression() {
  getProject().currentSessionHistorySuppressed = undefined;
}
//@ chunk-e6aww6q8.js:465571-465595 facade-majority
function pinSessionId(sessionId) {
  return sessionId;
}
//@ chunk-e6aww6q8.js:465595-465734 facade-majority
function holdPrecautionarySuppressionFor(boundSessionKey) {
  if (!boundSessionKey) return;
  let project = getProject();
  project.currentSessionPrecautionarySuppression ??= new Set();
  project.currentSessionPrecautionarySuppression.add(boundSessionKey);
}
//@ chunk-e6aww6q8.js:465734-465877 facade-majority
function dropPrecautionarySuppressionForTesting() {
  getProject().currentSessionPrecautionarySuppression = undefined;
  getProject().clearResilientPrecautionSids = undefined;
  getProject().scanUncertaintyHoldSids = undefined;
}
//@ chunk-e6aww6q8.js:465877-466002 facade-majority
function releasePrecautionarySuppressionFor(e) {
  let project = getProject();
  if (e && !project.clearResilientPrecautionSids?.has(e))
    project.currentSessionPrecautionarySuppression?.delete(e);
}
//@ chunk-e6aww6q8.js:466002-466129 facade-majority
function markPrecautionClearResilientFor(e) {
  if (e === undefined) return;
  let project = getProject();
  project.clearResilientPrecautionSids ??= new Set();
  project.clearResilientPrecautionSids.add(e);
}
//@ chunk-e6aww6q8.js:466129-466246 facade-majority
function markScanUncertaintyHoldFor(e) {
  if (e === undefined) return;
  let project = getProject();
  project.scanUncertaintyHoldSids ??= new Set();
  project.scanUncertaintyHoldSids.add(e);
}
//@ chunk-e6aww6q8.js:466246-466323 facade-majority
function isScanUncertaintyHoldFor(e) {
  return e !== undefined && getProject().scanUncertaintyHoldSids?.has(e) === true;
}
//@ chunk-e6aww6q8.js:466323-466400 facade-majority
function claimPrecautionHoldForObservedCause(boundSessionKey) {
  if (boundSessionKey === undefined) return;
  getProject().scanUncertaintyHoldSids?.delete(boundSessionKey);
}
//@ chunk-e6aww6q8.js:466400-466623 facade-majority
function releaseScanUncertaintyHoldFor(e) {
  if (e === undefined) return;
  let project = getProject();
  if (!project.scanUncertaintyHoldSids?.has(e)) return;
  project.scanUncertaintyHoldSids.delete(e);
  project.clearResilientPrecautionSids?.delete(e);
  project.currentSessionPrecautionarySuppression?.delete(e);
}
//@ chunk-e6aww6q8.js:466623-466658 facade-majority
function isPrecautionarySuppressionHeld() {
  return isPrecautionarySuppressionHeldFor(pinSessionId(getSessionId()));
}
//@ chunk-e6aww6q8.js:466658-466750 facade-majority
function isPrecautionarySuppressionHeldFor(e) {
  return e !== undefined && getProject().currentSessionPrecautionarySuppression?.has(e) === true;
}
//@ chunk-e6aww6q8.js:466750-466943 facade-majority
function copyPrecautionarySuppressionTo(e, n) {
  if (!e || !n) return;
  let project = getProject();
  let currentSessionPrecautionarySuppression = project.currentSessionPrecautionarySuppression;
  if (currentSessionPrecautionarySuppression?.has(n)) {
    currentSessionPrecautionarySuppression.add(e);
    if (project.clearResilientPrecautionSids?.has(n)) project.clearResilientPrecautionSids.add(e);
  }
}
//@ chunk-e6aww6q8.js:466943-466991 facade-majority
function registerLiveSuppressionProbe(e) {
  currentTranscriptStore().setLiveSuppressionProbe(e);
}
//@ chunk-e6aww6q8.js:466991-467048 facade-majority
function isLiveBridgeSuppressed() {
  return currentTranscriptStore().liveSuppressionProbe?.() === true;
}
//@ chunk-e6aww6q8.js:467048-467069 facade-majority = orgStatus (1)
var PENDING_BRIDGE_SESSION = "pending";
var PENDING_BRIDGE_SESSION_2;
//@ chunk-e6aww6q8.js:467069-467090 facade-majority
function registerForeignConversationProbe(e) {
  PENDING_BRIDGE_SESSION_2 = e;
}
//@ chunk-e6aww6q8.js:467090-467126 facade-majority
function bridgeSessionsForPulledRow(uuid) {
  return pulledRows()?.get(uuid);
}
//@ chunk-e6aww6q8.js:467126-467209 layout
function firstConcreteBridgeSession(e) {
  if (e === undefined) return;
  for (let n of e) if (n !== PENDING_BRIDGE_SESSION) return n;
  return PENDING_BRIDGE_SESSION;
}
//@ chunk-e6aww6q8.js:467209-467248 layout
function pulledRows() {
  return PENDING_BRIDGE_SESSION_2?.().pulledRows;
}
//@ chunk-e6aww6q8.js:467248-467422 facade-majority
function isRowForeignToBridgeSession(e, n) {
  if (n === undefined) return false;
  if (e.foreignToBridgeSession === n || e.foreignToBridgeSession === PENDING_BRIDGE_SESSION) return true;
  let r = bridgeSessionsForPulledRow(e.uuid);
  return r !== undefined && (r.has(n) || r.has(PENDING_BRIDGE_SESSION));
}
//@ chunk-e6aww6q8.js:467422-467463 facade-majority
function isBridgeBindingForeign() {
  return PENDING_BRIDGE_SESSION_2?.().foreign === true;
}
//@ chunk-e6aww6q8.js:467463-467570 facade-majority
function isForeignToBinding(e) {
  let n = PENDING_BRIDGE_SESSION_2?.();
  if (n?.foreign !== true) return false;
  if (!e || !n.boundSid) return true;
  return e !== n.boundSid;
}
//@ chunk-e6aww6q8.js:467570-467682 facade-majority
function bridgeSessionForPulledWindow(e) {
  let pulledWindow = PENDING_BRIDGE_SESSION_2?.().pulledWindow;
  return pulledWindow !== undefined && e !== undefined && pulledWindow.sids.has(e)
    ? pulledWindow.bridgeSessionId
    : undefined;
}
//@ chunk-e6aww6q8.js:467682-467720 facade-majority
function getBridgeBoundConversationSid() {
  return PENDING_BRIDGE_SESSION_2?.().boundSid;
}
//@ chunk-e6aww6q8.js:467720-467792 facade-majority
function isCompactPairWithheldFromRemote() {
  return (
    isSessionHistorySuppressed() ||
    getCurrentSessionBridge()?.noHistoryBackfill === true ||
    isLiveBridgeSuppressed() ||
    isPrecautionarySuppressionHeld()
  );
}
//@ chunk-e6aww6q8.js:467792-467844 facade-majority
function isRemoteEgressSuppressedFor(e) {
  return (
    isForeignToBinding(e) ||
    isCompactPairWithheldFromRemote() ||
    isPrecautionarySuppressionHeldFor(e) ||
    isSessionHistorySuppressedFor(e)
  );
}
//@ chunk-e6aww6q8.js:467844-467889 facade-majority
function isConversationEgressTainted(e) {
  return (
    isCompactPairWithheldFromRemote() ||
    isPrecautionarySuppressionHeldFor(e) ||
    isSessionHistorySuppressedFor(e)
  );
}
//@ chunk-e6aww6q8.js:467889-467914 facade-majority
function clearBridgeSessionCache() {
  clearBridgeSessionFields(getProject());
}
//@ chunk-e6aww6q8.js:467914-468213 layout
function clearBridgeSessionFields(project) {
  project.currentSessionBridgeId = undefined;
  project.currentSessionBridgeSeq = undefined;
  project.currentSessionBridgeDialogKinds = undefined;
  project.currentSessionBridgeGroupingId = undefined;
  project.currentSessionBridgeNoBackfill = undefined;
  project.currentSessionBridgeOwnerAccountUuid = undefined;
  project.currentSessionBridgeOwnerOrganizationUuid = undefined;
}
//@ chunk-e6aww6q8.js:468213-468448 facade-majority
function clearBridgeSession(e, n, r, storageV5) {
  let h = e ?? getSessionId();
  let project = getProject();
  if (needsTranscriptTarget(project, n, r))
    appendEntryToFileAsync(
      n ?? getTranscriptPathForSession(h),
      {
        type: "bridge-session",
        sessionId: h,
        bridgeSessionId: "",
        lastSequenceNum: 0,
      },
      storageV5,
    ).catch((error) => {
      logForDebugging(`clearBridgeSession: transcript append failed: ${errorMessage(error)}`);
    });
  if (h === getSessionId()) clearBridgeSessionFields(project);
}
//@ chunk-e6aww6q8.js:468448-468846 facade-majority
function getCurrentSessionBridge() {
  let project = getProject();
  return project.currentSessionBridgeId
    ? {
        id: project.currentSessionBridgeId,
        seq: project.currentSessionBridgeSeq ?? 0,
        declaredDialogKinds: project.currentSessionBridgeDialogKinds,
        groupingId: project.currentSessionBridgeGroupingId,
        noHistoryBackfill: project.currentSessionBridgeNoBackfill,
        ownerAccountUuid: project.currentSessionBridgeOwnerAccountUuid,
        ownerOrganizationUuid: project.currentSessionBridgeOwnerOrganizationUuid,
      }
    : undefined;
}
//@ chunk-e6aww6q8.js:468846-468911 facade-majority = getCurrentSessionTitle (1)
/**
 * 当前（或指定）会话的自定义标题。
 */
function getCurrentSessionTitle(sessionId) {
  if (sessionId === getSessionId()) return getProject().currentSessionTitle;
  return;
}
//@ chunk-e6aww6q8.js:468911-468979 facade-majority
function getCurrentSessionAiTitle(sessionId) {
  if (sessionId === getSessionId()) return getProject().currentSessionAiTitle;
  return;
}
//@ chunk-e6aww6q8.js:468979-469015 facade-majority
/**
 * 会话标题：自定义标题优先，否则 AI 生成标题。
 */
function getCurrentSessionDisplayTitle(sessionId) {
  return getCurrentSessionTitle(sessionId) ?? getCurrentSessionAiTitle(sessionId);
}
//@ chunk-e6aww6q8.js:469015-469057 facade-majority
function getCurrentSessionPeerName() {
  return getRegisteredSessionName()?.name ?? getCurrentSessionDisplayTitle(getSessionId());
}
//@ chunk-e6aww6q8.js:469057-469147 facade-majority
function getCurrentSessionOffBoxPeerName() {
  let registeredSessionName = getRegisteredSessionName();
  return (
    (registeredSessionName !== undefined && registeredSessionName.source !== "derived"
      ? registeredSessionName.name
      : undefined) ?? getCurrentSessionDisplayTitle(getSessionId())
  );
}
//@ chunk-e6aww6q8.js:469147-469195 facade-majority
function getCurrentSessionPeerNameFor(kind) {
  return kind === "bridge" ? getCurrentSessionOffBoxPeerName() : getCurrentSessionPeerName();
}
//@ chunk-e6aww6q8.js:469195-469247 facade-majority = getCurrentSessionAgentColor (1)
function getCurrentSessionAgentColor() {
  return getProject().currentSessionAgentColor;
}
//@ chunk-e6aww6q8.js:469247-469298 facade-majority
function getCurrentSessionAgentName() {
  return getProject().currentSessionAgentName;
}
//@ chunk-e6aww6q8.js:469298-469373 facade-majority
function restoreConversationToolsUsed(toolsUsed, messages) {
  let conversationToolsUsed = getConversationToolsUsed();
  conversationToolsUsed.record(toolsUsed ?? []);
  conversationToolsUsed.record(tagUntrustedArtifactContent(messages ?? [], undefined, false));
}
//@ chunk-e6aww6q8.js:469373-469456 facade-majority = setSessionFileForTesting (0.526)
function markToolsUsedWritten() {
  let project = getProject();
  project.toolsUsedStamp = `${project.sessionFile}
${getConversationToolsUsed().generation()}`;
}
//@ chunk-e6aww6q8.js:469456-472098 facade-majority
/**
 * resume 时把日志中的会话元数据（标题、AI 标题、tag、cwd 迁移、代理名/颜色/设置、模式、PR、worktree 等）装回 Project 当前会话字段。
 */
function restoreSessionMetadata(e, n) {
  let project = getProject();
  if (e.customTitle) project.currentSessionTitle ??= e.customTitle;
  if (e.aiTitle) project.currentSessionAiTitle ??= e.aiTitle;
  if (e.customTitle || e.aiTitle) currentTranscriptStore().sessionTitleChanged.emit();
  if (e.tag !== undefined) project.currentSessionTag = e.tag || undefined;
  if (e.relocatedCwd) project.currentSessionRelocatedCwd ??= e.relocatedCwd;
  if (e.agentName) project.currentSessionAgentName ??= e.agentName;
  if (e.agentColor) project.currentSessionAgentColor ??= e.agentColor;
  if (e.agentSetting) project.currentSessionAgentSetting = e.agentSetting;
  if (e.mode) project.currentSessionMode = e.mode;
  if (e.permissionMode) project.currentSessionPermissionMode = e.permissionMode;
  if (e.isolationLatch) project.currentSessionIsolationLatch = e.isolationLatch;
  if (e.devModsFolder)
    if (isSessionFileAt(e.devModsFolder, getSessionId()))
      project.currentSessionDevModsFolder = e.devModsFolder;
    else logForDebugging("dev mods: dropped a restored dev-mods folder not this session's");
  if (e.memoryModeStamps) {
    project.currentSessionMemoryModeStamps = e.memoryModeStamps.map((memoryModeStamp) => ({
      ...memoryModeStamp,
      written: memoryModeStamp.written ?? true,
    }));
    let last = e.memoryModeStamps.at(-1);
    resetAgentLatches();
  }
  if (e.atisLatch !== undefined) setConversationAtisLatch(e.atisLatch);
  if (e.toolsUsed !== undefined || e.messages !== undefined)
    restoreConversationToolsUsed(e.toolsUsed, e.messages);
  if (e.worktreeSession !== undefined) project.currentSessionWorktree = e.worktreeSession;
  if (e.artifactCommentMonitor !== undefined)
    project.resumedArtifactCommentMonitor = e.artifactCommentMonitor;
  if (e.artifactAutoReactLedger !== undefined)
    project.resumedArtifactAutoReactLedger = e.artifactAutoReactLedger;
  if (e.prNumber !== undefined) project.currentSessionPrNumber = e.prNumber;
  if (e.prUrl) project.currentSessionPrUrl = e.prUrl;
  if (e.prRepository) project.currentSessionPrRepository = e.prRepository;
  if (e.artifactCount !== undefined) project.currentSessionArtifactCount = e.artifactCount;
  if (e.bridgeSessionId) {
    project.currentSessionBridgeId = e.bridgeSessionId;
    project.currentSessionBridgeSeq = e.bridgeLastSeq;
    project.currentSessionBridgeDialogKinds = e.bridgeDialogKinds?.length ? e.bridgeDialogKinds : undefined;
    project.currentSessionBridgeGroupingId = e.bridgeSessionGroupingId;
    project.currentSessionBridgeNoBackfill = e.bridgeNoHistoryBackfill ? true : undefined;
    project.currentSessionBridgeOwnerAccountUuid = e.bridgeOwnerAccountUuid;
    project.currentSessionBridgeOwnerOrganizationUuid = e.bridgeOwnerOrganizationUuid;
  }
  if (e.sessionHistorySuppressed) {
    let s = n?.taintSid ?? pinSessionId(getSessionId());
    let h = s !== undefined && s === getSessionId();
    let y = h && !project.currentSessionHistorySuppressed;
    if (h) project.currentSessionHistorySuppressed = true;
    markSessionHistorySuppressedFor(s);
    if (y && s !== undefined) {
      let materializedSessionFile = getMaterializedSessionFile();
      if (!(materializedSessionFile !== null && !isOwnTranscriptFile(s, materializedSessionFile))) {
        let L = materializedSessionFile ?? getTranscriptPathForSession(s);
        let storageV5 = n?.storageV5;
        (async () => {
          if (
            (await scanTranscriptForSuppression(
              L,
              {
                sid: s,
              },
              storageV5,
            )) === "clean"
          )
            await writeHistorySuppression(s, L, "meta_seed", undefined, storageV5);
        })().catch((error) => {
          logForDebugging(`restoreSessionMetadata meta_seed failed: ${errorMessage(error)}`);
        });
      }
    }
  }
  if (e.lastPrompt !== undefined) project.currentSessionLastPrompt = e.lastPrompt;
  if (e.leafUuid !== undefined) project.currentSessionLeafUuid = e.leafUuid;
  if (e.leafTs !== undefined) project.currentSessionLeafTs = e.leafTs;
}
//@ chunk-e6aww6q8.js:472098-473538 facade-majority = restoreSessionMetadata (0.453)
function snapshotSessionMetadata() {
  let project = getProject();
  return {
    customTitle: project.currentSessionTitle,
    aiTitle: project.currentSessionAiTitle,
    tag: project.currentSessionTag,
    relocatedCwd: project.currentSessionRelocatedCwd,
    agentName: project.currentSessionAgentName,
    agentColor: project.currentSessionAgentColor,
    agentSetting: project.currentSessionAgentSetting,
    mode: project.currentSessionMode,
    permissionMode: project.currentSessionPermissionMode,
    isolationLatch: project.currentSessionIsolationLatch,
    devModsFolder: project.currentSessionDevModsFolder,
    memoryModeStamps: project.currentSessionMemoryModeStamps.map(({ inFlight, ...s }) => s),
    restoredMemoryPause: getRestoredMemoryPause(),
    atisLatch: getConversationAtisLatch(),
    toolsUsed: getConversationToolsUsed().names(),
    worktreeSession: project.currentSessionWorktree,
    artifactCommentMonitor: project.resumedArtifactCommentMonitor,
    artifactAutoReactLedger: project.resumedArtifactAutoReactLedger,
    prNumber: project.currentSessionPrNumber,
    prUrl: project.currentSessionPrUrl,
    prRepository: project.currentSessionPrRepository,
    artifactCount: project.currentSessionArtifactCount,
    bridgeSessionId: project.currentSessionBridgeId,
    bridgeLastSeq: project.currentSessionBridgeSeq,
    bridgeDialogKinds: project.currentSessionBridgeDialogKinds,
    bridgeSessionGroupingId: project.currentSessionBridgeGroupingId,
    bridgeNoHistoryBackfill: project.currentSessionBridgeNoBackfill,
    bridgeOwnerAccountUuid: project.currentSessionBridgeOwnerAccountUuid,
    bridgeOwnerOrganizationUuid: project.currentSessionBridgeOwnerOrganizationUuid,
    sessionHistorySuppressed: project.currentSessionHistorySuppressed ? true : undefined,
    lastPrompt: project.currentSessionLastPrompt,
    leafUuid: project.currentSessionLeafUuid,
    leafTs: project.currentSessionLeafTs,
  };
}
//@ chunk-e6aww6q8.js:473538-474497 facade-majority = clearSessionMetadata (0.62)
/**
 * 清空 Project 中当前会话的全部元数据字段（/clear、新会话时）。
 */
function clearSessionMetadata() {
  let project = getProject();
  let n = project.currentSessionTitle !== undefined || project.currentSessionAiTitle !== undefined;
  project.currentSessionTitle = undefined;
  project.currentSessionAiTitle = undefined;
  project.currentSessionTag = undefined;
  project.currentSessionRelocatedCwd = undefined;
  project.currentSessionAgentName = undefined;
  project.currentSessionAgentColor = undefined;
  project.currentSessionLastPrompt = undefined;
  project.currentSessionLeafUuid = undefined;
  project.currentSessionLeafTs = undefined;
  project.currentSessionAgentSetting = undefined;
  project.currentSessionMode = undefined;
  project.currentSessionPermissionMode = undefined;
  project.currentSessionIsolationLatch = undefined;
  project.currentSessionDevModsFolder = undefined;
  project.currentSessionMemoryModeStamps = [];
  resetAgentLatches();
  resetAtisLatches();
  setConversationAtisLatch(undefined);
  getConversationToolsUsed().clear();
  project.currentSessionWorktree = undefined;
  project.resumedArtifactCommentMonitor = undefined;
  project.resumedArtifactAutoReactLedger = undefined;
  project.currentSessionPrNumber = undefined;
  project.currentSessionPrUrl = undefined;
  project.currentSessionPrRepository = undefined;
  project.currentSessionArtifactCount = undefined;
  clearBridgeSessionFields(project);
  project.currentSessionHistorySuppressed = undefined;
  if (n) currentTranscriptStore().sessionTitleChanged.emit();
}
//@ chunk-e6aww6q8.js:474497-474548 facade-majority = reAppendSessionMetadata (1)
/**
 * 把当前会话元数据（标题、tag、last-prompt 等）重新追加到转录尾部，使 lite 读取（只读头尾）也能拿到最新元数据。
 */
function reAppendSessionMetadata() {
  getProject().reAppendSessionMetadata(false, true);
}
//@ chunk-e6aww6q8.js:474548-474703 facade-majority
async function reAppendSessionMetadataAfterCompaction(storageV5) {
  try {
    if (isStorageV5Enabled() && storageV5 !== undefined) {
      if (isTranscriptPersistenceDisabled()) return;
      await getProject().reAppendSessionMetadataAsync(false, true, storageV5, true);
      return;
    }
    await flushAppendEntryQueues();
    reAppendSessionMetadata();
  } catch (error) {
    swallowRefusedDirectWrite(error);
  }
}
//@ chunk-e6aww6q8.js:474703-474768 facade-majority
function subscribeSessionAgentNameChanged(e) {
  return currentTranscriptStore().sessionAgentNameChanged.subscribe(e);
}
//@ chunk-e6aww6q8.js:474768-475111 facade-majority = saveAgentName (0.752)
/**
 * 追加 agent-name 记录并更新当前会话代理名。
 */
async function saveAgentName(sessionId, agentName, fullPath, source = "user", storageV5) {
  let resolvedPath = fullPath ?? getTranscriptPathForSession(sessionId);
  try {
    await appendEntryToFileAsync(
      resolvedPath,
      {
        type: "agent-name",
        agentName,
        sessionId,
      },
      storageV5,
    );
  } catch (error) {
    if (isSyscallError(error))
      logForDebugging(
        `saveAgentName: transcript append failed (${getErrnoCode(error)}): ${errorMessage(error)}`,
        {
          level: "error",
        },
      );
    else throw error;
  }
  if (sessionId === getSessionId()) {
    getProject().currentSessionAgentName = agentName;
    currentTranscriptStore().sessionAgentNameChanged.emit();
  }
  logEvent("tengu_agent_name_set", {
    source: fromEnum(source),
  });
}
//@ chunk-e6aww6q8.js:475111-475403 facade-majority = saveAgentColor (0.845)
/**
 * 追加 agent-color 记录，打 tengu_agent_color_set。
 */
async function saveAgentColor(sessionId, agentColor, fullPath, storageV5) {
  let resolvedPath = fullPath ?? getTranscriptPathForSession(sessionId);
  try {
    await appendEntryToFileAsync(
      resolvedPath,
      {
        type: "agent-color",
        agentColor,
        sessionId,
      },
      storageV5,
    );
  } catch (error) {
    if (isSyscallError(error))
      logForDebugging(
        `saveAgentColor: transcript append failed (${getErrnoCode(error)}): ${errorMessage(error)}`,
        {
          level: "error",
        },
      );
    else throw error;
  }
  if (sessionId === getSessionId()) getProject().currentSessionAgentColor = agentColor;
  logEvent("tengu_agent_color_set", {});
}
//@ chunk-e6aww6q8.js:475403-475453 facade-majority = saveAgentSetting (1)
function saveAgentSetting(agentSetting) {
  getProject().currentSessionAgentSetting = agentSetting;
}
//@ chunk-e6aww6q8.js:475453-475514 facade-majority
function subscribeSessionTitleChanged(e) {
  return currentTranscriptStore().sessionTitleChanged.subscribe(e);
}
//@ chunk-e6aww6q8.js:475514-475588 facade-majority = cacheSessionTitle (0.562)
function cacheSessionTitle(customTitle) {
  getProject().currentSessionTitle = customTitle;
  currentTranscriptStore().sessionTitleChanged.emit();
}
//@ chunk-e6aww6q8.js:475588-475665 facade-majority
function cacheAiTitle(currentSessionAiTitle) {
  getProject().currentSessionAiTitle = currentSessionAiTitle;
  currentTranscriptStore().sessionTitleChanged.emit();
}
//@ chunk-e6aww6q8.js:475665-475748 facade-majority
function cacheAgentName(currentSessionAgentName) {
  getProject().currentSessionAgentName = currentSessionAgentName;
  currentTranscriptStore().sessionAgentNameChanged.emit();
}
//@ chunk-e6aww6q8.js:475748-475858 facade-majority
function titleCacheStillOn(id, n, r) {
  let currentSessionTitle = getCurrentSessionTitle(id);
  let h = currentSessionTitle && sanitizeSessionTitle(currentSessionTitle);
  if (!h) return true;
  let y = slugifySessionName(h);
  return y === slugifySessionName(n) || (r !== undefined && y === slugifySessionName(r));
}
//@ chunk-e6aww6q8.js:475858-476066 facade-majority
function cacheHookSessionTitle(e) {
  if (isTeammate()) return false;
  let n = sanitizeSessionTitle(e);
  if (!n) return false;
  let currentSessionTitle = getCurrentSessionTitle(getSessionId());
  let s = currentSessionTitle && sanitizeSessionTitle(currentSessionTitle);
  if (n === s || settledYieldFor(n, s || undefined) !== undefined) return false;
  logForDebugging(`Hook sessionTitle cached (${[...n].length} chars)`);
  cacheSessionTitle(n);
  cacheAgentName(n);
  return true;
}
//@ chunk-e6aww6q8.js:476066-476358 facade-majority
async function applyResumeHookSessionTitle(e, n, storageV5) {
  if (!cacheHookSessionTitle(e) || !currentSessionFileIsFor(n)) return;
  if (isTranscriptPersistenceDisabled()) return;
  let project = getProject();
  try {
    await project.reAppendSessionMetadataAsync(
      true,
      false,
      storageV5,
      isStorageV5Enabled() && storageV5 !== undefined,
    );
  } catch (error) {
    if (isSyscallError(error))
      logForDebugging(`Hook title re-append failed (${getErrnoCode(error)}): ${errorMessage(error)}`, {
        level: "error",
      });
    else logError(error);
    reportTranscriptWriteFailure(
      currentTranscriptStore().writerHealth,
      "adopt",
      error,
      project.sessionFilePath,
    );
  }
}
//@ chunk-e6aww6q8.js:476358-476399 facade-majority = saveMode (1)
/**
 * 记录会话模式（mode 记录）。
 */
function saveMode(mode) {
  getProject().currentSessionMode = mode;
}
//@ chunk-e6aww6q8.js:476399-476451 facade-majority
function savePermissionMode(currentSessionPermissionMode) {
  getProject().currentSessionPermissionMode = currentSessionPermissionMode;
}
//@ chunk-e6aww6q8.js:476451-476468 facade-majority
function saveAutoMemorySessionSwitch(e) {}
//@ chunk-e6aww6q8.js:476468-476578 facade-majority
function queueSessionMetadataEntry(e) {
  let project = getProject();
  if (project.sessionFilePath)
    project.appendEntry(e, undefined, undefined, project.exitReStampSource()).catch(logError);
}
//@ chunk-e6aww6q8.js:476578-476978 facade-majority
function saveIsolationLatch(e, storageV5) {
  let project = getProject();
  if (project.currentSessionIsolationLatch === e) return;
  project.currentSessionIsolationLatch = e;
  if (project.sessionFilePath) {
    let sessionFilePath = project.sessionFilePath;
    appendEntryToFileAsync(
      sessionFilePath,
      {
        type: "isolation-latch",
        side: e,
        sessionId: getSessionId(),
      },
      storageV5,
    ).catch((error) => {
      let errnoCode = getErrnoCode(error);
      if (isSyscallError(error))
        logForDebugging(
          `saveIsolationLatch: failed to append isolation-latch entry to ${sessionFilePath} (${errnoCode}): ${errorMessage(error)}`,
          {
            level: "error",
          },
        );
      else logError(error);
      reportTranscriptWriteFailure(
        currentTranscriptStore().writerHealth,
        "isolation_latch",
        error,
        sessionFilePath,
      );
    });
  }
}
//@ chunk-e6aww6q8.js:476978-477034 facade-majority
function getCurrentSessionIsolationLatch() {
  return getProject().currentSessionIsolationLatch;
}
//@ chunk-e6aww6q8.js:477034-477404 facade-majority
function saveDevModsFolder(e, storageV5) {
  let project = getProject();
  if (project.currentSessionDevModsFolder === e) return;
  project.currentSessionDevModsFolder = e;
  if (project.sessionFilePath) {
    let sessionFilePath = project.sessionFilePath;
    appendEntryToFileAsync(
      sessionFilePath,
      {
        type: "dev-mods",
        folder: e,
        sessionId: getSessionId(),
      },
      storageV5,
    ).catch((error) => {
      if (isSyscallError(error))
        logForDebugging(
          `saveDevModsFolder: failed to append dev-mods entry to ${sessionFilePath} (${getErrnoCode(error)}): ${errorMessage(error)}`,
          {
            level: "error",
          },
        );
      else logError(error);
      reportTranscriptWriteFailure(currentTranscriptStore().writerHealth, "dev_mods", error, sessionFilePath);
    });
  }
}
//@ chunk-e6aww6q8.js:477404-477459 facade-majority
function getCurrentSessionDevModsFolder() {
  return getProject().currentSessionDevModsFolder;
}
//@ chunk-e6aww6q8.js:477459-478175 facade-majority
function saveMemoryMode({ mode, afterUuid, reason, account, accountChoice, timestamp }, storageV5) {
  let project = getProject();
  let L = {
    mode,
    afterUuid,
    timestamp: timestamp ?? new Date().toISOString(),
    ...(reason !== undefined && {
      reason,
    }),
    ...(account !== undefined && {
      account,
    }),
    ...(accountChoice !== undefined && {
      accountChoice,
    }),
    written: false,
  };
  project.currentSessionMemoryModeStamps.push(L);
  if (project.sessionFilePath) {
    let sessionFilePath = project.sessionFilePath;
    appendEntryToFileAsync(
      sessionFilePath,
      {
        type: "memory-mode",
        mode,
        afterUuid,
        timestamp: L.timestamp,
        ...(reason !== undefined && {
          reason,
        }),
        ...(account !== undefined && {
          account,
        }),
        ...(accountChoice !== undefined && {
          accountChoice,
        }),
        sessionId: getSessionId(),
      },
      storageV5,
    )
      .then(() => {
        L.written = true;
      })
      .catch((error) => {
        let errnoCode = getErrnoCode(error);
        if (isSyscallError(error))
          logForDebugging(
            `saveMemoryMode: failed to append memory-mode entry to ${sessionFilePath} (${errnoCode}): ${errorMessage(error)}`,
            {
              level: "error",
            },
          );
        else logError(error);
        reportTranscriptWriteFailure(
          currentTranscriptStore().writerHealth,
          "memory_mode",
          error,
          sessionFilePath,
        );
      });
  }
}
//@ chunk-e6aww6q8.js:478175-478233 facade-majority
function getCurrentSessionMemoryModeStamps() {
  return getProject().currentSessionMemoryModeStamps;
}
//@ chunk-e6aww6q8.js:478233-478273 layout
function resetAgentLatches() {
  if (getRestoredMemoryPause()) {
    setRestoredMemoryPause(false);
    setMemoryToggledOff(false);
  }
}
//@ chunk-e6aww6q8.js:478273-478313 layout
function resetAtisLatches() {
  if (getRestoredAutoMemoryOff()) {
    setRestoredAutoMemoryOff(false);
    setAutoMemoryOffThisSession(false);
  }
}
//@ chunk-e6aww6q8.js:478313-478336 facade-majority
function memoryPauseToggledByPerson() {
  setRestoredMemoryPause(false);
}
//@ chunk-e6aww6q8.js:478336-478402 facade-majority = recordContextCollapseCommit (1)
async function recordArtifactCommentMonitor(entry, storageV5) {
  await getProject().appendEntry(entry, undefined, undefined, storageV5);
}
//@ chunk-e6aww6q8.js:478402-478510 facade-majority
function takeResumedArtifactCommentMonitor() {
  let project = getProject();
  let resumedArtifactCommentMonitor = project.resumedArtifactCommentMonitor;
  project.resumedArtifactCommentMonitor = undefined;
  return resumedArtifactCommentMonitor;
}
//@ chunk-e6aww6q8.js:478510-478620 facade-majority
function takeResumedArtifactAutoReactLedger() {
  let project = getProject();
  let resumedArtifactAutoReactLedger = project.resumedArtifactAutoReactLedger;
  project.resumedArtifactAutoReactLedger = undefined;
  return resumedArtifactAutoReactLedger;
}
//@ chunk-e6aww6q8.js:478620-478678 facade-majority
function peekResumedArtifactAutoReactLedger() {
  return getProject().resumedArtifactAutoReactLedger;
}
//@ chunk-e6aww6q8.js:478678-478689 facade-majority
var UNLATCHED_RESUMED_ATIS = "";
//@ chunk-e6aww6q8.js:478689-478728 layout
function getOrEmptyString(atisLatches, sessionId) {
  return atisLatches.get(sessionId) ?? UNLATCHED_RESUMED_ATIS;
}
//@ chunk-e6aww6q8.js:478728-478752 facade-majority
var worktreeStateSignals = new HostScoped(() => createSignal());
//@ chunk-e6aww6q8.js:478752-479396 facade-majority = saveWorktreeState (0.741)
/**
 * 追加 worktree-state 记录（会话所在 worktree），resume 时据此恢复或退出 worktree。
 */
function saveWorktreeState(worktreeSession, storageV5) {
  let stripped = worktreeSession
    ? {
        originalCwd: worktreeSession.originalCwd,
        preEnterOriginalCwd: worktreeSession.preEnterOriginalCwd,
        worktreePath: worktreeSession.worktreePath,
        worktreeName: worktreeSession.worktreeName,
        worktreeBranch: worktreeSession.worktreeBranch,
        originalBranch: worktreeSession.originalBranch,
        originalHeadCommit: worktreeSession.originalHeadCommit,
        sessionId: worktreeSession.sessionId,
        tmuxSessionName: worktreeSession.tmuxSessionName,
        hookBased: worktreeSession.hookBased,
        enteredExisting: worktreeSession.enteredExisting,
        madeElsewhere: worktreeSession.madeElsewhere,
      }
    : null;
  let project = getProject();
  project.currentSessionWorktree = stripped;
  worktreeStateSignals.of(getRootSession().host).emit(stripped);
  if (project.sessionFilePath) {
    let sessionFilePath = project.sessionFilePath;
    appendEntryToFileAsync(
      sessionFilePath,
      {
        type: "worktree-state",
        worktreeSession: stripped,
        sessionId: getSessionId(),
      },
      storageV5,
    ).catch((error) => {
      logForDebugging(`saveWorktreeState: transcript append failed: ${errorMessage(error)}`);
    });
  }
}
//@ chunk-e6aww6q8.js:479396-479477 facade-majority = getSessionIdFromLog (0)
/**
 * 从日志对象取 sessionId（最后一条消息的 sessionId 或日志自身）。
 */
function getSessionIdFromLog(log) {
  if (log.sessionId) return log.sessionId;
  return log.messages[0]?.sessionId;
}
//@ chunk-e6aww6q8.js:479477-479544 facade-majority
function isLiteLog(log) {
  return log.messages.length === 0 && log.sessionId !== undefined;
}
//@ chunk-e6aww6q8.js:479544-482685 facade-majority = loadFullLog (0.543)
/**
 * 把 lite 日志（只读了头尾元数据）补全为完整日志：读取整份转录并建对话链。
 */
async function loadFullLog(log, n) {
  if (!isLiteLog(log)) return log;
  let sessionFile = log.fullPath;
  if (!sessionFile) return log;
  try {
    let transcriptStorageKey = getTranscriptStorageKey(sessionFile, n?.storageV5);
    let transcriptFile = await loadTranscriptFile(
      sessionFile,
      transcriptStorageKey && {
        storageV5: transcriptStorageKey,
      },
    );
    let {
      messages,
      summaries,
      customTitles,
      endedSessions,
      aiTitles,
      tags,
      relocatedCwds,
      agentNames,
      agentColors,
      agentSettings,
      prNumbers,
      prUrls,
      prRepositories,
      bridgeSessionIds,
      bridgeLastSeqs,
      bridgeDialogKindsBySession,
      bridgeSessionGroupingIds,
      bridgeNoBackfill,
      bridgeOwnerAccountUuids,
      bridgeOwnerOrganizationUuids,
      historySuppressed,
      modes,
      permissionModes,
      isolationLatches,
      devModsFolders,
      memoryModeStamps,
      atisLatches,
      toolsUsedLists,
      worktreeStates,
      artifactCommentMonitors,
      artifactAutoReactLedgers,
      costStates,
      fileHistorySnapshots,
      fileHistoryDeltas,
      attributionSnapshots,
      contentReplacements,
      leafUuids,
      clearedToEmpty,
    } = transcriptFile;
    if (messages.size === 0) return log;
    if (log.sessionId !== undefined) primeSessionMessagesCache(log.sessionId, messages.keys());
    let mostRecentLeaf = findLatestMessage(
      messages.values(),
      (msg) => leafUuids.has(msg.uuid) && (msg.type === "user" || msg.type === "assistant"),
    );
    if (!mostRecentLeaf) {
      if (clearedToEmpty) return buildLiteLogFromMessages(transcriptFile, log, log.sessionId);
      return log;
    }
    let transcript = buildConversationChain(messages, mostRecentLeaf);
    warnIfTranscriptUnchained(messages, transcript, mostRecentLeaf.sessionId);
    let sessionId = mostRecentLeaf.sessionId;
    return {
      ...log,
      rewindAnchorUuid: transcriptFile.rewindAnchorUuid,
      messages: removeExtraFields(transcript),
      firstPromptShown: undefined,
      ...getFirstPromptInfo(transcript),
      messageCount: countVisibleMessages(transcript),
      summary: mostRecentLeaf ? summaries.get(mostRecentLeaf.uuid) : log.summary,
      customTitle: sessionId ? customTitles.get(sessionId) : log.customTitle,
      ...withEndedByModel({}, sessionId ? endedSessions.has(sessionId) : getEndedByModel(log)),
      aiTitle: sessionId ? aiTitles.get(sessionId) : log.aiTitle,
      tag: sessionId ? tags.get(sessionId) : log.tag,
      relocatedCwd: sessionId ? relocatedCwds.get(sessionId) : log.relocatedCwd,
      agentName: sessionId ? agentNames.get(sessionId) : log.agentName,
      agentColor: sessionId ? agentColors.get(sessionId) : log.agentColor,
      agentSetting: sessionId ? agentSettings.get(sessionId) : log.agentSetting,
      mode: sessionId ? modes.get(sessionId) : log.mode,
      permissionMode: sessionId ? permissionModes.get(sessionId) : log.permissionMode,
      isolationLatch: sessionId ? isolationLatches.get(sessionId) : log.isolationLatch,
      devModsFolder: sessionId ? devModsFolders?.get(sessionId) : log.devModsFolder,
      memoryModeStamps: sessionId ? (memoryModeStamps.get(sessionId) ?? []) : log.memoryModeStamps,
      atisLatch: sessionId ? getOrEmptyString(atisLatches, sessionId) : log.atisLatch,
      toolsUsed: sessionId ? toolsUsedLists?.get(sessionId) : log.toolsUsed,
      worktreeSession:
        sessionId && worktreeStates.has(sessionId) ? worktreeStates.get(sessionId) : log.worktreeSession,
      artifactCommentMonitor: sessionId ? artifactCommentMonitors.get(sessionId) : log.artifactCommentMonitor,
      artifactAutoReactLedger: sessionId
        ? artifactAutoReactLedgers.get(sessionId)
        : log.artifactAutoReactLedger,
      costState: sessionId ? costStates.get(sessionId) : log.costState,
      prNumber: sessionId ? prNumbers.get(sessionId) : log.prNumber,
      prUrl: sessionId ? prUrls.get(sessionId) : log.prUrl,
      prRepository: sessionId ? prRepositories.get(sessionId) : log.prRepository,
      bridgeSessionId: sessionId ? bridgeSessionIds.get(sessionId) : log.bridgeSessionId,
      bridgeLastSeq: sessionId ? bridgeLastSeqs.get(sessionId) : log.bridgeLastSeq,
      bridgeDialogKinds: sessionId ? bridgeDialogKindsBySession.get(sessionId) : log.bridgeDialogKinds,
      bridgeSessionGroupingId: sessionId
        ? bridgeSessionGroupingIds.get(sessionId)
        : log.bridgeSessionGroupingId,
      bridgeNoHistoryBackfill: sessionId ? bridgeNoBackfill.get(sessionId) : log.bridgeNoHistoryBackfill,
      bridgeOwnerAccountUuid: sessionId ? bridgeOwnerAccountUuids.get(sessionId) : log.bridgeOwnerAccountUuid,
      bridgeOwnerOrganizationUuid: sessionId
        ? bridgeOwnerOrganizationUuids.get(sessionId)
        : log.bridgeOwnerOrganizationUuid,
      sessionHistorySuppressed: sessionId
        ? historySuppressed.has(sessionId)
          ? true
          : undefined
        : log.sessionHistorySuppressed,
      gitBranch: mostRecentLeaf?.gitBranch ?? log.gitBranch,
      isSidechain: transcript[0]?.isSidechain ?? log.isSidechain,
      teamName: transcript[0]?.teamName ?? log.teamName,
      sessionKind: transcript[0]?.sessionKind ?? log.sessionKind,
      leafUuid: mostRecentLeaf?.uuid ?? log.leafUuid,
      fileHistorySnapshots: buildFileHistorySnapshots(fileHistorySnapshots, fileHistoryDeltas, transcript),
      attributionSnapshots: buildAttributionSnapshotChain(attributionSnapshots, transcript),
      contentReplacements: sessionId ? (contentReplacements.get(sessionId) ?? []) : log.contentReplacements,
      fileSnapshots: getFileSnapshotMessages(messages),
    };
  } catch (error) {
    if (isTranscriptLoadError(error)) {
      logForDebugging(`loadFullLog: transcript unreadable (${getErrnoCode(error)}): ${errorMessage(error)}`, {
        level: "error",
      });
      n?.onTranscriptUnreadable?.(sanitizedErrnoLowerForTelemetry(error));
    } else logError(error);
    return log;
  }
}
//@ chunk-e6aww6q8.js:482685-483199 facade-majority = searchSessionsByCustomTitle (0.913)
/**
 * 按自定义标题搜索会话（--resume <标题>）。
 */
async function searchSessionsByCustomTitle(query, options, storageV5) {
  let { limit, exact } = options || {};
  let worktreePaths = await getWorktreePaths(getOriginalCwd());
  let allStatLogs = await getStatOnlyLogsForWorktrees(worktreePaths, undefined, storageV5);
  let { logs } = await enrichLogs(allStatLogs, 0, allStatLogs.length, storageV5);
  let normalizedQuery = query.toLowerCase().trim();
  let matchingLogs = logs.filter((log) => {
    let title = (log.customTitle ?? log.aiTitle)?.toLowerCase().trim();
    if (!title) return false;
    return exact ? title === normalizedQuery : title.includes(normalizedQuery);
  });
  let sessionIdToLog = new Map();
  for (let log of matchingLogs) {
    let sessionId = getSessionIdFromLog(log);
    if (sessionId) {
      let existing = sessionIdToLog.get(sessionId);
      if (!existing || log.modified > existing.modified) sessionIdToLog.set(sessionId, log);
    }
  }
  let deduplicated = Array.from(sessionIdToLog.values());
  deduplicated.sort((Se, ke) => ke.modified.getTime() - Se.modified.getTime());
  if (limit) return deduplicated.slice(0, limit);
  return deduplicated;
}
//@ chunk-e6aww6q8.js:483199-483503 layout = hasPrefix (1)
function hasPrefix_2(src, prefix, at, end) {
  let L = end[0];
  let G = end.length;
  let q = 0;
  let Z = false;
  let Se = false;
  for (let ke = prefix; ke < at; ke++) {
    let we = src[ke];
    if (Se) {
      Se = false;
      continue;
    }
    if (Z) {
      if (we === 92) Se = true;
      else if (we === 34) Z = false;
      continue;
    }
    if (q === 1 && we === L && ke + G <= at && src.compare(end, 0, G, ke, ke + G) === 0) return ke;
    if (we === 34) Z = true;
    else if (we === 123) q++;
    else if (we === 125) q--;
  }
  return -1;
}
//@ chunk-e6aww6q8.js:483503-483764 file-local
function pickDepthOneUuidCandidate(buf, lineStart, candidates) {
  let w = 0;
  let inString = false;
  let escapeNext = false;
  let q = 0;
  for (let i = lineStart; q < candidates.length; i++) {
    if (i === candidates[q]) {
      if (w === 1 && !inString) return candidates[q];
      q++;
    }
    let Se = buf[i];
    if (escapeNext) escapeNext = false;
    else if (inString) {
      if (Se === 92) escapeNext = true;
      else if (Se === 34) inString = false;
    } else if (Se === 34) inString = true;
    else if (Se === 123) w++;
    else if (Se === 125) w--;
  }
  return candidates.at(-1);
}
//@ chunk-e6aww6q8.js:483764-485959 fingerprint = walkChainBeforeParse (0.912)
/**
 * 不解析 JSON，直接在字节缓冲中按 "parentUuid"/"uuid" 前缀走链，快速定位主链所需行。
 */
function walkChainBeforeParse(buf) {
  let PARENT_PREFIX = Buffer.from('{"parentUuid":');
  let UUID_KEY = Buffer.from('"uuid":"');
  let SIDECHAIN_TRUE = Buffer.from('"isSidechain":true');
  let UUID_LEN = 36;
  let TS_SUFFIX = Buffer.from('","timestamp":"');
  let TS_SUFFIX_LEN = TS_SUFFIX.length;
  let PREFIX_LEN = PARENT_PREFIX.length;
  let KEY_LEN = UUID_KEY.length;
  let msgIdx = [];
  let metaRanges = [];
  let uuidToSlot = new Map();
  let pos = 0;
  let len = buf.length;
  while (pos < len) {
    let nl = buf.indexOf(10, pos);
    let lineEnd = nl === -1 ? len : nl + 1;
    if (
      lineEnd - pos > PREFIX_LEN &&
      buf[pos] === 123 &&
      buf.compare(PARENT_PREFIX, 0, PREFIX_LEN, pos, pos + PREFIX_LEN) === 0
    ) {
      let parentStart = buf[pos + PREFIX_LEN] === 34 ? pos + PREFIX_LEN + 1 : -1;
      let firstAny = -1;
      let suffix0 = -1;
      let suffixN;
      let from = pos;
      for (;;) {
        let next = buf.indexOf(UUID_KEY, from);
        if (next < 0 || next >= lineEnd) break;
        if (firstAny < 0) firstAny = next;
        let after = next + KEY_LEN + 36;
        if (
          after + TS_SUFFIX_LEN <= lineEnd &&
          buf.compare(TS_SUFFIX, 0, TS_SUFFIX_LEN, after, after + TS_SUFFIX_LEN) === 0
        )
          if (suffix0 < 0) suffix0 = next;
          else (suffixN ??= [suffix0]).push(next);
        from = next + KEY_LEN;
      }
      let ho = suffixN ? pickDepthOneUuidCandidate(buf, pos, suffixN) : suffix0 >= 0 ? suffix0 : firstAny;
      if (ho >= 0) {
        let uuidStart = ho + KEY_LEN;
        let uuid = buf.toString("latin1", uuidStart, uuidStart + 36);
        uuidToSlot.set(uuid, msgIdx.length);
        msgIdx.push(pos, lineEnd, parentStart);
      } else metaRanges.push(pos, lineEnd);
    } else metaRanges.push(pos, lineEnd);
    pos = lineEnd;
  }
  let leafSlot = -1;
  for (let i = msgIdx.length - 3; i >= 0; i -= 3) {
    let sc = buf.indexOf(SIDECHAIN_TRUE, msgIdx[i]);
    if (sc === -1 || sc >= msgIdx[i + 1]) {
      leafSlot = i;
      break;
    }
  }
  if (leafSlot < 0) return buf;
  function Me(Yt) {
    let qt = msgIdx[Yt + 2];
    return qt < 0 ? undefined : uuidToSlot.get(buf.toString("latin1", qt, qt + 36));
  }
  let seen = new Set();
  let ze = 0;
  let slot = leafSlot;
  while (slot !== undefined) {
    if (seen.has(slot)) break;
    seen.add(slot);
    ze += msgIdx[slot + 1] - msgIdx[slot];
    slot = Me(slot);
  }
  if (len - ze < len >> 1) return buf;
  let chain = new Map();
  let nt = new Map();
  function pt(Yt) {
    try {
      let qt = jsonParseRaw(buf.toString("utf8", msgIdx[Yt], msgIdx[Yt + 1]));
      return isPlainObject_3(qt) ? qt : null;
    } catch {
      return null;
    }
  }
  function Et(Yt) {
    if (Yt !== null && isAssistantTranscriptEntry(Yt))
      return {
        kind: "assistant",
        id: getAssistantMessageId(Yt, null),
      };
    if (Yt !== null && isProgressOrHiddenEntry(Yt))
      return {
        kind: "runLink",
        id: null,
      };
    return {
      kind: "other",
      id: null,
    };
  }
  function yt(Yt) {
    let qt = chain.get(Yt);
    if (qt === undefined) {
      qt = Et(pt(Yt));
      chain.set(Yt, qt);
    }
    return qt;
  }
  function gt(start) {
    let qt = new Set();
    let Zt = null;
    let rn = start;
    while (rn !== undefined && !qt.has(rn)) {
      let pn = nt.get(rn);
      if (pn !== undefined) {
        Zt = pn;
        break;
      }
      qt.add(rn);
      let no = yt(rn);
      if (no.kind === "assistant") {
        Zt = no.id;
        break;
      }
      rn = Me(rn);
    }
    for (let pn of qt) nt.set(pn, Zt);
    return Zt;
  }
  let parts = [];
  let m = 0;
  for (let i = 0; i < msgIdx.length; i += 3) {
    let start = msgIdx[i];
    while (m < metaRanges.length && metaRanges[m] < start) {
      parts.push(buf.subarray(metaRanges[m], metaRanges[m + 1]));
      m += 2;
    }
    if (!seen.has(i)) {
      let start = Me(i);
      if (start === undefined || !seen.has(start)) continue;
      let rn = pt(i);
      if (rn === null || hasMalformedMessage(rn)) continue;
      let pn = Et(rn);
      chain.set(i, pn);
      if (isChainLinkCandidate(rn, pn.kind === "assistant" ? gt(start) : null)) seen.add(i);
      else if (yt(start).kind !== "runLink") continue;
    }
    parts.push(buf.subarray(start, msgIdx[i + 1]));
  }
  while (m < metaRanges.length) {
    parts.push(buf.subarray(metaRanges[m], metaRanges[m + 1]));
    m += 2;
  }
  return Buffer.concat(parts);
}
//@ chunk-e6aww6q8.js:485959-486712 layout
function createFileChunkReader(e, n) {
  let h = Buffer.allocUnsafe(1048576);
  let y = openSync(e, "r");
  function S(q, Z, Se) {
    let ke = 0;
    while (ke < Z) {
      let we = readSync(y, q, ke, Z - ke, Se + ke);
      if (we === 0) break;
      ke += we;
    }
    return ke;
  }
  let w = Buffer.allocUnsafe(65536);
  function L(q) {
    let Z = -1;
    let Se = 0;
    while (Se < n) {
      let ke = readSync(y, h, 0, Math.min(1048576, n - Se), Se);
      if (ke === 0) break;
      let we = 0;
      while (we < ke) {
        let index = h.indexOf(10, we);
        if (index < 0 || index >= ke) break;
        if (Z >= 0) {
          let Ae = Se + index - Z;
          if (Ae > w.length) w = Buffer.allocUnsafe(Ae);
          S(w, Ae, Z);
          q(w, 0, Ae, Z);
          Z = -1;
        } else if (index > we) q(h, we, index - we, Se + we);
        we = index + 1;
      }
      if (we < ke && Z < 0) Z = Se + we;
      Se += ke;
    }
    if (Z >= 0) {
      let ke = n - Z;
      if (ke > w.length) w = Buffer.allocUnsafe(ke);
      S(w, ke, Z);
      q(w, 0, ke, Z);
    }
  }
  function G(q, Z) {
    if (Z > w.length) w = Buffer.allocUnsafe(Math.max(Z, w.length * 2));
    return w.subarray(0, S(w, Z, q));
  }
  return {
    scan: L,
    read: G,
    close: () => closeSync(y),
  };
}
//@ chunk-e6aww6q8.js:486712-486884 layout
function createBufferLineScanner(e) {
  return {
    scan(n) {
      let r = 0;
      while (r < e.length) {
        let index = e.indexOf(10, r);
        if (index < 0) index = e.length;
        if (index > r) n(e, r, index - r, r);
        r = index + 1;
      }
    },
    read(n, r) {
      return e.subarray(n, n + r);
    },
    close() {},
  };
}
//@ chunk-e6aww6q8.js:486884-487075 layout
function reportUnparsableLines(e) {
  if (e <= 0) return;
  logForDebugging(
    `transcript load: skipped ${e} line(s) that did not parse as JSON (e.g. a torn or corrupt write)`,
  );
  logFeatureSad("transcript_unparsable_lines", "lines_skipped", {
    lines: e,
  });
}
//@ chunk-e6aww6q8.js:487075-487102 layout
var WHITESPACE_BYTES = new Set([32, 9, 13]);
//@ chunk-e6aww6q8.js:487102-487279 layout
function countJsonlLines(e) {
  let jsonl = parseJSONL(e);
  let r = 0;
  for (let s = 0; s < e.length;) {
    let index = e.indexOf(10, s);
    let y = index === -1 ? e.length : index;
    if (e.subarray(s, y).some((S) => !WHITESPACE_BYTES.has(S))) r++;
    s = y + 1;
  }
  reportUnparsableLines(r - jsonl.length);
  return jsonl;
}
//@ chunk-e6aww6q8.js:487279-497626 layout
function scanTranscriptBuffer(e, n, r, s) {
  let buffer = Buffer.from('{"type":"attribution-snapshot"');
  let buffer_2 = Buffer.from('{"parentUuid":');
  let buffer_3 = Buffer.from('"parentUuid":');
  let buffer_4 = Buffer.from('"uuid":"');
  let buffer_5 = Buffer.from('","timestamp":"');
  let buffer_6 = Buffer.from('"isSidechain":true');
  let buffer_7 = Buffer.from('"compact_boundary"');
  let buffer_8 = Buffer.from('"compactMetadata":');
  let buffer_9 = Buffer.from('"type":"last-prompt"');
  let buffer_10 = Buffer.from('{"type":"last-prompt"');
  let buffer_11 = Buffer.from('"leafUuid":');
  let buffer_12 = Buffer.from("\\ud");
  let buffer_13 = Buffer.from("\\uD");
  let buffer_14 = Buffer.from("null");
  let We = 36;
  let ze = buffer_2.length;
  let lt = buffer_4.length;
  let Je = buffer_5.length;
  let nt = buffer_14.length;
  let pt = "parentUuid is neither a string nor null";
  let Et = [];
  let yt = [];
  let gt = [];
  let At = [];
  let It = new Map();
  let Yt = [];
  let qt = [];
  let Zt = [];
  let rn = [];
  let pn = [];
  let no = -1;
  let hn = -1;
  let ho = false;
  let yn = 1 / 0;
  let Kn = [];
  let lazyBackscannedLines = 0;
  let lazyBackfilledAll = false;
  let To = -1;
  let bo = new Set();
  let vn = false;
  let co;
  let So;
  let ko;
  let un = false;
  let ao = -1;
  let $o = 0;
  let yo = [];
  let Ho = {
    offset: -1,
    length: 0,
  };
  let rr;
  let br = INDEX_HEAD_SCAN_BYTES;
  let Hr = INDEX_BOUNDARY_SCAN_BYTES;
  let Fr = INDEX_LAST_PROMPT_SCAN_BYTES;
  function cs(buf, Nr) {
    let Is = -1;
    let fs = -1;
    let candidates;
    let Vi = 0;
    for (;;) {
      let index = buf.indexOf(buffer_4, Vi);
      if (index < 0) break;
      if (Is < 0) Is = index;
      let Wi = index + lt + 36;
      if (Wi + Je <= Nr && buf.compare(buffer_5, 0, Je, Wi, Wi + Je) === 0)
        if (fs < 0) fs = index;
        else (candidates ??= [fs]).push(index);
      Vi = index + lt;
    }
    return candidates ? pickDepthOneUuidCandidate(buf, 0, candidates) : fs >= 0 ? fs : Is;
  }
  function _r(Es, Nr, Is, fs) {
    let src = Es.subarray(Nr, Nr + Is);
    Ho.offset = fs;
    Ho.length = Is;
    if (Is >= buffer.length && src.compare(buffer, 0, buffer.length, 0, buffer.length) === 0) {
      ao = fs;
      $o = Is;
      return;
    }
    if (hasPrefix(src, 0, Is)) {
      yo.push({
        offset: fs,
        length: Is,
      });
      return;
    }
    if (
      Is < Fr &&
      Is > buffer_10.length &&
      src.compare(buffer_10, 0, buffer_10.length, 0, buffer_10.length) === 0
    ) {
      Zt.push(fs);
      rn.push(Is);
      pn.push(src.includes(buffer_11));
      return;
    }
    if (Is < Fr && src.subarray(0, Math.min(Is, LAST_PROMPT_PREFIX_SCAN_BYTES)).includes(buffer_9)) {
      let ii;
      try {
        ii = jsonParse(src.toString("utf8", 0, Is));
      } catch {
        return;
      }
      if (ii?.type === "last-prompt") {
        if (ii.leafUuid) {
          rr = ii.leafUuid;
          To = fs;
        }
        Yt.push(fs);
        qt.push(Is);
        return;
      }
    }
    let Vi = skipNuls(src, 0, Is);
    let chunk = src.subarray(Vi, Math.min(Is, Vi + Hr));
    if (chunk.includes(buffer_7) || (chunk.includes(buffer_8) && src.includes(buffer_7, Vi))) {
      let ii;
      try {
        ii = jsonParse(src.toString("utf8", Vi, Is));
      } catch {
        ii = null;
      }
      if (ii?.type === "system" && ii.subtype === "compact_boundary") {
        hn = fs;
        let preservedMessages = ii.compactMetadata?.preservedMessages;
        if (preservedMessages || ii.compactMetadata?.preservedSegment) {
          vn = true;
          if (
            preservedMessages &&
            typeof preservedMessages.anchorUuid === "string" &&
            Array.isArray(preservedMessages.uuids) &&
            preservedMessages.uuids.length > 0 &&
            preservedMessages.uuids.every((uuid) => typeof uuid === "string")
          ) {
            co = preservedMessages.uuids;
            So = preservedMessages.anchorUuid;
            ko = fs;
            if (!ho) {
              ho = true;
              yn = Math.min(yn, Et.length + 1);
            }
          } else {
            co = undefined;
            So = undefined;
            ko = undefined;
          }
        } else {
          bo.add(fs);
          Et.length = 0;
          yt.length = 0;
          gt.length = 0;
          At.length = 0;
          Kn.length = 0;
          It.clear();
          vn = false;
          co = undefined;
          So = undefined;
          ko = undefined;
          un = false;
          ao = -1;
          $o = 0;
          rr = undefined;
          To = -1;
          no = fs;
          if (!ho) ho = true;
          yn = 1;
        }
      }
    }
    let Wi;
    if (Is > ze && src.compare(buffer_2, 0, ze, 0, ze) === 0) {
      Wi = ze;
      if (ho && Et.length >= yn) {
        Et.push(fs);
        yt.push(Is);
        gt.push(null);
        At.push(false);
        Kn.push(true);
        return;
      }
    } else {
      Wi = hasPrefix_2(src, 0, Is, buffer_3);
      if (Wi < 0) {
        Yt.push(fs);
        qt.push(Is);
        return;
      }
      Wi += buffer_3.length;
    }
    Cr(src, Is, fs, Wi, Et.length);
  }
  function Cr(Es, Nr, Is, fs, as) {
    let Vi =
      Es[fs] === 34
        ? Es.toString("latin1", fs + 1, fs + 1 + 36)
        : fs + nt <= Nr && Es.compare(buffer_14, 0, nt, fs, fs + nt) === 0
          ? null
          : "parentUuid is neither a string nor null";
    let ji = cs(Es, Nr);
    if (ji < 0) {
      Yt.push(Is);
      qt.push(Nr);
      if (as < Et.length) {
        yt[as] = -1;
        Kn[as] = false;
      }
      return;
    }
    let str = Es.toString("latin1", ji + lt, ji + lt + 36);
    let included = (Nr <= br ? Es : Es.subarray(0, br)).includes(buffer_6);
    if (It.has(str)) un = true;
    if (as === Et.length) {
      It.set(str, as);
      Et.push(Is);
      yt.push(Nr);
      gt.push(Vi);
      At.push(included);
      Kn.push(false);
    } else {
      Kn[as] = false;
      let hr = It.get(str);
      if (hr === undefined || hr < as) It.set(str, as);
      gt[as] = Vi;
      At[as] = included;
    }
  }
  function Vr(Es, Nr) {
    let max = Math.max(Es, 0);
    while (max < Nr) {
      if (!Kn[max]) {
        max++;
        continue;
      }
      let as = Et[max];
      let Vi = as + yt[max];
      let ji = max + 1;
      while (ji < Nr && Kn[ji] && Et[ji] === Vi + 1 && Et[ji] + yt[ji] - as <= 1048576) {
        Vi = Et[ji] + yt[ji];
        ji++;
      }
      let Wi = e.read(as, Vi - as);
      for (let ii = max; ii < ji; ii++) {
        let wa = Et[ii] - as;
        if (wa + yt[ii] > Wi.length) {
          yt[ii] = -1;
          Kn[ii] = false;
          continue;
        }
        let chunk = Wi.subarray(wa, wa + yt[ii]);
        Cr(chunk, yt[ii], Et[ii], ze, ii);
      }
      max = ji;
    }
  }
  let startTime = performance.now();
  let scanMs = 0;
  let Or = false;
  let Io;
  try {
    let Di = function (ga) {
      while (Ja < Et.length && Et[Ja] < ga) Ja++;
      return Ja < Et.length && Et[Ja] === ga && yt[Ja] >= 0 ? Ja : -1;
    };
    let yr = function (ga) {
      let Hl = _i[ga];
      return Hl < 0 ? undefined : Hl;
    };
    let Kr = function (ga, Hl, hd) {
      Ti[ga] = Hl;
      if (hd) Vs[ga] = 1;
      for (let Sd = jo[ga]; Sd !== -1; Sd = Qr[Sd]) {
        if (Sd < ga || yt[Sd] < 0 || as.has(Et[Sd])) continue;
        let Ld = fi.length;
        while (Ld > Ri && fi[Ld - 1] > Sd) Ld--;
        fi.splice(Ld, 0, Sd);
      }
    };
    e.scan(_r);
    scanMs = performance.now() - startTime;
    if (ho && yn < Et.length && !s) {
      let ga = 0;
      if (vn && co && ko !== undefined) {
        let Hl = 0;
        let hd = Et.length - 1;
        let Sd = -1;
        while (Hl <= hd) {
          let Ld = (Hl + hd) >> 1;
          let vs = Et[Ld];
          if (vs === ko) {
            Sd = Ld;
            break;
          }
          if (vs < ko) Hl = Ld + 1;
          else hd = Ld - 1;
        }
        ga = Sd < 0 ? 0 : Sd;
        Vr(Math.max(ga, yn), Et.length);
        if (Sd >= 0) {
          let vs = Math.min(Sd, Et.length) - 1;
          let ol = 0;
          let gd = () => co.some((Eu) => !It.has(Eu)) || !It.has(So);
          while (vs >= yn && ol < 2048 && gd()) {
            let max = Math.max(yn, vs - 63);
            Vr(max, vs + 1);
            ol += vs + 1 - max;
            vs = max - 1;
          }
          lazyBackscannedLines = ol;
          let Su = gd();
          if (!Su) {
            let Eu = new Set();
            for (let Kc of co) {
              let _s = It.get(Kc);
              if (_s !== undefined) Eu.add(_s);
            }
            let Uc = new Set();
            for (let Kc = Sd; Kc < Et.length && !Su; Kc++) {
              if (yt[Kc] < 0) continue;
              let _s = gt[Kc];
              while (_s != null) {
                let Qm = It.get(_s);
                if (Qm === undefined) {
                  Su = vs >= yn;
                  break;
                }
                if (Qm >= Sd || Eu.has(Qm) || Uc.has(Qm)) break;
                Uc.add(Qm);
                _s = gt[Qm];
              }
            }
          }
          if (Su && vs >= yn) {
            lazyBackfilledAll = true;
            Vr(yn, vs + 1);
          }
        }
      } else if (!vn) Vr(yn, Et.length);
    }
    let Es = bunJSONLParse();
    let Nr = Es && Es(Buffer.from('{"a":1}')).values.length === 1 ? Es : undefined;
    let Is = (ga) => ga.length >= 3 && ga[0] === 239 && ga[1] === 187 && ga[2] === 191;
    let fs = (ga) => {
      if (Nr) {
        if (Is(ga)) throw SyntaxError("byte-order mark before the JSON value");
        let Hl = Nr(ga);
        if (Hl.values.length < 1) throw SyntaxError("no JSON value on line");
        return Hl.values[0];
      }
      return jsonParse(ga.toString("utf8"));
    };
    for (let idx = Zt.length - 1; idx >= 0; idx--) {
      let Hl = Zt[idx];
      if (Hl < no || Hl < To) break;
      let hd = e.read(Hl, rn[idx]);
      let Sd;
      try {
        Sd = fs(hd);
      } catch {
        continue;
      }
      if (Sd?.leafUuid) {
        rr = Sd.leafUuid;
        break;
      }
    }
    let as = null;
    let Vi = null;
    let ji;
    let Wi;
    if (vn && co && ko !== undefined) {
      let ga = 0;
      let Hl = Et.length - 1;
      while (ga <= Hl) {
        let hd = (ga + Hl) >> 1;
        let Sd = Et[hd];
        if (Sd === ko) {
          ji = hd;
          break;
        }
        if (Sd < ko) ga = hd + 1;
        else Hl = hd - 1;
      }
      if (ji !== undefined) {
        Wi = [];
        for (let hd of co) {
          let Sd = It.get(hd);
          if (Sd === undefined) {
            Wi = undefined;
            break;
          }
          Wi.push(Sd);
        }
      }
    }
    let ii = ji !== undefined && !Wi;
    let wa = false;
    if (Wi && ji !== undefined && So) {
      let ga = It.get(So);
      if (ga !== undefined && ga < ji && !Wi.includes(ga)) {
        wa = true;
        Wi = undefined;
      }
    }
    if (un) Wi = undefined;
    if (!s && vn && !Wi) {
      Or = true;
      logEvent("tengu_transcript_preserved_dispatch", {
        mode: lit_2("fallback_all"),
        indexed_slots: Et.length,
        reason: !co
          ? lit_2("no_list")
          : ji === undefined
            ? lit_2("boundary_unindexed")
            : ii
              ? lit_2("uuid_missing")
              : wa
                ? lit_2("anchor_before_boundary")
                : lit_2("duplicate_uuid"),
      });
    }
    if (!s && vn && Wi && ji !== undefined) {
      as = new Set();
      Vi = [];
      let ga = new Set();
      let Hl = (Ld) => {
        ga.add(Ld);
        if (yt[Ld] < 0) return;
        as.add(Et[Ld]);
        Vi.push([Et[Ld], yt[Ld]]);
      };
      let hd = new Set(Wi);
      if (Et.length > 0 && bo.has(Et[0])) Hl(0);
      for (let Ld of Wi) if (!ga.has(Ld)) Hl(Ld);
      let Sd = 0;
      for (let Ld = ji; Ld < Et.length; Ld++) {
        if (!ga.has(Ld)) Hl(Ld);
        let vs = gt[Ld];
        let ol = vs == null ? undefined : It.get(vs);
        while (ol !== undefined && ol < ji && !hd.has(ol) && !ga.has(ol)) {
          Hl(ol);
          Sd++;
          let gd = gt[ol];
          ol = gd == null ? undefined : It.get(gd);
        }
      }
      logEvent("tengu_transcript_preserved_dispatch", {
        mode: lit_2("list"),
        indexed_slots: Et.length,
        dispatched_slots: ga.size,
        preserved: Wi.length,
        straggler_ancestors: Sd,
        lazy_unindexed_slots: ho ? count(Kn, (Ld) => Ld) : 0,
        lazy_backscanned_lines: lazyBackscannedLines,
        lazy_backfilled_all: lazyBackfilledAll,
      });
    }
    let hr = -1;
    if (!s && !vn) {
      for (let idx = Et.length - 1; idx >= 0; idx--)
        if (!At[idx] && yt[idx] >= 0) {
          hr = idx;
          break;
        }
    }
    if (hr >= 0) {
      as = new Set();
      Vi = [];
      let ga = new Set();
      let Hl;
      let hd = (Ld) => {
        let vs = Ld;
        let ol = new Set();
        while (vs !== undefined && !ga.has(vs)) {
          ga.add(vs);
          ol.add(vs);
          as.add(Et[vs]);
          Vi.push([Et[vs], yt[vs]]);
          let gd = gt[vs];
          if (gd == null) {
            vs = undefined;
            break;
          }
          if (gd === "parentUuid is neither a string nor null") {
            Hl ??= "non_string_parent";
            break;
          }
          let Su = It.get(gd);
          if (Su === undefined || ol.has(Su)) {
            Hl ??= Su === undefined ? "unknown_parent" : "parent_cycle";
            break;
          }
          vs = Su;
        }
      };
      hd(hr);
      let Sd = rr ? It.get(rr) : undefined;
      hd(Sd);
      if (Hl !== undefined) {
        let Ld = Hl;
        logEvent("tengu_transcript_phantom_parent", {
          total_offsets: Et.length,
          walked_slots: as.size,
          reason: fromEnum(Ld),
        });
        as = null;
        Vi = null;
      }
    }
    let mi = 1048576;
    let Ha = Vi ?? [];
    if (!Vi) {
      for (let idx = 0; idx < Et.length; idx++) if (yt[idx] >= 0) Ha.push([Et[idx], yt[idx]]);
    }
    for (let idx = 0; idx < Yt.length; idx++) Ha.push([Yt[idx], qt[idx]]);
    let $a = -1;
    if (Et.length > 0 && bo.has(Et[0]) && !At[0]) $a = Et[0];
    if (ji !== undefined && Wi && !s && !At[ji] && Et[ji] > $a) $a = Et[ji];
    for (let idx = 0; idx < Zt.length; idx++) if (Zt[idx] >= $a) Ha.push([Zt[idx], rn[idx]]);
    for (let idx = Zt.length - 1; idx >= 0; idx--) {
      let Hl = Zt[idx];
      if (Hl >= $a || !pn[idx]) continue;
      let hd = e.read(Hl, rn[idx]);
      let Sd;
      try {
        Sd = fs(hd);
      } catch {
        continue;
      }
      if (Sd?.leafUuid === undefined) continue;
      Ha.push([Hl, rn[idx]]);
      break;
    }
    Ha.sort((ga, Hl) => ga[0] - Hl[0]);
    let nr = as !== null;
    let Ti = [];
    let Vs = nr ? new Uint8Array(Et.length) : undefined;
    let _i = nr ? new Int32Array(Et.length).fill(-1) : undefined;
    let jo = nr ? new Int32Array(Et.length).fill(-1) : undefined;
    let Qr = nr ? new Int32Array(Et.length).fill(-1) : undefined;
    if (_i && jo && Qr)
      for (let idx = Et.length - 1; idx >= 0; idx--) {
        let Hl = gt[idx];
        let hd = Hl == null ? undefined : It.get(Hl);
        if (hd === undefined) continue;
        _i[idx] = hd;
        if (hd === idx) continue;
        Qr[idx] = jo[hd];
        jo[hd] = idx;
      }
    let fi = [];
    let Ri = 0;
    let Ja = 0;
    using Li = slowLogging`transcript load pass2 (${Ha.length} lines to parse)`;
    let Qs = (ga) => ga.includes(buffer_12) || ga.includes(buffer_13);
    let Hi = (ga, Hl, hd) => {
      if (nr) {
        let Sd = Di(hd);
        if (Sd >= 0) {
          let Ld = yr(Sd);
          let vs = Ld === undefined ? null : (Ti[Ld] ?? null);
          let ol = as.has(hd);
          if (!ga) {
            if (ol) Kr(Sd, vs, false);
            return;
          }
          if (!ol) {
            if (hasMalformedMessage(ga)) return;
            if (!isChainLinkCandidate(ga, vs)) {
              if (Ld !== undefined && Vs[Ld]) n(ga, Qs(Hl));
              return;
            }
          }
          Kr(Sd, getAssistantMessageId(ga, vs), isProgressOrHiddenEntry(ga));
        }
      }
      if (ga) n(ga, Qs(Hl));
    };
    let Xa = 0;
    let ta = (ga, Hl, hd, Sd) => {
      if (bo.has(Sd)) r();
      let Ld = Hl;
      let vs = Hl + hd;
      while (Ld < vs && ga[Ld] === 0) Ld++;
      if (Ld === vs) return;
      let chunk = ga.subarray(Ld, vs);
      let gd;
      if (Nr) {
        let Su;
        try {
          Su = Nr(chunk);
        } catch {
          Xa++;
          Hi(null, chunk, Sd);
          return;
        }
        if (Su.values.length < 1 || Is(chunk)) {
          Xa++;
          Hi(null, chunk, Sd);
          return;
        }
        gd = Su.values[0];
      } else
        try {
          gd = jsonParseRaw(ga.toString("utf8", Ld, vs));
        } catch {
          Xa++;
          Hi(null, chunk, Sd);
          return;
        }
      Hi(gd, chunk, Sd);
    };
    let Bs = 0;
    let Ca = () => {
      let ga = Bs < Ha.length ? Ha[Bs] : undefined;
      if (Ri < fi.length) {
        let Hl = fi[Ri];
        if (ga === undefined || Et[Hl] < ga[0]) return [Et[Hl], yt[Hl]];
      }
      return ga;
    };
    let tu = () => {
      if (Ri < fi.length && (Bs >= Ha.length || Et[fi[Ri]] < Ha[Bs][0])) Ri++;
      else Bs++;
    };
    let pd = [];
    for (let ga = Ca(); ga !== undefined; ga = Ca()) {
      pd.length = 0;
      pd.push(ga);
      tu();
      let Hl = ga[0];
      let hd = Hl + ga[1];
      for (let vs = Ca(); vs !== undefined && vs[0] === hd + 1 && vs[0] + vs[1] - Hl <= mi; vs = Ca()) {
        pd.push(vs);
        tu();
        hd = vs[0] + vs[1];
      }
      let Sd = e.read(Hl, hd - Hl);
      let Ld;
      if (Nr && pd.length > 1) {
        let vs = Sd.length === hd - Hl;
        for (let idx = 0; vs && idx < pd.length; idx++) vs = pd[idx][1] >= 2 && Sd[pd[idx][0] - Hl] === 123;
        if (vs && isAscii(Sd))
          try {
            let ol = Nr(Sd);
            if (
              !ol.error &&
              ol.values.length === pd.length &&
              (ol.read === Sd.length || (ol.read === Sd.length - 1 && Sd.at(-1) === 13))
            )
              Ld = ol.values;
          } catch {
            Ld = undefined;
          }
      }
      if (Ld)
        for (let idx = 0; idx < pd.length; idx++) {
          let ol = pd[idx][0];
          if (bo.has(ol)) r();
          let gd = ol - Hl;
          Hi(Ld[idx], Sd.subarray(gd, gd + pd[idx][1]), ol);
        }
      else for (let idx = 0; idx < pd.length; idx++) ta(Sd, pd[idx][0] - Hl, pd[idx][1], pd[idx][0]);
    }
    reportUnparsableLines(Xa);
  } catch (error) {
    Io = {
      error,
    };
    throw error;
  } finally {
    closeAfterRead(() => e.close(), Io);
  }
  let zo = (Or ? undefined : ko) ?? Math.max(no, 0);
  let earlierMetadataBytes = 0;
  for (let idx = 0; idx < Yt.length; idx++) if (Yt[idx] < zo) earlierMetadataBytes += qt[idx];
  return {
    lastAttributionOffset: ao,
    lastAttributionLength: $o,
    ledgerLines: yo,
    finalLine: Ho,
    scan: {
      boundary: !vn ? (no >= 0 ? "plain" : "none") : Or ? "preserved_all_rows" : "preserved",
      keptFrom: zo,
      seedFrom: Math.max(hn, 0),
      earlierMetadataBytes,
      scanMs,
      scanStartMs: startTime,
    },
  };
}
//@ chunk-e6aww6q8.js:497626-497677 layout
function scanTranscriptFile(e, n, processEntry, dropPreBoundaryEntries, h) {
  return scanTranscriptBuffer(createFileChunkReader(e, n), processEntry, dropPreBoundaryEntries, h);
}
//@ chunk-e6aww6q8.js:497677-497755 layout
function endsWithNewlineSync(e, n) {
  let r = Buffer.alloc(1);
  return readSync(e, r, 0, 1, n - 1) === 1 && r[0] === 10;
}
//@ chunk-e6aww6q8.js:497755-497974 layout
async function endsWithNewline(e, n) {
  if (n === 0) return true;
  let r = await open(e, "r");
  let s;
  try {
    let h = Buffer.alloc(1);
    let { bytesRead } = await r.read(h, 0, 1, n - 1);
    return bytesRead === 1 && h[0] === 10;
  } catch (error) {
    s = {
      error,
    };
    throw error;
  } finally {
    await closeAfterReadAsync(() => r.close(), s);
  }
}
//@ chunk-e6aww6q8.js:497974-498012 layout
function readJsonAtOffset(e, lastAttributionOffset, lastAttributionLength) {
  return readJsonAtOffsetSync(e, lastAttributionOffset, lastAttributionLength);
}
//@ chunk-e6aww6q8.js:498012-498107 layout
function readJsonAtOffsetSync(e, n, r) {
  if (n < 0 || r <= 0) return null;
  let [line] = readFileTailSync(e, [
    {
      offset: n,
      length: r,
    },
  ]);
  return parseJsonBuffer(line);
}
//@ chunk-e6aww6q8.js:498107-498194 layout
function parseJsonBuffer(line) {
  if (!line) return null;
  try {
    return jsonParse(line.toString("utf8"));
  } catch {
    return null;
  }
}
//@ chunk-e6aww6q8.js:498194-498269 layout
function readJsonAtOffset_2(e, lastAttributionOffset, lastAttributionLength) {
  if (lastAttributionOffset < 0 || lastAttributionLength <= 0) return null;
  return parseJsonBuffer(e.subarray(lastAttributionOffset, lastAttributionOffset + lastAttributionLength));
}
//@ chunk-e6aww6q8.js:498269-498511 fingerprint = readFileTailSync (0.701)
function readFileTailSync(e, n) {
  if (n.length === 0) return [];
  let r = openSync(e, "r");
  let fd;
  try {
    return n.map(({ offset, length: y }) => {
      if (offset < 0 || y <= 0) return null;
      let buf = Buffer.allocUnsafe(y);
      return readSync(r, buf, 0, y, offset) < y ? null : buf;
    });
  } catch (error) {
    fd = {
      error,
    };
    throw error;
  } finally {
    closeAfterRead(() => closeSync(r), fd);
  }
}
//@ chunk-e6aww6q8.js:498511-498604 facade-majority
var TRANSCRIPT_CLOSE_FAILED_REPORT =
  "loadTranscriptFile: transcript close failed while an earlier error was propagating";
//@ chunk-e6aww6q8.js:498604-498677 facade-majority
function closeAfterRead(e, n) {
  try {
    e();
  } catch (error) {
    if (n === undefined) throw error;
    reportTranscriptCloseFailure(error, n.error);
  }
}
//@ chunk-e6aww6q8.js:498677-498762 facade-majority
async function closeAfterReadAsync(e, n) {
  try {
    await e();
  } catch (error) {
    if (n === undefined) throw error;
    reportTranscriptCloseFailure(error, n.error);
  }
}
//@ chunk-e6aww6q8.js:498762-498904 layout
function reportTranscriptCloseFailure(error, error_2) {
  if (isWin32ReadEbadf(error_2)) {
    logForDebugging(
      `transcript close failed while an earlier error was propagating (${getErrnoCode(error)})`,
      {
        level: "warn",
      },
    );
    return;
  }
  logError(withTelemetryMessage(error, TRANSCRIPT_CLOSE_FAILED_REPORT));
}
//@ chunk-e6aww6q8.js:498904-499117 layout
function addTranscriptLine(e, n, r) {
  let s = n === null ? null : n.subarray(skipNuls(n, 0, n.length));
  let h = null;
  if (s !== null)
    try {
      h = jsonParse(s.toString("utf8"));
    } catch {
      h = null;
    }
  if (h !== null && typeof h === "object") {
    e.add(h, r);
    return;
  }
  e.torn(s === null ? null : readEnvelopeSessionId(s), r);
}
//@ chunk-e6aww6q8.js:499117-499231 layout
function rebuildFromLines(e, artifactAutoReactLedgers, r) {
  let s = new ArtifactLedgerCollector();
  let h = 0;
  for (let y of e) addTranscriptLine(s, y, h++);
  artifactAutoReactLedgers.clear();
  for (let [y, S] of s.finish(r)) artifactAutoReactLedgers.set(y, S);
}
//@ chunk-e6aww6q8.js:499231-499389 layout
function isTornLine(e) {
  if (e === null) return true;
  if (hasPrefix(e)) return false;
  try {
    let n = jsonParse(e.toString("utf8", skipNuls(e, 0, e.length)));
    return n === null || typeof n !== "object";
  } catch {
    return true;
  }
}
//@ chunk-e6aww6q8.js:499389-499508 layout
function lastLineOf(e) {
  let n = e.length;
  while (n > 0 && e[n - 1] === 10) n--;
  let r = n === 0 ? 0 : e.lastIndexOf(10, n - 1) + 1;
  return e.subarray(r, n);
}
//@ chunk-e6aww6q8.js:499508-499640 layout
function* iterateEntryLines(e) {
  let n = 0;
  while (n < e.length) {
    let index = e.indexOf(10, n);
    if (index === -1) index = e.length;
    if (index > n && hasPrefix(e, n, index)) yield e.subarray(n, index);
    n = index + 1;
  }
}
//@ chunk-e6aww6q8.js:499640-499693 layout
function isObjectLike(e) {
  return typeof e === "object" && e !== null;
}
//@ chunk-e6aww6q8.js:499693-499819 layout
function writtenAtOrLatest(e) {
  return typeof e.writtenAtMs === "number" && Number.isFinite(e.writtenAtMs)
    ? e.writtenAtMs
    : Number.POSITIVE_INFINITY;
}
//@ chunk-e6aww6q8.js:499819-499944 layout
function writtenAtOrEarliest(e) {
  return typeof e.writtenAtMs === "number" && Number.isFinite(e.writtenAtMs)
    ? e.writtenAtMs
    : Number.NEGATIVE_INFINITY;
}
//@ chunk-e6aww6q8.js:499944-501228 facade-majority
function mergeArtifactCommentMonitorEntries(e, n) {
  let artifacts = n.artifacts;
  let artifacts_2 = e.artifacts;
  if (typeof artifacts !== "object" || artifacts === null)
    return typeof artifacts_2 === "object" && artifacts_2 !== null
      ? e.crossLineMerged === true
        ? e
        : {
            ...e,
            crossLineMerged: true,
          }
      : n;
  let h = new Map(Object.entries(artifacts));
  if (typeof artifacts_2 === "object" && artifacts_2 !== null)
    for (let [key, value] of Object.entries(artifacts_2)) {
      if (!isObjectLike(value)) continue;
      let G = h.get(key);
      let q = isObjectLike(G);
      if (value.state !== "stopped") {
        if (
          value.state === "armed" &&
          value.holder !== undefined &&
          q &&
          G.state === "armed" &&
          (G.holder === undefined
            ? writtenAtOrEarliest(G) <= writtenAtOrEarliest(value)
            : writtenAtOrEarliest(G) < writtenAtOrEarliest(value))
        ) {
          let { holderPid, holderProcStart, holderProcStartFt, holderJob, holderPidSpace, ...Me } = G;
          h.set(key, {
            ...Me,
            writtenAtMs: value.writtenAtMs,
            holder: value.holder,
            ...(value.holderPid !== undefined && {
              holderPid: value.holderPid,
            }),
            ...(value.holderProcStart !== undefined && {
              holderProcStart: value.holderProcStart,
            }),
            ...(value.holderProcStartFt !== undefined && {
              holderProcStartFt: value.holderProcStartFt,
            }),
            ...(value.holderJob !== undefined && {
              holderJob: value.holderJob,
            }),
            ...(value.holderPidSpace !== undefined && {
              holderPidSpace: value.holderPidSpace,
            }),
          });
        }
        continue;
      }
      let Z = writtenAtOrLatest(value);
      if (!h.has(key) || !q) {
        h.set(key, value);
        continue;
      }
      let Se =
        G.state === "stopped"
          ? writtenAtOrLatest(G)
          : G.state === "armed"
            ? writtenAtOrEarliest(G)
            : Number.NEGATIVE_INFINITY;
      if (G.state === "stopped" ? Z > Se : Z >= Se) h.set(key, value);
    }
  let keys = Object.keys(artifacts);
  let S = h.size === keys.length && keys.every((w) => h.get(w) === artifacts[w]);
  if (S && n.crossLineMerged === undefined) return n;
  return {
    ...n,
    ...(S
      ? {}
      : {
          crossLineMerged: true,
        }),
    artifacts: Object.fromEntries(h),
  };
}
//@ chunk-e6aww6q8.js:501228-502443 placement = shouldExtractMemory (0)
function findToolUseSiblings(messages, n, r, { direct, throughBatch }) {
  let y;
  let S = [];
  let w = false;
  if (throughBatch) {
    let Ee = new Set();
    let Ae;
    let Ie = messages.get(r);
    while (Ie && isAuxiliaryEntry(Ie) && !Ee.has(Ie.uuid)) {
      Ee.add(Ie.uuid);
      Ae = Ie;
      Ie = Ie.parentUuid ? messages.get(Ie.parentUuid) : undefined;
    }
    if (Ie?.type === "user" && contentHasBlockType(Ie.message?.content, "tool_result")) {
      S = getToolResultIds(Ie);
      y = Ie.parentUuid ? messages.get(Ie.parentUuid) : undefined;
    } else if (Ae) {
      let toolUseID =
        Ae.type === "attachment" && isPlainObject_5(Ae.attachment) && "toolUseID" in Ae.attachment
          ? Ae.attachment.toolUseID
          : undefined;
      let id = Ie?.type === "assistant" ? Ie.message?.id : undefined;
      y =
        Ie && id && typeof toolUseID === "string"
          ? [Ie, ...collectSameMessageSiblings(messages, Ie, id)].find((ze) =>
              hasToolUseBlock(ze).includes(toolUseID),
            )
          : undefined;
      S = y && typeof toolUseID === "string" ? [toolUseID] : [];
      w = S.length > 0;
    } else y = Ie;
  }
  let L = y ? hasToolUseBlock(y) : [];
  let id = y?.type === "assistant" && L.length > 0 && y.message?.id ? y.message.id : undefined;
  let q = new Set(y && id ? collectSameMessageSiblings(messages, y, id).map((Ee) => Ee.uuid) : []);
  let Z = new Set();
  let Se;
  let ke = false;
  let we = n;
  while (we && !Z.has(we)) {
    if (direct && we === r) return true;
    Z.add(we);
    let Ee = messages.get(we);
    if (y && id && Ee) {
      if (ke && Ee.uuid === y.uuid) return true;
      if (
        Ee.type === "assistant" &&
        Ee.uuid !== y.uuid &&
        Ee.message?.id === id &&
        countToolCallsSince_5(Ee)
      ) {
        if (q.has(Ee.uuid)) return true;
        ke = true;
      } else if (!countVisibleMessages_2(Ee, id)) ke = false;
    }
    if (
      y &&
      Ee?.uuid === y.uuid &&
      Se &&
      S.some((Ae) => L.includes(Ae)) &&
      getToolResultIds(Se).some((Ae) => L.includes(Ae) && (w ? L.length > 1 : !S.includes(Ae)))
    )
      return true;
    Se = Ee;
    we = Ee?.parentUuid ?? undefined;
  }
  return false;
}
//@ chunk-e6aww6q8.js:502443-502643 placement
function collectSameMessageSiblings(e, n, id) {
  let s = [];
  let h = new Set([n.uuid]);
  let y = n.parentUuid ? e.get(n.parentUuid) : undefined;
  while (y && !h.has(y.uuid) && countVisibleMessages_2(y, id)) {
    h.add(y.uuid);
    s.push(y);
    y = y.parentUuid ? e.get(y.parentUuid) : undefined;
  }
  return s;
}
//@ chunk-e6aww6q8.js:502643-511663 fingerprint = loadTranscriptFile (0.424)
/**
 * 构造转录加载器：逐条处理 jsonl 记录，按 uuid 收集消息，按类型收集 summary、custom-title、tag、ai-title、file-history、attribution、content-replacement、worktree-state 等元数据，并找出叶子节点。
 */
function loadTranscriptFile_2(e) {
  let messages = new Map();
  let summaries = new Map();
  let customTitles = new Map();
  let tags = new Set();
  let agentNames = new Map();
  let agentColors = new Map();
  let agentSettings = new Map();
  let prNumbers = new Map();
  let prUrls = new Map();
  let prRepositories = new Map();
  let modes = new Map();
  let worktreeStates = new Map();
  let fileHistorySnapshots = new Map();
  let attributionSnapshots = new Map();
  let contentReplacements = new Map();
  let agentContentReplacements = new Map();
  let Ie = new Map();
  let Me = new Map();
  let We = new Map();
  let ze = new Map();
  let lt = new Set();
  let Je = new Map();
  let nt = new Map();
  let pt = new Map();
  let Et = new Map();
  let yt = new Map();
  let gt = new Map();
  let At = new Map();
  let It = new Map();
  let Yt = new Map();
  let qt = new Map();
  let Zt = new Map();
  let rn = new Map();
  let pn = new Map();
  let no = new Map();
  let hn = new Map();
  let ho = new Map();
  let yn = new Map();
  let Kn = false;
  let Xn;
  let fo;
  let To = "";
  let bo;
  let vn = false;
  let co = false;
  let So = false;
  let ko = false;
  let un = false;
  let ao = 0;
  let $o = "leaf_scan";
  let prunedBeforeFold = false;
  let Ho;
  let rr = new Map();
  let rowRepairer = createRowRepairer();
  let rewindTracker = createRewindTracker(messages);
  let Fr = (entry, Vr = true) => {
    if (!isPlainObject_3(entry)) return;
    let entry_2 = entry;
    if (isLegacyProgressEntry(entry_2)) {
      logLegacyProgressProbe("seen");
      let parentUuid = entry_2.parentUuid;
      rr.set(entry_2.uuid, parentUuid && rr.has(parentUuid) ? (rr.get(parentUuid) ?? null) : parentUuid);
      return;
    }
    if (isTranscriptMessage(entry_2)) {
      if (entry_2.parentUuid && rr.has(entry_2.parentUuid)) {
        logLegacyProgressProbe("rewrote");
        entry_2.parentUuid = rr.get(entry_2.parentUuid) ?? null;
      }
      if (Ho !== undefined && !entry_2.isSidechain) {
        if (entry_2.parentUuid === null && !isCompactBoundaryMessage_3(entry_2)) entry_2.parentUuid = Ho;
        Ho = undefined;
      }
      if (!rowRepairer.admit(entry_2, messages)) return;
      if (Vr) repairMalformedStringsDeep(entry_2);
      if (entry_2.type === "assistant" && entry_2.wireToolInputs !== undefined) {
        let jr = countToolCallsSince_2(
          entry_2.wireToolInputs,
          entry_2.message?.content,
          entry_2.batchToolUses,
        );
        if (jr === undefined) delete entry_2.wireToolInputs;
        else entry_2.wireToolInputs = jr;
      }
      if (
        entry_2.type === "assistant" &&
        (entry_2.wireToolInputs !== undefined || entry_2.wireIngestContext !== undefined)
      ) {
        let jr = restoreWireInputStamps(
          entry_2.wireIngestContext,
          entry_2.wireToolInputs,
          entry_2.message?.content,
        );
        if (jr === undefined) delete entry_2.wireIngestContext;
        else entry_2.wireIngestContext = jr;
      }
      messages.set(entry_2.uuid, entry_2);
      if (!entry_2.isSidechain && !isTranscriptMessage_2(entry_2)) {
        rewindTracker.noteRow(entry_2);
        Xn = entry_2.uuid;
        ao++;
        if (typeof entry_2.timestamp === "string" && entry_2.timestamp > To) {
          fo = entry_2.uuid;
          To = entry_2.timestamp;
        }
        vn = false;
        So = false;
        ko = false;
      }
      if (isCompactBoundaryMessage_3(entry_2)) {
        bo = undefined;
        vn = false;
        co = false;
        rewindTracker.noteCompactBoundary();
      }
    } else if (entry_2.type === "summary" && entry_2.leafUuid)
      summaries.set(entry_2.leafUuid, entry_2.summary);
    else if (entry_2.type === "last-prompt") {
      rewindTracker.noteCheckpoint(entry_2);
      if (entry_2.leafUuid !== undefined) un = true;
      if (entry_2.leafUuid) {
        vn = entry_2.explicit === true || (vn && entry_2.leafUuid === bo);
        co = entry_2.explicit === true || (co && entry_2.leafUuid === bo);
        ko = entry_2.rewound === true || (ko && entry_2.leafUuid === bo);
        bo = entry_2.leafUuid;
        ao = 0;
        So = false;
      } else if (entry_2.leafUuid === null && entry_2.explicit === true) {
        So = true;
        bo = undefined;
        vn = false;
        co = false;
        ko = false;
        Ho = undefined;
      }
    } else if (entry_2.type === "custom-title" && entry_2.sessionId)
      customTitles.set(entry_2.sessionId, entry_2.customTitle);
    else if (entry_2.type === "ended-by-model" && entry_2.sessionId && !isModelEndCheckSupported())
      tags.add(entry_2.sessionId);
    else if (entry_2.type === "ai-title" && entry_2.sessionId)
      agentNames.set(entry_2.sessionId, entry_2.aiTitle);
    else if (entry_2.type === "tag" && entry_2.sessionId) agentColors.set(entry_2.sessionId, entry_2.tag);
    else if (entry_2.type === "relocated" && entry_2.sessionId)
      agentSettings.set(entry_2.sessionId, entry_2.relocatedCwd);
    else if (entry_2.type === "agent-name" && entry_2.sessionId)
      prNumbers.set(entry_2.sessionId, entry_2.agentName);
    else if (entry_2.type === "agent-color" && entry_2.sessionId)
      prUrls.set(entry_2.sessionId, entry_2.agentColor);
    else if (entry_2.type === "agent-setting" && entry_2.sessionId)
      prRepositories.set(entry_2.sessionId, entry_2.agentSetting);
    else if (entry_2.type === "mode" && entry_2.sessionId) Je.set(entry_2.sessionId, entry_2.mode);
    else if (entry_2.type === "permission-mode" && entry_2.sessionId)
      nt.set(entry_2.sessionId, entry_2.permissionMode);
    else if (entry_2.type === "isolation-latch" && entry_2.sessionId) pt.set(entry_2.sessionId, entry_2.side);
    else if (entry_2.type === "dev-mods" && entry_2.sessionId) {
      if (typeof entry_2.folder === "string" && isSessionFileAt(entry_2.folder, entry_2.sessionId))
        Et.set(entry_2.sessionId, entry_2.folder);
      else logForDebugging("dev mods: dropped a dev-mods entry naming a folder not its own");
    } else if (
      entry_2.type === "memory-mode" &&
      entry_2.sessionId &&
      (entry_2.mode === "on" || entry_2.mode === "off") &&
      (typeof entry_2.afterUuid === "string" || entry_2.afterUuid === null) &&
      typeof entry_2.timestamp === "string"
    ) {
      let jr = yt.get(entry_2.sessionId) ?? [];
      yt.set(entry_2.sessionId, jr);
      jr.push({
        mode: entry_2.mode,
        afterUuid: entry_2.afterUuid,
        timestamp: entry_2.timestamp,
        ...((entry_2.reason === "paused" ||
          entry_2.reason === "account_off" ||
          entry_2.reason === "account_read_only" ||
          entry_2.reason === "session_shape" ||
          entry_2.reason === "server_off") && {
          reason: entry_2.reason,
        }),
        ...(typeof entry_2.account === "string" && {
          account: entry_2.account,
        }),
        ...((entry_2.accountChoice === "on" ||
          entry_2.accountChoice === "read_only" ||
          entry_2.accountChoice === "off") && {
          accountChoice: entry_2.accountChoice,
        }),
      });
    } else if (entry_2.type === "atis-latch" && entry_2.sessionId) {
      if (typeof entry_2.atis === "string" && /^[\x21-\x7e]*$/.test(entry_2.atis))
        gt.set(entry_2.sessionId, entry_2.atis);
    } else if (entry_2.type === "tools-used" && entry_2.sessionId) {
      if (Array.isArray(entry_2.tools))
        At.set(
          entry_2.sessionId,
          entry_2.tools.filter((tool) => typeof tool === "string" && tool !== ""),
        );
    } else if (entry_2.type === "worktree-state" && entry_2.sessionId)
      It.set(entry_2.sessionId, entry_2.worktreeSession);
    else if (entry_2.type === "artifact-comment-monitor" && entry_2.sessionId) {
      let jr = Yt.get(entry_2.sessionId);
      Yt.set(entry_2.sessionId, jr === undefined ? entry_2 : mergeArtifactCommentMonitorEntries(jr, entry_2));
    } else if (entry_2.type === "artifact-autoreact-ledger" && entry_2.sessionId)
      qt.set(entry_2.sessionId, entry_2);
    else if (entry_2.type === "cost-state" && entry_2.sessionId) {
      let jr = CostStateEntrySchema().safeParse(entry_2);
      if (jr.success)
        Zt.set(entry_2.sessionId, {
          ...jr.data,
          sessionId: entry_2.sessionId,
        });
    } else if (entry_2.type === "pr-link" && entry_2.sessionId) {
      modes.set(entry_2.sessionId, entry_2.prNumber);
      worktreeStates.set(entry_2.sessionId, entry_2.prUrl);
      fileHistorySnapshots.set(entry_2.sessionId, entry_2.prRepository);
    } else if (entry_2.type === "bridge-session" && entry_2.sessionId) {
      attributionSnapshots.set(entry_2.sessionId, entry_2.bridgeSessionId);
      contentReplacements.set(entry_2.sessionId, entry_2.lastSequenceNum);
      if (entry_2.sessionGroupingId) Ie.set(entry_2.sessionId, entry_2.sessionGroupingId);
      else Ie.delete(entry_2.sessionId);
      if (entry_2.noHistoryBackfill) Me.set(entry_2.sessionId, true);
      else Me.delete(entry_2.sessionId);
      {
        let { ownerAccountUuid, ownerOrganizationUuid } = entry_2;
        let zo =
          (ownerAccountUuid !== undefined && !isUuidShaped(ownerAccountUuid)) ||
          (ownerOrganizationUuid !== undefined && !isUuidShaped(ownerOrganizationUuid));
        if (!zo && ownerAccountUuid) We.set(entry_2.sessionId, ownerAccountUuid);
        else We.delete(entry_2.sessionId);
        if (!zo && ownerOrganizationUuid) ze.set(entry_2.sessionId, ownerOrganizationUuid);
        else ze.delete(entry_2.sessionId);
      }
      let metaEntries = sanitizeStringList(entry_2.declaredDialogKinds);
      if (metaEntries.length > 0) agentContentReplacements.set(entry_2.sessionId, metaEntries);
      else agentContentReplacements.delete(entry_2.sessionId);
    } else if (entry_2.type === "history-suppression" && entry_2.sessionId) lt.add(entry_2.sessionId);
    else if (entry_2.type === "file-history-snapshot") rn.set(entry_2.messageId, entry_2);
    else if (entry_2.type === "file-history-delta") {
      let jr = pn.get(entry_2.messageId);
      if (jr) jr.push(entry_2);
      else pn.set(entry_2.messageId, [entry_2]);
    } else if (entry_2.type === "attribution-snapshot") {
      no.clear();
      no.set(entry_2.messageId, entry_2);
    } else if (entry_2.type === "content-replacement") {
      if (entry_2.agentId) {
        let jr = ho.get(entry_2.agentId) ?? [];
        ho.set(entry_2.agentId, jr);
        jr.push(...entry_2.replacements);
      } else {
        let jr = hn.get(entry_2.sessionId) ?? [];
        hn.set(entry_2.sessionId, jr);
        jr.push(...entry_2.replacements);
      }
    } else if (entry_2.type === "fork-context-ref") yn.set(entry_2.agentId, entry_2);
  };
  return {
    processEntry: Fr,
    precede: (Cr) => {
      for (let entry of Cr) Fr(entry);
      Ho = Cr.findLast((Vr) => isChainParticipant(Vr) && messages.has(Vr.uuid))?.uuid;
    },
    dropPreBoundaryEntries: () => {
      messages.clear();
      rn.clear();
      pn.clear();
      rr.clear();
    },
    messages,
    attributionSnapshots: no,
    artifactCommentMonitors: Yt,
    artifactAutoReactLedgers: qt,
    markPrunedBeforeFold: () => {
      prunedBeforeFold = true;
    },
    setTailTorn: (Cr) => {
      Kn = Cr;
    },
    finish: () => {
      rowRepairer.finish(messages);
      rewindTracker.publish();
      let entries = applyPreservedSegmentOnLoad(messages);
      if (!e) applySnipRemovals(messages, fo);
      return cs(entries);
    },
  };
  function cs(entries) {
    if (Kn)
      for (let [Nr, Is] of Yt)
        Yt.set(Nr, {
          ...Is,
          tailTorn: true,
        });
    if (!e && So) return _r(new Set());
    let progressBridge = new Set();
    let Oo = vn && bo && messages.has(bo) && !messages.get(bo)?.isSidechain;
    let jr = (Nr) => {
      let parentUuids = new Map([[Nr, true]]);
      let fs = (start) => {
        let Wi = [];
        let ii = false;
        let cur = start;
        while (cur) {
          let hr = parentUuids.get(cur);
          if (hr !== undefined) {
            ii = hr;
            break;
          }
          parentUuids.set(cur, false);
          Wi.push(cur);
          cur = messages.get(cur)?.parentUuid ?? undefined;
        }
        for (let hr of Wi) parentUuids.set(hr, ii);
        return ii;
      };
      let as = Nr;
      let Vi = "";
      for (let ji of messages.values())
        if (
          !ji.isSidechain &&
          ji.uuid !== Nr &&
          typeof ji.timestamp === "string" &&
          ji.timestamp >= Vi &&
          fs(ji.uuid)
        ) {
          as = ji.uuid;
          Vi = ji.timestamp;
        }
      return as;
    };
    let Or = Xn;
    if (!e && !un && Or && fo && fo !== Or) Or = jr(Or);
    if (!e && (!entries || Oo)) {
      let Nr = bo && messages.has(bo) ? bo : undefined;
      if (
        Nr &&
        !vn &&
        Xn &&
        messages.has(Xn) &&
        Xn !== Nr &&
        findToolUseSiblings(messages, Xn, Nr, {
          direct: true,
          throughBatch: !co,
        })
      )
        Nr = Xn;
      if (!entries) Nr ??= Or;
      if (Nr && messages.has(Nr)) {
        let leafUuids = new Set();
        let fs = messages.get(Nr);
        while (fs) {
          if (leafUuids.has(fs.uuid)) {
            logEvent("tengu_transcript_parent_cycle", {});
            break;
          }
          leafUuids.add(fs.uuid);
          if (fs.type === "user" || fs.type === "assistant") {
            progressBridge.add(fs.uuid);
            break;
          }
          fs = fs.parentUuid ? messages.get(fs.parentUuid) : undefined;
        }
        if (progressBridge.size === 1) {
          $o = Nr === bo ? "checkpoint" : Nr === Xn ? "last_row" : "inferred";
          return _r(progressBridge);
        }
      }
    }
    let hasUserAssistantChild = new Set();
    let seen = new Set();
    for (let Nr of messages.values())
      if (Nr.parentUuid !== null) {
        hasUserAssistantChild.add(Nr.parentUuid);
        if (Nr.type === "user" || Nr.type === "assistant") seen.add(Nr.parentUuid);
      }
    let rs = [];
    for (let Nr of messages.values()) if (!hasUserAssistantChild.has(Nr.uuid)) rs.push(Nr);
    if (
      collectLeafUuids({
        messages,
        terminalMessages: rs,
        hasUserAssistantChild: seen,
        leafUuids: progressBridge,
      })
    )
      logEvent("tengu_transcript_parent_cycle", {});
    if (!e && progressBridge.size > 1) {
      let Nr =
        bo &&
        progressBridge.has(bo) &&
        (vn ||
          !Xn ||
          !findToolUseSiblings(messages, Xn, bo, {
            direct: false,
            throughBatch: !co,
          }))
          ? bo
          : Xn;
      if (!Nr || !messages.has(Nr)) return _r(progressBridge);
      let seen = new Set();
      let fs = messages.get(Nr);
      while (fs) {
        if (seen.has(fs.uuid)) break;
        seen.add(fs.uuid);
        if (fs.type === "user" || fs.type === "assistant") {
          progressBridge.clear();
          progressBridge.add(fs.uuid);
          $o = Nr === bo ? "checkpoint_pruned" : "last_row_pruned";
          break;
        }
        fs = fs.parentUuid ? messages.get(fs.parentUuid) : undefined;
      }
    }
    return _r(progressBridge);
  }
  function _r(leafUuids) {
    recordLoadReportFor(messages, {
      chose: $o,
      checkpoint: bo,
      checkpointEverExplicit: co,
      lastRow: Xn,
      newestRow: fo,
      rowsAfterLastCheckpoint: ao,
      prunedBeforeFold,
    });
    return {
      messages,
      summaries,
      customTitles,
      endedSessions: tags,
      aiTitles: agentNames,
      tags: agentColors,
      relocatedCwds: agentSettings,
      agentNames: prNumbers,
      agentColors: prUrls,
      agentSettings: prRepositories,
      prNumbers: modes,
      prUrls: worktreeStates,
      prRepositories: fileHistorySnapshots,
      bridgeSessionIds: attributionSnapshots,
      bridgeLastSeqs: contentReplacements,
      bridgeDialogKindsBySession: agentContentReplacements,
      bridgeSessionGroupingIds: Ie,
      bridgeNoBackfill: Me,
      bridgeOwnerAccountUuids: We,
      bridgeOwnerOrganizationUuids: ze,
      historySuppressed: lt,
      modes: Je,
      permissionModes: nt,
      isolationLatches: pt,
      ...(Et.size > 0 && {
        devModsFolders: Et,
      }),
      memoryModeStamps: yt,
      atisLatches: gt,
      ...(At.size > 0 && {
        toolsUsedLists: At,
      }),
      worktreeStates: It,
      artifactCommentMonitors: Yt,
      artifactAutoReactLedgers: qt,
      costStates: Zt,
      fileHistorySnapshots: rn,
      fileHistoryDeltas: pn,
      attributionSnapshots: no,
      contentReplacements: hn,
      agentContentReplacements: ho,
      forkContextRefs: yn,
      leafUuids,
      clearedToEmpty: !e && So,
      rewindAnchorUuid: ko ? bo : undefined,
    };
  }
}
//@ chunk-e6aww6q8.js:511663-511764 facade-majority
function loadTranscriptFromEntries(e, n) {
  let transcriptFile = loadTranscriptFile_2(n?.keepAllLeaves ?? false);
  for (let s of e) transcriptFile.processEntry(s);
  return transcriptFile.finish();
}
//@ chunk-e6aww6q8.js:511764-515250 facade-majority
/**
 * 加载一份转录文件（或 storage 记录）：逐条解析，交给 loadTranscriptFile 处理器，跳过无法解析的行并统计。
 */
async function loadTranscriptFile(e, n) {
  let transcriptFile = loadTranscriptFile_2(n?.keepAllLeaves ?? false);
  let { processEntry, artifactCommentMonitors, artifactAutoReactLedgers } = transcriptFile;
  transcriptFile.precede(n?.precedingEntries ?? []);
  let S = isEnvTruthy(process.env.CLAUDE_CODE_DISABLE_PRECOMPACT_SKIP);
  if (isStorageV5Enabled() && n?.storageV5) {
    let { backend, key } = n.storageV5;
    let G = await backend.read([key]);
    let q = G.ok
      ? undefined
      : isByteViewUnsupportedError(G.error)
        ? await readPagedTranscript(backend, key)
        : isStorageTooLargeError(G.error)
          ? await readPagedTranscript(backend, key, pagedTranscriptPageBytes)
          : undefined;
    let Z = G.ok
      ? undefined
      : q === undefined
        ? G.error
        : q !== null && "failure" in q
          ? q.failure
          : undefined;
    if (Z !== undefined) {
      if (Z.code === "Failed" && Z.failureClass === "permission") {
        logForDebugging("loadTranscriptFile: v5 read inaccessible (permission) \u2014 empty result");
        return Object.assign(transcriptFile.finish(), {
          servedBy: "inaccessible",
        });
      }
      logForDebugging(`loadTranscriptFile: v5 read failed (${Z.code})`, {
        level: "error",
      });
      let Ie = errnoShapedCode("telemetryCode" in Z ? Z.telemetryCode : undefined);
      let merged = Object.assign(
        Error("loadTranscriptFile: transcript unreadable via storage backend", {
          cause: Z,
        }),
        Ie === undefined
          ? {}
          : {
              code: Ie,
            },
      );
      if (isWin32TranscriptEbadf(merged))
        logError(withTelemetryMessage(merged, WIN32_EBADF_TELEMETRY_MESSAGE));
      throw merged;
    }
    let Se = G.ok ? G.value.items[0] : undefined;
    let ke = q !== undefined && q !== null && "bytes" in q ? q : undefined;
    let we = Se?.found
      ? {
          servedBy: "v5",
          v5Read: {
            mtimeMs: Se.mtimeMs,
          },
        }
      : ke
        ? {
            servedBy: "v5-records",
            v5Read: {
              mtimeMs: ke.mtimeMs,
            },
          }
        : {
            servedBy: "absent",
          };
    let Ee = Se?.found ? Se.value : ke?.bytes;
    let storedBytes = Se?.found ? Se.storedBytes : ke?.storedBytes;
    if (Ee !== undefined) {
      let buffer = Buffer.from(Ee.buffer, Ee.byteOffset, Ee.byteLength);
      let Me = async () => {
        if (ke !== undefined) return ke.tornTailBytes > 0;
        let stats = await backend.stat(key);
        return stats.ok && (stats.value.tornTailBytes ?? 0) > 0;
      };
      if (!S && (storedBytes ?? buffer.length) > SKIP_PRECOMPACT_THRESHOLD) {
        let ze = scanTranscriptBuffer(
          createBufferLineScanner(buffer),
          processEntry,
          transcriptFile.dropPreBoundaryEntries,
          n?.keepAllLeaves ?? false,
        );
        let jsonAtOffset = readJsonAtOffset_2(buffer, ze.lastAttributionOffset, ze.lastAttributionLength);
        if (jsonAtOffset) transcriptFile.attributionSnapshots.set(jsonAtOffset.messageId, jsonAtOffset);
        transcriptFile.markPrunedBeforeFold();
        let Je =
          ze.finalLine.offset >= 0 &&
          ze.ledgerLines.at(-1)?.offset !== ze.finalLine.offset &&
          (ze.ledgerLines.length > 0 || artifactAutoReactLedgers.size > 0);
        let mapped = (Je ? [...ze.ledgerLines, ze.finalLine] : ze.ledgerLines).map(({ offset, length: yt }) =>
          buffer.subarray(offset, offset + yt),
        );
        let pt = Je && isTornLine(mapped.pop() ?? null);
        rebuildFromLines(mapped, artifactAutoReactLedgers, pt);
        if (artifactCommentMonitors.size > 0 || artifactAutoReactLedgers.size > 0) {
          let Et = await Me();
          transcriptFile.setTailTorn(Et);
          if (Et)
            for (let [yt, gt] of artifactAutoReactLedgers)
              artifactAutoReactLedgers.set(yt, resetArtifactLedgerState(gt, false));
        }
        return Object.assign(transcriptFile.finish(), we);
      }
      let We = isTornLine(lastLineOf(buffer));
      if (!n?.keepAllLeaves && buffer.length > SKIP_PRECOMPACT_THRESHOLD) {
        buffer = walkChainBeforeParse(buffer);
        transcriptFile.markPrunedBeforeFold();
      }
      for (let ze of countJsonlLines(buffer)) processEntry(ze);
      rebuildFromLines(iterateEntryLines(buffer), artifactAutoReactLedgers, We);
      if (artifactCommentMonitors.size > 0 || artifactAutoReactLedgers.size > 0) {
        let ze = await Me();
        transcriptFile.setTailTorn(ze);
        if (ze)
          for (let [lt, Je] of artifactAutoReactLedgers)
            artifactAutoReactLedgers.set(lt, resetArtifactLedgerState(Je, false));
      }
    }
    return Object.assign(transcriptFile.finish(), we);
  }
  if (isDiskless()) return transcriptFile.finish();
  try {
    if (!S) {
      let { size } = await stat(e);
      if (size > SKIP_PRECOMPACT_THRESHOLD) {
        let q = scanTranscriptFile(
          e,
          size,
          processEntry,
          transcriptFile.dropPreBoundaryEntries,
          n?.keepAllLeaves ?? false,
        );
        if (!n?.keepAllLeaves) {
          let { keptFrom, seedFrom, ...Ie } = q.scan;
          markResumeTranscriptScan({
            ...Ie,
            bytes: size,
            keptBytes: size - keptFrom,
            toolCopyChars:
              currentTranscriptStore().toolResultCopiesOnDisk === "whole"
                ? undefined
                : slimCharsOf(transcriptFile.messages.values()),
          });
          currentTranscriptStore().replaySeedStarts.set(normalize(e), {
            start: seedFrom,
            fileSize: size,
          });
        }
        let jsonAtOffset = readJsonAtOffset(e, q.lastAttributionOffset, q.lastAttributionLength);
        if (jsonAtOffset) transcriptFile.attributionSnapshots.set(jsonAtOffset.messageId, jsonAtOffset);
        transcriptFile.markPrunedBeforeFold();
        let Se =
          q.finalLine.offset >= 0 &&
          q.ledgerLines.at(-1)?.offset !== q.finalLine.offset &&
          (q.ledgerLines.length > 0 || artifactAutoReactLedgers.size > 0);
        let fileTail = readFileTailSync(e, Se ? [...q.ledgerLines, q.finalLine] : q.ledgerLines);
        let we = Se && isTornLine(fileTail.pop() ?? null);
        rebuildFromLines(fileTail, artifactAutoReactLedgers, we);
        if (artifactCommentMonitors.size > 0) transcriptFile.setTailTorn(!(await endsWithNewline(e, size)));
        return transcriptFile.finish();
      }
    }
    let buf = await readFile(e);
    let L = isTornLine(lastLineOf(buf));
    transcriptFile.setTailTorn(buf.length > 0 && buf.at(-1) !== 10);
    if (!n?.keepAllLeaves && buf.length > SKIP_PRECOMPACT_THRESHOLD) {
      buf = walkChainBeforeParse(buf);
      transcriptFile.markPrunedBeforeFold();
    }
    for (let G of countJsonlLines(buf)) processEntry(G);
    rebuildFromLines(iterateEntryLines(buf), artifactAutoReactLedgers, L);
  } catch (error) {
    if (!isFsInaccessible(error)) {
      if (isWin32ReadEbadf(error)) logError(withTelemetryMessage(error, WIN32_EBADF_TELEMETRY_MESSAGE));
      else if (isTranscriptLoadError(error))
        logForDebugging(
          `loadTranscriptFile: transcript unreadable (${getErrnoCode(error)}): ${errorMessage(error)}`,
          {
            level: "error",
          },
        );
      else logError(error);
      throw error;
    }
  }
  return transcriptFile.finish();
}
//@ chunk-e6aww6q8.js:515250-515696 layout
/**
 * 按 sessionId 或显式路径加载会话转录，返回加载结果与会话文件路径。
 */
async function loadSessionTranscript(e, n, r, precedingEntries) {
  if (isStorageV5Enabled() && r !== undefined)
    if (n === undefined) {
      let sessionFile = await loadSessionFile(e, r);
      if (sessionFile !== undefined) {
        let transcriptFile = await loadTranscriptFile(sessionFile.path, {
          storageV5: {
            backend: r,
            key: sessionFile.key,
          },
          precedingEntries,
        });
        return Object.assign(transcriptFile, {
          sessionFile: sessionFile.path,
        });
      }
    } else {
      let transcriptStorageKey = getTranscriptStorageKey(n, r);
      if (transcriptStorageKey !== undefined) {
        let transcriptFile = await loadTranscriptFile(n, {
          storageV5: transcriptStorageKey,
          precedingEntries,
        });
        return Object.assign(transcriptFile, {
          sessionFile: n,
        });
      }
    }
  let h = n ?? (await getErrorsPath(e));
  let transcriptFile = await loadTranscriptFile(h, {
    precedingEntries,
  });
  return Object.assign(transcriptFile, {
    sessionFile: h,
  });
}
//@ chunk-e6aww6q8.js:515696-516929 callgraph-fingerprint = loadSessionFile (0.183)
/**
 * 按 sessionId 定位会话文件：先看会话记录的 projectDir，再看当前项目目录与清洗名截断冲突的兄弟目录。
 */
async function loadSessionFile(e, n) {
  if (!isValidKeySegment(e)) return;
  let sessionProjectDir = getSessionProjectDir();
  if (sessionProjectDir !== null) {
    let L = basename(sessionProjectDir);
    if (dirname(sessionProjectDir) !== getProjectsDir() || !isValidKeySegment(L)) return;
    let G = validatedTranscriptKey(STORAGE_SPACES.transcript(L, e));
    if (G === undefined) return;
    return {
      key: G,
      path: join(sessionProjectDir, `${e}.jsonl`),
    };
  }
  let originalCwdOrNull = getOriginalCwdOrNull();
  let h = getProjectDirNameOverride() ?? getProjectKey(getOriginalCwd());
  let y = [h];
  let S = originalCwdOrNull === null ? undefined : legacyDerivedProjectKey(originalCwdOrNull);
  if (S !== undefined) y.push(S);
  else if (originalCwdOrNull !== null && h.length > MAX_SANITIZED_LENGTH) {
    let G = (projectKey) => projectKey;
    let q = G(h.slice(0, MAX_SANITIZED_LENGTH) + "-");
    let Z = G(h);
    let Se = new Set();
    let ke = [];
    let we;
    let Ee = 0;
    try {
      do {
        let Ie = await n.listEntries(
          {
            namespace: "transcript",
          },
          {
            skipScopeStats: true,
            ...(we !== undefined && {
              cursor: we,
            }),
          },
        );
        if (!Ie.ok) break;
        for (let item of Ie.value.items)
          if (
            item.kind === "scope" &&
            item.scope.namespace === "transcript" &&
            item.scope.projectKey !== undefined &&
            G(item.scope.projectKey).startsWith(q) &&
            G(item.scope.projectKey) !== Z &&
            isValidKeySegment(item.scope.projectKey) &&
            !Se.has(G(item.scope.projectKey))
          ) {
            Se.add(G(item.scope.projectKey));
            ke.push(item.scope.projectKey);
          }
        we = Ie.value.cursor;
      } while (we && ++Ee < MAX_LISTING_PAGES);
    } catch {}
    let Ae = {
      backend: n,
      transcriptKey: STORAGE_SPACES.transcript,
      isKeySegment: isValidKeySegment,
      realWorkspacePath: makeWorkspaceRealPath(n),
    };
    for (let Ie of ke)
      if (
        await dirBelongsToProject(join(getProjectsDir(), Ie), originalCwdOrNull, false, wrapStorageSource(Ae))
      )
        y.push(Ie);
  }
  for (let L of y) {
    let G = validatedTranscriptKey(STORAGE_SPACES.transcript(L, e));
    if (G === undefined) continue;
    if ((await n.stat(G)).ok)
      return {
        key: G,
        path: join(getProjectsDir(), L, `${e}.jsonl`),
      };
  }
  let w = validatedTranscriptKey(STORAGE_SPACES.transcript(h, e));
  return w === undefined
    ? undefined
    : {
        key: w,
        path: join(getProjectsDir(), h, `${e}.jsonl`),
      };
}
//@ chunk-e6aww6q8.js:516929-517106 layout = getErrorsPath (1)
async function getErrorsPath(e) {
  let sessionProjectDir = getSessionProjectDir();
  let originalCwd = getOriginalCwd();
  let s = `${e}.jsonl`;
  let h = join(sessionProjectDir ?? getProjectDir(originalCwd), s);
  if (sessionProjectDir !== null) return h;
  for (let y of await findProjectDirs(originalCwd)) {
    let S = join(y, s);
    try {
      await stat(S);
      return S;
    } catch {}
  }
  return h;
}
//@ chunk-e6aww6q8.js:517106-517154 facade-majority
function clearSessionMessagesCache() {
  currentTranscriptStore().clearSessionMessagesCache();
}
//@ chunk-e6aww6q8.js:517154-517228 facade-majority
function consumeFailedTranscriptWrite() {
  let e = currentTranscriptStore();
  let hasFailedWrite = e.hasFailedWrite;
  e.hasFailedWrite = false;
  return hasFailedWrite;
}
//@ chunk-e6aww6q8.js:517228-517282 facade-majority
function primeSessionMessagesCache(sessionId, n) {
  currentTranscriptStore().primeSessionMessagesCache(sessionId, n);
}
//@ chunk-e6aww6q8.js:517282-517355 facade-majority
async function doesMessageExistInSession(sessionId, uuid, storageV5) {
  return (await currentTranscriptStore().sessionMessages(sessionId, storageV5)).has(uuid);
}
//@ chunk-e6aww6q8.js:517355-517585 facade-majority
async function isMessageTurnUnanswered(sessionId, n, storageV5) {
  try {
    let { messages } = await loadSessionTranscript(sessionId, undefined, storageV5);
    return isTurnUnanswered([...messages.values()], n);
  } catch (error) {
    logForDebugging(
      `isMessageTurnUnanswered: loadSessionFile failed: ${error instanceof Error ? error.message : String(error)}`,
      {
        level: "error",
      },
    );
    return false;
  }
}
//@ chunk-e6aww6q8.js:517585-518079 facade-majority
function isTurnUnanswered(e, n) {
  let index = e.findIndex((y) => y.uuid === n);
  if (index === -1) return false;
  let s = [];
  for (let idx = index + 1; idx < e.length; idx++) {
    let S = e[idx];
    if ((S.type === "user" || S.type === "assistant") && !("isSidechain" in S && S.isSidechain === true))
      s.push(S);
  }
  if (s.length === 0) return true;
  let last = s.at(-1);
  if (!(last.type === "user" && last.interruptedByShutdown === true)) return false;
  for (let idx = s.length - 2; idx >= 0; idx--) {
    let S = s[idx];
    if (S.type === "assistant") continue;
    if (
      ("isCompactSummary" in S && S.isCompactSummary === true) ||
      isInterruptionOnlyMessage(S) ||
      isToolResultMessage(S) ||
      isHarnessMetaMessage(S)
    )
      continue;
    return false;
  }
  return true;
}
//@ chunk-e6aww6q8.js:518335-520628 facade-majority = getLastSessionLog (0.235)
async function sessionLogFromTranscriptLoad(e, sessionTranscript, r) {
  let {
    messages,
    summaries,
    customTitles,
    endedSessions,
    aiTitles,
    tags,
    relocatedCwds,
    agentNames,
    agentColors,
    agentSettings,
    prNumbers,
    prUrls,
    prRepositories,
    bridgeSessionIds,
    bridgeLastSeqs,
    bridgeDialogKindsBySession,
    bridgeSessionGroupingIds,
    bridgeNoBackfill,
    bridgeOwnerAccountUuids,
    bridgeOwnerOrganizationUuids,
    historySuppressed,
    modes,
    permissionModes,
    isolationLatches,
    devModsFolders,
    memoryModeStamps,
    atisLatches,
    toolsUsedLists,
    worktreeStates,
    artifactCommentMonitors,
    artifactAutoReactLedgers,
    costStates,
    fileHistorySnapshots,
    fileHistoryDeltas,
    attributionSnapshots,
    contentReplacements,
    leafUuids,
    clearedToEmpty,
  } = sessionTranscript;
  if (messages.size === 0) return null;
  if (r === undefined) currentTranscriptStore().primeFilelessResume(e, messages.keys());
  else primeSessionMessagesCache(e, messages.keys());
  let fo =
    findLatestMessage(
      messages.values(),
      (yo) => leafUuids.has(yo.uuid) && !yo.isSidechain && (yo.type === "user" || yo.type === "assistant"),
    ) ??
    (leafUuids.size === 0 && !clearedToEmpty
      ? findLatestMessage(messages.values(), (yo) => !yo.isSidechain)
      : undefined);
  if (!fo) {
    if (clearedToEmpty && r !== undefined) {
      let yo = await r.modifiedAt();
      return buildLiteLogFromMessages(
        sessionTranscript,
        {
          date: yo.toISOString(),
          fullPath: r.path,
          created: yo,
          modified: yo,
        },
        e,
      );
    }
    return null;
  }
  let transcript = buildConversationChain(messages, fo);
  warnIfTranscriptUnchained(messages, transcript, fo.sessionId);
  let sessionId = fo.sessionId;
  let summary = summaries.get(fo.uuid);
  let customTitle = customTitles.get(sessionId);
  let tag = tags.get(sessionId);
  let agentSetting = agentSettings.get(sessionId);
  let un = convertToLogOption(
    transcript,
    0,
    summary,
    customTitle,
    buildFileHistorySnapshots(fileHistorySnapshots, fileHistoryDeltas, transcript),
    tag,
    r?.path,
    buildAttributionSnapshotChain(attributionSnapshots, transcript),
    agentSetting,
    contentReplacements.get(sessionId) ?? [],
  );
  let ao = relocatedCwds.get(sessionId);
  let $o = {
    ...un,
    ...(r === undefined && {
      sessionId: e,
    }),
    fileSnapshots: getFileSnapshotMessages(messages),
    projectPath: ao ?? un.projectPath,
    rewindAnchorUuid: sessionTranscript.rewindAnchorUuid,
    aiTitle: aiTitles.get(sessionId),
    relocatedCwd: ao,
    ...withEndedByModel({}, endedSessions.has(sessionId)),
    agentName: agentNames.get(sessionId) ?? un.agentName,
    agentColor: agentColors.get(sessionId),
    mode: modes.get(sessionId),
    permissionMode: permissionModes.get(sessionId),
    isolationLatch: isolationLatches.get(sessionId),
    devModsFolder: devModsFolders?.get(sessionId),
    memoryModeStamps: memoryModeStamps.get(sessionId) ?? [],
    atisLatch: getOrEmptyString(atisLatches, sessionId),
    toolsUsed: toolsUsedLists?.get(sessionId),
    prNumber: prNumbers.get(sessionId),
    prUrl: prUrls.get(sessionId),
    prRepository: prRepositories.get(sessionId),
    bridgeSessionId: bridgeSessionIds.get(sessionId),
    bridgeLastSeq: bridgeLastSeqs.get(sessionId),
    bridgeDialogKinds: bridgeDialogKindsBySession.get(sessionId),
    bridgeSessionGroupingId: bridgeSessionGroupingIds.get(sessionId),
    bridgeNoHistoryBackfill: bridgeNoBackfill.get(sessionId),
    bridgeOwnerAccountUuid: bridgeOwnerAccountUuids.get(sessionId),
    bridgeOwnerOrganizationUuid: bridgeOwnerOrganizationUuids.get(sessionId),
    sessionHistorySuppressed: historySuppressed.has(sessionId) ? true : undefined,
    worktreeSession: worktreeStates.get(sessionId),
    artifactCommentMonitor: artifactCommentMonitors.get(sessionId),
    artifactAutoReactLedger: artifactAutoReactLedgers.get(sessionId),
    costState: costStates.get(sessionId),
  };
  if (r !== undefined) {
    let project = currentTranscriptStore().project;
    recordLoadReportSafely(
      $o,
      messages,
      transcript,
      project
        ? {
            writer: project,
            sessionId: e,
          }
        : undefined,
    );
  }
  return $o;
}
//@ chunk-e6aww6q8.js:520628-520756 facade-majority = loadMessageLogs (1)
/**
 * 加载当前项目的会话日志列表并富化。
 */
async function loadMessageLogs(limit, n) {
  let sessionLogs = await fetchLogs(limit, n);
  let { logs: enriched } = await enrichLogs(sessionLogs, 0, sessionLogs.length, n);
  let sorted = sortLogs(enriched);
  sorted.forEach((log, i) => {
    log.value = i;
  });
  return sorted;
}
//@ chunk-e6aww6q8.js:520756-520922 facade-majority
async function findFirstMessageLog(logs, n, storageV5) {
  let s = Buffer.alloc(LITE_READ_BUF_SIZE);
  for (let h of logs) {
    let y = await enrichLog(h, s, storageV5);
    if (!y) continue;
    let S = n(y);
    if (S === "stop") return null;
    if (S) return y;
  }
  return null;
}
//@ chunk-e6aww6q8.js:520922-521054 facade-majority = loadAllProjectsMessageLogs (1)
/**
 * 加载所有项目的会话日志（/resume 全部项目视图）。
 */
async function loadAllProjectsMessageLogs(limit, options) {
  if (options?.skipIndex) return loadAllProjectsMessageLogsFull(limit, options.storageV5);
  return (
    await loadAllProjectsMessageLogsProgressive(
      limit,
      options?.initialEnrichCount ?? DEFAULT_LOG_PAGE_SIZE,
      options?.storageV5,
    )
  ).logs;
}
//@ chunk-e6aww6q8.js:521054-521065 layout
var LOG_LIST_CONCURRENCY = 64;
//@ chunk-e6aww6q8.js:521065-521368 layout
async function listTranscriptProjectKeys(e) {
  let n = new Set();
  let r;
  let s = 0;
  try {
    do {
      let h = await e.listEntries(
        {
          namespace: "transcript",
        },
        {
          skipScopeStats: true,
          ...(r !== undefined && {
            cursor: r,
          }),
        },
      );
      if (!h.ok) return;
      for (let item of h.value.items) {
        let S = listedProjectKey(item, isValidKeySegment);
        if (S !== undefined) n.add(S);
      }
      r = h.value.cursor;
    } while (r && ++s < LOG_LIST_CONCURRENCY);
    if (r) return;
  } catch {
    return;
  }
  return [...n];
}
//@ chunk-e6aww6q8.js:521368-522159 fingerprint = loadAllProjectsMessageLogsFull (0.838)
async function loadAllProjectsMessageLogsFull(limit, storageV5) {
  let projectsDir = getProjectsDir();
  let s = isStorageV5Enabled() && storageV5 ? await listTranscriptProjectKeys(storageV5) : undefined;
  if (storageV5 && s !== undefined) {
    let results = await Promise.all(
      s.map((ke) =>
        getLogsWithoutIndex(join(projectsDir, ke), limit, {
          backend: storageV5,
          projectKey: ke,
        }),
      ),
    );
    let Z = new Map();
    for (let ke of results.flat()) {
      let we = `${ke.sessionId ?? ""}:${ke.leafUuid ?? ""}`;
      let Ee = Z.get(we);
      if (!Ee || ke.modified.getTime() > Ee.modified.getTime()) Z.set(we, ke);
    }
    let Se = sortLogs([...Z.values()]);
    Se.forEach((ke, value) => {
      ke.value = value;
    });
    return Se;
  }
  if (isDiskless()) return [];
  let dirents;
  try {
    dirents = await readdir(projectsDir, {
      withFileTypes: true,
    });
  } catch {
    return [];
  }
  let projectDirs = dirents
    .filter((dirent) => dirent.isDirectory())
    .map((dirent) => join(projectsDir, dirent.name));
  let w = (await Promise.all(projectDirs.map((projectDir) => getLogsWithoutIndex(projectDir, limit)))).flat();
  let deduped = new Map();
  for (let log of w) {
    let key = `${log.sessionId ?? ""}:${log.leafUuid ?? ""}`;
    let existing = deduped.get(key);
    if (!existing || log.modified.getTime() > existing.modified.getTime()) deduped.set(key, log);
  }
  let sorted = sortLogs([...deduped.values()]);
  sorted.forEach((log, i) => {
    log.value = i;
  });
  return sorted;
}
//@ chunk-e6aww6q8.js:522159-522662 facade-majority = loadAllProjectsMessageLogsProgressive (0.915)
/**
 * 分批渐进加载所有项目的会话日志，默认每批 50。
 */
async function loadAllProjectsMessageLogsProgressive(
  limit,
  initialEnrichCount = DEFAULT_LOG_PAGE_SIZE,
  storageV5,
) {
  let projectsDir = getProjectsDir();
  let h = isStorageV5Enabled() && storageV5 ? await listTranscriptProjectKeys(storageV5) : undefined;
  let y;
  if (h !== undefined) y = h.map((q) => join(projectsDir, q));
  else if (isDiskless())
    return {
      logs: [],
      allStatLogs: [],
      nextIndex: 0,
    };
  else {
    let dirents;
    try {
      dirents = await readdir(projectsDir, {
        withFileTypes: true,
      });
    } catch {
      return {
        logs: [],
        allStatLogs: [],
        nextIndex: 0,
      };
    }
    y = dirents.filter((dirent) => dirent.isDirectory()).map((dirent) => join(projectsDir, dirent.name));
  }
  let rawLogs = await Promise.all(
    y.map((dirent) => getSessionFilesLite(dirent, limit, undefined, storageV5)),
  );
  let sorted = latestLogPerSession(rawLogs.flat());
  let { logs, nextIndex } = await enrichLogs(sorted, 0, initialEnrichCount, storageV5);
  sortLogs(logs).forEach((log, i) => {
    log.value = i;
  });
  return {
    logs,
    allStatLogs: sorted,
    nextIndex,
  };
}
//@ chunk-e6aww6q8.js:522662-522726 facade-majority = loadMessageLogs (1)
async function loadSameRepoMessageLogs(worktreePaths, limit, initialEnrichCount = DEFAULT_LOG_PAGE_SIZE, s) {
  return (await loadSameRepoMessageLogsProgressive(worktreePaths, limit, initialEnrichCount, s)).logs;
}
//@ chunk-e6aww6q8.js:522726-523031 facade-majority = loadSameRepoMessageLogsProgressive (1)
/**
 * 渐进加载同一仓库（含其 worktree）的会话日志。
 */
async function loadSameRepoMessageLogsProgressive(
  worktreePaths,
  limit,
  initialEnrichCount = DEFAULT_LOG_PAGE_SIZE,
  storageV5,
) {
  logForDebugging(
    `/resume: loading sessions for cwd=${getOriginalCwd()}, worktrees=[${worktreePaths.join(", ")}]`,
  );
  let allStatLogs = await getStatOnlyLogsForWorktrees(worktreePaths, limit, storageV5);
  logForDebugging(`/resume: found ${allStatLogs.length} session files on disk`);
  let { logs, nextIndex } = await enrichLogs(allStatLogs, 0, initialEnrichCount, storageV5);
  sortLogs(logs).forEach((log, i) => {
    log.value = i;
  });
  return {
    logs,
    allStatLogs,
    nextIndex,
  };
}
//@ chunk-e6aww6q8.js:523031-525836 fingerprint = getStatOnlyLogsForWorktrees (0.327)
/**
 * 为各 worktree 对应的项目目录列出会话文件（只 stat 不读内容）。
 */
async function getStatOnlyLogsForWorktrees(worktreePaths, n, r) {
  let projectsDir = getProjectsDir();
  let cwd = getOriginalCwd();
  let y;
  let S = (Et) => (y ??= listTranscriptProjectKeys(Et));
  let w = normalizeSlashesForCompare;
  let projectDir = w(cwd);
  let G = worktreePaths
    .filter((Et) => {
      let yt = w(Et);
      return projectDir === yt || projectDir.startsWith(yt + "/");
    })
    .sort((Et, yt) => yt.length - Et.length)[0];
  let Z = uniq(
    (await Promise.all((G && G !== cwd ? [cwd, G] : [cwd]).map((Et) => readSessionAliases(Et, r)))).flat(),
  );
  let Se =
    Z.length > 0
      ? (await Promise.all(Z.map((Et) => getSessionFilesLite(Et, n, undefined, r)))).flat().map((Et) => ({
          ...Et,
          isAlias: true,
        }))
      : [];
  if (worktreePaths.length <= 1) {
    let projectDir = getProjectDir(cwd);
    let sessionFilesLite = await getSessionFilesLite(projectDir, undefined, cwd, r);
    let gt =
      UNSAFE_PATH_CHAR_PATTERN.test(cwd) && (await allLogsShareCwd(sessionFilesLite, cwd, r))
        ? await getSessionFilesLite_2(cwd, projectDir, n, false, undefined, r, S)
        : [];
    let At = G ?? cwd;
    let It = false;
    let qt = `${sanitizePath(At)}--claude-worktrees-`;
    let Zt = [];
    let rn = isStorageV5Enabled() && r ? await S(r) : undefined;
    if (rn !== undefined)
      Zt = (
        await Promise.all(
          rn
            .filter((pn) => pn.startsWith(qt))
            .map((pn) => getSessionFilesLite(join(projectsDir, pn), n, undefined, r)),
        )
      ).flat();
    else if (!isDiskless())
      try {
        let pn = await readdir(projectsDir, {
          withFileTypes: true,
        });
        Zt = (
          await Promise.all(
            pn
              .filter((no) => no.isDirectory() && no.name.startsWith(qt))
              .map((no) => getSessionFilesLite(join(projectsDir, no.name), n, undefined, r)),
          )
        ).flat();
      } catch (error) {
        logForDebugging(`Failed to sweep .claude/worktrees project dirs under ${projectsDir}: ${error}`);
      }
    if (Se.length > 0 || gt.length > 0 || Zt.length > 0)
      return latestLogPerSession([...sessionFilesLite, ...gt, ...Zt, ...Se]);
    return sessionFilesLite;
  }
  let ke = false;
  let indexed = worktreePaths.map((wt) => {
    let sanitized = getProjectKey(wt);
    let gt = ke ? sanitized.toLowerCase() : sanitized;
    return {
      path: wt,
      exactName: gt,
      truncatedPrefix:
        sanitized.length > MAX_SANITIZED_LENGTH ? gt.slice(0, MAX_SANITIZED_LENGTH) : undefined,
    };
  });
  indexed.sort((Et, yt) => yt.exactName.length - Et.exactName.length);
  let seenDirs = new Set();
  let Ae;
  let Ie = isStorageV5Enabled() && r ? await S(r) : undefined;
  if (Ie !== undefined) Ae = Ie;
  else {
    let Et;
    try {
      if (isDiskless()) throw Error("not read in a diskless session");
      Et = await readdir(projectsDir, {
        withFileTypes: true,
      });
    } catch (error) {
      logForDebugging(
        `Failed to read projects dir ${projectsDir}, falling back to current project: ${error}`,
      );
      let projectDir = getProjectDir(getOriginalCwd());
      let sessionFilesLite = await getSessionFilesLite(projectDir, n, getOriginalCwd(), r);
      return Se.length > 0 ? latestLogPerSession(sessionFilesLite.concat(Se)) : sessionFilesLite;
    }
    Ae = Et.filter((yt) => yt.isDirectory()).map((yt) => yt.name);
  }
  let Me = G === undefined ? [cwd, ...worktreePaths] : worktreePaths;
  let We = [];
  if (G === undefined) {
    let projectDir = getProjectDir(cwd);
    let yt = basename(projectDir);
    seenDirs.add(ke ? yt.toLowerCase() : yt);
    We.push({
      projectDir,
      wtPath: cwd,
    });
  }
  for (let dirent of Ae) {
    let yt = ke ? dirent.toLowerCase() : dirent;
    if (seenDirs.has(yt)) continue;
    for (let { path: wtPath, exactName, truncatedPrefix } of indexed)
      if (
        yt === exactName ||
        (truncatedPrefix !== undefined
          ? yt.startsWith(truncatedPrefix + "-") &&
            (await dirBelongsToProject(
              join(projectsDir, dirent),
              wtPath,
              ke,
              wrapStorageSource(getTranscriptStorageContext(r)),
            ))
          : exactName.length < MAX_SANITIZED_LENGTH && yt.startsWith(exactName + "-"))
      ) {
        seenDirs.add(yt);
        We.push({
          projectDir: join(projectsDir, dirent),
          wtPath,
        });
        break;
      }
  }
  let results = await Promise.all(
    We.map(({ projectDir, wtPath }) => getSessionFilesLite(projectDir, undefined, wtPath, r, Me)),
  );
  let lt = new Map();
  for (let idx = 0; idx < We.length; idx++) {
    let wtPath = We[idx].wtPath;
    let gt = lt.get(wtPath) ?? [];
    gt.push(...results[idx]);
    lt.set(wtPath, gt);
  }
  let Je = [];
  for (let Et of Me)
    if (UNSAFE_PATH_CHAR_PATTERN.test(Et) && (await allLogsShareCwd(lt.get(Et) ?? [], Et, r, Me)))
      Je.push(Et);
  let nt = Je.length > 0 ? await listProjectDirs(r, S) : [];
  let results_2 = await Promise.all(
    Je.map(async (Et) => {
      let yt = Et;
      try {
        if (isStorageV5Enabled() && r !== undefined) {
          let gt = await makeWorkspaceRealPath(r)(Et);
          if (gt.ok && gt.value.found) yt = identity(gt.value.path);
          else if (!gt.ok)
            logForDebugging(
              `/resume: worktree path not resolved through the storage backend (${formatStorageError(gt.error)}); using it as registered`,
            );
        } else yt = identity(await realpath(Et));
      } catch {}
      return getSessionFilesLite_2(yt, getProjectDir(Et), n, true, nt, r);
    }),
  );
  return latestLogPerSession(results.flat().concat(results_2.flat(), Se));
}
//@ chunk-e6aww6q8.js:525836-525869 layout
function normalizeSlashesForCompare(e) {
  return normalizePathForCwdCompare(e, false);
}
//@ chunk-e6aww6q8.js:525869-525897 layout
var UNSAFE_PATH_CHAR_PATTERN = /[^a-zA-Z0-9/\\:-]/;
//@ chunk-e6aww6q8.js:525897-526006 layout
async function allLogsShareCwd(sessionFilesLite, n, r, s) {
  let h = Buffer.alloc(LITE_READ_BUF_SIZE);
  for (let y of sessionFilesLite) if (!(await logCwdMatches(y, n, h, r, s))) return false;
  return true;
}
//@ chunk-e6aww6q8.js:526006-526222 layout
async function logCwdMatches(e, n, buf, s, h) {
  if (!e.fullPath) return false;
  let liteMetadata = await readLiteMetadata(e.fullPath, e.fileSize ?? 0, buf, s);
  let S = liteMetadata.relocatedCwd ?? liteMetadata.headCwdStrict;
  if (S === undefined) return false;
  if (recordedCwdIsWithinOwnWorktrees(S, h, slugCollisionGuardFoldsCase())) return false;
  return recordedCwdCollidesWithProjectResolved(
    S,
    n,
    slugCollisionGuardFoldsCase(),
    hasUntouchableRecordSpellingAsync,
    getRealPathOptions(s),
  );
}
//@ chunk-e6aww6q8.js:526222-526233 layout
var PROJECT_SCAN_CONCURRENCY = 32;
//@ chunk-e6aww6q8.js:526233-526820 layout
async function listProjectDirs(e, n) {
  let projectsDir = getProjectsDir();
  let s;
  let h = isStorageV5Enabled() && e ? await (n ?? listTranscriptProjectKeys)(e) : undefined;
  if (h !== undefined) s = h;
  else if (isDiskless()) return [];
  else {
    let w;
    try {
      w = await readdir(projectsDir, {
        withFileTypes: true,
      });
    } catch {
      return [];
    }
    s = w.filter((L) => L.isDirectory()).map((L) => L.name);
  }
  let y = limitConcurrency(PROJECT_SCAN_CONCURRENCY, async (w) => {
    let L = join(projectsDir, w);
    let q = [...(await getSessionFilesWithMtime(L, e)).values()].sort((Se, ke) => ke.mtime - Se.mtime)[0];
    if (!q) return null;
    let buf = Buffer.allocUnsafe(LITE_READ_BUF_SIZE);
    try {
      let liteMetadata = await readLiteMetadata(q.path, q.size, buf, e);
      let ke = liteMetadata.relocatedCwd ?? liteMetadata.headCwdStrict;
      if (ke)
        return {
          projectDir: L,
          recordedCwd: normalizeSlashesForCompare(ke),
        };
    } catch {}
    return null;
  });
  return (await Promise.all(s.map((w) => y(w)))).filter((w) => w !== null);
}
//@ chunk-e6aww6q8.js:526820-527428 layout = getSessionFilesLite (0.917)
/**
 * 读取会话文件头尾得到 lite 日志（首条提示、标题、分支、cwd 等），不解析整份文件。
 */
async function getSessionFilesLite_2(e, projectDir, r, s = false, h, y, S) {
  let w = h ?? (await listProjectDirs(y, S));
  let L = normalizeSlashesForCompare(e);
  let logs = [];
  for (let { projectDir: projectDir_2, recordedCwd } of w) {
    if (projectDir_2 === projectDir) continue;
    if (recordedCwd !== L && !(s && recordedCwd.startsWith(L + "/"))) continue;
    let entries = [...(await getSessionFilesWithMtime(projectDir_2, y)).entries()].sort(
      (Ee, Ae) => Ae[1].mtime - Ee[1].mtime,
    );
    if (r && entries.length > r) entries = entries.slice(0, r);
    for (let [sessionId, fileInfo] of entries)
      logs.push({
        date: new Date(fileInfo.mtime).toISOString(),
        messages: [],
        isLite: true,
        fullPath: fileInfo.path,
        value: 0,
        created: new Date(fileInfo.ctime),
        modified: new Date(fileInfo.mtime),
        firstPrompt: "",
        messageCount: 0,
        fileSize: fileInfo.size,
        isSidechain: false,
        sessionId,
        projectPath: e,
      });
  }
  let sorted = sortLogs(logs);
  sorted.forEach((log, i) => {
    log.value = i;
  });
  return sorted;
}
//@ chunk-e6aww6q8.js:527428-527441 facade-majority
var QUEUED_ROWS_WAIT_MS = 2000;
//@ chunk-e6aww6q8.js:527441-527861 layout
function drainQueuedAgentRows(e, signal) {
  let { project, writerHealth } = currentTranscriptStore();
  let startTime = performance.now();
  let failureSeq = writerHealth.failureSeq;
  return e
    .reduce(
      (acc, L) => acc ?? project?.drainQueuedRows(getAgentTranscriptPath(L), QUEUED_ROWS_WAIT_MS, signal),
      undefined,
    )
    ?.then((w) => {
      let waitMs = Math.round(performance.now() - startTime);
      if (w === "timed_out")
        logFeatureSad("transcript_queued_agent_rows", "timed_out", {
          wait_ms: waitMs,
        });
      else if (writerHealth.failureSeq !== failureSeq)
        logFeatureSad("transcript_queued_agent_rows", "write_failed", {
          wait_ms: waitMs,
        });
      else
        logFeatureOk("transcript_queued_agent_rows", {
          wait_ms: waitMs,
        });
    });
}
//@ chunk-e6aww6q8.js:527861-528776 facade-majority
/**
 * 读取子代理转录，校验路径在项目目录内，返回消息与状态。
 */
async function getAgentTranscript(agentId, storageV5, r) {
  let s = r?.alreadyWaited ? undefined : drainQueuedAgentRows([agentId], r?.signal);
  if (s !== undefined) await s;
  let agentTranscript = await getAgentTranscript_2(agentId, storageV5);
  let project = getProject();
  if (agentTranscript.transcript) {
    if (r?.trustLocal || !project.mustVerifyAgentTranscript(agentId)) return agentTranscript.transcript;
    let G = await project.hydrateAgentTranscriptOnDemand(agentId, storageV5, r?.signal, true);
    if (G !== "hit") return agentTranscript.transcript;
    let agentTranscript_2 = await getAgentTranscript_2(agentId, storageV5);
    if (!agentTranscript_2.transcript)
      logForDiagnosticsNoPII("warn", "agent_transcript_unresumable", {
        reason: agentTranscript_2.miss,
        fetch: G,
      });
    return agentTranscript_2.transcript;
  }
  if (!project.hasInternalAgentEventReader()) return null;
  let S =
    agentTranscript.miss === "absent" ||
    agentTranscript.miss === "inaccessible" ||
    (agentTranscript.miss !== "load_threw" &&
      !agentTranscript.hasContent &&
      !(await transcriptFileHasContentEntry(getAgentTranscriptPath(agentId), storageV5)));
  let w = "skipped";
  let reason = agentTranscript.miss;
  if (S) {
    try {
      w = await project.hydrateAgentTranscriptOnDemand(agentId, storageV5, r?.signal);
    } catch (error) {
      if (!(error instanceof AgentTranscriptFetchError) || !project.hasWrittenAgentLocally(agentId))
        throw error;
      w = error.outcome;
    }
    if (w !== "unsafe_id") {
      let agentTranscript = await getAgentTranscript_2(agentId, storageV5);
      if (agentTranscript.transcript) return agentTranscript.transcript;
      reason = agentTranscript.miss;
    }
  }
  logForDiagnosticsNoPII("warn", "agent_transcript_unresumable", {
    reason,
    fetch: w,
  });
  return null;
}
//@ chunk-e6aww6q8.js:528776-530489 callgraph-fingerprint = getAgentTranscript (0.182)
async function getAgentTranscript_2(agentId, n) {
  let hasContent = false;
  let s = (miss) => ({
    transcript: null,
    miss,
    hasContent,
  });
  let agentFile = getAgentTranscriptPath(agentId);
  let y = n === undefined ? undefined : transcriptStorageKeyForPath(agentFile);
  let S =
    !isStorageV5Enabled() || n === undefined || y === undefined
      ? undefined
      : {
          storageV5: {
            backend: n,
            key: y,
          },
        };
  if (isStorageV5Enabled() && n !== undefined && S === undefined)
    logForDebugging(
      "getAgentTranscript: agent transcript path is outside the storage keyspace; reading it raw",
    );
  try {
    let transcriptFile = await loadTranscriptFile(agentFile, S);
    if (transcriptFile.servedBy === "absent") {
      logForDebugging("getAgentTranscript: the storage backend does not hold this agent transcript");
      return s("absent");
    }
    if (transcriptFile.servedBy === "inaccessible") {
      logForDebugging(
        "getAgentTranscript: the storage backend cannot serve this agent transcript (permission); not resumable",
      );
      return s("inaccessible");
    }
    let { messages, agentContentReplacements, forkContextRefs } = transcriptFile;
    for (let We of messages.values())
      if (isConversationEntry(We)) {
        hasContent = true;
        break;
      }
    let agentMessages = Array.from(messages.values()).filter(
      (msg) => msg.agentId === agentId && msg.isSidechain,
    );
    if (agentMessages.length === 0)
      return s(transcriptFile.servedBy === undefined && messages.size === 0 ? "absent" : "no_agent_messages");
    let parentUuids = new Set(agentMessages.map((msg) => msg.parentUuid));
    let leafMessage = findLatestMessage(
      agentMessages,
      (msg) =>
        !parentUuids.has(msg.uuid) &&
        !(msg.type === "system" && "subtype" in msg && msg.subtype === "compact_boundary"),
    );
    if (!leafMessage) return s("no_leaf");
    let mapped = buildConversationChain(messages, leafMessage)
      .filter((msg) => msg.agentId === agentId)
      .map(({ isSidechain, parentUuid, promptId, ...msg }) => withoutTaskProducerMark(msg));
    let Ie = forkContextRefs.get(agentId);
    return {
      transcript: {
        messages: Ie === undefined ? mapped : (await hydrateForkContext(Ie, undefined, n)).concat(mapped),
        contentReplacements: agentContentReplacements.get(agentId) ?? [],
      },
    };
  } catch (error) {
    if (S !== undefined) {
      let cause =
        error instanceof Error && typeof error.cause === "object" && error.cause !== null ? error.cause : {};
      logForDebugging(
        cause.failureClass === undefined
          ? "getAgentTranscript: cannot resume this agent transcript flag-on (thrown while loading)"
          : `getAgentTranscript: the storage backend cannot serve this agent transcript (${[cause.failureClass, cause.telemetryCode].filter((msg) => msg !== undefined).join("/")}); not resumable`,
      );
    }
    return s("load_threw");
  }
}
//@ chunk-e6aww6q8.js:530489-530758 facade-majority = extractAgentIdsFromMessages (1)
function extractAgentIdsFromMessages(messages) {
  let agentIds = [];
  for (let message of messages)
    if (
      message.type === "progress" &&
      message.data &&
      typeof message.data === "object" &&
      "type" in message.data &&
      (message.data.type === "agent_progress" || message.data.type === "skill_progress") &&
      "agentId" in message.data &&
      typeof message.data.agentId === "string"
    )
      agentIds.push(message.data.agentId);
  return uniq(agentIds);
}
//@ chunk-e6aww6q8.js:530758-531129 facade-majority
async function loadSubagentTranscripts(e, n) {
  let filtered = e.filter(isSafeIdSegment);
  let s = drainQueuedAgentRows(filtered.map(identityAgentId2));
  if (s !== undefined) await s;
  let results = await Promise.all(
    filtered.map(async (agentId) => {
      try {
        let result = await getAgentTranscript(identityAgentId2(agentId), n, {
          alreadyWaited: true,
          trustLocal: true,
        });
        if (result && result.messages.length > 0)
          return {
            agentId,
            transcript: result.messages,
          };
        return null;
      } catch {
        return null;
      }
    }),
  );
  return Object.fromEntries(results.filter((y) => y !== null).map((y) => [y.agentId, y.transcript]));
}
//@ chunk-e6aww6q8.js:531129-531201 facade-majority
async function loadAllSubagentTranscriptsFromDisk(storageV5) {
  return loadSubagentTranscripts(
    await listSubagentIdsFromDisk(isStorageV5Enabled() && storageV5 !== undefined ? storageV5 : undefined),
    storageV5,
  );
}
//@ chunk-e6aww6q8.js:531201-531221 layout
var EMPTY_SET = new Set([]);
//@ chunk-e6aww6q8.js:531221-531304 callgraph-fingerprint = isTranscriptMessage (0.461)
function isTranscriptMessage_2(entry) {
  return entry.type === "attachment" && entry.attachment?.type === "fork_briefing";
}
//@ chunk-e6aww6q8.js:531304-531699 facade-majority = isLoggableMessage (0.611)
/**
 * 该消息是否应写入转录（过滤 progress、部分 attachment 与 hook 系统消息）。
 */
function isLoggableMessage(m) {
  if (m.type === "progress") return false;
  if (
    m.type === "attachment" &&
    m.attachment.type === "hook_success" &&
    !m.attachment.content &&
    !m.attachment.stdout?.trim() &&
    !m.attachment.stderr?.trim()
  )
    return false;
  if (m.type === "attachment" && getUserType() !== "ant" && EMPTY_SET.has(m.attachment.type)) return false;
  if (isLaptopMemoryAttachment(m) && m.attachment.content !== null) return false;
  if (m.type === "system" && "persist" in m && m.persist === false) return false;
  return true;
}
//@ chunk-e6aww6q8.js:531699-531886 facade-majority = countToolCallsSince (1)
function collectReplIds(messages, sinceUuid = new Set()) {
  for (let message of messages)
    if (message.type === "assistant" && Array.isArray(message.message.content)) {
      for (let s of message.message.content)
        if (s.type === "tool_use" && isExactReplToolName(s.name)) sinceUuid.add(s.id);
    }
  return sinceUuid;
}
//@ chunk-e6aww6q8.js:531886-533052 fingerprint = transformMessagesForExternalTranscript (0.544)
function transformMessagesForExternalTranscript(messages, replIds) {
  let r = new Set();
  if (
    messages.some((message) => message.type === "assistant" && message.resumedFromIncompleteThinking === true)
  )
    for (let { fromIdx, toIdx } of findResumedThinkingRanges(messages))
      for (let y = fromIdx; y <= toIdx; y++) r.add(y);
  return messages.flatMap((m, h) => {
    if (m.type === "assistant" && Array.isArray(m.message.content)) {
      let content = m.message.content;
      let w = content.some((L) => L.type === "tool_use" && isExactReplToolName(L.name))
        ? content.filter((L) => !(L.type === "tool_use" && isExactReplToolName(L.name)))
        : content;
      if (w.length === 0) return [];
      if (m.isVirtual && !r.has(h) && m.virtualInResumeRun !== true) {
        let { isVirtual: _omit, ...rest } = m;
        return [
          {
            ...rest,
            message: {
              ...m.message,
              content: w,
            },
          },
        ];
      }
      if (w !== content)
        return [
          {
            ...m,
            message: {
              ...m.message,
              content: w,
            },
          },
        ];
      return [m];
    }
    if (m.type === "user" && Array.isArray(m.message.content)) {
      let content = m.message.content;
      let w = content.some((L) => L.type === "tool_result" && replIds.has(L.tool_use_id))
        ? content.filter((L) => !(L.type === "tool_result" && replIds.has(L.tool_use_id)))
        : content;
      if (w.length === 0) return [];
      if (m.isVirtual && !r.has(h) && m.virtualInResumeRun !== true) {
        let { isVirtual: _omit, ...rest } = m;
        return [
          {
            ...rest,
            message: {
              ...m.message,
              content: w,
            },
          },
        ];
      }
      if (w !== content)
        return [
          {
            ...m,
            message: {
              ...m.message,
              content: w,
            },
          },
        ];
      return [m];
    }
    if (
      "isVirtual" in m &&
      m.isVirtual &&
      !r.has(h) &&
      ("virtualInResumeRun" in m ? m.virtualInResumeRun !== true : true)
    ) {
      let { isVirtual: _omit, ...rest } = m;
      return [rest];
    }
    return [m];
  });
}
//@ chunk-e6aww6q8.js:533052-533264 facade-majority = loadMessagesFromJsonlPath (0.447)
function toTranscriptEntries(rows, sessionId) {
  let tip = null;
  return cleanMessagesForLogging(rows.slice()).map((s) => {
    let h = {
      ...s,
      cwd: getCwdOrNull() ?? undefined,
      userType: getUserType(),
      sessionId,
      timestamp: s.timestamp,
      version: transcriptVersion(s),
      parentUuid: tip,
      isSidechain: false,
    };
    if (isChainParticipant(s)) tip = s.uuid;
    return h;
  });
}
//@ chunk-e6aww6q8.js:533264-533420 facade-majority = cleanMessagesForLogging (1)
function cleanMessagesForLogging(messages, allMessages = messages) {
  let messages_2 = messages.filter(isLoggableMessage).map((message) => resolveMessageAlias(message));
  if (getUserType() === "ant") return messages_2;
  let replIds =
    allMessages instanceof Set
      ? allMessages
      : typeof allMessages === "function"
        ? allMessages()
        : collectReplIds(allMessages);
  return transformMessagesForExternalTranscript(messages_2, replIds);
}
//@ chunk-e6aww6q8.js:533420-533481 facade-majority
async function getLogByIndex(e, n) {
  return (await loadMessageLogs(undefined, n))[e] || null;
}
//@ chunk-e6aww6q8.js:533481-533530 facade-majority
function findUnresolvedToolUseInTranscript(e, n) {
  return findUnresolvedToolUsesInTranscript(e, [n]).get(n) ?? null;
}
//@ chunk-e6aww6q8.js:533530-533936 facade-majority = countToolCallsSince (1)
function findUnresolvedToolUsesInTranscript(messages, sinceUuid) {
  let r = new Set(sinceUuid);
  let s = new Map();
  for (let message of messages)
    if (message.type === "assistant") {
      let content = message.message.content;
      if (Array.isArray(content)) {
        for (let message_2 of content)
          if (message_2.type === "tool_use" && r.has(message_2.id)) s.set(message_2.id, message);
      }
    } else if (message.type === "user") {
      if (isShutdownInterrupted(message)) continue;
      let content = message.message.content;
      if (Array.isArray(content)) {
        for (let S of content)
          if (S.type === "tool_result" && r.has(S.tool_use_id)) {
            r.delete(S.tool_use_id);
            s.delete(S.tool_use_id);
          }
      }
    }
  return s;
}
//@ chunk-e6aww6q8.js:533936-533998 facade-majority
async function findUnresolvedToolUse(e, n) {
  return (await findUnresolvedToolUses([e], n)).get(e) ?? null;
}
//@ chunk-e6aww6q8.js:533998-534092 facade-majority
async function findUnresolvedToolUses(e, storageV5) {
  if (e.length === 0) return new Map();
  return (await findUnresolvedToolUsesInTranscript_2(e, storageV5))?.found ?? new Map();
}
//@ chunk-e6aww6q8.js:534092-534426 facade-majority
async function findUnresolvedToolUseMessageRows(e, storageV5) {
  let unresolvedToolUsesInTranscript = await findUnresolvedToolUsesInTranscript_2([e], storageV5);
  let s = unresolvedToolUsesInTranscript?.found.get(e);
  if (unresolvedToolUsesInTranscript === null || s === undefined) return null;
  try {
    return {
      holder: s,
      messageRows: assistantMessageRowsInTranscript(unresolvedToolUsesInTranscript.messages, s),
    };
  } catch (error) {
    logForDebugging(
      `findUnresolvedToolUseMessageRows: could not group the rows of tool_use ${e}'s message, restoring the call alone: ${error}`,
      {
        level: "warn",
      },
    );
    return {
      holder: s,
      messageRows: [s],
    };
  }
}
//@ chunk-e6aww6q8.js:534426-535060 facade-majority
function assistantMessageRowsInTranscript(messages, n) {
  let id = n.message.id;
  let s = messages.get(n.uuid);
  if (!id || s === undefined) return [n];
  let h = new Set([s]);
  for (
    let L = s.parentUuid && messages.get(s.parentUuid);
    L && !h.has(L);
    L = L.parentUuid && messages.get(L.parentUuid)
  ) {
    h.add(L);
    if (!isAssistantWithMessageId(L, id) && isUserOrAssistant(L)) break;
  }
  let y = new Map();
  for (let L of messages.values())
    if (L.parentUuid) {
      let G = y.get(L.parentUuid);
      if (G) G.push(L);
      else y.set(L.parentUuid, [L]);
    }
  let S = [s];
  while (S.length > 0) {
    let L = [];
    for (let G of S)
      for (let q of y.get(G.uuid) ?? []) {
        if (h.has(q)) continue;
        h.add(q);
        if (isAssistantWithMessageId(q, id) || !isUserOrAssistant(q)) L.push(q);
      }
    S = L;
  }
  let w = [];
  for (let L of messages.values())
    if (
      L.type === "assistant" &&
      L.message.id === id &&
      (h.has(L) || (L.uuid !== n.uuid && getAssistantToolUseIds(L)))
    )
      w.push(L);
  return w;
}
//@ chunk-e6aww6q8.js:535060-535166 layout = countToolCallsSince (1)
function getAssistantToolUseIds(e) {
  return Array.isArray(e.message.content) && e.message.content.some((block) => block.type === "tool_use");
}
//@ chunk-e6aww6q8.js:535166-535230 layout
function isAssistantWithMessageId(e, id) {
  return e.type === "assistant" && e.message.id === id;
}
//@ chunk-e6aww6q8.js:535230-535291 layout
function isUserOrAssistant(e) {
  return e.type === "user" || e.type === "assistant";
}
//@ chunk-e6aww6q8.js:535291-535795 layout
/**
 * 读取当前转录并找出给定 tool_use id 中尚未有结果的那些，未找到的记调试日志；读取失败返回 null。
 */
async function findUnresolvedToolUsesInTranscript_2(e, n) {
  let transcriptPath;
  try {
    transcriptPath = getTranscriptPath();
    let transcriptStorageKey = getTranscriptStorageKey(transcriptPath, n);
    let { messages } = await loadTranscriptFile(
      transcriptPath,
      transcriptStorageKey && {
        storageV5: transcriptStorageKey,
      },
    );
    let found = findUnresolvedToolUsesInTranscript(messages.values(), e);
    let filtered = e.filter((w) => !found.has(w));
    if (filtered.length > 0)
      logForDebugging(
        `findUnresolvedToolUse: no unresolved tool_use ${filtered.join(", ")} \u2014 not found in transcript or already resolved by a tool_result (${transcriptPath}, ${messages.size} messages)`,
        {
          level: "warn",
        },
      );
    return {
      found,
      messages,
    };
  } catch (error) {
    logForDebugging(
      `findUnresolvedToolUse: failed to read transcript${transcriptPath ? ` ${transcriptPath}` : ""} for tool_use ${e.join(", ")}: ${error}`,
      {
        level: "warn",
      },
    );
    return null;
  }
}
//@ chunk-e6aww6q8.js:535795-536485 facade-majority
async function findDeferredToolMarkerInTranscript(fullPath, storageV5) {
  try {
    let r =
      !isStorageV5Enabled() || storageV5 === undefined
        ? undefined
        : await readTranscriptTailViaStorage(fullPath, 1048576, storageV5).catch(() => {
            return;
          });
    if (r === null) return null;
    let s;
    if (r !== undefined) {
      s = r.content.split(`
`);
      if (r.cut) s.shift();
    } else {
      let w = worktreeFromProgress(fullPath);
      if (w === undefined) return null;
      let { content, bytesRead, bytesTotal } = await tailFile(w, 1048576);
      s = content.split(`
`);
      if (bytesRead < bytesTotal) s.shift();
    }
    let h = null;
    let y = -1;
    for (let idx = s.length - 1; idx >= 0; idx--) {
      let trimmed = s[idx].trim();
      if (!trimmed.includes('"hook_deferred_tool"')) continue;
      let G = jsonParse(trimmed);
      if (G?.type === "attachment" && G.attachment?.type === "hook_deferred_tool") {
        h = G.attachment;
        y = idx;
        break;
      }
    }
    if (!h) return null;
    let S = `"tool_use_id":"${h.toolUseID}"`;
    for (let idx = y + 1; idx < s.length; idx++) if (s[idx].includes(S)) return null;
    return h;
  } catch {
    return null;
  }
}
//@ chunk-e6aww6q8.js:536485-537059 layout
async function listSessionFilesViaStorage(e, n) {
  let r = new Map();
  try {
    return (
      await readAllPages(
        (h) =>
          e.listEntries(
            {
              namespace: "transcript",
              projectKey: n,
            },
            {
              skipScopeStats: true,
              ...(h !== undefined && {
                cursor: h,
              }),
            },
          ),
        (h) => {
          for (let y of h) {
            if (
              y.kind !== "key" ||
              y.key.namespace !== "transcript" ||
              y.key.projectKey !== n ||
              y.key.agentId !== undefined ||
              y.key.agentRelPath !== undefined ||
              y.mtimeMs === undefined
            )
              continue;
            let S = normalizeUuidOrNull(y.key.sessionId);
            if (S === null || r.has(S)) continue;
            let w = validatedTranscriptKey(STORAGE_SPACES.transcript(n, S));
            if (w === undefined) continue;
            r.set(S, {
              key: w,
              mtimeMs: y.mtimeMs,
              createdMs: y.createdMs,
              size: y.size,
            });
          }
        },
        {
          maxPages: LOG_LIST_CONCURRENCY,
        },
      )
    ).status === "done"
      ? r
      : undefined;
  } catch {
    return;
  }
}
//@ chunk-e6aww6q8.js:537059-537303 layout
async function getSessionFilesViaStorage(projectDir, n) {
  let r = basename(projectDir);
  if (dirname(projectDir) !== getProjectsDir() || !isValidKeySegment(r)) return;
  let s = await listSessionFilesViaStorage(n, r);
  if (s === undefined) return;
  let h = new Map();
  for (let [y, S] of s)
    h.set(y, {
      path: join(projectDir, `${y}.jsonl`),
      mtime: S.mtimeMs,
      ctime: S.createdMs ?? S.mtimeMs,
      size: S.size ?? 0,
    });
  return h;
}
//@ chunk-e6aww6q8.js:537303-537861 facade-majority = getSessionFilesWithMtime (1)
/**
 * 列出项目目录中的 .jsonl 会话文件及 mtime。
 */
async function getSessionFilesWithMtime(projectDir, n) {
  let r = isStorageV5Enabled() && n ? await getSessionFilesViaStorage(projectDir, n) : undefined;
  if (r !== undefined) return r;
  if (isDiskless()) return new Map();
  let sessionFilesMap = new Map();
  let dirents;
  try {
    dirents = await readdir(projectDir, {
      withFileTypes: true,
    });
  } catch {
    return sessionFilesMap;
  }
  let candidates = [];
  for (let dirent of dirents) {
    if (!dirent.isFile() || !dirent.name.endsWith(".jsonl")) continue;
    let sessionId = normalizeUuidOrNull(basename(dirent.name, ".jsonl"));
    if (!sessionId) continue;
    candidates.push({
      sessionId,
      filePath: join(projectDir, dirent.name),
    });
  }
  await Promise.all(
    candidates.map(async ({ sessionId, filePath }) => {
      try {
        let st = await stat(filePath);
        sessionFilesMap.set(sessionId, {
          path: filePath,
          mtime: st.mtime.getTime(),
          ctime: st.birthtime.getTime(),
          size: st.size,
        });
      } catch {
        logForDebugging(`Failed to stat session file: ${filePath}`);
      }
    }),
  );
  return sessionFilesMap;
}
//@ chunk-e6aww6q8.js:537861-537872 layout
var DEFAULT_LOG_PAGE_SIZE = 50;
//@ chunk-e6aww6q8.js:537872-539365 facade-majority = loadAllLogsFromSessionFile (0.77)
async function loadAllLogsFromSessionFile(sessionFile, projectPathOverride, r) {
  let {
    messages,
    summaries,
    customTitles,
    endedSessions,
    aiTitles,
    tags,
    relocatedCwds,
    agentNames,
    agentColors,
    agentSettings,
    prNumbers,
    prUrls,
    prRepositories,
    modes,
    permissionModes,
    isolationLatches,
    devModsFolders,
    memoryModeStamps,
    atisLatches,
    toolsUsedLists,
    fileHistorySnapshots,
    fileHistoryDeltas,
    attributionSnapshots,
    contentReplacements,
    leafUuids,
  } = await loadTranscriptFile(
    sessionFile,
    isStorageV5Enabled() && r
      ? {
          keepAllLeaves: true,
          storageV5: r,
        }
      : {
          keepAllLeaves: true,
        },
  );
  if (messages.size === 0) return [];
  let leafMessages = [];
  for (let msg of messages.values()) if (leafUuids.has(msg.uuid)) leafMessages.push(msg);
  let It = groupNonChainChildrenByParent(messages);
  let logs = [];
  for (let leafMessage of leafMessages) {
    let chain = buildConversationChain(messages, leafMessage, It);
    if (chain.length === 0) continue;
    let firstMessage = chain[0];
    let sessionId = leafMessage.sessionId;
    logs.push({
      date: leafMessage.timestamp,
      messages: removeExtraFields(chain),
      fullPath: sessionFile,
      value: 0,
      created: new Date(firstMessage.timestamp),
      modified: new Date(leafMessage.timestamp),
      ...getFirstPromptInfo(chain),
      messageCount: countVisibleMessages(chain),
      isSidechain: firstMessage.isSidechain ?? false,
      sessionId,
      leafUuid: leafMessage.uuid,
      summary: summaries.get(leafMessage.uuid),
      customTitle: customTitles.get(sessionId),
      ...withEndedByModel({}, endedSessions.has(sessionId)),
      aiTitle: aiTitles.get(sessionId),
      tag: tags.get(sessionId),
      relocatedCwd: relocatedCwds.get(sessionId),
      agentName: agentNames.get(sessionId),
      agentColor: agentColors.get(sessionId),
      agentSetting: agentSettings.get(sessionId),
      mode: modes.get(sessionId),
      permissionMode: permissionModes.get(sessionId),
      isolationLatch: isolationLatches.get(sessionId),
      devModsFolder: devModsFolders?.get(sessionId),
      memoryModeStamps: memoryModeStamps.get(sessionId) ?? [],
      atisLatch: getOrEmptyString(atisLatches, sessionId),
      toolsUsed: toolsUsedLists?.get(sessionId),
      prNumber: prNumbers.get(sessionId),
      prUrl: prUrls.get(sessionId),
      prRepository: prRepositories.get(sessionId),
      gitBranch: leafMessage.gitBranch,
      projectPath: projectPathOverride ?? firstMessage.cwd,
      fileHistorySnapshots: buildFileHistorySnapshots(fileHistorySnapshots, fileHistoryDeltas, chain),
      attributionSnapshots: buildAttributionSnapshotChain(attributionSnapshots, chain),
      contentReplacements: contentReplacements.get(sessionId) ?? [],
    });
  }
  return logs;
}
//@ chunk-e6aww6q8.js:539365-539514 layout
async function getSessionFileEntriesViaStorage(e, backend, projectKey) {
  let s = await listSessionFilesViaStorage(backend, projectKey);
  return s === undefined
    ? undefined
    : Array.from(s, ([h, y]) => ({
        path: join(e, `${h}.jsonl`),
        mtime: y.mtimeMs,
        key: y.key,
      }));
}
//@ chunk-e6aww6q8.js:539514-540131 fingerprint = getLogsWithoutIndex (0.804)
async function getLogsWithoutIndex(e, limit, r) {
  if (isStorageV5Enabled() && r) {
    let { backend, projectKey } = r;
    let sessionFileEntriesViaStorage = await getSessionFileEntriesViaStorage(e, backend, projectKey);
    if (sessionFileEntriesViaStorage !== undefined) {
      if (sessionFileEntriesViaStorage.length === 0) return [];
      let G =
        limit && sessionFileEntriesViaStorage.length > limit
          ? [...sessionFileEntriesViaStorage].sort((Z, Se) => Se.mtime - Z.mtime).slice(0, limit)
          : sessionFileEntriesViaStorage;
      let q = [];
      for (let Z of G)
        try {
          let allLogsFromSessionFile = await loadAllLogsFromSessionFile(Z.path, undefined, {
            backend,
            key: Z.key,
          });
          q.push(...allLogsFromSessionFile);
        } catch {
          logForDebugging(`Failed to load session file: ${Z.path}`);
        }
      return q;
    }
  }
  let sessionFilesMap = await getSessionFilesWithMtime(e);
  if (sessionFilesMap.size === 0) return [];
  let filesToProcess;
  if (limit && sessionFilesMap.size > limit)
    filesToProcess = [...sessionFilesMap.values()].sort((S, w) => w.mtime - S.mtime).slice(0, limit);
  else filesToProcess = [...sessionFilesMap.values()];
  let logs = [];
  for (let fileInfo of filesToProcess)
    try {
      let fileLogOptions = await loadAllLogsFromSessionFile(fileInfo.path);
      logs.push(...fileLogOptions);
    } catch {
      logForDebugging(`Failed to load session file: ${fileInfo.path}`);
    }
  return logs;
}
//@ chunk-e6aww6q8.js:540131-541827 fingerprint = readLiteMetadata (0.723)
/**
 * 从文件头尾字节中抽取 lite 元数据：isSidechain、teamName、cwd、首条提示、custom-title、tag 等。
 */
async function readLiteMetadata(e, fileSize, buf, s) {
  let transcriptStorageKey = getTranscriptStorageKey(e, s);
  let { head, tail } =
    transcriptStorageKey === undefined && isDiskless()
      ? {
          head: "",
          tail: "",
        }
      : await readHeadAndTail_2(e, fileSize, buf, wrapStorageSource(transcriptStorageKey));
  if (!head)
    return {
      firstPrompt: "",
      isSidechain: false,
      bookkeepingOnly: false,
    };
  let isSidechain = head.includes('"isSidechain":true') || head.includes('"isSidechain": true');
  let projectPath = extractJsonStringField(head, "cwd");
  let headCwdStrict = extractFieldFromFirstEntryStrict(head, "cwd");
  let teamName = extractJsonStringField(head, "teamName");
  let Z =
    head
      .split(
        `
`,
      )
      .find((line) => line.includes('"parentUuid":')) ?? head;
  let jsonStringField = extractJsonStringField(Z, "sessionKind");
  let sessionKind =
    jsonStringField === "bg" || jsonStringField === "daemon" || jsonStringField === "daemon-worker"
      ? jsonStringField
      : undefined;
  let agentSetting = extractJsonStringField(head, "agentSetting");
  let entrypoint =
    extractJsonStringField(head, "entrypoint") ?? extractLastJsonStringField(tail, "entrypoint");
  let isLoopSession = isLoopCommandSession(head);
  let bookkeepingOnly = !(await transcriptMayContainMarker(e, head, tail, fileSize, s));
  let lastJsonStringField = extractLastJsonStringField(tail, "lastPrompt");
  let We =
    lastJsonStringField ||
    extractFirstPromptFromChunk(head, "stored") ||
    (tail === head ? "" : extractFirstPromptFromChunk(tail, "stored")) ||
    "";
  let found = [
    ...(lastJsonStringField && tail.includes('"pluginPrompt"')
      ? tail
          .split(
            `
`,
          )
          .filter((line) => line.includes('"pluginPrompt"'))
          .reverse()
      : []),
    head.includes('"pluginPrompt"') ? head : "",
  ].find((hn) => hn !== "" && extractFirstPromptFromChunk(hn, "stored") === We);
  let lt = found === undefined ? We : extractFirstPromptFromChunk(found, "shown");
  let lastJsonStringField_2 = extractLastJsonStringField(tail, "customTitle");
  let customTitle = lastJsonStringField_2 ?? extractLastJsonStringField(head, "customTitle");
  let aiTitle = extractLastJsonStringField(tail, "aiTitle") ?? extractLastJsonStringField(head, "aiTitle");
  let summary = findLastFieldInType(tail, "summary", "summary");
  let tag = extractLastJsonStringField(tail, "tag");
  let relocatedCwd = extractFieldFromLastEntryOfTypeStrict(tail, "relocated", "relocatedCwd");
  let gitBranch = extractLastJsonStringField(tail, "gitBranch") ?? extractJsonStringField(head, "gitBranch");
  let prUrl = extractLastJsonStringField(tail, "prUrl");
  let prRepository = extractLastJsonStringField(tail, "prRepository");
  let prNumber;
  let prNumStr = extractLastJsonStringField(tail, "prNumber");
  if (prNumStr) prNumber = parseInt(prNumStr, 10) || undefined;
  if (!prNumber) {
    let prNumMatch = tail.lastIndexOf('"prNumber":');
    if (prNumMatch >= 0) {
      let afterColon = tail.slice(prNumMatch + 11, prNumMatch + 25);
      let num = parseInt(afterColon.trim(), 10);
      if (num > 0) prNumber = num;
    }
  }
  let artifactCount = countFrameLinks(tail);
  let lastMessageAtMs = findLastMessageTimestamp(tail);
  let continuedInSessionId = findContinuedInSessionId(tail);
  return {
    firstPrompt: We,
    ...(lt !== We && {
      firstPromptShown: lt,
    }),
    gitBranch,
    isSidechain,
    projectPath,
    headCwdStrict,
    relocatedCwd,
    teamName,
    sessionKind,
    isLoopSession,
    customTitle,
    customTitleFromTail: lastJsonStringField_2,
    aiTitle,
    summary,
    tag,
    agentSetting,
    entrypoint,
    prNumber,
    prUrl,
    prRepository,
    artifactCount,
    lastMessageAtMs,
    continuedInSessionId,
    bookkeepingOnly,
  };
}
//@ chunk-e6aww6q8.js:541827-541970 layout
var FrameLinkEntrySchema = DoctorLazy(() =>
  create({
    type: create_25("frame-link"),
    frameUrl: create_2().optional().catch(undefined),
    artifactCount: create_3().int().positive().optional().catch(undefined),
  }),
);
//@ chunk-e6aww6q8.js:541970-542380 layout
function countFrameLinks(e) {
  if (!e.includes('"type":"frame-link"')) return;
  let n = 0;
  let r = new Set();
  for (let line of e.split(`
`)) {
    if (!line.includes('"type":"frame-link"')) continue;
    let y;
    try {
      y = jsonParseRaw(line);
    } catch {
      continue;
    }
    let S = FrameLinkEntrySchema().safeParse(y);
    if (!S.success) continue;
    if (S.data.artifactCount !== undefined && S.data.artifactCount > n) n = S.data.artifactCount;
    if (S.data.frameUrl !== undefined) r.add(S.data.frameUrl);
  }
  let max = Math.max(n, r.size);
  return max > 0 ? max : undefined;
}
//@ chunk-e6aww6q8.js:542380-543149 layout
function isLoopCommandSession(chunk) {
  let start = 0;
  while (start < chunk.length) {
    let newlineIdx = chunk.indexOf(
      `
`,
      start,
    );
    let line = newlineIdx >= 0 ? chunk.slice(start, newlineIdx) : chunk.slice(start);
    let y = newlineIdx < 0;
    start = newlineIdx >= 0 ? newlineIdx + 1 : chunk.length;
    if (!line.includes('"type":"user"') && !line.includes('"type": "user"')) continue;
    if (line.includes('"tool_result"')) continue;
    let S;
    try {
      S = jsonParse(line);
    } catch {
      if (y) return line.includes("<command-name>/loop</command-name>");
      continue;
    }
    if (S.type !== "user") continue;
    if (S.isMeta === true || S.isCompactSummary === true) continue;
    let message = S.message;
    if (!message) continue;
    let content = message.content;
    let texts = [];
    if (typeof content === "string") texts.push(content);
    else if (Array.isArray(content)) {
      let q = false;
      for (let Z of content) {
        if (!Z || typeof Z !== "object") continue;
        if (Z.type === "tool_result") {
          q = true;
          break;
        }
        if (Z.type === "text" && typeof Z.text === "string") texts.push(Z.text);
      }
      if (q) continue;
    }
    return texts.some((text) => text.includes("<command-name>/loop</command-name>"));
  }
  return false;
}
//@ chunk-e6aww6q8.js:543149-544523 fingerprint = extractFirstPromptFromChunk (0.719)
function extractFirstPromptFromChunk(chunk, n) {
  let start = 0;
  let hasTickMessages = false;
  let firstCommandFallback = "";
  let firstCommandFallback_2 = "";
  while (start < chunk.length) {
    let newlineIdx = chunk.indexOf(
      `
`,
      start,
    );
    let line = newlineIdx >= 0 ? chunk.slice(start, newlineIdx) : chunk.slice(start);
    start = newlineIdx >= 0 ? newlineIdx + 1 : chunk.length;
    if (!line.includes('"type":"user"') && !line.includes('"type": "user"')) continue;
    if (line.includes('"tool_result"')) continue;
    if (line.includes('"isMeta":true') || line.includes('"isMeta": true')) continue;
    if (line.includes('"isCompactSummary":true') || line.includes('"isCompactSummary": true')) continue;
    try {
      let entry = jsonParse(line);
      if (entry.type !== "user") continue;
      if (entry.isMeta === true || entry.isCompactSummary === true) continue;
      let message = entry.message;
      if (!message) continue;
      let content = message.content;
      let Z =
        n === "shown" && typeof content === "string"
          ? renderPluginPromptColon(content, entry.pluginPrompt)
          : content;
      let Se = Z !== content;
      let texts = [];
      if (typeof Z === "string") texts.push(Z);
      else if (Array.isArray(content))
        for (let block of content) {
          let Ee = block;
          if (Ee.type === "text" && typeof Ee.text === "string") texts.push(Ee.text);
        }
      for (let text of texts) {
        if (!text) continue;
        let result = flattenPastedBlocks(text)
          .replaceAll(
            `
`,
            " ",
          )
          .trim();
        let commandNameTag = Se ? null : extractTag(result, COMMAND_NAME);
        if (commandNameTag) {
          let name = commandNameTag.replace(/^\//, "");
          let commandArgs = extractTag(result, "command-args")?.trim() || "";
          if (require("./chunk-mvgsex7x.js").builtInCommandNames().has(name) || !commandArgs) {
            if (!firstCommandFallback) firstCommandFallback = commandNameTag;
            continue;
          }
          return commandArgs ? `${commandNameTag} ${commandArgs}` : commandNameTag;
        }
        let bashInput = Se ? null : extractTag(result, "bash-input");
        if (bashInput) return `! ${bashInput}`;
        if (SYNTHETIC_USER_TEXT_PATTERN.test(result)) {
          if (result.startsWith(`<${TICK}>`)) hasTickMessages = true;
          continue;
        }
        if (result.length > 200) result = truncateToLength(result, 200).trim() + "\u2026";
        return result;
      }
    } catch {
      if (newlineIdx < 0) {
        let L =
          extractJsonStringFieldPrefix(line, "content", 200) ||
          extractJsonStringFieldPrefix(line, "text", 200);
        if (!SYNTHETIC_USER_TEXT_PATTERN.test(L)) firstCommandFallback_2 = L;
      }
      continue;
    }
  }
  if (firstCommandFallback) return firstCommandFallback;
  if (hasTickMessages) return "Proactive session";
  return firstCommandFallback_2;
}
//@ chunk-e6aww6q8.js:544523-544740 layout
function findLastFieldInType(tail, n, r) {
  let s = `"type":"${n}"`;
  let h = `"${r}":`;
  let y = tail.length;
  while (y > 0) {
    let index = tail.lastIndexOf(
      `
`,
      y - 1,
    );
    let sliced = tail.slice(index + 1, y);
    y = index;
    if (sliced.includes(s) && sliced.includes(h)) {
      let jsonStringField = extractJsonStringField(sliced, r);
      if (jsonStringField !== undefined) return jsonStringField;
    }
    if (index < 0) break;
  }
  return;
}
//@ chunk-e6aww6q8.js:544740-545032 fingerprint = extractJsonStringFieldPrefix (1)
function extractJsonStringFieldPrefix(text, key, maxLen) {
  let patterns = [`"${key}":"`, `"${key}": "`];
  for (let pattern of patterns) {
    let idx = text.indexOf(pattern);
    if (idx < 0) continue;
    let valueStart = idx + pattern.length;
    let i = valueStart;
    let collected = 0;
    while (i < text.length && collected < maxLen) {
      if (text[i] === "\\") {
        i += 2;
        collected++;
        continue;
      }
      if (text[i] === '"') break;
      i++;
      collected++;
    }
    return text.slice(valueStart, i).replaceAll("\\n", " ").replaceAll("\\t", " ").trim();
  }
  return "";
}
//@ chunk-e6aww6q8.js:545032-545254 layout = groupLogsBySessionId (1)
function latestLogPerSession(filteredLogs) {
  let groups = new Map();
  for (let log of filteredLogs) {
    if (!log.sessionId) continue;
    let existing = groups.get(log.sessionId);
    if (!existing || log.modified.getTime() > existing.modified.getTime()) groups.set(log.sessionId, log);
  }
  return sortLogs([...groups.values()]).map((r, value) => ({
    ...r,
    value,
  }));
}
//@ chunk-e6aww6q8.js:545254-545715 facade-majority = getSessionFilesLite (0.952)
async function getSessionFilesLite(projectDir, limit, projectPath, s, ownWorktrees) {
  let entries = [...(await getSessionFilesWithMtime(projectDir, s)).entries()].sort(
    (G, q) => q[1].mtime - G[1].mtime,
  );
  if (limit && entries.length > limit) entries = entries.slice(0, limit);
  let logs = [];
  for (let [sessionId, fileInfo] of entries)
    logs.push({
      date: new Date(fileInfo.mtime).toISOString(),
      messages: [],
      isLite: true,
      fullPath: fileInfo.path,
      value: 0,
      created: new Date(fileInfo.ctime),
      modified: new Date(fileInfo.mtime),
      firstPrompt: "",
      messageCount: 0,
      fileSize: fileInfo.size,
      isSidechain: false,
      sessionId,
      projectPath,
      ownWorktrees,
    });
  let sorted = sortLogs(logs);
  sorted.forEach((log, i) => {
    log.value = i;
  });
  return sorted;
}
//@ chunk-e6aww6q8.js:545715-547898 fingerprint = enrichLog (0.575)
/**
 * 富化单个 lite 日志并过滤：cwd 不同、sidechain、无内容等不显示在 /resume。
 */
async function enrichLog(e, buf, r) {
  if (!e.isLite || !e.fullPath) return e;
  let liteMetadata = await readLiteMetadata(e.fullPath, e.fileSize ?? 0, buf, r);
  let h = liteMetadata.relocatedCwd ?? liteMetadata.headCwdStrict;
  if (
    e.projectPath !== undefined &&
    h !== undefined &&
    !recordedCwdIsWithinOwnWorktrees(h, e.ownWorktrees, slugCollisionGuardFoldsCase()) &&
    (await recordedCwdCollidesWithProjectResolved(
      h,
      e.projectPath,
      slugCollisionGuardFoldsCase(),
      hasUntouchableRecordSpellingAsync,
      getRealPathOptions(r),
    ))
  ) {
    logForDebugging(
      `Session ${e.sessionId} filtered from /resume: recorded cwd is a different directory with the same project slug`,
    );
    return null;
  }
  let y = (Se) => Se;
  let S =
    liteMetadata.projectPath !== undefined &&
    y(dirname(e.fullPath)) === y(getProjectDir(liteMetadata.projectPath));
  let projectPath =
    liteMetadata.relocatedCwd ??
    (S || e.projectPath === undefined ? (liteMetadata.projectPath ?? e.projectPath) : e.projectPath);
  let customTitleFromTail = liteMetadata.customTitleFromTail;
  if (customTitleFromTail === undefined)
    customTitleFromTail =
      (e.sessionId !== undefined ? await readCustomTitle(e.fullPath, e.sessionId, r) : undefined) ??
      liteMetadata.customTitle;
  let G =
    liteMetadata.lastMessageAtMs !== undefined
      ? new Date(Math.min(liteMetadata.lastMessageAtMs, e.modified.getTime()))
      : undefined;
  let q = {
    ...e,
    ...(G !== undefined && {
      date: G.toISOString(),
      modified: G,
    }),
    isLite: false,
    firstPrompt: liteMetadata.firstPrompt,
    ...(liteMetadata.firstPromptShown !== undefined && {
      firstPromptShown: liteMetadata.firstPromptShown,
    }),
    gitBranch: liteMetadata.gitBranch,
    isSidechain: liteMetadata.isSidechain,
    teamName: liteMetadata.teamName,
    sessionKind: liteMetadata.sessionKind,
    customTitle: customTitleFromTail,
    aiTitle: liteMetadata.aiTitle,
    summary: liteMetadata.summary,
    tag: liteMetadata.tag,
    agentSetting: liteMetadata.agentSetting,
    prNumber: liteMetadata.prNumber,
    prUrl: liteMetadata.prUrl,
    prRepository: liteMetadata.prRepository,
    artifactCount: liteMetadata.artifactCount,
    projectPath,
  };
  if (!q.firstPrompt && !q.customTitle && !q.aiTitle) q.firstPrompt = "(session)";
  if (q.isSidechain) {
    logForDebugging(`Session ${e.sessionId} filtered from /resume: isSidechain=true`);
    return null;
  }
  if (q.teamName) {
    logForDebugging(`Session ${e.sessionId} filtered from /resume: teamName=${q.teamName}`);
    return null;
  }
  if (liteMetadata.continuedInSessionId !== undefined) {
    q.continuedInSessionId = liteMetadata.continuedInSessionId;
    if (await getTranscriptPathForSession_2(e.fullPath, liteMetadata.continuedInSessionId, r)) {
      logForDebugging(
        `Session ${e.sessionId} filtered from /resume: continued in ${liteMetadata.continuedInSessionId}`,
      );
      q.superseded = true;
    }
  }
  if (liteMetadata.bookkeepingOnly) q.bookkeepingOnly = true;
  if (q.sessionKind === "daemon" || q.sessionKind === "daemon-worker") {
    logForDebugging(`Session ${e.sessionId} filtered from /resume: sessionKind=${q.sessionKind}`);
    return null;
  }
  let Z = PROGRAMMATIC_ENTRYPOINTS.has(entrypointEnv() ?? "");
  if (!Z && PROGRAMMATIC_ENTRYPOINTS.has(liteMetadata.entrypoint ?? "")) {
    logForDebugging(`Session ${e.sessionId} filtered from /resume: entrypoint=${liteMetadata.entrypoint}`);
    return null;
  }
  if (!Z && liteMetadata.isLoopSession) {
    logForDebugging(`Session ${e.sessionId} filtered from /resume: /loop session`);
    return null;
  }
  return q;
}
//@ chunk-e6aww6q8.js:547898-548224 facade-majority = enrichLogs (0.969)
/**
 * 批量富化 lite 日志，记录过滤计数（/resume: enriched … filtered out … visible）。
 */
async function enrichLogs(allLogs, startIndex, count, s) {
  let result = [];
  let readBuf = Buffer.alloc(LITE_READ_BUF_SIZE);
  let i = startIndex;
  while (i < allLogs.length && result.length < count) {
    let log = allLogs[i];
    i++;
    let enriched = await enrichLog(log, readBuf, s);
    if (enriched && !enriched.superseded) result.push(enriched);
  }
  let scanned = i - startIndex;
  let filtered = scanned - result.length;
  if (filtered > 0)
    logForDebugging(
      `/resume: enriched ${scanned} sessions, ${filtered} filtered out, ${result.length} visible (${allLogs.length - i} remaining on disk)`,
    );
  return {
    logs: result,
    nextIndex: i,
  };
}
//@ chunk-e6aww6q8.js:1737819-1738199 fingerprint = METADATA_TYPE_MARKERS (0.44)
/**
 * MAX_FIRST_MESSAGE_CHARS：首条消息截断长度（200）；MAX_SESSION_DESCRIPTORS：会话描述条数上限（60）；COMMAND_NAME_RE：transcript 里的斜杠命令名（同一声明共 13 个绑定）。
 */
var MAX_METADATA_SCAN_BYTES = 52428800;
var MAX_FIRST_MESSAGE_CHARS = 200;
var MAX_SESSION_DESCRIPTORS = 60;
var COMMAND_NAME_RE = /<command-name>\/([\w:-]+)<\/command-name>/g;
var MCP_TOOL_USE_NAME_RE = /"name":"mcp__([^"]+?)__([^"]+)"/g;
var COMMAND_NAME_CONTENT_MARKER = '"content":"<command-name>/';
var COMMAND_MESSAGE_CONTENT_MARKER = '"content":"<command-message>';
var TOOL_USE_TYPE_MARKER = '"type":"tool_use"';
var CUSTOM_TITLE_TYPE_MARKER = '"type":"custom-title"';
var PR_LINK_TYPE_MARKER = '"type":"pr-link"';
var USER_ROLE_MARKER = '"role":"user"';
var CUSTOM_TITLE_RE = /"customTitle":"([^"]+)"/;
var PR_NUMBER_RE = /"prNumber":(\d+)/;
var USER_CONTENT_RE = /"role":"user"[^}]*"content":"([^"]+)"/;
//@ chunk-e6aww6q8.js:4338628-4338664 fingerprint = appendEntryToFile (0.638)
function appendEntryToFile() {
  getFsImplementation().mkdirSync(getPluginsDirectory());
}
//@ chunk-qzv7ezvq.js:590-630 facade-exports = getProjectsDir (1)
/**
 * <配置目录>/projects：所有项目转录目录的父目录。
 */
function getProjectsDir() {
  return join(getClaudeConfigDir(), "projects");
}
//@ chunk-qzv7ezvq.js:630-676 facade-exports
function getProjectKeyIfRepresentable(t) {
  return dirname(t) === getProjectsDir() ? basename(t) : undefined;
}
//@ chunk-qzv7ezvq.js:676-819 facade-exports
function projectKeyOf(t) {
  if (typeof t === "string") return getProjectKeyIfRepresentable(t);
  let { scope } = t;
  return scope.namespace === "transcript" && scope.sessionId === undefined ? scope.projectKey : undefined;
}
//@ chunk-qzv7ezvq.js:819-1121 layout
class ProjectDirCacheState {
  projectDirCache = new Map();
  agentTranscriptSubdirs = new Map();
  cacheProjectDir(t, e) {
    this.projectDirCache.set(t, e);
  }
  clearProjectDirCache() {
    this.projectDirCache.clear();
  }
  setAgentTranscriptSubdir(t, e) {
    this.agentTranscriptSubdirs.set(t, e);
  }
  clearAgentTranscriptSubdir(t) {
    this.agentTranscriptSubdirs.delete(t);
  }
}
//@ chunk-qzv7ezvq.js:1121-1144 layout
var projectDirCacheByHost = new HostScoped(() => new ProjectDirCacheState());
//@ chunk-qzv7ezvq.js:1144-1282 facade-exports
/**
 * 项目目录：<配置目录>/projects/<cwd 清洗名>，cwd 中非字母数字字符换成 '-'，超过 200 字符截断并加 hash 后缀；按 cwd 缓存。
 */
function getProjectDir(t) {
  let e = projectDirCacheByHost.of(getRootSession().host);
  let n = e.projectDirCache.get(t);
  if (n !== undefined) return n;
  let r = join(getProjectsDir(), getProjectKey(t));
  e.cacheProjectDir(t, r);
  return r;
}
//@ chunk-qzv7ezvq.js:1282-1356 facade-exports
function resolveProjectDir() {
  let originalCwdOrNull = getOriginalCwdOrNull();
  if (originalCwdOrNull !== null) return getProjectDir(originalCwdOrNull);
  return getPinnedProjectDir() ?? getProjectDir(getOriginalCwd());
}
//@ chunk-qzv7ezvq.js:1356-1390 facade-exports
function resolveSessionProjectDir() {
  return getSessionProjectDir() ?? resolveProjectDir();
}
//@ chunk-qzv7ezvq.js:1390-1434 facade-exports = getErrorsPath (1)
/**
 * 当前会话主转录路径：<项目目录>/<sessionId>.jsonl。
 */
function getTranscriptPath() {
  return join(resolveSessionProjectDir(), `${getSessionId()}.jsonl`);
}
//@ chunk-qzv7ezvq.js:1434-1461 facade-exports
function locateSessionProjectDir() {
  return resolveSessionProjectDir();
}
//@ chunk-qzv7ezvq.js:1461-1524 facade-exports
function setAgentTranscriptSubdir(agentId, transcriptSubdir) {
  projectDirCacheByHost.of(getRootSession().host).setAgentTranscriptSubdir(agentId, transcriptSubdir);
}
//@ chunk-qzv7ezvq.js:1524-1585 facade-exports
function clearAgentTranscriptSubdir(agentId) {
  projectDirCacheByHost.of(getRootSession().host).clearAgentTranscriptSubdir(agentId);
}
//@ chunk-qzv7ezvq.js:1585-1631 facade-exports
function getSessionSubagentsDir() {
  return join(resolveSessionProjectDir(), getSessionId(), "subagents");
}
//@ chunk-qzv7ezvq.js:1631-1660 facade-exports
function locateAgentTranscript(t) {
  return getAgentTranscriptPath(t);
}
//@ chunk-qzv7ezvq.js:1660-1778 facade-exports
/**
 * 子代理转录路径：<项目目录>/<sessionId>/subagents/[子目录/]agent-<agentId>.jsonl。
 */
function getAgentTranscriptPath(t) {
  let e = projectDirCacheByHost.of(getRootSession().host).agentTranscriptSubdirs.get(t);
  let n = e ? join(getSessionSubagentsDir(), e) : getSessionSubagentsDir();
  return join(n, `agent-${t}.jsonl`);
}
//@ chunk-qzv7ezvq.js:1778-1824 facade-exports
function agentTranscriptPathOfEntry(agentId) {
  return isSafeIdSegment(agentId) ? getAgentTranscriptPath(identityAgentId2(agentId)) : undefined;
}
//@ chunk-qzv7ezvq.js:1824-2105 facade-exports = loadAllSubagentTranscriptsFromDisk (0.818)
async function listSubagentIdsFromDisk(t) {
  let projectKey = getProjectKeyIfRepresentable(resolveSessionProjectDir());
  if (isStorageV5Enabled() && t !== undefined && projectKey !== undefined)
    return listTranscriptEntries(t, projectKey, getSessionId());
  if (isDiskless()) return [];
  let entries;
  try {
    entries = await readdir(getSessionSubagentsDir(), {
      withFileTypes: true,
    });
  } catch {
    return [];
  }
  return entries
    .filter((entry) => entry.isFile() && entry.name.startsWith("agent-") && entry.name.endsWith(".jsonl"))
    .map((entry) => entry.name.slice(6, -6));
}
//@ chunk-qzv7ezvq.js:2105-2495 layout
/**
 * listTranscriptEntries：分页列出转录条目（qzv7 备份实现）。
 */
async function listTranscriptEntries(t, projectKey, sessionId) {
  let r = [];
  try {
    return (
      await readAllPages(
        (a) =>
          t.listEntries(
            {
              namespace: "transcript",
              projectKey,
              sessionId,
            },
            {
              skipKeyStats: true,
              skipScopeStats: true,
              ...(a !== undefined && {
                cursor: a,
              }),
            },
          ),
        (a) => {
          for (let s of a)
            if (
              s.kind === "key" &&
              s.key.namespace === "transcript" &&
              s.key.agentId !== undefined &&
              s.key.agentRelPath === undefined &&
              isValidKeySegment(s.key.agentId)
            )
              r.push(s.key.agentId);
        },
      )
    ).status === "done"
      ? r
      : [];
  } catch {
    return [];
  }
}
//@ chunk-qzv7ezvq.js:2495-2680 facade-exports = extractTeammateTranscriptsFromTasks (1)
function extractTeammateTranscriptsFromTasks(tasks, transcripts) {
  let transcripts_2 = {};
  for (let task of Object.values(tasks)) {
    let messages = transcripts[task.id]?.messages;
    if (task.type === "in_process_teammate" && task.identity?.agentId && messages && messages.length > 0)
      transcripts_2[task.identity.agentId] = messages;
  }
  return transcripts_2;
}
//@ chunk-x753sk9t.js:513-578 placement
function resolveAgainstProcessCwd(e) {
  let cwd = process.cwd();
  return cwd.endsWith(sep) ? cwd + e : cwd + sep + e;
}
//@ chunk-x753sk9t.js:578-673 placement
function makeWorkspaceRealPath(e) {
  return (n) =>
    e.hostFiles.realPath(PathSpace.workspace(n === "" || isAbsolute(n) ? n : resolveAgainstProcessCwd(n)), {
      native: true,
    });
}
//@ chunk-x753sk9t.js:673-747 placement
function getRealPathOptions(e) {
  return e === undefined
    ? undefined
    : {
        hoverRestOn: isStorageV5Enabled(),
        realPath: makeWorkspaceRealPath(e),
      };
}
//@ chunk-x753sk9t.js:747-865 layout
function getAgentIdFromTranscriptKey(key) {
  return key.namespace !== "transcript" || key.journal !== undefined || key.sessionJournal !== undefined
    ? undefined
    : (key.agentId ?? null);
}
//@ chunk-x753sk9t.js:865-1185 callgraph-witnessed = getTranscriptPath (0.658)
/**
 * storage v5 后端下把 <配置目录>/projects/<项目>/<session>.jsonl 形式的路径映射为转录存储 key；不在 projects 目录下或无后端时返回 undefined。
 */
function getTranscriptStorageKey(e, n) {
  if (!isStorageV5Enabled() || n === undefined) return;
  if (typeof e !== "string")
    return getAgentIdFromTranscriptKey(e.key) === null
      ? {
          backend: n,
          key: e.key,
        }
      : undefined;
  if (!e.endsWith(".jsonl")) return;
  let t = dirname(e);
  if (dirname(t) !== getProjectsDir_3()) return;
  let r = basename(t);
  let o = basename(e, ".jsonl");
  if (e !== join(getProjectsDir_3(), r, `${o}.jsonl`)) return;
  let d = STORAGE_SPACES.transcript(r, o);
  return validateStorageKey(d) === undefined
    ? {
        backend: n,
        key: d,
      }
    : undefined;
}
//@ chunk-x753sk9t.js:1185-1734 layout = getAgentTranscriptPath (0.867)
function getAgentTranscriptStorageKey(agentTranscriptPath, n) {
  if (!isStorageV5Enabled() || n === undefined) return;
  if (typeof agentTranscriptPath !== "string")
    return typeof getAgentIdFromTranscriptKey(agentTranscriptPath.key) === "string"
      ? {
          backend: n,
          key: agentTranscriptPath.key,
        }
      : undefined;
  let t = relative(getProjectsDir_3(), agentTranscriptPath);
  if (t === "" || t === ".." || t.startsWith(`..${sep}`) || isAbsolute(t)) return;
  let parts = t.split(sep);
  if (agentTranscriptPath !== join(getProjectsDir_3(), ...parts)) return;
  let last = parts.at(-1);
  if (
    parts.length < 4 ||
    parts[2] !== "subagents" ||
    last === undefined ||
    !last.startsWith("agent-") ||
    !last.endsWith(".jsonl")
  )
    return;
  let sliced = last.slice(6, -6);
  let sliced_2 = parts.slice(3, -1);
  if (
    !areValidKeySegments([parts[0], parts[1], sliced]) ||
    (sliced_2.length > 0 && !areValidKeySegments(sliced_2))
  )
    return;
  let s = STORAGE_SPACES.transcript(parts[0], parts[1], sliced, sliced_2.length > 0 ? sliced_2 : undefined);
  return validateStorageKey(s) === undefined
    ? {
        backend: n,
        key: s,
      }
    : undefined;
}
//@ chunk-x753sk9t.js:1734-1863 placement
function getTranscriptStorageContext(e) {
  if (!isStorageV5Enabled() || e === undefined) return;
  return {
    backend: e,
    transcriptKey: STORAGE_SPACES.transcript,
    isKeySegment: isValidKeySegment,
    realWorkspacePath: makeWorkspaceRealPath(e),
  };
}
//@ chunk-x753sk9t.js:1863-1930 placement
function wrapStorageSource(e) {
  return e === undefined
    ? undefined
    : {
        source: e,
        hoverRestOn: isStorageV5Enabled(),
      };
}
//@ chunk-63641kq7.js:4535-4668 callgraph-fingerprint = getTranscriptPathForSession (0.661)
async function getTranscriptPathForSession_2(fullPath, continuedInSessionId, r) {
  let t = join(dirname(fullPath), `${continuedInSessionId}.jsonl`);
  let sessionLite = await readSessionLite(t, wrapStorageSource(getTranscriptStorageKey(t, r)));
  return (
    sessionLite !== null &&
    (await transcriptMayContainMarker(t, sessionLite.head, sessionLite.tail, sessionLite.size, r))
  );
}
//@ chunk-63641kq7.js:4668-4711 placement
var PARENT_UUID_KEY = '"parentUuid":';
var MAX_TRANSCRIPT_SCAN_BYTES = 16777216;
var TRANSCRIPT_TAIL_SCAN_BYTES = 1048576;
//@ chunk-63641kq7.js:4711-5193 placement
/**
 * 判断转录头尾或全文是否含有某标记：头尾已命中返回 true，文件较小返回 false，存储模式保守返回 true，否则分块扫描文件直到上限。
 */
async function transcriptMayContainMarker(e, head, tail, t, i) {
  if (head.includes(PARENT_UUID_KEY) || tail.includes(PARENT_UUID_KEY)) return true;
  if (t <= LITE_READ_BUF_SIZE) return false;
  if (getTranscriptStorageKey(e, i) !== undefined) return true;
  try {
    let d = await open(e, constants.O_RDONLY | constants.O_NOFOLLOW | constants.O_NONBLOCK);
    try {
      if (!(await d.stat()).isFile()) return false;
      let a = Buffer.allocUnsafe(TRANSCRIPT_TAIL_SCAN_BYTES + PARENT_UUID_KEY.length);
      let c = 0;
      let m = 0;
      while (m < MAX_TRANSCRIPT_SCAN_BYTES) {
        let { bytesRead } = await d.read(a, c, TRANSCRIPT_TAIL_SCAN_BYTES, m);
        if (bytesRead === 0) return false;
        let l = c + bytesRead;
        if (a.subarray(0, l).includes(PARENT_UUID_KEY)) return true;
        c = Math.min(PARENT_UUID_KEY.length, l);
        a.copyWithin(0, l - c, l);
        m += bytesRead;
      }
      return true;
    } finally {
      await d.close();
    }
  } catch {
    return false;
  }
}
//@ chunk-18hwfzwa.js:441822-441905 fingerprint = extractTeammateTranscriptsFromTasks (1)
function extractTeammateTranscriptsFromTasks_2(tasks) {
  return tasks.type === "in_process_teammate" ? tasks.identity.agentId : tasks.agentId;
}
//@ chunk-18hwfzwa.js:1084489-1084597 fingerprint = loadSubagentTranscripts (0.658)
function loadSubagentTranscripts_2({ isLoading, transcript }) {
  let D = ce((agentId) => !isLoading && endsWithNumberedList(agentId), [isLoading]);
  let storeSelector = useStoreSelector(transcript, D);
  let ee = !isUnattendedInteractiveSession();
  return !isLoading && !storeSelector && ee;
}
//@ chunk-7dqf31r1.js:4170-4264 affinity
var REMOTE_ENTRYPOINTS_3 = new Set([
  "remote",
  "remote_desktop",
  "remote_mobile",
  "remote_projects",
  "remote_trigger",
]);
//@ chunk-7dqf31r1.js:4264-4369 fingerprint = getEntrypoint (0.699)
function getEntrypoint() {
  let CLAUDE_CODE_ENTRYPOINT = env.CLAUDE_CODE_ENTRYPOINT;
  return (
    Boolean(env.CLAUDE_CODE_REMOTE) &&
    CLAUDE_CODE_ENTRYPOINT !== undefined &&
    REMOTE_ENTRYPOINTS_3.has(CLAUDE_CODE_ENTRYPOINT)
  );
}
//@ chunk-cg2r2hy6.js:24194-24674 fingerprint = getAgentTranscriptPath (0.928)
function getAgentTranscriptPath_2(agentId) {
  let u = getProjectsDir_3() + sep;
  if (!agentId.startsWith(u)) return null;
  let parts = agentId.slice(u.length).split(sep);
  if (parts.length === 2 && parts[1].endsWith(".jsonl")) {
    let o = parts[0];
    let sliced = parts[1].slice(0, -6);
    return isValidKeySegment(o) && isValidKeySegment(sliced)
      ? pathIfNotStorageBacked(STORAGE_SPACES.transcript(o, sliced))
      : null;
  }
  if (
    parts.length >= 4 &&
    parts[2] === "subagents" &&
    parts.at(-1).startsWith("agent-") &&
    parts.at(-1).endsWith(".jsonl")
  ) {
    let o = parts[0];
    let y = parts[1];
    let sliced = parts.slice(3, -1);
    let sliced_2 = parts.at(-1).slice(6, -6);
    return isValidKeySegment(o) &&
      isValidKeySegment(y) &&
      isValidKeySegment(sliced_2) &&
      (sliced.length === 0 || areValidKeySegments(sliced))
      ? pathIfNotStorageBacked(
          STORAGE_SPACES.transcript(o, y, sliced_2, sliced.length > 0 ? sliced : undefined),
        )
      : null;
  }
  return null;
}
//@ chunk-cg2r2hy6.js:24674-24718 sole-consumer
function pathIfNotStorageBacked(s) {
  return validateStorageKey(s) === undefined ? s : null;
}
//@ chunk-0j11jfmy.js:6045-6057 fingerprint = cleanMessagesForLogging (1)
var cleanMessagesForLogging_2 = "ant";
//@ chunk-89ebz077.js:16227-16458 fingerprint = writeAgentMetadata (0.515)
async function writeAgentMetadata_2(agentId, metadata) {
  if (getPlatform() === "windows") return;
  let path = daemonTokensFile(agentId);
  try {
    await mkdir(daemonAuthDir(), {
      recursive: true,
      mode: 448,
    });
    await writeFile(path, JSON.stringify(metadata), {
      mode: 384,
    });
    return path;
  } catch (error) {
    logForDebugging(`writeSocketTokensFile failed: ${errorMessage(error)}`, {
      level: "warn",
    });
    return;
  }
}
//@ chunk-ad2e1aj6.js:22307-22511 fingerprint = scanPreBoundaryMetadata (0.481)
function scanPreBoundaryMetadata(e, n, s) {
  if (Buffer.byteLength(e) <= n)
    return {
      text: e,
      truncated: false,
    };
  return {
    text: `${new TextDecoder("utf-8", {
      fatal: false,
    })
      .decode(Buffer.from(e).subarray(0, n))
      .replace(/\uFFFD$/, "")}${s}`,
    truncated: true,
  };
}
//@ chunk-bss4k1z9.js:33929-33956 fingerprint = getUserType (0.74)
var getUserType_2 = (e) => e === "external";
//@ chunk-cgs3vg0v.js:1502-1585 fingerprint = buildFileHistorySnapshotChain (0.456)
function buildFileHistorySnapshotChain(session) {
  if (!session) return;
  try {
    return spawnStatsSlots.of(session).snapshot();
  } catch (error) {
    logError(error);
    return;
  }
}
//@ chunk-dz3q485w.js:15191-15469 callgraph-fingerprint = loadSameRepoMessageLogs (0.229)
async function loadSameRepoMessageLogs_2(cwd, credentials) {
  let s = await sameRepoWorktrees(cwd);
  let sameRepoMessageLogsProgressive = await loadSameRepoMessageLogsProgressive(
    s,
    undefined,
    undefined,
    credentials,
  );
  let sessionId = getSessionId();
  let l = (b) =>
    !b.isSidechain &&
    b.isAlias !== true &&
    b.sessionId !== sessionId &&
    (b.projectPath === undefined || isSameRepoPath(b.projectPath, cwd, s));
  let filtered = sameRepoMessageLogsProgressive.logs.filter(l);
  let h = count(
    sameRepoMessageLogsProgressive.allStatLogs.slice(sameRepoMessageLogsProgressive.nextIndex),
    resolveSessionFilePath_2,
  );
  return {
    logs: filtered,
    totalCount: count(filtered, resolveSessionFilePath_2) + h,
  };
}
//@ chunk-rds552kq.js:226-282 placement
/**
 * worktreeFromProgress：进度消息里的 worktree（磁盘模式下保留）。
 */
function worktreeFromProgress(e) {
  return typeof e !== "string" || isDiskless() ? undefined : e;
}
//@ chunk-wd9kxbpn.js:18162-18427 placement = renderToolResultMessage (0.52)
/**
 * 根据进度消息里的 worktree 信息更新已保存的会话元数据（路径/分支/hook 标记变化时写回）。
 */
async function renderToolResultMessage(output, _progressMessagesForMessage, _options) {
  let jobDir = getJobDir(output);
  let jobState = await readJobState(jobDir, _options);
  if (!jobState) return;
  let d = pickWorktreeFields(_progressMessagesForMessage, jobState);
  if (
    d.worktreePath === jobState.worktreePath &&
    d.worktreeBranch === jobState.worktreeBranch &&
    d.worktreeHookBased === jobState.worktreeHookBased
  )
    return;
  await writeStateAndBroadcast(
    jobDir,
    {
      ...jobState,
      ...d,
      updatedAt: new Date().toISOString(),
    },
    {},
    _options,
  );
}
export {
  getEntrypoint,
  getSessionIdFromLog,
  getProjectsDir,
  getSessionFilesWithMtime,
  loadAllLogsFromSessionFile,
  getProjectKeyIfRepresentable,
  isTranscriptPersistenceDisabled,
  getTranscriptPathForSession,
  saveWorktreeState,
  resetSessionFilePointer,
  adoptForkSessionMetadata,
  recordContentReplacement,
  restoreSessionMetadata,
  adoptResumedSessionFileAsync,
  adoptResumedSessionFile,
  saveMode,
  pinSessionId,
  recordTranscript,
  doesMessageExistInSession,
  isChainParticipant,
  updateAgentMetadata,
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
  loadSessionTranscript,
  sessionLogFromTranscriptLoad,
  currentTranscriptStore,
  fetchLogs,
  findFirstMessageLog,
  toTranscriptEntries,
  isLiteLog,
  loadFullLog,
  checkResumeConsistency,
  findDeferredToolMarkerInTranscript,
  getCurrentSessionTitle,
  applyResumeHookSessionTitle,
  wrapStorageSource,
  getTranscriptStorageContext,
  cleanMessagesForLogging_2,
  AgentTranscriptFetchError,
  isAgentTranscriptOverBound,
  isUnavailableStoreError,
  hasAgentStopSibling,
  flushSessionStorage,
  getAgentTranscript,
  canFetchAgentTranscriptsOnDemand,
  readAgentWorkerEvents,
  hasWrittenAgentTranscript,
  keepsAgentMetadataInStream,
  clearAgentStopSibling,
  landStoppedByUser,
  touchSessionTranscript,
  isCompactPairWithheldFromRemote,
  isBridgeBindingForeign,
  recordQueueOperation,
  isTranscriptRelocationInProgress,
  getTranscriptWriteFailureSeq,
  getMaterializedSessionFile,
  getAgentTranscriptStorageKey,
  removeRemoteAgentMetadata,
  writeRemoteAgentMetadata,
  listRemoteAgentMetadata,
  isRemoteEgressSuppressedFor,
  mergeArtifactCommentMonitorEntries,
  loadTranscriptFromFile,
  listSubagentIdsFromDisk,
  searchSessionsByCustomTitle,
  TranscriptFileFormatError,
  getProjectDir,
  getCurrentSessionFile,
  transcriptStamp,
  appendEntryToFileAsync,
  getTranscriptStorageKey,
  getCurrentSessionAiTitle,
  getCurrentSessionAgentColor,
  getCurrentSessionBridge,
  extractTeammateTranscriptsFromTasks_2,
  subscribeSessionTitleChanged,
  saveIsolationLatch,
  savePermissionMode,
  readAgentMetadataAtPath,
  getCurrentSessionDisplayTitle,
  applyEndedByModelOnResume,
  clearSessionMetadata,
  buildForkAdoptionMeta,
  holdPrecautionarySuppressionFor,
  markPrecautionClearResilientFor,
  copyPrecautionarySuppressionTo,
  cacheHookSessionTitle,
  subscribeSessionAgentNameChanged,
  getCurrentSessionAgentName,
  getCurrentSessionIsolationLatch,
  readTranscriptTailForTip,
  extractLastSyncedEventUuid,
  bridgeSessionForPulledWindow,
  titleCacheStillOn,
  cacheSessionTitle,
  cacheAgentName,
  getFirstMeaningfulUserMessageTextContent,
  saveCustomTitle,
  isCustomTitleEnabled,
  loadSameRepoMessageLogsProgressive,
  enrichLogs,
  loadAllProjectsMessageLogsProgressive,
  getTranscriptPath,
  getAgentMetadataPath,
  getSessionSubagentsDir,
  saveAutoMemorySessionSwitch,
  getPersistenceSuppressionCause,
  getTranscriptWriterHealth,
  saveAgentSetting,
  describeDiskTranscriptLag,
  findUnresolvedToolUses,
  addSessionMirror,
  registerLiveSuppressionProbe,
  buildFileHistorySnapshotChain,
  getSessionRowsOffDisk,
  mirrorLeafCheckpointToRemote,
  persistLeafCheckpoint,
  registerTranscriptExitReStamp,
  setTranscriptLocalGcEnabled,
  hydrateFromCCRv2InternalEvents,
  hydrateRemoteSession,
  loadSubagentTranscripts_2,
  extractAgentIdsFromMessages,
  loadSubagentTranscripts,
  saveAiGeneratedTitle,
  saveAgentName,
  isTranscriptMessage,
  queueSessionMetadataEntry,
  hasRemoteWorkerEventLog,
  readAtTranscriptEntry,
  inTranscriptCallOrder,
  collectReplIds,
  hasSessionMirror,
  removeTranscriptMessage,
  isEphemeralToolProgress,
  removeTranscriptMessageIfPersisted,
  readHistorySuppressionFromDisk,
  PENDING_BRIDGE_SESSION,
  registerForeignConversationProbe,
  clearBridgeSession,
  clearBridgeSessionCache,
  saveBridgeSession,
  isOwnTranscriptFile,
  claimPrecautionHoldForObservedCause,
  writeHistorySuppression,
  saveAgentColor,
  cleanMessagesForLogging,
  getCurrentSessionPeerNameFor,
  getCurrentSessionPeerName,
  getCurrentSessionOffBoxPeerName,
  transcriptMayContainMarker,
  sessionIdExists,
  relocateSessionTranscript,
  isConversationEgressTainted,
  isSessionHistorySuppressed,
  getCurrentSessionMemoryModeStamps,
  holdSessionHistorySuppression,
  markToolsUsedWritten,
  queueLeafCheckpointWithdrawal,
  saveMemoryMode,
  dropSessionHistorySuppression,
  releasePrecautionarySuppressionFor,
  recordFileHistoryDelta,
  recordFileHistorySnapshot,
  getSessionSidecarDir,
  ensureSidecarDirFor,
  resolveSessionProjectDir,
  setToolResultCopiesOnDisk,
  resolveProjectDir,
  storagePort,
  getRealPathOptions,
  loadSameRepoMessageLogs,
  clearLastIngressUuid,
  writeAgentMetadata_2,
  peekResumedArtifactAutoReactLedger,
  takeResumedArtifactAutoReactLedger,
  recordArtifactAutoReactLedger,
  scanPreBoundaryMetadata,
  deleteRemoteAgentMetadata,
  reAppendSessionMetadataAfterCompaction,
  getUserType_2,
  getDerivedTranscriptPathForSession,
  isPrecautionarySuppressionHeldFor,
  markScanUncertaintyHoldFor,
  holdSessionHistorySuppressionFor,
  isScanUncertaintyHoldFor,
  getAgentTranscriptPath_2,
  SuppressionScanBudget,
  SUPPRESSION_SCAN_CHUNK_BYTES,
  matchesHistorySuppressionLine,
  isSyncedTranscriptEntry,
  isRowForeignToBridgeSession,
  SUPPRESSION_SCAN_MAX_LINES,
  suppressionScanFailure,
  logSuppressionScan,
  isSessionHistorySuppressedFor,
  setInternalEventWriter,
  setInternalEventReader,
  clearInternalEventWriter,
  releaseScanUncertaintyHoldFor,
  getBridgeBoundConversationSid,
  loadSameRepoMessageLogs_2,
  scanTranscriptForSuppression,
  MAX_METADATA_SCAN_BYTES,
  COMMAND_NAME_CONTENT_MARKER,
  COMMAND_MESSAGE_CONTENT_MARKER,
  COMMAND_NAME_RE,
  TOOL_USE_TYPE_MARKER,
  MCP_TOOL_USE_NAME_RE,
  CUSTOM_TITLE_TYPE_MARKER,
  CUSTOM_TITLE_RE,
  PR_LINK_TYPE_MARKER,
  PR_NUMBER_RE,
  USER_ROLE_MARKER,
  USER_CONTENT_RE,
  MAX_FIRST_MESSAGE_CHARS,
  MAX_SESSION_DESCRIPTORS,
  consumeFailedTranscriptWrite,
  clearSessionMessagesCache,
  isSessionFileAt,
  appendEntryToFile,
  projectKeyOf,
  hasRecordedUserPrompt,
  locateSessionProjectDir,
  primeSessionMessagesCache,
  landAgentStop,
  reportRelocateSessionTranscriptFailure,
  cacheAiTitle,
  readTranscriptTailV5,
  markSessionEndedByModel,
  isTurnUnanswered,
  loadTranscriptFile,
  MAX_TRANSCRIPT_READ_BYTES,
  isMessageTurnUnanswered,
  findUnresolvedToolUsesInTranscript,
  findUnresolvedToolUseMessageRows,
  findUnresolvedToolUse,
  assistantMessageRowsInTranscript,
  withVersionToRecord,
  currentSessionFileIsFor,
  registerForeignTranscriptExitReStamp,
  appendEntryToCurrentTranscriptNow,
  onSessionFileMaterialized,
  takeResumedArtifactCommentMonitor,
  sealTornTranscriptTail,
  recordArtifactCommentMonitor,
  worktreeStateSignals,
  renderToolResultMessage,
  readLastObserverRef,
  agentTranscriptExists,
  recordObserverRef,
  recordSessionAlias,
  extractTeammateTranscriptsFromTasks,
  loadAllSubagentTranscriptsFromDisk,
  restoreAgentSidecarFromStream,
  setAgentMetadataInStreamGate,
  updateCCRTipFromAckedBatch,
  sealTranscriptAppendsForShutdown,
  getValidatedCCRTip,
  saveDevModsFolder,
  getCurrentSessionDevModsFolder,
};
