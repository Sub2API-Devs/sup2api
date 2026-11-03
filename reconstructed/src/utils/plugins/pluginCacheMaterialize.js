/**
 * utils/plugins/pluginCacheMaterialize.ts
 *
 * 2.1.316 新增：插件缓存链接实体化
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-e6aww6q8.js (67)
 * attribution: placement 67
 */
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
  parse,
  parse as parse_2,
  parse as parse_3,
  parse as parse_4,
  parse as parse_5,
  parse as parse_6,
  parse as parse_7,
  parse as parse_8,
  parse as parse_9,
  parse as parse_10,
  parse as parse_11,
  parse as parse_12,
  parse as parse_13,
  parse as parse_14,
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
} from "path";
import {
  stat,
  stat as stat_2,
  stat as stat_3,
  stat as stat_4,
  stat as stat_5,
  stat as stat_6,
  stat as stat_7,
  stat as stat_8,
  stat as stat_9,
  stat as stat_10,
  stat as stat_11,
  stat as stat_12,
  stat as stat_13,
  stat as stat_14,
  stat as stat_15,
  stat as stat_16,
  stat as stat_17,
  stat as stat_18,
  stat as stat_19,
  stat as stat_20,
  stat as stat_21,
  stat as stat_22,
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
  lutimes,
  lutimes as lutimes_2,
  lutimes as lutimes_3,
  lutimes as lutimes_4,
  lutimes as lutimes_5,
  lutimes as lutimes_6,
  readlink,
  readlink as readlink_2,
  readlink as readlink_3,
  readlink as readlink_4,
  readlink as readlink_5,
  readlink as readlink_6,
  readlink as readlink_7,
  readlink as readlink_8,
  readlink as readlink_9,
  readlink as readlink_10,
  readlink as readlink_11,
  readlink as readlink_12,
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
  writeFile,
  writeFile as writeFile_2,
  writeFile as writeFile_3,
  writeFile as writeFile_4,
  writeFile as writeFile_5,
  writeFile as writeFile_6,
  writeFile as writeFile_7,
  writeFile as writeFile_8,
  writeFile as writeFile_9,
  writeFile as writeFile_10,
  writeFile as writeFile_11,
  writeFile as writeFile_12,
  writeFile as writeFile_13,
  writeFile as writeFile_14,
  writeFile as writeFile_15,
  writeFile as writeFile_16,
  writeFile as writeFile_17,
  writeFile as writeFile_18,
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
  open,
  open as open_2,
  open as open_3,
  open as open_4,
  open as open_5,
  open as open_6,
  open as open_7,
  open as open_8,
  open as open_9,
  open as open_10,
  open as open_11,
  open as open_12,
  open as open_13,
  open as open_14,
  open as open_15,
  open as open_16,
  open as open_17,
  open as open_18,
  open as open_19,
  open as open_20,
  open as open_21,
  open as open_22,
  open as open_23,
  open as open_24,
  open as open_25,
  open as open_26,
  open as open_27,
  rmdir,
  rmdir as rmdir_2,
  rmdir as rmdir_3,
  rmdir as rmdir_4,
  rmdir as rmdir_5,
  rmdir as rmdir_6,
  rmdir as rmdir_7,
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
  constants,
  constants as constants_3,
  constants as constants_4,
  constants as constants_5,
  constants as constants_6,
  constants as constants_7,
  constants as constants_9,
  constants as constants_10,
  constants as constants_12,
  constants as constants_13,
  constants as constants_14,
  constants as constants_15,
  constants as constants_16,
  constants as constants_17,
  constants as constants_18,
  constants as constants_19,
  constants as constants_20,
  constants as constants_21,
  constants as constants_22,
  constants as constants_23,
  constants as constants_24,
  constants as constants_25,
  constants as constants_26,
  constants as constants_27,
} from "fs";
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
import { CACHE_META_FILES, lU, qm, R1 } from "./cacheUtils.js";
import { OCt, MCt, dU } from "../pathSegments.js";
import { rc, uncHostOf, uT, Puo, cl } from "../pathClassification.js";
import { getPlatform } from "../platform.js";
import {
  getErrnoCode,
  TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS,
  errorMessage,
  isPathAbsent,
  isFsInaccessible,
} from "../errors.js";
import { DoctorLazy } from "../../cli/handlers/util.js";
import { u, o, T, E } from "../../../vendor/zod/v4/classic/schemas.js";
import {
  networkMountRootCached,
  normalizeMountPath,
  networkMountRoots,
  AV,
  isWslUncPath,
  ai,
  yl,
} from "../networkPaths.js";
import { iM } from "../fsJunctions.js";
import { makeTempSiblingPath, retryFsOp, isOwnTempName } from "../atomicPublishWrite.js";
import { logForDebugging } from "../debug.js";
import { copyFileNoFollow, AI, isSameFilesystem, writeFileAtomically } from "./safeCopy.js";
import { classifyDirEntry, removePathEntry, removeDirectoryTreeNoFollow } from "../fsRemove.js";
import { jsonStringify, jsonParse } from "../slowOperations.js";
import { isStorageV5Enabled } from "../hoverRest.js";
import { isDiskless } from "../../bootstrap/state.js";
import { atomicMoveToInstallPath_2 } from "../nativeInstaller/installer.js";
import { P7s, eie } from "../../services/memorySync/syncFiles.js";
import { isFreshTimestamp } from "./pluginCachePaths.js";

//@ chunk-e6aww6q8.js:698057-698101 placement
var m_o = new Set(["node_modules", ...CACHE_META_FILES, lU]);
//@ chunk-e6aww6q8.js:698101-698134 placement
function pz(e) {
  return OCt(e, m_o);
}
//@ chunk-e6aww6q8.js:698134-698220 placement
function yk(e, n) {
  if (e === n) return !0;
  let r = n.endsWith(sep_15) ? n : n + sep_15;
  return e.startsWith(r);
}
//@ chunk-e6aww6q8.js:698220-698249 placement
function oFt(e) {
  return rc(e);
}
/**
 * 两个路径 stat 的 dev/ino 是否相同（Windows 直接 same）。
 */
//@ chunk-e6aww6q8.js:698249-698718 placement
async function compareStatIdentity(e, n) {
  if (getPlatform() === "windows") return "same";
  let [r, s] = await Promise.allSettled([stat_6(e, { bigint: !0 }), stat_6(n, { bigint: !0 })]),
    filtered = [r, s].filter((y) => y.status === "rejected");
  if (
    filtered.some((y) => {
      let S = getErrnoCode(y.reason);
      return S !== "ENOENT" && S !== "ENOTDIR";
    })
  )
    return "unknown";
  if (filtered.length > 0 || r.status === "rejected" || s.status === "rejected") return "absent";
  if (r.value.ino === 0n || s.value.ino === 0n) return "unknown";
  return r.value.dev === s.value.dev && r.value.ino === s.value.ino ? "same" : "different";
}
/**
 * 路径 realpath 是否在根内且 stat 一致（inside/outside/unknown）。
 */
//@ chunk-e6aww6q8.js:698718-699023 placement
async function classifyRealpathContainment(e, n) {
  let r = await realpath_4(e);
  if (!yk(r, n)) return "outside";
  if (getPlatform() === "windows") return "inside";
  let s;
  try {
    s = await Promise.all([stat_6(e, { bigint: !0 }), stat_6(r, { bigint: !0 })]);
  } catch {
    return "unknown";
  }
  let [h, y] = s;
  if (h.ino === 0n || y.ino === 0n) return "unknown";
  return h.dev === y.dev && h.ino === y.ino ? "inside" : "outside";
}
//@ chunk-e6aww6q8.js:699023-699063 placement
var h_o = { entries: 20000, bytes: 536870912 };
//@ chunk-e6aww6q8.js:699063-699092 placement
function K8() {
  return { ...h_o };
}
//@ chunk-e6aww6q8.js:699092-699250 placement
class SymlinkCopyBudgetError extends TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS {
  constructor() {
    super(
      "Plugin materializes more files through symlinks than the copy budget allows",
      "plugin symlink copy budget exceeded",
    );
  }
}
//@ chunk-e6aww6q8.js:699250-699333 placement
function I0(e, n, r) {
  if (((e.entries -= n), (e.bytes -= r), e.entries < 0 || e.bytes < 0)) throw new SymlinkCopyBudgetError();
}
//@ chunk-e6aww6q8.js:699333-699378 placement
function bje(e) {
  return e.split(sep_15).some(MCt);
}
//@ chunk-e6aww6q8.js:699378-699432 placement
var MD = new Set(["EROFS", "EACCES", "EPERM"]),
  pje = 600000;
