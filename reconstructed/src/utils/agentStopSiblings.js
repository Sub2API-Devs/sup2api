/**
 * utils/agentStopSiblings.ts
 *
 * 2.1.316 新增：停止同级代理
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-e6aww6q8.js (13)
 * attribution: placement 13
 */
import {
  mkdir,
  mkdir as mkdir_2,
  mkdir as mkdir_3,
  mkdir as mkdir_4,
  mkdir as mkdir_5,
  mkdir as mkdir_6,
  mkdir as mkdir_7,
  mkdir as mkdir_8,
  mkdir as mkdir_9,
  mkdir as mkdir_10,
  mkdir as mkdir_11,
  mkdir as mkdir_12,
  mkdir as mkdir_13,
  mkdir as mkdir_14,
  mkdir as mkdir_15,
  mkdir as mkdir_16,
  mkdir as mkdir_17,
  mkdir as mkdir_18,
  mkdir as mkdir_19,
  mkdir as mkdir_20,
  mkdir as mkdir_21,
  mkdir as mkdir_22,
  mkdir as mkdir_23,
  mkdir as mkdir_24,
  mkdir as mkdir_25,
  mkdir as mkdir_26,
  lstat,
  lstat as lstat_2,
  lstat as lstat_3,
  lstat as lstat_4,
  lstat as lstat_5,
  lstat as lstat_6,
  lstat as lstat_7,
  lstat as lstat_8,
  lstat as lstat_9,
  lstat as lstat_10,
  lstat as lstat_11,
  lstat as lstat_12,
  lstat as lstat_13,
  lstat as lstat_14,
  lstat as lstat_15,
  lstat as lstat_16,
  lstat as lstat_17,
  lstat as lstat_18,
  lstat as lstat_19,
  lstat as lstat_20,
  lstat as lstat_21,
  lstat as lstat_22,
  lstat as lstat_23,
  lstat as lstat_24,
  lstat as lstat_25,
  lstat as lstat_26,
  lstat as lstat_27,
  lstat as lstat_28,
  lstat as lstat_29,
  lstat as lstat_30,
  lstat as lstat_31,
  lstat as lstat_32,
  lstat as lstat_33,
  lstat as lstat_34,
  lstat as lstat_35,
  lstat as lstat_36,
  lstat as lstat_37,
  lstat as lstat_38,
  lstat as lstat_39,
  lstat as lstat_40,
  lstat as lstat_41,
  lstat as lstat_42,
  lstat as lstat_43,
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
} from "path";
import {
  sanitizeErrnoTokenForTelemetry,
  getErrnoCode,
  storageCauseErrnoCode,
  isPathAbsent,
} from "./errors.js";
import { isStoreError } from "./storage/storageErrors.js";
import { sleep } from "./sleep.js";
import { ge } from "./identity.js";
import { isStorageV5Enabled } from "./hoverRest.js";
import { pathToSessionSideKey } from "./storage/storageKeys.js";
import { isDiskless } from "../bootstrap/state.js";
import { writeNewFile, retryTransient } from "./atomicPublishWrite.js";
import { runWithFileWriteContext } from "./file.js";
import { logError } from "./log.js";
import { logForDebugging } from "./debug.js";
import { UC } from "./agentMetadata.js";
import { logFeatureSad, logFeatureOk, logFeatureBad } from "../services/analytics/featureTelemetry.js";

//@ chunk-e6aww6q8.js:217569-217677 placement
var STOP_SIBLING_SUFFIXES = { stoppedByUser: ".stopped-by-user", observerStopped: ".observer-stopped" },
  FOLD_BACK_DELAYS_MS = [50, 50, 50, 250, 1000, 4000];
//@ chunk-e6aww6q8.js:217677-217772 placement
function $$e(e, n) {
  let r = sanitizeErrnoTokenForTelemetry(getErrnoCode(n) ?? storageCauseErrnoCode(n));
  return { observer: e === "observerStopped", ...(r && { errno: r }) };
}
//@ chunk-e6aww6q8.js:217772-217979 placement
function isUnexpectedStopError(e) {
  let n = getErrnoCode(e) ?? storageCauseErrnoCode(e);
  if (n !== void 0) return n.startsWith("ERR_");
  let r = e instanceof Error ? e.cause : void 0;
  return !(
    isStoreError(r) &&
    (r.code === "Unavailable" || ("telemetryCode" in r && r.telemetryCode !== void 0))
  );
}
/**
 * 停止标记相关的缓存表（重置时清空）。
 */
//@ chunk-e6aww6q8.js:217979-218084 placement
var sleepUnref = (e) => sleep(e, void 0, { unref: !0 }),
  stopSiblingCache = ge(new Map(), (e) => e.clear()),
  foldBackGeneration = ge({ passed: 0 }, (e) => {
    e.passed += 1;
  });
//@ chunk-e6aww6q8.js:218084-218120 placement
function w9(e) {
  return stopSiblingCache.get(e) ?? 0;
}
//@ chunk-e6aww6q8.js:218120-218178 placement
function T9(e, n) {
  return e.replace(/\.meta\.json$/, STOP_SIBLING_SUFFIXES[n]);
}
//@ chunk-e6aww6q8.js:218178-218232 placement
function B$e(e, n) {
  return isStorageV5Enabled() && n !== void 0 ? pathToSessionSideKey(e) : void 0;
}
/**
 * 写入子代理停止标记：有存储键时用存储 ifAbsent 写空内容；无盘模式报错；否则创建目录并新建空文件（已存在视为成功）。
 */
