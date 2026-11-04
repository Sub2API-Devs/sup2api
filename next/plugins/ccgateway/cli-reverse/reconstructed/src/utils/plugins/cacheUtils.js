/**
 * utils/plugins/cacheUtils.ts
 *
 * 插件版本缓存清理：为无人引用的版本目录写 .orphaned_at，超期后删除；缓存标记文件名常量。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/utils/plugins/cacheUtils.ts
 * pieces: chunk-e6aww6q8.js (20), chunk-f3qhjfah.js (2), chunk-hddjmtjj.js (1)
 * attribution: placement 10, callgraph-witnessed 2, layout 5, fingerprint 6
 */
import { join, sep, resolve as resolve_2 } from "path";
import { unlink, lstat, readdir, mkdir, copyFile } from "fs/promises";
import { PLUGIN_LINK_FILE } from "./pluginLinks.js";
import {
  clearPluginCache,
  anchoredPluginCachePath,
  orphanMarkerCoordsV5,
  evictCachedVersionDir,
} from "./pluginLoader.js";
import {
  clearPluginCommands,
  clearPluginAgents,
  clearPluginWorkflows,
  clearPluginSkillsCache,
  getPluginRegistry,
} from "./pluginLoadState.js";
import { clearPluginHookCache, pruneRemovedPluginHooks } from "./loadPluginHooks.js";
import { logError } from "../log.js";
import { clearPluginOptionsCache } from "./pluginOptionsStorage.js";
import { clearCachedOutputStyles } from "./schemas.js";
import { getHostState } from "../hostEnvironment.js";
import { isFreshTimestamp as isFreshTimestamp_2 } from "./pluginCachePaths.js";
import { toComparablePath, isPathWithin as isPathWithin_2, readJunction } from "../fsJunctions.js";
import {
  classifyMarketplacePath,
  wslWalkRootOf,
  normalizePathForPlatform,
  toAlternatePlatformPath,
} from "./localMarketplacePaths.js";
import { logForDebugging } from "../debug.js";
import { isSymlinkOrFalse, isPluginVersionInUse } from "./inUseMarkers.js";
import { STORAGE_SPACES } from "../storage/storageSpaces.js";
import { formatStorageError } from "../storage/storageErrors.js";
import {
  removeLinkOrDir,
  removeDirectoryTreeNoFollow as removeDirectoryTreeNoFollow_2,
  classifyDirEntrySafe,
} from "../fsRemove.js";
import { writeFileAndFlush } from "../../components/agents/agentFileUtils.js";
import { isPluginZipCacheEnabled } from "./zipCache.js";
import { isStorageV5Enabled } from "../hoverRest.js";
import { DEFAULT_MAX_PAGES, readAllPages } from "../pagedRead.js";
import { regExp as regExp_18, regExp_2 as regExp_2_2 } from "./commandSource.js";
import { getErrnoCode, errorMessage } from "../errors.js";
import { loadInstalledPluginsSync, loadInstalledPlugins } from "./installedPluginsManager.js";
import { getOriginalCwd } from "../../bootstrap/state.js";
import { isNonRegularError } from "../../services/memorySync/pathScrub.js";
import { getPlatform } from "../platform.js";
import { safeResolvePath_2 } from "../fsOperations.js";
import { pluginCacheStorageScope } from "./pluginVersioning.js";
import { isProcessRunning as isProcessRunning_2 } from "../genericProcessUtils.js";
import { getProcessCreationTimeMsAsync } from "../processIdentity.js";
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-f3qhjfah.js:2620-2695 fingerprint (2.1.88 match: ORPHANED_AT_FILENAME, 0.405)
/**
 * ORPHAN_MARKER_FILE：版本目录的孤儿标记文件名；IN_USE_MARKER_FILE：使用中标记文件名；GCS_SHA_MARKER_FILE：GCS sha 标记文件名（同一声明共 4 个绑定）。
 */