//@ chunk-e6aww6q8.js:699432-699488 placement
function Fpe(e) {
  let n = Date.now() - e;
  return n > -pje && n < pje;
}
//@ chunk-e6aww6q8.js:699488-699741 placement
var MATERIALIZE_MAX_AGE_MS = 600000,
  MAX_MARKER_BYTES = 4096,
  PARKED_SUFFIX = ".parked",
  ORIGIN_SUFFIX = ".origin",
  MAX_ORIGIN_BYTES = 4096,
  MAX_SCREEN_MARKER_BYTES = 4096,
  SCREEN_VERSION = 2,
  ScreenMarkerSchema = DoctorLazy(() =>
    u({ at: o(), cli: o(), screen: T(SCREEN_VERSION), materialized: E(), removed: E(), failed: E() }),
  ),
  TRANSIENT_FS_ERRORS = new Set([
    "EBUSY",
    "EAGAIN",
    "EMFILE",
    "ENFILE",
    "EIO",
    "EINTR",
    "ENOTEMPTY",
    "EPERM",
    "EACCES",
  ]);
//@ chunk-e6aww6q8.js:699741-699797 placement
function b_o(e) {
  let date = new Date();
  lutimes_4(e, date, date).catch(() => {});
}
/**
 * 构造判断链接拼写/目标是否指向网络或其他卷的检查器。
 */
//@ chunk-e6aww6q8.js:699797-700136 placement
function createLinkTargetScreen(e) {
  let n = (w) => {
      let L = networkMountRootCached(w);
      return L === null ? null : normalizeMountPath(L);
    },
    r = n(e),
    s = uncHostOf(e),
    h = (w) => networkMountRoots(w).some((L) => L !== r),
    y = (w) => {
      if (!AV(w) && !isWslUncPath(w)) return !1;
      if (uT(w) || iM(w) || Puo(w)) return !0;
      if (ai(w) || isWslUncPath(w)) {
        let L = uncHostOf(w);
        return L === null || L !== s;
      }
      if (yl(w)) return cl(w) || n(w) !== r;
      return !0;
    };
  return { spelling: y, target: (w, L) => y(w) || y(resolve_6(L, w)) || h(L + sep_15 + w) };
}
//@ chunk-e6aww6q8.js:700136-700258 placement
var MAX_SYMLINK_HOPS = 40,
  DRIVE_RELATIVE_RE = /^[a-zA-Z]:(?![\\/])/,
  splitPathSegments = (e) =>
    e
      .slice(parse_2(e).root.length)
      .split(sep_15 === "\\" ? /[\\/]+/ : /\/+/)
      .filter(Boolean);
//@ chunk-e6aww6q8.js:700258-700329 placement
async function z8(e, n, r, s = {}) {
  return walkLinkChain(dirname_16(e), [], n, s, r ?? (await readlink_2(e)));
}
//@ chunk-e6aww6q8.js:700329-700385 placement
async function T_o(e, n, r, s = {}) {
  return walkLinkChain(e, splitPathSegments(n), r, s);
}
/**
 * 手动逐段解析路径（含 Windows junction/盘符相对路径），每段检查是否指向网络位置； 链接跳数超过上限返回 loop，缺失返回 dangling，拼写可疑返回 network，Windows 不支持的形式返回 unsupported。
 */
//@ chunk-e6aww6q8.js:700385-701655 placement
async function walkLinkChain(root, segments, screen, options, firstLink) {
  let y = (options.platform ?? (getPlatform() === "windows" ? "win32" : "posix")) === "win32",
    current = root,
    sliced = segments.slice(),
    hops = firstLink === void 0 ? 0 : 1,
    G = (q, Z) => {
      if (screen.target(q, Z)) return "network";
      if (y) {
        if (DRIVE_RELATIVE_RE.test(q)) return "unsupported";
        let Se = resolve_6(Z, q, ...sliced);
        if (screen.spelling(Se)) return "network";
        sliced.length = 0;
        let trustedRoot = options.trustedRoot;
        if (trustedRoot !== void 0 && (Se === trustedRoot || yk(Se, trustedRoot)))
          ((current = trustedRoot), sliced.push(...splitPathSegments(relative_9(trustedRoot, Se))));
        else {
          if (
            ((current = parse_2(Se).root),
            trustedRoot !== void 0 && current.toLowerCase() !== parse_2(trustedRoot).root.toLowerCase())
          )
            return "unsupported";
          sliced.push(...splitPathSegments(Se));
        }
        return null;
      }
      if (isAbsolute_6(q)) current = parse_2(q).root;
      else current = Z;
      return (sliced.unshift(...splitPathSegments(q)), null);
    };
  if (firstLink !== void 0) {
    let q = G(firstLink, root);
    if (q !== null) return q;
  }
  while (sliced.length > 0) {
    let q = sliced.shift();
    if (q === ".") continue;
    if (q === "..") {
      current = dirname_16(current);
      continue;
    }
    let Z = join_24(current, q);
    if (screen.spelling(Z)) return "network";
    let Se;
    try {
      Se = await lstat_12(Z);
    } catch (error) {
      let we = getErrnoCode(error);
      if (we === "ENOENT" || we === "ENOTDIR") return "dangling";
      throw error;
    }
    if (Se.isSymbolicLink()) {
      if (++hops > MAX_SYMLINK_HOPS) return "loop";
      let ke = G(await readlink_2(Z), current);
      if (ke !== null) return ke;
      continue;
    }
    if (sliced.length > 0 && !Se.isDirectory()) return "dangling";
    if (y && Se.isDirectory()) {
      let ke;
      try {
        ke = await readlink_2(Z);
      } catch (error) {
        let Ee = getErrnoCode(error);
        if (Ee === "ENOENT" || Ee === "ENOTDIR") return "dangling";
        if (Ee !== "EINVAL") throw error;
        ke = null;
      }
      if (ke !== null) {
        if (++hops > MAX_SYMLINK_HOPS) return "loop";
        let we = G(ke, current);
        if (we !== null) return we;
        continue;
      }
    }
    current = Z;
  }
  return "clean";
}
//@ chunk-e6aww6q8.js:701655-701848 placement
function stagedCopyReplacedError(e) {
  return new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
    `Refusing to swap in a staged copy: it is no longer the ${e} this pass made (replaced during the conversion).`,
    "plugin cache staged copy replaced before the swap",
  );
}
/**
 * 实体化插件目录中的链接（命令源等），无法写入时保留链接。
 */
