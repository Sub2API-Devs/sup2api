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
import { dirname, basename, join, relative, sep } from "path";
import { readdir, rm as rm_2, lstat, rmdir, realpath, mkdir, unlink, readFile } from "fs/promises";
import { readdirSync, unlinkSync, realpathSync, lstatSync } from "fs";
import { DoctorLazy } from "../../cli/handlers/util.js";
import { create, create_3, create_2 } from "../../../vendor/zod/lib/index.mjs";
import { isStorageV5Enabled } from "../hoverRest.js";
import { logForDebugging } from "../debug.js";
import { IN_USE_MARKER_FILE } from "./cacheUtils.js";
import { formatStorageError } from "../storage/storageErrors.js";
import { isOwnTempName, writeFileAtomic as writeFileAtomic_2 } from "../atomicPublishWrite.js";
import {
  projectPluginsDir,
  PLUGIN_CACHE_DIRNAME,
  projectPluginCacheDir,
  isFreshTimestamp as isFreshTimestamp_2,
} from "./pluginCachePaths.js";
import { getPlatform } from "../platform.js";
import { readJunctionSync, readJunction } from "../fsJunctions.js";
import { isENOENT, getErrnoCode, isFsInaccessible, errorMessage } from "../errors.js";
import { isSubpathOf } from "../pathPrefix.js";
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
import {
  removeLinkOrDir,
  removePathEntry,
  removeDirectoryTreeNoFollow as removeDirectoryTreeNoFollow_2,
} from "../fsRemove.js";
import { parseVersionCachePath, registryStorageSpace } from "./pluginDirectories.js";
import { STORAGE_SPACES } from "../storage/storageSpaces.js";
import { writeFileAndFlush } from "../../components/agents/agentFileUtils.js";
import { atomicMoveToInstallPath_2 } from "../nativeInstaller/installer.js";
import { safeParseJSON } from "../json.js";
import { isProcessRunning as isProcessRunning_2 } from "../genericProcessUtils.js";
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-e6aww6q8.js:616264-616382 placement
var IN_USE_LINKS_DIR; // deferred: uses DoctorLazy (../../cli/handlers/util.js) of its import cycle while loading; runs once the cycle is complete
var IN_USE_LINK_DEPTH;
var MAX_IN_USE_MARKER_BYTES;
var InUseMarkerSchema;
deferInit("chunk-e6aww6q8.js:616264", () => {
  IN_USE_LINKS_DIR = ".in_use-links";
  IN_USE_LINK_DEPTH = 3;
  MAX_IN_USE_MARKER_BYTES = 4096;
  InUseMarkerSchema = DoctorLazy(() =>
    create({
      pid: create_3(),
      procStart: create_2().optional(),
      procStartFt: create_2().optional(),
    }),
  );
});
//@ chunk-e6aww6q8.js:616382-616791 placement
/**
 * 退出清理：删除本进程写的 in_use 标记（含 v5 存储项）。
 */
