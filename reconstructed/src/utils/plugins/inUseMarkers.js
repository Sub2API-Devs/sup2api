/**
 * utils/plugins/inUseMarkers.ts
 *
 * 2.1.316 新增：插件使用中标记
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-e6aww6q8.js (34)
 * attribution: placement 34
 */
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
  rmdir,
  rmdir as rmdir_2,
  rmdir as rmdir_3,
  rmdir as rmdir_4,
  rmdir as rmdir_5,
  rmdir as rmdir_6,
  rmdir as rmdir_7,
  realpath,
  realpath as realpath_2,
  realpath as realpath_3,
  realpath as realpath_4,
  realpath as realpath_5,
  realpath as realpath_6,
  realpath as realpath_7,
  realpath as realpath_8,
  realpath as realpath_9,
  realpath as realpath_10,
  realpath as realpath_11,
  realpath as realpath_12,
  realpath as realpath_13,
  realpath as realpath_14,
  realpath as realpath_15,
  realpath as realpath_16,
  realpath as realpath_17,
  realpath as realpath_18,
  realpath as realpath_19,
  realpath as realpath_20,
  realpath as realpath_21,
  realpath as realpath_22,
  realpath as realpath_23,
  realpath as realpath_24,
  realpath as realpath_25,
  realpath as realpath_26,
  realpath as realpath_27,
  realpath as realpath_28,
  realpath as realpath_29,
  realpath as realpath_30,
  realpath as realpath_31,
  realpath as realpath_32,
  realpath as realpath_33,
  realpath as realpath_34,
  realpath as realpath_35,
  realpath as realpath_36,
  realpath as realpath_37,
  realpath as realpath_38,
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
  readFile,
  readFile as readFile_2,
  readFile as readFile_3,
  readFile as readFile_4,
  readFile as readFile_5,
  readFile as readFile_6,
  readFile as readFile_7,
  readFile as readFile_8,
  readFile as readFile_9,
  readFile as readFile_10,
  readFile as readFile_11,
  readFile as readFile_12,
  readFile as readFile_13,
  readFile as readFile_14,
  readFile as readFile_15,
  readFile as readFile_16,
  readFile as readFile_17,
  readFile as readFile_18,
  readFile as readFile_19,
} from "fs/promises";
import {
  readdirSync,
  readdirSync as readdirSync_2,
  readdirSync as readdirSync_3,
  readdirSync as readdirSync_4,
  readdirSync as readdirSync_5,
  unlinkSync,
  unlinkSync as unlinkSync_2,
  realpathSync,
  realpathSync as realpathSync_2,
  realpathSync as realpathSync_3,
  lstatSync,
  lstatSync as lstatSync_2,
  lstatSync as lstatSync_3,
} from "fs";
import { DoctorLazy } from "../../cli/handlers/util.js";
import { create, create_3, create_2 } from "../../../vendor/zod/lib/index.mjs";
import { isStorageV5Enabled } from "../hoverRest.js";
import { logForDebugging } from "../debug.js";
import { qm } from "./cacheUtils.js";
import { formatStorageError } from "../storage/storageErrors.js";
import { isOwnTempName, writeFileAtomic as writeFileAtomic_2 } from "../atomicPublishWrite.js";
import {
  projectPluginsDir,
  PLUGIN_CACHE_DIRNAME,
  projectPluginCacheDir,
  isFreshTimestamp,
} from "./pluginCachePaths.js";
import { getPlatform } from "../platform.js";
import { readJunctionSync, readJunction } from "../fsJunctions.js";
import { isENOENT, getErrnoCode, isFsInaccessible, errorMessage } from "../errors.js";
import { hm } from "../pathPrefix.js";
import { registerCleanup } from "../cleanupRegistry.js";
import { jsonStringify } from "../slowOperations.js";
import {
  procIdentityFields,
  ownProcStartAsync,
  procIdentityOf,
  provenSameProcessAsync,
  isSameProcessAsync,
} from "../processIdentity.js";
import { getPluginRegistry } from "./pluginLoadState.js";
import { removeLinkOrDir, removePathEntry, removeDirectoryTreeNoFollow } from "../fsRemove.js";
import { parseVersionCachePath, xJr } from "./pluginDirectories.js";
import { STORAGE_SPACES } from "../storage/storageSpaces.js";
import { writeFileAndFlush } from "../../components/agents/agentFileUtils.js";
import { atomicMoveToInstallPath_2 } from "../nativeInstaller/installer.js";
import { safeParseJSON } from "../json.js";
import { isProcessRunning as isProcessRunning_2 } from "../genericProcessUtils.js";