//@ chunk-e6aww6q8.js:701848-709580 placement
async function materializePluginLinks(e, n, r = {}) {
  let startTime = performance.now(),
    h = r.budget ?? K8(),
    y = r.mode ?? "install",
    S = { vouched: !1, materialized: 0, removed: 0, failed: 0, readOnly: !1 };
  if (!(await lstat_12(e)).isDirectory())
    throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
      `Plugin path is not a directory: ${e}`,
      "plugin path is not a directory",
    );
  let w = await realpath_4(e),
    L,
    G;
  try {
    ((L = await stampMaterializedTree(e, w, y, r.sharedPath)),
      (G = makeTempSiblingPath(join_24(w, lU))),
      await mkdir_10(G));
  } catch (error) {
    let yn = getErrnoCode(error);
    if (yn !== void 0 && MD.has(yn))
      return (
        logForDebugging(`materializeLinks: ${e}: cannot write (${yn}), leaving links in place`),
        { ...S, readOnly: !0 }
      );
    throw error;
  }
  let q = await lstat_12(G, { bigint: !0 }),
    Z = async () => {
      let ho = await lstat_12(G, { bigint: !0 }).catch(() => null);
      return ho !== null && ho.isDirectory() && ho.ino === q.ino && ho.dev === q.dev;
    },
    Se = async () => {
      if (!(await Z())) throw Error("the scratch directory is no longer the one this pass created");
    },
    ke = 0,
    we = async () => (await Se(), join_24(G, String(ke++))),
    Ee = async (ho) => {
      if (await Z()) await rm_13(ho, { recursive: !0, force: !0 }).catch(() => {});
    },
    Ae = !1,
    Ie = 0,
    Me = !0,
    We = createLinkTargetScreen(w),
    ze = (ho, yn) => {
      (S.failed++, logForDebugging(`materializeLinks: failed ${ho}: ${errorMessage(yn)}`, { level: "warn" }));
    },
    lt = async (ho) => {
      let yn = await lstat_12(ho).catch(() => null);
      return yn !== null && !yn.isSymbolicLink();
    },
    Je = async (ho, yn, Kn, Xn) => {
      try {
        if (!(await lstat_12(ho)).isSymbolicLink()) return;
        (await retryFsOp(ho, await we()),
          S.removed++,
          logForDebugging(`materializeLinks: removed ${yn} -> ${Kn} (${Xn})`));
      } catch (error) {
        if (
          getErrnoCode(error) !== "ENOENT" ||
          (await lstat_12(ho).catch(() => null))?.isSymbolicLink() === !0
        )
          ze(yn, error);
      }
    },
    nt = async (ho, yn, Kn, Xn = "dangling") => {
      if (!L || (await hasOtherTempEntries(w, G))) {
        if (y === "install") {
          ze(
            yn,
            Error(
              "link does not resolve and the tree could not be settled this time (a sweep step the OS refused, or another pass is live)",
            ),
          );
          return;
        }
        (logForDebugging(
          `materializeLinks: left ${yn} -> ${Kn}: does not resolve while another pass may be converting this tree; judged on a later load`,
        ),
          Ie++,
          (Me = !1));
        return;
      }
      return Je(ho, yn, Kn, Xn);
    },
    pt = (ho, yn, Kn, Xn) => {
      if (y === "migrate") return Je(ho, yn, Kn, "over copy budget");
      throw Xn;
    },
    Et = (ho) => {
      ((h.entries = ho.entries), (h.bytes = ho.bytes));
    },
    yt = async (ho, yn, Kn, Xn, fo) => {
      let To = { ...h };
      try {
        I0(h, 1, fo);
      } catch (error) {
        if ((Et(To), error instanceof SymlinkCopyBudgetError)) return pt(ho, yn, Kn, error);
        throw error;
      }
      let bo = await we();
      try {
        (await copyFileNoFollow(Xn, bo, { exclusive: !0, exactMode: !0, nonBlocking: !0 }),
          await gt(bo, ho, yn),
          S.materialized++,
          logForDebugging(`materializeLinks: copied ${yn} (was symlink -> ${Kn})`));
      } catch (error) {
        if ((await Ee(bo), Et(To), !(await lt(ho)))) ze(yn, error);
      }
    },
    gt = async (ho, yn, Kn) => {
      try {
        if ((await Se(), !(await lstat_12(ho)).isFile())) throw stagedCopyReplacedError("file");
        await retryFsOp(ho, yn);
      } catch (error) {
        let fo = getErrnoCode(error);
        if (fo === void 0 || !AI.has(fo)) throw error;
        let To = await lstat_12(yn).catch(() => null);
        if (To === null || !To.isSymbolicLink()) throw error;
        let bo = await we();
        await writeFile_5(bo + ORIGIN_SUFFIX, Kn, { flag: "wx" });
        let vn = await lstat_12(yn).catch(() => null);
        if (vn === null || !vn.isSymbolicLink()) throw error;
        (await Se(), await retryFsOp(yn, bo + PARKED_SUFFIX));
        try {
          if ((await Se(), !(await lstat_12(ho)).isFile())) throw stagedCopyReplacedError("file");
          await retryFsOp(ho, yn);
        } catch (error) {
          if (!(await lt(yn)) && (await Z()))
            await retryFsOp(bo + PARKED_SUFFIX, yn).catch(() => {
              Ae = !0;
            });
          throw error;
        }
      }
    },
    At = async (ho, yn, Kn, Xn) => {
      let fo = await we(),
        To = { ...h };
      try {
        (I0(h, 1, 0), await n(Xn, fo, Xn, fo, w, !0, new Set([Xn]), h, !0));
      } catch (error) {
        if ((await Ee(fo), Et(To), error instanceof SymlinkCopyBudgetError)) return pt(ho, yn, Kn, error);
        return ze(yn, error);
      }
      try {
        let bo = await we();
        await writeFile_5(bo + ORIGIN_SUFFIX, yn, { flag: "wx" });
        let vn = await lstat_12(ho).catch(() => null);
        if (vn === null || !vn.isSymbolicLink()) {
          (await Ee(fo), Et(To));
          return;
        }
        (await Se(), await retryFsOp(ho, bo + PARKED_SUFFIX));
        try {
          if ((await Se(), !(await lstat_12(fo)).isDirectory())) throw stagedCopyReplacedError("directory");
          await retryFsOp(fo, ho);
        } catch (error) {
          if (!(await lt(ho)) && (await Z()))
            await retryFsOp(bo + PARKED_SUFFIX, ho).catch(() => {
              Ae = !0;
            });
          throw error;
        }
        (S.materialized++, logForDebugging(`materializeLinks: copied ${yn} (was symlink -> ${Kn})`));
      } catch (error) {
        if ((await Ee(fo), Et(To), !(await lt(ho)))) ze(yn, error);
      }
    },
    It = async (ho, yn, Kn) => {
      let Xn = join_24(ho, yn),
        fo = relative_9(w, Xn),
        To;
      try {
        To = await readlink_2(Xn);
      } catch (error) {
        let ko = getErrnoCode(error);
        if (ko !== "EINVAL" && ko !== "ENOENT") ze(fo, error);
        return;
      }
      if (Kn === 0 && !MCt(yn) && pz(yn)) return Je(Xn, fo, To, "reserved name");
      if (oFt(fo)) return Je(Xn, fo, To, "backslash in name");
      let bo;
      try {
        bo = await z8(Xn, We, To, { trustedRoot: w });
      } catch (error) {
        ze(fo, error);
        return;
      }
      if (bo === "network") return Je(Xn, fo, To, "network target");
      if (bo === "unsupported") return Je(Xn, fo, To, "unsupported target spelling");
      if (bo !== "clean") return nt(Xn, fo, To);
      let vn;
      try {
        vn = await realpath_4(Xn);
      } catch (error) {
        let ko = getErrnoCode(error);
        if (ko === "ENOENT" || ko === "ENOTDIR") return nt(Xn, fo, To);
        ze(fo, error);
        return;
      }
      if (!yk(vn, w)) return Je(Xn, fo, To, "escapes plugin root");
      if (qt(fo)) {
        let So = await compareStatIdentity(Xn, vn);
        if (So === "different") return Je(Xn, fo, To, "opens a different file than it resolves to");
        if (So === "absent") return nt(Xn, fo, To);
        if (So === "unknown") {
          ze(fo, Error("kept link identity could not be proven (stat failed or no inode number)"));
          return;
        }
        Zt.push({ linkPath: Xn, rel: fo, target: To });
        return;
      }
      if (yk(ho, vn)) return Je(Xn, fo, To, "ancestor cycle");
      let co;
      try {
        co = await lstat_12(vn);
      } catch (error) {
        let ko = getErrnoCode(error);
        if (ko === "ENOENT" || ko === "ENOTDIR") return nt(Xn, fo, To);
        ze(fo, error);
        return;
      }
      if (co.isSymbolicLink()) {
        ze(fo, Error("target swapped for a link since it was resolved"));
        return;
      }
      if (!co.isFile() && !co.isDirectory()) return Je(Xn, fo, To, "non-regular target");
      if (co.isFile()) return yt(Xn, fo, To, vn, co.size);
      return At(Xn, fo, To, vn);
    },
    Yt = (ho) => isOwnTempName(dU(ho), lU),
    qt = bje,
    Zt = [],
    rn = async () => {
      let sliced = Zt.slice();
      for (let yn = 0; yn <= Zt.length; yn++) {
        let results = await Promise.all(
          sliced.map(async (fo) => {
            try {
              let To = await z8(fo.linkPath, We, void 0, { trustedRoot: w });
              if (To === "network") return "network target after conversion";
              if (To === "unsupported") return "unsupported target spelling";
              if (To !== "clean") return "dangling after conversion";
              let bo = await realpath_4(fo.linkPath);
              if (!yk(bo, w)) return "escapes plugin root after conversion";
              let vn = await compareStatIdentity(fo.linkPath, bo);
              if (vn === "unknown") return "unexamined";
              if (vn === "absent") return "dangling after conversion";
              return vn === "same" ? null : "opens a different file than it resolves to after conversion";
            } catch (error) {
              let bo = getErrnoCode(error);
              return bo === "ENOENT" || bo === "ENOTDIR" ? "dangling after conversion" : "unexamined";
            }
          }),
        );
        if (results.every((fo) => fo === null)) return;
        let Xn = [];
        for (let [fo, To] of sliced.entries()) {
          let bo = results[fo];
          if (bo === null || bo === void 0) Xn.push(To);
          else if (bo === "unexamined")
            if (y === "install") ze(To.rel, Error("kept link could not be re-checked after conversion"));
            else
              (logForDebugging(
                `materializeLinks: left ${To.rel} -> ${To.target}: could not be re-checked after the conversion; judged on a later load`,
              ),
                Ie++,
                (Me = !1));
          else if (bo === "dangling after conversion") await nt(To.linkPath, To.rel, To.target, bo);
          else await Je(To.linkPath, To.rel, To.target, bo);
        }
        sliced = Xn;
      }
    },
    pn = async (ho, yn) => {
      let Kn;
      try {
        Kn = await readdir_10(ho, { withFileTypes: !0 });
      } catch (error) {
        ze(relative_9(w, ho) || ".", error);
        return;
      }
      for (let Xn of Kn) {
        let fo;
        try {
          fo = await classifyDirEntry(ho, Xn);
        } catch (error) {
          if (getErrnoCode(error) !== "ENOENT") ze(relative_9(w, join_24(ho, Xn.name)), error);
          continue;
        }
        if (fo.isDirectory) {
          if (yn === 0 && Yt(Xn.name)) continue;
          let To;
          try {
            To = await lstat_12(join_24(ho, Xn.name));
          } catch (error) {
            if (getErrnoCode(error) !== "ENOENT") ze(relative_9(w, join_24(ho, Xn.name)), error);
            continue;
          }
          if (To.isSymbolicLink()) await It(ho, Xn.name, yn);
          else if (To.isDirectory()) {
            let bo =
              getPlatform() !== "windows"
                ? !0
                : await isSameFilesystem(ho, Xn.name).catch((vn) => {
                    if (getErrnoCode(vn) !== "ENOENT") ze(relative_9(w, join_24(ho, Xn.name)), vn);
                    return null;
                  });
            if (bo === null) continue;
            if (!bo) {
              ze(relative_9(w, join_24(ho, Xn.name)), Error("directory resolves elsewhere (reparse point)"));
              continue;
            }
            await pn(join_24(ho, Xn.name), yn + 1);
          }
        } else if (fo.isSymbolicLink) await It(ho, Xn.name, yn);
      }
    },
    no = setInterval(b_o, pje / 4, G);
  no.unref();
  let hn = !1;
  try {
    (await pn(w, 0), await rn());
  } finally {
    clearInterval(no);
    let ho = await Z().catch(() => !1);
    if (!Ae && !ho)
      logForDebugging(
        `materializeLinks: ${e}: ${G} is no longer the folder this pass made; left in place, tree not vouched for`,
        { level: "warn" },
      );
    hn =
      !Ae &&
      ho &&
      (await rm_13(G, { recursive: !0, force: !0 }).then(
        () => !0,
        (yn) => (
          logForDebugging(`materializeLinks: ${e}: cannot remove ${G}: ${errorMessage(yn)}`, {
            level: "warn",
          }),
          !1
        ),
      ));
  }
  if (S.failed === 0 && L && Me && hn && !(y === "migrate" && (await hasOtherTempEntries(w, G))))
    if (y === "migrate" && !(await E_o(w))) {
      if (Ie === 0) S.settledUnvouched = !0;
    } else S.vouched = await writeScreenMarker(e, w, S);
  return (
    logForDebugging(
      `materializeLinks: ${e}: materialized=${S.materialized} removed=${S.removed} failed=${S.failed}${Ie > 0 ? ` left-for-later=${Ie}` : ""} in ${Math.round(performance.now() - startTime)}ms`,
    ),
    S
  );
}
//@ chunk-e6aww6q8.js:709580-709605 placement
var XP = Symbol("refused");
//@ chunk-e6aww6q8.js:709605-709709 placement
async function toTransientSentinel(e) {
  try {
    return await e;
  } catch (error) {
    let r = getErrnoCode(error);
    if (r !== void 0 && MD.has(r)) return XP;
    throw error;
  }
}
//@ chunk-e6aww6q8.js:709709-710637 placement
async function stampMaterializedTree(e, n, r, s = !1) {
  let h = !0;
  if (r === "install") {
    if (!(await convertDirectoryToZipInPlace(n, lU))) h = !1;
    if (s) {
      if ((await toTransientSentinel(removePathEntry(join_24(n, qm)))) === XP) h = !1;
    } else if (!(await convertDirectoryToZipInPlace(n, qm))) h = !1;
  }
  let y = await toTransientSentinel(readdir_10(n));
  if (y === XP)
    return (logForDebugging(`materializeLinks: ${e}: cannot list the tree this time; not stamping`), !1);
  for (let S of y) {
    if (!isOwnTempName(dU(S), lU)) continue;
    let w = join_24(n, S);
    if (r === "migrate") {
      let q = await toTransientSentinel(
        lstat_12(w).catch((Se) => {
          if (getErrnoCode(Se) === "ENOENT") return null;
          throw Se;
        }),
      );
      if (q === null) continue;
      if (q === XP) {
        h = !1;
        continue;
      }
      if (!q.isDirectory()) {
        if ((await toTransientSentinel(rm_13(w, { force: !0 }))) === XP) h = !1;
        continue;
      }
      if (Fpe(q.mtimeMs)) {
        ((h = !1),
          logForDebugging(
            `materializeLinks: ${e}: ${S} may belong to a pass in progress; not stamping this time`,
          ));
        continue;
      }
      let Z = await isOnDifferentFilesystem(n, S);
      if (Z === null) continue;
      if (Z) {
        if ((await scanDirectory_2(w)) !== !0) h = !1;
        continue;
      }
      if (!(await restoreParkedEntries(e, n, w))) {
        h = !1;
        continue;
      }
    }
    let L = await isOnDifferentFilesystem(n, S);
    if (L === null) continue;
    if (L) {
      if ((await scanDirectory_2(w)) !== !0) h = !1;
      continue;
    }
    if ((await toTransientSentinel(rm_13(w, { recursive: !0, force: !0 }))) === XP) h = !1;
  }
  return h;
}
//@ chunk-e6aww6q8.js:710637-710712 placement = scanDirectory (0.766)
async function scanDirectory_2(dirPath) {
  let n = await toTransientSentinel(removePathEntry(dirPath));
  return n !== XP && n !== "directory";
}
//@ chunk-e6aww6q8.js:710712-710903 placement
async function isOnDifferentFilesystem(e, n) {
  if (getPlatform() !== "windows") return !1;
  let r = await isSameFilesystem(e, n).catch((s) => {
    let h = getErrnoCode(s);
    if (h === "ENOENT") return null;
    if (h !== void 0 && MD.has(h)) return !1;
    throw s;
  });
  return r === null ? null : !r;
}
/**
 * 目录项检查后递归扫描或删除（名字配错）。
 */
