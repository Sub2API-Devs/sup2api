/**
 * utils/plugins/installedPluginsManager.ts
 *
 * installed_plugins.json（V2：插件 ID → 各作用域安装记录）的读写、迁移、内存缓存与按当前项目筛选。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/utils/plugins/installedPluginsManager.ts
 * pieces: chunk-e6aww6q8.js (111)
 * attribution: fingerprint 21, layout 54, callgraph-fingerprint 3, placement 32, affinity 1
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
  openSync,
  openSync as openSync_2,
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
  fstatSync,
  fstatSync as fstatSync_2,
  lstatSync,
  lstatSync as lstatSync_2,
  lstatSync as lstatSync_3,
  readSync,
  readSync as readSync_2,
  closeSync,
  closeSync as closeSync_2,
  closeSync as closeSync_3,
} from "fs";
import { constants as constants_2_2, constants as constants_8 } from "os";
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
} from "fs/promises";
import {
  getPluginsDirectory,
  relocateInstallPath,
  setAsideFileName,
  pluginDataDirPath,
  Tet,
  unreadableKeptFileName,
  isUnreadableKeptFileName,
  isSetAsideFileName,
  parseVersionCachePath,
  L2e,
} from "./pluginDirectories.js";
import { getPluginRegistry } from "./pluginLoadState.js";
import { logForDebugging } from "../debug.js";
import { logEvent } from "../../services/analytics/index.js";
import { fromEnum, lit as lit_2 } from "../../services/analytics/safeMetadata.js";
import {
  sanitizeErrnoForTelemetry,
  getErrnoCode,
  isENOENT,
  errorMessage,
  isSyscallError,
  toError,
  TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS,
} from "../errors.js";
import { getFsImplementation } from "../fsOperations.js";
import { isStorageV5Enabled } from "../hoverRest.js";
import { jsonParse, jsonStringify, isSentinelInode } from "../slowOperations.js";
import {
  InstalledPluginsFileSchemaV1,
  NPM,
  isValidPluginIdSegment,
  PluginIdSchema,
  parseInstalledPluginsV2Leniently,
  MAX_PREVIOUS_PRODUCER_PATHS,
  ONE_MIB,
  parsePluginBinaries,
} from "./schemas.js";
import { writeAndPublishSync } from "../atomicPublishWrite.js";
import { logError } from "../log.js";
import { anchoredPluginCachePath, getVersionedCachePath } from "./pluginLoader.js";
import {
  wslWalkRootOf,
  normalizePathForPlatform,
  classifyMarketplacePath,
  toAlternatePlatformPath,
} from "./localMarketplacePaths.js";
import { getOriginalCwd, isDiskless } from "../../bootstrap/state.js";
import { toComparablePath } from "../fsJunctions.js";
import { regExp as regExp_18 } from "./commandSource.js";
import { classifyDirEntrySafe, removeDirectoryTreeNoFollow } from "../fsRemove.js";
import {
  seedDirFor,
  loadKnownMarketplacesSafe,
  getPluginByIdCacheOnly,
  getPluginById,
} from "./marketplaceManager.js";
import { countCharInString } from "../stringUtils.js";
import { quotedPrintable, truncateWithEllipsis } from "../printableName.js";
import { appendEntryToFile } from "../sessionStorage.js";
import { getPlan_2 } from "../plans.js";
import { getMcpAuthCache } from "../../services/mcp/client.js";
import { formatStorageError } from "../storage/storageErrors.js";
import { createJitteredBackoff } from "../backoff.js";
import { sleep } from "../sleep.js";
import { recordProducerDir, emitProducerDirsChanged } from "./pluginCachePaths.js";
import {
  registerPluginInstallation,
  mergePreviousProducerPaths,
  parsePluginIdSafe,
  healManagedRecord,
  cacheAndRegisterPlugin,
  pluginInstallPathExists,
} from "./pluginInstallationHelpers.js";
import { findMatchingInstallations, qP, edr, Umi, findInstallationIndex } from "./dependencyResolver.js";
import { setDirectoryBinding, ensureDirectoryBindingForMigration } from "./pluginDirectoryBindings.js";
import { GD } from "../settings/settingsStorage.js";
import { getPlatform } from "../platform.js";
import {
  getSettings_DEPRECATED,
  getSettingsForSource,
  getSettingsFilePathForSource,
} from "../settings/settings.js";
import { Yse, getPluginCloneUrl } from "./pluginVersioning.js";
import { STORAGE_SPACES } from "../storage/storageSpaces.js";
import { Wo } from "../json.js";
import { count } from "../collections.js";
import { isRemoteSettingsFetchFailed } from "../../services/cloudSessions/eligibility.js";
import { isLocalSettingsGitTracked } from "../config.js";
import { EDITABLE_SETTING_SOURCES } from "../settings/constants.js";
import { settingsSourceName } from "../settings/settingsSourceTrust.js";
import { isPluginBlockedByPolicy, isSourceDisallowedOrUnverifiable } from "./marketplacePolicy.js";
import { parsePluginIdentifier } from "./pluginIdentifier.js";
import { OFFICIAL_MARKETPLACE_NAME } from "./officialMarketplaceNames.js";
import { l7 } from "./pluginCacheMaterialize.js";
import { $c } from "../platformTargets.js";

/**
 * installed_plugins.json 路径：<plugins 目录>/installed_plugins.json。
 */
//@ chunk-e6aww6q8.js:4326097-4326152 fingerprint = getInstalledPluginsFilePath (1)
function getInstalledPluginsFilePath() {
  return join_27(getPluginsDirectory(), "installed_plugins.json");
}
//@ chunk-e6aww6q8.js:4326152-4326211 fingerprint = getInstalledPluginsV2FilePath (1)
function getInstalledPluginsV2FilePath() {
  return join_27(getPluginsDirectory(), "installed_plugins_v2.json");
}
/**
 * 清掉 installed_plugins 的内存缓存（全局 installedPluginsFile 与快照），下次读取会重新加载。
 */
//@ chunk-e6aww6q8.js:4326211-4326360 fingerprint = clearInstalledPluginsCache (0.595)
function clearInstalledPluginsCache() {
  let e = getPluginRegistry();
  ((e.installedPluginsFile = null),
    (e.installedPluginsSnapshot = null),
    e.installedPluginsEpoch++,
    logForDebugging("Cleared installed plugins cache"));
}
//@ chunk-e6aww6q8.js:4326360-4326438 layout
function setInstalledPluginsCache(e) {
  let n = getPluginRegistry();
  ((n.installedPluginsFile = e), n.installedPluginsEpoch++);
}
//@ chunk-e6aww6q8.js:4326438-4326477 layout
var UNPARSEABLE_RECORD_IDS = Symbol("unparseableRecordIds");
/**
 * 在错误对象上附加无法解析的记录 ID 列表（不可枚举属性）。
 */
//@ chunk-e6aww6q8.js:4326477-4326633 layout
function markUnparseableRecords(e, n) {
  let r = e ?? Error("a record under a valid plugin id could not be parsed");
  return (Object.defineProperty(r, UNPARSEABLE_RECORD_IDS, { value: [...n], enumerable: !1 }), r);
}
/**
 * 读取错误对象上的无法解析记录 ID 列表。
 */
//@ chunk-e6aww6q8.js:4326633-4326689 layout
function getUnparseableRecordIds(e) {
  return e instanceof Error ? e[UNPARSEABLE_RECORD_IDS] : void 0;
}
/**
 * 记录插件状态文件错误遥测 tengu_plugin_state_file_error（操作、错误种类：无法解析的记录/未替换/JSON 语法…）。
 */
//@ chunk-e6aww6q8.js:4326689-4326986 layout
function logPluginStateFileError(e, n, r) {
  logEvent("tengu_plugin_state_file_error", {
    operation: fromEnum(e),
    error_kind:
      getUnparseableRecordIds(n) !== void 0
        ? lit_2("unparsed-record")
        : n instanceof InstalledListNotReplacedError
          ? (sanitizeErrnoForTelemetry(n) ?? lit_2("not-replaced"))
          : n instanceof SyntaxError
            ? lit_2("syntax-error")
            : n instanceof Error && n.name === "ZodError"
              ? lit_2("validation-error")
              : (sanitizeErrnoForTelemetry(n) ?? lit_2("unknown")),
    recovered: r,
  });
}
/**
 * 一次性迁移：把旧的 installed_plugins_v2.json 与旧版单文件合并成单一 installed_plugins.json（V2 形状），不会覆盖已有列表。
 */
//@ chunk-e6aww6q8.js:4326986-4328557 fingerprint = migrateToSinglePluginFile (0.69)
async function migrateToSinglePluginFile(e) {
  let fs = getPluginRegistry();
  if (fs.installedPluginsMigrated) return;
  let mainFilePath = getFsImplementation(),
    v2FilePath = getInstalledPluginsFilePath(),
    v2Data = getInstalledPluginsV2FilePath(),
    y = nE(e),
    S;
  try {
    let w = !1,
      L = !1,
      G = !0;
    try {
      let ke = readInstalledPluginsFileRaw(v2FilePath);
      try {
        G = readInstalledPluginsFileRaw(v2Data) !== null;
      } catch {}
      if (G) assertInstalledPluginsReplaceable(ke);
      else Oct(ke);
    } catch (error) {
      if (!(error instanceof InstalledListNotReplacedError)) throw error;
      L = !0;
    }
    try {
      if (L || !G) throw Object.assign(Error("nothing is renamed over the list"), { code: "ENOENT" });
      (mainFilePath.renameSync(v2Data, v2FilePath), (w = !0));
    } catch (error) {
      let we = getErrnoCode(error);
      if (we !== "ENOENT" && we !== "EEXIST") throw error;
      if (we === "EEXIST")
        try {
          mainFilePath.unlinkSync(v2Data);
        } catch {}
    }
    if (w) {
      if (
        (logForDebugging("Renamed installed_plugins_v2.json to installed_plugins.json"),
        isStorageV5Enabled() && e !== void 0 && y !== null)
      ) {
        let installedPluginsEpoch = fs.installedPluginsEpoch,
          we = await readInstalledPluginsFileRaw_2(e, y);
        if (we !== null) {
          let Ee = loadInstalledPluginsV2(we);
          if (fs.installedPluginsEpoch === installedPluginsEpoch) fs.installedPluginsFile = Ee;
          await cleanupLegacyCache(Ee);
        }
      } else S = cleanupLegacyCache(getInstalledPlugins());
      ((fs.installedPluginsMigrated = !0), await S);
      return;
    }
    if (isStorageV5Enabled() && e !== void 0 && y !== null) {
      let ke = await migrateStoredV1ToV2(e, y);
      if (ke !== void 0)
        (logForDebugging(
          `Converted installed_plugins.json from V1 to V2 format (${ke.v1PluginCount} plugins)`,
        ),
          await cleanupLegacyCache(ke.data));
      fs.installedPluginsMigrated = !0;
      return;
    }
    let q;
    try {
      q = mainFilePath.readFileSync(v2FilePath, { encoding: "utf-8" });
    } catch (error) {
      if (!isENOENT(error)) throw error;
      fs.installedPluginsMigrated = !0;
      return;
    }
    let mainData = jsonParse(q);
    if ((typeof mainData?.version === "number" ? mainData.version : 1) === 1) {
      let v1Data = InstalledPluginsFileSchemaV1().parse(mainData),
        v2Data = migrateV1ToV2(v1Data);
      (assertInstalledPluginsReplaceable(readInstalledPluginsFileRaw(v2FilePath)),
        writeAndPublishSync(v2FilePath, jsonStringify(v2Data, null, 2)),
        logForDebugging(
          `Converted installed_plugins.json from V1 to V2 format (${Object.keys(v1Data.plugins).length} plugins)`,
        ),
        (S = cleanupLegacyCache(v2Data)));
    }
    fs.installedPluginsMigrated = !0;
  } catch (error) {
    let errorMsg = errorMessage(error);
    if (
      (logForDebugging(`Failed to migrate plugin files: ${errorMsg}`, { level: "error" }),
      !isSyscallError(error) && !(error instanceof SyntaxError))
    )
      logError(toError(error));
    (logPluginStateFileError("migrate-single-file", error, !0), (fs.installedPluginsMigrated = !0));
  }
  await S;
}
/**
 * 清理旧版“扁平缓存”目录（非版本化布局）中不再被任何安装记录引用的插件目录；installed_plugins 读不到时跳过。
 */