//@ chunk-e6aww6q8.js:616264-616382 placement
var IN_USE_LINKS_DIR = ".in_use-links",
  IN_USE_LINK_DEPTH = 3,
  MAX_IN_USE_MARKER_BYTES = 4096,
  InUseMarkerSchema = DoctorLazy(() =>
    create({ pid: create_3(), procStart: create_2().optional(), procStartFt: create_2().optional() }),
  );
/**
 * 退出清理：删除本进程写的 in_use 标记（含 v5 存储项）。
 */
//@ chunk-e6aww6q8.js:616382-616791 placement
async function removeOwnInUseMarkersAsync(e) {
  await Promise.all(
    Array.from(e.ownInUseMarkerPaths).map(async (n) => {
      if (!(await isMarkerDirOurs(dirname_11(n)))) return;
      let r = e.ownInUseMarkerHandles.get(n);
      if (isStorageV5Enabled() && r !== void 0) {
        let h = await r.storageV5.delete(r.key);
        if (!h.ok)
          logForDebugging(`Failed to remove ${qm} marker at exit: ${n}: ${formatStorageError(h.error)}`);
      }
      let s = [];
      try {
        s = await readdir_7(dirname_11(n));
      } catch {}
      for (let h of [...CLt(s, n), basename_4(n)])
        await rm_7(join_17(dirname_11(n), h), { force: !0 }).catch(() => {});
    }),
  );
}
//@ chunk-e6aww6q8.js:616791-617024 placement
function removeOwnInUseMarkersSync(e) {
  for (let ownInUseMarkerPath of e.ownInUseMarkerPaths) {
    if (!scanDirectory(dirname_11(ownInUseMarkerPath))) continue;
    let r = [];
    try {
      r = readdirSync_3(dirname_11(ownInUseMarkerPath));
    } catch {}
    for (let s of [...CLt(r, ownInUseMarkerPath), basename_4(ownInUseMarkerPath)])
      try {
        unlinkSync(join_17(dirname_11(ownInUseMarkerPath), s));
      } catch {}
  }
  (e.ownInUseMarkerPaths.clear(), e.ownInUseMarkerHandles.clear());
}
//@ chunk-e6aww6q8.js:617024-617077 placement
function CLt(e, n) {
  return e.filter((r) => isOwnTempName(r, basename_4(n)));
}
//@ chunk-e6aww6q8.js:617077-617191 placement
async function isMarkerDirOurs(e) {
  if (ALt(e)) return (await classifyLinkDir(e)) === "ours";
  try {
    return (await classifyMarkerPath(e)) === "directory";
  } catch {
    return !1;
  }
}
//@ chunk-e6aww6q8.js:617191-617379 placement = scanDirectory (0.766)
function scanDirectory(dirPath) {
  try {
    if (ALt(dirPath)) {
      let fs = projectPluginsDir();
      return realpathSync(dirPath) === join_17(realpathSync(fs), relative_6(fs, dirPath));
    }
    if (!lstatSync(dirPath).isDirectory()) return !1;
    if (getPlatform() === "windows") return readJunctionSync(dirPath).kind === "directory";
    return !0;
  } catch {
    return !1;
  }
}
/**
 * lstat 判断路径 absent/directory/junk/refused（Windows 拒绝 junction）。
 */