var ORPHAN_MARKER_FILE = ".orphaned_at";
var IN_USE_MARKER_FILE = ".in_use";
var GCS_SHA_MARKER_FILE = ".gcs-sha";
var LINKS_MATERIALIZED_MARKER = ".links_materialized";
//@ chunk-f3qhjfah.js:4415-4444 placement
var CACHE_META_FILES; // deferred: uses PLUGIN_LINK_FILE (./pluginLinks.js) of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-f3qhjfah.js:4415", () => {
  CACHE_META_FILES = new Set([PLUGIN_LINK_FILE, IN_USE_MARKER_FILE, ORPHAN_MARKER_FILE]);
});
//@ chunk-e6aww6q8.js:4180809-4180828 placement
var ORPHANED_VERSION_TTL_MS = 1209600000;
//@ chunk-e6aww6q8.js:4180828-4180967 placement
function clearPluginCachesAfterChange(storageV5, credentials, mode = "clear") {
  clearPluginCache();
  clearPluginCommands();
  clearPluginAgents();
  clearPluginHookCache();
  if (mode === "clear") pruneRemovedPluginHooks(storageV5, credentials).catch((error) => logError(error));
  clearPluginOptionsCache();
  clearCachedOutputStyles();
  getHostState().allOutputStyles.clear();
  clearPluginWorkflows();
}
//@ chunk-e6aww6q8.js:4180967-4181011 placement
/**
 * refreshPluginCaches：刷新活动插件前清空派生缓存。
 */
function refreshPluginCaches(storageV5, credentials, mode = "clear") {
  clearPluginCachesAfterChange(storageV5, credentials, mode);
  clearPluginDerivedState();
}
//@ chunk-e6aww6q8.js:4181011-4181217 placement
/**
 * 刷新活动插件前清空派生缓存：插件命令、代理、输出样式、工作流，并让宿主状态里的命令、技能目录、markdown 文件、代理定义失效。
 */
function clearPluginDerivedState() {
  clearPluginCommands();
  clearPluginAgents();
  clearCachedOutputStyles();
  getHostState().allOutputStyles.clear();
  clearPluginWorkflows();
  let hostState = getHostState();
  hostState.invalidateCommands();
  hostState.allWorkflows.clear();
  clearPluginSkillsCache();
  hostState.invalidateSkillDirs();
  hostState.markdownFiles.clear();
  hostState.agentDefinitions.clear();
}
//@ chunk-e6aww6q8.js:4181217-4181423 placement
function getCacheRootComparable() {
  let pluginRegistry = getPluginRegistry();
  let rootPath = anchoredPluginCachePath();
  let cacheRootComparableMemo = pluginRegistry.cacheRootComparableMemo;
  if (
    cacheRootComparableMemo?.root !== rootPath ||
    !isFreshTimestamp_2(cacheRootComparableMemo.at, CACHE_CLEAR_THROTTLE_MS)
  ) {
    let memo = {
      root: rootPath,
      comparable: toComparablePath(rootPath),
      at: Date.now(),
    };
    pluginRegistry.cacheRootComparableMemo = memo;
    return memo.comparable;
  }
  return cacheRootComparableMemo.comparable;
}
//@ chunk-e6aww6q8.js:4181423-4181437 placement
var CACHE_CLEAR_THROTTLE_MS = 30000;
//@ chunk-e6aww6q8.js:4181437-4182126 callgraph-witnessed (2.1.88 match: markPluginVersionOrphaned, 0.224)
/**
 * 给不再被任何安装记录引用的版本缓存目录写 .orphaned_at 时间戳（拒绝符号链接与缓存根之外的路径）。
 */
