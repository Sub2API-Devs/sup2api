/**
 * utils/plugins/zipCache.ts
 *
 * 插件 zip 缓存模式（CLAUDE_CODE_PLUGIN_USE_ZIP_CACHE）：zip 缓存目录、会话解压临时目录、目录打包与解压。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/utils/plugins/zipCache.ts
 * pieces: chunk-e6aww6q8.js (28)
 * attribution: fingerprint 10, layout 6, placement 12
 */
import { join, dirname, sep } from "path";
import { rm as rm_2, readdir, stat, lstat, readFile, writeFile, chmod, open, mkdir } from "fs/promises";
import { randomBytes } from "crypto";
import { constants } from "fs";
import { env } from "../env.js";
import { getZipCacheDirOverride } from "./pluginDirectories.js";
import { registerCleanup } from "../cleanupRegistry.js";
import { logForDebugging } from "../debug.js";
import { HostScoped } from "../hostScoped.js";
import { getRootSession, onProcessRootHost } from "../../bootstrap/state.js";
import { tmpdir } from "../tempDir.js";
import { getFsImplementation } from "../fsOperations.js";
import { writeFileAtomic as writeFileAtomic_2 } from "../atomicPublishWrite.js";
import { unzipFile, parseZipModes, DEFAULT_FILE_MODE, readAndUnzipFile } from "../dxt/zip.js";
import { removeDirectoryTreeNoFollow as removeDirectoryTreeNoFollow_2 } from "../fsRemove.js";
import { errorMessage, getErrnoCode } from "../errors.js";
import { limitConcurrency } from "../concurrencyLimit.js";
import { isGitDirName } from "./syncedItems.js";
import { execFileNoThrow } from "../execFileNoThrow.js";
import { logForDiagnosticsNoPII } from "../diagLogs.js";
import { findPluginRootInExtracted } from "./commandSource.js";
import { containsGitDirectory } from "./fileIdentity.js";
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-e6aww6q8.js:608388-608444 fingerprint = isPluginZipCacheEnabled (1)
/**
 * 是否启用插件 zip 缓存（CLAUDE_CODE_PLUGIN_USE_ZIP_CACHE）：插件以 .zip 存于 CLAUDE_CODE_PLUGIN_CACHE_DIR，会话启动时解压到临时目录。
 */
function isPluginZipCacheEnabled() {
  return env.CLAUDE_CODE_PLUGIN_USE_ZIP_CACHE;
}
//@ chunk-e6aww6q8.js:608534-608653 fingerprint = getZipCacheKnownMarketplacesPath (1)
/**
 * zip 缓存模式下的 known_marketplaces.json 路径（未启用时抛错）。
 */
function getZipCacheKnownMarketplacesPath() {
  let cachePath = getZipCacheDirOverride();
  if (!cachePath) throw Error("Plugin zip cache is not enabled");
  return join(cachePath, "known_marketplaces.json");
}
//@ chunk-e6aww6q8.js:608653-608761 fingerprint = getZipCacheMarketplacesDir (1)
/**
 * zip 缓存模式下的 marketplaces 目录。
 */
function getZipCacheMarketplacesDir() {
  let cachePath = getZipCacheDirOverride();
  if (!cachePath) throw Error("Plugin zip cache is not enabled");
  return join(cachePath, "marketplaces");
}
//@ chunk-e6aww6q8.js:608761-608864 fingerprint = getZipCachePluginsDir (1)
/**
 * zip 缓存模式下的 plugins 目录。
 */
function getZipCachePluginsDir() {
  let cachePath = getZipCacheDirOverride();
  if (!cachePath) throw Error("Plugin zip cache is not enabled");
  return join(cachePath, "plugins");
}
//@ chunk-e6aww6q8.js:608864-608878 layout
var CLI_TEMP_SUBDIR = "cli";
//@ chunk-e6aww6q8.js:608878-609642 fingerprint = cleanupSessionPluginCache (0.455)
/**
 * 会话结束时删除本会话的插件解压临时目录。
 */