//@ chunk-e6aww6q8.js:617379-617698 placement
async function classifyMarkerPath(e) {
  let n;
  try {
    n = await lstat_7(e);
  } catch (error) {
    if (isENOENT(error)) return "absent";
    throw error;
  }
  if (!n.isDirectory()) return n.isFile() ? "junk" : "refused";
  if (getPlatform() === "windows") {
    let r = await readJunction(e);
    switch (r.kind) {
      case "junction":
        return "refused";
      case "absent":
        return "absent";
      case "error":
        throw r.error;
      case "directory":
        break;
    }
  }
  return "directory";
}
//@ chunk-e6aww6q8.js:617740-617784 placement
function ALt(e) {
  return hm(join_17(projectPluginsDir(), IN_USE_LINKS_DIR), e, !1);
}
//@ chunk-e6aww6q8.js:617784-618049 placement
function registerOwnInUseMarker(e, n, r) {
  if ((e.ownInUseMarkerPaths.add(n), r)) e.ownInUseMarkerHandles.set(n, r);
  else e.ownInUseMarkerHandles.delete(n);
  if (e.inUseMarkerCleanup) return;
  let s = registerCleanup(() => removeOwnInUseMarkersAsync(e)),
    h = () => removeOwnInUseMarkersSync(e);
  (process.on("exit", h),
    (e.inUseMarkerCleanup = () => {
      (s(), process.off("exit", h));
    }));
}
//@ chunk-e6aww6q8.js:618049-618133 placement
function yLt(e, n) {
  (e.ownInUseMarkerPaths.delete(n), e.ownInUseMarkerHandles.delete(n));
}
//@ chunk-e6aww6q8.js:618133-618211 placement
async function KP(e) {
  try {
    return (await lstat_7(e)).isSymbolicLink();
  } catch {
    return !1;
  }
}
//@ chunk-e6aww6q8.js:618211-618359 placement
async function pruneEmptyLinkDirs(e) {
  let n = join_17(projectPluginsDir(), IN_USE_LINKS_DIR),
    r = e;
  for (let s = 0; s < 3; s++) {
    if (!hm(n, r, !1)) return;
    try {
      await rmdir(r);
    } catch (error) {
      if (getErrnoCode(error) !== "ENOENT") return;
    }
    r = dirname_11(r);
  }
}
//@ chunk-e6aww6q8.js:618359-618499 placement
function toInUseLinkPath(e) {
  let n = projectPluginsDir(),
    parts = relative_6(join_17(n, PLUGIN_CACHE_DIRNAME), e).split(sep_11);
  if (parts.length !== 3 || parts.some((s) => s === "" || s === "." || s === "..")) return;
  return join_17(n, IN_USE_LINKS_DIR, ...parts);
}
/**
 * 逐级创建链接目录并检测是否被重定向。
 */
//@ chunk-e6aww6q8.js:618499-618829 placement
async function ensureLinkDirChain(e) {
  let n = projectPluginsDir();
  try {
    let r = await realpath_3(n),
      s = n;
    for (let h of relative_6(n, e).split(sep_11))
      if (
        ((s = join_17(s, h)),
        (r = join_17(r, h)),
        await mkdir_8(s).catch((y) => {
          let S = getErrnoCode(y);
          if (S !== "EEXIST" && S !== "ENOENT") throw y;
        }),
        (await realpath_3(s)) !== r)
      )
        return "redirected";
    return "ours";
  } catch (error) {
    let s = getErrnoCode(error);
    if (s === "ENOENT" || s === "ENOTDIR") return pruneOrReportPlantedEntry(n, e);
    return "undeterminable";
  }
}
//@ chunk-e6aww6q8.js:618829-619096 placement
async function findPlantedEntry(e, n) {
  let r = join_17(e, IN_USE_LINKS_DIR),
    s = e;
  for (let h of relative_6(e, n).split(sep_11)) {
    if (((s = join_17(s, h)), !(s === r || s.startsWith(r + sep_11)))) continue;
    try {
      let y = await lstat_7(s);
      if (y.isSymbolicLink()) return { path: s, kind: "link" };
      if (!y.isDirectory()) return { path: s, kind: "junk" };
    } catch {
      return;
    }
  }
  return;
}
//@ chunk-e6aww6q8.js:619096-619360 placement
async function pruneOrReportPlantedEntry(e, n) {
  let r = await findPlantedEntry(e, n);
  if (r === void 0) return "pruned";
  if (r.kind === "link") return "redirected";
  try {
    await unlink_3(r.path);
  } catch {
    return "undeterminable";
  }
  return (
    logForDebugging(
      `Removed a stray non-directory entry planted in the ${IN_USE_LINKS_DIR} marker tree: ${r.path}`,
    ),
    "pruned"
  );
}
//@ chunk-e6aww6q8.js:619360-619644 placement
async function classifyLinkDir(e) {
  try {
    let n = await realpath_3(e),
      r = join_17(await realpath_3(projectPluginsDir()), relative_6(projectPluginsDir(), e));
    return n === r ? "ours" : "redirected";
  } catch (error) {
    let r = getErrnoCode(error);
    if (r === "ENOENT" || r === "ENOTDIR") {
      let s = await findPlantedEntry(projectPluginsDir(), e);
      return s === void 0 ? "absent" : s.kind === "link" ? "redirected" : "undeterminable";
    }
    return "undeterminable";
  }
}
//@ chunk-e6aww6q8.js:619644-619712 placement
async function dUe() {
  return jsonStringify({ pid: process.pid, ...procIdentityFields(await ownProcStartAsync()) });
}
/**
 * 写入插件使用中标记，并发清理导致反复失败时放弃。
 */