async function markPluginVersionOrphaned(versionPath, storageV5) {
  let { absolute, suspect } = classifyMarketplacePath(versionPath);
  if (suspect) {
    logForDebugging(`Not marking an unclassifiable plugin version path: ${absolute}`);
    return;
  }
  if (await isSymlinkOrFalse(absolute)) {
    logForDebugging(`Not marking a symlinked plugin version: ${absolute}`);
    return;
  }
  if (
    !isPathWithin_2(
      getCacheRootComparable(),
      toComparablePath(absolute, {
        knownNotSuspect: true,
      }),
      {
        alreadyComparable: true,
      },
    )
  ) {
    logForDebugging(`Not writing .orphaned_at outside the plugin cache root: ${absolute}`);
    return;
  }
  let coords = orphanMarkerCoordsV5(absolute, storageV5);
  if (storageV5 !== undefined && coords !== null) {
    let writeResult = await storageV5.write(
      STORAGE_SPACES.pluginCache(coords.marketplace, coords.plugin, coords.version, [ORPHAN_MARKER_FILE]),
      `${Date.now()}`,
      {
        publishDiscipline: "inPlace",
      },
    );
    if (!writeResult.ok)
      logForDebugging(`Failed to write .orphaned_at: ${absolute}: ${formatStorageError(writeResult.error)}`);
    return;
  }
  try {
    let filePath = getOrphanedAtPath(absolute);
    await removeLinkOrDir(filePath);
    await writeFileAndFlush(filePath, `${Date.now()}`);
  } catch (error) {
    logForDebugging(`Failed to write .orphaned_at: ${absolute}: ${error}`);
  }
}
//@ chunk-e6aww6q8.js:4182126-4182154 layout
var ORPHAN_GRACE_PERIOD_MS = 21600000;
var ORPHAN_SWEEP_INTERVAL_MS = 600000;
//@ chunk-e6aww6q8.js:4182154-4183321 callgraph-witnessed (2.1.88 match: cleanupOrphanedPluginVersionsInBackground, 0.277)
/**
 * 后台清理孤儿版本：没有安装记录引用的版本目录先打 .orphaned_at，超过 6 小时（会话未在使用）再删除；zip 缓存模式跳过。
 */
