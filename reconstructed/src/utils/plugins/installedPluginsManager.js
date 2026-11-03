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
import { count } from "../collections.js";
import { isRemoteSettingsFetchFailed } from "../../services/cloudSessions/eligibility.js";
import { isLocalSettingsGitTracked } from "../config.js";
import { EDITABLE_SETTING_SOURCES } from "../settings/constants.js";
import { settingsSourceName } from "../settings/settingsSourceTrust.js";
import { isPluginBlockedByPolicy, isSourceDisallowedOrUnverifiable } from "./marketplacePolicy.js";
import { parsePluginIdentifier } from "./pluginIdentifier.js";
import { OFFICIAL_MARKETPLACE_NAME } from "./officialMarketplaceNames.js";
import { isTempSiblingName } from "./pluginCacheMaterialize.js";
import { readOnlyNoFollowFlags } from "../platformTargets.js";

//@ chunk-e6aww6q8.js:4326097-4326152 fingerprint = getInstalledPluginsFilePath (1)
/**
 * installed_plugins.json 路径：<plugins 目录>/installed_plugins.json。
 */
function getInstalledPluginsFilePath() {
  return join(getPluginsDirectory(), "installed_plugins.json");
}
//@ chunk-e6aww6q8.js:4326152-4326211 fingerprint = getInstalledPluginsV2FilePath (1)
function getInstalledPluginsV2FilePath() {
  return join(getPluginsDirectory(), "installed_plugins_v2.json");
}
//@ chunk-e6aww6q8.js:4326211-4326360 fingerprint = clearInstalledPluginsCache (0.595)
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
//@ chunk-e6aww6q8.js:4326360-4326438 layout
function setInstalledPluginsCache(installedPluginsFile) {
  let pluginRegistry = getPluginRegistry();
  pluginRegistry.installedPluginsFile = installedPluginsFile;
  pluginRegistry.installedPluginsEpoch++;
}
//@ chunk-e6aww6q8.js:4326438-4326477 layout
var UNPARSEABLE_RECORD_IDS = Symbol("unparseableRecordIds");
//@ chunk-e6aww6q8.js:4326477-4326633 layout
/**
 * 在错误对象上附加无法解析的记录 ID 列表（不可枚举属性）。
 */
function markUnparseableRecords(firstUnparseableError, n) {
  let r = firstUnparseableError ?? Error("a record under a valid plugin id could not be parsed");
  Object.defineProperty(r, UNPARSEABLE_RECORD_IDS, {
    value: [...n],
    enumerable: false,
  });
  return r;
}
//@ chunk-e6aww6q8.js:4326633-4326689 layout
/**
 * 读取错误对象上的无法解析记录 ID 列表。
 */
function getUnparseableRecordIds(e) {
  return e instanceof Error ? e[UNPARSEABLE_RECORD_IDS] : undefined;
}
//@ chunk-e6aww6q8.js:4326689-4326986 layout
/**
 * 记录插件状态文件错误遥测 tengu_plugin_state_file_error（操作、错误种类：无法解析的记录/未替换/JSON 语法…）。
 */
function logPluginStateFileError(e, n, recovered) {
  logEvent("tengu_plugin_state_file_error", {
    operation: fromEnum(e),
    error_kind:
      getUnparseableRecordIds(n) !== undefined
        ? lit_2("unparsed-record")
        : n instanceof InstalledListNotReplacedError
          ? (sanitizeErrnoForTelemetry(n) ?? lit_2("not-replaced"))
          : n instanceof SyntaxError
            ? lit_2("syntax-error")
            : n instanceof Error && n.name === "ZodError"
              ? lit_2("validation-error")
              : (sanitizeErrnoForTelemetry(n) ?? lit_2("unknown")),
    recovered,
  });
}
//@ chunk-e6aww6q8.js:4326986-4328557 fingerprint = migrateToSinglePluginFile (0.69)
/**
 * 一次性迁移：把旧的 installed_plugins_v2.json 与旧版单文件合并成单一 installed_plugins.json（V2 形状），不会覆盖已有列表。
 */
