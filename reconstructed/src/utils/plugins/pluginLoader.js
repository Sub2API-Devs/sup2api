/**
 * utils/plugins/pluginLoader.ts
 *
 * 插件加载核心：版本化缓存（目录/zip、link 模式）、各来源下载（npm/git/github/git-subdir/archive/command）、manifest 解析、由目录构造插件对象、合并会话/市场/同步/内置插件，loadAllPlugins/loadAllPluginsCacheOnly 及其全局缓存。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/utils/plugins/pluginLoader.ts
 * pieces: chunk-3wek6r2k.js (1), chunk-5aas12zq.js (1), chunk-9tyqgtn4.js (1), chunk-e6aww6q8.js (196), chunk-g6j7q15x.js (1)
 * attribution: fingerprint 22, placement 127, affinity 1, layout 44, file-local 2, callgraph-witnessed 2, callgraph-fingerprint 1, sole-consumer 1
 */
import * as pathModule from "path";
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
} from "path";
import {
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
  copyFile,
  copyFile as copyFile_2,
  copyFile as copyFile_3,
  copyFile as copyFile_4,
  copyFile as copyFile_5,
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
  symlink,
  symlink as symlink_2,
  symlink as symlink_3,
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
  createWriteStream,
} from "fs";
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
import { Readable } from "stream";
import { pipeline } from "stream/promises";
import { xr } from "../../../vendor/lodash-es/_inlinedHelpers.js";
import { Mu, truncateToLength, firstLineOf, plural, nfcLower } from "../stringUtils.js";
import {
  NMt,
  SMe,
  SSH_BATCH_CONFIG_ARGS,
  prepareGitWorkDir,
  SAFE_UPLOAD_PACK_ARG,
  pickGitNoPromptEnv,
} from "../gitSafeExec.js";
import { GITHUB_HOST } from "../git/githubUrl.js";
import {
  bT,
  fetchNpmPackage,
  ZJn,
  NPM_DIRECT_INSTALL_DISABLED_MESSAGE,
  toNpmMarketplaceSource,
  NPM_REGISTRY,
} from "./npmPluginSource.js";
import {
  getOriginalCwd,
  markSyncedPluginDirsLoadedHere,
  markSyncedPluginLaneOpened,
  hasRegisteredSyncedPluginDirs,
  getSyncedPluginRowId,
  getOriginalCwdOrNull,
  getInlinePlugins,
  getInlinePluginsNoMcp,
  getInlinePluginUrls,
  getSyncedPluginAttestation,
  setAttestedOfficialPluginIds,
  setLastSyncedLaneLoad,
  isDiskless,
} from "../../bootstrap/state.js";
import { tildify } from "../path.js";
import {
  getPluginsDirectory,
  parseVersionCachePath,
  sanitizePluginId,
  escapeNpmPackageForDir,
  kkn,
  getPluginSeedDirs,
  c5t,
  isVersionRootStorageKey,
  storageKeyToCachePath,
  L2e,
  isUsingCoworkPlugins,
} from "./pluginDirectories.js";
import { PLUGIN_CACHE_DIRNAME, recordProducerDir } from "./pluginCachePaths.js";
import { isStorageV5Enabled } from "../hoverRest.js";
import {
  TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS,
  errorMessage,
  isPathAbsent,
  getErrnoCode,
  sanitizeErrnoForTelemetry,
  isENOENT,
  isFsInaccessibleCode,
  isFsInaccessible,
  getErrnoPath as getErrnoPath_2,
  withTelemetryMessage,
  toError,
} from "../errors.js";
import { isSameFilesystem, fileSwappedError, copyFileNoFollow } from "./safeCopy.js";
import {
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
} from "./pluginCacheMaterialize.js";
import { removePathEntry, removeDirectoryTreeNoFollow, classifyDirEntry } from "../fsRemove.js";
import { logForDebugging } from "../debug.js";
import {
  writeInUseMarker,
  removeInUseMarker,
  isPluginVersionInUse,
  KP,
  sweepInUseMarkers,
  releaseMarkersOutside,
} from "./inUseMarkers.js";
import {
  parsePluginIdentifier,
  parsePluginIdentifier_2,
  isOfficialMarketplace,
  isOfficialMarketplaceName_3,
  isRequiredPlugin,
  findPluginSetting,
  marketplaceSuffix,
  isPluginEnabled,
  pluginNameAliases,
  normalizePluginId,
} from "./pluginIdentifier.js";
import {
  NPM,
  PluginHooksSchema,
  PluginMonitorsArraySchema,
  redactNpmTarball,
  PluginIdSchema,
  isAsciiImpersonatingOfficialName,
  redactMarketplaceSource,
  isNpmPluginId,
  gitSha,
  PLUGIN_NAME_FORBIDDEN_CHARS_RE,
  INVISIBLE_CHARS_RE,
  ALLOWED_OFFICIAL_MARKETPLACE_NAMES,
} from "./schemas.js";
import { formatStorageError, storageErrorCode } from "../storage/storageErrors.js";
import { FX } from "../../services/memorySync/pathScrub.js";
import { pathExists, pathPresence } from "../fsSafety/atomicWriteStaging.js";
import {
  listStorageScopeNames,
  ManifestLoadError,
  MANIFEST_ERROR_CLASSES,
  isGitUsable,
  validatePluginManifest,
  describePluginDirShape,
  loadSkillsAsPlugins_2,
  h1t,
} from "./pluginManifestRead.js";
import { STORAGE_SPACES } from "../storage/storageSpaces.js";
import { R1 } from "./cacheUtils.js";
import {
  filterInstallationsForCurrentProject,
  removeInstallationsAndRefreshSnapshot,
  primeInstalledPluginsCache,
  loadInstalledPlugins,
  loadInstalledPluginsSync,
  getInstalledPluginsSnapshot,
  PF,
  readInstalledPluginsLenient,
  getInstalledListRefusal,
  readInstalledPluginsFile,
} from "./installedPluginsManager.js";
import {
  classifyMarketplacePath,
  getMarketplaceCandidatePaths,
  UNSAFE_PATH_EXPLANATION,
  isWindowsPluginInsideLocalMarketplace,
  resolveMarketplaceEntryPath,
  entryResolutionError,
  localMarketplacePathExists,
  normalizeRegistryKey,
} from "./localMarketplacePaths.js";
import {
  Bd,
  classifyLinkFarm,
  Sii,
  hasEntriesOutsideTarget,
  nSn,
  Nee,
  checkRelinkTarget,
  Q5o,
  makeTempCachePathName,
  Kqe,
  holdCommandSourceForOrg,
  PLUGIN_JSON,
  removeIgnoredEntries,
  findPluginRootInExtracted,
  $kt,
  PLUGIN_MANIFEST_PATH,
  wpe,
  isLiveLinkFarm,
  HVt,
  MARKETPLACE_MANIFEST_PATH,
  PLUGIN_ROOT_MARKERS,
  Oxe,
  o1,
} from "./commandSource.js";
import {
  redactUrlsInMessage,
  redactKnownUrls,
  redactUrlQuery,
  redactUrlsTracked,
  redactUrlsInText,
  replaceAll,
  REDACTED_URL,
} from "../redaction/urlRedaction.js";
import {
  printableMessage,
  truncateWithEllipsis,
  printableName,
  printableOrEmpty,
  quotedPrintable,
} from "../printableName.js";
import { getFsImplementation } from "../fsOperations.js";
import { MCt } from "../pathSegments.js";
import { getPlatform } from "../platform.js";
import { resolvePathChain, realpathAllowMissing as realpathAllowMissing_2, ck } from "../pathResolution.js";
import {
  isPluginZipCacheEnabled,
  publishDirectoryAsZip,
  extractZipToDirectory,
  getZipExtractionState,
  getSessionPluginCachePath,
} from "./zipCache.js";
import {
  validatePathWithinBase,
  Qj,
  isUnboundOfficialPlugin,
  isDirectoryRepositoryChanged,
  getBoundRepositoryKeys,
} from "./pluginInstallationHelpers.js";
import { installPluginDependencies, checkLockfileSupported } from "./pluginDependencies.js";
import { provisionBinaryAssets } from "./pluginBinaryAssets.js";
import {
  pluginCacheStorageScope,
  calculatePluginVersion,
  probePluginGitHead,
  Xj,
  getPluginCloneUrl,
  Yse,
} from "./pluginVersioning.js";
import { assertFullCommitSha, verifyPinnedSha, hasSymlinkBetween } from "./gitShaPin.js";
import { resolveGitSshConfig, readGitSshCommand, isSshAuthFailureOutput, zpe, yFt } from "./gitSshConfig.js";
import { execFileNoThrow, execFileNoThrowWithCwd } from "../execFileNoThrow.js";
import { gitExe } from "../git.js";
import { logPluginFetch, classifyFetchError } from "./fetchTelemetry.js";
import { runGitInOwnWorkTree, isNetworkGitUrl } from "../git/gitLanes.js";
import { parsePluginGitUrl } from "./gitUrl.js";
import { GIT_MISSING_MAC_MESSAGE } from "../git/gitMissingMessage.js";
import { retryFsOp, retryTransient } from "../atomicPublishWrite.js";
import { jsonStringify, jsonParse } from "../slowOperations.js";
import { installClaudeAiPlugin } from "./claudeAiPluginInstall.js";
import {
  withFeatureTelemetry,
  logFeatureOk,
  logFeatureBad,
  logFeatureSad,
} from "../../services/analytics/featureTelemetry.js";
import { sameOrigin as sameOrigin_2 } from "../network/privateHostCheck.js";
import { downloadAndVerifyBinary } from "./archiveDownload.js";
import {
  assertManifestContained,
  resolveComponentPath,
  reportIfPathEscapes,
  resolveContainmentRoots,
  specCoversDefaultDir,
} from "./pluginPathContainment.js";
import { Wo } from "../json.js";
import { readManifestDependencyPins, mO, verifyAndDemote } from "./dependencyResolver.js";
import {
  hasNestedHooks,
  SETTINGS_SKIPPED_KEYS,
  looksLikeHookMatcher,
  HookValidationError,
  GUARD_HOOK_EVENTS,
  UNLOADABLE_GUARD_NOTE,
  validateHooksSetting,
  hasGuardHooks_2,
  parseHooksSetting,
} from "../../schemas/hookEntryValidation.js";
import { isPlainObject as isPlainObject_4 } from "../isPlainObject.js";
import { warnUnknownHooksJsonKeys } from "./loadPluginHooks.js";
import {
  logPluginFolderShadowed,
  SKILLS_DIR,
  Z4o,
  BUILTIN,
  logPluginRenamed,
  SYNCED,
  INLINE_PLUGIN_MARKETPLACE,
  rri,
  ori,
  sri,
} from "../telemetry/pluginTelemetry.js";
import { logError } from "../log.js";
import { DoctorLazy } from "../../cli/handlers/util.js";
import { u } from "../../../vendor/zod/v4/classic/schemas.js";
import { getSettingsFieldSchema } from "../settings/types.js";
import {
  tryUnwrapTextPayload,
  loadKnownMarketplacesSafe,
  isKnownMarketplacesReadFailure,
  getMarketplaceCacheOnly,
  validateReservedMarketplaceEntry,
  Dse,
  findPluginDirectoryEntry,
  getPluginByIdCacheOnly,
  findMissedListingEntry,
  ugn,
  LGn,
  pluginDirectoryNotInstallableReason,
  seedDirFor,
  lEt,
} from "./marketplaceManager.js";
import { runCommandHint, claudeCommand } from "../worktreeResumeHint.js";
import {
  npmResolutionPolicyRefusal,
  isMarketplaceRestrictionPolicyActive,
  getStrictKnownMarketplaces,
  isSourceDisallowedOrUnverifiable,
  pluginDirectoryPolicyBlock,
  isSourceAllowedByPolicy,
  isSourceInBlocklist,
  isPluginDirectoryDisabledByPolicy,
  areCommandPluginSourcesDisabledByPolicy,
  noteHeldForTheAnswer,
  commandPluginSourcesDisabledMessage,
  isOfficialMarketplaceSourceVouched,
  areSideloadFlagsDisabledByPolicy,
  sideloadFlagsBlockedMessage,
} from "./marketplacePolicy.js";
import { getAddDirEnabledPlugins } from "./addDirPluginSettings.js";
import { getSettings_DEPRECATED, getSettingsForSource } from "../settings/settings.js";
import {
  uF,
  pGn,
  validateDeclaredMarketplaceSource,
  logMarketplaceNoticeOnce,
  Xut,
  Vut,
  findUrlMarketplaceHeaders,
  findSettingsArchiveEntry,
} from "./marketplaceSources.js";
import { X5 } from "./claudeAiMarketplaces.js";
import {
  isPluginDirectorySource,
  OFFICIAL_MARKETPLACE_NAME,
  OFFICIAL_MARKETPLACE_DISPLAY,
} from "./officialMarketplaceNames.js";
import { sleep, withTimeout as withTimeout_2 } from "../sleep.js";
import { resolvePluginRename, migrateRenamedPluginsInSettings } from "./pluginRenames.js";
import { lpe, findBindingKeysFor } from "./pluginDirectoryBindings.js";
import { toComparablePath, isPathWithin } from "../fsJunctions.js";
import { getResolvedMarketplacesCacheDir, NOT_RECORDED } from "./marketplaceNames.js";
import { formatSourceForDisplay } from "./marketplaceHelpers.js";
import { parseRepoWithRef, samePluginSource, pinnedSha } from "./pluginSourceUrl.js";
import { SETTING_SOURCES } from "../settings/constants.js";
import { vkn, thinkbackStorageKey } from "./pluginLinks.js";
import { $j } from "../pathClassification.js";
import { isServerPluginId, getPluginAttribution } from "./pluginAttribution.js";
import { getPluginRegistry } from "./pluginLoadState.js";
import { stripInvisibleKeepEmoji, cleanOptionalText } from "../settings/marketplaceSettingsAliases.js";
import { isLocalMarketplaceSource } from "./reconciler.js";
import { mE, resolveArchiveDownloadHeaders } from "./headersHelper.js";
import { CLAUDE_PLUGINS_OFFICIAL } from "./officialMarketplace.js";
import { YX } from "./pluginDirectoryTelemetry.js";
import { hm } from "../pathPrefix.js";
import { isSafeZipPath } from "../dxt/zip.js";
import { DFe } from "./syncedItems.js";
import { claimOnce } from "../../services/api/verificationRequired.js";
import { fromEnum, lit as lit_2 } from "../../services/analytics/safeMetadata.js";
import { desktopSkillsPluginDir, isTopHostSession } from "../sessionShape.js";
import { isLocalSettingsGitTracked } from "../config.js";
import { F8, getEnabledPluginsBySource, findUserDisabledOverrides } from "./pluginSettingsSources.js";
import { getProxyFetchOptions } from "../proxy.js";
import { dii, brr, wie, Sie, Jbn } from "../../services/plugins/accountSync/syncedPluginHooks.js";
import { pNt, getRegisteredSyncedDirs, listSyncedPluginDirs, Ob } from "../claudeAiSync/pluginsSync.js";
import { ANTHROPIC_SKILLS } from "../../skills/syncedSkills.js";
import { isPersonalConfigRestricted } from "../personalConfigRestriction.js";
import { pMap } from "../../../vendor/p-map/index.js";
import { logEvent } from "../../services/analytics/index.js";
import { count } from "../collections.js";
import { matchPolicyPluginEntry, getPolicyEnabledPluginEntries } from "./managedPlugins.js";
import { managedHooksPolicyStamp, T6 } from "../../plugins/functionHooks/policyGate.js";
import { Khi } from "../startupTiming.js";
import { env } from "../env.js";
import { checkHooksModulesFlag } from "../../services/analytics/growthbookCredentials.js";
import { getBuiltinPlugins } from "../../plugins/builtinPlugins.js";
import { shouldAllowManagedHooksOnlyByPolicy } from "../hooks/hooksConfigSnapshot.js";
import { collectSyncedSkillOverrides, persistSyncedPluginsOff } from "./syncedPluginSettings.js";
import { RIn, or, sxi, oxi } from "../settings/commandSyncNames.js";
import { ae } from "./validate/validatePluginDirectory.js";
import { _ } from "../../services/modelCatalog/publishedCatalog.js";

//@ chunk-e6aww6q8.js:606211-606381 placement
function mapStringsDeep(e, n) {
  if (typeof e === "string") return n(e);
  if (Array.isArray(e)) return e.map((r) => mapStringsDeep(r, n));
  if (typeof e === "object" && e !== null) return xr(e, (r) => mapStringsDeep(r, n));
  return e;
}
//@ chunk-e6aww6q8.js:606867-606884 placement
var jDt = 5,
  zDt = 40;
//@ chunk-e6aww6q8.js:606884-606953 placement
function rUe(e) {
  let n = Mu(e);
  return n.length <= zDt ? n : `${truncateToLength(n, zDt)}...`;
}
//@ chunk-e6aww6q8.js:606953-606988 placement
function zG(e) {
  return `"${rUe(e)}"`;
}
/**
 * 列表前 N 项用逗号连接，多余的写“and N more”。
 */
//@ chunk-e6aww6q8.js:606988-607082 placement = formatFailureDetails (0.777)
function formatFailureDetails_2(e) {
  let remaining = e.length - jDt;
  return e.slice(0, jDt).join(", ") + (remaining > 0 ? ` and ${remaining} more` : "");
}
/**
 * 路径是否以 .zip 结尾（忽略大小写）。
 */
//@ chunk-e6aww6q8.js:724353-724409 fingerprint = getVersionedZipCachePath (1)
function isZipPathCaseInsensitive(e) {
  return e.toLowerCase().endsWith(".zip");
}
/**
 * GitHub owner/repo 转克隆 URL：偏好 HTTPS 时 https://github.com/x.git，否则 git@github.com:x.git。
 */
//@ chunk-e6aww6q8.js:4324611-4324691 fingerprint = resolveGitSubdirUrl (0.712)
function githubRepoToCloneUrl(url) {
  return NMt() ? `https://github.com/${url}.git` : `git@${GITHUB_HOST}:${url}.git`;
}
/**
 * 构造 npm 命令的 --registry 参数；作用域包另加 --@scope:registry。
 */
//@ chunk-e6aww6q8.js:4391044-4391264 fingerprint = installFromNpm (0.359)
function buildNpmRegistryArgs(e, n) {
  if (!e.registry) return [];
  let packageSpec = n !== void 0 && n.startsWith("@") && bT(n) ? n.slice(0, n.indexOf("/")) : void 0;
  return packageSpec === void 0
    ? ["--registry", e.registry]
    : ["--registry", e.registry, `--${packageSpec}:registry=${e.registry}`];
}
/**
 * skill 显示路径：project 作用域且在 .claude/skills 下显示为 ./ 相对路径，否则缩写主目录。
 */
//@ chunk-e6aww6q8.js:4496936-4497084 placement = discoverSkillDirsForPaths (0.562)
function displaySkillsDirPath(e) {
  if (e.scope === "project") {
    let skillDir = join_9(getOriginalCwd(), ".claude", "skills");
    if (e.path.startsWith(skillDir + sep_8)) return "." + sep_8 + relative_5(getOriginalCwd(), e.path);
  }
  return tildify(e.path);
}
//@ chunk-e6aww6q8.js:4497084-4497119 placement
function ows() {
  return join_9(getPluginsDirectory(), PLUGIN_CACHE_DIRNAME);
}
//@ chunk-e6aww6q8.js:4497119-4497210 placement
function anchoredPluginCachePath() {
  let e = ows();
  return isAbsolute_4(e) && (sep_8 === "/" || parse(e).root.length > 1)
    ? resolve_5(e)
    : resolve_5(getOriginalCwd(), e);
}
//@ chunk-e6aww6q8.js:4497210-4497267 placement
function orphanMarkerCoordsV5(e, n) {
  return isStorageV5Enabled() && n !== void 0 ? parseVersionCachePath(e, anchoredPluginCachePath()) : null;
}
//@ chunk-e6aww6q8.js:4497267-4497344 placement
function strictCacheAddressable(e) {
  return (
    isStorageV5Enabled() &&
    e !== void 0 &&
    parseVersionCachePath(join_9(anchoredPluginCachePath(), "_", "_", "_"), anchoredPluginCachePath()) !==
      null
  );
}
//@ chunk-e6aww6q8.js:4497344-4497395 placement
async function versionParentContained(e) {
  return (await versionParentState(e)) === "real";
}
//@ chunk-e6aww6q8.js:4497395-4497558 placement
function versionParentUnexaminableError(e, n) {
  return new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
    `Could not examine the plugin directory of ${e} (${errorMessage(n)}); retry the install.`,
    "plugin cache version parent could not be examined",
  );
}
//@ chunk-e6aww6q8.js:4497558-4497804 placement
async function isPlainPluginParentDir(e) {
  let n = anchoredPluginCachePath(),
    r = relative_5(n, e),
    parts = r.split(sep_8);
  if (!r || isAbsolute_4(r) || parts.length !== 2 || parts.some((w) => w === "" || w === "." || w === ".."))
    return !1;
  let [h, y] = parts;
  if (h === void 0 || y === void 0) return !1;
  let S = await realpath_2(n);
  return (await isPlainDirectory(join_9(S, h))) && (await isPlainDirectory(join_9(S, h, y)));
}
//@ chunk-e6aww6q8.js:4497804-4497999 placement
async function isPlainDirectory(e) {
  if ((await lstat_3(e)).isDirectory() && (await isSameFilesystem(dirname_5(e), basename_3(e)))) return !0;
  let r = await stat_2(e).catch((s) => {
    if (isPathAbsent(s) || getErrnoCode(s) === "ELOOP") return null;
    throw s;
  });
  return r !== null && r.isDirectory();
}
/**
 * 各阶段版本父目录越界的遥测消息。
 */
//@ chunk-e6aww6q8.js:4497999-4498693 placement
var CONTAINMENT_FAILURE_MESSAGES = {
  "before relink": "plugin cache version parent not contained before relink",
  "during relink": "plugin cache version parent not contained during relink",
  "before reuse": "plugin cache version parent not contained before reuse",
  "before move": "plugin cache version parent not contained before move",
  "during move": "plugin cache version parent not contained during move",
  "before staging": "plugin cache version parent not contained before staging",
  "before overwrite": "plugin cache version parent not contained before overwrite",
  "during publish": "plugin cache version parent not contained during publish",
  "after a failed archive": "plugin cache version parent not contained after a failed archive",
};
//@ chunk-e6aww6q8.js:4498693-4499051 placement
async function requireVersionParentContained(e, n, r, s, h, y) {
  if (y === void 0 && (await versionParentState(e)) === "real") return;
  let S = `Could not ${s} ${n} ${r}: its plugin directory is not a directory (a dangling link, or a file wearing the marketplace or plugin folder name); make it a directory, or retry the install if it was being moved.`;
  throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
    S,
    CONTAINMENT_FAILURE_MESSAGES[h] ?? "plugin cache version parent not contained",
  );
}
//@ chunk-e6aww6q8.js:4499051-4499167 placement
async function versionParentState(e) {
  try {
    return (await isPlainPluginParentDir(dirname_5(e))) ? "real" : "refused";
  } catch (error) {
    if (isPathAbsent(error)) return "absent";
    throw versionParentUnexaminableError(e, error);
  }
}
//@ chunk-e6aww6q8.js:4499167-4499324 placement
function getPluginCachePath(e, n, r, s = "cache") {
  return Upe(
    `Could not ${s} ${n} ${r}: what occupies its cache path ${e} could not be examined; retry the load or the install.`,
  );
}
/**
 * 缓存/归档路径上的残留链接删不掉时抛错。
 */
//@ chunk-e6aww6q8.js:4499324-4499869 placement
async function removeStrayLinkOrThrow(e, n, r, s, h) {
  if ((await removePathEntry(e).catch(() => "directory")) !== "directory") return;
  if (h === "archive")
    throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
      `Could not ${s} ${n} ${r}: a link sits at its archive path and could not be removed; remove that link from the plugin cache, then retry the install.`,
      "plugin cache stray link at the archive path not removable",
    );
  throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
    `Could not ${s} ${n} ${r}: a link sits at its cache path and could not be removed; remove that link from the plugin cache, then retry the install.`,
    "plugin cache stray link not removable before replace",
  );
}
//@ chunk-e6aww6q8.js:4499869-4500162 placement
async function clearOccupantForReplace(e, n, r, s = "cache") {
  switch (await classifyCacheEntry(e)) {
    case "absent":
      return "done";
    case "other":
      return "recurse";
    case "symlink":
      return (
        await removeStrayLinkOrThrow(e, n, r, s, "cache"),
        logForDebugging(
          `Plugin ${n} version ${r}: removed a link at its cache path ${e} as an entry before replacing it`,
        ),
        "done"
      );
    default:
      throw getPluginCachePath(e, n, r, s);
  }
}
//@ chunk-e6aww6q8.js:4500162-4500507 placement
async function strictArchivePresent(e, n, r, s) {
  switch (await classifyCacheEntry(e)) {
    case "absent":
      return !1;
    case "other":
      return !0;
    case "symlink":
      return (
        await s(),
        await removeStrayLinkOrThrow(e, n, r, "cache", "archive"),
        logForDebugging(
          `Plugin ${n} version ${r}: removed a link wearing its archive's name at ${e}; it is never served \u2014 the archive is rebuilt or the cached directory used`,
        ),
        !1
      );
    default:
      throw getPluginCachePath(e, n, r);
  }
}
//@ chunk-e6aww6q8.js:4500507-4500596 placement
async function iws(e) {
  return (await isCachePathClean(e)) && (await VKn(e)) && (await hasRealEntries(e, { whenUnreadable: !1 }));
}
//@ chunk-e6aww6q8.js:4500596-4500858 placement
async function decideCachedVersionReuse(e, n, r, s, h) {
  let y = await classifyCacheEntry(e);
  if (y === "absent") return "absent";
  if (y === "unexaminable") throw getPluginCachePath(e, n, r);
  if (y === "symlink") return (await iws(e)) ? "serve" : "republish";
  return (s ? (await classifyLinkFarmReuse(e, h)).reusable : await hasRealEntries(e, { whenUnreadable: !1 }))
    ? "serve"
    : "republish";
}
//@ chunk-e6aww6q8.js:4500858-4501029 placement
async function isStagedTreeIntact(e) {
  try {
    if (!(await lstat_3(e)).isDirectory()) return !1;
    let r = dirname_5(e),
      [s, h] = await Promise.all([realpath_2(e), realpath_2(r)]);
    return s === join_9(h, basename_3(e)) && (await isPlainPluginParentDir(r));
  } catch {
    return !1;
  }
}
/**
 * 暂存树被替换时按阶段（install/publish/archive）抛错。
 */
//@ chunk-e6aww6q8.js:4501029-4501662 placement
async function assertStagedTreeIntact(e, n, r, s) {
  if (await isStagedTreeIntact(e)) return;
  if (s === "install")
    throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
      `Could not install dependencies for ${n} ${r}: its staged tree was replaced after the copy; retry the load or the install.`,
      "plugin cache staged tree swapped before dependency install",
    );
  if (s === "publish")
    throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
      `Could not publish ${n} ${r}: its staged tree was replaced before publishing; retry the load or the install.`,
      "plugin cache staged tree swapped before publishing",
    );
  throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
    `Could not archive ${n} ${r}: its staged tree was replaced before archiving; retry the load or the install.`,
    "plugin cache staged tree swapped before archiving",
  );
}
//@ chunk-e6aww6q8.js:4501662-4501821 placement
async function isCachePathClean(e) {
  try {
    let [n, r] = await Promise.all([realpath_2(anchoredPluginCachePath()), realpath_2(dirname_5(e))]);
    return (
      (await z8(join_9(r, basename_3(e)), createLinkTargetScreen(n), void 0, { trustedRoot: n })) === "clean"
    );
  } catch {
    return !1;
  }
}
/**
 * 版本目录是缓存下的普通目录时返回其真实路径。
 */
//@ chunk-e6aww6q8.js:4501821-4502215 placement
async function resolvePlainVersionDir(e) {
  let n = relative_5(anchoredPluginCachePath(), e),
    parts = n.split(sep_8);
  if (!n || isAbsolute_4(n) || parts.length !== 3 || parts.some((s) => s === "" || s === "." || s === ".."))
    return null;
  try {
    if (!(await isPlainPluginParentDir(dirname_5(e)))) return null;
    if (!(await lstat_3(e)).isDirectory() || !(await isSameFilesystem(dirname_5(e), basename_3(e))))
      return null;
    let [h, y, S] = await Promise.all([
      realpath_2(e),
      realpath_2(dirname_5(e)),
      realpath_2(anchoredPluginCachePath()),
    ]);
    if (h === S || yk(S, h)) return null;
    return h === join_9(y, basename_3(e)) ? h : null;
  } catch (error) {
    if (isPathAbsent(error)) return null;
    throw error;
  }
}
/**
 * 严格安装步骤前确认版本目录仍是普通目录。
 */
//@ chunk-e6aww6q8.js:4502215-4502802 placement
async function requirePlainVersionDir(e, n) {
  let r;
  try {
    r = await resolvePlainVersionDir(e);
  } catch (error) {
    throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
      `Could not prepare ${e} for its ${n} (it could not be examined: ${errorMessage(error)}); retry the install.`,
      "plugin cache version directory could not be examined before a strict install step",
    );
  }
  if (r === null && parseVersionCachePath(e, anchoredPluginCachePath()) !== null)
    throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
      `Could not prepare ${e} for its ${n}: it is no longer a plain version directory under its marketplace and plugin directories inside the plugin cache (it was removed or replaced after the copy); retry the install.`,
      "plugin cache version directory replaced before a strict install step",
    );
  return r;
}
//@ chunk-e6aww6q8.js:4502802-4503547 placement
async function unvouchBeforeDependencyStep(e, n, { staged: r = !1 } = {}) {
  if (!strictCacheAddressable(n)) return;
  if ((await requirePlainVersionDir(e, "dependency install")) === null) {
    logForDebugging(
      `Plugin cache: ${e} is not a version directory inside the plugin cache; its dependency step runs without a liveness record or vouch withdrawal`,
      { level: "warn" },
    );
    return;
  }
  if (!r && !(await writeInUseMarker(e, n)))
    throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
      `Could not prepare ${e} for its dependency install (this session could not be recorded as its user); retry the install.`,
      "plugin cache liveness record could not be written before dependency install",
    );
  if (await withdrawScreenMarker(e)) return;
  throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
    `Could not prepare ${e} for its dependency install (the conversion marker could not be withdrawn); retry the install.`,
    "plugin cache conversion marker could not be withdrawn before dependency install",
  );
}
//@ chunk-e6aww6q8.js:4503547-4504323 placement
async function unmarkBeforeArchiving(e, n, { staged: r = !1 } = {}) {
  if (!strictCacheAddressable(n) || r) return !0;
  let s = await resolvePlainVersionDir(e).catch(() => null);
  if (s === null)
    return (
      logForDebugging(
        `Plugin cache: ${e} is left as a directory this time (fully usable): it is not a version directory inside the plugin cache`,
        { level: "warn" },
      ),
      !1
    );
  if (await mie(e, n))
    return (
      logForDebugging(
        `Plugin cache: ${e} is left as a directory this time (fully usable): another session is using it`,
      ),
      !1
    );
  if ((await realpath_2(e).catch(() => null)) !== s)
    return (
      logForDebugging(
        `Plugin cache: ${e} is left as a directory this time: it moved while its users were probed`,
        { level: "warn" },
      ),
      !1
    );
  if (!(await removeInUseMarker(e, n)))
    return (
      logForDebugging(
        `Plugin cache: ${e} is left as a directory this time (fully usable): this session's liveness record in it could not be withdrawn \u2014 it is never archived with one inside`,
        { level: "warn" },
      ),
      !1
    );
  return !0;
}
//@ chunk-e6aww6q8.js:4504323-4504804 placement
async function removeFreshCopyUnlessInUse(e, n) {
  if (!strictCacheAddressable(n)) return;
  let r = await resolvePlainVersionDir(e).catch(() => null);
  if (r === null) return;
  let s = await realpath_2(anchoredPluginCachePath()).catch(() => null);
  if (s === null || r === s || !yk(r, s)) {
    logForDebugging(`Cache at ${e} left in place after the failed install: it lies outside the plugin cache`);
    return;
  }
  if ((await mie(e, n)) || (await realpath_2(e).catch(() => null)) !== r) {
    logForDebugging(
      `Cache at ${e} left in place after the failed install: another session is using it, liveness could not be determined, or it moved`,
    );
    return;
  }
  await removeDirectoryTreeNoFollow(r).catch(() => {});
}
//@ chunk-e6aww6q8.js:4504804-4505997 placement
async function rescreenCachedPluginTree(e, n) {
  if (!strictCacheAddressable(n)) return;
  let r = await requirePlainVersionDir(e, "post-install screen");
  if (r === null) {
    logForDebugging(
      `Plugin cache: post-install screen of ${e} not run: it is not a version directory inside the plugin cache`,
      { level: "warn" },
    );
    return;
  }
  if (!(await withdrawScreenMarker(e)))
    throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
      `Could not re-screen ${e} after its dependency install (the conversion marker could not be withdrawn); retry the install.`,
      "plugin cache conversion marker could not be withdrawn before the post-install screen",
    );
  if (await mie(e, n)) {
    logForDebugging(
      `Plugin cache: post-install screen of ${e} left to a later load: another session is using it (or liveness could not be determined)`,
    );
    return;
  }
  if ((await realpath_2(e).catch(() => null)) !== r) {
    logForDebugging(
      `Plugin cache: post-install screen of ${e} left to a later load: the directory moved while its liveness was probed`,
    );
    return;
  }
  let h = await materializePluginLinks(e, copyDir, { mode: "migrate" }).catch(
    (y) => (
      logForDebugging(`Plugin cache: post-install screen of ${e} failed: ${errorMessage(y)}`, {
        level: "warn",
      }),
      null
    ),
  );
  if ((h === null || !h.vouched) && !(await withdrawScreenMarker(e)))
    throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
      `Could not vouch for ${e} after its dependency install, and the conversion marker could not be withdrawn; retry the install.`,
      "plugin cache conversion marker could not be withdrawn after the post-install screen",
    );
}
//@ chunk-e6aww6q8.js:4505997-4506216 placement
async function materializeCachedLinks(e, n, r = !1) {
  if (!strictCacheAddressable(n)) return;
  if (r) {
    logForDebugging(`materializeLinks: ${e}: link-mode command source (used in place), not converted`);
    return;
  }
  await materializeVersionLinksOnce(e, anchoredPluginCachePath(), copyDir, n, () =>
    isPluginVersionInUse(e, { refusedCountsAsLive: !1 }, n).catch(() => !0),
  );
}
//@ chunk-e6aww6q8.js:4506216-4506326 placement
function getLegacyCachePath(e, n, r) {
  let replaced = r.replace(/[^a-zA-Z0-9\-_.]/g, "-");
  if (replaced === "." || replaced === "..") replaced = "-";
  return join_9(getPluginCacheDirIn(e, n), replaced);
}
//@ chunk-e6aww6q8.js:4506326-4506435 placement
function getPluginCacheDirIn(e, n) {
  let { name: r, marketplace: marketplace } = parsePluginIdentifier(n);
  return join_9(
    e,
    PLUGIN_CACHE_DIRNAME,
    sanitizePluginId(marketplace || "unknown"),
    marketplace === NPM ? escapeNpmPackageForDir(r) : sanitizePluginId(r || n),
  );
}
//@ chunk-e6aww6q8.js:4506435-4506455 placement
var weakSet_7 = new WeakSet();
/**
 * 版本化缓存目录 <plugins>/cache/<marketplace>/<plugin>/<version>。
 */
