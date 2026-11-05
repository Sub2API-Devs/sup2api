/**
 * utils/plugins/installedPluginsManager.ts
 *
 * installed_plugins.json（V2：插件 ID → 各作用域安装记录）的读写、迁移、内存缓存与按当前项目筛选。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/utils/plugins/installedPluginsManager.ts
 * pieces: chunk-5xgkngpb.js (112)
 * attribution: fingerprint 21, layout 54, callgraph-fingerprint 3, placement 33, affinity 1
 */
import { join, resolve as resolve_2, sep, dirname, basename } from "path";
import { createHash } from "crypto";
import { openSync, constants, fstatSync, lstatSync, readSync, closeSync } from "fs";
import { constants as constants_8 } from "os";
import { lstat, open } from "fs/promises";
import {
  getPluginsDirectory,
  relocateInstallPath,
  setAsideFileName,
  pluginDataDirPath,
  pluginRegistrySpace,
  unreadableKeptFileName,
  isUnreadableKeptFileName,
  isSetAsideFileName,
  parseVersionCachePath,
  isLocalMarketplaceEntry,
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
  pluginManifestPathSchemas,
  isValidPluginIdSegment,
  PluginIdSchema,
  parseInstalledPluginsV2Leniently,
  MAX_PREVIOUS_PRODUCER_PATHS,
  ONE_MIB,
  parsePluginBinaries,
} from "./schemas.js";
import { syncTarget } from "../atomicPublishWrite.js";
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
import { regExp as regExp_21 } from "./commandSource.js";
import {
  classifyDirEntrySafe,
  removeDirectoryTreeNoFollow as removeDirectoryTreeNoFollow_2,
} from "../fsRemove.js";
import {
  seedDirFor,
  loadKnownMarketplacesSafe,
  getPluginByIdCacheOnly,
  getPluginById,
} from "./marketplaceManager.js";
import { countCharInString } from "../stringUtils.js";
import { quotedPrintable, truncateWithEllipsis as truncateWithEllipsis_2 } from "../printableName.js";
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
import {
  findMatchingInstallations,
  installationAtTarget,
  isSameNormalizedProjectPath,
  isStaleInstallTarget,
  findInstallationIndex,
} from "./dependencyResolver.js";
import { setDirectoryBinding, ensureDirectoryBindingForMigration } from "./pluginDirectoryBindings.js";
import { storageRootFor } from "../settings/settingsStorage.js";
import { getPlatform } from "../platform.js";
import {
  getSettings_DEPRECATED,
  getSettingsForSource,
  getSettingsFilePathForSource,
} from "../settings/settings.js";
import { pluginGitHead, getPluginCloneUrl } from "./pluginVersioning.js";
import { STORAGE_SPACES } from "../storage/storageSpaces.js";
import { stripBom } from "../json.js";
import { countWhere } from "../collections.js";
import { isRemoteSettingsFetchFailed } from "../../services/cloudSessions/eligibility.js";
import { isLocalSettingsGitTracked } from "../config.js";
import { EDITABLE_SETTING_SOURCES } from "../settings/constants.js";
import { settingsSourceName } from "../settings/settingsSourceTrust.js";
import { isPluginBlockedByPolicy, isSourceDisallowedOrUnverifiable } from "./marketplacePolicy.js";
import { parsePluginIdentifier } from "./pluginIdentifier.js";
import { OFFICIAL_MARKETPLACE_NAME } from "./officialMarketplaceNames.js";
import { isTempSiblingName } from "./pluginCacheMaterialize.js";
import { readOnlyNoFollowFlags } from "../platformTargets.js";
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-5xgkngpb.js:4432658-4432713 fingerprint (2.1.88 match: getInstalledPluginsFilePath, 1)
/**
 * installed_plugins.json 路径：<plugins 目录>/installed_plugins.json。
 */
function getInstalledPluginsFilePath() {
  return join(getPluginsDirectory(), "installed_plugins.json");
}
//@ chunk-5xgkngpb.js:4432713-4432772 fingerprint (2.1.88 match: getInstalledPluginsV2FilePath, 1)
function getInstalledPluginsV2FilePath() {
  return join(getPluginsDirectory(), "installed_plugins_v2.json");
}
//@ chunk-5xgkngpb.js:4432772-4432921 fingerprint (2.1.88 match: clearInstalledPluginsCache, 0.595)
/**
 * 清掉 installed_plugins 的内存缓存（全局 installedPluginsFile 与快照），下次读取会重新加载。
 */
function clearInstalledPluginsCache() {
  let pluginRegistry = getPluginRegistry();
  pluginRegistry.installedPluginsFile = null;
  pluginRegistry.installedPluginsSnapshot = null;
  pluginRegistry.installedPluginsEpoch++;
  logForDebugging("Cleared installed plugins cache");
}
//@ chunk-5xgkngpb.js:4432921-4432999 layout
function setInstalledPluginsCache(installedPluginsFile) {
  let pluginRegistry = getPluginRegistry();
  pluginRegistry.installedPluginsFile = installedPluginsFile;
  pluginRegistry.installedPluginsEpoch++;
}
//@ chunk-5xgkngpb.js:4432999-4433038 layout
var UNPARSEABLE_RECORD_IDS; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-5xgkngpb.js:4432999", () => {
  UNPARSEABLE_RECORD_IDS = Symbol("unparseableRecordIds");
});
//@ chunk-5xgkngpb.js:4433038-4433194 layout
/**
 * 在错误对象上附加无法解析的记录 ID 列表（不可枚举属性）。
 */
function markUnparseableRecords(firstUnparseableError, recordIds) {
  let error = firstUnparseableError ?? Error("a record under a valid plugin id could not be parsed");
  Object.defineProperty(error, UNPARSEABLE_RECORD_IDS, {
    value: [...recordIds],
    enumerable: false,
  });
  return error;
}
//@ chunk-5xgkngpb.js:4433194-4433250 layout
/**
 * 读取错误对象上的无法解析记录 ID 列表。
 */
function getUnparseableRecordIds(error) {
  return error instanceof Error ? error[UNPARSEABLE_RECORD_IDS] : undefined;
}
//@ chunk-5xgkngpb.js:4433250-4433547 layout
/**
 * 记录插件状态文件错误遥测 tengu_plugin_state_file_error（操作、错误种类：无法解析的记录/未替换/JSON 语法…）。
 */
function logPluginStateFileError(operation, error, recovered) {
  logEvent("tengu_plugin_state_file_error", {
    operation: fromEnum(operation),
    error_kind:
      getUnparseableRecordIds(error) !== undefined
        ? lit_2("unparsed-record")
        : error instanceof InstalledListNotReplacedError
          ? (sanitizeErrnoForTelemetry(error) ?? lit_2("not-replaced"))
          : error instanceof SyntaxError
            ? lit_2("syntax-error")
            : error instanceof Error && error.name === "ZodError"
              ? lit_2("validation-error")
              : (sanitizeErrnoForTelemetry(error) ?? lit_2("unknown")),
    recovered,
  });
}
//@ chunk-5xgkngpb.js:4433547-4435122 fingerprint (2.1.88 match: migrateToSinglePluginFile, 0.69)
/**
 * 一次性迁移：把旧的 installed_plugins_v2.json 与旧版单文件合并成单一 installed_plugins.json（V2 形状），不会覆盖已有列表。
 */
async function migrateToSinglePluginFile(storageV5) {
  let fs = getPluginRegistry();
  if (fs.installedPluginsMigrated) return;
  let mainFilePath = getFsImplementation();
  let mainFilePath_2 = getInstalledPluginsFilePath();
  let v2Data = getInstalledPluginsV2FilePath();
  let storageKey = installedStorageKey(storageV5);
  let cleanupPromise;
  try {
    let renamed = false;
    let mainReplaceable = false;
    let v2Present = true;
    try {
      let installedPluginsFileRaw = readInstalledPluginsFileRaw(mainFilePath_2);
      try {
        v2Present = readInstalledPluginsFileRaw(v2Data) !== null;
      } catch {}
      if (v2Present) assertInstalledPluginsReplaceable_2(installedPluginsFileRaw);
      else assertInstalledPluginsReplaceable(installedPluginsFileRaw);
    } catch (error) {
      if (!(error instanceof InstalledListNotReplacedError)) throw error;
      mainReplaceable = true;
    }
    try {
      if (mainReplaceable || !v2Present)
        throw Object.assign(Error("nothing is renamed over the list"), {
          code: "ENOENT",
        });
      mainFilePath.renameSync(v2Data, mainFilePath_2);
      renamed = true;
    } catch (error) {
      let errnoCode = getErrnoCode(error);
      if (errnoCode !== "ENOENT" && errnoCode !== "EEXIST") throw error;
      if (errnoCode === "EEXIST")
        try {
          mainFilePath.unlinkSync(v2Data);
        } catch {}
    }
    if (renamed) {
      logForDebugging("Renamed installed_plugins_v2.json to installed_plugins.json");
      if (isStorageV5Enabled() && storageV5 !== undefined && storageKey !== null) {
        let installedPluginsEpoch = fs.installedPluginsEpoch;
        let rawData = await readInstalledPluginsFileRaw_2(storageV5, storageKey);
        if (rawData !== null) {
          let installedPluginsV2 = loadInstalledPluginsV2(rawData);
          if (fs.installedPluginsEpoch === installedPluginsEpoch)
            fs.installedPluginsFile = installedPluginsV2;
          await cleanupLegacyCache(installedPluginsV2);
        }
      } else cleanupPromise = cleanupLegacyCache(getInstalledPlugins());
      fs.installedPluginsMigrated = true;
      await cleanupPromise;
      return;
    }
    if (isStorageV5Enabled() && storageV5 !== undefined && storageKey !== null) {
      let migrated = await migrateStoredV1ToV2(storageV5, storageKey);
      if (migrated !== undefined) {
        logForDebugging(
          `Converted installed_plugins.json from V1 to V2 format (${migrated.v1PluginCount} plugins)`,
        );
        await cleanupLegacyCache(migrated.data);
      }
      fs.installedPluginsMigrated = true;
      return;
    }
    let mainContent;
    try {
      mainContent = mainFilePath.readFileSync(mainFilePath_2, {
        encoding: "utf-8",
      });
    } catch (e) {
      if (!isENOENT(e)) throw e;
      fs.installedPluginsMigrated = true;
      return;
    }
    let mainData = jsonParse(mainContent);
    if ((typeof mainData?.version === "number" ? mainData.version : 1) === 1) {
      let v1Data = InstalledPluginsFileSchemaV1().parse(mainData);
      let v2Data = migrateV1ToV2(v1Data);
      assertInstalledPluginsReplaceable_2(readInstalledPluginsFileRaw(mainFilePath_2));
      syncTarget(mainFilePath_2, jsonStringify(v2Data, null, 2));
      logForDebugging(
        `Converted installed_plugins.json from V1 to V2 format (${Object.keys(v1Data.plugins).length} plugins)`,
      );
      cleanupPromise = cleanupLegacyCache(v2Data);
    }
    fs.installedPluginsMigrated = true;
  } catch (error) {
    let errorMsg = errorMessage(error);
    logForDebugging(`Failed to migrate plugin files: ${errorMsg}`, {
      level: "error",
    });
    if (!isSyscallError(error) && !(error instanceof SyntaxError)) logError(toError(error));
    logPluginStateFileError("migrate-single-file", error, true);
    fs.installedPluginsMigrated = true;
  }
  await cleanupPromise;
}
//@ chunk-5xgkngpb.js:4435122-4436435 fingerprint (2.1.88 match: cleanupLegacyCache, 0.4)
/**
 * 清理旧版“扁平缓存”目录（非版本化布局）中不再被任何安装记录引用的插件目录；installed_plugins 读不到时跳过。
 */
async function cleanupLegacyCache(v2Data) {
  if (hasFailedInstalledPluginsRead(v2Data)) {
    logForDebugging(
      "Skipping legacy cache cleanup: installed_plugins.json could not be read, so which flat folders are still referenced is not known",
    );
    return;
  }
  let fs = getFsImplementation();
  let cachePath = anchoredPluginCachePath();
  try {
    let referencedPaths = new Set();
    let walkRoot = wslWalkRootOf(cachePath);
    if (walkRoot === "undeterminable") {
      logForDebugging(
        "Skipping legacy cache cleanup: the cache root volume could not be read to map its WSL companion views",
      );
      return;
    }
    for (let installations of Object.values(v2Data.plugins))
      for (let entry of installations) {
        referencedPaths.add(normalizePathForPlatform(resolve_2(getOriginalCwd(), entry.installPath)));
        let classified = classifyMarketplacePath(entry.installPath);
        if (!classified.suspect)
          referencedPaths.add(
            normalizePathForPlatform(
              toComparablePath(classified.absolute, {
                foldCase: true,
                knownNotSuspect: true,
              }),
            ),
          );
        let alternatePlatformPath = toAlternatePlatformPath(entry.installPath, walkRoot);
        if (alternatePlatformPath !== undefined)
          referencedPaths.add(normalizePathForPlatform(alternatePlatformPath));
      }
    let referencedList = [...referencedPaths];
    let entries = await fs.readdir(cachePath);
    for (let dirent of entries) {
      let entry = dirent.name;
      if (regExp_21.test(entry)) continue;
      let entryPath = join(cachePath, entry);
      try {
        if (!(await classifyDirEntrySafe(cachePath, dirent))?.isDirectory) continue;
        let entries = await fs.readdir(entryPath);
        let hasInstalledContent = false;
        for (let entry of entries) {
          if (!(await classifyDirEntrySafe(entryPath, entry))?.isDirectory) continue;
          let pluginDir = join(entryPath, entry.name);
          let entries = await fs.readdir(pluginDir);
          for (let entry of entries)
            if (entry.name.endsWith(".zip") || (await classifyDirEntrySafe(pluginDir, entry))?.isDirectory) {
              hasInstalledContent = true;
              break;
            }
          if (hasInstalledContent) break;
        }
        if (hasInstalledContent) continue;
        let isReferenced = (subDirent) =>
          referencedPaths.has(subDirent) ||
          referencedList.some((vDirent) => vDirent.startsWith(subDirent + sep));
        if (!(
          isReferenced(normalizePathForPlatform(entryPath)) ||
          isReferenced(
            normalizePathForPlatform(
              toComparablePath(entryPath, {
                foldCase: true,
              }),
            ),
          )
        )) {
          await removeDirectoryTreeNoFollow_2(entryPath);
          logForDebugging(`Cleaned up legacy cache directory: ${entry}`);
        }
      } catch (error) {
        logForDebugging(`Skipping legacy cache entry ${entry}: ${errorMessage(error)}`, {
          level: "warn",
        });
      }
    }
  } catch (error) {
    let errorMsg = errorMessage(error);
    logForDebugging(`Failed to clean up legacy cache: ${errorMsg}`, {
      level: "warn",
    });
  }
}
//@ chunk-5xgkngpb.js:4436582-4436855 callgraph-fingerprint (2.1.88 match: readInstalledPluginsFileRaw, 0.32)
async function readInstalledPluginsFileRaw_2(storageV5, storageKey) {
  let readResult = await storageV5.read([storageKey]);
  if (!readResult.ok) throw storageAccessError(readResult.error);
  let item = readResult.value.items[0];
  if (item === undefined)
    throw Error("installed plugins registry read settled without an outcome for its key");
  if (!item.found) return null;
  return parseInstalledPluginsJson(Buffer.from(item.value).toString("utf-8"));
}
//@ chunk-5xgkngpb.js:4436855-4437113 layout
/**
 * 经存储层读取 installed_plugins.json 原文（不存在返回 null）。
 */
