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
function legacyPrecompactFilePath(e) {
  return sidecarPrecompactPath(getSessionSidecarDir(e));
}
//@ chunk-e6aww6q8.js:2452970-2453003 placement
/**
 * 给目录路径加上预计算文件名后缀。
 */
function sidecarPrecompactPath(e) {
  return e + "." + PRECOMPACT_JSON;
}
//@ chunk-e6aww6q8.js:2453003-2453617 placement
async function writePrecomputedCompact(e, sidecarPath = precompactFilePath(e.sessionId), storageV5) {
  let s = jsonStringify(e);
  let h = Buffer.byteLength(s, "utf8");
  if (h > MAX_PRECOMPACT_BYTES)
    return {
      ok: false,
      reason: "too_large",
      bytes: h,
    };
  let y = isStorageV5Enabled() && storageV5 !== undefined ? pathToSessionSideKey(sidecarPath) : undefined;
  if (storageV5 !== undefined && y)
    try {
      let S = await storageV5.write(y, s, {
        mode: 384,
      });
      return S.ok
        ? {
            ok: true,
            bytes: h,
          }
        : {
            ok: false,
            reason: "write_error",
            bytes: h,
            detail: formatStorageError(S.error),
          };
    } catch (error) {
      return {
        ok: false,
        reason: "write_error",
        bytes: h,
        detail: errorMessage(error),
      };
    }
  if (isDiskless())
    return {
      ok: false,
      reason: "diskless",
      bytes: h,
      detail: "not written: no storage backend, or no key for the target path",
    };
  try {
    await ensureSidecarDirFor(sidecarPath);
    await writeFileAtomic_2(sidecarPath, s, 384);
    return {
      ok: true,
      bytes: h,
    };
  } catch (error) {
    return {
      ok: false,
      reason: "write_error",
      bytes: h,
      detail: errorMessage(error),
    };
  }
}
//@ chunk-e6aww6q8.js:2453617-2453742 placement
/**
 * 依次读取新旧位置的预计算压缩文件。
 */