//@ chunk-e6aww6q8.js:4506455-4506493 placement = getVersionedCachePath (0)
function getVersionedCachePath(pluginId, version) {
  return getLegacyCachePath(getPluginsDirectory(), pluginId, version);
}
/**
 * 通过 storageV5 存储后端读取插件缓存内的文件，返回 {outcome:"found",content}/"absent"/"error"；路径不在插件缓存内返回 null。
 */
//@ chunk-e6aww6q8.js:4506493-4506868 placement
async function readFileViaStorageBackend(e, n) {
  let r = kkn(n, anchoredPluginCachePath());
  if (r === null) return null;
  let read = await e.read([r]);
  if (!read.ok) {
    let error = read.error;
    return {
      outcome: "error",
      detail: formatStorageError(error),
      telemetryCode:
        "telemetryCode" in error && typeof error.telemetryCode === "string" ? error.telemetryCode : void 0,
    };
  }
  let h = read.value.items[0];
  if (!h?.found) return { outcome: "absent" };
  return { outcome: "found", content: Buffer.from(h.value).toString("utf-8") };
}
//@ chunk-e6aww6q8.js:4506868-4507100 placement
async function isCachePathPresentInStorage(e, n) {
  let r = kkn(n, anchoredPluginCachePath());
  if (r === null) return null;
  let statMeta = await e.statMeta(r);
  if (statMeta.ok) return !0;
  let h =
    "telemetryCode" in statMeta.error && typeof statMeta.error.telemetryCode === "string"
      ? statMeta.error.telemetryCode
      : void 0;
  return FX(h) ? null : !1;
}
//@ chunk-e6aww6q8.js:4507100-4507190 placement
async function pie(e, n) {
  let r = isStorageV5Enabled() && e !== void 0 ? await isCachePathPresentInStorage(e, n) : null;
  return r !== null ? r : pathExists(n);
}
/**
 * 检查插件组件路径：present/absent/{unknown, errno}。
 */
//@ chunk-e6aww6q8.js:4507190-4507585 placement
async function probeComponentPath(e, n) {
  let r = isStorageV5Enabled() && e !== void 0 ? kkn(n, anchoredPluginCachePath()) : null;
  if (e !== void 0 && r !== null) {
    let statMeta = await e.statMeta(r);
    if (statMeta.ok) return "present";
    let h = storageErrorCode(statMeta.error);
    if (statMeta.error.code === "NotFound" || h === "ENOENT" || h === "ENOTDIR") return "absent";
    if (!FX(h))
      return { unknown: formatStorageError(statMeta.error), errno: sanitizeErrnoForTelemetry({ code: h }) };
  }
  try {
    return (await stat_2(n), "present");
  } catch (error) {
    return isENOENT(error) || getErrnoCode(error) === "ENOTDIR"
      ? "absent"
      : { unknown: errorMessage(error), errno: sanitizeErrnoForTelemetry(error) };
  }
}
//@ chunk-e6aww6q8.js:4507585-4507791 placement
function reportUncheckablePath(e, n, r, s, h, y) {
  (logForDebugging(`Plugin ${r}: could not check ${h} (${y.unknown}); not loading it`, { level: "error" }),
    e.push({
      type: "path-not-found",
      source: n,
      plugin: r,
      path: h,
      component: s,
      errno: y.errno ?? "UNKNOWN",
    }));
}
//@ chunk-e6aww6q8.js:4507791-4508003 placement = _temp2 (1)
async function statPluginPath(e, n) {
  let r = isStorageV5Enabled() && e !== void 0 ? await isCachePathPresentInStorage(e, n) : null;
  if (r !== null) return { exists: r, isDirectory: !1 };
  try {
    return { exists: !0, isDirectory: (await stat_2(n)).isDirectory() };
  } catch {
    return { exists: !1, isDirectory: !1 };
  }
}
/**
 * 缓存目录（或存储作用域）中是否有非忽略项。
 */
//@ chunk-e6aww6q8.js:4508003-4508498 placement
async function dirHasRealEntries(e, n, r = pz) {
  let s = orphanMarkerCoordsV5(e, n);
  if (n !== void 0 && s !== null) {
    let y = await listStorageScopeNames(n, {
      namespace: "pluginCache",
      marketplace: s.marketplace,
      plugin: s.plugin,
      version: s.version,
    });
    if (y.error !== void 0) {
      let error = y.error;
      if ("telemetryCode" in error && isFsInaccessibleCode(error.telemetryCode)) return !1;
      throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
        `Failed to list plugin cache dir: ${formatStorageError(error)}`,
        "failed to list plugin cache dir (v5 backend error)",
      );
    }
    return y.names.some(({ name: S }) => !r(S));
  }
  let h;
  try {
    h = await readdir_2(e);
  } catch (error) {
    if (isFsInaccessible(error)) return !1;
    throw error;
  }
  return h.some((y) => !r(y));
}
//@ chunk-e6aww6q8.js:4508498-4508528 placement
var LINKS_MATERIALIZED_MARKER = ".links_materialized";
/**
 * 判断版本化缓存目录是否完整可用；storageV5 下若有 .links_materialized 标记则按链接已物化方式检查。
 */
//@ chunk-e6aww6q8.js:4508528-4508701 placement
async function cacheDirHasPluginContentStrict(e, n) {
  if (!isStorageV5Enabled() || n === void 0 || parseVersionCachePath(e, anchoredPluginCachePath()) === null)
    return dirHasRealEntries(e);
  let r = await lstat_3(join_9(e, LINKS_MATERIALIZED_MARKER)).catch(() => null);
  return r !== null && r.isFile() ? dirHasRealEntries(e, n, yz) : dirHasRealEntries(e, void 0, yz);
}
//@ chunk-e6aww6q8.js:4508701-4508908 placement
async function removeCacheInUseMarker(e, n) {
  if (await KP(e)) return;
  let r = orphanMarkerCoordsV5(e, n);
  if (n !== void 0 && r !== null) {
    await n.delete(STORAGE_SPACES.pluginCache(r.marketplace, r.plugin, r.version, [R1]));
    return;
  }
  await rm_3(join_9(e, R1), { force: !0 }).catch(() => {});
}
/**
 * 在一个插件的多个安装记录中挑第一个 installPath 可信且缓存存在的；都不存在时返回第一个可信的或第一条。
 */
//@ chunk-e6aww6q8.js:4508908-4509239 placement
async function pickUsableInstallation(e, { storageV5: n, trustedRoots: r = [] } = {}) {
  let s = e && filterInstallationsForCurrentProject(e);
  if (!s || s.length === 0) return;
  if (s.length === 1) return s[0];
  let h;
  for (let y of s) {
    if (!y.installPath) continue;
    let { absolute: absolute, suspect: suspect } = classifyMarketplacePath(y.installPath, {
      trustedRoots: r,
    });
    if (suspect) continue;
    if (
      ((h ??= y),
      absolute.endsWith(".zip")
        ? await pathExists(absolute)
        : await cacheDirHasPluginContentStrict(absolute, n))
    )
      return y;
  }
  return h ?? s[0];
}
/**
 * 版本化缓存的 zip 路径（目录路径 + .zip）。
 */
//@ chunk-e6aww6q8.js:4509239-4509280 placement = getVersionedZipCachePath (1)
function getVersionedZipCachePath(pluginId, version) {
  return `${getVersionedCachePath(pluginId, version)}.zip`;
}
//@ chunk-e6aww6q8.js:4509280-4509388 placement
async function findSeedCachePath(e, n) {
  for (let r of getPluginSeedDirs()) {
    let s = getLegacyCachePath(r, e, n);
    try {
      if (await dirHasRealEntries(s)) return s;
    } catch {}
  }
  return null;
}
//@ chunk-e6aww6q8.js:4509388-4509485 placement = formatRelativeTimeAgo (0.75)
async function probeSeedForPlugin(e, n, r) {
  return (
    (await findSeedCachePath(e, n)) ??
    (r === "always" || n === "unknown" ? await probeSeedCacheAnyVersion(e) : null)
  );
}
//@ chunk-e6aww6q8.js:4509485-4509693 placement
async function probeSeedCacheAnyVersion(pluginId) {
  for (let seedDir of getPluginSeedDirs()) {
    let pluginDir = dirname_5(getLegacyCachePath(seedDir, pluginId, "_"));
    try {
      let s = [];
      for (let h of await readdir_2(pluginDir)) {
        if (l7(h)) continue;
        let versionDir = join_9(pluginDir, h);
        if (await dirHasRealEntries(versionDir)) s.push(versionDir);
      }
      if (s.length === 1) return s[0];
    } catch {}
  }
  return null;
}
//@ chunk-e6aww6q8.js:4509693-4509732 placement
function dpt(e) {
  return e instanceof Bd;
}
//@ chunk-e6aww6q8.js:4509732-4509805 placement
function ypt(e, n = redactUrlsInMessage) {
  return dpt(e) ? n(printableMessage(e, { isComposed: dpt })) : printableMessage(n(errorMessage(e)));
}
//@ chunk-e6aww6q8.js:4509805-4509824 placement
var npt = 20,
  fws = 500;
/**
 * manifest 解析/校验错误转插件错误（脱敏、截断）。
 */
//@ chunk-e6aww6q8.js:4509824-4510322 placement
function manifestErrorToPluginError(e, n, r) {
  if (!(e instanceof ManifestLoadError)) return;
  let s = redactUrlsInMessage(e.manifestPath),
    mapped = e.problems.slice(0, npt).map((y) => truncateWithEllipsis(redactUrlsInMessage(y), fws));
  if (e.problems.length > npt) mapped.push(`and ${e.problems.length - npt} more`);
  return e.errorClass === MANIFEST_ERROR_CLASSES.jsonInvalid
    ? {
        type: "manifest-parse-error",
        source: n,
        ...(r !== void 0 && { plugin: r }),
        manifestPath: s,
        parseError: mapped.join(", "),
      }
    : {
        type: "manifest-validation-error",
        source: n,
        ...(r !== void 0 && { plugin: r }),
        manifestPath: s,
        validationErrors: mapped,
        ...(e.errorClass === MANIFEST_ERROR_CLASSES.containment && { containmentRefused: !0 }),
      };
}
//@ chunk-e6aww6q8.js:4510322-4510589 placement
async function classifyLinkFarmReuse(e, n) {
  let r = await classifyLinkFarm(e);
  if (r === "not-live") return { live: !1, reusable: !1, unclassifiable: !1 };
  if (r === "unclassifiable") return { live: !0, reusable: !1, unclassifiable: !0 };
  let s = await Sii(n);
  return { live: !0, reusable: s !== void 0 && !(await hasEntriesOutsideTarget(e, s)), unclassifiable: !1 };
}
//@ chunk-e6aww6q8.js:4510589-4510671 placement
async function mie(e, n) {
  try {
    return await isPluginVersionInUse(e, { excludeSelf: !0 }, n);
  } catch {
    return !0;
  }
}
//@ chunk-e6aww6q8.js:4510671-4510744 placement
async function rKn(e, n, r, s) {
  await copyDir(e, n, e, n, r, s, new Set(), K8(), !1, !1, !0);
}
//@ chunk-e6aww6q8.js:4510744-4510950 placement = isRealPathWithinTeamDir (1)
async function lstatChildBigintOrUndefined(realCandidate) {
  for (let n of getPluginSeedDirs()) {
    let r = dirname_5(getLegacyCachePath(n, realCandidate, "_"));
    try {
      for (let s of await readdir_2(r)) {
        if (l7(s)) continue;
        if (await dirHasRealEntries(join_9(r, s))) return !0;
      }
    } catch (error) {
      if (isENOENT(error) || getErrnoCode(error) === "ENOTDIR") continue;
      return !0;
    }
  }
  return !1;
}
//@ chunk-e6aww6q8.js:4510950-4514602 placement
async function copyDir(e, n, r = e, s = n, h = r, y = !1, S = new Set(), w = K8(), L = !1, G = !1, q = !1) {
  if (y) await mkdir_4(n);
  else await getFsImplementation().mkdir(n);
  let Z = resolve_5(e),
    Se = resolve_5(n),
    ke = Se.startsWith(Z + sep_8) ? relative_5(Z, Se).split(sep_8)[0] : void 0,
    we = await readdir_2(e, { withFileTypes: !0 }),
    Ee,
    Ae,
    Ie,
    Me = !L && resolve_5(e) === resolve_5(r);
  for (let We of we) {
    if (ke !== void 0 && We.name === ke) continue;
    if (q && nSn(We.name)) continue;
    let ze = await classifyDirEntry(e, We);
    if ((G || y) && We.isDirectory() && ze.isSymbolicLink)
      throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
        `Refusing to copy ${join_9(e, We.name)}: it is no longer a directory as listed \u2014 a link or Windows junction stands there (planted, or swapped during the copy). Plugin trees must hold plain directories.`,
        "plugin copy source directory entry is a link at descent",
      );
    let lt = join_9(e, We.name),
      Je = join_9(n, We.name);
    if (y && Me && !MCt(We.name) && yz(We.name)) {
      logForDebugging(`copyDir: not copying shipped cache bookkeeping ${lt}`);
      continue;
    }
    if (ze.isDirectory) {
      if (L) I0(w, 1, 0);
      if ((G || y) && !(await lstat_3(lt)).isDirectory())
        throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
          `Refusing to copy ${lt}: it is no longer a directory (swapped during the copy).`,
          "plugin copy source directory swapped mid-copy",
        );
      if (y && getPlatform() === "windows") {
        if (((Ee ??= await realpath_2(e)), !(await isSameFilesystem(Ee, We.name))))
          throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
            `Refusing to copy ${lt}: it resolves somewhere other than its own name (a junction or mount point).`,
            "plugin copy source directory is a reparse point",
          );
      }
      await copyDir(lt, Je, r, s, h, y, S, w, L, G, !1);
    } else if (ze.isFile) {
      if (y) {
        let nt = await lstat_3(lt);
        if (!nt.isFile()) throw fileSwappedError(lt);
        if (L) I0(w, 1, nt.size);
      }
      if (G) await copyFileNoFollow(lt, Je, { exclusive: y, nonBlocking: y });
      else if (y) await copyFile_2(lt, Je, constants_3.COPYFILE_EXCL);
      else await copyFile_2(lt, Je);
    } else if (ze.isSymbolicLink) {
      let nt;
      try {
        nt = ze.linkTarget ?? (await readlink(lt));
      } catch (error) {
        if (getErrnoCode(error) !== "EINVAL")
          logForDebugging(`copyDir: readlink failed for ${lt}: ${errorMessage(error)}`, { level: "warn" });
        continue;
      }
      if (y) {
        ((Ae ??= await realpath_2(r).catch(() => resolve_5(r))), (Ie ??= createLinkTargetScreen(Ae)));
        let It;
        try {
          It = await z8(join_9(Ae, relative_5(resolve_5(r), resolve_5(lt))), Ie, nt, { trustedRoot: Ae });
        } catch (error) {
          ((It = "unexaminable"),
            logForDebugging(`copyDir: cannot examine symlink ${lt}: ${errorMessage(error)}`, {
              level: "warn",
            }));
        }
        if (It !== "clean") {
          logForDebugging(
            `copyDir: dropping symlink ${lt} -> ${nt} (${It === "network" ? "names a network host" : It === "loop" ? "symlink loop" : It === "unexaminable" ? "could not be examined" : It === "unsupported" ? "unsupported target spelling" : "dangling"})`,
            { level: It === "unexaminable" ? "warn" : "debug" },
          );
          continue;
        }
      } else if (resolvePathChain(lt, h)) {
        logForDebugging(`copyDir: dropping a symlink whose target chain cannot be trusted: ${lt}`, {
          level: "warn",
        });
        continue;
      }
      let pt;
      try {
        pt = await realpath_2(lt);
      } catch {
        if (!y && !isAbsolute_4(nt)) {
          let It = resolve_5(dirname_5(lt), nt);
          if (yk(It, resolve_5(r))) {
            await symlink(nt, Je);
            continue;
          }
        }
        logForDebugging(`copyDir: skipping broken symlink ${lt} -> ${nt}`);
        continue;
      }
      let Et;
      try {
        Et = await realpath_2(r);
      } catch {
        Et = r;
      }
      let yt;
      try {
        yt = await realpath_2(h);
      } catch {
        yt = h;
      }
      let gt = yk(pt, Et),
        At = bje(relative_5(r, lt));
      if (gt && (!y || At)) {
        let It = relative_5(Et, pt),
          Yt = join_9(s, It),
          qt = relative_5(dirname_5(Je), Yt);
        await symlink(qt, Je);
      } else if (gt || (yk(pt, yt) && !yk(Et, pt))) {
        if (y) {
          let qt = join_9(Et, relative_5(resolve_5(r), Z));
          if (yk(qt, pt)) {
            logForDebugging(`copyDir: skipping symlink to an ancestor directory ${lt} -> ${pt}`);
            continue;
          }
        }
        if (S.has(pt)) {
          logForDebugging(`copyDir: skipping cyclic symlink target ${lt} -> ${pt}`);
          continue;
        }
        let Yt = await (y || G ? lstat_3 : stat_2)(pt).catch((qt) => {
          logForDebugging(`copyDir: stat failed while materializing ${lt} -> ${pt}: ${errorMessage(qt)}`, {
            level: "warn",
          });
          return;
        });
        if (!Yt) continue;
        if (Yt.isSymbolicLink())
          throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
            `Refusing to copy ${lt}: its target is no longer what it resolved to (swapped during the copy).`,
            "plugin copy symlink target swapped mid-copy",
          );
        if (Yt.isFile()) {
          if (y) I0(w, 1, Yt.size);
          if (y || G) await copyFileNoFollow(pt, Je, { exactMode: !0, exclusive: !0, nonBlocking: y });
          else await copyFile_2(pt, Je);
        } else if (Yt.isDirectory()) {
          if (y) I0(w, 1, 0);
          S.add(pt);
          try {
            await copyDir(pt, Je, pt, Je, h, y, S, w, y, G);
          } finally {
            S.delete(pt);
          }
        } else logForDebugging(`copyDir: skipping non-regular symlink target ${lt} -> ${pt}`);
      } else logForDebugging(`copyDir: skipping symlink escaping containment root: ${lt} -> ${pt}`);
    }
  }
}
//@ chunk-e6aww6q8.js:4514602-4514831 placement
function assertSymlinkFree(e, n) {
  if (e.failed > 0 || e.readOnly)
    throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
      `Plugin tree at ${n} could not be made symlink-free (${e.readOnly ? "not writable" : `${e.failed} failed`}); refusing to cache it`,
      "plugin tree could not be made symlink-free",
    );
}
/**
 * 存储中暂存副本是否为空（分页列举）。
 */
//@ chunk-e6aww6q8.js:4514831-4515261 placement
async function isStorageScopeEmpty(e, n) {
  let r;
  do {
    let listEntries = await e.listEntries(n, {
      skipKeyStats: !0,
      skipScopeStats: !0,
      ...(r === void 0 ? {} : { cursor: r }),
    });
    if (!listEntries.ok)
      throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
        `Failed to list the staged plugin copy (${formatStorageError(listEntries.error)}); retry the load or the install.`,
        "plugin cache staged copy could not be listed",
      );
    let skipped = listEntries.value.skipped;
    if (
      listEntries.value.items.length > 0 ||
      (skipped !== void 0 && Object.values(skipped).some((y) => y > 0))
    )
      return !1;
    r = listEntries.value.cursor;
  } while (r !== void 0);
  return !0;
}
/**
 * 把插件复制进版本化缓存 <plugins>/cache/<marketplace>/<plugin>/<version>（zip 缓存开启时再打成 .zip）。已有完整缓存直接复用；其他会话正在用时推迟覆盖；种子缓存命中直接用；link 模式建立链接农场；复制后装依赖、拉 binaries，再原子发布。返回最终路径。
 */
//@ chunk-e6aww6q8.js:4515261-4521669 placement = copyPluginToVersionedCache (0.356)
async function copyPluginToVersionedCache(
  sourcePath,
  pluginId,
  version,
  marketplaceEntry,
  marketplaceDir,
  options,
) {
  let zipCacheMode = isPluginZipCacheEnabled(),
    linkFarm = options?.linkFarm ?? Nee(marketplaceEntry?.source),
    forceOverwrite = options?.forceOverwrite ?? !1,
    storageV5 = options?.storageV5,
    useStorageBackend = strictCacheAddressable(storageV5),
    cachePath = getVersionedCachePath(pluginId, version),
    zipPath = getVersionedZipCachePath(pluginId, version),
    ke = (yt, gt, At) => requireVersionParentContained(cachePath, pluginId, version, yt, gt, At),
    we = useStorageBackend ? await versionParentState(cachePath) : "real";
  if (we === "refused") await ke("cache", "before reuse", we);
  let Ee,
    Ae = () =>
      (Ee ??=
        we === "absent"
          ? Promise.resolve("absent")
          : decideCachedVersionReuse(cachePath, pluginId, version, linkFarm, sourcePath));
  if (zipCacheMode) {
    if (
      we !== "absent" &&
      (useStorageBackend
        ? await strictArchivePresent(zipPath, pluginId, version, () => ke("cache", "before reuse"))
        : await pathExists(zipPath))
    ) {
      if (!forceOverwrite) {
        if (
          (logForDebugging(`Plugin ${pluginId} version ${version} already cached at ${zipPath}`),
          useStorageBackend && (await versionParentContained(cachePath).catch(() => !1)))
        )
          await Promise.all([sweepStaleTempSiblings(cachePath), sweepStaleTempSiblings(zipPath)]);
        return zipPath;
      }
      if (useStorageBackend) await ke("cache", "before overwrite");
      await rm_3(zipPath, { force: !0 });
    } else if (useStorageBackend && !forceOverwrite) {
      if ((await Ae()) === "serve")
        return (
          await materializeCachedLinks(cachePath, storageV5, linkFarm),
          await removeCacheInUseMarker(cachePath, storageV5),
          logForDebugging(
            `Plugin ${pluginId} version ${version} already cached at ${cachePath} (a directory; its archive not made yet)`,
          ),
          cachePath
        );
    }
  } else if (useStorageBackend ? (await Ae()) !== "absent" : await pathExists(cachePath)) {
    if (!useStorageBackend || (await Ae()) === "serve")
      await materializeCachedLinks(cachePath, storageV5, linkFarm);
    let yt = !1,
      gt;
    if (useStorageBackend) gt = (await Ae()) === "serve";
    else {
      let At = await classifyLinkFarmReuse(cachePath, sourcePath);
      ((yt = At.live),
        (gt = Nee(marketplaceEntry?.source)
          ? At.reusable
          : At.unclassifiable || (!yt && (await dirHasRealEntries(cachePath)))));
    }
    if (!forceOverwrite && gt)
      return (
        await removeCacheInUseMarker(cachePath, storageV5),
        logForDebugging(`Plugin ${pluginId} version ${version} already cached at ${cachePath}`),
        cachePath
      );
    if ((gt || yt) && (await mie(cachePath, storageV5)))
      return (
        logForDebugging(
          `Cache for ${pluginId} at ${cachePath} is in use by another session; deferring overwrite until it exits`,
        ),
        cachePath
      );
    if (!useStorageBackend || gt) {
      if (useStorageBackend) await ke("cache", "before overwrite");
      if (!useStorageBackend || (await clearOccupantForReplace(cachePath, pluginId, version)) === "recurse")
        (logForDebugging(
          `Removing ${gt || yt ? "superseded" : "incomplete"} cache directory for ${pluginId} at ${cachePath}`,
        ),
          await evictCachedVersionDir(cachePath, storageV5));
    }
  }
  let Ie = await findSeedCachePath(pluginId, version);
  if (Ie) return (logForDebugging(`Using seed cache for ${pluginId}@${version} at ${Ie}`), Ie);
  if ((await ensurePluginCacheFolder(cachePath, storageV5), Nee(marketplaceEntry?.source))) {
    let yt = !0;
    if (useStorageBackend) {
      await ke("link", "before relink");
      let entries = await classifyCacheEntry(cachePath);
      if (entries === "unexaminable") throw getPluginCachePath(cachePath, pluginId, version, "link");
      yt = entries !== "symlink";
    }
    let gt = yt ? await classifyLinkFarmReuse(cachePath, sourcePath) : { live: !1, reusable: !1 };
    if (gt.reusable)
      return (
        logForDebugging(`Plugin ${pluginId} version ${version} already linked at ${cachePath}`),
        cachePath
      );
    if (!useStorageBackend && gt.live && (await mie(cachePath, storageV5)))
      return (
        logForDebugging(
          `Link farm for ${pluginId} at ${cachePath} is in use by another session; deferring the relink until it exits`,
        ),
        cachePath
      );
    if (useStorageBackend) {
      let At = await lstat_3(cachePath).catch((It) => {
        if (isPathAbsent(It)) return null;
        throw getPluginCachePath(cachePath, pluginId, version, "link");
      });
      if (
        At !== null &&
        (At.isDirectory() || At.isSymbolicLink()) &&
        (await isPluginVersionInUse(cachePath, { excludeSelf: !0 }, storageV5).catch(() => !0))
      )
        throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
          `Could not link ${pluginId} ${version}: another session is recorded as using the entry at its cache path; retry the load or the install.`,
          "plugin cache relink target has live users",
        );
    }
    if (useStorageBackend) await ke("link", "during relink");
    if (
      !useStorageBackend ||
      (await clearOccupantForReplace(cachePath, pluginId, version, "link")) === "recurse"
    )
      await evictCachedVersionDir(cachePath, storageV5);
    if (useStorageBackend) await ke("link", "during relink");
    return (
      await checkRelinkTarget(sourcePath, cachePath),
      logForDebugging(`Linked plugin ${pluginId} into versioned cache at ${cachePath}`),
      cachePath
    );
  }
  if (useStorageBackend)
    (await ke("cache", "before staging"),
      await Promise.all([sweepStaleTempSiblings(cachePath), sweepStaleTempSiblings(zipPath)]));
  let Me = useStorageBackend ? makeTempSiblingName(cachePath) : cachePath,
    We = async (yt) => {
      (await ke("publish", yt), await assertStagedTreeIntact(Me, pluginId, version, "publish"));
    },
    ze = useStorageBackend && zipCacheMode,
    lt = !1,
    Je = !1,
    nt = !1;
  try {
    if (marketplaceEntry && typeof marketplaceEntry.source === "string" && marketplaceDir) {
      let sourceDir = validatePathWithinBase(marketplaceDir, marketplaceEntry.source);
      logForDebugging(`Copying source directory ${marketplaceEntry.source} for plugin ${pluginId}`);
      try {
        await rKn(sourceDir, Me, marketplaceDir, useStorageBackend);
      } catch (error) {
        if (isENOENT(error) && getErrnoPath_2(error) === sourceDir)
          throw Error(
            `Plugin source directory not found: ${sourceDir} (from entry.source: ${marketplaceEntry.source})`,
          );
        throw error;
      }
    } else
      (logForDebugging(`Copying plugin ${pluginId} to versioned cache (fallback to full copy)`),
        await rKn(sourcePath, Me, sourcePath, useStorageBackend));
    let gitPath = join_9(Me, ".git");
    await removeDirectoryTreeNoFollow(gitPath);
    let gt = useStorageBackend && storageV5 !== void 0 ? c5t(Me, anchoredPluginCachePath()) : null;
    if (
      gt !== null &&
      storageV5 !== void 0 &&
      !(await hasLinkedAncestorBelow(cachePath, anchoredPluginCachePath()))
        ? await isStorageScopeEmpty(storageV5, gt)
        : (await readdir_2(Me)).length === 0
    )
      throw Error(`Failed to copy plugin ${pluginId} to versioned cache: destination is empty after copy`);
    if (useStorageBackend) assertSymlinkFree(await materializePluginLinks(Me, copyDir), Me);
    if (ze) nt = !0;
    else if (useStorageBackend) {
      await We("during publish");
      try {
        (await moveIntoVersionPath(Me, cachePath), (lt = !0));
      } catch (error) {
        let Yt = async () => {
            let cacheEntries = await classifyCacheEntry(cachePath);
            return (
              cacheEntries === "other" || (cacheEntries === "symlink" && (await isCachePathClean(cachePath)))
            );
          },
          qt = async () =>
            (await versionParentContained(cachePath)) &&
            (await Yt()) &&
            (await hasRealEntries(cachePath, { whenUnreadable: !1 }).catch(() => !1)),
          Zt = async (hn) => {
            if (await qt())
              return (
                logForDebugging(
                  `Plugin ${pluginId} version ${version} was cached concurrently at ${cachePath}; using it (${errorMessage(hn)})`,
                ),
                !0
              );
            throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
              `Could not publish ${pluginId} ${version} into the plugin cache (${errorMessage(hn)}); retry the load or the install.`,
              "plugin cache staged publish could not complete",
            );
          },
          rn = async () => {
            await We("during publish");
            try {
              (await moveIntoVersionPath(Me, cachePath), (lt = !0));
            } catch (error) {
              Je = await Zt(error);
            }
          },
          pn = await classifyCacheEntry(cachePath);
        if (pn === "unexaminable") throw getPluginCachePath(cachePath, pluginId, version);
        let no = pn === "symlink" && !(await isCachePathClean(cachePath));
        if (pn === "absent") await rn();
        else if (pn === "symlink" ? no || !(await VKn(cachePath)) : !(await hasRealEntries(cachePath))) {
          await ke("publish", "during publish");
          let hn =
            pn === "other" &&
            (await lstat_3(cachePath).then(
              (yn) => yn.isDirectory(),
              () => !1,
            ));
          if (
            (hn || pn === "symlink") &&
            (await isPluginVersionInUse(cachePath, { excludeSelf: !0 }, storageV5).catch(() => !0))
          )
            throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
              `Could not publish ${pluginId} ${version}: another session is recorded as using the entry at its cache path; retry the load or the install.`,
              "plugin cache payload-free debris has live users",
            );
          if (hn) await removeInUseMarker(cachePath, storageV5);
          if (
            (logForDebugging(
              `Plugin ${pluginId} version ${version}: clearing ${pn === "symlink" ? "a stray symlink" : hn ? "payload-free debris" : "a stray non-directory entry"} at ${cachePath} (${errorMessage(error)})`,
            ),
            pn === "symlink"
              ? await removePathEntry(cachePath).then(
                  (yn) => yn !== "directory",
                  () => !1,
                )
              : (await removeVersionDirIfIdle(cachePath)) === "removed")
          )
            await rn();
          else if (no)
            throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
              `Could not publish ${pluginId} ${version}: a link sits at its cache path and could not be removed; remove that link from the plugin cache, then retry the install.`,
              "plugin cache stray link not removable",
            );
          else Je = await Zt(error);
        } else Je = await Zt(error);
      }
    }
  } finally {
    if (useStorageBackend && !lt && !nt) await Cje(Me);
  }
  if (Je)
    return (
      await materializeCachedLinks(cachePath, storageV5, linkFarm),
      await removeCacheInUseMarker(cachePath, storageV5),
      await writeInUseMarker(cachePath, storageV5),
      cachePath
    );
  let pt = nt ? Me : cachePath,
    Et = async () => {
      try {
        await We("after a failed archive");
        try {
          await moveIntoVersionPath(Me, cachePath);
        } catch (error) {
          if (
            (await classifyCacheEntry(cachePath)) !== "other" ||
            (await hasRealEntries(cachePath)) ||
            (await isPluginVersionInUse(cachePath, { excludeSelf: !0 }, storageV5).catch(() => !0))
          )
            throw error;
          if (
            (await removeInUseMarker(cachePath, storageV5),
            (await removeVersionDirIfIdle(cachePath)) !== "removed")
          )
            throw error;
          (await We("after a failed archive"), await moveIntoVersionPath(Me, cachePath));
        }
        logForDebugging(
          `Plugin ${pluginId} version ${version}: its archive could not be written; the completed directory is kept at ${cachePath} instead`,
          { level: "warn" },
        );
      } catch (error) {
        logForDebugging(
          `Plugin ${pluginId} version ${version}: its archive could not be written and the staged directory could not be kept either (${errorMessage(error)})`,
          { level: "warn" },
        );
      }
    };
  try {
    try {
      if (nt) await assertStagedTreeIntact(pt, pluginId, version, "install");
      await unvouchBeforeDependencyStep(pt, storageV5, { staged: nt });
      let yt = await installPluginDependencies(pt);
      if (yt.error)
        logForDebugging(`Plugin dependency install warning for ${pluginId}: ${yt.error}`, { level: "warn" });
      (await provisionBinaryAssets(pt, pluginId, { storageV5: storageV5, credentials: options?.credentials }),
        await rescreenCachedPluginTree(pt, storageV5));
    } catch (error) {
      if (!nt) await removeFreshCopyUnlessInUse(cachePath, storageV5);
      throw error;
    }
    if (nt) await assertStagedTreeIntact(pt, pluginId, version, "archive");
    if (zipCacheMode && (await unmarkBeforeArchiving(pt, storageV5, { staged: nt }))) {
      try {
        await publishDirectoryAsZip(pt, zipPath);
      } catch (error) {
        if (nt && (await classifyCacheEntry(zipPath)) === "absent") await Et();
        throw error;
      }
      if (
        nt &&
        (await versionParentContained(cachePath).catch(() => !1)) &&
        (await classifyCacheEntry(cachePath)) === "other" &&
        !(await hasRealEntries(cachePath))
      )
        await removeStaleLeftover(cachePath);
      return (logForDebugging(`Successfully cached plugin ${pluginId} as ZIP at ${zipPath}`), zipPath);
    }
  } finally {
    if (nt) await Cje(Me);
  }
  return (logForDebugging(`Successfully cached plugin ${pluginId} at ${cachePath}`), cachePath);
}
/**
 * 删除版本化缓存目录：存储后端模式下先让存储层清理作用域，剩余部分再直接删除。
 */
//@ chunk-e6aww6q8.js:4521669-4522454 placement
async function evictCachedVersionDir(e, n) {
  let r = orphanMarkerCoordsV5(e, n);
  if (n !== void 0 && r !== null && !(await hasLinkedAncestorBelow(e, anchoredPluginCachePath()))) {
    let deleteScope = await n.deleteScope({ namespace: "pluginCache", ...r });
    if (deleteScope.ok && !(await pathExists(e))) return;
    if (
      !deleteScope.ok &&
      (deleteScope.error.code === "InvalidArgument" ||
        (deleteScope.error.code === "Failed" &&
          "telemetryCode" in deleteScope.error &&
          deleteScope.error.telemetryCode === "ELOOP"))
    )
      throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
        `Could not empty ${e}: the storage layer refused the version folder (${formatStorageError(deleteScope.error)}); check that plugin cache folder \u2014 nothing was removed \u2014 and then retry the install or the update.`,
        "plugin cache version folder refused by the storage layer during removal",
      );
    logForDebugging(
      deleteScope.ok
        ? `Storage sweep of ${e} left entries it does not own; removing the directory directly`
        : `Storage sweep of ${e} failed (${formatStorageError(deleteScope.error)}); removing the directory directly`,
      { level: "warn" },
    );
  }
  await removeDirectoryTreeNoFollow(e);
}
//@ chunk-e6aww6q8.js:4522454-4523178 placement
async function ensurePluginCacheFolder(e, n) {
  let r =
    isStorageV5Enabled() && n !== void 0
      ? pluginCacheStorageScope(dirname_5(e), anchoredPluginCachePath())
      : null;
  if (
    isStorageV5Enabled() &&
    n !== void 0 &&
    r !== null &&
    r.plugin !== void 0 &&
    !(await hasLinkedAncestorBelow(e, anchoredPluginCachePath()))
  ) {
    let ensureScope = await n.ensureScope(r);
    if (ensureScope.ok) return;
    if (
      ensureScope.error.code === "Failed" &&
      "telemetryCode" in ensureScope.error &&
      ensureScope.error.telemetryCode === "ELOOP"
    )
      throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
        `Could not prepare the plugin cache folder of ${e}: the storage layer refused it (${formatStorageError(ensureScope.error)}); check that plugin cache folder \u2014 the plugin version was not cached \u2014 and then retry the install or the update.`,
        "plugin cache plugin folder refused by the storage layer during creation",
      );
    logForDebugging(
      `The storage layer could not create the plugin cache folder of ${e} (${formatStorageError(ensureScope.error)}); creating it directly`,
      { level: "warn" },
    );
  }
  await getFsImplementation().mkdir(dirname_5(e));
}
/**
 * 不运行 install 脚本地下载 npm 包到目标目录（可指定 registry、期望 integrity）。
 */
