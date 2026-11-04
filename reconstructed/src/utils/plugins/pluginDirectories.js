/**
 * utils/plugins/pluginDirectories.ts
 *
 * 插件目录布局：插件根（~/.claude/plugins 或 cowork_plugins、CLAUDE_CODE_PLUGIN_CACHE_DIR）、种子目录、data/ 数据目录、ID 转目录名与备份文件名。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/utils/plugins/pluginDirectories.ts
 * pieces: chunk-aepeg2w5.js (2), chunk-e6aww6q8.js (7), chunk-f3qhjfah.js (34)
 * attribution: placement 19, fingerprint 7, layout 16, file-local 1
 */
import { relative, sep, isAbsolute, join, delimiter, resolve as resolve_2, parse, dirname } from "path";
import { readdir, stat, rm } from "fs/promises";
import { getVersionFromPath } from "./pluginVersioning.js";
import { areValidKeySegments, STORAGE_SPACES } from "../storage/storageSpaces.js";
import { thinkbackUserConfigSpace } from "./pluginLinks.js";
import { getClaudeConfigDir } from "../envUtils.js";
import { getUseCoworkPlugins, isDiskless } from "../../bootstrap/state.js";
import { env } from "../env.js";
import { expandTildeWithHome, isNetworkRelatedPath, classifyHomeMount } from "../networkPaths.js";
import { normalizePathSegment } from "../pathSegments.js";
import { CLAUDEAI_MARKETPLACE_PREFIX, isNpmPluginId, pluginManifestPathSchemas } from "./schemas.js";
import { getFsImplementation } from "../fsOperations.js";
import { pathPresence } from "../fsSafety/atomicWriteStaging.js";
import { isFsInaccessible, isENOENT, errorMessage, getErrnoCode } from "../errors.js";
import { formatFileSize } from "../format.js";
import { logForDebugging } from "../debug.js";
import { isPluginZipCacheEnabled } from "./zipCache.js";
import { isLocalMarketplaceSource } from "./reconciler.js";
import { projectPluginsDir } from "./pluginCachePaths.js";
import { isUncOrDeviceSpelling } from "../fsJunctions.js";
import { classifyMarketplacePath } from "./localMarketplacePaths.js";
import { getPlatform } from "../platform.js";
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-aepeg2w5.js:64497-64555 placement
/**
 * 行为遥测键缓存（同一声明 4 个绑定）：ac 键前缀 "bi1-"；eoo 不可用标记 `${ac}key-unavailable`；na 按 entrypoint/model/版本/组织 的 sha256 缓存键的 Map；wI 缓存条数上限 32，超过即整体清空。
 */
var BI_KEY_PREFIX; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
var BI_KEY_UNAVAILABLE;
var biKeyCache;
var MAX_BI_KEY_CACHE_ENTRIES;
deferInit("chunk-aepeg2w5.js:64497", () => {
  BI_KEY_PREFIX = "bi1-";
  BI_KEY_UNAVAILABLE = `${BI_KEY_PREFIX}key-unavailable`;
  biKeyCache = new Map();
  MAX_BI_KEY_CACHE_ENTRIES = 32;
});
//@ chunk-aepeg2w5.js:64789-64835 placement
/**
 * MAX_TIMESTAMPED_ENTRIES：带时间戳记录集保留的条目数；USAGE_SNAPSHOT_MAX_AGE_MS：用量快照的最大有效时长（7 天）；USAGE_SNAPSHOT_FUTURE_SKEW_MS：用量快照允许的未来时间偏差（同一声明共 4 个绑定）。
 */
var MAX_TIMESTAMPED_ENTRIES = 12;
var USAGE_SNAPSHOT_MAX_AGE_MS = 86400000;
var USAGE_SNAPSHOT_FUTURE_SKEW_MS = 604800000;
var USAGE_SNAPSHOT_LOOKAHEAD_MS = 300000;
//@ chunk-f3qhjfah.js:2741-2910 placement
/**
 * 把 <plugins>/cache 下的路径拆成分段（不在其下返回 null）。
 */