//@ chunk-e6aww6q8.js:4328557-4329866 fingerprint = cleanupLegacyCache (0.4)
async function cleanupLegacyCache(v2Data) {
  if (PF(v2Data)) {
    logForDebugging(
      "Skipping legacy cache cleanup: installed_plugins.json could not be read, so which flat folders are still referenced is not known",
    );
    return;
  }
  let fs = getFsImplementation(),
    cachePath = anchoredPluginCachePath();
  try {
    let referencedPaths = new Set(),
      h = wslWalkRootOf(cachePath);
    if (h === "undeterminable") {
      logForDebugging(
        "Skipping legacy cache cleanup: the cache root volume could not be read to map its WSL companion views",
      );
      return;
    }
    for (let installations of Object.values(v2Data.plugins))
      for (let entry of installations) {
        referencedPaths.add(normalizePathForPlatform(resolve_8(getOriginalCwd(), entry.installPath)));
        let G = classifyMarketplacePath(entry.installPath);
        if (!G.suspect)
          referencedPaths.add(
            normalizePathForPlatform(toComparablePath(G.absolute, { foldCase: !0, knownNotSuspect: !0 })),
          );
        let q = toAlternatePlatformPath(entry.installPath, h);
        if (q !== void 0) referencedPaths.add(normalizePathForPlatform(q));
      }
    let y = [...referencedPaths],
      entries = await fs.readdir(cachePath);
    for (let dirent of entries) {
      let entry = dirent.name;
      if (regExp_18.test(entry)) continue;
      let entryPath = join_27(cachePath, entry);
      try {
        if (!(await classifyDirEntrySafe(cachePath, dirent))?.isDirectory) continue;
        let entries = await fs.readdir(entryPath),
          Z = !1;
        for (let we of entries) {
          if (!(await classifyDirEntrySafe(entryPath, we))?.isDirectory) continue;
          let Ee = join_27(entryPath, we.name),
            entries = await fs.readdir(Ee);
          for (let Ie of entries)
            if (Ie.name.endsWith(".zip") || (await classifyDirEntrySafe(Ee, Ie))?.isDirectory) {
              Z = !0;
              break;
            }
          if (Z) break;
        }
        if (Z) continue;
        let Se = (subDirent) =>
          referencedPaths.has(subDirent) || y.some((vDirent) => vDirent.startsWith(subDirent + sep_16));
        if (!(
          Se(normalizePathForPlatform(entryPath)) ||
          Se(normalizePathForPlatform(toComparablePath(entryPath, { foldCase: !0 })))
        ))
          (await removeDirectoryTreeNoFollow(entryPath),
            logForDebugging(`Cleaned up legacy cache directory: ${entry}`));
      } catch (error) {
        logForDebugging(`Skipping legacy cache entry ${entry}: ${errorMessage(error)}`, { level: "warn" });
      }
    }
  } catch (error) {
    let errorMsg = errorMessage(error);
    logForDebugging(`Failed to clean up legacy cache: ${errorMsg}`, { level: "warn" });
  }
}
//@ chunk-e6aww6q8.js:4330013-4330286 callgraph-fingerprint = readInstalledPluginsFileRaw (0.319)
async function readInstalledPluginsFileRaw_2(e, n) {
  let read = await e.read([n]);
  if (!read.ok) throw storageAccessError(read.error);
  let s = read.value.items[0];
  if (s === void 0) throw Error("installed plugins registry read settled without an outcome for its key");
  if (!s.found) return null;
  return parseInstalledPluginsJson(Buffer.from(s.value).toString("utf-8"));
}
/**
 * 经存储层读取 installed_plugins.json 原文（不存在返回 null）。
 */
//@ chunk-e6aww6q8.js:4330286-4330544 layout
async function readInstalledPluginsViaStorage(e, n) {
  let read = await e.read([n]);
  if (!read.ok) throw storageAccessError(read.error);
  let s = read.value.items[0];
  if (s === void 0) throw Error("installed plugins registry read settled without an outcome for its key");
  return s.found ? Buffer.from(s.value).toString("utf-8") : null;
}
/**
 * 解析 installed_plugins.json 文本，返回 {version, data}（无 version 视为 1）。
 */
//@ chunk-e6aww6q8.js:4330544-4330635 layout
function parseInstalledPluginsJson(e) {
  let n = jsonParse(e);
  return { version: typeof n?.version === "number" ? n.version : 1, data: n };
}
//@ chunk-e6aww6q8.js:4330635-4330731 layout
function toInstalledPluginsV2(e) {
  return e.version === 2
    ? normalizeInstallPaths(parseInstalledPluginsV2Strict(e.data, "load-from-disk"))
    : migrateV1ToV2(InstalledPluginsFileSchemaV1().parse(e.data));
}
//@ chunk-e6aww6q8.js:4330731-4330882 fingerprint = hasPendingUpdates (0.783)
function normalizeInstallPaths(e) {
  for (let n of Object.values(e.plugins))
    for (let diskEntry of n) {
      if (seedDirFor(diskEntry.installPath) !== void 0) continue;
      diskEntry.installPath = relocateInstallPath(diskEntry.installPath);
    }
  return e;
}
/**
 * 生成“插件 id 不合法、无法安装”的说明：区分多个 @、npm 包名不合法、插件名/市场名哪个不合法；名字含不可见字符时补一句； 是依赖的 id 不合法时以依赖方口吻描述。
 */
