/**
 * utils/plugins/pluginBinaryAssets.ts
 *
 * 2.1.316 新增：插件二进制资源
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-e6aww6q8.js (39), chunk-f3qhjfah.js (1)
 * attribution: placement 40
 */
import { join } from "path";
import {
  lstat,
  mkdir,
  realpath,
  rm as rm_2,
  open,
  utimes,
  copyFile,
  link,
  rename,
  readdir,
} from "fs/promises";
import { createHash, randomBytes } from "crypto";
import { constants } from "fs";
import {
  MAX_PLUGIN_BINARY_BYTES,
  binaryBaseNameForTarget,
  readOnlyNoFollowFlags,
} from "../platformTargets.js";
import { env } from "../env.js";
import { getFeatureValue_CACHED_MAY_BE_STALE } from "../../services/analytics/growthbook.js";
import { projectPluginsDir, projectPluginCacheDir } from "./pluginCachePaths.js";
import { isStorageV5Enabled } from "../hoverRest.js";
import { PluginIdSchema, BINARY_FETCH_CONCURRENCY } from "./schemas.js";
import { isOfficialMarketplaceName_3, parsePluginIdentifier } from "./pluginIdentifier.js";
import {
  sanitizeErrnoForTelemetry,
  sanitizeErrorName as sanitizeErrorName_2,
  isENOENT,
  getErrnoCode,
  TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS,
  errnoShapedCode,
} from "../errors.js";
import { logForDebugging } from "../debug.js";
import { logFeatureBad, logFeatureSad, logFeatureOk } from "../../services/analytics/featureTelemetry.js";
import { getPluginVersionFromManifest } from "./installedPluginsManager.js";
import { isSupportedPlatform } from "../../commands/desktop/index.js";
import { storageErrorCode, formatStorageError, TOOLARGE, SOURCETOOLARGE } from "../storage/storageErrors.js";
import { isSubpathOf } from "../pathPrefix.js";
import { versionCacheStorageSpace } from "./pluginDirectories.js";
import { hasLinkedAncestorBelow } from "./pluginCacheMaterialize.js";
import { STORAGE_SPACES, isSameStorageSpace } from "../storage/storageSpaces.js";
import { getPlatform } from "../platform.js";
import { WRITE_LOCK_TTL_MS } from "../../services/memorySync/syncFiles.js";
import { sleep } from "../sleep.js";
import { apiClient } from "../../services/routines/routinesApi.js";
import { OAUTH_BETA_HEADER } from "../../constants/oauth.js";
import { LINKMISDIRECTED, LINKUNVERIFIED } from "../fsSafety/hardenedRead.js";
import { ATOMIC_WRITE_ERRNOS } from "./safeCopy.js";
import { getClaudeConfigDir } from "../envUtils.js";

//@ chunk-e6aww6q8.js:4369039-4369171 placement
var ASSET_LOG_PREFIX = "[pluginBinaryAssets]";
var ASSET_CACHE = "asset-cache";
var ASSET_FETCH_TIMEOUT_MS = 120000;
var ASSET_TOTAL_BUDGET_MS = 300000;
var ASSET_STALL_TIMEOUT_MS = 30000;
var MAX_ASSET_BYTES = MAX_PLUGIN_BINARY_BYTES;
var ASSET_RETRY_DELAYS_MS = [1000, 2000];
var ASSET_CACHE_TTL_MS = 2592000000;
var TEMP_FILE_TTL_MS = 86400000;
//@ chunk-e6aww6q8.js:4369171-4369295 placement
class PluginAssetFetchError extends Error {
  code;
  status;
  constructor(message, code, status) {
    super(message);
    this.name = "PluginAssetFetchError";
    this.code = code;
    this.status = status;
  }
}
//@ chunk-e6aww6q8.js:4369295-4369393 placement
function pluginBinaryAssetsEnabled() {
  return (
    env.CLAUDE_CODE_PLUGIN_BINARY_ASSETS ||
    getFeatureValue_CACHED_MAY_BE_STALE("tengu_plugin_binary_assets", false) === true
  );
}
//@ chunk-e6aww6q8.js:4369393-4369572 placement
async function provisionBinaryAssets(e, n, r) {
  let s = r?.assetCacheDir ?? join(projectPluginsDir(), ASSET_CACHE);
  let storageV5 = r?.storageV5;
  let y = isStorageV5Enabled() && storageV5 !== undefined ? assetCacheNamespace(s) : null;
  try {
    await provisionPluginBinaryAssets(e, n, s, y, r);
  } finally {
    await sweepStaleTempFiles(s, storageV5, y).catch(() => {
      return;
    });
  }
}
//@ chunk-e6aww6q8.js:4369572-4369651 placement
/**
 * shouldInstallBinaryAssets：官方市场插件且功能开启。
 */
function shouldInstallBinaryAssets(e) {
  return (
    PluginIdSchema().safeParse(e).success &&
    isOfficialMarketplaceName_3(parsePluginIdentifier(e).marketplace) &&
    pluginBinaryAssetsEnabled()
  );
}
//@ chunk-e6aww6q8.js:4369651-4373603 placement
/**
 * 为插件准备二进制资源：下载、校验并放到插件目录的 bin 下。
 */
