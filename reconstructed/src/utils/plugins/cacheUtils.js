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
} from "path";
import {
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
  mkdir,
  copyFile,
} from "fs/promises";
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
  oto,
  getPluginRegistry,
} from "./pluginLoadState.js";
import { clearPluginHookCache, pruneRemovedPluginHooks } from "./loadPluginHooks.js";
import { logError } from "../log.js";
import { clearPluginOptionsCache } from "./pluginOptionsStorage.js";
import { clearCachedOutputStyles } from "./schemas.js";
import { getHostState } from "../hostEnvironment.js";
import { isFreshTimestamp } from "./pluginCachePaths.js";
import { toComparablePath, isPathWithin, readJunction } from "../fsJunctions.js";
import {
  classifyMarketplacePath,
  wslWalkRootOf,
  normalizePathForPlatform,
  toAlternatePlatformPath,
} from "./localMarketplacePaths.js";
import { logForDebugging } from "../debug.js";
import { KP, isPluginVersionInUse } from "./inUseMarkers.js";
import { STORAGE_SPACES } from "../storage/storageSpaces.js";
import { formatStorageError } from "../storage/storageErrors.js";
import { removeLinkOrDir, removeDirectoryTreeNoFollow, classifyDirEntrySafe } from "../fsRemove.js";
import { writeFileAndFlush } from "../../components/agents/agentFileUtils.js";
import { isPluginZipCacheEnabled } from "./zipCache.js";
import { isStorageV5Enabled } from "../hoverRest.js";
import { DEFAULT_MAX_PAGES, readAllPages } from "../pagedRead.js";
import { regExp as regExp_18, regExp_2 as regExp_2_2 } from "./commandSource.js";
import { getErrnoCode, errorMessage } from "../errors.js";
import { loadInstalledPluginsSync, loadInstalledPlugins } from "./installedPluginsManager.js";
import { getOriginalCwd } from "../../bootstrap/state.js";
import { FX } from "../../services/memorySync/pathScrub.js";
import { getPlatform } from "../platform.js";
import { safeResolvePath_2 } from "../fsOperations.js";
import { pluginCacheStorageScope } from "./pluginVersioning.js";
import { isProcessRunning as isProcessRunning_2 } from "../genericProcessUtils.js";
import { getProcessCreationTimeMsAsync } from "../processIdentity.js";
import { PLUGIN_LINK_FILE } from "./pluginLinks.js";

//@ chunk-e6aww6q8.js:4180809-4180828 placement
var WWn = 1209600000;
//@ chunk-e6aww6q8.js:4180828-4180967 placement
function clearPluginCachesAfterChange(e, n, r = "clear") {
  if ((clearPluginCache(), clearPluginCommands(), clearPluginAgents(), clearPluginHookCache(), r === "clear"))
    pruneRemovedPluginHooks(e, n).catch((s) => logError(s));
  (clearPluginOptionsCache(),
    clearCachedOutputStyles(),
    getHostState().allOutputStyles.clear(),
    clearPluginWorkflows());
}
//@ chunk-e6aww6q8.js:4180967-4181011 placement
function ic(e, n, r = "clear") {
  (clearPluginCachesAfterChange(e, n, r), clearPluginDerivedState());
}
/**
 * 刷新活动插件前清空派生缓存：插件命令、代理、输出样式、工作流，并让宿主状态里的命令、技能目录、markdown 文件、代理定义失效。
 */
