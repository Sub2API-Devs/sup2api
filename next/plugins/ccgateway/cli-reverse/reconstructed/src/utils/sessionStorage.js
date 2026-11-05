/**
 * utils/sessionStorage.ts
 *
 * 会话转录存储核心：projects/<清洗cwd>/<sessionId>.jsonl 的写入队列（Project 类）、记录类型策略、元数据记录、加载/建链、日志列表与 resume 查找、子代理转录与侧车、远程水合与迁移。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/utils/sessionStorage.ts
 * pieces: chunk-05hzzra9.js (1), chunk-0yn8vxcn.js (8), chunk-5s0qaz1x.js (1), chunk-5xgkngpb.js (518), chunk-66b9fbd5.js (2), chunk-775n2x67.js (1), chunk-807vb177.js (19), chunk-9ys74nhz.js (2), chunk-czq1j3j2.js (1), chunk-jd53r7dh.js (3), chunk-jndyh8cy.js (1), chunk-n44f9pt7.js (1), chunk-nvm0wye1.js (1), chunk-rytc8e8q.js (1), chunk-v6a0t823.js (1), chunk-xgvz6tdn.js (1)
 * attribution: fingerprint 31, placement 33, layout 164, callgraph-witnessed 3, facade-majority 294, file-local 4, affinity 3, sole-consumer 8, callgraph-fingerprint 6, facade-exports 16
 */
import { join, dirname, basename, sep, isAbsolute, relative, resolve as resolve_2, normalize } from "path";
import {
  readdir,
  open,
  readFile,
  mkdir,
  writeFile,
  unlink,
  realpath,
  appendFile,
  stat,
  utimes,
  rename,
  lutimes,
  lstat,
  copyFile,
  rm,
  link,
} from "fs/promises";
import { constants, createReadStream, openSync, fstatSync, writeSync, closeSync, readSync } from "fs";
import { randomBytes } from "crypto";
import { constants as constants_8 } from "os";
import { StringDecoder } from "string_decoder";
import { isAscii } from "buffer";
import { env } from "./env.js";
import { pluginDataDirPath } from "./plugins/pluginDirectories.js";
import {
  isDiskless,
  getRootSession,
  getOriginalCwdOrNull,
  getOriginalCwd,
  getSessionProjectDir,
  getSessionId,
  getIsNonInteractiveSession,
  isSessionPersistenceDisabled,
  getConversationAtisLatch,
  getConversationToolsUsed,
  getPromptId as getPromptId_2,
  getPlanSlugCache,
  registerCostStateRecorder,
  switchSession,
  setConversationAtisLatch,
  getRestoredMemoryPause,
  setRestoredMemoryPause,
  setMemoryToggledOff,
  getRestoredAutoMemoryOff,
  setRestoredAutoMemoryOff,
  setAutoMemoryOffThisSession,
} from "../bootstrap/state.js";
import {
  getFsImplementation,
  tailFile,
  FileChangedDuringReadError,
  readLinesReverse,
  hasUntouchableRecordSpellingAsync,
} from "./fsOperations.js";
import { getClaudeConfigDir } from "./markdownConfigLoader.js";
import { HostScoped } from "./hostScoped.js";
import {
  getProjectKey,
  getPinnedProjectDir,
  getProjectsDir as getProjectsDir_3,
  readSessionLite,
  LITE_READ_BUF_SIZE,
  PROGRAMMATIC_ENTRYPOINTS,
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
  resolveSessionFilePath_2,
} from "./sessionStoragePortable.js";
import {
  isSafeIdSegment,
  identityAgentId2,
  normalizeUuidOrNull,
  isSafeIdSegment_2,
  identityAgentId,
} from "./agentId.js";
import { isStorageV5Enabled } from "./hoverRest.js";
import { readAllPages } from "./pagedRead.js";
import { isValidKeySegment, STORAGE_SPACES, areValidKeySegments } from "./storage/storageSpaces.js";
import { PathSpace } from "./resultError.js";
import {
  validateStorageKey,
  keyFromMetaPath,
  validateStorageScope,
  pathToSessionSideKey,
} from "./storage/storageKeys.js";
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
import { getOauthAccountInfo, credentialIsOwnStoredLogin, sameOwnerAccount } from "./auth.js";
import {
  isBgSession,
  envSessionKind,
  getRegisteredSessionName,
  isUnattendedInteractiveSession,
} from "./concurrentSessions.js";
import { getFeatureValue_CACHED_MAY_BE_STALE } from "../services/analytics/growthbook.js";
import { getGlobalConfig, saveGlobalConfig } from "./config.js";
import { truncateToWidth, formatDurationCoarse, formatFileSize } from "./format.js";
import { stripNonPrintable } from "./truncateGraphemes.js";
import { devModsDir } from "../plugins/functionHooks/devModsName.js";
import { isPlainObject as isPlainObject_6 } from "./isPlainObject.js";
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
  replaceUnsentMediaInToolResult,
  isShutdownInterrupted,
} from "./messages.js";
import { logEvent } from "../services/analytics/index.js";
import { fromEnum, lit as lit_2, fromEnumOpt } from "../services/analytics/safeMetadata.js";
import { codeModeAccepted } from "./codeMode/accepted.js";
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
import { isNestedInteractiveClaudeSession, isTeammate } from "./teammate.js";
import { getCwdOrNull } from "./cwd.js";
import { transcriptVersionOrDefault } from "./computerUse/computerUseLock.js";
import { getBranch } from "./git.js";
import { identity } from "./pathClassification.js";
import { normalizeCaseForComparison_2 } from "./permissions/filesystem.js";
import { createSignal } from "./signal.js";
import { memoizeAlias } from "../../vendor/@mermaid-js/parser/dist/chunks/mermaid-parser.esm.min/chunk-L2OVAXIS.mjs";
import {
  createToolResultSlimmer_2,
  writeTranscriptFile,
  reportTranscriptWriteFailure,
  noteTranscriptWriteOk,
  slimCharsOf,
} from "./transcript/transcriptWriter.js";
import { isDiagLogging, isInDiagScope, logForDiagnosticsNoPII } from "./diagLogs.js";
import { withDeadline, raceWithAbortSignal } from "./sleep.js";
import { registerCleanup } from "./cleanupRegistry.js";
import {
  RequestBlobStore,
  clearAllReplayChains,
  isRequestBlobStoreEnabled,
  stripCacheControl as stripCacheControl_5,
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
import { isSillyShoreGateOn, collectToolsUsedBeforeSummary } from "./messages/untrustedArtifactContent.js";
import {
  readTranscriptEntries,
  skipNuls,
  readEnvelopeSessionId,
  ArtifactLedgerCollector,
  stripToolUseIdBookkeeping,
  CostStateEntrySchema,
  resetArtifactLedgerState,
  isLaptopMemoryAttachment,
} from "./transcript/entryTypes.js";
import { writeFully, WRITE_BUFFER_LIMIT_BYTES } from "../services/memorySync/syncFiles.js";
import { ATOMIC_WRITE_ERRNOS } from "./plugins/safeCopy.js";
import { refreshCheckoutMetadata } from "./git/repoCheckouts.js";
import { isEnvTruthy, getProjectDirNameOverride } from "./envUtils.js";
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
import { countWhere } from "./collections.js";
import { readSessionStartDate } from "./stats.js";
import {
  isFoamySpringEnabled,
  isSideMessagesEnabled,
  readGateTrueByDefault,
  readGateFalseByDefault,
} from "../services/analytics/growthbookGates.js";
import { announceFirstTurnOnce } from "./transcript/resumeAnnouncements.js";
import { hasEmbeddedSearchTools_2 } from "./embeddedTools.js";
import { collectBlockFieldsByType } from "../services/api/claude.js";
import { withEndedByModel, getEndedByModel, isModelEndCheckSupported } from "../tasks/endedByModel.js";
import { latestLogPerSession } from "../components/LogSelector.js";
import { slugifySessionName } from "./sessionAddresses.js";
import { settledYieldFor } from "./sessionNameUniqueness.js";
import { getWorktreePaths } from "./getWorktreePaths.js";
import {
  INDEX_HEAD_SCAN_BYTES,
  INDEX_BOUNDARY_SCAN_BYTES,
  INDEX_LAST_PROMPT_SCAN_BYTES,
  LAST_PROMPT_PREFIX_SCAN_BYTES,
} from "../services/api/tether.js";
import { createRowRepairer } from "./transcript/transcriptRepair.js";
import { wireToolInputsForContent, restoreWireInputStamps } from "./wireToolInputEcho.js";
import { sanitizeStringList } from "../bridge/controlRequests.js";
import { lastLineOf } from "../upstreamproxy/relay.js";
import { limitConcurrency } from "./concurrencyLimit.js";
import { isEvalToolCallName } from "../tools/REPLTool/constants.js";
import { resolveMessageAlias } from "./pollEvents/fold.js";
import { readCustomTitle } from "../cli/toolPermissionStream.js";
import { getPlatform } from "./platform.js";
import { daemonTokensFile, daemonAuthDir } from "../services/daemon/paths.js";
import { spawnStatsSlots } from "../tasks/taskState.js";
import { sameRepoWorktrees, isSameRepoPath } from "../services/projects/repoContext.js";
import { getJobDir, readJobState } from "../services/daemon/jobState.js";
import { pickWorktreeFields } from "../services/agentStatus/jobClassifier.js";
import { writeStateAndBroadcast } from "../services/agentStatus/jobState.js";
import { useCallback } from "../../vendor/react/cjs/react.production.js";
import { endsWithNumberedList } from "../components/FeedbackSurvey/SurveyHost.js";
import { useStoreSelector } from "../hooks/useStoreSelector.js";
import { deferInit } from "../../runtime/deferred-init.js";

//@ chunk-9ys74nhz.js:4180-4274 affinity
var REMOTE_ENTRYPOINTS_3; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-9ys74nhz.js:4180", () => {
  REMOTE_ENTRYPOINTS_3 = new Set([
    "remote",
    "remote_desktop",
    "remote_mobile",
    "remote_projects",
    "remote_trigger",
  ]);
});
//@ chunk-9ys74nhz.js:4274-4379 fingerprint (2.1.88 match: getEntrypoint, 0.702)
function getEntrypoint() {
  let CLAUDE_CODE_ENTRYPOINT = env.CLAUDE_CODE_ENTRYPOINT;
  return (
    Boolean(env.CLAUDE_CODE_REMOTE) &&
    CLAUDE_CODE_ENTRYPOINT !== undefined &&
    REMOTE_ENTRYPOINTS_3.has(CLAUDE_CODE_ENTRYPOINT)
  );
}
//@ chunk-n44f9pt7.js:7128-7260 fingerprint (2.1.88 match: resolveMetadataBuf, 0.833)
function resolveMetadataBuf(carry, chunkBuf) {
  let chunkBuffer = typeof chunkBuf === "string" ? Buffer.from(chunkBuf) : chunkBuf;
  return (
    carry.length <= chunkBuffer.length && Buffer.compare(carry, chunkBuffer.subarray(0, carry.length)) === 0
  );
}
//@ chunk-5s0qaz1x.js:6181-6252 fingerprint (2.1.88 match: appendEntryToFile, 0.638)
/**
 * 返回并（非只读模式下）创建插件数据目录。
 */
function ensurePluginDataDir(pluginId) {
  let dirPath = pluginDataDirPath(pluginId);
  if (isDiskless()) return dirPath;
  getFsImplementation().mkdirSync(dirPath);
  return dirPath;
}
//@ chunk-807vb177.js:590-630 facade-exports (2.1.88 match: getProjectsDir, 1)
/**
 * <配置目录>/projects：所有项目转录目录的父目录。
 */
function getProjectsDir() {
  return join(getClaudeConfigDir(), "projects");
}
//@ chunk-807vb177.js:630-676 facade-exports
function getProjectKeyIfRepresentable(path) {
  return dirname(path) === getProjectsDir() ? basename(path) : undefined;
}
//@ chunk-807vb177.js:676-819 facade-exports
function projectKeyOf(key) {
  if (typeof key === "string") return getProjectKeyIfRepresentable(key);
  let { scope } = key;
  return scope.namespace === "transcript" && scope.sessionId === undefined ? scope.projectKey : undefined;
}
//@ chunk-807vb177.js:819-1121 layout
class ProjectDirCacheState {
  projectDirCache = new Map();
  agentTranscriptSubdirs = new Map();
  cacheProjectDir(projectKey, dir) {
    this.projectDirCache.set(projectKey, dir);
  }
  clearProjectDirCache() {
    this.projectDirCache.clear();
  }
  setAgentTranscriptSubdir(agentId, subdir) {
    this.agentTranscriptSubdirs.set(agentId, subdir);
  }
  clearAgentTranscriptSubdir(agentId) {
    this.agentTranscriptSubdirs.delete(agentId);
  }
}
//@ chunk-807vb177.js:1121-1144 layout
var projectDirCacheByHost; // deferred: uses ProjectDirCacheState of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-807vb177.js:1121", () => {
  projectDirCacheByHost = new HostScoped(() => new ProjectDirCacheState());
});
//@ chunk-807vb177.js:1144-1282 facade-exports
/**
 * 项目目录：<配置目录>/projects/<cwd 清洗名>，cwd 中非字母数字字符换成 '-'，超过 200 字符截断并加 hash 后缀；按 cwd 缓存。
 */
function getProjectDir(projectKey) {
  let cache = projectDirCacheByHost.of(getRootSession().host);
  let dir = cache.projectDirCache.get(projectKey);
  if (dir !== undefined) return dir;
  let projectDirPath = join(getProjectsDir(), getProjectKey(projectKey));
  cache.cacheProjectDir(projectKey, projectDirPath);
  return projectDirPath;
}
//@ chunk-807vb177.js:1282-1356 facade-exports
function resolveProjectDir() {
  let originalCwdOrNull = getOriginalCwdOrNull();
  if (originalCwdOrNull !== null) return getProjectDir(originalCwdOrNull);
  return getPinnedProjectDir() ?? getProjectDir(getOriginalCwd());
}
//@ chunk-807vb177.js:1356-1390 facade-exports
function resolveSessionProjectDir() {
  return getSessionProjectDir() ?? resolveProjectDir();
}
//@ chunk-807vb177.js:1390-1434 facade-exports (2.1.88 match: getErrorsPath, 1)
/**
 * 当前会话主转录路径：<项目目录>/<sessionId>.jsonl。
 */
function getTranscriptPath() {
  return join(resolveSessionProjectDir(), `${getSessionId()}.jsonl`);
}
//@ chunk-807vb177.js:1434-1461 facade-exports
function locateSessionProjectDir() {
  return resolveSessionProjectDir();
}
//@ chunk-807vb177.js:1461-1524 facade-exports
function setAgentTranscriptSubdir(agentId, transcriptSubdir) {
  projectDirCacheByHost.of(getRootSession().host).setAgentTranscriptSubdir(agentId, transcriptSubdir);
}
//@ chunk-807vb177.js:1524-1585 facade-exports
function clearAgentTranscriptSubdir(agentId) {
  projectDirCacheByHost.of(getRootSession().host).clearAgentTranscriptSubdir(agentId);
}
//@ chunk-807vb177.js:1585-1631 facade-exports
function getSessionSubagentsDir() {
  return join(resolveSessionProjectDir(), getSessionId(), "subagents");
}
//@ chunk-807vb177.js:1631-1660 facade-exports
function locateAgentTranscript(agentId) {
  return getAgentTranscriptPath(agentId);
}
//@ chunk-807vb177.js:1660-1778 facade-exports
/**
 * 子代理转录路径：<项目目录>/<sessionId>/subagents/[子目录/]agent-<agentId>.jsonl。
 */
function getAgentTranscriptPath(agentId) {
  let subdir = projectDirCacheByHost.of(getRootSession().host).agentTranscriptSubdirs.get(agentId);
  let baseDir = subdir ? join(getSessionSubagentsDir(), subdir) : getSessionSubagentsDir();
  return join(baseDir, `agent-${agentId}.jsonl`);
}
//@ chunk-807vb177.js:1778-1824 facade-exports
function agentTranscriptPathOfEntry(agentId) {
  return isSafeIdSegment(agentId) ? getAgentTranscriptPath(identityAgentId2(agentId)) : undefined;
}
//@ chunk-807vb177.js:1824-2105 facade-exports (2.1.88 match: loadAllSubagentTranscriptsFromDisk, 0.818)
async function listSubagentIdsFromDisk(storageV5) {
  let projectKey = getProjectKeyIfRepresentable(resolveSessionProjectDir());
  if (isStorageV5Enabled() && storageV5 !== undefined && projectKey !== undefined)
    return listTranscriptEntries(storageV5, projectKey, getSessionId());
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
//@ chunk-807vb177.js:2105-2495 layout
/**
 * listTranscriptEntries：分页列出转录条目（qzv7 备份实现）。
 */
async function listTranscriptEntries(storage, projectKey, sessionId) {
  let ids = [];
  try {
    return (
      await readAllPages(
        (cursor) =>
          storage.listEntries(
            {
              namespace: "transcript",
              projectKey,
              sessionId,
            },
            {
              skipKeyStats: true,
              skipScopeStats: true,
              ...(cursor !== undefined && {
                cursor,
              }),
            },
          ),
        (items) => {
          for (let item of items)
            if (
              item.kind === "key" &&
              item.key.namespace === "transcript" &&
              item.key.agentId !== undefined &&
              item.key.agentRelPath === undefined &&
              isValidKeySegment(item.key.agentId)
            )
              ids.push(item.key.agentId);
        },
      )
    ).status === "done"
      ? ids
      : [];
  } catch {
    return [];
  }
}
//@ chunk-807vb177.js:2495-2680 facade-exports (2.1.88 match: extractTeammateTranscriptsFromTasks, 1)
function extractTeammateTranscriptsFromTasks(tasks, transcripts) {
  let transcripts_2 = {};
  for (let task of Object.values(tasks)) {
    let messages = transcripts[task.id]?.messages;
    if (task.type === "in_process_teammate" && task.identity?.agentId && messages && messages.length > 0)
      transcripts_2[task.identity.agentId] = messages;
  }
  return transcripts_2;
}
//@ chunk-0yn8vxcn.js:513-578 placement
function resolveAgainstProcessCwd(path) {
  let cwd = process.cwd();
  return cwd.endsWith(sep) ? cwd + path : cwd + sep + path;
}
//@ chunk-0yn8vxcn.js:578-673 placement
function makeWorkspaceRealPath(hostFiles) {
  return (path) =>
    hostFiles.hostFiles.realPath(
      PathSpace.workspace(path === "" || isAbsolute(path) ? path : resolveAgainstProcessCwd(path)),
      {
        native: true,
      },
    );
}
//@ chunk-0yn8vxcn.js:673-747 placement
function getRealPathOptions(hostFiles) {
  return hostFiles === undefined
    ? undefined
    : {
        hoverRestOn: isStorageV5Enabled(),
        realPath: makeWorkspaceRealPath(hostFiles),
      };
}
//@ chunk-0yn8vxcn.js:747-865 layout
function getAgentIdFromTranscriptKey(key) {
  return key.namespace !== "transcript" || key.journal !== undefined || key.sessionJournal !== undefined
    ? undefined
    : (key.agentId ?? null);
}
//@ chunk-0yn8vxcn.js:865-1185 callgraph-witnessed (2.1.88 match: getTranscriptPath, 0.658)
/**
 * storage v5 后端下把 <配置目录>/projects/<项目>/<session>.jsonl 形式的路径映射为转录存储 key；不在 projects 目录下或无后端时返回 undefined。
 */
function getTranscriptStorageKey(pathOrKey, backend) {
  if (!isStorageV5Enabled() || backend === undefined) return;
  if (typeof pathOrKey !== "string")
    return getAgentIdFromTranscriptKey(pathOrKey.key) === null
      ? {
          backend,
          key: pathOrKey.key,
        }
      : undefined;
  if (!pathOrKey.endsWith(".jsonl")) return;
  let projectDir = dirname(pathOrKey);
  if (dirname(projectDir) !== getProjectsDir_3()) return;
  let projectKey = basename(projectDir);
  let sessionKey = basename(pathOrKey, ".jsonl");
  if (pathOrKey !== join(getProjectsDir_3(), projectKey, `${sessionKey}.jsonl`)) return;
  let key = STORAGE_SPACES.transcript(projectKey, sessionKey);
  return validateStorageKey(key) === undefined
    ? {
        backend,
        key,
      }
    : undefined;
}
//@ chunk-0yn8vxcn.js:1185-1734 layout (2.1.88 match: getAgentTranscriptPath, 0.868)
function getAgentTranscriptStorageKey(agentTranscriptPath, backend) {
  if (!isStorageV5Enabled() || backend === undefined) return;
  if (typeof agentTranscriptPath !== "string")
    return typeof getAgentIdFromTranscriptKey(agentTranscriptPath.key) === "string"
      ? {
          backend,
          key: agentTranscriptPath.key,
        }
      : undefined;
  let relativePath = relative(getProjectsDir_3(), agentTranscriptPath);
  if (
    relativePath === "" ||
    relativePath === ".." ||
    relativePath.startsWith(`..${sep}`) ||
    isAbsolute(relativePath)
  )
    return;
  let parts = relativePath.split(sep);
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
  let key = STORAGE_SPACES.transcript(parts[0], parts[1], sliced, sliced_2.length > 0 ? sliced_2 : undefined);
  return validateStorageKey(key) === undefined
    ? {
        backend,
        key,
      }
    : undefined;
}
//@ chunk-0yn8vxcn.js:1734-1863 placement
function getTranscriptStorageContext(backend) {
  if (!isStorageV5Enabled() || backend === undefined) return;
  return {
    backend,
    transcriptKey: STORAGE_SPACES.transcript,
    isKeySegment: isValidKeySegment,
    realWorkspacePath: makeWorkspaceRealPath(backend),
  };
}
//@ chunk-0yn8vxcn.js:1863-1930 placement
function wrapStorageSource(source) {
  return source === undefined
    ? undefined
    : {
        source,
        hoverRestOn: isStorageV5Enabled(),
      };
}
//@ chunk-jd53r7dh.js:3722-3855 callgraph-fingerprint (2.1.88 match: getTranscriptPathForSession, 0.663)
async function getTranscriptPathForSession_2(fullPath, continuedInSessionId, storageV5) {
  let continuedPath = join(dirname(fullPath), `${continuedInSessionId}.jsonl`);
  let sessionLite = await readSessionLite(
    continuedPath,
    wrapStorageSource(getTranscriptStorageKey(continuedPath, storageV5)),
  );
  return (
    sessionLite !== null &&
    (await transcriptMayContainMarker(
      continuedPath,
      sessionLite.head,
      sessionLite.tail,
      sessionLite.size,
      storageV5,
    ))
  );
}
//@ chunk-jd53r7dh.js:3855-3898 placement
var PARENT_UUID_KEY = '"parentUuid":';
var MAX_TRANSCRIPT_SCAN_BYTES = 16777216;
var TRANSCRIPT_TAIL_SCAN_BYTES = 1048576;
//@ chunk-jd53r7dh.js:3898-4380 placement
/**
 * 判断转录头尾或全文是否含有某标记：头尾已命中返回 true，文件较小返回 false，存储模式保守返回 true，否则分块扫描文件直到上限。
 */
async function transcriptMayContainMarker(path, head, tail, size, storageV5) {
  if (head.includes(PARENT_UUID_KEY) || tail.includes(PARENT_UUID_KEY)) return true;
  if (size <= LITE_READ_BUF_SIZE) return false;
  if (getTranscriptStorageKey(path, storageV5) !== undefined) return true;
  try {
    let handle = await open(path, constants.O_RDONLY | constants.O_NOFOLLOW | constants.O_NONBLOCK);
    try {
      if (!(await handle.stat()).isFile()) return false;
      let buffer = Buffer.allocUnsafe(TRANSCRIPT_TAIL_SCAN_BYTES + PARENT_UUID_KEY.length);
      let carry = 0;
      let offset = 0;
      while (offset < MAX_TRANSCRIPT_SCAN_BYTES) {
        let { bytesRead } = await handle.read(buffer, carry, TRANSCRIPT_TAIL_SCAN_BYTES, offset);
        if (bytesRead === 0) return false;
        let filled = carry + bytesRead;
        if (buffer.subarray(0, filled).includes(PARENT_UUID_KEY)) return true;
        carry = Math.min(PARENT_UUID_KEY.length, filled);
        buffer.copyWithin(0, filled - carry, filled);
        offset += bytesRead;
      }
      return true;
    } finally {
      await handle.close();
    }
  } catch {
    return false;
  }
}
//@ chunk-xgvz6tdn.js:226-282 placement
/**
 * worktreeFromProgress：进度消息里的 worktree（磁盘模式下保留）。
 */
function worktreeFromProgress(value) {
  return typeof value !== "string" || isDiskless() ? undefined : value;
}
//@ chunk-5xgkngpb.js:127315-127326 placement
var MAX_VIEW_REFS = 64;
//@ chunk-5xgkngpb.js:214544-214597 placement
/**
 * clearLastIngressUuid：清空按会话记录的最后入站 uuid。
 */
function clearLastIngressUuid() {
  streamFallbackWarning().lastIngressUuidBySession.clear();
}
//@ chunk-5xgkngpb.js:219862-219950 placement
/**
 * isUnavailableStoreError：存储不可用错误（含 cause 链）。
 */
function isUnavailableStoreError(error) {
  let cause = error instanceof Error ? error.cause : undefined;
  return isUnavailableErrorCode(getErrnoCode(error)) || (isStoreError(cause) && isUnavailableError(cause));
}
//@ chunk-5xgkngpb.js:219950-219992 placement
function stopSiblingExistsAt(agentMetadataPath, count, storageV5) {
  return stopSiblingExists(stopSiblingPath(agentMetadataPath, count), storageV5);
}
//@ chunk-5xgkngpb.js:219992-220076 placement
async function setAgentTranscriptSubdir_2(agentMetadataPath, count, storageV5) {
  let path = stopSiblingPath(agentMetadataPath, count);
  stopSiblingCache.set(path, readStopSiblingCount(path) + 1);
  await runWithFileWriteContext(agentMetadataPath, () => removeStopSibling(path, storageV5));
}
//@ chunk-5xgkngpb.js:220076-220087 layout
var MAX_ACCOUNT_LABEL_WIDTH = 80;
//@ chunk-5xgkngpb.js:220087-220216 layout
function ownStoredLoginOwner() {
  let oauthAccountInfo = getOauthAccountInfo();
  if (!oauthAccountInfo?.accountUuid || !credentialIsOwnStoredLogin()) return;
  return {
    accountUuid: oauthAccountInfo.accountUuid,
    organizationUuid: oauthAccountInfo.organizationUuid,
  };
}
//@ chunk-5xgkngpb.js:220216-220281 layout
function ownerDiffers(sessionOwner, owner) {
  if (!sessionOwner?.accountUuid || !owner) return false;
  return !sameOwnerAccount(sessionOwner, owner);
}
//@ chunk-5xgkngpb.js:220281-220356 layout
function isAccountCopyEnabled() {
  if (getIsNonInteractiveSession() || isBgSession()) return false;
  return getFeatureValue_CACHED_MAY_BE_STALE("tengu_bubbly_fountain", false);
}
//@ chunk-5xgkngpb.js:220356-220873 layout
async function rememberKnownAccount(storageV5) {
  let oauthAccountInfo = getOauthAccountInfo();
  if (!oauthAccountInfo?.accountUuid || !credentialIsOwnStoredLogin()) return;
  let organizationUuid = oauthAccountInfo.organizationUuid ?? "";
  let knownAccount = getGlobalConfig().knownAccounts?.[oauthAccountInfo.accountUuid];
  let organizationName =
    oauthAccountInfo.organizationName ?? knownAccount?.organizations?.[organizationUuid] ?? null;
  if (
    knownAccount?.emailAddress === oauthAccountInfo.emailAddress &&
    knownAccount.organizations?.[organizationUuid] === organizationName
  )
    return;
  await saveGlobalConfig((config) => {
    let knownAccount = config.knownAccounts?.[oauthAccountInfo.accountUuid];
    if (
      knownAccount?.emailAddress === oauthAccountInfo.emailAddress &&
      knownAccount.organizations?.[organizationUuid] === organizationName
    )
      return config;
    return {
      ...config,
      knownAccounts: {
        ...config.knownAccounts,
        [oauthAccountInfo.accountUuid]: {
          emailAddress: oauthAccountInfo.emailAddress,
          organizations: {
            ...knownAccount?.organizations,
            [organizationUuid]: organizationName,
          },
        },
      },
    };
  }, storageV5);
}
//@ chunk-5xgkngpb.js:220873-221077 layout
function accountLabelOfOwner(sessionOwner) {
  let knownAccount = getGlobalConfig().knownAccounts?.[sessionOwner.accountUuid];
  if (typeof knownAccount?.emailAddress !== "string") return;
  let knownOrganization = knownAccount.organizations?.[sessionOwner.organizationUuid ?? ""];
  return accountLabel(
    knownAccount.emailAddress,
    typeof knownOrganization === "string" ? knownOrganization : null,
  );
}
//@ chunk-5xgkngpb.js:221077-221283 layout
function currentAccountLabel(label) {
  let oauthAccountInfo = getOauthAccountInfo();
  if (typeof oauthAccountInfo?.emailAddress !== "string") return "your current account";
  let ownLabel = accountLabel(oauthAccountInfo.emailAddress, oauthAccountInfo.organizationName);
  return ownLabel === label
    ? `${accountLabel(oauthAccountInfo.emailAddress, null)} (another organization)`
    : ownLabel;
}
//@ chunk-5xgkngpb.js:221283-221389 layout
function accountLabel(emailAddress, organizationName) {
  return truncateToWidth(
    stripNonPrintable(
      organizationName && organizationName !== `${emailAddress}'s Organization`
        ? `${emailAddress} (${organizationName})`
        : emailAddress,
    ).replace(/[\r\n]+/g, " "),
    MAX_ACCOUNT_LABEL_WIDTH,
  );
}
//@ chunk-5xgkngpb.js:221434-221519 placement
/**
 * isSessionFileAt：该路径是否为指定会话的转录文件。
 */
function isSessionFileAt(path, sessionId) {
  return (
    !isDiskless() &&
    /^[A-Za-z0-9_-]+$/.test(sessionId) &&
    resolve_2(path) === resolve_2(join(devModsDir(), sessionId))
  );
}
//@ chunk-5xgkngpb.js:221519-221626 placement
var DISK_TRANSCRIPT_LAG_PREFIX =
  "When this session resumed, the copy of this conversation on the container's disk lacked at least";
//@ chunk-5xgkngpb.js:221626-222309 placement
function unresolvedTailAfterTip(events, resolvedEventIds, includeAll) {
  let lastIndex = events.findLastIndex((event) =>
    [event.event_id, event.payload.uuid].some(
      (candidate) => typeof candidate === "string" && resolvedEventIds.has(candidate),
    ),
  );
  if (lastIndex === -1 && !includeAll) return;
  let toolIds = new Set();
  let oldestToolRowAt;
  let sliced = events.slice(lastIndex + 1);
  for (let { payload } of sliced) {
    let message = payload.message;
    let content = isPlainObject_6(message) ? message.content : undefined;
    let blocks = Array.isArray(content) ? content : [];
    for (let block of blocks.filter(isPlainObject_6)) {
      let toolId =
        block.type === "tool_use" ? block.id : block.type === "tool_result" ? block.tool_use_id : undefined;
      if (typeof toolId === "string") {
        if (toolIds.size === 0 && typeof payload.timestamp === "string") oldestToolRowAt = payload.timestamp;
        toolIds.add(toolId);
      }
    }
  }
  return {
    rows: sliced.length,
    toolCalls: toolIds.size,
    oldestToolRowAt,
    remindedBefore: sliced.some(({ payload }) => {
      let attachment = payload.attachment;
      let content =
        isPlainObject_6(attachment) && attachment.type === "critical_system_reminder"
          ? attachment.content
          : undefined;
      return typeof content === "string" && content.startsWith(DISK_TRANSCRIPT_LAG_PREFIX);
    }),
  };
}
//@ chunk-5xgkngpb.js:222309-223027 placement
function describeDiskTranscriptLag(lag, now) {
  let timestamp = Date.parse(lag.oldestToolRowAt ?? "");
  let ageNote =
    timestamp <= now
      ? ` The oldest call or result that the disk's copy lacked is from ${new Date(timestamp).toISOString().slice(0, 16).replace("T", " ")} UTC, about ${formatDurationCoarse(now - timestamp)} before this session resumed.`
      : "";
  let repeatNote = lag.remindedBefore
    ? " The disk has been behind like this before in this conversation. Changes that you make on this disk may be lost again. Tell the user this."
    : "";
  return `${DISK_TRANSCRIPT_LAG_PREFIX} ${lag.toolCalls} of your recent tool calls, so the disk may be older than the conversation.${ageNote} Files that those calls created or changed may be missing or out of date, and installed packages may be gone. Check the files that you need before you rely on them, and tell the user if work was lost.${repeatNote}`;
}
//@ chunk-5xgkngpb.js:223027-224167 placement
/**
 * 按转录消息顺序把文件历史快照与增量合成快照列表：同一消息的更新替换、增量合并或合成新快照，只保留最近若干个，被裁掉的部分折叠为基准状态。
 */
function buildFileHistorySnapshots(fileHistorySnapshots, fileHistoryDeltas, transcript) {
  let ops = [];
  let indexByMessageId = new Map();
  let nextIndex = 0;
  for (let message of transcript) {
    let snapshotEntry = fileHistorySnapshots.get(message.uuid);
    if (snapshotEntry) {
      let { snapshot, isSnapshotUpdate } = snapshotEntry;
      let existingIndex = isSnapshotUpdate ? indexByMessageId.get(snapshot.messageId) : undefined;
      if (existingIndex === undefined) {
        indexByMessageId.set(snapshot.messageId, nextIndex);
        ops.push({
          kind: "append",
          index: nextIndex++,
          snapshot,
        });
      } else
        ops.push({
          kind: "replace",
          index: existingIndex,
          snapshot,
        });
    }
    for (let delta of fileHistoryDeltas.get(message.uuid) ?? []) {
      let existingIndex = indexByMessageId.get(delta.snapshotMessageId);
      if (existingIndex === undefined) {
        indexByMessageId.set(delta.snapshotMessageId, nextIndex);
        ops.push({
          kind: "synthesize",
          index: nextIndex++,
          delta,
        });
      } else
        ops.push({
          kind: "merge",
          index: existingIndex,
          delta,
        });
    }
  }
  let max = Math.max(0, nextIndex - MAX_LOGS);
  let snapshots = [];
  let ownedIndexes = new Set();
  let baseState;
  for (let op of ops) {
    if (op.index < max) {
      baseState = foldSnapshotBase(baseState, op);
      continue;
    }
    let targetIndex = op.index - max;
    switch (op.kind) {
      case "append":
        snapshots.push(op.snapshot);
        break;
      case "replace":
        snapshots[targetIndex] = op.snapshot;
        ownedIndexes.delete(targetIndex);
        break;
      case "synthesize":
        ownedIndexes.add(targetIndex);
        snapshots.push({
          messageId: op.delta.snapshotMessageId,
          trackedFileBackups: {
            ...(targetIndex > 0
              ? snapshots[targetIndex - 1].trackedFileBackups
              : baseState?.trackedFileBackups),
            [op.delta.trackingPath]: op.delta.backup,
          },
          timestamp: new Date(op.delta.timestamp),
        });
        break;
      case "merge": {
        let snapshot = snapshots[targetIndex];
        if (!ownedIndexes.has(targetIndex)) {
          snapshot = {
            ...snapshot,
            trackedFileBackups: {
              ...snapshot.trackedFileBackups,
            },
          };
          snapshots[targetIndex] = snapshot;
          ownedIndexes.add(targetIndex);
        }
        defineOwnProperty(snapshot.trackedFileBackups, op.delta.trackingPath, op.delta.backup);
        break;
      }
    }
  }
  return snapshots;
}
//@ chunk-5xgkngpb.js:224167-224569 placement
/**
 * 把被裁掉的文件历史快照操作折叠进基准状态（追加/替换取快照，合成/合并累加增量）。
 */
function foldSnapshotBase(baseState, op) {
  if ((op.kind === "replace" || op.kind === "merge") && op.index !== baseState?.index) return baseState;
  switch (op.kind) {
    case "append":
    case "replace":
      return {
        index: op.index,
        trackedFileBackups: op.snapshot.trackedFileBackups,
        owned: false,
      };
    case "synthesize":
    case "merge": {
      let backups = baseState?.owned
        ? baseState.trackedFileBackups
        : {
            ...baseState?.trackedFileBackups,
          };
      defineOwnProperty(backups, op.delta.trackingPath, op.delta.backup);
      return {
        index: op.index,
        trackedFileBackups: backups,
        owned: true,
      };
    }
  }
}
//@ chunk-5xgkngpb.js:303488-303557 placement
function isFileSnapshotMessage(message) {
  return message.type === "system" && message.subtype === "file_snapshot";
}
//@ chunk-5xgkngpb.js:340087-340336 placement
class TranscriptWriterHealth {
  failuresByFile = new Map();
  failureSeq = 0;
  fullDiskCode = undefined;
  fullDiskPaths = new Set();
  abandonedPaths = new Set();
  abandonedPrefixes = new Set();
  abandonedPendingPaths = new Set();
  latchingEnabled = true;
  firstWriteOkEmitted = false;
  liveServing = null;
  degradedStore = createStore(null);
}
//@ chunk-5xgkngpb.js:340336-340361 placement
var sessionStorageInitState; // deferred: uses SessionRootSlot (../bootstrap/sessionSlices.js) of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-5xgkngpb.js:340336", () => {
  sessionStorageInitState = new SessionRootSlot(() => ({}));
});
//@ chunk-5xgkngpb.js:340361-340396 placement
function setStoragePort(port) {
  sessionStorageInitState.of(getRootSession()).port = port;
}
//@ chunk-5xgkngpb.js:340396-340438 placement
/**
 * storagePort：取存储端口。
 */
function storagePort() {
  return sessionStorageInitState.peek(getRootSession())?.port;
}
//@ chunk-5xgkngpb.js:340438-341573 layout
/**
 * 会话存储常量：CLI 版本、各种大小上限、合成用户文本（中断提示、标签开头）的正则。
 */
var CLI_VERSION =
  typeof {
    ISSUES_EXPLAINER: "report the issue at https://github.com/anthropics/claude-code/issues",
    PACKAGE_URL: "@anthropic-ai/claude-code",
    README_URL: "https://code.claude.com/docs/en/overview",
    VERSION: "2.1.318",
    FEEDBACK_CHANNEL: "https://github.com/anthropics/claude-code/issues",
    BUILD_TIME: "2026-11-03T18:52:53Z",
    GIT_SHA: "ca1fa9dea62c1027756786c841c548788644560d",
    HOOKS_WORKER_URL: import.meta.dir + "/./src/plugins/functionHooks/hooks-worker/hooks-worker.js",
    DD_SOURCEMAP_GROUP: "default",
  } !== "undefined"
    ? {
        ISSUES_EXPLAINER: "report the issue at https://github.com/anthropics/claude-code/issues",
        PACKAGE_URL: "@anthropic-ai/claude-code",
        README_URL: "https://code.claude.com/docs/en/overview",
        VERSION: "2.1.318",
        FEEDBACK_CHANNEL: "https://github.com/anthropics/claude-code/issues",
        BUILD_TIME: "2026-11-03T18:52:53Z",
        GIT_SHA: "ca1fa9dea62c1027756786c841c548788644560d",
        HOOKS_WORKER_URL: import.meta.dir + "/./src/plugins/functionHooks/hooks-worker/hooks-worker.js",
        DD_SOURCEMAP_GROUP: "default",
      }.VERSION
    : "unknown";
var MAX_TRANSCRIPT_READ_BYTES_2 = 52428800;
var MAX_SYNTHETIC_MESSAGE_BYTES = 2000000;
var MAX_TRANSCRIPT_TAIL_BYTES = 52428800;
var TRANSCRIPT_HEAD_BUFFER_BYTES = 4096;
var TOMBSTONE_PAGE_BYTES = 1048576;
var MAX_PAGED_TRANSCRIPT_BYTES = 4194304;
var SYNTHETIC_USER_TEXT_PATTERN = /^(?:\s*<[a-z][\w-]*[\s>]|\[Request interrupted by user[^\]]*\])/;
//@ chunk-5xgkngpb.js:341573-341602 facade-majority
/**
 * 是否为转录消息类型（user/assistant/attachment/system，排除 fork_briefing 附件）。
 */
function isTranscriptMessage(message) {
  return isTranscriptMessage_3(message);
}
//@ chunk-5xgkngpb.js:341602-341640 layout
function isCompactOrCarriedMessage(message) {
  return isCompactBoundaryOrSummary(message) || isCarriedAttachment(message);
}
//@ chunk-5xgkngpb.js:341640-341678 layout
function isCarriedAttachment(message) {
  return isProjectsThreadAskAttachment(message) || isSessionCronCarryAttachment(message);
}
//@ chunk-5xgkngpb.js:341678-341767 layout
function isProjectsThreadAskAttachment(message) {
  return message.type === "attachment" && message.attachment?.type === "projects_thread_ask";
}
//@ chunk-5xgkngpb.js:341767-341855 layout
function isSessionCronCarryAttachment(message) {
  return message.type === "attachment" && message.attachment?.type === "session_cron_carry";
}
//@ chunk-5xgkngpb.js:341855-341965 facade-majority (2.1.88 match: isLegacyProgressEntry, 0.802)
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
//@ chunk-5xgkngpb.js:341965-341993 layout
function isPlainObject_4(value) {
  return isPlainObject_6(value);
}
//@ chunk-5xgkngpb.js:341993-343149 facade-majority
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
  "session-owner": "always",
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
//@ chunk-5xgkngpb.js:343149-343197 layout
function forceGcIfBun(enabled) {
  if (enabled && typeof Bun !== "undefined") Bun.gc(true);
}
//@ chunk-5xgkngpb.js:343197-343230 layout
function isLowYieldCompaction(threshold, count) {
  return count < threshold * SESSION_ENTRY_APPEND_POLICY_2;
}
//@ chunk-5xgkngpb.js:343230-343280 facade-majority
function setLowYieldCompactSkipForTesting(lowYieldCompactSkipEnabled) {
  currentTranscriptStore().lowYieldCompactSkipEnabled = lowYieldCompactSkipEnabled;
}
//@ chunk-5xgkngpb.js:343280-343322 facade-majority
function setTranscriptLocalGcEnabled(enabled) {
  currentTranscriptStore().setLocalGcEnabled(enabled);
}
//@ chunk-5xgkngpb.js:343322-343372 facade-majority
function setToolResultCopiesOnDisk(mode) {
  currentTranscriptStore().setToolResultCopiesOnDisk(mode);
}
//@ chunk-5xgkngpb.js:343372-343420 facade-majority
function getSessionRowsOffDisk() {
  return getProject().sessionRowsOffDisk();
}
//@ chunk-5xgkngpb.js:343420-343472 facade-majority
function setKeepSessionMessagesCache(keep) {
  currentTranscriptStore().setKeepSessionMessagesCache(keep);
}
//@ chunk-5xgkngpb.js:343472-343515 facade-majority (2.1.88 match: countUnseenAssistantTurns, 1)
function isChainParticipant(message) {
  return message.type !== "progress";
}
//@ chunk-5xgkngpb.js:343515-343675 facade-majority
function transcriptCursorEnd(messages, start, findOpenAssistant) {
  if (!findOpenAssistant) return messages.length;
  for (let index = start; index < messages.length; index++) {
    let message = messages[index];
    if (message.type === "assistant" && message.message.stop_reason === null) return index;
  }
  return messages.length;
}
//@ chunk-5xgkngpb.js:343675-343794 layout
function logLegacyProgressProbe(signal) {
  if (!currentTranscriptStore().claimLegacyProgressProbe(signal)) return;
  logEvent("tengu_dead_probe_legacy_progress_bridge", {
    signal: fromEnum(signal),
  });
}
//@ chunk-5xgkngpb.js:343794-343918 fingerprint (2.1.88 match: isLegacyProgressEntry, 1)
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
//@ chunk-5xgkngpb.js:343918-344062 fingerprint (2.1.88 match: EPHEMERAL_PROGRESS_TYPES, 0.654)
var EPHEMERAL_PROGRESS_TYPES; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-5xgkngpb.js:343918", () => {
  EPHEMERAL_PROGRESS_TYPES = new Set([
    "bash_progress",
    "powershell_progress",
    "mcp_progress",
    ...[],
    "tool_heartbeat",
    "agent_api_retry",
    "artifact_publish_retry",
    ...[],
  ]);
});
//@ chunk-5xgkngpb.js:344062-344147 facade-majority
function isEphemeralToolProgress(type) {
  return (
    typeof type === "string" &&
    (EPHEMERAL_PROGRESS_TYPES.has(type) || (codeModeAccepted() && type === "repl_tool_call"))
  );
}
//@ chunk-5xgkngpb.js:344147-344204 facade-majority
function getMaterializedSessionFile() {
  return currentTranscriptStore().project?.sessionFilePath ?? null;
}
//@ chunk-5xgkngpb.js:344204-344231 facade-majority
function locateMaterializedSessionFile() {
  return getMaterializedSessionFile();
}
//@ chunk-5xgkngpb.js:344231-344265 facade-majority
function hasMaterializedSessionFile() {
  return getMaterializedSessionFile() !== null;
}
//@ chunk-5xgkngpb.js:344265-344335 facade-majority
function hasRecordedUserPrompt() {
  return currentTranscriptStore().project?.currentSessionLastPrompt !== undefined;
}
//@ chunk-5xgkngpb.js:344335-344417 facade-majority (2.1.88 match: getErrorsPath, 1)
/**
 * 某会话的转录路径：当前会话返回已绑定的会话文件，否则 <当前项目目录>/<sessionId>.jsonl。
 */
function getTranscriptPathForSession(sessionId) {
  if (sessionId === getSessionId()) return getMaterializedSessionFile() ?? getTranscriptPath();
  let projectDir = resolveProjectDir();
  return join(projectDir, `${sessionId}.jsonl`);
}
//@ chunk-5xgkngpb.js:344417-344446 facade-majority
function locateTranscriptForSession(sessionId) {
  return getTranscriptPathForSession(sessionId);
}
//@ chunk-5xgkngpb.js:344496-344558 facade-majority (2.1.88 match: getAgentMetadataPath, 1)
function getAgentMetadataPath(agentId) {
  return getAgentTranscriptPath(agentId).replace(/\.jsonl$/, ".meta.json");
}
//@ chunk-5xgkngpb.js:344558-344715 facade-majority
var RESERVED_AGENT_METADATA_FIELDS = [
  "isObserver",
  "observerStopped",
  "observerTaskId",
  "armingPermissionMode",
  "revivedAt",
];
var AGENT_METADATA_FIELDS = [
  ...RESERVED_AGENT_METADATA_FIELDS,
  "restartResumes",
  "restartResumesSetBackBy",
  "model",
];
//@ chunk-5xgkngpb.js:344715-345116 facade-majority (2.1.88 match: readAgentMetadata, 0.394)
async function readAgentMetadataAtPath(path, storage, isAbsent = isFsInaccessible) {
  if (isStorageV5Enabled() && storage !== undefined) {
    let path_2 = keyFromMetaPath(path);
    if (path_2 !== undefined) {
      let readResult = await storage.read([path_2]);
      if (!readResult.ok)
        throw Error("readAgentMetadataAtPath: storage read failed", {
          cause: readResult.error,
        });
      let [item] = readResult.value.items;
      if (!item.found) return null;
      return jsonParse(Buffer.from(item.value).toString("utf-8"));
    }
  }
  let diskPath = worktreeFromProgress(path);
  if (diskPath === undefined) return null;
  try {
    let raw = await readFile(diskPath, "utf-8");
    return jsonParse(raw);
  } catch (error) {
    if (isAbsent(error)) return null;
    throw error;
  }
}
//@ chunk-5xgkngpb.js:345116-347556 layout
/**
 * 写子代理元数据侧车 agent-<id>.meta.json（agentType、observer 状态等），已有内容时合并。
 */
async function persistAgentMetadata(path, metadata, sessionId, storage, requireComplete = false) {
  let merged = metadata;
  let all = RESERVED_AGENT_METADATA_FIELDS.every((field) => metadata[field] !== undefined);
  let existing = null;
  try {
    existing = await readAgentMetadataAtPath(path, storage);
  } catch (error) {
    if (!all || requireComplete) throw error;
  }
  if (existing) {
    if (requireComplete) return;
    for (let field of AGENT_METADATA_FIELDS)
      if (metadata[field] === undefined && existing[field] !== undefined)
        merged = {
          ...merged,
          [field]: existing[field],
        };
    if (existing.pluginSteered === true)
      merged = {
        ...merged,
        pluginSteered: true,
      };
  }
  let key = isStorageV5Enabled() && storage !== undefined ? keyFromMetaPath(path) : undefined;
  if (storage !== undefined && key !== undefined) {
    let writeResult = await storage.write(key, jsonStringify(merged), {
      mode: 438 & ~process.umask(),
    });
    if (!writeResult.ok)
      throw Error("persistAgentMetadata: storage write failed", {
        cause: writeResult.error,
      });
  } else {
    assertDiskWritable("agent_metadata", path);
    await mkdir(dirname(path), {
      recursive: true,
    });
    await writeFileAtomic_2(path, jsonStringify(merged));
  }
  let replaced = path.replace(/\.meta\.json$/, ".jsonl");
  getProject().fireMirror(replaced, [
    {
      type: "agent_metadata",
      agentType: merged.agentType,
      ...(merged.isFork !== undefined && {
        isFork: merged.isFork,
      }),
      ...(merged.isBuiltIn !== undefined && {
        isBuiltIn: merged.isBuiltIn,
      }),
      ...(merged.worktreePath && {
        worktreePath: merged.worktreePath,
      }),
      ...(merged.worktreeBranch && {
        worktreeBranch: merged.worktreeBranch,
      }),
      ...(merged.cwd && {
        cwd: merged.cwd,
      }),
      ...(merged.spawnMode && {
        spawnMode: merged.spawnMode,
      }),
      ...(merged.description && {
        description: merged.description,
      }),
      ...(merged.workflowPhase && {
        workflowPhase: merged.workflowPhase,
      }),
      ...(merged.name && {
        name: merged.name,
      }),
      ...(merged.toolUseId && {
        toolUseId: merged.toolUseId,
      }),
      ...(codeModeAccepted() &&
        merged.enclosingToolUseId && {
          enclosingToolUseId: merged.enclosingToolUseId,
        }),
      ...(merged.parentAgentId && {
        parentAgentId: merged.parentAgentId,
      }),
      ...(merged.stoppedByUser && {
        stoppedByUser: true,
      }),
      ...(merged.finished && {
        finished: true,
      }),
      ...(merged.spawnDepth !== undefined && {
        spawnDepth: merged.spawnDepth,
      }),
      ...(merged.requestShape && {
        requestShape: merged.requestShape,
      }),
      ...(merged.requestNonInteractive !== undefined && {
        requestNonInteractive: merged.requestNonInteractive,
      }),
      ...(merged.taskKind && {
        taskKind: merged.taskKind,
      }),
      ...(merged.teamName && {
        teamName: merged.teamName,
      }),
      ...(merged.color && {
        color: merged.color,
      }),
      ...(merged.planModeRequired !== undefined && {
        planModeRequired: merged.planModeRequired,
      }),
      ...(merged.customAgentType && {
        customAgentType: merged.customAgentType,
      }),
      ...(merged.spawnedAgentType && {
        spawnedAgentType: merged.spawnedAgentType,
      }),
      ...(merged.effort && {
        effort: merged.effort,
      }),
      ...(merged.pickedEffortModel && {
        pickedEffortModel: merged.pickedEffortModel,
      }),
      ...(merged.permissionMode && {
        permissionMode: merged.permissionMode,
      }),
      ...(merged.launchedWithDefaults === true && {
        launchedWithDefaults: true,
      }),
      ...Object.fromEntries(
        AGENT_METADATA_FIELDS.filter((field) => merged[field] !== undefined).map((field) => [
          field,
          merged[field],
        ]),
      ),
      ...(merged.pluginSteered === true && {
        pluginSteered: true,
      }),
    },
  ]);
  let project = getProject();
  let agentId = /^agent-(.+)\.meta\.json$/.exec(basename(path))?.[1];
  if (agentId !== undefined && !requireComplete && project.keepsAgentMetadataInStream())
    project
      .mirrorWorkerEvent(
        "agent_metadata",
        {
          ...merged,
          type: "agent_metadata",
        },
        {
          sessionId,
          agentId,
        },
      )
      .then(
        (ok) => {
          if (ok) logFeatureOk("subagent_sidecar_to_stream");
          else logFeatureSad("subagent_sidecar_to_stream", "withheld");
        },
        (error) => {
          logFeatureBad("subagent_sidecar_to_stream", "send_failed");
          logError(error);
        },
      );
}
//@ chunk-5xgkngpb.js:347556-347641 facade-majority
async function writeAgentMetadata(agentId, metadata, storage, requireComplete = false) {
  let sessionId = pinSessionId(getSessionId());
  let path = getAgentMetadataPath(agentId);
  await runWithFileWriteContext(path, () =>
    persistAgentMetadata(path, metadata, sessionId, storage, requireComplete),
  );
}
//@ chunk-5xgkngpb.js:347641-347722 facade-majority
async function updateAgentMetadata(agentId, patch, storageV5, isAbsent) {
  let sessionId = pinSessionId(getSessionId());
  let agentMetadataPath = getAgentMetadataPath(agentId);
  await runWithFileWriteContext(agentMetadataPath, () =>
    mergeAgentMetadataUnderLock(agentMetadataPath, patch, sessionId, storageV5, isAbsent),
  );
}
//@ chunk-5xgkngpb.js:347722-347962 facade-majority
async function mergeAgentMetadataUnderLock(path, patch, sessionId, storage, isAbsent, fallback) {
  let existing = (await readAgentMetadataAtPath(path, storage, isAbsent)) ?? fallback;
  if (!existing && patch.agentType === undefined) {
    logForDebugging(
      `[updateAgentMetadata] dropped patch for ${path}: no existing sidecar and patch lacks agentType`,
    );
    return false;
  }
  let merged = {
    ...existing,
    ...patch,
  };
  await persistAgentMetadata(path, merged, sessionId, storage);
  return true;
}
//@ chunk-5xgkngpb.js:347962-348025 layout
function canPersistAgentMetadata(agentMetadataPath, storage) {
  return (
    !isDiskless() ||
    (isStorageV5Enabled() && storage !== undefined && keyFromMetaPath(agentMetadataPath) !== undefined)
  );
}
//@ chunk-5xgkngpb.js:348025-348272 facade-majority
function landAgentStop(agentId, field, apply, storage, options) {
  return (async () => {
    let sessionId = pinSessionId(getSessionId());
    let agentMetadataPath = getAgentMetadataPath(agentId);
    if (!canPersistAgentMetadata(agentMetadataPath, storage)) {
      logForDebugging(
        `[agent stop] ${field} not kept for ${agentId}: diskless, and no store for its sidecar`,
      );
      warnDisklessSettingsWrite("agent_metadata", agentMetadataPath);
      return;
    }
    await persistSubagentStop(
      agentMetadataPath,
      field,
      apply,
      () =>
        mergeAgentMetadataUnderLock(
          agentMetadataPath,
          {
            [field]: true,
          },
          sessionId,
          storage,
        ),
      storage,
      options,
    );
  })().catch(logError);
}
//@ chunk-5xgkngpb.js:348272-348421 facade-majority
function landStoppedByUser(agentId, agentType, storage) {
  return landAgentStop(
    agentId,
    "stoppedByUser",
    async () => {
      let sessionId = pinSessionId(getSessionId());
      let agentMetadataPath = getAgentMetadataPath(agentId);
      await runWithFileWriteContext(agentMetadataPath, () =>
        mergeAgentMetadataUnderLock(
          agentMetadataPath,
          {
            stoppedByUser: true,
          },
          sessionId,
          storage,
          isPathAbsent,
          {
            agentType,
          },
        ),
      );
    },
    storage,
  );
}
//@ chunk-5xgkngpb.js:348421-348470 facade-majority
async function hasAgentStopSibling(agentId, storage, storageV5) {
  return stopSiblingExistsAt(getAgentMetadataPath(agentId), storage, storageV5);
}
//@ chunk-5xgkngpb.js:348470-348518 facade-majority
async function clearAgentStopSibling(agentId, storage, storageV5) {
  await setAgentTranscriptSubdir_2(getAgentMetadataPath(agentId), storage, storageV5);
}
//@ chunk-5xgkngpb.js:348518-348566 facade-majority
async function readAgentMetadata(agentId, storageV5, isAbsent) {
  return readAgentMetadataAtPath(getAgentMetadataPath(agentId), storageV5, isAbsent);
}
//@ chunk-5xgkngpb.js:348566-349020 layout
/**
 * REMOTE_TASK_ID_PATTERN：远程任务 id 格式；REMOTE_TASK_ENTRY_SCHEMA：远程任务条目 schema（同一声明共 2 个绑定）。
 */
var REMOTE_TASK_ID_PATTERN_2; // deferred: uses DoctorLazy (../cli/handlers/util.js) of its import cycle while loading; runs once the cycle is complete
var REMOTE_TASK_ID_PATTERN;
var REMOTE_TASK_ENTRY_SCHEMA;
deferInit("chunk-5xgkngpb.js:348566", () => {
  REMOTE_TASK_ID_PATTERN_2 = /^r[0-9a-z]{8}$/;
  REMOTE_TASK_ID_PATTERN = /^(?!\.\.?$)[^\\/?#%\x00-\x20\x7f]+$/;
  REMOTE_TASK_ENTRY_SCHEMA = DoctorLazy(() =>
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
});
//@ chunk-5xgkngpb.js:349020-349079 fingerprint (2.1.88 match: getRemoteAgentsDir, 1)
function getRemoteAgentsDir() {
  let projectDir = resolveSessionProjectDir();
  return join(projectDir, getSessionId(), "remote-agents");
}
//@ chunk-5xgkngpb.js:349079-349142 fingerprint (2.1.88 match: getRemoteAgentMetadataPath, 1)
function getRemoteAgentMetadataPath(taskId) {
  return join(getRemoteAgentsDir(), `remote-agent-${taskId}.meta.json`);
}
//@ chunk-5xgkngpb.js:349142-349469 facade-majority (2.1.88 match: writeRemoteAgentMetadata, 0.137)
async function writeRemoteAgentMetadata(taskId, metadata, storageV5) {
  let path = getRemoteAgentMetadataPath(taskId);
  if (!isDiskless())
    await mkdir(dirname(path), {
      recursive: true,
    });
  if (isStorageV5Enabled() && storageV5 !== undefined) {
    let key = keyFromMetaPath(path);
    if (key !== undefined) {
      let writeResult = await storageV5.write(key, jsonStringify(metadata), {
        publishDiscipline: "inPlace",
      });
      if (!writeResult.ok)
        throw Error("writeRemoteAgentMetadata: storage write failed", {
          cause: writeResult.error,
        });
      return;
    }
  }
  assertDiskWritable("remote_agent_metadata", path);
  await writeFile(path, jsonStringify(metadata));
}
//@ chunk-5xgkngpb.js:349469-349759 facade-majority
async function deleteRemoteAgentMetadata(taskId, storageV5) {
  let remoteAgentMetadataPath = getRemoteAgentMetadataPath(taskId);
  if (isStorageV5Enabled() && storageV5 !== undefined) {
    let key = keyFromMetaPath(remoteAgentMetadataPath);
    if (key !== undefined) {
      let deleteResult = await storageV5.delete(key);
      if (!deleteResult.ok)
        throw Error("deleteRemoteAgentMetadata: storage delete failed", {
          cause: deleteResult.error,
        });
      return;
    }
  }
  let diskPath = worktreeFromProgress(remoteAgentMetadataPath);
  if (diskPath === undefined) return;
  try {
    await unlink(diskPath);
  } catch (error) {
    if (isFsInaccessible(error)) return;
    throw error;
  }
}
//@ chunk-5xgkngpb.js:349759-349864 facade-majority (2.1.88 match: removeRemoteAgentMetadata, 1)
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
//@ chunk-5xgkngpb.js:349864-350554 facade-majority (2.1.88 match: listRemoteAgentMetadata, 0.645)
async function listRemoteAgentMetadata(storage) {
  let dir = getRemoteAgentsDir();
  if (isStorageV5Enabled() && storage !== undefined) {
    let probeKey = keyFromMetaPath(join(dir, "probe.meta.json"));
    if (probeKey !== undefined && probeKey.namespace === "sidecar")
      return listRemoteAgentMetadataViaStorage(storage, {
        namespace: "sidecar",
        projectKey: probeKey.projectKey,
        sessionId: probeKey.sessionId,
        relPath: probeKey.relPath.slice(0, -1),
      });
  }
  let diskDir = worktreeFromProgress(dir);
  if (diskDir === undefined) return [];
  let entries;
  try {
    entries = await readdir(diskDir, {
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
      let raw = await readFile(join(diskDir, entry.name), "utf-8");
      let parsed = REMOTE_TASK_ENTRY_SCHEMA().safeParse(jsonParse(raw));
      if (!parsed.success) {
        logForDebugging(`listRemoteAgentMetadata: skipping ${entry.name}: ${String(parsed.error)}`);
        continue;
      }
      results.push(parsed.data);
    } catch (e) {
      logForDebugging(`listRemoteAgentMetadata: skipping ${entry.name}: ${String(e)}`);
    }
  }
  return results;
}
//@ chunk-5xgkngpb.js:350554-351480 layout
async function listRemoteAgentMetadataViaStorage(storage, scope) {
  let keys = [];
  let allPages = await readAllPages(
    (cursor) =>
      storage.listEntries(scope, {
        skipKeyStats: true,
        skipScopeStats: true,
        ...(cursor !== undefined && {
          cursor,
        }),
      }),
    (items) => {
      for (let item of items)
        if (
          item.kind === "key" &&
          item.key.namespace === "sidecar" &&
          item.key.relPath.length === scope.relPath.length + 1 &&
          item.key.relPath[scope.relPath.length].endsWith(".meta.json")
        )
          keys.push(item.key);
    },
  );
  if (allPages.status !== "done") {
    if (allPages.status === "error")
      logForDebugging(
        `listRemoteAgentMetadata: listing failed via storage (${allPages.error.code}) \u2014 empty restore`,
      );
    return [];
  }
  if (keys.length === 0) return [];
  let text = await storage.readText(keys);
  if (!text.ok) {
    logForDebugging(
      `listRemoteAgentMetadata: read failed via storage (${text.error.code}) \u2014 empty restore`,
    );
    return [];
  }
  let results = [];
  text.value.items.forEach((item, index) => {
    let last = keys[index].relPath.at(-1);
    if (!item.found) return;
    try {
      let parsed = REMOTE_TASK_ENTRY_SCHEMA().safeParse(jsonParse(item.value));
      if (!parsed.success) {
        logForDebugging(`listRemoteAgentMetadata: skipping ${last}: ${String(parsed.error)}`);
        return;
      }
      results.push(parsed.data);
    } catch (error) {
      logForDebugging(`listRemoteAgentMetadata: skipping ${last}: ${String(error)}`);
    }
  });
  return results;
}
//@ chunk-5xgkngpb.js:351480-351595 facade-majority (2.1.88 match: sessionIdExists, 1)
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
//@ chunk-5xgkngpb.js:351595-351629 facade-majority (2.1.88 match: getEnvironmentForGrowthBook, 1)
function getNodeEnv() {
  return "production";
}
//@ chunk-5xgkngpb.js:351629-351663 facade-majority
function isTranscriptPersistenceDisabled() {
  return getPersistenceSuppressionCause() !== null;
}
//@ chunk-5xgkngpb.js:351663-351890 facade-majority
function getPersistenceSuppressionCause() {
  if (getNodeEnv() === "test" && !env.TEST_ENABLE_SESSION_PERSISTENCE) return "test_env";
  if (isSessionPersistenceDisabled()) return "explicit_disable";
  if (env.CLAUDE_CODE_SKIP_PROMPT_HISTORY) return "skip_prompt_history";
  if (isNestedInteractiveClaudeSession()) return "nested_marker";
  return null;
}
//@ chunk-5xgkngpb.js:351890-352004 facade-majority
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
//@ chunk-5xgkngpb.js:352004-352086 placement
function transcriptVersion(entry) {
  return "version" in entry && typeof entry.version === "string" ? entry.version : undefined;
}
//@ chunk-5xgkngpb.js:352146-352190 facade-majority
function withVersionToRecord(entry) {
  return {
    ...entry,
    version: transcriptVersionOrDefault(entry),
  };
}
//@ chunk-5xgkngpb.js:352190-352222 facade-majority (2.1.88 match: getUserType, 0.74)
function getUserType() {
  return "external";
}
//@ chunk-5xgkngpb.js:352222-352279 layout
function entrypointEnv() {
  return process.env.CLAUDE_CODE_ENTRYPOINT;
}
//@ chunk-5xgkngpb.js:352279-352421 layout
async function transcriptContextFields() {
  let entrypoint = entrypointEnv();
  return {
    cwd: getCwdOrNull() ?? undefined,
    gitBranch: await getBranch().catch(() => {
      return;
    }),
    entrypoint: entrypoint !== undefined && PROGRAMMATIC_ENTRYPOINTS.has(entrypoint) ? undefined : entrypoint,
  };
}
//@ chunk-5xgkngpb.js:352421-352448 layout
var SESSION_ALIASES_DIR = ".session-aliases";
//@ chunk-5xgkngpb.js:352448-352655 layout
function sessionAliasStorageTarget(projectDir, storage) {
  if (!isStorageV5Enabled() || storage === undefined || dirname(projectDir) !== getProjectsDir()) return;
  let projectKey = basename(projectDir);
  let key = STORAGE_SPACES.sessionAliases(projectKey);
  let folder = {
    namespace: "transcript",
    projectKey,
  };
  return validateStorageKey(key) === undefined && validateStorageScope(folder) === undefined
    ? {
        backend: storage,
        key,
        folder,
      }
    : undefined;
}
//@ chunk-5xgkngpb.js:352655-353149 layout
/**
 * 经存储后端把会话别名追加到别名记录（已存在则跳过）；目录不存在时先建作用域再重试，失败只记日志。
 */
async function appendSessionAliasViaStorage(target, sessionProjectDir, projectDir) {
  let update = () =>
    target.backend.updateText(
      target.key,
      (existing) =>
        existing !== undefined &&
        existing.value
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
                (existing?.value ?? "") +
                sessionProjectDir +
                `
`,
            },
      {
        publishDiscipline: "inPlace",
        mode: 384,
      },
    );
  let result = await update();
  if (!result.ok && isAbsentParentError(result.error)) {
    let scopeResult = await target.backend.ensureScope(target.folder);
    if (!scopeResult.ok) {
      let error = transcriptMkdirFailedError(scopeResult.error);
      if (isFsInaccessible(error)) {
        logForDebugging(
          `recordSessionAlias: mkdir failed for ${join(projectDir, SESSION_ALIASES_DIR)}: ${error}`,
        );
        return;
      }
      logError(error);
      return;
    }
    result = await update();
  }
  if (!result.ok)
    logForDebugging(`recordSessionAlias: update failed via storage (${formatStorageError(result.error)})`, {
      level: "error",
    });
}
//@ chunk-5xgkngpb.js:353149-354148 facade-majority
async function recordSessionAlias(projectPath, storage) {
  if (isTranscriptPersistenceDisabled()) return;
  let realPath = projectPath;
  try {
    if (isStorageV5Enabled() && storage !== undefined) {
      let realResult = await makeWorkspaceRealPath(storage)(projectPath);
      if (realResult.ok && realResult.value.found) realPath = identity(realResult.value.path);
      else if (!realResult.ok)
        logForDebugging(
          `recordSessionAlias: realpath failed for ${projectPath}: ${formatStorageError(realResult.error)}`,
          {
            level: isUnsupportedStorageError(realResult.error) ? "debug" : "error",
          },
        );
    } else if (!isDiskless()) realPath = identity(await realpath(projectPath));
  } catch (error) {
    if (!isENOENT(error))
      logForDebugging(`recordSessionAlias: realpath failed for ${projectPath}: ${error}`, {
        level: "error",
      });
  }
  let sessionProjectDir = resolveSessionProjectDir();
  let projectDir = getProjectDir(realPath);
  if (projectDir === sessionProjectDir) return;
  let target = sessionAliasStorageTarget(projectDir, storage);
  if (target !== undefined) {
    try {
      await appendSessionAliasViaStorage(target, sessionProjectDir, projectDir);
    } catch (error) {
      logForDebugging(`recordSessionAlias: update threw via storage: ${error}`);
    }
    return;
  }
  let aliasesPath = join(projectDir, SESSION_ALIASES_DIR);
  if (isDiskless()) {
    warnDisklessSettingsWrite("session_alias", aliasesPath);
    return;
  }
  try {
    if (
      (await readFile(aliasesPath, "utf8"))
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
        logForDebugging(`recordSessionAlias: read failed for ${aliasesPath}: ${error}`);
        return;
      }
      logError(error);
      return;
    }
    try {
      await mkdir(dirname(aliasesPath), {
        recursive: true,
        mode: 448,
      });
    } catch (error) {
      if (isFsInaccessible(error)) {
        logForDebugging(`recordSessionAlias: mkdir failed for ${aliasesPath}: ${error}`);
        return;
      }
      logError(error);
      return;
    }
  }
  try {
    await appendFile(
      aliasesPath,
      sessionProjectDir +
        `
`,
      {
        mode: 384,
      },
    );
  } catch (error) {
    if (isFsInaccessible(error)) {
      logForDebugging(`recordSessionAlias: append failed for ${aliasesPath}: ${error}`);
      return;
    }
    logError(error);
  }
}
//@ chunk-5xgkngpb.js:354148-354716 layout
/**
 * 读取项目目录下的会话别名列表：优先经存储后端，否则读本地文件，去重并忽略空行；读失败返回空列表。
 */
async function readSessionAliases(projectPath, storage) {
  let storageTarget = sessionAliasStorageTarget(getProjectDir(projectPath), storage);
  if (storageTarget !== undefined)
    try {
      let text = await storageTarget.backend.readText([storageTarget.key]);
      if (!text.ok) {
        logForDebugging(`readSessionAliases: read failed via storage (${formatStorageError(text.error)})`);
        return [];
      }
      let item = text.value.items[0];
      return item.found
        ? normalizeCaseForComparison_2(
            item.value
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
  let aliasesPath = worktreeFromProgress(join(getProjectDir(projectPath), SESSION_ALIASES_DIR));
  if (aliasesPath === undefined) return [];
  try {
    let file = await readFile(aliasesPath, "utf8");
    return normalizeCaseForComparison_2(
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
//@ chunk-5xgkngpb.js:354716-356985 layout
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
  sessionMessages = memoizeAlias(
    async (sessionId, storage) => {
      let uuids = [];
      try {
        let { messages } = await loadSessionTranscript(
          sessionId,
          sessionId === this.getSessionId() ? undefined : this.project?.recordedSessionFile(sessionId),
          storage,
        );
        uuids = messages.keys();
      } catch (error) {
        logForDebugging(
          `getSessionMessages: loadSessionFile failed: ${error instanceof Error ? error.message : String(error)}`,
          {
            level: "error",
          },
        );
      }
      let filelessResumeUuids = this.filelessResumeUuids;
      let set = new Set(filelessResumeUuids?.sessionId === sessionId ? filelessResumeUuids.uuids : undefined);
      for (let uuid of uuids) set.add(uuid);
      return set;
    },
    (sessionId) => sessionId,
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
  setToolResultCopiesOnDisk(mode) {
    this.toolResultCopiesOnDisk = mode;
    this.slimAppendedRow = mode === "slim" ? createToolResultSlimmer_2() : undefined;
  }
  claimExitReStamp() {
    if (this.exitReStampRan) return false;
    this.exitReStampRan = true;
    return true;
  }
  exitReStampDone() {
    return this.exitReStampRan;
  }
  claimLegacyProgressProbe(signal) {
    if (this.legacyProgressProbeFired.has(signal)) return false;
    this.legacyProgressProbeFired.add(signal);
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
  primeSessionMessagesCache(sessionId, uuids) {
    let cache = this.sessionMessages.cache;
    let existing = cache.get(sessionId);
    if (existing === undefined) {
      cache.set(sessionId, Promise.resolve(new Set(uuids)));
      return;
    }
    existing.then((set) => {
      for (let uuid of uuids) set.add(uuid);
    });
  }
  primeFilelessResume(sessionId, uuids) {
    let set = new Set(uuids);
    this.filelessResumeUuids = {
      sessionId,
      uuids: set,
    };
    this.primeSessionMessagesCache(sessionId, set);
  }
}
//@ chunk-5xgkngpb.js:356985-357034 facade-majority
var transcriptStores; // deferred: uses SessionRootSlot (../bootstrap/sessionSlices.js) of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-5xgkngpb.js:356985", () => {
  transcriptStores = new SessionRootSlot(() => ({
    current: new TranscriptStore(() => getSessionId()),
  }));
});
//@ chunk-5xgkngpb.js:357034-357075 layout
/**
 * currentTranscriptStore：当前转录存储。
 */
function currentTranscriptStore() {
  return transcriptStores.of(getRootSession()).current;
}
//@ chunk-5xgkngpb.js:357075-357162 layout
class RestoreClaim {
  installed = false;
  claim() {
    if (this.installed) return false;
    this.installed = true;
    return true;
  }
}
//@ chunk-5xgkngpb.js:357162-357189 facade-majority
var transcriptExitHooksLatches; // deferred: uses RestoreClaim of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-5xgkngpb.js:357162", () => {
  transcriptExitHooksLatches = new HostScoped(() => new RestoreClaim());
});
//@ chunk-5xgkngpb.js:357189-357229 facade-majority
function getTranscriptWriterHealth() {
  return currentTranscriptStore().writerHealth;
}
//@ chunk-5xgkngpb.js:357229-357279 facade-majority
function getTranscriptWriteFailureSeq() {
  return currentTranscriptStore().writerHealth.failureSeq;
}
//@ chunk-5xgkngpb.js:357279-357344 facade-majority
function getTranscriptWriterDegraded() {
  return currentTranscriptStore().writerHealth.degradedStore.getState();
}
//@ chunk-5xgkngpb.js:357344-357969 facade-majority
function reAppendSessionMetadataAtExit() {
  if (isDiagLogging() && !isInDiagScope()) return;
  if (isDiskless()) return;
  let store = currentTranscriptStore();
  if (!store.claimExitReStamp()) return;
  try {
    store.project?.reAppendSessionMetadata(false, false, true);
  } catch {}
  let takenForeignExitLines =
    isStorageV5Enabled() && store.takenForeignExitLines.size > 0 ? store.takenForeignExitLines : undefined;
  let written = takenForeignExitLines !== undefined ? new Set() : undefined;
  for (let foreignExitReStampProvider of store.foreignExitReStampProviders)
    try {
      for (let { path, entry, tornTailEntry } of foreignExitReStampProvider())
        try {
          appendEntrySync(path, entry, tornTailEntry);
          written?.add(entryDedupKey(path, entry));
        } catch {}
    } catch {}
  if (takenForeignExitLines !== undefined) {
    for (let { path, entry, tornTailEntry } of takenForeignExitLines) {
      if (written?.has(entryDedupKey(path, entry)) === true) continue;
      try {
        appendEntrySync(path, entry, tornTailEntry);
      } catch {}
    }
    takenForeignExitLines.clear();
  }
  for (let exitReStampProvider of store.exitReStampProviders)
    try {
      let entries = exitReStampProvider();
      if (entries !== undefined) store.project?.appendOwedEntryAtExit(entries);
    } catch {}
}
//@ chunk-5xgkngpb.js:357969-358067 facade-majority
function registerTranscriptExitReStamp(provider) {
  currentTranscriptStore().exitReStampProviders.add(provider);
  return () => {
    currentTranscriptStore().exitReStampProviders.delete(provider);
  };
}
//@ chunk-5xgkngpb.js:358067-358145 facade-majority
function registerTranscriptExitDrain(drain) {
  currentTranscriptStore().exitDrains.add(drain);
  return () => {
    currentTranscriptStore().exitDrains.delete(drain);
  };
}
//@ chunk-5xgkngpb.js:358145-358257 facade-majority
function registerForeignTranscriptExitReStamp(collectExitIntentEntries) {
  currentTranscriptStore().foreignExitReStampProviders.add(collectExitIntentEntries);
  return () => {
    currentTranscriptStore().foreignExitReStampProviders.delete(collectExitIntentEntries);
  };
}
//@ chunk-5xgkngpb.js:358257-358275 layout
var MAX_RELOCATION_RETRIES = 500;
var RELOCATION_BACKOFF = 3;
//@ chunk-5xgkngpb.js:358275-358995 facade-majority
async function flushSessionStorageAtExit() {
  if (isDiagLogging() && !isInDiagScope()) return;
  let store = currentTranscriptStore();
  try {
    await withDeadline(
      Promise.allSettled([...store.exitDrains].map((exitDrain) => Promise.resolve().then(exitDrain))),
      500,
    );
    try {
      await store.project?.flush();
    } finally {
      store.project?.settleHeldReplayRecords();
    }
    await flushAppendEntryQueues();
    let project = store.project;
    let source = project?.exitReStampSource();
    if (isStorageV5Enabled() && project !== null && source !== undefined) {
      if (
        (await withDeadline(
          project.reStampAtExitAsync(source).then(() => true),
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
//@ chunk-5xgkngpb.js:358995-359178 callgraph-witnessed (2.1.88 match: getProject, 0)
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
//@ chunk-5xgkngpb.js:359178-359226 facade-majority (2.1.88 match: resetProjectFlushStateForTesting, 0.772)
function resetProjectFlushStateForTesting() {
  currentTranscriptStore().project?._resetFlushState();
}
//@ chunk-5xgkngpb.js:359226-359278 facade-majority
function resetProjectForTesting() {
  transcriptStores.of(getRootSession()).current = new TranscriptStore(() => getSessionId());
}
//@ chunk-5xgkngpb.js:359278-359350 facade-majority
function compactTranscriptForTesting(messages, options, args, thirdArg, fourthArg) {
  return getProject().performCompactTranscript(messages, options, args, thirdArg, fourthArg);
}
//@ chunk-5xgkngpb.js:359350-359399 facade-majority
function requestCompactForTesting(reason) {
  getProject().requestCompact(reason, undefined, true);
}
//@ chunk-5xgkngpb.js:359399-359438 facade-majority
function setSessionFileForTesting(path) {
  getProject().setSessionFile(path);
}
//@ chunk-5xgkngpb.js:359438-359476 facade-majority
function transcriptTailForHydrateForTesting(a, b, c) {
  return readHydrateTail(a, b, c);
}
//@ chunk-5xgkngpb.js:359476-359510 facade-majority
function readSessionAliasesForTesting(projectPath, storage) {
  return readSessionAliases(projectPath, storage);
}
//@ chunk-5xgkngpb.js:359510-359585 facade-majority
async function reAppendSessionMetadataAsyncForTesting(maybe = true, options) {
  await getProject().reAppendSessionMetadataAsync(false, maybe, options);
}
//@ chunk-5xgkngpb.js:359585-359648 facade-majority (2.1.88 match: recordContextCollapseCommit, 1)
async function appendEntryToSessionForTesting(entry, cwd, options) {
  await getProject().appendEntry(entry, cwd, undefined, options);
}
//@ chunk-5xgkngpb.js:359648-359691 facade-majority
function getCurrentSessionFile() {
  return getProject().sessionFilePath;
}
//@ chunk-5xgkngpb.js:359691-359719 facade-majority
function locateCurrentSessionFile() {
  return getCurrentSessionFile();
}
//@ chunk-5xgkngpb.js:359719-359770 facade-majority
function currentSessionFileIsFor(path) {
  return isOwnTranscriptFile(path, getProject().sessionFilePath);
}
//@ chunk-5xgkngpb.js:359770-359835 facade-majority
function onSessionFileMaterialized(listener) {
  return currentTranscriptStore().sessionFileMaterialized.subscribe(listener);
}
//@ chunk-5xgkngpb.js:359835-359886 facade-majority
function emitSessionFileMaterializedForTesting() {
  currentTranscriptStore().sessionFileMaterialized.emit();
}
//@ chunk-5xgkngpb.js:359886-359943 facade-majority (2.1.88 match: setInternalEventWriter, 1)
function setInternalEventWriter(writer, mirrorWriter) {
  getProject().setInternalEventWriter(writer, mirrorWriter);
  registerWorkerEventMirror();
}
//@ chunk-5xgkngpb.js:359943-360054 layout
function registerWorkerEventMirror() {
  setStoragePort({
    mirror: (event, payload, { sessionId, agentId }) =>
      mirrorWorkerEventToRemote(event, payload, {
        sessionId: pinSessionId(sessionId),
        agentId,
      }),
    readAgent: readAgentWorkerEvents,
  });
}
//@ chunk-5xgkngpb.js:360054-360101 facade-majority
function clearInternalEventWriter() {
  getProject().clearInternalEventWriter();
}
//@ chunk-5xgkngpb.js:360101-360146 facade-majority
function sealTranscriptAppendsForShutdown() {
  getProject().sealAppendsForShutdown();
}
//@ chunk-5xgkngpb.js:360146-360180 facade-majority
function addSessionMirror(mirror) {
  getProject().addMirror(mirror);
}
//@ chunk-5xgkngpb.js:360180-360219 facade-majority
function hasSessionMirror() {
  return getProject().hasMirror();
}
//@ chunk-5xgkngpb.js:360219-360258 facade-majority
function fireSessionMirror(path, records) {
  getProject().fireMirror(path, records);
}
//@ chunk-5xgkngpb.js:360258-360276 layout
var MAX_AGENT_EVENTS_READ_BYTES = 536870912;
//@ chunk-5xgkngpb.js:360276-360454 facade-majority (2.1.88 match: setInternalEventReader, 0.674)
function setInternalEventReader(reader, subagentReader, agentEventReader) {
  getProject().setInternalEventReader(reader);
  getProject().setInternalSubagentEventReader(subagentReader);
  getProject().setInternalAgentEventReader(agentEventReader ?? null);
  getProject().setAgentWorkerEventReader(agentEventReader ?? null);
  registerWorkerEventMirror();
}
//@ chunk-5xgkngpb.js:360454-360815 facade-majority
async function readAgentWorkerEvents(agentId, signal) {
  let project = getProject();
  let agentWorkerEventReader = project.getAgentWorkerEventReader();
  if (agentWorkerEventReader === null) return;
  if (project.isAgentOverBound(agentId)) return null;
  let result = await agentWorkerEventReader(agentId, signal);
  if (result?.overBound) project.noteAgentOverBound(agentId);
  if (result === null || result.overBound || result.encodedBody) return null;
  let filtered = result.events.filter((event) => event.session_agent_id === agentId);
  if (filtered.length === 0 && result.events.length > 0) return null;
  return filtered.map((event) => event.payload);
}
//@ chunk-5xgkngpb.js:360815-360865 facade-majority
function setAgentMetadataInStreamGate(keepsAgentMetadataInStream) {
  getProject().keepsAgentMetadataInStream = keepsAgentMetadataInStream;
}
//@ chunk-5xgkngpb.js:360865-360921 facade-majority
function keepsAgentMetadataInStream() {
  return getProject().keepsAgentMetadataInStream();
}
//@ chunk-5xgkngpb.js:360921-360975 facade-majority
function hasWrittenAgentTranscript(agentId) {
  return getProject().hasWrittenAgentLocally(agentId);
}
//@ chunk-5xgkngpb.js:360975-361023 facade-majority
function isAgentTranscriptOverBound(agentId) {
  return getProject().isAgentOverBound(agentId);
}
//@ chunk-5xgkngpb.js:361023-361067 facade-majority (2.1.88 match: setRemoteIngressUrlForTesting, 1)
function setRemoteIngressUrlForTesting(url) {
  getProject().setRemoteIngressUrl(url);
}
//@ chunk-5xgkngpb.js:361067-361078 layout
var REPLAY_INDEX_SCAN_LIMIT = 10;
//@ chunk-5xgkngpb.js:361078-361978 facade-majority
async function seedReplayIndex(path, resume) {
  let index = new RequestBlobStore();
  if (isDiskless())
    return {
      index,
      fileExisted: false,
    };
  let handle;
  try {
    let fileHandle = await open(path, constants.O_RDONLY | READ_LIMITS);
    handle = fileHandle;
    let { size } = await fileHandle.stat();
    if (size === 0)
      return {
        index,
        fileExisted: true,
      };
    let max = Math.max(0, size - MAX_TRANSCRIPT_TAIL_BYTES);
    let startOffset =
      resume !== undefined && resume.start < resume.fileSize && resume.fileSize <= size
        ? Math.max(max, resume.start)
        : max;
    if (startOffset > 0) {
      index.startMidFile();
      let headBuffer = Buffer.alloc(TRANSCRIPT_HEAD_BUFFER_BYTES);
      let { bytesRead } = await fileHandle.read(headBuffer, 0, headBuffer.length, 0);
      let firstLine = getFirstLine(headBuffer.toString("utf8", 0, bytesRead));
      try {
        if (jsonParse(firstLine)?.type === "fork-context-ref") index.hasForkContextRef = true;
      } catch {}
    }
    let lines = transcriptLines(
      fileHandle.createReadStream({
        encoding: "utf8",
        start: startOffset,
        end: size - 1,
        autoClose: true,
      }),
    );
    for await (let line of lines) {
      if (line.length === 0) continue;
      let trimmed = stripLeadingNuls(line);
      try {
        let parsed = jsonParse(trimmed);
        if (trimmed === line || isCompactBoundaryMessage_3(parsed)) index.noteLine(parsed);
        else if (parsed?.type === "user" || parsed?.type === "assistant") index = index.successor(true);
      } catch {}
    }
    return {
      index,
      fileExisted: true,
    };
  } catch (error) {
    if (!isENOENT(error)) logError(error);
    return {
      index: handle === undefined ? index : index.successor(false),
      fileExisted: handle !== undefined,
    };
  } finally {
    await handle?.close().catch(() => {});
  }
}
//@ chunk-5xgkngpb.js:361978-362056 layout
function hasToolResultMessage(content) {
  return Array.isArray(content) && content.some((block) => block?.type === "tool_result");
}
//@ chunk-5xgkngpb.js:362056-410326 fingerprint (2.1.88 match: Project, 0.315)
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
  currentSessionOwner;
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
  setSessionFile(path) {
    writeTranscriptFile(
      this.store.writerHealth,
      this.sessionFile,
      path,
      undefined,
      path === null ? Array.from(this.writeQueues.keys()) : [],
    );
    if (this.compactAwaitingSummary?.filePath !== path) this.compactAwaitingSummary = undefined;
    this.sessionFile = path;
    if (path !== null) this.existingSessionFiles.set(this.store.getSessionId(), path);
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
  addMirror(mirror) {
    this.mirrors.push(mirror);
  }
  hasMirror() {
    return this.mirrors.length > 0;
  }
  fireMirror(path, records) {
    for (let mirror of this.mirrors)
      try {
        mirror(path, records);
      } catch (error) {
        logForDebugging(`[SessionMirror] mirror failed for ${path}: ${error}`, {
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
  inCallOrder(fn) {
    this.releaseWaitsForUploads();
    let lastWriteInCallOrder = this.lastWriteInCallOrder;
    let { promise, resolve } = Promise.withResolvers();
    this.lastWriteInCallOrder = promise;
    return this.trackWrite(async () => {
      try {
        if (lastWriteInCallOrder !== undefined) await lastWriteInCallOrder;
        return await fn();
      } finally {
        if (this.lastWriteInCallOrder === promise) this.lastWriteInCallOrder = undefined;
        resolve();
      }
    });
  }
  untilUploadedOrShutdown(promise) {
    return new Promise((resolve, reject) => {
      let unsubscribe = this.shutdownSeen.subscribe(() => {
        unsubscribe();
        this.trackWrite(() => promise.catch(logError));
        resolve();
      });
      promise.then(
        () => {
          unsubscribe();
          resolve();
        },
        (error) => {
          unsubscribe();
          reject(error);
        },
      );
    });
  }
  releaseWaitsForUploads() {
    if (isShuttingDown()) this.shutdownSeen.emit();
  }
  transcriptBatches = createKeyedQueue();
  recordInTurn(key1, key2, run) {
    this.releaseWaitsForUploads();
    return this.trackWrite(() =>
      this.transcriptBatches.run(
        `${key1}
${key2 ?? ""}`,
        run,
      ),
    );
  }
  pushQueueItem(path, item) {
    let queue = this.writeQueues.get(path);
    if (!queue) {
      queue = [];
      this.writeQueues.set(path, queue);
    }
    queue.push(item);
    this.scheduleDrain();
  }
  enqueueWrite(path, entry, storageV5) {
    if (this.appendsSealedForShutdown) return Promise.resolve();
    if (isDiskless() && storageV5 === undefined) {
      let error = Error("diskless session: transcript entry queued with no storage backend; entry dropped");
      logError(error);
      warnDisklessSettingsWrite("transcript_lines", path);
      reportTranscriptWriteFailure(this.store.writerHealth, "enqueue", error, path);
      this.forgetLinesThatNeverLanded(path);
      return Promise.resolve();
    }
    return new Promise((resolve) => {
      this.pushQueueItem(path, {
        entry,
        resolve,
        storageV5,
      });
    });
  }
  forgetLinesThatNeverLanded(path) {
    if (this.replaySources.has(path)) {
      this.restartReplayIndex(path);
      clearAllReplayChains();
    }
    this.queuedToolResults.clear();
  }
  enqueueRemove(path, removeUuid, storageV5) {
    return new Promise((resolve) => {
      this.pushQueueItem(path, {
        removeUuid,
        resolve,
        storageV5,
      });
    });
  }
  enqueueCompact(path, storageV5, afterCompaction) {
    return new Promise((resolve) => {
      this.pushQueueItem(path, {
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
  async performLeafCheckpointWithdrawal(path, entry, storageV5) {
    let any = (await readFileRange(path, storageV5))
      .split(
        `
`,
      )
      .some(isLastPromptLine);
    let error;
    if (!any)
      try {
        for await (let line of transcriptLines(
          createReadStream(path, {
            encoding: "utf8",
          }),
        ))
          if (isLastPromptLine(line)) {
            any = true;
            break;
          }
      } catch (error_2) {
        error = `(${getErrnoCode(error_2)}): ${errorMessage(error_2)}`;
      }
    if (!any && error !== undefined) {
      logForDebugging(
        `/clear: could not read the transcript it left, so any resume checkpoint in it is not withdrawn: ${path} ${error}`,
        {
          level: "warn",
        },
      );
      return;
    }
    if (!any) {
      logForDebugging(`/clear: no resume checkpoint in the transcript it left, so none withdrawn: ${path}`);
      return;
    }
    await this.appendToFile(path, toJsonLine(entry), storageV5);
    this.fireMirror(path, [entry]);
    logForDebugging(`/clear: withdrew the resume checkpoint in the transcript it left: ${path}`);
  }
  requestCompact(path, storageV5, force = false) {
    if (!this.store.localGcEnabled) return;
    this.restartReplayIndex(path);
    clearAllReplayChains();
    this.queuedToolResults.clear();
    let promise = this.enqueueCompact(path, storageV5, force);
    if (path === this.sessionFile) this.trackSessionRewrite(promise);
    this.scheduleDrain();
  }
  trackSessionRewrite(promise) {
    let token = {};
    this.sessionRewritesPending.add(token);
    return promise.finally(() => {
      this.sessionRewritesPending.delete(token);
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
  sealTornTailSync(path) {
    if (this.tornTailToSeal !== path || isDiskless()) return;
    if (isTranscriptPersistenceDisabled()) return;
    let fd;
    try {
      fd = openSync(path, constants.O_WRONLY | constants.O_APPEND);
    } catch {
      return;
    }
    try {
      let { size } = fstatSync(fd);
      if (size > 0)
        writeSync(
          fd,
          `
`,
          undefined,
        );
    } finally {
      closeSync(fd);
    }
    this.tornTailToSeal = null;
  }
  tornTailSealPending(path) {
    return this.tornTailToSeal === path;
  }
  tornTailSealLanded(path) {
    if (this.tornTailToSeal === path) this.tornTailToSeal = null;
  }
  async appendToFile(path, text, storageV5) {
    if (this.storeFence !== undefined) throw this.storeFence;
    this.directAppendsInFlight++;
    let viaBackend;
    try {
      viaBackend = (await appendToTranscriptFile(path, text, storageV5)) === "backend";
    } finally {
      this.directAppendsInFlight--;
    }
    noteTranscriptWriteOk(this.store.writerHealth, path);
    this.sessionFilesNotYetWritten.delete(path);
    if (path === this.sessionFile) {
      let bytes = Buffer.byteLength(text, "utf8");
      this.bytesSinceMetadataReAppend += bytes;
      this.bytesSinceCompact += bytes;
      this.sessionFileAppendSource = viaBackend ? storageV5 : undefined;
    }
  }
  drainsInFlight = 0;
  directAppendsInFlight = 0;
  appendInFlight() {
    return this.drainsInFlight > 0 || this.directAppendsInFlight > 0;
  }
  drainWriteQueue() {
    this.drainsInFlight++;
    let promise = this.drainChain.then(() => this.drainQueuesOnce());
    this.drainChain = promise
      .catch(() => {})
      .finally(() => {
        this.drainsInFlight--;
      });
    return promise;
  }
  async drainQueuesOnce() {
    for (let [path, queue] of this.writeQueues) {
      if (queue.length === 0) continue;
      let items = queue.splice(0);
      let settledUpTo = 0;
      try {
        let chunk = "";
        let resolvedUpTo = 0;
        let currentStorage;
        let mirrorBatch = this.mirrors.length > 0 ? [] : undefined;
        for (let idx = 0; idx < items.length; idx++) {
          let item = items[idx];
          if (!("entry" in item)) {
            if (chunk.length > 0) {
              await this.appendToFile(path, chunk, currentStorage);
              if (mirrorBatch && mirrorBatch.length > 0) {
                this.fireMirror(path, mirrorBatch.slice());
                mirrorBatch.length = 0;
              }
              for (let j = resolvedUpTo; j < idx; j++) items[j].resolve();
              settledUpTo = idx;
              chunk = "";
            }
            if (this.storeFence !== undefined) throw this.storeFence;
            if ("removeUuid" in item) await this.performRemoveByUuid(path, item.removeUuid, item.storageV5);
            else if ("compact" in item)
              await this.performCompactTranscript(
                path,
                undefined,
                undefined,
                item.storageV5,
                item.afterCompaction,
              );
            else await this.performLeafCheckpointWithdrawal(path, item.withdrawal, item.storageV5);
            item.resolve();
            settledUpTo = idx + 1;
            resolvedUpTo = idx + 1;
            continue;
          }
          let { entry } = item;
          let jsonLine = toJsonLine(entry);
          if (
            chunk.length + jsonLine.length >= this.MAX_CHUNK_BYTES ||
            (item.storageV5 !== currentStorage && chunk.length > 0)
          ) {
            await this.appendToFile(path, chunk, currentStorage);
            if (mirrorBatch && mirrorBatch.length > 0) {
              this.fireMirror(path, mirrorBatch.slice());
              mirrorBatch.length = 0;
            }
            for (let j = resolvedUpTo; j < idx; j++) items[j].resolve();
            settledUpTo = idx;
            resolvedUpTo = idx;
            chunk = "";
          }
          currentStorage = item.storageV5;
          chunk += jsonLine;
          if (!entry.type.startsWith("api-request")) mirrorBatch?.push(entry);
        }
        if (chunk.length > 0) {
          await this.appendToFile(path, chunk, currentStorage);
          if (mirrorBatch && mirrorBatch.length > 0) this.fireMirror(path, mirrorBatch);
          for (let i = resolvedUpTo; i < items.length; i++) items[i].resolve();
          settledUpTo = items.length;
        }
      } catch (error) {
        if (error !== this.storeFence) {
          let errnoCode = getErrnoCode(error);
          if (isSyscallError(error))
            logForDebugging(`Transcript write failed (${errnoCode}): ${errorMessage(error)}`, {
              level: "error",
            });
          else logError(error);
          reportTranscriptWriteFailure(this.store.writerHealth, "drain", error, path);
          this.forgetLinesThatNeverLanded(path);
          if (error instanceof Error && getStorageErrorCause(error) !== undefined) this.storeFence = error;
        }
        this.store.hasFailedWrite = true;
        for (let i = settledUpTo; i < items.length; i++) items[i].resolve();
      }
    }
    for (let [path, queue] of this.writeQueues) if (queue.length === 0) this.writeQueues.delete(path);
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
  reAppendSessionMetadata(skipTitles = false, onlyIfMissing = false, storageV5 = false, sealTail = false) {
    if (!this.sessionFile) return;
    this.bytesSinceMetadataReAppend = 0;
    let transcriptTail = readTranscriptTail(this.sessionFile);
    if (
      sealTail &&
      transcriptTail !== "" &&
      !transcriptTail.endsWith(`
`)
    )
      this.sealTornTailOnNextAppend(this.sessionFile);
    let plan = this.planReAppendSessionMetadata(
      transcriptTail,
      skipTitles,
      onlyIfMissing,
      undefined,
      storageV5,
    );
    if (!plan) return;
    try {
      if (plan.entries.length > 0) this.sealTornTailSync(plan.sessionFile);
      for (let entry of plan.entries)
        (storageV5 ? appendEntrySync : writeTranscriptMetadataSync)(plan.sessionFile, entry);
    } catch (error) {
      for (let stamp of plan.stamps) stamp.inFlight = false;
      throw error;
    }
    for (let stamp of plan.stamps) {
      stamp.written = true;
      stamp.inFlight = false;
    }
  }
  appendOwedEntryAtExit(entry) {
    if (!this.sessionFile) return;
    this.sealTornTailSync(this.sessionFile);
    appendEntrySync(this.sessionFile, entry);
  }
  exitReStampSource() {
    return this.sessionFileAppendSource;
  }
  adoptAppendSource(storageV5) {
    let sessionFile = this.sessionFile;
    this.sessionFileAppendSource =
      sessionFile === null ? undefined : getStorageTargetForPath(sessionFile, storageV5)?.backend;
  }
  async reStampAtExitAsync(storageV5) {
    let sessionFile = this.sessionFile;
    if (!sessionFile || this.store.exitReStampDone()) return;
    if (isTranscriptPersistenceDisabled()) {
      this.store.claimExitReStamp();
      return;
    }
    try {
      await this.reAppendSessionMetadataAsync(false, false, storageV5, false, true);
    } catch (error) {
      logReStampFailure("Exit re-stamp through the storage backend failed", error);
      return;
    }
    let clean = true;
    let seen = new Set();
    for (let idx = 0; ; idx++) {
      if (this.store.exitReStampDone()) return;
      let { lines, clean: clean_2 } = this.takeForeignExitLines(seen);
      clean &&= clean_2;
      if (idx > 0 && lines.length === 0) break;
      if (idx === RELOCATION_BACKOFF) {
        clean = false;
        break;
      }
      for (let line of lines) {
        if (this.store.exitReStampDone()) return;
        try {
          await appendEntryToFileAsync(line.path, line.entry, storageV5, {
            onlyIfExists: true,
            tornTailEntry: line.tornTailEntry,
          });
          this.store.takenForeignExitLines.delete(line);
        } catch (error) {
          logReStampFailure(
            "Exit line owed to another session's transcript was not appended through the storage backend",
            error,
          );
          clean = false;
        }
      }
      if (idx > 0) continue;
      for (let exitReStampProvider of this.store.exitReStampProviders) {
        if (this.store.exitReStampDone()) return;
        if (this.sessionFile !== sessionFile) {
          clean = false;
          break;
        }
        try {
          let entry = exitReStampProvider();
          if (entry !== undefined) {
            if (
              (await appendToTranscriptFile(
                sessionFile,
                jsonStringify(entry) +
                  `
`,
                storageV5,
                true,
              )) !== "skipped"
            )
              this.fireMirror(sessionFile, [entry]);
          }
        } catch (error) {
          logReStampFailure(
            "Exit line owed to the transcript was not appended through the storage backend",
            error,
          );
          clean = false;
          if (error instanceof Error && getStorageErrorCause(error) !== undefined) {
            this.storeFence = error;
            break;
          }
        }
      }
    }
    if (clean && this.sessionFile === sessionFile) this.store.claimExitReStamp();
  }
  takeForeignExitLines(seen) {
    let lines = [];
    let clean = true;
    for (let foreignExitReStampProvider of this.store.foreignExitReStampProviders)
      try {
        for (let line of foreignExitReStampProvider()) {
          let key =
            line.path +
            `
` +
            jsonStringify(line.entry);
          if (seen.has(key)) continue;
          seen.add(key);
          this.store.takenForeignExitLines.add(line);
          lines.push(line);
        }
      } catch (error) {
        logReStampFailure("Exit lines owed to other sessions' transcripts could not be listed", error);
        clean = false;
      }
    return {
      lines,
      clean,
    };
  }
  async reAppendSessionMetadataAsync(
    skipTitles = false,
    onlyIfMissing = false,
    storageV5,
    checkSession = false,
    verbatim = false,
  ) {
    let sessionFile = this.sessionFile;
    if (!sessionFile || this.storeFence !== undefined) return;
    let sessionId = this.store.getSessionId();
    this.bytesSinceMetadataReAppend = 0;
    await flushAppendEntryQueues();
    let fileRange = await readFileRange(sessionFile, storageV5);
    if (
      checkSession &&
      storageV5 !== undefined &&
      (this.sessionFile !== sessionFile || this.store.getSessionId() !== sessionId)
    )
      return;
    let plan = this.planReAppendSessionMetadata(fileRange, skipTitles, onlyIfMissing, storageV5);
    if (!plan || plan.entries.length === 0) return;
    this.directAppendsInFlight++;
    let written;
    try {
      written = await appendToTranscriptFile(plan.sessionFile, jsonlJoin(plan.entries), storageV5, verbatim);
    } catch (error) {
      if (error instanceof Error && getStorageErrorCause(error) !== undefined) this.storeFence = error;
      for (let stamp of plan.stamps) stamp.inFlight = false;
      throw error;
    } finally {
      this.directAppendsInFlight--;
    }
    let didWrite = written !== "skipped";
    for (let stamp of plan.stamps) {
      stamp.written = didWrite;
      stamp.inFlight = false;
    }
    if (didWrite) this.fireMirror(plan.sessionFile, plan.entries);
  }
  normalizeLastPrompt(text) {
    let trimmed = text
      .replaceAll(
        `
`,
        " ",
      )
      .trim();
    return trimmed.length > 200 ? truncateToLength(trimmed, 200).trim() + "\u2026" : trimmed;
  }
  planReAppendSessionMetadata(text, skipTitles, storageV5, deletionStorage, forceStamps = false) {
    if (!this.sessionFile) return null;
    let sessionId = this.store.getSessionId();
    if (!sessionId) return null;
    let sessionFile = this.sessionFile;
    let lines = text.split(`
`);
    if (!skipTitles) {
      let titlesChanged = false;
      let last = lines.findLast(
        (line) => line.includes('"type":"custom-title"') && line.includes('"customTitle":"'),
      );
      if (last) {
        let lastJsonStringField = extractLastJsonStringField(last, "customTitle");
        if (lastJsonStringField !== undefined) {
          titlesChanged ||= this.currentSessionTitle !== (lastJsonStringField || undefined);
          this.currentSessionTitle = lastJsonStringField || undefined;
          if (!lastJsonStringField) deleteSessionTitleSidecar(sessionFile, sessionId, deletionStorage);
        }
      }
      let last_2 = lines.findLast(
        (line) => line.includes('"type":"ai-title"') && line.includes('"aiTitle":"'),
      );
      if (last_2) {
        let lastJsonStringField = extractLastJsonStringField(last_2, "aiTitle");
        if (lastJsonStringField !== undefined) {
          titlesChanged ||= this.currentSessionAiTitle !== (lastJsonStringField || undefined);
          this.currentSessionAiTitle = lastJsonStringField || undefined;
        }
      }
      if (titlesChanged) this.store.sessionTitleChanged.emit();
    }
    let last = lines.findLast((line) => line.includes('"type":"tag"') && line.includes('"tag":"'));
    if (last) {
      let lastJsonStringField = extractLastJsonStringField(last, "tag");
      if (lastJsonStringField !== undefined) this.currentSessionTag = lastJsonStringField || undefined;
    }
    let fieldFromLastEntryOfTypeStrict = extractFieldFromLastEntryOfTypeStrict(
      text,
      "relocated",
      "relocatedCwd",
    );
    if (fieldFromLastEntryOfTypeStrict) this.currentSessionRelocatedCwd ??= fieldFromLastEntryOfTypeStrict;
    if (this.currentSessionLeafUuid !== undefined) {
      let fieldFromLastEntryOfTypeStrict = extractFieldFromLastEntryOfTypeStrict(
        text,
        "last-prompt",
        "lastPrompt",
      );
      if (fieldFromLastEntryOfTypeStrict)
        this.currentSessionLastPrompt ??= this.normalizeLastPrompt(fieldFromLastEntryOfTypeStrict);
    }
    {
      let frames = countFrameLinks(text);
      if (frames !== undefined)
        this.currentSessionArtifactCount = Math.max(this.currentSessionArtifactCount ?? 0, frames);
    }
    let entries = [];
    if (this.currentSessionLastPrompt !== undefined || this.currentSessionLeafUuid !== undefined)
      entries.push({
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
      entries.push({
        type: "custom-title",
        customTitle: this.currentSessionTitle,
        sessionId,
      });
    if (this.currentSessionAiTitle)
      entries.push({
        type: "ai-title",
        aiTitle: this.currentSessionAiTitle,
        sessionId,
      });
    if (this.currentSessionTag)
      entries.push({
        type: "tag",
        tag: this.currentSessionTag,
        sessionId,
      });
    if (this.currentSessionRelocatedCwd && text !== "")
      entries.push({
        type: "relocated",
        relocatedCwd: this.currentSessionRelocatedCwd,
        sessionId,
      });
    if (this.currentSessionAgentName)
      entries.push({
        type: "agent-name",
        agentName: this.currentSessionAgentName,
        sessionId,
      });
    if (this.currentSessionAgentColor)
      entries.push({
        type: "agent-color",
        agentColor: this.currentSessionAgentColor,
        sessionId,
      });
    if (this.currentSessionAgentSetting)
      entries.push({
        type: "agent-setting",
        agentSetting: this.currentSessionAgentSetting,
        sessionId,
      });
    if (this.currentSessionMode)
      entries.push({
        type: "mode",
        mode: this.currentSessionMode,
        sessionId,
      });
    if (this.currentSessionPermissionMode)
      entries.push({
        type: "permission-mode",
        permissionMode: this.currentSessionPermissionMode,
        sessionId,
      });
    if (this.currentSessionCodeMode !== undefined)
      entries.push({
        type: "repl-mode",
        replMode: this.currentSessionCodeMode,
        ...(this.currentSessionReplTypedEvents === true && {
          typedEvents: true,
        }),
        sessionId,
      });
    this.currentSessionOwner ??= ownStoredLoginOwner();
    if (this.currentSessionOwner)
      entries.push({
        type: "session-owner",
        ...this.currentSessionOwner,
        sessionId,
      });
    if (this.currentSessionIsolationLatch)
      entries.push({
        type: "isolation-latch",
        side: this.currentSessionIsolationLatch,
        sessionId,
      });
    if (this.currentSessionDevModsFolder)
      entries.push({
        type: "dev-mods",
        folder: this.currentSessionDevModsFolder,
        sessionId,
      });
    let index = this.currentSessionMemoryModeStamps.findIndex(
      (currentSessionMemoryModeStamp) => !currentSessionMemoryModeStamp.written,
    );
    let stamps = [];
    if (
      index !== -1 &&
      (forceStamps ||
        !this.currentSessionMemoryModeStamps.some(
          (currentSessionMemoryModeStamp) => currentSessionMemoryModeStamp.inFlight,
        ))
    )
      for (let currentSessionMemoryModeStamp of this.currentSessionMemoryModeStamps.slice(index)) {
        currentSessionMemoryModeStamp.inFlight = true;
        stamps.push(currentSessionMemoryModeStamp);
        entries.push({
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
      entries.push({
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
      entries.push({
        type: "tools-used",
        tools: conversationToolsUsed.names(),
        sessionId,
      });
      this.toolsUsedStamp = `${sessionFile}
${conversationToolsUsed.generation()}`;
    }
    if (this.currentSessionWorktree !== undefined)
      entries.push({
        type: "worktree-state",
        worktreeSession: this.currentSessionWorktree,
        sessionId,
      });
    if (
      this.currentSessionPrNumber !== undefined &&
      this.currentSessionPrUrl &&
      this.currentSessionPrRepository
    )
      entries.push({
        type: "pr-link",
        sessionId,
        prNumber: this.currentSessionPrNumber,
        prUrl: this.currentSessionPrUrl,
        prRepository: this.currentSessionPrRepository,
        timestamp: new Date().toISOString(),
      });
    if (this.currentSessionArtifactCount && text !== "")
      entries.push({
        type: "frame-link",
        artifactCount: this.currentSessionArtifactCount,
        sessionId,
        timestamp: new Date().toISOString(),
      });
    if (this.currentSessionHistorySuppressed)
      entries.push(buildHistorySuppressionEntry(sessionId, "migration"));
    if (this.currentSessionBridgeId)
      entries.push({
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
    if (storageV5 || entries.length === 0)
      return {
        sessionFile,
        entries,
        stamps,
      };
    let types = new Set(entries.map((entry) => entry.type));
    let lastByType = new Map();
    let readBytes = 0;
    for (let idx = lines.length - 1; idx >= 0; idx--) {
      if (lastByType.size === types.size) break;
      let line = lines[idx] ?? "";
      readBytes += Buffer.byteLength(line, "utf8") + 1;
      if (readBytes > LITE_READ_BUF_SIZE / 2) break;
      if (!line) continue;
      let matchedType;
      for (let type of types)
        if (!lastByType.has(type) && line.includes(`"type":"${type}"`)) {
          matchedType = type;
          break;
        }
      if (!matchedType) continue;
      try {
        let parsed = jsonParseRaw(line);
        if (parsed.type === matchedType) lastByType.set(matchedType, parsed);
      } catch {}
    }
    let comparable = (entry) => {
      if (entry.type === "history-suppression")
        return jsonStringify({
          type: entry.type,
          sessionId: entry.sessionId,
        });
      let { timestamp, ts, ...rest } = entry;
      return jsonStringify(rest);
    };
    return {
      sessionFile,
      entries: entries.filter((entry) => {
        if (entry.type === "memory-mode") return true;
        let existing = lastByType.get(entry.type);
        return !existing || comparable(entry) !== comparable(existing);
      }),
      stamps,
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
  drainQueuedRows(path, timeoutMs, signal) {
    if (!this.writeQueues.has(path)) return;
    this.drainWriteQueue();
    let promise = withDeadline(
      this.drainChain.then(() => "drained"),
      timeoutMs,
    ).then((outcome) => outcome ?? "timed_out");
    return signal === undefined ? promise : raceWithAbortSignal(promise, signal, () => new AbortError_2());
  }
  async removeMessageByUuid(uuid, sessionId, storageV5) {
    return this.trackWrite(async () => {
      let path =
        sessionId === this.store.getSessionId()
          ? this.sessionFile
          : await this.getExistingSessionFile(sessionId, storageV5);
      if (!path)
        return {
          drained: Promise.resolve(),
        };
      this.restartReplayIndex(path, true);
      this.queuedToolResults.clear();
      let drained = this.enqueueRemove(path, uuid, storageV5);
      this.trackWrite(() => drained);
      return {
        drained,
      };
    });
  }
  async performRemoveByUuid(path, uuid, storageV5) {
    let key = storageV5 !== undefined ? transcriptStorageKeyForPath(path) : undefined;
    if (isStorageV5Enabled() && storageV5 !== undefined && key !== undefined)
      return this.removeByUuidV5(storageV5, key, uuid);
    if (isDiskless()) return;
    let removed = false;
    try {
      let size = 0;
      let handle = await open(path, "r+");
      try {
        let { size: size_2 } = await handle.stat();
        size = size_2;
        if (size_2 === 0) return;
        let min = Math.min(size_2, LITE_READ_BUF_SIZE);
        let windowStart = size_2 - min;
        let windowBuffer = Buffer.allocUnsafe(min);
        let { bytesRead } = await handle.read(windowBuffer, 0, min, windowStart);
        let chunk = windowBuffer.subarray(0, bytesRead);
        let needle = `"uuid":"${uuid}"`;
        let index = chunk.lastIndexOf(needle);
        if (index >= 0) {
          let index_2 = chunk.lastIndexOf(10, index);
          if (index_2 >= 0 || windowStart === 0) {
            let lineStart = index_2 + 1;
            let index_3 = chunk.indexOf(10, index + needle.length);
            let afterEnd = index_3 >= 0 ? index_3 + 1 : bytesRead;
            let keepBefore = windowStart + lineStart;
            let tailBytes = bytesRead - afterEnd;
            removed = true;
            await handle.truncate(keepBefore);
            if (tailBytes > 0) {
              let { bytesWritten } = await handle.write(chunk, afterEnd, tailBytes, keepBefore);
              if (bytesWritten < tailBytes) throw Error("performRemoveByUuid: short write");
            }
            return;
          }
        }
      } finally {
        await handle.close();
      }
      if (size > MAX_TRANSCRIPT_READ_BYTES_2) {
        logForDebugging(`Skipping tombstone removal: session file too large (${formatFileSize(size)})`, {
          level: "warn",
        });
        return;
      }
      let lines = (
        await readFile(path, {
          encoding: "utf-8",
        })
      ).split(`
`);
      let filtered = lines.filter((line) => {
        if (!line.trim()) return true;
        try {
          return jsonParse(line).uuid !== uuid;
        } catch {
          return true;
        }
      });
      if (filtered.length === lines.length) return;
      removed = true;
      await writeFile(
        path,
        filtered.join(`
`),
        {
          encoding: "utf8",
        },
      );
    } catch {
      if (removed && this.replaySources.has(path)) {
        this.restartReplayIndex(path);
        clearAllReplayChains();
        this.queuedToolResults.clear();
      }
    }
  }
  async removeByUuidV5(handle, key, uuid) {
    try {
      let buffer = Buffer.from(`"uuid":"${uuid}"`);
      for (let idx = 1; idx <= 3; idx++) {
        let readResult = await handle.read([
          {
            key,
            tail: LITE_READ_BUF_SIZE,
          },
        ]);
        if (!readResult.ok) {
          if (isByteViewUnsupportedError(readResult.error))
            return await removeTombstones(handle, key, uuid, {
              windowBytes: LITE_READ_BUF_SIZE,
              pageBytes: TOMBSTONE_PAGE_BYTES,
              maxReadBytes: MAX_TRANSCRIPT_READ_BYTES_2,
            });
          logForDebugging(`Tombstone removal abandoned: tail read failed (${readResult.error.code})`, {
            level: "warn",
          });
          return;
        }
        let [item] = readResult.value.items;
        if (!item.found) return;
        let buffer_2 = Buffer.from(item.value.buffer, item.value.byteOffset, item.value.byteLength);
        if (buffer_2.length === 0) return;
        let baseOffset = item.totalBytes - buffer_2.length;
        let index = buffer_2.lastIndexOf(buffer);
        let lineStartIndex = index < 0 ? -1 : buffer_2.lastIndexOf(10, index);
        if (index < 0 || (lineStartIndex < 0 && baseOffset > 0))
          return await this.removeByUuidSlowV5(handle, key, uuid, item.totalBytes, item.version);
        let index_2 = buffer_2.indexOf(10, index + buffer.length);
        if (index_2 < 0) return;
        let replaceResult = await handle.replaceRecords(key, [], {
          keepBefore: baseOffset + lineStartIndex + 1,
          preserveFrom: baseOffset + index_2 + 1,
          publishDiscipline: "inPlace",
          precondition:
            item.version !== undefined
              ? {
                  type: "ifMatch",
                  version: item.version,
                }
              : {
                  type: "none",
                },
        });
        if (replaceResult.ok || replaceResult.error.code === "NotFound") return;
        if (
          !(
            replaceResult.error.code === "PreconditionFailed" || replaceResult.error.code === "Unavailable"
          ) ||
          idx === 3
        ) {
          logForDebugging(
            `Tombstone removal abandoned after ${idx} attempt(s) (${replaceResult.error.code})`,
            {
              level: "warn",
            },
          );
          return;
        }
      }
    } catch (error) {
      logForDebugging(`Tombstone removal abandoned: ${errorMessage(error)}`, {
        level: "warn",
      });
    }
  }
  async removeByUuidSlowV5(handle, key, uuid, size, version) {
    let expectedVersion = version;
    if (expectedVersion === undefined) {
      let stats = await handle.stat(key);
      if (!stats.ok) {
        if (stats.error.code !== "NotFound")
          logForDebugging(`Tombstone removal abandoned: stat failed (${stats.error.code})`, {
            level: "warn",
          });
        return;
      }
      size = stats.value.size;
      expectedVersion = stats.value.version;
    }
    if (size > MAX_TRANSCRIPT_READ_BYTES_2) {
      logForDebugging(`Skipping tombstone removal: session file too large (${formatFileSize(size)})`, {
        level: "warn",
      });
      return;
    }
    let firstDeletedSeq;
    let kept = [];
    let fromSeq;
    for (;;) {
      let records = await handle.readRecords(key, {
        order: "forward",
        ...(fromSeq !== undefined && {
          fromSeq,
        }),
        maxBytes: TOMBSTONE_PAGE_BYTES,
      });
      if (!records.ok) {
        logForDebugging(`Tombstone removal abandoned: paging failed (${records.error.code})`, {
          level: "warn",
        });
        return;
      }
      let reachedEnd = false;
      for (let item of records.value.items) {
        if (item.seq >= size) {
          reachedEnd = true;
          break;
        }
        let str = Buffer.from(item.data.buffer, item.data.byteOffset, item.data.byteLength).toString("utf8");
        let sliced = str.slice(0, -1);
        let isDeleted = false;
        if (sliced.trim())
          try {
            isDeleted = jsonParseRaw(sliced).uuid === uuid;
          } catch {}
        if (isDeleted) {
          firstDeletedSeq ??= item.seq;
          continue;
        }
        if (firstDeletedSeq !== undefined)
          kept.push({
            data: str,
          });
      }
      let nextSeq = records.value.nextSeq;
      if (reachedEnd || nextSeq === undefined || nextSeq >= size) break;
      fromSeq = nextSeq;
    }
    if (firstDeletedSeq === undefined) return;
    let replaceResult = await handle.replaceRecords(key, kept, {
      keepBefore: firstDeletedSeq,
      preserveFrom: size,
      publishDiscipline: "inPlace",
      precondition:
        expectedVersion !== undefined
          ? {
              type: "ifMatch",
              version: expectedVersion,
            }
          : {
              type: "none",
            },
    });
    if (!replaceResult.ok && replaceResult.error.code !== "NotFound")
      logForDebugging(`Tombstone removal abandoned on the paged path (${replaceResult.error.code})`, {
        level: "warn",
      });
  }
  async performCompactTranscript(path, onBeforeCommit, onBeforeRename, storageV5, forceGc = false) {
    let key = storageV5 !== undefined ? transcriptStorageKeyForPath(path) : undefined;
    if (isStorageV5Enabled() && storageV5 !== undefined && key !== undefined)
      return this.performCompactTranscriptV5(storageV5, key, path, forceGc);
    if (isDiskless()) return;
    let tmpPath = `${path}.compact.tmp.${randomBytes(4).toString("hex")}`;
    let renamed = false;
    let triedRename = false;
    try {
      let stats = await stat(path);
      if (stats.size < COMPACT_MIN_FILE_BYTES) return;
      let windowBytes = 4096;
      let ranges = [
        [0, Math.min(windowBytes, stats.size)],
        [Math.max(0, Math.floor(stats.size / 2) - windowBytes / 2), Math.min(windowBytes, stats.size)],
        [Math.max(0, stats.size - windowBytes), Math.min(windowBytes, stats.size)],
      ];
      let readWindows = async () => {
        let handle = await open(path, "r");
        try {
          let windows = [];
          for (let [start, length] of ranges) {
            let buffer = Buffer.alloc(length);
            let filled = 0;
            while (filled < length) {
              let { bytesRead } = await handle.read(buffer, filled, length - filled, start + filled);
              if (bytesRead <= 0) break;
              filled += bytesRead;
            }
            windows.push(buffer.subarray(0, filled));
          }
          return windows;
        } finally {
          await handle.close().catch(() => {});
        }
      };
      let baseline = await readWindows();
      let windowsChanged = async () => {
        let windows = await readWindows();
        return baseline.some(
          (baselineWindow, index) => !windows[index] || !baselineWindow.equals(windows[index]),
        );
      };
      {
        let tailWindow = baseline[2];
        if (!tailWindow || tailWindow.length === 0 || tailWindow.at(-1) !== 10) {
          logEvent("tengu_transcript_compact_failed", {
            reason: lit_2("snapshot_mid_line"),
          });
          return;
        }
      }
      let boundaryCount = await scanCompactBoundaries(path, stats.size);
      if (boundaryCount === 0 || this.skipLowYieldCompact(path, stats.size, boundaryCount, true)) return;
      let readStream = () =>
        transcriptLines(
          createReadStream(path, {
            encoding: "utf8",
            end: stats.size - 1,
          }),
        );
      forceGcIfBun(forceGc);
      let transcriptEntries = await readTranscriptEntries(readStream());
      if (transcriptEntries.kind === "skip") return;
      if (transcriptEntries.kind === "abort") {
        logEvent("tengu_transcript_compact_failed", {
          reason: fromEnum(transcriptEntries.reason),
        });
        return;
      }
      if (this.skipLowYieldCompact(path, stats.size, transcriptEntries.reclaimableBytes)) return;
      let lineEmitter = makeLineEmitter(transcriptEntries.plan);
      let fd = await open(tmpPath, "w", 384);
      let pending = "";
      let writtenBytes = 0;
      let writeChunk = async (data) => {
        await writeFully(fd, data, null);
        writtenBytes += data.length;
      };
      let closed = false;
      let emitLine = async (line) => {
        pending +=
          stripLeadingNuls(line) +
          `
`;
        if (pending.length >= LITE_READ_BUF_SIZE) {
          await writeChunk(Buffer.from(pending, "utf8"));
          pending = "";
        }
      };
      try {
        let lineIndex = 0;
        for await (let line of readStream()) {
          for (let part of lineEmitter(lineIndex, line)) await emitLine(part);
          lineIndex++;
        }
        await writeChunk(Buffer.from(pending, "utf8"));
        onBeforeCommit?.();
        let afterStats = await stat(path);
        if (afterStats.ino !== stats.ino || afterStats.size < stats.size || (await windowsChanged())) {
          logEvent("tengu_transcript_compact_failed", {
            reason: lit_2("source_changed"),
          });
          return;
        }
        if (afterStats.size > stats.size) {
          let appended = Buffer.alloc(afterStats.size - stats.size);
          let handle = await open(path, "r");
          let filled = 0;
          try {
            while (filled < appended.length) {
              let { bytesRead } = await handle.read(
                appended,
                filled,
                appended.length - filled,
                stats.size + filled,
              );
              if (bytesRead <= 0) break;
              filled += bytesRead;
            }
          } finally {
            await handle.close().catch(() => {});
          }
          if (filled < appended.length) {
            logEvent("tengu_transcript_compact_failed", {
              reason: lit_2("appended_rows_unread"),
            });
            return;
          }
          while (filled > 0 && appended[filled - 1] !== 10) filled--;
          await writeChunk(appended.subarray(0, filled));
        }
        await fd.sync();
        let size = (await fd.stat()).size;
        if (size !== writtenBytes) {
          logEvent("tengu_transcript_compact_failed", {
            reason: lit_2("staged_size_mismatch"),
            staged_bytes: size,
            written_bytes: writtenBytes,
          });
          return;
        }
        onBeforeRename?.();
        if ((await stat(path)).ino !== stats.ino || (await windowsChanged())) {
          logEvent("tengu_transcript_compact_failed", {
            reason: lit_2("source_changed"),
          });
          return;
        }
        closed = true;
        await fd.close();
      } finally {
        if (!closed) await fd.close().catch(() => {});
      }
      triedRename = true;
      await retryFsOp(tmpPath, path);
      renamed = true;
      if (path === this.sessionFile)
        for (let deletedUuid of transcriptEntries.plan.deletedUuids) this.sessionRowsDeleted.add(deletedUuid);
      this.queuedToolResults.clear();
      this.recordCompactYield(path, stats.size, transcriptEntries.reclaimableBytes);
      if (path === this.sessionFile) await this.reAppendSessionMetadataAsync(false, true).catch(() => {});
      logEvent("tengu_transcript_compact", {
        bytesBefore: stats.size,
        bytesAfter: writtenBytes,
      });
    } catch (error) {
      let errnoCode = getErrnoCode(error);
      logEvent("tengu_transcript_compact_failed", {
        reason:
          triedRename && errnoCode !== undefined && ATOMIC_WRITE_ERRNOS.has(errnoCode)
            ? lit_2("rename_fallback")
            : lit_2("io"),
        error_code: sanitizedErrnoLowerForTelemetry(error),
      });
      logForDebugging(`Transcript compact failed (${getErrnoCode(error)}): ${errorMessage(error)}`, {
        level: "warn",
      });
    } finally {
      if (!renamed) await unlink(tmpPath).catch(() => {});
    }
  }
  async performCompactTranscriptV5(handle, key, path, forceGc) {
    let fail = (reason, error) => {
      logEvent("tengu_transcript_compact_failed", {
        reason: fromEnum(reason),
        ...((reason === "io" || reason === "rename_fallback") && {
          error_code: sanitizedErrnoLowerForTelemetry(error),
        }),
      });
    };
    try {
      let stats = await handle.stat(key, {
        witness: true,
      });
      if (!stats.ok) {
        fail("io");
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
        fail("snapshot_mid_line");
        return;
      }
      let seq = -1;
      let lines = async function* () {
        let fromSeq;
        for (;;) {
          let records = await handle.readRecords(key, {
            order: "forward",
            ...(fromSeq !== undefined && {
              fromSeq,
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
          fromSeq = nextSeq;
        }
      };
      forceGcIfBun(forceGc);
      let transcriptEntries = await readTranscriptEntries(lines());
      if (transcriptEntries.kind === "skip") return;
      if (transcriptEntries.kind === "abort") {
        fail(transcriptEntries.reason);
        return;
      }
      if (this.skipLowYieldCompact(path, size, transcriptEntries.reclaimableBytes)) return;
      let lineEmitter = makeLineEmitter(transcriptEntries.plan);
      let pagedLines = async function* () {
        let lineIndex = 0;
        for await (let line of lines()) {
          for (let part of lineEmitter(lineIndex, line))
            yield {
              data:
                stripLeadingNuls(part) +
                `
`,
            };
          lineIndex++;
        }
      };
      let result = await handle.replaceRecords(key, pagedLines(), {
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
      if (!result.ok) {
        let error = result.error;
        if (error.code === "PreconditionFailed") {
          fail("source_changed");
          return;
        }
        let telemetryCode =
          error.code === "Failed" || error.code === "Unavailable" ? error.telemetryCode : undefined;
        if (error.code === "InvalidArgument") {
          fail(error.argument.startsWith("opts.precondition") ? "invalid_token" : "invalid_argument");
          logForDebugging(`Transcript compact skipped (${error.code}): ${formatStorageError(error)}`, {
            level: "warn",
          });
          return;
        }
        let renameFallback =
          (error.code === "Failed" || error.code === "Unavailable") &&
          error.phase === "publish" &&
          telemetryCode !== undefined &&
          ATOMIC_WRITE_ERRNOS.has(telemetryCode);
        fail(renameFallback ? "rename_fallback" : "io", {
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
      if (path === this.sessionFile)
        for (let deletedUuid of transcriptEntries.plan.deletedUuids) this.sessionRowsDeleted.add(deletedUuid);
      this.recordCompactYield(path, size, transcriptEntries.reclaimableBytes);
      let bytesAfter = result.value.sizeAfter;
      if (path === this.sessionFile)
        await this.reAppendSessionMetadataAsync(false, true, handle, true).catch(() => {});
      logEvent("tengu_transcript_compact", {
        bytesBefore: size,
        bytesAfter,
      });
    } catch (error) {
      fail("io", error);
      logForDebugging(`Transcript compact failed (${getErrnoCode(error)}): ${errorMessage(error)}`, {
        level: "warn",
      });
    }
  }
  skipLowYieldCompact(path, size, reclaimable, upperBound = false) {
    if (!this.store.lowYieldCompactSkipEnabled || !isLowYieldCompaction(size, reclaimable)) return false;
    this.recordCompactYield(path, size, reclaimable);
    logEvent("tengu_transcript_compact_skipped", {
      bytesBefore: size,
      reclaimableBytes: reclaimable,
      ...(upperBound && {
        reclaimableBytesIsUpperBound: true,
      }),
    });
    return true;
  }
  recordCompactYield(path, size, reclaimable) {
    this.bytesSinceCompact = 0;
    if (path === this.sessionFile)
      this.backstopThresholdBytes = isLowYieldCompaction(size, reclaimable)
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
  async materializeSessionFile(storageV5) {
    if (this.shouldSkipPersistence()) return;
    try {
      this.ensureCurrentSessionFile();
      try {
        await this.reAppendSessionMetadataAsync(false, false, storageV5);
      } catch (error) {
        swallowRefusedDirectWrite(error);
      }
      if (this.pendingEntries.length > 0) {
        let pendingEntries = this.pendingEntries;
        this.pendingEntries = [];
        for (let { entry, storageV5 } of pendingEntries)
          await this.appendEntry(entry, undefined, undefined, storageV5);
        if (this.currentSessionRelocatedCwd) await this.reAppendSessionMetadataAsync(true, false, storageV5);
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
  async insertMessageChain(
    transcript,
    transientOnly = false,
    agentId,
    sessionId,
    storageV5,
    sessionIdOverride,
    foreign,
    bridge,
    rows,
    promptId,
    options,
  ) {
    let targetSessionId = sessionIdOverride ?? getSessionId();
    let isForeign = foreign ?? isForeignToBinding(pinSessionId(targetSessionId));
    let bridgeSession =
      rows === undefined ? (bridgeSessionForPulledWindow(pinSessionId(targetSessionId)) ?? null) : rows;
    let pulledRows = promptId ?? pulledRows_2();
    let promptIdValue = options === undefined ? getPromptId_2() : options;
    return this.trackWrite(async () => {
      let targetSid = sessionId ?? null;
      let unused;
      if (
        this.sessionFile === null &&
        targetSessionId === getSessionId() &&
        transcript.some(
          (message) => message.type === "user" || message.type === "assistant" || message.type === "system",
        )
      ) {
        this.awaitingFirstUserRow = true;
        await this.materializeSessionFile(bridge);
      }
      let branch;
      try {
        branch = await getBranch();
      } catch {
        branch = undefined;
      }
      refreshCheckoutMetadata();
      let sessionId_2 = targetSessionId;
      let slug = getPlanSlugCache().get(sessionId_2);
      let known =
        transientOnly || this.shouldSkipPersistence()
          ? null
          : await this.store.sessionMessages(sessionId_2, bridge);
      if (!transientOnly && !isForeign && this.sessionFile !== null && targetSessionId === getSessionId()) {
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
              sessionId: sessionId_2,
            },
            sessionId_2,
            undefined,
            bridge,
          );
        }
      }
      if (!isForeign && targetSessionId === getSessionId())
        await this.appendToolsUsedEntryIfGrown(sessionId_2, bridge);
      let wrote = false;
      for (let message of transcript) {
        let isBoundary = isCompactBoundaryMessage_3(message);
        let sessionFile = !transientOnly && targetSessionId === getSessionId() ? this.sessionFile : null;
        if (isBoundary && sessionFile) {
          this.compactAwaitingSummary = {
            filePath: sessionFile,
            storageV5: bridge,
          };
          this.sessionLastBoundaryUuid = message.uuid;
          wrote = false;
        }
        let candidateParentUuid = targetSid;
        if (
          message.type === "user" &&
          "sourceToolAssistantUUID" in message &&
          message.sourceToolAssistantUUID
        ) {
          let sourceToolAssistantUUID = message.sourceToolAssistantUUID;
          if (known === null || known.has(sourceToolAssistantUUID))
            candidateParentUuid = sourceToolAssistantUUID;
          else logEvent("tengu_phantom_parent_write", {});
        }
        if (candidateParentUuid === message.uuid) logEvent("tengu_chain_self_reference_write", {});
        let storedEntry = {
          parentUuid: isBoundary ? null : candidateParentUuid,
          logicalParentUuid: isBoundary ? targetSid : undefined,
          isSidechain: transientOnly,
          teamName: storageV5?.teamName,
          agentName: storageV5?.agentName,
          promptId: message.type === "user" ? (promptIdValue ?? undefined) : undefined,
          agentId,
          ...withTaskProducerMarkRecorded(message),
          ...transcriptStamp(sessionId_2),
          version: transcriptVersionOrDefault(message),
          gitBranch: branch,
          slug,
        };
        storedEntry.isSidechain = transientOnly;
        if (transientOnly) storedEntry.agentId = agentId;
        if (storedEntry.type === "user" && storedEntry.toolUseResult != null)
          storedEntry.toolUseResult = dropLargeOriginalFile(storedEntry.toolUseResult);
        await this.appendEntry(storedEntry, targetSessionId, isForeign, bridge, bridgeSession, pulledRows);
        if (
          this.awaitingFirstUserRow &&
          !transientOnly &&
          targetSessionId === getSessionId() &&
          message.type === "user" &&
          !hasToolResultMessage(message.message.content)
        )
          this.awaitingFirstUserRow = false;
        if (isBoundary && sessionFile) this.backstopThresholdBytes = ENTRY_APPEND_POLICY_2;
        if (sessionFile && (message.type === "user" || message.type === "assistant")) wrote = true;
        if (isChainParticipant(message)) {
          targetSid = message.uuid;
          unused = message.timestamp;
        }
      }
      if (wrote && this.compactAwaitingSummary) {
        let { filePath, storageV5 } = this.compactAwaitingSummary;
        this.compactAwaitingSummary = undefined;
        if (filePath === this.sessionFile) this.requestCompact(filePath, storageV5, true);
      }
      if (!transientOnly && targetSessionId === getSessionId()) {
        if (targetSid && unused && (!this.currentSessionLeafTs || unused >= this.currentSessionLeafTs)) {
          this.currentSessionLeafUuid = targetSid;
          this.currentSessionLeafTs = unused;
        }
        let firstMeaningfulUserMessageTextContent = getFirstMeaningfulUserMessageTextContent(transcript);
        if (firstMeaningfulUserMessageTextContent)
          this.currentSessionLastPrompt = this.normalizeLastPrompt(firstMeaningfulUserMessageTextContent);
      }
      if (!this.awaitingFirstUserRow && this.sessionFile !== null && this.heldReplayRecords.length > 0)
        await this.releaseHeldReplayRecords();
    });
  }
  async insertFileHistorySnapshot(messageId, snapshot, isSnapshotUpdate, storageV5) {
    return this.trackWrite(async () => {
      let fileHistoryMessage = {
        type: "file-history-snapshot",
        messageId,
        snapshot,
        isSnapshotUpdate,
      };
      await this.appendEntry(fileHistoryMessage, undefined, undefined, storageV5);
    });
  }
  async insertFileHistoryDelta(delta, storageV5) {
    return this.trackWrite(async () => {
      await this.appendEntry(delta, undefined, undefined, storageV5);
    });
  }
  async insertQueueOperation(operation, storageV5) {
    return this.trackWrite(async () => {
      let operationSessionId = normalizeUuidOrNull(operation.sessionId);
      if (operationSessionId === null || operationSessionId === this.store.getSessionId()) {
        await this.appendEntry(operation, undefined, undefined, storageV5);
        return;
      }
      let pendingChain = this.queueOperationsRaisedElsewhere.then(async () => {
        if ((await this.getExistingSessionFile(operationSessionId, storageV5)) !== null)
          await this.appendEntry(operation, operationSessionId, undefined, storageV5);
      });
      this.queueOperationsRaisedElsewhere = pendingChain.catch(() => {});
      await pendingChain;
    });
  }
  async insertAttributionSnapshot(snapshotEntry, storageV5) {
    return this.trackWrite(async () => {
      await this.appendEntry(snapshotEntry, undefined, undefined, storageV5);
    });
  }
  async insertContentReplacement(replacements, agentId, storageV5) {
    return this.trackWrite(async () => {
      let replacementEntry = {
        type: "content-replacement",
        sessionId: this.store.getSessionId(),
        agentId,
        replacements,
      };
      await this.appendEntry(replacementEntry, undefined, undefined, storageV5);
    });
  }
  replaySources = new Map();
  queuedToolResults = new Map();
  oversizeReplayShapes = new Set();
  queuedToolResultDigest(toolResultEntry, toolUseId) {
    if (toolResultEntry.storageV5 !== undefined || toolResultEntry.sessionId !== this.store.getSessionId())
      return;
    let transcriptPath = toolResultEntry.agentId
      ? agentTranscriptPathOfEntry(toolResultEntry.agentId)
      : this.sessionFile;
    return transcriptPath
      ? this.queuedToolResults.get(`${transcriptPath}
${toolUseId}`)
      : undefined;
  }
  restartReplayIndex(transcriptPath, startFresh = false) {
    this.store.replaySeedStarts.delete(normalize(transcriptPath));
    if (!isRequestBlobStoreEnabled()) return;
    let seedIndex = (seedEntry) => ({
      index: (seedEntry?.index ?? new RequestBlobStore()).successor(startFresh),
      fileExisted: true,
    });
    let pendingIndex = this.replaySources.get(transcriptPath);
    this.replaySources.set(
      transcriptPath,
      pendingIndex === undefined ? Promise.resolve(seedIndex()) : pendingIndex.then(seedIndex),
    );
  }
  replayIndexFor(transcriptPath) {
    let cachedIndex = this.replaySources.get(transcriptPath);
    if (cachedIndex === undefined) {
      let normalizedPath = normalize(transcriptPath);
      cachedIndex = seedReplayIndex(transcriptPath, this.store.replaySeedStarts.get(normalizedPath));
      this.store.replaySeedStarts.delete(normalizedPath);
      this.replaySources.set(transcriptPath, cachedIndex);
    }
    return cachedIndex;
  }
  async replayTargetFile(replayRecord) {
    let transcriptPath =
      replayRecord.sessionId === this.store.getSessionId()
        ? this.sessionFile
        : await this.getExistingSessionFile(replayRecord.sessionId, replayRecord.storageV5);
    if (transcriptPath === null || transcriptPath === undefined) return;
    return replayRecord.agentId ? agentTranscriptPathOfEntry(replayRecord.agentId) : transcriptPath;
  }
  isRemotelyMirrored() {
    return this.internalEventWriter !== null || (isEnvTruthy("true") && Boolean(this.remoteIngressUrl));
  }
  async appendRequestReplayRecords(replayRecord) {
    if (!replayRecord.target.agentId && (this.sessionFile === null || this.awaitingFirstUserRow)) {
      let shape = stripCacheControl_5(replayRecord.shape);
      let cacheControl = clone(replayRecord.request.cacheControl);
      let request = {
        ...replayRecord.request,
        cacheControl,
      };
      return new Promise((resolve, reject) => {
        this.heldReplayRecords.push({
          records: {
            ...replayRecord,
            shape,
            request,
          },
          resolve,
          reject,
        });
      });
    }
    return this.writeRequestReplayRecords(replayRecord);
  }
  async writeRequestReplayRecords(replayRecord) {
    return this.trackWrite(async () => {
      let { target, request } = replayRecord;
      if (this.shouldSkipPersistence()) return "no_transcript";
      if (this.oversizeReplayShapes.has(replayRecord.shapeHash)) return "shape_too_large";
      let transcriptPath = await this.replayTargetFile(target);
      if (transcriptPath === undefined) return "no_transcript";
      let { index, fileExisted } = await this.replayIndexFor(transcriptPath);
      if ((!fileExisted && !index.hasLines) || index.hasForkContextRef) return "no_transcript";
      let newRecords = [];
      if (!index.has(replayRecord.shapeHash)) {
        let shapeRecord = {
          type: "api-request-shape",
          sessionId: request.sessionId,
          ...(request.agentId !== undefined && {
            agentId: request.agentId,
          }),
          shapeHash: replayRecord.shapeHash,
          timestamp: request.timestamp,
          version: request.version,
          shape: stripCacheControl_5(replayRecord.shape),
        };
        if (Buffer.byteLength(jsonStringify(shapeRecord)) > MAX_SYNTHETIC_MESSAGE_BYTES) {
          this.oversizeReplayShapes.add(replayRecord.shapeHash);
          logError(
            Error(
              "request-replay: system+tools over the record size cap; not recording requests that use them",
            ),
          );
          return "shape_too_large";
        }
        newRecords.push(shapeRecord);
        index.noteLine(shapeRecord);
      }
      for (let { hash, message } of replayRecord.blobCandidates)
        if (!index.has(hash)) {
          let blobRecord = {
            type: "api-request-blob",
            sessionId: request.sessionId,
            ...(request.agentId !== undefined && {
              agentId: request.agentId,
            }),
            hash,
            message,
          };
          newRecords.push(blobRecord);
          index.noteLine(blobRecord);
        }
      await Promise.all(
        [...newRecords, request].map((recordToWrite) =>
          this.appendEntry(recordToWrite, target.sessionId, undefined, target.storageV5),
        ),
      );
      return "written";
    });
  }
  async appendToolsUsedEntryIfGrown(sessionId, storageV5) {
    if (this.sessionFile === null) return;
    let conversationToolsUsed = getConversationToolsUsed();
    let stamp = `${this.sessionFile}
${conversationToolsUsed.generation()}`;
    if (!isSillyShoreGateOn() || conversationToolsUsed.size() === 0 || this.toolsUsedStamp === stamp) return;
    await this.appendEntry(
      {
        type: "tools-used",
        tools: conversationToolsUsed.names(),
        sessionId,
      },
      sessionId,
      undefined,
      storageV5,
    );
    this.toolsUsedStamp = stamp;
  }
  async appendEntry(
    entry,
    sessionId = this.store.getSessionId(),
    foreign,
    storageV5,
    bridgeSession,
    pulledRows,
  ) {
    if ("agentId" in entry && entry.agentId) this.noteAgentWrittenLocally(entry.agentId);
    if (this.shouldSkipPersistence()) return;
    if (
      isTranscriptMessage(entry) &&
      isCompactOrCarriedMessage(entry) &&
      (foreign === true || isForeignToBinding(pinSessionId(sessionId)))
    )
      this.foreignWithheldEntryUuids.add(entry.uuid);
    if (isTranscriptMessage(entry) && !entry.isSidechain) {
      let pulledBridgeSession = firstConcreteBridgeSession((pulledRows ?? pulledRows_2())?.get(entry.uuid));
      let effectiveBridgeSession =
        pulledBridgeSession ??
        (isCompactOrCarriedMessage(entry)
          ? bridgeSession === undefined
            ? bridgeSessionForPulledWindow(pinSessionId(sessionId))
            : bridgeSession
          : undefined);
      if (effectiveBridgeSession !== undefined && effectiveBridgeSession !== null) {
        if (pulledBridgeSession !== undefined) this.windowNoteEntryUuids.delete(entry.uuid);
        else if (entry.foreignToBridgeSession === undefined && isCarriedAttachment(entry))
          this.windowNoteEntryUuids.add(entry.uuid);
        entry.foreignToBridgeSession = effectiveBridgeSession;
      }
    }
    if (this.relocationBuffer) {
      this.relocationBuffer.push({
        entry,
        sessionId,
        storageV5,
        foreignAtEntry: foreign,
        pulledAtEntry: bridgeSession,
        pulledRowsAtEntry: pulledRows,
      });
      return;
    }
    let sessionId_2 = this.store.getSessionId();
    let isCurrentSession = sessionId === sessionId_2;
    let transcriptPath;
    if (isCurrentSession) {
      if (this.sessionFile === null) {
        this.pendingEntries.push({
          entry,
          storageV5,
        });
        return;
      }
      transcriptPath = this.sessionFile;
    } else {
      let existingSessionFile = await this.getExistingSessionFile(sessionId, storageV5);
      if (!existingSessionFile) {
        logError(
          withTelemetryMessage(
            Error(`appendEntry: session file not found for other session ${sessionId}`),
            "appendEntry: session file not found for other session (id not reported); entry not written",
          ),
        );
        return;
      }
      transcriptPath = existingSessionFile;
    }
    switch (entry.type === "repl-mode" ? "always" : ENTRY_APPEND_POLICY[entry.type]) {
      case "always": {
        this.enqueueWrite(transcriptPath, entry, storageV5);
        return;
      }
      case "route-by-agent": {
        let routedPath =
          (entry.type === "content-replacement" ||
            entry.type === "api-request-shape" ||
            entry.type === "api-request-blob" ||
            entry.type === "api-request" ||
            entry.type === "fork-context-ref" ||
            entry.type === "observer-ref") &&
          entry.agentId
            ? agentTranscriptPathOfEntry(entry.agentId)
            : transcriptPath;
        if (routedPath === undefined) {
          logError(Error("appendEntry invariant: agentId cannot name a transcript file; entry dropped"));
          return;
        }
        this.enqueueWrite(routedPath, entry, storageV5);
        if (entry.type === "fork-context-ref" && isRequestBlobStoreEnabled())
          this.replayIndexFor(routedPath).then(({ index }) => index.noteLine(entry));
        return;
      }
      case "dedup-transcript": {
        if (entry.type !== "progress" && !isTranscriptMessage(entry)) {
          logError(
            Error(`appendEntry invariant: dedup-transcript policy on non-transcript type '${entry.type}'`),
          );
          return;
        }
        let existingMessages = await this.store.sessionMessages(sessionId, storageV5);
        let isAgentSidechain = entry.isSidechain && entry.agentId !== undefined;
        let targetPath = isAgentSidechain ? agentTranscriptPathOfEntry(entry.agentId) : transcriptPath;
        if (targetPath === undefined) {
          logError(Error("appendEntry invariant: agentId cannot name a transcript file; entry dropped"));
          return;
        }
        let replayIndex;
        if (!this.appendsSealedForShutdown && isRequestBlobStoreEnabled())
          try {
            replayIndex = (await this.replayIndexFor(targetPath)).index;
          } catch (error) {
            logError(error);
          }
        let isUnseenRow = !existingMessages.has(entry.uuid);
        if (isAgentSidechain || isUnseenRow) {
          this.enqueueWrite(
            targetPath,
            isAgentSidechain || storageV5 !== undefined
              ? entry
              : (this.store.slimAppendedRow?.(entry) ?? entry),
            storageV5,
          );
          try {
            if (replayIndex !== undefined) {
              replayIndex.noteLine(entry);
              if (isCompactBoundaryMessage_3(entry)) clearAllReplayChains();
              for (let [toolUseId, digest] of getToolResultDigests(entry))
                this.queuedToolResults.set(
                  `${targetPath}
${toolUseId}`,
                  digest,
                );
            }
          } catch (error) {
            logError(error);
          }
          if (!isAgentSidechain) {
            existingMessages.add(entry.uuid);
            if (isTranscriptMessage(entry))
              if (this.internalEventWriter && isShuttingDown()) {
                this.releaseWaitsForUploads();
                this.persistToRemote(sessionId, entry);
              } else await this.untilUploadedOrShutdown(this.persistToRemote(sessionId, entry));
          } else if (this.internalEventWriter && isTranscriptMessage(entry))
            this.persistToRemote(sessionId, entry);
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
  noteSessionFileMoving(oldPath, newPath) {
    if (this.sessionFilesNotYetWritten.delete(oldPath)) this.sessionFilesNotYetWritten.add(newPath);
  }
  existingSessionFiles = new Map();
  sessionFilesNotYetWritten = new Set();
  foreignWithheldEntryUuids = new Set();
  windowNoteEntryUuids = new Set();
  recordedSessionFile(sessionId) {
    return this.existingSessionFiles.get(sessionId);
  }
  async getExistingSessionFile(sessionId, storageV5) {
    let recordedPath = this.existingSessionFiles.get(sessionId);
    if (recordedPath) {
      if (this.sessionFilesNotYetWritten.has(recordedPath)) return recordedPath;
      return (await this.probeTranscript(recordedPath, storageV5).catch(() => "unknown")) === "absent"
        ? null
        : recordedPath;
    }
    let transcriptPathForSession = getTranscriptPathForSession(sessionId);
    if ((await this.probeTranscript(transcriptPathForSession, storageV5)) === "present") {
      this.existingSessionFiles.set(sessionId, transcriptPathForSession);
      return transcriptPathForSession;
    }
    return null;
  }
  async probeTranscript(transcriptPath, storageV5) {
    let storageKey = storageV5 !== undefined ? transcriptStorageKeyForPath(transcriptPath) : undefined;
    if (isStorageV5Enabled() && storageV5 !== undefined && storageKey !== undefined)
      try {
        let statResult = await storageV5.statMeta(storageKey);
        if (statResult.ok) return "present";
        if (statResult.error.code === "NotFound") return "absent";
      } catch {}
    if (isDiskless()) return "unknown";
    try {
      await stat(transcriptPath);
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
    let isForeignRow = isRowForeignToBridgeSession(entry, this.internalEventWriterSessionId);
    if (isForeignRow && !this.windowNoteEntryUuids.delete(entry.uuid)) {
      logForDebugging("[persist-remote] Skipping upload: the row is the /teleport-pulled conversation's");
      return;
    }
    if (
      isCompactOrCarriedMessage(entry) &&
      (isForeignRow ||
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
  async mirrorInternalEntry(entry) {
    if (isRemoteEgressSuppressedFor(pinSessionId(this.store.getSessionId()))) {
      let checkedEntry = entry;
      if (checkedEntry.type !== "last-prompt" || checkedEntry.explicit !== true) return false;
      let { lastPrompt, ...entryWithoutPrompt } = entry;
      entry = entryWithoutPrompt;
    }
    if (!this.internalEventWriter || isShuttingDown()) return false;
    try {
      await this.internalEventWriter(entry.type, entry, {});
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
  async mirrorWorkerEvent(eventType, payload, { sessionId, agentId }) {
    if (this.shouldSkipPersistence() || isRemoteEgressSuppressedFor(sessionId)) return false;
    if (!this.internalEventWriter || isShuttingDown()) return false;
    await this.internalEventWriter(eventType, payload, {
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
  noteAgentWrittenLocally(agentId) {
    if (this.internalAgentEventReader !== null) this.agentIdsWrittenLocally.add(agentId);
  }
  hasWrittenAgentLocally(agentId) {
    return this.agentIdsWrittenLocally.has(agentId);
  }
  setVerifiesAgentTranscripts(verifiesAgentTranscripts) {
    this.verifiesAgentTranscripts = verifiesAgentTranscripts;
  }
  mustVerifyAgentTranscript(agentId) {
    return this.verifiesAgentTranscripts && !this.agentIdsWrittenLocally.has(agentId);
  }
  noteAgentOverBound(agentId) {
    this.agentIdsOverBound.add(agentId);
  }
  isAgentOverBound(agentId) {
    return this.agentIdsOverBound.has(agentId);
  }
  async hydrateAgentTranscriptOnDemand(agentId, sessionId, abortSignal, verifyLocal = false) {
    let internalAgentEventReader = this.internalAgentEventReader;
    if (internalAgentEventReader === null) return "no_reader";
    if (!isSafeIdSegment(agentId)) return "unsafe_id";
    if (this.agentIdsOverBound.has(agentId)) throw new AgentTranscriptFetchError("over_bound");
    if (this.agentIdsFetched.has(agentId)) return "already_fetched";
    let writtenLocally = this.agentIdsWrittenLocally.has(agentId);
    let inflightFetch = this.agentTranscriptFetches.get(agentId);
    if (inflightFetch)
      try {
        return await inflightFetch;
      } catch (error) {
        if (!isAbortError(error) || abortSignal?.aborted) throw error;
      }
    let agentTranscriptOnce = this.fetchAgentTranscriptOnce(
      internalAgentEventReader,
      agentId,
      sessionId,
      abortSignal,
      writtenLocally,
      verifyLocal,
    );
    this.agentTranscriptFetches.set(agentId, agentTranscriptOnce);
    try {
      return await agentTranscriptOnce;
    } finally {
      if (this.agentTranscriptFetches.get(agentId) === agentTranscriptOnce)
        this.agentTranscriptFetches.delete(agentId);
    }
  }
  async fetchAgentTranscriptOnce(readEvents, agentId, storageV5, abortSignal, createOnly, verifyLocal) {
    if (
      createOnly &&
      wrapStorageSource(getStorageTargetForPath(getAgentTranscriptPath(agentId), storageV5))
    ) {
      this.agentIdsFetched.add(agentId);
      logForDiagnosticsNoPII("info", "subagent_lazy_fetch", {
        outcome: "backend_no_create",
        written_locally: true,
      });
      return "backend_no_create";
    }
    let now = Date.now();
    let outcome = "read_fail";
    let pageCount;
    let entryCount;
    let bytesDecoded;
    let overBoundBy;
    let errnoCode;
    let localProbe;
    try {
      let lastSyncedUuid;
      if (verifyLocal && (await readAgentMetadata(agentId, storageV5).catch(() => null)) !== null) {
        let fileHandle = await openRegularFile(getAgentTranscriptPath(agentId)).catch(() => null);
        let tailResult = fileHandle && (await tailFile(fileHandle, 65536).catch(() => null));
        await fileHandle?.close().catch(() => {});
        let last = tailResult?.content
          .split(
            `
`,
          )
          .findLast(isConversationLine);
        lastSyncedUuid = last && extractLastSyncedEventUuid(last);
      }
      let fetchResult = null;
      if (lastSyncedUuid !== undefined) {
        fetchResult = await readEvents(
          agentId,
          abortSignal,
          lastSyncedUuid,
          MAX_AGENT_EVENTS_READ_BYTES,
        ).catch((error) => {
          logError(error);
          return null;
        });
        if (fetchResult === null) localProbe = abortSignal?.aborted ? "aborted" : "failed";
        else if (fetchResult.anchorFallback) localProbe = `anchor-${fetchResult.anchorFallback}`;
        else
          localProbe =
            fetchResult.overBound ||
            fetchResult.encodedBody ||
            fetchResult.events.some(
              (event) => isConversationEntry(event.payload) || event.payload?.subtype === "compact_boundary",
            )
              ? "not-current"
              : "current";
      }
      if (localProbe !== "current" && !fetchResult?.anchorFallback) {
        let firstResult = fetchResult;
        fetchResult = await readEvents(
          agentId,
          abortSignal,
          undefined,
          verifyLocal ? MAX_AGENT_EVENTS_READ_BYTES : undefined,
        ).catch((error) => {
          logError(error);
          return null;
        });
        if (
          fetchResult?.overBound &&
          firstResult?.events.some(
            (event) => event.session_agent_id === agentId && isConversationEntry(event.payload),
          )
        )
          fetchResult = firstResult;
      }
      if (fetchResult === null) {
        if (abortSignal?.aborted) {
          outcome = "aborted";
          throw new AbortError_2();
        }
        throw new AgentTranscriptFetchError("read_fail");
      }
      pageCount = fetchResult.stats?.pageCount;
      bytesDecoded = fetchResult.stats?.bytesDecoded;
      if (fetchResult.overBound && !verifyLocal) {
        outcome = "over_bound";
        overBoundBy = fetchResult.overBoundBy;
        this.agentIdsOverBound.add(agentId);
        throw new AgentTranscriptFetchError("over_bound");
      }
      if (fetchResult.encodedBody) {
        outcome = "body_encoded";
        throw new AgentTranscriptFetchError("body_encoded");
      }
      let contextFields = await transcriptContextFields();
      let entries = fetchResult.events
        .filter((event) => event.session_agent_id === agentId)
        .map((event) => fillMissingTranscriptFields(event.payload, contextFields));
      entryCount = entries.length;
      if (entries.length === 0 && fetchResult.events.length > 0) {
        outcome = "unfiltered";
        throw new AgentTranscriptFetchError("unfiltered");
      }
      let last = entries.findLast(isConversationEntry);
      let tailUuids = new Set();
      if (verifyLocal && last !== undefined)
        await someLineMatches(getAgentTranscriptPath(agentId), (line) => {
          for (let uuid of collectTailUuids(line)) tailUuids.add(uuid);
          return false;
        }).catch((error) => {
          outcome = "local_read_fail";
          errnoCode = sanitizedErrnoLowerForTelemetry(error);
          throw new AgentTranscriptFetchError(outcome, {
            cause: error,
          });
        });
      if (!createOnly && this.agentIdsWrittenLocally.has(agentId)) {
        outcome = "superseded";
        return outcome;
      }
      if (verifyLocal) {
        let missingEvents =
          last === undefined || tailUuids.has(last.uuid)
            ? []
            : entries.filter((event) => event.type !== "agent_metadata" && !tailUuids.has(event.uuid));
        outcome = "write_fail";
        if (
          (await appendToTranscriptFile(
            getAgentTranscriptPath(agentId),
            jsonlJoin(missingEvents),
            storageV5,
            true,
          ).catch((error) => {
            errnoCode = sanitizedErrnoLowerForTelemetry(error);
            throw new AgentTranscriptFetchError("write_fail", {
              cause: error,
            });
          })) === "skipped"
        )
          throw new AgentTranscriptFetchError("write_fail");
        let entry = entries.findLast((event) => event.type === "agent_metadata");
        if (entry !== undefined && this.keepsAgentMetadataInStream())
          await restoreAgentSidecarFromStream(agentId, entry, storageV5);
        outcome =
          missingEvents.length > 0
            ? "hit"
            : fetchResult.overBound
              ? "local_unchecked"
              : last === undefined && localProbe !== "current"
                ? "empty"
                : "local_current";
      } else if (entries.some(isConversationEntry)) {
        outcome = "write_fail";
        outcome =
          (await writeHydratedAgentTranscript(agentId, entries, storageV5, {
            createOnly,
          }).catch((cause) => {
            throw new AgentTranscriptFetchError("write_fail", {
              cause,
            });
          })) === "exists"
            ? "superseded"
            : "hit";
      } else outcome = "empty";
      this.agentIdsFetched.add(agentId);
      return outcome;
    } finally {
      if (outcome === "hit" && bytesDecoded !== undefined && !verifyLocal)
        logFeatureOk("ccr_subagent_lazy_fetch", {
          size_bytes: bytesDecoded,
          count: entryCount ?? 0,
        });
      else if (
        outcome === "hit" ||
        outcome === "empty" ||
        outcome === "local_current" ||
        outcome === "superseded"
      )
        logFeatureOk("ccr_subagent_lazy_fetch");
      else if (outcome === "local_unchecked") logFeatureSad("ccr_subagent_lazy_fetch", outcome);
      else if (outcome === "over_bound" && overBoundBy !== undefined)
        logFeatureBad("ccr_subagent_lazy_fetch", `over_bound_${overBoundBy}`);
      else if (outcome !== "aborted") logFeatureBad("ccr_subagent_lazy_fetch", outcome);
      logForDiagnosticsNoPII("info", "subagent_lazy_fetch", {
        outcome,
        written_locally: createOnly,
        verify_local: verifyLocal,
        probe: localProbe,
        errno: errnoCode,
        page_count: pageCount,
        event_count: entryCount,
        duration_ms: Date.now() - now,
      });
    }
  }
}
//@ chunk-5xgkngpb.js:410326-410500 facade-majority
function readAtTranscriptEntry(messages, allMessages) {
  let sessionId = getSessionId();
  return {
    cleanedMessages: cleanMessagesForLogging(messages, allMessages),
    sessionId,
    foreignAtEntry: isForeignToBinding(pinSessionId(sessionId)),
    pulledAtEntry: bridgeSessionForPulledWindow(pinSessionId(sessionId)) ?? null,
    pulledRowsAtEntry: pulledRows_2(),
    promptIdAtEntry: getPromptId_2(),
  };
}
//@ chunk-5xgkngpb.js:410500-411031 facade-majority (2.1.88 match: recordTranscript, 0.261)
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
    cleanedMessages,
    sessionId,
    foreignAtEntry,
    pulledAtEntry,
    pulledRowsAtEntry,
    promptIdAtEntry,
  } = readAtTranscriptEntry(messages, allMessages),
) {
  let sessionId_2 = getProject();
  return sessionId_2.recordInTurn(sessionId, undefined, async () => {
    let messageSet = await currentTranscriptStore().sessionMessages(sessionId, storageV5);
    let newMessages = [];
    let startingParentUuid = startingParentUuidHint;
    if (startingParentUuid && !isTranscriptPersistenceDisabled() && !messageSet.has(startingParentUuid))
      logEvent("tengu_phantom_parent_hint", {});
    let seenNewMessage = false;
    for (let m of cleanedMessages)
      if (messageSet.has(m.uuid)) {
        if (!seenNewMessage && isChainParticipant(m) && !isReorderedRow(m.uuid)) startingParentUuid = m.uuid;
      } else {
        newMessages.push(m);
        seenNewMessage = true;
      }
    if (newMessages.length > 0)
      await sessionId_2.insertMessageChain(
        newMessages,
        false,
        undefined,
        startingParentUuid,
        teamInfo,
        sessionId,
        foreignAtEntry,
        storageV5,
        pulledAtEntry,
        pulledRowsAtEntry,
        promptIdAtEntry,
      );
    return newMessages.findLast(isChainParticipant)?.uuid ?? startingParentUuid ?? null;
  });
}
//@ chunk-5xgkngpb.js:411031-411322 facade-majority
/**
 * 追加 last-prompt 记录：叶子 uuid 与最后一条提示，用于 resume 选取叶子与列表显示。
 */
async function persistLeafCheckpoint(leafUuid, extraFields, storageV5) {
  let project = getProject();
  project.currentSessionLeafUuid = leafUuid ?? undefined;
  project.currentSessionLeafTs = new Date().toISOString();
  await project.appendEntry(
    {
      type: "last-prompt",
      ...(project.currentSessionLastPrompt && {
        lastPrompt: project.currentSessionLastPrompt,
      }),
      leafUuid,
      explicit: true,
      ...extraFields,
      sessionId: getSessionId(),
    },
    undefined,
    undefined,
    storageV5,
  );
}
//@ chunk-5xgkngpb.js:411322-411434 facade-majority
function queueLeafCheckpointWithdrawal() {
  getProject().queueLeafCheckpointWithdrawal({
    type: "last-prompt",
    leafUuid: null,
    explicit: true,
    sessionId: getSessionId(),
  });
}
//@ chunk-5xgkngpb.js:411434-411632 facade-majority
async function mirrorLeafCheckpointToRemote(leafUuid, extraFields) {
  let project = getProject();
  await project.mirrorInternalEntry({
    type: "last-prompt",
    ...(project.currentSessionLastPrompt && {
      lastPrompt: project.currentSessionLastPrompt,
    }),
    leafUuid,
    explicit: true,
    ...extraFields,
    sessionId: getSessionId(),
  });
}
//@ chunk-5xgkngpb.js:411632-411731 facade-majority
function mirrorCustomTitleToRemote(sessionId, customTitle) {
  return getProject().mirrorInternalEntry({
    type: "custom-title",
    customTitle,
    sessionId,
  });
}
//@ chunk-5xgkngpb.js:411731-411783 facade-majority
function hasRemoteWorkerEventLog() {
  return getProject().hasInternalEventWriter();
}
//@ chunk-5xgkngpb.js:411783-411840 facade-majority
function mirrorWorkerEventToRemote(eventType, payload, meta) {
  return getProject().mirrorWorkerEvent(eventType, payload, meta);
}
//@ chunk-5xgkngpb.js:411840-412020 facade-majority (2.1.88 match: recordSidechainTranscript, 0.678)
/**
 * 记录子代理（sidechain）消息：isSidechain=true、带 agentId，写入 subagents/agent-<id>.jsonl。
 */
async function recordSidechainTranscript(messages, agentId, sessionIdOverride, storageV5) {
  let sessionId = getSessionId();
  let foreignAtEntry = isForeignToBinding(pinSessionId(sessionId));
  let pulledAtEntry = bridgeSessionForPulledWindow(pinSessionId(sessionId)) ?? null;
  let pulledRowsAtEntry = pulledRows_2();
  let promptId = getPromptId_2();
  let cleanedMessages = cleanMessagesForLogging(messages);
  let project = getProject();
  await project.recordInTurn(sessionId, agentId, () =>
    project.insertMessageChain(
      cleanedMessages,
      true,
      agentId,
      sessionIdOverride,
      undefined,
      sessionId,
      foreignAtEntry,
      storageV5,
      pulledAtEntry,
      pulledRowsAtEntry,
      promptId,
    ),
  );
}
//@ chunk-5xgkngpb.js:412020-412115 facade-majority (2.1.88 match: recordContextCollapseSnapshot, 0.517)
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
//@ chunk-5xgkngpb.js:412115-412186 facade-majority (2.1.88 match: recordContextCollapseCommit, 1)
async function recordArtifactAutoReactLedger(ledgerEntry, storageV5) {
  await getProject().appendEntry(ledgerEntry, ledgerEntry.sessionId, undefined, storageV5);
}
//@ chunk-5xgkngpb.js:412186-412254 facade-majority (2.1.88 match: recordContextCollapseCommit, 1)
function recordCostState(costEntry, storageV5) {
  getProject().appendEntry(costEntry, costEntry.sessionId, undefined, storageV5).catch(logError);
}
//@ chunk-5xgkngpb.js:412254-412263 layout
// deferred: uses registerCostStateRecorder (../bootstrap/state.js) of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-5xgkngpb.js:412254", () => {
  registerCostStateRecorder(recordCostState);
});
//@ chunk-5xgkngpb.js:412263-412389 facade-majority
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
//@ chunk-5xgkngpb.js:412389-412590 facade-majority
async function agentTranscriptExists(agentId, storageV5) {
  if (isStorageV5Enabled() && storageV5 !== undefined)
    try {
      let transcriptPath = locateAgentTranscript(agentId);
      let storageKey = transcriptPath === undefined ? undefined : transcriptKeyFor(transcriptPath);
      if (storageKey !== undefined && (await storageV5.stat(storageKey)).ok) return true;
    } catch {}
  if (isDiskless()) return false;
  try {
    await stat(getAgentTranscriptPath(agentId));
    return true;
  } catch {
    return false;
  }
}
//@ chunk-5xgkngpb.js:412590-412723 layout
function splitJsonlLines(text) {
  let lines = [];
  let cursor = 0;
  while (cursor < text.length) {
    let index = text.indexOf(
      `
`,
      cursor,
    );
    let lineEnd = index === -1 ? text.length : index + 1;
    lines.push({
      data: text.slice(cursor, lineEnd),
    });
    cursor = lineEnd;
  }
  return lines;
}
//@ chunk-5xgkngpb.js:412723-412898 layout
function getSessionScopeOfKey(storageKey) {
  if (storageKey.namespace !== "transcript") throw Error("sessionScopeOf: not a transcript key");
  return {
    namespace: "transcript",
    projectKey: storageKey.projectKey,
    sessionId: storageKey.sessionId,
  };
}
//@ chunk-5xgkngpb.js:412898-412985 layout
function getStorageErrorCause(error) {
  let cause = error instanceof Error ? error.cause : undefined;
  return isStoreError(cause) && isStoreFencedError(cause) ? cause : undefined;
}
//@ chunk-5xgkngpb.js:412985-413160 layout
function transcriptAppendFailedError(error) {
  let makeError = () =>
    Object.assign(
      new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
        `transcript storage append failed (${formatStorageErrorCode(error)})`,
        "transcript storage append failed",
      ),
      {
        cause: error,
      },
    );
  return isStoreFencedError(error) ? makeError() : withErrnoFromStorageError(error, makeError, "write");
}
//@ chunk-5xgkngpb.js:413160-413281 layout
function logReStampFailure(operationName, error) {
  if (isSyscallError(error))
    logForDebugging(
      `${operationName} (${getErrnoCode(error)}): ${errorMessage(error)}; the synchronous re-stamp runs instead`,
      {
        level: "error",
      },
    );
  else logError(error);
}
//@ chunk-5xgkngpb.js:413281-413376 layout
function entryDedupKey(path, entry) {
  let sessionId = "sessionId" in entry ? entry.sessionId : undefined;
  return `${path}
${entry.type}
${String(sessionId)}`;
}
//@ chunk-5xgkngpb.js:413376-413622 layout
function getAsideStrandedLeftover(error) {
  if (error.code !== "Failed" || error.telemetryCode !== "AsideStranded") return;
  let cause = "cause" in error ? error.cause : undefined;
  if (typeof cause !== "object" || cause === null || "moveError" in cause) return;
  let path = "path" in cause ? cause.path : undefined;
  return {
    leftover: typeof path === "string" ? path : undefined,
  };
}
//@ chunk-5xgkngpb.js:413622-413775 layout
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
//@ chunk-5xgkngpb.js:413775-413949 layout
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
//@ chunk-5xgkngpb.js:413949-414046 layout
function formatStorageErrorCode(storageError) {
  return "telemetryCode" in storageError && storageError.telemetryCode
    ? `${storageError.code} ${storageError.telemetryCode}`
    : storageError.code;
}
//@ chunk-5xgkngpb.js:414046-414237 layout
function withErrnoFromStorageError(storageError, makeError, syscall) {
  let cause = "cause" in storageError ? storageError.cause : undefined;
  if (isSyscallError(cause)) return cause;
  let preparedError = makeError();
  let errnoCode = storageErrorToErrno(storageError, cause);
  if (errnoCode === undefined) return preparedError;
  let errno = constants_8.errno;
  return Object.assign(preparedError, {
    code: errnoCode,
    errno: -(errno[errnoCode] ?? 0),
    syscall,
  });
}
//@ chunk-5xgkngpb.js:414237-414410 layout
function storageErrorToErrno(storageError, cause) {
  let code = storageErrorCode(storageError);
  if (isErrnoCode(code)) return code;
  let code_2 = getErrnoCode(cause);
  if (isErrnoCode(code_2)) return code_2;
  switch (storageError.code) {
    case "NotFound":
      return "ENOENT";
    case "Unavailable":
      return "EAGAIN";
    default:
      return;
  }
}
//@ chunk-5xgkngpb.js:414410-414468 layout
function isErrnoCode(code) {
  return code !== undefined && /^E[A-Z0-9]+$/.test(code);
}
//@ chunk-5xgkngpb.js:414468-414673 facade-majority
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
//@ chunk-5xgkngpb.js:414673-414722 layout
function assertDiskWritable(writer, reason) {
  if (isDiskless()) {
    warnDisklessSettingsWrite(writer, reason);
    throw new RefusedDirectWriteError(writer);
  }
}
//@ chunk-5xgkngpb.js:414722-414774 layout
function swallowRefusedDirectWrite(error) {
  if (!(error instanceof RefusedDirectWriteError)) throw error;
  logError(error);
}
//@ chunk-5xgkngpb.js:414774-414862 layout
function getHydratedTranscriptTarget(transcriptPath, storageV5) {
  let target = wrapStorageSource(getStorageTargetForPath(transcriptPath, storageV5));
  if (target === undefined) assertDiskWritable("hydrated_transcript", transcriptPath);
  return target;
}
//@ chunk-5xgkngpb.js:414862-415919 layout
/**
 * 把一段 jsonl 文本追加到转录：文件以 O_APPEND 打开（必要时先补换行封闭撕裂的尾行），storage v5 后端时写记录。
 */
async function appendToTranscriptFile(transcriptPath, content, storageV5, ifExists, newlineFallback) {
  let store = currentTranscriptStore();
  let sealPending = ifExists !== true && store.project?.tornTailSealPending(transcriptPath) === true;
  if (sealPending)
    content =
      `
` + content;
  let needsLeadingNewline = false;
  let storageKey = storageV5 !== undefined ? transcriptStorageKeyForPath(transcriptPath) : undefined;
  if (isStorageV5Enabled() && storageV5 !== undefined && storageKey !== undefined) {
    if (ifExists === true) {
      let stats = await storageV5.stat(storageKey);
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
        content =
          `
` + (newlineFallback ?? content);
        needsLeadingNewline = true;
      }
    }
    let appendResult = await storageV5.append(
      storageKey,
      splitJsonlLines(content),
      ifExists === true
        ? {
            precondition: {
              type: "ifExists",
            },
          }
        : undefined,
    );
    if (!appendResult.ok) {
      if (ifExists === true && appendResult.error.code === "NotFound") return "skipped";
      throw transcriptAppendFailedError(appendResult.error);
    }
    if (sealPending) store.project?.tornTailSealLanded(transcriptPath);
    return needsLeadingNewline ? "backend-torn" : "backend";
  }
  assertDiskWritable("transcript_lines", transcriptPath);
  if (ifExists === true) {
    let appended = await appendToExistingTranscript(transcriptPath, content, newlineFallback);
    return appended === false ? "skipped" : appended === "torn" ? "direct-torn" : "direct";
  }
  try {
    await appendFile(transcriptPath, content, {
      mode: 384,
    });
  } catch {
    await mkdir(dirname(transcriptPath), {
      recursive: true,
      mode: 448,
    });
    await appendFile(transcriptPath, content, {
      mode: 384,
    });
  }
  if (sealPending) store.project?.tornTailSealLanded(transcriptPath);
  return "direct";
}
//@ chunk-5xgkngpb.js:415919-416445 layout
async function appendToExistingTranscript(transcriptPath, content, newlineFallback) {
  let fileHandle;
  try {
    fileHandle = await open(transcriptPath, constants.O_RDWR | constants.O_APPEND | NOFOLLOW_NONBLOCK_FLAGS);
  } catch (error) {
    let errnoCode = getErrnoCode(error);
    if (errnoCode === "ENOENT" || errnoCode === "ENOTDIR") return false;
    throw error;
  }
  try {
    let { size } = await fileHandle.stat();
    if (size === 0) return false;
    let lastByte = Buffer.alloc(1);
    let { bytesRead } = await fileHandle.read(lastByte, 0, 1, size - 1);
    let endsWithNewline = bytesRead === 1 && lastByte[0] === 10;
    let buffer = Buffer.from(
      endsWithNewline
        ? content
        : `
` + (newlineFallback ?? content),
      "utf8",
    );
    let position = undefined;
    let written = 0;
    while (written < buffer.length) {
      let { bytesWritten } = await fileHandle.write(buffer, written, buffer.length - written, position);
      if (bytesWritten <= 0) throw Error("appendToExistingTranscript: short write");
      written += bytesWritten;
      if (position !== undefined) position += bytesWritten;
    }
    return endsWithNewline ? true : "torn";
  } finally {
    await fileHandle.close();
  }
}
//@ chunk-5xgkngpb.js:416445-416461 facade-majority
var OBSERVER_REF_TAIL_SCAN_BYTES = 1048576;
//@ chunk-5xgkngpb.js:416461-416620 layout
async function readTranscriptTailViaStorage(transcriptPath, maxBytes, storageV5) {
  let storageKey = transcriptKeyFor(transcriptPath);
  if (storageKey === undefined) return;
  let transcriptTailV5 = await readTranscriptTailV5(storageKey, maxBytes, storageV5);
  if (transcriptTailV5 === null) return null;
  if (!transcriptTailV5.ok) return;
  return {
    content: transcriptTailV5.content,
    cut: transcriptTailV5.cut,
  };
}
//@ chunk-5xgkngpb.js:416620-416987 facade-majority
function readTranscriptTailV5(storageKey, maxBytes, storageV5) {
  return storageV5
    .read([
      {
        key: storageKey,
        tail: maxBytes,
      },
    ])
    .then((readResult) => {
      if (!readResult.ok)
        return isByteViewUnsupportedError(readResult.error)
          ? readStorageTailByRecords(storageKey, maxBytes, storageV5)
          : {
              ok: false,
              error: readResult.error,
            };
      let [item] = readResult.value.items;
      if (!item.found) return null;
      return {
        ok: true,
        content: Buffer.from(item.value.buffer, item.value.byteOffset, item.value.byteLength).toString(
          "utf8",
        ),
        totalBytes: item.totalBytes,
        byteLength: item.value.byteLength,
        cut: item.totalBytes > item.value.byteLength,
      };
    });
}
//@ chunk-5xgkngpb.js:416987-417076 layout
function isStorageTooLargeError(error) {
  return error.code === "Failed" && "telemetryCode" in error && error.telemetryCode === "EFBIG";
}
//@ chunk-5xgkngpb.js:417076-417099 layout
var PAGED_TRANSCRIPT_PAGE_BYTES = 4194304;
var pagedTranscriptPageBytes = WRITE_BUFFER_LIMIT_BYTES;
//@ chunk-5xgkngpb.js:417099-417214 layout
function pagedTranscriptTooLargeError() {
  return Object.assign(Error("loadTranscriptFile: the paged transcript is too large"), {
    code: "EFBIG",
  });
}
//@ chunk-5xgkngpb.js:417214-418247 layout
async function readPagedTranscript(backend, key, pagedTranscriptPageBytes_2) {
  let statResult;
  try {
    statResult = await backend.stat(key);
  } catch (error) {
    if (pagedTranscriptPageBytes_2 !== undefined) return;
    throw error;
  }
  if (!statResult.ok) {
    if (statResult.error.code === "NotFound") return null;
    if (pagedTranscriptPageBytes_2 !== undefined) return;
    return {
      failure: statResult.error,
    };
  }
  if (pagedTranscriptPageBytes_2 !== undefined && statResult.value.size > pagedTranscriptPageBytes_2) return;
  if (statResult.value.size > pagedTranscriptPageBytes) throw pagedTranscriptTooLargeError();
  let buffer = Buffer.allocUnsafe(Math.min(statResult.value.size, pagedTranscriptPageBytes));
  let bytesRead = 0;
  let recordCount = 0;
  let cursorSeq;
  for (;;) {
    let records = await backend.readRecords(key, {
      order: "forward",
      maxBytes: PAGED_TRANSCRIPT_PAGE_BYTES,
      ...(cursorSeq !== undefined && {
        fromSeq: cursorSeq,
      }),
    });
    if (!records.ok) {
      if (records.error.code === "NotFound" && cursorSeq === undefined) return null;
      return {
        failure: records.error,
      };
    }
    for (let item of records.value.items) {
      let nextTotal = bytesRead + item.data.byteLength;
      if (nextTotal > pagedTranscriptPageBytes) throw pagedTranscriptTooLargeError();
      if (nextTotal > buffer.length) {
        let grownBuffer = Buffer.allocUnsafe(
          Math.min(Math.max(nextTotal, buffer.length * 2), pagedTranscriptPageBytes),
        );
        buffer.copy(grownBuffer, 0, 0, bytesRead);
        buffer = grownBuffer;
      }
      buffer.set(item.data, bytesRead);
      bytesRead = nextTotal;
      recordCount++;
    }
    let nextSeq = records.value.nextSeq;
    if (nextSeq === undefined) break;
    if (cursorSeq !== undefined && nextSeq <= cursorSeq)
      throw Error("loadTranscriptFile: the record cursor did not advance");
    cursorSeq = nextSeq;
  }
  logForDebugging(`loadTranscriptFile: read ${recordCount} records (${bytesRead} bytes) by page`);
  return {
    bytes: buffer.subarray(0, bytesRead),
    mtimeMs: statResult.value.mtimeMs,
    storedBytes: Math.max(statResult.value.size, bytesRead),
    tornTailBytes: statResult.value.tornTailBytes ?? 0,
  };
}
//@ chunk-5xgkngpb.js:418247-418553 layout
async function readStorageTailByRecords(storageKey, maxBytes, storageV5) {
  let records = await storageV5.readRecords(storageKey, {
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
//@ chunk-5xgkngpb.js:418553-418991 facade-majority
async function readLastObserverRef(agentId, storageV5) {
  let transcriptPath = agentId ? getAgentTranscriptPath(agentId) : getTranscriptPath();
  let storageTail =
    !isStorageV5Enabled() || storageV5 === undefined
      ? undefined
      : await readTranscriptTailViaStorage(transcriptPath, OBSERVER_REF_TAIL_SCAN_BYTES, storageV5).catch(
          () => {
            return;
          },
        );
  if (storageTail === null || (storageTail === undefined && isDiskless())) return null;
  let tail =
    storageTail !== undefined
      ? storageTail
      : await tailFile(transcriptPath, OBSERVER_REF_TAIL_SCAN_BYTES).catch((error) => {
          if (isFsInaccessible(error)) return null;
          throw error;
        });
  if (tail == null) return null;
  let lines = tail.content.split(`
`);
  for (let idx = lines.length - 1; idx >= 0; idx--) {
    let line = lines[idx];
    if (!line || !line.includes('"observer-ref"')) continue;
    try {
      let parsedLine = jsonParse(line);
      if (parsedLine?.type === "observer-ref") return parsedLine;
    } catch {}
  }
  return null;
}
//@ chunk-5xgkngpb.js:418991-419014 layout
var FORK_CONTEXT_MAX_DEPTH_2 = 4;
var FORK_CONTEXT_MAX_DEPTH = 16777216;
//@ chunk-5xgkngpb.js:419014-419349 facade-majority
/**
 * 解析 fork-context-ref：加载父会话到 parentLastUuid 为止的前缀消息，带缓存与并发去重。
 */
async function hydrateForkContext(forkRef, maxDepth = FORK_CONTEXT_MAX_DEPTH, storageV5) {
  let { forkContextHydrationCache, forkContextHydrationsInFlight } = currentTranscriptStore();
  let cachedPrefix = forkContextHydrationCache.get(forkRef.parentLastUuid);
  if (cachedPrefix) {
    forkContextHydrationCache.delete(forkRef.parentLastUuid);
    forkContextHydrationCache.set(forkRef.parentLastUuid, cachedPrefix);
    return cachedPrefix.slice;
  }
  let inflightLoad = forkContextHydrationsInFlight.get(forkRef.parentLastUuid);
  if (inflightLoad) return inflightLoad;
  let loadPromise = loadForkContextPrefix(forkRef, maxDepth, storageV5).finally(() =>
    forkContextHydrationsInFlight.delete(forkRef.parentLastUuid),
  );
  forkContextHydrationsInFlight.set(forkRef.parentLastUuid, loadPromise);
  return loadPromise;
}
//@ chunk-5xgkngpb.js:419349-420152 layout
async function loadForkContextPrefix(forkRef, maxBytes, storageV5) {
  let { forkContextHydrationCache } = currentTranscriptStore();
  if (!isSafeIdSegment_2(forkRef.parentSessionId)) {
    logForDebugging(
      "[fork-context-ref] parent session id cannot name a transcript file; returning empty prefix",
      {
        level: "warn",
      },
    );
    return [];
  }
  let transcriptPathForSession = getTranscriptPathForSession(forkRef.parentSessionId);
  let transcriptStorageKey = getTranscriptStorageKey(transcriptPathForSession, storageV5);
  let { messages } = await loadTranscriptFile(
    transcriptPathForSession,
    transcriptStorageKey && {
      storageV5: transcriptStorageKey,
    },
  );
  let parentMessage = messages.get(forkRef.parentLastUuid);
  if (!parentMessage) {
    logForDebugging(
      `[fork-context-ref] parent uuid ${forkRef.parentLastUuid} not found in ${transcriptPathForSession}; returning empty prefix`,
      {
        level: "warn",
      },
    );
    return [];
  }
  let mapped = buildConversationChain(messages, parentMessage)
    .filter((entry) => !entry.isSidechain)
    .map(({ isSidechain, parentUuid, promptId, ...restEntry }) => withoutTaskProducerMark(restEntry));
  let bytes = mapped.reduce((acc, entry) => acc + toJsonLine(entry).length, 0);
  forkContextHydrationCache.delete(forkRef.parentLastUuid);
  forkContextHydrationCache.set(forkRef.parentLastUuid, {
    slice: mapped,
    bytes,
  });
  let cachedBytes = 0;
  for (let cachedPrefix of forkContextHydrationCache.values()) cachedBytes += cachedPrefix.bytes;
  for (let [cacheKey, cachedPrefix] of forkContextHydrationCache) {
    if (
      forkContextHydrationCache.size <= 1 ||
      (forkContextHydrationCache.size <= FORK_CONTEXT_MAX_DEPTH_2 && cachedBytes <= maxBytes)
    )
      break;
    cachedBytes -= cachedPrefix.bytes;
    forkContextHydrationCache.delete(cacheKey);
  }
  return mapped;
}
//@ chunk-5xgkngpb.js:420152-420213 facade-majority (2.1.88 match: recordQueueOperation, 1)
/**
 * 追加 queue-operation 记录（排队命令的入队/出队），可写入其他会话的文件。
 */
async function recordQueueOperation(operation, storageV5) {
  await getProject().insertQueueOperation(operation, storageV5);
}
//@ chunk-5xgkngpb.js:420213-420370 facade-majority (2.1.88 match: removeTranscriptMessage, 0.515)
/**
 * 从转录中删除指定 uuid 的消息（排入写队列，执行时重写文件）。
 */
async function removeTranscriptMessage(uuid, storageV5, sessionId) {
  let storageBackend = isStorageV5Enabled() && storageV5 !== undefined ? storageV5 : undefined;
  let targetSessionId = sessionId ?? getSessionId();
  let project = getProject();
  let { drained } = await project.recordInTurn(targetSessionId, undefined, () =>
    project.removeMessageByUuid(uuid, targetSessionId, storageBackend),
  );
  await drained;
}
//@ chunk-5xgkngpb.js:420370-420596 facade-majority
async function removeTranscriptMessageIfPersisted(continuationReplacesUuid, storageV5) {
  let storageBackend = isStorageV5Enabled() && storageV5 !== undefined ? storageV5 : undefined;
  let sessionId = getSessionId();
  let project = getProject();
  let { drained } = await project.recordInTurn(sessionId, undefined, async () =>
    (await currentTranscriptStore().sessionMessages(sessionId, storageBackend)).has(continuationReplacesUuid)
      ? project.removeMessageByUuid(continuationReplacesUuid, sessionId, storageBackend)
      : {
          drained: Promise.resolve(),
        },
  );
  await drained;
}
//@ chunk-5xgkngpb.js:420596-420670 facade-majority (2.1.88 match: recordFileHistorySnapshot, 1)
/**
 * 追加 file-history-snapshot 记录（文件检查点，供 /rewind 回滚文件）。
 */
async function recordFileHistorySnapshot(messageId, snapshot, isSnapshotUpdate, storageV5) {
  await getProject().insertFileHistorySnapshot(messageId, snapshot, isSnapshotUpdate, storageV5);
}
//@ chunk-5xgkngpb.js:420670-420856 facade-majority
async function recordFileHistoryDelta(messageId, snapshotMessageId, trackingPath, backup, storageV5) {
  await getProject().insertFileHistoryDelta(
    {
      type: "file-history-delta",
      messageId,
      snapshotMessageId,
      trackingPath,
      backup,
      timestamp: new Date().toISOString(),
    },
    storageV5,
  );
}
//@ chunk-5xgkngpb.js:420856-420922 facade-majority (2.1.88 match: recordAttributionSnapshot, 1)
/**
 * 追加 attribution-snapshot 记录（提交署名统计快照）。
 */
async function recordAttributionSnapshot(snapshot, storageV5) {
  await getProject().insertAttributionSnapshot(snapshot, storageV5);
}
//@ chunk-5xgkngpb.js:420922-420991 facade-majority (2.1.88 match: recordContentReplacement, 1)
/**
 * 追加 content-replacement 记录（大工具结果替换为引用），有 agentId 时写入子代理转录。
 */
async function recordContentReplacement(contentReplacements, agentId, storageV5) {
  await getProject().insertContentReplacement(contentReplacements, agentId, storageV5);
}
//@ chunk-5xgkngpb.js:420991-421156 layout
// deferred: uses setMarkerTextWriter (./transcriptRequestBlobs.js) of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-5xgkngpb.js:420991", () => {
  setMarkerTextWriter({
    canRecord: () => !isTranscriptPersistenceDisabled() && !getProject().isRemotelyMirrored(),
    append: (replayRecord) => getProject().appendRequestReplayRecords(replayRecord),
    storedToolResultDigest: (entry, toolUseId) => getProject().queuedToolResultDigest(entry, toolUseId),
  });
});
//@ chunk-5xgkngpb.js:421156-421201 facade-majority (2.1.88 match: resetSessionFilePointer, 1)
/**
 * 重置会话文件指针（新 sessionId 时下次写入重新创建文件）。
 */
async function resetSessionFilePointer() {
  getProject().resetSessionFile();
}
//@ chunk-5xgkngpb.js:421201-421510 facade-majority (2.1.88 match: adoptResumedSessionFile, 0.214)
/**
 * resume 同一会话时把会话文件指针指向被恢复的转录文件，并重写元数据。
 */
function adoptResumedSessionFile() {
  let project = getProject();
  let transcriptPath = getTranscriptPath();
  project.setSessionFile(transcriptPath);
  let date = new Date();
  let progressFile = worktreeFromProgress(transcriptPath);
  if (progressFile !== undefined) utimes(progressFile, date, date).catch(() => {});
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
//@ chunk-5xgkngpb.js:421510-421805 facade-majority
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
//@ chunk-5xgkngpb.js:421805-421876 facade-majority
function touchSessionTranscript(storageV5) {
  let sessionFilePath = getProject().sessionFilePath;
  if (sessionFilePath === null) return;
  touchTranscript(sessionFilePath, storageV5);
}
//@ chunk-5xgkngpb.js:421876-422059 layout
function touchTranscript(transcriptPath, storageV5) {
  if (isStorageV5Enabled() && storageV5 !== undefined) {
    let storageKey = transcriptKeyFor(transcriptPath);
    if (storageKey !== undefined) {
      try {
        storageV5.touch(storageKey).catch(() => {});
      } catch {}
      return;
    }
  }
  let progressFile = worktreeFromProgress(transcriptPath);
  if (progressFile === undefined) return;
  let date = new Date();
  utimes(progressFile, date, date).catch(() => {});
}
//@ chunk-5xgkngpb.js:422059-424200 facade-majority
/**
 * cwd 改变（如进入 worktree）后把当前会话转录从旧项目目录迁到新项目目录，迁移期间新写入先缓存在 relocationBuffer。
 */
async function relocateSessionTranscript(storageV5) {
  if (isDiskless()) throw Error("A diskless session moves no transcript between project folders on disk");
  let storage = isStorageV5Enabled() && storageV5 !== undefined ? storageV5 : undefined;
  let sessionId = getSessionId();
  let projectDir = getProjectDir(getOriginalCwd());
  let project = getProject();
  let sessionFilePath = project.sessionFilePath;
  if (sessionFilePath === null || isTranscriptPersistenceDisabled()) {
    project.currentSessionRelocatedCwd = getOriginalCwd();
    switchSession(sessionId, "cd", projectDir);
    return;
  }
  let nextPath = join(projectDir, `${sessionId}.jsonl`);
  if (sessionFilePath === nextPath) {
    switchSession(sessionId, "cd", projectDir);
    let originalCwd = getOriginalCwd();
    if (project.currentSessionRelocatedCwd !== originalCwd) {
      project.currentSessionRelocatedCwd = originalCwd;
      let relocatedEntry = {
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
            jsonStringify(relocatedEntry) +
              `
`,
            getStorageTargetForPath(sessionFilePath, storage),
          )
        )
          project.fireMirror(sessionFilePath, [relocatedEntry]);
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
    let realPathOptions = getRealPathOptions(storageV5);
    let sameDirectory =
      (await canonicalizePath(dirname(sessionFilePath), realPathOptions)) ===
      (await canonicalizePath(projectDir, realPathOptions));
    if (!sameDirectory)
      try {
        let [sourceStat, targetStat] = await Promise.all([
          stat(dirname(sessionFilePath), {
            bigint: true,
          }),
          stat(projectDir, {
            bigint: true,
          }),
        ]);
        sameDirectory = sourceStat.dev === targetStat.dev && sourceStat.ino === targetStat.ino;
      } catch (error) {
        if (!isENOENT(error)) throw error;
      }
    let setAsidePath;
    if (!sameDirectory) setAsidePath = await supersedeTranscriptFile(nextPath);
    let fromKey = storage && transcriptStorageKeyForPath(sessionFilePath);
    let toKey = storage && transcriptStorageKeyForPath(nextPath);
    let hasStorageKeys = storage !== undefined && fromKey !== undefined && toKey !== undefined;
    let transcriptMoved = true;
    try {
      await moveTranscript(
        sessionFilePath,
        nextPath,
        storage,
        hasStorageKeys
          ? {
              from: fromKey,
              to: toKey,
            }
          : undefined,
      );
    } catch (error) {
      if (isENOENT(error)) {
        if (setAsidePath !== undefined) {
          await rename(setAsidePath, nextPath).catch((error) => {
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
        transcriptMoved = false;
      } else {
        if (setAsidePath !== undefined)
          await rename(setAsidePath, nextPath).catch((error) => {
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
    let sourceSidecarDir = join(dirname(sessionFilePath), sessionId);
    let targetSidecarDir = join(projectDir, sessionId);
    let sidecarMoved = true;
    try {
      await moveTranscript(
        sourceSidecarDir,
        targetSidecarDir,
        storage,
        hasStorageKeys
          ? {
              fromScope: getSessionScopeOfKey(fromKey),
              toScope: getSessionScopeOfKey(toKey),
            }
          : undefined,
      );
    } catch (error) {
      sidecarMoved = false;
      if (!isENOENT(error)) logError(error);
    }
    project.noteSessionFileMoving(sessionFilePath, nextPath);
    project.setSessionFile(nextPath);
    switchSession(sessionId, "cd", projectDir);
    project.currentSessionRelocatedCwd = getOriginalCwd();
    if (transcriptMoved)
      try {
        await appendEntryToFileAsync(
          nextPath,
          {
            type: "relocated",
            sessionId,
            relocatedCwd: project.currentSessionRelocatedCwd,
          },
          storage,
        );
      } catch (error) {
        logForDebugging(`relocateSessionTranscript: relocated stamp failed: ${error}`);
      }
    if (sidecarMoved)
      try {
        let taskOutputModule = require("./task/diskOutput.js");
        await taskOutputModule.repointTaskOutputSymlinks(sourceSidecarDir, targetSidecarDir);
      } catch (error) {
        logError(error);
      }
  } finally {
    flushParkedAppends(project.sessionFilePath ?? sessionFilePath);
    await project.endTranscriptRelocation();
  }
}
//@ chunk-5xgkngpb.js:424200-424354 facade-majority
function reportRelocateSessionTranscriptFailure(error, operationName) {
  if (isSadFsErrno(error) || isEnvFsErrno(error))
    logForDebugging(
      `${operationName}: transcript relocation failed (${getErrnoCode(error)}): ${errorMessage(error)}`,
      {
        level: "error",
      },
    );
  else logError(error);
  reportTranscriptWriteFailure(currentTranscriptStore().writerHealth, "relocate", error);
}
//@ chunk-5xgkngpb.js:424354-424402 facade-majority
function beginTranscriptRelocationForTesting() {
  getProject().beginTranscriptRelocation();
}
//@ chunk-5xgkngpb.js:424402-424460 facade-majority
async function endTranscriptRelocationForTesting() {
  await getProject().endTranscriptRelocation();
}
//@ chunk-5xgkngpb.js:424460-424917 layout
async function supersedeTranscriptFile(transcriptPath) {
  let setAsidePath = `${transcriptPath}.superseded-${Date.now()}`;
  try {
    await rename(transcriptPath, setAsidePath);
  } catch (error) {
    if (isENOENT(error)) return;
    throw error;
  }
  let { isRetentionExemptionDisabled } = require("./cleanup.js");
  if (!isRetentionExemptionDisabled()) {
    let date = new Date();
    await lutimes(setAsidePath, date, date).catch((error) => {
      logForDebugging(
        `relocateSessionTranscript: could not refresh the set-aside's mtime at ${setAsidePath} (it ages from its old clock): ${error}`,
        {
          level: "warn",
        },
      );
    });
  }
  logForDebugging(`relocateSessionTranscript: existing destination set aside at ${setAsidePath}`, {
    level: "warn",
  });
  return setAsidePath;
}
//@ chunk-5xgkngpb.js:424917-425603 layout
async function moveStorageScope(backend, fromScope, toScope) {
  let moveResult = await backend.moveScope(fromScope, toScope);
  if (!moveResult.ok || moveResult.value.published) return moveResult;
  function blockedError() {
    return Object.assign(Error("an occupant blocks the destination scope and could not be set aside"), {
      code: "EEXIST",
    });
  }
  let asideScope =
    toScope.namespace === "transcript" && toScope.sessionId !== undefined
      ? {
          ...toScope,
          sessionId: `${toScope.sessionId}.superseded-${Date.now()}`,
        }
      : undefined;
  if (asideScope === undefined) throw blockedError();
  let asideResult = await backend.moveScope(toScope, asideScope);
  if (!asideResult.ok) throw transcriptMoveFailedError(asideResult.error);
  if (!asideResult.value.published) throw blockedError();
  logForDebugging(`renameWithFallbacks: existing destination scope set aside at ${asideScope.sessionId}`, {
    level: "warn",
  });
  let retryResult = await backend.moveScope(fromScope, toScope);
  if (retryResult.ok && retryResult.value.published) return retryResult;
  await backend.moveScope(asideScope, toScope).catch(() => {
    return;
  });
  if (!retryResult.ok) return retryResult;
  throw blockedError();
}
//@ chunk-5xgkngpb.js:425603-427072 layout
async function moveTranscript(sourcePath, targetPath, storageV5, storageMove) {
  if (isStorageV5Enabled() && storageV5 !== undefined && storageMove !== undefined) {
    let moveResult =
      "fromScope" in storageMove
        ? await moveStorageScope(storageV5, storageMove.fromScope, storageMove.toScope)
        : await storageV5.move(storageMove.from, storageMove.to);
    if (moveResult.ok) return;
    if (moveResult.error.code === "NotFound" || moveResult.error.code === "ScopeNotFound")
      throw Object.assign(Error("nothing to move at the old home"), {
        code: "ENOENT",
      });
    if (moveResult.error.code === "Failed" && moveResult.error.telemetryCode === "SameEntry") return;
    let strandedLeftover =
      "fromScope" in storageMove ? getAsideStrandedLeftover(moveResult.error) : undefined;
    if (strandedLeftover !== undefined) {
      logForDebugging(
        `renameWithFallbacks: a scope move stood with its set-aside leftover stranded; left in place at ${strandedLeftover.leftover ?? "(unnamed)"}`,
        {
          level: "warn",
        },
      );
      if (
        (await lstat(sourcePath).catch(() => {
          return;
        })) !== undefined
      )
        logForDebugging(
          `renameWithFallbacks: the session folder may also remain at ${sourcePath}; left in place`,
          {
            level: "warn",
          },
        );
      return;
    }
    throw transcriptMoveFailedError(moveResult.error);
  }
  async function copyDirectory(fromDir, toDir) {
    await mkdir(toDir, {
      recursive: true,
      mode: 448,
    });
    for (let dirent of await readdir(fromDir, {
      withFileTypes: true,
    }))
      if (dirent.isDirectory()) await copyDirectory(join(fromDir, dirent.name), join(toDir, dirent.name));
      else await copyFile(join(fromDir, dirent.name), join(toDir, dirent.name));
  }
  try {
    await rename(sourcePath, targetPath);
  } catch (error) {
    let errnoCode = getErrnoCode(error);
    if (
      errnoCode === "EEXIST" ||
      errnoCode === "EPERM" ||
      errnoCode === "EBUSY" ||
      errnoCode === "ENOTEMPTY"
    ) {
      let setAsidePath = await supersedeTranscriptFile(targetPath).catch(() => {
        return;
      });
      try {
        await rename(sourcePath, targetPath);
      } catch (error) {
        if (setAsidePath !== undefined) await rename(setAsidePath, targetPath).catch(() => {});
        throw error;
      }
      return;
    }
    if (errnoCode === "EXDEV") {
      try {
        await copyFile(sourcePath, targetPath);
      } catch (error) {
        let errnoCode = getErrnoCode(error);
        if (errnoCode === "EISDIR" || errnoCode === "ENOTSUP" || errnoCode === "EPERM") {
          let setAsidePath = await supersedeTranscriptFile(targetPath);
          try {
            await copyDirectory(sourcePath, targetPath);
          } catch (error) {
            if (setAsidePath !== undefined) {
              await rm(targetPath, {
                recursive: true,
                force: true,
              }).catch(() => {});
              await rename(setAsidePath, targetPath).catch(() => {});
            }
            throw error;
          }
        } else throw error;
      }
      await rm(sourcePath, {
        recursive: true,
        force: true,
      });
      return;
    }
    throw error;
  }
}
//@ chunk-5xgkngpb.js:427072-427111 facade-majority (2.1.88 match: flushSessionStorage, 1)
/**
 * 等待会话存储所有排队写入落盘。
 */
async function flushSessionStorage() {
  await getProject().flush();
}
//@ chunk-5xgkngpb.js:427111-427166 facade-majority
async function inTranscriptCallOrder(callback) {
  return await getProject().inCallOrder(callback);
}
//@ chunk-5xgkngpb.js:427166-427294 facade-majority
function appendEntryToCurrentTranscriptNow(entry, transcriptPath, tornTailEntry) {
  let project = getProject();
  let resolvedPath = transcriptPath ?? project.sessionFilePath;
  if (!resolvedPath || isTranscriptPersistenceDisabled()) return;
  try {
    project.sealTornTailSync(resolvedPath);
    appendEntrySync(resolvedPath, entry, tornTailEntry);
  } catch (error) {
    reportStopNowAppendFailure(error, resolvedPath);
  }
}
//@ chunk-5xgkngpb.js:427294-427446 layout
function reportStopNowAppendFailure(error, transcriptPath) {
  if (isSyscallError(error))
    logForDebugging(
      `Stop-gesture transcript append failed (${getErrnoCode(error)}): ${errorMessage(error)}`,
      {
        level: "error",
      },
    );
  else logError(error);
  reportTranscriptWriteFailure(currentTranscriptStore().writerHealth, "stop_now", error, transcriptPath);
}
//@ chunk-5xgkngpb.js:427446-427504 facade-majority
function sealTornTranscriptTail(transcriptPath) {
  getProject().sealTornTailOnNextAppend(transcriptPath ?? getTranscriptPathForSession(getSessionId()));
}
//@ chunk-5xgkngpb.js:427504-427609 layout
function isConversationEntry(entry) {
  if (typeof entry !== "object" || entry === null) return false;
  let messageType = entry.type;
  return messageType === "user" || messageType === "assistant";
}
//@ chunk-5xgkngpb.js:427609-427815 layout
async function openRegularFile(path) {
  if (isDiskless()) return null;
  let fileHandle = await open(path, constants.O_RDONLY | O_NONBLOCK_2);
  try {
    if ((await fileHandle.stat()).isFile()) return fileHandle;
  } catch (error) {
    await fileHandle.close().catch(() => {});
    throw error;
  }
  await fileHandle.close().catch(() => {});
  return null;
}
//@ chunk-5xgkngpb.js:427815-427905 facade-majority
async function transcriptFileHasContentEntry(transcriptPath, backend) {
  if (isStorageV5Enabled() && backend !== undefined)
    return storedTranscriptHasContent(transcriptPath, backend);
  return someLineMatches(transcriptPath, isConversationLine).catch(() => false);
}
//@ chunk-5xgkngpb.js:427905-428296 layout
/**
 * 逐块读取文件并按行调用判断函数，任一行命中即返回 true。
 */
async function someLineMatches(path, matcher) {
  let fileHandle = null;
  try {
    fileHandle = await openRegularFile(path);
    if (fileHandle === null) throw Error("not a regular file");
    let chunkBuffer = Buffer.allocUnsafe(65536);
    let decoder = new StringDecoder("utf8");
    let pendingText = "";
    for (;;) {
      let { bytesRead } = await fileHandle.read(chunkBuffer, 0, 65536, null);
      if (bytesRead <= 0) break;
      let lines = decoder.write(chunkBuffer.subarray(0, bytesRead)).split(`
`);
      lines[0] = pendingText + (lines[0] ?? "");
      pendingText = lines.pop() ?? "";
      for (let line of lines) if (matcher(line)) return true;
    }
    return matcher(pendingText + decoder.end());
  } finally {
    if (fileHandle)
      try {
        await fileHandle.close();
      } catch {}
  }
}
//@ chunk-5xgkngpb.js:428296-428310 layout
var MAX_TRANSCRIPT_HEAD_SCAN_BYTES = 65536;
//@ chunk-5xgkngpb.js:428310-428954 layout
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
      (buffer) => isConversationLine(buffer.toString("utf8")),
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
//@ chunk-5xgkngpb.js:428954-429331 layout (2.1.88 match: readJSONLFile, 0.869)
async function readJSONLFile(path, bytesRead) {
  let fileHandle = null;
  try {
    fileHandle = await openRegularFile(path);
    if (fileHandle === null) return false;
    let buf = Buffer.allocUnsafe(65536);
    let decoder = new StringDecoder("utf8");
    let pendingText = "";
    let position = bytesRead;
    for (;;) {
      let { bytesRead } = await fileHandle.read(buf, 0, 65536, position);
      if (bytesRead <= 0) break;
      position += bytesRead;
      let lines = (pendingText + decoder.write(buf.subarray(0, bytesRead))).split(`
`);
      pendingText = lines.pop() ?? "";
      for (let line of lines) if (isConversationLine(line)) return true;
    }
    return isConversationLine(pendingText + decoder.end());
  } catch {
    return false;
  } finally {
    if (fileHandle)
      try {
        await fileHandle.close();
      } catch {}
  }
}
//@ chunk-5xgkngpb.js:429331-429526 layout
function isConversationLine(line) {
  if (
    !line.includes('"type":"user"') &&
    !line.includes('"type": "user"') &&
    !line.includes('"type":"assistant"') &&
    !line.includes('"type": "assistant"')
  )
    return false;
  try {
    return isConversationEntry(jsonParseRaw(line));
  } catch {
    return false;
  }
}
//@ chunk-5xgkngpb.js:429526-429628 facade-majority
function withoutFetchedCodeModeRecords(records) {
  let kept = records;
  kept = kept.filter(
    (record) => typeof record !== "object" || record === null || record.type !== "repl-mode",
  );
  return kept;
}
//@ chunk-5xgkngpb.js:429628-430253 facade-majority (2.1.88 match: hydrateRemoteSession, 0.588)
/**
 * 远程会话（CCR）恢复：从服务器拉取会话条目写回本地转录。
 */
async function hydrateRemoteSession(sessionId, ingressUrl, storage) {
  switchSession(identityAgentId(sessionId), "hydrate");
  let project = getProject();
  try {
    let remoteLogs = (await getSessionLogs(sessionId, ingressUrl)) || [];
    let projectDir = resolveProjectDir();
    await ensureTranscriptDir(projectDir, storage);
    let projectDir_2 = getTranscriptPathForSession(sessionId);
    if (
      !remoteLogs.some(isConversationEntry) &&
      (await transcriptFileHasContentEntry(projectDir_2, storage))
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
      getHydratedTranscriptTarget(projectDir_2, storage),
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
//@ chunk-5xgkngpb.js:430253-430627 layout
async function readHydrateTail(transcriptPath, maxBytes, storageV5) {
  let storageTail =
    isStorageV5Enabled() && storageV5 !== undefined
      ? await readHydrateTailViaStorage(transcriptPath, maxBytes, storageV5).catch((error) => {
          logForDebugging(
            `hydrate tail: backend tail read threw, using the raw tail: ${errorMessage(error)}`,
            {
              level: "warn",
            },
          );
          return;
        })
      : undefined;
  if (storageTail !== undefined) return storageTail;
  let progressFile = worktreeFromProgress(transcriptPath);
  if (progressFile === undefined) return null;
  let tail = await tailFile(progressFile, maxBytes).catch(() => null);
  return (
    tail && {
      content: tail.content,
      bytesTotal: tail.bytesTotal,
      endsOnLineBoundary: tail.content.endsWith(`
`),
    }
  );
}
//@ chunk-5xgkngpb.js:430627-431252 layout
async function readHydrateTailViaStorage(path, tailBytes, storage) {
  let key = transcriptKeyFor(path);
  if (key === undefined) return;
  let [transcriptTailV5, statResult] = await Promise.all([
    readTranscriptTailV5(key, tailBytes, storage),
    storage.stat(key),
  ]);
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
  if (!statResult.ok) {
    if (transcriptTailV5.totalBytes === undefined)
      return {
        content: transcriptTailV5.content,
        bytesTotal: transcriptTailV5.byteLength,
        endsOnLineBoundary: transcriptTailV5.content.endsWith(`
`),
      };
    logForDebugging(`hydrate tail: backend stat failed (${statResult.error.code}), using the raw tail`, {
      level: "warn",
    });
    return;
  }
  let tornTailBytes = statResult.value.tornTailBytes ?? 0;
  return {
    content: transcriptTailV5.content,
    bytesTotal: (transcriptTailV5.totalBytes ?? statResult.value.size) + tornTailBytes,
    endsOnLineBoundary:
      tornTailBytes === 0 &&
      transcriptTailV5.content.endsWith(`
`),
  };
}
//@ chunk-5xgkngpb.js:431252-431453 layout
async function ensureTranscriptDir(dir, storage) {
  if (isStorageV5Enabled() && storage !== undefined) {
    let scope = transcriptScopeForDir(dir);
    if (scope !== undefined) {
      let scopeResult = await storage.ensureScope(scope);
      if (!scopeResult.ok) throw transcriptMkdirFailedError(scopeResult.error);
      return;
    }
  }
  assertDiskWritable("hydrated_transcript", dir);
  await mkdir(dir, {
    recursive: true,
    mode: 448,
  });
}
//@ chunk-5xgkngpb.js:431453-431553 layout
function getStorageTargetForPath(path, storage) {
  if (!isStorageV5Enabled() || storage === undefined) return;
  let key = transcriptStorageKeyForPath(path);
  return key === undefined
    ? undefined
    : {
        backend: storage,
        key,
      };
}
//@ chunk-5xgkngpb.js:431553-431592 facade-majority
function getSessionSidecarDir(sessionId) {
  return join(dirname(getTranscriptPathForSession(sessionId)), sessionId);
}
//@ chunk-5xgkngpb.js:431592-431633 facade-majority
function locateSidecarFile(sessionId, parts) {
  return join(getSessionSidecarDir(sessionId), ...parts);
}
//@ chunk-5xgkngpb.js:431633-431764 facade-majority
async function ensureSidecarDirFor(filePath) {
  if (isDiskless()) throw Error("A diskless session writes no side file to disk");
  await mkdir(dirname(filePath), {
    recursive: true,
    mode: 448,
  });
}
//@ chunk-5xgkngpb.js:431764-431813 layout
function getCcrTipPath(sessionId) {
  return join(getSessionSidecarDir(sessionId), "ccr-tip.json");
}
//@ chunk-5xgkngpb.js:431813-431859 layout
function getLegacyCcrTipPath(sessionId) {
  return getSessionSidecarDir(sessionId) + ".ccr-tip.json";
}
//@ chunk-5xgkngpb.js:431859-431970 facade-majority
async function readCCRTip(sessionId, storage) {
  for (let path of [getCcrTipPath(sessionId), getLegacyCcrTipPath(sessionId)]) {
    let remoteAgentMetadata = await readRemoteAgentMetadata(path, storage);
    if (remoteAgentMetadata !== "absent") return remoteAgentMetadata;
  }
  return null;
}
//@ chunk-5xgkngpb.js:431970-432429 file-local
async function readRemoteAgentMetadata(path, storage) {
  let key = storage !== undefined ? pathToSessionSideKey(path) : undefined;
  let text;
  if (isStorageV5Enabled() && storage !== undefined && key !== undefined)
    try {
      let text_2 = await storage.readText([key]);
      if (!text_2.ok) return null;
      let item = text_2.value.items[0];
      if (!item.found) return "absent";
      text = item.value;
    } catch {
      return null;
    }
  else {
    let path_2 = worktreeFromProgress(path);
    if (path_2 === undefined) return "absent";
    try {
      text = await readFile(path_2, "utf-8");
    } catch (error) {
      return isENOENT(error) ? "absent" : null;
    }
  }
  try {
    let parsed = jsonParse(text);
    if (
      typeof parsed === "object" &&
      parsed !== null &&
      "eventId" in parsed &&
      typeof parsed.eventId === "string"
    )
      return parsed;
    return null;
  } catch {
    return null;
  }
}
//@ chunk-5xgkngpb.js:432429-433055 layout
/**
 * 远程水合时查找未解决的 tool_use：收集本会话及来源会话在各项目目录下的 ccr-tip 记录，结合已解决事件找到未完成的工具调用，并定位其所在目录与会话。
 */
async function findUnresolvedToolUseTip(sessionId, folder, events, resolvedIds, includeAll, storage) {
  let sessionIds = new Set([sessionId]);
  for (let { payload } of events) {
    let sessionId = normalizeUuidOrNull(payload.sessionId);
    if (sessionId !== null) sessionIds.add(sessionId);
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
  let unresolved = unresolvedTailAfterTip(events, resolvedEventIds, includeAll);
  if (unresolved === undefined) return;
  let anchor = events.at(-unresolved.rows - 1);
  let mapped = tips
    .filter((tip) => [anchor?.event_id, anchor?.payload.uuid].includes(tip.eventId))
    .map((tip) => tip.place);
  let found = mapped.find((place) => place.folder === folder && place.sessionId === sessionId);
  return {
    ...unresolved,
    tipAt: found ?? mapped[0],
  };
}
//@ chunk-5xgkngpb.js:433055-433420 layout
async function writeCcrTip(sessionId, eventId, storage) {
  let tip = {
    eventId,
    updatedAt: new Date().toISOString(),
  };
  try {
    let filePath = getCcrTipPath(sessionId);
    let key = storage !== undefined ? pathToSessionSideKey(filePath) : undefined;
    if (isStorageV5Enabled() && storage !== undefined && key !== undefined) {
      let writeResult = await storage.write(key, jsonStringify(tip), {
        mode: 384,
      });
      if (!writeResult.ok)
        logForDebugging(`Failed to write CCR tip sidecar: ${formatStorageError(writeResult.error)}`);
      return;
    }
    assertDiskWritable("ccr_tip", filePath);
    await ensureSidecarDirFor(filePath);
    await writeFileAtomic_2(filePath, jsonStringify(tip), 384);
  } catch (error) {
    logForDebugging(`Failed to write CCR tip sidecar: ${error}`);
  }
}
//@ chunk-5xgkngpb.js:433420-433581 facade-majority
async function updateCCRTipFromAckedBatch(batch, storage) {
  for (let idx = batch.length - 1; idx >= 0; idx--) {
    let item = batch[idx];
    if (!item || item.session_agent_id) continue;
    if (isSyncedTranscriptEntry(item.payload)) {
      await writeCcrTip(getSessionId(), item.payload.uuid, storage);
      return;
    }
  }
}
//@ chunk-5xgkngpb.js:433581-433728 facade-majority
function collectTailUuids(content) {
  let uuids = new Set();
  for (let entry of parseJSONL(content)) {
    if (typeof entry !== "object" || entry === null) continue;
    let uuid = entry.uuid;
    if (typeof uuid === "string") uuids.add(uuid);
  }
  return uuids;
}
//@ chunk-5xgkngpb.js:433728-433990 facade-majority
async function getValidatedCCRTip(sessionId, tail, storage) {
  let [ccrTip, tailSnapshot] = await Promise.all([
    readCCRTip(sessionId, storage),
    tail !== undefined ? tail : readTranscriptTailForTip(sessionId, storage),
  ]);
  if (!ccrTip)
    return {
      fallbackReason: "no-sidecar",
    };
  if (!tailSnapshot || !collectTailUuids(tailSnapshot.content).has(ccrTip.eventId))
    return {
      fallbackReason: "tip-not-in-tail",
    };
  let tip = {
    eventId: ccrTip.eventId,
  };
  rememberValidatedTip(tip, ccrTip.updatedAt);
  return tip;
}
//@ chunk-5xgkngpb.js:433990-434179 facade-majority
async function readTranscriptTailForTip(sessionId, storage) {
  let transcriptPathForSession = getTranscriptPathForSession(sessionId);
  if (isStorageV5Enabled() && storage !== undefined) {
    let tail = await readTranscriptTailViaStorage(transcriptPathForSession, 65536, storage).catch(() => {
      return;
    });
    if (tail !== undefined) return tail;
  }
  let path = worktreeFromProgress(transcriptPathForSession);
  return path === undefined ? null : tailFile(path, 65536).catch(() => null);
}
//@ chunk-5xgkngpb.js:434179-434231 facade-majority
function extractLastSyncedEventUuid(content) {
  for (let uuid of iterateUuidsBackward(content)) return uuid;
  return;
}
//@ chunk-5xgkngpb.js:434231-434380 layout
function* iterateUuidsBackward(content) {
  let lines = content.split(`
`);
  for (let idx = lines.length - 1; idx >= 0; idx--) {
    let line = lines[idx];
    if (!line) continue;
    let parsed;
    try {
      parsed = jsonParseRaw(line);
    } catch {
      continue;
    }
    if (isSyncedTranscriptEntry(parsed)) yield parsed.uuid;
  }
}
//@ chunk-5xgkngpb.js:434380-434476 facade-majority
function extractLatestIntersectingSyncedUuid(sessionId, known) {
  let walkback = 0;
  for (let uuid of iterateUuidsBackward(sessionId)) {
    if (known.has(uuid))
      return {
        uuid,
        walkback,
      };
    walkback++;
  }
  return;
}
//@ chunk-5xgkngpb.js:434476-434825 facade-majority
async function restoreAgentSidecarFromStream(agentId, entry, storage) {
  try {
    let metadata = validateAgentMetadata(entry);
    if (metadata === undefined) {
      logFeatureSad("subagent_sidecar_from_stream", "entry_refused");
      return "refused";
    }
    await writeAgentMetadata(agentId, metadata, storage, true);
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
//@ chunk-5xgkngpb.js:434825-435904 facade-majority
async function writeHydratedAgentTranscript(agentId, entries, storage, options) {
  let filtered = entries.filter((entry) => entry.type !== "agent_metadata");
  let entry = entries.findLast((entry) => entry.type === "agent_metadata");
  if (!isSafeIdSegment(agentId)) {
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
  if (entry !== undefined && getProject().keepsAgentMetadataInStream())
    await restoreAgentSidecarFromStream(identityAgentId2(agentId), entry, storage);
  let agentTranscriptPath = getAgentTranscriptPath(identityAgentId2(agentId));
  try {
    let hydratedTranscriptTarget = getHydratedTranscriptTarget(agentTranscriptPath, storage);
    await ensureTranscriptDir(dirname(agentTranscriptPath), storage);
    if (options?.createOnly) {
      if (hydratedTranscriptTarget) return "exists";
      let tempPath = await writeIfMissing(agentTranscriptPath, jsonlJoin(filtered), 384);
      try {
        await assertPathSafeAsync(agentTranscriptPath);
        await link(tempPath, agentTranscriptPath).catch(async (error) => {
          let errnoCode = getErrnoCode(error);
          if (errnoCode !== "EPERM" && errnoCode !== "ENOSYS" && errnoCode !== "EOPNOTSUPP") throw error;
          await writeNewFile(agentTranscriptPath, jsonlJoin(filtered), 384);
        });
      } catch (error) {
        if (getErrnoCode(error) === "EEXIST") return "exists";
        throw error;
      } finally {
        await unlink(tempPath).catch(() => {});
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
//@ chunk-5xgkngpb.js:435904-435961 facade-majority
function canFetchAgentTranscriptsOnDemand() {
  return getProject().hasInternalAgentEventReader();
}
//@ chunk-5xgkngpb.js:435961-436145 facade-majority
class AgentTranscriptFetchError extends Error {
  outcome;
  constructor(outcome = "read_fail", options) {
    super("could not load this agent's earlier transcript; try again", options);
    this.outcome = outcome;
    this.name = "AgentTranscriptFetchError";
  }
}
//@ chunk-5xgkngpb.js:436145-436234 layout
function slimToolResultsIfConfigured(entries, storage) {
  return currentTranscriptStore().toolResultCopiesOnDisk === "slim" && storage === undefined
    ? entries.map(createToolResultSlimmer_2())
    : entries;
}
//@ chunk-5xgkngpb.js:436234-441455 facade-majority (2.1.88 match: hydrateFromCCRv2InternalEvents, 0.341)
/**
 * 从 CCR v2 内部事件流重建本地转录（主会话与子代理）。
 */
async function hydrateFromCCRv2InternalEvents(
  sessionId,
  prefetched,
  skipSubagents = false,
  storage,
  onDiskBehind,
  verifyLocally = false,
) {
  let startMs = Date.now();
  switchSession(identityAgentId(sessionId), "hydrate");
  let project = getProject();
  let isThinClient = verifyLocally && storage === undefined;
  project.setVerifiesAgentTranscripts(isThinClient);
  let reader = project.getInternalEventReader();
  if (!reader) {
    logForDebugging("No internal event reader registered for CCR v2 resume");
    return "no_reader";
  }
  let outcome;
  let reading = false;
  try {
    let transcriptPath = getTranscriptPathForSession(sessionId);
    let tail = readHydrateTail(transcriptPath, 65536, storage);
    let eventsResult;
    let anchor;
    let fallbackReason;
    let tipAge;
    if (prefetched) {
      eventsResult = prefetched[0];
      anchor = prefetched[2]?.eventId;
      tipAge = validatedTipOf(prefetched[2]);
      fallbackReason = prefetched[2]?.fallbackReason;
    } else {
      let validatedCCRTip = await getValidatedCCRTip(sessionId, await tail, storage);
      anchor = validatedCCRTip.eventId;
      tipAge = validatedTipOf(validatedCCRTip);
      fallbackReason = validatedCCRTip.fallbackReason;
      let startTime = performance.now();
      reading = true;
      eventsResult = await reader(anchor);
      reading = false;
      recordPhase("resume_hydrate_fetch_ms", performance.now() - startTime, startTime);
    }
    if (!eventsResult) {
      logForDebugging("Failed to read internal events for resume");
      rememberHydrateNote(project, sessionId, {
        outcome: "read_fail",
      });
      logForDiagnosticsNoPII("error", "hydrate_ccr_v2_read_fail");
      return "read_failed";
    }
    let { events, stats } = eventsResult;
    let projectDir = resolveProjectDir();
    await ensureTranscriptDir(projectDir, storage);
    let tail_2 = await tail;
    let bytesTotal = tail_2?.bytesTotal ?? 0;
    let onDiskLastUuid;
    let anchorMatch;
    let anchorIndex;
    if (tail_2) {
      onDiskLastUuid = extractLastSyncedEventUuid(tail_2.content);
      if (anchor === undefined) {
        let uuidIndex = new Map();
        for (let idx = 0; idx < events.length; idx++) {
          let uuid = events[idx]?.payload.uuid;
          if (typeof uuid === "string") uuidIndex.set(uuid, idx);
        }
        anchorMatch = extractLatestIntersectingSyncedUuid(tail_2.content, uuidIndex);
        anchorIndex = anchorMatch === undefined ? undefined : uuidIndex.get(anchorMatch.uuid);
      }
    }
    let deltaEvents = anchorIndex === undefined ? events.length : events.length - 1 - anchorIndex;
    markResumeHydrateDelta(
      bytesTotal,
      stats?.bytesReceived ?? null,
      events.length,
      deltaEvents,
      anchor !== undefined,
      anchorMatch?.walkback,
    );
    let deltaApplied = false;
    let appended = 0;
    let anchorFallback = eventsResult.anchorFallback !== undefined;
    let anchorFound =
      anchor !== undefined &&
      !anchorFallback &&
      events.some((event) =>
        event.event_id !== undefined ? event.event_id === anchor : event.payload.uuid === anchor,
      );
    let tailUuids = anchor !== undefined && tail_2 ? collectTailUuids(tail_2.content) : null;
    let endsOnLineBoundary =
      anchor !== undefined &&
      tail_2 !== null &&
      tailUuids !== null &&
      tailUuids.has(anchor) &&
      tail_2.endsOnLineBoundary;
    let finalEvents = events;
    if (anchor && !anchorFallback && !anchorFound) {
      if (!endsOnLineBoundary) {
        fallbackReason = "tail-incoherent";
        reading = true;
        let events = await reader();
        reading = false;
        if (!events) {
          logForDebugging("Failed to refetch full read after incoherent local tail");
          rememberHydrateNote(project, sessionId, {
            outcome: "read_fail",
          });
          logForDiagnosticsNoPII("error", "hydrate_ccr_v2_read_fail");
          return "read_failed";
        }
        finalEvents = events.events;
      }
    }
    let context = await transcriptContextFields();
    let wrote = false;
    if (anchor && !anchorFallback && !anchorFound && endsOnLineBoundary) {
      let filled = slimToolResultsIfConfigured(
        events.map((event) => fillMissingTranscriptFields(event.payload, context)),
        storage,
      );
      let entries = withoutFetchedCodeModeRecords(filled).filter((record) => {
        let uuid = record.uuid;
        return typeof uuid !== "string" || !tailUuids.has(uuid);
      });
      if (entries.length > 0)
        await appendEntriesToJsonlFile(
          transcriptPath,
          entries,
          getHydratedTranscriptTarget(transcriptPath, storage),
        );
      deltaApplied = true;
      appended = entries.length;
      wrote = true;
      if (currentTranscriptStore().localGcEnabled) {
        let addedBytes = 0;
        for (let record of entries) addedBytes += Buffer.byteLength(toJsonLine(record), "utf8");
        if (bytesTotal + addedBytes > ENTRY_APPEND_POLICY_2)
          getProject().requestCompact(transcriptPath, storage);
      }
      logForDebugging(
        `Hydrated delta: appended ${entries.length}/${events.length} foreground entries from CCR v2 internal events`,
      );
    } else {
      if (anchor && fallbackReason !== "tail-incoherent")
        fallbackReason =
          eventsResult.anchorFallback === "rejected"
            ? "anchor-rejected"
            : eventsResult.anchorFallback === "not-found"
              ? "anchor-not-found"
              : "anchor-in-response";
      if (
        !finalEvents.some((event) => isConversationEntry(event.payload)) &&
        (await transcriptFileHasContentEntry(transcriptPath, storage))
      ) {
        logForDebugging(
          `Skipping CCR v2 foreground hydration: fetched set of ${finalEvents.length} events has no content-bearing entries but the local transcript does`,
        );
        logForDiagnosticsNoPII("info", "hydrate_skip_zero_content_replace", {
          path: "v2_foreground",
          server_entry_count: finalEvents.length,
        });
      } else {
        let filled = slimToolResultsIfConfigured(
          finalEvents.map((event) => fillMissingTranscriptFields(event.payload, context)),
          storage,
        );
        await writeEntriesToJsonlFile(
          transcriptPath,
          withoutFetchedCodeModeRecords(filled),
          getHydratedTranscriptTarget(transcriptPath, storage),
        );
        wrote = true;
        logForDebugging(`Hydrated ${finalEvents.length} foreground entries from CCR v2 internal events`);
      }
    }
    let events_2 = deltaApplied ? events : finalEvents;
    outcome = events_2.length > 0 ? "rows" : "no_rows";
    let remoteManaged = isRemoteManagedEnvironment();
    let projectDir_2 = basename(dirname(transcriptPath));
    let behind =
      (deltaApplied ? appended : deltaEvents) > 0 && remoteManaged
        ? await findUnresolvedToolUseTip(
            sessionId,
            projectDir_2,
            events_2,
            tailUuids ?? (anchorMatch === undefined ? [] : [anchorMatch.uuid]),
            deltaApplied,
            storage,
          ).catch((error) => {
            logError(error);
            return;
          })
        : undefined;
    if (behind !== undefined && behind.toolCalls > 0) onDiskBehind?.(behind);
    if (wrote)
      for (let idx = events_2.length - 1; idx >= 0; idx--) {
        let event = events_2[idx];
        if (event && isSyncedTranscriptEntry(event.payload)) {
          await writeCcrTip(sessionId, event.event_id ?? event.payload.uuid, storage);
          break;
        }
      }
    let subagentEventCount = 0;
    let subagentStats;
    let subagentRead = "none";
    let subagentMode = !(!prefetched || prefetched[1] === undefined)
      ? "eager"
      : project.hasInternalAgentEventReader() && (deltaApplied || tail_2 === null || isThinClient)
        ? "lazy"
        : skipSubagents && deltaApplied
          ? "skipped_delta"
          : "eager";
    let subagentReader = project.getInternalSubagentEventReader();
    if (subagentReader && subagentMode === "eager") {
      let subagentResult = prefetched && prefetched[1] !== undefined ? prefetched[1] : await subagentReader();
      subagentStats = subagentResult?.stats;
      subagentRead = prefetched && prefetched[1] !== undefined ? "prefetched" : "inline";
      let ok = subagentResult !== null;
      let events = subagentResult?.events;
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
          list.push(fillMissingTranscriptFields(event.payload, context));
        }
        for (let [agentId, entries] of byAgent)
          await writeHydratedAgentTranscript(agentId, entries, storage).catch(() => {
            ok = false;
          });
        logForDebugging(`Hydrated ${events.length} subagent entries across ${byAgent.size} agents`);
      }
      if (ok) project.setInternalAgentEventReader(null);
    }
    let timestamp = Date.parse(tipAge ?? "");
    let tipAgeSeconds = Number.isFinite(timestamp) ? Math.round((startMs - timestamp) / 1000) : undefined;
    rememberHydrateNote(project, sessionId, {
      outcome: "ok",
      deltaApplied,
      deltaEvents,
      deltaAppended: appended,
      fallbackReason,
      wroteFile: wrote,
      onDiskBytes: bytesTotal,
      tipAgeSeconds,
    });
    logForDiagnosticsNoPII("info", "hydrate_ccr_v2_completed", {
      duration_ms: Date.now() - startMs,
      event_count: events_2.length,
      subagent_event_count: subagentEventCount,
      page_count: stats?.pageCount,
      bytes_received: stats?.bytesReceived,
      content_encoding: stats?.contentEncoding,
      subagent_page_count: subagentStats?.pageCount,
      subagent_read: subagentRead,
      subagent_bytes_received: subagentStats?.bytesReceived,
      prefetched: prefetched?.[0] != null,
      on_disk_bytes: bytesTotal,
      project_folder_hash: remoteManaged ? shortHash(projectDir_2) : undefined,
      local_session_id_hash: remoteManaged ? shortHash(sessionId) : undefined,
      behind_tip_folder_hash: behind?.tipAt && shortHash(behind.tipAt.folder),
      behind_tip_session_id_hash: behind?.tipAt && shortHash(behind.tipAt.sessionId),
      delta_events: deltaEvents,
      delta_fetch_attempted: anchor !== undefined,
      delta_fetch_applied: deltaApplied,
      delta_appended: appended,
      behind_rows: behind?.rows,
      behind_tool_calls: behind?.toolCalls,
      tip_age_s: tipAgeSeconds,
      subagent_skipped_local_reuse: subagentMode === "skipped_delta",
      subagent_hydrate: subagentMode,
      ...(fallbackReason && {
        delta_fallback_reason: fallbackReason,
      }),
      delta_anchor: anchorMatch !== undefined && anchorMatch.walkback > 0 ? "intersected" : "synced",
      on_disk_last_uuid: onDiskLastUuid,
      anchor_uuid: anchorMatch?.uuid,
      anchor_walkback: anchorMatch?.walkback,
      ccr_last_uuid: events_2.at(-1)?.payload.uuid,
    });
    return outcome;
  } catch (error) {
    if (error instanceof Error && error.message === "CCRClient: Epoch mismatch (409)") throw error;
    logForDebugging(`Error hydrating session from CCR v2: ${error}`);
    rememberHydrateNote(project, sessionId, {
      outcome: "threw",
    });
    logForDiagnosticsNoPII("error", "hydrate_ccr_v2_fail", {
      settled: outcome !== undefined,
      errno: sanitizedErrnoLowerForTelemetry(error),
    });
    return outcome ?? (reading ? "read_failed" : "apply_failed");
  }
}
//@ chunk-5xgkngpb.js:441455-441584 layout
function getFirstPromptInfo(transcript) {
  let firstPromptPreview = getFirstPromptPreview(transcript, "stored");
  let shownPreview =
    firstPromptPreview === extractFirstPrompt
      ? firstPromptPreview
      : getFirstPromptPreview(transcript, "shown");
  return shownPreview === firstPromptPreview
    ? {
        firstPrompt: firstPromptPreview,
      }
    : {
        firstPrompt: firstPromptPreview,
        firstPromptShown: shownPreview,
      };
}
//@ chunk-5xgkngpb.js:441584-441604 fingerprint (2.1.88 match: extractFirstPrompt, 1)
var extractFirstPrompt = "No prompt";
//@ chunk-5xgkngpb.js:441604-441741 layout
function getFirstPromptPreview(transcript, mode) {
  let textContent = getFirstMeaningfulUserMessageTextContent(transcript, mode);
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
//@ chunk-5xgkngpb.js:441741-442447 facade-majority (2.1.88 match: getFirstMeaningfulUserMessageTextContent, 0.674)
/**
 * 取第一条有意义的用户文本（跳过 meta、压缩摘要、命令输出），用于会话列表首条提示。
 */
function getFirstMeaningfulUserMessageTextContent(transcript, mode = "stored") {
  for (let msg of transcript) {
    if (msg.type !== "user" || msg.isMeta) continue;
    if ("isCompactSummary" in msg && msg.isCompactSummary) continue;
    let content = msg.message?.content;
    if (!content) continue;
    let contentForShown =
      mode === "shown" && typeof content === "string"
        ? renderPluginPromptColon(content, msg.pluginPrompt)
        : content;
    let rendered = contentForShown !== content;
    let texts = [];
    if (typeof contentForShown === "string") texts.push(contentForShown);
    else if (Array.isArray(content)) {
      for (let block of content) if (block.type === "text" && block.text) texts.push(block.text);
    }
    for (let textContent of texts) {
      if (!textContent) continue;
      let textContent_2 = flattenPastedBlocks(textContent);
      let commandNameTag = rendered ? null : extractTag(textContent_2, COMMAND_NAME);
      if (commandNameTag) {
        let commandName = commandNameTag.replace(/^\//, "");
        if (require("../commands.js").builtInCommandNames().has(commandName)) continue;
        else {
          let commandArgs = extractTag(textContent_2, "command-args")?.trim();
          if (!commandArgs) continue;
          return `${commandNameTag} ${commandArgs}`;
        }
      }
      let bashInput = rendered ? null : extractTag(textContent_2, "bash-input");
      if (bashInput) return `! ${bashInput}`;
      if (SYNTHETIC_USER_TEXT_PATTERN.test(textContent_2)) continue;
      return textContent_2;
    }
  }
  return;
}
//@ chunk-5xgkngpb.js:442447-442548 facade-majority (2.1.88 match: removeExtraFields, 0.785)
function removeExtraFields(transcript) {
  return transcript.map((m) => {
    let { isSidechain, parentUuid, promptId, ...serializedMessage } = m;
    return withoutTaskProducerMark(serializedMessage);
  });
}
//@ chunk-5xgkngpb.js:442548-442915 facade-majority (2.1.88 match: buildTranscriptEntries, 0.77)
function withoutTaskProducerMark(message) {
  if (message.type === "attachment" && message.attachment?.type === "queued_command") {
    let origin = stripTaskProducer(message.attachment.origin);
    return origin === message.attachment.origin
      ? message
      : {
          ...message,
          attachment: {
            ...message.attachment,
            origin,
            [restoredTaskMarkSymbol]: true,
          },
        };
  }
  if (message.type !== "user") return message;
  let origin = stripTaskProducer(message.origin);
  let queueOrigin = stripTaskProducer(message.queueOrigin);
  return origin === message.origin && queueOrigin === message.queueOrigin
    ? message
    : {
        ...message,
        origin,
        queueOrigin,
        ...(origin !== message.origin && {
          [restoredTaskMarkSymbol]: true,
        }),
      };
}
//@ chunk-5xgkngpb.js:442915-443167 facade-majority (2.1.88 match: buildTranscriptEntries, 0.902)
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
//@ chunk-5xgkngpb.js:443167-443253 layout
function markSessionTaskProducer(origin) {
  return origin?.kind === "task-notification"
    ? {
        ...origin,
        producer: "session-task",
      }
    : origin;
}
//@ chunk-5xgkngpb.js:443253-443364 layout
function stripTaskProducer(origin) {
  if (origin?.kind !== "task-notification" || origin.producer === undefined) return origin;
  let { producer, ...rest } = origin;
  return rest;
}
//@ chunk-5xgkngpb.js:443364-444673 layout
/**
 * 加载转录时应用压缩保留段：最后一个压缩边界带保留信息时，重新链接保留消息到锚点后、清零其用量，删除边界前其他消息并把孤立子节点接到保留段末尾，返回末条保留消息 uuid。
 */
function applyPreservedSegmentOnLoad(messages) {
  let preservedMeta;
  let preservedIndex = -1;
  let lastBoundaryIndex = -1;
  let indexByUuid = new Map();
  let position = 0;
  for (let message of messages.values()) {
    indexByUuid.set(message.uuid, position);
    if (isCompactBoundaryMessage_3(message)) {
      lastBoundaryIndex = position;
      let compactMetadata = message.compactMetadata;
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
      present: countWhere(preserved.uuids, (uuid) => messages.has(uuid)),
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
      let entry = messages.get(preservedUuid);
      messages.set(preservedUuid, {
        ...entry,
        parentUuid: parentUuid_2,
      });
      parentUuid_2 = preservedUuid;
    }
    for (let [uuid, entry] of messages)
      if (entry.parentUuid === preserved.anchorUuid && uuid !== preservedUuids[0])
        messages.set(uuid, {
          ...entry,
          parentUuid,
        });
    for (let preservedUuid of preservedUuids) {
      let entry = messages.get(preservedUuid);
      if (entry?.type !== "assistant") continue;
      messages.set(preservedUuid, {
        ...entry,
        message: {
          ...entry.message,
          usage: {
            ...entry.message.usage,
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
  for (let [uuid] of messages) {
    let position = indexByUuid.get(uuid);
    if (position !== undefined && position < lastBoundaryIndex && !preservedSet.has(uuid)) removed.push(uuid);
  }
  for (let uuid of removed) messages.delete(uuid);
  if (preserved && removed.length > 0) {
    let parentUuid = preservedUuids.at(-1);
    let removedSet = new Set(removed);
    for (let [uuid, entry] of messages)
      if (
        (entry.type === "user" || entry.type === "assistant") &&
        entry.parentUuid !== null &&
        removedSet.has(entry.parentUuid)
      )
        messages.set(uuid, {
          ...entry,
          parentUuid,
        });
  }
  return preservedUuids.at(-1);
}
//@ chunk-5xgkngpb.js:444673-445245 fingerprint (2.1.88 match: applyPreservedSegmentRelinks, 0.702)
function applyPreservedSegmentRelinks(preservedMeta, messages) {
  if (preservedMeta.preservedMessages)
    return {
      preserved: preservedMeta.preservedMessages,
      source: "list",
    };
  let preservedSegment = preservedMeta.preservedSegment;
  if (!preservedSegment) return;
  let entryIndex = new Set();
  let toDelete = [];
  let idx = messages.get(preservedSegment.tailUuid);
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
    idx = idx.parentUuid ? messages.get(idx.parentUuid) : undefined;
  }
  logEvent("tengu_relink_walk_broken", {
    source: lit_2("walk"),
    tailInTranscript: messages.has(preservedSegment.tailUuid),
    headInTranscript: messages.has(preservedSegment.headUuid),
    anchorInTranscript: messages.has(preservedSegment.anchorUuid),
    walkSteps: entryIndex.size,
    transcriptSize: messages.size,
  });
  return;
}
//@ chunk-5xgkngpb.js:445245-445363 callgraph-witnessed (2.1.88 match: findLatestMessage, 1)
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
//@ chunk-5xgkngpb.js:445363-445881 facade-majority (2.1.88 match: buildConversationChain, 0.785)
/**
 * 从叶子消息沿 parentUuid 回溯到根，反转得到对话链；检测环（tengu_chain_parent_cycle），断链时按时间戳回退，最后补回孤立的并行工具结果。
 */
function buildConversationChain(messages, leafMessage, children) {
  let transcript = [];
  let seen = new Set();
  let readState = {
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
    let parent = messages.get(parentUuid);
    if (!parent || seen.has(parent.uuid)) {
      parent = readSessionStartDate(readState, messages, currentMsg, seen);
      if (parent) logEvent("tengu_chain_timestamp_fallback", {});
    }
    currentMsg = parent;
  }
  transcript.reverse();
  if (isFoamySpringEnabled()) for (let uuid of conversationChainOf(messages) ?? []) seen.add(uuid);
  let result = recoverOrphanedParallelToolResults(messages, transcript, seen);
  attachSideMessages(leafMessage, result, seen, children ?? groupNonChainChildrenByParent(messages));
  announceFirstTurnOnce(messages, result, seen);
  return result;
}
//@ chunk-5xgkngpb.js:445881-446746 facade-majority
function warnIfTranscriptUnchained(messages, transcript, sessionId) {
  let unchained = 0;
  for (let message of messages.values()) {
    if (message.type !== "user" && message.type !== "assistant") continue;
    if (message.parentUuid) return;
    unchained++;
  }
  if (unchained <= 1) return;
  let sessionKey = sessionId && normalizeUuidOrNull(sessionId) !== null ? sessionId : undefined;
  if (sessionKey) {
    let { warnedUnchainedSessions } = currentTranscriptStore();
    if (warnedUnchainedSessions.has(sessionKey)) return;
    warnedUnchainedSessions.add(sessionKey);
  }
  let survived = countWhere(transcript, (message) => message.type === "user" || message.type === "assistant");
  let warning = `Resume transcript${sessionKey ? ` (session ${sessionKey})` : ""} has ${unchained} user/assistant records but none carry parentUuid links; only ${survived} reached the resumed conversation. Conversation reconstruction walks parentUuid from the last record, so unlinked records are dropped \u2014 the file's producer must chain records (parentUuid null on the first, the previous record's uuid on each subsequent one).`;
  logEvent("tengu_resume_unchained_transcript", {
    conversational_records: unchained,
    survived,
  });
  logForDebugging(warning, {
    level: "error",
  });
  if (hasEmbeddedSearchTools_2() || env.CLAUDE_CODE_ENTRYPOINT === "bench")
    process.stderr.write(`Warning: ${warning}
`);
}
//@ chunk-5xgkngpb.js:446746-446823 layout
function getFileSnapshotMessages(messages) {
  let snapshots = [];
  for (let message of messages.values()) if (isFileSnapshotMessage(message)) snapshots.push(message);
  return snapshots;
}
//@ chunk-5xgkngpb.js:446823-447012 layout
function groupNonChainChildrenByParent(messages) {
  let byParent = new Map();
  for (let message of messages.values())
    if (message.parentUuid && message.type !== "user" && message.type !== "assistant") {
      let list = byParent.get(message.parentUuid);
      if (list) list.push(message);
      else byParent.set(message.parentUuid, [message]);
    }
  return byParent;
}
//@ chunk-5xgkngpb.js:447012-447584 layout
function attachSideMessages(leafMessage, transcript, seen, children) {
  if (isSideMessagesEnabled()) {
    let compare = (a, b) => (a.timestamp < b.timestamp ? -1 : a.timestamp > b.timestamp ? 1 : 0);
    let stack = [leafMessage];
    while (stack.length > 0) {
      let current = stack.pop();
      if (current !== leafMessage) {
        if (seen.has(current.uuid)) continue;
        seen.add(current.uuid);
        transcript.push(current);
      }
      let siblingList = children.get(current.uuid) ?? [];
      let sorted = siblingList.length > 1 ? [...siblingList].sort(compare) : siblingList;
      for (let idx = sorted.length - 1; idx >= 0; idx--)
        if (!seen.has(sorted[idx].uuid)) stack.push(sorted[idx]);
    }
    return;
  }
  let side = [];
  let queue = [leafMessage.uuid];
  while (queue.length > 0) {
    let uuid = queue.shift();
    for (let child of children.get(uuid) ?? []) {
      if (seen.has(child.uuid)) continue;
      seen.add(child.uuid);
      side.push(child);
      queue.push(child.uuid);
    }
  }
  if (side.length > 1)
    side.sort((a, b) => (a.timestamp < b.timestamp ? -1 : a.timestamp > b.timestamp ? 1 : 0));
  transcript.push(...side);
}
//@ chunk-5xgkngpb.js:447584-447637 layout
var TENGU_CCR_STORED_GAP_BRIDGE_ENABLED = "tengu_ccr_stored_gap_bridge_enabled";
var CCR_STORED_GAP_BRIDGE_FLAG = 16;
//@ chunk-5xgkngpb.js:447637-448029 layout
function bridgeStoredGaps(messages, leafUuid) {
  if (
    !isRemoteEnvironmentAny() ||
    !isFoamySpringEnabled() ||
    !readGateTrueByDefault(TENGU_CCR_STORED_GAP_BRIDGE_ENABLED)
  )
    return;
  let visited = new Set();
  let bridges = 0;
  let newestGapMs = 0;
  let current = leafUuid ? messages.get(leafUuid) : undefined;
  while (current?.parentUuid && !visited.has(current.uuid)) {
    visited.add(current.uuid);
    let parent = messages.get(current.parentUuid);
    if (!parent && bridges < CCR_STORED_GAP_BRIDGE_FLAG) {
      parent = removeExtraFields_2(messages, current, visited);
      if (parent) {
        messages.set(current.uuid, {
          ...current,
          parentUuid: parent.uuid,
        });
        newestGapMs ||= Date.parse(current.timestamp) - Date.parse(parent.timestamp);
        bridges++;
      }
    }
    current = parent;
  }
  if (bridges > 0)
    logEvent("tengu_ccr_stored_gap_bridged", {
      bridges,
      newest_gap_ms: newestGapMs,
      message_count: messages.size,
    });
}
//@ chunk-5xgkngpb.js:448029-448335 fingerprint (2.1.88 match: removeExtraFields, 0.847)
function removeExtraFields_2(messages, current, visited) {
  let candidates = [];
  for (let message of messages.values()) {
    if (message.uuid === current.uuid) break;
    if (!message.isSidechain && message.timestamp <= current.timestamp) candidates.push(message);
  }
  let parents = new Set(candidates.map((message) => message.parentUuid));
  let best;
  for (let message of candidates)
    if (
      !visited.has(message.uuid) &&
      !parents.has(message.uuid) &&
      !(message.type === "system" && !message.parentUuid) &&
      (!best || message.timestamp >= best.timestamp)
    )
      best = message;
  return best;
}
//@ chunk-5xgkngpb.js:448335-448414 placement
function hasToolUseBlockFlag(message) {
  return message.type === "assistant" && contentHasBlockType(message.message?.content, "tool_use");
}
//@ chunk-5xgkngpb.js:448414-448501 placement
function hasToolUseBlock(message) {
  return message.type === "assistant"
    ? collectBlockFieldsByType(message.message?.content, "tool_use", "id")
    : [];
}
//@ chunk-5xgkngpb.js:448501-448594 affinity
/**
 * user 消息里所有 tool_result 的 tool_use_id。旧版名 isToolResultBlock 不准确。
 */
function getToolResultIds(message) {
  return message.type === "user"
    ? collectBlockFieldsByType(message.message?.content, "tool_result", "tool_use_id")
    : [];
}
//@ chunk-5xgkngpb.js:448742-448991 placement
function countVisibleMessages_2(message, messageId) {
  switch (message.type) {
    case "assistant":
      return messageId !== null && message.message?.id === messageId;
    case "user":
      return message.isMeta === true || contentHasBlockType(message.message?.content, "tool_result");
    case "attachment":
      return true;
    case "system":
      return message.subtype !== "compact_boundary";
    default:
      return false;
  }
}
//@ chunk-5xgkngpb.js:448991-449042 layout
function isAssistantTranscriptEntry(entry) {
  return isTranscriptMessage(entry) && entry.type === "assistant";
}
//@ chunk-5xgkngpb.js:449042-449091 layout
function isChainLinkCandidate(entry, messageId) {
  return (
    isLegacyProgressEntry(entry) || (isTranscriptMessage(entry) && countVisibleMessages_2(entry, messageId))
  );
}
//@ chunk-5xgkngpb.js:449091-449145 layout
function getAssistantMessageId(entry, fallbackId) {
  return isAssistantTranscriptEntry(entry) ? (entry.message?.id ?? null) : fallbackId;
}
//@ chunk-5xgkngpb.js:449145-449189 layout
function isProgressOrHiddenEntry(entry) {
  return isLegacyProgressEntry(entry) || (isTranscriptMessage(entry) && isAuxiliaryEntry(entry));
}
//@ chunk-5xgkngpb.js:449189-449274 layout
function hasMalformedMessage(entry) {
  return (
    isTranscriptMessage(entry) &&
    (entry.type === "user" || entry.type === "assistant") &&
    !isPlainObject_6(entry.message)
  );
}
//@ chunk-5xgkngpb.js:449274-453323 fingerprint (2.1.88 match: recoverOrphanedParallelToolResults, 0.45)
/**
 * 并行工具调用时多个 tool_result 只有一个在主链上，把同一 assistant 消息的其余 tool_result 找回插入链中。
 */
function recoverOrphanedParallelToolResults(messages, chain, seen) {
  let chainAssistants = chain.filter((message) => message.type === "assistant");
  if (chainAssistants.length === 0) return chain;
  let foamySpring = isFoamySpringEnabled();
  let anchorByMsgId = new Map();
  let childrenByParent = new Map();
  let toolResults = [];
  for (let message of messages.values())
    if (message.type === "assistant" && message.message.id) {
      let list = anchorByMsgId.get(message.message.id);
      if (list) list.push(message);
      else anchorByMsgId.set(message.message.id, [message]);
    } else if (message.type === "user" && contentHasBlockType(message.message?.content, "tool_result"))
      toolResults.push(message);
  let seenKeys = new Set();
  let linkParent = (parentUuid, child) => {
    if (
      seenKeys.has(
        parentUuid +
          `
` +
          child.uuid,
      )
    )
      return;
    seenKeys.add(
      parentUuid +
        `
` +
        child.uuid,
    );
    let list = childrenByParent.get(parentUuid);
    if (list) list.push(child);
    else childrenByParent.set(parentUuid, [child]);
  };
  let compatible = (a, b) => (a.isSidechain ?? false) === (b.isSidechain ?? false) && a.agentId === b.agentId;
  let orphans = [];
  for (let entry of toolResults) {
    if (entry.parentUuid) linkParent(entry.parentUuid, entry);
    if (!foamySpring) continue;
    let parent = entry.parentUuid ? messages.get(entry.parentUuid) : undefined;
    let parentToolIds = new Set(parent ? hasToolUseBlock(parent) : []);
    let toolResultIds = getToolResultIds(entry);
    if (toolResultIds.length > 0 && toolResultIds.every((toolResultId) => parentToolIds.has(toolResultId)))
      continue;
    orphans.push(entry);
  }
  let siblingsByMsgId = new Map();
  if (orphans.length > 0)
    for (let list of anchorByMsgId.values())
      for (let message of list) {
        if (message.type !== "assistant") continue;
        for (let toolId of hasToolUseBlock(message)) {
          let group = siblingsByMsgId.get(toolId);
          siblingsByMsgId.set(
            toolId,
            group === undefined || group?.message.id === message.message.id ? message : null,
          );
        }
      }
  for (let entry of orphans) {
    let sourceToolAssistantUUID =
      "sourceToolAssistantUUID" in entry ? entry.sourceToolAssistantUUID : undefined;
    let source =
      typeof sourceToolAssistantUUID === "string" && sourceToolAssistantUUID !== entry.parentUuid
        ? messages.get(sourceToolAssistantUUID)
        : undefined;
    if (source && compatible(entry, source)) linkParent(source.uuid, entry);
    for (let toolId of getToolResultIds(entry)) {
      let group = siblingsByMsgId.get(toolId);
      if (group && group.uuid !== entry.parentUuid && compatible(entry, group)) linkParent(group.uuid, entry);
    }
  }
  let chainToolIds;
  let claimedToolIds = () => {
    if (chainToolIds === undefined) {
      chainToolIds = new Set();
      for (let message of chain) for (let toolId of getToolResultIds(message)) chainToolIds.add(toolId);
    }
    return chainToolIds;
  };
  let processedGroups = new Map();
  for (let idx = 0; idx < chain.length; idx++) processedGroups.set(chain[idx].uuid, idx);
  let inserts = new Set();
  let groups = [];
  let recoveredCount = 0;
  let recoveredTailCount = 0;
  let movedByCallId = 0;
  let childrenIndex;
  let keyIndex;
  let movedIndex = new Map();
  let effectivePosition = (entry) => movedIndex.get(entry.uuid) ?? indexOrMax(keyIndex, entry);
  let comparePosition = (a, b) =>
    effectivePosition(a) - effectivePosition(b) || indexOrMax(keyIndex, a) - indexOrMax(keyIndex, b);
  for (let asst of chainAssistants) {
    let msgId = asst.message.id;
    if (!msgId || inserts.has(msgId)) continue;
    inserts.add(msgId);
    let group = anchorByMsgId.get(msgId) ?? [asst];
    let isInGroup = (uuid) => !!uuid && group.some((member) => member.uuid === uuid);
    let orphanedSiblings = group.filter((sibling) => !seen.has(sibling.uuid));
    let anchored = [];
    let unanchored = [];
    let seenSiblings = new Set();
    for (let member of group)
      for (let child of childrenByParent.get(member.uuid) ?? []) {
        if (seen.has(child.uuid) || seenSiblings.has(child.uuid)) continue;
        seenSiblings.add(child.uuid);
        if (isInGroup(child.parentUuid)) anchored.push(child);
        else unanchored.push(child);
      }
    if (unanchored.length > 0) {
      keyIndex ??= mapKeysToIndex(messages);
      let claimed = new Set(claimedToolIds());
      for (let recovered of anchored) for (let toolId of getToolResultIds(recovered)) claimed.add(toolId);
      unanchored.sort(comparePosition);
      let max = Math.max(...group.map((member) => indexOrMax(keyIndex, member)));
      for (let entry of unanchored) {
        let toolResultIds = getToolResultIds(entry);
        if (
          !toolResultIds.some((toolResultId) => {
            let trs = siblingsByMsgId.get(toolResultId);
            return !claimed.has(toolResultId) && !!trs && isInGroup(trs.uuid);
          })
        )
          continue;
        for (let tr of toolResultIds) claimed.add(tr);
        movedIndex.set(entry.uuid, Math.max(indexOrMax(keyIndex, entry), max + 0.5));
        rememberMovedRow(entry.uuid);
        anchored.push(entry);
        movedByCallId++;
      }
    }
    let combined = [...orphanedSiblings, ...anchored];
    for (let entry of combined) seen.add(entry.uuid);
    let groupStart = processedGroups.get(asst.uuid);
    let groupEnd = groupStart + 1;
    for (let member of group) {
      let position = processedGroups.get(member.uuid);
      if (position !== undefined && position >= groupEnd) groupEnd = position + 1;
    }
    while (groupEnd < chain.length && countVisibleMessages_2(chain[groupEnd], msgId)) groupEnd++;
    let anchoredTails = new Map();
    if (group.some(hasToolUseBlockFlag)) {
      childrenIndex ??= buildChildrenIndex(messages);
      let index = childrenIndex;
      let entries = [...group];
      let seenUuids = new Set(group.map((entry) => entry.uuid));
      for (let entry of group)
        for (let child of childrenByParent.get(entry.uuid) ?? [])
          if (seen.has(child.uuid) && !seenUuids.has(child.uuid)) {
            seenUuids.add(child.uuid);
            entries.push(child);
          }
      let collectTail = (entry, out) => {
        let anchorIndex = movedIndex.get(entry.uuid);
        for (let child of index.get(entry.uuid) ?? []) {
          let linearChain = collectLinearChain(child, entry, index, seen);
          for (let uuid of linearChain) {
            seen.add(uuid.uuid);
            out.push(uuid);
            if (anchorIndex !== undefined) {
              keyIndex ??= mapKeysToIndex(messages);
              movedIndex.set(uuid.uuid, Math.max(indexOrMax(keyIndex, uuid), anchorIndex));
              rememberMovedRow(uuid.uuid);
            }
          }
          recoveredTailCount += linearChain.length;
        }
      };
      for (let entry of entries) collectTail(entry, combined);
      for (let entry of chain.slice(groupStart + 1, groupEnd)) {
        if (!isAuxiliaryEntry(entry)) continue;
        let collected = [];
        collectTail(entry, collected);
        if (collected.length > 0) anchoredTails.set(entry.uuid, collected);
      }
    }
    if (combined.length === 0 && anchoredTails.size === 0) continue;
    recoveredCount += orphanedSiblings.length + anchored.length;
    keyIndex ??= mapKeysToIndex(messages);
    combined.sort(comparePosition);
    groups.push({
      start: groupStart,
      end: groupEnd,
      recovered: combined,
      anchored: anchoredTails,
    });
  }
  if (groups.length === 0) return chain;
  logEvent("tengu_chain_parallel_tr_recovered", {
    recovered_count: recoveredCount,
    recovered_tail_count: recoveredTailCount,
  });
  if (movedByCallId > 0)
    logEvent("tengu_chain_tool_result_recovered_by_call_id", {
      recovered_count: movedByCallId,
    });
  groups.sort((a, b) => a.start - b.start);
  let mergedRanges = [];
  for (let range of groups) {
    let last = mergedRanges.at(-1);
    if (last !== undefined && range.start < last.end) {
      last.end = Math.max(last.end, range.end);
      last.recovered = [...last.recovered, ...range.recovered].sort(comparePosition);
      for (let [uuid, list] of range.anchored)
        last.anchored.set(uuid, [...(last.anchored.get(uuid) ?? []), ...list]);
    } else mergedRanges.push(range);
  }
  let result = [];
  let previousEnd = 0;
  for (let { start, end, recovered, anchored } of mergedRanges) {
    result.push(...chain.slice(previousEnd, start + 1));
    let recoveredIndex = 0;
    for (let idx = start + 1; idx < end; idx++) {
      let entry = chain[idx];
      let position = indexOrMax(keyIndex, entry);
      while (recoveredIndex < recovered.length && effectivePosition(recovered[recoveredIndex]) < position)
        result.push(recovered[recoveredIndex++]);
      result.push(entry);
      result.push(...(anchored.get(entry.uuid) ?? []));
    }
    while (recoveredIndex < recovered.length) result.push(recovered[recoveredIndex++]);
    previousEnd = end;
  }
  result.push(...chain.slice(previousEnd));
  return result;
}
//@ chunk-5xgkngpb.js:453323-453624 facade-majority (2.1.88 match: checkResumeConsistency, 1)
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
//@ chunk-5xgkngpb.js:453624-453670 file-local
function buildAttributionSnapshotChain(attributionSnapshots) {
  return Array.from(attributionSnapshots.values());
}
//@ chunk-5xgkngpb.js:453670-453738 facade-majority
class TranscriptFileFormatError extends Error {
  code;
  constructor(message, code) {
    super(message);
    this.code = code;
  }
}
//@ chunk-5xgkngpb.js:453738-455344 layout
function buildLiteLogFromMessages(transcriptFile, lite, fallbackSessionId) {
  let sessionId =
    findLatestMessage(transcriptFile.messages.values(), () => true)?.sessionId ?? fallbackSessionId;
  let log = {
    ...lite,
    messages: [],
    value: lite.value ?? 0,
    firstPrompt: "",
    messageCount: 0,
    isSidechain: false,
    sessionId,
    customTitle: transcriptFile.customTitles.get(sessionId) ?? lite.customTitle,
    aiTitle: transcriptFile.aiTitles.get(sessionId) ?? lite.aiTitle,
    tag: transcriptFile.tags.get(sessionId) ?? lite.tag,
    agentName: transcriptFile.agentNames.get(sessionId) ?? lite.agentName,
    agentColor: transcriptFile.agentColors.get(sessionId),
    agentSetting: transcriptFile.agentSettings.get(sessionId) ?? lite.agentSetting,
    mode: transcriptFile.modes.get(sessionId),
    permissionMode: transcriptFile.permissionModes.get(sessionId),
    isolationLatch: transcriptFile.isolationLatches.get(sessionId),
    devModsFolder: transcriptFile.devModsFolders?.get(sessionId),
    sessionOwner: transcriptFile.sessionOwners?.get(sessionId),
    memoryModeStamps: transcriptFile.memoryModeStamps.get(sessionId) ?? [],
    atisLatch: transcriptFile.atisLatches.get(sessionId),
    toolsUsed: transcriptFile.toolsUsedLists?.get(sessionId),
    prNumber: transcriptFile.prNumbers.get(sessionId) ?? lite.prNumber,
    prUrl: transcriptFile.prUrls.get(sessionId) ?? lite.prUrl,
    prRepository: transcriptFile.prRepositories.get(sessionId) ?? lite.prRepository,
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
      : lite.worktreeSession,
    artifactCommentMonitor: transcriptFile.artifactCommentMonitors.get(sessionId),
    artifactAutoReactLedger: transcriptFile.artifactAutoReactLedgers.get(sessionId),
    costState: transcriptFile.costStates.get(sessionId),
    contentReplacements: transcriptFile.contentReplacements.get(sessionId) ?? [],
    rewindAnchorUuid: transcriptFile.rewindAnchorUuid,
  };
  log.replMode = weakMap_7.get(transcriptFile.messages)?.get(sessionId);
  return log;
}
//@ chunk-5xgkngpb.js:455344-458134 facade-majority (2.1.88 match: loadTranscriptFromFile, 0.428)
/**
 * 读取指定 jsonl 文件并构造日志对象（No messages found in JSONL file 时报错），用于 --resume <path>.jsonl。
 */
async function loadTranscriptFromFile(transcriptPath, storageV5) {
  let key =
    isStorageV5Enabled() && storageV5 !== undefined
      ? getTranscriptStorageKey(transcriptPath, storageV5)
      : undefined;
  if (key === undefined && isDiskless()) throw makeEnoentError(transcriptPath);
  if (transcriptPath.endsWith(".jsonl")) {
    let fileStat = key ? undefined : await stat(transcriptPath);
    let transcriptFile = await loadTranscriptFile(
      transcriptPath,
      key && {
        storageV5: key,
      },
    );
    if (transcriptFile.servedBy === "absent") throw makeEnoentError(transcriptPath);
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
      sessionOwners,
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
      (leafUuids.size === 0 && !clearedToEmpty ? filterResumableSessions_2(messages) : undefined);
    if (!leafMessage) {
      if (clearedToEmpty) {
        let timestamp = fileStat?.mtime ?? new Date(transcriptFile.v5Read?.mtimeMs ?? 0);
        return buildLiteLogFromMessages(transcriptFile, {
          date: timestamp.toISOString(),
          fullPath: transcriptPath,
          created: timestamp,
          modified: timestamp,
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
    let log = {
      ...convertToLogOption(
        transcript,
        0,
        summary,
        customTitle,
        buildFileHistorySnapshots(fileHistorySnapshots, fileHistoryDeltas, transcript),
        tag,
        transcriptPath,
        buildAttributionSnapshotChain(attributionSnapshots),
        undefined,
        contentReplacements.get(sessionId) ?? [],
      ),
      rewindAnchorUuid: transcriptFile.rewindAnchorUuid,
      fileSnapshots: getFileSnapshotMessages(messages),
      aiTitle: aiTitles.get(sessionId),
      relocatedCwd: relocatedCwds.get(sessionId),
      ...withEndedByModel({}, endedSessions.has(sessionId)),
      worktreeSession: worktreeStates.has(sessionId) ? worktreeStates.get(sessionId) : undefined,
      artifactCommentMonitor: artifactCommentMonitors.get(sessionId),
      artifactAutoReactLedger: artifactAutoReactLedgers.get(sessionId),
      costState: costStates.get(sessionId),
      isolationLatch: isolationLatches.get(sessionId),
      devModsFolder: devModsFolders?.get(sessionId),
      sessionOwner: sessionOwners?.get(sessionId),
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
    log.replMode = weakMap_7.get(messages)?.get(sessionId);
    return log;
  }
  let stats = await stat(transcriptPath);
  if (stats.size > 268435456)
    throw new TranscriptFileFormatError(
      `Transcript file too large to load as JSON (${stats.size} bytes)`,
      "too_large",
    );
  let content = await readFile(transcriptPath, {
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
  return convertToLogOption(messages, 0, undefined, undefined, undefined, undefined, transcriptPath);
}
//@ chunk-5xgkngpb.js:458134-458302 layout
function makeEnoentError(path) {
  return Object.assign(
    new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
      `ENOENT: no such file or directory, stat '${path}'`,
      "ENOENT: no such file or directory",
    ),
    {
      code: "ENOENT",
      syscall: "stat",
      path,
    },
  );
}
//@ chunk-5xgkngpb.js:458302-458559 fingerprint (2.1.88 match: hasVisibleUserContent, 1)
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
//@ chunk-5xgkngpb.js:458559-458753 file-local
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
//@ chunk-5xgkngpb.js:458753-458934 placement (2.1.88 match: isSyntheticMessage, 1)
/**
 * 统计含可见内容的 user/assistant 消息数（会话列表用）。旧版名 isSyntheticMessage 为错配。
 */
function countVisibleMessages(message) {
  let visible = 0;
  for (let entry of message)
    switch (entry.type) {
      case "user":
        if (hasVisibleUserContent(entry)) visible++;
        break;
      case "assistant":
        if (hasNonEmptyAssistantText(entry)) visible++;
        break;
      case "attachment":
      case "system":
      case "progress":
        break;
    }
  return visible;
}
//@ chunk-5xgkngpb.js:458934-459465 fingerprint (2.1.88 match: convertToLogOption, 0.925)
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
    leafUuid: (transcript.findLast((message) => !isReorderedRow(message.uuid)) ?? lastMessage).uuid,
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
//@ chunk-5xgkngpb.js:459465-459891 fingerprint (2.1.88 match: trackSessionBranchingAnalytics, 1)
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
  let branchCounts = Array.from(sessionIdCounts.values()).filter((count) => count > 1);
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
//@ chunk-5xgkngpb.js:459891-460461 facade-majority (2.1.88 match: fetchLogs, 0)
/**
 * 列出当前项目（及 worktree）的会话日志（lite），供 /resume 与 --continue 使用。
 */
async function fetchLogs(limit, storage) {
  if (isDiskless() && getTranscriptStorageContext(storage) === undefined) return [];
  let originalCwd = getOriginalCwd();
  let projectDir =
    (await findProjectDir(originalCwd, wrapStorageSource(getTranscriptStorageContext(storage)))) ??
    getProjectDir(originalCwd);
  let [sessionFilesLite, sessionAliases] = await Promise.all([
    getSessionFilesLite(projectDir, limit, originalCwd, storage),
    readSessionAliases(originalCwd, storage),
  ]);
  let logs = sessionFilesLite;
  if (
    limit !== undefined &&
    sessionFilesLite.length === limit &&
    (await allLogsShareCwd(sessionFilesLite, originalCwd, storage))
  ) {
    let sessionFilesLite = await getSessionFilesLite(projectDir, undefined, originalCwd, storage);
    let buffer = Buffer.alloc(LITE_READ_BUF_SIZE);
    let filtered = [];
    for (let log of sessionFilesLite)
      if (!(await logCwdMatches(log, originalCwd, buffer, storage))) {
        filtered.push(log);
        if (filtered.length === limit) break;
      }
    logs = filtered;
  }
  if (UNSAFE_PATH_CHAR_PATTERN.test(originalCwd) && (await allLogsShareCwd(logs, originalCwd, storage)))
    logs = await getSessionFilesLite_2(originalCwd, projectDir, limit, false, undefined, storage);
  if (sessionAliases.length > 0) {
    let mapped = (
      await Promise.all(
        sessionAliases.map((sessionAlias) => getSessionFilesLite(sessionAlias, limit, undefined, storage)),
      )
    )
      .flat()
      .map((log) => ({
        ...log,
        isAlias: true,
      }));
    logs = latestLogPerSession(logs.concat(mapped));
    if (limit !== undefined) logs = logs.slice(0, limit);
  }
  await trackSessionBranchingAnalytics(logs);
  return logs;
}
//@ chunk-5xgkngpb.js:460461-460673 layout
function writeTranscriptMetadataSync(transcriptPath, entry) {
  if (isTranscriptPersistenceDisabled()) return;
  assertDiskWritable("transcript_metadata", transcriptPath);
  let fsImplementation = getFsImplementation();
  let line =
    jsonStringify(entry) +
    `
`;
  try {
    fsImplementation.appendFileSync(transcriptPath, line, {
      mode: 384,
    });
  } catch {
    fsImplementation.mkdirSync(dirname(transcriptPath), {
      mode: 448,
    });
    fsImplementation.appendFileSync(transcriptPath, line, {
      mode: 384,
    });
  }
  getProject().fireMirror(transcriptPath, [entry]);
}
//@ chunk-5xgkngpb.js:460673-461175 layout
/**
 * 同步向已存在的转录文件追加一条记录（文件末尾无换行时先补换行、可换用替代记录），完整写入后触发镜像；文件不存在或为空时跳过。
 */
function appendEntrySync(transcriptPath, entry, tornTailEntry) {
  if (isTranscriptPersistenceDisabled()) return;
  if (isDiskless()) {
    warnDisklessSettingsWrite("transcript_stop_now", transcriptPath);
    return;
  }
  let line =
    jsonStringify(entry) +
    `
`;
  let fd;
  try {
    fd = openSync(transcriptPath, constants.O_RDWR | constants.O_APPEND);
  } catch (error) {
    let errnoCode = getErrnoCode(error);
    if (errnoCode === "ENOENT" || errnoCode === "ENOTDIR") return;
    throw error;
  }
  try {
    let { size } = fstatSync(fd);
    if (size === 0) return;
    let needsNewline = !endsWithNewlineSync(fd, size);
    if (needsNewline && tornTailEntry !== undefined) entry = tornTailEntry;
    let buffer = Buffer.from(
      needsNewline
        ? `
` +
            jsonStringify(entry) +
            `
`
        : line,
      "utf8",
    );
    let position = undefined;
    let written = 0;
    while (written < buffer.length) {
      let wrote = writeSync(fd, buffer, written, buffer.length - written, position);
      if (wrote <= 0) throw Error("appendEntryToExistingFileSync: short write");
      written += wrote;
      if (position !== undefined) position += wrote;
    }
  } finally {
    closeSync(fd);
  }
  getProject().fireMirror(transcriptPath, [entry]);
}
//@ chunk-5xgkngpb.js:461175-461419 layout
function readTranscriptTail(sessionFile) {
  if (isDiskless()) return "";
  let fd;
  try {
    fd = openSync(sessionFile, "r");
    let stats = fstatSync(fd);
    let max = Math.max(0, stats.size - LITE_READ_BUF_SIZE);
    let buffer = Buffer.allocUnsafe(Math.min(LITE_READ_BUF_SIZE, stats.size - max));
    let bytesRead = readSync(fd, buffer, 0, buffer.length, max);
    return buffer.toString("utf8", 0, bytesRead);
  } catch {
    return "";
  } finally {
    if (fd !== undefined)
      try {
        closeSync(fd);
      } catch {}
  }
}
//@ chunk-5xgkngpb.js:461419-461432 layout
var transcriptRelocationQueue; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-5xgkngpb.js:461419", () => {
  transcriptRelocationQueue = createKeyedQueue();
});
//@ chunk-5xgkngpb.js:461432-461484 layout
function openRelocationBracket(sessionFilePath) {
  currentTranscriptStore().openAppendRelocationBracket(sessionFilePath);
}
//@ chunk-5xgkngpb.js:461484-461636 layout
function flushParkedAppends(sessionFilePath) {
  let parked = currentTranscriptStore().closeAppendRelocationBracket();
  if (!parked) return;
  for (let { entry, storageV5, opts, resolve, reject } of parked)
    appendEntryToFileAsync(sessionFilePath, entry, storageV5, opts).then(resolve, reject);
}
//@ chunk-5xgkngpb.js:461636-462224 facade-majority
function appendEntryToFileAsync(path, entry, storageV5, opts) {
  if (isTranscriptPersistenceDisabled()) return Promise.resolve();
  let { relocationParkedAppends, relocationParkedPath } = currentTranscriptStore();
  if (relocationParkedAppends !== null && path === relocationParkedPath)
    return new Promise((resolve, reject) => {
      relocationParkedAppends.push({
        entry,
        storageV5,
        opts,
        resolve,
        reject,
      });
    });
  let line =
    jsonStringify(entry) +
    `
`;
  let tornLine =
    opts?.tornTailEntry !== undefined
      ? jsonStringify(opts.tornTailEntry) +
        `
`
      : undefined;
  let queued = transcriptRelocationQueue.run(path, async () => {
    let outcome = await appendToTranscriptFile(path, line, storageV5, opts?.onlyIfExists, tornLine);
    if (outcome !== "skipped") {
      let mirroredEntry =
        (outcome === "direct-torn" || outcome === "backend-torn") && opts?.tornTailEntry !== undefined
          ? opts.tornTailEntry
          : entry;
      getProject().fireMirror(path, [mirroredEntry]);
    }
  });
  queued.catch((error) => {
    logForDebugging(`appendEntryToFileAsync: append to ${path} failed: ${errorMessage(error)}`, {
      level: "error",
    });
  });
  return queued;
}
//@ chunk-5xgkngpb.js:462224-462264 facade-majority
async function flushAppendEntryQueues() {
  await transcriptRelocationQueue.settle();
}
//@ chunk-5xgkngpb.js:462264-462439 layout
function isLastPromptLine(line) {
  if (!line.includes('"type":"last-prompt"') || !line.includes('"leafUuid":')) return false;
  try {
    let parsed = jsonParseRaw(line);
    return parsed.type === "last-prompt" && parsed.leafUuid !== undefined;
  } catch {
    return false;
  }
}
//@ chunk-5xgkngpb.js:462439-462858 layout (2.1.88 match: readFileRange, 0.818)
async function readFileRange(path, storageV5) {
  if (isStorageV5Enabled() && storageV5 !== undefined && transcriptKeyFor(path) !== undefined)
    return (
      (
        await readTranscriptTailViaStorage(path, LITE_READ_BUF_SIZE, storageV5).catch(() => {
          return;
        })
      )?.content ?? ""
    );
  let diskPath = worktreeFromProgress(path);
  if (diskPath === undefined) return "";
  let handle;
  try {
    handle = await open(diskPath, "r");
    let stats = await handle.stat();
    let max = Math.max(0, stats.size - LITE_READ_BUF_SIZE);
    let bytesToRead = Math.min(LITE_READ_BUF_SIZE, stats.size - max);
    if (bytesToRead <= 0) return "";
    let buffer = Buffer.allocUnsafe(bytesToRead);
    let { bytesRead } = await handle.read(buffer, 0, bytesToRead, max);
    return buffer.toString("utf8", 0, bytesRead);
  } catch {
    return "";
  } finally {
    if (handle)
      try {
        await handle.close();
      } catch {}
  }
}
//@ chunk-5xgkngpb.js:462858-463064 facade-majority
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
//@ chunk-5xgkngpb.js:463064-463150 facade-majority
function applyEndedByModelOnResume(endedByModel, setAppState) {
  let ended = Boolean(endedByModel);
  setAppState((state) =>
    state.endedByModel === ended
      ? state
      : {
          ...state,
          endedByModel: ended,
        },
  );
}
//@ chunk-5xgkngpb.js:463150-463542 facade-majority (2.1.88 match: saveCustomTitle, 0.756)
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
    let sidecarPath = sessionId === getSessionId() ? getTranscriptPathForSession(sessionId) : resolvedPath;
    await writeSessionTitleSidecar(sidecarPath, sessionId, customTitle, storageV5);
  }
  if (sessionId === getSessionId()) {
    getProject().currentSessionTitle = customTitle;
    currentTranscriptStore().sessionTitleChanged.emit();
  }
  logEvent("tengu_session_renamed", {
    source: fromEnum(source),
  });
}
//@ chunk-5xgkngpb.js:463542-463761 facade-majority (2.1.88 match: saveAiGeneratedTitle, 0.539)
/**
 * 追加 ai-title 记录（自动生成的会话标题）。
 */
function saveAiGeneratedTitle(sessionId, aiTitle, storageV5) {
  appendEntryToFileAsync(
    getTranscriptPathForSession(sessionId),
    {
      type: "ai-title",
      aiTitle,
      sessionId,
    },
    storageV5,
  ).catch((error) => {
    logForDebugging(`saveAiGeneratedTitle: transcript append failed: ${errorMessage(error)}`);
  });
  if (sessionId === getSessionId()) {
    getProject().currentSessionAiTitle = aiTitle;
    currentTranscriptStore().sessionTitleChanged.emit();
  }
}
//@ chunk-5xgkngpb.js:463761-464243 facade-majority (2.1.88 match: linkSessionToPR, 0.804)
/**
 * 追加 pr-link 记录（PR 编号、URL、仓库），打 tengu_session_linked_to_pr。
 */
async function linkSessionToPR(sessionId, prNumber, prUrl, prRepository, fullPath, storageV5) {
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
      storageV5,
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
//@ chunk-5xgkngpb.js:464243-464331 layout
function needsTranscriptTarget(project, path, options) {
  return Boolean(project.sessionFilePath) || (options?.targetExists === true && path !== undefined);
}
//@ chunk-5xgkngpb.js:464331-465171 facade-majority
function saveBridgeSession(
  sessionId,
  bridgeSessionId,
  lastSequenceNum,
  path,
  dialogKinds,
  sessionGroupingId,
  noHistoryBackfill,
  owner,
  options,
  storageV5,
) {
  let project = getProject();
  let isCurrentSessionFile =
    options?.atExit === true &&
    sessionId === getSessionId() &&
    (path ?? getTranscriptPathForSession(sessionId)) === project.sessionFilePath;
  if (needsTranscriptTarget(project, path, options) && !isCurrentSessionFile)
    appendEntryToFileAsync(
      path ?? getTranscriptPathForSession(sessionId),
      {
        type: "bridge-session",
        sessionId,
        bridgeSessionId,
        lastSequenceNum,
        ...(dialogKinds?.length && {
          declaredDialogKinds: dialogKinds,
        }),
        ...(sessionGroupingId && {
          sessionGroupingId,
        }),
        ...(noHistoryBackfill && {
          noHistoryBackfill: true,
        }),
        ...(owner?.accountUuid && {
          ownerAccountUuid: owner.accountUuid,
        }),
        ...(owner?.organizationUuid && {
          ownerOrganizationUuid: owner.organizationUuid,
        }),
      },
      storageV5,
      {
        onlyIfExists: options?.atExit,
      },
    ).catch((error) => {
      logForDebugging(`saveBridgeSession: transcript append failed: ${errorMessage(error)}`);
    });
  if (sessionId === getSessionId()) {
    project.currentSessionBridgeId = bridgeSessionId;
    project.currentSessionBridgeSeq = lastSequenceNum;
    project.currentSessionBridgeDialogKinds = dialogKinds?.length ? dialogKinds : undefined;
    project.currentSessionBridgeGroupingId = sessionGroupingId;
    project.currentSessionBridgeNoBackfill = noHistoryBackfill ? true : undefined;
    project.currentSessionBridgeOwnerAccountUuid = owner?.accountUuid;
    project.currentSessionBridgeOwnerOrganizationUuid = owner?.organizationUuid;
  }
}
//@ chunk-5xgkngpb.js:465171-465409 facade-majority
function writeHistorySuppression(sessionId, path, reason, detail, storageV5) {
  let sid = sessionId ?? getSessionId();
  if (!sid) return;
  let promise;
  if (!isTranscriptPersistenceDisabled())
    promise = appendEntryToFileAsync(
      path ?? getTranscriptPathForSession(sid),
      buildHistorySuppressionEntry(sid, reason, detail),
      storageV5,
    ).catch((error) => {
      logForDebugging(`writeHistorySuppression: transcript append failed: ${errorMessage(error)}`);
    });
  markSessionHistorySuppressedFor(sid);
  if (sid === getSessionId()) getProject().currentSessionHistorySuppressed = true;
  return promise;
}
//@ chunk-5xgkngpb.js:465409-465472 facade-majority
function isSessionHistorySuppressed() {
  return getProject().currentSessionHistorySuppressed === true;
}
//@ chunk-5xgkngpb.js:465472-465726 facade-majority
async function readHistorySuppressionFromDisk(storageV5) {
  let sessionId = getSessionId();
  let materializedSessionFile = getMaterializedSessionFile();
  let derivedPath =
    Boolean(sessionId) &&
    materializedSessionFile !== null &&
    !isOwnTranscriptFile(sessionId, materializedSessionFile);
  try {
    let path = derivedPath
      ? getDerivedTranscriptPathForSession(sessionId)
      : (materializedSessionFile ?? getTranscriptPath());
    let outcome = await scanTranscriptForSuppression(
      path,
      {
        sid: sessionId || undefined,
      },
      storageV5,
    );
    return derivedPath && outcome === "clean" ? "torn" : outcome;
  } catch (error) {
    if (isENOENT(error)) {
      if (derivedPath) return "torn";
      return isTranscriptRelocationInProgress() ? "read-error" : "clean";
    }
    return "read-error";
  }
}
//@ chunk-5xgkngpb.js:465726-465788 facade-majority
function isTranscriptRelocationInProgress() {
  return getProject().isTranscriptRelocationInProgress();
}
//@ chunk-5xgkngpb.js:465788-465839 facade-majority
function mirrorInternalEntryForTesting(entry) {
  return getProject().mirrorInternalEntry(entry);
}
//@ chunk-5xgkngpb.js:465839-465874 facade-majority
var SUPPRESSION_SCAN_MAX_LINES = 1e5;
var SUPPRESSION_SCAN_MAX_LINES_ANT = 1e6;
var SUPPRESSION_SCAN_MAX_BYTES_ANT = 4294967296;
//@ chunk-5xgkngpb.js:465874-466118 facade-majority
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
  spend(line) {
    this.chars += line.length + 1;
    return ++this.lines >= this.maxLines || this.chars >= this.maxBytes;
  }
}
//@ chunk-5xgkngpb.js:466118-466133 facade-majority
var SUPPRESSION_SCAN_CHUNK_BYTES = 262144;
//@ chunk-5xgkngpb.js:466133-466263 facade-majority
function suppressionScanFailure(error) {
  if (isENOENT(error)) return "no-file";
  if (error instanceof FileChangedDuringReadError) return error.partialRead ? "partial-read" : "file-changed";
  return "read-error";
}
//@ chunk-5xgkngpb.js:466263-466280 facade-majority
function logSuppressionScan(info) {}
//@ chunk-5xgkngpb.js:466280-466774 facade-majority
async function scanTranscriptForSuppression(path, options, storageV5) {
  let storageKey =
    isStorageV5Enabled() && storageV5 !== undefined ? getTranscriptStorageKey(path, storageV5) : undefined;
  let budget =
    options.budget ??
    (storageKey !== undefined ? SuppressionScanBudget.forBackendRead() : new SuppressionScanBudget());
  let startMs = Date.now();
  let fileBytes;
  let lines =
    storageKey !== undefined
      ? openTranscriptStream(storageKey.backend, storageKey.key)
      : readLinesReverse(path, SUPPRESSION_SCAN_CHUNK_BYTES, {
          onOpen: (size) => {
            fileBytes = size;
          },
        });
  let outcome = "clean";
  let firstLine;
  try {
    for await (let line of lines) {
      firstLine ??= line;
      let exhausted = budget.spend(line);
      if (matchesHistorySuppressionLine(line, options)) {
        outcome = "found";
        return outcome;
      }
      if (exhausted) {
        outcome = "budget-exhausted";
        return outcome;
      }
    }
    return "clean";
  } catch (error) {
    outcome = suppressionScanFailure(error);
    throw error;
  } finally {
    logSuppressionScan({
      leg: "transcript-scan",
      throughBackend: storageKey !== undefined,
      outcome,
      lines: budget.lines,
      charsRead: budget.chars,
      fileBytes,
      startMs,
    });
  }
}
//@ chunk-5xgkngpb.js:466774-467188 facade-majority
async function scanAppendedForSuppression(path, snapshot, options, budget) {
  for (;;) {
    let size = 0;
    let consumed = 0;
    let lastLine;
    let anchored = false;
    try {
      for await (let line of readLinesReverse(path, SUPPRESSION_SCAN_CHUNK_BYTES, {
        onOpen: (openedSize) => {
          size = openedSize;
        },
      })) {
        if (size < snapshot.size) break;
        if (line === snapshot.lastLine && consumed === size - snapshot.size) {
          anchored = true;
          break;
        }
        lastLine ??= line;
        let exhausted = budget.spend(line);
        if (matchesHistorySuppressionLine(line, options)) return "found";
        if (exhausted) return "budget-exhausted";
        consumed += Buffer.byteLength(line) + 1;
      }
    } catch (error) {
      throw isENOENT(error) ? new FileChangedDuringReadError() : error;
    }
    if (size < snapshot.size) throw new FileChangedDuringReadError();
    if (size === snapshot.size && (anchored || lastLine === undefined)) return "clean";
    snapshot = {
      size,
      lastLine: lastLine ?? snapshot.lastLine,
    };
  }
}
//@ chunk-5xgkngpb.js:467188-467255 facade-majority (2.1.88 match: getErrorsPath, 1)
function isOwnTranscriptFile(sessionId, path) {
  return sessionId !== undefined && path != null && basename(path) === `${sessionId}.jsonl`;
}
//@ chunk-5xgkngpb.js:467255-467309 facade-majority (2.1.88 match: getErrorsPath, 1)
function getDerivedTranscriptPathForSession(sessionId) {
  let projectDir = resolveProjectDir();
  return join(projectDir, `${sessionId}.jsonl`);
}
//@ chunk-5xgkngpb.js:467309-467488 facade-majority
function matchesHistorySuppressionLine(line, options = {}) {
  if (!line.includes('"history-suppression"')) return false;
  try {
    let parsed = jsonParse(line);
    return (
      parsed.type === "history-suppression" && (options.sid === undefined || parsed.sessionId === options.sid)
    );
  } catch {
    return false;
  }
}
//@ chunk-5xgkngpb.js:467488-468010 facade-majority
function buildForkAdoptionMeta(meta, options = {}) {
  return {
    ...meta,
    ...(options.stripWorktreeSession && {
      worktreeSession: undefined,
    }),
    ...(options.stripRelocatedCwd && {
      relocatedCwd: undefined,
    }),
    memoryModeStamps: meta.memoryModeStamps?.map((memoryModeStamp) => ({
      ...memoryModeStamp,
      written: meta.forkedFromSessionId !== undefined ? (memoryModeStamp.written ?? true) : false,
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
//@ chunk-5xgkngpb.js:468010-468311 facade-majority
async function adoptForkSessionMetadata(meta, options) {
  let destSid = options.destSid ?? pinSessionId(getSessionId());
  let suppressed =
    meta.sessionHistorySuppressed === true || isSessionHistorySuppressedFor(pinSessionId(meta.sessionId));
  if (suppressed)
    await writeHistorySuppression(destSid, undefined, "fork_inherit", undefined, options.storageV5);
  restoreSessionMetadata(
    buildForkAdoptionMeta(
      suppressed && !meta.sessionHistorySuppressed
        ? {
            ...meta,
            sessionHistorySuppressed: true,
          }
        : meta,
      options,
    ),
    {
      taintSid: destSid,
      storageV5: options.storageV5,
    },
  );
  copyPrecautionarySuppressionTo(destSid, pinSessionId(meta.sessionId));
}
//@ chunk-5xgkngpb.js:468311-468366 facade-majority
function holdSessionHistorySuppression() {
  getProject().currentSessionHistorySuppressed = true;
}
//@ chunk-5xgkngpb.js:468366-468452 facade-majority
function holdSessionHistorySuppressionFor(sid) {
  markSessionHistorySuppressedFor(sid);
  if (sid !== undefined && sid === getSessionId()) getProject().currentSessionHistorySuppressed = true;
}
//@ chunk-5xgkngpb.js:468452-468567 facade-majority
function markSessionHistorySuppressedFor(sid) {
  if (sid === undefined) return;
  let project = getProject();
  project.knownTaintedSessionIds ??= new Set();
  project.knownTaintedSessionIds.add(sid);
}
//@ chunk-5xgkngpb.js:468567-468643 facade-majority
function isSessionHistorySuppressedFor(sid) {
  return sid !== undefined && getProject().knownTaintedSessionIds?.has(sid) === true;
}
//@ chunk-5xgkngpb.js:468643-468702 facade-majority
function dropSessionHistorySuppression() {
  getProject().currentSessionHistorySuppressed = undefined;
}
//@ chunk-5xgkngpb.js:468702-468726 facade-majority
function pinSessionId(sessionId) {
  return sessionId;
}
//@ chunk-5xgkngpb.js:468726-468865 facade-majority
function holdPrecautionarySuppressionFor(transcriptPath) {
  if (!transcriptPath) return;
  let project = getProject();
  project.currentSessionPrecautionarySuppression ??= new Set();
  project.currentSessionPrecautionarySuppression.add(transcriptPath);
}
//@ chunk-5xgkngpb.js:468865-469008 facade-majority
function dropPrecautionarySuppressionForTesting() {
  getProject().currentSessionPrecautionarySuppression = undefined;
  getProject().clearResilientPrecautionSids = undefined;
  getProject().scanUncertaintyHoldSids = undefined;
}
//@ chunk-5xgkngpb.js:469008-469133 facade-majority
function releasePrecautionarySuppressionFor(sid) {
  let project = getProject();
  if (sid && !project.clearResilientPrecautionSids?.has(sid))
    project.currentSessionPrecautionarySuppression?.delete(sid);
}
//@ chunk-5xgkngpb.js:469133-469260 facade-majority
function markPrecautionClearResilientFor(sid) {
  if (sid === undefined) return;
  let project = getProject();
  project.clearResilientPrecautionSids ??= new Set();
  project.clearResilientPrecautionSids.add(sid);
}
//@ chunk-5xgkngpb.js:469260-469377 facade-majority
function markScanUncertaintyHoldFor(sid) {
  if (sid === undefined) return;
  let project = getProject();
  project.scanUncertaintyHoldSids ??= new Set();
  project.scanUncertaintyHoldSids.add(sid);
}
//@ chunk-5xgkngpb.js:469377-469454 facade-majority
function isScanUncertaintyHoldFor(sid) {
  return sid !== undefined && getProject().scanUncertaintyHoldSids?.has(sid) === true;
}
//@ chunk-5xgkngpb.js:469454-469531 facade-majority
function claimPrecautionHoldForObservedCause(boundSessionKey) {
  if (boundSessionKey === undefined) return;
  getProject().scanUncertaintyHoldSids?.delete(boundSessionKey);
}
//@ chunk-5xgkngpb.js:469531-469754 facade-majority
function releaseScanUncertaintyHoldFor(sid) {
  if (sid === undefined) return;
  let project = getProject();
  if (!project.scanUncertaintyHoldSids?.has(sid)) return;
  project.scanUncertaintyHoldSids.delete(sid);
  project.clearResilientPrecautionSids?.delete(sid);
  project.currentSessionPrecautionarySuppression?.delete(sid);
}
//@ chunk-5xgkngpb.js:469754-469788 facade-majority
function isPrecautionarySuppressionHeld() {
  return isPrecautionarySuppressionHeldFor(pinSessionId(getSessionId()));
}
//@ chunk-5xgkngpb.js:469788-469879 facade-majority
function isPrecautionarySuppressionHeldFor(sid) {
  return sid !== undefined && getProject().currentSessionPrecautionarySuppression?.has(sid) === true;
}
//@ chunk-5xgkngpb.js:469879-470072 facade-majority
function copyPrecautionarySuppressionTo(from, to) {
  if (!from || !to) return;
  let project = getProject();
  let currentSessionPrecautionarySuppression = project.currentSessionPrecautionarySuppression;
  if (currentSessionPrecautionarySuppression?.has(to)) {
    currentSessionPrecautionarySuppression.add(from);
    if (project.clearResilientPrecautionSids?.has(to)) project.clearResilientPrecautionSids.add(from);
  }
}
//@ chunk-5xgkngpb.js:470072-470120 facade-majority
function registerLiveSuppressionProbe(probe) {
  currentTranscriptStore().setLiveSuppressionProbe(probe);
}
//@ chunk-5xgkngpb.js:470120-470177 facade-majority
function isLiveBridgeSuppressed() {
  return currentTranscriptStore().liveSuppressionProbe?.() === true;
}
//@ chunk-5xgkngpb.js:470177-470198 facade-majority (2.1.88 match: orgStatus, 1)
var PENDING_BRIDGE_SESSION = "pending";
var PENDING_BRIDGE_SESSION_2;
//@ chunk-5xgkngpb.js:470198-470219 facade-majority
function registerForeignConversationProbe(probe) {
  PENDING_BRIDGE_SESSION_2 = probe;
}
//@ chunk-5xgkngpb.js:470219-470255 facade-majority
function bridgeSessionsForPulledRow(uuid) {
  return pulledRows_2()?.get(uuid);
}
//@ chunk-5xgkngpb.js:470255-470338 layout
function firstConcreteBridgeSession(sids) {
  if (sids === undefined) return;
  for (let sid of sids) if (sid !== PENDING_BRIDGE_SESSION) return sid;
  return PENDING_BRIDGE_SESSION;
}
//@ chunk-5xgkngpb.js:470338-470377 layout
function pulledRows_2() {
  return PENDING_BRIDGE_SESSION_2?.().pulledRows;
}
//@ chunk-5xgkngpb.js:470377-470551 facade-majority
function isRowForeignToBridgeSession(row, bridgeSessionId) {
  if (bridgeSessionId === undefined) return false;
  if (row.foreignToBridgeSession === bridgeSessionId || row.foreignToBridgeSession === PENDING_BRIDGE_SESSION)
    return true;
  let sids = bridgeSessionsForPulledRow(row.uuid);
  return sids !== undefined && (sids.has(bridgeSessionId) || sids.has(PENDING_BRIDGE_SESSION));
}
//@ chunk-5xgkngpb.js:470551-470592 facade-majority
function isBridgeBindingForeign() {
  return PENDING_BRIDGE_SESSION_2?.().foreign === true;
}
//@ chunk-5xgkngpb.js:470592-470699 facade-majority
function isForeignToBinding(sid) {
  let binding = PENDING_BRIDGE_SESSION_2?.();
  if (binding?.foreign !== true) return false;
  if (!sid || !binding.boundSid) return true;
  return sid !== binding.boundSid;
}
//@ chunk-5xgkngpb.js:470699-470811 facade-majority
function bridgeSessionForPulledWindow(sid) {
  let pulledWindow = PENDING_BRIDGE_SESSION_2?.().pulledWindow;
  return pulledWindow !== undefined && sid !== undefined && pulledWindow.sids.has(sid)
    ? pulledWindow.bridgeSessionId
    : undefined;
}
//@ chunk-5xgkngpb.js:470811-470849 facade-majority
function getBridgeBoundConversationSid() {
  return PENDING_BRIDGE_SESSION_2?.().boundSid;
}
//@ chunk-5xgkngpb.js:470849-470920 facade-majority
function isCompactPairWithheldFromRemote() {
  return (
    isSessionHistorySuppressed() ||
    getCurrentSessionBridge()?.noHistoryBackfill === true ||
    isLiveBridgeSuppressed() ||
    isPrecautionarySuppressionHeld()
  );
}
//@ chunk-5xgkngpb.js:470920-470971 facade-majority
function isRemoteEgressSuppressedFor(sid) {
  return (
    isForeignToBinding(sid) ||
    isCompactPairWithheldFromRemote() ||
    isPrecautionarySuppressionHeldFor(sid) ||
    isSessionHistorySuppressedFor(sid)
  );
}
//@ chunk-5xgkngpb.js:470971-471015 facade-majority
function isConversationEgressTainted(sid) {
  return (
    isCompactPairWithheldFromRemote() ||
    isPrecautionarySuppressionHeldFor(sid) ||
    isSessionHistorySuppressedFor(sid)
  );
}
//@ chunk-5xgkngpb.js:471015-471040 facade-majority
function clearBridgeSessionCache() {
  clearBridgeSessionFields(getProject());
}
//@ chunk-5xgkngpb.js:471040-471339 layout
function clearBridgeSessionFields(project) {
  project.currentSessionBridgeId = undefined;
  project.currentSessionBridgeSeq = undefined;
  project.currentSessionBridgeDialogKinds = undefined;
  project.currentSessionBridgeGroupingId = undefined;
  project.currentSessionBridgeNoBackfill = undefined;
  project.currentSessionBridgeOwnerAccountUuid = undefined;
  project.currentSessionBridgeOwnerOrganizationUuid = undefined;
}
//@ chunk-5xgkngpb.js:471339-471574 facade-majority
function clearBridgeSession(sessionId, path, options, storageV5) {
  let sid = sessionId ?? getSessionId();
  let project = getProject();
  if (needsTranscriptTarget(project, path, options))
    appendEntryToFileAsync(
      path ?? getTranscriptPathForSession(sid),
      {
        type: "bridge-session",
        sessionId: sid,
        bridgeSessionId: "",
        lastSequenceNum: 0,
      },
      storageV5,
    ).catch((error) => {
      logForDebugging(`clearBridgeSession: transcript append failed: ${errorMessage(error)}`);
    });
  if (sid === getSessionId()) clearBridgeSessionFields(project);
}
//@ chunk-5xgkngpb.js:471574-471972 facade-majority
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
//@ chunk-5xgkngpb.js:471972-472037 facade-majority (2.1.88 match: getCurrentSessionTitle, 1)
/**
 * 当前（或指定）会话的自定义标题。
 */
function getCurrentSessionTitle(sessionId) {
  if (sessionId === getSessionId()) return getProject().currentSessionTitle;
  return;
}
//@ chunk-5xgkngpb.js:472037-472105 facade-majority
function getCurrentSessionAiTitle(sessionId) {
  if (sessionId === getSessionId()) return getProject().currentSessionAiTitle;
  return;
}
//@ chunk-5xgkngpb.js:472105-472141 facade-majority
function getCurrentSessionDisplayTitle(sessionId) {
  return getCurrentSessionTitle(sessionId) ?? getCurrentSessionAiTitle(sessionId);
}
//@ chunk-5xgkngpb.js:472141-472183 facade-majority
function getCurrentSessionPeerName() {
  return getRegisteredSessionName()?.name ?? getCurrentSessionDisplayTitle(getSessionId());
}
//@ chunk-5xgkngpb.js:472183-472273 facade-majority
function getCurrentSessionOffBoxPeerName() {
  let registeredSessionName = getRegisteredSessionName();
  return (
    (registeredSessionName !== undefined && registeredSessionName.source !== "derived"
      ? registeredSessionName.name
      : undefined) ?? getCurrentSessionDisplayTitle(getSessionId())
  );
}
//@ chunk-5xgkngpb.js:472273-472321 facade-majority
function getCurrentSessionPeerNameFor(kind) {
  return kind === "bridge" ? getCurrentSessionOffBoxPeerName() : getCurrentSessionPeerName();
}
//@ chunk-5xgkngpb.js:472321-472373 facade-majority (2.1.88 match: getCurrentSessionAgentColor, 1)
function getCurrentSessionAgentColor() {
  return getProject().currentSessionAgentColor;
}
//@ chunk-5xgkngpb.js:472373-472424 facade-majority
function getCurrentSessionAgentName() {
  return getProject().currentSessionAgentName;
}
//@ chunk-5xgkngpb.js:472424-472499 facade-majority
function restoreConversationToolsUsed(toolsUsed, messages) {
  let conversationToolsUsed = getConversationToolsUsed();
  conversationToolsUsed.record(toolsUsed ?? []);
  conversationToolsUsed.record(collectToolsUsedBeforeSummary(messages ?? [], undefined, false));
}
//@ chunk-5xgkngpb.js:472499-472582 facade-majority (2.1.88 match: setSessionFileForTesting, 0.526)
function markToolsUsedWritten() {
  let project = getProject();
  project.toolsUsedStamp = `${project.sessionFile}
${getConversationToolsUsed().generation()}`;
}
//@ chunk-5xgkngpb.js:472582-475351 facade-majority
/**
 * resume 时把日志中的会话元数据（标题、AI 标题、tag、cwd 迁移、代理名/颜色/设置、模式、PR、worktree 等）装回 Project 当前会话字段。
 */
function restoreSessionMetadata(meta, options) {
  let project = getProject();
  if (meta.customTitle) project.currentSessionTitle ??= meta.customTitle;
  if (meta.aiTitle) project.currentSessionAiTitle ??= meta.aiTitle;
  if (meta.customTitle || meta.aiTitle) currentTranscriptStore().sessionTitleChanged.emit();
  if (meta.tag !== undefined) project.currentSessionTag = meta.tag || undefined;
  if (meta.relocatedCwd) project.currentSessionRelocatedCwd ??= meta.relocatedCwd;
  if (meta.agentName) project.currentSessionAgentName ??= meta.agentName;
  if (meta.agentColor) project.currentSessionAgentColor ??= meta.agentColor;
  if (meta.agentSetting) project.currentSessionAgentSetting = meta.agentSetting;
  if (meta.mode) project.currentSessionMode = meta.mode;
  if (meta.permissionMode) project.currentSessionPermissionMode = meta.permissionMode;
  if (meta.replMode !== undefined) project.currentSessionCodeMode = meta.replMode;
  if (meta.sessionOwner?.accountUuid) project.currentSessionOwner = meta.sessionOwner;
  if (meta.isolationLatch) project.currentSessionIsolationLatch = meta.isolationLatch;
  if (meta.devModsFolder)
    if (isSessionFileAt(meta.devModsFolder, getSessionId()))
      project.currentSessionDevModsFolder = meta.devModsFolder;
    else logForDebugging("dev mods: dropped a restored dev-mods folder not this session's");
  if (meta.memoryModeStamps) {
    project.currentSessionMemoryModeStamps = meta.memoryModeStamps.map((memoryModeStamp) => ({
      ...memoryModeStamp,
      written: memoryModeStamp.written ?? true,
    }));
    let last = meta.memoryModeStamps.at(-1);
    resetAgentLatches();
  }
  if (meta.atisLatch !== undefined) setConversationAtisLatch(meta.atisLatch);
  if (meta.toolsUsed !== undefined || meta.messages !== undefined)
    restoreConversationToolsUsed(meta.toolsUsed, meta.messages);
  if (meta.worktreeSession !== undefined) project.currentSessionWorktree = meta.worktreeSession;
  if (meta.artifactCommentMonitor !== undefined)
    project.resumedArtifactCommentMonitor = meta.artifactCommentMonitor;
  if (meta.artifactAutoReactLedger !== undefined)
    project.resumedArtifactAutoReactLedger = meta.artifactAutoReactLedger;
  if (meta.prNumber !== undefined) project.currentSessionPrNumber = meta.prNumber;
  if (meta.prUrl) project.currentSessionPrUrl = meta.prUrl;
  if (meta.prRepository) project.currentSessionPrRepository = meta.prRepository;
  if (meta.artifactCount !== undefined) project.currentSessionArtifactCount = meta.artifactCount;
  if (meta.bridgeSessionId) {
    project.currentSessionBridgeId = meta.bridgeSessionId;
    project.currentSessionBridgeSeq = meta.bridgeLastSeq;
    project.currentSessionBridgeDialogKinds = meta.bridgeDialogKinds?.length
      ? meta.bridgeDialogKinds
      : undefined;
    project.currentSessionBridgeGroupingId = meta.bridgeSessionGroupingId;
    project.currentSessionBridgeNoBackfill = meta.bridgeNoHistoryBackfill ? true : undefined;
    project.currentSessionBridgeOwnerAccountUuid = meta.bridgeOwnerAccountUuid;
    project.currentSessionBridgeOwnerOrganizationUuid = meta.bridgeOwnerOrganizationUuid;
  }
  if (meta.sessionHistorySuppressed) {
    let sid = options?.taintSid ?? pinSessionId(getSessionId());
    let isOwn = sid !== undefined && sid === getSessionId();
    let needsSeed = isOwn && !project.currentSessionHistorySuppressed;
    if (isOwn) project.currentSessionHistorySuppressed = true;
    markSessionHistorySuppressedFor(sid);
    if (needsSeed && sid !== undefined) {
      let materializedSessionFile = getMaterializedSessionFile();
      if (!(materializedSessionFile !== null && !isOwnTranscriptFile(sid, materializedSessionFile))) {
        let path = materializedSessionFile ?? getTranscriptPathForSession(sid);
        let storageV5 = options?.storageV5;
        (async () => {
          if (
            (await scanTranscriptForSuppression(
              path,
              {
                sid,
              },
              storageV5,
            )) === "clean"
          )
            await writeHistorySuppression(sid, path, "meta_seed", undefined, storageV5);
        })().catch((error) => {
          logForDebugging(`restoreSessionMetadata meta_seed failed: ${errorMessage(error)}`);
        });
      }
    }
  }
  if (meta.lastPrompt !== undefined) project.currentSessionLastPrompt = meta.lastPrompt;
  if (meta.leafUuid !== undefined) project.currentSessionLeafUuid = meta.leafUuid;
  if (meta.leafTs !== undefined) project.currentSessionLeafTs = meta.leafTs;
}
//@ chunk-5xgkngpb.js:475351-476867 facade-majority (2.1.88 match: restoreSessionMetadata, 0.432)
function snapshotSessionMetadata() {
  let project = getProject();
  let metadata = {
    customTitle: project.currentSessionTitle,
    aiTitle: project.currentSessionAiTitle,
    tag: project.currentSessionTag,
    relocatedCwd: project.currentSessionRelocatedCwd,
    agentName: project.currentSessionAgentName,
    agentColor: project.currentSessionAgentColor,
    agentSetting: project.currentSessionAgentSetting,
    mode: project.currentSessionMode,
    permissionMode: project.currentSessionPermissionMode,
    sessionOwner: project.currentSessionOwner,
    isolationLatch: project.currentSessionIsolationLatch,
    devModsFolder: project.currentSessionDevModsFolder,
    memoryModeStamps: project.currentSessionMemoryModeStamps.map(({ inFlight, ...rest }) => rest),
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
  metadata.replMode = project.currentSessionCodeMode;
  return metadata;
}
//@ chunk-5xgkngpb.js:476867-477887 facade-majority (2.1.88 match: clearSessionMetadata, 0.587)
/**
 * 清空 Project 中当前会话的全部元数据字段（/clear、新会话时）。
 */
function clearSessionMetadata() {
  let project = getProject();
  let titleChanged = project.currentSessionTitle !== undefined || project.currentSessionAiTitle !== undefined;
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
  project.currentSessionCodeMode = undefined;
  project.currentSessionOwner = undefined;
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
  if (titleChanged) currentTranscriptStore().sessionTitleChanged.emit();
}
//@ chunk-5xgkngpb.js:477887-477938 facade-majority (2.1.88 match: reAppendSessionMetadata, 1)
/**
 * 把当前会话元数据（标题、tag、last-prompt 等）重新追加到转录尾部，使 lite 读取（只读头尾）也能拿到最新元数据。
 */
function reAppendSessionMetadata() {
  getProject().reAppendSessionMetadata(false, true);
}
//@ chunk-5xgkngpb.js:477938-478093 facade-majority
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
//@ chunk-5xgkngpb.js:478093-478180 facade-majority
async function appendToolsUsedEntryBeforeClear(storageV5) {
  try {
    await getProject().appendToolsUsedEntryIfGrown(getSessionId(), storageV5);
  } catch (error) {
    logError(error);
  }
}
//@ chunk-5xgkngpb.js:478180-478245 facade-majority
function subscribeSessionAgentNameChanged(listener) {
  return currentTranscriptStore().sessionAgentNameChanged.subscribe(listener);
}
//@ chunk-5xgkngpb.js:478245-478588 facade-majority (2.1.88 match: saveAgentName, 0.751)
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
//@ chunk-5xgkngpb.js:478588-478880 facade-majority (2.1.88 match: saveAgentColor, 0.845)
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
//@ chunk-5xgkngpb.js:478880-478930 facade-majority (2.1.88 match: saveAgentSetting, 1)
function saveAgentSetting(agentSetting) {
  getProject().currentSessionAgentSetting = agentSetting;
}
//@ chunk-5xgkngpb.js:478930-478991 facade-majority
function subscribeSessionTitleChanged(listener) {
  return currentTranscriptStore().sessionTitleChanged.subscribe(listener);
}
//@ chunk-5xgkngpb.js:478991-479065 facade-majority (2.1.88 match: cacheSessionTitle, 0.563)
function cacheSessionTitle(customTitle) {
  getProject().currentSessionTitle = customTitle;
  currentTranscriptStore().sessionTitleChanged.emit();
}
//@ chunk-5xgkngpb.js:479065-479142 facade-majority
function cacheAiTitle(currentSessionAiTitle) {
  getProject().currentSessionAiTitle = currentSessionAiTitle;
  currentTranscriptStore().sessionTitleChanged.emit();
}
//@ chunk-5xgkngpb.js:479142-479225 facade-majority
function cacheAgentName(currentSessionAgentName) {
  getProject().currentSessionAgentName = currentSessionAgentName;
  currentTranscriptStore().sessionAgentNameChanged.emit();
}
//@ chunk-5xgkngpb.js:479225-479335 facade-majority
function titleCacheStillOn(id, name, suffixBase) {
  let currentSessionTitle = getCurrentSessionTitle(id);
  let cachedTitle = currentSessionTitle && sanitizeSessionTitle(currentSessionTitle);
  if (!cachedTitle) return true;
  let cachedSlug = slugifySessionName(cachedTitle);
  return (
    cachedSlug === slugifySessionName(name) ||
    (suffixBase !== undefined && cachedSlug === slugifySessionName(suffixBase))
  );
}
//@ chunk-5xgkngpb.js:479335-479543 facade-majority
function cacheHookSessionTitle(title) {
  if (isTeammate()) return false;
  let sanitized = sanitizeSessionTitle(title);
  if (!sanitized) return false;
  let currentSessionTitle = getCurrentSessionTitle(getSessionId());
  let currentSanitized = currentSessionTitle && sanitizeSessionTitle(currentSessionTitle);
  if (
    sanitized === currentSanitized ||
    settledYieldFor(sanitized, currentSanitized || undefined) !== undefined
  )
    return false;
  logForDebugging(`Hook sessionTitle cached (${[...sanitized].length} chars)`);
  cacheSessionTitle(sanitized);
  cacheAgentName(sanitized);
  return true;
}
//@ chunk-5xgkngpb.js:479543-479835 facade-majority
async function applyResumeHookSessionTitle(title, sessionFile, storageV5) {
  if (!cacheHookSessionTitle(title) || !currentSessionFileIsFor(sessionFile)) return;
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
//@ chunk-5xgkngpb.js:479835-479876 facade-majority (2.1.88 match: saveMode, 1)
/**
 * 记录会话模式（mode 记录）。
 */
function saveMode(mode) {
  getProject().currentSessionMode = mode;
}
//@ chunk-5xgkngpb.js:479876-479928 facade-majority
function savePermissionMode(currentSessionPermissionMode) {
  getProject().currentSessionPermissionMode = currentSessionPermissionMode;
}
//@ chunk-5xgkngpb.js:479928-479945 facade-majority
function saveAutoMemorySessionSwitch(options) {}
//@ chunk-5xgkngpb.js:479945-479992 facade-majority
function getSessionOwner() {
  return getProject().currentSessionOwner;
}
//@ chunk-5xgkngpb.js:479992-480082 facade-majority
function saveSessionOwner(owner) {
  getProject().currentSessionOwner = owner;
  queueSessionMetadataEntry({
    type: "session-owner",
    ...owner,
    sessionId: getSessionId(),
  });
}
//@ chunk-5xgkngpb.js:480082-480192 facade-majority
function queueSessionMetadataEntry(entry) {
  let project = getProject();
  if (project.sessionFilePath)
    project.appendEntry(entry, undefined, undefined, project.exitReStampSource()).catch(logError);
}
//@ chunk-5xgkngpb.js:480192-480592 facade-majority
function saveIsolationLatch(side, storageV5) {
  let project = getProject();
  if (project.currentSessionIsolationLatch === side) return;
  project.currentSessionIsolationLatch = side;
  if (project.sessionFilePath) {
    let sessionFilePath = project.sessionFilePath;
    appendEntryToFileAsync(
      sessionFilePath,
      {
        type: "isolation-latch",
        side,
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
//@ chunk-5xgkngpb.js:480592-480648 facade-majority
function getCurrentSessionIsolationLatch() {
  return getProject().currentSessionIsolationLatch;
}
//@ chunk-5xgkngpb.js:480648-481018 facade-majority
function saveDevModsFolder(folder, storageV5) {
  let project = getProject();
  if (project.currentSessionDevModsFolder === folder) return;
  project.currentSessionDevModsFolder = folder;
  if (project.sessionFilePath) {
    let sessionFilePath = project.sessionFilePath;
    appendEntryToFileAsync(
      sessionFilePath,
      {
        type: "dev-mods",
        folder,
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
//@ chunk-5xgkngpb.js:481018-481073 facade-majority
function getCurrentSessionDevModsFolder() {
  return getProject().currentSessionDevModsFolder;
}
//@ chunk-5xgkngpb.js:481073-481791 facade-majority
function saveMemoryMode({ mode, afterUuid, reason, account, accountChoice, timestamp }, storageV5) {
  let project = getProject();
  let stamp = {
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
  project.currentSessionMemoryModeStamps.push(stamp);
  if (project.sessionFilePath) {
    let sessionFilePath = project.sessionFilePath;
    appendEntryToFileAsync(
      sessionFilePath,
      {
        type: "memory-mode",
        mode,
        afterUuid,
        timestamp: stamp.timestamp,
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
        stamp.written = true;
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
//@ chunk-5xgkngpb.js:481791-481849 facade-majority
function getCurrentSessionMemoryModeStamps() {
  return getProject().currentSessionMemoryModeStamps;
}
//@ chunk-5xgkngpb.js:481849-481889 layout
function resetAgentLatches() {
  if (getRestoredMemoryPause()) {
    setRestoredMemoryPause(false);
    setMemoryToggledOff(false);
  }
}
//@ chunk-5xgkngpb.js:481889-481929 layout
function resetAtisLatches() {
  if (getRestoredAutoMemoryOff()) {
    setRestoredAutoMemoryOff(false);
    setAutoMemoryOffThisSession(false);
  }
}
//@ chunk-5xgkngpb.js:481929-481952 facade-majority
function memoryPauseToggledByPerson() {
  setRestoredMemoryPause(false);
}
//@ chunk-5xgkngpb.js:481952-482018 facade-majority (2.1.88 match: recordContextCollapseCommit, 1)
async function recordArtifactCommentMonitor(entry, storageV5) {
  await getProject().appendEntry(entry, undefined, undefined, storageV5);
}
//@ chunk-5xgkngpb.js:482018-482126 facade-majority
function takeResumedArtifactCommentMonitor() {
  let project = getProject();
  let resumedArtifactCommentMonitor = project.resumedArtifactCommentMonitor;
  project.resumedArtifactCommentMonitor = undefined;
  return resumedArtifactCommentMonitor;
}
//@ chunk-5xgkngpb.js:482126-482236 facade-majority
function takeResumedArtifactAutoReactLedger() {
  let project = getProject();
  let resumedArtifactAutoReactLedger = project.resumedArtifactAutoReactLedger;
  project.resumedArtifactAutoReactLedger = undefined;
  return resumedArtifactAutoReactLedger;
}
//@ chunk-5xgkngpb.js:482236-482294 facade-majority
function peekResumedArtifactAutoReactLedger() {
  return getProject().resumedArtifactAutoReactLedger;
}
//@ chunk-5xgkngpb.js:482294-482305 facade-majority
var UNLATCHED_RESUMED_ATIS = "";
//@ chunk-5xgkngpb.js:482305-482344 layout
function getOrEmptyString(atisLatches, sessionId) {
  return atisLatches.get(sessionId) ?? UNLATCHED_RESUMED_ATIS;
}
//@ chunk-5xgkngpb.js:482344-482368 facade-majority
var worktreeStateSignals; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-5xgkngpb.js:482344", () => {
  worktreeStateSignals = new HostScoped(() => createSignal());
});
//@ chunk-5xgkngpb.js:482368-483012 facade-majority (2.1.88 match: saveWorktreeState, 0.741)
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
//@ chunk-5xgkngpb.js:483012-483093 facade-majority (2.1.88 match: getSessionIdFromLog, 0)
/**
 * 从日志对象取 sessionId（最后一条消息的 sessionId 或日志自身）。
 */
function getSessionIdFromLog(log) {
  if (log.sessionId) return log.sessionId;
  return log.messages[0]?.sessionId;
}
//@ chunk-5xgkngpb.js:483093-483160 facade-majority
function isLiteLog(log) {
  return log.messages.length === 0 && log.sessionId !== undefined;
}
//@ chunk-5xgkngpb.js:483160-486412 facade-majority (2.1.88 match: loadFullLog, 0.528)
/**
 * 把 lite 日志（只读了头尾元数据）补全为完整日志：读取整份转录并建对话链。
 */
async function loadFullLog(log, options) {
  if (!isLiteLog(log)) return log;
  let sessionFile = log.fullPath;
  if (!sessionFile) return log;
  try {
    let transcriptStorageKey = getTranscriptStorageKey(sessionFile, options?.storageV5);
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
      sessionOwners,
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
    let marker = {
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
      sessionOwner: sessionId ? sessionOwners?.get(sessionId) : log.sessionOwner,
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
      attributionSnapshots: buildAttributionSnapshotChain(attributionSnapshots),
      contentReplacements: sessionId ? (contentReplacements.get(sessionId) ?? []) : log.contentReplacements,
      fileSnapshots: getFileSnapshotMessages(messages),
    };
    marker.replMode = sessionId ? weakMap_7.get(messages)?.get(sessionId) : log.replMode;
    return marker;
  } catch (error) {
    if (isTranscriptLoadError(error)) {
      logForDebugging(`loadFullLog: transcript unreadable (${getErrnoCode(error)}): ${errorMessage(error)}`, {
        level: "error",
      });
      options?.onTranscriptUnreadable?.(sanitizedErrnoLowerForTelemetry(error));
    } else logError(error);
    return log;
  }
}
//@ chunk-5xgkngpb.js:486412-486931 facade-majority (2.1.88 match: searchSessionsByCustomTitle, 0.913)
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
  deduplicated.sort((a, b) => b.modified.getTime() - a.modified.getTime());
  if (limit) return deduplicated.slice(0, limit);
  return deduplicated;
}
//@ chunk-5xgkngpb.js:486931-487239 layout (2.1.88 match: hasPrefix, 1)
function hasPrefix_2(src, prefix, at, end) {
  let firstByte = end[0];
  let endLength = end.length;
  let depth = 0;
  let inString = false;
  let escapeNext = false;
  for (let index = prefix; index < at; index++) {
    let byte = src[index];
    if (escapeNext) {
      escapeNext = false;
      continue;
    }
    if (inString) {
      if (byte === 92) escapeNext = true;
      else if (byte === 34) inString = false;
      continue;
    }
    if (
      depth === 1 &&
      byte === firstByte &&
      index + endLength <= at &&
      src.compare(end, 0, endLength, index, index + endLength) === 0
    )
      return index;
    if (byte === 34) inString = true;
    else if (byte === 123) depth++;
    else if (byte === 125) depth--;
  }
  return -1;
}
//@ chunk-5xgkngpb.js:487239-487504 file-local
function pickDepthOneUuidCandidate(buf, lineStart, candidates) {
  let depth = 0;
  let inString = false;
  let escapeNext = false;
  let candidateIndex = 0;
  for (let i = lineStart; candidateIndex < candidates.length; i++) {
    if (i === candidates[candidateIndex]) {
      if (depth === 1 && !inString) return candidates[candidateIndex];
      candidateIndex++;
    }
    let byte = buf[i];
    if (escapeNext) escapeNext = false;
    else if (inString) {
      if (byte === 92) escapeNext = true;
      else if (byte === 34) inString = false;
    } else if (byte === 34) inString = true;
    else if (byte === 123) depth++;
    else if (byte === 125) depth--;
  }
  return candidates.at(-1);
}
//@ chunk-5xgkngpb.js:487504-489784 fingerprint (2.1.88 match: walkChainBeforeParse, 0.912)
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
      let chosen = suffixN ? pickDepthOneUuidCandidate(buf, pos, suffixN) : suffix0 >= 0 ? suffix0 : firstAny;
      if (chosen >= 0) {
        let uuidStart = chosen + KEY_LEN;
        let uuid = buf.toString("latin1", uuidStart, uuidStart + 36);
        uuidToSlot.set(uuid, msgIdx.length);
        msgIdx.push(pos, lineEnd, parentStart);
      } else metaRanges.push(pos, lineEnd);
    } else metaRanges.push(pos, lineEnd);
    pos = lineEnd;
  }
  let leafSlot = -1;
  let leafStarts = [];
  for (let i = msgIdx.length - 3; i >= 0; i -= 3) {
    if (buf.subarray(msgIdx[i], msgIdx[i + 1]).includes(SIDECHAIN_TRUE)) continue;
    if (msgIdx[i + 2] < 0) {
      let slot = parseSlot(i);
      if (slot === null || isFileSnapshotMessage(slot)) {
        leafStarts.push(i);
        continue;
      }
    }
    leafSlot = i;
    break;
  }
  if (leafSlot < 0) return buf;
  function parentSlot(slot) {
    let parentStart = msgIdx[slot + 2];
    return parentStart < 0
      ? undefined
      : uuidToSlot.get(buf.toString("latin1", parentStart, parentStart + 36));
  }
  let keptSlots = new Set(leafStarts);
  let keptBytes = 0;
  let slot = leafSlot;
  while (slot !== undefined) {
    if (keptSlots.has(slot)) break;
    keptSlots.add(slot);
    keptBytes += msgIdx[slot + 1] - msgIdx[slot];
    slot = parentSlot(slot);
  }
  if (len - keptBytes < len >> 1) return buf;
  let kindBySlot = new Map();
  let cache = new Map();
  function parseSlot(slot) {
    try {
      let parsed = jsonParseRaw(buf.toString("utf8", msgIdx[slot], msgIdx[slot + 1]));
      return isPlainObject_4(parsed) ? parsed : null;
    } catch {
      return null;
    }
  }
  function classify(entry) {
    if (entry !== null && isAssistantTranscriptEntry(entry))
      return {
        kind: "assistant",
        id: getAssistantMessageId(entry, null),
      };
    if (entry !== null && isProgressOrHiddenEntry(entry))
      return {
        kind: "runLink",
        id: null,
      };
    return {
      kind: "other",
      id: null,
    };
  }
  function classifySlot(slot) {
    let kind = kindBySlot.get(slot);
    if (kind === undefined) {
      kind = classify(parseSlot(slot));
      kindBySlot.set(slot, kind);
    }
    return kind;
  }
  function assistantIdFor(start) {
    let visited = new Set();
    let assistantId = null;
    let slot = start;
    while (slot !== undefined && !visited.has(slot)) {
      let cachedId = cache.get(slot);
      if (cachedId !== undefined) {
        assistantId = cachedId;
        break;
      }
      visited.add(slot);
      let kind = classifySlot(slot);
      if (kind.kind === "assistant") {
        assistantId = kind.id;
        break;
      }
      slot = parentSlot(slot);
    }
    for (let slot of visited) cache.set(slot, assistantId);
    return assistantId;
  }
  let parts = [];
  let m = 0;
  for (let i = 0; i < msgIdx.length; i += 3) {
    let start = msgIdx[i];
    while (m < metaRanges.length && metaRanges[m] < start) {
      parts.push(buf.subarray(metaRanges[m], metaRanges[m + 1]));
      m += 2;
    }
    if (!keptSlots.has(i)) {
      let parentIndex = parentSlot(i);
      if (parentIndex === undefined || !keptSlots.has(parentIndex)) continue;
      let parsed = parseSlot(i);
      if (parsed === null || hasMalformedMessage(parsed)) continue;
      let kind = classify(parsed);
      kindBySlot.set(i, kind);
      if (isChainLinkCandidate(parsed, kind.kind === "assistant" ? assistantIdFor(parentIndex) : null))
        keptSlots.add(i);
      else if (classifySlot(parentIndex).kind !== "runLink") continue;
    }
    parts.push(buf.subarray(start, msgIdx[i + 1]));
  }
  while (m < metaRanges.length) {
    parts.push(buf.subarray(metaRanges[m], metaRanges[m + 1]));
    m += 2;
  }
  return Buffer.concat(parts);
}
//@ chunk-5xgkngpb.js:489784-490556 layout
function createFileChunkReader(path, size) {
  let buffer = Buffer.allocUnsafe(1048576);
  let fd = openSync(path, "r");
  function readFully(buffer, length, offset) {
    let filled = 0;
    while (filled < length) {
      let bytesRead = readSync(fd, buffer, filled, length - filled, offset + filled);
      if (bytesRead === 0) break;
      filled += bytesRead;
    }
    return filled;
  }
  let lineBuffer = Buffer.allocUnsafe(65536);
  function scan(emit) {
    let lineStart = -1;
    let position = 0;
    while (position < size) {
      let bytesRead = readSync(fd, buffer, 0, Math.min(1048576, size - position), position);
      if (bytesRead === 0) break;
      let cursor = 0;
      while (cursor < bytesRead) {
        let index = buffer.indexOf(10, cursor);
        if (index < 0 || index >= bytesRead) break;
        if (lineStart >= 0) {
          let lineLength = position + index - lineStart;
          if (lineLength > lineBuffer.length) lineBuffer = Buffer.allocUnsafe(lineLength);
          readFully(lineBuffer, lineLength, lineStart);
          emit(lineBuffer, 0, lineLength, lineStart);
          lineStart = -1;
        } else if (index > cursor) emit(buffer, cursor, index - cursor, position + cursor);
        cursor = index + 1;
      }
      if (cursor < bytesRead && lineStart < 0) lineStart = position + cursor;
      position += bytesRead;
    }
    if (lineStart >= 0) {
      let lineLength = size - lineStart;
      if (lineLength > lineBuffer.length) lineBuffer = Buffer.allocUnsafe(lineLength);
      readFully(lineBuffer, lineLength, lineStart);
      emit(lineBuffer, 0, lineLength, lineStart);
    }
  }
  function read(offset, length) {
    if (length > lineBuffer.length) lineBuffer = Buffer.allocUnsafe(Math.max(length, lineBuffer.length * 2));
    return lineBuffer.subarray(0, readFully(lineBuffer, length, offset));
  }
  return {
    scan,
    read,
    close: () => closeSync(fd),
  };
}
//@ chunk-5xgkngpb.js:490556-490728 layout
function createBufferLineScanner(buffer) {
  return {
    scan(emit) {
      let start = 0;
      while (start < buffer.length) {
        let index = buffer.indexOf(10, start);
        if (index < 0) index = buffer.length;
        if (index > start) emit(buffer, start, index - start, start);
        start = index + 1;
      }
    },
    read(offset, length) {
      return buffer.subarray(offset, offset + length);
    },
    close() {},
  };
}
//@ chunk-5xgkngpb.js:490728-490919 layout
function reportUnparsableLines(skipped) {
  if (skipped <= 0) return;
  logForDebugging(
    `transcript load: skipped ${skipped} line(s) that did not parse as JSON (e.g. a torn or corrupt write)`,
  );
  logFeatureSad("transcript_unparsable_lines", "lines_skipped", {
    lines: skipped,
  });
}
//@ chunk-5xgkngpb.js:490919-490946 layout
var WHITESPACE_BYTES; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-5xgkngpb.js:490919", () => {
  WHITESPACE_BYTES = new Set([32, 9, 13]);
});
//@ chunk-5xgkngpb.js:490946-491123 layout
function countJsonlLines(buffer) {
  let jsonl = parseJSONL(buffer);
  let nonBlank = 0;
  for (let start = 0; start < buffer.length;) {
    let index = buffer.indexOf(10, start);
    let end = index === -1 ? buffer.length : index;
    if (buffer.subarray(start, end).some((byte) => !WHITESPACE_BYTES.has(byte))) nonBlank++;
    start = end + 1;
  }
  reportUnparsableLines(nonBlank - jsonl.length);
  return jsonl;
}
//@ chunk-5xgkngpb.js:491123-502503 layout
function scanTranscriptBuffer(reader, onEntry, onBoundary, keepAllLeaves) {
  let buffer = Buffer.from('{"type":"attribution-snapshot"');
  let buffer_2 = Buffer.from('{"parentUuid":');
  let buffer_3 = Buffer.from('"parentUuid":');
  let buffer_4 = Buffer.from('"uuid":"');
  let buffer_5 = Buffer.from('","timestamp":"');
  let buffer_6 = Buffer.from('"isSidechain":');
  let buffer_7 = Buffer.from('"isSidechain":true');
  let buffer_8 = Buffer.from('"compact_boundary"');
  let buffer_9 = Buffer.from('"compactMetadata":');
  let buffer_10 = Buffer.from('"type":"last-prompt"');
  let buffer_11 = Buffer.from('{"type":"last-prompt"');
  let buffer_12 = Buffer.from('"leafUuid":');
  let buffer_13 = Buffer.from("\\ud");
  let buffer_14 = Buffer.from("\\uD");
  let buffer_15 = Buffer.from("null");
  let UUID_LEN = 36;
  let PARENT_PREFIX_LEN = buffer_2.length;
  let UUID_KEY_LEN = buffer_4.length;
  let TS_SUFFIX_LEN = buffer_5.length;
  let NULL_LEN = buffer_15.length;
  let BAD_PARENT_SENTINEL = "parentUuid is neither a string nor null";
  let msgOffsets = [];
  let msgLengths = [];
  let parentRefs = [];
  let sidechainFlags = [];
  let uuidToSlot = new Map();
  let metaOffsets = [];
  let metaLengths = [];
  let lastPromptOffsets = [];
  let lastPromptLengths = [];
  let lastPromptHasLeaf = [];
  let plainBoundaryOffset = -1;
  let lastBoundaryOffset = -1;
  let lazyMode = false;
  let lazyThreshold = 1 / 0;
  let lazyIndexed = [];
  let lazyBackscannedLines = 0;
  let backfilledAll = false;
  let otherKeyOrderSlots = [];
  let boundaryOtherKeyOrder;
  let preservedCount = 0;
  let missingBytes;
  let listedRowsOtherKeyOrder;
  let listedSpanBytes;
  let listUnused;
  let stragglers;
  let missingParentCount;
  let earliestSlot = 1 / 0;
  let lastPromptLeafOffset = -1;
  let boundaryOffsetsSeen = new Set();
  let hasPreserved = false;
  let preservedUuids;
  let preservedAnchor;
  let preservedBoundaryOffset;
  let duplicateUuid = false;
  let attributionOffset = -1;
  let attributionLength = 0;
  let ledgerLines = [];
  let finalLine = {
    offset: -1,
    length: 0,
  };
  let leafUuidFromPrompt;
  let headScanBytes = INDEX_HEAD_SCAN_BYTES;
  let boundaryScanBytes = INDEX_BOUNDARY_SCAN_BYTES;
  let lastPromptScanBytes = INDEX_LAST_PROMPT_SCAN_BYTES;
  function findUuidOffset(buf, lineEnd) {
    let firstUuidOffset = -1;
    let firstSuffixOffset = -1;
    let candidates;
    let searchFrom = 0;
    for (;;) {
      let index = buf.indexOf(buffer_4, searchFrom);
      if (index < 0) break;
      if (firstUuidOffset < 0) firstUuidOffset = index;
      let suffixPos = index + UUID_KEY_LEN + 36;
      if (
        suffixPos + TS_SUFFIX_LEN <= lineEnd &&
        buf.compare(buffer_5, 0, TS_SUFFIX_LEN, suffixPos, suffixPos + TS_SUFFIX_LEN) === 0
      )
        if (firstSuffixOffset < 0) firstSuffixOffset = index;
        else (candidates ??= [firstSuffixOffset]).push(index);
      searchFrom = index + UUID_KEY_LEN;
    }
    return candidates
      ? pickDepthOneUuidCandidate(buf, 0, candidates)
      : firstSuffixOffset >= 0
        ? firstSuffixOffset
        : firstUuidOffset;
  }
  function handleLine(buf, offset, length, lineOffset) {
    let chunk = buf.subarray(offset, offset + length);
    finalLine.offset = lineOffset;
    finalLine.length = length;
    if (length >= buffer.length && chunk.compare(buffer, 0, buffer.length, 0, buffer.length) === 0) {
      attributionOffset = lineOffset;
      attributionLength = length;
      return;
    }
    if (hasPrefix(chunk, 0, length)) {
      ledgerLines.push({
        offset: lineOffset,
        length,
      });
      return;
    }
    if (
      length < lastPromptScanBytes &&
      length > buffer_11.length &&
      chunk.compare(buffer_11, 0, buffer_11.length, 0, buffer_11.length) === 0
    ) {
      lastPromptOffsets.push(lineOffset);
      lastPromptLengths.push(length);
      lastPromptHasLeaf.push(chunk.includes(buffer_12));
      return;
    }
    if (
      length < lastPromptScanBytes &&
      chunk.subarray(0, Math.min(length, LAST_PROMPT_PREFIX_SCAN_BYTES)).includes(buffer_10)
    ) {
      let parsed;
      try {
        parsed = jsonParse(chunk.toString("utf8", 0, length));
      } catch {
        return;
      }
      if (parsed?.type === "last-prompt") {
        if (parsed.leafUuid) {
          leafUuidFromPrompt = parsed.leafUuid;
          lastPromptLeafOffset = lineOffset;
        }
        metaOffsets.push(lineOffset);
        metaLengths.push(length);
        return;
      }
    }
    let contentStart = skipNuls(chunk, 0, length);
    let chunk_2 = chunk.subarray(contentStart, Math.min(length, contentStart + boundaryScanBytes));
    if (
      chunk_2.includes(buffer_8) ||
      (chunk_2.includes(buffer_9) && chunk.includes(buffer_8, contentStart))
    ) {
      let parsed;
      try {
        parsed = jsonParse(chunk.toString("utf8", contentStart, length));
      } catch {
        parsed = null;
      }
      if (parsed?.type === "system" && parsed.subtype === "compact_boundary") {
        lastBoundaryOffset = lineOffset;
        boundaryOtherKeyOrder = chunk.compare(buffer_2, 0, PARENT_PREFIX_LEN, 0, PARENT_PREFIX_LEN) !== 0;
        let preservedMessages = parsed.compactMetadata?.preservedMessages;
        if (preservedMessages || parsed.compactMetadata?.preservedSegment) {
          hasPreserved = true;
          preservedCount++;
          if (
            preservedMessages &&
            typeof preservedMessages.anchorUuid === "string" &&
            Array.isArray(preservedMessages.uuids) &&
            preservedMessages.uuids.length > 0 &&
            preservedMessages.uuids.every((uuid) => typeof uuid === "string")
          ) {
            preservedUuids = preservedMessages.uuids;
            preservedAnchor = preservedMessages.anchorUuid;
            preservedBoundaryOffset = lineOffset;
            if (!lazyMode) {
              lazyMode = true;
              lazyThreshold = Math.min(lazyThreshold, msgOffsets.length + 1);
            }
          } else {
            preservedUuids = undefined;
            preservedAnchor = undefined;
            preservedBoundaryOffset = undefined;
          }
        } else {
          boundaryOffsetsSeen.add(lineOffset);
          msgOffsets.length = 0;
          msgLengths.length = 0;
          parentRefs.length = 0;
          sidechainFlags.length = 0;
          lazyIndexed.length = 0;
          uuidToSlot.clear();
          hasPreserved = false;
          preservedUuids = undefined;
          preservedAnchor = undefined;
          preservedBoundaryOffset = undefined;
          duplicateUuid = false;
          attributionOffset = -1;
          attributionLength = 0;
          leafUuidFromPrompt = undefined;
          lastPromptLeafOffset = -1;
          plainBoundaryOffset = lineOffset;
          otherKeyOrderSlots.length = 0;
          preservedCount = 0;
          if (!lazyMode) lazyMode = true;
          lazyThreshold = 1;
        }
      }
    }
    let parentStart;
    if (
      length > PARENT_PREFIX_LEN &&
      chunk.compare(buffer_2, 0, PARENT_PREFIX_LEN, 0, PARENT_PREFIX_LEN) === 0
    ) {
      parentStart = PARENT_PREFIX_LEN;
      if (lazyMode && msgOffsets.length >= lazyThreshold) {
        msgOffsets.push(lineOffset);
        msgLengths.push(length);
        parentRefs.push(null);
        sidechainFlags.push(false);
        lazyIndexed.push(true);
        return;
      }
    } else {
      parentStart = hasPrefix_2(chunk, 0, length, buffer_3);
      if (parentStart < 0) {
        metaOffsets.push(lineOffset);
        metaLengths.push(length);
        return;
      }
      parentStart += buffer_3.length;
    }
    let slot = msgOffsets.length;
    recordMessage(chunk, length, lineOffset, parentStart, slot);
    if (parentStart !== PARENT_PREFIX_LEN && msgOffsets.length > slot) otherKeyOrderSlots.push(slot);
  }
  function recordMessage(buf, length, offset, parentValueStart, slot) {
    let parentValue =
      buf[parentValueStart] === 34
        ? buf.toString("latin1", parentValueStart + 1, parentValueStart + 1 + 36)
        : parentValueStart + NULL_LEN <= length &&
            buf.compare(buffer_15, 0, NULL_LEN, parentValueStart, parentValueStart + NULL_LEN) === 0
          ? null
          : "parentUuid is neither a string nor null";
    let uuidOffset = findUuidOffset(buf, length);
    if (uuidOffset < 0) {
      metaOffsets.push(offset);
      metaLengths.push(length);
      if (slot < msgOffsets.length) {
        msgLengths[slot] = -1;
        lazyIndexed[slot] = false;
      }
      return;
    }
    let str = buf.toString("latin1", uuidOffset + UUID_KEY_LEN, uuidOffset + UUID_KEY_LEN + 36);
    let sidechainScan =
      parentValueStart === PARENT_PREFIX_LEN
        ? (length <= headScanBytes ? buf : buf.subarray(0, headScanBytes)).indexOf(buffer_6)
        : -1;
    let sidechainOffset = sidechainScan >= 0 ? sidechainScan : hasPrefix_2(buf, 0, length, buffer_6);
    let isSidechain =
      sidechainOffset >= 0 &&
      buf.subarray(sidechainOffset, sidechainOffset + buffer_7.length).equals(buffer_7);
    if (uuidToSlot.has(str)) duplicateUuid = true;
    if (slot === msgOffsets.length) {
      uuidToSlot.set(str, slot);
      msgOffsets.push(offset);
      msgLengths.push(length);
      parentRefs.push(parentValue);
      sidechainFlags.push(isSidechain);
      lazyIndexed.push(false);
    } else {
      lazyIndexed[slot] = false;
      let uuidSlot = uuidToSlot.get(str);
      if (uuidSlot === undefined || uuidSlot < slot) uuidToSlot.set(str, slot);
      parentRefs[slot] = parentValue;
      sidechainFlags[slot] = isSidechain;
    }
  }
  function backfill(from, to) {
    let max = Math.max(from, 0);
    while (max < to) {
      if (!lazyIndexed[max]) {
        max++;
        continue;
      }
      let runStart = msgOffsets[max];
      let runEnd = runStart + msgLengths[max];
      let next = max + 1;
      while (
        next < to &&
        lazyIndexed[next] &&
        msgOffsets[next] === runEnd + 1 &&
        msgOffsets[next] + msgLengths[next] - runStart <= 1048576
      ) {
        runEnd = msgOffsets[next] + msgLengths[next];
        next++;
      }
      let chunk = reader.read(runStart, runEnd - runStart);
      for (let slot = max; slot < next; slot++) {
        let relOffset = msgOffsets[slot] - runStart;
        if (relOffset + msgLengths[slot] > chunk.length) {
          msgLengths[slot] = -1;
          lazyIndexed[slot] = false;
          continue;
        }
        let buf = chunk.subarray(relOffset, relOffset + msgLengths[slot]);
        recordMessage(buf, msgLengths[slot], msgOffsets[slot], PARENT_PREFIX_LEN, slot);
      }
      max = next;
    }
  }
  let startTime = performance.now();
  let scanMs = 0;
  let fallbackAll = false;
  let readError;
  try {
    let slotAtOffset = function (offset) {
      while (offsetCursor < msgOffsets.length && msgOffsets[offsetCursor] < offset) offsetCursor++;
      return offsetCursor < msgOffsets.length &&
        msgOffsets[offsetCursor] === offset &&
        msgLengths[offsetCursor] >= 0
        ? offsetCursor
        : -1;
    };
    let anchorIdAt = function (slot) {
      let id = parentSlots[slot];
      return id < 0 ? undefined : id;
    };
    let setAnchor = function (slot, id, runLink) {
      slotIds[slot] = id;
      if (runLink) dispatchFlags[slot] = 1;
      for (let child = firstChild[slot]; child !== -1; child = nextSibling[child]) {
        if (child < slot || msgLengths[child] < 0 || dispatchedOffsets.has(msgOffsets[child])) continue;
        let insertAt = readyQueue.length;
        while (insertAt > readyHead && readyQueue[insertAt - 1] > child) insertAt--;
        readyQueue.splice(insertAt, 0, child);
      }
    };
    reader.scan(handleLine);
    scanMs = performance.now() - startTime;
    if (lazyMode && lazyThreshold < msgOffsets.length && !keepAllLeaves) {
      let backfillFrom = 0;
      if (hasPreserved && preservedUuids && preservedBoundaryOffset !== undefined) {
        let lo = 0;
        let hi = msgOffsets.length - 1;
        let boundarySlot = -1;
        while (lo <= hi) {
          let mid = (lo + hi) >> 1;
          let midOffset = msgOffsets[mid];
          if (midOffset === preservedBoundaryOffset) {
            boundarySlot = mid;
            break;
          }
          if (midOffset < preservedBoundaryOffset) lo = mid + 1;
          else hi = mid - 1;
        }
        backfillFrom = boundarySlot < 0 ? 0 : boundarySlot;
        backfill(Math.max(backfillFrom, lazyThreshold), msgOffsets.length);
        if (boundarySlot >= 0) {
          let slot = Math.min(boundarySlot, msgOffsets.length) - 1;
          let scanned = 0;
          let missingPreserved = () =>
            preservedUuids.some((uuid) => !uuidToSlot.has(uuid)) || !uuidToSlot.has(preservedAnchor);
          while (slot >= lazyThreshold && scanned < 2048 && missingPreserved()) {
            let max = Math.max(lazyThreshold, slot - 63);
            backfill(max, slot + 1);
            scanned += slot + 1 - max;
            slot = max - 1;
          }
          lazyBackscannedLines = scanned;
          let unresolved = missingPreserved();
          if (!unresolved) {
            let preservedSlots = new Set();
            for (let uuid of preservedUuids) {
              let slot = uuidToSlot.get(uuid);
              if (slot !== undefined) preservedSlots.add(slot);
            }
            let walked = new Set();
            for (let childSlot = boundarySlot; childSlot < msgOffsets.length && !unresolved; childSlot++) {
              if (msgLengths[childSlot] < 0) continue;
              let parentValue = parentRefs[childSlot];
              while (parentValue != null) {
                let parentSlot = uuidToSlot.get(parentValue);
                if (parentSlot === undefined) {
                  unresolved = slot >= lazyThreshold;
                  break;
                }
                if (parentSlot >= boundarySlot || preservedSlots.has(parentSlot) || walked.has(parentSlot))
                  break;
                walked.add(parentSlot);
                parentValue = parentRefs[parentSlot];
              }
            }
          }
          if (unresolved && slot >= lazyThreshold) {
            backfilledAll = true;
            backfill(lazyThreshold, slot + 1);
            slot = lazyThreshold - 1;
          }
          earliestSlot = slot + 1;
        }
      } else if (!hasPreserved) backfill(lazyThreshold, msgOffsets.length);
    }
    let jsonlParser = bunJSONLParse();
    let parser =
      jsonlParser && jsonlParser(Buffer.from('{"a":1}')).values.length === 1 ? jsonlParser : undefined;
    let hasBom = (bytes) => bytes.length >= 3 && bytes[0] === 239 && bytes[1] === 187 && bytes[2] === 191;
    let parseLine = (bytes) => {
      if (parser) {
        if (hasBom(bytes)) throw SyntaxError("byte-order mark before the JSON value");
        let result = parser(bytes);
        if (result.values.length < 1) throw SyntaxError("no JSON value on line");
        return result.values[0];
      }
      return jsonParse(bytes.toString("utf8"));
    };
    for (let idx = lastPromptOffsets.length - 1; idx >= 0; idx--) {
      let promptOffset = lastPromptOffsets[idx];
      if (promptOffset < plainBoundaryOffset || promptOffset < lastPromptLeafOffset) break;
      let raw = reader.read(promptOffset, lastPromptLengths[idx]);
      let parsed;
      try {
        parsed = parseLine(raw);
      } catch {
        continue;
      }
      if (parsed?.leafUuid) {
        leafUuidFromPrompt = parsed.leafUuid;
        break;
      }
    }
    let dispatchedOffsets = null;
    let dispatchedRanges = null;
    let boundarySlot;
    let preservedSlots;
    if (hasPreserved && preservedUuids && preservedBoundaryOffset !== undefined) {
      let lo = 0;
      let hi = msgOffsets.length - 1;
      while (lo <= hi) {
        let mid = (lo + hi) >> 1;
        let midOffset = msgOffsets[mid];
        if (midOffset === preservedBoundaryOffset) {
          boundarySlot = mid;
          break;
        }
        if (midOffset < preservedBoundaryOffset) lo = mid + 1;
        else hi = mid - 1;
      }
      if (boundarySlot !== undefined) {
        preservedSlots = [];
        for (let uuid of preservedUuids) {
          let slot = uuidToSlot.get(uuid);
          if (slot === undefined) {
            preservedSlots = undefined;
            break;
          }
          preservedSlots.push(slot);
        }
      }
    }
    if (preservedSlots && boundarySlot !== undefined) {
      let missingSlot = new Set(preservedSlots);
      missingBytes = 0;
      let lowestSlot = boundarySlot;
      for (let slot of missingSlot) {
        missingBytes += msgLengths[slot];
        lowestSlot = Math.min(lowestSlot, slot);
      }
      listedSpanBytes = msgOffsets[boundarySlot] - msgOffsets[lowestSlot];
      listedRowsOtherKeyOrder = countWhere(otherKeyOrderSlots, (slot) => missingSlot.has(slot));
    }
    let uuidMissing = boundarySlot !== undefined && !preservedSlots;
    let anchorBefore = false;
    if (preservedSlots && boundarySlot !== undefined && preservedAnchor) {
      let anchorSlot = uuidToSlot.get(preservedAnchor);
      if (anchorSlot !== undefined && anchorSlot < boundarySlot && !preservedSlots.includes(anchorSlot)) {
        anchorBefore = true;
        preservedSlots = undefined;
      }
    }
    if (duplicateUuid) preservedSlots = undefined;
    if (!keepAllLeaves && hasPreserved && !preservedSlots) {
      fallbackAll = true;
      let listUnusedReason = !preservedUuids
        ? "no_list"
        : boundarySlot === undefined
          ? "boundary_unindexed"
          : uuidMissing
            ? "uuid_missing"
            : anchorBefore
              ? "anchor_before_boundary"
              : "duplicate_uuid";
      listUnused = listUnusedReason;
      logEvent("tengu_transcript_preserved_dispatch", {
        mode: lit_2("fallback_all"),
        indexed_slots: msgOffsets.length,
        reason: fromEnum(listUnusedReason),
      });
    }
    if (!keepAllLeaves && hasPreserved && preservedSlots && boundarySlot !== undefined) {
      dispatchedOffsets = new Set();
      dispatchedRanges = [];
      let visited = new Set();
      let dispatchSlot = (slot) => {
        visited.add(slot);
        if (msgLengths[slot] < 0) return;
        dispatchedOffsets.add(msgOffsets[slot]);
        dispatchedRanges.push([msgOffsets[slot], msgLengths[slot]]);
      };
      let preservedSet = new Set(preservedSlots);
      for (let preservedSlot of preservedSlots) earliestSlot = Math.min(earliestSlot, preservedSlot);
      if (msgOffsets.length > 0 && boundaryOffsetsSeen.has(msgOffsets[0])) dispatchSlot(0);
      for (let slot of preservedSlots) if (!visited.has(slot)) dispatchSlot(slot);
      stragglers = 0;
      missingParentCount = 0;
      for (let slot = boundarySlot; slot < msgOffsets.length; slot++) {
        if (!visited.has(slot)) dispatchSlot(slot);
        let parentValue = parentRefs[slot];
        let parentSlot = parentValue == null ? undefined : uuidToSlot.get(parentValue);
        if (parentValue != null && parentSlot === undefined) missingParentCount++;
        while (
          parentSlot !== undefined &&
          parentSlot < boundarySlot &&
          !preservedSet.has(parentSlot) &&
          !visited.has(parentSlot)
        ) {
          dispatchSlot(parentSlot);
          stragglers++;
          earliestSlot = Math.min(earliestSlot, parentSlot);
          let nextValue = parentRefs[parentSlot];
          parentSlot = nextValue == null ? undefined : uuidToSlot.get(nextValue);
        }
      }
      logEvent("tengu_transcript_preserved_dispatch", {
        mode: lit_2("list"),
        indexed_slots: msgOffsets.length,
        dispatched_slots: visited.size,
        preserved: preservedSlots.length,
        straggler_ancestors: stragglers,
        lazy_unindexed_slots: lazyMode ? countWhere(lazyIndexed, (flag) => flag) : 0,
        lazy_backscanned_lines: lazyBackscannedLines,
        lazy_backfilled_all: backfilledAll,
      });
    }
    let leafSlot = -1;
    let unparsableSlots = [];
    if (!keepAllLeaves && !hasPreserved)
      for (let idx = msgOffsets.length - 1; idx >= 0; idx--) {
        if (sidechainFlags[idx] || msgLengths[idx] < 0) continue;
        if (parentRefs[idx] === null) {
          let line = reader.read(msgOffsets[idx], msgLengths[idx]);
          let parsed;
          try {
            parsed = parseLine(line.subarray(skipNuls(line, 0, line.length)));
          } catch {
            parsed = undefined;
          }
          if (!isPlainObject_4(parsed) || isFileSnapshotMessage(parsed)) {
            unparsableSlots.push(idx);
            continue;
          }
        }
        leafSlot = idx;
        break;
      }
    if (leafSlot >= 0) {
      dispatchedOffsets = new Set();
      dispatchedRanges = [];
      let walked = new Set();
      let phantomReason;
      let walkSlot = (slot) => {
        let current = slot;
        let path = new Set();
        while (current !== undefined && !walked.has(current)) {
          walked.add(current);
          path.add(current);
          dispatchedOffsets.add(msgOffsets[current]);
          dispatchedRanges.push([msgOffsets[current], msgLengths[current]]);
          let parentValue = parentRefs[current];
          if (parentValue == null) break;
          if (parentValue === "parentUuid is neither a string nor null") {
            phantomReason ??= "non_string_parent";
            break;
          }
          let parentSlot = uuidToSlot.get(parentValue);
          if (parentSlot === undefined || path.has(parentSlot)) {
            phantomReason ??= parentSlot === undefined ? "unknown_parent" : "parent_cycle";
            break;
          }
          current = parentSlot;
        }
      };
      walkSlot(leafSlot);
      unparsableSlots.forEach(walkSlot);
      let promptLeafSlot = leafUuidFromPrompt ? uuidToSlot.get(leafUuidFromPrompt) : undefined;
      walkSlot(promptLeafSlot);
      if (phantomReason !== undefined) {
        let reason = phantomReason;
        logEvent("tengu_transcript_phantom_parent", {
          total_offsets: msgOffsets.length,
          walked_slots: dispatchedOffsets.size,
          reason: fromEnum(reason),
        });
        dispatchedOffsets = null;
        dispatchedRanges = null;
      }
    }
    let maxRunBytes = 1048576;
    let ranges = dispatchedRanges ?? [];
    if (!dispatchedRanges) {
      for (let idx = 0; idx < msgOffsets.length; idx++)
        if (msgLengths[idx] >= 0) ranges.push([msgOffsets[idx], msgLengths[idx]]);
    }
    for (let idx = 0; idx < metaOffsets.length; idx++) ranges.push([metaOffsets[idx], metaLengths[idx]]);
    let firstKeptOffset = -1;
    if (msgOffsets.length > 0 && boundaryOffsetsSeen.has(msgOffsets[0]) && !sidechainFlags[0])
      firstKeptOffset = msgOffsets[0];
    if (
      boundarySlot !== undefined &&
      preservedSlots &&
      !keepAllLeaves &&
      !sidechainFlags[boundarySlot] &&
      msgOffsets[boundarySlot] > firstKeptOffset
    )
      firstKeptOffset = msgOffsets[boundarySlot];
    for (let idx = 0; idx < lastPromptOffsets.length; idx++)
      if (lastPromptOffsets[idx] >= firstKeptOffset)
        ranges.push([lastPromptOffsets[idx], lastPromptLengths[idx]]);
    for (let idx = lastPromptOffsets.length - 1; idx >= 0; idx--) {
      let offset = lastPromptOffsets[idx];
      if (offset >= firstKeptOffset || !lastPromptHasLeaf[idx]) continue;
      let raw = reader.read(offset, lastPromptLengths[idx]);
      let parsed;
      try {
        parsed = parseLine(raw);
      } catch {
        continue;
      }
      if (parsed?.leafUuid === undefined) continue;
      ranges.push([offset, lastPromptLengths[idx]]);
      break;
    }
    ranges.sort((a, b) => a[0] - b[0]);
    let dispatchMode = dispatchedOffsets !== null;
    let slotIds = [];
    let dispatchFlags = dispatchMode ? new Uint8Array(msgOffsets.length) : undefined;
    let parentSlots = dispatchMode ? new Int32Array(msgOffsets.length).fill(-1) : undefined;
    let firstChild = dispatchMode ? new Int32Array(msgOffsets.length).fill(-1) : undefined;
    let nextSibling = dispatchMode ? new Int32Array(msgOffsets.length).fill(-1) : undefined;
    if (parentSlots && firstChild && nextSibling)
      for (let idx = msgOffsets.length - 1; idx >= 0; idx--) {
        let parentValue = parentRefs[idx];
        let parentSlot = parentValue == null ? undefined : uuidToSlot.get(parentValue);
        if (parentSlot === undefined) continue;
        parentSlots[idx] = parentSlot;
        if (parentSlot === idx) continue;
        nextSibling[idx] = firstChild[parentSlot];
        firstChild[parentSlot] = idx;
      }
    let readyQueue = [];
    let readyHead = 0;
    let offsetCursor = 0;
    using pass2Timer = slowLogging`transcript load pass2 (${ranges.length} lines to parse)`;
    let hasEscape = (text) => text.includes(buffer_13) || text.includes(buffer_14);
    let emitEntry = (entry, raw, offset) => {
      if (dispatchMode) {
        let slot = slotAtOffset(offset);
        if (slot >= 0) {
          let id = anchorIdAt(slot);
          let anchor = id === undefined ? null : (slotIds[id] ?? null);
          let dispatched = dispatchedOffsets.has(offset);
          if (!entry) {
            if (dispatched) setAnchor(slot, anchor, false);
            return;
          }
          if (!dispatched) {
            if (hasMalformedMessage(entry)) return;
            if (!isChainLinkCandidate(entry, anchor)) {
              if (id !== undefined && dispatchFlags[id]) onEntry(entry, hasEscape(raw));
              return;
            }
          }
          setAnchor(slot, getAssistantMessageId(entry, anchor), isProgressOrHiddenEntry(entry));
        }
      }
      if (entry) onEntry(entry, hasEscape(raw));
    };
    let parseFailures = 0;
    let emitRawLine = (buf, start, length, offset) => {
      if (boundaryOffsetsSeen.has(offset)) onBoundary();
      let dataStart = start;
      let dataEnd = start + length;
      while (dataStart < dataEnd && buf[dataStart] === 0) dataStart++;
      if (dataStart === dataEnd) return;
      let bytes = buf.subarray(dataStart, dataEnd);
      let parsed;
      if (parser) {
        let result;
        try {
          result = parser(bytes);
        } catch {
          parseFailures++;
          emitEntry(null, bytes, offset);
          return;
        }
        if (result.values.length < 1 || hasBom(bytes)) {
          parseFailures++;
          emitEntry(null, bytes, offset);
          return;
        }
        parsed = result.values[0];
      } else
        try {
          parsed = jsonParseRaw(buf.toString("utf8", dataStart, dataEnd));
        } catch {
          parseFailures++;
          emitEntry(null, bytes, offset);
          return;
        }
      emitEntry(parsed, bytes, offset);
    };
    let rangeCursor = 0;
    let nextRange = () => {
      let range = rangeCursor < ranges.length ? ranges[rangeCursor] : undefined;
      if (readyHead < readyQueue.length) {
        let slot = readyQueue[readyHead];
        if (range === undefined || msgOffsets[slot] < range[0]) return [msgOffsets[slot], msgLengths[slot]];
      }
      return range;
    };
    let advance = () => {
      if (
        readyHead < readyQueue.length &&
        (rangeCursor >= ranges.length || msgOffsets[readyQueue[readyHead]] < ranges[rangeCursor][0])
      )
        readyHead++;
      else rangeCursor++;
    };
    let group = [];
    for (let range = nextRange(); range !== undefined; range = nextRange()) {
      group.length = 0;
      group.push(range);
      advance();
      let groupStart = range[0];
      let groupEnd = groupStart + range[1];
      for (
        let next = nextRange();
        next !== undefined && next[0] === groupEnd + 1 && next[0] + next[1] - groupStart <= maxRunBytes;
        next = nextRange()
      ) {
        group.push(next);
        advance();
        groupEnd = next[0] + next[1];
      }
      let buf = reader.read(groupStart, groupEnd - groupStart);
      let batchValues;
      if (parser && group.length > 1) {
        let aligned = buf.length === groupEnd - groupStart;
        for (let idx = 0; aligned && idx < group.length; idx++)
          aligned = group[idx][1] >= 2 && buf[group[idx][0] - groupStart] === 123;
        if (aligned && isAscii(buf))
          try {
            let batchResult = parser(buf);
            if (
              !batchResult.error &&
              batchResult.values.length === group.length &&
              (batchResult.read === buf.length || (batchResult.read === buf.length - 1 && buf.at(-1) === 13))
            )
              batchValues = batchResult.values;
          } catch {
            batchValues = undefined;
          }
      }
      if (batchValues)
        for (let idx = 0; idx < group.length; idx++) {
          let offset = group[idx][0];
          if (boundaryOffsetsSeen.has(offset)) onBoundary();
          let rel = offset - groupStart;
          emitEntry(batchValues[idx], buf.subarray(rel, rel + group[idx][1]), offset);
        }
      else
        for (let idx = 0; idx < group.length; idx++)
          emitRawLine(buf, group[idx][0] - groupStart, group[idx][1], group[idx][0]);
    }
    reportUnparsableLines(parseFailures);
  } catch (error) {
    readError = {
      error,
    };
    throw error;
  } finally {
    closeAfterRead(() => reader.close(), readError);
  }
  let keptFrom = (fallbackAll ? undefined : preservedBoundaryOffset) ?? Math.max(plainBoundaryOffset, 0);
  let earlierMetadataBytes = 0;
  for (let idx = 0; idx < metaOffsets.length; idx++)
    if (metaOffsets[idx] < keptFrom) earlierMetadataBytes += metaLengths[idx];
  return {
    lastAttributionOffset: attributionOffset,
    lastAttributionLength: attributionLength,
    ledgerLines,
    finalLine,
    scan: {
      boundary: !hasPreserved
        ? plainBoundaryOffset >= 0
          ? "plain"
          : "none"
        : fallbackAll
          ? "preserved_all_rows"
          : "preserved",
      keptFrom,
      seedFrom: Math.max(lastBoundaryOffset, 0),
      plainFrom: plainBoundaryOffset,
      reachFrom: stragglers === undefined ? undefined : msgOffsets[earliestSlot],
      boundaryOtherKeyOrder,
      keepingBoundaries: preservedCount,
      rows: countWhere(msgLengths, (length) => length >= 0),
      rowsOtherKeyOrder: otherKeyOrderSlots.length,
      rowsUnindexed: countWhere(lazyIndexed, (indexed) => indexed),
      listedRows: preservedUuids?.length,
      listedRowsBytes: missingBytes,
      listedRowsOtherKeyOrder,
      listedSpanBytes,
      stragglerAncestors: stragglers,
      parentsNotFound: missingParentCount,
      backfilledAll: stragglers === undefined ? undefined : backfilledAll,
      listUnused,
      earlierMetadataBytes,
      scanMs,
      scanStartMs: startTime,
    },
  };
}
//@ chunk-5xgkngpb.js:502503-502554 layout
function scanTranscriptFile(path, size, onEntry, onBoundary, keepAllLeaves) {
  return scanTranscriptBuffer(createFileChunkReader(path, size), onEntry, onBoundary, keepAllLeaves);
}
//@ chunk-5xgkngpb.js:502554-502632 layout
function endsWithNewlineSync(fd, size) {
  let byte = Buffer.alloc(1);
  return readSync(fd, byte, 0, 1, size - 1) === 1 && byte[0] === 10;
}
//@ chunk-5xgkngpb.js:502632-502851 layout
async function endsWithNewline(path, size) {
  if (size === 0) return true;
  let handle = await open(path, "r");
  let error;
  try {
    let byte = Buffer.alloc(1);
    let { bytesRead } = await handle.read(byte, 0, 1, size - 1);
    return bytesRead === 1 && byte[0] === 10;
  } catch (error_2) {
    error = {
      error: error_2,
    };
    throw error_2;
  } finally {
    await closeAfterReadAsync(() => handle.close(), error);
  }
}
//@ chunk-5xgkngpb.js:502851-502889 layout
function readJsonAtOffset(path, offset, lastAttributionLength) {
  return readJsonAtOffsetSync(path, offset, lastAttributionLength);
}
//@ chunk-5xgkngpb.js:502889-502984 layout
function readJsonAtOffsetSync(path, offset, length) {
  if (offset < 0 || length <= 0) return null;
  let [line] = readFileTailSync(path, [
    {
      offset,
      length,
    },
  ]);
  return parseJsonBuffer(line);
}
//@ chunk-5xgkngpb.js:502984-503071 layout
function parseJsonBuffer(line) {
  if (!line) return null;
  try {
    return jsonParse(line.toString("utf8"));
  } catch {
    return null;
  }
}
//@ chunk-5xgkngpb.js:503071-503146 layout
function readJsonAtOffset_2(buffer, lastAttributionOffset, lastAttributionLength) {
  if (lastAttributionOffset < 0 || lastAttributionLength <= 0) return null;
  return parseJsonBuffer(
    buffer.subarray(lastAttributionOffset, lastAttributionOffset + lastAttributionLength),
  );
}
//@ chunk-5xgkngpb.js:503146-503388 fingerprint (2.1.88 match: readFileTailSync, 0.699)
function readFileTailSync(path, ranges) {
  if (ranges.length === 0) return [];
  let fd = openSync(path, "r");
  let fd_2;
  try {
    return ranges.map(({ offset, length }) => {
      if (offset < 0 || length <= 0) return null;
      let buf = Buffer.allocUnsafe(length);
      return readSync(fd, buf, 0, length, offset) < length ? null : buf;
    });
  } catch (error) {
    fd_2 = {
      error,
    };
    throw error;
  } finally {
    closeAfterRead(() => closeSync(fd), fd_2);
  }
}
//@ chunk-5xgkngpb.js:503388-503481 facade-majority
var TRANSCRIPT_CLOSE_FAILED_REPORT =
  "loadTranscriptFile: transcript close failed while an earlier error was propagating";
//@ chunk-5xgkngpb.js:503481-503554 facade-majority
function closeAfterRead(close, readError) {
  try {
    close();
  } catch (error) {
    if (readError === undefined) throw error;
    reportTranscriptCloseFailure(error, readError.error);
  }
}
//@ chunk-5xgkngpb.js:503554-503639 facade-majority
async function closeAfterReadAsync(close, readError) {
  try {
    await close();
  } catch (error) {
    if (readError === undefined) throw error;
    reportTranscriptCloseFailure(error, readError.error);
  }
}
//@ chunk-5xgkngpb.js:503639-503781 sole-consumer
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
//@ chunk-5xgkngpb.js:503781-503994 sole-consumer
function addTranscriptLine(collector, line, index) {
  let trimmed = line === null ? null : line.subarray(skipNuls(line, 0, line.length));
  let parsed = null;
  if (trimmed !== null)
    try {
      parsed = jsonParse(trimmed.toString("utf8"));
    } catch {
      parsed = null;
    }
  if (parsed !== null && typeof parsed === "object") {
    collector.add(parsed, index);
    return;
  }
  collector.torn(trimmed === null ? null : readEnvelopeSessionId(trimmed), index);
}
//@ chunk-5xgkngpb.js:503994-504108 sole-consumer
function rebuildFromLines(lines, artifactAutoReactLedgers, tailTorn) {
  let collector = new ArtifactLedgerCollector();
  let index = 0;
  for (let line of lines) addTranscriptLine(collector, line, index++);
  artifactAutoReactLedgers.clear();
  for (let [sessionId, ledger] of collector.finish(tailTorn)) artifactAutoReactLedgers.set(sessionId, ledger);
}
//@ chunk-5xgkngpb.js:504108-504266 sole-consumer
function isTornLine(line) {
  if (line === null) return true;
  if (hasPrefix(line)) return false;
  try {
    let parsed = jsonParse(line.toString("utf8", skipNuls(line, 0, line.length)));
    return parsed === null || typeof parsed !== "object";
  } catch {
    return true;
  }
}
//@ chunk-5xgkngpb.js:504385-504517 sole-consumer
function* iterateEntryLines(buf) {
  let start = 0;
  while (start < buf.length) {
    let index = buf.indexOf(10, start);
    if (index === -1) index = buf.length;
    if (index > start && hasPrefix(buf, start, index)) yield buf.subarray(start, index);
    start = index + 1;
  }
}
//@ chunk-5xgkngpb.js:504517-504570 sole-consumer
function isObjectLike(value) {
  return typeof value === "object" && value !== null;
}
//@ chunk-5xgkngpb.js:504570-504696 sole-consumer
function writtenAtOrLatest(entry) {
  return typeof entry.writtenAtMs === "number" && Number.isFinite(entry.writtenAtMs)
    ? entry.writtenAtMs
    : Number.POSITIVE_INFINITY;
}
//@ chunk-5xgkngpb.js:504696-504821 affinity
function writtenAtOrEarliest(entry) {
  return typeof entry.writtenAtMs === "number" && Number.isFinite(entry.writtenAtMs)
    ? entry.writtenAtMs
    : Number.NEGATIVE_INFINITY;
}
//@ chunk-5xgkngpb.js:504821-506108 facade-majority
function mergeArtifactCommentMonitorEntries(existing, incoming) {
  let artifacts = incoming.artifacts;
  let artifacts_2 = existing.artifacts;
  if (typeof artifacts !== "object" || artifacts === null)
    return typeof artifacts_2 === "object" && artifacts_2 !== null
      ? existing.crossLineMerged === true
        ? existing
        : {
            ...existing,
            crossLineMerged: true,
          }
      : incoming;
  let merged = new Map(Object.entries(artifacts));
  if (typeof artifacts_2 === "object" && artifacts_2 !== null)
    for (let [key, value] of Object.entries(artifacts_2)) {
      if (!isObjectLike(value)) continue;
      let prev = merged.get(key);
      let prevIsObject = isObjectLike(prev);
      if (value.state !== "stopped") {
        if (
          value.state === "armed" &&
          value.holder !== undefined &&
          prevIsObject &&
          prev.state === "armed" &&
          (prev.holder === undefined
            ? writtenAtOrEarliest(prev) <= writtenAtOrEarliest(value)
            : writtenAtOrEarliest(prev) < writtenAtOrEarliest(value))
        ) {
          let { holderPid, holderProcStart, holderProcStartFt, holderJob, holderPidSpace, ...rest } = prev;
          merged.set(key, {
            ...rest,
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
      let incomingAt = writtenAtOrLatest(value);
      if (!merged.has(key) || !prevIsObject) {
        merged.set(key, value);
        continue;
      }
      let prevAt =
        prev.state === "stopped"
          ? writtenAtOrLatest(prev)
          : prev.state === "armed"
            ? writtenAtOrEarliest(prev)
            : Number.NEGATIVE_INFINITY;
      if (prev.state === "stopped" ? incomingAt > prevAt : incomingAt >= prevAt) merged.set(key, value);
    }
  let keys = Object.keys(artifacts);
  let unchanged = merged.size === keys.length && keys.every((key) => merged.get(key) === artifacts[key]);
  if (unchanged && incoming.crossLineMerged === undefined) return incoming;
  return {
    ...incoming,
    ...(unchanged
      ? {}
      : {
          crossLineMerged: true,
        }),
    artifacts: Object.fromEntries(merged),
  };
}
//@ chunk-5xgkngpb.js:506108-506143 layout
var weakMap_7; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
var weakMap_8;
deferInit("chunk-5xgkngpb.js:506108", () => {
  weakMap_7 = new WeakMap();
  weakMap_8 = new WeakMap();
});
//@ chunk-5xgkngpb.js:506143-506175 facade-majority
var TURNS_AFTER_LEAF_CHECKPOINT_GB_FLAG = "tengu_modular_sparkle";
//@ chunk-5xgkngpb.js:506175-506305 callgraph-fingerprint (2.1.88 match: applySnipRemovals, 0.625)
function applySnipRemovals(messages, removedRows, lastRowUuid, checkpointUuid) {
  let cursor = lastRowUuid;
  for (let idx = 0; cursor && cursor !== checkpointUuid && idx < removedRows.size; idx++) {
    let entry = removedRows.get(cursor);
    cursor = messages.get(cursor)?.parentUuid === entry ? entry : undefined;
  }
  return cursor === checkpointUuid;
}
//@ chunk-5xgkngpb.js:506305-507523 placement
function findToolUseSiblings(messages, leafUuid, targetUuid, { direct, throughBatch }) {
  let holder;
  let toolIds = [];
  let viaAttachment = false;
  if (throughBatch) {
    let visited = new Set();
    let lastAux;
    let current = messages.get(targetUuid);
    while (current && isAuxiliaryEntry(current) && !visited.has(current.uuid)) {
      visited.add(current.uuid);
      lastAux = current;
      current = current.parentUuid ? messages.get(current.parentUuid) : undefined;
    }
    if (current?.type === "user" && contentHasBlockType(current.message?.content, "tool_result")) {
      toolIds = getToolResultIds(current);
      holder = current.parentUuid ? messages.get(current.parentUuid) : undefined;
    } else if (lastAux) {
      let toolUseID =
        lastAux.type === "attachment" &&
        isPlainObject_6(lastAux.attachment) &&
        "toolUseID" in lastAux.attachment
          ? lastAux.attachment.toolUseID
          : undefined;
      let id = current?.type === "assistant" ? current.message?.id : undefined;
      holder =
        current && id && typeof toolUseID === "string"
          ? [current, ...collectSameMessageSiblings(messages, current, id)].find((sibling) =>
              hasToolUseBlock(sibling).includes(toolUseID),
            )
          : undefined;
      toolIds = holder && typeof toolUseID === "string" ? [toolUseID] : [];
      viaAttachment = toolIds.length > 0;
    } else holder = current;
  }
  let holderToolIds = holder ? hasToolUseBlock(holder) : [];
  let id =
    holder?.type === "assistant" && holderToolIds.length > 0 && holder.message?.id
      ? holder.message.id
      : undefined;
  let siblingUuids = new Set(
    holder && id ? collectSameMessageSiblings(messages, holder, id).map((sibling) => sibling.uuid) : [],
  );
  let seen = new Set();
  let previous;
  let sawSameMessage = false;
  let current = leafUuid;
  while (current && !seen.has(current)) {
    if (direct && current === targetUuid) return true;
    seen.add(current);
    let entry = messages.get(current);
    if (holder && id && entry) {
      if (sawSameMessage && entry.uuid === holder.uuid) return true;
      if (
        entry.type === "assistant" &&
        entry.uuid !== holder.uuid &&
        entry.message?.id === id &&
        hasToolUseBlockFlag(entry)
      ) {
        if (siblingUuids.has(entry.uuid)) return true;
        sawSameMessage = true;
      } else if (!countVisibleMessages_2(entry, id)) sawSameMessage = false;
    }
    if (
      holder &&
      entry?.uuid === holder.uuid &&
      previous &&
      toolIds.some((id) => holderToolIds.includes(id)) &&
      getToolResultIds(previous).some(
        (id) =>
          holderToolIds.includes(id) && (viaAttachment ? holderToolIds.length > 1 : !toolIds.includes(id)),
      )
    )
      return true;
    previous = entry;
    current = entry?.parentUuid ?? undefined;
  }
  return false;
}
//@ chunk-5xgkngpb.js:507523-507723 placement
function collectSameMessageSiblings(messages, start, id) {
  let siblings = [];
  let seen = new Set([start.uuid]);
  let current = start.parentUuid ? messages.get(start.parentUuid) : undefined;
  while (current && !seen.has(current.uuid) && countVisibleMessages_2(current, id)) {
    seen.add(current.uuid);
    siblings.push(current);
    current = current.parentUuid ? messages.get(current.parentUuid) : undefined;
  }
  return siblings;
}
//@ chunk-5xgkngpb.js:507723-517838 fingerprint (2.1.88 match: loadTranscriptFile, 0.39)
/**
 * 构造转录加载器：逐条处理 jsonl 记录，按 uuid 收集消息，按类型收集 summary、custom-title、tag、ai-title、file-history、attribution、content-replacement、worktree-state 等元数据，并找出叶子节点。
 */
function loadTranscriptFile_2(keepAllLeaves) {
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
  let groupingIds = new Map();
  let noBackfill = new Map();
  let ownerAccountUuids = new Map();
  let ownerOrgUuids = new Map();
  let historySuppressed = new Set();
  let modeMap = new Map();
  let permissionModes = new Map();
  let isolationLatches = new Map();
  let devModsFolders = new Map();
  let sessionOwners = new Map();
  let memoryModeStamps = new Map();
  let atisLatches = new Map();
  let toolsUsedLists = new Map();
  let worktreeStateRows = new Map();
  let artifactCommentMonitors = new Map();
  let artifactAutoReactLedgers = new Map();
  let costStates = new Map();
  let fileSnapShotsById = new Map();
  let fileHistoryDeltas = new Map();
  let attributionMap = new Map();
  let contentReplMap = new Map();
  let agentContentReplMap = new Map();
  let forkContextRefs = new Map();
  let tailTorn = false;
  let lastRowUuid;
  let newestRowUuid;
  let newestTs = "";
  let checkpointUuid;
  let checkpointExplicit = false;
  let checkpointEverExplicit = false;
  let clearedExplicitly = false;
  let rewound = false;
  let sawLastPrompt = false;
  let rowsSinceCheckpoint = 0;
  let rewindParents;
  let leafChoice = "leaf_scan";
  let prunedBeforeFold = false;
  let pendingParentUuid;
  let trailingSnapshotRows = 0;
  let legacyParentMap = new Map();
  let rowRepairer = createRowRepairer();
  let rewindTracker = createRewindTracker(messages);
  let processEntry = (entry, repairStrings = true) => {
    if (!isPlainObject_4(entry)) return;
    let row = entry;
    if (isLegacyProgressEntry(row)) {
      logLegacyProgressProbe("seen");
      let parentUuid = row.parentUuid;
      legacyParentMap.set(
        row.uuid,
        parentUuid && legacyParentMap.has(parentUuid)
          ? (legacyParentMap.get(parentUuid) ?? null)
          : parentUuid,
      );
      return;
    }
    if (isTranscriptMessage(row)) {
      if (row.parentUuid && legacyParentMap.has(row.parentUuid)) {
        logLegacyProgressProbe("rewrote");
        row.parentUuid = legacyParentMap.get(row.parentUuid) ?? null;
      }
      if (pendingParentUuid !== undefined && !row.isSidechain && !isFileSnapshotMessage(row)) {
        if (row.parentUuid === null && !isCompactBoundaryMessage_3(row)) row.parentUuid = pendingParentUuid;
        pendingParentUuid = undefined;
      }
      if (!rowRepairer.admit(row, messages)) return;
      if (repairStrings) repairMalformedStringsDeep(row);
      if (codeModeAccepted()) stripToolUseIdBookkeeping(row);
      if (row.type === "assistant" && row.wireToolInputs !== undefined) {
        let toolInputCount = wireToolInputsForContent(
          row.wireToolInputs,
          row.message?.content,
          row.batchToolUses,
        );
        if (toolInputCount === undefined) delete row.wireToolInputs;
        else row.wireToolInputs = toolInputCount;
      }
      if (
        row.type === "assistant" &&
        (row.wireToolInputs !== undefined || row.wireIngestContext !== undefined)
      ) {
        let stamps = restoreWireInputStamps(row.wireIngestContext, row.wireToolInputs, row.message?.content);
        if (stamps === undefined) delete row.wireIngestContext;
        else row.wireIngestContext = stamps;
      }
      let isNewRow = !messages.has(row.uuid);
      messages.set(row.uuid, row);
      if (isFileSnapshotMessage(row)) trailingSnapshotRows++;
      else if (!row.isSidechain && !isTranscriptMessage_2(row)) {
        if (isNewRow) rewindParents?.set(row.uuid, row.parentUuid);
        rewindTracker.noteRow(row);
        lastRowUuid = row.uuid;
        trailingSnapshotRows = 0;
        rowsSinceCheckpoint++;
        if (typeof row.timestamp === "string" && row.timestamp > newestTs) {
          newestRowUuid = row.uuid;
          newestTs = row.timestamp;
        }
        checkpointExplicit = false;
        clearedExplicitly = false;
        rewound = false;
      }
      if (isCompactBoundaryMessage_3(row)) {
        checkpointUuid = undefined;
        checkpointExplicit = false;
        checkpointEverExplicit = false;
        rewindTracker.noteCompactBoundary();
      }
    } else if (row.type === "summary" && row.leafUuid) summaries.set(row.leafUuid, row.summary);
    else if (row.type === "last-prompt") {
      rewindTracker.noteCheckpoint(row);
      if (row.leafUuid !== undefined) sawLastPrompt = true;
      if (row.leafUuid) {
        checkpointExplicit = row.explicit === true || (checkpointExplicit && row.leafUuid === checkpointUuid);
        checkpointEverExplicit =
          row.explicit === true || (checkpointEverExplicit && row.leafUuid === checkpointUuid);
        rewound = row.rewound === true || (rewound && row.leafUuid === checkpointUuid);
        rewindParents = row.rewound === true ? new Map() : undefined;
        checkpointUuid = row.leafUuid;
        rowsSinceCheckpoint = 0;
        clearedExplicitly = false;
      } else if (row.leafUuid === null && row.explicit === true) {
        clearedExplicitly = true;
        checkpointUuid = undefined;
        checkpointExplicit = false;
        checkpointEverExplicit = false;
        rewound = false;
        pendingParentUuid = undefined;
      }
    } else if (row.type === "custom-title" && row.sessionId) customTitles.set(row.sessionId, row.customTitle);
    else if (row.type === "ended-by-model" && row.sessionId && !isModelEndCheckSupported())
      tags.add(row.sessionId);
    else if (row.type === "ai-title" && row.sessionId) agentNames.set(row.sessionId, row.aiTitle);
    else if (row.type === "tag" && row.sessionId) agentColors.set(row.sessionId, row.tag);
    else if (row.type === "relocated" && row.sessionId) agentSettings.set(row.sessionId, row.relocatedCwd);
    else if (row.type === "agent-name" && row.sessionId) prNumbers.set(row.sessionId, row.agentName);
    else if (row.type === "agent-color" && row.sessionId) prUrls.set(row.sessionId, row.agentColor);
    else if (row.type === "agent-setting" && row.sessionId)
      prRepositories.set(row.sessionId, row.agentSetting);
    else if (row.type === "mode" && row.sessionId) modeMap.set(row.sessionId, row.mode);
    else if (row.type === "permission-mode" && row.sessionId)
      permissionModes.set(row.sessionId, row.permissionMode);
    else if (row.type === "repl-mode" && row.sessionId) {
      if (typeof row.replMode === "boolean") {
        let replModes = weakMap_7.get(messages);
        if (replModes === undefined) {
          replModes = new Map();
          weakMap_7.set(messages, replModes);
        }
        replModes.set(row.sessionId, row.replMode);
        let typedEventSessions = weakMap_8.get(messages);
        if (typedEventSessions === undefined) {
          typedEventSessions = new Set();
          weakMap_8.set(messages, typedEventSessions);
        }
        if (row.typedEvents === true) typedEventSessions.add(row.sessionId);
        else typedEventSessions.delete(row.sessionId);
      }
    } else if (row.type === "isolation-latch" && row.sessionId) isolationLatches.set(row.sessionId, row.side);
    else if (row.type === "session-owner" && row.sessionId) {
      if (typeof row.accountUuid === "string" && row.accountUuid !== "")
        sessionOwners.set(row.sessionId, {
          accountUuid: row.accountUuid,
          organizationUuid: typeof row.organizationUuid === "string" ? row.organizationUuid : undefined,
        });
    } else if (row.type === "dev-mods" && row.sessionId) {
      if (typeof row.folder === "string" && isSessionFileAt(row.folder, row.sessionId))
        devModsFolders.set(row.sessionId, row.folder);
      else logForDebugging("dev mods: dropped a dev-mods entry naming a folder not its own");
    } else if (
      row.type === "memory-mode" &&
      row.sessionId &&
      (row.mode === "on" || row.mode === "off") &&
      (typeof row.afterUuid === "string" || row.afterUuid === null) &&
      typeof row.timestamp === "string"
    ) {
      let stamps = memoryModeStamps.get(row.sessionId) ?? [];
      memoryModeStamps.set(row.sessionId, stamps);
      stamps.push({
        mode: row.mode,
        afterUuid: row.afterUuid,
        timestamp: row.timestamp,
        ...((row.reason === "paused" ||
          row.reason === "account_off" ||
          row.reason === "account_read_only" ||
          row.reason === "session_shape" ||
          row.reason === "server_off") && {
          reason: row.reason,
        }),
        ...(typeof row.account === "string" && {
          account: row.account,
        }),
        ...((row.accountChoice === "on" ||
          row.accountChoice === "read_only" ||
          row.accountChoice === "off") && {
          accountChoice: row.accountChoice,
        }),
      });
    } else if (row.type === "atis-latch" && row.sessionId) {
      if (typeof row.atis === "string" && /^[\x21-\x7e]*$/.test(row.atis))
        atisLatches.set(row.sessionId, row.atis);
    } else if (row.type === "tools-used" && row.sessionId) {
      if (Array.isArray(row.tools))
        toolsUsedLists.set(
          row.sessionId,
          row.tools.filter((tool) => typeof tool === "string" && tool !== ""),
        );
    } else if (row.type === "worktree-state" && row.sessionId)
      worktreeStateRows.set(row.sessionId, row.worktreeSession);
    else if (row.type === "artifact-comment-monitor" && row.sessionId) {
      let existing = artifactCommentMonitors.get(row.sessionId);
      artifactCommentMonitors.set(
        row.sessionId,
        existing === undefined ? row : mergeArtifactCommentMonitorEntries(existing, row),
      );
    } else if (row.type === "artifact-autoreact-ledger" && row.sessionId)
      artifactAutoReactLedgers.set(row.sessionId, row);
    else if (row.type === "cost-state" && row.sessionId) {
      let parsed = CostStateEntrySchema().safeParse(row);
      if (parsed.success)
        costStates.set(row.sessionId, {
          ...parsed.data,
          sessionId: row.sessionId,
        });
    } else if (row.type === "pr-link" && row.sessionId) {
      modes.set(row.sessionId, row.prNumber);
      worktreeStates.set(row.sessionId, row.prUrl);
      fileHistorySnapshots.set(row.sessionId, row.prRepository);
    } else if (row.type === "bridge-session" && row.sessionId) {
      attributionSnapshots.set(row.sessionId, row.bridgeSessionId);
      contentReplacements.set(row.sessionId, row.lastSequenceNum);
      if (row.sessionGroupingId) groupingIds.set(row.sessionId, row.sessionGroupingId);
      else groupingIds.delete(row.sessionId);
      if (row.noHistoryBackfill) noBackfill.set(row.sessionId, true);
      else noBackfill.delete(row.sessionId);
      {
        let { ownerAccountUuid, ownerOrganizationUuid } = row;
        let invalidUuids =
          (ownerAccountUuid !== undefined && !isUuidShaped(ownerAccountUuid)) ||
          (ownerOrganizationUuid !== undefined && !isUuidShaped(ownerOrganizationUuid));
        if (!invalidUuids && ownerAccountUuid) ownerAccountUuids.set(row.sessionId, ownerAccountUuid);
        else ownerAccountUuids.delete(row.sessionId);
        if (!invalidUuids && ownerOrganizationUuid) ownerOrgUuids.set(row.sessionId, ownerOrganizationUuid);
        else ownerOrgUuids.delete(row.sessionId);
      }
      let metaEntries = sanitizeStringList(row.declaredDialogKinds);
      if (metaEntries.length > 0) agentContentReplacements.set(row.sessionId, metaEntries);
      else agentContentReplacements.delete(row.sessionId);
    } else if (row.type === "history-suppression" && row.sessionId) historySuppressed.add(row.sessionId);
    else if (row.type === "file-history-snapshot") fileSnapShotsById.set(row.messageId, row);
    else if (row.type === "file-history-delta") {
      let list = fileHistoryDeltas.get(row.messageId);
      if (list) list.push(row);
      else fileHistoryDeltas.set(row.messageId, [row]);
    } else if (row.type === "attribution-snapshot") {
      attributionMap.clear();
      attributionMap.set(row.messageId, row);
    } else if (row.type === "content-replacement") {
      if (row.agentId) {
        let list = agentContentReplMap.get(row.agentId) ?? [];
        agentContentReplMap.set(row.agentId, list);
        list.push(...row.replacements);
      } else {
        let list = contentReplMap.get(row.sessionId) ?? [];
        contentReplMap.set(row.sessionId, list);
        list.push(...row.replacements);
      }
    } else if (row.type === "fork-context-ref") forkContextRefs.set(row.agentId, row);
  };
  return {
    processEntry,
    precede: (entries) => {
      for (let entry of entries) processEntry(entry);
      pendingParentUuid = entries.findLast(
        (entry) => isChainParticipant(entry) && messages.has(entry.uuid),
      )?.uuid;
    },
    dropPreBoundaryEntries: () => {
      messages.clear();
      fileSnapShotsById.clear();
      fileHistoryDeltas.clear();
      legacyParentMap.clear();
    },
    messages,
    attributionSnapshots: attributionMap,
    artifactCommentMonitors,
    artifactAutoReactLedgers,
    markPrunedBeforeFold: () => {
      prunedBeforeFold = true;
    },
    setTailTorn: (torn) => {
      tailTorn = torn;
    },
    finish: () => {
      rowRepairer.finish(messages);
      rewindTracker.publish();
      let entries = applyPreservedSegmentOnLoad(messages);
      if (!keepAllLeaves) bridgeStoredGaps(messages, newestRowUuid);
      return chooseLeaves(entries);
    },
  };
  function chooseLeaves(entries) {
    if (tailTorn)
      for (let [sessionId, monitor] of artifactCommentMonitors)
        artifactCommentMonitors.set(sessionId, {
          ...monitor,
          tailTorn: true,
        });
    if (!keepAllLeaves && trailingSnapshotRows > 0) {
      let checkpointRow = checkpointUuid && messages.get(checkpointUuid);
      logEvent("tengu_transcript_ends_on_file_snapshot", {
        trailing_snapshot_rows: trailingSnapshotRows,
        pruned_before_fold: prunedBeforeFold,
        newest_checkpoint: clearedExplicitly
          ? lit_2("rewind_to_empty")
          : checkpointUuid === undefined
            ? sawLastPrompt
              ? lit_2("dropped")
              : lit_2("none")
            : checkpointRow && isFileSnapshotMessage(checkpointRow)
              ? lit_2("on_snapshot")
              : lit_2("elsewhere"),
      });
    }
    if (!keepAllLeaves && clearedExplicitly) return finish(new Set());
    let progressBridge = new Set();
    let leafIsCheckpoint =
      checkpointExplicit &&
      checkpointUuid &&
      messages.has(checkpointUuid) &&
      !messages.get(checkpointUuid)?.isSidechain;
    let pickNewerLeaf = (startUuid) => {
      let parentUuids = new Map([[startUuid, true]]);
      let isDescendant = (start) => {
        let path = [];
        let ok = false;
        let cur = start;
        while (cur) {
          let cached = parentUuids.get(cur);
          if (cached !== undefined) {
            ok = cached;
            break;
          }
          parentUuids.set(cur, false);
          path.push(cur);
          cur = messages.get(cur)?.parentUuid ?? undefined;
        }
        for (let uuid of path) parentUuids.set(uuid, ok);
        return ok;
      };
      let best = startUuid;
      let bestTs = "";
      for (let message of messages.values())
        if (
          !message.isSidechain &&
          message.uuid !== startUuid &&
          typeof message.timestamp === "string" &&
          message.timestamp >= bestTs &&
          isDescendant(message.uuid)
        ) {
          best = message.uuid;
          bestTs = message.timestamp;
        }
      return best;
    };
    let chosen = lastRowUuid;
    if (!keepAllLeaves && !sawLastPrompt && chosen && newestRowUuid && newestRowUuid !== chosen)
      chosen = pickNewerLeaf(chosen);
    if (!keepAllLeaves && (!entries || leafIsCheckpoint)) {
      let checkpoint = checkpointUuid && messages.has(checkpointUuid) ? checkpointUuid : undefined;
      if (
        checkpoint &&
        !checkpointExplicit &&
        lastRowUuid &&
        messages.has(lastRowUuid) &&
        lastRowUuid !== checkpoint &&
        findToolUseSiblings(messages, lastRowUuid, checkpoint, {
          direct: true,
          throughBatch: !checkpointEverExplicit,
        })
      )
        checkpoint = lastRowUuid;
      if (!entries && trailingSnapshotRows === 0) checkpoint ??= chosen;
      if (checkpoint && messages.has(checkpoint)) {
        let leafUuids = new Set();
        let message = messages.get(checkpoint);
        while (message) {
          if (leafUuids.has(message.uuid)) {
            logEvent("tengu_transcript_parent_cycle", {});
            break;
          }
          leafUuids.add(message.uuid);
          if (message.type === "user" || message.type === "assistant") {
            progressBridge.add(message.uuid);
            break;
          }
          message = message.parentUuid ? messages.get(message.parentUuid) : undefined;
        }
        if (progressBridge.size === 1) {
          leafChoice =
            checkpoint === checkpointUuid
              ? "checkpoint"
              : checkpoint === lastRowUuid
                ? "last_row"
                : "inferred";
          return finish(progressBridge);
        }
      }
    }
    let hasUserAssistantChild = new Set();
    let seen = new Set();
    for (let message of messages.values())
      if (message.parentUuid !== null) {
        hasUserAssistantChild.add(message.parentUuid);
        if (message.type === "user" || message.type === "assistant") seen.add(message.parentUuid);
      }
    let terminals = [];
    for (let message of messages.values())
      if (!hasUserAssistantChild.has(message.uuid)) terminals.push(message);
    if (
      collectLeafUuids({
        messages,
        terminalMessages: terminals,
        hasUserAssistantChild: seen,
        leafUuids: progressBridge,
      })
    )
      logEvent("tengu_transcript_parent_cycle", {});
    if (!keepAllLeaves && progressBridge.size > 1) {
      let chosenLeaf =
        rewindParents !== undefined &&
        !checkpointExplicit &&
        checkpointUuid !== undefined &&
        lastRowUuid !== undefined &&
        isRemoteEnvironmentAny() &&
        isFoamySpringEnabled() &&
        readGateFalseByDefault(TURNS_AFTER_LEAF_CHECKPOINT_GB_FLAG) &&
        applySnipRemovals(messages, rewindParents, lastRowUuid, checkpointUuid)
          ? lastRowUuid
          : checkpointUuid &&
              progressBridge.has(checkpointUuid) &&
              (checkpointExplicit ||
                !lastRowUuid ||
                !findToolUseSiblings(messages, lastRowUuid, checkpointUuid, {
                  direct: false,
                  throughBatch: !checkpointEverExplicit,
                }))
            ? checkpointUuid
            : trailingSnapshotRows > 0
              ? undefined
              : lastRowUuid;
      if (!chosenLeaf || !messages.has(chosenLeaf)) return finish(progressBridge);
      let seen = new Set();
      let message = messages.get(chosenLeaf);
      while (message) {
        if (seen.has(message.uuid)) break;
        seen.add(message.uuid);
        if (message.type === "user" || message.type === "assistant") {
          progressBridge.clear();
          progressBridge.add(message.uuid);
          leafChoice = chosenLeaf === checkpointUuid ? "checkpoint_pruned" : "last_row_pruned";
          break;
        }
        message = message.parentUuid ? messages.get(message.parentUuid) : undefined;
      }
    }
    return finish(progressBridge);
  }
  function finish(leafUuids) {
    recordLoadReportFor(messages, {
      chose: leafChoice,
      checkpoint: checkpointUuid,
      checkpointEverExplicit,
      lastRow: lastRowUuid,
      newestRow: newestRowUuid,
      rowsAfterLastCheckpoint: rowsSinceCheckpoint,
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
      bridgeSessionGroupingIds: groupingIds,
      bridgeNoBackfill: noBackfill,
      bridgeOwnerAccountUuids: ownerAccountUuids,
      bridgeOwnerOrganizationUuids: ownerOrgUuids,
      historySuppressed,
      modes: modeMap,
      permissionModes,
      isolationLatches,
      ...(devModsFolders.size > 0 && {
        devModsFolders,
      }),
      ...(sessionOwners.size > 0 && {
        sessionOwners,
      }),
      memoryModeStamps,
      atisLatches,
      ...(toolsUsedLists.size > 0 && {
        toolsUsedLists,
      }),
      worktreeStates: worktreeStateRows,
      artifactCommentMonitors,
      artifactAutoReactLedgers,
      costStates,
      fileHistorySnapshots: fileSnapShotsById,
      fileHistoryDeltas,
      attributionSnapshots: attributionMap,
      contentReplacements: contentReplMap,
      agentContentReplacements: agentContentReplMap,
      forkContextRefs,
      leafUuids,
      clearedToEmpty: !keepAllLeaves && clearedExplicitly,
      rewindAnchorUuid: rewound ? checkpointUuid : undefined,
    };
  }
}
//@ chunk-5xgkngpb.js:517838-517939 facade-majority
function loadTranscriptFromEntries(entries, options) {
  let transcriptFile = loadTranscriptFile_2(options?.keepAllLeaves ?? false);
  for (let entry of entries) transcriptFile.processEntry(entry);
  return transcriptFile.finish();
}
//@ chunk-5xgkngpb.js:517939-521530 facade-majority
/**
 * 加载一份转录文件（或 storage 记录）：逐条解析，交给 loadTranscriptFile 处理器，跳过无法解析的行并统计。
 */
async function loadTranscriptFile(path, options) {
  let transcriptFile = loadTranscriptFile_2(options?.keepAllLeaves ?? false);
  let { processEntry, artifactCommentMonitors, artifactAutoReactLedgers } = transcriptFile;
  transcriptFile.precede(options?.precedingEntries ?? []);
  let skipPrecompactSkip = isEnvTruthy(process.env.CLAUDE_CODE_DISABLE_PRECOMPACT_SKIP);
  if (isStorageV5Enabled() && options?.storageV5) {
    let { backend, key } = options.storageV5;
    let read = await backend.read([key]);
    let paged = read.ok
      ? undefined
      : isByteViewUnsupportedError(read.error)
        ? await readPagedTranscript(backend, key)
        : isStorageTooLargeError(read.error)
          ? await readPagedTranscript(backend, key, pagedTranscriptPageBytes)
          : undefined;
    let failure = read.ok
      ? undefined
      : paged === undefined
        ? read.error
        : paged !== null && "failure" in paged
          ? paged.failure
          : undefined;
    if (failure !== undefined) {
      if (failure.code === "Failed" && failure.failureClass === "permission") {
        logForDebugging("loadTranscriptFile: v5 read inaccessible (permission) \u2014 empty result");
        return Object.assign(transcriptFile.finish(), {
          servedBy: "inaccessible",
        });
      }
      logForDebugging(`loadTranscriptFile: v5 read failed (${failure.code})`, {
        level: "error",
      });
      let code = errnoShapedCode("telemetryCode" in failure ? failure.telemetryCode : undefined);
      let merged = Object.assign(
        Error("loadTranscriptFile: transcript unreadable via storage backend", {
          cause: failure,
        }),
        code === undefined
          ? {}
          : {
              code,
            },
      );
      if (isWin32TranscriptEbadf(merged))
        logError(withTelemetryMessage(merged, WIN32_EBADF_TELEMETRY_MESSAGE));
      throw merged;
    }
    let item = read.ok ? read.value.items[0] : undefined;
    let pagedBytes = paged !== undefined && paged !== null && "bytes" in paged ? paged : undefined;
    let served = item?.found
      ? {
          servedBy: "v5",
          v5Read: {
            mtimeMs: item.mtimeMs,
          },
        }
      : pagedBytes
        ? {
            servedBy: "v5-records",
            v5Read: {
              mtimeMs: pagedBytes.mtimeMs,
            },
          }
        : {
            servedBy: "absent",
          };
    let bytes = item?.found ? item.value : pagedBytes?.bytes;
    let storedBytes = item?.found ? item.storedBytes : pagedBytes?.storedBytes;
    if (bytes !== undefined) {
      let buffer = Buffer.from(bytes.buffer, bytes.byteOffset, bytes.byteLength);
      let isTornTail = async () => {
        if (pagedBytes !== undefined) return pagedBytes.tornTailBytes > 0;
        let stats = await backend.stat(key);
        return stats.ok && (stats.value.tornTailBytes ?? 0) > 0;
      };
      if (!skipPrecompactSkip && (storedBytes ?? buffer.length) > SKIP_PRECOMPACT_THRESHOLD) {
        let scan = scanTranscriptBuffer(
          createBufferLineScanner(buffer),
          processEntry,
          transcriptFile.dropPreBoundaryEntries,
          options?.keepAllLeaves ?? false,
        );
        let jsonAtOffset = readJsonAtOffset_2(buffer, scan.lastAttributionOffset, scan.lastAttributionLength);
        if (jsonAtOffset) transcriptFile.attributionSnapshots.set(jsonAtOffset.messageId, jsonAtOffset);
        transcriptFile.markPrunedBeforeFold();
        let includeFinalLine =
          scan.finalLine.offset >= 0 &&
          scan.ledgerLines.at(-1)?.offset !== scan.finalLine.offset &&
          (scan.ledgerLines.length > 0 || artifactAutoReactLedgers.size > 0);
        let mapped = (includeFinalLine ? [...scan.ledgerLines, scan.finalLine] : scan.ledgerLines).map(
          ({ offset, length }) => buffer.subarray(offset, offset + length),
        );
        let tornTail = includeFinalLine && isTornLine(mapped.pop() ?? null);
        rebuildFromLines(mapped, artifactAutoReactLedgers, tornTail);
        if (artifactCommentMonitors.size > 0 || artifactAutoReactLedgers.size > 0) {
          let torn = await isTornTail();
          transcriptFile.setTailTorn(torn);
          if (torn)
            for (let [sessionId, ledger] of artifactAutoReactLedgers)
              artifactAutoReactLedgers.set(sessionId, resetArtifactLedgerState(ledger, false));
        }
        return Object.assign(transcriptFile.finish(), served);
      }
      let tornTail = isTornLine(lastLineOf(buffer));
      if (!options?.keepAllLeaves && buffer.length > SKIP_PRECOMPACT_THRESHOLD) {
        buffer = walkChainBeforeParse(buffer);
        transcriptFile.markPrunedBeforeFold();
      }
      for (let line of countJsonlLines(buffer)) processEntry(line);
      rebuildFromLines(iterateEntryLines(buffer), artifactAutoReactLedgers, tornTail);
      if (artifactCommentMonitors.size > 0 || artifactAutoReactLedgers.size > 0) {
        let torn = await isTornTail();
        transcriptFile.setTailTorn(torn);
        if (torn)
          for (let [sessionId, ledger] of artifactAutoReactLedgers)
            artifactAutoReactLedgers.set(sessionId, resetArtifactLedgerState(ledger, false));
      }
    }
    return Object.assign(transcriptFile.finish(), served);
  }
  if (isDiskless()) return transcriptFile.finish();
  try {
    if (!skipPrecompactSkip) {
      let { size } = await stat(path);
      if (size > SKIP_PRECOMPACT_THRESHOLD) {
        let scan = scanTranscriptFile(
          path,
          size,
          processEntry,
          transcriptFile.dropPreBoundaryEntries,
          options?.keepAllLeaves ?? false,
        );
        if (!options?.keepAllLeaves) {
          let { keptFrom, seedFrom, plainFrom, reachFrom, ...rest } = scan.scan;
          markResumeTranscriptScan({
            ...rest,
            bytes: size,
            keptBytes: size - keptFrom,
            plainKeptBytes: plainFrom < 0 ? undefined : size - plainFrom,
            reachBytes: reachFrom === undefined ? undefined : size - reachFrom,
            toolCopyChars:
              currentTranscriptStore().toolResultCopiesOnDisk === "whole"
                ? undefined
                : slimCharsOf(transcriptFile.messages.values()),
          });
          currentTranscriptStore().replaySeedStarts.set(normalize(path), {
            start: seedFrom,
            fileSize: size,
          });
        }
        let jsonAtOffset = readJsonAtOffset(path, scan.lastAttributionOffset, scan.lastAttributionLength);
        if (jsonAtOffset) transcriptFile.attributionSnapshots.set(jsonAtOffset.messageId, jsonAtOffset);
        transcriptFile.markPrunedBeforeFold();
        let includeFinalLine =
          scan.finalLine.offset >= 0 &&
          scan.ledgerLines.at(-1)?.offset !== scan.finalLine.offset &&
          (scan.ledgerLines.length > 0 || artifactAutoReactLedgers.size > 0);
        let fileTail = readFileTailSync(
          path,
          includeFinalLine ? [...scan.ledgerLines, scan.finalLine] : scan.ledgerLines,
        );
        let tornTail = includeFinalLine && isTornLine(fileTail.pop() ?? null);
        rebuildFromLines(fileTail, artifactAutoReactLedgers, tornTail);
        if (artifactCommentMonitors.size > 0)
          transcriptFile.setTailTorn(!(await endsWithNewline(path, size)));
        return transcriptFile.finish();
      }
    }
    let buf = await readFile(path);
    let tornTail = isTornLine(lastLineOf(buf));
    transcriptFile.setTailTorn(buf.length > 0 && buf.at(-1) !== 10);
    if (!options?.keepAllLeaves && buf.length > SKIP_PRECOMPACT_THRESHOLD) {
      buf = walkChainBeforeParse(buf);
      transcriptFile.markPrunedBeforeFold();
    }
    for (let line of countJsonlLines(buf)) processEntry(line);
    rebuildFromLines(iterateEntryLines(buf), artifactAutoReactLedgers, tornTail);
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
//@ chunk-5xgkngpb.js:521530-521976 layout
/**
 * 按 sessionId 或显式路径加载会话转录，返回加载结果与会话文件路径。
 */
async function loadSessionTranscript(sessionId, path, storage, precedingEntries) {
  if (isStorageV5Enabled() && storage !== undefined)
    if (path === undefined) {
      let sessionFile = await loadSessionFile(sessionId, storage);
      if (sessionFile !== undefined) {
        let transcriptFile = await loadTranscriptFile(sessionFile.path, {
          storageV5: {
            backend: storage,
            key: sessionFile.key,
          },
          precedingEntries,
        });
        return Object.assign(transcriptFile, {
          sessionFile: sessionFile.path,
        });
      }
    } else {
      let transcriptStorageKey = getTranscriptStorageKey(path, storage);
      if (transcriptStorageKey !== undefined) {
        let transcriptFile = await loadTranscriptFile(path, {
          storageV5: transcriptStorageKey,
          precedingEntries,
        });
        return Object.assign(transcriptFile, {
          sessionFile: path,
        });
      }
    }
  let transcriptPath = path ?? (await getErrorsPath(sessionId));
  let transcriptFile = await loadTranscriptFile(transcriptPath, {
    precedingEntries,
  });
  return Object.assign(transcriptFile, {
    sessionFile: transcriptPath,
  });
}
//@ chunk-5xgkngpb.js:521976-523211 callgraph-fingerprint (2.1.88 match: loadSessionFile, 0.183)
/**
 * 按 sessionId 定位会话文件：先看会话记录的 projectDir，再看当前项目目录与清洗名截断冲突的兄弟目录。
 */
async function loadSessionFile(sessionId, storage) {
  if (!isValidKeySegment(sessionId)) return;
  let sessionProjectDir = getSessionProjectDir();
  if (sessionProjectDir !== null) {
    let projectKey = basename(sessionProjectDir);
    if (dirname(sessionProjectDir) !== getProjectsDir() || !isValidKeySegment(projectKey)) return;
    let key = validatedTranscriptKey(STORAGE_SPACES.transcript(projectKey, sessionId));
    if (key === undefined) return;
    return {
      key,
      path: join(sessionProjectDir, `${sessionId}.jsonl`),
    };
  }
  let originalCwdOrNull = getOriginalCwdOrNull();
  let projectKey = getProjectDirNameOverride() ?? getProjectKey(getOriginalCwd());
  let candidates = [projectKey];
  let legacyKey = originalCwdOrNull === null ? undefined : legacyDerivedProjectKey(originalCwdOrNull);
  if (legacyKey !== undefined) candidates.push(legacyKey);
  else if (originalCwdOrNull !== null && projectKey.length > MAX_SANITIZED_LENGTH) {
    let identity = (projectKey) => projectKey;
    let prefix = identity(projectKey.slice(0, MAX_SANITIZED_LENGTH) + "-");
    let exact = identity(projectKey);
    let seen = new Set();
    let matched = [];
    let cursor;
    let pages = 0;
    try {
      do {
        let page = await storage.listEntries(
          {
            namespace: "transcript",
          },
          {
            skipScopeStats: true,
            ...(cursor !== undefined && {
              cursor,
            }),
          },
        );
        if (!page.ok) break;
        for (let item of page.value.items)
          if (
            item.kind === "scope" &&
            item.scope.namespace === "transcript" &&
            item.scope.projectKey !== undefined &&
            identity(item.scope.projectKey).startsWith(prefix) &&
            identity(item.scope.projectKey) !== exact &&
            isValidKeySegment(item.scope.projectKey) &&
            !seen.has(identity(item.scope.projectKey))
          ) {
            seen.add(identity(item.scope.projectKey));
            matched.push(item.scope.projectKey);
          }
        cursor = page.value.cursor;
      } while (cursor && ++pages < MAX_LISTING_PAGES);
    } catch {}
    let source = {
      backend: storage,
      transcriptKey: STORAGE_SPACES.transcript,
      isKeySegment: isValidKeySegment,
      realWorkspacePath: makeWorkspaceRealPath(storage),
    };
    for (let dirKey of matched)
      if (
        await dirBelongsToProject(
          join(getProjectsDir(), dirKey),
          originalCwdOrNull,
          false,
          wrapStorageSource(source),
        )
      )
        candidates.push(dirKey);
  }
  for (let dirKey of candidates) {
    let key = validatedTranscriptKey(STORAGE_SPACES.transcript(dirKey, sessionId));
    if (key === undefined) continue;
    if ((await storage.stat(key)).ok)
      return {
        key,
        path: join(getProjectsDir(), dirKey, `${sessionId}.jsonl`),
      };
  }
  let key = validatedTranscriptKey(STORAGE_SPACES.transcript(projectKey, sessionId));
  return key === undefined
    ? undefined
    : {
        key,
        path: join(getProjectsDir(), projectKey, `${sessionId}.jsonl`),
      };
}
//@ chunk-5xgkngpb.js:523211-523388 layout (2.1.88 match: getErrorsPath, 1)
async function getErrorsPath(sessionId) {
  let sessionProjectDir = getSessionProjectDir();
  let originalCwd = getOriginalCwd();
  let fileName = `${sessionId}.jsonl`;
  let fallbackPath = join(sessionProjectDir ?? getProjectDir(originalCwd), fileName);
  if (sessionProjectDir !== null) return fallbackPath;
  for (let dir of await findProjectDirs(originalCwd)) {
    let candidate = join(dir, fileName);
    try {
      await stat(candidate);
      return candidate;
    } catch {}
  }
  return fallbackPath;
}
//@ chunk-5xgkngpb.js:523388-523436 facade-majority
function clearSessionMessagesCache() {
  currentTranscriptStore().clearSessionMessagesCache();
}
//@ chunk-5xgkngpb.js:523436-523510 facade-majority
function consumeFailedTranscriptWrite() {
  let store = currentTranscriptStore();
  let hasFailedWrite = store.hasFailedWrite;
  store.hasFailedWrite = false;
  return hasFailedWrite;
}
//@ chunk-5xgkngpb.js:523510-523564 facade-majority
function primeSessionMessagesCache(sessionId, uuids) {
  currentTranscriptStore().primeSessionMessagesCache(sessionId, uuids);
}
//@ chunk-5xgkngpb.js:523564-523637 facade-majority
async function doesMessageExistInSession(sessionId, uuid, storageV5) {
  return (await currentTranscriptStore().sessionMessages(sessionId, storageV5)).has(uuid);
}
//@ chunk-5xgkngpb.js:523637-523867 facade-majority
async function isMessageTurnUnanswered(sessionId, messageUuid, storage) {
  try {
    let { messages } = await loadSessionTranscript(sessionId, undefined, storage);
    return isTurnUnanswered([...messages.values()], messageUuid);
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
//@ chunk-5xgkngpb.js:523867-524361 facade-majority
function isTurnUnanswered(messages, startUuid) {
  let index = messages.findIndex((message) => message.uuid === startUuid);
  if (index === -1) return false;
  let later = [];
  for (let idx = index + 1; idx < messages.length; idx++) {
    let message = messages[idx];
    if (
      (message.type === "user" || message.type === "assistant") &&
      !("isSidechain" in message && message.isSidechain === true)
    )
      later.push(message);
  }
  if (later.length === 0) return true;
  let last = later.at(-1);
  if (!(last.type === "user" && last.interruptedByShutdown === true)) return false;
  for (let idx = later.length - 2; idx >= 0; idx--) {
    let message = later[idx];
    if (message.type === "assistant") continue;
    if (
      ("isCompactSummary" in message && message.isCompactSummary === true) ||
      isInterruptionOnlyMessage(message) ||
      isToolResultMessage(message) ||
      isHarnessMetaMessage(message)
    )
      continue;
    return false;
  }
  return true;
}
//@ chunk-5xgkngpb.js:524616-526951 facade-majority (2.1.88 match: getLastSessionLog, 0.227)
async function sessionLogFromTranscriptLoad(sessionId, sessionTranscript, sessionFile) {
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
    sessionOwners,
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
  if (sessionFile === undefined) currentTranscriptStore().primeFilelessResume(sessionId, messages.keys());
  else primeSessionMessagesCache(sessionId, messages.keys());
  let leafMessage =
    findLatestMessage(
      messages.values(),
      (message) =>
        leafUuids.has(message.uuid) &&
        !message.isSidechain &&
        (message.type === "user" || message.type === "assistant"),
    ) ?? (leafUuids.size === 0 && !clearedToEmpty ? filterResumableSessions_2(messages) : undefined);
  if (!leafMessage) {
    if (clearedToEmpty && sessionFile !== undefined) {
      let modifiedAt = await sessionFile.modifiedAt();
      return buildLiteLogFromMessages(
        sessionTranscript,
        {
          date: modifiedAt.toISOString(),
          fullPath: sessionFile.path,
          created: modifiedAt,
          modified: modifiedAt,
        },
        sessionId,
      );
    }
    return null;
  }
  let transcript = buildConversationChain(messages, leafMessage);
  warnIfTranscriptUnchained(messages, transcript, leafMessage.sessionId);
  let sessionId_2 = leafMessage.sessionId;
  let summary = summaries.get(leafMessage.uuid);
  let customTitle = customTitles.get(sessionId_2);
  let tag = tags.get(sessionId_2);
  let agentSetting = agentSettings.get(sessionId_2);
  let baseLog = convertToLogOption(
    transcript,
    0,
    summary,
    customTitle,
    buildFileHistorySnapshots(fileHistorySnapshots, fileHistoryDeltas, transcript),
    tag,
    sessionFile?.path,
    buildAttributionSnapshotChain(attributionSnapshots),
    agentSetting,
    contentReplacements.get(sessionId_2) ?? [],
  );
  let relocatedCwd = relocatedCwds.get(sessionId_2);
  let log = {
    ...baseLog,
    ...(sessionFile === undefined && {
      sessionId,
    }),
    fileSnapshots: getFileSnapshotMessages(messages),
    projectPath: relocatedCwd ?? baseLog.projectPath,
    rewindAnchorUuid: sessionTranscript.rewindAnchorUuid,
    aiTitle: aiTitles.get(sessionId_2),
    relocatedCwd,
    ...withEndedByModel({}, endedSessions.has(sessionId_2)),
    agentName: agentNames.get(sessionId_2) ?? baseLog.agentName,
    agentColor: agentColors.get(sessionId_2),
    mode: modes.get(sessionId_2),
    permissionMode: permissionModes.get(sessionId_2),
    isolationLatch: isolationLatches.get(sessionId_2),
    devModsFolder: devModsFolders?.get(sessionId_2),
    sessionOwner: sessionOwners?.get(sessionId_2),
    memoryModeStamps: memoryModeStamps.get(sessionId_2) ?? [],
    atisLatch: getOrEmptyString(atisLatches, sessionId_2),
    toolsUsed: toolsUsedLists?.get(sessionId_2),
    prNumber: prNumbers.get(sessionId_2),
    prUrl: prUrls.get(sessionId_2),
    prRepository: prRepositories.get(sessionId_2),
    bridgeSessionId: bridgeSessionIds.get(sessionId_2),
    bridgeLastSeq: bridgeLastSeqs.get(sessionId_2),
    bridgeDialogKinds: bridgeDialogKindsBySession.get(sessionId_2),
    bridgeSessionGroupingId: bridgeSessionGroupingIds.get(sessionId_2),
    bridgeNoHistoryBackfill: bridgeNoBackfill.get(sessionId_2),
    bridgeOwnerAccountUuid: bridgeOwnerAccountUuids.get(sessionId_2),
    bridgeOwnerOrganizationUuid: bridgeOwnerOrganizationUuids.get(sessionId_2),
    sessionHistorySuppressed: historySuppressed.has(sessionId_2) ? true : undefined,
    worktreeSession: worktreeStates.get(sessionId_2),
    artifactCommentMonitor: artifactCommentMonitors.get(sessionId_2),
    artifactAutoReactLedger: artifactAutoReactLedgers.get(sessionId_2),
    costState: costStates.get(sessionId_2),
  };
  log.replMode = weakMap_7.get(messages)?.get(sessionId_2);
  if (sessionFile !== undefined) {
    let project = currentTranscriptStore().project;
    recordLoadReportSafely(
      log,
      messages,
      transcript,
      project
        ? {
            writer: project,
            sessionId,
          }
        : undefined,
    );
  }
  return log;
}
//@ chunk-5xgkngpb.js:526951-527079 facade-majority (2.1.88 match: loadMessageLogs, 1)
/**
 * 加载当前项目的会话日志列表并富化。
 */
async function loadMessageLogs(limit, storage) {
  let sessionLogs = await fetchLogs(limit, storage);
  let { logs: enriched } = await enrichLogs(sessionLogs, 0, sessionLogs.length, storage);
  let sorted = sortLogs(enriched);
  sorted.forEach((log, i) => {
    log.value = i;
  });
  return sorted;
}
//@ chunk-5xgkngpb.js:527079-527245 facade-majority
async function findFirstMessageLog(logs, onLog, storage) {
  let buf = Buffer.alloc(LITE_READ_BUF_SIZE);
  for (let log of logs) {
    let enriched = await enrichLog(log, buf, storage);
    if (!enriched) continue;
    let stop = onLog(enriched);
    if (stop === "stop") return null;
    if (stop) return enriched;
  }
  return null;
}
//@ chunk-5xgkngpb.js:527245-527377 facade-majority (2.1.88 match: loadAllProjectsMessageLogs, 1)
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
//@ chunk-5xgkngpb.js:527377-527388 layout
var LOG_LIST_CONCURRENCY = 64;
//@ chunk-5xgkngpb.js:527388-527691 layout
async function listTranscriptProjectKeys(storage) {
  let keys = new Set();
  let cursor;
  let pages = 0;
  try {
    do {
      let page = await storage.listEntries(
        {
          namespace: "transcript",
        },
        {
          skipScopeStats: true,
          ...(cursor !== undefined && {
            cursor,
          }),
        },
      );
      if (!page.ok) return;
      for (let item of page.value.items) {
        let key = listedProjectKey(item, isValidKeySegment);
        if (key !== undefined) keys.add(key);
      }
      cursor = page.value.cursor;
    } while (cursor && ++pages < LOG_LIST_CONCURRENCY);
    if (cursor) return;
  } catch {
    return;
  }
  return [...keys];
}
//@ chunk-5xgkngpb.js:527691-528491 fingerprint (2.1.88 match: loadAllProjectsMessageLogsFull, 0.838)
async function loadAllProjectsMessageLogsFull(limit, storage) {
  let projectsDir = getProjectsDir();
  let keys = isStorageV5Enabled() && storage ? await listTranscriptProjectKeys(storage) : undefined;
  if (storage && keys !== undefined) {
    let results = await Promise.all(
      keys.map((key) =>
        getLogsWithoutIndex(join(projectsDir, key), limit, {
          backend: storage,
          projectKey: key,
        }),
      ),
    );
    let deduped = new Map();
    for (let log of results.flat()) {
      let key = `${log.sessionId ?? ""}:${log.leafUuid ?? ""}`;
      let existing = deduped.get(key);
      if (!existing || log.modified.getTime() > existing.modified.getTime()) deduped.set(key, log);
    }
    let sorted = sortLogs([...deduped.values()]);
    sorted.forEach((log, value) => {
      log.value = value;
    });
    return sorted;
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
  let logs = (
    await Promise.all(projectDirs.map((projectDir) => getLogsWithoutIndex(projectDir, limit)))
  ).flat();
  let deduped = new Map();
  for (let log of logs) {
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
//@ chunk-5xgkngpb.js:528491-529000 facade-majority (2.1.88 match: loadAllProjectsMessageLogsProgressive, 0.915)
/**
 * 分批渐进加载所有项目的会话日志，默认每批 50。
 */
async function loadAllProjectsMessageLogsProgressive(
  limit,
  initialEnrichCount = DEFAULT_LOG_PAGE_SIZE,
  storageV5,
) {
  let projectsDir = getProjectsDir();
  let keys = isStorageV5Enabled() && storageV5 ? await listTranscriptProjectKeys(storageV5) : undefined;
  let dirs;
  if (keys !== undefined) dirs = keys.map((key) => join(projectsDir, key));
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
    dirs = dirents.filter((dirent) => dirent.isDirectory()).map((dirent) => join(projectsDir, dirent.name));
  }
  let rawLogs = await Promise.all(
    dirs.map((dirent) => getSessionFilesLite(dirent, limit, undefined, storageV5)),
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
//@ chunk-5xgkngpb.js:529000-529064 facade-majority (2.1.88 match: loadMessageLogs, 1)
async function loadSameRepoMessageLogs(
  worktreePaths,
  limit,
  initialEnrichCount = DEFAULT_LOG_PAGE_SIZE,
  storage,
) {
  return (await loadSameRepoMessageLogsProgressive(worktreePaths, limit, initialEnrichCount, storage)).logs;
}
//@ chunk-5xgkngpb.js:529064-529369 facade-majority (2.1.88 match: loadSameRepoMessageLogsProgressive, 1)
/**
 * 渐进加载同一仓库（含其 worktree）的会话日志。
 */
async function loadSameRepoMessageLogsProgressive(
  worktreePaths,
  limit,
  initialEnrichCount = DEFAULT_LOG_PAGE_SIZE,
  storage,
) {
  logForDebugging(
    `/resume: loading sessions for cwd=${getOriginalCwd()}, worktrees=[${worktreePaths.join(", ")}]`,
  );
  let allStatLogs = await getStatOnlyLogsForWorktrees(worktreePaths, limit, storage);
  logForDebugging(`/resume: found ${allStatLogs.length} session files on disk`);
  let { logs, nextIndex } = await enrichLogs(allStatLogs, 0, initialEnrichCount, storage);
  sortLogs(logs).forEach((log, i) => {
    log.value = i;
  });
  return {
    logs,
    allStatLogs,
    nextIndex,
  };
}
//@ chunk-5xgkngpb.js:529369-532177 fingerprint (2.1.88 match: getStatOnlyLogsForWorktrees, 0.326)
/**
 * 为各 worktree 对应的项目目录列出会话文件（只 stat 不读内容）。
 */
async function getStatOnlyLogsForWorktrees(worktreePaths, limit, storage) {
  let projectsDir = getProjectsDir();
  let cwd = getOriginalCwd();
  let keysPromise;
  let getKeys = (storage) => (keysPromise ??= listTranscriptProjectKeys(storage));
  let normalize = normalizeSlashesForCompare;
  let projectDir = normalize(cwd);
  let worktreeRoot = worktreePaths
    .filter((wt) => {
      let normalized = normalize(wt);
      return projectDir === normalized || projectDir.startsWith(normalized + "/");
    })
    .sort((a, b) => b.length - a.length)[0];
  let aliases = normalizeCaseForComparison_2(
    (
      await Promise.all(
        (worktreeRoot && worktreeRoot !== cwd ? [cwd, worktreeRoot] : [cwd]).map((dir) =>
          readSessionAliases(dir, storage),
        ),
      )
    ).flat(),
  );
  let aliasLogs =
    aliases.length > 0
      ? (await Promise.all(aliases.map((dir) => getSessionFilesLite(dir, limit, undefined, storage))))
          .flat()
          .map((log) => ({
            ...log,
            isAlias: true,
          }))
      : [];
  if (worktreePaths.length <= 1) {
    let projectDir = getProjectDir(cwd);
    let sessionFilesLite = await getSessionFilesLite(projectDir, undefined, cwd, storage);
    let unsafeLogs =
      UNSAFE_PATH_CHAR_PATTERN.test(cwd) && (await allLogsShareCwd(sessionFilesLite, cwd, storage))
        ? await getSessionFilesLite_2(cwd, projectDir, limit, false, undefined, storage, getKeys)
        : [];
    let base = worktreeRoot ?? cwd;
    let foldCase = false;
    let worktreePrefix = `${sanitizePath(base)}--claude-worktrees-`;
    let worktreeDirLogs = [];
    let keys = isStorageV5Enabled() && storage ? await getKeys(storage) : undefined;
    if (keys !== undefined)
      worktreeDirLogs = (
        await Promise.all(
          keys
            .filter((key) => key.startsWith(worktreePrefix))
            .map((key) => getSessionFilesLite(join(projectsDir, key), limit, undefined, storage)),
        )
      ).flat();
    else if (!isDiskless())
      try {
        let dirents = await readdir(projectsDir, {
          withFileTypes: true,
        });
        worktreeDirLogs = (
          await Promise.all(
            dirents
              .filter((dirent) => dirent.isDirectory() && dirent.name.startsWith(worktreePrefix))
              .map((dirent) =>
                getSessionFilesLite(join(projectsDir, dirent.name), limit, undefined, storage),
              ),
          )
        ).flat();
      } catch (error) {
        logForDebugging(`Failed to sweep .claude/worktrees project dirs under ${projectsDir}: ${error}`);
      }
    if (aliasLogs.length > 0 || unsafeLogs.length > 0 || worktreeDirLogs.length > 0)
      return latestLogPerSession([...sessionFilesLite, ...unsafeLogs, ...worktreeDirLogs, ...aliasLogs]);
    return sessionFilesLite;
  }
  let foldCase = false;
  let indexed = worktreePaths.map((wt) => {
    let sanitized = getProjectKey(wt);
    let name = foldCase ? sanitized.toLowerCase() : sanitized;
    return {
      path: wt,
      exactName: name,
      truncatedPrefix:
        sanitized.length > MAX_SANITIZED_LENGTH ? name.slice(0, MAX_SANITIZED_LENGTH) : undefined,
    };
  });
  indexed.sort((a, b) => b.exactName.length - a.exactName.length);
  let seenDirs = new Set();
  let dirNames;
  let keys = isStorageV5Enabled() && storage ? await getKeys(storage) : undefined;
  if (keys !== undefined) dirNames = keys;
  else {
    let dirents;
    try {
      if (isDiskless()) throw Error("not read in a diskless session");
      dirents = await readdir(projectsDir, {
        withFileTypes: true,
      });
    } catch (error) {
      logForDebugging(
        `Failed to read projects dir ${projectsDir}, falling back to current project: ${error}`,
      );
      let projectDir = getProjectDir(getOriginalCwd());
      let sessionFilesLite = await getSessionFilesLite(projectDir, limit, getOriginalCwd(), storage);
      return aliasLogs.length > 0
        ? latestLogPerSession(sessionFilesLite.concat(aliasLogs))
        : sessionFilesLite;
    }
    dirNames = dirents.filter((dirent) => dirent.isDirectory()).map((dirent) => dirent.name);
  }
  let scanPaths = worktreeRoot === undefined ? [cwd, ...worktreePaths] : worktreePaths;
  let dirsWithPath = [];
  if (worktreeRoot === undefined) {
    let projectDir = getProjectDir(cwd);
    let name = basename(projectDir);
    seenDirs.add(foldCase ? name.toLowerCase() : name);
    dirsWithPath.push({
      projectDir,
      wtPath: cwd,
    });
  }
  for (let dirent of dirNames) {
    let name = foldCase ? dirent.toLowerCase() : dirent;
    if (seenDirs.has(name)) continue;
    for (let { path: wtPath, exactName, truncatedPrefix } of indexed)
      if (
        name === exactName ||
        (truncatedPrefix !== undefined
          ? name.startsWith(truncatedPrefix + "-") &&
            (await dirBelongsToProject(
              join(projectsDir, dirent),
              wtPath,
              foldCase,
              wrapStorageSource(getTranscriptStorageContext(storage)),
            ))
          : exactName.length < MAX_SANITIZED_LENGTH && name.startsWith(exactName + "-"))
      ) {
        seenDirs.add(name);
        dirsWithPath.push({
          projectDir: join(projectsDir, dirent),
          wtPath,
        });
        break;
      }
  }
  let results = await Promise.all(
    dirsWithPath.map(({ projectDir, wtPath }) =>
      getSessionFilesLite(projectDir, undefined, wtPath, storage, scanPaths),
    ),
  );
  let logsByWt = new Map();
  for (let idx = 0; idx < dirsWithPath.length; idx++) {
    let wtPath = dirsWithPath[idx].wtPath;
    let list = logsByWt.get(wtPath) ?? [];
    list.push(...results[idx]);
    logsByWt.set(wtPath, list);
  }
  let unsafePaths = [];
  for (let path of scanPaths)
    if (
      UNSAFE_PATH_CHAR_PATTERN.test(path) &&
      (await allLogsShareCwd(logsByWt.get(path) ?? [], path, storage, scanPaths))
    )
      unsafePaths.push(path);
  let projectDirs = unsafePaths.length > 0 ? await listProjectDirs(storage, getKeys) : [];
  let results_2 = await Promise.all(
    unsafePaths.map(async (path) => {
      let resolved = path;
      try {
        if (isStorageV5Enabled() && storage !== undefined) {
          let realResult = await makeWorkspaceRealPath(storage)(path);
          if (realResult.ok && realResult.value.found) resolved = identity(realResult.value.path);
          else if (!realResult.ok)
            logForDebugging(
              `/resume: worktree path not resolved through the storage backend (${formatStorageError(realResult.error)}); using it as registered`,
            );
        } else resolved = identity(await realpath(path));
      } catch {}
      return getSessionFilesLite_2(resolved, getProjectDir(path), limit, true, projectDirs, storage);
    }),
  );
  return latestLogPerSession(results.flat().concat(results_2.flat(), aliasLogs));
}
//@ chunk-5xgkngpb.js:532177-532210 layout
function normalizeSlashesForCompare(path) {
  return normalizePathForCwdCompare(path, false);
}
//@ chunk-5xgkngpb.js:532210-532238 layout
var UNSAFE_PATH_CHAR_PATTERN = /[^a-zA-Z0-9/\\:-]/;
//@ chunk-5xgkngpb.js:532238-532347 layout
async function allLogsShareCwd(sessionFilesLite, cwd, storage, scanPaths) {
  let buf = Buffer.alloc(LITE_READ_BUF_SIZE);
  for (let log of sessionFilesLite)
    if (!(await logCwdMatches(log, cwd, buf, storage, scanPaths))) return false;
  return true;
}
//@ chunk-5xgkngpb.js:532347-532563 layout
async function logCwdMatches(log, cwd, buf, storage, scanPaths) {
  if (!log.fullPath) return false;
  let liteMetadata = await readLiteMetadata(log.fullPath, log.fileSize ?? 0, buf, storage);
  let recordedCwd = liteMetadata.relocatedCwd ?? liteMetadata.headCwdStrict;
  if (recordedCwd === undefined) return false;
  if (recordedCwdIsWithinOwnWorktrees(recordedCwd, scanPaths, slugCollisionGuardFoldsCase())) return false;
  return recordedCwdCollidesWithProjectResolved(
    recordedCwd,
    cwd,
    slugCollisionGuardFoldsCase(),
    hasUntouchableRecordSpellingAsync,
    getRealPathOptions(storage),
  );
}
//@ chunk-5xgkngpb.js:532563-532574 layout
var PROJECT_SCAN_CONCURRENCY = 32;
//@ chunk-5xgkngpb.js:532574-533163 layout
async function listProjectDirs(storage, listKeys) {
  let projectsDir = getProjectsDir();
  let names;
  let keys =
    isStorageV5Enabled() && storage ? await (listKeys ?? listTranscriptProjectKeys)(storage) : undefined;
  if (keys !== undefined) names = keys;
  else if (isDiskless()) return [];
  else {
    let dirents;
    try {
      dirents = await readdir(projectsDir, {
        withFileTypes: true,
      });
    } catch {
      return [];
    }
    names = dirents.filter((dirent) => dirent.isDirectory()).map((dirent) => dirent.name);
  }
  let scanOne = limitConcurrency(PROJECT_SCAN_CONCURRENCY, async (name) => {
    let dir = join(projectsDir, name);
    let newest = [...(await getSessionFilesWithMtime(dir, storage)).values()].sort(
      (a, b) => b.mtime - a.mtime,
    )[0];
    if (!newest) return null;
    let buf = Buffer.allocUnsafe(LITE_READ_BUF_SIZE);
    try {
      let liteMetadata = await readLiteMetadata(newest.path, newest.size, buf, storage);
      let recordedCwd = liteMetadata.relocatedCwd ?? liteMetadata.headCwdStrict;
      if (recordedCwd)
        return {
          projectDir: dir,
          recordedCwd: normalizeSlashesForCompare(recordedCwd),
        };
    } catch {}
    return null;
  });
  return (await Promise.all(names.map((name) => scanOne(name)))).filter((result) => result !== null);
}
//@ chunk-5xgkngpb.js:533163-533776 layout (2.1.88 match: getSessionFilesLite, 0.917)
/**
 * 读取会话文件头尾得到 lite 日志（首条提示、标题、分支、cwd 等），不解析整份文件。
 */
async function getSessionFilesLite_2(
  wtPath,
  projectDir,
  limit,
  prefixMatch = false,
  dirs,
  storage,
  listKeys,
) {
  let scanDirs = dirs ?? (await listProjectDirs(storage, listKeys));
  let normalizedPath = normalizeSlashesForCompare(wtPath);
  let logs = [];
  for (let { projectDir: projectDir_2, recordedCwd } of scanDirs) {
    if (projectDir_2 === projectDir) continue;
    if (recordedCwd !== normalizedPath && !(prefixMatch && recordedCwd.startsWith(normalizedPath + "/")))
      continue;
    let entries = [...(await getSessionFilesWithMtime(projectDir_2, storage)).entries()].sort(
      (a, b) => b[1].mtime - a[1].mtime,
    );
    if (limit && entries.length > limit) entries = entries.slice(0, limit);
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
        projectPath: wtPath,
      });
  }
  let sorted = sortLogs(logs);
  sorted.forEach((log, i) => {
    log.value = i;
  });
  return sorted;
}
//@ chunk-5xgkngpb.js:533776-533789 facade-majority
var QUEUED_ROWS_WAIT_MS = 2000;
//@ chunk-5xgkngpb.js:533789-534209 layout
function drainQueuedAgentRows(agentIds, signal) {
  let { project, writerHealth } = currentTranscriptStore();
  let startTime = performance.now();
  let failureSeq = writerHealth.failureSeq;
  return agentIds
    .reduce(
      (acc, agentId) =>
        acc ?? project?.drainQueuedRows(getAgentTranscriptPath(agentId), QUEUED_ROWS_WAIT_MS, signal),
      undefined,
    )
    ?.then((outcome) => {
      let waitMs = Math.round(performance.now() - startTime);
      if (outcome === "timed_out")
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
//@ chunk-5xgkngpb.js:534209-535124 facade-majority
/**
 * 读取子代理转录，校验路径在项目目录内，返回消息与状态。
 */
async function getAgentTranscript(agentId, storage, options) {
  let drained = options?.alreadyWaited ? undefined : drainQueuedAgentRows([agentId], options?.signal);
  if (drained !== undefined) await drained;
  let agentTranscript = await getAgentTranscript_2(agentId, storage);
  let project = getProject();
  if (agentTranscript.transcript) {
    if (options?.trustLocal || !project.mustVerifyAgentTranscript(agentId)) return agentTranscript.transcript;
    let fetchOutcome = await project.hydrateAgentTranscriptOnDemand(agentId, storage, options?.signal, true);
    if (fetchOutcome !== "hit") return agentTranscript.transcript;
    let agentTranscript_2 = await getAgentTranscript_2(agentId, storage);
    if (!agentTranscript_2.transcript)
      logForDiagnosticsNoPII("warn", "agent_transcript_unresumable", {
        reason: agentTranscript_2.miss,
        fetch: fetchOutcome,
      });
    return agentTranscript_2.transcript;
  }
  if (!project.hasInternalAgentEventReader()) return null;
  let canHydrate =
    agentTranscript.miss === "absent" ||
    agentTranscript.miss === "inaccessible" ||
    (agentTranscript.miss !== "load_threw" &&
      !agentTranscript.hasContent &&
      !(await transcriptFileHasContentEntry(getAgentTranscriptPath(agentId), storage)));
  let fetchMode = "skipped";
  let reason = agentTranscript.miss;
  if (canHydrate) {
    try {
      fetchMode = await project.hydrateAgentTranscriptOnDemand(agentId, storage, options?.signal);
    } catch (error) {
      if (!(error instanceof AgentTranscriptFetchError) || !project.hasWrittenAgentLocally(agentId))
        throw error;
      fetchMode = error.outcome;
    }
    if (fetchMode !== "unsafe_id") {
      let agentTranscript = await getAgentTranscript_2(agentId, storage);
      if (agentTranscript.transcript) return agentTranscript.transcript;
      reason = agentTranscript.miss;
    }
  }
  logForDiagnosticsNoPII("warn", "agent_transcript_unresumable", {
    reason,
    fetch: fetchMode,
  });
  return null;
}
//@ chunk-5xgkngpb.js:535124-536841 callgraph-fingerprint (2.1.88 match: getAgentTranscript, 0.182)
async function getAgentTranscript_2(agentId, storage) {
  let hasContent = false;
  let miss = (miss) => ({
    transcript: null,
    miss,
    hasContent,
  });
  let agentFile = getAgentTranscriptPath(agentId);
  let key = storage === undefined ? undefined : transcriptStorageKeyForPath(agentFile);
  let loadOptions =
    !isStorageV5Enabled() || storage === undefined || key === undefined
      ? undefined
      : {
          storageV5: {
            backend: storage,
            key,
          },
        };
  if (isStorageV5Enabled() && storage !== undefined && loadOptions === undefined)
    logForDebugging(
      "getAgentTranscript: agent transcript path is outside the storage keyspace; reading it raw",
    );
  try {
    let transcriptFile = await loadTranscriptFile(agentFile, loadOptions);
    if (transcriptFile.servedBy === "absent") {
      logForDebugging("getAgentTranscript: the storage backend does not hold this agent transcript");
      return miss("absent");
    }
    if (transcriptFile.servedBy === "inaccessible") {
      logForDebugging(
        "getAgentTranscript: the storage backend cannot serve this agent transcript (permission); not resumable",
      );
      return miss("inaccessible");
    }
    let { messages, agentContentReplacements, forkContextRefs } = transcriptFile;
    for (let message of messages.values())
      if (isConversationEntry(message)) {
        hasContent = true;
        break;
      }
    let agentMessages = Array.from(messages.values()).filter(
      (msg) => msg.agentId === agentId && msg.isSidechain,
    );
    if (agentMessages.length === 0)
      return miss(
        transcriptFile.servedBy === undefined && messages.size === 0 ? "absent" : "no_agent_messages",
      );
    let parentUuids = new Set(agentMessages.map((msg) => msg.parentUuid));
    let leafMessage = findLatestMessage(
      agentMessages,
      (msg) =>
        !parentUuids.has(msg.uuid) &&
        !(msg.type === "system" && "subtype" in msg && msg.subtype === "compact_boundary"),
    );
    if (!leafMessage) return miss("no_leaf");
    let mapped = buildConversationChain(messages, leafMessage)
      .filter((msg) => msg.agentId === agentId)
      .map(({ isSidechain, parentUuid, promptId, ...msg }) => withoutTaskProducerMark(msg));
    let forkContextRef = forkContextRefs.get(agentId);
    return {
      transcript: {
        messages:
          forkContextRef === undefined
            ? mapped
            : (await hydrateForkContext(forkContextRef, undefined, storage)).concat(mapped),
        contentReplacements: agentContentReplacements.get(agentId) ?? [],
      },
    };
  } catch (error) {
    if (loadOptions !== undefined) {
      let cause =
        error instanceof Error && typeof error.cause === "object" && error.cause !== null ? error.cause : {};
      logForDebugging(
        cause.failureClass === undefined
          ? "getAgentTranscript: cannot resume this agent transcript flag-on (thrown while loading)"
          : `getAgentTranscript: the storage backend cannot serve this agent transcript (${[cause.failureClass, cause.telemetryCode].filter((msg) => msg !== undefined).join("/")}); not resumable`,
      );
    }
    return miss("load_threw");
  }
}
//@ chunk-5xgkngpb.js:536841-537110 facade-majority (2.1.88 match: extractAgentIdsFromMessages, 1)
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
  return normalizeCaseForComparison_2(agentIds);
}
//@ chunk-5xgkngpb.js:537110-537481 facade-majority
async function loadSubagentTranscripts(agentIds, storage) {
  let filtered = agentIds.filter(isSafeIdSegment);
  let drained = drainQueuedAgentRows(filtered.map(identityAgentId2));
  if (drained !== undefined) await drained;
  let results = await Promise.all(
    filtered.map(async (agentId) => {
      try {
        let result = await getAgentTranscript(identityAgentId2(agentId), storage, {
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
  return Object.fromEntries(
    results.filter((result) => result !== null).map((result) => [result.agentId, result.transcript]),
  );
}
//@ chunk-5xgkngpb.js:537481-537553 facade-majority
async function loadAllSubagentTranscriptsFromDisk(storage) {
  return loadSubagentTranscripts(
    await listSubagentIdsFromDisk(isStorageV5Enabled() && storage !== undefined ? storage : undefined),
    storage,
  );
}
//@ chunk-5xgkngpb.js:537553-537573 layout
var EMPTY_SET; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-5xgkngpb.js:537553", () => {
  EMPTY_SET = new Set([]);
});
//@ chunk-5xgkngpb.js:537573-537656 callgraph-fingerprint (2.1.88 match: isTranscriptMessage, 0.46)
function isTranscriptMessage_2(entry) {
  return entry.type === "attachment" && entry.attachment?.type === "fork_briefing";
}
//@ chunk-5xgkngpb.js:537656-537758 layout (2.1.88 match: filterResumableSessions, 1)
function filterResumableSessions_2(logs) {
  return (
    findLatestMessage(logs.values(), (message) => !message.isSidechain && !isFileSnapshotMessage(message)) ??
    findLatestMessage(logs.values(), (message) => !message.isSidechain)
  );
}
//@ chunk-5xgkngpb.js:537758-538153 facade-majority (2.1.88 match: isLoggableMessage, 0.611)
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
//@ chunk-5xgkngpb.js:538153-538340 facade-majority
function collectReplIds(messages, ids = new Set()) {
  for (let m of messages)
    if (m.type === "assistant" && Array.isArray(m.message.content)) {
      for (let block of m.message.content)
        if (block.type === "tool_use" && isEvalToolCallName(block.name)) ids.add(block.id);
    }
  return ids;
}
//@ chunk-5xgkngpb.js:538340-538412 layout
function isMetaVirtualUserRow(message) {
  return message.type === "user" && message.isMeta === true && message.isVirtual === true;
}
//@ chunk-5xgkngpb.js:538412-539596 fingerprint (2.1.88 match: transformMessagesForExternalTranscript, 0.451)
function transformMessagesForExternalTranscript(messages, replIds) {
  let resumedIdx = new Set();
  if (
    messages.some((message) => message.type === "assistant" && message.resumedFromIncompleteThinking === true)
  )
    for (let { fromIdx, toIdx } of findResumedThinkingRanges(messages))
      for (let idx = fromIdx; idx <= toIdx; idx++) resumedIdx.add(idx);
  return messages.flatMap((m, index) => {
    if (m.type === "assistant" && Array.isArray(m.message.content)) {
      let content = m.message.content;
      let keptContent = content.some((block) => block.type === "tool_use" && isEvalToolCallName(block.name))
        ? content.filter((block) => !(block.type === "tool_use" && isEvalToolCallName(block.name)))
        : content;
      if (keptContent.length === 0) return [];
      if (m.isVirtual && !resumedIdx.has(index) && m.virtualInResumeRun !== true) {
        let { isVirtual: _omit, ...rest } = m;
        return [
          {
            ...rest,
            message: {
              ...m.message,
              content: keptContent,
            },
          },
        ];
      }
      if (keptContent !== content)
        return [
          {
            ...m,
            message: {
              ...m.message,
              content: keptContent,
            },
          },
        ];
      return [m];
    }
    if (m.type === "user" && Array.isArray(m.message.content)) {
      let content = m.message.content;
      let keptContent = content.some(
        (block) => block.type === "tool_result" && replIds.has(block.tool_use_id),
      )
        ? content.filter((block) => !(block.type === "tool_result" && replIds.has(block.tool_use_id)))
        : content;
      if (keptContent.length === 0) return [];
      if (
        m.isVirtual &&
        !isMetaVirtualUserRow(m) &&
        !resumedIdx.has(index) &&
        m.virtualInResumeRun !== true
      ) {
        let { isVirtual: _omit, ...rest } = m;
        return [
          {
            ...rest,
            message: {
              ...m.message,
              content: keptContent,
            },
          },
        ];
      }
      if (keptContent !== content)
        return [
          {
            ...m,
            message: {
              ...m.message,
              content: keptContent,
            },
          },
        ];
      return [m];
    }
    if (
      "isVirtual" in m &&
      m.isVirtual &&
      !isMetaVirtualUserRow(m) &&
      !resumedIdx.has(index) &&
      ("virtualInResumeRun" in m ? m.virtualInResumeRun !== true : true)
    ) {
      let { isVirtual: _omit, ...rest } = m;
      return [rest];
    }
    return [m];
  });
}
//@ chunk-5xgkngpb.js:539596-539809 facade-majority (2.1.88 match: loadMessagesFromJsonlPath, 0.447)
function toTranscriptEntries(rows, sessionId) {
  let tip = null;
  return cleanMessagesForLogging(rows.slice()).map((message) => {
    let entry = {
      ...message,
      cwd: getCwdOrNull() ?? undefined,
      userType: getUserType(),
      sessionId,
      timestamp: message.timestamp,
      version: transcriptVersion(message),
      parentUuid: tip,
      isSidechain: false,
    };
    if (isChainParticipant(message)) tip = message.uuid;
    return entry;
  });
}
//@ chunk-5xgkngpb.js:539809-540030 facade-majority
function cleanMessagesForLogging(allMessages, messages = allMessages) {
  let messages_2 = allMessages
    .filter(isLoggableMessage)
    .map((message) => replaceUnsentMediaInToolResult(resolveMessageAlias(message)));
  if (getUserType() === "ant") return messages_2;
  if (codeModeAccepted() && currentTranscriptStore().project?.currentSessionCodeMode === true)
    return messages_2;
  let replIds =
    messages instanceof Set
      ? messages
      : typeof messages === "function"
        ? messages()
        : collectReplIds(messages);
  return transformMessagesForExternalTranscript(messages_2, replIds);
}
//@ chunk-5xgkngpb.js:540030-540091 facade-majority
async function getLogByIndex(index, storage) {
  return (await loadMessageLogs(undefined, storage))[index] || null;
}
//@ chunk-5xgkngpb.js:540091-540140 facade-majority
function findUnresolvedToolUseInTranscript(toolUseId, message) {
  return findUnresolvedToolUsesInTranscript(toolUseId, [message]).get(message) ?? null;
}
//@ chunk-5xgkngpb.js:540140-540546 facade-majority
function findUnresolvedToolUsesInTranscript(messages, pendingIds) {
  let pending = new Set(pendingIds);
  let holders = new Map();
  for (let message of messages)
    if (message.type === "assistant") {
      let content = message.message.content;
      if (Array.isArray(content)) {
        for (let block of content)
          if (block.type === "tool_use" && pending.has(block.id)) holders.set(block.id, message);
      }
    } else if (message.type === "user") {
      if (isShutdownInterrupted(message)) continue;
      let content = message.message.content;
      if (Array.isArray(content)) {
        for (let block of content)
          if (block.type === "tool_result" && pending.has(block.tool_use_id)) {
            pending.delete(block.tool_use_id);
            holders.delete(block.tool_use_id);
          }
      }
    }
  return holders;
}
//@ chunk-5xgkngpb.js:540546-540608 facade-majority
async function findUnresolvedToolUse(toolUseId, storage) {
  return (await findUnresolvedToolUses([toolUseId], storage)).get(toolUseId) ?? null;
}
//@ chunk-5xgkngpb.js:540608-540702 facade-majority
async function findUnresolvedToolUses(ids, storage) {
  if (ids.length === 0) return new Map();
  return (await findUnresolvedToolUsesInTranscript_2(ids, storage))?.found ?? new Map();
}
//@ chunk-5xgkngpb.js:540702-541036 facade-majority
async function findUnresolvedToolUseMessageRows(toolUseId, storage) {
  let unresolvedToolUsesInTranscript = await findUnresolvedToolUsesInTranscript_2([toolUseId], storage);
  let holder = unresolvedToolUsesInTranscript?.found.get(toolUseId);
  if (unresolvedToolUsesInTranscript === null || holder === undefined) return null;
  try {
    return {
      holder,
      messageRows: assistantMessageRowsInTranscript(unresolvedToolUsesInTranscript.messages, holder),
    };
  } catch (error) {
    logForDebugging(
      `findUnresolvedToolUseMessageRows: could not group the rows of tool_use ${toolUseId}'s message, restoring the call alone: ${error}`,
      {
        level: "warn",
      },
    );
    return {
      holder,
      messageRows: [holder],
    };
  }
}
//@ chunk-5xgkngpb.js:541036-541670 facade-majority
function assistantMessageRowsInTranscript(messages, holder) {
  let id = holder.message.id;
  let holderRow = messages.get(holder.uuid);
  if (!id || holderRow === undefined) return [holder];
  let seen = new Set([holderRow]);
  for (
    let current = holderRow.parentUuid && messages.get(holderRow.parentUuid);
    current && !seen.has(current);
    current = current.parentUuid && messages.get(current.parentUuid)
  ) {
    seen.add(current);
    if (!isAssistantWithMessageId(current, id) && isUserOrAssistant(current)) break;
  }
  let children = new Map();
  for (let message of messages.values())
    if (message.parentUuid) {
      let list = children.get(message.parentUuid);
      if (list) list.push(message);
      else children.set(message.parentUuid, [message]);
    }
  let queue = [holderRow];
  while (queue.length > 0) {
    let next = [];
    for (let message of queue)
      for (let child of children.get(message.uuid) ?? []) {
        if (seen.has(child)) continue;
        seen.add(child);
        if (isAssistantWithMessageId(child, id) || !isUserOrAssistant(child)) next.push(child);
      }
    queue = next;
  }
  let rows = [];
  for (let message of messages.values())
    if (
      message.type === "assistant" &&
      message.message.id === id &&
      (seen.has(message) || (message.uuid !== holder.uuid && getAssistantToolUseIds(message)))
    )
      rows.push(message);
  return rows;
}
//@ chunk-5xgkngpb.js:541670-541776 layout
function getAssistantToolUseIds(message) {
  return (
    Array.isArray(message.message.content) &&
    message.message.content.some((contentBlock) => contentBlock.type === "tool_use")
  );
}
//@ chunk-5xgkngpb.js:541776-541840 layout
function isAssistantWithMessageId(message, id) {
  return message.type === "assistant" && message.message.id === id;
}
//@ chunk-5xgkngpb.js:541840-541901 layout
function isUserOrAssistant(message) {
  return message.type === "user" || message.type === "assistant";
}
//@ chunk-5xgkngpb.js:541901-542405 layout
/**
 * 读取当前转录并找出给定 tool_use id 中尚未有结果的那些，未找到的记调试日志；读取失败返回 null。
 */
async function findUnresolvedToolUsesInTranscript_2(ids, storage) {
  let transcriptPath;
  try {
    transcriptPath = getTranscriptPath();
    let transcriptStorageKey = getTranscriptStorageKey(transcriptPath, storage);
    let { messages } = await loadTranscriptFile(
      transcriptPath,
      transcriptStorageKey && {
        storageV5: transcriptStorageKey,
      },
    );
    let found = findUnresolvedToolUsesInTranscript(messages.values(), ids);
    let filtered = ids.filter((id) => !found.has(id));
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
      `findUnresolvedToolUse: failed to read transcript${transcriptPath ? ` ${transcriptPath}` : ""} for tool_use ${ids.join(", ")}: ${error}`,
      {
        level: "warn",
      },
    );
    return null;
  }
}
//@ chunk-5xgkngpb.js:542405-543095 facade-majority
async function findDeferredToolMarkerInTranscript(fullPath, storageV5) {
  try {
    let tail =
      !isStorageV5Enabled() || storageV5 === undefined
        ? undefined
        : await readTranscriptTailViaStorage(fullPath, 1048576, storageV5).catch(() => {
            return;
          });
    if (tail === null) return null;
    let lines;
    if (tail !== undefined) {
      lines = tail.content.split(`
`);
      if (tail.cut) lines.shift();
    } else {
      let path = worktreeFromProgress(fullPath);
      if (path === undefined) return null;
      let { content, bytesRead, bytesTotal } = await tailFile(path, 1048576);
      lines = content.split(`
`);
      if (bytesRead < bytesTotal) lines.shift();
    }
    let deferred = null;
    let deferredIndex = -1;
    for (let idx = lines.length - 1; idx >= 0; idx--) {
      let trimmed = lines[idx].trim();
      if (!trimmed.includes('"hook_deferred_tool"')) continue;
      let parsed = jsonParse(trimmed);
      if (parsed?.type === "attachment" && parsed.attachment?.type === "hook_deferred_tool") {
        deferred = parsed.attachment;
        deferredIndex = idx;
        break;
      }
    }
    if (!deferred) return null;
    let needle = `"tool_use_id":"${deferred.toolUseID}"`;
    for (let idx = deferredIndex + 1; idx < lines.length; idx++) if (lines[idx].includes(needle)) return null;
    return deferred;
  } catch {
    return null;
  }
}
//@ chunk-5xgkngpb.js:543095-543669 layout
async function listSessionFilesViaStorage(storage, projectKey) {
  let files = new Map();
  try {
    return (
      await readAllPages(
        (cursor) =>
          storage.listEntries(
            {
              namespace: "transcript",
              projectKey,
            },
            {
              skipScopeStats: true,
              ...(cursor !== undefined && {
                cursor,
              }),
            },
          ),
        (items) => {
          for (let item of items) {
            if (
              item.kind !== "key" ||
              item.key.namespace !== "transcript" ||
              item.key.projectKey !== projectKey ||
              item.key.agentId !== undefined ||
              item.key.agentRelPath !== undefined ||
              item.mtimeMs === undefined
            )
              continue;
            let sessionId = normalizeUuidOrNull(item.key.sessionId);
            if (sessionId === null || files.has(sessionId)) continue;
            let key = validatedTranscriptKey(STORAGE_SPACES.transcript(projectKey, sessionId));
            if (key === undefined) continue;
            files.set(sessionId, {
              key,
              mtimeMs: item.mtimeMs,
              createdMs: item.createdMs,
              size: item.size,
            });
          }
        },
        {
          maxPages: LOG_LIST_CONCURRENCY,
        },
      )
    ).status === "done"
      ? files
      : undefined;
  } catch {
    return;
  }
}
//@ chunk-5xgkngpb.js:543669-543913 layout
async function getSessionFilesViaStorage(projectDir, storage) {
  let projectKey = basename(projectDir);
  if (dirname(projectDir) !== getProjectsDir() || !isValidKeySegment(projectKey)) return;
  let files = await listSessionFilesViaStorage(storage, projectKey);
  if (files === undefined) return;
  let result = new Map();
  for (let [sessionId, info] of files)
    result.set(sessionId, {
      path: join(projectDir, `${sessionId}.jsonl`),
      mtime: info.mtimeMs,
      ctime: info.createdMs ?? info.mtimeMs,
      size: info.size ?? 0,
    });
  return result;
}
//@ chunk-5xgkngpb.js:543913-544471 facade-majority (2.1.88 match: getSessionFilesWithMtime, 1)
/**
 * 列出项目目录中的 .jsonl 会话文件及 mtime。
 */
async function getSessionFilesWithMtime(projectDir, storage) {
  let viaStorage =
    isStorageV5Enabled() && storage ? await getSessionFilesViaStorage(projectDir, storage) : undefined;
  if (viaStorage !== undefined) return viaStorage;
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
//@ chunk-5xgkngpb.js:544471-544482 layout
var DEFAULT_LOG_PAGE_SIZE = 50;
//@ chunk-5xgkngpb.js:544482-546054 facade-majority (2.1.88 match: loadAllLogsFromSessionFile, 0.743)
async function loadAllLogsFromSessionFile(sessionFile, projectPathOverride, storage) {
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
    sessionOwners,
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
    isStorageV5Enabled() && storage
      ? {
          keepAllLeaves: true,
          storageV5: storage,
        }
      : {
          keepAllLeaves: true,
        },
  );
  if (messages.size === 0) return [];
  let leafMessages = [];
  for (let msg of messages.values()) if (leafUuids.has(msg.uuid)) leafMessages.push(msg);
  let children = groupNonChainChildrenByParent(messages);
  let logs = [];
  for (let leafMessage of leafMessages) {
    let chain = buildConversationChain(messages, leafMessage, children);
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
      sessionOwner: sessionOwners?.get(sessionId),
      memoryModeStamps: memoryModeStamps.get(sessionId) ?? [],
      atisLatch: getOrEmptyString(atisLatches, sessionId),
      toolsUsed: toolsUsedLists?.get(sessionId),
      prNumber: prNumbers.get(sessionId),
      prUrl: prUrls.get(sessionId),
      prRepository: prRepositories.get(sessionId),
      gitBranch: leafMessage.gitBranch,
      projectPath: projectPathOverride ?? firstMessage.cwd,
      fileHistorySnapshots: buildFileHistorySnapshots(fileHistorySnapshots, fileHistoryDeltas, chain),
      attributionSnapshots: buildAttributionSnapshotChain(attributionSnapshots),
      contentReplacements: contentReplacements.get(sessionId) ?? [],
    });
    logs.at(-1).replMode = weakMap_7.get(messages)?.get(sessionId);
  }
  return logs;
}
//@ chunk-5xgkngpb.js:546054-546203 layout
async function getSessionFileEntriesViaStorage(projectDir, storage, projectKey) {
  let files = await listSessionFilesViaStorage(storage, projectKey);
  return files === undefined
    ? undefined
    : Array.from(files, ([sessionId, info]) => ({
        path: join(projectDir, `${sessionId}.jsonl`),
        mtime: info.mtimeMs,
        key: info.key,
      }));
}
//@ chunk-5xgkngpb.js:546203-546826 fingerprint (2.1.88 match: getLogsWithoutIndex, 0.804)
async function getLogsWithoutIndex(projectDir, limit, storageOptions) {
  if (isStorageV5Enabled() && storageOptions) {
    let { backend, projectKey } = storageOptions;
    let sessionFileEntriesViaStorage = await getSessionFileEntriesViaStorage(projectDir, backend, projectKey);
    if (sessionFileEntriesViaStorage !== undefined) {
      if (sessionFileEntriesViaStorage.length === 0) return [];
      let selected =
        limit && sessionFileEntriesViaStorage.length > limit
          ? [...sessionFileEntriesViaStorage].sort((a, b) => b.mtime - a.mtime).slice(0, limit)
          : sessionFileEntriesViaStorage;
      let logs = [];
      for (let entry of selected)
        try {
          let allLogsFromSessionFile = await loadAllLogsFromSessionFile(entry.path, undefined, {
            backend,
            key: entry.key,
          });
          logs.push(...allLogsFromSessionFile);
        } catch {
          logForDebugging(`Failed to load session file: ${entry.path}`);
        }
      return logs;
    }
  }
  let sessionFilesMap = await getSessionFilesWithMtime(projectDir);
  if (sessionFilesMap.size === 0) return [];
  let filesToProcess;
  if (limit && sessionFilesMap.size > limit)
    filesToProcess = [...sessionFilesMap.values()].sort((a, b) => b.mtime - a.mtime).slice(0, limit);
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
//@ chunk-5xgkngpb.js:546826-548535 fingerprint (2.1.88 match: readLiteMetadata, 0.724)
/**
 * 从文件头尾字节中抽取 lite 元数据：isSidechain、teamName、cwd、首条提示、custom-title、tag 等。
 */
async function readLiteMetadata(path, fileSize, buf, storage) {
  let transcriptStorageKey = getTranscriptStorageKey(path, storage);
  let { head, tail } =
    transcriptStorageKey === undefined && isDiskless()
      ? {
          head: "",
          tail: "",
        }
      : await readHeadAndTail_2(path, fileSize, buf, wrapStorageSource(transcriptStorageKey));
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
  let parentLine =
    head
      .split(
        `
`,
      )
      .find((line) => line.includes('"parentUuid":')) ?? head;
  let jsonStringField = extractJsonStringField(parentLine, "sessionKind");
  let sessionKind =
    jsonStringField === "bg" || jsonStringField === "daemon" || jsonStringField === "daemon-worker"
      ? jsonStringField
      : undefined;
  let agentSetting = extractJsonStringField(head, "agentSetting");
  let entrypoint =
    extractJsonStringField(head, "entrypoint") ?? extractLastJsonStringField(tail, "entrypoint");
  let isLoopSession = isLoopCommandSession(head);
  let bookkeepingOnly = !(await transcriptMayContainMarker(path, head, tail, fileSize, storage));
  let lastJsonStringField = extractLastJsonStringField(tail, "lastPrompt");
  let storedPrompt =
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
  ].find((source) => source !== "" && extractFirstPromptFromChunk(source, "stored") === storedPrompt);
  let shownPrompt = found === undefined ? storedPrompt : extractFirstPromptFromChunk(found, "shown");
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
    firstPrompt: storedPrompt,
    ...(shownPrompt !== storedPrompt && {
      firstPromptShown: shownPrompt,
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
//@ chunk-5xgkngpb.js:548535-548678 layout
var FrameLinkEntrySchema; // deferred: uses DoctorLazy (../cli/handlers/util.js) of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-5xgkngpb.js:548535", () => {
  FrameLinkEntrySchema = DoctorLazy(() =>
    create({
      type: create_25("frame-link"),
      frameUrl: create_2().optional().catch(undefined),
      artifactCount: create_3().int().positive().optional().catch(undefined),
    }),
  );
});
//@ chunk-5xgkngpb.js:548678-549088 layout
function countFrameLinks(tail) {
  if (!tail.includes('"type":"frame-link"')) return;
  let maxCount = 0;
  let urls = new Set();
  for (let line of tail.split(`
`)) {
    if (!line.includes('"type":"frame-link"')) continue;
    let parsed;
    try {
      parsed = jsonParseRaw(line);
    } catch {
      continue;
    }
    let parsedFrame = FrameLinkEntrySchema().safeParse(parsed);
    if (!parsedFrame.success) continue;
    if (parsedFrame.data.artifactCount !== undefined && parsedFrame.data.artifactCount > maxCount)
      maxCount = parsedFrame.data.artifactCount;
    if (parsedFrame.data.frameUrl !== undefined) urls.add(parsedFrame.data.frameUrl);
  }
  let max = Math.max(maxCount, urls.size);
  return max > 0 ? max : undefined;
}
//@ chunk-5xgkngpb.js:549088-549864 layout
function isLoopCommandSession(chunk) {
  let start = 0;
  while (start < chunk.length) {
    let newlineIdx = chunk.indexOf(
      `
`,
      start,
    );
    let line = newlineIdx >= 0 ? chunk.slice(start, newlineIdx) : chunk.slice(start);
    let lastChunk = newlineIdx < 0;
    start = newlineIdx >= 0 ? newlineIdx + 1 : chunk.length;
    if (!line.includes('"type":"user"') && !line.includes('"type": "user"')) continue;
    if (line.includes('"tool_result"')) continue;
    let parsed;
    try {
      parsed = jsonParse(line);
    } catch {
      if (lastChunk) return line.includes("<command-name>/loop</command-name>");
      continue;
    }
    if (parsed.type !== "user") continue;
    if (parsed.isMeta === true || parsed.isCompactSummary === true) continue;
    let message = parsed.message;
    if (!message) continue;
    let content = message.content;
    let texts = [];
    if (typeof content === "string") texts.push(content);
    else if (Array.isArray(content)) {
      let sawToolResult = false;
      for (let block of content) {
        if (!block || typeof block !== "object") continue;
        if (block.type === "tool_result") {
          sawToolResult = true;
          break;
        }
        if (block.type === "text" && typeof block.text === "string") texts.push(block.text);
      }
      if (sawToolResult) continue;
    }
    return texts.some((text) => text.includes("<command-name>/loop</command-name>"));
  }
  return false;
}
//@ chunk-5xgkngpb.js:549864-551243 fingerprint (2.1.88 match: extractFirstPromptFromChunk, 0.72)
function extractFirstPromptFromChunk(chunk, mode) {
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
      let contentForShown =
        mode === "shown" && typeof content === "string"
          ? renderPluginPromptColon(content, entry.pluginPrompt)
          : content;
      let rendered = contentForShown !== content;
      let texts = [];
      if (typeof contentForShown === "string") texts.push(contentForShown);
      else if (Array.isArray(content))
        for (let block of content) {
          let contentBlock = block;
          if (contentBlock.type === "text" && typeof contentBlock.text === "string")
            texts.push(contentBlock.text);
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
        let commandNameTag = rendered ? null : extractTag(result, COMMAND_NAME);
        if (commandNameTag) {
          let name = commandNameTag.replace(/^\//, "");
          let commandArgs = extractTag(result, "command-args")?.trim() || "";
          if (require("../commands.js").builtInCommandNames().has(name) || !commandArgs) {
            if (!firstCommandFallback) firstCommandFallback = commandNameTag;
            continue;
          }
          return commandArgs ? `${commandNameTag} ${commandArgs}` : commandNameTag;
        }
        let bashInput = rendered ? null : extractTag(result, "bash-input");
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
        let fallbackText =
          extractJsonStringFieldPrefix(line, "content", 200) ||
          extractJsonStringFieldPrefix(line, "text", 200);
        if (!SYNTHETIC_USER_TEXT_PATTERN.test(fallbackText)) firstCommandFallback_2 = fallbackText;
      }
      continue;
    }
  }
  if (firstCommandFallback) return firstCommandFallback;
  if (hasTickMessages) return "Proactive session";
  return firstCommandFallback_2;
}
//@ chunk-5xgkngpb.js:551243-551460 layout
function findLastFieldInType(tail, type, key) {
  let typeNeedle = `"type":"${type}"`;
  let keyNeedle = `"${key}":`;
  let end = tail.length;
  while (end > 0) {
    let index = tail.lastIndexOf(
      `
`,
      end - 1,
    );
    let sliced = tail.slice(index + 1, end);
    end = index;
    if (sliced.includes(typeNeedle) && sliced.includes(keyNeedle)) {
      let jsonStringField = extractJsonStringField(sliced, key);
      if (jsonStringField !== undefined) return jsonStringField;
    }
    if (index < 0) break;
  }
  return;
}
//@ chunk-5xgkngpb.js:551460-551752 fingerprint (2.1.88 match: extractJsonStringFieldPrefix, 1)
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
//@ chunk-5xgkngpb.js:551974-552435 facade-majority (2.1.88 match: getSessionFilesLite, 0.952)
async function getSessionFilesLite(projectDir, limit, projectPath, storage, ownWorktrees) {
  let entries = [...(await getSessionFilesWithMtime(projectDir, storage)).entries()].sort(
    (a, b) => b[1].mtime - a[1].mtime,
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
//@ chunk-5xgkngpb.js:552435-554621 fingerprint (2.1.88 match: enrichLog, 0.575)
/**
 * 富化单个 lite 日志并过滤：cwd 不同、sidechain、无内容等不显示在 /resume。
 */
async function enrichLog(log, buf, storage) {
  if (!log.isLite || !log.fullPath) return log;
  let liteMetadata = await readLiteMetadata(log.fullPath, log.fileSize ?? 0, buf, storage);
  let recorded = liteMetadata.relocatedCwd ?? liteMetadata.headCwdStrict;
  if (
    log.projectPath !== undefined &&
    recorded !== undefined &&
    !recordedCwdIsWithinOwnWorktrees(recorded, log.ownWorktrees, slugCollisionGuardFoldsCase()) &&
    (await recordedCwdCollidesWithProjectResolved(
      recorded,
      log.projectPath,
      slugCollisionGuardFoldsCase(),
      hasUntouchableRecordSpellingAsync,
      getRealPathOptions(storage),
    ))
  ) {
    logForDebugging(
      `Session ${log.sessionId} filtered from /resume: recorded cwd is a different directory with the same project slug`,
    );
    return null;
  }
  let identity = (value) => value;
  let sameDir =
    liteMetadata.projectPath !== undefined &&
    identity(dirname(log.fullPath)) === identity(getProjectDir(liteMetadata.projectPath));
  let projectPath =
    liteMetadata.relocatedCwd ??
    (sameDir || log.projectPath === undefined
      ? (liteMetadata.projectPath ?? log.projectPath)
      : log.projectPath);
  let customTitleFromTail = liteMetadata.customTitleFromTail;
  if (customTitleFromTail === undefined)
    customTitleFromTail =
      (log.sessionId !== undefined
        ? await readCustomTitle(log.fullPath, log.sessionId, storage)
        : undefined) ?? liteMetadata.customTitle;
  let lastAt =
    liteMetadata.lastMessageAtMs !== undefined
      ? new Date(Math.min(liteMetadata.lastMessageAtMs, log.modified.getTime()))
      : undefined;
  let enriched = {
    ...log,
    ...(lastAt !== undefined && {
      date: lastAt.toISOString(),
      modified: lastAt,
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
  if (!enriched.firstPrompt && !enriched.customTitle && !enriched.aiTitle) enriched.firstPrompt = "(session)";
  if (enriched.isSidechain) {
    logForDebugging(`Session ${log.sessionId} filtered from /resume: isSidechain=true`);
    return null;
  }
  if (enriched.teamName) {
    logForDebugging(`Session ${log.sessionId} filtered from /resume: teamName=${enriched.teamName}`);
    return null;
  }
  if (liteMetadata.continuedInSessionId !== undefined) {
    enriched.continuedInSessionId = liteMetadata.continuedInSessionId;
    if (await getTranscriptPathForSession_2(log.fullPath, liteMetadata.continuedInSessionId, storage)) {
      logForDebugging(
        `Session ${log.sessionId} filtered from /resume: continued in ${liteMetadata.continuedInSessionId}`,
      );
      enriched.superseded = true;
    }
  }
  if (liteMetadata.bookkeepingOnly) enriched.bookkeepingOnly = true;
  if (enriched.sessionKind === "daemon" || enriched.sessionKind === "daemon-worker") {
    logForDebugging(`Session ${log.sessionId} filtered from /resume: sessionKind=${enriched.sessionKind}`);
    return null;
  }
  let envProgrammatic = PROGRAMMATIC_ENTRYPOINTS.has(entrypointEnv() ?? "");
  if (!envProgrammatic && PROGRAMMATIC_ENTRYPOINTS.has(liteMetadata.entrypoint ?? "")) {
    logForDebugging(`Session ${log.sessionId} filtered from /resume: entrypoint=${liteMetadata.entrypoint}`);
    return null;
  }
  if (!envProgrammatic && liteMetadata.isLoopSession) {
    logForDebugging(`Session ${log.sessionId} filtered from /resume: /loop session`);
    return null;
  }
  return enriched;
}
//@ chunk-5xgkngpb.js:554621-554977 facade-majority (2.1.88 match: enrichLogs, 0.969)
/**
 * 批量富化 lite 日志，记录过滤计数（/resume: enriched … filtered out … visible）。
 */
async function enrichLogs(allLogs, startIndex, count, storage, scanLimit = 1 / 0) {
  let result = [];
  let readBuf = Buffer.alloc(LITE_READ_BUF_SIZE);
  let min = Math.min(allLogs.length, startIndex + scanLimit);
  let i = startIndex;
  while (i < min && result.length < count) {
    let log = allLogs[i];
    i++;
    let enriched = await enrichLog(log, readBuf, storage);
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
//@ chunk-v6a0t823.js:16374-16605 fingerprint (2.1.88 match: writeAgentMetadata, 0.514)
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
//@ chunk-05hzzra9.js:1502-1585 fingerprint (2.1.88 match: buildFileHistorySnapshotChain, 0.455)
function buildFileHistorySnapshotChain(session) {
  if (!session) return;
  try {
    return spawnStatsSlots.of(session).snapshot();
  } catch (error) {
    logError(error);
    return;
  }
}
//@ chunk-jndyh8cy.js:15289-15567 callgraph-fingerprint (2.1.88 match: loadSameRepoMessageLogs, 0.229)
async function loadSameRepoMessageLogs_2(cwd, credentials) {
  let worktrees = await sameRepoWorktrees(cwd);
  let sameRepoMessageLogsProgressive = await loadSameRepoMessageLogsProgressive(
    worktrees,
    undefined,
    undefined,
    credentials,
  );
  let sessionId = getSessionId();
  let keep = (log) =>
    !log.isSidechain &&
    log.isAlias !== true &&
    log.sessionId !== sessionId &&
    (log.projectPath === undefined || isSameRepoPath(log.projectPath, cwd, worktrees));
  let filtered = sameRepoMessageLogsProgressive.logs.filter(keep);
  let unreadCount = countWhere(
    sameRepoMessageLogsProgressive.allStatLogs.slice(sameRepoMessageLogsProgressive.nextIndex),
    resolveSessionFilePath_2,
  );
  return {
    logs: filtered,
    totalCount: countWhere(filtered, resolveSessionFilePath_2) + unreadCount,
  };
}
//@ chunk-rytc8e8q.js:19163-19428 placement (2.1.88 match: renderToolResultMessage, 0.521)
/**
 * 根据进度消息里的 worktree 信息更新已保存的会话元数据（路径/分支/hook 标记变化时写回）。
 */
async function renderToolResultMessage(output, _progressMessagesForMessage, _options) {
  let jobDir = getJobDir(output);
  let jobState = await readJobState(jobDir, _options);
  if (!jobState) return;
  let fields = pickWorktreeFields(_progressMessagesForMessage, jobState);
  if (
    fields.worktreePath === jobState.worktreePath &&
    fields.worktreeBranch === jobState.worktreeBranch &&
    fields.worktreeHookBased === jobState.worktreeHookBased
  )
    return;
  await writeStateAndBroadcast(
    jobDir,
    {
      ...jobState,
      ...fields,
      updatedAt: new Date().toISOString(),
    },
    {},
    _options,
  );
}
//@ chunk-775n2x67.js:34237-34264 placement
var offerOffAvailable = (userType) => userType === "external";
//@ chunk-czq1j3j2.js:1118520-1118628 fingerprint (2.1.88 match: loadSubagentTranscripts, 0.658)
function loadSubagentTranscripts_2({ isLoading, transcript }) {
  let ready = useCallback((agentId) => !isLoading && endsWithNumberedList(agentId), [isLoading]);
  let storeSelector = useStoreSelector(transcript, ready);
  let unattended = !isUnattendedInteractiveSession();
  return !isLoading && !storeSelector && unattended;
}
//@ chunk-nvm0wye1.js:22652-22856 fingerprint (2.1.88 match: scanPreBoundaryMetadata, 0.481)
function scanPreBoundaryMetadata(text, maxBytes, suffix) {
  if (Buffer.byteLength(text) <= maxBytes)
    return {
      text,
      truncated: false,
    };
  return {
    text: `${new TextDecoder("utf-8", {
      fatal: false,
    })
      .decode(Buffer.from(text).subarray(0, maxBytes))
      .replace(/\uFFFD$/, "")}${suffix}`,
    truncated: true,
  };
}
//@ chunk-66b9fbd5.js:25405-25885 fingerprint (2.1.88 match: getAgentTranscriptPath, 0.928)
function getAgentTranscriptPath_2(agentId) {
  let projectsPrefix = getProjectsDir_3() + sep;
  if (!agentId.startsWith(projectsPrefix)) return null;
  let parts = agentId.slice(projectsPrefix.length).split(sep);
  if (parts.length === 2 && parts[1].endsWith(".jsonl")) {
    let projectKey = parts[0];
    let sliced = parts[1].slice(0, -6);
    return isValidKeySegment(projectKey) && isValidKeySegment(sliced)
      ? pathIfNotStorageBacked(STORAGE_SPACES.transcript(projectKey, sliced))
      : null;
  }
  if (
    parts.length >= 4 &&
    parts[2] === "subagents" &&
    parts.at(-1).startsWith("agent-") &&
    parts.at(-1).endsWith(".jsonl")
  ) {
    let projectKey = parts[0];
    let sessionKey = parts[1];
    let sliced = parts.slice(3, -1);
    let sliced_2 = parts.at(-1).slice(6, -6);
    return isValidKeySegment(projectKey) &&
      isValidKeySegment(sessionKey) &&
      isValidKeySegment(sliced_2) &&
      (sliced.length === 0 || areValidKeySegments(sliced))
      ? pathIfNotStorageBacked(
          STORAGE_SPACES.transcript(projectKey, sessionKey, sliced_2, sliced.length > 0 ? sliced : undefined),
        )
      : null;
  }
  return null;
}
//@ chunk-66b9fbd5.js:25885-25929 sole-consumer
function pathIfNotStorageBacked(key) {
  return validateStorageKey(key) === undefined ? key : null;
}
export {
  getEntrypoint,
  pinSessionId,
  getAgentTranscriptPath,
  getMaterializedSessionFile,
  getTranscriptPath,
  getAgentMetadataPath,
  isTranscriptPersistenceDisabled,
  saveAgentSetting,
  describeDiskTranscriptLag,
  findUnresolvedToolUses,
  recordTranscript,
  flushSessionStorage,
  isCompactPairWithheldFromRemote,
  addSessionMirror,
  getCurrentSessionIsolationLatch,
  saveIsolationLatch,
  registerLiveSuppressionProbe,
  buildFileHistorySnapshotChain,
  cacheSessionTitle,
  getSessionRowsOffDisk,
  mirrorLeafCheckpointToRemote,
  persistLeafCheckpoint,
  adoptResumedSessionFileAsync,
  adoptResumedSessionFile,
  registerTranscriptExitReStamp,
  resetSessionFilePointer,
  adoptForkSessionMetadata,
  recordContentReplacement,
  restoreSessionMetadata,
  saveMode,
  searchSessionsByCustomTitle,
  getSessionIdFromLog,
  setTranscriptLocalGcEnabled,
  hydrateFromCCRv2InternalEvents,
  hydrateRemoteSession,
  getTranscriptPathForSession,
  listSubagentIdsFromDisk,
  readAgentMetadata,
  restoreAgentSidecarFromStream,
  findUnresolvedToolUseMessageRows,
  findUnresolvedToolUse,
  getTranscriptStorageKey,
  loadTranscriptFile,
  findUnresolvedToolUsesInTranscript,
  assistantMessageRowsInTranscript,
  updateAgentMetadata,
  landStoppedByUser,
  getCurrentSessionBridge,
  clearBridgeSession,
  saveBridgeSession,
  isTurnUnanswered,
  wrapStorageSource,
  doesMessageExistInSession,
  isMessageTurnUnanswered,
  getTranscriptWriterHealth,
  hasRemoteWorkerEventLog,
  registerTranscriptExitDrain,
  readAtTranscriptEntry,
  inTranscriptCallOrder,
  transcriptCursorEnd,
  collectReplIds,
  isLoggableMessage,
  isChainParticipant,
  hasSessionMirror,
  removeTranscriptMessage,
  cleanMessagesForLogging,
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
  getTranscriptStorageContext,
  isRemoteEgressSuppressedFor,
  getCurrentSessionDisplayTitle,
  withVersionToRecord,
  readHistorySuppressionFromDisk,
  loadTranscriptFromFile,
  TranscriptFileFormatError,
  isTranscriptMessage,
  setInternalEventWriter,
  setAgentMetadataInStreamGate,
  setInternalEventReader,
  updateCCRTipFromAckedBatch,
  sealTranscriptAppendsForShutdown,
  readTranscriptTailForTip,
  getValidatedCCRTip,
  getProjectDir,
  recordQueueOperation,
  appendEntryToFileAsync,
  isBridgeBindingForeign,
  snapshotSessionMetadata,
  queueSessionMetadataEntry,
  getProjectsDir,
  isSessionHistorySuppressed,
  isSessionHistorySuppressedFor,
  getCurrentSessionMemoryModeStamps,
  primeSessionMessagesCache,
  saveCustomTitle,
  saveAgentName,
  isPrecautionarySuppressionHeldFor,
  getSessionOwner,
  ownStoredLoginOwner,
  getProjectKeyIfRepresentable,
  saveWorktreeState,
  readTranscriptTailV5,
  loadAllProjectsMessageLogsProgressive,
  loadSameRepoMessageLogsProgressive,
  enrichLogs,
  loadSameRepoMessageLogs,
  saveAgentColor,
  getFirstMeaningfulUserMessageTextContent,
  getTranscriptWriteFailureSeq,
  MAX_VIEW_REFS,
  sessionIdExists,
  isFileSnapshotMessage,
  transcriptVersion,
  CLI_VERSION,
  ensurePluginDataDir,
  savePermissionMode,
  getSessionSidecarDir,
  ensureSidecarDirFor,
  saveAutoMemorySessionSwitch,
  recordFileHistoryDelta,
  recordFileHistorySnapshot,
  getAgentTranscript,
  getCurrentSessionPeerNameFor,
  getCurrentSessionPeerName,
  getCurrentSessionOffBoxPeerName,
  reAppendSessionMetadataAfterCompaction,
  getCurrentSessionAgentColor,
  deleteRemoteAgentMetadata,
  removeRemoteAgentMetadata,
  writeRemoteAgentMetadata,
  listRemoteAgentMetadata,
  recordSidechainTranscript,
  consumeFailedTranscriptWrite,
  clearSessionMessagesCache,
  saveAiGeneratedTitle,
  cacheAgentName,
  getCurrentSessionAgentName,
  isSessionFileAt,
  isOwnTranscriptFile,
  getDerivedTranscriptPathForSession,
  holdPrecautionarySuppressionFor,
  markPrecautionClearResilientFor,
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
  claimPrecautionHoldForObservedCause,
  writeHistorySuppression,
  clearInternalEventWriter,
  releaseScanUncertaintyHoldFor,
  getCurrentSessionAiTitle,
  getBridgeBoundConversationSid,
  getSessionSubagentsDir,
  projectKeyOf,
  worktreeFromProgress,
  getRealPathOptions,
  offerOffAvailable,
  landAgentStop,
  readLastObserverRef,
  hasAgentStopSibling,
  canFetchAgentTranscriptsOnDemand,
  agentTranscriptExists,
  recordObserverRef,
  PENDING_BRIDGE_SESSION,
  registerForeignConversationProbe,
  clearBridgeSessionCache,
  currentSessionFileIsFor,
  registerForeignTranscriptExitReStamp,
  appendEntryToCurrentTranscriptNow,
  onSessionFileMaterialized,
  takeResumedArtifactCommentMonitor,
  sealTornTranscriptTail,
  recordArtifactCommentMonitor,
  resolveSessionProjectDir,
  resolveProjectDir,
  clearLastIngressUuid,
  touchSessionTranscript,
  buildForkAdoptionMeta,
  applyEndedByModelOnResume,
  peekResumedArtifactAutoReactLedger,
  takeResumedArtifactAutoReactLedger,
  recordArtifactAutoReactLedger,
  saveDevModsFolder,
  getCurrentSessionDevModsFolder,
  titleCacheStillOn,
  writeAgentMetadata,
  transcriptMayContainMarker,
  getCurrentSessionFile,
  transcriptStamp,
  subscribeSessionTitleChanged,
  readAgentMetadataAtPath,
  isAccountCopyEnabled,
  ownerDiffers,
  rememberKnownAccount,
  accountLabelOfOwner,
  currentAccountLabel,
  saveSessionOwner,
  appendToolsUsedEntryBeforeClear,
  clearSessionMetadata,
  copyPrecautionarySuppressionTo,
  cacheHookSessionTitle,
  subscribeSessionAgentNameChanged,
  extractLastSyncedEventUuid,
  bridgeSessionForPulledWindow,
  getPersistenceSuppressionCause,
  loadSubagentTranscripts_2,
  extractAgentIdsFromMessages,
  loadSubagentTranscripts,
  isEphemeralToolProgress,
  removeTranscriptMessageIfPersisted,
  getSessionFilesWithMtime,
  loadAllLogsFromSessionFile,
  relocateSessionTranscript,
  reportRelocateSessionTranscriptFailure,
  locateAgentTranscript,
  setAgentTranscriptSubdir,
  clearAgentTranscriptSubdir,
  recordForkContextRef,
  recordSessionAlias,
  locateSessionProjectDir,
  setToolResultCopiesOnDisk,
  loadSameRepoMessageLogs_2,
  scanTranscriptForSuppression,
  hasRecordedUserPrompt,
  storagePort,
  scanAppendedForSuppression,
  resolveMetadataBuf,
  getAgentTranscriptStorageKey,
  isTranscriptRelocationInProgress,
  mergeArtifactCommentMonitorEntries,
  scanPreBoundaryMetadata,
  extractTeammateTranscriptsFromTasks,
  loadAllSubagentTranscriptsFromDisk,
  isForeignToBinding,
  worktreeStateSignals,
  renderToolResultMessage,
  isConversationEgressTainted,
  holdSessionHistorySuppression,
  markToolsUsedWritten,
  queueLeafCheckpointWithdrawal,
  saveMemoryMode,
  dropSessionHistorySuppression,
  releasePrecautionarySuppressionFor,
  writeAgentMetadata_2,
  markSessionEndedByModel,
  cacheAiTitle,
  AgentTranscriptFetchError,
  isAgentTranscriptOverBound,
  isUnavailableStoreError,
  readAgentWorkerEvents,
  hasWrittenAgentTranscript,
  keepsAgentMetadataInStream,
  clearAgentStopSibling,
  agentTranscriptPathOfEntry,
  COMPACT_MIN_FILE_BYTES,
  ENTRY_APPEND_POLICY,
  OBSERVER_REF_TAIL_SCAN_BYTES,
  QUEUED_ROWS_WAIT_MS,
  RESERVED_AGENT_METADATA_FIELDS,
  RefusedDirectWriteError,
  SUPPRESSION_SCAN_MAX_BYTES_ANT,
  SUPPRESSION_SCAN_MAX_LINES_ANT,
  TRANSCRIPT_CLOSE_FAILED_REPORT,
  TURNS_AFTER_LEAF_CHECKPOINT_GB_FLAG,
  UNLATCHED_RESUMED_ATIS,
  appendEntryToSessionForTesting,
  beginTranscriptRelocationForTesting,
  bridgeSessionsForPulledRow,
  buildConversationChain,
  closeAfterRead,
  closeAfterReadAsync,
  collectTailUuids,
  compactTranscriptForTesting,
  dropPrecautionarySuppressionForTesting,
  emitSessionFileMaterializedForTesting,
  endTranscriptRelocationForTesting,
  extractLatestIntersectingSyncedUuid,
  findUnresolvedToolUseInTranscript,
  fireSessionMirror,
  flushAppendEntryQueues,
  flushSessionStorageAtExit,
  getLogByIndex,
  getNodeEnv,
  getSessionFilesLite,
  getTranscriptWriterDegraded,
  getUserType,
  hasMaterializedSessionFile,
  hydrateForkContext,
  isLiveBridgeSuppressed,
  isPrecautionarySuppressionHeld,
  linkSessionToPR,
  loadAllProjectsMessageLogs,
  loadMessageLogs,
  loadTranscriptFromEntries,
  locateCurrentSessionFile,
  locateMaterializedSessionFile,
  locateSidecarFile,
  locateTranscriptForSession,
  markSessionHistorySuppressedFor,
  memoryPauseToggledByPerson,
  mergeAgentMetadataUnderLock,
  mirrorCustomTitleToRemote,
  mirrorInternalEntryForTesting,
  mirrorWorkerEventToRemote,
  reAppendSessionMetadata,
  reAppendSessionMetadataAsyncForTesting,
  reAppendSessionMetadataAtExit,
  readCCRTip,
  readSessionAliasesForTesting,
  recordAttributionSnapshot,
  recordCostState,
  removeExtraFields,
  requestCompactForTesting,
  resetProjectFlushStateForTesting,
  resetProjectForTesting,
  restoreConversationToolsUsed,
  seedReplayIndex,
  setKeepSessionMessagesCache,
  setLowYieldCompactSkipForTesting,
  setRemoteIngressUrlForTesting,
  setSessionFileForTesting,
  transcriptExitHooksLatches,
  transcriptFileHasContentEntry,
  transcriptStores,
  transcriptTailForHydrateForTesting,
  warnIfTranscriptUnchained,
  withTaskProducerMarkRecorded,
  withoutFetchedCodeModeRecords,
  withoutTaskProducerMark,
  writeHydratedAgentTranscript,
};
