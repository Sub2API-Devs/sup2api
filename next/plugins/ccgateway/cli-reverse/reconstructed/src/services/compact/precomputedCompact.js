/**
 * services/compact/precomputedCompact.ts
 *
 * 2.1.316 新增：预先计算压缩摘要，到阈值时直接应用并持久化
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-e6aww6q8.js (50)
 * attribution: placement 50
 */
import { join, dirname, resolve as resolve_2, relative, sep, isAbsolute } from "path";
import { statSync, readFileSync } from "fs";
import { unlink } from "fs/promises";
import {
  getSessionSidecarDir,
  ensureSidecarDirFor,
  isTranscriptPersistenceDisabled,
  isLoggableMessage,
} from "../../utils/sessionStorage.js";
import { jsonStringify, jsonParse } from "../../utils/slowOperations.js";
import { isStorageV5Enabled } from "../../utils/hoverRest.js";
import { pathToSessionSideKey } from "../../utils/storage/storageKeys.js";
import { formatStorageError } from "../../utils/storage/storageErrors.js";
import { errorMessage, AbortError as AbortError_2 } from "../../utils/errors.js";
import { isDiskless, getSessionId } from "../../bootstrap/state.js";
import { writeFileAtomic as writeFileAtomic_2 } from "../../utils/atomicPublishWrite.js";
import { openNoFollow_2 } from "../../utils/fsSafety/hardenedRead.js";
import {
  agentIdOrDefault,
  checkCompactBoundaryCoverage,
  createCompactSeenState,
  findLastHumanPromptUuid,
} from "../../bootstrap/sessionSlices.js";
import { logEvent } from "../analytics/index.js";
import { fromEnum, lit as lit_2, fromEnumOpt } from "../analytics/safeMetadata.js";
import { logForDebugging } from "../../utils/debug.js";
import { logError } from "../../utils/log.js";
import {
  keptRowUuids,
  dispatchSessionCompactHooks,
  getTokenCountFromUsage_3,
} from "../../plugins/functionHooks/sessionCompactHook.js";
import {
  getCompactThresholdSnapshot,
  estimateTokensWithAnchor,
  isAtPrecomputeThreshold,
  getMainThreadCacheExpiresAt,
} from "./autoCompact.js";
import {
  isAutoCompactEnabled,
  canCompactInRemote,
  isPrecomputeCompactionEnabled,
  isCompactCommand,
} from "./compactSettings.js";
import { getFeatureValue_CACHED_MAY_BE_STALE } from "../analytics/growthbook.js";
import { normalizeUuidOrNull } from "../../utils/agentId.js";
import { getProjectsDir } from "../../utils/sessionStoragePortable.js";
import { getCanonicalModelId } from "../../utils/modelCost.js";
import { stripInProgressAssistantMessage } from "../../commands/btw/btw.js";
import { agentTypeForTelemetry } from "../analytics/metadata.js";
import { resolvePrecomputeFraction, windowSource } from "./autoCompactWindow.js";
import { isDelegatedObservationContext } from "../../utils/agentContext.js";
import { executePreCompactHooks } from "../../utils/hooks.js";
import { COMPACTION_BLOCKED_BY_HOOK, mergeHookInstructions, startCompactingStatusTicker } from "./compact.js";
import { runReactiveCompact } from "./reactiveCompact.js";
import { unwrapAbortReason } from "../../utils/abortController.js";
import { logFeatureSad, logFeatureBad, logFeatureOk } from "../analytics/featureTelemetry.js";
import { getModelContextInfo } from "../../utils/model/modelContextInfo.js";
import { EMPTY_USAGE } from "../api/emptyUsage.js";

//@ chunk-e6aww6q8.js:2452854-2452897 placement
/**
 * 预计算压缩文件的最大字节数（8MB）。
 */
var PRECOMPACT_FORMAT_VERSION = 5;
var MAX_PRECOMPACT_BYTES = 8000000;
var PRECOMPACT_JSON = "precompact.json";
//@ chunk-e6aww6q8.js:2452897-2452935 placement
/**
 * 某会话的预计算压缩文件路径（sidecar 目录下 precompact.json）。
 */
function precompactFilePath(sessionId) {
  return join(getSessionSidecarDir(sessionId), PRECOMPACT_JSON);
}
//@ chunk-e6aww6q8.js:2452935-2452970 placement
/**
 * 旧布局的预计算压缩文件路径（sidecar 目录加后缀）。
 */
function legacyPrecompactFilePath(sessionId) {
  return sidecarPrecompactPath(getSessionSidecarDir(sessionId));
}
//@ chunk-e6aww6q8.js:2452970-2453003 placement
/**
 * 给目录路径加上预计算文件名后缀。
 */
function sidecarPrecompactPath(dir) {
  return dir + "." + PRECOMPACT_JSON;
}
//@ chunk-e6aww6q8.js:2453003-2453617 placement
async function writePrecomputedCompact(payload, filePath = precompactFilePath(payload.sessionId), storageV5) {
  let serialized = jsonStringify(payload);
  let bytes = Buffer.byteLength(serialized, "utf8");
  if (bytes > MAX_PRECOMPACT_BYTES)
    return {
      ok: false,
      reason: "too_large",
      bytes,
    };
  let sideKey = isStorageV5Enabled() && storageV5 !== undefined ? pathToSessionSideKey(filePath) : undefined;
  if (storageV5 !== undefined && sideKey)
    try {
      let writeResult = await storageV5.write(sideKey, serialized, {
        mode: 384,
      });
      return writeResult.ok
        ? {
            ok: true,
            bytes,
          }
        : {
            ok: false,
            reason: "write_error",
            bytes,
            detail: formatStorageError(writeResult.error),
          };
    } catch (error) {
      return {
        ok: false,
        reason: "write_error",
        bytes,
        detail: errorMessage(error),
      };
    }
  if (isDiskless())
    return {
      ok: false,
      reason: "diskless",
      bytes,
      detail: "not written: no storage backend, or no key for the target path",
    };
  try {
    await ensureSidecarDirFor(filePath);
    await writeFileAtomic_2(filePath, serialized, 384);
    return {
      ok: true,
      bytes,
    };
  } catch (error) {
    return {
      ok: false,
      reason: "write_error",
      bytes,
      detail: errorMessage(error),
    };
  }
}
//@ chunk-e6aww6q8.js:2453617-2453742 placement
/**
 * 依次读取新旧位置的预计算压缩文件。
 */
function readPrecomputedFromDisk(sessionId) {
  for (let path of [precompactFilePath(sessionId), legacyPrecompactFilePath(sessionId)]) {
    let precomputedFile = readPrecomputedFile(path);
    if (precomputedFile.ok || precomputedFile.reason !== "absent") return precomputedFile;
  }
  return {
    ok: false,
    reason: "absent",
  };
}
//@ chunk-e6aww6q8.js:2453742-2453962 placement
/**
 * 同步读取预计算压缩文件（无盘、过大或不存在时返回原因）。
 */
function readPrecomputedFile(path) {
  if (isDiskless())
    return {
      ok: false,
      reason: "absent",
    };
  try {
    if (statSync(path).size > MAX_PRECOMPACT_BYTES)
      return {
        ok: false,
        reason: "too_large",
      };
  } catch {
    return {
      ok: false,
      reason: "absent",
    };
  }
  let text;
  try {
    text = readFileSync(path, "utf8");
  } catch {
    return {
      ok: false,
      reason: "absent",
    };
  }
  return parsePrecomputedPayload(text);
}
//@ chunk-e6aww6q8.js:2453962-2454298 placement
/**
 * 解析预计算压缩 JSON（大小、版本、字段校验）。
 */
