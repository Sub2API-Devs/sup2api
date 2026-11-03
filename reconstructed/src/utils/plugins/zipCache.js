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
} from "path";
import {
  rm as rm_2,
  rm as rm_2_2,
  rm as rm_3,
  rm as rm_4,
  rm as rm_5,
  rm as rm_6,
  rm as rm_7,
  rm as rm_8,
  rm as rm_9,
  rm as rm_10,
  rm as rm_11,
  rm as rm_12,
  rm as rm_13,
  rm as rm_14,
  rm as rm_15,
  rm as rm_16,
  rm as rm_17,
  rm as rm_18,
  rm as rm_19,
  rm as rm_20,
  rm as rm_21,
  rm as rm_22,
  rm as rm_23,
  rm as rm_24,
  rm as rm_25,
  rm as rm_26,
  rm as rm_27,
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
  stat,
  stat as stat_2,
  stat as stat_3,
  stat as stat_4,
  stat as stat_5,
  stat as stat_6,
  stat as stat_7,
  stat as stat_8,
  stat as stat_9,
  stat as stat_10,
  stat as stat_11,
  stat as stat_12,
  stat as stat_13,
  stat as stat_14,
  stat as stat_15,
  stat as stat_16,
  stat as stat_17,
  stat as stat_18,
  stat as stat_19,
  stat as stat_20,
  stat as stat_21,
  stat as stat_22,
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
  readFile,
  readFile as readFile_2,
  readFile as readFile_3,
  readFile as readFile_4,
  readFile as readFile_5,
  readFile as readFile_6,
  readFile as readFile_7,
  readFile as readFile_8,
  readFile as readFile_9,
  readFile as readFile_10,
  readFile as readFile_11,
  readFile as readFile_12,
  readFile as readFile_13,
  readFile as readFile_14,
  readFile as readFile_15,
  readFile as readFile_16,
  readFile as readFile_17,
  readFile as readFile_18,
  readFile as readFile_19,
  writeFile,
  writeFile as writeFile_2,
  writeFile as writeFile_3,
  writeFile as writeFile_4,
  writeFile as writeFile_5,
  writeFile as writeFile_6,
  writeFile as writeFile_7,
  writeFile as writeFile_8,
  writeFile as writeFile_9,
  writeFile as writeFile_10,
  writeFile as writeFile_11,
  writeFile as writeFile_12,
  writeFile as writeFile_13,
  writeFile as writeFile_14,
  writeFile as writeFile_15,
  writeFile as writeFile_16,
  writeFile as writeFile_17,
  writeFile as writeFile_18,
  chmod,
  chmod as chmod_2,
  chmod as chmod_3,
  chmod as chmod_4,
  chmod as chmod_5,
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
  mkdir,
  mkdir as mkdir_2,
  mkdir as mkdir_3,
  mkdir as mkdir_4,
  mkdir as mkdir_5,
  mkdir as mkdir_6,
  mkdir as mkdir_7,
  mkdir as mkdir_8,
  mkdir as mkdir_9,
  mkdir as mkdir_10,
  mkdir as mkdir_11,
  mkdir as mkdir_12,
  mkdir as mkdir_13,
  mkdir as mkdir_14,
  mkdir as mkdir_15,
  mkdir as mkdir_16,
  mkdir as mkdir_17,
  mkdir as mkdir_18,
  mkdir as mkdir_19,
  mkdir as mkdir_20,
  mkdir as mkdir_21,
  mkdir as mkdir_22,
  mkdir as mkdir_23,
  mkdir as mkdir_24,
  mkdir as mkdir_25,
  mkdir as mkdir_26,
} from "fs/promises";
import {
  randomBytes,
  randomBytes as randomBytes_2,
  randomBytes as randomBytes_3,
  randomBytes as randomBytes_4,
  randomBytes as randomBytes_5,
  randomBytes as randomBytes_6,
  randomBytes as randomBytes_7,
  randomBytes as randomBytes_8,
  randomBytes as randomBytes_9,
  randomBytes as randomBytes_10,
  randomBytes as randomBytes_11,
  randomBytes as randomBytes_12,
  randomBytes as randomBytes_13,
  randomBytes as randomBytes_14,
} from "crypto";
import {
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
} from "fs";
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
import { removeDirectoryTreeNoFollow } from "../fsRemove.js";
import { errorMessage, getErrnoCode } from "../errors.js";
import { limitConcurrency } from "../concurrencyLimit.js";
import { isGitDirName } from "./syncedItems.js";
import { execFileNoThrow } from "../execFileNoThrow.js";
import { logForDiagnosticsNoPII } from "../diagLogs.js";
import { findPluginRootInExtracted } from "./commandSource.js";
import { containsGitDirectory } from "./fileIdentity.js";

