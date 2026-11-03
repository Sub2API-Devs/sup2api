/**
 * utils/plugins/syncTrash.ts
 *
 * 2.1.316 新增：同步回收站
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-e6aww6q8.js (8)
 * attribution: placement 8
 */
import {
  createHash,
  createHash as createHash_2,
  createHash as createHash_3,
  createHash as createHash_4,
  createHash as createHash_5,
  createHash as createHash_6,
  createHash as createHash_7,
  createHash as createHash_8,
  createHash as createHash_9,
  createHash as createHash_10,
  createHash as createHash_11,
  createHash as createHash_12,
  createHash as createHash_13,
  createHash as createHash_14,
  createHash as createHash_15,
  createHash as createHash_16,
  createHash as createHash_17,
  createHash as createHash_18,
  createHash as createHash_19,
  createHash as createHash_20,
  createHash as createHash_21,
  createHash as createHash_22,
  createHash as createHash_23,
  createHash as createHash_24,
} from "crypto";
import {
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
} from "path";
import {
  readdir,
  readdir as readdir_2,
  readdir as readdir_3,
  readdir as readdir_4,
  readdir as readdir_5,
  readdir as readdir_6,
  readdir as readdir_7,
  readdir as readdir_8,
  readdir as readdir_9,
  readdir as readdir_10,
  readdir as readdir_11,
  readdir as readdir_12,
  readdir as readdir_13,
  readdir as readdir_14,
  readdir as readdir_15,
  readdir as readdir_16,
  readdir as readdir_17,
  readdir as readdir_18,
  readdir as readdir_19,
  readdir as readdir_20,
  readdir as readdir_21,
  readdir as readdir_22,
  readdir as readdir_23,
  readdir as readdir_24,
  readdir as readdir_25,
  readdir as readdir_26,
  readdir as readdir_27,
  readdir as readdir_28,
  readdir as readdir_29,
  readdir as readdir_30,
  readdir as readdir_31,
  readdir as readdir_32,
} from "fs/promises";
import { HostScoped } from "../hostScoped.js";
import { cU, DFe } from "./syncedItems.js";
import { getRootSession } from "../../bootstrap/state.js";
import { getFeatureValue_CACHED_MAY_BE_STALE } from "../../services/analytics/growthbook.js";
import { safeResolvePath_2 } from "../fsOperations.js";
import { isFreshTimestamp } from "./pluginCachePaths.js";
import { removeDirectoryTreeNoFollow, classifyDirEntry } from "../fsRemove.js";
import { Zce } from "../claudeAiSync/syncOwnedRoot.js";
import { logFeatureOk, logFeatureSad } from "../../services/analytics/featureTelemetry.js";
import { logForDiagnosticsNoPII } from "../diagLogs.js";
import { isPluginVersionInUse } from "./inUseMarkers.js";
import { getErrnoCode } from "../errors.js";
import { isUnavailableErrorCode } from "../settings/managedEnvKeys.js";
import { sleep } from "../sleep.js";

//@ chunk-e6aww6q8.js:627074-627213 placement
var SYNC_TRASH_MAX_ENTRIES = 3,
  MAX_TRASH_SCAN = 1024,
  TRASH_TTL_MS = 604800000,
  MAX_RETRIES = 5,
  RETRY_DELAY_MS = 100,
  TENGU_LINKED_COCOA = "tengu_linked_cocoa",
  TRASH_ENTRY_NAME_RE = /^(\d+)-\d+-(?:([0-9a-f]{32})-)?[^-]+$/,
  trimQueues = new HostScoped(() => new Map());
//@ chunk-e6aww6q8.js:627213-627314 placement
function hashSyncRootPath(e) {
  return createHash_6("sha256")
    .update(e.startsWith(cU + sep_10) ? DFe(e) : e)
    .digest("hex")
    .slice(0, 32);
}
//@ chunk-e6aww6q8.js:627314-627378 placement
function $Lt(e) {
  return `${Date.now()}-${process.pid}-${hashSyncRootPath(e)}-`;
}
/**
 * 排队修剪同步回收站（合并同一根的请求）。
 */
//@ chunk-e6aww6q8.js:627378-627705 placement
function queueSyncTrashTrim(e, n) {
  let of = trimQueues.of(getRootSession().host),
    s = of.get(e) ?? { running: Promise.resolve({ removed: 0, errors: 0 }) };
  of.set(e, s);
  let h = s.queued ?? {
    justMoved: new Set(),
    countsUntagged: !1,
    outcome: s.running.then(() => ((s.queued = void 0), (s.running = trimSyncTrash(e, h)), s.running)),
  };
  if (((s.queued = h), n === void 0)) h.countsUntagged = !0;
  else h.justMoved.add(n);
  return h.outcome;
}
/**
 * 修剪同步回收站。
 */