async function removeOwnInUseMarkersAsync(state) {
  await Promise.all(
    Array.from(state.ownInUseMarkerPaths).map(async (ownInUseMarkerPath) => {
      if (!(await isMarkerDirOurs(dirname(ownInUseMarkerPath)))) return;
      let handleEntry = state.ownInUseMarkerHandles.get(ownInUseMarkerPath);
      if (isStorageV5Enabled() && handleEntry !== undefined) {
        let deleteResult = await handleEntry.storageV5.delete(handleEntry.key);
        if (!deleteResult.ok)
          logForDebugging(
            `Failed to remove ${IN_USE_MARKER_FILE} marker at exit: ${ownInUseMarkerPath}: ${formatStorageError(deleteResult.error)}`,
          );
      }
      let dirEntries = [];
      try {
        dirEntries = await readdir(dirname(ownInUseMarkerPath));
      } catch {}
      for (let name of [...ownTempMarkersOf(dirEntries, ownInUseMarkerPath), basename(ownInUseMarkerPath)])
        await rm_2(join(dirname(ownInUseMarkerPath), name), {
          force: true,
        }).catch(() => {});
    }),
  );
}
//@ chunk-e6aww6q8.js:616791-617024 placement
function removeOwnInUseMarkersSync(state) {
  for (let ownInUseMarkerPath of state.ownInUseMarkerPaths) {
    if (!scanDirectory(dirname(ownInUseMarkerPath))) continue;
    let dirEntries = [];
    try {
      dirEntries = readdirSync(dirname(ownInUseMarkerPath));
    } catch {}
    for (let name of [...ownTempMarkersOf(dirEntries, ownInUseMarkerPath), basename(ownInUseMarkerPath)])
      try {
        unlinkSync(join(dirname(ownInUseMarkerPath), name));
      } catch {}
  }
  state.ownInUseMarkerPaths.clear();
  state.ownInUseMarkerHandles.clear();
}
//@ chunk-e6aww6q8.js:617024-617077 placement
function ownTempMarkersOf(names, ownInUseMarkerPath) {
  return names.filter((name) => isOwnTempName(name, basename(ownInUseMarkerPath)));
}
//@ chunk-e6aww6q8.js:617077-617191 placement
async function isMarkerDirOurs(dirPath) {
  if (isInUseMarkerPath(dirPath)) return (await classifyLinkDir(dirPath)) === "ours";
  try {
    return (await classifyMarkerPath(dirPath)) === "directory";
  } catch {
    return false;
  }
}
//@ chunk-e6aww6q8.js:617191-617379 placement (2.1.88 match: scanDirectory, 0.766)
function scanDirectory(dirPath) {
  try {
    if (isInUseMarkerPath(dirPath)) {
      let fs = projectPluginsDir();
      return realpathSync(dirPath) === join(realpathSync(fs), relative(fs, dirPath));
    }
    if (!lstatSync(dirPath).isDirectory()) return false;
    if (getPlatform() === "windows") return readJunctionSync(dirPath).kind === "directory";
    return true;
  } catch {
    return false;
  }
}
//@ chunk-e6aww6q8.js:617379-617698 placement
/**
 * lstat 判断路径 absent/directory/junk/refused（Windows 拒绝 junction）。
 */
async function classifyMarkerPath(markerPath) {
  let stat;
  try {
    stat = await lstat(markerPath);
  } catch (error) {
    if (isENOENT(error)) return "absent";
    throw error;
  }
  if (!stat.isDirectory()) return stat.isFile() ? "junk" : "refused";
  if (getPlatform() === "windows") {
    let junction = await readJunction(markerPath);
    switch (junction.kind) {
      case "junction":
        return "refused";
      case "absent":
        return "absent";
      case "error":
        throw junction.error;
      case "directory":
        break;
    }
  }
  return "directory";
}
//@ chunk-e6aww6q8.js:617740-617784 placement
function isInUseMarkerPath(markerPath) {
  return isSubpathOf(join(projectPluginsDir(), IN_USE_LINKS_DIR), markerPath, false);
}
//@ chunk-e6aww6q8.js:617784-618049 placement
function registerOwnInUseMarker(state, markerPath, handle) {
  state.ownInUseMarkerPaths.add(markerPath);
  if (handle) state.ownInUseMarkerHandles.set(markerPath, handle);
  else state.ownInUseMarkerHandles.delete(markerPath);
  if (state.inUseMarkerCleanup) return;
  let unregisterCleanup = registerCleanup(() => removeOwnInUseMarkersAsync(state));
  let onExit = () => removeOwnInUseMarkersSync(state);
  process.on("exit", onExit);
  state.inUseMarkerCleanup = () => {
    unregisterCleanup();
    process.off("exit", onExit);
  };
}
//@ chunk-e6aww6q8.js:618049-618133 placement
function forgetOwnInUseMarker(pluginRegistry, markerPath) {
  pluginRegistry.ownInUseMarkerPaths.delete(markerPath);
  pluginRegistry.ownInUseMarkerHandles.delete(markerPath);
}
//@ chunk-e6aww6q8.js:618133-618211 placement
/**
 * isSymlinkOrFalse：是否为符号链接。
 */
