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

//@ chunk-e6aww6q8.js:616264-616382 placement
var IN_USE_LINKS_DIR = ".in_use-links";
var IN_USE_LINK_DEPTH = 3;
var MAX_IN_USE_MARKER_BYTES = 4096;
var InUseMarkerSchema = DoctorLazy(() =>
  create({
    pid: create_3(),
    procStart: create_2().optional(),
    procStartFt: create_2().optional(),
  }),
);
//@ chunk-e6aww6q8.js:616382-616791 placement
/**
 * 退出清理：删除本进程写的 in_use 标记（含 v5 存储项）。
 */
async function removeOwnInUseMarkersAsync(e) {
  await Promise.all(
    Array.from(e.ownInUseMarkerPaths).map(async (ownInUseMarkerPath) => {
      if (!(await isMarkerDirOurs(dirname(ownInUseMarkerPath)))) return;
      let r = e.ownInUseMarkerHandles.get(ownInUseMarkerPath);
      if (isStorageV5Enabled() && r !== undefined) {
        let h = await r.storageV5.delete(r.key);
        if (!h.ok)
          logForDebugging(
            `Failed to remove ${IN_USE_MARKER_FILE} marker at exit: ${ownInUseMarkerPath}: ${formatStorageError(h.error)}`,
          );
      }
      let s = [];
      try {
        s = await readdir(dirname(ownInUseMarkerPath));
      } catch {}
      for (let h of [...ownTempMarkersOf(s, ownInUseMarkerPath), basename(ownInUseMarkerPath)])
        await rm_2(join(dirname(ownInUseMarkerPath), h), {
          force: true,
        }).catch(() => {});
    }),
  );
}
//@ chunk-e6aww6q8.js:616791-617024 placement
function removeOwnInUseMarkersSync(e) {
  for (let ownInUseMarkerPath of e.ownInUseMarkerPaths) {
    if (!scanDirectory(dirname(ownInUseMarkerPath))) continue;
    let r = [];
    try {
      r = readdirSync(dirname(ownInUseMarkerPath));
    } catch {}
    for (let s of [...ownTempMarkersOf(r, ownInUseMarkerPath), basename(ownInUseMarkerPath)])
      try {
        unlinkSync(join(dirname(ownInUseMarkerPath), s));
      } catch {}
  }
  e.ownInUseMarkerPaths.clear();
  e.ownInUseMarkerHandles.clear();
}
//@ chunk-e6aww6q8.js:617024-617077 placement
function ownTempMarkersOf(e, ownInUseMarkerPath) {
  return e.filter((r) => isOwnTempName(r, basename(ownInUseMarkerPath)));
}
//@ chunk-e6aww6q8.js:617077-617191 placement
async function isMarkerDirOurs(e) {
  if (isInUseMarkerPath(e)) return (await classifyLinkDir(e)) === "ours";
  try {
    return (await classifyMarkerPath(e)) === "directory";
  } catch {
    return false;
  }
}
//@ chunk-e6aww6q8.js:617191-617379 placement = scanDirectory (0.766)
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
async function classifyMarkerPath(e) {
  let n;
  try {
    n = await lstat(e);
  } catch (error) {
    if (isENOENT(error)) return "absent";
    throw error;
  }
  if (!n.isDirectory()) return n.isFile() ? "junk" : "refused";
  if (getPlatform() === "windows") {
    let junction = await readJunction(e);
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
function isInUseMarkerPath(e) {
  return isSubpathOf(join(projectPluginsDir(), IN_USE_LINKS_DIR), e, false);
}
//@ chunk-e6aww6q8.js:617784-618049 placement
function registerOwnInUseMarker(pluginRegistry, n, r) {
  pluginRegistry.ownInUseMarkerPaths.add(n);
  if (r) pluginRegistry.ownInUseMarkerHandles.set(n, r);
  else pluginRegistry.ownInUseMarkerHandles.delete(n);
  if (pluginRegistry.inUseMarkerCleanup) return;
  let s = registerCleanup(() => removeOwnInUseMarkersAsync(pluginRegistry));
  let h = () => removeOwnInUseMarkersSync(pluginRegistry);
  process.on("exit", h);
  pluginRegistry.inUseMarkerCleanup = () => {
    s();
    process.off("exit", h);
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
async function isSymlinkOrFalse(e) {
  try {
    return (await lstat(e)).isSymbolicLink();
  } catch {
    return false;
  }
}
//@ chunk-e6aww6q8.js:618211-618359 placement
async function pruneEmptyLinkDirs(inUseLinkPath) {
  let n = join(projectPluginsDir(), IN_USE_LINKS_DIR);
  let r = inUseLinkPath;
  for (let idx = 0; idx < 3; idx++) {
    if (!isSubpathOf(n, r, false)) return;
    try {
      await rmdir(r);
    } catch (error) {
      if (getErrnoCode(error) !== "ENOENT") return;
    }
    r = dirname(r);
  }
}
//@ chunk-e6aww6q8.js:618359-618499 placement
function toInUseLinkPath(e) {
  let n = projectPluginsDir();
  let parts = relative(join(n, PLUGIN_CACHE_DIRNAME), e).split(sep);
  if (parts.length !== 3 || parts.some((s) => s === "" || s === "." || s === "..")) return;
  return join(n, IN_USE_LINKS_DIR, ...parts);
}
//@ chunk-e6aww6q8.js:618499-618829 placement
/**
 * 逐级创建链接目录并检测是否被重定向。
 */
async function ensureLinkDirChain(inUseLinkPath) {
  let n = projectPluginsDir();
  try {
    let r = await realpath(n);
    let s = n;
    for (let h of relative(n, inUseLinkPath).split(sep)) {
      s = join(s, h);
      r = join(r, h);
      await mkdir(s).catch((error) => {
        let errnoCode = getErrnoCode(error);
        if (errnoCode !== "EEXIST" && errnoCode !== "ENOENT") throw error;
      });
      if ((await realpath(s)) !== r) return "redirected";
    }
    return "ours";
  } catch (error) {
    let errnoCode = getErrnoCode(error);
    if (errnoCode === "ENOENT" || errnoCode === "ENOTDIR") return pruneOrReportPlantedEntry(n, inUseLinkPath);
    return "undeterminable";
  }
}
//@ chunk-e6aww6q8.js:618829-619096 placement
async function findPlantedEntry(e, n) {
  let r = join(e, IN_USE_LINKS_DIR);
  let s = e;
  for (let h of relative(e, n).split(sep)) {
    s = join(s, h);
    if (!(s === r || s.startsWith(r + sep))) continue;
    try {
      let y = await lstat(s);
      if (y.isSymbolicLink())
        return {
          path: s,
          kind: "link",
        };
      if (!y.isDirectory())
        return {
          path: s,
          kind: "junk",
        };
    } catch {
      return;
    }
  }
  return;
}
//@ chunk-e6aww6q8.js:619096-619360 placement
async function pruneOrReportPlantedEntry(e, n) {
  let plantedEntry = await findPlantedEntry(e, n);
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
async function classifyLinkDir(e) {
  try {
    let n = await realpath(e);
    let r = join(await realpath(projectPluginsDir()), relative(projectPluginsDir(), e));
    return n === r ? "ours" : "redirected";
  } catch (error) {
    let errnoCode = getErrnoCode(error);
    if (errnoCode === "ENOENT" || errnoCode === "ENOTDIR") {
      let plantedEntry = await findPlantedEntry(projectPluginsDir(), e);
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
async function writeInUseMarker(e, n) {
  let pluginRegistry = getPluginRegistry();
  let s = isStorageV5Enabled() && n !== undefined;
  if (await isSymlinkOrFalse(e)) {
    let inUseLinkPath = toInUseLinkPath(e);
    if (inUseLinkPath === undefined) return false;
    let G = join(inUseLinkPath, String(process.pid));
    for (let idx = 1; ; idx++)
      try {
        let linkDirChain = await ensureLinkDirChain(inUseLinkPath);
        if (linkDirChain === "pruned" && idx < IN_USE_LINK_DEPTH) continue;
        if (linkDirChain !== "ours") {
          logForDebugging(
            linkDirChain === "pruned"
              ? `Not writing an ${IN_USE_LINKS_DIR} marker: ${inUseLinkPath} kept being pruned while it was being created (gave up after ${IN_USE_LINK_DEPTH} attempts)`
              : linkDirChain === "undeterminable"
                ? `Not writing an ${IN_USE_LINKS_DIR} marker: ${inUseLinkPath} could not be examined`
                : `Not writing an ${IN_USE_LINKS_DIR} marker: ${inUseLinkPath} does not resolve inside the plugins directory`,
          );
          return false;
        }
        registerOwnInUseMarker(pluginRegistry, G, undefined);
        await removeLinkOrDir(G);
        await writeFileAtomic_2(G, await inUseMarkerPayload());
        return true;
      } catch (error) {
        let errnoCode = getErrnoCode(error);
        if (
          (errnoCode === "ENOENT" || errnoCode === "ENOTDIR") &&
          idx < IN_USE_LINK_DEPTH &&
          (await pruneOrReportPlantedEntry(projectPluginsDir(), inUseLinkPath)) === "pruned"
        )
          continue;
        logForDebugging(`Failed to write ${IN_USE_LINKS_DIR} marker: ${e}: ${error}`);
        return false;
      }
  }
  let h = join(e, IN_USE_MARKER_FILE);
  let y = join(h, String(process.pid));
  let S = s ? parseVersionCachePath(e, projectPluginCacheDir()) : null;
  if (s && S) {
    let L;
    try {
      L = await classifyMarkerPath(h);
    } catch (error) {
      logForDebugging(`Not writing an ${IN_USE_MARKER_FILE} marker: ${h} cannot be examined: ${error}`);
      return false;
    }
    if (L === "refused" || L === "junk") {
      if (!(await removeNonDirectoryMarker(h))) {
        logForDebugging(`Not writing an ${IN_USE_MARKER_FILE} marker: ${h} is not a directory of markers`);
        return false;
      }
    }
  }
  let w =
    s && S
      ? STORAGE_SPACES.pluginCache(S.marketplace, S.plugin, S.version, [
          IN_USE_MARKER_FILE,
          String(process.pid),
        ])
      : undefined;
  registerOwnInUseMarker(
    pluginRegistry,
    y,
    s && w
      ? {
          storageV5: n,
          key: w,
        }
      : undefined,
  );
  try {
    if (s && w) {
      let L = await inUseMarkerPayload();
      let G = {
        mode: 438 & ~process.umask(),
      };
      let q = await n.write(w, L, G);
      if (!q.ok) {
        await removeLinkOrDir(y);
        q = await n.write(w, L, G);
      }
      if (!q.ok) {
        logForDebugging(`Failed to write ${IN_USE_MARKER_FILE} marker: ${e}: ${formatStorageError(q.error)}`);
        return false;
      }
      return true;
    }
    try {
      await mkdir(h);
    } catch (error) {
      let errnoCode = getErrnoCode(error);
      if (errnoCode === "ENOENT")
        await mkdir(h, {
          recursive: true,
        });
      else if (errnoCode !== "EEXIST") throw error;
      else {
        let q = await classifyMarkerPath(h);
        if (q === "absent")
          await mkdir(h, {
            recursive: true,
          });
        else if (q !== "directory") {
          if (!(await removeNonDirectoryMarker(h))) {
            logForDebugging(`Not writing ${IN_USE_MARKER_FILE} marker through a non-directory: ${e}`);
            return false;
          }
          await mkdir(h, {
            recursive: true,
          });
        }
      }
    }
    await removeLinkOrDir(y);
    await writeFileAtomic_2(y, await inUseMarkerPayload());
    return true;
  } catch (error) {
    logForDebugging(`Failed to write ${IN_USE_MARKER_FILE} marker: ${e}: ${error}`);
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
  let h = isStorageV5Enabled() && storage !== undefined;
  let y = h ? parseVersionCachePath(versionDir, projectPluginCacheDir()) : null;
  try {
    let S = await classifyMarkerPath(markerDir);
    if (S === "absent" || (h && S === "junk")) {
      forgetOwnInUseMarker(getPluginRegistry(), markerPath);
      return true;
    }
    if (S === "refused" || S === "junk") return false;
    if (h && y) {
      let w = await storage.delete(
        STORAGE_SPACES.pluginCache(y.marketplace, y.plugin, y.version, [
          IN_USE_MARKER_FILE,
          String(process.pid),
        ]),
      );
      if (!w.ok) {
        logForDebugging(
          `Failed to remove ${IN_USE_MARKER_FILE} marker: ${versionDir}: ${formatStorageError(w.error)}`,
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
async function sweepInUseMarkers(e, version) {
  if (e.length === 0) return;
  let filePath = join(projectPluginsDir(), LAST_INUSE_SWEEP_FILE);
  let s = isStorageV5Enabled() && version !== undefined;
  let h = s ? registryStorageSpace("inUseSweep", projectPluginsDir()) : null;
  if (s && h) {
    let S = await version.statMeta(h);
    if (S.ok && isSweepRecent(S.value.mtimeMs)) return;
  } else
    try {
      let S = await lstat(filePath);
      if (S.isFile() && isSweepRecent(S.mtimeMs)) return;
    } catch {}
  let settled = await Promise.allSettled(e.map((S) => isPluginVersionInUse(S, undefined, version)));
  for (let [S, w] of settled.entries())
    if (w.status === "rejected")
      logForDebugging(`Failed to sweep ${IN_USE_MARKER_FILE}: ${e[S]}: ${w.reason}`);
  if (s && h) {
    let S = await version.write(h, new Date().toISOString(), {
      publishDiscipline: "inPlace",
    });
    if (!S.ok)
      try {
        await removeLinkOrDir(filePath);
        S = await version.write(h, new Date().toISOString(), {
          publishDiscipline: "inPlace",
        });
      } catch (error) {
        logForDebugging(`Failed to clear a non-regular ${LAST_INUSE_SWEEP_FILE}: ${error}`);
      }
    if (!S.ok) logForDebugging(`Failed to stamp ${LAST_INUSE_SWEEP_FILE}: ${formatStorageError(S.error)}`);
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
  let s = join(versionDir, IN_USE_MARKER_FILE);
  let h = isStorageV5Enabled() ? storage : undefined;
  let y = h !== undefined ? parseVersionCachePath(versionDir, projectPluginCacheDir()) : null;
  if (h === undefined || y === null) return readInUseMarker(s, options);
  let S;
  try {
    S = await classifyMarkerPath(s);
  } catch (error) {
    if (isFsInaccessible(error)) return options?.refusedCountsAsLive ?? true;
    throw error;
  }
  if (S === "junk") {
    await removeNonDirectoryMarker(s);
    return false;
  }
  if (S === "refused") {
    await removeNonDirectoryMarker(s);
    return options?.refusedCountsAsLive ?? true;
  }
  return listInUseMarkers(h, y, options);
}
//@ chunk-e6aww6q8.js:623640-623959 placement
/**
 * 删除非目录形式的 in_use 标记，失败时视为仍在使用。
 */
async function removeNonDirectoryMarker(e) {
  try {
    if ((await removePathEntry(e)) === "directory") return true;
    logForDebugging(
      `Removed a non-directory ${IN_USE_MARKER_FILE} at ${e}; the version reads unpinned until a session marks it again`,
      {
        level: "warn",
      },
    );
    return true;
  } catch (error) {
    logForDebugging(
      `Could not remove a non-directory ${IN_USE_MARKER_FILE} at ${e} (${errorMessage(error)}); treating the version as in use`,
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
function isStaleInUseMarker(e) {
  if (typeof e !== "number" || !Number.isFinite(e)) return false;
  return !isFreshTimestamp_2(e, STALE_INUSE_MARKER_MS);
}
//@ chunk-e6aww6q8.js:624060-624205 placement
async function removeStaleEntry(e, n) {
  try {
    let r = n ?? (await lstat(e)).mtimeMs;
    if (!isStaleInUseMarker(r)) return false;
    if ((await removePathEntry(e)) === "directory") await removeDirectoryTreeNoFollow_2(e);
    return true;
  } catch {
    return false;
  }
}
//@ chunk-e6aww6q8.js:624205-625019 placement
async function readInUseMarker(e, options) {
  let r;
  try {
    let h = await classifyMarkerPath(e);
    if (h === "refused") {
      await removeNonDirectoryMarker(e);
      return options?.refusedCountsAsLive ?? true;
    }
    if (h === "junk") {
      await removeNonDirectoryMarker(e);
      return false;
    }
    if (h !== "directory") return false;
    r = await readdir(e);
  } catch (error) {
    if (isENOENT(error)) return false;
    if (isFsInaccessible(error)) return options?.refusedCountsAsLive ?? true;
    throw error;
  }
  let s = false;
  for (let h of r) {
    let y = join(e, h);
    if (atomicMoveToInstallPath_2(h)) {
      if (await removeStaleEntry(y)) continue;
      s = true;
      continue;
    }
    let S;
    let w;
    try {
      let G = await lstat(y);
      w = G.mtimeMs;
      if (G.isFile() && G.size <= MAX_IN_USE_MARKER_BYTES) S = await readFile(y, "utf-8");
    } catch (error) {
      if (isENOENT(error)) continue;
      logForDebugging(`In-use marker ${y} could not be read (${errorMessage(error)}); treating it as live`, {
        level: "warn",
      });
      s = true;
      continue;
    }
    if (S === "") {
      if (await removeStaleEntry(y, w)) continue;
      s = true;
      continue;
    }
    let L = InUseMarkerSchema().safeParse(safeParseJSON(S, false));
    if (options?.excludeSelf && L.success && L.data.pid === process.pid) continue;
    if (L.success && (await isMarkerOwnerAlive(L.data, options?.requireIdentity))) {
      s = true;
      continue;
    }
    await removeDirectoryTreeNoFollow_2(y);
  }
  return s;
}
//@ chunk-e6aww6q8.js:625019-626391 placement
/**
 * 列出插件缓存中的使用中标记。
 */
async function listInUseMarkers(e, n, options) {
  let s = (G) => STORAGE_SPACES.pluginCache(n.marketplace, n.plugin, n.version, [IN_USE_MARKER_FILE, G]);
  let h = [];
  let y = new Map();
  let S;
  do {
    let G = await e.listEntries(
      {
        namespace: "pluginCache",
        marketplace: n.marketplace,
        plugin: n.plugin,
        version: n.version,
        relPath: [IN_USE_MARKER_FILE],
      },
      {
        cursor: S,
        skipKeyStats: true,
        skipScopeStats: true,
      },
    );
    if (!G.ok) {
      let telemetryCode = "telemetryCode" in G.error ? G.error.telemetryCode : undefined;
      let merged = Object.assign(Error("in-use listing failed"), {
        ...(telemetryCode !== undefined && {
          code: telemetryCode,
        }),
      });
      if (telemetryCode === "ENOENT" || telemetryCode === "ENOTDIR") return false;
      if (isFsInaccessible(merged)) return options?.refusedCountsAsLive ?? true;
      throw merged;
    }
    for (let item of G.value.items) {
      if (item.kind !== "key" || item.key.namespace !== "pluginCache") continue;
      let last = item.key.relPath.at(-1);
      if (last !== undefined) {
        h.push(last);
        y.set(last, item.mtimeMs);
      }
    }
    S = G.value.cursor;
  } while (S);
  let any = h.some((G) => atomicMoveToInstallPath_2(G) && !isStaleInUseMarker(y.get(G)));
  let filtered = h.filter((G) => !atomicMoveToInstallPath_2(G));
  for (let G = 0; G < filtered.length; G += MAX_INUSE_READ_BATCH) {
    let sliced = filtered.slice(G, G + MAX_INUSE_READ_BATCH);
    let markerItems = await readMarkerItems(e, sliced.map(s));
    for (let [Se, ke] of sliced.entries()) {
      let we = markerItems[Se] ?? "unreadable";
      if (we === "unreadable") {
        any = true;
        continue;
      }
      let Ee = we === "absent" ? undefined : we;
      let raw =
        Ee !== undefined && Buffer.byteLength(Ee.raw, "utf8") > MAX_IN_USE_MARKER_BYTES ? undefined : Ee?.raw;
      if (raw === "") {
        if (!isStaleInUseMarker(Ee?.mtimeMs)) {
          any = true;
          continue;
        }
        if (
          !(await e.delete(s(ke)).then(
            (We) => We.ok,
            () => false,
          ))
        )
          any = true;
        continue;
      }
      let Ie = InUseMarkerSchema().safeParse(safeParseJSON(raw, false));
      if (options?.excludeSelf && Ie.success && Ie.data.pid === process.pid) continue;
      if (Ie.success && (await isMarkerOwnerAlive(Ie.data, options?.requireIdentity))) {
        any = true;
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
var MAX_INUSE_READ_BATCH = 64;
//@ chunk-e6aww6q8.js:626402-626761 placement
/**
 * 批量读存储项，失败退回逐项读。
 */
async function readMarkerItems(e, n) {
  let r = (y) => Buffer.from(y).toString("utf8");
  let s = await e.read(n);
  if (s.ok)
    return s.value.items.map((item) =>
      item.found
        ? {
            raw: r(item.value),
            mtimeMs: item.mtimeMs,
          }
        : "absent",
    );
  let h = [];
  for (let y of n) {
    let S = await e.read([y]);
    h.push(
      !S.ok
        ? "unreadable"
        : S.value.items[0]?.found
          ? {
              raw: r(S.value.items[0].value),
              mtimeMs: S.value.items[0].mtimeMs,
            }
          : "absent",
    );
  }
  return h;
}
//@ chunk-e6aww6q8.js:626761-626936 placement
async function releaseMarkersOutside(e, n, r) {
  let s = new Set();
  for (let ownInUseMarkerPath of getPluginRegistry().ownInUseMarkerPaths) {
    let y = dirname(dirname(ownInUseMarkerPath));
    if (isSubpathOf(e, y, false) && !n.has(y)) s.add(y);
  }
  await Promise.all(Array.from(s, (h) => removeInUseMarker(h, r)));
}
//@ chunk-e6aww6q8.js:626936-627074 placement
async function isMarkerOwnerAlive(e, requireIdentity) {
  if (!(e.pid === 1 || isProcessRunning_2(e.pid))) return false;
  let r = procIdentityOf(e);
  if (requireIdentity) return r !== undefined && (await provenSameProcessAsync(e.pid, r)) === true;
  return isSameProcessAsync(e.pid, r);
}
export {
  writeInUseMarker,
  removeInUseMarker,
  isPluginVersionInUse,
  isSymlinkOrFalse,
  sweepInUseMarkers,
  releaseMarkersOutside,
};
