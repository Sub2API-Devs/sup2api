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
  existing(e) {
    return this.statesByKey.get(e);
  }
  current() {
    let e = this.keyOf();
    let n = this.statesByKey.get(e);
    if (n) return n;
    let r = {
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
    this.statesByKey.set(e, r);
    r.cleanupHandle = registerCleanup(async () => {
      if (r.path)
        try {
          await rm_2(r.path, {
            recursive: true,
            force: true,
          });
          logForDebugging(`Cleaned up session plugin cache at ${r.path}`);
        } catch (error) {
          logForDebugging(`Failed to clean up session plugin cache: ${error}`);
        }
    });
    return r;
  }
  forget(e) {
    let n = this.statesByKey.get(e);
    this.statesByKey.delete(e);
    return n;
  }
  reset() {
    for (let e of this.statesByKey.values()) e.cleanupHandle?.();
    this.statesByKey.clear();
    this.keyOf = () => CLI_TEMP_SUBDIR;
  }
}
//@ chunk-e6aww6q8.js:609642-609669 layout
var sessionPluginCacheByHost = new HostScoped(() => new cleanupSessionPluginCache());
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
  let e = getSessionPluginCacheEntry().current();
  if (e.path) return e.path;
  if (!e.promise)
    e.promise = (async () => {
      let suffix = randomBytes(8).toString("hex");
      let dir = join(tmpdir(), `claude-plugin-session-${suffix}`);
      await getFsImplementation().mkdir(dir, {
        mode: 448,
      });
      e.path = dir;
      logForDebugging(`Created session plugin cache at ${dir}`);
      return dir;
    })();
  return e.promise;
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
async function writeFileEnsuringDir(e, n) {
  await getFsImplementation().mkdir(dirname(e));
  await writeFileAtomic_2(e, n);
}
//@ chunk-e6aww6q8.js:610169-610381 fingerprint = createZipFromDirectory (0.867)
/**
 * 把目录打成 zip（跳过 .git 与符号链接环，保留文件权限位）。
 */
