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
import {
  join,
  join as join_2,
  join as join_3,
  join as join_4,
  join as join_5,
  join as join_6,
  join as join_7,
  join as join_8,
  join as join_9,
  join as join_10,
  join as join_11,
  join as join_12,
  join as join_13,
  join as join_14,
  join as join_15,
  join as join_16,
  join as join_17,
  join as join_18,
  join as join_19,
  join as join_20,
  join as join_21,
  join as join_22,
  join as join_23,
  join as join_24,
  join as join_25,
  join as join_26,
  join as join_27,
  join as join_28,
  join as join_29,
  join as join_30,
  join as join_31,
  join as join_32,
  join as join_33,
  join as join_34,
  join as join_35,
  join as join_36,
  join as join_37,
  join as join_38,
  join as join_40,
  join as join_41,
  join as join_42,
  join as join_43,
  join as join_44,
  join as join_45,
  join as join_46,
  join as join_47,
  join as join_48,
  join as join_49,
  join as join_50,
  join as join_51,
  join as join_52,
  join as join_53,
  join as join_54,
  join as join_55,
  join as join_56,
  join as join_57,
  join as join_58,
  join as join_59,
  join as join_60,
  join as join_61,
  join as join_62,
  join as join_63,
  join as join_64,
  join as join_65,
  join as join_66,
  join as join_67,
  join as join_68,
  join as join_69,
  join as join_70,
  join as join_71,
  join as join_72,
  join as join_73,
  join as join_74,
  join as join_75,
  join as join_76,
  join as join_77,
  join as join_78,
  join as join_79,
  join as join_80,
  join as join_81,
  join as join_82,
  join as join_84,
  join as join_85,
  join as join_86,
  join as join_87,
  join as join_88,
  join as join_89,
  join as join_90,
  join as join_91,
  join as join_92,
  join as join_93,
  join as join_94,
  join as join_95,
  join as join_96,
  join as join_97,
  join as join_98,
  join as join_99,
  join as join_100,
  join as join_101,
  join as join_102,
  join as join_103,
  join as join_104,
  join as join_105,
  join as join_106,
  join as join_107,
  join as join_108,
  join as join_109,
  join as join_110,
  join as join_111,
  join as join_112,
  join as join_113,
  join as join_114,
  join as join_115,
  join as join_116,
  join as join_117,
  join as join_118,
  join as join_119,
  join as join_120,
  join as join_121,
  join as join_122,
  join as join_123,
  join as join_124,
  join as join_125,
  join as join_126,
  join as join_127,
  join as join_128,
  join as join_129,
  dirname,
  dirname as dirname_2,
  dirname as dirname_3,
  dirname as dirname_4,
  dirname as dirname_5,
  dirname as dirname_6,
  dirname as dirname_7,
  dirname as dirname_8,
  dirname as dirname_9,
  dirname as dirname_10,
  dirname as dirname_11,
  dirname as dirname_12,
  dirname as dirname_13,
  dirname as dirname_14,
  dirname as dirname_15,
  dirname as dirname_16,
  dirname as dirname_17,
  dirname as dirname_18,
  dirname as dirname_19,
  dirname as dirname_20,
  dirname as dirname_21,
  dirname as dirname_22,
  dirname as dirname_23,
  dirname as dirname_24,
  dirname as dirname_25,
  dirname as dirname_26,
  dirname as dirname_27,
  dirname as dirname_28,
  dirname as dirname_29,
  dirname as dirname_30,
  dirname as dirname_31,
  dirname as dirname_32,
  dirname as dirname_33,
  dirname as dirname_34,
  dirname as dirname_35,
  dirname as dirname_36,
  dirname as dirname_37,
  dirname as dirname_38,
  dirname as dirname_39,
  dirname as dirname_40,
  dirname as dirname_41,
  dirname as dirname_42,
  dirname as dirname_43,
  dirname as dirname_44,
  dirname as dirname_45,
  dirname as dirname_46,
  dirname as dirname_47,
  dirname as dirname_48,
  dirname as dirname_49,
  dirname as dirname_50,
  dirname as dirname_51,
  dirname as dirname_52,
  dirname as dirname_53,
  dirname as dirname_54,
  dirname as dirname_55,
  dirname as dirname_56,
  dirname as dirname_57,
  dirname as dirname_58,
  dirname as dirname_59,
  dirname as dirname_60,
  dirname as dirname_61,
  dirname as dirname_62,
  dirname as dirname_63,
  dirname as dirname_64,
  dirname as dirname_65,
  dirname as dirname_66,
  dirname as dirname_67,
  dirname as dirname_68,
  dirname as dirname_69,
  dirname as dirname_70,
  dirname as dirname_71,
  dirname as dirname_72,
  dirname as dirname_73,
  dirname as dirname_74,
  dirname as dirname_75,
  dirname as dirname_76,
  dirname as dirname_77,
  resolve as resolve_2,
  resolve as resolve_3,
  resolve as resolve_4,
  resolve as resolve_5,
  resolve as resolve_6,
  resolve as resolve_7,
  resolve as resolve_8,
  resolve as resolve_9,
  resolve as resolve_10,
  resolve as resolve_11,
  resolve as resolve_12,
  resolve as resolve_13,
  resolve as resolve_14,
  resolve as resolve_15,
  resolve as resolve_16,
  resolve as resolve_17,
  resolve as resolve_18,
  resolve as resolve_19,
  resolve as resolve_20,
  resolve as resolve_21,
  resolve as resolve_22,
  resolve as resolve_23,
  resolve as resolve_24,
  resolve as resolve_25,
  resolve as resolve_26,
  resolve as resolve_27,
  resolve as resolve_28,
  resolve as resolve_29,
  resolve as resolve_30,
  resolve as resolve_31,
  resolve as resolve_32,
  resolve as resolve_33,
  resolve as resolve_34,
  resolve as resolve_35,
  resolve as resolve_36,
  resolve as resolve_37,
  resolve as resolve_38,
  resolve as resolve_39,
  resolve as resolve_40,
  resolve as resolve_41,
  resolve as resolve_42,
  resolve as resolve_43,
  resolve as resolve_44,
  resolve as resolve_45,
  resolve as resolve_46,
  resolve as resolve_47,
  resolve as resolve_48,
  resolve as resolve_49,
  resolve as resolve_50,
  resolve as resolve_51,
  resolve as resolve_52,
  resolve as resolve_53,
  resolve as resolve_54,
  resolve as resolve_55,
  resolve as resolve_56,
  resolve as resolve_57,
  resolve as resolve_58,
  resolve as resolve_59,
  resolve as resolve_60,
  relative,
  relative as relative_2,
  relative as relative_3,
  relative as relative_4,
  relative as relative_5,
  relative as relative_6,
  relative as relative_7,
  relative as relative_8,
  relative as relative_9,
  relative as relative_10,
  relative as relative_11,
  relative as relative_12,
  relative as relative_13,
  relative as relative_14,
  relative as relative_15,
  relative as relative_16,
  relative as relative_17,
  relative as relative_18,
  relative as relative_19,
  relative as relative_20,
  relative as relative_21,
  relative as relative_22,
  relative as relative_23,
  relative as relative_24,
  relative as relative_25,
  relative as relative_26,
  relative as relative_27,
  relative as relative_28,
  relative as relative_29,
  relative as relative_30,
  relative as relative_31,
  relative as relative_32,
  relative as relative_33,
  relative as relative_34,
  relative as relative_35,
  relative as relative_36,
  relative as relative_37,
  relative as relative_38,
  relative as relative_39,
  relative as relative_40,
  relative as relative_41,
  relative as relative_42,
  relative as relative_43,
  relative as relative_44,
  relative as relative_45,
  relative as relative_46,
  relative as relative_47,
  relative as relative_48,
  sep,
  sep as sep_2,
  sep as sep_3,
  sep as sep_4,
  sep as sep_5,
  sep as sep_6,
  sep as sep_7,
  sep as sep_8,
  sep as sep_9,
  sep as sep_10,
  sep as sep_11,
  sep as sep_12,
  sep as sep_13,
  sep as sep_14,
  sep as sep_15,
  sep as sep_16,
  sep as sep_17,
  sep as sep_18,
  sep as sep_19,
  sep as sep_20,
  sep as sep_21,
  sep as sep_22,
  sep as sep_23,
  sep as sep_24,
  sep as sep_25,
  sep as sep_26,
  sep as sep_27,
  sep as sep_28,
  sep as sep_29,
  sep as sep_30,
  sep as sep_31,
  sep as sep_32,
  sep as sep_33,
  sep as sep_34,
  sep as sep_35,
  sep as sep_36,
  sep as sep_37,
  sep as sep_38,
  sep as sep_39,
  sep as sep_40,
  sep as sep_41,
  sep as sep_42,
  sep as sep_43,
  sep as sep_44,
  sep as sep_45,
  sep as sep_46,
  sep as sep_47,
  sep as sep_48,
  sep as sep_49,
  sep as sep_50,
  sep as sep_51,
  sep as sep_52,
  sep as sep_53,
  sep as sep_54,
  sep as sep_55,
  sep as sep_56,
  sep as sep_57,
  sep as sep_58,
  sep as sep_59,
  sep as sep_60,
  sep as sep_61,
  sep as sep_62,
  sep as sep_63,
  sep as sep_64,
  sep as sep_65,
  sep as sep_66,
  sep as sep_67,
  sep as sep_68,
  sep as sep_69,
  sep as sep_70,
  sep as sep_71,
  sep as sep_72,
  sep as sep_73,
  isAbsolute,
  isAbsolute as isAbsolute_2,
  isAbsolute as isAbsolute_3,
  isAbsolute as isAbsolute_4,
  isAbsolute as isAbsolute_5,
  isAbsolute as isAbsolute_6,
  isAbsolute as isAbsolute_7,
  isAbsolute as isAbsolute_8,
  isAbsolute as isAbsolute_9,
  isAbsolute as isAbsolute_10,
  isAbsolute as isAbsolute_11,
  isAbsolute as isAbsolute_12,
  isAbsolute as isAbsolute_13,
  isAbsolute as isAbsolute_14,
  isAbsolute as isAbsolute_15,
  isAbsolute as isAbsolute_16,
  isAbsolute as isAbsolute_17,
  isAbsolute as isAbsolute_18,
  isAbsolute as isAbsolute_19,
  isAbsolute as isAbsolute_20,
  isAbsolute as isAbsolute_21,
  isAbsolute as isAbsolute_22,
  isAbsolute as isAbsolute_23,
  isAbsolute as isAbsolute_24,
  isAbsolute as isAbsolute_25,
  isAbsolute as isAbsolute_26,
  isAbsolute as isAbsolute_27,
  isAbsolute as isAbsolute_28,
  isAbsolute as isAbsolute_29,
  isAbsolute as isAbsolute_30,
  isAbsolute as isAbsolute_31,
  isAbsolute as isAbsolute_32,
  isAbsolute as isAbsolute_33,
  isAbsolute as isAbsolute_34,
  isAbsolute as isAbsolute_35,
  isAbsolute as isAbsolute_36,
  isAbsolute as isAbsolute_37,
  isAbsolute as isAbsolute_38,
  isAbsolute as isAbsolute_39,
  isAbsolute as isAbsolute_40,
  isAbsolute as isAbsolute_42,
  isAbsolute as isAbsolute_43,
  isAbsolute as isAbsolute_44,
  isAbsolute as isAbsolute_45,
  isAbsolute as isAbsolute_46,
  isAbsolute as isAbsolute_47,
  isAbsolute as isAbsolute_48,
  isAbsolute as isAbsolute_49,
  isAbsolute as isAbsolute_50,
  isAbsolute as isAbsolute_51,
  isAbsolute as isAbsolute_52,
  isAbsolute as isAbsolute_53,
  isAbsolute as isAbsolute_54,
  isAbsolute as isAbsolute_55,
  isAbsolute as isAbsolute_56,
  isAbsolute as isAbsolute_57,
} from "path";
import {
  statSync,
  readFileSync,
  readFileSync as readFileSync_2,
  readFileSync as readFileSync_3,
  readFileSync as readFileSync_4,
  readFileSync as readFileSync_5,
  readFileSync as readFileSync_6,
  readFileSync as readFileSync_7,
  readFileSync as readFileSync_8,
} from "fs";
import {
  unlink,
  unlink as unlink_2,
  unlink as unlink_3,
  unlink as unlink_4,
  unlink as unlink_5,
  unlink as unlink_6,
  unlink as unlink_7,
  unlink as unlink_8,
  unlink as unlink_9,
  unlink as unlink_10,
  unlink as unlink_11,
  unlink as unlink_12,
  unlink as unlink_13,
} from "fs/promises";
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
  Oje,
  checkCompactBoundaryCoverage,
  createCompactSeenState,
  findLastHumanPromptUuid,
} from "../../bootstrap/sessionSlices.js";
import { logEvent } from "../analytics/index.js";
import { fromEnum, lit as lit_2, fromEnumOpt } from "../analytics/safeMetadata.js";
import { logForDebugging } from "../../utils/debug.js";
import { logError } from "../../utils/log.js";
import {
  q4e,
  dispatchSessionCompactHooks,
  getTokenCountFromUsage_3,
} from "../../plugins/functionHooks/sessionCompactHook.js";
import { getCompactThresholdSnapshot, Tp, isAtPrecomputeThreshold, dke } from "./autoCompact.js";
import { isAutoCompactEnabled, canCompactInRemote, OYr, isCompactCommand } from "./compactSettings.js";
import { getFeatureValue_CACHED_MAY_BE_STALE } from "../analytics/growthbook.js";
import { Vt } from "../../utils/agentId.js";
import { getProjectsDir } from "../../utils/sessionStoragePortable.js";
import { getCanonicalModelId } from "../../utils/modelCost.js";
import { stripInProgressAssistantMessage } from "../../commands/btw/btw.js";
import { agentTypeForTelemetry } from "../analytics/metadata.js";
import { resolvePrecomputeFraction, fse } from "./autoCompactWindow.js";
import { isDelegatedObservationContext } from "../../utils/agentContext.js";
import { executePreCompactHooks } from "../../utils/hooks.js";
import { COMPACTION_BLOCKED_BY_HOOK, mergeHookInstructions, O2 } from "./compact.js";
import { runReactiveCompact } from "./reactiveCompact.js";
import { unwrapAbortReason } from "../../utils/abortController.js";
import { logFeatureSad, logFeatureBad, logFeatureOk } from "../analytics/featureTelemetry.js";
import { getModelContextInfo } from "../../utils/model/modelContextInfo.js";
import { EMPTY_USAGE } from "../api/emptyUsage.js";