function parsePrecomputedPayload(text) {
  if (Buffer.byteLength(text, "utf8") > MAX_PRECOMPACT_BYTES)
    return {
      ok: false,
      reason: "too_large",
    };
  let parsed;
  try {
    parsed = jsonParse(text);
  } catch {
    return {
      ok: false,
      reason: "parse_error",
    };
  }
  if (typeof parsed !== "object" || parsed === null)
    return {
      ok: false,
      reason: "parse_error",
    };
  if (parsed.version !== PRECOMPACT_FORMAT_VERSION)
    return {
      ok: false,
      reason: "version",
    };
  let payload = validatePrecomputedPayload(parsed);
  return payload === null
    ? {
        ok: false,
        reason: "parse_error",
      }
    : {
        ok: true,
        payload,
      };
}
//@ chunk-e6aww6q8.js:2454298-2454806 placement
/**
 * 以不跟随链接方式异步读取预计算压缩文件。
 */
async function readPrecomputedNoFollow(filePath) {
  if (isDiskless())
    return {
      ok: false,
      reason: "absent",
    };
  let noFollow = await openNoFollow_2(filePath);
  if (!noFollow.ok)
    return {
      ok: false,
      reason: "absent",
    };
  let handle = noFollow.value;
  try {
    let stats = await handle.stat();
    if (!stats.isFile())
      return {
        ok: false,
        reason: "absent",
      };
    if (stats.size > MAX_PRECOMPACT_BYTES)
      return {
        ok: false,
        reason: "too_large",
      };
    let buffer = Buffer.alloc(stats.size + 1);
    let bytesRead = 0;
    while (bytesRead < buffer.length) {
      let { bytesRead: bytesRead_2 } = await handle.read(
        buffer,
        bytesRead,
        buffer.length - bytesRead,
        bytesRead,
      );
      if (bytesRead_2 === 0) break;
      bytesRead += bytesRead_2;
    }
    return bytesRead > stats.size
      ? {
          ok: false,
          reason: "absent",
        }
      : parsePrecomputedPayload(buffer.toString("utf8", 0, bytesRead));
  } catch {
    return {
      ok: false,
      reason: "absent",
    };
  } finally {
    await handle.close().catch(() => {});
  }
}
//@ chunk-e6aww6q8.js:2454806-2455245 placement
/**
 * 从会话存储（或磁盘）读取预计算压缩。
 */
async function readPrecomputedSidecar(sessionId, sidecarPath, storageV5) {
  let sidecarDir = sidecarPath ?? getSessionSidecarDir(sessionId);
  let primaryPath = join(sidecarDir, PRECOMPACT_JSON);
  let primaryKey = pathToSessionSideKey(primaryPath);
  for (let candidatePath of [primaryPath, sidecarPrecompactPath(sidecarDir)]) {
    let result;
    if (candidatePath === primaryPath && primaryKey !== undefined) {
      let readResult = await storageV5
        .read([
          {
            key: primaryKey,
            offset: 0,
            length: MAX_PRECOMPACT_BYTES + 1,
          },
        ])
        .catch(() => {
          return;
        });
      let item = readResult?.ok ? readResult.value.items[0] : undefined;
      result =
        item === undefined || !item.found
          ? {
              ok: false,
              reason: "absent",
            }
          : item.totalBytes > MAX_PRECOMPACT_BYTES
            ? {
                ok: false,
                reason: "too_large",
              }
            : parsePrecomputedPayload(Buffer.from(item.value).toString("utf8"));
    } else result = await readPrecomputedNoFollow(candidatePath);
    if (result.ok || result.reason !== "absent") return result;
  }
  return {
    ok: false,
    reason: "absent",
  };
}
//@ chunk-e6aww6q8.js:2455245-2455451 placement
/**
 * 删除会话的预计算压缩文件/存储项。
 */
async function deletePrecomputed(sessionId, storageV5) {
  let primaryPath = precompactFilePath(sessionId);
  let legacyPath = legacyPrecompactFilePath(sessionId);
  let sideKey =
    isStorageV5Enabled() && storageV5 !== undefined ? pathToSessionSideKey(primaryPath) : undefined;
  if (storageV5 !== undefined && sideKey) await storageV5.delete(sideKey).catch(() => {});
  else if (!isDiskless()) await unlink(primaryPath).catch(() => {});
  if (isDiskless()) return;
  await unlink(legacyPath).catch(() => {});
}
//@ chunk-e6aww6q8.js:2455451-2455750 placement
/**
 * 预计算载荷转为压缩结果。
 */
function toCompactionResult(payload, messagesToPreserve) {
  return {
    summaryMessages: payload.summaryMessages,
    summaryText: payload.summaryText,
    messagesToPreserve,
    attempt: payload.attempt,
    groupsPreserved: payload.groupsPreserved,
    totalGroups: payload.totalGroups,
    splitKind: "round",
    headTruncations: 0,
    forkAssistantMessageCount: payload.forkAssistantMessageCount,
    totalUsage: payload.totalUsage,
  };
}
//@ chunk-e6aww6q8.js:2455750-2455900 placement
/**
 * 类型守卫：字符串、带 message/uuid 的消息、有限数字。
 */
var isString_2 = (value) => typeof value === "string";
var isMessageLike = (value) =>
  typeof value === "object" && value !== null && "message" in value && "uuid" in value;
var isFiniteNumber_3 = (value) => typeof value === "number" && Number.isFinite(value);
//@ chunk-e6aww6q8.js:2455900-2456533 placement
/**
 * 校验预计算压缩载荷的全部字段。
 */
function validatePrecomputedPayload(payload) {
  if (typeof payload !== "object" || payload === null) return null;
  let candidate = payload;
  return isFiniteNumber_3(candidate.version) &&
    isString_2(candidate.sessionId) &&
    candidate.agentKey === "main" &&
    isString_2(candidate.model) &&
    isString_2(candidate.cliVersion) &&
    isString_2(candidate.createdAt) &&
    isString_2(candidate.precomputedAtUuid) &&
    isFiniteNumber_3(candidate.preCompactTokens) &&
    isFiniteNumber_3(candidate.readyDurationMs) &&
    (candidate.preCompactHookDisplay === undefined || isString_2(candidate.preCompactHookDisplay)) &&
    isString_2(candidate.summaryText) &&
    Array.isArray(candidate.summaryMessages) &&
    candidate.summaryMessages.length > 0 &&
    candidate.summaryMessages.every(isMessageLike) &&
    Array.isArray(candidate.preserveUuids) &&
    candidate.preserveUuids.every(isString_2) &&
    isFiniteNumber_3(candidate.attempt) &&
    isFiniteNumber_3(candidate.groupsPreserved) &&
    isFiniteNumber_3(candidate.totalGroups) &&
    isFiniteNumber_3(candidate.forkAssistantMessageCount) &&
    typeof candidate.totalUsage === "object" &&
    candidate.totalUsage !== null
    ? payload
    : null;
}
//@ chunk-e6aww6q8.js:2456533-2456716 placement
/**
 * 预计算失败的原因描述。
 */
function describePrecomputeFailure(failure, durationMs) {
  let cause = failure.reason === "error" ? (failure.isTimeout ? "timeout" : "api_error") : failure.reason;
  return {
    reason: failure.reason,
    cause,
    attempts: failure.attempts,
    status: failure.status,
    detail: failure.detail,
    durationMs,
  };
}
//@ chunk-e6aww6q8.js:2456716-2456726 placement
/**
 * 预计算连续失败计数达到多少就记录一次（3）。
 */
