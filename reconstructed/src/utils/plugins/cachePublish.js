/**
 * utils/plugins/cachePublish.ts
 *
 * 2.1.316 新增：插件缓存发布
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-e6aww6q8.js (15)
 * attribution: placement 15
 */
import {
  basename,
  basename as basename_2,
  basename as basename_3,
  basename as basename_4,
  basename as basename_5,
  basename as basename_6,
  basename as basename_7,
  basename as basename_8,
  basename as basename_9,
  basename as basename_10,
  basename as basename_11,
  basename as basename_12,
  basename as basename_13,
  basename as basename_14,
  basename as basename_15,
  basename as basename_16,
  basename as basename_17,
  basename as basename_18,
  basename as basename_19,
  basename as basename_20,
  basename as basename_21,
  basename as basename_22,
  basename as basename_23,
  basename as basename_24,
  basename as basename_25,
  basename as basename_26,
  basename as basename_27,
  basename as basename_28,
  basename as basename_29,
  basename as basename_30,
  basename as basename_31,
  basename as basename_32,
  basename as basename_33,
  basename as basename_34,
  basename as basename_35,
  basename as basename_36,
  basename as basename_37,
  basename as basename_38,
  basename as basename_39,
  basename as basename_40,
  basename as basename_41,
  basename as basename_42,
  basename as basename_43,
  basename as basename_45,
  basename as basename_46,
  basename as basename_47,
  basename as basename_48,
  basename as basename_49,
  basename as basename_50,
  basename as basename_51,
  basename as basename_52,
  basename as basename_53,
  basename as basename_54,
  basename as basename_55,
  basename as basename_56,
  basename as basename_57,
  basename as basename_58,
  basename as basename_59,
  basename as basename_60,
  basename as basename_61,
  basename as basename_62,
  basename as basename_63,
  basename as basename_64,
  basename as basename_65,
  basename as basename_66,
  basename as basename_67,
  basename as basename_68,
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
} from "path";
import {
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
  rm as rm_2,
  rm as rm_2_2,
  rm as rm_3,
  rm as rm_4,
  rm as rm_5,
  rm as rm_6,
  rm as rm_7,
  rm as rm_8,
  rm as rm_9,
  rm as rm_10,
  rm as rm_11,
  rm as rm_12,
  rm as rm_13,
  rm as rm_14,
  rm as rm_15,
  rm as rm_16,
  rm as rm_17,
  rm as rm_18,
  rm as rm_19,
  rm as rm_20,
  rm as rm_21,
  rm as rm_22,
  rm as rm_23,
  rm as rm_24,
  rm as rm_25,
  rm as rm_26,
  rm as rm_27,
  lutimes,
  lutimes as lutimes_2,
  lutimes as lutimes_3,
  lutimes as lutimes_4,
  lutimes as lutimes_5,
  lutimes as lutimes_6,
} from "fs/promises";
import {
  randomBytes,
  randomBytes as randomBytes_2,
  randomBytes as randomBytes_3,
  randomBytes as randomBytes_4,
  randomBytes as randomBytes_5,
  randomBytes as randomBytes_6,
  randomBytes as randomBytes_7,
  randomBytes as randomBytes_8,
  randomBytes as randomBytes_9,
  randomBytes as randomBytes_10,
  randomBytes as randomBytes_11,
  randomBytes as randomBytes_12,
  randomBytes as randomBytes_13,
  randomBytes as randomBytes_14,
} from "crypto";
import { c5t } from "./pluginDirectories.js";
import {
  anchoredPluginCachePath,
  requireVersionParentContained,
  versionParentState,
  clearOccupantForReplace,
  versionParentContained,
} from "./pluginLoader.js";
import { STORAGE_SPACES, sDn } from "../storage/storageSpaces.js";
import { R1 } from "./cacheUtils.js";
import { logForDebugging } from "../debug.js";
import { formatStorageError, ASIDESTRANDED } from "../storage/storageErrors.js";
import { removeDirectoryTreeNoFollow } from "../fsRemove.js";
import {
  getErrnoCode,
  TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS,
  errorMessage,
  isPathAbsent,
} from "../errors.js";
import { isStorageV5Enabled } from "../hoverRest.js";
import { hasLinkedAncestorBelow, makeTempSiblingName, Upe } from "./pluginCacheMaterialize.js";
import { retryFsOp } from "../atomicPublishWrite.js";
import { getFsImplementation } from "../fsOperations.js";
import { swapVersionDir } from "./versionDirSwap.js";
import { isPluginZipCacheEnabled } from "./zipCache.js";