//@ chunk-e6aww6q8.js:2452854-2452897 placement
var P7e = 5,
  nV = 8000000,
  PRECOMPACT_JSON = "precompact.json";
//@ chunk-e6aww6q8.js:2452897-2452935 placement
function oV(e) {
  return join_78(getSessionSidecarDir(e), PRECOMPACT_JSON);
}
//@ chunk-e6aww6q8.js:2452935-2452970 placement
function Uln(e) {
  return jln(getSessionSidecarDir(e));
}
//@ chunk-e6aww6q8.js:2452970-2453003 placement
function jln(e) {
  return e + "." + PRECOMPACT_JSON;
}
//@ chunk-e6aww6q8.js:2453003-2453617 placement
async function writePrecomputedCompact(e, n = oV(e.sessionId), r) {
  let s = jsonStringify(e),
    byteLength = Buffer.byteLength(s, "utf8");
  if (byteLength > nV) return { ok: !1, reason: "too_large", bytes: byteLength };
  let y = isStorageV5Enabled() && r !== void 0 ? pathToSessionSideKey(n) : void 0;
  if (r !== void 0 && y)
    try {
      let write = await r.write(y, s, { mode: 384 });
      return write.ok
        ? { ok: !0, bytes: byteLength }
        : { ok: !1, reason: "write_error", bytes: byteLength, detail: formatStorageError(write.error) };
    } catch (error) {
      return { ok: !1, reason: "write_error", bytes: byteLength, detail: errorMessage(error) };
    }
  if (isDiskless())
    return {
      ok: !1,
      reason: "diskless",
      bytes: byteLength,
      detail: "not written: no storage backend, or no key for the target path",
    };
  try {
    return (await ensureSidecarDirFor(n), await writeFileAtomic_2(n, s, 384), { ok: !0, bytes: byteLength });
  } catch (error) {
    return { ok: !1, reason: "write_error", bytes: byteLength, detail: errorMessage(error) };
  }
}
/**
 * 依次读取新旧位置的预计算压缩文件。
 */