function splitPluginCachePath(cachePath, versionRoot) {
  let versionFromPath = getVersionFromPath();
  if (versionRoot !== versionFromPath) return null;
  let relPath = relative(versionFromPath, cachePath);
  if (relPath === "" || relPath === ".." || relPath.startsWith(`..${sep}`) || isAbsolute(relPath))
    return null;
  let parts = relPath.split(sep);
  return join(versionFromPath, ...parts) === cachePath ? parts : null;
}
//@ chunk-f3qhjfah.js:2910-2950 placement = getVersionedZipCachePath (1)
/**
 * 路径是否以 .zip 结尾。
 */
function isZipPath(pluginId) {
  return pluginId.endsWith(".zip");
}
//@ chunk-f3qhjfah.js:2950-3089 placement
/**
 * 缓存路径拆成 {marketplace, plugin, version}（必须恰好三段）。
 */
function parseVersionCachePath(cachePath, versionRoot) {
  let parts = splitPluginCachePath(cachePath, versionRoot);
  if (parts === null || parts.length !== 3 || !areValidKeySegments(parts) || isZipPath(parts[2])) return null;
  let [marketplace, plugin, version] = parts;
  return {
    marketplace,
    plugin,
    version,
  };
}
//@ chunk-f3qhjfah.js:3089-3223 placement
/**
 * 存储键是否指向版本目录根。
 */
function isVersionRootStorageKey(key) {
  return (
    key.namespace === "pluginCache" &&
    key.marketplace !== undefined &&
    key.plugin !== undefined &&
    key.version !== undefined &&
    key.relPath === undefined
  );
}
//@ chunk-f3qhjfah.js:3223-3307 placement
/**
 * versionCacheStorageSpace：版本缓存路径对应的存储空间。
 */
function versionCacheStorageSpace(cachePath, versionRoot) {
  let versionCachePath = parseVersionCachePath(cachePath, versionRoot);
  return versionCachePath === null
    ? null
    : {
        namespace: "pluginCache",
        ...versionCachePath,
      };
}
//@ chunk-f3qhjfah.js:3307-3428 placement
/**
 * 版本根存储键转本地缓存路径。
 */
function storageKeyToCachePath(key, versionRoot) {
  let segments = [key.marketplace, key.plugin, key.version];
  if (versionRoot !== getVersionFromPath() || !areValidKeySegments(segments) || isZipPath(key.version))
    return null;
  return join(versionRoot, ...segments);
}
//@ chunk-f3qhjfah.js:3428-3560 placement
function cachePathToStorageKey(cachePath, versionRoot) {
  let parts = splitPluginCachePath(cachePath, versionRoot);
  if (parts === null || parts.length < 4 || !areValidKeySegments(parts) || isZipPath(parts[2])) return null;
  let [marketplace, plugin, version, ...relPath] = parts;
  return STORAGE_SPACES.pluginCache(marketplace, plugin, version, relPath);
}
//@ chunk-f3qhjfah.js:3560-3601 placement
/**
 * cacheStorageKeyOrFallback：缓存路径转存储键。
 */
function cacheStorageKeyOrFallback(cachePath, versionRoot) {
  return cachePathToStorageKey(cachePath, versionRoot) ?? thinkbackUserConfigSpace(cachePath);
}
//@ chunk-f3qhjfah.js:3601-3657 placement
/**
 * registryStorageSpace：插件注册表存储空间。
 */
function registryStorageSpace(name, pluginsDir) {
  return isDefaultPluginsDir(pluginsDir) ? STORAGE_SPACES.pluginRegistry(name) : null;
}
//@ chunk-f3qhjfah.js:3657-3728 placement
/**
 * marketplaceCacheSpace：市场缓存存储空间。
 */
function marketplaceCacheSpace(name, kind, pluginsDirectory) {
  return isDefaultPluginsDir(pluginsDirectory) && areValidKeySegments([name])
    ? STORAGE_SPACES.marketplaceCache(name, kind)
    : null;
}
//@ chunk-f3qhjfah.js:3728-3771 fingerprint = PLUGINS_DIR (1)
/**
 * 路径是否为默认插件根目录 <configHome>/plugins。
 */