//@ chunk-e6aww6q8.js:619712-621536 placement
async function writeInUseMarker(e, n) {
  let r = getPluginRegistry(),
    s = isStorageV5Enabled() && n !== void 0;
  if (await KP(e)) {
    let L = toInUseLinkPath(e);
    if (L === void 0) return !1;
    let G = join_17(L, String(process.pid));
    for (let q = 1; ; q++)
      try {
        let Z = await ensureLinkDirChain(L);
        if (Z === "pruned" && q < IN_USE_LINK_DEPTH) continue;
        if (Z !== "ours")
          return (
            logForDebugging(
              Z === "pruned"
                ? `Not writing an ${IN_USE_LINKS_DIR} marker: ${L} kept being pruned while it was being created (gave up after ${IN_USE_LINK_DEPTH} attempts)`
                : Z === "undeterminable"
                  ? `Not writing an ${IN_USE_LINKS_DIR} marker: ${L} could not be examined`
                  : `Not writing an ${IN_USE_LINKS_DIR} marker: ${L} does not resolve inside the plugins directory`,
            ),
            !1
          );
        return (
          registerOwnInUseMarker(r, G, void 0),
          await removeLinkOrDir(G),
          await writeFileAtomic_2(G, await dUe()),
          !0
        );
      } catch (error) {
        let Se = getErrnoCode(error);
        if (
          (Se === "ENOENT" || Se === "ENOTDIR") &&
          q < IN_USE_LINK_DEPTH &&
          (await pruneOrReportPlantedEntry(projectPluginsDir(), L)) === "pruned"
        )
          continue;
        return (logForDebugging(`Failed to write ${IN_USE_LINKS_DIR} marker: ${e}: ${error}`), !1);
      }
  }
  let h = join_17(e, qm),
    y = join_17(h, String(process.pid)),
    S = s ? parseVersionCachePath(e, projectPluginCacheDir()) : null;
  if (s && S) {
    let L;
    try {
      L = await classifyMarkerPath(h);
    } catch (error) {
      return (logForDebugging(`Not writing an ${qm} marker: ${h} cannot be examined: ${error}`), !1);
    }
    if (L === "refused" || L === "junk") {
      if (!(await removeNonDirectoryMarker(h)))
        return (logForDebugging(`Not writing an ${qm} marker: ${h} is not a directory of markers`), !1);
    }
  }
  let w =
    s && S
      ? STORAGE_SPACES.pluginCache(S.marketplace, S.plugin, S.version, [qm, String(process.pid)])
      : void 0;
  registerOwnInUseMarker(r, y, s && w ? { storageV5: n, key: w } : void 0);
  try {
    if (s && w) {
      let L = await dUe(),
        G = { mode: 438 & ~process.umask() },
        write = await n.write(w, L, G);
      if (!write.ok) (await removeLinkOrDir(y), (write = await n.write(w, L, G)));
      if (!write.ok)
        return (
          logForDebugging(`Failed to write ${qm} marker: ${e}: ${formatStorageError(write.error)}`),
          !1
        );
      return !0;
    }
    try {
      await mkdir_8(h);
    } catch (error) {
      let G = getErrnoCode(error);
      if (G === "ENOENT") await mkdir_8(h, { recursive: !0 });
      else if (G !== "EEXIST") throw error;
      else {
        let q = await classifyMarkerPath(h);
        if (q === "absent") await mkdir_8(h, { recursive: !0 });
        else if (q !== "directory") {
          if (!(await removeNonDirectoryMarker(h)))
            return (logForDebugging(`Not writing ${qm} marker through a non-directory: ${e}`), !1);
          await mkdir_8(h, { recursive: !0 });
        }
      }
    }
    return (await removeLinkOrDir(y), await writeFileAtomic_2(y, await dUe()), !0);
  } catch (error) {
    return (logForDebugging(`Failed to write ${qm} marker: ${e}: ${error}`), !1);
  }
}
/**
 * 删除本进程（pid）在版本目录 e 的 in_use 标记：链接式缓存直接成功；v5 存储走存储 delete，否则 rm； 标记目录被拒或是杂项时返回 false。成功后从注册表移除。
 */