class cleanupSessionPluginCache {
  keyOf = () => CLI_TEMP_SUBDIR;
  statesByKey = new Map();
  useKey(keyOf) {
    this.keyOf = keyOf;
  }
  key() {
    return this.keyOf();
  }
  existing(key) {
    return this.statesByKey.get(key);
  }
  current() {
    let key = this.keyOf();
    let state = this.statesByKey.get(key);
    if (state) return state;
    let newState = {
      path: null,
      promise: null,
      extractions: {
        byDir: new Map(),
        inFlight: new Map(),
        previews: new Map(),
        pruning: new Map(),
        nextSeq: 0,
      },
      cleanupHandle: null,
    };
    this.statesByKey.set(key, newState);
    newState.cleanupHandle = registerCleanup(async () => {
      if (newState.path)
        try {
          await rm_2(newState.path, {
            recursive: true,
            force: true,
          });
          logForDebugging(`Cleaned up session plugin cache at ${newState.path}`);
        } catch (error) {
          logForDebugging(`Failed to clean up session plugin cache: ${error}`);
        }
    });
    return newState;
  }
  forget(key) {
    let state = this.statesByKey.get(key);
    this.statesByKey.delete(key);
    return state;
  }
  reset() {
    for (let state of this.statesByKey.values()) state.cleanupHandle?.();
    this.statesByKey.clear();
    this.keyOf = () => CLI_TEMP_SUBDIR;
  }
}
//@ chunk-e6aww6q8.js:609642-609669 layout
var sessionPluginCacheByHost; // deferred: uses cleanupSessionPluginCache of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-e6aww6q8.js:609642", () => {
  sessionPluginCacheByHost = new HostScoped(() => new cleanupSessionPluginCache());
});
//@ chunk-e6aww6q8.js:609669-609708 layout
function getSessionPluginCacheEntry() {
  return sessionPluginCacheByHost.of(getRootSession().host);
}
//@ chunk-e6aww6q8.js:609708-609758 layout
/**
 * 当前宿主会话缓存里的 zip 解压记录表。
 */
function getZipExtractionState() {
  return getSessionPluginCacheEntry().current().extractions;
}
//@ chunk-e6aww6q8.js:609758-610040 fingerprint = getSessionPluginCachePath (0.949)
/**
 * 取（必要时创建）本会话的插件解压临时目录 claude-plugin-session-<随机>，每个宿主一个。
 */
async function getSessionPluginCachePath() {
  let entry = getSessionPluginCacheEntry().current();
  if (entry.path) return entry.path;
  if (!entry.promise)
    entry.promise = (async () => {
      let suffix = randomBytes(8).toString("hex");
      let dir = join(tmpdir(), `claude-plugin-session-${suffix}`);
      await getFsImplementation().mkdir(dir, {
        mode: 448,
      });
      entry.path = dir;
      logForDebugging(`Created session plugin cache at ${dir}`);
      return dir;
    })();
  return entry.promise;
}
//@ chunk-e6aww6q8.js:610040-610106 layout
/**
 * 已存在的会话插件缓存路径（未创建为 null）。
 */
function getExistingSessionPluginCachePath() {
  let sessionPluginCacheEntry = getSessionPluginCacheEntry();
  return sessionPluginCacheEntry.existing(sessionPluginCacheEntry.key())?.path ?? null;
}
//@ chunk-e6aww6q8.js:610106-610169 layout
/**
 * 创建父目录后原子写文件。
 */
async function writeFileEnsuringDir(filePath, data) {
  await getFsImplementation().mkdir(dirname(filePath));
  await writeFileAtomic_2(filePath, data);
}
//@ chunk-e6aww6q8.js:610169-610381 fingerprint = createZipFromDirectory (0.867)
/**
 * 把目录打成 zip（跳过 .git 与符号链接环，保留文件权限位）。
 */