var MAX_COUNTED_FAILURES = 3;
//@ chunk-e6aww6q8.js:2456726-2456939 placement
/**
 * 预计算被闸门阻止时只记录一次。
 */
function latchArmGate(precompute, agentId, reason, querySource) {
  let agentKey = agentIdOrDefault(agentId);
  let key = `${agentKey}:${reason}`;
  if (!precompute.latchArmGateEvent(key)) return false;
  logEvent("tengu_precomputed_compact_arm_gated", {
    reason: fromEnum(reason),
    querySource,
  });
  logForDebugging(`precomputed compact: arm gated (${agentKey}, ${reason})`);
  return true;
}
//@ chunk-e6aww6q8.js:2456939-2457020 placement
/**
 * 给消息附上对应的 row uuid，失败时返回 undefined。
 */
function messagesWithRowUuids(messages, onError = logError) {
  try {
    return {
      messages,
      rowUuids: keptRowUuids(messages),
    };
  } catch (error) {
    onError(error);
    return;
  }
}
//@ chunk-e6aww6q8.js:2457020-2457191 placement
/**
 * 检查预计算摘要是否仍覆盖当前对话。
 */
function checkPrecomputeCoverage(precomputed, { sent, received }, fact, autoCompactWindow) {
  return checkCompactBoundaryCoverage({
    coverage: precomputed.coverage,
    kept: precomputed.result.messagesToPreserve,
    sent,
    received,
    instructions: undefined,
    fit: getCompactThresholdSnapshot(precomputed, received.messages, fact, autoCompactWindow),
  });
}
//@ chunk-e6aww6q8.js:2457191-2457293 placement
/**
 * 预计算压缩是否开启（自动压缩、远程可压缩、tengu_sepia_moth）。
 */
function isPrecomputedCompactEnabled() {
  if (!isAutoCompactEnabled()) return false;
  if (!canCompactInRemote()) return false;
  if (!getFeatureValue_CACHED_MAY_BE_STALE("tengu_sepia_moth", false)) return false;
  return isPrecomputeCompactionEnabled();
}
//@ chunk-e6aww6q8.js:2457293-2457323 placement
/**
 * 查询来源是否为 /compact 命令。
 */
function isCompactCommandSource(querySource) {
  return isCompactCommand(querySource);
}
//@ chunk-e6aww6q8.js:2457323-2457392 placement
/**
 * 预计算压缩当前是否可用：实验开关、设置开启、转写持久化开启、非无盘会话。
 */
function isPrecomputeUsable() {
  return (
    getFeatureValue_CACHED_MAY_BE_STALE("tengu_amber_packet", false) &&
    isPrecomputedCompactEnabled() &&
    !isTranscriptPersistenceDisabled() &&
    !isDiskless()
  );
}
//@ chunk-e6aww6q8.js:2457392-2458400 placement
/**
 * 当前 CLI 版本与预计算文件过期时间。
 */
var CLI_VERSION_2 =
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
var PRECOMPUTE_MAX_AGE_MS = 604800000;
//@ chunk-e6aww6q8.js:2458400-2458826 placement
/**
 * 续接会话时预读预计算压缩并缓存。
 */
async function prefetchPrecomputedSidecar(sessionId, session, precompute, storageV5) {
  if (
    !isStorageV5Enabled() ||
    storageV5 === undefined ||
    !isPrecomputedCompactEnabled() ||
    !isPrecomputeUsable() ||
    normalizeUuidOrNull(sessionId) === null ||
    session.sessionId !== sessionId ||
    precompute.hasAttemptedRehydrate(sessionId)
  )
    return;
  let sidecarPath;
  if (session.transcriptPath !== undefined) {
    if (!isUnderProjectsDir(session.transcriptPath)) return;
    sidecarPath = join(dirname(resolve_2(session.transcriptPath)), sessionId);
  }
  let read = await readPrecomputedSidecar(sessionId, sidecarPath, storageV5).catch(() => ({
    ok: false,
    reason: "absent",
  }));
  if (!read.ok && read.reason === "absent") {
    precompute.dropSidecarReadAhead(sessionId);
    return;
  }
  precompute.keepSidecarReadAhead(sessionId, read);
  return () => {
    precompute.dropSidecarReadAhead(sessionId);
  };
}
//@ chunk-e6aww6q8.js:2458826-2458980 placement
/**
 * 续接会话时的 onSessionResolved 钩子（预读预计算压缩）。
 */
function precomputeResumeHooks(precompute, storageV5, options) {
  if (!isStorageV5Enabled() || storageV5 === undefined || options?.forkSession === true) return {};
  let expectedSessionId = options?.expectedSessionId;
  return {
    onSessionResolved: (session) =>
      prefetchPrecomputedSidecar(expectedSessionId ?? session.sessionId, session, precompute, storageV5),
  };
}
//@ chunk-e6aww6q8.js:2458980-2459079 placement
/**
 * 路径是否位于项目目录之下（防止拿到项目外的转写）。
 */
function isUnderProjectsDir(transcriptPath) {
  let rel = relative(getProjectsDir(), resolve_2(transcriptPath));
  return rel !== "" && rel !== ".." && !rel.startsWith(`..${sep}`) && !isAbsolute(rel);
}
//@ chunk-e6aww6q8.js:2459079-2461249 placement
/**
 * 读取持久化的预计算压缩，校验会话、时间戳、是否过旧或已压缩。
 */