//@ chunk-e6aww6q8.js:4181011-4181217 placement
function clearPluginDerivedState() {
  (clearPluginCommands(),
    clearPluginAgents(),
    clearCachedOutputStyles(),
    getHostState().allOutputStyles.clear(),
    clearPluginWorkflows());
  let e = getHostState();
  (e.invalidateCommands(),
    e.allWorkflows.clear(),
    oto(),
    e.invalidateSkillDirs(),
    e.markdownFiles.clear(),
    e.agentDefinitions.clear());
}
//@ chunk-e6aww6q8.js:4181217-4181423 placement
function getCacheRootComparable() {
  let e = getPluginRegistry(),
    n = anchoredPluginCachePath(),
    cacheRootComparableMemo = e.cacheRootComparableMemo;
  if (cacheRootComparableMemo?.root !== n || !isFreshTimestamp(cacheRootComparableMemo.at, kms)) {
    let s = { root: n, comparable: toComparablePath(n), at: Date.now() };
    return ((e.cacheRootComparableMemo = s), s.comparable);
  }
  return cacheRootComparableMemo.comparable;
}
//@ chunk-e6aww6q8.js:4181423-4181437 placement
var kms = 30000;
/**
 * 给不再被任何安装记录引用的版本缓存目录写 .orphaned_at 时间戳（拒绝符号链接与缓存根之外的路径）。
 */
//@ chunk-e6aww6q8.js:4181437-4182126 callgraph-witnessed = markPluginVersionOrphaned (0.224)
async function markPluginVersionOrphaned(e, n) {
  let { absolute: absolute, suspect: suspect } = classifyMarketplacePath(e);
  if (suspect) {
    logForDebugging(`Not marking an unclassifiable plugin version path: ${absolute}`);
    return;
  }
  if (await KP(absolute)) {
    logForDebugging(`Not marking a symlinked plugin version: ${absolute}`);
    return;
  }
  if (
    !isPathWithin(getCacheRootComparable(), toComparablePath(absolute, { knownNotSuspect: !0 }), {
      alreadyComparable: !0,
    })
  ) {
    logForDebugging(`Not writing .orphaned_at outside the plugin cache root: ${absolute}`);
    return;
  }
  let h = orphanMarkerCoordsV5(absolute, n);
  if (n !== void 0 && h !== null) {
    let write = await n.write(
      STORAGE_SPACES.pluginCache(h.marketplace, h.plugin, h.version, [R1]),
      `${Date.now()}`,
      { publishDiscipline: "inPlace" },
    );
    if (!write.ok)
      logForDebugging(`Failed to write .orphaned_at: ${absolute}: ${formatStorageError(write.error)}`);
    return;
  }
  try {
    let y = getOrphanedAtPath(absolute);
    (await removeLinkOrDir(y), await writeFileAndFlush(y, `${Date.now()}`));
  } catch (error) {
    logForDebugging(`Failed to write .orphaned_at: ${absolute}: ${error}`);
  }
}
//@ chunk-e6aww6q8.js:4182126-4182154 layout
var ORPHAN_GRACE_PERIOD_MS = 21600000,
  ORPHAN_SWEEP_INTERVAL_MS = 600000;
/**
 * 后台清理孤儿版本：没有安装记录引用的版本目录先打 .orphaned_at，超过 6 小时（会话未在使用）再删除；zip 缓存模式跳过。
 */