//@ chunk-e6aww6q8.js:4483311-4483405 placement
function mbs(e, n) {
  if (e === void 0) return;
  let r = c5t(n, anchoredPluginCachePath());
  return r === null ? void 0 : { from: e, to: r };
}
/**
 * 通过 v5 存储后端删除暂存插件版本目录里残留的孤儿标记（R1），失败只记 warn。
 */
//@ chunk-e6aww6q8.js:4483405-4483610 placement
async function dropStagedOrphanMarkerV5(e, n) {
  let r = await e.delete(STORAGE_SPACES.pluginCache(n.marketplace, n.plugin, n.version, [R1]));
  if (!r.ok)
    logForDebugging(
      `Could not drop a stray orphan marker from the staged plugin: ${formatStorageError(r.error)}`,
      { level: "warn" },
    );
}
/**
 * 识别“移到一边后搁浅”（ASIDESTRANDED）的发布失败：cause 带 path 且 entry 为 occupant 时返回 {aside, remove}， remove 表示没有 folderError、可以删除该 aside 目录；其他情况返回 undefined。
 */
//@ chunk-e6aww6q8.js:4483610-4484001 placement
function getAsideStrandedCleanup(e) {
  if (
    e.code !== "Failed" ||
    !("telemetryCode" in e) ||
    e.telemetryCode !== ASIDESTRANDED ||
    !(e.cause instanceof Error) ||
    ("moveError" in e.cause && e.cause.moveError !== void 0)
  )
    return;
  let cause = e.cause,
    r = "path" in cause ? cause.path : void 0,
    s = "entry" in cause ? cause.entry : void 0;
  if (typeof r !== "string") return;
  if (s === void 0) return;
  if (s !== "occupant") return;
  let h = "folderError" in cause && cause.folderError !== void 0;
  return { aside: r, remove: !h };
}
//@ chunk-e6aww6q8.js:4484001-4484736 placement
async function removeReplacedVersionAside(e, n) {
  let r = basename_63(e);
  if (e !== join_123(dirname_71(n), r) || !sDn(r)) {
    logForDebugging(
      `A publish that stood named a set-aside at ${e}; it is not an aside name beside the published version, so it is left in place`,
      { level: "debug" },
    );
    return;
  }
  try {
    let [s, h] = await Promise.all([lstat_39(e, { bigint: !0 }), lstat_39(n, { bigint: !0 })]);
    if (!(
      s.isDirectory() &&
      h.isDirectory() &&
      s.ino !== 0n &&
      h.ino !== 0n &&
      (s.dev !== h.dev || s.ino !== h.ino)
    )) {
      logForDebugging(
        `A publish that stood left the replaced plugin version set aside at ${e}; it could not be proven distinct from the published version, so it is left in place`,
        { level: "debug" },
      );
      return;
    }
    await removeDirectoryTreeNoFollow(e);
  } catch (error) {
    logForDebugging(
      `Could not remove a replaced plugin version set aside by a publish that stood: ${error instanceof Error ? error.message : String(error)}`,
      { level: "debug" },
    );
  }
}
//@ chunk-e6aww6q8.js:4484736-4484925 placement
function isUnsupportedSwapError(e) {
  return (
    e.code === "InvalidArgument" ||
    (e.code === "Failed" &&
      "telemetryCode" in e &&
      (e.telemetryCode === "IdentityUnavailable" ||
        e.telemetryCode === "ENOTDIR" ||
        e.telemetryCode === "EXDEV"))
  );
}
//@ chunk-e6aww6q8.js:4484925-4485103 placement
function isTargetOccupiedError(e) {
  return (
    e.code === "Failed" &&
    "telemetryCode" in e &&
    (e.telemetryCode === "ENOTEMPTY" ||
      e.telemetryCode === "EEXIST" ||
      e.telemetryCode === "EPERM" ||
      e.telemetryCode === "EISDIR")
  );
}
//@ chunk-e6aww6q8.js:4485103-4485702 placement
function refuseSymlinkedCacheTarget(e, n) {
  if (e.code === "Failed" && e.cause instanceof Error) {
    let cause = e.cause,
      s = "path" in cause ? cause.path : void 0;
    if (getErrnoCode(cause) === "ELOOP" && typeof s === "string")
      return Object.assign(
        new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
          `Cannot install into ${n}: ${s} is a symbolic link, and the plugin cache is not written through symbolic links`,
          "refused to publish a staged plugin through a symlinked cache folder (v5 backend)",
        ),
        { code: "ELOOP", path: s, cause: cause },
      );
    if (getErrnoCode(cause) !== void 0) return cause;
  }
  return Object.assign(
    new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
      `Failed to move the staged plugin into ${n}: ${formatStorageError(e)}`,
      "failed to move the staged plugin into its versioned cache (v5 backend error)",
    ),
    { cause: e },
  );
}
//@ chunk-e6aww6q8.js:4485702-4485893 placement
async function dropStagedOrphanMarker(e) {
  try {
    await rm_26(join_123(e, R1), { force: !0 });
  } catch (error) {
    logForDebugging(
      `Could not drop a stray orphan marker from the staged plugin: ${error instanceof Error ? error.message : String(error)}`,
      { level: "warn" },
    );
  }
}
//@ chunk-e6aww6q8.js:4485893-4486097 placement
function toProbeError(e, n) {
  return e.code === "Failed" && e.cause instanceof Error
    ? e.cause
    : Object.assign(
        new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
          `Failed to probe ${n}: ${formatStorageError(e)}`,
          "failed to probe an installed plugin path (v5 backend error)",
        ),
        { cause: e },
      );
}
//@ chunk-e6aww6q8.js:4486097-4486139 placement
function kbs(e) {
  return getErrnoCode(e) === "EXDEV" || !1;
}
/**
 * 把暂存的插件发布到缓存版本目录，处理替换旧版本与存储接口失败。
 */