async function provisionPluginBinaryAssets(e, n, r, s, h) {
  if (!shouldInstallBinaryAssets(n)) return;
  let startTime = performance.now();
  let expectedCount = 0;
  let w = 0;
  let L = 0;
  let G = 0;
  let q = 0;
  let Z = 0;
  let Se = 0;
  let ke;
  let we;
  let Ee;
  let Ae = false;
  function Ie(error, We) {
    Ee ??=
      error instanceof PluginAssetFetchError
        ? error.code
        : (sanitizeErrnoForTelemetry(error) ?? sanitizeErrorName_2(error) ?? "unknown");
    logForDebugging(
      `${ASSET_LOG_PREFIX} ${n}: ${We}: ${error instanceof Error ? error.message : String(error)}`,
      {
        level: "warn",
      },
    );
  }
  try {
    let storageV5 = h?.storageV5;
    let We = isStorageV5Enabled() && storageV5 !== undefined ? await pluginCacheBinPath(e) : null;
    let ze = s !== null ? We : null;
    if (!(await isDirectoryPresent(e, storageV5, We))) {
      logFeatureBad("plugin_binary_assets", "plugin_root_not_dir", {
        expected_count: 0,
      });
      logForDebugging(
        `${ASSET_LOG_PREFIX} ${n}: plugin root is not a real directory; refusing to provision binaries`,
        {
          level: "warn",
        },
      );
      return;
    }
    let pluginVersionFromManifest = await getPluginVersionFromManifest(e, storageV5, We);
    if (!pluginVersionFromManifest) return;
    Ae = true;
    let entries = Object.entries(pluginVersionFromManifest);
    expectedCount = entries.length;
    let nt = join(e, "bin");
    let binDir = await ensureBinDir(nt, storageV5, We);
    if (binDir !== "ok") {
      Ee = binDir;
      return;
    }
    if (!(await resolveContainedBinDir(nt, e, storageV5, We))) {
      Ee = "bin_outside_plugin";
      return;
    }
    let Et = [];
    let yt = [];
    let gt = [];
    for (let [Yt, qt] of entries) {
      if (performance.now() - startTime > ASSET_TOTAL_BUDGET_MS) {
        Ee ??= "pass_deadline_exceeded";
        break;
      }
      try {
        let containedBinDir = await resolveContainedBinDir(nt, e, storageV5, We);
        if (!containedBinDir) {
          Ee ??= "bin_dir_race";
          continue;
        }
        let rn = join(containedBinDir, Yt);
        let pn = We === null ? undefined : pluginBinaryStorageSpace(We, Yt);
        switch (
          await verifyPlacedAsset(
            rn,
            qt.sha256,
            {
              ensureMode: 493,
              guestWritable: true,
            },
            storageV5,
            pn,
          )
        ) {
          case "match":
            L++;
            gt.push([Yt, qt]);
            continue;
          case "absent":
            Et.push([Yt, qt]);
            continue;
          case "mismatch":
          case "not_regular": {
            we ??= "asset_present_digest_mismatch";
            let containedBinDir = await resolveContainedBinDir(nt, e, storageV5, We);
            if (!containedBinDir) {
              Ee ??= "bin_dir_race";
              continue;
            }
            try {
              await removeBinEntry(containedBinDir, Yt, storageV5, We);
            } catch (error) {
              logForDebugging(
                `${ASSET_LOG_PREFIX} ${n}: failed to remove mismatched bin/${Yt}: ${error instanceof Error ? error.message : String(error)}`,
                {
                  level: "warn",
                },
              );
              yt.push([Yt, qt]);
              continue;
            }
            Z++;
            logForDebugging(
              `${ASSET_LOG_PREFIX} ${n}: removed bin/${Yt} \u2014 it is not the artifact pinned by the manifest`,
              {
                level: "warn",
              },
            );
            yt.push([Yt, qt]);
            continue;
          }
          case "unreadable":
            Ee ??= "asset_unverifiable";
            Et.push([Yt, qt]);
            continue;
          case "unverifiable_windows":
            Et.push([Yt, qt]);
            continue;
        }
      } catch (error) {
        Ie(error, `failed to verify bin/${Yt}`);
      }
    }
    let At = [...yt, ...Et];
    {
      let sliced = At.slice(0, BINARY_FETCH_CONCURRENCY);
      if (At.length > sliced.length)
        logForDebugging(
          `${ASSET_LOG_PREFIX} ${At.length} binaries need fetching; only the first ${BINARY_FETCH_CONCURRENCY} will be`,
          {
            level: "warn",
          },
        );
      if (sliced.length > 0)
        try {
          await ensurePluginDirExists(r, storageV5, s);
        } catch (error) {
          Ie(error, "failed to create the asset cache dir");
          sliced = [];
        }
      for (let [qt, Zt] of sliced) {
        if (performance.now() - startTime > ASSET_TOTAL_BUDGET_MS) {
          Ee ??= "pass_deadline_exceeded";
          break;
        }
        try {
          let { cachePath, cacheHit } = await fetchAssetToCache(
            Zt.sha256,
            r,
            storageV5,
            s,
            h?.retryDelaysMs ?? ASSET_RETRY_DELAYS_MS,
            startTime + ASSET_TOTAL_BUDGET_MS,
            h?.downloadTimeoutMs ?? ASSET_FETCH_TIMEOUT_MS,
            h?.credentials,
          );
          if (cacheHit) G++;
          else q++;
          let containedBinDir = await resolveContainedBinDir(nt, e, storageV5, We);
          if (!containedBinDir) {
            Ee ??= "bin_dir_race";
            continue;
          }
          await placePluginBinaryAsset(cachePath, r, containedBinDir, qt, Zt.sha256, storageV5, ze);
          w++;
          gt.push([qt, Zt]);
        } catch (error) {
          if (error instanceof PluginAssetFetchError && error.code.startsWith("skipped_")) {
            ke = error.code;
            break;
          }
          Ie(error, `failed to provision ${qt}`);
        }
      }
    }
    let It = isSupportedPlatform();
    if (It !== undefined) {
      let Yt = new Map();
      for (let [Zt] of entries) {
        let rn = binaryBaseNameForTarget(Zt, It);
        if (rn !== undefined) Yt.set(rn, (Yt.get(rn) ?? 0) + 1);
      }
      let startTime = performance.now();
      for (let [Zt, rn] of gt) {
        if (performance.now() - startTime > ASSET_STALL_TIMEOUT_MS) {
          Ee ??= "pass_deadline_exceeded";
          break;
        }
        let pn = binaryBaseNameForTarget(Zt, It);
        if (pn === undefined || Object.hasOwn(pluginVersionFromManifest, pn)) continue;
        if ((Yt.get(pn) ?? 0) > 1) {
          logForDebugging(
            `${ASSET_LOG_PREFIX} ${n}: multiple declared entries derive bin/${pn}; refusing to pick one`,
            {
              level: "warn",
            },
          );
          we ??= "asset_bare_name_collision";
          continue;
        }
        try {
          let containedBinDir = await resolveContainedBinDir(nt, e, storageV5, We);
          if (!containedBinDir) {
            Ee ??= "bin_dir_race";
            continue;
          }
          let hn = await linkAssetIntoBin(containedBinDir, Zt, pn, rn.sha256, storageV5, We);
          if (hn === "placed") {
            Se++;
            continue;
          }
          if (hn === "exists") continue;
          if (hn === "failed_created") {
            let containedBinDir = await resolveContainedBinDir(nt, e, storageV5, We);
            if (containedBinDir)
              await removeBinEntry(containedBinDir, pn, storageV5, We).catch(() => {
                return;
              });
            else Ee ??= "bin_dir_race";
          }
          if (hn === "failed_created" || hn === "refused_source") we ??= "asset_bare_place_failed";
          else Ee ??= "asset_bare_place_env_failed";
          logForDebugging(`${ASSET_LOG_PREFIX} ${n}: bare placement bin/${pn} failed (${hn}); not placed`, {
            level: "warn",
          });
        } catch (error) {
          Ie(error, `failed to place bin/${pn}`);
        }
      }
    }
  } catch (error) {
    Ie(error, "binary asset provisioning failed");
  } finally {
    if (Ae) {
      let Me = {
        expected_count: expectedCount,
        placed_count: w,
        already_present_count: L,
        cache_hit_count: G,
        download_count: q,
        mismatch_removed_count: Z,
        bare_placed_count: Se,
        duration_ms: Math.round(performance.now() - startTime),
      };
      let We = we ?? Ee;
      if (We !== undefined) {
        if (w + L > 0) logFeatureSad("plugin_binary_assets", We, Me);
        else logFeatureBad("plugin_binary_assets", We, Me);
      } else if (ke !== undefined) logFeatureSad("plugin_binary_assets", ke, Me);
      else logFeatureOk("plugin_binary_assets", Me);
    }
  }
}
//@ chunk-e6aww6q8.js:4374535-4374872 placement
/**
 * 确保插件 bin 目录存在且是目录（ok/bin_not_dir/bin_uninspectable/bin_dir_race）。
 */