/**
 * 是否启用插件 zip 缓存（CLAUDE_CODE_PLUGIN_USE_ZIP_CACHE）：插件以 .zip 存于 CLAUDE_CODE_PLUGIN_CACHE_DIR，会话启动时解压到临时目录。
 */
//@ chunk-e6aww6q8.js:608388-608444 fingerprint = isPluginZipCacheEnabled (1)
function isPluginZipCacheEnabled() {
  return env.CLAUDE_CODE_PLUGIN_USE_ZIP_CACHE;
}
/**
 * zip 缓存模式下的 known_marketplaces.json 路径（未启用时抛错）。
 */
//@ chunk-e6aww6q8.js:608534-608653 fingerprint = getZipCacheKnownMarketplacesPath (1)
function getZipCacheKnownMarketplacesPath() {
  let cachePath = getZipCacheDirOverride();
  if (!cachePath) throw Error("Plugin zip cache is not enabled");
  return join_12(cachePath, "known_marketplaces.json");
}
/**
 * zip 缓存模式下的 marketplaces 目录。
 */
//@ chunk-e6aww6q8.js:608653-608761 fingerprint = getZipCacheMarketplacesDir (1)
function getZipCacheMarketplacesDir() {
  let cachePath = getZipCacheDirOverride();
  if (!cachePath) throw Error("Plugin zip cache is not enabled");
  return join_12(cachePath, "marketplaces");
}
/**
 * zip 缓存模式下的 plugins 目录。
 */
//@ chunk-e6aww6q8.js:608761-608864 fingerprint = getZipCachePluginsDir (1)
function getZipCachePluginsDir() {
  let cachePath = getZipCacheDirOverride();
  if (!cachePath) throw Error("Plugin zip cache is not enabled");
  return join_12(cachePath, "plugins");
}
//@ chunk-e6aww6q8.js:608864-608878 layout
var CLI = "cli";
/**
 * 会话结束时删除本会话的插件解压临时目录。
 */
//@ chunk-e6aww6q8.js:608878-609642 fingerprint = cleanupSessionPluginCache (0.455)
class cleanupSessionPluginCache {
  keyOf = () => CLI;
  statesByKey = new Map();
  useKey(e) {
    this.keyOf = e;
  }
  key() {
    return this.keyOf();
  }
  existing(e) {
    return this.statesByKey.get(e);
  }
  current() {
    let keyOf = this.keyOf(),
      n = this.statesByKey.get(keyOf);
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
    return (
      this.statesByKey.set(keyOf, r),
      (r.cleanupHandle = registerCleanup(async () => {
        if (r.path)
          try {
            (await rm_6(r.path, { recursive: !0, force: !0 }),
              logForDebugging(`Cleaned up session plugin cache at ${r.path}`));
          } catch (error) {
            logForDebugging(`Failed to clean up session plugin cache: ${error}`);
          }
      })),
      r
    );
  }
  forget(e) {
    let n = this.statesByKey.get(e);
    return (this.statesByKey.delete(e), n);
  }
  reset() {
    for (let e of this.statesByKey.values()) e.cleanupHandle?.();
    (this.statesByKey.clear(), (this.keyOf = () => CLI));
  }
}
//@ chunk-e6aww6q8.js:609642-609669 layout
var sessionPluginCacheByHost = new HostScoped(() => new cleanupSessionPluginCache());
//@ chunk-e6aww6q8.js:609669-609708 layout
function getSessionPluginCacheEntry() {
  return sessionPluginCacheByHost.of(getRootSession().host);
}
/**
 * 当前宿主会话缓存里的 zip 解压记录表。
 */