async function migrateToSinglePluginFile(e) {
  let fs = getPluginRegistry();
  if (fs.installedPluginsMigrated) return;
  let mainFilePath = getFsImplementation();
  let mainFilePath_2 = getInstalledPluginsFilePath();
  let v2Data = getInstalledPluginsV2FilePath();
  let y = installedStorageKey(e);
  let S;
  try {
    let w = false;
    let L = false;
    let G = true;
    try {
      let installedPluginsFileRaw = readInstalledPluginsFileRaw(mainFilePath_2);
      try {
        G = readInstalledPluginsFileRaw(v2Data) !== null;
      } catch {}
      if (G) assertInstalledPluginsReplaceable_2(installedPluginsFileRaw);
      else assertInstalledPluginsReplaceable(installedPluginsFileRaw);
    } catch (error) {
      if (!(error instanceof InstalledListNotReplacedError)) throw error;
      L = true;
    }
    try {
      if (L || !G)
        throw Object.assign(Error("nothing is renamed over the list"), {
          code: "ENOENT",
        });
      mainFilePath.renameSync(v2Data, mainFilePath_2);
      w = true;
    } catch (error) {
      let errnoCode = getErrnoCode(error);
      if (errnoCode !== "ENOENT" && errnoCode !== "EEXIST") throw error;
      if (errnoCode === "EEXIST")
        try {
          mainFilePath.unlinkSync(v2Data);
        } catch {}
    }
    if (w) {
      logForDebugging("Renamed installed_plugins_v2.json to installed_plugins.json");
      if (isStorageV5Enabled() && e !== undefined && y !== null) {
        let installedPluginsEpoch = fs.installedPluginsEpoch;
        let rawData = await readInstalledPluginsFileRaw_2(e, y);
        if (rawData !== null) {
          let installedPluginsV2 = loadInstalledPluginsV2(rawData);
          if (fs.installedPluginsEpoch === installedPluginsEpoch)
            fs.installedPluginsFile = installedPluginsV2;
          await cleanupLegacyCache(installedPluginsV2);
        }
      } else S = cleanupLegacyCache(getInstalledPlugins());
      fs.installedPluginsMigrated = true;
      await S;
      return;
    }
    if (isStorageV5Enabled() && e !== undefined && y !== null) {
      let ke = await migrateStoredV1ToV2(e, y);
      if (ke !== undefined) {
        logForDebugging(
          `Converted installed_plugins.json from V1 to V2 format (${ke.v1PluginCount} plugins)`,
        );
        await cleanupLegacyCache(ke.data);
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
      writeAndPublishSync(mainFilePath_2, jsonStringify(v2Data, null, 2));
      logForDebugging(
        `Converted installed_plugins.json from V1 to V2 format (${Object.keys(v1Data.plugins).length} plugins)`,
      );
      S = cleanupLegacyCache(v2Data);
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
  await S;
}
//@ chunk-e6aww6q8.js:4328557-4329866 fingerprint = cleanupLegacyCache (0.4)
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
    let h = wslWalkRootOf(cachePath);
    if (h === "undeterminable") {
      logForDebugging(
        "Skipping legacy cache cleanup: the cache root volume could not be read to map its WSL companion views",
      );
      return;
    }
    for (let installations of Object.values(v2Data.plugins))
      for (let entry of installations) {
        referencedPaths.add(normalizePathForPlatform(resolve_2(getOriginalCwd(), entry.installPath)));
        let G = classifyMarketplacePath(entry.installPath);
        if (!G.suspect)
          referencedPaths.add(
            normalizePathForPlatform(
              toComparablePath(G.absolute, {
                foldCase: true,
                knownNotSuspect: true,
              }),
            ),
          );
        let alternatePlatformPath = toAlternatePlatformPath(entry.installPath, h);
        if (alternatePlatformPath !== undefined)
          referencedPaths.add(normalizePathForPlatform(alternatePlatformPath));
      }
    let y = [...referencedPaths];
    let entries = await fs.readdir(cachePath);
    for (let dirent of entries) {
      let entry = dirent.name;
      if (regExp_18.test(entry)) continue;
      let entryPath = join(cachePath, entry);
      try {
        if (!(await classifyDirEntrySafe(cachePath, dirent))?.isDirectory) continue;
        let entries = await fs.readdir(entryPath);
        let Z = false;
        for (let we of entries) {
          if (!(await classifyDirEntrySafe(entryPath, we))?.isDirectory) continue;
          let Ee = join(entryPath, we.name);
          let entries = await fs.readdir(Ee);
          for (let Ie of entries)
            if (Ie.name.endsWith(".zip") || (await classifyDirEntrySafe(Ee, Ie))?.isDirectory) {
              Z = true;
              break;
            }
          if (Z) break;
        }
        if (Z) continue;
        let Se = (subDirent) =>
          referencedPaths.has(subDirent) || y.some((vDirent) => vDirent.startsWith(subDirent + sep));
        if (!(
          Se(normalizePathForPlatform(entryPath)) ||
          Se(
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
//@ chunk-e6aww6q8.js:4330013-4330286 callgraph-fingerprint = readInstalledPluginsFileRaw (0.319)
async function readInstalledPluginsFileRaw_2(e, n) {
  let r = await e.read([n]);
  if (!r.ok) throw storageAccessError(r.error);
  let s = r.value.items[0];
  if (s === undefined) throw Error("installed plugins registry read settled without an outcome for its key");
  if (!s.found) return null;
  return parseInstalledPluginsJson(Buffer.from(s.value).toString("utf-8"));
}
//@ chunk-e6aww6q8.js:4330286-4330544 layout
/**
 * 经存储层读取 installed_plugins.json 原文（不存在返回 null）。
 */
async function readInstalledPluginsViaStorage(e, n) {
  let r = await e.read([n]);
  if (!r.ok) throw storageAccessError(r.error);
  let s = r.value.items[0];
  if (s === undefined) throw Error("installed plugins registry read settled without an outcome for its key");
  return s.found ? Buffer.from(s.value).toString("utf-8") : null;
}
//@ chunk-e6aww6q8.js:4330544-4330635 layout
/**
 * 解析 installed_plugins.json 文本，返回 {version, data}（无 version 视为 1）。
 */
function parseInstalledPluginsJson(e) {
  let n = jsonParse(e);
  return {
    version: typeof n?.version === "number" ? n.version : 1,
    data: n,
  };
}
//@ chunk-e6aww6q8.js:4330635-4330731 layout
function toInstalledPluginsV2(e) {
  return e.version === 2
    ? normalizeInstallPaths(parseInstalledPluginsV2Strict(e.data, "load-from-disk"))
    : migrateV1ToV2(InstalledPluginsFileSchemaV1().parse(e.data));
}
//@ chunk-e6aww6q8.js:4330731-4330882 fingerprint = hasPendingUpdates (0.783)
function normalizeInstallPaths(installedPluginsV2Strict) {
  for (let plugin of Object.values(installedPluginsV2Strict.plugins))
    for (let diskEntry of plugin) {
      if (seedDirFor(diskEntry.installPath) !== undefined) continue;
      diskEntry.installPath = relocateInstallPath(diskEntry.installPath);
    }
  return installedPluginsV2Strict;
}
//@ chunk-e6aww6q8.js:4330882-4332310 layout
/**
 * 生成“插件 id 不合法、无法安装”的说明：区分多个 @、npm 包名不合法、插件名/市场名哪个不合法；名字含不可见字符时补一句； 是依赖的 id 不合法时以依赖方口吻描述。
 */
function formatInvalidPluginIdMessage(pluginId, dependentId, parts) {
  let atIndex = pluginId.lastIndexOf("@");
  let marketplaceName = parts?.marketplaceName ?? (atIndex >= 0 ? pluginId.slice(atIndex + 1) : "");
  let pluginName = parts?.pluginName ?? (atIndex > 0 ? pluginId.slice(0, atIndex) : "");
  let S = marketplaceName === pluginManifestPathSchemas;
  let w = countCharInString(pluginId, "@");
  let L = parts === undefined && w > (S && pluginId.startsWith("@") ? 2 : 1);
  let G = isValidPluginIdSegment(pluginName);
  let q = atIndex >= 0 && isValidPluginIdSegment(marketplaceName);
  let Z =
    'Each part of a plugin id (plugin@marketplace) may use only the letters a-z and A-Z, digits, ".", "_" and "-", and must start with a letter or digit.';
  let Se = L
    ? `Each part of a plugin id (plugin@marketplace) may use only the letters a-z and A-Z, digits, ".", "_" and "-", and must start with a letter or digit. Here the id holds more than one "@", so the plugin's name or the marketplace's name holds one; whoever named it can rename it.`
    : S
      ? "its first half is not a package name that the npm marketplace accepts."
      : `Each part of a plugin id (plugin@marketplace) may use only the letters a-z and A-Z, digits, ".", "_" and "-", and must start with a letter or digit. Here ${G && !q ? "the marketplace's name does not" : !G && q ? "the plugin's name does not" : "they do not"}; the marketplace's maintainer can rename ${G || q ? "it" : "both"}.`;
  let ke = quotedPrintable(pluginId);
  let we = ke !== truncateWithEllipsis_2(normalizeQuotes(pluginId), 300);
  let Ee = dependentId !== undefined && dependentId !== pluginId;
  let Ae = !we
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
/**
 * isRecordablePluginId：插件 id 符合 schema。
 */
function isRecordablePluginId(e) {
  return PluginIdSchema().safeParse(e).success;
}
//@ chunk-e6aww6q8.js:4332527-4332706 layout
class UnrecordablePluginIdError extends TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS {
  pluginCommandErrorCategory = "validation";
  constructor(pluginId) {
    super(formatInvalidPluginIdMessage(pluginId), "plugin id cannot be a key of the install records");
    this.name = "UnrecordablePluginIdError";
  }
}
//@ chunk-e6aww6q8.js:4332706-4332750 layout
/**
 * assertRecordablePluginId：id 不可记录时抛错。
 */
function assertRecordablePluginId(e) {
  if (!isRecordablePluginId(e)) throw new UnrecordablePluginIdError(e);
}
//@ chunk-e6aww6q8.js:4332750-4332791 layout
var SET_ASIDE_RECORDS = Symbol("setAsideInstallRecords");
//@ chunk-e6aww6q8.js:4332791-4332821 layout
function setAsideRecordsOf(e) {
  return e[SET_ASIDE_RECORDS];
}
//@ chunk-e6aww6q8.js:4332821-4332920 layout
function attachSetAsideRecords(e, value) {
  Object.defineProperty(e, SET_ASIDE_RECORDS, {
    value,
    enumerable: false,
    configurable: true,
    writable: true,
  });
}
//@ chunk-e6aww6q8.js:4332920-4332974 layout
function copySetAsideRecords(e, v2Data) {
  let r = setAsideRecordsOf(e);
  if (r !== undefined) attachSetAsideRecords(v2Data, r);
}
//@ chunk-e6aww6q8.js:4332974-4333016 layout
function serializeInstalledPlugins(e) {
  writeSetAsideRecords(e);
  return jsonStringify(e, null, 2);
}
//@ chunk-e6aww6q8.js:4333016-4333932 layout
/**
 * 宽松解析 installed_plugins.json V2：存在键合法但本版本解析不了的记录时记 warn 并抛出（视为不可读、不覆盖文件）； 键本身不合法的记录登记为 set-aside（下次写时复制到带日期的旁文件后丢弃）。返回解析后的文件对象。
 */
function parseInstalledPluginsV2Strict(e, n) {
  let { file, setAside, keptRaw, firstError, firstUnparseableError } = parseInstalledPluginsV2Leniently(e);
  let keys = Object.keys(setAside);
  let keys_2 = Object.keys(keptRaw);
  if (keys_2.length > 0) {
    logForDebugging(
      `installed_plugins.json: ${keys_2.length} record(s) under a valid plugin id that this build cannot parse (another build's, perhaps newer): ${keys_2
        .slice(0, 10)
        .map((G) => jsonStringify(quotedPrintable(G, 120)))
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
    logPluginStateFileError(n, firstError, true);
    logForDebugging(
      `installed_plugins.json: ${keys.length} record(s) set aside, because their key is not a valid plugin id and no build to date can use them: ${keys
        .slice(0, 10)
        .map((G) => jsonStringify(quotedPrintable(G, 120)))
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
//@ chunk-e6aww6q8.js:4333932-4334071 layout
function tryParseInstalledPluginsV2(e) {
  try {
    let { file, keptRaw } = parseInstalledPluginsV2Leniently(e);
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
//@ chunk-e6aww6q8.js:4334071-4334459 layout
/**
 * set-aside 记录旁文件写失败的错误。
 */
function setAsideCopyFailedError(e, n) {
  return new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
    `installed_plugins.json was not changed: it holds records under names that no version of Claude Code can use; they are copied to a side file before they are removed, and that copy could not be written to ${e} (${n}). Make that path writable, or move what stands there away, and try again.`,
    "the side copy of set-aside install records could not be written",
  );
}
//@ chunk-e6aww6q8.js:4334459-4334920 layout
/**
 * 写 installed_plugins.json 前，把被 set aside 的记录按键排序写到插件目录下带日期与内容哈希的旁文件（权限 0600），失败抛 Sys 错误；成功后清空登记。
 */
function writeSetAsideRecords(e) {
  let n = setAsideRecordsOf(e);
  if (n === undefined || Object.keys(n).length === 0) return;
  let r = Object.create(null);
  for (let key of Object.keys(n).sort()) r[key] = n[key];
  let s = jsonStringify(r, null, 2);
  let h = join(
    getPluginsDirectory(),
    setAsideFileName(new Date(), createHash("sha256").update(s).digest("hex").slice(0, 12)),
  );
  try {
    appendEntryToFile();
    writeAndPublishSync(h, s, 384);
  } catch (error) {
    throw setAsideCopyFailedError(h, errorMessage(error));
  }
  attachSetAsideRecords(e, {});
  logForDebugging(
    `installed_plugins.json: copied ${Object.keys(n).length} set-aside record(s) to ${h} before this write drops them from installed_plugins.json`,
    {
      level: "warn",
    },
  );
}
//@ chunk-e6aww6q8.js:4334920-4335171 fingerprint = migrateV1ToV2 (1)
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
//@ chunk-e6aww6q8.js:4335171-4335366 layout
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
//@ chunk-e6aww6q8.js:4335366-4335893 layout
/**
 * 经存储后端（storageV5）异步读取 installed_plugins.json 并缓存；内存已有时直接返回缓存。
 */
async function getInstalledPluginsAsync(e) {
  let n = installedStorageKey(e);
  if (!isStorageV5Enabled() || e === undefined || n === null) return getInstalledPlugins();
  let pluginRegistry = getPluginRegistry();
  if (pluginRegistry.installedPluginsFile !== null) {
    logForDebugging(
      "installed_plugins.json already cached before this storage-interface load; serving the cached copy",
    );
    return pluginRegistry.installedPluginsFile;
  }
  let installedPluginsEpoch = pluginRegistry.installedPluginsEpoch;
  let h;
  try {
    h = loadInstalledPluginsV2(await readInstalledPluginsFileRaw_2(e, n));
    logForDebugging(
      `Loaded installed_plugins.json through the storage interface (${Object.keys(h.plugins).length} plugins)`,
    );
  } catch (error) {
    h = emptyStateAfterLoadFailure(error);
  }
  if (pluginRegistry.installedPluginsEpoch === installedPluginsEpoch)
    pluginRegistry.installedPluginsFile ??= h;
  return pluginRegistry.installedPluginsFile ?? h;
}
//@ chunk-e6aww6q8.js:4335893-4335943 layout
/**
 * 存储后端可用时预读 installed_plugins 到内存缓存。
 */
async function primeInstalledPluginsCache(storageV5) {
  if (installedStorageKey(storageV5) !== null) await getInstalledPluginsAsync(storageV5);
}
//@ chunk-e6aww6q8.js:4335943-4336352 fingerprint = loadInstalledPluginsV2 (0.737)
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
//@ chunk-e6aww6q8.js:4336352-4336372 layout
var failedInstalledPluginsReads = new WeakSet();
//@ chunk-e6aww6q8.js:4336372-4336405 placement
/**
 * hasFailedInstalledPluginsRead：该路径曾读失败。
 */
function hasFailedInstalledPluginsRead(e) {
  return failedInstalledPluginsReads.has(e);
}
//@ chunk-e6aww6q8.js:4336405-4336577 placement
async function getInstalledPluginsMap(e, n = false) {
  if (n) {
    let installedPlugins = loadInstalledPluginsSync();
    return hasFailedInstalledPluginsRead(installedPlugins) ? undefined : installedPlugins.plugins;
  }
  let installedPluginsFile = getPluginRegistry().installedPluginsFile;
  if (installedPluginsFile === null && !e) return;
  let s = installedPluginsFile ?? getInstalledPlugins();
  return hasFailedInstalledPluginsRead(s) ? undefined : s.plugins;
}
//@ chunk-e6aww6q8.js:4336577-4336721 placement
/**
 * 其他与该插件共用（大小写不敏感）数据目录的插件 id。
 */
function findDataDirSharers(e, n, r = new Set([e])) {
  let lower = pluginDataDirPath(e).toLowerCase();
  return Object.keys(n.plugins).filter(
    (key) => key !== e && !r.has(key) && pluginDataDirPath(key).toLowerCase() === lower,
  );
}
//@ chunk-e6aww6q8.js:4336721-4336799 placement
/**
 * isPluginUnreadableOrShared：插件读失败或数据目录被共享。
 */
function isPluginUnreadableOrShared(e, n, r = new Set([e])) {
  if (hasFailedInstalledPluginsRead(n)) return true;
  return findDataDirSharers(e, n, r).length > 0;
}
//@ chunk-e6aww6q8.js:4336799-4336899 placement
/**
 * 有安装记录的插件 id；读失败返回 unknown。
 */
function listInstalledPluginIds(installedPlugins) {
  return hasFailedInstalledPluginsRead(installedPlugins)
    ? "unknown"
    : Object.entries(installedPlugins.plugins).flatMap(([key, value]) => (value.length > 0 ? [key] : []));
}
//@ chunk-e6aww6q8.js:4336899-4337148 placement
function emptyStateAfterLoadFailure(error) {
  let n = errorMessage(error);
  logForDebugging(`Failed to load installed_plugins.json: ${n}. Starting with empty state.`, {
    level: "error",
  });
  if (
    !isSyscallError(error) &&
    !(error instanceof SyntaxError) &&
    getUnparseableRecordIds(error) === undefined
  )
    logError(toError(error));
  logPluginStateFileError("load", error, true);
  let r = {
    version: 2,
    plugins: {},
  };
  failedInstalledPluginsReads.add(r);
  return r;
}
//@ chunk-e6aww6q8.js:4337148-4337208 placement
function installedStorageKey(e) {
  return !isStorageV5Enabled() || e === undefined ? null : pluginRegistrySpace("installed");
}
//@ chunk-e6aww6q8.js:4337208-4337251 placement
function installedPluginsFileMode() {
  return 438 & ~process.umask();
}
//@ chunk-e6aww6q8.js:4337251-4338298 placement
/**
 * 读取 installed_plugins.json，遇到未知版本格式时报错。
 */
function readInstalledPluginsFile(e) {
  if (e.unreadRecordIds.length === 0)
    return `installed_plugins.json is in a format (version ${e.formatVersion ?? "unknown"}) that this version of Claude Code does not know, so plugins cannot be changed from this version, and some may not load. Update Claude Code on this machine (claude update), or change plugins with the version of Claude Code that wrote ${getInstalledPluginsFilePath()}.`;
  let mapped = e.unreadRecordIds
    .slice(0, 3)
    .map((unreadRecordId) => `"${quotedPrintable(unreadRecordId, 120)}"`);
  let r = e.unreadRecordIds.length - mapped.length;
  let s = e.unreadRecordIds.length === 1;
  let h = `${mapped.join(", ")}${r > 0 ? ` and ${r} more` : ""}`;
  return `installed_plugins.json holds ${s ? "a record" : "records"} under ${h} that this version of Claude Code cannot read, so plugins cannot be changed from this version, and some may not load. Update Claude Code on this machine (claude update); or uninstall ${s ? "that plugin" : "those plugins"} with the version of Claude Code that wrote ${s ? "the record" : "the records"}; or, if neither helps, delete ${s ? "that record" : "each of those records"} from ${getInstalledPluginsFilePath()} by hand, then restart or run /reload-plugins.`;
}
//@ chunk-e6aww6q8.js:4338298-4338628 placement
class InstalledListNotReplacedError extends TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS {
  unreadRecordIds;
  formatVersion;
  constructor(unreadRecordIds, formatVersion, r) {
    super(
      `installed_plugins.json was not changed: ${
        r ??
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
}
//@ chunk-e6aww6q8.js:4338664-4339067 placement
/**
 * 不可读文件的保留副本写失败的错误。
 */
function keptCopyWriteFailedError(e, n) {
  return new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
    `installed_plugins.json cannot be read, and it was not changed. Before it is rebuilt, its contents are kept in a file beside it, but that file (${e}) could not be written: ${n}. Free disk space or make the plugins folder writable, or move installed_plugins.json aside by hand, then try again.`,
    "the kept copy of an unreadable installed_plugins.json could not be written",
  );
}
//@ chunk-e6aww6q8.js:4339067-4339084 placement
var MAX_INSTALLED_PLUGINS_BYTES = 16777216;
//@ chunk-e6aww6q8.js:4339084-4339548 placement
/**
 * 安全地同步读取文件：O_RDONLY|O_NOFOLLOW|O_NONBLOCK 打开，fstat 与 lstat 必须同为单硬链接普通文件且 dev/ino 一致， 大小不超过 Rys；读满或出错返回 undefined。
 */
function readSmallRegularFileSync(installedPluginsFilePath) {
  let n;
  try {
    n = openSync(installedPluginsFilePath, constants.O_RDONLY | constants.O_NOFOLLOW | constants.O_NONBLOCK);
    let r = fstatSync(n, {
      bigint: true,
    });
    let s = lstatSync(installedPluginsFilePath, {
      bigint: true,
    });
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
    if (r.size > BigInt(MAX_INSTALLED_PLUGINS_BYTES)) return;
    let h = Buffer.allocUnsafe(Number(r.size) + 1);
    let y = 0;
    while (y < h.length) {
      let S = readSync(n, h, y, h.length - y, y);
      if (S === 0) return Buffer.from(h.subarray(0, y));
      y += S;
    }
    return;
  } catch {
    return;
  } finally {
    if (n !== undefined)
      try {
        closeSync(n);
      } catch {}
  }
}
//@ chunk-e6aww6q8.js:4339548-4340376 placement
function readInstalledPluginsRaw(e) {
  let n = typeof e === "string" ? Buffer.from(e, "latin1") : Buffer.from(e);
  let smallRegularFile = readSmallRegularFileSync(getInstalledPluginsFilePath());
  if (
    smallRegularFile === undefined ||
    !(smallRegularFile.equals(n) || smallRegularFile.toString("utf8") === n.toString("utf8"))
  ) {
    logForDebugging(
      "installed_plugins.json could not be read at all, and its bytes are NOT kept: its name is not a plain file of its own (a symbolic link, a second name of another file, too large), or it changed while it was read; this write replaces only the name",
      {
        level: "warn",
      },
    );
    return;
  }
  let s = join(
    getPluginsDirectory(),
    unreadableKeptFileName(
      new Date(),
      createHash("sha256").update(smallRegularFile).digest("hex").slice(0, 12),
    ),
  );
  try {
    appendEntryToFile();
    writeAndPublishSync(s, smallRegularFile, 384);
  } catch (error) {
    let y = keptCopyWriteFailedError(s, errorMessage(error));
    let errnoCode = getErrnoCode(error);
    let errno = isSyscallError(error) ? error.errno : undefined;
    throw Object.assign(
      y,
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
    `installed_plugins.json could not be read at all (not JSON, or not a list of plugins): its bytes are kept in ${s} before this write rebuilds it`,
    {
      level: "warn",
    },
  );
}
//@ chunk-e6aww6q8.js:4340376-4340451 placement
function assertInstalledPluginsReplaceable(raw) {
  let refusal = raw === null ? undefined : checkInstalledPluginsReplaceable(raw).refusal;
  if (refusal !== undefined) throw refusal;
}
//@ chunk-e6aww6q8.js:4340529-4341033 placement
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
//@ chunk-e6aww6q8.js:4341033-4341216 placement
function assertInstalledPluginsReplaceable_2(installedPluginsFileRaw, n) {
  if (installedPluginsFileRaw === null) return;
  let r = checkInstalledPluginsReplaceable(installedPluginsFileRaw);
  if (r.refusal !== undefined) throw r.refusal;
  if (n !== undefined && r.setAside !== undefined)
    attachSetAsideRecords(n, {
      ...setAsideRecordsOf(n),
      ...r.setAside,
    });
  if (r.unreadableAtAll) readInstalledPluginsRaw(installedPluginsFileRaw);
}
//@ chunk-e6aww6q8.js:4341216-4341381 placement
/**
 * 列出 installed_plugins 不可读时保留的副本文件。
 */
async function listUnreadableKeptFiles() {
  let e = dirname(getInstalledPluginsFilePath());
  try {
    return (await getFsImplementation().readdir(e))
      .filter((r) => r.isFile())
      .map((r) => r.name)
      .filter(isUnreadableKeptFileName)
      .sort()
      .map((r) => join(e, r));
  } catch {
    return [];
  }
}
//@ chunk-e6aww6q8.js:4341381-4341546 placement
/**
 * 列出 set-aside 旁文件。
 */
async function listSetAsideFiles() {
  let e = dirname(getInstalledPluginsFilePath());
  try {
    return (await getFsImplementation().readdir(e))
      .filter((r) => r.isFile())
      .map((r) => r.name)
      .filter(isSetAsideFileName)
      .sort()
      .map((r) => join(e, r));
  } catch {
    return [];
  }
}
//@ chunk-e6aww6q8.js:4341546-4341807 placement
/**
 * 读文件检查是否会拒绝覆盖，返回未读记录 id 与格式版本。
 */
async function getInstalledListRefusal(storageV5) {
  try {
    let n = installedStorageKey(storageV5);
    assertInstalledPluginsReplaceable(
      isStorageV5Enabled() && storageV5 !== undefined && n !== null
        ? await readInstalledPluginsViaStorage(storageV5, n)
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
//@ chunk-e6aww6q8.js:4341807-4342000 placement
async function readInstalledPluginsLenient(e) {
  try {
    let n = installedStorageKey(e);
    let r =
      isStorageV5Enabled() && e !== undefined && n !== null
        ? await readInstalledPluginsViaStorage(e, n)
        : readInstalledPluginsFileRaw(getInstalledPluginsFilePath());
    if (r === null) return {};
    let installedPluginsJson = parseInstalledPluginsJson(getMcpAuthCache(r));
    return installedPluginsJson.version === 2
      ? parseInstalledPluginsV2Leniently(installedPluginsJson.data).file.plugins
      : {};
  } catch {
    return {};
  }
}
//@ chunk-e6aww6q8.js:4342000-4342192 placement
async function isInstalledListReplaceRefused(e) {
  try {
    let n = installedStorageKey(e);
    assertInstalledPluginsReplaceable(
      isStorageV5Enabled() && e !== undefined && n !== null
        ? await readInstalledPluginsViaStorage(e, n)
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
//@ chunk-e6aww6q8.js:4342192-4342553 placement
/**
 * 以 latin1 读原始字节；不存在返回 null，读不了抛不可覆盖错误。
 */
function readInstalledPluginsFileRaw(e) {
  try {
    return Buffer.from(
      getFsImplementation().readFileSync(e, {
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
//@ chunk-e6aww6q8.js:4342553-4343100 fingerprint = saveInstalledPluginsV2 (0.547)
/**
 * 写回 installed_plugins.json（V2），存储后端模式下经存储接口原子写。
 */
async function saveInstalledPluginsV2(installedPluginsFile, n) {
  let r = installedStorageKey(n);
  if (isStorageV5Enabled() && n !== undefined && r !== null) {
    await storageUpdateWithRetry(
      n,
      r,
      (y) => {
        assertInstalledPluginsReplaceable_2(
          y === undefined ? null : Buffer.from(y.value),
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
    writeAndPublishSync(filePath, jsonContent);
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
          {
            cause: e,
            ...errnoFieldsFromStorageError(e),
          },
        );
  logPluginStateFileError("save", r, false);
  return r;
}
//@ chunk-e6aww6q8.js:4343460-4343685 layout
function storageAccessError(error) {
  return error.code === "Failed" && error.cause instanceof Error
    ? attachErrnoFields(error.cause, error)
    : Object.assign(
        new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
          `installed_plugins.json: ${formatStorageError(error)}`,
          "installed_plugins.json storage access failed (v5 backend error)",
        ),
        {
          cause: error,
          ...errnoFieldsFromStorageError(error),
        },
      );
}
//@ chunk-e6aww6q8.js:4343685-4343742 layout
function attachErrnoFields(cause, n) {
  return isSyscallError(cause) ? cause : Object.assign(cause, errnoFieldsFromStorageError(n));
}
//@ chunk-e6aww6q8.js:4343742-4343785 layout
var ERRNO_BY_CODE = new Map(Object.entries(constants_8.errno));
//@ chunk-e6aww6q8.js:4343785-4343936 layout
function errnoFieldsFromStorageError(e) {
  let telemetryCode = "telemetryCode" in e ? e.telemetryCode : undefined;
  let r = telemetryCode === undefined ? undefined : ERRNO_BY_CODE.get(telemetryCode);
  return telemetryCode === undefined || r === undefined
    ? undefined
    : {
        code: telemetryCode,
        errno: -r,
      };
}
//@ chunk-e6aww6q8.js:4343936-4343958 layout
var STORAGE_UPDATE_MAX_ATTEMPTS = 5;
var storageUpdateBackoff = createJitteredBackoff(50);
//@ chunk-e6aww6q8.js:4343958-4344319 layout
async function updateInstalledPluginsViaStorage(e, n, r) {
  let s = await storageUpdateWithRetry(e, n, (h) => applyUpdateToStoredFile(h, r), storageSaveError);
  if (s.loadError !== undefined) {
    logForDebugging(`Failed to load installed plugins from disk: ${errorMessage(s.loadError)}`, {
      level: "error",
    });
    logPluginStateFileError("load-from-disk", s.loadError, true);
  }
  if (s.written !== undefined) {
    setInstalledPluginsCache(s.written);
    logForDebugging(
      `Saved ${Object.keys(s.written.plugins).length} installed plugins through the storage interface`,
    );
  }
  return s.result;
}
//@ chunk-e6aww6q8.js:4344319-4344708 layout
async function storageUpdateWithRetry(e, n, r, s) {
  for (let idx = 1; ; idx++) {
    let y = await e.update(n, r, {
      mode: installedPluginsFileMode(),
    });
    if (!y.ok) {
      if (
        y.error.code === "Unavailable" &&
        y.error.telemetryCode === "LockSuspect" &&
        idx < STORAGE_UPDATE_MAX_ATTEMPTS
      ) {
        await (y.error.retryAfterMs !== undefined ? sleep(y.error.retryAfterMs) : storageUpdateBackoff(idx));
        continue;
      }
      throw s(y.error);
    }
    let S = y.value.result;
    if (S === undefined) throw Error("installed plugins registry update settled without an outcome");
    return S;
  }
}
//@ chunk-e6aww6q8.js:4344708-4344862 layout
/**
 * 存储后端模式下把旧的 V1 installed_plugins.json 原地迁移为 V2 并刷新内存缓存。
 */
async function migrateStoredV1ToV2(e, n) {
  let installedPluginsFileRaw = await readInstalledPluginsFileRaw_2(e, n);
  if (installedPluginsFileRaw === null || installedPluginsFileRaw.version !== 1) return;
  let { converted } = await storageUpdateWithRetry(e, n, convertStoredV1, storageAccessError);
  if (converted !== undefined) setInstalledPluginsCache(converted.data);
  return converted;
}
//@ chunk-e6aww6q8.js:4344862-4345201 layout
function convertStoredV1(e) {
  if (e === undefined)
    return {
      skip: true,
      result: {
        converted: undefined,
      },
    };
  let installedPluginsJson = parseInstalledPluginsJson(Buffer.from(e.value).toString("utf-8"));
  if (installedPluginsJson.version !== 1)
    return {
      skip: true,
      result: {
        converted: undefined,
      },
    };
  let r = InstalledPluginsFileSchemaV1().parse(installedPluginsJson.data);
  let s = migrateV1ToV2(r);
  assertInstalledPluginsReplaceable_2(Buffer.from(e.value));
  return {
    write: jsonStringify(s, null, 2),
    result: {
      converted: {
        data: s,
        v1PluginCount: Object.keys(r.plugins).length,
      },
    },
  };
}
//@ chunk-e6aww6q8.js:4345201-4345509 layout
function applyUpdateToStoredFile(e, n) {
  let r = {
    version: 2,
    plugins: {},
  };
  let loadError;
  if (e !== undefined)
    try {
      r = toInstalledPluginsV2(parseInstalledPluginsJson(Buffer.from(e.value).toString("utf-8")));
    } catch (error) {
      loadError = error;
    }
  let h = n(r);
  if (h.write && e !== undefined) assertInstalledPluginsReplaceable_2(Buffer.from(e.value));
  let result = {
    result: h.result,
    written: h.write ? r : undefined,
    loadError,
  };
  return h.write
    ? {
        write: serializeInstalledPlugins(r),
        result,
      }
    : {
        skip: true,
        result,
      };
}
//@ chunk-e6aww6q8.js:4345509-4345649 layout
/**
 * installed_plugins.json 的读-改-写入口：回调拿到当前文件，返回 {write, result}；write 为真时保存（存储后端模式下走带重试的 update）。
 */
async function updateInstalledPlugins(e, n) {
  let r = installedStorageKey(n);
  if (isStorageV5Enabled() && n !== undefined && r !== null) return updateInstalledPluginsViaStorage(n, r, e);
  let installedPlugins = loadInstalledPluginsSync();
  let h = e(installedPlugins);
  if (h.write) await saveInstalledPluginsV2(installedPlugins);
  return h.result;
}
//@ chunk-e6aww6q8.js:4345649-4345876 fingerprint = removePluginInstallation (0.661)
/**
 * 删除某插件在指定作用域/项目下的安装记录。
 */
async function removePluginInstallation(e, scope, r, storageV5, h) {
  let y = await updateInstalledPlugins(
    (entry) => removeInstallationFromFile(entry, e, scope, r, h),
    storageV5,
  );
  if (y === "kept") return false;
  if (y) {
    logForDebugging(`Removed installation for ${e} at scope ${scope}`);
    if (y.producerDirs.length > 0) {
      for (let producerDir of y.producerDirs)
        recordProducerDir(producerDir, {
          emit: false,
        });
      emitProducerDirsChanged();
    }
  }
}
//@ chunk-e6aww6q8.js:4345876-4346380 layout
/**
 * 从 V2 数据中删除指定作用域/项目的安装记录（给定期望记录不匹配时保留，返回 kept）。
 */
function removeInstallationFromFile(entry, n, r, s, h) {
  let y = entry.plugins[n];
  if (!y)
    return {
      write: false,
      result: false,
    };
  let found = y.find((q) => q.scope === r && q.projectPath === s);
  if (h !== undefined && found !== undefined && !registerPluginInstallation(found, h))
    return {
      write: false,
      result: "kept",
    };
  let w = [];
  let L = h === undefined ? findMatchingInstallations(y, r, s) : undefined;
  entry.plugins[n] = y.filter((q) => {
    let Z = L ? L.includes(q) : q.scope === r && q.projectPath === s;
    if (Z) {
      for (let Se of [q.sourceProducerPath, ...(q.previousProducerPaths ?? [])]) if (Se) w.push(Se);
    }
    return !Z;
  });
  if (entry.plugins[n].length === 0) delete entry.plugins[n];
  return {
    write: true,
    result: {
      producerDirs: w,
    },
  };
}
//@ chunk-e6aww6q8.js:4346380-4346491 layout
/**
 * 批量删除安装记录，有变化时清空全局快照。
 */
async function removeInstallationsAndRefreshSnapshot(e, storageV5) {
  if (e.length === 0) return;
  if (await updateInstalledPlugins((s) => dropRenamedNonManagedInstallations(s, e), storageV5))
    getPluginRegistry().installedPluginsSnapshot = null;
}
//@ chunk-e6aww6q8.js:4346491-4346739 layout
function dropRenamedNonManagedInstallations(e, n) {
  let r = false;
  for (let { oldId, newId } of n) {
    let y = e.plugins[oldId];
    if (!y) continue;
    let filtered = y.filter((w) => w.scope === "managed");
    if (filtered.length === y.length) continue;
    if (filtered.length > 0) e.plugins[oldId] = filtered;
    else delete e.plugins[oldId];
    r = true;
  }
  return {
    write: r,
    result: r,
  };
}
//@ chunk-e6aww6q8.js:4346739-4346833 layout
/**
 * 会话内固定的 installed_plugins 快照（首次读取后不再变）。
 */
function getInstalledPluginsSnapshot() {
  let pluginRegistry = getPluginRegistry();
  pluginRegistry.installedPluginsSnapshot ??= getInstalledPlugins();
  return pluginRegistry.installedPluginsSnapshot;
}
//@ chunk-e6aww6q8.js:4346833-4346926 callgraph-fingerprint = getPendingUpdateCount (0.43)
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
//@ chunk-e6aww6q8.js:4346926-4347089 callgraph-fingerprint = removeInstalledPlugin (0.228)
/**
 * 读取 installed_plugins.json（有存储后端时经存储层）并转为 V2，不使用内存缓存。
 */
async function loadInstalledPlugins(pluginId) {
  let n = installedStorageKey(pluginId);
  if (pluginId === undefined || n === null || !isStorageV5Enabled()) return loadInstalledPluginsSync();
  try {
    let installedPluginsFileRaw = await readInstalledPluginsFileRaw_2(pluginId, n);
    return installedPluginsFileRaw
      ? toInstalledPluginsV2(installedPluginsFileRaw)
      : {
          version: 2,
          plugins: {},
        };
  } catch (error) {
    return loadInstalledPluginsFromDisk(error);
  }
}
//@ chunk-e6aww6q8.js:4347089-4347261 fingerprint = loadInstalledPluginsFromDisk (0.729)
function loadInstalledPluginsFromDisk(error) {
  let errorMsg = errorMessage(error);
  logForDebugging(`Failed to load installed plugins from disk: ${errorMsg}`, {
    level: "error",
  });
  logPluginStateFileError("load-from-disk", error, true);
  let r = {
    version: 2,
    plugins: {},
  };
  failedInstalledPluginsReads.add(r);
  return r;
}
//@ chunk-e6aww6q8.js:4347261-4348020 fingerprint = updateInstallationPathOnDisk (0.516)
/**
 * 插件更新后把磁盘上安装记录的 installPath/version/gitCommitSha/command 来源字段改成新值（找不到记录时报错）。
 */
async function updateInstallationPathOnDisk(
  e,
  scope,
  projectPath,
  s,
  h,
  gitCommitSha,
  resolvedVersion,
  w,
  storageV5,
  claudeAi,
  q,
  npm,
) {
  let sourceCommand = w?.sourceCommand;
  let sourceProducerPath = w?.sourceProducerPath;
  let we = {
    newPath: s,
    newVersion: h,
    gitCommitSha,
    resolvedVersion,
    sourceCommand,
    sourceProducerPath,
    claudeAi,
    directoryRepositoryKey: q,
    npm,
  };
  if (q !== undefined)
    await setDirectoryBinding(e, q, {
      keepExisting: true,
    });
  let Ee = installedStorageKey(storageV5);
  let Ae;
  if (isStorageV5Enabled() && storageV5 !== undefined && Ee !== null)
    Ae = await updateInstalledPluginsViaStorage(storageV5, Ee, (Ie) =>
      updateInstallationRecord(Ie, e, scope, projectPath, we),
    );
  else {
    let filePath = loadInstalledPluginsSync();
    Ae = updateInstallationRecord(filePath, e, scope, projectPath, we).result;
    if (Ae === "updated") {
      assertInstalledPluginsReplaceable_2(
        readInstalledPluginsFileRaw(getInstalledPluginsFilePath()),
        filePath,
      );
      writeAndPublishSync(getInstalledPluginsFilePath(), serializeInstalledPlugins(filePath));
      getPluginRegistry().installedPluginsFile = null;
    }
  }
  switch (Ae) {
    case "no-plugin":
      logForDebugging(`Cannot update ${e} on disk: plugin not found in installed plugins`);
      return;
    case "no-installation":
      logForDebugging(`Cannot update ${e} on disk: no installation for scope ${scope}`);
      return;
    case "updated":
      logForDebugging(`Updated ${e} on disk to version ${h} at ${s}`);
  }
}
//@ chunk-e6aww6q8.js:4348020-4348384 layout
/**
 * 为插件目录市场安装的插件记录 directoryRepositoryKey（仓库名绑定）。
 */
async function recordDirectoryRepositoryKey(e, scope, projectPath, s, storageV5) {
  {
    await setDirectoryBinding(e, s, {
      keepExisting: true,
    });
    let y = (installedPlugins) => {
      let G = installationAtTarget(installedPlugins.plugins[e], scope, projectPath);
      if (G && G.directoryRepositoryKey === undefined) G.directoryRepositoryKey = s;
      return {
        write: G !== undefined,
        result: G !== undefined,
      };
    };
    let S = installedStorageKey(storageV5);
    if (isStorageV5Enabled() && storageV5 !== undefined && S !== null) {
      await updateInstalledPluginsViaStorage(storageV5, S, y);
      return;
    }
    let installedPlugins = loadInstalledPluginsSync();
    if (y(installedPlugins).write) {
      assertInstalledPluginsReplaceable_2(
        readInstalledPluginsFileRaw(getInstalledPluginsFilePath()),
        installedPlugins,
      );
      writeAndPublishSync(getInstalledPluginsFilePath(), serializeInstalledPlugins(installedPlugins));
      getPluginRegistry().installedPluginsFile = null;
    }
  }
}
//@ chunk-e6aww6q8.js:4348384-4349921 layout
function updateInstallationRecord(
  e,
  n,
  r,
  s,
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
  let ke = e.plugins[n];
  if (!ke)
    return {
      write: false,
      result: "no-plugin",
    };
  let we = installationAtTarget(ke, r, s);
  if (we) {
    we.installPath = newPath;
    if (we.version !== undefined) we.version = newVersion;
    if (resolvedVersion !== undefined) we.resolvedVersion = resolvedVersion;
    else delete we.resolvedVersion;
    we.lastUpdated = new Date().toISOString();
    if (gitCommitSha === null) delete we.gitCommitSha;
    else if (gitCommitSha !== undefined) we.gitCommitSha = gitCommitSha;
    if (npm !== undefined) {
      if (npm.npmVersionSpec !== undefined) we.npmVersionSpec = npm.npmVersionSpec;
      else delete we.npmVersionSpec;
      if (npm.npmResolved !== undefined) we.npmResolved = npm.npmResolved;
      else delete we.npmResolved;
      if (npm.npmIntegrity !== undefined) we.npmIntegrity = npm.npmIntegrity;
      else delete we.npmIntegrity;
      if (npm.npmRegistry !== undefined) we.npmRegistry = npm.npmRegistry;
      else delete we.npmRegistry;
    }
    if (claudeAi !== undefined) {
      we.claudeaiPluginId = claudeAi.claudeaiPluginId;
      if (claudeAi.archiveSha256 !== undefined) we.archiveSha256 = claudeAi.archiveSha256;
      else delete we.archiveSha256;
    }
    if (directoryRepositoryKey !== undefined) we.directoryRepositoryKey = directoryRepositoryKey;
    if (sourceCommand !== undefined) we.sourceCommand = sourceCommand;
    else delete we.sourceCommand;
    if (sourceCommand !== undefined && sourceProducerPath !== undefined) {
      let Ee = mergePreviousProducerPaths(we, sourceProducerPath);
      we.sourceProducerPath = sourceProducerPath;
      if (Ee.length > 0) we.previousProducerPaths = Ee;
      else delete we.previousProducerPaths;
    } else if (sourceCommand === undefined) {
      if (we.sourceProducerPath !== undefined)
        we.previousProducerPaths = [
          ...(we.previousProducerPaths ?? []).filter((Ee) => Ee !== we.sourceProducerPath),
          we.sourceProducerPath,
        ].slice(-MAX_PREVIOUS_PRODUCER_PATHS);
      delete we.sourceProducerPath;
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
//@ chunk-e6aww6q8.js:4349921-4350299 fingerprint = initializeVersionedPlugins (0.663)
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
//@ chunk-e6aww6q8.js:4350299-4350559 fingerprint = removeAllPluginsForMarketplace (0.701)
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
  let r = await updateInstalledPlugins(
    (file) => removeMarketplacePluginRecords(file, marketplaceName),
    storageV5,
  );
  for (let removedPluginId of r.removedPluginIds)
    logForDebugging(`Removed installed plugin for marketplace removal: ${removedPluginId}`);
  return r;
}
//@ chunk-e6aww6q8.js:4350559-4351122 layout
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
    for (let G of findDataDirSharers(marketplaceId, file, marketplaceIds))
      for (let q of file.plugins[G] ?? []) if (q.installPath) stillInUse.add(q.installPath);
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
//@ chunk-e6aww6q8.js:4351122-4351306 fingerprint = isInstallationRelevantToCurrentProject (1)
/**
 * 安装记录是否与当前项目相关：user/managed 作用域总是；project/local 需 projectPath 等于当前工作目录。
 */
function isInstallationRelevantToCurrentProject(inst) {
  if (inst.scope === "user" || inst.scope === "managed") return true;
  let originalCwd = getOriginalCwd();
  if (inst.projectPath === originalCwd) return true;
  if (!inst.projectPath) return false;
  let r = storageRootFor(originalCwd);
  return r !== null && storageRootFor(inst.projectPath) === r;
}
//@ chunk-e6aww6q8.js:4351306-4351526 layout = isInstallationRelevantToCurrentProject (1)
function isInstallationRelevantToCurrentProject_2(inst) {
  if (inst.scope === "user" || inst.scope === "managed") return true;
  if (!inst.projectPath) return false;
  let originalCwd = getOriginalCwd();
  if (isSameNormalizedProjectPath(inst.projectPath, originalCwd)) return true;
  let r = storageRootFor(originalCwd);
  if (r === null) return false;
  let s = storageRootFor(inst.projectPath);
  return s !== null && isSameNormalizedProjectPath(s, r);
}
//@ chunk-e6aww6q8.js:4351526-4351564 layout
function isWindows() {
  return getPlatform() === "windows";
}
//@ chunk-e6aww6q8.js:4351564-4351675 layout
/**
 * 从一个插件的安装记录里筛出与当前项目相关的（user/managed 全局记录，或 project/local 且 projectPath 为当前目录）；Windows 下找不到时按路径的另一种拼写回退并记日志。
 */
function filterInstallationsForCurrentProject(e) {
  countRecordSpellings();
  let filtered = e.filter(isInstallationRelevantToCurrentProject);
  if (filtered.length > 0 || !isWindows()) return filtered;
  let filtered_2 = e.filter(isInstallationRelevantToCurrentProject_2);
  logRecordSpellingFallback(filtered_2[0]);
  return filtered_2;
}
//@ chunk-e6aww6q8.js:4351675-4351779 layout
/**
 * 在一个插件的安装记录里找与当前项目相关的那条（Windows 路径拼写回退同 filterInstallationsForCurrentProject）。
 */
function findInstallationForCurrentProject(e) {
  countRecordSpellings();
  let found = e.find(isInstallationRelevantToCurrentProject);
  if (found !== undefined || !isWindows()) return found;
  let found_2 = e.find(isInstallationRelevantToCurrentProject_2);
  logRecordSpellingFallback(found_2);
  return found_2;
}
//@ chunk-e6aww6q8.js:4351779-4351818 layout
/**
 * 是否存在与当前项目相关的安装记录。
 */
function hasInstallationForCurrentProject(e) {
  return findInstallationForCurrentProject(e) !== undefined;
}
//@ chunk-e6aww6q8.js:4351818-4352285 layout
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
  let s = 0;
  let h = 0;
  for (let plugin of Object.values(installedPluginsFile.plugins)) {
    let found = plugin.find(
      (w) => (w.scope === "project" || w.scope === "local") && isStaleInstallTarget(w, w.scope, originalCwd),
    );
    if (found !== undefined) {
      s++;
      if (plugin.some((w) => w.scope === found.scope && w.projectPath === originalCwd)) h++;
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
  if (e === undefined) return;
  let { scope } = e;
  if (scope !== "project" && scope !== "local") return;
  logForDebugging(
    `Using the install record for ${e.projectPath} (${scope} scope) for this session in ${getOriginalCwd()}: the same folder or the same checkout, under another spelling of its path (gh-74612)`,
  );
  let pluginRegistry = getPluginRegistry();
  if (pluginRegistry.recordSpellingFallbackReported) return;
  pluginRegistry.recordSpellingFallbackReported = true;
  logEvent("tengu_plugin_record_spelling", {
    kind: lit_2("fallback"),
    scope: fromEnum(scope),
  });
}
//@ chunk-e6aww6q8.js:4352707-4352786 layout
/**
 * 取第一个已知版本并加 v 前缀（unknown 跳过）。
 */
function formatFirstKnownVersion(...e) {
  let found = e.find((r) => r && r !== "unknown");
  return found ? `v${found}` : undefined;
}
//@ chunk-e6aww6q8.js:4352786-4352913 fingerprint = isPluginInstalled (1)
/**
 * 插件是否已安装（存在与当前项目相关的安装记录）。
 */
function isPluginInstalled(pluginId) {
  let installations = getInstalledPlugins().plugins[pluginId];
  if (!installations || installations.length === 0) return false;
  if (!hasInstallationForCurrentProject(installations)) return false;
  return getSettings_DEPRECATED().enabledPlugins?.[pluginId] !== undefined;
}
//@ chunk-e6aww6q8.js:4352913-4353085 fingerprint = isPluginGloballyInstalled (1)
/**
 * 插件是否以 user 或 managed 作用域全局安装。
 */
function isPluginGloballyInstalled(pluginId) {
  let installations = getInstalledPlugins().plugins[pluginId];
  if (!installations || installations.length === 0) return false;
  if (!installations.some((entry) => entry.scope === "user" || entry.scope === "managed")) return false;
  return getSettings_DEPRECATED().enabledPlugins?.[pluginId] !== undefined;
}
//@ chunk-e6aww6q8.js:4353085-4353299 layout
/**
 * 当前项目相关安装记录的 gitCommitSha（多条记录 sha 不一致时返回 undefined）。
 */
function getInstalledGitCommitSha(pluginId, n = {}) {
  let r = getInstalledPlugins().plugins[pluginId];
  if (!r || r.length === 0) return;
  let s = filterInstallationsForCurrentProject(
    n.scope !== undefined ? r.filter((y) => y.scope === n.scope) : r,
  );
  if (new Set(s.map((y) => y.gitCommitSha)).size !== 1) return;
  return s[0]?.gitCommitSha;
}
//@ chunk-e6aww6q8.js:4353299-4353602 fingerprint = addInstalledPlugin (0.595)
/**
 * 新增或更新一条安装记录（scope、projectPath、installPath、version、gitCommitSha…）并保存。
 */
async function addInstalledPlugin(scope, installPath, metadata = "user", projectPath, h) {
  assertRecordablePluginId(scope);
  if (installPath.directoryRepositoryKey !== undefined)
    await setDirectoryBinding(scope, installPath.directoryRepositoryKey, {
      keepExisting: true,
    });
  let { isUpdate, before } = await updateInstalledPlugins(
    (entry) => addPluginInstallation(entry, scope, installPath, metadata, projectPath),
    h,
  );
  getPluginRegistry().installedPluginsSnapshot = null;
  logForDebugging(`${isUpdate ? "Updated" : "Added"} installed plugin: ${scope} (scope: ${metadata})`);
  return before;
}
//@ chunk-e6aww6q8.js:4353602-4354776 fingerprint = addPluginInstallation (0.369)
/**
 * 在 V2 数据中为插件新增或替换一条安装记录（按作用域+projectPath 匹配），保留显式安装标记（auto 只在新记录或原本也是 auto 时保留）。
 */
function addPluginInstallation(pluginId, scope, installPath, metadata, projectPath) {
  let y = pluginId.plugins[scope] || [];
  let before = y.slice();
  let installationIndex = findInstallationIndex(y, metadata, projectPath);
  let L = installationIndex >= 0 ? y[installationIndex].projectPath : projectPath;
  let G = installationIndex >= 0 && y[installationIndex]?.auto !== true;
  let q = installPath.auto === true && !G;
  let Z = {
    scope: metadata,
    installPath: installPath.installPath,
    version: installPath.version,
    installedAt: installPath.installedAt,
    lastUpdated: installPath.lastUpdated,
    gitCommitSha: installPath.gitCommitSha,
    ...(installPath.resolvedVersion && {
      resolvedVersion: installPath.resolvedVersion,
    }),
    ...(L && {
      projectPath: L,
    }),
    ...(q && {
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
  let Se = installationIndex >= 0 ? y[installationIndex] : undefined;
  if (Se) {
    let we = mergePreviousProducerPaths(Se, Z.sourceProducerPath ?? "");
    if (we.length > 0) Z.previousProducerPaths = we;
  }
  let ke = installationIndex >= 0;
  if (ke) y[installationIndex] = Z;
  else y.push(Z);
  pluginId.plugins[scope] = y;
  return {
    write: true,
    result: {
      isUpdate: ke,
      before,
    },
  };
}
//@ chunk-e6aww6q8.js:4354890-4355072 placement
async function restoreEarlierInstallRecord(e, n, r, storageV5) {
  let h = await updateInstalledPlugins((y) => getPendingUpdatesDetails(y, e, n, r), storageV5);
  if (h) {
    getPluginRegistry().installedPluginsSnapshot = null;
    logForDebugging(`Restored the earlier install record of ${e} (scope: ${n.scope})`);
  }
  return h;
}
//@ chunk-e6aww6q8.js:4355072-4355307 placement
function getPendingUpdatesDetails(e, n, r, s) {
  let memoryInstallations = e.plugins[n];
  let y =
    memoryInstallations?.findIndex(
      (memoryInstallation) =>
        memoryInstallation.scope === r.scope && memoryInstallation.projectPath === r.projectPath,
    ) ?? -1;
  let S = y >= 0 ? memoryInstallations?.[y] : undefined;
  if (memoryInstallations === undefined || S === undefined || !registerPluginInstallation(S, s))
    return {
      write: false,
      result: false,
    };
  memoryInstallations[y] = r;
  return {
    write: true,
    result: true,
  };
}
//@ chunk-e6aww6q8.js:4355307-4355420 placement
/**
 * 去掉安装记录的 auto 标记（用户显式安装）。
 */
async function clearAutoInstalledFlag(e, scope, projectPathForScope, storageV5) {
  let h = await updateInstalledPlugins(
    (y) => clearAutoFlagUpdate(y, e, scope, projectPathForScope),
    storageV5,
  );
  if (h) getPluginRegistry().installedPluginsSnapshot = null;
  return h;
}
//@ chunk-e6aww6q8.js:4355420-4355558 placement
function clearAutoFlagUpdate(e, n, r, s) {
  let h = e.plugins[n];
  let y = installationAtTarget(h, r, s);
  if (y?.auto !== true)
    return {
      write: false,
      result: false,
    };
  delete y.auto;
  return {
    write: true,
    result: true,
  };
}
//@ chunk-e6aww6q8.js:4355558-4355614 placement
/**
 * readInstalledPluginsIfAny：读取安装记录，缺失返回 undefined。
 */
async function readInstalledPluginsIfAny(e, n = e) {
  return (await pluginGitHead(e, n)) ?? undefined;
}
//@ chunk-e6aww6q8.js:4355614-4355628 placement
var MAX_PLUGIN_MANIFEST_BYTES = 65536;
//@ chunk-e6aww6q8.js:4355628-4356541 placement
/**
 * 从插件清单读取版本号，清单超过 64 KB 时视为无版本。
 */
async function readManifestVersion(e, n, r) {
  let fsImplementation = getFsImplementation();
  let h = join(e, ".claude-plugin", "plugin.json");
  let y =
    isStorageV5Enabled() && r !== undefined ? parseVersionCachePath(e, anchoredPluginCachePath()) : null;
  if (isStorageV5Enabled() && r !== undefined && y) {
    let S = await r.read([
      {
        key: STORAGE_SPACES.pluginCache(y.marketplace, y.plugin, y.version, [
          ".claude-plugin",
          "plugin.json",
        ]),
        offset: 0,
        length: MAX_PLUGIN_MANIFEST_BYTES,
      },
    ]);
    if (!S.ok || !S.value.items[0].found) {
      logForDebugging(`Could not extract version from manifest for ${n}`);
      return "unknown";
    }
    let w = S.value.items[0];
    if (w.totalBytes > MAX_PLUGIN_MANIFEST_BYTES) {
      logForDebugging(`Manifest for ${n} exceeds 64 KB, treating as unversioned`);
      return "unknown";
    }
    try {
      return jsonParse(stripBom(Buffer.from(w.value).toString("utf-8"))).version || "unknown";
    } catch {
      logForDebugging(`Could not extract version from manifest for ${n}`);
      return "unknown";
    }
  }
  try {
    let fileBytes = await fsImplementation.readFileBytes(h, MAX_PLUGIN_MANIFEST_BYTES + 1);
    if (fileBytes.length > MAX_PLUGIN_MANIFEST_BYTES) {
      logForDebugging(`Manifest for ${n} exceeds 64 KB, treating as unversioned`);
      return "unknown";
    }
    return jsonParse(stripBom(fileBytes.toString("utf-8"))).version || "unknown";
  } catch {
    logForDebugging(`Could not extract version from manifest for ${n}`);
    return "unknown";
  }
}
//@ chunk-e6aww6q8.js:4356541-4365369 fingerprint = migrateFromEnabledPlugins (0.464)
/**
 * 启动时把 settings 的 enabledPlugins 与 installed_plugins.json 对齐：为已启用但无安装记录的市场插件补记录（或排队安装），跳过托管/种子/读失败情况。
 */
async function migrateFromEnabledPlugins(version) {
  if (await isInstalledListReplaceRefused(version)) {
    logForDebugging(
      "Skipping the enabled-plugins sync: installed_plugins.json holds what this build cannot read, so it is left as it is",
      {
        level: "warn",
      },
    );
    let pt = count(
      Object.values(getSettingsForSource("policySettings")?.enabledPlugins ?? {}),
      (Et) => Et === true,
    );
    if (pt > 0)
      logEvent("tengu_plugin_state_file_error", {
        operation: lit_2("migrate-from-enabled"),
        error_kind: lit_2("policy-sync-skipped"),
        recovered: false,
        required_count: pt,
      });
    return;
  }
  let settings = isRemoteSettingsFetchFailed();
  let r = new Set(
    Object.entries(getSettingsForSource("policySettings")?.enabledPlugins || {})
      .filter(([key, value]) => value === true && PluginIdSchema().safeParse(key).success)
      .map(([key]) => key),
  );
  let rawFileData = getOriginalCwd();
  let h = new Map();
  let pluginScopeFromSettings = new Set();
  let S;
  let w = () =>
    (S ??= isLocalSettingsGitTracked({
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
      let It = source === "userSettings" || (source === "localSettings" && !w());
      let scope = settingsSourceName(source);
      let qt = h.get(pluginId);
      h.set(pluginId, {
        scope,
        projectPath: scope === "user" ? undefined : rawFileData,
        fromOwnConfig: It || (qt?.fromOwnConfig ?? false),
      });
    }
  }
  let L = new Set();
  for (let [key, value] of Object.entries(getSettingsForSource("flagSettings")?.enabledPlugins || {})) {
    if (value !== true || !PluginIdSchema().safeParse(key).success || isPluginBlockedByPolicy(key)) continue;
    let yt = h.get(key);
    if (yt) {
      if (!yt.fromOwnConfig) L.add(key);
      yt.fromOwnConfig = true;
      continue;
    }
    h.set(key, {
      scope: "user",
      projectPath: undefined,
      fromOwnConfig: true,
    });
    L.add(key);
  }
  let G = installedStorageKey(version);
  let q =
    isStorageV5Enabled() && version !== undefined && G !== null
      ? await readInstalledPluginsFileRaw_2(version, G)
      : getPlan_2();
  let Z = q !== null;
  let ke = Z && q?.version === 2 && q ? tryParseInstalledPluginsV2(q.data) : undefined;
  if (ke?.success) normalizeInstallPaths(ke.data);
  let we = new Set();
  if (ke?.success && settings) {
    for (let [key, value] of Object.entries(ke.data.plugins))
      if (!r.has(key) && !isPluginBlockedByPolicy(key) && value.some((yt) => yt.scope === "managed")) {
        we.add(key);
        r.add(key);
      }
    if (we.size > 0)
      logForDebugging(
        `Remote managed settings not settled; keeping managed record(s) for ${[...we].join(", ")} as they are`,
      );
  }
  for (let pt of r) {
    h.set(pt, {
      scope: "managed",
      projectPath: undefined,
      fromOwnConfig: true,
    });
    L.delete(pt);
  }
  let Ee = new Set([...L, ...r].filter((pt) => !we.has(pt)));
  let Ae;
  let Ie = () => (Ae ??= loadKnownMarketplacesSafe(isStorageV5Enabled() ? version : undefined));
  if (h.size === 0 && !Z) return;
  if (ke?.success) {
    let plugins = ke.data.plugins;
    let Et = new Set();
    let filtered = [...r].filter((It) => (plugins[It]?.length ?? 0) === 0);
    if (filtered.length > 0) {
      let It = await Ie();
      for (let Yt of filtered) {
        let { marketplace } = parsePluginIdentifier(Yt);
        if (isSourceDisallowedOrUnverifiable(marketplace ? It[marketplace]?.source : undefined)) Et.add(Yt);
      }
    }
    let all = [...h.entries()].every(([It, Yt]) => {
      let qt = plugins[It];
      if (r.has(It)) return Et.has(It) || we.has(It) || (qt?.length === 1 && qt[0]?.scope === "managed");
      let Zt = installationAtTarget(qt, Yt.scope, Yt.projectPath) !== undefined;
      if (!Yt.fromOwnConfig) return true;
      return Zt;
    });
    let all_2 = Object.entries(plugins).every(
      ([key, value]) => r.has(key) || !value.some((qt) => qt.scope === "managed"),
    );
    if (all && all_2) {
      let It = true;
      for (let Yt of r) {
        if (Et.has(Yt) || we.has(Yt)) continue;
        let qt = plugins[Yt]?.[0];
        if (qt === undefined || !(await parsePluginIdSafe(Yt, qt, version, Ie))) {
          It = false;
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
  let Me = Ee.size > 0 ? await Ie() : undefined;
  let iso = new Date().toISOString();
  let v2Plugins = {};
  let lt;
  if (Z) {
    lt =
      isStorageV5Enabled() && version !== undefined && G !== null
        ? await getInstalledPluginsAsync(version)
        : getInstalledPlugins();
    v2Plugins = {
      ...lt.plugins,
    };
  }
  let Je = 0;
  let nt = 0;
  for (let [key, value] of Object.entries(v2Plugins)) {
    if (r.has(key)) continue;
    if (h.has(key)) continue;
    if (!value.some((gt) => gt.scope === "managed")) continue;
    let filtered = value.filter((gt) => gt.scope !== "managed");
    if (!(await ensureDirectoryBindingForMigration(key, value, filtered))) {
      logForDebugging(
        `Kept the managed entries of ${key} though policy no longer requires them: removing them needs plugin-directory-bindings.json in the plugins folder to record which repository the plugin was installed from, and that file could not be used or written. Will try again at next start.`,
        {
          level: "warn",
        },
      );
      continue;
    }
    if (filtered.length === 0) delete v2Plugins[key];
    else v2Plugins[key] = filtered;
    Je++;
    logForDebugging(`Dropped orphaned managed entry for ${key} (no longer policy-required)`);
  }
  for (let [pt, Et] of h) {
    if (we.has(pt)) continue;
    let yt = v2Plugins[pt];
    if (yt && yt.length > 0) {
      let gt = false;
      if (Et.scope === "managed") {
        let At = yt[0];
        if (At && !(await parsePluginIdSafe(pt, At, version, Ie))) {
          let It = await healManagedRecord(pt, Me, version);
          if (It !== undefined) {
            At.installPath = It.installPath;
            At.version = It.version;
            if (It.gitCommitSha !== undefined) At.gitCommitSha = It.gitCommitSha;
            else if (!It.keepStoredCommit) delete At.gitCommitSha;
            delete At.resolvedVersion;
            At.lastUpdated = iso;
            gt = true;
            logForDebugging(`Healed ${pt} managed record from its marketplace at version ${It.version}`);
          } else
            logForDebugging(
              `Left ${pt} managed record as is: the loader cannot load from its cache and it could not be materialized`,
            );
        }
        if (At && (At.scope !== "managed" || At.projectPath !== undefined)) {
          At.scope = "managed";
          delete At.projectPath;
          At.lastUpdated = iso;
          gt = true;
          logForDebugging(`Updated ${pt} scope to managed (settings.json is source of truth)`);
        }
        if (yt.length > 1) {
          let sliced = yt.slice(0, 1);
          if (await ensureDirectoryBindingForMigration(pt, yt, sliced)) {
            logForDebugging(`Collapsed ${pt} to single managed entry (was ${yt.length})`);
            v2Plugins[pt] = sliced;
            gt = true;
          } else
            logForDebugging(
              `Did not collapse ${pt} to one managed entry (has ${yt.length}): removing the others needs plugin-directory-bindings.json in the plugins folder to record which repository the plugin was installed from, and that file could not be used or written. Will try again at next start.`,
              {
                level: "warn",
              },
            );
        }
      } else {
        let At = installationAtTarget(yt, Et.scope, Et.projectPath);
        let It = false;
        if (!At && Et.fromOwnConfig && L.has(pt)) {
          let { marketplace } = parsePluginIdentifier(pt);
          let source = marketplace ? Me?.[marketplace]?.source : undefined;
          It = isPluginBlockedByPolicy(pt) || isSourceDisallowedOrUnverifiable(source);
        }
        if (!At && !Et.fromOwnConfig)
          logForDebugging(
            `Skipped auto-recording ${pt} for ${Et.scope} (${Et.projectPath ?? ""}) \u2014 enabled only by repo-authored settings`,
          );
        else if (!At && It)
          logForDebugging(`Skipping --settings-enabled ${pt}: blocked by policy, not writing a record`);
        else if (!At) {
          let Zt =
            yt.find((rn) => rn.projectPath !== undefined && rn.projectPath === rawFileData) ??
            yt.find((rn) => rn.scope === "user") ??
            yt.find(
              (rn) =>
                rn.projectPath !== undefined && isSameNormalizedProjectPath(rn.projectPath, rawFileData),
            ) ??
            yt.reduce((acc, pn) => ((pn.lastUpdated ?? "") > (acc.lastUpdated ?? "") ? pn : acc));
          yt.push({
            scope: Et.scope,
            installPath: Zt.installPath,
            ...(Zt.version !== undefined && {
              version: Zt.version,
            }),
            ...(Zt.resolvedVersion !== undefined && {
              resolvedVersion: Zt.resolvedVersion,
            }),
            installedAt: iso,
            lastUpdated: iso,
            ...(Zt.gitCommitSha !== undefined && {
              gitCommitSha: Zt.gitCommitSha,
            }),
            ...(Zt.sourceCommand !== undefined && {
              sourceCommand: Zt.sourceCommand,
            }),
            ...(Zt.sourceProducerPath !== undefined && {
              sourceProducerPath: Zt.sourceProducerPath,
            }),
            ...(Zt.previousProducerPaths !== undefined && {
              previousProducerPaths: Zt.previousProducerPaths,
            }),
            ...(Et.projectPath && {
              projectPath: Et.projectPath,
            }),
          });
          gt = true;
          logForDebugging(
            `Added ${pt} installation for scope ${Et.scope}${Et.projectPath ? ` (${Et.projectPath})` : ""}`,
          );
        }
        let Yt = new Set();
        let filtered = yt.filter((Zt) => {
          if (Zt.scope === "managed") return false;
          let rn = `${Zt.scope}|${Zt.projectPath ?? ""}`;
          if (Yt.has(rn)) return false;
          Yt.add(rn);
          return true;
        });
        if (filtered.length < yt.length)
          if (await ensureDirectoryBindingForMigration(pt, yt, filtered)) {
            logForDebugging(
              `Cleaned ${pt} (${yt.length}\u2192${filtered.length}: stale managed and/or duplicates)`,
            );
            if (filtered.length === 0) delete v2Plugins[pt];
            else v2Plugins[pt] = filtered;
            gt = true;
          } else
            logForDebugging(
              `Kept ${yt.length - filtered.length} stale managed or duplicate entries of ${pt}: removing them needs plugin-directory-bindings.json in the plugins folder to record which repository the plugin was installed from, and that file could not be used or written.`,
              {
                level: "warn",
              },
            );
      }
      if (gt) Je++;
    } else {
      if (!Et.fromOwnConfig) {
        logForDebugging(`Skipped auto-recording ${pt} \u2014 enabled only by repo-authored settings`);
        continue;
      }
      let { name: pluginName, marketplace } = parsePluginIdentifier(pt);
      if (!pluginName || !marketplace) continue;
      try {
        logForDebugging(`Looking up plugin ${pt} in marketplace ${marketplace}`);
        let It =
          marketplace === OFFICIAL_MARKETPLACE_NAME
            ? await getPluginByIdCacheOnly(pt, version)
            : await getPluginById(pt, version);
        if (!It) {
          logForDebugging(`Plugin ${pt} not found in any marketplace, skipping`);
          continue;
        }
        let { entry, marketplaceInstallLocation } = It;
        let Zt;
        if (Ee.has(pt)) {
          Zt = Me?.[marketplace]?.source;
          if (isPluginBlockedByPolicy(pt) || isSourceDisallowedOrUnverifiable(Zt)) {
            logForDebugging(`Skipping ${pt}: blocked by policy, not writing a record`);
            continue;
          }
        }
        let rn;
        let pn;
        let no = undefined;
        if (typeof entry.source === "string") {
          let hn = await cacheAndRegisterPlugin(
            pt,
            entry,
            entry.source,
            marketplaceInstallLocation,
            Me,
            Ee.has(pt) && !isLocalMarketplaceEntry(entry.source, Zt),
            version,
          );
          if (hn === undefined) continue;
          ({ installPath: rn, version: pn, gitCommitSha: no } = hn);
        } else {
          let hn = dirname(getVersionedCachePath(pt, "x"));
          let ho;
          try {
            ho = (await getFsImplementation().readdir(hn))
              .filter((bo) => bo.isDirectory() && !isTempSiblingName(bo.name))
              .map((bo) => bo.name);
          } catch (error) {
            if (!isENOENT(error)) throw error;
            logForDebugging(`External plugin ${pt} not in cache, skipping`);
            continue;
          }
          if (Ee.has(pt)) {
            let bo = [];
            for (let vn of ho) if (await pluginInstallPathExists(join(hn, vn), version)) bo.push(vn);
            ho = bo;
          }
          if (ho.length === 0) {
            logForDebugging(`External plugin ${pt} has no cached versions, skipping`);
            continue;
          }
          let yn = entry.version ? getVersionedCachePath(pt, entry.version) : undefined;
          let Kn = yn && ho.includes(basename(yn)) ? yn : join(hn, ho[0]);
          let Xn = basename(Kn);
          rn = Kn;
          let fo = typeof entry.source === "string" || getPluginCloneUrl(entry.source) !== null;
          no = fo ? await readInstalledPluginsIfAny(Kn) : undefined;
          let To =
            isGitShaVersionName({
              isGitBacked: fo,
              sourceHasPinnedSha: "sha" in entry.source && !!entry.source.sha,
              entryHasVersion: !!entry.version,
              versionName: Xn,
            }) && (await readManifestVersion(Kn, pt, version)) === "unknown";
          pn = To ? undefined : Xn;
          if (To)
            logForDebugging(
              `External plugin ${pt} is ref-tracked (cache dir ${Xn} is a git SHA, no manifest version), recording without a version so the loader re-clones it each load`,
            );
        }
        v2Plugins[pt] = [
          {
            scope: Et.scope,
            installPath: rn,
            ...(pn !== undefined && {
              version: pn,
            }),
            installedAt: iso,
            lastUpdated: iso,
            gitCommitSha: no,
            ...(Et.projectPath && {
              projectPath: Et.projectPath,
            }),
          },
        ];
        nt++;
        logForDebugging(`Added ${pt} with scope ${Et.scope}`);
      } catch (error) {
        logForDebugging(`Failed to add plugin ${pt}: ${error}`);
      }
    }
  }
  if (!Z || Je > 0 || nt > 0) {
    let v2Data = {
      version: 2,
      plugins: v2Plugins,
    };
    if (lt !== undefined) copySetAsideRecords(lt, v2Data);
    await saveInstalledPluginsV2(v2Data, version);
    logForDebugging(`Sync completed: ${nt} added, ${Je} updated in installed_plugins.json`);
  }
}
//@ chunk-e6aww6q8.js:4365369-4365510 affinity
function isGitShaVersionName({ isGitBacked, sourceHasPinnedSha, entryHasVersion, versionName }) {
  return (
    isGitBacked &&
    !sourceHasPinnedSha &&
    !entryHasVersion &&
    /^[0-9a-f]{12}(-[0-9a-f]{8})?$/.test(versionName)
  );
}
//@ chunk-e6aww6q8.js:4373603-4374071 fingerprint = getPluginVersionFromManifest (0.817)
/**
 * 从插件目录 .claude-plugin/plugin.json 读 version（存储后端模式下经存储层读）。
 */
async function getPluginVersionFromManifest(e, storageV5, r) {
  if (isStorageV5Enabled() && storageV5 !== undefined && r !== null) {
    let pluginManifestViaStorage = await readPluginManifestViaStorage(storageV5, r);
    return pluginManifestViaStorage === undefined
      ? undefined
      : readManifestBinaries(pluginManifestViaStorage);
  }
  let s = join(e, ".claude-plugin");
  if (!(await lstat(s).catch(() => null))?.isDirectory()) return;
  let y = join(s, "plugin.json");
  if (!(await lstat(y).catch(() => null))?.isFile()) return;
  let w;
  let L;
  try {
    L = await open(y, readOnlyNoFollowFlags());
    let stats = await L.stat();
    if (!stats.isFile() || stats.size > ONE_MIB) return;
    w = await L.readFile({
      encoding: "utf-8",
    });
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
    n = jsonParse(stripBom(e));
  } catch {
    return;
  }
  if (typeof n !== "object" || n === null) return;
  return parsePluginBinaries(n.binaries);
}
//@ chunk-e6aww6q8.js:4374185-4374535 placement
/**
 * 经 v5 存储读缓存版本里的 plugin.json（≤1 MiB）。
 */
async function readPluginManifestViaStorage(e, n) {
  let r = await e.scopeKind({
    ...n,
    relPath: [".claude-plugin"],
  });
  if (!r.ok || r.value.kind !== "directory") return;
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
  hasFailedInstalledPluginsRead,
  hasInstallationForCurrentProject,
  getInstalledListRefusal,
  readInstalledPluginsFile,
  clearAutoInstalledFlag,
  formatInvalidPluginIdMessage,
  isInstallationRelevantToCurrentProject,
  addInstalledPlugin,
  removePluginInstallation,
  findDataDirSharers,
  isPluginUnreadableOrShared,
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
  isRecordablePluginId,
  restoreEarlierInstallRecord,
  getPluginVersionFromManifest,
  assertRecordablePluginId,
  readInstalledPluginsIfAny,
  isPluginGloballyInstalled,
};