function loadPrecomputedCompact(precompute, agentKey, querySource, messages, mainLoopModel, storageV5) {
  if (
    agentKey !== "main" ||
    isCompactCommandSource(querySource) ||
    !isPrecomputeUsable() ||
    !isPrecomputedCompactEnabled()
  )
    return;
  let sessionId = getSessionId();
  if (precompute.hasAttemptedRehydrate(sessionId)) return;
  if (precompute.has(agentKey)) return;
  precompute.markRehydrateAttempted(sessionId);
  let sidecar =
    isStorageV5Enabled() && storageV5 !== undefined
      ? (precompute.takeSidecarReadAhead(sessionId) ?? {
          ok: false,
          reason: "absent",
        })
      : readPrecomputedFromDisk(sessionId);
  if (!sidecar.ok) {
    if (sidecar.reason !== "absent")
      rejectRehydrate(precompute, sessionId, sidecar.reason, undefined, storageV5);
    return;
  }
  let { payload } = sidecar;
  let max = Math.max(0, Date.now() - Date.parse(payload.createdAt));
  let reject = (reason, extra) =>
    rejectRehydrate(
      precompute,
      sessionId,
      reason,
      {
        ...(Number.isFinite(max) && {
          ageMs: Math.round(max),
        }),
        cliVersionMatch: payload.cliVersion === CLI_VERSION_2,
        modelMatch: getCanonicalModelId(payload.model) === getCanonicalModelId(mainLoopModel),
        ...extra,
      },
      storageV5,
    );
  if (payload.sessionId !== sessionId) return reject("session_mismatch");
  if (!Number.isFinite(max)) return reject("bad_timestamp");
  if (max > PRECOMPUTE_MAX_AGE_MS) return reject("too_old");
  let preservedMetadata = findPreservedMetadata(messages, payload.precomputedAtUuid);
  if (preservedMetadata !== undefined)
    return reject("already_compacted", {
      compactedByThisSummary: preservedMetadata.anchorUuid === payload.summaryMessages.at(-1)?.uuid,
    });
  let index = messages.findIndex((message) => message.uuid === payload.precomputedAtUuid);
  if (index === -1) return reject("boundary_missing");
  let growthTokens = estimateTokensWithAnchor(messages) - payload.preCompactTokens;
  if (growthTokens < -(payload.preCompactTokens / 2)) return reject("shrank_too_much");
  let byUuid = new Map(messages.map((message) => [message.uuid, message]));
  let messagesToPreserve = payload.preserveUuids.flatMap((preserveUuid) => {
    let message = byUuid.get(preserveUuid);
    return message === undefined ? [] : [message];
  });
  if (messagesToPreserve.length !== payload.preserveUuids.length)
    return reject("preserve_uuid_missing", {
      preservedUuidCount: payload.preserveUuids.length,
      missingUuidCount: payload.preserveUuids.length - messagesToPreserve.length,
    });
  let preserveSet = new Set(payload.preserveUuids);
  let index_2 = messages.findIndex((message) => preserveSet.has(message.uuid));
  let rows = messagesWithRowUuids(
    index_2 === -1
      ? messages.slice(0, index + 1)
      : messages.filter(
          (message, rowIndex) => rowIndex < index_2 || rowIndex === index || preserveSet.has(message.uuid),
        ),
  );
  if (rows === undefined) return reject("rows_unreadable");
  precompute.put(agentKey, {
    status: "ready",
    result: toCompactionResult(payload, messagesToPreserve),
    coverage: createCompactSeenState(rows, payload.precomputedAtUuid),
    preCompactTokens: payload.preCompactTokens,
    model: payload.model,
    startedAt: performance.now() - max,
    readyDurationMs: payload.readyDurationMs,
    abortController: new AbortController(),
    preCompactHookDisplay: payload.preCompactHookDisplay,
    settled: Promise.resolve(),
    rehydrated: true,
    sidecarSessionId: sessionId,
  });
  logEvent("tengu_precomputed_compact_rehydrated", {
    ageMs: Math.round(max),
    preCompactTokens: payload.preCompactTokens,
    preservedUuidCount: payload.preserveUuids.length,
    growthTokens,
    summaryBytes: Buffer.byteLength(payload.summaryText, "utf8"),
    modelMatch: getCanonicalModelId(payload.model) === getCanonicalModelId(mainLoopModel),
    cliVersionMatch: payload.cliVersion === CLI_VERSION_2,
  });
  logForDebugging(
    `precomputed compact: rehydrated (${agentKey}, age ${Math.round(max)}ms, growth ~${growthTokens} tok)`,
  );
}
//@ chunk-e6aww6q8.js:2461249-2461431 placement
/**
 * 找包含某 uuid 的最近压缩边界的保留信息。
 */
function findPreservedMetadata(messages, precomputedAtUuid) {
  let preservedMessages = messages.findLast(
    (message) => message.type === "system" && message.subtype === "compact_boundary",
  )?.compactMetadata?.preservedMessages;
  return (preservedMessages?.allUuids ?? preservedMessages?.uuids ?? []).includes(precomputedAtUuid)
    ? preservedMessages
    : undefined;
}
//@ chunk-e6aww6q8.js:2461431-2461611 placement
/**
 * 拒绝恢复预计算压缩：删除文件并记录原因。
 */
function rejectRehydrate(precompute, sessionId, reason, details, storageV5) {
  precompute.enqueueSidecarIo(() => deletePrecomputed(sessionId, storageV5), logError);
  logEvent("tengu_precomputed_compact_rehydrate_rejected", {
    reason: fromEnum(reason),
    ...details,
  });
  logForDebugging(`precomputed compact: rehydrate rejected (${reason})`);
}
//@ chunk-e6aww6q8.js:2461611-2462633 placement
/**
 * 把预先计算的压缩摘要持久化到会话存储。
 */
async function persistPrecomputedCompact({
  sessionId,
  sidecarPath,
  ready,
  lastLoggableUuid,
  model,
  querySource,
  storageV5,
}) {
  let mapped = ready.result.messagesToPreserve.filter(isLoggableMessage).map((message) => message.uuid);
  let writeResult = await writePrecomputedCompact(
    {
      version: PRECOMPACT_FORMAT_VERSION,
      sessionId,
      agentKey: "main",
      model,
      cliVersion: CLI_VERSION_2,
      createdAt: new Date().toISOString(),
      precomputedAtUuid: lastLoggableUuid,
      preCompactTokens: ready.preCompactTokens,
      readyDurationMs: ready.readyDurationMs,
      preCompactHookDisplay: ready.preCompactHookDisplay,
      summaryText: ready.result.summaryText,
      summaryMessages: ready.result.summaryMessages,
      preserveUuids: mapped,
      attempt: ready.result.attempt,
      groupsPreserved: ready.result.groupsPreserved,
      totalGroups: ready.result.totalGroups,
      forkAssistantMessageCount: ready.result.forkAssistantMessageCount,
      totalUsage: ready.result.totalUsage,
    },
    sidecarPath,
    storageV5,
  );
  logEvent("tengu_precomputed_compact_persisted", {
    ok: writeResult.ok,
    bytes: writeResult.bytes,
    ...(writeResult.ok === false && {
      reason: fromEnum(writeResult.reason),
    }),
    preservedMessageCount: ready.result.messagesToPreserve.length,
    preservedUuidCount: mapped.length,
    querySource,
  });
  logForDebugging(
    `precomputed compact: persisted (${writeResult.ok ? `${writeResult.bytes} bytes` : `${writeResult.reason}${writeResult.detail === undefined ? "" : `: ${writeResult.detail}`}`})`,
  );
}
//@ chunk-e6aww6q8.js:2462633-2462763 placement
/**
 * 删除本会话已就绪的预计算文件。
 */
function deleteReadySidecar(deps, ready, storageV5) {
  let sidecarSessionId = ready?.status === "ready" ? ready.sidecarSessionId : undefined;
  if (sidecarSessionId !== undefined && sidecarSessionId === getSessionId())
    deps.enqueueSidecarIo(() => deletePrecomputed(sidecarSessionId, storageV5), logError);
}
//@ chunk-e6aww6q8.js:2462763-2462855 placement
/**
 * 为预计算构造 toolUseContext（去掉压缩回调）。
 */
function contextForPrecompute(toolUseContext, abortController) {
  return {
    ...toolUseContext,
    abortController,
    onCompactEvent: undefined,
    onRetryStatus: undefined,
  };
}
//@ chunk-e6aww6q8.js:2462855-2463174 placement
/**
 * 本回合是否应启动预计算压缩。
 */
function shouldArmPrecompute(state) {
  if (state.autocompactRan) return false;
  if (state.isPreFirstCompactFork) return false;
  if (state.hasAttemptedReactiveCompact) return false;
  if (state.lastTransitionReason === "precomputed_compact_swap") return false;
  if (!isPrecomputedCompactEnabled()) return false;
  return isAtPrecomputeThreshold(
    state.contextTokens,
    state.facts,
    state.autoCompactWindow,
    state.querySource,
    state.messagesCounted ? stripInProgressAssistantMessage(state.messagesCounted) : 0,
  );
}
//@ chunk-e6aww6q8.js:2463174-2468415 placement
/**
 * 在合适时机（空闲、估算超过阈值）启动预计算压缩，SDK 单提示模式下受闸门限制。
 */