//@ chunk-e6aww6q8.js:609708-609758 layout
function getZipExtractionState() {
  return getSessionPluginCacheEntry().current().extractions;
}
/**
 * 取（必要时创建）本会话的插件解压临时目录 claude-plugin-session-<随机>，每个宿主一个。
 */
//@ chunk-e6aww6q8.js:609758-610040 fingerprint = getSessionPluginCachePath (0.949)
async function getSessionPluginCachePath() {
  let e = getSessionPluginCacheEntry().current();
  if (e.path) return e.path;
  if (!e.promise)
    e.promise = (async () => {
      let suffix = randomBytes_4(8).toString("hex"),
        dir = join_12(tmpdir(), `claude-plugin-session-${suffix}`);
      return (
        await getFsImplementation().mkdir(dir, { mode: 448 }),
        (e.path = dir),
        logForDebugging(`Created session plugin cache at ${dir}`),
        dir
      );
    })();
  return e.promise;
}
/**
 * 已存在的会话插件缓存路径（未创建为 null）。
 */
//@ chunk-e6aww6q8.js:610040-610106 layout
function getExistingSessionPluginCachePath() {
  let e = getSessionPluginCacheEntry();
  return e.existing(e.key())?.path ?? null;
}
/**
 * 创建父目录后原子写文件。
 */
//@ chunk-e6aww6q8.js:610106-610169 layout
async function writeFileEnsuringDir(e, n) {
  (await getFsImplementation().mkdir(dirname_8(e)), await writeFileAtomic_2(e, n));
}
/**
 * 把目录打成 zip（跳过 .git 与符号链接环，保留文件权限位）。
 */
//@ chunk-e6aww6q8.js:610169-610381 fingerprint = createZipFromDirectory (0.867)
async function createZipFromDirectory(sourceDir) {
  let files = {};
  await collectFilesForZip(sourceDir, "", files, new Set());
  let { zipSync: zipSync } = await import("./chunk-9t1jcaah.js"),
    zipData = zipSync(files, { level: 6 });
  return (
    logForDebugging(
      `Created ZIP from ${sourceDir}: ${Object.keys(files).length} files, ${zipData.length} bytes`,
    ),
    zipData
  );
}
//@ chunk-e6aww6q8.js:610381-610959 fingerprint = collectFilesForZip (1)
async function collectFilesForZip(baseDir, relativePath, files, visited) {
  let h = relativePath ? join_12(baseDir, relativePath) : baseDir,
    y;
  try {
    y = await readdir_4(h);
  } catch {
    return;
  }
  try {
    let dirStat = await stat_4(h, { bigint: !0 });
    if (dirStat.dev !== 0n || dirStat.ino !== 0n) {
      let key = `${dirStat.dev}:${dirStat.ino}`;
      if (visited.has(key)) {
        logForDebugging(`Skipping symlink cycle at ${h}`);
        return;
      }
      visited.add(key);
    }
  } catch {
    return;
  }
  for (let entry of y) {
    if (entry === ".git") continue;
    let fullPath = join_12(h, entry),
      L = relativePath ? `${relativePath}/${entry}` : entry,
      G;
    try {
      G = await lstat_5(fullPath);
    } catch {
      continue;
    }
    if (G.isSymbolicLink()) continue;
    if (G.isDirectory()) await collectFilesForZip(baseDir, L, files, visited);
    else if (G.isFile())
      try {
        let targetStat = await readFile_4(fullPath);
        files[L] = [new Uint8Array(targetStat), { os: 3, attrs: (G.mode & 65535) << 16 }];
      } catch (error) {
        logForDebugging(`Failed to read file for zip: ${L}: ${error}`);
      }
  }
}
/**
 * 解压 zip 到目录（含路径安全校验与权限位恢复）。
 */