async function isSymlinkOrFalse(path) {
  try {
    return (await lstat(path)).isSymbolicLink();
  } catch {
    return false;
  }
}
//@ chunk-e6aww6q8.js:618211-618359 placement
async function pruneEmptyLinkDirs(inUseLinkPath) {
  let linksRoot = join(projectPluginsDir(), IN_USE_LINKS_DIR);
  let dir = inUseLinkPath;
  for (let idx = 0; idx < 3; idx++) {
    if (!isSubpathOf(linksRoot, dir, false)) return;
    try {
      await rmdir(dir);
    } catch (error) {
      if (getErrnoCode(error) !== "ENOENT") return;
    }
    dir = dirname(dir);
  }
}
//@ chunk-e6aww6q8.js:618359-618499 placement
function toInUseLinkPath(versionDir) {
  let pluginsDir = projectPluginsDir();
  let parts = relative(join(pluginsDir, PLUGIN_CACHE_DIRNAME), versionDir).split(sep);
  if (parts.length !== 3 || parts.some((part) => part === "" || part === "." || part === "..")) return;
  return join(pluginsDir, IN_USE_LINKS_DIR, ...parts);
}
//@ chunk-e6aww6q8.js:618499-618829 placement
/**
 * 逐级创建链接目录并检测是否被重定向。
 */
async function ensureLinkDirChain(linkPath) {
  let pluginsDir = projectPluginsDir();
  try {
    let realPluginsDir = await realpath(pluginsDir);
    let currentPath = pluginsDir;
    for (let part of relative(pluginsDir, linkPath).split(sep)) {
      currentPath = join(currentPath, part);
      realPluginsDir = join(realPluginsDir, part);
      await mkdir(currentPath).catch((error) => {
        let errnoCode = getErrnoCode(error);
        if (errnoCode !== "EEXIST" && errnoCode !== "ENOENT") throw error;
      });
      if ((await realpath(currentPath)) !== realPluginsDir) return "redirected";
    }
    return "ours";
  } catch (error) {
    let errnoCode = getErrnoCode(error);
    if (errnoCode === "ENOENT" || errnoCode === "ENOTDIR")
      return pruneOrReportPlantedEntry(pluginsDir, linkPath);
    return "undeterminable";
  }
}
//@ chunk-e6aww6q8.js:618829-619096 placement
async function findPlantedEntry(pluginsDir, linkPath) {
  let linksRoot = join(pluginsDir, IN_USE_LINKS_DIR);
  let currentPath = pluginsDir;
  for (let part of relative(pluginsDir, linkPath).split(sep)) {
    currentPath = join(currentPath, part);
    if (!(currentPath === linksRoot || currentPath.startsWith(linksRoot + sep))) continue;
    try {
      let stat = await lstat(currentPath);
      if (stat.isSymbolicLink())
        return {
          path: currentPath,
          kind: "link",
        };
      if (!stat.isDirectory())
        return {
          path: currentPath,
          kind: "junk",
        };
    } catch {
      return;
    }
  }
  return;
}
//@ chunk-e6aww6q8.js:619096-619360 placement
async function pruneOrReportPlantedEntry(pluginsDir, linkPath) {
  let plantedEntry = await findPlantedEntry(pluginsDir, linkPath);
  if (plantedEntry === undefined) return "pruned";
  if (plantedEntry.kind === "link") return "redirected";
  try {
    await unlink(plantedEntry.path);
  } catch {
    return "undeterminable";
  }
  logForDebugging(
    `Removed a stray non-directory entry planted in the ${IN_USE_LINKS_DIR} marker tree: ${plantedEntry.path}`,
  );
  return "pruned";
}
//@ chunk-e6aww6q8.js:619360-619644 placement
async function classifyLinkDir(linkDir) {
  try {
    let realLinkDir = await realpath(linkDir);
    let expectedReal = join(await realpath(projectPluginsDir()), relative(projectPluginsDir(), linkDir));
    return realLinkDir === expectedReal ? "ours" : "redirected";
  } catch (error) {
    let errnoCode = getErrnoCode(error);
    if (errnoCode === "ENOENT" || errnoCode === "ENOTDIR") {
      let plantedEntry = await findPlantedEntry(projectPluginsDir(), linkDir);
      return plantedEntry === undefined
        ? "absent"
        : plantedEntry.kind === "link"
          ? "redirected"
          : "undeterminable";
    }
    return "undeterminable";
  }
}
//@ chunk-e6aww6q8.js:619644-619712 placement
async function inUseMarkerPayload() {
  return jsonStringify({
    pid: process.pid,
    ...procIdentityFields(await ownProcStartAsync()),
  });
}
//@ chunk-e6aww6q8.js:619712-621536 placement
/**
 * 写入插件使用中标记，并发清理导致反复失败时放弃。
 */