async function cleanupOrphanedPluginVersionsInBackground(storageV5) {
  if (isPluginZipCacheEnabled()) return;
  try {
    let installedVersions = anchoredPluginCachePath();
    let walkRoot = wslWalkRootOf(installedVersions);
    if (walkRoot === "undeterminable") {
      logForDebugging(
        "Skipping the orphaned-version sweep: the cache root volume could not be read to map its WSL companion views",
      );
      return;
    }
    let installed =
      isStorageV5Enabled() && storageV5 !== undefined
        ? await getInstalledVersionPathsAsync(storageV5, walkRoot)
        : getInstalledVersionPaths(walkRoot);
    if (!installed || installed.records.length === 0) return;
    let budget = {
      pagesLeft: DEFAULT_MAX_PAGES,
    };
    let now = Date.now();
    let comparablePath = toComparablePath(installedVersions, {
      foldCase: true,
    });
    let mapped = installed.records
      .map((record) => classifyMarketplacePath(record))
      .filter((classified) => !classified.suspect)
      .map((classified) => ({
        absolute: classified.absolute,
        comparable: toComparablePath(classified.absolute, {
          foldCase: true,
          knownNotSuspect: true,
        }),
      }));
    for (let mappedPath of mapped) installed.keys.add(normalizePathForPlatform(mappedPath.comparable));
    await Promise.all(
      mapped
        .filter((mappedPath) =>
          isPathWithin_2(comparablePath, mappedPath.comparable, {
            alreadyComparable: true,
          }),
        )
        .map((mappedPath) => removeOrphanedAtMarker(mappedPath.absolute, storageV5)),
    );
    for (let marketplace of await listPluginCacheForCleanup(
      installedVersions,
      storageV5,
      installedVersions,
      budget,
    )) {
      let match = regExp_18.exec(marketplace);
      if (match) {
        let ageMs = Date.now() - Number(match[1]);
        if (
          ageMs > -ORPHAN_GRACE_PERIOD_MS &&
          ageMs < ORPHANED_VERSION_TTL_MS &&
          !anyStartsWith(
            installed.keys,
            normalizePathForPlatform(join(installedVersions, marketplace) + sep),
          ) &&
          !anyStartsWith(
            installed.keys,
            normalizePathForPlatform(
              toComparablePath(join(installedVersions, marketplace), {
                foldCase: true,
              }) + sep,
            ),
          )
        )
          continue;
      }
      let marketplacePath = join(installedVersions, marketplace);
      for (let plugin of await listPluginCacheForCleanup(
        marketplacePath,
        storageV5,
        installedVersions,
        budget,
      )) {
        let pluginPath = join(marketplacePath, plugin);
        for (let version of await listPluginCacheForCleanup(
          pluginPath,
          storageV5,
          installedVersions,
          budget,
        )) {
          let versionPath = join(pluginPath, version);
          if (
            installed.keys.has(normalizePathForPlatform(versionPath)) ||
            installed.keys.has(
              normalizePathForPlatform(
                toComparablePath(versionPath, {
                  foldCase: true,
                }),
              ),
            )
          )
            continue;
          let match = regExp_2_2.exec(version);
          if (match && (await isNotFoundCause(versionPath, Number(match[1])))) continue;
          await processOrphanedPluginVersion(versionPath, now, storageV5);
        }
        await removeIfEmpty(pluginPath);
      }
      await removeIfEmpty(marketplacePath);
    }
  } catch (error) {
    logForDebugging(`Plugin cache cleanup failed: ${error}`);
  }
}
//@ chunk-e6aww6q8.js:4183321-4183353 layout
function getOrphanedAtPath(versionPath) {
  return join(versionPath, ORPHAN_MARKER_FILE);
}
//@ chunk-e6aww6q8.js:4183353-4183697 fingerprint (2.1.88 match: removeOrphanedAtMarker, 0.74)
async function removeOrphanedAtMarker(versionPath, storageV5) {
  if (await isSymlinkOrFalse(versionPath)) return;
  let orphanedAtPath = getOrphanedAtPath(versionPath);
  let coords = orphanMarkerCoordsV5(versionPath, storageV5);
  if (storageV5 !== undefined && coords !== null) {
    let deleteResult = await storageV5.delete(
      STORAGE_SPACES.pluginCache(coords.marketplace, coords.plugin, coords.version, [ORPHAN_MARKER_FILE]),
    );
    if (!deleteResult.ok)
      logForDebugging(
        `Failed to remove .orphaned_at: ${versionPath}: ${formatStorageError(deleteResult.error)}`,
      );
    return;
  }
  try {
    await unlink(orphanedAtPath);
  } catch (error) {
    if (getErrnoCode(error) === "ENOENT") return;
    logForDebugging(`Failed to remove .orphaned_at: ${versionPath}: ${error}`);
  }
}
//@ chunk-e6aww6q8.js:4183697-4183802 fingerprint (2.1.88 match: getInstalledVersionPaths, 0.744)
function getInstalledVersionPaths(walkRoot) {
  try {
    return collectInstallRecordPaths(loadInstalledPluginsSync(), walkRoot);
  } catch (error) {
    logForDebugging(`Failed to load installed plugins: ${error}`);
    return null;
  }
}
//@ chunk-e6aww6q8.js:4183802-4183922 layout
async function getInstalledVersionPathsAsync(storageV5, walkRoot) {
  try {
    return collectInstallRecordPaths(await loadInstalledPlugins(storageV5), walkRoot);
  } catch (error) {
    logForDebugging(`Failed to load installed plugins: ${error}`);
    return null;
  }
}
//@ chunk-e6aww6q8.js:4183922-4183992 layout
function anyStartsWith(keys, prefix) {
  for (let key of keys) if (key.startsWith(prefix)) return true;
  return false;
}
//@ chunk-e6aww6q8.js:4183992-4184293 layout
/**
 * 遍历 installed_plugins 的所有安装记录，收集去重后的 installPath（及其解析目标）和归一化后的路径键集合， 供孤儿版本清理判断哪些目录仍被引用。
 */