//@ chunk-e6aww6q8.js:2453617-2453742 placement
function readPrecomputedFromDisk(e) {
  for (let n of [oV(e), Uln(e)]) {
    let r = readPrecomputedFile(n);
    if (r.ok || r.reason !== "absent") return r;
  }
  return { ok: !1, reason: "absent" };
}
/**
 * 同步读取预计算压缩文件（无盘、过大或不存在时返回原因）。
 */
//@ chunk-e6aww6q8.js:2453742-2453962 placement
function readPrecomputedFile(e) {
  if (isDiskless()) return { ok: !1, reason: "absent" };
  try {
    if (statSync(e).size > nV) return { ok: !1, reason: "too_large" };
  } catch {
    return { ok: !1, reason: "absent" };
  }
  let n;
  try {
    n = readFileSync_4(e, "utf8");
  } catch {
    return { ok: !1, reason: "absent" };
  }
  return parsePrecomputedPayload(n);
}
/**
 * 解析预计算压缩 JSON（大小、版本、字段校验）。
 */
//@ chunk-e6aww6q8.js:2453962-2454298 placement
function parsePrecomputedPayload(e) {
  if (Buffer.byteLength(e, "utf8") > nV) return { ok: !1, reason: "too_large" };
  let n;
  try {
    n = jsonParse(e);
  } catch {
    return { ok: !1, reason: "parse_error" };
  }
  if (typeof n !== "object" || n === null) return { ok: !1, reason: "parse_error" };
  if (n.version !== P7e) return { ok: !1, reason: "version" };
  let r = validatePrecomputedPayload(n);
  return r === null ? { ok: !1, reason: "parse_error" } : { ok: !0, payload: r };
}
/**
 * 以不跟随链接方式异步读取预计算压缩文件。
 */
//@ chunk-e6aww6q8.js:2454298-2454806 placement
async function readPrecomputedNoFollow(e) {
  if (isDiskless()) return { ok: !1, reason: "absent" };
  let n = await openNoFollow_2(e);
  if (!n.ok) return { ok: !1, reason: "absent" };
  let r = n.value;
  try {
    let stats = await r.stat();
    if (!stats.isFile()) return { ok: !1, reason: "absent" };
    if (stats.size > nV) return { ok: !1, reason: "too_large" };
    let alloc = Buffer.alloc(stats.size + 1),
      y = 0;
    while (y < alloc.length) {
      let { bytesRead: bytesRead } = await r.read(alloc, y, alloc.length - y, y);
      if (bytesRead === 0) break;
      y += bytesRead;
    }
    return y > stats.size
      ? { ok: !1, reason: "absent" }
      : parsePrecomputedPayload(alloc.toString("utf8", 0, y));
  } catch {
    return { ok: !1, reason: "absent" };
  } finally {
    await r.close().catch(() => {});
  }
}
/**
 * 从会话存储（或磁盘）读取预计算压缩。
 */
//@ chunk-e6aww6q8.js:2454806-2455245 placement
async function readPrecomputedSidecar(e, n, r) {
  let s = n ?? getSessionSidecarDir(e),
    h = join_78(s, PRECOMPACT_JSON),
    y = pathToSessionSideKey(h);
  for (let S of [h, jln(s)]) {
    let w;
    if (S === h && y !== void 0) {
      let L = await r.read([{ key: y, offset: 0, length: nV + 1 }]).catch(() => {
          return;
        }),
        G = L?.ok ? L.value.items[0] : void 0;
      w =
        G === void 0 || !G.found
          ? { ok: !1, reason: "absent" }
          : G.totalBytes > nV
            ? { ok: !1, reason: "too_large" }
            : parsePrecomputedPayload(Buffer.from(G.value).toString("utf8"));
    } else w = await readPrecomputedNoFollow(S);
    if (w.ok || w.reason !== "absent") return w;
  }
  return { ok: !1, reason: "absent" };
}
/**
 * 删除会话的预计算压缩文件/存储项。
 */
//@ chunk-e6aww6q8.js:2455245-2455451 placement
async function deletePrecomputed(e, n) {
  let r = oV(e),
    s = Uln(e),
    h = isStorageV5Enabled() && n !== void 0 ? pathToSessionSideKey(r) : void 0;
  if (n !== void 0 && h) await n.delete(h).catch(() => {});
  else if (!isDiskless()) await unlink_9(r).catch(() => {});
  if (isDiskless()) return;
  await unlink_9(s).catch(() => {});
}
/**
 * 预计算载荷转为压缩结果。
 */
//@ chunk-e6aww6q8.js:2455451-2455750 placement
function toCompactionResult(e, n) {
  return {
    summaryMessages: e.summaryMessages,
    summaryText: e.summaryText,
    messagesToPreserve: n,
    attempt: e.attempt,
    groupsPreserved: e.groupsPreserved,
    totalGroups: e.totalGroups,
    splitKind: "round",
    headTruncations: 0,
    forkAssistantMessageCount: e.forkAssistantMessageCount,
    totalUsage: e.totalUsage,
  };
}
/**
 * 类型守卫：字符串、带 message/uuid 的消息、有限数字。
 */
//@ chunk-e6aww6q8.js:2455750-2455900 placement
var isString_2 = (e) => typeof e === "string",
  isMessageLike = (e) => typeof e === "object" && e !== null && "message" in e && "uuid" in e,
  isFiniteNumber_2 = (e) => typeof e === "number" && Number.isFinite(e);
/**
 * 校验预计算压缩载荷的全部字段。
 */
//@ chunk-e6aww6q8.js:2455900-2456533 placement
function validatePrecomputedPayload(e) {
  if (typeof e !== "object" || e === null) return null;
  let n = e;
  return isFiniteNumber_2(n.version) &&
    isString_2(n.sessionId) &&
    n.agentKey === "main" &&
    isString_2(n.model) &&
    isString_2(n.cliVersion) &&
    isString_2(n.createdAt) &&
    isString_2(n.precomputedAtUuid) &&
    isFiniteNumber_2(n.preCompactTokens) &&
    isFiniteNumber_2(n.readyDurationMs) &&
    (n.preCompactHookDisplay === void 0 || isString_2(n.preCompactHookDisplay)) &&
    isString_2(n.summaryText) &&
    Array.isArray(n.summaryMessages) &&
    n.summaryMessages.length > 0 &&
    n.summaryMessages.every(isMessageLike) &&
    Array.isArray(n.preserveUuids) &&
    n.preserveUuids.every(isString_2) &&
    isFiniteNumber_2(n.attempt) &&
    isFiniteNumber_2(n.groupsPreserved) &&
    isFiniteNumber_2(n.totalGroups) &&
    isFiniteNumber_2(n.forkAssistantMessageCount) &&
    typeof n.totalUsage === "object" &&
    n.totalUsage !== null
    ? e
    : null;
}
/**
 * 预计算失败的原因描述。
 */