//@ chunk-e6aww6q8.js:4523178-4523506 placement
async function fetchNpmPackageNoScripts(e, n, r) {
  return (
    logForDebugging(`Fetching npm package ${e}@${r.version ?? "latest"} (no install scripts)`),
    fetchNpmPackage(
      { packageName: e, versionSpec: r.version, targetPath: n },
      {
        registry: r.registry,
        workDir: r.scratchDir,
        isNpmMarketplaceLane: r.isNpmMarketplaceLane ?? !1,
        ...(r.expectedIntegrity !== void 0 && { expectedIntegrity: r.expectedIntegrity }),
      },
    )
  );
}
//@ chunk-e6aww6q8.js:4524665-4524705 affinity
var CLONE_STEP_FAILED = Symbol("pluginCloneStepFailed");
/**
 * git 克隆插件仓库：校验 sha/ref、--depth 1（有 sha 时 fetch 该提交）、可禁用子模块、校验钉住的提交。
 */
//@ chunk-e6aww6q8.js:4524705-4526454 fingerprint = gitClone (0.736)
async function gitClone_2(e, n, r, s, { isDirectoryPlugin: h, noSubmodules: y = !1 } = {}) {
  if ((assertFullCommitSha(s), r?.startsWith("-"))) throw Error(`Invalid ref "${r}": cannot start with "-"`);
  let S = SMe(n, await resolveGitSshConfig(e)),
    { pinArgs: pinArgs, env: env } = S,
    G = y ? ["-c", "submodule.recurse=false"] : [],
    q = [...S.inCheckoutArgs, ...G],
    Z = [
      ...SSH_BATCH_CONFIG_ARGS,
      ...pinArgs,
      ...G,
      "clone",
      "--depth",
      "1",
      ...(y ? ["--no-recurse-submodules"] : ["--recurse-submodules", "--shallow-submodules"]),
    ];
  if (r && !s) Z.push("--branch", r);
  if (s) Z.push("--no-checkout");
  Z.push("--", e, n);
  let cloneStarted = performance.now(),
    shallowFetchResult = await execFileNoThrow(gitExe(), Z, {
      ...(await prepareGitWorkDir(n, gitEnvWithCMessages(env))),
      stdin: "ignore",
    });
  if (shallowFetchResult.code !== 0)
    throw (
      logPluginFetch(
        "plugin_clone",
        e,
        "failure",
        performance.now() - cloneStarted,
        classifyFetchError(shallowFetchResult.stderr),
        h,
      ),
      withTelemetryMessage(
        Object.assign(
          classifyGitError(
            shallowFetchResult.stderr,
            `Failed to clone repository: ${redactKnownUrls(shallowFetchResult.stderr, e)}`,
          ),
          { [CLONE_STEP_FAILED]: !0 },
        ),
        "plugin git clone failed (stderr redacted)",
      )
    );
  let we;
  if (s) {
    if (
      (
        await execFileNoThrowWithCwd(
          gitExe(),
          [...q, "fetch", SAFE_UPLOAD_PACK_ARG, "--depth", "1", "origin", s],
          { cwd: n, env: env, stdin: "ignore" },
        )
      ).code !== 0
    ) {
      logForDebugging(`Shallow fetch of SHA ${s} failed, falling back to unshallow fetch`);
      let unshallowResult = await execFileNoThrowWithCwd(
        gitExe(),
        [...q, "fetch", SAFE_UPLOAD_PACK_ARG, "--unshallow", ...(r ? ["origin", r] : [])],
        { cwd: n, env: env, stdin: "ignore" },
      );
      if (unshallowResult.code !== 0)
        throw (
          logPluginFetch(
            "plugin_clone",
            e,
            "failure",
            performance.now() - cloneStarted,
            classifyFetchError(unshallowResult.stderr),
            h,
          ),
          withTelemetryMessage(
            Error(`Failed to fetch commit ${s}: ${redactKnownUrls(unshallowResult.stderr, e)}`),
            "plugin git fetch (unshallow) failed (stderr redacted)",
          )
        );
    }
    let checkoutResult = await runGitInOwnWorkTree(n, [...q, "checkout", s], pickGitNoPromptEnv(env));
    if (checkoutResult.code !== 0)
      throw (
        logPluginFetch(
          "plugin_clone",
          e,
          "failure",
          performance.now() - cloneStarted,
          classifyFetchError(checkoutResult.stderr),
          h,
        ),
        withTelemetryMessage(
          Error(`Failed to checkout commit ${s}: ${redactKnownUrls(checkoutResult.stderr, e)}`),
          "plugin git checkout failed (stderr redacted)",
        )
      );
    try {
      we = await verifyPinnedSha(n, "HEAD", s, { inCheckoutArgs: q, env: env });
    } catch (error) {
      throw (
        logPluginFetch("plugin_clone", e, "failure", performance.now() - cloneStarted, "sha_pin_mismatch", h),
        error
      );
    }
  }
  return (logPluginFetch("plugin_clone", e, "success", performance.now() - cloneStarted, void 0, h), we);
}
//@ chunk-e6aww6q8.js:4526454-4526599 fingerprint = installFromGit (1)
async function installFromGit(e, n, r, s, h) {
  let safeUrl = parsePluginGitUrl(e),
    S = await gitClone_2(safeUrl, n, r, s, h),
    refMessage = r ? ` (ref: ${r})` : "";
  return (logForDebugging(`Cloned repository from ${redactUrlQuery(safeUrl)}${refMessage} to ${n}`), S);
}
/**
 * github 来源安装：校验 owner/repo，按 SSH 配置情况先 SSH 后 HTTPS（或直接 HTTPS）克隆，失败时回退另一种传输。
 */
//@ chunk-e6aww6q8.js:4526599-4527713 fingerprint = installFromGitHub (0.49)
async function installFromGitHub(e, n, r, s, h, y) {
  if (!/^[a-zA-Z0-9-_.]+\/[a-zA-Z0-9-_.]+$/.test(e))
    throw Error(`Invalid GitHub repository format: ${e}. Expected format: owner/repo`);
  let S = `git@${GITHUB_HOST}:${e}.git`,
    w = `https://github.com/${e}.git`;
  if (NMt()) return installFromGit(w, n, r, s, { noSubmodules: h });
  if (y === void 0) return installFromGit(S, n, r, s, { noSubmodules: h });
  if (!(await readGitSshCommand(y, S, n, !1)))
    try {
      return await installFromGit(S, n, r, s, { noSubmodules: h });
    } catch (error) {
      if (
        !isCloneStepFailure(error) ||
        !isSshAuthFailureOutput(errorMessage(error)) ||
        !(await readGitSshCommand(y, S, n, !0))
      )
        throw error;
      await removeDirectoryTreeNoFollow(n).catch(() => {
        throw error;
      });
    }
  y.notify(zpe(w));
  try {
    return await installFromGit(w, n, r, s, { noSubmodules: h });
  } catch (error) {
    if (!isCloneStepFailure(error)) throw error;
    try {
      await removeDirectoryTreeNoFollow(n);
    } catch (error_2) {
      throw (
        logForDebugging(`Could not clear ${n} for the SSH retry: ${errorMessage(error_2)}`, {
          level: "warn",
        }),
        error
      );
    }
    y.notify(yFt(S));
    try {
      return await installFromGit(S, n, r, s, { noSubmodules: h });
    } catch (error_2) {
      if (!isCloneStepFailure(error_2)) throw error_2;
      throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
        `${errorMessage(error)}
The retry over SSH failed too: ${errorMessage(error_2)}
Check the repository and ref in the marketplace entry and that github.com can be reached. If the repository is private, add an SSH key to your GitHub account or set up a git credential helper for https://github.com. Then install again.`,
        "plugin github clone failed over HTTPS and SSH",
      );
    }
  }
}
//@ chunk-e6aww6q8.js:4527713-4527765 layout
function isCloneStepFailure(e) {
  return e instanceof Error && CLONE_STEP_FAILED in e;
}
//@ chunk-e6aww6q8.js:4527765-4527907 layout
function githubShorthandToCloneUrl(e) {
  if (/^[a-zA-Z0-9-_.]+\/[a-zA-Z0-9-_.]+$/.test(e))
    return NMt() ? `https://github.com/${e}.git` : `git@${GITHUB_HOST}:${e}.git`;
  return parsePluginGitUrl(e);
}
/**
 * git 不可用（xcrun 报错或找不到 git）时抛的错误类。
 */
//@ chunk-e6aww6q8.js:4527907-4527932 placement
class GitNotAvailableError extends Error {}
/**
 * git 网络错误（无法访问、RPC 失败、SSH 解析失败）时抛的错误类。
 */
//@ chunk-e6aww6q8.js:4527932-4527957 placement
class GitHostFetchFailedError extends Error {}
//@ chunk-e6aww6q8.js:4527957-4528180 layout
var GIT_NETWORK_ERROR_RE =
  /^(?:fatal: unable to access '[^']*': |error: RPC failed; (?:curl (?:6|7|18|28|35|52|55|56|60|92)\b|HTTP [45]\d\d)|ssh: Could not resolve hostname |ssh: connect to host \S+ port \d+: |fatal: unable to connect to )/;
//@ chunk-e6aww6q8.js:4528180-4528411 layout
function classifyGitError(e, n) {
  let parts = e.split(`
`);
  if (parts.some((s) => s.startsWith("fatal: remote error:"))) return Error(n);
  if (parts.some((s) => s.startsWith("xcrun: error:") || s === GIT_MISSING_MAC_MESSAGE))
    return new GitNotAvailableError(n);
  return parts.some((s) => GIT_NETWORK_ERROR_RE.test(s)) ? new GitHostFetchFailedError(n) : Error(n);
}
//@ chunk-e6aww6q8.js:4528411-4528527 layout
function gitEnvWithCMessages(e) {
  let { LC_ALL: LC_ALL, ...r } = e;
  return {
    ...r,
    LC_ALL: void 0,
    ...(LC_ALL !== void 0 && LC_ALL !== "" && { LC_CTYPE: LC_ALL }),
    LC_MESSAGES: "C",
  };
}
/**
 * git-subdir 来源安装：部分克隆（--filter=tree:0）+ sparse-checkout 只取子目录，校验 sha，复制子目录到目标。需要 git ≥2.25。
 */
//@ chunk-e6aww6q8.js:4528527-4531133 fingerprint = installFromGitSubdir (0.721)
async function installFromGitSubdir(e, n, r, s, h, y = n, { noSubmodules: S = !1 } = {}) {
  if (!(await isGitUsable()))
    throw new GitNotAvailableError(
      "git-subdir plugin source requires git to be installed and on PATH. Install git (version 2.25 or later for sparse-checkout cone mode) and try again.",
    );
  if ((assertFullCommitSha(h), s?.startsWith("-"))) throw Error(`Invalid ref "${s}": cannot start with "-"`);
  let gitUrl = githubShorthandToCloneUrl(e),
    cloneDir = `${y}${Q5o}`,
    G = SMe(cloneDir, await resolveGitSshConfig(gitUrl)),
    { pinArgs: pinArgs, env: env } = G,
    Se = S ? ["-c", "submodule.recurse=false"] : [],
    ke = [...G.inCheckoutArgs, ...Se],
    we = [
      ...SSH_BATCH_CONFIG_ARGS,
      ...pinArgs,
      ...Se,
      "clone",
      "--depth",
      "1",
      ...(isNetworkGitUrl(gitUrl) ? ["--filter=tree:0"] : []),
      "--no-checkout",
    ];
  if (s && !h) we.push("--branch", s);
  we.push("--", gitUrl, cloneDir);
  let Ee = await execFileNoThrow(gitExe(), we, {
    ...(await prepareGitWorkDir(cloneDir, gitEnvWithCMessages(env))),
    stdin: "ignore",
  });
  if (Ee.code !== 0)
    throw withTelemetryMessage(
      classifyGitError(
        Ee.stderr,
        `Failed to clone repository for git-subdir source: ${redactKnownUrls(Ee.stderr, gitUrl)}`,
      ),
      "plugin git-subdir clone failed (stderr redacted)",
    );
  try {
    let Ae = pickGitNoPromptEnv(env),
      Ie = [...ke, "read-tree", "-u", "--reset"],
      sparseResult = await runGitInOwnWorkTree(
        cloneDir,
        [...ke, "sparse-checkout", "set", "--cone", "--", r],
        Ae,
      );
    if (sparseResult.code !== 0)
      throw withTelemetryMessage(
        Error(
          `git sparse-checkout set failed (git >= 2.25 required for cone mode): ${redactKnownUrls(sparseResult.stderr, gitUrl)}`,
        ),
        "plugin git sparse-checkout set failed (stderr redacted)",
      );
    let resolvedSha;
    if (h) {
      if (
        (
          await execFileNoThrowWithCwd(
            gitExe(),
            [...ke, "fetch", SAFE_UPLOAD_PACK_ARG, "--depth", "1", "origin", h],
            { cwd: cloneDir, env: env, stdin: "ignore" },
          )
        ).code !== 0
      ) {
        logForDebugging(`Shallow fetch of SHA ${h} failed for git-subdir, falling back to unshallow fetch`);
        let fetchSha = await execFileNoThrowWithCwd(
          gitExe(),
          [...ke, "fetch", SAFE_UPLOAD_PACK_ARG, "--unshallow", ...(s ? ["origin", s] : [])],
          { cwd: cloneDir, env: env, stdin: "ignore" },
        );
        if (fetchSha.code !== 0)
          throw withTelemetryMessage(
            Error(`Failed to fetch commit ${h}: ${redactKnownUrls(fetchSha.stderr, gitUrl)}`),
            "plugin git-subdir fetch (unshallow) failed (stderr redacted)",
          );
      }
      let unshallow = await runGitInOwnWorkTree(cloneDir, [...Ie, h], Ae);
      if (unshallow.code !== 0)
        throw withTelemetryMessage(
          Error(`Failed to checkout commit ${h}: ${redactKnownUrls(unshallow.stderr, gitUrl)}`),
          "plugin git-subdir checkout failed (stderr redacted)",
        );
      resolvedSha = await verifyPinnedSha(cloneDir, `${h}^{commit}`, h, { inCheckoutArgs: ke, env: env });
    } else {
      let [nt, pt] = await Promise.all([
        runGitInOwnWorkTree(cloneDir, [...Ie, "HEAD"], Ae),
        execFileNoThrowWithCwd(gitExe(), [...ke, "rev-parse", "HEAD"], {
          cwd: cloneDir,
          env: env,
          stdin: "ignore",
        }),
      ]);
      if (nt.code !== 0)
        throw withTelemetryMessage(
          Error(`git read-tree after sparse-checkout failed: ${redactKnownUrls(nt.stderr, gitUrl)}`),
          "plugin git-subdir read-tree (post sparse-checkout) failed (stderr redacted)",
        );
      if (pt.code === 0) resolvedSha = pt.stdout.trim();
    }
    let resolvedSubdir = validatePathWithinBase(cloneDir, r);
    await hasSymlinkBetween(cloneDir, resolvedSubdir, r);
    try {
      if (dirname_5(n) !== anchoredPluginCachePath()) await getFsImplementation().mkdir(dirname_5(n));
      await retryFsOp(resolvedSubdir, n);
    } catch (error) {
      if (isENOENT(error))
        throw Error(
          `Subdirectory '${r}' not found in repository ${redactUrlQuery(gitUrl)}${s ? ` (ref: ${s})` : ""}. Check that the path is correct and exists at the specified ref/sha.`,
        );
      throw error;
    }
    let lt = s ? ` ref=${s}` : "",
      Je = resolvedSha ? ` sha=${resolvedSha}` : "";
    return (
      logForDebugging(`Extracted subdir ${r} from ${redactUrlQuery(gitUrl)}${lt}${Je} to ${n}`),
      resolvedSha
    );
  } finally {
    await rm_3(cloneDir, { recursive: !0, force: !0 });
  }
}
//@ chunk-e6aww6q8.js:4531133-4531330 fingerprint = installFromLocal (0.745)
async function installFromLocal(e, n, r, s = !1, { noFollowFiles: h = !1 } = {}) {
  if (!(await pathExists(e))) throw Error(`Source path does not exist: ${e}`);
  await copyDir(e, n, e, n, r || e, s, new Set(), K8(), !1, h, !0);
  let gitPath = join_9(n, ".git");
  await removeDirectoryTreeNoFollow(gitPath);
}
//@ chunk-e6aww6q8.js:4531330-4531365 layout
function getTemporaryCachePath(e) {
  return makeTempCachePathName(generateTemporaryCacheNameForPlugin(e));
}
//@ chunk-e6aww6q8.js:4531365-4531639 fingerprint = generateTemporaryCacheNameForPlugin (0.683)
function generateTemporaryCacheNameForPlugin(source) {
  if (typeof source === "string") return "local";
  switch (source.source) {
    case "npm":
      return "npm";
    case "github":
      return "github";
    case "url":
      return "git";
    case "git-subdir":
      return "subdir";
    case "archive":
    case "claudeai":
      return "archive";
    case "command":
      return "command";
    default:
      return "unknown";
  }
}
//@ chunk-e6aww6q8.js:4531639-4531882 placement
function redactPluginSourceForLog(e) {
  if (typeof e === "string") return e;
  return {
    ...e,
    ...("url" in e && { url: redactUrlsTracked(e.url) }),
    ...("registry" in e && e.registry !== void 0 && { registry: redactUrlsInText(e.registry) }),
    ...("package" in e &&
      /^[a-z][a-z\d+.-]*:\/\//i.test(e.package) && { package: redactUrlsInText(e.package) }),
  };
}
/**
 * 按来源把插件下载/复制到临时目录：npm、github/url/git-subdir（git 克隆、sha 钉住校验）、archive（https zip）、command、本地路径；storageV5 下在插件缓存内分配暂存区。返回 {path, manifest, gitCommitSha…} 供 copyPluginToVersionedCache 使用。
 */
//@ chunk-e6aww6q8.js:4531882-4534542 placement = cachePlugin (0.458)
async function cachePlugin(source, options) {
  let cachePath = anchoredPluginCachePath();
  await getFsImplementation().mkdir(cachePath);
  let tempName = getTemporaryCachePath(source),
    h = strictCacheAddressable(options?.storageV5),
    y =
      isStorageV5Enabled() && options?.storageV5 !== void 0 && h && options.pluginId
        ? allocateStagingInCache(options.storageV5, options.pluginId)
        : void 0;
  if (y !== void 0)
    try {
      if (
        (await getFsImplementation().mkdir(dirname_5(y.path)),
        !(await stat_2(dirname_5(y.path))).isDirectory())
      )
        throw Error("the plugin cache folder is not a directory");
    } catch (error) {
      (logForDebugging(
        `Could not prepare ${dirname_5(y.path)} for staging (${errorMessage(error)}); staging at the cache root instead`,
        { level: "debug" },
      ),
        (y = void 0));
    }
  let S = y?.path ?? join_9(cachePath, tempName),
    tempPath = join_9(cachePath, tempName),
    L = async () => {
      if (y !== void 0) await getFsImplementation().mkdir(dirname_5(S));
    },
    G = !1,
    q,
    Z,
    Se,
    ke,
    we;
  try {
    if (
      (logForDebugging(
        `Caching plugin from source: ${jsonStringify(redactPluginSourceForLog(source))} to temporary path ${S}`,
      ),
      (G = !0),
      typeof source === "string")
    )
      (await L(), await installFromLocal(source, S, options?.containmentRoot, h));
    else
      switch (source.source) {
        case "npm":
          await L();
          try {
            ke = await fetchNpmPackageNoScripts(source.package, S, {
              registry: source.registry,
              version: source.version,
              scratchDir: `${tempPath}${Kqe}`,
              isNpmMarketplaceLane: options?.isNpmMarketplaceLane,
              expectedIntegrity: options?.expectedNpmIntegrity,
            });
          } finally {
            await removeDirectoryTreeNoFollow(`${tempPath}${Kqe}`).catch(() => {});
          }
          break;
        case "github":
          (await L(),
            (q = await installFromGitHub(
              source.repo,
              S,
              source.ref,
              source.sha,
              options.directoryPin !== null,
              options.gitHubHttpsFallback,
            )));
          break;
        case "url":
          (await L(),
            (q = await installFromGit(source.url, S, source.ref, source.sha, {
              isDirectoryPlugin: options?.isDirectoryPlugin,
              noSubmodules: options.directoryPin !== null,
            })));
          break;
        case "git-subdir":
          q = await installFromGitSubdir(source.url, S, source.path, source.ref, source.sha, tempPath, {
            noSubmodules: options.directoryPin !== null,
          });
          break;
        case "archive":
          Z = await installFromArchive(
            source,
            S,
            tempPath,
            options?.archiveAuth,
            options?.entryDeclaresComponents ?? !1,
            options?.declaredComponentPaths === void 0 ? [] : options.declaredComponentPaths,
          );
          break;
        case "claudeai":
          Z = await installClaudeAiPlugin(source, S, tempPath, options?.credentials);
          break;
        case "command": {
          let lt = await holdCommandSourceForOrg(
            source,
            S,
            async (Je, nt) => {
              (await L(), await installFromLocal(Je, nt, void 0, h, { noFollowFiles: !0 }));
            },
            options?.commandSourceConsent,
          );
          ((Z = lt.contentSha256), (Se = lt.producerDirectory));
          break;
        }
        case "unsupported":
          if (source.error)
            throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
              `This plugin's marketplace entry is invalid: ${source.error}`,
              "plugin marketplace entry source invalid",
            );
          throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
            UNSUPPORTED_SOURCE_MESSAGE,
            "plugin source type unsupported",
          );
        default:
          throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
            UNSUPPORTED_SOURCE_MESSAGE,
            "plugin source type unsupported",
          );
      }
    if (h && !Nee(source)) assertSymlinkFree(await materializePluginLinks(S, copyDir), S);
    let ze = typeof source === "string" ? source : source.source;
    if (((we = await loadPluginManifest(S, tempName, ze, [join_9(S, PLUGIN_JSON)])), !Nee(source)))
      await removeIgnoredEntries(S, { keepGit: !0 });
  } catch (error) {
    if (G && (h || (await pathExists(S)))) {
      logForDebugging(`Cleaning up failed installation at ${S}`);
      try {
        await removeDirectoryTreeNoFollow(S);
      } catch (error) {
        logForDebugging(`Failed to clean up installation: ${error}`, { level: "error" });
      }
    }
    throw error;
  }
  let Ee = typeof source === "string" ? source : source.source,
    { manifest: manifest, manifestPath: manifestPath, depConstraints: depConstraints } = we,
    We =
      manifestPath !== null
        ? manifest
        : options?.manifest || { name: tempName, description: `Plugin cached from ${Ee}` };
  return (
    logForDebugging(`Successfully cached plugin ${We.name} to ${S}`),
    {
      path: S,
      manifest: We,
      ...(q && { gitCommitSha: q }),
      ...(Z && { contentSha256: Z }),
      ...(Se && { producerPath: Se }),
      ...(ke && { npmResolution: ke }),
      ...(depConstraints && { depConstraints: depConstraints }),
      ...(y && { stagingScope: y.scope }),
    }
  );
}
//@ chunk-e6aww6q8.js:4534542-4534733 placement
function allocateStagingInCache(e, n) {
  let r = anchoredPluginCachePath(),
    s = pluginCacheStorageScope(getPluginCacheDirIn(getPluginsDirectory(), n), r);
  if (s === null || s.plugin === void 0) return;
  let stagingScopeWithin = e.stagingScopeWithin(s);
  if (!isVersionRootStorageKey(stagingScopeWithin)) return;
  let y = storageKeyToCachePath(stagingScopeWithin, r);
  return y === null ? void 0 : { scope: stagingScopeWithin, path: y };
}
//@ chunk-e6aww6q8.js:4534733-4534867 placement
var ARCHIVE_RETRY_DELAYS_MS = [30, 70, 150],
  UNSUPPORTED_SOURCE_MESSAGE =
    "This plugin uses a source type your Claude Code version does not support. Update Claude Code and try again.";
/**
 * 安装插件压缩包：拒绝只声明不安全组件路径的条目，过滤 __MACOSX 等文件。
 */
//@ chunk-e6aww6q8.js:4534867-4537104 placement
async function installFromArchive(e, n, r, s, h = !1, y = []) {
  return withFeatureTelemetry("plugin_archive_install", async () => {
    if (y === null)
      throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
        `Plugin archive from ${redactUrlsInText(e.url)} was not installed: its marketplace entry declares only unsafe or malformed component paths. Fix the entry.`,
        "plugin marketplace entry declares only unsafe component paths",
      );
    let S;
    if (s && Object.keys(s.headers).length > 0)
      if (sameOrigin_2(s.url, e.url)) S = s.headers;
      else logForDebugging("Not forwarding marketplace headers to plugin archive on a different origin");
    let { data: w, contentSha256: contentSha256 } = await downloadAndVerifyBinary(e.url, {
        sha256: e.sha256,
        headers: S,
      }),
      G = `${r}${Kqe}`;
    try {
      if (
        !(await extractZipToDirectory(w, G)).some(
          (ke) => !ke.startsWith("__MACOSX/") && basename_3(ke) !== ".DS_Store",
        )
      )
        throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
          `Plugin archive from ${redactUrlsInText(e.url)} contained no plugin files. The archive was not installed. Verify the URL serves a zip of the plugin contents.`,
          "plugin archive was empty",
        );
      let Se = await findPluginRootInExtracted(G);
      if (Se !== G)
        logForDebugging(
          `Plugin archive had a wrapper directory; using ${printableName(basename_3(Se))} as the plugin root`,
        );
      if (h && y !== null && y.length > 0) {
        if (!(await anyPathExistsUnder(Se, y))) {
          let ke = await findSingleTopDir(Se);
          if (ke && (await anyPathExistsUnder(ke, y)))
            (logForDebugging(
              `Plugin archive entry paths resolve under wrapper ${printableName(basename_3(ke))}; using it as the plugin root`,
            ),
              (Se = ke));
          else if (Se !== G && !(await Yws(Se)) && (await anyPathExistsUnder(G, y)))
            (logForDebugging(
              "Plugin archive entry paths resolve at the archive root; using it instead of the promoted subdirectory",
            ),
              (Se = G));
          else {
            let we = Kws(y[0]);
            throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
              `Plugin archive from ${redactUrlsInText(e.url)} does not contain the component paths its marketplace entry declares${we}. The archive was not installed. Repackage the zip so the declared paths sit at the plugin root (optionally inside a single wrapper directory), or fix the entry.`,
              "plugin archive missing entry-declared component paths",
            );
          }
        }
      }
      if (
        (await loadPluginManifest(Se, basename_3(r), "archive", [join_9(Se, PLUGIN_JSON)], { isProbe: !0 }),
        !h && !(await $kt(Se)))
      )
        throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
          `Plugin archive from ${redactUrlsInText(e.url)} has no plugin content at its root (expected .claude-plugin/ or a commands/, skills/, agents/, hooks/, themes/, output-styles/, monitors/, workflows/, SKILL.md, .mcp.json, or .lsp.json at the top level, optionally inside a single wrapper directory). The archive was not installed.`,
          "plugin archive has no plugin-shaped root",
        );
      if (dirname_5(n) !== anchoredPluginCachePath()) await getFsImplementation().mkdir(dirname_5(n));
      return (await retryFsOp(Se, n), contentSha256);
    } finally {
      await rm_3(G, { recursive: !0, force: !0 }).catch(() => {});
    }
  });
}
/**
 * 读取并解析 .claude-plugin/plugin.json（找不到再试候选路径），先确认清单路径不经符号链接逃出插件目录；JSON 损坏或 schema 失败抛 TelemetrySafeError；返回 {manifest, manifestPath, depConstraints}。没有 manifest 时用目录名合成。
 */
//@ chunk-e6aww6q8.js:4537104-4539060 placement = loadPluginManifest (0.364)
async function loadPluginManifest(pluginPath, pluginName, source, s = [], h, y) {
  let S = () => {
      if (!h?.isProbe && !h?.noTelemetry) logFeatureOk("plugin_load_manifest");
    },
    w = (G) => {
      if (h?.noTelemetry) return;
      logFeatureBad("plugin_load_manifest", G);
    },
    L = [join_9(pluginPath, PLUGIN_MANIFEST_PATH), ...s];
  await assertManifestContained(h?.containedIn, pluginPath, pluginName, PLUGIN_MANIFEST_PATH, h?.noTelemetry);
  for (let G of L) {
    let q,
      Z = isStorageV5Enabled() && y !== void 0 ? await readFileViaStorageBackend(y, G) : null;
    if (Z !== null) {
      if (Z.outcome === "absent" || (Z.outcome === "error" && Z.telemetryCode === "ENOTDIR")) continue;
      if (Z.outcome === "error")
        throw (
          w("plugin_load_manifest_read_failed"),
          logForDebugging(
            `Plugin ${pluginName}: failed to read manifest file at ${G}. Read error: ${Z.detail}`,
            { level: "error" },
          ),
          new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
            `Plugin ${pluginName}: failed to read manifest file at ${G}.

Read error: ${Z.detail}`,
            "plugin manifest read failed (v5 backend error)",
            MANIFEST_ERROR_CLASSES.readFailed,
          )
        );
      q = Z.content;
    } else
      try {
        q = await readFile_3(G, { encoding: "utf-8" });
      } catch (error) {
        if (isENOENT(error) || getErrnoCode(error) === "ENOTDIR") continue;
        let parsedJson = errorMessage(error);
        throw (
          w("plugin_load_manifest_read_failed"),
          logForDebugging(
            `Plugin ${pluginName}: failed to read manifest file at ${G}. Read error: ${parsedJson}`,
            { level: "error" },
          ),
          new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
            `Plugin ${pluginName}: failed to read manifest file at ${G}.

Read error: ${parsedJson}`,
            "plugin manifest read failed",
            MANIFEST_ERROR_CLASSES.readFailed,
          )
        );
      }
    let Se;
    try {
      Se = jsonParse(Wo(q));
    } catch (error) {
      let errorMsg = errorMessage(error);
      throw (
        w("plugin_load_manifest_json_invalid"),
        logForDebugging(
          `Plugin ${pluginName} has a corrupt manifest file at ${G}. Parse error: ${errorMsg}`,
          { level: "error" },
        ),
        new ManifestLoadError(
          `Plugin ${pluginName} has a corrupt manifest file at ${G}.

JSON parse error: ${errorMsg}`,
          "plugin manifest is not valid JSON",
          MANIFEST_ERROR_CLASSES.jsonInvalid,
          G,
          [errorMsg],
        )
      );
    }
    let ke = validatePluginManifest(Se, "plugin-json", { pluginName: pluginName, manifestPath: G });
    if (!ke.ok)
      throw (
        w("plugin_load_manifest_schema_invalid"),
        logForDebugging(ke.error, { level: "error" }),
        new ManifestLoadError(
          ke.error,
          "plugin manifest failed schema validation",
          MANIFEST_ERROR_CLASSES.schemaInvalid,
          G,
          ke.errors.map((error) => (error.path ? `${error.path}: ${error.message}` : error.message)),
        )
      );
    for (let hookNote of ke.hookNotes)
      logForDebugging(`Plugin ${pluginName}: ${hookNote}`, { level: "warn" });
    let { manifest: manifest, rawCandidate: rawCandidate } = ke;
    return (
      S(),
      { manifest: manifest, manifestPath: G, depConstraints: readManifestDependencyPins(rawCandidate) }
    );
  }
  return (
    S(),
    {
      manifest: { name: pluginName, description: `Plugin from ${source}` },
      manifestPath: null,
      depConstraints: void 0,
    }
  );
}
/**
 * 读取 hooks/hooks.json：校验 PluginHooksSchema，返回 hooks 配置与 hooks 模块（modules）列表。
 */
//@ chunk-e6aww6q8.js:4539060-4540263 fingerprint = loadPluginHooks (0.496)
async function loadPluginHooks_3(hooksFilePath, pluginName, r) {
  let s,
    h = isStorageV5Enabled() && r !== void 0 ? await readFileViaStorageBackend(r, hooksFilePath) : null;
  if (h !== null) {
    if (h.outcome === "error")
      throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
        `Hooks file read failed at ${hooksFilePath} for plugin ${pluginName}: ${h.detail}`,
        "plugin hooks file read failed (v5 backend)",
      );
    s = h.outcome === "found" ? h.content : void 0;
  } else if (await pathExists(hooksFilePath)) s = await readFile_3(hooksFilePath, { encoding: "utf-8" });
  if (s === void 0)
    throw Error(
      `Hooks file not found at ${hooksFilePath} for plugin ${pluginName}. If the manifest declares hooks, the file must exist.`,
    );
  let y = jsonParse(s);
  if (hasNestedHooks(y, SETTINGS_SKIPPED_KEYS) || looksLikeHookMatcher(y))
    throw new HookValidationError(
      `hooks.json declares ${[...GUARD_HOOK_EVENTS].join("/")} at its top level, outside the "hooks" object \u2014 ${UNLOADABLE_GUARD_NOTE}`,
    );
  if (
    y &&
    typeof y === "object" &&
    "hooks" in y &&
    y.hooks !== null &&
    y.hooks !== void 0 &&
    !isPlainObject_4(y.hooks)
  )
    throw new HookValidationError(
      `hooks: must be an object mapping event names to matcher arrays \u2014 ${UNLOADABLE_GUARD_NOTE}`,
    );
  if (y && typeof y === "object" && "hooks" in y) {
    let rawHooksConfig = validateHooksSetting(y.hooks);
    for (let note of rawHooksConfig.notes)
      logForDebugging(`Plugin ${pluginName}: ${note}`, { level: "warn" });
    if (rawHooksConfig.unloadableGuards.length > 0)
      throw new HookValidationError(
        `${rawHooksConfig.unloadableGuards.join("; ")} \u2014 ${UNLOADABLE_GUARD_NOTE}`,
      );
  }
  let S;
  try {
    S = PluginHooksSchema().parse(y);
  } catch (error) {
    let L = y && typeof y === "object" && "hooks" in y ? y.hooks : void 0;
    if (hasGuardHooks_2(L) || hasGuardHooks_2(y))
      throw new HookValidationError(`${errorMessage(error)} \u2014 ${UNLOADABLE_GUARD_NOTE}`);
    throw error;
  }
  return (
    warnUnknownHooksJsonKeys(pluginName, hooksFilePath, y),
    { hooks: S.hooks ?? {}, modules: S.modules ?? [] }
  );
}
/**
 * 处理 hooks.json 的 modules（JS hooks 模块）：每插件只允许一个，多于一个时报 hook-load-failed 都不加载。
 */