function collectInstallRecordPaths(installedPlugins, walkRoot) {
  let records = [];
  let seenPaths = new Set();
  let keys = new Set();
  for (let plugin of Object.values(installedPlugins.plugins))
    for (let record of plugin) {
      let absolutePath = resolve_2(getOriginalCwd(), record.installPath);
      if (!seenPaths.has(absolutePath)) {
        seenPaths.add(absolutePath);
        records.push(record.installPath);
      }
      keys.add(normalizePathForPlatform(absolutePath));
      let alternatePlatformPath = toAlternatePlatformPath(record.installPath, walkRoot);
      if (alternatePlatformPath !== undefined) {
        keys.add(normalizePathForPlatform(alternatePlatformPath));
        if (!seenPaths.has(alternatePlatformPath)) {
          seenPaths.add(alternatePlatformPath);
          records.push(alternatePlatformPath);
        }
      }
    }
  return {
    records,
    keys,
  };
}
//@ chunk-e6aww6q8.js:4184293-4185266 fingerprint (2.1.88 match: processOrphanedPluginVersion, 0.389)
async function processOrphanedPluginVersion(versionPath, now, storageV5) {
  if (await isSymlinkOrFalse(versionPath)) return;
  let orphanedAtPath = getOrphanedAtPath(versionPath);
  let orphanedAt;
  let coords = orphanMarkerCoordsV5(versionPath, storageV5);
  if (storageV5 !== undefined && coords !== null) {
    let storageKey = STORAGE_SPACES.pluginCache(coords.marketplace, coords.plugin, coords.version, [
      ORPHAN_MARKER_FILE,
    ]);
    let statResult = await storageV5.statMeta(storageKey);
    if (!statResult.ok) {
      if (statResult.error.code === "NotFound") {
        await markPluginVersionOrphaned(versionPath, storageV5);
        return;
      }
      if (
        isNonRegularError("telemetryCode" in statResult.error ? statResult.error.telemetryCode : undefined)
      ) {
        try {
          if (!(await storageV5.delete(storageKey)).ok) await removeLinkOrDir(orphanedAtPath);
          await markPluginVersionOrphaned(versionPath, storageV5);
        } catch (error) {
          logForDebugging(`Failed to replace a non-regular ${ORPHAN_MARKER_FILE}: ${versionPath}: ${error}`);
        }
        return;
      }
      logForDebugging(
        `Failed to stat orphaned marker: ${versionPath}: ${formatStorageError(statResult.error)}`,
      );
      return;
    }
    orphanedAt = statResult.value.mtimeMs;
  } else
    try {
      let markerStat = await lstat(orphanedAtPath);
      if (!markerStat.isFile()) {
        await markPluginVersionOrphaned(versionPath, storageV5);
        return;
      }
      orphanedAt = markerStat.mtimeMs;
    } catch (error) {
      if (getErrnoCode(error) === "ENOENT") {
        await markPluginVersionOrphaned(versionPath, storageV5);
        return;
      }
      logForDebugging(`Failed to stat orphaned marker: ${versionPath}: ${error}`);
      return;
    }
  if (now - orphanedAt > ORPHANED_VERSION_TTL_MS) {
    try {
      if (await isPluginVersionInUse(versionPath, undefined, storageV5)) {
        logForDebugging(`Skipping orphan cleanup, in use by live session: ${versionPath}`);
        return;
      }
    } catch (error) {
      logForDebugging(`Failed to check ${versionPath} for live users, skipping cleanup: ${error}`);
      return;
    }
    try {
      await evictCachedVersionDir(versionPath, storageV5);
    } catch (error) {
      logForDebugging(`Failed to delete orphaned version: ${versionPath}: ${error}`);
    }
  }
}
//@ chunk-e6aww6q8.js:4185266-4185783 fingerprint (2.1.88 match: removeIfEmpty, 0.302)
async function removeIfEmpty(dirPath) {
  let entries;
  try {
    if (!(await lstat(dirPath)).isDirectory()) return;
    if (getPlatform() === "windows" && (await readJunction(dirPath)).kind !== "directory") return;
    entries = await readdir(dirPath, {
      withFileTypes: true,
    });
  } catch (error) {
    logForDebugging(`Failed to re-check dir before removal: ${dirPath}: ${error}`);
    return;
  }
  if (
    entries.some(
      (entry) =>
        entry.isDirectory() ||
        entry.isSymbolicLink() ||
        safeResolvePath_2(entry) ||
        (entry.isFile() && /\.zip$/i.test(entry.name)),
    )
  ) {
    logForDebugging(
      `Keeping ${dirPath}: it still holds a directory, a symlink, a versioned archive or an entry of unknown type`,
    );
    return;
  }
  try {
    await removeDirectoryTreeNoFollow_2(dirPath);
  } catch (error) {
    logForDebugging(`Failed to remove empty dir: ${dirPath}: ${error}`);
  }
}
//@ chunk-e6aww6q8.js:4185783-4186343 placement
async function listPluginCacheForCleanup(dirPath, storageV5, installedVersions, budget) {
  let scope =
    isStorageV5Enabled() && storageV5 !== undefined
      ? pluginCacheStorageScope(dirPath, installedVersions)
      : null;
  if (storageV5 === undefined || scope === null) return listSubdirectoriesSafe(dirPath);
  let names = [];
  switch (
    (
      await readAllPages(
        (cursor) =>
          storageV5.listEntries(scope, {
            cursor,
            skipKeyStats: true,
            skipScopeStats: true,
          }),
        (entries) => {
          for (let entry of entries) {
            if (entry.kind !== "scope") continue;
            let scope_2 = entry.scope;
            if (scope_2.namespace !== "pluginCache") continue;
            let name =
              scope.marketplace === undefined
                ? scope_2.marketplace
                : scope.plugin === undefined
                  ? scope_2.plugin
                  : scope_2.version;
            if (name !== undefined) names.push(name);
          }
        },
        {
          budget,
        },
      )
    ).status
  ) {
    case "error":
      return [];
    case "capped":
      logForDebugging(`Plugin cache cleanup: listing of ${dirPath} truncated at the page cap`);
      return names;
    case "done":
      return names;
  }
}
//@ chunk-e6aww6q8.js:4186343-4186581 placement
async function listSubdirectoriesSafe(dirPath) {
  try {
    let entries = await readdir(dirPath, {
      withFileTypes: true,
    });
    let names = [];
    for (let entry of entries)
      try {
        if ((await classifyDirEntrySafe(dirPath, entry))?.isDirectory) names.push(entry.name);
      } catch (error) {
        logForDebugging(`Orphan sweep: skipping ${join(dirPath, entry.name)}: ${errorMessage(error)}`, {
          level: "warn",
        });
      }
    return names;
  } catch {
    return [];
  }
}
//@ chunk-e6aww6q8.js:4186581-4186787 placement (2.1.88 match: isRealPathWithinTeamDir, 0.775)
async function isNotFoundCause(versionPath, pid) {
  if (!(pid === 1 || isProcessRunning_2(pid))) return false;
  let realTeamDir;
  try {
    realTeamDir = (await lstat(versionPath)).mtimeMs;
  } catch (error) {
    let code = getErrnoCode(error);
    return code !== "ENOENT" && code !== "ENOTDIR";
  }
  if (!isFreshTimestamp_2(realTeamDir, ORPHAN_SWEEP_INTERVAL_MS)) return false;
  let processCreationTimeMs = await getProcessCreationTimeMsAsync(pid);
  return processCreationTimeMs === null || processCreationTimeMs <= realTeamDir;
}
//@ chunk-hddjmtjj.js:10518-10744 fingerprint (2.1.88 match: readSubdirs, 0.703)
/**
 * 递归复制目录（可按名字过滤）。名字配错，见 lead 建议。
 */
async function copyDirRecursive(sourceDir, targetDir, shouldSkip) {
  await mkdir(targetDir, {
    recursive: true,
  });
  let entries = await readdir(sourceDir, {
    withFileTypes: true,
  });
  for (let entry of entries) {
    if (shouldSkip?.(entry.name)) continue;
    let sourcePath = join(sourceDir, entry.name);
    let targetPath = join(targetDir, entry.name);
    if (entry.isDirectory()) await copyDirRecursive(sourcePath, targetPath);
    else if (entry.isFile()) await copyFile(sourcePath, targetPath);
  }
}
export {
  GCS_SHA_MARKER_FILE,
  refreshPluginCaches,
  markPluginVersionOrphaned,
  CACHE_META_FILES,
  ORPHAN_MARKER_FILE,
  cleanupOrphanedPluginVersionsInBackground,
  clearPluginDerivedState,
  IN_USE_MARKER_FILE,
  LINKS_MATERIALIZED_MARKER,
  copyDirRecursive,
};