async function ensureBinDir(e, storageV5, r) {
  if (isStorageV5Enabled() && storageV5 !== undefined && r !== null)
    return ensureBinDirViaStorage(storageV5, r);
  let s;
  try {
    s = await lstat(e);
  } catch (error) {
    if (!isENOENT(error)) return "bin_uninspectable";
    s = null;
  }
  if (s && !s.isDirectory()) return "bin_not_dir";
  if (!s)
    try {
      await makePrivateDir(e);
    } catch (error) {
      if (getErrnoCode(error) !== "EEXIST") return "bin_uninspectable";
    }
  return (await lstat(e).catch(() => null))?.isDirectory() ? "ok" : "bin_dir_race";
}
//@ chunk-e6aww6q8.js:4374872-4375279 placement
/**
 * v5 存储下确保 bin 作用域存在。
 */
async function ensureBinDirViaStorage(e, n) {
  let r = withBinRelPath(n);
  let s = await e.scopeKind(r);
  if (!s.ok) return "bin_uninspectable";
  if (s.value.kind === "link" || s.value.kind === "other") return "bin_not_dir";
  if (s.value.kind === "absent") {
    let h = await e.ensureScope(r, {
      parent: "mustExist",
    });
    if (!h.ok) {
      let y = storageErrorCode(h.error);
      if (y !== "EEXIST" && y !== "ENOTDIR" && y !== "ELOOP" && y !== "UnexpectedAbsent")
        return "bin_uninspectable";
    }
  }
  return (await isDirectoryScope(e, r)) ? "ok" : "bin_dir_race";
}
//@ chunk-e6aww6q8.js:4375279-4375320 placement
function makePrivateDir(e) {
  return mkdir(e, {
    mode: 493,
  });
}
//@ chunk-e6aww6q8.js:4375320-4375601 placement
async function resolveContainedBinDir(e, n, storageV5, s) {
  if (isStorageV5Enabled() && storageV5 !== undefined && s !== null)
    return (await isDirectoryScope(storageV5, s)) &&
      (await isDirectoryScope(storageV5, withBinRelPath(s))) &&
      (await isBinInsideVersion(e, n, storageV5, s))
      ? e
      : null;
  if (!(await lstat(n).catch(() => null))?.isDirectory()) return null;
  if (!(await lstat(e).catch(() => null))?.isDirectory()) return null;
  return (await isBinInsideVersion(e, n, storageV5, s)) ? e : null;
}
//@ chunk-e6aww6q8.js:4375601-4375763 placement
async function isBinInsideVersion(e, n, r, s) {
  if (isStorageV5Enabled() && r !== undefined && s !== null) return true;
  try {
    let [h, y] = await Promise.all([realpath(n), realpath(e)]);
    if (!isSubpathOf(h, y, false)) return false;
  } catch {
    return false;
  }
  return true;
}
//@ chunk-e6aww6q8.js:4375763-4375890 placement
async function isDirectoryPresent(e, storageV5, r) {
  if (isStorageV5Enabled() && storageV5 !== undefined && r !== null) return isDirectoryScope(storageV5, r);
  return (await lstat(e).catch(() => null))?.isDirectory() === true;
}
//@ chunk-e6aww6q8.js:4375890-4375981 placement
async function isDirectoryScope(e, n) {
  let r = await e.scopeKind(n);
  return r.ok && r.value.kind === "directory";
}
//@ chunk-e6aww6q8.js:4375981-4376074 placement
async function pluginCacheBinPath(e) {
  let n = projectPluginCacheDir();
  let r = versionCacheStorageSpace(e, n);
  if (r === null || (await hasLinkedAncestorBelow(e, n))) return null;
  return r;
}
//@ chunk-e6aww6q8.js:4376074-4376119 placement
function withBinRelPath(e) {
  return {
    ...e,
    relPath: ["bin"],
  };
}
//@ chunk-e6aww6q8.js:4376119-4376202 placement
function pluginBinaryStorageSpace(e, n) {
  return STORAGE_SPACES.pluginCache(e.marketplace, e.plugin, e.version, ["bin", n]);
}
//@ chunk-e6aww6q8.js:4376202-4376479 placement
async function removeBinEntry(containedBinDir, n, storageV5, s) {
  if (isStorageV5Enabled() && storageV5 !== undefined && s !== null) {
    let h = await storageV5.delete(pluginBinaryStorageSpace(s, n));
    if (h.ok) return;
    if (storageErrorCode(h.error) !== "EISDIR") throw storageRemovalError(h.error);
    let y = await storageV5.deleteScope({
      ...s,
      relPath: ["bin", n],
    });
    if (!y.ok) throw storageRemovalError(y.error);
    return;
  }
  await rm_2(join(containedBinDir, n), {
    recursive: true,
    force: true,
  });
}
//@ chunk-e6aww6q8.js:4376479-4376663 placement
function storageRemovalError(error) {
  let n = storageErrorCode(error);
  return Object.assign(
    new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
      `removal through the storage interface failed: ${formatStorageError(error)}`,
      "removal through the storage interface failed",
    ),
    n !== undefined
      ? {
          code: n,
        }
      : {},
  );
}
//@ chunk-e6aww6q8.js:4376663-4377497 placement
async function verifyPlacedAsset(e, n, r, s, h) {
  if (r?.guestWritable && getPlatform() === "windows") return "unverifiable_windows";
  if (isStorageV5Enabled() && s !== undefined && h !== undefined)
    return verifyAssetDigest(s, h, n, r?.ensureMode);
  let y;
  try {
    y = await lstat(e);
  } catch (error) {
    return isENOENT(error) ? "absent" : "unreadable";
  }
  if (!y.isFile()) return "not_regular";
  let S;
  try {
    S = await open(e, readOnlyNoFollowFlags());
    let stats = await S.stat();
    if (!stats.isFile()) return "not_regular";
    if (stats.size > MAX_ASSET_BYTES) return "mismatch";
    let hash = createHash("sha256");
    for await (let G of S.createReadStream({
      autoClose: false,
    }))
      hash.update(G);
    if (hash.digest("hex") !== n) return "mismatch";
    if (r?.ensureMode !== undefined && getPlatform() !== "windows" && (stats.mode & 511) !== r.ensureMode)
      await S.chmod(r.ensureMode).catch(() => {
        return;
      });
    return "match";
  } catch (error) {
    let errnoCode = getErrnoCode(error);
    if (errnoCode === "ELOOP") return "not_regular";
    if (errnoCode === "EACCES" || errnoCode === "EPERM")
      return (y.mode & 292) === 0 ? "mismatch" : "unreadable";
    return "unreadable";
  } finally {
    await S?.close().catch(() => {
      return;
    });
  }
}
//@ chunk-e6aww6q8.js:4377497-4378170 placement
/**
 * 经存储校验资源 sha256：match/mismatch/absent/not_regular/unreadable。
 */