//@ chunk-e6aww6q8.js:4182154-4183321 callgraph-witnessed = cleanupOrphanedPluginVersionsInBackground (0.277)
async function cleanupOrphanedPluginVersionsInBackground(e) {
  if (isPluginZipCacheEnabled()) return;
  try {
    let installedVersions = anchoredPluginCachePath(),
      r = wslWalkRootOf(installedVersions);
    if (r === "undeterminable") {
      logForDebugging(
        "Skipping the orphaned-version sweep: the cache root volume could not be read to map its WSL companion views",
      );
      return;
    }
    let s =
      isStorageV5Enabled() && e !== void 0
        ? await getInstalledVersionPathsAsync(e, r)
        : getInstalledVersionPaths(r);
    if (!s || s.records.length === 0) return;
    let h = { pagesLeft: DEFAULT_MAX_PAGES },
      now = Date.now(),
      S = toComparablePath(installedVersions, { foldCase: !0 }),
      mapped = s.records
        .map((record) => classifyMarketplacePath(record))
        .filter((L) => !L.suspect)
        .map((L) => ({
          absolute: L.absolute,
          comparable: toComparablePath(L.absolute, { foldCase: !0, knownNotSuspect: !0 }),
        }));
    for (let L of mapped) s.keys.add(normalizePathForPlatform(L.comparable));
    await Promise.all(
      mapped
        .filter((L) => isPathWithin(S, L.comparable, { alreadyComparable: !0 }))
        .map((L) => removeOrphanedAtMarker(L.absolute, e)),
    );
    for (let marketplace of await listPluginCacheForCleanup(installedVersions, e, installedVersions, h)) {
      let match = regExp_18.exec(marketplace);
      if (match) {
        let Z = Date.now() - Number(match[1]);
        if (
          Z > -ORPHAN_GRACE_PERIOD_MS &&
          Z < WWn &&
          !anyStartsWith(
            s.keys,
            normalizePathForPlatform(join_30(installedVersions, marketplace) + sep_19),
          ) &&
          !anyStartsWith(
            s.keys,
            normalizePathForPlatform(
              toComparablePath(join_30(installedVersions, marketplace), { foldCase: !0 }) + sep_19,
            ),
          )
        )
          continue;
      }
      let marketplacePath = join_30(installedVersions, marketplace);
      for (let plugin of await listPluginCacheForCleanup(marketplacePath, e, installedVersions, h)) {
        let pluginPath = join_30(marketplacePath, plugin);
        for (let version of await listPluginCacheForCleanup(pluginPath, e, installedVersions, h)) {
          let versionPath = join_30(pluginPath, version);
          if (
            s.keys.has(normalizePathForPlatform(versionPath)) ||
            s.keys.has(normalizePathForPlatform(toComparablePath(versionPath, { foldCase: !0 })))
          )
            continue;
          let match = regExp_2_2.exec(version);
          if (match && (await isNotFoundCause(versionPath, Number(match[1])))) continue;
          await processOrphanedPluginVersion(versionPath, now, e);
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
function getOrphanedAtPath(e) {
  return join_30(e, R1);
}
//@ chunk-e6aww6q8.js:4183353-4183697 fingerprint = removeOrphanedAtMarker (0.74)
async function removeOrphanedAtMarker(e, n) {
  if (await KP(e)) return;
  let orphanedAtPath = getOrphanedAtPath(e),
    s = orphanMarkerCoordsV5(e, n);
  if (n !== void 0 && s !== null) {
    let h = await n.delete(STORAGE_SPACES.pluginCache(s.marketplace, s.plugin, s.version, [R1]));
    if (!h.ok) logForDebugging(`Failed to remove .orphaned_at: ${e}: ${formatStorageError(h.error)}`);
    return;
  }
  try {
    await unlink_5(orphanedAtPath);
  } catch (error) {
    if (getErrnoCode(error) === "ENOENT") return;
    logForDebugging(`Failed to remove .orphaned_at: ${e}: ${error}`);
  }
}
//@ chunk-e6aww6q8.js:4183697-4183802 fingerprint = getInstalledVersionPaths (0.744)
function getInstalledVersionPaths(e) {
  try {
    return collectInstallRecordPaths(loadInstalledPluginsSync(), e);
  } catch (error) {
    return (logForDebugging(`Failed to load installed plugins: ${error}`), null);
  }
}
//@ chunk-e6aww6q8.js:4183802-4183922 layout
async function getInstalledVersionPathsAsync(e, n) {
  try {
    return collectInstallRecordPaths(await loadInstalledPlugins(e), n);
  } catch (error) {
    return (logForDebugging(`Failed to load installed plugins: ${error}`), null);
  }
}
//@ chunk-e6aww6q8.js:4183922-4183992 layout
function anyStartsWith(e, n) {
  for (let r of e) if (r.startsWith(n)) return !0;
  return !1;
}
/**
 * 遍历 installed_plugins 的所有安装记录，收集去重后的 installPath（及其解析目标）和归一化后的路径键集合， 供孤儿版本清理判断哪些目录仍被引用。
 */
//@ chunk-e6aww6q8.js:4183992-4184293 layout
function collectInstallRecordPaths(e, n) {
  let r = [],
    s = new Set(),
    h = new Set();
  for (let y of Object.values(e.plugins))
    for (let S of y) {
      let w = resolve_11(getOriginalCwd(), S.installPath);
      if (!s.has(w)) (s.add(w), r.push(S.installPath));
      h.add(normalizePathForPlatform(w));
      let L = toAlternatePlatformPath(S.installPath, n);
      if (L !== void 0) {
        if ((h.add(normalizePathForPlatform(L)), !s.has(L))) (s.add(L), r.push(L));
      }
    }
  return { records: r, keys: h };
}
//@ chunk-e6aww6q8.js:4184293-4185266 fingerprint = processOrphanedPluginVersion (0.389)
async function processOrphanedPluginVersion(e, n, r) {
  if (await KP(e)) return;
  let orphanedAtPath = getOrphanedAtPath(e),
    orphanedAt,
    y = orphanMarkerCoordsV5(e, r);
  if (r !== void 0 && y !== null) {
    let pluginCache = STORAGE_SPACES.pluginCache(y.marketplace, y.plugin, y.version, [R1]),
      statMeta = await r.statMeta(pluginCache);
    if (!statMeta.ok) {
      if (statMeta.error.code === "NotFound") {
        await markPluginVersionOrphaned(e, r);
        return;
      }
      if (FX("telemetryCode" in statMeta.error ? statMeta.error.telemetryCode : void 0)) {
        try {
          if (!(await r.delete(pluginCache)).ok) await removeLinkOrDir(orphanedAtPath);
          await markPluginVersionOrphaned(e, r);
        } catch (error) {
          logForDebugging(`Failed to replace a non-regular ${R1}: ${e}: ${error}`);
        }
        return;
      }
      logForDebugging(`Failed to stat orphaned marker: ${e}: ${formatStorageError(statMeta.error)}`);
      return;
    }
    orphanedAt = statMeta.value.mtimeMs;
  } else
    try {
      let S = await lstat_15(orphanedAtPath);
      if (!S.isFile()) {
        await markPluginVersionOrphaned(e, r);
        return;
      }
      orphanedAt = S.mtimeMs;
    } catch (error) {
      if (getErrnoCode(error) === "ENOENT") {
        await markPluginVersionOrphaned(e, r);
        return;
      }
      logForDebugging(`Failed to stat orphaned marker: ${e}: ${error}`);
      return;
    }
  if (n - orphanedAt > WWn) {
    try {
      if (await isPluginVersionInUse(e, void 0, r)) {
        logForDebugging(`Skipping orphan cleanup, in use by live session: ${e}`);
        return;
      }
    } catch (error) {
      logForDebugging(`Failed to check ${e} for live users, skipping cleanup: ${error}`);
      return;
    }
    try {
      await evictCachedVersionDir(e, r);
    } catch (error) {
      logForDebugging(`Failed to delete orphaned version: ${e}: ${error}`);
    }
  }
}
//@ chunk-e6aww6q8.js:4185266-4185783 fingerprint = removeIfEmpty (0.302)
async function removeIfEmpty(dirPath) {
  let n;
  try {
    if (!(await lstat_15(dirPath)).isDirectory()) return;
    if (getPlatform() === "windows" && (await readJunction(dirPath)).kind !== "directory") return;
    n = await readdir_12(dirPath, { withFileTypes: !0 });
  } catch (error) {
    logForDebugging(`Failed to re-check dir before removal: ${dirPath}: ${error}`);
    return;
  }
  if (
    n.some(
      (r) =>
        r.isDirectory() ||
        r.isSymbolicLink() ||
        safeResolvePath_2(r) ||
        (r.isFile() && /\.zip$/i.test(r.name)),
    )
  ) {
    logForDebugging(
      `Keeping ${dirPath}: it still holds a directory, a symlink, a versioned archive or an entry of unknown type`,
    );
    return;
  }
  try {
    await removeDirectoryTreeNoFollow(dirPath);
  } catch (error) {
    logForDebugging(`Failed to remove empty dir: ${dirPath}: ${error}`);
  }
}
//@ chunk-e6aww6q8.js:4185783-4186343 placement
async function listPluginCacheForCleanup(e, n, r, s) {
  let h = isStorageV5Enabled() && n !== void 0 ? pluginCacheStorageScope(e, r) : null;
  if (n === void 0 || h === null) return listSubdirectoriesSafe(e);
  let y = [];
  switch (
    (
      await readAllPages(
        (w) => n.listEntries(h, { cursor: w, skipKeyStats: !0, skipScopeStats: !0 }),
        (w) => {
          for (let L of w) {
            if (L.kind !== "scope") continue;
            let scope = L.scope;
            if (scope.namespace !== "pluginCache") continue;
            let q =
              h.marketplace === void 0
                ? scope.marketplace
                : h.plugin === void 0
                  ? scope.plugin
                  : scope.version;
            if (q !== void 0) y.push(q);
          }
        },
        { budget: s },
      )
    ).status
  ) {
    case "error":
      return [];
    case "capped":
      return (logForDebugging(`Plugin cache cleanup: listing of ${e} truncated at the page cap`), y);
    case "done":
      return y;
  }
}
//@ chunk-e6aww6q8.js:4186343-4186581 placement
async function listSubdirectoriesSafe(e) {
  try {
    let n = await readdir_12(e, { withFileTypes: !0 }),
      r = [];
    for (let s of n)
      try {
        if ((await classifyDirEntrySafe(e, s))?.isDirectory) r.push(s.name);
      } catch (error) {
        logForDebugging(`Orphan sweep: skipping ${join_30(e, s.name)}: ${errorMessage(error)}`, {
          level: "warn",
        });
      }
    return r;
  } catch {
    return [];
  }
}
//@ chunk-e6aww6q8.js:4186581-4186787 placement = isRealPathWithinTeamDir (0.775)
async function isNotFoundCause(e, n) {
  if (!(n === 1 || isProcessRunning_2(n))) return !1;
  let realTeamDir;
  try {
    realTeamDir = (await lstat_15(e)).mtimeMs;
  } catch (error) {
    let code = getErrnoCode(error);
    return code !== "ENOENT" && code !== "ENOTDIR";
  }
  if (!isFreshTimestamp(realTeamDir, ORPHAN_SWEEP_INTERVAL_MS)) return !1;
  let s = await getProcessCreationTimeMsAsync(n);
  return s === null || s <= realTeamDir;
}
//@ chunk-f3qhjfah.js:2620-2695 fingerprint = ORPHANED_AT_FILENAME (0.405)
var R1 = ".orphaned_at",
  qm = ".in_use",
  ICt = ".gcs-sha",
  lU = ".links_materialized";
//@ chunk-f3qhjfah.js:4415-4444 placement
var CACHE_META_FILES = new Set([PLUGIN_LINK_FILE, qm, R1]);
/**
 * 递归复制目录（可按名字过滤）。名字配错，见 lead 建议。
 */
//@ chunk-hddjmtjj.js:10518-10744 fingerprint = readSubdirs (0.703)
async function copyDirRecursive(n, e, r) {
  await mkdir(e, { recursive: !0 });
  let entries = await readdir(n, { withFileTypes: !0 });
  for (let i of entries) {
    if (r?.(i.name)) continue;
    let s = join_2(n, i.name),
      c = join_2(e, i.name);
    if (i.isDirectory()) await copyDirRecursive(s, c);
    else if (i.isFile()) await copyFile(s, c);
  }
}

export {
  ICt,
  ic,
  markPluginVersionOrphaned,
  CACHE_META_FILES,
  R1,
  cleanupOrphanedPluginVersionsInBackground,
  clearPluginDerivedState,
  qm,
  lU,
  copyDirRecursive,
};