async function createZipFromDirectory(sourceDir) {
  let files = {};
  await collectFilesForZip(sourceDir, "", files, new Set());
  let { zipSync } = await import("./chunk-9t1jcaah.js");
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
async function extractZipToDirectory(e, targetDir, r) {
  let files = await unzipFile(e);
  let modes = parseZipModes(e);
  await getFsImplementation().mkdir(targetDir);
  let y = [];
  for (let [relPath, data] of Object.entries(files)) {
    if (r?.skipEntry?.(relPath)) continue;
    if (relPath.endsWith("/")) {
      await getFsImplementation().mkdir(join(targetDir, relPath));
      continue;
    }
    let fullPath = join(targetDir, relPath);
    await getFsImplementation().mkdir(dirname(fullPath));
    await writeFile(fullPath, data);
    y.push(relPath);
    let mode = modes[relPath];
    if (mode && mode & 73) await chmod(fullPath, mode & DEFAULT_FILE_MODE).catch(() => {});
  }
  logForDebugging(`Extracted ZIP to ${targetDir}: ${Object.keys(files).length} entries`);
  return y;
}
//@ chunk-e6aww6q8.js:611425-611593 placement
async function publishDirectoryAsZip(sourceDir, n) {
  let zipFromDirectory = await createZipFromDirectory(sourceDir);
  await writeFileEnsuringDir(n, zipFromDirectory);
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
async function stripGroupOtherWrite(e, n, r) {
  if ((n & 18) === 0) return true;
  let s = await open(
    e,
    constants.O_RDONLY | constants.O_NOFOLLOW | constants.O_NONBLOCK | (r ? constants.O_DIRECTORY : 0),
  );
  try {
    let stats = await s.stat();
    if (!(r ? stats.isDirectory() : stats.isFile() && stats.nlink === 1)) return false;
    if ((stats.mode & 18) !== 0) await s.chmod(stats.mode & DEFAULT_FILE_MODE);
    return true;
  } finally {
    await s.close();
  }
}
//@ chunk-e6aww6q8.js:613279-613483 placement
class ModeMasker {
  inFlight = 0;
  peak = 0;
  maskEntry;
  constructor(e) {
    this.maskEntry = limitConcurrency(e, async (n, r, s) => {
      this.inFlight++;
      this.peak = Math.max(this.peak, this.inFlight);
      try {
        return await stripGroupOtherWrite(n, r, s);
      } finally {
        this.inFlight--;
      }
    });
  }
}
//@ chunk-e6aww6q8.js:613483-613515 placement
var modeMasker = new HostScoped(() => new ModeMasker(MAX_ZIP_PATH_LENGTH));
//@ chunk-e6aww6q8.js:613515-613545 placement
function currentModeMasker() {
  return onProcessRootHost(modeMasker);
}
//@ chunk-e6aww6q8.js:613545-614489 placement
/**
 * 检查压缩包条目（过大、被篡改、符号链接、保留名）。
 */
async function checkZipEntry(e, n = MAX_ZIP_ENTRY_SPILL_BYTES) {
  let r = 0;
  let s;
  let h = limitConcurrency(MAX_ZIP_FILE_MODE, currentModeMasker().maskEntry);
  async function y(L) {
    for (let G = 0; G < L.length && !s; G += MAX_ZIP_ENTRIES) {
      let sliced = L.slice(G, G + MAX_ZIP_ENTRIES);
      let results = await Promise.all(
        sliced.map(async (ke) => ({
          path: ke,
          stat: await lstat(ke),
        })),
      );
      for (let { stat } of results) {
        r += stat.size;
        if (r > n) {
          s = "oversize";
          return;
        }
        if (!stat.isFile()) {
          s = "tampered";
          return;
        }
      }
      if (
        (
          await Promise.all(
            results.map(({ path, stat }) => ((stat.mode & 18) === 0 ? true : h(path, stat.mode, false))),
          )
        ).includes(false)
      ) {
        s = "tampered";
        return;
      }
    }
  }
  async function S(L) {
    for (let G = 0; G < L.length && !s; G += MAX_ZIP_PATH_SEGMENTS)
      await Promise.all(L.slice(G, G + MAX_ZIP_PATH_SEGMENTS).map(w));
  }
  async function w(L) {
    if (s) return;
    let [G, q] = await Promise.all([
      lstat(L),
      readdir(L, {
        withFileTypes: true,
      }),
    ]);
    if (!G.isDirectory() || !(await h(L, G.mode, true))) {
      s = "tampered";
      return;
    }
    let Z = [];
    let Se = [];
    for (let ke of q) {
      if (ke.isSymbolicLink()) {
        s = "symlink";
        return;
      }
      if (isGitDirName(ke.name)) {
        s = "reserved";
        return;
      }
      if (ke.isDirectory()) Z.push(join(L, ke.name));
      else Se.push(join(L, ke.name));
    }
    if (s) return;
    await Promise.all([y(Se), S(Z)]);
  }
  await w(e);
  return s ?? "ok";
}
//@ chunk-e6aww6q8.js:614489-614665 placement
async function chmodTreeOwnerOnly(e) {
  await chmod(e, 448);
  for (let n of await readdir(e, {
    encoding: "buffer",
  })) {
    let buffer = Buffer.concat([e, Buffer.from(sep), n]);
    if ((await lstat(buffer)).isDirectory()) await chmodTreeOwnerOnly(buffer);
  }
}
//@ chunk-e6aww6q8.js:614665-614880 placement
async function removeTreeForcing(e) {
  try {
    await rm_2(e, {
      recursive: true,
      force: true,
    });
  } catch (error) {
    let errnoCode = getErrnoCode(error);
    if ((errnoCode !== "EACCES" && errnoCode !== "EPERM") || !(await lstat(e)).isDirectory()) throw error;
    await chmodTreeOwnerOnly(Buffer.from(e));
    await rm_2(e, {
      recursive: true,
      force: true,
    });
  }
}
//@ chunk-e6aww6q8.js:614880-615725 placement
/**
 * 解压插件缓存压缩包。
 */
async function unzipPluginCache(e, n) {
  await removeTreeForcing(n);
  await mkdir(dirname(n), {
    recursive: true,
  });
  await mkdir(n, {
    mode: 448,
  });
  let r = join(n, `unzip-${randomBytes(8).toString("hex")}`);
  await mkdir(r, {
    mode: 448,
  });
  let s = await execFileNoThrow("unzip", ["-q", "-o", e, "-d", r], {
    useCwd: true,
    stdin: "ignore",
    stdout: "ignore",
    stderr: "ignore",
    waitForExitAfterKill: true,
  });
  let h = s.code === 0 ? await checkZipEntry(r).catch(() => "walk_failed") : "unzip_failed";
  let y = r;
  if (h !== "ok") {
    logForDiagnosticsNoPII("info", "plugins_sync_unzip_fallback", {
      code: s.code,
      verdict: h,
    });
    await removeTreeForcing(r).catch((error) => {
      logForDiagnosticsNoPII("info", "plugins_sync_unzip_dir_remove_failed", {
        code: getErrnoCode(error),
      });
    });
    y = join(n, `fallback-${randomBytes(8).toString("hex")}`);
    await readAndUnzipFile(e, y, {
      skipEntry: (w) => w.split(/[\\/]/).some(isGitDirName),
    });
  } else
    try {
      await chmod(r, (await stat(dirname(n))).mode & DEFAULT_FILE_MODE);
    } catch (error) {
      logForDiagnosticsNoPII("info", "plugins_sync_staging_reopen_failed", {
        code: getErrnoCode(error),
      });
    }
  let pluginRootInExtracted = await findPluginRootInExtracted(y);
  if (await containsGitDirectory(pluginRootInExtracted))
    return {
      ok: false,
      reason: "bare_repo_layout",
    };
  return {
    ok: true,
    root: pluginRootInExtracted,
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