async function verifyAssetDigest(e, n, r, ensureMode) {
  let h = await e.digest(n, {
    algorithm: "sha256",
    maxBytes: MAX_ASSET_BYTES,
  });
  if (h.ok) {
    if (h.value.digest !== r) return "mismatch";
    let { mode, object } = h.value;
    if (ensureMode !== undefined && mode !== undefined && mode !== ensureMode && object !== undefined)
      await e
        .setMode(n, ensureMode, {
          ifObject: object,
        })
        .catch(() => {
          return;
        });
    return "match";
  }
  if (h.error.code === "NotFound") return "absent";
  let y = storageErrorCode(h.error);
  if (y === TOOLARGE) return "mismatch";
  if (y === "ELOOP" || y === "ENXIO") return "not_regular";
  let S = await e.statMeta(n);
  if (!S.ok) {
    if (S.error.code === "NotFound") return "absent";
    let L = storageErrorCode(S.error);
    return L === "ELOOP" || L === "ENXIO" ? "not_regular" : "unreadable";
  }
  let mode = S.value.mode;
  return (y === "EACCES" || y === "EPERM") && mode !== undefined && (mode & 292) === 0
    ? "mismatch"
    : "unreadable";
}
//@ chunk-e6aww6q8.js:4378170-4378673 placement
/**
 * 资源缓存中已有且摘要匹配时刷新时间并返回命中；否则清掉非文件的占位，按重试策略下载到 .partial 临时文件后改名到缓存。
 */