async function readInstalledPluginsViaStorage(storageV5, storageKey) {
  let readResult = await storageV5.read([storageKey]);
  if (!readResult.ok) throw storageAccessError(readResult.error);
  let item = readResult.value.items[0];
  if (item === undefined)
    throw Error("installed plugins registry read settled without an outcome for its key");
  return item.found ? Buffer.from(item.value).toString("utf-8") : null;
}
//@ chunk-5xgkngpb.js:4437113-4437204 layout
/**
 * 解析 installed_plugins.json 文本，返回 {version, data}（无 version 视为 1）。
 */
function parseInstalledPluginsJson(text) {
  let parsed = jsonParse(text);
  return {
    version: typeof parsed?.version === "number" ? parsed.version : 1,
    data: parsed,
  };
}
//@ chunk-5xgkngpb.js:4437204-4437300 layout
function toInstalledPluginsV2(raw) {
  return raw.version === 2
    ? normalizeInstallPaths(parseInstalledPluginsV2Strict(raw.data, "load-from-disk"))
    : migrateV1ToV2(InstalledPluginsFileSchemaV1().parse(raw.data));
}
//@ chunk-5xgkngpb.js:4437300-4437451 fingerprint (2.1.88 match: hasPendingUpdates, 0.783)
function normalizeInstallPaths(installedPluginsV2Strict) {
  for (let plugin of Object.values(installedPluginsV2Strict.plugins))
    for (let diskEntry of plugin) {
      if (seedDirFor(diskEntry.installPath) !== undefined) continue;
      diskEntry.installPath = relocateInstallPath(diskEntry.installPath);
    }
  return installedPluginsV2Strict;
}
//@ chunk-5xgkngpb.js:4437451-4438881 layout
/**
 * 生成“插件 id 不合法、无法安装”的说明：区分多个 @、npm 包名不合法、插件名/市场名哪个不合法；名字含不可见字符时补一句； 是依赖的 id 不合法时以依赖方口吻描述。
 */