function armPrecomputedCompact(input) {
  let { querySource, messages, cacheSafeParams, facts, armTrigger = "estimate", estimateGapTokens } = input;
  let { toolUseContext } = cacheSafeParams;
  let precompute = toolUseContext.session.precompute;
  let agentKey = agentIdOrDefault(toolUseContext.agentId);
  let isIdle = armTrigger === "idle";
  if (!isIdle && !isPrecomputedCompactEnabled()) return false;
  if (isCompactCommandSource(querySource)) return false;
  loadPrecomputedCompact(
    precompute,
    agentKey,
    querySource,
    messages,
    toolUseContext.options.mainLoopModel,
    toolUseContext.storageV5,
  );
  if (precompute.consecutiveCountedFailures(agentKey) >= MAX_COUNTED_FAILURES) return false;
  let existing = precompute.get(agentKey);
  if (existing !== undefined && existing.status !== "failed") return false;
  let uuid = messages.at(-1)?.uuid;
  if (uuid === undefined) return false;
  let lastHumanPromptUuid = findLastHumanPromptUuid(messages);
  if (precompute.isVetoedUnder(agentKey, lastHumanPromptUuid)) return false;
  let promptScan = querySource === "sdk" ? input.promptScan : undefined;
  if (promptScan !== undefined) {
    let { userPromptCount, historyRewritten } = promptScan;
    let gateReason = userPromptCount <= 1 && !historyRewritten ? "sdk_single_prompt_gate" : undefined;
    if (gateReason !== undefined) {
      let gateKey = `${agentKey}:${gateReason}`;
      if (precompute.latchArmGateEvent(gateKey)) {
        logEvent("tengu_precomputed_compact_arm_gated", {
          reason: fromEnum(gateReason),
          querySource: lit_2("sdk"),
          userPromptCount,
          preCompactTokens: estimateTokensWithAnchor(messages),
        });
        logForDebugging(
          `precomputed compact: arm gated (${agentKey}, ${gateReason}, userPrompts ${userPromptCount})`,
        );
      }
      return false;
    }
  }
  let rows = messagesWithRowUuids(messages, (error) => {
    if (
      latchArmGate(precompute, toolUseContext.agentId, "rows_unreadable", agentTypeForTelemetry(querySource))
    )
      logError(error);
  });
  if (rows === undefined) return false;
  let abortController = new AbortController();
  let startTime = performance.now();
  let uuid_2 = messages.findLast(isLoggableMessage)?.uuid;
  let model = toolUseContext.options.mainLoopModel;
  let sessionId = getSessionId();
  let sessionPath = precompactFilePath(sessionId);
  let preCompactTokens = estimateTokensWithAnchor(messages);
  let toolUseContext_2 = contextForPrecompute(toolUseContext, abortController);
  let precomputeSafeParams = {
    ...cacheSafeParams,
    toolUseContext: toolUseContext_2,
  };
  let querySource_2 = agentTypeForTelemetry(querySource);
  let attemptNumber = precompute.nextAttemptNumber(agentKey);
  let precomputeFraction = resolvePrecomputeFraction(
    facts,
    toolUseContext.options.autoCompactWindow,
    querySource,
  );
  logEvent("tengu_precomputed_compact_started", {
    armFraction: precomputeFraction.fraction,
    armFractionSource: fromEnum(precomputeFraction.source),
    ...(precomputeFraction.matchedWindowKey !== undefined && {
      armWindowKey: precomputeFraction.matchedWindowKey,
    }),
    preCompactTokens,
    messageCount: messages.length,
    querySource: querySource_2,
    precomputeAttemptNumber: attemptNumber,
    ...(promptScan !== undefined && {
      userPromptCount: promptScan.userPromptCount,
      historyRewritten: promptScan.historyRewritten,
    }),
    armTrigger: fromEnum(armTrigger),
    ...(estimateGapTokens !== undefined && {
      estimateGapTokens,
    }),
    windowSource: fromEnumOpt(windowSource(facts, toolUseContext.options.autoCompactWindow)),
  });
  logForDebugging(
    `precomputed compact: started (${agentKey}, ${messages.length} msgs, ~${preCompactTokens} tok, attempt ${attemptNumber}, trigger ${armTrigger})`,
  );
  let settled = (async () => {
    let compactOutcome;
    let preCompactHookDisplay;
    let toFailure = (error) => ({
      ok: false,
      reason: "error",
      attempts: 0,
      totalGroups: 0,
      detail: errorMessage(error),
      errorKind: "thrown",
      status: undefined,
      isTimeout: false,
    });
    let hookResult = await dispatchSessionCompactHooks({
      trigger: "precompute",
      instructions: undefined,
      messages,
      agentId: toolUseContext.agentId,
      isIsolated:
        isDelegatedObservationContext(toolUseContext.agentContext) ||
        toolUseContext.options.settingsHooksOff === true,
      origin: toolUseContext.hookOrigin,
      signal: abortController.signal,
      compact: async (hookMessages, hookInstructions) => {
        let preHookResult = await executePreCompactHooks(
          toolUseContext.session,
          {
            trigger: "auto",
            customInstructions: hookInstructions ?? null,
          },
          toolUseContext,
          abortController.signal,
        ).catch((error) => {
          logError(error);
          return {};
        });
        if (preHookResult.blockedBy) {
          logForDebugging(`Precomputed compact blocked by PreCompact hook: ${preHookResult.blockedBy}`);
          return {
            skip: `${COMPACTION_BLOCKED_BY_HOOK}: ${preHookResult.blockedBy}`,
          };
        }
        if (abortController.signal.aborted)
          return {
            skip: "aborted before the summary ran",
          };
        preCompactHookDisplay = preHookResult.userDisplayMessage;
        compactOutcome = await runReactiveCompact(hookMessages, precomputeSafeParams, {
          customInstructions: mergeHookInstructions(hookInstructions, preHookResult.newCustomInstructions),
          allowFallback: false,
        }).catch(toFailure);
        if (!compactOutcome.ok) throw new PrecomputedCompactNotReadyError();
        return {
          messages: [...compactOutcome.result.summaryMessages, ...compactOutcome.result.messagesToPreserve],
          tokensBefore: preCompactTokens,
          usage: getTokenCountFromUsage_3(compactOutcome.result.totalUsage),
          record: compactOutcome.result,
        };
      },
    }).catch((error) => {
      if (compactOutcome?.ok !== false) compactOutcome = toFailure(error);
      return;
    });
    if (hookResult?.kind === "skipped") {
      logForDebugging(`precomputed compact: skipped (${agentKey}, ${hookResult.reason}); nothing kept`);
      if (!abortController.signal.aborted) precompute.recordVeto(agentKey, lastHumanPromptUuid);
      updatePendingEntry(precompute, agentKey, abortController, null);
      return;
    }
    if (hookResult?.kind === "replaced") {
      let rounded = Math.round(performance.now() - startTime);
      logForDebugging(
        `precomputed compact: ready with a hook's ${hookResult.messages.length} messages (${agentKey}, ${rounded}ms)`,
      );
      updatePendingEntry(precompute, agentKey, abortController, (entry) => ({
        ...entry,
        status: "ready",
        result: emptyCompactionResult(hookResult.messages),
        replacement: true,
        readyDurationMs: rounded,
        preCompactHookDisplay,
      }));
      return;
    }
    compactOutcome ??= toFailure(Error("the summary never ran"));
    let rounded = Math.round(performance.now() - startTime);
    logForDebugging(
      `precomputed compact: ${compactOutcome.ok ? "ready" : `failed (${compactOutcome.reason})`} (${agentKey}, ${rounded}ms)`,
    );
    if (!compactOutcome.ok) {
      let abortReason = unwrapAbortReason(abortController.signal.reason);
      let discardReason =
        compactOutcome.reason === "aborted"
          ? PRECOMPUTE_DISCARD_REASONS.find((candidate) => candidate === abortReason)
          : undefined;
      let failureInfo = describePrecomputeFailure(compactOutcome, rounded);
      logEvent("tengu_precomputed_compact_failed", {
        reason: fromEnum(compactOutcome.reason),
        cause: fromEnum(failureInfo.cause),
        status: failureInfo.status,
        durationMs: rounded,
        querySource: querySource_2,
        preCompactTokens,
        precomputeAttemptNumber: attemptNumber,
        armTrigger: fromEnum(armTrigger),
        ...(discardReason !== undefined && {
          clearReason: fromEnum(discardReason),
        }),
      });
      if (!isIdle)
        if (compactOutcome.reason === "aborted")
          logFeatureSad("compact_precomputed", "compact_precomputed_aborted");
        else logFeatureBad("compact_precomputed", `compact_precomputed_${compactOutcome.reason}`);
      if (
        compactOutcome.reason !== "aborted" &&
        failureInfo.cause !== "too_few_groups" &&
        !isIdle &&
        !abortController.signal.aborted
      ) {
        let failureCount = precompute.recordCountedFailure(agentKey);
        if (failureCount === MAX_COUNTED_FAILURES) {
          logEvent("tengu_precomputed_compact_rearm_capped", {
            cause: fromEnum(failureInfo.cause),
            status: failureInfo.status,
            querySource: querySource_2,
            preCompactTokens,
            precomputeAttemptNumber: attemptNumber,
          });
          logForDebugging(
            `precomputed compact: re-arm capped (${agentKey}, ${failureCount} consecutive ${failureInfo.cause} failures)`,
          );
        }
      }
      updatePendingEntry(precompute, agentKey, abortController, (entry) => ({
        ...entry,
        status: "failed",
        failure: failureInfo,
      }));
      return;
    }
    logEvent("tengu_precomputed_compact_ready", {
      durationMs: rounded,
      attempts: compactOutcome.result.attempt,
      groupsPreserved: compactOutcome.result.groupsPreserved,
      totalGroups: compactOutcome.result.totalGroups,
      querySource: querySource_2,
      preCompactTokens,
      precomputeAttemptNumber: attemptNumber,
      armTrigger: fromEnum(armTrigger),
    });
    if (!isIdle) logFeatureOk("compact_precomputed");
    if (!isIdle && !abortController.signal.aborted) precompute.clearCountedFailures(agentKey);
    let sidecarSessionId = agentKey === "main" && !isIdle && isPrecomputeUsable() ? sessionId : undefined;
    let result = compactOutcome.result;
    updatePendingEntry(precompute, agentKey, abortController, (entry) => ({
      ...entry,
      status: "ready",
      result,
      readyDurationMs: rounded,
      preCompactHookDisplay,
      ...(sidecarSessionId !== undefined && {
        sidecarSessionId,
      }),
    }));
    let entry = precompute.get(agentKey);
    if (
      sidecarSessionId !== undefined &&
      uuid_2 !== undefined &&
      entry?.status === "ready" &&
      entry.abortController === abortController
    ) {
      let sidecarPath = sessionId === getSessionId() ? precompactFilePath(sessionId) : sessionPath;
      precompute.enqueueSidecarIo(
        () =>
          persistPrecomputedCompact({
            sessionId: sidecarSessionId,
            sidecarPath,
            ready: entry,
            lastLoggableUuid: uuid_2,
            model,
            querySource: querySource_2,
            storageV5: toolUseContext.storageV5,
          }),
        logError,
      );
    }
  })();
  let entry = {
    status: "pending",
    coverage: createCompactSeenState(rows, uuid),
    preCompactTokens,
    model,
    startedAt: startTime,
    abortController,
    preCompactHookDisplay: undefined,
    settled,
    ...(armTrigger === "idle" && {
      armTrigger,
    }),
  };
  precompute.put(agentKey, entry);
  return true;
}
//@ chunk-e6aww6q8.js:2468415-2468948 placement (2.1.88 match: manuallyExtractSessionMemory, 0.307)
/**
 * 手动触发会话记忆/预计算压缩：等待 precompute 结果就绪，返回压缩前 token 数，未就绪抛 PrecomputedCompactNotReadyError。
 */