//@ chunk-e6aww6q8.js:621536-622103 placement
async function removeInUseMarker(versionDir, storage) {
  if (await KP(versionDir)) return !0;
  let markerDir = join_17(versionDir, qm),
    markerPath = join_17(markerDir, String(process.pid)),
    h = isStorageV5Enabled() && storage !== void 0,
    y = h ? parseVersionCachePath(versionDir, projectPluginCacheDir()) : null;
  try {
    let S = await classifyMarkerPath(markerDir);
    if (S === "absent" || (h && S === "junk")) return (yLt(getPluginRegistry(), markerPath), !0);
    if (S === "refused" || S === "junk") return !1;
    if (h && y) {
      let w = await storage.delete(
        STORAGE_SPACES.pluginCache(y.marketplace, y.plugin, y.version, [qm, String(process.pid)]),
      );
      if (!w.ok)
        return (
          logForDebugging(`Failed to remove ${qm} marker: ${versionDir}: ${formatStorageError(w.error)}`),
          !1
        );
    } else await rm_7(markerPath, { force: !0 });
    await rmdir(markerDir).catch(() => {});
  } catch (error) {
    return (logForDebugging(`Failed to remove ${qm} marker: ${versionDir}: ${error}`), !1);
  }
  return (yLt(getPluginRegistry(), markerPath), !0);
}
//@ chunk-e6aww6q8.js:622103-622144 placement
var Yce = ".last_inuse_sweep",
  bho = 86400000;
//@ chunk-e6aww6q8.js:622144-622177 placement
function _Lt(e) {
  return isFreshTimestamp(e, bho);
}
/**
 * 清扫插件使用中标记。
 */
//@ chunk-e6aww6q8.js:622177-622999 placement
async function sweepInUseMarkers(e, n) {
  if (e.length === 0) return;
  let r = join_17(projectPluginsDir(), Yce),
    s = isStorageV5Enabled() && n !== void 0,
    h = s ? xJr("inUseSweep", projectPluginsDir()) : null;
  if (s && h) {
    let statMeta = await n.statMeta(h);
    if (statMeta.ok && _Lt(statMeta.value.mtimeMs)) return;
  } else
    try {
      let S = await lstat_7(r);
      if (S.isFile() && _Lt(S.mtimeMs)) return;
    } catch {}
  let settled = await Promise.allSettled(e.map((S) => isPluginVersionInUse(S, void 0, n)));
  for (let [S, w] of settled.entries())
    if (w.status === "rejected") logForDebugging(`Failed to sweep ${qm}: ${e[S]}: ${w.reason}`);
  if (s && h) {
    let write = await n.write(h, new Date().toISOString(), { publishDiscipline: "inPlace" });
    if (!write.ok)
      try {
        (await removeLinkOrDir(r),
          (write = await n.write(h, new Date().toISOString(), { publishDiscipline: "inPlace" })));
      } catch (error) {
        logForDebugging(`Failed to clear a non-regular ${Yce}: ${error}`);
      }
    if (!write.ok) logForDebugging(`Failed to stamp ${Yce}: ${formatStorageError(write.error)}`);
    return;
  }
  try {
    (await removeLinkOrDir(r), await writeFileAndFlush(r, new Date().toISOString()));
  } catch (error) {
    logForDebugging(`Failed to stamp ${Yce}: ${error}`);
  }
}
/**
 * 链接式缓存查 .in_use-links 下的对应目录；否则读版本目录里的 in_use 标记（v5 存储时列存储项）。 读不到或被拒时按 refusedCountsAsLive（默认 true）保守视为使用中。孤儿清理、同步与安装前调用。
 */