function isDefaultPluginsDir(pluginsDir) {
  return pluginsDir === join(getClaudeConfigDir(), "plugins");
}
//@ chunk-f3qhjfah.js:3771-3953 layout = getMarketplacesCacheDir (1)
function splitMarketplaceCachePath(cachePath, pluginsDir) {
  if (!isDefaultPluginsDir(pluginsDir)) return null;
  let marketplaceRoot = join(pluginsDir, "marketplaces");
  let relPath = relative(marketplaceRoot, cachePath);
  if (relPath === "" || relPath === ".." || relPath.startsWith(`..${sep}`) || isAbsolute(relPath))
    return null;
  let parts = relPath.split(sep);
  return join(marketplaceRoot, ...parts) === cachePath ? parts : null;
}
//@ chunk-f3qhjfah.js:3953-4072 placement
/**
 * 市场缓存路径 → 存储层的 marketplaceTree 键。
 */
function getMarketplaceStorageKey(cachePath, pluginsDirectory) {
  let parts = splitMarketplaceCachePath(cachePath, pluginsDirectory);
  if (parts === null || parts.length < 2 || !areValidKeySegments(parts)) return null;
  return STORAGE_SPACES.marketplaceTree(parts[0], parts.slice(1));
}
//@ chunk-f3qhjfah.js:4634-4670 fingerprint = COWORK_PLUGINS_DIR (0.727)
var PLUGINS_DIR_NAME = "plugins";
var COWORK_PLUGINS_DIR_NAME = "cowork_plugins";
//@ chunk-f3qhjfah.js:4670-4756 fingerprint = getPluginsDirectoryName (1)
function getPluginsDirectoryName() {
  if (getUseCoworkPlugins()) return COWORK_PLUGINS_DIR_NAME;
  if (env.CLAUDE_CODE_USE_COWORK_PLUGINS) return COWORK_PLUGINS_DIR_NAME;
  return PLUGINS_DIR_NAME;
}
//@ chunk-f3qhjfah.js:4756-4820 layout = getPluginsDirectory (1)
/**
 * 是否使用默认插件目录（非 cowork、未设 CLAUDE_CODE_PLUGIN_CACHE_DIR）。
 */
function isUsingDefaultPluginsDirectory() {
  return getPluginsDirectoryName() === PLUGINS_DIR_NAME && !env.CLAUDE_CODE_PLUGIN_CACHE_DIR;
}
//@ chunk-f3qhjfah.js:4820-4850 layout
/**
 * 是否使用 cowork_plugins 目录。
 */
function isUsingCoworkPlugins() {
  return getPluginsDirectoryName() === COWORK_PLUGINS_DIR_NAME;
}
//@ chunk-f3qhjfah.js:4850-4938 layout = getPluginsDirectory (1)
/**
 * 插件根目录：CLAUDE_CODE_PLUGIN_CACHE_DIR 覆盖，否则 ~/.claude/plugins（cowork 模式或 CLAUDE_CODE_USE_COWORK_PLUGINS 时为 cowork_plugins）。
 */
function getPluginsDirectory() {
  let envOverride = env.CLAUDE_CODE_PLUGIN_CACHE_DIR;
  if (envOverride) return expandTildeWithHome(envOverride);
  return join(getClaudeConfigDir(), getPluginsDirectoryName());
}
//@ chunk-f3qhjfah.js:4938-5046 fingerprint = getPluginSeedDirs (1)
/**
 * 解析 CLAUDE_CODE_PLUGIN_SEED_DIR（按路径分隔符分开的多个只读种子目录）。
 */
function getPluginSeedDirs() {
  let raw = env.CLAUDE_CODE_PLUGIN_SEED_DIR;
  if (!raw) return [];
  return raw.split(delimiter).filter(Boolean).map(expandTildeWithHome);
}
//@ chunk-f3qhjfah.js:5046-5103 file-local
/**
 * 把插件 ID 中非字母数字/-/_ 的字符替换成 -（用于目录名）。
 */