//@ chunk-e6aww6q8.js:4540263-4540956 layout
async function loadPluginHooksModule(e) {
  let {
      plugin: plugin,
      namedModules: namedModules,
      source: source,
      storageV5: storageV5,
      anchor: anchor,
    } = e,
    [S, w] = namedModules;
  if (S === void 0) return;
  if (w !== void 0)
    return {
      type: "hook-load-failed",
      source: source,
      plugin: plugin.name,
      hookPath: w.hooksFilePath,
      reason: `Plugin ${plugin.name} names one hooks module per plugin, but ${namedModules.map((q) => q.hooksFilePath).join(" and ")} each name one in \`modules\`; neither is loaded`,
    };
  let { fullPath: fullPath, reason: reason } = await resolveComponentPath(
    resolveWithinDir,
    anchor,
    plugin.path,
    join_9(relative_5(plugin.path, dirname_5(S.hooksFilePath)), S.spec),
  );
  if (fullPath === null)
    return {
      type: "path-traversal",
      source: source,
      plugin: plugin.name,
      path: S.spec,
      component: "hooks",
      ...(reason !== void 0 && { reason: reason }),
    };
  if (!(await pie(storageV5, fullPath)))
    return {
      type: "path-not-found",
      source: source,
      plugin: plugin.name,
      path: fullPath,
      component: "hooks",
    };
  plugin.modulePath = fullPath;
  return;
}
/**
 * 读 manifest 的 monitors（或 experimental.monitors），缺省时读 monitors/monitors.json，校验后挂到插件对象上（后台常驻监视命令）。
 */
//@ chunk-e6aww6q8.js:4540956-4542014 layout
async function loadPluginMonitors(e, n, r, s, h, y, S) {
  let w = n.experimental?.monitors ?? n.monitors,
    L;
  if (w === void 0) {
    let G = join_9(e, "monitors", "monitors.json"),
      q = await probeComponentPath(y, G);
    if (q === "present") {
      if (
        await reportIfPathEscapes(S, e, join_9("monitors", "monitors.json"), {
          errors: s,
          source: r,
          plugin: n.name,
          component: "monitors",
        })
      )
        return;
      L = G;
    } else if (q !== "absent") reportUncheckablePath(s, r, n.name, "monitors", G, q);
  } else if (typeof w === "string") {
    let { fullPath: fullPath, reason: reason } = await resolveComponentPath(resolveWithinDir, h, e, w);
    if (fullPath === null) {
      s.push({
        type: "path-traversal",
        source: r,
        plugin: n.name,
        path: w,
        component: "monitors",
        ...(reason !== void 0 && { reason: reason }),
      });
      return;
    }
    L = fullPath;
  } else return w;
  if (L === void 0) return;
  try {
    let G = isStorageV5Enabled() && y !== void 0 ? await readFileViaStorageBackend(y, L) : null,
      q;
    if (G !== null) {
      if (G.outcome !== "found")
        throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
          G.outcome === "error" ? G.detail : `monitors file not found at ${L}`,
          "plugin monitors read failed (v5 backend)",
        );
      q = G.content;
    } else q = await readFile_3(L, { encoding: "utf-8" });
    return PluginMonitorsArraySchema().parse(jsonParse(q));
  } catch (error) {
    let q = errorMessage(error);
    (logForDebugging(`Failed to load monitors for ${n.name} from ${L}: ${q}`, { level: "error" }),
      s.push({
        type: "component-load-failed",
        source: r,
        plugin: n.name,
        component: "monitors",
        path: L,
        reason: q,
      }));
    return;
  }
}
/**
 * 把相对路径解析到目录内，越界返回 null。
 */
//@ chunk-e6aww6q8.js:4542014-4542132 layout
function resolveWithinDir(e, n) {
  let r = resolve_5(e),
    s = resolve_5(r, n),
    h = relative_5(r, s);
  if (h === ".." || h.startsWith(`..${sep_8}`) || resolve_5(h) === h) return null;
  return s;
}
/**
 * 校验 manifest 中声明的组件路径：都要在插件目录内且存在，逃逸或不存在的记 path-traversal/path-not-found 错误，返回有效路径。
 */
//@ chunk-e6aww6q8.js:4542132-4543378 fingerprint = validatePluginPaths (0.466)
async function validatePluginPaths(e, n, r, s, h, y, S, w, L, G = !1, q) {
  let checks = await Promise.all(
      e.map(async (relPath) => {
        let { fullPath: fullPath, reason: reason } = await resolveComponentPath(
          resolveWithinDir,
          L,
          n,
          relPath,
        );
        if (fullPath === null)
          return { relPath: relPath, fullPath: fullPath, reason: reason, exists: !1, isDirectory: !1 };
        return {
          relPath: relPath,
          fullPath: fullPath,
          reason: reason,
          ...(await statPluginPath(q, fullPath)),
        };
      }),
    ),
    validPaths = [];
  for (let {
    relPath: relPath,
    fullPath: fullPath,
    exists: exists,
    isDirectory: isDirectory,
    reason: reason,
  } of checks) {
    if (fullPath === null) {
      (logForDebugging(
        `${y} path ${relPath} ${S} escapes plugin directory for ${r}${reason === void 0 ? "" : `: ${reason}`}`,
        { level: "error" },
      ),
        w.push({
          type: "path-traversal",
          source: s,
          plugin: r,
          path: relPath,
          component: h,
          ...(reason !== void 0 && { reason: reason }),
        }));
      continue;
    }
    if (!exists)
      (logForDebugging(`${y} path ${relPath} ${S} not found at ${fullPath} for ${r}`, { level: "error" }),
        w.push({ type: "path-not-found", source: s, plugin: r, path: fullPath, component: h }));
    else if (G && !isDirectory) {
      let Me = dirname_5(relPath),
        We =
          h === "skills" && basename_3(relPath).toLowerCase() === "skill.md"
            ? Me === "."
              ? " \u2014 point to the plugin root '.' instead"
              : ` \u2014 point to the parent directory '${Me}' instead`
            : "",
        ze =
          h === "skills"
            ? `path is a file; skills entries must be directories containing SKILL.md${We}`
            : "path is a file; expected a directory";
      (logForDebugging(`${y} path ${relPath} ${S} is a file, not a directory, for ${r}`, { level: "error" }),
        w.push({
          type: "component-load-failed",
          source: s,
          plugin: r,
          path: relPath,
          component: h,
          reason: ze,
        }));
    } else validPaths.push(fullPath);
  }
  return validPaths;
}
/**
 * 处理 manifest 或 marketplace 条目中 commands 的对象形式（name → {source|content,…}）与路径数组：解析路径、校验逃逸、内联内容注册，结果写入插件对象。
 */
//@ chunk-e6aww6q8.js:4543378-4546074 fingerprint = finishLoadingPluginFromPath (0.446)
async function finishLoadingPluginFromPath(e, n, r, s) {
  let {
      pluginPath: pluginPath,
      pluginName: pluginName,
      errorSource: errorSource,
      mode: mode,
      origin: origin,
      resolvePath: resolvePath,
      anchor: anchor,
      registerInlineContent: registerInlineContent,
      errors: errors,
    } = r,
    ke = origin === "manifest" ? "specified in manifest but" : "from marketplace entry",
    we = origin === "manifest" ? "manifest" : "marketplace entry",
    Ee = Object.values(n)[0];
  if (
    typeof n === "object" &&
    !Array.isArray(n) &&
    Ee &&
    typeof Ee === "object" &&
    ("source" in Ee || "content" in Ee)
  ) {
    let We = mode === "append" ? { ...(e.commandsMetadata || {}) } : {},
      ze = 0,
      lt = [],
      checks = await Promise.all(
        Object.entries(n).map(async ([nt, pt]) => {
          if (!pt || typeof pt !== "object") return { commandName: nt, metadata: pt, kind: "skip" };
          if (pt.source) {
            let { fullPath: fullPath, reason: reason } = await resolveComponentPath(
              resolvePath,
              anchor,
              pluginPath,
              pt.source,
            );
            return {
              commandName: nt,
              metadata: pt,
              kind: "source",
              fullPath: fullPath,
              reason: reason,
              exists: fullPath !== null && (await pie(s, fullPath)),
            };
          }
          if (pt.content && registerInlineContent) return { commandName: nt, metadata: pt, kind: "content" };
          return { commandName: nt, metadata: pt, kind: "skip" };
        }),
      );
    for (let check of checks) {
      if (check.kind === "skip") continue;
      if (check.kind === "content") {
        ((We[check.commandName] = check.metadata), ze++);
        continue;
      }
      if (check.fullPath === null)
        (logForDebugging(
          `Command ${check.commandName} source ${check.metadata.source} ${ke} escapes plugin directory for ${pluginName}${check.reason === void 0 ? "" : `: ${check.reason}`}`,
          { level: "error" },
        ),
          errors.push({
            type: "path-traversal",
            source: errorSource,
            plugin: pluginName,
            path: check.metadata.source ?? "",
            component: "commands",
            ...(check.reason !== void 0 && { reason: check.reason }),
          }));
      else if (check.exists) (lt.push(check.fullPath), (We[check.commandName] = check.metadata), ze++);
      else
        (logForDebugging(
          `Command ${check.commandName} path ${check.metadata.source} ${ke} not found at ${check.fullPath} for ${pluginName}`,
          { level: "error" },
        ),
          errors.push({
            type: "path-not-found",
            source: errorSource,
            plugin: pluginName,
            path: check.fullPath,
            component: "commands",
          }));
    }
    if (lt.length > 0) e.commandsPaths = mode === "append" ? [...(e.commandsPaths || []), ...lt] : lt;
    if (ze > 0) e.commandsMetadata = We;
    return;
  }
  let Ae = Array.isArray(n) ? n : [n],
    checks = await Promise.all(
      Ae.map(async (cmdPath) => {
        if (typeof cmdPath !== "string") return { cmdPath: cmdPath, kind: "invalid" };
        let { fullPath: fullPath, reason: reason } = await resolveComponentPath(
          resolvePath,
          anchor,
          pluginPath,
          cmdPath,
        );
        return {
          cmdPath: cmdPath,
          kind: "path",
          fullPath: fullPath,
          reason: reason,
          exists: fullPath !== null && (await pie(s, fullPath)),
        };
      }),
    ),
    Me = [];
  for (let check of checks) {
    if (check.kind === "invalid") {
      logForDebugging(`Unexpected command format in ${we} for ${pluginName}`, { level: "error" });
      continue;
    }
    if (check.fullPath === null) {
      (logForDebugging(
        `Command path ${check.cmdPath} ${ke} escapes plugin directory for ${pluginName}${check.reason === void 0 ? "" : `: ${check.reason}`}`,
        { level: "error" },
      ),
        errors.push({
          type: "path-traversal",
          source: errorSource,
          plugin: pluginName,
          path: check.cmdPath,
          component: "commands",
          ...(check.reason !== void 0 && { reason: check.reason }),
        }));
      continue;
    }
    if (check.exists) Me.push(check.fullPath);
    else
      (logForDebugging(
        `Command path ${check.cmdPath} ${ke} not found at ${check.fullPath} for ${pluginName}`,
        { level: "error" },
      ),
        errors.push({
          type: "path-not-found",
          source: errorSource,
          plugin: pluginName,
          path: check.fullPath,
          component: "commands",
        }));
  }
  if (Me.length > 0) e.commandsPaths = mode === "append" ? [...(e.commandsPaths || []), ...Me] : Me;
}
/**
 * 由插件目录构造 LoadedPlugin：读 manifest；默认目录 commands/、agents/、skills/、output-styles/、themes/、workflows/ 存在即挂 *Path，manifest 指定的路径挂 *Paths（并做目录逃逸检查）；根目录 SKILL.md 视为单技能插件；读 hooks/hooks.json 与 manifest.hooks、monitors、mcpServers、lspServers、settings、userConfig 等；错误收集到 errors 数组。
 */
//@ chunk-e6aww6q8.js:4547805-4555972 placement = createPluginFromPath (0.485)
async function createPluginFromPath(pluginPath, pluginSource, enabled, fallbackName, h = !0, y, S, w, L) {
  let G = [],
    q = [],
    Z = S ?? (await resolveContainmentRoots([pluginPath], "plugin directory")),
    {
      manifest: manifest,
      manifestPath: manifestPath,
      depConstraints: depConstraints,
    } = await loadPluginManifest(pluginPath, fallbackName, pluginSource, [], { ...w, containedIn: L }, y),
    Ee = {
      name: manifest.name,
      manifest: manifest,
      path: pluginPath,
      source: pluginSource,
      repository: pluginSource,
      enabled: enabled,
      depConstraints: depConstraints,
    },
    Ae = new Map(),
    Ie = async (ao) => {
      try {
        return (await stat_2(join_9(pluginPath, ao)), !0);
      } catch (error) {
        if (!isPathAbsent(error)) Ae.set(ao, getErrnoCode(error) ?? "UNKNOWN");
        return !1;
      }
    },
    [Me, We, ze, lt, Je, nt] = await (async () => {
      let ao = ["commands", "agents", "skills", "output-styles", "themes"],
        $o =
          isStorageV5Enabled() && y !== void 0
            ? parseVersionCachePath(pluginPath, anchoredPluginCachePath())
            : null;
      if (isStorageV5Enabled() && y !== void 0 && $o !== null) {
        let yo = new Set(),
          Ho,
          rr = !1;
        do {
          let listEntries = await y.listEntries(
            { namespace: "pluginCache", marketplace: $o.marketplace, plugin: $o.plugin, version: $o.version },
            { skipKeyStats: !0, ...(Ho === void 0 ? {} : { cursor: Ho }) },
          );
          if (!listEntries.ok) {
            rr = !0;
            break;
          }
          for (let item of listEntries.value.items) {
            let Fr =
              item.kind === "scope" && item.scope.namespace === "pluginCache"
                ? item.scope.relPath?.at(-1)
                : void 0;
            if (Fr !== void 0) yo.add(Fr);
          }
          Ho = listEntries.value.cursor;
        } while (Ho !== void 0);
        if (!rr) {
          let br = (Hr, Fr) => (Fr ? Promise.resolve(!0) : Ie(Hr));
          return Promise.all([...ao.map((Hr) => br(Hr, yo.has(Hr))), br("workflows", yo.has("workflows"))]);
        }
      }
      return Promise.all([...ao.map((cmdPath) => Ie(cmdPath)), Ie("workflows")]);
    })();
  for (let [ao, $o] of [...Ae].sort(([yo], [Ho]) => yo.localeCompare(Ho))) {
    let fullPath = join_9(pluginPath, ao);
    (logForDebugging(
      `Plugin ${manifest.name}: could not check the default ${ao}/ folder at ${fullPath} (${$o}); not loading it`,
      { level: "error" },
    ),
      G.push({
        type: "path-not-found",
        source: pluginSource,
        plugin: manifest.name,
        path: fullPath,
        component: ao,
        errno: $o,
      }));
  }
  let { marketplace: marketplace } = parsePluginIdentifier_2(pluginSource);
  for (let [ao, $o, yo, Ho] of [
    ["commands", Me, "commands", "commands"],
    ["agents", We, "agents", "agents"],
    ["outputStyles", lt, "output-styles", "output-styles"],
    ["themes", Je, "themes", "themes"],
  ]) {
    let rr = manifest.experimental?.[ao],
      br = manifest[ao];
    if (ao === "themes") br = manifest.experimental?.themes ?? manifest.themes;
    else if (ao === "outputStyles") br = manifest.outputStyles;
    let Hr = [];
    if (rr !== void 0) Hr.push(`experimental.${ao}`);
    if (manifest[ao] !== void 0 && (rr === void 0 || !0)) Hr.push(ao);
    if (!br || !$o) continue;
    logPluginFolderShadowed(manifest.name, marketplace, yo);
    let Fr = join_9(pluginPath, Ho);
    if (specCoversDefaultDir(br, pluginPath, Fr)) continue;
    (logForDebugging(
      `Plugin ${manifest.name}: ${Ho}/ folder exists but is not auto-loaded because the manifest sets ${Hr.map((cs) => `"${cs}"`).join(" and ")}`,
    ),
      q.push({
        type: "folder-shadowed-by-manifest",
        source: pluginSource,
        plugin: manifest.name,
        component: yo,
        folderPath: Fr,
        manifestFields: Hr,
      }));
  }
  if (manifest.workflows && nt) {
    logPluginFolderShadowed(manifest.name, marketplace, "workflows");
    let ao = join_9(pluginPath, "workflows");
    if (!specCoversDefaultDir(manifest.workflows, pluginPath, ao))
      q.push({
        type: "folder-shadowed-by-manifest",
        source: pluginSource,
        plugin: manifest.name,
        component: "workflows",
        folderPath: ao,
        manifestFields: [
          manifest.experimental?.workflows !== void 0 ? "experimental.workflows" : "workflows",
        ],
      });
  }
  if (
    (manifest.experimental?.monitors ?? manifest.monitors) !== void 0 &&
    (await pie(y, join_9(pluginPath, "monitors", "monitors.json")))
  )
    logPluginFolderShadowed(manifest.name, marketplace, "monitors");
  let Et = !manifest.commands && Me,
    yt = !manifest.agents && We,
    gt = ze,
    outputStyles = manifest.outputStyles,
    It = !outputStyles && lt,
    Yt = !(manifest.experimental?.themes ?? manifest.themes) && Je,
    qt = !manifest.workflows && nt,
    Zt = join_9(pluginPath, "commands");
  if (Et) Ee.commandsPath = Zt;
  if (manifest.commands)
    await finishLoadingPluginFromPath(
      Ee,
      manifest.commands,
      {
        pluginPath: pluginPath,
        pluginName: manifest.name,
        errorSource: pluginSource,
        mode: "assign",
        origin: "manifest",
        resolvePath: resolveWithinDir,
        anchor: Z,
        registerInlineContent: !0,
        errors: G,
      },
      y,
    );
  let agentsPath = join_9(pluginPath, "agents");
  if (yt) Ee.agentsPath = agentsPath;
  if (manifest.agents) {
    let ao = Array.isArray(manifest.agents) ? manifest.agents : [manifest.agents],
      $o = await validatePluginPaths(
        ao,
        pluginPath,
        manifest.name,
        pluginSource,
        "agents",
        "Agent",
        "specified in manifest but",
        G,
        Z,
        !1,
        y,
      );
    if ($o.length > 0) Ee.agentsPaths = $o;
  }
  let skillsPath = join_9(pluginPath, "skills");
  if (gt) Ee.skillsPath = skillsPath;
  if (manifest.skills) {
    let ao = Array.isArray(manifest.skills) ? manifest.skills : [manifest.skills],
      $o = resolve_5(skillsPath),
      yo = resolve_5(pluginPath),
      filtered = (
        await validatePluginPaths(
          ao,
          pluginPath,
          manifest.name,
          pluginSource,
          "skills",
          "Skill",
          "specified in manifest but",
          G,
          Z,
          !0,
          y,
        )
      ).filter((rr) => {
        let br = resolve_5(rr);
        if (br === $o) return !1;
        if (marketplace === SKILLS_DIR && br === yo) return !1;
        return !0;
      });
    if (filtered.length > 0) Ee.skillsPaths = filtered;
  } else if (!gt && marketplace !== SKILLS_DIR) {
    let ao = join_9(pluginPath, "SKILL.md"),
      $o = await probeComponentPath(y, ao);
    if (
      $o === "present" &&
      !(await reportIfPathEscapes(L, pluginPath, "SKILL.md", {
        errors: G,
        source: pluginSource,
        plugin: manifest.name,
        component: "skills",
      }))
    )
      Ee.skillsPaths = [pluginPath];
    else if (typeof $o === "object") reportUncheckablePath(G, pluginSource, manifest.name, "skills", ao, $o);
  }
  let outputStylesPath = join_9(pluginPath, "output-styles");
  if (It) Ee.outputStylesPath = outputStylesPath;
  if (outputStyles) {
    let ao = Array.isArray(outputStyles) ? outputStyles : [outputStyles],
      $o = await validatePluginPaths(
        ao,
        pluginPath,
        manifest.name,
        pluginSource,
        "output-styles",
        "Output style",
        "specified in manifest but",
        G,
        Z,
        !1,
        y,
      );
    if ($o.length > 0) Ee.outputStylesPaths = $o;
  }
  let hn = join_9(pluginPath, "themes");
  if (Yt) Ee.themesPath = hn;
  let ho = manifest.experimental?.themes ?? manifest.themes;
  if (ho) {
    let ao = Array.isArray(ho) ? ho : [ho],
      $o = await validatePluginPaths(
        ao,
        pluginPath,
        manifest.name,
        pluginSource,
        "themes",
        "Theme",
        "specified in manifest but",
        G,
        Z,
        !1,
        y,
      );
    if ($o.length > 0) Ee.themesPaths = $o;
  }
  if (qt) Ee.workflowsPath = join_9(pluginPath, "workflows");
  if (manifest.workflows) {
    let ao = Array.isArray(manifest.workflows) ? manifest.workflows : [manifest.workflows],
      $o = await validatePluginPaths(
        ao,
        pluginPath,
        manifest.name,
        pluginSource,
        "workflows",
        "Workflow",
        "specified in manifest but",
        G,
        Z,
        !1,
        y,
      );
    if ($o.length > 0) Ee.workflowsPaths = $o;
  }
  let yn,
    loadedHookPaths = new Set(),
    Xn = new Set(),
    fo = [],
    standardHooksPath = join_9(pluginPath, "hooks", "hooks.json"),
    bo = await probeComponentPath(y, standardHooksPath),
    vn =
      bo === "present" &&
      (await reportIfPathEscapes(L, pluginPath, join_9("hooks", "hooks.json"), {
        errors: G,
        source: pluginSource,
        plugin: manifest.name,
        component: "hooks",
      }));
  if (bo === "present" && !vn)
    try {
      let { hooks: hooks, modules: modules } = await loadPluginHooks_3(standardHooksPath, manifest.name, y);
      yn = Object.keys(hooks).length > 0 ? hooks : void 0;
      for (let Ho of modules) fo.push({ hooksFilePath: standardHooksPath, spec: Ho });
      let yo = standardHooksPath;
      try {
        yo = await getFsImplementation().realpath(standardHooksPath);
      } catch {}
      (loadedHookPaths.add(yo),
        Xn.add(yo),
        Xn.add(standardHooksPath),
        logForDebugging(
          `Read hooks.json for plugin ${manifest.name} (enabled=${enabled}${enabled ? "" : "; will NOT register, plugin is disabled"}): ${standardHooksPath}`,
        ));
    } catch (error) {
      if (error instanceof HookValidationError) throw error;
      let errorMsg = errorMessage(error);
      (logForDebugging(`Failed to load hooks for ${manifest.name}: ${errorMsg}`, { level: "error" }),
        G.push({
          type: "hook-load-failed",
          source: pluginSource,
          plugin: manifest.name,
          hookPath: standardHooksPath,
          reason: errorMsg,
        }));
    }
  else if (typeof bo === "object")
    (logForDebugging(`Could not determine whether ${manifest.name} ships hooks/hooks.json: ${bo.unknown}`, {
      level: "error",
    }),
      G.push({
        type: "hook-load-failed",
        source: pluginSource,
        plugin: manifest.name,
        hookPath: standardHooksPath,
        reason: `Could not determine whether ${standardHooksPath} exists: ${bo.unknown}`,
        ...(bo.errno !== void 0 && { errno: bo.errno }),
      }));
  if (manifest.hooks) {
    let ao = Array.isArray(manifest.hooks) ? manifest.hooks : [manifest.hooks];
    for (let hookSpec of ao)
      if (typeof hookSpec === "string") {
        if (vn && resolveWithinDir(pluginPath, hookSpec) === resolve_5(standardHooksPath)) continue;
        let {
          fullPath: fullPath,
          reason: reason,
          real: real,
        } = await resolveComponentPath(resolveWithinDir, Z, pluginPath, hookSpec);
        if (fullPath === null) {
          (logForDebugging(
            `Hooks file ${hookSpec} specified in manifest but escapes plugin directory for ${manifest.name}${reason === void 0 ? "" : `: ${reason}`}`,
            { level: "error" },
          ),
            G.push({
              type: "path-traversal",
              source: pluginSource,
              plugin: manifest.name,
              path: hookSpec,
              component: "hooks",
              ...(reason !== void 0 && { reason: reason }),
            }));
          continue;
        }
        if (!(await pie(y, fullPath))) {
          (logForDebugging(
            `Hooks file ${hookSpec} specified in manifest but not found at ${fullPath} for ${manifest.name}`,
            { level: "error" },
          ),
            G.push({
              type: "path-not-found",
              source: pluginSource,
              plugin: manifest.name,
              path: fullPath,
              component: "hooks",
            }));
          continue;
        }
        let br = real ?? fullPath;
        if (Xn.has(br)) {
          logForDebugging(
            `Hooks file ${hookSpec} in the manifest of plugin ${manifest.name} names the standard hooks/hooks.json, which loads on its own; loaded once`,
          );
          continue;
        }
        if (loadedHookPaths.has(br)) {
          if (
            (logForDebugging(
              `Skipping duplicate hooks file for plugin ${manifest.name}: ${hookSpec} (resolves to already-loaded file: ${br})`,
            ),
            h)
          ) {
            let errorMsg = `Duplicate hooks file detected: ${hookSpec} resolves to already-loaded file ${br}; manifest.hooks lists it more than once.`;
            (logForDebugging(errorMsg, { level: "error" }),
              G.push({
                type: "hook-load-failed",
                source: pluginSource,
                plugin: manifest.name,
                hookPath: fullPath,
                reason: errorMsg,
              }));
          }
          continue;
        }
        try {
          let Hr = await loadPluginHooks_3(fullPath, manifest.name, y);
          try {
            if (Object.keys(Hr.hooks).length > 0) yn = mergeHooksSettings(yn, Hr.hooks);
            loadedHookPaths.add(br);
            for (let Fr of Hr.modules) fo.push({ hooksFilePath: fullPath, spec: Fr });
            logForDebugging(
              `Read manifest hooks for plugin ${manifest.name} (enabled=${enabled}${enabled ? "" : "; will NOT register, plugin is disabled"}): ${hookSpec}`,
            );
          } catch (mergeError) {
            let mergeErrorMsg = errorMessage(mergeError);
            (logForDebugging(
              `Failed to merge hooks from ${hookSpec} for ${manifest.name}: ${mergeErrorMsg}`,
              { level: "error" },
            ),
              logError(toError(mergeError)),
              G.push({
                type: "hook-load-failed",
                source: pluginSource,
                plugin: manifest.name,
                hookPath: fullPath,
                reason: `Failed to merge: ${mergeErrorMsg}`,
              }));
          }
        } catch (error) {
          if (error instanceof HookValidationError) throw error;
          let errorMsg = errorMessage(error);
          (logForDebugging(`Failed to load hooks from ${hookSpec} for ${manifest.name}: ${errorMsg}`, {
            level: "error",
          }),
            G.push({
              type: "hook-load-failed",
              source: pluginSource,
              plugin: manifest.name,
              hookPath: fullPath,
              reason: errorMsg,
            }));
        }
      } else if (typeof hookSpec === "object") {
        let {
          hooks: hooks,
          invalid: invalid,
          unloadableGuards: unloadableGuards,
        } = parseHooksSetting(hookSpec);
        if (unloadableGuards.length > 0)
          throw new HookValidationError(
            invalid
              .filter((br) => unloadableGuards.includes(br.path))
              .map((br) => `${br.path}: ${br.reason}`)
              .join("; "),
          );
        if (
          (G.push(...toHookLoadErrors(invalid, pluginSource, manifest.name, manifestPath ?? pluginPath)),
          hooks)
        )
          yn = mergeHooksSettings(yn, hooks);
      }
  }
  let co = await loadPluginHooksModule({
    plugin: Ee,
    namedModules: fo,
    source: pluginSource,
    storageV5: y,
    anchor: Z,
  });
  if (co !== void 0) G.push(co);
  if (yn) Ee.hooksConfig = yn;
  let So = await loadPluginMonitors(pluginPath, manifest, pluginSource, G, Z, y, L);
  if (So) Ee.monitors = So;
  let ko = await reportIfPathEscapes(L, pluginPath, "settings.json", {
      errors: G,
      source: pluginSource,
      plugin: manifest.name,
      component: "settings",
    }),
    un = await loadPluginSettings(pluginPath, manifest, y, ko);
  if (un) Ee.settings = un;
  return {
    plugin: Ee,
    errors: G,
    warnings: q,
    hasManifest: manifestPath !== null,
    manifestPath: manifestPath,
  };
}
//@ chunk-e6aww6q8.js:4555972-4556034 layout
var PluginAllowedSettingsSchema = DoctorLazy(() =>
  u(Object.fromEntries(Z4o.map((e) => [e, getSettingsFieldSchema(e)]))),
);
//@ chunk-e6aww6q8.js:4556034-4556154 file-local
function parsePluginSettings(raw) {
  let result = PluginAllowedSettingsSchema().safeParse(raw);
  if (!result.success) return;
  let data = result.data;
  if (Object.keys(data).length === 0) return;
  return data;
}
/**
 * 读取插件根目录 settings.json（或 manifest.settings），只保留白名单键，作为插件启用期间合并进用户设置的值。
 */
//@ chunk-e6aww6q8.js:4556154-4557356 fingerprint = loadPluginSettings (0.6)
async function loadPluginSettings(e, n, r, s = !1) {
  let settingsJsonPath = join_9(e, "settings.json"),
    y = !1;
  try {
    if (s) throw Object.assign(Error("settings.json not read"), { code: "ENOENT" });
    let S =
        isStorageV5Enabled() && r !== void 0 ? await readFileViaStorageBackend(r, settingsJsonPath) : null,
      w;
    if (S !== null) {
      if (S.outcome === "absent") throw Object.assign(Error("settings.json absent"), { code: "ENOENT" });
      if (S.outcome === "error")
        throw Object.assign(
          new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
            S.detail,
            "plugin settings read failed (v5 backend)",
          ),
          S.telemetryCode !== void 0 ? { code: S.telemetryCode } : {},
        );
      w = S.content;
    } else w = await readFile_3(settingsJsonPath, { encoding: "utf-8" });
    let parsed = jsonParse(w);
    if (isPlainObject_4(parsed)) {
      let filtered = parsePluginSettings(parsed);
      if (filtered)
        return (
          logForDebugging(`Loaded settings from settings.json for plugin ${n.name}`),
          logFeatureOk("plugin_load_settings"),
          filtered
        );
    }
  } catch (error) {
    if (!isFsInaccessible(error))
      ((y = !0),
        logForDebugging(`Failed to parse settings.json for plugin ${n.name}: ${error}`, { level: "warn" }));
  }
  if (n.settings) {
    let filtered = parsePluginSettings(n.settings);
    if (filtered) {
      if ((logForDebugging(`Loaded settings from manifest for plugin ${n.name}`), s))
        logFeatureSad("plugin_load_settings", "plugin_load_settings_containment_refused");
      else if (y) logFeatureSad("plugin_load_settings", "plugin_load_settings_parse_failed");
      else logFeatureOk("plugin_load_settings");
      return filtered;
    }
  }
  if (s) logFeatureSad("plugin_load_settings", "plugin_load_settings_containment_refused");
  else if (y) logFeatureSad("plugin_load_settings", "plugin_load_settings_parse_failed");
  else logFeatureOk("plugin_load_settings");
  return;
}
/**
 * 解析 marketplace 条目里内联的 hooks：只支持对象形式（事件名 → matcher 数组），文件路径与数组形式报 hook-load-failed。
 */
//@ chunk-e6aww6q8.js:4557356-4558076 layout
function parseMarketplaceEntryHooks(e, n, r, s) {
  let h =
    "Define hooks in the plugin's own hooks/hooks.json (or its plugin.json), or inline them here as an object mapping hook event names to matcher arrays.";
  if (Array.isArray(e) && hasGuardHooks_2(e))
    throw new HookValidationError(
      `hooks: the array form is not yet supported in a marketplace entry (${UNLOADABLE_GUARD_NOTE}). ${h}`,
    );
  if (typeof e === "string" || Array.isArray(e))
    return {
      hooks: void 0,
      errors: [
        {
          type: "hook-load-failed",
          source: n,
          plugin: r,
          hookPath: s,
          reason: `hooks: the file-path and array forms are not yet supported in a marketplace entry. ${h}`,
        },
      ],
    };
  let { hooks: hooks, invalid: invalid, unloadableGuards: unloadableGuards } = parseHooksSetting(e);
  if (unloadableGuards.length > 0)
    throw new HookValidationError(
      invalid
        .filter((L) => unloadableGuards.includes(L.path))
        .map((L) => `${L.path}: ${L.reason}`)
        .join("; "),
    );
  return { hooks: hooks, errors: toHookLoadErrors(invalid, n, r, s) };
}
//@ chunk-e6aww6q8.js:4558076-4558210 layout
function toHookLoadErrors(e, n, r, s) {
  return e.map(({ path: path, reason: reason }) => ({
    type: "hook-load-failed",
    source: n,
    plugin: r,
    hookPath: s,
    reason: `${path}: ${reason}`,
  }));
}
//@ chunk-e6aww6q8.js:4558210-4558343 file-local
function mergeHooksSettings(base, additional) {
  if (!base) return additional;
  let merged = { ...base };
  for (let [s, h] of Object.entries(additional))
    if (!merged[s]) merged[s] = h;
    else merged[s] = [...(merged[s] || []), ...h];
  return merged;
}
/**
 * 解析安装记录中的插件路径，路径缺失或不对时提示重新安装。
 */
//@ chunk-e6aww6q8.js:4558343-4560222 placement
async function loadNpmMarketplacePlugin({
  pluginId: pluginId,
  packageName: packageName,
  enabledValue: enabledValue,
  installations: installations,
  registryReadFailed: registryReadFailed,
  knownMarketplaces: knownMarketplaces,
  cacheOnly: cacheOnly,
  preview: preview,
  storageV5: storageV5,
  credentials: credentials,
  errors: errors,
  warnings: warnings,
}) {
  let Se = mO(enabledValue);
  if (!ZJn()) {
    if (Se)
      errors.push({
        type: "generic-error",
        source: pluginId,
        plugin: packageName,
        error: NPM_DIRECT_INSTALL_DISABLED_MESSAGE,
      });
    return null;
  }
  let ke = getMarketplaceCandidatePaths(pluginId, knownMarketplaces, tryUnwrapTextPayload()),
    we = await pickUsableInstallation(installations, { storageV5: storageV5, trustedRoots: ke }),
    Ee = we === void 0 ? void 0 : { ...we, installPath: resolve_5(getOriginalCwd(), we.installPath) };
  if (Ee === void 0) {
    if (Se)
      errors.push({
        type: "plugin-not-installed",
        source: pluginId,
        plugin: packageName,
        ...(registryReadFailed && { registryReadFailed: !0 }),
      });
    return null;
  }
  if (we !== void 0 && classifyMarketplacePath(we.installPath, { trustedRoots: ke }).suspect) {
    if (Se)
      errors.push({
        type: "generic-error",
        refused: !0,
        source: pluginId,
        plugin: packageName,
        error: `Not loading ${printableName(pluginId, 200)}: its recorded install path ${UNSAFE_PATH_EXPLANATION}; ${runCommandHint("plugin uninstall", pluginId, { tail: "and install it again to re-record it", fallback: "uninstall and install it again to re-record it" })}.`,
      });
    return null;
  }
  let Ae =
    Ee.npmResolved !== void 0
      ? npmResolutionPolicyRefusal({ packageName: packageName, tarballUrl: Ee.npmResolved })
      : isMarketplaceRestrictionPolicyActive()
        ? `${printableName(pluginId, 200)} was not loaded: its install record does not say where it was fetched from, and your organization restricts plugin sources; ${runCommandHint("plugin uninstall", pluginId, { tail: "and install it again to re-record it", fallback: "uninstall and install it again to re-record it" })}`
        : null;
  if (Ae !== null) {
    if (Se)
      errors.push({ type: "generic-error", refused: !0, source: pluginId, plugin: packageName, error: Ae });
    return null;
  }
  let Ie = toNpmMarketplaceSource(packageName, Ee),
    Me = await (cacheOnly
      ? loadCachedMarketplacePlugin(
          Ie,
          NPM_REGISTRY,
          void 0,
          pluginId,
          enabledValue === !0,
          errors,
          warnings,
          Ee.installPath,
          installations?.find((We) => We.installPath)?.installPath,
          {
            storageV5: storageV5,
            preview: preview,
            entryEnabled: Se,
            registryReadFailed: registryReadFailed,
          },
        )
      : loadPluginFromMarketplaceEntry(
          Ie,
          NPM_REGISTRY,
          void 0,
          pluginId,
          enabledValue === !0,
          errors,
          warnings,
          Ee.version,
          void 0,
          {
            storageV5: storageV5,
            entryEnabled: Se,
            credentials: credentials,
            installRecord: registryReadFailed ? "unknown" : "present",
            recordedArchiveSha256: void 0,
            recordedClaudeAiPluginId: void 0,
            recordedNpmIntegrity: Ee.npmIntegrity,
          },
        ));
  if (Me && Ee.npmResolved !== void 0) {
    let We = redactNpmTarball({ packageName: packageName, tarballUrl: Ee.npmResolved });
    if (We !== null) Me.npmResolution = We;
  }
  return Me;
}
/**
 * 合并 --add-dir 目录与设置的 enabledPlugins，过滤出 ID 合法、非 builtin、非保留市场的条目。
 */