async function writeInUseMarker(versionDir, storageV5) {
  let pluginRegistry = getPluginRegistry();
  let useStorage = isStorageV5Enabled() && storageV5 !== undefined;
  if (await isSymlinkOrFalse(versionDir)) {
    let linkPath = toInUseLinkPath(versionDir);
    if (linkPath === undefined) return false;
    let markerPath = join(linkPath, String(process.pid));
    for (let idx = 1; ; idx++)
      try {
        let linkDirChain = await ensureLinkDirChain(linkPath);
        if (linkDirChain === "pruned" && idx < IN_USE_LINK_DEPTH) continue;
        if (linkDirChain !== "ours") {
          logForDebugging(
            linkDirChain === "pruned"
              ? `Not writing an ${IN_USE_LINKS_DIR} marker: ${linkPath} kept being pruned while it was being created (gave up after ${IN_USE_LINK_DEPTH} attempts)`
              : linkDirChain === "undeterminable"
                ? `Not writing an ${IN_USE_LINKS_DIR} marker: ${linkPath} could not be examined`
                : `Not writing an ${IN_USE_LINKS_DIR} marker: ${linkPath} does not resolve inside the plugins directory`,
          );
          return false;
        }
        registerOwnInUseMarker(pluginRegistry, markerPath, undefined);
        await removeLinkOrDir(markerPath);
        await writeFileAtomic_2(markerPath, await inUseMarkerPayload());
        return true;
      } catch (error) {
        let errnoCode = getErrnoCode(error);
        if (
          (errnoCode === "ENOENT" || errnoCode === "ENOTDIR") &&
          idx < IN_USE_LINK_DEPTH &&
          (await pruneOrReportPlantedEntry(projectPluginsDir(), linkPath)) === "pruned"
        )
          continue;
        logForDebugging(`Failed to write ${IN_USE_LINKS_DIR} marker: ${versionDir}: ${error}`);
        return false;
      }
  }
  let markerDir = join(versionDir, IN_USE_MARKER_FILE);
  let markerPath = join(markerDir, String(process.pid));
  let cacheCoords = useStorage ? parseVersionCachePath(versionDir, projectPluginCacheDir()) : null;
  if (useStorage && cacheCoords) {
    let markerKind;
    try {
      markerKind = await classifyMarkerPath(markerDir);
    } catch (error) {
      logForDebugging(
        `Not writing an ${IN_USE_MARKER_FILE} marker: ${markerDir} cannot be examined: ${error}`,
      );
      return false;
    }
    if (markerKind === "refused" || markerKind === "junk") {
      if (!(await removeNonDirectoryMarker(markerDir))) {
        logForDebugging(
          `Not writing an ${IN_USE_MARKER_FILE} marker: ${markerDir} is not a directory of markers`,
        );
        return false;
      }
    }
  }
  let storageKey =
    useStorage && cacheCoords
      ? STORAGE_SPACES.pluginCache(cacheCoords.marketplace, cacheCoords.plugin, cacheCoords.version, [
          IN_USE_MARKER_FILE,
          String(process.pid),
        ])
      : undefined;
  registerOwnInUseMarker(
    pluginRegistry,
    markerPath,
    useStorage && storageKey
      ? {
          storageV5,
          key: storageKey,
        }
      : undefined,
  );
  try {
    if (useStorage && storageKey) {
      let payload = await inUseMarkerPayload();
      let writeOptions = {
        mode: 438 & ~process.umask(),
      };
      let writeResult = await storageV5.write(storageKey, payload, writeOptions);
      if (!writeResult.ok) {
        await removeLinkOrDir(markerPath);
        writeResult = await storageV5.write(storageKey, payload, writeOptions);
      }
      if (!writeResult.ok) {
        logForDebugging(
          `Failed to write ${IN_USE_MARKER_FILE} marker: ${versionDir}: ${formatStorageError(writeResult.error)}`,
        );
        return false;
      }
      return true;
    }
    try {
      await mkdir(markerDir);
    } catch (error) {
      let errnoCode = getErrnoCode(error);
      if (errnoCode === "ENOENT")
        await mkdir(markerDir, {
          recursive: true,
        });
      else if (errnoCode !== "EEXIST") throw error;
      else {
        let recheck = await classifyMarkerPath(markerDir);
        if (recheck === "absent")
          await mkdir(markerDir, {
            recursive: true,
          });
        else if (recheck !== "directory") {
          if (!(await removeNonDirectoryMarker(markerDir))) {
            logForDebugging(
              `Not writing ${IN_USE_MARKER_FILE} marker through a non-directory: ${versionDir}`,
            );
            return false;
          }
          await mkdir(markerDir, {
            recursive: true,
          });
        }
      }
    }
    await removeLinkOrDir(markerPath);
    await writeFileAtomic_2(markerPath, await inUseMarkerPayload());
    return true;
  } catch (error) {
    logForDebugging(`Failed to write ${IN_USE_MARKER_FILE} marker: ${versionDir}: ${error}`);
    return false;
  }
}
//@ chunk-e6aww6q8.js:621536-622103 placement
/**
 * 删除本进程（pid）在版本目录 e 的 in_use 标记：链接式缓存直接成功；v5 存储走存储 delete，否则 rm； 标记目录被拒或是杂项时返回 false。成功后从注册表移除。
 */