function sanitizePluginId(pluginId) {
  return pluginId.replace(/[^a-zA-Z0-9\-_]/g, "-");
}
//@ chunk-f3qhjfah.js:5103-5147 layout
/**
 * 小写的转义插件 ID。
 */
function sanitizePluginIdLower(id) {
  return sanitizePluginId(id).toLowerCase();
}
//@ chunk-f3qhjfah.js:5147-5256 layout
/**
 * 名字（NFKC 规范化后）是否以保留前缀 claudeai- 开头。
 */
function hasClaudeAiReservedPrefix(name) {
  let normalized = normalizePathSegment(name.normalize("NFKC"));
  return (
    normalized.startsWith(CLAUDEAI_MARKETPLACE_PREFIX) ||
    sanitizePluginId(normalized).toLowerCase().startsWith(CLAUDEAI_MARKETPLACE_PREFIX)
  );
}
//@ chunk-f3qhjfah.js:5256-5322 layout
/**
 * 市场名的规范键（NFKC、去不可见字符、转义、小写），用于判重。
 */
function canonicalMarketplaceKey(name) {
  return sanitizePluginId(normalizePathSegment(name.normalize("NFKC"))).toLowerCase();
}
//@ chunk-f3qhjfah.js:5322-5478 layout
/**
 * npm 包名中非 [a-z0-9-] 字符转义为 _hh / __hex_。
 */
function escapeNpmPackageForDir(packageName) {
  return packageName.replace(/[^a-z0-9-]/gu, (char) => {
    let codePoint = char.codePointAt(0) ?? 0;
    return codePoint <= 255 ? `_${codePoint.toString(16).padStart(2, "0")}` : `__${codePoint.toString(16)}_`;
  });
}
//@ chunk-f3qhjfah.js:5478-5577 layout
/**
 * 插件 ID → data/ 下的目录名；<pkg>@npm 用可逆转义 + -npm 后缀。
 */
function pluginIdToDirName(pluginId) {
  if (isNpmPluginId(pluginId)) {
    let packageName = pluginId.slice(0, pluginId.lastIndexOf("@"));
    return `${escapeNpmPackageForDir(packageName)}-${pluginManifestPathSchemas}`;
  }
  return sanitizePluginId(pluginId);
}
//@ chunk-f3qhjfah.js:5577-5642 layout
/**
 * 两个插件 ID 的数据目录名是否相同（忽略大小写）。
 */
function isSamePluginDirName(left, right) {
  return pluginIdToDirName(left).toLowerCase() === pluginIdToDirName(right).toLowerCase();
}
//@ chunk-f3qhjfah.js:5642-5737 layout
/**
 * installed_plugins 无效条目的“放一边”文件名 installed_plugins.set-aside.<日期>.<id>.json。
 */
function setAsideFileName(date, hash) {
  return `installed_plugins.set-aside.${date.toISOString().slice(0, 10)}.${hash}.json`;
}
//@ chunk-f3qhjfah.js:5737-5839 layout
/**
 * 是否为 set-aside 文件名。
 */
function isSetAsideFileName(name) {
  return /^installed_plugins\.set-aside\.\d{4}-\d{2}-\d{2}\.[0-9a-f]{12}\.json$/.test(name);
}
//@ chunk-f3qhjfah.js:5839-5935 layout
/**
 * 无法读取的 installed_plugins 备份文件名 installed_plugins.unreadable.<日期>.<id>.kept。
 */
function unreadableKeptFileName(date, hash) {
  return `installed_plugins.unreadable.${date.toISOString().slice(0, 10)}.${hash}.kept`;
}
//@ chunk-f3qhjfah.js:5935-6038 layout
/**
 * 是否为 unreadable.kept 文件名。
 */
function isUnreadableKeptFileName(name) {
  return /^installed_plugins\.unreadable\.\d{4}-\d{2}-\d{2}\.[0-9a-f]{12}\.kept$/.test(name);
}
//@ chunk-f3qhjfah.js:6038-6080 layout = pluginDataDirPath (1)
/**
 * 插件持久数据目录 <plugins>/data/<转义后的插件 ID>（hooks/MCP 中的 ${CLAUDE_PLUGIN_DATA}）。
 */