//@ chunk-e6aww6q8.js:4560222-4560423 placement
function getEnabledPluginEntries() {
  let e = { ...getAddDirEnabledPlugins(), ...(getSettings_DEPRECATED().enabledPlugins || {}) };
  return Object.entries(e).filter(([n, r]) => {
    if (!PluginIdSchema().safeParse(n).success || r === void 0) return !1;
    let { marketplace: marketplace } = parsePluginIdentifier(n);
    return marketplace !== BUILTIN && !isOfficialMarketplace(marketplace);
  });
}
/**
 * 是否有启用的市场插件条目（用于决定刷新策略）。
 */
//@ chunk-e6aww6q8.js:4560423-4560460 placement
function hasMarketplaceBackedPlugins() {
  return getEnabledPluginEntries().length > 0;
}
/**
 * 加载全部市场插件：读 known_marketplaces 与 enabledPlugins，套用 strictKnownMarketplaces/blockedMarketplaces 策略，对每个启用插件找安装记录与缓存（cacheOnly 时缓存缺失只报 plugin-cache-miss），调用 loadPluginFromMarketplaceEntry；收集 errors/warnings。
 */
//@ chunk-e6aww6q8.js:4560460-4573903 callgraph-witnessed = loadPluginsFromMarketplaces (0.141)
async function loadPluginsFromMarketplaces({
  cacheOnly: cacheOnly,
  preview: preview = !1,
  storageV5: storageV5,
  credentials: credentials,
}) {
  let now = Date.now(),
    y = [],
    S = [],
    w = [],
    L = getEnabledPluginEntries(),
    G = await loadKnownMarketplacesSafe(storageV5),
    q = isKnownMarketplacesReadFailure(G),
    Z = uF(G),
    Se = (yn) => pGn(G, yn),
    strictAllowlist = getStrictKnownMarketplaces(),
    blocklist = isMarketplaceRestrictionPolicyActive(),
    Ee = new Set(
      L.map(([yn]) => parsePluginIdentifier(yn).marketplace).filter((yn) => !!yn && yn.toLowerCase() !== NPM),
    ),
    Ae = q ? void 0 : validateDeclaredMarketplaceSource(Ee, G),
    Ie = new Set(Object.keys(Ae?.additions ?? {})),
    Me = new Map(Ae?.skipped),
    We = Ie.size === 0 ? G : { ...G, ...Ae?.additions },
    ze = new Map(),
    lt = new Set();
  await Promise.all(
    [...Ee].map(async (yn) => {
      let Kn = Object.hasOwn(We, yn) ? We[yn] : void 0,
        Xn = Ie.has(yn),
        fo = { registryEntry: Kn, registryEntryIsSaved: !Xn, unreadableCatalogs: lt },
        To = await getMarketplaceCacheOnly(yn, storageV5, fo);
      if (Xn && (To === null || To.name !== yn)) {
        let vn = We[yn],
          co = printableOrEmpty(vn?.installLocation ?? "");
        if (To === null)
          (Me.set(yn, `no marketplace manifest could be read at its declared location ${co}`),
            logMarketplaceNoticeOnce(
              `declared-unreadable:${yn}:${co}`,
              `Marketplace ${jsonStringify(yn)} is declared in settings, but no marketplace manifest could be read at ${co} (.claude-plugin/marketplace.json missing or invalid): left to the reconciler, its plugins do not load from the declaration`,
            ));
        else
          (Me.set(yn, `the marketplace at its declared location names itself ${jsonStringify(To.name)}`),
            logMarketplaceNoticeOnce(
              `catalog-name:${yn}:${To.name}`,
              `Marketplace ${jsonStringify(yn)} is declared in settings, but the marketplace at the declared path names itself ${jsonStringify(To.name)}: declare it under that name (its plugins are enabled as <plugin>@${To.name})`,
            ));
        (delete We[yn], Ie.delete(yn), lt.delete(yn), ze.set(yn, null));
        return;
      }
      let bo =
        Kn !== void 0 &&
        !Xn &&
        !X5(Kn.source) &&
        !isPluginDirectorySource(Kn.source) &&
        validateReservedMarketplaceEntry(yn, Kn) === null &&
        !Dse(yn, Kn);
      for (let vn of ARCHIVE_RETRY_DELAYS_MS) {
        if (To !== null || !bo) break;
        if ((await sleep(vn), (To = await getMarketplaceCacheOnly(yn, storageV5, fo)), To !== null))
          logForDebugging(
            `Marketplace ${yn}: catalog readable again after a re-read (another process was refreshing it)`,
          );
      }
      ze.set(yn, To);
    }),
  );
  let Je = [],
    uniqueMarketplaces = new Set(L.map(([yn]) => yn)),
    pt = new Map(),
    flattened = L.flatMap(([yn, Kn]) => {
      let { name: Xn, marketplace: marketplace } = parsePluginIdentifier(yn),
        To = marketplace ? ze.get(marketplace) : null,
        bo = marketplace ? We[marketplace] : void 0;
      if (!Xn || !marketplace || !To?.renames || Kn === !1 || isSourceDisallowedOrUnverifiable(bo?.source))
        return [[yn, Kn]];
      let vn = pt.get(marketplace);
      if (!vn) ((vn = new Set(To.plugins.map((plugin) => plugin.name))), pt.set(marketplace, vn));
      if (vn.has(Xn)) return [[yn, Kn]];
      let co = resolvePluginRename(Xn, To.renames, vn);
      if (co === null) return [[yn, Kn]];
      if (co.kind === "unresolved") {
        if (!preview) logPluginRenamed(Xn, marketplace, co);
        return (
          logForDebugging(
            `Plugin "${yn}" has a renames entry but it does not resolve (${co.reason}); falling through to plugin-not-found`,
            { level: "warn" },
          ),
          [[yn, Kn]]
        );
      }
      let So = co.kind === "renamed" ? `${co.to}@${marketplace}` : null;
      if (So !== null && !PluginIdSchema().safeParse(So).success) {
        if (!preview) logPluginRenamed(Xn, marketplace, { kind: "unresolved", reason: "target-missing" });
        return (
          logForDebugging(
            `Plugin "${yn}" rename target "${So}" is not a valid PluginIdSchema id; falling through to plugin-not-found`,
            { level: "warn" },
          ),
          [[yn, Kn]]
        );
      }
      if (!preview) logPluginRenamed(Xn, marketplace, co);
      if (
        (Je.push({ marketplace: marketplace, oldName: Xn, oldId: yn, newId: So, resolution: co }),
        w.push({
          type: "plugin-renamed",
          source: yn,
          plugin: Xn,
          marketplace: marketplace,
          renamedTo: co.kind === "renamed" ? co.to : null,
        }),
        So === null || uniqueMarketplaces.has(So))
      )
        return [];
      return (uniqueMarketplaces.add(So), [[So, Kn]]);
    });
  if (!preview && Je.length > 0)
    try {
      await removeInstallationsAndRefreshSnapshot(
        Je.flatMap((yn) => (yn.newId === null ? [] : [{ oldId: yn.oldId, newId: yn.newId }])),
        storageV5,
      );
    } catch (error) {
      logForDebugging(`renamePluginInstallations failed: ${toError(error).message}`, { level: "warn" });
    }
  if (!preview && isStorageV5Enabled() && storageV5 !== void 0) await primeInstalledPluginsCache(storageV5);
  let yt = preview
      ? isStorageV5Enabled() && storageV5 !== void 0
        ? await loadInstalledPlugins(storageV5)
        : loadInstalledPluginsSync()
      : getInstalledPluginsSnapshot(),
    gt = PF(yt),
    At = gt ? await readInstalledPluginsLenient(storageV5) : {},
    It = Xut(G),
    Yt = pluginDirectoryPolicyBlock(),
    qt = flattened.some(([yn]) => yn.endsWith(`@${OFFICIAL_MARKETPLACE_NAME}`)) ? await lpe() : new Map(),
    Zt = (yn) => {
      let Kn,
        marketplaceCatalogs = new Map();
      return (name) => {
        let To = marketplaceCatalogs.get(name);
        if (To === void 0) {
          Kn ??= toComparablePath(yn());
          let bo = toComparablePath(name);
          ((To = bo !== Kn && isPathWithin(Kn, bo, { alreadyComparable: !0 })),
            marketplaceCatalogs.set(name, To));
        }
        return To;
      };
    },
    rn = Zt(getResolvedMarketplacesCacheDir),
    pn = Zt(anchoredPluginCachePath),
    no = (yn) => pn(yn.extractedFrom ?? yn.path),
    results = await Promise.allSettled(
      flattened.map(async ([yn, Kn]) => {
        let { name: pluginName, marketplace: marketplaceName } = parsePluginIdentifier(yn);
        if (marketplaceName === NPM)
          return loadNpmMarketplacePlugin({
            pluginId: yn,
            packageName: pluginName,
            enabledValue: Kn,
            installations: yt.plugins[yn],
            registryReadFailed: gt,
            knownMarketplaces: We,
            cacheOnly: cacheOnly,
            preview: preview,
            storageV5: storageV5,
            credentials: credentials,
            errors: S,
            warnings: w,
          });
        let To = We[marketplaceName],
          bo = marketplaceName === OFFICIAL_MARKETPLACE_NAME && It ? void 0 : Z.get(marketplaceName),
          vn = bo === void 0 ? void 0 : Se(marketplaceName),
          co = q || bo !== void 0,
          So = () => ({
            type: "marketplace-not-found",
            source: yn,
            marketplace: marketplaceName,
            availableMarketplaces: Object.keys(We),
            ...(q && { registryReadFailed: !0 }),
            ...(bo !== void 0 && { registrationHidden: bo }),
            ...(vn !== void 0 && { registrationHiddenReason: vn }),
          }),
          ko =
            !To &&
            !co &&
            marketplaceName === OFFICIAL_MARKETPLACE_NAME &&
            isSourceAllowedByPolicy({ source: "pluginDirectory" });
        if (!To && blocklist && !ko) {
          if (co) {
            if (mO(Kn)) S.push(So());
            else logForDebugging(`Skipping load-failure error for disabled plugin ${yn}`);
            return null;
          }
          return (
            S.push({
              type: "marketplace-blocked-by-policy",
              source: yn,
              plugin: pluginName,
              marketplace: marketplaceName,
              blockedByBlocklist: strictAllowlist === null,
              allowedSources: (strictAllowlist ?? []).map((rs) => formatSourceForDisplay(rs)),
              sourceUnverifiable: !0,
            }),
            null
          );
        }
        if (To) {
          let rs = validateReservedMarketplaceEntry(marketplaceName, To);
          if (rs) {
            if (mO(Kn))
              S.push({
                type: "marketplace-load-failed",
                source: yn,
                marketplace: marketplaceName,
                reason: rs,
                untrustedReservedName: !0,
              });
            else logForDebugging(`Skipping reserved-name refusal error for disabled plugin ${yn}`);
            return null;
          }
        }
        if (To && !isSourceAllowedByPolicy(To.source)) {
          let isBlocked = isSourceInBlocklist(To.source),
            Es = getStrictKnownMarketplaces() || [];
          return (
            S.push({
              type: "marketplace-blocked-by-policy",
              source: yn,
              plugin: pluginName,
              marketplace: marketplaceName,
              blockedByBlocklist: isBlocked,
              allowedSources: isBlocked ? [] : Es.map((Nr) => formatSourceForDisplay(Nr)),
              ...(isPluginDirectorySource(To.source) && isPluginDirectoryDisabledByPolicy()
                ? { directoryDisabledByOrganization: !0 }
                : {}),
            }),
            null
          );
        }
        let result = null,
          marketplace = ze.get(marketplaceName);
        if (marketplace && To) {
          let entry = marketplace.plugins.find((plugin) => plugin.name === pluginName);
          if (entry) result = { entry: entry, marketplaceInstallLocation: To.installLocation };
        } else if (ko) result = await findPluginDirectoryEntry(pluginName, storageV5, "load");
        else result = await getPluginByIdCacheOnly(yn, storageV5);
        if (
          !result &&
          marketplaceName === OFFICIAL_MARKETPLACE_NAME &&
          (To || ko) &&
          (gt || !!yt.plugins[yn]?.length)
        )
          result = await findMissedListingEntry(pluginName, storageV5, ko || !marketplace);
        let $o = Qj(yt.plugins, yn);
        if (result && isUnboundOfficialPlugin(yn, $o, qt, gt)) {
          if (mO(Kn))
            S.push({
              type: "generic-error",
              source: yn,
              plugin: pluginName,
              error: `Not loading ${printableName(yn, 200)}: plugin-directory-bindings.json in the plugins folder could not be used (unreadable, a symbolic link or not a file, over 1 MB, damaged, or written by a newer Claude Code), so its ${OFFICIAL_MARKETPLACE_DISPLAY} listing could not be checked against the repository it was installed from. It loads again once the file can be used.`,
            });
          return null;
        }
        let yo =
            gt && marketplaceName === OFFICIAL_MARKETPLACE_NAME
              ? findBindingKeysFor(qt.keys(), yn).flatMap((rs) => {
                  let Es = qt.get(rs);
                  return Es === void 0 ? [] : [parseRepoWithRef(Es)];
                })
              : [],
          Ho = result ? samePluginSource(result.entry.source, void 0) : void 0,
          rr = yo.find((rs) => rs !== Ho) ?? yo[0];
        if (
          result &&
          ((rr !== void 0
            ? rr !== samePluginSource(result.entry.source, void 0)
            : isDirectoryRepositoryChanged(yn, $o, result.entry.source, qt)) ||
            (gt && isDirectoryRepositoryChanged(yn, Qj(At, yn), result.entry.source, qt)))
        ) {
          if (mO(Kn)) {
            let rs = rr ?? getBoundRepositoryKeys(yn, $o, qt)[0],
              sliced = (marketplace?.plugins ?? [])
                .filter((Nr) => Nr.name !== pluginName && samePluginSource(Nr.source, void 0) === rs)
                .map((Nr) => Nr.name)
                .slice(0, 3);
            S.push({
              type: "plugin-not-found",
              source: yn,
              pluginId: pluginName,
              marketplace: marketplaceName,
              removedFromDirectory: !0,
              directoryIdentityChanged: !0,
              ...(($o?.length ?? 0) === 0 && rr === void 0 && { directoryHeldWithoutRecord: !0 }),
              ...(sliced.length > 0 && { directoryRenamedTo: sliced }),
            });
          }
          return null;
        }
        if (!result) {
          let rs = gt || !!yt.plugins[yn]?.length,
            Es = To ? marketplace : ko && rs && mO(Kn) ? await ugn(pluginName, storageV5) : null;
          if (!mO(Kn)) logForDebugging(`Skipping load-failure error for disabled plugin ${yn}`);
          else if (!To && !Es)
            if (rs || co) {
              S.push(So());
              let Nr = Me.get(marketplaceName),
                Is = q
                  ? "unknown because known_marketplaces.json could not be read this load"
                  : bo !== void 0
                    ? `recorded in known_marketplaces.json but refused this load (${bo})`
                    : Nr !== void 0
                      ? `declared under extraKnownMarketplaces but not usable this load: ${Nr}`
                      : "not known here: neither recorded in known_marketplaces.json nor declared with a directory or file source under extraKnownMarketplaces in an enabled settings source";
              logMarketplaceNoticeOnce(
                `not-loaded:${yn}:${Is}`,
                `plugin ${jsonStringify(yn)} not loaded (hooks module, commands, skills, servers: none of it): its marketplace ${jsonStringify(marketplaceName)} is ${Is}; \`claude plugin marketplace add <path-or-repo>\` registers it`,
              );
            } else
              logForDebugging(`Skipping orphaned enabledPlugins entry ${yn}: marketplace not registered`);
          else if (!Es)
            S.push({
              type: "marketplace-load-failed",
              source: yn,
              marketplace: marketplaceName,
              reason: "cache-miss",
              ...(lt.has(marketplaceName) && { catalogReadFailed: !0 }),
              ...(lt.has(marketplaceName) &&
                LGn(lt, marketplaceName) &&
                isAsciiImpersonatingOfficialName(marketplaceName) && {
                  nameRefused: !0,
                  ...(We[marketplaceName]?.source.source === "settings" && {
                    nameRefusedDeclaredInSettings: !0,
                  }),
                }),
              ...(Yt !== null && marketplaceName === OFFICIAL_MARKETPLACE_NAME
                ? { directoryBlockedBy: Yt }
                : {}),
            });
          else if (rs) {
            let Nr = marketplaceName === OFFICIAL_MARKETPLACE_NAME,
              Is = Nr ? getBoundRepositoryKeys(yn, $o, qt)[0] : void 0,
              fs =
                Is !== void 0
                  ? Es.plugins
                      .filter(
                        (plugin) =>
                          plugin.name !== pluginName && samePluginSource(plugin.source, void 0) === Is,
                      )
                      .map((Vi) => Vi.name)
                      .slice(0, 3)
                  : [],
              as = Nr ? await pluginDirectoryNotInstallableReason(pluginName, storageV5) : void 0;
            S.push({
              type: "plugin-not-found",
              source: yn,
              pluginId: pluginName,
              marketplace: marketplaceName,
              ...(Nr
                ? {
                    removedFromDirectory: !0,
                    ...(gt && { registryReadFailed: !0 }),
                    ...(fs.length > 0 && { directoryRenamedTo: fs }),
                    ...(as !== void 0 && { directoryNotInstallableReason: as }),
                  }
                : {}),
            });
          } else logForDebugging(`Skipping orphaned enabledPlugins entry ${yn}: not in marketplace catalog`);
          return null;
        }
        let br = getMarketplaceCandidatePaths(yn, We, tryUnwrapTextPayload()),
          Hr = await pickUsableInstallation(yt.plugins[yn], { storageV5: storageV5, trustedRoots: br }),
          Fr = Hr === void 0 ? void 0 : { ...Hr, installPath: resolve_5(getOriginalCwd(), Hr.installPath) };
        if (typeof result.entry.source !== "string" && !Fr) {
          if (
            !SETTING_SOURCES.filter(isOperatorSettingSource).some(
              (Es) => getSettingsForSource(Es)?.enabledPlugins?.[yn] === !0,
            )
          ) {
            let Es = await calculatePluginVersion(
              yn,
              result.entry.source,
              void 0,
              void 0,
              { kind: "catalog", version: result.entry.version },
              "sha" in result.entry.source ? result.entry.source.sha : void 0,
            );
            if (!(await probeSeedForPlugin(yn, Es, "when-unknown"))) {
              let Is = mO(Kn) && (await lstatChildBigintOrUndefined(yn));
              return (
                S.push({
                  type: "plugin-not-installed",
                  source: yn,
                  plugin: result.entry.name,
                  ...(Is && { seedHasOtherVersion: !0 }),
                  ...(mO(Kn) && gt && { registryReadFailed: !0 }),
                }),
                null
              );
            }
          }
        }
        let cs =
            wpe(result.entry.source) !== void 0 ||
            (Fr !== void 0 && (Fr.sourceCommand !== void 0 || Fr.sourceProducerPath !== void 0)),
          _r = cs || Fr?.previousProducerPaths !== void 0;
        if (cs && areCommandPluginSourcesDisabledByPolicy()) {
          if ((noteHeldForTheAnswer(), mO(Kn)))
            S.push({
              type: "generic-error",
              orphan: !0,
              source: yn,
              plugin: result.entry.name,
              error: commandPluginSourcesDisabledMessage(),
            });
          return null;
        }
        if (Nee(result.entry.source) && Fr === void 0) {
          if (mO(Kn))
            S.push({
              type: "generic-error",
              orphan: !0,
              source: yn,
              plugin: result.entry.name,
              error: `Not loading ${printableName(yn, 200)}: it installs as a link farm but has no install record here; ${runCommandHint("plugin install", yn, { tail: "to record it", fallback: "install it explicitly to record it" })}.`,
            });
          return null;
        }
        let Cr =
            Hr?.installPath !== void 0
              ? classifyMarketplacePath(Hr.installPath, { trustedRoots: br })
              : void 0,
          installEntry = Cr?.absolute,
          Oo = Cr?.suspect ?? !1,
          jr =
            Fr !== void 0 &&
            (Fr.sourceCommand?.endsWith(vkn) === !0 ||
              (Fr.sourceCommand === void 0 &&
                (Fr.sourceProducerPath !== void 0 || Fr.previousProducerPaths !== void 0) &&
                Nee(result.entry.source)) ||
              Oo ||
              (_r &&
                installEntry !== void 0 &&
                (await isLiveLinkFarm(installEntry, { unclassifiableIsFarm: !0 }))));
        if (
          Fr !== void 0 &&
          jr &&
          (Oo ||
            Fr.sourceProducerPath === void 0 ||
            $j(Fr.sourceProducerPath) ||
            realpathAllowMissing_2(Fr.sourceProducerPath) ||
            isPathWithin(Fr.sourceProducerPath, getOriginalCwd(), { foldCase: !0 }) ||
            (installEntry !== void 0 && (await hasEntriesOutsideTarget(installEntry, Fr.sourceProducerPath))))
        ) {
          if (mO(Kn))
            S.push({
              type: "generic-error",
              orphan: !0,
              source: yn,
              plugin: result.entry.name,
              error: Oo
                ? `Not loading ${printableName(yn, 200)}: its recorded install path ${UNSAFE_PATH_EXPLANATION}; ${wpe(result.entry.source) !== void 0 ? runCommandHint("plugin update", yn, { tail: "to re-install it", fallback: "re-install it with an explicit plugin update" }) : runCommandHint("plugin uninstall", yn, { tail: "and install it again to re-record it", fallback: "uninstall and install it again to re-record it" })}.`
                : `Not loading ${printableName(yn, 200)} here: it is served in place from ${printableName(Fr.sourceProducerPath ?? "(unrecorded)", 200)}, which contains the working directory, is a network location, could not be resolved, or no longer matches its cached links \u2014 its content cannot be protected from sandboxed commands; ${runCommandHint("plugin update", yn, { tail: "elsewhere to re-resolve it", fallback: "re-resolve it with an explicit plugin update elsewhere" })}.`,
            });
          return null;
        }
        let Or = Fr !== void 0 ? Fr.sourceCommand?.endsWith(vkn) === !0 : Nee(result.entry.source),
          Io = jr ? Fr?.sourceProducerPath : void 0;
        if (Fr?.claudeaiPluginId !== void 0) {
          let source = result.entry.source;
          if (
            typeof source !== "object" ||
            source.source !== "claudeai" ||
            source.pluginId !== Fr.claudeaiPluginId
          ) {
            if (mO(Kn))
              S.push({
                type: "generic-error",
                refused: !0,
                source: yn,
                plugin: result.entry.name,
                error: `Not loading ${printableName(yn, 200)}: it was installed from a claude.ai-hosted marketplace, but that marketplace name now lists ${typeof source === "object" && source.source === "claudeai" ? "a different claude.ai plugin" : "another source"} under this name; ${runCommandHint("plugin uninstall", yn, { tail: "and install it again to switch, or remove it", fallback: "uninstall and reinstall it to switch, or remove it" })}`,
              });
            return null;
          }
        }
        let zo = await (cacheOnly
          ? loadCachedMarketplacePlugin(
              result.entry,
              result.marketplaceInstallLocation,
              To?.source,
              yn,
              Kn === !0,
              S,
              w,
              Fr?.installPath,
              yt.plugins[yn]?.find((rs) => rs.installPath)?.installPath,
              {
                storageV5: storageV5,
                preview: preview,
                linkFarm: Or,
                linkFarmProducer: Io,
                entryEnabled: mO(Kn),
                registryReadFailed: gt,
                recordedClaudeAiPluginId: Fr?.claudeaiPluginId,
              },
            )
          : loadPluginFromMarketplaceEntry(
              result.entry,
              result.marketplaceInstallLocation,
              To?.source,
              yn,
              Kn === !0,
              S,
              w,
              Fr?.version,
              findMatchingSourceCommand(wpe(result.entry.source), yt.plugins[yn]) ?? Fr?.sourceCommand,
              {
                storageV5: storageV5,
                linkFarm: Or,
                linkFarmProducer: Io,
                entryEnabled: mO(Kn),
                credentials: credentials,
                installRecord: gt ? "unknown" : Fr !== void 0 ? "present" : "absent",
                recordedArchiveSha256: Fr?.archiveSha256,
                recordedClaudeAiPluginId: Fr?.claudeaiPluginId,
                recordedGitCommitSha: Fr?.gitCommitSha,
              },
            ));
        if (zo && Fr?.resolvedVersion !== void 0) zo.resolvedVersion = Fr.resolvedVersion;
        if (
          zo &&
          !weakSet_7.has(zo) &&
          Fr?.gitCommitSha !== void 0 &&
          resolve_5(Fr.installPath) === resolve_5(zo.path)
        )
          zo.gitCommitSha = Fr.gitCommitSha;
        if (zo && Fr?.claudeaiPluginId !== void 0 && isServerPluginId(Fr.claudeaiPluginId))
          zo.serverPluginId = Fr.claudeaiPluginId;
        if (zo && L2e(result.entry.source, To?.source)) {
          zo.readFromFolderAt = now;
          let { folderReadAt: folderReadAt } = getPluginRegistry();
          if (!preview && !folderReadAt.has(zo.source)) folderReadAt.set(zo.source, now);
        }
        if (zo && To) {
          let err = redactMarketplaceSource(To.source);
          if (err !== null) {
            if (
              ((zo.marketplaceSource = err),
              isOfficialMarketplaceName_3(marketplaceName) &&
                isOfficialMarketplaceSourceVouched(err) &&
                rn(result.marketplaceInstallLocation) &&
                no(zo))
            )
              zo.officialMarketplaceSourceVouched = !0;
            if (
              await isWindowsPluginInsideLocalMarketplace(err, {
                entrySource: result.entry.source,
                marketplaceLocation: result.marketplaceInstallLocation,
                pluginPath: zo.path,
              })
            )
              zo.readInPlace = !0;
          }
        }
        return zo;
      }),
    );
  for (let [yn, Kn] of results.entries())
    if (Kn.status === "fulfilled" && Kn.value) y.push(Kn.value);
    else if (Kn.status === "rejected") {
      let Xn = toError(Kn.reason),
        [fo, To] = flattened[yn];
      if (
        (logForDebugging(`Failed to load plugin ${fo}: ${redactUrlsInMessage(Xn.message)}`, {
          level: "error",
        }),
        mO(To))
      )
        S.push(
          manifestErrorToPluginError(Xn, fo, firstLineOf(fo, "@")) ?? {
            type: "generic-error",
            source: fo,
            plugin: firstLineOf(fo, "@"),
            error: ypt(Xn),
          },
        );
    }
  if (!preview) await migrateRenamedPluginsInSettings(Je, storageV5);
  let ho = gt ? await getInstalledListRefusal(storageV5) : void 0;
  if (ho !== void 0)
    return { plugins: y, errors: annotateRegistryReadFailures(S, readInstalledPluginsFile(ho)), warnings: w };
  return { plugins: y, errors: S, warnings: w };
}
//@ chunk-e6aww6q8.js:4573903-4574093 layout
function annotateRegistryReadFailures(e, n) {
  return e.map((r) =>
    (r.type === "plugin-cache-miss" || r.type === "plugin-not-installed" || r.type === "plugin-not-found") &&
    r.registryReadFailed === !0
      ? { ...r, installedListHeldNote: n }
      : r,
  );
}
//@ chunk-e6aww6q8.js:4574093-4574427 layout
function commandSourceCacheMissError(e, n) {
  return {
    type: "generic-error",
    orphan: !0,
    source: e,
    plugin: n,
    error: `${stripInvisibleKeepEmoji(e)} is installed by running a command, and background command execution is currently switched off, so its missing cache was not rebuilt. Run \`${claudeCommand("plugin update", e) ?? "claude plugin update <plugin>@<marketplace>"}\` in a terminal to rebuild it.`,
  };
}
//@ chunk-e6aww6q8.js:4574427-4575334 layout
function checkClaudeAiPluginLoadable(e, n, r, s, h) {
  if (typeof r !== "object" || r.source !== "claudeai") return null;
  if (s === "unknown")
    return {
      type: "plugin-cache-miss",
      source: e,
      plugin: n,
      installPath: NOT_RECORDED,
      registryReadFailed: !0,
    };
  if (s === "present" && h === void 0)
    return {
      type: "generic-error",
      refused: !0,
      source: e,
      plugin: n,
      error: `Not loading ${printableName(e, 200)}: its install record no longer says which claude.ai plugin it came from, so it is not downloaded again; ${runCommandHint("plugin uninstall", e, { tail: "and install it again to re-pin it", fallback: "uninstall and reinstall it to re-pin it" })}`,
    };
  if (!r.installable)
    return {
      type: "generic-error",
      refused: !0,
      source: e,
      plugin: n,
      error: `Not loading ${printableName(e, 200)}: its files are missing and it can't be downloaded again in this session \u2014 claude.ai lists no installable version for it, or its marketplace's catalog isn't readable here (sign in to claude.ai with the organization it was added under, then restart)`,
    };
  return null;
}
//@ chunk-e6aww6q8.js:4575334-4575469 layout
function sessionPluginDirFor(e, n) {
  let replaced = n.replace(/[^a-zA-Z0-9@\-_]/g, "-"),
    digest = createHash_4("sha256").update(n).digest("hex");
  return join_9(e, `${replaced}-${digest.slice(0, 8)}`);
}
//@ chunk-e6aww6q8.js:4575469-4575749 layout
function planArchiveExtraction(e, n) {
  let r = relative_5(e, n);
  if (!r || r === ".." || r.startsWith(`..${sep_8}`) || isAbsolute_4(r))
    throw Error("Refusing to extract a plugin archive outside the session plugin cache");
  let str = randomBytes_2(4).toString("hex");
  return { extractDir: n, staging: `${n}.staging-${str}`, previousPrefix: `${n}.previous-${str}` };
}
//@ chunk-e6aww6q8.js:4575749-4575765 layout
var MIXED_ARCHIVE_HASH = "mixed";
//@ chunk-e6aww6q8.js:4575765-4576369 layout
async function extractSessionArchive(e, n) {
  let r = getZipExtractionState(),
    s = ++r.nextSeq,
    fileBytes = await getFsImplementation().readFileBytes(e),
    digest = createHash_4("sha256").update(fileBytes).digest("hex"),
    { extractDir: extractDir } = n;
  if (r.byDir.get(extractDir)?.archiveHash === digest && (await isDirectory(extractDir))) return;
  let w = r.inFlight.get(extractDir);
  if (w?.archiveHash === digest)
    try {
      await w.done;
      return;
    } catch {}
  let { promise: promise, resolve: resolve, reject: reject } = Promise.withResolvers();
  promise.catch(() => {});
  let Z = { archiveHash: digest, done: promise };
  r.inFlight.set(extractDir, Z);
  let Se = (ke) => {
    if (r.inFlight.get(extractDir) === Z) r.inFlight.delete(extractDir);
    if (ke === void 0) resolve();
    else reject(ke);
  };
  try {
    await extractZipToDirectory(fileBytes, n.staging);
  } catch (error) {
    throw (await removeTreeQuietly(n.staging), Se(error), error);
  }
  return { archive: fileBytes, archiveHash: digest, seq: s, settle: Se };
}
//@ chunk-e6aww6q8.js:4576369-4576379 layout
var MAX_PREVIEW_TREES = 2;
//@ chunk-e6aww6q8.js:4576379-4576672 layout
async function prunePreviewTrees(e, n, r, s) {
  let filtered = (e.previews.get(r) ?? []).filter((w) => w !== s);
  filtered.push(s);
  let splice = filtered.splice(0, Math.max(0, filtered.length - MAX_PREVIEW_TREES));
  e.previews.set(r, filtered);
  let mapped = splice.map((w) => {
    let L = removePreviewTree(n, w).finally(() => {
      if (e.pruning.get(w) === L) e.pruning.delete(w);
    });
    return (e.pruning.set(w, L), L);
  });
  await Promise.all(mapped);
}
//@ chunk-e6aww6q8.js:4576672-4576854 layout
async function removePreviewTree(e, n) {
  let { previousPrefix: previousPrefix } = planArchiveExtraction(e, n);
  try {
    await retryFsOp(n, previousPrefix);
  } catch (error) {
    if (!isENOENT(error))
      logForDebugging(`Could not move aside the preview tree ${n}: ${errorMessage(error)}`, {
        level: "warn",
      });
    return;
  }
  await removeTreeQuietly(previousPrefix);
}
//@ chunk-e6aww6q8.js:4576854-4577324 layout
async function statDirIdentity(e, n) {
  try {
    let { dev: dev, ino: ino, birthtimeMs: birthtimeMs } = await lstat_3(e);
    return { dev: dev, ino: ino, birthtimeMs: birthtimeMs };
  } catch (error) {
    if (isENOENT(error) || getErrnoCode(error) === "ENOTDIR")
      throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
        `Plugin directory ${e} was removed ${n === "before" ? "before it could be loaded" : "while it was being loaded"}`,
        "plugin extraction tree removed during load",
      );
    throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
      `Plugin directory ${e} could not be ${n === "before" ? "checked before" : "re-checked after"} loading: ${getErrnoCode(error) ?? errorMessage(error)}`,
      "plugin extraction tree check failed",
    );
  }
}
//@ chunk-e6aww6q8.js:4577324-4577560 layout
async function assertDirUnchanged(e, n) {
  let r = await statDirIdentity(e, "after");
  if (r.dev !== n.dev || r.ino !== n.ino || r.birthtimeMs !== n.birthtimeMs)
    throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
      `Plugin directory ${e} was replaced while it was being loaded`,
      "plugin extraction tree replaced during load",
    );
}
//@ chunk-e6aww6q8.js:4577560-4578063 layout
async function extractPreviewArchive(e, n, r) {
  let s = getZipExtractionState(),
    fileBytes = await getFsImplementation().readFileBytes(e),
    digest = createHash_4("sha256").update(fileBytes).digest("hex");
  if (s.byDir.get(r)?.archiveHash === digest && (await isDirectory(r))) return r;
  let S = `${r}.preview-${digest.slice(0, 32)}`,
    { staging: staging } = planArchiveExtraction(n, S),
    L = 0;
  for (;;) {
    if ((await s.pruning.get(S), await isDirectory(S))) {
      if (s.pruning.has(S)) continue;
      return (await prunePreviewTrees(s, n, r, S), S);
    }
    try {
      await extractZipToDirectory(fileBytes, staging);
    } catch (error) {
      throw (await removeTreeQuietly(staging), error);
    }
    try {
      await retryFsOp(staging, S);
    } catch (error) {
      let q = await isTargetOccupiedError_2(error, S);
      if ((await removeTreeQuietly(staging), !q || ++L >= MAX_EXTRACT_ATTEMPTS)) throw error;
      continue;
    }
    return (await prunePreviewTrees(s, n, r, S), S);
  }
}
//@ chunk-e6aww6q8.js:4578063-4578073 layout
var MAX_EXTRACT_ATTEMPTS = 3;
//@ chunk-e6aww6q8.js:4578073-4578149 layout
async function isDirectory(e) {
  try {
    return (await lstat_3(e)).isDirectory();
  } catch {
    return !1;
  }
}
//@ chunk-e6aww6q8.js:4578149-4578241 layout
function isWindowsLockError(e) {
  let n = getErrnoCode(e);
  return getPlatform() === "windows" && (n === "EPERM" || n === "EACCES" || n === "EBUSY");
}
//@ chunk-e6aww6q8.js:4578241-4578293 layout
async function isLockedButPresent(e, n) {
  return isWindowsLockError(e) && (await isDirectory(n));
}
//@ chunk-e6aww6q8.js:4578293-4578386 layout
async function isTargetOccupiedError_2(e, n) {
  let r = getErrnoCode(e);
  if (r === "ENOTEMPTY" || r === "EEXIST") return !0;
  return isLockedButPresent(e, n);
}
//@ chunk-e6aww6q8.js:4578386-4578504 layout
async function removeTreeQuietly(e) {
  await removeDirectoryTreeNoFollow(e).catch((n) => {
    logForDebugging(`Failed to remove the extraction tree ${e}: ${errorMessage(n)}`, { level: "warn" });
  });
}
//@ chunk-e6aww6q8.js:4578504-4578677 layout
async function moveIntoPlace(e, n, r) {
  try {
    await retryFsOp(n, r);
  } catch (error) {
    if (await isDirectory(r)) return !1;
    throw error;
  }
  let s = e.byDir.get(r);
  if (s !== void 0) e.byDir.set(r, { archiveHash: MIXED_ARCHIVE_HASH, seq: s.seq });
  return !0;
}
/**
 * 把暂存解压树原子替换到目标解压目录（旧树先移到 .previous-*，Windows 被占用时退化为原地解压）。
 */