async function removeInUseMarker(versionDir, storage) {
  if (await isSymlinkOrFalse(versionDir)) return true;
  let markerDir = join(versionDir, IN_USE_MARKER_FILE);
  let markerPath = join(markerDir, String(process.pid));
  let useStorage = isStorageV5Enabled() && storage !== undefined;
  let cacheCoords = useStorage ? parseVersionCachePath(versionDir, projectPluginCacheDir()) : null;
  try {
    let markerKind = await classifyMarkerPath(markerDir);
    if (markerKind === "absent" || (useStorage && markerKind === "junk")) {
      forgetOwnInUseMarker(getPluginRegistry(), markerPath);
      return true;
    }
    if (markerKind === "refused" || markerKind === "junk") return false;
    if (useStorage && cacheCoords) {
      let deleteResult = await storage.delete(
        STORAGE_SPACES.pluginCache(cacheCoords.marketplace, cacheCoords.plugin, cacheCoords.version, [
          IN_USE_MARKER_FILE,
          String(process.pid),
        ]),
      );
      if (!deleteResult.ok) {
        logForDebugging(
          `Failed to remove ${IN_USE_MARKER_FILE} marker: ${versionDir}: ${formatStorageError(deleteResult.error)}`,
        );
        return false;
      }
    } else
      await rm_2(markerPath, {
        force: true,
      });
    await rmdir(markerDir).catch(() => {});
  } catch (error) {
    logForDebugging(`Failed to remove ${IN_USE_MARKER_FILE} marker: ${versionDir}: ${error}`);
    return false;
  }
  forgetOwnInUseMarker(getPluginRegistry(), markerPath);
  return true;
}
//@ chunk-e6aww6q8.js:622103-622144 placement
var LAST_INUSE_SWEEP_FILE = ".last_inuse_sweep";
var INUSE_SWEEP_INTERVAL_MS = 86400000;
//@ chunk-e6aww6q8.js:622144-622177 placement
function isSweepRecent(mtimeMs) {
  return isFreshTimestamp_2(mtimeMs, INUSE_SWEEP_INTERVAL_MS);
}
//@ chunk-e6aww6q8.js:622177-622999 placement
/**
 * 清扫插件使用中标记。
 */