//@ chunk-e6aww6q8.js:710903-711052 placement = convertDirectoryToZipInPlace (1)
async function convertDirectoryToZipInPlace(dirPath, zipPath) {
  let r = await isOnDifferentFilesystem(dirPath, zipPath);
  if (r === null) return !0;
  if (r) return scanDirectory_2(join_24(dirPath, zipPath));
  return (await toTransientSentinel(rm_13(join_24(dirPath, zipPath), { recursive: !0, force: !0 }))) !== XP;
}
//@ chunk-e6aww6q8.js:711052-711126 placement
async function E_o(e) {
  return (await readdir_10(e).catch(() => [])).some((r) => !pz(r));
}
//@ chunk-e6aww6q8.js:711126-711271 placement
async function hasOtherTempEntries(e, n) {
  let r = await readdir_10(e).catch((s) => (getErrnoCode(s) === "ENOENT" ? [] : null));
  if (r === null) return !0;
  return r.some((s) => isOwnTempName(dU(s), lU) && join_24(e, s) !== n);
}
/**
 * 扫描暂存目录里的 .origin 记录，校验原位置仍在根内、未被占用且暂存项是链接后把 .parked 条目移回； 出现无法判定的情况返回 false（不完整）。
 */
//@ chunk-e6aww6q8.js:711271-712292 placement
async function restoreParkedEntries(label, root, parkDir) {
  let complete = !0,
    screen = createLinkTargetScreen(root),
    y = await toTransientSentinel(
      readdir_10(parkDir).catch((S) => {
        if (getErrnoCode(S) === "ENOENT") return [];
        throw S;
      }),
    );
  if (y === XP) return !1;
  for (let S of y) {
    if (!S.endsWith(ORIGIN_SUFFIX)) continue;
    let w = join_24(parkDir, S.slice(0, -ORIGIN_SUFFIX.length) + PARKED_SUFFIX);
    try {
      let L = join_24(parkDir, S),
        G = await writeFileAtomically(L, MAX_ORIGIN_BYTES, { throwTransient: !0 });
      if (G === null) continue;
      if (oFt(G)) continue;
      let q = join_24(root, G),
        Z = relative_9(root, q).split(sep_15)[0] ?? "";
      if (
        isAbsolute_6(G) ||
        q === root ||
        !yk(q, root) ||
        MCt(Z) ||
        isOwnTempName(dU(Z), lU) ||
        !(await lstat_12(w)).isSymbolicLink() ||
        (await T_o(root, relative_9(root, dirname_16(q)), screen, { trustedRoot: root })) !== "clean"
      )
        continue;
      let Se = await classifyRealpathContainment(dirname_16(q), root);
      if (Se === "outside") continue;
      if (Se === "unknown") {
        complete = !1;
        continue;
      }
      let ke = await lstat_12(q).then(
        () => "present",
        (we) => (getErrnoCode(we) === "ENOENT" ? "vacant" : "unknown"),
      );
      if (ke === "present") continue;
      if (ke === "unknown") {
        complete = !1;
        continue;
      }
      (await retryFsOp(w, q),
        logForDebugging(`materializeLinks: ${label}: restored ${G} from an interrupted pass`));
    } catch (error) {
      let G = getErrnoCode(error);
      if (G === "ENOENT") continue;
      if (
        (logForDebugging(
          `materializeLinks: ${label}: cannot restore a parked entry from ${parkDir}: ${errorMessage(error)}`,
          { level: "warn" },
        ),
        G !== "ENAMETOOLONG" && G !== "EINVAL" && !(error instanceof TypeError))
      )
        complete = !1;
    }
  }
  return complete;
}
/**
 * 撤销版本目录的屏检标记：先删除；失败则移到临时名；再失败用 O_NOFOLLOW 打开并确认单链接普通文件后改写为 withdrawn。
 */