async function manuallyExtractSessionMemory(messages, toolUseContext) {
  let { toolUseContext: toolUseContext_2 } = toolUseContext;
  let { agentId, session } = toolUseContext_2;
  let entry = armPrecomputedCompact({
    querySource: messages,
    messages: toolUseContext.forkContextMessages,
    cacheSafeParams: {
      ...toolUseContext,
      toolUseContext: {
        ...toolUseContext_2,
        compactionApiAttemptsLeft: {
          count: 1,
        },
      },
    },
    facts: getModelContextInfo(toolUseContext_2.options.mainLoopModel),
    armTrigger: "idle",
  })
    ? getPrecomputeEntry(session.precompute, agentId)
    : undefined;
  if (entry === undefined) return null;
  await entry.settled;
  if (entry.abortController.signal.aborted) throw new AbortError_2();
  let precomputeEntry = getPrecomputeEntry(session.precompute, agentId);
  if (precomputeEntry?.abortController !== entry.abortController) return null;
  if (precomputeEntry.status !== "ready") throw new PrecomputedCompactNotReadyError();
  return {
    tokensBefore: precomputeEntry.preCompactTokens,
  };
}
//@ chunk-e6aww6q8.js:2468948-2469047 placement
class PrecomputedCompactNotReadyError extends Error {
  constructor() {
    super("precomputed compact: the summary did not settle ok");
  }
}
//@ chunk-e6aww6q8.js:2469047-2469246 placement
/**
 * 空的压缩结果（只保留消息）。
 */
function emptyCompactionResult(messagesToPreserve) {
  return {
    summaryMessages: [],
    summaryText: "",
    messagesToPreserve,
    attempt: 0,
    groupsPreserved: 0,
    totalGroups: 0,
    splitKind: "round",
    headTruncations: 0,
    forkAssistantMessageCount: 0,
    totalUsage: EMPTY_USAGE,
  };
}
//@ chunk-e6aww6q8.js:2469246-2469384 placement
/**
 * 更新仍在进行中的预计算条目（null 时删除）。
 */
function updatePendingEntry(precompute, agentId, abortController, update) {
  let existing = precompute.get(agentId);
  if (existing?.status !== "pending" || existing.abortController !== abortController) return;
  if (update === null) {
    precompute.remove(agentId);
    return;
  }
  precompute.put(agentId, update(existing));
}
//@ chunk-e6aww6q8.js:2469384-2469423 placement
/**
 * 从预计算状态里取某子代理的条目。
 */
function getPrecomputeEntry(precompute, agentId) {
  return precompute.get(agentIdOrDefault(agentId));
}
//@ chunk-e6aww6q8.js:2469423-2469992 placement
/**
 * 借用进行中或已就绪的预计算结果（回合中止时放弃）。
 */