async function sweepInUseMarkers(versionDirs, version) {
  if (versionDirs.length === 0) return;
  let filePath = join(projectPluginsDir(), LAST_INUSE_SWEEP_FILE);
  let useStorage = isStorageV5Enabled() && version !== undefined;
  let sweepSpace = useStorage ? registryStorageSpace("inUseSweep", projectPluginsDir()) : null;
  if (useStorage && sweepSpace) {
    let stampStat = await version.statMeta(sweepSpace);
    if (stampStat.ok && isSweepRecent(stampStat.value.mtimeMs)) return;
  } else
    try {
      let stampStat = await lstat(filePath);
      if (stampStat.isFile() && isSweepRecent(stampStat.mtimeMs)) return;
    } catch {}
  let settled = await Promise.allSettled(
    versionDirs.map((versionDir) => isPluginVersionInUse(versionDir, undefined, version)),
  );
  for (let [index, resultEntry] of settled.entries())
    if (resultEntry.status === "rejected")
      logForDebugging(`Failed to sweep ${IN_USE_MARKER_FILE}: ${versionDirs[index]}: ${resultEntry.reason}`);
  if (useStorage && sweepSpace) {
    let writeResult = await version.write(sweepSpace, new Date().toISOString(), {
      publishDiscipline: "inPlace",
    });
    if (!writeResult.ok)
      try {
        await removeLinkOrDir(filePath);
        writeResult = await version.write(sweepSpace, new Date().toISOString(), {
          publishDiscipline: "inPlace",
        });
      } catch (error) {
        logForDebugging(`Failed to clear a non-regular ${LAST_INUSE_SWEEP_FILE}: ${error}`);
      }
    if (!writeResult.ok)
      logForDebugging(`Failed to stamp ${LAST_INUSE_SWEEP_FILE}: ${formatStorageError(writeResult.error)}`);
    return;
  }
  try {
    await removeLinkOrDir(filePath);
    await writeFileAndFlush(filePath, new Date().toISOString());
  } catch (error) {
    logForDebugging(`Failed to stamp ${LAST_INUSE_SWEEP_FILE}: ${error}`);
  }
}
//@ chunk-e6aww6q8.js:622999-623640 placement
/**
 * 链接式缓存查 .in_use-links 下的对应目录；否则读版本目录里的 in_use 标记（v5 存储时列存储项）。 读不到或被拒时按 refusedCountsAsLive（默认 true）保守视为使用中。孤儿清理、同步与安装前调用。
 */
async function isPluginVersionInUse(versionDir, options, storage) {
  if (await isSymlinkOrFalse(versionDir)) {
    let inUseLinkPath = toInUseLinkPath(versionDir);
    if (inUseLinkPath === undefined) return false;
    switch (await classifyLinkDir(inUseLinkPath)) {
      case "ours": {
        let inUseMarker = await readInUseMarker(inUseLinkPath, options);
        if (!inUseMarker) await pruneEmptyLinkDirs(inUseLinkPath);
        return inUseMarker;
      }
      case "absent":
        return false;
      case "redirected":
        logForDebugging(
          `Not scanning ${IN_USE_LINKS_DIR}: ${inUseLinkPath} does not resolve inside the plugins directory`,
        );
        return false;
      case "undeterminable":
        return options?.refusedCountsAsLive ?? true;
    }
  }
  let markerDir = join(versionDir, IN_USE_MARKER_FILE);
  let store = isStorageV5Enabled() ? storage : undefined;
  let cacheCoords = store !== undefined ? parseVersionCachePath(versionDir, projectPluginCacheDir()) : null;
  if (store === undefined || cacheCoords === null) return readInUseMarker(markerDir, options);
  let markerKind;
  try {
    markerKind = await classifyMarkerPath(markerDir);
  } catch (error) {
    if (isFsInaccessible(error)) return options?.refusedCountsAsLive ?? true;
    throw error;
  }
  if (markerKind === "junk") {
    await removeNonDirectoryMarker(markerDir);
    return false;
  }
  if (markerKind === "refused") {
    await removeNonDirectoryMarker(markerDir);
    return options?.refusedCountsAsLive ?? true;
  }
  return listInUseMarkers(store, cacheCoords, options);
}
//@ chunk-e6aww6q8.js:623640-623959 placement
/**
 * 删除非目录形式的 in_use 标记，失败时视为仍在使用。
 */