//@ chunk-e6aww6q8.js:4578677-4579962 layout
async function swapInExtractedTree(
  { extractDir: extractDir, staging: staging, previousPrefix: previousPrefix },
  s,
) {
  let h = getZipExtractionState(),
    y = [];
  try {
    for (let S = 0; ; S++) {
      let w = h.byDir.get(extractDir);
      if (w !== void 0 && w.seq > s.seq) {
        (await removeTreeQuietly(staging), s.settle());
        return;
      }
      let L = `${previousPrefix}-${S}`,
        G = !1;
      try {
        (await retryFsOp(extractDir, L), y.push(L));
      } catch (error) {
        if (!isENOENT(error)) {
          if (!(await isLockedButPresent(error, extractDir))) throw error;
          G = !0;
        }
      }
      let q = h.byDir.get(extractDir);
      if (q !== void 0 && q.seq > s.seq) {
        if (y.at(-1) === L) (await moveIntoPlace(h, L, extractDir), y.pop());
        (await removeTreeQuietly(staging), s.settle());
        return;
      }
      if (!G)
        try {
          await retryFsOp(staging, extractDir);
          break;
        } catch (error) {
          if (await isTargetOccupiedError_2(error, extractDir)) {
            if (S + 1 >= MAX_EXTRACT_ATTEMPTS) throw error;
            continue;
          }
          if (!isWindowsLockError(error)) throw error;
          if (y.at(-1) === L) (await moveIntoPlace(h, L, extractDir), y.pop());
          let Se = h.byDir.get(extractDir);
          if (Se !== void 0 && Se.seq > s.seq) {
            (await removeTreeQuietly(staging), s.settle());
            return;
          }
          G = !0;
        }
      (logForDebugging(
        `Plugin extraction directory ${extractDir} or its staged copy is held open; extracting the archive in place, so files dropped from it are not cleared this time`,
        { level: "warn" },
      ),
        h.byDir.set(extractDir, { archiveHash: MIXED_ARCHIVE_HASH, seq: s.seq }),
        await extractZipToDirectory(s.archive, extractDir),
        await removeTreeQuietly(staging),
        s.settle());
      return;
    }
  } catch (error) {
    let w = y.pop();
    if (w !== void 0)
      try {
        if (!(await moveIntoPlace(h, w, extractDir)))
          logForDebugging(
            `A newer extraction of ${extractDir} is live; the one moved aside by a failed swap stays at ${w}`,
          );
      } catch (error) {
        logForDebugging(
          `The previous extraction of ${extractDir} could not be restored after a failed swap (${errorMessage(error)}); it was at ${w}`,
          { level: "error" },
        );
      }
    throw (await removeTreeQuietly(staging), s.settle(error), error);
  }
  (h.byDir.set(extractDir, { archiveHash: s.archiveHash, seq: s.seq }), s.settle());
}
/**
 * cacheOnly 模式加载市场插件：只用已有版本化缓存或种子缓存，缺失时报 plugin-cache-miss 并返回 null。
 */
//@ chunk-e6aww6q8.js:4579962-4582994 layout
async function loadCachedMarketplacePlugin(
  e,
  n,
  r,
  s,
  h,
  y,
  S,
  w,
  L,
  {
    storageV5: G,
    preview: q = !1,
    linkFarm: Z = !1,
    linkFarmProducer: Se,
    entryEnabled: ke = h,
    registryReadFailed: we = !1,
    recordedClaudeAiPluginId: Ee,
  } = {},
) {
  let Ae, Ie;
  if (typeof e.source === "string") {
    let lt = L2e(e.source, r);
    if (!lt && w) await materializeCachedLinks(w, G, Z);
    if (!lt && w && (w.endsWith(".zip") ? await pathExists(w) : await cacheDirHasPluginContentStrict(w, G)))
      Ae = w;
    else if (!lt) {
      let Je = null;
      if (getPluginSeedDirs().length > 0) {
        let nt = w
          ? basename_3(w).replace(/\.zip$/, "")
          : await calculatePluginVersion(s, e.source, void 0, void 0, {
              kind: "catalog",
              version: e.version,
            });
        Je = await probeSeedForPlugin(s, nt, "always");
      }
      if (Je) (logForDebugging(`Using seed cache for ${s} at ${Je} (cache-only)`), (Ae = Je));
      else {
        if (h) y.push({ type: "plugin-cache-miss", source: s, plugin: e.name, installPath: w ?? L ?? n });
        return null;
      }
    } else {
      let Je = seedDirFor(n) !== void 0 ? "system" : "workspace",
        nt = await resolveMarketplaceEntryPath(n, e.source, {
          marketplaceSource: r,
          corroboratingSource: Vut(s),
          storageV5: G,
          localMarketplaceSpace: Je,
        });
      if (nt.kind !== "ok") {
        if (ke)
          y.push({ type: "generic-error", source: s, error: entryResolutionError(nt, n, e.source).message });
        return null;
      }
      if (((Ae = nt.entryPath), (Ie = nt.marketplaceDir), !(await localMarketplacePathExists(G, Ae, Je)))) {
        if (ke)
          y.push({
            type: "generic-error",
            source: s,
            error: `Plugin directory not found at path: ${printableOrEmpty(Ae)}. Check that the marketplace entry has the correct path.`,
          });
        return null;
      }
    }
  } else {
    if (w) await materializeCachedLinks(w, G, Z);
    if (w && (w.endsWith(".zip") ? await pathExists(w) : await cacheDirHasPluginContentStrict(w, G))) Ae = w;
    else if (!w) {
      let any = SETTING_SOURCES.filter(isOperatorSettingSource).some(
          (pt) => getSettingsForSource(pt)?.enabledPlugins?.[s] === !0,
        ),
        Je = await calculatePluginVersion(
          s,
          e.source,
          void 0,
          void 0,
          { kind: "catalog", version: e.version },
          "sha" in e.source ? e.source.sha : void 0,
        ),
        nt;
      if (any) {
        let pt = getVersionedZipCachePath(s, Je),
          Et = getVersionedCachePath(s, Je);
        if ((await materializeCachedLinks(Et, G, Z), isPluginZipCacheEnabled() && (await pathExists(pt))))
          nt = pt;
        else if (await cacheDirHasPluginContentStrict(Et, G))
          (await removeCacheInUseMarker(Et, G), (nt = Et));
      }
      if (!nt) {
        if (((nt = (await probeSeedForPlugin(s, Je, "when-unknown")) ?? void 0), nt))
          logForDebugging(`Using seed cache for ${s} at ${nt} (cache-only)`);
      }
      if (nt) Ae = nt;
      else if (any) {
        if (ke) {
          let pt = checkClaudeAiPluginLoadable(s, e.name, e.source, we ? "unknown" : "absent", void 0);
          if (e.source.source === "command" && !HVt()) y.push(commandSourceCacheMissError(s, e.name));
          else if (pt !== null) y.push(pt);
          else {
            let Et = L === void 0 && (await lstatChildBigintOrUndefined(s));
            y.push({
              type: "plugin-cache-miss",
              source: s,
              plugin: e.name,
              installPath: L ?? NOT_RECORDED,
              ...(we && { registryReadFailed: !0 }),
              ...(Et && { seedHasOtherVersion: !0 }),
            });
          }
        }
        return null;
      } else {
        let pt = ke && (await lstatChildBigintOrUndefined(s));
        return (
          y.push({
            type: "plugin-not-installed",
            source: s,
            plugin: e.name,
            ...(pt && { seedHasOtherVersion: !0 }),
            ...(ke && we && { registryReadFailed: !0 }),
          }),
          null
        );
      }
    } else {
      if (h)
        if (e.source.source === "command" && !HVt()) y.push(commandSourceCacheMissError(s, e.name));
        else
          y.push(
            checkClaudeAiPluginLoadable(s, e.name, e.source, "present", Ee) ?? {
              type: "plugin-cache-miss",
              source: s,
              plugin: e.name,
              installPath: w,
            },
          );
      return null;
    }
  }
  let Me, We;
  if (isPluginZipCacheEnabled() && Ae.endsWith(".zip")) {
    let lt = await getSessionPluginCachePath(),
      Je = sessionPluginDirFor(lt, s),
      nt = planArchiveExtraction(lt, Je),
      pt;
    We = Ae;
    try {
      if (q) Ae = await extractPreviewArchive(Ae, lt, Je);
      else ((pt = await extractSessionArchive(Ae, nt)), (Ae = Je));
    } catch (error) {
      if ((logForDebugging(`Failed to extract plugin ZIP ${Ae}: ${error}`, { level: "error" }), ke))
        y.push({ type: "plugin-cache-miss", source: s, plugin: e.name, installPath: Ae });
      return null;
    }
    if (pt !== void 0) await swapInExtractedTree(nt, pt);
    if (((Ie = void 0), q)) Me = await statDirIdentity(Ae, "before");
  }
  let ze = await finishMarketplacePluginLoad(e, s, h, y, S, Ae, {
    storageV5: G,
    linkFarm: Z,
    linkFarmProducer: Se,
    entryEnabled: ke,
    containmentAnchorDir: Ie,
  });
  if (Me !== void 0 && ze !== null) await assertDirUnchanged(Ae, Me);
  if (We !== void 0 && ze !== null) ze.extractedFrom = We;
  return ze;
}
/**
 * 按 marketplace 条目加载一个插件：相对路径来源直接在市场目录里读；远程来源走安装记录/版本化缓存，必要时 cachePlugin + copyPluginToVersionedCache；校验钉住的 sha/integrity/archiveSha256；strict=false 时用条目合成 manifest；最后 createPluginFromPath 并合并条目里的组件声明。
 */
//@ chunk-e6aww6q8.js:4582994-4590867 fingerprint = loadPluginFromMarketplaceEntry (0.385)
async function loadPluginFromMarketplaceEntry(
  entry,
  marketplaceInstallLocation,
  pluginId,
  s,
  h,
  y,
  S,
  w,
  L,
  {
    storageV5: storageV5,
    linkFarm: linkFarm = !1,
    linkFarmProducer: linkFarmProducer,
    entryEnabled: entryEnabled = h,
    credentials: credentials,
    installRecord: installRecord,
    recordedArchiveSha256: recordedArchiveSha256,
    recordedClaudeAiPluginId: recordedClaudeAiPluginId,
    recordedNpmIntegrity: recordedNpmIntegrity,
    recordedGitCommitSha: recordedGitCommitSha,
  },
) {
  logForDebugging(
    `Loading plugin ${entry.name} from source: ${jsonStringify(redactPluginSourceForLog(entry.source))}`,
  );
  let We, ze, lt;
  if (typeof entry.source === "string") {
    let pt = pluginId !== void 0 && isLocalMarketplaceSource(pluginId),
      Et = seedDirFor(marketplaceInstallLocation) !== void 0 ? "system" : "workspace",
      yt = await resolveMarketplaceEntryPath(marketplaceInstallLocation, entry.source, {
        marketplaceSource: pluginId,
        corroboratingSource: Vut(s),
        storageV5: storageV5,
        localMarketplaceSpace: Et,
      });
    if (yt.kind === "location-error") throw yt.error;
    if (yt.kind !== "ok")
      return (
        y.push({
          type: "generic-error",
          source: s,
          error: entryResolutionError(yt, marketplaceInstallLocation, entry.source).message,
        }),
        null
      );
    let { marketplaceDir: marketplaceDir, entryPath: entryPath } = yt;
    if (!(pt ? await localMarketplacePathExists(storageV5, entryPath, Et) : await pathExists(entryPath))) {
      if ((logForDebugging(`Plugin path not found: ${entryPath}`, { level: "error" }), entryEnabled))
        y.push({
          type: "generic-error",
          source: s,
          error: `Plugin directory not found at path: ${printableOrEmpty(entryPath)}. Check that the marketplace entry has the correct path.`,
        });
      return null;
    }
    if (L2e(entry.source, pluginId)) ((We = entryPath), (ze = marketplaceDir));
    else
      try {
        let It;
        try {
          It = (await loadPluginManifest(entryPath, entry.name, entry.source)).manifest;
        } catch {}
        let Yt = await calculatePluginVersion(s, entry.source, It, marketplaceDir, {
            kind: "catalog",
            version: entry.version,
          }),
          sourcePluginPath = getVersionedCachePath(s, Yt),
          Zt = await dirHasRealEntries(sourcePluginPath),
          rn;
        if (!Zt) {
          let pn = await probePluginGitHead(marketplaceDir);
          rn = pn.repo
            ? (pn.sha ?? void 0)
            : mE(s) === CLAUDE_PLUGINS_OFFICIAL
              ? ((await Xj(marketplaceDir)) ?? void 0)
              : void 0;
        }
        if (
          ((We = await copyPluginToVersionedCache(entryPath, s, Yt, entry, marketplaceDir, {
            storageV5: storageV5,
            linkFarm: linkFarm,
            credentials: credentials,
          })),
          logForDebugging(`Copied plugin ${entry.name} to versioned cache: ${We}`),
          We === sourcePluginPath && !Zt)
        )
          lt = { sha: rn };
      } catch (error) {
        let errorMsg = errorMessage(error);
        if (strictCacheAddressable(storageV5)) {
          if (
            (logForDebugging(
              `Failed to copy plugin ${entry.name} to versioned cache: ${errorMsg}. Not loading it from the marketplace clone (strict plugin cache).`,
              { level: "error" },
            ),
            entryEnabled)
          )
            y.push({
              type: "generic-error",
              source: s,
              error: `Plugin ${printableName(entry.name, 200)} could not be copied into the plugin cache (${error instanceof TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS ? printableMessage(error, { isComposed: dpt }) : "see debug log"}); it is not loaded from the marketplace copy. Reinstalling the plugin retries the copy.`,
            });
          return null;
        }
        (logForDebugging(
          `Failed to copy plugin ${entry.name} to versioned cache: ${errorMsg}. Using marketplace path.`,
          { level: "warn" },
        ),
          (We = entryPath),
          (ze = marketplaceDir));
      }
  } else
    try {
      let version = await calculatePluginVersion(
          s,
          entry.source,
          void 0,
          void 0,
          w !== void 0 ? { kind: "installed", version: w } : { kind: "catalog", version: entry.version },
          "sha" in entry.source ? entry.source.sha : void 0,
        ),
        versionedPath = getVersionedCachePath(s, version);
      await materializeCachedLinks(versionedPath, storageV5, linkFarm);
      let zipPath = getVersionedZipCachePath(s, version);
      if (isPluginZipCacheEnabled() && (await pathExists(zipPath)))
        (logForDebugging(`Using versioned cached plugin ZIP ${entry.name} from ${zipPath}`), (We = zipPath));
      else if (await cacheDirHasPluginContentStrict(versionedPath, storageV5))
        (await removeCacheInUseMarker(versionedPath, storageV5),
          logForDebugging(`Using versioned cached plugin ${entry.name} from ${versionedPath}`),
          (We = versionedPath));
      else {
        let gt = await probeSeedForPlugin(s, version, "when-unknown");
        if (gt) ((We = gt), logForDebugging(`Using seed cache for external plugin ${entry.name} at ${gt}`));
        else {
          if (entry.source.source === "command" && !h)
            return (
              logForDebugging(
                `Not materializing disabled command-sourced plugin ${s}: its command is not run while it is disabled`,
              ),
              null
            );
          if (entry.source.source === "command" && !HVt())
            return (
              logForDebugging(
                `Plugin ${s}: command-source execution is switched off; not materializing the missing cache dir`,
                { level: "warn" },
              ),
              y.push(commandSourceCacheMissError(s, entry.name)),
              null
            );
          let At = checkClaudeAiPluginLoadable(
            s,
            entry.name,
            entry.source,
            installRecord,
            recordedClaudeAiPluginId,
          );
          if (At !== null) {
            if (entryEnabled) y.push(At);
            return null;
          }
          if (isNpmPluginId(s) && recordedNpmIntegrity === void 0) {
            if (entryEnabled)
              y.push({
                type: "generic-error",
                refused: !0,
                source: s,
                plugin: entry.name,
                error: `${printableName(s, 200)} was not re-downloaded: its install record carries no integrity to check the download against; ${runCommandHint("plugin uninstall", s, { tail: "and install it again to re-record it", fallback: "uninstall and install it again to re-record it" })}.`,
              });
            return null;
          }
          if (s.endsWith(`@${OFFICIAL_MARKETPLACE_NAME}`)) {
            if (installRecord === "unknown") {
              if (entryEnabled)
                y.push({
                  type: "plugin-cache-miss",
                  source: s,
                  plugin: entry.name,
                  installPath: NOT_RECORDED,
                  registryReadFailed: !0,
                });
              return null;
            }
            let Xn = pinnedSha(s, entry.source);
            if (Xn === void 0 || (installRecord === "present" && recordedGitCommitSha !== Xn)) {
              if (entryEnabled)
                y.push({
                  type: "generic-error",
                  refused: !0,
                  source: s,
                  plugin: entry.name,
                  error:
                    Xn === void 0
                      ? `Not loading ${printableName(s, 200)}: its files are missing and its ${OFFICIAL_MARKETPLACE_DISPLAY} listing has no listed commit, so it was not downloaded. Only a change to the listing can fix this.`
                      : recordedGitCommitSha === void 0
                        ? `Not loading ${printableName(s, 200)}: its files are missing and its install record has no commit, so it was not downloaded again; ${runCommandHint("plugin update", s, { tail: "to repair it", fallback: "update it to repair it" })}`
                        : `Not loading ${printableName(s, 200)}: its files are missing, and the ${OFFICIAL_MARKETPLACE_DISPLAY} now lists another commit than the one installed, so it was not downloaded again; ${runCommandHint("plugin update", s, { tail: "to move to the listed commit", fallback: "update it to move to the listed commit" })}`,
                });
              return null;
            }
          }
          let It = void 0;
          if (It !== void 0 && !It.ok) {
            if (entryEnabled)
              y.push({
                type: "generic-error",
                refused: !0,
                source: s,
                plugin: entry.name,
                error: It.message,
              });
            return null;
          }
          let safeParse = gitSha().safeParse(recordedGitCommitSha),
            qt =
              safeParse.success &&
              (entry.source.source === "github" ||
                entry.source.source === "url" ||
                entry.source.source === "git-subdir") &&
              entry.source.sha === void 0 &&
              w === (await calculatePluginVersion(s, entry.source, void 0, void 0, void 0, safeParse.data))
                ? { ...entry.source, sha: safeParse.data }
                : void 0,
            Zt =
              typeof entry.source === "object" && entry.source.source === "claudeai" && version !== "unknown"
                ? { ...entry.source, version: version }
                : entry.source,
            rn = {
              manifest: { name: entry.name },
              archiveAuth: await resolveArchiveDownloadHeaders({
                pluginSource: entry.source,
                pluginName: entry.name,
                marketplaceName: mE(s),
                marketplaceSource: pluginId,
                trustedMarketplaceAuth: findUrlMarketplaceHeaders(pluginId, mE(s)),
                trustedSettingsEntryAuth: findSettingsArchiveEntry(mE(s), entry.name),
                entry: entry,
                runEntryHelper: !1,
              }),
              entryDeclaresComponents: entryDeclaresComponents(entry),
              declaredComponentPaths: entryDeclaredComponentPaths(entry),
              isDirectoryPlugin: YX(s),
              directoryPin: pinnedSha(s, Zt) ?? null,
              commandSourceConsent:
                w === void 0 && L === void 0
                  ? { kind: "none", pluginId: s }
                  : { kind: "recorded", command: L, pluginId: s },
              storageV5: storageV5,
              credentials: credentials,
              isNpmMarketplaceLane: isNpmPluginId(s),
              expectedNpmIntegrity: recordedNpmIntegrity,
            },
            no =
              (qt === void 0
                ? void 0
                : await cachePlugin(qt, rn).then(
                    async (Xn) => {
                      let fo = join_9(Xn.path, ".gitmodules");
                      if ((await pathPresence(fo)) === "gone") return Xn;
                      (await removeDirectoryTreeNoFollow(Xn.path).catch(() => {}),
                        logForDebugging(
                          `${s} has a .gitmodules file, and a fetch at its installed commit ${qt.sha.substring(0, 12)} brings no submodules; fetching its source as the marketplace lists it instead. \`claude plugin update\` records the commit then in use`,
                          { level: "warn" },
                        ));
                      return;
                    },
                    (Xn) => {
                      logForDebugging(
                        `Could not fetch ${s} at its installed commit ${qt.sha.substring(0, 12)} (${redactUrlsInMessage(errorMessage(Xn))}); fetching its source as the marketplace lists it instead. \`claude plugin update\` records the commit then in use`,
                        { level: "warn" },
                      );
                      return;
                    },
                  )) ?? (await cachePlugin(Zt, rn));
          if (
            recordedArchiveSha256 !== void 0 &&
            typeof Zt === "object" &&
            Zt.source === "claudeai" &&
            Zt.version === w &&
            no.contentSha256 !== recordedArchiveSha256
          ) {
            if ((await removeDirectoryTreeNoFollow(no.path).catch(() => {}), entryEnabled))
              y.push({
                type: "generic-error",
                refused: !0,
                source: s,
                plugin: entry.name,
                error: `Not loading ${printableName(s, 200)}: the archive claude.ai served for version ${printableName(Zt.version, 64)} does not match the one recorded at install (digest differs); ${runCommandHint("plugin uninstall", s, { tail: "and install it again to accept new content", fallback: "uninstall and reinstall it to accept new content" })}`,
              });
            return null;
          }
          let hn =
            version !== "unknown" && !wpe(entry.source)
              ? version
              : await calculatePluginVersion(
                  s,
                  entry.source,
                  no.manifest,
                  no.path,
                  w !== void 0
                    ? { kind: "installed", version: w }
                    : { kind: "catalog", version: entry.version },
                  no.gitCommitSha,
                  no.contentSha256,
                );
          if (no.producerPath !== void 0) recordProducerDir(no.producerPath);
          let ho =
              no.gitCommitSha ??
              (getPluginCloneUrl(entry.source) !== null ? ((await Yse(no.path)) ?? void 0) : void 0),
            yn = getVersionedCachePath(s, hn),
            Kn = await dirHasRealEntries(yn);
          if (
            ((We = await copyPluginToVersionedCache(no.path, s, hn, entry, void 0, {
              storageV5: storageV5,
              linkFarm: linkFarm,
              credentials: credentials,
            })),
            We === yn && !Kn)
          )
            lt = { sha: ho };
          if (no.path !== We && !resolve_5(We).startsWith(resolve_5(no.path) + sep_8))
            await removeDirectoryTreeNoFollow(no.path).catch((Xn) => {
              logForDebugging(
                `Failed to remove the staging tree ${no.path} after publishing: ${errorMessage(Xn)}`,
                { level: "warn" },
              );
            });
        }
      }
    } catch (error) {
      let errorMsg = redactUrlsInMessage(errorMessage(error));
      if (
        (logForDebugging(`Failed to cache plugin ${entry.name}: ${errorMsg}`, { level: "error" }),
        entryEnabled)
      )
        y.push({
          type: "generic-error",
          source: s,
          error: `Failed to download/cache plugin ${printableName(entry.name, 200)}: ${ypt(error)}`,
        });
      return null;
    }
  let Je;
  if (isPluginZipCacheEnabled() && We.endsWith(".zip")) {
    let sessionDir = await getSessionPluginCachePath(),
      extractDir = sessionPluginDirFor(sessionDir, s),
      yt = planArchiveExtraction(sessionDir, extractDir),
      gt;
    Je = We;
    try {
      gt = await extractSessionArchive(We, yt);
    } catch (error) {
      throw (
        logForDebugging(`Failed to extract plugin ZIP ${We}, deleting corrupt file: ${error}`),
        await rm_3(We, { force: !0 }).catch(() => {}),
        error
      );
    }
    if (gt !== void 0) await swapInExtractedTree(yt, gt);
    (logForDebugging(`Extracted plugin ZIP to session dir: ${extractDir}`), (We = extractDir), (ze = void 0));
  }
  let nt = await finishMarketplacePluginLoad(entry, s, h, y, S, We, {
    storageV5: storageV5,
    linkFarm: linkFarm,
    linkFarmProducer: linkFarmProducer,
    entryEnabled: entryEnabled,
    containmentAnchorDir: ze,
  });
  if (nt && lt !== void 0) {
    if (lt.sha !== void 0) nt.gitCommitSha = lt.sha;
    weakSet_7.add(nt);
  }
  if (nt && Je !== void 0) nt.extractedFrom = Je;
  return nt;
}
/**
 * 市场插件定位到目录后的收尾：link/producer 目录检查、createPluginFromPath、合并 marketplace 条目中的组件声明（strict=false 时条目即 manifest）。
 */
//@ chunk-e6aww6q8.js:4590867-4593927 layout
async function finishMarketplacePluginLoad(
  e,
  n,
  r,
  s,
  h,
  y,
  { storageV5: S, linkFarm: w = !1, linkFarmProducer: L, entryEnabled: G = r, containmentAnchorDir: q } = {},
) {
  let Z = [];
  await materializeCachedLinks(y, S, w);
  let Se, ke;
  if (w || L !== void 0)
    ((Se =
      L !== void 0 && !ck(L)
        ? await resolveContainmentRoots([L, y], "plugin's producer directory")
        : await resolveContainmentRoots([y], "plugin directory")),
      (ke = Se));
  else if (q !== void 0)
    ((Se = await resolveContainmentRoots([q], "marketplace directory")),
      (ke = await resolveContainmentRoots([y, q], "plugin directory and its marketplace directory")));
  else ((Se = await resolveContainmentRoots([y], "plugin directory")), (ke = Se));
  let {
    plugin: plugin,
    errors: errors,
    warnings: warnings,
    hasManifest: hasManifest,
  } = await createPluginFromPath(y, n, r, e.name, e.strict ?? !0, S, Se, void 0, ke);
  if ((Z.push(...errors), typeof e.source === "object" && "sha" in e.source && e.source.sha))
    plugin.sha = e.source.sha;
  if (
    typeof e.source === "string" &&
    e.source.split(/[\\/]/).every((We) => We === "" || We === ".") &&
    e.skills !== void 0
  ) {
    let We = Array.isArray(e.skills) ? e.skills : [e.skills];
    if (We.length > 0) {
      let ze = [],
        lt = await validatePluginPaths(
          We,
          y,
          e.name,
          n,
          "skills",
          "Skill",
          "declared in marketplace entry but",
          ze,
          Se,
          !0,
          S,
        ),
        any = ze.some((nt) => nt.type === "path-traversal");
      if (lt.length === 0 && any) ((plugin.skillsPath = void 0), (plugin.skillsPaths = void 0));
      else if (lt.length > 0) {
        let nt = join_9(y, "skills"),
          pt = resolve_5(nt),
          Et = resolve_5(y),
          any = lt.some((At) => {
            let It = resolve_5(At);
            return It === pt || It === Et;
          });
        plugin.skillsPath = any ? plugin.skillsPath : void 0;
        let filtered = lt.filter((At) => {
          let It = resolve_5(At);
          return It !== pt && It !== Et;
        });
        plugin.skillsPaths = filtered.length > 0 ? filtered : void 0;
      }
    }
  }
  if (!hasManifest) {
    let We = validatePluginManifest(e, "marketplace-entry", { pluginName: e.name, manifestPath: n });
    if (We.ok) {
      plugin.manifest = We.manifest;
      for (let hookNote of We.hookNotes) logForDebugging(`Plugin ${e.name}: ${hookNote}`, { level: "warn" });
    } else {
      if (We.unloadableGuard) throw new HookValidationError(We.error);
      (logForDebugging(
        `marketplace entry ${e.name}: canonicalizeManifest rejected an entry that PluginMarketplaceEntrySchema accepted \u2014 falling back to legacy cast. ${We.error}`,
        { level: "warn" },
      ),
        (plugin.manifest = { ...e, id: void 0, source: void 0, strict: void 0 }));
    }
    ((plugin.name = plugin.manifest.name),
      await loadMarketplaceEntryComponents(
        { plugin: plugin, entry: e, pluginPath: y, pluginId: n, mode: "assign", errors: Z, anchor: Se },
        S,
      ));
  } else if (
    !e.strict &&
    hasManifest &&
    (e.commands ||
      e.agents ||
      e.skills ||
      e.hooks ||
      e.outputStyles ||
      e.themes ||
      e.experimental?.themes ||
      !1)
  ) {
    if (
      (logForDebugging(
        `Plugin ${e.name} has both plugin.json and marketplace manifest entries for commands/agents/skills/hooks/outputStyles/themes/syntaxHighlighting. This is a conflict.`,
        { level: "error" },
      ),
      G)
    )
      s.push({
        type: "generic-error",
        source: n,
        error: `Plugin ${printableName(e.name, 200)} has conflicting manifests: both plugin.json and marketplace entry specify components. Set strict: true in marketplace entry or remove component specs from one location.`,
      });
    return null;
  } else if (hasManifest) {
    let manifest = plugin.manifest,
      ze = (lt) => cleanOptionalText(lt) !== void 0;
    if (ze(e.displayName)) manifest.displayName = e.displayName;
    if (ze(e.description)) manifest.description = e.description;
    if (e.author !== void 0 && ze(e.author.name)) manifest.author = { ...e.author };
    if (ze(e.homepage)) manifest.homepage = e.homepage;
    if (ze(e.repository)) manifest.repository = e.repository;
    if (ze(e.license)) manifest.license = e.license;
    if (e.keywords?.length) manifest.keywords = [...e.keywords];
    await loadMarketplaceEntryComponents(
      { plugin: plugin, entry: e, pluginPath: y, pluginId: n, mode: "append", errors: Z, anchor: Se },
      S,
    );
  }
  if (r) {
    (s.push(...Z), h.push(...warnings));
    let We = await checkDependencyGap(y, n, e.name, !w && L === void 0 && q === void 0);
    if (We !== void 0) h.push(We);
  }
  return plugin;
}
/**
 * 缓存副本缺依赖时生成 dependencies-refused/not-installed 错误。
 */
//@ chunk-e6aww6q8.js:4593927-4594243 layout
async function checkDependencyGap(e, n, r, s) {
  if (!s) return;
  try {
    let h = await cacheCopyDependencyGap(e);
    if (h === void 0) return;
    return h.kind === "refused"
      ? { type: "dependencies-refused", source: n, plugin: r, reason: h.reason }
      : { type: "dependencies-not-installed", source: n, plugin: r };
  } catch (error) {
    logForDebugging(`Could not check the dependencies of ${n}: ${errorMessage(error)}`, { level: "warn" });
    return;
  }
}
//@ chunk-e6aww6q8.js:4594243-4594401 placement
async function realPathInsideCache(e) {
  let [n, r] = await Promise.all([
    realpath_2(e).catch(() => {
      return;
    }),
    realpath_2(anchoredPluginCachePath()).catch(() => {
      return;
    }),
  ]);
  return n !== void 0 && r !== void 0 && hm(r, n, !1) ? n : void 0;
}
//@ chunk-e6aww6q8.js:4594401-4594637 placement
async function cacheCopyDependencyGap(e) {
  if (isPluginZipCacheEnabled() || isUsingCoworkPlugins()) return;
  let n = resolve_5(getOriginalCwd(), e),
    r = anchoredPluginCachePath();
  if (!hm(r, n, !1)) return;
  let s = await lstat_3(n).catch(() => {
    return;
  });
  if (s === void 0 || !s.isDirectory()) return;
  let h = await checkLockfileSupported(n);
  return h !== void 0 && (await realPathInsideCache(n)) !== void 0 ? h : void 0;
}
/**
 * 从市场条目加载插件组件（代理、技能、输出风格等）。
 */