async function createZipFromDirectory(sourceDir) {
  let files = {};
  await collectFilesForZip(sourceDir, "", files, new Set());
  let { zipSync } = await import("../../../vendor/fflate/esm/index.mjs");
  let zipData = zipSync(files, {
    level: 6,
  });
  logForDebugging(
    `Created ZIP from ${sourceDir}: ${Object.keys(files).length} files, ${zipData.length} bytes`,
  );
  return zipData;
}
//@ chunk-e6aww6q8.js:610381-610959 fingerprint = collectFilesForZip (1)
async function collectFilesForZip(baseDir, relativePath, files, visited) {
  let currentDir = relativePath ? join(baseDir, relativePath) : baseDir;
  let entries;
  try {
    entries = await readdir(currentDir);
  } catch {
    return;
  }
  try {
    let dirStat = await stat(currentDir, {
      bigint: true,
    });
    if (dirStat.dev !== 0n || dirStat.ino !== 0n) {
      let key = `${dirStat.dev}:${dirStat.ino}`;
      if (visited.has(key)) {
        logForDebugging(`Skipping symlink cycle at ${currentDir}`);
        return;
      }
      visited.add(key);
    }
  } catch {
    return;
  }
  for (let entry of entries) {
    if (entry === ".git") continue;
    let fullPath = join(currentDir, entry);
    let relPath = relativePath ? `${relativePath}/${entry}` : entry;
    let fileStat;
    try {
      fileStat = await lstat(fullPath);
    } catch {
      continue;
    }
    if (fileStat.isSymbolicLink()) continue;
    if (fileStat.isDirectory()) await collectFilesForZip(baseDir, relPath, files, visited);
    else if (fileStat.isFile())
      try {
        let content = await readFile(fullPath);
        files[relPath] = [
          new Uint8Array(content),
          {
            os: 3,
            attrs: (fileStat.mode & 65535) << 16,
          },
        ];
      } catch (error) {
        logForDebugging(`Failed to read file for zip: ${relPath}: ${error}`);
      }
  }
}
//@ chunk-e6aww6q8.js:611035-611425 fingerprint = extractZipToDirectory (0.814)
/**
 * 解压 zip 到目录（含路径安全校验与权限位恢复）。
 */
async function extractZipToDirectory(zipPath, targetDir, options) {
  let files = await unzipFile(zipPath);
  let modes = parseZipModes(zipPath);
  await getFsImplementation().mkdir(targetDir);
  let writtenPaths = [];
  for (let [relPath, data] of Object.entries(files)) {
    if (options?.skipEntry?.(relPath)) continue;
    if (relPath.endsWith("/")) {
      await getFsImplementation().mkdir(join(targetDir, relPath));
      continue;
    }
    let fullPath = join(targetDir, relPath);
    await getFsImplementation().mkdir(dirname(fullPath));
    await writeFile(fullPath, data);
    writtenPaths.push(relPath);
    let mode = modes[relPath];
    if (mode && mode & 73) await chmod(fullPath, mode & DEFAULT_FILE_MODE).catch(() => {});
  }
  logForDebugging(`Extracted ZIP to ${targetDir}: ${Object.keys(files).length} entries`);
  return writtenPaths;
}
//@ chunk-e6aww6q8.js:611425-611593 placement
async function publishDirectoryAsZip(sourceDir, zipPath) {
  let zipFromDirectory = await createZipFromDirectory(sourceDir);
  await writeFileEnsuringDir(zipPath, zipFromDirectory);
  await removeDirectoryTreeNoFollow_2(sourceDir).catch((error) => {
    logForDebugging(
      `Failed to remove ${sourceDir} after publishing its zip archive: ${errorMessage(error)}`,
      {
        level: "warn",
      },
    );
  });
}
//@ chunk-e6aww6q8.js:611687-611762 fingerprint = isMarketplaceSourceSupportedByZipCache (1)
/**
 * zip 缓存模式支持的市场来源：github、git、url、settings。
 */