//@ chunk-e6aww6q8.js:712292-713001 placement
async function withdrawScreenMarker(e) {
  let n = join_24(e, lU),
    r = [
      () => rm_13(n, { force: !0 }),
      () => retryFsOp(n, makeTempSiblingPath(n)),
      async () => {
        let O_NOFOLLOW = constants_5.O_NOFOLLOW;
        if (getPlatform() === "windows" || O_NOFOLLOW === void 0)
          throw Error("in-place invalidation needs O_NOFOLLOW");
        let h = await lstat_12(n, { bigint: !0 });
        if (!h.isFile()) throw Error("marker name is not a regular file");
        let y = await open_5(n, constants_5.O_WRONLY | O_NOFOLLOW | (constants_5.O_NONBLOCK ?? 0));
        try {
          let stats = await y.stat({ bigint: !0 });
          if (!stats.isFile() || stats.nlink !== 1n || stats.ino !== h.ino || stats.dev !== h.dev)
            throw Error("marker is not the single-named regular file seen");
          (await y.truncate(0),
            await y.write(
              `withdrawn
`,
              0,
            ));
        } finally {
          await y.close();
        }
      },
    ];
  for (let s of r)
    try {
      return (await s(), !0);
    } catch (error) {
      logForDebugging(`materializeLinks: ${e}: cannot withdraw ${lU}: ${errorMessage(error)}`, {
        level: "warn",
      });
    }
  return !1;
}
/**
 * 以 wx 写入屏检标记（时间、CLI 版本、屏检版本与计数）；已存在且有效则视为成功，否则把目录转换后重写。
 */