//@ chunk-e6aww6q8.js:611035-611425 fingerprint = extractZipToDirectory (0.814)
async function extractZipToDirectory(e, n, r) {
  let files = await unzipFile(e),
    modes = parseZipModes(e);
  await getFsImplementation().mkdir(n);
  let y = [];
  for (let [S, w] of Object.entries(files)) {
    if (r?.skipEntry?.(S)) continue;
    if (S.endsWith("/")) {
      await getFsImplementation().mkdir(join_12(n, S));
      continue;
    }
    let fullPath = join_12(n, S);
    (await getFsImplementation().mkdir(dirname_8(fullPath)), await writeFile_2(fullPath, w), y.push(S));
    let mode = modes[S];
    if (mode && mode & 73) await chmod_2(fullPath, mode & DEFAULT_FILE_MODE).catch(() => {});
  }
  return (logForDebugging(`Extracted ZIP to ${n}: ${Object.keys(files).length} entries`), y);
}
//@ chunk-e6aww6q8.js:611425-611593 placement
async function publishDirectoryAsZip(e, n) {
  let r = await createZipFromDirectory(e);
  (await writeFileEnsuringDir(n, r),
    await removeDirectoryTreeNoFollow(e).catch((s) => {
      logForDebugging(`Failed to remove ${e} after publishing its zip archive: ${errorMessage(s)}`, {
        level: "warn",
      });
    }));
}
/**
 * zip 缓存模式支持的市场来源：github、git、url、settings。
 */
//@ chunk-e6aww6q8.js:611687-611762 fingerprint = isMarketplaceSourceSupportedByZipCache (1)
function isMarketplaceSourceSupportedByZipCache(source) {
  return ["github", "git", "url", "settings"].includes(source.source);
}
//@ chunk-e6aww6q8.js:612828-612846 placement
var oho = 536870912;
//@ chunk-e6aww6q8.js:612846-612951 placement
function makeTempZipPath() {
  return join_11(tmpdir(), `claude-plugin-${process.pid}-${Math.random().toString(36).slice(2)}.zip`);
}
//@ chunk-e6aww6q8.js:612951-612985 placement
var aLt = 256,
  lLt = 16,
  rho = 128,
  sho = 32;
//@ chunk-e6aww6q8.js:612985-613279 placement
async function stripGroupOtherWrite(e, n, r) {
  if ((n & 18) === 0) return !0;
  let s = await open_3(
    e,
    constants_4.O_RDONLY |
      constants_4.O_NOFOLLOW |
      constants_4.O_NONBLOCK |
      (r ? constants_4.O_DIRECTORY : 0),
  );
  try {
    let stats = await s.stat();
    if (!(r ? stats.isDirectory() : stats.isFile() && stats.nlink === 1)) return !1;
    if ((stats.mode & 18) !== 0) await s.chmod(stats.mode & DEFAULT_FILE_MODE);
    return !0;
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
      (this.inFlight++, (this.peak = Math.max(this.peak, this.inFlight)));
      try {
        return await stripGroupOtherWrite(n, r, s);
      } finally {
        this.inFlight--;
      }
    });
  }
}
//@ chunk-e6aww6q8.js:613483-613515 placement
var aho = new HostScoped(() => new ModeMasker(rho));
//@ chunk-e6aww6q8.js:613515-613545 placement
function lho() {
  return onProcessRootHost(aho);
}
/**
 * 检查压缩包条目（过大、被篡改、符号链接、保留名）。
 */