async function fetchAssetToCache(e, n, storageV5, s, h, y, S, credentials) {
  let L = join(n, e);
  if (isStorageV5Enabled() && storageV5 !== undefined && s !== null)
    return writePluginAsset(e, L, storageV5, h, y, S, credentials);
  if ((await verifyPlacedAsset(L, e)) === "match") {
    let date = new Date();
    await utimes(L, date, date).catch(() => {
      return;
    });
    return {
      cachePath: L,
      cacheHit: true,
    };
  }
  let G = await lstat(L).catch(() => null);
  if (G && !G.isFile())
    await rm_2(L, {
      recursive: true,
      force: true,
    });
  return retryTransientAssetFetch(h, y, async () => {
    let q = join(n, `.partial-${e}-${makePidRandomId()}`);
    try {
      await downloadAssetToFile(e, q, S, credentials);
      await renameReplacing(q, L);
      return {
        cachePath: L,
        cacheHit: false,
      };
    } catch (error) {
      await rm_2(q, {
        force: true,
      }).catch(() => {
        return;
      });
      throw error;
    }
  });
}
//@ chunk-e6aww6q8.js:4378673-4379523 placement
async function writePluginAsset(e, n, r, s, h, y, S) {
  let w = STORAGE_SPACES.pluginAssetCache(e);
  let L = await binaryAssetDigest(r, w);
  if (L.ok && L.value.digest === e) {
    await r.touch(w);
    return {
      cachePath: n,
      cacheHit: true,
    };
  }
  await dropMismatchedCacheEntry(r, w, e, n, L);
  return retryTransientAssetFetch(s, h, async () => {
    let assetStream = createAssetStream(e, y, S);
    let q = await r.writeFromStream(w, assetStream.chunks, {
      maxBytes: MAX_ASSET_BYTES,
      precondition: {
        type: "ifAbsent",
      },
      mode: 384,
      flush: true,
      acquireTimeoutMs: Math.min(y, WRITE_LOCK_TTL_MS),
    });
    if (q.ok)
      return {
        cachePath: n,
        cacheHit: false,
      };
    let Z = assetStream.failure();
    if (Z !== undefined) throw Z;
    if (q.error.code === "Failed" && q.error.telemetryCode === SOURCETOOLARGE)
      throw new PluginAssetFetchError("asset exceeds size cap", "asset_too_large");
    if (q.error.code === "AlreadyExists") {
      let Se = await binaryAssetDigest(r, w);
      if (Se.ok && Se.value.digest === e) {
        await r.touch(w);
        return {
          cachePath: n,
          cacheHit: !assetStream.started(),
        };
      }
    }
    if (q.error.code === "Unavailable" || q.error.code === "Failed")
      throw new PluginAssetFetchError(
        `asset cache store failed (${formatStorageError(q.error)})`,
        "asset_transient",
      );
    throw assetCacheStorageError(q.error);
  });
}
//@ chunk-e6aww6q8.js:4379523-4379594 placement
function binaryAssetDigest(e, n) {
  return e.digest(n, {
    algorithm: "sha256",
    maxBytes: MAX_ASSET_BYTES,
  });
}
//@ chunk-e6aww6q8.js:4379594-4380019 placement
/**
 * 存储中摘要不符的缓存项按版本条件删除。
 */