function isMarketplaceSourceSupportedByZipCache(source) {
  return ["github", "git", "url", "settings"].includes(source.source);
}
//@ chunk-e6aww6q8.js:612828-612846 placement
var MAX_ZIP_ENTRY_SPILL_BYTES = 536870912;
//@ chunk-e6aww6q8.js:612846-612951 placement
function makeTempZipPath() {
  return join(tmpdir(), `claude-plugin-${process.pid}-${Math.random().toString(36).slice(2)}.zip`);
}
//@ chunk-e6aww6q8.js:612951-612985 placement
var MAX_ZIP_ENTRIES = 256;
var MAX_ZIP_PATH_SEGMENTS = 16;
var MAX_ZIP_PATH_LENGTH = 128;
var MAX_ZIP_FILE_MODE = 32;
//@ chunk-e6aww6q8.js:612985-613279 placement
async function stripGroupOtherWrite(filePath, mode, isDirectory) {
  if ((mode & 18) === 0) return true;
  let handle = await open(
    filePath,
    constants.O_RDONLY |
      constants.O_NOFOLLOW |
      constants.O_NONBLOCK |
      (isDirectory ? constants.O_DIRECTORY : 0),
  );
  try {
    let stats = await handle.stat();
    if (!(isDirectory ? stats.isDirectory() : stats.isFile() && stats.nlink === 1)) return false;
    if ((stats.mode & 18) !== 0) await handle.chmod(stats.mode & DEFAULT_FILE_MODE);
    return true;
  } finally {
    await handle.close();
  }
}
//@ chunk-e6aww6q8.js:613279-613483 placement
class ModeMasker {
  inFlight = 0;
  peak = 0;
  maskEntry;
  constructor(concurrency) {
    this.maskEntry = limitConcurrency(concurrency, async (filePath, mode, isDirectory) => {
      this.inFlight++;
      this.peak = Math.max(this.peak, this.inFlight);
      try {
        return await stripGroupOtherWrite(filePath, mode, isDirectory);
      } finally {
        this.inFlight--;
      }
    });
  }
}
//@ chunk-e6aww6q8.js:613483-613515 placement
var modeMasker; // deferred: uses ModeMasker of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-e6aww6q8.js:613483", () => {
  modeMasker = new HostScoped(() => new ModeMasker(MAX_ZIP_PATH_LENGTH));
});
//@ chunk-e6aww6q8.js:613515-613545 placement
function currentModeMasker() {
  return onProcessRootHost(modeMasker);
}
//@ chunk-e6aww6q8.js:613545-614489 placement
/**
 * 检查压缩包条目（过大、被篡改、符号链接、保留名）。
 */
async function checkZipEntry(rootDir, maxBytes = MAX_ZIP_ENTRY_SPILL_BYTES) {
  let totalBytes = 0;
  let failure;
  let maskEntry = limitConcurrency(MAX_ZIP_FILE_MODE, currentModeMasker().maskEntry);
  async function checkFiles(paths) {
    for (let index = 0; index < paths.length && !failure; index += MAX_ZIP_ENTRIES) {
      let sliced = paths.slice(index, index + MAX_ZIP_ENTRIES);
      let results = await Promise.all(
        sliced.map(async (path) => ({
          path,
          stat: await lstat(path),
        })),
      );
      for (let { stat } of results) {
        totalBytes += stat.size;
        if (totalBytes > maxBytes) {
          failure = "oversize";
          return;
        }
        if (!stat.isFile()) {
          failure = "tampered";
          return;
        }
      }
      if (
        (
          await Promise.all(
            results.map(({ path, stat }) =>
              (stat.mode & 18) === 0 ? true : maskEntry(path, stat.mode, false),
            ),
          )
        ).includes(false)
      ) {
        failure = "tampered";
        return;
      }
    }
  }
  async function checkDirs(paths) {
    for (let index = 0; index < paths.length && !failure; index += MAX_ZIP_PATH_SEGMENTS)
      await Promise.all(paths.slice(index, index + MAX_ZIP_PATH_SEGMENTS).map(checkDir));
  }
  async function checkDir(dirPath) {
    if (failure) return;
    let [dirStats, dirents] = await Promise.all([
      lstat(dirPath),
      readdir(dirPath, {
        withFileTypes: true,
      }),
    ]);
    if (!dirStats.isDirectory() || !(await maskEntry(dirPath, dirStats.mode, true))) {
      failure = "tampered";
      return;
    }
    let childDirs = [];
    let childFiles = [];
    for (let dirent of dirents) {
      if (dirent.isSymbolicLink()) {
        failure = "symlink";
        return;
      }
      if (isGitDirName(dirent.name)) {
        failure = "reserved";
        return;
      }
      if (dirent.isDirectory()) childDirs.push(join(dirPath, dirent.name));
      else childFiles.push(join(dirPath, dirent.name));
    }
    if (failure) return;
    await Promise.all([checkFiles(childFiles), checkDirs(childDirs)]);
  }
  await checkDir(rootDir);
  return failure ?? "ok";
}
//@ chunk-e6aww6q8.js:614489-614665 placement
async function chmodTreeOwnerOnly(dirPath) {
  await chmod(dirPath, 448);
  for (let nameBuffer of await readdir(dirPath, {
    encoding: "buffer",
  })) {
    let buffer = Buffer.concat([dirPath, Buffer.from(sep), nameBuffer]);
    if ((await lstat(buffer)).isDirectory()) await chmodTreeOwnerOnly(buffer);
  }
}
//@ chunk-e6aww6q8.js:614665-614880 placement
async function removeTreeForcing(dirPath) {
  try {
    await rm_2(dirPath, {
      recursive: true,
      force: true,
    });
  } catch (error) {
    let errnoCode = getErrnoCode(error);
    if ((errnoCode !== "EACCES" && errnoCode !== "EPERM") || !(await lstat(dirPath)).isDirectory())
      throw error;
    await chmodTreeOwnerOnly(Buffer.from(dirPath));
    await rm_2(dirPath, {
      recursive: true,
      force: true,
    });
  }
}
//@ chunk-e6aww6q8.js:614880-615725 placement
/**
 * 解压插件缓存压缩包。
 */