//@ chunk-e6aww6q8.js:218232-218638 placement
async function writeStopSibling(e, n) {
  let r = B$e(e, n);
  if (n !== void 0 && r !== void 0) {
    let write = await n.write(r, "", { precondition: { type: "ifAbsent" } });
    if (!write.ok && write.error.code !== "AlreadyExists")
      throw Error("agent stop sibling: storage write failed", { cause: write.error });
    return;
  }
  if (isDiskless()) throw Error("agent stop sibling: no storage key while diskless");
  (await mkdir_2(dirname_2(e), { recursive: !0 }),
    await writeNewFile(e, "").catch((s) => {
      if (getErrnoCode(s) !== "EEXIST") throw s;
    }));
}
/**
 * 判断子代理停止标记是否存在：优先查存储元数据，无盘时返回 false（存储 v5 下缺键报错），否则查本地文件。
 */
//@ chunk-e6aww6q8.js:218638-219009 placement
async function stopSiblingExists(e, n) {
  let r = B$e(e, n);
  if (n !== void 0 && r !== void 0) {
    let statMeta = await n.statMeta(r);
    if (!statMeta.ok && statMeta.error.code !== "NotFound")
      throw Error("agent stop sibling: storage stat failed", { cause: statMeta.error });
    return statMeta.ok;
  }
  if (isDiskless()) {
    if (n !== void 0 && isStorageV5Enabled()) throw Error("agent stop sibling: no storage key for this path");
    return !1;
  }
  return lstat_2(e).then(
    () => !0,
    (s) => {
      if (isPathAbsent(s)) return !1;
      throw s;
    },
  );
}
/**
 * 删除子代理停止标记（存储或本地文件，不存在视为成功）。
 */
//@ chunk-e6aww6q8.js:219009-219255 placement
async function removeStopSibling(e, n) {
  let r = B$e(e, n);
  if (n !== void 0 && r !== void 0) {
    let s = await n.delete(r);
    if (!s.ok) throw Error("agent stop sibling: storage delete failed", { cause: s.error });
    return;
  }
  if (isDiskless()) return;
  await retryTransient(() => unlink_2(e)).catch((s) => {
    if (!isPathAbsent(s)) throw s;
  });
}
//@ chunk-e6aww6q8.js:219255-219431 placement
async function tryFoldBack(e, n, r, s, h) {
  let y = T9(e, n);
  return runWithFileWriteContext(e, async () => {
    if (w9(y) !== h || !(await stopSiblingExists(y, r))) return "gone";
    return (await s()) ? "merged" : { again: void 0 };
  }).catch((S) => ({ again: S }));
}
/**
 * 按延迟表多次尝试把子代理的停止结果并回父记录；每次等待后若世代变化则放弃，用尽后记日志与遥测。
 */
//@ chunk-e6aww6q8.js:219431-219888 placement
async function scheduleFoldBack(
  e,
  n,
  r,
  s,
  h,
  y = w9(T9(e, n)),
  [S, ...w] = FOLD_BACK_DELAYS_MS,
  L,
  G = foldBackGeneration.passed,
) {
  if (S === void 0) {
    let Z = $$e(n, L);
    if (L !== void 0 && isUnexpectedStopError(L)) logError(L);
    else if (L !== void 0)
      logForDebugging(`[agent stop] the fold-back of ${n} into ${e} gave up: ${UC(L)}`, { level: "warn" });
    logFeatureSad("subagent_stop_fold_back", "schedule_spent", Z);
    return;
  }
  if ((await h(S), foldBackGeneration.passed !== G)) return;
  let q = await tryFoldBack(e, n, r, s, y);
  if (typeof q === "object") await scheduleFoldBack(e, n, r, s, h, y, w, q.again, G);
  else if (q === "merged") logFeatureOk("subagent_stop_fold_back");
}
/**
 * 持久化子代理停止状态。
 */
//@ chunk-e6aww6q8.js:219888-220628 placement
async function persistSubagentStop(e, n, r, s, h, y = sleepUnref) {
  let S = T9(e, n),
    w = w9(S),
    L = await (async () => r())().then(
      () => {
        return;
      },
      (Z) => ({ error: Z }),
    );
  if (L === void 0) {
    logFeatureOk("subagent_stop_persist");
    return;
  }
  let G = $$e(n, L.error);
  if (isUnexpectedStopError(L.error)) logError(L.error);
  logForDebugging(`[agent stop] ${e} did not take ${n}: ${UC(L.error)}`, { level: "warn" });
  let q = await runWithFileWriteContext(e, async () => {
    if (w9(S) !== w) return "revived";
    return (await writeStopSibling(S, h), "created");
  }).catch((Z) => ({ error: Z }));
  if (q === "revived") {
    logFeatureSad("subagent_stop_persist", "overtaken_by_revival", G);
    return;
  }
  if (q !== "created") {
    let Z = $$e(n, q.error);
    if ((logFeatureBad("subagent_stop_persist", "not_persisted", Z), isUnexpectedStopError(q.error)))
      logError(q.error);
    logForDebugging(`[agent stop] nor did a file beside ${e}: ${UC(q.error)}`, { level: "warn" });
    return;
  }
  (logFeatureSad("subagent_stop_persist", "kept_beside_sidecar", G), scheduleFoldBack(e, n, h, s, y, w));
}

export { stopSiblingExists, T9, stopSiblingCache, w9, removeStopSibling, persistSubagentStop };