//@ chunk-e6aww6q8.js:713001-713974 placement
async function writeScreenMarker(e, n, r) {
  let s = join_24(n, lU),
    h = {
      at: new Date().toISOString(),
      cli: {
        ISSUES_EXPLAINER: "report the issue at https://github.com/anthropics/claude-code/issues",
        PACKAGE_URL: "@anthropic-ai/claude-code",
        README_URL: "https://code.claude.com/docs/en/overview",
        VERSION: "2.1.316",
        FEEDBACK_CHANNEL: "https://github.com/anthropics/claude-code/issues",
        BUILD_TIME: "2026-10-30T23:28:13Z",
        GIT_SHA: "cd7ceb459c6864567b16a11f60101b24421475c1",
        HOOKS_WORKER_URL: import.meta.dir + "/./src/plugins/functionHooks/hooks-worker/hooks-worker.js",
        DD_SOURCEMAP_GROUP: "default",
      }.VERSION,
      screen: SCREEN_VERSION,
      materialized: r.materialized,
      removed: r.removed,
      failed: r.failed,
    },
    y =
      jsonStringify(h) +
      `
`;
  try {
    return (await writeFile_5(s, y, { flag: "wx" }), !0);
  } catch (error) {
    if (getErrnoCode(error) !== "EEXIST")
      return (
        logForDebugging(`materializeLinks: ${e}: cannot write ${lU}: ${errorMessage(error)}`, {
          level: "warn",
        }),
        !1
      );
  }
  try {
    if (await hasValidScreenMarker(n)) return !0;
    return (await convertDirectoryToZipInPlace(n, lU), await writeFile_5(s, y, { flag: "wx" }), !0);
  } catch (error) {
    return (
      logForDebugging(`materializeLinks: ${e}: cannot write ${lU}: ${errorMessage(error)}`, {
        level: "warn",
      }),
      !1
    );
  }
}
//@ chunk-e6aww6q8.js:713974-713994 placement
var weakMap_7 = new WeakMap();
//@ chunk-e6aww6q8.js:713994-714271 placement
function materializeVersionLinksOnce(e, n, r, s, h) {
  if (!isStorageV5Enabled() || s === void 0 || isDiskless()) return Promise.resolve();
  let y = weakMap_7.get(s);
  if (y === void 0) ((y = { attempts: new Map(), deferrals: new Map() }), weakMap_7.set(s, y));
  let attempts = y.attempts,
    w = attempts.get(e);
  if (w === void 0)
    ((w = materializeVersionLinks(e, n, r, y.deferrals, h).then((L) => {
      if (!L) attempts.delete(e);
    })),
      attempts.set(e, w));
  return w;
}
//@ chunk-e6aww6q8.js:714271-714523 placement
async function hasValidScreenMarker(e) {
  let n = join_24(e, lU),
    r = await lstat_12(n).catch((h) => {
      if (getErrnoCode(h) === "ENOENT") return null;
      throw h;
    });
  if (r === null || !r.isFile() || r.size > MAX_SCREEN_MARKER_BYTES) return !1;
  let s = await writeFileAtomically(n, MAX_SCREEN_MARKER_BYTES);
  if (s === null) return !1;
  try {
    return ScreenMarkerSchema().safeParse(jsonParse(s)).success;
  } catch {
    return !1;
  }
}
//@ chunk-e6aww6q8.js:714523-715316 placement
async function removeLinkMarkers(e) {
  let n = join_24(e, qm);
  try {
    let r = await removePathEntry(n);
    if (r === "removed") logForDebugging(`materializeLinks: ${e}: removed ${qm}: not a directory of markers`);
    return r;
  } catch (error) {
    let s = getErrnoCode(error);
    if (s === void 0 || !MD.has(s)) throw error;
    let h;
    try {
      h = await lstat_12(n);
    } catch (error) {
      if (getErrnoCode(error) === "ENOENT") return "absent";
      throw error;
    }
    if (h.isDirectory())
      return (
        logForDebugging(
          `materializeLinks: ${e}: cannot remove from ${qm} (${s}): a directory of markers this process cannot write in is not listed, probed or converted in this process`,
        ),
        "directory-unproven"
      );
    if (h.isFile() || h.isFIFO() || h.isSocket())
      return (
        logForDebugging(
          `materializeLinks: ${e}: cannot remove ${qm} (${s}): not a directory of markers, nothing reads through it; proceeding`,
        ),
        "junk"
      );
    return (
      logForDebugging(`materializeLinks: ${e}: cannot remove ${qm} (${s}); leaving the tree as it is`, {
        level: "warn",
      }),
      "unremovable"
    );
  }
}
/**
 * 列出待实体化的链接，无法列出时留给探测判断。
 */
//@ chunk-e6aww6q8.js:715316-717278 placement
async function listPluginLinks(e) {
  let n = join_24(e, qm),
    r = await rescreenMarkerDir(e, n);
  if (r === null) return;
  let s = await readdir_10(n, { withFileTypes: !0 }).catch((h) => {
    let y = getErrnoCode(h);
    if (y === "ENOENT" || y === "ENOTDIR") return [];
    if (y === void 0 || !MD.has(y)) throw h;
    return (
      logForDebugging(`materializeLinks: ${e}: cannot list ${qm} (${y}); left for the probe to judge`, {
        level: "warn",
      }),
      []
    );
  });
  for (let h of s) {
    let y = join_24(n, h.name);
    if (!(await getFileIdentity_3(n, r))) {
      logForDebugging(
        `materializeLinks: ${e}: ${qm} was replaced while its children were screened; left for the probe to judge`,
        { level: "warn" },
      );
      return;
    }
    let S = P_o(h.name),
      w = "nonRegular",
      L = "not a regular file";
    if (h.isDirectory()) {
      if (!S) {
        logUnrecognizedMarker(e, h.name);
        continue;
      }
      ((w = "directory"), (L = "wears a directory's type"));
    } else if (!h.isSymbolicLink()) {
      let q;
      try {
        q = await lstat_12(y);
      } catch (error) {
        let Se = getErrnoCode(error);
        if (Se === "ENOENT" || Se === "ENOTDIR") q = null;
        else if (Se !== void 0 && MD.has(Se)) {
          logForDebugging(
            `materializeLinks: ${e}: cannot examine ${qm}/${h.name} (${Se}); left for the probe to judge`,
            { level: "warn" },
          );
          continue;
        } else throw error;
      }
      if (q === null) continue;
      if (q.isDirectory()) {
        if (!S) {
          logUnrecognizedMarker(e, h.name);
          continue;
        }
        ((w = "directory"), (L = "wears a directory's type"));
      } else if (q.isFile()) {
        if (!S) {
          logUnrecognizedMarker(e, h.name);
          continue;
        }
        if (q.size > MAX_MARKER_BYTES) ((w = "oversized"), (L = "larger than any marker"));
        else if (q.size > 0 && !atomicMoveToInstallPath_2(h.name)) continue;
        else {
          if (Fpe(q.mtimeMs)) continue;
          ((w = "staleLeftover"),
            (L = atomicMoveToInstallPath_2(h.name)
              ? "in-flight marker outside the live window"
              : "empty file outside the live window"));
        }
      }
    }
    if (!(await getFileIdentity_3(n, r))) {
      logForDebugging(
        `materializeLinks: ${e}: ${qm} was replaced while its children were screened; left for the probe to judge`,
        { level: "warn" },
      );
      return;
    }
    if (!(await shouldRemoveMarkerEntry(y, h.name, w))) continue;
    let G;
    try {
      G = w === "directory" ? await rmdirIfEmpty(y) : await removePathEntry(y);
    } catch (error) {
      let Z = getErrnoCode(error);
      if (Z === "ENOTDIR") return;
      if (Z === void 0 || !MD.has(Z)) throw error;
      logForDebugging(
        `materializeLinks: ${e}: cannot remove ${qm}/${h.name} (${Z}); left for the probe to judge`,
        { level: "warn" },
      );
      continue;
    }
    if (G === "removed") logForDebugging(`materializeLinks: ${e}: removed ${qm}/${h.name}: ${L}`);
    else if (G === "directory")
      logForDebugging(`materializeLinks: ${e}: left ${qm}/${h.name}: a directory, not a session's marker`);
  }
}
//@ chunk-e6aww6q8.js:717278-717339 placement
function P_o(e) {
  return /^[0-9]+(\.tmp\.[0-9a-f]+)?$/i.test(e);
}
//@ chunk-e6aww6q8.js:717339-717506 placement
async function rmdirIfEmpty(e) {
  try {
    return (await rmdir_5(e), "removed");
  } catch (error) {
    let r = getErrnoCode(error);
    if (r === "ENOENT") return "absent";
    if (r === "ENOTEMPTY" || r === "EEXIST") return "directory";
    throw error;
  }
}
/**
 * 按类别判断标记目录项是否应删除。
 */