async function borrowPrecompute(precompute, borrowFrom, signal) {
  let entry = precompute.get(borrowFrom);
  if (entry === undefined || signal.aborted) return null;
  let statusAtPTL = entry.status;
  if (entry.status === "pending") {
    logForDebugging(`precomputed compact: awaiting borrowed in-flight (${borrowFrom})`);
    if (
      await Promise.race([
        entry.settled.then(() => false),
        new Promise((resolve) => {
          signal.addEventListener("abort", () => resolve(true), {
            once: true,
          });
        }),
      ])
    ) {
      logForDebugging(
        `precomputed compact: turn aborted while borrowing (${borrowFrom}) \u2014 leaving entry`,
      );
      return {
        kind: "turn_aborted",
        statusAtPTL,
      };
    }
  }
  let borrowedEntry = precompute.get(borrowFrom);
  logForDebugging(`precomputed compact: borrowed (${borrowFrom}, ${borrowedEntry?.status ?? "gone"})`);
  return borrowedEntry?.status === "ready"
    ? {
        kind: "ready",
        ready: borrowedEntry,
        statusAtPTL,
      }
    : null;
}
//@ chunk-e6aww6q8.js:2469992-2470695 placement
async function awaitInflightPrecompute(deps, agentId, signal, storageV5) {
  let agentKey = agentIdOrDefault(agentId);
  let entry = deps.get(agentKey);
  if (entry === undefined || signal.aborted) return null;
  let statusAtPTL = entry.status;
  if (entry.status === "pending") {
    logForDebugging(`precomputed compact: awaiting in-flight (${agentKey})`);
    if (
      await Promise.race([
        entry.settled.then(() => false),
        new Promise((resolve) => {
          signal.addEventListener("abort", () => resolve(true), {
            once: true,
          });
        }),
      ])
    ) {
      logForDebugging(`precomputed compact: turn aborted while awaiting (${agentKey}) \u2014 leaving entry`);
      return {
        kind: "turn_aborted",
        statusAtPTL,
      };
    }
  }
  let consumed = deps.get(agentKey);
  switch (
    (deps.remove(agentKey),
    deleteReadySidecar(deps, consumed, storageV5),
    logForDebugging(`precomputed compact: consumed (${agentKey}, ${consumed?.status ?? "gone"})`),
    consumed?.status)
  ) {
    case "ready":
      return {
        kind: "ready",
        ready: consumed,
        statusAtPTL,
      };
    case "failed":
      return {
        kind: "failed",
        failure: consumed.failure,
        statusAtPTL,
      };
    case "pending":
    case undefined:
      return null;
  }
}
//@ chunk-e6aww6q8.js:2470695-2473037 placement
/**
 * 到达阈值时应用预先计算好的压缩摘要，否则返回未就绪或提前返回的原因。
 */
async function applyPrecomputedCompact(input) {
  let { toolUseContext, messages, detectedAt, borrowFrom, querySource } = input;
  let precompute = toolUseContext.session.precompute;
  let querySource_2 = agentTypeForTelemetry(querySource);
  let finish = (outcome, emittedEarlyCompactStart) => {
    let rounded = Math.round(performance.now() - detectedAt);
    consumePrecomputedCompact(outcome, querySource_2, rounded, input.trigger);
    return {
      outcome,
      swap: outcome.kind === "applied" ? outcome.swap : undefined,
      emittedEarlyCompactStart,
    };
  };
  let shouldTry =
    !isCompactCommandSource(querySource) &&
    (input.trigger === "idle" ||
      (isPrecomputedCompactEnabled() &&
        (input.trigger === "threshold" ||
          (input.isWithheld413 === true && !input.hasAttemptedReactiveCompact))));
  if (shouldTry)
    loadPrecomputedCompact(
      precompute,
      agentIdOrDefault(toolUseContext.agentId),
      querySource,
      messages,
      toolUseContext.options.mainLoopModel,
      toolUseContext.storageV5,
    );
  if (input.trigger === "idle") {
    let precomputeEntry = getPrecomputeEntry(precompute, toolUseContext.agentId);
    let cacheExpiresAt = getMainThreadCacheExpiresAt() ?? 1 / 0;
    if (precomputeEntry?.status !== "ready" || Date.now() < cacheExpiresAt)
      discardPrecompute(
        precompute,
        toolUseContext.agentId,
        "returned_early",
        querySource,
        toolUseContext.storageV5,
      );
  }
  if (
    !shouldTry ||
    (input.trigger !== "ptl" && getPrecomputeEntry(precompute, toolUseContext.agentId) === undefined)
  )
    return {
      outcome: {
        kind: "none",
      },
      swap: undefined,
      emittedEarlyCompactStart: false,
    };
  let signal = toolUseContext.abortController.signal;
  let wasPending =
    (borrowFrom !== undefined
      ? precompute.get(borrowFrom)
      : getPrecomputeEntry(precompute, toolUseContext.agentId)
    )?.status === "pending";
  if (wasPending) {
    toolUseContext.onCompactEvent?.({
      type: "stream_mode",
      mode: "requesting",
    });
    input.onResponseLength?.({
      type: "response_length",
      op: "reset",
    });
    toolUseContext.onCompactEvent?.({
      type: "compact_progress",
      event: {
        type: "compact_start",
      },
    });
    toolUseContext.onCompactEvent?.({
      type: "sdk_status",
      status: "compacting",
    });
  }
  let consumed = null;
  let borrowed = false;
  let stopTicker = wasPending ? startCompactingStatusTicker(toolUseContext.onCompactEvent) : undefined;
  try {
    if (borrowFrom !== undefined) {
      consumed = await borrowPrecompute(precompute, borrowFrom, signal);
      borrowed = consumed !== null;
    }
    consumed ??= await awaitInflightPrecompute(
      precompute,
      toolUseContext.agentId,
      signal,
      toolUseContext.storageV5,
    );
  } finally {
    stopTicker?.();
  }
  if (consumed === null)
    return finish(
      {
        kind: "none",
      },
      wasPending,
    );
  if (consumed.kind === "turn_aborted")
    return finish(
      {
        kind: "aborted",
      },
      wasPending,
    );
  if (consumed.kind === "failed")
    return finish(
      {
        kind: "failed",
        failure: consumed.failure,
        statusAtPTL: consumed.statusAtPTL,
      },
      wasPending,
    );
  let { ready } = consumed;
  let reportRefused = (reason, details) => {
    if (borrowed) {
      logEvent("tengu_precompute_borrow_boundary_miss", {
        querySource: querySource_2,
        reason: fromEnum(reason),
        ...details,
      });
      logForDebugging(`precomputed compact: borrow refused (${reason})`);
      return;
    }
    logPrecomputeDiscarded(ready, reason, querySource, details);
  };
  let sentRows = messagesWithRowUuids(messages);
  let coverageCheck =
    sentRows === undefined
      ? {
          kind: "refuse",
          reason: "rows_unreadable",
        }
      : checkPrecomputeCoverage(
          ready,
          {
            sent: sentRows,
            received: sentRows,
          },
          input.sizingModel,
          toolUseContext.options.autoCompactWindow,
        );
  if (coverageCheck.kind === "refuse") {
    reportRefused(
      coverageCheck.reason,
      coverageCheck.reason === "would_not_fit" ? coverageCheck.sizes : undefined,
    );
    return finish(
      {
        kind: "none",
      },
      wasPending,
    );
  }
  let statusAtPTL = consumed.statusAtPTL === "pending" ? "pending" : "ready";
  return finish(
    {
      kind: "applied",
      swap: {
        compactResult: ready.result,
        coverage: ready.coverage,
        reportRefused,
        replacement: ready.replacement === true,
        preCompactHookDisplay: ready.preCompactHookDisplay,
        statusAtPTL,
        leadMs: detectedAt - ready.startedAt,
        totalMs: ready.readyDurationMs,
        borrowed,
        rehydrated: ready.rehydrated === true,
        ...(ready.armTrigger === "idle" && {
          armTrigger: "idle",
        }),
        drift: precomputeDrift(ready, {
          messages,
          mainLoopModel: toolUseContext.options.mainLoopModel,
        }),
        sizes: coverageCheck.sizes,
      },
    },
    wasPending,
  );
}
//@ chunk-e6aww6q8.js:2473037-2473606 placement
/**
 * 消费预计算的压缩结果并记录遥测。
 */