function pluginDataDirPath(pluginId) {
  return join(getPluginsDirectory(), "data", pluginIdToDirName(pluginId));
}
//@ chunk-f3qhjfah.js:6080-6151 layout
/**
 * 返回并（非只读模式下）创建插件数据目录。
 */
function ensurePluginDataDir(pluginId) {
  let dir = pluginDataDirPath(pluginId);
  if (isDiskless()) return dir;
  getFsImplementation().mkdirSync(dir);
  return dir;
}
//@ chunk-f3qhjfah.js:6151-6516 fingerprint = getPluginDataDirSize (0.653)
/**
 * 统计插件数据目录大小（卸载时提示是否删除），空目录返回 null。
 */
async function getPluginDataDirSize(pluginId, { throwIfUnreadable = false } = {}) {
  let dir = pluginDataDirPath(pluginId);
  let bytes = 0;
  let walk = async (dir) => {
    for (let entry of await readdir(dir, {
      withFileTypes: true,
    })) {
      let full = join(dir, entry.name);
      if (entry.isDirectory()) await walk(full);
      else
        try {
          bytes += (await stat(full)).size;
        } catch {}
    }
  };
  try {
    await walk(dir);
  } catch (e) {
    if (throwIfUnreadable) {
      if ((await pathPresence(dir)) === "gone") return null;
      throw e;
    }
    if (isFsInaccessible(e)) return null;
    throw e;
  }
  if (bytes === 0) return null;
  return {
    bytes,
    human: formatFileSize(bytes),
  };
}
//@ chunk-f3qhjfah.js:6516-6714 fingerprint = deletePluginDataDir (0.724)
/**
 * 删除插件数据目录，返回 removed/absent/failed。
 */
async function deletePluginDataDir(pluginId) {
  let dir = pluginDataDirPath(pluginId);
  try {
    await rm(dir, {
      recursive: true,
    });
    return "removed";
  } catch (e) {
    if (isENOENT(e)) return "absent";
    logForDebugging(`Failed to delete plugin data dir ${dir}: ${errorMessage(e)}`, {
      level: "warn",
    });
    return "failed";
  }
}
//@ chunk-e6aww6q8.js:608444-608534 fingerprint = getPluginsDirectory (1)
/**
 * zip 缓存模式时返回 CLAUDE_CODE_PLUGIN_CACHE_DIR（zip 缓存根），否则 undefined。
 */
function getZipCacheDirOverride() {
  if (!isPluginZipCacheEnabled()) return;
  let envOverride = env.CLAUDE_CODE_PLUGIN_CACHE_DIR;
  return envOverride ? expandTildeWithHome(envOverride) : undefined;
}
//@ chunk-e6aww6q8.js:732186-732240 placement
/**
 * isLocalMarketplaceEntry：本地市场来源的字符串。
 */
var isLocalMarketplaceEntry = (source, source_2) =>
  typeof source === "string" && source_2 !== undefined && isLocalMarketplaceSource(source_2);
//@ chunk-e6aww6q8.js:732240-732300 placement
/**
 * pluginRegistrySpace：插件注册表存储空间键。
 */
function pluginRegistrySpace(name) {
  return isDiskless()
    ? STORAGE_SPACES.pluginRegistry(name)
    : registryStorageSpace(name, getPluginsDirectory());
}
//@ chunk-e6aww6q8.js:732402-732486 placement
var PLUGIN_PATH_SEGMENTS; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
var MARKETPLACE_PATH_SEGMENTS;
deferInit("chunk-e6aww6q8.js:732402", () => {
  PLUGIN_PATH_SEGMENTS = new Set(["plugins", "cowork_plugins"]);
  MARKETPLACE_PATH_SEGMENTS = new Set(["marketplaces", "cache"]);
});
//@ chunk-e6aww6q8.js:732486-732917 placement
/**
 * 在路径中找到 plugins/cache 等标志段，若其前缀不是当前插件目录且不是网络/可疑路径，则改写为当前插件目录下的同名相对路径；否则原样返回。
 */