function readPrecomputedFromDisk(sessionId) {
  for (let n of [precompactFilePath(sessionId), legacyPrecompactFilePath(sessionId)]) {
    let precomputedFile = readPrecomputedFile(n);
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
function readPrecomputedFile(e) {
  if (isDiskless())
    return {
      ok: false,
      reason: "absent",
    };
  try {
    if (statSync(e).size > MAX_PRECOMPACT_BYTES)
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
  let n;
  try {
    n = readFileSync(e, "utf8");
  } catch {
    return {
      ok: false,
      reason: "absent",
    };
  }
  return parsePrecomputedPayload(n);
}
//@ chunk-e6aww6q8.js:2453962-2454298 placement
/**
 * 解析预计算压缩 JSON（大小、版本、字段校验）。
 */
function parsePrecomputedPayload(e) {
  if (Buffer.byteLength(e, "utf8") > MAX_PRECOMPACT_BYTES)
    return {
      ok: false,
      reason: "too_large",
    };
  let n;
  try {
    n = jsonParse(e);
  } catch {
    return {
      ok: false,
      reason: "parse_error",
    };
  }
  if (typeof n !== "object" || n === null)
    return {
      ok: false,
      reason: "parse_error",
    };
  if (n.version !== PRECOMPACT_FORMAT_VERSION)
    return {
      ok: false,
      reason: "version",
    };
  let r = validatePrecomputedPayload(n);
  return r === null
    ? {
        ok: false,
        reason: "parse_error",
      }
    : {
        ok: true,
        payload: r,
      };
}
//@ chunk-e6aww6q8.js:2454298-2454806 placement
/**
 * 以不跟随链接方式异步读取预计算压缩文件。
 */
async function readPrecomputedNoFollow(e) {
  if (isDiskless())
    return {
      ok: false,
      reason: "absent",
    };
  let noFollow = await openNoFollow_2(e);
  if (!noFollow.ok)
    return {
      ok: false,
      reason: "absent",
    };
  let r = noFollow.value;
  try {
    let stats = await r.stat();
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
    let h = Buffer.alloc(stats.size + 1);
    let y = 0;
    while (y < h.length) {
      let { bytesRead } = await r.read(h, y, h.length - y, y);
      if (bytesRead === 0) break;
      y += bytesRead;
    }
    return y > stats.size
      ? {
          ok: false,
          reason: "absent",
        }
      : parsePrecomputedPayload(h.toString("utf8", 0, y));
  } catch {
    return {
      ok: false,
      reason: "absent",
    };
  } finally {
    await r.close().catch(() => {});
  }
}
//@ chunk-e6aww6q8.js:2454806-2455245 placement
/**
 * 从会话存储（或磁盘）读取预计算压缩。
 */
async function readPrecomputedSidecar(e, n, r) {
  let s = n ?? getSessionSidecarDir(e);
  let h = join(s, PRECOMPACT_JSON);
  let y = pathToSessionSideKey(h);
  for (let S of [h, sidecarPrecompactPath(s)]) {
    let w;
    if (S === h && y !== undefined) {
      let L = await r
        .read([
          {
            key: y,
            offset: 0,
            length: MAX_PRECOMPACT_BYTES + 1,
          },
        ])
        .catch(() => {
          return;
        });
      let G = L?.ok ? L.value.items[0] : undefined;
      w =
        G === undefined || !G.found
          ? {
              ok: false,
              reason: "absent",
            }
          : G.totalBytes > MAX_PRECOMPACT_BYTES
            ? {
                ok: false,
                reason: "too_large",
              }
            : parsePrecomputedPayload(Buffer.from(G.value).toString("utf8"));
    } else w = await readPrecomputedNoFollow(S);
    if (w.ok || w.reason !== "absent") return w;
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
async function deletePrecomputed(e, n) {
  let r = precompactFilePath(e);
  let s = legacyPrecompactFilePath(e);
  let h = isStorageV5Enabled() && n !== undefined ? pathToSessionSideKey(r) : undefined;
  if (n !== undefined && h) await n.delete(h).catch(() => {});
  else if (!isDiskless()) await unlink(r).catch(() => {});
  if (isDiskless()) return;
  await unlink(s).catch(() => {});
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
var isString_2 = (e) => typeof e === "string";
var isMessageLike = (e) => typeof e === "object" && e !== null && "message" in e && "uuid" in e;
var isFiniteNumber_3 = (e) => typeof e === "number" && Number.isFinite(e);
//@ chunk-e6aww6q8.js:2455900-2456533 placement
/**
 * 校验预计算压缩载荷的全部字段。
 */
function validatePrecomputedPayload(e) {
  if (typeof e !== "object" || e === null) return null;
  let n = e;
  return isFiniteNumber_3(n.version) &&
    isString_2(n.sessionId) &&
    n.agentKey === "main" &&
    isString_2(n.model) &&
    isString_2(n.cliVersion) &&
    isString_2(n.createdAt) &&
    isString_2(n.precomputedAtUuid) &&
    isFiniteNumber_3(n.preCompactTokens) &&
    isFiniteNumber_3(n.readyDurationMs) &&
    (n.preCompactHookDisplay === undefined || isString_2(n.preCompactHookDisplay)) &&
    isString_2(n.summaryText) &&
    Array.isArray(n.summaryMessages) &&
    n.summaryMessages.length > 0 &&
    n.summaryMessages.every(isMessageLike) &&
    Array.isArray(n.preserveUuids) &&
    n.preserveUuids.every(isString_2) &&
    isFiniteNumber_3(n.attempt) &&
    isFiniteNumber_3(n.groupsPreserved) &&
    isFiniteNumber_3(n.totalGroups) &&
    isFiniteNumber_3(n.forkAssistantMessageCount) &&
    typeof n.totalUsage === "object" &&
    n.totalUsage !== null
    ? e
    : null;
}
//@ chunk-e6aww6q8.js:2456533-2456716 placement
/**
 * 预计算失败的原因描述。
 */
function describePrecomputeFailure(e, durationMs) {
  let cause = e.reason === "error" ? (e.isTimeout ? "timeout" : "api_error") : e.reason;
  return {
    reason: e.reason,
    cause,
    attempts: e.attempts,
    status: e.status,
    detail: e.detail,
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
function latchArmGate(precompute, agentId, r, querySource) {
  let h = agentIdOrDefault(agentId);
  let y = `${h}:${r}`;
  if (!precompute.latchArmGateEvent(y)) return false;
  logEvent("tengu_precomputed_compact_arm_gated", {
    reason: fromEnum(r),
    querySource,
  });
  logForDebugging(`precomputed compact: arm gated (${h}, ${r})`);
  return true;
}
//@ chunk-e6aww6q8.js:2456939-2457020 placement
/**
 * 给消息附上对应的 row uuid，失败时返回 undefined。
 */
function messagesWithRowUuids(e, n = logError) {
  try {
    return {
      messages: e,
      rowUuids: keptRowUuids(e),
    };
  } catch (error) {
    n(error);
    return;
  }
}
//@ chunk-e6aww6q8.js:2457020-2457191 placement
/**
 * 检查预计算摘要是否仍覆盖当前对话。
 */
function checkPrecomputeCoverage(ready, { sent, received }, s, autoCompactWindow) {
  return checkCompactBoundaryCoverage({
    coverage: ready.coverage,
    kept: ready.result.messagesToPreserve,
    sent,
    received,
    instructions: undefined,
    fit: getCompactThresholdSnapshot(ready, received.messages, s, autoCompactWindow),
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
async function prefetchPrecomputedSidecar(e, n, r, s) {
  if (
    !isStorageV5Enabled() ||
    s === undefined ||
    !isPrecomputedCompactEnabled() ||
    !isPrecomputeUsable() ||
    normalizeUuidOrNull(e) === null ||
    n.sessionId !== e ||
    r.hasAttemptedRehydrate(e)
  )
    return;
  let h;
  if (n.transcriptPath !== undefined) {
    if (!isUnderProjectsDir(n.transcriptPath)) return;
    h = join(dirname(resolve_2(n.transcriptPath)), e);
  }
  let y = await readPrecomputedSidecar(e, h, s).catch(() => ({
    ok: false,
    reason: "absent",
  }));
  if (!y.ok && y.reason === "absent") {
    r.dropSidecarReadAhead(e);
    return;
  }
  r.keepSidecarReadAhead(e, y);
  return () => {
    r.dropSidecarReadAhead(e);
  };
}
//@ chunk-e6aww6q8.js:2458826-2458980 placement
/**
 * 续接会话时的 onSessionResolved 钩子（预读预计算压缩）。
 */
function precomputeResumeHooks(precompute, storageV5, r) {
  if (!isStorageV5Enabled() || storageV5 === undefined || r?.forkSession === true) return {};
  let expectedSessionId = r?.expectedSessionId;
  return {
    onSessionResolved: (h) =>
      prefetchPrecomputedSidecar(expectedSessionId ?? h.sessionId, h, precompute, storageV5),
  };
}
//@ chunk-e6aww6q8.js:2458980-2459079 placement
/**
 * 路径是否位于项目目录之下（防止拿到项目外的转写）。
 */
function isUnderProjectsDir(transcriptPath) {
  let n = relative(getProjectsDir(), resolve_2(transcriptPath));
  return n !== "" && n !== ".." && !n.startsWith(`..${sep}`) && !isAbsolute(n);
}
//@ chunk-e6aww6q8.js:2459079-2461249 placement
/**
 * 读取持久化的预计算压缩，校验会话、时间戳、是否过旧或已压缩。
 */
function loadPrecomputedCompact(precompute, n, querySource, s, mainLoopModel, storageV5) {
  if (
    n !== "main" ||
    isCompactCommandSource(querySource) ||
    !isPrecomputeUsable() ||
    !isPrecomputedCompactEnabled()
  )
    return;
  let sessionId = getSessionId();
  if (precompute.hasAttemptedRehydrate(sessionId)) return;
  if (precompute.has(n)) return;
  precompute.markRehydrateAttempted(sessionId);
  let w =
    isStorageV5Enabled() && storageV5 !== undefined
      ? (precompute.takeSidecarReadAhead(sessionId) ?? {
          ok: false,
          reason: "absent",
        })
      : readPrecomputedFromDisk(sessionId);
  if (!w.ok) {
    if (w.reason !== "absent") rejectRehydrate(precompute, sessionId, w.reason, undefined, storageV5);
    return;
  }
  let { payload } = w;
  let max = Math.max(0, Date.now() - Date.parse(payload.createdAt));
  let q = (We, ze) =>
    rejectRehydrate(
      precompute,
      sessionId,
      We,
      {
        ...(Number.isFinite(max) && {
          ageMs: Math.round(max),
        }),
        cliVersionMatch: payload.cliVersion === CLI_VERSION_2,
        modelMatch: getCanonicalModelId(payload.model) === getCanonicalModelId(mainLoopModel),
        ...ze,
      },
      storageV5,
    );
  if (payload.sessionId !== sessionId) return q("session_mismatch");
  if (!Number.isFinite(max)) return q("bad_timestamp");
  if (max > PRECOMPUTE_MAX_AGE_MS) return q("too_old");
  let preservedMetadata = findPreservedMetadata(s, payload.precomputedAtUuid);
  if (preservedMetadata !== undefined)
    return q("already_compacted", {
      compactedByThisSummary: preservedMetadata.anchorUuid === payload.summaryMessages.at(-1)?.uuid,
    });
  let index = s.findIndex((We) => We.uuid === payload.precomputedAtUuid);
  if (index === -1) return q("boundary_missing");
  let ke = estimateTokensWithAnchor(s) - payload.preCompactTokens;
  if (ke < -(payload.preCompactTokens / 2)) return q("shrank_too_much");
  let we = new Map(s.map((We) => [We.uuid, We]));
  let messagesToPreserve = payload.preserveUuids.flatMap((preserveUuid) => {
    let ze = we.get(preserveUuid);
    return ze === undefined ? [] : [ze];
  });
  if (messagesToPreserve.length !== payload.preserveUuids.length)
    return q("preserve_uuid_missing", {
      preservedUuidCount: payload.preserveUuids.length,
      missingUuidCount: payload.preserveUuids.length - messagesToPreserve.length,
    });
  let Ae = new Set(payload.preserveUuids);
  let index_2 = s.findIndex((We) => Ae.has(We.uuid));
  let Me = messagesWithRowUuids(
    index_2 === -1
      ? s.slice(0, index + 1)
      : s.filter((We, ze) => ze < index_2 || ze === index || Ae.has(We.uuid)),
  );
  if (Me === undefined) return q("rows_unreadable");
  precompute.put(n, {
    status: "ready",
    result: toCompactionResult(payload, messagesToPreserve),
    coverage: createCompactSeenState(Me, payload.precomputedAtUuid),
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
    growthTokens: ke,
    summaryBytes: Buffer.byteLength(payload.summaryText, "utf8"),
    modelMatch: getCanonicalModelId(payload.model) === getCanonicalModelId(mainLoopModel),
    cliVersionMatch: payload.cliVersion === CLI_VERSION_2,
  });
  logForDebugging(`precomputed compact: rehydrated (${n}, age ${Math.round(max)}ms, growth ~${ke} tok)`);
}
//@ chunk-e6aww6q8.js:2461249-2461431 placement
/**
 * 找包含某 uuid 的最近压缩边界的保留信息。
 */
function findPreservedMetadata(e, precomputedAtUuid) {
  let preservedMessages = e.findLast((s) => s.type === "system" && s.subtype === "compact_boundary")
    ?.compactMetadata?.preservedMessages;
  return (preservedMessages?.allUuids ?? preservedMessages?.uuids ?? []).includes(precomputedAtUuid)
    ? preservedMessages
    : undefined;
}
//@ chunk-e6aww6q8.js:2461431-2461611 placement
/**
 * 拒绝恢复预计算压缩：删除文件并记录原因。
 */
function rejectRehydrate(e, sessionId, r, s, h) {
  e.enqueueSidecarIo(() => deletePrecomputed(sessionId, h), logError);
  logEvent("tengu_precomputed_compact_rehydrate_rejected", {
    reason: fromEnum(r),
    ...s,
  });
  logForDebugging(`precomputed compact: rehydrate rejected (${r})`);
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
  let mapped = ready.result.messagesToPreserve.filter(isLoggableMessage).map((G) => G.uuid);
  let L = await writePrecomputedCompact(
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
    ok: L.ok,
    bytes: L.bytes,
    ...(L.ok === false && {
      reason: fromEnum(L.reason),
    }),
    preservedMessageCount: ready.result.messagesToPreserve.length,
    preservedUuidCount: mapped.length,
    querySource,
  });
  logForDebugging(
    `precomputed compact: persisted (${L.ok ? `${L.bytes} bytes` : `${L.reason}${L.detail === undefined ? "" : `: ${L.detail}`}`})`,
  );
}
//@ chunk-e6aww6q8.js:2462633-2462763 placement
/**
 * 删除本会话已就绪的预计算文件。
 */
function deleteReadySidecar(e, n, r) {
  let sidecarSessionId = n?.status === "ready" ? n.sidecarSessionId : undefined;
  if (sidecarSessionId !== undefined && sidecarSessionId === getSessionId())
    e.enqueueSidecarIo(() => deletePrecomputed(sidecarSessionId, r), logError);
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
function shouldArmPrecompute(e) {
  if (e.autocompactRan) return false;
  if (e.isPreFirstCompactFork) return false;
  if (e.hasAttemptedReactiveCompact) return false;
  if (e.lastTransitionReason === "precomputed_compact_swap") return false;
  if (!isPrecomputedCompactEnabled()) return false;
  return isAtPrecomputeThreshold(
    e.contextTokens,
    e.facts,
    e.autoCompactWindow,
    e.querySource,
    e.messagesCounted ? stripInProgressAssistantMessage(e.messagesCounted) : 0,
  );
}
//@ chunk-e6aww6q8.js:2463174-2468415 placement
/**
 * 在合适时机（空闲、估算超过阈值）启动预计算压缩，SDK 单提示模式下受闸门限制。
 */
function armPrecomputedCompact(e) {
  let { querySource, messages, cacheSafeParams, facts, armTrigger = "estimate", estimateGapTokens } = e;
  let { toolUseContext } = cacheSafeParams;
  let precompute = toolUseContext.session.precompute;
  let G = agentIdOrDefault(toolUseContext.agentId);
  let q = armTrigger === "idle";
  if (!q && !isPrecomputedCompactEnabled()) return false;
  if (isCompactCommandSource(querySource)) return false;
  loadPrecomputedCompact(
    precompute,
    G,
    querySource,
    messages,
    toolUseContext.options.mainLoopModel,
    toolUseContext.storageV5,
  );
  if (precompute.consecutiveCountedFailures(G) >= MAX_COUNTED_FAILURES) return false;
  let Z = precompute.get(G);
  if (Z !== undefined && Z.status !== "failed") return false;
  let uuid = messages.at(-1)?.uuid;
  if (uuid === undefined) return false;
  let lastHumanPromptUuid = findLastHumanPromptUuid(messages);
  if (precompute.isVetoedUnder(G, lastHumanPromptUuid)) return false;
  let promptScan = querySource === "sdk" ? e.promptScan : undefined;
  if (promptScan !== undefined) {
    let { userPromptCount, historyRewritten } = promptScan;
    let Zt = userPromptCount <= 1 && !historyRewritten ? "sdk_single_prompt_gate" : undefined;
    if (Zt !== undefined) {
      let rn = `${G}:${Zt}`;
      if (precompute.latchArmGateEvent(rn)) {
        logEvent("tengu_precomputed_compact_arm_gated", {
          reason: fromEnum(Zt),
          querySource: lit_2("sdk"),
          userPromptCount,
          preCompactTokens: estimateTokensWithAnchor(messages),
        });
        logForDebugging(`precomputed compact: arm gated (${G}, ${Zt}, userPrompts ${userPromptCount})`);
      }
      return false;
    }
  }
  let Ee = messagesWithRowUuids(messages, (Yt) => {
    if (
      latchArmGate(precompute, toolUseContext.agentId, "rows_unreadable", agentTypeForTelemetry(querySource))
    )
      logError(Yt);
  });
  if (Ee === undefined) return false;
  let abortController = new AbortController();
  let startTime = performance.now();
  let uuid_2 = messages.findLast(isLoggableMessage)?.uuid;
  let model = toolUseContext.options.mainLoopModel;
  let sessionId = getSessionId();
  let lt = precompactFilePath(sessionId);
  let Je = estimateTokensWithAnchor(messages);
  let toolUseContext_2 = contextForPrecompute(toolUseContext, abortController);
  let pt = {
    ...cacheSafeParams,
    toolUseContext: toolUseContext_2,
  };
  let querySource_2 = agentTypeForTelemetry(querySource);
  let yt = precompute.nextAttemptNumber(G);
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
    preCompactTokens: Je,
    messageCount: messages.length,
    querySource: querySource_2,
    precomputeAttemptNumber: yt,
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
    `precomputed compact: started (${G}, ${messages.length} msgs, ~${Je} tok, attempt ${yt}, trigger ${armTrigger})`,
  );
  let settled = (async () => {
    let Yt;
    let preCompactHookDisplay;
    let Zt = (error) => ({
      ok: false,
      reason: "error",
      attempts: 0,
      totalGroups: 0,
      detail: errorMessage(error),
      errorKind: "thrown",
      status: undefined,
      isTimeout: false,
    });
    let rn = await dispatchSessionCompactHooks({
      trigger: "precompute",
      instructions: undefined,
      messages,
      agentId: toolUseContext.agentId,
      isIsolated:
        isDelegatedObservationContext(toolUseContext.agentContext) ||
        toolUseContext.options.settingsHooksOff === true,
      origin: toolUseContext.hookOrigin,
      signal: abortController.signal,
      compact: async (yn, Kn) => {
        let Xn = await executePreCompactHooks(
          toolUseContext.session,
          {
            trigger: "auto",
            customInstructions: Kn ?? null,
          },
          toolUseContext,
          abortController.signal,
        ).catch((error) => {
          logError(error);
          return {};
        });
        if (Xn.blockedBy) {
          logForDebugging(`Precomputed compact blocked by PreCompact hook: ${Xn.blockedBy}`);
          return {
            skip: `${COMPACTION_BLOCKED_BY_HOOK}: ${Xn.blockedBy}`,
          };
        }
        if (abortController.signal.aborted)
          return {
            skip: "aborted before the summary ran",
          };
        preCompactHookDisplay = Xn.userDisplayMessage;
        Yt = await runReactiveCompact(yn, pt, {
          customInstructions: mergeHookInstructions(Kn, Xn.newCustomInstructions),
          allowFallback: false,
        }).catch(Zt);
        if (!Yt.ok) throw new PrecomputedCompactNotReadyError();
        return {
          messages: [...Yt.result.summaryMessages, ...Yt.result.messagesToPreserve],
          tokensBefore: Je,
          usage: getTokenCountFromUsage_3(Yt.result.totalUsage),
          record: Yt.result,
        };
      },
    }).catch((error) => {
      if (Yt?.ok !== false) Yt = Zt(error);
      return;
    });
    if (rn?.kind === "skipped") {
      logForDebugging(`precomputed compact: skipped (${G}, ${rn.reason}); nothing kept`);
      if (!abortController.signal.aborted) precompute.recordVeto(G, lastHumanPromptUuid);
      updatePendingEntry(precompute, G, abortController, null);
      return;
    }
    if (rn?.kind === "replaced") {
      let rounded = Math.round(performance.now() - startTime);
      logForDebugging(
        `precomputed compact: ready with a hook's ${rn.messages.length} messages (${G}, ${rounded}ms)`,
      );
      updatePendingEntry(precompute, G, abortController, (Kn) => ({
        ...Kn,
        status: "ready",
        result: emptyCompactionResult(rn.messages),
        replacement: true,
        readyDurationMs: rounded,
        preCompactHookDisplay,
      }));
      return;
    }
    Yt ??= Zt(Error("the summary never ran"));
    let rounded = Math.round(performance.now() - startTime);
    logForDebugging(`precomputed compact: ${Yt.ok ? "ready" : `failed (${Yt.reason})`} (${G}, ${rounded}ms)`);
    if (!Yt.ok) {
      let yn = unwrapAbortReason(abortController.signal.reason);
      let Kn = Yt.reason === "aborted" ? PRECOMPUTE_DISCARD_REASONS.find((fo) => fo === yn) : undefined;
      let Xn = describePrecomputeFailure(Yt, rounded);
      logEvent("tengu_precomputed_compact_failed", {
        reason: fromEnum(Yt.reason),
        cause: fromEnum(Xn.cause),
        status: Xn.status,
        durationMs: rounded,
        querySource: querySource_2,
        preCompactTokens: Je,
        precomputeAttemptNumber: yt,
        armTrigger: fromEnum(armTrigger),
        ...(Kn !== undefined && {
          clearReason: fromEnum(Kn),
        }),
      });
      if (!q)
        if (Yt.reason === "aborted") logFeatureSad("compact_precomputed", "compact_precomputed_aborted");
        else logFeatureBad("compact_precomputed", `compact_precomputed_${Yt.reason}`);
      if (Yt.reason !== "aborted" && Xn.cause !== "too_few_groups" && !q && !abortController.signal.aborted) {
        let fo = precompute.recordCountedFailure(G);
        if (fo === MAX_COUNTED_FAILURES) {
          logEvent("tengu_precomputed_compact_rearm_capped", {
            cause: fromEnum(Xn.cause),
            status: Xn.status,
            querySource: querySource_2,
            preCompactTokens: Je,
            precomputeAttemptNumber: yt,
          });
          logForDebugging(
            `precomputed compact: re-arm capped (${G}, ${fo} consecutive ${Xn.cause} failures)`,
          );
        }
      }
      updatePendingEntry(precompute, G, abortController, (fo) => ({
        ...fo,
        status: "failed",
        failure: Xn,
      }));
      return;
    }
    logEvent("tengu_precomputed_compact_ready", {
      durationMs: rounded,
      attempts: Yt.result.attempt,
      groupsPreserved: Yt.result.groupsPreserved,
      totalGroups: Yt.result.totalGroups,
      querySource: querySource_2,
      preCompactTokens: Je,
      precomputeAttemptNumber: yt,
      armTrigger: fromEnum(armTrigger),
    });
    if (!q) logFeatureOk("compact_precomputed");
    if (!q && !abortController.signal.aborted) precompute.clearCountedFailures(G);
    let no = G === "main" && !q && isPrecomputeUsable() ? sessionId : undefined;
    let result = Yt.result;
    updatePendingEntry(precompute, G, abortController, (yn) => ({
      ...yn,
      status: "ready",
      result,
      readyDurationMs: rounded,
      preCompactHookDisplay,
      ...(no !== undefined && {
        sidecarSessionId: no,
      }),
    }));
    let ho = precompute.get(G);
    if (
      no !== undefined &&
      uuid_2 !== undefined &&
      ho?.status === "ready" &&
      ho.abortController === abortController
    ) {
      let sidecarPath = sessionId === getSessionId() ? precompactFilePath(sessionId) : lt;
      precompute.enqueueSidecarIo(
        () =>
          persistPrecomputedCompact({
            sessionId: no,
            sidecarPath,
            ready: ho,
            lastLoggableUuid: uuid_2,
            model,
            querySource: querySource_2,
            storageV5: toolUseContext.storageV5,
          }),
        logError,
      );
    }
  })();
  let It = {
    status: "pending",
    coverage: createCompactSeenState(Ee, uuid),
    preCompactTokens: Je,
    model,
    startedAt: startTime,
    abortController,
    preCompactHookDisplay: undefined,
    settled,
    ...(armTrigger === "idle" && {
      armTrigger,
    }),
  };
  precompute.put(G, It);
  return true;
}
//@ chunk-e6aww6q8.js:2468415-2468948 placement = manuallyExtractSessionMemory (0.307)
/**
 * 手动触发会话记忆/预计算压缩：等待 precompute 结果就绪，返回压缩前 token 数，未就绪抛 PrecomputedCompactNotReadyError。
 */
async function manuallyExtractSessionMemory(messages, toolUseContext) {
  let { toolUseContext: toolUseContext_2 } = toolUseContext;
  let { agentId, session } = toolUseContext_2;
  let S = armPrecomputedCompact({
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
  if (S === undefined) return null;
  await S.settled;
  if (S.abortController.signal.aborted) throw new AbortError_2();
  let precomputeEntry = getPrecomputeEntry(session.precompute, agentId);
  if (precomputeEntry?.abortController !== S.abortController) return null;
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
function updatePendingEntry(precompute, n, abortController, s) {
  let h = precompute.get(n);
  if (h?.status !== "pending" || h.abortController !== abortController) return;
  if (s === null) {
    precompute.remove(n);
    return;
  }
  precompute.put(n, s(h));
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
  let s = precompute.get(borrowFrom);
  if (s === undefined || signal.aborted) return null;
  let statusAtPTL = s.status;
  if (s.status === "pending") {
    logForDebugging(`precomputed compact: awaiting borrowed in-flight (${borrowFrom})`);
    if (
      await Promise.race([
        s.settled.then(() => false),
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
  let y = precompute.get(borrowFrom);
  logForDebugging(`precomputed compact: borrowed (${borrowFrom}, ${y?.status ?? "gone"})`);
  return y?.status === "ready"
    ? {
        kind: "ready",
        ready: y,
        statusAtPTL,
      }
    : null;
}
//@ chunk-e6aww6q8.js:2469992-2470695 placement
async function awaitInflightPrecompute(precompute, n, signal, storageV5) {
  let h = agentIdOrDefault(n);
  let y = precompute.get(h);
  if (y === undefined || signal.aborted) return null;
  let statusAtPTL = y.status;
  if (y.status === "pending") {
    logForDebugging(`precomputed compact: awaiting in-flight (${h})`);
    if (
      await Promise.race([
        y.settled.then(() => false),
        new Promise((resolve) => {
          signal.addEventListener("abort", () => resolve(true), {
            once: true,
          });
        }),
      ])
    ) {
      logForDebugging(`precomputed compact: turn aborted while awaiting (${h}) \u2014 leaving entry`);
      return {
        kind: "turn_aborted",
        statusAtPTL,
      };
    }
  }
  let w = precompute.get(h);
  switch (
    (precompute.remove(h),
    deleteReadySidecar(precompute, w, storageV5),
    logForDebugging(`precomputed compact: consumed (${h}, ${w?.status ?? "gone"})`),
    w?.status)
  ) {
    case "ready":
      return {
        kind: "ready",
        ready: w,
        statusAtPTL,
      };
    case "failed":
      return {
        kind: "failed",
        failure: w.failure,
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
async function applyPrecomputedCompact(e) {
  let { toolUseContext, messages, detectedAt, borrowFrom, querySource } = e;
  let precompute = toolUseContext.session.precompute;
  let querySource_2 = agentTypeForTelemetry(querySource);
  let L = (ze, emittedEarlyCompactStart) => {
    let rounded = Math.round(performance.now() - detectedAt);
    consumePrecomputedCompact(ze, querySource_2, rounded, e.trigger);
    return {
      outcome: ze,
      swap: ze.kind === "applied" ? ze.swap : undefined,
      emittedEarlyCompactStart,
    };
  };
  let G =
    !isCompactCommandSource(querySource) &&
    (e.trigger === "idle" ||
      (isPrecomputedCompactEnabled() &&
        (e.trigger === "threshold" || (e.isWithheld413 === true && !e.hasAttemptedReactiveCompact))));
  if (G)
    loadPrecomputedCompact(
      precompute,
      agentIdOrDefault(toolUseContext.agentId),
      querySource,
      messages,
      toolUseContext.options.mainLoopModel,
      toolUseContext.storageV5,
    );
  if (e.trigger === "idle") {
    let precomputeEntry = getPrecomputeEntry(precompute, toolUseContext.agentId);
    let lt = getMainThreadCacheExpiresAt() ?? 1 / 0;
    if (precomputeEntry?.status !== "ready" || Date.now() < lt)
      discardPrecompute(
        precompute,
        toolUseContext.agentId,
        "returned_early",
        querySource,
        toolUseContext.storageV5,
      );
  }
  if (!G || (e.trigger !== "ptl" && getPrecomputeEntry(precompute, toolUseContext.agentId) === undefined))
    return {
      outcome: {
        kind: "none",
      },
      swap: undefined,
      emittedEarlyCompactStart: false,
    };
  let signal = toolUseContext.abortController.signal;
  let Z =
    (borrowFrom !== undefined
      ? precompute.get(borrowFrom)
      : getPrecomputeEntry(precompute, toolUseContext.agentId)
    )?.status === "pending";
  if (Z) {
    toolUseContext.onCompactEvent?.({
      type: "stream_mode",
      mode: "requesting",
    });
    e.onResponseLength?.({
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
  let Se = null;
  let ke = false;
  let we = Z ? startCompactingStatusTicker(toolUseContext.onCompactEvent) : undefined;
  try {
    if (borrowFrom !== undefined) {
      Se = await borrowPrecompute(precompute, borrowFrom, signal);
      ke = Se !== null;
    }
    Se ??= await awaitInflightPrecompute(
      precompute,
      toolUseContext.agentId,
      signal,
      toolUseContext.storageV5,
    );
  } finally {
    we?.();
  }
  if (Se === null)
    return L(
      {
        kind: "none",
      },
      Z,
    );
  if (Se.kind === "turn_aborted")
    return L(
      {
        kind: "aborted",
      },
      Z,
    );
  if (Se.kind === "failed")
    return L(
      {
        kind: "failed",
        failure: Se.failure,
        statusAtPTL: Se.statusAtPTL,
      },
      Z,
    );
  let { ready } = Se;
  let Ae = (reason, lt) => {
    if (ke) {
      logEvent("tengu_precompute_borrow_boundary_miss", {
        querySource: querySource_2,
        reason: fromEnum(reason),
        ...lt,
      });
      logForDebugging(`precomputed compact: borrow refused (${reason})`);
      return;
    }
    logPrecomputeDiscarded(ready, reason, querySource, lt);
  };
  let Ie = messagesWithRowUuids(messages);
  let Me =
    Ie === undefined
      ? {
          kind: "refuse",
          reason: "rows_unreadable",
        }
      : checkPrecomputeCoverage(
          ready,
          {
            sent: Ie,
            received: Ie,
          },
          e.sizingModel,
          toolUseContext.options.autoCompactWindow,
        );
  if (Me.kind === "refuse") {
    Ae(Me.reason, Me.reason === "would_not_fit" ? Me.sizes : undefined);
    return L(
      {
        kind: "none",
      },
      Z,
    );
  }
  let statusAtPTL = Se.statusAtPTL === "pending" ? "pending" : "ready";
  return L(
    {
      kind: "applied",
      swap: {
        compactResult: ready.result,
        coverage: ready.coverage,
        reportRefused: Ae,
        replacement: ready.replacement === true,
        preCompactHookDisplay: ready.preCompactHookDisplay,
        statusAtPTL,
        leadMs: detectedAt - ready.startedAt,
        totalMs: ready.readyDurationMs,
        borrowed: ke,
        rehydrated: ready.rehydrated === true,
        ...(ready.armTrigger === "idle" && {
          armTrigger: "idle",
        }),
        drift: precomputeDrift(ready, {
          messages,
          mainLoopModel: toolUseContext.options.mainLoopModel,
        }),
        sizes: Me.sizes,
      },
    },
    Z,
  );
}
//@ chunk-e6aww6q8.js:2473037-2473606 placement
/**
 * 消费预计算的压缩结果并记录遥测。
 */
function consumePrecomputedCompact(e, querySource, waitedMs, trigger) {
  let h = e.kind === "applied" ? e.swap.statusAtPTL : e.kind === "failed" ? e.statusAtPTL : undefined;
  logEvent("tengu_precomputed_compact_consumed", {
    kind: fromEnum(e.kind),
    querySource,
    waitedMs,
    statusAtPTL: fromEnumOpt(h),
    trigger: fromEnum(trigger),
    ...(e.kind === "applied" && {
      borrowed: e.swap.borrowed,
      rehydrated: e.swap.rehydrated,
      ...e.swap.drift,
      precomputeTotalMs: Math.round(e.swap.totalMs),
      ...e.swap.sizes,
    }),
    ...(e.kind === "failed" && {
      failureReason: fromEnum(e.failure.reason),
      failureCause: fromEnum(e.failure.cause),
      failureStatus: e.failure.status,
      failureAttempts: e.failure.attempts,
      failureDurationMs: e.failure.durationMs,
    }),
  });
}
//@ chunk-e6aww6q8.js:2473606-2473999 placement
/**
 * 记录手动 /compact 使用预计算结果的情况（含失败原因）。
 */
function logManualPrecomputeConsumed(e, n, r) {
  if (!isPrecomputedCompactEnabled()) return;
  logEvent("tengu_precomputed_compact_consumed", {
    kind: fromEnum(e),
    trigger: lit_2("manual"),
    waitedMs: Math.round(r),
    statusAtPTL: fromEnumOpt(e === "failed" ? n?.statusAtPTL : undefined),
    ...(e === "failed" &&
      n?.kind === "failed" && {
        failureReason: fromEnum(n.failure.reason),
        failureCause: fromEnum(n.failure.cause),
        failureStatus: n.failure.status,
        failureAttempts: n.failure.attempts,
        failureDurationMs: n.failure.durationMs,
      }),
  });
}
//@ chunk-e6aww6q8.js:2473999-2474337 placement
/**
 * 记录手动 /compact 应用了预计算结果。
 */
function logManualPrecomputeApplied(e, n, r, sizes) {
  if (!isPrecomputedCompactEnabled()) return;
  logEvent("tengu_precomputed_compact_consumed", {
    kind: lit_2("applied"),
    trigger: lit_2("manual"),
    waitedMs: Math.round(n),
    statusAtPTL: fromEnum(e.statusAtPTL),
    borrowed: false,
    rehydrated: e.ready.rehydrated === true,
    ...(e.ready.armTrigger === "idle" && {
      armTrigger: lit_2("idle"),
    }),
    ...precomputeDrift(e.ready, r),
    precomputeTotalMs: e.ready.readyDurationMs,
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
function logPrecomputeDiscarded(ready, n, r, s) {
  logEvent("tengu_precomputed_compact_discarded", {
    reason: fromEnum(n),
    ageMs: Math.round(performance.now() - ready.startedAt),
    readyDurationMs: ready.readyDurationMs,
    rehydrated: ready.rehydrated === true,
    ...(ready.armTrigger === "idle" && {
      armTrigger: lit_2("idle"),
    }),
    preCompactTokens: ready.preCompactTokens,
    ...s,
    ...(r !== undefined && {
      querySource: agentTypeForTelemetry(r),
    }),
  });
  logForDebugging(
    `precomputed compact: discarded (${n}, age ${Math.round(performance.now() - ready.startedAt)}ms${s === undefined ? "" : `, ~${s.postSwapTokens} tok against ${s.thresholdTokens}`})`,
  );
}
//@ chunk-e6aww6q8.js:2475162-2475490 placement
/**
 * 丢弃某代理的预计算：中止进行中的任务、删除侧车文件、记录原因。
 */
function discardPrecompute(precompute, agentId, r, querySource, storageV5) {
  let y = agentIdOrDefault(agentId);
  let S = precompute.get(y);
  if (S?.status === "ready") logPrecomputeDiscarded(S, r, querySource);
  S?.abortController.abort(new DOMException(r, "AbortError"));
  precompute.remove(y);
  deleteReadySidecar(precompute, S, storageV5);
  let w = y === "main" ? getSessionId() : undefined;
  if (w !== undefined && precompute.hasAttemptedRehydrate(w) && isPrecomputeUsable())
    precompute.enqueueSidecarIo(() => deletePrecomputed(w, storageV5), logError);
  if (r === "subagent_exit") precompute.forgetSubagentTelemetry(y);
}
//@ chunk-e6aww6q8.js:2475490-2475667 placement
/**
 * 切换模型时中止进行中的主线程预计算。
 */
function abortPrecomputeOnModelSwitch(precompute) {
  let n = agentIdOrDefault(undefined);
  let r = precompute.get(n);
  if (r === undefined || r.status === "ready") return;
  let s = "model_switch";
  r.abortController.abort(new DOMException(s, "AbortError"));
  precompute.remove(n);
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