//@ chunk-e6aww6q8.js:4594637-4596117 placement
async function loadMarketplaceEntryComponents(
  {
    plugin: plugin,
    entry: entry,
    pluginPath: pluginPath,
    pluginId: pluginId,
    mode: mode,
    errors: errors,
    anchor: anchor,
  },
  w,
) {
  if (entry.commands)
    await finishLoadingPluginFromPath(
      plugin,
      entry.commands,
      {
        pluginPath: pluginPath,
        pluginName: entry.name,
        errorSource: pluginId,
        mode: mode,
        origin: "marketplace-entry",
        resolvePath: resolveWithinDir,
        anchor: anchor,
        registerInlineContent: !1,
        errors: errors,
      },
      w,
    );
  if (entry.agents) {
    let G = Array.isArray(entry.agents) ? entry.agents : [entry.agents],
      q = await validatePluginPaths(
        G,
        pluginPath,
        entry.name,
        pluginId,
        "agents",
        "Agent",
        "from marketplace entry",
        errors,
        anchor,
        !1,
        w,
      );
    if (q.length > 0) plugin.agentsPaths = mode === "append" ? [...(plugin.agentsPaths || []), ...q] : q;
  }
  if (entry.skills) {
    let G = Array.isArray(entry.skills) ? entry.skills : [entry.skills],
      q = resolve_5(join_9(pluginPath, "skills")),
      filtered = (
        await validatePluginPaths(
          G,
          pluginPath,
          entry.name,
          pluginId,
          "skills",
          "Skill",
          "from marketplace entry",
          errors,
          anchor,
          !0,
          w,
        )
      ).filter((Se) => resolve_5(Se) !== q);
    if (mode === "append") {
      let Se = new Set((plugin.skillsPaths || []).map((we) => resolve_5(we))),
        filtered_2 = filtered.filter((we) => !Se.has(resolve_5(we)));
      if (filtered_2.length > 0) plugin.skillsPaths = [...(plugin.skillsPaths || []), ...filtered_2];
    } else if (filtered.length > 0) plugin.skillsPaths = filtered;
  }
  if (entry.outputStyles) {
    let G = Array.isArray(entry.outputStyles) ? entry.outputStyles : [entry.outputStyles],
      q = await validatePluginPaths(
        G,
        pluginPath,
        entry.name,
        pluginId,
        "output-styles",
        "Output style",
        "from marketplace entry",
        errors,
        anchor,
        !1,
        w,
      );
    if (q.length > 0)
      plugin.outputStylesPaths = mode === "append" ? [...(plugin.outputStylesPaths || []), ...q] : q;
  }
  let L = entry.experimental?.themes ?? entry.themes;
  if (L) {
    let G = Array.isArray(L) ? L : [L],
      q = await validatePluginPaths(
        G,
        pluginPath,
        entry.name,
        pluginId,
        "themes",
        "Theme",
        "from marketplace entry",
        errors,
        anchor,
        !1,
        w,
      );
    if (q.length > 0) plugin.themesPaths = mode === "append" ? [...(plugin.themesPaths || []), ...q] : q;
  }
  if (entry.hooks) {
    let { hooks: hooks, errors: errors_2 } = parseMarketplaceEntryHooks(
      entry.hooks,
      pluginId,
      entry.name,
      pluginPath,
    );
    if (hooks) plugin.hooksConfig = mode === "append" ? { ...(plugin.hooksConfig || {}), ...hooks } : hooks;
    errors.push(...errors_2);
  }
}
//@ chunk-e6aww6q8.js:4596117-4596782 placement
async function describePluginDirShape_2(e) {
  return (
    await Promise.all(
      e.map(async (r) => {
        if (r.kind !== "path" || isZipPathCaseInsensitive(r.value)) return [r];
        let s = resolve_5(r.value),
          h = await describePluginDirShape(s);
        if (h.kind === "plugin")
          logForDebugging(`--plugin-dir ${s} is one plugin: ${h.marker} at its top marks it`);
        if (h.kind !== "collection") return [r];
        return (
          logForDebugging(
            `--plugin-dir ${s} is a folder of plugins` +
              (h.isMarketplaceRoot
                ? ` (its ${MARKETPLACE_MANIFEST_PATH} lists plugins and is not read here; with no ${PLUGIN_MANIFEST_PATH} beside it the folder is not itself a plugin)`
                : " (nothing at its top marks it as one plugin)") +
              `: loading ${h.children.join(", ") || "none"}` +
              (h.skipped.length > 0 ? `; no manifest in ${h.skipped.join(", ")}` : ""),
          ),
          h.children.map((y) => ({ ...r, value: join_9(s, y) }))
        );
      }),
    )
  ).flat();
}
//@ chunk-e6aww6q8.js:4596782-4596796 placement
var Bws = 30000;
//@ chunk-e6aww6q8.js:4596796-4596830 placement
function VKn(e) {
  return dirHasAnyEntry(e, PLUGIN_ROOT_MARKERS);
}
//@ chunk-e6aww6q8.js:4596830-4596957 placement
var MANIFEST_COMPONENT_KEYS = [
    "commands",
    "agents",
    "skills",
    "hooks",
    "outputStyles",
    "themes",
    "mcpServers",
    "lspServers",
    "experimental",
  ],
  THEME_ONLY_KEYS = ["themes"];