function consumePrecomputedCompact(outcome, querySource, waitedMs, trigger) {
  let statusAtPtl =
    outcome.kind === "applied"
      ? outcome.swap.statusAtPTL
      : outcome.kind === "failed"
        ? outcome.statusAtPTL
        : undefined;
  logEvent("tengu_precomputed_compact_consumed", {
    kind: fromEnum(outcome.kind),
    querySource,
    waitedMs,
    statusAtPTL: fromEnumOpt(statusAtPtl),
    trigger: fromEnum(trigger),
    ...(outcome.kind === "applied" && {
      borrowed: outcome.swap.borrowed,
      rehydrated: outcome.swap.rehydrated,
      ...outcome.swap.drift,
      precomputeTotalMs: Math.round(outcome.swap.totalMs),
      ...outcome.swap.sizes,
    }),
    ...(outcome.kind === "failed" && {
      failureReason: fromEnum(outcome.failure.reason),
      failureCause: fromEnum(outcome.failure.cause),
      failureStatus: outcome.failure.status,
      failureAttempts: outcome.failure.attempts,
      failureDurationMs: outcome.failure.durationMs,
    }),
  });
}
//@ chunk-e6aww6q8.js:2473606-2473999 placement
/**
 * 记录手动 /compact 使用预计算结果的情况（含失败原因）。
 */
function logManualPrecomputeConsumed(kind, durationMs, trigger) {
  if (!isPrecomputedCompactEnabled()) return;
  logEvent("tengu_precomputed_compact_consumed", {
    kind: fromEnum(kind),
    trigger: lit_2("manual"),
    waitedMs: Math.round(trigger),
    statusAtPTL: fromEnumOpt(kind === "failed" ? durationMs?.statusAtPTL : undefined),
    ...(kind === "failed" &&
      durationMs?.kind === "failed" && {
        failureReason: fromEnum(durationMs.failure.reason),
        failureCause: fromEnum(durationMs.failure.cause),
        failureStatus: durationMs.failure.status,
        failureAttempts: durationMs.failure.attempts,
        failureDurationMs: durationMs.failure.durationMs,
      }),
  });
}
//@ chunk-e6aww6q8.js:2473999-2474337 placement
/**
 * 记录手动 /compact 应用了预计算结果。
 */
function logManualPrecomputeApplied(session, durationMs, trigger, sizes) {
  if (!isPrecomputedCompactEnabled()) return;
  logEvent("tengu_precomputed_compact_consumed", {
    kind: lit_2("applied"),
    trigger: lit_2("manual"),
    waitedMs: Math.round(durationMs),
    statusAtPTL: fromEnum(session.statusAtPTL),
    borrowed: false,
    rehydrated: session.ready.rehydrated === true,
    ...(session.ready.armTrigger === "idle" && {
      armTrigger: lit_2("idle"),
    }),
    ...precomputeDrift(session.ready, trigger),
    precomputeTotalMs: session.ready.readyDurationMs,
    ...sizes,
  });
}
//@ chunk-e6aww6q8.js:2474337-2474461 placement
/**
 * 预计算后模型是否一致与 token 增长。
 */
function precomputeDrift(ready, { messages, mainLoopModel }) {
  return {
    modelMatch: getCanonicalModelId(ready.model) === getCanonicalModelId(mainLoopModel),
    growthTokens: estimateTokensWithAnchor(messages) - ready.preCompactTokens,
  };
}
//@ chunk-e6aww6q8.js:2474461-2474680 placement
var PRECOMPUTE_DISCARD_REASONS = [
  "post_compact_cleanup",
  "subagent_exit",
  "boundary_uuid_missing",
  "covered_messages_changed",
  "kept_message_missing",
  "unseen_reply",
  "rows_unreadable",
  "model_switch",
  "hook_rewrite",
  "would_not_fit",
  "returned_early",
];
//@ chunk-e6aww6q8.js:2474680-2475162 placement
/**
 * 记录丢弃预计算结果。
 */
function logPrecomputeDiscarded(precompute, reason, ageMs, trigger) {
  logEvent("tengu_precomputed_compact_discarded", {
    reason: fromEnum(reason),
    ageMs: Math.round(performance.now() - precompute.startedAt),
    readyDurationMs: precompute.readyDurationMs,
    rehydrated: precompute.rehydrated === true,
    ...(precompute.armTrigger === "idle" && {
      armTrigger: lit_2("idle"),
    }),
    preCompactTokens: precompute.preCompactTokens,
    ...trigger,
    ...(ageMs !== undefined && {
      querySource: agentTypeForTelemetry(ageMs),
    }),
  });
  logForDebugging(
    `precomputed compact: discarded (${reason}, age ${Math.round(performance.now() - precompute.startedAt)}ms${trigger === undefined ? "" : `, ~${trigger.postSwapTokens} tok against ${trigger.thresholdTokens}`})`,
  );
}
//@ chunk-e6aww6q8.js:2475162-2475490 placement
/**
 * 丢弃某代理的预计算：中止进行中的任务、删除侧车文件、记录原因。
 */
function discardPrecompute(precompute, agentId, reason, querySource, storageV5) {
  let agentKey = agentIdOrDefault(agentId);
  let entry = precompute.get(agentKey);
  if (entry?.status === "ready") logPrecomputeDiscarded(entry, reason, querySource);
  entry?.abortController.abort(new DOMException(reason, "AbortError"));
  precompute.remove(agentKey);
  deleteReadySidecar(precompute, entry, storageV5);
  let sessionId = agentKey === "main" ? getSessionId() : undefined;
  if (sessionId !== undefined && precompute.hasAttemptedRehydrate(sessionId) && isPrecomputeUsable())
    precompute.enqueueSidecarIo(() => deletePrecomputed(sessionId, storageV5), logError);
  if (reason === "subagent_exit") precompute.forgetSubagentTelemetry(agentKey);
}
//@ chunk-e6aww6q8.js:2475490-2475667 placement
/**
 * 切换模型时中止进行中的主线程预计算。
 */
function abortPrecomputeOnModelSwitch(precompute) {
  let agentKey = agentIdOrDefault(undefined);
  let entry = precompute.get(agentKey);
  if (entry === undefined || entry.status === "ready") return;
  let reason = "model_switch";
  entry.abortController.abort(new DOMException(reason, "AbortError"));
  precompute.remove(agentKey);
}
export {
  precomputeResumeHooks,
  loadPrecomputedCompact,
  getPrecomputeEntry,
  prefetchPrecomputedSidecar,
  isPrecomputedCompactEnabled,
  discardPrecompute,
  manuallyExtractSessionMemory,
  isCompactCommandSource,
  applyPrecomputedCompact,
  shouldArmPrecompute,
  latchArmGate,
  armPrecomputedCompact,
  abortPrecomputeOnModelSwitch,
  awaitInflightPrecompute,
  logManualPrecomputeConsumed,
  messagesWithRowUuids,
  checkPrecomputeCoverage,
  logPrecomputeDiscarded,
  logManualPrecomputeApplied,
};