async function dropMismatchedCacheEntry(e, n, r, s, h) {
  if (h.ok) {
    let stats = await e.stat(n);
    if (!stats.ok) return;
    let w = await binaryAssetDigest(e, n);
    if (w.ok && w.value.digest !== r)
      await e.delete(n, {
        precondition: {
          type: "ifMatch",
          version: stats.value.version,
        },
      });
    return;
  }
  if (h.error.code === "NotFound") return;
  let y = storageErrorCode(h.error);
  if (y === "EISDIR" || y === "ENXIO") {
    let S = await lstat(s).catch(() => null);
    if (S && !S.isFile() && !S.isSymbolicLink())
      await rm_2(s, {
        recursive: true,
        force: true,
      });
    return;
  }
  await e.delete(n);
}
//@ chunk-e6aww6q8.js:4380019-4380240 placement
function assetCacheStorageError(error) {
  logForDebugging(`${ASSET_LOG_PREFIX} asset cache storage call failed: ${formatStorageError(error)}`, {
    level: "warn",
  });
  let n = storageErrorCode(error);
  return Object.assign(Error("asset cache storage call failed"), {
    name: "PluginAssetCacheStorageError",
    ...(n !== undefined && {
      code: n,
    }),
  });
}
//@ chunk-e6aww6q8.js:4380240-4380532 placement
async function retryTransientAssetFetch(e, n, r) {
  let s = 0;
  for (;;)
    try {
      return await r();
    } catch (error) {
      let y = error instanceof PluginAssetFetchError && error.code === "asset_transient";
      let S = e[s] ?? 0;
      if (!y || s >= e.length || performance.now() + S >= n) throw error;
      s++;
      logForDebugging(
        `${ASSET_LOG_PREFIX} transient failure fetching asset (attempt ${s}); retrying in ${S}ms`,
        {
          level: "warn",
        },
      );
      await sleep(S);
    }
}
//@ chunk-e6aww6q8.js:4380532-4380631 placement
async function ensurePluginDirExists(e, storageV5, r) {
  if (isStorageV5Enabled() && storageV5 !== undefined && r !== null) return;
  await mkdir(e, {
    recursive: true,
    mode: 448,
  });
}
//@ chunk-e6aww6q8.js:4380631-4381579 placement
/**
 * 从组织市场下载插件二进制资源。
 */
async function fetchPluginAsset(e, timeout, credentials) {
  let s = await apiClient
    .get(`/api/organizations/:orgUUID/marketplace/plugin-assets/${e}`, {
      auth: "teleport-org",
      responseType: "stream",
      timeout,
      validateStatus: () => true,
      credentials,
      headers: {
        accept: "application/octet-stream",
        "anthropic-beta": OAUTH_BETA_HEADER,
      },
    })
    .catch((error) => {
      if (getErrnoCode(error) === undefined) throw error;
      throw new PluginAssetFetchError(
        `asset fetch failed: ${error instanceof Error ? error.message : String(error)}`,
        "asset_transient",
      );
    });
  if (!s.ok) {
    let y =
      s.reason === "data-residency"
        ? "skipped_data_residency"
        : s.reason === "essential-traffic-only"
          ? "skipped_essential_traffic_only"
          : "skipped_no_claude_ai_auth";
    throw new PluginAssetFetchError(`asset fetch skipped (${y})`, y);
  }
  let { status } = s;
  if (status !== 200) {
    s.data.destroy();
    if (status === 404) throw new PluginAssetFetchError("asset not found (404)", "asset_not_found", status);
    if (status === 410) throw new PluginAssetFetchError("asset denylisted (410)", "asset_denylisted", status);
    if (status >= 500)
      throw new PluginAssetFetchError(`asset fetch failed (${status})`, "asset_transient", status);
    throw new PluginAssetFetchError(`unexpected asset response (${status})`, "asset_http_error", status);
  }
  return s.data;
}
//@ chunk-e6aww6q8.js:4381579-4382434 placement
/**
 * 下载资源并校验固定的 sha256。
 */
function downloadAssetWithDigest(pluginAsset, n, r, s) {
  let hash = createHash("sha256");
  let y = 0;
  let S;
  function w() {
    clearTimeout(S);
    S = setTimeout((we) => we.destroy(Error("asset download stream stalled")), r, pluginAsset);
  }
  let L;
  function G(we) {
    L = we;
  }
  pluginAsset.once("error", G);
  let q = false;
  function Z() {
    pluginAsset.off("error", G);
    clearTimeout(S);
    if (!q) pluginAsset.destroy();
  }
  function Se() {
    if (hash.digest("hex") !== n)
      throw new PluginAssetFetchError(
        "downloaded bytes do not match the pinned sha256",
        "asset_digest_mismatch",
      );
  }
  async function* ke() {
    try {
      pluginAsset.off("error", G);
      if (L !== undefined) throw L;
      w();
      for await (let we of pluginAsset) {
        w();
        let Ee = Buffer.isBuffer(we) ? we : Buffer.from(we);
        y += Ee.length;
        if (y > MAX_ASSET_BYTES) throw new PluginAssetFetchError("asset exceeds size cap", "asset_too_large");
        hash.update(Ee);
        yield Ee;
      }
      clearTimeout(S);
      if (s) Se();
      q = true;
    } catch (error) {
      throw error instanceof PluginAssetFetchError
        ? error
        : new PluginAssetFetchError(
            `asset download failed: ${error instanceof Error ? error.message : String(error)}`,
            "asset_transient",
          );
    } finally {
      Z();
    }
  }
  return {
    chunks: ke(),
    verifyDigest: Se,
    abort: Z,
  };
}
//@ chunk-e6aww6q8.js:4382434-4382943 placement
/**
 * 流式下载资源到新文件并校验摘要，失败删除。
 */