//@ chunk-e6aww6q8.js:4596957-4597666 placement
function entryDeclaredComponentPaths(e) {
  if (!e || typeof e !== "object") return [];
  let n = e,
    mapped = MANIFEST_COMPONENT_KEYS.filter((S) => S !== "experimental").map((S) => n[S]),
    experimental = n.experimental;
  if (experimental && typeof experimental === "object" && !Array.isArray(experimental)) {
    let S = experimental;
    mapped.push(S.themes);
  }
  let h = [],
    y = !1;
  for (let S of mapped) {
    let w = Array.isArray(S)
      ? S
      : typeof S === "string"
        ? [S]
        : S && typeof S === "object"
          ? Object.values(S).map((L) => (L && typeof L === "object" && !Array.isArray(L) ? L.source : L))
          : [];
    for (let L of w) {
      if (typeof L !== "string" || L.length === 0) continue;
      if (/^[a-z][a-z\d+.-]*:\/\//i.test(L)) continue;
      let G = L.startsWith("./") ? L.slice(2) : L;
      if (G === "" || G === ".") continue;
      if (G.split(/[\\/]/).some((q) => /^[. ]+$/.test(q)) || !isSafeZipPath(G)) {
        y = !0;
        continue;
      }
      if ((h.push(G), h.length >= 32)) return h;
    }
  }
  if (h.length === 0 && y) return null;
  return h;
}
//@ chunk-e6aww6q8.js:4597666-4597787 placement
function entryDeclaresComponents(e) {
  if (!e || typeof e !== "object") return !1;
  let n = e;
  return MANIFEST_COMPONENT_KEYS.some((r) => (r === "experimental" ? isRecord(n[r]) : isNonEmptyValue(n[r])));
}
//@ chunk-e6aww6q8.js:4597787-4597967 placement
function isNonEmptyValue(e) {
  if (e === void 0 || e === null) return !1;
  if (Array.isArray(e)) return e.length > 0;
  if (typeof e === "string") return e.length > 0;
  return typeof e === "object" && Object.keys(e).length > 0;
}
//@ chunk-e6aww6q8.js:4597967-4598091 placement
function isRecord(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return !1;
  let n = value;
  if (THEME_ONLY_KEYS.some((r) => isNonEmptyValue(n[r]))) return !0;
  return !1;
}
//@ chunk-e6aww6q8.js:4598091-4598149 placement
var zws = /^[A-Za-z0-9_.$-]+(\/[A-Za-z0-9_.$-]+)*$/,
  qws = 120;
//@ chunk-e6aww6q8.js:4598149-4598229 placement
function Kws(e) {
  if (!e || e.length > qws || !zws.test(e)) return "";
  return ` (e.g. ${e})`;
}
//@ chunk-e6aww6q8.js:4598229-4598255 placement
var MANIFEST_IDENTITY_READ_RELPATHS = [PLUGIN_MANIFEST_PATH],
  Vws = [PLUGIN_MANIFEST_PATH, PLUGIN_JSON];
//@ chunk-e6aww6q8.js:4598255-4598333 placement
async function Yws(e) {
  for (let n of Vws) if (await pathExists(join_9(e, n))) return !0;
  return !1;
}
//@ chunk-e6aww6q8.js:4598333-4598464 placement
async function anyPathExistsUnder(e, n) {
  let r = resolve_5(e);
  for (let s of n) {
    let h = resolve_5(r, s);
    if (!h.startsWith(r + sep_8)) continue;
    if (await pathExists(h)) return !0;
  }
  return !1;
}
//@ chunk-e6aww6q8.js:4598464-4598643 placement
async function findSingleTopDir(e) {
  let filtered = (await readdir_2(e, { withFileTypes: !0 })).filter(
    (r) => r.name !== "__MACOSX" && r.name !== ".DS_Store",
  );
  return filtered.length === 1 && filtered[0].isDirectory() ? join_9(e, filtered[0].name) : void 0;
}
//@ chunk-e6aww6q8.js:4598643-4598714 placement
function QKn(e, n, r) {
  if (n && !r) return !1;
  return e.length === 0 || PLUGIN_NAME_FORBIDDEN_CHARS_RE.test(e);
}
//@ chunk-e6aww6q8.js:4598714-4598789 placement
function directoryPluginFallbackName(e, n) {
  let replaced = basename_3(e).replace(/\.zip$/i, "");
  return n === SYNCED ? DFe(replaced) : replaced;
}
//@ chunk-e6aww6q8.js:4598789-4598832 placement
function syncedPluginFolderId(e) {
  return `${directoryPluginFallbackName(e, SYNCED)}@${SYNCED}`;
}
//@ chunk-e6aww6q8.js:4598832-4599039 placement
async function syncedPluginMintedName(e, n) {
  let r = directoryPluginFallbackName(e, SYNCED);
  try {
    let { manifest: manifest, manifestPath: manifestPath } = await loadPluginManifest(
        e,
        r,
        `${r}@${SYNCED}`,
        [],
        { noTelemetry: !0 },
        n,
      ),
      y = manifestPath === null || basename_3(manifestPath) === "SKILL.md";
    return QKn(manifest.name, y, !0) ? void 0 : manifest.name;
  } catch {
    return;
  }
}
//@ chunk-e6aww6q8.js:4599039-4599129 placement
function JKn(e) {
  return e.unread === !0 ? {} : { attribution: { marketplaceName: e.marketplaceName } };
}
/**
 * 插件名非法时的 manifest-validation-error。
 */
//@ chunk-e6aww6q8.js:4599129-4599602 placement
function invalidPluginNameError(e, n, r, s, h, y) {
  let S = r === null || basename_3(r) === "SKILL.md";
  if (QKn(e.name, S, s))
    return {
      type: "manifest-validation-error",
      source: n,
      manifestPath: r ?? e.path,
      validationErrors: [
        `name: "${stripInvisibleKeepEmoji(e.name)}" is not a valid plugin name (must be non-empty and must not contain "@", ":", whitespace, path separators, or invisible/control characters)${S ? " \u2014 this plugin is named after its directory; rename the directory" : ""}`,
      ],
      ...(h !== void 0 && { path: h }),
      ...(y !== void 0 && JKn(y)),
    };
  return null;
}
/**
 * 记一次桌面技能目录保留命名空间检查结果。
 */
//@ chunk-e6aww6q8.js:4599602-4600076 placement
function logReservedNamespaceWrapperCheck(e) {
  if (e.length === 0 || !claimOnce().claim("skill_reserved_namespace_wrapper_check")) return;
  let n = e.length,
    r = {
      desktop_skills_folder_path: fromEnum(
        desktopSkillsPluginDir() === void 0
          ? "not_sent"
          : e.some((h) => h.isNamedFolder)
            ? "matched"
            : "not_matched",
      ),
    };
  if (e.some((h) => h.failedLeg === void 0)) {
    logFeatureOk("skill_reserved_namespace", { check: lit_2("desktop_wrapper_marked"), folders: n, ...r });
    return;
  }
  let s = e[0]?.failedLeg;
  if (s !== void 0)
    logFeatureSad("skill_reserved_namespace", "desktop_wrapper_unmarked", {
      failed_leg: fromEnum(s),
      folders: n,
      ...r,
    });
}
//@ chunk-e6aww6q8.js:4600076-4600286 placement
function dropUnprintableManifestVersion(e) {
  if (e.manifest.version !== void 0 && INVISIBLE_CHARS_RE.test(e.manifest.version))
    (logForDebugging(
      `Plugin ${e.name}: manifest version contains unprintable characters; treating as absent`,
      { level: "warn" },
    ),
      (e.manifest.version = void 0));
}
//@ chunk-e6aww6q8.js:4600286-4600471 placement
function isOperatorSettingSource(e) {
  switch (e) {
    case "userSettings":
    case "flagSettings":
    case "policySettings":
      return !0;
    case "localSettings":
      return !isLocalSettingsGitTracked({ onIndeterminate: "tracked" });
    case "projectSettings":
      return !1;
  }
}
/**
 * 插件在设置中被显式禁用（可只认操作者设置）。
 */
//@ chunk-e6aww6q8.js:4600471-4600772 placement
function isPluginDisabledBySettings(
  e,
  n,
  r,
  s,
  { repoAuthoredContent: h = !1, installationPreference: y } = {},
) {
  if (isRequiredPlugin(`${e}@${n}`, y)) return !1;
  let S = h ? F8() : void 0,
    w = (L) => {
      let G = findPluginSetting(L, r);
      if (G === void 0 || G.enabled) return !1;
      if (S === void 0) return !0;
      let q = S[G.index];
      return q !== void 0 && isOperatorSettingSource(q);
    };
  return w(`${e}@${n}`) || (s !== void 0 && w(`${s}@${n}`));
}
//@ chunk-e6aww6q8.js:4600772-4600925 placement
function isUnderOriginalCwd(e) {
  let n = getOriginalCwd();
  if (isPathWithin(n, e, { foldCase: !0 })) return !0;
  let r = (s) => resolve_5(s).normalize("NFC").toLowerCase();
  return isPathWithin(r(n), r(e), { alreadyComparable: !0 });
}
//@ chunk-e6aww6q8.js:4600925-4601068 placement = ghIsDangerousCallback (1)
function ghIsDangerousCallback(_rawCommand, args) {
  return (args ? replaceAll(_rawCommand, args, redactUrlQuery(args)) : _rawCommand)
    .split(/(\s+)/)
    .map((s) =>
      s.includes("://") && /["'`<>]/.test(s) && /[@?#]/.test(s) ? REDACTED_URL : redactUrlsInLoadError(s),
    )
    .join("");
}
/**
 * 错误文字中的 URL 脱敏（含凭证与查询串）。
 */
//@ chunk-e6aww6q8.js:4601068-4601393 placement
function redactUrlsInLoadError(e) {
  let replaced = e.replace(/[a-z][a-z0-9+.-]{0,31}:\/\/[^\s"']*/gi, (r, s) => {
    if (/[?#]/.test(r)) return redactUrlsTracked(r);
    let index = r.indexOf("@");
    if (index === -1) return r;
    let y = s === 0 || /[([]/.test(e[s - 1] ?? ""),
      sliced = r.slice(r.indexOf("//") + 2, index);
    return y && index === r.lastIndexOf("@") && !sliced.includes(":")
      ? redactUrlQuery(r)
      : redactUrlsTracked(r);
  });
  return redactUrlsInMessage(replaced).replace(/\?[^\s"']*/g, "");
}
/**
 * 加载会话级插件（--plugin-dir 目录、--plugin-url 归档、claude.ai 同步目录）：url 先下载解压到会话缓存；每个目录走 createPluginFromPath；市场名默认 inline（同步的为 synced）。
 */
//@ chunk-e6aww6q8.js:4601393-4607537 callgraph-witnessed = loadSessionOnlyPlugins (0.231)
async function loadSessionOnlyPlugins(
  specs,
  {
    marketplaceName: marketplaceName = INLINE_PLUGIN_MARKETPLACE,
    storageV5: storageV5,
    enabledPluginsIndexed: enabledPluginsIndexed,
    preview: preview = !1,
  },
) {
  if (specs.length === 0) return { plugins: [], errors: [], warnings: [] };
  let y,
    results = await Promise.all(
      specs.map(async (Z, Se) => {
        let ke = rri(),
          we = Z.kind === "url" ? {} : { unread: !0 },
          Ee,
          Ae,
          Ie;
        try {
          let Me, We;
          if (Z.kind === "url") {
            let At = await getSessionPluginCachePath(),
              It = new URL(Z.value),
              Yt = It.origin + It.pathname,
              qt = basename_3(It.pathname).replace(/\.zip$/i, "") || "download";
            Me = join_9(At, `url-${Se}-${qt.replace(/[^a-zA-Z0-9\-_]/g, "-")}.zip`);
            try {
              let Zt = await fetch(Z.value, {
                ...getProxyFetchOptions({ url: Z.value }),
                signal: AbortSignal.timeout(Bws),
              });
              if (!Zt.ok || !Zt.body) throw Error(`HTTP ${Zt.status} ${Zt.statusText} from ${Yt}`);
              let rn = Number(Zt.headers.get("content-length"));
              if (rn > Oxe) throw Error(`Plugin archive too large (${rn} bytes, max ${Oxe}) from ${Yt}`);
              let pn = 0,
                fromWeb = Readable.fromWeb(Zt.body);
              fromWeb.on("data", (ho) => {
                if (((pn += ho.byteLength), pn > Oxe))
                  fromWeb.destroy(Error(`Plugin archive exceeded ${Oxe} bytes from ${Yt}`));
              });
              let hn = `${Me}.${preview ? "preview-" : ""}${randomBytes_2(4).toString("hex")}.part`;
              if (((Ee = hn), await pipeline(fromWeb, createWriteStream(hn)), preview)) We = hn;
              else (await retryFsOp(hn, Me), (Ee = void 0));
              logForDebugging(`Downloaded inline plugin from ${Yt}`);
            } catch (error) {
              if (!(await pathExists(Me))) throw error;
              logForDebugging(`Re-fetch of inline plugin from ${Yt} failed; reusing cached ${Me}`, {
                level: "warn",
              });
            }
          } else {
            ((Me = resolve_5(Z.value)), dii());
            let At;
            try {
              await stat_2(Me);
            } catch (error) {
              At = getErrnoCode(error) ?? "UNKNOWN";
            }
            let It = At;
            if (At !== void 0 && Me.startsWith("/mnt/")) {
              await sleep(250);
              try {
                (await stat_2(Me),
                  logForDebugging(
                    `Plugin path ${Me}: first stat failed with ${At}, retry succeeded (transient mount race)`,
                    { level: "warn" },
                  ),
                  (At = void 0));
              } catch (error) {
                At = getErrnoCode(error) ?? "UNKNOWN";
              }
            }
            if (At === "ENOENT" && marketplaceName === SYNCED) {
              y ??= pNt().catch((rn) => (logError(rn), []));
              let Yt = Me,
                resolvedPath = DFe(basename_3(Yt)),
                found = (await y)
                  .map((rn) => resolve_5(rn))
                  .find(
                    (rn) =>
                      rn !== Yt &&
                      dirname_5(rn) === dirname_5(Yt) &&
                      DFe(basename_3(rn)) === resolvedPath &&
                      !specs.some((pn) => pn.kind === "path" && resolve_5(pn.value) === rn),
                  );
              if (found !== void 0) {
                markSyncedPluginDirsLoadedHere([found]);
                try {
                  (await stat_2(found),
                    logForDebugging(
                      `Synced plugin dir ${Yt} is gone; the sync manifest now places it at ${found}, loading that`,
                      { level: "warn" },
                    ),
                    (Me = found),
                    (At = void 0),
                    (Ie = found));
                } catch (error) {
                  logForDebugging(
                    `Synced plugin dir ${Yt} is gone and its manifest successor ${found} did not stat either (${getErrnoCode(error) ?? "UNKNOWN"})`,
                    { level: "warn" },
                  );
                }
              }
            }
            if (((we = await getPluginAttribution(Me)), At !== void 0)) {
              let Yt = At !== "ENOENT" ? At : It !== "ENOENT" ? It : void 0;
              logForDebugging(
                `Plugin path does not exist: ${Me} (${At}${Yt && Yt !== At ? `, first ${Yt}` : ""}), skipping`,
                { level: "warn" },
              );
              let qt = directoryPluginFallbackName(Me, marketplaceName);
              if (
                isPluginDisabledBySettings(qt, marketplaceName, enabledPluginsIndexed, void 0, {
                  repoAuthoredContent: isUnderOriginalCwd(Me),
                  installationPreference: we.installationPreference,
                })
              )
                return (
                  logForDebugging(`Skipping load-failure error for disabled plugin ${qt}@${marketplaceName}`),
                  { plugin: void 0, errors: [], warnings: [] }
                );
              return {
                plugin: void 0,
                errors: [
                  {
                    type: "path-not-found",
                    source: `${marketplaceName}[${Se}]`,
                    path: Me,
                    component: "commands",
                    ...(Yt && { errno: Yt }),
                  },
                ],
                warnings: [],
              };
            }
          }
          let dirName = isZipPathCaseInsensitive(Me),
            lt,
            Je = directoryPluginFallbackName(Me, marketplaceName);
          if (dirName) {
            let At = await getSessionPluginCachePath(),
              It = join_9(At, `inline-${Se}-${Je.replace(/[^a-zA-Z0-9\-_]/g, "-")}`),
              Yt = It,
              qt = We ?? Me;
            if (preview)
              ((Yt = await extractPreviewArchive(qt, At, It)),
                logForDebugging(`Previewing inline plugin zip from ${Yt}`));
            else {
              let Zt = planArchiveExtraction(At, It),
                rn = await extractSessionArchive(qt, Zt);
              if (rn !== void 0)
                (logForDebugging(`Extracted inline plugin zip; swapping it into ${It}`),
                  await swapInExtractedTree(Zt, rn));
              else logForDebugging(`Inline plugin zip unchanged; loading ${It}`);
            }
            if (((Me = await findPluginRootInExtracted(Yt)), Me !== Yt))
              logForDebugging(`Inline plugin zip had wrapper directory; using ${Me}`);
            if (preview) lt = await statDirIdentity(Me, "before");
          }
          let {
            plugin: plugin,
            errors: errors,
            warnings: warnings,
            manifestPath: manifestPath,
          } = await createPluginFromPath(Me, `${Je}@${marketplaceName}`, !0, Je, !0, storageV5);
          if (lt !== void 0) await assertDirUnchanged(Me, lt);
          let gt = invalidPluginNameError(
            plugin,
            `${marketplaceName}[${Se}]`,
            manifestPath,
            marketplaceName === SYNCED,
            Z.kind === "path" ? resolve_5(Z.value) : void 0,
            we,
          );
          if (gt) {
            if (
              isPluginDisabledBySettings(Je, marketplaceName, enabledPluginsIndexed, plugin.name, {
                repoAuthoredContent: Z.kind === "path" && isUnderOriginalCwd(resolve_5(Z.value)),
                installationPreference: we.installationPreference,
              })
            )
              return (
                logForDebugging(`Skipping load-failure error for disabled plugin ${Je}@${marketplaceName}`),
                { plugin: void 0, errors: errors, warnings: warnings }
              );
            return { plugin: void 0, errors: [gt, ...errors], warnings: warnings };
          }
          if (
            (dropUnprintableManifestVersion(plugin),
            (plugin.source = `${plugin.name}@${marketplaceName}`),
            (plugin.repository = `${plugin.name}@${marketplaceName}`),
            plugin.name === ANTHROPIC_SKILLS &&
              marketplaceName === INLINE_PLUGIN_MARKETPLACE &&
              isTopHostSession())
          ) {
            let At =
                Z.kind !== "path" ? "not_a_path" : isZipPathCaseInsensitive(Z.value) ? "archive" : void 0,
              It = desktopSkillsPluginDir(),
              Yt = At === void 0 && It !== void 0 && normalizeRegistryKey(It) === normalizeRegistryKey(Me);
            if (At === void 0) plugin.accountSkillsWrapper = !0;
            if (Yt) plugin.hostNamedSkillsFolder = !0;
            Ae = { failedLeg: At, isNamedFolder: Yt };
          }
          if (
            marketplaceName === SYNCED &&
            Z.kind === "path" &&
            Z.attestation !== void 0 &&
            Ie === void 0 &&
            plugin.name === Z.attestation.pluginName
          )
            plugin.officialAttestation = { marketplace: Z.attestation.marketplace };
          if (we.serverPluginId !== void 0) plugin.serverPluginId = we.serverPluginId;
          if (we.installationPreference !== void 0) plugin.installationPreference = we.installationPreference;
          if (we.marketplaceKind !== void 0 && marketplaceName === SYNCED)
            plugin.marketplaceKind = we.marketplaceKind;
          if (we.marketplaceName !== void 0)
            ((plugin.attributedMarketplaceName = we.marketplaceName),
              ori(plugin.name, marketplaceSuffix(plugin.repository), we.marketplaceName, ke));
          if (
            ((plugin.enabled = isPluginEnabled(
              plugin.source,
              enabledPluginsIndexed,
              plugin.manifest.defaultEnabled,
              we.installationPreference,
            )),
            Z.kind === "path" && Z.skipMcpDiscovery)
          )
            ((plugin.skipMcpDiscovery = !0), (plugin.mcpServers = {}));
          return (
            logForDebugging(`Loaded inline plugin from path: ${plugin.name}`),
            { plugin: plugin, errors: errors, warnings: warnings, wrapperCheck: Ae }
          );
        } catch (error) {
          let We = (pt) => ghIsDangerousCallback(pt, Z.kind === "url" ? Z.value : void 0),
            errorMsg = We(errorMessage(error));
          logForDebugging(
            `Failed to load session plugin from ${Z.kind === "url" ? We(Z.value) : Z.value}: ${errorMsg}`,
            { level: "warn" },
          );
          let lt, Je;
          if (Z.kind === "path")
            ((Je = Ie ?? resolve_5(Z.value)), (lt = directoryPluginFallbackName(Je, marketplaceName)));
          else
            try {
              let pt = new URL(Z.value),
                Et = basename_3(pt.pathname).replace(/\.zip$/i, "") || "download";
              lt = `url-${Se}-${Et.replace(/[^a-zA-Z0-9\-_]/g, "-")}`;
            } catch {}
          let nt =
            lt !== void 0 && Je !== void 0 && !isZipPathCaseInsensitive(Je)
              ? await loadPluginManifest(
                  Je,
                  lt,
                  `${lt}@${marketplaceName}`,
                  [],
                  { noTelemetry: !0 },
                  storageV5,
                )
                  .then(({ manifest: manifest }) => manifest.name)
                  .catch(() => {
                    return;
                  })
              : void 0;
          if (
            lt !== void 0 &&
            isPluginDisabledBySettings(lt, marketplaceName, enabledPluginsIndexed, nt, {
              repoAuthoredContent: Je !== void 0 && isUnderOriginalCwd(Je),
              installationPreference: we.installationPreference,
            })
          )
            return (
              logForDebugging(`Skipping load-failure error for disabled plugin ${lt}@${marketplaceName}`),
              { plugin: void 0, errors: [], warnings: [] }
            );
          return {
            plugin: void 0,
            errors: [
              {
                type: "generic-error",
                source: `${marketplaceName}[${Se}]`,
                error: `Failed to load plugin: ${ypt(error, We)}`,
                ...(Je !== void 0 && { path: Je }),
                ...(nt !== void 0 && { manifestName: nt }),
                ...JKn(we),
              },
            ],
            warnings: [],
          };
        } finally {
          if (Ee !== void 0) {
            let Me = Ee;
            await retryTransient(() => rm_3(Me, { force: !0 })).catch((We) => {
              logForDebugging(`Failed to remove the temporary download ${Me}: ${errorMessage(We)}`, {
                level: "warn",
              });
            });
          }
        }
      }),
    ),
    flattened = results.flatMap((Z) => (Z.plugin ? [Z.plugin] : [])),
    flattened_2 = results.flatMap((Z) => Z.errors),
    flattened_3 = results.flatMap((Z) => Z.warnings),
    flattened_4 = results.flatMap((Z) => (Z.wrapperCheck ? [Z.wrapperCheck] : []));
  if (flattened_4.length > 0) logReservedNamespaceWrapperCheck(flattened_4);
  if (flattened.length > 0) logForDebugging(`Loaded ${flattened.length} directory-loaded plugins`);
  return { plugins: flattened, errors: flattened_2, warnings: flattened_3 };
}
//@ chunk-e6aww6q8.js:4607537-4607820 placement = isRealPathWithinTeamDir (0.772)
async function listDirNamesSet(e, n) {
  let r = isStorageV5Enabled() && e !== void 0 ? thinkbackStorageKey(n) : null;
  if (e !== void 0 && r !== null) {
    let s = await listStorageScopeNames(e, r);
    if (s.error === void 0) return new Set(s.names.map(({ name: h }) => h));
    throw Error(formatStorageError(s.error));
  }
  try {
    return new Set(await readdir_2(n));
  } catch (error) {
    if (isENOENT(error) || getErrnoCode(error) === "ENOTDIR") return new Set();
    throw error;
  }
}
//@ chunk-e6aww6q8.js:4607820-4607906 placement
async function hasClaudePluginEntry(e, n, r) {
  if ((await listDirNamesSet(e, n)).has(".claude-plugin")) return !0;
  return !1;
}
//@ chunk-e6aww6q8.js:4607906-4611594 placement
async function loadSkillsAsPlugins(e, n = getEnabledPluginsBySource()) {
  let r = await loadSkillsAsPlugins_2(e),
    s = [],
    h = isPersonalConfigRestricted(),
    y = 0,
    filtered = r.filter((we) => {
      if (we.scope === "project" && !lEt()) return (s.push(we), !1);
      if (we.scope === "user" && h) return (y++, !1);
      return !0;
    });
  if (y > 0)
    logForDebugging(
      `[skill-as-plugin] not loading plugins from ${y} folder(s) in your own skills directory (CLAUDE_CODE_RESTRICT_PERSONAL_CONFIG); they load as skills only`,
    );
  let w = (we, Ee, Ae) =>
      isPluginDisabledBySettings(we, SKILLS_DIR, n, Ae, { repoAuthoredContent: Ee === "project" }),
    L = await pMap(
      filtered,
      async ({ dir: dir, scope: scope }) => {
        await new Promise((Ie) => setImmediate(Ie));
        let Ae = basename_3(dir);
        try {
          if (!(await hasClaudePluginEntry(e, dir, Ae).catch(() => !1))) return null;
          let {
            plugin: plugin,
            errors: errors,
            warnings: warnings,
            hasManifest: hasManifest,
            manifestPath: manifestPath,
          } = await createPluginFromPath(dir, `${Ae}@${SKILLS_DIR}`, !0, Ae, !1, e);
          if (!h1t(plugin, hasManifest))
            return errors.length || warnings.length
              ? { plugin: null, errors: errors, warnings: warnings }
              : null;
          let Je = invalidPluginNameError(plugin, `${Ae}@${SKILLS_DIR}`, manifestPath, !1);
          if (Je) {
            if (w(Ae, scope, plugin.name))
              return (
                logForDebugging(`Skipping load-failure error for disabled plugin ${Ae}@${SKILLS_DIR}`),
                errors.length || warnings.length ? { plugin: null, errors: errors, warnings: warnings } : null
              );
            return { plugin: null, errors: [Je, ...errors], warnings: warnings };
          }
          if (
            (dropUnprintableManifestVersion(plugin),
            (plugin.source = `${plugin.name}@${SKILLS_DIR}`),
            (plugin.repository = plugin.source),
            (plugin.scope = scope),
            scope === "project")
          ) {
            let mapped = (plugin.monitors ?? []).map((pt, Et) => pt.name ?? `#${Et + 1}`);
            if (mapped.length > 0)
              warnings.push({
                type: "project-scope-server-stripped",
                source: plugin.source,
                plugin: plugin.name,
                monitors: mapped,
                warning: `${plural(mapped.length, "monitor")} (${quotedPrintable(mapped.join(", "))}) from project-scope plugin "${quotedPrintable(plugin.name)}" ${plural(mapped.length, "was", "were")} not armed \u2014 project-supplied monitors have no per-item approval flow.`,
              });
            plugin.monitors = [];
          }
          return { plugin: plugin, errors: errors, warnings: warnings };
        } catch (error) {
          let Me = await loadPluginManifest(dir, Ae, `${Ae}@${SKILLS_DIR}`, [], { noTelemetry: !0 }, e)
            .then(({ manifest: manifest }) => manifest.name)
            .catch(() => {
              return;
            });
          if (w(Ae, scope, Me))
            return (
              logForDebugging(`Skipping load-failure error for disabled plugin ${Ae}@${SKILLS_DIR}`),
              null
            );
          return {
            plugin: null,
            errors: [
              manifestErrorToPluginError(error, `${Ae}@${SKILLS_DIR}`, void 0) ?? {
                type: "generic-error",
                source: `${Ae}@${SKILLS_DIR}`,
                error: `Failed to load skill folder as plugin: ${printableMessage(error)}`,
              },
            ],
            warnings: [],
          };
        }
      },
      { concurrency: 32 },
    ),
    G = [],
    q = [],
    Z = new Map();
  for (let we of L) {
    if (!we) continue;
    if (!we.plugin) {
      (G.push(...we.errors), q.push(...we.warnings));
      continue;
    }
    let Ee = Z.get(we.plugin.name);
    if (Ee) {
      let Ae = Ee.scope !== we.plugin.scope;
      G.push({
        type: "generic-error",
        orphan: !0,
        source: `${basename_3(we.plugin.path)}@${SKILLS_DIR}`,
        error: Ae
          ? `Not loaded \u2014 your ${printableOrEmpty(displaySkillsDirPath(Ee))} (same plugin name "${quotedPrintable(we.plugin.name)}") shadowed the project's ${printableOrEmpty(displaySkillsDirPath(we.plugin))}. To use the project's copy here, rename or move yours.`
          : `Not loaded \u2014 same plugin name "${quotedPrintable(we.plugin.name)}" as ${printableOrEmpty(displaySkillsDirPath(Ee))} (which loaded instead). Delete ${printableOrEmpty(displaySkillsDirPath(we.plugin))}, or give it a different "name" in its plugin.json.`,
      });
      continue;
    }
    (G.push(...we.errors), q.push(...we.warnings), Z.set(we.plugin.name, we.plugin));
  }
  let Se = [...Z.values()];
  for (let we of Se) we.enabled = isPluginEnabled(we.source, n, we.manifest.defaultEnabled, void 0);
  let filtered_2 = (
    await pMap(
      s,
      async (we) => {
        await new Promise((Ee) => setImmediate(Ee));
        try {
          return (await hasClaudePluginEntry(e, we.dir, basename_3(we.dir))) ? we : null;
        } catch {
          return we;
        }
      },
      { concurrency: 32 },
    )
  ).filter((we) => we !== null);
  if (filtered_2.length > 0) {
    let we = filtered_2.length;
    q.push({
      type: "project-scope-suppressed-untrusted",
      source: `(suppressed)@${SKILLS_DIR}`,
      count: we,
      warning: `${we} project-scope ${we === 1 ? "directory" : "directories"} under ./.claude/skills/ that may load as ${we === 1 ? "a plugin" : "plugins"} ${we === 1 ? "was" : "were"} skipped because this workspace was not trusted when plugins were scanned. After accepting the trust dialog, run /reload-plugins (or relaunch) to load what qualifies.`,
    });
  }
  if (
    (logEvent("tengu_plugin_skills_dir_loaded", {
      count: Se.length,
      user_count: count(Se, (we) => we.scope === "user"),
      project_count: count(Se, (we) => we.scope === "project"),
      project_suppressed_count: filtered_2.length,
      error_count: G.length,
    }),
    Se.length > 0)
  )
    logForDebugging(`Loaded ${Se.length} skills-as-plugins`);
  return { plugins: Se, errors: G, warnings: q };
}
//@ chunk-e6aww6q8.js:4611594-4611707 placement
function localCopyShadowingSynced(e, n) {
  let r = nfcLower(e);
  return n.find(
    (s) =>
      s.enabled !== !1 &&
      marketplaceSuffix(s.source) !== SYNCED &&
      pluginNameAliases(s).some((h) => nfcLower(h) === r),
  );
}
/**
 * 操作者设置中被禁用的 synced/inline 插件名。
 */
//@ chunk-e6aww6q8.js:4611707-4612189 layout
function collectDisabledInlineNames(e, n) {
  let filtered = e.filter((S, w) => {
      let L = n[w];
      return S !== void 0 && L !== void 0 && L !== "policySettings" && isOperatorSettingSource(L);
    }),
    filtered_2 = e.filter((S, w) => S !== void 0 && n[w] === "localSettings"),
    h = new Set();
  for (let S of [...filtered, ...filtered_2])
    for (let w of Object.keys(S?.record ?? {})) {
      let L = normalizePluginId(w),
        G = marketplaceSuffix(L);
      if (G === SYNCED || G === INLINE_PLUGIN_MARKETPLACE) h.add(L);
    }
  let y = new Set();
  for (let S of h) {
    let w = nfcLower(S.slice(0, S.lastIndexOf("@")));
    if (findPluginSetting(S, filtered)?.enabled === !1) {
      y.add(w);
      continue;
    }
    let L = nfcLower(S);
    if (filtered_2.some((G) => G?.byFold.get(L)?.enabled === !1)) y.add(w);
  }
  return y;
}
//@ chunk-e6aww6q8.js:4612189-4612370 layout
function countAdmittedPluginNames(e, n) {
  let r = new Map();
  for (let s of e)
    if (
      s.enabled !== !1 &&
      matchPolicyPluginEntry(n, s.name, s.attributedMarketplaceName).outcome === "admitted"
    ) {
      let h = nfcLower(s.name);
      r.set(h, (r.get(h) ?? 0) + 1);
    }
  return r;
}
/**
 * 合并各来源插件（session/marketplace/skills-dir/synced/builtin），同名时按 托管策略 > 会话 > 市场 的优先级去重，托管锁定（managed）条目可强制启用/禁用，记录冲突警告。
 */
//@ chunk-e6aww6q8.js:4612370-4617007 callgraph-fingerprint = mergePluginSources (0.184)
function mergePluginSources(sources) {
  let n = [],
    r = [],
    managedEntries = sources.managedEntries,
    h = sources.recordedDisableFolds ?? new Set();
  for (let Se of [sources.session, sources.synced ?? []])
    for (let ke of Se) {
      if (
        matchPolicyPluginEntry(managedEntries, ke.name, ke.attributedMarketplaceName).outcome !== "admitted"
      )
        continue;
      if (h.has(nfcLower(ke.name)) && !isRequiredPlugin(ke.source, ke.installationPreference))
        ((ke.enabled = !1), r.push({ type: "managed-plugin-disabled-by-settings", source: ke.source }));
      else if (ke.enabled === !1) ke.enabled = !0;
    }
  let y = countAdmittedPluginNames(sources.session, managedEntries),
    S = countAdmittedPluginNames(sources.synced ?? [], managedEntries),
    sessionPlugins = sources.session.filter((Se) => {
      let ke = matchPolicyPluginEntry(managedEntries, Se.name, Se.attributedMarketplaceName);
      if (ke.outcome === "locked") {
        let we =
          Se.attributedMarketplaceName !== void 0 ||
          Se.serverPluginId !== void 0 ||
          Se.installationPreference !== void 0;
        return (
          logForDebugging(
            `Plugin "${Se.name}" from ${we ? "a sync-attributed directory" : "--plugin-dir"} is blocked by managed settings`,
            { level: "warn" },
          ),
          n.push({
            type: "generic-error",
            orphan: !0,
            source: Se.source,
            plugin: Se.name,
            error: `${we ? "sync-attributed" : "--plugin-dir"} copy of "${quotedPrintable(Se.name)}" ignored: plugin is locked by managed settings`,
          }),
          !1
        );
      }
      if (ke.outcome === "admitted" && Se.enabled !== !1) {
        let we = nfcLower(Se.name);
        if ((y.get(we) ?? 0) > 1)
          return (
            n.push({
              type: "generic-error",
              orphan: !0,
              source: Se.source,
              plugin: Se.name,
              error: `sync-attributed copy of "${quotedPrintable(Se.name)}" ignored: multiple session copies claim the managed plugin's marketplace, so none is loaded`,
            }),
            !1
          );
        let Ee = nfcLower(Se.name),
          Ae =
            [...sources.marketplace, ...sources.builtin].find(
              (Ie) => Ie.enabled !== !1 && pluginNameAliases(Ie).some((Me) => nfcLower(Me) === Ee),
            ) ??
            sources.synced?.find(
              (Ie) =>
                Ie.enabled !== !1 &&
                nfcLower(Ie.name) === Ee &&
                matchPolicyPluginEntry(managedEntries, Ie.name, Ie.attributedMarketplaceName).outcome ===
                  "admitted",
            );
        if (Ae)
          return (
            logForDebugging(`Admitted session copy of managed plugin "${Se.name}" shadowed by ${Ae.source}`),
            r.push({
              type: "synced-plugin-shadowed",
              orphan: !0,
              source: Se.source,
              shadowedBy: stripInvisibleKeepEmoji(Ae.source),
            }),
            !1
          );
        if (((Se.admittedByManagedLock = !0), sources.managedHooksOnly))
          r.push({ type: "managed-hooks-restricted", source: Se.source });
      }
      return !0;
    }),
    sessionNames = new Set(sessionPlugins.filter((Se) => Se.enabled !== !1).map((Se) => Se.name)),
    marketplacePlugins = sources.marketplace.filter((Se) => {
      if (sessionNames.has(Se.name))
        return (logForDebugging(`Plugin "${Se.name}" from --plugin-dir overrides installed version`), !1);
      return !0;
    }),
    q = [];
  if (sources.skill?.length) {
    let Se = new Map();
    for (let ke of marketplacePlugins) Se.set(ke.name, `an installed plugin (${ke.source})`);
    for (let ke of sessionNames) Se.set(ke, "a session-only plugin (--plugin-dir / --plugin-url)");
    q = sources.skill.filter((ke) => {
      let we =
        matchPolicyPluginEntry(managedEntries, ke.name).outcome === "locked"
          ? "managed settings"
          : Se.get(ke.name);
      if (!we) return !0;
      return (
        n.push({
          type: "generic-error",
          orphan: !0,
          source: `${basename_3(ke.path)}@${SKILLS_DIR}`,
          error: `Not loaded \u2014 the name "${quotedPrintable(ke.name)}" is already taken by ${quotedPrintable(we)}, which takes precedence. Give the plugin at ${printableOrEmpty(displaySkillsDirPath(ke))} a different "name" (in plugin.json or SKILL.md frontmatter) to load this copy.`,
        }),
        !1
      );
    });
  }
  let Z = [];
  if (sources.synced?.length) {
    let Se = new Map();
    for (let we of [sessionPlugins, marketplacePlugins, q, sources.builtin])
      for (let Ee of we)
        for (let Ae of pluginNameAliases(Ee)) {
          let Ie = nfcLower(Ae);
          if (Ee.enabled !== !1 && !Se.has(Ie)) Se.set(Ie, Ee.source);
        }
    let ke = new Map();
    Z = sources.synced.filter((we) => {
      let Ee = matchPolicyPluginEntry(managedEntries, we.name, we.attributedMarketplaceName);
      if (Ee.outcome === "locked")
        return (
          n.push({
            type: "generic-error",
            orphan: !0,
            source: we.source,
            error: `claude.ai-synced copy of "${we.name}" ignored: plugin is locked by managed settings`,
          }),
          !1
        );
      if (Ee.outcome === "admitted" && we.enabled !== !1 && (S.get(nfcLower(we.name)) ?? 0) > 1)
        return (
          n.push({
            type: "generic-error",
            orphan: !0,
            source: we.source,
            error: `claude.ai-synced copy of "${quotedPrintable(we.name)}" ignored: multiple synced copies claim the managed plugin's marketplace, so none is loaded`,
          }),
          !1
        );
      let Ae = ke.get(nfcLower(we.name));
      if (Ae)
        return (
          n.push({
            type: "generic-error",
            orphan: !0,
            source: `${basename_3(we.path)}@${SYNCED}`,
            error:
              Ae.fate === "used"
                ? `Not loaded \u2014 the claude.ai-synced copy in ${basename_3(we.path)}/ declares the same plugin name "${we.name}" as ${basename_3(Ae.first.path)}/, which is used instead`
                : Ae.fate === "disabled"
                  ? `Not loaded \u2014 the claude.ai-synced copy in ${basename_3(we.path)}/ declares the same plugin name "${we.name}" as ${basename_3(Ae.first.path)}/, which is kept as a disabled row`
                  : `Not loaded \u2014 the claude.ai-synced copy in ${basename_3(we.path)}/ declares the same plugin name "${we.name}" as ${basename_3(Ae.first.path)}/ (the first claude.ai copy of that name); only one synced copy per name is considered`,
          }),
          !1
        );
      let Ie,
        Me = Se.get(nfcLower(we.name));
      if (Me === void 0 || we.enabled === !1) Ie = we.enabled === !1 ? "disabled" : "used";
      else
        (logForDebugging(`Synced plugin "${we.name}" shadowed by local copy ${Me}`),
          r.push({
            type: "synced-plugin-shadowed",
            orphan: !0,
            source: we.source,
            shadowedBy: stripInvisibleKeepEmoji(Me),
          }),
          (Ie = "dropped"));
      if (Ie === "used" && Ee.outcome === "admitted") {
        if (((we.admittedByManagedLock = !0), sources.managedHooksOnly))
          r.push({ type: "managed-hooks-restricted", source: we.source });
      }
      return (ke.set(nfcLower(we.name), { first: we, fate: Ie }), Ie !== "dropped");
    });
  }
  return {
    plugins: [...sessionPlugins, ...marketplacePlugins, ...q, ...Z, ...sources.builtin],
    errors: n,
    warnings: r,
  };
}
/**
 * 完整加载全部插件（允许网络获取缺失缓存），结果 Promise 缓存在全局状态 pluginLoad；完成后若设置未变也填充 cacheOnly 缓存。
 */
//@ chunk-e6aww6q8.js:4617007-4617584 placement
function loadAllPlugins(storageV5, credentials) {
  let r = getPluginRegistry();
  if (r.pluginLoad !== void 0)
    return (logJoinedLoadArmMismatch("loadAllPlugins", r.pluginLoadArm, storageV5), r.pluginLoad);
  let s = getLoadArm(storageV5),
    h = managedHooksPolicyStamp();
  r.pluginLoadArm = s;
  let y = async () => {
    let w = await assemblePluginLoadResult(
      () => loadPluginsFromMarketplaces({ cacheOnly: !1, storageV5: storageV5, credentials: credentials }),
      { storageV5: storageV5, readUnder: h },
    );
    if (
      r.pluginLoad === S ||
      (w.readUnder === managedHooksPolicyStamp() &&
        (!isStorageV5Enabled() || storageV5 === void 0) &&
        r.pluginLoadArm !== "v5" &&
        r.pluginLoadCacheOnlyArm !== "v5")
    ) {
      let resolved = Promise.resolve(w);
      (r.pluginLoadMarks.set(resolved, w.readUnder ?? T6),
        (r.pluginLoadCacheOnly = resolved),
        (r.pluginLoadCacheOnlyArm = s));
    }
    return w;
  };
  Khi();
  let S = trackPluginLoad(y());
  return (r.pluginLoadMarks.set(S, h), (r.pluginLoad = S), S);
}
//@ chunk-e6aww6q8.js:4617584-4617634 placement
function getLoadArm(e) {
  return isStorageV5Enabled() && e !== void 0 ? "v5" : "raw";
}
//@ chunk-e6aww6q8.js:4617634-4617837 placement
function logJoinedLoadArmMismatch(e, n, r) {
  if (isStorageV5Enabled() && r !== void 0 && n === "raw")
    logForDebugging(
      `${e}: joining a plugin load that an earlier caller started without the storage backend (tengu_hover_rest); this caller's backend is not used for it`,
    );
}
/**
 * 是否启用同步插件安装（storageV5 且 CLAUDE_CODE_SYNC_PLUGIN_INSTALL）。
 */
//@ chunk-e6aww6q8.js:4617837-4617913 placement
function shouldFillPluginLoadWithStore(e) {
  return isStorageV5Enabled() && e !== void 0 && !!env.CLAUDE_CODE_SYNC_PLUGIN_INSTALL;
}
/**
 * 只用本地缓存加载全部插件（不联网），结果缓存在全局 pluginLoadCacheOnly；设置 CLAUDE_CODE_SYNC_PLUGIN_INSTALL 时改为等待完整加载。启动与大多数读取插件列表的地方都调用它。
 */
//@ chunk-e6aww6q8.js:4617913-4618473 placement
function loadAllPluginsCacheOnly(storageV5, credentials) {
  let r = getPluginRegistry();
  if (r.pluginLoadCacheOnly !== void 0)
    return (
      logJoinedLoadArmMismatch("loadAllPluginsCacheOnly", r.pluginLoadCacheOnlyArm, storageV5),
      r.pluginLoadCacheOnly
    );
  r.pluginLoadCacheOnlyArm = getLoadArm(storageV5);
  let s = env.CLAUDE_CODE_SYNC_PLUGIN_INSTALL ? void 0 : managedHooksPolicyStamp();
  if (
    ((r.pluginLoadCacheOnly = trackPluginLoad(
      (async () => {
        if (env.CLAUDE_CODE_SYNC_PLUGIN_INSTALL) {
          let h = loadAllPlugins(storageV5, credentials);
          return ((r.pluginLoadCacheOnlyArm = r.pluginLoadArm), h);
        }
        return assemblePluginLoadResult(
          () => loadPluginsFromMarketplaces({ cacheOnly: !0, storageV5: storageV5, credentials: void 0 }),
          { storageV5: storageV5, readUnder: s },
        );
      })(),
    )),
    s !== void 0)
  )
    r.pluginLoadMarks.set(r.pluginLoadCacheOnly, s);
  return r.pluginLoadCacheOnly;
}
//@ chunk-e6aww6q8.js:4618473-4618570 placement
function trackPluginLoad(e) {
  let n = getPluginRegistry();
  return (
    n.pluginLoadsRunning++,
    e.finally(() => {
      n.pluginLoadsRunning--;
    })
  );
}
//@ chunk-e6aww6q8.js:4618570-4618631 fingerprint = loadAllPlugins (0.743)
var cacheOnlyLoadOptions = (e) => ({ cacheOnly: !0, storageV5: e, credentials: void 0 });
/**
 * 返回与当前插件相关设置一致的 cacheOnly 加载结果：缓存的 Promise 标记与当前设置指纹一致就复用，否则重新加载。
 */
//@ chunk-e6aww6q8.js:4618631-4618765 placement
function rereadPluginsCacheOnly(e) {
  let n = getPluginRegistry(),
    r = managedHooksPolicyStamp(),
    pluginLoadCacheOnly = n.pluginLoadCacheOnly;
  return (
    (r !== T6 && pluginLoadCacheOnly !== void 0 && n.pluginLoadMarks.get(pluginLoadCacheOnly) === r
      ? pluginLoadCacheOnly
      : void 0) ?? reloadCacheOnlyUnder(r, e)
  );
}
//@ chunk-e6aww6q8.js:4618765-4619057 placement
function reloadCacheOnlyUnder(e, n) {
  let r = getPluginRegistry(),
    pluginLoad = r.pluginLoad;
  if (!(e !== T6 && pluginLoad !== void 0 && r.pluginLoadMarks.get(pluginLoad) === e))
    ((r.pluginLoad = void 0), (r.pluginLoadArm = void 0));
  let y = trackPluginLoad(
    assemblePluginLoadResult(() => loadPluginsFromMarketplaces(cacheOnlyLoadOptions(n)), {
      storageV5: n,
      readUnder: e,
    }),
  );
  return (
    r.pluginLoadMarks.set(y, e),
    (r.pluginLoadCacheOnlyArm = getLoadArm(n)),
    (r.pluginLoadCacheOnly = y),
    y
  );
}
/**
 * 预览模式加载（cacheOnly + preview，不产生副作用、不写缓存），供 /plugin 界面等展示用。
 */
//@ chunk-e6aww6q8.js:4619057-4619182 placement
async function loadAllPluginsForPreview(e) {
  return assemblePluginLoadResult(
    () => loadPluginsFromMarketplaces({ cacheOnly: !0, preview: !0, storageV5: e, credentials: void 0 }),
    { preview: !0, storageV5: e },
  );
}
//@ chunk-e6aww6q8.js:4619182-4619195 placement
var BIN_STAT_TIMEOUT_MS = 2000;
/**
 * 收集已启用（非内置）插件的 bin/ 目录（stat 超时 2 秒，含 shell 元字符的路径丢弃），用于加进 Bash 工具的 PATH。
 */
//@ chunk-e6aww6q8.js:4619195-4619739 placement
async function getEnabledPluginBinPaths(e) {
  let { enabled: enabled } = await loadAllPluginsCacheOnly(e),
    filtered = enabled
      .filter((h) => !h.isBuiltin && h.path)
      .map((h) => join_9(h.path, "bin"))
      .filter((h) => {
        if (sep_8 !== "\\" && /[:"'$`\\\n\r]/.test(h))
          return (logForDebugging(`Dropping plugin bin path with shell metacharacters: ${h}`), !1);
        return !0;
      }),
    results = await Promise.all(
      filtered.map(async (h) => {
        try {
          return (
            await withTimeout_2(
              stat_2(h),
              BIN_STAT_TIMEOUT_MS,
              `stat timed out after ${BIN_STAT_TIMEOUT_MS}ms`,
            )
          ).isDirectory();
        } catch (error) {
          let S = getErrnoCode(error);
          if (S === "ENOENT" || S === "ENOTDIR") return !1;
          return (
            logForDebugging(
              `Keeping plugin bin path on PATH despite a failed stat (${S ?? errorMessage(error)}): ${h}`,
            ),
            !0
          );
        }
      }),
    );
  return filtered.filter((h, y) => results[y]);
}
//@ chunk-e6aww6q8.js:4619739-4620032 layout
async function listSyncedPluginDirs_2() {
  let e = { dirs: [], rows: [] };
  try {
    if (!brr() || !wie() || Sie()) return e;
    markSyncedPluginLaneOpened();
    let n = hasRegisteredSyncedPluginDirs() ? await getRegisteredSyncedDirs() : null,
      r =
        n === null
          ? await listSyncedPluginDirs()
          : n.flatMap((h) => {
              let y = getSyncedPluginRowId(h);
              return y === void 0 ? [] : [{ dir: h, pluginId: y }];
            }),
      s = n ?? r.map(({ dir: dir }) => dir);
    return (markSyncedPluginDirsLoadedHere(s), { dirs: s, rows: r });
  } catch (error) {
    return (logError(error), e);
  }
}
//@ chunk-e6aww6q8.js:4620032-4620293 layout
function describeSyncedPluginOutcomes(e) {
  try {
    let n = mapSyncedDirsToPluginIds(e.manifestRows),
      r = new Set(e.merged);
    return e.synced.map((s) => {
      let h = dirname_5(s.path),
        y = n.get(Jbn(h, s.path));
      return {
        bucket: basename_3(h),
        outcome: classifySyncedPluginOutcome(s, r, e),
        pluginName: s.name,
        folder: s.path,
        ...(y !== void 0 && { pluginId: y }),
      };
    });
  } catch (error) {
    return (logError(error), null);
  }
}
//@ chunk-e6aww6q8.js:4620293-4620853 layout
function classifySyncedPluginOutcome(e, n, r) {
  let s = matchPolicyPluginEntry(r.managedEntries, e.name, e.attributedMarketplaceName);
  if (s.outcome === "locked") return s.entry.enabled ? "not_loaded" : "held_back";
  if (!n.has(e) || r.demoted.has(e.source)) return "not_loaded";
  if (e.enabled) return "loaded";
  let mapped = r.enabledPluginsIndexed.map((w, L) => {
      let G = r.sourcesHighFirst[L];
      return w !== void 0 && G !== void 0 && isOperatorSettingSource(G) ? w : void 0;
    }),
    y = findPluginSetting(e.source, mapped);
  if (y !== void 0 && mapped[y.index]?.record[y.key] === !1) return "held_back";
  if (s.outcome !== "admitted") return "not_loaded";
  return collectDisabledInlineNames(mapped, r.sourcesHighFirst).has(nfcLower(e.name))
    ? "held_back"
    : "not_loaded";
}
//@ chunk-e6aww6q8.js:4620853-4621016 layout
function mapSyncedDirsToPluginIds(e) {
  let n = new Map(),
    r = new Set();
  for (let { dir: dir, pluginId: pluginId } of e) {
    let y = Jbn(dirname_5(dir), dir);
    if (r.has(y)) {
      n.delete(y);
      continue;
    }
    if ((r.add(y), isServerPluginId(pluginId))) n.set(y, pluginId);
  }
  return n;
}
//@ chunk-e6aww6q8.js:4621016-4621253 layout
function collectOfficialAttestations_2(e) {
  let n = new Map(),
    r = new Set();
  for (let s of e) {
    let h = s.officialAttestation?.marketplace;
    if (
      h === void 0 ||
      !ALLOWED_OFFICIAL_MARKETPLACE_NAMES.has(h) ||
      (n.has(s.source) && n.get(s.source) !== h)
    )
      r.add(s.source);
    else n.set(s.source, h);
  }
  for (let s of r) n.delete(s);
  return n;
}
/**
 * 插件加载总装：并行跑市场加载、会话插件（--plugin-dir/--plugin-url）、claude.ai 同步插件、skills-dir 插件，再合并内置插件，mergePluginSources 去重，verifyAndDemote 处理依赖不满足的降级，最后（非预览且设置未变时）执行副作用：缓存插件 settings、清理旧缓存等。返回 {enabled, disabled, errors, warnings}。
 */
//@ chunk-e6aww6q8.js:4621253-4624204 fingerprint = assemblePluginLoadResult (0.337)
async function assemblePluginLoadResult(loadMarketplacePlugins, options) {
  let r = options?.readUnder ?? managedHooksPolicyStamp(),
    inlinePlugins = getOriginalCwdOrNull(),
    builtinResult = areSideloadFlagsDisabledByPolicy();
  if (
    builtinResult &&
    (getInlinePlugins().length > 0 || getInlinePluginsNoMcp().length > 0 || getInlinePluginUrls().length > 0)
  )
    logForDebugging(
      `disableSideloadFlags: dropping @inline plugin specs at load time (parse-site gate should have caught this earlier): ${sideloadFlagsBlockedMessage(["--plugin-dir", "--plugin-url"])}`,
      { level: "warn" },
    );
  let y = builtinResult
      ? []
      : [
          ...getInlinePlugins().map((yt) => ({ kind: "path", value: yt })),
          ...getInlinePluginsNoMcp().map((yt) => ({ kind: "path", value: yt, skipMcpDiscovery: !0 })),
          ...getInlinePluginUrls().map((yt) => ({ kind: "url", value: yt })),
        ],
    S = getEnabledPluginsBySource(),
    w = checkHooksModulesFlag(),
    [L, G, q, Z] = await Promise.all([
      loadMarketplacePlugins(),
      describePluginDirShape_2(y).then((yt) =>
        loadSessionOnlyPlugins(yt, {
          storageV5: options?.storageV5,
          enabledPluginsIndexed: S,
          preview: options?.preview,
        }),
      ),
      listSyncedPluginDirs_2().then(async ({ dirs: dirs, rows: rows }) => ({
        ...(await loadSessionOnlyPlugins(
          dirs.map((At) => ({ kind: "path", value: At, attestation: getSyncedPluginAttestation(At) })),
          {
            marketplaceName: SYNCED,
            storageV5: options?.storageV5,
            enabledPluginsIndexed: S,
            preview: options?.preview,
          },
        )),
        manifestRows: rows,
      })),
      loadSkillsAsPlugins(options?.storageV5, S),
    ]);
  await w;
  let Se = getBuiltinPlugins(),
    ke = getPolicyEnabledPluginEntries(),
    we = F8(),
    Ee = collectDisabledInlineNames(S, we),
    {
      plugins: allPlugins,
      errors: mergeErrors,
      warnings: warnings,
    } = mergePluginSources({
      session: G.plugins,
      marketplace: L.plugins,
      skill: Z.plugins,
      synced: q.plugins,
      builtin: [...Se.enabled, ...Se.disabled],
      managedEntries: ke,
      managedHooksOnly: shouldAllowManagedHooksOnlyByPolicy(),
      recordedDisableFolds: Ee,
    }),
    We = collectSyncedSkillOverrides({
      merged: allPlugins,
      synced: q.plugins,
      pluginIdOf: () => {
        let yt = mapSyncedDirsToPluginIds(q.manifestRows);
        return (gt) => yt.get(Jbn(dirname_5(gt.path), gt.path));
      },
      enabledPluginsIndexed: S,
      sourcesHighFirst: we,
    }),
    ze = We === null ? { held: [], toWrite: [], following: [] } : await We;
  for (let yt of ze.held) yt.enabled = !1;
  for (let yt of ze.following) yt.followsSyncedSkillState = !0;
  let lt = [...L.errors, ...G.errors, ...q.errors, ...Z.errors, ...mergeErrors],
    Je = [...L.warnings, ...G.warnings, ...q.warnings, ...Z.warnings, ...warnings],
    { demoted: demoted, errors: depErrors } = verifyAndDemote(allPlugins);
  for (let yt of allPlugins) if (demoted.has(yt.source)) yt.enabled = !1;
  lt.push(...depErrors);
  let enabledPlugins = allPlugins.filter((yt) => yt.enabled);
  if (
    (logForDebugging(
      `Found ${allPlugins.length} plugins (${enabledPlugins.length} enabled, ${allPlugins.length - enabledPlugins.length} disabled)`,
    ),
    options?.preview)
  );
  else if (inlinePlugins !== getOriginalCwdOrNull())
    logForDebugging(
      "assemblePluginLoadResult: originalCwd changed mid-scan; skipping side-effects (stale early-kick)",
    );
  else if (r !== managedHooksPolicyStamp())
    return (
      logForDebugging(
        "assemblePluginLoadResult: plugin-affecting settings changed mid-scan; skipping side-effects, answering with a read under the settings in force",
      ),
      rereadPluginsCacheOnly(options?.storageV5)
    );
  else {
    (setAttestedOfficialPluginIds(collectOfficialAttestations_2(allPlugins)),
      setLastSyncedLaneLoad(
        describeSyncedPluginOutcomes({
          synced: q.plugins,
          merged: allPlugins,
          demoted: demoted,
          managedEntries: ke,
          enabledPluginsIndexed: S,
          sourcesHighFirst: we,
          manifestRows: q.manifestRows,
        }),
      ),
      persistSyncedPluginsOff(ze.toWrite, managedHooksPolicyStamp));
    let yt = new Set(enabledPlugins.map((gt) => gt.source));
    for (let gt of findUserDisabledOverrides())
      if (yt.has(gt.pluginId))
        Je.push({ type: "ineffective-disable", source: gt.pluginId, overriddenBy: gt.overriddenBy });
    if (
      (releaseUnusedPluginCaches(enabledPlugins, options?.storageV5),
      cachePluginSettings(enabledPlugins),
      lt.length > 0 && allPlugins.length === 0)
    ) {
      let gt = "generic-error",
        At = 0,
        It = new Map();
      for (let Yt of lt) {
        let qt = (It.get(Yt.type) ?? 0) + 1;
        if ((It.set(Yt.type, qt), qt > At || (qt === At && Yt.type < gt))) ((gt = Yt.type), (At = qt));
      }
      logFeatureBad("plugin_load_all", `plugin_load_total_failure_${gt.replaceAll("-", "_")}`, {
        error_count: lt.length,
      });
    } else if (lt.length > 0) logFeatureSad("plugin_load_all", "plugin_load_partial_failures");
    else logFeatureOk("plugin_load_all");
  }
  return {
    enabled: enabledPlugins,
    disabled: allPlugins.filter((yt) => !yt.enabled),
    errors: lt,
    warnings: Je,
    readUnder: r,
  };
}
//@ chunk-e6aww6q8.js:4624204-4624432 layout = getVersionedZipCachePath (1)
async function releaseUnusedPluginCaches(pluginId, version) {
  if (isDiskless()) return;
  let r = anchoredPluginCachePath(),
    s = Ob(),
    flattened = pluginId.flatMap((y) => {
      if (!y.path || y.path.endsWith(".zip")) return [];
      return hm(r, y.path, !1) || hm(s, y.path, !1) ? [y.path] : [];
    });
  (await Promise.all(flattened.map((y) => writeInUseMarker(y, version))),
    await sweepInUseMarkers(flattened, version));
}
/**
 * 清理不再被会话使用的插件解压目录。
 */
//@ chunk-e6aww6q8.js:4624432-4624502 placement
async function releaseSyncedDirsNotIn(e, n) {
  await releaseMarkersOutside(Ob(), new Set(e.map((r) => r.path)), n);
}
/**
 * 清空 loadAllPlugins/loadAllPluginsCacheOnly 的缓存 Promise（附原因日志），并清掉依赖插件列表的下游缓存；安装/卸载/刷新后调用。
 */
//@ chunk-e6aww6q8.js:4624502-4624736 placement = clearPluginCache (0.483)
function clearPluginCache(reason) {
  if (reason) logForDebugging(`clearPluginCache: invalidating loadAllPlugins cache (${reason})`);
  let n = getPluginRegistry();
  if (
    ((n.pluginLoad = void 0),
    (n.pluginLoadArm = void 0),
    (n.pluginLoadCacheOnly = void 0),
    (n.pluginLoadCacheOnlyArm = void 0),
    sri(),
    RIn() !== void 0)
  )
    or();
  sxi();
}
/**
 * 存储后端模式下预先发起一次 cacheOnly 加载以填充缓存；失败则清掉缓存。
 */
//@ chunk-e6aww6q8.js:4624736-4624946 placement
function refillPluginLoadCacheOnly(e, n) {
  if (
    !isStorageV5Enabled() ||
    e === void 0 ||
    env.CLAUDE_CODE_SYNC_PLUGIN_INSTALL ||
    getPluginRegistry().pluginLoadCacheOnly !== void 0
  )
    return;
  let r = loadAllPluginsCacheOnly(e);
  return (
    r.catch(() => {
      if (getPluginRegistry().pluginLoadCacheOnly === r) clearPluginCache(`${n}: re-fill failed`);
    }),
    r
  );
}
//@ chunk-e6aww6q8.js:4624946-4625173 fingerprint = mergePluginSettings (1)
function mergePluginSettings(plugins) {
  let merged;
  for (let plugin of plugins) {
    if (!plugin.settings) continue;
    if (!merged) merged = {};
    for (let [s, h] of Object.entries(plugin.settings)) {
      if (s in merged)
        logForDebugging(
          `Plugin "${plugin.name}" overrides setting "${s}" (previously set by another plugin)`,
        );
      merged[s] = h;
    }
  }
  return merged;
}
//@ chunk-e6aww6q8.js:4625173-4625422 fingerprint = cachePluginSettings (0.667)
function cachePluginSettings(plugins) {
  let settings = mergePluginSettings(plugins),
    r = Object.keys(RIn() ?? {}).length > 0;
  if ((oxi(settings), settings && Object.keys(settings).length > 0))
    (or(), logForDebugging(`Cached plugin settings with keys: ${Object.keys(settings).join(", ")}`));
  else if (r) (or(), logForDebugging("Dropped plugin settings: no enabled plugin supplies any"));
}
//@ chunk-e6aww6q8.js:4625422-4625529 sole-consumer
function findMatchingSourceCommand(e, n) {
  if (!e) return;
  let r = o1(e);
  return (n && filterInstallationsForCurrentProject(n).find((s) => s.sourceCommand === r))?.sourceCommand;
}
/**
 * 是否同步安装插件（传入值存在且 CLAUDE_CODE_SYNC_PLUGIN_INSTALL）。
 */
//@ chunk-3wek6r2k.js:15714-15773 fingerprint = loadAllPluginsCacheOnly (0.661)
function shouldSyncPluginInstall(e) {
  return e && env.CLAUDE_CODE_SYNC_PLUGIN_INSTALL;
}
/**
 * 递归复制目录（带缓存的目录创建）。
 */
//@ chunk-5aas12zq.js:24411-24816 fingerprint = copyDir (0.664)
async function copyDir_2(e) {
  let n = new Map(),
    t = async (r) => {
      let s = n.get(r);
      if (s !== void 0) return s;
      let o = await readdir(r, { withFileTypes: !0 }).catch(() => []);
      return (n.set(r, o), o);
    };
  for (let r of ae) {
    let parts = r.split("/"),
      o = parts.pop() ?? "",
      a = e;
    for (let entry of parts)
      if (
        ((a = (await t(a)).some((f) => f.name === entry && f.isDirectory())
          ? pathModule.join(a, entry)
          : void 0),
        a === void 0)
      )
        break;
    if (a !== void 0 && (await t(a)).some((l) => l.name === o && l.isSymbolicLink())) return r;
  }
  return;
}
/**
 * 从一次 cacheOnly 加载结果中找出缓存缺失的启用插件，供后台补装。
 */
//@ chunk-9tyqgtn4.js:20076-20329 fingerprint = loadPluginFromMarketplaceEntryCacheOnly (0.344)
function loadPluginFromMarketplaceEntryCacheOnly({ enabled: enabled, errors: errors }, a) {
  let r = new Set(enabled.flatMap(pluginNameAliases).map(nfcLower)),
    s = new Set();
  for (let d of errors) if (d.type === "plugin-cache-miss") s.add(d.source);
  let c = new Set();
  for (let d of a?.enabled ?? []) if (s.has(d.source) && !r.has(nfcLower(d.name))) c.add(d.source);
  return c;
}
/**
 * 判断 URL 类型：file（本机）、hosted（官方地址）、custom_url（其他 http(s)）。
 */
//@ chunk-g6j7q15x.js:4001-4202 fingerprint = validateGitUrl (0.458)
function validateGitUrl(url) {
  if (url.protocol === "file:") return url.hostname === "" || url.hostname === "localhost" ? "file" : void 0;
  if (url.protocol !== "https:" && url.protocol !== "http:") return;
  return url.toString() === _ ? "hosted" : "custom_url";
}

export {
  loadAllPluginsCacheOnly,
  loadAllPluginsForPreview,
  syncedPluginFolderId,
  clearPluginCache,
  createPluginFromPath,
  loadAllPlugins,
  refillPluginLoadCacheOnly,
  shouldFillPluginLoadWithStore,
  shouldSyncPluginInstall,
  loadPluginManifest,
  copyDir,
  localCopyShadowingSynced,
  syncedPluginMintedName,
  cacheCopyDependencyGap,
  realPathInsideCache,
  unvouchBeforeDependencyStep,
  rescreenCachedPluginTree,
  cachePlugin,
  entryDeclaresComponents,
  entryDeclaredComponentPaths,
  getVersionedCachePath,
  getVersionedZipCachePath,
  cacheDirHasPluginContentStrict,
  copyPluginToVersionedCache,
  anchoredPluginCachePath,
  hasMarketplaceBackedPlugins,
  releaseSyncedDirsNotIn,
  copyDir_2,
  mapStringsDeep,
  loadPluginFromMarketplaceEntryCacheOnly,
  directoryPluginFallbackName,
  zG,
  formatFailureDetails_2,
  rUe,
  rereadPluginsCacheOnly,
  displaySkillsDirPath,
  resolveWithinDir,
  getEnabledPluginBinPaths,
  isZipPathCaseInsensitive,
  orphanMarkerCoordsV5,
  evictCachedVersionDir,
  githubRepoToCloneUrl,
  strictCacheAddressable,
  versionParentContained,
  probeSeedForPlugin,
  buildNpmRegistryArgs,
  getPluginCacheDirIn,
  versionParentState,
  strictArchivePresent,
  requireVersionParentContained,
  removeFreshCopyUnlessInUse,
  unmarkBeforeArchiving,
  GitNotAvailableError,
  GitHostFetchFailedError,
  clearOccupantForReplace,
  validateGitUrl,
  MANIFEST_IDENTITY_READ_RELPATHS,
  loadSkillsAsPlugins,
};