async function unzipPluginCache(zipPath, targetDir) {
  await removeTreeForcing(targetDir);
  await mkdir(dirname(targetDir), {
    recursive: true,
  });
  await mkdir(targetDir, {
    mode: 448,
  });
  let stagingDir = join(targetDir, `unzip-${randomBytes(8).toString("hex")}`);
  await mkdir(stagingDir, {
    mode: 448,
  });
  let unzipResult = await execFileNoThrow("unzip", ["-q", "-o", zipPath, "-d", stagingDir], {
    useCwd: true,
    stdin: "ignore",
    stdout: "ignore",
    stderr: "ignore",
    waitForExitAfterKill: true,
  });
  let verdict =
    unzipResult.code === 0 ? await checkZipEntry(stagingDir).catch(() => "walk_failed") : "unzip_failed";
  let extractRoot = stagingDir;
  if (verdict !== "ok") {
    logForDiagnosticsNoPII("info", "plugins_sync_unzip_fallback", {
      code: unzipResult.code,
      verdict,
    });
    await removeTreeForcing(stagingDir).catch((error) => {
      logForDiagnosticsNoPII("info", "plugins_sync_unzip_dir_remove_failed", {
        code: getErrnoCode(error),
      });
    });
    extractRoot = join(targetDir, `fallback-${randomBytes(8).toString("hex")}`);
    await readAndUnzipFile(zipPath, extractRoot, {
      skipEntry: (relPath) => relPath.split(/[\\/]/).some(isGitDirName),
    });
  } else
    try {
      await chmod(stagingDir, (await stat(dirname(targetDir))).mode & DEFAULT_FILE_MODE);
    } catch (error) {
      logForDiagnosticsNoPII("info", "plugins_sync_staging_reopen_failed", {
        code: getErrnoCode(error),
      });
    }
  let rootDir = await findPluginRootInExtracted(extractRoot);
  if (await containsGitDirectory(rootDir))
    return {
      ok: false,
      reason: "bare_repo_layout",
    };
  return {
    ok: true,
    root: rootDir,
  };
}
export {
  isPluginZipCacheEnabled,
  publishDirectoryAsZip,
  extractZipToDirectory,
  getZipExtractionState,
  getSessionPluginCachePath,
  makeTempZipPath,
  unzipPluginCache,
  getZipCacheKnownMarketplacesPath,
  writeFileEnsuringDir,
  getZipCacheMarketplacesDir,
  getZipCachePluginsDir,
  isMarketplaceSourceSupportedByZipCache,
  getExistingSessionPluginCachePath,
};