//@ chunk-e6aww6q8.js:4330882-4332310 layout
function formatInvalidPluginIdMessage(pluginId, dependentId, parts) {
  let atIndex = pluginId.lastIndexOf("@"),
    marketplaceName = parts?.marketplaceName ?? (atIndex >= 0 ? pluginId.slice(atIndex + 1) : ""),
    pluginName = parts?.pluginName ?? (atIndex > 0 ? pluginId.slice(0, atIndex) : ""),
    S = marketplaceName === NPM,
    w = countCharInString(pluginId, "@"),
    L = parts === void 0 && w > (S && pluginId.startsWith("@") ? 2 : 1),
    G = isValidPluginIdSegment(pluginName),
    q = atIndex >= 0 && isValidPluginIdSegment(marketplaceName),
    Z =
      'Each part of a plugin id (plugin@marketplace) may use only the letters a-z and A-Z, digits, ".", "_" and "-", and must start with a letter or digit.',
    Se = L
      ? `Each part of a plugin id (plugin@marketplace) may use only the letters a-z and A-Z, digits, ".", "_" and "-", and must start with a letter or digit. Here the id holds more than one "@", so the plugin's name or the marketplace's name holds one; whoever named it can rename it.`
      : S
        ? "its first half is not a package name that the npm marketplace accepts."
        : `Each part of a plugin id (plugin@marketplace) may use only the letters a-z and A-Z, digits, ".", "_" and "-", and must start with a letter or digit. Here ${G && !q ? "the marketplace's name does not" : !G && q ? "the plugin's name does not" : "they do not"}; the marketplace's maintainer can rename ${G || q ? "it" : "both"}.`,
    ke = quotedPrintable(pluginId),
    we = ke !== truncateWithEllipsis(normalizeQuotes(pluginId), 300),
    Ee = dependentId !== void 0 && dependentId !== pluginId,
    Ae = !we
      ? ""
      : Ee
        ? " The name of the plugin it depends on holds a character that is not shown here."
        : " The name holds a character that is not shown here.";
  return Ee
    ? `Plugin "${quotedPrintable(dependentId)}" cannot be installed, because it depends on "${ke}", whose id is invalid: ${Se}${Ae}`
    : `Plugin "${ke}" cannot be installed, because its id is invalid: ${Se}${Ae}`;
}
//@ chunk-e6aww6q8.js:4332310-4332478 layout = setCwdState (1)
function normalizeQuotes(cwd) {
  return cwd
    .normalize("NFC")
    .replace(/[`\uff40\u02cb\u1fef\u2035]/g, "'")
    .replace(/[\u02bb\u02bc]/g, "\u2019")
    .replace(/"/g, "\u201D")
    .replace(/'/g, "\u2019");
}
//@ chunk-e6aww6q8.js:4332478-4332527 layout
function vct(e) {
  return PluginIdSchema().safeParse(e).success;
}
//@ chunk-e6aww6q8.js:4332527-4332706 layout
class UnrecordablePluginIdError extends TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS {
  pluginCommandErrorCategory = "validation";
  constructor(e) {
    super(formatInvalidPluginIdMessage(e), "plugin id cannot be a key of the install records");
    this.name = "UnrecordablePluginIdError";
  }
}
//@ chunk-e6aww6q8.js:4332706-4332750 layout
function Ect(e) {
  if (!vct(e)) throw new UnrecordablePluginIdError(e);
}
//@ chunk-e6aww6q8.js:4332750-4332791 layout
var XGn = Symbol("setAsideInstallRecords");
//@ chunk-e6aww6q8.js:4332791-4332821 layout
function Act(e) {
  return e[XGn];
}
//@ chunk-e6aww6q8.js:4332821-4332920 layout
function eDe(e, n) {
  Object.defineProperty(e, XGn, { value: n, enumerable: !1, configurable: !0, writable: !0 });
}
//@ chunk-e6aww6q8.js:4332920-4332974 layout
function yys(e, n) {
  let r = Act(e);
  if (r !== void 0) eDe(n, r);
}
//@ chunk-e6aww6q8.js:4332974-4333016 layout
function Xse(e) {
  return (writeSetAsideRecords(e), jsonStringify(e, null, 2));
}
/**
 * 宽松解析 installed_plugins.json V2：存在键合法但本版本解析不了的记录时记 warn 并抛出（视为不可读、不覆盖文件）； 键本身不合法的记录登记为 set-aside（下次写时复制到带日期的旁文件后丢弃）。返回解析后的文件对象。
 */
//@ chunk-e6aww6q8.js:4333016-4333932 layout
function parseInstalledPluginsV2Strict(e, n) {
  let {
      file: file,
      setAside: setAside,
      keptRaw: keptRaw,
      firstError: firstError,
      firstUnparseableError: firstUnparseableError,
    } = parseInstalledPluginsV2Leniently(e),
    keys = Object.keys(setAside),
    keys_2 = Object.keys(keptRaw);
  if (keys_2.length > 0)
    throw (
      logForDebugging(
        `installed_plugins.json: ${keys_2.length} record(s) under a valid plugin id that this build cannot parse (another build's, perhaps newer): ${keys_2
          .slice(0, 10)
          .map((G) => jsonStringify(quotedPrintable(G, 120)))
          .join(
            ", ",
          )}${keys_2.length > 10 ? `, and ${keys_2.length - 10} more` : ""}. The list counts as unreadable for this build, and this build does not replace the file while they stay.`,
        { level: "warn" },
      ),
      markUnparseableRecords(firstUnparseableError, keys_2)
    );
  if (keys.length > 0)
    (eDe(file, setAside),
      logPluginStateFileError(n, firstError, !0),
      logForDebugging(
        `installed_plugins.json: ${keys.length} record(s) set aside, because their key is not a valid plugin id and no build to date can use them: ${keys
          .slice(0, 10)
          .map((G) => jsonStringify(quotedPrintable(G, 120)))
          .join(
            ", ",
          )}${keys.length > 10 ? `, and ${keys.length - 10} more` : ""}. The next write of installed_plugins.json copies them to a dated file beside it and drops them from the list.`,
        { level: "warn" },
      ));
  return file;
}
//@ chunk-e6aww6q8.js:4333932-4334071 layout
function tryParseInstalledPluginsV2(e) {
  try {
    let { file: file, keptRaw: keptRaw } = parseInstalledPluginsV2Leniently(e);
    return Object.keys(keptRaw).length > 0 ? { success: !1 } : { success: !0, data: file };
  } catch {
    return { success: !1 };
  }
}
/**
 * set-aside 记录旁文件写失败的错误。
 */
//@ chunk-e6aww6q8.js:4334071-4334459 layout
function setAsideCopyFailedError(e, n) {
  return new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
    `installed_plugins.json was not changed: it holds records under names that no version of Claude Code can use; they are copied to a side file before they are removed, and that copy could not be written to ${e} (${n}). Make that path writable, or move what stands there away, and try again.`,
    "the side copy of set-aside install records could not be written",
  );
}
/**
 * 写 installed_plugins.json 前，把被 set aside 的记录按键排序写到插件目录下带日期与内容哈希的旁文件（权限 0600），失败抛 Sys 错误；成功后清空登记。
 */
//@ chunk-e6aww6q8.js:4334459-4334920 layout
function writeSetAsideRecords(e) {
  let n = Act(e);
  if (n === void 0 || Object.keys(n).length === 0) return;
  let create = Object.create(null);
  for (let y of Object.keys(n).sort()) create[y] = n[y];
  let s = jsonStringify(create, null, 2),
    h = join_27(
      getPluginsDirectory(),
      setAsideFileName(new Date(), createHash_7("sha256").update(s).digest("hex").slice(0, 12)),
    );
  try {
    (appendEntryToFile(), writeAndPublishSync(h, s, 384));
  } catch (error) {
    throw setAsideCopyFailedError(h, errorMessage(error));
  }
  (eDe(e, {}),
    logForDebugging(
      `installed_plugins.json: copied ${Object.keys(n).length} set-aside record(s) to ${h} before this write drops them from installed_plugins.json`,
      { level: "warn" },
    ));
}
//@ chunk-e6aww6q8.js:4334920-4335171 fingerprint = migrateV1ToV2 (1)
function migrateV1ToV2(v1Data) {
  let v2Plugins = {};
  for (let [r, s] of Object.entries(v1Data.plugins)) {
    let versionedCachePath = getVersionedCachePath(r, s.version);
    v2Plugins[r] = [
      {
        scope: "user",
        installPath: versionedCachePath,
        version: s.version,
        installedAt: s.installedAt,
        lastUpdated: s.lastUpdated,
        gitCommitSha: s.gitCommitSha,
      },
    ];
  }
  return { version: 2, plugins: v2Plugins };
}
/**
 * 同步返回 installed_plugins.json（V2 形状），首次调用从磁盘读并缓存在全局状态 installedPluginsFile；读失败返回带错误标记的空表（isInstalledPluginsReadFailure 可识别）。
 */
//@ chunk-e6aww6q8.js:4335171-4335366 layout
function getInstalledPlugins() {
  let e = getPluginRegistry();
  if (e.installedPluginsFile !== null) return e.installedPluginsFile;
  try {
    e.installedPluginsFile = loadInstalledPluginsV2(getPlan_2());
  } catch (error) {
    e.installedPluginsFile = emptyStateAfterLoadFailure(error);
  }
  return e.installedPluginsFile;
}
/**
 * 经存储后端（storageV5）异步读取 installed_plugins.json 并缓存；内存已有时直接返回缓存。
 */
//@ chunk-e6aww6q8.js:4335366-4335893 layout
async function getInstalledPluginsAsync(e) {
  let n = nE(e);
  if (!isStorageV5Enabled() || e === void 0 || n === null) return getInstalledPlugins();
  let r = getPluginRegistry();
  if (r.installedPluginsFile !== null)
    return (
      logForDebugging(
        "installed_plugins.json already cached before this storage-interface load; serving the cached copy",
      ),
      r.installedPluginsFile
    );
  let installedPluginsEpoch = r.installedPluginsEpoch,
    h;
  try {
    ((h = loadInstalledPluginsV2(await readInstalledPluginsFileRaw_2(e, n))),
      logForDebugging(
        `Loaded installed_plugins.json through the storage interface (${Object.keys(h.plugins).length} plugins)`,
      ));
  } catch (error) {
    h = emptyStateAfterLoadFailure(error);
  }
  if (r.installedPluginsEpoch === installedPluginsEpoch) r.installedPluginsFile ??= h;
  return r.installedPluginsFile ?? h;
}
/**
 * 存储后端可用时预读 installed_plugins 到内存缓存。
 */
//@ chunk-e6aww6q8.js:4335893-4335943 layout
async function primeInstalledPluginsCache(e) {
  if (nE(e) !== null) await getInstalledPluginsAsync(e);
}
/**
 * 从磁盘读取 installed_plugins.json，V1 自动迁移为 V2，结果做路径规范化。
 */
//@ chunk-e6aww6q8.js:4335943-4336352 fingerprint = loadInstalledPluginsV2 (0.737)
function loadInstalledPluginsV2(e) {
  if (e) {
    if (e.version === 2) {
      let s = normalizeInstallPaths(parseInstalledPluginsV2Strict(e.data, "load"));
      return (
        logForDebugging(
          `Loaded ${Object.keys(s.plugins).length} installed plugins from ${isDiskless() ? "installed_plugins.json" : getInstalledPluginsFilePath()}`,
        ),
        s
      );
    }
    let validated = InstalledPluginsFileSchemaV1().parse(e.data),
      v2Data = migrateV1ToV2(validated);
    return (
      logForDebugging(`Loaded and converted ${Object.keys(validated.plugins).length} plugins from V1 format`),
      v2Data
    );
  }
  return (
    logForDebugging("installed_plugins.json doesn't exist, returning empty V2 object"),
    { version: 2, plugins: {} }
  );
}
//@ chunk-e6aww6q8.js:4336352-4336372 layout
var failedInstalledPluginsReads = new WeakSet();
//@ chunk-e6aww6q8.js:4336372-4336405 placement
function PF(e) {
  return failedInstalledPluginsReads.has(e);
}
//@ chunk-e6aww6q8.js:4336405-4336577 placement
async function getInstalledPluginsMap(e, n = !1) {
  if (n) {
    let h = loadInstalledPluginsSync();
    return PF(h) ? void 0 : h.plugins;
  }
  let installedPluginsFile = getPluginRegistry().installedPluginsFile;
  if (installedPluginsFile === null && !e) return;
  let s = installedPluginsFile ?? getInstalledPlugins();
  return PF(s) ? void 0 : s.plugins;
}
/**
 * 其他与该插件共用（大小写不敏感）数据目录的插件 id。
 */
//@ chunk-e6aww6q8.js:4336577-4336721 placement
function findDataDirSharers(e, n, r = new Set([e])) {
  let lower = pluginDataDirPath(e).toLowerCase();
  return Object.keys(n.plugins).filter(
    (h) => h !== e && !r.has(h) && pluginDataDirPath(h).toLowerCase() === lower,
  );
}
//@ chunk-e6aww6q8.js:4336721-4336799 placement
function QJn(e, n, r = new Set([e])) {
  if (PF(n)) return !0;
  return findDataDirSharers(e, n, r).length > 0;
}
/**
 * 有安装记录的插件 id；读失败返回 unknown。
 */
//@ chunk-e6aww6q8.js:4336799-4336899 placement
function listInstalledPluginIds(e) {
  return PF(e) ? "unknown" : Object.entries(e.plugins).flatMap(([n, r]) => (r.length > 0 ? [n] : []));
}
//@ chunk-e6aww6q8.js:4336899-4337148 placement
function emptyStateAfterLoadFailure(e) {
  let n = errorMessage(e);
  if (
    (logForDebugging(`Failed to load installed_plugins.json: ${n}. Starting with empty state.`, {
      level: "error",
    }),
    !isSyscallError(e) && !(e instanceof SyntaxError) && getUnparseableRecordIds(e) === void 0)
  )
    logError(toError(e));
  logPluginStateFileError("load", e, !0);
  let r = { version: 2, plugins: {} };
  return (failedInstalledPluginsReads.add(r), r);
}
//@ chunk-e6aww6q8.js:4337148-4337208 placement
function nE(e) {
  return !isStorageV5Enabled() || e === void 0 ? null : Tet("installed");
}
//@ chunk-e6aww6q8.js:4337208-4337251 placement
function bys() {
  return 438 & ~process.umask();
}
/**
 * 读取 installed_plugins.json，遇到未知版本格式时报错。
 */
//@ chunk-e6aww6q8.js:4337251-4338298 placement
function readInstalledPluginsFile(e) {
  if (e.unreadRecordIds.length === 0)
    return `installed_plugins.json is in a format (version ${e.formatVersion ?? "unknown"}) that this version of Claude Code does not know, so plugins cannot be changed from this version, and some may not load. Update Claude Code on this machine (claude update), or change plugins with the version of Claude Code that wrote ${getInstalledPluginsFilePath()}.`;
  let mapped = e.unreadRecordIds.slice(0, 3).map((y) => `"${quotedPrintable(y, 120)}"`),
    r = e.unreadRecordIds.length - mapped.length,
    s = e.unreadRecordIds.length === 1,
    h = `${mapped.join(", ")}${r > 0 ? ` and ${r} more` : ""}`;
  return `installed_plugins.json holds ${s ? "a record" : "records"} under ${h} that this version of Claude Code cannot read, so plugins cannot be changed from this version, and some may not load. Update Claude Code on this machine (claude update); or uninstall ${s ? "that plugin" : "those plugins"} with the version of Claude Code that wrote ${s ? "the record" : "the records"}; or, if neither helps, delete ${s ? "that record" : "each of those records"} from ${getInstalledPluginsFilePath()} by hand, then restart or run /reload-plugins.`;
}
//@ chunk-e6aww6q8.js:4338298-4338628 placement
class InstalledListNotReplacedError extends TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS {
  unreadRecordIds;
  formatVersion;
  constructor(e, n, r) {
    super(
      `installed_plugins.json was not changed: ${r ?? readInstalledPluginsFile({ unreadRecordIds: e, formatVersion: n })}`,
      "installed_plugins.json was not replaced: it holds what this build cannot read",
    );
    this.unreadRecordIds = e;
    this.formatVersion = n;
    this.name = "InstalledListNotReplacedError";
  }
}
/**
 * 不可读文件的保留副本写失败的错误。
 */
//@ chunk-e6aww6q8.js:4338664-4339067 placement
function keptCopyWriteFailedError(e, n) {
  return new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
    `installed_plugins.json cannot be read, and it was not changed. Before it is rebuilt, its contents are kept in a file beside it, but that file (${e}) could not be written: ${n}. Free disk space or make the plugins folder writable, or move installed_plugins.json aside by hand, then try again.`,
    "the kept copy of an unreadable installed_plugins.json could not be written",
  );
}
//@ chunk-e6aww6q8.js:4339067-4339084 placement
var Rys = 16777216;
/**
 * 安全地同步读取文件：O_RDONLY|O_NOFOLLOW|O_NONBLOCK 打开，fstat 与 lstat 必须同为单硬链接普通文件且 dev/ino 一致， 大小不超过 Rys；读满或出错返回 undefined。
 */
//@ chunk-e6aww6q8.js:4339084-4339548 placement
function readSmallRegularFileSync(e) {
  let n;
  try {
    n = openSync_2(e, constants_7.O_RDONLY | constants_7.O_NOFOLLOW | constants_7.O_NONBLOCK);
    let r = fstatSync_2(n, { bigint: !0 }),
      s = lstatSync_2(e, { bigint: !0 });
    if (
      !r.isFile() ||
      !s.isFile() ||
      r.nlink !== 1n ||
      s.nlink !== 1n ||
      isSentinelInode(r.ino) ||
      r.dev !== s.dev ||
      r.ino !== s.ino
    )
      return;
    if (r.size > BigInt(Rys)) return;
    let allocUnsafe = Buffer.allocUnsafe(Number(r.size) + 1),
      y = 0;
    while (y < allocUnsafe.length) {
      let S = readSync_2(n, allocUnsafe, y, allocUnsafe.length - y, y);
      if (S === 0) return Buffer.from(allocUnsafe.subarray(0, y));
      y += S;
    }
    return;
  } catch {
    return;
  } finally {
    if (n !== void 0)
      try {
        closeSync_2(n);
      } catch {}
  }
}
//@ chunk-e6aww6q8.js:4339548-4340376 placement
function readInstalledPluginsRaw(e) {
  let n = typeof e === "string" ? Buffer.from(e, "latin1") : Buffer.from(e),
    r = readSmallRegularFileSync(getInstalledPluginsFilePath());
  if (r === void 0 || !(r.equals(n) || r.toString("utf8") === n.toString("utf8"))) {
    logForDebugging(
      "installed_plugins.json could not be read at all, and its bytes are NOT kept: its name is not a plain file of its own (a symbolic link, a second name of another file, too large), or it changed while it was read; this write replaces only the name",
      { level: "warn" },
    );
    return;
  }
  let s = join_27(
    getPluginsDirectory(),
    unreadableKeptFileName(new Date(), createHash_7("sha256").update(r).digest("hex").slice(0, 12)),
  );
  try {
    (appendEntryToFile(), writeAndPublishSync(s, r, 384));
  } catch (error) {
    let y = keptCopyWriteFailedError(s, errorMessage(error)),
      S = getErrnoCode(error),
      w = isSyscallError(error) ? error.errno : void 0;
    throw Object.assign(y, S === void 0 ? {} : { code: S }, w === void 0 ? {} : { errno: w });
  }
  logForDebugging(
    `installed_plugins.json could not be read at all (not JSON, or not a list of plugins): its bytes are kept in ${s} before this write rebuilds it`,
    { level: "warn" },
  );
}
//@ chunk-e6aww6q8.js:4340376-4340451 placement
function Oct(e) {
  let n = e === null ? void 0 : checkInstalledPluginsReplaceable(e).refusal;
  if (n !== void 0) throw n;
}
/**
 * 分析现有文件原文：版本高于 2 或有本版本不能解析的记录时返回 refusal；完全无法解析返回 unreadableAtAll； V2 正常时附带 set-aside 记录。
 */
//@ chunk-e6aww6q8.js:4340529-4341033 placement
function checkInstalledPluginsReplaceable(raw) {
  let n = getMcpAuthCache(raw),
    parsed;
  try {
    parsed = parseInstalledPluginsJson(n);
  } catch {
    return { unreadableAtAll: n.trim() !== "" };
  }
  if (parsed.version > 2)
    return { refusal: new InstalledListNotReplacedError([], parsed.version), unreadableAtAll: !1 };
  let isEmpty =
    parsed.data === null || (typeof parsed.data === "object" && Object.keys(parsed.data).length === 0);
  if (parsed.version !== 2)
    return { unreadableAtAll: !isEmpty && !InstalledPluginsFileSchemaV1().safeParse(parsed.data).success };
  let keptIds, setAside;
  try {
    let S = parseInstalledPluginsV2Leniently(parsed.data);
    ((keptIds = Object.keys(S.keptRaw)), (setAside = S.setAside));
  } catch {
    return { unreadableAtAll: !isEmpty };
  }
  return keptIds.length > 0
    ? { refusal: new InstalledListNotReplacedError(keptIds), unreadableAtAll: !1 }
    : { unreadableAtAll: !1, setAside: setAside };
}
//@ chunk-e6aww6q8.js:4341033-4341216 placement
function assertInstalledPluginsReplaceable(e, n) {
  if (e === null) return;
  let r = checkInstalledPluginsReplaceable(e);
  if (r.refusal !== void 0) throw r.refusal;
  if (n !== void 0 && r.setAside !== void 0) eDe(n, { ...Act(n), ...r.setAside });
  if (r.unreadableAtAll) readInstalledPluginsRaw(e);
}
/**
 * 列出 installed_plugins 不可读时保留的副本文件。
 */
//@ chunk-e6aww6q8.js:4341216-4341381 placement
async function listUnreadableKeptFiles() {
  let e = dirname_17(getInstalledPluginsFilePath());
  try {
    return (await getFsImplementation().readdir(e))
      .filter((r) => r.isFile())
      .map((r) => r.name)
      .filter(isUnreadableKeptFileName)
      .sort()
      .map((r) => join_27(e, r));
  } catch {
    return [];
  }
}
/**
 * 列出 set-aside 旁文件。
 */
//@ chunk-e6aww6q8.js:4341381-4341546 placement
async function listSetAsideFiles() {
  let e = dirname_17(getInstalledPluginsFilePath());
  try {
    return (await getFsImplementation().readdir(e))
      .filter((r) => r.isFile())
      .map((r) => r.name)
      .filter(isSetAsideFileName)
      .sort()
      .map((r) => join_27(e, r));
  } catch {
    return [];
  }
}
/**
 * 读文件检查是否会拒绝覆盖，返回未读记录 id 与格式版本。
 */
//@ chunk-e6aww6q8.js:4341546-4341807 placement
async function getInstalledListRefusal(e) {
  try {
    let n = nE(e);
    Oct(
      isStorageV5Enabled() && e !== void 0 && n !== null
        ? await readInstalledPluginsViaStorage(e, n)
        : readInstalledPluginsFileRaw(getInstalledPluginsFilePath()),
    );
    return;
  } catch (error) {
    return error instanceof InstalledListNotReplacedError &&
      (error.unreadRecordIds.length > 0 || error.formatVersion !== void 0)
      ? { unreadRecordIds: error.unreadRecordIds, formatVersion: error.formatVersion }
      : void 0;
  }
}
//@ chunk-e6aww6q8.js:4341807-4342000 placement
async function readInstalledPluginsLenient(e) {
  try {
    let n = nE(e),
      r =
        isStorageV5Enabled() && e !== void 0 && n !== null
          ? await readInstalledPluginsViaStorage(e, n)
          : readInstalledPluginsFileRaw(getInstalledPluginsFilePath());
    if (r === null) return {};
    let s = parseInstalledPluginsJson(getMcpAuthCache(r));
    return s.version === 2 ? parseInstalledPluginsV2Leniently(s.data).file.plugins : {};
  } catch {
    return {};
  }
}
//@ chunk-e6aww6q8.js:4342000-4342192 placement
async function isInstalledListReplaceRefused(e) {
  try {
    let n = nE(e);
    return (
      Oct(
        isStorageV5Enabled() && e !== void 0 && n !== null
          ? await readInstalledPluginsViaStorage(e, n)
          : readInstalledPluginsFileRaw(getInstalledPluginsFilePath()),
      ),
      !1
    );
  } catch (error) {
    return (
      error instanceof InstalledListNotReplacedError &&
      (error.unreadRecordIds.length > 0 || error.formatVersion !== void 0)
    );
  }
}
/**
 * 以 latin1 读原始字节；不存在返回 null，读不了抛不可覆盖错误。
 */
//@ chunk-e6aww6q8.js:4342192-4342553 placement
function readInstalledPluginsFileRaw(e) {
  try {
    return Buffer.from(getFsImplementation().readFileSync(e, { encoding: "latin1" }), "latin1");
  } catch (error) {
    if (isENOENT(error)) return null;
    let r = getErrnoCode(error),
      s = isSyscallError(error) ? error.errno : void 0;
    throw Object.assign(
      new InstalledListNotReplacedError(
        [],
        void 0,
        `it could not be read first (${errorMessage(error)}), and a file that cannot be read is not replaced. Make it readable, then try again.`,
      ),
      r === void 0 ? {} : { code: r },
      s === void 0 ? {} : { errno: s },
    );
  }
}
/**
 * 写回 installed_plugins.json（V2），存储后端模式下经存储接口原子写。
 */
//@ chunk-e6aww6q8.js:4342553-4343100 fingerprint = saveInstalledPluginsV2 (0.547)
async function saveInstalledPluginsV2(e, n) {
  let r = nE(n);
  if (isStorageV5Enabled() && n !== void 0 && r !== null) {
    (await storageUpdateWithRetry(
      n,
      r,
      (y) => (
        assertInstalledPluginsReplaceable(y === void 0 ? null : Buffer.from(y.value), e),
        { write: Xse(e), result: !0 }
      ),
      storageSaveError,
    ),
      setInstalledPluginsCache(e),
      logForDebugging(
        `Saved ${Object.keys(e.plugins).length} installed plugins through the storage interface`,
      ));
    return;
  }
  let fs = getFsImplementation(),
    filePath = getInstalledPluginsFilePath();
  try {
    (fs.mkdirSync(getPluginsDirectory()),
      assertInstalledPluginsReplaceable(readInstalledPluginsFileRaw(filePath), e));
    let y = Xse(e);
    (writeAndPublishSync(filePath, y),
      (getPluginRegistry().installedPluginsFile = e),
      logForDebugging(`Saved ${Object.keys(e.plugins).length} installed plugins to ${filePath}`));
  } catch (error) {
    throw (
      logForDebugging(`Failed to save installed_plugins.json to ${filePath}: ${errorMessage(error)}`, {
        level: "error",
      }),
      logPluginStateFileError("save", error, !1),
      error
    );
  }
}
//@ chunk-e6aww6q8.js:4343100-4343460 layout
function storageSaveError(e) {
  let n = formatStorageError(e);
  logForDebugging(`Failed to save installed_plugins.json through the storage interface: ${n}`, {
    level: "error",
  });
  let r =
    e.code === "Failed" && e.cause instanceof Error
      ? attachErrnoFields(e.cause, e)
      : Object.assign(
          new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
            `Failed to save installed_plugins.json: ${n}`,
            "failed to save installed_plugins.json (v5 backend error)",
          ),
          { cause: e, ...errnoFieldsFromStorageError(e) },
        );
  return (logPluginStateFileError("save", r, !1), r);
}
//@ chunk-e6aww6q8.js:4343460-4343685 layout
function storageAccessError(e) {
  return e.code === "Failed" && e.cause instanceof Error
    ? attachErrnoFields(e.cause, e)
    : Object.assign(
        new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
          `installed_plugins.json: ${formatStorageError(e)}`,
          "installed_plugins.json storage access failed (v5 backend error)",
        ),
        { cause: e, ...errnoFieldsFromStorageError(e) },
      );
}
//@ chunk-e6aww6q8.js:4343685-4343742 layout
function attachErrnoFields(e, n) {
  return isSyscallError(e) ? e : Object.assign(e, errnoFieldsFromStorageError(n));
}
//@ chunk-e6aww6q8.js:4343742-4343785 layout
var ERRNO_BY_CODE = new Map(Object.entries(constants_8.errno));
//@ chunk-e6aww6q8.js:4343785-4343936 layout
function errnoFieldsFromStorageError(e) {
  let n = "telemetryCode" in e ? e.telemetryCode : void 0,
    r = n === void 0 ? void 0 : ERRNO_BY_CODE.get(n);
  return n === void 0 || r === void 0 ? void 0 : { code: n, errno: -r };
}
//@ chunk-e6aww6q8.js:4343936-4343958 layout
var STORAGE_UPDATE_MAX_ATTEMPTS = 5,
  storageUpdateBackoff = createJitteredBackoff(50);
//@ chunk-e6aww6q8.js:4343958-4344319 layout
async function updateInstalledPluginsViaStorage(e, n, r) {
  let s = await storageUpdateWithRetry(e, n, (h) => applyUpdateToStoredFile(h, r), storageSaveError);
  if (s.loadError !== void 0)
    (logForDebugging(`Failed to load installed plugins from disk: ${errorMessage(s.loadError)}`, {
      level: "error",
    }),
      logPluginStateFileError("load-from-disk", s.loadError, !0));
  if (s.written !== void 0)
    (setInstalledPluginsCache(s.written),
      logForDebugging(
        `Saved ${Object.keys(s.written.plugins).length} installed plugins through the storage interface`,
      ));
  return s.result;
}
//@ chunk-e6aww6q8.js:4344319-4344708 layout
async function storageUpdateWithRetry(e, n, r, s) {
  for (let h = 1; ; h++) {
    let update = await e.update(n, r, { mode: bys() });
    if (!update.ok) {
      if (
        update.error.code === "Unavailable" &&
        update.error.telemetryCode === "LockSuspect" &&
        h < STORAGE_UPDATE_MAX_ATTEMPTS
      ) {
        await (update.error.retryAfterMs !== void 0
          ? sleep(update.error.retryAfterMs)
          : storageUpdateBackoff(h));
        continue;
      }
      throw s(update.error);
    }
    let S = update.value.result;
    if (S === void 0) throw Error("installed plugins registry update settled without an outcome");
    return S;
  }
}
/**
 * 存储后端模式下把旧的 V1 installed_plugins.json 原地迁移为 V2 并刷新内存缓存。
 */
//@ chunk-e6aww6q8.js:4344708-4344862 layout
async function migrateStoredV1ToV2(e, n) {
  let r = await readInstalledPluginsFileRaw_2(e, n);
  if (r === null || r.version !== 1) return;
  let { converted: converted } = await storageUpdateWithRetry(e, n, convertStoredV1, storageAccessError);
  if (converted !== void 0) setInstalledPluginsCache(converted.data);
  return converted;
}
//@ chunk-e6aww6q8.js:4344862-4345201 layout
function convertStoredV1(e) {
  if (e === void 0) return { skip: !0, result: { converted: void 0 } };
  let n = parseInstalledPluginsJson(Buffer.from(e.value).toString("utf-8"));
  if (n.version !== 1) return { skip: !0, result: { converted: void 0 } };
  let parse = InstalledPluginsFileSchemaV1().parse(n.data),
    s = migrateV1ToV2(parse);
  return (
    assertInstalledPluginsReplaceable(Buffer.from(e.value)),
    {
      write: jsonStringify(s, null, 2),
      result: { converted: { data: s, v1PluginCount: Object.keys(parse.plugins).length } },
    }
  );
}
//@ chunk-e6aww6q8.js:4345201-4345509 layout
function applyUpdateToStoredFile(e, n) {
  let r = { version: 2, plugins: {} },
    s;
  if (e !== void 0)
    try {
      r = toInstalledPluginsV2(parseInstalledPluginsJson(Buffer.from(e.value).toString("utf-8")));
    } catch (error) {
      s = error;
    }
  let h = n(r);
  if (h.write && e !== void 0) assertInstalledPluginsReplaceable(Buffer.from(e.value));
  let y = { result: h.result, written: h.write ? r : void 0, loadError: s };
  return h.write ? { write: Xse(r), result: y } : { skip: !0, result: y };
}
/**
 * installed_plugins.json 的读-改-写入口：回调拿到当前文件，返回 {write, result}；write 为真时保存（存储后端模式下走带重试的 update）。
 */
//@ chunk-e6aww6q8.js:4345509-4345649 layout
async function updateInstalledPlugins(e, n) {
  let r = nE(n);
  if (isStorageV5Enabled() && n !== void 0 && r !== null) return updateInstalledPluginsViaStorage(n, r, e);
  let s = loadInstalledPluginsSync(),
    h = e(s);
  if (h.write) await saveInstalledPluginsV2(s);
  return h.result;
}
/**
 * 删除某插件在指定作用域/项目下的安装记录。
 */
//@ chunk-e6aww6q8.js:4345649-4345876 fingerprint = removePluginInstallation (0.661)
async function removePluginInstallation(e, n, r, s, h) {
  let y = await updateInstalledPlugins((entry) => removeInstallationFromFile(entry, e, n, r, h), s);
  if (y === "kept") return !1;
  if (y) {
    if ((logForDebugging(`Removed installation for ${e} at scope ${n}`), y.producerDirs.length > 0)) {
      for (let producerDir of y.producerDirs) recordProducerDir(producerDir, { emit: !1 });
      emitProducerDirsChanged();
    }
  }
}
/**
 * 从 V2 数据中删除指定作用域/项目的安装记录（给定期望记录不匹配时保留，返回 kept）。
 */
//@ chunk-e6aww6q8.js:4345876-4346380 layout
function removeInstallationFromFile(e, n, r, s, h) {
  let y = e.plugins[n];
  if (!y) return { write: !1, result: !1 };
  let found = y.find((q) => q.scope === r && q.projectPath === s);
  if (h !== void 0 && found !== void 0 && !registerPluginInstallation(found, h))
    return { write: !1, result: "kept" };
  let w = [],
    L = h === void 0 ? findMatchingInstallations(y, r, s) : void 0;
  if (
    ((e.plugins[n] = y.filter((q) => {
      let Z = L ? L.includes(q) : q.scope === r && q.projectPath === s;
      if (Z) {
        for (let Se of [q.sourceProducerPath, ...(q.previousProducerPaths ?? [])]) if (Se) w.push(Se);
      }
      return !Z;
    })),
    e.plugins[n].length === 0)
  )
    delete e.plugins[n];
  return { write: !0, result: { producerDirs: w } };
}
/**
 * 批量删除安装记录，有变化时清空全局快照。
 */
//@ chunk-e6aww6q8.js:4346380-4346491 layout
async function removeInstallationsAndRefreshSnapshot(e, n) {
  if (e.length === 0) return;
  if (await updateInstalledPlugins((s) => dropRenamedNonManagedInstallations(s, e), n))
    getPluginRegistry().installedPluginsSnapshot = null;
}
//@ chunk-e6aww6q8.js:4346491-4346739 layout
function dropRenamedNonManagedInstallations(e, n) {
  let r = !1;
  for (let { oldId: oldId, newId: newId } of n) {
    let y = e.plugins[oldId];
    if (!y) continue;
    let filtered = y.filter((w) => w.scope === "managed");
    if (filtered.length === y.length) continue;
    if (filtered.length > 0) e.plugins[oldId] = filtered;
    else delete e.plugins[oldId];
    r = !0;
  }
  return { write: r, result: r };
}
/**
 * 会话内固定的 installed_plugins 快照（首次读取后不再变）。
 */
//@ chunk-e6aww6q8.js:4346739-4346833 layout
function getInstalledPluginsSnapshot() {
  let e = getPluginRegistry();
  return ((e.installedPluginsSnapshot ??= getInstalledPlugins()), e.installedPluginsSnapshot);
}
/**
 * 同步读取 installed_plugins.json 并转为 V2；读不到文件返回空表，出错走统一的失败处理。
 */
//@ chunk-e6aww6q8.js:4346833-4346926 callgraph-fingerprint = getPendingUpdateCount (0.43)
function loadInstalledPluginsSync() {
  try {
    let memoryState = getPlan_2();
    return memoryState ? toInstalledPluginsV2(memoryState) : { version: 2, plugins: {} };
  } catch (error) {
    return loadInstalledPluginsFromDisk(error);
  }
}
/**
 * 读取 installed_plugins.json（有存储后端时经存储层）并转为 V2，不使用内存缓存。
 */
//@ chunk-e6aww6q8.js:4346926-4347089 callgraph-fingerprint = removeInstalledPlugin (0.228)
async function loadInstalledPlugins(pluginId) {
  let n = nE(pluginId);
  if (pluginId === void 0 || n === null || !isStorageV5Enabled()) return loadInstalledPluginsSync();
  try {
    let r = await readInstalledPluginsFileRaw_2(pluginId, n);
    return r ? toInstalledPluginsV2(r) : { version: 2, plugins: {} };
  } catch (error) {
    return loadInstalledPluginsFromDisk(error);
  }
}
//@ chunk-e6aww6q8.js:4347089-4347261 fingerprint = loadInstalledPluginsFromDisk (0.729)
function loadInstalledPluginsFromDisk(e) {
  let errorMsg = errorMessage(e);
  (logForDebugging(`Failed to load installed plugins from disk: ${errorMsg}`, { level: "error" }),
    logPluginStateFileError("load-from-disk", e, !0));
  let r = { version: 2, plugins: {} };
  return (failedInstalledPluginsReads.add(r), r);
}
/**
 * 插件更新后把磁盘上安装记录的 installPath/version/gitCommitSha/command 来源字段改成新值（找不到记录时报错）。
 */
//@ chunk-e6aww6q8.js:4347261-4348020 fingerprint = updateInstallationPathOnDisk (0.516)
async function updateInstallationPathOnDisk(e, n, r, s, h, y, S, w, L, G, q, Z) {
  let Se = w?.sourceCommand,
    ke = w?.sourceProducerPath,
    we = {
      newPath: s,
      newVersion: h,
      gitCommitSha: y,
      resolvedVersion: S,
      sourceCommand: Se,
      sourceProducerPath: ke,
      claudeAi: G,
      directoryRepositoryKey: q,
      npm: Z,
    };
  if (q !== void 0) await setDirectoryBinding(e, q, { keepExisting: !0 });
  let Ee = nE(L),
    Ae;
  if (isStorageV5Enabled() && L !== void 0 && Ee !== null)
    Ae = await updateInstalledPluginsViaStorage(L, Ee, (Ie) => updateInstallationRecord(Ie, e, n, r, we));
  else {
    let filePath = loadInstalledPluginsSync();
    if (((Ae = updateInstallationRecord(filePath, e, n, r, we).result), Ae === "updated"))
      (assertInstalledPluginsReplaceable(
        readInstalledPluginsFileRaw(getInstalledPluginsFilePath()),
        filePath,
      ),
        writeAndPublishSync(getInstalledPluginsFilePath(), Xse(filePath)),
        (getPluginRegistry().installedPluginsFile = null));
  }
  switch (Ae) {
    case "no-plugin":
      logForDebugging(`Cannot update ${e} on disk: plugin not found in installed plugins`);
      return;
    case "no-installation":
      logForDebugging(`Cannot update ${e} on disk: no installation for scope ${n}`);
      return;
    case "updated":
      logForDebugging(`Updated ${e} on disk to version ${h} at ${s}`);
  }
}
/**
 * 为插件目录市场安装的插件记录 directoryRepositoryKey（仓库名绑定）。
 */
//@ chunk-e6aww6q8.js:4348020-4348384 layout
async function recordDirectoryRepositoryKey(e, n, r, s, h) {
  {
    await setDirectoryBinding(e, s, { keepExisting: !0 });
    let y = (L) => {
        let G = qP(L.plugins[e], n, r);
        if (G && G.directoryRepositoryKey === void 0) G.directoryRepositoryKey = s;
        return { write: G !== void 0, result: G !== void 0 };
      },
      S = nE(h);
    if (isStorageV5Enabled() && h !== void 0 && S !== null) {
      await updateInstalledPluginsViaStorage(h, S, y);
      return;
    }
    let w = loadInstalledPluginsSync();
    if (y(w).write)
      (assertInstalledPluginsReplaceable(readInstalledPluginsFileRaw(getInstalledPluginsFilePath()), w),
        writeAndPublishSync(getInstalledPluginsFilePath(), Xse(w)),
        (getPluginRegistry().installedPluginsFile = null));
  }
}
//@ chunk-e6aww6q8.js:4348384-4349921 layout
function updateInstallationRecord(
  e,
  n,
  r,
  s,
  {
    newPath: newPath,
    newVersion: newVersion,
    gitCommitSha: gitCommitSha,
    resolvedVersion: resolvedVersion,
    sourceCommand: sourceCommand,
    sourceProducerPath: sourceProducerPath,
    claudeAi: claudeAi,
    directoryRepositoryKey: directoryRepositoryKey,
    npm: npm,
  },
) {
  let ke = e.plugins[n];
  if (!ke) return { write: !1, result: "no-plugin" };
  let we = qP(ke, r, s);
  if (we) {
    if (((we.installPath = newPath), we.version !== void 0)) we.version = newVersion;
    if (resolvedVersion !== void 0) we.resolvedVersion = resolvedVersion;
    else delete we.resolvedVersion;
    if (((we.lastUpdated = new Date().toISOString()), gitCommitSha === null)) delete we.gitCommitSha;
    else if (gitCommitSha !== void 0) we.gitCommitSha = gitCommitSha;
    if (npm !== void 0) {
      if (npm.npmVersionSpec !== void 0) we.npmVersionSpec = npm.npmVersionSpec;
      else delete we.npmVersionSpec;
      if (npm.npmResolved !== void 0) we.npmResolved = npm.npmResolved;
      else delete we.npmResolved;
      if (npm.npmIntegrity !== void 0) we.npmIntegrity = npm.npmIntegrity;
      else delete we.npmIntegrity;
      if (npm.npmRegistry !== void 0) we.npmRegistry = npm.npmRegistry;
      else delete we.npmRegistry;
    }
    if (claudeAi !== void 0)
      if (((we.claudeaiPluginId = claudeAi.claudeaiPluginId), claudeAi.archiveSha256 !== void 0))
        we.archiveSha256 = claudeAi.archiveSha256;
      else delete we.archiveSha256;
    if (directoryRepositoryKey !== void 0) we.directoryRepositoryKey = directoryRepositoryKey;
    if (sourceCommand !== void 0) we.sourceCommand = sourceCommand;
    else delete we.sourceCommand;
    if (sourceCommand !== void 0 && sourceProducerPath !== void 0) {
      let Ee = mergePreviousProducerPaths(we, sourceProducerPath);
      if (((we.sourceProducerPath = sourceProducerPath), Ee.length > 0)) we.previousProducerPaths = Ee;
      else delete we.previousProducerPaths;
    } else if (sourceCommand === void 0) {
      if (we.sourceProducerPath !== void 0)
        we.previousProducerPaths = [
          ...(we.previousProducerPaths ?? []).filter((Ee) => Ee !== we.sourceProducerPath),
          we.sourceProducerPath,
        ].slice(-MAX_PREVIOUS_PRODUCER_PATHS);
      delete we.sourceProducerPath;
    }
    return { write: !0, result: "updated" };
  }
  return { write: !1, result: "no-installation" };
}
/**
 * 启动时初始化版本化插件：迁移旧单文件格式、清理旧缓存布局、从 enabledPlugins 同步安装记录。
 */
//@ chunk-e6aww6q8.js:4349921-4350299 fingerprint = initializeVersionedPlugins (0.663)
async function initializeVersionedPlugins(e) {
  if (isStorageV5Enabled() && e !== void 0) await migrateToSinglePluginFile(e);
  else await migrateToSinglePluginFile();
  try {
    await migrateFromEnabledPlugins(e);
  } catch (error) {
    if (isSyscallError(error) || error instanceof SyntaxError)
      logForDebugging(`Plugin migration skipped (fs/parse error): ${errorMessage(error)}`, {
        level: "error",
      });
    else logError(error);
    logPluginStateFileError("migrate-from-enabled", error, !0);
  }
  if (isStorageV5Enabled() && e !== void 0) await primeInstalledPluginsCache(e);
  let data = getInstalledPluginsSnapshot();
  logForDebugging(`Initialized versioned plugins system with ${Object.keys(data.plugins).length} plugins`);
}
/**
 * 删除市场时移除该市场所有插件的安装记录，返回被孤立的缓存路径与受影响的插件 ID。
 */
//@ chunk-e6aww6q8.js:4350299-4350559 fingerprint = removeAllPluginsForMarketplace (0.701)
async function removeAllPluginsForMarketplace(e, n) {
  if (!e)
    return {
      orphanedPaths: [],
      removedPluginIds: [],
      sharedDataDirPluginIds: [],
      installPathsStillInUse: [],
    };
  let r = await updateInstalledPlugins((s) => removeMarketplacePluginRecords(s, e), n);
  for (let removedPluginId of r.removedPluginIds)
    logForDebugging(`Removed installed plugin for marketplace removal: ${removedPluginId}`);
  return r;
}
/**
 * 从安装记录中删除 id 以 @市场 结尾的全部插件，返回待写标志与结果：孤儿安装路径、删除的 id、 与其他插件共用数据目录的 id、仍被共用者使用的安装路径。
 */
//@ chunk-e6aww6q8.js:4350559-4351122 layout
function removeMarketplacePluginRecords(file, marketplaceName) {
  let suffix = `@${marketplaceName}`,
    orphanedPaths = new Set(),
    removedIds = [],
    marketplaceIds = new Set(Object.keys(file.plugins).filter((L) => L.endsWith(suffix))),
    filtered = [...marketplaceIds].filter((L) => QJn(L, file, marketplaceIds)),
    stillInUse = new Set();
  for (let L of marketplaceIds)
    for (let G of findDataDirSharers(L, file, marketplaceIds))
      for (let q of file.plugins[G] ?? []) if (q.installPath) stillInUse.add(q.installPath);
  for (let L of Object.keys(file.plugins)) {
    if (!L.endsWith(suffix)) continue;
    for (let G of file.plugins[L] ?? []) if (G.installPath) orphanedPaths.add(G.installPath);
    (delete file.plugins[L], removedIds.push(L));
  }
  return {
    write: removedIds.length > 0,
    result: {
      orphanedPaths: Array.from(orphanedPaths),
      removedPluginIds: removedIds,
      sharedDataDirPluginIds: filtered,
      installPathsStillInUse: Array.from(stillInUse),
    },
  };
}
/**
 * 安装记录是否与当前项目相关：user/managed 作用域总是；project/local 需 projectPath 等于当前工作目录。
 */
//@ chunk-e6aww6q8.js:4351122-4351306 fingerprint = isInstallationRelevantToCurrentProject (1)
function isInstallationRelevantToCurrentProject(inst) {
  if (inst.scope === "user" || inst.scope === "managed") return !0;
  let n = getOriginalCwd();
  if (inst.projectPath === n) return !0;
  if (!inst.projectPath) return !1;
  let r = GD(n);
  return r !== null && GD(inst.projectPath) === r;
}
//@ chunk-e6aww6q8.js:4351306-4351526 layout = isInstallationRelevantToCurrentProject (1)
function isInstallationRelevantToCurrentProject_2(inst) {
  if (inst.scope === "user" || inst.scope === "managed") return !0;
  if (!inst.projectPath) return !1;
  let n = getOriginalCwd();
  if (edr(inst.projectPath, n)) return !0;
  let r = GD(n);
  if (r === null) return !1;
  let s = GD(inst.projectPath);
  return s !== null && edr(s, r);
}
//@ chunk-e6aww6q8.js:4351526-4351564 layout
function isWindows() {
  return getPlatform() === "windows";
}
/**
 * 从一个插件的安装记录里筛出与当前项目相关的（user/managed 全局记录，或 project/local 且 projectPath 为当前目录）；Windows 下找不到时按路径的另一种拼写回退并记日志。
 */
//@ chunk-e6aww6q8.js:4351564-4351675 layout
function filterInstallationsForCurrentProject(e) {
  countRecordSpellings();
  let filtered = e.filter(isInstallationRelevantToCurrentProject);
  if (filtered.length > 0 || !isWindows()) return filtered;
  let filtered_2 = e.filter(isInstallationRelevantToCurrentProject_2);
  return (logRecordSpellingFallback(filtered_2[0]), filtered_2);
}
/**
 * 在一个插件的安装记录里找与当前项目相关的那条（Windows 路径拼写回退同 filterInstallationsForCurrentProject）。
 */
//@ chunk-e6aww6q8.js:4351675-4351779 layout
function findInstallationForCurrentProject(e) {
  countRecordSpellings();
  let found = e.find(isInstallationRelevantToCurrentProject);
  if (found !== void 0 || !isWindows()) return found;
  let found_2 = e.find(isInstallationRelevantToCurrentProject_2);
  return (logRecordSpellingFallback(found_2), found_2);
}
/**
 * 是否存在与当前项目相关的安装记录。
 */
//@ chunk-e6aww6q8.js:4351779-4351818 layout
function hasInstallationForCurrentProject(e) {
  return findInstallationForCurrentProject(e) !== void 0;
}
//@ chunk-e6aww6q8.js:4351818-4352285 layout
function countRecordSpellings() {
  let e = getPluginRegistry(),
    installedPluginsFile = e.installedPluginsFile;
  if (e.recordSpellingsCounted || installedPluginsFile === null || PF(installedPluginsFile) || !isWindows())
    return;
  e.recordSpellingsCounted = !0;
  let r = getOriginalCwd(),
    s = 0,
    h = 0;
  for (let y of Object.values(installedPluginsFile.plugins)) {
    let found = y.find((w) => (w.scope === "project" || w.scope === "local") && Umi(w, w.scope, r));
    if (found !== void 0) {
      if ((s++, y.some((w) => w.scope === found.scope && w.projectPath === r))) h++;
    }
  }
  logEvent("tengu_plugin_record_spelling", {
    kind: lit_2("registry"),
    plugins_with_other_spelling: s,
    plugins_with_both_spellings: h,
  });
}
//@ chunk-e6aww6q8.js:4352285-4352707 layout
function logRecordSpellingFallback(e) {
  if (e === void 0) return;
  let { scope: scope } = e;
  if (scope !== "project" && scope !== "local") return;
  logForDebugging(
    `Using the install record for ${e.projectPath} (${scope} scope) for this session in ${getOriginalCwd()}: the same folder or the same checkout, under another spelling of its path (gh-74612)`,
  );
  let r = getPluginRegistry();
  if (r.recordSpellingFallbackReported) return;
  ((r.recordSpellingFallbackReported = !0),
    logEvent("tengu_plugin_record_spelling", { kind: lit_2("fallback"), scope: fromEnum(scope) }));
}
/**
 * 取第一个已知版本并加 v 前缀（unknown 跳过）。
 */
//@ chunk-e6aww6q8.js:4352707-4352786 layout
function formatFirstKnownVersion(...e) {
  let found = e.find((r) => r && r !== "unknown");
  return found ? `v${found}` : void 0;
}
/**
 * 插件是否已安装（存在与当前项目相关的安装记录）。
 */
//@ chunk-e6aww6q8.js:4352786-4352913 fingerprint = isPluginInstalled (1)
function isPluginInstalled(pluginId) {
  let installations = getInstalledPlugins().plugins[pluginId];
  if (!installations || installations.length === 0) return !1;
  if (!hasInstallationForCurrentProject(installations)) return !1;
  return getSettings_DEPRECATED().enabledPlugins?.[pluginId] !== void 0;
}
/**
 * 插件是否以 user 或 managed 作用域全局安装。
 */
//@ chunk-e6aww6q8.js:4352913-4353085 fingerprint = isPluginGloballyInstalled (1)
function isPluginGloballyInstalled(pluginId) {
  let installations = getInstalledPlugins().plugins[pluginId];
  if (!installations || installations.length === 0) return !1;
  if (!installations.some((entry) => entry.scope === "user" || entry.scope === "managed")) return !1;
  return getSettings_DEPRECATED().enabledPlugins?.[pluginId] !== void 0;
}
/**
 * 当前项目相关安装记录的 gitCommitSha（多条记录 sha 不一致时返回 undefined）。
 */
//@ chunk-e6aww6q8.js:4353085-4353299 layout
function getInstalledGitCommitSha(e, n = {}) {
  let r = getInstalledPlugins().plugins[e];
  if (!r || r.length === 0) return;
  let s = filterInstallationsForCurrentProject(n.scope !== void 0 ? r.filter((y) => y.scope === n.scope) : r);
  if (new Set(s.map((y) => y.gitCommitSha)).size !== 1) return;
  return s[0]?.gitCommitSha;
}
/**
 * 新增或更新一条安装记录（scope、projectPath、installPath、version、gitCommitSha…）并保存。
 */
//@ chunk-e6aww6q8.js:4353299-4353602 fingerprint = addInstalledPlugin (0.595)
async function addInstalledPlugin(e, n, r = "user", s, h) {
  if ((Ect(e), n.directoryRepositoryKey !== void 0))
    await setDirectoryBinding(e, n.directoryRepositoryKey, { keepExisting: !0 });
  let { isUpdate: isUpdate, before: before } = await updateInstalledPlugins(
    (entry) => addPluginInstallation(entry, e, n, r, s),
    h,
  );
  return (
    (getPluginRegistry().installedPluginsSnapshot = null),
    logForDebugging(`${isUpdate ? "Updated" : "Added"} installed plugin: ${e} (scope: ${r})`),
    before
  );
}
/**
 * 在 V2 数据中为插件新增或替换一条安装记录（按作用域+projectPath 匹配），保留显式安装标记（auto 只在新记录或原本也是 auto 时保留）。
 */
//@ chunk-e6aww6q8.js:4353602-4354776 fingerprint = addPluginInstallation (0.369)
function addPluginInstallation(pluginId, scope, installPath, metadata, projectPath) {
  let y = pluginId.plugins[scope] || [],
    sliced = y.slice(),
    w = findInstallationIndex(y, metadata, projectPath),
    L = w >= 0 ? y[w].projectPath : projectPath,
    G = w >= 0 && y[w]?.auto !== !0,
    q = installPath.auto === !0 && !G,
    Z = {
      scope: metadata,
      installPath: installPath.installPath,
      version: installPath.version,
      installedAt: installPath.installedAt,
      lastUpdated: installPath.lastUpdated,
      gitCommitSha: installPath.gitCommitSha,
      ...(installPath.resolvedVersion && { resolvedVersion: installPath.resolvedVersion }),
      ...(L && { projectPath: L }),
      ...(q && { auto: !0 }),
      ...(installPath.claudeaiPluginId !== void 0 && { claudeaiPluginId: installPath.claudeaiPluginId }),
      ...(installPath.archiveSha256 !== void 0 && { archiveSha256: installPath.archiveSha256 }),
      ...(installPath.directoryRepositoryKey !== void 0
        ? { directoryRepositoryKey: installPath.directoryRepositoryKey }
        : {}),
      ...(installPath.sourceCommand !== void 0 && { sourceCommand: installPath.sourceCommand }),
      ...(installPath.sourceProducerPath !== void 0 && {
        sourceProducerPath: installPath.sourceProducerPath,
      }),
      ...(installPath.npmVersionSpec !== void 0 && { npmVersionSpec: installPath.npmVersionSpec }),
      ...(installPath.npmResolved !== void 0 && { npmResolved: installPath.npmResolved }),
      ...(installPath.npmIntegrity !== void 0 && { npmIntegrity: installPath.npmIntegrity }),
      ...(installPath.npmRegistry !== void 0 && { npmRegistry: installPath.npmRegistry }),
    },
    Se = w >= 0 ? y[w] : void 0;
  if (Se) {
    let we = mergePreviousProducerPaths(Se, Z.sourceProducerPath ?? "");
    if (we.length > 0) Z.previousProducerPaths = we;
  }
  let ke = w >= 0;
  if (ke) y[w] = Z;
  else y.push(Z);
  return ((pluginId.plugins[scope] = y), { write: !0, result: { isUpdate: ke, before: sliced } });
}
//@ chunk-e6aww6q8.js:4354890-4355072 placement
async function restoreEarlierInstallRecord(e, n, r, s) {
  let h = await updateInstalledPlugins((y) => getPendingUpdatesDetails(y, e, n, r), s);
  if (h)
    ((getPluginRegistry().installedPluginsSnapshot = null),
      logForDebugging(`Restored the earlier install record of ${e} (scope: ${n.scope})`));
  return h;
}
//@ chunk-e6aww6q8.js:4355072-4355307 placement
function getPendingUpdatesDetails(e, n, r, s) {
  let memoryInstallations = e.plugins[n],
    y = memoryInstallations?.findIndex((w) => w.scope === r.scope && w.projectPath === r.projectPath) ?? -1,
    S = y >= 0 ? memoryInstallations?.[y] : void 0;
  if (memoryInstallations === void 0 || S === void 0 || !registerPluginInstallation(S, s))
    return { write: !1, result: !1 };
  return ((memoryInstallations[y] = r), { write: !0, result: !0 });
}
/**
 * 去掉安装记录的 auto 标记（用户显式安装）。
 */
//@ chunk-e6aww6q8.js:4355307-4355420 placement
async function clearAutoInstalledFlag(e, n, r, s) {
  let h = await updateInstalledPlugins((y) => clearAutoFlagUpdate(y, e, n, r), s);
  if (h) getPluginRegistry().installedPluginsSnapshot = null;
  return h;
}
//@ chunk-e6aww6q8.js:4355420-4355558 placement
function clearAutoFlagUpdate(e, n, r, s) {
  let h = e.plugins[n],
    y = qP(h, r, s);
  if (y?.auto !== !0) return { write: !1, result: !1 };
  return (delete y.auto, { write: !0, result: !0 });
}
//@ chunk-e6aww6q8.js:4355558-4355614 placement
async function Bct(e, n = e) {
  return (await Yse(e, n)) ?? void 0;
}
//@ chunk-e6aww6q8.js:4355614-4355628 placement
var JIe = 65536;
/**
 * 从插件清单读取版本号，清单超过 64 KB 时视为无版本。
 */
//@ chunk-e6aww6q8.js:4355628-4356541 placement
async function readManifestVersion(e, n, r) {
  let s = getFsImplementation(),
    h = join_27(e, ".claude-plugin", "plugin.json"),
    y = isStorageV5Enabled() && r !== void 0 ? parseVersionCachePath(e, anchoredPluginCachePath()) : null;
  if (isStorageV5Enabled() && r !== void 0 && y) {
    let read = await r.read([
      {
        key: STORAGE_SPACES.pluginCache(y.marketplace, y.plugin, y.version, [
          ".claude-plugin",
          "plugin.json",
        ]),
        offset: 0,
        length: JIe,
      },
    ]);
    if (!read.ok || !read.value.items[0].found)
      return (logForDebugging(`Could not extract version from manifest for ${n}`), "unknown");
    let w = read.value.items[0];
    if (w.totalBytes > JIe)
      return (logForDebugging(`Manifest for ${n} exceeds 64 KB, treating as unversioned`), "unknown");
    try {
      return jsonParse(Wo(Buffer.from(w.value).toString("utf-8"))).version || "unknown";
    } catch {
      return (logForDebugging(`Could not extract version from manifest for ${n}`), "unknown");
    }
  }
  try {
    let fileBytes = await s.readFileBytes(h, JIe + 1);
    if (fileBytes.length > JIe)
      return (logForDebugging(`Manifest for ${n} exceeds 64 KB, treating as unversioned`), "unknown");
    return jsonParse(Wo(fileBytes.toString("utf-8"))).version || "unknown";
  } catch {
    return (logForDebugging(`Could not extract version from manifest for ${n}`), "unknown");
  }
}
/**
 * 启动时把 settings 的 enabledPlugins 与 installed_plugins.json 对齐：为已启用但无安装记录的市场插件补记录（或排队安装），跳过托管/种子/读失败情况。
 */
//@ chunk-e6aww6q8.js:4356541-4365369 fingerprint = migrateFromEnabledPlugins (0.464)
async function migrateFromEnabledPlugins(e) {
  if (await isInstalledListReplaceRefused(e)) {
    logForDebugging(
      "Skipping the enabled-plugins sync: installed_plugins.json holds what this build cannot read, so it is left as it is",
      { level: "warn" },
    );
    let pt = count(
      Object.values(getSettingsForSource("policySettings")?.enabledPlugins ?? {}),
      (Et) => Et === !0,
    );
    if (pt > 0)
      logEvent("tengu_plugin_state_file_error", {
        operation: lit_2("migrate-from-enabled"),
        error_kind: lit_2("policy-sync-skipped"),
        recovered: !1,
        required_count: pt,
      });
    return;
  }
  let settings = isRemoteSettingsFetchFailed(),
    r = new Set(
      Object.entries(getSettingsForSource("policySettings")?.enabledPlugins || {})
        .filter(([pt, Et]) => Et === !0 && PluginIdSchema().safeParse(pt).success)
        .map(([pt]) => pt),
    ),
    rawFileData = getOriginalCwd(),
    h = new Map(),
    pluginScopeFromSettings = new Set(),
    S,
    w = () => (S ??= isLocalSettingsGitTracked({ onIndeterminate: "tracked" }));
  for (let source of EDITABLE_SETTING_SOURCES) {
    let sourceSettings = getSettingsFilePathForSource(source);
    if (sourceSettings) {
      if (pluginScopeFromSettings.has(sourceSettings)) continue;
      pluginScopeFromSettings.add(sourceSettings);
    }
    let gt = getSettingsForSource(source)?.enabledPlugins || {};
    for (let pluginId of Object.keys(gt)) {
      if (!PluginIdSchema().safeParse(pluginId).success) continue;
      if (gt[pluginId] !== !0) continue;
      let It = source === "userSettings" || (source === "localSettings" && !w()),
        scope = settingsSourceName(source),
        qt = h.get(pluginId);
      h.set(pluginId, {
        scope: scope,
        projectPath: scope === "user" ? void 0 : rawFileData,
        fromOwnConfig: It || (qt?.fromOwnConfig ?? !1),
      });
    }
  }
  let L = new Set();
  for (let [pt, Et] of Object.entries(getSettingsForSource("flagSettings")?.enabledPlugins || {})) {
    if (Et !== !0 || !PluginIdSchema().safeParse(pt).success || isPluginBlockedByPolicy(pt)) continue;
    let yt = h.get(pt);
    if (yt) {
      if (!yt.fromOwnConfig) L.add(pt);
      yt.fromOwnConfig = !0;
      continue;
    }
    (h.set(pt, { scope: "user", projectPath: void 0, fromOwnConfig: !0 }), L.add(pt));
  }
  let G = nE(e),
    q =
      isStorageV5Enabled() && e !== void 0 && G !== null
        ? await readInstalledPluginsFileRaw_2(e, G)
        : getPlan_2(),
    Z = q !== null,
    ke = Z && q?.version === 2 && q ? tryParseInstalledPluginsV2(q.data) : void 0;
  if (ke?.success) normalizeInstallPaths(ke.data);
  let we = new Set();
  if (ke?.success && settings) {
    for (let [pt, Et] of Object.entries(ke.data.plugins))
      if (!r.has(pt) && !isPluginBlockedByPolicy(pt) && Et.some((yt) => yt.scope === "managed"))
        (we.add(pt), r.add(pt));
    if (we.size > 0)
      logForDebugging(
        `Remote managed settings not settled; keeping managed record(s) for ${[...we].join(", ")} as they are`,
      );
  }
  for (let pt of r) (h.set(pt, { scope: "managed", projectPath: void 0, fromOwnConfig: !0 }), L.delete(pt));
  let Ee = new Set([...L, ...r].filter((pt) => !we.has(pt))),
    Ae,
    Ie = () => (Ae ??= loadKnownMarketplacesSafe(isStorageV5Enabled() ? e : void 0));
  if (h.size === 0 && !Z) return;
  if (ke?.success) {
    let plugins = ke.data.plugins,
      Et = new Set(),
      filtered = [...r].filter((It) => (plugins[It]?.length ?? 0) === 0);
    if (filtered.length > 0) {
      let It = await Ie();
      for (let Yt of filtered) {
        let { marketplace: marketplace } = parsePluginIdentifier(Yt);
        if (isSourceDisallowedOrUnverifiable(marketplace ? It[marketplace]?.source : void 0)) Et.add(Yt);
      }
    }
    let all = [...h.entries()].every(([It, Yt]) => {
        let qt = plugins[It];
        if (r.has(It)) return Et.has(It) || we.has(It) || (qt?.length === 1 && qt[0]?.scope === "managed");
        let Zt = qP(qt, Yt.scope, Yt.projectPath) !== void 0;
        if (!Yt.fromOwnConfig) return !0;
        return Zt;
      }),
      all_2 = Object.entries(plugins).every(
        ([It, Yt]) => r.has(It) || !Yt.some((qt) => qt.scope === "managed"),
      );
    if (all && all_2) {
      let It = !0;
      for (let Yt of r) {
        if (Et.has(Yt) || we.has(Yt)) continue;
        let qt = plugins[Yt]?.[0];
        if (qt === void 0 || !(await parsePluginIdSafe(Yt, qt, e, Ie))) {
          It = !1;
          break;
        }
      }
      if (It) {
        logForDebugging("All plugins already exist, skipping migration");
        return;
      }
    }
  }
  logForDebugging(
    Z
      ? "Syncing installed_plugins.json with enabledPlugins from all settings.json files"
      : "Creating installed_plugins.json from settings.json files",
  );
  let Me = Ee.size > 0 ? await Ie() : void 0,
    iso = new Date().toISOString(),
    v2Plugins = {},
    lt;
  if (Z)
    ((lt =
      isStorageV5Enabled() && e !== void 0 && G !== null
        ? await getInstalledPluginsAsync(e)
        : getInstalledPlugins()),
      (v2Plugins = { ...lt.plugins }));
  let Je = 0,
    nt = 0;
  for (let [pt, Et] of Object.entries(v2Plugins)) {
    if (r.has(pt)) continue;
    if (h.has(pt)) continue;
    if (!Et.some((gt) => gt.scope === "managed")) continue;
    let filtered = Et.filter((gt) => gt.scope !== "managed");
    if (!(await ensureDirectoryBindingForMigration(pt, Et, filtered))) {
      logForDebugging(
        `Kept the managed entries of ${pt} though policy no longer requires them: removing them needs plugin-directory-bindings.json in the plugins folder to record which repository the plugin was installed from, and that file could not be used or written. Will try again at next start.`,
        { level: "warn" },
      );
      continue;
    }
    if (filtered.length === 0) delete v2Plugins[pt];
    else v2Plugins[pt] = filtered;
    (Je++, logForDebugging(`Dropped orphaned managed entry for ${pt} (no longer policy-required)`));
  }
  for (let [pt, Et] of h) {
    if (we.has(pt)) continue;
    let yt = v2Plugins[pt];
    if (yt && yt.length > 0) {
      let gt = !1;
      if (Et.scope === "managed") {
        let At = yt[0];
        if (At && !(await parsePluginIdSafe(pt, At, e, Ie))) {
          let It = await healManagedRecord(pt, Me, e);
          if (It !== void 0) {
            if (((At.installPath = It.installPath), (At.version = It.version), It.gitCommitSha !== void 0))
              At.gitCommitSha = It.gitCommitSha;
            else if (!It.keepStoredCommit) delete At.gitCommitSha;
            (delete At.resolvedVersion,
              (At.lastUpdated = iso),
              (gt = !0),
              logForDebugging(`Healed ${pt} managed record from its marketplace at version ${It.version}`));
          } else
            logForDebugging(
              `Left ${pt} managed record as is: the loader cannot load from its cache and it could not be materialized`,
            );
        }
        if (At && (At.scope !== "managed" || At.projectPath !== void 0))
          ((At.scope = "managed"),
            delete At.projectPath,
            (At.lastUpdated = iso),
            (gt = !0),
            logForDebugging(`Updated ${pt} scope to managed (settings.json is source of truth)`));
        if (yt.length > 1) {
          let sliced = yt.slice(0, 1);
          if (await ensureDirectoryBindingForMigration(pt, yt, sliced))
            (logForDebugging(`Collapsed ${pt} to single managed entry (was ${yt.length})`),
              (v2Plugins[pt] = sliced),
              (gt = !0));
          else
            logForDebugging(
              `Did not collapse ${pt} to one managed entry (has ${yt.length}): removing the others needs plugin-directory-bindings.json in the plugins folder to record which repository the plugin was installed from, and that file could not be used or written. Will try again at next start.`,
              { level: "warn" },
            );
        }
      } else {
        let At = qP(yt, Et.scope, Et.projectPath),
          It = !1;
        if (!At && Et.fromOwnConfig && L.has(pt)) {
          let { marketplace: marketplace } = parsePluginIdentifier(pt),
            rn = marketplace ? Me?.[marketplace]?.source : void 0;
          It = isPluginBlockedByPolicy(pt) || isSourceDisallowedOrUnverifiable(rn);
        }
        if (!At && !Et.fromOwnConfig)
          logForDebugging(
            `Skipped auto-recording ${pt} for ${Et.scope} (${Et.projectPath ?? ""}) \u2014 enabled only by repo-authored settings`,
          );
        else if (!At && It)
          logForDebugging(`Skipping --settings-enabled ${pt}: blocked by policy, not writing a record`);
        else if (!At) {
          let Zt =
            yt.find((rn) => rn.projectPath !== void 0 && rn.projectPath === rawFileData) ??
            yt.find((rn) => rn.scope === "user") ??
            yt.find((rn) => rn.projectPath !== void 0 && edr(rn.projectPath, rawFileData)) ??
            yt.reduce((rn, pn) => ((pn.lastUpdated ?? "") > (rn.lastUpdated ?? "") ? pn : rn));
          (yt.push({
            scope: Et.scope,
            installPath: Zt.installPath,
            ...(Zt.version !== void 0 && { version: Zt.version }),
            ...(Zt.resolvedVersion !== void 0 && { resolvedVersion: Zt.resolvedVersion }),
            installedAt: iso,
            lastUpdated: iso,
            ...(Zt.gitCommitSha !== void 0 && { gitCommitSha: Zt.gitCommitSha }),
            ...(Zt.sourceCommand !== void 0 && { sourceCommand: Zt.sourceCommand }),
            ...(Zt.sourceProducerPath !== void 0 && { sourceProducerPath: Zt.sourceProducerPath }),
            ...(Zt.previousProducerPaths !== void 0 && { previousProducerPaths: Zt.previousProducerPaths }),
            ...(Et.projectPath && { projectPath: Et.projectPath }),
          }),
            (gt = !0),
            logForDebugging(
              `Added ${pt} installation for scope ${Et.scope}${Et.projectPath ? ` (${Et.projectPath})` : ""}`,
            ));
        }
        let Yt = new Set(),
          filtered = yt.filter((Zt) => {
            if (Zt.scope === "managed") return !1;
            let rn = `${Zt.scope}|${Zt.projectPath ?? ""}`;
            if (Yt.has(rn)) return !1;
            return (Yt.add(rn), !0);
          });
        if (filtered.length < yt.length)
          if (await ensureDirectoryBindingForMigration(pt, yt, filtered)) {
            if (
              (logForDebugging(
                `Cleaned ${pt} (${yt.length}\u2192${filtered.length}: stale managed and/or duplicates)`,
              ),
              filtered.length === 0)
            )
              delete v2Plugins[pt];
            else v2Plugins[pt] = filtered;
            gt = !0;
          } else
            logForDebugging(
              `Kept ${yt.length - filtered.length} stale managed or duplicate entries of ${pt}: removing them needs plugin-directory-bindings.json in the plugins folder to record which repository the plugin was installed from, and that file could not be used or written.`,
              { level: "warn" },
            );
      }
      if (gt) Je++;
    } else {
      if (!Et.fromOwnConfig) {
        logForDebugging(`Skipped auto-recording ${pt} \u2014 enabled only by repo-authored settings`);
        continue;
      }
      let { name: pluginName, marketplace: marketplace } = parsePluginIdentifier(pt);
      if (!pluginName || !marketplace) continue;
      try {
        logForDebugging(`Looking up plugin ${pt} in marketplace ${marketplace}`);
        let It =
          marketplace === OFFICIAL_MARKETPLACE_NAME
            ? await getPluginByIdCacheOnly(pt, e)
            : await getPluginById(pt, e);
        if (!It) {
          logForDebugging(`Plugin ${pt} not found in any marketplace, skipping`);
          continue;
        }
        let { entry: entry, marketplaceInstallLocation: marketplaceInstallLocation } = It,
          Zt;
        if (Ee.has(pt)) {
          if (
            ((Zt = Me?.[marketplace]?.source),
            isPluginBlockedByPolicy(pt) || isSourceDisallowedOrUnverifiable(Zt))
          ) {
            logForDebugging(`Skipping ${pt}: blocked by policy, not writing a record`);
            continue;
          }
        }
        let rn,
          pn,
          no = void 0;
        if (typeof entry.source === "string") {
          let hn = await cacheAndRegisterPlugin(
            pt,
            entry,
            entry.source,
            marketplaceInstallLocation,
            Me,
            Ee.has(pt) && !L2e(entry.source, Zt),
            e,
          );
          if (hn === void 0) continue;
          ({ installPath: rn, version: pn, gitCommitSha: no } = hn);
        } else {
          let hn = dirname_17(getVersionedCachePath(pt, "x")),
            ho;
          try {
            ho = (await getFsImplementation().readdir(hn))
              .filter((bo) => bo.isDirectory() && !l7(bo.name))
              .map((bo) => bo.name);
          } catch (error) {
            if (!isENOENT(error)) throw error;
            logForDebugging(`External plugin ${pt} not in cache, skipping`);
            continue;
          }
          if (Ee.has(pt)) {
            let bo = [];
            for (let vn of ho) if (await pluginInstallPathExists(join_27(hn, vn), e)) bo.push(vn);
            ho = bo;
          }
          if (ho.length === 0) {
            logForDebugging(`External plugin ${pt} has no cached versions, skipping`);
            continue;
          }
          let yn = entry.version ? getVersionedCachePath(pt, entry.version) : void 0,
            Kn = yn && ho.includes(basename_9(yn)) ? yn : join_27(hn, ho[0]),
            Xn = basename_9(Kn);
          rn = Kn;
          let fo = typeof entry.source === "string" || getPluginCloneUrl(entry.source) !== null;
          no = fo ? await Bct(Kn) : void 0;
          let To =
            isGitShaVersionName({
              isGitBacked: fo,
              sourceHasPinnedSha: "sha" in entry.source && !!entry.source.sha,
              entryHasVersion: !!entry.version,
              versionName: Xn,
            }) && (await readManifestVersion(Kn, pt, e)) === "unknown";
          if (((pn = To ? void 0 : Xn), To))
            logForDebugging(
              `External plugin ${pt} is ref-tracked (cache dir ${Xn} is a git SHA, no manifest version), recording without a version so the loader re-clones it each load`,
            );
        }
        ((v2Plugins[pt] = [
          {
            scope: Et.scope,
            installPath: rn,
            ...(pn !== void 0 && { version: pn }),
            installedAt: iso,
            lastUpdated: iso,
            gitCommitSha: no,
            ...(Et.projectPath && { projectPath: Et.projectPath }),
          },
        ]),
          nt++,
          logForDebugging(`Added ${pt} with scope ${Et.scope}`));
      } catch (error) {
        logForDebugging(`Failed to add plugin ${pt}: ${error}`);
      }
    }
  }
  if (!Z || Je > 0 || nt > 0) {
    let v2Data = { version: 2, plugins: v2Plugins };
    if (lt !== void 0) yys(lt, v2Data);
    (await saveInstalledPluginsV2(v2Data, e),
      logForDebugging(`Sync completed: ${nt} added, ${Je} updated in installed_plugins.json`));
  }
}
//@ chunk-e6aww6q8.js:4365369-4365510 affinity
function isGitShaVersionName({
  isGitBacked: isGitBacked,
  sourceHasPinnedSha: sourceHasPinnedSha,
  entryHasVersion: entryHasVersion,
  versionName: versionName,
}) {
  return (
    isGitBacked &&
    !sourceHasPinnedSha &&
    !entryHasVersion &&
    /^[0-9a-f]{12}(-[0-9a-f]{8})?$/.test(versionName)
  );
}
/**
 * 从插件目录 .claude-plugin/plugin.json 读 version（存储后端模式下经存储层读）。
 */
//@ chunk-e6aww6q8.js:4373603-4374071 fingerprint = getPluginVersionFromManifest (0.817)
async function getPluginVersionFromManifest(e, n, r) {
  if (isStorageV5Enabled() && n !== void 0 && r !== null) {
    let G = await readPluginManifestViaStorage(n, r);
    return G === void 0 ? void 0 : readManifestBinaries(G);
  }
  let s = join_120(e, ".claude-plugin");
  if (!(await lstat_37(s).catch(() => null))?.isDirectory()) return;
  let y = join_120(s, "plugin.json");
  if (!(await lstat_37(y).catch(() => null))?.isFile()) return;
  let w, L;
  try {
    L = await open_23(y, $c());
    let stats = await L.stat();
    if (!stats.isFile() || stats.size > ONE_MIB) return;
    w = await L.readFile({ encoding: "utf-8" });
  } catch {
    return;
  } finally {
    await L?.close().catch(() => {
      return;
    });
  }
  return readManifestBinaries(w);
}
//@ chunk-e6aww6q8.js:4374071-4374185 placement
function readManifestBinaries(e) {
  let n;
  try {
    n = jsonParse(Wo(e));
  } catch {
    return;
  }
  if (typeof n !== "object" || n === null) return;
  return parsePluginBinaries(n.binaries);
}
/**
 * 经 v5 存储读缓存版本里的 plugin.json（≤1 MiB）。
 */
//@ chunk-e6aww6q8.js:4374185-4374535 placement
async function readPluginManifestViaStorage(e, n) {
  let scopeKind = await e.scopeKind({ ...n, relPath: [".claude-plugin"] });
  if (!scopeKind.ok || scopeKind.value.kind !== "directory") return;
  let text = await e.readText([
    {
      key: STORAGE_SPACES.pluginCache(n.marketplace, n.plugin, n.version, [".claude-plugin", "plugin.json"]),
      offset: 0,
      length: ONE_MIB + 1,
    },
  ]);
  if (!text.ok) return;
  let [h] = text.value.items;
  if (!h.found || h.totalBytes > ONE_MIB) return;
  return h.value;
}

export {
  loadInstalledPlugins,
  loadInstalledPluginsSync,
  filterInstallationsForCurrentProject,
  getInstalledGitCommitSha,
  getInstalledPlugins,
  isPluginInstalled,
  listInstalledPluginIds,
  PF,
  hasInstallationForCurrentProject,
  getInstalledListRefusal,
  readInstalledPluginsFile,
  clearAutoInstalledFlag,
  formatInvalidPluginIdMessage,
  isInstallationRelevantToCurrentProject,
  addInstalledPlugin,
  removePluginInstallation,
  findDataDirSharers,
  QJn,
  primeInstalledPluginsCache,
  findInstallationForCurrentProject,
  recordDirectoryRepositoryKey,
  updateInstallationPathOnDisk,
  removeInstallationsAndRefreshSnapshot,
  getInstalledPluginsSnapshot,
  readInstalledPluginsLenient,
  getInstalledPluginsAsync,
  initializeVersionedPlugins,
  clearInstalledPluginsCache,
  getInstalledPluginsFilePath,
  parseInstalledPluginsJson,
  formatFirstKnownVersion,
  listSetAsideFiles,
  listUnreadableKeptFiles,
  removeAllPluginsForMarketplace,
  getInstalledPluginsMap,
  readManifestVersion,
  vct,
  restoreEarlierInstallRecord,
  getPluginVersionFromManifest,
  Ect,
  Bct,
  isPluginGloballyInstalled,
};