//@ chunk-e6aww6q8.js:2456533-2456716 placement
function describePrecomputeFailure(e, n) {
  let r = e.reason === "error" ? (e.isTimeout ? "timeout" : "api_error") : e.reason;
  return {
    reason: e.reason,
    cause: r,
    attempts: e.attempts,
    status: e.status,
    detail: e.detail,
    durationMs: n,
  };
}
//@ chunk-e6aww6q8.js:2456716-2456726 placement
var Kln = 3;
/**
 * 预计算被闸门阻止时只记录一次。
 */
//@ chunk-e6aww6q8.js:2456726-2456939 placement
function latchArmGate(e, n, r, s) {
  let h = Oje(n),
    y = `${h}:${r}`;
  if (!e.latchArmGateEvent(y)) return !1;
  return (
    logEvent("tengu_precomputed_compact_arm_gated", { reason: fromEnum(r), querySource: s }),
    logForDebugging(`precomputed compact: arm gated (${h}, ${r})`),
    !0
  );
}
//@ chunk-e6aww6q8.js:2456939-2457020 placement
function Nmn(e, n = logError) {
  try {
    return { messages: e, rowUuids: q4e(e) };
  } catch (error) {
    n(error);
    return;
  }
}
/**
 * 检查预计算摘要是否仍覆盖当前对话。
 */
//@ chunk-e6aww6q8.js:2457020-2457191 placement
function checkPrecomputeCoverage(e, { sent: sent, received: received }, s, h) {
  return checkCompactBoundaryCoverage({
    coverage: e.coverage,
    kept: e.result.messagesToPreserve,
    sent: sent,
    received: received,
    instructions: void 0,
    fit: getCompactThresholdSnapshot(e, received.messages, s, h),
  });
}
/**
 * 预计算压缩是否开启（自动压缩、远程可压缩、tengu_sepia_moth）。
 */
//@ chunk-e6aww6q8.js:2457191-2457293 placement
function isPrecomputedCompactEnabled() {
  if (!isAutoCompactEnabled()) return !1;
  if (!canCompactInRemote()) return !1;
  if (!getFeatureValue_CACHED_MAY_BE_STALE("tengu_sepia_moth", !1)) return !1;
  return OYr();
}
//@ chunk-e6aww6q8.js:2457293-2457323 placement
function mJn(e) {
  return isCompactCommand(e);
}
//@ chunk-e6aww6q8.js:2457323-2457392 placement
function xve() {
  return (
    getFeatureValue_CACHED_MAY_BE_STALE("tengu_amber_packet", !1) &&
    isPrecomputedCompactEnabled() &&
    !isTranscriptPersistenceDisabled() &&
    !isDiskless()
  );
}
/**
 * 当前 CLI 版本与预计算文件过期时间。
 */
//@ chunk-e6aww6q8.js:2457392-2458400 placement
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
    } < "u"
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
      : "unknown",
  PRECOMPUTE_MAX_AGE_MS = 604800000;
/**
 * 续接会话时预读预计算压缩并缓存。
 */
//@ chunk-e6aww6q8.js:2458400-2458826 placement
async function prefetchPrecomputedSidecar(e, n, r, s) {
  if (
    !isStorageV5Enabled() ||
    s === void 0 ||
    !isPrecomputedCompactEnabled() ||
    !xve() ||
    Vt(e) === null ||
    n.sessionId !== e ||
    r.hasAttemptedRehydrate(e)
  )
    return;
  let h;
  if (n.transcriptPath !== void 0) {
    if (!Mpr(n.transcriptPath)) return;
    h = join_64(dirname_39(resolve_28(n.transcriptPath)), e);
  }
  let y = await readPrecomputedSidecar(e, h, s).catch(() => ({ ok: !1, reason: "absent" }));
  if (!y.ok && y.reason === "absent") {
    r.dropSidecarReadAhead(e);
    return;
  }
  return (
    r.keepSidecarReadAhead(e, y),
    () => {
      r.dropSidecarReadAhead(e);
    }
  );
}
/**
 * 续接会话时的 onSessionResolved 钩子（预读预计算压缩）。
 */
//@ chunk-e6aww6q8.js:2458826-2458980 placement
function precomputeResumeHooks(e, n, r) {
  if (!isStorageV5Enabled() || n === void 0 || r?.forkSession === !0) return {};
  let s = r?.expectedSessionId;
  return { onSessionResolved: (h) => prefetchPrecomputedSidecar(s ?? h.sessionId, h, e, n) };
}
//@ chunk-e6aww6q8.js:2458980-2459079 placement
function Mpr(e) {
  let n = relative_25(getProjectsDir(), resolve_28(e));
  return n !== "" && n !== ".." && !n.startsWith(`..${sep_40}`) && !isAbsolute_32(n);
}
/**
 * 读取持久化的预计算压缩，校验会话、时间戳、是否过旧或已压缩。
 */
//@ chunk-e6aww6q8.js:2459079-2461249 placement
function loadPrecomputedCompact(e, n, r, s, h, y) {
  if (n !== "main" || mJn(r) || !xve() || !isPrecomputedCompactEnabled()) return;
  let S = getSessionId();
  if (e.hasAttemptedRehydrate(S)) return;
  if (e.has(n)) return;
  e.markRehydrateAttempted(S);
  let w =
    isStorageV5Enabled() && y !== void 0
      ? (e.takeSidecarReadAhead(S) ?? { ok: !1, reason: "absent" })
      : readPrecomputedFromDisk(S);
  if (!w.ok) {
    if (w.reason !== "absent") rejectRehydrate(e, S, w.reason, void 0, y);
    return;
  }
  let { payload: payload } = w,
    max = Math.max(0, Date.now() - Date.parse(payload.createdAt)),
    q = (We, ze) =>
      rejectRehydrate(
        e,
        S,
        We,
        {
          ...(Number.isFinite(max) && { ageMs: Math.round(max) }),
          cliVersionMatch: payload.cliVersion === CLI_VERSION_2,
          modelMatch: getCanonicalModelId(payload.model) === getCanonicalModelId(h),
          ...ze,
        },
        y,
      );
  if (payload.sessionId !== S) return q("session_mismatch");
  if (!Number.isFinite(max)) return q("bad_timestamp");
  if (max > PRECOMPUTE_MAX_AGE_MS) return q("too_old");
  let Z = findPreservedMetadata(s, payload.precomputedAtUuid);
  if (Z !== void 0)
    return q("already_compacted", {
      compactedByThisSummary: Z.anchorUuid === payload.summaryMessages.at(-1)?.uuid,
    });
  let index = s.findIndex((We) => We.uuid === payload.precomputedAtUuid);
  if (index === -1) return q("boundary_missing");
  let ke = Tp(s) - payload.preCompactTokens;
  if (ke < -(payload.preCompactTokens / 2)) return q("shrank_too_much");
  let we = new Map(s.map((We) => [We.uuid, We])),
    flattened = payload.preserveUuids.flatMap((preserveUuid) => {
      let ze = we.get(preserveUuid);
      return ze === void 0 ? [] : [ze];
    });
  if (flattened.length !== payload.preserveUuids.length)
    return q("preserve_uuid_missing", {
      preservedUuidCount: payload.preserveUuids.length,
      missingUuidCount: payload.preserveUuids.length - flattened.length,
    });
  let Ae = new Set(payload.preserveUuids),
    index_2 = s.findIndex((We) => Ae.has(We.uuid)),
    Me = Nmn(
      index_2 === -1
        ? s.slice(0, index + 1)
        : s.filter((We, ze) => ze < index_2 || ze === index || Ae.has(We.uuid)),
    );
  if (Me === void 0) return q("rows_unreadable");
  (e.put(n, {
    status: "ready",
    result: toCompactionResult(payload, flattened),
    coverage: createCompactSeenState(Me, payload.precomputedAtUuid),
    preCompactTokens: payload.preCompactTokens,
    model: payload.model,
    startedAt: performance.now() - max,
    readyDurationMs: payload.readyDurationMs,
    abortController: new AbortController(),
    preCompactHookDisplay: payload.preCompactHookDisplay,
    settled: Promise.resolve(),
    rehydrated: !0,
    sidecarSessionId: S,
  }),
    logEvent("tengu_precomputed_compact_rehydrated", {
      ageMs: Math.round(max),
      preCompactTokens: payload.preCompactTokens,
      preservedUuidCount: payload.preserveUuids.length,
      growthTokens: ke,
      summaryBytes: Buffer.byteLength(payload.summaryText, "utf8"),
      modelMatch: getCanonicalModelId(payload.model) === getCanonicalModelId(h),
      cliVersionMatch: payload.cliVersion === CLI_VERSION_2,
    }),
    logForDebugging(`precomputed compact: rehydrated (${n}, age ${Math.round(max)}ms, growth ~${ke} tok)`));
}
/**
 * 找包含某 uuid 的最近压缩边界的保留信息。
 */