async function downloadAssetToFile(e, n, timeout, credentials) {
  let h = downloadAssetWithDigest(await fetchPluginAsset(e, timeout, credentials), e, timeout, false);
  let y;
  let S;
  try {
    y = await open(n, "wx", 384);
    for await (let chunk of h.chunks) await y.write(chunk);
    await y.sync().catch(() => {
      return;
    });
  } catch (error) {
    S = error;
    h.abort();
  } finally {
    await y?.close().catch(() => {
      return;
    });
  }
  if (S !== undefined) {
    await rm_2(n, {
      force: true,
    }).catch(() => {
      return;
    });
    if (S instanceof PluginAssetFetchError) throw S;
    throw new PluginAssetFetchError(
      `asset download failed: ${S instanceof Error ? S.message : String(S)}`,
      "asset_transient",
    );
  }
  try {
    h.verifyDigest();
  } catch (error) {
    await rm_2(n, {
      force: true,
    }).catch(() => {
      return;
    });
    throw error;
  }
}
//@ chunk-e6aww6q8.js:4382943-4383113 placement
function createAssetStream(e, timeout, credentials) {
  let s;
  let h = false;
  async function* y() {
    h = true;
    try {
      yield* downloadAssetWithDigest(await fetchPluginAsset(e, timeout, credentials), e, timeout, true)
        .chunks;
    } catch (error) {
      s = error;
      throw error;
    }
  }
  return {
    chunks: y(),
    failure: () => s,
    started: () => h,
  };
}
//@ chunk-e6aww6q8.js:4383113-4384130 placement
/**
 * 把一个二进制资源放到目标位置，经存储接口失败时报错。
 */
async function placePluginBinaryAsset(cachePath, n, containedBinDir, s, h, storageV5, S) {
  if (isStorageV5Enabled() && storageV5 !== undefined && S !== null && getPlatform() !== "windows") {
    let G = await storageV5.copy(STORAGE_SPACES.pluginAssetCache(h), pluginBinaryStorageSpace(S, s), {
      exactMode: 493,
      parent: "mustExist",
    });
    if (!G.ok) {
      let q = `placement through the storage interface failed: ${formatStorageError(G.error)}`;
      let Z = G.error.code === "NotFound" ? "ENOENT" : errnoShapedCode(storageErrorCode(G.error));
      if (Z === undefined) throw new PluginAssetFetchError(q, "asset_place_failed");
      throw Object.assign(
        new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
          q,
          "placement through the storage interface failed",
        ),
        {
          code: Z,
        },
      );
    }
    return;
  }
  let w = join(containedBinDir, s);
  let L = join(n, `.place-${s}-${makePidRandomId()}`);
  try {
    await copyFile(cachePath, L, constants.COPYFILE_EXCL);
    if (getPlatform() !== "windows") {
      let Z = await open(L, readOnlyNoFollowFlags());
      try {
        await Z.chmod(493);
      } finally {
        await Z.close().catch(() => {
          return;
        });
      }
    }
    try {
      await renameReplacing(L, w);
      return;
    } catch (error) {
      if (getErrnoCode(error) !== "EXDEV") throw error;
      if (getPlatform() === "windows")
        throw new PluginAssetFetchError(
          "asset cache and plugin bin/ are on different volumes",
          "asset_place_exdev",
        );
    }
    let G = join(containedBinDir, `.place-${s}-${makePidRandomId()}`);
    let q = false;
    try {
      await copyFile(L, G, constants.COPYFILE_EXCL);
      await renameReplacing(G, w);
      q = true;
    } finally {
      if (!q)
        await rm_2(G, {
          force: true,
        }).catch(() => {
          return;
        });
    }
  } finally {
    await rm_2(L, {
      force: true,
    }).catch(() => {
      return;
    });
  }
}
//@ chunk-e6aww6q8.js:4384130-4384584 placement
/**
 * 用硬链接（或存储共享复制）把缓存资源放进 bin 并校验。
 */