//@ chunk-e6aww6q8.js:717506-717835 placement
async function shouldRemoveMarkerEntry(e, n, r) {
  let s = await lstat_12(e).catch(() => null);
  if (s === null || I_o(s, n)) return !1;
  switch (r) {
    case "nonRegular":
      return !s.isFile() && !s.isDirectory();
    case "directory":
      return s.isDirectory();
    case "oversized":
      return s.isFile() && s.size > MAX_MARKER_BYTES;
    case "staleLeftover":
      return (
        s.isFile() &&
        s.size <= MAX_MARKER_BYTES &&
        (s.size === 0 || atomicMoveToInstallPath_2(n)) &&
        !Fpe(s.mtimeMs)
      );
  }
}
//@ chunk-e6aww6q8.js:717835-717931 placement
function I_o(e, n) {
  return /^[0-9]+$/.test(n) && e.isFile() && e.size <= MAX_MARKER_BYTES && (e.size > 0 || Fpe(e.mtimeMs));
}
//@ chunk-e6aww6q8.js:717931-718050 placement
function logUnrecognizedMarker(e, n) {
  logForDebugging(
    `materializeLinks: ${e}: left ${qm}/${n}: not named like a session's marker; the probe judges it`,
  );
}
/**
 * 列出前重新确认 in_use 目录仍是真实目录。
 */
//@ chunk-e6aww6q8.js:718050-718560 placement
async function rescreenMarkerDir(e, n) {
  try {
    let r = await lstat_12(n, { bigint: !0 });
    if (!r.isSymbolicLink() && r.isDirectory() && (await isSameFilesystem(e, qm))) return r;
    let s = await removePathEntry(n);
    return (
      logForDebugging(
        `materializeLinks: ${e}: ${qm} re-screened before listing: no longer a real directory (${s === "directory" ? "left, a non-empty directory" : s})`,
      ),
      null
    );
  } catch (error) {
    let s = getErrnoCode(error);
    if (s === "ENOENT" || s === "ENOTDIR") return null;
    if (s === void 0 || !MD.has(s)) throw error;
    return (
      logForDebugging(`materializeLinks: ${e}: cannot re-examine ${qm} (${s}); left for the probe to judge`, {
        level: "warn",
      }),
      null
    );
  }
}
//@ chunk-e6aww6q8.js:718560-718714 placement = getFileIdentity (0.865)
async function getFileIdentity_3(e, n) {
  let r = await lstat_12(e, { bigint: !0 }).catch(() => null);
  return r !== null && !r.isSymbolicLink() && r.isDirectory() && r.dev === n.dev && r.ino === n.ino;
}
/**
 * 把插件版本目录中的链接实体化，跳过符号链接的版本目录。
 */
//@ chunk-e6aww6q8.js:718714-720591 placement
async function materializeVersionLinks(e, n, r, s, h) {
  let y = relative_9(n, e),
    parts = y.split(sep_15);
  if (!y || isAbsolute_6(y) || parts.length !== 3 || parts.some((w) => w === "" || w === "." || w === ".."))
    return !0;
  try {
    if (e.endsWith(".zip")) {
      let Se = await lstat_12(e).catch((ke) => {
        let we = getErrnoCode(ke);
        if (we === "ENOENT" || we === "ENOTDIR") return null;
        throw ke;
      });
      if (Se === null || !Se.isDirectory()) return !0;
    }
    let w = await lstat_12(e);
    if (
      w.isSymbolicLink() ||
      (getPlatform() === "windows" && !(await isSameFilesystem(dirname_16(e), basename_8(e))))
    )
      return (
        logForDebugging(
          `materializeLinks: skipping ${e}: version dir is a symlink (or can be read as a link)`,
        ),
        !0
      );
    if (!w.isDirectory()) return !0;
    let [L, G] = await Promise.all([realpath_4(e), realpath_4(n)]);
    if (L === G || !yk(L, G))
      return (logForDebugging(`materializeLinks: skipping ${e}: resolves outside the plugin cache`), !0);
    let q = await removeLinkMarkers(L);
    if (q === "unremovable" || q === "directory-unproven" || (await hasValidScreenMarker(e))) return !0;
    if (q === "directory") await listPluginLinks(L);
    if (h !== void 0 && (await h())) {
      let Se = await lstat_12(e, { bigint: !0 }),
        ke = s.get(L);
      if (
        ke !== void 0 &&
        (ke.ino !== Se.ino ||
          (ke.birthtimeNs !== 0n && Se.birthtimeNs !== 0n && ke.birthtimeNs !== Se.birthtimeNs))
      )
        ke = void 0;
      let now = Date.now();
      if (ke === void 0)
        s.set(L, { since: now, announced: !1, versionPath: e, ino: Se.ino, birthtimeNs: Se.birthtimeNs });
      if (ke === void 0 || now - ke.since < MATERIALIZE_MAX_AGE_MS)
        return (
          logForDebugging(
            `materializeLinks: deferring ${L}: in use (possibly by this session), or liveness could not be determined`,
          ),
          !1
        );
      if (!ke.announced)
        ((ke.announced = !0),
          logForDebugging(
            `materializeLinks: ${L}: deferred since ${new Date(ke.since).toISOString()} to in-use markers that still read live, or a liveness probe that kept failing; converting now`,
            { level: "warn" },
          ));
    } else s.delete(L);
    if ((await realpath_4(e)) !== L)
      return (
        logForDebugging(
          `materializeLinks: ${e}: moved while its liveness was probed; judged on a later load`,
        ),
        !1
      );
    let Z = await materializePluginLinks(e, r, { mode: "migrate" });
    return (s.delete(L), Z.vouched || Z.readOnly || Z.settledUnvouched === !0);
  } catch (error) {
    let L = getErrnoCode(error);
    if (L === "ENOENT") {
      for (let [G, q] of s) if (q.versionPath === e) s.delete(G);
      return !1;
    }
    return (
      logForDebugging(`materializeLinks: ${e}: ${errorMessage(error)}`, { level: "warn" }),
      L === void 0 || !TRANSIENT_FS_ERRORS.has(L)
    );
  }
}
//@ chunk-e6aww6q8.js:720591-720652 placement
var TEMP_SUFFIX_MARK = ".tmp~",
  TEMP_SUFFIX_HEX_RE = /^[0-9a-f]{8}$/,
  TEMP_SUFFIX_RE = /\.tmp~[0-9a-f]{8}$/;
//@ chunk-e6aww6q8.js:720652-720711 placement = generatePlaceholders (1)
function makeTempSiblingName(e) {
  return `${e}${TEMP_SUFFIX_MARK}${randomBytes_5(4).toString("hex")}`;
}
//@ chunk-e6aww6q8.js:720711-720838 placement
function classifyTempSibling(e, n) {
  if (
    e.startsWith(n + TEMP_SUFFIX_MARK) &&
    TEMP_SUFFIX_HEX_RE.test(e.slice(n.length + TEMP_SUFFIX_MARK.length))
  )
    return "current";
  return isOwnTempName(e, n) ? "scratch" : null;
}
//@ chunk-e6aww6q8.js:720838-721052 placement
async function moveIntoVersionPath(e, n) {
  if (
    (await rm_12(join_23(e, R1), { force: !0 }),
    !(await lstat_11(n).then(
      () => !1,
      (s) => {
        if (isPathAbsent(s)) return !0;
        throw s;
      },
    )))
  )
    throw Object.assign(Error("plugin cache version path is occupied"), { code: "EEXIST" });
  await retryFsOp(e, n);
}
//@ chunk-e6aww6q8.js:721052-721159 placement
async function dirHasAnyEntry(e, n) {
  try {
    let r = new Set(await readdir_9(e));
    return n.some((s) => r.has(s));
  } catch (error) {
    return !isPathAbsent(error);
  }
}
//@ chunk-e6aww6q8.js:721159-721196 placement
var B_o = /^[0-9]+\.tmp\.[0-9a-f]{8}$/;
//@ chunk-e6aww6q8.js:721196-721426 placement
async function removeStaleMarkerFiles(e) {
  let n = await readdir_9(e).catch(() => []),
    r = Date.now() - P7s;
  for (let s of n) {
    if (!B_o.test(s) && !eie(s)) continue;
    let h = join_23(e, s),
      y = await lstat_11(h).catch(() => null);
    if (y !== null && y.isFile() && y.mtimeMs < r) await unlink_4(h).catch(() => {});
  }
}
//@ chunk-e6aww6q8.js:721426-721466 placement
function yz(e) {
  return pz(e) || eie(dU(e));
}
//@ chunk-e6aww6q8.js:721466-721622 placement
async function hasRealEntries(e, { whenUnreadable: n = !0 } = {}) {
  try {
    return (await readdir_9(e)).some((r) => !yz(r));
  } catch (error) {
    if (isPathAbsent(error)) return !1;
    if (n) return !0;
    if (isFsInaccessible(error)) return !1;
    throw error;
  }
}
//@ chunk-e6aww6q8.js:721622-721763 placement
async function isLinkLike(e, n) {
  if (n.isSymbolicLink()) return !0;
  if (!n.isDirectory()) return !1;
  try {
    return !(await isSameFilesystem(dirname_15(e), basename_7(e)));
  } catch (error) {
    return !isPathAbsent(error);
  }
}
//@ chunk-e6aww6q8.js:721763-721854 placement
function Upe(e) {
  return new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
    e,
    "plugin cache version path occupant could not be examined",
  );
}
//@ chunk-e6aww6q8.js:721854-721983 placement
async function classifyCacheEntry(e) {
  try {
    let n = await lstat_11(e);
    return (await isLinkLike(e, n)) ? "symlink" : "other";
  } catch (error) {
    return isPathAbsent(error) ? "absent" : "unexaminable";
  }
}
//@ chunk-e6aww6q8.js:721983-722017 placement
function l7(e) {
  return TEMP_SUFFIX_RE.test(e);
}
//@ chunk-e6aww6q8.js:722017-722058 placement
function fFt(e) {
  return e.replace(TEMP_SUFFIX_RE, "");
}
//@ chunk-e6aww6q8.js:722058-722075 placement
var pFt = 86400000;
/**
 * 清理版本目录旁过期的临时兄弟项。
 */