function relocateInstallPath(installPath) {
  let parts = installPath.split(/[/\\]/);
  let anchorIndex = -1;
  for (let idx = parts.length - 2; idx >= 1; idx--)
    if (PLUGIN_PATH_SEGMENTS.has(parts[idx]) && MARKETPLACE_PATH_SEGMENTS.has(parts[idx + 1])) {
      anchorIndex = idx;
      break;
    }
  if (anchorIndex === -1 || isDiskless()) return installPath;
  let joined = parts.slice(0, anchorIndex + 1).join(sep);
  let pluginsDir = projectPluginsDir();
  if (resolve_2(joined) === resolve_2(pluginsDir)) return installPath;
  if (isUncOrDeviceSpelling(joined) || isNetworkRelatedPath(joined)) return installPath;
  let isHomeMount = classifyHomeMount(joined);
  if (isAbsolute(joined)) {
    if (
      !isHomeMount &&
      !hasUnreadablePathComponent(joined) &&
      (classifyMarketplacePath(joined).suspect || isFileWithinReadSizeLimit(joined))
    )
      return installPath;
  } else if (!/^[A-Za-z]:[\\/]/.test(joined)) return installPath;
  let relocated = join(pluginsDir, ...parts.slice(anchorIndex + 1));
  if (!resolve_2(relocated).startsWith(resolve_2(pluginsDir) + sep)) return installPath;
  return relocated;
}
//@ chunk-e6aww6q8.js:732917-733231 placement
/**
 * 逐级 lstat 路径，遇到无权限组件返回 true。
 */
function hasUnreadablePathComponent(path) {
  if (getPlatform() === "windows") return false;
  let root = parse(path).root;
  let filtered = path
    .slice(root.length)
    .split(sep)
    .filter((part) => part !== "");
  for (let part of filtered) {
    if (part === ".") continue;
    if (part === "..") {
      root = dirname(root);
      continue;
    }
    root = join(root, part);
    let stat;
    try {
      stat = getFsImplementation().lstatSync(root);
    } catch (error) {
      let errnoCode = getErrnoCode(error);
      return errnoCode === "EACCES" || errnoCode === "EPERM";
    }
    if (stat.isSymbolicLink()) return false;
  }
  return false;
}
//@ chunk-e6aww6q8.js:733231-733301 placement = isFileWithinReadSizeLimit (1)
/**
 * 文件是否存在（statSync，非 ENOENT 错误也视为存在）。误配名。
 */
function isFileWithinReadSizeLimit(filePath) {
  try {
    getFsImplementation().statSync(filePath);
    return true;
  } catch (e) {
    return !isFsInaccessible(e);
  }
}
export {
  BI_KEY_UNAVAILABLE,
  getPluginSeedDirs,
  isLocalMarketplaceEntry,
  pluginDataDirPath,
  deletePluginDataDir,
  getPluginsDirectory,
  isSetAsideFileName,
  isUnreadableKeptFileName,
  isUsingDefaultPluginsDirectory,
  parseVersionCachePath,
  sanitizePluginId,
  escapeNpmPackageForDir,
  cacheStorageKeyOrFallback,
  versionCacheStorageSpace,
  isVersionRootStorageKey,
  storageKeyToCachePath,
  isUsingCoworkPlugins,
  ensurePluginDataDir,
  getPluginDataDirSize,
  isSamePluginDirName,
  pluginRegistrySpace,
  biKeyCache,
  BI_KEY_PREFIX,
  MAX_BI_KEY_CACHE_ENTRIES,
  USAGE_SNAPSHOT_MAX_AGE_MS,
  MAX_TIMESTAMPED_ENTRIES,
  USAGE_SNAPSHOT_FUTURE_SKEW_MS,
  USAGE_SNAPSHOT_LOOKAHEAD_MS,
  hasClaudeAiReservedPrefix,
  relocateInstallPath,
  getMarketplaceStorageKey,
  marketplaceCacheSpace,
  pluginIdToDirName,
  getZipCacheDirOverride,
  registryStorageSpace,
  sanitizePluginIdLower,
  canonicalMarketplaceKey,
  splitPluginCachePath,
  setAsideFileName,
  unreadableKeptFileName,
};