async function linkAssetIntoBin(containedBinDir, n, r, s, storageV5, y) {
  if (getPlatform() === "windows") return "failed_clean";
  let S = join(containedBinDir, n);
  let w = join(containedBinDir, r);
  if (isStorageV5Enabled() && storageV5 !== undefined && y !== null) {
    let G = await shareCopyAsset(storageV5, y, n, r);
    if (G !== "created") return G;
    return (await verifyPlacedAsset(
      w,
      s,
      {
        ensureMode: 493,
        guestWritable: true,
      },
      storageV5,
      pluginBinaryStorageSpace(y, r),
    )) === "match"
      ? "placed"
      : "failed_created";
  }
  try {
    await link(S, w);
  } catch (error) {
    if (getErrnoCode(error) === "EEXIST") return "exists";
    return "failed_clean";
  }
  return (await verifyPlacedAsset(w, s, {
    ensureMode: 493,
    guestWritable: true,
  })) === "match"
    ? "placed"
    : "failed_created";
}
//@ chunk-e6aww6q8.js:4384584-4385151 placement
/**
 * 存储层共享复制资源（ifAbsent），映射结果。
 */
async function shareCopyAsset(e, n, r, s) {
  let h = pluginBinaryStorageSpace(n, r);
  let y = await e.copy(h, pluginBinaryStorageSpace(n, s), {
    precondition: {
      type: "ifAbsent",
    },
    parent: "mustExist",
    share: "require",
  });
  if (y.ok) return y.value.shared ? "created" : "failed_created";
  let error = y.error;
  if (error.code === "AlreadyExists") return "exists";
  if (
    error.code === "Unavailable" &&
    (error.telemetryCode === LINKMISDIRECTED || error.telemetryCode === LINKUNVERIFIED)
  )
    return "failed_created";
  if (error.code !== "Failed" || error.key === undefined) return "failed_clean";
  let w = storageErrorCode(error);
  if (isSameStorageSpace(error.key, h))
    return w === "ELOOP" || w === "ENXIO" ? "refused_source" : "failed_clean";
  return w === "ELOOP" || w === "EISDIR" || w === "ENXIO" ? "exists" : "failed_clean";
}
//@ chunk-e6aww6q8.js:4385151-4385310 placement
async function renameReplacing(e, n) {
  try {
    await rename(e, n);
  } catch (error) {
    let errnoCode = getErrnoCode(error);
    if (errnoCode === "EXDEV" || errnoCode === undefined) throw error;
    if (!ATOMIC_WRITE_ERRNOS.has(errnoCode)) throw error;
    await rm_2(n, {
      force: true,
    });
    await rename(e, n);
  }
}
//@ chunk-e6aww6q8.js:4385310-4385619 placement = convertDirectoryToZipInPlace (0.79)
/**
 * 清理目录中过期的临时文件（点文件与普通文件不同期限；存储后端模式走存储层）。
 */
async function sweepStaleTempFiles(e, storageV5, r) {
  if (isStorageV5Enabled() && storageV5 !== undefined && r !== null)
    return sweepExpiredStorageEntries(e, storageV5, r);
  let s;
  try {
    s = await readdir(e);
  } catch {
    return;
  }
  let now = Date.now();
  for (let y of s) {
    let S = join(e, y);
    let w = await lstat(S).catch(() => null);
    if (!w) continue;
    let L = y.startsWith(".") ? TEMP_FILE_TTL_MS : ASSET_CACHE_TTL_MS;
    if (now - w.mtimeMs > L)
      await rm_2(S, {
        recursive: true,
        force: true,
      }).catch(() => {
        return;
      });
  }
}
//@ chunk-e6aww6q8.js:4385619-4385888 placement
async function sweepExpiredStorageEntries(dirPath, n, r) {
  let now = Date.now();
  let h;
  do {
    let y = await n.listEntries(r, {
      cursor: h,
    });
    if (!y.ok) break;
    for (let item of y.value.items)
      if (item.kind === "key" && item.mtimeMs !== undefined && now - item.mtimeMs > ASSET_CACHE_TTL_MS)
        await n.delete(item.key);
    h = y.value.cursor;
  } while (h);
  await convertDirectoryToZipInPlace_2(dirPath, (y) => y.startsWith("."));
}
//@ chunk-e6aww6q8.js:4385888-4386116 placement = convertDirectoryToZipInPlace (0.79)
async function convertDirectoryToZipInPlace_2(dirPath, zipPath) {
  let r;
  try {
    r = await readdir(dirPath);
  } catch {
    return;
  }
  let now = Date.now();
  for (let h of r.filter(zipPath)) {
    let y = join(dirPath, h);
    let S = await lstat(y).catch(() => null);
    if (S && now - S.mtimeMs > TEMP_FILE_TTL_MS)
      await rm_2(y, {
        recursive: true,
        force: true,
      }).catch(() => {
        return;
      });
  }
}
//@ chunk-e6aww6q8.js:4386116-4386180 placement = generatePlaceholders (0.792)
function makePidRandomId() {
  return `${process.pid}-${randomBytes(6).toString("hex")}`;
}
//@ chunk-f3qhjfah.js:4072-4167 placement
/**
 * 若路径正是插件资源缓存目录（`<配置目录>/plugins/asset-cache`），返回存储命名空间 pluginAssetCache，否则 null。
 */
function assetCacheNamespace(e) {
  return e === join(getClaudeConfigDir(), "plugins", "asset-cache")
    ? {
        namespace: "pluginAssetCache",
      }
    : null;
}
export { provisionBinaryAssets, shouldInstallBinaryAssets };