//@ chunk-e6aww6q8.js:722075-722480 placement
async function sweepStaleTempSiblings(e) {
  let n = dirname_15(e),
    r = basename_7(e),
    s = await readdir_9(n).catch(() => []),
    h = Date.now() - pFt;
  await Promise.all(
    s.map(async (y) => {
      let S = classifyTempSibling(y, r);
      if (S === null) return;
      let w = join_23(n, y),
        L = await lstat_11(w).catch(() => null);
      if (L === null || L.mtimeMs >= h) return;
      if (await isLinkLike(w, L)) {
        await unlink_4(w).catch(() => rmdir_4(w).catch(() => {}));
        return;
      }
      if (S === "scratch") {
        if (!L.isDirectory()) await unlink_4(w).catch(() => {});
        return;
      }
      await removeDirectoryTreeNoFollow(w).catch(() => {});
    }),
  );
}
//@ chunk-e6aww6q8.js:722480-722495 placement
var j_o = 600000;
/**
 * 尝试删除版本目录：是链接、含非可清理项或有新鲜标记时返回 held；清理 in_use 标记目录、node_modules 与临时项后 rmdir， 成功返回 removed。
 */
//@ chunk-e6aww6q8.js:722495-723808 placement
async function removeVersionDirIfIdle(e) {
  let n;
  try {
    n = await lstat_11(e);
  } catch (error) {
    if (!isPathAbsent(error)) return "held";
    n = null;
  }
  if (n !== null && (await isLinkLike(e, n))) return "held";
  let r;
  try {
    r = await readdir_9(e);
  } catch (error) {
    let h = getErrnoCode(error);
    if (h === "ENOENT") return "removed";
    if (h !== "ENOTDIR") throw error;
    let y;
    try {
      y = await lstat_11(e);
    } catch (error) {
      if (!isPathAbsent(error)) return "held";
      y = null;
    }
    if (y === null) return "removed";
    if (y.isDirectory() || y.isSymbolicLink() || e.endsWith(".zip")) return "held";
    return (await unlink_4(e), "removed");
  }
  for (let s of r) {
    if (!yz(s)) return "held";
    if (MCt(s)) {
      let h = await lstat_11(join_23(e, s)).catch(() => null);
      if (h === null || isFreshTimestamp(h.mtimeMs, j_o)) return "held";
    }
  }
  for (let s of r) {
    let h = join_23(e, s),
      y = dU(s);
    try {
      if (y === qm) {
        let S = await lstat_11(h).catch(() => null);
        if (S !== null && !S.isDirectory()) {
          if ((await removePathEntry(h)) === "directory") return "held";
        } else {
          if (S !== null && !(await isLinkLike(h, S))) await removeStaleMarkerFiles(h);
          await rmdir_4(h);
        }
      } else if (y === "node_modules" || isOwnTempName(y, lU) || isOwnTempName(y, "node_modules")) {
        let S = await lstat_11(h).catch((w) => {
          if (isPathAbsent(w)) return null;
          throw w;
        });
        if (S !== null && (await isLinkLike(h, S))) {
          if ((await removePathEntry(h)) === "directory") return "held";
        } else if (y === "node_modules") {
          let w = makeTempSiblingPath(h);
          (await retryFsOp(h, w), await removeDirectoryTreeNoFollow(w));
        } else await removeDirectoryTreeNoFollow(h);
      } else if ((await removePathEntry(h)) === "directory") return "held";
    } catch (error) {
      let w = getErrnoCode(error);
      if (w === "ENOTEMPTY" || w === "EEXIST") return "held";
      if (!isPathAbsent(error)) throw error;
    }
  }
  try {
    return (await rmdir_4(e), "removed");
  } catch (error) {
    let h = getErrnoCode(error);
    if (h === "ENOTEMPTY" || h === "EEXIST") return "held";
    if (isPathAbsent(error)) return "removed";
    throw error;
  }
}
/**
 * 目录及其内容都超过期限时删除遗留目录。
 */
//@ chunk-e6aww6q8.js:723808-724136 placement
async function removeStaleLeftover(e) {
  let n = Date.now() - pFt;
  try {
    if ((await lstat_11(e)).mtimeMs >= n) return !1;
    let r = await readdir_9(e);
    if (
      (await Promise.all(r.map((h) => lstat_11(join_23(e, h)).catch(() => null)))).some(
        (h) => h === null || h.mtimeMs >= n,
      )
    )
      return !1;
  } catch {
    return !1;
  }
  return removeVersionDirIfIdle(e).then(
    (r) => r === "removed",
    (r) => (logForDebugging(`Plugin cache: cannot remove leftover ${e}: ${errorMessage(r)}`), !1),
  );
}
//@ chunk-e6aww6q8.js:724136-724184 placement
async function Cje(e) {
  await removeDirectoryTreeNoFollow(e).catch(() => {});
}
/**
 * 检查路径从自身父目录到 base 之间是否有符号链接或无法检查的祖先目录；有则不信任存储层（storageV5）对该路径的操作。
 */
//@ chunk-e6aww6q8.js:724184-724353 placement
async function hasLinkedAncestorBelow(e, n) {
  let r = dirname_14(n);
  for (let s = dirname_14(e); ; s = dirname_14(s)) {
    let h = await classifyCacheEntry(s);
    if (h === "symlink" || h === "unexaminable") return !0;
    if (s === r || !s.startsWith(r + sep_14)) return !1;
  }
}

export {
  Upe,
  classifyCacheEntry,
  hasRealEntries,
  z8,
  createLinkTargetScreen,
  yk,
  withdrawScreenMarker,
  materializePluginLinks,
  materializeVersionLinksOnce,
  pz,
  yz,
  l7,
  K8,
  I0,
  bje,
  sweepStaleTempSiblings,
  makeTempSiblingName,
  hasLinkedAncestorBelow,
  moveIntoVersionPath,
  removeVersionDirIfIdle,
  Cje,
  removeStaleLeftover,
  dirHasAnyEntry,
  fFt,
};