//@ chunk-e6aww6q8.js:627705-629280 placement
async function trimSyncTrash(e, { justMoved: justMoved, countsUntagged: countsUntagged }) {
  let s = { removed: 0, errors: 0 };
  try {
    if (!getFeatureValue_CACHED_MAY_BE_STALE(TENGU_LINKED_COCOA, !0)) return s;
    let h = new Map(),
      y = 0;
    for (let Z of await readdir_6(e, { withFileTypes: !0 })) {
      let Se = Z.isDirectory() || safeResolvePath_2(Z) ? TRASH_ENTRY_NAME_RE.exec(Z.name) : null;
      if (Se === null) continue;
      y++;
      let ke = Se[2];
      if (ke !== void 0 || countsUntagged) {
        let we = ke ?? Z.name,
          Ee = h.get(we) ?? [];
        (h.set(we, Ee),
          Ee.push({ entry: Z, movedAtMs: Number(Se[1] ?? 0), justMoved: justMoved.has(Z.name) }));
      }
    }
    let S = [],
      w = [];
    for (let Z of h.values()) {
      let Se = [],
        ke = 0;
      for (let Ee of Z.toSorted(pUe)) {
        let Ae = join_16(e, Ee.entry.name);
        try {
          if (ke >= SYNC_TRASH_MAX_ENTRIES) {
            if (
              isFreshTimestamp(Ee.movedAtMs, TRASH_TTL_MS) ||
              (await retryOnBusy(s, () => isTrashEntryInUse(e, Ee.entry)))
            )
              Se.push(Ee);
            else (await retryOnBusy(s, () => removeDirectoryTreeNoFollow(Ae)), s.removed++);
            continue;
          }
          if (Z.length > SYNC_TRASH_MAX_ENTRIES) {
            if (!(await retryOnBusy(s, () => classifyDirEntry(e, Ee.entry))).isDirectory) continue;
            if ((await retryOnBusy(s, () => readdir_6(Ae))).length === 0) continue;
          }
          if ((ke++, ke === 1)) S.push(Ee);
          else Se.push(Ee);
        } catch (error) {
          Zce(s, error);
        }
      }
      let last = Se.findLast((Ee) => isFreshTimestamp(Ee.movedAtMs, TRASH_TTL_MS));
      for (let Ee of Se)
        if (Ee === last) S.push(Ee);
        else w.push(Ee);
    }
    let max = Math.max(0, S.length + w.length - MAX_TRASH_SCAN),
      filtered = S.filter((Z) => !Z.justMoved && !isFreshTimestamp(Z.movedAtMs, TRASH_TTL_MS)),
      q = [];
    for (let Z of [...w.toSorted(pUe).toReversed(), ...filtered.toSorted(pUe).toReversed()]) {
      if (max === 0) break;
      try {
        if (await retryOnBusy(s, () => isTrashEntryInUse(e, Z.entry))) {
          q.push(Z);
          continue;
        }
        (await retryOnBusy(s, () => removeDirectoryTreeNoFollow(join_16(e, Z.entry.name))), s.removed++);
      } catch (error) {
        Zce(s, error);
      }
      max--;
    }
    for (let Z of q.slice(0, max))
      try {
        (await retryOnBusy(s, () => removeDirectoryTreeNoFollow(join_16(e, Z.entry.name))), s.removed++);
      } catch (error) {
        Zce(s, error);
      }
    if (s.removed > 0) logFeatureOk("sync_trash_trim", { removed_count: s.removed, total: y - s.removed });
  } catch (error) {
    Zce(s, error);
  }
  if (s.failure !== void 0)
    (logForDiagnosticsNoPII("warn", "sync_trash_trim_failed", { code: s.failure }),
      logFeatureSad("sync_trash_trim", s.failure));
  return s;
}
//@ chunk-e6aww6q8.js:629280-629543 placement
async function isTrashEntryInUse(e, n) {
  if (!(await classifyDirEntry(e, n)).isDirectory) return !1;
  let r = join_16(e, n.name);
  for (let s of await readdir_6(r, { withFileTypes: !0 }))
    if (
      (await classifyDirEntry(r, s)).isDirectory &&
      (await isPluginVersionInUse(join_16(r, s.name)).catch(
        () => (logForDiagnosticsNoPII("warn", "sync_trash_in_use_probe_failed"), !0),
      ))
    )
      return !0;
  return !1;
}
//@ chunk-e6aww6q8.js:629543-629706 placement
async function retryOnBusy(e, n) {
  for (let r = 1; ; r++)
    try {
      return await n();
    } catch (error) {
      let h = getErrnoCode(error);
      if (r === MAX_RETRIES || e.failure !== void 0 || !(h === "ENOTEMPTY" || isUnavailableErrorCode(h)))
        throw error;
      await sleep(r * RETRY_DELAY_MS);
    }
}
//@ chunk-e6aww6q8.js:629706-629796 placement
function pUe(e, n) {
  return Number(n.justMoved) - Number(e.justMoved) || n.movedAtMs - e.movedAtMs;
}

export { queueSyncTrashTrim, $Lt };