async function removeNonDirectoryMarker(path) {
  try {
    if ((await removePathEntry(path)) === "directory") return true;
    logForDebugging(
      `Removed a non-directory ${IN_USE_MARKER_FILE} at ${path}; the version reads unpinned until a session marks it again`,
      {
        level: "warn",
      },
    );
    return true;
  } catch (error) {
    logForDebugging(
      `Could not remove a non-directory ${IN_USE_MARKER_FILE} at ${path} (${errorMessage(error)}); treating the version as in use`,
      {
        level: "warn",
      },
    );
    return false;
  }
}
//@ chunk-e6aww6q8.js:623959-623974 placement
var STALE_INUSE_MARKER_MS = 600000;
//@ chunk-e6aww6q8.js:623974-624060 placement
function isStaleInUseMarker(mtimeMs) {
  if (typeof mtimeMs !== "number" || !Number.isFinite(mtimeMs)) return false;
  return !isFreshTimestamp_2(mtimeMs, STALE_INUSE_MARKER_MS);
}
//@ chunk-e6aww6q8.js:624060-624205 placement
async function removeStaleEntry(path, mtimeMs) {
  try {
    let mtime = mtimeMs ?? (await lstat(path)).mtimeMs;
    if (!isStaleInUseMarker(mtime)) return false;
    if ((await removePathEntry(path)) === "directory") await removeDirectoryTreeNoFollow_2(path);
    return true;
  } catch {
    return false;
  }
}
//@ chunk-e6aww6q8.js:624205-625019 placement
async function readInUseMarker(markerDir, options) {
  let names;
  try {
    let markerKind = await classifyMarkerPath(markerDir);
    if (markerKind === "refused") {
      await removeNonDirectoryMarker(markerDir);
      return options?.refusedCountsAsLive ?? true;
    }
    if (markerKind === "junk") {
      await removeNonDirectoryMarker(markerDir);
      return false;
    }
    if (markerKind !== "directory") return false;
    names = await readdir(markerDir);
  } catch (error) {
    if (isENOENT(error)) return false;
    if (isFsInaccessible(error)) return options?.refusedCountsAsLive ?? true;
    throw error;
  }
  let anyLive = false;
  for (let name of names) {
    let markerPath = join(markerDir, name);
    if (atomicMoveToInstallPath_2(name)) {
      if (await removeStaleEntry(markerPath)) continue;
      anyLive = true;
      continue;
    }
    let raw;
    let mtimeMs;
    try {
      let stat = await lstat(markerPath);
      mtimeMs = stat.mtimeMs;
      if (stat.isFile() && stat.size <= MAX_IN_USE_MARKER_BYTES) raw = await readFile(markerPath, "utf-8");
    } catch (error) {
      if (isENOENT(error)) continue;
      logForDebugging(
        `In-use marker ${markerPath} could not be read (${errorMessage(error)}); treating it as live`,
        {
          level: "warn",
        },
      );
      anyLive = true;
      continue;
    }
    if (raw === "") {
      if (await removeStaleEntry(markerPath, mtimeMs)) continue;
      anyLive = true;
      continue;
    }
    let parseResult = InUseMarkerSchema().safeParse(safeParseJSON(raw, false));
    if (options?.excludeSelf && parseResult.success && parseResult.data.pid === process.pid) continue;
    if (parseResult.success && (await isMarkerOwnerAlive(parseResult.data, options?.requireIdentity))) {
      anyLive = true;
      continue;
    }
    await removeDirectoryTreeNoFollow_2(markerPath);
  }
  return anyLive;
}
//@ chunk-e6aww6q8.js:625019-626391 placement
/**
 * 列出插件缓存中的使用中标记。
 */