//@ chunk-e6aww6q8.js:2461249-2461431 placement
function findPreservedMetadata(e, n) {
  let r = e.findLast((s) => s.type === "system" && s.subtype === "compact_boundary")?.compactMetadata
    ?.preservedMessages;
  return (r?.allUuids ?? r?.uuids ?? []).includes(n) ? r : void 0;
}
/**
 * 拒绝恢复预计算压缩：删除文件并记录原因。
 */
//@ chunk-e6aww6q8.js:2461431-2461611 placement
function rejectRehydrate(e, n, r, s, h) {
  (e.enqueueSidecarIo(() => deletePrecomputed(n, h), logError),
    logEvent("tengu_precomputed_compact_rehydrate_rejected", { reason: fromEnum(r), ...s }),
    logForDebugging(`precomputed compact: rehydrate rejected (${r})`));
}
/**
 * 把预先计算的压缩摘要持久化到会话存储。
 */
//@ chunk-e6aww6q8.js:2461611-2462633 placement
async function persistPrecomputedCompact({
  sessionId: sessionId,
  sidecarPath: sidecarPath,
  ready: ready,
  lastLoggableUuid: lastLoggableUuid,
  model: model,
  querySource: querySource,
  storageV5: storageV5,
}) {
  let mapped = ready.result.messagesToPreserve.filter(isLoggableMessage).map((G) => G.uuid),
    L = await writePrecomputedCompact(
      {
        version: P7e,
        sessionId: sessionId,
        agentKey: "main",
        model: model,
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
  (logEvent("tengu_precomputed_compact_persisted", {
    ok: L.ok,
    bytes: L.bytes,
    ...(L.ok === !1 && { reason: fromEnum(L.reason) }),
    preservedMessageCount: ready.result.messagesToPreserve.length,
    preservedUuidCount: mapped.length,
    querySource: querySource,
  }),
    logForDebugging(
      `precomputed compact: persisted (${L.ok ? `${L.bytes} bytes` : `${L.reason}${L.detail === void 0 ? "" : `: ${L.detail}`}`})`,
    ));
}
/**
 * 删除本会话已就绪的预计算文件。
 */
//@ chunk-e6aww6q8.js:2462633-2462763 placement
function deleteReadySidecar(e, n, r) {
  let s = n?.status === "ready" ? n.sidecarSessionId : void 0;
  if (s !== void 0 && s === getSessionId()) e.enqueueSidecarIo(() => deletePrecomputed(s, r), logError);
}
//@ chunk-e6aww6q8.js:2462763-2462855 placement
function Dpr(e, n) {
  return { ...e, abortController: n, onCompactEvent: void 0, onRetryStatus: void 0 };
}
/**
 * 本回合是否应启动预计算压缩。
 */
//@ chunk-e6aww6q8.js:2462855-2463174 placement
function shouldArmPrecompute(e) {
  if (e.autocompactRan) return !1;
  if (e.isPreFirstCompactFork) return !1;
  if (e.hasAttemptedReactiveCompact) return !1;
  if (e.lastTransitionReason === "precomputed_compact_swap") return !1;
  if (!isPrecomputedCompactEnabled()) return !1;
  return isAtPrecomputeThreshold(
    e.contextTokens,
    e.facts,
    e.autoCompactWindow,
    e.querySource,
    e.messagesCounted ? stripInProgressAssistantMessage(e.messagesCounted) : 0,
  );
}
/**
 * 在合适时机（空闲、估算超过阈值）启动预计算压缩，SDK 单提示模式下受闸门限制。
 */
//@ chunk-e6aww6q8.js:2463174-2468415 placement
function armPrecomputedCompact(e) {
  let {
      querySource: querySource,
      messages: messages,
      cacheSafeParams: cacheSafeParams,
      facts: facts,
      armTrigger: armTrigger = "estimate",
      estimateGapTokens: estimateGapTokens,
    } = e,
    { toolUseContext: toolUseContext } = cacheSafeParams,
    precompute = toolUseContext.session.precompute,
    G = Oje(toolUseContext.agentId),
    q = armTrigger === "idle";
  if (!q && !isPrecomputedCompactEnabled()) return !1;
  if (mJn(querySource)) return !1;
  if (
    (loadPrecomputedCompact(
      precompute,
      G,
      querySource,
      messages,
      toolUseContext.options.mainLoopModel,
      toolUseContext.storageV5,
    ),
    precompute.consecutiveCountedFailures(G) >= Kln)
  )
    return !1;
  let Z = precompute.get(G);
  if (Z !== void 0 && Z.status !== "failed") return !1;
  let Se = messages.at(-1)?.uuid;
  if (Se === void 0) return !1;
  let ke = findLastHumanPromptUuid(messages);
  if (precompute.isVetoedUnder(G, ke)) return !1;
  let we = querySource === "sdk" ? e.promptScan : void 0;
  if (we !== void 0) {
    let { userPromptCount: userPromptCount, historyRewritten: historyRewritten } = we,
      Zt = userPromptCount <= 1 && !historyRewritten ? "sdk_single_prompt_gate" : void 0;
    if (Zt !== void 0) {
      let rn = `${G}:${Zt}`;
      if (precompute.latchArmGateEvent(rn))
        (logEvent("tengu_precomputed_compact_arm_gated", {
          reason: fromEnum(Zt),
          querySource: lit_2("sdk"),
          userPromptCount: userPromptCount,
          preCompactTokens: Tp(messages),
        }),
          logForDebugging(`precomputed compact: arm gated (${G}, ${Zt}, userPrompts ${userPromptCount})`));
      return !1;
    }
  }
  let Ee = Nmn(messages, (Yt) => {
    if (
      latchArmGate(precompute, toolUseContext.agentId, "rows_unreadable", agentTypeForTelemetry(querySource))
    )
      logError(Yt);
  });
  if (Ee === void 0) return !1;
  let abortController = new AbortController(),
    startTime = performance.now(),
    Me = messages.findLast(isLoggableMessage)?.uuid,
    mainLoopModel = toolUseContext.options.mainLoopModel,
    ze = getSessionId(),
    lt = oV(ze),
    Je = Tp(messages),
    nt = Dpr(toolUseContext, abortController),
    pt = { ...cacheSafeParams, toolUseContext: nt },
    Et = agentTypeForTelemetry(querySource),
    nextAttemptNumber = precompute.nextAttemptNumber(G),
    gt = resolvePrecomputeFraction(facts, toolUseContext.options.autoCompactWindow, querySource);
  (logEvent("tengu_precomputed_compact_started", {
    armFraction: gt.fraction,
    armFractionSource: fromEnum(gt.source),
    ...(gt.matchedWindowKey !== void 0 && { armWindowKey: gt.matchedWindowKey }),
    preCompactTokens: Je,
    messageCount: messages.length,
    querySource: Et,
    precomputeAttemptNumber: nextAttemptNumber,
    ...(we !== void 0 && { userPromptCount: we.userPromptCount, historyRewritten: we.historyRewritten }),
    armTrigger: fromEnum(armTrigger),
    ...(estimateGapTokens !== void 0 && { estimateGapTokens: estimateGapTokens }),
    windowSource: fromEnumOpt(fse(facts, toolUseContext.options.autoCompactWindow)),
  }),
    logForDebugging(
      `precomputed compact: started (${G}, ${messages.length} msgs, ~${Je} tok, attempt ${nextAttemptNumber}, trigger ${armTrigger})`,
    ));
  let At = (async () => {
      let Yt,
        qt,
        Zt = (yn) => ({
          ok: !1,
          reason: "error",
          attempts: 0,
          totalGroups: 0,
          detail: errorMessage(yn),
          errorKind: "thrown",
          status: void 0,
          isTimeout: !1,
        }),
        rn = await dispatchSessionCompactHooks({
          trigger: "precompute",
          instructions: void 0,
          messages: messages,
          agentId: toolUseContext.agentId,
          isIsolated:
            isDelegatedObservationContext(toolUseContext.agentContext) ||
            toolUseContext.options.settingsHooksOff === !0,
          origin: toolUseContext.hookOrigin,
          signal: abortController.signal,
          compact: async (yn, Kn) => {
            let Xn = await executePreCompactHooks(
              toolUseContext.session,
              { trigger: "auto", customInstructions: Kn ?? null },
              toolUseContext,
              abortController.signal,
            ).catch((fo) => (logError(fo), {}));
            if (Xn.blockedBy)
              return (
                logForDebugging(`Precomputed compact blocked by PreCompact hook: ${Xn.blockedBy}`),
                { skip: `${COMPACTION_BLOCKED_BY_HOOK}: ${Xn.blockedBy}` }
              );
            if (abortController.signal.aborted) return { skip: "aborted before the summary ran" };
            if (
              ((qt = Xn.userDisplayMessage),
              (Yt = await runReactiveCompact(yn, pt, {
                customInstructions: mergeHookInstructions(Kn, Xn.newCustomInstructions),
                allowFallback: !1,
              }).catch(Zt)),
              !Yt.ok)
            )
              throw new PrecomputedCompactNotReadyError();
            return {
              messages: [...Yt.result.summaryMessages, ...Yt.result.messagesToPreserve],
              tokensBefore: Je,
              usage: getTokenCountFromUsage_3(Yt.result.totalUsage),
              record: Yt.result,
            };
          },
        }).catch((yn) => {
          if (Yt?.ok !== !1) Yt = Zt(yn);
          return;
        });
      if (rn?.kind === "skipped") {
        if (
          (logForDebugging(`precomputed compact: skipped (${G}, ${rn.reason}); nothing kept`),
          !abortController.signal.aborted)
        )
          precompute.recordVeto(G, ke);
        updatePendingEntry(precompute, G, abortController, null);
        return;
      }
      if (rn?.kind === "replaced") {
        let rounded = Math.round(performance.now() - startTime);
        (logForDebugging(
          `precomputed compact: ready with a hook's ${rn.messages.length} messages (${G}, ${rounded}ms)`,
        ),
          updatePendingEntry(precompute, G, abortController, (Kn) => ({
            ...Kn,
            status: "ready",
            result: emptyCompactionResult(rn.messages),
            replacement: !0,
            readyDurationMs: rounded,
            preCompactHookDisplay: qt,
          })));
        return;
      }
      Yt ??= Zt(Error("the summary never ran"));
      let rounded = Math.round(performance.now() - startTime);
      if (
        (logForDebugging(
          `precomputed compact: ${Yt.ok ? "ready" : `failed (${Yt.reason})`} (${G}, ${rounded}ms)`,
        ),
        !Yt.ok)
      ) {
        let yn = unwrapAbortReason(abortController.signal.reason),
          Kn = Yt.reason === "aborted" ? PRECOMPUTE_DISCARD_REASONS.find((fo) => fo === yn) : void 0,
          Xn = describePrecomputeFailure(Yt, rounded);
        if (
          (logEvent("tengu_precomputed_compact_failed", {
            reason: fromEnum(Yt.reason),
            cause: fromEnum(Xn.cause),
            status: Xn.status,
            durationMs: rounded,
            querySource: Et,
            preCompactTokens: Je,
            precomputeAttemptNumber: nextAttemptNumber,
            armTrigger: fromEnum(armTrigger),
            ...(Kn !== void 0 && { clearReason: fromEnum(Kn) }),
          }),
          !q)
        )
          if (Yt.reason === "aborted") logFeatureSad("compact_precomputed", "compact_precomputed_aborted");
          else logFeatureBad("compact_precomputed", `compact_precomputed_${Yt.reason}`);
        if (
          Yt.reason !== "aborted" &&
          Xn.cause !== "too_few_groups" &&
          !q &&
          !abortController.signal.aborted
        ) {
          let recordCountedFailure = precompute.recordCountedFailure(G);
          if (recordCountedFailure === Kln)
            (logEvent("tengu_precomputed_compact_rearm_capped", {
              cause: fromEnum(Xn.cause),
              status: Xn.status,
              querySource: Et,
              preCompactTokens: Je,
              precomputeAttemptNumber: nextAttemptNumber,
            }),
              logForDebugging(
                `precomputed compact: re-arm capped (${G}, ${recordCountedFailure} consecutive ${Xn.cause} failures)`,
              ));
        }
        updatePendingEntry(precompute, G, abortController, (fo) => ({
          ...fo,
          status: "failed",
          failure: Xn,
        }));
        return;
      }
      if (
        (logEvent("tengu_precomputed_compact_ready", {
          durationMs: rounded,
          attempts: Yt.result.attempt,
          groupsPreserved: Yt.result.groupsPreserved,
          totalGroups: Yt.result.totalGroups,
          querySource: Et,
          preCompactTokens: Je,
          precomputeAttemptNumber: nextAttemptNumber,
          armTrigger: fromEnum(armTrigger),
        }),
        !q)
      )
        logFeatureOk("compact_precomputed");
      if (!q && !abortController.signal.aborted) precompute.clearCountedFailures(G);
      let no = G === "main" && !q && xve() ? ze : void 0,
        hn = Yt.result;
      updatePendingEntry(precompute, G, abortController, (yn) => ({
        ...yn,
        status: "ready",
        result: hn,
        readyDurationMs: rounded,
        preCompactHookDisplay: qt,
        ...(no !== void 0 && { sidecarSessionId: no }),
      }));
      let ho = precompute.get(G);
      if (
        no !== void 0 &&
        Me !== void 0 &&
        ho?.status === "ready" &&
        ho.abortController === abortController
      ) {
        let yn = ze === getSessionId() ? oV(ze) : lt;
        precompute.enqueueSidecarIo(
          () =>
            persistPrecomputedCompact({
              sessionId: no,
              sidecarPath: yn,
              ready: ho,
              lastLoggableUuid: Me,
              model: mainLoopModel,
              querySource: Et,
              storageV5: toolUseContext.storageV5,
            }),
          logError,
        );
      }
    })(),
    It = {
      status: "pending",
      coverage: createCompactSeenState(Ee, Se),
      preCompactTokens: Je,
      model: mainLoopModel,
      startedAt: startTime,
      abortController: abortController,
      preCompactHookDisplay: void 0,
      settled: At,
      ...(armTrigger === "idle" && { armTrigger: armTrigger }),
    };
  return (precompute.put(G, It), !0);
}
/**
 * 手动触发会话记忆/预计算压缩：等待 precompute 结果就绪，返回压缩前 token 数，未就绪抛 PrecomputedCompactNotReadyError。
 */
//@ chunk-e6aww6q8.js:2468415-2468948 placement = manuallyExtractSessionMemory (0.307)
async function manuallyExtractSessionMemory(messages, toolUseContext) {
  let { toolUseContext: toolUseContext_2 } = toolUseContext,
    { agentId: agentId, session: session } = toolUseContext_2,
    S = armPrecomputedCompact({
      querySource: messages,
      messages: toolUseContext.forkContextMessages,
      cacheSafeParams: {
        ...toolUseContext,
        toolUseContext: { ...toolUseContext_2, compactionApiAttemptsLeft: { count: 1 } },
      },
      facts: getModelContextInfo(toolUseContext_2.options.mainLoopModel),
      armTrigger: "idle",
    })
      ? MGt(session.precompute, agentId)
      : void 0;
  if (S === void 0) return null;
  if ((await S.settled, S.abortController.signal.aborted)) throw new AbortError_2();
  let w = MGt(session.precompute, agentId);
  if (w?.abortController !== S.abortController) return null;
  if (w.status !== "ready") throw new PrecomputedCompactNotReadyError();
  return { tokensBefore: w.preCompactTokens };
}
//@ chunk-e6aww6q8.js:2468948-2469047 placement
class PrecomputedCompactNotReadyError extends Error {
  constructor() {
    super("precomputed compact: the summary did not settle ok");
  }
}
/**
 * 空的压缩结果（只保留消息）。
 */
//@ chunk-e6aww6q8.js:2469047-2469246 placement
function emptyCompactionResult(e) {
  return {
    summaryMessages: [],
    summaryText: "",
    messagesToPreserve: e,
    attempt: 0,
    groupsPreserved: 0,
    totalGroups: 0,
    splitKind: "round",
    headTruncations: 0,
    forkAssistantMessageCount: 0,
    totalUsage: EMPTY_USAGE,
  };
}
/**
 * 更新仍在进行中的预计算条目（null 时删除）。
 */
//@ chunk-e6aww6q8.js:2469246-2469384 placement
function updatePendingEntry(e, n, r, s) {
  let h = e.get(n);
  if (h?.status !== "pending" || h.abortController !== r) return;
  if (s === null) {
    e.remove(n);
    return;
  }
  e.put(n, s(h));
}
//@ chunk-e6aww6q8.js:2469384-2469423 placement
function MGt(e, n) {
  return e.get(Oje(n));
}
/**
 * 借用进行中或已就绪的预计算结果（回合中止时放弃）。
 */
//@ chunk-e6aww6q8.js:2469423-2469992 placement
async function borrowPrecompute(e, n, r) {
  let s = e.get(n);
  if (s === void 0 || r.aborted) return null;
  let status = s.status;
  if (s.status === "pending") {
    if (
      (logForDebugging(`precomputed compact: awaiting borrowed in-flight (${n})`),
      await Promise.race([
        s.settled.then(() => !1),
        new Promise((w) => {
          r.addEventListener("abort", () => w(!0), { once: !0 });
        }),
      ]))
    )
      return (
        logForDebugging(`precomputed compact: turn aborted while borrowing (${n}) \u2014 leaving entry`),
        { kind: "turn_aborted", statusAtPTL: status }
      );
  }
  let y = e.get(n);
  return (
    logForDebugging(`precomputed compact: borrowed (${n}, ${y?.status ?? "gone"})`),
    y?.status === "ready" ? { kind: "ready", ready: y, statusAtPTL: status } : null
  );
}
//@ chunk-e6aww6q8.js:2469992-2470695 placement
async function awaitInflightPrecompute(e, n, r, s) {
  let h = Oje(n),
    y = e.get(h);
  if (y === void 0 || r.aborted) return null;
  let status = y.status;
  if (y.status === "pending") {
    if (
      (logForDebugging(`precomputed compact: awaiting in-flight (${h})`),
      await Promise.race([
        y.settled.then(() => !1),
        new Promise((G) => {
          r.addEventListener("abort", () => G(!0), { once: !0 });
        }),
      ]))
    )
      return (
        logForDebugging(`precomputed compact: turn aborted while awaiting (${h}) \u2014 leaving entry`),
        { kind: "turn_aborted", statusAtPTL: status }
      );
  }
  let w = e.get(h);
  switch (
    (e.remove(h),
    deleteReadySidecar(e, w, s),
    logForDebugging(`precomputed compact: consumed (${h}, ${w?.status ?? "gone"})`),
    w?.status)
  ) {
    case "ready":
      return { kind: "ready", ready: w, statusAtPTL: status };
    case "failed":
      return { kind: "failed", failure: w.failure, statusAtPTL: status };
    case "pending":
    case void 0:
      return null;
  }
}
/**
 * 到达阈值时应用预先计算好的压缩摘要，否则返回未就绪或提前返回的原因。
 */
//@ chunk-e6aww6q8.js:2470695-2473037 placement
async function applyPrecomputedCompact(e) {
  let {
      toolUseContext: toolUseContext,
      messages: messages,
      detectedAt: detectedAt,
      borrowFrom: borrowFrom,
      querySource: querySource,
    } = e,
    precompute = toolUseContext.session.precompute,
    w = agentTypeForTelemetry(querySource),
    L = (ze, lt) => {
      let rounded = Math.round(performance.now() - detectedAt);
      return (
        consumePrecomputedCompact(ze, w, rounded, e.trigger),
        { outcome: ze, swap: ze.kind === "applied" ? ze.swap : void 0, emittedEarlyCompactStart: lt }
      );
    },
    G =
      !mJn(querySource) &&
      (e.trigger === "idle" ||
        (isPrecomputedCompactEnabled() &&
          (e.trigger === "threshold" || (e.isWithheld413 === !0 && !e.hasAttemptedReactiveCompact))));
  if (G)
    loadPrecomputedCompact(
      precompute,
      Oje(toolUseContext.agentId),
      querySource,
      messages,
      toolUseContext.options.mainLoopModel,
      toolUseContext.storageV5,
    );
  if (e.trigger === "idle") {
    let ze = MGt(precompute, toolUseContext.agentId),
      lt = dke() ?? 1 / 0;
    if (ze?.status !== "ready" || Date.now() < lt)
      discardPrecompute(
        precompute,
        toolUseContext.agentId,
        "returned_early",
        querySource,
        toolUseContext.storageV5,
      );
  }
  if (!G || (e.trigger !== "ptl" && MGt(precompute, toolUseContext.agentId) === void 0))
    return { outcome: { kind: "none" }, swap: void 0, emittedEarlyCompactStart: !1 };
  let signal = toolUseContext.abortController.signal,
    Z =
      (borrowFrom !== void 0 ? precompute.get(borrowFrom) : MGt(precompute, toolUseContext.agentId))
        ?.status === "pending";
  if (Z)
    (toolUseContext.onCompactEvent?.({ type: "stream_mode", mode: "requesting" }),
      e.onResponseLength?.({ type: "response_length", op: "reset" }),
      toolUseContext.onCompactEvent?.({ type: "compact_progress", event: { type: "compact_start" } }),
      toolUseContext.onCompactEvent?.({ type: "sdk_status", status: "compacting" }));
  let Se = null,
    ke = !1,
    we = Z ? O2(toolUseContext.onCompactEvent) : void 0;
  try {
    if (borrowFrom !== void 0)
      ((Se = await borrowPrecompute(precompute, borrowFrom, signal)), (ke = Se !== null));
    Se ??= await awaitInflightPrecompute(
      precompute,
      toolUseContext.agentId,
      signal,
      toolUseContext.storageV5,
    );
  } finally {
    we?.();
  }
  if (Se === null) return L({ kind: "none" }, Z);
  if (Se.kind === "turn_aborted") return L({ kind: "aborted" }, Z);
  if (Se.kind === "failed") return L({ kind: "failed", failure: Se.failure, statusAtPTL: Se.statusAtPTL }, Z);
  let { ready: ready } = Se,
    Ae = (ze, lt) => {
      if (ke) {
        (logEvent("tengu_precompute_borrow_boundary_miss", { querySource: w, reason: fromEnum(ze), ...lt }),
          logForDebugging(`precomputed compact: borrow refused (${ze})`));
        return;
      }
      logPrecomputeDiscarded(ready, ze, querySource, lt);
    },
    Ie = Nmn(messages),
    Me =
      Ie === void 0
        ? { kind: "refuse", reason: "rows_unreadable" }
        : checkPrecomputeCoverage(
            ready,
            { sent: Ie, received: Ie },
            e.sizingModel,
            toolUseContext.options.autoCompactWindow,
          );
  if (Me.kind === "refuse")
    return (Ae(Me.reason, Me.reason === "would_not_fit" ? Me.sizes : void 0), L({ kind: "none" }, Z));
  let We = Se.statusAtPTL === "pending" ? "pending" : "ready";
  return L(
    {
      kind: "applied",
      swap: {
        compactResult: ready.result,
        coverage: ready.coverage,
        reportRefused: Ae,
        replacement: ready.replacement === !0,
        preCompactHookDisplay: ready.preCompactHookDisplay,
        statusAtPTL: We,
        leadMs: detectedAt - ready.startedAt,
        totalMs: ready.readyDurationMs,
        borrowed: ke,
        rehydrated: ready.rehydrated === !0,
        ...(ready.armTrigger === "idle" && { armTrigger: "idle" }),
        drift: precomputeDrift(ready, {
          messages: messages,
          mainLoopModel: toolUseContext.options.mainLoopModel,
        }),
        sizes: Me.sizes,
      },
    },
    Z,
  );
}
/**
 * 消费预计算的压缩结果并记录遥测。
 */
//@ chunk-e6aww6q8.js:2473037-2473606 placement
function consumePrecomputedCompact(e, n, r, s) {
  let h = e.kind === "applied" ? e.swap.statusAtPTL : e.kind === "failed" ? e.statusAtPTL : void 0;
  logEvent("tengu_precomputed_compact_consumed", {
    kind: fromEnum(e.kind),
    querySource: n,
    waitedMs: r,
    statusAtPTL: fromEnumOpt(h),
    trigger: fromEnum(s),
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
/**
 * 记录手动 /compact 使用预计算结果的情况（含失败原因）。
 */
//@ chunk-e6aww6q8.js:2473606-2473999 placement
function logManualPrecomputeConsumed(e, n, r) {
  if (!isPrecomputedCompactEnabled()) return;
  logEvent("tengu_precomputed_compact_consumed", {
    kind: fromEnum(e),
    trigger: lit_2("manual"),
    waitedMs: Math.round(r),
    statusAtPTL: fromEnumOpt(e === "failed" ? n?.statusAtPTL : void 0),
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
/**
 * 记录手动 /compact 应用了预计算结果。
 */
//@ chunk-e6aww6q8.js:2473999-2474337 placement
function logManualPrecomputeApplied(e, n, r, s) {
  if (!isPrecomputedCompactEnabled()) return;
  logEvent("tengu_precomputed_compact_consumed", {
    kind: lit_2("applied"),
    trigger: lit_2("manual"),
    waitedMs: Math.round(n),
    statusAtPTL: fromEnum(e.statusAtPTL),
    borrowed: !1,
    rehydrated: e.ready.rehydrated === !0,
    ...(e.ready.armTrigger === "idle" && { armTrigger: lit_2("idle") }),
    ...precomputeDrift(e.ready, r),
    precomputeTotalMs: e.ready.readyDurationMs,
    ...s,
  });
}
/**
 * 预计算后模型是否一致与 token 增长。
 */
//@ chunk-e6aww6q8.js:2474337-2474461 placement
function precomputeDrift(e, { messages: messages, mainLoopModel: mainLoopModel }) {
  return {
    modelMatch: getCanonicalModelId(e.model) === getCanonicalModelId(mainLoopModel),
    growthTokens: Tp(messages) - e.preCompactTokens,
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
/**
 * 记录丢弃预计算结果。
 */
//@ chunk-e6aww6q8.js:2474680-2475162 placement
function logPrecomputeDiscarded(e, n, r, s) {
  (logEvent("tengu_precomputed_compact_discarded", {
    reason: fromEnum(n),
    ageMs: Math.round(performance.now() - e.startedAt),
    readyDurationMs: e.readyDurationMs,
    rehydrated: e.rehydrated === !0,
    ...(e.armTrigger === "idle" && { armTrigger: lit_2("idle") }),
    preCompactTokens: e.preCompactTokens,
    ...s,
    ...(r !== void 0 && { querySource: agentTypeForTelemetry(r) }),
  }),
    logForDebugging(
      `precomputed compact: discarded (${n}, age ${Math.round(performance.now() - e.startedAt)}ms${s === void 0 ? "" : `, ~${s.postSwapTokens} tok against ${s.thresholdTokens}`})`,
    ));
}
/**
 * 丢弃某代理的预计算：中止进行中的任务、删除侧车文件、记录原因。
 */
//@ chunk-e6aww6q8.js:2475162-2475490 placement
function discardPrecompute(e, n, r, s, h) {
  let y = Oje(n),
    S = e.get(y);
  if (S?.status === "ready") logPrecomputeDiscarded(S, r, s);
  (S?.abortController.abort(new DOMException(r, "AbortError")), e.remove(y), deleteReadySidecar(e, S, h));
  let w = y === "main" ? getSessionId() : void 0;
  if (w !== void 0 && e.hasAttemptedRehydrate(w) && xve())
    e.enqueueSidecarIo(() => deletePrecomputed(w, h), logError);
  if (r === "subagent_exit") e.forgetSubagentTelemetry(y);
}
/**
 * 切换模型时中止进行中的主线程预计算。
 */
//@ chunk-e6aww6q8.js:2475490-2475667 placement
function abortPrecomputeOnModelSwitch(e) {
  let n = Oje(void 0),
    r = e.get(n);
  if (r === void 0 || r.status === "ready") return;
  let s = "model_switch";
  (r.abortController.abort(new DOMException(s, "AbortError")), e.remove(n));
}

export {
  precomputeResumeHooks,
  loadPrecomputedCompact,
  MGt,
  prefetchPrecomputedSidecar,
  isPrecomputedCompactEnabled,
  discardPrecompute,
  manuallyExtractSessionMemory,
  mJn,
  applyPrecomputedCompact,
  shouldArmPrecompute,
  latchArmGate,
  armPrecomputedCompact,
  abortPrecomputeOnModelSwitch,
  awaitInflightPrecompute,
  logManualPrecomputeConsumed,
  Nmn,
  checkPrecomputeCoverage,
  logPrecomputeDiscarded,
  logManualPrecomputeApplied,
};