//@ chunk-e6aww6q8.js:613545-614489 placement
async function checkZipEntry(e, n = oho) {
  let r = 0,
    s,
    h = limitConcurrency(sho, lho().maskEntry);
  async function y(L) {
    for (let G = 0; G < L.length && !s; G += aLt) {
      let sliced = L.slice(G, G + aLt),
        results = await Promise.all(sliced.map(async (ke) => ({ path: ke, stat: await lstat_4(ke) })));
      for (let { stat: stat } of results) {
        if (((r += stat.size), r > n)) {
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
            results.map(({ path: path, stat: stat }) =>
              (stat.mode & 18) === 0 ? !0 : h(path, stat.mode, !1),
            ),
          )
        ).includes(!1)
      ) {
        s = "tampered";
        return;
      }
    }
  }
  async function S(L) {
    for (let G = 0; G < L.length && !s; G += lLt) await Promise.all(L.slice(G, G + lLt).map(w));
  }
  async function w(L) {
    if (s) return;
    let [G, q] = await Promise.all([lstat_4(L), readdir_3(L, { withFileTypes: !0 })]);
    if (!G.isDirectory() || !(await h(L, G.mode, !0))) {
      s = "tampered";
      return;
    }
    let Z = [],
      Se = [];
    for (let ke of q) {
      if (ke.isSymbolicLink()) {
        s = "symlink";
        return;
      }
      if (isGitDirName(ke.name)) {
        s = "reserved";
        return;
      }
      if (ke.isDirectory()) Z.push(join_11(L, ke.name));
      else Se.push(join_11(L, ke.name));
    }
    if (s) return;
    await Promise.all([y(Se), S(Z)]);
  }
  return (await w(e), s ?? "ok");
}
//@ chunk-e6aww6q8.js:614489-614665 placement
async function chmodTreeOwnerOnly(e) {
  await chmod(e, 448);
  for (let n of await readdir_3(e, { encoding: "buffer" })) {
    let buffer = Buffer.concat([e, Buffer.from(sep_9), n]);
    if ((await lstat_4(buffer)).isDirectory()) await chmodTreeOwnerOnly(buffer);
  }
}
//@ chunk-e6aww6q8.js:614665-614880 placement
async function removeTreeForcing(e) {
  try {
    await rm_5(e, { recursive: !0, force: !0 });
  } catch (error) {
    let r = getErrnoCode(error);
    if ((r !== "EACCES" && r !== "EPERM") || !(await lstat_4(e)).isDirectory()) throw error;
    (await chmodTreeOwnerOnly(Buffer.from(e)), await rm_5(e, { recursive: !0, force: !0 }));
  }
}
/**
 * 解压插件缓存压缩包。
 */
//@ chunk-e6aww6q8.js:614880-615725 placement
async function unzipPluginCache(e, n) {
  (await removeTreeForcing(n),
    await mkdir_6(dirname_7(n), { recursive: !0 }),
    await mkdir_6(n, { mode: 448 }));
  let r = join_11(n, `unzip-${randomBytes_3(8).toString("hex")}`);
  await mkdir_6(r, { mode: 448 });
  let s = await execFileNoThrow("unzip", ["-q", "-o", e, "-d", r], {
      useCwd: !0,
      stdin: "ignore",
      stdout: "ignore",
      stderr: "ignore",
      waitForExitAfterKill: !0,
    }),
    h = s.code === 0 ? await checkZipEntry(r).catch(() => "walk_failed") : "unzip_failed",
    y = r;
  if (h !== "ok")
    (logForDiagnosticsNoPII("info", "plugins_sync_unzip_fallback", { code: s.code, verdict: h }),
      await removeTreeForcing(r).catch((w) => {
        logForDiagnosticsNoPII("info", "plugins_sync_unzip_dir_remove_failed", { code: getErrnoCode(w) });
      }),
      (y = join_11(n, `fallback-${randomBytes_3(8).toString("hex")}`)),
      await readAndUnzipFile(e, y, { skipEntry: (w) => w.split(/[\\/]/).some(isGitDirName) }));
  else
    try {
      await chmod(r, (await stat_3(dirname_7(n))).mode & DEFAULT_FILE_MODE);
    } catch (error) {
      logForDiagnosticsNoPII("info", "plugins_sync_staging_reopen_failed", { code: getErrnoCode(error) });
    }
  let S = await findPluginRootInExtracted(y);
  if (await containsGitDirectory(S)) return { ok: !1, reason: "bare_repo_layout" };
  return { ok: !0, root: S };
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