async function listInUseMarkers(storageV5, coords, options) {
  let keyFor = (markerName) =>
    STORAGE_SPACES.pluginCache(coords.marketplace, coords.plugin, coords.version, [
      IN_USE_MARKER_FILE,
      markerName,
    ]);
  let names = [];
  let mtimes = new Map();
  let cursor;
  do {
    let page = await storageV5.listEntries(
      {
        namespace: "pluginCache",
        marketplace: coords.marketplace,
        plugin: coords.plugin,
        version: coords.version,
        relPath: [IN_USE_MARKER_FILE],
      },
      {
        cursor,
        skipKeyStats: true,
        skipScopeStats: true,
      },
    );
    if (!page.ok) {
      let telemetryCode = "telemetryCode" in page.error ? page.error.telemetryCode : undefined;
      let merged = Object.assign(Error("in-use listing failed"), {
        ...(telemetryCode !== undefined && {
          code: telemetryCode,
        }),
      });
      if (telemetryCode === "ENOENT" || telemetryCode === "ENOTDIR") return false;
      if (isFsInaccessible(merged)) return options?.refusedCountsAsLive ?? true;
      throw merged;
    }
    for (let item of page.value.items) {
      if (item.kind !== "key" || item.key.namespace !== "pluginCache") continue;
      let last = item.key.relPath.at(-1);
      if (last !== undefined) {
        names.push(last);
        mtimes.set(last, item.mtimeMs);
      }
    }
    cursor = page.value.cursor;
  } while (cursor);
  let any = names.some((name) => atomicMoveToInstallPath_2(name) && !isStaleInUseMarker(mtimes.get(name)));
  let filtered = names.filter((name) => !atomicMoveToInstallPath_2(name));
  for (let offset = 0; offset < filtered.length; offset += MAX_INUSE_READ_BATCH) {
    let sliced = filtered.slice(offset, offset + MAX_INUSE_READ_BATCH);
    let markerItems = await readMarkerItems(storageV5, sliced.map(keyFor));
    for (let [index, name] of sliced.entries()) {
      let item = markerItems[index] ?? "unreadable";
      if (item === "unreadable") {
        any = true;
        continue;
      }
      let entry = item === "absent" ? undefined : item;
      let raw =
        entry !== undefined && Buffer.byteLength(entry.raw, "utf8") > MAX_IN_USE_MARKER_BYTES
          ? undefined
          : entry?.raw;
      if (raw === "") {
        if (!isStaleInUseMarker(entry?.mtimeMs)) {
          any = true;
          continue;
        }
        if (
          !(await storageV5.delete(keyFor(name)).then(
            (result) => result.ok,
            () => false,
          ))
        )
          any = true;
        continue;
      }
      let parseResult = InUseMarkerSchema().safeParse(safeParseJSON(raw, false));
      if (options?.excludeSelf && parseResult.success && parseResult.data.pid === process.pid) continue;
      if (parseResult.success && (await isMarkerOwnerAlive(parseResult.data, options?.requireIdentity))) {
        any = true;
        continue;
      }
      await storageV5.delete(keyFor(name)).then(
        () => {},
        () => {},
      );
    }
  }
  return any;
}
//@ chunk-e6aww6q8.js:626391-626402 placement
var MAX_INUSE_READ_BATCH = 64;
//@ chunk-e6aww6q8.js:626402-626761 placement
/**
 * 批量读存储项，失败退回逐项读。
 */
async function readMarkerItems(storageV5, keys) {
  let decode = (bytes) => Buffer.from(bytes).toString("utf8");
  let readResult = await storageV5.read(keys);
  if (readResult.ok)
    return readResult.value.items.map((item) =>
      item.found
        ? {
            raw: decode(item.value),
            mtimeMs: item.mtimeMs,
          }
        : "absent",
    );
  let items = [];
  for (let key of keys) {
    let readResult = await storageV5.read([key]);
    items.push(
      !readResult.ok
        ? "unreadable"
        : readResult.value.items[0]?.found
          ? {
              raw: decode(readResult.value.items[0].value),
              mtimeMs: readResult.value.items[0].mtimeMs,
            }
          : "absent",
    );
  }
  return items;
}
//@ chunk-e6aww6q8.js:626761-626936 placement
async function releaseMarkersOutside(cacheRoot, keep, storageV5) {
  let staleDirs = new Set();
  for (let ownInUseMarkerPath of getPluginRegistry().ownInUseMarkerPaths) {
    let versionDir = dirname(dirname(ownInUseMarkerPath));
    if (isSubpathOf(cacheRoot, versionDir, false) && !keep.has(versionDir)) staleDirs.add(versionDir);
  }
  await Promise.all(Array.from(staleDirs, (versionDir) => removeInUseMarker(versionDir, storageV5)));
}
//@ chunk-e6aww6q8.js:626936-627074 placement
async function isMarkerOwnerAlive(marker, requireIdentity) {
  if (!(marker.pid === 1 || isProcessRunning_2(marker.pid))) return false;
  let identity = procIdentityOf(marker);
  if (requireIdentity)
    return identity !== undefined && (await provenSameProcessAsync(marker.pid, identity)) === true;
  return isSameProcessAsync(marker.pid, identity);
}
export {
  writeInUseMarker,
  removeInUseMarker,
  isPluginVersionInUse,
  isSymlinkOrFalse,
  sweepInUseMarkers,
  releaseMarkersOutside,
};