//@ chunk-e6aww6q8.js:622999-623640 placement
async function isPluginVersionInUse(versionDir, options, storage) {
  if (await KP(versionDir)) {
    let w = toInUseLinkPath(versionDir);
    if (w === void 0) return !1;
    switch (await classifyLinkDir(w)) {
      case "ours": {
        let G = await readInUseMarker(w, options);
        if (!G) await pruneEmptyLinkDirs(w);
        return G;
      }
      case "absent":
        return !1;
      case "redirected":
        return (
          logForDebugging(
            `Not scanning ${IN_USE_LINKS_DIR}: ${w} does not resolve inside the plugins directory`,
          ),
          !1
        );
      case "undeterminable":
        return options?.refusedCountsAsLive ?? !0;
    }
  }
  let s = join_17(versionDir, qm),
    h = isStorageV5Enabled() ? storage : void 0,
    y = h !== void 0 ? parseVersionCachePath(versionDir, projectPluginCacheDir()) : null;
  if (h === void 0 || y === null) return readInUseMarker(s, options);
  let S;
  try {
    S = await classifyMarkerPath(s);
  } catch (error) {
    if (isFsInaccessible(error)) return options?.refusedCountsAsLive ?? !0;
    throw error;
  }
  if (S === "junk") return (await removeNonDirectoryMarker(s), !1);
  if (S === "refused") return (await removeNonDirectoryMarker(s), options?.refusedCountsAsLive ?? !0);
  return listInUseMarkers(h, y, options);
}
/**
 * 删除非目录形式的 in_use 标记，失败时视为仍在使用。
 */
//@ chunk-e6aww6q8.js:623640-623959 placement
async function removeNonDirectoryMarker(e) {
  try {
    if ((await removePathEntry(e)) === "directory") return !0;
    return (
      logForDebugging(
        `Removed a non-directory ${qm} at ${e}; the version reads unpinned until a session marks it again`,
        { level: "warn" },
      ),
      !0
    );
  } catch (error) {
    return (
      logForDebugging(
        `Could not remove a non-directory ${qm} at ${e} (${errorMessage(error)}); treating the version as in use`,
        { level: "warn" },
      ),
      !1
    );
  }
}
//@ chunk-e6aww6q8.js:623959-623974 placement
var who = 600000;
//@ chunk-e6aww6q8.js:623974-624060 placement
function uUe(e) {
  if (typeof e !== "number" || !Number.isFinite(e)) return !1;
  return !isFreshTimestamp(e, who);
}
//@ chunk-e6aww6q8.js:624060-624205 placement
async function removeStaleEntry(e, n) {
  try {
    let r = n ?? (await lstat_7(e)).mtimeMs;
    if (!uUe(r)) return !1;
    if ((await removePathEntry(e)) === "directory") await removeDirectoryTreeNoFollow(e);
    return !0;
  } catch {
    return !1;
  }
}
//@ chunk-e6aww6q8.js:624205-625019 placement
async function readInUseMarker(e, n) {
  let r;
  try {
    let h = await classifyMarkerPath(e);
    if (h === "refused") return (await removeNonDirectoryMarker(e), n?.refusedCountsAsLive ?? !0);
    if (h === "junk") return (await removeNonDirectoryMarker(e), !1);
    if (h !== "directory") return !1;
    r = await readdir_7(e);
  } catch (error) {
    if (isENOENT(error)) return !1;
    if (isFsInaccessible(error)) return n?.refusedCountsAsLive ?? !0;
    throw error;
  }
  let s = !1;
  for (let h of r) {
    let y = join_17(e, h);
    if (atomicMoveToInstallPath_2(h)) {
      if (await removeStaleEntry(y)) continue;
      s = !0;
      continue;
    }
    let S, w;
    try {
      let G = await lstat_7(y);
      if (((w = G.mtimeMs), G.isFile() && G.size <= MAX_IN_USE_MARKER_BYTES))
        S = await readFile_5(y, "utf-8");
    } catch (error) {
      if (isENOENT(error)) continue;
      (logForDebugging(`In-use marker ${y} could not be read (${errorMessage(error)}); treating it as live`, {
        level: "warn",
      }),
        (s = !0));
      continue;
    }
    if (S === "") {
      if (await removeStaleEntry(y, w)) continue;
      s = !0;
      continue;
    }
    let safeParse = InUseMarkerSchema().safeParse(safeParseJSON(S, !1));
    if (n?.excludeSelf && safeParse.success && safeParse.data.pid === process.pid) continue;
    if (safeParse.success && (await isMarkerOwnerAlive(safeParse.data, n?.requireIdentity))) {
      s = !0;
      continue;
    }
    await removeDirectoryTreeNoFollow(y);
  }
  return s;
}
/**
 * 列出插件缓存中的使用中标记。
 */