//@ chunk-e6aww6q8.js:4486139-4487907 placement
async function publishStagedPlugin(e, n, r, s, h) {
  if (isStorageV5Enabled() && s !== void 0 && h !== void 0) {
    if (!(await hasLinkedAncestorBelow(n, anchoredPluginCachePath()))) {
      await dropStagedOrphanMarkerV5(s, h.from);
      let moveScope = await s.moveScope(h.from, h.to, { replace: !0 });
      if (moveScope.ok) return "published";
      let ke = getAsideStrandedCleanup(moveScope.error);
      if (ke !== void 0) {
        if (ke.remove) await removeReplacedVersionAside(ke.aside, n);
        else
          logForDebugging(
            `A publish that stood left the replaced plugin version set aside at ${ke.aside}; its folder was found changed, so it is left in place`,
            { level: "debug" },
          );
        return "published";
      }
      if (!isUnsupportedSwapError(moveScope.error)) throw refuseSymlinkedCacheTarget(moveScope.error, n);
      logForDebugging(
        `The storage interface could not publish into ${n} (${formatStorageError(moveScope.error)}); moving the staged plugin with today's file calls instead`,
        { level: "debug" },
      );
    }
  }
  await dropStagedOrphanMarker(e);
  let y = e.endsWith(sep_69) ? e : e + sep_69,
    startsWith = n.startsWith(y),
    w = join_123(dirname_71(e), `.claude-plugin-temp-${Date.now()}-${randomBytes_11(4).toString("hex")}`);
  if (!r.strictCache) {
    if (
      (await removeDirectoryTreeNoFollow(join_123(e, ".git")).catch((Se) => {
        logForDebugging(
          `Could not drop the staged clone's .git before publishing ${n}; this install replaces any installed copy instead of keeping it: ${errorMessage(Se)}`,
          { level: "warn" },
        );
      }),
      startsWith)
    )
      await retryFsOp(e, w);
    return (
      await getFsImplementation().mkdir(dirname_71(n)),
      swapVersionDir(startsWith ? w : e, n, {
        keepIdentical: !isPluginZipCacheEnabled(),
        binariesHook: r.binariesHook,
      })
    );
  }
  let L = (Se = "before move", ke) =>
      requireVersionParentContained(n, r.pluginId, r.version, "cache", Se, ke),
    G = await versionParentState(n);
  if (G === "refused") await L("before move", G);
  (await getFsImplementation().mkdir(dirname_71(n)), await L());
  let q;
  if ((await clearOccupantForReplace(n, r.pluginId, r.version)) === "recurse") {
    let Se = makeTempSiblingName(n);
    try {
      (await retryFsOp(n, Se), (q = Se));
      let date = new Date();
      await lutimes_5(Se, date, date).catch(() => {});
    } catch (error) {
      if (kbs(error))
        (logForDebugging(
          `The occupant of ${n} cannot be renamed aside (${getErrnoCode(error)}); removing it in place instead`,
          { level: "debug" },
        ),
          await removeDirectoryTreeNoFollow(n));
      else if (!isPathAbsent(error)) throw error;
    }
  }
  let Z = e;
  try {
    if (startsWith) (await retryFsOp(e, w), await getFsImplementation().mkdir(dirname_71(n)), (Z = w));
    (await L("during move"), await retryFsOp(Z, n));
  } catch (error) {
    if (q !== void 0) await retryFsOp(q, n).catch(() => {});
    throw error;
  }
  if (q !== void 0) await removeDirectoryTreeNoFollow(q).catch(() => {});
  return "published";
}
//@ chunk-e6aww6q8.js:4487907-4488691 placement
async function adoptStagedPlugin(e, n, r, s, h) {
  if (isStorageV5Enabled() && s !== void 0 && h !== void 0)
    if (await hasLinkedAncestorBelow(n, anchoredPluginCachePath())) await dropStagedOrphanMarker(e);
    else {
      await dropStagedOrphanMarkerV5(s, h.from);
      let moveScope = await s.moveScope(h.from, h.to);
      if (moveScope.ok) return moveScope.value.published;
      if (!isUnsupportedSwapError(moveScope.error) && !isTargetOccupiedError(moveScope.error))
        throw refuseSymlinkedCacheTarget(moveScope.error, n);
      logForDebugging(
        `The storage interface could not adopt into ${n} (${formatStorageError(moveScope.error)}); deciding with today's file calls instead`,
        { level: "debug" },
      );
    }
  if (r && (await versionParentState(n)) === "refused") return !1;
  if ((await getFsImplementation().mkdir(dirname_71(n)), r)) {
    if (!(await versionParentContained(n))) return !1;
    if (
      await lstat_39(n).then(
        () => !0,
        (S) => {
          if (isPathAbsent(S)) return !1;
          throw Upe(
            `Could not move the staged plugin into ${n}: what occupies that cache path could not be examined; retry the install.`,
          );
        },
      )
    )
      return !1;
  }
  try {
    return (await retryFsOp(e, n), !0);
  } catch (error) {
    let S = getErrnoCode(error);
    if (S === "ENOTEMPTY" || S === "EEXIST" || S === "EPERM" || S === "EISDIR") return !1;
    throw error;
  }
}
//@ chunk-e6aww6q8.js:4488691-4488762 placement
class i5 extends TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS {
  reason;
  constructor(e, n, r) {
    super(n, r);
    this.reason = e;
  }
}
/**
 * 安装依赖时，钉住的版本不满足要求的版本范围抛出；manifestVersion 记录实际 manifest 版本。
 */
//@ chunk-e6aww6q8.js:4488762-4488909 placement
class PinnedVersionMismatchError extends Error {
  manifestVersion;
  constructor(e) {
    super("pinned version does not satisfy the required version range");
    this.manifestVersion = e;
  }
}
//@ chunk-e6aww6q8.js:4488909-4488920 placement
var vbs = 16;

export { PinnedVersionMismatchError, i5, toProbeError, mbs, adoptStagedPlugin, publishStagedPlugin, vbs };