function formatInvalidPluginIdMessage(pluginId, dependentId, parts) {
  let atIndex = pluginId.lastIndexOf("@");
  let marketplaceName = parts?.marketplaceName ?? (atIndex >= 0 ? pluginId.slice(atIndex + 1) : "");
  let pluginName = parts?.pluginName ?? (atIndex > 0 ? pluginId.slice(0, atIndex) : "");
  let isPackageName = marketplaceName === pluginManifestPathSchemas;
  let atCount = countCharInString(pluginId, "@");
  let extraAtSign = parts === undefined && atCount > (isPackageName && pluginId.startsWith("@") ? 2 : 1);
  let pluginNameOk = isValidPluginIdSegment(pluginName);
  let marketplaceNameOk = atIndex >= 0 && isValidPluginIdSegment(marketplaceName);
  let ruleText =
    'Each part of a plugin id (plugin@marketplace) may use only the letters a-z and A-Z, digits, ".", "_" and "-", and must start with a letter or digit.';
  let invalidText = extraAtSign
    ? `Each part of a plugin id (plugin@marketplace) may use only the letters a-z and A-Z, digits, ".", "_" and "-", and must start with a letter or digit. Here the id holds more than one "@", so the plugin's name or the marketplace's name holds one; whoever named it can rename it.`
    : isPackageName
      ? "its first half is not a package name that the npm marketplace accepts."
      : `Each part of a plugin id (plugin@marketplace) may use only the letters a-z and A-Z, digits, ".", "_" and "-", and must start with a letter or digit. Here ${pluginNameOk && !marketplaceNameOk ? "the marketplace's name does not" : !pluginNameOk && marketplaceNameOk ? "the plugin's name does not" : "they do not"}; the marketplace's maintainer can rename ${pluginNameOk || marketplaceNameOk ? "it" : "both"}.`;
  let printableId = quotedPrintable(pluginId);
  let hasHiddenChars = printableId !== truncateWithEllipsis_2(normalizeQuotes(pluginId), 300);
  let isDependent = dependentId !== undefined && dependentId !== pluginId;
  let hiddenNote = !hasHiddenChars
    ? ""
    : isDependent
      ? " The name of the plugin it depends on holds a character that is not shown here."
      : " The name holds a character that is not shown here.";
  return isDependent
    ? `Plugin "${quotedPrintable(dependentId)}" cannot be installed, because it depends on "${printableId}", whose id is invalid: ${invalidText}${hiddenNote}`
    : `Plugin "${printableId}" cannot be installed, because its id is invalid: ${invalidText}${hiddenNote}`;
}
//@ chunk-5xgkngpb.js:4438881-4439049 layout (2.1.88 match: setCwdState, 1)
function normalizeQuotes(cwd) {
  return cwd
    .normalize("NFC")
    .replace(/[`\uff40\u02cb\u1fef\u2035]/g, "'")
    .replace(/[\u02bb\u02bc]/g, "\u2019")
    .replace(/"/g, "\u201D")
    .replace(/'/g, "\u2019");
}
//@ chunk-5xgkngpb.js:4439049-4439098 layout
/**
 * isRecordablePluginId：插件 id 符合 schema。
 */
function isRecordablePluginId(pluginId) {
  return PluginIdSchema().safeParse(pluginId).success;
}
//@ chunk-5xgkngpb.js:4439098-4439277 layout
let UnrecordablePluginIdError; // deferred: uses TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS (../errors.js) of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-5xgkngpb.js:4439098", () => {
  UnrecordablePluginIdError = class UnrecordablePluginIdError extends (
    TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS
  ) {
    pluginCommandErrorCategory = "validation";
    constructor(pluginId) {
      super(formatInvalidPluginIdMessage(pluginId), "plugin id cannot be a key of the install records");
      this.name = "UnrecordablePluginIdError";
    }
  };
});
//@ chunk-5xgkngpb.js:4439277-4439321 layout
/**
 * assertRecordablePluginId：id 不可记录时抛错。
 */
function assertRecordablePluginId(pluginId) {
  if (!isRecordablePluginId(pluginId)) throw new UnrecordablePluginIdError(pluginId);
}
//@ chunk-5xgkngpb.js:4439321-4439362 layout
var SET_ASIDE_RECORDS; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-5xgkngpb.js:4439321", () => {
  SET_ASIDE_RECORDS = Symbol("setAsideInstallRecords");
});
//@ chunk-5xgkngpb.js:4439362-4439392 layout
function setAsideRecordsOf(error) {
  return error[SET_ASIDE_RECORDS];
}
//@ chunk-5xgkngpb.js:4439392-4439491 layout
function attachSetAsideRecords(target, value) {
  Object.defineProperty(target, SET_ASIDE_RECORDS, {
    value,
    enumerable: false,
    configurable: true,
    writable: true,
  });
}
//@ chunk-5xgkngpb.js:4439491-4439545 layout
function copySetAsideRecords(source, v2Data) {
  let setAside = setAsideRecordsOf(source);
  if (setAside !== undefined) attachSetAsideRecords(v2Data, setAside);
}
//@ chunk-5xgkngpb.js:4439545-4439587 layout
function serializeInstalledPlugins(data) {
  writeSetAsideRecords(data);
  return jsonStringify(data, null, 2);
}
//@ chunk-5xgkngpb.js:4439587-4440503 layout
/**
 * 宽松解析 installed_plugins.json V2：存在键合法但本版本解析不了的记录时记 warn 并抛出（视为不可读、不覆盖文件）； 键本身不合法的记录登记为 set-aside（下次写时复制到带日期的旁文件后丢弃）。返回解析后的文件对象。
 */
function parseInstalledPluginsV2Strict(raw, operation) {
  let { file, setAside, keptRaw, firstError, firstUnparseableError } = parseInstalledPluginsV2Leniently(raw);
  let keys = Object.keys(setAside);
  let keys_2 = Object.keys(keptRaw);
  if (keys_2.length > 0) {
    logForDebugging(
      `installed_plugins.json: ${keys_2.length} record(s) under a valid plugin id that this build cannot parse (another build's, perhaps newer): ${keys_2
        .slice(0, 10)
        .map((key) => jsonStringify(quotedPrintable(key, 120)))
        .join(
          ", ",
        )}${keys_2.length > 10 ? `, and ${keys_2.length - 10} more` : ""}. The list counts as unreadable for this build, and this build does not replace the file while they stay.`,
      {
        level: "warn",
      },
    );
    throw markUnparseableRecords(firstUnparseableError, keys_2);
  }
  if (keys.length > 0) {
    attachSetAsideRecords(file, setAside);
    logPluginStateFileError(operation, firstError, true);
    logForDebugging(
      `installed_plugins.json: ${keys.length} record(s) set aside, because their key is not a valid plugin id and no build to date can use them: ${keys
        .slice(0, 10)
        .map((key) => jsonStringify(quotedPrintable(key, 120)))
        .join(
          ", ",
        )}${keys.length > 10 ? `, and ${keys.length - 10} more` : ""}. The next write of installed_plugins.json copies them to a dated file beside it and drops them from the list.`,
      {
        level: "warn",
      },
    );
  }
  return file;
}
//@ chunk-5xgkngpb.js:4440503-4440642 layout
function tryParseInstalledPluginsV2(raw) {
  try {
    let { file, keptRaw } = parseInstalledPluginsV2Leniently(raw);
    return Object.keys(keptRaw).length > 0
      ? {
          success: false,
        }
      : {
          success: true,
          data: file,
        };
  } catch {
    return {
      success: false,
    };
  }
}
//@ chunk-5xgkngpb.js:4440642-4441030 layout
/**
 * set-aside 记录旁文件写失败的错误。
 */
function setAsideCopyFailedError(sidePath, reason) {
  return new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
    `installed_plugins.json was not changed: it holds records under names that no version of Claude Code can use; they are copied to a side file before they are removed, and that copy could not be written to ${sidePath} (${reason}). Make that path writable, or move what stands there away, and try again.`,
    "the side copy of set-aside install records could not be written",
  );
}
//@ chunk-5xgkngpb.js:4441030-4441491 layout
/**
 * 写 installed_plugins.json 前，把被 set aside 的记录按键排序写到插件目录下带日期与内容哈希的旁文件（权限 0600），失败抛 Sys 错误；成功后清空登记。
 */
function writeSetAsideRecords(data) {
  let setAside = setAsideRecordsOf(data);
  if (setAside === undefined || Object.keys(setAside).length === 0) return;
  let sorted = Object.create(null);
  for (let key of Object.keys(setAside).sort()) sorted[key] = setAside[key];
  let sideJson = jsonStringify(sorted, null, 2);
  let sidePath = join(
    getPluginsDirectory(),
    setAsideFileName(new Date(), createHash("sha256").update(sideJson).digest("hex").slice(0, 12)),
  );
  try {
    ensurePluginsDirectoryExists();
    syncTarget(sidePath, sideJson, 384);
  } catch (error) {
    throw setAsideCopyFailedError(sidePath, errorMessage(error));
  }
  attachSetAsideRecords(data, {});
  logForDebugging(
    `installed_plugins.json: copied ${Object.keys(setAside).length} set-aside record(s) to ${sidePath} before this write drops them from installed_plugins.json`,
    {
      level: "warn",
    },
  );
}
//@ chunk-5xgkngpb.js:4441491-4441742 fingerprint (2.1.88 match: migrateV1ToV2, 1)
function migrateV1ToV2(v1Data) {
  let v2Plugins = {};
  for (let [pluginId, plugin] of Object.entries(v1Data.plugins)) {
    let versionedCachePath = getVersionedCachePath(pluginId, plugin.version);
    v2Plugins[pluginId] = [
      {
        scope: "user",
        installPath: versionedCachePath,
        version: plugin.version,
        installedAt: plugin.installedAt,
        lastUpdated: plugin.lastUpdated,
        gitCommitSha: plugin.gitCommitSha,
      },
    ];
  }
  return {
    version: 2,
    plugins: v2Plugins,
  };
}
//@ chunk-5xgkngpb.js:4441742-4441937 layout
/**
 * 同步返回 installed_plugins.json（V2 形状），首次调用从磁盘读并缓存在全局状态 installedPluginsFile；读失败返回带错误标记的空表（isInstalledPluginsReadFailure 可识别）。
 */
function getInstalledPlugins() {
  let pluginRegistry = getPluginRegistry();
  if (pluginRegistry.installedPluginsFile !== null) return pluginRegistry.installedPluginsFile;
  try {
    pluginRegistry.installedPluginsFile = loadInstalledPluginsV2(getPlan_2());
  } catch (error) {
    pluginRegistry.installedPluginsFile = emptyStateAfterLoadFailure(error);
  }
  return pluginRegistry.installedPluginsFile;
}
//@ chunk-5xgkngpb.js:4441937-4442464 layout
/**
 * 经存储后端（storageV5）异步读取 installed_plugins.json 并缓存；内存已有时直接返回缓存。
 */
async function getInstalledPluginsAsync(storageV5) {
  let storageKey = installedStorageKey(storageV5);
  if (!isStorageV5Enabled() || storageV5 === undefined || storageKey === null) return getInstalledPlugins();
  let pluginRegistry = getPluginRegistry();
  if (pluginRegistry.installedPluginsFile !== null) {
    logForDebugging(
      "installed_plugins.json already cached before this storage-interface load; serving the cached copy",
    );
    return pluginRegistry.installedPluginsFile;
  }
  let installedPluginsEpoch = pluginRegistry.installedPluginsEpoch;
  let loaded;
  try {
    loaded = loadInstalledPluginsV2(await readInstalledPluginsFileRaw_2(storageV5, storageKey));
    logForDebugging(
      `Loaded installed_plugins.json through the storage interface (${Object.keys(loaded.plugins).length} plugins)`,
    );
  } catch (error) {
    loaded = emptyStateAfterLoadFailure(error);
  }
  if (pluginRegistry.installedPluginsEpoch === installedPluginsEpoch)
    pluginRegistry.installedPluginsFile ??= loaded;
  return pluginRegistry.installedPluginsFile ?? loaded;
}
//@ chunk-5xgkngpb.js:4442464-4442514 layout
/**
 * 存储后端可用时预读 installed_plugins 到内存缓存。
 */
async function primeInstalledPluginsCache(storageV5) {
  if (installedStorageKey(storageV5) !== null) await getInstalledPluginsAsync(storageV5);
}
//@ chunk-5xgkngpb.js:4442514-4442923 fingerprint (2.1.88 match: loadInstalledPluginsV2, 0.737)
/**
 * 从磁盘读取 installed_plugins.json，V1 自动迁移为 V2，结果做路径规范化。
 */
function loadInstalledPluginsV2(rawData) {
  if (rawData) {
    if (rawData.version === 2) {
      let validated = normalizeInstallPaths(parseInstalledPluginsV2Strict(rawData.data, "load"));
      logForDebugging(
        `Loaded ${Object.keys(validated.plugins).length} installed plugins from ${isDiskless() ? "installed_plugins.json" : getInstalledPluginsFilePath()}`,
      );
      return validated;
    }
    let v1Validated = InstalledPluginsFileSchemaV1().parse(rawData.data);
    let v2Data = migrateV1ToV2(v1Validated);
    logForDebugging(`Loaded and converted ${Object.keys(v1Validated.plugins).length} plugins from V1 format`);
    return v2Data;
  }
  logForDebugging("installed_plugins.json doesn't exist, returning empty V2 object");
  return {
    version: 2,
    plugins: {},
  };
}
//@ chunk-5xgkngpb.js:4442923-4442943 layout
var failedInstalledPluginsReads; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-5xgkngpb.js:4442923", () => {
  failedInstalledPluginsReads = new WeakSet();
});
//@ chunk-5xgkngpb.js:4442943-4442976 placement
/**
 * hasFailedInstalledPluginsRead：该路径曾读失败。
 */
function hasFailedInstalledPluginsRead(state) {
  return failedInstalledPluginsReads.has(state);
}
//@ chunk-5xgkngpb.js:4442976-4443148 placement
async function getInstalledPluginsMap(storageV5, sync = false) {
  if (sync) {
    let installedPlugins = loadInstalledPluginsSync();
    return hasFailedInstalledPluginsRead(installedPlugins) ? undefined : installedPlugins.plugins;
  }
  let installedPluginsFile = getPluginRegistry().installedPluginsFile;
  if (installedPluginsFile === null && !storageV5) return;
  let state = installedPluginsFile ?? getInstalledPlugins();
  return hasFailedInstalledPluginsRead(state) ? undefined : state.plugins;
}
//@ chunk-5xgkngpb.js:4443148-4443292 placement
/**
 * 其他与该插件共用（大小写不敏感）数据目录的插件 id。
 */
function findDataDirSharers(pluginId, state, exclude = new Set([pluginId])) {
  let lower = pluginDataDirPath(pluginId).toLowerCase();
  return Object.keys(state.plugins).filter(
    (key) => key !== pluginId && !exclude.has(key) && pluginDataDirPath(key).toLowerCase() === lower,
  );
}
//@ chunk-5xgkngpb.js:4443292-4443370 placement
/**
 * isPluginUnreadableOrShared：插件读失败或数据目录被共享。
 */
function isPluginUnreadableOrShared(pluginId, state, exclude = new Set([pluginId])) {
  if (hasFailedInstalledPluginsRead(state)) return true;
  return findDataDirSharers(pluginId, state, exclude).length > 0;
}
//@ chunk-5xgkngpb.js:4443370-4443470 placement
/**
 * 有安装记录的插件 id；读失败返回 unknown。
 */
function listInstalledPluginIds(data) {
  return hasFailedInstalledPluginsRead(data)
    ? "unknown"
    : Object.entries(data.plugins).flatMap(([key, value]) => (value.length > 0 ? [key] : []));
}
//@ chunk-5xgkngpb.js:4443470-4443719 placement
function emptyStateAfterLoadFailure(error) {
  let reason = errorMessage(error);
  logForDebugging(`Failed to load installed_plugins.json: ${reason}. Starting with empty state.`, {
    level: "error",
  });
  if (
    !isSyscallError(error) &&
    !(error instanceof SyntaxError) &&
    getUnparseableRecordIds(error) === undefined
  )
    logError(toError(error));
  logPluginStateFileError("load", error, true);
  let state = {
    version: 2,
    plugins: {},
  };
  failedInstalledPluginsReads.add(state);
  return state;
}
//@ chunk-5xgkngpb.js:4443719-4443779 placement
function installedStorageKey(storageV5) {
  return !isStorageV5Enabled() || storageV5 === undefined ? null : pluginRegistrySpace("installed");
}
//@ chunk-5xgkngpb.js:4443779-4443822 placement
function installedPluginsFileMode() {
  return 438 & ~process.umask();
}
//@ chunk-5xgkngpb.js:4443822-4444869 placement
/**
 * 读取 installed_plugins.json，遇到未知版本格式时报错。
 */
function readInstalledPluginsFile(refusal) {
  if (refusal.unreadRecordIds.length === 0)
    return `installed_plugins.json is in a format (version ${refusal.formatVersion ?? "unknown"}) that this version of Claude Code does not know, so plugins cannot be changed from this version, and some may not load. Update Claude Code on this machine (claude update), or change plugins with the version of Claude Code that wrote ${getInstalledPluginsFilePath()}.`;
  let mapped = refusal.unreadRecordIds
    .slice(0, 3)
    .map((unreadRecordId) => `"${quotedPrintable(unreadRecordId, 120)}"`);
  let moreCount = refusal.unreadRecordIds.length - mapped.length;
  let isSingle = refusal.unreadRecordIds.length === 1;
  let idsText = `${mapped.join(", ")}${moreCount > 0 ? ` and ${moreCount} more` : ""}`;
  return `installed_plugins.json holds ${isSingle ? "a record" : "records"} under ${idsText} that this version of Claude Code cannot read, so plugins cannot be changed from this version, and some may not load. Update Claude Code on this machine (claude update); or uninstall ${isSingle ? "that plugin" : "those plugins"} with the version of Claude Code that wrote ${isSingle ? "the record" : "the records"}; or, if neither helps, delete ${isSingle ? "that record" : "each of those records"} from ${getInstalledPluginsFilePath()} by hand, then restart or run /reload-plugins.`;
}
//@ chunk-5xgkngpb.js:4444869-4445199 placement
let InstalledListNotReplacedError; // deferred: uses TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS (../errors.js) of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-5xgkngpb.js:4444869", () => {
  InstalledListNotReplacedError = class InstalledListNotReplacedError extends (
    TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS
  ) {
    unreadRecordIds;
    formatVersion;
    constructor(unreadRecordIds, formatVersion, detail) {
      super(
        `installed_plugins.json was not changed: ${
          detail ??
          readInstalledPluginsFile({
            unreadRecordIds,
            formatVersion,
          })
        }`,
        "installed_plugins.json was not replaced: it holds what this build cannot read",
      );
      this.unreadRecordIds = unreadRecordIds;
      this.formatVersion = formatVersion;
      this.name = "InstalledListNotReplacedError";
    }
  };
});
//@ chunk-5xgkngpb.js:4445199-4445235 placement
/**
 * 写已安装插件清单前确保插件数据目录存在（mkdirSync，已存在则无操作）。
 */
function ensurePluginsDirectoryExists() {
  getFsImplementation().mkdirSync(getPluginsDirectory());
}
//@ chunk-5xgkngpb.js:4445235-4445638 placement
/**
 * 不可读文件的保留副本写失败的错误。
 */
function keptCopyWriteFailedError(filePath, reason) {
  return new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
    `installed_plugins.json cannot be read, and it was not changed. Before it is rebuilt, its contents are kept in a file beside it, but that file (${filePath}) could not be written: ${reason}. Free disk space or make the plugins folder writable, or move installed_plugins.json aside by hand, then try again.`,
    "the kept copy of an unreadable installed_plugins.json could not be written",
  );
}
//@ chunk-5xgkngpb.js:4445638-4445655 placement
var MAX_INSTALLED_PLUGINS_BYTES = 16777216;
//@ chunk-5xgkngpb.js:4445655-4446119 placement
/**
 * 安全地同步读取文件：O_RDONLY|O_NOFOLLOW|O_NONBLOCK 打开，fstat 与 lstat 必须同为单硬链接普通文件且 dev/ino 一致， 大小不超过 Rys；读满或出错返回 undefined。
 */
function readSmallRegularFileSync(installedPluginsFilePath) {
  let fd;
  try {
    fd = openSync(installedPluginsFilePath, constants.O_RDONLY | constants.O_NOFOLLOW | constants.O_NONBLOCK);
    let fdStat = fstatSync(fd, {
      bigint: true,
    });
    let pathStat = lstatSync(installedPluginsFilePath, {
      bigint: true,
    });
    if (
      !fdStat.isFile() ||
      !pathStat.isFile() ||
      fdStat.nlink !== 1n ||
      pathStat.nlink !== 1n ||
      isSentinelInode(fdStat.ino) ||
      fdStat.dev !== pathStat.dev ||
      fdStat.ino !== pathStat.ino
    )
      return;
    if (fdStat.size > BigInt(MAX_INSTALLED_PLUGINS_BYTES)) return;
    let buffer = Buffer.allocUnsafe(Number(fdStat.size) + 1);
    let offset = 0;
    while (offset < buffer.length) {
      let bytesRead = readSync(fd, buffer, offset, buffer.length - offset, offset);
      if (bytesRead === 0) return Buffer.from(buffer.subarray(0, offset));
      offset += bytesRead;
    }
    return;
  } catch {
    return;
  } finally {
    if (fd !== undefined)
      try {
        closeSync(fd);
      } catch {}
  }
}
//@ chunk-5xgkngpb.js:4446119-4446947 placement
function readInstalledPluginsRaw(raw) {
  let rawBuf = typeof raw === "string" ? Buffer.from(raw, "latin1") : Buffer.from(raw);
  let smallRegularFile = readSmallRegularFileSync(getInstalledPluginsFilePath());
  if (
    smallRegularFile === undefined ||
    !(smallRegularFile.equals(rawBuf) || smallRegularFile.toString("utf8") === rawBuf.toString("utf8"))
  ) {
    logForDebugging(
      "installed_plugins.json could not be read at all, and its bytes are NOT kept: its name is not a plain file of its own (a symbolic link, a second name of another file, too large), or it changed while it was read; this write replaces only the name",
      {
        level: "warn",
      },
    );
    return;
  }
  let keptPath = join(
    getPluginsDirectory(),
    unreadableKeptFileName(
      new Date(),
      createHash("sha256").update(smallRegularFile).digest("hex").slice(0, 12),
    ),
  );
  try {
    ensurePluginsDirectoryExists();
    syncTarget(keptPath, smallRegularFile, 384);
  } catch (error) {
    let keptCopyError = keptCopyWriteFailedError(keptPath, errorMessage(error));
    let errnoCode = getErrnoCode(error);
    let errno = isSyscallError(error) ? error.errno : undefined;
    throw Object.assign(
      keptCopyError,
      errnoCode === undefined
        ? {}
        : {
            code: errnoCode,
          },
      errno === undefined
        ? {}
        : {
            errno,
          },
    );
  }
  logForDebugging(
    `installed_plugins.json could not be read at all (not JSON, or not a list of plugins): its bytes are kept in ${keptPath} before this write rebuilds it`,
    {
      level: "warn",
    },
  );
}
//@ chunk-5xgkngpb.js:4446947-4447022 placement
function assertInstalledPluginsReplaceable(raw) {
  let refusal = raw === null ? undefined : checkInstalledPluginsReplaceable(raw).refusal;
  if (refusal !== undefined) throw refusal;
}
//@ chunk-5xgkngpb.js:4447100-4447604 placement
/**
 * 分析现有文件原文：版本高于 2 或有本版本不能解析的记录时返回 refusal；完全无法解析返回 unreadableAtAll； V2 正常时附带 set-aside 记录。
 */
function checkInstalledPluginsReplaceable(raw) {
  let mcpAuthCache = getMcpAuthCache(raw);
  let parsed;
  try {
    parsed = parseInstalledPluginsJson(mcpAuthCache);
  } catch {
    return {
      unreadableAtAll: mcpAuthCache.trim() !== "",
    };
  }
  if (parsed.version > 2)
    return {
      refusal: new InstalledListNotReplacedError([], parsed.version),
      unreadableAtAll: false,
    };
  let isEmpty =
    parsed.data === null || (typeof parsed.data === "object" && Object.keys(parsed.data).length === 0);
  if (parsed.version !== 2)
    return {
      unreadableAtAll: !isEmpty && !InstalledPluginsFileSchemaV1().safeParse(parsed.data).success,
    };
  let keptIds;
  let setAside;
  try {
    let installedPluginsV2Leniently = parseInstalledPluginsV2Leniently(parsed.data);
    keptIds = Object.keys(installedPluginsV2Leniently.keptRaw);
    setAside = installedPluginsV2Leniently.setAside;
  } catch {
    return {
      unreadableAtAll: !isEmpty,
    };
  }
  return keptIds.length > 0
    ? {
        refusal: new InstalledListNotReplacedError(keptIds),
        unreadableAtAll: false,
      }
    : {
        unreadableAtAll: false,
        setAside,
      };
}
//@ chunk-5xgkngpb.js:4447604-4447787 placement
function assertInstalledPluginsReplaceable_2(raw, target) {
  if (raw === null) return;
  let check = checkInstalledPluginsReplaceable(raw);
  if (check.refusal !== undefined) throw check.refusal;
  if (target !== undefined && check.setAside !== undefined)
    attachSetAsideRecords(target, {
      ...setAsideRecordsOf(target),
      ...check.setAside,
    });
  if (check.unreadableAtAll) readInstalledPluginsRaw(raw);
}
//@ chunk-5xgkngpb.js:4447787-4447952 placement
/**
 * 列出 installed_plugins 不可读时保留的副本文件。
 */
async function listUnreadableKeptFiles() {
  let dir = dirname(getInstalledPluginsFilePath());
  try {
    return (await getFsImplementation().readdir(dir))
      .filter((entry) => entry.isFile())
      .map((entry) => entry.name)
      .filter(isUnreadableKeptFileName)
      .sort()
      .map((fileName) => join(dir, fileName));
  } catch {
    return [];
  }
}
//@ chunk-5xgkngpb.js:4447952-4448117 placement
/**
 * 列出 set-aside 旁文件。
 */
async function listSetAsideFiles() {
  let dir = dirname(getInstalledPluginsFilePath());
  try {
    return (await getFsImplementation().readdir(dir))
      .filter((entry) => entry.isFile())
      .map((entry) => entry.name)
      .filter(isSetAsideFileName)
      .sort()
      .map((fileName) => join(dir, fileName));
  } catch {
    return [];
  }
}
//@ chunk-5xgkngpb.js:4448117-4448379 placement
/**
 * 读文件检查是否会拒绝覆盖，返回未读记录 id 与格式版本。
 */
async function getInstalledListRefusal(storageV5) {
  try {
    let storageKey = installedStorageKey(storageV5);
    assertInstalledPluginsReplaceable(
      isStorageV5Enabled() && storageV5 !== undefined && storageKey !== null
        ? await readInstalledPluginsViaStorage(storageV5, storageKey)
        : readInstalledPluginsFileRaw(getInstalledPluginsFilePath()),
    );
    return;
  } catch (error) {
    return error instanceof InstalledListNotReplacedError &&
      (error.unreadRecordIds.length > 0 || error.formatVersion !== undefined)
      ? {
          unreadRecordIds: error.unreadRecordIds,
          formatVersion: error.formatVersion,
        }
      : undefined;
  }
}
//@ chunk-5xgkngpb.js:4448379-4448572 placement
async function readInstalledPluginsLenient(storageV5) {
  try {
    let storageKey = installedStorageKey(storageV5);
    let raw =
      isStorageV5Enabled() && storageV5 !== undefined && storageKey !== null
        ? await readInstalledPluginsViaStorage(storageV5, storageKey)
        : readInstalledPluginsFileRaw(getInstalledPluginsFilePath());
    if (raw === null) return {};
    let installedPluginsJson = parseInstalledPluginsJson(getMcpAuthCache(raw));
    return installedPluginsJson.version === 2
      ? parseInstalledPluginsV2Leniently(installedPluginsJson.data).file.plugins
      : {};
  } catch {
    return {};
  }
}
//@ chunk-5xgkngpb.js:4448572-4448764 placement
async function isInstalledListReplaceRefused(storageV5) {
  try {
    let storageKey = installedStorageKey(storageV5);
    assertInstalledPluginsReplaceable(
      isStorageV5Enabled() && storageV5 !== undefined && storageKey !== null
        ? await readInstalledPluginsViaStorage(storageV5, storageKey)
        : readInstalledPluginsFileRaw(getInstalledPluginsFilePath()),
    );
    return false;
  } catch (error) {
    return (
      error instanceof InstalledListNotReplacedError &&
      (error.unreadRecordIds.length > 0 || error.formatVersion !== undefined)
    );
  }
}
//@ chunk-5xgkngpb.js:4448764-4449125 placement
/**
 * 以 latin1 读原始字节；不存在返回 null，读不了抛不可覆盖错误。
 */
function readInstalledPluginsFileRaw(filePath) {
  try {
    return Buffer.from(
      getFsImplementation().readFileSync(filePath, {
        encoding: "latin1",
      }),
      "latin1",
    );
  } catch (error) {
    if (isENOENT(error)) return null;
    let errnoCode = getErrnoCode(error);
    let errno = isSyscallError(error) ? error.errno : undefined;
    throw Object.assign(
      new InstalledListNotReplacedError(
        [],
        undefined,
        `it could not be read first (${errorMessage(error)}), and a file that cannot be read is not replaced. Make it readable, then try again.`,
      ),
      errnoCode === undefined
        ? {}
        : {
            code: errnoCode,
          },
      errno === undefined
        ? {}
        : {
            errno,
          },
    );
  }
}
//@ chunk-5xgkngpb.js:4449125-4449672 fingerprint (2.1.88 match: saveInstalledPluginsV2, 0.547)
/**
 * 写回 installed_plugins.json（V2），存储后端模式下经存储接口原子写。
 */
async function saveInstalledPluginsV2(installedPluginsFile, storageV5) {
  let storageKey = installedStorageKey(storageV5);
  if (isStorageV5Enabled() && storageV5 !== undefined && storageKey !== null) {
    await storageUpdateWithRetry(
      storageV5,
      storageKey,
      (current) => {
        assertInstalledPluginsReplaceable_2(
          current === undefined ? null : Buffer.from(current.value),
          installedPluginsFile,
        );
        return {
          write: serializeInstalledPlugins(installedPluginsFile),
          result: true,
        };
      },
      storageSaveError,
    );
    setInstalledPluginsCache(installedPluginsFile);
    logForDebugging(
      `Saved ${Object.keys(installedPluginsFile.plugins).length} installed plugins through the storage interface`,
    );
    return;
  }
  let fs = getFsImplementation();
  let filePath = getInstalledPluginsFilePath();
  try {
    fs.mkdirSync(getPluginsDirectory());
    assertInstalledPluginsReplaceable_2(readInstalledPluginsFileRaw(filePath), installedPluginsFile);
    let jsonContent = serializeInstalledPlugins(installedPluginsFile);
    syncTarget(filePath, jsonContent);
    getPluginRegistry().installedPluginsFile = installedPluginsFile;
    logForDebugging(
      `Saved ${Object.keys(installedPluginsFile.plugins).length} installed plugins to ${filePath}`,
    );
  } catch (error) {
    logForDebugging(`Failed to save installed_plugins.json to ${filePath}: ${errorMessage(error)}`, {
      level: "error",
    });
    logPluginStateFileError("save", error, false);
    throw error;
  }
}
//@ chunk-5xgkngpb.js:4449672-4450032 layout
function storageSaveError(error) {
  let formatted = formatStorageError(error);
  logForDebugging(`Failed to save installed_plugins.json through the storage interface: ${formatted}`, {
    level: "error",
  });
  let wrapped =
    error.code === "Failed" && error.cause instanceof Error
      ? attachErrnoFields(error.cause, error)
      : Object.assign(
          new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
            `Failed to save installed_plugins.json: ${formatted}`,
            "failed to save installed_plugins.json (v5 backend error)",
          ),
          {
            cause: error,
            ...errnoFieldsFromStorageError(error),
          },
        );
  logPluginStateFileError("save", wrapped, false);
  return wrapped;
}
//@ chunk-5xgkngpb.js:4450032-4450257 layout
function storageAccessError(storageError) {
  return storageError.code === "Failed" && storageError.cause instanceof Error
    ? attachErrnoFields(storageError.cause, storageError)
    : Object.assign(
        new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
          `installed_plugins.json: ${formatStorageError(storageError)}`,
          "installed_plugins.json storage access failed (v5 backend error)",
        ),
        {
          cause: storageError,
          ...errnoFieldsFromStorageError(storageError),
        },
      );
}
//@ chunk-5xgkngpb.js:4450257-4450314 layout
function attachErrnoFields(cause, storageError) {
  return isSyscallError(cause) ? cause : Object.assign(cause, errnoFieldsFromStorageError(storageError));
}
//@ chunk-5xgkngpb.js:4450314-4450357 layout
var ERRNO_BY_CODE; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-5xgkngpb.js:4450314", () => {
  ERRNO_BY_CODE = new Map(Object.entries(constants_8.errno));
});
//@ chunk-5xgkngpb.js:4450357-4450508 layout
function errnoFieldsFromStorageError(storageError) {
  let telemetryCode = "telemetryCode" in storageError ? storageError.telemetryCode : undefined;
  let errno = telemetryCode === undefined ? undefined : ERRNO_BY_CODE.get(telemetryCode);
  return telemetryCode === undefined || errno === undefined
    ? undefined
    : {
        code: telemetryCode,
        errno: -errno,
      };
}
//@ chunk-5xgkngpb.js:4450508-4450530 layout
var STORAGE_UPDATE_MAX_ATTEMPTS; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
var storageUpdateBackoff;
deferInit("chunk-5xgkngpb.js:4450508", () => {
  STORAGE_UPDATE_MAX_ATTEMPTS = 5;
  storageUpdateBackoff = createJitteredBackoff(50);
});
//@ chunk-5xgkngpb.js:4450530-4450891 layout
async function updateInstalledPluginsViaStorage(storageV5, storageKey, update) {
  let outcome = await storageUpdateWithRetry(
    storageV5,
    storageKey,
    (current) => applyUpdateToStoredFile(current, update),
    storageSaveError,
  );
  if (outcome.loadError !== undefined) {
    logForDebugging(`Failed to load installed plugins from disk: ${errorMessage(outcome.loadError)}`, {
      level: "error",
    });
    logPluginStateFileError("load-from-disk", outcome.loadError, true);
  }
  if (outcome.written !== undefined) {
    setInstalledPluginsCache(outcome.written);
    logForDebugging(
      `Saved ${Object.keys(outcome.written.plugins).length} installed plugins through the storage interface`,
    );
  }
  return outcome.result;
}
//@ chunk-5xgkngpb.js:4450891-4451280 layout
async function storageUpdateWithRetry(storageV5, storageKey, update, toError) {
  for (let idx = 1; ; idx++) {
    let result = await storageV5.update(storageKey, update, {
      mode: installedPluginsFileMode(),
    });
    if (!result.ok) {
      if (
        result.error.code === "Unavailable" &&
        result.error.telemetryCode === "LockSuspect" &&
        idx < STORAGE_UPDATE_MAX_ATTEMPTS
      ) {
        await (result.error.retryAfterMs !== undefined
          ? sleep(result.error.retryAfterMs)
          : storageUpdateBackoff(idx));
        continue;
      }
      throw toError(result.error);
    }
    let updateResult = result.value.result;
    if (updateResult === undefined)
      throw Error("installed plugins registry update settled without an outcome");
    return updateResult;
  }
}
//@ chunk-5xgkngpb.js:4451280-4451434 layout
/**
 * 存储后端模式下把旧的 V1 installed_plugins.json 原地迁移为 V2 并刷新内存缓存。
 */
async function migrateStoredV1ToV2(storageV5, storageKey) {
  let installedPluginsFileRaw = await readInstalledPluginsFileRaw_2(storageV5, storageKey);
  if (installedPluginsFileRaw === null || installedPluginsFileRaw.version !== 1) return;
  let { converted } = await storageUpdateWithRetry(
    storageV5,
    storageKey,
    convertStoredV1,
    storageAccessError,
  );
  if (converted !== undefined) setInstalledPluginsCache(converted.data);
  return converted;
}
//@ chunk-5xgkngpb.js:4451434-4451773 layout
function convertStoredV1(current) {
  if (current === undefined)
    return {
      skip: true,
      result: {
        converted: undefined,
      },
    };
  let installedPluginsJson = parseInstalledPluginsJson(Buffer.from(current.value).toString("utf-8"));
  if (installedPluginsJson.version !== 1)
    return {
      skip: true,
      result: {
        converted: undefined,
      },
    };
  let v1Data = InstalledPluginsFileSchemaV1().parse(installedPluginsJson.data);
  let v2Data = migrateV1ToV2(v1Data);
  assertInstalledPluginsReplaceable_2(Buffer.from(current.value));
  return {
    write: jsonStringify(v2Data, null, 2),
    result: {
      converted: {
        data: v2Data,
        v1PluginCount: Object.keys(v1Data.plugins).length,
      },
    },
  };
}
//@ chunk-5xgkngpb.js:4451773-4452081 layout
function applyUpdateToStoredFile(current, update) {
  let stateFile = {
    version: 2,
    plugins: {},
  };
  let loadError;
  if (current !== undefined)
    try {
      stateFile = toInstalledPluginsV2(
        parseInstalledPluginsJson(Buffer.from(current.value).toString("utf-8")),
      );
    } catch (error) {
      loadError = error;
    }
  let updateResult = update(stateFile);
  if (updateResult.write && current !== undefined)
    assertInstalledPluginsReplaceable_2(Buffer.from(current.value));
  let result = {
    result: updateResult.result,
    written: updateResult.write ? stateFile : undefined,
    loadError,
  };
  return updateResult.write
    ? {
        write: serializeInstalledPlugins(stateFile),
        result,
      }
    : {
        skip: true,
        result,
      };
}
//@ chunk-5xgkngpb.js:4452081-4452221 layout
/**
 * installed_plugins.json 的读-改-写入口：回调拿到当前文件，返回 {write, result}；write 为真时保存（存储后端模式下走带重试的 update）。
 */
async function updateInstalledPlugins(update, storageV5) {
  let storageKey = installedStorageKey(storageV5);
  if (isStorageV5Enabled() && storageV5 !== undefined && storageKey !== null)
    return updateInstalledPluginsViaStorage(storageV5, storageKey, update);
  let installedPlugins = loadInstalledPluginsSync();
  let updateResult = update(installedPlugins);
  if (updateResult.write) await saveInstalledPluginsV2(installedPlugins);
  return updateResult.result;
}
//@ chunk-5xgkngpb.js:4452221-4452448 fingerprint (2.1.88 match: removePluginInstallation, 0.661)
/**
 * 删除某插件在指定作用域/项目下的安装记录。
 */
async function removePluginInstallation(pluginId, scope, projectPath, storageV5, keepRecord) {
  let result = await updateInstalledPlugins(
    (entry) => removeInstallationFromFile(entry, pluginId, scope, projectPath, keepRecord),
    storageV5,
  );
  if (result === "kept") return false;
  if (result) {
    logForDebugging(`Removed installation for ${pluginId} at scope ${scope}`);
    if (result.producerDirs.length > 0) {
      for (let producerDir of result.producerDirs)
        recordProducerDir(producerDir, {
          emit: false,
        });
      emitProducerDirsChanged();
    }
  }
}
//@ chunk-5xgkngpb.js:4452448-4452955 layout
/**
 * 从 V2 数据中删除指定作用域/项目的安装记录（给定期望记录不匹配时保留，返回 kept）。
 */
function removeInstallationFromFile(entry, pluginId, scope, projectPath, keepRecord) {
  let installations = entry.plugins[pluginId];
  if (!installations)
    return {
      write: false,
      result: false,
    };
  let existing = installations.find(
    (installation) => installation.scope === scope && installation.projectPath === projectPath,
  );
  if (keepRecord !== undefined && existing !== undefined && !registerPluginInstallation(existing, keepRecord))
    return {
      write: false,
      result: "kept",
    };
  let producerDirs = [];
  let matching =
    keepRecord === undefined ? findMatchingInstallations(installations, scope, projectPath) : undefined;
  entry.plugins[pluginId] = installations.filter((installation) => {
    let matches = matching
      ? matching.includes(installation)
      : installation.scope === scope && installation.projectPath === projectPath;
    if (matches) {
      for (let producerDir of [
        installation.sourceProducerPath,
        ...(installation.previousProducerPaths ?? []),
      ])
        if (producerDir) producerDirs.push(producerDir);
    }
    return !matches;
  });
  if (entry.plugins[pluginId].length === 0) delete entry.plugins[pluginId];
  return {
    write: true,
    result: {
      producerDirs,
    },
  };
}
//@ chunk-5xgkngpb.js:4452955-4453066 layout
/**
 * 批量删除安装记录，有变化时清空全局快照。
 */
async function removeInstallationsAndRefreshSnapshot(renames, storageV5) {
  if (renames.length === 0) return;
  if (
    await updateInstalledPlugins(
      (stateFile) => dropRenamedNonManagedInstallations(stateFile, renames),
      storageV5,
    )
  )
    getPluginRegistry().installedPluginsSnapshot = null;
}
//@ chunk-5xgkngpb.js:4453066-4453314 layout
function dropRenamedNonManagedInstallations(stateFile, renames) {
  let changed = false;
  for (let { oldId, newId } of renames) {
    let installations = stateFile.plugins[oldId];
    if (!installations) continue;
    let filtered = installations.filter((installation) => installation.scope === "managed");
    if (filtered.length === installations.length) continue;
    if (filtered.length > 0) stateFile.plugins[oldId] = filtered;
    else delete stateFile.plugins[oldId];
    changed = true;
  }
  return {
    write: changed,
    result: changed,
  };
}
//@ chunk-5xgkngpb.js:4453314-4453408 layout
/**
 * 会话内固定的 installed_plugins 快照（首次读取后不再变）。
 */
function getInstalledPluginsSnapshot() {
  let pluginRegistry = getPluginRegistry();
  pluginRegistry.installedPluginsSnapshot ??= getInstalledPlugins();
  return pluginRegistry.installedPluginsSnapshot;
}
//@ chunk-5xgkngpb.js:4453408-4453501 callgraph-fingerprint (2.1.88 match: getPendingUpdateCount, 0.43)
/**
 * 同步读取 installed_plugins.json 并转为 V2；读不到文件返回空表，出错走统一的失败处理。
 */
function loadInstalledPluginsSync() {
  try {
    let memoryState = getPlan_2();
    return memoryState
      ? toInstalledPluginsV2(memoryState)
      : {
          version: 2,
          plugins: {},
        };
  } catch (error) {
    return loadInstalledPluginsFromDisk(error);
  }
}
//@ chunk-5xgkngpb.js:4453501-4453664 callgraph-fingerprint (2.1.88 match: removeInstalledPlugin, 0.228)
/**
 * 读取 installed_plugins.json（有存储后端时经存储层）并转为 V2，不使用内存缓存。
 */
async function loadInstalledPlugins(pluginId) {
  let storageKey = installedStorageKey(pluginId);
  if (pluginId === undefined || storageKey === null || !isStorageV5Enabled())
    return loadInstalledPluginsSync();
  try {
    let raw = await readInstalledPluginsFileRaw_2(pluginId, storageKey);
    return raw
      ? toInstalledPluginsV2(raw)
      : {
          version: 2,
          plugins: {},
        };
  } catch (error) {
    return loadInstalledPluginsFromDisk(error);
  }
}
//@ chunk-5xgkngpb.js:4453664-4453836 fingerprint (2.1.88 match: loadInstalledPluginsFromDisk, 0.729)
function loadInstalledPluginsFromDisk(error) {
  let errorMsg = errorMessage(error);
  logForDebugging(`Failed to load installed plugins from disk: ${errorMsg}`, {
    level: "error",
  });
  logPluginStateFileError("load-from-disk", error, true);
  let state = {
    version: 2,
    plugins: {},
  };
  failedInstalledPluginsReads.add(state);
  return state;
}
//@ chunk-5xgkngpb.js:4453836-4454597 fingerprint (2.1.88 match: updateInstallationPathOnDisk, 0.516)
/**
 * 插件更新后把磁盘上安装记录的 installPath/version/gitCommitSha/command 来源字段改成新值（找不到记录时报错）。
 */
async function updateInstallationPathOnDisk(
  pluginId,
  scope,
  projectPath,
  installPath,
  version,
  gitCommitSha,
  resolvedVersion,
  sourceMeta,
  storageV5,
  claudeAi,
  directoryRepositoryKey,
  npm,
) {
  let sourceCommand = sourceMeta?.sourceCommand;
  let sourceProducerPath = sourceMeta?.sourceProducerPath;
  let patch = {
    newPath: installPath,
    newVersion: version,
    gitCommitSha,
    resolvedVersion,
    sourceCommand,
    sourceProducerPath,
    claudeAi,
    directoryRepositoryKey,
    npm,
  };
  if (directoryRepositoryKey !== undefined)
    await setDirectoryBinding(pluginId, directoryRepositoryKey, {
      keepExisting: true,
    });
  let storageKey = installedStorageKey(storageV5);
  let result;
  if (isStorageV5Enabled() && storageV5 !== undefined && storageKey !== null)
    result = await updateInstalledPluginsViaStorage(storageV5, storageKey, (stateFile) =>
      updateInstallationRecord(stateFile, pluginId, scope, projectPath, patch),
    );
  else {
    let filePath = loadInstalledPluginsSync();
    result = updateInstallationRecord(filePath, pluginId, scope, projectPath, patch).result;
    if (result === "updated") {
      assertInstalledPluginsReplaceable_2(
        readInstalledPluginsFileRaw(getInstalledPluginsFilePath()),
        filePath,
      );
      syncTarget(getInstalledPluginsFilePath(), serializeInstalledPlugins(filePath));
      getPluginRegistry().installedPluginsFile = null;
    }
  }
  switch (result) {
    case "no-plugin":
      logForDebugging(`Cannot update ${pluginId} on disk: plugin not found in installed plugins`);
      return;
    case "no-installation":
      logForDebugging(`Cannot update ${pluginId} on disk: no installation for scope ${scope}`);
      return;
    case "updated":
      logForDebugging(`Updated ${pluginId} on disk to version ${version} at ${installPath}`);
  }
}
//@ chunk-5xgkngpb.js:4454597-4454961 layout
/**
 * 为插件目录市场安装的插件记录 directoryRepositoryKey（仓库名绑定）。
 */
async function recordDirectoryRepositoryKey(pluginId, scope, projectPath, directoryRepositoryKey, storageV5) {
  {
    await setDirectoryBinding(pluginId, directoryRepositoryKey, {
      keepExisting: true,
    });
    let applyPatch = (installedPlugins) => {
      let installation = installationAtTarget(installedPlugins.plugins[pluginId], scope, projectPath);
      if (installation && installation.directoryRepositoryKey === undefined)
        installation.directoryRepositoryKey = directoryRepositoryKey;
      return {
        write: installation !== undefined,
        result: installation !== undefined,
      };
    };
    let storageKey = installedStorageKey(storageV5);
    if (isStorageV5Enabled() && storageV5 !== undefined && storageKey !== null) {
      await updateInstalledPluginsViaStorage(storageV5, storageKey, applyPatch);
      return;
    }
    let installedPlugins = loadInstalledPluginsSync();
    if (applyPatch(installedPlugins).write) {
      assertInstalledPluginsReplaceable_2(
        readInstalledPluginsFileRaw(getInstalledPluginsFilePath()),
        installedPlugins,
      );
      syncTarget(getInstalledPluginsFilePath(), serializeInstalledPlugins(installedPlugins));
      getPluginRegistry().installedPluginsFile = null;
    }
  }
}
//@ chunk-5xgkngpb.js:4454961-4456501 layout
function updateInstallationRecord(
  stateFile,
  pluginId,
  scope,
  projectPath,
  {
    newPath,
    newVersion,
    gitCommitSha,
    resolvedVersion,
    sourceCommand,
    sourceProducerPath,
    claudeAi,
    directoryRepositoryKey,
    npm,
  },
) {
  let installations = stateFile.plugins[pluginId];
  if (!installations)
    return {
      write: false,
      result: "no-plugin",
    };
  let installation = installationAtTarget(installations, scope, projectPath);
  if (installation) {
    installation.installPath = newPath;
    if (installation.version !== undefined) installation.version = newVersion;
    if (resolvedVersion !== undefined) installation.resolvedVersion = resolvedVersion;
    else delete installation.resolvedVersion;
    installation.lastUpdated = new Date().toISOString();
    if (gitCommitSha === null) delete installation.gitCommitSha;
    else if (gitCommitSha !== undefined) installation.gitCommitSha = gitCommitSha;
    if (npm !== undefined) {
      if (npm.npmVersionSpec !== undefined) installation.npmVersionSpec = npm.npmVersionSpec;
      else delete installation.npmVersionSpec;
      if (npm.npmResolved !== undefined) installation.npmResolved = npm.npmResolved;
      else delete installation.npmResolved;
      if (npm.npmIntegrity !== undefined) installation.npmIntegrity = npm.npmIntegrity;
      else delete installation.npmIntegrity;
      if (npm.npmRegistry !== undefined) installation.npmRegistry = npm.npmRegistry;
      else delete installation.npmRegistry;
    }
    if (claudeAi !== undefined) {
      installation.claudeaiPluginId = claudeAi.claudeaiPluginId;
      if (claudeAi.archiveSha256 !== undefined) installation.archiveSha256 = claudeAi.archiveSha256;
      else delete installation.archiveSha256;
    }
    if (directoryRepositoryKey !== undefined) installation.directoryRepositoryKey = directoryRepositoryKey;
    if (sourceCommand !== undefined) installation.sourceCommand = sourceCommand;
    else delete installation.sourceCommand;
    if (sourceCommand !== undefined && sourceProducerPath !== undefined) {
      let previousProducerPaths = mergePreviousProducerPaths(installation, sourceProducerPath);
      installation.sourceProducerPath = sourceProducerPath;
      if (previousProducerPaths.length > 0) installation.previousProducerPaths = previousProducerPaths;
      else delete installation.previousProducerPaths;
    } else if (sourceCommand === undefined) {
      if (installation.sourceProducerPath !== undefined)
        installation.previousProducerPaths = [
          ...(installation.previousProducerPaths ?? []).filter(
            (producerPath) => producerPath !== installation.sourceProducerPath,
          ),
          installation.sourceProducerPath,
        ].slice(-MAX_PREVIOUS_PRODUCER_PATHS);
      delete installation.sourceProducerPath;
    }
    return {
      write: true,
      result: "updated",
    };
  }
  return {
    write: false,
    result: "no-installation",
  };
}
//@ chunk-5xgkngpb.js:4456501-4456879 fingerprint (2.1.88 match: initializeVersionedPlugins, 0.663)
/**
 * 启动时初始化版本化插件：迁移旧单文件格式、清理旧缓存布局、从 enabledPlugins 同步安装记录。
 */
async function initializeVersionedPlugins(storageV5) {
  if (isStorageV5Enabled() && storageV5 !== undefined) await migrateToSinglePluginFile(storageV5);
  else await migrateToSinglePluginFile();
  try {
    await migrateFromEnabledPlugins(storageV5);
  } catch (error) {
    if (isSyscallError(error) || error instanceof SyntaxError)
      logForDebugging(`Plugin migration skipped (fs/parse error): ${errorMessage(error)}`, {
        level: "error",
      });
    else logError(error);
    logPluginStateFileError("migrate-from-enabled", error, true);
  }
  if (isStorageV5Enabled() && storageV5 !== undefined) await primeInstalledPluginsCache(storageV5);
  let data = getInstalledPluginsSnapshot();
  logForDebugging(`Initialized versioned plugins system with ${Object.keys(data.plugins).length} plugins`);
}
//@ chunk-5xgkngpb.js:4456879-4457139 fingerprint (2.1.88 match: removeAllPluginsForMarketplace, 0.701)
/**
 * 删除市场时移除该市场所有插件的安装记录，返回被孤立的缓存路径与受影响的插件 ID。
 */
async function removeAllPluginsForMarketplace(marketplaceName, storageV5) {
  if (!marketplaceName)
    return {
      orphanedPaths: [],
      removedPluginIds: [],
      sharedDataDirPluginIds: [],
      installPathsStillInUse: [],
    };
  let result = await updateInstalledPlugins(
    (file) => removeMarketplacePluginRecords(file, marketplaceName),
    storageV5,
  );
  for (let removedPluginId of result.removedPluginIds)
    logForDebugging(`Removed installed plugin for marketplace removal: ${removedPluginId}`);
  return result;
}
//@ chunk-5xgkngpb.js:4457139-4457702 layout
/**
 * 从安装记录中删除 id 以 @市场 结尾的全部插件，返回待写标志与结果：孤儿安装路径、删除的 id、 与其他插件共用数据目录的 id、仍被共用者使用的安装路径。
 */
function removeMarketplacePluginRecords(file, marketplaceName) {
  let suffix = `@${marketplaceName}`;
  let orphanedPaths = new Set();
  let removedIds = [];
  let marketplaceIds = new Set(Object.keys(file.plugins).filter((key) => key.endsWith(suffix)));
  let sharedDataDirPluginIds = [...marketplaceIds].filter((marketplaceId) =>
    isPluginUnreadableOrShared(marketplaceId, file, marketplaceIds),
  );
  let stillInUse = new Set();
  for (let marketplaceId of marketplaceIds)
    for (let sharerId of findDataDirSharers(marketplaceId, file, marketplaceIds))
      for (let installation of file.plugins[sharerId] ?? [])
        if (installation.installPath) stillInUse.add(installation.installPath);
  for (let pluginId of Object.keys(file.plugins)) {
    if (!pluginId.endsWith(suffix)) continue;
    for (let entry of file.plugins[pluginId] ?? [])
      if (entry.installPath) orphanedPaths.add(entry.installPath);
    delete file.plugins[pluginId];
    removedIds.push(pluginId);
  }
  return {
    write: removedIds.length > 0,
    result: {
      orphanedPaths: Array.from(orphanedPaths),
      removedPluginIds: removedIds,
      sharedDataDirPluginIds,
      installPathsStillInUse: Array.from(stillInUse),
    },
  };
}
//@ chunk-5xgkngpb.js:4457702-4457886 fingerprint (2.1.88 match: isInstallationRelevantToCurrentProject, 1)
/**
 * 安装记录是否与当前项目相关：user/managed 作用域总是；project/local 需 projectPath 等于当前工作目录。
 */
function isInstallationRelevantToCurrentProject(inst) {
  if (inst.scope === "user" || inst.scope === "managed") return true;
  let originalCwd = getOriginalCwd();
  if (inst.projectPath === originalCwd) return true;
  if (!inst.projectPath) return false;
  let currentRoot = storageRootFor(originalCwd);
  return currentRoot !== null && storageRootFor(inst.projectPath) === currentRoot;
}
//@ chunk-5xgkngpb.js:4457886-4458106 layout (2.1.88 match: isInstallationRelevantToCurrentProject, 1)
function isInstallationRelevantToCurrentProject_2(inst) {
  if (inst.scope === "user" || inst.scope === "managed") return true;
  if (!inst.projectPath) return false;
  let originalCwd = getOriginalCwd();
  if (isSameNormalizedProjectPath(inst.projectPath, originalCwd)) return true;
  let currentRoot = storageRootFor(originalCwd);
  if (currentRoot === null) return false;
  let otherRoot = storageRootFor(inst.projectPath);
  return otherRoot !== null && isSameNormalizedProjectPath(otherRoot, currentRoot);
}
//@ chunk-5xgkngpb.js:4458106-4458144 layout
function isWindows() {
  return getPlatform() === "windows";
}
//@ chunk-5xgkngpb.js:4458144-4458255 layout
/**
 * 从一个插件的安装记录里筛出与当前项目相关的（user/managed 全局记录，或 project/local 且 projectPath 为当前目录）；Windows 下找不到时按路径的另一种拼写回退并记日志。
 */
function filterInstallationsForCurrentProject(installations) {
  countRecordSpellings();
  let filtered = installations.filter(isInstallationRelevantToCurrentProject);
  if (filtered.length > 0 || !isWindows()) return filtered;
  let filtered_2 = installations.filter(isInstallationRelevantToCurrentProject_2);
  logRecordSpellingFallback(filtered_2[0]);
  return filtered_2;
}
//@ chunk-5xgkngpb.js:4458255-4458359 layout
/**
 * 在一个插件的安装记录里找与当前项目相关的那条（Windows 路径拼写回退同 filterInstallationsForCurrentProject）。
 */
function findInstallationForCurrentProject(installations) {
  countRecordSpellings();
  let found = installations.find(isInstallationRelevantToCurrentProject);
  if (found !== undefined || !isWindows()) return found;
  let installation = installations.find(isInstallationRelevantToCurrentProject_2);
  logRecordSpellingFallback(installation);
  return installation;
}
//@ chunk-5xgkngpb.js:4458359-4458398 layout
/**
 * 是否存在与当前项目相关的安装记录。
 */
function hasInstallationForCurrentProject(installations) {
  return findInstallationForCurrentProject(installations) !== undefined;
}
//@ chunk-5xgkngpb.js:4458398-4458865 layout
function countRecordSpellings() {
  let pluginRegistry = getPluginRegistry();
  let installedPluginsFile = pluginRegistry.installedPluginsFile;
  if (
    pluginRegistry.recordSpellingsCounted ||
    installedPluginsFile === null ||
    hasFailedInstalledPluginsRead(installedPluginsFile) ||
    !isWindows()
  )
    return;
  pluginRegistry.recordSpellingsCounted = true;
  let originalCwd = getOriginalCwd();
  let staleCount = 0;
  let bothCount = 0;
  for (let plugin of Object.values(installedPluginsFile.plugins)) {
    let found = plugin.find(
      (installation) =>
        (installation.scope === "project" || installation.scope === "local") &&
        isStaleInstallTarget(installation, installation.scope, originalCwd),
    );
    if (found !== undefined) {
      staleCount++;
      if (
        plugin.some(
          (installation) => installation.scope === found.scope && installation.projectPath === originalCwd,
        )
      )
        bothCount++;
    }
  }
  logEvent("tengu_plugin_record_spelling", {
    kind: lit_2("registry"),
    plugins_with_other_spelling: staleCount,
    plugins_with_both_spellings: bothCount,
  });
}
//@ chunk-5xgkngpb.js:4458865-4459287 layout
function logRecordSpellingFallback(installation) {
  if (installation === undefined) return;
  let { scope } = installation;
  if (scope !== "project" && scope !== "local") return;
  logForDebugging(
    `Using the install record for ${installation.projectPath} (${scope} scope) for this session in ${getOriginalCwd()}: the same folder or the same checkout, under another spelling of its path (gh-74612)`,
  );
  let pluginRegistry = getPluginRegistry();
  if (pluginRegistry.recordSpellingFallbackReported) return;
  pluginRegistry.recordSpellingFallbackReported = true;
  logEvent("tengu_plugin_record_spelling", {
    kind: lit_2("fallback"),
    scope: fromEnum(scope),
  });
}
//@ chunk-5xgkngpb.js:4459287-4459366 layout
/**
 * 取第一个已知版本并加 v 前缀（unknown 跳过）。
 */
function formatFirstKnownVersion(...versions) {
  let found = versions.find((version) => version && version !== "unknown");
  return found ? `v${found}` : undefined;
}
//@ chunk-5xgkngpb.js:4459366-4459493 fingerprint (2.1.88 match: isPluginInstalled, 1)
/**
 * 插件是否已安装（存在与当前项目相关的安装记录）。
 */
function isPluginInstalled(pluginId) {
  let installations = getInstalledPlugins().plugins[pluginId];
  if (!installations || installations.length === 0) return false;
  if (!hasInstallationForCurrentProject(installations)) return false;
  return getSettings_DEPRECATED().enabledPlugins?.[pluginId] !== undefined;
}
//@ chunk-5xgkngpb.js:4459493-4459665 fingerprint (2.1.88 match: isPluginGloballyInstalled, 1)
/**
 * 插件是否以 user 或 managed 作用域全局安装。
 */
function isPluginGloballyInstalled(pluginId) {
  let installations = getInstalledPlugins().plugins[pluginId];
  if (!installations || installations.length === 0) return false;
  if (!installations.some((entry) => entry.scope === "user" || entry.scope === "managed")) return false;
  return getSettings_DEPRECATED().enabledPlugins?.[pluginId] !== undefined;
}
//@ chunk-5xgkngpb.js:4459665-4459879 layout
/**
 * 当前项目相关安装记录的 gitCommitSha（多条记录 sha 不一致时返回 undefined）。
 */
function getInstalledGitCommitSha(pluginId, options = {}) {
  let installations = getInstalledPlugins().plugins[pluginId];
  if (!installations || installations.length === 0) return;
  let relevant = filterInstallationsForCurrentProject(
    options.scope !== undefined
      ? installations.filter((installation) => installation.scope === options.scope)
      : installations,
  );
  if (new Set(relevant.map((installation) => installation.gitCommitSha)).size !== 1) return;
  return relevant[0]?.gitCommitSha;
}
//@ chunk-5xgkngpb.js:4459879-4460182 fingerprint (2.1.88 match: addInstalledPlugin, 0.595)
/**
 * 新增或更新一条安装记录（scope、projectPath、installPath、version、gitCommitSha…）并保存。
 */
async function addInstalledPlugin(pluginId, installPath, metadata = "user", projectPath, storageV5) {
  assertRecordablePluginId(pluginId);
  if (installPath.directoryRepositoryKey !== undefined)
    await setDirectoryBinding(pluginId, installPath.directoryRepositoryKey, {
      keepExisting: true,
    });
  let { isUpdate, before } = await updateInstalledPlugins(
    (entry) => addPluginInstallation(entry, pluginId, installPath, metadata, projectPath),
    storageV5,
  );
  getPluginRegistry().installedPluginsSnapshot = null;
  logForDebugging(`${isUpdate ? "Updated" : "Added"} installed plugin: ${pluginId} (scope: ${metadata})`);
  return before;
}
//@ chunk-5xgkngpb.js:4460182-4461361 fingerprint (2.1.88 match: addPluginInstallation, 0.369)
/**
 * 在 V2 数据中为插件新增或替换一条安装记录（按作用域+projectPath 匹配），保留显式安装标记（auto 只在新记录或原本也是 auto 时保留）。
 */
function addPluginInstallation(pluginId, scope, installPath, metadata, projectPath) {
  let installations = pluginId.plugins[scope] || [];
  let before = installations.slice();
  let installationIndex = findInstallationIndex(installations, metadata, projectPath);
  let recordProjectPath = installationIndex >= 0 ? installations[installationIndex].projectPath : projectPath;
  let existingManual = installationIndex >= 0 && installations[installationIndex]?.auto !== true;
  let isAuto = installPath.auto === true && !existingManual;
  let nextRecord = {
    scope: metadata,
    installPath: installPath.installPath,
    version: installPath.version,
    installedAt: installPath.installedAt,
    lastUpdated: installPath.lastUpdated,
    gitCommitSha: installPath.gitCommitSha,
    ...(installPath.resolvedVersion && {
      resolvedVersion: installPath.resolvedVersion,
    }),
    ...(recordProjectPath && {
      projectPath: recordProjectPath,
    }),
    ...(isAuto && {
      auto: true,
    }),
    ...(installPath.claudeaiPluginId !== undefined && {
      claudeaiPluginId: installPath.claudeaiPluginId,
    }),
    ...(installPath.archiveSha256 !== undefined && {
      archiveSha256: installPath.archiveSha256,
    }),
    ...(installPath.directoryRepositoryKey !== undefined
      ? {
          directoryRepositoryKey: installPath.directoryRepositoryKey,
        }
      : {}),
    ...(installPath.sourceCommand !== undefined && {
      sourceCommand: installPath.sourceCommand,
    }),
    ...(installPath.sourceProducerPath !== undefined && {
      sourceProducerPath: installPath.sourceProducerPath,
    }),
    ...(installPath.npmVersionSpec !== undefined && {
      npmVersionSpec: installPath.npmVersionSpec,
    }),
    ...(installPath.npmResolved !== undefined && {
      npmResolved: installPath.npmResolved,
    }),
    ...(installPath.npmIntegrity !== undefined && {
      npmIntegrity: installPath.npmIntegrity,
    }),
    ...(installPath.npmRegistry !== undefined && {
      npmRegistry: installPath.npmRegistry,
    }),
  };
  let existingRecord = installationIndex >= 0 ? installations[installationIndex] : undefined;
  if (existingRecord) {
    let previousProducerPaths = mergePreviousProducerPaths(
      existingRecord,
      nextRecord.sourceProducerPath ?? "",
    );
    if (previousProducerPaths.length > 0) nextRecord.previousProducerPaths = previousProducerPaths;
  }
  let isUpdate = installationIndex >= 0;
  if (isUpdate) installations[installationIndex] = nextRecord;
  else installations.push(nextRecord);
  pluginId.plugins[scope] = installations;
  return {
    write: true,
    result: {
      isUpdate,
      before,
    },
  };
}
//@ chunk-5xgkngpb.js:4461475-4461657 placement
async function restoreEarlierInstallRecord(pluginId, target, record, storageV5) {
  let changed = await updateInstalledPlugins(
    (stateFile) => getPendingUpdatesDetails(stateFile, pluginId, target, record),
    storageV5,
  );
  if (changed) {
    getPluginRegistry().installedPluginsSnapshot = null;
    logForDebugging(`Restored the earlier install record of ${pluginId} (scope: ${target.scope})`);
  }
  return changed;
}
//@ chunk-5xgkngpb.js:4461657-4461892 placement
function getPendingUpdatesDetails(stateFile, pluginId, target, record) {
  let memoryInstallations = stateFile.plugins[pluginId];
  let index =
    memoryInstallations?.findIndex(
      (memoryInstallation) =>
        memoryInstallation.scope === target.scope && memoryInstallation.projectPath === target.projectPath,
    ) ?? -1;
  let memoryInstallation = index >= 0 ? memoryInstallations?.[index] : undefined;
  if (
    memoryInstallations === undefined ||
    memoryInstallation === undefined ||
    !registerPluginInstallation(memoryInstallation, record)
  )
    return {
      write: false,
      result: false,
    };
  memoryInstallations[index] = target;
  return {
    write: true,
    result: true,
  };
}
//@ chunk-5xgkngpb.js:4461892-4462005 placement
/**
 * 去掉安装记录的 auto 标记（用户显式安装）。
 */
async function clearAutoInstalledFlag(pluginId, scope, projectPathForScope, storageV5) {
  let changed = await updateInstalledPlugins(
    (stateFile) => clearAutoFlagUpdate(stateFile, pluginId, scope, projectPathForScope),
    storageV5,
  );
  if (changed) getPluginRegistry().installedPluginsSnapshot = null;
  return changed;
}
//@ chunk-5xgkngpb.js:4462005-4462143 placement
function clearAutoFlagUpdate(stateFile, pluginId, scope, projectPath) {
  let installations = stateFile.plugins[pluginId];
  let installation = installationAtTarget(installations, scope, projectPath);
  if (installation?.auto !== true)
    return {
      write: false,
      result: false,
    };
  delete installation.auto;
  return {
    write: true,
    result: true,
  };
}
//@ chunk-5xgkngpb.js:4462143-4462199 placement
/**
 * readInstalledPluginsIfAny：读取安装记录，缺失返回 undefined。
 */
async function readInstalledPluginsIfAny(installPath, containmentRoot = installPath) {
  return (await pluginGitHead(installPath, containmentRoot)) ?? undefined;
}
//@ chunk-5xgkngpb.js:4462199-4462213 placement
var MAX_PLUGIN_MANIFEST_BYTES = 65536;
//@ chunk-5xgkngpb.js:4462213-4463126 placement
/**
 * 从插件清单读取版本号，清单超过 64 KB 时视为无版本。
 */
async function readManifestVersion(installPath, pluginId, storageV5) {
  let fsImplementation = getFsImplementation();
  let manifestPath = join(installPath, ".claude-plugin", "plugin.json");
  let cacheCoords =
    isStorageV5Enabled() && storageV5 !== undefined
      ? parseVersionCachePath(installPath, anchoredPluginCachePath())
      : null;
  if (isStorageV5Enabled() && storageV5 !== undefined && cacheCoords) {
    let readResult = await storageV5.read([
      {
        key: STORAGE_SPACES.pluginCache(cacheCoords.marketplace, cacheCoords.plugin, cacheCoords.version, [
          ".claude-plugin",
          "plugin.json",
        ]),
        offset: 0,
        length: MAX_PLUGIN_MANIFEST_BYTES,
      },
    ]);
    if (!readResult.ok || !readResult.value.items[0].found) {
      logForDebugging(`Could not extract version from manifest for ${pluginId}`);
      return "unknown";
    }
    let item = readResult.value.items[0];
    if (item.totalBytes > MAX_PLUGIN_MANIFEST_BYTES) {
      logForDebugging(`Manifest for ${pluginId} exceeds 64 KB, treating as unversioned`);
      return "unknown";
    }
    try {
      return jsonParse(stripBom(Buffer.from(item.value).toString("utf-8"))).version || "unknown";
    } catch {
      logForDebugging(`Could not extract version from manifest for ${pluginId}`);
      return "unknown";
    }
  }
  try {
    let fileBytes = await fsImplementation.readFileBytes(manifestPath, MAX_PLUGIN_MANIFEST_BYTES + 1);
    if (fileBytes.length > MAX_PLUGIN_MANIFEST_BYTES) {
      logForDebugging(`Manifest for ${pluginId} exceeds 64 KB, treating as unversioned`);
      return "unknown";
    }
    return jsonParse(stripBom(fileBytes.toString("utf-8"))).version || "unknown";
  } catch {
    logForDebugging(`Could not extract version from manifest for ${pluginId}`);
    return "unknown";
  }
}
//@ chunk-5xgkngpb.js:4463126-4471960 fingerprint (2.1.88 match: migrateFromEnabledPlugins, 0.464)
/**
 * 启动时把 settings 的 enabledPlugins 与 installed_plugins.json 对齐：为已启用但无安装记录的市场插件补记录（或排队安装），跳过托管/种子/读失败情况。
 */
async function migrateFromEnabledPlugins(storageV5) {
  if (await isInstalledListReplaceRefused(storageV5)) {
    logForDebugging(
      "Skipping the enabled-plugins sync: installed_plugins.json holds what this build cannot read, so it is left as it is",
      {
        level: "warn",
      },
    );
    let requiredCount = countWhere(
      Object.values(getSettingsForSource("policySettings")?.enabledPlugins ?? {}),
      (value) => value === true,
    );
    if (requiredCount > 0)
      logEvent("tengu_plugin_state_file_error", {
        operation: lit_2("migrate-from-enabled"),
        error_kind: lit_2("policy-sync-skipped"),
        recovered: false,
        required_count: requiredCount,
      });
    return;
  }
  let settings = isRemoteSettingsFetchFailed();
  let requiredIds = new Set(
    Object.entries(getSettingsForSource("policySettings")?.enabledPlugins || {})
      .filter(([key, value]) => value === true && PluginIdSchema().safeParse(key).success)
      .map(([key]) => key),
  );
  let rawFileData = getOriginalCwd();
  let wanted = new Map();
  let pluginScopeFromSettings = new Set();
  let gitTracked;
  let isGitTracked = () =>
    (gitTracked ??= isLocalSettingsGitTracked({
      onIndeterminate: "tracked",
    }));
  for (let source of EDITABLE_SETTING_SOURCES) {
    let sourceSettings = getSettingsFilePathForSource(source);
    if (sourceSettings) {
      if (pluginScopeFromSettings.has(sourceSettings)) continue;
      pluginScopeFromSettings.add(sourceSettings);
    }
    let enabledPlugins = getSettingsForSource(source)?.enabledPlugins || {};
    for (let pluginId of Object.keys(enabledPlugins)) {
      if (!PluginIdSchema().safeParse(pluginId).success) continue;
      if (enabledPlugins[pluginId] !== true) continue;
      let ownConfig = source === "userSettings" || (source === "localSettings" && !isGitTracked());
      let scope = settingsSourceName(source);
      let existing = wanted.get(pluginId);
      wanted.set(pluginId, {
        scope,
        projectPath: scope === "user" ? undefined : rawFileData,
        fromOwnConfig: ownConfig || (existing?.fromOwnConfig ?? false),
      });
    }
  }
  let flagAllIds = new Set();
  for (let [key, value] of Object.entries(getSettingsForSource("flagSettings")?.enabledPlugins || {})) {
    if (value !== true || !PluginIdSchema().safeParse(key).success || isPluginBlockedByPolicy(key)) continue;
    let existing = wanted.get(key);
    if (existing) {
      if (!existing.fromOwnConfig) flagAllIds.add(key);
      existing.fromOwnConfig = true;
      continue;
    }
    wanted.set(key, {
      scope: "user",
      projectPath: undefined,
      fromOwnConfig: true,
    });
    flagAllIds.add(key);
  }
  let storageKey = installedStorageKey(storageV5);
  let rawFile =
    isStorageV5Enabled() && storageV5 !== undefined && storageKey !== null
      ? await readInstalledPluginsFileRaw_2(storageV5, storageKey)
      : getPlan_2();
  let hasFile = rawFile !== null;
  let parsedV2 =
    hasFile && rawFile?.version === 2 && rawFile ? tryParseInstalledPluginsV2(rawFile.data) : undefined;
  if (parsedV2?.success) normalizeInstallPaths(parsedV2.data);
  let keptManaged = new Set();
  if (parsedV2?.success && settings) {
    for (let [key, value] of Object.entries(parsedV2.data.plugins))
      if (
        !requiredIds.has(key) &&
        !isPluginBlockedByPolicy(key) &&
        value.some((installation) => installation.scope === "managed")
      ) {
        keptManaged.add(key);
        requiredIds.add(key);
      }
    if (keptManaged.size > 0)
      logForDebugging(
        `Remote managed settings not settled; keeping managed record(s) for ${[...keptManaged].join(", ")} as they are`,
      );
  }
  for (let id of requiredIds) {
    wanted.set(id, {
      scope: "managed",
      projectPath: undefined,
      fromOwnConfig: true,
    });
    flagAllIds.delete(id);
  }
  let toProvision = new Set([...flagAllIds, ...requiredIds].filter((id) => !keptManaged.has(id)));
  let knownPromise;
  let loadKnown = () =>
    (knownPromise ??= loadKnownMarketplacesSafe(isStorageV5Enabled() ? storageV5 : undefined));
  if (wanted.size === 0 && !hasFile) return;
  if (parsedV2?.success) {
    let plugins = parsedV2.data.plugins;
    let skippedIds = new Set();
    let filtered = [...requiredIds].filter((id) => (plugins[id]?.length ?? 0) === 0);
    if (filtered.length > 0) {
      let knownMarketplaces = await loadKnown();
      for (let id of filtered) {
        let { marketplace } = parsePluginIdentifier(id);
        if (
          isSourceDisallowedOrUnverifiable(marketplace ? knownMarketplaces[marketplace]?.source : undefined)
        )
          skippedIds.add(id);
      }
    }
    let all = [...wanted.entries()].every(([id, want]) => {
      let installations = plugins[id];
      if (requiredIds.has(id))
        return (
          skippedIds.has(id) ||
          keptManaged.has(id) ||
          (installations?.length === 1 && installations[0]?.scope === "managed")
        );
      let present = installationAtTarget(installations, want.scope, want.projectPath) !== undefined;
      if (!want.fromOwnConfig) return true;
      return present;
    });
    let all_2 = Object.entries(plugins).every(
      ([key, value]) =>
        requiredIds.has(key) || !value.some((installation) => installation.scope === "managed"),
    );
    if (all && all_2) {
      let allResolvable = true;
      for (let id of requiredIds) {
        if (skippedIds.has(id) || keptManaged.has(id)) continue;
        let first = plugins[id]?.[0];
        if (first === undefined || !(await parsePluginIdSafe(id, first, storageV5, loadKnown))) {
          allResolvable = false;
          break;
        }
      }
      if (allResolvable) {
        logForDebugging("All plugins already exist, skipping migration");
        return;
      }
    }
  }
  logForDebugging(
    hasFile
      ? "Syncing installed_plugins.json with enabledPlugins from all settings.json files"
      : "Creating installed_plugins.json from settings.json files",
  );
  let known = toProvision.size > 0 ? await loadKnown() : undefined;
  let iso = new Date().toISOString();
  let v2Plugins = {};
  let existingState;
  if (hasFile) {
    existingState =
      isStorageV5Enabled() && storageV5 !== undefined && storageKey !== null
        ? await getInstalledPluginsAsync(storageV5)
        : getInstalledPlugins();
    v2Plugins = {
      ...existingState.plugins,
    };
  }
  let updatedCount = 0;
  let addedCount = 0;
  for (let [key, value] of Object.entries(v2Plugins)) {
    if (requiredIds.has(key)) continue;
    if (wanted.has(key)) continue;
    if (!value.some((installation) => installation.scope === "managed")) continue;
    let remaining = value.filter((installation) => installation.scope !== "managed");
    if (!(await ensureDirectoryBindingForMigration(key, value, remaining))) {
      logForDebugging(
        `Kept the managed entries of ${key} though policy no longer requires them: removing them needs plugin-directory-bindings.json in the plugins folder to record which repository the plugin was installed from, and that file could not be used or written. Will try again at next start.`,
        {
          level: "warn",
        },
      );
      continue;
    }
    if (remaining.length === 0) delete v2Plugins[key];
    else v2Plugins[key] = remaining;
    updatedCount++;
    logForDebugging(`Dropped orphaned managed entry for ${key} (no longer policy-required)`);
  }
  for (let [pluginId, want] of wanted) {
    if (keptManaged.has(pluginId)) continue;
    let installations = v2Plugins[pluginId];
    if (installations && installations.length > 0) {
      let changed = false;
      if (want.scope === "managed") {
        let first = installations[0];
        if (first && !(await parsePluginIdSafe(pluginId, first, storageV5, loadKnown))) {
          let healed = await healManagedRecord(pluginId, known, storageV5);
          if (healed !== undefined) {
            first.installPath = healed.installPath;
            first.version = healed.version;
            if (healed.gitCommitSha !== undefined) first.gitCommitSha = healed.gitCommitSha;
            else if (!healed.keepStoredCommit) delete first.gitCommitSha;
            delete first.resolvedVersion;
            first.lastUpdated = iso;
            changed = true;
            logForDebugging(
              `Healed ${pluginId} managed record from its marketplace at version ${healed.version}`,
            );
          } else
            logForDebugging(
              `Left ${pluginId} managed record as is: the loader cannot load from its cache and it could not be materialized`,
            );
        }
        if (first && (first.scope !== "managed" || first.projectPath !== undefined)) {
          first.scope = "managed";
          delete first.projectPath;
          first.lastUpdated = iso;
          changed = true;
          logForDebugging(`Updated ${pluginId} scope to managed (settings.json is source of truth)`);
        }
        if (installations.length > 1) {
          let remaining = installations.slice(0, 1);
          if (await ensureDirectoryBindingForMigration(pluginId, installations, remaining)) {
            logForDebugging(`Collapsed ${pluginId} to single managed entry (was ${installations.length})`);
            v2Plugins[pluginId] = remaining;
            changed = true;
          } else
            logForDebugging(
              `Did not collapse ${pluginId} to one managed entry (has ${installations.length}): removing the others needs plugin-directory-bindings.json in the plugins folder to record which repository the plugin was installed from, and that file could not be used or written. Will try again at next start.`,
              {
                level: "warn",
              },
            );
        }
      } else {
        let existing = installationAtTarget(installations, want.scope, want.projectPath);
        let blocked = false;
        if (!existing && want.fromOwnConfig && flagAllIds.has(pluginId)) {
          let { marketplace } = parsePluginIdentifier(pluginId);
          let source = marketplace ? known?.[marketplace]?.source : undefined;
          blocked = isPluginBlockedByPolicy(pluginId) || isSourceDisallowedOrUnverifiable(source);
        }
        if (!existing && !want.fromOwnConfig)
          logForDebugging(
            `Skipped auto-recording ${pluginId} for ${want.scope} (${want.projectPath ?? ""}) \u2014 enabled only by repo-authored settings`,
          );
        else if (!existing && blocked)
          logForDebugging(`Skipping --settings-enabled ${pluginId}: blocked by policy, not writing a record`);
        else if (!existing) {
          let template =
            installations.find(
              (installation) =>
                installation.projectPath !== undefined && installation.projectPath === rawFileData,
            ) ??
            installations.find((installation) => installation.scope === "user") ??
            installations.find(
              (installation) =>
                installation.projectPath !== undefined &&
                isSameNormalizedProjectPath(installation.projectPath, rawFileData),
            ) ??
            installations.reduce((acc, better) =>
              (better.lastUpdated ?? "") > (acc.lastUpdated ?? "") ? better : acc,
            );
          installations.push({
            scope: want.scope,
            installPath: template.installPath,
            ...(template.version !== undefined && {
              version: template.version,
            }),
            ...(template.resolvedVersion !== undefined && {
              resolvedVersion: template.resolvedVersion,
            }),
            installedAt: iso,
            lastUpdated: iso,
            ...(template.gitCommitSha !== undefined && {
              gitCommitSha: template.gitCommitSha,
            }),
            ...(template.sourceCommand !== undefined && {
              sourceCommand: template.sourceCommand,
            }),
            ...(template.sourceProducerPath !== undefined && {
              sourceProducerPath: template.sourceProducerPath,
            }),
            ...(template.previousProducerPaths !== undefined && {
              previousProducerPaths: template.previousProducerPaths,
            }),
            ...(want.projectPath && {
              projectPath: want.projectPath,
            }),
          });
          changed = true;
          logForDebugging(
            `Added ${pluginId} installation for scope ${want.scope}${want.projectPath ? ` (${want.projectPath})` : ""}`,
          );
        }
        let seen = new Set();
        let remaining = installations.filter((installation) => {
          if (installation.scope === "managed") return false;
          let key = `${installation.scope}|${installation.projectPath ?? ""}`;
          if (seen.has(key)) return false;
          seen.add(key);
          return true;
        });
        if (remaining.length < installations.length)
          if (await ensureDirectoryBindingForMigration(pluginId, installations, remaining)) {
            logForDebugging(
              `Cleaned ${pluginId} (${installations.length}\u2192${remaining.length}: stale managed and/or duplicates)`,
            );
            if (remaining.length === 0) delete v2Plugins[pluginId];
            else v2Plugins[pluginId] = remaining;
            changed = true;
          } else
            logForDebugging(
              `Kept ${installations.length - remaining.length} stale managed or duplicate entries of ${pluginId}: removing them needs plugin-directory-bindings.json in the plugins folder to record which repository the plugin was installed from, and that file could not be used or written.`,
              {
                level: "warn",
              },
            );
      }
      if (changed) updatedCount++;
    } else {
      if (!want.fromOwnConfig) {
        logForDebugging(`Skipped auto-recording ${pluginId} \u2014 enabled only by repo-authored settings`);
        continue;
      }
      let { name: pluginName, marketplace } = parsePluginIdentifier(pluginId);
      if (!pluginName || !marketplace) continue;
      try {
        logForDebugging(`Looking up plugin ${pluginId} in marketplace ${marketplace}`);
        let found =
          marketplace === OFFICIAL_MARKETPLACE_NAME
            ? await getPluginByIdCacheOnly(pluginId, storageV5)
            : await getPluginById(pluginId, storageV5);
        if (!found) {
          logForDebugging(`Plugin ${pluginId} not found in any marketplace, skipping`);
          continue;
        }
        let { entry, marketplaceInstallLocation } = found;
        let source;
        if (toProvision.has(pluginId)) {
          source = known?.[marketplace]?.source;
          if (isPluginBlockedByPolicy(pluginId) || isSourceDisallowedOrUnverifiable(source)) {
            logForDebugging(`Skipping ${pluginId}: blocked by policy, not writing a record`);
            continue;
          }
        }
        let installPath;
        let pluginVersion;
        let gitCommitSha = undefined;
        if (typeof entry.source === "string") {
          let cached = await cacheAndRegisterPlugin(
            pluginId,
            entry,
            entry.source,
            marketplaceInstallLocation,
            known,
            toProvision.has(pluginId) && !isLocalMarketplaceEntry(entry.source, source),
            storageV5,
          );
          if (cached === undefined) continue;
          ({ installPath, version: pluginVersion, gitCommitSha } = cached);
        } else {
          let versionDir = dirname(getVersionedCachePath(pluginId, "x"));
          let versions;
          try {
            versions = (await getFsImplementation().readdir(versionDir))
              .filter((entry) => entry.isDirectory() && !isTempSiblingName(entry.name))
              .map((entry) => entry.name);
          } catch (error) {
            if (!isENOENT(error)) throw error;
            logForDebugging(`External plugin ${pluginId} not in cache, skipping`);
            continue;
          }
          if (toProvision.has(pluginId)) {
            let kept = [];
            for (let versionName of versions)
              if (await pluginInstallPathExists(join(versionDir, versionName), storageV5))
                kept.push(versionName);
            versions = kept;
          }
          if (versions.length === 0) {
            logForDebugging(`External plugin ${pluginId} has no cached versions, skipping`);
            continue;
          }
          let preferredPath = entry.version ? getVersionedCachePath(pluginId, entry.version) : undefined;
          let cachePath =
            preferredPath && versions.includes(basename(preferredPath))
              ? preferredPath
              : join(versionDir, versions[0]);
          let versionName = basename(cachePath);
          installPath = cachePath;
          let isGitBacked = typeof entry.source === "string" || getPluginCloneUrl(entry.source) !== null;
          gitCommitSha = isGitBacked ? await readInstalledPluginsIfAny(cachePath) : undefined;
          let isRefTracked =
            isGitShaVersionName({
              isGitBacked,
              sourceHasPinnedSha: "sha" in entry.source && !!entry.source.sha,
              entryHasVersion: !!entry.version,
              versionName,
            }) && (await readManifestVersion(cachePath, pluginId, storageV5)) === "unknown";
          pluginVersion = isRefTracked ? undefined : versionName;
          if (isRefTracked)
            logForDebugging(
              `External plugin ${pluginId} is ref-tracked (cache dir ${versionName} is a git SHA, no manifest version), recording without a version so the loader re-clones it each load`,
            );
        }
        v2Plugins[pluginId] = [
          {
            scope: want.scope,
            installPath,
            ...(pluginVersion !== undefined && {
              version: pluginVersion,
            }),
            installedAt: iso,
            lastUpdated: iso,
            gitCommitSha,
            ...(want.projectPath && {
              projectPath: want.projectPath,
            }),
          },
        ];
        addedCount++;
        logForDebugging(`Added ${pluginId} with scope ${want.scope}`);
      } catch (error) {
        logForDebugging(`Failed to add plugin ${pluginId}: ${error}`);
      }
    }
  }
  if (!hasFile || updatedCount > 0 || addedCount > 0) {
    let v2Data = {
      version: 2,
      plugins: v2Plugins,
    };
    if (existingState !== undefined) copySetAsideRecords(existingState, v2Data);
    await saveInstalledPluginsV2(v2Data, storageV5);
    logForDebugging(`Sync completed: ${addedCount} added, ${updatedCount} updated in installed_plugins.json`);
  }
}
//@ chunk-5xgkngpb.js:4471960-4472101 affinity
function isGitShaVersionName({ isGitBacked, sourceHasPinnedSha, entryHasVersion, versionName }) {
  return (
    isGitBacked &&
    !sourceHasPinnedSha &&
    !entryHasVersion &&
    /^[0-9a-f]{12}(-[0-9a-f]{8})?$/.test(versionName)
  );
}
//@ chunk-5xgkngpb.js:4480199-4480667 fingerprint (2.1.88 match: getPluginVersionFromManifest, 0.818)
/**
 * 从插件目录 .claude-plugin/plugin.json 读 version（存储后端模式下经存储层读）。
 */
async function getPluginVersionFromManifest(installPath, storageV5, storageKey) {
  if (isStorageV5Enabled() && storageV5 !== undefined && storageKey !== null) {
    let text = await readPluginManifestViaStorage(storageV5, storageKey);
    return text === undefined ? undefined : readManifestBinaries(text);
  }
  let manifestDir = join(installPath, ".claude-plugin");
  if (!(await lstat(manifestDir).catch(() => null))?.isDirectory()) return;
  let manifestPath = join(manifestDir, "plugin.json");
  if (!(await lstat(manifestPath).catch(() => null))?.isFile()) return;
  let text;
  let handle;
  try {
    handle = await open(manifestPath, readOnlyNoFollowFlags());
    let stats = await handle.stat();
    if (!stats.isFile() || stats.size > ONE_MIB) return;
    text = await handle.readFile({
      encoding: "utf-8",
    });
  } catch {
    return;
  } finally {
    await handle?.close().catch(() => {
      return;
    });
  }
  return readManifestBinaries(text);
}
//@ chunk-5xgkngpb.js:4480667-4480781 placement
function readManifestBinaries(text) {
  let parsed;
  try {
    parsed = jsonParse(stripBom(text));
  } catch {
    return;
  }
  if (typeof parsed !== "object" || parsed === null) return;
  return parsePluginBinaries(parsed.binaries);
}
//@ chunk-5xgkngpb.js:4480781-4481131 placement
/**
 * 经 v5 存储读缓存版本里的 plugin.json（≤1 MiB）。
 */
async function readPluginManifestViaStorage(storageV5, coords) {
  let dirResult = await storageV5.scopeKind({
    ...coords,
    relPath: [".claude-plugin"],
  });
  if (!dirResult.ok || dirResult.value.kind !== "directory") return;
  let text = await storageV5.readText([
    {
      key: STORAGE_SPACES.pluginCache(coords.marketplace, coords.plugin, coords.version, [
        ".claude-plugin",
        "plugin.json",
      ]),
      offset: 0,
      length: ONE_MIB + 1,
    },
  ]);
  if (!text.ok) return;
  let [item] = text.value.items;
  if (!item.found || item.totalBytes > ONE_MIB) return;
  return item.value;
}
export {
  clearInstalledPluginsCache,
  filterInstallationsForCurrentProject,
  removeInstallationsAndRefreshSnapshot,
  primeInstalledPluginsCache,
  loadInstalledPlugins,
  loadInstalledPluginsSync,
  getInstalledPluginsSnapshot,
  hasFailedInstalledPluginsRead,
  readInstalledPluginsLenient,
  getInstalledListRefusal,
  readInstalledPluginsFile,
  getInstalledPlugins,
  formatFirstKnownVersion,
  getInstalledPluginsFilePath,
  parseInstalledPluginsJson,
  isInstallationRelevantToCurrentProject,
  removeAllPluginsForMarketplace,
  listInstalledPluginIds,
  getInstalledPluginsMap,
  getPluginVersionFromManifest,
  isPluginInstalled,
  readManifestVersion,
  isRecordablePluginId,
  restoreEarlierInstallRecord,
  removePluginInstallation,
  formatInvalidPluginIdMessage,
  getInstalledGitCommitSha,
  isPluginUnreadableOrShared,
  assertRecordablePluginId,
  readInstalledPluginsIfAny,
  addInstalledPlugin,
  hasInstallationForCurrentProject,
  clearAutoInstalledFlag,
  findDataDirSharers,
  findInstallationForCurrentProject,
  recordDirectoryRepositoryKey,
  updateInstallationPathOnDisk,
  getInstalledPluginsAsync,
  listSetAsideFiles,
  listUnreadableKeptFiles,
  initializeVersionedPlugins,
  isPluginGloballyInstalled,
};