//@ chunk-e6aww6q8.js:625019-626391 placement
async function listInUseMarkers(e, n, r) {
  let s = (G) => STORAGE_SPACES.pluginCache(n.marketplace, n.plugin, n.version, [qm, G]),
    h = [],
    y = new Map(),
    S;
  do {
    let listEntries = await e.listEntries(
      {
        namespace: "pluginCache",
        marketplace: n.marketplace,
        plugin: n.plugin,
        version: n.version,
        relPath: [qm],
      },
      { cursor: S, skipKeyStats: !0, skipScopeStats: !0 },
    );
    if (!listEntries.ok) {
      let q = "telemetryCode" in listEntries.error ? listEntries.error.telemetryCode : void 0,
        merged = Object.assign(Error("in-use listing failed"), { ...(q !== void 0 && { code: q }) });
      if (q === "ENOENT" || q === "ENOTDIR") return !1;
      if (isFsInaccessible(merged)) return r?.refusedCountsAsLive ?? !0;
      throw merged;
    }
    for (let item of listEntries.value.items) {
      if (item.kind !== "key" || item.key.namespace !== "pluginCache") continue;
      let at = item.key.relPath.at(-1);
      if (at !== void 0) (h.push(at), y.set(at, item.mtimeMs));
    }
    S = listEntries.value.cursor;
  } while (S);
  let any = h.some((G) => atomicMoveToInstallPath_2(G) && !uUe(y.get(G))),
    filtered = h.filter((G) => !atomicMoveToInstallPath_2(G));
  for (let G = 0; G < filtered.length; G += bLt) {
    let sliced = filtered.slice(G, G + bLt),
      Z = await readMarkerItems(e, sliced.map(s));
    for (let [Se, ke] of sliced.entries()) {
      let we = Z[Se] ?? "unreadable";
      if (we === "unreadable") {
        any = !0;
        continue;
      }
      let Ee = we === "absent" ? void 0 : we,
        Ae = Ee !== void 0 && Buffer.byteLength(Ee.raw, "utf8") > MAX_IN_USE_MARKER_BYTES ? void 0 : Ee?.raw;
      if (Ae === "") {
        if (!uUe(Ee?.mtimeMs)) {
          any = !0;
          continue;
        }
        if (
          !(await e.delete(s(ke)).then(
            (We) => We.ok,
            () => !1,
          ))
        )
          any = !0;
        continue;
      }
      let safeParse = InUseMarkerSchema().safeParse(safeParseJSON(Ae, !1));
      if (r?.excludeSelf && safeParse.success && safeParse.data.pid === process.pid) continue;
      if (safeParse.success && (await isMarkerOwnerAlive(safeParse.data, r?.requireIdentity))) {
        any = !0;
        continue;
      }
      await e.delete(s(ke)).then(
        () => {},
        () => {},
      );
    }
  }
  return any;
}
//@ chunk-e6aww6q8.js:626391-626402 placement
var bLt = 64;
/**
 * 批量读存储项，失败退回逐项读。
 */
//@ chunk-e6aww6q8.js:626402-626761 placement
async function readMarkerItems(e, n) {
  let r = (y) => Buffer.from(y).toString("utf8"),
    read = await e.read(n);
  if (read.ok)
    return read.value.items.map((item) =>
      item.found ? { raw: r(item.value), mtimeMs: item.mtimeMs } : "absent",
    );
  let h = [];
  for (let y of n) {
    let read = await e.read([y]);
    h.push(
      !read.ok
        ? "unreadable"
        : read.value.items[0]?.found
          ? { raw: r(read.value.items[0].value), mtimeMs: read.value.items[0].mtimeMs }
          : "absent",
    );
  }
  return h;
}
//@ chunk-e6aww6q8.js:626761-626936 placement
async function releaseMarkersOutside(e, n, r) {
  let s = new Set();
  for (let ownInUseMarkerPath of getPluginRegistry().ownInUseMarkerPaths) {
    let y = dirname_11(dirname_11(ownInUseMarkerPath));
    if (hm(e, y, !1) && !n.has(y)) s.add(y);
  }
  await Promise.all(Array.from(s, (h) => removeInUseMarker(h, r)));
}
//@ chunk-e6aww6q8.js:626936-627074 placement
async function isMarkerOwnerAlive(e, n) {
  if (!(e.pid === 1 || isProcessRunning_2(e.pid))) return !1;
  let r = procIdentityOf(e);
  if (n) return r !== void 0 && (await provenSameProcessAsync(e.pid, r)) === !0;
  return isSameProcessAsync(e.pid, r);
}

export {
  writeInUseMarker,
  removeInUseMarker,
  isPluginVersionInUse,
  KP,
  sweepInUseMarkers,
  releaseMarkersOutside,
};
